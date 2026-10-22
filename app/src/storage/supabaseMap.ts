// Turns rows from the Supabase tables into the app's Db shape, so the screens keep working unchanged.
// Pure: no network, no React Native imports, so it can be unit-tested in Node.
// Each person only gets the rows the access rules (RLS) let them read; anything missing simply stays empty.
import type {
  Db, FeedItem, Flag, Moment, Note, ParentNote, Pin, Plan, Post, Profile, Pupil, Rating, SchoolClass, Slot, Staff,
} from '@/types';

type Row = Record<string, any>;
export interface RemoteRows {
  staff: Row[];
  quick_replies: Row[];
  classes: Row[];
  slots: Row[];
  pupils: Row[];
  checkins: Row[];
  checkin_ratings: Row[];
  notes: Row[];
  walk_places: Row[];
  moments: Row[];
  posts: Row[];
  profiles: Row[];
  profile_items: Row[];
  profile_snapshots: Row[];
  feed_posts: Row[];
  feed_helpful: Row[];
  flags: Row[];
  plans: Row[];
  parent_notes: Row[];
}
export const REMOTE_TABLES: (keyof RemoteRows)[] = [
  'staff', 'quick_replies', 'classes', 'slots', 'pupils', 'checkins', 'checkin_ratings', 'notes', 'walk_places', 'moments',
  'posts', 'profiles', 'profile_items', 'profile_snapshots', 'feed_posts', 'feed_helpful', 'flags', 'plans', 'parent_notes',
];

const ms = (t: string | null | undefined) => (t ? Date.parse(t) : undefined);
const byPos = (a: Row, b: Row) => (a.position ?? 0) - (b.position ?? 0);

