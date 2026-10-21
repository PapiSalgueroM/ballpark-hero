#!/usr/bin/env bash
set -euo pipefail
# Fictional rows only. Never run this against an application database.
[[ "$(psql -XAt -c 'select current_database()')" == "account_privacy_test" ]] || { echo 'Refusing non-test database' >&2; exit 1; }
scratch="$(mktemp -d)"
trap 'for pid in $(jobs -pr); do kill "$pid" 2>/dev/null || true; done; rm -f "$scratch"/*.log; rmdir "$scratch"' EXIT
psql -X -v ON_ERROR_STOP=1 -v PRIVACY_CONCURRENCY_SETUP=1 -f scripts/testAccountPrivacyDb.sql > "$scratch/setup.log" 2>&1 || { cat "$scratch/setup.log"; exit 1; }
case "${PRIVACY_CONCURRENCY_CONTROL:-}" in
  "") ;;
  role-lock|mfa-lock|storage-lock)
    psql -X -v ON_ERROR_STOP=1 -v control="$PRIVACY_CONCURRENCY_CONTROL" <<'SQL'
select set_config('privacy_test.control', :'control', false);
do $$
declare source text; old_line text; new_line text;
begin
  source := pg_get_functiondef('private.account_privacy_guard_auth_delete()'::regprocedure);
  case current_setting('privacy_test.control')
    when 'role-lock' then
      old_line := 'perform 1 from public.user_roles where user_id = old.id order by id for update;';
      new_line := 'perform 1 from public.user_roles where user_id = old.id order by id;';
    when 'mfa-lock' then
      old_line := 'perform 1 from auth.mfa_factors where user_id = old.id order by id for update;';
      new_line := 'perform 1 from auth.mfa_factors where user_id = old.id order by id;';
    when 'storage-lock' then
      old_line := 'lock table storage.objects, storage.buckets in share mode;';
      new_line := 'perform 1;';
  end case;
  if position(old_line in source)=0 then raise exception 'Negative control did not change its target'; end if;
  execute replace(source,old_line,new_line);
end $$;
SQL
    ;;
  *) echo 'Unknown concurrency negative control' >&2; exit 1 ;;
esac
psql -X -v ON_ERROR_STOP=1 <<'SQL'
insert into auth.users values
 ('44444444-4444-4444-8444-444444444444'),('55555555-5555-4555-8555-555555555555'),
 ('66666666-6666-4666-8666-666666666666'),('77777777-7777-4777-8777-777777777777'),
 ('88888888-8888-4888-8888-888888888888'),('99999999-9999-4999-8999-999999999998'),
 ('a1000000-0000-4000-8000-000000000001'),('a1000000-0000-4000-8000-000000000002'),
 ('a2000000-0000-4000-8000-000000000001'),('a2000000-0000-4000-8000-000000000002');
insert into public.user_roles(user_id,role) values
 ('44444444-4444-4444-8444-444444444444','user'),('55555555-5555-4555-8555-555555555555','user');
insert into auth.mfa_factors(id,user_id,status) values
 ('88888888-8888-4888-8888-888888888888','88888888-8888-4888-8888-888888888888','unverified'),
 ('99999999-9999-4999-8999-999999999998','99999999-9999-4999-8999-999999999998','unverified');
create function private.account_privacy_test_pause_delete()
returns trigger language plpgsql volatile as $$
begin
  raise notice 'PRIVACY_DELETE_LOCKED';
  perform pg_sleep(1);
  return old;
end $$;
create trigger zz_account_privacy_test_pause_delete before delete on auth.users
for each row execute function private.account_privacy_test_pause_delete();
SQL
wait_marker() {
  local log="$1" marker="$2" pid="$3"
  for _ in $(seq 1 200); do
    grep -q "$marker" "$log" && return
    kill -0 "$pid" 2>/dev/null || { cat "$log"; echo "Exited before $marker" >&2; exit 1; }
    sleep 0.05
  done
  cat "$log"; echo "Timed out waiting for $marker" >&2; exit 1
}
expect_guard_refusal() {
  if psql -X -v ON_ERROR_STOP=1 -c "delete from auth.users where id='$1'" > "$2" 2>&1; then
    cat "$2"; echo 'Expected atomic deletion refusal' >&2; exit 1
  fi
  grep -q 'account_privacy_manual_required' "$2" || { cat "$2"; exit 1; }
}
# Each existing-row writer commits while the DELETE waits. Its next query must
# see the newly committed admin or verified factor under a fresh snapshot.
for kind in role mfa; do
  if [[ "$kind" == role ]]; then
    id=44444444-4444-4444-8444-444444444444
    update="update public.user_roles set role='admin' where user_id='$id';"
  else
    id=88888888-8888-4888-8888-888888888888
    update="update auth.mfa_factors set status='verified' where user_id='$id';"
  fi
  psql -X -v ON_ERROR_STOP=1 > "$scratch/$kind-first.log" 2>&1 <<SQL &
