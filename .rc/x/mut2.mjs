/* Reviewer's second set of mutations for Round 1223 (runner only; `--check` reads and writes nothing).
 * A mutation here is a LIST of rewrites, so one idea that takes two lines (hockey without its overtime losses) is one mutant. */
import fs from 'node:fs';
import path from 'node:path';

const HOST = 'src/lib/gmDeskHost.ts';
const NHL = 'src/lib/gmDeskHostNhl.ts';

const MUTS = {
  /* Hockey read as if an overtime loss were not a game played: the win share XP is paid on. */
  nhlgames: [
    [NHL, 'const games = t.wins + t.losses + t.otLosses;', 'const games = t.wins + t.losses;'],
    [NHL, 'losses: t.losses + t.otLosses,', 'losses: t.losses,'],
  ],
  /* B14: a record built from an old save prints an arrival tier nobody knows. */
  tierunknown: [[HOST, 'const unknown = i === 0 && seat.before?.tierUnknown === true;', 'const unknown = false;']],
  /* The year out no longer keeps his XP block out of a step's reach. */
  awayxp: [
    [HOST, '  delete blocks[GM_HOST_KEYS.xp];\n', ''],
    [HOST, '  if (Object.prototype.hasOwnProperty.call(a.desk.blocks, GM_HOST_KEYS.xp)) blocks[GM_HOST_KEYS.xp] = a.desk.blocks[GM_HOST_KEYS.xp];\n', ''],
  ],
  /* XP from facts of a save: the playoff rounds he won are dropped at the verdict. */
  verdictrounds: [[HOST, 'wonTitle: i.outcome.wonTitle, playoffRoundsWon: i.outcome.roundsWon,', 'wonTitle: i.outcome.wonTitle, playoffRoundsWon: 0,']],
  /* The facts under an offer: the roster rank is the standings place instead. */
  rankplace: [[HOST, 'facts[o.teamId] = { strengthRank: strengthRank(strengths, c.id), record:', 'facts[o.teamId] = { strengthRank: c.place, record:']],
  /* The close pays XP on a win share of wins over wins plus losses read off the wrong field. */
  closegames: [[HOST, 'winPct: f.games > 0 ? f.wins / f.games : 0,', 'winPct: f.games > 0 ? f.wins / (f.games + 1) : 0,']],
};

const read = f => fs.readFileSync(path.resolve(f), 'utf8').replaceAll('\r\n', '\n');
function plan(name) {
  const edits = MUTS[name];
  const next = new Map();
  for (const [file, from, to] of edits) {
    const src = next.get(file) ?? read(file);
    const n = src.split(from).length - 1;
    if (n !== 1) return { bad: `${name}: an anchor is in ${file} ${n} times, not once (${from.slice(0, 50)})` };
    next.set(file, src.replace(from, to));
  }
  return { next };
}

const arg = process.argv[2];
if (arg === '--check') {
  const bad = Object.keys(MUTS).map(n => plan(n).bad).filter(Boolean);
  for (const b of bad) console.log(`ANCHOR ${b}`);
  console.log(`mut2.mjs: ${Object.keys(MUTS).length} mutations checked, ${bad.length} cannot run`);
  process.exit(bad.length ? 1 : 0);
}
if (!MUTS[arg]) { console.log(`no such mutation: ${arg}`); process.exit(9); }
const p = plan(arg);
if (p.bad) { console.log(`CANNOT APPLY ${p.bad}`); process.exit(9); }
for (const [file, text] of p.next) fs.writeFileSync(path.resolve(file), text);
console.log(`MUTATION ON: ${arg} in ${[...p.next.keys()].join(', ')}`);
