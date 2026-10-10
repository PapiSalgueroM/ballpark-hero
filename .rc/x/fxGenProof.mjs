/* Round 1214 fix pass, a runner only probe (never committed): change the 2026 squads file the way a
   later round might, so the request can show the vitest go red and scripts/genCmAgesBasis2026.mjs
   bring it back. Modes:
     move     swap the first two men of AC Milan and move one man from another club to AC Milan
     newman   add a man the value table rows on file know nothing about
   Refuses (exit 3) when an anchor is not found exactly once. */
import fs from 'node:fs';

const FILE = 'src/data/clubManagerRosters.ts';
const TARGET = 'AC Milan';
const mode = process.argv[2];
const refuse = (text) => { console.error(`fxGenProof: REFUSED, ${text}`); process.exit(3); };

const text = fs.readFileSync(FILE, 'utf8');
const lines = text.split('\n');
const basis = JSON.parse(fs.readFileSync('scripts/data/cmAgesBasis2026.json', 'utf8')).clubs;
const start = text.indexOf('export const CM_ROSTERS');
const open = text.indexOf('{', text.indexOf('=', start));
const close = text.indexOf('\n};', open);
if (start < 0 || open < 0 || close < 0) refuse('the squads file is not the shape this probe reads');
const squads = new Function(`return ${text.slice(open, close + 2)}`)();

const headerAt = lines.findIndex(l => l.trimEnd() === `  '${TARGET}': [`);
if (headerAt < 0 || lines.filter(l => l.trimEnd() === `  '${TARGET}': [`).length !== 1) refuse(`no single header line for ${TARGET}`);
const endAt = lines.findIndex((l, i) => i > headerAt && l.trimEnd() === '  ],');
if (endAt < 0) refuse(`${TARGET} has no closing line`);

if (mode === 'newman') {
  lines.splice(endAt, 0, `    { n: 'Nobody Fix Probe', p: 'ST', a: 25, v: 1, r: 65 },`);
  fs.writeFileSync(FILE, lines.join('\n'));
  console.log(`fxGenProof: MUTATION newman APPLIED, a man with no table row was added to ${TARGET}`);
  process.exit(0);
}
if (mode !== 'move') refuse(`unknown mode ${mode}`);

const count = {};
for (const men of Object.values(squads)) for (const m of men) count[m.n] = (count[m.n] ?? 0) + 1;
const clubs = Object.keys(squads);
let pick = null;
for (let c = clubs.length - 1; c >= 0 && !pick; c -= 1) {
  const club = clubs[c];
  if (club === TARGET) continue;
  const men = squads[club];
  for (let i = men.length - 1; i >= 0; i -= 1) {
    const plain = !men[i].n.includes("'") && !men[i].n.includes('\\');
    if (basis[club][i][3] === 'moved' && count[men[i].n] === 1 && plain && men.length > 1) { pick = { club, name: men[i].n }; break; }
  }
}
if (!pick) refuse('no man to move');
const manLines = lines.map((l, i) => [l, i]).filter(([l]) => l.includes(`{ n: '${pick.name}',`));
if (manLines.length !== 1) refuse(`${pick.name} is on ${manLines.length} lines`);
const [manLine, manAt] = manLines[0];
if (manAt > headerAt && manAt < endAt) refuse('the picked man is already at the target');

/* swap the target's first two men, then move the picked man to the end of the target */
const first = lines[headerAt + 1];
const second = lines[headerAt + 2];
if (!first.includes('{ n: ') || !second.includes('{ n: ') || first === second) refuse(`${TARGET} has no two men to swap`);
lines[headerAt + 1] = second;
lines[headerAt + 2] = first;
const out = lines.slice();
const insertAt = manAt < endAt ? endAt - 1 : endAt;
out.splice(manAt, 1);
out.splice(insertAt, 0, manLine);
fs.writeFileSync(FILE, out.join('\n'));
console.log(`fxGenProof: MUTATION move APPLIED, the first two men of ${TARGET} swapped and ${pick.name} moved from ${pick.club} to ${TARGET}`);
