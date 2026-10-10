import './lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { playFleet } from './lib/cmVarFleet.mjs';
import { derive } from './genCmVarRates.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const self = fileURLToPath(import.meta.url), engine = 'src/lib/clubManager.ts', helper = 'src/lib/clubManagerVar.ts', rates = 'src/data/clubManagerVarRates.ts';
/* Round 1218: the shipped rates come from real football and are small, so the MECHANICS outcomes below (a goal
   held for its review, a played review kept on a recut, a reload) are proven on FIXTURE rates, where every kind of
   review is frequent enough to find in a bounded search: the constants Round 1181 wrote, handed to the engine in
   place of the generated module. The BANDS outcome plays the generated module itself. */
const FIXTURE_RATES = 'export const CM_VAR_RATES = { goalReview: 0.16, overturn: 0.32, penaltyReview: 0.45, missedFoulReview: 0.015, penaltyScores: 0.74, penaltyOnTarget: 0.70 } as const;';
const RATES_LINE = /^export const CM_VAR_RATES = \{[^}]*\} as const;$/m;
const withFixtureRates = source => { assert.ok(RATES_LINE.test(source), 'The generated rates line exists'); return source.replace(RATES_LINE, FIXTURE_RATES); };
const clone = value => JSON.parse(JSON.stringify(value));
/* Round 1218, the bands outcome. The ranges are real football's (scripts/data/cmVarRates.json, through the generator).
   headroom: how far past a range's edge the fleet's own sampling may put a healthy engine. MEASURED on GitHub runners
   (result r1218-b2, head 3238354b): five fleets on five disjoint sets of six seeds, 3,947 to 4,077 league matches each.
     goals ruled out a match      0.0710 0.0782 0.0780 0.0753 0.0819   (target 0.0763: from 7.0% under to 7.3% over)
     penalties awarded a match    0.0643 0.0687 0.0745 0.0725 0.0703   (target 0.0658: from 2.3% under to 13.2% over)
   The engine aims at the LOW end of each range, so about half of all fleets land under it. One fleet's figure moves
   by about 5.4% of the target from fleet to fleet (standard deviation over the five). 0.20 is 3.7 of those, and 2.9
   times the worst miss seen. The old constants land 77% under, 100% and 175% over the edges: nowhere near.
   goalGap: the 0.05 goals a match simCmStoppageTime (tolGpm) already allows a rule to move the goal count by, taken
   here on the SAME match played with and without reviews. Measured: -0.0188 -0.0228 -0.0261 -0.0177 -0.0245.
   No Club Manager harness holds penalties a match, so none is held here either: the figure is printed (0.42 to 0.45
   with reviews on, of which 0.064 to 0.075 a review awarded) and that is all. */
