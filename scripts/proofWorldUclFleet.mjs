/* Round 1502 (with Round 1347's E2): the round time proof that the world's Champions League moves nothing it must
   not move. NOT a suite harness (its name does not start with sim, so runAllSims never runs it): it compares this
   tree's engine with a BASE commit's, so it is run by hand at each step against the commit the branch started from
   and again against each merge base, and its runner result names go in the round's notes.

   Two engines are bundled: BASE (every src file read through git show <base>) and THIS TREE (the files on disk).
   Each journey runs in a fresh vm context on both, one save through whole seasons: startCareer, every
   playNextEntry to the end of the season, finishSeason, startNextSeason, with a save and reload through
   saveCareer and loadCareer in the middle of every season and after every rollover. Every step draws from its own
   stretch of one counter stream, the same on both engines, and every draw is kept. After every step the two
   states must be the same JSON BYTES (JSON.stringify of the whole save: key order and undefined keys count, the
   critic's correction 7c) and the draws the same count and the same values; a reload must write the same bytes.

   THE FLEETS (picked by the engine's own answer and printed): participants, startCareer(...).uclGroup set: today's
   world Real Madrid and Arsenal, and one club of each era (2005, 2010, 2015, 2020). Watchers, uclGroup null:
   today's world Chelsea, Hoffenheim (the fill case), Everton, a Liga MX club and a created club, and one club of
   each era. Seeds 1 to 5. Participants play two seasons, watchers three. Each journey runs with the coach and
   with noCoach.

   Options: --base <commit> (required), --fleet participants|watchers|all (all), --coach coach|nocoach|both (both),
   --seeds 1,2,3 (1 to 5), --seasons <n> (participants 2, watchers 3), --only <substring of a club name>,
   --strip <key> (watchers only: that key of THIS TREE's state is left out of the comparison, never out of the
   save it plays on; from Round 1502's E3 the watchers are compared with --strip worldComps, and the participants
   always on every key, with a check that none of their states carries worldComps), --eval (THIS TREE calls
   evalWorldUcl and worldUclNightsDone on the live state after every step, inside that step's stretch of the
   stream, the way the screen will: the critic's correction 6b, so an evaluation that drew from Math.random or
   wrote into the save shows as a difference; the base has no such function and is left alone).
   Exit 0 green, 1 a difference (the first one of each journey printed), 2 could not run. The last line says which.
   Run: node scripts/proofWorldUclFleet.mjs --base d8aaa4cb --fleet participants --coach nocoach */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { engineOf, pickFleet, tape } from './lib/worldUclFleet.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (name, dflt) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : dflt; };
const cannot = why => { console.log(`proofWorldUclFleet: CANNOT RUN: ${why}`); process.exit(2); };
const BASE = arg('--base', '');
if (!BASE) cannot('no --base commit');
try { execFileSync('git', ['cat-file', '-e', `${BASE}^{commit}`], { cwd: ROOT, stdio: 'ignore' }); } catch { cannot(`the base ${BASE} is not in this clone`); }
const FLEET = arg('--fleet', 'all');
const COACH = arg('--coach', 'both');
const SEEDS = arg('--seeds', '1,2,3,4,5').split(',').map(Number);
const SEASONS = arg('--seasons', '');
const ONLY = arg('--only', '');
const STRIP = arg('--strip', '');
const EVAL = process.argv.includes('--eval');
const sha = v => createHash('sha256').update(typeof v === 'string' ? v : JSON.stringify(v)).digest('hex').slice(0, 16);

/* One journey of one save on one engine: every step on its own stretch of the stream. */
async function journey(E, f, seasons, mode, compareStrip, evalEach = false) {
  const M = await E.fresh();
  const steps = [];
  let s = null; let k = 0;
  const opts = mode === 'coach' ? { skipHalftime: true } : { skipHalftime: true, noCoach: true };
  const step = (label, fn) => {
    k += 1;
    const r = tape((f.seed * 0x9e3779b1 + k * 7919) >>> 0, () => {
      const out = fn(s);
      if (evalEach && out?.state) { M.cm.evalWorldUcl(out.state); M.cm.worldUclNightsDone(out.state); evals += 1; }
      return out;
    });
    const got = r.value ?? {};
    if (got.state) s = got.state;
    let shown = s;
    if (compareStrip && s && compareStrip in s) { shown = { ...s }; delete shown[compareStrip]; }
    steps.push({ label, json: JSON.stringify(shown), draws: r.draws.length, drawSha: sha(r.draws), saved: got.saved ?? null,
      carries: !!s && 'worldComps' in s });
  };
  const reload = label => step(label, cur => {
    M.store.clear();
    if (!M.cm.saveCareer(cur)) return { saved: 'refused' };
    const saved = sha([...M.store.entries()].sort());
    return { state: M.cm.loadCareer(), saved };
  });
  step('start', () => ({ state: f.custom ? M.cm.startCareer(f.club, f.era, f.custom) : M.cm.startCareer(f.club, f.era) }));
  for (let season = 1; season <= seasons; season += 1) {
    let over = false;
    for (let i = 0; i < 240 && !over; i += 1) {
      step(`s${season}-e${i + 1}`, cur => { const r = M.cm.playNextEntry(cur, opts); over = r.kind === 'seasonOver'; return { state: r.state }; });
      if (i === 20) reload(`s${season}-reload`);
    }
    if (!over) throw new Error(`season ${season} did not end in 240 entries`);
    step(`s${season}-finish`, cur => ({ state: M.cm.finishSeason(cur).state }));
    if (season < seasons) { step(`s${season}-rollover`, cur => ({ state: M.cm.startNextSeason(cur) })); reload(`s${season}-rolled-reload`); }
  }
  return steps;
}

