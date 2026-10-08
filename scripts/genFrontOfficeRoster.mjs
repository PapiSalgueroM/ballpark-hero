/* The front office roster, derived: real 2026 squads with a real defence.

   ROUND 1130: ONE NUMBER PER MAN. The notes below describe the SELECTION
   rule (who a club's fifteen are, and the seed rating that picks them) and
   the legacy depth recipe. Since Round 1130 the seed rating is an inside
   step only: it decides who the fifteen are and proves the frozen checkpoint
   still fits the record, and then every man of the pool (the fifteen, the
   bench, the practice squad) is rated ONCE by the frozen multiyear model in
   nflFoRatingModel.mjs over nflFoRatingInputs2026.json, and that one number
   is written on his row in whichever file carries him. The depth file no
   longer carries a second number for the fifteen, and the engine no longer
   overrides anything. Row order in the starters file is still the selection
   rule's pick order, never a ranking by the number printed on the row.
   The checkpoint's public-source observations have one lineage, not
   two-source verified historical statistics. Blocking quality and other gaps
   remain marked.
   {legacyDepth:true} exports the seed starters text and the original depth
   scale, byte for byte as before Round 889, for mechanics baselines.
   {ratingModel:'v2.2'} is the frozen arm: the new file shape carrying the
   checkpoint's own numbers, which is what a board league read before the
   files were unified. No file on disk is written from it once a later model
   is the default.

   Round 416. The owner's P1 item 12 from 2026-08-28: "Trade Finder (US
   sports): only offensive players appear, and rosters are outdated." Both
   halves were true and both are fixed here.

   NO DEFENDERS. src/data/frontOfficePlayers.ts carried QB, RB, WR, TE and OL
   and nothing else, because the bake had no defensive production to rate
   anyone on: the site's nflfastr_player_stats table is offense only. The
   nflverse stats_player release is not. Its 2025 file carries def_sacks,
   def_tackles_solo, def_tackle_assists, def_tackles_for_loss, def_qb_hits,
   def_interceptions, def_pass_defended and def_fumbles_forced, so a defender
   can finally be rated on something he actually did.

   WHAT THAT RELEASE STILL CANNOT DO, and it changed the method: there is no
   coverage column in it. No completions allowed, no yards allowed, no passer
   rating against; the one "targets" column is the receiver's. Counting stats
   therefore rate a cover corner by how often teams were willing to throw at
   him, which is upside down. The first bake put Sauce Gardner, the fourth
   pick of his draft, last among every defensive back in the league on 28
   tackles and no interceptions, and that is a false statement about a real,
   named person, which this repo does not ship. So a defender is rated on a
   blend of that production and his draft pedigree, weighted by how much of
   the job at his position the counting stats can actually see. Both halves
   are public record, neither is invented, and it is the file's own method
   rather than a new one: offensive linemen have always been rated on pedigree
   alone for the same reason, that their job produces nothing countable.

   OUTDATED. The old file was baked 2026-08-05 from the 2025 rosters, and the
   site's roster table still ends at 2025. The nflverse rosters release
   publishes 2026, which is the squad list for the season starting this week
   (Aaron Rodgers reads PIT in it). That is the roster used here.

   HOW A RATING IS MADE, and it is the same idea for everyone: rank a player
   against the others at his position on a production score, then map that
   rank onto the scale this file has always used. Nothing is invented and no
   rating is typed by hand.
     skill (QB, RB, WR, TE)  2025 regular plus post season production, on the
                             fantasy basis the old bake used: passing yards
                             and touchdowns, rushing yards and touchdowns,
                             receptions and receiving yards and touchdowns.
     defence (DL, LB, DB)    a blend of 2025 defensive production
                             (sacks weigh most, then tackles for loss, QB
                             hits, interceptions, passes defended, forced
                             fumbles, then tackles) and draft pedigree. The
                             blend is not a fudge, it is what the data can
                             honestly support: the public release has no
                             coverage column of any kind, so production alone
                             rates a corner nobody throws at as the worst
                             defender in the league. Both halves are public
                             record. See the long note in buildRoster.
     OL                      no production exists for linemen in any public
                             feed, so pedigree and service: draft position
                             and years played, which is what the old bake
                             used for them and says so.
   Production is counted PER GAME in every case, never per season, because a
   season total measures how much of the year a player was available for and
   that is not a statement about how good he is. A player with no 2025
   production at all, or fewer than MIN_GAMES of it (a rookie, a backup who
   did not play, a man hurt in week two), falls back to pedigree and service,
   so he rates low rather than going missing.

   CONTRACTS ARE FICTIONAL, and always were: salary and years are derived
   from the rating by the game's own salaryFor shape, not from real deals.

   ROUND 828: THE WHOLE ROSTER, NOT JUST THE STARTERS. The owner: "we are yet
   to have way more leagues and players for ... all the gm games". The bake
   kept fifteen men a club (SLOTS) out of a release that carries the whole
   53 and the practice squad. It now writes a second file beside the first:
     src/data/frontOfficePlayers.ts  the fifteen starters, chosen and rated
                                     by the same rules as before, with one
                                     correction: the latest week only (see
                                     below). The numbers still move with the
                                     data: the 2026-10-01 bake (week 4)
                                     swapped 11 of 480 starters against the
                                     2026-09-02 bake and moved 132 ratings
                                     by 1.4 on average, and Gauntlet Draft:
                                     NFL reads this file, so its pool moves
                                     with it. A saved league carries its own
                                     men and never reads it again.
     src/data/frontOfficeDepth.ts    everybody else on the club: the rest of
                                     the active roster (the bench) and the
                                     practice squad, loaded by the board only
                                     when a new league starts.
   CURRENT MEANS THE LATEST WEEK. The release keeps one row per man, his
   latest, so a man released in week two still reads ACT on a week two row
   while everybody else has moved on to week four. Every status is read off
   the file's latest week only (currentRows), which is what "on the roster
   today" means.
   KICKERS, PUNTERS AND LONG SNAPPERS ARE NOT IN THE GAME. It has no position
   for them and nothing to rate them on yet, so a full roster here is the 53
   less those three, which is 48 to 50 men a club on the real file.
   RESERVE LISTS. A man on injured reserve stays in the starters file when the
   old rule picks him (it always read ACT and RES), but he is not on the
   bench: injured reserve is not the 53.
   HOW A BACKUP IS RATED, and it is labelled because it is a judgement. The
   same rule as everybody (per game production for skill players, the
   production and pedigree blend for defenders, pedigree for linemen and for
   anyone who did not play), ranked among the backups and practice squad men
   at his position, and mapped onto a band just under the starters' scale
   (DEPTH_SCALE). A backup's per game numbers measure his snaps as much as
   his ability, so ranking him against starters would rate the role, and the
   engine needs every backup below every starter for one more reason: the
   starters' scale floor is where a club's own depth chart puts its starting
   line, and a backup who outrated his own starter would quietly start in
   his place and move every result. The band's floor, 61, sits above the
   engine's replacement level (60, a man off the street), so a real backup is
   always worth more than an empty slot.

   THE BAKE READS A COMMITTED RECORD, NOT THE NETWORK (Round 828 review).
   The release is a moving target: it adds a week every week and keeps each
   man's latest row only, so a bake that read it straight off GitHub could
   never be checked again a week later, and the cache it read sits in
   scripts/.cache/, which git ignores. So the pull and the bake are two steps:
     --record  reads the release (through scripts/.cache/nflverse, so delete
               that folder first for a fresh pull) and writes
               scripts/data/nflRosters2026.json: every row of the latest week
               on the active, reserve or practice squad list with the columns
               the rules read (plus the ESPN and Pro Football Reference ids, so
               a second source check can find each man), and every 2025 stats
               row those men join to. Nothing is chosen or rated in it.
     (none)    bakes offline from that record and writes the two data files
               and scripts/data/nflRosters2026LeftOut.json, every man on a
               club's list who is not in the game and why.
     --check   bakes from the record and compares all three files byte for
               byte, writing nothing. The same record always bakes the same
               bytes: the date on line 1 is the day the record was read.
   A bake also needs scripts/data/nflRosterSpotCheck.json read on the same
   day as the record (six clubs, ten men each, against each club's own page
   and ESPN). Its heldOut men are left out with the reason, and with more
   than two of them the bake stops: the NHL bake's bar (Round 830).

   Output: src/data/frontOfficePlayers.ts and src/data/frontOfficeDepth.ts,
   both committed, plus the record and the left out list in scripts/data.
   Fence: scripts/simFrontOfficeRoster.mjs (the starters) and
   scripts/simNflFullRosters.mjs (the bench, the practice squad, the record,
   the left out list and the deep league engine).

   Run: node scripts/genFrontOfficeRoster.mjs --record  (pull the release, then bake)
        node scripts/genFrontOfficeRoster.mjs           (bake from the record)
        node scripts/genFrontOfficeRoster.mjs --check   (bake, compare, write nothing)
*/
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchSeasonRoster, RELEASE_URL } from './lib/nflverseRosters.mjs';
import { fetchSeasonStats, STATS_RELEASE_URL } from './lib/nflverseStats.mjs';
import { buildFullRatings, openingRatingEvidence, OFFENSE_LAYER, OFFENSE_POSITIONS } from './lib/nflFoRatingModel.mjs';
import { derive as deriveProductionRow, productionMap } from './lib/nflProduction.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'src', 'data', 'frontOfficePlayers.ts');
const OUT_DEPTH = path.join(ROOT, 'src', 'data', 'frontOfficeDepth.ts');
const RATING_INPUTS = path.join(ROOT, 'scripts', 'data', 'nflFoRatingInputs2026.json');
export const RECORD = path.join(ROOT, 'scripts', 'data', 'nflRosters2026.json');
export const LEFT_OUT = path.join(ROOT, 'scripts', 'data', 'nflRosters2026LeftOut.json');
/** Round 828 review: the second source spot check, whose heldOut list the bake obeys. */
export const SPOT_CHECK = path.join(ROOT, 'scripts', 'data', 'nflRosterSpotCheck.json');
/** Round 1130: the two sourced 2025 regular season lines, and the two sourced fullback ledger. */
export const PRODUCTION = path.join(ROOT, 'scripts', 'data', 'nfl2025Production.json');
export const FULLBACK_ROLES = path.join(ROOT, 'scripts', 'data', 'nflFullbackRoles2026.json');
export const ROSTER_SEASON = 2026;
export const STATS_SEASON = 2025;
/** On the roster: active, or held on a reserve list. Cut and practice squad are not. */
export const ROSTER_STATUSES = ['ACT', 'RES'];
/** Round 828: the bench is the rest of the active roster, the practice squad is DEV. */
export const BENCH_STATUSES = ['ACT'];
export const PRACTICE_STATUSES = ['DEV'];
/** Round 828: the band a backup is mapped onto, just under each starters' scale. */
export const DEPTH_SCALE = { skill: [61, 65], OL: [75, 79], def: [61, 65] };
/** How many of each the file carries per team, biggest rating first. */
export const SLOTS = { QB: 1, RB: 2, WR: 3, TE: 1, OL: 2, DL: 2, LB: 2, DB: 2 };
/** Fewer than this in a fine position and it is ranked with its whole group. */
export const MIN_BUCKET = 6;
/* PRODUCTION IS PER GAME, NOT PER SEASON. A season total rates a player on
   how much of the season he was available for, which is not a statement
   about how good he is. Fred Warner played six games in 2025 and came out
   near the bottom of every linebacker in the league on the totals, while his
   rate per game sits level with an ordinary starter who played seventeen.
   Below MIN_GAMES there is not enough of a season to rate at all, and those
   players fall through to the pedigree path the file already had for anyone
   who did not play. Four is set from the measured distribution: the tenth
   percentile of defenders with any production is three games, so the floor
   clears the one game flukes without discarding a real partial season. */
