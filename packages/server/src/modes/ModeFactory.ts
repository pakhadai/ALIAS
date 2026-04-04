import { GameMode } from '@alias/shared';
import type { IGameModeHandler } from './IGameModeHandler';
import { ClassicModeHandler } from './ClassicModeHandler';
import { TranslationModeHandler } from './TranslationModeHandler';
import { QuizModeHandler } from './QuizModeHandler';
import { HardcoreModeHandler } from './HardcoreModeHandler';

export type GameModeFactory = () => IGameModeHandler;

const factories = new Map<GameMode, GameModeFactory>();

/**
 * Register or override handler construction for a mode (tests, future plugins).
 * Call before gameplay; default registrations run at module load.
 */
export function registerGameMode(mode: GameMode, factory: GameModeFactory): void {
  factories.set(mode, factory);
}

function registerDefaults(): void {
  registerGameMode(GameMode.CLASSIC, () => new ClassicModeHandler());
  registerGameMode(GameMode.TRANSLATION, () => new TranslationModeHandler());
  registerGameMode(GameMode.SYNONYMS, () => new ClassicModeHandler());
  registerGameMode(GameMode.QUIZ, () => new QuizModeHandler());
  registerGameMode(GameMode.HARDCORE, () => new HardcoreModeHandler());
}

registerDefaults();

export function getHandler(mode?: GameMode): IGameModeHandler {
  const factory = mode ? factories.get(mode) : undefined;
  return factory ? factory() : new ClassicModeHandler();
}
