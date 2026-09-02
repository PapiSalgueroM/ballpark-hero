/* The front office roster fence. Round 416.

   src/data/frontOfficePlayers.ts is now derived rather than typed, by
   scripts/genFrontOfficeRoster.mjs, and this is what stops the derivation
   rotting quietly. It guards four separate promises.

   1. THE FILE HAS A DEFENCE. The whole reason for the round was that it did
      not: QB, RB, WR, TE and OL and nothing else, so the Trade Finder could
      only ever offer offence. A regression that drops defenders again is the
      exact failure being fixed and has to be loud.

   2. A RATING IS A SPREAD, NOT A CLUSTER. Two separate passes of this bake
      shipped a compressed scale before anyone looked: ranking the whole
      league and then keeping each team's best gave a squad of ninety
      somethings with the worst starting quarterback in the league on 84.
      Nothing crashed, tsc was green, and the file was useless as a trade
      market because every player was worth the same. So the check is on the
      shape of the distribution, not on whether the file parses.

   3. A TOP PICK WITH A QUIET SEASON IS NOT THE WORST PLAYER IN THE LEAGUE.
      This is the one that matters most, because it is about a real person.
      The public stats release has no coverage column, so a corner nobody
      throws at has nothing to accumulate and ranks last on production. The
      bake blends draft pedigree in for exactly this reason. Section 5 runs
      the real buildRoster over a synthetic league so it needs no network,
      and the control drives the blend weight to 0 to prove the blend is
      what is holding that player up.

   4. THE PAGE DOES NOT DESCRIBE THE OLD DATA. Refreshing the file made four
      sentences of shipped copy false in the same minute, one of them inside
      the saved page, and nothing that reads the roster file could ever have
      noticed, because the wrong claim was not in the file.

   Sections 0 to 4 read the shipped file. Section 5 runs the generator's own
   code over a synthetic league. Section 6 checks the file's header still
   describes the method that made it, because a stale header is how a reader
   learns the wrong rule. Section 7 checks the shipped copy against the
   generator. Section 8 guards the four rating rules this round got wrong on
   its first attempts. Section 9 bundles the real engine with esbuild and
   plays ten offseasons.

   Controls, each judged on its own section and each refusing to run if the
   thing it rewrites is absent:
     SIM_FO_CONTROL=offenceonly    drop every defensive row  -> sections 1, 4 red
     SIM_FO_CONTROL=flat           one rating for everyone   -> section 3 red
     SIM_FO_CONTROL=production     blend weight 0            -> section 5 red
     SIM_FO_CONTROL=seasontotals   rate on totals not rates  -> section 5 red
     SIM_FO_CONTROL=staleheader    header forgets the blend  -> section 6 red
     SIM_FO_CONTROL=staleseason    copy names a dead season  -> section 7 red
     SIM_FO_CONTROL=flatpedigree   draft curve clips at 32   -> section 8 red
     SIM_FO_CONTROL=evenblend      one weight for everyone   -> section 8 red
     SIM_FO_CONTROL=openjoin       join floor driven to 0    -> section 8 red
     SIM_FO_CONTROL=straybucket    strays get their own tier -> section 8 red
     SIM_FO_CONTROL=offencecycle   pre 416 replenishment back -> section 9 red
     SIM_FO_CONTROL=unitdefence    pre 418 unit defence back  -> section 10 red
     SIM_FO_CONTROL=meandefence    defence back to a plain mean -> section 10 red
     SIM_FO_CONTROL=shortseason    crossover cut to seven weeks -> section 11 red
*/
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  buildRoster, SLOTS, SCALE, DEFENSIVE, PEDIGREE_WEIGHT, pedigreeWeightFor,
  pedigreeScore, ROSTER_SEASON, STATS_SEASON, MIN_BUCKET,
} from './genFrontOfficeRoster.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = path.join(ROOT, 'src', 'data', 'frontOfficePlayers.ts');
const CONTROL = process.env.SIM_FO_CONTROL || '';
/* Line endings are not a fact about the code. The engine-patching controls
   below match on plain newlines, and this working tree carries CRLF after any
   checkout or rebase, so a control that matched yesterday refused to run today
   for a reason that had nothing to do with what it guards. Its refuse-to-run
   guard fired correctly and told me, which is the only reason this was not a
   silently unverified section. */
const normaliseEol = t => t.split('\r\n').join('\n');

let checks = 0;
const fails = [];
/* Per section tallies, because runAllSims marks a harness EMPTY when it prints
   fewer than four lines, and it is right to: what a harness PRINTS is the only
   evidence it ran. A single "N checks passed" says nothing about which of the
   ten sections did any work, so each one reports for itself below. */
const bySection = new Map();
const SECTION_NAMES = {
  0: 'the parser read the whole file',
  1: 'the file has a defence',
  2: 'the smell list, every shipped row',
  3: 'a rating is a spread, not a cluster',
  4: 'defenders are a real share',
  5: 'a top pick with a quiet season, on the real code',
  6: 'the header still describes the bake',
  7: 'the page copy agrees with the generator',
  8: 'the rules this round got wrong the first time',
  9: 'the defence survives the seasons',
  10: 'the defence is the defenders',
  11: 'every club plays seventeen games',
};
const ok = (section, label, pass, detail) => {
  checks += 1;
  const s = bySection.get(section) ?? { n: 0, bad: 0 };
  s.n += 1;
  if (!pass) s.bad += 1;
  bySection.set(section, s);
  if (!pass) fails.push(`[${section}] ${label}${detail ? ': ' + detail : ''}`);
};

const src = fs.readFileSync(FILE, 'utf8').split('\r\n').join('\n');

/* ---- parse the shipped file ------------------------------------------- */
/* A quoted string in the generated file may contain an ESCAPED quote, because
   plenty of real players are called Ja'Marr or De'Von. The first version of
   this parser stopped at the backslash and silently dropped twelve players,
   which then read as three teams fielding a man short. A harness that
   miscounts is worse than no harness, so the shape below handles the escape
   and section 0 refuses to let the run continue on a bad count. */
const STR = "'((?:[^'\\\\]|\\\\.)*)'";
const TEAM_RE = new RegExp(`\\{ abbr: ${STR}, city: ${STR}, name: ${STR}, color: ${STR}, division: ${STR}, defense: (\\d+), players: \\[([\\s\\S]*?)\\n  \\] \\}`, 'g');
const ROW_RE = new RegExp(`\\{ name: ${STR}, pos: '(\\w+)', age: (\\d+), ovr: (\\d+), salary: ([\\d.]+), years: (\\d+) \\}`, 'g');
const unq = s => s.replace(/\\(.)/g, '$1');

let teams = [];
for (const m of src.matchAll(TEAM_RE)) {
  const players = [...m[7].matchAll(ROW_RE)].map(r => ({
    name: unq(r[1]), pos: r[2], age: Number(r[3]), ovr: Number(r[4]), salary: Number(r[5]), years: Number(r[6]),
  }));
  teams.push({ abbr: unq(m[1]), division: unq(m[5]), defense: Number(m[6]), players });
}

/* ---- 0. the parser read the whole file --------------------------------- */
const EXPECTED = 32 * Object.values(SLOTS).reduce((a, b) => a + b, 0);
const parsed = teams.reduce((n, t) => n + t.players.length, 0);
if (teams.length !== 32 || parsed !== EXPECTED) {
  console.error(`FAIL [0] the parser read ${teams.length} teams and ${parsed} players, expected 32 and ${EXPECTED}. Nothing below was measured, so fix the parser or the bake before trusting this harness.`);
  process.exit(1);
}
console.log(`   parsed ${teams.length} teams and ${parsed} players`);

