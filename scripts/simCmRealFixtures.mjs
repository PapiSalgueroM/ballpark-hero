/* Round 1184: verified opponent order and venues, with simulated results.
   Copied faults must fail their actual named outcome, never an import error.

   Round 1225: one proof, any registered league.
     CM_REAL_FIXTURE_LEAGUE=<leagueId>   the league whose list is proven (default premier). It must be a line of
                                         REAL_LEAGUE_FIXTURES in src/lib/clubManagerFixtures.ts.
     CM_FIXTURE_BASE=<commit>            the engine every "nothing moved" group compares with: the WHOLE src tree
                                         of that commit, bundled on its own (one file of a base is not the base's
                                         engine). The groups legacy, baseline and uncopied need it. Without it they
                                         are NOT RUN and the run says so in one loud line; a base that cannot be
                                         read is an error, never a skip. A gate line names the base.
     CM_REAL_FIXTURE_CONTROL=<name>|all  one copied fault, or the normal run and every fault (needs the base).
   Every count comes from the ledger: n clubs, 2 x (n - 1) matchdays, n x (n - 1) fixtures.
   A lazy list is fetched into every fresh copy of the candidate engine before a group reads it, the way the
   page fetches it; the group "unloaded" is the one that does not, on purpose. */
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
const self = fileURLToPath(import.meta.url);
const LEAGUE = process.env.CM_REAL_FIXTURE_LEAGUE || 'premier';
const BASE = process.env.CM_FIXTURE_BASE || '';
const engineFile = 'src/lib/clubManager.ts', helperFile = 'src/lib/clubManagerFixtures.ts';
const cardFile = 'src/components/club-manager/CalendarCard.tsx';
/* Round 1225 review: the takeover and the job move live here, and the group takeover copies faults into it. */
const calendarFile = 'src/lib/clubManagerCalendar.ts';
const clone =value => JSON.parse(JSON.stringify(value));
const sha = value => createHash('sha256').update(value).digest('hex');
/* Artifact names. The Premier League keeps Round 1184's plain names: scripts/playCmRealFixtures.mjs reads two of them. */
const tag = name => (LEAGUE === 'premier' ? name : `${LEAGUE}-${name}`);
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
  ledger: 'reads every fixture of the list with the exact two-source round order and venues',
  calendar: 'renders every CalendarCard opponent and venue reading from the same schedule',
  settlement: 'settles the actual human fixture and every neutral result with conserved table and scorer credits',
  bye: 'settles a neutral-only league entry through the same real fixture resolver',
  world: 'settles the actual world league round through the same real fixture resolver',
  eligibility: 'binds only a fresh original modern world of this league with exact membership',
  takeover: 'keeps the key through a mid season takeover, played in the real order before and after the handover, and gives none to a club joined during a season',
  unloaded: 'gives no key while the list is not here, and refuses to read a saved key without its list',
  legacy: 'preserves the whole generated save with the key taken out: random draws, twelve entries, saved bytes, reload',
  future: 'refuses stale keys in later seasons, other years and changed league membership',
  rollover: 'clears the real fixture key after a fully played season before generating the next season',
  baseline: 'matches the base engine for unsupported starts and genuine match outcomes',
  uncopied: 'passes the whole base comparison with untouched current source under every copied fault',
};
const NEEDS_BASE = ['legacy', 'baseline', 'uncopied'];
/* The neutral-only probe damages a save so that its club is in no league. The engine reads a save's league off its
   club, and a club it does not know reads as the game's first league, so the probe can only stand in the Premier
   League. Every bound league has an even number of clubs, so no real save of one ever has a neutral-only round. */
const PREMIER_ONLY = ['bye'];
const controls = {
  venues: { file: helperFile, from: '=> [home, away]);', to: '=> [away, home]);', test: 'ledger' },
  card: { file: cardFile, from: 'import { careerLeagueOf, careerRoundPairs }', to: 'import { careerLeagueOf, careerRoundPairs, roundPairs }',
    second: ['careerRoundPairs(career, round)', 'roundPairs(career.leagueClubs, round, !!career.balancedFixtures)'], test: 'calendar' },
  settlement: { file: engineFile, from: "if (fx.competition === 'league') {\n    const pairs = careerRoundPairs(state, entry.round);",
    to: "if (fx.competition === 'league') {\n    const pairs = roundPairs(state.leagueClubs, entry.round, !!state.balancedFixtures);", test: 'settlement' },
  bye: { file: engineFile, from: '        const pairs = careerRoundPairs(state, entry.round);',
    to: '        const pairs = roundPairs(state.leagueClubs, entry.round, !!state.balancedFixtures);', test: 'bye', premierOnly: true },
  world: { file: engineFile, from: 'careerRoundPairs(state, w.round, lg.clubs, lg.id)',
    to: 'roundPairs(lg.clubs, w.round, !!state.balancedFixtures)', test: 'world' },
  edited: { file: helperFile, from: '&& !state.customClub && !state.leagueOverrides', to: '&& true', test: 'eligibility' },
  legacy: { file: helperFile, from: 'e.key === state.realLeagueFixtures', to: 'e.leagueId === leagueId', test: 'legacy', extraFailures: ['baseline'] },
  future: { file: helperFile, from: '&& state.season === 1', to: '&& true', test: 'future' },
  rollover: { file: engineFile, from: '  delete state.realLeagueFixtures;', to: '  state.realLeagueFixtures = career.realLeagueFixtures;', test: 'rollover' },
  /* Round 1225: a saved key whose list has not arrived reads the generated list instead of stopping. Only a list
     in a file of its own can be absent, so this fault does not apply to the Premier League, which rides with the engine. */
  silent: { file: helperFile, from: 'if (!ledger) throw new Error(', to: 'if (!ledger) return null;\n  if (!ledger) throw new Error(', test: 'unloaded', lazyOnly: true },
  /* Round 1225 review: the two ways a job is taken part way through a season, each made to do what the other
     does. handover: the picker's takeover drops the key as it hands the club over, so the dugout screen's season
     would be finished on a generated list under a Calendar that had been naming the real one. jobmove: a club
     joined during a season carries the old club's key across, so Help's "keeps generated fixtures" would be false. */
  handover: { file: calendarFile, from: '    midSeasonStart: entry,', to: '    midSeasonStart: entry,\n    realLeagueFixtures: undefined,', test: 'takeover' },
  jobmove: { file: calendarFile, from: '    jobHunt: closeOnJoiningNow(', to: '    realLeagueFixtures: career.realLeagueFixtures,\n    jobHunt: closeOnJoiningNow(', test: 'takeover' },
};

