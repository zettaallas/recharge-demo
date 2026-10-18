import { SLOT_DEFS } from '@/data/vocab';
import { syncProfile } from './profile';
import { raiseFlag } from './safeguarding';
import { avg, uid } from './util';
import type { CheckIn, Db, Note, Pin, Pupil, Rating, Slot, SlotId } from '@/types';

export interface PinSlot {
  id: SlotId;
  name: string;
  place: 'drains' | 'recharges';
  emoji: string;
  pin: Pin;
}

/** The class's slots plus the pupil's own Walk places. */
export function slotsFor(db: Db, pupil: Pupil): { base: Slot[]; pins: PinSlot[] } {
  const base = db.slots[pupil.classId] || [];
  const pins = db.pins
    .filter((p) => p.pupilId === pupil.id)
    .map((p) => ({ id: 'pin_' + p.id, name: p.caption, place: p.tag, emoji: p.emoji, pin: p }));
  return { base, pins };
}

export function slotLabel(db: Db, pupilId: string, sid: SlotId): string {
  if (sid.startsWith('pin_')) {
    const p = db.pins.find((x) => 'pin_' + x.id === sid);
    return p ? p.emoji + ' ' + p.caption : 'Personal place';
  }
  const pupil = db.pupils.find((p) => p.id === pupilId);
  const s = (db.slots[pupil ? pupil.classId : 'c8b'] || SLOT_DEFS).find((x) => x.id === sid);
  return s ? s.name + ' (' + s.place + ')' : sid;
}

export function pupilSeries(db: Db, pid: string): { date: string; avg: number | null; c: CheckIn }[] {
  return db.checkins
    .filter((c) => c.pupilId === pid)
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((c) => ({ date: c.date, avg: avg(Object.values(c.ratings) as Rating[]), c }));
}

export interface NoteEntry {
  pupilId: string;
  date: string;
  sid: SlotId;
  label: string;
  n: Note;
  rating?: Rating;
}

/** A pupil's notes, newest first. */
export function noteList(db: Db, pid: string, limit?: number): NoteEntry[] {
  const out: NoteEntry[] = [];
  pupilSeries(db, pid)
    .slice()
    .reverse()
    .forEach(({ c }) => {
      for (const [sid, n] of Object.entries(c.notes || {}))
        out.push({ pupilId: pid, date: c.date, sid, label: slotLabel(db, pid, sid), n, rating: c.ratings[sid] });
    });
  return limit ? out.slice(0, limit) : out;
}

/** Zip's charge (0 to 1) from the pupil's latest check-in, or null before the first one. */
export function lastCharge(db: Db, pid: string): number | null {
  const s = pupilSeries(db, pid);
  const last = s[s.length - 1]?.avg;
  return last == null ? null : last / 5;
}

export const emptyNote = (): Note => ({ symbols: [], help: { chips: [], text: '' }, text: '', photo: null, drawing: null, voice: null });

/** True when the pupil added anything to this slot's note. */
export function hasNote(n: Note | undefined): boolean {
  return !!n && !!(n.text || n.photo || n.drawing || n.voice || n.symbols.length || n.help.chips.length || n.help.text);
}

/** Saves today's check-in (replacing an earlier one from today), raises safeguarding flags and refreshes the profile.
 *  Returns true if any note was flagged, so the pupil can be told a safe adult will check in. */
export function saveCheckIn(db: Db, pupilId: string, date: string, ratings: CheckIn['ratings'], notes: CheckIn['notes'], existingId?: string): boolean {
  const id = existingId ?? uid('ci');
  db.checkins = db.checkins.filter((c) => c.id !== id);
  db.checkins.push({ id, pupilId, date, ratings, notes, at: Date.now() });
  let flagged = false;
  for (const [sid, n] of Object.entries(notes))
    if (raiseFlag(db, pupilId, 'Check-in note: ' + slotLabel(db, pupilId, sid), [n.text, n.help.text].filter(Boolean).join(' '))) flagged = true;
  syncProfile(db, pupilId);
  return flagged;
}
