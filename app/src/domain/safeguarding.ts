import { uid } from './util';
import type { Db } from '@/types';

// Word scan that prompts a human (the DSL). It never decides anything itself.
const CONCERN_WORDS = ['self-harm', 'self harm', 'hurt myself', 'hurting myself', 'hurt me', 'hurts me', 'hurt', 'unsafe', 'not safe', 'kill', 'die', 'dead', 'suicide', 'cut myself', 'cutting', 'hit me', 'hits me', 'kick me', 'abuse', 'scared to go home', 'touches me', 'touched me', 'nobody cares', 'want to disappear', 'hate myself', 'bullied', 'bully'];

export function scanConcern(text: string | undefined | null): string[] {
  if (!text) return [];
  const t = ' ' + text.toLowerCase().replace(/[^a-z\s'-]/g, ' ') + ' ';
  return CONCERN_WORDS.filter((w) => t.includes(' ' + w + ' ') || t.includes(' ' + w + 's ') || t.includes(' ' + w + 'ing '));
}

/** Adds a safeguarding flag if the text contains concern words. Returns true if flagged. */
export function raiseFlag(db: Db, pupilId: string, source: string, text: string, at?: number): boolean {
  const words = scanConcern(text);
  if (!words.length) return false;
  if (db.flags.some((f) => f.pupilId === pupilId && f.text === text)) return true;
  db.flags.unshift({ id: uid('fl'), pupilId, source, text, words, at: at ?? Date.now(), status: 'open', checklist: {} });
  return true;
}