/* ---- controls, applied to the parsed data ------------------------------ */
if (CONTROL === 'offenceonly') {
  const before = teams.reduce((n, t) => n + t.players.filter(p => DEFENSIVE.has(p.pos)).length, 0);
  if (before === 0) throw new Error('control offenceonly: there are no defenders to remove, so it would change nothing');
  teams = teams.map(t => ({ ...t, players: t.players.filter(p => !DEFENSIVE.has(p.pos)) }));
  console.log(`   control offenceonly: removed ${before} defenders`);
}
if (CONTROL === 'flat') {
  const spread = new Set(teams.flatMap(t => t.players.map(p => p.ovr))).size;
  if (spread <= 1) throw new Error('control flat: every rating is already the same, so it would change nothing');
  teams = teams.map(t => ({ ...t, players: t.players.map(p => ({ ...p, ovr: 82 })) }));
  console.log(`   control flat: collapsed ${spread} distinct ratings to one`);
}

const all = teams.flatMap(t => t.players.map(p => ({ ...p, team: t.abbr })));
const byPos = new Map();
for (const p of all) {
  if (!byPos.has(p.pos)) byPos.set(p.pos, []);
  byPos.get(p.pos).push(p);
}

/* ---- 1. the file has a defence ----------------------------------------- */
for (const g of Object.keys(SLOTS)) {
  const n = byPos.get(g)?.length ?? 0;
  ok(1, `${g} exists in the file`, n > 0, `found ${n}`);
}
for (const g of [...DEFENSIVE]) {
  const teamsWith = teams.filter(t => t.players.some(p => p.pos === g)).length;
  ok(1, `every team carries a ${g}`, teamsWith === 32, `${teamsWith} of 32 teams`);
}

/* ---- 2. the smell list, on every shipped row ---------------------------- */
const badAge = all.filter(p => !(p.age >= 18 && p.age <= 45));
ok(2, 'no impossible age', badAge.length === 0, badAge.slice(0, 3).map(p => `${p.name} ${p.age}`).join(', '));
const badOvr = all.filter(p => !(p.ovr >= 40 && p.ovr <= 99));
ok(2, 'no rating outside 40 to 99', badOvr.length === 0, badOvr.slice(0, 3).map(p => `${p.name} ${p.ovr}`).join(', '));
const badSalary = all.filter(p => !(p.salary > 0) || !(p.years >= 1));
ok(2, 'every contract is positive', badSalary.length === 0, badSalary.slice(0, 3).map(p => `${p.name} ${p.salary}m ${p.years}y`).join(', '));
const blank = all.filter(p => !p.name.trim() || /undefined|NaN|null/.test(p.name));
ok(2, 'no blank or leaked name', blank.length === 0, blank.slice(0, 3).map(p => p.name).join(', '));
const dupes = [];
for (const t of teams) {
  const seen = new Set();
  for (const p of t.players) {
    if (seen.has(p.name)) dupes.push(`${t.abbr} ${p.name}`);
    seen.add(p.name);
  }
}
ok(2, 'no player listed twice on one team', dupes.length === 0, dupes.slice(0, 3).join(', '));

/* ---- 3. a rating is a spread, not a cluster ----------------------------- */
/* Bars set from measured headroom, not from a number that felt right. On the
   shipped bake the skill and defence groups run an interquartile range of
   15 to 16 and the linemen 5, so 8 and 3 sit well clear of healthy code
   while still failing the two compressed passes this round actually shipped
   (the first of those had a quarterback floor of 84 against a 66 scale). */
const IQR_BAR = { skill: 8, def: 8, OL: 3 };
for (const g of Object.keys(SLOTS)) {
  const list = (byPos.get(g) ?? []).map(p => p.ovr).sort((a, b) => a - b);
  if (!list.length) { ok(3, `${g} has ratings to measure`, false, 'no players'); continue; }
  const q = f => list[Math.floor((list.length - 1) * f)];
  const iqr = q(0.75) - q(0.25);
  const kind = g === 'OL' ? 'OL' : DEFENSIVE.has(g) ? 'def' : 'skill';
  const [lo, hi] = g === 'OL' ? SCALE.OL : DEFENSIVE.has(g) ? SCALE.def : SCALE.skill;
  ok(3, `${g} ratings are spread`, iqr >= IQR_BAR[kind], `interquartile range ${iqr}, bar ${IQR_BAR[kind]}`);
  ok(3, `${g} reaches the bottom of its scale`, q(0) <= lo + Math.round((hi - lo) * 0.25),
    `floor ${q(0)} against a scale of ${lo} to ${hi}`);
}

/* ---- 4. defenders are a real share, not a token ------------------------- */
const wantedDef = [...DEFENSIVE].reduce((n, g) => n + SLOTS[g], 0);
for (const t of teams) {
  const n = t.players.filter(p => DEFENSIVE.has(p.pos)).length;
  ok(4, `${t.abbr} fields a full defence`, n === wantedDef, `${n} defenders, expected ${wantedDef}`);
}
const defShare = all.filter(p => DEFENSIVE.has(p.pos)).length / all.length;
ok(4, 'defenders are a real share of the file', defShare >= 0.3, `${(defShare * 100).toFixed(0)} percent`);

/* ---- 5. a top pick with a quiet season is not the worst in the league ---- */
/* The real buildRoster over a synthetic league, so this needs no network and
   no cache: four corners for a team's two defensive back slots, one of them a
   first overall pick who had a season nobody threw at. He must survive the
   cut AND clear the bottom of the scale, because those were two separate
   bugs, one of them invisible: a player who is cut cannot look wrong.
   The numbers are deliberate. The top pick is NOT the worst producer, only a
   below average one, because a 50/50 blend of two exactly reversed orderings
   ties every player with every other and proves nothing. Here the orderings
   cross instead, with Corner A worst on both counts, so the blend has
   something real to separate. On the blend the top pick leads and is kept.
   On production alone he is third and is cut, which is the failure this
   section exists for. */
const synthTeamMeta = [{ abbr: 'AAA', city: 'A', name: 'A', color: '#000000', division: 'X', defense: 80 }];
const synthRoster = [];
const synthStats = [];
const CORNERS = [
  { name: 'Quiet Star', pick: 1, solo: 24, pd: 8 },
  { name: 'Corner A', pick: 140, solo: 16, pd: 3 },
  { name: 'Corner B', pick: 160, solo: 50, pd: 6 },
  { name: 'Corner C', pick: 200, solo: 70, pd: 9 },
];
CORNERS.forEach((c, i) => {
  const id = `cb-${i}`;
  synthRoster.push({
    full_name: c.name, gsis_id: id, position: 'DB', depth_chart_position: 'CB',
    team: 'AAA', status: 'ACT', birth_date: '1999-01-01',
    draft_number: String(c.pick), years_exp: '4',
  });
  synthStats.push({
    player_id: id, position: 'CB', games: '17',
    def_tackles_solo: String(c.solo), def_pass_defended: String(c.pd),
    def_interceptions: '0', def_sacks: '0', def_tackles_for_loss: '0',
    def_qb_hits: '0', def_fumbles_forced: '0', def_tackle_assists: '0',
  });
});
/* The other groups need a body each so the bake fills its slots without
   noise, and each one needs a stats row: the bake refuses a feed where too
   few roster rows find one, which is the fail closed guard on the join, and
   a fixture of bodies with no production is exactly what a broken join looks
   like. Giving them a season is also more honest than not. */
for (const g of ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB']) {
  for (let i = 0; i < SLOTS[g]; i += 1) {
    const id = `${g}-${i}`;
    synthRoster.push({
      full_name: `${g} ${i}`, gsis_id: id, position: g, depth_chart_position: g,
      team: 'AAA', status: 'ACT', birth_date: '1998-01-01', draft_number: String(50 + i), years_exp: '3',
    });
    synthStats.push({
      player_id: id, position: g, games: '17',
      passing_yards: g === 'QB' ? String(3000 + i * 200) : '0', passing_tds: '0',
      rushing_yards: g === 'RB' ? String(700 + i * 100) : '0', rushing_tds: '0',
      receptions: g === 'WR' || g === 'TE' ? String(50 + i * 5) : '0',
      receiving_yards: g === 'WR' || g === 'TE' ? String(600 + i * 80) : '0', receiving_tds: '0',
      def_tackles_solo: g === 'DL' || g === 'LB' ? String(40 + i * 8) : '0',
      def_sacks: g === 'DL' ? String(4 + i) : '0',
      def_pass_defended: '0', def_interceptions: '0', def_tackles_for_loss: '0',
      def_qb_hits: '0', def_fumbles_forced: '0', def_tackle_assists: '0',
    });
  }
}

