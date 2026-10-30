/* Round 1603 fixer: one mutation of the Hot Seat free run's tie stamp, for the runner only (never committed).
   Usage: node .rc/x/mutstamp.mjs <F|P|W|FIN>. Asserts its line is in the file exactly once, then prints MUTATED. */
import fs from 'node:fs';
const FILE = 'src/components/manager-hot-seat/ManagerHotSeatBoard.tsx';
const M = {
  F: ['    open({ club, seed, rules: 1331, tie: 1603 });', '    open({ club, seed, rules: 1331 });'],
  P: [", ...(p.tie === 1603 ? { tie: 1603 as const } : {}) };", ' };'],
  W: ['...(r.setup.tie === 1603 ? { tie: 1603 } : {}), ', ''],
  FIN: ['setFreeFinished({ setup: { club, seed: seed >>> 0, ...stamp }, actions })', 'setFreeFinished({ setup: { club, seed: seed >>> 0, ...(p.rules === 1331 ? { rules: 1331 as const } : {}) }, actions })'],
};
const name = process.argv[2];
if (!M[name]) { console.log(`mutstamp: ABORT, unknown mutation ${name}`); process.exit(2); }
const [from, to] = M[name];
const src = fs.readFileSync(FILE, 'utf8');
const n = src.split(from).length - 1;
if (n !== 1) { console.log(`mutstamp: ABORT, ${name}'s line is in the file ${n} times`); process.exit(2); }
fs.writeFileSync(FILE, src.replace(from, () => to));
console.log(`MUTATED ${name}`);
