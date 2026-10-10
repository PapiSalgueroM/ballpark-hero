/* Reviewer's mutation tool for Round 1221 (run on a GitHub runner only, sent as an extra file).
   node .rc/x/review-run-mut.mjs <id>   applies ONE small edit to a source file of the checkout, after
   asserting its string is there exactly once. The request line restores the tree with git checkout. */
import { readFileSync, writeFileSync } from 'node:fs';

const SCORE = 'src/lib/gameLaws/nflScore.ts';
const STORY = 'src/lib/gameLaws/nfl.ts';
const SHUFFLE = 'src/lib/keyedShuffle.ts';
const BIND = 'src/lib/season/nfl.ts';
const US = 'src/lib/season/us.ts';

const MUTS = {
  /* off by one: a line can fall on minute 0 and never on minute 60 */
  m1: { file: STORY, from: '    let m = 1 + Math.floor(rng() * NFL_GAME_MINUTES);', to: '    let m = Math.floor(rng() * NFL_GAME_MINUTES);' },
  /* stale constant: a side's drives two minutes apart */
  m2: { file: STORY, from: 'const DRIVE_GAP = 3;', to: 'const DRIVE_GAP = 2;' },
  /* swapped sign: the venue helps both sides */
  m3: { file: SCORE, from: '  let them = side(-edge - venue);', to: '  let them = side(-edge + venue);' },
  /* dropped filter: a lone field goal stays a three */
  m4: { file: SCORE, from: '    return pts === 3 ? 6 : pts;', to: '    return pts;' },
  /* off by one in the shuffle (still a permutation, still one draw a place) */
  m5: { file: SHUFFLE, from: '    const j = Math.floor(rng() * (i + 1));', to: '    const j = Math.floor(rng() * i);' },
  /* stale cap: ten touchdowns in ten drives */
  m6: { file: SCORE, from: 'const MAX_TD = 9;', to: 'const MAX_TD = 10;' },
  /* dropped filter in the bind: the other side's six is told as a failed two point try for a kicker's career */
  m7: { file: BIND, from: "  const sixIsATry = kicker && e.side === 'us';", to: '  const sixIsATry = kicker;' },
  /* swapped arguments in the story law: the home club is told the away club's points */
  m8: { file: STORY, from: '    const us = nflDrives(home, 0, null, rng);\n    const them = nflDrives(away, 0, null, rng);', to: '    const us = nflDrives(away, 0, null, rng);\n    const them = nflDrives(home, 0, null, rng);' },
  /* stale scale: the share of wins to an edge */
  m9: { file: SCORE, from: '  return 11.3 * Math.log(p / (1 - p));', to: '  return 10.3 * Math.log(p / (1 - p));' },
  /* not a law change at all: a comment added to a bundled input the move does not touch (compare must answer exit 3) */
  m10: { file: US, append: '\n/* a reviewer comment that changes no behaviour */\n' },
  /* the retry draw of the picker off by one (only reached when the first minute is crowded) */
  m11: { file: STORY, from: '\n      m = 1 + Math.floor(rng() * NFL_GAME_MINUTES);', to: '\n      m = 1 + Math.floor(rng() * (NFL_GAME_MINUTES - 1));' },
  /* the venue unit left on in the law a front office will play */
  m12: { file: SCORE, from: '  score: (pHome, rng) => nflScore(nflEdgeForShare(pHome) - 1, true, rng),', to: '  score: (pHome, rng) => nflScore(nflEdgeForShare(pHome), true, rng),' },
};

const id = process.argv[2];
const m = MUTS[id];
if (!m) { console.error(`MUT ABORT: unknown mutation ${id}`); process.exit(2); }
const src = readFileSync(m.file, 'utf8').replace(/\r\n/g, '\n');
let out;
if (m.append) out = src + m.append;
else {
  const n = src.split(m.from).length - 1;
  if (n !== 1) { console.error(`MUT ABORT: ${id}: its string is in ${m.file} ${n} times, not once`); process.exit(2); }
  out = src.replace(m.from, () => m.to);
}
if (out === src) { console.error(`MUT ABORT: ${id}: the edit changed nothing`); process.exit(2); }
writeFileSync(m.file, out);
console.log(`MUT APPLIED ${id} in ${m.file}`);
