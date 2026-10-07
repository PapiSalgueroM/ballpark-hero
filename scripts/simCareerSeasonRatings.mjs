/* Round 1011: every Soccer Career season's rating in the career history.

   A player asked to see each season's rating in the history, "since playing as
   CB/CDM etc, goals don't matter as much as overall performance". Every saved
   row already carries its match rating; this round stamps ovr, the overall the
   season was played at, in generateSeasonStats, and src/lib/careerSeasonRatings.ts
   reads both back for the timeline and the Ratings screen.

   This runs the real engine, bundled from source, over seeded careers at every
   position in a 2020 start and a 1990s start, plus a keep playing fleet (Keep
   Playing on every retirement question) and an injury fleet (rehabFragility at
   its cap), and measures:

   1. the stamp is true: every row a step appends with type "playing" and apps
      above 0 has ovr equal to the overall of the state handed to that step,
      100% coverage and 0 mismatches, counted separately for normal, severe
      injury and keep playing rows with a floor on each; and no zero app row
      (ban, prison, conviction, year out), academy row or retired row has one;
   2. the rating reader: readMatchRating gives the stored rating back unchanged
      for every played row and null for every row nobody played, so a 0.0 can
      never be printed; plus synthetic BANNED, BANNED (PED), PRISON, CONVICTED,
      retired and apps 0 rows, so the check has teeth whatever the seeds reach;
   3. the stream did not move, with no frozen baseline: the engine and a copy
      without the stamp run the same 16 seeds side by side, and at every step
      they make the same number of Math.random calls and, once ovr is taken off
      season shaped objects, reach the same state. A later round that moves the
      stream moves both engines, so this never goes stale;
   4. old saves: played careers with ovr deleted everywhere (section 3 is what
      makes that an exact stand in for a save from before this round) pass
      isSoccerCareerSave, come out of repairCareer with their rows unchanged,
      read ovr null and a real rating on every played row, then play 3 more
      seasons: the old rows stay null, the new ones carry ovr, ovrTrackedFrom
      names the first new year, and the series has nulls exactly there; and
      a fresh career, stamped from its first season, gets no "kept from"
      caption (ovrTrackedFrom null, ovrNotYetTracked false);
   5. honest per position stats: only Apps, Goals, Assists and Clean sheets,
      each equal to the row's own field; Clean sheets for GK, CB, LB and RB
      only; a back line row from before Round 667 (unstamped, 0) reads null,
      never 0, and a stamped 0 is printed; and among back line rows with 10 or
      more apps the share with a clean sheet clears a floor.

   Floors, measured on 2026-10-05 over seed offsets 0, 1, 2 and 3 (140
   careers each, 17 seconds a run), each about half the lowest count seen:
   - section 1, played rows: normal 2333 to 2347 (floor 1100), severe injury
     84 to 92 (floor 40), keep playing 63 to 72 (floor 30); every offset 0
     without ovr, 0 wrong, 0 unplayed rows with one.
   - section 2, natural rows stored with rating 0: 140 every offset, all of
     them retired rows (floor 70); the seeds reach no ban, prison or
     conviction, which is why the seven fixtures are there.
   - section 3, 16 of 16 equal, 3181 to 3329 steps (floor 640).
   - section 4, 12 old saves, 36 seasons played on them (floors 12 and 24).
   - section 5, back line rows with 10 or more apps: 721 to 755 (floor 350),
     100.0% of them kept a clean sheet every offset (floor 50%).

   Negative controls, SIM_SEASON_RATINGS_CONTROL (each asserts its anchor is in
   the file exactly once, or refuses to run with exit 2):
   nofield      the engine copy loses `ovr: overall,`           expected red {1, 4}
   aftergrowth  the row is restamped with the grown overall      expected red {1}
   stream       the stamp draws one Math.random                  expected red {3}
   guess        readOvr's caller falls back to 75                expected red {4}
   trackedfrom  ovrTrackedFrom's `first > 0` becomes `>= 0`      expected red {4}
   zerorating   readMatchRating keeps any finite rating          expected red {2}
   tackles      the back line emits a made up Tackles column     expected red {5}
   Exit 1 only when the red set equals the expected set; exit 2 when the anchor
   is missing or doubled, the name is unknown, nothing went red, or the red set
   is any other set.

   Run: node scripts/simCareerSeasonRatings.mjs */
