# Step 10a: Supabase schema

**Commit:** not committed yet. **Not run on Supabase yet.** eko reviews it first, then runs it.

## What changed

- **Secrets stay out of git:**
  - `app/.env.local` (the Supabase URL and anon key) was already ignored by `.env*.local`.
  - I added `supabase/.temp/`, the Supabase CLI's local link files, to `app/.gitignore`.
  - Both were confirmed with `git check-ignore`.
- **New migration file:** `app/supabase/migrations/20261021000000_schema.sql`, built from the data shapes in `src/types`:
  - **22 tables**, all with `uuid` keys, foreign keys and `created_at` timestamps.
  - Allowed values for things like role, post status, flag status, symbols' sources and battery 1–5 are enforced with `check` constraints.
  - **Staff are linked to Supabase Auth** (`auth.users`), so staff log in with email and password.
  - **Pupils are not Auth users.** They keep the class code + name + PIN login. The **PIN hash, salt and lockout** live in a separate table, `pupil_secrets`, which only the server side will read.
  - **Row-level security is ON for every table, with no policies yet**, so nothing can be read or written through the API until Step 10b adds the access rules.
  - **No data in the file.**

| Group | Tables |
|---|---|
| School and people | `schools`, `staff` (→ `auth.users`), `quick_replies` (per staff, with `position`), `classes`, `slots` |
| Pupils | `pupils`, `pupil_secrets` (server only) |
| Sharing | `checkins`, `checkin_ratings` (1–5), `notes`, `walk_places`, `moments` (break / symbol / talk), `posts`, `post_events` (audit trail) |
| Profile | `profiles`, `profile_items`, `profile_snapshots` (what staff see) |
| Class | `feed_posts` (You said, we did), `feed_helpful` |
| Staff only | `flags` (safeguarding), `plans`, `parent_notes` |

## How to run it (when you're happy with it)

**The simplest way:**
1. Open the Supabase dashboard and go to **SQL Editor**.
2. Click **New query**.
3. Paste the whole migration file and click **Run**.

**With the CLI**, which is already linked on this laptop:
```
cd app
npx supabase db push
```

Run it once. Running it again errors, because the tables already exist.

## Key SQL

**Staff log in through Supabase Auth.** Each staff row is an Auth user, and the role can only be one of the four:
```sql
create table public.staff (
  id          uuid primary key references auth.users (id) on delete cascade,
  school_id   uuid not null references public.schools (id) on delete cascade,
  name        text not null,
  email       text not null unique,
  role        text not null check (role in ('class_teacher', 'key_adult', 'senco', 'dsl')),
  created_at  timestamptz not null default now()
);
```

**PIN secrets in their own table.** The `pupils` table holds only what's safe to show the pupil. Hash, salt and lockout are separate, so a policy mistake on `pupils` can never leak them.
```sql
create table public.pupil_secrets (
  pupil_id    uuid primary key references public.pupils (id) on delete cascade,
  pin_hash    text not null,
  salt        text not null,
  failed      integer not null default 0 check (failed >= 0),
  locked      boolean not null default false,
  updated_at  timestamptz not null default now()
);
```

**Posts carry the privacy choice and the status.** A Follow-up must have reply text and a reply time.
```sql
create table public.posts (
  ...
  shared_with  text not null default 'keyAdult' check (shared_with in ('keyAdult', 'private')),
  status       text not null default 'sent' check (status in ('sent', 'read', 'followUp')),
  follow_up    text,
  replied_at   timestamptz,
  replied_by   uuid references public.staff (id) on delete set null,
  helpful      text check (helpful in ('yes', 'notReally', 'skip')),
  ...
  check (status <> 'followUp' or (follow_up is not null and replied_at is not null))
);
```

**Audit trail.** Every read, reply, share, unshare and helpful answer can be recorded with who did it and when.
```sql
create table public.post_events (
  id              uuid primary key default gen_random_uuid(),
  post_id         uuid not null references public.posts (id) on delete cascade,
  event           text not null check (event in ('sent', 'read', 'replied', 'shared', 'unshared', 'helpful')),
  actor_staff_id  uuid references public.staff (id) on delete set null,
  actor_pupil_id  uuid references public.pupils (id) on delete set null,
  detail          text,
  created_at      timestamptz not null default now(),
  check (num_nonnulls(actor_staff_id, actor_pupil_id) <= 1)
);
```

**Quick replies keep their order:**
```sql
create table public.quick_replies (
  id          uuid primary key default gen_random_uuid(),
  staff_id    uuid not null references public.staff (id) on delete cascade,
  text        text not null check (length(trim(text)) > 0),
  position    integer not null default 0,
  created_at  timestamptz not null default now()
);
```

**Battery ratings are 1–5, one per place per check-in,** and there is one check-in per pupil per day:
```sql
create table public.checkins ( ..., unique (pupil_id, date) );
create table public.checkin_ratings (
  checkin_id  uuid not null references public.checkins (id) on delete cascade,
  slot_key    text not null,
  rating      smallint not null check (rating between 1 and 5),
  primary key (checkin_id, slot_key)
);
```

**What staff see of the profile:** only the snapshot taken when the pupil tapped Approve.
```sql
create table public.profile_snapshots (
  id           uuid primary key default gen_random_uuid(),
  pupil_id     uuid not null references public.profiles (pupil_id) on delete cascade,
  items        jsonb not null,
  approved_at  timestamptz not null default now()
);
```

**Locked by default:**
```sql
alter table public.pupils         enable row level security;
alter table public.pupil_secrets  enable row level security;
alter table public.posts          enable row level security;
-- ...and every other table
```

## Checks

- **Throwaway local Postgres:** I ran the file in PGlite on this laptop, with a stand-in `auth.users` table. It never touched Supabase.
  - All 22 tables were created, and all 22 have RLS on.
  - A class code like `8B-K4P` was accepted, and `bad` was rejected.
- **Secrets:** `git check-ignore` confirms `.env.local` and `supabase/.temp/` are ignored.

## Next: Step 10b

- **Policies:** each role sees only what the scope allows, and pupils see only their own data.
- **Pupil sign-in:** a small Edge Function checks the PIN against `pupil_secrets`.
- **Demo data:** a fictional seed.
- **App connection:** the app's `Store` switches from on-device storage to Supabase.
