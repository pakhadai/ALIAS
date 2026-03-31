import { v4 as uuidv4 } from 'uuid';
import type { GameActionPayload, GameSettings, GameTask } from '@alias/shared';
import type { IGameModeHandler, ActionContext, ActionResult } from './IGameModeHandler';

/**
 * Quiz (Blitz) mode: a prompt is shown with 4 options.
 * Any player can press an option; the first correct answer scores a point.
 * Concurrency guard is handled by GameEngine via room.currentTaskAnswered.
 */
export class QuizModeHandler implements IGameModeHandler {
  generateTask(deck: string[], _settings: GameSettings): GameTask {
    const correct = deck.pop() ?? '';

    const distractors: string[] = [];
    const available = [...deck];
    for (let i = available.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [available[i], available[j]] = [available[j], available[i]];
    }
    for (const w of available) {
      if (w !== correct && distractors.length < 3) {
        distractors.push(w);
      }
      if (distractors.length >= 3) break;
    }

    const options = [correct, ...distractors];
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }

    return { id: uuidv4(), prompt: correct, answer: correct, options };
  }

  handleAction(
    action: GameActionPayload,
    currentTask: GameTask,
    context: ActionContext,
  ): ActionResult {
    if (action.action !== 'GUESS_OPTION') {
      return { isCorrect: false, points: 0, nextWord: false, endTurn: false };
    }

    const { room } = context;
    if (room.currentTaskAnswered) {
      return { isCorrect: false, points: 0, nextWord: false, endTurn: false };
    }

    const selected = action.data?.selectedOption as string | undefined;
    const isCorrect = !!selected && selected === currentTask.answer;

    if (isCorrect && context.senderId) {
      room.currentTaskAnswered = context.senderId;
    }

    return {
      isCorrect,
      points: isCorrect ? 1 : 0,
      nextWord: isCorrect,
      endTurn: false,
    };
  }
}