import { build } from 'esbuild';
import crypto from 'node:crypto';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENGINE_FILE = path.join(ROOT, 'src/lib/soccerCareerEngine.ts');
const RATINGS_FILE = path.join(ROOT, 'src/lib/careerSeasonRatings.ts');
const CONTROL = process.env.SIM_SEASON_RATINGS_CONTROL || '';
/* An argument shifts every seed, so the floors can be measured over several draws. */
const SEED0 = Number(process.argv[2] || 0) * 1000003;

const ENGINE_SRC = fs.readFileSync(ENGINE_FILE, 'utf8').replace(/\r\n/g, '\n');
const RATINGS_SRC = fs.readFileSync(RATINGS_FILE, 'utf8').replace(/\r\n/g, '\n');
const STAMP = '    ovr: overall,\n';
const APPEND = '  s.seasons = [...s.seasons, season];\n';
const CONTROLS = {
  nofield: { file: 'engine', from: STAMP, to: '', red: [1, 4] },
  aftergrowth: { file: 'engine', from: APPEND, to: '  season.ovr = s.overall;\n' + APPEND, red: [1] },
  stream: { file: 'engine', from: STAMP, to: '    ovr: overall + 0 * Math.random(),\n', red: [3] },
  guess: { file: 'ratings', from: 'ovr: readOvr(row.ovr),', to: 'ovr: readOvr(row.ovr) ?? 75,', red: [4] },
  trackedfrom: { file: 'ratings', from: 'return first > 0 ? played[first].year : null;', to: 'return first >= 0 ? played[first].year : null;', red: [4] },
  zerorating: {
    file: 'ratings',
    from: 'return row.type === "playing" && (row.apps ?? 0) > 0 && Number.isFinite(row.rating) && row.rating >= 3 && row.rating <= 10 ? row.rating : null;',
    to: 'return Number.isFinite(row.rating) ? row.rating : null;',
    red: [2],
  },
  tackles: {
    file: 'ratings',
    from: 'if (BACK_LINE.includes(position)) return [apps, ',
    to: 'if (BACK_LINE.includes(position)) return [apps, { label: "Tackles", short: "T", value: (row.apps ?? 0) * 3 }, ',
    red: [5],
  },
};
/* Floors, about half the lowest count measured (see the header). */
const FLOOR = { normal: 1100, injury: 40, keep: 30, unplayed: 70, backLine: 350, cleanShare: 0.5 };
const count = (hay, needle) => hay.split(needle).length - 1;
function swap(src, from, to, label) {
  const n = count(src, from);
  if (n !== 1) { console.error(`  ${label}: the anchor is in the file ${n} times, it must be exactly once; refusing to run a dead control`); process.exit(2); }
  return src.replace(from, () => to);
}
if (CONTROL && !CONTROLS[CONTROL]) { console.error(`unknown control ${CONTROL} (known: ${Object.keys(CONTROLS).join(', ')})`); process.exit(2); }
/* the stamp itself must be there, or section 3 compares the engine with itself */
const BASE_SRC = swap(ENGINE_SRC, STAMP, '', 'the stamp');
let CUR_ENGINE = ENGINE_SRC;
let CUR_RATINGS = RATINGS_SRC;
if (CONTROL) {
  const c = CONTROLS[CONTROL];
  if (c.file === 'engine') CUR_ENGINE = swap(ENGINE_SRC, c.from, c.to, `control ${CONTROL}`);
  else CUR_RATINGS = swap(RATINGS_SRC, c.from, c.to, `control ${CONTROL}`);
  console.log(`CONTROL ${CONTROL}: expected red set {${c.red.join(', ')}}`);
}

/* Two bundles from source, the way simCareerKeepPlaying builds its two
   engines: CUR is the tree (or the control's copy of it), BASE is the same
   engine without the stamp, for section 3. The entry stubs localStorage
   because the engine's import chain reaches the Supabase client module, which
   reads it as it loads. Nothing here fetches anything. */
