-- Recharge: access rules (Step 10b). Row-level security policies that mirror the app's rules
-- (app/src/domain/access.ts) and the project scope: each person sees the minimum they need.
--
--   Pupil:         reads and writes only their own rows.
--   Key adult:     only what their own pupils SHARE (never private posts or notes); can mark read and reply.
--   Class teacher: class-level heatmap and themes only (through summary functions), no individual content,
--                  unless they are also a pupil's key adult (key adult is per pupil).
--   SENCO:         drift (ratings) and approved profile snapshots only; no notes, no Requests.
--   DSL:           safeguarding flags only, plus the name of a pupil who has a flag.
--   pupil_secrets: no policies at all = only the server (service role) can read it.
--   post_events:   insert-only audit trail.
--
-- Who is calling:
--   Staff log in with Supabase Auth; their staff.id is auth.uid().
--   Pupils get a short session from the PIN Edge Function (a later step). ASSUMPTION: that JWT carries
--   a custom claim  "pupil_id": "<uuid>"  which we read with auth.jwt(). Staff tokens never have it.

-- ---------------------------------------------------------------------------
-- Helper functions. SECURITY DEFINER so policies can look things up without
-- tripping over RLS themselves; search_path is empty so names can't be hijacked.
-- ---------------------------------------------------------------------------

create or replace function public.current_staff_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select s.id from public.staff s where s.id = auth.uid()
$$;

create or replace function public.current_staff_role() returns text
language sql stable security definer set search_path = '' as $$
  select s.role from public.staff s where s.id = auth.uid()
$$;

create or replace function public.current_pupil_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select p.id from public.pupils p where p.id = nullif(auth.jwt() ->> 'pupil_id', '')::uuid
$$;

create or replace function public.current_school_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select s.school_id from public.staff s where s.id = auth.uid()),
    (select c.school_id from public.pupils p join public.classes c on c.id = p.class_id
      where p.id = nullif(auth.jwt() ->> 'pupil_id', '')::uuid)
  )
$$;

-- Is the caller this pupil's key adult?
create or replace function public.is_key_adult_of(pupil uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.pupils p where p.id = pupil and p.key_adult_id = auth.uid()
                 and (select role from public.staff where id = auth.uid()) <> 'dsl')
$$;

