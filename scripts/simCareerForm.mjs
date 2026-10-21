/* Round 1523: morale that plays, one shared form term for five careers.
 *
 * src/lib/careerForm.ts holds the morale term every career's season form shares. The four US My Careers used to
 * carry one copy each of form = rating + (morale - 60) / k + ... (NBA 12, NFL 10, MLB 12, NHL 12) and now bind
 * moraleForm with those divisors.
 *
 * 1) The four US careers replay BYTE IDENTICAL. Each engine is bundled twice: as this tree has it (bound to
 *    careerForm.ts) and with its own file read at BASE (origin/main when the round started, the copies still
 *    inline). Seeded careers for every position and archetype are played season by season with morale and team
 *    quality swept across their whole range from a stream of their own, and the whole state after every season
 *    and every progress step must be the same string in both arms. Control SIM_CAREER_FORM_CONTROL=divisor
 *    changes the NFL divisor in careerForm.ts (10 to 11) in this tree's bundle: the replay must part.
 *
 * Environment: SIM_CAREER_FORM_BASE (the ref the base arm reads), SIM_CAREER_FORM_SECTIONS (comma separated).
 * Never reads the network. Exit 1 on any failure; the last line says green or red.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.SIM_CAREER_FORM_BASE || '2ab9bef153009a3144970e87755225a458ef0c3b';
const CONTROL = process.env.SIM_CAREER_FORM_CONTROL || '';
const CONTROLS = { divisor: '1', zero: '3', nogate: '5' };
if (CONTROL && !CONTROLS[CONTROL]) { console.log(`ABORT: unknown SIM_CAREER_FORM_CONTROL ${CONTROL}`); process.exit(1); }
/* A control runs only the section it breaks, unless SIM_CAREER_FORM_SECTIONS names others. */
const SECTIONS = (process.env.SIM_CAREER_FORM_SECTIONS || (CONTROL ? CONTROLS[CONTROL] : '1,2,3,4,5')).split(',').map(s => s.trim());
const runs = n => SECTIONS.includes(n);
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'career-form-'));
const failures = [];
const fail = msg => { failures.push(msg); console.log(`   FAIL ${msg}`); };
const norm = p => path.resolve(p).split(path.sep).join('/').toLowerCase();
const lf = s => s.split('\r\n').join('\n');
const read = rel => lf(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const atBase = rel => lf(execFileSync('git', ['show', `${BASE}:${rel}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64e6 }));
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

/* One bundle of `entry` with some files served from given text (path from the root to LF text). */
async function bundle(name, entry, serve = {}) {
  const map = new Map(Object.entries(serve).map(([rel, text]) => [norm(path.join(ROOT, rel)), text]));
  const served = new Set();
  const out = path.join(TMP, `${name}.mjs`);
  await build({ entryPoints: [path.join(ROOT, entry)], bundle: true, format: 'esm', platform: 'node', outfile: out,
    logLevel: 'error', alias: { '@': path.join(ROOT, 'src') }, absWorkingDir: ROOT,
    plugins: [{ name: 'serve', setup(b) { b.onLoad({ filter: /\.(ts|tsx)$/ }, args => {
      const text = map.get(norm(args.path));
      if (text === undefined) return undefined;
      served.add(norm(args.path));
      return { contents: text, loader: args.path.endsWith('.tsx') ? 'tsx' : 'ts' };
    }); } }] });
  for (const key of map.keys()) if (!served.has(key)) fail(`${name}: the bundle never loaded ${key}`);
  return import(pathToFileURL(out).href);
}
const mulberry = seed => { let s = seed | 0; return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

/* Section 1 */
const US = [
  { id: 'nba', file: 'src/lib/nbaMyCareer.ts', arch: 'NBA_ARCHETYPES', start: 'startNbaCareer', season: 'simNbaSeason', progress: 'nbaProgress' },
  { id: 'nfl', file: 'src/lib/nflMyCareer.ts', arch: 'ARCHETYPES', start: 'startCareer', season: 'simSeason', progress: 'progress' },
  { id: 'mlb', file: 'src/lib/mlbMyCareer.ts', arch: 'MLB_ARCHETYPES', start: 'startMlbCareer', season: 'simMlbSeason', progress: 'mlbProgress' },
  { id: 'nhl', file: 'src/lib/nhlMyCareer.ts', arch: 'NHL_ARCHETYPES', start: 'startNhlCareer', season: 'simNhlSeason', progress: 'nhlProgress' },
];
const FORM = 'src/lib/careerForm.ts';
const NFL_DIVISOR = 'nfl: { per: 10, neutral: 60 },';
/* Every position and archetype, SEEDS careers each, YEARS seasons; morale and team quality from a stream of their own. */
function replay(lib, sport, seeds, years) {
  const trail = [];
  const real = Math.random;
  for (const pos of Object.keys(lib[sport.arch])) {
    for (const archetype of lib[sport.arch][pos]) {
      for (let k = 0; k < seeds; k += 1) {
        const seed = 1000 + k * 7919, rng = mulberry(seed), dial = mulberry(seed ^ 0x5bd1e995);
        Math.random = mulberry(seed + 17);
        try {
          const c = lib[sport.start]('Replay Man', pos, archetype, rng);
          for (let y = 0; y < years && !c.retired; y += 1) {
            c.morale = Math.round(dial() * 100);
            const out = lib[sport.season](c, 70 + Math.floor(dial() * 20), rng);
            trail.push(JSON.stringify(out), JSON.stringify(c));
            trail.push(JSON.stringify(lib[sport.progress](c, rng)), JSON.stringify(c));
          }
        } finally { Math.random = real; }
      }
    }
  }
  return trail;
}
if (runs('1')) {
  console.log('1) the four US careers replay byte identical through careerForm.ts');
  const form = read(FORM);
  if (!form.includes(NFL_DIVISOR)) { console.log(`ABORT: ${FORM} no longer holds ${NFL_DIVISOR}, so the divisor control would prove nothing`); process.exit(1); }
  const formServe = CONTROL === 'divisor' ? { [FORM]: form.replace(NFL_DIVISOR, 'nfl: { per: 11, neutral: 60 },') } : {};
  if (CONTROL === 'divisor') console.log('   CONTROL divisor: the NFL divisor is 11 in this tree\'s bundle');
  for (const sport of US) {
    const head = read(sport.file), base = atBase(sport.file);
    if (head.includes('(c.morale - 60) /')) fail(`${sport.id}: ${sport.file} still carries its own copy of the morale term`);
    if (!head.includes(`moraleForm('${sport.id}', c.morale)`)) fail(`${sport.id}: ${sport.file} does not bind moraleForm('${sport.id}', c.morale)`);
    if (!base.includes('(c.morale - 60) /')) fail(`${sport.id}: the base ${BASE.slice(0, 8)} has no inline morale term, so it is not the tree before the lift`);
    const now = await bundle(`${sport.id}-head`, sport.file, formServe);
    const was = await bundle(`${sport.id}-base`, sport.file, { [sport.file]: base });
    const a = replay(now, sport, 6, 18), b = replay(was, sport, 6, 18);
    let first = -1;
    for (let i = 0; i < Math.max(a.length, b.length); i += 1) if (a[i] !== b[i]) { first = i; break; }
    const careers = Object.values(now[sport.arch]).reduce((n, list) => n + list.length, 0) * 6;
    console.log(`   ${sport.id}: ${careers} careers, ${a.length / 4} seasons replayed, ${first < 0 ? 'byte identical' : `parts at record ${first}`}`);
    if (a.length < careers * 8) fail(`${sport.id}: only ${a.length / 4} seasons were played, the replay is too thin to mean anything`);
    if (first >= 0) fail(`${sport.id}: this tree parts from ${BASE.slice(0, 8)} at record ${first} of ${a.length}`);
  }
}

/* ─── Soccer Career: the bundles ─── */
const ENGINE = 'src/lib/soccerCareerEngine.ts';
const STEP_LINE = "const step = Math.round(moraleForm('soccer', morale));";
const GATE_LINE = 'if (puskasDrawn && puskasAwardExists(thisYear)) {';
const PRESS_MARK = 'function generateSeasonStats(state, clubs) {';
async function soccer(name, { stepOff = false, noGate = false } = {}) {
  const serve = {};
  if (stepOff) {
    const form = read(FORM);
    if (form.split(STEP_LINE).length !== 2) { console.log(`ABORT: ${FORM} does not hold ${STEP_LINE} once`); process.exit(1); }
    serve[FORM] = form.replace(STEP_LINE, 'const step = 0;');
  }
  if (noGate) {
    const engine = read(ENGINE);
    if (engine.split(GATE_LINE).length !== 2) { console.log(`ABORT: ${ENGINE} does not hold ${GATE_LINE} once`); process.exit(1); }
    serve[ENGINE] = engine.replace(GATE_LINE, 'if (puskasDrawn) {');
  }
  const entry = path.join(TMP, `${name}-entry.ts`);
  fs.writeFileSync(entry, ['soccerCareerEngine', 'soccerCareerAttributes', 'careerForm', 'soccerWorldTruth', 'soccerPhone']
    .map((m, i) => `export * as ${'EAFWP'[i]} from '${path.join(ROOT, 'src/lib', m).split(path.sep).join('/')}';`).join('\n'));
  const out = path.join(TMP, `${name}.mjs`);
  const map = new Map(Object.entries(serve).map(([rel, text]) => [norm(path.join(ROOT, rel)), text]));
  await build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error',
    alias: { '@': path.join(ROOT, 'src') }, absWorkingDir: ROOT,
    plugins: [{ name: 'serve', setup(b) { b.onLoad({ filter: /\.(ts|tsx)$/ }, args => {
      const text = map.get(norm(args.path));
      return text === undefined ? undefined : { contents: text, loader: 'ts' };
    }); } }] });
  let text = fs.readFileSync(out, 'utf8');
  if (text.split(PRESS_MARK).length !== 2) { console.log('ABORT: generateSeasonStats is not in the bundle once'); process.exit(1); }
  text = text.replace(PRESS_MARK, `${PRESS_MARK}\n  if (globalThis.__sfPress) globalThis.__sfPress(state);`);
  fs.writeFileSync(out, text);
  return import(pathToFileURL(out).href);
}
/* A seeded Math.random that counts its draws. */
let draws = 0;
const seedRandom = seed => { const r = mulberry(seed); draws = 0; Math.random = () => { draws += 1; return r(); }; };
const POS = ['ST', 'CM', 'CB', 'GK', 'LW', 'CAM', 'CDM', 'RB', 'RW', 'LB'];
const STAT_KEYS = ['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical', 'reflexes'];
function newCareer(S, i, { era = '2020-24', start = 2020, ovr = 56 + (i % 5) * 3, pos = POS[i % POS.length] } = {}) {
  const off = S.A.POSITION_OFFSETS[pos];
  const stats = Object.fromEntries(STAT_KEYS.map((k, j) => [k, Math.max(25, Math.min(99, ovr + off[j]))]));
  return S.E.initCareer('Form Sim', i % 2 ? 'England' : 'Spain', pos, era, stats, ovr, start, S.E.FALLBACK_CLUBS, null, Math.min(94, ovr + 20));
}
/* One step of the house fleet (scripts/lib/careerStep.mjs) that also walks past the retirement screens. */
function step(S, c) {
  if (c.phase === 'retirement_suggestion') return S.E.declineRetirementSuggestion(c, S.E.FALLBACK_CLUBS);
  if (c.phase === 'retirement_ceremony' || c.phase === 'post_retirement' || c.phase === 'retired') return { ...c, retired: true };
  return careerStepOf(S.E, c, S.E.FALLBACK_CLUBS);
}
const { careerStep: careerStepOf } = await import(pathToFileURL(path.join(ROOT, 'scripts/lib/careerStep.mjs')).href);
const SEED = Number(process.env.SIM_CAREER_FORM_SEED || 1523);
const meanOf = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN);
const f2 = n => (Number.isFinite(n) ? n.toFixed(2) : String(n));

if (runs('2')) {
  console.log('2) the soccer step, the cap it shares with the phone, and the hub line');
  const S = await soccer('step');
  const F = S.F;
  const want = [[0, -2], [20, -2], [65, -2], [66, -1], [75, -1], [76, 0], [81, 0], [85, 0], [86, 1], [95, 1], [96, 2], [100, 2], [undefined, 0], [NaN, 0]];
  for (const [m, s] of want) if (F.soccerMoraleStep(m) !== s) fail(`soccerMoraleStep(${m}) is ${F.soccerMoraleStep(m)}, not ${s}`);
  if (Object.is(F.soccerMoraleStep(76), -0)) fail('soccerMoraleStep(76) is minus zero');
  for (const phone of [-3, -2, 0, 2, 3]) for (const m of [20, 81, 100]) {
    const got = F.dressingRoomApps(phone, m), cap = Math.max(-3, Math.min(3, phone + F.soccerMoraleStep(m)));
    if (got !== cap) fail(`dressingRoomApps(${phone}, ${m}) is ${got}, not ${cap}`);
    if (F.soccerMoraleStep(m) === 0 && got !== phone) fail(`a neutral morale moved the phone's ${phone} games to ${got}`);
  }
  for (const [m, r] of [[20, -0.2], [70, -0.1], [81, 0], [90, 0.1], [100, 0.2]]) if (F.soccerMoraleRating(m) !== r) fail(`soccerMoraleRating(${m}) is ${F.soccerMoraleRating(m)}, not ${r}`);
  const lines = [[90, 0, 'Morale 90: +1 league game, rating +0.1 this season.'], [100, 0, 'Morale 100: +2 league games, rating +0.2 this season.'],
    [40, 0, 'Morale 40: -2 league games, rating -0.2 this season.'], [81, 0, 'Morale 81: settled, no swing in games or rating this season.'],
    [100, 3, 'Morale 100: rating +0.2 this season (the dressing room already has your games at the limit).'], [100, 2, 'Morale 100: +1 league game, rating +0.2 this season.']];
  for (const [m, phone, line] of lines) if (F.soccerMoraleLine(m, phone) !== line) fail(`soccerMoraleLine(${m}, ${phone}) reads "${F.soccerMoraleLine(m, phone)}"`);
  const dash = [String.fromCharCode(0x2013), String.fromCharCode(0x2014)];
  for (let m = 0; m <= 100; m += 1) for (const phone of [-3, 0, 3]) if (dash.some(d => F.soccerMoraleLine(m, phone).includes(d))) fail(`the hub line for ${m} holds a dash`);
  console.log(`   neutral ${F.CAREER_FORM.soccer.neutral}, ${F.CAREER_FORM.soccer.per} morale points a step; ${want.length} steps, 15 caps, 5 ratings, ${lines.length} hub lines checked`);
}

/* Play one engine call on a copy of `c` with its own counted stream; the career's own stream is put back after. */
function aside(seed, run) {
  const outer = Math.random, outerDraws = draws;
  seedRandom(seed);
  try { const value = run(); return { value, draws }; } finally { Math.random = outer; draws = outerDraws; }
}
const playedRow = (before, after) => {
  if (!after || after.seasons.length !== before.seasons.length + 1) return null;
  const row = after.seasons[after.seasons.length - 1];
  return row.type === 'playing' && row.clubTier < 99 ? row : null;
};

if (runs('3')) {
  console.log('3) a pinned fleet: every press played again at morale 20, at the neutral point and at 90');
  if (CONTROL === 'zero') console.log('   CONTROL zero: the soccer step is 0 in this tree\'s bundle');
  const S = await soccer(CONTROL === 'zero' ? 'pin-zero' : 'pin', { stepOff: CONTROL === 'zero' });
  const OFF = await soccer('pin-off', { stepOff: true });
  const NEUTRAL = S.F.CAREER_FORM.soccer.neutral, PINS = [20, NEUTRAL, 90];
  const N = Number(process.env.SIM_CAREER_FORM_PIN_CAREERS || 120);
  const got = PINS.map(() => ({ league: [], rating: [] }));
  let presses = 0, breaks = 0, overCap = 0, neutralSame = 0, neutralDiffer = 0, lowDrawsSame = 0, lowDrawsDiffer = 0;
  for (let i = 0; i < N; i += 1) {
    seedRandom(SEED * 1000 + i);
    let c = newCareer(S, i);
    for (let k = 0; k < 1500 && !c.retired; k += 1) {
      if (c.phase === 'playing') {
        const snap = JSON.stringify(c), seed = SEED * 7919 + i * 131 + k;
        const at = (E, morale) => aside(seed, () => E.advanceProSeason({ ...JSON.parse(snap), morale }, E.FALLBACK_CLUBS));
        const runsAt = PINS.map(p => at(S.E, p));
        const rows = runsAt.map(r => playedRow(c, r.value));
        if (rows.every(Boolean)) {
          presses += 1;
          rows.forEach((row, j) => { got[j].league.push(row.leagueApps ?? row.apps); got[j].rating.push(row.rating); });
          const [l20, l81, l90] = rows.map(row => row.leagueApps ?? row.apps);
          if (l20 > l81 || l81 > l90) breaks += 1;
          if (l81 - l20 > 2 || l90 - l81 > 1) overCap += 1;
          const offNeutral = at(OFF.E, NEUTRAL), offLow = at(OFF.E, 20);
          if (JSON.stringify(offNeutral.value) === JSON.stringify(runsAt[1].value) && offNeutral.draws === runsAt[1].draws) neutralSame += 1; else neutralDiffer += 1;
          if (offLow.draws === runsAt[0].draws) lowDrawsSame += 1; else lowDrawsDiffer += 1;
        }
      }
      c = step(S, c);
    }
  }
  const lm = got.map(g => meanOf(g.league)), rm = got.map(g => meanOf(g.rating));
  console.log(`   ${N} careers, ${presses} presses played three ways (seed ${SEED})`);
  console.log(`   league games: morale 20 ${f2(lm[0])}, ${NEUTRAL} ${f2(lm[1])}, 90 ${f2(lm[2])}; rating ${f2(rm[0])}, ${f2(rm[1])}, ${f2(rm[2])}`);
  console.log(`   gaps: games ${f2(lm[1] - lm[0])} and ${f2(lm[2] - lm[1])}, rating ${f2(rm[1] - rm[0])} and ${f2(rm[2] - rm[1])}`);
  console.log(`   at the neutral point the round's arm and the arm without the step: ${neutralSame} presses byte identical with the same draws, ${neutralDiffer} not`);
  console.log(`   at morale 20 the two arms made the same number of draws in ${lowDrawsSame} presses and a different number in ${lowDrawsDiffer}`);
  if (presses < N * 8) fail(`only ${presses} presses were played three ways`);
  if (breaks) fail(`${breaks} presses gave fewer league games at a higher morale`);
  if (overCap) fail(`${overCap} presses moved more league games than the step allows (2 below, 1 above)`);
  if (neutralDiffer) fail(`${neutralDiffer} presses at the neutral point differ from the arm without the step`);
  /* Floors from measured headroom (see the header): each gap must clear its floor. */
  const FLOORS = { g1: 0.6, g2: 0.3, r1: 0.12, r2: 0.05 };
  const gaps = { g1: lm[1] - lm[0], g2: lm[2] - lm[1], r1: rm[1] - rm[0], r2: rm[2] - rm[1] };
  for (const [k, floor] of Object.entries(FLOORS)) if (!(gaps[k] >= floor)) fail(`gap ${k} is ${f2(gaps[k])}, under its floor ${floor}`);
}

const TIERS = ['GOAT', 'LEGEND', 'GREAT', 'SOLID PRO', 'JOURNEYMAN'];
/* A whole career on the house fleet, Math.random seeded from the career's index. */
function wholeCareer(S, i, seedBase, opts) {
  seedRandom(seedBase * 1000 + i);
  let c = newCareer(S, i, opts);
  for (let k = 0; k < 2000 && !c.retired; k += 1) c = step(S, c);
  return c;
}
function fleetBlock(S, n, seedBase) {
  let bdor = 0, seasons = 0, league = 0, rating = 0, morale = 0, presses = 0;
  const tiers = Object.fromEntries(TIERS.map(t => [t, 0]));
  globalThis.__sfPress = st => { morale += st.morale; presses += 1; };
  for (let i = 0; i < n; i += 1) {
    const c = wholeCareer(S, i, seedBase);
    for (const row of c.seasons) if (row.type === 'playing' && row.clubTier < 99) { seasons += 1; league += row.leagueApps ?? row.apps; rating += row.rating; if (row.ballonDor) bdor += 1; }
    tiers[S.E.calculateLegacy(c).tier] += 1;
  }
  globalThis.__sfPress = null;
  return { n, bdor: (100 * bdor) / n, seasons, league: league / seasons, rating: rating / seasons, tiers: Object.fromEntries(TIERS.map(t => [t, (100 * tiers[t]) / n])) };
}
const showBlock = (name, b) => console.log(`   ${name.padEnd(9)} ${b.n} careers, ${b.seasons} seasons: Ballon d'Or ${f2(b.bdor)} per 100 careers, league games ${f2(b.league)}, rating ${f2(b.rating)}; legacy ${TIERS.map(t => `${t} ${b.tiers[t].toFixed(1)}%`).join(', ')}`);

if (runs('4')) {
  console.log('4) the natural fleet: the round against the same tree without the morale step, same seeds');
  const N = Number(process.env.SIM_CAREER_FORM_FLEET || 400);
  const head = fleetBlock(await soccer('fleet-head'), N, SEED);
  const off = fleetBlock(await soccer('fleet-off', { stepOff: true }), N, SEED);
  showBlock('round', head);
  showBlock('no step', off);
  const shift = { bdor: head.bdor - off.bdor, league: head.league - off.league, rating: head.rating - off.rating };
  const tierShift = Object.fromEntries(TIERS.map(t => [t, head.tiers[t] - off.tiers[t]]));
  console.log(`   shift: Ballon d'Or ${f2(shift.bdor)} per 100, league games ${f2(shift.league)}, rating ${f2(shift.rating)}; legacy ${TIERS.map(t => `${t} ${tierShift[t].toFixed(1)}`).join(', ')} points`);
  if (N >= 400) {
    /* Bounds from measured headroom (see the header). */
    const BOUND = { bdor: 4, league: 0.8, rating: 0.08, tier: 6 };
    if (Math.abs(shift.bdor) > BOUND.bdor) fail(`the Ballon d'Or rate moved ${f2(shift.bdor)} per 100 careers, past ${BOUND.bdor}`);
    if (Math.abs(shift.league) > BOUND.league) fail(`league games a season moved ${f2(shift.league)}, past ${BOUND.league}`);
    if (Math.abs(shift.rating) > BOUND.rating) fail(`the season rating moved ${f2(shift.rating)}, past ${BOUND.rating}`);
    for (const t of TIERS) if (Math.abs(tierShift[t]) > BOUND.tier) fail(`the ${t} share moved ${tierShift[t].toFixed(1)} points, past ${BOUND.tier}`);
  } else console.log(`   ${N} careers is under the 400 the bounds were measured at, so the bounds are not asserted`);
  if (head.seasons < N * 10) fail(`only ${head.seasons} seasons were played`);
}

if (runs('5')) {
  console.log('5) the era fleet: no Puskas Award before 2008-09, and the draw before it is kept');
  if (CONTROL === 'nogate') console.log('   CONTROL nogate: the gate is gone from this tree\'s bundle');
  const S = await soccer(CONTROL === 'nogate' ? 'era-nogate' : 'era', { noGate: CONTROL === 'nogate' });
  const U = CONTROL === 'nogate' ? S : await soccer('era-ungated', { noGate: true });
  const N = Number(process.env.SIM_CAREER_FORM_ERA || 240);
  const ERAS = [['1990-94', 1990], ['1995-99', 1995], ['2000-04', 2000], ['2005-09', 2005]];
  const ATT = ['ST', 'LW', 'RW', 'CAM'];
  const PUSKAS = 'Puskás Award';
  let before = 0, from = 0, offRow = 0, kept = 0, keptBad = 0;
  for (let i = 0; i < N; i += 1) {
    const [era, start] = ERAS[i % ERAS.length];
    const opts = { era, start, ovr: 70 + (i % 4) * 3, pos: ATT[i % ATT.length] };
    const c = wholeCareer(S, i, SEED + 5, opts);
    for (const a of c.awards ?? []) {
      if (a.name !== PUSKAS) continue;
      if (a.year < 2008) before += 1; else from += 1;
      if (!c.seasons.some(row => row.type === 'playing' && row.year === a.year && row.goals >= 15)) offRow += 1;
    }
    if (U === S || i >= N / 2) continue;
    /* lockstep: the gated and ungated trees from one seed; where only the ungated one wins a pre 2008 award, the
       draws so far must be equal and the two states equal apart from that award and its line */
    const pair = [S, U].map(B => { seedRandom((SEED + 5) * 1000 + i); return { B, c: newCareer(B, i, opts), d: 0, r: Math.random }; });
    for (let k = 0; k < 2000 && !pair[0].c.retired && !pair[1].c.retired; k += 1) {
      for (const p of pair) { Math.random = p.r; const d0 = draws; draws = p.d; p.c = step(p.B, p.c); p.d = draws; p.r = Math.random; draws = d0; }
      const extra = (pair[1].c.awards ?? []).filter(a => a.name === PUSKAS && a.year < 2008).length;
      if (extra > 0) {
        kept += 1;
        const strip = s => JSON.stringify({ ...s, awards: (s.awards ?? []).filter(a => !(a.name === PUSKAS && a.year < 2008)), events: (s.events ?? []).filter(e => !String(e).includes('Puskás Award for Goal')) });
        if (pair[0].d !== pair[1].d || strip(pair[0].c) !== strip(pair[1].c)) keptBad += 1;
        break;
      }
    }
  }
  console.log(`   ${N} careers from 1990, 1995, 2000 and 2005 (seed ${SEED + 5}): ${before} awards before 2008-09, ${from} from it, ${offRow} on a year without a 15 goal season`);
  if (U !== S) console.log(`   the ungated tree won one before 2008-09 in ${kept} lockstep careers; the gated tree made the same draws and kept the same state in ${kept - keptBad}`);
  if (before > 0) fail(`${before} Puskas Awards were won in seasons before 2008-09`);
  if (from === 0) fail('nobody won a Puskas Award from 2008-09 on either, so the fleet proves nothing');
  if (offRow > 0) fail(`${offRow} awards carry a year with no 15 goal season, so the award year is not the season's`);
  if (U !== S && kept === 0) fail('no lockstep career reached a pre 2008 award on the ungated tree, so the kept draw is unproven');
  if (keptBad > 0) fail(`${keptBad} lockstep careers parted from the ungated tree beyond the award itself`);
}

console.log(failures.length ? `simCareerForm: RED, ${failures.length} failure(s)` : 'simCareerForm: green');
process.exit(failures.length ? 1 : 0);
