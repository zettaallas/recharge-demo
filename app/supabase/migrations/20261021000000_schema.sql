-- Recharge: database schema (Step 10a).
-- Tables only. Row-level security is switched ON for every table with NO policies yet,
-- so nothing can be read or written through the API until Step 10b adds the access rules.
-- No data in this file. Demo data stays fictional and is added separately.
--
-- Shapes follow app/src/types/index.ts. Enum-like values use CHECK constraints so they are easy to change.

create extension if not exists pgcrypto; -- gen_random_uuid()

-- ---------------------------------------------------------------------------
-- Schools, staff, classes
-- ---------------------------------------------------------------------------

create table public.schools (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now()
);

-- One row per staff member. The id is their Supabase Auth user, so they log in with email + password.
create table public.staff (
  id          uuid primary key references auth.users (id) on delete cascade,
  school_id   uuid not null references public.schools (id) on delete cascade,
  name        text not null,
  email       text not null unique,
  role        text not null check (role in ('class_teacher', 'key_adult', 'senco', 'dsl')),
  created_at  timestamptz not null default now()
);

-- Each teacher's own one-tap replies, in their chosen order.
create table public.quick_replies (
  id          uuid primary key default gen_random_uuid(),
  staff_id    uuid not null references public.staff (id) on delete cascade,
  text        text not null check (length(trim(text)) > 0),
  position    integer not null default 0,
  created_at  timestamptz not null default now()
);
create index quick_replies_staff_idx on public.quick_replies (staff_id, position);

create table public.classes (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references public.schools (id) on delete cascade,
  name        text not null,
  code        text not null unique check (code ~ '^[A-Z0-9]{2}-[A-Z0-9]{3}$'),
  teacher_id  uuid references public.staff (id) on delete set null,
  created_at  timestamptz not null default now()
);

-- The places and moments of a class's day that pupils rate (Maths · Classroom 8B, Lunch · Lunch hall, ...).
create table public.slots (
  id          uuid primary key default gen_random_uuid(),
  class_id    uuid not null references public.classes (id) on delete cascade,
  key         text not null,                -- stable id used in ratings, e.g. 'lunch'
  name        text not null,
  place       text not null,
  icon        text not null default 'pin',
  time_label  text,
  position    integer not null default 0,
  unique (class_id, key)
);

-- ---------------------------------------------------------------------------
-- Pupils
-- ---------------------------------------------------------------------------

-- Pupils do NOT have Supabase Auth accounts: they log in with class code + name + PIN.
-- Everything here is safe to show the pupil; secrets live in pupil_secrets.
create table public.pupils (
  id                  uuid primary key default gen_random_uuid(),
  class_id            uuid not null references public.classes (id) on delete cascade,
  name                text not null,                       -- first name and initial only
  avatar              text not null default 'teal'
                      check (avatar in ('teal', 'sky', 'lilac', 'sun', 'coral', 'leaf', 'rose', 'slate')),
  key_adult_id        uuid references public.staff (id) on delete set null,
  attendance          numeric(5, 2),
  buddy_colour        text not null default 'teal' check (buddy_colour in ('teal', 'lilac', 'sky', 'sun', 'coral')),
  buddy_hat           text not null default 'none' check (buddy_hat in ('none', 'beanie', 'cap', 'crown', 'headphones', 'flower')),
  parent_share        boolean not null default false,      -- may school read notes from home?
  -- pupil settings
  preferred_name      text,
  helps               text[] not null default '{}',        -- "things that usually help me"
  show_read_receipts  boolean not null default true,
  pin_on_reopen       boolean not null default false,
  registered          boolean not null default false,
  walkthrough_done    boolean not null default false,
  created_at          timestamptz not null default now()
);
create index pupils_class_idx on public.pupils (class_id);
create index pupils_key_adult_idx on public.pupils (key_adult_id);

