// Probe, never committed: simManagerWorldContinuity's first inactive pair, compared without node's assert diff
// (which is what runs the runner out of memory on two whole career states), on the head's world and on the curve 1
// world. Prints the first differing path. Run from the repo root.
import { isDeepStrictEqual } from 'node:util';
import { tape, clone, uniquePatch, loadEngine } from '../../scripts/qa/managerWorldContinuityKit.mjs';
import { PRE_AZ_ANCHOR, PRE_AZ_RULE } from '../../scripts/lib/cmOwnClubMarket1339.mjs';
import { withoutAiMoves } from '../../scripts/lib/cmNoAiMoves1344.mjs';
import { withoutAdoption } from '../../scripts/lib/cmNoAdoption1508.mjs';
import { withoutMadeUpNations } from '../../scripts/lib/cmNoMadeUpNations1520.mjs';
import { curve1Files1600 } from '../../scripts/lib/cmCurve1World1600.mjs';

const CORE = 'src/lib/clubManager.ts';
const ROOT = process.cwd();
function neutral(B, input, bridge = false) {
  const c = clone(input); B.store.clear();
  const reads = { market: B.cm.buildMarket(c), opponent: B.cm.oppRosterFor(c, 'Arsenal'), year: B.cm.worldYear(c) };
  const match = B.cm.playNextEntry(bridge ? { ...clone(c), matchRules: 'base' } : clone(c), { skipHalftime: true, noCoach: true });
  if (bridge && match.state && 'matchRules' in match.state) delete match.state.matchRules;
  const summer = B.cm.startNextSeason(bridge ? { ...clone(c), matchRules: 'base' } : clone(c));
  if (bridge && 'matchRules' in summer) delete summer.matchRules;
  if (bridge && 'worldComps' in summer) delete summer.worldComps;
  if (B.cm.saveCareer(c) !== true) throw new Error('save refused');
  const loaded = B.cm.loadCareer();
  if (bridge && loaded && 'worldComps' in loaded) delete loaded.worldComps;
  return { reads, match, summer, loaded, storage: [...B.store.entries()] };
}
function firstDiff(a, b, at = '$', depth = 0) {
  if (isDeepStrictEqual(a, b)) return null;
  if (depth > 12 || typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
    return `${at}: ${JSON.stringify(a)?.slice(0, 160)} vs ${JSON.stringify(b)?.slice(0, 160)}`;
  }
  const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])];
  for (const k of keys) { const d = firstDiff(a[k], b[k], `${at}.${k}`, depth + 1); if (d) return d; }
  return `${at}: same keys, different shape`;
}
const curve1 = curve1Files1600(ROOT);
const C1 = { 'src/data/clubManagerRosters.ts': curve1.clubManagerRosters, 'src/data/clubManagerALeague2026.ts': curve1.clubManagerALeague2026,
  'src/data/clubManagerRussia2026.ts': curve1.clubManagerRussia2026, 'src/data/clubManagerFreeAgents2026.ts': curve1.clubManagerFreeAgents2026 };
const A = await loadEngine({ original: true, label: 'probe-original', patch: (file, source, receipts) =>
  file === CORE ? uniquePatch(source, PRE_AZ_ANCHOR, PRE_AZ_RULE, file, receipts) : source });
const bridged = (file, source) => withoutMadeUpNations(withoutAdoption(withoutAiMoves(source, file), file), file);
const B = await loadEngine({ label: 'probe-head', patch: (file, source) => bridged(file, source) });
const B1 = await loadEngine({ label: 'probe-curve1', patch: (file, source) => bridged(file, C1[file] ?? source) });
console.log('engines loaded; curve 1 files served:', B1.loaded.filter(l => C1[l.file]).length);
let n = 0;
for (const [club, era] of [['Everton', 'now'], ['Barcelona', 'now'], ['Everton', 'era2010'], ['PSG', 'era2015']]) {
  for (const seed of [17, 311]) {
    const prep = await A.fresh(`p${n}-prep`), original = await A.fresh(`p${n}-o`);
    const head = await B.fresh(`p${n}-h`), head1 = await B1.fresh(`p${n}-h1`);
    const input = tape(seed, () => prep.cm.startCareer(club, era)).value;
    const old = tape(seed + 1, () => neutral(original, input));
    const cur = tape(seed + 1, () => neutral(head, input, true));
    const cur1 = tape(seed + 1, () => neutral(head1, input, true));
    const size = JSON.stringify(old.value).length;
    console.log(`${club} ${era} seed ${seed}: state json ${size} chars; head ${isDeepStrictEqual(cur.value, old.value) ? 'EQUAL' : 'differs'} (draws ${cur.draws.length} vs ${old.draws.length}); curve1 ${isDeepStrictEqual(cur1.value, old.value) ? 'EQUAL' : 'differs'} (draws ${cur1.draws.length})`);
    if (!isDeepStrictEqual(cur.value, old.value)) console.log('   head first diff ' + firstDiff(cur.value, old.value));
    if (!isDeepStrictEqual(cur1.value, old.value)) console.log('   curve1 first diff ' + firstDiff(cur1.value, old.value));
    n++;
  }
}
console.log('probe done');
