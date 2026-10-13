/* Remote-only recorded documentary review. Prepared unit presentations are
   separate from legal input vectors replayed through the actual plain picker. */
import './lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

assert(process.env.CI && process.env.SIM_NETWORK === 'offline', 'Documentary proof requires remote offline transport');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), SELF = fileURLToPath(import.meta.url);
const TEST = 'src/test/soccerCareerDocumentaryReview.test.ts', PARENT = '527ca178f6b3a0be194b7aeac09d412db49088d4';
const ENGINE = path.join(ROOT, 'src/lib/soccerCareerEngine.ts'), LIFE = path.join(ROOT, 'src/lib/soccerCareerLife.ts');
const REALISM = path.join(ROOT, 'src/lib/soccerCareerRealismA.ts'), SAVE = path.join(ROOT, 'src/lib/soccerCareerSave.ts');
const CONTRACTS = path.join(ROOT, 'src/lib/soccerCareerContracts.ts'), ROUTINE = path.join(ROOT, 'src/lib/soccerCareerRoutineEvents.ts');
const CAPTIONS = path.join(ROOT, 'src/lib/soccerCareerLifeConsequences.ts'), PAGE = path.join(ROOT, 'src/pages/SoccerCareer.tsx');
const WORKFLOW = path.join(ROOT, '.github/workflows/soccer-career-documentary-review.yml');
const CONTROL = process.env.SC_DOCUMENTARY_CONTROL || '', RED = process.env.SC_DOCUMENTARY_EXPECT_RED === '1';
const PHASE = process.env.CAREER_DOCUMENTARY_PHASE || (RED ? 'baseline' : 'fixed');
assert(['baseline', 'fixed'].includes(PHASE) && RED === (PHASE === 'baseline'), 'Phase must match the actual source arm');
assert(['', 'registration', 'priority', 'effect'].includes(CONTROL) && !(RED && CONTROL), 'Only one separate fixed copied-source control is allowed');
const NAMES = [
  'documentary review missing: full access earns a review in the actual later playing season',
  'documentary review missing: due review has priority in the actual picker',
  'documentary review missing: checking facts applies its complete saved effect',
  'documentary review missing: family privacy applies its complete saved effect',
  'documentary review missing: checking facts clamps morale at zero',
  'documentary review missing: family privacy clamps morale and popularity at their boundaries',
  'documentary review missing: queued facts survives JSON and changed offer gates',
  'documentary review missing: queued family privacy survives JSON and retirement',
  'documentary review missing: both resolved choices stay once after two canonical reloads',
  'documentary review missing: another full-access deal enables one later review',
  'documentary review missing: a legacy full-access record is reviewed without inventing a date',
  'documentary review preservation: full access keeps the original money followers meters and flag',
  'documentary review preservation: limited access keeps the original money followers and privacy',
  'documentary review preservation: refusing cameras keeps original morale and queued physical',
  'documentary review preservation: no full-access record creates no fresh review',
  'documentary review preservation: a known acquisition year creates no same-season review',
  'documentary review preservation: a known future producer stamp creates no fresh review',
  'documentary review preservation: retired careers gain no fresh review or priority',
  'documentary review preservation: reviewed and requested stages stay closed without another deal',
  'documentary review preservation: the four existing recorded priorities stay unchanged',
  'documentary review preservation: catalog and priority reads hold the whole input and original draws',
  'documentary review preservation: original producer keeps its gate and two-season cooldown',
];
const SETUP = /Unhandled (?:Errors?|Rejection)|Uncaught Exception|Failed to load|Failed to resolve import|Cannot find module|Module not found|ERR_MODULE_NOT_FOUND|SyntaxError|ReferenceError|TypeError/i;
const sha = value => createHash('sha256').update(value).digest('hex');
const app = [ENGINE, LIFE, REALISM, SAVE, CONTRACTS, ROUTINE, CAPTIONS, PAGE];
const sources = new Map([...app, SELF, path.join(ROOT, TEST), WORKFLOW].map(file => [file, fs.readFileSync(file, 'utf8')]));
const OUT = process.env.CAREER_DOCUMENTARY_OUT ? path.resolve(process.env.CAREER_DOCUMENTARY_OUT)
  : fs.mkdtempSync(path.join(os.tmpdir(), 'soccer-career-documentary-review-'));
