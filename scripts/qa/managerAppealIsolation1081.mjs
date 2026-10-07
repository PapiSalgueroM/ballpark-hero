/* Remote characterization worker. Raw careers and decisions stay intact. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { runCompatibility } from './managerAppealCompatibility1081.mjs';

export const clone = value => JSON.parse(JSON.stringify(value));
export const PARITY_ASSERTION = 'Equivalent appeal outcomes must agree';
export const SAMPLES = 24;
const NOW = Date.UTC(2026, 9, 1);
const manager = { name: 'Isolation Manager', nationality: 'England', background: 'coachingBadges', style: 'counter' };

function stream(seed) {
  let state = seed >>> 0, draws = 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0; draws += 1;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
  return { next, snapshot() {
    const continuation = stream(state);
    return { state, draws, next: Array.from({ length: 8 }, () => continuation.next()) };
  } };
}

/* Independent historical oracle, never imported from the copied desk. */
function independentWins(identity, card, state) {
  const key = `${identity}|${state.clubName}|${state.manager?.name ?? ''}|verdict`;
  let hash = 2166136261;
  for (let i = 0; i < key.length; i++) hash = Math.imul(hash ^ key.charCodeAt(i), 16777619) >>> 0;
  let value = (hash + 0x6d2b79f5) | 0;
  value = Math.imul(value ^ (value >>> 15), 1 | value);
  value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
  return ((value ^ (value >>> 14)) >>> 0) / 4294967296 < card.odds / 100;
}

export const historicalWins = (card, state) => independentWins(card.id, card, state);
export const issuedWins = (card, state) => independentWins(card.verdictKey ?? card.id, card, state);

export function expectedYouthKey(state, playerId) {
  const target = state.squad.find(player => player.id === playerId);
  if (target.isYouth !== true || !target.id.startsWith('youth-')) return undefined;
  let occurrence = 0;
  for (const player of state.squad) {
    if (player.id === playerId) break;
    if (player.name === target.name && player.position === target.position && player.age === target.age) occurrence += 1;
  }
  return JSON.stringify([1, state.season, state.week, target.name, target.position, target.age, occurrence]);
}

/* Compare actual complete structures with an explicit one-to-one ID relation.
   This never rewrites raw input or discards decisions, text or reference fields. */
export function identityRelation(left, right) {
  const forward = new Map(), reverse = new Map();
  const generated = /^(youth|sc|pr|pq|msg)-[a-z0-9-]+$/;
  const visit = (a, b, at) => {
    if (typeof a === 'string' && typeof b === 'string' && generated.test(a) && generated.test(b)) {
      assert.equal(a.split('-')[0], b.split('-')[0], `Identity kind ${at}`);
      if (forward.has(a)) assert.equal(forward.get(a), b, `One source identity ${at}`);
      if (reverse.has(b)) assert.equal(reverse.get(b), a, `One target identity ${at}`);
      forward.set(a, b); reverse.set(b, a); return;
    }
    if (a && b && typeof a === 'object' && typeof b === 'object') {
      assert.equal(Array.isArray(a), Array.isArray(b), `Shape ${at}`);
      assert.deepEqual(Object.keys(a), Object.keys(b), `Complete keys ${at}`);
      for (const key of Object.keys(a)) visit(a[key], b[key], `${at}.${key}`);
      return;
    }
    assert.deepEqual(a, b, `Non-identity value ${at}`);
  };
  visit(left, right, 'career');
  return [...forward].map(([alone, interleaved]) => ({ alone, interleaved }));
}

export function answerSummary(record) {
  const card = record.after.decisions[0];
  return { option: record.option, outcome: card.outcome, resolved: card.resolved,
    ban: record.after.squad.find(player => player.id === record.before.decisions[0].playerId)?.suspendedMatches };
}

