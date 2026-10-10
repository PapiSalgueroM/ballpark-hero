/**
 * Keeps scripts/data/cmAgesBasis2026.json in step with the 2026 squads file
 * (src/data/clubManagerRosters.ts) UNTIL THE BAKE OWNS IT. Round 1214, fix pass.
 *
 * WHY IT EXISTS. The basis file holds one entry a squad man, in squad order:
 * [table age, table year, table id, basis, (birth date for born), value rating], and
 * src/test/cmValueCurve.test.ts holds the squads file to it man for man. The bake that
 * will write the file (scripts/bakeClubManagerRosters.mjs) only learns to in the round
 * that re-rates the 2026 squads. Until then ANY round that moves, drops, re-orders or
 * re-values a 2026 man turns that test red, and this script is the remedy:
 *
 *   node scripts/genCmAgesBasis2026.mjs --from <rev>             what would change (exit 1 when anything would)
 *   node scripts/genCmAgesBasis2026.mjs --from <rev> --write     write the file
 *   ... --rows <file.json>    table rows for men the squads file GAINED
 *
 * <rev> is a commit where the two files were still in step (the commit before the
 * squads changed; HEAD when only a ledger changed). A man's table row goes where he
 * goes: he is carried by club and name, then by name alone when exactly one man of that
 * name is left on each side. A NEW man has no table row here and the script refuses to
 * guess one: read his row in the value table (age, year, id) and pass it with --rows as
 * [{ "name", "club", "age", "year", "id" }]. Each line's basis is then resolved again
 * from the three committed birth ledgers by the rule in scripts/lib/cmAges.mjs.
 *
 * It prints the three counts the test restates (how each age is known, how far the
 * August age sits from the shipped age, how many ratings the age read would move), so
 * the test's numbers can follow a real change. It never touches the squads file.
 * Once CM_ROSTER_META says curve 2 the bake owns the basis file and this script refuses.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { rateFrom } from './lib/cmValueCurve.mjs';
import { buildBirths, augustAge2026 } from './lib/cmAges.mjs';
import { DB_TO_ENGINE } from './lib/dbClubNames.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SQUADS = 'src/data/clubManagerRosters.ts';
const BASIS = 'scripts/data/cmAgesBasis2026.json';
const args = process.argv.slice(2);
const arg = flag => (args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined);
const from = arg('--from') ?? 'HEAD';
const stop = (text) => { console.error(`genCmAgesBasis2026: ${text}`); process.exit(1); };

const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const readJson = file => JSON.parse(read(file));
const atRev = file => execFileSync('git', ['show', `${from}:${file}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
/** The squads object out of the generated file: clubs in file order, men in squad order. */
const squadsOf = (text) => {
  const start = text.indexOf('export const CM_ROSTERS');
  const open = text.indexOf('{', text.indexOf('=', start));
  const close = text.indexOf('\n};', open);
  if (start < 0 || open < 0 || close < 0) stop(`${SQUADS} is not the shape this script reads`);
  return new Function(`return ${text.slice(open, close + 2)}`)();
};
const write = doc => `{\n  "about": ${JSON.stringify(doc.about)},\n  "asOf": ${JSON.stringify(doc.asOf)},\n  "players": ${doc.players},\n  "clubs": {\n${Object.entries(doc.clubs).map(([club, men]) => `    ${JSON.stringify(club)}: ${JSON.stringify(men)}`).join(',\n')}\n  }\n}\n`;

const squadsText = read(SQUADS);
const meta = squadsText.slice(squadsText.indexOf('export const CM_ROSTER_META'), squadsText.indexOf('export const CM_ROSTERS'));
if (/\bcurve:\s*2\b/.test(meta)) stop('the squads file is on curve 2, so the bake owns the basis file now and this script must not write it');
const now = squadsOf(squadsText);
const committed = read(BASIS);
const oldSquads = squadsOf(atRev(SQUADS));
const oldBasisText = atRev(BASIS).replace(/\r\n/g, '\n');
const oldBasis = JSON.parse(oldBasisText);
if (write(oldBasis) !== oldBasisText) stop(`the writer does not reproduce ${BASIS} at ${from} byte for byte, so the format drifted`);

/* 1. every table row known at <rev>, by the man it belongs to */
const known = [];
for (const [club, lines] of Object.entries(oldBasis.clubs)) {
  const men = oldSquads[club];
  if (!men || men.length !== lines.length) stop(`at ${from} the two files are not in step at ${club} (${men?.length ?? 'no'} men, ${lines.length} basis lines): give an older --from`);
  lines.forEach((line, i) => known.push({ club, name: men[i].n, row: line.slice(0, 3), used: false }));
}
const given = arg('--rows') ? JSON.parse(fs.readFileSync(arg('--rows'), 'utf8')) : [];

