import { v4 as uuidv4 } from 'uuid';
import type { GameActionPayload, GameSettings, GameTask } from '@alias/shared';
import type { IGameModeHandler, ActionContext, ActionResult } from './IGameModeHandler';

export class ClassicModeHandler implements IGameModeHandler {
  generateTask(deck: string[], _settings: GameSettings): GameTask {
    const word = deck.pop() ?? '';
    return { id: uuidv4(), prompt: word };
  }

  handleAction(
    action: GameActionPayload,
    _currentTask: GameTask,
    _context: ActionContext
  ): ActionResult {
    switch (action.action) {
      case 'CORRECT':
        return { isCorrect: true, points: 1, nextWord: true, endTurn: false };
      case 'SKIP':
        return { isCorrect: false, points: 0, nextWord: true, endTurn: false };
      default:
        return { isCorrect: false, points: 0, nextWord: false, endTurn: false };
    }
  }
}
