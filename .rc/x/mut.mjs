// Reviewer mutation: rewrite ONE string in ONE source file on the runner (restored by git checkout in the same line).
// Exits 2 (cannot run) when the string is not there exactly once, so a mutation that changes nothing never reads as green.
import fs from 'node:fs';
const B = 'src/components/front-office/FrontOfficeBoard.tsx';
const L = 'src/components/front-office/nflCareerKitLoad.ts';
const MUTS = {
  /* off by one: the final regular week's press stops waiting for the kit (the playoffs still wait) */
  closeoff1: [B, "  const closeWaits = !kit && phase === 'hub' && !!league && league.week >= REGULAR_WEEKS;",
    "  const closeWaits = !kit && phase === 'hub' && !!league && league.week > REGULAR_WEEKS;"],
  /* off by one: the final regular week stops asking for the kit (its press still waits: a deadlock) */
  needoff1: [B, "    || (phase === 'hub' && !!league && league.week >= REGULAR_WEEKS)",
    "    || (phase === 'hub' && !!league && league.week > REGULAR_WEEKS)"],
  /* dropped line: a failed fetch is not forgotten, so Try again replays the same rejection */
  noforget: [L, '      e => { pending = null; throw e; },', '      e => { throw e; },'],
  /* dropped argument: the hub's boxes before the kit ignore the stored record (a career after a move) */
  storedignored: [B, '      const seat = hostSeatOf(gm, hostBoxLegacy({', '      const seat = hostSeatOf(null, hostBoxLegacy({'],
  /* dropped dependency: Try again bumps kitTry but the effect never runs again */
  retrygone: [B, '  }, [kitNeeded, kitTry]);', '  }, [kitNeeded]);'],
};
const name = process.argv[2];
const m = MUTS[name];
if (!m) { console.error(`unknown mutation ${name}`); process.exit(2); }
const [file, from, to] = m;
const text = fs.readFileSync(file, 'utf8');
const n = text.split(from).length - 1;
if (n !== 1) { console.error(`MUTATION ${name} CANNOT RUN: the text is in ${file} ${n} times`); process.exit(2); }
fs.writeFileSync(file, text.replace(from, to));
console.log(`MUTATION ${name} APPLIED to ${file}`);
