/* Round 1523: morale that plays, one shared form term for five careers.
 *
 * src/lib/careerForm.ts holds the morale term every career's season form shares. The four US My Careers used to
 * carry one copy each of form = rating + (morale - 60) / k + ... (NBA 12, NFL 10, MLB 12, NHL 12) and now bind
 * moraleForm with those divisors.
 *
 * 1) The four US careers replay BYTE IDENTICAL. Each engine is bundled twice: as this tree has it (bound to
 *    careerForm.ts) and as this tree's own file with the one lifted line put back inline (the import gone, the
 *    divisor the copy had at BASE, origin/main when the round started, which is checked), so a later round's edits
 *    to a US engine sit in both arms and only the lift is compared. Seeded careers for every position and archetype are played season by season with morale and team
 *    quality swept across their whole range from a stream of their own, and the whole state after every season
 *    and every progress step must be the same string in both arms. Control SIM_CAREER_FORM_CONTROL=divisor
 *    changes the NFL divisor in careerForm.ts (10 to 11) in this tree's bundle: the replay must part.
 *    Measured 2026-10-21 (remote check r1523-s1): nba 90 careers 1,620 seasons, nfl 144 and 2,592, mlb 198 and
 *    3,564, nhl 108 and 1,944, all byte identical; the control parts the NFL at record 0.
 * 2) Soccer Career's step, its cap with the phone and the hub line, value by value (neutral 81, 15 points a step),
 *    and the page's wiring of the line read from its code (comments stripped): fed the save's own morale, shown on a
 *    playing hub whose season will be played. Control pageline feeds it another number and must fail.
 * 3) A PINNED fleet: every press of 120 house careers (scripts/lib/careerStep.mjs) is played again at morale 20, at
 *    the neutral point and at 90 from one seeded stream. Exact: calcAppearances' league games less the designed
 *    joint step (dressingRoomApps of the phone and the morale he PRESSED on) are one number at all three pins,
 *    wherever 0 or 38 did not clamp. The neutral pin is byte identical, with the same draws, to the tree without the
 *    step (no new draw). Then the means rise in order. Measured over seeds 1523, 2024 and 77 (r1523-m3): about 2,450
 *    presses each, 0 mismatches; league games gap 0.10 (20 to neutral: the house fleet's phone runs cold, so the
 *    shared cap already holds most of a low morale's cost) and 0.99 to 1.00 (neutral to 90); rating gaps 0.20 to
 *    0.21 and 0.14 to 0.15. Floors are about half of those. Controls: zero (the step is 0, every gap is 0) and
 *    posttext (the season reads the morale after the summer's texts: no press is exact and the top gaps are 0).
 *    The hub line against the press (review of 2026-10-21): at every pin the games the morale moved against the
 *    neutral pin (same press, same dice) must fit what the line for that morale says, "up to" the step in its
 *    direction; the line the round first shipped (the cap worked out with the hub's phone, which the summer's texts
 *    move at the press) is counted beside it. Control double adds the step a second time and must fail here.
 * 4) The NATURAL fleet, 9,600 careers to the end (split over SIM_CAREER_FORM_WORKERS child processes a side, default
 *    4), the round against the same tree without the step on the same seeds, for the house fleet and
 *    (SIM_CAREER_FORM_FLEET_KIND=engaged) one that answers every text: the Ballon d'Or rate, league games, rating and
 *    the five legacy tier shares, both blocks printed. A settled head must gain league games, and every shift stays
 *    under its ceiling, set from the measured headroom (the numbers and why they are where they are, at BOUNDS).
 *    Control per10 plays the rejected design (10 morale points a step) and must break the league ceiling; control
 *    legacy (the round's arm calls a career GOAT from a legacy score of 86) must break the tier rows.
 * 5) The ERA fleet: 240 attacking careers from 1990, 1995, 2000 and 2005 hold no Puskas Award before 2008-09 and
 *    some after it, every award on a season with 15 goals, and in lockstep with an ungated tree the gated one makes
 *    the same draws and keeps the same state where only the ungated one wins early. Measured (r1523-m1): 0 before,
 *    114 from it, 43 lockstep careers all equal. Control nogate (the gate gone): 126 before.
 *    Round 1525 moved the award to a field (src/lib/soccerSeasonAwards.ts): every goal is a chance at it, so an
 *    award's year must hold a season with a goal (it was 15 goals under the old bar), and the gate the control
 *    removes is now that file's eligibility line. scripts/simSoccerSeasonAwards.mjs section 3 holds all three years.
 *
 * Environment: SIM_CAREER_FORM_BASE (the ref the base arm reads), SIM_CAREER_FORM_SECTIONS (comma separated),
 * SIM_CAREER_FORM_SEED, SIM_CAREER_FORM_PIN_CAREERS, SIM_CAREER_FORM_FLEET, SIM_CAREER_FORM_FLEET_KIND,
 * SIM_CAREER_FORM_ERA, SIM_CAREER_FORM_WORKERS (section 4 child processes a side). A control runs only its own section.
 * Never reads the network. Exit 1 on any failure; the last line says green or red.
 */
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.SIM_CAREER_FORM_BASE || '2ab9bef153009a3144970e87755225a458ef0c3b';
const CONTROL = process.env.SIM_CAREER_FORM_CONTROL || '';
const CONTROLS = { divisor: '1', pageline: '2', zero: '3', posttext: '3', double: '3', per10: '4', legacy: '4', nogate: '5' };
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
  { id: 'nba', file: 'src/lib/nbaMyCareer.ts', arch: 'NBA_ARCHETYPES', start: 'startNbaCareer', season: 'simNbaSeason', progress: 'nbaProgress', k: 12 },
  { id: 'nfl', file: 'src/lib/nflMyCareer.ts', arch: 'ARCHETYPES', start: 'startCareer', season: 'simSeason', progress: 'progress', k: 10 },
  { id: 'mlb', file: 'src/lib/mlbMyCareer.ts', arch: 'MLB_ARCHETYPES', start: 'startMlbCareer', season: 'simMlbSeason', progress: 'mlbProgress', k: 12 },
  { id: 'nhl', file: 'src/lib/nhlMyCareer.ts', arch: 'NHL_ARCHETYPES', start: 'startNhlCareer', season: 'simNhlSeason', progress: 'nhlProgress', k: 12 },
];
const FORM = 'src/lib/careerForm.ts';
const NFL_DIVISOR = 'nfl: { per: 10, neutral: 60 },';
/* The base arm is this tree's own engine file with the one lifted line put back inline, with the divisor the copy
   had at BASE (k above, checked against BASE), so a later round's edits to the US engines sit in both arms and only
   the lift is compared (review of 2026-10-21: a whole file read at BASE would go red on the next US engine round). */