begin;
$update
\echo PRIVACY_WRITER_LOCKED
select pg_sleep(1);
commit;
SQL
  writer_pid=$!
  wait_marker "$scratch/$kind-first.log" PRIVACY_WRITER_LOCKED "$writer_pid"
  expect_guard_refusal "$id" "$scratch/$kind-first-delete.log"
  wait "$writer_pid"
done
# A new protected child inserted first holds the existing FK's parent lock.
for kind in role mfa; do
  if [[ "$kind" == role ]]; then
    id=a1000000-0000-4000-8000-000000000001
    insert="insert into public.user_roles(user_id,role) values ('$id','admin');"
  else
    id=a2000000-0000-4000-8000-000000000001
    insert="insert into auth.mfa_factors(id,user_id,status) values ('$id','$id','verified');"
  fi
  psql -X -v ON_ERROR_STOP=1 > "$scratch/$kind-insert-first.log" 2>&1 <<SQL &
begin;
$insert
\echo PRIVACY_CHILD_INSERTED
select pg_sleep(1);
commit;
SQL
  writer_pid=$!
  wait_marker "$scratch/$kind-insert-first.log" PRIVACY_CHILD_INSERTED "$writer_pid"
  expect_guard_refusal "$id" "$scratch/$kind-insert-first-delete.log"
  wait "$writer_pid"
done
# Stronger isolation is refused instead of reading an old transaction snapshot.
if psql -X -v ON_ERROR_STOP=1 > "$scratch/isolation.log" 2>&1 <<'SQL'
begin isolation level repeatable read;
delete from auth.users where id='22222222-2222-4222-8222-222222222222';
commit;
SQL
then echo 'Unsupported isolation allowed deletion' >&2; exit 1; fi
grep -q 'account_privacy_manual_required' "$scratch/isolation.log" || { cat "$scratch/isolation.log"; exit 1; }
# A Storage write already holding RowExclusive must commit before the SHARE
# lock is obtained, so its ownership is visible to the guard.
psql -X -v ON_ERROR_STOP=1 > "$scratch/storage-first.log" 2>&1 <<'SQL' &
begin;
insert into storage.objects(owner_id) values ('66666666-6666-4666-8666-666666666666');
\echo PRIVACY_WRITER_LOCKED
select pg_sleep(1);
commit;
SQL
writer_pid=$!
wait_marker "$scratch/storage-first.log" PRIVACY_WRITER_LOCKED "$writer_pid"
expect_guard_refusal 66666666-6666-4666-8666-666666666666 "$scratch/storage-first-delete.log"
wait "$writer_pid"
# Delete owns existing role/factor rows first. A later status change cannot commit
# a newly protected state and then lose it to the same deletion.
for kind in role mfa; do
  if [[ "$kind" == role ]]; then
    id=55555555-5555-4555-8555-555555555555
    update="update public.user_roles set role='admin' where user_id='$id';"
  else
    id=99999999-9999-4999-8999-999999999998
    update="update auth.mfa_factors set status='verified' where user_id='$id';"
  fi
  psql -X -v ON_ERROR_STOP=1 > "$scratch/delete-first-$kind.log" 2>&1 <<SQL &
begin;
delete from auth.users where id='$id';
commit;
SQL
  deleter_pid=$!
  wait_marker "$scratch/delete-first-$kind.log" PRIVACY_DELETE_LOCKED "$deleter_pid"
  if psql -X -v ON_ERROR_STOP=1 > "$scratch/$kind-second.log" 2>&1 <<SQL
do \$\$ begin
  $update
  if not found then raise exception 'Protected subject already deleted'; end if;
end \$\$;
SQL
  then cat "$scratch/$kind-second.log"; echo 'Protected update committed after delete guard' >&2; exit 1; fi
  grep -q 'Protected subject already deleted' "$scratch/$kind-second.log" || { cat "$scratch/$kind-second.log"; exit 1; }
  wait "$deleter_pid"
