import { GameMode } from '@alias/shared';
import type { IGameModeHandler } from './IGameModeHandler';
import { ClassicModeHandler } from './ClassicModeHandler';
import { TranslationModeHandler } from './TranslationModeHandler';
import { QuizModeHandler } from './QuizModeHandler';

const handlers: Record<GameMode, () => IGameModeHandler> = {
  [GameMode.CLASSIC]: () => new ClassicModeHandler(),
  [GameMode.TRANSLATION]: () => new TranslationModeHandler(),
  [GameMode.SYNONYMS]: () => new ClassicModeHandler(),
  [GameMode.QUIZ]: () => new QuizModeHandler(),
};

export function getHandler(mode?: GameMode): IGameModeHandler {
  const factory = mode ? handlers[mode] : undefined;
  return factory ? factory() : new ClassicModeHandler();
}
