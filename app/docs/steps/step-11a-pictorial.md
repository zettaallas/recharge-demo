# Step 11a: Less text, more pictures (pupil side)

**Commit:** not committed yet. eko approves the commit.

Feedback from educators: "less text, more pictorial". This step changes the **pupil screens only**. Staff screens stay as they were (laptop-first, text is fine there), except that they now show the pictures a pupil picked.

Screenshots (phone width, demo pupil Isla M., local mode):
- before: `app/docs/steps/img/11a/before/`
- after: `app/docs/steps/img/11a/after/` (same file names, plus `06b-talk-picked`, `09b-responses-sent` and `11-staff-requests`)

## What changed, screen by screen

| Screen | Before | After |
|---|---|---|
| **Home** | Long button titles, two-line descriptions, a privacy sentence | Short titles ("Share", "My profile", "Talk to my teacher", "Replies"), bigger icons, privacy sentence behind an **ⓘ** button |
| **Share** | "How would you like to share?" | "Share your way", 2-word descriptions |
| **Check-in** | Two lines of instructions | Date only; the instructions sit behind **ⓘ**. "Add more" has a **+** icon |
| **Check-in → Add more** | 6 symbols, text chips for "What would help?" | 10 place pictures; "What helps?" chips are now picture tiles; the words box is behind **Add words**. Symbols and "What helps?" come first, then Photo and Type |
| **Symbol board** | 6 symbols, details box shown as soon as you pick one | **24 pictures in 4 groups**: Feelings, Body, Around me, I need. "Where?" stays; words are behind **Add words** |
| **Talk to my teacher** | One text box ("What is it about?") | Optional **About?** pictures (Friends, Work, Home, Worried, Unwell, Something happened, Just talk). "Where?" stays. Words behind **Add words**. **Send works with nothing picked** |
| **Recharge Walk** | Intro paragraph, caption chips, a caption text box | Intro behind **ⓘ**; caption chips are picture tiles; words behind **Add words** |
| **My profile** | Long banners, an always-open text box | Short banners, eye icons on Hide/Show, the words box behind **Add words** |
| **Replies** | Text-only tabs, an intro line | Tabs with icons (Replies, Sent, School changes); intro behind **ⓘ**. Sent posts show their pictures |
| **Make it yours** (first login) | Text chips, long hints | "What helps me" as picture tiles, the hint behind **ⓘ** |
| **Walkthrough** | Long paragraphs | One short sentence per card |
| **Staff → Requests** and check-in notes | Symbols as words only | Each symbol or topic shows as **picture + word** |

Every button and choice has **a picture and a word**. The word stays because picture + word together help understanding for SEND pupils, and screen readers read the word.

## Is any text still required?

No. I checked every pupil screen:

- **Talk request:** sends with no words, no pictures and no place.
- **Symbol board:** needs at least one picture (that is the message); words and place are optional.
- **Check-in:** needs at least one battery rating (that is the check-in); notes are optional.
- **Recharge Walk:** needs "Drains me" or "Recharges me"; photo, picture, caption chip and words are all optional. *Change:* before, an empty caption was silently filled with "It's quiet", even for a place that drains you. Now it uses the pupil's own choice ("Drains me" / "Recharges me").
- **Profile own words, first-login name:** optional, as before.

## The new pictures

All 22 new icons were **drawn for Recharge** in the same style as the existing ones: a 24×24 line drawing, 2px stroke, no fill. The feelings all use the same face outline so they read as one set. No outside symbol set was used, so there is no licence to check. I did **not** use ARASAAC (CC BY-NC-SA) or Widgit/PCS. The older icons came over from the web prototype (`index.html`), which doesn't record where they came from.

```ts
// app/src/components/icons.ts
"faceWorried": "<circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"M7.5 8.5 10 7.5M16.5 8.5 14 7.5\"/>...",
"toilet": "<path d=\"M6 3h5v7H6z\"/><path d=\"M4 10h16a6 6 0 0 1-6 6h-4a6 6 0 0 1-6-6z\"/>...",
```

