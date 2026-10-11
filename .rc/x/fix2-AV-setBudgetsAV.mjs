// Release AV: set the page download budgets and the flagship's raw ceiling from the gate's measurement. The lead's
// hand step, as a script, in the shape of Release AU's helper (fix2-AU-setBudgetsAU.mjs). NOT part of the branch:
// the brief gives the budget rows of scripts/sweepWeight.mjs to the lead, and the ceiling of
// scripts/simFlagshipWeight.mjs says "raise it only with a fresh measurement in this comment", so this moves a
// number only where it is run (the lead's release worktree, or a runner's throwaway checkout to prove it).
//
// usage (in the release worktree), with the numbers the GATE'S build measured, one /route=N for each row over and,
// when simFlagshipWeight is red, the new ceiling with the raw KB the gate's build printed:
//   MSYS_NO_PATHCONV=1 node C:/Users/antho/dukb-handoff/2026-10-10/results-g/fix2-AV-setBudgetsAV.mjs /club-manager=N /manager-hot-seat=N /deadline-day=N --flagship=N --flagship-measured=N
// Proven on a runner's throwaway checkout of the pushed head ede83172 (request rAV-fx2-b, see fix2-AV.md): after
// it both fences are green on that build.
//
// A budget row is ['/route', N], /* comment */ ; the number moves and a dated note goes in front of the comment.
// The ceiling is the one line `const CEILING_KB = N;` ; the number moves and a dated paragraph is added at the end
// of the comment above it. It refuses, and writes nothing, when a route has no row or more than one, when a number
// is not whole, when a number is below the one that is there, when the ceiling line or its comment is not found
// exactly once, or when a note holds a dash character or a comment end.
import fs from 'node:fs';
const SWEEP = 'scripts/sweepWeight.mjs';
const FLAG = 'scripts/simFlagshipWeight.mjs';
/* the day the gate measured, UTC, unless BUDGET_DATE says otherwise */
const WHEN = process.env.BUDGET_DATE || new Date().toISOString().slice(0, 10);
/* What is measured and what is not. Measured on a runner (rAV-libs-W, every tree built in its own worktree and
   judged by its own copy of the harness): main aa564f16 reads /club-manager 585.4K, /manager-hot-seat 602.8K,
   /deadline-day 612.9K; the release line just before Round 1229's merge (5db0724b) reads 585.5K, 602.8K, 612.9K;
   the merge itself (f2483fd9) reads 587.0K, 604.4K, 614.5K; the head reads 587.1K, 604.5K, 614.6K (rAV-vf-w on
   ede83172). So the three rows are Round 1229 and nothing else of the release. Edit the words freely, they are
   the lead's. */
const CM = 'Round 1229, the league book kept in the Club Manager engine chunk (two new modules; no screen reads it yet), measured before and after its merge on a runner: about 1.5K a page, and nothing else of Release AV moved this row (main and the line just before that merge read the same to 0.1K)';
const WHY = {
  '/club-manager': CM,
  '/manager-hot-seat': CM,
  '/deadline-day': CM,
  /* These two were INSIDE their budgets on the head (808.1K of 808, 479.2K of 479) and are here only for a gate
     build that tips one of them. */
  '/soccer-career': 'Release AV took this row from 807.7K on main to 808.1K (measured on a runner); the flagship fence lays the raw growth to Round 1227 (1,451 bytes in the rivalry chunk this page shares with the US careers), and the gzipped 0.4K is not split by a measurement',
  '/nfl-my-career': 'Release AV took this row from 478.3K on main to 479.0K at its merges (Round 1227, the NFL rival on your position and your stat line, is the round that touches this page; not split by a measurement), and the fix that makes an MLB or NHL plan card read the real length of its season added 0.2K of shared panel code (479.0K to 479.2K, measured)',
};
const DEFAULT = 'Release AV (no cause measured for this row one input at a time: say what the gate found)';
/* The flagship. Measured (the integrator's rAV-F1 and the reviewer's rAV-libs-W): main needs 2,661,052 bytes
   (2598.7 KB, printed 2599), the head 2,662,559 (2600.2 KB, printed 2600, over 2600 by 0.2). Of the 1,507 bytes
   1,451 are the rivalry chunk Soccer Career shares with the US careers (Round 1227's roster beat builder in
   src/lib/careerRivalryEvents.ts) and 56 are the entry (one more chunk name in its map). The tree just before
   Round 1227's merge (f6dfa9b3) is green at 2599 and the merge (a1e4f86b) is red at 2600. */
const DASHES = [String.fromCharCode(0x2013), String.fromCharCode(0x2014)];
const clean = (why, what) => { if (DASHES.some(c => why.includes(c)) || why.includes('*/')) { console.error('setBudgetsAV: the note for ' + what + ' holds a dash character or a comment end; nothing written'); process.exit(2); } };
const whole = t => { const n = Number(t); return Number.isInteger(n) && String(n) === t ? n : null; };