const weight = CONTROL === 'production' ? 0 : PEDIGREE_WEIGHT;
if (CONTROL === 'production') {
  if (!(PEDIGREE_WEIGHT > 0)) throw new Error('control production: the blend weight is already 0, so it would change nothing');
  console.log(`   control production: blend weight driven from ${PEDIGREE_WEIGHT} to 0`);
}
const synthTeams = buildRoster({ roster: synthRoster, stats: synthStats, teamMeta: synthTeamMeta, pedigreeWeight: weight });
const synthDbs = synthTeams[0].players.filter(p => p.pos === 'DB').sort((a, b) => b.ovr - a.ovr);
const star = synthDbs.find(p => p.name === 'Quiet Star');
ok(5, 'a top pick with a quiet season survives the cut', !!star,
  `kept ${synthDbs.map(p => p.name).join(', ')}`);
if (star) {
  const [lo, hi] = SCALE.def;
  const floor = lo + Math.round((hi - lo) * 0.25);
  ok(5, 'a top pick with a quiet season clears the bottom of the scale', star.ovr > floor,
    `rated ${star.ovr}, floor for this check ${floor}, scale ${lo} to ${hi}`);
}
/* and production still has to count for something, or the blend is just
   draft night: a late pick who produced must beat a late pick who did not */
const prodRoster = [
  { full_name: 'Producer', gsis_id: 'p1', position: 'DB', depth_chart_position: 'CB', team: 'AAA', status: 'ACT', birth_date: '1998-01-01', draft_number: '200', years_exp: '3' },
  { full_name: 'Quiet', gsis_id: 'p2', position: 'DB', depth_chart_position: 'CB', team: 'AAA', status: 'ACT', birth_date: '1998-01-01', draft_number: '200', years_exp: '3' },
];
const prodStats = [
  { player_id: 'p1', position: 'CB', games: '17', def_tackles_solo: '90', def_pass_defended: '15', def_interceptions: '5', def_sacks: '0', def_tackles_for_loss: '4', def_qb_hits: '0', def_fumbles_forced: '2', def_tackle_assists: '20' },
  { player_id: 'p2', position: 'CB', games: '17', def_tackles_solo: '5', def_pass_defended: '0', def_interceptions: '0', def_sacks: '0', def_tackles_for_loss: '0', def_qb_hits: '0', def_fumbles_forced: '0', def_tackle_assists: '0' },
];
const prodTeams = buildRoster({ roster: prodRoster, stats: prodStats, teamMeta: synthTeamMeta });
const pd = Object.fromEntries(prodTeams[0].players.filter(p => p.pos === 'DB').map(p => [p.name, p.ovr]));
ok(5, 'production still separates two players of equal pedigree', (pd.Producer ?? 0) > (pd.Quiet ?? 0),
  `producer ${pd.Producer}, quiet ${pd.Quiet}`);

/* ---- 5b. a missed season is not a bad season --------------------------- */
/* Two corners with the same pedigree and the same production PER GAME, one
   of whom played six games and one seventeen. They are the same player as
   far as anything measurable goes, so they must rate the same. On season
   totals the injured one lands near the bottom, which is what put Fred
   Warner there. */
const RATE = { solo: 5, pd: 1, tfl: 0.5 };
const injRoster = ['Ironman', 'Injured'].map((n, i) => ({
  full_name: n, gsis_id: `inj-${i}`, position: 'DB', depth_chart_position: 'CB',
  team: 'AAA', status: 'ACT', birth_date: '1998-01-01', draft_number: '120', years_exp: '4',
}));
const injStats = [17, 6].map((gp, i) => ({
  player_id: `inj-${i}`, position: 'CB', games: String(gp),
  def_tackles_solo: String(RATE.solo * gp), def_pass_defended: String(RATE.pd * gp),
  def_tackles_for_loss: String(RATE.tfl * gp),
  def_interceptions: '0', def_sacks: '0', def_qb_hits: '0', def_fumbles_forced: '0', def_tackle_assists: '0',
}));
if (CONTROL === 'seasontotals') {
  const rates = new Set(injStats.map(s => Number(s.def_tackles_solo) / Number(s.games)));
  if (rates.size !== 1) throw new Error('control seasontotals: the two fixtures do not share a per game rate, so it would prove nothing');
  console.log('   control seasontotals: rating on season totals instead of per game');
}
const injTeams = buildRoster({
  roster: injRoster, stats: injStats, teamMeta: synthTeamMeta,
  perGame: CONTROL !== 'seasontotals',
});
const inj = Object.fromEntries(injTeams[0].players.filter(p => p.pos === 'DB').map(p => [p.name, p.ovr]));
ok(5, 'a missed season is not a bad season', inj.Ironman === inj.Injured,
  `seventeen games ${inj.Ironman}, six games ${inj.Injured}, same production per game`);

/* ---- 6. the header still describes the method that made the file -------- */
const header = src.slice(0, src.indexOf('export interface'));
let headerText = header;
if (CONTROL === 'staleheader') {
  if (!/coverage/i.test(header)) throw new Error('control staleheader: the header does not mention coverage, so it would change nothing');
  if (!new RegExp(`rosters release,\\s*season\\s*${ROSTER_SEASON}`, 'i').test(header)) {
    throw new Error(`control staleheader: the header does not state season ${ROSTER_SEASON}, so the season half would change nothing`);
  }
  headerText = header
    .replace(/coverage/gi, 'passing')
    .replace(new RegExp(`(rosters release,\\s*season\\s*)${ROSTER_SEASON}`, 'i'), `$1${ROSTER_SEASON - 1}`);
  console.log('   control staleheader: the header no longer says why the blend exists, and it names last year\'s roster');
}
ok(6, 'the header names the generator', /genFrontOfficeRoster\.mjs/.test(headerText));
ok(6, 'the header says the ratings are derived, not typed', /do not hand-edit/i.test(headerText));
ok(6, 'the header explains why defenders are blended', /coverage/i.test(headerText),
  'a reader who does not know the release has no coverage column will read the blend as a fudge');
ok(6, 'the header keeps the contracts honest', /fictional/i.test(headerText));
/* AND IT NAMES THE SEASONS THE BAKE ACTUALLY READ. Everything above this
   line looks for a word, so the header could describe a completely
   different bake and stay green as long as it kept saying "coverage" and
   "fictional". These two read numbers out of the header and compare them
   against the generator's own constants, so the next refresh cannot leave
   the file's own first paragraph describing last year's data. */
const headRoster = headerText.match(/rosters release,\s*season\s*(\d{4})/i);
const headStats = headerText.match(/post season\s*(\d{4})/i);
ok(6, 'the header names the roster season the bake read',
  !!headRoster && Number(headRoster[1]) === ROSTER_SEASON,
  headRoster ? `header says ${headRoster[1]}, the bake read ${ROSTER_SEASON}` : 'the header does not state a roster season at all');
ok(6, 'the header names the stats season the bake read',
  !!headStats && Number(headStats[1]) === STATS_SEASON,
  headStats ? `header says ${headStats[1]}, the bake read ${STATS_SEASON}` : 'the header does not state a stats season at all');

/* ---- 7. the page does not tell the player the wrong season -------------- */
/* This one exists because the bake refreshed the data and left the copy
   behind. Four places told a visitor the wrong thing over a 2026 squad list
   rated from one season: "real 2025 rosters, rated from two seasons of real
   production" on the pick screen, in the SEO block and in the FAQ answer, and
   "rated from real 2023-24 production" in the how to play steps. Nothing
   about the roster file could catch that, because the lie was not in the
   file.
   THE FIRST VERSION OF THIS CHECK ONLY LOOKED FOR A YEAR BESIDE THE WORD
   ROSTER, and it found three of the four. The one it missed said production
   instead. So it does not look for a phrase any more: EVERY four digit year
   in the front office copy has to be a season the generator actually read.
   A rule shaped around the offenders somebody already found is a rule that
   finds nothing new, which is the lesson the prerenderer learned twice. */