assert(OUT !== ROOT && OUT !== path.join(ROOT, 'dist') && !OUT.startsWith(path.join(ROOT, 'dist') + path.sep), 'Evidence must stay outside the actual build');
const arm = CONTROL || PHASE, retained = path.join(OUT, arm); fs.mkdirSync(retained, { recursive: true });
assert(!fs.existsSync(path.join(retained, 'source.json')), 'Refuse to replace retained documentary evidence');
for (const [file, text] of sources) fs.writeFileSync(path.join(retained, path.basename(file) + '.before'), text);
fs.mkdirSync(path.join(ROOT, 'tmp'), { recursive: true });
const tmp = fs.mkdtempSync(path.join(ROOT, 'tmp/soccer-documentary-review-')), changed = new Map(sources), anchors = [];
let outcome = {};
function git(args) {
  const result = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  assert.equal(result.status, 0, 'Actual Git source receipt must finish'); return result.stdout;
}
const sourceHead = git(['rev-parse', 'HEAD']).trim(), parentLife = git(['show', `${PARENT}:src/lib/soccerCareerLife.ts`]);
fs.writeFileSync(path.join(retained, 'soccerCareerLife.parent.ts'), parentLife);
const parentBindings = app.map(file => {
  const name = path.relative(ROOT, file).replaceAll('\\', '/'), before = git(['show', `${PARENT}:${name}`]);
  if (RED || file !== LIFE) assert.equal(sources.get(file), before, 'Only fixed Life may differ from the whole held parent app');
  return { file: name, parentSha256: sha(before), candidateSha256: sha(sources.get(file)) };
});
function receipt(extra = {}) {
  outcome = { ...outcome, ...extra };
  const sourceReceipts = [...sources].map(([file, before]) => ({ file: path.relative(ROOT, file).replaceAll('\\', '/'),
    beforeSha256: sha(before), afterSha256: sha(fs.readFileSync(file)) }));
  fs.writeFileSync(path.join(retained, 'source.json'), JSON.stringify({ arm, sourceHead, parentAppRef: PARENT, parentBindings,
    parentLifeSha256: sha(parentLife), sourceReceipts, actualSourceEdits: anchors, ...outcome }, null, 2) + '\n');
}
function replace(anchor, replacement) {
  const before = changed.get(LIFE); assert.equal(before.split(anchor).length - 1, 1, 'Exactly one actual executable control anchor must exist');
  const offset = before.indexOf(anchor), after = before.slice(0, offset) + replacement + before.slice(offset + anchor.length);
  const inverse = after.slice(0, offset) + anchor + after.slice(offset + replacement.length);
  assert.notEqual(after, before); assert.equal(inverse, before);
  changed.set(LIFE, after); anchors.push({ kind: CONTROL, file: 'src/lib/soccerCareerLife.ts', anchor, replacement,
    offset, beforeSha256: sha(before), afterSha256: sha(after), inverseSha256: sha(inverse) });
}
function random(input, action) {
  const previous = Math.random, values = [];
  Math.random = () => {
    const value = typeof input === 'function' ? input() : typeof input === 'number' ? input : input[values.length];
    assert(value !== undefined && value >= 0 && value < 1, 'Actual source consumed an unlisted or illegal documentary input');
    values.push(value); return value;
  };
  try { return { result: action(), draws: values }; } finally { Math.random = previous; }
}
async function fixtures() {
  const RealDate = Date, previousStorage = globalThis.localStorage, clock = '2026-10-13T16:00:00Z', now = RealDate.parse(clock), storage = new Map();
  globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, String(value)),
    removeItem: key => storage.delete(key), clear: () => storage.clear(), key: index => [...storage.keys()][index] ?? null,
    get length() { return storage.size; } };
  globalThis.Date = class extends RealDate { constructor(...args) { if (args.length) super(...args); else super(now); } static now() { return now; } };
  try {
    const E = await import(pathToFileURL(path.join(tmp, 'engine.mjs')).href), L = await import(pathToFileURL(path.join(tmp, 'life.mjs')).href);
    const S = await import(pathToFileURL(path.join(tmp, 'save.mjs')).href), copy = value => JSON.parse(JSON.stringify(value));
    const year = state => state.seasons[state.seasons.length - 1].year, clamp = value => Math.max(0, Math.min(100, value));
    const progress = { status: 'controlled-picker-inputs', acquisitions: [], answers: [], seasons: [], catalogs: [], priorityReads: [], scenarios: [] };
    const saveProgress = () => fs.writeFileSync(path.join(retained, 'fixture-progress.json'), JSON.stringify(progress, null, 2) + '\n'); saveProgress();
    function canonical(state) {
      const held = JSON.stringify(state), run = random([], () => E.repairCareer(copy(state)));
      assert(S.isSoccerCareerSave(run.result)); assert.deepEqual(run.draws, []); assert.equal(JSON.stringify(run.result), held); return copy(run.result);
    }
    function allCatalogInputs(state) {
      // Original RealismB494 builds its release-clause caption after the two Life chance reads.
      return state.overall >= 80 && state.marketValue >= 30 ? [0.99, 0.99, 0.99] : [0.99, 0.99];
    }
    function catalog(state, kind = 'life') {
      const held = JSON.stringify(state), inputs = kind === 'life' ? [0.99, 0.99] : allCatalogInputs(state);
      const run = random(inputs, () => kind === 'life' ? L.getLifeEvents(state) : E.getAllEvents(state));
      progress.catalogs.push({ kind, context: copy(state), contextSha256: sha(held), cards: copy(run.result), draws: run.draws }); saveProgress();
      assert.equal(JSON.stringify(state), held); assert.deepEqual(run.draws, inputs); return run.result;
    }
    function priorities(state) {
      const held = JSON.stringify(state), run = random([], () => L.getPriorityLifeEventIds(state));
      progress.priorityReads.push({ context: copy(state), contextSha256: sha(held), ids: run.result, draws: run.draws }); saveProgress();
      assert.equal(JSON.stringify(state), held); assert.deepEqual(run.draws, []); return run.result;
    }
    function initial() {
      const stats = { pace: 80, shooting: 80, passing: 80, dribbling: 80, defending: 80, physical: 80, reflexes: 80 };
      const init = random(0.9, () => E.initCareer('Documentary Model Fixture', 'England', 'CM', '2020s', stats, 80, 2020, E.FALLBACK_CLUBS, null, 94));
      const base = init.result, club = E.FALLBACK_CLUBS[0], prepared = { ...base, age: 23, phase: 'playing', retired: false, personality: 'iceman', agentId: 'self',
        currentClub: club.name, currentClubCountry: club.country, currentClubTier: club.tier, currentClubColor: club.color, currentLeague: club.league,
        contractYearsLeft: 4, weeklyWage: 10000, netWorth: 10, morale: 60, popularity: 60, socialMediaFollowers: 1,
        integrityBonus: 5, sponsorBonus: 0.2, marketValue: 4,
        seasons: [{ ...base.seasons[0], year: 2026, age: 23, club: club.name, clubCountry: club.country, clubTier: club.tier,
          type: 'playing', apps: 24, leagueApps: 20, goals: 4, assists: 6, rating: 7, injury: null, injuryWeeks: 0, injurySevere: false }],
        lifeFlags: { unrelatedDocumentaryFixture: 7 }, eventLastFired: { '7777': 2022 }, pendingEvents: [], seriousInjuries: [],
        statBoostNextSeason: { physical: 2, reflexes: 3 }, events: ['Prepared fictional documentary model context'] };
      const repair = random([], () => E.repairCareer(copy(prepared))); assert(S.isSoccerCareerSave(repair.result)); assert.deepEqual(repair.draws, []);
      return { state: canonical(repair.result), initializationDraws: init.draws, repairDraws: repair.draws };
    }
    const original = sources.get(ENGINE), anchor = '  const shuffled = [...eligible].sort(() => Math.random() - 0.5);';
    const replacement = '  const shuffled = [...eligible].sort((a, b) => {\n    if (typeof globalThis.__SC_DOCUMENTARY_PICKER_COMPARISON === "function") globalThis.__SC_DOCUMENTARY_PICKER_COMPARISON(a.id, b.id);\n    return Math.random() - 0.5;\n  });';
    assert.equal(original.split(anchor).length - 1, 1); const observed = original.replace(anchor, replacement);
    assert.notEqual(observed, original); assert.equal(observed.replace(replacement, anchor), original);
    const pickerObserver = { kind: 'read-only-sort-comparisons', file: 'src/lib/soccerCareerEngine.ts', anchor, replacement,
      originalSourcePath: 'fixed/soccerCareerEngine.picker-original.ts', observedSourcePath: 'fixed/soccerCareerEngine.picker-observed.ts',
      originalSha256: sha(original), observedSha256: sha(observed), compiledPath: 'fixed/engine-picker-observed.mjs',
      plainCompiledPath: 'fixed/engine.mjs', plainCompiledSha256: sha(fs.readFileSync(path.join(tmp, 'engine.mjs'))) };
    fs.writeFileSync(path.join(retained, 'soccerCareerEngine.picker-original.ts'), original);
    fs.writeFileSync(path.join(retained, 'soccerCareerEngine.picker-observed.ts'), observed); receipt({ pickerObserver });
    const esbuild = await import('esbuild'), observedCompiled = path.join(tmp, 'engine-picker-observed.mjs');
    await esbuild.build({ entryPoints: [ENGINE], outfile: observedCompiled, bundle: true, format: 'esm', platform: 'node', logLevel: 'error',
      alias: { '@': path.join(ROOT, 'src') }, plugins: [{ name: 'documentary-read-only-picker', setup(build) {
        build.onLoad({ filter: /\.ts$/ }, args => path.resolve(args.path) === ENGINE
          ? { contents: observed, loader: 'ts', resolveDir: path.dirname(ENGINE) } : undefined); } }] });
    fs.copyFileSync(observedCompiled, path.join(retained, 'engine-picker-observed.mjs'));
    pickerObserver.compiledSha256 = sha(fs.readFileSync(observedCompiled));
    receipt({ pickerObserver, compiled: [...outcome.compiled, { file: 'engine-picker-observed.mjs', sha256: pickerObserver.compiledSha256 }] });
    const O = await import(pathToFileURL(observedCompiled).href);
    function acquire(name, state, targets, priorityReview = false) {
      const context = canonical({ ...canonical(state), phase: 'social_media_action', pendingEvents: [], socialMediaActionUsedThisSeason: true });
      const held = JSON.stringify(context);
      const available = catalog(context, 'all');
      const targetAvailability = targets.map(id => {
        const matches = available.filter(event => event.id === id), card = matches.length === 1 ? matches[0] : null;
        const read = random([], () => card ? { ledgerKey: E.eventLedgerKey(card), cooldown: E.eventCooldown(card), onCooldown: E.isEventOnCooldown(context, card) } : null);
        return { id, matches: matches.length, card: card ? copy(card) : null, season: year(context), lastEventId: context.lastEventId,
          lastFired: card ? context.eventLastFired?.[read.result.ledgerKey] ?? null : null, ...read.result, draws: read.draws };
      });
      assert.equal(JSON.stringify(context), held, name + ': catalog and zero-draw availability reads must hold the whole input');
      const inputs = [], comparisons = [], prefix = [
        { value: 0.99, cause: 'original ordinary moral-dilemma gate rejects' },
        { value: 0.99, cause: 'original iceman212 gate rejects' },
        { value: 0.99, cause: 'original iceman213 gate rejects' },
        ...(context.overall >= 80 && context.marketValue >= 30
          ? [{ value: 0.99, cause: 'original RealismB494 release-clause caption draw' }] : []),
        { value: 0.99, cause: 'original picker count is4' },
      ].map((row, index) => ({ ordinal: index + 1, ...row }));
      const witness = { name, targets, priorityReview, targetAvailability, contextSha256: sha(held), comparisons,
        input: { mode: 'controlled-sort-vector', prefix, draws: inputs, drawCount: 0 }, observed: null, replay: null };
      progress.acquisitions.push({ context, witness }); saveProgress();
      for (const target of targetAvailability) assert(target.matches === 1 && !target.onCooldown && target.lastEventId !== target.id
        && target.draws.length === 0, name + ': requested target must exist in the actual catalog and be available to the original picker');
      const rank = id => priorityReview && id === 631 ? 100000 : targets.includes(id) ? targets.indexOf(id) : targets.length + id;
      let comparison = null, outsideSort = 0, picked;
      assert.equal(globalThis.__SC_DOCUMENTARY_PICKER_COMPARISON, undefined);
      globalThis.__SC_DOCUMENTARY_PICKER_COMPARISON = (a, b) => { comparison = { a, b, ordinal: inputs.length + 1 }; comparisons.push(comparison); };
      try {
        picked = random(() => {
          let value;
          if (comparison) { comparison.aRank = rank(comparison.a); comparison.bRank = rank(comparison.b);
            value = comparison.aRank < comparison.bRank ? 0.01 : comparison.aRank > comparison.bRank ? 0.99 : 0.5;
            comparison.value = value; comparison = null;
          } else { assert(outsideSort < prefix.length); const row = prefix[outsideSort++]; assert.equal(row.ordinal, inputs.length + 1); value = row.value; }
          inputs.push(value); return value;
        }, () => O.dismissSocialMediaPhase(context, E.FALLBACK_CLUBS));
      } finally { delete globalThis.__SC_DOCUMENTARY_PICKER_COMPARISON; witness.input.drawCount = inputs.length; saveProgress(); }
      witness.observed = { rawBatch: copy(picked.result), draws: picked.draws }; saveProgress();
      const observedBatch = canonical(picked.result); Object.assign(witness.observed, { batch: observedBatch, batchSha256: sha(JSON.stringify(observedBatch)) }); saveProgress();
      assert.equal(JSON.stringify(context), held); assert.equal(comparison, null); assert.equal(outsideSort, prefix.length);
      assert.deepEqual(inputs.slice(0, prefix.length), prefix.map(row => row.value));
      const firstComparatorOrdinal = prefix.length + 1; assert.equal(comparisons[0]?.ordinal, firstComparatorOrdinal); assert(comparisons.length > 0);
      assert.deepEqual(picked.draws, inputs); assert(comparisons.every((row, index) => Number.isInteger(row.a) && Number.isInteger(row.b)
        && row.ordinal >= firstComparatorOrdinal && inputs[row.ordinal - 1] === row.value && (index === 0 || row.ordinal > comparisons[index - 1].ordinal)));
      const replayContext = copy(context); let consumed = 0; assert.equal(globalThis.__SC_DOCUMENTARY_PICKER_COMPARISON, undefined);
      const replay = random(() => { assert(consumed < inputs.length); return inputs[consumed++]; }, () => E.dismissSocialMediaPhase(replayContext, E.FALLBACK_CLUBS));
      witness.replay = { rawBatch: copy(replay.result), draws: replay.draws, consumed }; saveProgress();
      const batch = canonical(replay.result); Object.assign(witness.replay, { batch, batchSha256: sha(JSON.stringify(batch)) }); saveProgress();
      assert.equal(JSON.stringify(replayContext), held); assert.equal(consumed, inputs.length); assert.deepEqual(replay.draws, inputs);
      assert.deepEqual(witness.replay.rawBatch, witness.observed.rawBatch); assert.deepEqual(batch, observedBatch);
      assert(batch.phase === 'random_events' && batch.pendingEvents.length > 1 && batch.pendingEvents.length <= 5);
      assert.equal(batch.pendingEvents[0].id, priorityReview ? 631 : targets[0]);
      if (priorityReview) { assert.equal(batch.pendingEvents[1].id, targets[0]); assert(priorities(context).includes(631));
        assert.equal(batch.pendingEvents.filter(event => event.id === 631).length, 1); }
      assert.equal(new Set(batch.pendingEvents.map(event => E.eventLedgerKey(event))).size, batch.pendingEvents.length);
      for (const event of batch.pendingEvents) assert.equal(batch.eventLastFired[E.eventLedgerKey(event)], year(batch));
      return { context, batch, witness };
    }
    function literal(before, id, index) {
      const after = copy(before);
      if (id === 408) {
        assert.equal(index, 0); after.netWorth = Math.round((after.netWorth + 3) * 100) / 100;
        after.socialMediaFollowers = Math.round((after.socialMediaFollowers + 2.5) * 100) / 100;
        after.popularity = clamp(after.popularity + 5); after.morale = clamp(after.morale - 5);
        after.lifeFlags = { ...after.lifeFlags, rDocCrew: 1 };
        after.events.push('🎥 Sold full documentary access. Three million euros, and a camera in the room on the night you got dropped');
      } else {
        assert.equal(id, 631); after.lifeFlags = { ...after.lifeFlags, rDocCrew: index === 0 ? 2 : 3 };
        if (index === 0) { after.integrityBonus += 2; after.morale = clamp(after.morale - 1);
          after.events.push('🎬 Checked the facts in the documentary footage and promotional copy');
        } else { after.morale = clamp(after.morale + 2); after.popularity = clamp(after.popularity - 1);
          after.events.push('🎬 Asked the production team to keep family scenes out of the promotion'); }
      }
      after.lastEventId = id; after.pendingEvents = after.pendingEvents.slice(1); after.phase = 'random_events'; return after;
    }
    function apply(name, state, id, index) {
      const before = canonical(canonical(state)), held = JSON.stringify(before); assert.equal(before.pendingEvents[0].id, id);
      const wanted = literal(before, id, index), inputs = allCatalogInputs(before);
      const run = random(inputs, () => E.applyEventChoice(before, index, E.FALLBACK_CLUBS));
      const row = { name, eventId: id, choiceIndex: index, before: copy(before), beforeSha256: sha(held),
        actual: copy(run.result), expected: wanted, resolverDraws: run.draws, resolverDrawCount: run.draws.length };
      progress.answers.push(row); saveProgress();
      const first = canonical(run.result), second = canonical(first); Object.assign(row, { reload1: first, reload2: second,
        expectedSha256: sha(JSON.stringify(wanted)), actualSha256: sha(JSON.stringify(second)) }); saveProgress();
      assert.equal(JSON.stringify(before), held); assert.deepEqual(run.draws, inputs); assert.deepEqual(second, wanted);
      assert.equal(second.eventLastFired[String(id)], year(before)); return { before: copy(before), after: second, row };
    }
    function nextPlaying(name, state) {
      const input = canonical({ ...canonical(state), phase: 'playing', pendingEvents: [], loan: null }), held = JSON.stringify(input);
      const passed = copy(input), run = random(0.9, () => { const start = E.advanceProSeason(passed, E.FALLBACK_CLUBS);
        return start.phase === 'retirement_suggestion' ? E.declineRetirementSuggestion(start, E.FALLBACK_CLUBS) : start; });
      const record = { name, input: copy(input), inputSha256: sha(held), passedInputAfter: copy(passed), actual: copy(run.result), draws: run.draws,
        preparation: ['Only phase=playing, pendingEvents=[] and loan=null prepare the existing actual season entry. This is not a complete UI career journey.'] };
      progress.seasons.push(record); saveProgress(); const repair = random([], () => E.repairCareer(copy(run.result)));
      Object.assign(record, { repaired: copy(repair.result), repairDraws: repair.draws }); saveProgress();
      assert.deepEqual(repair.draws, []); const next = canonical(repair.result), last = next.seasons[next.seasons.length - 1];
      Object.assign(record, { canonical: next, canonicalSha256: sha(JSON.stringify(next)) }); saveProgress();
      assert.equal(JSON.stringify(input), held); assert(run.draws.length > 0); assert.equal(year(next), year(state) + 1);
      assert(last.type === 'playing' && last.apps > 0 && !last.injurySevere && !next.retired); return next;
    }
    const prepared = initial(); progress.initialization = prepared; saveProgress();
    const acquisition = acquire('first-full-access408', prepared.state, [408]);
    const acquired = apply('first-full-access408', acquisition.batch, 408, 0);
    assert.equal(acquired.after.lifeFlags.rDocCrew, 1); assert.equal(acquired.after.eventLastFired['408'], 2026);
    assert(!catalog(canonical({ ...acquired.after, pendingEvents: [] })).some(event => event.id === 631));
    const later = nextPlaying('first-later-season', acquired.after), delivered = acquire('first-priority631', later, [220], true);
    const facts = apply('first-facts631', delivered.batch, 631, 0), family = apply('first-family-request631', delivered.batch, 631, 1);
    const legacy = canonical(acquired.after); delete legacy.eventLastFired['408'];
    const legacyBatch = acquire('legacy-priority631', legacy, [220], true), legacyFacts = apply('legacy-facts631', legacyBatch.batch, 631, 0);
    assert.equal(legacyFacts.after.eventLastFired['408'], undefined);
    const repeatReady = nextPlaying('repeat-gap-year2', nextPlaying('repeat-gap-year1', facts.after));
    const producerCard = catalog(repeatReady, 'all').find(event => event.id === 408);
    assert(producerCard && !E.isEventOnCooldown(repeatReady, producerCard));
    const repeatAcquisition = acquire('second-full-access408', repeatReady, [408]), repeated = apply('second-full-access408', repeatAcquisition.batch, 408, 0);
    const secondLater = nextPlaying('second-later-season', repeated.after), repeatBatch = acquire('second-priority631', secondLater, [4], true);
    const repeatFamily = apply('second-family-request631', repeatBatch.batch, 631, 1);
    assert.equal(year(secondLater), 2030); assert.equal(repeatFamily.after.lifeFlags.rDocCrew, 3);
    const scenarios = [
      ['631-facts', delivered, facts, { acquisition, acquired, later }],
      ['631-family-request', delivered, family, { acquisition, acquired, later }],
      ['631-legacy-facts', legacyBatch, legacyFacts, { acquisition, acquired, legacy, omittedLegacyField: 'eventLastFired.408' }],
      ['631-repeat-family-request', repeatBatch, repeatFamily, { acquisition, acquired, later, firstReview: facts,
        repeatReady, repeatAcquisition, repeated, secondLater }],
    ].map(([id, delivery, result, history]) => {
      const fresh = canonical({ ...result.after, pendingEvents: [] }); assert(!catalog(fresh).some(event => event.id === 631));
      assert(!priorities(fresh).includes(631));
      const scenario = { id, initial: result.before, initialSha256: sha(JSON.stringify(result.before)),
        provenance: { kind: 'actual-picker-documentary-review', context: delivery.context, actualPickerBatch: delivery.batch,
          actualPickerBatchSha256: sha(JSON.stringify(delivery.batch)), pickerWitness: delivery.witness, history,
          preparedFields: ['Fictional identity, supported club, senior row, meters and persona prepare a complete initialized career.',
            'Actual408 picker delivery, full-access choice and stamp produce rDocCrew1. Known producer stamps earn a review after actual later season rows.',
            'Existing season entry clears unplayed cards and sets playing/loan-null. No complete UI career, random rate or seed claim is made.',
            'Read-only comparator IDs choose legal inputs. The entire vector is replayed through unmodified actual picker without a receiver.',
            'Review631 is ranked outside the ordinary four-card draw, so the original priority path supplies it. Queue order and outcomes are never rewritten.',
            'Legacy scenario removes only the acquisition stamp, preserving the actual saved full-access record without inventing a date.'] },
        steps: [{ eventId: 631, choiceIndex: result.row.choiceIndex, choiceLabel: result.before.pendingEvents[0].choices[result.row.choiceIndex].label,
          resolverDraws: result.row.resolverDraws, resolverDrawCount: result.row.resolverDrawCount, expected: result.after,
          expectedSha256: sha(JSON.stringify(result.after)), reloadAfter: true }] };
      progress.scenarios.push(scenario); saveProgress(); return scenario;
    });
    const document = { schemaVersion: 1, saveKey: 'soccerCareerSave', clock, source: { head: sourceHead, parentAppRef: PARENT,
      engineSha256: sha(sources.get(ENGINE)), lifeSha256: sha(sources.get(LIFE)), realismSha256: sha(sources.get(REALISM)),
      routineSha256: sha(sources.get(ROUTINE)), consequencesSha256: sha(sources.get(CAPTIONS)), saveSha256: sha(sources.get(SAVE)),
      contractsSha256: sha(sources.get(CONTRACTS)), pageSha256: sha(sources.get(PAGE)), testSha256: sha(sources.get(path.join(ROOT, TEST))),
      simSha256: sha(sources.get(SELF)), parentLifeSha256: sha(parentLife), parentLifeSourcePath: 'fixed/soccerCareerLife.parent.ts', pickerObserver }, scenarios };
    const bytes = JSON.stringify(document, null, 2) + '\n', file = path.join(OUT, 'browser-fixtures.json');
    assert(!fs.existsSync(file)); fs.writeFileSync(file, bytes); progress.status = 'complete'; saveProgress();
    assert.equal(progress.acquisitions.length, 5); assert.equal(progress.answers.length, 6); assert.equal(progress.seasons.length, 4);
    return { file, sha256: sha(bytes), scenarios: 4, actualPickerBatches: 5, actualAnswers: 6, actualLaterSeasons: 4 };
  } finally { globalThis.Date = RealDate; if (previousStorage === undefined) delete globalThis.localStorage; else globalThis.localStorage = previousStorage; }
}

