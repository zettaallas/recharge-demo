# Step 9a: Teachers' side, part 1

**Commit:** `3f4fa13` (committed by eko)

This follows the plan in [step-9-plan.md](step-9-plan.md) and eko's answers: the scope's access rules, editable quick replies, and laptop-first layouts that still work on a phone.

## What changed

- **Staff login** (`(auth)/staff-login.tsx`): email and password, plus the four fictional demo accounts (Ms Rivera, class teacher · Mr Adeyemi, SENCO · Mrs Hughes, key adult · Ms Shah, DSL; password `demo1234`). The entry screen's "I'm staff" tile now opens it, and the demo box lists the accounts.
- **Staff area** `(staff)`:
  - A top bar shows the logged-in name and role, plus Log out.
  - Section tabs show only what that person's role can use.
  - Staff screens are wider, laptop first, and wrap on a phone.
- **Access rules** (`domain/access.ts`), following the scope. **Key adult is per pupil**, so Ms Rivera is the class teacher and also key adult for most of 8B, including Isla.
  - **Class teacher:** the whole class's heatmap. Individual notes and requests only for pupils they are key adult for.
  - **Key adult:** **Requests** from their pupils, their drift alerts, Pupils and pupil detail.
  - **SENCO:** drift alerts and approved profiles for everyone. No Requests.
  - **DSL:** safeguarding only. No pupil names, no heatmap, and pupil pages redirect away. The flag list arrives in 9b.
  - **Private posts never reach staff.** A note a pupil kept private is left out of Requests, the pupil page's notes, and their profile.
- **Overview** (`(staff)/overview.tsx`):
  - Stats, including "New requests" for key adults.
  - **Where energy goes**: a heatmap of places by day. High drain is outlined as well as coloured.
  - A pupil filter, only for people allowed to see one pupil's data.
  - **Drift alerts** with a sparkline, the latest shared notes, **Plan a check-in** (Today / Tomorrow / This week) and **Open pupil**.
- **Requests** (`(staff)/requests.tsx`): what the key adult's pupils shared (breaks, talk requests, symbols, notes, places). There are **New** and **All** filters, and each request offers:
  - **Quick replies:** one tap sends the reply.
  - **Write your own** reply.
  - **Mark as read.**

  The pupil sees ✓✓ Read, or ↩ Follow-up with the reply, who sent it and when.
- **My quick replies** (`(staff)/quick-replies.tsx`): each teacher can **add, edit, delete and reorder** their own replies. Every staff member starts with three:
  - "I've seen this. Take the time you need."
  - "Thanks for telling me. Let's talk at break time."
  - "Thank you for letting me know. I'm here if you need me."
- **Pupils** (`(staff)/pupils.tsx`): a list with latest battery, trend, attendance, profile status and key adult. **Pupil detail** (`(staff)/pupil/[id].tsx`) shows the battery trend, the **approved** profile, recent **shared** notes, and notes from home **only if the pupil agreed**.
- **The pupil side's "Demo only" buttons are removed.** Read and replies now come from a real teacher.
- **Data:**
  - Staff have `quickReplies`.
  - Replies store `repliedBy`.
  - `plans` holds planned check-ins.
  - Data already saved on a phone gets these fields added on load. No reset is needed.

## Key code

**Access rules** (`src/domain/access.ts`, excerpt). Being a key adult belongs to the pupil, not the job title.
```ts
const isKeyAdult = (staff: Staff, p: Pupil) => staff.role !== 'dsl' && p.keyAdultId === staff.id;

export const Access = {
  canSeeHeatmap: (staff: Staff) => is(staff, 'class_teacher', 'key_adult', 'senco'),
  canSeeDrift: (staff: Staff, p: Pupil) => staff.role === 'senco' || isKeyAdult(staff, p),
  canSeePupilDetail: (staff: Staff, p: Pupil) => staff.role === 'senco' || isKeyAdult(staff, p),
  canReply: (staff: Staff, p: Pupil) => isKeyAdult(staff, p),
  canSeeSafeguarding: (staff: Staff) => staff.role === 'dsl',
  profile: (db: Db, p: Pupil) => db.profiles[p.id]?.approvedSnapshot ?? null,
  parentNotes: (db: Db, p: Pupil) => (p.parentShare ? db.parentNotes.filter((n) => n.pupilId === p.id) : null),
};
```

