// Reviewer's probe: does any built chunk hold text of the three libraries nothing imports?
// Reads dist/assets of a plain build. Prints, marker by marker, the chunks that hold it. Exit 1 if any does.
import fs from 'node:fs';
import path from 'node:path';
const MARKERS = {
  // Round 1228: src/lib/uclLeaguePhase.ts, src/lib/leagueSlate.ts
  'ucl:opponentsGoalDifference': 'opponentsGoalDifference',
  'ucl:footnote': 'Level on points goes to goal difference',
  'ucl:awayGoalsFor': 'awayGoalsFor',
  'slate:pattern-tail': '10268,10327,10360',
  'slate:pattern-head': '3,161,196,251,260',
  // Round 1224: gmBracket, gmGameDay, gmGameScore, gmBrackets/nfl, nflHelp, gameLaws/nflGameDay
  'gm:nfl-14': 'nfl-14',
  'gm:AFC-CC': 'AFC-CC',
  'gm:rebuilt-line': 'The playoff bracket on this save could not be read',
  'gm:throw': 'gmBracket: the game played for',
  'gm:rout-words': 'won going away',
  'gm:story-key': '|story|',
  'gm:help': 'the title game here is not level ground',
  'gm:gameday-help': 'Scores are told about the clubs',
  // Round 1300: src/lib/season/usPlayoffs.ts, src/data/usPostseasonFormat.ts
  'po:play-in': 'Play-In Tournament',
  'po:pog': '|pog|',
  'po:win-series': 'You win the series',
  'po:level': 'Series level',
  'po:source-cbs': 'cbsPlayIn',
  'po:source-espn': 'espnNfl14',
  'po:thin': 'which clubs the 2019-20 version of the play-in was open to',
};
const dir = 'dist/assets';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
let hits = 0;
const texts = files.map(f => [f, fs.readFileSync(path.join(dir, f), 'utf8')]);
console.log(`probe: ${files.length} js chunks in ${dir}, ${texts.reduce((a, [, t]) => a + t.length, 0)} characters`);
for (const [name, text] of Object.entries(MARKERS)) {
  const where = texts.filter(([, t]) => t.includes(text)).map(([f]) => f);
  if (where.length) hits += 1;
  console.log(`${where.length ? 'IN THE BUILD' : 'absent'}  ${name}  ${JSON.stringify(text)}  ${where.join(' ')}`);
}
// A sanity marker that MUST be in the build, so an empty or wrong dist cannot read as a clean result.
const sanity = ['CM_VAR', 'careerRival', 'Season Center'].map(s => [s, texts.filter(([, t]) => t.includes(s)).length]);
console.log('sanity (chunks holding a string the build must hold): ' + sanity.map(([s, n]) => `${s}=${n}`).join(' '));
const html = fs.readdirSync('dist').filter(f => f.endsWith('.html'));
console.log(`dist html files at the root: ${html.join(' ')}`);
console.log(hits === 0 ? 'probe: CLEAN, no chunk holds a marker of the three libraries' : `probe: ${hits} markers are in the build`);
process.exit(hits === 0 ? 0 : 1);