done
# With DELETE first, a new child must wait on the parent and then fail its FK.
for kind in role mfa; do
  if [[ "$kind" == role ]]; then
    id=a1000000-0000-4000-8000-000000000002
    insert="insert into public.user_roles(user_id,role) values ('$id','admin');"
  else
    id=a2000000-0000-4000-8000-000000000002
    insert="insert into auth.mfa_factors(id,user_id,status) values ('$id','$id','verified');"
  fi
  psql -X -v ON_ERROR_STOP=1 > "$scratch/delete-first-$kind-insert.log" 2>&1 <<SQL &
begin;
delete from auth.users where id='$id';
commit;
SQL
  deleter_pid=$!
  wait_marker "$scratch/delete-first-$kind-insert.log" PRIVACY_DELETE_LOCKED "$deleter_pid"
  PGAPPNAME=privacy_child_insert_writer psql -X -v ON_ERROR_STOP=1 > "$scratch/$kind-insert-second.log" 2>&1 <<SQL &
do \$\$ begin
  $insert
  raise exception 'New protected child unexpectedly inserted';
exception when foreign_key_violation then
  raise notice 'PRIVACY_CHILD_FK_REJECTED';
end \$\$;
SQL
  writer_pid=$!
  blocked=0
  for _ in $(seq 1 100); do
    if [[ "$(psql -XAt -c "select count(*) from pg_stat_activity where application_name='privacy_child_insert_writer' and wait_event_type='Lock'")" == 1 ]]; then blocked=1; break; fi
    kill -0 "$writer_pid" 2>/dev/null || break
    sleep 0.01
  done
  [[ "$blocked" == 1 ]] || { cat "$scratch/$kind-insert-second.log"; echo 'New child did not wait on Auth parent' >&2; exit 1; }
  wait "$deleter_pid"
  wait "$writer_pid"
  grep -q 'PRIVACY_CHILD_FK_REJECTED' "$scratch/$kind-insert-second.log" || { cat "$scratch/$kind-insert-second.log"; exit 1; }
done
# Once SHARE is held, later trusted-service writes wait through commit. They can
# still write ownership after deletion: no provider-owned schema is altered, and
# future privileged uploads are outside this feature's boundary.
psql -X -v ON_ERROR_STOP=1 > "$scratch/delete-first-storage.log" 2>&1 <<'SQL' &
begin;
delete from auth.users where id='77777777-7777-4777-8777-777777777777';
commit;
SQL
deleter_pid=$!
wait_marker "$scratch/delete-first-storage.log" PRIVACY_DELETE_LOCKED "$deleter_pid"
PGAPPNAME=privacy_storage_writer psql -X -v ON_ERROR_STOP=1 > "$scratch/storage-second.log" 2>&1 -c "insert into storage.objects(owner_id) values ('77777777-7777-4777-8777-777777777777')" &
writer_pid=$!
blocked=0
for _ in $(seq 1 100); do
  if [[ "$(psql -XAt -c "select count(*) from pg_stat_activity where application_name='privacy_storage_writer' and wait_event_type='Lock'")" == 1 ]]; then blocked=1; break; fi
  kill -0 "$writer_pid" 2>/dev/null || break
  sleep 0.01
done
[[ "$blocked" == 1 ]] || { cat "$scratch/storage-second.log"; echo 'Storage write bypassed deletion SHARE lock' >&2; exit 1; }
wait "$deleter_pid"
wait "$writer_pid"
psql -X -v ON_ERROR_STOP=1 <<'SQL'
do $$ begin
  if not exists(select 1 from auth.users where id='44444444-4444-4444-8444-444444444444')
    or not exists(select 1 from public.user_roles where user_id='44444444-4444-4444-8444-444444444444' and role='admin')
    or not exists(select 1 from auth.users where id='88888888-8888-4888-8888-888888888888')
    or not exists(select 1 from auth.mfa_factors where user_id='88888888-8888-4888-8888-888888888888' and status='verified')
    or not exists(select 1 from auth.users where id='66666666-6666-4666-8666-666666666666') then
    raise exception 'A protected account was deleted';
  end if;
  if exists(select 1 from auth.users where id in ('55555555-5555-4555-8555-555555555555','77777777-7777-4777-8777-777777777777','99999999-9999-4999-8999-999999999998'))
    or exists(select 1 from auth.mfa_factors where user_id='99999999-9999-4999-8999-999999999998')
    or exists(select 1 from public.user_roles where user_id='55555555-5555-4555-8555-555555555555') then
    raise exception 'Delete-first fixture did not complete';
  end if;
end $$;
-- Synthetic Storage metadata only, in this disposable database.
delete from storage.objects where owner_id='77777777-7777-4777-8777-777777777777';
SQL
echo 'PASS: admin, MFA and Storage races in both lock orderings'

