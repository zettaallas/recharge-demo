# Step 10f: The store swap (the app uses the shared database)

**Part 1 (logins and reading) and Part 2 (saving): both done, not committed.**
Part 2 is further down: [Part 2: saving](#part-2-saving-to-the-shared-database).

## What changes for you, in plain words

Until now, every phone or laptop kept **its own copy** of the data. Now the app can use **one shared copy** in Supabase, so a pupil's phone and a teacher's laptop see the same things.

- **Two modes, chosen automatically:**
  - **Shared mode:** used when `app/.env.local` has the Supabase address and public key, which yours does. Everyone uses the same data.
  - **On-device mode:** the old demo, used if those settings are missing. It still works offline, and it's still where **"Reset demo"** lives. In shared mode "Reset demo" is hidden, because the shared database is never wiped from the app.
- **Pupil login looks exactly the same.** Type the class code, tap your name, enter your PIN. Behind the scenes:
  - the names come from the server, from the class code
  - the PIN is checked **on the server**, and the 5-try pause happens there
  - the phone then gets a sign-in session for that one pupil
- **Staff login** uses email and password, checked by Supabase. In shared mode, tapping a demo account fills in its email, then you type the password that was printed when the demo was set up.
- **What each person sees** comes from the server's access rules (Step 10b). For example:
  - Ms Rivera's heatmap and "Most asked for" come from **class summaries** (averages and anonymous answers), not from individual check-ins.
  - A pupil only ever downloads their own data.
- **Kept working:** shared-device auto-logout, **Hide**, and **"Ask for my PIN when I reopen the app"**. Logging out also ends the server session.
- **Fresh data:**
  - **pull down** on any screen to refresh
  - the app also refreshes when you come back to it
  - "See my teacher's response" and staff **Requests** refresh every time they open
- **If school can't be reached:** a calm yellow note says "Can't reach school right now…". You can keep looking, and pulling down tries again.

**Walk photos stay on the device** for now; sharing photos needs private file storage, a later step. (Saving everything else: Part 2 below.)

## Key code

**Choosing the mode** (`src/state/AppContext.tsx`). If the Supabase settings are there, use the shared database.
```ts
export const DATA_MODE: DataMode = supabaseConfigured ? 'supabase' : 'local';
```

**Who is signed in.** Pupils carry their pupil id in `app_metadata`, which only the server can set. Staff don't.
```ts
function sessionFromAuth(user) {
  const pupilId = user.app_metadata?.pupil_id;
  return typeof pupilId === 'string' ? { kind: 'pupil', id: pupilId, last: Date.now() } : { kind: 'staff', id: user.id, last: Date.now() };
}
```

**Pupil sign-in.** The server checks the PIN, then the app loads only what that pupil may see.
```ts
const pupilSignIn = async (classCode, pupilId, pin) => {
  const res = await pupilLogin(classCode, pupilId, pin); // server: pupil-login
  if (!res.ok) return res;                               // "That didn't match" / "Your account is paused"
  ...
  if (!(await loadRemote(s))) return { ok: false, reason: 'server', message: "Can't reach school right now. Check the internet and try again." };
  logIn(pupilId);
  return res;
};
```

**Reading:** every table is read with the signed-in person's own session, so the access rules decide what comes back. The service key is never in the app.
```ts
const results = await Promise.all(REMOTE_TABLES.map((t) => supabase.from(t).select('*').range(0, 9999)));
...
return rowsToDb(rows);
```

**Turning database rows into the app's data shape** (`src/storage/supabaseMap.ts`). The screens didn't need to change. Example: a pupil can't read other staff rows, so "You said, we did" shows "School" as the author instead.
```ts
by: staffName(f.by_staff_id) ?? 'School',
```

**The class teacher's heatmap uses the class summary** (`overview.tsx` and `Heatmap.tsx`):
```tsx
<Heatmap db={db} classId={cls.id} pupilIds={ids} cells={mode === 'supabase' && !filter ? summaries[cls.id]?.heatmap : undefined} />
```

**Pull to refresh and the offline note** (`src/components/ui.tsx`, used by every screen):
```tsx
{mode === 'supabase' && offline && !!session && (
  <Banner kind="warn">Can't reach school right now. You can keep looking; pull down to try again.</Banner>
)}
...
refreshControl={mode === 'supabase' && session ? <RefreshControl refreshing={pulling} onRefresh={onRefresh} /> : undefined}
```

## Checks

- **Type check:** passes.
- **Mapping tests, 18/18 pass.** These feed the seed's fictional rows into the mapper:
  - 13 pupils, 4 staff, Isla's 6 check-ins with 10 places each.
  - Notes keep their words, and posts keep their status and privacy.
  - "Replied by Ms Rivera" and the reply time are kept.
  - Isla's approved profile, the feed authors, and Noor not registered.
  - **No PIN data ever reaches the app.**
  - In a pupil's view, the feed author falls back to "School".
- **Browser, on-device mode** (built without the Supabase settings):
  - Pupil login (a wrong PIN showed "4 tries left", then 1234 opened "Hi Isla") works as before.
  - Staff overview for Ms Rivera works as before.
- **Browser, shared mode, read-only** (nothing written):
  - The entry screen shows "Shared school database…" and no Reset demo.
  - Class code `8bk4p` reached the live `class-roster` function (status 200, browser access OK). It correctly said the class wasn't found, because the demo isn't seeded yet.
  - A staff login with a wrong password showed "That email and password do not match".
  - Your project uses Supabase's newer **publishable key**, which is why `pupil-login` and `class-roster` were deployed with `--no-verify-jwt`.

**Only testable on the real project after the seed:**
- signing in as Isla and Ms Rivera
- loading their real data
- the class summaries
- the "Ask for my PIN" sign-in again

## Tip

**After changing `app/.env.local`, restart Expo with a clean cache** (`npx expo start -c`). Otherwise it can keep using the old settings. I hit this while testing.

---

# Part 2: saving to the shared database

## What changes for you, in plain words

- **Everything you do is now saved for everyone.** For example, Isla sends "Ask to talk to my teacher" on her phone, and Ms Rivera sees it on her laptop. Ms Rivera replies, and Isla sees the reply, who sent it, and when.
- **It still feels instant.** The change shows straight away and is saved in the background.
- **Only what changed is sent.** If Isla turns on "Ask for my PIN", only that one setting goes to the server, not her whole profile.
- **The server still decides what's allowed.** Saves go out with the person's own sign-in, so the access rules from Step 10b apply to writing too. For example:
  - Mrs Hughes can't reply to Isla's post.
  - The SENCO can't answer Requests.
  - A teacher can't make a safeguarding flag.
  - A pupil's words can raise a flag that only the DSL can read. The pupil can't read it back.
- **If a save fails, nothing typed is lost.** A calm message says what happened ("Can't reach school right now, so that wasn't saved. Your words are still here…"). The screen stays where it was, with the words still in the box, so you can try again.
  - This covers: the check-in, symbols, talk request, Walk place, "In my words", registration, a teacher's reply, quick replies, and You said, we did.
  - Small taps (read, helpful, share or unshare, ticking a checklist) go back to how they were if the save fails, and the same message shows.
- **Saving a check-in again on the same day keeps the teacher's reply.** Before, re-saving replaced the note posts, so a reply on them could be lost. Now the same post is updated, and its reply and read status stay. (This also changes the on-device version, for the better.)
- **A record of who did what.** Sent, read, replied, shared, unshared and "helpful" are added to an audit trail (the `post_events` table). Rows there are only ever added, never changed.
- **Class & PINs in shared mode:**
  - New PINs are **made on the server** and shown once on the PIN cards. "Reset or unlock PIN" also unlocks a paused account.
  - Adding a pupil saves them first, then the server makes their PIN.
  - Creating a class saves the class and its places.
  - Tries and locks stay on the server, so the screen doesn't show them.
- **Photos, drawings and voice notes stay on the pupil's own device.** They are not uploaded to the server. The app remembers them on that device, so they still show after a refresh.

## Key code

**Comparing before and after** (`src/storage/writes.ts`). Each table says how the app's data looks as rows and which columns identify a row. Then three simple rules apply:
- a new row is **inserted**
- a changed row is **updated, only in the changed columns**
- a missing row is **deleted**
```ts
for (const [k, r] of now) {
  const o = old.get(k);
  if (!o) { added.push(spec.onInsert ? spec.onInsert(r, actor) : r); continue; }
  const values = /* only the columns that differ */;
  if (Object.keys(values).length) updates.push({ table: spec.table, op: 'update', match: pick(r), values });
}
```

**Columns the app doesn't carry are filled in from who is saving.** For example, a You said, we did post is signed by the teacher who posted it:
```ts
table: 'feed_posts', key: ['id'],
onInsert: (row, actor) => asStaff(row, actor, 'by_staff_id'),
```

**Sending the writes** (`src/storage/remote.ts`). They go in order, and stop at the first problem. Nothing asks for rows back, which is why a pupil can raise a flag they can't read. An update that changed 0 rows counts as "not allowed":
```ts
if (w.op === 'insert') res = await t.insert(w.rows);
else if (w.op === 'update') res = await t.update(w.values, { count: 'exact' }).match(w.match);
...
if (w.op === 'update' && res.count === 0) throw new SaveError(..., false);
```

**`save()` keeps what was typed** (`src/state/AppContext.tsx`). Screens wait for it, and only clear the box or move on when it worked:
```ts
// talk.tsx
const res = await save((d) => requestTalk(d, me.id, t('talkSummary'), { text, where, whereLabel }));
if (res.ok) setSaved({ flagged: res.value });   // if not: the words stay, the message shows
```
On failure, `save()` puts the screen back the way it was. Then it fetches what the server really has, in case part of it was saved:
```ts
if (dbRef.current === next) setData(prev);
if (s && !offlineNow) loadRemote(s);
```

**New ids are UUIDs** (`src/domain/util.ts`), so the shared database accepts them. On-device ids work the same as before.

**Keeping a teacher's reply when a check-in is saved again** (`src/domain/posts.ts`):
```ts
if (old) db.posts.unshift({ ...old, summary });   // same post, same reply, new words
else addPost(db, { ... });
```

## Checks (Part 2)

- **Type check:** passes.
- **Saving test, 37/37 pass.** This test uses the real app actions and the fictional demo data. The writes run against a local copy of the real database tables and access rules, signed in as each person, then the app reads them back. Nothing touched your Supabase project. It covers:
  - **Isla:**
    - Saves a check-in. Only new rows are added, and parents go before children.
    - Her photo is **not** sent to the server but still shows on her device.
    - Ms Rivera replies to her note. Isla saves the check-in again: updates only, nothing is deleted, and **the reply is kept**.
    - A talk request with a concern word saves. Isla can't read the flag; the DSL can.
    - Answers "Was this helpful?" and un-shares a note, after which Ms Rivera no longer sees it.
    - Changes a setting, and exactly one column is sent.
    - Approves her profile, and the SENCO sees the new version.
    - Answers a You said, we did post.
  - **Ms Rivera:**
    - Marks Isla's request read, then replies. Isla sees the reply, who sent it and when. The audit trail reads sent, read, replied.
    - Adds, moves and deletes quick replies. They come back in her new order, and Mrs Hughes' list is untouched.
    - Posts You said, we did, signed as herself.
    - Plans a check-in.
    - Creates class 8C with its 8 places, and adds a pupil. No PIN data is sent from the app.
  - **The server refuses:**
    - Mrs Hughes replying to Isla
    - the SENCO replying to Requests
    - a teacher adding a flag
  - **The DSL** ticks every step and closes a flag.
- **Earlier tests still pass:** mapping 18/18, access rules 41/41.
- **Browser, on-device mode:**
  - Isla signed in with 1234 and sent "Can we talk about lunch?". It saved, with UUID ids.
  - Ms Rivera saw it in Requests and replied. It saved as "Replied" by Ms Rivera.
- **Fixed on the way:** an empty Supabase line in `.env.local` crashed the app on start. Now it falls back to on-device mode.

## Limits, said plainly

- **Photos, drawings and voice notes** stay on the pupil's device and aren't shared with staff yet. That needs private file storage, a later step.
- **No live updates yet.** The other person sees a change when they open the screen, pull down, or come back to the app. Live updates (Supabase Realtime) can come later.
- **A flag can be raised twice** if a pupil saves the same words again later. Pupils can't read flags, so the app can't check for an earlier one. The DSL may see a duplicate. A server-side check can fix this later.
- **If a save half-works** (rare, for example the connection drops in the middle), the app reloads what the server has, so the screen matches the truth.
- **Found while testing, not changed yet:** the access rules let a pupil update **any** column of their own pupil row, through the API rather than the app. That includes their class or key adult. The app never does this, but a small extra rule should lock those columns down. I suggest a short migration as the next step.

## How to test it (phone and laptop together)

1. **Run the seed once** (Step 10e), from inside `app`. It asks for the service-role key without showing it, and never saves it:
   ```
   $env:SUPABASE_SERVICE_ROLE_KEY = Read-Host 'Paste the service_role key'; node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON supabase/seed/seed-demo.mjs; Remove-Item Env:SUPABASE_SERVICE_ROLE_KEY
   ```
   Copy the staff passwords it prints. They are shown only once.
2. **Start the app with a clean cache:** `npx expo start -c`
3. **Phone (Expo Go):** I'm a pupil → `8B-K4P` → Isla M. → `1234`.
4. **Laptop (press `w` for the browser):** I'm staff → tap Ms Rivera (Isla's key adult) → type her password.
5. **Send:** on the phone, "Ask to talk to my teacher" → write something → Send request.
6. **Reply:** on the laptop, open **Requests** (it refreshes when opened) and tap a quick reply or write one.
7. **Check it arrives:** on the phone, open "See my teacher's response" (or pull down). The reply shows with Ms Rivera's name and the time.

