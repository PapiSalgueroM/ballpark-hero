/**
 * Round 208 harness: the My Career hub, and the trophy case it opens.
 *
 * What the round shipped: the four American career games moved onto the
 * same boxes the front offices and Club Manager use, with live facts in
 * them instead of labels, and one genuinely new screen. Every award those
 * games have ever handed out was recorded on the season line and then
 * shown as a single trophy emoji at the end of a row, so a career with
 * three MVPs looked like a career with three good seasons. The trophy case
 * counts them, names them and dates them.
 *
 * What is checked here:
 *
 *  1. Shape. Five boxes in order, nothing blank, no headline too long for
 *     a box two columns wide on a phone, across every state a save reaches
 *     including a brand new career and a broken-down one.
 *  2. The words the walks tap by do not drift.
 *  3. Every accent means something and only one thing: a meter on the
 *     floor, a deal running out, an upkeep bill outrunning the bank, or
 *     headlines waiting. Checked in both directions.
 *  4. The trophy case reads the SEASONS, not the counters, so what it
 *     shows is what actually happened. Grouping, counting, dating and
 *     ordering are all checked, including the awkward cases: no awards at
 *     all, the same award twice in one season, and a season line with no
 *     awards array at all (which pre-Round-85 saves really do have).
 *  5. The four boards use it, the old bespoke grid is gone from all four,
 *     and the last season is read off the squad rather than off transient
 *     state, because a box that forgets your career on reload is worse
 *     than no box. That bug was caught by screenshot during the round.
 *
 * Run: node scripts/simCareerHub.mjs
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = '/tmp/careerHubEntry.mjs';
const BUNDLE = '/tmp/careerHub.bundle.mjs';

fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const hub = await import('${ROOT}/src/lib/careerHub.ts');
export { hub };
`);
execSync(`${ROOT}/node_modules/.bin/esbuild ${ENTRY} --bundle --format=esm --platform=node --outfile=${BUNDLE} --log-level=error`, { stdio: 'inherit' });

const { hub } = await import(BUNDLE);
const { careerHubTiles, trophyLines, weakestMeter, honoursTotal, CAREER_TILE_TITLES } = hub;

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const ok = (c, m) => { if (!c) fail(m); };

const facts = (over = {}) => ({
  ovr: 84, age: 27, pos: 'QB',
  morale: 70, health: 80, fanbase: 65,
  netWorth: 18.4, salary: 22, yearlyCosts: 0,
  contractYears: 3, teamLabel: 'Green Bay',
  seasonsPlayed: 5, lastLine: '4,102 yds, 31 TD',
  rings: 1, ringWord: 'ring',
  honours: [{ label: 'MVPs', n: 1 }, { label: 'All-Pros', n: 2 }],
  headlines: [],
  ...over,
});
const byKey = (t, k) => t.find(x => x.key === k);

/* ---------------------------------------------------------------- 1. shape */
console.log('1) Five boxes, in order, and nothing on them is blank');
{
  const t = careerHubTiles(facts());
  ok(t.length === 5, `expected 5 boxes, got ${t.length}`);
  ok(t.map(x => x.key).join(',') === 'stats,bank,log,trophies,news', `box order drifted: ${t.map(x => x.key).join(',')}`);

  const states = [
    ['a fresh career', facts({ seasonsPlayed: 0, lastLine: null, rings: 0, honours: [], netWorth: 0, contractYears: 4 })],
    ['a broken man', facts({ morale: 8, health: 12, fanbase: 20 })],
    ['final year', facts({ contractYears: 1 })],
    ['no contract at all', facts({ contractYears: 0 })],
    ['skint with a mansion', facts({ netWorth: 1.2, yearlyCosts: 3.4 })],
    ['loaded', facts({ netWorth: 940 })],
    ['a hall of famer', facts({ rings: 4, honours: [{ label: 'MVPs', n: 3 }, { label: 'All-Pros', n: 9 }], seasonsPlayed: 17 })],
    ['nothing won', facts({ rings: 0, honours: [{ label: 'MVPs', n: 0 }, { label: 'All-Pros', n: 0 }] })],
    ['a busy news week', facts({ headlines: ['Traded, apparently', 'The knee again', 'A new deal?'] })],
    ['a long team name', facts({ teamLabel: 'Jacksonville Jaguars', contractYears: 1 })],
    ['a sport with no honours list', facts({ honours: [] })],
  ];
  for (const [label, f] of states) {
    let tl;
    try { tl = careerHubTiles(f); } catch (e) { fail(`${label}: threw ${e.message}`); continue; }
    ok(tl.length === 5, `${label}: ${tl.length} boxes`);
    for (const x of tl) {
      ok(x.value.trim().length > 0, `${label}: ${x.key} has an empty value`);
      ok(x.sub.trim().length > 0, `${label}: ${x.key} has an empty second line`);
      ok(!/undefined|NaN|null/.test(x.value + x.sub), `${label}: ${x.key} printed a hole: "${x.value}" / "${x.sub}"`);
      /* Round 204's measured bar: a box is half a 390px phone wide and the
         headline runs out around 22 characters. */
      ok(x.value.length <= 22, `${label}: ${x.key} headline is ${x.value.length} chars: "${x.value}"`);
      /* And the second line is truncated by CSS, but a line that is mostly
         invisible is a line nobody wrote for a reason. */
      ok(x.sub.length <= 60, `${label}: ${x.key} second line is ${x.sub.length} chars: "${x.sub}"`);
    }
  }
  console.log(`   ${states.length} save states, 5 boxes each, no blanks and no holes`);
}

