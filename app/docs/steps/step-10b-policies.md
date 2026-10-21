# Step 10b: Supabase access rules (row-level security)

**Commit:** not committed yet. **Not run on Supabase yet.** eko reviews it first, then runs it.

## Before this step

- Step 10a's schema **is applied** on the Supabase project. `npx supabase migration list` (read-only) shows `20261021000000` both locally and remotely.
- Step 10a's files are still uncommitted.

## What changed

There is one new migration: `app/supabase/migrations/20261021120000_policies.sql`. It mirrors the app's rules in `src/domain/access.ts` and the project scope (each person sees the minimum they need).

| Who | Can see / do |
|---|---|
| **Pupil** | Only their own rows: check-ins, notes, posts (including private ones), Walk places, profile, "Was this helpful?" answers. They can raise a safeguarding flag about their own words but can't read flags back. |
| **Key adult** | Only **shared** posts, moments and notes of **their own** pupils. They can mark read and reply (as themselves). Private posts and notes never appear. They also see those pupils' ratings (drift), approved profile snapshots, and notes from home if the pupil agreed. **Only the key adult sees notes.** |
| **Class teacher** | Class-level only: class, slots, You said / We did, and the **heatmap** and **themes** through summary functions that return averages and anonymous answers. No individual rows, unless they are also a pupil's key adult. |
| **SENCO** | Ratings (drift) and approved profile snapshots for the school, **nothing else about pupils**: no check-in notes, no notes from home, no Requests. Can manage classes. *(eko's decision: "Remove notes".)* |
| **DSL** | **Flags only**: read and work them. The only pupil names they can see are those of pupils who have a flag. No posts, notes or ratings. |
| **Everyone** | `quick_replies`: each staff member manages only their own. `pupil_secrets`: **no policies at all**, so only the server can read it. `post_events`: **add only**, never edit or delete. |

**How the database knows who is calling:**
- **Staff** sign in with Supabase Auth, and their `staff.id` is `auth.uid()`.
- **Pupils:** the PIN sign-in (a later step, an Edge Function) will give a short session whose token carries a **`pupil_id` claim**, read with `auth.jwt() ->> 'pupil_id'`. **This is an assumption the PIN step must follow.** Staff tokens never have that claim.

## Key SQL

**Who is calling** (helper functions). `security definer` lets the rules look things up without the lookups themselves being blocked. The empty `search_path` stops anyone swapping in their own tables.
```sql
create or replace function public.current_staff_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select s.id from public.staff s where s.id = auth.uid()
$$;

create or replace function public.current_pupil_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select p.id from public.pupils p where p.id = nullif(auth.jwt() ->> 'pupil_id', '')::uuid
$$;
```

**Key adult is per pupil.** A class teacher who is a pupil's key adult gets key-adult access for that pupil only.
```sql
create or replace function public.is_key_adult_of(pupil uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.pupils p where p.id = pupil and p.key_adult_id = auth.uid()
                 and (select role from public.staff where id = auth.uid()) <> 'dsl')
$$;
```

**Posts: the pupil sees all their own, the key adult sees only shared ones,** and a reply can only be signed by the person sending it:
```sql
create policy posts_self on public.posts for all to authenticated
  using (pupil_id = public.current_pupil_id()) with check (pupil_id = public.current_pupil_id());
create policy posts_key_adult_read on public.posts for select to authenticated
  using (shared_with = 'keyAdult' and public.is_key_adult_of(pupil_id));
create policy posts_key_adult_reply on public.posts for update to authenticated
  using (shared_with = 'keyAdult' and public.is_key_adult_of(pupil_id))
  with check (shared_with = 'keyAdult' and public.is_key_adult_of(pupil_id)
              and (replied_by is null or replied_by = public.current_staff_id()));
```

**Notes go to the key adult only, and never private ones.** (The SENCO no longer sees notes.)
```sql
create policy notes_key_adult_read on public.notes for select to authenticated
  using (exists (select 1 from public.checkins c where c.id = checkin_id and public.is_key_adult_of(c.pupil_id))
         and not public.note_is_private(checkin_id, slot_key));

create policy parent_notes_read on public.parent_notes for select to authenticated
  using (public.is_key_adult_of(pupil_id)
         and exists (select 1 from public.pupils p where p.id = pupil_id and p.parent_share));
```

**The app matches** (`src/domain/access.ts`). The SENCO's drift cards and pupil page no longer show notes or notes from home. Instead the page says "…'s notes go to their key adult only. You see the battery trend and the approved profile."
```ts
/** Shared check-in notes and notes from home: only the pupil's own key adult (not the SENCO). */
canSeeNotes: (staff: Staff, p: Pupil) => isKeyAdult(staff, p),
```

**The class heatmap without individual ratings.** The class teacher calls a function that returns averages only, and it returns nothing to anyone who can't see the class.
```sql
create or replace function public.class_heatmap(cls uuid, days integer default 6)
returns table (slot_key text, date date, average numeric, pupils integer)
...
  select r.slot_key, c.date, round(avg(r.rating)::numeric, 1), count(distinct c.pupil_id)::integer
  ...
  where p.class_id = cls and c.date in (select date from recent) and public.can_see_class(cls)
  group by r.slot_key, c.date
```
`class_help_answers(cls)` does the same for "Most asked for": anonymous answers, leaving out private notes.

**DSL: flags, and only the names of flagged pupils:**
```sql
create policy flags_dsl_read on public.flags for select to authenticated
  using (public.current_staff_role() = 'dsl');
create policy pupils_read_dsl on public.pupils for select to authenticated
  using (public.current_staff_role() = 'dsl' and exists (select 1 from public.flags f where f.pupil_id = pupils.id));
```

**Quick replies: your own only.**
```sql
create policy quick_replies_own on public.quick_replies for all to authenticated
  using (staff_id = public.current_staff_id())
  with check (staff_id = public.current_staff_id());
```

**Audit trail: add only, as yourself.** There is no update or delete policy, so with RLS on those are refused.
```sql
create policy post_events_add on public.post_events for insert to authenticated
  with check (
    (actor_pupil_id = public.current_pupil_id() and actor_staff_id is null and exists (... own post ...))
    or
    (actor_staff_id = public.current_staff_id() and actor_pupil_id is null and exists (... shared post of my pupil ...))
  );
```

**pupil_secrets:** this table deliberately has **no policy**, so with RLS on, only the server (service role) can read the PIN hashes.

## Checks (local only, in PGlite on this laptop)

I loaded both migration files into a throwaway local Postgres. It had stand-ins for Supabase's `auth.uid()`, `auth.jwt()` and the `authenticated` role, plus a few fictional rows. **38 of 38 checks pass**, including:

| Check | Result |
|---|---|
| Isla (pupil) sees her own 3 posts, including the private one | ✅ 3 |
| Ben (pupil) sees none of Isla's posts | ✅ 0 |
| Ms Rivera (Isla's key adult) sees only the 2 **shared** posts | ✅ 2 |
| Mrs Hughes (not Isla's key adult) sees none of Isla's posts | ✅ 0 |
| SENCO sees no posts (no Requests) but does see ratings for drift | ✅ 0 / 2 |
| SENCO can't read any notes, and can't read notes from home | ✅ 0 / 0 |
| SENCO can still read approved profile snapshots | ✅ 1 |
| Key adult reads their own pupil's shared note and notes from home (the pupil agreed) | ✅ |
| Another key adult can't read that pupil's notes | ✅ 0 |
| Key adult sees the shared note but **not** the private note | ✅ |
| DSL sees flags, and only the flagged pupil's name | ✅ |
| Nobody (key adult or pupil) can read `pupil_secrets` | ✅ 0 |
| Class heatmap works for the class teacher and is empty for the DSL | ✅ |
| Themes skip the private note | ✅ |
| Can't add or delete someone else's quick reply | ✅ refused |
| Key adult can reply to a shared post but can't touch a private one | ✅ 1 / 0 |
| Audit events: add as yourself ✅; pretend to be someone else, edit or delete ❌ refused | ✅ |
| A pupil can raise a flag on their own words, can't read it back, and can't raise one for another pupil | ✅ |
| A signed-in account with no staff row and no pupil claim sees nothing | ✅ |

**Note for the app connection step:** inserting a flag as a pupil must not ask for the row back (no `.select()` after `.insert()`), because pupils can't read flags.

## Known limits (to tidy in later steps)

- **Column-level limits aren't set yet.** A pupil may update their own `pupils` row, and a key adult may update a shared post. A later step will narrow which columns each can change: a pupil shouldn't change their class or key adult, and a key adult should only change status and reply fields. For now the app only sends those fields.
- **Notes from home:** read rules only. Writing them comes with the family-note flow.

## How to run it (when you're happy with it)

- **Dashboard:** go to **SQL Editor**, click **New query**, paste the whole file and click **Run**.
- **CLI:** from `app`, run `npx supabase db push`. It applies only the new file.
