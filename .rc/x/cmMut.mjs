/* Reviewer cm, Release AV: one small mutation of the runner's own checkout (never of the branch).
 * usage: node .rc/x/cmMut.mjs <name>     then the harness, then: git checkout -- src scripts
 * Refuses (exit 2) unless the text it replaces is in the file exactly once. */
import fs from 'node:fs';

const BOOK = 'src/lib/clubManagerLeagueBook.ts';
const ENGINE = 'src/lib/clubManager.ts';
const VAR = 'src/lib/clubManagerVar.ts';
const MUTS = {
  /* the book's weight: the scorer is picked by position alone, his rating is not read */
  ratingblind: [BOOK, ': pickWeighted(outfield, m => goalWeight(m.p, m.r), scorerRoll);', ': pickWeighted(outfield, m => goalWeight(m.p, 70), scorerRoll);'],
  /* the keyed stream: the assist of a goal against me is rolled on the seeded match stream */
  assistrandom: [BOOK, '  return assistFrom(keyedRng(key), scorer, onPitch, rules);', '  return assistFrom(Math.random, scorer, onPitch, rules);'],
  /* the keyed stream: the key no longer says which match, club, season or save it is */
  thinkey: [ENGINE, "  `cmbook|${state.eraId ?? 'now'}|${state.clubName}|${state.season}|${book.s}|${round}|${home}|${away}|${hg}-${ag}`;", '  `cmbook|${round}|${hg}-${ag}`;'],
  /* the coverage read: a competition the ledger does not cover has reviews */
  coverall: [VAR, '  if (!from) return false;', '  if (!from) return true;'],
  /* the coverage read: the stage a cup's coverage starts at is not read */
  coverstage: [VAR, '  return at >= 0 && first >= 0 && at >= first;', '  return true;'],
  /* the book's weight: assists are shared by the goal weight, not the flatter assist weight */
  assistgoalweight: [BOOK, 'm => assistWeight(m.p, m.r), pick);', 'm => goalWeight(m.p, m.r), pick);'],
};
const name = process.argv[2];
if (name === 'dry') {
  for (const [k, [f, from]] of Object.entries(MUTS)) console.log(`${k}: ${fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n').split(from).length - 1} time(s) in ${f}`);
  process.exit(0);
}
if (!Object.hasOwn(MUTS, name)) { console.error(`cmMut: unknown mutation ${name}`); process.exit(2); }
const [file, from, to] = MUTS[name];
const text = fs.readFileSync(file, 'utf8');
const n = text.split(from).length - 1;
if (n !== 1) { console.error(`cmMut: ${name} refused: its text is in ${file} ${n} times, not once`); process.exit(2); }
fs.writeFileSync(file, text.replace(from, () => to));
console.log(`cmMut: ${name} applied to ${file}`);
