import { GameMode, type GameActionPayload, type GameSettings, type GameTask } from '@movli/shared';
import type { IGameModeHandler, ActionContext, ActionResult } from './IGameModeHandler';
import { reduceExplainerAction } from './explainerModeActions';
import { taskFromDeckEntry } from './deckEntryTask';

/** Like classic, but skipping a word may end the explainer's turn depending on hardcoreVariant. */
export class HardcoreModeHandler implements IGameModeHandler {
  generateTask(deck: string[], _settings: GameSettings): GameTask {
    const raw = deck.pop() ?? '';
    return taskFromDeckEntry(raw);
  }

  handleAction(
    action: GameActionPayload,
    _currentTask: GameTask,
    context: ActionContext
  ): ActionResult {
    const mode = context.room.settings.mode;
    const variant = mode.gameMode === GameMode.HARDCORE ? mode.hardcoreVariant : 'SKIP_ENDS_TURN';
    return reduceExplainerAction(action, { skipEndsTurn: variant !== 'TABOO' });
  }
}
