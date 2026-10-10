/* Round 1216 review (lens RUN): the round's own rules on ANOTHER dense fleet. Rewrites the five clubs and seeds of
   src/test/pitchOwnGoal.test.tsx in the runner's checkout (never committed; the request line restores the file).
   A hard zero that holds on one fleet and not on another is a coin toss, so the rules are read on four more. */
import fs from 'node:fs';
const file = 'src/test/pitchOwnGoal.test.tsx';
const a1 = "  { seed: 110101, club: 'Aston Villa' }, { seed: 110102, club: 'Real Madrid' }, { seed: 110103, club: 'Lyon' },";
const a2 = "  { seed: 110104, club: 'Ajax' }, { seed: 110105, club: 'Celtic' },";
const SETS = {
  1: [[220101, 'Everton'], [220102, 'Barcelona'], [220103, 'Arsenal'], [220104, 'Newcastle United'], [220105, 'Liverpool']],
  2: [[330101, 'Chelsea'], [330102, 'Manchester City'], [330103, 'Brentford'], [330104, 'Real Madrid'], [330105, 'Ajax']],
  3: [[440101, 'Aston Villa'], [440102, 'Real Madrid'], [440103, 'Lyon'], [440104, 'Ajax'], [440105, 'Celtic']],
  4: [[550101, 'Celtic'], [550102, 'Lyon'], [550103, 'Everton'], [550104, 'Barcelona'], [550105, 'Aston Villa']],
};
const set = SETS[process.argv[2]];
if (!set) { console.log('refleet: unknown set'); process.exit(7); }
const source = fs.readFileSync(file, 'utf8');
if (source.split(a1).length !== 2 || source.split(a2).length !== 2) { console.log('refleet: the fleet lines are not in the test file exactly once. NOT APPLIED.'); process.exit(7); }
const row = ([seed, club]) => `{ seed: ${seed}, club: '${club}' }`;
fs.writeFileSync(file, source.replace(a1, '  ' + set.slice(0, 3).map(row).join(', ') + ',').replace(a2, '  ' + set.slice(3).map(row).join(', ') + ','));
console.log(`refleet: set ${process.argv[2]} applied: ${set.map(([seed, club]) => `${club} ${seed}`).join(', ')}`);