const LIFT_IMPORT = "import { moraleForm } from './careerForm';\n";
const unLift = (sport, head) => {
  const call = `moraleForm('${sport.id}', c.morale)`;
  if (head.split(LIFT_IMPORT).length !== 2 || head.split(call).length !== 2) return null;
  return head.replace(LIFT_IMPORT, '').replace(call, `(c.morale - 60) / ${sport.k}`);
};
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
    const head = read(sport.file), base = unLift(sport, head);
    if (head.includes('(c.morale - 60) /')) fail(`${sport.id}: ${sport.file} still carries its own copy of the morale term`);
    if (!head.includes(`moraleForm('${sport.id}', c.morale)`)) fail(`${sport.id}: ${sport.file} does not bind moraleForm('${sport.id}', c.morale)`);
    if (!atBase(sport.file).includes(`(c.morale - 60) / ${sport.k}`)) fail(`${sport.id}: at ${BASE.slice(0, 8)} the inline morale term did not divide by ${sport.k}, so the base arm is not the tree before the lift`);
    if (base === null) { fail(`${sport.id}: ${sport.file} does not hold the lift (its import and one moraleForm call) once`); continue; }
    const now = await bundle(`${sport.id}-head`, sport.file, formServe);
    const was = await bundle(`${sport.id}-base`, sport.file, { [sport.file]: base });
    const a = replay(now, sport, 6, 18), b = replay(was, sport, 6, 18);
    let first = -1;
    for (let i = 0; i < Math.max(a.length, b.length); i += 1) if (a[i] !== b[i]) { first = i; break; }
    const careers = Object.values(now[sport.arch]).reduce((n, list) => n + list.length, 0) * 6;
    console.log(`   ${sport.id}: ${careers} careers, ${a.length / 4} seasons replayed, ${first < 0 ? 'byte identical' : `parts at record ${first}`}`);
    if (a.length < careers * 8) fail(`${sport.id}: only ${a.length / 4} seasons were played, the replay is too thin to mean anything`);
    if (first >= 0) fail(`${sport.id}: this tree parts from its own engine with the morale term inline at record ${first} of ${a.length}`);
  }
}