/* 2. carry each row to where its man is now: same club and name first, then the name alone */
const wanted = [];
for (const [club, men] of Object.entries(now)) men.forEach((man, i) => wanted.push({ club, i, man, row: null }));
for (const w of wanted) {
  const hit = known.find(k => !k.used && k.club === w.club && k.name === w.man.n);
  if (hit) { hit.used = true; w.row = hit.row; }
}
const moved = [];
for (const w of wanted.filter(x => !x.row)) {
  const left = known.filter(k => !k.used && k.name === w.man.n);
  const alike = wanted.filter(x => !x.row && x.man.n === w.man.n);
  if (left.length === 1 && alike.length === 1) { left[0].used = true; w.row = left[0].row; moved.push(`${w.man.n}: ${left[0].club} to ${w.club}`); }
}
for (const w of wanted.filter(x => !x.row)) {
  const hit = given.find(g => g.name === w.man.n && g.club === w.club);
  if (hit) w.row = [hit.age, hit.year, hit.id];
}
const lost = wanted.filter(w => !w.row).map(w => `${w.man.n} at ${w.club}`);
if (lost.length) {
  stop(`${lost.length} squad men have no table row to carry (new to the squads file, or one of two namesakes who both moved). Read each man's row in the value table and pass it with --rows:\n  ${lost.join('\n  ')}`);
}

/* 3. resolve every line again from the three committed birth ledgers */
const births = buildBirths({
  ledgerRows: readJson('scripts/data/cmBirthDates2026.json').rows,
  round669: readJson('scripts/data/defensiveMidfield2026.json'),
  missing: readJson('scripts/data/window2026/missingPlayers.json'),
  dbToEngine: DB_TO_ENGINE,
});
const out = { about: JSON.parse(committed).about, asOf: oldBasis.asOf, players: 0, clubs: {} };
const basisCount = {};
const againstShipped = {};
let changed = 0;
const notes = [];
for (const w of wanted) {
  const [age, year, id] = w.row;
  const got = augustAge2026({ name: w.man.n, club: w.club, age, year, id }, births);
  if (got.note) notes.push(got.note);
  if (got.basis === 'unknown') stop(`${w.man.n} at ${w.club} has no table row id: a man with no table row may not ship`);
  (out.clubs[w.club] ??= []).push(got.basis === 'born' ? [age, year, id, 'born', got.born, w.man.r] : [age, year, id, got.basis, w.man.r]);
  out.players += 1;
  basisCount[got.basis] = (basisCount[got.basis] ?? 0) + 1;
  const step = String(got.age - w.man.a);
  againstShipped[step] = (againstShipped[step] ?? 0) + 1;
  if (rateFrom(w.man.r, got.age, w.man.p) !== w.man.r) changed += 1;
}

/* 4. say what moved, then write or refuse */
const text = write(out);
const was = JSON.parse(committed).clubs;
const differ = Object.keys({ ...was, ...out.clubs }).filter(club => JSON.stringify(was[club]) !== JSON.stringify(out.clubs[club]));
const dropped = known.filter(k => !k.used).map(k => `${k.name} at ${k.club}`);
console.log(`genCmAgesBasis2026: ${out.players} men at ${Object.keys(out.clubs).length} clubs, carried from ${from}; ${moved.length} found at another club, ${given.length} rows given, ${dropped.length} table rows no longer used`);
for (const line of [...moved.map(m => `moved  ${m}`), ...dropped.map(d => `gone   ${d}`)].slice(0, 40)) console.log(`  ${line}`);
/* a ledger man who changed clubs shows here: move his ledger row's club, or his date is not read */
console.log(`  ${notes.length} men share a name with a dated man at another club and keep the table's age`);
for (const note of notes.slice(0, 12)) console.log(`    ${note}`);
console.log(`  the test's three counts: basisCount ${JSON.stringify(basisCount)}, againstShipped ${JSON.stringify(againstShipped)}, changed ${changed}`);
if (text === committed.replace(/\r\n/g, '\n')) { console.log('genCmAgesBasis2026: in step, nothing to write'); process.exit(0); }
console.log(`  ${differ.length} clubs differ from the file on disk: ${differ.slice(0, 12).join(', ')}${differ.length > 12 ? ', ...' : ''}`);
if (!args.includes('--write')) stop('the basis file is out of step with the squads file and the ledgers. Run again with --write, then update the counts in src/test/cmValueCurve.test.ts if they moved');
fs.writeFileSync(path.join(ROOT, BASIS), text);
console.log(`genCmAgesBasis2026: wrote ${BASIS}`);
