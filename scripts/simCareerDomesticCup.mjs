#!/usr/bin/env node
/* Round 1041: Soccer Career's domestic cup, named by country and played as a
   run every season (src/lib/soccerCareerCup.ts).

   Three bundles of the real engine. MAIN is the round as it ships (or with a
   control's edit). B stubs drawCupRun to return no run and nothing else.
   A takes the whole round out: no run, the coin kept in a season with no cup,
   and the phone's world back on its old league keyed rule. Edits are served
   to esbuild in place of the file, so nothing on disk changes.

   1. stream untouched (exact): the same forced seasons through MAIN and B
      draw Math.random the same number of times, and every row field but
      cupRun is identical. The run comes from its own generator.
   2. coherence, every forced season: the cup is won if and only if the final
      is; at most one tie is lost and it is the last; opponents are distinct,
      from his own association (a Welsh club plays the FA Cup, Monaco the
      Coupe de France) or the world's winner, never his club; a lost final is
      lost to the world's cup winner of his association's world league, and
      no club he beat is that winner; when he wins, the world's winner is his
      club, whatever division it plays in (a Championship side and the FA
      Cup); a season with no cup has no cup, no run and no world winner; the
      U.S. Open Cup is never won by a Canadian club; a name and a final score
      appear only where the recorded table (scripts/data/
      domesticCupSources.json) says so, and penalties only where its decider
      is penalties; 'scored' never with 0 season goals; the event line names
      the cup.
   3. outcomes against the round taken out (A): outside a season with no cup,
      every forced season wins the cup exactly when A does (the same coin);
      careers held at clubs of associations with no NONE window win exactly
      A's cups; in a NONE season A wins some and MAIN none. The run's shape:
      the share of lost runs that end in the early rounds falls as the club
      gets stronger, and the finals reached match the model's own odds.
   4. the data fence: the table equals the recorded copy window by window,
      every NAMED and NONE window cites verified facts on at least two hosts
      that are not Wikipedia with a read date, all nineteen checker
      corrections are recorded as applied, the table's digest is pinned, and
      Club Manager's cup names (read from its code, comments stripped) agree
      with the table's latest window wherever both speak.
   5. display: the exit line and the won run render through react-dom/server
      for a new row, and a row from before the round renders nothing new.

   Negative controls (CUP_CONTROL=...), each refusing to run unless its edit
   lands exactly once: stream (one Math.random in the draw, 1 red),
   wrongcountry (opponents from any association, 2), ignoreworld (the final
   drawn without the world's winner, 2), keepcoin (a season with no cup keeps
   the coin, 2 and 3), unverifiedname (Brazil 1990 to 2025 named, 2 and 4),
   flatrounds (a uniform exit stage, 3), leaguekey (the world tick keyed by
   league again, so a Championship side's FA Cup leaves the world's winner
   elsewhere, 2).

   MEASURED 2026-10-07 over seed offsets 0, 1, 2 and 3 (CUP_PER 40: 2400
   forced seasons an arm, 96 held careers of six seasons):
   - section 1: 2400 compared, 1815 to 1819 with a run, 0 differ (exact).
   - section 2: runs 1815 to 1819, cups won 297 to 354, NONE seasons 280
     (112 to 116 with a world league), lost finals against the world's
     winner 120 to 133, Championship cups 24 to 30, penalty finals 71 to 98,
     two legged finals 39 to 42, unnamed runs 153 to 161, worlds with an MLS
     winner about 2080, cups the world agrees with 259 to 307. Floors at
     about half of the smallest. 0 incoherent seasons.
   - section 3: 2120 seasons with a cup, 0 differ from the coin before the
     round; NONE seasons won before the round 46 to 55, now 0; held careers
     96 of 96, cups 135 to 139 both ways, 0 moved. Early exit share, tier 3
     and below minus the elite: 0.179, 0.179, 0.294, 0.225 (GAP_MIN 0.09,
     half the smallest). Finals reached over the model's expectation: 0.919,
     0.990, 1.067, 1.056 (band 0.82 to 1.18, about twice the largest miss).
   - controls at offset 0, each exit 1 with its sections red: stream (2313
     seasons draw differently), wrongcountry (2191 'country'), ignoreworld
     (76 'beatwinner', 99 'lostfinal'), keepcoin (46 'nonecup', 46 cups won
     with no cup), unverifiedname (37 'name', 6 'event', digest and Brazil
     window red in 4), flatrounds (gap -0.002, finals ratio 1.384),
     leaguekey (25 'worldwin', 11 'canadian'). */
import crypto from 'node:crypto';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const CONTROL = process.env.CUP_CONTROL || '';
const CONTROLS = { stream: [1], wrongcountry: [2], ignoreworld: [2], keepcoin: [2, 3], unverifiedname: [2, 4], flatrounds: [3], leaguekey: [2] };
if (CONTROL && !CONTROLS[CONTROL]) { console.error('unknown control ' + CONTROL + ' (known: ' + Object.keys(CONTROLS).join(', ') + ')'); process.exit(2); }
const OFFSET = Number(process.argv.find((a, i) => i > 1 && /^\d+$/.test(a)) || 0);
const TMP = process.env.TEMP || process.env.TMP || os.tmpdir();
const WORK = path.join(TMP, `sc-cup-${process.pid}`);
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

const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
/* Comments out, line by line: block comments, and a line comment outside the
   line's quotes. Strings that span lines are not this file's concern. */
