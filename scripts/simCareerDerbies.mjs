/* Round 1012 harness: Soccer Career club rivalries and derby days.

   A player asked for team rivalries. This round plays real derbies inside a
   Soccer Career season, read from one sourced table that Club Manager also
   reads (src/data/clubRivalries.ts), at each league's verified meetings per
   season (src/lib/soccerCareerDerby.ts). This harness measures:

   1. data integrity (exact): every pair has two sources from two publishers on
      two hosts, none a wiki; names resolve to a real club in one of the two
      games; the alias map points from a Soccer Career name to a Club Manager
      name; no dashes; the unsourced ratchet only shrinks.
   2. Club Manager unchanged (exact): the lifted table hashes to the copy
      recorded before the lift, and every REAL_LEAGUES club's board rival is
      the one it was.
   3. cadence and detection (exact): every season at a club with a same league
      rival in a verified league and year carries exactly that many meetings
      per rival, every other season has no derbies key, forced cases (aliases,
      the 2003 Brasileirao boundary, both ends of the Ligue 1 and Liga MX holds,
      the 1996 start of Liga MX, a dormant pair) say what they should, no
      meeting names a club outside the league or not founded yet, and every
      pair's 2020 status (active or dormant) is pinned by name.
   4. record consistency (exact): derby goals are a subset of the season's,
      played meetings fit in the league apps, a keeper never scores one, the
      winner flag only on a won meeting he scored in, Derby Hero is derived and
      never stored, the resolution is deterministic, each rival is met once at
      home and once away, and every stored season replays exactly from its own
      inputs with the engine's elite list.
   5. stream neutrality (exact): bundle A (no derbies at all) and bundle B
      (derbies resolved, swing off) run the same 16 digest careers; with the
      derbies and story keys out the digests are equal, and B really played
      derby seasons.
   6. effect bands (measured): the per season swing equals its clamp exactly;
      the win share climbs at every rung of the strength ladder; the draw share
      sits near the model's; Derby Hero rate is ordered by position group with
      keepers at zero and calibrated to the winning goal rule; and the swing on
      versus off moves popularity (over every season and at the end),
      sponsorship, money and the morale gated life events by a bounded amount.
   7. old saves and UI (exact): a save without derbies loads and plays on; the
      reader returns nothing for garbage; the components render nothing for an
      old season and the W-D-L for a derby season; no button in the derby UI.
   8. copy (exact): the three reworded texts no longer claim a derby; no dash
      in a derby log or fan line; fan lines pass simCareerParity's rule.

   Round 1037 (who was in each league, season by season): before 2026-27 a
   derby needs both clubs in the same league that season by the league
   ledgers, so section 3 counts meetings and checks rivals by the season's
   real league; the forced cases outside the six ledger leagues (Brasileirao,
   Liga MX) read none before 2026-27 and are checked from 2026-27 on, where
   nothing moved; Newcastle 2020, Celta Vigo 2020 and Brighton 1990 read none
   because Sunderland, Deportivo and Brighton were a division down that
   season; the drift fence reads 2026-27, the list's own season, and moved
   from 51 to 48 pairs only through the three labels the round released
   (proven with the labels put back: 51 and the old 13).

   Round 1100 (the career club pool grew from 241 to 460 clubs): the drift
   fence reads 56 active pairs and 8 dormant, six woken by the pool and two
   by the Championship's cadence row; the reasons sit beside the pin.

   BANDS: see the BANDS block below, measured over seed offsets 0 to 3.

   Negative controls (SIM_DERBY_CONTROL; each asserts its anchor appears exactly
   once first and exits 2 if not, exits 1 when its sections went red, 2 when
   they did not):
   nodetect  seasonDerbies returns nothing. Sections 3 and 6 go red.
   cadence1  derbyMeetings returns 1. Section 3 goes red.
   noalias   the alias map is ignored. Section 3 goes red (Man City, Sao Paulo).
   stream    resolveSeasonDerbies makes one Math.random call. Section 5 red.
   uncapped  the popularity clamp is gone and a win is worth 10. Section 6 red.
   Added after the review (each one a hole a mutation walked through green):
   homealt   both meetings at the same ground. Section 4 red.
   cadhold   the Ligue 1 2019/20 hold is dropped (Round 1037; it was Liga MX's,
             which no past derby reaches now). Section 3 red (PSG 2019).
   aliasdrop one alias entry (Athletic Bilbao) is deleted. Sections 1 and 3
             red: the alias map no longer covers a respelled pair club, and
             the Basque derby goes dormant against the pinned 2020 status.
   winner    the winning goal rule counts any goal up to the decider. Section
             6 red (the hero calibration).
   eliteoff  the engine passes an empty elite list. Section 4 red (the replay).

   Record mode: node scripts/simCareerDerbies.mjs --record prints the Club
   Manager rivals hash and board snapshot hash of the current tree.

   Run: node scripts/simCareerDerbies.mjs [seedOffset]
   Exit 0 green, 1 red (or a control that did its job), 2 a dead control. */
import crypto from 'node:crypto';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const CONTROL = process.env.SIM_DERBY_CONTROL || '';
const CONTROLS = { nodetect: [3, 6], cadence1: [3], noalias: [3], stream: [5], uncapped: [6], homealt: [4], cadhold: [3], aliasdrop: [1, 3], winner: [6], eliteoff: [4] };
if (CONTROL && !CONTROLS[CONTROL]) { console.error('unknown control ' + CONTROL + ' (known: ' + Object.keys(CONTROLS).join(', ') + ')'); process.exit(2); }
const RECORD = process.argv.includes('--record');
const OFFSET = Number(process.argv.find((a, i) => i > 1 && /^\d+$/.test(a)) || 0);
const TMP = process.env.TEMP || process.env.TMP || os.tmpdir();
const WORK = path.join(TMP, `sc-derbies-${process.pid}`);
fs.mkdirSync(WORK, { recursive: true });

function modulesDir() {
  let d = ROOT;
  for (;;) {
    const nm = path.join(d, 'node_modules');
    if (fs.existsSync(path.join(nm, 'react', 'package.json')) && fs.existsSync(path.join(nm, 'esbuild', 'package.json'))) return nm.replaceAll('\\', '/');
    const up = path.dirname(d);
    if (up === d) { console.error(`no node_modules with react and esbuild above ${ROOT}`); process.exit(2); }
    d = up;
  }
}
const NM = modulesDir();
const esbuild = createRequire(`${NM}/`)('esbuild');

const DERBY_FILE = path.join(ROOT, 'src/lib/soccerCareerDerby.ts');
const DERBY_SRC = fs.readFileSync(DERBY_FILE, 'utf8').replace(/\r\n/g, '\n');
/* An edit to a copy of the derby module, refusing to run when the anchor is
   not there exactly once: a control that changes nothing proves nothing. */
function edit(src, anchor, replacement, why, file = 'soccerCareerDerby.ts') {
  const n = src.split(anchor).length - 1;
  if (n !== 1) { console.error(`${why}: the anchor appears ${n} times in ${file}, refusing to run a dead edit`); process.exit(2); }
  return src.replace(anchor, replacement);
}
/* The engine and the rivalry table can be edited for a control too, served
   to the MAIN bundle only in place of the file, the same way. */
const ENGINE_FILE = path.join(ROOT, 'src/lib/soccerCareerEngine.ts');
const DATA_FILE = path.join(ROOT, 'src/data/clubRivalries.ts');
const mainOverrides = {};
const overrideFile = (file, anchor, replacement) => {
  const src = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  mainOverrides[path.resolve(file).toLowerCase()] = edit(src, anchor, replacement, CONTROL, path.basename(file));
};
const APPLY_HEAD = 'export function applySeasonDerbies(s: CareerState, season: SeasonRecord): void {';
const NO_SWING = src => edit(src, APPLY_HEAD, APPLY_HEAD + ' return;', 'swing off');
const NO_DETECT = src => edit(src, 'return detected;', 'return detected.slice(0, 0);', 'detection off');
let mainDerby = DERBY_SRC;
if (CONTROL === 'nodetect') mainDerby = NO_DETECT(mainDerby);
if (CONTROL === 'cadence1') mainDerby = edit(mainDerby, 'return w.meetings;', 'return 1;', CONTROL);
if (CONTROL === 'noalias') mainDerby = edit(mainDerby, 'return SC_CLUB_CANON[scName] ?? scName;', 'return scName;', CONTROL);
if (CONTROL === 'uncapped') {
  mainDerby = edit(mainDerby, 'pop = clampN(pop, DERBY_POP_MIN, DERBY_POP_MAX);', 'pop = clampN(pop, DERBY_POP_MIN, 1000);', CONTROL);
  mainDerby = edit(mainDerby, 'export const DERBY_WIN_POP = 2;', 'export const DERBY_WIN_POP = 10;', CONTROL);
}
if (CONTROL === 'homealt') mainDerby = edit(mainDerby, 'const home = (i % 2 === 0) === homeFirst;', 'const home = homeFirst;', CONTROL);
/* Round 1037: a past Liga MX season has no derby at all now (the league
   ledgers do not hold it), so the hold this control drops is Ligue 1's 2019-20 */
