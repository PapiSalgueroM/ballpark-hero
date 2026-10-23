// Round 1542 fix: the review's mutation H on the runner's checkout, the control of the bracket path board case.
// His round at a time playoff games recorded as regular season games. Exit 2 when the anchor is not exactly once.
// The calling line restores the tree with git checkout.
import fs from 'node:fs';

const BOARD = 'src/components/front-office/FrontOfficeBoard.tsx';
const from = 'for (const g of told) if (g.home === myTeam || g.away === myTeam) nflRecordGame(lg, g, myTeam, false);';
const to = 'for (const g of told) if (g.home === myTeam || g.away === myTeam) nflRecordGame(lg, g, myTeam, true);';
const src = fs.readFileSync(BOARD, 'utf8');
const n = src.split(from).length - 1;
if (n !== 1) { console.error(`mutH: anchor found ${n} times, refusing`); process.exit(2); }
fs.writeFileSync(BOARD, src.replace(from, to));
const after = fs.readFileSync(BOARD, 'utf8');
if (!after.includes(to) || after.includes(from)) { console.error('mutH: did not apply'); process.exit(2); }
console.log('mutH: applied');
