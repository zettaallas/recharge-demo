# Symbol board update

**Commit:** `98b476e` (committed by eko together with the symbol board update)

## What changed

- **Pick several symbols.** Each tile is now a tick box, so a pupil can choose, for example, "Too loud" and "Too crowded" together. Chosen tiles get a ✓ in the corner. Nothing is sent on tap any more.
- **"Add details (optional)"** appears once at least one symbol is picked. It's a text box the pupil can skip. The details are checked for safeguarding words like every other note.
- **"Where are you right now? (optional)"** appears in the same box, as a **drop-down** so the screen stays calm. It lists today's classes and places plus the pupil's own Walk places. "I'd rather not say" clears the choice.
- **Save button.** It stays greyed out until at least one symbol is picked. Saving stores everything together as **one** entry for the key adult and **one** post in "My posts" with status Sent.
- **"Saved" pop-up.** It shows a big ✓ and "Saved", then one of these:
  - "Sent. Ms Rivera will see it." when "Talk to an adult" or "Need a break" is among the symbols
  - "Thank you for telling us." for any other symbols
  - plus "A safe adult will check in with you." if the details were flagged.
- **OK goes back home.**
- The pop-up is a reusable component (`components/SavedDialog.tsx`), so other screens can use the same confirmation later.

### Changes after review

- "Where?" became "Where are you right now? (optional)", for added context.
- The place chips became a drop-down (`components/Dropdown.tsx`), because the chips looked too busy.
- The symbol board hint now says "Select one or more, then press Save."
- **Battery check-in:** the top now says in bold "Rate one or more places. You don't have to rate them all."

### Files

These files are separate from Step 8a's, so the two can be committed on their own:
- new: `domain/symbols.ts`, `components/SavedDialog.tsx`, `components/Dropdown.tsx`
- changed: `(pupil)/symbols.tsx`, `(pupil)/check-in.tsx` (hint line), `types/index.ts` (the moment can now hold several symbols, a place and details), `i18n/strings.ts` (new wording)

## Key code

**Saving the symbols together** (`src/domain/symbols.ts`). One moment goes to the key adult and one post goes to the pupil's history. The post summary reads like "Too loud, Too crowded · Changeover · Main corridor · Everyone pushes by the lockers". Details are scanned for safeguarding words.
```ts
export function saveSymbols(db: Db, pupilId: string, e: SymbolEntry, labelOf: (s: SymbolKey) => string): boolean {
  const id = uid('m');
  const text = e.text?.trim() || undefined;
  db.moments.unshift({ id, pupilId, kind: 'symbol', symbols: e.symbols, where: e.where, text, at: Date.now(), seen: false });
  const summary = [e.symbols.map(labelOf).join(', '), e.whereLabel, text].filter(Boolean).join(' · ');
  addPost(db, { pupilId, kind: 'symbol', refId: id, summary, sharedWith: 'keyAdult' });
  return text ? raiseFlag(db, pupilId, 'Symbol board details' + (e.whereLabel ? ': ' + e.whereLabel : ''), text) : false;
}
```

**Tap to pick or unpick** (`src/app/(pupil)/symbols.tsx`):
```ts
const toggle = (k: SymbolKey) => setPicked((x) => (x.includes(k) ? x.filter((y) => y !== k) : [...x, k]));
```

**Details and place appear only after a pick** (`src/app/(pupil)/symbols.tsx`, shortened):
```tsx
{picked.length > 0 && (
  <View style={styles.card}>
    <Text>{t('addDetails')}</Text>
    <TextInput multiline value={text} onChangeText={setText} placeholder={t('addDetailsHint')} />
    <Text>{t('whereOptional')}</Text>
    <Dropdown
      label={t('whereOptional')}
      placeholder={t('wherePlaceholder')}
      noneLabel={t('whereNone')}
      options={places}
      value={where}
      onChange={setWhere}
    />
  </View>
)}
<Button label={t('saveSymbols')} kind="primary" large disabled={picked.length === 0} onPress={save} />
```

**Save, pop-up, then home** (`src/app/(pupil)/symbols.tsx`):
```tsx
const save = () => {
  const whereLabel = places.find((p) => p.id === where)?.label;
  const flagged = update((d) => saveSymbols(d, me.id, { symbols: picked, where: where ?? undefined, whereLabel, text }, (s) => t(s)));
  setSaved({ adult: needsAdult(picked), flagged });
};
...
<SavedDialog
  visible={!!saved}
  message={saved?.adult ? t('symSent', { adult }) : t('thanksTelling')}
  extra={saved?.flagged ? t('thanksSafe') : undefined}
  onOk={() => { setSaved(null); router.back(); }}
/>
```

**The drop-down** (`src/components/Dropdown.tsx`, shortened). One field shows the current choice. Tapping it opens the list, and choosing an option closes it. The first option, "I'd rather not say", clears the choice so it always stays optional.
```tsx
<Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen(!open)}>
  <Text>{current?.label ?? placeholder}</Text>
  <Text>{open ? '▲' : '▼'}</Text>
</Pressable>
{open && [{ id: '', label: noneLabel }, ...options].map((o) => (
  <Pressable key={o.id || 'none'} accessibilityRole="radio" onPress={() => pick(o.id || null)}>…</Pressable>
))}
```

## Checks (browser, as Isla)

- With nothing picked, Save is greyed out and the details box is hidden.
- I picked "Too loud" and "Too crowded", added "Everyone pushes by the lockers", chose "Changeover · Main corridor" and tapped Save.
  - The pop-up showed "Saved / Thank you for telling us."
  - OK went to home.
  - One moment was saved with both symbols, the place and the details, plus one Sent post.
- I picked "Talk to an adult" with the fictional test note "I feel unsafe at lunch".
  - The pop-up showed "Sent. Ms Rivera will see it." and "A safe adult will check in with you."
  - A safeguarding flag was added.
- After the review changes:
  - The drop-down opened with "I'd rather not say", followed by today's classes and places.
  - Choosing "Lunch · Lunch hall" closed the list and showed the choice in the field.
  - Saving stored `where: 'lunch'`.
  - The check-in shows the "Rate one or more places…" line.
- The type check passes.