if (CONTROL === 'cadhold') mainDerby = edit(mainDerby, '"Ligue 1": [{ from: 1990, to: 2018, meetings: 2 }, { from: 2020, meetings: 2 }],', '"Ligue 1": [{ from: 1990, meetings: 2 }],', CONTROL);
if (CONTROL === 'winner') mainDerby = edit(mainDerby, 'if (gf > ga && k === ga + 1) won = true;', 'if (gf > ga && k <= ga + 1) won = true;', CONTROL);
if (CONTROL === 'aliasdrop') overrideFile(DATA_FILE, "  'Athletic Bilbao': 'Athletic Club',\n", '');
if (CONTROL === 'eliteoff') overrideFile(ENGINE_FILE, 'elite: ELITE_CLUBS,', 'elite: [],');
let bDerby = NO_SWING(DERBY_SRC);
if (CONTROL === 'stream') bDerby = edit(bDerby, 'const world = adjustClubsForYear(input.clubs, input.year);', 'Math.random(); const world = adjustClubsForYear(input.clubs, input.year);', CONTROL);
const aDerby = NO_DETECT(NO_SWING(DERBY_SRC));
if (CONTROL) console.log(`NEGATIVE CONTROL ON: ${CONTROL}, sections ${CONTROLS[CONTROL].join(' and ')} must go red`);

/* Three bundles. MAIN is the round as it ships (or with the control's edit);
   B resolves derbies with the swing off; A has no derbies at all. The edit is
   served to esbuild in place of the file, so nothing on disk changes. */
async function bundle(name, derbySrc, withUi, overrides = {}) {
  const ENTRY = path.join(WORK, `${name}.entry.mjs`);
  const OUT = path.join(WORK, `${name}.bundle.mjs`);
  fs.writeFileSync(ENTRY, `
export * as engine from '${ROOT_URL}/src/lib/soccerCareerEngine.ts';
export * as derby from '${ROOT_URL}/src/lib/soccerCareerDerby.ts';
export * as eras from '${ROOT_URL}/src/lib/careerEras.ts';
${withUi ? `
export * as data from '${ROOT_URL}/src/data/clubRivalries.ts';
export * as league from '${ROOT_URL}/src/lib/soccerCareerLeague.ts';
export * as world from '${ROOT_URL}/src/lib/soccerCareerLeagueWorld.ts';
export * as save from '${ROOT_URL}/src/lib/soccerCareerSave.ts';
export * as social from '${ROOT_URL}/src/lib/careerSocial.ts';
export * as cm from '${ROOT_URL}/src/lib/clubManager.ts';
export * as ui from '${ROOT_URL}/src/components/soccer-career/DerbyLines.tsx';
import React from '${NM}/react/index.js';
import { renderToStaticMarkup } from '${NM}/react-dom/server.node.js';
import { MemoryRouter } from 'react-router-dom';
export const render = (Component, props) => renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(Component, props)));
` : ''}`);
  const key = path.resolve(DERBY_FILE).toLowerCase();
  await esbuild.build({
    entryPoints: [ENTRY], bundle: true, format: 'esm', platform: 'node', jsx: 'automatic',
    alias: { '@': `${ROOT_URL}/src` }, nodePaths: [NM], outfile: OUT, logLevel: 'error',
    /* react-dom/server requires node builtins, which an esm bundle can only do through a real require */
    define: { 'process.env.NODE_ENV': '"production"' },
    banner: { js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);" },
    plugins: [{ name: 'derby-variant', setup(b) {
      b.onLoad({ filter: /(soccerCareerDerby|soccerCareerEngine|clubRivalries)\.ts$/ }, args => {
        const k = path.resolve(args.path).toLowerCase();
        if (k === key) return { contents: derbySrc, loader: 'ts' };
        return overrides[k] !== undefined ? { contents: overrides[k], loader: 'ts' } : undefined;
      });
    } }],
  });
  return import(pathToFileURL(OUT).href);
}
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const MAIN = await bundle('main', mainDerby, true, mainOverrides);
const A = await bundle('a', aDerby, false);
const B = await bundle('b', bDerby, false);
try { fs.rmSync(WORK, { recursive: true, force: true }); } catch { /* temp only */ }
const { engine, derby, data, league, world, save, social, cm, ui, render } = MAIN;
const clubs = engine.FALLBACK_CLUBS;
for (const [k, v] of Object.entries({ seasonDerbies: derby.seasonDerbies, resolveSeasonDerbies: derby.resolveSeasonDerbies, applySeasonDerbies: derby.applySeasonDerbies, CLUB_RIVALRIES: data.CLUB_RIVALRIES, REAL_LEAGUES: cm.REAL_LEAGUES, buildBoardObjectives: cm.buildBoardObjectives, isSoccerCareerSave: save.isSoccerCareerSave, DerbyChip: ui.DerbyChip, clubs })) {
  if (!v) { console.error(`missing export ${k}, so nothing below measures anything`); process.exit(2); }
}

const sortedJson = o => JSON.stringify(Object.fromEntries(Object.keys(o).sort().map(k => [k, o[k]])));
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const boardSnapshot = () => {
  const snap = {};
  for (const lg of cm.REAL_LEAGUES) for (const c of lg.clubs) {
    const o = cm.buildBoardObjectives(c, false, lg.clubs.length).find(x => x.id === 'rival');
    snap[c] = o ? o.rivalName : null;
  }
  return snap;
};
if (RECORD) {
  console.log('PRIMARY_RIVAL', Object.keys(data.PRIMARY_RIVAL).length, sha(sortedJson(data.PRIMARY_RIVAL)));
  const snap = boardSnapshot();
  console.log('board rivals', Object.keys(snap).length, sha(sortedJson(snap)));
  process.exit(0);
}

/* The career walk, simCareerLeagueFinish's recipe: a seeded generator stands
   in for Math.random for the length of each career, and every pause the
   engine can raise between seasons is answered. */
function seeded(seed) { let x = (seed * 2654435761) >>> 0 || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }
const stats = v => ({ pace: v, shooting: v, passing: v, dribbling: v, defending: v, physical: v, reflexes: v });
const POSITIONS = ['ST', 'CM', 'CB', 'GK', 'LW', 'CAM', 'RB', 'CDM'];
function step(e, s) {
  switch (s.phase) {
    case 'youth': return e.advanceYouthYear(s, clubs);
    case 'contract_offer': { const offers = s.pendingOffers || []; return offers.length ? e.acceptOffer(s, offers[0]) : { ...s, phase: 'playing' }; }
    case 'playing': return e.advanceProSeason(s, clubs);
    case 'newspaper': return e.dismissNewspaper(s);
    case 'season_summary': return e.dismissSummary(s, clubs);
    case 'international_debut': return e.dismissDebut(s, clubs);
    case 'world_cup': return e.dismissWorldCup(s, clubs);
    case 'rehab_choice': return e.applyRehabChoice(s, 1);
    case 'rivalry_event': return e.dismissRivalryEvent(s, clubs);
    case 'ballon_dor': return e.dismissBallonDor(s, clubs);
    case 'bdor_speech': return e.applyBdorSpeech(s, 0);
    case 'wc_speech': return e.applyWorldCupSpeech(s, 0);
    case 'moral_dilemma': return e.dismissMoralDilemma(s, clubs);
    case 'social_media_action': return e.dismissSocialMediaPhase(s, clubs);
    case 'red_card_appeal_result': return e.dismissAppealResult(s, clubs);
    case 'retirement_suggestion': return e.acceptRetirementSuggestion(s);
    case 'retirement_ceremony': case 'retired': return { ...s, retired: true };
    case 'random_events': {
      const ev = (s.pendingEvents || [])[0];
      if (!ev || !ev.choices || !ev.choices.length) return { ...s, phase: 'playing', pendingEvents: [] };
      return e.applyEventChoice(s, ev.choices.length - 1, clubs);
    }
    case 'contract_expiring': case 'transfer_window': return e.stayAtClub(s);
    default: { const n = e.advanceProSeason(s, clubs); return n.phase === s.phase ? { ...n, retired: true } : n; }
  }
}
/* trace, when given, collects the popularity at the end of every playing
   season's step, so 6e can read popularity mid career and not only at the
   end, where it sits near its ceiling. */
function runCareer(e, seed, { era = '2020-24', startYear = 2020, proSeasons = 10, ovr = 64, nation = 'England', until = null, trace = null } = {}) {
  const realRandom = Math.random;
  Math.random = seeded(seed * 7919 + 13);
  try {
    const position = POSITIONS[seed % POSITIONS.length];
    let s = e.initCareer(`Sim ${seed}`, nation, position, era, stats(ovr), ovr, startYear, clubs, null, 82);
    let guard = 0;
    const played = () => (s.seasons || []).filter(r => r.type === 'playing').length;
    let seen = played();
    while (!s.retired && guard++ < 500 && played() < proSeasons) {
      if (until && until(s)) return s;
      s = step(e, s);
      if (trace && played() > seen) { seen = played(); trace.push(s.popularity); }
    }
    return s;
  } finally {
    Math.random = realRandom;
  }
}
const leagueOf = name => (clubs.find(c => c.name === name) || {}).league || '';
/* Round 1037: before 2026-27 a derby is played in the league the club was
   really in that season (the league ledgers), from then on in its label */