function stripComments(src) {
  let inBlock = false;
  return src.split('\n').map(line => {
    let out = '', q = null;
    for (let i = 0; i < line.length; i++) {
      const c = line[i], d = line[i + 1];
      if (inBlock) { if (c === '*' && d === '/') { inBlock = false; i++; } continue; }
      if (q) { out += c; if (c === '\\') { out += d ?? ''; i++; } else if (c === q) q = null; continue; }
      if (c === '/' && d === '*') { inBlock = true; i++; continue; }
      if (c === '/' && d === '/') break;
      if (c === "'" || c === '"' || c === '`') q = c;
      out += c;
    }
    return out;
  }).join('\n');
}
/* An edit to a copy of a file, refusing to run when the anchor is not there
   exactly once: a control that changes nothing proves nothing. */
function edit(src, anchor, replacement, why, file) {
  const n = src.split(anchor).length - 1;
  if (n !== 1) { console.error(`${why}: the anchor appears ${n} times in ${file}, refusing to run a dead edit`); process.exit(2); }
  return src.replace(anchor, replacement);
}
const CUP = 'src/lib/soccerCareerCup.ts';
const ENGINE = 'src/lib/soccerCareerEngine.ts';
const PHONE = 'src/lib/soccerPhone.ts';
const SRC = { [CUP]: read(CUP), [ENGINE]: read(ENGINE), [PHONE]: read(PHONE) };
const DRAW_HEAD = 'export function drawCupRun(input: CupRunInput): CupRun | null {';
const NO_RUN = s => edit(s, DRAW_HEAD, DRAW_HEAD + ' if (input) return null;', 'run off', CUP);
const COIN = '\n    && cupFor(cupAssociation(state.currentClubCountry, state.currentLeague), seasonYear).kind !== "NONE";';
const OLD_WORLD = 'if (assoc === undefined || opts.playerCupAssociation === undefined) {';

const main = { ...SRC };
const ctl = (file, anchor, replacement) => { main[file] = edit(main[file], anchor, replacement, CONTROL, file); };
if (CONTROL === 'stream') ctl(CUP, DRAW_HEAD, DRAW_HEAD + ' Math.random();');
if (CONTROL === 'wrongcountry') ctl(CUP, 'if (seen.has(c.name) || cupAssociation(c.country, c.league) !== association) continue;', 'if (seen.has(c.name)) continue;');
if (CONTROL === 'ignoreworld') ctl(CUP, 'const winner = input.worldWinner && input.worldWinner !== input.club ? input.worldWinner : null;', 'const winner = null as string | null;');
if (CONTROL === 'keepcoin') ctl(ENGINE, COIN, ';');
if (CONTROL === 'unverifiedname') ctl(CUP, '{ from: 1990, to: 2025, kind: "UNKNOWN", why: "entry went by state', '{ from: 1990, to: 2025, kind: "NAMED", name: "Copa do Brasil", why: "entry went by state');
if (CONTROL === 'flatrounds') ctl(CUP, 'const w = Math.pow(p, i) * (1 - p);', 'const w = (1 - Math.pow(p, k)) / k;');
if (CONTROL === 'leaguekey') ctl(PHONE, 'draw(notMine(entrants, assoc === opts.playerCupAssociation && !!opts.playerCup))', 'draw(notMine(entrants, mine && !!opts.playerCup))');
if (CONTROL) console.log(`NEGATIVE CONTROL ON: ${CONTROL}, sections ${CONTROLS[CONTROL].join(' and ')} must go red`);
const armB = { ...SRC, [CUP]: NO_RUN(SRC[CUP]) };
const armA = { [CUP]: NO_RUN(SRC[CUP]), [ENGINE]: edit(SRC[ENGINE], COIN, ';', 'coin kept', ENGINE), [PHONE]: edit(SRC[PHONE], OLD_WORLD, 'if (true) {', 'old world rule', PHONE) };

async function bundle(name, files, withUi) {
  const ENTRY = path.join(WORK, `${name}.entry.mjs`);
  const OUT = path.join(WORK, `${name}.bundle.mjs`);
  fs.writeFileSync(ENTRY, `
export * as engine from '${ROOT_URL}/src/lib/soccerCareerEngine.ts';
export * as cup from '${ROOT_URL}/src/lib/soccerCareerCup.ts';
export * as eras from '${ROOT_URL}/src/lib/careerEras.ts';
export * as league from '${ROOT_URL}/src/lib/soccerCareerLeague.ts';
${withUi ? `
export * as ui from '${ROOT_URL}/src/components/soccer-career/CupRunLines.tsx';
import React from '${NM}/react/index.js';
import { renderToStaticMarkup } from '${NM}/react-dom/server.node.js';
import { MemoryRouter } from 'react-router-dom';
export const render = (Component, props) => renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(Component, props)));
` : ''}`);
  const byKey = {};
  for (const [rel, src] of Object.entries(files)) byKey[path.resolve(ROOT, rel).toLowerCase()] = src;
  await esbuild.build({
    entryPoints: [ENTRY], bundle: true, format: 'esm', platform: 'node', jsx: 'automatic',
    alias: { '@': `${ROOT_URL}/src` }, nodePaths: [NM], outfile: OUT, logLevel: 'error',
    define: { 'process.env.NODE_ENV': '"production"' },
    banner: { js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);" },
    plugins: [{ name: 'cup-variant', setup(b) {
      b.onLoad({ filter: /(soccerCareerCup|soccerCareerEngine|soccerPhone)\.ts$/ }, args => {
        const src = byKey[path.resolve(args.path).toLowerCase()];
        return src !== undefined ? { contents: src, loader: 'ts' } : undefined;
      });
    } }],
  });
  return import(pathToFileURL(OUT).href);
}
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const MAIN = await bundle('main', main, true);
const B = await bundle('b', armB, false);
const A = await bundle('a', armA, false);
try { fs.rmSync(WORK, { recursive: true, force: true }); } catch { /* temp only */ }
const { engine, cup, eras, league, ui, render } = MAIN;
const clubs = engine.FALLBACK_CLUBS;
for (const [k, v] of Object.entries({ drawCupRun: cup.drawCupRun, readCupRun: cup.readCupRun, cupFor: cup.cupFor, DOMESTIC_CUPS: cup.DOMESTIC_CUPS, SeasonCupExitLine: ui.SeasonCupExitLine, SeasonCupWinBlock: ui.SeasonCupWinBlock, clubs })) {
  if (!v) { console.error(`missing export ${k}, so nothing below measures anything`); process.exit(2); }
}