const COPY = [
  'src/pages/FrontOffice.tsx',
  'src/components/front-office/FrontOfficeBoard.tsx',
  /* only the front office block: this file holds a dozen other games */
  ['src/data/gameContent/football.ts', "'/front-office': {", "'/nfl-my-career': {"],
];
/* AND IT HAS TO TIE THE YEAR TO WHAT THE YEAR IS ABOUT. The second version
   accepted any year in {ROSTER_SEASON, STATS_SEASON}, which sounds strict
   and is not, because STATS_SEASON is ALWAYS last year's ROSTER_SEASON. The
   headline offender, "Real 2025 rosters" written over a 2026 squad, is a
   claim about the roster year using a number that is legitimately the stats
   year, so it sailed through: restoring that exact sentence left the fence
   at 80 of 80, green, on the one bug the section exists to stop. Worse, it
   would keep sailing through forever, since every bake makes last year's
   roster year this year's stats year.
   A year is now read WITH ITS NOUN. Beside the word roster or squad it must
   be ROSTER_SEASON; beside production, season, stats or rated it must be
   STATS_SEASON; anywhere else in that copy it must be one of the two. And a
   sentence that makes a dated claim with no year in it at all is a failure
   rather than a silent skip, because deleting the year was the other way to
   go green. */
const stripComments = t => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const SEASONS = new Set([ROSTER_SEASON, STATS_SEASON]);
const NEAR = 40;
/* One shared year pattern. The second copy of it was written with doubled
   backslashes, so it matched nothing and the per file tally read zero for
   every file. A pattern used twice gets defined once. */
const YEAR_RE = () => /\b(19\d\d|20\d\d)\b/g;
const ROSTER_WORD = /\b(roster|rosters|squad|squads)\b/i;
const STATS_WORD = /\b(production|season|stats|statistics|rated)\b/i;
/* a dated claim with the year taken out is still a dated claim */
const YEARLESS = [
  /\btwo seasons of\b/i,
  /\blast (?:two |three )?seasons?\b/i,
  /\bprevious season\b/i,
];
let copyYears = 0;
const yearsPerFile = [];
for (const entry of COPY) {
  const [rel, from, to] = Array.isArray(entry) ? entry : [entry];
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) { ok(7, `${rel} exists`, false, 'the fence points at a file that is gone'); continue; }
  let text = stripComments(fs.readFileSync(p, 'utf8'));
  if (from) {
    const a = text.indexOf(from);
    const b = text.indexOf(to, a + 1);
    if (a < 0 || b < 0) { ok(7, `${rel} still has a front office block to read`, false, `could not find ${from} then ${to}`); continue; }
    text = text.slice(a, b);
  }
  /* The control restores the ACTUAL pre round sentence, not an implausible
     year. A control that swaps in 2015 only proves the section can see a
     year nobody would write; this one reproduces the exact copy bug that
     shipped, which is the only thing worth proving. */
  if (CONTROL === 'staleseason' && rel.endsWith('FrontOfficeBoard.tsx')) {
    const want = `Real ${ROSTER_SEASON} rosters`;
    if (!text.includes(want)) throw new Error(`control staleseason: "${want}" is not in the board copy, so it would change nothing`);
    text = text.split(want).join(`Real ${STATS_SEASON} rosters`);
    console.log(`   control staleseason: the board copy put back "Real ${STATS_SEASON} rosters", the sentence that actually shipped`);
  }
  for (const m of text.matchAll(YEAR_RE())) {
    const year = Number(m[1]);
    copyYears += 1;
    const around = text.slice(Math.max(0, m.index - NEAR), m.index + NEAR);
    const before = text.slice(Math.max(0, m.index - NEAR), m.index);
    const after = text.slice(m.index + m[0].length, m.index + m[0].length + NEAR);
    /* "2026 rosters" and "rosters ... 2026" both count as a roster claim */
    const rosterClaim = ROSTER_WORD.test(after.slice(0, 20)) || ROSTER_WORD.test(before.slice(-20));
    const statsClaim = !rosterClaim && STATS_WORD.test(around);
    const want = rosterClaim ? ROSTER_SEASON : statsClaim ? STATS_SEASON : null;
    const label = rosterClaim ? 'a roster year' : statsClaim ? 'a production year' : 'a year';
    ok(7, `${rel} states ${label} the bake agrees with`,
      want == null ? SEASONS.has(year) : year === want,
      `copy says ${year} in "${around.replace(/\s+/g, ' ').trim().slice(0, 70)}"; the bake read the ${ROSTER_SEASON} roster and the ${STATS_SEASON} season`);
  }
  yearsPerFile.push([rel, [...text.matchAll(YEAR_RE())].length]);
  for (const re of YEARLESS) {
    const m = text.match(re);
    ok(7, `${rel} makes no dated claim without a year`, !m,
      m ? `"${m[0]}" dates the data without naming a season, so no year check can ever see it` : '');
  }
}
/* AND A FILE THAT SIMPLY DROPS ITS YEARS MUST FAIL, NOT GO QUIET. The year
   checks are generated per match, so deleting a sentence's years deletes its
   checks: the board copy could be changed from "Real 2026 rosters, rated off
   the 2025 season" to "Real rosters, rated off recent production" and the
   fence went from 112 checks to 110 and still exited 0. Fewer checks passing
   is not the same as passing, and nothing in the report block noticed. Each
   source is now required to carry at least one year of its own. */
for (const [rel, n] of yearsPerFile) {
  ok(7, `${rel} still dates its own claims`, n > 0,
    'every year was removed from this file, so its claims cannot be checked against the bake at all');
}
ok(7, 'the front office copy states a season at all', copyYears > 0,
  'no year appears anywhere in it, so this section proved nothing');

/* ---- 8. the rules the round got wrong the first time -------------------- */
/* Every check here exists because a reviewer found the shipped bake doing
   the opposite, and every one of them was invisible to sections 0 to 7. */

/* 8a. THE DRAFT CURVE REACHES THE END OF THE DRAFT. The first curve was
   100 - log2(pick) * 14 floored at 30, and log2(32) * 14 is exactly 70, so
   every pick from 32 to the last one scored identically to going undrafted:
   288 of the 480 shipped men sat on that floor. A rating that cannot tell
   pick 33 from an undrafted free agent is not using the draft at all. */
/* the control is the curve this round shipped first: 14 per doubling with a
   floor of 30, which lands on that floor at pick 32 and never leaves it */
const OLD_CURVE = (pick, exp) => (pick > 0 ? Math.max(30, 100 - Math.log2(pick) * 14) : 30)
  + Math.min(exp, 8) * 3 - Math.max(0, exp - 12) * 2;
if (CONTROL === 'flatpedigree') {
  if (pedigreeScore({ draft_number: '250', years_exp: '4' }) <= pedigreeScore({ draft_number: '0', years_exp: '4' })) {
    throw new Error('control flatpedigree: the live curve already puts pick 250 at or below undrafted, so it would change nothing');
  }
  console.log('   control flatpedigree: the draft curve put back to the one that clipped at pick 32');
}
const ped = CONTROL === 'flatpedigree'
  ? OLD_CURVE
  : (pick, exp) => pedigreeScore({ draft_number: String(pick), years_exp: String(exp) });
const undrafted = ped(0, 4);
ok(8, 'a late pick still beats going undrafted', ped(250, 4) > undrafted,
  `pick 250 scores ${ped(250, 4).toFixed(1)}, undrafted ${undrafted.toFixed(1)}`);
ok(8, 'the draft curve separates round two from round seven', ped(40, 4) - ped(240, 4) >= 8,
  `pick 40 ${ped(40, 4).toFixed(1)}, pick 240 ${ped(240, 4).toFixed(1)}, gap ${(ped(40, 4) - ped(240, 4)).toFixed(1)}`);
