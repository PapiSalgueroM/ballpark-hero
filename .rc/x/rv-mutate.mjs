/* Reviewer mutation tool (never committed): node .rc/x/rv-mutate.mjs <id>
   Applies ONE small mutation to the checkout by exact string replacement and refuses when the string is not there exactly once. */
import fs from 'node:fs';

const NFL = 'src/lib/season/nfl.ts';
const M = {
  /* dropped filter: a touchdown line may go to any game, whether or not its score holds the touchdowns */
  A: [NFL, 'const can = [...free].filter(game => scores[game] >= 7 * tds[line]);', 'const can = [...free];'],
  /* off by one: a season ending on exactly half a sack loses the half */
  B: [NFL, 'if (left >= 5) t[half] += 5;', 'if (left > 5) t[half] += 5;'],
  /* the shared playoff line fix taken back out: the NFL sentence gets its label glued on again */
  E: ['src/components/us-career/season/UsSeasonCentre.tsx',
    ".map(x => (x.label === 'Performance' ? x.value : x.label === 'Games' && x.value === '1' ? '1 game' : `${x.value} ${x.label.toLowerCase()}`));",
    '.map(x => `${x.value} ${x.label.toLowerCase()}`);'],
  /* swapped argument: the hub reads the NBA's held years for an NFL career */
  F: ['src/lib/nflCareerSport.ts', "seasonCentreHeld: year => usSeasonHeldLine('nfl', year),", "seasonCentreHeld: year => usSeasonHeldLine('nba', year),"],
  /* swapped keys: a cornerback's interceptions and passes defended change tiles */
  H: [NFL, "['INT', n('picks')], ['PD', n('passDef')]];", "['INT', n('passDef')], ['PD', n('picks')]];"],
  /* stale constant: a champion's band one win too wide */
  W: [NFL, '[11, 14], [11, 15], [11, 15]] as const;', '[11, 14], [11, 15], [11, 16]] as const;'],
  /* dropped guard: a quarterback's yards no longer need a yard a touchdown, and the day no longer follows his team's score */
  Y: [NFL, "if (!lay('passYds', on.map(g => day(g) * (1 + 0.25 * of(g, 'passTd'))), on.map(() => 520), on.map(g => of(g, 'passTd')), true)) return false;",
    "if (!lay('passYds', on.map(() => form()), on.map(() => 520), null, true)) return false;"],
  /* wrong side: his own missed field goal is told on the other team's side of the feed (mine dropped) */
  Z: [NFL, "own('miss', of(g, 'fgAtt') - of(g, 'fgMade'));", "own('miss', of(g, 'fgAtt') - of(g, 'fgMade') - (of(g, 'fgAtt') - of(g, 'fgMade') > 1 ? 1 : 0));"],
};
const id = process.argv[2];
const m = M[id];
if (!m) { console.error(`unknown mutation ${id}`); process.exit(2); }
const [file, from, to] = m;
const src = fs.readFileSync(file, 'utf8');
if (src.split(from).length !== 2) { console.error(`mutation ${id}: its string is not exactly once in ${file}`); process.exit(2); }
fs.writeFileSync(file, src.replace(from, () => to));
console.log(`mutation ${id} applied to ${file}`);
