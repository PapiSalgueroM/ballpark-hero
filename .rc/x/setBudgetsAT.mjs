// Release AT: set page download budgets from the gate's measurement. The lead's hand step, as a script,
// in the shape of the lead's own setBudgetsAR.mjs. NOT part of the branch: the brief gives the budget rows of
// scripts/sweepWeight.mjs to the lead (ruling R7), so this moves a row only where it is run (the lead's
// release worktree, or a runner's throwaway checkout to prove it).
// usage (in the release worktree), with the numbers the GATE'S build measured:
//   MSYS_NO_PATHCONV=1 node C:/Users/antho/dukb-handoff/2026-10-10/results-g/fix2-AT-setBudgetsAT.mjs /club-manager=N /soccer-career=N /manager-hot-seat=N /deadline-day=N
// Each row is ['/route', N], /* comment */ ; the number moves and a dated note goes in front of the comment.
// It refuses, and writes nothing, when a route has no row or more than one, when a number is not whole,
// when a number is below the one that is there (a lower ceiling is a saving: write that note by hand), or
// when a note holds a dash character or a comment end.
import fs from 'node:fs';
const file = 'scripts/sweepWeight.mjs';
let s = fs.readFileSync(file, 'utf8');
/* The causes are measured, not guessed: runner result rAT-f2-a (files/weight-attrib.txt), a build of 54e3820a
   against a build of b7976622, each route's files gathered the way section 1 gathers them. One chunk moved on
   each route: the engine chunk by 4,153 gzipped bytes on the three manager routes, the page chunk by 10,309 on
   /soccer-career. Edit the words freely, they are the lead's. */
const ENGINE = 'the Club Manager engine every one of these pages loads grew by 4.1K with the other lane\'s Rounds 1184 and 1181: the real 2026/27 Premier League fixture list a new original Premier League career binds (380 fixtures, the order and the venues; 2.0K gzipped alone), the review rule that ships dark behind CM_VAR_LIVE and still ships (1.3K alone), and the engine lines that bind and settle them';
const DAILY = '; the daily strips the fixture key and still downloads the list with the engine';
const WHY = {
  '/club-manager': ENGINE,
  '/manager-hot-seat': ENGINE + DAILY,
  '/deadline-day': ENGINE + DAILY,
  '/soccer-career': 'the Soccer Career train (Codex Rounds 1179, 1180 and 1185 to 1196: season targets and the record book, form in selection, preseason plans, the mentor, story chapters, a reduced role under a new manager, goal milestones, a trophy that opens its saved campaign, two seasons compared, availability history, derby history); 10.1K of first download code in the page chunk, twelve new modules (the board\'s tiles and their rules), while the sheets a tap opens stay lazy',
};
const DEFAULT = 'the growth of Release AT (the other lane\'s Rounds 1179 to 1196)';
const DASHES = [String.fromCharCode(0x2013), String.fromCharCode(0x2014)];
const moves = [];
for (const arg of process.argv.slice(2)) {
  const [route, nextText] = arg.split('=');
  const next = Number(nextText);
  if (!route || !route.startsWith('/') || !Number.isInteger(next) || String(next) !== nextText) { console.error('setBudgetsAT: not /route=N: ' + arg + '; nothing written'); process.exit(2); }
  const re = new RegExp("\\['" + route.replace(/[/-]/g, m => '\\' + m) + "', (\\d+)\\], /\\* ", 'g');
  const hits = [...s.matchAll(re)];
  if (hits.length !== 1) { console.error('setBudgetsAT: expected exactly one budget row with a comment for ' + route + ', found ' + hits.length + '; nothing written'); process.exit(2); }
  const old = Number(hits[0][1]);
  if (old === next) { console.log(route + ' already ' + next); continue; }
  if (next < old) { console.error('setBudgetsAT: ' + route + ' is at ' + old + ' and ' + next + ' is lower; a saving gets its own note; nothing written'); process.exit(2); }
  const why = WHY[route] ?? DEFAULT;
  if (DASHES.some(c => why.includes(c)) || why.includes('*/')) { console.error('setBudgetsAT: the note for ' + route + ' holds a dash character or a comment end; nothing written'); process.exit(2); }
  s = s.replace(re, `['${route}', ${next}], /* Release AT, measured on a runner, 2026-10-10: ${next}K measured on the gate's build (${old} before); ${why}. Before that: `);
  moves.push(`${route}: ${old} -> ${next}`);
}
if (!moves.length) { console.log('setBudgetsAT: nothing to move'); process.exit(0); }
fs.writeFileSync(file, s);
for (const m of moves) console.log(m);
