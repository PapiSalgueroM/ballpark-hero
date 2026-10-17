// Round 1502 probe (never committed; the critic's advice 22): what the watched Champions League costs the dailies at
// runtime. Hot Seat and Deadline Day call startCareer once a load, and for a club that watches it now opens the
// season's competition (the 36, the strengths, the 1228 slate search) before the daily strips it. Times
// startHotSeat and startDeadlineDay on the base engine and on this tree for simDailyDeals' twelve and six dates,
// each date five times on a fresh context (the first call of a context also pays for the module's caches, so the
// median of the last four is printed beside the first). Run from the repo root: node .rc/x/dailyTime1502.mjs <base>
import path from 'node:path';
import { engineOf, tape } from '../../scripts/lib/worldUclFleet.mjs';

const ROOT = process.cwd();
const BASE = process.argv[2];
const HOT = ['2026-10-10', '2026-10-11', '2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-27', '2026-11-14', '2027-01-19', '2027-01-30', '2027-02-06'];
const DEADLINE = ['2026-10-10', '2026-10-11', '2026-10-12', '2026-10-18', '2026-11-01', '2026-11-09'];
const cannot = why => { console.log(`dailyTime1502: cannot run: ${why}`); process.exit(2); };
const engines = { base: await engineOf(ROOT, 'base', { base: BASE }, cannot), tree: await engineOf(ROOT, 'tree', {}, cannot) };
const median = xs => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
const out = [];
for (const [kind, dates] of [['hot', HOT], ['deadline', DEADLINE]]) {
  for (const date of dates) {
    const row = { kind, date };
    for (const [name, E] of Object.entries(engines)) {
      const M = await E.fresh();
      const times = [];
      let watches = null;
      for (let i = 0; i < 5; i += 1) {
        const t0 = process.hrtime.bigint();
        const run = tape(7 + i, () => (kind === 'hot'
          ? (() => { const s = M.hs.dailyHotSeat(date); return M.hs.startHotSeat({ club: s.club, seed: s.seed, daily: date }); })()
          : M.dd.startDeadlineDay(M.dd.dailyDeadlineDay(date)))).value;
        times.push(Number(process.hrtime.bigint() - t0) / 1e6);
        watches = run.state.uclGroup === null;
      }
      row[name] = { first: times[0], rest: median(times.slice(1)), watches };
    }
    out.push(row);
    console.log(`${kind.padEnd(8)} ${date}: base first ${row.base.first.toFixed(0)} ms, then ${row.base.rest.toFixed(0)} ms; tree first ${row.tree.first.toFixed(0)} ms, then ${row.tree.rest.toFixed(0)} ms; watches ${row.tree.watches}`);
  }
}
const sum = (k, f) => out.filter(r => r.kind === k).reduce((s, r) => s + f(r), 0) / out.filter(r => r.kind === k).length;
for (const k of ['hot', 'deadline']) console.log(`${k}: mean of the medians, base ${sum(k, r => r.base.rest).toFixed(0)} ms, tree ${sum(k, r => r.tree.rest).toFixed(0)} ms; first call base ${sum(k, r => r.base.first).toFixed(0)} ms, tree ${sum(k, r => r.tree.first).toFixed(0)} ms`);
console.log(`dailyTime1502: measured ${out.length} dates on ${path.basename(BASE)} and this tree`);
