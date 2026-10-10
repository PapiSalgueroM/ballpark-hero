/* Round 1184: verified opponent order and venues, with simulated results.
   Copied faults must fail their actual named outcome, never an import error. */
import './lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
/* Release AT: the base is the tree just before this round's own merge on the release line (79c729cd), not Release AP:
   Releases AQ, AR and AS changed the engine after the branch was cut. */
const self = fileURLToPath(import.meta.url), base = '79c729cdc2943cf444c3384ce0cffb3ca87d2e1d';
const engineFile = 'src/lib/clubManager.ts', helperFile = 'src/lib/clubManagerFixtures.ts';
const cardFile = 'src/components/club-manager/CalendarCard.tsx';
const dataFile = 'src/data/clubManagerPremierFixtures2026.ts';
const key = 'premier-2026-27-v1', clone = value => JSON.parse(JSON.stringify(value));
const sha = value => createHash('sha256').update(value).digest('hex');
export function withRealFixtureSeed(seed, fn) {
  const previous = Math.random, previousNow = Date.now;
  let a = seed >>> 0, draws = 0;
  Math.random = () => {
    draws++;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  Date.now = () => 1791302400000;
  try { return { value: fn(), draws }; }
  finally { Math.random = previous; Date.now = previousNow; }
}
const seeded = (seed, fn) => withRealFixtureSeed(seed, fn).value;
const cases = {
  ledger: 'reads all 760 fixtures with the exact two-source round order and venues',
  calendar: 'renders all 760 CalendarCard opponent and venue readings from the same schedule',
  settlement: 'settles the actual human fixture and every neutral result with conserved table and scorer credits',
  bye: 'settles a neutral-only league entry through the same real fixture resolver',
  world: 'settles the actual world league round through the same real fixture resolver',
  eligibility: 'binds only a fresh original modern Premier League world with exact membership',
  legacy: 'preserves the whole generated old save, random draws, match outcome and reload bytes',
  future: 'refuses stale keys in later seasons, other years and changed league membership',
  rollover: 'clears the real fixture key after a fully played season before generating the next season',
  baseline: 'matches the independent pre-change engine for unsupported starts and genuine match outcomes',
  uncopied: 'passes the whole independent generated baseline with untouched current source under every copied fault',
};
const controls = {
  venues: { file: helperFile, from: '=> [home, away]);', to: '=> [away, home]);', test: 'ledger' },
  card: { file: cardFile, from: 'import { careerLeagueOf, careerRoundPairs }', to: 'import { careerLeagueOf, careerRoundPairs, roundPairs }',
    second: ['careerRoundPairs(career, round)', 'roundPairs(career.leagueClubs, round, !!career.balancedFixtures)'], test: 'calendar' },
  settlement: { file: engineFile, from: "if (fx.competition === 'league') {\n    const pairs = careerRoundPairs(state, entry.round);",
    to: "if (fx.competition === 'league') {\n    const pairs = roundPairs(state.leagueClubs, entry.round, !!state.balancedFixtures);", test: 'settlement' },
  bye: { file: engineFile, from: '        const pairs = careerRoundPairs(state, entry.round);',
    to: '        const pairs = roundPairs(state.leagueClubs, entry.round, !!state.balancedFixtures);', test: 'bye' },
  world: { file: engineFile, from: 'careerRoundPairs(state, w.round, lg.clubs, lg.id)',
    to: 'roundPairs(lg.clubs, w.round, !!state.balancedFixtures)', test: 'world' },
  edited: { file: helperFile, from: '&& !state.customClub && !state.leagueOverrides', to: '&& true', test: 'eligibility' },
  legacy: { file: helperFile, from: 'state.realLeagueFixtures !== REAL_PREMIER_FIXTURE_KEY', to: 'false', count: 2, test: 'legacy', extraFailures: ['baseline'] },
  future: { file: helperFile, from: '&& state.season === 1', to: '&& true', test: 'future' },
  rollover: { file: engineFile, from: '  delete state.realLeagueFixtures;', to: '  state.realLeagueFixtures = career.realLeagueFixtures;', test: 'rollover' },
};

function expectedRounds(receipt) {
  const reference = receipt.sources.find(s => s.role === 'independent');
  assert.equal(reference.rows.length, 380, 'The independent source has all 380 rows');
  return Array.from({ length: 38 }, (_, round) => reference.rows.filter(r => r.round === round + 1).map(r => [r.home, r.away]));
}
function tableFrom(results, clubs) {
  const rows = new Map(clubs.map(club => [club, { club, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }]));
  for (const { home, away, hg, ag } of results) {
    const h = rows.get(home), a = rows.get(away);
    assert.ok(h && a, 'Every settled result has two registered clubs');
    h.p++; a.p++; h.gf += hg; h.ga += ag; a.gf += ag; a.ga += hg;
    if (hg > ag) { h.w++; a.l++; h.pts += 3; }
    else if (hg < ag) { a.w++; h.l++; a.pts += 3; }
    else { h.d++; a.d++; h.pts++; a.pts++; }
  }
  return [...rows.values()].sort((a, b) => a.club.localeCompare(b.club));
}
function actualTable(table) {
  return table.map(({ club, w, d, l, gf, ga, pts }) => ({ club, p: w + d + l, w, d, l, gf, ga, pts })).sort((a, b) => a.club.localeCompare(b.club));
}
function resultRows(report) {
  return [{ home: report.home, away: report.away, hg: report.homeGoals, ag: report.awayGoals }, ...report.otherResults];
}
function assertRound(rows, expected, label) {
  assert.equal(rows.length, 10, `${label}: ten settled matches`);
  assert.deepEqual(rows.map(r => [r.home, r.away]).sort(), [...expected].sort(), `${label}: exact saved opponent order and home/away pairs`);
  for (const row of rows) assert.ok(Number.isInteger(row.hg) && row.hg >= 0 && Number.isInteger(row.ag) && row.ag >= 0, 'Results remain actual nonnegative engine scores');
}
function storage(store = new Map()) {
  globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) };
  return store;
}
function expectedFailures(control) {
  return [controls[control].test, ...(controls[control].extraFailures ?? [])].map(name => cases[name]);
}
function expectedPasses(control) {
  return [...(controls[control].extraFailures?.includes('baseline') ? [] : [cases.baseline]), cases.uncopied];
}
function differences(before, after, keyPath = []) {
  if (Object.is(before, after)) return [];
  if (before && after && typeof before === 'object' && typeof after === 'object') {
    return [...new Set([...Object.keys(before), ...Object.keys(after)])].flatMap(key => differences(before[key], after[key], [...keyPath, key]));
  }
  return [{ path: keyPath.join('.'), beforePresent: before !== undefined, afterPresent: after !== undefined, before, after }];
}