Also worth trying:
- a check-in on the phone, then the heatmap on the laptop
- You said, we did on the laptop, then the feed on the phone
- turning off wifi on the phone and sending something, to see the "Your words are still here" message

---

# Security follow-up: who may change which columns

**Commit:** `3b7f70a`. **Not applied yet.** New file: `supabase/migrations/20261021210000_column_limits.sql`.

## What changes, in plain words

The access rules from Step 10b decide **which rows** someone may change. They didn't decide **which columns**. So someone calling the database directly (not through the app) could do things the app never offers:
- a pupil could move themselves to another class or pick a new key adult
- a pupil could mark their own post "Replied by Ms Rivera"
- a teacher could switch on a pupil's "share notes from home" consent for them

This closes that gap. Nothing changes in the app: everything it saves still works.

| Who | May change | May not change |
|---|---|---|
| **Pupil**, own row | their settings and choices: Zip, preferred name, things that help, read receipts, Ask for my PIN, registered, walkthrough, **share notes from home** | name, class, key adult, attendance, avatar |
| **Class teacher / SENCO**, a pupil | name, avatar, class, key adult, attendance | the pupil's own settings and consent |
| **Pupil**, own posts | the words (summary), who it's shared with, "Was this helpful?" | read, reply, who replied; a new post always starts as just "Sent" |
| **Key adult**, a shared post | read, reply, reply time, who replied | the pupil's words, sharing, "helpful" |
| **Key adult**, a request | mark it seen | what it says |
| **Pupil**, own request | the details | "seen" |
| **Pupil**, raising a flag | a new flag starts open with nothing ticked | anything else |
| **DSL**, a flag | status and checklist | the words, the pupil |
| **Class teacher / SENCO**, a class | name, code, teacher | the school |

