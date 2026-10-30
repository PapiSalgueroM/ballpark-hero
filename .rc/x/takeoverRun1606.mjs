/* Review (run lens) of Round 1606, a remote check extra, never committed. The summer you TAKE a real man's chair.
   S = the branch engine with the sentinel table (simManagers' own plan); M = the same with the takeover line's real
   branch switched off (const displacedReal = false), the mutation simManagers stays green on. For every planned
   league and several seeds: finish season one, and for every offer from a club whose chair holds the sentinel and
   was not emptied, accept it (startNextSeason(fin, club), the way 7d moves) and read the feed's takeover line. Then
   the direct move into each sentinel chair. Prints what S and M write. Exit 0 when S never names the sentinel and the
   offer route was reached at least once; M's lines are the evidence that no harness reads this path. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { SENTINEL, ERAS, seeded, hashSeed, bundleEngine, sentinelPlan } from '../../scripts/lib/cmDugoutSentinel.mjs';

const ROOT = process.cwd();
const store = new Map();
globalThis.localStorage = { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { store.set(k, String(v)); }, removeItem: k => { store.delete(k); }, clear: () => { store.clear(); } };
const refuse = why => { console.error(`takeoverRun1606 cannot run: ${why}`); process.exit(2); };
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'takeover-1606-'));
const nodeModules = path.join(ROOT, 'node_modules');
const P = await bundleEngine({ srcDir: path.join(ROOT, 'src'), tmp, name: 'plain', nodeModules, refuse });
const plan = await sentinelPlan(P.cm);
const S = await bundleEngine({ srcDir: path.join(ROOT, 'src'), tmp, name: 'sent', table: plan.table, partial: plan.partial, nodeModules, refuse });
const M = await bundleEngine({ srcDir: path.join(ROOT, 'src'), tmp, name: 'mut', table: plan.table, partial: plan.partial, nodeModules, refuse,
  edit: { from: 'const displacedReal = isRealChair(record[state.clubName]);', to: 'const displacedReal = false;' } });
for (const era of ERAS) for (const E of [S, M]) await E.cm.ensureEraRosters(era);
const sentinelClubs = era => new Set(Object.keys(plan.table[era] ?? {}));
const takeLine = st => (st.aiHeadlines ?? []).find(h => h.includes('take over at')) ?? '(no takeover line)';
let viaOffer = 0, sNamed = 0, mNamed = 0, careers = 0, direct = 0;
const shown = [];
for (const E of [S, M]) {
  for (const L of plan.leagues) {
    for (let k = 0; k < 6; k++) {
      const seed = hashSeed(`take|${L.era}|${L.id}|${k}`);
      const c = seeded(seed, () => E.cm.startCareer(L.career, L.era)).value;
      if (k % 2 === 0) c.trophies.push({ name: 'League Title', emoji: '\u{1F3C6}', season: c.season });
      const fin = seeded(seed + 1, () => E.cm.finishSeason(c)).value.state;
      if (E === S) careers += 1;
      const vac = new Set((fin.pendingVacancies ?? []).map(v => v.club));
      for (const o of fin.pendingSummary?.offers ?? []) {
        if (!sentinelClubs(L.era).has(o.club) || vac.has(o.club) || fin.managers?.[o.club]?.name !== SENTINEL) continue;
        const next = seeded(seed + 2, () => E.cm.startNextSeason(JSON.parse(JSON.stringify(fin)), o.club)).value;
        const line = takeLine(next);
        const named = (next.aiHeadlines ?? []).some(h => h.includes(SENTINEL));
        if (E === S) { viaOffer += 1; if (named) sNamed += 1; } else if (named) mNamed += 1;
        if (shown.length < 6) shown.push(`${E === S ? 'branch' : 'mutant'} offer ${L.era} ${L.career} -> ${o.club}: ${line}`);
      }
    }
    /* The direct move into the sentinel's chair, as 7d moves out of it. */
    const c = seeded(hashSeed(`direct|${L.era}|${L.id}`), () => E.cm.startCareer(L.career, L.era)).value;
    const fin = seeded(7, () => E.cm.finishSeason(c)).value.state;
    if ((fin.pendingVacancies ?? []).some(v => v.club === L.sentinel)) continue;
    const next = seeded(8, () => E.cm.startNextSeason(fin, L.sentinel)).value;
    if (next.clubName !== L.sentinel) continue;
    const named = (next.aiHeadlines ?? []).some(h => h.includes(SENTINEL));
    if (E === S) { direct += 1; if (named) sNamed += 1; } else if (named) mNamed += 1;
    if (L.id === plan.leagues[0].id && L.era === plan.leagues[0].era) shown.push(`${E === S ? 'branch' : 'mutant'} direct ${L.era} ${L.career} -> ${L.sentinel}: ${takeLine(next)}`);
  }
}
for (const l of shown) console.log(`   ${l}`);
console.log(`takeoverRun1606: ${careers} careers; ${viaOffer} accepted offers from a club whose real man was still in the chair, ${direct} direct moves into one; branch named the sentinel ${sNamed} time(s), the mutant ${mNamed} time(s)`);
if (sNamed) { console.log('takeoverRun1606: the branch names a real man when you take his chair'); process.exit(1); }
if (!viaOffer) { console.log('takeoverRun1606: no offer reached a real chair, the offer route is not shown'); process.exit(3); }
console.log('takeoverRun1606: branch right; the mutant line above is what a harness would have to catch');
process.exit(0);
