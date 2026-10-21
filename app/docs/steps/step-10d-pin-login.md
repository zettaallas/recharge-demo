# Step 10d: Pupil PIN sign-in on the server

**Commit:** not committed yet. **Not deployed.** eko approves deploy and commit separately.

## What changed

- **Three Edge Functions** in `app/supabase/functions/` (they run on Supabase, not in the app):
  - **`pupil-login`:** class code + pupil + 4-digit PIN → a session for **that one pupil**.
    - The PIN is checked against `pupil_secrets` on the server.
    - **The 5-try lockout is enforced on the server.** A wrong PIN adds 1 to the count, the 5th locks the account, and a right PIN resets it.
    - **The same "That didn't match" reply** comes back for a wrong class, wrong pupil or wrong PIN. It also takes the same time (a dummy hash is computed), so nobody can probe which part was wrong.
    - A locked account gets "Your account is paused. Ask your teacher to reset your PIN."
  - **`class-roster`:** class code → the names for "Tap your name" (first name + initial, avatar colour, paused or not). It's needed before anyone is signed in, and returns nothing extra.
  - **`set-pupil-pin`:** new PINs for "Class & PINs".
    - **Only the pupil's class teacher, or the SENCO of the same school**, can use it, the same rule as the app.
    - It makes a random PIN, stores only its hash, clears the lockout, and returns the PIN **once** for the card.
- **Shared code** (`functions/_shared/`): `pin.ts` for hashing, verifying, random PINs and the lockout rule, and `http.ts` for CORS, JSON replies and class-code tidying.
- **New migration** `20261021190000_pupil_session.sql`, a new file that leaves the applied 10b file untouched:
  - `pupil_secrets.auth_user_id` links each pupil to their sign-in user.
  - `current_pupil_id()` now reads `pupil_id` from the token's **`app_metadata`**. It still accepts a top-level `pupil_id` claim.
