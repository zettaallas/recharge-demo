// Saving to Supabase (Step 10f-2). Compares the data before and after an action and turns the difference
// into small, targeted writes: insert the new rows, update only the columns that changed, delete what was removed.
// Pure: no network, no React Native imports, so it can be unit-tested in Node.
// The writes go out with the signed-in person's own session, so the access rules (RLS) still decide what is allowed.
import type { Db } from '@/types';

type Row = Record<string, any>;

export type WriteOp =
  | { table: string; op: 'insert'; rows: Row[] }
  | { table: string; op: 'update'; match: Row; values: Row }
  | { table: string; op: 'delete'; match: Row };

/** Who is saving. Fills in columns the app's data doesn't carry (who posted, which school). */
export type Actor = { kind: 'pupil'; id: string } | { kind: 'staff'; id: string; schoolId?: string };

interface Spec {
  table: string;
  /** The columns that identify a row (its primary key, or a unique pair). */
  key: string[];
  rows: (db: Db) => Row[];
  /** Extra columns for a new row only. */
  onInsert?: (row: Row, actor: Actor) => Row;
}

const iso = (ms: number | undefined | null) => (ms == null ? null : new Date(ms).toISOString());
const orNull = <T,>(v: T | undefined | null | '') => (v === undefined || v === '' ? null : v);
const asStaff = (row: Row, actor: Actor, col: string) => (actor.kind === 'staff' ? { ...row, [col]: actor.id } : row);