const yearLeague = (name, year) => league.leagueKeyInYear({ name, league: leagueOf(name) }, year) ?? '';
/* Release AQ (Round 1175, the league world): from 2026-27 a season in one of
   the five two division models is played in the CAREER'S field, which the
   row saves (leagueWorld.members), and no longer in today's static league.
   A club that went down plays no top flight derby that year, and a club in
   the second division meets the rivals that are down there with it. The
   engine detects and resolves the derbies on that field, so the checks
   here have to as well: read against the static pool they called 148 right
   rival sets wrong, 13 right derbies keys undue, 41 right meetings outside
   the league and 89 right replays different, on a game that had none of it
   (the reviewer's probe: 0 derbies against a club outside his division in
   2272 derby seasons). The two divisions of a model are a closed set, so
   the other division that season is every club of the pair that is not in
   his, and the engine's own projection rebuilds the clubs from that. A row
   with no saved field is read as before. */
const worldKey = name => world.clubKeyOf(name);
const worldStart = world.leagueWorldForYear({ playerName: 'derby harness' }, clubs, 2026)?.leagues ?? {};
let worldSeasons = 0;
function seasonField(r) {
  const held = world.readLeagueWorldSeason(r);
  const pair = held ? world.PYRAMIDS.find(x => x.upper === held.league || x.lower === held.league) : null;
  if (!held || !pair) return { league: leagueOf(r.club), clubs, members: null, meetingsLeague: yearLeague(r.club, r.year) };
  const other = pair.upper === held.league ? pair.lower : pair.upper;
  const members = new Set(held.members.map(worldKey));
  const rest = [...worldStart[pair.upper], ...worldStart[pair.lower]].filter(n => !members.has(worldKey(n)));
  const career = { playerName: 'derby harness', currentClub: r.club, leagueWorld: { year: r.year, leagues: { ...worldStart, [held.league]: held.members, [other]: rest }, movements: [] } };
  return { league: held.league, clubs: world.projectLeagueWorldClubs(career, clubs, r.year), members, meetingsLeague: held.league };
}

let failures = 0;
const red = new Set();
let section = 0;
const fail = m => { failures += 1; red.add(section); console.error('  FAIL: ' + m); };
const DASH = /[\u2013\u2014]/;

/* BANDS, measured on 2026-10-05 over seed offsets 0, 1, 2 and 3 (200 pool
   careers, 1440 forced and 720 ladder seasons, 80 long careers each way):
   - 6b win share by strength gap +2, +1, 0, -1, -2: 0.569 to 0.591, 0.455 to
     0.472, 0.358 to 0.377, 0.266 to 0.277, 0.168 to 0.204, at least 880
     meetings a rung. Smallest step seen 0.066; required 0.03, about half.
   - 6c draw share 0.265 to 0.272 (the model's 0.27); band 0.24 to 0.30.
   - 6e swing on minus swing off, the largest seen: final popularity 0.90,
     final morale 3.55, sponsorship 0.076, net worth 1.95, Hall of Fame lines
     per career 0.037. Bands at about twice that. No sim career divorced in
     either run at any offset, so that count is printed and never asserted:
     a zero beside a zero would pass for the wrong reason.
   - 6d Derby Hero seasons per derby season, with 720 more forced seasons at
     clubs with two or three rivals: attackers 0.084 to 0.098, midfield 0.052
     to 0.067, defenders 0.020 to 0.034, keepers 0 of 435 to 535. Smallest
     gaps seen 0.021 (attack over midfield) and 0.030 (midfield over defence);
     required 0.01 and 0.013. Without the extra seasons the first gap was
     once 0.015, a coin toss, which is why they are there.
   Added after the review, measured 2026-10-05 over offsets 0 to 3:
   - 6d hero calibration, winners over the expected g / gf sum: 0.963, 1.005,
     1.024 and 1.079 over 450 to 496 won meetings he scored in (binomial
     noise about 0.04). Band 0.85 to 1.2, floor 300 meetings. The winner
     control (any goal up to the decider) reads 1.402 at offset 0.
   - 6e popularity at the end of every season, swing on minus off: 1.477,
     2.938, 0.290 and 0.956 over about 1300 seasons each way. Band 6, about
     twice the largest. The uncapped control reads 13.256 at offset 0.
   - section 4 replay: 2830 to 2870 seasons a run, 0 differ; home and away:
     about 5000 two meeting rivalries a run, 0 at one ground. Both exact.
   Re-measured 2026-10-06 over offsets 0 to 3 on the tree merged with Release
   AD, where Round 1013's clubs wake eleven pairs (51 active in 2020, not 40)
   and the pool plays 1610 to 1650 derby seasons in 2000, not 1510 to 1550:
   - 6b 0.560 to 0.588, 0.459 to 0.468, 0.359 to 0.383, 0.267 to 0.290,
     0.166 to 0.189, at least 940 meetings a rung, smallest step 0.074.
   - 6c 0.267 to 0.269. 6d attackers 0.083 to 0.102, midfield 0.047 to
     0.072, defenders 0.020 to 0.027, smallest gaps 0.020 and 0.022; hero
     calibration 0.995 to 1.060 over 484 to 577 meetings.
   - 6e popularity every season 0.507 to 2.256; final popularity -0.125 to
     0.688; net worth -1.194 to 1.921; Hall of Fame lines -0.025 to 0.013.
     Final morale 1.425 to 6.825 and sponsorship -0.018 to 0.150: with more
     derbies the swing is felt more, and both sat on their old bands (7 and
     0.15), a coin toss, so both were reset to about twice the largest seen,
     14 and 0.3. No control is caught by either limb alone.
   - section 5: the 16 digest careers play 160 derby seasons (was 140). */
const BANDS = {
  rungMin: 400, rungStep: 0.03, drawLo: 0.24, drawHi: 0.30,
  heroAttMid: 0.01, heroMidDef: 0.013,
  heroRatioLo: 0.85, heroRatioHi: 1.2, heroMinMeetings: 300, popSeasonDiff: 6,
  popDiff: 2, moraleDiff: 14, sponsorDiff: 0.3, worthDiff: 4, hofDiff: 0.08,
  digestDerbySeasons: 80, // 160 derby seasons over the 16 fixed digest careers on the merged tree (deterministic, offset free)
};

/* The ratchet's frozen size, set when the round landed: 57 Club Manager
   primary edges had no sourced pair. It may only go down. */
const UNSOURCED_BASELINE = 57;
section = 1;
console.log('1) every pair two sourced, off any wiki, between real clubs, and the ratchet only shrinks');
{
  const cmNames = new Set();
  for (const lg of cm.REAL_LEAGUES) for (const c of lg.clubs) cmNames.add(c);
  for (const k of Object.keys(cm.CM_ROSTERS || {})) cmNames.add(k);
  const scNames = new Set(clubs.map(c => c.name));
  if (cmNames.size < 300 || scNames.size < 150) fail(`only ${cmNames.size} Club Manager and ${scNames.size} Soccer Career clubs read, the name check would be hollow`);
  const known = n => cmNames.has(n) || scNames.has(n);
  const rows = data.CLUB_RIVALRIES;
  const seen = new Set();
  let bad = 0;
  for (const r of rows) {
    const id = `${r.a} and ${r.b}`;
    const err = m => { bad += 1; fail(`${id}: ${m}`); };
    if (r.a === r.b) err('a club cannot be its own rival');
    if (!known(r.a) || !known(r.b)) err('a name is not a club in either game');
    if (r.kind !== 'derby' && r.kind !== 'rivalry') err(`kind ${r.kind}`);
    if (!r.name || DASH.test(r.name) || DASH.test(r.a) || DASH.test(r.b)) err('empty name or a dash in a name');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.checked || '') || Number.isNaN(Date.parse(r.checked))) err(`checked ${r.checked}`);
    const key = [r.a, r.b].sort().join('|');
    if (seen.has(key)) err('duplicate pair'); else seen.add(key);
    const src = Array.isArray(r.sources) ? r.sources : [];
    if (src.length !== 2) { err(`${src.length} sources, exactly 2 required`); continue; }
    const hosts = [];
    for (const s of src) {
      if (!s || !s.publisher || !s.title || typeof s.url !== 'string') { err('a source without publisher, title or url'); continue; }
      let host = '';
      try { host = new URL(s.url).hostname.replace(/^www\./, ''); } catch { err(`unparseable url ${s.url}`); continue; }
      if (!s.url.startsWith('https://')) err(`not https: ${s.url}`);
      if (/wikipedia\.org|wikimedia\.org|fandom\.com|wikiwand\.com|wikimili\.com/i.test(host)) err(`a wiki source: ${host}`);
      hosts.push(host);
    }
    if (src[0].publisher === src[1].publisher) err('both sources from one publisher');
    if (hosts.length === 2 && hosts[0] === hosts[1]) err('both sources on one host');
  }
  for (const [k, v] of Object.entries(data.SC_CLUB_CANON)) {
    if (!scNames.has(k)) fail(`alias key ${k} is not a Soccer Career club`);
    if (!cmNames.has(v)) fail(`alias value ${v} is not a Club Manager club`);
  }
  /* Name drift, held from the other side. Round 1013 copies Club Manager's
     clubs into Soccer Career through its own alias map and an accent fold
     (scripts/lib/careerClubPool.mjs), so a club the shared table names can
     arrive under another spelling. Every pair club that reaches Soccer Career
     that way must be in SC_CLUB_CANON, or its derbies stay silently dormant. */
  const { NAME_ALIASES } = await import(pathToFileURL(path.join(ROOT, 'scripts/lib/careerClubPool.mjs')).href);
  const fold = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
  const pairClubs = new Set(rows.flatMap(r => [r.a, r.b]));
  let drift = 0, spelled = 0;
  for (const p of pairClubs) {
    for (const sc of new Set([NAME_ALIASES[p], fold(p)].filter(x => x && x !== p))) {
      if (!scNames.has(sc)) continue;
      spelled += 1;
      if (data.SC_CLUB_CANON[sc] !== p) { drift += 1; fail(`${sc} is ${p} in the shared table but SC_CLUB_CANON does not say so`); }
    }
  }
  if (!NAME_ALIASES || Object.keys(NAME_ALIASES).length < 4 || spelled < 8) fail(`only ${spelled} respelled pair clubs found, the drift check reads nothing`);
  console.log(`   ${spelled} pair clubs Soccer Career spells differently, ${drift} missing from the alias map`);
  const sourced = (x, y) => rows.some(r => (r.a === x && r.b === y) || (r.a === y && r.b === x));
  const unsourced = new Set(data.PRIMARY_RIVAL_UNSOURCED);
  let edges = 0, missing = 0;
  for (const [k, v] of Object.entries(data.PRIMARY_RIVAL)) {
    edges += 1;
    if (sourced(k, v) && unsourced.has(k)) fail(`${k} has a sourced pair with ${v} but is still on the unsourced list, take it off`);
    if (!sourced(k, v) && !unsourced.has(k)) { missing += 1; fail(`${k} points at ${v} with no sourced pair and is not on the unsourced list`); }
  }
  if (unsourced.size > UNSOURCED_BASELINE) fail(`the unsourced list grew to ${unsourced.size}, above the frozen ${UNSOURCED_BASELINE}`);
  console.log(`   ${rows.length} pairs, ${bad} bad; ${Object.keys(data.SC_CLUB_CANON).length} aliases; ${edges} primary edges, ${unsourced.size} on the ratchet (frozen at ${UNSOURCED_BASELINE}), ${missing} unaccounted`);
  if (rows.length < 40) fail(`only ${rows.length} pairs, the research did not land`);
}

