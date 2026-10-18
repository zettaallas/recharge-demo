import { addPost, SYMBOLS_FOR_ADULT } from './posts';
import { raiseFlag } from './safeguarding';
import { uid } from './util';
import type { Db, SlotId, SymbolKey } from '@/types';

// Symbol board: the pupil picks one or more symbols, can add details and say where, then saves them together.

export interface SymbolEntry {
  symbols: SymbolKey[];
  where?: SlotId;
  whereLabel?: string;
  text?: string;
}

/** True if any chosen symbol asks an adult to act ("Talk to an adult", "Need a break"). */
export const needsAdult = (symbols: SymbolKey[]) => symbols.some((s) => SYMBOLS_FOR_ADULT.includes(s));

/** Saves the symbols as one moment for the key adult and one post in the pupil's history.
 *  Details are checked for safeguarding words like any other note. Returns true if they were flagged. */
export function saveSymbols(db: Db, pupilId: string, e: SymbolEntry, labelOf: (s: SymbolKey) => string): boolean {
  const id = uid('m');
  const text = e.text?.trim() || undefined;
  db.moments.unshift({ id, pupilId, kind: 'symbol', symbols: e.symbols, where: e.where, text, at: Date.now(), seen: false });
  const summary = [e.symbols.map(labelOf).join(', '), e.whereLabel, text].filter(Boolean).join(' · ');
  addPost(db, { pupilId, kind: 'symbol', refId: id, summary, sharedWith: 'keyAdult' });
  return text ? raiseFlag(db, pupilId, 'Symbol board details' + (e.whereLabel ? ': ' + e.whereLabel : ''), text) : false;
}