/* ------------------------------------------------------- 2. the words hold */
console.log('2) The words the walks tap by do not drift');
{
  const titles = careerHubTiles(facts()).map(t => t.title);
  ok(JSON.stringify(titles) === JSON.stringify([...CAREER_TILE_TITLES]), `the titles changed: ${titles.join(', ')}`);
  for (const w of ['My Player', 'The Bank', 'Career Log', 'Trophy Case', 'News']) {
    ok(titles.includes(w), `a walk taps "${w}" and no box says it any more`);
  }
}

/* -------------------------------------------------------- 3. accent rules */
console.log('3) Every dot means something, and only one thing');
{
  /* A healthy career pulses for nothing except waiting headlines. */
  const calm = careerHubTiles(facts());
  for (const k of ['stats', 'bank', 'log', 'trophies', 'news']) {
    ok(byKey(calm, k).accent === false, `a calm career is pulsing on ${k}`);
  }

  /* My Player: the lowest meter on the floor, and it names which. */
  ok(byKey(careerHubTiles(facts({ morale: 20 })), 'stats').accent === true, 'low morale does not light the player box');
  ok(byKey(careerHubTiles(facts({ health: 30 })), 'stats').sub.includes('Health'), 'the player box does not name the meter that is down');
  ok(byKey(careerHubTiles(facts({ fanbase: 12 })), 'stats').sub.includes('The fans'), 'a fanbase collapse is not named');
  ok(byKey(careerHubTiles(facts({ morale: 36, health: 36, fanbase: 36 })), 'stats').accent === false, '36 is above the floor and should not pulse');
  ok(byKey(careerHubTiles(facts({ morale: 35 })), 'stats').accent === true, '35 is the floor and should pulse');
  /* The weakest meter is the one reported, not the first one. */
  const w = weakestMeter({ morale: 60, health: 22, fanbase: 40 });
  ok(w.label === 'Health' && w.value === 22, `weakestMeter returned ${JSON.stringify(w)}`);

  /* The Bank: a deal running out, or an upkeep bill outrunning the bank. */
  ok(byKey(careerHubTiles(facts({ contractYears: 1 })), 'bank').accent === true, 'a final year does not light the money box');
  ok(byKey(careerHubTiles(facts({ contractYears: 1 })), 'bank').sub.includes('final year'), 'the money box does not say it is the final year');
  ok(byKey(careerHubTiles(facts({ contractYears: 2 })), 'bank').accent === false, 'two years left is not urgent');
  ok(byKey(careerHubTiles(facts({ netWorth: 1, yearlyCosts: 3 })), 'bank').accent === true, 'upkeep outrunning the bank does not light the money box');
  ok(byKey(careerHubTiles(facts({ netWorth: 1, yearlyCosts: 3 })), 'bank').sub.includes('upkeep'), 'the squeeze is not explained');
  /* Nothing bought means no upkeep warning, however thin the bank. */
  ok(byKey(careerHubTiles(facts({ netWorth: 0.2, yearlyCosts: 0, contractYears: 3 })), 'bank').accent === false,
    'a poor rookie who has bought nothing is being warned about upkeep');

  /* News: only when there is something to read. */
  ok(byKey(careerHubTiles(facts({ headlines: ['Something happened'] })), 'news').accent === true, 'a headline does not light the news box');
  ok(byKey(careerHubTiles(facts({ headlines: [] })), 'news').value === 'Quiet week', 'an empty feed does not say so');
  ok(byKey(careerHubTiles(facts({ headlines: ['a', 'b'] })), 'news').value === '2 headlines', 'the news box miscounts');
}

