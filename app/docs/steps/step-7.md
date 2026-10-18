# Step 7: My Recharge Profile and You said / We did

**Commit:** `93a3139`

## What changed

- **My Recharge Profile** (`(pupil)/profile.tsx`):
  - **Three sections:** Drains me, Helps me and In my words. They're built automatically from the pupil's own ratings, symbols, Walk places, "what would help" answers and typed notes. The profile refreshes each time it's opened.
  - **Hide / Show** on every item. A hidden item is crossed out and never goes to staff.
  - **Add in my words:** the pupil can add their own sentence. It's checked for safeguarding words like any other note.
  - **Approve so staff can see it.** The banner shows one of three states:
    - "Only you can see this until you approve it."
    - "Approved. Staff can see this."
    - "You changed things. Approve again so staff see the new version."
  - **"Let school see notes from home"**: the pupil decides whether school can read notes their parents or carers send.
  - **Saving as a PDF** for the next school isn't built yet. It needs `expo-print`, so it's planned for a later step, and the screen says so. "Translate for my family" is left out because the app is English only and AI is stubbed.
- **You said, we did** (`(pupil)/feed.tsx`): updates from staff, newest first, each with a "You said" box and a green "We did" box.
- **"Was this helpful?"** under each update: one tap on **Yes** or **Not really**. It's optional, and tapping the same answer again clears it. Answers are saved per pupil on that update, so staff can see later whether a change helped.
- **Home:** all six tiles now open.

## Key code

**What staff see is a snapshot** (`src/domain/profile.ts`, from Step 3). Staff only ever see what the pupil approved: the visible items at the moment they tapped Approve.
```ts
export function approveProfile(db: Db, pid: string): void {
  const prof = db.profiles[pid];
  if (!prof) return;
  prof.approvedAt = Date.now();
  prof.approvedSnapshot = prof.items.filter((i) => !i.hidden).map((i) => ({ section: i.section, text: i.text }));
  prof.dirty = false;
}
```

**Hiding or showing an item** (`src/domain/profile.ts`). Any change after approval marks the profile as changed, so the pupil has to approve again before staff see the new version.
```ts
export function toggleProfileItem(db: Db, pid: string, itemId: string): void {
  const prof = db.profiles[pid];
  const it = prof?.items.find((i) => i.id === itemId);
  if (!prof || !it) return;
  it.hidden = !it.hidden;
  if (prof.approvedSnapshot) prof.dirty = true;
}
```

**Adding own words** (`src/domain/profile.ts` and `profile.tsx`). The pupil's words go into "In my words" and are checked for safeguarding words.
```ts
export function addOwnWords(db: Db, pid: string, text: string): void {
  syncProfile(db, pid);
  const prof = db.profiles[pid];
  if (!prof) return;
  prof.items.push({ id: uid('it'), section: 'words', text: '"' + text + '"', src: 'own', hidden: false });
  if (prof.approvedSnapshot) prof.dirty = true;
}
...
update((d) => {
  addOwnWords(d, me.id, text);
  raiseFlag(d, me.id, 'Profile words', text);
});
```

**The approval banner** (`src/app/(pupil)/profile.tsx`):
```tsx
{approved ? (
  <Banner kind="ok">{t('approved')}</Banner>
) : prof.dirty ? (
  <Banner kind="info">{t('changed')}</Banner>
) : (
  <Banner kind="info">{t('notApproved')}</Banner>
)}
```

**"Was this helpful?"** (`src/domain/themes.ts`). Each pupil's answer is stored on the update under their id. Tapping the same answer again removes it, so answering is never a trap.
```ts
export function setHelpful(db: Db, feedId: string, pupilId: string, answer: Helpful): void {
  const item = db.feed.find((f) => f.id === feedId);
  if (!item) return;
  if (item.helpful[pupilId] === answer) delete item.helpful[pupilId];
  else item.helpful[pupilId] = answer;
}
```

**The answer buttons** (`src/app/(pupil)/feed.tsx`). There are two big buttons, and the chosen one is filled with a ✓.
```tsx
<Pressable
  accessibilityRole="radio"
  accessibilityState={{ checked: on }}
  onPress={() => update((d) => setHelpful(d, feedId, me.id, value))}
  style={[styles.chip, { backgroundColor: on ? colors.accent : colors.surface2 }]}>
  <Text style={{ fontWeight: '700', color: on ? colors.accentInk : colors.ink }}>{(on ? '✓ ' : '') + label}</Text>
</Pressable>
```

## Checks (browser, as Isla)

- **Profile:**
  - It opened as "Approved" with her seeded items, plus the Walk place from Step 6.
  - Hiding "Lunch hall at lunch" switched the banner to "You changed things…".
  - I added "I like sitting near the door" and tapped Approve. The banner showed "Approved". The staff snapshot had the new words and **not** the hidden item.
- **You said, we did:**
  - Both updates showed, newest first.
  - "Yes" saved `{ p_isla: 'yes' }` and showed the thank-you line. Tapping Yes again cleared it.
- **Type check:** passes.
