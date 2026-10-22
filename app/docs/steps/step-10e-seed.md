# Step 10e: Fictional demo seed for Supabase

**Commit:** not committed yet. **Not run.** eko approves running it.

## Before this step (read-only checks)

- `npx supabase migration list`: all three migrations (10a, 10b, 10d) are applied on Supabase.
- `npx supabase functions list`: `pupil-login` and `class-roster` are deployed with `verify_jwt: false`, and `set-pupil-pin` with `verify_jwt: true`. All three are ACTIVE.
- Step 10d was already committed by eko as `4eda023`.

## What changed

- **`app/supabase/seed/demo-data.mjs`** builds the rows for the demo school, with **no network and no keys**. It's the same fictional class the app seeds on a device:
  - **School:** "Recharge Demo School (fictional)", with class **8B** (code `8B-K4P`) and its 8 places of the day.
  - **Staff:** Ms Rivera (class teacher), Mr Adeyemi (SENCO), Mrs Hughes (key adult) and Ms Shah (DSL), each with the three default quick replies.
  - **Pupils:** 13 fictional pupils, including **Noor H.**, who hasn't registered yet.
  - **Check-ins:** 6 school days of check-ins (Isla's battery falls), 18 notes, and Isla's 2 Walk places.
  - **Posts and requests:** Isla's 4 posts (Follow-up, Read, Sent, and one kept **private**) and 3 requests.
  - **Profile:** Isla's approved profile, which does **not** include her private note.
  - **Class and staff items:** 2 You said / We did posts, Jayden's safeguarding flag, and 2 notes from home (only Dev agreed to share).
- **`app/supabase/seed/seed-demo.mjs`** sends those rows to Supabase:
  - It creates the four **staff sign-in users**.
  - It inserts the rows in order.
  - It stores **PIN hashes** with the same PBKDF2 code the sign-in function uses (`functions/_shared/pin.ts`).
  - It prints the staff logins **once**.

## Why a local script (and how the key stays safe)

Seeding needs the **service-role key**, which can create sign-in users and write PIN hashes. I chose **a local script that reads the key from an environment variable you set in your terminal for one command**:

- **The key never goes into** the app, git, a file in the repo, `.env.local` or the chat. The script only reads `process.env.SUPABASE_SERVICE_ROLE_KEY`. The command **asks** for the key at a prompt (so it never lands in PowerShell's history file) and removes it straight after.
- **Why not a one-off server function?** It would sit on the internet guarded by another secret, and you'd have to remember to delete it. A local script runs once on your laptop and leaves nothing behind.

**Passwords and PINs:**
- **Staff:** each account gets a **random password, printed once** in your terminal and not saved anywhere. Copy them when they appear. To choose one yourself, set `STAFF_PASSWORD` for that command.
- **Pupils:** every pupil gets the app's fictional demo PIN, **1234**. You can change it with `PUPIL_PIN`.
- **Trade-off:** anyone who knows the class code could sign in as a demo pupil. That's fine for fictional data. For a real school, staff would issue PINs through Class & PINs (`set-pupil-pin`).

**Safe to re-run:**
- If the demo school already exists, it **stops and changes nothing**.
- `--reset` deletes **only** the demo school, which takes its rows with it, plus the four demo staff accounts and the pupils' hidden sign-in users. Then it seeds again, so nothing is ever duplicated.
- It never touches any other school or user.

## Key code

**It only runs once unless you ask for a rebuild** (`seed-demo.mjs`):
```js
const existing = must(await admin.from('schools').select('id').eq('name', DEMO_SCHOOL_NAME), 'find demo school');
if (existing.length && !RESET) {
  console.log(`"${DEMO_SCHOOL_NAME}" already exists. Nothing changed. Run with --reset to rebuild it.`);
  process.exit(0);
}
```

**Reset touches only demo sign-in users** (`seed-demo.mjs`):
```js
const isDemoAuthUser = (u) =>
  DEMO_STAFF.some((s) => s.email === u.email) || /^pupil-[0-9a-f-]{36}@pupils\.recharge\.invalid$/.test(u.email ?? '');
```

**Staff sign-in users, with passwords shown once** (`seed-demo.mjs`):
```js
const password = () => process.env.STAFF_PASSWORD || randomBytes(9).toString('base64url');
...
const user = must(await admin.auth.admin.createUser({ email: s.email, password: pw, email_confirm: true, app_metadata: { kind: 'staff' } }), 'create ' + s.email);
```

**PIN hashes use the same code as sign-in** (`seed-demo.mjs`):
```js
import { hashPin, newSalt } from '../functions/_shared/pin.ts';
...
secrets.push({ pupil_id: p.id, pin_hash: await hashPin(PIN, salt), salt, failed: 0, locked: false });
```

**Isla's battery falls and nobody else's does,** using the same drift rule as the app (`demo-data.mjs`):
```js
const DRIFT = [4.4, 4.1, 3.6, 3.0, 2.4, 1.9];
...
if (!isDrift)
  for (let g = 0; g < 4 && drifting(series.map((c) => avg(Object.values(c._r)))); g++)
    for (const k of Object.keys(series[5]._r)) series[5]._r[k] = clamp(series[5]._r[k] + 1, 1, 5);
```

**The private note stays private:** the post is `private`, and the profile is built without it (`demo-data.mjs`):
```js
{ pupil_id: idOf.isla, kind: 'note', ref_id: i5.id + ':lunch', summary: 'I sat in the toilets at lunch because the hall was too much', shared_with: 'private', status: 'sent', ... },
```

## Checks (local only)

- **Dry run** (`--dry-run`, no key, no network) builds:

  | Table | Rows |
  |---|---|
  | schools | 1 |
  | staff | 4 |
  | quick_replies | 12 |
  | classes | 1 |
  | slots | 8 |
  | pupils | 13 |
  | checkins | 72 |
  | checkin_ratings | 580 |
  | notes | 18 |
  | walk_places | 2 |
  | moments | 3 |
  | posts | 4 |
  | profiles | 1 |
  | profile_items | 10 |
  | profile_snapshots | 1 |
  | feed_posts | 2 |
  | flags | 1 |
  | parent_notes | 2 |
  | pupil_secrets | 13 |
- **PGlite, with all three migrations:** every generated row inserted **without a single constraint error**. **10/10 access checks pass on the seeded data**:
  - Ms Rivera sees Isla's 3 shared posts, not the private one.
  - Isla's own session sees all 4 of her posts.
  - The class heatmap returns 52 cells (8 places × 6 days, plus 2 Walk places × 2 days).
  - The DSL sees Jayden's flag.
  - The SENCO sees Isla's approved profile.
  - Themes return 15 answers while Isla's note is private, and 16 once it's shared. That proves the private note is left out.
  - Mrs Hughes sees Dev's note from home (he agreed) and not Isla's.
  - The demo PIN verifies against the stored hash.

**Only testable on Supabase:** creating the real staff sign-in users, the inserts through the API, and then logging in.

## Commands (from `app`)

1. **Optional preview:** this sends nothing.
   ```
   node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON supabase/seed/seed-demo.mjs --dry-run
   ```
2. **Get the key:** in the Supabase dashboard, go to **Project Settings → API Keys** and copy the **service_role** (secret) key.
3. **Seed, in PowerShell.** It **asks** for the key, so the key is never saved in PowerShell's history file. The key exists only for this one command, then it's removed:
   ```
   $env:SUPABASE_SERVICE_ROLE_KEY = Read-Host 'Paste the service_role key'; node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON supabase/seed/seed-demo.mjs; Remove-Item Env:SUPABASE_SERVICE_ROLE_KEY
   ```
4. **Copy the four staff passwords it prints.** They're shown only once.
5. **To rebuild later,** add `--reset` to the same command.

**Never paste the service-role key into the chat, a file or the app.**