async function main() {
  const control = process.env.CM_REAL_FIXTURE_CONTROL || '';
  assert.ok(!control || control === 'all' || Object.hasOwn(controls, control), 'Known real fixture control');
  const evidence = path.resolve(process.env.CM_REAL_FIXTURE_ARTIFACTS || path.join(root, 'cm-real-fixture-artifacts/outcomes'));
  await mkdir(evidence, { recursive: true });
  if (control === 'all') {
    const summary = [];
    for (const name of ['', ...Object.keys(controls)]) {
      const run = spawnSync(process.execPath, [self], { cwd: root, env: { ...process.env, CM_REAL_FIXTURE_CONTROL: name, CM_REAL_FIXTURE_ARTIFACTS: evidence }, encoding: 'utf8', timeout: 240000, maxBuffer: 16 * 1024 * 1024, windowsHide: true });
      const output = `${run.stdout || ''}\n${run.stderr || ''}`;
      await writeFile(path.join(evidence, `${name || 'normal'}-runner.log`), output);
      let report;
      try { report = JSON.parse(await readFile(path.join(evidence, `${name || 'normal'}-report.json`), 'utf8')); } catch { report = null; }
      const rows = report?.cases ?? [], failed = rows.filter(r => r.status === 'failed'), passed = rows.filter(r => r.status === 'passed');
      const effective = name ? JSON.stringify(failed.map(r => [r.title, r.errorName])) === JSON.stringify(expectedFailures(name).map(title => [title, 'AssertionError']))
        && JSON.stringify(passed.map(r => r.title)) === JSON.stringify(expectedPasses(name))
        : failed.length === 0 && passed.length === Object.keys(cases).length;
      const ok = run.status === 0 && !run.error && !run.signal && report?.numUnhandledErrors === 0 && report?.sourceBytesHeld === true && effective;
      summary.push({ control: name || 'normal', passed: ok, exit: run.status, assertions: passed.length + failed.length, intendedFailures: name ? expectedFailures(name) : [] });
      console.log(`${ok ? 'PASS' : 'FAIL'} real fixtures ${name || 'normal'}`);
      process.stdout.write(ok ? output.split('\n').filter(line => line.startsWith('simCmRealFixtures')).join('\n') + '\n' : output.slice(-12000));
    }
    await writeFile(path.join(evidence, 'summary.json'), JSON.stringify(summary, null, 2));
    assert.ok(summary.every(row => row.passed), 'Normal and all nine effective copied controls execute their exact assertions');
    console.log(`simCmRealFixtures: ${Object.keys(cases).length} actual outcome groups, 760 fixture reads, 760 calendar reads and ${Object.keys(controls).length} effective controls passed.`);
    return;
  }
  const files = [engineFile, helperFile, cardFile, dataFile];
  const sourceHashes = new Map(), verifyBytes = [];
  /* Raw bytes feed only the source hash and unchanged-byte checks. The text
     used by every executable anchor is read and normalised separately. */
  for (const relative of files) {
    const file = path.join(root, relative);
    const originalBytes = await readFile(file);
    sourceHashes.set(relative, sha(originalBytes));
    verifyBytes.push(() => readFile(file).then(current => assert.deepEqual(current, originalBytes, 'All original source bytes remain held')));
  }
  const source = Object.fromEntries(await Promise.all(files.map(async relative => [relative,
    (await readFile(path.join(root, relative), 'utf8')).replaceAll('\r\n', '\n')])));
  const changed = { ...source };
  if (control) {
    const spec = controls[control];
    for (const [from, to, count] of [[spec.from, spec.to, spec.count ?? 1], ...(spec.second ? [[...spec.second, 1]] : [])]) {
      assert.equal(changed[spec.file].split(from).length - 1, count, 'Every executable mutation anchor exists exactly as expected');
      changed[spec.file] = changed[spec.file].replaceAll(from, to);
    }
    assert.notEqual(changed[spec.file], source[spec.file], 'The copied control changes executable bytes');
    await writeFile(path.join(evidence, `${control}-changed-source.txt`), changed[spec.file]);
    await writeFile(path.join(evidence, `${control}-mutation.json`), JSON.stringify({ file: spec.file, test: cases[spec.test], original: sourceHashes.get(spec.file), changed: sha(changed[spec.file]), anchor: spec.from, replacement: spec.to }, null, 2));
  }
  const tempRoot = path.join(root, '.sim-control'); await mkdir(tempRoot, { recursive: true });
  const folder = await mkdtemp(path.join(tempRoot, 'cm-real-fixtures-'));
  const unhandled = [], capture = error => unhandled.push({ name: error?.name, message: String(error?.message ?? error) });
  process.on('unhandledRejection', capture); process.on('uncaughtExceptionMonitor', capture);
  try {
    const require = createRequire(import.meta.url), bundles = new Map();
    const fresh = name => { const target = bundles.get(name); delete require.cache[require.resolve(target)]; return require(target); };
    async function bundle(name, input) {
      const engine = path.join(folder, `${name}-engine.ts`), helper = path.join(folder, `${name}-helper.ts`), card = path.join(folder, `${name}-card.tsx`);
      /* Test-only receipt observes genuine syncWorld scores without changing
         state or random draws. It is never included in product source. */
      const anchor = '        const [hg, ag] = simAiMatch(state, h, a);\n        applyResult(w.table, h, a, hg, ag);';
      assert.equal(input[engineFile].split(anchor).length - 1, 1, 'One real world settlement observation anchor');
      const instrumented = input[engineFile].replace(anchor, '        const [hg, ag] = simAiMatch(state, h, a);\n        __fixtureSyncResults.push({ leagueId: lg.id, home: h, away: a, hg, ag });\n        applyResult(w.table, h, a, hg, ag);')
        + '\nexport const __fixtureSyncResults: { leagueId: string; home: string; away: string; hg: number; ag: number }[] = [];\nexport function __fixtureSyncProbe(state: CareerState, rounds: number) { syncWorld(state, rounds); }\n'
        + `export { PREMIER_FIXTURES_2026 as __fixtureLedger } from '@/data/clubManagerPremierFixtures2026';\nexport { canBindRealPremierFixtures as __canBind, realPremierFixturePairs as __realPairs } from '@/lib/clubManagerFixtures';\nexport { default as __CalendarCard } from ${JSON.stringify(card.replaceAll('\\', '/'))};\n`;
      const byeAnchor = '          const [hg, ag] = simAiMatch(state, h, a);\n          applyResult(state.table, h, a, hg, ag);';
      assert.equal(instrumented.split(byeAnchor).length - 1, 1, 'One real neutral-only settlement observation anchor');
      const observed = instrumented.replace(byeAnchor, '          const [hg, ag] = simAiMatch(state, h, a);\n          __fixtureByeResults.push({ home: h, away: a, hg, ag });\n          applyResult(state.table, h, a, hg, ag);')
        + '\nexport const __fixtureByeResults: { home: string; away: string; hg: number; ag: number }[] = [];\n';
      await writeFile(engine, observed); await writeFile(helper, input[helperFile]); await writeFile(card, input[cardFile]);
      const output = path.join(folder, `${name}.cjs`);
      await build({ entryPoints: [engine], bundle: true, platform: 'node', format: 'cjs', outfile: output, logLevel: 'silent', jsx: 'automatic', external: ['react', 'react/jsx-runtime'],
        alias: { '@/lib/clubManager': engine, '@/lib/clubManagerFixtures': helper, '@': path.join(root, 'src') } });
      bundles.set(name, output); return fresh(name);
    }
    const baselineSource = execFileSync('git', ['show', `${base}:${engineFile}`], { cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }).replaceAll('\r\n', '\n');
    const baselineCard = execFileSync('git', ['show', `${base}:${cardFile}`], { cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }).replaceAll('\r\n', '\n');
    const original = await bundle('original', source);
    await bundle('baseline', { ...source, [engineFile]: baselineSource, [cardFile]: baselineCard });
    const cm = control ? await bundle('candidate', changed) : original;
    const candidateName = control ? 'candidate' : 'original';
    const receipt = JSON.parse(await readFile(path.join(root, 'scripts/data/clubManagerPremierFixtures2026.receipt.json'), 'utf8'));
    const rounds = expectedRounds(receipt), clubs = original.__fixtureLedger.clubs;
    const React = require('react'), { renderToStaticMarkup } = require('react-dom/server');
    const customSpec = { name: 'Test Fixture FC', stadium: 'Test Ground', crest: { shape: 0, pattern: 0, color1: '#112233', color2: '#ffffff', initials: 'TFC' }, budgetTier: 'small', leagueId: 'premier', replacedClub: clubs.at(-1) };
    storage();
    let completed;
    const observations = { fixtureReads: 0, calendarReads: 0, settledMatches: 0 };
    function fullSeason() {
      if (completed) return clone(completed);
      const engine = fresh('original'), results = [];
      let state = seeded(4107, () => engine.startCareer('Arsenal'));
      for (let i = 0; i < 180 && state.week < state.calendar.length; i++) {
        const before = state.week, run = seeded(5000 + i, () => engine.playNextEntry(state, { skipHalftime: true }));
        state = run.state;
        assert.ok(state.week > before || run.kind === 'seasonOver', 'The actual full-season walk makes bounded calendar progress');
        if (run.kind === 'match' && run.report.competition === 'league') {
          const round = results.length / 10;
          const rows = resultRows(run.report); assertRound(rows, rounds[round], `natural round ${round + 1}`); results.push(...rows);
          assert.deepEqual(actualTable(state.table), tableFrom(results, state.leagueClubs), 'Every round table derives only from its actual accepted scores');
        }
      }
      assert.equal(state.week, state.calendar.length); assert.equal(results.length, 380, 'The actual campaign settles all 380 matches');
      observations.settledMatches = results.length;
      assert.ok(state.table.every(r => r.w + r.d + r.l === 38), 'All real league clubs played 38 simulated matches');
      const closed = seeded(6100, () => engine.finishSeason(state));
      completed = { state: closed.state, summary: closed.summary, results };
      return clone(completed);
    }
    async function reloadProof(input, label, expectedKey) {
      const candidate = fresh(candidateName), old = fresh('baseline');
      const candidateStore = storage(); assert.equal(candidate.saveCareer(input), true);
      const inputBytes = candidateStore.get(candidate.SAVE_KEY);
      const loaded = withRealFixtureSeed(9912, () => candidate.loadCareer());
      assert.ok(loaded.value); assert.equal(candidate.saveCareer(loaded.value), true);
      const candidateBytes = candidateStore.get(candidate.SAVE_KEY);
      const oldStore = storage(); oldStore.set(old.SAVE_KEY, inputBytes);
      const prior = withRealFixtureSeed(9912, () => old.loadCareer());
      assert.ok(prior.value); assert.equal(old.saveCareer(prior.value), true);
      const oldBytes = oldStore.get(old.SAVE_KEY);
      const prefix = `${control || 'normal'}-${label}`;
      await writeFile(path.join(evidence, `${prefix}-input.json`), inputBytes);
      await writeFile(path.join(evidence, `${prefix}-candidate-loaded.json`), JSON.stringify(loaded.value, null, 2));
      await writeFile(path.join(evidence, `${prefix}-old-loaded.json`), JSON.stringify(prior.value, null, 2));
      await writeFile(path.join(evidence, `${prefix}-candidate-saved.json`), candidateBytes);
      await writeFile(path.join(evidence, `${prefix}-old-saved.json`), oldBytes);
      await writeFile(path.join(evidence, `${prefix}-reload-diff.json`), JSON.stringify({
        inputToCandidate: differences(JSON.parse(inputBytes), loaded.value), inputToOld: differences(JSON.parse(inputBytes), prior.value),
        oldToCandidate: differences(prior.value, loaded.value), oldDraws: prior.draws, candidateDraws: loaded.draws,
      }, null, 2));
      assert.equal(loaded.draws, prior.draws, 'First-load repairs consume exactly the independent old loader random draws');
      assert.deepEqual(loaded.value, prior.value, 'The entire first loaded save matches the independent old loader on identical input');
      assert.equal(candidateBytes, oldBytes, 'The full first saved bytes match the independent old loader with no dropped fields');
      assert.equal(loaded.value.realLeagueFixtures, expectedKey, 'Loading preserves the saved fixture version or its absence');
      if (label.startsWith('legacy-')) assert.equal(candidateBytes, inputBytes, 'The fully repaired old match save also preserves its original first-load bytes');
      storage(candidateStore);
      const second = withRealFixtureSeed(9913, () => candidate.loadCareer());
      assert.ok(second.value); assert.equal(candidate.saveCareer(second.value), true);
      storage(oldStore);
      const secondOld = withRealFixtureSeed(9913, () => old.loadCareer());
      assert.ok(secondOld.value); assert.equal(old.saveCareer(secondOld.value), true);
      await writeFile(path.join(evidence, `${prefix}-candidate-second-loaded.json`), JSON.stringify(second.value, null, 2));
      await writeFile(path.join(evidence, `${prefix}-old-second-loaded.json`), JSON.stringify(secondOld.value, null, 2));
      await writeFile(path.join(evidence, `${prefix}-second-reload-diff.json`), JSON.stringify({ candidate: differences(loaded.value, second.value), old: differences(prior.value, secondOld.value) }, null, 2));
      assert.equal(second.draws, secondOld.draws); assert.deepEqual(second.value, secondOld.value);
      assert.equal(candidateStore.get(candidate.SAVE_KEY), candidateBytes, 'Second candidate load and save preserve every repaired byte');
      assert.equal(oldStore.get(old.SAVE_KEY), oldBytes, 'The independent old second load and save also preserve every repaired byte');
      return second.value;
    }
    async function baselineFor(name) {
      const starts = [['Barcelona', 'now'], ['Bayern Munich', 'now'], ['Everton', 'era2010'],
        ['Everton', 'now', undefined, undefined, undefined, { premier: [...clubs] }],
        [customSpec.name, 'now', clone(customSpec)]];
      for (const args of starts) for (const seed of [4700, 9173, 1184]) {
        const old = fresh('baseline'), candidate = fresh(name);
        await old.ensureEraRosters(args[1]); await candidate.ensureEraRosters(args[1]);
        const a = withRealFixtureSeed(seed, () => old.startCareer(...args));
        const b = withRealFixtureSeed(seed, () => candidate.startCareer(...args));
        assert.equal(b.draws, a.draws); assert.deepEqual(b.value, a.value, 'Unsupported fresh save stays byte-for-byte at the pre-change baseline');
        const x = withRealFixtureSeed(seed + 4800, () => old.playNextEntry(a.value, { skipHalftime: true }));
        const y = withRealFixtureSeed(seed + 4800, () => candidate.playNextEntry(b.value, { skipHalftime: true }));
        assert.equal(y.draws, x.draws); assert.deepEqual(y.value, x.value, 'Unsupported actual match preserves every recorded field and random draw');
      }
    }
    const outcomes = {
      async ledger() {
        const data = cm.__fixtureLedger;
        const tuples = rows => rows.filter(r => !r.duplicate).map(r => [r.round, r.home, r.away].join('|')).sort();
        assert.deepEqual(tuples(receipt.sources.find(s => s.role === 'official').rows), tuples(receipt.sources.find(s => s.role === 'independent').rows));
        assert.deepEqual(receipt.validation.officialDuplicates.map(r => [r.sourceLine, r.round, r.home, r.away]), [[161, 8, 'Liverpool', 'Brighton']]);
        assert.deepEqual(data.rounds, rounds); assert.equal(new Set(rounds.flat().map(p => p.join('|'))).size, 380);
        assert.ok(!Object.keys(data).some(k => /date|kickoff|score|result/i.test(k)), 'No uncertified dates or results are imported');
        const state = seeded(4107, () => cm.startCareer('Everton'));
        let count = 0;
        for (const club of clubs) {
          let home = 0, away = 0;
          for (const [round, expected] of rounds.entries()) {
            const pair = expected.find(p => p.includes(club)), fx = cm.fixtureFor({ ...state, clubName: club }, { type: 'league', round });
            assert.ok(fx); assert.equal(fx.opponent, pair[0] === club ? pair[1] : pair[0]); assert.equal(fx.home, pair[0] === club);
            fx.home ? home++ : away++; count++; observations.fixtureReads++;
          }
          assert.equal(home, 19); assert.equal(away, 19);
        }
        assert.equal(count, 760);
        const pairs = cm.careerRoundPairs(state, 0); pairs[0][0] = 'Test mutation'; pairs.pop();
        assert.deepEqual(cm.careerRoundPairs(state, 0), rounds[0], 'Returned mutable copies never mutate the saved versioned data');
        const loaded = await reloadProof(state, 'real', key);
        assert.equal(loaded.realLeagueFixtures, key); assert.deepEqual(cm.careerRoundPairs(loaded, 0), rounds[0]);
      },
      calendar() {
        const state = seeded(4107, () => cm.startCareer('Everton')); let count = 0;
        for (const club of clubs) for (const [round, expected] of rounds.entries()) {
          const pair = expected.find(p => p.includes(club)), opponent = pair[0] === club ? pair[1] : pair[0];
          const html = renderToStaticMarkup(React.createElement(cm.__CalendarCard, { career: { ...state, clubName: club, calendar: [{ type: 'league', round }], week: 0 } }));
          assert.ok(html.includes(`${opponent} (${pair[0] === club ? 'H' : 'A'})`), `${club}, round ${round + 1}: actual card has the exact opponent and venue`); count++; observations.calendarReads++;
        }
        assert.equal(count, 760);
      },
      settlement() {
        const pre = seeded(4107, () => cm.startCareer('Everton')), before = structuredClone(pre), inputBytes = JSON.stringify(pre);
        const run = seeded(4200, () => cm.playNextEntry(pre, { skipHalftime: true }));
        assert.equal(run.kind, 'match'); assert.equal(run.report.home, 'Everton'); assert.equal(run.report.away, 'Crystal Palace');
        const rows = resultRows(run.report); assertRound(rows, rounds[0], 'first actual Quick Sim');
        assert.deepEqual(actualTable(run.state.table), tableFrom(rows, pre.leagueClubs));
        assert.equal(run.state.squad.reduce((s, p) => s + p.seasonGoals, 0) - pre.squad.reduce((s, p) => s + p.seasonGoals, 0), run.report.homeGoals, 'Actual accepted goals credit the real scorers once');
        const goals = rows.filter(r => r.home !== pre.clubName && r.away !== pre.clubName).reduce((s, r) => s + r.hg + r.ag, 0);
        const raceBefore = pre.scorerRace.reduce((s, p) => s + p.goals, 0), raceAfter = run.state.scorerRace.reduce((s, p) => s + p.goals, 0);
        assert.ok(raceAfter > raceBefore && raceAfter - raceBefore <= goals, 'Neutral scored goals actually feed bounded golden boot credits');
        assert.deepEqual(pre, before, 'Playing never changes any raw input field, including explicit undefined properties');
        assert.equal(JSON.stringify(pre), inputBytes, 'Playing also preserves every serialized input-save byte'); fullSeason();
      },
      bye() {
        const state = seeded(4107, () => cm.startCareer('Everton'));
        /* Explicit damaged-save probe: no human club in the 20-club pool.
           The engine must still settle the neutral round, not invent a match. */
        state.clubName = 'Test absent club'; state.calendar = [{ type: 'league', round: 0 }];
        cm.__fixtureByeResults.length = 0;
        const run = seeded(4300, () => cm.playNextEntry(state, { untilWeek: 1, skipHalftime: true }));
        assert.equal(run.state.week, 1); assert.equal(run.state.resultLog.length, 0);
        assert.ok(run.state.table.every(r => r.w + r.d + r.l === 1));
        /* The test-only receipt records the actual neutral scores above. */
        const traced = cm.__fixtureByeResults;
        assertRound(traced, rounds[0], 'actual neutral-only round');
        assert.deepEqual(actualTable(run.state.table), tableFrom(traced, state.leagueClubs));
        assert.ok(run.state.scorerRace.some(r => r.goals > 0), 'Neutral-only results really credit scorers');
      },
      world() {
        /* Cross-league context keeps the existing saved version while viewing
           the verified Premier pool as a world league. No new binding occurs. */
        const state = seeded(4107, () => cm.startCareer('Barcelona')); state.realLeagueFixtures = key;
        cm.__fixtureSyncResults.length = 0;
        seeded(4400, () => cm.__fixtureSyncProbe(state, 1));
        const rows = cm.__fixtureSyncResults.filter(r => r.leagueId === 'premier');
        assertRound(rows, rounds[0], 'actual world round');
        assert.equal(state.world.premier.round, 1); assert.deepEqual(actualTable(state.world.premier.table), tableFrom(rows, clubs));
      },
      eligibility() {
        const state = seeded(4107, () => cm.startCareer('Everton'));
        assert.equal(state.realLeagueFixtures, key); assert.equal(cm.careerFixtureCoverage(state)?.key, key);
        for (const altered of [{ ...state, customClub: { name: 'Test custom club' } }, { ...state, leagueOverrides: { premier: [...clubs] } }]) {
          assert.equal(cm.__canBind(altered, 'premier', [...clubs]), false, 'Custom and edited saves cannot claim untouched real fixtures');
          assert.equal(cm.careerFixtureCoverage(altered), null);
        }
        const edited = seeded(4107, () => cm.startCareer('Everton', 'now', undefined, undefined, undefined, { premier: [...clubs] }));
        assert.equal(edited.realLeagueFixtures, undefined, 'Even an edit restoring the same Premier clubs remains an edited start');
        const founded = seeded(4107, () => cm.startCareer(customSpec.name, 'now', clone(customSpec)));
        assert.equal(founded.realLeagueFixtures, undefined); assert.equal(cm.careerFixtureCoverage(founded), null);
        const internal = seeded(4107, () => cm.startCareer('Everton', 'now', undefined, undefined, { yearsOn: 1, uclField: null, keepLeagueOverrides: false }));
        assert.equal(internal.realLeagueFixtures, undefined, 'An internal running-world start never binds a fresh season');
        assert.equal(seeded(4107, () => cm.startCareer('Barcelona')).realLeagueFixtures, undefined);
      },
      async legacy() {
        for (const seed of [4107, 9027, 1184]) {
          const old = fresh('baseline'), candidate = fresh(candidateName);
          const a = withRealFixtureSeed(seed, () => old.startCareer('Everton'));
          const b = withRealFixtureSeed(seed, () => candidate.startCareer('Everton')); delete b.value.realLeagueFixtures;
          assert.equal(a.draws, b.draws, 'Binding consumes no random draws'); assert.deepEqual(b.value, a.value, 'Only the optional fixture key changes the fresh save');
          for (let round = 0; round < 38; round++) assert.deepEqual(candidate.fixtureFor(b.value, { type: 'league', round }), old.fixtureFor(a.value, { type: 'league', round }), 'Absent key preserves every generated old fixture');
          const x = withRealFixtureSeed(seed + 4500, () => old.playNextEntry(a.value, { skipHalftime: true }));
          const y = withRealFixtureSeed(seed + 4500, () => candidate.playNextEntry(b.value, { skipHalftime: true }));
          assert.equal(y.draws, x.draws); assert.deepEqual(y.value, x.value, 'Old-key-absent match, scores, stats, events, money and whole saved state stay exact');
          const loaded = await reloadProof(y.value.state, `legacy-${seed}`, undefined);
          assert.equal(loaded.realLeagueFixtures, undefined); assert.equal(candidate.careerFixtureCoverage(loaded), null);
          for (let round = 0; round < 38; round++) assert.deepEqual(candidate.fixtureFor(loaded, { type: 'league', round }), old.fixtureFor(loaded, { type: 'league', round }), 'Canonical loading preserves every old fixture');
        }
        const args = ['Everton', 'now', undefined, undefined, { yearsOn: 1, uclField: null, keepLeagueOverrides: false }];
        const old = fresh('baseline'), candidate = fresh(candidateName);
        const a = withRealFixtureSeed(9030, () => old.startCareer(...args));
        const b = withRealFixtureSeed(9030, () => candidate.startCareer(...args));
        assert.equal(a.draws, b.draws); assert.deepEqual(b.value, a.value, 'Internal future-world starts preserve the entire old generated save');
        const x = withRealFixtureSeed(9031, () => old.playNextEntry(a.value, { skipHalftime: true }));
        const y = withRealFixtureSeed(9031, () => candidate.playNextEntry(b.value, { skipHalftime: true }));
        assert.equal(y.draws, x.draws); assert.deepEqual(y.value, x.value);
      },
      future() {
        const state = seeded(4107, () => cm.startCareer('Everton'));
        for (const altered of [{ ...state, season: 2 }, { ...state, startYear: 2027 }, { ...state, eraId: 'era2010' }, { ...state, realLeagueFixtures: 'unknown-version' }]) {
          assert.equal(cm.__realPairs(altered, 'premier', [...clubs], 0), null, 'No stale key invents another real season');
          assert.equal(cm.careerFixtureCoverage(altered), null);
        }
        for (const pool of [clubs.slice(1), [...clubs.slice(0, -1), clubs[0]], [...clubs.slice(0, -1), 'Test changed club']]) assert.equal(cm.__realPairs(state, 'premier', pool, 0), null);
        assert.equal(cm.__realPairs(state, 'laliga', [...clubs], 0), null);
        for (const round of [-1, 38, 0.5, NaN]) assert.equal(cm.__realPairs(state, 'premier', [...clubs], round), null);
      },
      async rollover() {
        const finished = fullSeason(), candidate = fresh(candidateName), old = fresh('baseline');
        const legacyFinished = clone(finished.state); delete legacyFinished.realLeagueFixtures;
        const rolled = withRealFixtureSeed(6200, () => candidate.startNextSeason(finished.state));
        const prior = withRealFixtureSeed(6200, () => old.startNextSeason(legacyFinished));
        const next = rolled.value;
        assert.equal(next.season, 2); assert.equal(next.realLeagueFixtures, undefined, 'Every rollover clears the real fixture key');
        assert.equal(rolled.draws, prior.draws); assert.deepEqual(next, prior.value, 'A generated future season preserves the full independent rollover state and random stream');
        assert.equal(candidate.careerFixtureCoverage(next), null);
        for (let round = 0; round < 38; round++) assert.deepEqual(candidate.careerRoundPairs(next, round), candidate.roundPairs(next.leagueClubs, round, !!next.balancedFixtures));
        assert.equal(finished.state.realLeagueFixtures, key, 'Rolling never changes the completed input season');
        if (!control) {
          await writeFile(path.join(evidence, 'native-later-season.json'), JSON.stringify(next));
          await writeFile(path.join(evidence, 'native-later-season-receipt.json'), JSON.stringify({ base, club: finished.state.clubName, season: 1, settledRounds: 38, matches: finished.results.length, played: finished.state.table.map(r => [r.club, r.w + r.d + r.l]), results: finished.results, nextSeason: next.season, fixtureKeyAfter: next.realLeagueFixtures ?? null, nativeSaveSha256: sha(JSON.stringify(next)) }, null, 2));
        }
      },
      async baseline() {
        await baselineFor(candidateName);
      },
      async uncopied() {
        await baselineFor('original');
      },
    };
    const rows = [];
    for (const [name, title] of Object.entries(cases)) {
      if (control && name !== controls[control].test && name !== 'baseline' && name !== 'uncopied') { rows.push({ title, status: 'skipped' }); continue; }
      try { await outcomes[name](); rows.push({ title, status: 'passed' }); }
      catch (error) { rows.push({ title, status: 'failed', errorName: error.name, message: error.message, stack: error.stack }); }
    }
    await new Promise(resolve => setImmediate(resolve));
    for (const verify of verifyBytes) await verify();
    await writeFile(path.join(evidence, `${control || 'normal'}-report.json`), JSON.stringify({ base, baselineSourceSha256: sha(baselineSource), originalHash: sourceHashes.get(engineFile), control: control || 'normal', ...observations, sourceBytesHeld: true, numUnhandledErrors: unhandled.length, unhandled, cases: rows }, null, 2));
    assert.deepEqual(unhandled, [], 'Import/runtime errors never count as an effective control');
    if (control) {
      assert.deepEqual(rows.filter(r => r.status === 'failed').map(r => [r.title, r.errorName]), expectedFailures(control).map(title => [title, 'AssertionError']));
      assert.deepEqual(rows.filter(r => r.status === 'passed').map(r => r.title), expectedPasses(control));
      assert.equal(rows.filter(r => r.status === 'skipped').length, Object.keys(cases).length - 3);
    } else { assert.deepEqual(rows.filter(r => r.status === 'failed'), []); assert.equal(rows.filter(r => r.status === 'passed').length, Object.keys(cases).length); }
    console.log(`simCmRealFixtures ${control || 'normal'}: real fixture outcomes and independent generated baseline passed.`);
  } finally {
    process.off('unhandledRejection', capture); process.off('uncaughtExceptionMonitor', capture);
    assert.equal(path.dirname(folder), tempRoot); assert.ok(path.basename(folder).startsWith('cm-real-fixtures-'));
    await rm(folder, { recursive: true, force: true });
    for (const verify of verifyBytes) await verify();
  }
}
if (process.env.CM_REAL_FIXTURE_IMPORT_ONLY !== '1') await main();
