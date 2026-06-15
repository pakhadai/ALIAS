import { v4 as uuidv4 } from 'uuid';
import {
  GameMode,
  shuffleArray,
  type GameActionPayload,
  type GameSettings,
  type GameTask,
  type QuizTaskKind,
} from '@movli/shared';
import type {
  IGameModeHandler,
  ActionContext,
  ActionResult,
  GenerateTaskOptions,
} from './IGameModeHandler';

type EncodedQuizTask = {
  v: 1;
  kind: QuizTaskKind;
  prompt: string;
  answer: string;
  meta?: Record<string, unknown>;
};

const QUIZ_KINDS: ReadonlySet<string> = new Set([
  'BASIC',
  'SYNONYM',
  'ANTONYM',
  'TRANSLATION',
  'TABOO',
]);

function isQuizTaskKind(value: unknown): value is QuizTaskKind {
  return typeof value === 'string' && QUIZ_KINDS.has(value);
}

function isEncodedQuizTask(value: unknown): value is EncodedQuizTask {
  if (!value || typeof value !== 'object') return false;
  const o = value as Record<string, unknown>;
  if (o.v !== 1) return false;
  if (!isQuizTaskKind(o.kind)) return false;
  if (typeof o.prompt !== 'string' || typeof o.answer !== 'string') return false;
  return true;
}

function tryDecode(raw: string): EncodedQuizTask | null {
  if (!raw || raw[0] !== '{') return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isEncodedQuizTask(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function isQuizWrongPenaltyEnabled(settings: GameSettings): boolean {
  const mode = settings.mode;
  if (mode.gameMode !== GameMode.QUIZ) return false;
  return mode.quizWrongPenaltyEnabled === true;
}

function answerFromDeckEntry(raw: string): string {
  const decoded = tryDecode(raw);
  return decoded?.answer ?? raw;
}

/** Fill distractors up to `targetCount`, skipping `correct` and already-chosen answers. */
function appendDistractors(
  correct: string,
  distractors: string[],
  sources: readonly string[],
  targetCount: number
): void {
  const seen = new Set([correct, ...distractors]);
  const available = shuffleArray(sources);
  for (const w of available) {
    if (distractors.length >= targetCount) break;
    const ans = answerFromDeckEntry(w);
    if (seen.has(ans)) continue;
    seen.add(ans);
    distractors.push(ans);
  }
}

/**
 * Quiz (Blitz) mode: a prompt is shown with 4 options.
 * Any player can press an option; the first correct answer scores a point.
 * Concurrency guard is handled by GameEngine via room.currentTaskAnswered.
 */
export class QuizModeHandler implements IGameModeHandler {
  generateTask(deck: string[], _settings: GameSettings, options?: GenerateTaskOptions): GameTask {
    const raw = deck.pop() ?? '';
    const decoded = tryDecode(raw);
    const correct = decoded?.answer ?? raw;
    const prompt = decoded?.prompt ?? raw;

    const distractors: string[] = [];
    appendDistractors(correct, distractors, deck, 3);
    if (distractors.length < 3 && options?.distractorPool?.length) {
      appendDistractors(correct, distractors, options.distractorPool, 3);
    }

    const choiceOptions = shuffleArray([...new Set([correct, ...distractors])].slice(0, 4));

    const task: GameTask = {
      id: uuidv4(),
      prompt,
      answer: correct,
      options: choiceOptions,
    };
    if (decoded?.kind) {
      task.kind = decoded.kind;
    }
    return task;
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

    if (context.senderId) {
      const wrongSet = new Set(room.currentTaskWrongAttempts ?? []);
      if (wrongSet.has(context.senderId)) {
        return { isCorrect: false, points: 0, nextWord: false, endTurn: false };
      }
    }

    const selected = action.data.selectedOption;
    const isCorrect = !!selected && selected === currentTask.answer;
    const penaltyEnabled = isQuizWrongPenaltyEnabled(room.settings);
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
