import { describe, expect, test } from 'vitest';
import { GameMode } from '@alias/shared';
import { ClassicModeHandler } from '../ClassicModeHandler';
import { TranslationModeHandler } from '../TranslationModeHandler';
import { QuizModeHandler } from '../QuizModeHandler';
import { getHandler, registerGameMode } from '../ModeFactory';

describe('Game mode handlers', () => {
  test('ClassicModeHandler generates a task from deck (pop)', () => {
    const h = new ClassicModeHandler();
    const deck = ['a', 'b', 'c'];
    const t = h.generateTask(deck, {} as never);
    expect(t.prompt).toBe('c');
    expect(deck).toEqual(['a', 'b']);
  });

  test('ClassicModeHandler handles CORRECT / SKIP / unknown', () => {
    const h = new ClassicModeHandler();
    const task = { id: 't1', prompt: 'x' };
    expect(
      h.handleAction({ action: 'CORRECT', data: null } as never, task as never, {} as never)
    ).toMatchObject({ isCorrect: true, points: 1, nextWord: true });
    expect(
      h.handleAction({ action: 'SKIP', data: null } as never, task as never, {} as never)
    ).toMatchObject({ isCorrect: false, points: 0, nextWord: true });
    expect(
      h.handleAction({ action: 'START_GAME', data: null } as never, task as never, {} as never)
    ).toMatchObject({ nextWord: false });
  });

  test('TranslationModeHandler splits prompt|answer', () => {
    const h = new TranslationModeHandler();
    const deck = ['кіт|cat'];
    const t = h.generateTask(deck, {} as never);
    expect(t.prompt).toBe('кіт');
    expect(t.answer).toBe('cat');
  });

  test('TranslationModeHandler falls back when there is no delimiter', () => {
    const h = new TranslationModeHandler();
    const deck = ['plainword'];
    const t = h.generateTask(deck, {} as never);
    expect(t.prompt).toBe('plainword');
    expect(t.answer).toBeUndefined();
  });

  test('QuizModeHandler generates 4 options when deck has enough words', () => {
    const h = new QuizModeHandler();
    const deck = ['d1', 'd2', 'd3', 'd4', 'correct'];
    const t = h.generateTask(deck, {} as never);
    expect(t.answer).toBe('correct');
    expect(t.options?.length).toBe(4);
    expect(new Set(t.options).size).toBe(t.options?.length);
    expect(t.options).toContain('correct');
  });

  test('QuizModeHandler awards only the first correct guess (sets room.currentTaskAnswered)', () => {
    const h = new QuizModeHandler();
    const task = { id: 't1', prompt: 'p', answer: 'a', options: ['a', 'b', 'c', 'd'] };
    const room: { currentTaskAnswered?: string | null } = { currentTaskAnswered: null };

    const ok = h.handleAction(
      { action: 'GUESS_OPTION', data: { selectedOption: 'a' } } as never,
      task as never,
      { room, senderId: 'p1' } as never
    );
    expect(ok.isCorrect).toBe(true);
    expect(room.currentTaskAnswered).toBe('p1');

    const ignored = h.handleAction(
      { action: 'GUESS_OPTION', data: { selectedOption: 'a' } } as never,
      task as never,
      { room, senderId: 'p2' } as never
    );
    expect(ignored.isCorrect).toBe(false);
    expect(ignored.nextWord).toBe(false);
    expect(room.currentTaskAnswered).toBe('p1');
  });
});

describe('ModeFactory', () => {
  test('getHandler defaults to Classic when mode is undefined', () => {
    const h = getHandler(undefined);
    // ClassicModeHandler prompt=deck.pop
    const deck = ['x'];
    const t = h.generateTask(deck, {} as never);
    expect(t.prompt).toBe('x');
  });

  test('registerGameMode allows overriding handler creation', () => {
    class TestHandler extends ClassicModeHandler {}
    registerGameMode(GameMode.SYNONYMS, () => new TestHandler());
    const h = getHandler(GameMode.SYNONYMS);
    expect(h).toBeInstanceOf(TestHandler);
  });
});
