/* Review (run lens) of Round 1606, a remote check extra, never committed. Old saves: saves WRITTEN by the base
   engine (c0c66e087, built from git archive) at three points (mid season, after the season end with the vacancy
   list, after the summer) are LOADED by the branch engine and by the base engine and played on with one seed each;
   every loaded state and every save written after it must be the same bytes. Then the same base saves are loaded by
   the branch engine with a sentinel table (one real man per covered chair, as Round 1607 will ship) and played over
   the summer: no sentinel may be seated or spoken, because an old save's chairs are all filled. Exit 0 green. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { SENTINEL, ERAS, seeded, hashSeed, bundleEngine, baseTree, spoken, sentinelPlan, firstDiff } from '../../scripts/lib/cmDugoutSentinel.mjs';

const ROOT = process.cwd();
const BASE = process.env.OLD_BASE || 'c0c66e087';
const store = new Map();
globalThis.localStorage = {
  getItem: k => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(k, String(v)); },
  removeItem: k => { store.delete(k); },
  clear: () => { store.clear(); },
};
let fails = 0;
const fail = m => { fails += 1; if (fails <= 12) console.log(`   FAIL ${m}`); };
const refuse = why => { console.error(`oldSaveRun1606 cannot run: ${why}`); process.exit(2); };
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'oldsave-1606-'));
const nodeModules = path.join(ROOT, 'node_modules');
const base = baseTree(ROOT, BASE, tmp);
const B = await bundleEngine({ srcDir: base.src, tmp, name: 'base', nodeModules, refuse });
/* OLD_CONTROL=order: the branch engine writes a sacked chair's keys in another order, so every summer differs. */
const CONTROL = process.env.OLD_CONTROL === 'order'
  ? { from: 'record[s.club] = { name, since: state.season };', to: 'record[s.club] = { since: state.season, name };' } : null;
const C = await bundleEngine({ srcDir: path.join(ROOT, 'src'), tmp, name: 'cand', edit: CONTROL, nodeModules, refuse });
const plan = await sentinelPlan(C.cm);
const S = await bundleEngine({ srcDir: path.join(ROOT, 'src'), tmp, name: 'sent', table: plan.table, partial: plan.partial, nodeModules, refuse });
for (const era of ERAS) for (const E of [B, C, S]) await E.cm.ensureEraRosters(era);

const write = (E, state) => seeded(1, () => { store.clear(); E.cm.saveCareer(state); const out = store.get(E.cm.SAVE_KEY); store.clear(); return out; }).value;
const load = (E, bytes) => seeded(2, () => { store.clear(); store.set(E.cm.SAVE_KEY, bytes); const out = E.cm.loadCareer(); store.clear(); return out; }).value;

let saves = 0, compared = 0, sentinelLoads = 0, sentinelChairs = 0;
const t0 = Date.now();
for (const era of ERAS) {
  const defs = C.cm.worldLeagueDefs({ eraId: era });
  for (let k = 0; k < 6; k++) {
    const def = defs[(k * 3) % defs.length];
    const clubs = (era === 'now' ? C.cm.playableClubs(def.id) : C.cm.eraPlayableClubs(era, def.id)).map(c => c.name).sort();
    if (!clubs.length) continue;
    const club = clubs[(k * 5 + 1) % clubs.length];
    const seed = hashSeed(`old|${era}|${k}`);
    /* Built on both engines in lockstep (the engine numbers youth, press and messages with module counters, so the
       two bundles must run the same calls); the BASE engine's bytes are the old saves. */
    const build = E => {
      let s = seeded(seed, () => E.cm.startCareer(club, era)).value;
      for (let i = 0; i < 6; i++) s = seeded(seed + 10 + i, () => E.cm.playNextEntry(s, { skipHalftime: true })).value.state;
      const mid = write(E, s);
      const fin = seeded(seed + 50, () => E.cm.finishSeason(s).state).value;
      const end = write(E, fin);
      const next = seeded(seed + 60, () => E.cm.startNextSeason(fin)).value;
      return { mid, end, summer: write(E, next) };
    };
    const { mid, end, summer } = build(B);
    build(C);
    for (const [label, bytes] of [['mid season', mid], ['season end', end], ['summer', summer]]) {
      saves += 1;
      const lb = load(B, bytes), lc = load(C, bytes);
      compared += 1;
      if (!lb || !lc || JSON.stringify(lb) !== JSON.stringify(lc)) { fail(`${era} ${club} ${label}: the branch loads the base save differently`); continue; }
      /* Play on from the loaded save, one seed, on both engines. */
      const go = E => {
        let st = load(E, bytes);
        if (label === 'season end') return write(E, seeded(seed + 70, () => E.cm.startNextSeason(st)).value);
        for (let i = 0; i < 3; i++) st = seeded(seed + 80 + i, () => E.cm.playNextEntry(st, { skipHalftime: true })).value.state;
        const f2 = seeded(seed + 90, () => E.cm.finishSeason(st).state).value;
        return write(E, seeded(seed + 91, () => E.cm.startNextSeason(f2)).value);
      };
      compared += 1;
      const gb = go(B), gc = go(C);
      if (gb !== gc) {
        fail(`${era} ${club} ${label}: played on from the base save, the branch writes different bytes`);
        if (fails <= 3) console.log(`      first difference: ${firstDiff(JSON.parse(gb), JSON.parse(gc))}`);
      }
      if (fails <= 1 && label === 'mid season') {
        const again = go(B), again2 = go(B);
        go(C); go(C);
        if (again !== again2) console.log(`      PROBE CHECK: the base engine played twice from one save differs from itself: ${firstDiff(JSON.parse(again), JSON.parse(again2))}`);
      }
      /* The sentinel engine (a filled table) on the same old save: nobody real is seated or spoken. */
      if (label === 'season end') {
        sentinelLoads += 1;
        const ls = load(S, bytes);
        if (!ls) { fail(`${era} ${club}: the sentinel engine could not load the base save`); continue; }
        if (JSON.stringify(ls.managers) !== JSON.stringify(lb.managers)) fail(`${era} ${club}: a filled table changed an old save's managers record on load`);
        const n = seeded(seed + 70, () => S.cm.startNextSeason(ls)).value;
        if (JSON.stringify(n.managers ?? {}).includes(SENTINEL)) fail(`${era} ${club}: a filled table seated a real man in an old save over the summer`);
        if (spoken(n).includes(SENTINEL)) fail(`${era} ${club}: a filled table made an old save speak a real name`);
        for (const L of plan.leagues.filter(x => x.era === era && ls.leagueClubs.includes(x.sentinel) && x.sentinel !== ls.clubName)) {
          sentinelChairs += 1;
          const v = S.cm.dugoutOf(ls, L.sentinel);
          if (!v || v.real || v.name === SENTINEL) fail(`${era} ${club}: the old save's chair at ${L.sentinel} shows ${JSON.stringify(v)}`);
        }
      }
    }
  }
}
console.log(`oldSaveRun1606: ${saves} base saves loaded on the branch, ${compared} comparisons, ${sentinelLoads} loaded under a filled sentinel table (${sentinelChairs} sentinel chairs read), ${fails} failures (${((Date.now() - t0) / 1000).toFixed(0)} s, base ${base.sha.slice(0, 9)})`);
if (saves < 60) { console.log(`oldSaveRun1606: only ${saves} saves, floor 60`); process.exit(1); }
console.log(fails ? `oldSaveRun1606: ${fails} failure(s)` : 'oldSaveRun1606: all green');
process.exit(fails ? 1 : 0);
