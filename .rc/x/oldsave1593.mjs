// Reviewer probe for Round 1593 old saves (a runner only, sent as .rc/x/oldsave1593.mjs). No network, clock held.
//   O1 a BASE save at the end of season one, loaded by the HEAD: finishSeason, startNextSeason, the whole season two.
//   O2 a BASE save in the middle of season two (a watcher there), loaded by the HEAD: it must stay a watcher (no `me`,
//      no night) to the season's end, then the rollover to season three plays iff earned, and season three plays out.
//   O3 (critic advice 18, a release rollback) a HEAD save in the middle of a participant season two, loaded by the
//      BASE: the rest of the season, finishSeason, startNextSeason, on the base. Reports whether it throws.
// Prints one line per save and a closing line; exit 1 when anything throws or an O1/O2 check fails, else 0.
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const { engineOf, tape } = await import(path.join(ROOT, 'scripts/lib/worldUclFleet.mjs'));
const cannot = why => { console.log(`oldsave1593: could not run. ${why}`); process.exit(2); };
const BASE = '14a9af704';
const B = await engineOf(ROOT, 'base', { base: BASE }, cannot);
const H = await engineOf(ROOT, 'head', {}, cannot);
const opts = { skipHalftime: true, noCoach: true };
const CLUBS = (process.env.OLD_CLUBS || 'Aston Villa,Lazio,Eintracht Frankfurt,Lyon,Braga,Rangers,Real Sociedad,AZ Alkmaar').split(',');
const SEEDS = (process.env.OLD_SEEDS || '1,2,3').split(',').map(Number);
const fails = [];
const tally = { o1: 0, o1play: 0, o2: 0, o2play: 0, o3: 0, o3threw: 0, uelNightsBase: 0 };
let k = 0;
const T = (seed, fn) => { k += 1; return tape((seed * 0x9e3779b1 + k * 7919) >>> 0, fn).value; };
const save = (M, s) => { M.store.clear(); if (!M.cm.saveCareer(s)) throw new Error('saveCareer refused'); return [...M.store.entries()]; };
const load = (M, items) => { M.store.clear(); for (const [a, b] of items) M.store.set(a, b); const s = M.cm.loadCareer(); if (!s) throw new Error('loadCareer gave nothing'); return s; };
function toEnd(M, s, seed, stopAt = Infinity) {
  for (let i = 0; i < 400 && s.week < s.calendar.length && s.week < stopAt; i += 1) s = T(seed, () => M.cm.playNextEntry(s, opts)).state;
  return s;
}
const nUel = s => (s.calendar ?? []).filter(e => e.type === 'uel').length;
function seasonCheck(M, s, where) {
  // s at its season's end (week == calendar length), a participant: every night recorded, a winner crowned.
  const slice = s.worldComps?.uel;
  const res = M.cm.evalWorldComp(s, 'uel', Infinity);
  const played = (s.resultLog ?? []).filter(r => r.competition === 'uel').length;
  const rec = Object.keys(slice?.mine ?? {}).length;
  if (!res?.done || !res.winner) fails.push(`${where}: no winner`);
  if (played !== rec) fails.push(`${where}: ${played} nights in the log, ${rec} recorded`);
  if (!(res?.table ?? []).every(r => r.w + r.d + r.l === 8)) fails.push(`${where}: a club short of 8 league phase games`);
  return `${played} nights, ${M.cm.uelRunWords(s)}, winner ${res?.winner}`;
}
for (const club of CLUBS) for (const seed of SEEDS) {
  const where = `${club} seed ${seed}`;
  try {
    const MB = await B.fresh();
    let b = T(seed, () => MB.cm.startCareer(club));
    b = toEnd(MB, b, seed);
    const p1 = save(MB, b);
    let b2 = T(seed, () => MB.cm.startNextSeason(T(seed, () => MB.cm.finishSeason(b)).state));
    const earnedBase = b2.worldComps?.uel ? null : null; void earnedBase;
    b2 = toEnd(MB, b2, seed, 12);
    const p2 = save(MB, b2);
    // O1
    const MH = await H.fresh();
    let h = load(MH, p1);
    const fin = T(seed, () => MH.cm.finishSeason(h));
    h = T(seed, () => MH.cm.startNextSeason(fin.state));
    const earned = h.worldComps?.uel?.earned ?? null;
    const plays = h.worldComps?.uel?.me === h.clubName;
    if (plays !== ['L', 'C', 'P'].includes(earned)) fails.push(`${where} O1: plays ${plays}, earned ${earned}`);
    if (plays && nUel(h) !== 17) fails.push(`${where} O1: ${nUel(h)} nights`);
    tally.o1 += 1;
    let line = `O1 ${where}: season two ${plays ? `PLAYS (${earned})` : `watches (${earned})`}`;
    if (plays) {
      tally.o1play += 1;
      const mid = toEnd(MH, h, seed, 20);
      h = toEnd(MH, mid, seed);
      line += `, ${seasonCheck(MH, h, `${where} O1`)}`;
      // O3: a head save in the middle of that participant season, loaded by the base.
      tally.o3 += 1;
      try {
        const MB3 = await B.fresh();
        let r = load(MB3, save(MH, mid));
        r = toEnd(MB3, r, seed);
        const n3 = T(seed, () => MB3.cm.startNextSeason(T(seed, () => MB3.cm.finishSeason(r)).state));
        tally.uelNightsBase += nUel(n3);
        line += ` | O3 base loads and plays on: week ${r.week}/${r.calendar.length}, next season ${n3.season} with ${nUel(n3)} uel entries`;
      } catch (e) { tally.o3threw += 1; line += ` | O3 THREW on the base: ${String(e).slice(0, 160)}`; }
    }
    console.log(line);
    // O2
    const MH2 = await H.fresh();
    let h2 = load(MH2, p2);
    if (h2.worldComps?.uel?.me || nUel(h2)) fails.push(`${where} O2: a base mid season save plays the Europa League at load`);
    h2 = toEnd(MH2, h2, seed);
    if (h2.worldComps?.uel?.me || nUel(h2)) fails.push(`${where} O2: a base mid season save plays the Europa League by its season end`);
    const h3 = T(seed, () => MH2.cm.startNextSeason(T(seed, () => MH2.cm.finishSeason(h2)).state));
    const e3 = h3.worldComps?.uel?.earned ?? null;
    const p3 = h3.worldComps?.uel?.me === h3.clubName;
    if (p3 !== ['L', 'C', 'P'].includes(e3)) fails.push(`${where} O2: season three plays ${p3}, earned ${e3}`);
    tally.o2 += 1;
    let l2 = `O2 ${where}: stays a watcher, season three ${p3 ? `PLAYS (${e3})` : `watches (${e3})`}`;
    if (p3) { tally.o2play += 1; l2 += `, ${seasonCheck(MH2, toEnd(MH2, h3, seed), `${where} O2 s3`)}`; }
    console.log(l2);
  } catch (e) { fails.push(`${where}: THREW ${String(e.stack || e).slice(0, 300)}`); }
}
for (const f of fails.slice(0, 30)) console.log(`  FAIL ${f}`);
console.log(`oldsave1593: ${JSON.stringify(tally)}; ${fails.length ? `RED, ${fails.length} failures` : 'green'}`);
process.exit(fails.length ? 1 : 0);