const TMP = fs.mkdtempSync(path.join(process.env.TEMP || process.env.TMP || os.tmpdir(), 'sc-seasonratings-'));
const fwd = p => p.replaceAll('\\', '/');
async function bundle(name, engineSrc, ratingsSrc) {
  const entry = path.join(TMP, `${name}-entry.mjs`);
  const out = path.join(TMP, `${name}.mjs`);
  fs.writeFileSync(entry, [
    "globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };",
    `export * from '${fwd(ENGINE_FILE)}';`,
    `export * as R from '${fwd(RATINGS_FILE)}';`,
    `export { isSoccerCareerSave } from '${fwd(path.join(ROOT, 'src/lib/soccerCareerSave.ts'))}';`,
  ].join('\n'));
  await build({
    entryPoints: [entry], bundle: true, format: 'esm', platform: 'node',
    outfile: out, logLevel: 'error', alias: { '@': path.join(ROOT, 'src') },
    plugins: [{
      name: 'swap-sources',
      setup(b) {
        b.onLoad({ filter: /[\\/]src[\\/]lib[\\/]soccerCareerEngine\.ts$/ }, () => ({ contents: engineSrc, loader: 'ts', resolveDir: path.join(ROOT, 'src/lib') }));
        b.onLoad({ filter: /[\\/]src[\\/]lib[\\/]careerSeasonRatings\.ts$/ }, () => ({ contents: ratingsSrc, loader: 'ts', resolveDir: path.join(ROOT, 'src/lib') }));
      },
    }],
  });
  return import(pathToFileURL(out).href);
}
const CUR = await bundle('current', CUR_ENGINE, CUR_RATINGS);
const BASE = await bundle('base', BASE_SRC, RATINGS_SRC);
fs.rmSync(TMP, { recursive: true, force: true });
const R = CUR.R;
const NEED = ['initCareer', 'advanceYouthYear', 'acceptOffer', 'advanceProSeason', 'dismissSummary', 'dismissNewspaper', 'declineRetirementSuggestion', 'acceptRetirementSuggestion', 'repairCareer', 'isSoccerCareerSave'];
for (const k of NEED) if (typeof CUR[k] !== 'function') { console.error(`engine export missing: ${k}, so nothing below measures anything`); process.exit(1); }
for (const k of ['readOvr', 'readMatchRating', 'ratingBand', 'soccerRatingRows', 'careerAverageRating', 'ovrTrackedFrom', 'ovrNotYetTracked', 'ratingSeries']) if (typeof R[k] !== 'function') { console.error(`careerSeasonRatings export missing: ${k}`); process.exit(1); }
const clubs = CUR.FALLBACK_CLUBS;

/* A seeded generator that also counts its calls, and a frozen clock, so the
   two engines can be compared step for step. */