section = 2;
console.log('2) Club Manager reads exactly what it read before the lift');
{
  /* Recorded with --record logic from origin/main's clubManager.ts RIVALS
     before this round moved it (2026-10-05, .tmp-fx recorder, 115 keys, 368
     clubs), and again after the move.
     BOARD_HASH re-taken at Release AF (2026-10-06), on purpose: the board's
     rival is the hand mapped one when it plays in the club's league, and
     otherwise nearestRival's pick by starting XI strength, which reads the
     rosters. Round 1015 re-baked the modern squads, and 98 of the 368 boards
     now name a different nearest club. Attribution: the merged tree with
     only Round 1015's rosters, nationality map and era guard put back gives
     the old hash, 00922bf91f48, exactly; none of the 98 changed rivals, old
     or new, is a hand mapped one; and RIVALS_HASH, the lifted table itself,
     did not move.
     BOARD_HASH re-taken again at Release AH (2026-10-06), for Round 1035's
     A-League Men: the board now covers 380 clubs, not 368. Attribution, the
     full snapshot written by --record in throwaway copies: the merged tree
     fc30942e with Round 1035's merge reverted gives the Release AF hash,
     c9b27c674c4b, exactly; the merged tree adds the twelve A-League clubs
     (each board naming its nearestRival pick, none hand mapped) and changes
     none of the 368 others; the lead's F10 call (Central Coast Mariners
     partial) moves nothing. RIVALS_HASH did not move.
     BOARD_HASH re-taken at Release AI (2026-10-07), for Round 1040's Serie B,
     Ligue 2 and Segunda: the board now covers 438 clubs. Attribution, full
     snapshots dumped in throwaway copies of --record: origin/main 2fff5e04
     gives the Release AH hash, fcc9f161da14, over 380 clubs; the merged tree
     adds exactly 58 clubs, the three second tiers, and changes and drops none
     of the 380. RIVALS_HASH did not move.
     BOARD_HASH re-taken in Round 1052 (2026-10-08), for the Russian Premier
     League: the board now covers 454 clubs. Attribution, full snapshots
     dumped by the --record logic in throwaway copies on a GitHub runner at
     1fa0a7a7: the tree with the round out of the world gives the Release AI
     hash, c37dbeb1ca09, over 438 clubs; the tree as it is adds exactly 16
     clubs, the Russian league, and changes and drops none of the 438. Each
     new board names its nearestRival pick, none hand mapped. RIVALS_HASH
     did not move: the round adds no PRIMARY_RIVAL row.
     Re-taken once more in the same round at 183690a7, after its review
     found the Russian squads fifty men short (a parser had skipped every
     man with an icon after his name) and 46 of them joined: the ratings
     of the sixteen moved, so their nearestRival picks did (Zenit now
     names Krasnodar, Krasnodar names Spartak Moscow, CSKA Moscow still
     names Dynamo Moscow). The same two snapshots again: the round out of
     the world is c37dbeb1ca09 over 438 clubs, the tree adds exactly 16
     and changes and drops none of the 438. */
  const RIVALS_HASH = '565e14623c2fe3607eec8864303d001fce77c4308c1a408c6c49114ea9b679d6';
  const BOARD_HASH = '8093c57e74818a8fae9742121e2d4e6e2d650e400f9680cbdc2735360e7595bf';
  const h = sha(sortedJson(data.PRIMARY_RIVAL));
  const snap = boardSnapshot();
  const b = sha(sortedJson(snap));
  console.log(`   rivals ${h.slice(0, 12)} (${Object.keys(data.PRIMARY_RIVAL).length} keys), board ${b.slice(0, 12)} (${Object.keys(snap).length} clubs)`);
  if (h !== RIVALS_HASH) fail('the lifted rivals table is not the one Club Manager had');
  if (b !== BOARD_HASH) fail('a Club Manager board now names a different rival');
}

/* The pool: careers starting in 2020 from the academies that feed the eight
   verified leagues, every position, ten pro seasons each. */
const NATIONS = ['England', 'Spain', 'Italy', 'Germany', 'France', 'Portugal', 'Brazil', 'Mexico'];
const PER_NATION = Number(process.env.SIM_DERBY_PER || 25);
const t0 = Date.now();
const pool = [];
for (const nation of NATIONS) for (let i = 0; i < PER_NATION; i++) {
  const seed = 9000 + NATIONS.indexOf(nation) * 1000 + i + OFFSET * 1000003;
  const s = runCareer(engine, seed, { nation });
  pool.push({ seed, nation, position: POSITIONS[seed % POSITIONS.length], state: s, rows: (s.seasons || []).filter(r => r.type === 'playing') });
}
const poolRows = pool.flatMap(c => c.rows.map(r => ({ r, position: c.position, state: c.state })));
console.log(`pool: ${pool.length} careers, ${poolRows.length} playing seasons, ${poolRows.filter(x => x.r.derbies).length} with derbies (${((Date.now() - t0) / 1000).toFixed(0)} s)`);

/* Forced seasons: a career walked to its first pro season, its calendar moved
   so the next season is the target year, then put at one club, era correct
   tier and league, for one season, over many seeds. */