async function worker() {
  const [, , , bundle, output, mode, input] = process.argv;
  const historical = mode.startsWith('historical:');
  const scenario = historical ? mode.slice('historical:'.length) : mode;
  assert(process.env.CI, 'Remote CI only');
  fs.mkdirSync(output, { recursive: true });
  const report = { mode, complete: false, rows: [], additionalPositions: [], checks: [], networkAttempts: [], baseline: null };
  const save = () => fs.writeFileSync(path.join(output, 'observations.json'), JSON.stringify(report));
  const check = (name, fn) => {
    try { fn(); report.checks.push({ name, status: 'passed' }); }
    catch (error) {
      if (!(error instanceof assert.AssertionError)) throw error;
      report.checks.push({ name, status: 'assertion-failed', errorName: error.name, error: error.message, stack: error.stack });
    }
  };
  const RealDate = Date;
  globalThis.Date = class extends RealDate {
    constructor(...args) { super(...(args.length ? args : [NOW])); }
    static now() { return NOW; }
  };
  const store = new Map();
  globalThis.localStorage = {
    getItem: key => store.get(key) ?? null, setItem: (key, value) => store.set(key, String(value)),
    removeItem: key => store.delete(key), clear: () => store.clear(), key: i => [...store.keys()][i] ?? null,
    get length() { return store.size; },
  };
  globalThis.fetch = async url => { report.networkAttempts.push(String(url)); throw new Error('Network forbidden in appeal probe'); };
  let rng;
  const reset = seed => { rng = stream(seed); Math.random = rng.next; };
  reset(0x1081);
  try {
    const { E, D, S } = await import(pathToFileURL(bundle).href);
    report.importRng = rng.snapshot();
    const apply = (before, option, verify = true) => {
      const inputState = clone(before), immutable = clone(inputState), rngBefore = rng.snapshot();
      const after = D.answerDecision(inputState, inputState.decisions[0].id, option);
      const result = { option, before: immutable, after: clone(after), rngBefore, rngAfter: rng.snapshot() };
      assert.deepEqual(inputState, immutable, 'Answer preserves its input');
      assert.deepEqual(result.rngAfter, rngBefore, 'Answer preserves RNG state, draws and continuation');
      if (verify) {
        const expected = clone(before), card = expected.decisions[0];
        let resolved, outcome;
        if (option === 1) {
          outcome = 'accepted'; resolved = `Accepted. ${card.playerName} serves the ${card.ban} match${card.ban === 1 ? '' : 'es'} ban.`;
        } else {
          const won = issuedWins(card, before), player = expected.squad.find(p => p.id === card.playerId);
          player.suspendedMatches = won ? 0 : card.ban + 1;
          outcome = won ? 'won' : 'lost';
          resolved = won ? `Appeal won. The ban is wiped and ${player.name} is available for the next match.`
            : `Appeal lost. The panel made it ${player.suspendedMatches} matches.`;
        }
        expected.decisions[0] = { ...card, options: [], resolved, outcome };
        assert.deepEqual(after, expected, 'Actual answer, linked player and every unrelated field match the historical contract');
      }
      return result;
    };
    const baseline = state => {
      const before = clone(state), deck = D.DECK.find(card => card.id === 'schoolVisit');
      assert(deck, 'Independent actual situation exists');
      const card = D.buildSituation(before, deck); before.decisions = [card];
      const immutable = clone(before), rngBefore = rng.snapshot();
      const after = D.answerDecision(before, card.id, card.options.length - 1);
      const expected = clone(immutable);
      expected.decisions[0] = { ...card, options: [], resolved: 'Noted. Nothing changed.' };
      assert.deepEqual(before, immutable, 'Independent baseline input is immutable');
      assert.deepEqual(after, expected, 'Independent unchanged situation baseline');
      assert.deepEqual(rng.snapshot(), rngBefore, 'Independent baseline preserves RNG');
      return { name: 'Independent unchanged situation baseline', passed: true, before: immutable, after: clone(after), rngBefore, rngAfter: rng.snapshot() };
    };
    if (mode.startsWith('control:')) {
      const normal = JSON.parse(fs.readFileSync(input, 'utf8'));
      report.baseline = baseline(normal.rows[0].source);
      for (const original of normal.rows) {
        const before = clone(original.planted), card = D.appealCard(before, original.playerId, 'Probe Town');
        assert(card, 'Copied source still constructs an actual appeal');
        D.settleDecisionDesk(before, [original.playerId], 'Probe Town');
        assert.equal(before.decisions[0].id, card.id, 'Actual desk retains the target appeal first');
        if (mode === 'control:effect') assert.deepEqual(before, original.open, 'Consequence fault keeps the complete open desk and input state unchanged');
        report.rows.push({ id: original.id, card, before: clone(before), answers: card.options.map((_, i) => apply(before, i, false)) });
      }
      const control = mode.slice('control:'.length);
      const names = { mislink: 'Actual appeal player link', effect: 'Actual appeal option effects', story: 'Actual appeal story', verdict: 'Actual historical appeal verdict' };
      check(names[control], () => {
        for (let i = 0; i < report.rows.length; i++) {
          const actual = report.rows[i], expected = normal.rows[i];
          if (control === 'mislink') assert.equal(actual.card.playerId, expected.playerId, names[control]);
          if (control === 'effect') assert.deepEqual(actual.answers.map(answer => answer.after), expected.answers.map(answer => answer.after), names[control]);
          if (control === 'story') assert.equal(actual.card.text, expected.card.text, names[control]);
          if (control === 'verdict') assert.deepEqual(actual.answers.map(answerSummary), expected.answers.map(answerSummary), names[control]);
        }
      });
    } else if (mode === 'compatibility') {
      const config = JSON.parse(fs.readFileSync(input, 'utf8'));
      const { D: historicalD } = await import(pathToFileURL(config.historicalBundle).href);
      const baselineRows = Object.entries(config.historicalRows).flatMap(([historicalArm, file]) =>
        JSON.parse(fs.readFileSync(file, 'utf8')).rows.map(row => ({ ...row, historicalArm })));
      report.baseline = baseline(baselineRows[0].source);
      const observed = runCompatibility({ E, D, S, historicalD, baselineRows, snapshot: () => rng.snapshot(), clone, only: config.only });
      report.checks = observed.checks;
      report.records = observed.records;
    } else {
      assert(['alone', 'interleaved'].includes(scenario));
      for (let i = 0; i < SAMPLES; i++) {
        store.clear(); E.clearCareer();
        const row = { id: `pair-${String(i + 1).padStart(2, '0')}`, interleaved: null };
        if (scenario === 'interleaved') {
          reset(800001 + i * 7919);
          row.interleaved = { seed: 800001 + i * 7919, beforeRng: rng.snapshot(),
            state: clone(E.startCareer('Lincoln City', 'now', undefined, { ...manager, name: 'Other Manager' })) };
          row.interleaved.afterRng = rng.snapshot();
          assert(row.interleaved.state.squad.some(p => p.id.startsWith('youth-')), 'Interleaved career actually generates youth');
          assert.equal(new Set(row.interleaved.state.squad.map(p => p.id)).size, row.interleaved.state.squad.length, 'Every interleaved squad ID is unique');
          E.clearCareer(); store.clear();
        }
        row.seed = 108100 + i * 104729; reset(row.seed); row.generationBefore = rng.snapshot();
        const generated = E.startCareer('Lincoln City', 'now', undefined, manager);
        assert.equal(new Set(generated.squad.map(p => p.id)).size, generated.squad.length, 'Every generated squad ID is unique');
        row.generated = clone(generated); row.generationAfter = rng.snapshot();
        assert.equal(E.saveCareer(generated), true, 'Actual generated career saves');
        const source = E.loadCareer(); assert(source, 'Actual saved career loads');
        assert.equal(new Set(source.squad.map(p => p.id)).size, source.squad.length, 'Every loaded squad ID is unique');
        row.source = clone(source); row.preparationAfter = rng.snapshot();
        const player = source.squad.find(p => p.id.startsWith('youth-'));
        assert(player, 'Target career contains an actual generated youth');
        assert.equal(source.squad.filter(p => p.id === player.id).length, 1, 'Target player ID is unique');
        row.playerId = player.id;
        row.fixture = { kind: 'planted suspension, not a naturally played red card', playerId: player.id,
          before: { suspendedMatches: player.suspendedMatches, seasonReds: player.seasonReds },
          assigned: { suspendedMatches: 2, seasonReds: 1 + i % 3 } };
        const planted = clone(source);
        Object.assign(planted.squad.find(p => p.id === player.id), row.fixture.assigned);
        row.planted = clone(planted);
        const cardRng = rng.snapshot(), card = D.appealCard(planted, player.id, 'Probe Town');
        assert(card, 'Actual appeal opens for the planted suspension');
        assert.deepEqual(rng.snapshot(), cardRng, 'Card creation consumes no match RNG');
        assert.equal(card.playerId, player.id, 'Card links the selected actual youth');
        assert.equal(card.verdictKey, historical ? undefined : expectedYouthKey(planted, player.id), 'Creation-time youth verdict identity');
        assert.equal(card.odds, [40, 25, 15][i % 3], 'Actual red-count odds');
        assert.deepEqual(card.options.map(option => option.effect), [{ kind: 'appeal' }, { kind: 'acceptBan' }]);
        D.settleDecisionDesk(planted, [player.id], 'Probe Town');
        assert.deepEqual(planted.decisions[0], card, 'Actual complete desk retains the constructed appeal');
        assert.deepEqual(rng.snapshot(), cardRng, 'Whole desk settlement preserves match RNG');
        row.coverage = 'Every option of the selected appeal; complete unselected desk cards remain unchanged';
        row.card = clone(card); row.open = clone(planted);
        row.answers = card.options.map((_, option) => apply(planted, option));
        if (i === 0) report.baseline = baseline(source);
        if (i < 3) {
          const checkpoint = { before: clone(planted), rngBefore: rng.snapshot() };
          assert.equal(E.saveCareer(planted), true, 'Actual open-card career saves'); checkpoint.savedBytes = store.get(E.SAVE_KEY);
          const loaded = E.loadCareer(); assert(loaded); checkpoint.loaded = clone(loaded);
          assert.deepEqual(loaded.decisions, planted.decisions, 'Existing open cards survive actual save/load exactly');
          assert.equal(S.activeSlot(), 1, 'Open-card career starts in slot 1');
          assert.equal(S.switchSlot(2, loaded), true, 'Actual slot parks the open-card career');
          assert.equal(S.activeSlot(), 2, 'The empty second slot becomes active');
          checkpoint.parkedBytes = store.get(S.parkedKey(1));
          assert.equal(checkpoint.parkedBytes, JSON.stringify(E.leanCareer(loaded)), 'Actual parked bytes use the unchanged lean serializer');
          assert.equal(S.switchSlot(1), true, 'Actual slot restores the original career');
          assert.equal(S.activeSlot(), 1, 'The original first slot becomes active');
          checkpoint.restoredBytes = store.get(E.SAVE_KEY);
          assert.equal(checkpoint.restoredBytes, checkpoint.parkedBytes, 'Switch restores the exact parked bytes');
          const restored = E.loadCareer(); assert(restored); checkpoint.restored = clone(restored);
          assert.deepEqual(restored.decisions, planted.decisions, 'Same open card IDs/options survive switching');
          checkpoint.loadedAnswers = loaded.decisions[0].options.map((_, option) => apply(loaded, option));
          checkpoint.restoredAnswers = restored.decisions[0].options.map((_, option) => apply(restored, option));
          assert.deepEqual(checkpoint.loadedAnswers.map(answerSummary), row.answers.map(answerSummary), 'Reload keeps actual verdict and effects');
          assert.deepEqual(checkpoint.restoredAnswers.map(answerSummary), row.answers.map(answerSummary), 'Switch keeps actual verdict and effects');
          checkpoint.rngAfter = rng.snapshot();
          assert.deepEqual(checkpoint.rngAfter, checkpoint.rngBefore, 'Existing-card save/load/switch preserves RNG state, draws and continuation');
          row.stability = checkpoint;
        }
        report.rows.push(row); save();
      }
      // These separate cases do not replace any of the original 24 first-youth repros.
      for (const position of ['CB', 'CM', 'ST']) {
        const source = clone(report.rows[0].source), player = source.squad.find(p => p.isYouth && p.id.startsWith('youth-') && p.position === position);
        assert(player, `Actual generated ${position} exists in the retained source`);
        const planted = clone(source), target = planted.squad.find(p => p.id === player.id);
        target.suspendedMatches = 2; target.seasonReds = 1;
        const fixtureState = clone(planted), beforeRng = rng.snapshot(), card = D.appealCard(planted, player.id, 'Probe Town');
        assert(card); assert.equal(card.verdictKey, historical ? undefined : expectedYouthKey(planted, player.id));
        D.settleDecisionDesk(planted, [player.id], 'Probe Town');
        assert.deepEqual(rng.snapshot(), beforeRng, 'Additional position card preserves RNG');
        report.additionalPositions.push({ id: `position-${position}`, position, playerId: player.id,
          source, planted: fixtureState, card: clone(card), open: clone(planted),
          fixture: 'Planted two-match suspension and first red on an actual generated player',
          answers: card.options.map((_, option) => apply(planted, option)) });
      }
      report.checks.push({ name: 'Actual answers and existing-card stability', status: 'passed' });
    }
    assert.deepEqual(report.networkAttempts, [], 'No network attempted');
    report.complete = true; save();
    console.log(`${mode}: ${report.records?.length ?? report.rows.length} retained records; independent baseline passed; ${report.checks.filter(c => c.status === 'assertion-failed').length} mapped assertion failures`);
  } catch (error) {
    report.failure = { name: error.name, message: error.message, stack: error.stack }; save(); throw error;
  }
}

if (process.argv[2] === '--worker') await worker();
