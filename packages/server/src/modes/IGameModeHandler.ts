import type { GameActionPayload, GameSettings, GameTask } from '@movli/shared';
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

/** Optional context when building a task from the remaining deck. */
export interface GenerateTaskOptions {
  /** Words already shown this session — QUIZ uses these to fill distractor slots. */
  distractorPool?: readonly string[];
}

export interface IGameModeHandler {
  generateTask(deck: string[], settings: GameSettings, options?: GenerateTaskOptions): GameTask;
  handleAction(
    action: GameActionPayload,
    currentTask: GameTask,
    context: ActionContext
  ): ActionResult;
}
