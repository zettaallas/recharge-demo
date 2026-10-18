# Recharge → Expo migration plan

Draft for review. Nothing here replaces `index.html` or the GitHub Pages site. The web prototype stays as it is until this app is ready and both editors agree.

## Decisions so far

- **Stack:** Expo (SDK current at setup), TypeScript (strict), Expo Router (file-based routes).
- **Location:** this `/app` subfolder on `ekin's-branch`. `index.html`, `main` and Pages stay untouched.
- **Order:** pupil side first. Staff side later.
- **Login:** same as now. Class code, then tap your name, then a 4-digit PIN. PINs are hashed, the account pauses after 5 wrong tries. The 20-minute auto-logout applies only when the device is marked as shared (asked at login, once per device; off by default, since secondary pupils mostly use their own phones).
- **AI:** no Claude API. Every AI feature calls a stub in `src/stubs/ai.ts` that returns a fixed or empty answer.
- **Storage:** on-device only for now, behind a `src/storage` interface so Supabase can replace it later without touching screens.
- **Data:** fictional seed data only, ported from `buildSeed()` in `index.html`.
- **Age range:** secondary, Years 7–9 (11–14). The demo class is 8B (code 8B-K4P). Pupils mostly use their own phones.

## Folder layout

```
app/
  src/app/                  Expo Router routes (SDK 58 default location)
    _layout.tsx             root: providers (session, i18n, theme)
    index.tsx               entry: Pupil / Staff / Family note
    (auth)/
      class-code.tsx
      pick-name.tsx
      pin.tsx
      register.tsx          optional personalisation (new)
    walkthrough.tsx         skippable walkthrough (new)
    (pupil)/
      _layout.tsx           guarded: needs a pupil session; TopBar + "I need a break"
      home.tsx
      check-in.tsx
      symbols.tsx
      walk.tsx              list of places + "Add a place" form on one screen
      profile.tsx
      feed.tsx              You said / We did
      zip.tsx               Zip editor
      posts/index.tsx       earlier posts (new)
      posts/[id].tsx        one post: status, read state, "was this helpful?" (new)
      settings.tsx          read indicator on/off, PIN on reopen (new)
  src/
    types/                  domain types (see below)
    data/seed.ts            fictional data (ported from buildSeed)
    storage/                Store interface + local implementation (Supabase later)
    domain/                 pure logic, no UI
      auth.ts               PIN hashing, lockout, class code lookup
      checkins.ts           slotsFor, slotLabel, pupilSeries, averages
      drift.ts              driftInfo (used by staff later)
      profile.ts            syncProfile, approveProfile
      themes.ts             themeOf, THEMES
      safeguarding.ts       scanConcern, raiseFlag
      posts.ts              statuses, read receipts, helpful feedback (new)
    components/             Battery, Zip, Hat, Icon, Sparkline, NotePanel, DrawPad,
                            PhotoPicker, VoicePicker, Dialog, TopBar, Why
    i18n/                   English strings in one file (other languages can be added back later)
    stubs/ai.ts             aiTranslate etc. return stub results
    theme/                  colour tokens incl. --zip-* and dark mode
```

## Feature map (existing)