const FORCED = Number(process.env.SIM_DERBY_FORCED || 120);
function forcedSeasons(e, club, year, n = FORCED) {
  const out = [];
  for (let i = 1; i <= n; i++) {
    const seed = 70000 + year * 13 + i + OFFSET * 1000003;
    let s = runCareer(e, seed, { until: x => x.phase === 'playing' && !(x.seasons || []).some(r => r.type === 'playing') });
    if (s.phase !== 'playing') continue;
    const next = (s.seasons[s.seasons.length - 1]?.year ?? 2020) + 1;
    const shift = year - next;
    const adj = eras.adjustClubsForYear(clubs, year).find(c => c.name === club);
    if (!adj) continue;
    s = { ...s, seasons: s.seasons.map(r => ({ ...r, year: r.year + shift })), currentClub: club, currentClubTier: adj.tier, currentLeague: adj.league, currentClubCountry: adj.country };
    const realRandom = Math.random;
    Math.random = seeded(seed * 31 + 7);
    try { s = e.advanceProSeason(s, clubs); } finally { Math.random = realRandom; }
    const row = (s.seasons || []).filter(r => r.type === 'playing').pop();
    if (!row || row.club !== club || row.year !== year) continue;
    out.push({ r: row, position: POSITIONS[seed % POSITIONS.length], state: s });
  }
  return out;
}
const { eras } = MAIN;
/* [club, year, rivals expected, why] */
const FORCED_CASES = [
  ['Arsenal', 2020, ['Tottenham', 'Chelsea'], 'the North London derby and a London derby'],
  ['Real Madrid', 2020, ['Barcelona', 'Atletico Madrid'], 'El Clasico and the Madrid derby'],
  ['Man City', 2020, ['Man United'], 'the alias map: Man City is Manchester City in the table'],
  /* Round 1037 moved the past cases outside the six ledger leagues to none
     (a past derby needs both clubs in one ledger league that season), and
     checks each of them from 2026-27 on instead, where nothing moved */
  ['Sao Paulo', 2020, [], 'before 2026-27 the Brasileirao is not one of the six leagues the ledgers hold'],
  ['Sao Paulo', 2026, ['Corinthians', 'Palmeiras', 'Santos'], 'three Paulista rivals, through the alias map'],
  ['Corinthians', 2002, [], 'the Brasileirao before 2003 claims nothing'],
  ['Corinthians', 2003, [], 'before 2026-27 the Brasileirao is not one of the six leagues the ledgers hold'],
  ['Corinthians', 2026, ['Palmeiras', 'Sao Paulo', 'Santos'], 'the double round robin Brasileirao'],
  ['Newcastle', 2020, [], 'Sunderland were in League One in 2020-21 (the league ledgers)'],
  ['Newcastle', 2026, ['Sunderland'], 'the Tyne-Wear derby, woken by Round 1013 adding Sunderland'],
  ['Celta Vigo', 2020, [], 'Deportivo were in the third tier in 2020-21 (the league ledgers)'],
  ['Celta Vigo', 2026, ['Deportivo'], 'the Galician derby, Round 1013 Deportivo through the alias map'],
  ['West Ham', 2020, ['Tottenham'], 'Millwall plays in another league in the game, so the Dockers derby is dormant'],
  ['Roma', 2020, ['Napoli'], 'Lazio is not a Soccer Career club, so the Derby della Capitale is dormant'],
  ['PSG', 2018, ['Marseille'], 'the last full Ligue 1 season before the held one'],
  ['PSG', 2019, [], 'Ligue 1 2019/20 was abandoned, held'],
  ['PSG', 2020, ['Marseille'], 'Ligue 1 after the held season'],
  ['Club America', 1995, [], 'Liga MX before the short tournaments claims nothing'],
  ['Club America', 1996, [], 'before 2026-27 Liga MX is not one of the six leagues the ledgers hold'],
  ['Club America', 2019, [], 'the Clausura 2020 was cancelled, held'],
  ['Club America', 2026, ['Chivas', 'Cruz Azul', 'Pumas'], 'the Liga MX clasicos, through the alias map'],
  ['Boca Juniors', 2020, [], 'Argentina has no verified cadence'],
  ['Brighton', 1990, [], 'Brighton were in the Second Division in 1990-91 (the league ledgers)'],
  ['Crystal Palace', 1991, [], 'a First Division season, Brighton a division below (the league ledgers)'],
  ['Brighton', 2026, ['Crystal Palace'], 'the M23 derby from 2026-27'],
];
const forcedRows = [];
section = 3;
console.log('3) the right derbies, the verified number of meetings, and nothing else');
{
  let checked = 0, withDerbies = 0, wrongCount = 0, wrongSet = 0, keyWithout = 0;
  const meetingsCounted = {};
  const check = ({ r }) => {
    const field = seasonField(r);
    if (field.members) worldSeasons += 1;
    const want = derby.seasonDerbies({ club: r.club, league: field.league, year: r.year, clubs: field.clubs });
    const n = derby.derbyMeetings(field.meetingsLeague, r.year);
    checked += 1;
    if (want.length === 0) { if ('derbies' in r) keyWithout += 1; return; }
    withDerbies += 1;
    const got = derby.readSeasonDerbies(r);
    if (got.map(d => d.rival).join('|') !== want.map(d => d.rival).join('|')) wrongSet += 1;
    for (const d of got) {
      meetingsCounted[d.meetings.length] = (meetingsCounted[d.meetings.length] || 0) + 1;
      if (d.meetings.length !== n || n !== 2) wrongCount += 1;
    }
  };
  for (const x of poolRows) check(x);
  console.log(`   pool: ${checked} seasons, ${withDerbies} with a derby; meetings per rival ${JSON.stringify(meetingsCounted)}; ${wrongCount} wrong counts, ${wrongSet} wrong rival sets, ${keyWithout} derbies keys where none was due`);
  if (wrongCount) fail(`${wrongCount} rivals with a meeting count other than the verified 2`);
  if (wrongSet) fail(`${wrongSet} seasons whose rivals differ from the detection`);
  if (keyWithout) fail(`${keyWithout} seasons carry a derbies key with no derby due`);
  if (withDerbies < 100) fail(`only ${withDerbies} pool seasons had a derby, too few to say anything`);
  console.log(`   ${worldSeasons} of them were played in the career's own 2026 on field (read off the row)`);
  if (worldSeasons < 100) fail(`only ${worldSeasons} pool seasons in a saved 2026 on field, too few to say the field is read`);
  for (const [club, year, wantRivals, why] of FORCED_CASES) {
    const rows = forcedSeasons(engine, club, year);
    forcedRows.push(...rows);
    let ok = 0;
    for (const x of rows) {
      const got = derby.readSeasonDerbies(x.r);
      const rivals = got.map(d => d.rival);
      const counts = got.every(d => d.meetings.length === 2);
      if (rivals.join('|') === wantRivals.join('|') && counts && (wantRivals.length > 0 || !('derbies' in x.r))) ok += 1;
    }
    console.log(`   ${club} ${year}: ${ok} of ${rows.length} seasons right (${wantRivals.join(', ') || 'none'}; ${why})`);
    if (rows.length < FORCED / 2) fail(`${club} ${year}: only ${rows.length} forced seasons played`);
    if (ok !== rows.length) fail(`${club} ${year}: ${rows.length - ok} seasons wrong`);
  }
  let outside = 0;
  for (const { r } of [...poolRows, ...forcedRows]) {
    const field = seasonField(r);
    const known = eras.adjustClubsForYear(field.clubs, r.year);
    for (const d of derby.readSeasonDerbies(r)) {
      const c = known.find(x => x.name === d.rival);
      if (field.members) { if (!c || !field.members.has(worldKey(d.rival))) outside += 1; continue; }
      if (!c || yearLeague(c.name, r.year) !== yearLeague(r.club, r.year)) outside += 1;
    }
  }
  if (outside) fail(`${outside} meetings name a club outside the league or not yet founded`);

  /* Every pair's status in 2020, pinned. Name drift is silent (an alias entry
     lost, a club renamed) and turns a shipped derby dormant with every other
     check still green, so the dormant pairs are listed here by name and the
     active count is fixed. A pair that changes status fails until it is moved
     on purpose: Round 1013 adds clubs and must move the pairs it wakes. */
  /* Round 1037: 2020 is a past season now, answered by the league ledgers,
     so the drift fence reads the list's own season, 2026-27 (the labels a
     drift would break) */
  const REF_YEAR = 2026;
  /* Round 1037 moved this from 51 to 48, on purpose: it released Round
     1022's held labels, so Wolves, West Ham (both Championship) and Girona
     (Segunda Division) play 2026-27 a division down, and Aston Villa and
     Wolves, Barcelona and Girona, West Ham and Tottenham sleep from then on.
     Attribution: the same tree with those three labels put back reads 51
     and the old 13 at 2026, and nothing else moved. */
  /* Round 1100 moved it from 48 to 56, on purpose, in two steps that were
     read apart. The career club pool grew from 241 to 460 clubs (every Club
     Manager league, whole), which put both clubs of six pairs in one league
     of the list: Dortmund and Schalke, Koln and Gladbach, Werder Bremen and
     Hamburg (Bundesliga), Roma and Lazio (Serie A), Lille and Lens (Ligue 1),
     Guadalajara and Atlas (Liga MX). The tree with the pool alone read 54.
     Then the Championship got its cadence row (one table, 46 games, two
     meetings), which woke the two sourced pairs the table already held:
     West Ham and Millwall, Wolves and West Brom. No pair was added. */
  const ACTIVE_2020 = 56;
  /* Recorded 2026-10-05 from the round's tree: 40 active and 24 dormant
     before the merge, 51 and 13 after Round 1013 (merged from main) added
     Sunderland, Leeds, Espanyol, Deportivo, Levante, Fluminense, Vasco da
     Gama, Internacional and Atletico Mineiro, which woke eleven pairs (moved
     here on purpose). Dormant means the other club is not a Soccer Career
     club, or plays in another league in the game, or the league has no
     verified cadence (Argentina). */
  const DORMANT_2020 = [
    'Boca Juniors and River Plate', 'Hertha BSC and Union Berlin',
    'Nantes and Rennes', 'Norwich City and Ipswich Town',
    'Stuttgart and Karlsruhe',
    'Aston Villa and Wolves', 'Barcelona and Girona', 'West Ham and Tottenham',
  ];
  const world2020 = eras.adjustClubsForYear(clubs, REF_YEAR);
  const status = { active: [], dormant: [] };
  for (const r of data.CLUB_RIVALRIES) {
    const mine = world2020.filter(c => derby.canonClub(c.name) === r.a);
    const on = mine.some(c => derby.seasonDerbies({ club: c.name, league: c.league, year: REF_YEAR, clubs }).some(d => derby.canonClub(d.rival) === r.b));
    status[on ? 'active' : 'dormant'].push(`${r.a} and ${r.b}`);
  }
  const wantDormant = [...DORMANT_2020].sort();
  const gotDormant = [...status.dormant].sort();
  console.log(`   ${REF_YEAR}: ${status.active.length} pairs active, ${status.dormant.length} dormant (pinned ${ACTIVE_2020} and ${wantDormant.length})`);
  if (status.active.length !== ACTIVE_2020) fail(`${status.active.length} pairs active in ${REF_YEAR}, pinned at ${ACTIVE_2020}`);
  if (gotDormant.join('|') !== wantDormant.join('|')) {
    const woke = wantDormant.filter(k => !gotDormant.includes(k));
    const slept = gotDormant.filter(k => !wantDormant.includes(k));
    fail(`pair status moved in ${REF_YEAR}: newly active ${JSON.stringify(woke)}, newly dormant ${JSON.stringify(slept)}`);
    if (process.env.SIM_DERBY_PRINT_STATUS) console.log(JSON.stringify(gotDormant, null, 1));
  }
}