/* The career walk, simCareerDerbies' recipe: a seeded generator stands in for
   Math.random for the length of each career (counting its calls), and every
   pause the engine can raise between seasons is answered. */
let calls = 0;
function seeded(seed) { let x = (seed * 2654435761) >>> 0 || 1; return () => { calls += 1; x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }
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
function walk(e, seed, s0, until, maxSteps = 600) {
  const realRandom = Math.random;
  Math.random = seeded(seed);
  let s = s0;
  try {
    let guard = 0;
    while (!s.retired && guard++ < maxSteps && !until(s)) s = step(e, s);
    return s;
  } finally { Math.random = realRandom; }
}
const playing = s => (s.seasons || []).filter(r => r.type === 'playing');

/* Forced seasons: a career walked to its first pro season, its calendar moved
   so the next season is the target year, then put at one club (era correct
   tier, league and country) for one season. The world and the event lines of
   that season are kept beside the row. Returns the Math.random calls too. */
function forcedSeason(e, club, year, seed) {
  let s;
  const realRandom = Math.random;
  Math.random = seeded(seed * 7919 + 13);
  try {
    const position = POSITIONS[seed % POSITIONS.length];
    s = e.initCareer(`Cup ${seed}`, 'England', position, '2020-24', stats(60 + (seed % 25)), 60 + (seed % 25), 2020, clubs, null, 82);
  } finally { Math.random = realRandom; }
  s = walk(e, seed * 31 + 5, s, x => x.phase === 'playing' && playing(x).length === 0);
  if (s.phase !== 'playing') return null;
  const next = (s.seasons[s.seasons.length - 1]?.year ?? 2020) + 1;
  const shift = year - next;
  const adj = eras.adjustClubsForYear(clubs, year).find(c => c.name === club);
  if (!adj) return null;
  s = { ...s, seasons: s.seasons.map(r => ({ ...r, year: r.year + shift })), currentClub: club, currentClubTier: adj.tier, currentLeague: adj.league, currentClubCountry: adj.country };
  calls = 0;
  Math.random = seeded(seed * 31 + 7);
  let after;
  try { after = e.advanceProSeason(s, clubs); } finally { Math.random = realRandom; }
  const row = playing(after).pop();
  if (!row || row.club !== club || row.year !== year) return null;
  return { row, world: after.phone?.world ?? null, events: after.events || [], calls, league: adj.league, country: adj.country, tier: adj.tier };
}

/* [club, year]: every association the table holds, both sides of its NONE and
   UNKNOWN windows, the cross border clubs, the two legged and the replay
   finals, a Championship side, and every tier from the elite down. */
const CASES = [
  ['Arsenal', 1995], ['Arsenal', 2020], ['Man City', 2022], ['Everton', 2015], ['Brighton', 2026],
  ['Real Madrid', 2020], ['Barcelona', 2005], ['Sevilla', 2015],
  ['Bayern Munich', 2015], ['Dortmund', 2019],
  ['Juventus', 2004], ['Juventus', 2015], ['Roma', 2020],
  ['PSG', 2015], ['Marseille', 1991], ['Marseille', 1995], ['Monaco', 2015],
  ['Ajax', 2009], ['Ajax', 2019], ['PSV', 2015], ['Utrecht', 2022],
  ['Porto', 1995], ['Porto', 2005], ['Benfica', 2018], ['Braga', 2022],
  ['Celtic', 2018], ['Hearts', 2010],
  ['Galatasaray', 1995], ['Fenerbahce', 2018], ['Olympiacos', 2018], ['Club Brugge', 2018],
  ['Kawasaki Frontale', 2018], ['Kawasaki Frontale', 2020], ['Jeonbuk Motors', 2018], ['Jeonbuk Motors', 2024],
  ['Flamengo', 2015], ['Flamengo', 2026],
  ['LA Galaxy', 2015], ['LA Galaxy', 2020], ['Columbus Crew', 2008], ['Inter Miami', 2025],
  ['Toronto FC', 2015], ['Toronto FC', 2022], ['Toronto FC', 2009],
  ['Club America', 2005], ['Club America', 2015], ['Monterrey', 2023],
  ['Boca Juniors', 2000], ['Boca Juniors', 2015],
  ['Wellington Phoenix', 2026], ['Wellington Phoenix', 2018],
  ['Al Hilal', 2018],
  ['Cardiff City', 2015], ['Wrexham', 2024],
];
/* Championship sides, to see an FA Cup won outside the Premier League */
const CHAMPIONSHIP = clubs.filter(c => c.country === 'England' && c.league === 'Championship').slice(0, 6).map(c => [c.name, 2018]);
const PER = Number(process.env.CUP_PER || 40);
/* BANDS: set from the measurements recorded in the header. */
const GAP_MIN = 0.09;
const RATIO_BAND = [0.82, 1.18];
const TABLE_DIGEST = 'd5063861f76d487c54b80e7f8c686b6cfad79b4a3b8765791bad651cf00d2e71';
function fleet(e, label) {
  const t0 = Date.now();
  const out = [];
  for (const [ci, [club, year]] of [...CASES, ...CHAMPIONSHIP].entries()) {
    for (let i = 0; i < PER; i++) {
      const seed = 50000 + ci * 1009 + i + OFFSET * 1000003;
      const r = forcedSeason(e, club, year, seed);
      out.push({ club, year, seed, r });
    }
  }
  console.log(`  ${label}: ${out.length} forced seasons, ${out.filter(x => x.r).length} played (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  return out;
}
let failures = 0;
const red = new Set();
let section = 0;
const fail = m => { failures += 1; red.add(section); console.error('  FAIL: ' + m); };
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const RECORDED = JSON.parse(read('scripts/data/domesticCupSources.json'));
/* The recorded window for an association and season, read from the sources
   file, not from cupFor: the controls edit the module, never this file. */
function recorded(assoc, year) {
  const a = RECORDED.associations[assoc];
  if (!a || year < a.windows[0].from) return { kind: 'UNKNOWN' };
  return a.windows.find(w => year >= w.from && (w.to === undefined || year <= w.to)) ?? a.windows[a.windows.length - 1];
}
const assocOf = name => { const c = clubs.find(x => x.name === name); return c ? cup.cupAssociation(c.country, c.league) : null; };

console.log('running the fleet through MAIN, B (no run) and A (the round taken out)');
const RUN_MAIN = fleet(engine, 'MAIN');
const RUN_B = fleet(B.engine, 'B');
const RUN_A = fleet(A.engine, 'A');

const unplayed = {};
for (const x of RUN_MAIN) if (!x.r) unplayed[`${x.club} ${x.year}`] = (unplayed[`${x.club} ${x.year}`] || 0) + 1;
for (const [k, n] of Object.entries(unplayed)) if (n > PER / 2) { console.error(`  ${k}: only ${PER - n} of ${PER} forced seasons played, so that case measures nothing`); failures += 1; red.add(0); }

section = 1;
console.log('1) the run draws from its own generator: MAIN and B draw Math.random alike, and only cupRun differs');
{
  let compared = 0, withRun = 0, callDiff = 0, rowDiff = 0;
  const strip = row => { const { cupRun, ...rest } = row; return JSON.stringify(rest); };
  for (let i = 0; i < RUN_MAIN.length; i++) {
    const m = RUN_MAIN[i].r, b = RUN_B[i].r;
    if (!m || !b) { if (!!m !== !!b) rowDiff += 1; continue; }
    compared += 1;
    if (m.row.cupRun) withRun += 1;
    if (m.calls !== b.calls) callDiff += 1;
    if (strip(m.row) !== strip(b.row) || JSON.stringify(m.events) !== JSON.stringify(b.events)) rowDiff += 1;
    if (b.row.cupRun) rowDiff += 1;
  }
  console.log(`  ${compared} seasons compared, ${withRun} with a run; Math.random counts differ in ${callDiff}, rows or events differ in ${rowDiff}`);
  if (compared < 1200 || withRun < 900) fail(`too few seasons to say anything (${compared}, ${withRun} with a run)`);
  if (callDiff > 0) fail(`${callDiff} seasons drew Math.random a different number of times with the run on`);
  if (rowDiff > 0) fail(`${rowDiff} seasons differ beyond cupRun with the run on`);
}

section = 2;
console.log("2) every season is coherent with itself, the table and the phone's world");
{
  const n = { seasons: 0, runs: 0, won: 0, none: 0, noneWorld: 0, lostFinalWorld: 0, champWon: 0, pens: 0, twoLegs: 0, named: 0, unnamed: 0, noRun: 0, worldWon: 0, mlsWorlds: 0 };
  const bad = {};
  const flag = (k, m) => { bad[k] = (bad[k] || 0) + 1; if (bad[k] <= 3) console.error(`    ${k}: ${m}`); };
  for (const x of RUN_MAIN) {
    const r = x.r;
    if (!r) continue;
    const row = r.row;
    n.seasons += 1;
    const assoc = cup.cupAssociation(r.country, r.league);
    const rec = recorded(assoc, row.year);
    const wl = cup.worldLeagueOf(assoc);
    const winner = wl && r.world && r.world.year === row.year ? r.world.cups[wl] : undefined;
    if (r.world && r.world.year === row.year && r.world.cups.MLS !== undefined) {
      n.mlsWorlds += 1;
      if (assocOf(r.world.cups.MLS) === 'Canada') flag('canadian', `${r.world.cups.MLS} won the U.S. Open Cup in ${row.year}`);
    }
    const severe = !!(row.injury && row.injurySevere);
    if (row.cupRun && !cup.readCupRun(row)) flag('unreadable', `${x.club} ${row.year} carries a run its own reader refuses`);
    const run = cup.readCupRun(row);
    if (rec.kind === 'NONE') {
      n.none += 1;
      if (row.domesticCup) flag('nonecup', `${x.club} ${row.year} won a cup in a season with none`);
      if (row.cupRun) flag('nonerun', `${x.club} ${row.year} has a run in a season with no cup`);
      if (wl && r.world && r.world.year === row.year) { n.noneWorld += 1; if (winner !== undefined) flag('noneworld', `the world crowned ${winner} in ${assoc} ${row.year}`); }
      continue;
    }
    if (severe) { if (row.cupRun) flag('injuryrun', `${x.club} ${row.year} has a run on a season cut short`); continue; }
    if (row.domesticCup && winner !== undefined) { n.worldWon += 1; if (winner !== row.club) flag('worldwin', `${row.club} won the cup in ${row.year} but the world says ${winner}`); }
    if (row.domesticCup && r.league === 'Championship') n.champWon += 1;
    if (!row.domesticCup && winner === row.club) flag('worldmine', `the world gave ${row.club} a cup he did not win in ${row.year}`);
    if (row.domesticCup) {
      const want = `🏆 Won the ${rec.kind === 'NAMED' ? rec.name : 'Domestic Cup'} with ${row.club}!`;
      if (!r.events.includes(want)) flag('event', `${x.club} ${row.year} has no line "${want}"`);
    }
    const pool = cup.cupOpponentPool(assoc, row.year, row.club, clubs).filter(c => c.name !== winner);
    if (!run) {
      n.noRun += 1;
      const owed = rec.kind === 'NAMED' ? pool.length >= 1 : pool.length >= 3;
      if (owed) flag('missing', `${x.club} ${row.year} (${rec.kind}, ${pool.length} other clubs) has no run`);
      continue;
    }
    n.runs += 1;
    if (run.cup !== (rec.kind === 'NAMED' ? rec.name : undefined)) flag('name', `${x.club} ${row.year} names "${run.cup}" where the table records ${rec.kind} ${rec.name ?? ''}`);
    if (run.cup) n.named += 1; else n.unnamed += 1;
    const end = run.stages[run.stages.length - 1];
    const won = end.stage === 'F' && end.won;
    if (won !== row.domesticCup) flag('won', `${x.club} ${row.year} run and cup flag disagree`);
    if (won) n.won += 1;
    const opps = run.stages.filter(t => t.opp).map(t => t.opp);
    if (new Set(opps).size !== opps.length) flag('distinct', `${x.club} ${row.year} meets ${opps.join(', ')}`);
    for (const t of run.stages) {
      if (!t.opp) continue;
      if (t.opp === row.club) flag('self', `${x.club} ${row.year} drew itself`);
      const lostFinal = t.stage === 'F' && !t.won;
      if (!(lostFinal && t.opp === winner) && assocOf(t.opp) !== assoc) flag('country', `${x.club} (${assoc}) ${row.year} met ${t.opp} (${assocOf(t.opp)})`);
      if (t.won && winner !== undefined && t.opp === winner) flag('beatwinner', `${x.club} ${row.year} beat ${t.opp}, the world's winner`);
      if (lostFinal && winner !== undefined) { n.lostFinalWorld += 1; if (t.opp !== winner) flag('lostfinal', `${x.club} ${row.year} lost the final to ${t.opp}, the world says ${winner} won it`); }
    }
    const reachedF = end.stage === 'F';
    const wantFinal = reachedF && rec.kind === 'NAMED' && !!rec.legs;
    if (!!run.final !== wantFinal) flag('final', `${x.club} ${row.year} final score ${run.final ? 'present' : 'absent'} where the table says ${rec.legs ?? 'no'} legs`);
    if (run.final) {
      if (run.final.legs !== rec.legs) flag('legs', `${x.club} ${row.year} final over ${run.final.legs} legs, recorded ${rec.legs}`);
      if (run.final.legs === 2) n.twoLegs += 1;
      if (run.final.pens) { n.pens += 1; if (rec.decider !== 'pens') flag('pens', `${x.club} ${row.year} penalties where the decider is ${rec.decider ?? 'unrecorded'}`); }
      if (run.final.for === run.final.against && !run.final.pens) flag('level', `${x.club} ${row.year} a level final with no decider`);
      if (run.final.scored && row.goals === 0) flag('scored', `${x.club} ${row.year} scored in the final with no goals all season`);
    }
  }
  console.log(`  ${JSON.stringify(n)}`);
  const total = Object.values(bad).reduce((a, b) => a + b, 0);
  if (total > 0) fail(`${total} incoherent seasons: ${JSON.stringify(bad)}`);
  if (n.runs < 900 || n.won < 150 || n.none < 140 || n.noneWorld < 55 || n.lostFinalWorld < 60 || n.champWon < 10 || n.pens < 35 || n.twoLegs < 20 || n.unnamed < 75 || n.mlsWorlds < 1000 || n.worldWon < 130) {
    fail(`a check above ran on too few seasons to mean anything: ${JSON.stringify(n)}`);
  }
}

