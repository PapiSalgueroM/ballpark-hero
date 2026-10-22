/* Fixer, Round 1540: one mutation that undoes one review fix, applied in place on the runner's checkout (the request
   line restores it with git checkout in the same line). Each anchor must be present exactly once, or the script
   exits 2 and nothing is changed. Usage: node fix-mut.mjs <name> [--check] */
import fs from 'node:fs';

const MUTS = {
  /* run m6: his board sorted by the true rating, not his scout's read */
  sort: ['src/components/nba-front-office/NbaFrontOfficeBoard.tsx',
    'const board = [...draftClass].sort((a, b) => gradeOf(b) - gradeOf(a) || a.id.localeCompare(b.id)).slice(0, 14);',
    'const board = [...draftClass].sort((a, b) => b.trueOvr - a.trueOvr || a.id.localeCompare(b.id)).slice(0, 14);'],
  /* run m2: the press handed the live league, not a copy (brief 3.10 trap) */
  nocopy: ['src/components/nba-front-office/NbaFrontOfficeBoard.tsx',
    'const lg: NbaLeague = JSON.parse(JSON.stringify(league));\n    const press = go(lg, desk, draftClass);',
    'const lg: NbaLeague = league;\n    const press = go(lg, desk, draftClass);'],
  /* read m1: the refusal line drawn on the clock only, as before the fix */
  errline: ['src/components/front-office-shared/GmEarnedDraftScreen.tsx',
    "{stage !== 'clock' && error && <p role=\"alert\" className=\"text-xs text-destructive\">{error}</p>}",
    ''],
  /* run m3: "a" before every share, as before the fix */
  article: ['src/lib/gmEarnedDraft.ts',
    'By the table it has ${shareArticle(mine.first)} ${mine.first} chance',
    'By the table it has a ${mine.first} chance'],
  /* read m2: the screen's own "Lottery night first." for every sport, as before the fix */
  lotteryline: ['src/components/front-office-shared/GmEarnedDraftScreen.tsx',
    '{lotteryLine && <p className="mt-1 text-xs text-muted-foreground">{lotteryLine}</p>}',
    '<p className="mt-1 text-xs text-muted-foreground">Lottery night first.</p>'],
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