let calls = 0;
function seedRandom(n) {
  let seed = n | 0;
  calls = 0;
  Math.random = () => {
    calls += 1;
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const REAL_RANDOM = Math.random;
Date.now = () => 1790000000000;

const POSITIONS = ['ST', 'CM', 'CB', 'GK', 'LW', 'CAM', 'RB', 'CDM', 'LB', 'RW'];
const stats = v => ({ pace: v, shooting: v, passing: v, dribbling: v, defending: v, physical: v, reflexes: v });

/* simCareerLeagueFinish's full phase switch, with the retirement question
   answered by policy: 'accept' retires, 'decline' plays on (Keep Playing). */
function step(E, s, policy) {
  switch (s.phase) {
    case 'youth': return E.advanceYouthYear(s, clubs);
    case 'contract_offer': { const offers = s.pendingOffers || []; return offers.length ? E.acceptOffer(s, offers[0]) : { ...s, phase: 'playing' }; }
    case 'playing': return E.advanceProSeason(s, clubs);
    case 'newspaper': return E.dismissNewspaper(s);
    case 'season_summary': return E.dismissSummary(s, clubs);
    case 'international_debut': return E.dismissDebut(s, clubs);
    case 'world_cup': return E.dismissWorldCup(s, clubs);
    case 'rehab_choice': return E.applyRehabChoice(s, 1);
    case 'rivalry_event': return E.dismissRivalryEvent(s, clubs);
    case 'ballon_dor': return E.dismissBallonDor(s, clubs);
    case 'bdor_speech': return E.applyBdorSpeech(s, 0);
    case 'wc_speech': return E.applyWorldCupSpeech(s, 0);
    case 'moral_dilemma': return E.dismissMoralDilemma(s, clubs);
    case 'social_media_action': return E.dismissSocialMediaPhase(s, clubs);
    case 'red_card_appeal_result': return E.dismissAppealResult(s, clubs);
    case 'retirement_suggestion': return policy === 'decline' && (s.age ?? 0) < 41 ? E.declineRetirementSuggestion(s, clubs) : E.acceptRetirementSuggestion(s);
    case 'retirement_ceremony': case 'retired': return { ...s, retired: true };
    case 'random_events': {
      const ev = (s.pendingEvents || [])[0];
      if (!ev || !ev.choices || !ev.choices.length) return { ...s, phase: 'playing', pendingEvents: [] };
      return E.applyEventChoice(s, ev.choices.length - 1, clubs);
    }
    case 'contract_expiring': case 'transfer_window': return E.stayAtClub(s);
    default: { const n = E.advanceProSeason(s, clubs); return n.phase === s.phase ? { ...n, retired: true } : n; }
  }
}

/* One seeded career. onStep(prev facts, next) sees every step; `fragile`
   holds rehabFragility at the engine's own cap (0.06) before every season so
   the injury fleet reaches severe injuries often. Stops when retired, at
   `until`, or at the guard. */
function runCareer(E, seed, { era, startYear, position, ovr = 64, policy = 'accept', fragile = false, until = null, onStep = null, from = null }) {
  seedRandom(seed);
  try {
    let s = from ?? E.initCareer(`Rate ${seed}`, 'England', position, era, stats(ovr), ovr, startYear, clubs, null, 82);
    for (let guard = 0; guard < 700 && !s.retired; guard++) {
      if (until && until(s)) break;
      if (fragile && s.phase === 'playing') s = { ...s, rehabFragility: 0.06 };
      const prev = { overall: s.overall, len: (s.seasons || []).length, phase: s.phase };
      const next = step(E, s, policy);
      if (onStep) onStep(prev, next);
      s = next;
    }
    return s;
  } finally {
    Math.random = REAL_RANDOM;
  }
}

let failures = 0;
const red = new Set();
let section = 0;
const fail = m => { failures += 1; red.add(section); if (failures <= 30) console.error('  FAIL: ' + m); };
const floorCheck = (n, floor, what) => { if (n < floor) fail(`${what}: ${n}, under the floor of ${floor}, so this part measured too little to mean anything`); };

/* ── the fleets, all on the current engine ── */
const ERAS = [[2020, '2020-24'], [1990, '1990-94']];
const PER = 4;
const kinds = { normal: 0, injury: 0, keep: 0 };
let mismatches = 0, unstamped = 0, wrongRows = 0;
const firstMismatch = [];
const allRows = [];
const careers = [];
function watch(prev, next) {
  const added = (next.seasons || []).slice(prev.len);
  for (const row of added) {
    allRows.push(row);
    const has = Object.prototype.hasOwnProperty.call(row, 'ovr') && row.ovr !== undefined;
    if (row.type !== 'playing' || row.rating === 0) {
      /* youth, retired, or a row nobody played (ban, prison, conviction, year out) */
      if (has) { wrongRows += 1; if (firstMismatch.length < 3) firstMismatch.push(`${row.type} ${row.club} ${row.year} carries ovr ${row.ovr}`); }
      continue;
    }
    if (!(row.apps > 0)) continue;
    const kind = prev.phase === 'retirement_suggestion' ? 'keep' : (row.injurySevere && next.phase === 'rehab_choice') ? 'injury' : 'normal';
    kinds[kind] += 1;
    if (!has) unstamped += 1;
    else if (row.ovr !== prev.overall) { mismatches += 1; if (firstMismatch.length < 3) firstMismatch.push(`${kind} row ${row.year} ovr ${row.ovr}, played at ${prev.overall}`); }
  }
}
let seedN = 0;
for (const [startYear, era] of ERAS) for (const position of POSITIONS) for (let i = 0; i < PER; i++) {
  const seed = SEED0 + 101 + (seedN++) * 7919;
  careers.push({ position, s: runCareer(CUR, seed, { era, startYear, position, ovr: 60 + (i * 5), onStep: watch }) });
}
for (let i = 0; i < 30; i++) {
  const position = POSITIONS[i % POSITIONS.length];
  careers.push({ position, s: runCareer(CUR, SEED0 + 50021 + i * 7919, { era: '2020-24', startYear: 2020, position, ovr: 66, policy: 'decline', onStep: watch }) });
}
for (let i = 0; i < 30; i++) {
  const position = POSITIONS[i % POSITIONS.length];
  careers.push({ position, s: runCareer(CUR, SEED0 + 90031 + i * 7919, { era: '2020-24', startYear: 2020, position, ovr: 66, fragile: true, onStep: watch }) });
}

section = 1;
console.log('1) the stamp is the overall the season was played at');
const played = kinds.normal + kinds.injury + kinds.keep;
console.log(`   ${careers.length} careers, ${allRows.length} rows appended; played rows: ${kinds.normal} normal, ${kinds.injury} severe injury, ${kinds.keep} keep playing; ${unstamped} without ovr, ${mismatches} with the wrong one; ${wrongRows} unplayed rows carrying one`);
for (const m of firstMismatch) console.log('   e.g. ' + m);
if (unstamped > 0) fail(`${unstamped} of ${played} played rows carry no ovr (coverage must be 100%)`);
if (mismatches > 0) fail(`${mismatches} played rows carry an ovr that is not the overall they were played at`);
if (wrongRows > 0) fail(`${wrongRows} rows nobody played (or academy or retired rows) carry an ovr`);
floorCheck(kinds.normal, FLOOR.normal, 'normal played rows');
floorCheck(kinds.injury, FLOOR.injury, 'severe injury rows');
floorCheck(kinds.keep, FLOOR.keep, 'keep playing rows');

section = 2;
console.log('2) the rating reader: the stored rating for a played season, null for one nobody played');
const yearOut = (club, extra = {}) => ({ year: 2030, age: 30, club, clubCountry: '', clubTier: 99, apps: 0, goals: 0, assists: 0, cleanSheets: 0, yellowCards: 0, redCards: 0, rating: 0, leagueTitle: false, domesticCup: false, championsLeague: false, worldCup: false, ballonDor: false, ballonDorRank: null, type: 'playing', intApps: 0, intGoals: 0, intAssists: 0, intRating: 0, tournament: null, tournamentResult: null, ...extra });
const FIXTURES = [
  ['BANNED', yearOut('BANNED')], ['BANNED (PED)', yearOut('BANNED (PED)')], ['PRISON', yearOut('PRISON')], ['CONVICTED', yearOut('CONVICTED')],
  ['year out, injured', yearOut('Arsenal', { clubCountry: 'England', clubTier: 1, injury: 'ACL tear', injurySevere: true })],
  ['retired', yearOut('Retired', { type: 'retired' })],
  /* the apps gate on its own: a played type row with a real looking rating but no games */
  ['apps 0, rating 6.5', yearOut('Arsenal', { clubCountry: 'England', clubTier: 1, rating: 6.5 })],
];
for (const [label, row] of FIXTURES) {
  const r = R.readMatchRating(row);
  if (r !== null) fail(`fixture "${label}" reads ${r}, it must read null (a season nobody played prints no rating)`);
}
let rated = 0, zeroRows = 0, nulls = 0;
const zeroKinds = {};
for (const row of allRows) {
  const r = R.readMatchRating(row);
  if (row.type === 'playing' && row.apps > 0) {
    rated += 1;
    if (r !== row.rating || !(r >= 3 && r <= 10)) fail(`a played row (${row.year}, ${row.apps} apps) reads ${r}, stored ${row.rating}`);
  } else {
    nulls += 1;
    if (row.rating === 0 && row.type !== 'youth') { zeroRows += 1; const k = row.type === 'retired' ? 'retired' : row.club; zeroKinds[k] = (zeroKinds[k] || 0) + 1; }
    if (r !== null) fail(`a ${row.type} row with ${row.apps} apps (${row.club} ${row.year}, rating ${row.rating}) reads ${r}, it must read null`);
  }
}
console.log(`   ${rated} played rows read their own rating; ${nulls} other rows read null, ${zeroRows} of them stored with rating 0: ${Object.entries(zeroKinds).map(([k, v]) => `${k} ${v}`).join(', ')}; ${FIXTURES.length} fixtures null`);
floorCheck(zeroRows, FLOOR.unplayed, 'natural rows nobody played');
/* the career average is the apps weighted mean of the played seasons only */
for (const { s } of careers) {
  const playedRows = s.seasons.filter(r => r.type === 'playing' && r.apps > 0);
  const games = playedRows.reduce((n, r) => n + r.apps, 0);
  const got = R.careerAverageRating(s.seasons);
  if (games === 0) { if (got !== null) fail('a career with no games has a career average'); continue; }
  const want = Math.round(playedRows.reduce((n, r) => n + r.rating * r.apps, 0) / games * 10) / 10;
  if (!got || got.games !== games || got.rating !== want) { fail(`career average ${JSON.stringify(got)}, expected ${want} over ${games}`); break; }
}
/* the bands sit on the engine's own bars: 6.3 is a strike, 6.8 the boost rung, 7.5 pushCeiling's elite */
for (const [r, band] of [[3, 'poor'], [6.3, 'poor'], [6.4, 'ok'], [6.7, 'ok'], [6.8, 'good'], [7.4, 'good'], [7.5, 'elite'], [10, 'elite']]) {
  if (R.ratingBand(r) !== band) fail(`ratingBand(${r}) is ${R.ratingBand(r)}, expected ${band}`);
}

section = 3;
console.log('3) the stream did not move: the engine and a copy without the stamp, side by side');
/* ovr leaves season shaped objects only (they carry both rating and
   leagueTitle, which also covers pendingSummary); everywhere else it stays in. */
const isSeasonRow = o => o && typeof o === 'object' && 'rating' in o && 'leagueTitle' in o;
/* Release AI note: Round 1041's cup run reads the stamp on purpose (each tie's
   odds use the overall he had that season, season.ovr ?? s.overall), so the
   copy without the stamp draws a different cupRun on rows where growth moved
   s.overall. That run comes from its own keyed generator and never touches the
   main stream (simCareerDomesticCup section 1 proves it: 0 Math.random count
   differences over 2400 seasons), and this section's question is the stream,
   so cupRun on a season row is left out of the digest beside ovr. The call
   counts are still compared at every step. */
const digest = s => crypto.createHash('sha256').update(JSON.stringify(s, function (k, v) { return (k === 'ovr' || k === 'cupRun') && isSeasonRow(this) ? undefined : v; })).digest('hex').slice(0, 16);
function trace(E, seed, policy) {
  const out = [];
  runCareer(E, seed, { era: '2020-24', startYear: 2020, position: POSITIONS[seed % POSITIONS.length], ovr: 64, policy, onStep: (_p, next) => out.push(`${calls}:${digest(next)}`) });
  return out;
}
const DIGEST_SEEDS = 16;
let stepsCompared = 0, careersEqual = 0;
for (let i = 1; i <= DIGEST_SEEDS; i++) {
  const policy = i % 2 ? 'accept' : 'decline';
  const a = trace(CUR, SEED0 + i * 7919 + 13, policy);
  const b = trace(BASE, SEED0 + i * 7919 + 13, policy);
  const n = Math.min(a.length, b.length);
  let at = -1;
  for (let k = 0; k < n; k++) if (a[k] !== b[k]) { at = k; break; }
  stepsCompared += n;
  if (at === -1 && a.length === b.length) careersEqual += 1;
  else fail(`seed ${i}: the two engines part at step ${at === -1 ? n : at} of ${a.length} and ${b.length} (calls:digest ${a[at === -1 ? n : at] || 'end'} against ${b[at === -1 ? n : at] || 'end'})`);
}
console.log(`   ${careersEqual} of ${DIGEST_SEEDS} careers equal at every step, ${stepsCompared} steps compared on Math.random calls and state`);
floorCheck(stepsCompared, DIGEST_SEEDS * 40, 'steps compared');

section = 4;
console.log('4) a save from before this round: real ratings, no invented overall, and the stamp picks up from the next season');
const playedCount = s => (s.seasons || []).filter(r => r.type === 'playing').length;
const stripOvr = s => JSON.parse(JSON.stringify(s, function (k, v) { return k === 'ovr' && isSeasonRow(this) ? undefined : v; }));
const hasOvr = s => JSON.stringify(s.seasons).includes('"ovr"');
let oldSaves = 0, oldRows = 0, newRows = 0, newStamped = 0, freshCareers = 0;
for (let i = 0; i < 12; i++) {
  const position = POSITIONS[i % POSITIONS.length];
  const [startYear, era] = ERAS[i % 2];
  const seed = SEED0 + 70001 + i * 7919;
  const live = runCareer(CUR, seed, { era, startYear, position, ovr: 64, until: s => s.phase === 'playing' && playedCount(s) >= 5 });
  if (live.retired || playedCount(live) < 5) { fail(`old save ${i} never reached 5 played seasons`); continue; }
  /* a career played on this engine has every season stamped, so the Ratings
     screen must carry no "kept from" caption for it */
  const fresh = R.soccerRatingRows(live.seasons, position);
  freshCareers += 1;
  if (R.ovrTrackedFrom(fresh) !== null) fail(`fresh career ${i} (${position}): ovrTrackedFrom says ${R.ovrTrackedFrom(fresh)} on a career stamped from its first season`);
  if (R.ovrNotYetTracked(fresh)) fail(`fresh career ${i} (${position}): ovrNotYetTracked is true on a stamped career`);
  const old = stripOvr(live);
  if (hasOvr(old)) { fail('stripping ovr left one behind'); continue; }
  if (!CUR.isSoccerCareerSave(old)) { fail(`old save ${i} (${position}) fails isSoccerCareerSave`); continue; }
  const repaired = CUR.repairCareer(JSON.parse(JSON.stringify(old)));
  if (JSON.stringify(repaired.seasons) !== JSON.stringify(old.seasons)) fail(`repairCareer changed the season rows of old save ${i}`);
  if (hasOvr(repaired)) fail(`repairCareer invented an ovr on old save ${i}`);
  const before = R.soccerRatingRows(old.seasons, position);
  oldSaves += 1; oldRows += before.length;
  if (!R.ovrNotYetTracked(before)) fail(`old save ${i}: ovrNotYetTracked is false on a save with no ovr at all`);
  for (const [k, row] of before.entries()) {
    if (row.ovr !== null) fail(`old save ${i}, ${row.year}: ovr reads ${row.ovr} on a row saved without one`);
    const raw = old.seasons.filter(r => r.type === 'playing')[k];
    if (raw.apps > 0 && row.rating !== raw.rating) fail(`old save ${i}, ${row.year}: the rating reads ${row.rating}, saved ${raw.rating}`);
  }
  /* play 3 more seasons on the old save */
  const n0 = playedCount(repaired);
  const after = runCareer(CUR, seed + 1, { era, startYear, position, from: repaired, until: s => s.phase === 'playing' && playedCount(s) >= n0 + 3 });
  const rows = R.soccerRatingRows(after.seasons, position);
  const series = R.ratingSeries(rows);
  let firstNew = null;
  for (const [k, row] of rows.entries()) {
    if (k < before.length) {
      if (row.ovr !== null || series.ovr[k] !== null) fail(`old save ${i}, ${row.year}: an old row reads ovr ${row.ovr} (series ${series.ovr[k]}) after more seasons`);
    } else if (row.rating !== null) {
      newRows += 1; if (row.ovr !== null) newStamped += 1;
      if (firstNew === null) firstNew = row.year;
      if (row.ovr === null) fail(`old save ${i}, ${row.year}: a season played after the update has no ovr`);
    }
  }
  if (firstNew !== null && R.ovrTrackedFrom(rows) !== firstNew) fail(`old save ${i}: ovrTrackedFrom says ${R.ovrTrackedFrom(rows)}, the first new played year is ${firstNew}`);
}
console.log(`   ${freshCareers} fresh careers carry no "kept from" caption; ${oldSaves} old saves, ${oldRows} old played type rows read ovr null with their real rating; ${newRows} seasons played on them after the update, ${newStamped} with ovr`);
floorCheck(freshCareers, 12, 'fresh careers checked for the caption');
floorCheck(oldSaves, 12, 'old saves');
floorCheck(newRows, 24, 'seasons played on old saves');

section = 5;
console.log('5) per position stats are the row\'s own fields, and a clean sheet never drawn reads blank');
const ALLOW = new Set(['Apps', 'Goals', 'Assists', 'Clean sheets']);
const SHEETS = new Set(['GK', 'CB', 'LB', 'RB']);
const BACK = new Set(['CB', 'LB', 'RB']);
let statRows = 0, blankSheets = 0, backLine = 0, backLineKept = 0, stampedZero = 0;
for (const { position, s } of careers) {
  const raws = s.seasons.filter(r => r.type === 'playing');
  const rows = R.soccerRatingRows(s.seasons, position);
  if (rows.length !== raws.length) { fail(`${position}: ${rows.length} rating rows for ${raws.length} played type rows`); continue; }
  for (const [k, row] of rows.entries()) {
    const raw = raws[k];
    statRows += 1;
    const labels = row.stats.map(x => x.label);
    const bad = labels.filter(l => !ALLOW.has(l));
    if (bad.length) { fail(`${position} ${row.year}: prints ${bad.join(', ')}, which the engine never tracks per season`); continue; }
    if (labels.includes('Clean sheets') !== SHEETS.has(position)) fail(`${position} ${row.year}: Clean sheets ${labels.includes('Clean sheets') ? 'shown' : 'missing'}`);
    const val = l => row.stats.find(x => x.label === l)?.value;
    if (val('Apps') !== raw.apps) fail(`${position} ${row.year}: Apps ${val('Apps')} against ${raw.apps}`);
    if (labels.includes('Goals') && val('Goals') !== raw.goals) fail(`${position} ${row.year}: Goals ${val('Goals')} against ${raw.goals}`);
    if (labels.includes('Assists') && val('Assists') !== raw.assists) fail(`${position} ${row.year}: Assists ${val('Assists')} against ${raw.assists}`);
    if (SHEETS.has(position)) {
      const cs = val('Clean sheets');
      const stamped = R.readOvr(raw.ovr) !== null;
      const blankOk = BACK.has(position) && !stamped && raw.apps > 0 && raw.cleanSheets === 0;
      if (cs === null) { blankSheets += 1; if (!blankOk) fail(`${position} ${row.year}: Clean sheets blank on a row that recorded ${raw.cleanSheets}`); }
      else if (cs !== raw.cleanSheets || blankOk) fail(`${position} ${row.year}: Clean sheets ${cs}, row ${raw.cleanSheets}${blankOk ? ' (never drawn, must be blank)' : ''}`);
      if (stamped && raw.cleanSheets === 0 && cs === 0) stampedZero += 1;
      /* every fleet row comes from today's engine, so the draw is real stamped or not */
      if (BACK.has(position) && raw.apps >= 10) { backLine += 1; if (raw.cleanSheets > 0) backLineKept += 1; }
    }
  }
}
/* a back line career saved before Round 667: unstamped rows with 0 read blank,
   never 0; the same rows stamped read a real 0 */
const cbCareer = careers.find(c => c.position === 'CB').s;
const cbPlayed = cbCareer.seasons.filter(r => r.type === 'playing' && r.apps > 0);
const pre667 = cbPlayed.map(r => ({ ...r, ovr: undefined, cleanSheets: 0 }));
const stamped0 = cbPlayed.map(r => ({ ...r, ovr: 70, cleanSheets: 0 }));
/* and a season with no games: 0 clean sheets there is simply true */
if (R.soccerRatingRows([yearOut('BANNED')], 'CB')[0]?.stats.find(x => x.label === 'Clean sheets')?.value !== 0) fail('a CB season with no games does not print its true 0 clean sheets');
const preRows = R.soccerRatingRows(pre667, 'CB');
const stRows = R.soccerRatingRows(stamped0, 'CB');
const cell = row => row.stats.find(x => x.label === 'Clean sheets');
if (!preRows.length || preRows.some(r => !cell(r) || cell(r).value !== null)) fail('a CB row saved before Round 667 with 0 clean sheets does not read blank');
if (!stRows.length || stRows.some(r => !cell(r) || cell(r).value !== 0)) fail('a stamped CB row with 0 clean sheets does not print its real 0');
const share = backLine ? backLineKept / backLine : 0;
console.log(`   ${statRows} rows checked field by field; ${blankSheets} blank clean sheet cells, all on unstamped back line zeros; ${stampedZero} stamped zeros printed as 0; fixtures: ${preRows.length} pre 667 CB rows blank, ${stRows.length} stamped zero rows printed`);
console.log(`   back line rows with 10 or more apps: ${backLineKept} of ${backLine} kept a clean sheet (${(share * 100).toFixed(1)}%)`);
floorCheck(backLine, FLOOR.backLine, 'back line rows with 10 or more apps');
if (share < FLOOR.cleanShare) fail(`only ${(share * 100).toFixed(1)}% of back line rows with 10 or more apps kept a clean sheet, under the floor of ${(FLOOR.cleanShare * 100).toFixed(0)}%, so the column would be an empty promise`);

/* ── verdict ── */
console.log('');
const redList = [...red].sort((a, b) => a - b);
if (CONTROL) {
  const want = CONTROLS[CONTROL].red;
  if (failures === 0) { console.error(`simCareerSeasonRatings: control ${CONTROL} turned nothing red. The control is dead.`); process.exit(2); }
  if (redList.join(',') === want.join(',')) { console.log(`simCareerSeasonRatings: control ${CONTROL} turned section(s) ${redList.join(', ')} red, exactly the expected set. The check works.`); process.exit(1); }
  console.error(`simCareerSeasonRatings: control ${CONTROL} turned section(s) ${redList.join(', ')} red, expected ${want.join(', ')}.`);
  process.exit(2);
}
if (failures) { console.error(`simCareerSeasonRatings: ${failures} failure(s) in section(s) ${redList.join(', ')}`); process.exit(1); }
console.log(`simCareerSeasonRatings: green. ${careers.length} careers, ${played} played rows stamped true, ${rated} ratings read back, ${careersEqual} of ${DIGEST_SEEDS} streams unmoved, ${oldSaves} old saves honest, ${statRows} stat rows from real fields.`);
