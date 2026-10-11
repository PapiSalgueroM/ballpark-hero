/* Round 1305, a runner side control maker (never committed): writes a copy of the NFL front office board with ONE
   named mutation to dist/.r1305/Board.<name>.tsx and prints its path. The string a mutation replaces must be in the
   board exactly once, or this exits 3 and writes nothing: a control that changes nothing proves nothing. */
import fs from 'node:fs';
import path from 'node:path';

const BOARD = 'src/components/front-office/FrontOfficeBoard.tsx';
const MUTATIONS = {
  /* a title counts double: the title cases of the one press test must go red, the others stay green */
  titles: [['const newTitles = titles + (won ? 1 : 0);', 'const newTitles = titles + (won ? 2 : 0);']],
  /* the trainer forgotten on the final week: only desk on cases can go red */
  noedges: [['const games = lg.schedule[lg.week - 1].map(g => (deskWeek ? simGame(g, lg.teams, Math.random, deskWeek.edges) : simGame(g, lg.teams, Math.random)));', 'const games = lg.schedule[lg.week - 1].map(g => simGame(g, lg.teams, Math.random));']],
  /* step c: the log is not saved */
  nolog: [['...(gameLogLive.current ? { gameLog: gameLogLive.current } : {}),', '']],
  /* step c: the log is not cleared when a new franchise starts */
  startkeeps: [['setGameLog(null); /* a new franchise */', '/* a new franchise */']],
  /* step c: the log is not cleared when he abandons */
  resetkeeps: [['setGameLog(null); /* abandoned */', '/* abandoned */']],
  /* step c: the log is not cleared by the summer */
  summerkeeps: [['setGameLog(null); /* the summer */', '/* the summer */']],
  /* step c: the one press postseason keeps the engine scores in the save */
  enginescores: [['const toldRounds = ', 'const toldRoundsUnused = '], ['postseason: { rounds: toldRounds, champion: champ, gradeLine: gradeVerdict }', 'postseason: { rounds, champion: champ, gradeLine: gradeVerdict }']],
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