/** The matchdays as the receipt's last source printed them, in the game's spellings. No source is looked up by a role. */
function expectedRounds(receipt, count, perRound) {
  const source = receipt.sources.at(-1);
  const table = source.nameNormalization || receipt.nameNormalization || {};
  const map = name => (Object.hasOwn(table, name) ? table[name] : name);
  const seen = new Set(), rows = [];
  for (const r of source.rows) {
    const key = `${r.round}|${map(r.home)}|${map(r.away)}`;
    if (!seen.has(key)) { seen.add(key); rows.push({ round: r.round, home: map(r.home), away: map(r.away) }); }
  }
  assert.equal(rows.length, count * perRound, 'The receipt source has every fixture once');
  return Array.from({ length: count }, (_, round) => rows.filter(r => r.round === round + 1).map(r => [r.home, r.away]));
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
  assert.equal(rows.length, expected.length, `${label}: every match of the matchday settled`);
  assert.deepEqual(rows.map(r => [r.home, r.away]).sort(), [...expected].sort(), `${label}: exact saved opponent order and home/away pairs`);
  for (const row of rows) assert.ok(Number.isInteger(row.hg) && row.hg >= 0 && Number.isInteger(row.ag) && row.ag >= 0, 'Results remain actual nonnegative engine scores');
}
function storage(store = new Map()) {
  globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) };
  return store;
}
function differences(before, after, keyPath = []) {
  if (Object.is(before, after)) return [];
  if (before && after && typeof before === 'object' && typeof after === 'object') {
    return [...new Set([...Object.keys(before), ...Object.keys(after)])].flatMap(key => differences(before[key], after[key], [...keyPath, key]));
  }
  return [{ path: keyPath.join('.'), beforePresent: before !== undefined, afterPresent: after !== undefined, before, after }];
}
const stripped = state => { const copy = { ...state }; delete copy.realLeagueFixtures; return copy; };
function expectedFailures(control) {
  return [controls[control].test, ...(controls[control].extraFailures ?? [])].map(name => cases[name]);
}
function expectedPasses(control) {
  return [...(controls[control].extraFailures?.includes('baseline') ? [] : [cases.baseline]), cases.uncopied];
}
const cannot = why => { console.error(`simCmRealFixtures: cannot run: ${why}`); process.exit(2); };

