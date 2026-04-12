import { describe, expect, test } from 'vitest';
import {
  GameMode,
  Language,
  Category,
  AppTheme,
  SoundPreset,
  type GameSettings,
  type GameTask,
} from '@alias/shared';
import type { Room } from '../../services/RoomManager';
import type { ActionContext } from '../IGameModeHandler';
import { ClassicModeHandler } from '../ClassicModeHandler';
import { TranslationModeHandler } from '../TranslationModeHandler';
import { QuizModeHandler } from '../QuizModeHandler';
import { getHandler, registerGameMode } from '../ModeFactory';

function baseGeneralSettings(): GameSettings['general'] {
  return {
    language: Language.UA,
    scoreToWin: 30,
    skipPenalty: false,
    categories: [Category.GENERAL],
    soundEnabled: true,
    soundPreset: SoundPreset.FUN,
    teamCount: 2,
    theme: AppTheme.PREMIUM_DARK,
  };
}

function classicDeckSettings(): GameSettings {
  return {
    general: baseGeneralSettings(),
    mode: { gameMode: GameMode.CLASSIC, classicRoundTime: 60 },
  };
}

function quizPenaltySettings(): GameSettings {
  return {
    general: baseGeneralSettings(),
    mode: {
      gameMode: GameMode.QUIZ,
      classicRoundTime: 60,
      quizTimerMode: 'ROUND',
      quizRoundTime: 60,
      quizQuestionTime: 10,
      quizTypes: { synonyms: true, antonyms: true, taboo: true, translation: true },
      quizWrongPenaltyEnabled: true,
    },
  };
}

function quizContextRoom(
  over: Partial<Pick<Room, 'currentTaskAnswered' | 'currentTaskWrongAttempts'>> & {
    settings?: GameSettings;
  } = {}
): ActionContext {
  const settings = over.settings ?? quizPenaltySettings();
  const room = {
    currentTaskAnswered: over.currentTaskAnswered,
    currentTaskWrongAttempts: over.currentTaskWrongAttempts ?? [],
    settings,
  } as unknown as Room;
  return { room };
}