try {
  if (CONTROL === 'registration') replace('push({ id: 631,', 'push({ id: -631,');
  if (CONTROL === 'priority') replace(', [408, 631, "rDocCrew"]', '');
  if (CONTROL === 'effect') replace('setFlag(s, "rDocCrew", 2); s.integrityBonus += 2; s.morale = clamp(s.morale - 1, 0, 100);',
    'setFlag(s, "rDocCrew", 2); s.integrityBonus += 0; s.morale = clamp(s.morale - 1, 0, 100);');
  assert.equal(anchors.length, CONTROL ? 1 : 0); if (CONTROL) fs.writeFileSync(path.join(retained, 'soccerCareerLife.control.ts'), changed.get(LIFE)); receipt();
  const esbuild = await import('esbuild');
  await esbuild.build({ entryPoints: { engine: ENGINE, life: LIFE, realism: REALISM, save: SAVE, contracts: CONTRACTS }, outdir: tmp,
    outExtension: { '.js': '.mjs' }, bundle: true, format: 'esm', platform: 'node', logLevel: 'error', alias: { '@': path.join(ROOT, 'src') },
    plugins: [{ name: 'documentary-actual-copied-source', setup(build) {
      build.onLoad({ filter: /\.ts$/ }, args => {
        const contents = changed.get(path.resolve(args.path)); return contents !== undefined && contents !== sources.get(path.resolve(args.path))
          ? { contents, loader: 'ts', resolveDir: path.dirname(args.path) } : undefined;
      }); } }] });
  const compiled = ['engine.mjs', 'life.mjs', 'realism.mjs', 'save.mjs', 'contracts.mjs'];
  for (const file of compiled) fs.copyFileSync(path.join(tmp, file), path.join(retained, file));
  receipt({ compiled: compiled.map(file => ({ file, sha256: sha(fs.readFileSync(path.join(tmp, file))) })) });
  const env = { ...process.env, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1' };
  for (const [key, file] of [['SC_DOCUMENTARY_ENGINE', 'engine.mjs'], ['SC_DOCUMENTARY_LIFE', 'life.mjs'], ['SC_DOCUMENTARY_REALISM', 'realism.mjs'], ['SC_DOCUMENTARY_SAVE', 'save.mjs']])
    env[key] = path.join(tmp, file).replaceAll('\\', '/');
  const runner = path.join(ROOT, 'node_modules/vitest/vitest.mjs'), reportFile = path.join(tmp, 'unit.json'); assert(fs.existsSync(runner));
  const result = spawnSync(process.execPath, [runner, 'run', TEST, '--maxWorkers=1', '--reporter=verbose', '--reporter=json', `--outputFile.json=${reportFile}`],
    { cwd: ROOT, env, encoding: 'utf8', timeout: 240000, maxBuffer: 64 * 1024 * 1024 });
  const output = (result.stdout || '') + (result.stderr || ''); fs.writeFileSync(path.join(retained, 'output.log'), output);
  if (fs.existsSync(reportFile)) fs.copyFileSync(reportFile, path.join(retained, 'unit.json'));
  receipt({ exitCode: result.status, processSignal: result.signal, processError: result.error?.message || null });
  assert(!result.error && result.status !== null && !result.signal, 'Actual child must finish inside its bound');
  assert(!SETUP.test(output) && fs.existsSync(reportFile), 'Setup, pending, missing-file and unhandled errors cannot earn credit');
  const report = JSON.parse(fs.readFileSync(reportFile, 'utf8')); assert.equal(report.testResults.length, 1);
  const file = report.testResults[0]; assert(file.name.replaceAll('\\', '/').endsWith('/' + TEST) && !file.message);
  const cases = file.assertionResults; assert.deepEqual(cases.map(test => test.title).sort(), [...NAMES].sort());
  assert.equal(report.numTotalTests, 22); assert.equal(report.numPendingTests, 0); assert(cases.every(test => ['passed', 'failed'].includes(test.status)));
  const indices = RED || CONTROL === 'registration' ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    : CONTROL === 'priority' ? [1] : CONTROL === 'effect' ? [2, 4, 6, 8, 9, 10] : [];
  const failed = cases.filter(test => test.status === 'failed'); assert.deepEqual(failed.map(test => test.title).sort(), indices.map(index => NAMES[index]).sort());
  for (const test of failed) {
    const message = RED || CONTROL === 'registration' ? 'documentary review missing from actual Life catalog'
      : CONTROL === 'priority' ? 'documentary review lost its actual picker priority' : 'documentary fact check lost its actual integrity';
    const cause = new RegExp(`^AssertionError:.*${message}.*expected false to be true`, 's');
    assert(test.failureMessages.length > 0 && test.failureMessages.every(value => cause.test(value)), 'Every expected failure needs its exact owned Boolean cause');
  }
  assert.equal(report.numFailedTests, indices.length); assert.equal(report.numPassedTests, 22 - indices.length); assert.equal(result.status, indices.length ? 1 : 0);
  const generated = !RED && !CONTROL ? await fixtures() : null;
  for (const [source, before] of sources) assert.equal(fs.readFileSync(source, 'utf8'), before, 'Every actual app and proof byte must stay held');
  receipt({ status: 'complete', fixtures: generated ? { ...generated, file: path.relative(OUT, generated.file) } : null });
  console.log(`Actual documentary unit: all 22 literal names completed; ${report.numPassedTests} passed; ${failed.length} exact Boolean faults; pending 0; child exit ${result.status}.`);
  if (RED || CONTROL === 'registration') console.log('All eleven owned missing-card guards failed first; their downstream effect and delivery assertions were not executed.');
  if (CONTROL) console.log(`Effective ${CONTROL} control: one unique copied Life fault; whole current-source inverse; changed sha256=${anchors[0].afterSha256}.`);
  console.log(`Actual source held: ${sources.size} before copies; ${parentBindings.length} whole parent bindings; five actual compiled leaves${generated ? ' plus one read-only observed engine' : ''}.`);
  console.log('Original408 economics, captions, cooldown and all three effects held; review631 uses the ordinary life cooldown2 and records one review per full-access deal.');
  console.log('No normal or baseline app mutation; no fake effect, ghost queue, new schema, seed search, natural random rate or complete UI-career claim.');
  if (generated) console.log(`Actual plain picker replays: five complete vectors; four review scenarios; six literal answers; four actual later seasons; sha256=${generated.sha256}.`);
  console.log('Raw JSON, logs, source, process, full states, observer inputs and unmodified replay receipts precede strict classification.');
  console.log(`simSoccerCareerDocumentaryReview ${RED ? 'expected baseline red' : CONTROL || 'normal'}: green.`);
} catch (error) { receipt({ methodError: error?.stack || String(error) }); throw error;
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }
