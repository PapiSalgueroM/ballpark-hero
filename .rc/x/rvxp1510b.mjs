/* Review of Round 1510: does a minor trophy move the manager's XP? simOneOffCups section 4 compares its weighing
 * readers on one state with and without an appended minor trophy. This replays section 4's own journey (the won
 * arm: FORCE_MINE and WON_ARM, the same tape keys, no join) for one club and seed through RVXP_SEASONS seasons,
 * then on the last state of season two runs finishSeason and startNextSeason with and without the minor trophy
 * (the readers' own tapes) and prints what differs: the draws of each call, the top level keys of each state, the
 * XP block. Run from the repo root: RVXP_CLUB=Everton RVXP_SEED=1 RVXP_SEASONS=2 node .rc/x/rvxp1510.mjs */
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const { engineOf, tape } = await import(pathToFileURL(path.join(ROOT, 'scripts/lib/worldUclFleet.mjs')).href);
const cannot = why => { console.log(`rvxp1510: cannot run: ${why}`); process.exit(2); };
const CM = 'src/lib/clubManager.ts';
const FORCE_MINE = { file: CM, from: '  const oneOffFrom = oneOffTablesOf(career);\n', to: '  const oneOffFrom = (t => ({ ...t, cupWinner: career.clubName }))(oneOffTablesOf(career));\n' };
const WON_ARM = { file: CM, from: '  const won = shootoutWon !== null ? shootoutWon : mine > theirs;\n', to: '  const won = true;\n' };
const CLUB = process.env.RVXP_CLUB || 'Everton';
const SEED = Number(process.env.RVXP_SEED || 1);
const SEASONS = Number(process.env.RVXP_SEASONS || 2);
const E = await engineOf(ROOT, 'won', { edits: [FORCE_MINE, WON_ARM] }, cannot);
const M = await E.fresh();
const opts = { skipHalftime: true, noCoach: true };
let s = null, k = 0, pre = null;
const step = fn => { k += 1; const r = tape((SEED * 0x9e3779b1 + k * 7919) >>> 0, () => fn(s)); if (r.value?.state) s = r.value.state; return r.value; };
step(() => ({ state: M.cm.startCareer(CLUB, 'now') }));
const reload = cur => { M.store.clear(); if (!M.cm.saveCareer(cur)) return {}; return { state: M.cm.loadCareer() }; };
for (let season = 1; season <= SEASONS; season += 1) {
  let over = false;
  for (let i = 0; i < 260 && !over; i += 1) {
    step(cur => { const r = M.cm.playNextEntry(cur, opts); over = r.kind === 'seasonOver'; return { state: r.state }; });
    if (season === 2) pre = s;
    if (i === 20) step(reload);
  }
  step(cur => ({ state: M.cm.finishSeason(cur).state }));
  if (season < SEASONS) step(cur => ({ state: M.cm.startNextSeason(cur) }));
}
if (!pre) cannot('no season two');
const dsc = pre.worldComps?.dsc;
console.log(`${CLUB} seed ${SEED}, ${SEASONS} seasons: season two's cup ${dsc ? (dsc.skip ? `stub ${dsc.skip}` : `${dsc.clubs.join(' v ')} mine ${JSON.stringify(dsc.mine ?? null)}`) : 'none'}, trophies ${JSON.stringify(pre.trophies)}`);
const withIt = JSON.parse(JSON.stringify(pre));
withIt.trophies = [...withIt.trophies, { name: 'FA Community Shield', emoji: '🛡️', season: withIt.season, minor: true }];
const seed = 0x4510 + SEED;
const run = st => {
  const f = tape(seed, () => M.cm.finishSeason(JSON.parse(JSON.stringify(st))));
  const n = tape(seed + 1, () => M.cm.startNextSeason(JSON.parse(JSON.stringify(f.value.state))));
  return { fin: f.value, fd: f.draws.length, next: n.value, nd: n.draws.length };
};
/* RVXP_ORDER: 'same' runs the state WITHOUT the trophy twice (identical inputs), 'reverse' runs the arm with the
   trophy first; anything else is section 4's order (without, then with). */
const ORDER = process.env.RVXP_ORDER || '';
let a, b;
if (ORDER === 'same') { a = run(pre); b = run(pre); }
else if (ORDER === 'reverse') { b = run(withIt); a = run(pre); }
else { a = run(pre); b = run(withIt); }
console.log(`order ${ORDER || 'section 4'}: a = the state without the trophy${ORDER === 'same' ? ', b = the SAME state again' : ', b = with it'}`);
console.log(`finishSeason draws ${a.fd} without, ${b.fd} with; startNextSeason draws ${a.nd} without, ${b.nd} with`);
const diffKeys = (x, y) => [...new Set([...Object.keys(x), ...Object.keys(y)])].filter(key => JSON.stringify(x[key]) !== JSON.stringify(y[key]));
console.log(`finishSeason state keys that differ: ${diffKeys(a.fin.state, b.fin.state).join(' ')}`);
console.log(`finishSeason summary keys that differ: ${diffKeys(a.fin.summary, b.fin.summary).join(' ')}`);
console.log(`startNextSeason state keys that differ: ${diffKeys(a.next, b.next).join(' ')}`);
console.log(`xp without: ${JSON.stringify(a.next.managerXp)}`);
console.log(`xp with:    ${JSON.stringify(b.next.managerXp)}`);
for (const key of ['history', 'pendingVacancies', 'jobOffers', 'aiHeadlines']) {
  if (JSON.stringify(a.fin.state[key]) !== JSON.stringify(b.fin.state[key])) console.log(`fin.${key}: ${JSON.stringify(a.fin.state[key]).slice(0, 300)} || ${JSON.stringify(b.fin.state[key]).slice(0, 300)}`);
}
for (const key of diffKeys(a.next, b.next).slice(0, 8)) console.log(`next.${key}: ${JSON.stringify(a.next[key]).slice(0, 220)} || ${JSON.stringify(b.next[key]).slice(0, 220)}`);
console.log(JSON.stringify(a.next.managerXp) === JSON.stringify(b.next.managerXp) ? 'rvxp1510: XP EQUAL' : 'rvxp1510: XP DIFFERS');
