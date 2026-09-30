-- Round 732 (2026-09-30): tennis_grand_slam_winners, checked row by row.
--
-- UNAPPLIED. Written for review; the lead applies it through the Supabase MCP's
-- execute_sql, the whole file, its own begin and commit included. It was never
-- run against production, not even as a rolled back rehearsal.
--
-- The record is scripts/data/tennisSlamsVerified2026-09.json: all 1019 rows as read,
-- each with the value both sources print and the two source URLs.
-- 1004 verified, 5 corrected, 6 filled, 10 dropped: 1019 rows become 1015.
-- scripts/simTennisSlams.mjs replays this file over the record and fails if the
-- end state disagrees with it. Comments do not run, so this header may change.
--
-- GUARDS. Nothing is written if the table moved since it was read: the first
-- block hashes every row and raises unless it still matches the read of
-- 2026-09-30 (1019 rows, md5 b38dcee411367a649aaea2c076328138). Every update and delete
-- also names the row by id AND by the value read, and every insert is skipped if
-- its event already has a row. The last block hashes the end state and raises
-- unless it is exactly the record's, so a statement that misses its row rolls the
-- whole file back.
--
-- SCHEMA. Two Australian Opens were played in 1977, in January and December, and
-- the table held one row per event per year, so December's champions were
-- missing. A nullable edition column now names the edition where a year had two;
-- it is null everywhere else. A unique index on (tournament, category, year,
-- coalesce(edition, '')) holds the one row per edition shape. Readers checked:
-- src/lib/listQuiz.ts selects champion by tournament, supabase/functions/
-- tennis-chain-validate selects champion, year and tournament, and
-- scripts/simUnboundedSelects.mjs the same three. None selects *, none reads the
-- new column, and none assumes one row per year.
--
-- CHANGES
--   edition  id 67: 1977 Australian Open Men's Singles, Roscoe Tanner, set to January. Sources: https://ausopen.com/history/honour-roll/mens-singles and https://www.espn.com/tennis/history
--   edition  id 169: 1977 Australian Open Women's Singles, Kerry Melville Reid, set to January. Sources: https://ausopen.com/history/honour-roll/womens-singles and https://www.espn.com/tennis/history/_/type/women
--   correct  id 351: 2026 French Open Men's Singles, NULL becomes Alexander Zverev. Sources: https://www.rolandgarros.com/en-us/palmares and https://www.espn.com/tennis/history
--   correct  id 356: 1901 French Open Women's Singles, Suzanne Girod becomes P. Girod. Sources: https://www.rolandgarros.com/en-us/palmares and https://www.espn.com/tennis/history/_/type/women
--   correct  id 477: 2026 French Open Women's Singles, NULL becomes Mirra Andreeva. Sources: https://www.rolandgarros.com/en-us/palmares and https://www.espn.com/tennis/history/_/type/women
--   insert   1977 (December) Australian Open Men's Singles, Vitas Gerulaitis. Sources: https://ausopen.com/history/honour-roll/mens-singles and https://www.espn.com/tennis/history
--   insert   1977 (December) Australian Open Women's Singles, Evonne Goolagong. Sources: https://ausopen.com/history/honour-roll/womens-singles and https://www.espn.com/tennis/history/_/type/women
--   insert   2026 Wimbledon Men's Singles, Jannik Sinner. Sources: https://www.wimbledon.com/en_GB/scores/draws/2026_MS_draw.pdf and https://www.espn.com/tennis/history
--   insert   2026 Wimbledon Women's Singles, Linda Nosková. Sources: https://www.wimbledon.com/en_GB/scores/draws/2026_LS_draw.pdf and https://www.espn.com/tennis/history/_/type/women
--   insert   2026 US Open Men's Singles, Alexander Zverev. Sources: https://www.usopen.org/en_US/json/man/past_champions.json and https://www.espn.com/tennis/history
--   insert   2026 US Open Women's Singles, Elena Rybakina. Sources: https://www.usopen.org/en_US/json/man/past_champions.json and https://www.espn.com/tennis/history/_/type/women
--   delete   id 266: 1941 French Open Men's Singles, Bernard Destremau. Not a French Championships title: the Roland-Garros list and ESPN both go from 1939 to 1946. Sources: https://www.rolandgarros.com/en-us/palmares and https://www.espn.com/tennis/history
--   delete   id 267: 1942 French Open Men's Singles, Bernard Destremau. Not a French Championships title: the Roland-Garros list and ESPN both go from 1939 to 1946. Sources: https://www.rolandgarros.com/en-us/palmares and https://www.espn.com/tennis/history
--   delete   id 268: 1943 French Open Men's Singles, Yvon Petra. Not a French Championships title: the Roland-Garros list and ESPN both go from 1939 to 1946. Sources: https://www.rolandgarros.com/en-us/palmares and https://www.espn.com/tennis/history
--   delete   id 269: 1944 French Open Men's Singles, Yvon Petra. Not a French Championships title: the Roland-Garros list and ESPN both go from 1939 to 1946. Sources: https://www.rolandgarros.com/en-us/palmares and https://www.espn.com/tennis/history
--   delete   id 270: 1945 French Open Men's Singles, Yvon Petra. Not a French Championships title: the Roland-Garros list and ESPN both go from 1939 to 1946. Sources: https://www.rolandgarros.com/en-us/palmares and https://www.espn.com/tennis/history
--   delete   id 392: 1941 French Open Women's Singles, Alice Weiwers. Not a French Championships title: the Roland-Garros list and ESPN both go from 1939 to 1946. Sources: https://www.rolandgarros.com/en-us/palmares and https://www.espn.com/tennis/history/_/type/women
--   delete   id 393: 1942 French Open Women's Singles, Alice Weiwers. Not a French Championships title: the Roland-Garros list and ESPN both go from 1939 to 1946. Sources: https://www.rolandgarros.com/en-us/palmares and https://www.espn.com/tennis/history/_/type/women
--   delete   id 394: 1943 French Open Women's Singles, Simone Iribarne Lafargue. Not a French Championships title: the Roland-Garros list and ESPN both go from 1939 to 1946. Sources: https://www.rolandgarros.com/en-us/palmares and https://www.espn.com/tennis/history/_/type/women
--   delete   id 395: 1944 French Open Women's Singles, Raymonde Jones Veber. Not a French Championships title: the Roland-Garros list and ESPN both go from 1939 to 1946. Sources: https://www.rolandgarros.com/en-us/palmares and https://www.espn.com/tennis/history/_/type/women
--   delete   id 396: 1945 French Open Women's Singles, Lolette Payot-Dodille. Not a French Championships title: the Roland-Garros list and ESPN both go from 1939 to 1946. Sources: https://www.rolandgarros.com/en-us/palmares and https://www.espn.com/tennis/history/_/type/women
--   score    every score with no digit in it becomes NULL. No row held a score:
--            1,010 held a three letter nation code, 7 held footnote debris, 2 were
--            NULL. No reader selects the column.
--
-- AFTER APPLYING: run get_advisors (this adds a column and an index), read the
-- count with count(*) (1015), and run node scripts/simTennisSlams.mjs.
-- Not in scope: runner_up is still NULL on every row.

