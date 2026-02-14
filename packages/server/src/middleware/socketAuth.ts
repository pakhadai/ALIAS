import type { Socket } from 'socket.io';
import { AuthService } from '../services/AuthService';

const authService = new AuthService();

/**
 * Socket.io middleware that verifies JWT from handshake auth.
 * If no token is provided, allows connection anyway (anonymous fallback).
 * When token is valid, attaches userId to socket.data.
 */
export function socketAuthMiddleware(socket: Socket, next: (err?: Error) => void): void {
  const token = socket.handshake.auth?.token as string | undefined;

  if (!token) {
    // Allow unauthenticated connections (backward compat / dev mode)
    next();
    return;
  }

  const payload = authService.verifyToken(token);
  if (!payload) {
    next(new Error('Invalid or expired token'));
    return;
  }

  socket.data.userId = payload.sub;
  next();
}
