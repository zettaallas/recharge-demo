import { noteList, type NoteEntry } from './checkins';
import type { Db, Post, Pupil, Staff, StaffRole } from '@/types';

// Who sees what on the staff side. Follows the project scope: each person sees the minimum they need.
//   Class teacher / tutor: class themes and the places heatmap, no individual notes.
//   Key adult: what their own pupils choose to share (and can reply), their drift alerts and approved profiles.
//     Being a key adult is per pupil, so a class teacher can also be the key adult for some pupils.
//   SENCO: drift alerts and approved profiles for everyone.
//   DSL: safeguarding flags only.
// Posts a pupil keeps private never reach staff. The only exception is a safeguarding flag, which goes to the DSL.

const is = (staff: Staff, ...roles: StaffRole[]) => roles.includes(staff.role);
const isKeyAdult = (staff: Staff, p: Pupil) => staff.role !== 'dsl' && p.keyAdultId === staff.id;

export const Access = {
  /** Pupils this person works with in a class. A key adult only sees the pupils they support. */
  visiblePupils(db: Db, staff: Staff, classId: string | null): Pupil[] {
    let ps = db.pupils.filter((p) => !classId || p.classId === classId);
    if (staff.role === 'key_adult') ps = ps.filter((p) => p.keyAdultId === staff.id);
    if (staff.role === 'dsl') return [];
    return ps;
  },
  canSeeThemes: (staff: Staff) => is(staff, 'class_teacher', 'key_adult', 'senco'),
  canSeeHeatmap: (staff: Staff) => is(staff, 'class_teacher', 'key_adult', 'senco'),
  canSeeDrift: (staff: Staff, p: Pupil) => staff.role === 'senco' || isKeyAdult(staff, p),
  canSeePupilDetail: (staff: Staff, p: Pupil) => staff.role === 'senco' || isKeyAdult(staff, p),
  /** Only the pupil's own key adult receives and answers what they share. */
  canReply: (staff: Staff, p: Pupil) => isKeyAdult(staff, p),
  /** True if this person is key adult for at least one pupil. */
  hasKeyPupils: (db: Db, staff: Staff) => staff.role !== 'dsl' && db.pupils.some((p) => p.keyAdultId === staff.id),
  canManage: (staff: Staff) => is(staff, 'class_teacher', 'senco'),
  canSeeSafeguarding: (staff: Staff) => staff.role === 'dsl',
  /** Only what the pupil approved, never the draft. */
  profile: (db: Db, p: Pupil) => db.profiles[p.id]?.approvedSnapshot ?? null,
  /** Notes from home only if the pupil agreed. */
  parentNotes: (db: Db, p: Pupil) => (p.parentShare ? db.parentNotes.filter((n) => n.pupilId === p.id) : null),
};

/** Posts the pupil shared with this key adult, newest first. Private posts are never included. */
export function inboxFor(db: Db, staff: Staff): Post[] {
  if (staff.role === 'dsl') return [];
  const mine = new Set(db.pupils.filter((p) => p.keyAdultId === staff.id).map((p) => p.id));
  return db.posts.filter((p) => mine.has(p.pupilId) && p.sharedWith === 'keyAdult').sort((a, b) => b.at - a.at);
}

/** A pupil's check-in notes that staff may see: everything except notes the pupil made private. */
export function sharedNotes(db: Db, pupilId: string, limit?: number): NoteEntry[] {
  const hidden = new Set(
    db.posts.filter((p) => p.pupilId === pupilId && p.kind === 'note' && p.sharedWith === 'private').map((p) => p.refId),
  );
  const series = noteList(db, pupilId).filter((n) => {
    const c = db.checkins.find((x) => x.pupilId === pupilId && x.date === n.date);
    return !c || !hidden.has(c.id + ':' + n.sid);
  });
  return limit ? series.slice(0, limit) : series;
}
