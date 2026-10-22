-- Step 10f (security follow-up): limits on WHICH COLUMNS each person may change.
--
-- The Step 10b policies decide which ROWS someone may write. They don't limit columns, so through the API
-- (not the app) a pupil could, for example, move themselves to another class or pick a new key adult,
-- or mark their own post as "replied by Ms Rivera". These triggers close that gap.
--
-- Why triggers, not column GRANTs: pupils and staff share the same database role ("authenticated"),
-- and on the same table they may change different columns (a pupil: their settings; a teacher: the class).
-- GRANTs can't tell them apart; a trigger can, using the helper functions from Step 10b.
--
-- The server (seed script, Edge Functions, SQL editor) has no pupil or staff sign-in, so it is not limited.

-- Which columns differ between two versions of a row.
create or replace function public.changed_columns(a jsonb, b jsonb) returns text[]
language sql immutable set search_path = '' as $$
  select coalesce(array_agg(k order by k), '{}') from jsonb_object_keys(b) as k where a -> k is distinct from b -> k
$$;

-- Stops the write if any changed column is not in the allowed list.
create or replace function public.only_these_columns(old_row jsonb, new_row jsonb, allowed text[], who text) returns void
language plpgsql immutable set search_path = '' as $$
declare
  bad text[] := array(select unnest(public.changed_columns(old_row, new_row)) except select unnest(allowed));
begin
  if cardinality(bad) > 0 then
    raise exception 'Recharge: % may not change %', who, array_to_string(bad, ', ') using errcode = '42501';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Pupils: a pupil changes only their own choices; staff never change those choices
-- ---------------------------------------------------------------------------
create or replace function public.pupils_column_limits() returns trigger
language plpgsql set search_path = '' as $$
declare
  -- the pupil's own settings and consent ("may school read notes from home?")
  pupil_owned constant text[] := array['buddy_colour', 'buddy_hat', 'preferred_name', 'helps', 'show_read_receipts',
                                       'pin_on_reopen', 'registered', 'walkthrough_done', 'parent_share'];
begin
  if public.current_pupil_id() is not null then
    perform public.only_these_columns(to_jsonb(old), to_jsonb(new), pupil_owned, 'a pupil');
  elsif public.current_staff_id() is not null then
    -- class teacher / SENCO: name, avatar, class, key adult, attendance. Never the pupil's own choices.
    perform public.only_these_columns(to_jsonb(old), to_jsonb(new),
      array['name', 'avatar', 'class_id', 'key_adult_id', 'attendance'], 'staff');
  end if;
  return new;
end $$;
create trigger pupils_column_limits before update on public.pupils
  for each row execute function public.pupils_column_limits();

-- ---------------------------------------------------------------------------
-- Posts: the pupil owns the words and the sharing; the key adult owns read and reply
-- ---------------------------------------------------------------------------
create or replace function public.posts_column_limits() returns trigger
language plpgsql set search_path = '' as $$
begin
  if public.current_pupil_id() is not null then
    if tg_op = 'INSERT' then
      -- a new post starts as just "sent": a pupil can't fake "read" or a reply
      if new.status <> 'sent' or new.read_at is not null or new.follow_up is not null
         or new.replied_at is not null or new.replied_by is not null then
        raise exception 'Recharge: a new post starts as sent, without a reply' using errcode = '42501';
      end if;
    else
      perform public.only_these_columns(to_jsonb(old), to_jsonb(new), array['summary', 'shared_with', 'helpful'], 'a pupil');
    end if;
  elsif public.current_staff_id() is not null and tg_op = 'UPDATE' then
    perform public.only_these_columns(to_jsonb(old), to_jsonb(new),
      array['status', 'read_at', 'follow_up', 'replied_at', 'replied_by'], 'staff');
  end if;
  return new;
end $$;
create trigger posts_column_limits before insert or update on public.posts
  for each row execute function public.posts_column_limits();

-- ---------------------------------------------------------------------------
-- Moments (requests to the key adult): the key adult only marks them seen; the pupil can't mark them seen
-- ---------------------------------------------------------------------------
create or replace function public.moments_column_limits() returns trigger
language plpgsql set search_path = '' as $$
begin
  if public.current_pupil_id() is not null then
    if tg_op = 'INSERT' and new.seen then
      raise exception 'Recharge: a new request starts unseen' using errcode = '42501';
    elsif tg_op = 'UPDATE' then
      perform public.only_these_columns(to_jsonb(old), to_jsonb(new), array['symbols', 'where_slot', 'text'], 'a pupil');
    end if;
  elsif public.current_staff_id() is not null and tg_op = 'UPDATE' then
    perform public.only_these_columns(to_jsonb(old), to_jsonb(new), array['seen'], 'staff');
  end if;
  return new;
end $$;
create trigger moments_column_limits before insert or update on public.moments
  for each row execute function public.moments_column_limits();

-- ---------------------------------------------------------------------------
-- Safeguarding flags: a pupil's words may raise one (open, nothing ticked); the DSL only works the checklist
-- ---------------------------------------------------------------------------
create or replace function public.flags_column_limits() returns trigger
language plpgsql set search_path = '' as $$
begin
  if public.current_pupil_id() is not null and tg_op = 'INSERT' then
    if new.status <> 'open' or new.checklist <> '{}'::jsonb then
      raise exception 'Recharge: a new flag starts open with nothing ticked' using errcode = '42501';
    end if;
  elsif public.current_staff_id() is not null and tg_op = 'UPDATE' then
    perform public.only_these_columns(to_jsonb(old), to_jsonb(new), array['status', 'checklist'], 'staff');
  end if;
  return new;
end $$;
create trigger flags_column_limits before insert or update on public.flags
  for each row execute function public.flags_column_limits();

-- ---------------------------------------------------------------------------
-- Classes: managers rename or change the teacher, but can't move a class to another school
-- ---------------------------------------------------------------------------
create or replace function public.classes_column_limits() returns trigger
language plpgsql set search_path = '' as $$
begin
  if public.current_staff_id() is not null or public.current_pupil_id() is not null then
    perform public.only_these_columns(to_jsonb(old), to_jsonb(new), array['name', 'code', 'teacher_id'], 'staff');
  end if;
  return new;
end $$;
create trigger classes_column_limits before update on public.classes
  for each row execute function public.classes_column_limits();
