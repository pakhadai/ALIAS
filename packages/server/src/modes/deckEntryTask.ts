import { v4 as uuidv4 } from 'uuid';
import { decodeWordEntry, type GameTask } from '@movli/shared';

/** Build a GameTask from a raw deck string (JSON v:1 or plain word). */
export function taskFromDeckEntry(raw: string): GameTask {
  const decoded = decodeWordEntry(raw);
  if (decoded) {
    const task: GameTask = { id: uuidv4(), prompt: decoded.word };
    if (decoded.hint) task.hint = decoded.hint;
    if (decoded.tabooWords && decoded.tabooWords.length > 0) {
      task.tabooWords = decoded.tabooWords;
    }
    return task;
  }
  return { id: uuidv4(), prompt: raw };
}