-- PIN hash, salt and lockout. Only the server side (an Edge Function using the service role) reads this table.
create table public.pupil_secrets (
  pupil_id    uuid primary key references public.pupils (id) on delete cascade,
  pin_hash    text not null,
  salt        text not null,
  failed      integer not null default 0 check (failed >= 0),
  locked      boolean not null default false,
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Check-ins, notes, Recharge Walk places
-- ---------------------------------------------------------------------------

create table public.checkins (
  id          uuid primary key default gen_random_uuid(),
  pupil_id    uuid not null references public.pupils (id) on delete cascade,
  date        date not null,
  created_at  timestamptz not null default now(),
  unique (pupil_id, date)                      -- saving again the same day updates that day's check-in
);

-- One battery rating per place for a check-in. slot_key is a class slot key or 'pin_<walk place id>'.
create table public.checkin_ratings (
  checkin_id  uuid not null references public.checkins (id) on delete cascade,
  slot_key    text not null,
  rating      smallint not null check (rating between 1 and 5),
  primary key (checkin_id, slot_key)
);

-- "Add more" for one place in a check-in. Photos/drawings/voice are paths in Supabase Storage, not the files.
create table public.notes (
  id            uuid primary key default gen_random_uuid(),
  checkin_id    uuid not null references public.checkins (id) on delete cascade,
  slot_key      text not null,
  symbols       text[] not null default '{}',
  help_chips    text[] not null default '{}',
  help_text     text,
  text          text,
  photo_path    text,
  drawing_path  text,
  voice_path    text,
  unique (checkin_id, slot_key)
);

create table public.walk_places (
  id          uuid primary key default gen_random_uuid(),
  pupil_id    uuid not null references public.pupils (id) on delete cascade,
  tag         text not null check (tag in ('drains', 'recharges')),
  emoji       text not null,
  caption     text not null,                 -- the pupil's own words are the meaning
  photo_path  text,
  created_at  timestamptz not null default now()
);
create index walk_places_pupil_idx on public.walk_places (pupil_id);

-- ---------------------------------------------------------------------------
-- Requests to the key adult (breaks, symbols, talk) and the pupil's posts
-- ---------------------------------------------------------------------------

create table public.moments (
  id          uuid primary key default gen_random_uuid(),
  pupil_id    uuid not null references public.pupils (id) on delete cascade,
  kind        text not null check (kind in ('break', 'symbol', 'talk')),
  symbols     text[] not null default '{}',
  where_slot  text,                          -- optional "Where are you right now?"
  text        text,                          -- optional details
  seen        boolean not null default false,
  created_at  timestamptz not null default now()
);
create index moments_pupil_idx on public.moments (pupil_id, created_at desc);

-- Everything a pupil sends or keeps. shared_with = 'private' means staff never see it
-- (the only exception is a safeguarding flag, which is its own table).
create table public.posts (
  id           uuid primary key default gen_random_uuid(),
  pupil_id     uuid not null references public.pupils (id) on delete cascade,
  kind         text not null check (kind in ('note', 'symbol', 'break', 'pin', 'talk')),
  ref_id       text not null,                -- the moment, walk place, or '<checkin id>:<slot key>' it points to
  summary      text not null,
  shared_with  text not null default 'keyAdult' check (shared_with in ('keyAdult', 'private')),
  status       text not null default 'sent' check (status in ('sent', 'read', 'followUp')),
  read_at      timestamptz,
  follow_up    text,                         -- the key adult's reply
  replied_at   timestamptz,
  replied_by   uuid references public.staff (id) on delete set null,
  helpful      text check (helpful in ('yes', 'notReally', 'skip')),
  created_at   timestamptz not null default now(),
  check (status <> 'followUp' or (follow_up is not null and replied_at is not null))
);
create index posts_pupil_idx on public.posts (pupil_id, created_at desc);

-- Audit trail: who did what to a post and when. Rows are only ever added.
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
create index post_events_post_idx on public.post_events (post_id, created_at);

-- ---------------------------------------------------------------------------
-- My Recharge Profile
-- ---------------------------------------------------------------------------

create table public.profiles (
  pupil_id     uuid primary key references public.pupils (id) on delete cascade,
  approved_at  timestamptz,
  dirty        boolean not null default false     -- changed since the last approval
);

create table public.profile_items (
  id        uuid primary key default gen_random_uuid(),
  pupil_id  uuid not null references public.profiles (pupil_id) on delete cascade,
  section   text not null check (section in ('drains', 'helps', 'words')),
  text      text not null,
  src       text not null check (src in ('ratings', 'symbols', 'walk', 'help', 'typed', 'own')),
  hidden    boolean not null default false,
  position  integer not null default 0
);
create index profile_items_pupil_idx on public.profile_items (pupil_id, position);

-- What staff see: exactly the visible items at the moment the pupil tapped Approve.
create table public.profile_snapshots (
  id           uuid primary key default gen_random_uuid(),
  pupil_id     uuid not null references public.profiles (pupil_id) on delete cascade,
  items        jsonb not null,                      -- [{ "section": "...", "text": "..." }]
  approved_at  timestamptz not null default now()
);
create index profile_snapshots_pupil_idx on public.profile_snapshots (pupil_id, approved_at desc);

-- ---------------------------------------------------------------------------
-- You said, we did
-- ---------------------------------------------------------------------------

create table public.feed_posts (
  id          uuid primary key default gen_random_uuid(),
  class_id    uuid not null references public.classes (id) on delete cascade,
  said        text not null,
  did         text not null,
  by_staff_id uuid references public.staff (id) on delete set null,
  created_at  timestamptz not null default now()
);
create index feed_posts_class_idx on public.feed_posts (class_id, created_at desc);

-- "Was this helpful?" — one optional answer per pupil per post.
create table public.feed_helpful (
  feed_post_id  uuid not null references public.feed_posts (id) on delete cascade,
  pupil_id      uuid not null references public.pupils (id) on delete cascade,
  answer        text not null check (answer in ('yes', 'notReally', 'skip')),
  created_at    timestamptz not null default now(),
  primary key (feed_post_id, pupil_id)
);

-- ---------------------------------------------------------------------------
-- Safeguarding, planned check-ins, notes from home
-- ---------------------------------------------------------------------------

-- Keyword flags for the DSL. A flag closes only when every checklist step is ticked (enforced in the app for now).
create table public.flags (
  id          uuid primary key default gen_random_uuid(),
  pupil_id    uuid not null references public.pupils (id) on delete cascade,
  source      text not null,
  text        text not null,
  words       text[] not null default '{}',
  status      text not null default 'open' check (status in ('open', 'closed')),
  checklist   jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index flags_status_idx on public.flags (status, created_at desc);

create table public.plans (
  id           uuid primary key default gen_random_uuid(),
  pupil_id     uuid not null references public.pupils (id) on delete cascade,
  by_staff_id  uuid references public.staff (id) on delete set null,
  when_label   text not null check (when_label in ('Today', 'Tomorrow', 'This week')),
  created_at   timestamptz not null default now()
);

create table public.parent_notes (
  id          uuid primary key default gen_random_uuid(),
  pupil_id    uuid not null references public.pupils (id) on delete cascade,
  text        text not null,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row-level security: ON everywhere, no policies yet = locked by default.
-- Step 10b adds the policies (key adult, tutor, SENCO, DSL, pupil).
-- ---------------------------------------------------------------------------

alter table public.schools            enable row level security;
alter table public.staff              enable row level security;
alter table public.quick_replies      enable row level security;
alter table public.classes            enable row level security;
alter table public.slots              enable row level security;
alter table public.pupils             enable row level security;
alter table public.pupil_secrets      enable row level security;
alter table public.checkins           enable row level security;
alter table public.checkin_ratings    enable row level security;
alter table public.notes              enable row level security;
alter table public.walk_places        enable row level security;
alter table public.moments            enable row level security;
alter table public.posts              enable row level security;
alter table public.post_events        enable row level security;
alter table public.profiles           enable row level security;
alter table public.profile_items      enable row level security;
alter table public.profile_snapshots  enable row level security;
alter table public.feed_posts         enable row level security;
alter table public.feed_helpful       enable row level security;
alter table public.flags              enable row level security;
alter table public.plans              enable row level security;
alter table public.parent_notes       enable row level security;
