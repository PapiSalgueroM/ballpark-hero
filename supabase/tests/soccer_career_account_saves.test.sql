begin isolation level read committed;
select '1..5';

insert into auth.users (id, email) values
  ('13000000-0000-4000-8000-000000000001', 'career-backup-test-one@example.test'),
  ('13000000-0000-4000-8000-000000000002', 'career-backup-test-two@example.test');

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"13000000-0000-4000-8000-000000000001","role":"authenticated","is_anonymous":false}';

do $$
declare
  owner_id constant uuid := '13000000-0000-4000-8000-000000000001';
  first_text constant text := '{"playerName":"Málaga","saveVersion":1}';
  next_text constant text := '{"playerName":"Málaga","saveVersion":1,"year":2028}';
  first_revision uuid;
  first_saved_at timestamptz;
  next_revision uuid;
  next_saved_at timestamptz;
  affected integer;
begin
  insert into public.soccer_career_account_saves (user_id, slot, save_text)
    values (owner_id, 1, first_text)
    returning revision, saved_at into first_revision, first_saved_at;
  if first_revision is null or first_saved_at is null then
    raise exception 'Inserts must return server-generated revision and time';
  end if;

  begin
    insert into public.soccer_career_account_saves (user_id, slot, save_text)
      values (owner_id, 1, 'concurrent first attempt');
    raise exception 'A second insert replaced or duplicated the first save';
  exception when unique_violation then null;
  end;

  update public.soccer_career_account_saves set save_text = next_text
    where user_id = owner_id and slot = 1 and revision = first_revision
    returning revision, saved_at into next_revision, next_saved_at;
  if next_revision is null or next_revision = first_revision or next_saved_at < first_saved_at then
    raise exception 'Update did not rotate the revision and assign server time';
  end if;

  update public.soccer_career_account_saves set save_text = 'stale writer'
    where user_id = owner_id and slot = 1 and revision = first_revision;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Stale writer changed the account save'; end if;

  delete from public.soccer_career_account_saves
    where user_id = owner_id and slot = 1 and revision = first_revision;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Stale deletion removed the account save'; end if;

  begin
    update public.soccer_career_account_saves set save_text = repeat('é', 1000001)
      where user_id = owner_id and slot = 1 and revision = next_revision;
    raise exception 'Payloads over 2 MB in UTF-8 were accepted';
  exception when check_violation then null;
  end;
  begin
    insert into public.soccer_career_account_saves (user_id, slot, save_text)
      values (owner_id, 2, '');
    raise exception 'An empty backup was accepted';
  exception when check_violation then null;
  end;
  begin
    insert into public.soccer_career_account_saves (user_id, slot, save_text)
      values (owner_id, 4, first_text);
    raise exception 'An out-of-range slot was accepted';
  exception when check_violation then null;
  end;
  if (select save_text from public.soccer_career_account_saves
      where user_id = owner_id and slot = 1 and revision = next_revision) is distinct from next_text then
    raise exception 'A refused write did not preserve the latest exact bytes';
  end if;

  begin
    update public.soccer_career_account_saves set saved_at = '2000-01-01';
    raise exception 'Authenticated could forge server metadata';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.soccer_career_account_saves set user_id = '13000000-0000-4000-8000-000000000002';
    raise exception 'Authenticated could assign a backup to another owner';
  exception when insufficient_privilege then null;
  end;
end;
$$;
select 'ok 1 - Owner writes rotate revisions and refusals preserve the current bytes';

set local "request.jwt.claims" = '{"sub":"13000000-0000-4000-8000-000000000002","role":"authenticated","is_anonymous":false}';
do $$
declare
  first_user constant uuid := '13000000-0000-4000-8000-000000000001';
  second_user constant uuid := '13000000-0000-4000-8000-000000000002';
  kept_revision uuid;
  affected integer;
begin
  if exists (select 1 from public.soccer_career_account_saves where user_id = first_user) then
    raise exception 'A second owner could see the first owner''s saves';
  end if;
  update public.soccer_career_account_saves set save_text = 'wrong owner' where user_id = first_user;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'A second owner could update the first owner''s saves'; end if;
  delete from public.soccer_career_account_saves where user_id = first_user;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'A second owner could delete the first owner''s saves'; end if;
  begin
    insert into public.soccer_career_account_saves (user_id, slot, save_text)
      values (first_user, 2, 'wrong owner');
    raise exception 'A second owner could insert a backup for the first owner';
  exception when insufficient_privilege then null;
  end;
  insert into public.soccer_career_account_saves (user_id, slot, save_text)
    values (second_user, 1, 'second owner'), (second_user, 2, 'delete this copy');
  select revision into kept_revision from public.soccer_career_account_saves where user_id = second_user and slot = 2;
  delete from public.soccer_career_account_saves where user_id = second_user and slot = 2 and revision = kept_revision;
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'A current owner could not remove a matching backup'; end if;
end;
$$;
select 'ok 2 - Account slots are independent and private to their owners';

set local "request.jwt.claims" = '{"sub":"13000000-0000-4000-8000-000000000002","role":"authenticated","is_anonymous":true}';
do $$
begin
  if exists (select 1 from public.soccer_career_account_saves) then
    raise exception 'An anonymous Auth session could load backups';
  end if;
  begin
    insert into public.soccer_career_account_saves (user_id, slot, save_text)
      values ('13000000-0000-4000-8000-000000000002', 3, 'anonymous');
    raise exception 'An anonymous Auth session could store a backup';
  exception when insufficient_privilege then null;
  end;
end;
$$;
set local role anon;
do $$
begin
  begin
    perform 1 from public.soccer_career_account_saves;
    raise exception 'The public API role could read account backups';
  exception when insufficient_privilege then null;
  end;
end;
$$;
select 'ok 3 - Guest and anonymous Auth roles cannot use account backups';

set local role service_role;
do $$
begin
  if (select count(*) from public.soccer_career_account_saves
      where user_id = '13000000-0000-4000-8000-000000000001') <> 1 then
    raise exception 'The service role could not export backups for the requested owner';
  end if;
  begin
    delete from public.soccer_career_account_saves;
    raise exception 'The service role received an unintended table write grant';
  exception when insufficient_privilege then null;
  end;
end;
$$;
select 'ok 4 - The server privacy export has read-only table access';

reset role;
delete from auth.users where id = '13000000-0000-4000-8000-000000000001';
do $$
begin
  if exists (select 1 from public.soccer_career_account_saves
      where user_id = '13000000-0000-4000-8000-000000000001')
    or not exists (select 1 from public.soccer_career_account_saves
      where user_id = '13000000-0000-4000-8000-000000000002') then
    raise exception 'Account deletion did not cascade only to that owner''s backups';
  end if;
end;
$$;
select 'ok 5 - Account deletion cascades only to the deleted owner';
rollback;
