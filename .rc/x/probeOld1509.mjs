/* Review of Round 1509 (the run lens): old saves. Saves written by MAIN's engine (77556430) at several points of
 * several careers are loaded by the head's engine and by main's: equal on every key but worldComps.uel, the
 * Champions League slice equal; the Europa League gained at load only in season one of today's world; then both
 * play ten more entries on one stream: equal on every key but worldComps.uel, draws equal. Never committed. */
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const { engineOf, tape, CREATED } = await import(pathToFileURL(path.join(ROOT, 'scripts/lib/worldUclFleet.mjs')).href);
const cannot = why => { console.log(`probe: cannot run: ${why}`); process.exit(2); };
const H = await engineOf(ROOT, 'phead', {}, cannot);
const B = await engineOf(ROOT, 'pbase', { base: process.env.OLD_BASE || '77556430' }, cannot);
const opts = { skipHalftime: true, noCoach: true };
const aside = st => JSON.stringify(st, (k, v) => (k === 'worldComps' && v && typeof v === 'object' ? { ...v, uel: undefined } : v));
const dropEmpty = s => s.replace(/,?"worldComps":\{\}/g, '');
let loaded = 0, gained = 0, fails = 0, continued = 0;
const fail = m => { fails += 1; console.log(`FAIL ${m}`); };
const CAREERS = [
  ['Chelsea', null], ['Liverpool', null], ['Everton', null], ['Real Madrid', null], ['Celtic', null], ['LA Galaxy', null],
  ['created', null], ['Villarreal', 'era2005'], ['Arsenal', 'era2015'],
];
const POINTS = [0, 9, 26, 'end', 's2-4'];
for (const [club, era] of CAREERS) for (const seed of [3, 7]) {
  const M = await B.fresh();
  let s;
  try {
    s = tape(seed, () => (club === 'created' ? M.cm.startCareer(CREATED.name, undefined, CREATED) : era ? M.cm.startCareer(club, era) : M.cm.startCareer(club))).value;
  } catch (e) { console.log(`skip ${club}: ${e.message.slice(0, 80)}`); continue; }
  let i = 0;
  const step = St => tape(seed * 1000 + i, () => St.cm.playNextEntry(s, opts)).value;
  for (const p of POINTS) {
    if (p === 'end') { while (s.week < s.calendar.length && i < 400) { s = step(M).state; i += 1; } }
    else if (p === 's2-4') { if (era) break; s = tape(seed * 1000 + 999, () => M.cm.startNextSeason(s)).value; for (let k = 0; k < 4; k += 1) { s = step(M).state; i += 1; } }
    else while (i < p && s.week < s.calendar.length) { s = step(M).state; i += 1; }
    M.store.clear();
    if (!M.cm.saveCareer(s)) { fail(`${club} ${seed} at ${p}: main refused to save`); continue; }
    const raw = [...M.store.entries()];
    const Th = await H.fresh(); const Tb = await B.fresh();
    for (const [k, v] of raw) { Th.store.set(k, v); Tb.store.set(k, v); }
    const lh = Th.cm.loadCareer(); const lb = Tb.cm.loadCareer();
    loaded += 1;
    const name = `${club}${era ? ` (${era})` : ''} seed ${seed} at ${p} (season ${lb?.season}, week ${lb?.week})`;
    if (!lh || !lb) { fail(`${name}: did not load (head ${!!lh}, main ${!!lb})`); continue; }
    if (dropEmpty(aside(lh)) !== dropEmpty(aside(lb))) fail(`${name}: loads otherwise on the head`);
    const want = !era && lh.season === 1 && lh.week < lh.calendar.length;
    if (!!lh.worldComps?.uel !== want) fail(`${name}: ${lh.worldComps?.uel ? 'gained' : 'did not gain'} a Europa League`);
    if (lh.worldComps?.uel) gained += 1;
    if (JSON.stringify(lh.worldComps?.ucl ?? null) !== JSON.stringify(lb.worldComps?.ucl ?? null)) fail(`${name}: another Champions League slice`);
    if (Object.keys(lh.worldComps ?? {}).join() !== (lh.worldComps?.ucl ? (lh.worldComps?.uel ? 'ucl,uel' : 'ucl') : (lh.worldComps?.uel ? 'uel' : ''))) fail(`${name}: keys ${Object.keys(lh.worldComps ?? {}).join()}`);
    /* Ten more entries on each, one stream. */
    let a = lh, b = lb, da = [], db = [];
    for (let k = 0; k < 10 && a.week < a.calendar.length; k += 1) {
      const ra = tape(77 + k, () => Th.cm.playNextEntry(a, opts)); const rb = tape(77 + k, () => Tb.cm.playNextEntry(b, opts));
      a = ra.value.state; b = rb.value.state; da.push(...ra.draws); db.push(...rb.draws);
    }
    continued += 1;
    if (da.length !== db.length || da.some((d, n) => d !== db[n])) fail(`${name}: the draws of ten more entries differ (${da.length} against ${db.length})`);
    if (dropEmpty(aside(a)) !== dropEmpty(aside(b))) fail(`${name}: ten entries on, the state differs on the head`);
  }
}
console.log(`PROBE OLD: ${loaded} old saves loaded, ${gained} gained a Europa League, ${continued} continued; ${fails} failures`);
process.exit(fails ? 1 : 0);