section = 4;
console.log('4) derby goals are a subset, keepers never score one, Derby Hero is derived and never stored');
{
  let seasonsChecked = 0, overGoals = 0, overApps = 0, gkGoals = 0, badWon = 0, heroMismatch = 0, stored = 0, playedFalseGoals = 0;
  let pairsOfTwo = 0, sameGround = 0, replayed = 0, replayOff = 0;
  /* The replay: the engine's season inputs are all on the row (the seed key
     is built from them), so the derbies the engine stored must be exactly
     what the module draws from those inputs with the engine's own elite list.
     That ties every input the engine passes (elite, title, apps, goals) to
     what shipped, not just the module to itself. */
  if (!Array.isArray(engine.ELITE_CLUBS) || engine.ELITE_CLUBS.length < 3) fail('the engine does not export its elite list, the replay would read nothing');
  for (const { r, position, state } of [...poolRows, ...forcedRows]) {
    const ds = derby.readSeasonDerbies(r);
    if (!ds.length) continue;
    seasonsChecked += 1;
    /* A double round robin is one home and one away against each rival. */
    for (const d of ds) if (d.meetings.length === 2) { pairsOfTwo += 1; if (d.meetings.filter(m => m.home).length !== 1) sameGround += 1; }
    const field = seasonField(r);
    const again = derby.resolveSeasonDerbies({
      club: r.club, league: field.league, year: r.year, clubs: field.clubs, elite: engine.ELITE_CLUBS || [], position,
      apps: r.apps, leagueApps: r.leagueApps, goals: r.goals, leagueTitle: r.leagueTitle,
      seedKey: `${state.playerName}|${r.club}|${r.year}|${r.apps}|${r.goals}|${r.assists}|${r.rating}|derby`,
    });
    replayed += 1;
    if (JSON.stringify(again) !== JSON.stringify(r.derbies)) {
      replayOff += 1;
      if (replayOff <= 4) console.log(`   REPLAY DIFFERS ${state.playerName} ${r.year} ${r.club} (${field.league}${field.members ? ', saved field' : ''}): apps ${r.apps}, leagueApps ${r.leagueApps}, goals ${r.goals}, title ${r.leagueTitle}, severe ${!!r.injurySevere}, ban ${r.suspensionMatches ?? 0}; stored ${JSON.stringify(r.derbies).slice(0, 260)}; drawn ${JSON.stringify(again).slice(0, 260)}`);
    }
    const ms = ds.flatMap(d => d.meetings);
    const goals = ms.reduce((n, m) => n + m.goals, 0);
    if (goals > r.goals) overGoals += 1;
    if (ms.filter(m => m.played).length > (r.leagueApps ?? r.apps)) overApps += 1;
    if (position === 'GK' && goals > 0) gkGoals += 1;
    for (const m of ms) {
      if (m.won && !(m.gf > m.ga && m.goals > 0 && m.played)) badWon += 1;
      if (!m.played && m.goals > 0) playedFalseGoals += 1;
    }
    if (derby.isDerbyHeroSeason(r) !== ms.some(m => m.won)) heroMismatch += 1;
    if ((state.awards || []).some(a => a.name === 'Derby Hero')) stored += 1;
  }
  console.log(`   ${seasonsChecked} derby seasons: ${overGoals} over the season's goals, ${overApps} over its league apps, ${gkGoals} keeper goals, ${badWon} bad winner flags, ${playedFalseGoals} goals in a missed game, ${heroMismatch} hero mismatches, ${stored} careers storing a Derby Hero award`);
  if (seasonsChecked < 100) fail(`only ${seasonsChecked} derby seasons to check`);
  if (overGoals + overApps + gkGoals + badWon + heroMismatch + stored + playedFalseGoals) fail('a record rule is broken');
  console.log(`   ${pairsOfTwo} two meeting rivalries, ${sameGround} played both at one ground; ${replayed} seasons replayed from their own inputs, ${replayOff} differ from what the engine stored`);
  if (pairsOfTwo < 100) fail(`only ${pairsOfTwo} two meeting rivalries to check home and away on`);
  if (sameGround) fail(`${sameGround} rivalries met twice at the same ground, a double round robin is one home and one away`);
  if (replayOff) fail(`${replayOff} seasons store derbies the module would not draw from their own inputs and the engine's elite list`);
  const input = { club: 'Arsenal', league: 'Premier League', year: 2021, clubs, elite: [], position: 'ST', apps: 40, leagueApps: 33, goals: 18, leagueTitle: true, seedKey: 'determinism' };
  if (JSON.stringify(derby.resolveSeasonDerbies(input)) !== JSON.stringify(derby.resolveSeasonDerbies({ ...input }))) fail('the same season resolved twice gave two answers');
}

section = 5;
console.log('5) resolving the derbies draws nothing from the main stream');
{
  /* simCareerLeagueFinish's 16 digest careers, run in bundle A (no derbies at
     all) and bundle B (derbies resolved, swing off). The digest drops the
     keys the later rounds added (Round 929 leagueFinish and leagueSize, Round
     974 story, Round 1011 ovr on season rows) plus this round's derbies. */
  const DROP = ['leagueFinish', 'leagueSize', 'derbies'];
  const isSeasonRow = o => o && typeof o === 'object' && 'rating' in o && 'leagueTitle' in o;
  const digest = s => sha(JSON.stringify(s, function (k, v) { return DROP.includes(k) || (this === s && k === 'story') || (k === 'ovr' && isSeasonRow(this)) ? undefined : v; })).slice(0, 16);
  let equal = 0, derbySeasons = 0, aDerbies = 0;
  const aDigests = [];
  for (let i = 1; i <= 16; i++) {
    const a = runCareer(A.engine, i);
    const b = runCareer(B.engine, i);
    aDigests.push(digest(a));
    if (digest(a) === digest(b)) equal += 1;
    derbySeasons += (b.seasons || []).filter(r => r.derbies).length;
    aDerbies += (a.seasons || []).filter(r => r.derbies).length;
  }
  /* Measured on 2026-10-05: see BANDS. */
  console.log(`   ${equal} of 16 digests equal; bundle B played ${derbySeasons} derby seasons, bundle A ${aDerbies}`);
  /* Bundle A has no derbies key, so these are simCareerLeagueFinish's own
     digests of a build without the derbies: when that harness is re-recorded,
     they are what the list was before this round's swing. Printed, never
     asserted, since later rounds move that list on purpose. */
  if (process.env.SIM_DERBY_PRINT_DIGESTS) console.log('   bundle A digests ' + JSON.stringify(aDigests));
  if (aDerbies) fail('bundle A was meant to have no derbies at all');
  if (derbySeasons < BANDS.digestDerbySeasons) fail(`bundle B played only ${derbySeasons} derby seasons over the 16 careers, under the floor ${BANDS.digestDerbySeasons}, so equal digests would prove nothing`);
  if (equal !== 16) fail(`${16 - equal} digests differ: resolving a derby moved the main Math.random stream`);
}

