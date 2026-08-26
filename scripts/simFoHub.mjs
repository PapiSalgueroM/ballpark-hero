/**
 * Round 204 harness: the four front office hubs, as tiles.
 *
 * What the round shipped: the five word pills at the top of the NFL, MLB,
 * NBA and NHL front offices became five boxes, the same boxes Club Manager
 * has had since Round 74, and each box now carries the fact you previously
 * had to tap it to learn. Opening a box replaces the grid rather than
 * unrolling underneath it, so the hub stays one screen tall on a phone.
 *
 * All the wording lives in src/lib/foHub.ts, deliberately, so it can be
 * checked here without a browser. What matters and is checked below:
 *
 *  1. Shape. Five boxes, in order, with the five keys the boards map to
 *     their own tabs. No empty value or sub line anywhere, in any state,
 *     including the states that used to be impossible to reach.
 *  2. The words on the boxes never drift. Four of the five titles are
 *     fixed strings, and the browser walks tap by exactly those strings,
 *     so a rename here has to be a deliberate act with a test to match.
 *  3. Every accent rule fires when it should and stays dark when it should
 *     not, because a dot that is always on is a dot nobody reads.
 *  4. The free agency box only shouts about a signing that would really
 *     improve the team AND fits the room. Both halves are checked, in both
 *     directions.
 *  5. The engine survives what real saves contain: an empty roster, an
 *     empty market, a payroll over the line, the postseason, a bye week,
 *     and the three sports that have no fixture to name at all.
 *  6. The four boards actually use it, and the tab pills are gone from
 *     all four rather than three.
 *
 * Run: node scripts/simFoHub.mjs
 */
/* Round 299: seeded stream, see scripts/lib/seedRandom.mjs. First import on purpose. */
import './lib/seedRandom.mjs';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = '/tmp/foHubEntry.mjs';
const BUNDLE = '/tmp/foHub.bundle.mjs';

fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const hub = await import('${ROOT}/src/lib/foHub.ts');
const nfl = await import('${ROOT}/src/lib/frontOffice.ts');
export { hub, nfl };
`);
execSync(`${ROOT}/node_modules/.bin/esbuild ${ENTRY} --bundle --format=esm --platform=node --outfile=${BUNDLE} --log-level=error`, { stdio: 'inherit' });

const { hub, nfl } = await import(BUNDLE);
const { foHubTiles, percentileOvr, FO_TILE_TITLES } = hub;

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const ok = (cond, m) => { if (!cond) fail(m); };

/** A man. Only the five fields a box can care about. */
const man = (name, ovr, salary = 5, out = 0) => ({ name, pos: 'QB', age: 27, ovr, salary, out });

/** A middling save: 20 men from 70 to 89, a quiet market, mid table. */
function baseFacts(over = {}) {
  return {
    roster: Array.from({ length: 20 }, (_, i) => man(`Man ${i + 1}`, 70 + i, 4 + i * 0.5)),
    freeAgents: [man('Spare Part', 68, 2)],
    capRoom: 30,
    wins: 5,
    losses: 3,
    period: 9,
    periods: 17,
    playWord: 'This week',
    periodWord: 'week',
    hasFixtures: true,
    nextOpponent: { label: 'Dallas', home: true },
    lastResult: { won: true, us: 27, them: 20, opponent: 'New York' },
    place: 4,
    cut: 7,
    tableName: 'AFC',
    tradeLine: null,
    titles: 0,
    ...over,
  };
}
const byKey = (tiles, k) => tiles.find(t => t.key === k);

/* ---------------------------------------------------------------- 1. shape */
console.log('1) Five boxes, in order, and nothing on them is blank');
{
  const tiles = foHubTiles(baseFacts());
  ok(tiles.length === 5, `expected 5 boxes, got ${tiles.length}`);
  const keys = tiles.map(t => t.key).join(',');
  ok(keys === 'team,market,trade,play,standings', `box order drifted: ${keys}`);
  /* Every state a save can be in, not just the tidy one. */
  const states = [
    ['tidy', baseFacts()],
    ['empty roster', baseFacts({ roster: [] })],
    ['empty market', baseFacts({ freeAgents: [] })],
    ['over the cap', baseFacts({ capRoom: -14.4 })],
    ['exactly at the cap', baseFacts({ capRoom: 0 })],
    ['postseason', baseFacts({ period: 18, nextOpponent: null })],
    ['bye week', baseFacts({ nextOpponent: null })],
    ['no fixtures at all', baseFacts({ hasFixtures: false, nextOpponent: null, lastResult: null, playWord: 'Play', periodWord: 'round', periods: 20, period: 3 })],
    ['season not started', baseFacts({ period: 1, wins: 0, losses: 0, lastResult: null })],
    ['bottom of the table', baseFacts({ place: 16 })],
    ['top of the table', baseFacts({ place: 1 })],
    ['out of the table entirely', baseFacts({ place: 0 })],
    ['everyone injured', baseFacts({ roster: Array.from({ length: 5 }, (_, i) => man(`Hurt ${i}`, 80 + i, 6, 2 + i)) })],
    ['one man, no market, no room', baseFacts({ roster: [man('Solo', 71, 9)], freeAgents: [], capRoom: -1 })],
  ];
  for (const [label, facts] of states) {
    let tl;
    try { tl = foHubTiles(facts); } catch (e) { fail(`${label}: threw ${e.message}`); continue; }
    ok(tl.length === 5, `${label}: ${tl.length} boxes`);
    for (const t of tl) {
      ok(typeof t.value === 'string' && t.value.trim().length > 0, `${label}: ${t.key} has an empty value`);
      ok(typeof t.sub === 'string' && t.sub.trim().length > 0, `${label}: ${t.key} has an empty second line`);
      ok(typeof t.icon === 'string' && t.icon.length > 0, `${label}: ${t.key} has no icon`);
      ok(!/undefined|NaN|null/.test(t.value + t.sub), `${label}: ${t.key} printed a hole: "${t.value}" / "${t.sub}"`);
      /* A box is 2 columns wide on a phone; anything long is truncated by
         CSS, but the value should be short enough to read at a glance. */
      /* Measured, not guessed: a box is half a 390px phone wide and the
         headline renders at 14px bold, which runs out around 22 characters.
         Round 204 caught "at Tennessee Titans" this way and cut the boards
         back to nicknames. */
      ok(t.value.length <= 22, `${label}: ${t.key} value is ${t.value.length} chars, too long for the box: "${t.value}"`);
    }
  }
  console.log(`   ${states.length} save states, 5 boxes each, no blanks and no holes`);
}

/* ------------------------------------------------------- 2. the words hold */
console.log('2) The words the walks tap by do not drift');
{
  const tiles = foHubTiles(baseFacts());
  const fixed = tiles.filter(t => t.key !== 'play').map(t => t.title);
  ok(JSON.stringify(fixed) === JSON.stringify([...FO_TILE_TITLES]),
    `the fixed titles changed: ${fixed.join(', ')}`);
  /* The play box is the one word that differs by sport, and it is passed
     in rather than guessed, because the NFL board says "This week" and the
     other three say "Play". */
  ok(byKey(tiles, 'play').title === 'This week', 'the NFL play box lost its wording');
  ok(byKey(foHubTiles(baseFacts({ playWord: 'Play' })), 'play').title === 'Play', 'the play word is not being honored');
  /* Those exact strings are what the four boards' own walks click. */
  for (const w of ['Roster', 'Free agency', 'Trades', 'Standings']) {
    ok(fixed.includes(w), `a walk taps "${w}" and no box says it any more`);
  }
}

/* -------------------------------------------------------- 3. accent rules */
console.log('3) Every dot means something, and only one thing');
{
  /* The play box always pulses: it is the reason you opened the game. */
  ok(byKey(foHubTiles(baseFacts()), 'play').accent === true, 'the play box stopped pulsing');

  /* Roster: dark when everyone is fit, lit when anyone is not. */
  ok(byKey(foHubTiles(baseFacts()), 'team').accent === false, 'a fully fit roster is pulsing for no reason');
  const hurt = baseFacts();
  hurt.roster[3] = man('Crocked', 91, 20, 3);
  const hurtTiles = foHubTiles(hurt);
  ok(byKey(hurtTiles, 'team').accent === true, 'an injury does not light the roster box');
  ok(byKey(hurtTiles, 'team').value === '1 unavailable', `injury headline reads "${byKey(hurtTiles, 'team').value}"`);
  ok(byKey(hurtTiles, 'team').sub.includes('Crocked') && byKey(hurtTiles, 'team').sub.includes('3 weeks'),
    `the injury line should name the man and the weeks: "${byKey(hurtTiles, 'team').sub}"`);
  /* One week out is not "1 weeks". */
  const oneWeek = baseFacts();
  oneWeek.roster[0] = man('Knock', 88, 12, 1);
  ok(byKey(foHubTiles(oneWeek), 'team').sub.includes('1 week') && !byKey(foHubTiles(oneWeek), 'team').sub.includes('1 weeks'),
    'the injury line does not handle a single week');
  /* The worst hurt man is not the one named; the BEST hurt man is. */
  const twoHurt = baseFacts();
  twoHurt.roster[1] = man('Scrub', 70, 2, 4);
  twoHurt.roster[2] = man('Franchise', 95, 40, 1);
  ok(byKey(foHubTiles(twoHurt), 'team').sub.includes('Franchise'),
    'the roster box names a squad man over the missing star');

  /* Trades: dark until the payroll is over the line. */
  ok(byKey(foHubTiles(baseFacts()), 'trade').accent === false, 'the trade box pulses with a healthy cap sheet');
  const over = foHubTiles(baseFacts({ capRoom: -12 }));
  ok(byKey(over, 'trade').accent === true, 'being over the cap does not light the trade box');
  ok(byKey(over, 'trade').value.includes('12'), `the over the cap headline lost the number: "${byKey(over, 'trade').value}"`);
  ok(byKey(over, 'market').value.includes('over'), 'the free agency box should say you are over, not offer room');

  /* Standings: only late, and only outside the cut. */
  const earlyOut = baseFacts({ place: 14, period: 2 });
  ok(byKey(foHubTiles(earlyOut), 'standings').accent === false, 'week 2 outside the cut is not an emergency');
  const lateOut = baseFacts({ place: 14, period: 15 });
  ok(byKey(foHubTiles(lateOut), 'standings').accent === true, 'week 15 outside the cut should be shouting');
  const lateIn = baseFacts({ place: 3, period: 15 });
  ok(byKey(foHubTiles(lateIn), 'standings').accent === false, 'third place should not be shouting');
  /* The boundary is the cut itself, not one either side of it. */
  ok(byKey(foHubTiles(baseFacts({ place: 7, period: 16 })), 'standings').accent === false, 'the last qualifying place is being called out');
  ok(byKey(foHubTiles(baseFacts({ place: 8, period: 16 })), 'standings').accent === true, 'the first place outside the cut is not being called out');
  /* And it reads like English on both sides. */
  ok(byKey(foHubTiles(baseFacts({ place: 8, period: 16 })), 'standings').sub.startsWith('One place short'),
    'one place short should not read "1 places short"');
  ok(byKey(foHubTiles(baseFacts({ place: 1 })), 'standings').sub.includes('Top seed'), 'first place does not say so');
}

/* ------------------------------------------------- 4. the free agency rule */
console.log('4) The market box only shouts about a signing worth making');
{
  /* Roster runs 70..89, so the 67th percentile sits around 83. */
  const bar = percentileOvr(baseFacts().roster, 0.67);
  ok(bar >= 82 && bar <= 85, `the two thirds bar moved to ${bar}, which would change what counts as an upgrade`);

  /* Good enough AND affordable: shout. */
  const shout = foHubTiles(baseFacts({ freeAgents: [man('Real Signing', 90, 20)], capRoom: 30 }));
  ok(byKey(shout, 'market').accent === true, 'an affordable upgrade does not light the market box');
  ok(byKey(shout, 'market').sub.includes('Real Signing') && byKey(shout, 'market').sub.includes('90'),
    `the market line should name him and his rating: "${byKey(shout, 'market').sub}"`);

  /* Good enough but NOT affordable: stay dark, and say why. */
  const cantAfford = foHubTiles(baseFacts({ freeAgents: [man('Too Rich', 94, 60)], capRoom: 12 }));
  ok(byKey(cantAfford, 'market').accent === false, 'a man you cannot afford is lighting the market box');
  ok(byKey(cantAfford, 'market').sub.includes('out of reach'), `should say he is out of reach: "${byKey(cantAfford, 'market').sub}"`);

  /* Affordable but not an upgrade: stay dark. */
  const notBetter = foHubTiles(baseFacts({ freeAgents: [man('Backup', 74, 3)], capRoom: 40 }));
  ok(byKey(notBetter, 'market').accent === false, 'a 74 rated backup should not be news');
  ok(byKey(notBetter, 'market').sub.includes('Backup'), 'the market box should still name the best you can afford');

  /* Two men, one affordable upgrade and one unaffordable star: the box
     names the one you can actually sign. */
  const mixed = foHubTiles(baseFacts({ freeAgents: [man('Star', 96, 70), man('Gettable', 88, 10)], capRoom: 20 }));
  ok(byKey(mixed, 'market').sub.includes('Gettable'), 'the market box named a man you cannot sign');
  ok(byKey(mixed, 'market').accent === true, 'an affordable 88 is an upgrade and should pulse');

  /* An empty roster has no bar to clear, so nothing is an "upgrade" and
     the box must not pulse at a team that does not exist yet. */
  ok(byKey(foHubTiles(baseFacts({ roster: [], freeAgents: [man('Anyone', 80, 3)] })), 'market').accent === false,
    'an empty roster is pulsing about free agency');

  /* Salary exactly equal to the room is affordable. */
  ok(byKey(foHubTiles(baseFacts({ freeAgents: [man('Exact', 90, 30)], capRoom: 30 })), 'market').accent === true,
    'a man who costs exactly your room is being treated as unaffordable');
}

/* -------------------------------------------------------- 5. the play box */
console.log('5) The play box tells the truth in all four sports');
{
  const home = byKey(foHubTiles(baseFacts()), 'play');
  ok(home.value === 'vs Dallas', `home fixture reads "${home.value}"`);
  /* The longest real NFL nickname, to prove the box holds the worst case. */
  ok(byKey(foHubTiles(baseFacts({ nextOpponent: { label: 'Commanders', home: false } })), 'play').value.length <= 22,
    'the longest nickname in the league does not fit the box');
  const away = byKey(foHubTiles(baseFacts({ nextOpponent: { label: 'Dallas', home: false } })), 'play');
  ok(away.value === 'at Dallas', `away fixture reads "${away.value}"`);
  ok(home.sub.includes('won 27-20') && home.sub.includes('New York'), `last result reads "${home.sub}"`);
  const lost = byKey(foHubTiles(baseFacts({ lastResult: { won: false, us: 13, them: 31, opponent: 'Kansas City' } })), 'play');
  ok(lost.sub.includes('lost 13-31'), `a defeat reads "${lost.sub}"`);
  /* A bye week is a bye week only where fixtures exist. */
  ok(byKey(foHubTiles(baseFacts({ nextOpponent: null })), 'play').value === 'Bye week', 'the NFL bye week lost its wording');
  const stretch = byKey(foHubTiles(baseFacts({
    hasFixtures: false, nextOpponent: null, lastResult: null, playWord: 'Play', periodWord: 'round', period: 7, periods: 20,
  })), 'play');
  ok(stretch.value === 'Round 7 of 20', `a stretch sport should say where it is, not claim a bye: "${stretch.value}"`);
  ok(byKey(foHubTiles(baseFacts({ period: 18 })), 'play').value === 'Postseason', 'the postseason is not being named');
  /* With no result yet, the second line falls back to the record. */
  ok(byKey(foHubTiles(baseFacts({ lastResult: null, period: 1, wins: 0, losses: 0 })), 'play').sub.includes('0-0'),
    'a fresh save should show its record on the play box');
}

/* --------------------------------------------- 6. the boards actually use it */
console.log('6) All four boards are on the tiles, and the pills are gone');
{
  const BOARDS = [
    ['src/components/front-office/FrontOfficeBoard.tsx', 'week'],
    ['src/components/mlb-front-office/MlbFrontOfficeBoard.tsx', 'round'],
    ['src/components/nba-front-office/NbaFrontOfficeBoard.tsx', 'round'],
    ['src/components/nhl-front-office/NhlFrontOfficeBoard.tsx', 'round'],
  ];
  for (const [rel, playKey] of BOARDS) {
    const t = fs.readFileSync(path.join(ROOT, rel), 'utf-8');
    ok(t.includes("from '@/lib/foHub'"), `${rel}: does not use the hub engine`);
    ok(t.includes('<FoHubTiles'), `${rel}: does not render the tiles`);
    ok(t.includes('<FoPanelHeader'), `${rel}: has no way back to the hub`);
    /* The old pill row is gone, not merely hidden. */
    ok(!t.includes('as [Tab, string, typeof Users][]'), `${rel}: still builds the old pill row`);
    ok(!t.includes('rounded-full bg-secondary p-1 text-xs'), `${rel}: the pill bar styling is still here`);
    /* The hub opens on the hub, which is what makes it a hub. */
    ok(t.includes('useState<Tab | null>(null)'), `${rel}: does not open on the hub`);
    ok(!/setTab\('team'\)/.test(t), `${rel}: still resets to a tab instead of the hub`);
    /* And the sport's own play tab is what the play box maps to. */
    ok(t.includes(`setTab(key === 'play' ? '${playKey}' : key)`), `${rel}: the play box is not wired to its own tab`);
  }
  console.log('   4 boards on tiles, 0 pill rows left');
}

/* ------------------------------------------- 7. against a real live league */
console.log('7) A real NFL league produces sane boxes on every week of a season');
{
  /* The unit tests above use hand-built facts. This runs the actual engine
     so the shapes the boards flatten are the shapes that really exist. */
  const lg = nfl.initLeague();
  const me = Object.keys(lg.teams)[0];
  let checked = 0;
  for (let w = 1; w <= nfl.REGULAR_WEEKS; w += 1) {
    const my = lg.teams[me];
    const game = lg.schedule[lg.week - 1].find(g => g.home === me || g.away === me);
    const conf = nfl.conferenceOf(me);
    const table = nfl.standings(lg.teams).filter(x => nfl.conferenceOf(x.abbr) === conf);
    const tiles = foHubTiles({
      roster: my.players.map(p => ({ name: p.name, pos: p.pos, age: p.age, ovr: p.ovr, salary: p.salary, out: p.out })),
      freeAgents: lg.freeAgents.map(p => ({ name: p.name, pos: p.pos, age: p.age, ovr: p.ovr, salary: p.salary, out: p.out })),
      capRoom: nfl.capRoom(my, lg.cap),
      wins: my.wins, losses: my.losses,
      period: lg.week, periods: nfl.REGULAR_WEEKS,
      playWord: 'This week', periodWord: 'week',
      hasFixtures: true,
      nextOpponent: game ? { label: game.home === me ? game.away : game.home, home: game.home === me } : null,
      lastResult: null,
      place: table.findIndex(x => x.abbr === me) + 1,
      cut: 7, tableName: conf,
      tradeLine: null, titles: 0,
    });
    ok(tiles.length === 5, `week ${w}: ${tiles.length} boxes`);
    for (const t of tiles) {
      ok(t.value.trim().length > 0 && t.sub.trim().length > 0, `week ${w}: ${t.key} went blank on a real league`);
      ok(!/undefined|NaN/.test(t.value + t.sub), `week ${w}: ${t.key} printed a hole on a real league`);
    }
    /* The table place is real: 1..16 in a conference, never 0. */
    const place = Number(byKey(tiles, 'standings').value.replace(/[^0-9]/g, ''));
    ok(place >= 1 && place <= 16, `week ${w}: conference place came out ${place}`);
    checked += 1;
    /* Advance the league exactly the way the board's Play Week does, so
       what this walks through is the real thing and not a toy. */
    nfl.injuryPass(lg.teams, Math.random);
    const played = lg.schedule[lg.week - 1].map(g => nfl.simGame(g, lg.teams, Math.random));
    lg.schedule[lg.week - 1] = played;
    lg.week += 1;
  }
  console.log(`   ${checked} weeks of a live league, every box readable`);
}

console.log('');
if (failures > 0) {
  console.error(`simFoHub: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simFoHub: green. Four hubs, five boxes each, every one of them saying something true.');