section = 3;
console.log('3) the same coin as before the round outside a season with no cup, and runs shaped by the odds');
{
  let same = 0, differ = 0, noneA = 0, noneMain = 0, noneSeasons = 0;
  for (let i = 0; i < RUN_MAIN.length; i++) {
    const m = RUN_MAIN[i].r, a = RUN_A[i].r;
    if (!m || !a) continue;
    const rec = recorded(cup.cupAssociation(m.country, m.league), m.row.year);
    if (rec.kind === 'NONE') { noneSeasons += 1; if (a.row.domesticCup) noneA += 1; if (m.row.domesticCup) noneMain += 1; continue; }
    if (m.row.domesticCup === a.row.domesticCup) same += 1; else differ += 1;
  }
  console.log(`  forced seasons with a cup: ${same} win or lose exactly as before the round, ${differ} differ`);
  console.log(`  seasons with no cup: ${noneSeasons}; cups won there before the round ${noneA}, now ${noneMain}`);
  if (same < 1000) fail(`only ${same} seasons compared`);
  if (differ > 0) fail(`${differ} seasons won or lost a cup differently from the coin before the round`);
  if (noneA < 20) fail(`before the round only ${noneA} cups were won in a season with none, too few to show the fix`);
  if (noneMain > 0) fail(`${noneMain} cups are still won in a season with no cup`);
}