export const MIN_GAMES = 4;
/** Below this share of roster rows finding a stats row, the bake refuses. */
export const MIN_JOIN_RATE = 1 / 3;
/* PEDIGREE IS DRAFT POSITION, NOT SENIORITY. Service was worth 3 a year to a
   maximum of 24, against a draft range of 68, and that turned out to be the
   thing actually driving the defensive ratings: two corners taken six picks
   apart, Rock Ya-Sin at 34 and Cooper DeJean at 40, differed by 2 points of
   draft and 15 points of service, so the pedigree half of the blend was
   mostly a list of who had been in the league longest. That is not a claim
   about how good anybody is, and it punished exactly the young starters the
   blend is supposed to treat fairly. It is worth 1.5 a year to a maximum of
   12 now, so being established still counts for something and being old
   stops outranking being good. */
export const SERVICE_WEIGHT = 1.5;
/** The three groups whose counting stats do not measure the whole job. */
export const DEFENSIVE = new Set(['DL', 'LB', 'DB']);

/* HOW MUCH OF THE JOB THE NUMBERS CAN SEE, position by position. One weight
   for every defender was wrong, and it was wrong in a way that arithmetic
   guarantees rather than merely permits. Both halves of the blend are
   midrank percentiles, so both are uniform on 0 to 1 by construction, and an
   even blend therefore CANNOT carry a bottom decile producer past the middle
   of the scale no matter how high he was drafted. Pat Surtain II, the
   reigning defensive player of the year, came out at production 0.161 and
   pedigree 0.839, which is exactly 0.500, the median: he shipped at 80 while
   an undrafted corner shipped at 90. Moving Sauce Gardner off last place hid
   that the same defect was still there one rung up.
   So the weight is per position, and the reason is the same one that made a
   blend necessary at all. A pass rusher's job IS the counting stats: a sack
   is the event. An off ball linebacker's tackles at least measure how often
   he was involved. A cornerback's job is coverage, which the public release
   does not carry a single column of, and worse, the stats he does accumulate
   run BACKWARDS: the better he is, the less anyone throws at him, so his
   tackles and his passes defended both fall. Rating him mostly on production
   is not noisy, it is inverted. A safety sits between the two, since he
   really does make tackles.
   These are the only judgement calls in the file and they are stated out
   loud rather than buried. simFrontOfficeRoster section 8 fences the shape:
   a corner may not be rated mostly on production. */
/* A ladder from "the numbers are the job" to "the numbers cannot see the job".
   The values are measured, not felt. Sweeping the corner weight against named
   cases showed both failure modes are real and they pull opposite ways: at
   0.5 Derek Stingley Jr. is not even selected and Pat Surtain II sits one
   point above the median, while at 0.75 the corners become a seniority list
   and Cooper DeJean, a top decile producer, ships below the median at 73
   under Rock Ya-Sin at 83, a bottom decile producer with five more years in
   the league. 0.6 with the corrected service term is the setting where every
   named case lands right: Surtain 85, Gardner 89, Stingley 92, DeJean 82,
   all above a median of 81, and the journeymen below it. */
export const PEDIGREE_WEIGHT_BY_POS = {
  CB: 0.6,
  S: 0.55,
  ILB: 0.45, OLB: 0.45, LB: 0.45,
  DE: 0.35, DT: 0.35, NT: 0.35,
};
/** Used for a defender whose fine position the feed does not give. */
export const PEDIGREE_WEIGHT = 0.5;

/** How much of this man's rating is draft pedigree rather than production. */
export function pedigreeWeightFor(group, fine, override) {
  if (!DEFENSIVE.has(group)) return 0;
  if (override != null) return override;
  return PEDIGREE_WEIGHT_BY_POS[String(fine || '').toUpperCase()] ?? PEDIGREE_WEIGHT;
}
/** The scale the file has always used, per position group. */
export const SCALE = { skill: [66, 97], OL: [80, 90], def: [66, 95] };

const num = v => { const n = Number(String(v ?? '').trim()); return Number.isFinite(n) ? n : 0; };

/** The roster's coarse position codes are the groups the game uses. */
function group(pos) {
  const p = String(pos || '').toUpperCase();
  if (p === 'QB' || p === 'RB' || p === 'WR' || p === 'TE' || p === 'OL' || p === 'DL' || p === 'LB' || p === 'DB') return p;
  if (p === 'FB' || p === 'HB') return 'RB';
  if (['T', 'G', 'C', 'OT', 'OG'].includes(p)) return 'OL';
  if (['DE', 'DT', 'NT'].includes(p)) return 'DL';
  if (['ILB', 'OLB', 'MLB'].includes(p)) return 'LB';
  if (['CB', 'S', 'SS', 'FS'].includes(p)) return 'DB';
  return null;
}

/* The specific position a player lines up at, so a corner is ranked against
   corners rather than against safeties. It comes from the ROSTER's depth
   chart, not the stats file: the stats file's own position column is uneven,
   filing most linebackers under a flat LB and only seven under MLB in the
   whole league, which collapsed the buckets it was supposed to separate and
   left an off ball linebacker ranked against edge rushers on sacks. The
   depth chart field is populated for everyone and is the granularity the
   ranking needs. The pairs below are merged because they are the same job
   under two labels, and a bucket too small to rank is no bucket at all. */
const FINE_ALIAS = { MLB: 'ILB', FS: 'S', SS: 'S', DB: 'S', NT: 'DT', OG: 'G', OT: 'T', HB: 'RB' };
function finePosition(r, s) {
  const raw = String(r.depth_chart_position || (s && s.position) || r.position || '').toUpperCase();
  return FINE_ALIAS[raw] || raw || null;
}

/** Age on 1 September of the roster season, from the birth date the feed carries. */
function ageOf(birth) {
  const b = new Date(String(birth || ''));
  if (Number.isNaN(b.getTime())) return null;
  const ref = new Date(Date.UTC(ROSTER_SEASON, 8, 1));
  let age = ref.getUTCFullYear() - b.getUTCFullYear();
  const m = ref.getUTCMonth() - b.getUTCMonth();
  if (m < 0 || (m === 0 && ref.getUTCDate() < b.getUTCDate())) age -= 1;
  return age >= 18 && age <= 50 ? age : null;
}

/* Round 828: THE LATEST WEEK ONLY. The release keeps each man's latest row,
   so a man cut after week two still reads ACT on his week two row. A row
   with no week at all (the harness fixtures) is kept, so a file without the
   column reads as it always did. */
export function currentRows(roster) {
  let latest = 0;
  for (const r of roster) latest = Math.max(latest, num(r.week));
  if (!latest) return roster;
  return roster.filter(r => !String(r.week ?? '').trim() || num(r.week) === latest);
}

/** Round 828: the latest week the release carries, for the file header. */
export function latestWeek(roster) {
  let latest = 0;
  for (const r of roster) latest = Math.max(latest, num(r.week));
  return latest;
}

/** The fantasy basis the old bake used, so a skill rating means what it meant. */
export function skillScore(s) {
  return num(s.passing_yards) / 25 + num(s.passing_tds) * 4
    + num(s.rushing_yards) / 10 + num(s.rushing_tds) * 6
    + num(s.receptions) * 0.5 + num(s.receiving_yards) / 10 + num(s.receiving_tds) * 6;
}