begin;

do $$
declare n int; h text;
begin
  select count(*), md5(string_agg(id || '|' || year || '|' || tournament || '|' || category || '|' || coalesce(champion, '<NULL>'), E'\n' order by id))
    into n, h from public.tennis_grand_slam_winners;
  if n <> 1019 or h <> 'b38dcee411367a649aaea2c076328138' then
    raise exception 'Round 732: tennis_grand_slam_winners moved since it was read (% rows, md5 %), nothing written', n, h;
  end if;
end $$;

alter table public.tennis_grand_slam_winners add column edition text;
comment on column public.tennis_grand_slam_winners.edition is 'Names the edition when one event was played twice in a year (the 1977 Australian Open, January and December). Null otherwise.';

update public.tennis_grand_slam_winners set edition = 'January' where id = 67 and tournament = 'Australian Open' and category = 'Men''s Singles' and year = 1977 and champion = 'Roscoe Tanner' and edition is null;
update public.tennis_grand_slam_winners set edition = 'January' where id = 169 and tournament = 'Australian Open' and category = 'Women''s Singles' and year = 1977 and champion = 'Kerry Melville Reid' and edition is null;

update public.tennis_grand_slam_winners set champion = 'Alexander Zverev' where id = 351 and tournament = 'French Open' and category = 'Men''s Singles' and year = 2026 and champion is null;
update public.tennis_grand_slam_winners set champion = 'P. Girod' where id = 356 and tournament = 'French Open' and category = 'Women''s Singles' and year = 1901 and champion = 'Suzanne Girod';
update public.tennis_grand_slam_winners set champion = 'Mirra Andreeva' where id = 477 and tournament = 'French Open' and category = 'Women''s Singles' and year = 2026 and champion is null;

