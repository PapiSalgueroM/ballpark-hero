/* Reviewer's mutations for Round 1223. Runs on the runner only (it edits a source file in place; the request line
 * restores it with git checkout). Locally only `node mut.mjs --check` is run: it reads, never writes.
 *   node .rc/x/mut.mjs <name>     apply one mutation (exit 9 when its anchor is not in the file exactly once)
 *   node mut.mjs --check          verify every anchor, write nothing
 */
import fs from 'node:fs';
import path from 'node:path';

const HOST = 'src/lib/gmDeskHost.ts';
const NHL = 'src/lib/gmDeskHostNhl.ts';
const MARKET = 'src/components/front-office-shared/GmJobMarketPanel.tsx';
const T = '`';
const D = '$';

const MUTS = {
  closelt: [HOST, 'if (seat.last !== undefined && f.season <= seat.last) return same;', 'if (seat.last !== undefined && f.season < seat.last) return same;'],
  fitsave: [HOST, 'return s.team === l.team && (s.ended !== undefined) === l.fired;', 'return s.team === l.team;'],
  craftfirst: [HOST, 'for (let i = list.length - 1; i >= 0; i--) if (list[i].playerId === playerId) { at = i; break; }', 'for (let i = 0; i < list.length; i++) if (list[i].playerId === playerId) { at = i; break; }'],
  nextstale: [HOST, 'const later = { ...p, seasonsOut: p.seasonsOut + 1 };', 'const later = { ...p, seasonsOut: p.seasonsOut };'],
  awayclosed: [HOST, "if (!market || market.state === 'closed') return { ok: false, reason: 'market-closed' };", "if (!market) return { ok: false, reason: 'market-closed' };"],
  legacyfrom: [HOST, 'from: l.season - seasons + (counted ? 1 : 0), grades,', 'from: l.season - seasons, grades,'],
  nhlrecord: [NHL, `record: ${T}${D}{t.wins}-${D}{t.losses}-${D}{t.otLosses}${T},`, `record: ${T}${D}{t.wins}-${D}{t.otLosses}-${D}{t.losses}${T},`],
  nhlpct: [NHL, 'pct: (t.wins * 2 + t.otLosses) / (games * 2)', 'pct: (t.wins * 2 + t.losses) / (games * 2)'],
  arrivege: [HOST, 'return !s.ended && s.from > leagueSeason;', 'return !s.ended && s.from >= leagueSeason;'],
  legacylast: [HOST, "if (l.lastGrade !== null && l.lastGrade !== 'title' && seasons - titles >= 1) grades.push(l.lastGrade);", 'if (l.lastGrade !== null && seasons - titles >= 1) grades.push(l.lastGrade);'],
  legacyfired: [HOST, "...(l.fired ? { ended: 'fired' as const } : {}),", ''],
  onetap: [MARKET, "onClick={() => { if (armed === 'take') take(offer); else setArmed('take'); }}", 'onClick={() => take(offer)}'],
  sitclosed: [MARKET, "{market.state !== 'closed' && !offer && (", '{!offer && ('],
  tileclimb: [HOST, "sub: market.nextYear === 'climb' ? 'Next year hangs on your old club' : 'Next year is still open',", "sub: market.nextYear === 'climb' ? 'Next year is still open' : 'Next year hangs on your old club',"],
  climbword: [HOST, `have climbed into the ${D}{HOST_TIER_WORDS[climbTo]} of the league by then.`, `have climbed into the ${D}{HOST_TIER_WORDS[climbTo - 1]} of the league by then.`],
  canspend: [HOST, 'return gmPointsFree(xp) > 0 && live.some(t => gmTreePoints(xp, t) < GM_MAX_TREE_POINTS);', 'return gmPointsFree(xp) > 0 && live.some(t => gmTreePoints(xp, t) <= GM_MAX_TREE_POINTS);'],
};

const read = f => fs.readFileSync(path.resolve(f), 'utf8');
const problem = name => {
  const [file, from, to] = MUTS[name];
  const src = read(file);
  const n = src.split(from).length - 1;
  if (n !== 1) return `${name}: its anchor is in ${file} ${n} times, not once`;
  if (src.replace(from, to) === src) return `${name}: the rewrite changes nothing`;
  return null;
};

const arg = process.argv[2];
if (arg === '--check') {
  const bad = Object.keys(MUTS).map(problem).filter(Boolean);
  for (const b of bad) console.log(`ANCHOR ${b}`);
  console.log(`mut.mjs: ${Object.keys(MUTS).length} mutations checked, ${bad.length} cannot run`);
  process.exit(bad.length ? 1 : 0);
}
if (!MUTS[arg]) { console.log(`no such mutation: ${arg}`); process.exit(9); }
const bad = problem(arg);
if (bad) { console.log(`CANNOT APPLY ${bad}`); process.exit(9); }
const [file, from, to] = MUTS[arg];
fs.writeFileSync(path.resolve(file), read(file).replace(from, to));
console.log(`MUTATION ON: ${arg} in ${file}`);
