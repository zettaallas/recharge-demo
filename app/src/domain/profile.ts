import { avg, uid } from './util';
import type { Db, Profile, ProfileItem, SymbolKey } from '@/types';

// Profile: auto-built from the pupil's own ratings, symbols, pins and words.
// The pupil hides, edits and approves it before staff can see it.
const SYM_DRAIN: Partial<Record<SymbolKey, string>> = {
  tooLoud: 'Places that are too loud',
  tooBright: 'Bright lights',
  tooCrowded: 'Crowded places',
  needBreakSym: 'Going a long time without a break',
};

type Want = Omit<ProfileItem, 'id' | 'hidden'>;

export function syncProfile(db: Db, pid: string): void {
  const pupil = db.pupils.find((p) => p.id === pid);
  if (!pupil) return;
  const prof: Profile = db.profiles[pid] || { items: [], approvedAt: null, approvedSnapshot: null, dirty: false };
  const cs = db.checkins.filter((c) => c.pupilId === pid);
  const bySlot: Record<string, number[]> = {};
  for (const c of cs) for (const [sid, v] of Object.entries(c.ratings)) (bySlot[sid] = bySlot[sid] || []).push(v);
  const want: Want[] = [];
  const seenPlace = new Set<string>();
  for (const s of db.slots[pupil.classId] || []) {
    const a = avg(bySlot[s.id] || []);
    if (a == null) continue;
    const key = s.place + '|' + (a <= 2.5 ? 'd' : a >= 4 ? 'h' : '');
    if (seenPlace.has(key)) continue;
    seenPlace.add(key);
    if (a <= 2.5) want.push({ section: 'drains', text: s.place + (s.name === 'Changeover' ? ' at changeover' : ' at ' + s.name.toLowerCase()), src: 'ratings' });
    else if (a >= 4.2) want.push({ section: 'helps', text: s.name + ' in ' + s.place, src: 'ratings' });
  }
  const symCount: Partial<Record<SymbolKey, number>> = {};
  for (const c of cs) for (const n of Object.values(c.notes || {})) for (const s of n.symbols || []) symCount[s] = (symCount[s] || 0) + 1;
  for (const s of Object.keys(symCount) as SymbolKey[]) {
    const drain = SYM_DRAIN[s];
    if (s === 'feelsSafe') want.push({ section: 'helps', text: 'Places that feel safe', src: 'symbols' });
    else if (drain) want.push({ section: 'drains', text: drain, src: 'symbols' });
  }
  for (const p of db.pins.filter((x) => x.pupilId === pid))
    want.push({ section: p.tag === 'drains' ? 'drains' : 'helps', text: p.emoji + ' ' + p.caption, src: 'walk' });
  const helps = new Set<string>(pupil.settings.helps);
  for (const c of cs)
    for (const n of Object.values(c.notes || {})) {
      (n.help?.chips || []).forEach((x) => helps.add(x));
      if (n.help?.text) helps.add(n.help.text);
    }
  helps.forEach((h) => want.push({ section: 'helps', text: h.charAt(0).toUpperCase() + h.slice(1), src: 'help' }));
  // a note the pupil kept private never gets copied into their profile
  const privateNotes = new Set(db.posts.filter((x) => x.pupilId === pid && x.kind === 'note' && x.sharedWith === 'private').map((x) => x.refId));
  for (const c of cs)
    for (const [sid, n] of Object.entries(c.notes || {}))
      if (n.text && !privateNotes.has(c.id + ':' + sid)) want.push({ section: 'words', text: '"' + n.text + '"', src: 'typed' });
  let added = false;
  for (const w of want) {
    if (!prof.items.some((i) => i.section === w.section && i.text === w.text)) {
      prof.items.push({ id: uid('it'), hidden: false, ...w });
      added = true;
    }
  }
  if (added && prof.approvedSnapshot) prof.dirty = true;
  db.profiles[pid] = prof;
}

export function approveProfile(db: Db, pid: string): void {
  const prof = db.profiles[pid];
  if (!prof) return;
  prof.approvedAt = Date.now();
  prof.approvedSnapshot = prof.items.filter((i) => !i.hidden).map((i) => ({ section: i.section, text: i.text }));
  prof.dirty = false;
}

/** Hide or show one item. Any change after approval means the pupil must approve again before staff see it. */
export function toggleProfileItem(db: Db, pid: string, itemId: string): void {
  const prof = db.profiles[pid];
  const it = prof?.items.find((i) => i.id === itemId);
  if (!prof || !it) return;
  it.hidden = !it.hidden;
  if (prof.approvedSnapshot) prof.dirty = true;
}

/** Adds the pupil's own words to "In my words". */
export function addOwnWords(db: Db, pid: string, text: string): void {
  syncProfile(db, pid);
  const prof = db.profiles[pid];
  if (!prof) return;
  prof.items.push({ id: uid('it'), section: 'words', text: '"' + text + '"', src: 'own', hidden: false });
  if (prof.approvedSnapshot) prof.dirty = true;
}