/* Careers held at one club of an association with no NONE window, several
   seasons long, through MAIN and A: the same seeds must win exactly the same
   cups, and every row but its run must match, so neither the run nor the
   world's new rule moves a later season. */
const NONE_ASSOCS = new Set(Object.entries(RECORDED.associations).filter(([, v]) => v.windows.some(w => w.kind === 'NONE')).map(([k]) => k));
function pinnedCareer(e, club, year, seed, seasons) {
  const realRandom = Math.random;
  Math.random = seeded(seed * 7919 + 13);
  let s;
  try { s = e.initCareer(`Pin ${seed}`, 'England', POSITIONS[seed % POSITIONS.length], '2020-24', stats(70), 70, 2020, clubs, null, 82); } finally { Math.random = realRandom; }
  s = walk(e, seed * 31 + 5, s, x => x.phase === 'playing' && playing(x).length === 0);
  if (s.phase !== 'playing') return null;
  const shift = year - ((s.seasons[s.seasons.length - 1]?.year ?? 2020) + 1);
  const adj = eras.adjustClubsForYear(clubs, year).find(c => c.name === club);
  if (!adj) return null;
  s = { ...s, seasons: s.seasons.map(r => ({ ...r, year: r.year + shift })), currentClub: club, currentClubTier: adj.tier, currentLeague: adj.league, currentClubCountry: adj.country };
  s = walk(e, seed * 31 + 7, s, x => playing(x).length >= seasons, 400);
  return playing(s);
}
const PINS = [['Arsenal', 2010], ['Real Madrid', 2008], ['Juventus', 2000], ['Bayern Munich', 2012], ['Porto', 2005], ['Celtic', 2012], ['Galatasaray', 2005], ['Olympiacos', 2010]];
const PIN_PER = Number(process.env.CUP_PIN_PER || 12);
{
  section = 3;
  let careers = 0, held = 0, rowsCompared = 0, cupsMain = 0, cupsA = 0, careersDiffer = 0;
  const strip = row => { const { cupRun, ...rest } = row; return JSON.stringify(rest); };
  for (const [pi, [club, year]] of PINS.entries()) for (let i = 0; i < PIN_PER; i++) {
    const seed = 90000 + pi * 997 + i + OFFSET * 1000003;
    const m = pinnedCareer(engine, club, year, seed, 6), a = pinnedCareer(A.engine, club, year, seed, 6);
    if (!m || !a) continue;
    careers += 1;
    if (m.some(r => NONE_ASSOCS.has(assocOf(r.club))) || a.some(r => NONE_ASSOCS.has(assocOf(r.club)))) continue;
    held += 1;
    rowsCompared += m.length;
    cupsMain += m.filter(r => r.domesticCup).length;
    cupsA += a.filter(r => r.domesticCup).length;
    if (m.length !== a.length || m.some((r, j) => strip(r) !== strip(a[j]))) { careersDiffer += 1; if (careersDiffer <= 3) console.error(`    ${club} ${year} seed ${seed} moved`); }
  }
  console.log(`  held careers: ${held} of ${careers} stayed in associations with no NONE window, ${rowsCompared} seasons, cups ${cupsMain} now and ${cupsA} before the round, ${careersDiffer} careers moved`);
  if (held < PINS.length * PIN_PER / 2 || cupsA < 60) fail(`too few held careers or cups (${held}, ${cupsA})`);
  if (careersDiffer > 0 || cupsMain !== cupsA) fail(`${careersDiffer} held careers moved and cups went from ${cupsA} to ${cupsMain}`);
}

