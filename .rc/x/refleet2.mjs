/* Round 1216 closing check: the run reviewer's own fleets 1 to 4 (other clubs and seeds than OWN_GOAL_FLEET
   deals) on the pushed head. The reviewer's refleet.mjs (origin/rc/r1216-run-g:.rc/x/refleet.mjs) anchored on two
   lines the fix pass rewrote into one, so this is the same rewrite on the line as it stands now. It changes the
   five clubs and seeds of src/test/pitchOwnGoal.test.tsx in the RUNNER's checkout only (never committed; the
   request line restores the file). Nothing else is touched: no app code, no assertion. */
import fs from 'node:fs';
const file = 'src/test/pitchOwnGoal.test.tsx';
const anchor = "const FIVE_CLUBS = ['Aston Villa', 'Real Madrid', 'Lyon', 'Ajax', 'Celtic'].map((club, i) => ({ club, seed: FLEET ? FLEET * 100003 + 17 + i : 110101 + i }));";
/* The sets as the reviewer wrote them. */
const SETS = {
  1: [[220101, 'Everton'], [220102, 'Barcelona'], [220103, 'Arsenal'], [220104, 'Newcastle United'], [220105, 'Liverpool']],
  2: [[330101, 'Chelsea'], [330102, 'Manchester City'], [330103, 'Brentford'], [330104, 'Real Madrid'], [330105, 'Ajax']],
  3: [[440101, 'Aston Villa'], [440102, 'Real Madrid'], [440103, 'Lyon'], [440104, 'Ajax'], [440105, 'Celtic']],
  4: [[550101, 'Celtic'], [550102, 'Lyon'], [550103, 'Everton'], [550104, 'Barcelona'], [550105, 'Aston Villa']],
};
const n = Number(process.argv[2]);
const set = SETS[n];
if (!set) { console.log('refleet2: unknown set'); process.exit(7); }
const source = fs.readFileSync(file, 'utf8');
if (source.split(anchor).length !== 2) { console.log('refleet2: the anchor is not in the test file exactly once. NOT APPLIED.'); process.exit(7); }
const rows = set.map(([seed, club]) => `{ club: '${club}', seed: ${seed} }`).join(', ');
const next = source.replace(anchor, `const FIVE_CLUBS = [${rows}];`);
if (next === source) { console.log('refleet2: the rewrite changed nothing. NOT APPLIED.'); process.exit(7); }
if (process.env.REFLEET_DRY) { console.log('refleet2: DRY, the anchor is there exactly once, nothing written'); process.exit(0); }
fs.writeFileSync(file, next);
console.log(`refleet2: reviewer set ${n} applied: ${set.map(([seed, club]) => `${club} ${seed}`).join(', ')}`);