// Parents before children, so a new row's parent already exists. Deletes run in the reverse order.
// Not here, on purpose: staff and schools (managed by the school), parent notes (read only),
// and photos, drawings and voice notes, which stay on the pupil's device for now.
const SPECS: Spec[] = [
  {
    table: 'classes', key: ['id'],
    rows: (db) => db.classes.map((c) => ({ id: c.id, name: c.name, code: c.code, teacher_id: orNull(c.teacherId) })),
    onInsert: (row, actor) => (actor.kind === 'staff' ? { ...row, school_id: actor.schoolId } : row),
  },
  {
    table: 'slots', key: ['class_id', 'key'],
    rows: (db) => Object.entries(db.slots).flatMap(([classId, list]) =>
      list.map((s, i) => ({ class_id: classId, key: s.id, name: s.name, place: s.place, icon: s.icon, time_label: orNull(s.time), position: i }))),
  },
  {
    table: 'pupils', key: ['id'],
    rows: (db) => db.pupils.map((p) => ({
      id: p.id, class_id: p.classId, name: p.name, avatar: p.avatar, key_adult_id: orNull(p.keyAdultId), attendance: p.attendance,
      buddy_colour: p.buddy.colour, buddy_hat: p.buddy.hat, parent_share: p.parentShare,
      preferred_name: orNull(p.settings.preferredName), helps: p.settings.helps, show_read_receipts: p.settings.showReadReceipts,
      pin_on_reopen: p.settings.pinOnReopen, registered: p.settings.registered, walkthrough_done: p.settings.walkthroughDone,
      // PIN hash, salt and tries are never sent from the app: the server keeps them
    })),
  },
  {
    table: 'checkins', key: ['id'],
    rows: (db) => db.checkins.map((c) => ({ id: c.id, pupil_id: c.pupilId, date: c.date, created_at: iso(c.at) })),
  },
  {
    table: 'checkin_ratings', key: ['checkin_id', 'slot_key'],
    rows: (db) => db.checkins.flatMap((c) => Object.entries(c.ratings).map(([slot, rating]) => ({ checkin_id: c.id, slot_key: slot, rating }))),
  },
  {
    table: 'notes', key: ['checkin_id', 'slot_key'],
    rows: (db) => db.checkins.flatMap((c) => Object.entries(c.notes).map(([slot, n]) => ({
      checkin_id: c.id, slot_key: slot, symbols: n.symbols, help_chips: n.help.chips, help_text: orNull(n.help.text), text: orNull(n.text),
    }))),
  },
  {
    table: 'walk_places', key: ['id'],
    rows: (db) => db.pins.map((p) => ({ id: p.id, pupil_id: p.pupilId, tag: p.tag, emoji: p.emoji, caption: p.caption, created_at: iso(p.at) })),
  },
  {
    table: 'moments', key: ['id'],
    rows: (db) => db.moments.map((m) => ({
      id: m.id, pupil_id: m.pupilId, kind: m.kind,
      symbols: m.kind === 'talk' ? m.topics ?? [] : m.symbols ?? (m.symbol ? [m.symbol] : []),
      where_slot: orNull(m.where), text: orNull(m.text), seen: m.seen, created_at: iso(m.at),
    })),
  },
  {
    table: 'posts', key: ['id'],
    rows: (db) => db.posts.map((p) => ({
      id: p.id, pupil_id: p.pupilId, kind: p.kind, ref_id: p.refId, summary: p.summary, shared_with: p.sharedWith, status: p.status,
      read_at: iso(p.readAt), follow_up: orNull(p.followUp), replied_at: iso(p.repliedAt),
      replied_by: p.repliedBy ? db.staff.find((s) => s.name === p.repliedBy)?.id ?? null : null,
      helpful: orNull(p.helpful), created_at: iso(p.at),
    })),
  },
  {
    table: 'profiles', key: ['pupil_id'],
    rows: (db) => Object.entries(db.profiles).map(([pid, p]) => ({ pupil_id: pid, approved_at: iso(p.approvedAt), dirty: p.dirty })),
  },
  {
    table: 'profile_items', key: ['id'],
    rows: (db) => Object.entries(db.profiles).flatMap(([pid, p]) =>
      p.items.map((i, position) => ({ id: i.id, pupil_id: pid, section: i.section, text: i.text, src: i.src, hidden: i.hidden, position }))),
  },
  {
    table: 'feed_posts', key: ['id'],
    rows: (db) => db.feed.map((f) => ({ id: f.id, class_id: f.classId, said: f.said, did: f.did, created_at: iso(f.at) })),
    onInsert: (row, actor) => asStaff(row, actor, 'by_staff_id'),
  },
  {
    table: 'feed_helpful', key: ['feed_post_id', 'pupil_id'],
    rows: (db) => db.feed.flatMap((f) => Object.entries(f.helpful).map(([pid, answer]) => ({ feed_post_id: f.id, pupil_id: pid, answer }))),
  },
  {
    table: 'flags', key: ['id'],
    rows: (db) => db.flags.map((f) => ({
      id: f.id, pupil_id: f.pupilId, source: f.source, text: f.text, words: f.words, status: f.status, checklist: f.checklist, created_at: iso(f.at),
    })),
  },
  {
    table: 'plans', key: ['id'],
    rows: (db) => db.plans.map((p) => ({ id: p.id, pupil_id: p.pupilId, when_label: p.when, created_at: iso(p.at) })),
    onInsert: (row, actor) => asStaff(row, actor, 'by_staff_id'),
  },
  {
    // a teacher's quick replies, in order: position is the row's place in their list
    table: 'quick_replies', key: ['staff_id', 'position'],
    rows: (db) => db.staff.flatMap((s) => s.quickReplies.map((text, position) => ({ staff_id: s.id, position, text }))),
  },
];

/** Same value, ignoring the order of object keys (so a re-ordered checklist isn't a change). */
function stable(v: unknown): string {
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + stable((v as Row)[k])).join(',') + '}';
  return JSON.stringify(v ?? null);
}

