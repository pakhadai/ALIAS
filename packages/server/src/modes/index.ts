export type { IGameModeHandler, ActionContext, ActionResult } from './IGameModeHandler';
export { ClassicModeHandler } from './ClassicModeHandler';
export { TranslationModeHandler } from './TranslationModeHandler';
export { QuizModeHandler } from './QuizModeHandler';
export { getHandler, registerGameMode } from './ModeFactory';
export type { GameModeFactory } from './ModeFactory';
