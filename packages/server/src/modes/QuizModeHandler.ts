import { v4 as uuidv4 } from 'uuid';
import type { GameActionPayload, GameSettings, GameTask } from '@alias/shared';
import type { IGameModeHandler, ActionContext, ActionResult } from './IGameModeHandler';

type QuizTaskKind = 'BASIC' | 'SYNONYM' | 'ANTONYM' | 'TRANSLATION' | 'TABOO';

type EncodedQuizTask = {
  v: 1;
  kind: QuizTaskKind;
  prompt: string;
  answer: string;
  /** Optional extra info for UI (e.g., taboo hints already baked into prompt). */
  meta?: Record<string, unknown>;
};

function tryDecode(raw: string): EncodedQuizTask | null {
  if (!raw) return null;
  if (raw[0] !== '{') return null;
  try {
    const parsed = JSON.parse(raw) as Partial<EncodedQuizTask>;
    if (parsed?.v !== 1) return null;
    if (!parsed.kind || !parsed.prompt || !parsed.answer) return null;
    return parsed as EncodedQuizTask;
  } catch {
    return null;
  }
}

/**
 * Quiz (Blitz) mode: a prompt is shown with 4 options.
 * Any player can press an option; the first correct answer scores a point.
 * Concurrency guard is handled by GameEngine via room.currentTaskAnswered.
 */
export class QuizModeHandler implements IGameModeHandler {
  generateTask(deck: string[], _settings: GameSettings): GameTask {
    const raw = deck.pop() ?? '';
    const decoded = tryDecode(raw);
    const correct = decoded?.answer ?? raw;
    const prompt = decoded?.prompt ?? raw;

    const distractors: string[] = [];
    const available = [...deck];
    for (let i = available.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [available[i], available[j]] = [available[j], available[i]];
    }
    for (const w of available) {
      const d = tryDecode(w);
      const ans = d?.answer ?? w;
      if (ans !== correct && distractors.length < 3) {
        distractors.push(ans);
      }
      if (distractors.length >= 3) break;
    }

    const options = [correct, ...distractors];
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }

    return {
      id: uuidv4(),
      prompt,
      answer: correct,
      options,
      ...(decoded?.kind ? { kind: decoded.kind } : {}),
    } as GameTask & { kind?: QuizTaskKind };
  }

  handleAction(
    action: GameActionPayload,
    currentTask: GameTask,
    context: ActionContext
  ): ActionResult {
    if (action.action !== 'GUESS_OPTION') {
      return { isCorrect: false, points: 0, nextWord: false, endTurn: false };
    }

    const { room } = context;
    if (room.currentTaskAnswered) {
      return { isCorrect: false, points: 0, nextWord: false, endTurn: false };
    }

    // Server-side anti-spam: after a wrong attempt, ignore repeats until task changes.
    if (context.senderId) {
      const wrongSet = new Set(room.currentTaskWrongAttempts ?? []);
      if (wrongSet.has(context.senderId)) {
        return { isCorrect: false, points: 0, nextWord: false, endTurn: false };
      }
    }

    const selected = action.data.selectedOption;
    const isCorrect = !!selected && selected === currentTask.answer;
    const penaltyEnabled =
      room.settings?.mode?.gameMode === 'QUIZ' &&
      (room.settings as { mode?: { quizWrongPenaltyEnabled?: boolean } } | undefined)?.mode
        ?.quizWrongPenaltyEnabled === true;
    const shouldPenalty =
      !isCorrect &&
      penaltyEnabled &&
      !!context.senderId &&
      !(room.currentTaskWrongAttempts ?? []).includes(context.senderId);

    if (isCorrect && context.senderId) {
      room.currentTaskAnswered = context.senderId;
      room.currentTaskWrongAttempts = [];
    } else if (!isCorrect && context.senderId) {
      const wrong = new Set(room.currentTaskWrongAttempts ?? []);
      wrong.add(context.senderId);
      room.currentTaskWrongAttempts = [...wrong];
    }

    return {
      isCorrect,
      points: isCorrect ? 1 : shouldPenalty ? -1 : 0,
      nextWord: isCorrect,
      endTurn: false,
    };
  }
}