-- Can the caller see this pupil's individual (shared) data? Key adult of that pupil, or the SENCO of the school.
create or replace function public.can_see_pupil(pupil uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_key_adult_of(pupil)
      or exists (select 1 from public.pupils p join public.classes c on c.id = p.class_id
                 join public.staff s on s.id = auth.uid()
                 where p.id = pupil and s.role = 'senco' and s.school_id = c.school_id)
$$;

-- Can the caller see a class at class level (codes, slots, heatmap, themes, You said / We did)?
create or replace function public.can_see_class(cls uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.classes c join public.staff s on s.id = auth.uid()
    where c.id = cls and s.school_id = c.school_id and (
      s.role = 'senco'
      or (s.role = 'class_teacher' and c.teacher_id = s.id)
      or exists (select 1 from public.pupils p where p.class_id = c.id and p.key_adult_id = s.id)
    ))
$$;

-- Can the caller manage a class (PINs, pupils, You said / We did)? Its class teacher, or the SENCO.
create or replace function public.can_manage_class(cls uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.classes c join public.staff s on s.id = auth.uid()
    where c.id = cls and s.school_id = c.school_id
      and (s.role = 'senco' or (s.role = 'class_teacher' and c.teacher_id = s.id)))
$$;

-- Did the pupil keep this check-in note private? (posts.ref_id for notes is '<checkin id>:<slot key>')
create or replace function public.note_is_private(checkin uuid, slot text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.posts x
                 where x.kind = 'note' and x.ref_id = checkin::text || ':' || slot and x.shared_with = 'private')
$$;

-- The class heatmap without exposing anyone's individual ratings: averages per place per day.
create or replace function public.class_heatmap(cls uuid, days integer default 6)
returns table (slot_key text, date date, average numeric, pupils integer)
language sql stable security definer set search_path = '' as $$
  with recent as (
    select distinct c.date from public.checkins c join public.pupils p on p.id = c.pupil_id
    where p.class_id = cls order by c.date desc limit days
  )
  select r.slot_key, c.date, round(avg(r.rating)::numeric, 1), count(distinct c.pupil_id)::integer
  from public.checkin_ratings r
  join public.checkins c on c.id = r.checkin_id
  join public.pupils p on p.id = c.pupil_id
  where p.class_id = cls and c.date in (select date from recent) and public.can_see_class(cls)
  group by r.slot_key, c.date
$$;

-- "What would help?" answers for a class, without names, leaving out notes a pupil kept private.
create or replace function public.class_help_answers(cls uuid)
returns table (text text, chips text[], date date)
language sql stable security definer set search_path = '' as $$
  select coalesce(n.help_text, array_to_string(n.help_chips, ', ')), n.help_chips, c.date
  from public.notes n
  join public.checkins c on c.id = n.checkin_id
  join public.pupils p on p.id = c.pupil_id
  where p.class_id = cls and public.can_see_class(cls)
    and (n.help_text is not null or cardinality(n.help_chips) > 0)
    and not public.note_is_private(n.checkin_id, n.slot_key)
$$;

-- ---------------------------------------------------------------------------
-- Policies
-- ---------------------------------------------------------------------------

-- Schools: anyone signed in sees their own school's name.
create policy schools_read on public.schools for select to authenticated
  using (id = public.current_school_id());

-- Staff: colleagues in the same school (names and roles). A pupil sees only their own key adult.
create policy staff_read_colleagues on public.staff for select to authenticated
  using (school_id = public.current_school_id() and public.current_staff_id() is not null);
create policy staff_read_my_key_adult on public.staff for select to authenticated
  using (id = (select key_adult_id from public.pupils where id = public.current_pupil_id()));

-- Quick replies: each staff member manages only their own.
create policy quick_replies_own on public.quick_replies for all to authenticated
  using (staff_id = public.current_staff_id())
  with check (staff_id = public.current_staff_id());

-- Classes: staff who can see the class; a pupil sees their own class. Managers create and edit.
create policy classes_read on public.classes for select to authenticated
  using (public.can_see_class(id) or id = (select class_id from public.pupils where id = public.current_pupil_id()));
create policy classes_create on public.classes for insert to authenticated
  with check (school_id = public.current_school_id() and public.current_staff_role() in ('class_teacher', 'senco'));
create policy classes_update on public.classes for update to authenticated
  using (public.can_manage_class(id)) with check (public.can_manage_class(id));

-- Slots (places and moments of the day): same as classes.
create policy slots_read on public.slots for select to authenticated
  using (public.can_see_class(class_id) or class_id = (select class_id from public.pupils where id = public.current_pupil_id()));
create policy slots_manage on public.slots for all to authenticated
  using (public.can_manage_class(class_id)) with check (public.can_manage_class(class_id));

-- Pupils: own row; key adult and SENCO; class managers; the DSL only for pupils with a flag.
create policy pupils_read_self on public.pupils for select to authenticated
  using (id = public.current_pupil_id());
create policy pupils_update_self on public.pupils for update to authenticated
  using (id = public.current_pupil_id()) with check (id = public.current_pupil_id());
create policy pupils_read_staff on public.pupils for select to authenticated
  using (public.can_see_pupil(id) or public.can_manage_class(class_id));
create policy pupils_read_dsl on public.pupils for select to authenticated
  using (public.current_staff_role() = 'dsl' and exists (select 1 from public.flags f where f.pupil_id = pupils.id));
create policy pupils_manage on public.pupils for insert to authenticated
  with check (public.can_manage_class(class_id));
create policy pupils_manage_update on public.pupils for update to authenticated
  using (public.can_manage_class(class_id)) with check (public.can_manage_class(class_id));

-- pupil_secrets: NO policies. With RLS on, only the service role (server) can read or write it.

-- Check-ins and ratings: the pupil's own; key adult and SENCO read (drift). Class teachers use class_heatmap().
create policy checkins_self on public.checkins for all to authenticated
  using (pupil_id = public.current_pupil_id()) with check (pupil_id = public.current_pupil_id());
create policy checkins_staff_read on public.checkins for select to authenticated
  using (public.can_see_pupil(pupil_id));

create policy ratings_self on public.checkin_ratings for all to authenticated
  using (exists (select 1 from public.checkins c where c.id = checkin_id and c.pupil_id = public.current_pupil_id()))
  with check (exists (select 1 from public.checkins c where c.id = checkin_id and c.pupil_id = public.current_pupil_id()));
create policy ratings_staff_read on public.checkin_ratings for select to authenticated
  using (exists (select 1 from public.checkins c where c.id = checkin_id and public.can_see_pupil(c.pupil_id)));

-- Notes: the pupil's own; their key adult only notes that were NOT kept private. The SENCO does not see notes.
create policy notes_self on public.notes for all to authenticated
  using (exists (select 1 from public.checkins c where c.id = checkin_id and c.pupil_id = public.current_pupil_id()))
  with check (exists (select 1 from public.checkins c where c.id = checkin_id and c.pupil_id = public.current_pupil_id()));
create policy notes_key_adult_read on public.notes for select to authenticated
  using (exists (select 1 from public.checkins c where c.id = checkin_id and public.is_key_adult_of(c.pupil_id))
         and not public.note_is_private(checkin_id, slot_key));

-- Recharge Walk places: the pupil's own. Staff see them only through the approved profile.
create policy walk_self on public.walk_places for all to authenticated
  using (pupil_id = public.current_pupil_id()) with check (pupil_id = public.current_pupil_id());

-- Moments (breaks, symbols, talk requests): the pupil adds and sees their own; their key adult reads and marks seen.
create policy moments_self on public.moments for all to authenticated
  using (pupil_id = public.current_pupil_id()) with check (pupil_id = public.current_pupil_id());
create policy moments_key_adult_read on public.moments for select to authenticated
  using (public.is_key_adult_of(pupil_id));
create policy moments_key_adult_seen on public.moments for update to authenticated
  using (public.is_key_adult_of(pupil_id)) with check (public.is_key_adult_of(pupil_id));

-- Posts: the pupil's own, all of them. The key adult sees and answers ONLY shared posts of their own pupils.
create policy posts_self on public.posts for all to authenticated
  using (pupil_id = public.current_pupil_id()) with check (pupil_id = public.current_pupil_id());
create policy posts_key_adult_read on public.posts for select to authenticated
  using (shared_with = 'keyAdult' and public.is_key_adult_of(pupil_id));
create policy posts_key_adult_reply on public.posts for update to authenticated
  using (shared_with = 'keyAdult' and public.is_key_adult_of(pupil_id))
  with check (shared_with = 'keyAdult' and public.is_key_adult_of(pupil_id)
              and (replied_by is null or replied_by = public.current_staff_id()));

-- Post events: append-only audit trail. Add events only as yourself, about posts you can see. No update or delete.
create policy post_events_add on public.post_events for insert to authenticated
  with check (
    (actor_pupil_id = public.current_pupil_id() and actor_staff_id is null
      and exists (select 1 from public.posts p where p.id = post_id and p.pupil_id = public.current_pupil_id()))
    or
    (actor_staff_id = public.current_staff_id() and actor_pupil_id is null
      and exists (select 1 from public.posts p where p.id = post_id and p.shared_with = 'keyAdult' and public.is_key_adult_of(p.pupil_id)))
  );
create policy post_events_read on public.post_events for select to authenticated
  using (exists (select 1 from public.posts p where p.id = post_id
                 and (p.pupil_id = public.current_pupil_id() or (p.shared_with = 'keyAdult' and public.is_key_adult_of(p.pupil_id)))));

-- Profile drafts are the pupil's alone. Staff only ever see the approved snapshot.
create policy profiles_self on public.profiles for all to authenticated
  using (pupil_id = public.current_pupil_id()) with check (pupil_id = public.current_pupil_id());
create policy profile_items_self on public.profile_items for all to authenticated
  using (pupil_id = public.current_pupil_id()) with check (pupil_id = public.current_pupil_id());
create policy snapshots_self on public.profile_snapshots for all to authenticated
  using (pupil_id = public.current_pupil_id()) with check (pupil_id = public.current_pupil_id());
create policy snapshots_staff_read on public.profile_snapshots for select to authenticated
  using (public.can_see_pupil(pupil_id));

-- You said, we did: the class's pupils and staff read; class managers post.
create policy feed_read on public.feed_posts for select to authenticated
  using (public.can_see_class(class_id) or class_id = (select class_id from public.pupils where id = public.current_pupil_id()));
create policy feed_post on public.feed_posts for insert to authenticated
  with check (public.can_manage_class(class_id) and by_staff_id = public.current_staff_id());

-- "Was this helpful?": each pupil manages their own answer; class managers read answers for the tally.
create policy helpful_self on public.feed_helpful for all to authenticated
  using (pupil_id = public.current_pupil_id()) with check (pupil_id = public.current_pupil_id());
create policy helpful_managers_read on public.feed_helpful for select to authenticated
  using (exists (select 1 from public.feed_posts f where f.id = feed_post_id and public.can_manage_class(f.class_id)));

-- Safeguarding flags: only the DSL reads and works them. A pupil's own words may raise a flag (insert only);
-- the pupil cannot read flags back.
create policy flags_dsl_read on public.flags for select to authenticated
  using (public.current_staff_role() = 'dsl');
create policy flags_dsl_update on public.flags for update to authenticated
  using (public.current_staff_role() = 'dsl') with check (public.current_staff_role() = 'dsl');
create policy flags_raise_own on public.flags for insert to authenticated
  with check (pupil_id = public.current_pupil_id() and status = 'open');

-- Planned check-ins (from drift alerts): key adult and SENCO, as themselves.
create policy plans_read on public.plans for select to authenticated
  using (public.can_see_pupil(pupil_id));
create policy plans_add on public.plans for insert to authenticated
  with check (public.can_see_pupil(pupil_id) and by_staff_id = public.current_staff_id());

-- Notes from home: the key adult only, and only if the pupil agreed to share them.
create policy parent_notes_read on public.parent_notes for select to authenticated
  using (public.is_key_adult_of(pupil_id)
         and exists (select 1 from public.pupils p where p.id = pupil_id and p.parent_share));
