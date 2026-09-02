/* The front office roster, derived: real 2026 squads with a real defence.

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

   Output: src/data/frontOfficePlayers.ts, committed.
   Fence: scripts/simFrontOfficeRoster.mjs.

   Run: node scripts/genFrontOfficeRoster.mjs
        node scripts/genFrontOfficeRoster.mjs --check   (rebuild, compare, write nothing)
*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchSeasonRoster } from './lib/nflverseRosters.mjs';
import { fetchSeasonStats } from './lib/nflverseStats.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'src', 'data', 'frontOfficePlayers.ts');
export const ROSTER_SEASON = 2026;
export const STATS_SEASON = 2025;
/** On the roster: active, or held on a reserve list. Cut and practice squad are not. */
export const ROSTER_STATUSES = ['ACT', 'RES'];
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
    const g = group(r.position);
    if (!g) continue;
    const team = String(r.team || '').toUpperCase();
    if (!abbrs.has(team)) continue;
    const age = ageOf(r.birth_date);
    if (age == null) continue;
    const name = String(r.full_name || '').trim();
    if (!name) continue;
    const row = r.gsis_id ? statsById.get(r.gsis_id) : null;
    const games = row ? num(row.games) : 0;
    /* a season too short to rate is not a season; he falls to pedigree */
    const s = games >= MIN_GAMES ? row : null;
    const played = !!s;
    const score = g === 'OL' || !played
      ? pedigreeScore(r)
      : (DEFENSIVE.has(g) ? defenceScore(s) : skillScore(s)) / (perGame ? games : 1);
    const fine = finePosition(r, s);
    people.push({ key: `${team}|${name}|${g}`, name, team, group: g, fine, age, score, played, matched: !!row, pedigree: pedigreeScore(r) });
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

export function renderFile(teams, sources) {
  const q = s => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  const lines = [];
  lines.push(`// GENERATED ${new Date().toISOString().slice(0, 10)} by scripts/genFrontOfficeRoster.mjs (do not hand-edit).`);
  lines.push(`// Roster: nflverse rosters release, season ${ROSTER_SEASON}, players on the`);
  lines.push(`// active or reserve list (${sources.rosterRows} rows read).`);
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

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const log = m => console.log('   ' + m);
  const existing = fs.readFileSync(OUT, 'utf8');
  const teamMeta = readTeamMeta(existing.split('\r\n').join('\n'));
  if (teamMeta.length !== 32) throw new Error(`read ${teamMeta.length} teams from the existing file, expected 32`);
  const { rows: roster } = await fetchSeasonRoster(ROSTER_SEASON, { log });
  const { rows: stats } = await fetchSeasonStats(STATS_SEASON, { log });
  log(`roster ${roster.length} rows, stats ${stats.length} rows, ${teamMeta.length} teams`);
  const teams = buildRoster({ roster, stats, teamMeta });
  /* say the join out loud: a silent join is how the whole league got rated on
     draft position once already */
  const j = buildRoster.lastJoin;
  if (j) log(`join: ${j.matched} of ${j.considered} roster rows found a stats row (${(j.matched / j.considered * 100).toFixed(1)} percent), ${j.rated} of them cleared ${MIN_GAMES} games`);
  const text = renderFile(teams, { rosterRows: roster.length, statRows: stats.length });
  const counts = {};
  for (const t of teams) for (const p of t.players) counts[p.pos] = (counts[p.pos] ?? 0) + 1;
  console.log(`${teams.length} teams, ${Object.values(counts).reduce((a, b) => a + b, 0)} players: ${Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(', ')}`);
  if (process.argv.includes('--check')) {
    /* Compare the DERIVATION, not the day it was written. Line 1 carries the
       bake date, and it was inside the comparison, so from the day after a
       bake --check reported STALE on a file where all 480 rows were
       identical. The documented staleness signal was a permanent false
       alarm that could not tell a genuinely stale file from a perfect one. */
    const dropStamp = t => t.split('\n').slice(1).join('\n');
    const same = dropStamp(existing.split('\r\n').join('\n')) === dropStamp(text);
    console.log(same ? 'up to date: the committed file matches the derivation' : 'STALE: the committed file differs from the derivation');
    process.exit(same ? 0 : 1);
  }
  const eol = existing.includes('\r\n') ? '\r\n' : '\n';
  fs.writeFileSync(OUT, text.split('\n').join(eol));
  console.log(`wrote ${path.relative(ROOT, OUT)}`);
}