- **App:**
  - **New packages:** `@supabase/supabase-js` **2.117.3** (pinned) and `react-native-url-polyfill` **4.0.0**.
  - **New file `src/lib/supabase.ts`:** the client, which reads `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` from `.env.local`, plus `pupilLogin()`, `classRoster()` and `setPupilPins()`.
  - **No screen uses them yet.** The login screen switches over in the store-swap step.
  - `tsconfig.json` now skips `supabase/functions` (that's Deno code, checked with Deno instead).

## Choices and trade-offs

**Hashing: PBKDF2-SHA256, 600,000 iterations, a random 16-byte salt per pupil.** Now that the check runs on the server, we can afford a slow hash (about 0.2 s per check). That's the OWASP 2023 figure for PBKDF2-SHA256. Hashes are stored as `pbkdf2$600000$…`, so the count can be raised later without breaking existing PINs. The old on-device SHA-256 hashes are **never** accepted. The demo PINs will be created fresh by the seed step.

**Sessions: one hidden sign-in user per pupil ("shadow user"), with `pupil_id` in `app_metadata`.**
- **Why:** it works whichever way this Supabase project signs its tokens, whether with the newer signing keys or the legacy JWT secret. So we don't need to read the project's JWT secret or put it anywhere.
- **Why app_metadata:** only the server can set it, so a pupil can never change it. `user_metadata` is editable by the user and is deliberately **not** used.
- **How:** after a right PIN, the function gives the pupil's shadow user (`pupil-<id>@pupils.recharge.invalid`, never a real email) a new random 32-byte password and signs in with it. The password is never stored or sent to the app; the app only gets the session.
- **Trade-off:** each pupil gets an entry in Supabase Auth's user list. It's harmless, but visible to admins.

**Session length:** this follows the project's token setting, which by default is **1 hour** with automatic refresh. Shared devices still log out after 20 minutes in the app, and "Ask for my PIN" still applies. If you want it shorter, lower **JWT expiry** in the dashboard (Authentication → Sessions/JWT). Suggested for schools: **30 minutes**. This is a project setting, not code.

## Key code

**Hash and verify** (`functions/_shared/pin.ts`). There's a constant-time comparison, and unknown formats are never accepted.
```ts
export async function hashPin(pin: string, salt: string, iterations = ITERATIONS): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: fromB64(salt), iterations }, key, 256);
  return `pbkdf2$${iterations}$${toB64(bits)}`;
}
export async function verifyPin(pin: string, salt: string, stored: string): Promise<boolean> {
  const m = /^pbkdf2\$(\d+)\$/.exec(stored);
  if (!m) return false;
  return sameString(await hashPin(pin, salt, Number(m[1])), stored);
}
```

**The lockout rule** (`functions/_shared/pin.ts`):
```ts
export function afterAttempt(state: SecretState, correct: boolean): SecretState & { ok: boolean } {
  if (state.locked) return { ...state, ok: false };
  if (correct) return { failed: 0, locked: false, ok: true };
  const failed = state.failed + 1;
  return { failed, locked: failed >= MAX_TRIES, ok: false };
}
```

**One reply for every wrong detail, in the same time** (`functions/pupil-login/index.ts`):
```ts
if (!pupil || !secret) {
  await hashPin(pin, newSalt()); // same time as a real check
  return json(INVALID, 401);
}
if (secret.locked) return json(LOCKED, 423);
const correct = await verifyPin(pin, secret.salt, secret.pin_hash);
const next = afterAttempt({ failed: secret.failed, locked: secret.locked }, correct);
await admin.from('pupil_secrets').update({ failed: next.failed, locked: next.locked, ... }).eq('pupil_id', pupilId);
```

**The pupil's session** (`functions/pupil-login/index.ts`). The shadow user carries `pupil_id` in `app_metadata`, and a fresh random password is used once to sign in.
```ts
const meta = { app_metadata: { pupil_id: pupilId, kind: 'pupil' } };
// existing user: new random password; first time: create it (email_confirm, no email is ever sent)
const { data: signed } = await anon.auth.signInWithPassword({ email, password });
return json({ pupil: { id: pupil.id, name: pupil.name }, session: { access_token, refresh_token, expires_at } });
```

**The access rules read it** (`migrations/20261021190000_pupil_session.sql`):
```sql
create or replace function public.current_pupil_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select p.id from public.pupils p
  where p.id = nullif(coalesce(auth.jwt() -> 'app_metadata' ->> 'pupil_id', auth.jwt() ->> 'pupil_id'), '')::uuid
$$;
```

**Only the class teacher or the SENCO can set PINs** (`functions/set-pupil-pin/index.ts`):
```ts
const allowed =
  cls.school_id === staff.school_id && (staff.role === 'senco' || (staff.role === 'class_teacher' && cls.teacher_id === staff.id));
if (!allowed) continue; // skip, rather than reveal anything about pupils this person can't manage
```

**The app helper** (`src/lib/supabase.ts`, not used by a screen yet):
```ts
export async function pupilLogin(classCode: string, pupilId: string, pin: string): Promise<PupilLoginResult> {
  const { data, error } = await supabase.functions.invoke('pupil-login', { body: { classCode, pupilId, pin } });
  ...
  await supabase.auth.setSession({ access_token: data.session.access_token, refresh_token: data.session.refresh_token });
  return { ok: true, pupil: data.pupil };
}
```

## Checks (local, nothing deployed)

- **PIN logic, 14/14 pass** (Node, using the exact `pin.ts` file):
  - Hash format, right and wrong PIN, different salts give different hashes, the old SHA-256 format is refused.
  - Wrong tries 1–4 don't lock and the 5th locks; when locked even the right PIN is refused; a right PIN resets the count.
  - Random PINs are 4 digits and well spread.
  - One hash takes about 190 ms.
- **Deno type check** of all three functions: passes (throwaway Deno 2.9.6 in the scratchpad).
- **Access rules + new migration, 41/41 pass** (PGlite):
  - A session with `app_metadata.pupil_id` sees the pupil's own posts.
  - `pupil_id` in `user_metadata` is **ignored**.
  - `pupil_secrets` (with the new column) is still unreadable.
- **App type check:** passes.

**Can only be tested after deploy:** the real round trip, meaning class code → roster → PIN → session → reading data with that session. That covers shadow-user creation, the CORS headers from the web build, and `set-pupil-pin` with a real staff login. There's also nothing to log in with until the seed step adds fictional pupils and staff.

## How to deploy (when you're happy with it)

From `app`:
```
npx supabase db push
npx supabase functions deploy pupil-login --no-verify-jwt
npx supabase functions deploy class-roster --no-verify-jwt
npx supabase functions deploy set-pupil-pin
```
- `db push` applies the new migration.
- **`--no-verify-jwt` on the first two:** they're called before anyone is signed in. The anon key can be a non-JWT "publishable" key on newer projects, which the gateway check would reject. `set-pupil-pin` keeps the gateway check and also checks the staff login itself.
- **No extra secrets needed.** Supabase gives every function `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` automatically. The service-role key stays on Supabase; it's never in the app or in git.
- **Dashboard check:** Authentication → Providers → **Email** must stay enabled, because the shadow users use it. **"Confirm email" doesn't matter**, because the function confirms them itself and no emails are sent.
