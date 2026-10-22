import * as Crypto from 'expo-crypto';
import { SLOT_DEFS } from '@/data/vocab';
import { hashSecret, makeSecret } from './auth';
import { uid } from './util';
import type { AvatarColour, Db, Pupil, Staff } from '@/types';

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

// ---- You said, we did ----
export function postYouSaidWeDid(db: Db, classId: string, staff: Staff, said: string, did: string): void {
  db.feed.unshift({ id: uid('f'), classId, said: said.trim(), did: did.trim(), by: staff.name, at: Date.now(), helpful: {} });
}

// ---- Safeguarding (DSL only) ----
export const SAFEGUARDING_CHECKLIST: [string, string][] = [
  ['read', 'Read the full note and any earlier notes'],
  ['spoke', 'Spoken with the pupil today, in a safe and quiet place'],
  ['record', 'Recorded on the school safeguarding system (e.g. CPOMS / MyConcern)'],
  ['immediate', 'Considered whether the pupil is at immediate risk (call 999 if so)'],
  ['parents', 'Decided whether to inform parents or carers (unless this would increase risk)'],
  ['referral', "Considered referral to children's social care or early help"],
  ['followup', 'Follow-up date set and key adult informed'],
];
export function toggleCheck(db: Db, flagId: string, key: string): void {
  const f = db.flags.find((x) => x.id === flagId);
  if (f) f.checklist[key] = !f.checklist[key];
}
/** A flag can only be closed once every step is ticked. */
export function setFlagStatus(db: Db, flagId: string, status: 'open' | 'closed'): void {
  const f = db.flags.find((x) => x.id === flagId);
  if (!f) return;
  if (status === 'closed' && SAFEGUARDING_CHECKLIST.some(([k]) => !f.checklist[k])) return;
  f.status = status;
}

// ---- Class & PINs ----
/** A random 4-digit PIN. It is shown once on a PIN card, then only its hash is kept. */
export function randomPin(): string {
  const b = Crypto.getRandomBytes(2);
  return String(((b[0] << 8) | b[1]) % 10000).padStart(4, '0');
}

/** A class code like "8B-K4P": two characters from the name, then three random ones (no 0/O or 1/I to avoid mix-ups). */
export function newClassCode(name: string, taken: string[]): string {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const head = (name.replace(/[^A-Za-z0-9]/g, '').toUpperCase() + 'XX').slice(0, 2);
  for (;;) {
    const r = Crypto.getRandomBytes(3);
    const code = head + '-' + Array.from(r, (x) => A[x % A.length]).join('');
    if (!taken.includes(code)) return code;
  }
}

export interface PinCard {
  name: string;
  pin: string;
}

/** New PINs for these pupils (also unlocks them). Returns the cards to show once. */
export async function issuePins(pupils: Pupil[]): Promise<{ cards: PinCard[]; secrets: Record<string, { salt: string; hash: string }> }> {
  const cards: PinCard[] = [];
  const secrets: Record<string, { salt: string; hash: string }> = {};
  for (const p of pupils) {
    const pin = randomPin();
    secrets[p.id] = await makeSecret(pin);
    cards.push({ name: p.name, pin });
  }
  return { cards, secrets };
}
export function applyPins(db: Db, secrets: Record<string, { salt: string; hash: string }>): void {
  for (const [id, s] of Object.entries(secrets)) {
    const p = db.pupils.find((x) => x.id === id);
    if (!p) continue;
    p.salt = s.salt;
    p.pinHash = s.hash;
    p.failed = 0;
    p.locked = false;
  }
}

/** Adds a pupil and returns their id. In Supabase mode the secret is empty: the server makes the PIN (set-pupil-pin). */
export function addPupil(db: Db, classId: string, name: string, avatar: AvatarColour, keyAdultId: string, secret: { salt: string; hash: string }): string {
  const id = uid('p');
  db.pupils.push({
    id, classId, name: name.trim(), avatar, keyAdultId, attendance: 100,
    salt: secret.salt, pinHash: secret.hash, failed: 0, locked: false,
    buddy: { colour: 'teal', hat: 'none' }, parentShare: false,
    settings: { showReadReceipts: true, helps: [], pinOnReopen: false, registered: false, walkthroughDone: false },
  });
  return id;
}

export function createClass(db: Db, name: string, staff: Staff): string {
  const id = uid('c');
  const code = newClassCode(name, db.classes.map((c) => c.code));
  db.classes.push({ id, name: name.trim(), code, teacherId: staff.id });
  db.slots[id] = SLOT_DEFS.map((s) => ({ ...s, place: s.place.startsWith('Classroom') ? 'Classroom ' + name.trim() : s.place }));
  return id;
}
