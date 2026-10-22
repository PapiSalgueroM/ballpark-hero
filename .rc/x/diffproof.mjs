/* Round 1540, decision 10 (a): every function of PART A that plays or opens the night is byte for byte the base's.
   Usage: node diffproof.mjs <base sha>   (DIFFPROOF_CONTROL=1 adds one character to nbaDraftHost in the head copy and
   must turn the run red). Exit 0 green, 1 red or fired, 2 could not run. */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const BASE = process.argv[2];
if (!BASE) { console.error('diffproof: a base sha is needed'); process.exit(2); }
const CONTROL = process.env.DIFFPROOF_CONTROL === '1';
const NAMES = {
  'src/lib/nbaEarnedDraft.ts': ['nbaDraftSeason', 'nbaDraftOrder', 'nbaDraftNightOf', 'openNbaDraftNight', 'NBA_DRAFT_NIGHT_SUMMER',
    'NBA_SECOND_ROUND_SEASONS', 'NBA_DRAFT_KNOBS', 'nbaDraftHost', 'press', 'nbaDraftContinue', 'nbaDraftPick', 'nbaDraftByStaff'],
  'src/lib/gmEarnedDraft.ts': ['stepOf', 'earnedContinue', 'earnedPick', 'earnedByStaff'],
};
const DECL = name => new RegExp(`^(export )?(async )?(function ${name}\\b|const ${name}\\b|let ${name}\\b)`);
const TOP = /^(export |function |const |let |interface |type |import |\/\*)/;
function extract(text, name) {
  const lines = text.replaceAll('\r\n', '\n').split('\n');
  const at = lines.findIndex(l => DECL(name).test(l));
  if (at < 0) return null;
  let end = at + 1;
  while (end < lines.length && !TOP.test(lines[end])) end += 1;
  return lines.slice(at, end).join('\n').trimEnd();
}
let red = 0;
let compared = 0;
for (const [file, names] of Object.entries(NAMES)) {
  const base = execFileSync('git', ['show', `${BASE}:${file}`], { encoding: 'utf8', maxBuffer: 1 << 26 });
  let head = fs.readFileSync(file, 'utf8');
  if (CONTROL && file.endsWith('nbaEarnedDraft.ts')) {
    const anchor = 'export function nbaDraftHost(ctx: NbaDraftHostCtx)';
    if (head.split(anchor).length !== 2) { console.error('diffproof control cannot run: anchor not found once'); process.exit(2); }
    head = head.replace(anchor, `${anchor} `);
  }
  for (const name of names) {
    const a = extract(base, name);
    const b = extract(head, name);
    if (a === null) { console.error(`diffproof: ${name} is not in ${file} at ${BASE}`); process.exit(2); }
    compared += 1;
    if (a !== b) { red += 1; console.log(`  DIFFERS: ${file} ${name}`); }
    else console.log(`  same: ${file} ${name} (${a.split('\n').length} lines)`);
  }
}
console.log(red ? `diffproof: red, ${red} of ${compared} declarations differ from ${BASE}` : `diffproof: green, ${compared} declarations byte for byte ${BASE}'s`);
process.exit(red ? 1 : 0);
