import { randomUUID } from 'crypto';
import Redis from 'ioredis';
import type { Socket } from 'socket.io';
import type { GameActionPayload, Player, RoomErrorPayload } from '@alias/shared';
import { config } from '../config';
import { roomError } from '../utils/roomError';

export const RPC_CHANNEL_PREFIX = 'alias:rpc:to:';

export type GameActionRpcInbound = {
  v: 1;
  kind: 'gameAction';
  roomCode: string;
  actorPlayerId: string;
  payload: GameActionPayload;
  replyToInstanceId: string;
  requestId: string;
};

export type RoomJoinRpcInbound = {
  v: 1;
  kind: 'roomJoin';
  roomCode: string;
  requestingSocketId: string;
  playerName: string;
  avatar: string;
  avatarId?: string | null;
  replyToInstanceId: string;
  requestId: string;
};

export type RoomLeaveRpcInbound = {
  v: 1;
  kind: 'roomLeave';
  roomCode: string;
  socketId: string;
  replyToInstanceId: string;
  requestId: string;
};

export type RoomRejoinRpcInbound = {
  v: 1;
  kind: 'roomRejoin';
  roomCode: string;
  playerId: string;
  requestingSocketId: string;
  replyToInstanceId: string;
  requestId: string;
};

/** Fire-and-forget: writer runs disconnect / grace flow for a socket that lives on another node. */
export type RoomDisconnectRpcInbound = {
  v: 1;
  kind: 'roomDisconnect';
  roomCode: string;
  socketId: string;
};

export type RpcInbound =
  | GameActionRpcInbound
  | RoomJoinRpcInbound
  | RoomLeaveRpcInbound
  | RoomRejoinRpcInbound
  | RoomDisconnectRpcInbound;

export type GameActionRpcReply = {
  v: 1;
  kind: 'reply';
  requestId: string;
  error?: RoomErrorPayload;
  roomJoinOk?: { roomCode: string; player: Player };
  roomLeaveOk?: { roomCode: string };
  roomRejoinOk?: { roomCode: string; playerId: string; playerName: string };
};

export type RpcMessage = RpcInbound | GameActionRpcReply;

/** @deprecated Use RpcMessage */
export type GameActionRpcMessage = RpcMessage;

/**
 * Cross-node forwarding: each instance subscribes to `alias:rpc:to:{INSTANCE_ID}`.
 * Room writer executes mutations and broadcasts via Socket.IO (Redis adapter).
 */
export class RoomActionRelay {
  private pub: Redis | null = null;
  private sub: Redis | null = null;
  private readonly instanceChannel: string;
  private pending = new Map<string, { socket: Socket; timer: NodeJS.Timeout }>();

  constructor() {
    this.instanceChannel = `${RPC_CHANNEL_PREFIX}${config.serverInstanceId}`;
  }

  async connect(url: string, onMessage: (msg: RpcMessage) => void): Promise<void> {
    this.pub = new Redis(url, { maxRetriesPerRequest: 3 });
    this.sub = new Redis(url, { maxRetriesPerRequest: null });
    await this.sub.subscribe(this.instanceChannel);
    this.sub.on('message', (_ch, raw) => {
      try {
        const msg = JSON.parse(raw) as RpcMessage;
        if (msg.v !== 1) return;
        onMessage(msg);
      } catch {
        /* ignore */
      }
    });
  }

  isReady(): boolean {
    return this.pub?.status === 'ready' && this.sub?.status === 'ready';
  }

  registerPending(requestId: string, socket: Socket): void {
    const timer = setTimeout(() => {
      this.pending.delete(requestId);
      if (socket.connected) {
        socket.emit(
          'room:error',
          roomError('RELAY_TIMEOUT', 'Host instance did not respond in time')
        );
      }
    }, 8000);
    this.pending.set(requestId, { socket, timer });
  }

  cancelPending(requestId: string): void {
    const p = this.pending.get(requestId);
    if (!p) return;
    clearTimeout(p.timer);
    this.pending.delete(requestId);
  }

