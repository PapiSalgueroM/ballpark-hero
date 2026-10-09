import './lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const BASE = '4ab80fa978cf362427bcd024c64c6691e7f83c2a';
export const NOW = 1791547200000;
const OUT = path.resolve(ROOT, process.env.CAREER_DEVELOPMENT_ARTIFACTS || '.tmp-fx/career-development-outcomes');
const IMPORT_ONLY = process.env.CAREER_DEVELOPMENT_IMPORT_ONLY === '1';
const require = createRequire(path.join(ROOT, 'package.json'));
const normalize = source => source.replaceAll('\r\n', '\n');
const hash = value => createHash('sha256').update(value).digest('hex');
const files = ['src/lib/soccerCareerEngine.ts', 'src/lib/soccerCareerSelection.ts', 'src/lib/soccerClubSquad.ts',
  'src/lib/soccerClubSquadSheet.ts', 'src/lib/soccerCareerPreparation.ts', 'src/lib/soccerCareerMentor.ts', 'scripts/simSoccerCareerDevelopment.mjs'];
const hashes = () => Object.fromEntries(files.map(file => [file, hash(fs.readFileSync(path.join(ROOT, file)))]));

export async function developmentBundle({ baseline = false, patches = [] } = {}) {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'career-development-'));
  const applied = new Set(), originals = new Map();
  const source = relative => {
    if (!originals.has(relative)) originals.set(relative, normalize(baseline
      ? execFileSync('git', ['show', `${BASE}:${relative}`], { cwd: ROOT, encoding: 'utf8' })
      : fs.readFileSync(path.join(ROOT, relative), 'utf8')));
    return originals.get(relative);
  };
  try {
    const entry = "export * as soccer from './src/lib/soccerCareerEngine';" + (baseline ? ''
      : "export * as form from './src/lib/soccerCareerSelection'; export * as squad from './src/lib/soccerClubSquad'; export * as sheet from './src/lib/soccerClubSquadSheet'; export * as preparation from './src/lib/soccerCareerPreparation'; export * as mentor from './src/lib/soccerCareerMentor';");
    const output = path.join(temporary, 'engine.cjs');
    await build({ stdin: { contents: entry, resolveDir: ROOT, loader: 'ts' }, absWorkingDir: ROOT,
      bundle: true, format: 'cjs', platform: 'node', jsx: 'automatic', outfile: output, logLevel: 'error',
      alias: { '@': path.join(ROOT, 'src') }, define: { 'import.meta.env': '{"DEV":false,"PROD":true,"MODE":"production"}' },
      loader: { '.css': 'empty', '.png': 'empty', '.svg': 'empty', '.jpg': 'empty', '.webp': 'empty' },
      plugins: [{ name: 'held-development-source', setup(builder) {
        builder.onLoad({ filter: /\.(ts|tsx)$/ }, args => {
          const relative = path.relative(ROOT, args.path).replaceAll('\\', '/');
          if (!relative.startsWith('src/')) return undefined;
          let contents = source(relative);
          for (const patch of patches.filter(patch => patch.file === relative)) {
            assert.equal(contents.split(patch.from).length, 2, `${patch.name}: copied defect anchor must be unique`);
            const changed = contents.replace(patch.from, patch.to);
            assert.notEqual(changed, contents, `${patch.name}: copied defect must change source`);
            contents = changed; applied.add(patch.name);
          }
          return { contents, loader: relative.endsWith('.tsx') ? 'tsx' : 'ts' };
        });
      } }],
    });
    assert.equal(applied.size, patches.length, 'Every copied source defect is loaded into the actual engine');
    return require(output);
  } finally { fs.rmSync(temporary, { recursive: true, force: true }); }
}
export function developmentFixture(bundle, extra = {}) {
  const saved = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/careerLeagueWorldSaves1100.json'), 'utf8'));
  const captured = saved.saves.find(save => save.id === 'ere'); assert(captured, 'Captured senior career exists');
  const state = bundle.soccer.repairCareer(structuredClone(captured.state));
  state.playerName = 'Development Fixture'; state.age = 24; state.phase = 'playing';
  state.retired = false; state.isFinalSeason = false; state.contractYearsLeft = 4;
  state.pendingSummary = null; state.pendingBallonDor = null; state.pendingNews = []; state.pendingEvents = [];
  state.pendingAppealResult = null; state.pendingMoralDilemma = null; state.pendingRehab = null;
  state.transferSituation = null; state.frozenOut = 0; state.badSeasonStreak = 0; state.loan = null;
  state.pedActive = false; state.corruptionHeat = 0; state.matchFixBanned = 0; state.prisonSeasons = 0;
  delete state.seasonAmbition;
  delete state.seasonPreparation;
  delete state.mentor;
  state.seasons[state.seasons.length - 1].rating = 7;
  return Object.assign(state, extra);
}
export function seeded(seed, fn) {
  const random = Math.random, OriginalDate = Date, draws = []; let value = seed >>> 0;
  globalThis.Date = class extends OriginalDate { constructor(...args) { super(...(args.length ? args : [NOW])); } static now() { return NOW; } };
  Math.random = () => { value = (value + 0x6d2b79f5) >>> 0; let x = Math.imul(value ^ (value >>> 15), 1 | value);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; const result = ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    draws.push(result); return result; };
  try { return { value: fn(), draws }; } finally { Math.random = random; globalThis.Date = OriginalDate; }
}
const serial = value => JSON.stringify(value);
const advance = (bundle, input, seed) => seeded(seed, () => bundle.soccer.advanceProSeason(structuredClone(input), bundle.soccer.FALLBACK_CLUBS));
function previous(state, extra = {}) { return { ...state.seasons.at(-1), year: state.seasons.at(-1).year + 1, club: state.currentClub,
  type: 'playing', apps: 30, leagueApps: 30, rating: 7, injurySevere: false, ...extra }; }