section = 6;
console.log('6) the swing is bounded, results follow strength, heroes follow position');
{
  /* 6a, exact: the season's derby swing is the clamp of 2 per win, minus 2 per
     loss, plus 2 for a hero season, inside -4 to +6 popularity and -4 to +4
     morale. Literal numbers on purpose: an edited constant must not be able
     to move the expectation with it. */
  let applied = 0, offPop = 0, offMor = 0, outside = 0;
  const cl = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  for (const { r } of [...poolRows, ...forcedRows]) {
    const ds = derby.readSeasonDerbies(r);
    if (!ds.length) continue;
    const rec = derby.derbyRecord(ds);
    const s = { popularity: 50, morale: 50, events: [] };
    derby.applySeasonDerbies(s, r);
    applied += 1;
    const dp = s.popularity - 50, dm = s.morale - 50;
    if (dp < -4 || dp > 6 || dm < -4 || dm > 4) outside += 1;
    if (dp !== cl(2 * rec.w - 2 * rec.l + (rec.heroes > 0 ? 2 : 0), -4, 6)) offPop += 1;
    if (dm !== cl(2 * rec.w - 2 * rec.l, -4, 4)) offMor += 1;
  }
  console.log(`   6a: ${applied} seasons swung, ${outside} outside the bands, ${offPop} popularity and ${offMor} morale off the clamp`);
  if (applied < 100) fail(`6a: only ${applied} seasons to swing`);
  if (outside || offPop || offMor) fail('6a: the per season swing is not the clamp');

  /* 6b and 6c: every meeting's strength gap, recomputed here from the era
     tiers and the era aware elite rule, then the win share per whole gap. */
  const ladderRows = [];
  for (const club of ['Chelsea', 'Crystal Palace', 'Brighton', 'Fulham', 'Juventus', 'Santos']) ladderRows.push(...forcedSeasons(engine, club, 2020 + OFFSET));
  /* The engine's own list (exported for this), never a copy that can drift. */
  const ELITE = engine.ELITE_CLUBS || [];
  const str = (name, year) => {
    const c = eras.adjustClubsForYear(clubs, year).find(x => x.name === name);
    return 5 - (c ? c.tier : 4) + (league.eliteInYear(ELITE, name, year) ? 0.5 : 0);
  };
  const rung = {};
  let meetings = 0, draws = 0;
  for (const { r } of [...poolRows, ...forcedRows, ...ladderRows]) {
    for (const d of derby.readSeasonDerbies(r)) {
      const gap = str(r.club, r.year) - str(d.rival, r.year);
      for (const m of d.meetings) {
        meetings += 1;
        if (m.gf === m.ga) draws += 1;
        if (!Number.isInteger(gap) || Math.abs(gap) > 2) continue;
        const k = String(gap);
        rung[k] = rung[k] || { n: 0, w: 0 };
        rung[k].n += 1;
        if (m.gf > m.ga) rung[k].w += 1;
      }
    }
  }
  const share = k => (rung[k] && rung[k].n ? rung[k].w / rung[k].n : NaN);
  const ladder = ['2', '1', '0', '-1', '-2'];
  console.log(`   6b: win share by strength gap ${ladder.map(k => `${k}: ${share(k).toFixed(3)} (${rung[k]?.n || 0})`).join(', ')}`);
  for (const k of ladder) if (!rung[k] || rung[k].n < BANDS.rungMin) fail(`6b: gap ${k} has ${rung[k]?.n || 0} meetings, under ${BANDS.rungMin}`);
  for (let i = 0; i + 1 < ladder.length; i++) {
    const stepUp = share(ladder[i]) - share(ladder[i + 1]);
    if (!(stepUp >= BANDS.rungStep)) fail(`6b: gap ${ladder[i]} wins only ${stepUp.toFixed(3)} more often than gap ${ladder[i + 1]}, under ${BANDS.rungStep}`);
  }
  const drawShare = draws / Math.max(1, meetings);
  console.log(`   6c: draw share ${drawShare.toFixed(3)} over ${meetings} meetings`);
  if (!(drawShare >= BANDS.drawLo && drawShare <= BANDS.drawHi)) fail(`6c: draw share ${drawShare.toFixed(3)} outside ${BANDS.drawLo} to ${BANDS.drawHi}`);

  /* 6d: Derby Hero seasons per derby season, by position group. */
  const GROUP = { ST: 'att', LW: 'att', RW: 'att', CAM: 'att', CM: 'mid', CDM: 'mid', LM: 'mid', RM: 'mid', CB: 'def', LB: 'def', RB: 'def', GK: 'gk' };
  /* More derby seasons for this one: the attacker to midfield gap is about
     0.03 and the pool alone measured it as low as 0.015, a coin toss. */
  const heroRows = [];
  for (const club of ['Sao Paulo', 'Corinthians', 'Club America', 'Arsenal', 'Real Madrid', 'Benfica']) heroRows.push(...forcedSeasons(engine, club, 2021 + OFFSET));
  const grp = {};
  for (const { r, position } of [...poolRows, ...forcedRows, ...ladderRows, ...heroRows]) {
    if (!derby.readSeasonDerbies(r).length) continue;
    const g = GROUP[position] || 'mid';
    grp[g] = grp[g] || { n: 0, h: 0 };
    grp[g].n += 1;
    if (derby.isDerbyHeroSeason(r)) grp[g].h += 1;
  }
  const rate = g => (grp[g] && grp[g].n ? grp[g].h / grp[g].n : NaN);
  console.log(`   6d: hero rate ${['att', 'mid', 'def', 'gk'].map(g => `${g} ${rate(g).toFixed(3)} (${grp[g]?.n || 0})`).join(', ')}`);
  if (!(rate('att') - rate('mid') >= BANDS.heroAttMid)) fail(`6d: attackers ${rate('att').toFixed(3)} not ahead of midfield ${rate('mid').toFixed(3)} by ${BANDS.heroAttMid}`);
  if (!(rate('mid') - rate('def') >= BANDS.heroMidDef && rate('def') > 0)) fail(`6d: midfield ${rate('mid').toFixed(3)} not ahead of defenders ${rate('def').toFixed(3)} by ${BANDS.heroMidDef}, or defenders never heroes`);
  if (!grp.gk || grp.gk.n < 20 || grp.gk.h !== 0) fail(`6d: keepers ${grp.gk?.h ?? '?'} hero seasons out of ${grp.gk?.n ?? 0}, must be 0 out of at least 20`);
  /* 6d level: the ordering above says nothing about how often. The winning
     goal is goal number ga + 1 of gf, and each of the team's goals is his
     with the same chance, so in a won meeting where he scored g of gf the
     chance it was the winner is g / gf. Heroes over that sum is about 1 when
     the rule is the one the copy promises ("your goal won it"); counting any
     goal up to the decider pushes it well above. Measured in BANDS. */
  let heroMeetings = 0, heroExpected = 0, wonScored = 0;
  for (const { r } of [...poolRows, ...forcedRows, ...ladderRows, ...heroRows]) {
    for (const d of derby.readSeasonDerbies(r)) for (const m of d.meetings) {
      if (!(m.played && m.gf > m.ga && m.goals > 0)) continue;
      wonScored += 1;
      heroExpected += m.goals / m.gf;
      if (m.won) heroMeetings += 1;
    }
  }
  const heroRatio = heroMeetings / Math.max(1e-9, heroExpected);
  console.log(`   6d: ${heroMeetings} winners in ${wonScored} won meetings he scored in, ${heroExpected.toFixed(1)} expected, ratio ${heroRatio.toFixed(3)} (band ${BANDS.heroRatioLo} to ${BANDS.heroRatioHi})`);
  if (wonScored < BANDS.heroMinMeetings) fail(`6d: only ${wonScored} won meetings he scored in`);
  if (!(heroRatio >= BANDS.heroRatioLo && heroRatio <= BANDS.heroRatioHi)) fail(`6d: hero ratio ${heroRatio.toFixed(3)} outside ${BANDS.heroRatioLo} to ${BANDS.heroRatioHi}, the winning goal rule moved`);

  /* 6e: the same pool with the swing off (bundle B). The swing feeds
     popularity (sponsorship, event and dilemma gates) and morale (the life
     events, the money events, the divorce roll, the paper), so every one of
     those moves a little; how much is bounded here. */
  /* Long careers, so the age gated outcomes (the Hall of Fame ballot needs 34)
     and the slow ones (a divorce) actually happen in both runs. */
  const LONG = [];
  for (const nation of NATIONS) for (let i = 0; i < Number(process.env.SIM_DERBY_LONG || 10); i++) LONG.push({ seed: 41000 + NATIONS.indexOf(nation) * 100 + i + OFFSET * 1000003, nation });
  const traceOn = [], traceOff = [];
  const on = LONG.map(c => runCareer(engine, c.seed, { nation: c.nation, proSeasons: 19, ovr: 72, trace: traceOn }));
  const off = LONG.map(c => runCareer(B.engine, c.seed, { nation: c.nation, proSeasons: 19, ovr: 72, trace: traceOff }));
  /* Final popularity sits near its ceiling of 100 (about 96), so it can hardly
     move; the mean over every season's end is the stronger reading. */
  const seasonMean = xs => xs.reduce((n, v) => n + v, 0) / Math.max(1, xs.length);
  const popSeasons = seasonMean(traceOn) - seasonMean(traceOff);
  console.log(`   6e: popularity at every season's end, on ${seasonMean(traceOn).toFixed(3)} (${traceOn.length}) off ${seasonMean(traceOff).toFixed(3)} (${traceOff.length}) difference ${popSeasons.toFixed(3)} (band ${BANDS.popSeasonDiff})`);
  if (traceOn.length < 100 || traceOff.length < 100) fail('6e: too few seasons traced');
  if (!(Math.abs(popSeasons) <= BANDS.popSeasonDiff)) fail(`6e: popularity over the seasons moved by ${popSeasons.toFixed(3)}, over the band ${BANDS.popSeasonDiff}`);
  const divorced = xs => xs.filter(x => x.family && x.family.isDivorced).length;
  console.log(`   6e: ${LONG.length} long careers each way, ${divorced(on)} and ${divorced(off)} divorced, ${on.filter(x => /Hall of Fame/.test(JSON.stringify([x.events, x.story]))).length} and ${off.filter(x => /Hall of Fame/.test(JSON.stringify([x.events, x.story]))).length} with a Hall of Fame line`);
  const mean = (xs, f) => xs.reduce((n, x) => n + f(x), 0) / xs.length;
  const hof = x => JSON.stringify([x.events, x.story]).match(/Hall of Fame (speech|dinner)|Inducted into the Hall of Fame/g)?.length || 0;
  const M = [
    ['final popularity', x => x.popularity, BANDS.popDiff],
    ['final morale', x => x.morale, BANDS.moraleDiff],
    ['sponsorship', x => x.sponsorshipIncome || 0, BANDS.sponsorDiff],
    ['net worth', x => x.netWorth || 0, BANDS.worthDiff],
    ['hall of fame lines', hof, BANDS.hofDiff],
  ];
  for (const [label, f, band] of M) {
    const d = mean(on, f) - mean(off, f);
    console.log(`   6e: ${label} on ${mean(on, f).toFixed(3)} off ${mean(off, f).toFixed(3)} difference ${d.toFixed(3)} (band ${band})`);
    if (!(Math.abs(d) <= band)) fail(`6e: ${label} moved by ${d.toFixed(3)}, over the band ${band}`);
  }
}

