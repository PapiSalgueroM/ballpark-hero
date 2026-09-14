/**
 * simUfcFacts: the two UFC fighter tables must agree with themselves and with
 * each other.
 *
 * WHY THIS EXISTS. Rank 8 of docs/audits/data-provenance-inventory-2026-09-11.md:
 * "ufcFighters.ts (112), ufcChainData.ts (64) ... the two UFC files duplicate
 * records with no cross check". Two files, written at different times, each
 * carrying a fighter's record and weight class, each feeding a game that can
 * ask a player about it. Nothing compared them, so the site could answer the
 * same question two ways depending on which game you opened. It already did:
 * Randy Couture was Heavyweight in one and Light Heavyweight in the other.
 *
 * WHAT IT CHECKS, and why these checks and not "is this fighter real".
 * Every row here is a hand typed fact and this harness has no network, so it
 * cannot tell you that a record is the one the promotion publishes. What it
 * CAN do is refuse the two failure modes that need no outside source:
 *
 *   1. A fact stated twice in one row and disagreeing with itself. The record
 *      string "28-1-0" is wins, losses and draws already typed three fields
 *      along, and "2008-2026" is yearsActiveStart and yearsActiveEnd. A table
 *      that says a thing the row can compute is derived, never typed, so when
 *      the two disagree at least one of them is wrong and no source is needed
 *      to know it.
 *   2. A fact stated twice in two files and disagreeing across them. Same
 *      argument, and this is the one the inventory named.
 *
 * Plus the smell list entries that are arithmetic rather than opinion: more
 * finishes than wins, a negative count, a pay per view rank below one, a
 * career that ends before it starts or runs past today, an age that would
 * have the fighter debuting as a child, and the same name twice in one pool.
 *
 * WHAT IT DOES NOT DO. It does not assert that any number is correct. That
 * needs two published sources and belongs in the same re-verification pass
 * rank 8 asks for. This harness is the floor under that work, not a
 * substitute for it, and a green run means "consistent", never "verified".
 *
 * DO NOT USE public.mma_fighter_careers AS THE SECOND SOURCE. It has 86 rows,
 * nothing in the site reads it, and it looks like exactly what this work
 * needs until you query it. Measured 2026-09-13: 15 of the 86 rows claim more
 * knockouts plus submissions plus decisions than they claim wins, which is
 * impossible; 63 of 86 have a weight_class that is a prose career history
 * with reference markers still in it ("Light heavyweight (2008-2020) [ 4 ]")
 * rather than a division; 71 of 86 have no nationality and 74 have no draws.
 * Spot checks of the rest: Conor McGregor 1-0, Stipe Miocic 5-5, Michael
 * Bisping 2-9, Ronda Rousey 3-0, Dricus du Plessis 33-0 with 30 knockouts.
 * It is a half captured scrape, not a source, and importing it would replace
 * hand typed numbers that are at least self consistent with numbers that are
 * not. It stays in the database because deleting a table nobody reads is a
 * separate decision; this note exists so the next person to find it does not
 * lose an afternoon to it the way this round nearly did.
 *
 * CONTROLS (each rewrites the source text and refuses to run if the rewrite
 * changed nothing):
 *   UFC_CONTROL=record     a record string no longer matches its own fields
 *   UFC_CONTROL=crossfile  a weight class changed in one file only
 *   UFC_CONTROL=finishes   more knockouts than wins
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.UFC_CONTROL || '';
const THIS_YEAR = new Date().getFullYear();
const FIGHTERS = 'src/data/ufcFighters.ts';
const CHAIN = 'src/data/ufcChainData.ts';

let failures = 0;
const fired = new Set();
const fail = (n, msg) => { fired.add(n); console.error('  FAIL: ' + msg); failures += 1; };

const rewrite = (src, from, to, what) => {
  if (!src.includes(from)) {
    console.error(`CONTROL ${CONTROL} cannot run: ${what} not found in the source.`);
    console.error('The control is stale, so this run would have been green for the wrong reason.');
    process.exit(2);
  }
  return src.replace(from, to);
};

/* Rows are one object literal per line in both files. Comments are stripped
   first: the prose above each block names weight classes, and a comment that
   happens to hold a "name:" pair would be read as a fighter. */
