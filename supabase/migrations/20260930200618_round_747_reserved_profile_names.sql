-- Round 747: reserve authority names without changing existing profiles or RLS.
-- The client uses the same whole-name policy in nameModeration.ts.
create or replace function public.is_reserved_profile_name(candidate text)
returns boolean
language sql
immutable
security invoker
set search_path = ''
as $$
  with whitespace as (
    select U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF' as chars
  ), trimmed as (
    select btrim(coalesce(candidate, ''), chars) as name, chars from whitespace
  ), candidates as (
    select name from trimmed
    union all
    select regexp_replace(name, '[0-9_.' || chars || '-]+$', '') from trimmed
  ), folded as (
    select regexp_replace(
      translate(lower(name), '013456789@$!|(', 'oieasgtbgasiic'),
      '[^a-z]', '', 'g'
    ) as name from candidates
  )
  select exists (
    select 1 from folded where name ~
      '^(the)?((admin|administrator|moderator|support|system|official|verified)((admin|administrator|moderator|support|system|official|verified)|(staff|team|account))?|((admin|administrator|moderator|support|system|official|verified)((admin|administrator|moderator|support|system|official|verified)|(staff|team|account))?|(staff|team|account))?(douknowball|doyouknowball|dukb)((admin|administrator|moderator|support|system|official|verified)((admin|administrator|moderator|support|system|official|verified)|(staff|team|account))?|(staff|team|account))?)$'
  );
$$;
revoke all on function public.is_reserved_profile_name(text) from public, anon;
grant execute on function public.is_reserved_profile_name(text) to authenticated, service_role;

create or replace function public.guard_reserved_profile_names()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  username_changed boolean;
  display_name_changed boolean;
begin
  if TG_OP = 'INSERT' then
    username_changed := true;
    display_name_changed := true;
  else
    username_changed := NEW.username is distinct from OLD.username;
    display_name_changed := NEW.display_name is distinct from OLD.display_name;
  end if;
  if (username_changed and public.is_reserved_profile_name(NEW.username))
    or (display_name_changed and public.is_reserved_profile_name(NEW.display_name)) then
    raise exception using errcode = '23514',
      message = 'Please choose a different name - that one is reserved for site accounts.';
  end if;
  return NEW;
end;
$$;

-- AFTER is deliberate: an upsert can submit an unchanged legacy name.
-- BEFORE INSERT would reject it before ON CONFLICT reaches the update path.
create trigger guard_reserved_profile_names
after insert or update of username, display_name on public.profiles
for each row execute function public.guard_reserved_profile_names();
revoke all on function public.guard_reserved_profile_names() from public, anon, authenticated;

-- Temporary fixtures verify the actual invoker trigger, not a copy of its logic.
-- No existing profile is written. The disabled-trigger control stays temporary.
create temporary table reserved_profile_fixture (
  id integer primary key, username text, display_name text,
  streak_state jsonb not null default '{}'
) on commit drop;
alter table reserved_profile_fixture enable row level security;
create policy fixture_owner on reserved_profile_fixture for all
to authenticated using (true) with check (true);
grant select, insert, update on reserved_profile_fixture to authenticated;
insert into reserved_profile_fixture values (0, 'admin', 'DoUKnowBall', '{}');
create trigger fixture_reserved_names
after insert or update of username, display_name on reserved_profile_fixture
for each row execute function public.guard_reserved_profile_names();

set local role authenticated;
do $probe$
declare
  bad_names text[] := array[
    'admin', 'administrator', 'moderator', 'support', 'system', 'official', 'verified',
    'AdMiN', 'adm1n', 'a d m i n', 'admin123', 'admin123_', 'admin_123',
    'support-team42', 'official_admin', 'support_staff', 'verified_account', 'the admin',
    'DoUKnowBall', 'Do You Know Ball', 'DUKB', 'DOU-KNOW-BALL',
    'Official_DoUKnowBall', 'DoUKnowBallSupport', 'DoUKnowBall support team',
    'the_dukb_official', 'DoUKnowBall_123', 'DUKB_01',
    U&'admin123\00A0', U&'admin123\FEFF'
  ];
  good_names text[] := array[
    'Mark', 'Luka', 'Xavi', 'Max Parker', 'IcyKeeper-42', 'GoldenVolley-77',
    'OfficialBaller', 'ArsenalSupporter', 'FanOfDoUKnowBall', 'DoUKnowBallFan',
    'SystemBasketball', 'VerifiedFan', 'AdmiralKeeper', 'SupportersClub',
    'Arsenal', 'Real Madrid', 'Ajax', 'Manchester United', 'Barcelona', 'Aston Villa'
  ];
  candidate text;
  fixture_id integer := 0;
  rejected integer := 0;