**The groups** live in one place, so adding a symbol later is one line:

```ts
// app/src/data/vocab.ts
export const SYMBOL_GROUPS = [
  { key: 'grpFeelings', icon: 'faceHappy', symbols: ['happy', 'calm', 'feelsSafe', 'sad', 'worried', 'angry', 'confused', 'tired', 'overwhelmed'] },
  { key: 'grpBody',     icon: 'user',      symbols: ['hungry', 'thirsty', 'unwell', 'toilet'] },
  { key: 'grpAround',   icon: 'pin',       symbols: ['tooLoud', 'tooBright', 'tooCrowded', 'tooHot', 'tooCold', 'strongSmell'] },
  { key: 'grpNeeds',    icon: 'hand',      symbols: ['needQuiet', 'needHelp', 'needMove', 'needBreakSym', 'talkAdult'] },
];
```

**Battery:** I left the battery as it is. It is already a picture, and putting a face on each level would turn it into a "choose a face" feelings scale, which the design avoids on purpose (pupils rate places, not feelings, to get past masking).

## New building blocks

**"Add words"**: a small button that opens the text box only if the pupil wants it (`app/src/components/ui.tsx`):

```tsx
export function OptionalWords({ value, onChange, label }) {
  const [open, setOpen] = useState(!!value);
  if (!open) return <Button icon="keyboard" label={t('addWords')} onPress={() => setOpen(true)} />;
  return <TextInput autoFocus value={value} onChangeText={onChange} accessibilityLabel={label} />;
}
```

**ⓘ button** (`InfoTip`): longer explanations stay hidden until tapped.

**Picture tiles** (`app/src/components/Pictos.tsx`): one tile style for the symbol board, talk topics, "What helps?" and Walk captions. Tiles are at least 88pt tall (well over the 44pt minimum tap size), with a tick when picked. Any number can be picked, and tapping again unpicks.

## Data: no database change needed

- New symbols are saved **by name** in the existing `symbols` list, and the database has no rule limiting what names can go there. So there's **no new migration**.
- Talk topics are saved in the same `symbols` list on the talk request. When the app reads them back it calls them `topics`:

```ts
// app/src/storage/supabaseMap.ts (reading)
...(m.symbols?.length ? (m.kind === 'talk' ? { topics: m.symbols } : { symbols: m.symbols, symbol: m.symbols[0] }) : {}),
// app/src/storage/writes.ts (saving)
symbols: m.kind === 'talk' ? m.topics ?? [] : m.symbols ?? (m.symbol ? [m.symbol] : []),
```

This works the same in local mode and Supabase mode.

**Small rule changes:**
- **"Help"** (I need → Help) now counts as asking an adult, like "Talk to an adult" and "Break". The pupil is told their key adult will see it.
- In check-in notes, **Too hot**, **Too cold** and **Smells** add to "Drains me" in the profile, and **Calm** adds "Places where I feel calm" to "Helps me". Feelings like "Worried" never go into the profile automatically: the pupil can add those in their own words.

## Also fixed

- A development warning ("React does not recognize `importantForAccessibility`"). It showed as a red box at the bottom of the web version (see the before screenshots). Icons now use `aria-hidden` on the web and the native setting on phones. A second warning about `accessible` comes from the Zip drawing. It was there before this step and I left it.

## Testing

- **Type check** (`npx tsc --noEmit`): passes. The project has no automated tests yet, so there was nothing else to run.
- **Clicked through in the browser, local mode, as Isla:** home, share, check-in with "Add more", the symbol board (picked Too loud), talk (picked Friends, sent with no words), Walk (adding a place), profile, replies (Sent tab shows the Friends picture), first-login setup.
- **Staff:** logged in as Ms Rivera and opened Requests. The new talk request shows a **Friends** picture chip above "I'd like to talk · Friends".
- **Not tested yet:** Supabase mode on a phone. Saving uses the same columns as before, so no database change is needed, but it's worth one talk request with a topic on the phone to confirm.