function updatedMentorMetadata(value, metadata) {
  const expected = JSON.parse(serial(value));
  for (const event of expected.pendingEvents || []) if (event.id === 6) {
    assert.equal(event.description, 'You mentor a 16-year-old youth player at your club who shows incredible promise.');
    assert.equal(event.choices[0].consequence, 'Legacy +5, Youth player may become rival later');
    event.description = metadata.description;
    event.choices[0].consequence = metadata.choices[0].consequence;
  }
  return expected;
}

if (!IMPORT_ONLY) {
  fs.mkdirSync(OUT, { recursive: true });
  const engine = 'src/lib/soccerCareerEngine.ts', preparation = 'src/lib/soccerCareerPreparation.ts', mentor = 'src/lib/soccerCareerMentor.ts';
  const engineSource = normalize(fs.readFileSync(path.join(ROOT, engine), 'utf8'));
  assert.equal([...engineSource.matchAll(/^[ \t]+settleCareerPreparation\(s, [^\n]+;$/gm)].length, 8, 'All eight recorded-year settlement hooks are held');
  assert.equal(engineSource.split('s.phase = "retirement_suggestion";').length - 1, 2, 'Both actual retirement pause paths are held');
  const controls = {
    formEligibility: { file: 'src/lib/soccerCareerSelection.ts', from: 'row.leagueApps < 10', to: 'row.leagueApps < 1', fails: ['form eligibility'] },
    formBoundary: { file: 'src/lib/soccerCareerSelection.ts', from: 'row.rating >= 7.6', to: 'row.rating >= 8', fails: ['form boundaries', 'form projections and actual draws'] },
    formDraw: { file: engine, from: ' + recentClubForm(state).swing', to: '', fails: ['form projections and actual draws'] },
    formRng: { file: 'src/lib/soccerCareerSelection.ts', from: '  const none: RecentClubForm = ', to: '  Math.random();\n  const none: RecentClubForm = ', fails: ['form purity and chronology', 'neutral complete saves and RNG against actual PR208'] },
    trustForm: { file: 'src/lib/soccerClubSquad.ts', from: ' + form.swing', to: '', fails: ['form projections and actual draws'] },
    sheetForm: { file: 'src/lib/soccerClubSquadSheet.ts', from: "export function planLine(trust: Trust): string {\n  if (trust.frozen) return 'The plan: frozen out, 8 league games at most.';\n  const a = clampN(trust.band.min + trust.swing + trust.form.swing, 0, 38);", to: "export function planLine(trust: Trust): string {\n  if (trust.frozen) return 'The plan: frozen out, 8 league games at most.';\n  const a = clampN(trust.band.min + trust.swing, 0, 38);", fails: ['form projections and actual draws'] },
    neutralDraw: { file: engine, from: '  let leagueApps = rand(leagueMin, leagueMax);', to: '  Math.random();\n  let leagueApps = rand(leagueMin, leagueMax);', fails: ['form projections and actual draws', 'neutral complete saves and RNG against actual PR208'] },
    planPhase: { file: preparation, from: "prev.retired || prev.phase !== 'playing'", to: 'prev.retired', fails: ['plan choice binding and risk'] },
    planBinding: { file: preparation, from: 'held.year === year', to: 'true', fails: ['plan choice binding and risk', 'plan interruptions and foreign targets'] },
    planConsume: { file: preparation, from: 'delete career.seasonPreparation;', to: ';', fails: ['plan skill caps and once-only settlement', 'plan interruptions and foreign targets', 'actual recorded plan growth and mentor credit', 'actual interruption paths'] },
    planOnce: { file: preparation, from: 'row.preparation || ', to: '', fails: ['plan skill caps and once-only settlement'] },
    planRisk: { file: engine, from: '  if (state) injuryChance += preparationInjuryDelta(state);', to: ';', fails: ['actual injury risk'] },
    riskCap: { file: engine, from: '  injuryChance = clamp(injuryChance, 0.04, 0.42);', to: '  injuryChance = clamp(injuryChance, 0.04, 0.50);', fails: ['actual injury risk'] },
    planGrowth: { file: engine, from: '  applyCareerPreparation(s, season);', to: '  void s;', fails: ['actual recorded plan growth and mentor credit'] },
    planInterrupted: { file: engine, from: engineSource, to: engineSource.replace(/^[ \t]+settleCareerPreparation\(s, (?!season\))[^\n]+;$/gm, ''), fails: ['actual interruption paths'] },
    planPause: { file: engine, from: engineSource, to: engineSource.replaceAll('s.phase = "retirement_suggestion";', 's.phase = "retirement_suggestion";\n      delete s.seasonPreparation;'), fails: ['actual moves and retirement'] },
    mentorRng: { file: mentor, from: '  const draw = mentorDraw(', to: '  Math.random();\n  const draw = mentorDraw(', fails: ['mentor deterministic creation and saved rows', 'actual Youth Mentor choice keeps old effects and RNG'] },
    mentorOnce: { file: mentor, from: 'row.year <= mentor.lastYear', to: 'row.year < mentor.lastYear', fails: ['mentor deterministic creation and saved rows'] },
    mentorMinimum: { file: mentor, from: 'row.apps >= 10', to: 'row.apps >= 1', fails: ['mentor pauses graduation and moves'] },
    mentorGraduate: { file: mentor, from: "progress === 3 ? 'graduated'", to: "progress === 4 ? 'graduated'", fails: ['mentor pauses graduation and moves'] },
    mentorRemember: { file: engine, from: 'state.mentor ? "Remember your academy mentorship" : "Take them under your wing"', to: '"Take them under your wing"', fails: ['repeated Youth Mentor event preserves every saved spell'] },
    mentorMove: { file: mentor, from: 'destination === mentor.club', to: 'true', fails: ['mentor pauses graduation and moves', 'actual moves and retirement'] },
    mentorRetire: { file: mentor, from: 'export function endCareerMentorForRetirement(state: CareerState): CareerState {', to: 'export function endCareerMentorForRetirement(state: CareerState): CareerState {\n  return state;', fails: ['mentor retirement', 'actual moves and retirement'] },
    mentorRecord: { file: engine, from: '  Object.assign(s, recordMentorSeason(s, season));', to: '  void s;', fails: ['actual recorded plan growth and mentor credit'] },
  };
  const CONTROL = process.env.CAREER_DEVELOPMENT_CONTROL || '';
  for (const [name, control] of Object.entries(controls)) { control.name = name; assert.notEqual(control.from, control.to, `${name}: effective copied source required`); }
  if (CONTROL === 'all') {
    const results = [];
    for (const name of ['', ...Object.keys(controls)]) {
      const destination = name ? path.join(OUT, 'controls', name) : OUT;
      const child = spawnSync(process.execPath, [fileURLToPath(import.meta.url)], { cwd: ROOT, windowsHide: true,
        env: { ...process.env, CAREER_DEVELOPMENT_CONTROL: name, CAREER_DEVELOPMENT_IMPORT_ONLY: '0', CAREER_DEVELOPMENT_ARTIFACTS: destination },
        encoding: 'utf8', timeout: 240000, maxBuffer: 16 * 1024 * 1024 });
      fs.mkdirSync(destination, { recursive: true }); fs.writeFileSync(path.join(destination, 'child.log'), `${child.stdout || ''}\n${child.stderr || ''}`);
      assert(!child.error && !child.signal, `${name || 'healthy'} completed its actual outcomes`);
      const receipt = JSON.parse(fs.readFileSync(path.join(destination, 'report.json'), 'utf8'));
      assert.equal(receipt.cases.length, 18, 'All eighteen outcome groups execute in every arm');
      const failed = receipt.cases.filter(row => row.status === 'failed');
      assert(receipt.sourceHeld && receipt.cases.find(row => row.name === 'uncopied complete PR208 baseline')?.status === 'passed');
      assert.equal(child.status, name ? 1 : 0, `${name || 'healthy'} has its required exit status`);
      assert.deepEqual(failed.map(row => row.name).sort(), name ? controls[name].fails.slice().sort() : [], `${name || 'healthy'} fails only its exact intended outcome identities`);
      assert(failed.every(row => row.errorName === 'AssertionError'), 'Import errors and runtime exceptions never count as a defect caught');
      results.push({ name: name || 'healthy', status: child.status, failed: failed.map(row => row.name), sourceHeld: receipt.sourceHeld });
      if (!name) process.stdout.write(child.stdout); else console.log(`ok   copied ${name} defect caught only by its intended outcomes`);
    }
    fs.writeFileSync(path.join(OUT, 'controls.json'), JSON.stringify(results, null, 2));
    console.log(`simSoccerCareerDevelopment: healthy outcomes passed, ${Object.keys(controls).length} effective controls caught`);
    process.exit(0);
  }
  assert(!CONTROL || controls[CONTROL], 'Known development control required');
  const activePatches = CONTROL ? [controls[CONTROL]] : [];
  const report = { base: BASE, control: CONTROL, sourceBefore: hashes(), cases: [], baselinePairs: 0, uncopiedPairs: 0, formDrawPairs: 0, planSeasons: 0, mentorSeasons: 0, interruptionPaths: 0 };
  const B = await developmentBundle({ patches: activePatches }), original = CONTROL ? await developmentBundle() : B, old = await developmentBundle({ baseline: true });
  const mentorMetadata = seeded(118500, () => B.soccer.getAllEvents(developmentFixture(B)).find(event => event.id === 6)).value;
  async function check(name, fn) {
    try { await fn(); report.cases.push({ name, status: 'passed' }); console.log(`ok   ${name}`); }
    catch (error) { report.cases.push({ name, status: 'failed', errorName: error.name, message: error.message, stack: error.stack });
      console.log(`FAIL ${name}: ${error.stack}`); }
  }
  await check('uncopied complete PR208 baseline', () => {
    for (const position of ['ST', 'CM', 'CB', 'GK']) for (let seed = 0; seed < 4; seed++) {
      const input = developmentFixture(original, { position });
      if (seed === 1) delete input.seasons.at(-1).leagueApps;
      if (seed === 2) input.seasons.at(-1).club = 'Foreign Fixture Club';
      if (seed === 3) input.seasons.at(-1).leagueApps = 9;
      const expected = advance(old, input, 118500 + seed), actual = advance(original, input, 118500 + seed);
      const metadata = seeded(118500, () => original.soccer.getAllEvents(input).find(event => event.id === 6)).value;
      assert.equal(serial(actual.value), serial(updatedMentorMetadata(expected.value, metadata)), 'The uncopied engine keeps the complete certified PR208 baseline');
      assert.deepEqual(actual.draws, expected.draws); report.uncopiedPairs++;
    }
    assert.equal(report.uncopiedPairs, 16);
  });
  await check('form boundaries', () => {
    const state = developmentFixture(B), row = state.seasons.at(-1);
    for (const [rating, leagueApps, swing] of [[7.6, 10, 2], [10, 38, 2], [6.4, 10, -2], [0, 38, -2], [7.599, 30, 0], [6.401, 30, 0]]) {
      Object.assign(row, { rating, leagueApps });
      const result = B.form.recentClubForm(state);
      assert.equal(result.swing, swing, 'Exact saved rating and ten-game boundaries decide the form swing');
      assert.equal(result.row, row); assert(result.reason.includes(`${rating.toFixed(1)} over ${leagueApps} league games`));
    }
  });
  await check('form eligibility', () => {
    const state = developmentFixture(B), row = state.seasons.at(-1), year = row.year + 1;
    for (const extra of [{ leagueApps: undefined }, { leagueApps: 9 }, { leagueApps: 39 }, { leagueApps: 10.5 }, { rating: NaN },
      { rating: Infinity }, { rating: -1 }, { rating: 11 }, { type: 'youth' }, { club: 'Foreign Fixture Club' }, { year: row.year - 1 }]) {
      const input = { ...state, seasons: [{ ...row, rating: 8, leagueApps: 30, ...extra }] };
      assert.deepEqual(B.form.recentClubForm(input, state.currentClub, year), { swing: 0, row: null,
        reason: B.form.recentClubForm({ ...input, seasons: [] }, state.currentClub, year).reason }, 'Unavailable records never create a form adjustment');
    }
    for (const club of ['BANNED', 'BANNED (PED)', 'PRISON', 'CONVICTED']) {
      const input = { ...state, currentClub: club, seasons: [{ ...row, club, rating: 8, leagueApps: 30 }] };
      assert.equal(B.form.recentClubForm(input).row, null);
    }
  });
  await check('form purity and chronology', () => {
    const state = developmentFixture(B), row = state.seasons.at(-1), before = structuredClone(state);
    const result = seeded(118500, () => B.form.recentClubForm(state));
    assert.deepEqual(result.draws, [], 'Saved form consumes no main RNG'); assert.deepEqual(state, before);
    const input = { ...state, seasons: [{ ...row, rating: 8 }, { ...row, year: row.year + 1, type: 'youth' }] };
    assert.equal(B.form.recentClubForm(input).row, null, 'An ineligible latest year cannot fall back to older form');
  });
  await check('form projections and actual draws', () => {
    for (const rating of [7.6, 6.4]) for (const frozenOut of [0, 1]) for (let seed = 0; seed < 4; seed++) {
      const input = developmentFixture(B, { overall: 70, frozenOut }); input.seasons.at(-1).rating = rating;
      const base = seeded(118500 + seed, () => old.soccer.calcAppearances(70, input.currentClubTier, input.age, structuredClone(input))).value;
      const actual = seeded(118500 + seed, () => B.soccer.calcAppearances(70, input.currentClubTier, input.age, structuredClone(input))).value;
      if (!frozenOut) assert.equal(actual.leagueApps, Math.max(0, Math.min(38, base.leagueApps + (rating >= 7.6 ? 2 : -2))), 'The actual draw applies the saved form swing');
      else {
        const unfrozen = { ...input, frozenOut: 0 };
        const original = seeded(118500 + seed, () => old.soccer.calcAppearances(70, input.currentClubTier, input.age, unfrozen)).value;
        assert.equal(actual.leagueApps, Math.min(8, Math.round(Math.max(0, Math.min(38, original.leagueApps + (rating >= 7.6 ? 2 : -2))) * 0.25)), 'Saved form is applied before freeze-out');
      }
      const at = B.squad.squadNow(input), trust = B.squad.managerTrust(input, at);
      const midpoint = Math.max(0, Math.min(38, (trust.band.min + trust.band.max) / 2 + trust.swing + (rating >= 7.6 ? 2 : -2)));
      assert.equal(trust.expected, frozenOut ? Math.min(8, Math.round(midpoint * 0.25)) : midpoint);
      const lo = Math.max(0, Math.min(38, trust.band.min + trust.swing + (rating >= 7.6 ? 2 : -2)));
      const hi = Math.max(0, Math.min(38, trust.band.max + trust.swing + (rating >= 7.6 ? 2 : -2)));
      assert.equal(B.sheet.planLine(trust), frozenOut ? 'The plan: frozen out, 8 league games at most.' : `The plan is about ${lo} to ${hi} league games.`);
      assert(B.sheet.trustLines(input, at, trust).includes(trust.form.reason)); report.formDrawPairs++;
    }
  });
  await check('neutral complete saves and RNG against actual PR208', () => {
    for (const position of ['ST', 'CM', 'CB', 'GK']) for (let seed = 0; seed < 4; seed++) {
      const input = developmentFixture(B, { position });
      if (seed === 1) delete input.seasons.at(-1).leagueApps;
      if (seed === 2) input.seasons.at(-1).club = 'Foreign Fixture Club';
      if (seed === 3) input.seasons.at(-1).leagueApps = 9;
      const before = serial(input), expected = advance(old, input, 118500 + seed), actual = advance(B, input, 118500 + seed);
      fs.writeFileSync(path.join(OUT, `baseline-${position}-${seed}.json`), JSON.stringify({ input, expected: expected.value, actual: actual.value,
        expectedDraws: expected.draws, actualDraws: actual.draws }, null, 2));
      assert.equal(serial(actual.value), serial(updatedMentorMetadata(expected.value, mentorMetadata)), 'Neutral careers preserve the full actual PR208 save except the two certified pending event copy fields');
      assert.deepEqual(actual.draws, expected.draws, 'Neutral careers preserve every actual PR208 random draw');
      assert.equal(serial(input), before); report.baselinePairs++;
    }
  });
  await check('plan choice binding and risk', () => {
    const state = developmentFixture(B), before = serial(state), P = B.preparation;
    for (const [id, delta] of [['push', 0.03], ['recovery', -0.04]]) {
      const chosen = seeded(118600, () => P.pickCareerPreparation(state, id));
      assert.deepEqual(chosen.draws, [], 'Plan choice never consumes main RNG');
      assert.equal(serial(chosen.value), serial({ ...state, seasonPreparation: { id, year: state.seasons.at(-1).year + 1, club: state.currentClub } }));
      assert.equal(P.preparationInjuryDelta(chosen.value), delta, 'The plan has its exact promised injury tradeoff');
      assert.equal(P.preparationForSeason({ ...chosen.value, currentClub: 'Foreign Club' }), null);
      assert.equal(P.preparationForSeason(chosen.value, chosen.value.seasonPreparation.year + 1), null);
      assert.equal(P.pickCareerPreparation(chosen.value, id), chosen.value);
      assert.equal(serial(P.pickCareerPreparation(chosen.value, null)), before);
    }
    for (const phase of ['newspaper', 'season_summary', 'retirement_suggestion']) {
      const blocked = { ...state, phase }; assert.equal(P.pickCareerPreparation(blocked, 'push'), blocked, 'Only a playing preseason accepts a plan');
    }
    assert.equal(serial(state), before);
  });
  await check('plan skill caps and once-only settlement', () => {
    const P = B.preparation;
    const skills = { GK: 'reflexes', CB: 'defending', LB: 'defending', RB: 'defending', CDM: 'passing', CM: 'passing', CAM: 'passing', LW: 'dribbling', RW: 'dribbling', ST: 'shooting' };
    for (const [position, skill] of Object.entries(skills)) assert.equal(P.preparationSkill(position), skill);
    for (const [id, before, adjustment] of [['push', 75, 1], ['recovery', 75, -1], ['push', 99, 0], ['recovery', 20, 0]]) {
      const state = P.pickCareerPreparation(developmentFixture(B), id); state.passing = before;
      const row = previous(state), snapshot = structuredClone(state);
      P.applyCareerPreparation(state, row);
      assert.equal(serial(state), serial({ ...snapshot, passing: before + adjustment }), 'Only the promised primary skill changes');
      assert.deepEqual(row.preparation, { id, outcome: 'completed', skill: 'passing', adjustment });
      const applied = serial({ state, row }); P.applyCareerPreparation(state, row);
      assert.equal(serial({ state, row }), applied, 'An already recorded plan cannot develop twice');
      P.settleCareerPreparation(state, row); assert.equal(state.seasonPreparation, undefined, 'A completed plan is consumed');
      const settled = serial({ state, row }); P.settleCareerPreparation(state, row); assert.equal(serial({ state, row }), settled);
      assert.deepEqual(state.statBoostNextSeason, snapshot.statBoostNextSeason);
    }
  });
  await check('plan interruptions and foreign targets', () => {
    const P = B.preparation;
    for (const extra of [{ apps: 0 }, { injurySevere: true }, { club: 'BANNED', apps: 0 }, { club: 'BANNED (PED)', apps: 0 },
      { club: 'PRISON', apps: 0 }, { club: 'CONVICTED', apps: 0 }]) {
      const state = P.pickCareerPreparation(developmentFixture(B), 'push'), row = previous(state, extra), before = state.passing;
      P.applyCareerPreparation(state, row); P.settleCareerPreparation(state, row);
      assert.equal(state.passing, before); assert.equal(state.seasonPreparation, undefined);
      assert.deepEqual(row.preparation, { id: 'push', outcome: 'interrupted', skill: 'passing', adjustment: 0 }, 'An interrupted plan never develops or carries forward');
    }
    for (const extra of [{ club: 'Foreign Club' }, { year: 3000 }]) {
      const state = P.pickCareerPreparation(developmentFixture(B), 'push'), row = previous(state, extra), before = state.passing;
      P.applyCareerPreparation(state, row); P.settleCareerPreparation(state, row);
      assert.equal(state.passing, before); assert.equal(row.preparation, undefined); assert.equal(state.seasonPreparation, undefined);
    }
  });
  await check('mentor deterministic creation and saved rows', () => {
    const state = developmentFixture(B), before = serial(state), M = B.mentor;
    const created = seeded(118700, () => M.createCareerMentor(state));
    assert.deepEqual(created.draws, [], 'Mentor creation uses no main RNG');
    assert.equal(serial(state), before); assert.equal(serial(M.createCareerMentor(state)), serial(created.value));
    const mentor = created.value.mentor;
    assert(mentor.generated && mentor.name && mentor.name !== state.playerName && mentor.name !== state.rival?.name);
    assert.deepEqual([mentor.age, mentor.progress, mentor.startYear, mentor.lastYear, mentor.status, mentor.history], [16, 0, state.seasons.at(-1).year + 1, state.seasons.at(-1).year, 'active', []]);
    assert.equal(M.createCareerMentor(created.value), created.value);
    const row = previous(created.value, { apps: 10 });
    assert.equal(M.recordMentorSeason(created.value, row), created.value, 'An unrecorded season cannot credit a mentorship');
    const appended = { ...created.value, seasons: [...created.value.seasons, row] }, snapshot = serial(appended);
    const credited = M.recordMentorSeason(appended, row);
    assert.deepEqual([credited.mentor.progress, credited.mentor.age, credited.mentor.status, credited.mentor.history.length], [1, 17, 'active', 1]);
    assert.equal(serial(appended), snapshot); assert.equal(M.recordMentorSeason(credited, row), credited, 'The same mentoring year cannot count twice');
  });
  await check('mentor pauses graduation and moves', () => {
    const M = B.mentor, created = M.createCareerMentor(developmentFixture(B));
    for (const extra of [{ apps: 9 }, { injurySevere: true }, { club: 'BANNED', apps: 0 }, { club: 'BANNED (PED)', apps: 0 }, { club: 'PRISON', apps: 0 }, { club: 'CONVICTED', apps: 0 }]) {
      const row = previous(created, extra), next = M.recordMentorSeason({ ...created, seasons: [...created.seasons, row] }, row);
      assert.deepEqual([next.mentor.progress, next.mentor.age, next.mentor.status, next.mentor.history.length], [0, 17, 'paused', 1], 'An interrupted year pauses progress and advances chronological age');
    }
    let next = created;
    for (let progress = 1; progress <= 3; progress++) {
      const row = previous(next, { apps: 10 }); next = M.recordMentorSeason({ ...next, seasons: [...next.seasons, row] }, row);
      assert.equal(next.mentor.progress, progress); assert.equal(next.mentor.age, 16 + progress); assert.equal(next.mentor.history.length, progress);
      assert.equal(next.mentor.status, progress === 3 ? 'graduated' : 'active'); report.mentorSeasons++;
    }
    assert.equal(M.createCareerMentor(next), next);
    const moved = M.endCareerMentorForMove(created, 'Foreign Club');
    assert.equal(serial(moved.mentor), serial({ ...created.mentor, status: 'ended', endReason: 'club-move' }), 'A move preserves the mentor and ends the shared spell');
    assert.equal(M.endCareerMentorForMove(moved, 'Third Club'), moved);
  });
  await check('mentor retirement', () => {
    for (const status of ['active', 'paused']) {
      const state = B.mentor.createCareerMentor(developmentFixture(B)); state.mentor.status = status;
      const before = serial(state), result = seeded(118701, () => B.mentor.endCareerMentorForRetirement(state));
      assert.deepEqual(result.draws, []); assert.equal(serial(state), before);
      assert.equal(serial(result.value.mentor), serial({ ...state.mentor, status: 'ended', endReason: 'retirement' }), 'Retirement ends mentoring without inventing a season');
      assert.equal(B.mentor.endCareerMentorForRetirement(result.value), result.value);
    }
  });
  const growthLine = '  s.reflexes = growStat(s.reflexes, s.age, false, false, s.primeType, potWall, s.overall, dev);';
  const growthObserver = { name: 'growth-observer', file: engine, from: growthLine,
    to: `${growthLine}\n  globalThis.__developmentGrowth = { state: JSON.parse(JSON.stringify(s)), row: JSON.parse(JSON.stringify(season)) };` };
  const rawRiskObserver = { name: 'raw-risk-observer', file: engine, from: '  injuryChance += state?.rehabFragility ?? 0;',
    to: '  injuryChance += state?.rehabFragility ?? 0;\n  globalThis.__developmentRawRisk = injuryChance;' };
  const finalRiskObserver = { name: 'final-risk-observer', file: engine, from: '  const injuryRoll = rollSeasonInjury(injuryChance);',
    to: '  globalThis.__developmentFinalRisk = injuryChance;\n  const injuryRoll = rollSeasonInjury(injuryChance);' };
  const observed = await developmentBundle({ patches: [...activePatches, growthObserver, rawRiskObserver, finalRiskObserver] });
  const observedOld = await developmentBundle({ baseline: true, patches: [rawRiskObserver, finalRiskObserver] });
  await check('actual injury risk', () => {
    for (const id of ['push', 'recovery']) for (const [injuryDelta, purchasedItems, rehabFragility] of [[0, [], 0], [-0.4, ['perf_cryo'], 0], [0.3, [], 0.06]]) {
      const input = B.preparation.pickCareerPreparation(developmentFixture(B, { purchasedItems, rehabFragility }), id);
      const fx = { appsMult: 1, injuryDelta };
      seeded(118603, () => observedOld.soccer.calcAppearances(input.overall, input.currentClubTier, input.age, structuredClone(input), fx));
      const raw = globalThis.__developmentRawRisk, delta = id === 'push' ? 0.03 : -0.04;
      seeded(118603, () => observed.soccer.calcAppearances(input.overall, input.currentClubTier, input.age, structuredClone(input), fx));
      assert.equal(globalThis.__developmentRawRisk, raw, 'The workload preserves every original injury risk input');
      assert.equal(globalThis.__developmentFinalRisk, Math.max(0.04, Math.min(0.42, raw + delta)), 'The actual roll receives the promised workload delta inside the original limits');
    }
  });
  await check('actual recorded plan growth and mentor credit', () => {
    for (const position of ['ST', 'CM', 'CB', 'GK']) for (const id of ['push', 'recovery']) for (let seed = 0; seed < 2; seed++) {
      let input = B.preparation.pickCareerPreparation(developmentFixture(B, { position }), id);
      input = B.mentor.createCareerMentor(input); const before = serial(input); delete globalThis.__developmentGrowth;
      const result = advance(observed, input, 118600 + seed), row = result.value.seasons.at(-1), saved = result.value;
      assert.equal(saved.seasonPreparation, undefined, 'The actual season consumes its plan');
      assert(row.preparation, 'The actual saved year records its preparation');
      const skill = B.preparation.preparationSkill(position);
      if (row.apps > 0 && !row.injurySevere && row.club === input.currentClub) {
        const raw = globalThis.__developmentGrowth; assert(raw, 'All normal growth reaches the actual preparation hook');
        const adjustment = Math.max(20, Math.min(99, raw.state[skill] + (id === 'push' ? 1 : -1))) - raw.state[skill];
        assert.deepEqual(row.preparation, { id, outcome: 'completed', skill, adjustment }, 'The recorded modifier agrees with actual post-growth skill values');
        assert.equal(saved[skill], raw.state[skill] + adjustment, 'The final primary skill includes the recorded modifier');
      } else assert.deepEqual(row.preparation, { id, outcome: 'interrupted', skill, adjustment: 0 });
      const expectedProgress = row.apps >= 10 && !row.injurySevere && row.club === input.currentClub ? 1 : 0;
      assert.equal(saved.mentor.progress, expectedProgress, 'The actual saved season credits only played shared-club mentoring');
      assert.equal(saved.mentor.history.length, 1); assert.equal(saved.mentor.lastYear, row.year);
      assert.equal(serial(input), before); report.planSeasons++;
      fs.writeFileSync(path.join(OUT, `plan-${position}-${id}-${seed}.json`), JSON.stringify({ input, saved, draws: result.draws, growth: globalThis.__developmentGrowth || null }, null, 2));
    }
    assert.equal(report.planSeasons, 16);
  });
  await check('actual interruption paths', () => {
    function interrupted(saved, expectedClub) {
      const row = saved.seasons.at(-1);
      if (expectedClub) assert.equal(row.club, expectedClub);
      assert.equal(saved.seasonPreparation, undefined);
      assert.equal(row.preparation?.outcome, 'interrupted', 'A skipped engine year records an interrupted plan');
      assert.equal(row.preparation.adjustment, 0); assert.equal(saved.mentor.progress, 0); assert.equal(saved.mentor.status, 'paused');
      assert.equal(saved.mentor.history.length, 1); assert.equal(saved.mentor.lastYear, row.year); report.interruptionPaths++;
    }
    for (const [club, extra] of [['BANNED', { matchFixBanned: 2 }], ['PRISON', { prisonSeasons: 1 }]]) {
      const input = B.mentor.createCareerMentor(B.preparation.pickCareerPreparation(developmentFixture(B, extra), 'push'));
      interrupted(advance(B, input, 118601).value, club);
    }
    for (const kind of ['severe', 'ped', 'conviction']) {
      let found = false;
      for (let seed = 0; seed < 64 && !found; seed++) {
        const extra = kind === 'severe' ? { age: 18, startingOverall: 99 } : kind === 'ped' ? { pedActive: true, pedSeasonsRemaining: 2 } : { corruptionHeat: 100, dirtyMoney: 100 };
        const input = B.mentor.createCareerMentor(B.preparation.pickCareerPreparation(developmentFixture(B, extra), 'push'));
        const saved = advance(B, input, 118100 + seed).value, row = saved.seasons.at(-1);
        if (!(kind === 'severe' ? row.injurySevere : row.club === (kind === 'ped' ? 'BANNED (PED)' : 'CONVICTED'))) continue;
        interrupted(saved, kind === 'severe' ? undefined : row.club); found = true;
      }
      assert(found, `The bounded actual engine probe exercises ${kind}`);
    }
    const input = B.mentor.createCareerMentor(B.preparation.pickCareerPreparation(developmentFixture(B), 'push'));
    const trial = seeded(118020, () => B.soccer.dismissNewspaper({ ...structuredClone(input), phase: 'newspaper', pendingSummary: null, prisonSeasons: 1 })).value;
    interrupted(trial, 'CONVICTED');
    const rehab = seeded(118020, () => B.soccer.applyRehabChoice({ ...structuredClone(input), phase: 'rehab_choice', pendingRehab: {
      name: 'Development fixture injury', weeks: 20, year: B.soccer.nextSeasonYear(input), specialistCost: null } }, 2)).value;
    assert(rehab.seasons.at(-1).injurySevere); interrupted(rehab);
    assert.equal(report.interruptionPaths, 7);
  });
  await check('actual moves and retirement', () => {
    const input = B.mentor.createCareerMentor(B.preparation.pickCareerPreparation(developmentFixture(B), 'push'));
    const club = B.soccer.FALLBACK_CLUBS.find(club => club.name === 'Chelsea'); assert(club);
    const offer = { club, contractYears: 2, wage: input.weeklyWage, transferFee: 0 };
    for (const saved of [B.soccer.acceptOffer(structuredClone(input), offer), B.soccer.acceptLoan(structuredClone(input), { ...offer, isLoan: true })]) {
      assert.equal(saved.seasonPreparation, undefined, 'A real move cancels the old club plan');
      assert.equal(saved.mentor.status, 'ended', 'A real move ends shared-club mentoring'); assert.equal(saved.mentor.endReason, 'club-move');
      assert.deepEqual(saved.mentor.history, input.mentor.history);
    }
    for (const saved of [B.soccer.manualRetire(structuredClone(input)), B.soccer.acceptRetirementSuggestion({ ...structuredClone(input), phase: 'retirement_suggestion' }), advance(B, { ...structuredClone(input), age: 45 }, 118704).value]) {
      assert(saved.retired); assert.equal(saved.seasonPreparation, undefined);
      assert.equal(saved.mentor.status, 'ended', 'Actual retirement ends active mentoring'); assert.equal(saved.mentor.endReason, 'retirement');
      assert.deepEqual(saved.mentor.history, input.mentor.history);
    }
    const paused = advance(B, { ...structuredClone(input), age: 34, retirementSuggested: false }, 118704).value;
    assert.equal(paused.phase, 'retirement_suggestion'); assert.deepEqual(paused.seasonPreparation, input.seasonPreparation);
    assert.deepEqual(paused.mentor, input.mentor); assert.deepEqual(paused.seasons, input.seasons);
  });
  await check('actual Youth Mentor choice keeps old effects and RNG', () => {
    const input = developmentFixture(B); input.phase = 'random_events'; input.pendingEvents = [JSON.parse(serial(mentorMetadata))];
    const before = serial(input), expected = seeded(118702, () => old.soccer.applyEventChoice(structuredClone(input), 0, old.soccer.FALLBACK_CLUBS));
    const actual = seeded(118702, () => B.soccer.applyEventChoice(structuredClone(input), 0, B.soccer.FALLBACK_CLUBS));
    const mentoring = B.mentor.createCareerMentor(expected.value);
    assert.equal(serial(actual.value), serial(mentoring), 'The actual event adds only the generated mentor and its creation event');
    assert.deepEqual(actual.draws, expected.draws, 'The actual event preserves every old random draw'); assert.equal(serial(input), before);
  });
  await check('repeated Youth Mentor event preserves every saved spell', () => {
    for (const status of ['active', 'paused', 'ended', 'graduated']) {
      const input = B.mentor.createCareerMentor(developmentFixture(B)); input.mentor.status = status;
      input.mentor.progress = status === 'graduated' ? 3 : 1;
      const catalog = seeded(118703, () => B.soccer.getAllEvents(input)).value, event = catalog.find(event => event.id === 6);
      assert(event.description.includes(input.mentor.name) && event.description.includes(status));
      assert.equal(event.choices[0].label, 'Remember your academy mentorship');
      assert(!event.description.includes('16-year-old'));
      input.phase = 'random_events'; input.pendingEvents = [JSON.parse(serial(event))];
      const expected = seeded(118703, () => old.soccer.applyEventChoice(structuredClone(input), 0, old.soccer.FALLBACK_CLUBS));
      const actual = seeded(118703, () => B.soccer.applyEventChoice(structuredClone(input), 0, B.soccer.FALLBACK_CLUBS));
      const fullExpected = JSON.parse(serial(expected.value)), at = fullExpected.events.lastIndexOf('👶 Mentored a promising youth player'); assert(at >= input.events.length);
      fullExpected.events[at] = '🤝 Remembered your saved academy mentorship';
      assert.equal(serial(actual.value), serial(fullExpected), 'Remembering retains the entire mentor record and all old event effects');
      assert.deepEqual(actual.draws, expected.draws); assert.deepEqual(actual.value.mentor, input.mentor);
    }
  });
  report.sourceAfter = hashes(); report.sourceHeld = serial(report.sourceBefore) === serial(report.sourceAfter);
  assert(report.sourceHeld, 'Outcome checks never modify authored source');
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  assert.equal(report.cases.length, 18, 'All eighteen outcome groups execute');
  if (!CONTROL && report.cases.every(row => row.status === 'passed')) {
    assert.deepEqual([report.baselinePairs, report.uncopiedPairs, report.formDrawPairs, report.planSeasons, report.mentorSeasons, report.interruptionPaths], [16, 16, 16, 16, 3, 7]);
  }
  const failures = report.cases.filter(row => row.status === 'failed');
  console.log(`simSoccerCareerDevelopment: ${report.cases.length} outcome groups, ${report.baselinePairs}+${report.uncopiedPairs} complete baseline saves/RNG, ${report.formDrawPairs} form draws, ${report.planSeasons} played plan seasons, ${report.interruptionPaths} interruption paths, ${failures.length} failed`);
  process.exitCode = failures.length ? 1 : 0;
}
