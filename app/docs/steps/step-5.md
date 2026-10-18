# Step 5: Pupil home, Zip and the battery check-in

**Commit:** not committed yet

## What changed

- **New package:** `react-native-svg` (works in Expo Go), for drawing Zip and the icons.
- **`components/Zip.tsx`:** Zip and all 6 hats, redrawn from the web version. Zip fills green, amber or red with the charge. It has no face.
- **`components/Battery.tsx`:** the 5-segment battery. Tapping the same level again clears it, and a screen reader reads each segment as "Maths: 2 of 5".
- **`components/Icon.tsx` and `icons.ts`:** all 60 line icons, copied from `index.html` automatically.
- **`components/NotePanel.tsx`:** "Add more" for one place, with three tabs: Symbol board, Type, and What would help? **Photo, drawing and voice are not included yet.** They need camera, drawing and recording packages, so they come in a later step.
- **Home** (`(pupil)/home.tsx`): Zip with "Zip is 34% charged" and six tiles. Check-in and My Zip open. The other tiles say which step they arrive in.
- **Check-in** (`(pupil)/check-in.tsx`): one card per lesson or place, plus the pupil's own Walk places. Zip charges up as you rate. Saving shows "Saved. Thank you!", plus "A safe adult will check in with you" if a note was flagged. Checking in again on the same day updates that day's check-in.
- **My Zip** (`(pupil)/zip.tsx`): colour and hat, saved straight away.

## Key code

**Saving a check-in** (`src/domain/checkins.ts`). It replaces today's check-in if there is one, scans every note for safeguarding words, refreshes the profile, and says whether anything was flagged.
```ts
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
```

**Check-in screen save** (`src/app/(pupil)/check-in.tsx`). Empty notes, where "Add more" was opened but nothing was added, are dropped first.
```ts
const save = () => {
  const kept = Object.fromEntries(Object.entries(notes).filter(([, n]) => hasNote(n)));
  const flagged = update((d) => saveCheckIn(d, me.id, today, ratings, kept, existing?.id));
  setDone({ flagged });
};
```

**Zip's charge** (`src/domain/checkins.ts`). On home it's the average of the latest check-in divided by 5. On the check-in screen it's live, from what has been rated so far.
```ts
export function lastCharge(db: Db, pid: string): number | null {
  const s = pupilSeries(db, pid);
  const last = s[s.length - 1]?.avg;
  return last == null ? null : last / 5;
}
```

**Zip's fill** (`src/components/Zip.tsx`). The battery well is clipped and filled from the bottom up. It's green at 70% or more, amber at 40% or more, and red below that.
```tsx
const fill = v >= 0.7 ? c.hi : v >= 0.4 ? c.mid : c.lo;
...
<G clipPath={`url(#${id})`}>
  <Rect x="32" y={40 + 78 * (1 - v)} width="56" height={78 * v} fill={fill} />
</G>
```

**One battery segment** (`src/components/Battery.tsx`). Segments fill up to the chosen level, and tapping the chosen level again clears it.
```tsx
<Pressable
  accessibilityRole="radio"
  accessibilityState={{ checked: value === n }}
  accessibilityLabel={label + ': ' + t('batteryLevel', { n })}
  onPress={() => onChange(value === n ? null : n)}
  style={[styles.seg, { backgroundColor: on ? fill : colors.noneBg }]}>
```

**Home tiles** (`src/app/(pupil)/home.tsx`). A tile without a link shows which step it arrives in.
```ts
const TILES: TileDef[] = [
  { key: 'checkin', icon: 'battery', title: 'checkIn', sub: 'checkInSub', href: '/check-in' },
  { key: 'symbols', icon: 'grid', title: 'symbols', sub: 'symbolsSub', soon: 'Step 6' },
  { key: 'walk', icon: 'camera', title: 'walk', sub: 'walkSub', soon: 'Step 6' },
  { key: 'profile', icon: 'user', title: 'profile', sub: 'profileSub', soon: 'Step 7' },
  { key: 'feed', icon: 'megaphone', title: 'feed', sub: 'feedSub', soon: 'Step 7' },
  { key: 'zip', icon: 'star', title: 'buddy', sub: 'buddySub', href: '/zip' },
];
```

**My Zip** (`src/app/(pupil)/zip.tsx`). Each choice is saved to the pupil's record straight away.
```ts
const set = (patch: Partial<Buddy>) =>
  update((d) => {
    const p = d.pupils.find((x) => x.id === me.id)!;
    p.buddy = { ...p.buddy, ...patch };
  });
```

## Checks (browser, as Isla)

- **Home:** Zip with headphones at 34%.
- **Check-in:**
  - I rated Maths 2, ticked "Too loud" and typed a fictional test note: "I feel unsafe in the corridor".
  - Saving showed "Saved… Zip is 40% charged" and the safe-adult message.
  - The saved data had the rating, the symbol, the note and a new safeguarding flag.
- **My Zip:** coral and the crown were saved.
- **Type check:** passes.