ok(8, 'the draft curve is monotonic through the whole draft',
  [1, 10, 32, 64, 100, 160, 220, 262].every((p, i, a) => i === 0 || ped(p, 4) < ped(a[i - 1], 4)),
  [1, 10, 32, 64, 100, 160, 220, 262].map(p => `${p}:${ped(p, 4).toFixed(0)}`).join(' '));
/* and it has to survive contact with the real file, not just the curve */
const atFloor = [];
for (const p of all) if (DEFENSIVE.has(p.pos) || p.pos === 'OL') atFloor.push(p);
ok(8, 'the shipped defenders and linemen are not one flat rating',
  new Set(atFloor.map(p => p.ovr)).size >= 12,
  `${new Set(atFloor.map(p => p.ovr)).size} distinct ratings across ${atFloor.length} men`);

/* 8a2. THE LINEMEN'S BAND STAYS NARROW WHILE THEY ARE GUESSES. An offensive
   lineman has no countable event in any public feed, so his rating is
   pedigree and nothing else, and pedigree cannot see a third round pick who
   became one of the best in the league: Creed Humphrey comes out 62nd of 64.
   The honest response to a weak signal is a narrow scale, and the file's is
   80 to 90 against the corners' 66 to 95. This check exists so nobody later
   widens that band without first giving the linemen something real to be
   rated on, which would turn a modest claim into a confident wrong one. */
const [olLo, olHi] = SCALE.OL;
const [defLo, defHi] = SCALE.def;
ok(8, 'the linemen are rated on a narrower band than the players with real stats',
  (olHi - olLo) <= (defHi - defLo) / 2,
  `linemen span ${olHi - olLo} points against ${defHi - defLo} for defenders, on a signal that is pure pedigree`);

/* 8b. A CORNER IS NOT RATED MOSTLY ON PRODUCTION. Both halves of the blend
   are midrank percentiles and so uniform by construction, which means an
   even split can never carry a bottom decile producer past the middle of
   the scale however high he was drafted. Pat Surtain II came out at exactly
   0.500 and shipped at 80, below an undrafted corner on 90. The weight is
   per position now, and this is the shape check on it. */
if (CONTROL === 'evenblend') {
  if (pedigreeWeightFor('DB', 'CB') === pedigreeWeightFor('DL', 'DE')) {
    throw new Error('control evenblend: every defender already shares one weight, so it would change nothing');
  }
  console.log(`   control evenblend: every defender put back on the single ${PEDIGREE_WEIGHT} weight that shipped first`);
}
const wFor = CONTROL === 'evenblend'
  ? (g) => (DEFENSIVE.has(g) ? PEDIGREE_WEIGHT : 0)
  : pedigreeWeightFor;
ok(8, 'a cornerback leans on pedigree rather than counting stats',
  wFor('DB', 'CB') > 0.5,
  `CB weight is ${wFor('DB', 'CB')}, and at or below 0.5 the arithmetic cannot lift an elite corner off the floor`);
ok(8, 'a pass rusher leans on his counting stats, because a sack is the job',
  wFor('DL', 'DE') < 0.5, `DE weight is ${wFor('DL', 'DE')}`);
ok(8, 'a corner leans on pedigree harder than a pass rusher does',
  wFor('DB', 'CB') > wFor('DL', 'DE'),
  `CB ${wFor('DB', 'CB')} against DE ${wFor('DL', 'DE')}`);
ok(8, 'a skill player is not rated on pedigree at all', wFor('WR', 'WR') === 0,
  `WR weight is ${wFor('WR', 'WR')}`);
/* the outcome, on the real cohort: a top ten pick at corner with a quiet
   season must not finish below the median of the corners the file kept */
const dbs = (byPos.get('DB') ?? []).map(p => p.ovr).sort((a, b) => a - b);
const dbMedian = dbs[Math.floor(dbs.length / 2)];
const ELITE_CB = ['Pat Surtain II', 'Sauce Gardner', 'Derek Stingley Jr.'];
const eliteFound = all.filter(p => ELITE_CB.includes(p.name));
ok(8, 'the elite corners the file kept are rated above its own median back',
  eliteFound.length > 0 && eliteFound.every(p => p.ovr > dbMedian),
  eliteFound.length
    ? `${eliteFound.map(p => `${p.name} ${p.ovr}`).join(', ')} against a median of ${dbMedian}`
    : 'none of them are in the file, so this proved nothing');

/* 8c. THE JOIN FAILS CLOSED. A renamed games column routed every player to
   pedigree, changed 137 of 480 names, dropped Josh Allen from 97 to 78, and
   exited 0 with every check green. The guard has two floors, because guarding
   the join alone did NOT catch this: a dropped games column leaves every row
   matching perfectly and simply reads them all as zero games. */
if (CONTROL === 'openjoin') console.log('   control openjoin: the join floor driven to 0, which is what fail open looks like');
let refused = null;
try {
  buildRoster({
    roster: synthRoster,
    stats: synthStats.map(s => { const { games, ...rest } = s; return rest; }),
    teamMeta: synthTeamMeta,
    ...(CONTROL === 'openjoin' ? { minJoinRate: 0 } : {}),
  });
} catch (e) { refused = String(e.message || e); }
ok(8, 'the bake refuses a feed whose games column has gone', refused !== null,
  refused === null ? 'it wrote a file rating the whole league on draft position and said nothing' : '');
/* either half of the guard is a correct refusal here: the rows still match,
   they just all read zero games, so it is the second floor that catches it */
ok(8, 'and it says why', refused !== null && /(join matched only|cleared \d+ games)/i.test(refused)
  && /draft position alone/i.test(refused),
  refused ? refused.slice(0, 110) : '');

/* 8d. A RARE DEPTH CHART LABEL IS NOT A FREE 95. The fallback for a bucket
   under MIN_BUCKET keyed on the group name, which built a LEFTOVERS bucket
   instead of merging, and every bucket is mapped across the whole scale
   independently, so a bucket of one took the ceiling. On the real feed,
   giving Demario Davis a bare LB label moved him from 69 to 95 without
   changing anything he did. */
/* This needs a bucket big enough to be a bucket, so it runs its own league
   of eight teams: sixteen defensive backs get kept, fifteen labelled CB and
   one labelled NICKEL, a label nobody else in the league holds. The odd man
   is the WORST of the sixteen on both production and pedigree, so any
   rating above the floor is the label talking rather than the player. */
const bigMeta = Array.from({ length: 8 }, (_, t) => ({
  abbr: `T${t}`, city: 'C', name: 'N', color: '#000000', division: 'X', defense: 80,
}));
const bigRoster = [];
const bigStats = [];
for (let t = 0; t < 8; t += 1) {
  for (const g of Object.keys(SLOTS)) {
    for (let i = 0; i < SLOTS[g] + 1; i += 1) {
      const id = `T${t}-${g}-${i}`;
      /* The odd man must be GOOD ENOUGH TO BE KEPT and BAD ENOUGH that the
         top of the scale is obviously wrong for him, or the check proves
         nothing. So his own team's other backs are worse than he is (he
         makes their two slots) while every other team's are better than he
         is (he is near the bottom of the sixteen kept). */
      const odd = g === 'DB' && t === 0 && i === 0;
      const weakTeam = g === 'DB' && t === 0;
      bigRoster.push({
        full_name: odd ? 'Odd Label' : `${g} ${t}-${i}`, gsis_id: id,
        position: g, depth_chart_position: odd ? 'NICKEL' : (g === 'DB' ? 'CB' : g),
        team: `T${t}`, status: 'ACT', birth_date: '1998-01-01',
        draft_number: odd ? '200' : weakTeam ? '255' : String(10 + t * 5 + i),
        years_exp: odd ? '4' : weakTeam ? '2' : '5',
      });
      bigStats.push({
        player_id: id, position: g, games: '17',
        def_tackles_solo: odd ? '12' : weakTeam ? '2' : String(30 + t * 4 + i * 3),
        def_pass_defended: odd ? '1' : weakTeam ? '0' : String(3 + i),
        passing_yards: g === 'QB' ? String(3000 + t * 100) : '0',
        receiving_yards: g === 'WR' || g === 'TE' ? String(500 + t * 50) : '0',
        rushing_yards: g === 'RB' ? String(600 + t * 40) : '0',
        receptions: '0', passing_tds: '0', rushing_tds: '0', receiving_tds: '0',
        def_sacks: '0', def_interceptions: '0', def_tackles_for_loss: '0',
        def_qb_hits: '0', def_fumbles_forced: '0', def_tackle_assists: '0',
      });
    }
  }
}
const nickels = bigRoster.filter(r => r.depth_chart_position === 'NICKEL').length;
const corners = bigRoster.filter(r => r.depth_chart_position === 'CB').length;
if (nickels !== 1 || corners < MIN_BUCKET) {
  throw new Error(`section 8d fixture is wrong: ${nickels} odd labels and ${corners} corners, it would prove nothing`);
}
if (CONTROL === 'straybucket') console.log('   control straybucket: the odd label put back into a leftovers bucket of its own');
const oddTeams = buildRoster({
  roster: bigRoster, stats: bigStats, teamMeta: bigMeta,
  ...(CONTROL === 'straybucket' ? { bucketFallback: 'group' } : {}),
});
const odd = oddTeams.flatMap(t => t.players).find(p => p.name === 'Odd Label');
const [dLo, dHi] = SCALE.def;
const oddCeiling = dLo + Math.round((dHi - dLo) * 0.5);
/* not keeping him is a FAILURE, not a pass: a check that goes green because
   its subject fell out of the fixture is the thing this repo keeps banning */
