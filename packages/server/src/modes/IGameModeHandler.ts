import type { GameActionPayload, GameSettings, GameTask } from '@alias/shared';
import type { Room } from '../services/RoomManager';

export interface ActionContext {
  room: Room;
  senderId?: string;
}

export interface ActionResult {
  isCorrect: boolean;
  points: number;
  nextWord: boolean;
  endTurn: boolean;
}

export interface IGameModeHandler {
  generateTask(deck: string[], settings: GameSettings): GameTask;
  handleAction(
    action: GameActionPayload,
    currentTask: GameTask,
    context: ActionContext
  ): ActionResult;
}