describe('Game mode handlers', () => {
  test('ClassicModeHandler generates a task from deck (pop)', () => {
    const h = new ClassicModeHandler();
    const deck = ['a', 'b', 'c'];
    const t = h.generateTask(deck, classicDeckSettings());
    expect(t.prompt).toBe('c');
    expect(deck).toEqual(['a', 'b']);
  });

  test('ClassicModeHandler handles CORRECT / SKIP / unknown', () => {
    const h = new ClassicModeHandler();
    const task: GameTask = { id: 't1', prompt: 'x' };
    const ctx = quizContextRoom({ settings: classicDeckSettings() });
    expect(h.handleAction({ action: 'CORRECT' }, task, ctx)).toMatchObject({
      isCorrect: true,
      points: 1,
      nextWord: true,
    });
    expect(h.handleAction({ action: 'SKIP' }, task, ctx)).toMatchObject({
      isCorrect: false,
      points: 0,
      nextWord: true,
    });
    expect(h.handleAction({ action: 'START_GAME' }, task, ctx)).toMatchObject({ nextWord: false });
  });

  test('TranslationModeHandler splits prompt|answer', () => {
    const h = new TranslationModeHandler();
    const deck = ['кіт|cat'];
    const t = h.generateTask(deck, classicDeckSettings());
    expect(t.prompt).toBe('кіт');
    expect(t.answer).toBe('cat');
  });

  test('TranslationModeHandler falls back when there is no delimiter', () => {
    const h = new TranslationModeHandler();
    const deck = ['plainword'];
    const t = h.generateTask(deck, classicDeckSettings());
    expect(t.prompt).toBe('plainword');
    expect(t.answer).toBeUndefined();
  });

  test('QuizModeHandler generates 4 options when deck has enough words', () => {
    const h = new QuizModeHandler();
    const deck = ['d1', 'd2', 'd3', 'd4', 'correct'];
    const t = h.generateTask(deck, classicDeckSettings());
    expect(t.answer).toBe('correct');
    expect(t.options?.length).toBe(4);
    expect(new Set(t.options).size).toBe(t.options?.length);
    expect(t.options).toContain('correct');
  });

  test('QuizModeHandler decodes JSON deck entries and sets kind/prompt/answer', () => {
    const h = new QuizModeHandler();
    const encoded = JSON.stringify({ v: 1, kind: 'SYNONYM', prompt: 'Fast', answer: 'Quick' });
    const deck = ['x', 'y', 'z', encoded];
    const t = h.generateTask(deck, classicDeckSettings());
    expect(t.prompt).toBe('Fast');
    expect(t.answer).toBe('Quick');
    expect(t.kind).toBe('SYNONYM');
  });

  test('QuizModeHandler falls back to raw word on invalid JSON', () => {
    const h = new QuizModeHandler();
    const deck = ['d1', 'd2', 'd3', '{not-json'];
    const t = h.generateTask(deck, classicDeckSettings());
    expect(t.prompt).toBe('{not-json');
    expect(t.answer).toBe('{not-json');
  });

  test('QuizModeHandler awards only the first correct guess (sets room.currentTaskAnswered)', () => {
    const h = new QuizModeHandler();
    const task: GameTask = { id: 't1', prompt: 'p', answer: 'a', options: ['a', 'b', 'c', 'd'] };
    const ctx = quizContextRoom({
      currentTaskAnswered: undefined,
      currentTaskWrongAttempts: [],
      settings: classicDeckSettings(),
    });

    const ok = h.handleAction({ action: 'GUESS_OPTION', data: { selectedOption: 'a' } }, task, {
      ...ctx,
      senderId: 'p1',
    });
    expect(ok.isCorrect).toBe(true);
    expect(ctx.room.currentTaskAnswered).toBe('p1');

    const ignored = h.handleAction(
      { action: 'GUESS_OPTION', data: { selectedOption: 'a' } },
      task,
      {
        ...ctx,
        senderId: 'p2',
      }
    );
    expect(ignored.isCorrect).toBe(false);
    expect(ignored.nextWord).toBe(false);
    expect(ctx.room.currentTaskAnswered).toBe('p1');
  });

  test('QuizModeHandler applies -1 penalty once per task when enabled', () => {
    const h = new QuizModeHandler();
    const task: GameTask = { id: 't1', prompt: 'p', answer: 'a', options: ['a', 'b', 'c', 'd'] };
    const ctx = quizContextRoom({
      currentTaskAnswered: undefined,
      currentTaskWrongAttempts: [],
    });

    const wrong1 = h.handleAction({ action: 'GUESS_OPTION', data: { selectedOption: 'b' } }, task, {
      ...ctx,
      senderId: 'p1',
    });
    expect(wrong1.isCorrect).toBe(false);
    expect(wrong1.points).toBe(-1);
    expect(ctx.room.currentTaskWrongAttempts).toContain('p1');

    const wrong2 = h.handleAction({ action: 'GUESS_OPTION', data: { selectedOption: 'c' } }, task, {
      ...ctx,
      senderId: 'p1',
    });
    expect(wrong2.isCorrect).toBe(false);
    expect(wrong2.points).toBe(0);
  });
});

describe('ModeFactory', () => {
  test('getHandler defaults to Classic when mode is undefined', () => {
    const h = getHandler(undefined);
    const deck = ['x'];
    const t = h.generateTask(deck, classicDeckSettings());
    expect(t.prompt).toBe('x');
  });

  test('registerGameMode allows overriding handler creation', () => {
    class TestHandler extends ClassicModeHandler {}
    registerGameMode(GameMode.SYNONYMS, () => new TestHandler());
    const h = getHandler(GameMode.SYNONYMS);
    expect(h).toBeInstanceOf(TestHandler);
  });
});
