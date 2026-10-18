# Step 3: Data, logic, strings, theme and storage

**Commit:** `2a8ab55`

## What changed

The data and logic from `index.html` were moved into TypeScript under `app/src/`. This step adds no screens, only a placeholder page that shows the demo data loaded.

- **New packages:** `expo-crypto` (PIN hashing) and `@react-native-async-storage/async-storage` (saving on the device). Both work in Expo Go.
- **`types/index.ts`:** every data shape. It covers pupils, staff, classes, places, check-ins, notes, Walk pins, profile, You said / We did and safeguarding flags. It also covers the new items: posts with Sent / Read / Follow-up, "was this helpful?", and pupil settings.
- **`data/vocab.ts` and `data/seed.ts`:** the fictional demo class. It has 12 pupils, 4 staff and 6 days of check-ins, with Isla's battery falling. Four seeded posts for Isla cover each status.
- **`domain/`:** PIN checking and lockout, the safeguarding scan, drift alerts, profile building, themes and check-in helpers.
- **`i18n/`:** interface strings, copied from `index.html` automatically. These are English only since Step 4.
- **`theme/`:** light and dark colour tokens.
- **`storage/`:** a store interface and an on-device implementation.
- **`stubs/ai.ts`:** a translation stub that returns the text unchanged.

**One change from the web version:** PINs use salted SHA-256 instead of PBKDF2, because Expo Go has no PBKDF2. A 4-digit PIN can be guessed whatever the hash, so real protection will come from server-side checks once Supabase is added.

## Key code

**Drift alert** (`src/domain/drift.ts`). Each check-in is smoothed with the one before, then drops are counted backwards from the latest. The alert needs at least 5 check-ins, 3 or more drops and a total fall of at least 0.6, so one bad day can't trigger it.
```ts
export function driftInfo(avgs: (number | null)[]) {
  const a = avgs.filter((v): v is number => v != null);
  if (a.length < 5) return null;
  const sm = a.slice(1).map((v, i) => (v + a[i]) / 2);
  let drops = 0, start = sm.length - 1;
  for (let i = sm.length - 1; i > 0; i--) {
    const diff = sm[i] - sm[i - 1];
    if (diff < -0.05) { drops++; start = i - 1; }
    else if (Math.abs(diff) <= 0.1) { start = i - 1; }
    else break;
  }
  if (drops < 3) return null;
  const from = a[start], to = a[a.length - 1];
  if (from - to < 0.6) return null;
  return { drops, from, to };
}
```

**Safeguarding scan** (`src/domain/safeguarding.ts`). It looks for concern words, including plural and "-ing" forms, and adds a flag for the safeguarding lead. It never decides anything; a person does.
```ts
export function scanConcern(text: string | undefined | null): string[] {
  if (!text) return [];
  const t = ' ' + text.toLowerCase().replace(/[^a-z\s'-]/g, ' ') + ' ';
  return CONCERN_WORDS.filter((w) => t.includes(' ' + w + ' ') || t.includes(' ' + w + 's ') || t.includes(' ' + w + 'ing '));
}

export function raiseFlag(db: Db, pupilId: string, source: string, text: string, at?: number): boolean {
  const words = scanConcern(text);
  if (!words.length) return false;
  if (db.flags.some((f) => f.pupilId === pupilId && f.text === text)) return true;
  db.flags.unshift({ id: uid('fl'), pupilId, source, text, words, at: at ?? Date.now(), status: 'open', checklist: {} });
  return true;
}
```

**Store interface** (`src/storage/index.ts`). Screens never talk to storage directly. The local store saves on the device, and a Supabase store can replace it later. On first launch, the demo data is built and saved.
```ts
export interface Store {
  load(): Promise<Db | null>;
  save(db: Db): Promise<void>;
  clear(): Promise<void>;
}

export async function loadOrSeed(store: Store = localStore): Promise<Db> {
  const saved = await store.load();
  if (saved && saved.version === 3) return saved;
  const db = await buildSeed();
  await store.save(db);
  return db;
}
```

**Seed builder: Isla's falling battery** (`src/data/seed.ts`). Ratings come from a fixed random generator, so the demo is the same each time. Isla follows a set downward path, and lunch and changeovers drain her more as days pass. Other pupils are nudged back up if they drift by chance.
```ts
const DRIFT = [4.4, 4.1, 3.6, 3.0, 2.4, 1.9];
days.forEach((date, i) => {
  const b = isDrift ? DRIFT[i] : baseOf[p.id] + (rnd() - 0.5) * 0.5;
  for (const s of SLOT_DEFS) {
    const eff = EFFECT[s.id] * (isDrift ? 0.6 + i * 0.12 : 1);
    ratings[s.id] = clamp(Math.round(b + eff + (rnd() - 0.5) * (isDrift ? 0.4 : 1.1)), 1, 5) as Rating;
  }
});
```

**Profile auto-build** (`src/domain/profile.ts`, excerpt). Places the pupil rates at 2.5 or lower on average go under "Drains me", and places at 4.2 or higher go under "Helps me". Symbols, Walk places, help answers and typed words are added too. Anything new after approval marks the profile as changed, so the pupil must approve again before staff see it.
```ts
if (a <= 2.5) want.push({ section: 'drains', text: s.place + ' at ' + s.name.toLowerCase(), src: 'ratings' });
else if (a >= 4.2) want.push({ section: 'helps', text: s.name + ' in ' + s.place, src: 'ratings' });
...
if (added && prof.approvedSnapshot) prof.dirty = true;
```

**PIN hashing** (`src/domain/auth.ts`). Each pupil has their own random salt. Only the hash is stored.
```ts
export async function hashSecret(secret: string, salt: string): Promise<string> {
  const h = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, salt + ':' + secret);
  return 'sha256$' + h;
}
```

## Checks

- The type check passes.
- In a browser, the placeholder showed "12 pupils, 72 check-ins, 4 posts, 1 flags", the same flag as in the web prototype.