  dispatchReply(msg: GameActionRpcReply): void {
    const p = this.pending.get(msg.requestId);
    if (!p) return;
    clearTimeout(p.timer);
    this.pending.delete(msg.requestId);
    if (!p.socket.connected) return;

    if (msg.error) {
      p.socket.emit('room:error', msg.error);
      return;
    }

    if (msg.roomJoinOk) {
      const { roomCode, player } = msg.roomJoinOk;
      void p.socket.join(roomCode);
      p.socket.data.playerId = player.id;
      p.socket.data.playerName = player.name;
      p.socket.data.roomCode = roomCode;
      p.socket.emit('room:joined', { roomCode, playerId: player.id });
      return;
    }

    if (msg.roomLeaveOk) {
      const { roomCode } = msg.roomLeaveOk;
      void p.socket.leave(roomCode);
      delete p.socket.data.roomCode;
      delete p.socket.data.playerId;
      delete p.socket.data.playerName;
      return;
    }

    if (msg.roomRejoinOk) {
      const { roomCode, playerId, playerName } = msg.roomRejoinOk;
      void p.socket.join(roomCode);
      p.socket.data.playerId = playerId;
      p.socket.data.playerName = playerName;
      p.socket.data.roomCode = roomCode;
      p.socket.emit('room:rejoined', { roomCode, playerId });
    }
  }

  async publishGameAction(
    targetInstanceId: string,
    body: Omit<GameActionRpcInbound, 'v' | 'kind'>
  ): Promise<boolean> {
    return this.publish(targetInstanceId, { v: 1, kind: 'gameAction', ...body });
  }

  async publishRoomJoin(
    targetInstanceId: string,
    body: Omit<RoomJoinRpcInbound, 'v' | 'kind'>
  ): Promise<boolean> {
    return this.publish(targetInstanceId, { v: 1, kind: 'roomJoin', ...body });
  }

  async publishRoomLeave(
    targetInstanceId: string,
    body: Omit<RoomLeaveRpcInbound, 'v' | 'kind'>
  ): Promise<boolean> {
    return this.publish(targetInstanceId, { v: 1, kind: 'roomLeave', ...body });
  }

  async publishRoomRejoin(
    targetInstanceId: string,
    body: Omit<RoomRejoinRpcInbound, 'v' | 'kind'>
  ): Promise<boolean> {
    return this.publish(targetInstanceId, { v: 1, kind: 'roomRejoin', ...body });
  }

  async publishRoomDisconnect(
    targetInstanceId: string,
    body: Omit<RoomDisconnectRpcInbound, 'v' | 'kind'>
  ): Promise<boolean> {
    return this.publish(targetInstanceId, { v: 1, kind: 'roomDisconnect', ...body });
  }

  private async publish(targetInstanceId: string, msg: RpcInbound): Promise<boolean> {
    if (!this.pub || this.pub.status !== 'ready') return false;
    const channel = `${RPC_CHANNEL_PREFIX}${targetInstanceId}`;
    try {
      await this.pub.publish(channel, JSON.stringify(msg));
      return true;
    } catch {
      return false;
    }
  }

  async publishReply(targetInstanceId: string, reply: GameActionRpcReply): Promise<void> {
    if (!this.pub || this.pub.status !== 'ready') return;
    const channel = `${RPC_CHANNEL_PREFIX}${targetInstanceId}`;
    const payload: GameActionRpcReply = {
      v: 1,
      kind: 'reply',
      requestId: reply.requestId,
      error: reply.error,
      roomJoinOk: reply.roomJoinOk,
      roomLeaveOk: reply.roomLeaveOk,
      roomRejoinOk: reply.roomRejoinOk,
    };
    try {
      await this.pub.publish(channel, JSON.stringify(payload));
    } catch {
      /* ignore */
    }
  }

  async disconnect(): Promise<void> {
    for (const { timer } of this.pending.values()) clearTimeout(timer);
    this.pending.clear();
    await this.sub?.quit().catch(() => {});
    await this.pub?.quit().catch(() => {});
    this.sub = null;
    this.pub = null;
  }
}

export function newRelayRequestId(): string {
  return randomUUID();
}