/* ─── Soccer Career: the bundles ─── */
const ENGINE = 'src/lib/soccerCareerEngine.ts';
const STEP_LINE = "Math.round(moraleForm('soccer', morale as number)) || 0";
/* Round 1525: the Puskas gate is soccerSeasonAwards.ts's eligibility line now (the award is won against a field). */
const AWARDS = 'src/lib/soccerSeasonAwards.ts';
const GATE_LINE = "case 'Puskás Award': return s.goals > 0 && puskasAwardExists(s.year);";
const PRESS_MARK = 'function generateSeasonStats(state, clubs) {';
const AT_PRESS = 'const moraleAtPress = (state: CareerState): number => MORALE_AT_PRESS.get(state) ?? state.morale;';
const APPS_MARK = 'dressingRoomApps(phoneAppsSwing(state), moraleAtPress(state))';
/* the legacy control's line (section 4) */
const GOAT_LINE = 'if (score >= 90) return "GOAT";';
const FORM_IMPORT = 'import { dressingRoomApps, soccerMoraleRating } from "./careerForm";';
/* The hub line on the page (section 2 reads the wiring) and what a line says (sections 2 and 3 hold it to the step). */
const PAGE = 'src/pages/SoccerCareer.tsx';
const PAGE_CALL = 'soccerMoraleLine(career.morale)';
const PAGE_WIRED = `{career.phase === "playing" && !career.retired && !(career.matchFixBanned > 1) && !career.prisonSeasons && ( <p className="text-[10px] text-muted-foreground pl-16" data-morale-line>{${PAGE_CALL}}</p> )}`;
function sayOf(line) {
  const m = /^Morale \d+: (?:no swing|up to (\d) (more|fewer) league games?, rating ([+-]?\d(?:\.\d)?)) this season\.$/.exec(line);
  if (!m) return null;
  return m[1] ? { games: (m[2] === 'more' ? 1 : -1) * Number(m[1]), rating: Number(m[3]) } : { games: 0, rating: 0 };
}
async function soccer(name, { stepOff = false, noGate = false, postText = false, per10 = false, double = false, legacy = false } = {}) {
  const serve = {};
  if (per10) {
    const form = read(FORM), was = 'soccer: { per: 15, neutral: 81 },';
    if (form.split(was).length !== 2) { console.log(`ABORT: ${FORM} does not hold ${was} once`); process.exit(1); }
    serve[FORM] = form.replace(was, 'soccer: { per: 10, neutral: 81 },');
  }
  if (stepOff) {
    const form = read(FORM);
    if (form.split(STEP_LINE).length !== 2) { console.log(`ABORT: ${FORM} does not hold ${STEP_LINE} once`); process.exit(1); }
    serve[FORM] = form.replace(STEP_LINE, '0');
  }
  if (legacy) {
    const engine = serve[ENGINE] ?? read(ENGINE);
    if (engine.split(GOAT_LINE).length !== 2) { console.log(`ABORT: ${ENGINE} does not hold ${GOAT_LINE} once`); process.exit(1); }
    serve[ENGINE] = engine.replace(GOAT_LINE, GOAT_LINE.replace('90', '86'));
  }
  if (noGate) {
    const awards = read(AWARDS);
    if (awards.split(GATE_LINE).length !== 2) { console.log(`ABORT: ${AWARDS} does not hold ${GATE_LINE} once`); process.exit(1); }
    serve[AWARDS] = awards.replace(GATE_LINE, "case 'Puskás Award': return s.goals > 0;");
  }
  if (double) {
    let engine = serve[ENGINE] ?? read(ENGINE);
    for (const [was, now] of [[FORM_IMPORT, FORM_IMPORT.replace(' } from', ', soccerMoraleStep } from')], [APPS_MARK, `${APPS_MARK} + soccerMoraleStep(moraleAtPress(state))`]]) {
      if (engine.split(was).length !== 2) { console.log(`ABORT: ${ENGINE} does not hold ${was} once`); process.exit(1); }
      engine = engine.replace(was, now);
    }
    serve[ENGINE] = engine;
  }
  if (postText) {
    const engine = serve[ENGINE] ?? read(ENGINE);
    if (engine.split(AT_PRESS).length !== 2) { console.log(`ABORT: ${ENGINE} does not hold ${AT_PRESS} once`); process.exit(1); }
    serve[ENGINE] = engine.replace(AT_PRESS, 'const moraleAtPress = (state: CareerState): number => state.morale;');
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
  /* the league games calcAppearances settled on, before the freeze: the exact check of section 3 reads them */
  const at = text.indexOf(APPS_MARK);
  if (at < 0 || text.indexOf(APPS_MARK, at + 1) >= 0) { console.log('ABORT: the morale line of calcAppearances is not in the bundle once'); process.exit(1); }
  const end = text.indexOf(';', at) + 1;
  if (!/if \(state\) leagueApps = clamp\d*\(leagueApps \+ $/.test(text.slice(text.lastIndexOf('\n', at) + 1, at))) { console.log('ABORT: the morale line does not set leagueApps'); process.exit(1); }
  text = `${text.slice(0, end)}\n  if (globalThis.__sfApps) globalThis.__sfApps(leagueApps, state);${text.slice(end)}`;
  fs.writeFileSync(out, text);
  return import(pathToFileURL(out).href);
}
/* A seeded Math.random that counts its draws. */
let draws = 0;
const seedRandom = seed => { const r = mulberry(seed); draws = 0; Math.random = () => { draws += 1; return r(); }; };
const POS = ['ST', 'CM', 'CB', 'GK', 'LW', 'CAM', 'CDM', 'RB', 'RW', 'LB'];
const STAT_KEYS = ['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical', 'reflexes'];
function newCareer(S, i, { era = '2020-24', start = 2020, ovr = 56 + (i % 5) * 3, pos = POS[i % POS.length], name = 'Form Sim' } = {}) {
  const off = S.A.POSITION_OFFSETS[pos];
  const stats = Object.fromEntries(STAT_KEYS.map((k, j) => [k, Math.max(25, Math.min(99, ovr + off[j]))]));
  return S.E.initCareer(name, i % 2 ? 'England' : 'Spain', pos, era, stats, ovr, start, S.E.FALLBACK_CLUBS, null, Math.min(94, ovr + 20));
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
  const want = [[0, -2], [20, -2], [58, -2], [59, -1], [73, -1], [74, 0], [81, 0], [88, 0], [89, 1], [95, 1], [100, 1], [undefined, 0], [NaN, 0]];
  for (const [m, s] of want) if (F.soccerMoraleStep(m) !== s) fail(`soccerMoraleStep(${m}) is ${F.soccerMoraleStep(m)}, not ${s}`);
  if (Object.is(F.soccerMoraleStep(74), -0)) fail('soccerMoraleStep(74) is minus zero');
  for (const phone of [-3, -2, 0, 2, 3]) for (const m of [20, 81, 100]) {
    const got = F.dressingRoomApps(phone, m), cap = Math.max(-3, Math.min(3, phone + F.soccerMoraleStep(m)));
    if (got !== cap) fail(`dressingRoomApps(${phone}, ${m}) is ${got}, not ${cap}`);
    if (F.soccerMoraleStep(m) === 0 && got !== phone) fail(`a neutral morale moved the phone's ${phone} games to ${got}`);
  }
  for (const [m, r] of [[20, -0.2], [70, -0.1], [81, 0], [90, 0.1], [100, 0.1]]) if (F.soccerMoraleRating(m) !== r) fail(`soccerMoraleRating(${m}) is ${F.soccerMoraleRating(m)}, not ${r}`);
  /* The hub cannot know the phone the season is drawn with (the summer's texts move it at the press), so the line
     names the step as "up to" and the rating exactly; section 3 holds it against every press. */
  const lines = [[90, 'Morale 90: up to 1 more league game, rating +0.1 this season.'], [100, 'Morale 100: up to 1 more league game, rating +0.1 this season.'],
    [40, 'Morale 40: up to 2 fewer league games, rating -0.2 this season.'], [70, 'Morale 70: up to 1 fewer league game, rating -0.1 this season.'],
    [81, 'Morale 81: no swing this season.']];
  for (const [m, line] of lines) if (F.soccerMoraleLine(m) !== line) fail(`soccerMoraleLine(${m}) reads "${F.soccerMoraleLine(m)}"`);
  const dash = [String.fromCharCode(0x2013), String.fromCharCode(0x2014)];
  for (let m = 0; m <= 100; m += 1) {
    const said = sayOf(F.soccerMoraleLine(m)), s = F.soccerMoraleStep(m);
    if (dash.some(d => F.soccerMoraleLine(m).includes(d))) fail(`the hub line for ${m} holds a dash`);
    if (!said || said.games !== s || said.rating !== s / 10) fail(`the hub line for ${m} does not say step ${s}: "${F.soccerMoraleLine(m)}"`);
  }
  /* The page's wiring, read from the code with its comments stripped: one line under the Morale bar, fed the save's
     own morale, shown on a playing hub that will play its season (not before a ban or prison season). Control
     pageline feeds it another number and must fail here. */
  let page = read(PAGE);
  if (CONTROL === 'pageline') {
    if (page.split(PAGE_CALL).length !== 2) { console.log(`ABORT: ${PAGE} does not hold ${PAGE_CALL} once`); process.exit(1); }
    console.log('   CONTROL pageline: the page feeds the line his popularity');
    page = page.replace(PAGE_CALL, 'soccerMoraleLine(career.popularity)');
  }
  const code = page.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\s+/g, ' ');
  const wired = code.split(PAGE_WIRED).length - 1, marks = code.split('data-morale-line').length - 1;
  if (wired !== 1 || marks !== 1) fail(`the page draws the morale line ${wired} times as wired (${marks} data-morale-line marks): "${PAGE_WIRED}"`);
  console.log(`   neutral ${F.CAREER_FORM.soccer.neutral}, ${F.CAREER_FORM.soccer.per} morale points a step; ${want.length} steps, 15 caps, 5 ratings, ${lines.length} hub lines and 101 said steps checked, the page wired ${wired} time(s)`);
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
  if (CONTROL === 'posttext') console.log('   CONTROL posttext: the season reads the morale the summer\'s texts leave, not the one he pressed on');
  if (CONTROL === 'double') console.log('   CONTROL double: calcAppearances adds his morale step a second time, past the cap');
  const S = await soccer(CONTROL ? `pin-${CONTROL}` : 'pin', { stepOff: CONTROL === 'zero', postText: CONTROL === 'posttext', double: CONTROL === 'double' });
  const OFF = await soccer('pin-off', { stepOff: true });
  const NEUTRAL = S.F.CAREER_FORM.soccer.neutral, PINS = [20, NEUTRAL, 90];
  const N = Number(process.env.SIM_CAREER_FORM_PIN_CAREERS || 120);
  const got = PINS.map(() => ({ league: [], rating: [] }));
  let presses = 0, exact = 0, clamped = 0, mismatch = 0, neutralSame = 0, neutralDiffer = 0, lowDrawsSame = 0, lowDrawsDiffer = 0;
  let lineChecked = 0, lineWrong = 0, lineShort = 0, oldLineWrong = 0;
  let seen = null;
  globalThis.__sfApps = (leagueApps, st) => { seen = { leagueApps, phone: S.P.phoneAppsSwing(st) }; };
  for (let i = 0; i < N; i += 1) {
    seedRandom(SEED * 1000 + i);
    let c = newCareer(S, i);
    for (let k = 0; k < 1500 && !c.retired; k += 1) {
      if (c.phase === 'playing') {
        const snap = JSON.stringify(c), seed = SEED * 7919 + i * 131 + k;
        const at = (E, morale) => { seen = null; const r = aside(seed, () => E.advanceProSeason({ ...JSON.parse(snap), morale }, E.FALLBACK_CLUBS)); return { ...r, seen }; };
        const runsAt = PINS.map(p => at(S.E, p));
        const rows = runsAt.map(r => playedRow(c, r.value));
        if (rows.every(Boolean) && runsAt.every(r => r.seen)) {
          presses += 1;
          rows.forEach((row, j) => { got[j].league.push(row.leagueApps ?? row.apps); got[j].rating.push(row.rating); });
          /* exact: calcAppearances' league games less the designed joint step (phone plus the step of the morale he
             pressed on, capped at three) are the same number at every pin, wherever the 0 to 38 clamp did not bite */
          if (runsAt.every(r => r.seen.leagueApps > 0 && r.seen.leagueApps < 38)) {
            const rest = runsAt.map((r, j) => r.seen.leagueApps - S.F.dressingRoomApps(r.seen.phone, PINS[j]));
            if (rest.every(v => v === rest[0])) exact += 1; else mismatch += 1;
            /* the hub line against the press: what the line for the morale he pressed on says ("up to" the step)
               must hold the games this morale moved against the neutral pin, the same press, the same dice. The
               line the round first shipped (the cap worked out with the hub's phone) is counted beside it. */
            const hubPhone = S.P.phoneAppsSwing(JSON.parse(snap));
            PINS.forEach((p, j) => {
              const said = sayOf(S.F.soccerMoraleLine(p)), moved = runsAt[j].seen.leagueApps - runsAt[1].seen.leagueApps;
              lineChecked += 1;
              if (!said || moved * said.games < 0 || Math.abs(moved) > Math.abs(said.games)) lineWrong += 1;
              else if (moved !== said.games) lineShort += 1;
              if (S.F.dressingRoomApps(hubPhone, p) - hubPhone !== moved) oldLineWrong += 1;
            });
          } else clamped += 1;
          const offNeutral = at(OFF.E, NEUTRAL), offLow = at(OFF.E, 20);
          if (JSON.stringify(offNeutral.value) === JSON.stringify(runsAt[1].value) && offNeutral.draws === runsAt[1].draws) neutralSame += 1; else neutralDiffer += 1;
          if (offLow.draws === runsAt[0].draws) lowDrawsSame += 1; else lowDrawsDiffer += 1;
        }
      }
      c = step(S, c);
    }
  }
  globalThis.__sfApps = null;
  const lm = got.map(g => meanOf(g.league)), rm = got.map(g => meanOf(g.rating));
  console.log(`   ${N} careers, ${presses} presses played three ways (seed ${SEED})`);
  console.log(`   league games: morale 20 ${f2(lm[0])}, ${NEUTRAL} ${f2(lm[1])}, 90 ${f2(lm[2])}; rating ${f2(rm[0])}, ${f2(rm[1])}, ${f2(rm[2])}`);
  console.log(`   gaps: games ${f2(lm[1] - lm[0])} and ${f2(lm[2] - lm[1])}, rating ${f2(rm[1] - rm[0])} and ${f2(rm[2] - rm[1])}`);
  console.log(`   exact: ${exact} presses moved by exactly the designed step at every pin, ${mismatch} did not, ${clamped} left out where 0 or 38 bit`);
  console.log(`   at the neutral point the round's arm and the arm without the step: ${neutralSame} presses byte identical with the same draws, ${neutralDiffer} not`);
  console.log(`   at morale 20 the two arms made the same number of draws in ${lowDrawsSame} presses and a different number in ${lowDrawsDiffer} (draws after the league games move with them)`);
  if (presses < N * 8) fail(`only ${presses} presses were played three ways`);
  if (exact < presses * 0.8) fail(`only ${exact} of ${presses} presses were checked exactly`);
  if (mismatch) fail(`${mismatch} presses moved league games by something other than the designed step of the morale he pressed on`);
  if (neutralDiffer) fail(`${neutralDiffer} presses at the neutral point differ from the arm without the step`);
  console.log(`   the hub line: ${lineChecked} pinned presses read against the games they played, ${lineWrong} did not fit what the line said, ${lineShort} played fewer than "up to" (the shared cap); the cap worked out with the hub's phone would have been wrong in ${oldLineWrong}`);
  if (lineChecked < exact * 3) fail(`only ${lineChecked} pinned presses were read against the hub line`);
  if (lineWrong) fail(`the hub line was wrong about the league games in ${lineWrong} pinned presses`);
  /* Floors from measured headroom (see the header): each gap must clear its floor. */
  const FLOORS = { g1: 0.05, g2: 0.5, r1: 0.1, r2: 0.07 };
  const gaps = { g1: lm[1] - lm[0], g2: lm[2] - lm[1], r1: rm[1] - rm[0], r2: rm[2] - rm[1] };
  for (const [k, floor] of Object.entries(FLOORS)) if (!(gaps[k] >= floor)) fail(`gap ${k} is ${f2(gaps[k])}, under its floor ${floor}`);
}

const TIERS = ['GOAT', 'LEGEND', 'GREAT', 'SOLID PRO', 'JOURNEYMAN'];
/* Section 4's ceilings, per fleet (review of 2026-10-21: at 1,200 careers the engaged Ballon d'Or bound of 8 went red
   at 2 of 8 fresh seeds, a coin toss, and a tier bound of 6 sat two to five times past the headroom).
   MEASURED HEADROOM, the no step arm's own spread between seed bases at 1,200 careers, now over every seed measured
   (house 7 seeds: 1523, 2024, 77, 9001, 31337, 4242, 606; engaged 11: 1523, 2024, 77, 9001, 31337, 5, 123, 777, 2026,
   8080, 55555; remote checks r1523-m5, m6, final-a2, run-b and run-b2): house Ballon d'Or 7.0 per 100 careers, GOAT
   2.9, LEGEND 2.1, GREAT 2.7, SOLID PRO 3.2, JOURNEYMAN 3.0 points; engaged 6.6, 3.2, 5.3, 4.3, 2.9 and 2.5. (The
   first three seeds alone gave 4.9 to 1.2 for the engaged rows, which is why three rows read as past it.)
   THE ROUND'S SHIFT, mean over the same seeds (sd of one 1,200 career run): house league games +0.29 (0.04), rating
   0.00, Ballon d'Or -0.1 (2.7), GOAT -0.1 (1.1), LEGEND +1.4 (0.9), GREAT +0.7 (1.4), SOLID PRO 0.0 (1.3), JOURNEYMAN
   -1.9 (2.2); engaged league +0.94 (0.07), rating +0.12 (0.01), Ballon d'Or +5.1 (3.0), GOAT +1.8 (1.2), LEGEND +2.0
   (1.4), GREAT -1.6 (1.6), SOLID PRO -1.5 (1.2), JOURNEYMAN -0.7 (0.8). Every mean is inside its headroom; the
   nearest are the engaged Ballon d'Or (5.1 of 6.6), house JOURNEYMAN (1.9 of 3.0) and house LEGEND (1.4 of 2.1).
   THE CHECK. One 1,200 career run is too noisy to hold a row to its headroom (a Ballon d'Or shift's sd is 3), so the
   fleet is 9,600 careers (FLEET_CAREERS, eight times the noise power, split over worker processes; the split changes
   nothing: 120 careers in one process and in four print the same blocks, remote check r1523-fx-s4a) and each ceiling
   is the row's headroom and half again, never above the old 8 and 6.
   MEASURED AT 9,600 CAREERS (remote checks r1523-fx-s4a and r1523-fx-s4b on e408a525, seeds 1523 and 2024), the
   shift: house league games +0.25 and +0.28, rating 0.00 and 0.00, Ballon d'Or +0.75 and +1.00, GOAT +0.4 and +0.3,
   LEGEND +1.1 and +1.1, GREAT -0.2 and +0.7, SOLID PRO -0.3 and -0.7, JOURNEYMAN -1.0 and -1.4; engaged league
   +1.00 and +1.00, rating +0.13 and +0.13, Ballon d'Or +3.14 and +4.84, GOAT +1.5 and +2.0, LEGEND +1.9 and +1.1,
   GREAT -1.1 and -0.1, SOLID PRO -1.2 and -1.8, JOURNEYMAN -1.1 and -1.2. Every row inside its headroom (and inside
   the first three seeds' headroom too, but for the engaged GOAT row, 1.75 against 1.2). The nearest ceilings in sd of
   a 9,600 career shift: engaged Ballon d'Or 3 (4.84 against 8, sd about 1.05), engaged league games 4 (1.00 against
   1.1, sd about 0.025), house JOURNEYMAN 4 (1.4 against 4.5).
   CONTROLS at 9,600 (r1523-fx-s4c): per10, the rejected design (10 points a step), breaks the league ceiling in both
   fleets (house +0.57 past 0.5; engaged +1.41 past 1.1, with rating +0.23 past 0.17 and the Ballon d'Or +8.38 past
   8) but moves no tier past its ceiling (3.0 points at most; the 400 career readings of r1523-var that said six were
   noise), so control legacy (the round's arm alone calls a career GOAT from a legacy score of 86) is the one that
   proves the tier rows can fail. */
const FLEET_CAREERS = 9600;
const BOUNDS = {
  house: { league: 0.5, rating: 0.06, bdor: 8, GOAT: 4.4, LEGEND: 3.2, GREAT: 4.1, 'SOLID PRO': 4.8, JOURNEYMAN: 4.5 },
  engaged: { league: 1.1, rating: 0.17, bdor: 8, GOAT: 4.8, LEGEND: 6, GREAT: 6, 'SOLID PRO': 4.4, JOURNEYMAN: 3.8 },
};
/* A whole career, Math.random seeded from the career's index. The house fleet never opens the phone; the engaged
   fleet answers every waiting text (its first choice) before each press, which keeps its morale near the top. */
function wholeCareer(S, i, seedBase, opts, engaged = false) {
  seedRandom(seedBase * 1000 + i);
  let c = newCareer(S, i, opts);
  for (let k = 0; k < 2000 && !c.retired; k += 1) {
    if (engaged && c.phase === 'playing') for (let r = 0; r < 6; r += 1) {
      const t = (c.phone?.threads ?? []).find(th => th.pending);
      const next = t ? S.E.answerPhoneText(c, t.id, 0) : c;
      if (next === c) break;
      c = next;
    }
    c = step(S, c);
  }
  return c;
}
function fleetSums(S, n, seedBase, engaged = false, w = 0, W = 1) {
  const sums = { n: 0, bdor: 0, seasons: 0, league: 0, rating: 0, morale: 0, presses: 0, tiers: Object.fromEntries(TIERS.map(t => [t, 0])) };
  globalThis.__sfPress = st => { sums.morale += st.morale; sums.presses += 1; };
  for (let i = w; i < n; i += W) {
    const c = wholeCareer(S, i, seedBase, undefined, engaged);
    sums.n += 1;
    for (const row of c.seasons) if (row.type === 'playing' && row.clubTier < 99) { sums.seasons += 1; sums.league += row.leagueApps ?? row.apps; sums.rating += row.rating; if (row.ballonDor) sums.bdor += 1; }
    sums.tiers[S.E.calculateLegacy(c).tier] += 1;
  }
  globalThis.__sfPress = null;
  return sums;
}
const blockOf = list => {
  const s = list.reduce((a, b) => ({ ...Object.fromEntries(['n', 'bdor', 'seasons', 'league', 'rating', 'morale', 'presses'].map(k => [k, a[k] + b[k]])),
    tiers: Object.fromEntries(TIERS.map(t => [t, a.tiers[t] + b.tiers[t]])) }));
  return { n: s.n, bdor: (100 * s.bdor) / s.n, seasons: s.seasons, league: s.league / s.seasons, rating: s.rating / s.seasons, morale: s.morale / s.presses,
    tiers: Object.fromEntries(TIERS.map(t => [t, (100 * s.tiers[t]) / s.n])) };
};
/* The fleet is split over worker processes (SIM_CAREER_FORM_WORKERS a side, default 4, so 8 at once for the two
   arms): each child plays the careers whose index falls to it, for one arm, and prints its sums on one line. Every
   career is seeded from its own index, so the split changes nothing but the wall time. */
/* Control legacy: the round's arm alone calls a career GOAT from a legacy score of 86, not 90, which moves the tier
   shares by more than their ceilings: it proves the tier rows can fail, which the rejected design does not show
   (per10 moves tiers by 3 points at most at 9,600 careers). */
const ARM = { off: ['fleet-off', { stepOff: true }], head: ['fleet-head', {}], per10: ['fleet-per10', { per10: true }], legacy: ['fleet-legacy', { legacy: true }] };
async function fleetBlock(arm, n, engaged) {
  const W = Math.max(1, Number(process.env.SIM_CAREER_FORM_WORKERS || 4));
  if (W === 1) return blockOf([fleetSums(await soccer(...ARM[arm]), n, SEED, engaged)]);
  const kids = Array.from({ length: W }, (_, w) => new Promise((resolve, reject) => {
    const env = { ...process.env, SIM_CAREER_FORM_SLICE: `${arm}:${w}:${W}:${n}:${engaged ? 1 : 0}`, SIM_CAREER_FORM_SECTIONS: '4' };
    const child = spawn(process.execPath, [fileURLToPath(import.meta.url)], { env, stdio: ['ignore', 'pipe', 'inherit'] });
    let out = '';
    child.stdout.on('data', d => { out += d; });
    child.on('close', code => {
      const line = out.split('\n').find(l => l.startsWith('SLICE '));
      if (code === 0 && line) resolve(JSON.parse(line.slice(6)));
      else reject(new Error(`the ${arm} slice ${w} of ${W} exited ${code}: ${out.slice(-400)}`));
    });
  }));
  return blockOf(await Promise.all(kids));
}
if (process.env.SIM_CAREER_FORM_SLICE) {
  const [arm, w, W, n, engaged] = process.env.SIM_CAREER_FORM_SLICE.split(':');
  if (!ARM[arm]) { console.log(`ABORT: unknown slice arm ${arm}`); process.exit(1); }
  const sums = fleetSums(await soccer(`${ARM[arm][0]}-${w}`, ARM[arm][1]), Number(n), SEED, engaged === '1', Number(w), Number(W));
  console.log(`SLICE ${JSON.stringify(sums)}`);
  process.exit(0);
}
const showBlock = (name, b) => console.log(`   ${name.padEnd(9)} ${b.n} careers, ${b.seasons} seasons, morale ${b.morale.toFixed(1)} as the engine reads it: Ballon d'Or ${f2(b.bdor)} per 100 careers, league games ${f2(b.league)}, rating ${f2(b.rating)}; legacy ${TIERS.map(t => `${t} ${b.tiers[t].toFixed(1)}%`).join(', ')}`);

if (runs('4')) {
  const FLEET = process.env.SIM_CAREER_FORM_FLEET_KIND || 'house';
  if (!['house', 'engaged'].includes(FLEET)) { console.log(`ABORT: unknown SIM_CAREER_FORM_FLEET_KIND ${FLEET}`); process.exit(1); }
  console.log(`4) the natural fleet (${FLEET}): the round against the same tree without the morale step, same seeds`);
  const N = Number(process.env.SIM_CAREER_FORM_FLEET || FLEET_CAREERS);
  const ARMS = process.env.SIM_CAREER_FORM_ARMS || 'both';
  if (ARMS === 'off') {
    showBlock('no step', await fleetBlock('off', N, FLEET === 'engaged'));
    console.log('   the no step arm alone (SIM_CAREER_FORM_ARMS=off): a headroom reading, nothing asserted');
  } else {
    if (CONTROL === 'per10') console.log('   CONTROL per10: the rejected design, 10 morale points a step, in this tree\'s bundle');
    if (CONTROL === 'legacy') console.log('   CONTROL legacy: the round\'s arm calls a career GOAT from a legacy score of 86');
    const [off, head] = await Promise.all([fleetBlock('off', N, FLEET === 'engaged'), fleetBlock(['per10', 'legacy'].includes(CONTROL) ? CONTROL : 'head', N, FLEET === 'engaged')]);
    showBlock('round', head);
    showBlock('no step', off);
    const shift = { bdor: head.bdor - off.bdor, league: head.league - off.league, rating: head.rating - off.rating };
    const tierShift = Object.fromEntries(TIERS.map(t => [t, head.tiers[t] - off.tiers[t]]));
    console.log(`   shift: Ballon d'Or ${f2(shift.bdor)} per 100, league games ${f2(shift.league)}, rating ${f2(shift.rating)}; legacy ${TIERS.map(t => `${t} ${tierShift[t].toFixed(1)}`).join(', ')} points`);
    if (N >= FLEET_CAREERS) {
      /* Ceilings from the measured headroom, at the fleet size they were set for (see BOUNDS). */
      const BOUND = BOUNDS[FLEET];
      if (!(shift.league > 0)) fail(`league games a season moved ${f2(shift.league)}, so a settled head gained nothing`);
      if (shift.league > BOUND.league) fail(`league games a season moved ${f2(shift.league)}, past ${BOUND.league}`);
      if (Math.abs(shift.rating) > BOUND.rating) fail(`the season rating moved ${f2(shift.rating)}, past ${BOUND.rating}`);
      if (Math.abs(shift.bdor) > BOUND.bdor) fail(`the Ballon d'Or rate moved ${f2(shift.bdor)} per 100 careers, past ${BOUND.bdor}`);
      for (const t of TIERS) if (Math.abs(tierShift[t]) > BOUND[t]) fail(`the ${t} share moved ${tierShift[t].toFixed(1)} points, past ${BOUND[t]}`);
    } else console.log(`   ${N} careers is under the ${FLEET_CAREERS} the ceilings are set for, so they are not asserted`);
    if (head.seasons < N * 10) fail(`only ${head.seasons} seasons were played`);
  }
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
    /* Round 1525: each career its own name. The award is decided on a stream keyed to the career's identity (name,
       era, nation, position) and the season, and i % 4 picks the era, the position and the nation together, so under
       one name the fleet held four identities and so about four draws a season. */
    const opts = { era, start, ovr: 70 + (i % 4) * 3, pos: ATT[i % ATT.length], name: `Form Era ${i}` };
    const c = wholeCareer(S, i, SEED + 5, opts);
    for (const a of c.awards ?? []) {
      if (a.name !== PUSKAS) continue;
      if (a.year < 2008) before += 1; else from += 1;
      if (!c.seasons.some(row => row.type === 'playing' && row.year === a.year && row.goals >= 1)) offRow += 1;
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
  console.log(`   ${N} careers from 1990, 1995, 2000 and 2005 (seed ${SEED + 5}): ${before} awards before 2008-09, ${from} from it, ${offRow} on a year without a goal`);
  if (U !== S) console.log(`   the ungated tree won one before 2008-09 in ${kept} lockstep careers; the gated tree made the same draws and kept the same state in ${kept - keptBad}`);
  if (before > 0) fail(`${before} Puskas Awards were won in seasons before 2008-09`);
  if (from === 0) fail('nobody won a Puskas Award from 2008-09 on either, so the fleet proves nothing');
  if (offRow > 0) fail(`${offRow} awards carry a year with no goal scored, so the award year is not the season's`);
  if (U !== S && kept === 0) fail('no lockstep career reached a pre 2008 award on the ungated tree, so the kept draw is unproven');
  if (keptBad > 0) fail(`${keptBad} lockstep careers parted from the ungated tree beyond the award itself`);
}

console.log(failures.length ? `simCareerForm: RED, ${failures.length} failure(s)` : 'simCareerForm: green');
process.exit(failures.length ? 1 : 0);