function firstDifference(a, b) {
  const A = JSON.parse(a), B = JSON.parse(b);
  for (const key of [...new Set([...Object.keys(A ?? {}), ...Object.keys(B ?? {})])]) {
    const x = JSON.stringify(A?.[key]) ?? 'absent', y = JSON.stringify(B?.[key]) ?? 'absent';
    if (x === y) continue;
    let i = 0; while (i < x.length && x[i] === y[i]) i += 1;
    return `${key}: base ...${x.slice(Math.max(0, i - 40), i + 40)}... tree ...${y.slice(Math.max(0, i - 40), i + 40)}...`;
  }
  return 'the key order differs';
}

const baseEngine = await engineOf(ROOT, 'base', { base: BASE }, cannot);
const treeEngine = await engineOf(ROOT, 'tree', {}, cannot);
const fleet = pickFleet(await treeEngine.fresh(), FLEET, cannot);
const chosen = fleet.filter(f => !ONLY || f.club.includes(ONLY));
console.log(`base ${BASE}; fleet (${chosen.length}): ${chosen.map(f => `${f.club} (${f.era}, ${f.kind})`).join('; ')}`);
console.log(`seeds ${SEEDS.join(',')}; modes ${COACH}; strip ${STRIP || 'nothing'}`);

let journeys = 0, steps = 0, carriers = 0, evals = 0;
const fails = [];
const modes = COACH === 'both' ? ['nocoach', 'coach'] : [COACH];
const t0 = Date.now();
for (const f of chosen) {
  const seasons = SEASONS ? Number(SEASONS) : f.kind === 'participant' ? 2 : 3;
  for (const mode of modes) {
    for (const seed of SEEDS) {
      const t1 = Date.now();
      const name = `${f.club} (${f.era}, ${f.kind}, ${mode}, seed ${seed}, ${seasons} seasons)`;
      let a, b;
      try { a = await journey(baseEngine, { ...f, seed }, seasons, mode, ''); } catch (e) { cannot(`${name} on the base engine: ${e.message}`); }
      try { b = await journey(treeEngine, { ...f, seed }, seasons, mode, f.kind === 'watcher' ? STRIP : '', EVAL); } catch (e) { fails.push(`${name}: this tree threw: ${e.message}`); continue; }
      journeys += 1;
      let bad = '';
      for (let i = 0; i < Math.max(a.length, b.length) && !bad; i += 1) {
        const x = a[i], y = b[i];
        if (!x || !y || x.label !== y.label) { bad = `the steps part at ${i} (${x?.label} against ${y?.label})`; break; }
        const why = [];
        if (x.json !== y.json) why.push(`the state differs, ${firstDifference(x.json, y.json)}`);
        if (x.draws !== y.draws || x.drawSha !== y.drawSha) why.push(`the draws differ (${x.draws} against ${y.draws})`);
        if (x.saved !== y.saved && !(STRIP && f.kind === 'watcher')) why.push('the saved bytes differ');
        if (f.kind === 'participant' && y.carries) why.push('a participant state carries worldComps');
        if (why.length) bad = `at step ${i} ${x.label}: ${why.join('; ')}`;
      }
      steps += a.length;
      if (b.some(y => y.carries)) carriers += 1;
      if (bad) fails.push(`${name} ${bad}`.slice(0, 700));
      console.log(`${bad ? 'FAIL' : 'ok  '} ${name}: ${a.length} steps, ${((Date.now() - t1) / 1000).toFixed(1)} s`);
    }
  }
}
for (const x of fails.slice(0, 12)) console.log(`  FAIL ${x}`);
console.log(`journeys ${journeys}, steps compared ${steps}, tree journeys whose save carried worldComps ${carriers}, evaluations on the live state ${evals}, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
if (EVAL && !evals) cannot('--eval was asked for and no evaluation ran');
if (!journeys) cannot('no journey ran');
console.log(fails.length
  ? `proofWorldUclFleet: RED, ${fails.length} journeys differ from ${BASE} (of ${journeys})`
  : `proofWorldUclFleet: GREEN, ${journeys} journeys and ${steps} steps byte equal to ${BASE}${STRIP ? ` (watchers without ${STRIP})` : ''}, draws equal`);
process.exit(fails.length ? 1 : 0);