/** The writes that turn `before` into `after` on the server. Empty when nothing the server keeps has changed. */
export function diffDb(before: Db, after: Db, actor: Actor): WriteOp[] {
  const inserts: WriteOp[] = [];
  const updates: WriteOp[] = [];
  const deletes: WriteOp[] = [];

  for (const spec of SPECS) {
    const keyOf = (r: Row) => spec.key.map((k) => String(r[k])).join('\u0000');
    const pick = (r: Row) => Object.fromEntries(spec.key.map((k) => [k, r[k]]));
    const old = new Map(spec.rows(before).map((r) => [keyOf(r), r]));
    const now = new Map(spec.rows(after).map((r) => [keyOf(r), r]));

    const added: Row[] = [];
    for (const [k, r] of now) {
      const o = old.get(k);
      if (!o) {
        added.push(spec.onInsert ? spec.onInsert(r, actor) : r);
        continue;
      }
      const values = Object.fromEntries(Object.keys(r).filter((c) => !spec.key.includes(c) && stable(r[c]) !== stable(o[c])).map((c) => [c, r[c]]));
      if (Object.keys(values).length) updates.push({ table: spec.table, op: 'update', match: pick(r), values });
    }
    if (added.length) inserts.push({ table: spec.table, op: 'insert', rows: added });
    for (const [k, r] of old) if (!now.has(k)) deletes.unshift({ table: spec.table, op: 'delete', match: pick(r) });
  }

  // Approving the profile saves a new snapshot: exactly what staff will see.
  const snaps = Object.entries(after.profiles)
    .filter(([pid, p]) => p.approvedSnapshot && p.approvedAt != null && p.approvedAt !== before.profiles[pid]?.approvedAt)
    .map(([pid, p]) => ({ pupil_id: pid, items: p.approvedSnapshot, approved_at: iso(p.approvedAt) }));
  if (snaps.length) inserts.push({ table: 'profile_snapshots', op: 'insert', rows: snaps });

  const events = postEvents(before, after, actor);
  // events go last, after the posts they are about
  return [...inserts, ...updates, ...deletes, ...(events.length ? [{ table: 'post_events', op: 'insert' as const, rows: events }] : [])];
}

/** The audit trail: who sent, read, replied to, shared or unshared a post, and when (the server adds the time). */
function postEvents(before: Db, after: Db, actor: Actor): Row[] {
  const who = actor.kind === 'pupil' ? { actor_pupil_id: actor.id } : { actor_staff_id: actor.id };
  const out: Row[] = [];
  const old = new Map(before.posts.map((p) => [p.id, p]));
  for (const p of after.posts) {
    const o = old.get(p.id);
    const add = (event: string, detail?: string) => out.push({ post_id: p.id, event, ...who, ...(detail ? { detail } : {}) });
    if (!o) {
      if (p.sharedWith === 'keyAdult') add('sent');
      continue;
    }
    if (o.sharedWith !== p.sharedWith) add(p.sharedWith === 'keyAdult' ? 'shared' : 'unshared');
    if (o.followUp !== p.followUp && p.followUp) add('replied');
    else if (o.status === 'sent' && p.status === 'read') add('read');
    if (o.helpful !== p.helpful) add('helpful', p.helpful ?? 'cleared');
  }
  return out;
}

// ---- Photos, drawings and voice notes stay on the pupil's device for now ----
// They aren't uploaded yet (that needs private file storage), so after a refresh from the server
// they are put back from this device's own list.

export type MediaMap = Record<string, { photo?: string | null; drawing?: string | null; voice?: string | null }>;

export function pickMedia(db: Db): MediaMap {
  const out: MediaMap = {};
  for (const c of db.checkins)
    for (const [slot, n] of Object.entries(c.notes))
      if (n.photo || n.drawing || n.voice) out['note:' + c.id + ':' + slot] = { photo: n.photo ?? null, drawing: n.drawing ?? null, voice: n.voice ?? null };
  for (const p of db.pins) if (p.photo) out['pin:' + p.id] = { photo: p.photo };
  return out;
}

export function applyMedia(db: Db, media: MediaMap): Db {
  for (const c of db.checkins)
    for (const [slot, n] of Object.entries(c.notes)) {
      const m = media['note:' + c.id + ':' + slot];
      if (m) Object.assign(n, m);
    }
  for (const p of db.pins) {
    const m = media['pin:' + p.id];
    if (m?.photo) p.photo = m.photo;
  }
  return db;
}