/** Defensive production, weighted the way a defender's season is read: the
 *  plays behind the line first, then the ball, then the tackle count. */
export function defenceScore(s) {
  return num(s.def_sacks) * 6
    + num(s.def_tackles_for_loss) * 2.5
    + num(s.def_qb_hits) * 1.2
    + num(s.def_interceptions) * 6
    + num(s.def_pass_defended) * 2
    + num(s.def_fumbles_forced) * 4
    + num(s.def_tackles_solo) * 0.6
    + num(s.def_tackle_assists) * 0.3;
}

/** Pedigree and service, for a lineman and for anyone who did not play in 2025. */
export function pedigreeScore(r) {
  const pick = num(r.draft_number);
  const exp = num(r.years_exp);
  /* THE CURVE HAS TO REACH THE LAST PICK, and the first one did not. It was
     100 - log2(pick) * 14 floored at 30, and log2(32) * 14 is exactly 70, so
     it hit the floor at pick 32 and stayed there: every pick from the top of
     round two to the end of the draft scored the same as going undrafted,
     which is 309 of the 480 men in the shipped file. That emptied the draft
     signal out of the exact place it was needed, since offensive linemen are
     rated on pedigree alone and the defenders' blend leans on it.
     The coefficient is now set from the draft's own length rather than from
     a number that felt right: 8.5 puts the last pick of a seven round draft
     (262) at 100 - log2(262) * 8.5, a shade under 32, so the whole draft is
     spread across 100 down to 32 and an undrafted man sits below all of it
     at 30. Service still adds up to 24 and peaks at eight years, where a
     career plateaus, then decays after twelve. */
  const draft = pick > 0 ? Math.max(32, 100 - Math.log2(pick) * 8.5) : 30;
  const service = Math.min(exp, 8) * SERVICE_WEIGHT - Math.max(0, exp - 12) * 2;
  return draft + service;
}

/* EQUAL VALUES GET EQUAL STANDING. The first version broke ties on the name,
   which handed two players with the same number the two ends of the scale:
   two defenders drafted at the same pick came out of the pedigree half at 0
   and 1, a full scale apart, on nothing but an alphabet. Worse, it cancelled
   the blend exactly, so a defender who produced and one who did not finished
   level and the order between them was noise. Ties now share the midpoint of
   the ranks they span, which is the ordinary way to rank ties and leaves the
   distribution centred. */
function midrank(list, valueOf) {
  const sorted = [...list].sort((a, b) => valueOf(a) - valueOf(b));
  const n = sorted.length;
  const out = new Map();
  for (let i = 0; i < n;) {
    let j = i;
    while (j + 1 < n && valueOf(sorted[j + 1]) === valueOf(sorted[i])) j += 1;
    const rank = (i + j) / 2;
    for (let k = i; k <= j; k += 1) out.set(sorted[k].key, n <= 1 ? 1 : rank / (n - 1));
    i = j + 1;
  }
  return out;
}

/** Rank a cohort on one value, returning key to a percentile in 0 to 1. */
export function percentileOf(list, valueOf) {
  return midrank(list, valueOf);
}

/** Rank within a position group, mapped onto that group's scale. */
export function ratingsFor(scored, [lo, hi]) {
  const out = new Map();
  /* same tie rule as percentileOf: two identical scores are one rating */
  for (const [key, pct] of midrank(scored, e => e.score)) {
    out.set(key, Math.round(lo + pct * (hi - lo)));
  }
  return out;
}

/** The game's own salary shape, so a contract reads like the ones already in the file. */
export function salaryFor(pos, ovr) {
  if (pos === 'QB') return Math.round(Math.max(1.5, (ovr - 66) * 1.8 - 18) * 10) / 10;
  return Math.round(Math.max(1.0, (ovr - 66) * 1.15 - 12) * 10) / 10;
}

/** Years left: a fictional contract, derived from age so it reads plausibly. */
export function yearsFor(age, seedIndex) {
  const base = age <= 25 ? 4 : age <= 29 ? 3 : age <= 33 ? 2 : 1;
  return Math.max(1, base - (seedIndex % 2));
}

/** The team metadata is the file's own and is kept: cities, names, colours,
 *  divisions and the team defence number the engine still reads. */