begin
  foreach candidate in array good_names loop
    if public.is_reserved_profile_name(candidate) then
      raise exception 'Ordinary name rejected: %', candidate;
    end if;
    fixture_id := fixture_id + 1;
    insert into pg_temp.reserved_profile_fixture values (fixture_id, candidate, candidate, '{}');
    insert into pg_temp.reserved_profile_fixture values (fixture_id, candidate, candidate, '{"played":1}')
    on conflict (id) do update set username = excluded.username,
      display_name = excluded.display_name, streak_state = excluded.streak_state;
  end loop;
  foreach candidate in array bad_names loop
    if not public.is_reserved_profile_name(candidate) then
      raise exception 'Reserved predicate missed: %', candidate;
    end if;
    begin
      insert into pg_temp.reserved_profile_fixture values (999, candidate, 'Mark', '{}');
      raise exception 'Reserved username insert accepted: %', candidate;
    exception when check_violation then rejected := rejected + 1; end;
    begin
      insert into pg_temp.reserved_profile_fixture values (999, 'Mark', candidate, '{}');
      raise exception 'Reserved display name insert accepted: %', candidate;
    exception when check_violation then rejected := rejected + 1; end;
    begin
      update pg_temp.reserved_profile_fixture set username = candidate where id = 1;
      raise exception 'Reserved username update accepted: %', candidate;
    exception when check_violation then rejected := rejected + 1; end;
    begin
      update pg_temp.reserved_profile_fixture set display_name = candidate where id = 1;
      raise exception 'Reserved display name update accepted: %', candidate;
    exception when check_violation then rejected := rejected + 1; end;
    begin
      insert into pg_temp.reserved_profile_fixture values (1, candidate, 'Mark', '{}')
      on conflict (id) do update set username = excluded.username;
      raise exception 'Reserved upsert accepted: %', candidate;
    exception when check_violation then rejected := rejected + 1; end;
  end loop;
  if rejected <> 150 or (select count(*) from pg_temp.reserved_profile_fixture) <> 21
    or (select username from pg_temp.reserved_profile_fixture where id = 1) <> 'Mark' then
    raise exception 'Write rejection or statement rollback failed';
  end if;
  if public.is_reserved_profile_name(null) or public.is_reserved_profile_name('')
    or public.is_reserved_profile_name('   ') then
    raise exception 'Blank names must remain the callers length-validation responsibility';
  end if;
  update pg_temp.reserved_profile_fixture set streak_state = '{"played":2}' where id = 0;
  update pg_temp.reserved_profile_fixture set username = username, display_name = display_name where id = 0;
  insert into pg_temp.reserved_profile_fixture values (0, 'admin', 'DoUKnowBall', '{"played":3}')
  on conflict (id) do update set username = excluded.username,
    display_name = excluded.display_name, streak_state = excluded.streak_state;
  if (select streak_state from pg_temp.reserved_profile_fixture where id = 0) <> '{"played":3}'::jsonb then
    raise exception 'An unchanged legacy-name upsert lost its streak write';
  end if;
  update pg_temp.reserved_profile_fixture set username = 'IcyKeeper-42' where id = 0;
  if (select display_name from pg_temp.reserved_profile_fixture where id = 0) <> 'DoUKnowBall' then
    raise exception 'Changing one field must not rewrite the legacy field';
  end if;
end;
$probe$;
reset role;

-- This control must change the result. Disable only the fixture trigger.
alter table reserved_profile_fixture disable trigger fixture_reserved_names;
set local role authenticated;
insert into pg_temp.reserved_profile_fixture values (999, 'admin', 'DoUKnowBall', '{}');
do $control$
begin
  if (select count(*) from pg_temp.reserved_profile_fixture where id = 999 and username = 'admin') <> 1 then
    raise exception 'The disabled-trigger control did not admit its reserved fixture';
  end if;
end;
$control$;
reset role;
alter table reserved_profile_fixture enable trigger fixture_reserved_names;
drop table reserved_profile_fixture;