section = 7;
console.log('7) an old save plays on, garbage reads as nothing, the UI draws only what a season has');
{
  const strip = s => JSON.parse(JSON.stringify(s, (k, v) => (k === 'derbies' ? undefined : v)));
  const old = strip(pool[0].state);
  if (!save.isSoccerCareerSave(old)) fail('a save without derbies does not pass isSoccerCareerSave');
  let s = { ...old, retired: false, phase: 'playing' };
  const before = (s.seasons || []).filter(r => r.type === 'playing').length;
  const realRandom = Math.random;
  Math.random = seeded(4242 + OFFSET);
  try {
    let guard = 0;
    while (guard++ < 60 && (s.seasons || []).filter(r => r.type === 'playing').length === before && !s.retired) s = step(engine, s);
  } catch (err) { fail(`an old save threw while playing on: ${err && err.message}`); } finally { Math.random = realRandom; }
  console.log(`   old save: ${before} seasons, played on to ${(s.seasons || []).filter(r => r.type === 'playing').length}`);
  const good = { rival: 'Tottenham', name: 'North London derby', kind: 'derby', meetings: [{ home: true, gf: 2, ga: 1, played: true, goals: 1, won: true }, { home: false, gf: 1, ga: 1, played: true, goals: 0 }] };
  const GARBAGE = [undefined, null, {}, 'season', 42, { derbies: 'x' }, { derbies: [null] }, { derbies: [{ ...good, kind: 'feud' }] },
    { derbies: [{ ...good, meetings: [{ ...good.meetings[0], gf: NaN }] }] }, { derbies: [{ ...good, meetings: [] }] }, { derbies: [{ ...good, rival: '' }] },
    { derbies: [good, { ...good, meetings: [{ ...good.meetings[0], won: 'yes' }] }] }];
  const leaks = GARBAGE.filter(g => derby.readSeasonDerbies(g).length !== 0).length;
  if (leaks) fail(`${leaks} malformed seasons read as derbies`);
  if (derby.readSeasonDerbies({ derbies: [good] }).length !== 1) fail('a well formed season reads as nothing');
  const html = (C, p) => render(C, p).replace(/<!-- -->/g, '');
  const oldSeason = { year: 2019, club: 'Arsenal', goals: 3 };
  const derbySeason = { year: 2020, club: 'Arsenal', goals: 3, derbies: [good] };
  const oldHtml = html(ui.DerbyChip, { season: oldSeason }) + html(ui.SeasonDerbyLines, { season: oldSeason }) + html(ui.CareerDerbyTotals, { seasons: [oldSeason] });
  const chip = html(ui.DerbyChip, { season: derbySeason });
  const lines = html(ui.SeasonDerbyLines, { season: derbySeason });
  const totals = html(ui.CareerDerbyTotals, { seasons: [oldSeason, derbySeason] });
  console.log(`   old season markup ${oldHtml.length} chars; chip "${chip.replace(/<[^>]+>/g, '')}"; totals "${totals.replace(/<[^>]+>/g, '')}"`);
  if (oldHtml !== '' || /\u{1F525}/u.test(oldHtml)) fail('an old season draws something');
  if (!chip.includes('data-derby-chip="1-1-0"') || !chip.includes('\u{1F525} 1-1-0')) fail('the timeline chip does not show 1-1-0');
  if (!lines.includes('W 2-1 (H), D 1-1 (A). You scored 1.')) fail(`the summary line is wrong: ${lines}`);
  if (!totals.includes('Derbies: 2 played, 1 W 1 D 0 L, 1 goal')) fail(`the career line is wrong: ${totals}`);
  const uiSrc = fs.readFileSync(path.join(ROOT, 'src/components/soccer-career/DerbyLines.tsx'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(?<!:)\/\/[^\n]*/g, ' ');
  if (/<button|<Button|onClick/.test(uiSrc)) fail('the derby UI has a button');
  const page = fs.readFileSync(path.join(ROOT, 'src/pages/SoccerCareer.tsx'), 'utf8').split('\n').filter(l => /Derby/.test(l) && !/^\s*(\/\/|\/\*|\*|\{\/\*)/.test(l));
  if (page.length < 4) fail(`only ${page.length} derby lines found in SoccerCareer.tsx, the page guard reads nothing`);
  if (page.some(l => /<button|<Button|onClick/.test(l))) fail('a derby line on the page carries a button');
}

section = 8;
console.log('8) no text claims a derby the record may contradict, and no dash anywhere');
{
  const state = pool[0].state;
  const ev1 = engine.getAllEvents(state).find(e => e.id === 1);
  if (!ev1) fail('event 1 is gone'); else {
    if (/derby/i.test(ev1.title + ev1.description)) fail(`event 1 still says derby: ${ev1.title}`);
    for (const c of ev1.choices) {
      const after = c.apply(JSON.parse(JSON.stringify({ ...state, events: [] })));
      if (/derby/i.test(JSON.stringify(after.events))) fail(`event 1 choice ${c.label} logs a derby`);
    }
  }
  for (const id of ['tunnel_brawl', 'ultras_tattoo']) {
    const d = engine.MORAL_DILEMMAS.find(x => x.id === id);
    if (!d) fail(`dilemma ${id} is gone`);
    else if (/derby/i.test(d.description)) fail(`dilemma ${id} still says derby`);
  }
  let lines = 0, dashed = 0;
  for (const { r } of [...poolRows, ...forcedRows]) {
    const s = { popularity: 50, morale: 50, events: [] };
    derby.applySeasonDerbies(s, r);
    for (const l of [...s.events, ...derby.readSeasonDerbies(r).map(derby.derbySummaryLine)]) { lines += 1; if (DASH.test(l)) dashed += 1; }
  }
  const POS = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST'];
  let fans = 0;
  for (const rival of new Set(data.CLUB_RIVALRIES.flatMap(r => [r.a, r.b]))) for (const [won, lost] of [[2, 0], [0, 2], [1, 1]]) for (const pos of POS) for (const standing of [10, 30, 50, 70, 90]) {
    const out = social.fanComments('soccer', { pos, standing, followers: '1.2M', derby: { won, lost, rival } });
    fans += 1;
    if (out.length !== 3) fail(`fan comments for ${pos} at ${standing} came back with ${out.length} lines`);
    if (!out[1].includes(rival)) fail(`the derby line is not the second comment for ${pos} at ${standing}`);
    if (out.some(l => DASH.test(l))) dashed += 1;
  }
  const draws = social.fanComments('soccer', { pos: 'ST', standing: 50, followers: '1.2M', derby: { won: 0, lost: 0, rival: 'Tottenham' } });
  if (draws.join('|') !== social.fanComments('soccer', { pos: 'ST', standing: 50, followers: '1.2M' }).join('|')) fail('a run of derby draws changed the fan comments');
  console.log(`   ${lines} derby log and summary lines, ${fans} fan comment sets, ${dashed} with a dash`);
  if (dashed) fail(`${dashed} derby lines carry an em or en dash`);
  if (lines < 100) fail(`only ${lines} derby lines read`);
}

const want = CONTROL ? CONTROLS[CONTROL] : [];
if (CONTROL) {
  const missed = want.filter(s => !red.has(s));
  if (missed.length) { console.log(`simCareerDerbies: CONTROL ${CONTROL} DID NOT FIRE in section ${missed.join(', ')}, it proves nothing`); process.exit(2); }
  console.log(`simCareerDerbies: CONTROL ${CONTROL} fired, sections ${[...red].sort().join(', ')} red as expected`);
  process.exit(1);
}
console.log(failures ? `simCareerDerbies: ${failures} failures, sections ${[...red].sort().join(', ')} red` : 'simCareerDerbies: all 8 sections green');
process.exit(failures ? 1 : 0);
