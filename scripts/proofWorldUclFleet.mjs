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
   --strip <key> (that key of THIS TREE's state is left out of the comparison, never out of the save it plays on,
   at every step whose state is NOT in the Champions League (uclGroup null), in either fleet: a participant can
   miss Europe in a later season and watch it; every step whose state IS in it is compared on every key and
   fails if it carries worldComps; from Round 1502's E3 both fleets run with --strip worldComps; Round 1509: a dotted
   key, --strip worldComps.uel, takes that one key out of EVERY state, in it or not, and the object with it when it
   is left empty, so the Champions League slice is compared; the rule on a state in it reads worldComps.ucl),
   --eval (THIS TREE calls
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
import { HOLDER_EDIT } from './lib/worldUclHolder1502.mjs';
import { EURO_BOARD_EDIT, UEL_HOLDER_EDIT } from './lib/worldUelHolder1509.mjs';
import { DSC_NIGHTS_EDIT } from './lib/oneOffNights1510.mjs';

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
/* --old-saves (step E6): every save the BASE engine writes at a reload point is opened by a fresh context of each
   engine: this tree's must load it to the base's JSON with worldComps aside, and carry the key exactly when the
   load repair's rule says (not in the Champions League, a season not over, an era or season one of today's
   world), each counted and printed. */
const OLD_SAVES = process.argv.includes('--old-saves');
/* --holder-off (from step E5): THIS TREE plays with the holder line reverted (scripts/lib/worldUclHolder1502.mjs).
   Green with it is the attribution of E5 against the base: the one line reverted, every key but a watching state's
   worldComps is the base's. */
const HOLDER_OFF = process.argv.includes('--holder-off');
/* --uel-holder-off (Round 1509, step 6(b)): THIS TREE plays with the Europa League's winner kept out of the next
   Champions League (scripts/lib/worldUelHolder1509.mjs). Green with it against step 6(a) is that step's attribution:
   the one line reverted, the engine is the step before in every key. */
const UEL_HOLDER_OFF = process.argv.includes('--uel-holder-off');
/* --euro-board-off (Round 1509, step 6(a)): and the European rungs graded by position again. With both off and
   --strip worldComps.uel, the round's final tree is held to main in every other key (the round's final proof). */
const EURO_BOARD_OFF = process.argv.includes('--euro-board-off');
/* --dsc-nights-off (Round 1510): THIS TREE plays with a super cup participant's nights left off its calendar
   (scripts/lib/oneOffNights1510.mjs, the lead's decision 5 bridge). With --strip worldComps.dsc it holds the round's
   tree to the base on every other key, participants of the cup included. */
const DSC_NIGHTS_OFF = process.argv.includes('--dsc-nights-off');
const oldSaves = { loaded: 0, gained: 0, kept: 0, wrong: 0 };
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
      if (evalEach && out?.state) {
        M.cm.evalWorldUcl(out.state); M.cm.worldUclNightsDone(out.state); evals += 1;
        /* Round 1509 (the critic's 9(b)): and the Europa League, on the live state, when this tree has it. */
        if (M.cm.evalWorldComp) { M.cm.evalWorldComp(out.state, 'uel'); M.cm.worldCompNightsDone(out.state, 'uel'); }
      }
      return out;
    });
    const got = r.value ?? {};
    if (got.state) s = got.state;
    let shown = s;
    const watching = !!s && !s.uclGroup;
    const [top, sub] = compareStrip.split('.');
    if (compareStrip && sub && s && s[top] && sub in s[top]) {
      shown = { ...s, [top]: { ...s[top] } }; delete shown[top][sub];
      if (!Object.keys(shown[top]).length) delete shown[top];
    } else if (compareStrip && !sub && watching && compareStrip in s) { shown = { ...s }; delete shown[compareStrip]; }
    steps.push({ label, json: JSON.stringify(shown), draws: r.draws.length, drawSha: sha(r.draws), saved: got.saved ?? null, raw: got.raw ?? null,
      carries: !!s && 'worldComps' in s, carriesUcl: !!s && !!s.worldComps?.ucl, stripped: shown !== s, inIt: !!s && !!s.uclGroup });
  };
  const reload = label => step(label, cur => {
    M.store.clear();
    if (!M.cm.saveCareer(cur)) return { saved: 'refused' };
    const saved = sha([...M.store.entries()].sort());
    const raw = OLD_SAVES ? M.store.get(M.cm.SAVE_KEY) : null;
    return { state: M.cm.loadCareer(), saved, raw };
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
const treeEngine = await engineOf(ROOT, 'tree', { edits: [...(HOLDER_OFF ? [HOLDER_EDIT] : []), ...(UEL_HOLDER_OFF ? [UEL_HOLDER_EDIT] : []), ...(EURO_BOARD_OFF ? [EURO_BOARD_EDIT] : []), ...(DSC_NIGHTS_OFF ? [DSC_NIGHTS_EDIT] : [])] }, cannot);
const fleet = pickFleet(await treeEngine.fresh(), FLEET, cannot);
const chosen = fleet.filter(f => !ONLY || f.club.includes(ONLY));
console.log(`base ${BASE}; fleet (${chosen.length}): ${chosen.map(f => `${f.club} (${f.era}, ${f.kind})`).join('; ')}`);
console.log(`seeds ${SEEDS.join(',')}; modes ${COACH}; strip ${STRIP || 'nothing'}${HOLDER_OFF ? '; this tree with the holder line reverted' : ''}${UEL_HOLDER_OFF ? '; this tree with the Europa League holder line reverted' : ''}${EURO_BOARD_OFF ? '; this tree with the European rung line reverted' : ''}`);

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
      try { b = await journey(treeEngine, { ...f, seed }, seasons, mode, STRIP, EVAL); } catch (e) { fails.push(`${name}: this tree threw: ${e.message}`); continue; }
      journeys += 1;
      let bad = '';
      for (let i = 0; i < Math.max(a.length, b.length) && !bad; i += 1) {
        const x = a[i], y = b[i];
        if (!x || !y || x.label !== y.label) { bad = `the steps part at ${i} (${x?.label} against ${y?.label})`; break; }
        const why = [];
        if (x.json !== y.json) why.push(`the state differs, ${firstDifference(x.json, y.json)}`);
        if (x.draws !== y.draws || x.drawSha !== y.drawSha) why.push(`the draws differ (${x.draws} against ${y.draws})`);
        if (x.saved !== y.saved && !y.stripped) why.push('the saved bytes differ');
        if (y.inIt && y.carriesUcl) why.push('a state in the Champions League carries worldComps.ucl');
        /* Round 1509: against a base that carries worldComps too (a step of this round), the key is compared whole. */
        if (!STRIP && y.carries && !x.carries) why.push('a state carries worldComps and no --strip was asked for');
        if (why.length) bad = `at step ${i} ${x.label}: ${why.join('; ')}`;
      }
      if (OLD_SAVES) for (const x of a.filter(z => z.raw)) {
        const T = await treeEngine.fresh(); const B = await baseEngine.fresh();
        T.store.set(T.cm.SAVE_KEY, x.raw); B.store.set(B.cm.SAVE_KEY, x.raw);
        const lt = T.cm.loadCareer(); const lb = B.cm.loadCareer();
        oldSaves.loaded += 1;
        if (!lt || !lb) { fails.push(`${name} at ${x.label}: an old save did not load (tree ${!!lt}, base ${!!lb})`); continue; }
        const aside = st => JSON.stringify({ ...st, worldComps: undefined });
        if (aside(lt) !== aside(lb)) fails.push(`${name} at ${x.label}: an old save loads otherwise, ${firstDifference(aside(lb), aside(lt))}`.slice(0, 700));
        const historic = T.eras.isHistoricEra(lt.eraId);
        const should = !lt.uclGroup && lt.week < lt.calendar.length && (historic || lt.season === 1);
        const has = !!lt.worldComps?.ucl;
        /* Round 1509: a base from Round 1502 on writes saves that already follow a Champions League; such a save
           must load with the very slice the base's own load keeps, and only a save without one is held to the
           repair's rule. */
        const baseKeeps = !!lb.worldComps?.ucl;
        if (baseKeeps) {
          oldSaves.carried = (oldSaves.carried ?? 0) + 1;
          if (JSON.stringify(lt.worldComps?.ucl ?? null) !== JSON.stringify(lb.worldComps.ucl)) { oldSaves.wrong += 1; fails.push(`${name} at ${x.label}: an old save that follows a Champions League loads another one`); }
        } else {
          if (has) oldSaves.gained += 1; else oldSaves.kept += 1;
          if (has !== should) { oldSaves.wrong += 1; fails.push(`${name} at ${x.label}: an old save ${has ? 'gained' : 'did not gain'} a watched Champions League (${historic ? 'an era' : `season ${lt.season}`}, uclGroup ${lt.uclGroup ? 'set' : 'null'})`); }
        }
        /* Round 1509: and the Europa League, which no base save carries, is gained at load exactly where its repair
           says: season one of today's world, a season not over, in the Champions League or not. */
        if (!lb.worldComps?.uel) {
          const shouldUel = !historic && lt.season === 1 && lt.week < lt.calendar.length;
          const hasUel = !!lt.worldComps?.uel;
          if (hasUel) oldSaves.uelGained = (oldSaves.uelGained ?? 0) + 1;
          if (hasUel !== shouldUel && !(shouldUel && T.cm.worldCompField && !T.cm.worldCompField(lt, 'uel', null))) { oldSaves.wrong += 1; fails.push(`${name} at ${x.label}: an old save ${hasUel ? 'gained' : 'did not gain'} a Europa League (${historic ? 'an era' : `season ${lt.season}`})`); }
        }
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
if (OLD_SAVES) {
  console.log(`old saves (written by ${BASE}): ${oldSaves.loaded} loaded by both engines, ${oldSaves.gained} gained a watched Champions League at load, ${oldSaves.kept} did not, ${oldSaves.carried ?? 0} already followed one and kept it, ${oldSaves.uelGained ?? 0} gained a Europa League, ${oldSaves.wrong} against the rule`);
  if (!oldSaves.loaded || !(oldSaves.gained || oldSaves.carried)) cannot('--old-saves loaded no save, or none that the rule repairs or keeps');
}
if (!journeys) cannot('no journey ran');
console.log(fails.length
  ? `proofWorldUclFleet: RED, ${fails.length} journeys differ from ${BASE} (of ${journeys})`
  : `proofWorldUclFleet: GREEN, ${journeys} journeys and ${steps} steps byte equal to ${BASE}${STRIP ? ` (a watching state without ${STRIP})` : ''}, draws equal`);
process.exit(fails.length ? 1 : 0);
