// Round 1542 review (run lens): apply ONE plausible mutation to the source on the runner's checkout.
// The calling line restores with git checkout. Exit 2 when the anchor is not exactly once (the mutation did not apply).
import fs from 'node:fs';

const STATS = 'src/lib/nflSeasonStats.ts';
const VIEW = 'src/lib/gmGameDayView.ts';
const BOARD = 'src/components/front-office/FrontOfficeBoard.tsx';
const MUT = {
  // A: swapped argument, the pass rush and the line trade places (better line, more sacks)
  A: [[STATS, 'const chance = nflSackChance(rush, mean(line.map(m => m.ovr), NFL_BLOCK_FLOOR));', 'const chance = nflSackChance(mean(line.map(m => m.ovr), NFL_BLOCK_FLOOR), rush);']],
  // B: dropped filter, playoff games go into the season's lines and club line
  B: [[STATS, '  if (regular) {', '  if (regular || !regular) {']],
  // F: flipped comparison, the better the quarterback the FEWER touchdowns he throws
  F: [[STATS, 'kind < nflPassChance(s.pool.qb.ovr)', 'kind > nflPassChance(s.pool.qb.ovr)']],
  // L: stale constant, backs catch most, receivers least (the help says receivers most often)
  L: [[STATS, '{ WR: 1, TE: 0.7, RB: 0.35 }', '{ WR: 0.35, TE: 0.7, RB: 1 }']],
  // E: swapped sides on the tile, the other club's scorers paired with ours
  E: [[VIEW, 'const mine = home ? credits.home : credits.away;', 'const mine = home ? credits.away : credits.home;'],
      [VIEW, 'const theirs = home ? credits.away : credits.home;', 'const theirs = home ? credits.home : credits.away;']],
  // H: swapped boolean, his round at a time playoff games recorded as regular season games
  H: [[BOARD, 'for (const g of told) if (g.home === myTeam || g.away === myTeam) nflRecordGame(lg, g, myTeam, false);', 'for (const g of told) if (g.home === myTeam || g.away === myTeam) nflRecordGame(lg, g, myTeam, true);']],
  // G: dropped call, the load no longer cleans a damaged block
  G: [[BOARD, '      nflCleanSave(s.league);', '      /* review mutation G */']],
};
const key = process.argv[2];
if (!MUT[key]) { console.error(`rvmut: unknown mutation ${key}`); process.exit(2); }
for (const [file, from, to] of MUT[key]) {
  const src = fs.readFileSync(file, 'utf8');
  const n = src.split(from).length - 1;
  if (n !== 1) { console.error(`rvmut ${key}: anchor found ${n} times in ${file}, refusing`); process.exit(2); }
  fs.writeFileSync(file, src.replace(from, to));
  const after = fs.readFileSync(file, 'utf8');
  if (!after.includes(to) || after.includes(from)) { console.error(`rvmut ${key}: did not apply in ${file}`); process.exit(2); }
}
console.log(`rvmut ${key}: applied`);