let sweep = fs.readFileSync(SWEEP, 'utf8');
let flag = fs.readFileSync(FLAG, 'utf8');
const moves = [];
let ceiling = null, measured = null;
for (const arg of process.argv.slice(2)) {
  if (arg.startsWith('--flagship-measured=')) { measured = whole(arg.slice(20)); if (measured === null) { console.error('setBudgetsAV: not a whole number: ' + arg + '; nothing written'); process.exit(2); } continue; }
  if (arg.startsWith('--flagship=')) { ceiling = whole(arg.slice(11)); if (ceiling === null) { console.error('setBudgetsAV: not a whole number: ' + arg + '; nothing written'); process.exit(2); } continue; }
  const [route, nextText] = arg.split('=');
  const next = whole(nextText ?? '');
  if (!route || !route.startsWith('/') || next === null) { console.error('setBudgetsAV: not /route=N: ' + arg + '; nothing written'); process.exit(2); }
  const re = new RegExp("\\['" + route.replace(/[/-]/g, m => '\\' + m) + "', (\\d+)\\], /\\* ", 'g');
  const hits = [...sweep.matchAll(re)];
  if (hits.length !== 1) { console.error('setBudgetsAV: expected exactly one budget row with a comment for ' + route + ', found ' + hits.length + '; nothing written'); process.exit(2); }
  const old = Number(hits[0][1]);
  if (old === next) { console.log(route + ' already ' + next); continue; }
  if (next < old) { console.error('setBudgetsAV: ' + route + ' is at ' + old + ' and ' + next + ' is lower; a saving gets its own note; nothing written'); process.exit(2); }
  const why = WHY[route] ?? DEFAULT;
  clean(why, route);
  sweep = sweep.replace(re, `['${route}', ${next}], /* Release AV, measured on a runner, ${WHEN}: ${next}K measured on the gate's build (${old} before); ${why}. Before that: `);
  moves.push(`${route}: ${old} -> ${next}`);
}
let flagMoved = false;
if (ceiling !== null) {
  /* the line ends are kept as the file has them (LF on a runner, CRLF in a Windows worktree) */
  const line = /(\r?\n)( *)const CEILING_KB = (\d+);(\r?\n)/g;
  const hits = [...flag.matchAll(line)];
  if (hits.length !== 1) { console.error('setBudgetsAV: expected exactly one CEILING_KB line, found ' + hits.length + '; nothing written'); process.exit(2); }
  const eol = hits[0][1], pad = hits[0][2], old = Number(hits[0][3]);
  const at = hits[0].index;
  const before = flag.slice(0, at);
  if (!before.endsWith(' */')) { console.error('setBudgetsAV: the comment above CEILING_KB does not end where it used to; nothing written'); process.exit(2); }
  if (ceiling === old) console.log('the flagship ceiling is already ' + ceiling);
  else if (ceiling < old) { console.error('setBudgetsAV: the ceiling is at ' + old + ' and ' + ceiling + ' is lower; a saving gets its own note; nothing written'); process.exit(2); }
  else {
    const now = measured ?? old;
    if (ceiling <= now) { console.error('setBudgetsAV: the new ceiling ' + ceiling + ' is not above the ' + now + ' KB measured; nothing written'); process.exit(2); }
    const note = [
      `Raised at Release AV (${WHEN}) with a fresh measurement: main (Release`,
      `AU) already needed 2599 KB (2,661,052 bytes; it was 2511 at Release AI,`,
      `and the releases between were not split by a measurement), and Round`,
      `1227 brings it to ${now} KB (2,662,559 bytes on its merge: 1,451`,
      `more in the rivalry chunk this page shares with the US careers, which`,
      `now carries the roster beat builder of a rival who plays your own stat`,
      `line, and 56 in the entry for one more chunk name). ${ceiling} leaves ${ceiling - now} KB`,
      `of room and still sits far under ${now} + 444, so Club Manager coming`,
      `back still fails. Owed, and the cheaper fix every time: the fact beat`,
      `and roster beat builders of src/lib/careerRivalryEvents.ts (only the`,
      `four US careers call them) in a module of their own, and the on demand`,
      `loading above.`,
    ];
    for (const l of note) clean(l, 'the ceiling');
    const open = before.slice(0, -3);
    flag = open + eol + note.map(l => pad + '   ' + l).join(eol) + ' */' + eol + pad + `const CEILING_KB = ${ceiling};` + hits[0][4] + flag.slice(at + hits[0][0].length);
    moves.push(`flagship ceiling: ${old} -> ${ceiling} (measured ${now})`);
    flagMoved = true;
  }
}
if (!moves.length) { console.log('setBudgetsAV: nothing to move'); process.exit(0); }
if (moves.some(m => m.startsWith('/'))) fs.writeFileSync(SWEEP, sweep);
if (flagMoved) fs.writeFileSync(FLAG, flag);
for (const m of moves) console.log(m);
