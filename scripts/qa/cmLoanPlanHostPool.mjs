/* Remote-only comparison with the original private loan destination pool. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
const METADATA_PIN = '1f9d51fd3cd26d7b8aaf9dc9faf99103f3021f460c92daf89885c7e4d23a7e66';
const I_ENGINE = '05de3cfca8d978e6117979fb29b82b2ece7b9fb6ee1f2ce3c051e379e36de86e';
const sha = value => createHash('sha256').update(value).digest('hex');
const data = value => value === undefined ? ['undefined'] : typeof value === 'function' ? ['function', value.name, value.length]
  : Array.isArray(value) ? ['array', value.map(data)] : value && typeof value === 'object'
    ? ['object', Object.keys(value).sort().map(key => [key, data(value[key])])] : [typeof value, value];
const same = (actual, expected, label) => assert.deepEqual(actual, expected, label);
const sameTrace = (actual, expected, label) => { same(actual.draws, expected.draws, label); same(actual.next, expected.next, label); };
const noDraws = (observed, label) => assert.equal(observed.draws.length, 0, label);
const sameCoverage = (value, reference) => same({ observed: value.observedPlayers, higher: value.higherRated, equal: value.equallyRated }, reference, 'Actual primary position coverage');
function oneEngine(inputs, observer, canonical) {
  assert.equal(inputs.filter(file => path.resolve(file) === observer).length, 1, 'One observed original engine input');
  assert(!inputs.some(file => path.resolve(file) === canonical), 'No second canonical engine instance');
}
async function main() {
  assert(process.env.CI, 'Run this source probe only in remote CI');
  assert(process.env.CM_LOAN_HOST_MANIFEST && process.env.CM_LOAN_HOST_OUT, 'Selected metadata and output directory required');
  const ROOT = process.cwd(), OUT = path.resolve(process.env.CM_LOAN_HOST_OUT), SOURCE = path.join(OUT, 'source');
  fs.mkdirSync(SOURCE, { recursive: true });
  const metadataBody = fs.readFileSync(process.env.CM_LOAN_HOST_MANIFEST); assert.equal(sha(metadataBody), METADATA_PIN, 'Frozen selected metadata');
  const metadata = JSON.parse(metadataBody.toString('utf8')); assert(Array.isArray(metadata.fixed)); assert.equal(metadata.fixed.length, 11);
  const held = () => Object.fromEntries(metadata.fixed.map(row => {
    const body = fs.readFileSync(path.join(ROOT, row.path)); assert.equal(body.length, row.bytes); assert.equal(sha(body), row.sha256, row.path);
    return [row.path, sha(body)];
  }));
  const canonical = path.join(ROOT, 'src/lib/clubManager.ts'), planPath = path.join(ROOT, 'src/lib/clubManagerLoanPlan.ts');
  const engine = fs.readFileSync(canonical, 'utf8'), plan = fs.readFileSync(planPath, 'utf8');
  assert.equal(sha(engine), I_ENGINE, 'The engine is exact immutable I');
  assert.equal(engine.split('function buyerPool(').length - 1, 1);
  const suffix = '\nexport { buyerPool as observedBuyerPool };\n', observer = path.join(SOURCE, 'original-engine.ts');
  fs.writeFileSync(observer, engine + suffix);
  const planCopy = path.join(SOURCE, 'observed-plan.ts'), entry = path.join(SOURCE, 'entry.ts');
  fs.writeFileSync(entry, 'export * as cm from ' + JSON.stringify(observer) + ';\nexport * as plan from '
    + JSON.stringify(planCopy) + ';\nexport { plainCopy as copy } from ' + JSON.stringify(path.join(ROOT, 'src/lib/clubManagerWorldRoster.ts')) + ';\n');
  const report = { scope: 'Same-engine original buyerPool oracle, actual data coverage and standard loan authority. No hook, browser, bid or broad career coverage.',
    sourceBefore: held(), observer: { originalSha256: sha(engine), suffix, copiedSha256: sha(engine + suffix) }, variants: [] };
  const save = complete => fs.writeFileSync(path.join(OUT, 'outcomes.json'), JSON.stringify({ ...report, complete }, null, 2));
  const normalRandom = Math.random, normalNow = Date.now, storageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  let seed = 17, draws = [];
  const take = (initial, call) => {
    seed = initial; draws = []; const value = call(), actionDraws = draws.slice(), next = Math.random();
    return { value, draws: actionDraws, next };
  };
  async function variant(name, source, fault) {
    const row = { name, status: 'STARTED', planCopySha256: sha(source), cases: [] }; report.variants.push(row); save(false);
    fs.writeFileSync(planCopy, source);
    const outfile = path.join(OUT, name + '.cjs');
    const built = await build({ entryPoints: [entry], outfile, bundle: true, platform: 'node', format: 'cjs', jsx: 'automatic',
      nodePaths: [path.join(ROOT, 'node_modules')], alias: { '@/lib/clubManager': observer, '@': path.join(ROOT, 'src') }, metafile: true, logLevel: 'error' });
    fs.writeFileSync(path.join(OUT, name + '.metafile.json'), JSON.stringify(built.metafile, null, 2));
    row.bundleSha256 = sha(fs.readFileSync(outfile)); oneEngine(Object.keys(built.metafile.inputs), observer, canonical);
    const storage = new Map(); globalThis.localStorage = { getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, String(value)), removeItem: key => storage.delete(key), clear: () => storage.clear() };
    seed = 17; draws = []; Math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const value = seed / 4294967296; draws.push(value); return value; }; Date.now = () => 1791360000000;
    try {
      const { cm, plan: candidate, copy } = createRequire(import.meta.url)(outfile);
      row.moduleInitDraws = draws.slice(); same(row.moduleInitDraws, [], 'No new initialization draws');
      const eras = cm.CM_ERAS.filter(era => cm.isHistoricEra(era.id)); assert(eras.length >= 2);
      const partialClub = cm.REAL_LEAGUES.flatMap(league => league.clubs).find(club => cm.isPartialClub(club));
      assert(partialClub, 'An actual marked partial source club is required');
      const fixtures = [{ id: 'modern-everton', club: 'Everton', era: 'now', seed: 17 }, { id: 'modern-ajax', club: 'Ajax', era: 'now', seed: 311 },
        { id: 'modern-partial', club: partialClub, era: 'now', seed: 17 },
        ...[eras[0], eras[eras.length - 1]].map((era, index) => ({ id: 'historic-' + index,
          club: cm.ERA_LEAGUES[era.id][0].clubs[0], era: era.id, seed: 311 }))];
      let partialChecks = 0;
      for (const fixture of fixtures) {
        const result = { ...fixture, status: 'STARTED' }; row.cases.push(result); save(false);
        await cm.ensureEraRosters(fixture.era); assert(cm.eraRostersLoaded(fixture.era));
        const registrations = cm.engineRegistrations();
        try {
          const started = take(fixture.seed, () => cm.startCareer(fixture.club, fixture.era)), career = started.value;
          result.startDraws = started.draws; result.sourcePartial = cm.isPartialClub(career.clubName, career.eraId);
          const before = copy(career), originalPool = take(902, () => cm.observedBuyerPool(career));
          noDraws(originalPool, 'Original pool has no global draw'); same(career, before, 'Original pool input unchanged');
          const expected = [...new Set(originalPool.value)].sort((a, b) => a.localeCompare(b)); assert(expected.length > 1);
          const actual = take(902, () => candidate.loanPlanHosts(career)); noDraws(actual, 'Host projection has no global draw');
          same(career, before, 'Host projection input unchanged');
          result.originalPool = originalPool.value; result.expected = expected; result.actual = actual.value;
          let mismatch; try { same(actual.value, expected, 'Original buyerPool parity'); } catch (error) { mismatch = error; }
          if (fault) { assert(mismatch?.name === 'AssertionError' && mismatch.message.includes('Original buyerPool parity'));
            assert.notDeepEqual(actual.value, expected); result.expectedRejection = { name: mismatch.name, message: mismatch.message }; }
          else assert.equal(mismatch, undefined);
          const players = career.squad.filter(player => player.position !== 'GK' && cm.loanOutRefusal(career, player.id) === null);
          assert(players.length > 0, 'An actual legally loanable player is required');
          let selected;
          for (const player of players) {
            for (const host of expected.filter(club => !cm.isPartialClub(club, career.eraId))) {
              const roster = take(903, () => cm.oppRosterFor(career, host));
              noDraws(roster, 'Original roster read has no global draw'); same(career, before, 'Original roster input unchanged');
              const primary = roster.value.filter(man => man.p === player.position);
              if (primary.length) { selected = { player, host, observed: primary.length,
                higher: primary.filter(man => man.r > player.rating).length, equal: primary.filter(man => man.r === player.rating).length }; break; }
            }
            if (selected) break;
          }
          assert(selected, 'Actual original position coverage must support a legal standard quote');
          const preview = take(903, () => candidate.loanPlanPreview(career, selected.player.id, selected.host, 'standard'));
          result.preview = { value: preview.value, draws: preview.draws, next: preview.next, reference: { observed: selected.observed, higher: selected.higher, equal: selected.equal } }; save(false);
          noDraws(preview, 'Preview has no global draw'); same(career, before, 'Preview input unchanged');
          assert(preview.value, 'An independently supported original roster must produce a quote'); selected.quote = preview.value;
          sameCoverage(selected.quote.quote.opportunity, result.preview.reference);
          result.coverageControls = [];
          for (const field of ['observedPlayers', 'higherRated', 'equallyRated']) {
            const changed = { ...selected.quote.quote.opportunity, [field]: selected.quote.quote.opportunity[field] + 1 };
            assert.throws(() => sameCoverage(changed, result.preview.reference), /Actual primary position coverage/);
            result.coverageControls.push({ field, before: sha(JSON.stringify(selected.quote.quote.opportunity)), changed: sha(JSON.stringify(changed)) });
            assert.notEqual(result.coverageControls[result.coverageControls.length - 1].before, result.coverageControls[result.coverageControls.length - 1].changed);
          }
          const partialHost = expected.find(host => cm.isPartialClub(host, career.eraId));
          if (partialHost) {
            const partial = take(904, () => candidate.loanPlanPreview(career, players[0].id, partialHost, 'standard'));
            assert.equal(partial.value, null); noDraws(partial, 'Partial preview has no global draw'); same(career, before, 'Partial input unchanged');
            result.partialHost = partialHost; partialChecks++;
          }
          const baseline = take(905, () => cm.loanOutPlayer(copy(career), selected.player.id, selected.host, cm.loanOutFee(selected.player)));
          const agreed = take(905, () => candidate.agreeLoanPlan(career, selected.quote));
          result.authority = { playerId: selected.player.id, host: selected.host, ordinary: data(baseline.value), planned: data(agreed.value),
            ordinaryDraws: baseline.draws, plannedDraws: agreed.draws, ordinaryNext: baseline.next, plannedNext: agreed.next }; save(false);
          assert(baseline.value && agreed.value); same(career, before, 'Agreement input unchanged');
          const project = value => { const out = copy(value); delete out.loanPlanHistory;
            for (const loan of out.loanedOut ?? []) delete loan.development; return out; };
          same(project(agreed.value), baseline.value, 'Actual standard authority receipt'); sameTrace(agreed, baseline, 'Actual standard authority draws and next');
          assert.equal(agreed.value.loanedOut?.find(loan => loan.player.id === selected.player.id)?.development?.version, 1);
          const closed = copy(career); closed.transferWindow = null; const closedBefore = copy(closed);
          const oldClosed = take(906, () => cm.loanOutPlayer(closed, selected.player.id, selected.host, cm.loanOutFee(selected.player)));
          const newClosed = take(906, () => candidate.agreeLoanPlan(closed, selected.quote));
          assert.equal(oldClosed.value, null); assert.equal(newClosed.value, null); noDraws(oldClosed, 'Original refusal has no draw'); noDraws(newClosed, 'Planned refusal has no draw'); same(closed, closedBefore, 'Refused input unchanged');
          const stale = take(907, () => candidate.agreeLoanPlan(career, { ...selected.quote, token: selected.quote.token + ':stale' }));
          assert.equal(stale.value, null); noDraws(stale, 'Stale refusal has no draw'); same(career, before, 'Stale input unchanged');
          const bad = copy(baseline.value); bad.budget += 1;
          assert.throws(() => same(bad, baseline.value, 'Actual standard authority receipt'), /Actual standard authority receipt/);
          const badTrace = { ...baseline, draws: [...baseline.draws, 0.25] };
          assert.throws(() => sameTrace(badTrace, baseline, 'Actual standard authority draws and next'), /Actual standard authority draws and next/);
          const badNext = { ...baseline, next: baseline.next + 1 };
          assert.throws(() => sameTrace(badNext, baseline, 'Actual standard authority draws and next'), /Actual standard authority draws and next/);
          result.nextDrawControl = { before: baseline.next, changed: badNext.next }; assert.notEqual(result.nextDrawControl.before, result.nextDrawControl.changed);
          assert.throws(() => noDraws({ draws: [0.25] }, 'Host projection has no global draw'), /Host projection has no global draw/);
          const badInput = copy(before); badInput.budget += 1;
          assert.throws(() => same(badInput, before, 'Preview input unchanged'), /Preview input unchanged/);
          result.copiedControls = { receiptBefore: sha(JSON.stringify(data(baseline.value))), receiptChanged: sha(JSON.stringify(data(bad))),
            traceBefore: sha(JSON.stringify(baseline.draws)), traceChanged: sha(JSON.stringify(badTrace.draws)),
            inputBefore: sha(JSON.stringify(data(before))), inputChanged: sha(JSON.stringify(data(badInput))) };
          assert.notEqual(result.copiedControls.receiptBefore, result.copiedControls.receiptChanged);
          assert.notEqual(result.copiedControls.traceBefore, result.copiedControls.traceChanged);
          assert.notEqual(result.copiedControls.inputBefore, result.copiedControls.inputChanged);
          result.independentAuthorityPassed = true; result.status = fault ? 'EXPECTED_REJECTION' : 'PASSED'; save(false);
        } finally { cm.restoreEngineRegistrations(registrations); }
      }
      assert(partialChecks > 0, 'At least one actual marked partial host refusal must execute');
      const inputs = Object.keys(built.metafile.inputs), badInputs = [...inputs, canonical];
      assert.throws(() => oneEngine(badInputs, observer, canonical), /No second canonical engine instance/);
      assert.equal(badInputs.length, inputs.length + 1); row.copiedModuleControl = { before: sha(JSON.stringify(inputs)), changed: sha(JSON.stringify(badInputs)) };
      assert.notEqual(row.copiedModuleControl.before, row.copiedModuleControl.changed);
      const missingObserver = inputs.filter(file => path.resolve(file) !== observer);
      assert.equal(missingObserver.length, inputs.length - 1);
      assert.throws(() => oneEngine(missingObserver, observer, canonical), /One observed original engine input/);
      row.missingObserverControl = { before: sha(JSON.stringify(inputs)), changed: sha(JSON.stringify(missingObserver)) };
      assert.notEqual(row.missingObserverControl.before, row.missingObserverControl.changed);
      row.partialChecks = partialChecks; row.status = fault ? 'EXPECTED_REJECTION' : 'PASSED'; save(false); return row;
    } catch (error) { row.status = 'FAILED'; row.failure = { name: error.name, message: error.message, stack: error.stack }; save(false); throw error; }
    finally { Math.random = normalRandom; Date.now = normalNow;
      if (storageDescriptor) Object.defineProperty(globalThis, 'localStorage', storageDescriptor); else delete globalThis.localStorage; }
  }
  try {
    const normal = await variant('normal', plan, false);
    const from = 'return available(c) ? [...new Set(eligibleHostPool(c))].sort((a, b) => a.localeCompare(b)) : [];';
    const to = 'return available(c) ? [...new Set(eligibleHostPool(c))].sort((a, b) => a.localeCompare(b)).slice(1) : [];';
    assert.equal(plan.split(from).length - 1, 1); const changed = plan.replace(from, to); assert.notEqual(sha(changed), sha(plan));
    fs.writeFileSync(path.join(OUT, 'pool-mutation.json'), JSON.stringify({ from, to, before: sha(plan), changed: sha(changed) }, null, 2));
    await variant('pool-fault', changed, true);
    fs.writeFileSync(planCopy, plan); assert.equal(sha(fs.readFileSync(planCopy)), sha(plan));
    const restored = await variant('restored', plan, false); same(restored.cases, normal.cases, 'Restored actual host and authority outcomes');
    report.sourceAfter = held(); same(report.sourceAfter, report.sourceBefore, 'Canonical sources held');
    assert.equal(sha(fs.readFileSync(observer)), report.observer.copiedSha256); save(true);
    console.log('Loan host oracle:5actual modern/partial/historic fixtures, one original engine instance, source held.');
    console.log('Original private pool parity, actual standard authority receipts/draws, partial/window/stale refusals passed.');
    console.log('Physical pool fault rejected with independent authority; exact same-copy restoration and copied guard controls passed.');
  } catch (error) { report.failure = { name: error.name, message: error.message, stack: error.stack }; save(false); throw error; }
}
await main();