async function main() {
  const control = process.env.CM_REAL_FIXTURE_CONTROL || '';
  assert.ok(!control || control === 'all' || Object.hasOwn(controls, control), 'Known real fixture control');
  if (control && !BASE) cannot('a control is judged beside the base comparison, so it needs CM_FIXTURE_BASE=<commit>');
  let baseSha = '';
  if (BASE) {
    try { baseSha = execFileSync('git', ['rev-parse', '--verify', `${BASE}^{commit}`], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim(); }
    catch (error) { cannot(`the base ${BASE} is not a commit this clone has (${String(error.stderr || error.message).trim().split('\n')[0]})`); }
  }
  const evidence = path.resolve(process.env.CM_REAL_FIXTURE_ARTIFACTS || path.join(root, 'cm-real-fixture-artifacts/outcomes'));
  await mkdir(evidence, { recursive: true });
  if (control === 'all') {
    const summary = [];
    let reads = 0, groups = 0;
    for (const name of ['', ...Object.keys(controls)]) {
      const run = spawnSync(process.execPath, [self], { cwd: root, env: { ...process.env, CM_REAL_FIXTURE_CONTROL: name, CM_REAL_FIXTURE_ARTIFACTS: evidence }, encoding: 'utf8', timeout: 480000, maxBuffer: 16 * 1024 * 1024, windowsHide: true });
      const output = `${run.stdout || ''}\n${run.stderr || ''}`;
      await writeFile(path.join(evidence, tag(`${name || 'normal'}-runner.log`)), output);
      let report;
      try { report = JSON.parse(await readFile(path.join(evidence, tag(`${name || 'normal'}-report.json`)), 'utf8')); } catch { report = null; }
      if (name && report?.notApplicable) { console.log(`SKIP real fixtures ${LEAGUE} ${name}: ${report.notApplicable}`); continue; }
      const rows = report?.cases ?? [], failed = rows.filter(r => r.status === 'failed'), passed = rows.filter(r => r.status === 'passed');
      const effective = name ? JSON.stringify(failed.map(r => [r.title, r.errorName])) === JSON.stringify(expectedFailures(name).map(title => [title, 'AssertionError']))
        && JSON.stringify(passed.map(r => r.title)) === JSON.stringify(expectedPasses(name))
        : failed.length === 0 && passed.length === report?.expectedToPass;
      const ok = run.status === 0 && !run.error && !run.signal && report?.numUnhandledErrors === 0 && report?.sourceBytesHeld === true && report?.league === LEAGUE && effective;
      if (!name) { reads = report?.fixtureReads ?? 0; groups = passed.length; }
      summary.push({ control: name || 'normal', passed: ok, exit: run.status, assertions: passed.length + failed.length, intendedFailures: name ? expectedFailures(name) : [] });
      console.log(`${ok ? 'PASS' : 'FAIL'} real fixtures ${LEAGUE} ${name || 'normal'}`);
      process.stdout.write(ok ? output.split('\n').filter(line => line.startsWith('simCmRealFixtures')).join('\n') + '\n' : output.slice(-12000));
    }
    await writeFile(path.join(evidence, tag('summary.json')), JSON.stringify(summary, null, 2));
    assert.ok(summary.every(row => row.passed), 'Normal and every effective copied control execute their exact assertions');
    console.log(`simCmRealFixtures ${LEAGUE}: ${groups} actual outcome groups, ${reads} fixture reads, ${reads} calendar reads and ${summary.length - 1} effective controls passed against the base ${baseSha}.`);
    return;
  }
  /* Which files hold this league's list: its frozen line names them. */
  const frozen = JSON.parse(await readFile(path.join(root, 'scripts/data/cmLeagueFixtures.frozen.json'), 'utf8')).ledgers;
  const lines = Object.entries(frozen).filter(([, line]) => line.leagueId === LEAGUE);
  if (lines.length !== 1) cannot(`${lines.length} frozen ledgers for the league ${LEAGUE}, wanted exactly one`);
  const [key, line] = lines[0];
  const dataFile = line.file;
  const files = [engineFile, helperFile, cardFile, calendarFile, dataFile];
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
    await writeFile(path.join(evidence, tag(`${control}-changed-source.txt`)), changed[spec.file]);
    await writeFile(path.join(evidence, tag(`${control}-mutation.json`)), JSON.stringify({ file: spec.file, test: cases[spec.test], original: sourceHashes.get(spec.file), changed: sha(changed[spec.file]), anchor: spec.from, replacement: spec.to }, null, 2));
  }
  const tempRoot = path.join(root, '.sim-control'); await mkdir(tempRoot, { recursive: true });
  const folder = await mkdtemp(path.join(tempRoot, 'cm-real-fixtures-'));
  const unhandled = [], capture = error => unhandled.push({ name: error?.name, message: String(error?.message ?? error) });
  process.on('unhandledRejection', capture); process.on('uncaughtExceptionMonitor', capture);
  try {
    const require = createRequire(import.meta.url), bundles = new Map();
    const fresh = name => { const target = bundles.get(name); delete require.cache[require.resolve(target)]; return require(target); };
    /* A fresh copy of a candidate engine with every registered list fetched, the way the page fetches one before a career reads it. */
    const freshLoaded = async name => { const engine = fresh(name); for (const e of engine.__registry ?? []) await engine.__ensureFixtures(e.key); return engine; };
    async function bundle(name, input) {
      const engine = path.join(folder, `${name}-engine.ts`), helper = path.join(folder, `${name}-helper.ts`), card = path.join(folder, `${name}-card.tsx`);
      const calendar = path.join(folder, `${name}-calendar.ts`);
      /* Test-only receipt observes genuine syncWorld scores without changing
         state or random draws. It is never included in product source. */
      const anchor = '        const [hg, ag] = simAiMatch(state, h, a);\n        applyResult(w.table, h, a, hg, ag);';
      assert.equal(input[engineFile].split(anchor).length - 1, 1, 'One real world settlement observation anchor');
      const instrumented = input[engineFile].replace(anchor, '        const [hg, ag] = simAiMatch(state, h, a);\n        __fixtureSyncResults.push({ leagueId: lg.id, home: h, away: a, hg, ag });\n        applyResult(w.table, h, a, hg, ag);')
        + '\nexport const __fixtureSyncResults: { leagueId: string; home: string; away: string; hg: number; ag: number }[] = [];\nexport function __fixtureSyncProbe(state: CareerState, rounds: number) { syncWorld(state, rounds); }\n'
        + `export { REAL_LEAGUE_FIXTURES as __registry, ensureRealLeagueFixtures as __ensureFixtures, canBindRealLeagueFixtures as __canBindLedger, realLeagueFixturePairs as __realPairs, __ledgerOf } from '@/lib/clubManagerFixtures';\nexport { default as __CalendarCard } from ${JSON.stringify(card.replaceAll('\\', '/'))};\n`
        + "export { startMidSeason as __startMidSeason, joinClubNow as __joinClubNow } from '@/lib/clubManagerCalendar';\n";
      const byeAnchor = '          const [hg, ag] = simAiMatch(state, h, a);\n          applyResult(state.table, h, a, hg, ag);';
      assert.equal(instrumented.split(byeAnchor).length - 1, 1, 'One real neutral-only settlement observation anchor');
      const observed = instrumented.replace(byeAnchor, '          const [hg, ag] = simAiMatch(state, h, a);\n          __fixtureByeResults.push({ home: h, away: a, hg, ag });\n          applyResult(state.table, h, a, hg, ag);')
        + '\nexport const __fixtureByeResults: { home: string; away: string; hg: number; ag: number }[] = [];\n';
      /* Test-only reader of a list that has arrived, appended to the copy of the helper: the game has no use for one. */
      const helperCopy = input[helperFile] + '\nexport const __ledgerOf = (key: string) => { const entry = REAL_LEAGUE_FIXTURES.find(e => e.key === key); return entry ? ledgerOf(entry) : null; };\n';
      await writeFile(engine, observed); await writeFile(helper, helperCopy); await writeFile(card, input[cardFile]); await writeFile(calendar, input[calendarFile]);
      const output = path.join(folder, `${name}.cjs`);
      await build({ entryPoints: [engine], bundle: true, platform: 'node', format: 'cjs', outfile: output, logLevel: 'silent', jsx: 'automatic', external: ['react', 'react/jsx-runtime'],
        alias: { '@/lib/clubManager': engine, '@/lib/clubManagerFixtures': helper, '@/lib/clubManagerCalendar': calendar, '@': path.join(root, 'src') } });
      bundles.set(name, output);
    }
    /* The base engine is the base's whole src tree, bundled on its own: it shares no module with the candidate. */
    async function bundleBase() {
      const dir = path.join(folder, 'base'); await mkdir(dir);
      try {
        execFileSync('git', ['archive', '--format=tar', '-o', path.join(dir, 'src.tar'), baseSha, 'src'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
        execFileSync('tar', ['-xf', 'src.tar'], { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] });
      } catch (error) { cannot(`the src tree of the base ${baseSha} could not be read (${String(error.stderr || error.message).trim().split('\n')[0]})`); }
      const output = path.join(folder, 'baseline.cjs');
      await build({ entryPoints: [path.join(dir, engineFile)], bundle: true, platform: 'node', format: 'cjs', outfile: output, logLevel: 'silent', jsx: 'automatic', external: ['react', 'react/jsx-runtime'],
        alias: { '@': path.join(dir, 'src') }, nodePaths: [path.join(root, 'node_modules')] });
      bundles.set('baseline', output);
      return sha(await readFile(path.join(dir, engineFile)));
    }
    await bundle('original', source);
    const baselineSourceSha256 = BASE ? await bundleBase() : null;
    if (control) await bundle('candidate', changed);
    const candidateName = control ? 'candidate' : 'original';
    const original = await freshLoaded('original'), cm = control ? await freshLoaded('candidate') : original;
    const entry = original.__registry.find(e => e.leagueId === LEAGUE);
    if (!entry) cannot(`the game's registry has no list for the league ${LEAGUE}`);
    if (entry.key !== key) cannot(`the registry gives ${LEAGUE} the key ${entry.key} and its frozen line is ${key}`);
    const lazy = !entry.ledger;
    const inapplicable = !control ? '' : controls[control].lazyOnly && !lazy ? 'this list rides with the engine, so it is never absent'
      : controls[control].premierOnly && LEAGUE !== 'premier' ? 'the neutral-only probe can only stand in the Premier League' : '';
    if (inapplicable) {
      await writeFile(path.join(evidence, tag(`${control}-report.json`)), JSON.stringify({ league: LEAGUE, control, notApplicable: inapplicable }, null, 2));
      console.log(`simCmRealFixtures ${control} ${LEAGUE}: does not apply, ${inapplicable}.`);
      return;
    }
    const data = clone(original.__ledgerOf(key));
    const clubs = [...data.clubs], n = clubs.length, R = data.rounds.length, perRound = n / 2, total = R * perRound;
    assert.equal(R, 2 * (n - 1), 'The list is a double round robin of the league');
    const receipt = JSON.parse(await readFile(path.join(root, line.receipt), 'utf8'));
    const rounds = expectedRounds(receipt, R, perRound);
    const leagueName = original.REAL_LEAGUES.find(l => l.id === LEAGUE).name;
    /* The clubs each group manages. The Premier League keeps Round 1184's two, the others take theirs off the ledger. */
    const myClub = LEAGUE === 'premier' ? 'Everton' : clubs[0];
    const seasonClub = LEAGUE === 'premier' ? 'Arsenal' : clubs[Math.floor(n / 2)];
    const opening = rounds[0].find(p => p.includes(myClub));
    /* A club whose league can never bind (the game plays 22 rounds of the Scottish league's 33 and a split). */
    const outsider = 'Celtic';
    const otherLeague = LEAGUE === 'laliga' ? 'premier' : 'laliga';
    const eraClub = { premier: 'Everton', laliga: 'Barcelona', seriea: 'Juventus', bundesliga: 'Bayern Munich' }[LEAGUE];
    const byPair = pairs => pairs.map(p => p.join('|')).sort();
    const React = require('react'), { renderToStaticMarkup } = require('react-dom/server');
    const customSpec = { name: 'Test Fixture FC', stadium: 'Test Ground', crest: { shape: 0, pattern: 0, color1: '#112233', color2: '#ffffff', initials: 'TFC' }, budgetTier: 'small', leagueId: LEAGUE, replacedClub: clubs.at(-1) };
    storage();
    let completed;
    const observations = { fixtureReads: 0, calendarReads: 0, settledMatches: 0 };
    async function fullSeason() {
      if (completed) return clone(completed);
      const engine = await freshLoaded('original'), results = [];
      let state = seeded(4107, () => engine.startCareer(seasonClub));
      for (let i = 0; i < 240 && state.week < state.calendar.length; i++) {
        const before = state.week, run = seeded(5000 + i, () => engine.playNextEntry(state, { skipHalftime: true }));
        state = run.state;
        assert.ok(state.week > before || run.kind === 'seasonOver', 'The actual full-season walk makes bounded calendar progress');
        if (run.kind === 'match' && run.report.competition === 'league') {
          const round = results.length / perRound;
          const rows = resultRows(run.report); assertRound(rows, rounds[round], `natural round ${round + 1}`); results.push(...rows);
          assert.deepEqual(actualTable(state.table), tableFrom(results, state.leagueClubs), 'Every round table derives only from its actual accepted scores');
        }
      }
      assert.equal(state.week, state.calendar.length); assert.equal(results.length, total, 'The actual campaign settles every match of the list');
      observations.settledMatches = results.length;
      assert.ok(state.table.every(r => r.w + r.d + r.l === R), 'Every club of the league played its whole simulated season');
      const closed = seeded(6100, () => engine.finishSeason(state));
      completed = { state: closed.state, summary: closed.summary, results };
      return clone(completed);
    }
    /* Save, load and save again. With a base, the base's loader does the same on the same bytes and must agree on every byte and draw. */
    async function reloadProof(input, label, expectedKey) {
      const candidate = await freshLoaded(candidateName);
      const candidateStore = storage(); assert.equal(candidate.saveCareer(input), true);
      const inputBytes = candidateStore.get(candidate.SAVE_KEY);
      const loaded = withRealFixtureSeed(9912, () => candidate.loadCareer());
      assert.ok(loaded.value); assert.equal(candidate.saveCareer(loaded.value), true);
      const candidateBytes = candidateStore.get(candidate.SAVE_KEY);
      assert.equal(loaded.value.realLeagueFixtures, expectedKey, 'Loading preserves the saved fixture version or its absence');
      const prefix = tag(`${control || 'normal'}-${label}`);
      await writeFile(path.join(evidence, `${prefix}-input.json`), inputBytes);
      await writeFile(path.join(evidence, `${prefix}-candidate-saved.json`), candidateBytes);
      let old = null, oldStore = null, prior = null, oldBytes = null;
      if (BASE) {
        old = fresh('baseline'); oldStore = storage(); oldStore.set(old.SAVE_KEY, inputBytes);
        prior = withRealFixtureSeed(9912, () => old.loadCareer());
        assert.ok(prior.value); assert.equal(old.saveCareer(prior.value), true);
        oldBytes = oldStore.get(old.SAVE_KEY);
        await writeFile(path.join(evidence, `${prefix}-reload-diff.json`), JSON.stringify({
          inputToCandidate: differences(JSON.parse(inputBytes), loaded.value), inputToOld: differences(JSON.parse(inputBytes), prior.value),
          oldToCandidate: differences(prior.value, loaded.value), oldDraws: prior.draws, candidateDraws: loaded.draws,
        }, null, 2));
        assert.equal(loaded.draws, prior.draws, 'First-load repairs consume exactly the base loader random draws');
        assert.deepEqual(loaded.value, prior.value, 'The entire first loaded save matches the base loader on identical input');
        assert.equal(candidateBytes, oldBytes, 'The full first saved bytes match the base loader with no dropped fields');
      }
      if (label.startsWith('legacy-')) assert.equal(candidateBytes, inputBytes, 'The fully repaired old match save also preserves its original first-load bytes');
      storage(candidateStore);
      const second = withRealFixtureSeed(9913, () => candidate.loadCareer());
      assert.ok(second.value); assert.equal(candidate.saveCareer(second.value), true);
      assert.equal(candidateStore.get(candidate.SAVE_KEY), candidateBytes, 'Second candidate load and save preserve every repaired byte');
      if (BASE) {
        storage(oldStore);
        const secondOld = withRealFixtureSeed(9913, () => old.loadCareer());
        assert.ok(secondOld.value); assert.equal(old.saveCareer(secondOld.value), true);
        assert.equal(second.draws, secondOld.draws); assert.deepEqual(second.value, secondOld.value);
        assert.equal(oldStore.get(old.SAVE_KEY), oldBytes, 'The base second load and save also preserve every repaired byte');
      }
      return second.value;
    }
    async function baselineFor(name) {
      const starts = [[outsider, 'now'], ...(eraClub ? [[eraClub, 'era2010']] : []),
        [myClub, 'now', undefined, undefined, undefined, { [LEAGUE]: [...clubs] }],
        [customSpec.name, 'now', clone(customSpec)]];
      for (const args of starts) for (const seed of [4700, 9173, 1184]) {
        const old = fresh('baseline'), candidate = await freshLoaded(name);
        await old.ensureEraRosters(args[1]); await candidate.ensureEraRosters(args[1]);
        const a = withRealFixtureSeed(seed, () => old.startCareer(...args));
        const b = withRealFixtureSeed(seed, () => candidate.startCareer(...args));
        assert.equal(b.draws, a.draws); assert.deepEqual(b.value, a.value, 'Unsupported fresh save stays byte-for-byte at the base');
        const x = withRealFixtureSeed(seed + 4800, () => old.playNextEntry(a.value, { skipHalftime: true }));
        const y = withRealFixtureSeed(seed + 4800, () => candidate.playNextEntry(b.value, { skipHalftime: true }));
        assert.equal(y.draws, x.draws); assert.deepEqual(y.value, x.value, 'Unsupported actual match preserves every recorded field and random draw');
      }
    }
    const outcomes = {
      async ledger() {
        const tuples = source => {
          const table = source.nameNormalization || receipt.nameNormalization || {};
          const map = name => (Object.hasOwn(table, name) ? table[name] : name);
          return [...new Set(source.rows.map(r => [r.round, map(r.home), map(r.away)].join('|')))].sort();
        };
        assert.deepEqual(tuples(receipt.sources[0]), tuples(receipt.sources.at(-1)), 'The two sources of the receipt agree on every matchday, home club and away club');
        if (LEAGUE === 'premier') assert.deepEqual(receipt.validation.officialDuplicates.map(r => [r.sourceLine, r.round, r.home, r.away]), [[161, 8, 'Liverpool', 'Brighton']]);
        const live = cm.__ledgerOf(key);
        assert.deepEqual(live.rounds.map(byPair), rounds.map(byPair)); assert.equal(new Set(rounds.flat().map(p => p.join('|'))).size, total);
        assert.ok(!Object.keys(live).some(k => /date|kickoff|score|result/i.test(k)), 'No uncertified dates or results are imported');
        const state = seeded(4107, () => cm.startCareer(myClub));
        assert.equal(state.realLeagueFixtures, key, 'A natural start with its list fetched holds the key');
        let count = 0;
        for (const club of clubs) {
          let home = 0, away = 0;
          for (const [round, expected] of rounds.entries()) {
            const pair = expected.find(p => p.includes(club)), fx = cm.fixtureFor({ ...state, clubName: club }, { type: 'league', round });
            assert.ok(fx); assert.equal(fx.opponent, pair[0] === club ? pair[1] : pair[0]); assert.equal(fx.home, pair[0] === club);
            fx.home ? home++ : away++; count++; observations.fixtureReads++;
          }
          assert.equal(home, n - 1); assert.equal(away, n - 1);
        }
        assert.equal(count, n * R);
        const pairs = cm.careerRoundPairs(state, 0); pairs[0][0] = 'Test mutation'; pairs.pop();
        assert.deepEqual(cm.careerRoundPairs(state, 0), data.rounds[0], 'Returned mutable copies never mutate the saved versioned data');
        const loaded = await reloadProof(state, 'real', key);
        assert.equal(loaded.realLeagueFixtures, key); assert.deepEqual(cm.careerRoundPairs(loaded, 0), data.rounds[0]);
      },
      calendar() {
        const state = seeded(4107, () => cm.startCareer(myClub)); let count = 0;
        for (const club of clubs) for (const [round, expected] of rounds.entries()) {
          const pair = expected.find(p => p.includes(club)), opponent = pair[0] === club ? pair[1] : pair[0];
          const html = renderToStaticMarkup(React.createElement(cm.__CalendarCard, { career: { ...state, clubName: club, calendar: [{ type: 'league', round }], week: 0 } }));
          assert.ok(html.includes(`${opponent} (${pair[0] === club ? 'H' : 'A'})`), `${club}, round ${round + 1}: actual card has the exact opponent and venue`); count++; observations.calendarReads++;
        }
        assert.equal(count, n * R);
      },
      async settlement() {
        const pre = seeded(4107, () => cm.startCareer(myClub)), before = structuredClone(pre), inputBytes = JSON.stringify(pre);
        const run = seeded(4200, () => cm.playNextEntry(pre, { skipHalftime: true }));
        assert.equal(run.kind, 'match'); assert.deepEqual([run.report.home, run.report.away], opening, 'The first match is the real opening fixture, at the real ground');
        const rows = resultRows(run.report); assertRound(rows, rounds[0], 'first actual Quick Sim');
        assert.deepEqual(actualTable(run.state.table), tableFrom(rows, pre.leagueClubs));
        const myGoals = opening[0] === myClub ? run.report.homeGoals : run.report.awayGoals;
        assert.equal(run.state.squad.reduce((s, p) => s + p.seasonGoals, 0) - pre.squad.reduce((s, p) => s + p.seasonGoals, 0), myGoals, 'Actual accepted goals credit the real scorers once');
        const goals = rows.filter(r => r.home !== pre.clubName && r.away !== pre.clubName).reduce((s, r) => s + r.hg + r.ag, 0);
        const raceBefore = pre.scorerRace.reduce((s, p) => s + p.goals, 0), raceAfter = run.state.scorerRace.reduce((s, p) => s + p.goals, 0);
        assert.ok(raceAfter > raceBefore && raceAfter - raceBefore <= goals, 'Neutral scored goals actually feed bounded golden boot credits');
        assert.deepEqual(pre, before, 'Playing never changes any raw input field, including explicit undefined properties');
        assert.equal(JSON.stringify(pre), inputBytes, 'Playing also preserves every serialized input-save byte'); await fullSeason();
      },
      bye() {
        const state = seeded(4107, () => cm.startCareer(myClub));
        /* Explicit damaged-save probe: no human club in the pool.
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
        /* Cross-league context: a save in another league that holds this key reads
           the verified pool as a world league. No new binding occurs. */
        const state = seeded(4107, () => cm.startCareer(outsider)); state.realLeagueFixtures = key;
        cm.__fixtureSyncResults.length = 0;
        seeded(4400, () => cm.__fixtureSyncProbe(state, 1));
        const rows = cm.__fixtureSyncResults.filter(r => r.leagueId === LEAGUE);
        /* The world keeps other leagues in step with my season's length, so one round of a 22 round league is
           more than one matchday of a longer one. Every matchday it settled is held, in order. */
        const settled = state.world[LEAGUE].round;
        assert.ok(settled >= 1, 'The world settled at least one matchday of the league'); assert.equal(rows.length, settled * perRound);
        for (let round = 0; round < settled; round++) assertRound(rows.slice(round * perRound, (round + 1) * perRound), rounds[round], `actual world round ${round + 1}`);
        assert.deepEqual(actualTable(state.world[LEAGUE].table), tableFrom(rows, clubs));
      },
      async eligibility() {
        const state = seeded(4107, () => cm.startCareer(myClub));
        const coverage = cm.careerFixtureCoverage(state);
        assert.equal(state.realLeagueFixtures, key); assert.equal(coverage?.key, key);
        assert.ok(coverage.label.startsWith(`Real 2026/27 ${leagueName} opponent order and home/away venues. Calendar dates and results are simulated. The order is the list as `), 'The calendar line names the league and says what is real and what is simulated');
        /* The Premier League's sentence is Release AT's, to the letter: the registry builds it now and must not reword it. */
        if (LEAGUE === 'premier') assert.equal(coverage.label, 'Real 2026/27 Premier League opponent order and home/away venues. Calendar dates and results are simulated. The order is the list as first published in June 2026.');
        /* Round 1225 review: and every league's sentence, to the letter, in words written out here a second time
           on purpose. The registry line says what the order is the order OF (scripts/simCmLeagueFixtures.mjs
           section H holds that value to the receipt); this holds the words the Calendar prints to that value, so
           a list read on one day can never be shown as the list as first published, or the other way round. */
        const orderWords = 'published' in entry.asOf ? `the list as first published in ${entry.asOf.published}` : `the list as it stood on ${entry.asOf.stoodOn}`;
        assert.equal(coverage.label, `Real 2026/27 ${leagueName} opponent order and home/away venues. Calendar dates and results are simulated. The order is ${orderWords}.`, 'The calendar line says what its registry line says about the order, word for word');        assert.deepEqual(clone(coverage.sources), data.sources, 'The calendar line links the two sources the ledger ships');
        for (const altered of [{ ...state, customClub: { name: 'Test custom club' } }, { ...state, leagueOverrides: { [LEAGUE]: [...clubs] } }]) {
          assert.equal(cm.__canBindLedger(altered, data, LEAGUE, [...clubs]), false, 'Custom and edited saves cannot claim untouched real fixtures');
          assert.equal(cm.careerFixtureCoverage(altered), null);
        }
        const edited = seeded(4107, () => cm.startCareer(myClub, 'now', undefined, undefined, undefined, { [LEAGUE]: [...clubs] }));
        assert.equal(edited.realLeagueFixtures, undefined, 'Even an edit restoring the same clubs remains an edited start');
        const founded = seeded(4107, () => cm.startCareer(customSpec.name, 'now', clone(customSpec)));
        assert.equal(founded.realLeagueFixtures, undefined); assert.equal(cm.careerFixtureCoverage(founded), null);
        const internal = seeded(4107, () => cm.startCareer(myClub, 'now', undefined, undefined, { yearsOn: 1, uclField: null, keepLeagueOverrides: false }));
        assert.equal(internal.realLeagueFixtures, undefined, 'An internal running-world start never binds a fresh season');
        assert.equal(seeded(4107, () => cm.startCareer(outsider)).realLeagueFixtures, undefined, 'A league with no list binds nothing');
        /* Round 1225 review: a past season started in the same visit, after this league's list was fetched (the
           fleet starts its past seasons with nothing fetched, where a lazy list could not bind anyway). */
        if (eraClub) {
          const later = await freshLoaded(candidateName);
          assert.equal(seeded(4107, () => later.startCareer(myClub)).realLeagueFixtures, key, 'The list is here in this copy of the engine');
          await later.ensureEraRosters('era2010');
          const past = seeded(4107, () => later.startCareer(eraClub, 'era2010'));
          assert.equal(past.realLeagueFixtures, undefined, 'A past season binds nothing, even with the list of its league here');
          assert.equal(later.careerFixtureCoverage(past), null);
        }
      },
      async takeover() {
        /* Round 1225 review. The picker's mid season takeover is startCareer and then startMidSeason. The save
           keeps its key, so the weeks the manager before you played were the list's matchdays in their order,
           the first league match you pick a team for is the next real matchday, and the Calendar goes on naming
           the real list. The dugout screen's note and Help rest on exactly this. */
        const leagueLog = state => (state.resultLog ?? []).filter(e => e.competition === 'league');
        for (const [i, when] of ['autumn', 'newYear', 'runIn'].entries()) {
          const engine = await freshLoaded(candidateName);
          const start = seeded(4107, () => engine.startCareer(myClub));
          const handed = seeded(4810 + i, () => engine.__startMidSeason(start, when));
          assert.equal(handed.midSeasonStart, when, 'The save records the takeover');
          assert.equal(handed.realLeagueFixtures, key, `A ${when} takeover keeps the key of the list its season is played on`);
          assert.equal(engine.careerFixtureCoverage(handed)?.key, key, 'And the Calendar goes on naming the real list');
          const played = leagueLog(handed);
          assert.ok(played.length >= 1 && played.length < R, `A ${when} takeover hands over part way through the league season`);
          for (const [round, e] of played.entries()) {
            const pair = rounds[round].find(p => p.includes(myClub));
            assert.deepEqual([e.opp, e.home], [pair[0] === myClub ? pair[1] : pair[0], pair[0] === myClub], `${when}: matchday ${round + 1} under the manager before you was the real fixture, at the real ground`);
          }
          assert.ok(handed.table.every(r => r.w + r.d + r.l === played.length), 'Every club has played exactly the matchdays played so far');
          let state = handed, next = null;
          for (let g = 0; g < 24 && !next; g++) {
            const run = seeded(4900 + 30 * i + g, () => engine.playNextEntry(state, { skipHalftime: true }));
            state = run.state;
            if (run.kind === 'match' && run.report.competition === 'league') next = run.report;
            else if (run.kind === 'seasonOver') break;
          }
          assert.ok(next, `A league match is reached after a ${when} takeover`);
          assertRound(resultRows(next), rounds[played.length], `the first matchday you play after a ${when} takeover`);
        }
        /* The other way to take a job part way through: a club joined DURING a season (joinClubNow) is opened
           inside the save's running world, so it holds no key and plays the generated list, even when the old
           club and the new one share a league with a real list. Help says so in as many words. The application
           is accepted by hand, the way scripts/simClubManagerCalendar.mjs does it: what is checked is the join. */
        const mover = await freshLoaded(candidateName);
        let at = seeded(4107, () => mover.startCareer(myClub));
        for (let k = 0; k < 2; k++) at = seeded(4950 + k, () => mover.playNextEntry(at, { skipHalftime: true })).state;
        assert.equal(at.realLeagueFixtures, key, 'The career being left holds the key');
        const open = { club: seasonClub, league: LEAGUE, tier: 1, season: at.season, week: at.week, matchesLeft: 0, roll: 0, status: 'accepted' };
        const joined = seeded(4960, () => mover.__joinClubNow({ ...at, jobHunt: { open, cooldowns: [], sentSeason: at.season, sent: 1, summerMove: null } }));
        assert.ok(joined, 'The hand accepted move goes through'); assert.equal(joined.clubName, seasonClub);
        assert.equal(joined.realLeagueFixtures, undefined, 'A club joined during a season holds no key');
        assert.equal(mover.careerFixtureCoverage(joined), null, 'And its Calendar claims no real list');
        for (let round = 0; round < R; round++) assert.deepEqual(mover.careerRoundPairs(joined, round), mover.roundPairs(joined.leagueClubs, round, !!joined.balancedFixtures), 'It reads the generated list');
      },
      async unloaded() {
        /* A copy of the engine into which nothing was fetched: what every caller that awaits no list gets. */
        const bare = fresh(candidateName);
        const start = withRealFixtureSeed(4107, () => bare.startCareer(myClub));
        if (!lazy) { assert.equal(start.value.realLeagueFixtures, key, 'A list that rides with the engine is always here'); return; }
        assert.equal(start.value.realLeagueFixtures, undefined, 'No key is given while the list is not here');
        assert.equal(bare.careerFixtureCoverage(start.value), null, 'And the calendar claims nothing');
        /* Beside a copy that is just as fresh and has every list: the engine keeps counters in its module. */
        const withLists = await freshLoaded(candidateName);
        const fetched = withRealFixtureSeed(4107, () => withLists.startCareer(myClub));
        assert.equal(fetched.value.realLeagueFixtures, key, 'With the list fetched the same start holds the key');
        assert.equal(fetched.draws, start.draws, 'Binding consumes no random draws');
        assert.deepEqual(stripped(fetched.value), start.value, 'Fetching the list changes exactly one field of a fresh save');
        for (let round = 0; round < R; round++) assert.deepEqual(bare.careerRoundPairs(start.value, round), bare.roundPairs(start.value.leagueClubs, round, true), 'With no key the generated list is read');
        const keyed = { ...start.value, realLeagueFixtures: key };
        assert.throws(() => bare.careerRoundPairs(keyed, 0), /fixture list is not loaded yet/, 'A saved key whose list has not arrived stops, it never reads a generated season');
        assert.throws(() => bare.fixtureFor(keyed, { type: 'league', round: 0 }), /fixture list is not loaded yet/);
        assert.throws(() => bare.careerFixtureCoverage(keyed), /fixture list is not loaded yet/);
        assert.deepEqual(bare.careerRoundPairs({ ...start.value, realLeagueFixtures: 'unknown-version' }, 0), bare.roundPairs(start.value.leagueClubs, 0, true), 'A key this build does not know reads the generated list');
        await bare.__ensureFixtures(key);
        assert.deepEqual(bare.careerRoundPairs(keyed, 0), data.rounds[0], 'Once fetched, the saved key reads its list');
        assert.equal(withRealFixtureSeed(4107, () => bare.startCareer(myClub)).value.realLeagueFixtures, key, 'And a new career opens on it');
      },
      async legacy() {
        for (const seed of [4107, 9027, 1184]) {
          const old = fresh('baseline'), candidate = await freshLoaded(candidateName);
          const a = withRealFixtureSeed(seed, () => old.startCareer(myClub)); delete a.value.realLeagueFixtures;
          const b = withRealFixtureSeed(seed, () => candidate.startCareer(myClub)); delete b.value.realLeagueFixtures;
          assert.equal(a.draws, b.draws, 'Binding consumes no random draws'); assert.deepEqual(b.value, a.value, 'Only the optional fixture key changes the fresh save');
          for (let round = 0; round < R; round++) assert.deepEqual(candidate.fixtureFor(b.value, { type: 'league', round }), old.fixtureFor(a.value, { type: 'league', round }), 'Absent key preserves every generated old fixture');
          let sa = a.value, sb = b.value, first = null;
          for (let i = 0; i < 12; i++) {
            const x = withRealFixtureSeed(seed + 4500 + i, () => old.playNextEntry(sa, { skipHalftime: true }));
            const y = withRealFixtureSeed(seed + 4500 + i, () => candidate.playNextEntry(sb, { skipHalftime: true }));
            assert.equal(y.draws, x.draws); assert.deepEqual(y.value, x.value, `Entry ${i + 1} with the key absent: match, scores, stats, events, money and whole saved state stay exact`);
            first ??= y.value.state; sa = x.value.state; sb = y.value.state;
          }
          const oldStore = storage(); assert.equal(old.saveCareer(sa), true);
          const candidateStore = storage(); assert.equal(candidate.saveCareer(sb), true);
          assert.equal(candidateStore.get(candidate.SAVE_KEY), oldStore.get(old.SAVE_KEY), 'After twelve entries the stripped save is the base save, byte for byte');
          const loaded = await reloadProof(first, `legacy-${seed}`, undefined);
          assert.equal(loaded.realLeagueFixtures, undefined); assert.equal(candidate.careerFixtureCoverage(loaded), null);
          for (let round = 0; round < R; round++) assert.deepEqual(candidate.fixtureFor(loaded, { type: 'league', round }), old.fixtureFor(loaded, { type: 'league', round }), 'Canonical loading preserves every old fixture');
        }
        const args = [myClub, 'now', undefined, undefined, { yearsOn: 1, uclField: null, keepLeagueOverrides: false }];
        const old = fresh('baseline'), candidate = await freshLoaded(candidateName);
        const a = withRealFixtureSeed(9030, () => old.startCareer(...args));
        const b = withRealFixtureSeed(9030, () => candidate.startCareer(...args));
        assert.equal(a.draws, b.draws); assert.deepEqual(b.value, a.value, 'Internal future-world starts preserve the entire old generated save');
        const x = withRealFixtureSeed(9031, () => old.playNextEntry(a.value, { skipHalftime: true }));
        const y = withRealFixtureSeed(9031, () => candidate.playNextEntry(b.value, { skipHalftime: true }));
        assert.equal(y.draws, x.draws); assert.deepEqual(y.value, x.value);
      },
      future() {
        const state = seeded(4107, () => cm.startCareer(myClub));
        for (const altered of [{ ...state, season: 2 }, { ...state, startYear: 2027 }, { ...state, eraId: 'era2010' }, { ...state, realLeagueFixtures: 'unknown-version' }]) {
          assert.equal(cm.__realPairs(altered, LEAGUE, [...clubs], 0), null, 'No stale key invents another real season');
          assert.equal(cm.careerFixtureCoverage(altered), null);
        }
        for (const pool of [clubs.slice(1), [...clubs.slice(0, -1), clubs[0]], [...clubs.slice(0, -1), 'Test changed club']]) assert.equal(cm.__realPairs(state, LEAGUE, pool, 0), null);
        assert.equal(cm.__realPairs(state, otherLeague, [...clubs], 0), null);
        for (const round of [-1, R, 0.5, NaN]) assert.equal(cm.__realPairs(state, LEAGUE, [...clubs], round), null);
      },
      async rollover() {
        const finished = await fullSeason(), candidate = await freshLoaded(candidateName);
        const rolled = withRealFixtureSeed(6200, () => candidate.startNextSeason(finished.state));
        const next = rolled.value;
        assert.equal(next.season, 2); assert.equal(next.realLeagueFixtures, undefined, 'Every rollover clears the real fixture key');
        if (BASE) {
          const legacyFinished = clone(finished.state); delete legacyFinished.realLeagueFixtures;
          const prior = withRealFixtureSeed(6200, () => fresh('baseline').startNextSeason(legacyFinished));
          assert.equal(rolled.draws, prior.draws); assert.deepEqual(next, prior.value, 'A generated future season preserves the full base rollover state and random stream');
        }
        assert.equal(candidate.careerFixtureCoverage(next), null);
        for (let round = 0; round < 2 * (next.leagueClubs.length - 1); round++) assert.deepEqual(candidate.careerRoundPairs(next, round), candidate.roundPairs(next.leagueClubs, round, !!next.balancedFixtures));
        assert.equal(finished.state.realLeagueFixtures, key, 'Rolling never changes the completed input season');
        if (!control) {
          await writeFile(path.join(evidence, tag('native-later-season.json')), JSON.stringify(next));
          await writeFile(path.join(evidence, tag('native-later-season-receipt.json')), JSON.stringify({ base: baseSha || null, league: LEAGUE, club: finished.state.clubName, season: 1, settledRounds: R, matches: finished.results.length, played: finished.state.table.map(r => [r.club, r.w + r.d + r.l]), results: finished.results, nextSeason: next.season, fixtureKeyAfter: next.realLeagueFixtures ?? null, nativeSaveSha256: sha(JSON.stringify(next)) }, null, 2));
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
      if (!BASE && NEEDS_BASE.includes(name)) { rows.push({ title, status: 'not run' }); console.log(`  NOT RUN ${LEAGUE} ${name}: it compares with a base engine and no CM_FIXTURE_BASE was given`); continue; }
      if (LEAGUE !== 'premier' && PREMIER_ONLY.includes(name)) { rows.push({ title, status: 'not applicable' }); console.log(`  n/a  ${LEAGUE} ${name}: the neutral-only probe can only stand in the Premier League`); continue; }
      try { await outcomes[name](); rows.push({ title, status: 'passed' }); }
      catch (error) { rows.push({ title, status: 'failed', errorName: error.name, message: error.message, stack: error.stack }); }
      /* One line a group, so a run shows what it ran: the suite runner counts a quiet harness as one that did not run. */
      console.log(`  ${rows.at(-1).status === 'passed' ? 'ok  ' : 'RED '} ${LEAGUE} ${name}: ${title}`);
    }
    await new Promise(resolve => setImmediate(resolve));
    for (const verify of verifyBytes) await verify();
    const expectedToPass = Object.keys(cases).length - (BASE ? 0 : NEEDS_BASE.length) - (LEAGUE === 'premier' ? 0 : PREMIER_ONLY.length);
    await writeFile(path.join(evidence, tag(`${control || 'normal'}-report.json`)), JSON.stringify({ league: LEAGUE, key, lazy, expectedToPass, clubs: n, matchdays: R, base: baseSha || null, baselineSourceSha256, originalHash: sourceHashes.get(engineFile), control: control || 'normal', ...observations, sourceBytesHeld: true, numUnhandledErrors: unhandled.length, unhandled, cases: rows }, null, 2));
    assert.deepEqual(unhandled, [], 'Import/runtime errors never count as an effective control');
    const failed = rows.filter(r => r.status === 'failed');
    if (control) {
      assert.deepEqual(failed.map(r => [r.title, r.errorName]), expectedFailures(control).map(title => [title, 'AssertionError']));
      assert.deepEqual(rows.filter(r => r.status === 'passed').map(r => r.title), expectedPasses(control));
      assert.equal(rows.filter(r => r.status === 'skipped').length, Object.keys(cases).length - 3);
    } else {
      for (const row of failed) console.error(`FAIL ${LEAGUE}: ${row.title}\n${row.stack}`);
      assert.deepEqual(failed.map(r => r.title), []);
      assert.equal(rows.filter(r => r.status === 'passed').length, expectedToPass);
    }
    if (!BASE) console.log(`simCmRealFixtures ${LEAGUE}: NOT RUN, ${NEEDS_BASE.length} groups that compare with a base engine (${NEEDS_BASE.join(', ')}): no CM_FIXTURE_BASE was given.`);
    console.log(control
      ? `simCmRealFixtures ${control} ${LEAGUE}: the copied fault failed exactly its own outcome (${[controls[control].test, ...(controls[control].extraFailures ?? [])].join(', ')}) and nothing else, beside the base ${baseSha}.`
      : `simCmRealFixtures normal ${LEAGUE}: ${rows.filter(r => r.status === 'passed').length} outcome groups passed on ${n} clubs, ${R} matchdays and ${total} fixtures${BASE ? `, generated baseline held against the base ${baseSha}` : ', BASE GROUPS NOT RUN'}.`);
  } finally {
    process.off('unhandledRejection', capture); process.off('uncaughtExceptionMonitor', capture);
    assert.equal(path.dirname(folder), tempRoot); assert.ok(path.basename(folder).startsWith('cm-real-fixtures-'));
    await rm(folder, { recursive: true, force: true });
    for (const verify of verifyBytes) await verify();
  }
}
if (process.env.CM_REAL_FIXTURE_IMPORT_ONLY !== '1') await main();