/* The run's shape. Each tie is won with p = chance^(1/k), so a lost run ends
   in the early rounds with share (1 - p) / (1 - p^k): about a third for the
   elite and over half below tier 2. And the finals reached should be the
   model's own expectation, p^(k-1) summed over the runs: a uniform exit stage
   (flatrounds) sends far more weak clubs to finals than their odds allow. */
{
  section = 3;
  const band = row => league.eliteInYear(engine.ELITE_CLUBS, row.club, row.year) ? 'elite' : row.clubTier <= 1 ? 't1' : row.clubTier === 2 ? 't2' : 't3+';
  const B4 = { elite: { lost: 0, early: 0, runs: 0, finals: 0, expect: 0 }, t1: { lost: 0, early: 0, runs: 0, finals: 0, expect: 0 }, t2: { lost: 0, early: 0, runs: 0, finals: 0, expect: 0 }, 't3+': { lost: 0, early: 0, runs: 0, finals: 0, expect: 0 } };
  for (const x of RUN_MAIN) {
    const r = x.r;
    const run = r && cup.readCupRun(r.row);
    if (!run) continue;
    const row = r.row;
    const assoc = cup.cupAssociation(r.country, r.league);
    const wl = cup.worldLeagueOf(assoc);
    const winner = wl && r.world && r.world.year === row.year ? r.world.cups[wl] : undefined;
    const others = cup.cupOpponentPool(assoc, row.year, row.club, clubs).filter(c => c.name !== winner).length;
    const k = 1 + Math.min(3, others);
    const chance = cup.cupChanceFor({ elite: league.eliteInYear(engine.ELITE_CLUBS, row.club, row.year), tier: row.clubTier, performanceBoost: cup.seasonPerformanceBoost(row.ovr, row.rating) });
    const p = Math.pow(chance, 1 / k);
    const b = B4[band(row)];
    b.runs += 1;
    b.expect += Math.pow(p, k - 1);
    const end = run.stages[run.stages.length - 1];
    if (end.stage === 'F') b.finals += 1;
    if (!end.won) { b.lost += 1; if (end.stage === 'early') b.early += 1; }
  }
  const share = b => b.lost ? b.early / b.lost : NaN;
  for (const [k, b] of Object.entries(B4)) console.log(`  ${k}: ${b.runs} runs, ${b.lost} lost, early exit share ${share(b).toFixed(3)}, finals ${b.finals} against ${b.expect.toFixed(1)} expected (${(b.finals / b.expect).toFixed(3)})`);
  const all = Object.values(B4).reduce((a, b) => ({ finals: a.finals + b.finals, expect: a.expect + b.expect }), { finals: 0, expect: 0 });
  const ratio = all.finals / all.expect;
  console.log(`  finals reached ${all.finals}, expected ${all.expect.toFixed(1)}, ratio ${ratio.toFixed(3)}`);
  const gap = share(B4['t3+']) - share(B4.elite);
  console.log(`  early exit share, tier 3 and below minus the elite: ${gap.toFixed(3)}`);
  if (B4.elite.lost < 50 || B4['t3+'].lost < 300) fail('too few lost runs at the ends of the ladder');
  if (!(gap >= GAP_MIN)) fail(`the early exit share does not fall with strength (gap ${gap.toFixed(3)}, need ${GAP_MIN})`);
  if (!(ratio >= RATIO_BAND[0] && ratio <= RATIO_BAND[1])) fail(`finals reached ${ratio.toFixed(3)} of the model's expectation, band ${RATIO_BAND.join(' to ')}`);
}

