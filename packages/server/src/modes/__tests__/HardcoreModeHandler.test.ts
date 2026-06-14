import { describe, it, expect } from 'vitest';
import type { GameSettings, GameTask } from '@movli/shared';
import {
  GameMode,
  Language,
  Category,
  AppTheme,
  SoundPreset,
  encodeWordEntry,
} from '@movli/shared';
import type { ActionContext } from '../IGameModeHandler';
import type { Room } from '../../services/RoomManager';
import { HardcoreModeHandler } from '../HardcoreModeHandler';

function stubSettings(): GameSettings {
  return {
    general: {
      language: Language.UA,
      scoreToWin: 30,
      skipPenalty: false,
      categories: [Category.GENERAL],
      soundEnabled: true,
      soundPreset: SoundPreset.FUN,
      teamCount: 2,
      theme: AppTheme.PREMIUM_DARK,
    },
    mode: { gameMode: GameMode.HARDCORE, classicRoundTime: 60, hardcoreVariant: 'SKIP_ENDS_TURN' },
  };
}

const dummyCtx: ActionContext = { room: { settings: stubSettings() } as unknown as Room };

describe('HardcoreModeHandler', () => {
  const handler = new HardcoreModeHandler();
  const task: GameTask = { id: 't1', prompt: 'word' };

  it('generateTask pops from deck', () => {
    const deck = ['a', 'b'];
    const t = handler.generateTask(deck, stubSettings());
    expect(t.prompt).toBe('b');
    expect(deck).toEqual(['a']);
  });

  it('CORRECT advances to next word', () => {
    const r = handler.handleAction({ action: 'CORRECT' }, task, dummyCtx);
    expect(r.nextWord).toBe(true);
    expect(r.endTurn).toBe(false);
  });

  it('SKIP ends turn without next word (SKIP_ENDS_TURN)', () => {
    const r = handler.handleAction({ action: 'SKIP' }, task, dummyCtx);
    expect(r.nextWord).toBe(false);
    expect(r.endTurn).toBe(true);
  });

  it('SKIP advances to next word for TABOO variant', () => {
    const tabooCtx: ActionContext = {
      room: {
        settings: {
          general: stubSettings().general,
          mode: {
            gameMode: GameMode.HARDCORE,
            classicRoundTime: 60,
            hardcoreVariant: 'TABOO',
          },
        },
      } as unknown as Room,
    };
    const r = handler.handleAction({ action: 'SKIP' }, task, tabooCtx);
    expect(r.nextWord).toBe(true);
    expect(r.endTurn).toBe(false);
  });

  it('generateTask decodes JSON deck entry with hint and taboo', () => {
    const raw = encodeWordEntry({
      word: 'Кіт',
      hint: 'Тварина',
      tabooWords: ['мяу', 'лапа'],
    });
    const deck = [raw];
    const t = handler.generateTask(deck, stubSettings());
    expect(t.prompt).toBe('Кіт');
    expect(t.hint).toBe('Тварина');
    expect(t.tabooWords).toEqual(['мяу', 'лапа']);
  });

  it('unknown action does nothing', () => {
    const r = handler.handleAction({ action: 'START_GAME' }, task, dummyCtx);
    expect(r.nextWord).toBe(false);
    expect(r.endTurn).toBe(false);
  });
});
