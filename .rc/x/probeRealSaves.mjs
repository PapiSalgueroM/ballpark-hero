/* fix2-1509 (closing check major 2): the brief's realSaves rule (section 1.5) evidenced without simCmBoardVerdict's
 * kit. Every Club Manager save scripts/lib/realSaves.mjs builds on the BASE tree, plus saves the BASE engine writes
 * mid season, at a paused season review, in season two and in two eras, loads to the same JSON on the head and on
 * the base, worldComps.uel aside; the head adds worldComps.uel only to a season one save of today's world; no loaded
 * save carries a 'euro' or 'uel' calendar entry; and a head load saved and loaded again is the same JSON.
 * Usage (repo root): node .rc/x/probeRealSaves.mjs <base checkout dir> [base ref, default 77556430]
 * PROBE_CONTROL=leak edits the head's loadCareer so the uel repair also moves boardConfidence: must exit 1, FIRED.
 * Never committed. */
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const BASE_DIR = process.argv[2];
const BASE_REF = process.argv[3] || '77556430';
const CONTROL = process.env.PROBE_CONTROL || '';
const cannot = why => { console.log(`probeRealSaves: cannot run: ${why}`); process.exit(2); };
if (!BASE_DIR) cannot('no base checkout given');
const { engineOf, tape } = await import(pathToFileURL(path.join(ROOT, 'scripts/lib/worldUclFleet.mjs')).href);
const REPAIR = "    repairWorldComp(parsed, 'uel');\n";
const edits = CONTROL === 'leak' ? [{ file: 'src/lib/clubManager.ts', from: REPAIR, to: `${REPAIR}    if (parsed.worldComps?.uel) parsed.boardConfidence = (parsed.boardConfidence ?? 50) + 1;\n` }] : [];
if (CONTROL && CONTROL !== 'leak') cannot(`unknown control ${CONTROL}`);
const H = await engineOf(ROOT, 'rshead', { edits }, cannot);
const B = await engineOf(ROOT, 'rsbase', { base: BASE_REF }, cannot);

/* 1. realSaves on the base tree, exactly as simCmBoardVerdict's saves section builds them. */
const { buildRealSaves } = await import(pathToFileURL(path.join(ROOT, 'scripts/lib/realSaves.mjs')).href);
const built = await buildRealSaves({ root: BASE_DIR, tmpDir: path.join('/tmp', `rs-${Date.now()}`), seeds: [0, 1, 2, 3] });
const raws = (built.fleet['/club-manager'] ?? []).map((r, i) => [`realSaves seed ${i}`, r]);
if (raws.length !== 4) cannot(`realSaves built ${raws.length} Club Manager saves, not 4`);

/* 2. Saves the base engine writes at other moments of a career. */
const opts = { skipHalftime: true, noCoach: true };
const BM = await B.fresh();
const saveOf = s => { BM.store.clear(); if (!BM.cm.saveCareer(s)) cannot('the base engine refused to save'); return BM.store.get(BM.cm.SAVE_KEY); };
let k = 0;
const next = s => tape(0x1509 + (k += 1), () => BM.cm.playNextEntry(s, opts)).value;
for (const [club, era] of [['Real Madrid', null], ['Everton', null], ['Lincoln City', null], ['Brentford', null], ['Liverpool', null], ['Everton', 'era2005'], ['Barcelona', 'era2015']]) {
  let s = tape(0x2509 + (k += 1), () => (era ? BM.cm.startCareer(club, era) : BM.cm.startCareer(club))).value;
  const tag = `${club} (${era ?? 'now'})`;
  for (let i = 0; i < 20; i += 1) s = next(s).state;
  raws.push([`${tag} season 1 week ${s.week}`, saveOf(s)]);
  if (era) continue;
  let over = false;
  for (let i = 0; i < 300 && !over; i += 1) { const r = next(s); s = r.state; over = r.kind === 'seasonOver'; }
  if (!over) cannot(`${tag} season one did not end`);
  const fin = tape(0x3509 + (k += 1), () => BM.cm.finishSeason(s)).value.state;
  raws.push([`${tag} paused review`, saveOf(fin)]);
  let s2 = tape(0x4509 + (k += 1), () => BM.cm.startNextSeason(fin)).value;
  for (let i = 0; i < 4; i += 1) s2 = next(s2).state;
  raws.push([`${tag} season ${s2.season} week ${s2.week}`, saveOf(s2)]);
}

/* 3. Load each on both engines. */
const strip = st => {
  if (!st?.worldComps?.uel) return st;
  const rest = { ...st.worldComps }; delete rest.uel;
  const out = { ...st, worldComps: rest };
  if (!Object.keys(rest).length) delete out.worldComps;
  return out;
};
const firstKeys = (a, b) => [...new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {})])].filter(x => JSON.stringify(a?.[x]) !== JSON.stringify(b?.[x])).slice(0, 4).join(', ') || 'the key order';
const load = async (E, raw) => { const M = await E.fresh(); M.store.set(M.cm.SAVE_KEY, raw); return { M, s: M.cm.loadCareer() }; };
let bad = 0, gained = 0, differ = 0;
const fail = msg => { bad += 1; console.log(`FAIL ${msg}`); };
for (const [tag, raw] of raws) {
  const h = await load(H, raw), b = await load(B, raw);
  if (!h.s || !b.s) { fail(`${tag}: a load answered null (head ${!!h.s}, base ${!!b.s})`); continue; }
  if (b.s.worldComps?.uel) fail(`${tag}: the base load carries worldComps.uel`);
  const era = h.M.eras.isHistoricEra(h.s.eraId);
  if (h.s.worldComps?.uel) { gained += 1; if (era || h.s.season !== 1) fail(`${tag}: the head added a Europa League to a save that is not season one of today's world`); }
  else if (!era && h.s.season === 1) console.log(`  note ${tag}: season one of today's world, no Europa League after the load`);
  if ((h.s.calendar ?? []).some(e => e.type === 'euro' || e.type === 'uel')) fail(`${tag}: the head's load carries a European calendar entry`);
  const A = JSON.stringify(strip(h.s)), Z = JSON.stringify(b.s);
  if (A !== Z) { differ += 1; fail(`${tag}: head and base load to different JSON, worldComps.uel aside (${firstKeys(JSON.parse(A), JSON.parse(Z))})`); }
  /* Saved and loaded again on its own engine: the head's must stand still wherever the base's does. */
  const twice = M => { const first = M.s; M.M.store.clear(); if (!M.M.cm.saveCareer(first)) return 'refused'; const again = M.M.cm.loadCareer(); return JSON.stringify(again) === JSON.stringify(first) ? '' : firstKeys(again, first); };
  const movedH = twice(h), movedB = twice(b);
  if (movedH && !movedB) fail(`${tag}: the head's load saved and loaded again moved (${movedH}), the base's did not`);
  else if (movedH) console.log(`  note ${tag}: a second load moves on both engines (head ${movedH}, base ${movedB})`);
}
console.log(`probeRealSaves: ${raws.length} saves written by ${BASE_REF} (4 from realSaves), ${gained} gained a Europa League at the head's load, ${differ} differ but for worldComps.uel, ${bad} failures`);
if (CONTROL) {
  if (differ > 0) { console.log(`probeRealSaves: control ${CONTROL} FIRED (${differ} saves differ)`); process.exit(1); }
  console.log(`probeRealSaves: control ${CONTROL} DID NOT FIRE`); process.exit(3);
}
console.log(bad === 0 ? 'probeRealSaves: GREEN' : 'probeRealSaves: RED');
process.exit(bad === 0 ? 0 : 1);