section = 4;
console.log('4) the table, its recorded copy and sources, the checker corrections, and Club Manager');
{
  const table = cup.DOMESTIC_CUPS;
  const digest = sha(JSON.stringify(table));
  console.log(`  table digest ${digest.slice(0, 16)}, ${Object.keys(table).length} associations, ${Object.values(table).reduce((a, w) => a + w.length, 0)} windows`);
  if (digest !== TABLE_DIGEST) fail(`the table moved (digest ${digest.slice(0, 16)}, pinned ${TABLE_DIGEST.slice(0, 16)}): re-record only with its sources`);
  const keys = new Set([...Object.keys(table), ...Object.keys(RECORDED.associations)]);
  let windows = 0, sourced = 0;
  const KEYS = ['from', 'to', 'kind', 'name', 'legs', 'decider'];
  for (const assoc of keys) {
    const t = table[assoc] || [], r = (RECORDED.associations[assoc] || {}).windows || [];
    if (t.length !== r.length) { fail(`${assoc}: ${t.length} windows in the table, ${r.length} recorded`); continue; }
    t.forEach((w, i) => {
      windows += 1;
      for (const k of KEYS) if ((w[k] ?? null) !== (r[i][k] ?? null)) fail(`${assoc} window ${i}: ${k} is ${w[k]} in the table and ${r[i][k]} recorded`);
      if (w.kind === 'UNKNOWN') { if (!w.why) fail(`${assoc} ${w.from}: UNKNOWN with no reason`); return; }
      const facts = r[i].facts || [];
      const hosts = new Set(facts.flatMap(f => (f.sources || []).map(s => String(s.host || '').replace(/^www\./, ''))));
      const wiki = [...hosts].filter(h => /wikipedia/i.test(h));
      const undated = facts.flatMap(f => f.sources || []).filter(s => !/^\d{4}-\d{2}-\d{2}$/.test(s.read || '') || !/^https?:\/\//.test(s.url || ''));
      if (facts.length === 0 || facts.some(f => f.verified !== true)) fail(`${assoc} ${w.from}: a ${w.kind} window rests on an unverified fact`);
      else if (hosts.size - wiki.length < 2 || wiki.length) fail(`${assoc} ${w.from}: ${hosts.size} hosts (${wiki.length} Wikipedia), two others needed`);
      else if (undated.length) fail(`${assoc} ${w.from}: ${undated.length} sources without a URL or read date`);
      else sourced += 1;
    });
  }
  const named = Object.values(table).flat().filter(w => w.kind !== 'UNKNOWN').length;
  console.log(`  ${windows} windows match the recorded copy; ${sourced} of ${named} NAMED and NONE windows carry two sourced, dated facts`);
  for (const [country, league, want] of [['Wales', 'Championship', 'England'], ['Monaco', 'Ligue 1', 'France'], ['Wales', 'Cymru Premier', 'Wales'], ['England', 'Premier League', 'England']]) {
    if (cup.cupAssociation(country, league) !== want) fail(`a ${country} club in ${league} plays the cup of ${cup.cupAssociation(country, league)}, not ${want}`);
  }
  for (const [c, v] of Object.entries(RECORDED.crossBorder)) {
    const hosts = new Set(v.facts.flatMap(f => f.sources.map(s => s.host.replace(/^www\./, ''))));
    if (v.facts.some(f => !f.verified) || hosts.size < 2) fail(`the ${c} cross border rule is not two sourced`);
  }
  const corr = RECORDED.corrections || [];
  if (corr.length !== 19 || corr.some(c => !c.applied || c.applied === 'MISSING')) fail(`${corr.length} checker corrections recorded, ${corr.filter(c => !c.applied || c.applied === 'MISSING').length} without how they were applied`);
  /* Club Manager's cup names, read from its code with comments stripped (a
     guard that reads source reads the code, not the prose about it). */
  const code = stripComments(read('src/lib/clubManager.ts'));
  const FLAG = { 'Türkiye': 'Turkey' };
  let pairs = 0, skipped = 0;
  for (const m of code.matchAll(/nationId: '([a-z]*)', flag: '([^']*)', cup: ('[^']*'|"[^"]*"|null)/g)) {
    const assoc = FLAG[m[2]] ?? m[2];
    if (!table[assoc]) continue;
    const cm = m[3] === 'null' ? null : m[3].slice(1, -1);
    const latest = cup.cupFor(assoc, 2100);
    if (latest.kind === 'UNKNOWN') { skipped += 1; continue; }
    pairs += 1;
    const want = latest.kind === 'NAMED' ? latest.name : null;
    if (cm !== want) fail(`Club Manager calls ${assoc}'s cup ${cm}, the table's latest window says ${want}`);
  }
  console.log(`  Club Manager: ${pairs} league rows agree with the table's latest window, ${skipped} where the table is UNKNOWN today`);
  if (pairs < 30) fail(`only ${pairs} Club Manager rows read, the pattern no longer matches its code`);
}