delete from public.tennis_grand_slam_winners where id = 266 and tournament = 'French Open' and category = 'Men''s Singles' and year = 1941 and champion = 'Bernard Destremau';
delete from public.tennis_grand_slam_winners where id = 267 and tournament = 'French Open' and category = 'Men''s Singles' and year = 1942 and champion = 'Bernard Destremau';
delete from public.tennis_grand_slam_winners where id = 268 and tournament = 'French Open' and category = 'Men''s Singles' and year = 1943 and champion = 'Yvon Petra';
delete from public.tennis_grand_slam_winners where id = 269 and tournament = 'French Open' and category = 'Men''s Singles' and year = 1944 and champion = 'Yvon Petra';
delete from public.tennis_grand_slam_winners where id = 270 and tournament = 'French Open' and category = 'Men''s Singles' and year = 1945 and champion = 'Yvon Petra';
delete from public.tennis_grand_slam_winners where id = 392 and tournament = 'French Open' and category = 'Women''s Singles' and year = 1941 and champion = 'Alice Weiwers';
delete from public.tennis_grand_slam_winners where id = 393 and tournament = 'French Open' and category = 'Women''s Singles' and year = 1942 and champion = 'Alice Weiwers';
delete from public.tennis_grand_slam_winners where id = 394 and tournament = 'French Open' and category = 'Women''s Singles' and year = 1943 and champion = 'Simone Iribarne Lafargue';
delete from public.tennis_grand_slam_winners where id = 395 and tournament = 'French Open' and category = 'Women''s Singles' and year = 1944 and champion = 'Raymonde Jones Veber';
delete from public.tennis_grand_slam_winners where id = 396 and tournament = 'French Open' and category = 'Women''s Singles' and year = 1945 and champion = 'Lolette Payot-Dodille';

insert into public.tennis_grand_slam_winners (tournament, category, year, edition, champion)
select 'Australian Open', 'Men''s Singles', 1977, 'December', 'Vitas Gerulaitis'
where not exists (select 1 from public.tennis_grand_slam_winners where tournament = 'Australian Open' and category = 'Men''s Singles' and year = 1977 and coalesce(edition, '') = 'December');
insert into public.tennis_grand_slam_winners (tournament, category, year, edition, champion)
select 'Australian Open', 'Women''s Singles', 1977, 'December', 'Evonne Goolagong'
where not exists (select 1 from public.tennis_grand_slam_winners where tournament = 'Australian Open' and category = 'Women''s Singles' and year = 1977 and coalesce(edition, '') = 'December');
insert into public.tennis_grand_slam_winners (tournament, category, year, edition, champion)
select 'Wimbledon', 'Men''s Singles', 2026, null, 'Jannik Sinner'
where not exists (select 1 from public.tennis_grand_slam_winners where tournament = 'Wimbledon' and category = 'Men''s Singles' and year = 2026 and coalesce(edition, '') = '');
insert into public.tennis_grand_slam_winners (tournament, category, year, edition, champion)
select 'Wimbledon', 'Women''s Singles', 2026, null, 'Linda Nosková'
where not exists (select 1 from public.tennis_grand_slam_winners where tournament = 'Wimbledon' and category = 'Women''s Singles' and year = 2026 and coalesce(edition, '') = '');
insert into public.tennis_grand_slam_winners (tournament, category, year, edition, champion)
select 'US Open', 'Men''s Singles', 2026, null, 'Alexander Zverev'
where not exists (select 1 from public.tennis_grand_slam_winners where tournament = 'US Open' and category = 'Men''s Singles' and year = 2026 and coalesce(edition, '') = '');
insert into public.tennis_grand_slam_winners (tournament, category, year, edition, champion)
select 'US Open', 'Women''s Singles', 2026, null, 'Elena Rybakina'
where not exists (select 1 from public.tennis_grand_slam_winners where tournament = 'US Open' and category = 'Women''s Singles' and year = 2026 and coalesce(edition, '') = '');

update public.tennis_grand_slam_winners set score = null where score is not null and score !~ '[0-9]';

create unique index tennis_grand_slam_winners_one_per_edition on public.tennis_grand_slam_winners (tournament, category, year, coalesce(edition, ''));

do $$
declare n int; h text;
begin
  select count(*), md5(string_agg(year || '|' || tournament || '|' || category || '|' || coalesce(edition, '') || '|' || coalesce(champion, '<NULL>'), E'\n'
           order by year, tournament collate "C", category collate "C", coalesce(edition, '') collate "C"))
    into n, h from public.tennis_grand_slam_winners;
  if n <> 1015 or h <> '3ec3d6321de5f2da78d997c59a85b269' then
    raise exception 'Round 732: the end state is not the record (% rows, md5 %), rolled back', n, h;
  end if;
end $$;

commit;
