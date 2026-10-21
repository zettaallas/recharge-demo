# Step 10c: Remove the "I need a break" button

**Commit:** not committed yet.

One of the educators didn't like the "I need a break" button, so it's removed from the pupil side.

## What changed

- **Pupil top bar** (`(pupil)/_layout.tsx`): the purple **"I need a break"** button is gone, along with its pop-up ("Your break is logged…") and the "See what I've sent" link inside it. The bar now holds Recharge (home), **My Zip**, **Settings**, and **Hide** on shared devices.
- **Wording:**
  - **Walkthrough card 2:** it no longer says "I need a break is always at the top". It now reads: "Ask to talk to my teacher sends Mrs Hughes a request. On the symbol board you can also tap symbols like Need a break. You don't have to explain."
  - **"What I've sent" intro:** it now starts "Talk requests, symbols, notes and places…".
  - **Removed strings:** `needBreak`, `breakSent` and `seeSent`.
- **Logic:** `logBreak()` is removed from `domain/posts.ts`, because nothing creates break posts any more.
- **Demo data:** Isla's seeded break is now a **talk request** ("I'd like to talk"), so the demo doesn't show a feature that no longer exists. This applies to new installs and after **Reset demo**. Breaks already saved on a device stay readable.
- **Kept on purpose:**
  - **"Need a break" symbol tile** on the symbol board. It's something the pupil picks to describe how they are, not a request button. eko can say if it should go too.
  - **Staff side:** old break posts still show as "Asked for a break" in Requests, and quick replies are unchanged.
  - **Database:** the schema (10a, already applied) still allows `'break'` in the `moments.kind` and `posts.kind` check rules. An unused allowed value is harmless and keeps old rows valid, so the schema isn't changed.

## Key code

**The pupil top bar now** (`src/app/(pupil)/_layout.tsx`):
```tsx
<View style={[styles.bar, { paddingTop: insets.top + 8, borderColor: colors.line, backgroundColor: colors.bg }]}>
  <Pressable accessibilityRole="button" accessibilityLabel={t('home')} onPress={() => router.navigate('/home')} style={{ marginRight: 'auto' }}>
    <Text style={[styles.brand, { color: colors.accent }]}>Recharge</Text>
  </Pressable>
  <IconBtn icon="star" label={t('myZip')} onPress={() => router.navigate('/zip')} />
  <IconBtn icon="sliders" label={t('settings')} onPress={() => router.navigate('/settings')} />
  {sharedDevice && <Button label={t('hide')} onPress={() => logOut()} accessibilityLabel={t('hide') + ' and log out'} />}
</View>
```

**Demo data** (`src/data/seed.ts`). Isla's request is now a talk request:
```ts
{ id: 'm_isla_talk', pupilId: 'p_isla', kind: 'talk', at: talkAt, seen: false },
...
{ id: 'post_3', pupilId: 'p_isla', kind: 'talk', refId: 'm_isla_talk', summary: "I'd like to talk", sharedWith: 'keyAdult', status: 'sent', at: talkAt },
```

## Checks

- **Type check:** passes.
- **Leftovers:** a search for `needBreak` (not the symbol), `breakSent`, `seeSent`, `logBreak` and "I need a break" finds nothing in `src/`.
