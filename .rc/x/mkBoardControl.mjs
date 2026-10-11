/* Round 1305, a runner side control maker (never committed): writes a copy of the NFL front office board with ONE
   named mutation to dist/.r1305/Board.<name>.tsx and prints its path. Every string a mutation replaces must be in the
   board exactly once, or this exits 3 and writes nothing: a control that changes nothing proves nothing. */
import fs from 'node:fs';
import path from 'node:path';

const BOARD = 'src/components/front-office/FrontOfficeBoard.tsx';
const MUTATIONS = {
  /* a title counts double: the title cases of the one press test must go red, the others stay green */
  titles: [['const newTitles = titles + (won ? 1 : 0);', 'const newTitles = titles + (won ? 2 : 0);']],
  /* the staff's edge dropped from the week's games (printed, not required: a fresh desk's edge may flip no game) */
  noedges: [['const games = lg.schedule[lg.week - 1].map(g => (deskWeek ? simGame(g, lg.teams, Math.random, deskWeek.edges) : simGame(g, lg.teams, Math.random)));', 'const games = lg.schedule[lg.week - 1].map(g => simGame(g, lg.teams, Math.random));']],
  /* the log is not saved */
  nolog: [['...(gameLogLive.current ? { gameLog: gameLogLive.current } : {}),', '']],
  /* the log is cleared neither by Abandon nor by a new franchise (each alone is masked by the other: two keys, one lock) */
  abandonkeeps: [['setGameLog(null); /* a new franchise */', '/* a new franchise */'], ['setGameLog(null); /* abandoned */', '/* abandoned */']],
  startkeeps: [['setGameLog(null); /* a new franchise */', '/* a new franchise */']],
  resetkeeps: [['setGameLog(null); /* abandoned */', '/* abandoned */']],
  /* the log is not cleared by the summer */
  summerkeeps: [['setGameLog(null); /* the summer */', '/* the summer */']],
  /* the one press postseason keeps the engine's own scores in the save */
  enginescores: [['closeSeason(lg, toldRounds, champ);', 'closeSeason(lg, rounds, champ);']],
  /* step d1: the lifted close forgets to count the season */
  noseason: [['const newSeasons = seasonsPlayed + 1;', 'const newSeasons = seasonsPlayed;']],
  /* the week's grid shows the engine's own scores */
  weekengine: [['setWeekResults(told.map(t => t.game));', 'setWeekResults(games);']],
  /* his game is told without the staff's edge */
  tellnoedges: [['nflTell(g, lg.teams, lg.season, nflWhere(lg.week), deskWeek?.edges)', 'nflTell(g, lg.teams, lg.season, nflWhere(lg.week))']],
  /* a log that does not read refuses the save (the opposite of ruling C3) */
  refusesave: [['setGameLog(readGmGameLog(s.gameLog, id => Object.prototype.hasOwnProperty.call(s.league.teams, id), s.league.season, s.myTeam));', "{ const l = readGmGameLog(s.gameLog, id => Object.prototype.hasOwnProperty.call(s.league.teams, id), s.league.season, s.myTeam); if (s.gameLog !== undefined && !l) { setSaveError(true); return; } setGameLog(l); }"]],
  /* a log that does not read is kept as it is (the reader skipped) */
  trustlog: [['setGameLog(readGmGameLog(s.gameLog, id => Object.prototype.hasOwnProperty.call(s.league.teams, id), s.league.season, s.myTeam));', 'setGameLog((s.gameLog ?? null) as GmGameLog | null);']],
  /* step d1: the season is closed twice */
  closetwice: [['closeSeason(lg, toldRounds, champ);', 'closeSeason(lg, toldRounds, champ); closeSeason(lg, toldRounds, champ);']],
};

const name = process.argv[2];
if (!MUTATIONS[name]) { console.error(`unknown mutation ${name} (${Object.keys(MUTATIONS).join(', ')})`); process.exit(3); }
let src = fs.readFileSync(BOARD, 'utf8').split('\r\n').join('\n');
for (const [from, to] of MUTATIONS[name]) {
  const hits = src.split(from).length - 1;
  if (hits !== 1) { console.error(`mutation ${name}: its string is in the board ${hits} times, it must be there exactly once: ${from.slice(0, 90)}`); process.exit(3); }
  src = src.replace(from, () => to);
}
const dir = path.resolve('dist', '.r1305');
fs.mkdirSync(dir, { recursive: true });
const out = path.join(dir, `Board.${name}.tsx`);
fs.writeFileSync(out, src);
console.log(out);
