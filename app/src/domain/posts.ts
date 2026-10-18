import { uid } from './util';
import type { Db, Post, SymbolKey } from '@/types';

// Posts are everything a pupil sends or keeps: symbol taps, break requests, notes and Walk places.
// They feed the "earlier posts" list and the Sent / Read / Follow-up statuses (Step 8).

/** Symbols that ask an adult to act, so the pupil is told who will see it. Others are simply logged. */
export const SYMBOLS_FOR_ADULT: SymbolKey[] = ['talkAdult', 'needBreakSym'];

export function addPost(db: Db, p: Omit<Post, 'id' | 'status' | 'at'> & { at?: number }): Post {
  const post: Post = { id: uid('post'), status: 'sent', at: Date.now(), ...p };
  db.posts.unshift(post);
  return post;
}

/** Records a symbol tap: a moment for the key adult's list, and a post for the pupil's own history. */
export function logSymbol(db: Db, pupilId: string, symbol: SymbolKey, summary: string): void {
  const id = uid('m');
  db.moments.unshift({ id, pupilId, kind: 'symbol', symbol, at: Date.now(), seen: false });
  addPost(db, { pupilId, kind: 'symbol', refId: id, summary, sharedWith: 'keyAdult' });
}

/** Records "I need a break". The key adult is told; the pupil can go to their calm place. */
export function logBreak(db: Db, pupilId: string, summary: string): void {
  const id = uid('m');
  db.moments.unshift({ id, pupilId, kind: 'break', at: Date.now(), seen: false });
  addPost(db, { pupilId, kind: 'break', refId: id, summary, sharedWith: 'keyAdult' });
}

/** The pupil's key adult's name, for messages like "Ms Rivera will see it." */
export function keyAdultName(db: Db, pupilId: string): string {
  const p = db.pupils.find((x) => x.id === pupilId);
  return db.staff.find((s) => s.id === p?.keyAdultId)?.name ?? 'Your key adult';
}
