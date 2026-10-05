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
      the 2003 Brasileirao boundary, a dormant pair) say what they should, and
      no meeting names a club outside the league or not founded yet.
   4. record consistency (exact): derby goals are a subset of the season's,
      played meetings fit in the league apps, a keeper never scores one, the
      winner flag only on a won meeting he scored in, Derby Hero is derived and
      never stored, and the resolution is deterministic.
   5. stream neutrality (exact): bundle A (no derbies at all) and bundle B
      (derbies resolved, swing off) run the same 16 digest careers; with the
      derbies and story keys out the digests are equal, and B really played
      derby seasons.
   6. effect bands (measured): the per season swing equals its clamp exactly;
      the win share climbs at every rung of the strength ladder; the draw share
      sits near the model's; Derby Hero rate is ordered by position group with
      keepers at zero; and the swing on versus off moves final popularity,
      sponsorship, money and the morale gated life events by a bounded amount.
   7. old saves and UI (exact): a save without derbies loads and plays on; the
      reader returns nothing for garbage; the components render nothing for an
      old season and the W-D-L for a derby season; no button in the derby UI.
   8. copy (exact): the three reworded texts no longer claim a derby; no dash
      in a derby log or fan line; fan lines pass simCareerParity's rule.

   BANDS: see the BANDS block below, measured over seed offsets 0 to 3.

   Negative controls (SIM_DERBY_CONTROL; each asserts its anchor appears exactly
   once first and exits 2 if not, exits 1 when its sections went red, 2 when
   they did not):
   nodetect  seasonDerbies returns nothing. Sections 3 and 6 go red.
   cadence1  derbyMeetings returns 1. Section 3 goes red.
   noalias   the alias map is ignored. Section 3 goes red (Man City, Sao Paulo).
   stream    resolveSeasonDerbies makes one Math.random call. Section 5 red.
   uncapped  the popularity clamp is gone and a win is worth 10. Section 6 red.

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
const CONTROLS = { nodetect: [3, 6], cadence1: [3], noalias: [3], stream: [5], uncapped: [6] };
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
function edit(src, anchor, replacement, why) {
  const n = src.split(anchor).length - 1;
  if (n !== 1) { console.error(`${why}: the anchor appears ${n} times in soccerCareerDerby.ts, refusing to run a dead edit`); process.exit(2); }
  return src.replace(anchor, replacement);
}
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
let bDerby = NO_SWING(DERBY_SRC);
if (CONTROL === 'stream') bDerby = edit(bDerby, 'const world = adjustClubsForYear(input.clubs, input.year);', 'Math.random(); const world = adjustClubsForYear(input.clubs, input.year);', CONTROL);
const aDerby = NO_DETECT(NO_SWING(DERBY_SRC));
if (CONTROL) console.log(`NEGATIVE CONTROL ON: ${CONTROL}, sections ${CONTROLS[CONTROL].join(' and ')} must go red`);

/* Three bundles. MAIN is the round as it ships (or with the control's edit);
   B resolves derbies with the swing off; A has no derbies at all. The edit is
   served to esbuild in place of the file, so nothing on disk changes. */
async function bundle(name, derbySrc, withUi) {
  const ENTRY = path.join(WORK, `${name}.entry.mjs`);
  const OUT = path.join(WORK, `${name}.bundle.mjs`);
  fs.writeFileSync(ENTRY, `
export * as engine from '${ROOT_URL}/src/lib/soccerCareerEngine.ts';
export * as derby from '${ROOT_URL}/src/lib/soccerCareerDerby.ts';
export * as eras from '${ROOT_URL}/src/lib/careerEras.ts';
${withUi ? `
export * as data from '${ROOT_URL}/src/data/clubRivalries.ts';
export * as league from '${ROOT_URL}/src/lib/soccerCareerLeague.ts';
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
      b.onLoad({ filter: /soccerCareerDerby\.ts$/ }, args => (path.resolve(args.path).toLowerCase() === key ? { contents: derbySrc, loader: 'ts' } : undefined));
    } }],
  });
  return import(pathToFileURL(OUT).href);
}
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const MAIN = await bundle('main', mainDerby, true);
const A = await bundle('a', aDerby, false);
const B = await bundle('b', bDerby, false);
try { fs.rmSync(WORK, { recursive: true, force: true }); } catch { /* temp only */ }
const { engine, derby, data, league, save, social, cm, ui, render } = MAIN;
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
function runCareer(e, seed, { era = '2020-24', startYear = 2020, proSeasons = 10, ovr = 64, nation = 'England', until = null } = {}) {
  const realRandom = Math.random;
  Math.random = seeded(seed * 7919 + 13);
  try {
    const position = POSITIONS[seed % POSITIONS.length];
    let s = e.initCareer(`Sim ${seed}`, nation, position, era, stats(ovr), ovr, startYear, clubs, null, 82);
    let guard = 0;
    const played = () => (s.seasons || []).filter(r => r.type === 'playing').length;
    while (!s.retired && guard++ < 500 && played() < proSeasons) {
      if (until && until(s)) return s;
      s = step(e, s);
    }
    return s;
  } finally {
    Math.random = realRandom;
  }
}
const leagueOf = name => (clubs.find(c => c.name === name) || {}).league || '';