The seed script and the Edge Functions run as the server, so these limits don't apply to them.

## Key code

One small helper lists the columns that changed, and stops the save if any of them isn't allowed:
```sql
create or replace function public.only_these_columns(old_row jsonb, new_row jsonb, allowed text[], who text) returns void ...
  if cardinality(bad) > 0 then
    raise exception 'Recharge: % may not change %', who, array_to_string(bad, ', ') using errcode = '42501';
```
A trigger on each table uses it. For example, for pupils:
```sql
if public.current_pupil_id() is not null then
  perform public.only_these_columns(to_jsonb(old), to_jsonb(new), pupil_owned, 'a pupil');
elsif public.current_staff_id() is not null then
  perform public.only_these_columns(to_jsonb(old), to_jsonb(new),
    array['name', 'avatar', 'class_id', 'key_adult_id', 'attendance'], 'staff');
```
**Why triggers and not column permissions (GRANTs):** pupils and staff share one database role. GRANTs can't tell them apart; a trigger can.

## Checks

- **Saving test: 61/61 pass.** That's the 37 app saves from Part 2, all still working with the new rules, plus 24 new checks:
  - 18 things that must be refused, for example a pupil moving class, a pupil faking a reply, a key adult editing a pupil's words, the DSL rewriting a flag, or moving a class to another school
  - 5 things that must still work
  - 1 check that the server is not limited
- **The same new checks without the migration:** 9 of the "must be refused" ones went through. For example, a pupil moved class, picked a new key adult and faked a reply, and a teacher flipped a pupil's consent. The rest couldn't run cleanly, because by then Isla had already been moved to another class. So the gap was real, and this migration is what closes it.
- **Earlier tests still pass:** access rules 41/41, seed 10/10.

## How to apply it

From inside `app` (you're already linked to the project):
```
npx supabase db push
```
It applies only the new migration file. Then test the app as usual. Nothing in the app needs to change.