ok(8, 'the odd label fixture kept the man it is about', !!odd,
  odd ? '' : 'Odd Label was cut, so the bucket rule was never exercised. Fix the fixture, do not trust this section.');
if (odd) {
  ok(8, 'a one man depth chart label does not buy a rating', odd.ovr <= oddCeiling,
    `a back who is near the bottom of the sixteen kept, relabelled to a position nobody else holds, rates ${odd.ovr} on a ${dLo} to ${dHi} scale`);
}

/* ---- 9. the defence survives the seasons -------------------------------- */
/* The one gameplay consequence of the bake, and it is a real engine test
   rather than a look at the source. replenishRosters guaranteed a
   quarterback and two linemen and then filled to nine off a cycle of
   WR, RB, TE, WR, OL. With the old offence-only roster that was harmless.
   With six defenders per club it is a slow leak: every defender released,
   traded or retired came back as a receiver, so a long save drifts back to
   the offence-only roster this whole round exists to end, and the Trade
   Finder ends up with nothing defensive to show. The floor and the cycle
   now match the shape the data ships. This runs the REAL engine over ten
   offseasons and counts what is left. */
const BUNDLE_DIR = path.join(ROOT, 'dist', '.foroster');
let engine = null;
try {
  fs.mkdirSync(BUNDLE_DIR, { recursive: true });
  const entry = path.join(BUNDLE_DIR, 'entry.mjs');
  let importPath = '../../src/lib/frontOffice.ts';
  /* The control bundles a DEGRADED copy of the engine: the skill filter put
     back to the pre 416 shape, which swept defenders into the skill average
     while team.defense counted them again. src/ is never touched; the copy
     lives in dist/. It refuses to run if the current filter is not there. */
  if (CONTROL === 'unitdefence' || CONTROL === 'offencecycle' || CONTROL === 'meandefence' || CONTROL === 'shortseason') {
    const enginePath = path.join(ROOT, 'src', 'lib', 'frontOffice.ts');
    /* normalise the line endings before matching. The swaps below are
       written with plain newlines, and this repo's working tree carries CRLF
       after any checkout or rebase, so a control that matched on Monday
       refused to run on Tuesday for a reason that had nothing to do with the
       code it guards. */
    const engineSrc = normaliseEol(fs.readFileSync(enginePath, 'utf8'));
    const swaps = CONTROL === 'shortseason'
      ? [
        /* the pre 419 shape of the bug: the crossover stops after the seven
           division round robin weeks, so every club lands on 13 games. The
           engine's own guard is neutered too, so this proves SECTION 11
           catches it rather than the throw doing all the work. */
        ['for (let r = 0; r < CROSSOVER_GAMES; r += 1) {', 'for (let r = 0; r < 7; r += 1) {'],
        ['  const short = [...played.entries()].filter(([, n]) => n !== GAMES_PER_CLUB);',
         '  const short = [];'],
        ['if (short.length || weeks.length !== REGULAR_WEEKS) {', 'if (short.length) {'],
      ]
      : CONTROL === 'meandefence'
      ? [[
        /* the exploit this round shipped and the review caught: an unweighted
           mean over however many defenders survive, so cutting a below
           average one raises it */
        'const filled = best.reduce((s, v) => s + v, 0);',
        'const filled = best.reduce((s, v) => s + v, 0); if (best.length) return filled / best.length;',
      ]]
      : CONTROL === 'unitdefence'
      ? [[
        /* the pre 418 engine: strength read a stored team number and the
           men on the roster were worth nothing at all */
        'defenceRating(team) * 0.28',
        'team.defense * 0.28',
      ]]
      : [
        /* the pre 416 replenishment, restored exactly: no defensive
           guarantee, an offence-only cycle, and a floor of nine */
        [
          "for (const d of ['DL', 'LB', 'DB'] as GmPlayer['pos'][]) {\n      while (t.players.filter(p => p.pos === d).length < 2) addDepth(d);\n    }\n",
          '',
        ],
        [
          "const CYCLE: GmPlayer['pos'][] = ['WR', 'RB', 'DB', 'TE', 'LB', 'WR', 'DL', 'OL'];",
          "const CYCLE: GmPlayer['pos'][] = ['WR', 'RB', 'TE', 'WR', 'OL'];",
        ],
        ['while (t.players.length < 15) addDepth', 'while (t.players.length < 9) addDepth'],
      ];
    for (const [now] of swaps) {
      if (!engineSrc.includes(now)) {
        throw new Error(`control ${CONTROL}: ${JSON.stringify(now.slice(0, 60))} is not in frontOffice.ts, so it would change nothing`);
      }
    }
    const patched = path.join(BUNDLE_DIR, 'frontOfficeOld.ts');
    /* the copy sits outside src, so its own relative siblings have to be
       repointed at the real directory or esbuild cannot find them */
    const libDir = path.join(ROOT, 'src', 'lib').split('\\').join('/');
    let rewritten = engineSrc;
    for (const [now, was] of swaps) rewritten = rewritten.split(now).join(was);
    rewritten = rewritten.replace(/from '\.\/([A-Za-z0-9_-]+)'/g, `from '${libDir}/$1'`);
    fs.writeFileSync(patched, rewritten);
    importPath = './frontOfficeOld.ts';
    console.log(CONTROL === 'shortseason'
      ? '   control shortseason: the crossover cut to seven weeks and the engine guard neutered, so every club lands on 13 games'
      : CONTROL === 'meandefence'
      ? '   control meandefence: defenceRating put back to a plain mean, the shape that paid you for cutting your worst man'
      : CONTROL === 'unitdefence'
      ? '   control unitdefence: the pre 418 engine put back, strength reads the stored team number again'
      : '   control offencecycle: the pre 416 replenishment put back, offence only cycle and a floor of nine');
  }
  fs.writeFileSync(entry, `export * from '${importPath}';\n`);
  const out = path.join(BUNDLE_DIR, 'engine.mjs');
  /* the alias is spelled out rather than left to tsconfig, so a copy of the
     engine bundled from outside src still resolves its own imports */
  execSync(`"${path.join(ROOT, 'node_modules', '.bin', 'esbuild')}" "${entry}" --bundle --format=esm --platform=node --alias:@="${path.join(ROOT, 'src')}" --outfile="${out}" --log-level=error`);
  engine = await import(pathToFileURL(out).href);
} catch (e) {
  ok(9, 'the engine can be bundled and run', false, `esbuild or import failed: ${String(e).slice(0, 140)}`);
}
if (engine) {
  let seed = 20260902;
  const rng = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const league = engine.initLeague();
  const defOf = lg => Object.values(lg.teams).map(t => t.players.filter(p => DEFENSIVE.has(p.pos)).length);
  const before = defOf(league);
  ok(9, 'a fresh league starts with a defence on every team',
    before.every(n => n >= 6), `smallest defence is ${Math.min(...before)}`);
  /* churn it hard: release the whole defence on every team, then run the
     offseasons that are supposed to rebuild it */
  for (const t of Object.values(league.teams)) {
    for (const p of t.players.filter(p => DEFENSIVE.has(p.pos))) {
      engine.releasePlayer(t, league.freeAgents, p.id);
    }
  }
  const stripped = defOf(league);
  ok(9, 'the fixture really did strip the defence', Math.max(...stripped) === 0,
    `after releasing every defender the largest defence is ${Math.max(...stripped)}`);
  /* The rebuild still RUNS under the control; what changes is the engine it
     runs in, which is the pre 416 one bundled from a patched copy. Skipping
     the step would only have proved that doing nothing does nothing. */
  for (let i = 0; i < 10; i += 1) engine.replenishRosters(league, rng);
  const rounds = 10;
  const after = defOf(league);
  ok(9, 'the offseason puts a defence back on every team',
    after.every(n => n >= 6), `smallest defence after ${rounds} offseasons is ${Math.min(...after)}`);
  const sizes = Object.values(league.teams).map(t => t.players.length);
  ok(9, 'and the roster is not left short', Math.min(...sizes) >= 15,
    `smallest roster is ${Math.min(...sizes)}`);
  const positions = new Set(Object.values(league.teams).flatMap(t => t.players.map(p => p.pos)));
  ok(9, 'every position group is still represented after the churn',
    [...DEFENSIVE].every(g => positions.has(g)),
    `groups present: ${[...positions].sort().join(', ')}`);

  /* ---- 10. THE DEFENCE IS THE DEFENDERS (Round 418) ------------------- */
  /* Round 416 asserted the opposite here on purpose: that a defender must
     NOT move team strength, because for one round he was not supposed to.
     That check existed so this round would have to announce itself rather
     than drift, and it did its job: the moment defenceRating landed, the
     old assertion went red and had to be replaced deliberately. This is the
     replacement, and it is the whole point of part two. */
  const fresh = engine.initLeague();
  const one = Object.values(fresh.teams)[0];
  ok(10, 'the fixture team actually has defenders to remove',
    one.players.some(p => DEFENSIVE.has(p.pos)),
    'no defenders on the team, so nothing below proved anything');
  const withDef = engine.teamStrength(one);
  const strippedTeam = { ...one, players: one.players.filter(p => !DEFENSIVE.has(p.pos)) };
  /* direction, not merely change: "it moved" would pass if it moved the
     wrong way, which is exactly the exploit this section now guards */
  ok(10, 'losing every defender makes the team weaker', withDef > engine.teamStrength(strippedTeam) + 1e-9,
    `strength is ${withDef.toFixed(3)} with the defenders and ${engine.teamStrength(strippedTeam).toFixed(3)} without them`);

  /* and it moves it in the right DIRECTION and by a real amount: swapping a
     club's worst defender for a much better one has to raise the number */
  const worst = [...one.players.filter(p => DEFENSIVE.has(p.pos))].sort((a, b) => a.ovr - b.ovr)[0];
  const upgraded = {
    ...one,
    players: one.players.map(p => (p.id === worst.id ? { ...p, ovr: Math.min(99, worst.ovr + 20) } : p)),
  };
  ok(10, 'a better defender makes the team stronger',
    engine.teamStrength(upgraded) > withDef,
    `upgrading ${worst.name} from ${worst.ovr} moves strength ${withDef.toFixed(3)} to ${engine.teamStrength(upgraded).toFixed(3)}`);

  /* LOSING A MAN CANNOT MAKE YOU BETTER. This is the check that was missing,
     and its absence cost the round a live exploit: defenceRating was a MEAN,
     so releasing a below average defender raised it. Measured before the fix,
     cutting the worst defender made all 32 clubs stronger and cutting all six
     made 11 of them stronger, worth up to +5.37 and 2.7 extra wins a season,
     with the board showing the number climbing and the Cut buttons a dozen
     lines underneath.
     The property is stated the general way on purpose. It is not "cutting all
     six must not help" and not "cutting the worst must not help", because a
     rule shaped around the two moves somebody already found is a rule that
     misses the third. It is: REMOVING ANY DEFENDER, ANY NUMBER OF THEM, IN
     ANY ORDER, MUST NEVER RAISE TEAM STRENGTH. Every club, every defender,
     every prefix of the worst first and the best first orders. */
  const league32 = Object.values(fresh.teams);
  const cloneTeam = t => ({ ...t, players: t.players.map(x => ({ ...x })) });
  let rises = [];
  for (const t of league32) {
    const base = engine.teamStrength(t);
    const defs = t.players.filter(p => DEFENSIVE.has(p.pos));
    /* every single removal */
    for (const d of defs) {
      const c = cloneTeam(t);
      c.players = c.players.filter(p => p.id !== d.id);
      const after = engine.teamStrength(c);
      if (after > base + 1e-9) rises.push(`${t.abbr} cutting ${d.pos} ${d.ovr}: ${base.toFixed(3)} -> ${after.toFixed(3)}`);
    }
    /* and every prefix of both orders, which is how a player actually plays it */
    for (const order of [[...defs].sort((a, b) => a.ovr - b.ovr), [...defs].sort((a, b) => b.ovr - a.ovr)]) {
      const c = cloneTeam(t);
      for (const d of order) {
        c.players = c.players.filter(p => p.id !== d.id);
        const after = engine.teamStrength(c);
        if (after > base + 1e-9) rises.push(`${t.abbr} cutting down to ${c.players.filter(p => DEFENSIVE.has(p.pos)).length} defenders: ${base.toFixed(3)} -> ${after.toFixed(3)}`);
      }
    }
  }
  ok(10, 'the fixture league has defenders to remove',
    league32.every(t => t.players.some(p => DEFENSIVE.has(p.pos))),
    'some club has no defenders, so the monotonicity sweep proved nothing there');
  ok(10, 'releasing a defender never raises team strength', rises.length === 0,
    `${rises.length} removals made a club STRONGER, e.g. ${rises.slice(0, 3).join(' | ')}`);

  /* and the number the board puts on screen has to fall with it, because that
     is what invited the click in the first place */
  let uiRises = 0;
  for (const t of league32) {
    const c = cloneTeam(t);
    c.players = c.players.filter(p => !DEFENSIVE.has(p.pos));
    if (engine.defenceRating(c) > engine.defenceRating(t) + 1e-9) uiRises += 1;
  }
  ok(10, 'and the defence number the board shows falls with them', uiRises === 0,
    `${uiRises} clubs show a HIGHER defence rating after losing every defender`);

  /* a club that fields its full complement is scored exactly as the plain
     mean of its defenders, so the fixed denominator changed no real roster */
  const sameAsMean = league32.every(t => {
    const d = t.players.filter(p => DEFENSIVE.has(p.pos) && p.out === 0);
    if (d.length !== 6) return true;
    return Math.abs(engine.defenceRating(t) - d.reduce((s, p) => s + p.ovr, 0) / d.length) < 1e-9;
  });
  ok(10, 'a full defensive complement is scored as its own mean', sameAsMean,
    'the fixed denominator moved a club that had nothing missing');

  /* A DEFENSIVE PICK IS A PERSON. It used to be a 'DEF' prospect that added
     a point or two to a unit number and was thrown away by prospectToPlayer,
     so the board named a man you could never look at again. */
  let dseed = 424242;
  const drng = () => { dseed = (dseed * 1664525 + 1013904223) >>> 0; return dseed / 4294967296; };
  const klass = engine.generateDraftClass(drng, 60, new Set());
  const defProspects = klass.filter(pr => DEFENSIVE.has(pr.pos));
  ok(10, 'a draft class contains defensive prospects at real positions',
    defProspects.length > 0, `${defProspects.length} of ${klass.length} prospects are DL, LB or DB`);
  ok(10, 'no prospect is still filed under the old DEF placeholder',
    klass.every(pr => pr.pos !== 'DEF'), `${klass.filter(pr => pr.pos === 'DEF').length} still say DEF`);
  const converted = klass.map(pr => engine.prospectToPlayer(pr, drng));
  ok(10, 'every prospect becomes a real player', converted.every(Boolean),
    `${converted.filter(x => !x).length} of ${klass.length} were thrown away`);
  /* and the conversion has to spread across the real defensive positions,
     not funnel every defender into one of them */
  const convDef = new Set(converted.filter(Boolean).map(p => p.pos).filter(x => DEFENSIVE.has(x)));
  ok(10, 'drafted defenders land at all three defensive positions',
    [...DEFENSIVE].every(g => convDef.has(g)),
    `a 60 man class produced only ${[...convDef].sort().join(', ') || 'none'}`);
  /* a pre 418 save can still hold a stored DEF prospect: it must convert too */
  const legacyPick = engine.prospectToPlayer({ id: 'x', name: 'Old Pick', pos: 'DEF', age: 22, grade: 80, trueOvr: 80 }, drng);
  ok(10, 'a DEF prospect stored by an older save still becomes a defender',
    !!legacyPick && DEFENSIVE.has(legacyPick.pos),
    legacyPick ? `converted to ${legacyPick.pos}` : 'it was thrown away, which is what the round set out to stop');

  /* AND YOU CAN ACTUALLY SIGN ONE. The opening market was offence only, so
     the two groups Round 416 added were unobtainable except by trade. */
  const faPos = new Set(fresh.freeAgents.map(p => p.pos));
  ok(10, 'the opening free agent market carries defenders',
    [...DEFENSIVE].every(g => faPos.has(g)),
    `market holds ${[...faPos].sort().join(', ')}`);
}

