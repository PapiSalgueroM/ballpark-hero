// Round 1587: the guard hashes of the lead's Q2 (player_market_values) and Q3 (soccer_player_club_stints) exports,
// in node, so a harness can check that every exported h is the recipe of its own row and that a rewritten row is the
// old row with only club changed. The SQL twin of each recipe is written into the migration and the applied form by
// scripts/qa/genClubNamesakes1587.mjs and run for real in PGlite by scripts/qa/rehearseClubNamesakes1587.mjs.
// Recipes (draft-1584, open question 1, as the lead ran them):
//   Q2 md5(concat_ws('|', id::bigint::text, coalesce(player_name,'~'), coalesce(club,'~'), coalesce(year::int::text,'~'),
//        coalesce(age::int::text,'~'), coalesce(nationality,'~'), coalesce(position,'~'),
//        coalesce(round(market_value_usd)::bigint::text,'~')))
//   Q3 md5(concat_ws('|', id::bigint::text, coalesce(player_name,'~'), coalesce(club,'~'),
//        coalesce(first_year::int::text,'~'), coalesce(last_year::int::text,'~'), coalesce(nationality,'~'),
//        coalesce(position,'~')))
// Every column a recipe reads is never NULL in the exports except where coalesce says '~', so concat_ws drops nothing.
import { createHash } from 'node:crypto';

const md5 = (s) => createHash('md5').update(s, 'utf8').digest('hex');
const t = (v) => (v == null ? '~' : String(v));
const int = (v) => (v == null ? '~' : String(Math.trunc(Number(v))));
const rnd = (v) => (v == null ? '~' : String(Math.round(Number(v))));

export const marketHash = (r, club = r.club) =>
  md5([String(r.id), t(r.player_name), t(club), int(r.year), int(r.age), t(r.nationality), t(r.position), rnd(r.market_value_usd)].join('|'));
export const stintHash = (r, club = r.club) =>
  md5([String(r.id), t(r.player_name), t(club), int(r.first_year), int(r.last_year), t(r.nationality), t(r.position)].join('|'));
// The lead's file fingerprint: md5(string_agg(id || ':' || h, ',' order by id)), equal to Postgres's own aggregate.
export const fingerprint = (rows) => md5(rows.slice().sort((a, b) => a.id - b.id).map((r) => `${r.id}:${r.h}`).join(','));

export const SQL_MARKET_HASH = (a, club) => `md5(concat_ws('|', ${a}.id::bigint::text, coalesce(${a}.player_name, '~'), coalesce(${club}, '~'), coalesce(${a}.year::int::text, '~'), coalesce(${a}.age::int::text, '~'), coalesce(${a}.nationality, '~'), coalesce(${a}.position, '~'), coalesce(round(${a}.market_value_usd)::bigint::text, '~')))`;
export const SQL_STINT_HASH = (a, club) => `md5(concat_ws('|', ${a}.id::bigint::text, coalesce(${a}.player_name, '~'), coalesce(${club}, '~'), coalesce(${a}.first_year::int::text, '~'), coalesce(${a}.last_year::int::text, '~'), coalesce(${a}.nationality, '~'), coalesce(${a}.position, '~')))`;