const parseRows = (src, arrayName) => {
  const start = src.indexOf(arrayName);
  const body = src.slice(start).replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(?<!:)\/\/[^\n]*/g, ' ');
  const rows = [];
  for (const m of body.matchAll(/\{([^{}]*)\}/g)) {
    const row = {};
    for (const f of m[1].matchAll(/(\w+):\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"|(-?\d+)|(true|false))/g)) {
      row[f[1]] = f[2] ?? f[3] ?? (f[4] !== undefined ? Number(f[4]) : f[5] === 'true');
    }
    if (row.name) rows.push(row);
  }
  return rows;
};

let fighterSrc = fs.readFileSync(path.join(ROOT, FIGHTERS), 'utf8');
let chainSrc = fs.readFileSync(path.join(ROOT, CHAIN), 'utf8');

if (CONTROL === 'record') {
  fighterSrc = rewrite(fighterSrc, `record: '28-1-0', wins: 28`, `record: '27-1-0', wins: 28`,
    "Jon Jones' record string");
}
if (CONTROL === 'crossfile') {
  chainSrc = rewrite(chainSrc, `{ name: 'Israel Adesanya', weightClass: 'Middleweight'`,
    `{ name: 'Israel Adesanya', weightClass: 'Welterweight'`, "Adesanya's weight class in the chain file");
}
if (CONTROL === 'finishes') {
  fighterSrc = rewrite(fighterSrc, `wins: 29, losses: 0, draws: 0, age: 37, koTko: 8`,
    `wins: 29, losses: 0, draws: 0, age: 37, koTko: 80`, "Khabib's knockout count");
}

const fighters = parseRows(fighterSrc, 'export const ufcFighters');
const chain = parseRows(chainSrc, 'export const UFC_FIGHTERS');
console.log(`Parsed ${fighters.length} rows from ${FIGHTERS} and ${chain.length} from ${CHAIN}`);
if (fighters.length < 100 || chain.length < 50) {
  fail(-1, `parsed too few rows (${fighters.length} and ${chain.length}), so the parse is broken and nothing below means anything`);
}

const WEIGHT_CLASSES = new Set(['Strawweight', 'Flyweight', 'Bantamweight', 'Featherweight',
  'Lightweight', 'Welterweight', 'Middleweight', 'Light Heavyweight', 'Heavyweight']);

// ---------------------------------------------------------------------------
console.log('\n--- 1. every record string matches the wins, losses and draws beside it ---');
for (const [file, rows] of [[FIGHTERS, fighters], [CHAIN, chain]]) {
  let checked = 0;
  for (const f of rows) {
    if (typeof f.record !== 'string' || f.wins === undefined) continue;
    checked += 1;
    const want = `${f.wins}-${f.losses}-${f.draws}`;
    if (f.record !== want) fail(1, `${file}: ${f.name} says record "${f.record}" and ${want} in the same row`);
  }
  if (!checked) fail(1, `${file}: no row carried both a record string and a win count, so this section checked nothing`);
  else console.log(`  ${file}: ${checked} records agree with their own fields`);
}

