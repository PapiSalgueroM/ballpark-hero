/* Release BL triage, runner only, never committed. One journey of proofWorldUclFleet replayed on the BASE and on
   THIS TREE exactly as the gate line plays it (tree: the 1510 super cup nights edit, worldComps.dsc left out of the
   compared state; --eval on the tree), stopping at the first step whose compared JSON differs, and printing what
   differs there: every key whose value differs, and where worldComps stands among the state's keys on each side.
   Usage (repo root): node .rc/x/keyOrderProbe.mjs <base> <club> <participants|watchers> <coach|nocoach> <seed>
   Exit 0 once it ran (a probe, not a check); 2 when it cannot run. */
import path from 'node:path';
import { engineOf, pickFleet, tape } from '../../scripts/lib/worldUclFleet.mjs';
import { DSC_NIGHTS_EDIT } from '../../scripts/lib/oneOffNights1510.mjs';

const [BASE, CLUB, FLEET, MODE, SEED] = process.argv.slice(2);
const cannot = why => { console.log(`keyOrderProbe: CANNOT RUN: ${why}`); process.exit(2); };
if (!BASE || !CLUB || !FLEET || !MODE || !SEED) cannot('usage: <base> <club> <fleet> <mode> <seed>');
const ROOT = path.resolve(process.cwd());
const baseE = await engineOf(ROOT, 'base', { base: BASE }, cannot);
const treeE = await engineOf(ROOT, 'tree', { edits: [DSC_NIGHTS_EDIT] }, cannot);
const f0 = pickFleet(await treeE.fresh(), FLEET, cannot).find(x => x.club === CLUB);
if (!f0) cannot(`no ${CLUB} in the ${FLEET} fleet`);
const f = { ...f0, seed: Number(SEED) };
const seasons = f.kind === 'participant' ? 2 : 3;

async function run(E, isTree) {
  const M = await E.fresh();
  const out = []; let s = null; let k = 0;
  const opts = MODE === 'coach' ? { skipHalftime: true } : { skipHalftime: true, noCoach: true };
  const step = (label, fn) => {
    k += 1;
    const r = tape((f.seed * 0x9e3779b1 + k * 7919) >>> 0, () => {
      const o = fn(s);
      if (isTree && o?.state) {
        M.cm.evalWorldUcl(o.state); M.cm.worldUclNightsDone(o.state);
        if (M.cm.evalWorldComp) { M.cm.evalWorldComp(o.state, 'uel'); M.cm.worldCompNightsDone(o.state, 'uel'); }
      }
      return o;
    });
    if (r.value?.state) s = r.value.state;
    let shown = s;
    if (isTree && s && s.worldComps && 'dsc' in s.worldComps) {
      shown = { ...s, worldComps: { ...s.worldComps } }; delete shown.worldComps.dsc;
      if (!Object.keys(shown.worldComps).length) delete shown.worldComps;
    }
    out.push({ label, json: JSON.stringify(shown) });
  };
  const reload = label => step(label, cur => { M.store.clear(); M.cm.saveCareer(cur); return { state: M.cm.loadCareer() }; });
  step('start', () => ({ state: f.custom ? M.cm.startCareer(f.club, f.era, f.custom) : M.cm.startCareer(f.club, f.era) }));
  for (let season = 1; season <= seasons; season += 1) {
    let over = false;
    for (let i = 0; i < 240 && !over; i += 1) {
      step(`s${season}-e${i + 1}`, cur => { const r = M.cm.playNextEntry(cur, opts); over = r.kind === 'seasonOver'; return { state: r.state }; });
      if (i === 20) reload(`s${season}-reload`);
    }
    step(`s${season}-finish`, cur => ({ state: M.cm.finishSeason(cur).state }));
    if (season < seasons) { step(`s${season}-rollover`, cur => ({ state: M.cm.startNextSeason(cur) })); reload(`s${season}-rolled-reload`); }
  }
  return out;
}

const a = await run(baseE, false);
const b = await run(treeE, true);
console.log(`keyOrderProbe: base ${BASE}; ${CLUB} (${f.era}, ${f.kind}, ${MODE}, seed ${SEED}); ${a.length} and ${b.length} steps`);
const i = a.findIndex((x, j) => !b[j] || x.json !== b[j].json);
if (i < 0) { console.log('keyOrderProbe: every step equal'); process.exit(0); }
const A = JSON.parse(a[i].json), B = JSON.parse(b[i].json);
const ka = Object.keys(A), kb = Object.keys(B);
const valueKeys = [...new Set([...ka, ...kb])].filter(key => JSON.stringify(A[key]) !== JSON.stringify(B[key]));
console.log(`first difference at step ${i} ${a[i].label} (tree ${b[i]?.label}): keys ${ka.length} and ${kb.length}; keys whose value differs: [${valueKeys.join(', ')}]`);
console.log(`worldComps: base at ${ka.indexOf('worldComps')} of ${ka.length} ${JSON.stringify(Object.keys(A.worldComps ?? {}))}, tree at ${kb.indexOf('worldComps')} of ${kb.length} ${JSON.stringify(Object.keys(B.worldComps ?? {}))}`);
const firstPart = ka.findIndex((key, j) => key !== kb[j]);
console.log(`key order parts at index ${firstPart}: base ${ka.slice(firstPart, firstPart + 3).join(',')} tree ${kb.slice(firstPart, firstPart + 3).join(',')}`);
const prev = i > 0 ? `${a[i - 1].label} equal` : 'none';
console.log(`step before: ${prev}; uclGroup ${B.uclGroup ? 'set' : 'null'}`);