/* ------------------------------------------------- 4. the trophy case itself */
console.log('4) The trophy case reads the seasons, not the counters');
{
  const seasons = [
    { year: 2026, awards: [] },
    { year: 2027, awards: ['All-Pro'] },
    { year: 2028, awards: ['All-Pro', 'MVP'] },
    { year: 2029, awards: ['MVP'] },
    { year: 2030, awards: ['All-Pro'] },
  ];
  const lines = trophyLines(seasons);
  ok(lines.length === 2, `expected 2 kinds of honour, got ${lines.length}`);
  /* Most-won first, which is what a case should lead with. */
  ok(lines[0].label === 'All-Pro' && lines[0].n === 3, `top line is ${JSON.stringify(lines[0])}`);
  ok(JSON.stringify(lines[0].years) === JSON.stringify([2027, 2028, 2030]), `All-Pro years are ${lines[0].years}`);
  ok(lines[1].label === 'MVP' && lines[1].n === 2, `second line is ${JSON.stringify(lines[1])}`);

  /* The awkward cases. */
  ok(trophyLines([]).length === 0, 'an empty career produced trophy lines');
  ok(trophyLines([{ year: 2026, awards: [] }]).length === 0, 'a season with no awards produced a line');
  /* Pre-Round-85 saves genuinely have season lines with no awards array. */
  ok(trophyLines([{ year: 2026 }]).length === 0, 'a season with NO awards array threw or invented a line');
  /* The same award twice in a season counts twice and dates twice, which
     is right: two All-Star selections in one year cannot happen, but a
     sport that ever allows it should not silently swallow one. */
  const twice = trophyLines([{ year: 2026, awards: ['Gold Glove', 'Gold Glove'] }]);
  ok(twice.length === 1 && twice[0].n === 2, `a doubled award came out as ${JSON.stringify(twice)}`);
  ok(JSON.stringify(twice[0].years) === JSON.stringify([2026, 2026]), 'a doubled award lost a year');
  /* Years come out oldest first even when the seasons do not. */
  const jumbled = trophyLines([{ year: 2030, awards: ['MVP'] }, { year: 2026, awards: ['MVP'] }]);
  ok(JSON.stringify(jumbled[0].years) === JSON.stringify([2026, 2030]), `years came out ${jumbled[0].years}`);
  /* Equal counts sort alphabetically, so the case does not reshuffle
     itself every render. */
  const tie = trophyLines([{ year: 2026, awards: ['Zebra Award', 'Alpha Award'] }]);
  ok(tie[0].label === 'Alpha Award', `a tie sorted as ${tie.map(x => x.label).join(', ')}`);

  /* The box's own arithmetic. */
  ok(honoursTotal({ rings: 2, honours: [{ label: 'MVPs', n: 3 }] }) === 5, 'honoursTotal does not count the rings');
  ok(honoursTotal({ rings: 0, honours: [] }) === 0, 'an empty case does not total zero');
  const empty = byKey(careerHubTiles(facts({ rings: 0, honours: [] })), 'trophies');
  ok(empty.value === 'Empty', `an empty case reads "${empty.value}"`);
  ok(/Go and win something/.test(empty.sub), `an empty case says "${empty.sub}"`);
  const full = byKey(careerHubTiles(facts({ rings: 2, honours: [{ label: 'MVPs', n: 3 }] })), 'trophies');
  ok(full.value === '5 honours', `a full case reads "${full.value}"`);
  ok(full.sub.includes('2 rings') && full.sub.includes('3 MVPs'), `a full case sub reads "${full.sub}"`);
  /* Singular and plural both read like English. */
  ok(byKey(careerHubTiles(facts({ rings: 1, honours: [] })), 'trophies').sub.startsWith('1 ring,') === false, 'a lone ring reads oddly');
  ok(byKey(careerHubTiles(facts({ rings: 1, honours: [] })), 'trophies').sub.includes('1 ring'), 'a lone ring is not named');
  console.log('   grouping, dating, ordering and the empty case all hold');
}