// ---------------------------------------------------------------------------
console.log('\n--- 2. careers and ages are arithmetically possible ---');
let yearsChecked = 0;
for (const f of fighters) {
  if (f.yearsActiveStart === undefined) continue;
  yearsChecked += 1;
  const want = `${f.yearsActiveStart}-${f.yearsActiveEnd}`;
  if (f.yearsActive !== want) fail(2, `${FIGHTERS}: ${f.name} says yearsActive "${f.yearsActive}" and ${want} in the same row`);
  if (f.yearsActiveEnd < f.yearsActiveStart) fail(2, `${FIGHTERS}: ${f.name} ends in ${f.yearsActiveEnd}, before starting in ${f.yearsActiveStart}`);
  if (f.yearsActiveEnd > THIS_YEAR) fail(2, `${FIGHTERS}: ${f.name} is active until ${f.yearsActiveEnd}, which has not happened yet`);
  // Nobody debuts in a professional promotion at fifteen.
  const ageAtDebut = f.age - (THIS_YEAR - f.yearsActiveStart);
  if (ageAtDebut < 16) fail(2, `${FIGHTERS}: ${f.name} is ${f.age} and started in ${f.yearsActiveStart}, which makes the debut age ${ageAtDebut}`);
}
if (!yearsChecked) fail(2, `${FIGHTERS}: no row carried a start year, so this section checked nothing`);
else console.log(`  ${yearsChecked} careers start before they end, end by ${THIS_YEAR}, and imply a debut at 16 or older`);

// ---------------------------------------------------------------------------
console.log('\n--- 3. counts that cannot exceed each other, do not ---');
let countChecked = 0;
for (const f of fighters) {
  if (f.koTko === undefined) continue;
  countChecked += 1;
  if (f.koTko + f.submissions > f.wins) {
    fail(3, `${FIGHTERS}: ${f.name} has ${f.koTko} knockouts and ${f.submissions} submissions, which is more than his ${f.wins} wins`);
  }
  for (const k of ['wins', 'losses', 'draws', 'koTko', 'submissions', 'age']) {
    if (f[k] < 0) fail(3, `${FIGHTERS}: ${f.name} has a negative ${k} (${f[k]})`);
  }
  if (f.highestP4PRank < 1) fail(3, `${FIGHTERS}: ${f.name} has a pound for pound rank of ${f.highestP4PRank}, and there is no rank below one`);
}
if (!countChecked) fail(3, `${FIGHTERS}: no row carried a finish count, so this section checked nothing`);
else console.log(`  ${countChecked} fighters have no more finishes than wins and no negative counts`);

// ---------------------------------------------------------------------------
console.log('\n--- 4. no fighter appears twice in one pool, and every weight class is a real one ---');
for (const [file, rows] of [[FIGHTERS, fighters], [CHAIN, chain]]) {
  const seen = new Map();
  for (const f of rows) {
    if (seen.has(f.name)) fail(4, `${file}: ${f.name} appears twice`);
    seen.set(f.name, f);
    if (!WEIGHT_CLASSES.has(f.weightClass)) fail(4, `${file}: ${f.name} is in "${f.weightClass}", which is not a weight class`);
  }
  console.log(`  ${file}: ${seen.size} distinct fighters, all in real weight classes`);
}

// ---------------------------------------------------------------------------
/* The one honest exception, and it is worth reading before adding to it.
   The two weightClass fields answer different questions. In ufcFighters.ts it
   is the division the fighter is guessed as, and the file uses the last one
   they competed in. In ufcChainData.ts it is the division whose CHAIN the
   fighter belongs to, and the chain game's weight class mode filters the
   whole graph by it, so retagging a fighter deletes them from that division's
   chain and breaks every route through them.

   For a fighter who genuinely fought in two divisions both answers are true,
   so forcing them equal would not fix a wrong fact, it would break a working
   game to make a harness quiet. These four are declared instead: both
   divisions named, and the harness checks the declared pair is exactly the
   pair observed and that the two are neighbours in WEIGHT_CLASS_ORDER,
   because a fighter moves to the division next door and a typo usually does
   not. Anything undeclared still fails. */
const WEIGHT_CLASS_ORDER = ['Strawweight', 'Flyweight', 'Bantamweight', 'Featherweight',
  'Lightweight', 'Welterweight', 'Middleweight', 'Light Heavyweight', 'Heavyweight'];