| Recharge feature | Current code (`index.html`) | Screen(s) | TS modules |
|---|---|---|---|
| Login (class code → name → PIN) | `PupilLogin`, `CodeEntry`, `PinEntry`, PBKDF2 helpers | `(auth)/class-code`, `pick-name`, `pin` | `domain/auth.ts`, `types/Pupil` |
| Battery check-in (rate places and moments, 5-segment battery, notes: photo/draw/symbols/voice/type, "What would help?") | `CheckIn`, `Battery`, `NotePanel`, `PhotoPicker`, `VoicePicker`, `DrawPad`, `HELP_CHIPS` | `(pupil)/check-in` | `domain/checkins.ts`, `components/Battery`, `NotePanel`, `DrawPad`, `types/CheckIn`, `types/Note` |
| Symbol board (6 tiles, one tap) | `SymbolBoard`, `SYMBOLS` | `(pupil)/symbols` | `types/Symbol`, `domain/posts.ts` (each tap becomes a post) |
| Recharge Walk (photo + drains/recharges tag + caption → personal places) | `RechargeWalk`, `pins` | `(pupil)/walk` | `types/Pin`, `domain/checkins.ts` (pins become slots) |
| My Recharge Profile (auto-built, pupil hides/edits/approves, PDF) | `MyProfile`, `syncProfile`, `approveProfile`, `savePdf` | `(pupil)/profile` | `domain/profile.ts`, `types/Profile`; PDF via `expo-print` (later) |
| You said / We did feed | `Feed`, staff `YswdTab` | `(pupil)/feed` | `types/Yswd`, `domain/themes.ts` |
| Zip (colour and hat, charge only, no face) | `Zip`, `Hat`, `BuddyEditor`, `ZIP_COLOURS`, `HATS` | `(pupil)/zip`, shown on `home` | `components/Zip`, `types/Buddy` |
| "I need a break" | `TopBar` | in `(pupil)/_layout` | `domain/posts.ts` (kind `break`) |
| Safeguarding scan | `scanConcern`, `raiseFlag` | runs on every send | `domain/safeguarding.ts` |
| AI translate / summarise | `aiTranslate`, `useCap` | n/a | `stubs/ai.ts` only |
| Family note (parent with child's PIN) | `ParentNote` | later | later |
| Staff app (overview, drift, themes, safeguarding, class) | `StaffApp` and tabs | later | `domain/drift.ts` already shared |

## New items

| Item | Where | Notes |
|---|---|---|
| Post statuses **Sent / Read / Follow-up** | `posts/index`, `posts/[id]`, badge on home | `type PostStatus = 'sent' \| 'read' \| 'followUp'`. Staff set Read and Follow-up later. For now, seed data and a dev toggle simulate them. |
| Read indicator the pupil can switch off | `settings.tsx` | `settings.showReadReceipts: boolean`. When off, the pupil sees only "Sent". Staff behaviour doesn't change. |
| "Was this helpful?" | on a You said / We did item and on a Follow-up post | `type Helpful = 'yes' \| 'notReally' \| 'skip'`, stored per item, optional, one tap. |
| Earlier posts | `posts/index` | Lists the pupil's own past check-in notes, symbols, breaks and walk pins with their status. The pupil can share, unshare or keep each one private (journal). |
| Optional personalisation at registration | `(auth)/register` after first PIN login | Preferred name, Zip colour and hat, "is this a shared device?", and optional "things that help me" chips. Every field is skippable and editable later in settings. |
| Skippable walkthrough | `walkthrough.tsx` | 3–4 cards: battery, symbols, who sees what (incl. the safeguarding exception), statuses. "Skip" on every card. It's shown once after registration and can be replayed from settings. |

## Core types (sketch)

```ts
type Pupil   = { id; classId; name; keyAdultId; buddy: Buddy; settings: PupilSettings; pinHash; salt; failed; locked };
type CheckIn = { id; pupilId; date; ratings: Record<SlotId, 1|2|3|4|5>; notes: Record<SlotId, Note> };
type Note    = { symbols: SymbolKey[]; help: { chips: string[]; text: string }; photo?; drawing?; voice? };
type Post    = { id; pupilId; kind: 'note'|'symbol'|'break'|'pin'; refId; sharedWith: 'keyAdult'|'private';
                 status: PostStatus; readAt?; helpful?: Helpful; at };
type Pin     = { id; pupilId; photo?; emoji; tag: 'drains'|'recharges'; caption; at };
```

## Steps (each one proposed and approved before it starts)

1. This plan. ← current
2. Scaffold Expo + TS + Router in `/app` (`create-expo-app`, blank TS template). Nothing outside `/app` changes.
3. Port `types/`, `data/seed.ts`, `i18n/`, `theme/` and the `storage` interface.
4. Login flow (class code → name → PIN) with lockout.
5. Home, Zip, Battery check-in.
6. Symbols, "I need a break", Recharge Walk.
7. Profile, You said / We did.
8. New items: posts and statuses, read toggle, helpful, registration, walkthrough.
9. Staff side (later), Supabase (later).

## Before merging anywhere

- Update `CLAUDE.md` and README. They currently say `index.html` is the only file to edit.
- Agree with zettaallas how the Expo app and the Pages prototype live side by side.