export function readTeamMeta(src) {
  const teams = [];
  const re = /\{ abbr: '(\w+)', city: '([^']+)', name: '([^']+)', color: '([^']+)', division: '([^']+)', defense: (\d+), players: \[/g;
  for (const m of src.matchAll(re)) {
    teams.push({ abbr: m[1], city: m[2], name: m[3], color: m[4], division: m[5], defense: Number(m[6]) });
  }
  return teams;
}

/** One roster row as the bake sees a man, or null when it cannot place him.
    Round 828 lifted this out of buildRoster unchanged, so the bench and the
    practice squad are read by exactly the code that reads the starters. */
function personFrom(r, statsById, abbrs, perGame) {
  const g = group(r.position);
  if (!g) return null;
  const team = String(r.team || '').toUpperCase();
  if (!abbrs.has(team)) return null;
  const age = ageOf(r.birth_date);
  if (age == null) return null;
  const name = String(r.full_name || '').trim();
  if (!name) return null;
  const row = r.gsis_id ? statsById.get(r.gsis_id) : null;
  const games = row ? num(row.games) : 0;
  /* a season too short to rate is not a season; he falls to pedigree */
  const s = games >= MIN_GAMES ? row : null;
  const played = !!s;
  const score = g === 'OL' || !played
    ? pedigreeScore(r)
    : (DEFENSIVE.has(g) ? defenceScore(s) : skillScore(s)) / (perGame ? games : 1);
  const fine = finePosition(r, s);
  return { key: `${team}|${name}|${g}`, name, team, group: g, fine, age, score, played, matched: !!row, pedigree: pedigreeScore(r), status: r.status };
}

/* pedigreeWeight and perGame are seams, not settings. The bake always uses
   the exported PEDIGREE_WEIGHT and always rates per game; simFrontOfficeRoster
   drives each one off in turn to prove which rule is holding which player up:
   the blend for a top pick with a quiet season, the rate for a starter who
   missed most of the year injured. */
export function buildRoster({
  roster, stats, teamMeta,
  pedigreeWeight = null, perGame = true,
  minJoinRate = MIN_JOIN_RATE, bucketFallback = 'largest',
}) {
  /* the regpost file carries exactly one row per player, regular season plus
     post season already summed, so there is nothing here to filter or add up */
  const statsById = new Map();
  for (const s of stats) if (s.player_id) statsById.set(s.player_id, s);

  const abbrs = new Set(teamMeta.map(t => t.abbr));
  const people = [];
  for (const r of roster) {
    if (!ROSTER_STATUSES.includes(r.status)) continue;
    const p = personFrom(r, statsById, abbrs, perGame);
    if (p) people.push(p);
  }

  /* THE JOIN FAILS CLOSED. num() returns 0 for a field that is not there, so
     if the release renames or drops `games`, or the join key moves off
     gsis_id, every single player quietly falls to the pedigree branch and the
     whole league gets rated on draft position alone. Nothing about that is
     visible: the bake still prints 32 teams and 480 players, still exits 0,
     and the fence still passes every check, because no check looks at
     production. Measured by renaming `games` to `game_count` in the cached
     CSV: 144 of the 480 names changed, Josh Allen fell from 97 to 79, and
     the run reported success. That is accept on error, which this repo bans
     in a validator, sitting in the script that decides what 480 real people
     are worth. On the healthy 2026 and 2025 releases 1456 of 1966 considered
     roster rows find a stats row and 1239 clear MIN_GAMES, so a floor of a
     third is far below the true rate and far above what a broken join gives,
     which is zero. */
  /* MATCHED is the join: a roster row that found a stats row at all. RATED is
     the smaller number that also cleared MIN_GAMES. The guard is on the join,
     because that is the thing a renamed column or a moved key destroys, and
     the first version measured RATED while its message said "join", which is
     two different quantities wearing one name. */
  const considered = people.length;
  const matched = people.filter(p => p.matched).length;
  const rated = people.filter(p => p.played).length;
  buildRoster.lastJoin = { considered, matched, rated };
  if (considered && matched / considered < minJoinRate) {
    throw new Error(
      `the stats join matched only ${matched} of ${considered} roster rows (${(matched / considered * 100).toFixed(1)} percent, floor ${(minJoinRate * 100).toFixed(1)} percent). `
      + 'That is what a renamed column or a moved join key looks like, not what a season looks like. '
      + 'Refusing to write a file that would rate the whole league on draft position alone.');
  }
  /* AND THE SAME GUARD ON THE OTHER HALF. The join can be perfect while the
     `games` column is gone, because every row still matches and every one of
     them then reads 0 games and falls to pedigree. That is the exact failure
     that changed 137 names and dropped Josh Allen from 97 to 78 in silence,
     so it needs its own floor rather than being covered by accident: of the
     rows that DO match, 1,180 of 1,379 clear four games on the healthy
     releases, so a third is far below the truth and far above nothing. */
  if (matched && rated / matched < minJoinRate) {
    throw new Error(
      `only ${rated} of the ${matched} matched rows cleared ${MIN_GAMES} games (${(rated / matched * 100).toFixed(1)} percent, floor ${(minJoinRate * 100).toFixed(1)} percent). `
      + 'The join is fine, so this is what a renamed or dropped games column looks like: every player reads zero games and falls to pedigree. '
      + 'Refusing to write a file that would rate the whole league on draft position alone.');
  }

  /* SELECT FIRST, THEN RATE. Ranking every player in the league and then
     keeping each team's best would hand the file a squad of ninety-somethings:
     the kept players are by definition the top of the distribution, and a
     first pass did exactly that, with the worst starting quarterback in the
     league on 84. The file's spread is a spread AMONG STARTERS (the old one
     ran a quarterback from 66 to 97), so the cohort that gets kept is ranked
     against itself and mapped across the whole scale. A player with no 2025
     production is ordered on pedigree and sits below everyone who played,
     which is the honest ordering: unproven is not the same as good. */
  /* AND THE BLEND HAS TO DECIDE WHO IS PICKED, not just what he is worth
     once picked. Selection ordered defenders on raw production, so the two
     defensive backs a team kept were its two biggest tacklers and a shutdown
     corner was cut before the blend ever saw him. That is the same bug as
     rating him last, only quieter, because a player who is not in the file
     cannot look wrong. Standing here is league wide inside the group, since
     the cohort it would otherwise be measured against does not exist yet. */
  const standing = new Map();
  for (const g of Object.keys(SLOTS)) {
    const groupPlayed = people.filter(p => p.group === g && p.played && g !== 'OL');
    const prod = percentileOf(groupPlayed, p => p.score);
    const ped = percentileOf(groupPlayed, p => p.pedigree);
    for (const p of groupPlayed) {
      const w = pedigreeWeightFor(g, p.fine, pedigreeWeight);
      standing.set(p.key, (1 - w) * prod.get(p.key) + w * ped.get(p.key));
    }
  }

  const byTeam = new Map(teamMeta.map(t => [t.abbr, { ...t, players: [] }]));
  for (const g of Object.keys(SLOTS)) {
    const usePedigree = p => g === 'OL' || !p.played;
    const chosen = [];
    for (const t of teamMeta) {
      const pool = people
        .filter(p => p.team === t.abbr && p.group === g)
        .sort((a, b) => {
          const aPed = usePedigree(a), bPed = usePedigree(b);
          if (aPed !== bPed) return aPed ? 1 : -1;
          const av = aPed ? a.pedigree : standing.get(a.key);
          const bv = bPed ? b.pedigree : standing.get(b.key);
          return bv - av || a.name.localeCompare(b.name);
        });
      chosen.push(...pool.slice(0, SLOTS[g]).map((p, i) => ({ ...p, slot: i })));
    }
    const scale = g === 'OL' ? SCALE.OL : (g === 'DL' || g === 'LB' || g === 'DB') ? SCALE.def : SCALE.skill;
    const [lo] = scale;
    const rated = rateCohort(chosen, g, scale, { pedigreeWeight, bucketFallback });
    for (const p of chosen) {
      const ovr = rated.get(p.key) ?? lo;
      byTeam.get(p.team).players.push({
        name: p.name,
        pos: p.group,
        age: p.age,
        ovr,
        salary: salaryFor(p.group, ovr),
        years: yearsFor(p.age, p.slot),
      });
    }
  }

  const order = Object.keys(SLOTS);
  for (const t of byTeam.values()) {
    t.players.sort((a, b) => order.indexOf(a.pos) - order.indexOf(b.pos) || b.ovr - a.ovr || a.name.localeCompare(b.name));
  }
  return [...byTeam.values()];
}

/* Round 828: the rating block, lifted out of buildRoster unchanged so the
   bench and the practice squad are rated by exactly the code that rates
   the starters, only onto a different band. `chosen` is the cohort: every
   man it holds is ranked against the others in it and nobody else. */
function rateCohort(chosen, g, scale, { pedigreeWeight = null, bucketFallback = 'largest' } = {}) {
  const usePedigree = p => g === 'OL' || !p.played;
  const [lo, hi] = scale;
  const played = chosen.filter(p => !usePedigree(p));
  const rest = chosen.filter(p => usePedigree(p));
  const split = played.length && rest.length ? lo + Math.round((hi - lo) * 0.3) : lo;
  const rated = new Map();
  /* A CORNER IS RANKED AGAINST CORNERS. The first pass ranked everyone in
     a group on one production score and put Sauce Gardner, a cover corner
     who was drafted fourth overall, at the bottom of the league: the score
     rewards volume, and the whole point of a corner nobody throws at is
     that he has nothing to accumulate. A safety racks up tackles, an edge
     rusher racks up sacks, and comparing them is comparing nothing. So the
     cohort is bucketed by the fine position the feed gives (CB, SAF, LB,
     DE, DT and the rest), each bucket is ranked against itself, and the
     resulting standing is what maps onto the group's scale. */
  const fine = p => String(p.fine || p.group).toUpperCase();
  const counts = new Map();
  for (const p of played) counts.set(fine(p), (counts.get(fine(p)) || 0) + 1);
  /* A bucket of one is not a ranking: its only member lands at the top of
     the scale for having no rivals, because every bucket is mapped across
     the whole range independently and midrank hands a lone entry 1.
     The first version keyed the fallback on the group name, which did NOT
     merge the strays into the group as its comment claimed. It built a
     LEFTOVERS bucket out of them, so one man carrying an odd depth chart
     label became a bucket of one and took the ceiling. It never merged for
     defensive backs at all, since FINE_ALIAS rewrites a bare DB to S so no
     player ever carries the group's own name. Measured on the real feed:
     giving Demario Davis the bare LB label that two other linebackers
     already carry took him from 69 to 95, the best in the league, without
     changing one thing he did.
     The strays now join the LARGEST bucket in the group, which is a real
     cohort of real rivals, so a rare label is ranked against the nearest
     thing to its own position rather than against nobody. */
  const buckets = new Map();
  const big = [...counts.entries()].filter(([, n]) => n >= MIN_BUCKET).sort((a, b) => b[1] - a[1])[0];
  for (const p of played) {
    const own = fine(p);
    const stray = bucketFallback === 'group' || !big ? g : big[0];
    const k = counts.get(own) >= MIN_BUCKET ? own : stray;
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k).push(p);
  }
  /* AND A DEFENDER IS NOT RATED ON COUNTING STATS ALONE. Bucketing was not
     enough on its own: ranked against other corners, Sauce Gardner still
     came last, because 28 tackles and no interceptions is what a season
     looks like when quarterbacks stop throwing at you. The public release
     has no coverage column at all (no completions allowed, no yards
     allowed, no passer rating against; the only "targets" column is the
     receiver's), so no amount of arranging these numbers can tell a
     shutdown corner from a bad one, and shipping the raw ranking would put
     a false claim about a real, named person into the game.
     So a defender is rated on two facts instead of one: his 2025
     production and where he was drafted. Both are public record and
     neither is invented. This is the file's own method rather than a new
     one, since offensive linemen have always been rated on pedigree alone
     for exactly this reason, that their job does not produce a countable
     event. Skill players keep production alone, because for them yards and
     touchdowns ARE the job. How the two are weighted depends on the
     position, for the reasons set out at PEDIGREE_WEIGHT_BY_POS: an even
     split was arithmetically incapable of rescuing the very player it was
     written for. */
  const playedLo = rest.length ? split : lo;
  for (const list of buckets.values()) {
    const prod = percentileOf(list, p => p.score);
    const ped = percentileOf(list, p => p.pedigree);
    const blended = list.map(p => {
      const w = pedigreeWeightFor(g, p.fine, pedigreeWeight);
      return { key: p.key, score: (1 - w) * prod.get(p.key) + w * ped.get(p.key) };
    });
    for (const [k, v] of ratingsFor(blended, [playedLo, hi])) rated.set(k, v);
  }
  for (const [k, v] of ratingsFor(rest.map(p => ({ key: p.key, score: p.pedigree })), [lo, played.length ? Math.max(lo, split - 1) : hi])) rated.set(k, v);
  return rated;
}

/* Round 828: the rest of every club. The bench is every man on the active
   list the starters file did not take, the practice squad is every DEV man,
   both read off the latest week (the caller passes currentRows). A man on a
   reserve list who is not a starter is held out: injured reserve is not the
   53. Each is rated by rateCohort, the starters' own code, with the cohort
   being every bench and practice squad man at his position league wide and
   the band being DEPTH_SCALE, so every backup sits under every starter. */
export function buildDepth({ roster, stats, teamMeta, core, perGame = true }) {
  const statsById = new Map();
  for (const s of stats) if (s.player_id) statsById.set(s.player_id, s);
  const abbrs = new Set(teamMeta.map(t => t.abbr));
  const coreKeys = new Set(core.flatMap(t => t.players.map(p => `${t.abbr}|${p.name}|${p.pos}`)));
  const people = [];
  const seen = new Set();
  const held = { reserve: 0, specialists: 0, duplicate: 0 };
  /* every man on the club, starters included, who had no 2025 season to rate */
  const noSeason = new Map(teamMeta.map(t => [t.abbr, new Set()]));
  for (const r of roster) {
    const bench = BENCH_STATUSES.includes(r.status);
    const practice = PRACTICE_STATUSES.includes(r.status);
    if (!bench && !practice) {
      if (ROSTER_STATUSES.includes(r.status)) {
        const p = personFrom(r, statsById, abbrs, perGame);
        if (p && !coreKeys.has(p.key)) held.reserve += 1;
        if (p && coreKeys.has(p.key) && !p.played) noSeason.get(p.team).add(p.name);
      }
      continue;
    }
    const p = personFrom(r, statsById, abbrs, perGame);
    if (!p) {
      if (['K', 'P', 'LS'].includes(String(r.position || '').toUpperCase())) held.specialists += 1;
      continue;
    }
    if (!p.played) noSeason.get(p.team).add(p.name);
    if (coreKeys.has(p.key)) continue;
    if (seen.has(p.key)) { held.duplicate += 1; continue; }
    seen.add(p.key);
    people.push({ ...p, tier: bench ? 'bench' : 'practice' });
  }
  buildDepth.lastHeld = held;
  const byTeam = new Map(teamMeta.map(t => [t.abbr, { abbr: t.abbr, bench: [], practice: [], noSeason: [] }]));
  for (const [abbr, names] of noSeason) byTeam.get(abbr).noSeason = [...names].sort((a, b) => a.localeCompare(b));
  for (const g of Object.keys(SLOTS)) {
    const scale = g === 'OL' ? DEPTH_SCALE.OL : DEFENSIVE.has(g) ? DEPTH_SCALE.def : DEPTH_SCALE.skill;
    /* TWO COHORTS ON ONE BAND, and this is the one place the depth rule
       departs from the starters'. Among the starters a man with no 2025
       season sits under every man who had one (unproven is not proven). On a
       band five points wide that split leaves the men without a season one
       value, the floor, and those men are not only rookies: Nick Bosa missed
       2025 hurt and is a backup here only because the two linemen who played
       took the two starting slots. Rated with the split he would read 61,
       the worst number the file can print, which is a false thing to say
       about a real player. So the men with a season are ranked on what they
       did, the men without one on where they were drafted and how long they
       have been in the league, and each cohort is spread across the band.
       The rows without a season are listed in noSeason and the board says
       so beside the rating. */
    const chosen = people.filter(p => p.group === g);
    const rated = new Map([
      ...rateCohort(chosen.filter(p => g === 'OL' || p.played), g, scale),
      ...rateCohort(chosen.filter(p => g !== 'OL' && !p.played), g, scale),
    ]);
    const rows = chosen.map(p => ({ ...p, ovr: rated.get(p.key) ?? scale[0] }));
    for (const t of teamMeta) {
      const mine = rows.filter(p => p.team === t.abbr).sort((a, b) => b.ovr - a.ovr || a.name.localeCompare(b.name));
      mine.forEach((p, i) => {
        byTeam.get(t.abbr)[p.tier].push({
          name: p.name, pos: p.group, age: p.age, ovr: p.ovr,
          salary: salaryFor(p.group, p.ovr), years: yearsFor(p.age, i),
        });
      });
    }
  }
  const order = Object.keys(SLOTS);
  for (const t of byTeam.values()) {
    for (const k of ['bench', 'practice']) {
      t[k].sort((a, b) => order.indexOf(a.pos) - order.indexOf(b.pos) || b.ovr - a.ovr || a.name.localeCompare(b.name));
    }
  }
  return [...byTeam.values()];
}

export function renderDepthFile(depth, sources) {
  const q = s => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  const bench = depth.reduce((n, t) => n + t.bench.length, 0);
  const practice = depth.reduce((n, t) => n + t.practice.length, 0);
  const lines = [];
  lines.push(`// GENERATED ${sources.read} by scripts/genFrontOfficeRoster.mjs from scripts/data/nflRosters2026.json (do not hand-edit).`);
  lines.push(`// Round 828. The rest of every club beside the fifteen starters in`);
  lines.push(`// frontOfficePlayers.ts: ${bench} bench men (the active roster) and ${practice} practice squad men.`);
  lines.push(`// Roster: nflverse rosters release, season ${ROSTER_SEASON}, week ${sources.week}, the latest week`);
  lines.push(`// the release carried when this was baked (${sources.rosterRows} rows read; every status is read`);
  lines.push('// off that week only). Kickers, punters and long snappers are left out: the game');
  lines.push(`// has no position for them yet (${sources.held.specialists} held out). Reserve list men who are`);
  lines.push(`// not starters are left out too, since injured reserve is not the 53 (${sources.held.reserve} held out).`);
  if (sources.ratingInputs) {
    lines.push('// Full-roster opening ratings: frozen 2023/2024/2025 regular-season simulation');
    lines.push('// estimates, weighted by measured opportunity and recency across the eligible pool.');
    lines.push('// These numbers are simulation grades, not historical statistics or official ratings.');
    lines.push('// Offense uses production; defensive features have limited coverage/pressure evidence.');
    lines.push('// Linemen use participation and prior proxies, not measured blocking quality.');
    lines.push('// Partial or missing evidence is marked in per-player opening lineage.');
    lines.push('// Fictional salaries are reallocated within unchanged club opening payrolls.');
    lines.push('// Round 1130: one number per man. The fifteen in frontOfficePlayers.ts carry the same');
    lines.push('// estimate on their own rows; this file holds no second number for them, only their');
    lines.push('// lineage in ratingEvidence. Contract years and roster identities are unchanged.');
    if (sources.layerRead) {
      lines.push(`// Model ${sources.ratingVersion}: the checkpoint plus the offense layer (workload, and ${STATS_SEASON}`);
      lines.push(`// production a game off two publishers, read ${sources.layerRead.production}); a fullback two more`);
      lines.push(`// publishers confirm (read ${sources.layerRead.roles}) reads one flat number with the mark.`);
    }
    lines.push('// Complete source provenance and the fitted-checkpoint limitation live in');
    lines.push('// scripts/data/nflFoRatingInputs2026.json. One source lineage remains one.');
    lines.push('// noSeason retains the older 2025 games marker; it is not the new rating basis.');
  } else {
    lines.push(`// Ratings: the starters' own rule (nflverse stats_player ${STATS_SEASON}, per game, the`);
  lines.push('// defenders\' production and draft blend, pedigree for linemen and for anyone');
  lines.push('// who did not play), ranked among the bench and practice squad men at each');
  lines.push(`// position and mapped onto a band under the starters: ${DEPTH_SCALE.skill.join(' to ')} for skill players`);
  lines.push(`// and defenders, ${DEPTH_SCALE.OL.join(' to ')} for linemen. A backup's numbers measure his snaps`);
  lines.push('// as much as his ability, so he is ranked against backups, never starters.');
  lines.push(`// Men with a ${STATS_SEASON} season and men without one (rookies, men hurt all year) are`);
  lines.push('// ranked apart, each across the whole band; noSeason names the second kind.');
  }
  lines.push('// Contracts, salaries and roster moves inside the game are fictional. The');
  lines.push('// practice squad does not count against the game\'s cap.');
  lines.push('// Second source checks: scripts/data/nflRosterSecondSource.json and');
  lines.push('// scripts/data/nflRosterSpotCheck.json; a man both other sources contradict is held');
  lines.push('// out and listed with the reason in scripts/data/nflRosters2026LeftOut.json.');
  lines.push('');
  lines.push("import type { FoPlayer } from './frontOfficePlayers';");
  lines.push('');
  if (sources.ratingInputs) {
    lines.push('export interface FoOpeningRatingEvidence {');
    lines.push('  modelVersion: string;');
    lines.push('  openingWindow: { rosterSeason: number; rosterWeek: number; statsSeasons: number[] };');
    lines.push('  originKey: string;');
    lines.push('  openingOvr: number;');
    lines.push("  basis: 'production' | 'defensive-proxy' | 'participation-proxy' | 'draft-prior' | 'unmeasured-prior';");
    lines.push('  partial: boolean;');
    lines.push('  partialReasons: string[];');
    lines.push('}');
    lines.push('');
  }
  lines.push('export interface FoDepthTeam {');
  lines.push('  /** The rest of the active roster. */');
  lines.push('  bench: FoPlayer[];');
  lines.push('  /** The practice squad. Real men, off the active roster. */');
  lines.push('  practice: FoPlayer[];');
  if (sources.ratingInputs) {
    lines.push(`  /** Older ${STATS_SEASON} games marker, not the multiyear rating basis. */`);
  } else {
    lines.push(`  /** Every man on the club, starters included, with fewer than ${MIN_GAMES} games in ${STATS_SEASON}:`);
    lines.push('      rated on draft position and service alone, and the board says so. */');
  }
  lines.push('  noSeason: string[];');
  if (sources.ratingInputs) {
    lines.push('  /** Opening lineage for every man of the club, the fifteen included. */');
    lines.push('  ratingEvidence?: Record<string, FoOpeningRatingEvidence>;');
  }
  lines.push('}');
  lines.push('');
  /* the starters file's own row shape, so every harness that harvests real
     names out of src/data (simInventedNames, simCareerInbox) reads these too */
  lines.push(`export const FO_DEPTH_WEEK = ${sources.week};`);
  if (sources.ratingInputs) {
    lines.push(`export const FO_OPENING_RATING_VERSION = ${q(sources.ratingVersion ?? sources.ratingInputs.version)};`);
    lines.push('/** The frozen checkpoint the estimate stands on (scripts/data/nflFoRatingInputs2026.json). */');
    lines.push(`export const FO_OPENING_RATING_BASE = ${q(sources.ratingInputs.version)};`);
    lines.push(`export const FO_OPENING_RATING_WINDOW = ${JSON.stringify(sources.ratingInputs.openingWindow)};`);
  }
  lines.push('');
  lines.push('export const FO_DEPTH: Record<string, FoDepthTeam> = {');
  const row = p => `{ name: ${q(p.name)}, pos: ${q(p.pos)}, age: ${p.age}, ovr: ${p.ovr}, salary: ${p.salary}, years: ${p.years} }`;
  for (const t of depth) {
    lines.push(`  ${t.abbr}: {`);
    lines.push('    bench: [');
    for (const p of t.bench) lines.push(`      ${row(p)},`);
    lines.push('    ],');
    lines.push('    practice: [');
    for (const p of t.practice) lines.push(`      ${row(p)},`);
    lines.push('    ],');
    lines.push(`    noSeason: [${t.noSeason.map(q).join(', ')}],`);
    if (sources.ratingInputs) {
      lines.push('    ratingEvidence: {');
      for (const [key, e] of Object.entries(t.ratingEvidence)) {
        lines.push(`      ${q(key)}: { modelVersion: FO_OPENING_RATING_VERSION, openingWindow: FO_OPENING_RATING_WINDOW, originKey: ${q(e.originKey)}, openingOvr: ${e.openingOvr}, basis: ${q(e.basis)}, partial: ${e.partial}, partialReasons: [${e.partialReasons.map(q).join(', ')}] },`);
      }
      lines.push('    },');
    }
    lines.push('  },');
  }
  lines.push('};');
  lines.push('');
  return lines.join('\n');
}

export function renderFile(teams, sources) {
  const q = s => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  const lines = [];
  lines.push(`// GENERATED ${sources.read} by scripts/genFrontOfficeRoster.mjs from scripts/data/nflRosters2026.json (do not hand-edit).`);
  lines.push(`// Roster: nflverse rosters release, season ${ROSTER_SEASON}, week ${sources.week} as read on ${sources.read}, players on the`);
  lines.push(`// active or reserve list (${sources.rosterRows} rows read).`);
  if (sources.ratingInputs) {
    /* Round 1130. The legacy branch below is the pre 889 header, byte for byte
       (the suite compares the legacy text with the physical 56356be9 file). */
    lines.push('// WHO THE FIFTEEN ARE is decided by the selection rule: a seed rating off');
    lines.push(`// nflverse stats_player regular plus post season ${STATS_SEASON}`);
    lines.push(`// (${sources.statRows} rows). Skill players on the fantasy basis, because for`);
    lines.push('// them yards and touchdowns are the job. Defenders on a blend of that');
    lines.push('// production and draft position, weighted by how much of the job at that');
    lines.push('// position the counting stats can actually see: a pass rusher mostly on his');
    lines.push('// own numbers, a cornerback mostly on where he was drafted, because the public');
    lines.push('// release carries no coverage column and a corner nobody throws at has');
    lines.push('// nothing to accumulate. Linemen and anyone who did not play in the season');
    lines.push('// on draft position and years played alone. Row order inside a position is');
    lines.push('// that rule\'s pick order, not a ranking by the number on the row.');
    lines.push(`// THE NUMBER ON EACH ROW is the full roster opening estimate, model ${sources.ratingVersion ?? sources.ratingInputs.version}:`);
    lines.push('// the frozen 2023 to 2025 regular season checkpoint, scripts/data/nflFoRatingInputs2026.json.');
    if (sources.layerRead) {
      lines.push('// On top of it, for quarterbacks, backs, receivers and tight ends, the offense layer:');
      lines.push('// how much of the work a man carried (the checkpoint\'s own opportunity counts) and what');
      lines.push(`// he produced a game in the ${STATS_SEASON} regular season, read off two publishers`);
      lines.push(`// (scripts/data/nfl2025Production.json, read ${sources.layerRead.production}). A fullback two more`);
      lines.push(`// publishers confirm (scripts/data/nflFullbackRoles2026.json, read ${sources.layerRead.roles}) is not`);
      lines.push('// rated as a ball carrier: one flat number, marked. Linemen and defenders are the');
      lines.push('// checkpoint\'s numbers unchanged.');
    }
    lines.push('// It is a simulation grade, not a historical statistic or an official rating, and');
    lines.push('// it is the one number NFL Front Office and Gauntlet Draft: NFL print for the man');
    lines.push('// (NFL Conquest still types its own until its own round). Limited evidence is');
    lines.push('// marked per player in frontOfficeDepth.ts. See the generator for every rule.');
    lines.push('// Contracts, salaries and roster moves inside the game are fictional; prices are');
    lines.push('// shared out inside each club\'s unchanged opening payroll.');
  } else {
  lines.push(`// Ratings: nflverse stats_player regular plus post season ${STATS_SEASON}`);
  lines.push(`// (${sources.statRows} rows). Skill players on the fantasy basis, because for`);
  lines.push('// them yards and touchdowns are the job. Defenders on a blend of that');
  lines.push('// production and draft position, weighted by how much of the job at that');
  lines.push('// position the counting stats can actually see: a pass rusher mostly on his');
  lines.push('// own numbers, a cornerback mostly on where he was drafted, because the public');
  lines.push('// release carries no coverage column and a corner nobody throws at has');
  lines.push('// nothing to accumulate. Linemen and anyone who did not play in the season');
  lines.push('// on draft position and years played alone. A rating is a rank inside a');
  lines.push('// position mapped onto the scale this file has always used; see the');
  lines.push('// generator for every rule and the reason behind it.');
  lines.push('// Contracts, salaries and roster moves inside the game are fictional.');
  }
  lines.push('');
  lines.push('export interface FoPlayer {');
  lines.push('  name: string;');
  lines.push("  pos: 'QB' | 'RB' | 'WR' | 'TE' | 'OL' | 'DL' | 'LB' | 'DB';");
  lines.push('  age: number;');
  lines.push('  ovr: number;');
  lines.push('  /** Fictional contract: salary in $M per year and years remaining. */');
  lines.push('  salary: number;');
  lines.push('  years: number;');
  lines.push('}');
  lines.push('');
  lines.push('export interface FoTeam {');
  lines.push('  abbr: string;');
  lines.push('  city: string;');
  lines.push('  name: string;');
  lines.push('  color: string;');
  lines.push('  division: string;');
  lines.push('  /** Team defence rating, kept for the engine that still reads it. */');
  lines.push('  defense: number;');
  lines.push('  players: FoPlayer[];');
  lines.push('}');
  lines.push('');
  lines.push('export const FO_TEAMS: FoTeam[] = [');
  for (const t of teams) {
    lines.push(`  { abbr: ${q(t.abbr)}, city: ${q(t.city)}, name: ${q(t.name)}, color: ${q(t.color)}, division: ${q(t.division)}, defense: ${t.defense}, players: [`);
    for (const p of t.players) {
      lines.push(`    { name: ${q(p.name)}, pos: ${q(p.pos)}, age: ${p.age}, ovr: ${p.ovr}, salary: ${p.salary}, years: ${p.years} },`);
    }
    lines.push('  ] },');
  }
  lines.push('];');
  lines.push('');
  /* A Map, exactly as the hand written file exported it. The engine and the
     board both call FO_TEAM_MAP.get, so a Record here is a compile error. */
  lines.push('export const FO_TEAM_MAP = new Map(FO_TEAMS.map(t => [t.abbr, t]));');
  lines.push('');
  return lines.join('\n');
}

/* ---------------------------------------------------------------- the record
   Round 828 review. Exactly the rows and columns the rules read, so the bake
   can be rerun and checked offline for as long as the repo exists. */
export const RECORD_ROSTER_COLUMNS = [
  'team', 'position', 'depth_chart_position', 'status', 'status_description_abbr', 'full_name', 'birth_date',
  'gsis_id', 'espn_id', 'pfr_id', 'years_exp', 'draft_number', 'week',
];
export const RECORD_STAT_COLUMNS = [
  'player_id', 'player_display_name', 'position', 'games',
  'passing_yards', 'passing_tds', 'rushing_yards', 'rushing_tds', 'receptions', 'receiving_yards', 'receiving_tds',
  'def_sacks', 'def_tackles_for_loss', 'def_qb_hits', 'def_interceptions', 'def_pass_defended', 'def_fumbles_forced',
  'def_tackles_solo', 'def_tackle_assists',
];
/** Every status the bake reads: the starters' active and reserve lists and the practice squad. */
const RECORD_STATUSES = [...new Set([...ROSTER_STATUSES, ...BENCH_STATUSES, ...PRACTICE_STATUSES])];

/** The release, cut down to what the rules read. `read` is the day it was pulled. */
export function makeRecord({ rawRoster, stats, read }) {
  const week = latestWeek(rawRoster);
  const rows = currentRows(rawRoster).filter(r => RECORD_STATUSES.includes(r.status));
  const ids = new Set(rows.map(r => r.gsis_id).filter(Boolean));
  const joined = stats.filter(s => ids.has(s.player_id));
  return {
    what: 'The NFL Front Office bake\'s raw record, written by scripts/genFrontOfficeRoster.mjs --record. Every row of the nflverse rosters release\'s latest week on the active, reserve or practice squad list, and every 2025 stats_player row those men join to (by gsis_id), with only the columns the rules read plus the ESPN and Pro Football Reference ids for a second source check. Nothing in it is chosen or rated.',
    read,
    rosterSeason: ROSTER_SEASON,
    statsSeason: STATS_SEASON,
    week,
    source: { roster: `${RELEASE_URL}/roster_${ROSTER_SEASON}.csv`, stats: `${STATS_RELEASE_URL}/stats_player_regpost_${STATS_SEASON}.csv` },
    rosterRowsInRelease: rawRoster.length,
    statRowsInRelease: stats.length,
    rosterColumns: RECORD_ROSTER_COLUMNS,
    roster: rows.map(r => RECORD_ROSTER_COLUMNS.map(c => String(r[c] ?? ''))),
    statColumns: RECORD_STAT_COLUMNS,
    stats: joined.map(s => RECORD_STAT_COLUMNS.map(c => String(s[c] ?? ''))),
  };
}

/** The record as JSON with one row per line, so a refresh reads as a diff of men. */
export function renderRecord(rec) {
  const head = Object.fromEntries(Object.entries(rec).filter(([k]) => k !== 'roster' && k !== 'stats'));
  const lines = ['{'];
  for (const [k, v] of Object.entries(head)) lines.push(` ${JSON.stringify(k)}: ${JSON.stringify(v)},`);
  for (const k of ['roster', 'stats']) {
    lines.push(` ${JSON.stringify(k)}: [`);
    rec[k].forEach((r, i) => lines.push(`  ${JSON.stringify(r)}${i < rec[k].length - 1 ? ',' : ''}`));
    lines.push(k === 'roster' ? ' ],' : ' ]');
  }
  lines.push('}');
  return `${lines.join('\n')}\n`;
}

/** The record's rows back as the objects the rules read. */
export function recordRows(rec) {
  const obj = (cols, a) => Object.fromEntries(cols.map((c, i) => [c, a[i]]));
  return { roster: rec.roster.map(a => obj(rec.rosterColumns, a)), stats: rec.stats.map(a => obj(rec.statColumns, a)) };
}

/* Every man on a club's list on the record who is not in the game, and why.
   It walks the record rather than trusting the bake's own counters, so a
   man who falls out for a reason nobody wrote down stops the bake. */
export function leftOutList(rec, teams, depth, teamMeta, held = new Map()) {
  const { roster, stats } = recordRows(rec);
  const statsById = new Map(stats.map(s => [s.player_id, s]));
  const abbrs = new Set(teamMeta.map(t => t.abbr));
  const inGame = new Set();
  for (const t of teams) for (const p of t.players) inGame.add(`${t.abbr}|${p.name}|${p.pos}`);
  for (const d of depth) for (const p of [...d.bench, ...d.practice]) inGame.add(`${d.abbr}|${p.name}|${p.pos}`);
  const seen = new Set();
  const out = [];
  for (const r of roster) {
    const team = String(r.team || '').toUpperCase();
    const name = String(r.full_name || '').trim();
    const pos = String(r.position || '').toUpperCase();
    const row = { team, name, pos, status: r.status };
    const p = personFrom(r, statsById, abbrs, true);
    if (p && inGame.has(p.key) && !seen.has(p.key)) { seen.add(p.key); continue; }
    let reason;
    if (held.has(`${team}|${name}`)) reason = held.get(`${team}|${name}`);
    else if (['K', 'P', 'LS'].includes(pos)) reason = 'a kicker, punter or long snapper: the game has no position for them yet';
    else if (!group(pos)) reason = `position ${pos || 'blank'} is not one of the eight the game has`;
    else if (!abbrs.has(team)) reason = `club ${team || 'blank'} is not one of the 32`;
    else if (!name) reason = 'no name in the release';
    else if (ageOf(r.birth_date) == null) reason = 'no usable birth date in the release, so no real age';
    else if (p && seen.has(p.key)) reason = 'a second row for a man already in the game';
    else if (r.status === 'RES') reason = `on a reserve list (${r.status_description_abbr || 'RES'}) and not one of the club's fifteen starters: a reserve list is not the 53`;
    else throw new Error(`${team} ${name} (${pos}, ${r.status}) is on the record, not in the game, and has no reason written down`);
    out.push({ ...row, reason });
  }
  out.sort((a, b) => a.team.localeCompare(b.team) || a.reason.localeCompare(b.reason) || a.name.localeCompare(b.name));
  return out;
}

/** Over this many men the release gets wrong in the spot check, stop and report rather than bake. */
export const SPOT_CHECK_MISMATCH_LIMIT = 2;
/** Why this spot check cannot vouch for this record, or null. */
export function spotCheckRefusal(spot, rec) {
  if (!spot || !Array.isArray(spot.clubs)) return 'the second source spot check (scripts/data/nflRosterSpotCheck.json) is missing';
  if (spot.read !== rec.read) return `the spot check was read on ${spot.read} and the record on ${rec.read}: check the new record against the clubs' pages before baking it`;
  const wrong = (spot.heldOut ?? []).length;
  if (wrong > SPOT_CHECK_MISMATCH_LIMIT) return `the spot check found ${wrong} men the release gets wrong, over the bar of ${SPOT_CHECK_MISMATCH_LIMIT}: stop and report, do not bake`;
  return null;
}

/* ROUND 1130: THE OFFENSE LAYER'S INPUTS, read from two committed files and
   nothing else. It fails closed: a missing file, a ledger that does not cover
   exactly the men the record labels FB, or too few agreed lines among the
   fifteen stops the bake, the same rule as the stats join above (a feed whose
   column has gone must never rate the league on something else and say
   nothing). A stored status is never trusted: every row is re-derived from its
   own two lines before it may feed a rating. */
export function readOffenseLayer(checkpoint) {
  const rel = f => path.relative(ROOT, f);
  if (!fs.existsSync(PRODUCTION)) throw new Error(`${rel(PRODUCTION)} is missing, so the offense layer has no 2025 production to read: run node scripts/fetchNfl2025Production.mjs --pull`);
  if (!fs.existsSync(FULLBACK_ROLES)) throw new Error(`${rel(FULLBACK_ROLES)} is missing, so no fullback can be told from a running back on two sources`);
  const file = JSON.parse(fs.readFileSync(PRODUCTION, 'utf8'));
  if (file.season !== STATS_SEASON || file.seasonType !== 'regular' || !Array.isArray(file.rows)) throw new Error(`${rel(PRODUCTION)} is not the ${STATS_SEASON} regular season file`);
  const production = productionMap(file.rows.map(r => ({ ...r, ...deriveProductionRow(r) })));
  const roles = JSON.parse(fs.readFileSync(FULLBACK_ROLES, 'utf8'));
  const labelled = checkpoint.records.filter(r => r.sourceIdentity.depthChartPosition === roles.recordLabel).map(r => r.key).sort();
  const listed = roles.men.map(m => m.key).sort();
  if (labelled.join('\n') !== listed.join('\n')) {
    const missing = labelled.filter(k => !listed.includes(k)), extra = listed.filter(k => !labelled.includes(k));
    throw new Error(`${rel(FULLBACK_ROLES)} does not cover exactly the men the record labels ${roles.recordLabel}: no row for ${missing.join(', ') || 'nobody'}; a row for ${extra.join(', ') || 'nobody'} whom the record does not label so. Read the club's roster page and ESPN's for each and fix the ledger.`);
  }
  const fullbacks = new Set(roles.men.filter(m => m.verdict === 'fullback' && m.club?.position === 'FB' && m.espn?.position === 'FB').map(m => m.key));
  const claimed = roles.men.filter(m => m.verdict === 'fullback' && !fullbacks.has(m.key));
  if (claimed.length) throw new Error(`${rel(FULLBACK_ROLES)} calls ${claimed.map(m => m.key).join(', ')} a fullback without both pages printing FB`);
  const fifteen = checkpoint.records.filter(r => r.tier === 'core' && OFFENSE_POSITIONS.includes(r.seed.pos) && !fullbacks.has(r.key));
  const withLine = fifteen.filter(r => production.has(r.key)).length;
  if (withLine * 2 < fifteen.length) {
    throw new Error(`only ${withLine} of the ${fifteen.length} quarterbacks, backs, receivers and tight ends among the fifteen hold an agreed ${STATS_SEASON} line in ${rel(PRODUCTION)}. That is what a renamed field looks like, and baking on it would rate the offense on workload alone and say nothing. Rerun node scripts/fetchNfl2025Production.mjs --check and fix the file.`);
  }
  const productionRead = [file.sourceA?.read, file.sourceB?.read].filter(Boolean).sort().pop();
  if (!productionRead || !roles.read) throw new Error('the production file or the fullback ledger carries no read date');
  return {
    ...OFFENSE_LAYER, production, fullbacks,
    read: { production: productionRead, roles: roles.read },
    unconfirmedFullbacks: roles.men.filter(m => !fullbacks.has(m.key)).map(m => m.key),
    fifteenWithLine: withLine, fifteenOffense: fifteen.length,
  };
}

/** The whole bake from a record, as strings, so --check and the fence can compare without writing. */
export function bakeFromRecord(rec, teamMeta, heldOut = [], { legacyDepth = false, ratingModel = 'v2.3', layer: givenLayer = null } = {}) {
  if (!['v2.3', 'v2.2'].includes(ratingModel)) throw new Error(`unknown ratingModel ${ratingModel}`);
  const { roster: all, stats } = recordRows(rec);
  /* Round 828 review: a man both other sources contradict (scripts/data/
     nflRosterSpotCheck.json, heldOut) is held out of the bake with the reason,
     never moved to the position or club somebody guesses. A held entry that
     matches no row of the record is a stale list, and the bake stops. */
  const held = new Map(heldOut.map(h => [`${h.team}|${h.name}`, h.reason]));
  const rowKey = r => `${String(r.team || '').toUpperCase()}|${String(r.full_name || '').trim()}`;
  for (const k of held.keys()) {
    if (all.filter(r => rowKey(r) === k).length !== 1) throw new Error(`heldOut ${k} does not match exactly one row of the record`);
  }
  const roster = all.filter(r => !held.has(rowKey(r)));
  const teams = buildRoster({ roster, stats, teamMeta });
  const join = buildRoster.lastJoin;
  let depth = buildDepth({ roster, stats, teamMeta, core: teams });
  const checkpoint = legacyDepth ? null : JSON.parse(fs.readFileSync(RATING_INPUTS, 'utf8'));
  let ratingProblem = null;
  if (checkpoint) {
    const snapshot = checkpoint.sourceManifest.retainedOpeningSnapshot;
    const digest = createHash('sha256').update(JSON.stringify(rec)).digest('hex');
    if (digest !== snapshot.canonicalJsonSha256) ratingProblem = 'Rating checkpoint does not match the retained roster/stat record';
    if (rec.rosterSeason !== checkpoint.openingWindow.rosterSeason || rec.week !== checkpoint.openingWindow.rosterWeek) ratingProblem = 'Rating checkpoint opening season/week mismatch';
    const original = new Map();
    for (const t of teams) for (const p of t.players) original.set(`${t.abbr}|${p.name}|${p.pos}`, { tier: 'core', p });
    for (const t of depth) for (const tier of ['bench', 'practice']) {
      for (const p of t[tier]) original.set(`${t.abbr}|${p.name}|${p.pos}`, { tier, p });
    }
    const statsById = new Map(stats.map(s => [s.player_id, s]));
    const abbrs = new Set(teamMeta.map(t => t.abbr));
    const identities = new Map(roster.map(r => [personFrom(r, statsById, abbrs, true)?.key, r]));
    if (checkpoint.records.length !== original.size) ratingProblem = 'Rating checkpoint eligible pool size mismatch';
    for (const r of checkpoint.records) {
      const old = original.get(r.key);
      const identity = identities.get(r.key);
      const sourceIdentity = identity && { gsisId: identity.gsis_id, depthChartPosition: identity.depth_chart_position, draftNumber: identity.draft_number, yearsExperience: identity.years_exp };
      if (!old || r.tier !== old.tier || !isDeepStrictEqual(r.seed, old.p) || !isDeepStrictEqual(r.sourceIdentity, sourceIdentity)) {
        ratingProblem = 'Rating checkpoint identity, role, roster fact or original term mismatch: ' + r.key;
      }
    }
  }
  const ratingInputs = ratingProblem ? null : checkpoint;
  /* Round 1130. `teams` stays the SEED fifteen (who they are, in the selection
     rule's pick order, with the seed rating that picked them): the identity
     check above compares the checkpoint with exactly those objects. What ships
     is `finalTeams`: the same rows in the same order, each carrying THE rating
     and its price. The order is never re-sorted by the new number, because the
     engine deals growth ceilings in row order and a re-sort would deal every
     new league different ceilings. */
  let finalTeams = teams;
  let ratingVersion = null;
  let layer = null;
  let rated = null;
  if (ratingInputs) {
    /* ORDER OF REFUSAL: the production file and the fullback ledger are opened
       only here, after the checkpoint has been found to fit the record. A
       stale record is refused before anything else is read. `givenLayer` is
       for the harness, which hands the layer in with one thing changed. */
    layer = ratingModel === 'v2.3' ? (givenLayer ?? readOffenseLayer(ratingInputs)) : null;
    ratingVersion = layer ? layer.version : ratingInputs.version;
    rated = new Map(buildFullRatings(ratingInputs, layer).map(p => [p.key, p]));
    const records = new Map(ratingInputs.records.map(p => [p.key, p]));
    const one = (abbr, p) => {
      const next = rated.get(`${abbr}|${p.name}|${p.pos}`);
      return { ...p, ovr: next.ovr, salary: next.salary };
    };
    finalTeams = teams.map(t => ({ ...t, players: t.players.map(p => one(t.abbr, p)) }));
    depth = depth.map(t => {
      const result = { ...t, ratingEvidence: {} };
      const rows = [...teams.find(team => team.abbr === t.abbr).players, ...t.bench, ...t.practice];
      for (const p of rows) {
        const key = `${t.abbr}|${p.name}|${p.pos}`, next = rated.get(key);
        result.ratingEvidence[`${p.name}|${p.pos}`] = openingRatingEvidence(records.get(key), next, ratingVersion, ratingInputs.openingWindow);
      }
      for (const tier of ['bench', 'practice']) result[tier] = t[tier].map(p => one(t.abbr, p));
      return result;
    });
  }
  const heldCounts = buildDepth.lastHeld;
  /* Stamps: the record's read date and the production file's, never the day of
     the bake, so the same inputs always bake the same bytes. */
  const layerRead = layer?.read ?? null;
  const text = renderFile(finalTeams, { read: rec.read, week: rec.week, rosterRows: rec.rosterRowsInRelease, statRows: rec.statRowsInRelease, ratingInputs, ratingVersion, layerRead });
  const depthText = renderDepthFile(depth, { read: rec.read, rosterRows: rec.rosterRowsInRelease, week: rec.week, held: heldCounts, ratingInputs, ratingVersion, layerRead });
  const leftOut = leftOutList(rec, teams, depth, teamMeta, held);
  const byReason = {};
  for (const m of leftOut) {
    const k = m.reason.split(':')[0].replace(/ \(.*\)/, '');
    byReason[k] = (byReason[k] ?? 0) + 1;
  }
  const leftJson = `${JSON.stringify({
    read: rec.read,
    week: rec.week,
    what: 'Every man on an NFL club\'s active, reserve or practice squad list on the record (scripts/data/nflRosters2026.json) who is not in NFL Front Office, and why. Written by scripts/genFrontOfficeRoster.mjs.',
    count: leftOut.length,
    byReason,
    leftOut,
  }, null, 1)}\n`;
  return { teams: finalTeams, seedTeams: teams, depth, held: heldCounts, join, text, depthText, leftOut, leftJson, ratingProblem, ratingVersion, layer, rated };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const log = m => console.log('   ' + m);
  const norm = t => t.split('\r\n').join('\n');
  const existing = fs.readFileSync(OUT, 'utf8');
  const teamMeta = readTeamMeta(norm(existing));
  if (teamMeta.length !== 32) throw new Error(`read ${teamMeta.length} teams from the existing file, expected 32`);
  if (process.argv.includes('--record')) {
    const { rows: rawRoster, file } = await fetchSeasonRoster(ROSTER_SEASON, { log });
    const { rows: stats } = await fetchSeasonStats(STATS_SEASON, { log });
    /* the day the release was pulled is the day its cached copy was written */
    const read = fs.statSync(file).mtime.toISOString().slice(0, 10);
    const rec = makeRecord({ rawRoster, stats, read });
    fs.writeFileSync(RECORD, renderRecord(rec));
    log(`wrote ${path.relative(ROOT, RECORD)}: week ${rec.week} read ${read}, ${rec.roster.length} roster rows of ${rawRoster.length}, ${rec.stats.length} stats rows of ${stats.length}`);
  }
  if (!fs.existsSync(RECORD)) throw new Error(`${path.relative(ROOT, RECORD)} is missing; run with --record to pull the release`);
  const rec = JSON.parse(fs.readFileSync(RECORD, 'utf8'));
  const spot = JSON.parse(fs.readFileSync(SPOT_CHECK, 'utf8'));
  /* The same bar as the NHL bake (Round 830): no bake from a record whose
     second source check was made on another day, and none when the check
     found more than two men the release gets wrong. A fresh --record needs a
     fresh spot check before it can ship. */
  const spotProblem = spotCheckRefusal(spot, rec);
  if (spotProblem) throw new Error(spotProblem);
  const out = bakeFromRecord(rec, teamMeta, spot.heldOut ?? []);
  if (out.ratingProblem) throw new Error(out.ratingProblem);
  log(`record read ${rec.read}, week ${rec.week}: ${rec.roster.length} roster rows (${rec.rosterRowsInRelease} in the release), ${rec.stats.length} stats rows (${rec.statRowsInRelease} in the release)`);
  /* say the join out loud: a silent join is how the whole league got rated on
     draft position once already */
  const j = out.join;
  if (j) log(`join: ${j.matched} of ${j.considered} roster rows found a stats row (${(j.matched / j.considered * 100).toFixed(1)} percent), ${j.rated} of them cleared ${MIN_GAMES} games`);
  const counts = {};
  for (const t of out.teams) for (const p of t.players) counts[p.pos] = (counts[p.pos] ?? 0) + 1;
  console.log(`${out.teams.length} teams, ${Object.values(counts).reduce((a, b) => a + b, 0)} starters: ${Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(', ')}`);
  const active = out.teams.map(t => t.players.length + out.depth.find(d => d.abbr === t.abbr).bench.length);
  const ps = out.depth.map(d => d.practice.length);
  const held = out.held;
  console.log(`active roster per club ${Math.min(...active)} to ${Math.max(...active)} (${active.reduce((a, b) => a + b, 0)} in all), practice squad ${Math.min(...ps)} to ${Math.max(...ps)} (${ps.reduce((a, b) => a + b, 0)}); held out ${held.specialists} specialists, ${held.reserve} reserve list men, ${held.duplicate} duplicates; ${out.leftOut.length} men in the left out list`);
  const files = [[OUT, out.text], [OUT_DEPTH, out.depthText], [LEFT_OUT, out.leftJson]];
  if (process.argv.includes('--check')) {
    /* The whole file, line 1 included: the stamp is the record's read date,
       not the day the bake ran, so the same record always bakes the same bytes. */
    const stale = files.filter(([f, want]) => !fs.existsSync(f) || norm(fs.readFileSync(f, 'utf8')) !== want);
    for (const [f] of files) console.log(`${stale.some(([g]) => g === f) ? 'STALE' : 'up to date'}: ${path.relative(ROOT, f)}`);
    process.exit(stale.length ? 1 : 0);
  }
  const eol = existing.includes('\r\n') ? '\r\n' : '\n';
  for (const [f, text] of files) {
    fs.writeFileSync(f, f === LEFT_OUT ? text : text.split('\n').join(eol));
    console.log(`wrote ${path.relative(ROOT, f)}`);
  }
}
