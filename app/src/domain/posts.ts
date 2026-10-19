import { uid } from './util';
import type { CheckIn, Db, Helpful, Post, PostStatus, SymbolKey } from '@/types';

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

/** What the pupil sees. With the read indicator switched off, "Read" shows as "Sent"; a follow-up reply always shows. */
export function visibleStatus(post: Post, showReadReceipts: boolean): PostStatus {
  if (post.status === 'read' && !showReadReceipts) return 'sent';
  return post.status;
}

/** Share a post with the key adult, or take it back and keep it private. */
export function setShared(db: Db, postId: string, shared: boolean): void {
  const p = db.posts.find((x) => x.id === postId);
  if (p) p.sharedWith = shared ? 'keyAdult' : 'private';
}

/** The pupil's answer to "Was this helpful?" on a follow-up. Tapping the same answer again clears it. */
export function setPostHelpful(db: Db, postId: string, answer: Helpful): void {
  const p = db.posts.find((x) => x.id === postId);
  if (!p) return;
  p.helpful = p.helpful === answer ? undefined : answer;
}

/** One post per check-in place that has a note, replacing the posts from an earlier save of the same check-in.
 *  A post the pupil had made private stays private. */
export function syncNotePosts(db: Db, checkin: CheckIn, labelOf: (sid: string) => string): void {
  const prefix = checkin.id + ':';
  const before = new Map(db.posts.filter((p) => p.kind === 'note' && p.refId.startsWith(prefix)).map((p) => [p.refId, p]));
  db.posts = db.posts.filter((p) => !(p.kind === 'note' && p.refId.startsWith(prefix)));
  for (const [sid, n] of Object.entries(checkin.notes)) {
    const words = [n.text, n.help.text, ...n.help.chips].filter(Boolean).join(' · ');
    const summary = labelOf(sid) + (words ? ': ' + words : n.symbols.length ? ': symbols' : n.photo ? ': photo' : '');
    const old = before.get(prefix + sid);
    addPost(db, { pupilId: checkin.pupilId, kind: 'note', refId: prefix + sid, summary, sharedWith: old?.sharedWith ?? 'keyAdult', at: checkin.at });
  }
}

// Demo only, until the staff side exists: lets testers see how Read and Follow-up look to a pupil.
export function demoMarkRead(db: Db, postId: string): void {
  const p = db.posts.find((x) => x.id === postId);
  if (p && p.status === 'sent') {
    p.status = 'read';
    p.readAt = Date.now();
  }
}
export function demoFollowUp(db: Db, postId: string, adult: string): void {
  const p = db.posts.find((x) => x.id === postId);
  if (!p) return;
  p.readAt = p.readAt ?? Date.now();
  p.repliedAt = Date.now();
  p.status = 'followUp';
  p.followUp = adult + ': thanks for telling me. Let’s talk at break tomorrow about what would help.';
}