const BANDS = { seeds: '31,32,33,34,35,36', headroom: 0.20, goalGap: 0.05 };
const BASE = 'c33d013965aa33b87f5db23e2ca270be6fcd977c';
export function withCmVarSeed(seed, fn) {
  const previous = Math.random, previousNow = Date.now;
  Date.now = () => 1791547200000;
  let a = seed >>> 0;
  Math.random = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  try { return fn(); } finally { Math.random = previous; Date.now = previousNow; }
}
function fresh(cm) {
  const career = withCmVarSeed(4107, () => cm.startCareer('Everton'));
  /* Release AT: Round 1184 gives a new Everton career the real fixture list, so its opener is another club than
     the one this search and the prior engine below were written against. The generated list is asked for the
     way Round 1184 itself asks for it in simLiveMatch and simClubManagerSlots: only the opt in key is taken off. */
  delete career.realLeagueFixtures;
  career.squad = career.squad.map(p => ({ ...p, fitness: 100, morale: 70, injuryWeeks: 0, suspendedMatches: 0 }));
  return career;
}
export function findCmVarFixture(cm, kind = 'disallowed') {
  const pre = fresh(cm);
  for (let seed = 1700; seed < 3700; seed++) {
    const stop = withCmVarSeed(seed, () => cm.playNextEntry(pre, { varReviews: true }));
    assert.equal(stop.kind, 'halftime');
    const feed = cm.liveFeed(stop.state.live);
    const event = feed.find(e => e.kind === 'var' && e.review && e.minute > 2 && e.minute < 40 && !e.plus
      && (kind.startsWith('awarded_') ? e.review.decision === 'awarded' && !!stop.state.live.h1Play.find(p => p.kind === 'shot' && p.review?.id === e.review.id)?.goal === (kind === 'awarded_scored')
        : kind === 'penalty' ? e.review.incident === 'penalty' && e.review.decision === 'confirmed' : e.review.incident === 'goal' && e.review.decision === kind)
      && (kind !== 'disallowed' || e.side === 'me')
      && !feed.some(other => other.kind === 'var' && other !== e && other.minute >= e.minute - 2 && other.minute <= e.minute));
    if (event) return { pre, seed, paused: stop.state, event };
  }
  throw new Error(`No actual ${kind} review in the bounded engine fixture search`);
}
const titles = {
  goal: 'overturns an actual drawn goal before scorer credit and goal-shot commitment',
  penalty: 'links every reviewed penalty to one actual penalty resolution without extra shots',
  awarded: 'awards actual penalties from saved defensive foul incidents and resolves scored and missed kicks once',
  saved: 'retains the exact stored decisions on save load and deterministic settlement',
  past: 'keeps played reviews and scores while only the future is recut after a tactical change',
  reveal: 'holds the accepted goal and penalty shot until its own saved decision is shown',
  resume: 'shows already played reviewed goals and added-time events when a saved later period opens',
  rates: 'uses stated game rates with bilateral outcomes and reports the enabled baseline delta',
  baseline: 'preserves the full prior default match and old live or historical kickoff behavior',
  bands: 'holds every review outcome a match inside the range real football gives, on the generated rates',
  coverage: 'asks for reviews only where the competition uses them and plays the same match everywhere else',
};
const controls = {
  counted: { file: engine, from: '  if (myReview) me.goals = myReview.goals;', to: '  if (false) me.goals = myReview!.goals;', test: 'goal' },
  decorative: { file: helper, from: '    if (!overturned) accepted.push(goal);', to: '    accepted.push(goal);', test: 'goal' },
  penalty: { file: helper, from: "    if (shot.kind !== 'shot' || !shot.penalty || shot.review) return [];", to: '    if (false) return [];', test: 'penalty' },
  awards: { file: helper, from: 'if (index < 0 || !taker) continue;', to: 'if (true) continue;', test: 'awarded' },
  resolution: { file: helper, from: 'const scored = rng() < CM_VAR_GAME_RATES.penaltyScores;', to: 'const scored = false;', test: 'awarded' },
  past: { file: engine, from: 'live.h1Play = keepUpTo(live.h1Play, minute);', to: 'live.h1Play = [];', test: 'past' },
  reveal: { file: helper, from: "  if (event.kind !== 'goal' && event.kind !== 'save' && event.kind !== 'shot') return false;", to: '  return false;', test: 'reveal' },
  resume: { file: helper, from: 'return new Set(feed.filter(event => {', to: 'return new Set([]); return new Set(feed.filter(event => {', test: 'resume' },
  announce: { file: helper, from: "  if (event.kind === 'var' && event.review) return settled.has(event.review.id);", to: '  return true;', test: 'reveal' },
  disabled: { file: engine, from: "...(varReviews && worldYear(state) >= 2026", to: "...(false && worldYear(state) >= 2026", test: 'rates' },
  everywhere: { file: helper, from: '  if (!from) return false;', to: '  if (!from) return true;', test: 'coverage' },
  /* Round 1218: each rate Round 1181 typed, put back into the generated module. Each must leave the range for its own reason. */
  oldgoalreview: { file: rates, from: /goalReview: [0-9.]+/, to: 'goalReview: 0.16', test: 'bands' },
  oldoverturn: { file: rates, from: /overturn: [0-9.]+/, to: 'overturn: 0.32', test: 'bands' },
  oldpenaltyreview: { file: rates, from: /penaltyReview: [0-9.]+/, to: 'penaltyReview: 0.45', test: 'bands' },
  oldmissedfoul: { file: rates, from: /missedFoulReview: [0-9.]+/, to: 'missedFoulReview: 0.015', test: 'bands' },
  oldpenaltyscores: { file: rates, from: /penaltyScores: [0-9.]+/, to: 'penaltyScores: 0.74', test: 'bands' },
};
async function main() {
  const control = process.env.CM_VAR_CONTROL || '';
  assert.ok(!control || control === 'all' || Object.hasOwn(controls, control), 'Known VAR control');
  const evidence = path.resolve(process.env.CM_VAR_ARTIFACTS || path.join(root, 'cm-var-artifacts/outcomes'));
  await mkdir(evidence, { recursive: true });
  if (control === 'all') {
    const summary = [];
    for (const name of ['', ...Object.keys(controls)]) {
      const run = spawnSync(process.execPath, [self], { cwd: root, env: { ...process.env, CM_VAR_CONTROL: name, CM_VAR_ARTIFACTS: evidence }, encoding: 'utf8', timeout: 1500000, maxBuffer: 16 * 1024 * 1024, windowsHide: true });
      const output = `${run.stdout || ''}\n${run.stderr || ''}`;
      await writeFile(path.join(evidence, `${name || 'normal'}-runner.log`), output);
      summary.push({ name: name || 'normal', passed: run.status === 0 && !run.error && !run.signal, exit: run.status });
      console.log(`${summary.at(-1).passed ? 'PASS' : 'FAIL'} VAR ${name || 'normal'}`);
      process.stdout.write(summary.at(-1).passed ? output.split('\n').filter(line => line.startsWith('simCmVar')).join('\n') + '\n' : output.slice(-12000));
    }
    await writeFile(path.join(evidence, 'summary.json'), JSON.stringify(summary, null, 2));
    assert.ok(summary.every(row => row.passed), 'Normal proof and every effective control execute');
    console.log(`simCmVar: ${Object.keys(titles).length} actual outcomes and ${Object.keys(controls).length} effective controls passed.`); return;
  }
  const sources = Object.fromEntries(await Promise.all([engine, helper, rates].map(async file => [file, (await readFile(path.join(root, file), 'utf8')).replaceAll('\r\n', '\n')])));
  const sourceBytes = Object.fromEntries(await Promise.all([engine, helper, rates].map(async file => [file, await readFile(path.join(root, file))])));
  const parent = path.join(root, '.sim-control'); await mkdir(parent, { recursive: true });
  const folder = await mkdtemp(path.join(parent, 'cm-var-'));
  const unhandled = [], capture = error => unhandled.push({ name: error?.name, message: String(error?.message ?? error) });
  process.on('unhandledRejection', capture); process.on('uncaughtExceptionMonitor', capture);
  try {
    const require = createRequire(import.meta.url);
    async function bundle(source, varSource, name, ratesSource = withFixtureRates(sources[rates])) {
      const entry = path.join(folder, `${name}.ts`), leaf = path.join(folder, `${name}-var.ts`), ratesLeaf = path.join(folder, `${name}-rates.ts`), output = path.join(folder, `${name}.cjs`);
      await writeFile(ratesLeaf, ratesSource);
      await writeFile(entry, source + `\nexport { settleGoalReviews, penaltyReviews, cmVarEventWaiting, cmVarPlayWaiting, CM_VAR_GAME_RATES, awardReviewedPenalties, cmVarPlayedReviewIds, cmVarCanAnnounce, cmVarCovers } from '@/lib/clubManagerVar';\n`);
      await writeFile(leaf, varSource);
      await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'cjs', outfile: output, logLevel: 'silent', alias: { '@/lib/clubManager': entry, '@/lib/clubManagerVar': leaf, '@/data/clubManagerVarRates': ratesLeaf, '@': path.join(root, 'src') } });
      return () => { delete require.cache[require.resolve(output)]; return require(output); };
    }
    const git = spawnSync('git', ['show', `${BASE}:${engine}`], { cwd: root, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, windowsHide: true });
    assert.equal(git.status, 0, 'The prior accepted engine is available for a whole-save comparison');
    const oldFactory = await bundle(git.stdout, sources[helper], 'prior');
    const originalFactory = await bundle(sources[engine], sources[helper], 'original');
    const changed = { ...sources };
    if (control) {
      const spec = controls[control]; assert.equal(changed[spec.file].split(spec.from).length - 1, 1, 'One exact executable mutation anchor');
      changed[spec.file] = changed[spec.file].replace(spec.from, spec.to); assert.notEqual(changed[spec.file], sources[spec.file]);
      await writeFile(path.join(evidence, `${control}-mutation.json`), JSON.stringify({ ...spec, from: String(spec.from), originalHash: createHash('sha256').update(sources[spec.file]).digest('hex'), changedHash: createHash('sha256').update(changed[spec.file]).digest('hex') }, null, 2));
    }
    const candidateFactory = control ? await bundle(changed[engine], changed[helper], 'candidate') : originalFactory;
    const memory = new Map();
    globalThis.localStorage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, String(value)), removeItem: key => memory.delete(key) };
    const original = originalFactory(), cm = candidateFactory();
    const fixture = kind => findCmVarFixture(original, kind);
    const rows = [], metrics = {};
    const outcomes = {
      goal() {
        const f = fixture('disallowed');
        const actual = withCmVarSeed(f.seed, () => cm.playNextEntry(f.pre, { varReviews: true }));
        const event = actual.state.live.h1Play.find(e => e.review?.id === f.event.review.id);
        assert.ok(event?.review?.decision === 'disallowed', 'The real candidate produces the same saved overturned incident');
        const goals = actual.state.live.h1My;
        assert.ok(!goals.some(g => g.minute === event.minute && g.name === event.who), 'A ruled-out candidate is not committed as a scorer');
        assert.ok(!actual.state.live.h1Play.some(e => e.kind === 'shot' && e.goal && e.minute === event.minute && e.who === event.who), 'A ruled-out candidate is not a goal shot');
        const withoutReviews = clone(actual.state.live); withoutReviews.h1Play = withoutReviews.h1Play.filter(e => e.kind !== 'var');
        assert.deepEqual(cm.liveStatsAt(actual.state.live, 45), cm.liveStatsAt(withoutReviews, 45), 'Review incidents add no shots, on-target efforts, saves, fouls, corners or xG');
        const settled = withCmVarSeed(5301, () => cm.resumeMatch(actual.state));
        const ownGoals = settled.report.home === f.pre.clubName ? settled.report.homeGoals : settled.report.awayGoals;
        const credits = settled.state.squad.reduce((n, p) => n + p.seasonGoals, 0) - f.pre.squad.reduce((n, p) => n + p.seasonGoals, 0);
        assert.equal(credits, ownGoals, 'Only accepted goals receive player credit');
        assert.ok(settled.report.detail.timeline.some(e => e.review?.id === event.review.id));
        assert.equal(settled.report.myScorers.length, ownGoals);
      },
      penalty() {
        const f = fixture('penalty');
        const actual = withCmVarSeed(f.seed, () => cm.playNextEntry(f.pre, { varReviews: true }));
        const reviews = actual.state.live.h1Play.filter(e => e.kind === 'var' && e.review?.incident === 'penalty');
        assert.ok(reviews.length > 0, 'A real reviewed penalty is drawn');
        for (const review of reviews) {
          const shots = actual.state.live.h1Play.filter(e => e.kind === 'shot' && e.penalty && e.side === review.side && e.minute === review.minute && e.who === review.who);
          assert.equal(shots.length, 1, 'A reviewed penalty links to exactly one existing actual penalty shot');
          assert.equal(review.review.decision, 'confirmed');
          assert.equal(actual.state.live.h1Play.filter(e => e.kind === 'shot' && e.goal && e.side === review.side && e.minute === review.minute).length, shots[0].goal ? 1 : 0);
        }
      },
      awarded() {
        for (const kind of ['awarded_scored', 'awarded_missed']) {
          const f = fixture(kind);
          const actual = withCmVarSeed(f.seed, () => cm.playNextEntry(f.pre, { varReviews: true }));
          const live = actual.state.live, review = live.h1Play.find(e => e.kind === 'var' && e.review?.id === f.event.review.id);
          assert.ok(review?.review?.decision === 'awarded', 'The actual missed-foul review awards a penalty');
          const trigger = review.review.trigger;
          assert.ok(live.h1Play.some(e => e.kind === 'foul' && e.minute === review.minute && e.side === trigger.side && e.who === trigger.who), 'The penalty follows its original actual defending-side foul');
          const shots = live.h1Play.filter(e => e.kind === 'shot' && e.review?.id === review.review.id);
          assert.equal(shots.length, 1, 'Awarded penalty resolves exactly one actual kick');
          const shot = shots[0]; assert.equal(shot.penalty, true); assert.equal(shot.who, review.who); assert.equal(shot.minute, review.minute);
          assert.equal(shot.side, review.side); assert.equal(!!shot.goal, kind === 'awarded_scored', 'The saved actual kick can score or miss');
          const scorers = review.side === 'me' ? live.h1My : live.h1Opp;
          assert.equal(scorers.filter(g => g.name === shot.who && g.minute === shot.minute && g.penalty).length, shot.goal ? 1 : 0, 'Only a scored penalty creates a scorer');
          if (shot.side === 'me') assert.ok(cm.myOnPitchAt(live, shot.minute).some(id => actual.state.squad.find(p => p.id === id)?.name === shot.who), 'Assigned taker is on the actual pitch');
          const result = withCmVarSeed(5310, () => cm.resumeMatch(actual.state));
          assert.equal(result.report.detail.play.filter(e => e.kind === 'shot' && e.goal).length, result.report.homeGoals + result.report.awayGoals);
          const credits = result.state.squad.reduce((n, p) => n + p.seasonGoals, 0) - f.pre.squad.reduce((n, p) => n + p.seasonGoals, 0);
          assert.equal(credits, result.report.myScorers.length, 'Awarded penalty player credit matches the accepted score once');
          const takerGoal = result.report.myScorers.find(g => g.name === shot.who && g.minute === shot.minute && g.penalty);
          if (takerGoal) assert.equal(takerGoal.assist, undefined, 'Penalty goals never receive invented assists');
        }
      },
      saved() {
        const f = fixture('disallowed'), before = clone(f.paused);
        assert.equal(cm.saveCareer(f.paused), true);
        const bytes = memory.get(cm.SAVE_KEY), loaded = cm.loadCareer(); assert.ok(loaded?.live);
        assert.deepEqual(loaded.live, before.live, 'Loading preserves all stored review decisions and every decided event');
        assert.equal(memory.get(cm.SAVE_KEY), bytes, 'Loading alone does not rewrite the save');
        const a = withCmVarSeed(5302, () => candidateFactory().resumeMatch(loaded));
        const b = withCmVarSeed(5302, () => candidateFactory().resumeMatch(before));
        assert.deepEqual(a, b, 'Reload and uninterrupted settlement are identical'); assert.deepEqual(f.paused, before);
        assert.equal(a.state.resultLog.length, before.resultLog.length + 1);
        assert.equal(a.state.week, before.week + 1);
      },
      past() {
        const f = fixture('disallowed'), minute = f.event.minute;
        const expected = f.paused.live.h1Play.filter(e => cm.playedBy(minute)(e));
        const changed = withCmVarSeed(5303, () => cm.changeLive(f.paused, minute, { kind: 'shape', mentality: 'attacking' })); assert.ok(changed);
        assert.deepEqual(changed.live.h1Play.filter(e => cm.playedBy(minute)(e)), expected, 'Played review decisions and all played football survive the recut');
        assert.deepEqual(changed.live.h1My.filter(e => cm.playedBy(minute)(e)), f.paused.live.h1My.filter(e => cm.playedBy(minute)(e)));
        const boardState = clone(f.paused); boardState.live.added.h1 = 3;
        const boardReview = clone(boardState.live.h1Play.find(e => e.review?.id === f.event.review.id)); boardReview.minute = 45; boardReview.plus = 1;
        boardState.live.h1Play.push(boardReview);
        const afterBoard = withCmVarSeed(5304, () => cm.changeLive(boardState, 45, { kind: 'shape', mentality: 'defensive' }, 1)); assert.ok(afterBoard);
        assert.ok(afterBoard.live.h1Play.some(e => e.review?.id === boardReview.review.id && e.minute === 45 && e.plus === 1), 'A played added-time review survives a board recut');
      },
      reveal() {
        for (const kind of ['confirmed', 'penalty', 'awarded_scored', 'awarded_missed']) {
          const f = fixture(kind), feed = cm.liveFeed(f.paused.live);
          const e = feed.find(line => (line.kind === 'goal' || line.kind === 'save' || line.kind === 'shot') && line.side === f.event.side && line.minute === f.event.minute && line.text === f.event.text);
          assert.ok(e, 'The reviewed accepted resolution exists');
          assert.equal(cm.cmVarEventWaiting(e, feed, new Set()), true, 'An unresolved review withholds its own accepted resolution');
          const shot = f.paused.live.h1Play.find(line => line.kind === 'shot' && line.side === e.side && line.minute === e.minute && line.who === e.text);
          assert.ok(shot); assert.equal(cm.cmVarPlayWaiting(shot, feed, new Set()), true, 'The accepted shot stats also wait for review');
          assert.equal(cm.cmVarEventWaiting(e, feed, new Set([f.event.review.id])), false);
          const boundary = feed.filter(line => line.minute === f.event.minute).map(line => ({ ...line, minute: 46 }));
          const accepted = { ...e, minute: 46 };
          const review = { ...f.event, minute: 46 };
          assert.equal(cm.cmVarCanAnnounce(accepted, boundary, new Set()), false, 'A 46th-minute accepted resolution cannot announce during its review');
          assert.equal(cm.cmVarCanAnnounce(review, boundary, new Set()), false, 'The 46th-minute stored outcome cannot announce during checking');
          assert.equal(cm.cmVarCanAnnounce(review, boundary, new Set([review.review.id])), true);
          assert.equal(cm.cmVarEventWaiting({ ...e, text: 'Different simulated player' }, feed, new Set()), false);
        }
      },
      resume() {
        const f = fixture('confirmed'), feed = cm.liveFeed(f.paused.live);
        const settled = cm.cmVarPlayedReviewIds(feed, f.event.minute + 1, 'first');
        assert.ok(settled.has(f.event.review.id), 'A previously played reviewed goal is settled on resume');
        const goal = feed.find(e => e.kind === 'goal' && e.side === f.event.side && e.minute === f.event.minute && e.text === f.event.text);
        assert.equal(cm.cmVarEventWaiting(goal, feed, settled), false, 'An already played reviewed goal remains visible');
        assert.equal(cm.cmVarPlayedReviewIds(feed, f.event.minute, 'first').has(f.event.review.id), false, 'An exact opening-minute review can replay its saved decision without exposing a fresh restart outcome');
        const board = { ...f.event, minute: 45, plus: 5 };
        assert.ok(cm.cmVarPlayedReviewIds([board], 46, 'second').has(board.review.id), 'The first-half board stays played when the second half opens');
        assert.equal(cm.cmVarPlayedReviewIds([board], 45, 'first').has(board.review.id), false);
      },
      rates() {
        const pre = fresh(original); let reviews = 0, overturned = 0, penalty = 0, awarded = 0, awardedGoals = 0, enabledGoals = 0, disabledGoals = 0; const sides = new Set();
        for (let seed = 6100; seed < 6356; seed++) {
          const enabled = withCmVarSeed(seed, () => candidateFactory().playNextEntry(pre, { skipHalftime: true, varReviews: true, noCoach: true }));
          const disabled = withCmVarSeed(seed, () => originalFactory().playNextEntry(pre, { skipHalftime: true, noCoach: true }));
          const incidents = enabled.report.detail.play.filter(e => e.kind === 'var');
          reviews += incidents.length;
          for (const e of incidents) { sides.add(e.side); overturned += e.review.decision === 'disallowed'; penalty += e.review.incident === 'penalty'; awarded += e.review.decision === 'awarded'; }
          awardedGoals += enabled.report.detail.play.filter(e => e.kind === 'shot' && e.goal && e.review?.decision === 'awarded').length;
          enabledGoals += enabled.report.homeGoals + enabled.report.awayGoals;
          disabledGoals += disabled.report.homeGoals + disabled.report.awayGoals;
          assert.equal(enabled.report.detail.play.filter(e => e.kind === 'shot' && e.goal).length, enabled.report.homeGoals + enabled.report.awayGoals);
        }
        assert.ok(reviews > 0 && overturned > 0 && penalty > 0 && awarded > 0 && awardedGoals > 0 && awardedGoals < awarded, 'Enabled actual matches draw reviewed goals, overturned goals and reviewed penalties');
        assert.deepEqual([...sides].sort(), ['me', 'opp']);
        let candidates = 0, sampledReviews = 0, sampledOverturns = 0;
        for (let seed = 0; seed < 8192; seed++) {
          const draw = cm.settleGoalReviews([{ name: 'Simulated candidate', minute: 25 }], 'me', `rate:${seed}`);
          candidates++; sampledReviews += draw.reviews.length; sampledOverturns += draw.reviews.filter(e => e.review.decision === 'disallowed').length;
        }
        // Wide bounds around explicit game constants, not a claim about real VAR frequencies.
        assert.ok(sampledReviews / candidates > 0.10 && sampledReviews / candidates < 0.23);
        assert.ok(sampledOverturns / candidates > 0.025 && sampledOverturns / candidates < 0.09);
        Object.assign(metrics, { matches: 256, reviews, overturned, penalty, awarded, awardedGoals, enabledGoals, disabledGoals, sampledReviews, sampledOverturns, candidates, gameRates: cm.CM_VAR_GAME_RATES });
      },
      async baseline() {
        const pre = fresh(original);
        for (const seed of [7110, 7111, 7112]) {
          const current = withCmVarSeed(seed, () => candidateFactory().playNextEntry(pre, { skipHalftime: true, noCoach: true }));
          const prior = withCmVarSeed(seed, () => oldFactory().playNextEntry(pre, { skipHalftime: true, noCoach: true }));
          assert.deepEqual(current, prior, 'Default callers retain every prior report, stat, player credit and save byte');
        }
        const before2026 = { ...clone(pre), startYear: 2025 };
        const plainBefore2026 = withCmVarSeed(7113, () => originalFactory().playNextEntry(before2026));
        const enabledBefore2026 = withCmVarSeed(7113, () => candidateFactory().playNextEntry(before2026, { varReviews: true }));
        assert.deepEqual(enabledBefore2026, plainBefore2026, 'Pre-2026 clocks ignore review opt-in');
        const historicalPlain = originalFactory(), historicalCandidate = candidateFactory(), historicalPrior = oldFactory();
        await Promise.all([historicalPlain, historicalCandidate, historicalPrior].map(engine => engine.ensureEraRosters('era2010')));
        const historical = withCmVarSeed(4107, () => historicalPlain.startCareer('Everton', 'era2010'));
        // Override only this simulation's clock so the historic-era guard is tested independently of the year guard.
        historical.startYear = 2026;
        const plainHistoric = withCmVarSeed(7113, () => historicalPlain.playNextEntry(historical));
        const enabledHistoric = withCmVarSeed(7113, () => historicalCandidate.playNextEntry(historical, { varReviews: true }));
        const priorHistoric = withCmVarSeed(7113, () => historicalPrior.playNextEntry(historical));
        assert.deepEqual(enabledHistoric, plainHistoric, 'Actual loaded historic squads ignore review opt-in even on a 2026 simulation clock');
        assert.deepEqual(plainHistoric, priorHistoric, 'Loaded historic squads retain the entire prior default match');
        const oldLive = withCmVarSeed(7114, () => originalFactory().playNextEntry(pre));
        const before = clone(oldLive.state.live);
        const plain = withCmVarSeed(7115, () => candidateFactory().playNextEntry(oldLive.state, { skipHalftime: true }));
        const enabled = withCmVarSeed(7115, () => candidateFactory().playNextEntry(oldLive.state, { skipHalftime: true, varReviews: true }));
        assert.deepEqual(enabled, plain); assert.deepEqual(oldLive.state.live, before);
        assert.ok(!enabled.report.detail.play.some(e => e.kind === 'var'), 'A loaded legacy live match is never opted in retrospectively');
      },
      /* Round 1218: only where VAR is used. On fixture rates, so a review that slipped into a competition without
         them would show at once. A match whose competition has no row that says yes (Championship, Eredivisie,
         Ligue 1, the Scottish Premiership here, and a covered club's domestic cup) is the same match, and leaves
         the random stream in the same place, whether reviews are asked for or not, and its saved live match
         carries no opt in. A league match in a league that says yes carries it. */
      async coverage() {
        /* A fresh engine for each side of a comparison: the engine numbers its inbox messages from a counter of its
           own, so two matches played one after the other on one engine differ in those ids and in nothing else. */
        const both = (state, seed, opts) => withCmVarSeed(seed, () => { const result = candidateFactory().playNextEntry(state, opts); return { result, next: Math.random() }; });
        const optIn = (state, seed) => { const stop = withCmVarSeed(seed, () => cm.playNextEntry(state, { noCoach: true, varReviews: true })); return stop.kind === 'halftime' ? { lit: stop.state.live.varReviews === true, europe: stop.state.live.compLabel.startsWith('Champions League') } : null; };
        let outside = 0, abroad = 0;
        for (const [c, club] of ['Wolves', 'Ajax', 'Lyon', 'Celtic'].entries()) {
          let state = withCmVarSeed(4200 + c, () => cm.startCareer(club)), matches = 0;
          for (let i = 0; i < 60 && matches < 12; i++) {
            const seed = 8100 + c * 101 + i;
            const at = optIn(state, seed);
            /* A club from a league without reviews still meets them in the Champions League, whose row says yes. */
            if (at?.europe) { assert.equal(at.lit, true, `${club}: its Champions League match carries the opt in`); abroad += 1; state = both(state, seed, { skipHalftime: true, noCoach: true }).result.state; continue; }
            if (at) assert.equal(at.lit, false, `${club}: a match in a competition without reviews carries no opt in`);
            const asked = both(state, seed, { skipHalftime: true, noCoach: true, varReviews: true }), plain = both(state, seed, { skipHalftime: true, noCoach: true });
            assert.deepEqual(asked, plain, `${club}: where the competition has no reviews, asking for them plays the same match and leaves the stream where it was`);
            if (asked.result.kind === 'seasonOver' || asked.result.state?.sacked) break;
            if (asked.result.kind === 'match') { matches += 1; outside += 1; assert.ok(!asked.result.report.detail.play.some(e => e.kind === 'var')); }
            state = asked.result.state;
          }
          assert.ok(matches >= 10, `${club} played ${matches} matches`);
        }
        let state = withCmVarSeed(4107, () => cm.startCareer('Arsenal')), league = 0, cup = 0, europe = 0;
        for (let i = 0; i < 120 && (league < 3 || cup < 1 || europe < 1); i++) {
          const seed = 8600 + i;
          const stop = withCmVarSeed(seed, () => cm.playNextEntry(state, { noCoach: true, varReviews: true }));
          if (stop.kind === 'halftime') {
            const comp = stop.state.live.compLabel;
            if (comp.startsWith('Premier League')) { league += 1; assert.equal(stop.state.live.varReviews, true, `${comp}: a league whose row says yes carries the opt in`); }
            else if (comp.startsWith('Champions League')) { europe += 1; assert.equal(stop.state.live.varReviews, true, `${comp}: the Champions League carries the opt in`); }
            else if (comp.startsWith('FA Cup')) {
              cup += 1; assert.equal(stop.state.live.varReviews, undefined, `${comp}: a cup with no row that says yes carries no opt in`);
              assert.deepEqual(both(state, seed, { skipHalftime: true, noCoach: true, varReviews: true }), both(state, seed, { skipHalftime: true, noCoach: true }));
            }
          }
          const next = withCmVarSeed(seed, () => cm.playNextEntry(state, { skipHalftime: true, noCoach: true }));
          if (next.kind === 'seasonOver' || next.state?.sacked) break;
          state = next.state;
        }
        assert.ok(league >= 3 && cup >= 1 && europe >= 1, `Arsenal met ${league} league, ${cup} cup and ${europe} Champions League kickoffs`);
        const stagedSource = withFixtureRates(sources[rates]).replace("Readonly<Record<string, string>> = { ", "Readonly<Record<string, string>> = { 'cup:FA Cup': 'QF', ");
        assert.ok(stagedSource.includes("'cup:FA Cup': 'QF'"), 'The staged coverage reached the module');
        const staged = (await bundle(changed[engine], changed[helper], 'staged', stagedSource))();
        assert.deepEqual(['R16', 'QF', 'SF', 'F'].map(s => staged.cmVarCovers('cup:FA Cup', s)), [false, true, true, true], 'A cup is covered from its first stage with reviews on');
        assert.deepEqual(['group', 'R16', 'QF', 'SF', 'F'].map(s => staged.cmVarCovers('ucl', s)), [true, true, true, true, true]);
        assert.deepEqual([staged.cmVarCovers('league:premier'), staged.cmVarCovers('league:championship'), staged.cmVarCovers('cup:FA Cup'), staged.cmVarCovers('toString'), staged.cmVarCovers('league:atlantis')], [true, false, false, false, false]);
        metrics.coverage = { outside, abroad, league, cup, europe };
      },
      /* Round 1218. The generated rates themselves, on a fleet of league matches in the leagues whose row says
         yes (scripts/lib/cmVarFleet.mjs: 20 clubs, one season a seed). Each outcome a match must sit inside the
         range real football gives it in scripts/data/cmVarRates.json, wider by BANDS.headroom on each side.
         The engine aims at the LOW end of each range (the stricter reading), so the low edge is the one that
         works; the headroom is what the fleet's own sampling was measured to need, see BANDS. */
      async bands() {
        const d = derive();
        assert.equal(d.engine.provisional, false, 'The engine figures the rates are derived from are measured, not provisional');
        const real = (await bundle(changed[engine], changed[helper], 'bands', changed[rates]))();
        const shipped = real.CM_VAR_GAME_RATES;
        assert.equal(shipped.penaltyScores, real.SHOOTOUT_BASE_RATE, 'A penalty a review awards is taken under the engine penalty law, not under a rate of its own');
        assert.equal(shipped.penaltyOnTarget, d.law.onTarget, 'A missed review penalty is on target as often as the engine penalty law says');
        const seeds = (process.env.CM_VAR_BANDS_SEEDS || BANDS.seeds).split(',').map(Number);
        assert.ok(seeds.length >= 5, 'The fleet plays at least five seeds');
        const fleet = playFleet(real, { seeds, paired: true });
        const L = fleet.byKind.league, per = n => n / L.matches;
        const ruled = per(L.ruledOut), awarded = per(L.penaltyAwarded), gap = (L.goals - L.goalsOff) / L.matches;
        const r4 = x => Number(x.toFixed(4));
        metrics.bands = { seeds, leagueMatches: L.matches, ruledOut: L.ruledOut, ruledOutPerMatch: r4(ruled), awarded: L.penaltyAwarded, awardedPerMatch: r4(awarded), awardedScored: L.awardedScored,
          goalConfirmed: L.goalConfirmed, penaltyConfirmed: L.penaltyConfirmed, goalsPerMatchOn: r4(per(L.goals)), goalsPerMatchOff: r4(per(L.goalsOff)), goalGap: r4(gap), resultMoved: L.resultMoved,
          penaltiesPerMatch: r4(per(L.penalties)), matchesWithReview: L.matchesWithReview,
          perSeed: fleet.perSeed.map(s => [s.matches, r4(s.ruledOut / s.matches), r4(s.penaltyAwarded / s.matches)]) };
        assert.ok(L.matches >= 3000, `The fleet played ${L.matches} league matches, fewer than 3,000`);
        const inside = (x, range) => x >= range.low * (1 - BANDS.headroom) && x <= range.high * (1 + BANDS.headroom);
        assert.ok(inside(ruled, d.goals), `Goals ruled out a match ${r4(ruled)} is outside real football's ${r4(d.goals.low)} to ${r4(d.goals.high)} (headroom ${BANDS.headroom})`);
        assert.ok(inside(awarded, d.pens), `Penalties awarded a match ${r4(awarded)} is outside real football's ${r4(d.pens.low)} to ${r4(d.pens.high)} (headroom ${BANDS.headroom})`);
        assert.equal(L.goalConfirmed + L.penaltyConfirmed, 0, `The game showed ${L.goalConfirmed} goal and ${L.penaltyConfirmed} penalty reviews that ended with the call standing, and no publisher counts those by kind of call`);
        assert.ok(Math.abs(gap) <= BANDS.goalGap, `Reviews moved goals a match by ${r4(gap)}, past the ${BANDS.goalGap} the family allows a rule to move them`);
      },
    };
    for (const [name, title] of Object.entries(titles)) {
      if (control && name !== controls[control].test && name !== 'baseline') { rows.push({ title, status: 'skipped' }); continue; }
      try { await outcomes[name](); rows.push({ title, status: 'passed' }); }
      catch (error) { rows.push({ title, status: 'failed', errorName: error.name, message: error.message, stack: error.stack }); }
    }
    await new Promise(resolve => setImmediate(resolve));
    await writeFile(path.join(evidence, `${control || 'normal'}-report.json`), JSON.stringify({ numUnhandledErrors: unhandled.length, unhandled, metrics, cases: rows }, null, 2));
    assert.deepEqual(unhandled, [], 'Import or runtime errors cannot receive control credit');
    if (control) {
      assert.deepEqual(rows.filter(r => r.status === 'failed').map(r => [r.title, r.errorName]), [[titles[controls[control].test], 'AssertionError']]);
      assert.deepEqual(rows.filter(r => r.status === 'passed').map(r => r.title), [titles.baseline]);
      assert.equal(rows.filter(r => r.status === 'skipped').length, Object.keys(titles).length - 2);
    } else {
      assert.deepEqual(rows.filter(r => r.status === 'failed'), []); assert.equal(rows.filter(r => r.status === 'passed').length, Object.keys(titles).length);
      await writeFile(path.join(evidence, 'native-fixtures.json'), JSON.stringify(Object.fromEntries(['disallowed', 'confirmed', 'penalty', 'awarded_scored', 'awarded_missed'].map(kind => [kind, findCmVarFixture(original, kind)]))));
    }
    if (control) console.log(`simCmVar ${control}: CAUGHT by "${String(rows.find(r => r.status === 'failed')?.message).split('\n')[0].slice(0, 220)}"`);
    if (metrics.bands) console.log(`simCmVar bands: ${JSON.stringify(metrics.bands)}`);
    if (metrics.coverage) console.log(`simCmVar coverage: ${JSON.stringify(metrics.coverage)}`);
    console.log(`simCmVar ${control || 'normal'}: actual review outcomes and full prior baseline passed.`);
  } finally {
    process.off('unhandledRejection', capture); process.off('uncaughtExceptionMonitor', capture);
    assert.equal(path.dirname(folder), parent); assert.ok(path.basename(folder).startsWith('cm-var-'));
    await rm(folder, { recursive: true, force: true });
    for (const [file, bytes] of Object.entries(sourceBytes)) assert.deepEqual(await readFile(path.join(root, file)), bytes, 'Original source bytes held');
  }
}
if (process.env.CM_VAR_FIXTURE_ONLY !== '1') await main();