/* ---- 11. EVERY CLUB PLAYS SEVENTEEN GAMES (Round 419) ------------------ */
/* buildSchedule promised six divisional games home and away plus eleven
   crossover, seventeen for all thirty two clubs, and did not deliver it.
   Measured over 200 built schedules before the fix: 173 of them left one club
   short, as low as NINE games, and a club in the same week twice about 38
   times a season. Standings sort on wins, so a club with eight fewer chances
   to win cannot reach the playoffs and is graded by ownership against a
   mandate that assumes it can. Nothing in the suite asked.
   The checks below are the promise itself, not the shape of the old bug: the
   counts, the opponents, the weeks and the variety, over several seasons
   because one schedule proving out says nothing about the next. */
if (engine) {
  /* TWO HUNDRED, AND THE NUMBER IS MEASURED RATHER THAN PICKED. It was 12,
     which is enough for a fault that appears in every schedule and useless
     for one that appears in some. A reviewer built exactly that: a mutant
     collapsing the crossover matching offset on 5 percent of seasons, which
     leaves 17 games in 17 weeks with no double bookings, so the builder's own
     guard passes and only the OPPONENT checks below can see it. At 12 seasons
     this section caught it in 178 of 300 fence runs, a coin toss dressed as a
     check. At 200 it caught it in 60 of 60. The whole fence runs in about
     420ms and this costs roughly 130ms more, so the small number was buying
     nothing. */
  const SEASONS = 200;
  const divOfTeam = new Map(teams.map(t => [t.abbr, t.division]));
  let shortClubs = 0, twiceInAWeek = 0, wrongWeeks = 0;
  let badDivisional = 0, badCrossover = 0, badMeetings = 0, lopsided = 0;
  const fixtureLists = new Set();
  let threw = null;
  for (let n = 0; n < SEASONS; n += 1) {
    let sd = 4242 + n * 7919;
    const rng = () => { sd = (sd * 1664525 + 1013904223) >>> 0; return sd / 4294967296; };
    let weeks;
    try { weeks = engine.buildSchedule(rng); } catch (e) { threw = String(e.message || e); break; }
    if (weeks.length !== 17) wrongWeeks += 1;
    const games = weeks.flat();
    const played = new Map(), homes = new Map(), meetings = new Map();
    const divSeen = new Map(), crossSeen = new Map();
    for (const w of weeks) {
      const here = new Set();
      for (const g of w) {
        if (here.has(g.home) || here.has(g.away)) twiceInAWeek += 1;
        here.add(g.home); here.add(g.away);
        played.set(g.home, (played.get(g.home) || 0) + 1);
        played.set(g.away, (played.get(g.away) || 0) + 1);
        homes.set(g.home, (homes.get(g.home) || 0) + 1);
        const k = [g.home, g.away].sort().join('|');
        meetings.set(k, (meetings.get(k) || 0) + 1);
        const same = divOfTeam.get(g.home) === divOfTeam.get(g.away);
        for (const [a, b] of [[g.home, g.away], [g.away, g.home]]) {
          const m = same ? divSeen : crossSeen;
          if (!m.has(a)) m.set(a, new Set());
          m.get(a).add(b);
        }
      }
    }
    for (const t of teams) {
      if (played.get(t.abbr) !== 17) shortClubs += 1;
      if ((divSeen.get(t.abbr) || new Set()).size !== 3) badDivisional += 1;
      if ((crossSeen.get(t.abbr) || new Set()).size !== 11) badCrossover += 1;
      const h = homes.get(t.abbr) || 0;
      if (h < 6 || h > 11) lopsided += 1;
    }
    for (const [k, count] of meetings) {
      const [a, b] = k.split('|');
      if (count !== (divOfTeam.get(a) === divOfTeam.get(b) ? 2 : 1)) badMeetings += 1;
    }
    fixtureLists.add([...meetings.keys()].sort().join(','));
  }
  ok(11, 'the schedule builds at all', threw === null, threw ? threw.slice(0, 120) : '');
  if (threw === null) {
    ok(11, 'every club plays exactly seventeen games', shortClubs === 0,
      `${shortClubs} club seasons off 17 across ${SEASONS} schedules`);
    ok(11, 'no club is scheduled twice in one week', twiceInAWeek === 0,
      `${twiceInAWeek} double bookings`);
    ok(11, 'a season is seventeen weeks', wrongWeeks === 0, `${wrongWeeks} schedules with the wrong week count`);
    ok(11, 'every club meets its three divisional rivals', badDivisional === 0,
      `${badDivisional} club seasons with the wrong number of rivals`);
    ok(11, 'every club takes eleven crossover opponents', badCrossover === 0,
      `${badCrossover} club seasons off 11`);
    ok(11, 'rivals meet twice and everybody else once', badMeetings === 0,
      `${badMeetings} pairings met the wrong number of times`);
    ok(11, 'nobody plays a lopsided share at home', lopsided === 0,
      `${lopsided} club seasons outside 6 to 11 home games`);
    /* and it must not be the same season every year */
    ok(11, 'two seasons are not the same fixture list', fixtureLists.size === SEASONS,
      `${fixtureLists.size} distinct fixture lists from ${SEASONS} schedules`);
  }
}

/* ---- report ------------------------------------------------------------- */
if (checks === 0) {
  console.error('FAIL: NOTHING WAS CHECKED');
  process.exit(1);
}
for (const [n, s] of [...bySection.entries()].sort((a, b) => a[0] - b[0])) {
  const name = SECTION_NAMES[n] ?? 'unnamed section';
  console.log(`   ${n}. ${name}: ${s.n} check${s.n === 1 ? '' : 's'}${s.bad ? `, ${s.bad} FAILED` : ''}`);
}
if (fails.length) {
  console.error(`simFrontOfficeRoster: ${fails.length} of ${checks} checks FAILED`);
  for (const f of fails.slice(0, 20)) console.error('  ' + f);
  process.exit(1);
}
console.log(`simFrontOfficeRoster: ${checks} checks passed over ${teams.length} teams and ${all.length} players`);
