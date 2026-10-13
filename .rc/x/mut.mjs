// Reviewer mutation tool (Round 1313, run lens). Usage: node mut.mjs <tree root> <name>
// Applies ONE small plausible mutation to a source file inside <tree root> (a throwaway worktree on the runner),
// refusing (exit 2) unless the anchor is there exactly once. Never run against a tree that matters.
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const MUTS = {
  // a dead heat goes to the player (someone "fixing" advice 13 in the shared rule)
  deadheat: ['src/lib/careerRival.ts', '  return myScore > hisScore;', '  return myScore >= hisScore;'],
  // the NHL rival plays at nine tenths of the ice time (a stale constant in the hook)
  iceshare: ['src/lib/nhlMyCareer.ts', 'iceShare: 1 }, keyed)', 'iceShare: 0.9 }, keyed)'],
  // the MLB rival's All-Star pass reads his carried line instead of the full one
  allstarcut: ['src/lib/mlbMyCareer.ts', "wonAward(keyed, 'mlb', 'mlbAllStar', pos, mlbSeasonScore(pos, full))", "wonAward(keyed, 'mlb', 'mlbAllStar', pos, mlbSeasonScore(pos, season))"],
  // beat 206: any award counts as making the All-Star roster (a dropped filter)
  rostermine: ['src/lib/mlbCareerRivalryEvents.ts', 'mine: last => (last.awards ?? []).includes(MLB_ROSTER_AWARD),', 'mine: last => (last.awards ?? []).length > 0,'],
  // the NHL rival's line carried to one game fewer than the work slate (an off by one)
  slateoff: ['src/lib/nhlMyCareer.ts', 'const season = nhlLineOnSlate(full, nhlWorkSlate(pos, mine.slate));', 'const season = nhlLineOnSlate(full, nhlWorkSlate(pos, mine.slate) - 1);'],
  // an MLB hitter's rival takes the player's kind instead of his own hashed one
  hitterkind: ['src/lib/mlbMyCareer.ts', ": rivalKindOf('mlb-rival-kind', r, MLB_ARCHETYPES[pos]).id;", ': mine.kind;'],
  // the NHL player's side scored on the engine's own length (the old reading) at the call site
  nhlfull: ['src/lib/nhlMyCareer.ts', "nhlHeadToHeadScore(c.pos, line), c.name, 'nhl'", "nhlHeadToHeadScore(c.pos, full), c.name, 'nhl'"],
  // the MLB player's side scored on the engine's own length (the old reading) at the call site
  mlbfull: ['src/lib/mlbMyCareer.ts', "mlbHeadToHeadScore(c.pos, line), c.name, 'mlb'", "mlbHeadToHeadScore(c.pos, full), c.name, 'mlb'"],
  // a goalie's rival read on wins only (the save percentage dropped from the head to head printer filter)
  goaliewins: ['src/lib/nhlMyCareer.ts', '  return nhlSeasonScore(pos, nhlLineAsPrinted(line, pos));', '  return nhlSeasonScore(pos, { ...nhlLineAsPrinted(line, pos), svpct: pos === "G" ? 0.9 : undefined });'],
};

const [root, name] = process.argv.slice(2);
const m = MUTS[name];
if (!root || !m) { console.error(`unknown mutation "${name}"; known: ${Object.keys(MUTS).join(', ')}`); process.exit(2); }
const [rel, find, put] = m;
const file = path.join(root, rel);
const src = readFileSync(file, 'utf8');
const n = src.split(find).length - 1;
if (n !== 1) { console.error(`MUTATION ${name}: anchor found ${n} times in ${rel}, refusing`); process.exit(2); }
const out = src.replace(find, put);
if (out === src) { console.error(`MUTATION ${name}: changed nothing, refusing`); process.exit(2); }
writeFileSync(file, out);
console.log(`MUTATION ${name} applied to ${rel}: "${find}" -> "${put}"`);
