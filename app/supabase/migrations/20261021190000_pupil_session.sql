-- Step 10d: pupil sessions from the PIN sign-in.
--
-- The pupil-login Edge Function signs each pupil in as their own server-managed Auth user, with
-- app_metadata = { "pupil_id": "<uuid>", "kind": "pupil" }. Only the service role can set app_metadata,
-- so a pupil can't change it. This updates the helpers from Step 10b to read it there
-- (still accepting a top-level "pupil_id" claim, which only the server could mint).
-- Never read user_metadata for this: users can edit their own user_metadata.

-- Link from a pupil to their shadow Auth user. Server-only, like the rest of pupil_secrets.
alter table public.pupil_secrets
  add column auth_user_id uuid unique references auth.users (id) on delete set null;

create or replace function public.current_pupil_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select p.id from public.pupils p
  where p.id = nullif(coalesce(auth.jwt() -> 'app_metadata' ->> 'pupil_id', auth.jwt() ->> 'pupil_id'), '')::uuid
$$;

create or replace function public.current_school_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select s.school_id from public.staff s where s.id = auth.uid()),
    (select c.school_id from public.pupils p join public.classes c on c.id = p.class_id
      where p.id = public.current_pupil_id())
  )
$$;
