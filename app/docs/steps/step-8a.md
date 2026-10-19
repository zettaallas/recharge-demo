# Step 8a: My posts, statuses, the read indicator and Settings

**Commit:** `98b476e` (committed by eko together with the symbol board update)

Step 8 is split in two. This part covers posts and settings. **8b** adds optional personalisation at registration and the skippable walkthrough.

## What changed

- **My posts** (`(pupil)/posts.tsx`): everything the pupil has sent or kept, newest first.
  - Each row shows what kind it is (Check-in note, Symbol, Break or Place), when it was sent, and what was said.
  - It also shows a **status badge**: **✓ Sent**, **✓✓ Read** or **↩ Follow-up**.
  - Under the badge it says who can see it: "Shared with Ms Rivera" or "🔒 Only you can see this".
- **One post** (`(pupil)/post/[id].tsx`):
  - The status, and when the post was read.
  - The **reply** from the key adult, if there is one, with **"Was this helpful?"** (Yes / Not really, optional, and tapping again clears it).
  - **Share with Ms Rivera** or **Keep private instead**. Under the private option it says plainly: "If you told us something about your safety, the safeguarding lead may still keep a copy."
  - A dashed **"Demo only"** box with "Pretend it was read" and "Pretend Ms Rivera replied". The staff side doesn't exist yet, so this lets testers see what Read and a reply look like. It goes away once staff can really reply.
- **Settings** (`(pupil)/settings.tsx`):
  - **Show when my posts are read** is on by default. When it's off, the pupil only ever sees "Sent", and staff still read posts as usual.
  - **Ask for my PIN when I reopen the app** is only shown on the pupil's own device. It moved here from home.
  - **This is a shared device.**
  - **Log out.**
- **Check-in notes are posts now.** Each place with a note becomes a post when the check-in is saved. Saving again the same day replaces those posts. If the pupil had made one private, it stays private.
- **Home:** two new tiles, **My posts** and **Settings**.
- **Routes:** the list is `posts.tsx` and one post is `post/[id].tsx`. This keeps the typed routes simple, and the plan is updated.

## Key code

**What status the pupil sees** (`src/domain/posts.ts`). With the read indicator off, "Read" is shown as "Sent". A follow-up is a real reply with words in it, so it's always shown.
```ts
export function visibleStatus(post: Post, showReadReceipts: boolean): PostStatus {
  if (post.status === 'read' && !showReadReceipts) return 'sent';
  return post.status;
}
```

**The badge** (`src/components/StatusBadge.tsx`). There are three looks, and the screen reader hears the word without the tick marks.
```tsx
const status = visibleStatus(post, me?.settings.showReadReceipts ?? true);
const look: Record<PostStatus, { bg: string; fg: string; label: string }> = {
  sent: { bg: colors.surface2, fg: colors.ink2, label: '✓ ' + t('statusSent') },
  read: { bg: colors.accentSoft, fg: colors.ink, label: '✓✓ ' + t('statusRead') },
  followUp: { bg: colors.okBg, fg: colors.okInk, label: '↩ ' + t('statusFollowUp') },
};
```

**Share or keep private** (`src/domain/posts.ts`):
```ts
export function setShared(db: Db, postId: string, shared: boolean): void {
  const p = db.posts.find((x) => x.id === postId);
  if (p) p.sharedWith = shared ? 'keyAdult' : 'private';
}
```

**Check-in notes become posts** (`src/domain/posts.ts`, called from `saveCheckIn`). There's one post per place with a note. Saving the same check-in again replaces its posts but keeps the pupil's private choice.
```ts
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
```

**"Was this helpful?" on a reply** (`src/domain/posts.ts`):
```ts
export function setPostHelpful(db: Db, postId: string, answer: Helpful): void {
  const p = db.posts.find((x) => x.id === postId);
  if (!p) return;
  p.helpful = p.helpful === answer ? undefined : answer;
}
```

**Settings saves to the pupil's record** (`src/app/(pupil)/settings.tsx`):
```tsx
const set = (patch: Partial<PupilSettings>) =>
  update((d) => {
    const p = d.pupils.find((x) => x.id === me.id)!;
    p.settings = { ...p.settings, ...patch };
  });
...
<Checkbox label={t('showReadReceipts')} hint={t('showReadReceiptsHint')}
  checked={me.settings.showReadReceipts} onChange={(v) => set({ showReadReceipts: v })} />
```

## Checks (browser, as Isla)

- **My posts:** Isla's four seeded posts showed with the right badges: Follow-up, Read, Sent, and one private.
- **Read indicator:** turning it off in Settings made "Too loud" show **✓ Sent** instead of ✓✓ Read.
- **One post:**
  - "Share with Ms Rivera" on the private post changed it to Sent.
  - "Pretend Ms Rivera replied" showed the reply box.
  - "Yes" saved `helpful: 'yes'`.
  - "Keep private instead" set it back to private.
- **Check-in:** rating Lunch 1 with "Headphones" created the post "Lunch (Lunch hall): Headphones" with status Sent.
- **Type check:** passes.

## For later (staff side)

When staff screens are built, they must hide posts the pupil made private. The only exception is a safeguarding flag, which the DSL keeps under the school's safeguarding policy.