let failures = 0;
const red = new Set();
let section = 0;
const fail = m => { failures += 1; red.add(section); console.error('  FAIL: ' + m); };
const DASH = /[\u2013\u2014]/;

/* BANDS, measured over seed offsets 0 to 3 (numbers in the comment beside
   each); every floor or ceiling sits at roughly half the measured headroom. */
const BANDS = {
  rungMin: 50, rungStep: 0.02, drawLo: 0.2, drawHi: 0.34, heroStep: 0.01,
  popDiff: 100, moraleDiff: 100, sponsorDiff: 1e9, worthDiff: 1e9, divorceDiff: 1, hofDiff: 100,
  digestDerbySeasons: 70, // 140 derby seasons over the 16 fixed digest careers (deterministic, offset free)
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
     clubs), and again after the move. */
  const RIVALS_HASH = '565e14623c2fe3607eec8864303d001fce77c4308c1a408c6c49114ea9b679d6';
  const BOARD_HASH = '00922bf91f482461d0919cf7a1a9cea427b5d0ce2697a87abfcfa409403bf975';
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
  ['Sao Paulo', 2020, ['Corinthians', 'Palmeiras', 'Santos'], 'three Paulista rivals, through the alias map'],
  ['Corinthians', 2002, [], 'the Brasileirao before 2003 claims nothing'],
  ['Corinthians', 2003, ['Palmeiras', 'Sao Paulo', 'Santos'], 'the first double round robin Brasileirao'],
  ['Newcastle', 2020, [], 'Sunderland is not a Soccer Career club, the pair is dormant'],
  ['Celta Vigo', 2020, [], 'Deportivo is not a Soccer Career club, the pair is dormant'],
  ['PSG', 2019, [], 'Ligue 1 2019/20 was abandoned, held'],
  ['Club America', 2020, ['Chivas', 'Cruz Azul', 'Pumas'], 'the Liga MX clasicos, through the alias map'],
  ['Boca Juniors', 2020, [], 'Argentina has no verified cadence'],
  ['Brighton', 1990, ['Crystal Palace'], 'a First Division season the game labels Premier League'],
];
const forcedRows = [];
section = 3;
console.log('3) the right derbies, the verified number of meetings, and nothing else');
{
  let checked = 0, withDerbies = 0, wrongCount = 0, wrongSet = 0, keyWithout = 0;
  const meetingsCounted = {};
  const check = ({ r }) => {
    const lg = leagueOf(r.club);
    const want = derby.seasonDerbies({ club: r.club, league: lg, year: r.year, clubs });
    const n = derby.derbyMeetings(lg, r.year);
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
    const world = eras.adjustClubsForYear(clubs, r.year);
    for (const d of derby.readSeasonDerbies(r)) {
      const c = world.find(x => x.name === d.rival);
      if (!c || c.league !== leagueOf(r.club)) outside += 1;
    }
  }
  if (outside) fail(`${outside} meetings name a club outside the league or not yet founded`);
}

