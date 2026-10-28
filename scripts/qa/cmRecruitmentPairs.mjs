import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

assert.equal(process.env.CI, '1', 'Remote-only paired proof');
const ROOT = process.cwd(), OUT = path.join(path.resolve(process.env.CM_RECRUITMENT_OUT || 'cm-recruitment-qualification-artifacts'), 'pairs');
fs.mkdirSync(OUT, { recursive: true });
const sha = value => createHash('sha256').update(value).digest('hex');
const write = (name, value) => fs.writeFileSync(path.join(OUT, name), JSON.stringify(value) + '\n');
const selector = fs.readFileSync('qa/cm-recruitment-shortlist-v1/SOURCE-READY.json');
assert.equal(sha(selector), '282b5cf5bc141fc9be92ab7b6f4178f4aef6bc3d50fe7fe0653c7fb8044e590e');
const selected = JSON.parse(selector);
const held = [...selected.files.map(row => row.path), 'src/lib/clubManager.ts', 'src/lib/clubManagerDeals.ts',
  'src/lib/clubManagerLoanDevelopment.ts', 'src/lib/clubManagerLoanPlan.ts', 'src/components/club-manager/LoanPlanCard.tsx'];
const hashes = () => Object.fromEntries(held.map(file => [file, sha(fs.readFileSync(file))]));
const before = hashes();
for (const row of selected.files) assert.equal(before[row.path], row.sha256, row.path);
assert.equal(before['src/lib/clubManager.ts'], '05de3cfca8d978e6117979fb29b82b2ece7b9fb6ee1f2ce3c051e379e36de86e');
const record = { status: 'RUNNING', cases: [], controls: [], limits: [
  'Same held A505 source in isolated fresh instances of one compiled bundle, one canonical engine within each arm.',
  'Action tapes include helper work and actual kernel calls. Fixture constructor draws are recorded separately; module initialization is excluded and unmeasured, not an import-RNG claim.',
  'Annual fixtures explicitly use the existing No sacking option so a complete calendar and rollover can be observed.',
  'Legacy fixture removes only seed/ledger from an actual constructor output; no invented historical roster or played growth claim.',
  'Full and lean bytes are actual JSON.stringify(trimCareer/leanCareer) payloads. Actual saveFence/load/slot/quota behavior is the separate real-hook suite.'
] };
write('admission.json', record);
function typed(value) {
  if (value === undefined) return ['undefined'];
  if (typeof value === 'number' && (!Number.isFinite(value) || Object.is(value, -0))) return ['number', Object.is(value, -0) ? '-0' : String(value)];
  if (Array.isArray(value)) return ['array', value.map(typed)];
  if (value && typeof value === 'object') return ['object', Object.entries(value).map(([key, child]) => [key, typed(child)])];
  return value;
}
function seeded(seed, run) {
  const old = Math.random, clock = Date.now, draws = []; let n = seed >>> 0;
  const draw = () => { n = (Math.imul(n, 1664525) + 1013904223) >>> 0; return n / 4294967296; };
  Math.random = () => { const v = draw(); draws.push(v); return v; }; Date.now = () => 1793145600000;
  try { const value = run(); return { value, draws, next: draw() }; }
  finally { Math.random = old; Date.now = clock; }
}
function project(career) { const next = { ...career }; delete next.recruitment; return next; }
function admit(row) {
  assert.deepEqual(row.b.core, row.a.core, 'PAIR_TYPED_STATE');
  assert.equal(row.b.full, row.a.full, 'PAIR_FULL_BYTES');
  assert.equal(row.b.lean, row.a.lean, 'PAIR_LEAN_BYTES');
  assert.deepEqual(row.b.draws, row.a.draws, 'PAIR_GLOBAL_DRAWS');
  assert.equal(row.b.next, row.a.next, 'PAIR_NEXT_DRAW');
}
try {
  const entry = 'export * as E from "@/lib/clubManager"; export * as R from "@/lib/clubManagerRecruitment"; export { turnOnNoSack } from "@/lib/clubManagerStart";';
  fs.writeFileSync(path.join(OUT, 'entry.ts'), entry);
  const bundle = path.join(OUT, 'paired.cjs');
  const built = await build({ stdin: { contents: entry, resolveDir: ROOT, loader: 'ts' }, outfile: bundle,
    bundle: true, platform: 'node', format: 'cjs', alias: { '@': path.join(ROOT, 'src') }, metafile: true,
    define: { 'import.meta.env': JSON.stringify({ PROD: true, DEV: false, MODE: 'test', BASE_URL: '/' }) },
    loader: { '.css': 'empty', '.svg': 'empty', '.png': 'empty', '.jpg': 'empty', '.webp': 'empty' }, logLevel: 'silent' });
  write('bundle.metafile.json', built.metafile);
  const canonical = path.resolve(ROOT, 'src/lib/clubManager.ts');
  const engines = Object.keys(built.metafile.inputs).filter(file => path.resolve(ROOT, file) === canonical);
  assert.equal(engines.length, 1, 'One canonical engine source in both E and helper imports');
  record.topology = { engineInputs: engines, canonicalCount: 1, copiedEngineCount: 0, bundleSha256: sha(fs.readFileSync(bundle)) };
  const require = createRequire(import.meta.url);
  const fresh = () => { delete require.cache[require.resolve(bundle)]; return require(bundle); };
  const profiles = [{ id: 'seeded-brentford', club: 'Brentford' }, { id: 'seeded-everton', club: 'Everton' }, { id: 'legacy-brentford', club: 'Brentford', legacy: true }];
  const kinds = ['read-match', 'inverse-match', 'read-rollover', 'saved-rollover'];
  for (const [index, profile] of profiles.entries()) {
    const fixtureApi = fresh();
    const fixture = seeded(9100 + index, () => fixtureApi.E.startCareer(profile.club));
    const original = fixture.value;
    if (profile.legacy) { delete original.worldSeed; delete original.worldRoster; }
    assert.equal(Object.hasOwn(original, 'recruitment'), false);
    if (profile.legacy) { assert.equal(fixtureApi.E.worldSeedOf(original), undefined); assert.equal(Object.hasOwn(original, 'worldRoster'), false); }
    write(profile.id + '-fixture.json', { input: typed(original), constructorDraws: fixture.draws, next: fixture.next, profile });
    for (const [kindIndex, kind] of kinds.entries()) {
      const annual = kind.endsWith('rollover'), seed = 32000 + index * 100 + kindIndex, id = profile.id + '-' + kind;
      const arms = [], rawStates = [];
      for (const arm of ['a', 'b']) {
        const { E, R, turnOnNoSack } = fresh();
        let input = structuredClone(original);
        if (annual) { input = turnOnNoSack(input); assert(input, 'Existing No sacking option applies'); }
        const inputBefore = structuredClone(input), preparation = {}, trail = [];
        const tape = seeded(seed, () => {
          let current = input;
          if (arm === 'b' && (kind === 'inverse-match' || kind === 'saved-rollover')) {
            const player = E.marketForScreen(current)[0]; assert(player, 'Actual current target exists');
            const added = R.addRecruitment(current, player); assert(added && added !== current);
            preparation.saved = structuredClone(added.recruitment);
            if (kind === 'inverse-match') {
              const removed = R.removeRecruitment(added, added.recruitment.targets[0]);
              assert.deepEqual(removed, current, 'Add/Remove returns every original typed field');
              assert.equal(JSON.stringify(removed), JSON.stringify(current), 'Add/Remove returns exact input bytes');
              current = removed; preparation.inverse = true;
            } else current = added;
          }
          const read = state => {
            if (arm !== 'b') return;
            const beforeRead = structuredClone(state), pool = E.marketForScreen(state);
            R.recruitmentContext(state);
            const r = R.recruitmentOf(state);
            if (pool[0]) R.resolveRecruitmentTarget(state, R.recruitmentTarget(state, pool[0]), pool);
            if (r) for (const target of r.targets) R.resolveRecruitmentTarget(state, target, pool);
            assert.deepEqual(state, beforeRead, 'Helper reading is typed-state neutral');
          };
          for (let step = 0; step < 400; step++) {
            read(current);
            const beforeWeek = current.week, result = E.playNextEntry(current, { skipHalftime: true });
            current = result.state;
            trail.push({ kind: result.kind, beforeWeek, week: current.week, season: current.season });
            if (!annual && result.kind === 'match') return current;
            if (result.kind === 'seasonOver') {
              assert(annual, 'A match is actually reached before season close');
              assert(current.week >= current.calendar.length, 'Actual calendar closes');
              const finished = E.finishSeason(current);
              preparation.closed = { season: finished.state.season, week: finished.state.week, calendar: finished.state.calendar.length, summary: finished.summary };
              const next = E.startNextSeason(finished.state);
              assert.equal(next.season, input.season + 1, 'Actual annual rollover');
              assert.equal(next.week, 0);
              if (kind === 'saved-rollover' && arm === 'b') {
                assert.deepEqual(next.recruitment, preparation.saved, 'Saved identities and context carry unchanged');
                assert(R.recruitmentOf(next), 'Same-club saved context remains readable');
                const target = next.recruitment.targets[0], pool = E.marketForScreen(next), found = R.resolveRecruitmentTarget(next, target, pool);
                preparation.afterResolution = found ? { name: found.name, club: found.club, age: found.age, position: found.position, worldRosterKey: found.worldRosterKey } : null;
                if (found) {
                  if (target.worldRosterKey) assert.equal(found.worldRosterKey, target.worldRosterKey);
                  else { assert.equal(found.club, target.club); assert.equal(found.name, target.name); assert.equal(found.position, target.position); assert.equal(E.worldYear(next) - found.age, target.cohort); }
                }
              }
              return next;
            }
          }
          throw new Error('Actual bounded calendar did not finish the requested action');
        });
        assert.deepEqual(input, inputBefore, 'Caller input remains untouched');
        const output = tape.value, core = project(output);
        if (!(kind === 'saved-rollover' && arm === 'b')) assert.equal(Object.hasOwn(output, 'recruitment'), false, 'Unused metadata remains absent');
        const row = { core: typed(core), full: JSON.stringify(E.trimCareer(core)), lean: JSON.stringify(E.leanCareer(core)), draws: tape.draws, next: tape.next,
          typedOutput: typed(output), preparation, trail };
        write(id + '-' + arm + '.json', row); arms.push(row); rawStates.push(core);
      }
      const pair = { id, profile: profile.id, kind, seed, a: arms[0], b: arms[1] };
      write(id + '-pair.json', pair);
      assert.deepEqual(rawStates[1], rawStates[0], 'Actual projected full typed kernel states equal');
      admit(pair);
      record.cases.push({ id, profile: profile.id, kind, seed, passed: true, draws: arms[0].draws.length,
        annualClosures: annual ? 2 : 0, rollover: annual, targetAfter: arms[1].preparation.afterResolution ?? null });
      write('admission.json', record);
    }
  }
  assert.equal(record.cases.length, 12);
  assert(record.cases.every(row => row.passed && row.draws > 0));
  const witness = JSON.parse(fs.readFileSync(path.join(OUT, record.cases[0].id + '-pair.json'), 'utf8'));
  for (const [kind, guard] of [['typed', 'PAIR_TYPED_STATE'], ['full', 'PAIR_FULL_BYTES'], ['lean', 'PAIR_LEAN_BYTES'], ['draws', 'PAIR_GLOBAL_DRAWS'], ['next', 'PAIR_NEXT_DRAW']]) {
    const changed = structuredClone(witness);
    if (kind === 'typed') changed.b.core[1].find(([key]) => key === 'budget')[1] += 1;
    if (kind === 'full') changed.b.full += ' ';
    if (kind === 'lean') changed.b.lean += ' ';
    if (kind === 'draws') changed.b.draws.push(0.125);
    if (kind === 'next') changed.b.next = (changed.b.next + 0.25) % 1;
    assert.notEqual(JSON.stringify(changed), JSON.stringify(witness), 'Copied observation actually changed');
    write('copied-' + kind + '.json', changed);
    assert.throws(() => admit(changed), error => error.name === 'AssertionError' && error.message.includes(guard));
    admit(JSON.parse(fs.readFileSync(path.join(OUT, record.cases[0].id + '-pair.json'), 'utf8')));
    record.controls.push({ kind, copiedObservationOnly: true, changed: true, specificRejection: guard, originalReadmitted: true });
  }
  assert.equal(record.controls.length, 5);
  record.after = hashes(); assert.deepEqual(record.after, before, 'All selected and held canonical sources unchanged');
  record.before = before; record.status = 'TWELVE_ACTUAL_PAIRS_PASSED'; write('admission.json', record);
  console.log('Recruitment pairs:12 actual complete typed/full/lean/global-draw-next matches;5 changed COPIED observation refusals and original readmission.');
  console.log('Annual paired scenarios:6; actual closures and rollovers across both arms:12. Retained target availability is recorded, no growth claim.');
} catch (error) {
  record.status = 'PAIR_ASSERTION_OR_METHOD_FAILURE'; record.failure = { name: error.name, message: error.message, stack: error.stack };
  write('admission.json', record); throw error;
}
