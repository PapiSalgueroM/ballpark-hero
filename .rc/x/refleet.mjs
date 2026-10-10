/* Round 1216 review (lens RUN): the round's own rules on ANOTHER dense fleet. Rewrites the five clubs and seeds of
   src/test/pitchOwnGoal.test.tsx in the runner's checkout (never committed; the request line restores the file).
   A hard zero that holds on one fleet and not on another is a coin toss, so the rules are read on more fleets.
   It also makes OG5 print the turn of every keeper's own goal and of every own goal that turns by less than 30. */
import fs from 'node:fs';
const file = 'src/test/pitchOwnGoal.test.tsx';
const a1 = "  { seed: 110101, club: 'Aston Villa' }, { seed: 110102, club: 'Real Madrid' }, { seed: 110103, club: 'Lyon' },";
const a2 = "  { seed: 110104, club: 'Ajax' }, { seed: 110105, club: 'Celtic' },";
const a3 = '      ownTurns.push(turn);';
const FIVE = ['Aston Villa', 'Real Madrid', 'Lyon', 'Ajax', 'Celtic'];
const SETS = {
  0: [[110101, 'Aston Villa'], [110102, 'Real Madrid'], [110103, 'Lyon'], [110104, 'Ajax'], [110105, 'Celtic']],
  1: [[220101, 'Everton'], [220102, 'Barcelona'], [220103, 'Arsenal'], [220104, 'Newcastle United'], [220105, 'Liverpool']],
  2: [[330101, 'Chelsea'], [330102, 'Manchester City'], [330103, 'Brentford'], [330104, 'Real Madrid'], [330105, 'Ajax']],
  3: [[440101, 'Aston Villa'], [440102, 'Real Madrid'], [440103, 'Lyon'], [440104, 'Ajax'], [440105, 'Celtic']],
  4: [[550101, 'Celtic'], [550102, 'Lyon'], [550103, 'Everton'], [550104, 'Barcelona'], [550105, 'Aston Villa']],
};
const n = Number(process.argv[2]);
/* From 5 on: the round's own five clubs on other seeds. */
const set = SETS[n] ?? (Number.isInteger(n) && n >= 5 ? FIVE.map((club, i) => [n * 100003 + 17 + i, club]) : null);
if (!set) { console.log('refleet: unknown set'); process.exit(7); }
const source = fs.readFileSync(file, 'utf8');
if (source.split(a1).length !== 2 || source.split(a2).length !== 2 || source.split(a3).length !== 2) { console.log('refleet: an anchor is not in the test file exactly once. NOT APPLIED.'); process.exit(7); }
const row = ([seed, club]) => `{ seed: ${seed}, club: '${club}' }`;
const log = a3 + "\n      { const holder = [...o.scene.mine, ...o.scene.theirs].find(p => p.key === o.scene.holderKey); if (o.man!.keeper || turn < 30) console.log(`[run turn] ${o.man!.keeper ? 'KEEPER' : 'back'} turn ${turn.toFixed(1)} | ${o.label} | flank ${o.own.event.flank ?? 'none'} minute ${o.own.event.minute} | the man at ${o.man!.x.toFixed(1)}, ${o.man!.y.toFixed(1)} | the holder at ${holder ? holder.x.toFixed(1) + ', ' + holder.y.toFixed(1) : 'nobody'}`); }";
fs.writeFileSync(file, source.replace(a1, '  ' + set.slice(0, 3).map(row).join(', ') + ',').replace(a2, '  ' + set.slice(3).map(row).join(', ') + ',').replace(a3, log));
console.log(`refleet: set ${n} applied: ${set.map(([seed, club]) => `${club} ${seed}`).join(', ')}`);