export function rowsToDb(r: RemoteRows, now = Date.now()): Db {
  const staffName = (id: string | null | undefined) => r.staff.find((s) => s.id === id)?.name as string | undefined;

  const staff: Staff[] = r.staff.map((s) => ({
    id: s.id, name: s.name, email: s.email, role: s.role, schoolId: s.school_id,
    salt: '', pwHash: '', // passwords live in Supabase Auth, never in the app
    quickReplies: r.quick_replies.filter((q) => q.staff_id === s.id).sort(byPos).map((q) => q.text),
  }));

  const classes: SchoolClass[] = r.classes.map((c) => ({ id: c.id, name: c.name, code: c.code, teacherId: c.teacher_id ?? '' }));

  const slots: Record<string, Slot[]> = {};
  for (const s of [...r.slots].sort(byPos))
    (slots[s.class_id] ??= []).push({ id: s.key, name: s.name, place: s.place, icon: s.icon, time: s.time_label ?? '' });

  const pupils: Pupil[] = r.pupils.map((p) => ({
    id: p.id, classId: p.class_id, name: p.name, avatar: p.avatar, keyAdultId: p.key_adult_id ?? '',
    attendance: p.attendance == null ? 100 : Number(p.attendance),
    salt: '', pinHash: '', failed: 0, locked: false, // PIN data stays on the server
    buddy: { colour: p.buddy_colour, hat: p.buddy_hat },
    parentShare: !!p.parent_share,
    settings: {
      showReadReceipts: p.show_read_receipts, helps: p.helps ?? [], pinOnReopen: p.pin_on_reopen,
      registered: p.registered, walkthroughDone: p.walkthrough_done,
      ...(p.preferred_name ? { preferredName: p.preferred_name } : {}),
    },
  }));

  const checkins = r.checkins.map((c) => {
    const ratings: Record<string, Rating> = {};
    for (const x of r.checkin_ratings) if (x.checkin_id === c.id) ratings[x.slot_key] = x.rating;
    const notes: Record<string, Note> = {};
    for (const n of r.notes)
      if (n.checkin_id === c.id)
        notes[n.slot_key] = {
          symbols: n.symbols ?? [], help: { chips: n.help_chips ?? [], text: n.help_text ?? '' },
          ...(n.text ? { text: n.text } : {}),
          photo: n.photo_path ?? null, drawing: n.drawing_path ?? null, voice: n.voice_path ?? null,
        };
    return { id: c.id, pupilId: c.pupil_id, date: c.date, ratings, notes, at: ms(c.created_at)! };
  });

  const pins: Pin[] = r.walk_places.map((w) => ({
    id: w.id, pupilId: w.pupil_id, photo: w.photo_path ?? null, tag: w.tag, emoji: w.emoji, caption: w.caption, at: ms(w.created_at)!,
  }));

  // Profiles: the pupil gets their draft (items); staff only ever get the latest approved snapshot.
  const profiles: Record<string, Profile> = {};
  const pupilIdsWithProfile = new Set([...r.profiles.map((p) => p.pupil_id), ...r.profile_snapshots.map((s) => s.pupil_id)]);
  for (const pid of pupilIdsWithProfile) {
    const head = r.profiles.find((p) => p.pupil_id === pid);
    const snap = r.profile_snapshots.filter((s) => s.pupil_id === pid).sort((a, b) => Date.parse(b.approved_at) - Date.parse(a.approved_at))[0];
    profiles[pid] = {
      items: r.profile_items.filter((i) => i.pupil_id === pid).sort(byPos)
        .map((i) => ({ id: i.id, section: i.section, text: i.text, src: i.src, hidden: i.hidden })),
      approvedAt: ms(head?.approved_at ?? snap?.approved_at) ?? null,
      approvedSnapshot: snap ? snap.items : null,
      dirty: !!head?.dirty,
    };
  }

  const feed: FeedItem[] = r.feed_posts.map((f) => ({
    id: f.id, classId: f.class_id, said: f.said, did: f.did,
    by: staffName(f.by_staff_id) ?? 'School', // pupils can't read other staff rows; "School" is shown instead
    at: ms(f.created_at)!,
    helpful: Object.fromEntries(r.feed_helpful.filter((h) => h.feed_post_id === f.id).map((h) => [h.pupil_id, h.answer])),
  }));

  const moments: Moment[] = r.moments.map((m) => ({
    id: m.id, pupilId: m.pupil_id, kind: m.kind, at: ms(m.created_at)!, seen: m.seen,
    // a talk request keeps its "what about?" pictures in the same symbols column
    ...(m.symbols?.length ? (m.kind === 'talk' ? { topics: m.symbols } : { symbols: m.symbols, symbol: m.symbols[0] }) : {}),
    ...(m.where_slot ? { where: m.where_slot } : {}),
    ...(m.text ? { text: m.text } : {}),
  }));

  const posts: Post[] = r.posts.map((p) => ({
    id: p.id, pupilId: p.pupil_id, kind: p.kind, refId: p.ref_id, summary: p.summary, sharedWith: p.shared_with, status: p.status,
    at: ms(p.created_at)!,
    ...(p.read_at ? { readAt: ms(p.read_at) } : {}),
    ...(p.follow_up ? { followUp: p.follow_up } : {}),
    ...(p.replied_at ? { repliedAt: ms(p.replied_at) } : {}),
    // the reply text starts with the adult's name ("Ms Rivera: …"), so pupils still see who replied
    ...(p.replied_by ? { repliedBy: staffName(p.replied_by) ?? String(p.follow_up ?? '').split(':')[0] } : {}),
    ...(p.helpful ? { helpful: p.helpful } : {}),
  }));

  const flags: Flag[] = r.flags.map((f) => ({
    id: f.id, pupilId: f.pupil_id, source: f.source, text: f.text, words: f.words ?? [], at: ms(f.created_at)!, status: f.status, checklist: f.checklist ?? {},
  }));
  const plans: Plan[] = r.plans.map((p) => ({ id: p.id, pupilId: p.pupil_id, by: staffName(p.by_staff_id) ?? '', when: p.when_label, at: ms(p.created_at)! }));
  const parentNotes: ParentNote[] = r.parent_notes.map((n) => ({ id: n.id, pupilId: n.pupil_id, text: n.text, at: ms(n.created_at)! }));

  return { version: 4, seededAt: now, staff, pupils, classes, slots, checkins, pins, profiles, feed, moments, posts, parentNotes, flags, plans };
}

/** An empty Db for before anyone signs in (the entry screens don't read data). */
export function emptyDb(): Db {
  return rowsToDb(Object.fromEntries(REMOTE_TABLES.map((t) => [t, []])) as unknown as RemoteRows);
}
