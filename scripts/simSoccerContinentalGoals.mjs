/** Full continental goal records and immediate draw continuation against f78037.
 * Execute on Actions only. Controlled senior profiles are not played careers.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(ROOT, process.env.SOCCER_CONTINENTAL_GOALS_OUT || '.tmp-fx/soccer-continental-goals');
const BASE = 'f78037dcddea12c1a02586c7d5c0e185efb86121';
const BASE_TREE = '1c9e7dcb11992442060cb162c288d0bcf37db0c2';
const ENGINE = 'src/lib/soccerCareerEngine.ts';
const ENV_EXPRESSION = '{"DEV":false,"PROD":true,"MODE":"production"}';
const json = value => JSON.stringify(value);
const copy = value => JSON.parse(json(value));
const lf = text => text.replaceAll('\r\n', '\n');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const equal = (actual, expected, label) => assert.equal(json(actual), json(expected), label);
const git = (...args) => execFileSync('git', args, { cwd: ROOT, maxBuffer: 64 * 1024 * 1024 });
const require = createRequire(path.join(ROOT, 'package.json'));
const esbuild = require('esbuild');
fs.mkdirSync(path.join(OUT, 'objects'), { recursive: true });
const objects = new Map();
function retain(bytes) {
  const raw = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  const hash = sha(raw);
  if (!objects.has(hash)) {
    const packed = gzipSync(raw);
    const file = 'objects/' + hash + '.gz';
    fs.writeFileSync(path.join(OUT, file), packed);
    objects.set(hash, { sha256: hash, bytes: raw.length, file, packedBytes: packed.length, packedSha256: sha(packed) });
  }
  return hash;
}
const ref = value => retain(json(value));
const write = (file, value) => fs.writeFileSync(path.join(OUT, file), JSON.stringify(value, null, 2));
function replaceOnce(source, from, to, label) {
  assert.equal(source.split(from).length - 1, 1, label + ' unique anchor');
  assert.notEqual(from, to, label + ' effective replacement');
  return source.replace(from, to);
}
const productionPatches = [
  ['  let totalPlayerGoals = 0;', '  let totalPlayerGoals = 0;\n  let removedKnockoutGoals = 0;'],
  ['      const pg = legPlayerGoals(legs);', '      const rawPlayerGoals = legPlayerGoals(legs);\n      const pg = Math.min(rawPlayerGoals, gf);'],
  ['      totalPlayerGoals += pg;', '      totalPlayerGoals += pg;\n      removedKnockoutGoals += rawPlayerGoals - pg;'],
  ['  const isTopScorer = totalPlayerGoals >= topScorerBar && Math.random() < 0.5;',
    '  const oldGoalTotal = totalPlayerGoals + removedKnockoutGoals;\n  const topScorerRoll = oldGoalTotal >= topScorerBar && Math.random() < 0.5;\n  const isTopScorer = totalPlayerGoals >= topScorerBar && topScorerRoll;'],
];
const faults = [
  { id: 'remove-cap', from: '      const pg = Math.min(rawPlayerGoals, gf);', to: '      const pg = rawPlayerGoals;', groups: ['per-leg-cap', 'goal-total', 'award'] },
  { id: 'remove-surplus', from: '  const oldGoalTotal = totalPlayerGoals + removedKnockoutGoals;', to: '  const oldGoalTotal = totalPlayerGoals;', groups: ['draw-continuation'] },
  { id: 'award-raw', from: '  const isTopScorer = totalPlayerGoals >= topScorerBar && topScorerRoll;', to: '  const isTopScorer = oldGoalTotal >= topScorerBar && topScorerRoll;', groups: ['award'] },
];
const heldFiles = [ENGINE, 'src/lib/soccerCareerContinental.ts', 'src/lib/uclFormatHistory.ts', 'scripts/simSoccerContinentalGoals.mjs', 'scripts/simSoccerCareerUcl.mjs', 'package.json', 'package-lock.json'];
const heldBefore = heldFiles.map(file => ({ file, sha256: sha(fs.readFileSync(path.join(ROOT, file))) }));
const baseCache = new Map();
function original(file) {
  if (!baseCache.has(file)) baseCache.set(file, git('show', BASE + ':' + file));
  return baseCache.get(file);
}
function observe(source, baseline, patches) {
  const originalSource = source;
  const apply = (from, to, name) => {
    const before = source;
    source = replaceOnce(source, from, to, name);
    patches.push({ name, file: ENGINE, from, to, before: retain(before), after: retain(source) });
  };
  const raw = baseline ? '      const pg = legPlayerGoals(legs);' : '      const rawPlayerGoals = legPlayerGoals(legs);';
  apply(raw, raw + '\n      globalThis.__continentalGoal({ kind: "leg", round, leg, home, goalsFor: gf, goalsAgainst: ga, rawPlayerGoals: ' + (baseline ? 'pg' : 'rawPlayerGoals') + ' });', 'raw-leg-observer');
  const award = baseline ? productionPatches[3][0] : source.split('\n').find(line => line.startsWith('  const oldGoalTotal = '));
  assert.ok(award, 'actual award boundary');
  apply(award, '  globalThis.__continentalGoal({ kind: "award", totalPlayerGoals, topScorerBar });\n' + award, 'award-boundary-observer');
  let restored = source;
  for (const patch of [...patches].reverse().filter(patch => patch.name.endsWith('observer'))) restored = replaceOnce(restored, patch.to, patch.from, patch.name + ' complete undo');
  assert.equal(restored, originalSource, 'complete observer source undo');
  patches.push({ name: 'observer-full-undo', file: ENGINE, observed: retain(source), restored: retain(restored) });
  return source;
}
async function bundle(id, { baseline = false, observed = false, fault = null, undo = false } = {}) {
  const dir = path.join(OUT, 'bundles', id);
  fs.mkdirSync(dir, { recursive: true });
  const entry = 'export * as engine from ' + JSON.stringify(path.join(ROOT, ENGINE).replaceAll('\\', '/')) + ';';
  const loaded = [], patches = [];
  let applied = false;
  const result = await esbuild.build({
    stdin: { contents: entry, sourcefile: 'continental-goals-entry.ts', resolveDir: ROOT, loader: 'ts' },
    outfile: path.join(dir, 'bundle.cjs'), absWorkingDir: ROOT, bundle: true, format: 'cjs', platform: 'node',
    alias: { '@': path.join(ROOT, 'src') }, nodePaths: [path.join(ROOT, 'node_modules')],
    define: { 'import.meta.env': ENV_EXPRESSION }, logLevel: 'error', metafile: true,
    plugins: [{ name: 'held-source', setup(build) {
      build.onLoad({ filter: /\.(ts|tsx|json)$/ }, args => {
        const file = path.relative(ROOT, args.path).replaceAll('\\', '/');
        if (!file.startsWith('src/')) return undefined;
        const raw = baseline ? original(file) : fs.readFileSync(args.path);
        const canonical = lf(raw.toString());
        let served = canonical;
        if (!baseline && file !== ENGINE) assert.equal(canonical, lf(original(file).toString()), file + ' unchanged base source');
        if (fault && file === ENGINE) {
          const changed = replaceOnce(served, fault.from, fault.to, fault.id);
          const restored = replaceOnce(changed, fault.to, fault.from, fault.id + ' complete undo');
          assert.equal(restored, served, fault.id + ' full source restoration');
          patches.push({ name: fault.id, file, from: fault.from, to: fault.to, before: retain(served), after: retain(changed), restored: retain(restored), undo });
          served = undo ? restored : changed;
          applied = true;
        }
        if (observed && file === ENGINE) served = observe(served, baseline, patches);
        loaded.push({ file, raw: retain(raw), normalized: retain(canonical), served: retain(served), rawSha256: sha(raw), normalizedSha256: sha(canonical), servedSha256: sha(served) });
        return { contents: served, loader: file.endsWith('.json') ? 'json' : file.endsWith('.tsx') ? 'tsx' : 'ts', resolveDir: path.dirname(args.path) };
      });
    } }],
  });
  if (fault) assert.equal(applied, true, fault.id + ' actually loaded');
  const code = fs.readFileSync(path.join(dir, 'bundle.cjs'));
  loaded.sort((a, b) => a.file.localeCompare(b.file));
  const inputs = Object.keys(result.metafile.inputs).map(file => {
    if (file === 'continental-goals-entry.ts' || file === '<stdin>') return { file, kind: 'entry', raw: retain(entry), sha256: sha(entry) };
    if (file === '<define:import.meta.env>') return { file, kind: 'configured-define', configuredExpression: ENV_EXPRESSION, expressionSha256: sha(ENV_EXPRESSION) };
    const absolute = path.resolve(ROOT, file);
    const measured = loaded.find(row => path.resolve(ROOT, row.file) === absolute);
    if (measured) return { file, kind: 'loaded-source', servedSha256: measured.servedSha256 };
    const raw = fs.readFileSync(absolute);
    return { file, kind: 'dependency', raw: retain(raw), sha256: sha(raw) };
  });
  const metadata = { id, baseline, observed, fault: fault?.id ?? null, undo, entry: retain(entry), compiled: retain(code), compiledSha256: sha(code), loaded, inputs, patches, metafile: result.metafile };
  write('bundles/' + id + '/receipt.json', metadata);
  fs.writeFileSync(path.join(dir, 'metafile.json'), json(result.metafile));
  return { id, code: code.toString(), metadata };
}
function mulberry(seed) {
  let n = seed >>> 0;
  return () => { n += 0x6D2B79F5; let t = n; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function scope(built) {
  let values = [], callers = [], observations = [], next = mulberry(1268);
  const math = Object.create(Math);
  math.random = () => { const value = next(); values.push(value); callers.push(new Error('random draw').stack); return value; };
  class HeldDate extends Date { constructor(...args) { super(...(args.length ? args : [1800000000000])); } static now() { return 1800000000000; } }
  const context = vm.createContext({ console, process, Buffer, URL, URLSearchParams, TextEncoder, TextDecoder, structuredClone,
    Math: math, Date: HeldDate, module: { exports: {} }, exports: {}, require, setTimeout, clearTimeout, setInterval, clearInterval,
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    __continentalGoal: value => observations.push({ value: copy(value), cursor: values.length }) });
  vm.runInContext(built.code, context, { filename: 'continental-goals-engine.cjs' });
  const startup = { values: [...values], callers: [...callers], observations: copy(observations), compiledSha256: built.metadata.compiledSha256 };
  function run(seed, method, input, args) {
    values = []; callers = []; observations = []; next = mulberry(seed);
    const subject = copy(input), before = copy(subject), callArgs = copy(args), argsBefore = copy(callArgs);
    let output, error = null;
    try { output = method(context.module.exports.engine, subject, ...callArgs); }
    catch (failure) { error = { name: failure.name, message: failure.message, stack: failure.stack }; }
    const methodCount = values.length;
    const result = { input: before, inputAfter: copy(subject), args: argsBefore, argsAfter: copy(callArgs), value: output === undefined ? null : copy(output), error,
      methodDraws: [...values], methodCallers: [...callers], observations: copy(observations), methodCount };
    for (let i = 0; i < 16; i++) math.random();
    result.continuation = values.slice(methodCount);
    result.continuationCallers = callers.slice(methodCount);
    result.fullDraws = [...values];
    return result;
  }
  return { engine: context.module.exports.engine, startup, run };
}
const profileRows = [
  ...[[1990, 'european-cup'], [1991, 'first-groups'], [1992, 'renamed'], [1993, 'one-leg-semis'], [1994, 'four-groups'], [1997, 'six-groups'], [1999, 'two-group-stages'], [2003, 'eight-groups-r16'], [2024, 'league-phase'], [2020, 'last-away-goals'], [2021, 'no-away-goals']].map(([year, id]) => ({ id, year, club: 'Real Madrid' })),
  { id: 'lib-two-final', year: 2018, club: 'Boca Juniors' }, { id: 'lib-one-final', year: 2019, club: 'Boca Juniors' },
  { id: 'concacaf-two-final', year: 2022, club: 'Monterrey' }, { id: 'concacaf-one-final', year: 2023, club: 'Monterrey' },
  { id: 'afc-two-final', year: 2023, club: 'Al Hilal' }, { id: 'afc-one-final', year: 2024, club: 'Al Hilal' },
  { id: 'caf-two-final', year: 2022, club: 'Al Ahly', testTier: 1 }, { id: 'caf-one-final', year: 2021, club: 'Al Ahly', testTier: 1 },
  { id: 'abandoned-cup', year: 2001, club: 'Monterrey' },
  { id: 'unsupported-cup', year: 2024, club: 'Auckland FC', testTier: 1 },
  { id: 'tier-three', year: 2024, club: 'Club America' },
];
const positions = ['GK', 'ST', 'CM', 'CAM'];
const seeds = Array.from({ length: 128 }, (_, index) => index + 1);
const groupNames = ['per-leg-cap', 'goal-total', 'award', 'draw-continuation', 'unrelated', 'raw-leg-draws'];
function stageGames(result) { return (result.firstStage?.stages ?? []).flatMap(stage => stage.games); }
function projectedOriginal(old) {
  assert.equal(old.error, null, 'original method did not throw');
  equal(old.inputAfter, old.input, 'complete original input held');
  equal(old.argsAfter, old.args, 'complete original arguments held');
  const value = copy(old.value), games = stageGames(value), matches = value.matches;
  const rawTotal = games.reduce((sum, game) => sum + game.playerGoals, 0) + matches.reduce((sum, match) => sum + match.playerGoals, 0);
  assert.equal(value.playerGoals, rawTotal, 'entire original goal sum');
  const boundaries = old.observations.filter(row => row.value.kind === 'award');
  assert.ok(boundaries.length <= 1, 'one original award boundary');
  let awardRoll = null, awardBar = null;
  if (boundaries.length) {
    const boundary = boundaries[0];
    awardBar = boundary.value.topScorerBar;
    assert.equal(boundary.value.totalPlayerGoals, rawTotal, 'observed original raw total');
    const eligible = rawTotal >= awardBar;
    assert.equal(old.methodCount, boundary.cursor + (eligible ? 1 : 0), 'original short-circuit draw boundary');
    if (eligible) awardRoll = old.methodDraws[boundary.cursor];
    assert.equal(value.isTopScorer, eligible && awardRoll < 0.5, 'original actual award roll');
  } else assert.equal(value.isTopScorer, false, 'no award after an early exit');
  let surplus = 0;
  for (const match of matches) {
    const ninetyGoals = match.goalsFor - (match.etFor ?? 0);
    assert.ok(Number.isInteger(ninetyGoals) && ninetyGoals >= 0, 'actual recorded score at90');
    const capped = Math.min(match.playerGoals, ninetyGoals);
    surplus += match.playerGoals - capped;
    match.playerGoals = capped;
  }
  value.playerGoals = rawTotal - surplus;
  value.isTopScorer = awardBar !== null && value.playerGoals >= awardBar && awardRoll !== null && awardRoll < 0.5;
  return { value, rawTotal, surplus, awardRoll, awardBar };
}
function resultOutsideGoals(current, old) {
  const held = copy(current);
  held.playerGoals = old.playerGoals;
  held.isTopScorer = old.isTopScorer;
  assert.equal(held.matches.length, old.matches.length, 'complete match count');
  held.matches.forEach((match, index) => { match.playerGoals = old.matches[index].playerGoals; });
  return held;
}
function checks(current, old, expected) {
  return {
    'per-leg-cap': () => {
      assert.equal(current.value.matches.length, expected.value.matches.length, 'complete knockout rows');
      current.value.matches.forEach((match, index) => {
        assert.equal(match.playerGoals, expected.value.matches[index].playerGoals, 'original perleg cap at90');
        assert.ok(match.playerGoals <= match.goalsFor - (match.etFor ?? 0), 'no phantom or extra-time player goals');
      });
    },
    'goal-total': () => {
      assert.equal(current.value.playerGoals, expected.value.playerGoals, 'corrected full tournament total');
      const total = stageGames(current.value).reduce((sum, game) => sum + game.playerGoals, 0) + current.value.matches.reduce((sum, match) => sum + match.playerGoals, 0);
      assert.equal(current.value.playerGoals, total, 'full saved rows sum');
    },
    award: () => assert.equal(current.value.isTopScorer, expected.value.isTopScorer, 'corrected threshold and actual original award roll'),
    'draw-continuation': () => { equal(current.methodDraws, old.methodDraws, 'entire immediate method vector'); equal(current.continuation, old.continuation, 'sixteen immediate draws'); equal(current.fullDraws, old.fullDraws, 'complete method and continuation vector'); },
    unrelated: () => {
      assert.equal(current.error, null, 'current method did not throw');
      equal(current.input, old.input, 'complete input'); equal(current.inputAfter, old.input, 'input not mutated');
      equal(current.args, old.args, 'complete arguments'); equal(current.argsAfter, old.args, 'arguments not mutated');
      equal(resultOutsideGoals(current.value, old.value), old.value, 'every other full result field');
    },
    'raw-leg-draws': () => equal(current.observations.filter(row => row.value.kind === 'leg'), old.observations.filter(row => row.value.kind === 'leg'), 'all actual raw leg goals and draw cursors'),
  };
}
function plainObserved(plain, observed, label) {
  for (const key of ['input', 'inputAfter', 'args', 'argsAfter', 'value', 'error', 'methodDraws', 'methodCount', 'continuation', 'fullDraws']) equal(plain[key], observed[key], label + ' full ' + key);
}
const report = { status: 'running', base: BASE, baseTree: BASE_TREE, head: git('rev-parse', 'HEAD').toString().trim(), tree: git('rev-parse', 'HEAD^{tree}').toString().trim(),
  scope: 'Direct simulateUCL over genuine constructor states with declared controlled senior profiles. Exact immediate stream continuation only, not future career neutrality. Caller stacks and startup vectors remain complete separate provenance. Only complete byte-identical objects share physical gzip storage.',
  seeds, positions, profiles: profileRows, groups: groupNames, bundles: [], constructors: [], chunks: [], controls: [], witnesses: { rows: 0, qualified: 0, unqualified: 0, surplusRows: 0, removedGoals: 0, awardDrawOnlyRows: 0, removedAwards: 0, extraTimeSurplusRows: 0, unchangedRows: 0 } };
let activeChunk = null;
let observedFailures = null;
function retainActiveChunk(complete) {
  if (!activeChunk) return;
  for (const [arm, rows] of Object.entries(activeChunk.chunks)) report.chunks.push({ key: activeChunk.key, arm, rows: rows.length, complete, object: ref(rows) });
  activeChunk = null;
}
async function main() {
  assert.equal(git('rev-parse', BASE + '^{tree}').toString().trim(), BASE_TREE, 'exact original tree');
  const baseSource = lf(original(ENGINE).toString()), currentSource = lf(fs.readFileSync(path.join(ROOT, ENGINE), 'utf8'));
  let declared = baseSource;
  productionPatches.forEach(([from, to], index) => { declared = replaceOnce(declared, from, to, 'production hunk' + (index + 1)); });
  assert.equal(declared, currentSource, 'only four declared production replacements');
  report.production = { original: retain(baseSource), current: retain(currentSource), replacements: productionPatches };
  const definitions = [
    ['original-plain', { baseline: true }], ['original-observed', { baseline: true, observed: true }],
    ['current-plain', {}], ['healthy', { observed: true }], ...faults.map(fault => [fault.id, { observed: true, fault }]),
    ['undo', { observed: true, fault: faults[0], undo: true }],
  ];
  const arms = {};
  for (const [id, options] of definitions) {
    const built = await bundle(id, options);
    arms[id] = scope(built);
    report.bundles.push({ id, receipt: 'bundles/' + id + '/receipt.json', compiledSha256: built.metadata.compiledSha256, startup: ref(arms[id].startup) });
  }
  assert.equal(report.bundles.find(row => row.id === 'healthy').compiledSha256, report.bundles.find(row => row.id === 'undo').compiledSha256, 'complete compiled undo');
  const failed = Object.fromEntries([...faults.map(fault => fault.id), 'healthy', 'undo'].map(id => [id, []]));
  observedFailures = failed;
  const changed = Object.fromEntries(faults.map(fault => [fault.id, 0]));
  const stats = { pace: 88, shooting: 90, passing: 88, dribbling: 88, defending: 88, physical: 88, reflexes: 88 };
  for (let pi = 0; pi < profileRows.length; pi++) for (let qi = 0; qi < positions.length; qi++) {
    const profile = profileRows[pi], position = positions[qi], key = profile.id + '-' + position;
    const constructors = {};
    for (const [id, arm] of Object.entries(arms)) constructors[id] = arm.run(2000 + pi * positions.length + qi,
      (engine, subject, ...args) => engine.initCareer(...args), null,
      ['Generated Goal Check', 'Spain', position, 'modern', stats, 90, profile.year - 1, arm.engine.FALLBACK_CLUBS]);
    report.constructors.push({ key, rows: ref(constructors) });
    for (const id of Object.keys(constructors)) {
      plainObserved(constructors['original-plain'], constructors[id], key + ' constructor ' + id);
      assert.equal(constructors[id].error, null, 'genuine constructor completed');
    }
    const input = copy(constructors['original-plain'].value);
    const club = arms.healthy.engine.FALLBACK_CLUBS.find(club => club.name === profile.club);
    assert.ok(club, profile.club + ' actual catalog club');
    const alterations = { phase: 'playing', age: 25, currentClub: club.name, currentClubCountry: club.country,
      currentClubTier: profile.testTier ?? club.tier, currentClubColor: club.color, currentLeague: club.league, overall: 90 };
    Object.assign(input, alterations);
    assert.equal(input.seasons.at(-1).year, profile.year - 1, 'genuine constructor year anchors cup season');
    const args = [copy(input.seasons.at(-1))];
    const chunks = Object.fromEntries(Object.keys(arms).map(id => [id, []]));
    activeChunk = { key, chunks };
    for (const seed of seeds) {
      const id = key + '-' + seed, rows = {};
      for (const [armId, arm] of Object.entries(arms)) rows[armId] = arm.run(seed, (engine, state, season) => engine.simulateUCL(state, season), input, args);
      for (const [armId, row] of Object.entries(rows)) chunks[armId].push({ id, seed, profile, position, alterations, constructorKey: key, ...row });
      plainObserved(rows['original-plain'], rows['original-observed'], id + ' original observer');
      plainObserved(rows['current-plain'], rows.healthy, id + ' current observer');
      const old = rows['original-observed'], expected = projectedOriginal(old);
      for (const row of Object.values(rows)) {
        assert.equal(row.methodCallers.length, row.methodCount, 'all method callers retained');
        assert.equal(row.continuation.length, 16, 'complete continuation');
        assert.equal(row.continuationCallers.length, 16, 'all continuation callers retained');
        assert.ok(row.fullDraws.every(value => Number.isFinite(value) && value >= 0 && value < 1), 'finite whole vector');
      }
      for (const armId of Object.keys(failed)) {
        const failures = [];
        for (const [group, check] of Object.entries(checks(rows[armId], old, expected))) {
          try { check(); } catch (failure) {
            assert.equal(failure.name, 'AssertionError', armId + ' assertion-only defect');
            const detail = { id, group, name: failure.name, message: failure.message, stack: failure.stack, actual: failure.actual, expected: failure.expected };
            failed[armId].push(detail); failures.push(group);
          }
        }
        if (faults.some(fault => fault.id === armId)) {
          const fact = row => [row.input, row.inputAfter, row.args, row.argsAfter, row.value, row.error, row.methodDraws, row.continuation, row.fullDraws];
          const differs = json(fact(rows[armId])) !== json(fact(rows.healthy));
          if (differs) { changed[armId] += 1; assert.ok(failures.length > 0, armId + ' every changed complete output has an intended failing predicate'); }
          if (!failures.length) equal(fact(rows[armId]), fact(rows.healthy), armId + ' every unrelated complete output held');
          if (armId === 'remove-cap') equal(rows[armId].value, old.value, 'cap omission reproduces every entire original result');
        }
      }
      equal(rows.undo, rows.healthy, id + ' complete runtime undo including all callers');
      report.witnesses.rows += 1;
      report.witnesses[old.value.qualified ? 'qualified' : 'unqualified'] += 1;
      if (expected.surplus > 0) { report.witnesses.surplusRows += 1; report.witnesses.removedGoals += expected.surplus; }
      else { report.witnesses.unchangedRows += 1; equal(rows.healthy.value, old.value, 'every zero-surplus complete result held'); }
      if (expected.awardBar !== null && expected.rawTotal >= expected.awardBar && expected.value.playerGoals < expected.awardBar) report.witnesses.awardDrawOnlyRows += 1;
      if (old.value.isTopScorer && !expected.value.isTopScorer) report.witnesses.removedAwards += 1;
      if (old.value.matches.some(match => (match.etFor ?? 0) > 0 && match.playerGoals > match.goalsFor - (match.etFor ?? 0))) report.witnesses.extraTimeSurplusRows += 1;
      for (const chunk of Object.values(chunks)) chunk.at(-1).originalDerived = expected;
    }
    retainActiveChunk(true);
  }
  assert.equal(report.witnesses.rows, profileRows.length * positions.length * seeds.length, 'complete declared cohort');
  assert.ok(report.witnesses.surplusRows > 0 && report.witnesses.awardDrawOnlyRows > 0 && report.witnesses.removedAwards > 0 && report.witnesses.extraTimeSurplusRows > 0, 'all baseline defect and at90 witnesses actually present');
  assert.equal(failed.healthy.length, 0, 'all healthy groups pass');
  assert.equal(failed.undo.length, 0, 'all restored groups pass');
  for (const fault of faults) {
    const found = groupNames.filter(group => failed[fault.id].some(row => row.group === group));
    equal(found, fault.groups, fault.id + ' exact intended groups and healthy unrelated groups');
    assert.ok(changed[fault.id] > 0, fault.id + ' changed actual complete outputs');
    report.controls.push({ id: fault.id, intendedGroups: fault.groups, failedGroups: found, failures: ref(failed[fault.id]), failureCount: failed[fault.id].length, changedOutputs: changed[fault.id], completeSourceUndo: true, unrelatedCompleteOutputsHeld: true });
  }
  report.groupResults = groupNames.map(group => ({ group, healthy: true, undo: true }));
  report.status = 'passed';
  console.log('Continental goals: ' + report.witnesses.rows + ' full original/current cases and immediate vectors passed.');
  console.log('Observed original/current results, constructor states and full tapes exactly match plain exports.');
  console.log('Actual surplus/award/extra-time witnesses: ' + json(report.witnesses));
  console.log('Three effective source faults fired exact groups; complete source, compiled and runtime undo held.');
}
try { await main(); }
catch (failure) { report.status = 'failed'; report.error = { name: failure.name, message: failure.message, stack: failure.stack }; process.exitCode = 1; console.error(failure.stack); }
finally {
  try {
    retainActiveChunk(false);
    if (observedFailures) report.groupFailures = Object.entries(observedFailures).map(([arm, failures]) => ({ arm, count: failures.length, object: ref(failures) }));
    report.heldBefore = heldBefore;
    report.heldAfter = heldFiles.map(file => ({ file, sha256: sha(fs.readFileSync(path.join(ROOT, file))) }));
    equal(report.heldAfter, heldBefore, 'all product, historical harness, proof and package disk bytes held');
    write('report.json', report);
    write('objects.json', [...objects.values()]);
    const size = directory => fs.readdirSync(directory, { withFileTypes: true }).reduce((total, item) => total + (item.isDirectory() ? size(path.join(directory, item.name)) : fs.statSync(path.join(directory, item.name)).size), 0);
    write('size.json', { bytes: 0, maximum: 430000000 });
    write('size.json', { bytes: size(OUT), maximum: 430000000 });
    write('size.json', { bytes: size(OUT), maximum: 430000000 });
    assert.ok(size(OUT) < 430000000, 'complete proof under430M without pruning');
  } catch (failure) {
    report.status = 'failed';
    report.finalError = { name: failure.name, message: failure.message, stack: failure.stack };
    write('report.json', report);
    write('objects.json', [...objects.values()]);
    process.exitCode = 1;
    console.error(failure.stack);
  }
}
