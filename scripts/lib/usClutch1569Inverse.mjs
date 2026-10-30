/* Round 1569: the inverse of the playoff note change, for the base pinned Press and market kit.

   Round 1569 changes what a US season writes after a postseason on purpose (src/lib/careerVariance.ts clutchNote
   reads the January level: credit for a strong line in a loss, a plain note only for a genuinely poor one), and the
   four engines hand it that level. The kit (scripts/qa/careerPressMarketKit.mjs, BASE 934c29d9) compares a US season
   in the tree with the same season on the base, notes included, to prove the market moves nothing; it cannot know
   about a note change that is not the market's. So the node copies compared with the base get the old note back:
   the two new branches of clutchNote become the old one, and each engine's call loses the level again. Each anchor
   is required exactly once, so a later edit of these lines refuses here and has to decide again, the way Release
   BB's inverse of Round 1313 does (scripts/lib/usRival1313Inverse.mjs). Applied before that inverse, so the MLB
   and NHL engines still meet its byte check against 1313's closed head.
   Never applied to the browser oracle of a native walk (that one is compared with the built page). */
import assert from 'node:assert/strict';

export const CLUTCH_1569_FILES = [
  'src/lib/careerVariance.ts',
  'src/lib/nflMyCareer.ts',
  'src/lib/nbaMyCareer.ts',
  'src/lib/mlbMyCareer.ts',
  'src/lib/nhlMyCareer.ts',
];
const CALLS = {
  'src/lib/nflMyCareer.ts': ["clutchNote(clutch, depth, 'nfl', pf)", "clutchNote(clutch, depth, 'nfl')"],
  'src/lib/nbaMyCareer.ts': ["clutchNote(clutch, depth, 'nba', poForm)", "clutchNote(clutch, depth, 'nba')"],
  'src/lib/mlbMyCareer.ts': ["clutchNote(clutch, depth, 'mlb', pf)", "clutchNote(clutch, depth, 'mlb')"],
  'src/lib/nhlMyCareer.ts': ["clutchNote(clutch, poDepth, 'nhl', poForm)", "clutchNote(clutch, poDepth, 'nhl')"],
};
const NEW_FROM = '  if (depth < 4 && level >= JANUARY_STRONG) {\n';
const NEW_TO = '  return null;\n}';
const OLD_BRANCH = [
  '  if (swing <= -7) {',
  "    return sport === 'mlb' ? '\u{1F62C} You could not buy a hit in October. It will follow you all winter.'",
  "      : sport === 'nba' ? '\u{1F62C} You disappeared when it mattered. The talk shows had a field day.'",
  "      : sport === 'nfl' ? '\u{1F62C} You were not the same player in January and everyone saw it.'",
  "      : '\u{1F62C} You went quiet in the playoffs. The room noticed.';",
  '  }',
  '',
].join('\n');

/* contents: the file as read (LF). rows: receives rel once per file inverted. */
export function inverseClutch1569(rel, contents, rows) {
  if (!CLUTCH_1569_FILES.includes(rel)) return contents;
  let out = contents;
  if (rel === 'src/lib/careerVariance.ts') {
    assert.equal(out.split(NEW_FROM).length, 2, 'Round 1569: careerVariance.ts must hold the credit branch exactly once');
    const at = out.indexOf(NEW_FROM), end = out.indexOf(NEW_TO, at);
    assert(end > at, 'Round 1569: careerVariance.ts must close clutchNote after the credit branch');
    out = out.slice(0, at) + OLD_BRANCH + out.slice(end);
  } else {
    const [from, to] = CALLS[rel];
    assert.equal(out.split(from).length, 2, `Round 1569: ${rel} must hand clutchNote its level exactly once`);
    out = out.replace(from, () => to);
  }
  rows.push(rel);
  return out;
}