/* --------------------------------------------- 5. the four boards use it */
console.log('5) All four career boards are on the shared boxes');
{
  const BOARDS = [
    'src/components/nfl-my-career/NflMyCareerBoard.tsx',
    'src/components/mlb-my-career/MlbMyCareerBoard.tsx',
    'src/components/nba-my-career/NbaMyCareerBoard.tsx',
    'src/components/nhl-my-career/NhlMyCareerBoard.tsx',
  ];
  for (const rel of BOARDS) {
    const t = fs.readFileSync(path.join(ROOT, rel), 'utf-8');
    ok(t.includes("from '@/lib/careerHub'"), `${rel}: does not use the hub engine`);
    ok(t.includes('<HubTiles'), `${rel}: does not render the shared boxes`);
    ok(t.includes('<HubPanelHeader'), `${rel}: still draws its own back bar`);
    ok(t.includes('<TrophyCase'), `${rel}: has no trophy case`);
    ok(t.includes("'trophies'"), `${rel}: the trophy panel is not reachable`);
    /* The bespoke grid is gone, not merely hidden. */
    ok(!t.includes('Round 85: the tile rule. Tap a box'), `${rel}: the old hand built grid is still here`);
    ok(!/setPanel\('stats'\)\} className="relative rounded-2xl/.test(t), `${rel}: still hand draws a tile`);
    /* The reload bug: the last season must come off the seasons array. */
    ok(/lastLine: career\.seasons\.length/.test(t), `${rel}: reads the last season off transient state, which a reload empties`);
  }
  /* And the box itself lives somewhere neutral now, with the old front
     office door still open so those four boards did not need touching. */
  const shared = fs.readFileSync(path.join(ROOT, 'src/components/hub/HubTiles.tsx'), 'utf-8');
  ok(/export function HubTiles/.test(shared), 'the shared box component is gone');
  const door = fs.readFileSync(path.join(ROOT, 'src/components/front-office-shared/FoHubTiles.tsx'), 'utf-8');
  ok(/from '@\/components\/hub\/HubTiles'/.test(door), 'the front office door no longer points at the shared box');
  console.log('   4 boards on the shared boxes, 0 hand built grids left');
}

console.log('');
if (failures > 0) {
  console.error(`simCareerHub: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simCareerHub: green. Nine games on the same boxes now, and every award has a year on it.');