section = 4;
console.log('4) derby goals are a subset, keepers never score one, Derby Hero is derived and never stored');
{
  let seasonsChecked = 0, overGoals = 0, overApps = 0, gkGoals = 0, badWon = 0, heroMismatch = 0, stored = 0, playedFalseGoals = 0;
  for (const { r, position, state } of [...poolRows, ...forcedRows]) {
    const ds = derby.readSeasonDerbies(r);
    if (!ds.length) continue;
    seasonsChecked += 1;
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
  for (let i = 1; i <= 16; i++) {
    const a = runCareer(A.engine, i);
    const b = runCareer(B.engine, i);
    if (digest(a) === digest(b)) equal += 1;
    derbySeasons += (b.seasons || []).filter(r => r.derbies).length;
    aDerbies += (a.seasons || []).filter(r => r.derbies).length;
  }
  /* Measured on 2026-10-05: see BANDS. */
  console.log(`   ${equal} of 16 digests equal; bundle B played ${derbySeasons} derby seasons, bundle A ${aDerbies}`);
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
  const ELITE = ['Bayern Munich', 'PSG', 'Man City', 'Real Madrid', 'Barcelona', 'Liverpool'];
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
  const grp = {};
  for (const { r, position } of [...poolRows, ...forcedRows, ...ladderRows]) {
    if (!derby.readSeasonDerbies(r).length) continue;
    const g = GROUP[position] || 'mid';
    grp[g] = grp[g] || { n: 0, h: 0 };
    grp[g].n += 1;
    if (derby.isDerbyHeroSeason(r)) grp[g].h += 1;
  }
  const rate = g => (grp[g] && grp[g].n ? grp[g].h / grp[g].n : NaN);
  console.log(`   6d: hero rate ${['att', 'mid', 'def', 'gk'].map(g => `${g} ${rate(g).toFixed(3)} (${grp[g]?.n || 0})`).join(', ')}`);
  if (!(rate('att') - rate('mid') >= BANDS.heroStep && rate('mid') - rate('def') >= BANDS.heroStep / 2 && rate('def') > 0)) fail('6d: hero rate not ordered attackers, midfield, defenders with margin');
  if (!grp.gk || grp.gk.n < 20 || grp.gk.h !== 0) fail(`6d: keepers ${grp.gk?.h ?? '?'} hero seasons out of ${grp.gk?.n ?? 0}, must be 0 out of at least 20`);

  /* 6e: the same pool with the swing off (bundle B). The swing feeds
     popularity (sponsorship, event and dilemma gates) and morale (the life
     events, the money events, the divorce roll, the paper), so every one of
     those moves a little; how much is bounded here. */
  /* Long careers, so the age gated outcomes (the Hall of Fame ballot needs 34)
     and the slow ones (a divorce) actually happen in both runs. */
  const LONG = [];
  for (const nation of NATIONS) for (let i = 0; i < Number(process.env.SIM_DERBY_LONG || 10); i++) LONG.push({ seed: 41000 + NATIONS.indexOf(nation) * 100 + i + OFFSET * 1000003, nation });
  const on = LONG.map(c => runCareer(engine, c.seed, { nation: c.nation, proSeasons: 19, ovr: 72 }));
  const off = LONG.map(c => runCareer(B.engine, c.seed, { nation: c.nation, proSeasons: 19, ovr: 72 }));
  const divorced = xs => xs.filter(x => x.family && x.family.isDivorced).length;
  console.log(`   6e: ${LONG.length} long careers each way, ${divorced(on)} and ${divorced(off)} divorced, ${on.filter(x => /Hall of Fame/.test(JSON.stringify([x.events, x.story]))).length} and ${off.filter(x => /Hall of Fame/.test(JSON.stringify([x.events, x.story]))).length} with a Hall of Fame line`);
  const mean = (xs, f) => xs.reduce((n, x) => n + f(x), 0) / xs.length;
  const hof = x => JSON.stringify([x.events, x.story]).match(/Hall of Fame (speech|dinner)|Inducted into the Hall of Fame/g)?.length || 0;
  const M = [
    ['final popularity', x => x.popularity, BANDS.popDiff],
    ['final morale', x => x.morale, BANDS.moraleDiff],
    ['sponsorship', x => x.sponsorshipIncome || 0, BANDS.sponsorDiff],
    ['net worth', x => x.netWorth || 0, BANDS.worthDiff],
    ['divorced share', x => (x.family && x.family.isDivorced ? 1 : 0), BANDS.divorceDiff],
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