section = 5;
console.log('5) the summary lines render for a new row, and a row from before the round renders nothing new');
{
  const rows = RUN_MAIN.map(x => x.r && x.r.row).filter(Boolean);
  const wonNamed = rows.find(r => r.domesticCup && r.cupRun && r.cupRun.cup && r.cupRun.final);
  const exit = rows.find(r => r.cupRun && !r.domesticCup && r.cupRun.stages.length >= 3);
  const unnamedWin = rows.find(r => r.domesticCup && r.cupRun && !r.cupRun.cup);
  if (!wonNamed || !exit || !unnamedWin) fail('no won named run, no exit past the early rounds or no won unnamed run to render');
  else {
    const win = render(ui.SeasonCupWinBlock, { season: wonNamed });
    const out = render(ui.SeasonCupExitLine, { season: exit });
    const anon = render(ui.SeasonCupWinBlock, { season: unnamedWin });
    console.log(`  won: ${win.replace(/<[^>]+>/g, ' | ').replace(/( \| )+/g, ' | ').slice(0, 220)}`);
    console.log(`  exit: ${out.replace(/<[^>]+>/g, '').slice(0, 160)}`);
    if (!win.includes(`${wonNamed.cupRun.cup} winners`) || !win.includes('Final: beat ')) fail('the won run does not print its cup and its final');
    if (!/knocked out by|lost the final to|early rounds/.test(out)) fail('the exit line does not say how the run ended');
    if (!anon.includes('Domestic cup winners')) fail('an unnamed run is not printed in the old words');
    if (/<button/i.test(win + out + anon)) fail('the cup lines carry a button');
    if (/[\u2013\u2014]/.test(win + out + anon)) fail('a dash in the cup lines');
    if (cup.cupChipLabel(wonNamed) !== wonNamed.cupRun.cup) fail('the trophy chip does not name the cup');
  }
  const legacy = { year: 2010, club: 'Arsenal', domesticCup: true, type: 'playing' };
  const legacyLost = { year: 2011, club: 'Arsenal', domesticCup: false, type: 'playing' };
  for (const r of [legacy, legacyLost]) {
    if (render(ui.SeasonCupWinBlock, { season: r }) !== '' || render(ui.SeasonCupExitLine, { season: r }) !== '') fail('a row from before the round renders a cup line');
  }
  if (cup.cupChipLabel(legacy) !== 'Cup') fail('a row from before the round lost its "Cup" chip');
  if (wonNamed) {
    const same = { ...wonNamed };
    if (cup.cupCabinetLabel([wonNamed, same]) !== wonNamed.cupRun.cup) fail('the cabinet does not name a cup won every time');
    if (cup.cupCabinetLabel([wonNamed, legacy]) !== 'Cups') fail('the cabinet names a cup next to an unnamed old one');
    const broken = { ...wonNamed, cupRun: { ...wonNamed.cupRun, stages: [...wonNamed.cupRun.stages].reverse() } };
    const flipped = { ...wonNamed, domesticCup: false };
    if (cup.readCupRun(broken) || cup.readCupRun(flipped)) fail('a hand edited run is read as good');
    if (render(ui.SeasonCupWinBlock, { season: broken }) !== '') fail('a hand edited run renders');
    /* on load, repairCareer drops the bad run, keeps the good one and leaves
       a row from before the round exactly as it was */
    const rr = Math.random;
    Math.random = seeded(4242);
    let base;
    try { base = engine.initCareer('Repair', 'England', 'ST', '2020-24', stats(70), 70, 2020, clubs, null, 82); } finally { Math.random = rr; }
    const fixed = engine.repairCareer({ ...base, seasons: [wonNamed, broken, legacy] }).seasons;
    if (!fixed[0].cupRun || fixed[1].cupRun !== undefined || JSON.stringify(fixed[2]) !== JSON.stringify(legacy)) fail('loading a save does not drop a bad run and keep the rest');
  }
  if (cup.cupCabinetLabel([legacy]) !== 'Cups' || cup.cupCabinetLabel([]) !== 'Cups') fail('the cabinet label moved for old saves');
}

console.log(failures === 0
  ? `\nsimCareerDomesticCup: all sections green${CONTROL ? ` (control ${CONTROL} did NOT fire)` : ''}`
  : `\nsimCareerDomesticCup: ${failures} failures in sections ${[...red].sort().join(', ')}`);
if (CONTROL) {
  const want = CONTROLS[CONTROL];
  const fired = want.every(s => red.has(s));
  console.log(fired ? `control ${CONTROL} fired: sections ${want.join(' and ')} red, as it must` : `control ${CONTROL} did not turn every section it must red (red: ${[...red].join(', ') || 'none'})`);
  process.exit(fired ? 1 : 3);
}
process.exit(failures === 0 ? 0 : 1);
