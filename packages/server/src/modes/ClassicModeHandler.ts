import type { GameActionPayload, GameSettings, GameTask } from '@movli/shared';
import type { IGameModeHandler, ActionContext, ActionResult } from './IGameModeHandler';
import { reduceExplainerAction } from './explainerModeActions';
import { taskFromDeckEntry } from './deckEntryTask';

export class ClassicModeHandler implements IGameModeHandler {
  generateTask(deck: string[], _settings: GameSettings): GameTask {
    const raw = deck.pop() ?? '';
    return taskFromDeckEntry(raw);
  }

  handleAction(
    action: GameActionPayload,
    _currentTask: GameTask,
    _context: ActionContext
  ): ActionResult {
    return reduceExplainerAction(action, { skipEndsTurn: false });
  }
}