**Requests only contain shared posts** (`src/domain/access.ts`):
```ts
export function inboxFor(db: Db, staff: Staff): Post[] {
  if (staff.role === 'dsl') return [];
  const mine = new Set(db.pupils.filter((p) => p.keyAdultId === staff.id).map((p) => p.id));
  return db.posts.filter((p) => mine.has(p.pupilId) && p.sharedWith === 'keyAdult').sort((a, b) => b.at - a.at);
}
```

**Replying** (`src/domain/staff.ts`). The pupil sees ↩ Follow-up with the words, who replied and when. Replying also marks the post read and its request as seen.
```ts
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
```

**Reordering a quick reply** (`src/domain/staff.ts`):
```ts
export function moveQuickReply(db: Db, staffId: string, index: number, by: -1 | 1): void {
  const list = mine(db, staffId).quickReplies;
  const to = index + by;
  if (to < 0 || to >= list.length) return;
  [list[index], list[to]] = [list[to], list[index]];
}
```

**Private notes stay out of the profile** (`src/domain/profile.ts`). I found this during testing: a note Isla kept private was being copied into "In my words".
```ts
const privateNotes = new Set(db.posts.filter((x) => x.pupilId === pid && x.kind === 'note' && x.sharedWith === 'private').map((x) => x.refId));
for (const c of cs)
  for (const [sid, n] of Object.entries(c.notes || {}))
    if (n.text && !privateNotes.has(c.id + ':' + sid)) want.push({ section: 'words', text: '"' + n.text + '"', src: 'typed' });
```

**Section tabs depend on the role** (`src/app/(staff)/_layout.tsx`):
```ts
const NAV: NavItem[] = [
  { href: '/overview', path: '/overview', label: 'Overview', show: () => true },
  { href: '/requests', path: '/requests', label: 'Requests', show: (s, db) => Access.hasKeyPupils(db, s) },
  { href: '/pupils', path: '/pupils', label: 'Pupils', show: (s, db) => s.role === 'senco' || Access.hasKeyPupils(db, s) },
  { href: '/quick-replies', path: '/quick-replies', label: 'My quick replies', show: (s, db) => Access.hasKeyPupils(db, s) },
];
```

## Checks (browser, fictional data)

- **Ms Rivera** (class teacher, key adult for Isla):
  - The tabs were Overview, Requests (1), Pupils and My quick replies.
  - The heatmap showed 8B, and there was 1 drift alert (Isla).
  - Requests → All showed Isla's 3 shared posts and **not** her private one.
  - A quick reply on the break set it to Follow-up, with `repliedBy` set, and its request marked as seen.
- **Quick replies:** adding, moving up, editing and deleting all saved in the right order.
- **Isla's pupil page:**
  - Her shared notes showed and her private note did not.
  - Notes from home showed "Hidden. Isla has not agreed…".
  - After the profile fix, her private note was no longer in her profile.
- **Mrs Hughes** (key adult): she saw only her 5 pupils and no drift alerts.
- **Mr Adeyemi** (SENCO):
  - The tabs were Overview and Pupils (no Requests).
  - He saw the drift alert for Isla.
  - Isla's profile didn't include the private note.
- **Ms Shah** (DSL):
  - Only Overview, showing the safeguarding message, with no names and no heatmap.
  - Opening a pupil page by its URL redirected her back.
- **End to end:**
  - Ms Rivera wrote "Thanks Isla. Come and find me at the start of break."
  - Isla's "See my teacher's response" showed it with "Replied Today 15:39".
- **On a phone-width screen:** Requests wraps and stays readable.
- **Type check:** passes.

## Next: 9b

Most asked for (themes), posting You said / We did with the "Was this helpful?" tally, the Safeguarding flags and checklist for the DSL, and Class & PINs.
