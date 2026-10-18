# Step 6: Symbol board, "I need a break" and Recharge Walk

**Commit:** `01daa36`

## What changed

- **New packages:**
  - `expo-image-picker` for taking or choosing a photo
  - `expo-image-manipulator` for shrinking it

  Both work in Expo Go. `app.json` now explains why the app asks for camera and photo access.
- **Symbol board** (`(pupil)/symbols.tsx`): six big tiles. One tap sends it.
  - "Talk to an adult" and "Need a break" say "Sent. Ms Rivera will see it."
  - The others say "Saved. Thank you for telling us."
- **"I need a break"** is a purple button in the top bar on every pupil screen. It logs the break and opens a calm dialog: Zip at 20% and "Your break is logged. Ms Rivera has been told. You can go to your calm place."
- **Recharge Walk** (`(pupil)/walk.tsx`):
  - The pupil's places show as cards with a photo or emoji, a Drains me / Recharges me tag, the caption, and Remove.
  - "Add a place" offers: photo (optional), drains or recharges, an emoji, caption chips or their own words, then Save.
  - New places appear straight away under "Your places" in the check-in, and in the profile.
- **Photos in check-in notes:** "Add more" now has a **Photo** tab. Drawing and voice are still to come.
- **Posts start here** (`domain/posts.ts`): every symbol tap, break and Walk place also becomes a post with status **Sent**. These feed the "earlier posts" list and the statuses in Step 8. Symbols and breaks go to the key adult. Walk places stay **private** until the pupil approves their profile.
- Plan: the Walk is one screen (list plus form) instead of two.

## Key code

**Symbol tap** (`src/domain/posts.ts`). Each tap does two things: it adds a "moment" to the key adult's list (staff side, later), and it adds a post to the pupil's own history.
```ts
export function logSymbol(db: Db, pupilId: string, symbol: SymbolKey, summary: string): void {
  const id = uid('m');
  db.moments.unshift({ id, pupilId, kind: 'symbol', symbol, at: Date.now(), seen: false });
  addPost(db, { pupilId, kind: 'symbol', refId: id, summary, sharedWith: 'keyAdult' });
}
```

**New posts start as Sent** (`src/domain/posts.ts`):
```ts
export function addPost(db: Db, p: Omit<Post, 'id' | 'status' | 'at'> & { at?: number }): Post {
  const post: Post = { id: uid('post'), status: 'sent', at: Date.now(), ...p };
  db.posts.unshift(post);
  return post;
}
```

**What the pupil is told after a tap** (`src/app/(pupil)/symbols.tsx`). Symbols that ask an adult to act name the key adult. The others are simply logged.
```tsx
{sent && (
  <Banner kind="ok">
    {t(sent) + ': ' + (SYMBOLS_FOR_ADULT.includes(sent) ? t('symSent', { adult }) : t('symLogged'))}
  </Banner>
)}
```

**"I need a break" in the top bar** (`src/app/(pupil)/_layout.tsx`). Because it sits in the pupil layout, it's on every pupil screen.
```tsx
const needBreak = () => {
  update((d) => logBreak(d, me.id, t('needBreak')));
  setBreakOpen(true);
};
...
<Button label={t('needBreak')} kind="break" onPress={needBreak} />
```

**Shrinking a photo** (`src/components/PhotoPicker.tsx`). The photo is resized to 720px wide and saved as a compressed JPEG inside the app's data, about 60–100 KB, so it never fills the phone's storage. Nothing interprets the photo; staff see it exactly as taken.
```ts
async function shrink(uri: string): Promise<string> {
  const img = await ImageManipulator.manipulate(uri).resize({ width: 720 }).renderAsync();
  const out = await img.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });
  return 'data:image/jpeg;base64,' + out.base64;
}
```

**Asking permission first** (`src/components/PhotoPicker.tsx`). If the pupil says no, they get a friendly message instead of an error.
```ts
const perm = source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
if (!perm.granted) return setErr(t('photoDenied'));
const res = source === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
```

**Saving a Walk place** (`src/app/(pupil)/walk.tsx`). It adds the place and a private post, checks the caption for safeguarding words, and refreshes the profile, so an approved profile is marked "changed".
```ts
update((d) => {
  const pin: Pin = {
    id: uid('pn'), pupilId: me.id, photo, tag,
    emoji: emoji ?? (tag === 'drains' ? '🔊' : '🌈'),
    caption: caption.trim() || captionChips[0],
    at: Date.now(),
  };
  d.pins.push(pin);
  addPost(d, { pupilId: me.id, kind: 'pin', refId: pin.id, summary: pin.emoji + ' ' + pin.caption, sharedWith: 'private' });
  raiseFlag(d, me.id, 'Recharge Walk caption', caption);
  syncProfile(d, me.id);
});
```

## Checks (browser, as Isla)

- **Symbols:** "Talk to an adult" showed "Sent. Ms Rivera will see it." A symbol post with status Sent was saved.
- **I need a break:** the dialog showed "Your break is logged. Ms Rivera has been told…", and a break post was saved.
- **Walk:**
  - I added "Recharges me, 🌳, I can be on my own".
  - It appeared in the list, as a private post, and in her profile, which is now marked "changed".
  - It appeared under "Your places" in the check-in.
- **Check-in:** "Add more" shows the Photo, Symbol board, Type and What would help? tabs.
- **Type check:** passes.
- **Not tested here:** taking or choosing a real photo, because browser automation can't use the file picker. Please try it in Expo Go.
