/* Reviewer's mutation maker for Round 1305 (never committed). Run on a GitHub runner from the repo root:
     node .rc/x/r1305mut.mjs <name>
   It rewrites ONE string that must be in its file exactly once, or exits 2 and changes nothing.
   The request line restores the file with git checkout in the same line. */
import fs from 'node:fs';

const BOARD = 'src/components/front-office/FrontOfficeBoard.tsx';
const NBA = 'src/components/nba-front-office/NbaFrontOfficeBoard.tsx';
const BIND = 'src/lib/frontOfficeGameDay.ts';
const LOG = 'src/lib/gmGameLog.ts';

const MUTATIONS = {
  /* the week's games are keyed to next season (an off by one in the key recipe on the board) */
  keyseason: {
    file: BOARD,
    from: 'const told = games.map(g => nflTell(g, lg.teams, lg.season, nflWhere(lg.week), deskWeek?.edges));',
    to: 'const told = games.map(g => nflTell(g, lg.teams, lg.season + 1, nflWhere(lg.week), deskWeek?.edges));',
  },
  /* half of the filter dropped: his road games are never logged */
  awayonly: {
    file: BOARD,
    from: 'const mine = told.find(t => t.game.home === myTeam || t.game.away === myTeam);',
    to: 'const mine = told.find(t => t.game.home === myTeam);',
  },
  /* a stale variable: the final press builds the playoff log from the saved log, losing Week 17 */
  finalweeklog: {
    file: BOARD,
    from: 'log = addToGmGameLog(log, lg.season, toldPlayoffs.flatMap(r => r.told)',
    to: 'log = addToGmGameLog(gameLogLive.current, lg.season, toldPlayoffs.flatMap(r => r.told)',
  },
  /* the playoff games are told with no edges at all (the builder names this blind spot: tellnoedges) */
  playoffnoedges: {
    file: BOARD,
    from: 'told: r.games.map(g => nflTell(g, lg.teams, lg.season, r.name, playoffEdges))',
    to: 'told: r.games.map(g => nflTell(g, lg.teams, lg.season, r.name, undefined))',
  },
  /* swapped arguments: the home club is given the road club's edge */
  edgeswap: {
    file: BIND,
    from: 'winProb(home, away, edges[g.home] ?? 0, edges[g.away] ?? 0)',
    to: 'winProb(home, away, edges[g.away] ?? 0, edges[g.home] ?? 0)',
  },
  /* a dropped filter: a log of another season is appended to */
  seasonkeep: {
    file: LOG,
    from: 'const kept = log && log.season === season ? log.games : [];',
    to: 'const kept = log ? log.games : [];',
  },
  /* an off by one at the cap */
  capoff: {
    file: LOG,
    from: 'if (kept.length + games.length > GM_GAME_LOG_CAP) return',
    to: 'if (kept.length + games.length >= GM_GAME_LOG_CAP) return',
  },
  /* the reader no longer asks that every game is his club's */
  readerclub: {
    file: LOG,
    from: 'if (!g || (g.home !== club && g.away !== club) || keys.has(g.key)) return null;',
    to: 'if (!g || keys.has(g.key)) return null;',
  },
  /* the NBA card loses the first rival pick when the desk is on */
  nbaslice: {
    file: NBA,
    from: 'rivalPicks.splice(0, rivalPicks.length, ...rivalPicks.map(x => {',
    to: 'rivalPicks.splice(0, rivalPicks.length, ...rivalPicks.slice(1).map(x => {',
  },
  /* the summer's clear moved below nothing: the log is cleared on a new franchise and on abandon only */
  summerkeeps: {
    file: BOARD,
    from: 'setGameLog(null); /* the summer */',
    to: '/* the summer */',
  },
};

const name = process.argv[2];
const m = MUTATIONS[name];
if (!m) { console.error(`unknown mutation ${name} (${Object.keys(MUTATIONS).join(', ')})`); process.exit(2); }
const src = fs.readFileSync(m.file, 'utf8');
const count = src.split(m.from).length - 1;
if (count !== 1) { console.error(`mutation ${name}: its string is in ${m.file} ${count} times, not once. Nothing changed.`); process.exit(2); }
const out = src.replace(m.from, () => m.to);
if (out === src) { console.error(`mutation ${name}: the rewrite changed nothing`); process.exit(2); }
fs.writeFileSync(m.file, out);
console.log(`mutation ${name} applied to ${m.file}`);
