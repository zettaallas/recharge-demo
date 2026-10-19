import { hashSecret } from './auth';
import { uid } from './util';
import type { Db, Staff } from '@/types';

// Staff actions: logging in, reading and replying to what pupils share, planning check-ins, and quick replies.

export async function checkStaffLogin(db: Db, email: string, password: string): Promise<Staff | null> {
  const s = db.staff.find((x) => x.email === email.trim().toLowerCase());
  if (!s) return null;
  return (await hashSecret(password, s.salt)) === s.pwHash ? s : null;
}

/** The key adult opened a post: the pupil sees ✓✓ Read (unless they switched that off). Its moment counts as seen. */
export function markRead(db: Db, postId: string): void {
  const p = db.posts.find((x) => x.id === postId);
  if (!p) return;
  if (p.status === 'sent') p.status = 'read';
  p.readAt ??= Date.now();
  const m = db.moments.find((x) => x.id === p.refId);
  if (m) m.seen = true;
}

/** A reply from the key adult. The pupil sees ↩ Follow-up, the words, who replied and when. */
export function replyToPost(db: Db, postId: string, staff: Staff, text: string): void {
  const p = db.posts.find((x) => x.id === postId);
  const words = text.trim();
  if (!p || !words) return;
  markRead(db, postId);
  p.status = 'followUp';
  p.followUp = staff.name + ': ' + words;
  p.repliedAt = Date.now();
  p.repliedBy = staff.name;
}

export function planCheckIn(db: Db, pupilId: string, staff: Staff, when: string): void {
  db.plans.unshift({ id: uid('pl'), pupilId, by: staff.name, when, at: Date.now() });
}

// Quick replies belong to each staff member.
const mine = (db: Db, staffId: string) => db.staff.find((s) => s.id === staffId)!;

export function addQuickReply(db: Db, staffId: string, text: string): void {
  const t = text.trim();
  if (t) mine(db, staffId).quickReplies.push(t);
}
export function editQuickReply(db: Db, staffId: string, index: number, text: string): void {
  const t = text.trim();
  if (t) mine(db, staffId).quickReplies[index] = t;
}
export function deleteQuickReply(db: Db, staffId: string, index: number): void {
  mine(db, staffId).quickReplies.splice(index, 1);
}
/** Move a quick reply up (-1) or down (+1). */
export function moveQuickReply(db: Db, staffId: string, index: number, by: -1 | 1): void {
  const list = mine(db, staffId).quickReplies;
  const to = index + by;
  if (to < 0 || to >= list.length) return;
  [list[index], list[to]] = [list[to], list[index]];
}
