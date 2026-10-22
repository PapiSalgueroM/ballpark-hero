/* Review run lens, Round 1540: one plausible mutation of the round's core rule, applied in place on the runner's
   checkout (the request line restores it with git checkout in the same line). Each anchor must be present exactly
   once, or the script exits 2 and nothing is changed. */
import fs from 'node:fs';

const MUTS = {
  /* his board sorted by the true rating, not his scout's read (a stale field from the engine) */
  sort: ['src/components/nba-front-office/NbaFrontOfficeBoard.tsx',
    'const board = [...draftClass].sort((a, b) => gradeOf(b) - gradeOf(a) || a.id.localeCompare(b.id)).slice(0, 14);',
    'const board = [...draftClass].sort((a, b) => b.trueOvr - a.trueOvr || a.id.localeCompare(b.id)).slice(0, 14);'],
  /* "no later than" off by one */
  latest: ['src/lib/gmEarnedDraft.ts',
    'row.slot.forEach((p, k) => { if (p > 1e-12) latest = k + 1; });',
    'row.slot.forEach((p, k) => { if (p > 1e-12) latest = k; });'],
  /* the top four figure sums three places */
  top: ['src/lib/gmEarnedDraft.ts',
    'row.slot.slice(0, odds.draws).reduce',
    'row.slot.slice(0, odds.draws - 1).reduce'],
  /* the held firsts listed in the order they LANDED (the draw), not seed order (critic correction 1 b) */
  held: ['src/lib/gmEarnedDraft.ts',
    '  for (const f of field) {\n    if (f.club === me || firstOf(f.club)?.holder !== me) continue;',
    '  const landed = (c: string) => slots.findIndex(s => s.round === 1 && s.kind === \'std\' && s.orig === c);\n  for (const f of [...field].sort((a, b) => landed(a.club) - landed(b.club))) {\n    if (f.club === me || firstOf(f.club)?.holder !== me) continue;'],
  /* the lottery plays on every mount (a reload replays the night) */
  live: ['src/components/front-office-shared/useGmEarnedDraft.ts',
    'const [lotteryLive, setLotteryLive] = useState(false);',
    'const [lotteryLive, setLotteryLive] = useState(true);'],
  /* the press saves the picks left it had before the press (a stale value) */
  stale: ['src/components/nba-front-office/NbaFrontOfficeBoard.tsx',
    "persist({ draftClass: press.left, picksLeft: slots, draftAiBatchesLeft: 2 }, lg, myTeam);",
    "persist({ draftClass: press.left, picksLeft, draftAiBatchesLeft: 2 }, lg, myTeam);"],
  /* the press hands the library the live league, not a copy (brief 3.10 trap) */
  nocopy: ['src/components/nba-front-office/NbaFrontOfficeBoard.tsx',
    'const lg: NbaLeague = JSON.parse(JSON.stringify(league));\n    const press = go(lg, desk, draftClass);',
    'const lg: NbaLeague = league;\n    const press = go(lg, desk, draftClass);'],
};

const name = process.argv[2];
const m = MUTS[name];
if (!m) { console.error(`no mutation ${name}`); process.exit(2); }
const [file, from, to] = m;
const src = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
const n = src.split(from).length - 1;
if (n !== 1) { console.error(`MUTATION ${name}: anchor found ${n} times in ${file}, nothing changed`); process.exit(2); }
if (process.argv[3] === '--check') { console.log(`MUTATION ${name}: anchor once in ${file} (check only)`); process.exit(0); }
fs.writeFileSync(file, src.replace(from, to));
console.log(`MUTATION ${name} APPLIED in ${file}`);