const MULTI_DIVISION = {
  'Randy Couture': { fighters: 'Heavyweight', chain: 'Light Heavyweight', why: 'held titles in both' },
  'Frankie Edgar': { fighters: 'Bantamweight', chain: 'Featherweight', why: 'dropped from lightweight through featherweight to bantamweight' },
  'Deiveson Figueiredo': { fighters: 'Bantamweight', chain: 'Flyweight', why: 'flyweight champion, then moved up' },
  'Henry Cejudo': { fighters: 'Bantamweight', chain: 'Flyweight', why: 'held titles in both' },
};

console.log('\n--- 5. the two files agree about the fighters they both carry ---');
const byName = new Map(fighters.map(f => [f.name, f]));
let shared = 0;
const usedDeclarations = new Set();
for (const c of chain) {
  const f = byName.get(c.name);
  if (!f) continue;
  shared += 1;
  for (const field of ['record', 'wins', 'losses', 'draws']) {
    if (c[field] !== f[field]) {
      fail(5, `${c.name}: ${field} is ${JSON.stringify(f[field])} in ${FIGHTERS} and ${JSON.stringify(c[field])} in ${CHAIN}`);
    }
  }
  if (c.weightClass === f.weightClass) continue;
  const declared = MULTI_DIVISION[c.name];
  if (!declared) {
    fail(5, `${c.name}: weightClass is "${f.weightClass}" in ${FIGHTERS} and "${c.weightClass}" in ${CHAIN}, and nothing says why`);
    continue;
  }
  usedDeclarations.add(c.name);
  if (declared.fighters !== f.weightClass || declared.chain !== c.weightClass) {
    fail(5, `${c.name} is declared as ${declared.fighters} / ${declared.chain} but the files now say ${f.weightClass} / ${c.weightClass}, so the declaration is covering a different disagreement than the one it was written for`);
    continue;
  }
  const gap = Math.abs(WEIGHT_CLASS_ORDER.indexOf(declared.fighters) - WEIGHT_CLASS_ORDER.indexOf(declared.chain));
  if (gap !== 1) {
    fail(5, `${c.name} is declared in ${declared.fighters} and ${declared.chain}, which are ${gap} divisions apart, not neighbours`);
  }
}
const unusedDeclarations = Object.keys(MULTI_DIVISION).filter(n => !usedDeclarations.has(n));
if (unusedDeclarations.length) {
  fail(5, `declared as two division fighters but no longer disagreeing across the files: ${unusedDeclarations.join(', ')}. Delete the declaration, do not leave it standing.`);
} else {
  console.log(`  ${Object.keys(MULTI_DIVISION).length} two division fighters declared, each a move to the division next door: ` +
    Object.entries(MULTI_DIVISION).map(([n, d]) => `${n} (${d.chain} to ${d.fighters}, ${d.why})`).join('; '));
}
if (!shared) fail(5, 'not one fighter appears in both files, so this section checked nothing and the inventory\'s "the two files duplicate records" is no longer true');
else console.log(`  ${shared} fighters are in both files`);

// ---------------------------------------------------------------------------
const EXPECT = { record: 1, crossfile: 5, finishes: 3 };
if (CONTROL) {
  const want = EXPECT[CONTROL];
  if (want === undefined) { console.error(`Unknown UFC_CONTROL "${CONTROL}"`); process.exit(2); }
  if (fired.has(want)) { console.log(`\nCONTROL ${CONTROL}: section ${want} fired, as it must.`); process.exit(0); }
  console.error(`\nCONTROL ${CONTROL}: section ${want} did NOT fire. The check is not measuring what it claims to.`);
  process.exit(1);
}
if (failures) { console.error(`\nsimUfcFacts: ${failures} failure(s)`); process.exit(1); }
console.log('\nsimUfcFacts: both UFC tables are internally consistent and agree with each other. This says consistent, not verified.');
