/* Round 1211: holds the two season ledgers (src/data/usSeasonLedgerMlb.ts and
   src/data/usSeasonLedgerNhl.ts) to themselves, to their receipts
   (scripts/data/usSeasonSources1211.json), to this file's own typed table and
   to the game's own team lists. It is a pure data harness: no career is
   played, no clock is read, no network is touched, and no engine is edited.

   WHAT A RED MEANS. A check below fails only on the LEDGER (a season missing,
   club games that do not add up, an id the game does not hold under that
   name that year, a row with one source). Where the ledger disagrees with
   what an ENGINE plays today, that is printed under "NOTES FOR THE BINDING
   ROUNDS" and never fails: the engines are not this round's to change.

   THE NUMBERS, measured on the tree this was written on (2026-10-10):
   - MLB: 23 seasons, 2004 to 2026. 16 of them hold a club off the schedule's
     length; 50 club lines in all (32 on 161, 14 on 163, 2 on 58, and 2 on
     162 with a tie inside). Every season's 30 clubs add up to the league
     total Baseball Reference prints (4,856 to 4,862; 1,796 in 2020).
   - NHL: 21 seasons, 2006-07 to 2026-27, in 8 alignments. Every finished
     season's clubs times games is twice Hockey Reference's league games.
   - Engines against the ledger (notes): the playoff game law fits every NHL
     count; for MLB 84.7 percent of Wild Card exits and 32.6 percent of
     Division Series exits save a count the real rounds cannot hold.
   1,185 checks in all. No band here was set by feel: every check is an
   equality, a sum or a set.

   CONTROLS (US_LEDGER_CONTROL=<name>): each changes one fact in the loaded
   data, refuses to run (exit 2, "CONTROL ... ABORTED") when the thing it
   changes is not there, and must turn exactly its NAMED check labels red.
   Fired: exit 1 and the last line says FIRED. Red anywhere else, or green:
   exit 3 and the last line says MISFIRED. Run with US_LEDGER_CONTROL=list to
   print the names. */
import os from 'node:os';
import path from 'node:path';
import { build } from 'esbuild';
import { readFileSync, unlinkSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const CONTROL = process.env.US_LEDGER_CONTROL || '';

/* One bundle per process: two runs side by side never share a temp file. */
const OUT = path.join(os.tmpdir(), `us-season-ledger-${process.pid}.mjs`);
await build({
  stdin: {
    contents: [
      "export * as mlb from './src/data/usSeasonLedgerMlb.ts';",
      "export * as nhl from './src/data/usSeasonLedgerNhl.ts';",
      "export { MLB_TEAMS_2004, MLB_ERAS } from './src/lib/mlbMyCareer.ts';",
      "export { NHL_TEAMS_2006, NHL_ERAS } from './src/lib/nhlMyCareer.ts';",
      "export { MLB_TEAMS } from './src/data/conquestDataMlb.ts';",
      "export { NHL_TEAMS } from './src/data/conquestDataNhl.ts';",
      "export { playoffGames } from './src/lib/careerVariance.ts';",
    ].join('\n'),
    resolveDir: ROOT, loader: 'ts',
  },
  bundle: true, format: 'esm', platform: 'node', outfile: OUT,
  logLevel: 'error', alias: { '@': './src' },
});
const game = await import(pathToFileURL(OUT).href);
try { unlinkSync(OUT); } catch { /* a temp file left behind is harmless */ }

/* Deep copies, so a control can change the data and nothing else. */
const clone = x => JSON.parse(JSON.stringify(x));
const mlb = clone({ ...game.mlb });
const nhl = clone({ ...game.nhl });
const receipts = JSON.parse(readFileSync(path.join(ROOT, 'scripts/data/usSeasonSources1211.json'), 'utf8'));
const SRC = receipts.sources;

const label = t => `${t.city} ${t.name}`;
/* The game's own lists, and the first year a career on each can play. */
const MLB_LISTS = [
  { era: 'y2004', from: game.MLB_ERAS.find(e => e.id === 'y2004').startYear, teams: game.MLB_TEAMS_2004 },
  { era: 'now', from: game.MLB_ERAS.find(e => e.id === 'now').startYear, teams: game.MLB_TEAMS },
];
const NHL_LISTS = [
  { era: 'y2006', from: game.NHL_ERAS.find(e => e.id === 'y2006').startYear, teams: game.NHL_TEAMS_2006 },
  { era: 'now', from: game.NHL_ERAS.find(e => e.id === 'now').startYear, teams: game.NHL_TEAMS },
];

/* THIS FILE'S OWN TABLE: typed here, never read from the ledgers, so a
   control that changes a ledger cannot change both sides at once. */
const OWN = {
  mlbYears: [2004, 2026],
  /* year: how many clubs on each count that is not the plain schedule length. */
  mlbOff: {
    2004: { 161: 4 }, 2005: { 163: 2 }, 2006: { 161: 2 }, 2007: { 163: 2 }, 2008: { 161: 6, 163: 2 }, 2009: { 161: 2, 163: 2 },
    2011: { 161: 2 }, 2013: { 163: 2 }, 2015: { 161: 2 }, 2016: { 161: 4, 162: 2 }, 2018: { 161: 2, 163: 4 }, 2019: { 161: 2 },
    2020: { 58: 2 }, 2021: { 161: 2 }, 2024: { 161: 2 }, 2026: { 161: 2 },
  },
  mlb2026Short: ['BAL', 'NYY'],
  mlbSchedule: { 2020: 60 },
  nhlYears: [2006, 2026],
  nhlGames: { 2012: 48, 2019: null, 2020: 56, 2026: 84 },
  nhlTeams: { 2006: 30, 2017: 31, 2021: 32 },
  nhl84: { leagueGames: 1344, home: 42 },
};

/* ---------- the controls: one changed fact each ---------- */
const EXTRA = { text: '' };
const must = (ok, what) => { if (!ok) { console.log(`CONTROL ${CONTROL} ABORTED: ${what} is not there to change`); process.exit(2); } };
const mlbRow = y => { const r = mlb.MLB_SEASONS.find(x => x.year === y); must(r, `the MLB ${y} row`); return r; };
const nhlRow = y => { const r = nhl.NHL_SEASONS.find(x => x.year === y); must(r, `the NHL ${y} row`); return r; };
const nhlAlign = k => { const a = nhl.NHL_ALIGNMENTS.find(x => x.key === k); must(a, `the alignment ${k}`); return a; };
const CONTROLS = {
  mlbyear: { expect: ['M1'], run() { const i = mlb.MLB_SEASONS.findIndex(x => x.year === 2010); must(i >= 0, 'the MLB 2010 row'); mlb.MLB_SEASONS.splice(i, 1); } },
  /* The row's own total moves and its clubs do not: the clubs no longer add up to it. */
  mlbsum: { expect: ['M2'], run() { const r = mlbRow(2008); must(r.teamGames === 4856, 'the 4,856 team games of 2008'); r.teamGames = 4858; } },
  /* The critic's own fear: the real 2008 Nationals written onto the game's Expos. */
  mlbid: { expect: ['M3'], run() { const g = mlbRow(2008).clubs.find(x => x.clubs.includes('Washington Nationals')); must(g && !g.ids.includes('MON'), 'the 2008 Nationals with no id'); g.ids.push('MON'); } },
  mlbspan: { expect: ['M4'], run() { const i = mlb.MLB_NAME_SPANS.findIndex(x => x.id === 'TBD'); must(i >= 0, 'the Devil Rays span'); mlb.MLB_NAME_SPANS.splice(i, 1); } },
  mlbown: { expect: ['M5'], run() { const g = mlbRow(2026).clubs[0]; must(g && g.ids.includes('NYY'), 'the 2026 Yankees on 161'); g.clubs = g.clubs.filter(c => c !== 'New York Yankees'); g.ids = g.ids.filter(i => i !== 'NYY'); g.clubs.push('Boston Red Sox'); g.ids.push('BOS'); } },
  mlbdiv: { expect: ['M6'], run() { const w = mlb.MLB_DIVISIONS_2026.find(x => x.name === 'AL West'); const c = mlb.MLB_DIVISIONS_2026.find(x => x.name === 'AL Central'); must(w && c && w.teams.includes('HOU') && c.teams.includes('MIN'), 'Houston in the AL West and Minnesota in the AL Central'); w.teams = w.teams.map(t => (t === 'HOU' ? 'MIN' : t)); c.teams = c.teams.map(t => (t === 'MIN' ? 'HOU' : t)); } },
  mlbformula: { expect: ['M7'], run() { const f = mlb.MLB_FORMULAS.find(x => x.from === 2025); must(f && f.division.games === 13, 'the 13 division games'); f.division.games = 14; } },
  mlbrival: { expect: ['M8'], run() { const p = mlb.MLB_RIVALS.find(x => x[0] === 'SEA'); must(p && p[1] === 'SDP', 'the Mariners and Padres pair'); p[1] = 'TEX'; } },
  mlbplayoff: { expect: ['M9'], run() { must(mlb.MLB_PLAYOFF_FORMAT.series[0][1] === 3, 'the best of three'); mlb.MLB_PLAYOFF_FORMAT.series[0][1] = 4; } },
  mlbscore: { expect: ['M10'], run() { must(mlb.MLB_SCORING.now === 4.48, 'the 4.48'); mlb.MLB_SCORING.now = 4.84; } },
  dash: { expect: ['D1'], run() { EXTRA.text = String.fromCharCode(0x2014); } },
  nosource: { expect: ['R1'], run() { mlbRow(2012).src.push('no-such-receipt'); } },
  onesource: { expect: ['R2'], run() { const r = mlbRow(2006); must(r.src.includes('espn'), 'ESPN on the 2006 row'); r.src = r.src.filter(k => k !== 'espn'); } },
  wiki: { expect: ['R3'], run() { must(SRC.retro, 'the Retrosheet receipt'); SRC.retro.url = 'https://en.wikipedia.org/wiki/<year>_Major_League_Baseball_season'; } },
  thincited: { expect: ['R4'], run() { must(SRC['espn-expanded'] && SRC['espn-expanded'].thin, 'the thin ESPN receipt'); mlbRow(2026).src.push('espn-expanded'); } },
  filled: { expect: ['R5'], run() { must(mlb.MLB_GAME_SHARES.oneRun === null, 'the empty one run share'); mlb.MLB_GAME_SHARES.oneRun = 0.275; } },
  nhlyear: { expect: ['N1'], run() { const i = nhl.NHL_SEASONS.findIndex(x => x.year === 2012); must(i >= 0, 'the NHL 2012 row'); nhl.NHL_SEASONS.splice(i, 1); } },
  nhlgames: { expect: ['N2'], run() { const r = nhlRow(2020); must(r.games === 56, 'the 56'); r.games = 82; } },
  /* The 2026 window back on 82: the length and the formula both say so. */
  nhl84: { expect: ['N2', 'N5'], run() { const r = nhlRow(2026); must(r.games === 84, 'the 84'); r.games = 82; } },
  nhlalign: { expect: ['N3'], run() { const d = nhlAlign('four-2017').divisions.find(x => x.name === 'Pacific'); must(d && d.teams.includes('VGK'), 'Vegas in the Pacific'); d.teams = d.teams.filter(t => t !== 'VGK'); } },
  nhllist: { expect: ['N4'], run() { const d = nhlAlign('six-2006').divisions.find(x => x.name === 'Southeast'); must(d && d.teams.includes('ATL'), 'Atlanta in the Southeast'); d.teams = d.teams.map(t => (t === 'ATL' ? 'WPG' : t)); } },
  nhlformula: { expect: ['N5'], run() { must(nhl.NHL_FORMULA_84.division.games === 4, 'the four division games'); nhl.NHL_FORMULA_84.division.games = 3; } },
  nhlplayoff: { expect: ['N6'], run() { must(nhl.NHL_PLAYOFF_FORMAT.series[0][1] === 7, 'the best of seven'); nhl.NHL_PLAYOFF_FORMAT.series[0] = [3, 5]; } },
  nhlscore: { expect: ['N7'], run() { must(nhl.NHL_OVERTIME.now.shootouts === 119, 'the 119 shootouts'); nhl.NHL_OVERTIME.now.shootouts = 0; } },
};
if (CONTROL === 'list') { console.log(Object.keys(CONTROLS).join(' ')); process.exit(0); }
if (CONTROL && !CONTROLS[CONTROL]) { console.error(`unknown US_LEDGER_CONTROL "${CONTROL}", expected one of: ${Object.keys(CONTROLS).join(', ')}`); process.exit(2); }
if (CONTROL) CONTROLS[CONTROL].run();

/* ---------- the checks ---------- */
const red = new Map();
const notes = [];
let passed = 0;
const check = (id, ok, what) => { if (ok) { passed++; return; } if (!red.has(id)) red.set(id, []); red.get(id).push(what); };
const sameSet = (a, b) => a.length === b.length && [...a].sort().join() === [...b].sort().join();
const rangeOf = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

/* ===== MLB ===== */
const OWN_MLB_DIVISIONS = {
  'AL East': 'BAL BOS NYY TBR TOR', 'AL Central': 'CHW CLE DET KCR MIN', 'AL West': 'ATH HOU LAA SEA TEX',
  'NL East': 'ATL MIA NYM PHI WSN', 'NL Central': 'CHC CIN MIL PIT STL', 'NL West': 'ARI COL LAD SDP SFG',
};
{
  const rows = mlb.MLB_SEASONS;
  /* M1: every season in range, once, in order. */
  check('M1', sameSet(rows.map(r => r.year), rangeOf(...OWN.mlbYears)) && rows.every((r, i) => i === 0 || r.year === rows[i - 1].year + 1),
    `MLB seasons are not ${OWN.mlbYears[0]} to ${OWN.mlbYears[1]} once each in order: ${rows.map(r => r.year).join(' ')}`);
  check('M1', mlb.MLB_LENGTHS_VERIFIED_TO === OWN.mlbYears[1], `MLB_LENGTHS_VERIFIED_TO is ${mlb.MLB_LENGTHS_VERIFIED_TO}`);

  let lines = 0; const tally = {};
  for (const r of rows) {
    /* M2: the 30 clubs add up to the league total the receipts hold, and to an even number. */
    const off = r.clubs.reduce((t, g) => t + (g.games - r.games) * g.clubs.length, 0);
    const sum = 30 * r.games + off;
    const want = SRC['bref-league']?.values?.teamGames?.[r.year];
    check('M2', sum === r.teamGames, `${r.year}: the clubs add up to ${sum} team games, the row says ${r.teamGames}`);
    check('M2', sum === want, `${r.year}: the clubs add up to ${sum} team games, the receipt says ${want}`);
    check('M2', sum % 2 === 0, `${r.year}: ${sum} team games is odd, and every game has two clubs`);
    const named = r.clubs.flatMap(g => g.clubs);
    check('M2', new Set(named).size === named.length, `${r.year}: a club is in two groups`);
    for (const g of r.clubs) {
      check('M2', g.games !== r.games || (g.ties ?? 0) > 0, `${r.year}: a group on the plain ${r.games} with no tie has no business in the row`);
      check('M2', typeof g.why === 'string' && g.why.length > 10 && g.why.includes(String(g.games)), `${r.year}: the why of the ${g.games} group does not say ${g.games}`);
      lines += g.clubs.length; tally[g.games] = (tally[g.games] ?? 0) + g.clubs.length;

      /* M3: an id is listed exactly when a list that reaches the year holds that club under that name. */
      const expected = [];
      for (const club of g.clubs) {
        const ids = new Set();
        for (const list of MLB_LISTS) if (r.year >= list.from) for (const t of list.teams) if (label(t) === club) ids.add(t.id);
        expected.push(...ids);
      }
      check('M3', sameSet(g.ids, expected), `${r.year}, ${g.games} games: ids ${g.ids.join(' ') || '(none)'} but the game's lists hold ${expected.join(' ') || '(none)'} under those names that year`);
    }

    /* M5: this file's own count of the clubs off the schedule. */
    const mine = OWN.mlbOff[r.year] ?? {};
    const theirs = Object.fromEntries(r.clubs.map(g => [g.games, g.clubs.length]));
    check('M5', JSON.stringify(Object.entries(mine).sort()) === JSON.stringify(Object.entries(theirs).map(([k, v]) => [String(k), v]).sort()),
      `${r.year}: the row holds ${JSON.stringify(theirs)}, this harness's own table ${JSON.stringify(mine)}`);
    check('M5', r.games === (OWN.mlbSchedule[r.year] ?? 162), `${r.year}: the schedule is ${r.games}, this harness's own table says ${OWN.mlbSchedule[r.year] ?? 162}`);
    if (r.year === 2026) check('M5', sameSet(r.clubs.flatMap(g => g.ids), OWN.mlb2026Short), `2026: the listed ids are ${r.clubs.flatMap(g => g.ids).join(' ')}, this harness's own table says ${OWN.mlb2026Short.join(' ')}`);
  }
  console.log(`MLB: ${rows.length} seasons, ${rows.filter(r => r.clubs.length).length} with a club off the schedule, ${lines} club lines (${Object.entries(tally).map(([g, n]) => `${n} on ${g}`).join(', ')})`);

  /* M4: the name spans are exactly the ids only the 2004 list holds, under the list's own names. */
  const nowIds = new Set(game.MLB_TEAMS.map(t => t.id));
  const eraOnly = game.MLB_TEAMS_2004.filter(t => !nowIds.has(t.id));
  check('M4', sameSet(mlb.MLB_NAME_SPANS.map(s => s.id), eraOnly.map(t => t.id)), `the spans name ${mlb.MLB_NAME_SPANS.map(s => s.id).join(' ')}, the 2004 list's own ids are ${eraOnly.map(t => t.id).join(' ')}`);
  for (const s of mlb.MLB_NAME_SPANS) {
    const t = game.MLB_TEAMS_2004.find(x => x.id === s.id);
    check('M4', !!t && label(t) === s.club && s.from === MLB_LISTS[0].from && s.to >= s.from && s.to < OWN.mlbYears[1] && s.next !== s.club, `the span of ${s.id} does not match the 2004 list (${t ? label(t) : 'no such id'})`);
  }
  for (const t of game.MLB_TEAMS_2004) {
    const n = game.MLB_TEAMS.find(x => x.id === t.id);
    if (n && label(n) !== label(t)) notes.push(`MLB id ${t.id} is "${label(t)}" in the 2004 list and "${label(n)}" in today's: a shared id with two names.`);
  }

  /* M6: six divisions of five, today's 30 ids, as this file's own table has them. */
  const divs = mlb.MLB_DIVISIONS_2026;
  check('M6', divs.length === 6 && divs.every(d => d.teams.length === 5), 'MLB is not six divisions of five');
  check('M6', sameSet(divs.flatMap(d => d.teams), game.MLB_TEAMS.map(t => t.id)), 'the MLB divisions do not hold exactly the 30 ids of the game');
  for (const d of divs) check('M6', (OWN_MLB_DIVISIONS[d.name] ?? '') === [...d.teams].sort().join(' ') && d.conf === d.name.slice(0, 2), `${d.name} is ${[...d.teams].sort().join(' ')}, this harness's own table says ${OWN_MLB_DIVISIONS[d.name]}`);

  /* M7: each formula adds up to its season. */
  for (const f of mlb.MLB_FORMULAS) {
    const tag = `MLB formula ${f.from} to ${f.to}`;
    check('M7', f.division.opponents * f.division.games === f.division.total && f.division.opponents === 4, `${tag}: the division games do not make ${f.division.total}`);
    check('M7', f.league.sixGames * 6 + f.league.sevenGames * 7 === f.league.total && f.league.sixGames + f.league.sevenGames === 10, `${tag}: six and seven game opponents do not make ${f.league.total} over 10 clubs`);
    check('M7', f.interleague.opponents * f.interleague.games === f.interleague.total && f.interleague.opponents + 1 === 15, `${tag}: the other league is not 14 series and a rival`);
    check('M7', f.division.total + f.league.total + f.interleague.total + f.rival.games === f.games && f.games === 162, `${tag}: ${f.division.total} + ${f.league.total} + ${f.interleague.total} + ${f.rival.games} is not ${f.games}`);
    check('M7', f.rival.home * 2 === f.rival.games && f.division.homeOrAway[0] + f.division.homeOrAway[1] === f.division.games, `${tag}: a home and away split does not add up`);
  }
  check('M7', mlb.MLB_FORMULAS.some(f => f.from <= 2026 && f.to >= 2026), 'no MLB formula covers 2026');

  /* M8: fifteen pairs, an American League club with a National League club, every club once. */
  const leagueOf = Object.fromEntries(divs.flatMap(d => d.teams.map(t => [t, d.conf])));
  const paired = mlb.MLB_RIVALS.flat();
  check('M8', mlb.MLB_RIVALS.length === 15 && sameSet(paired, game.MLB_TEAMS.map(t => t.id)), 'the rival pairs do not hold every one of the 30 clubs exactly once');
  for (const [a, n] of mlb.MLB_RIVALS) check('M8', leagueOf[a] === 'AL' && leagueOf[n] === 'NL', `the pair ${a} and ${n} is not an AL club with an NL club`);

  /* M9: the rounds and their lengths, and a first round for every season from 2004. */
  const pf = mlb.MLB_PLAYOFF_FORMAT;
  check('M9', pf.rounds.length === 4 && pf.series.length === 4 && pf.series.every(([w, m]) => m === 2 * w - 1), 'an MLB series is not a best of an odd number');
  check('M9', pf.clubs === 12 && pf.byesPerLeague === 2 && pf.from === 2022, 'the MLB field is not twelve with two byes a league from 2022');
  const fr = mlb.MLB_FIRST_ROUND;
  check('M9', fr[0].from === OWN.mlbYears[0] && fr[fr.length - 1].to === null && fr.every((w, i) => i === 0 || w.from === fr[i - 1].to + 1), 'the first round windows leave a gap or overlap');
  const cur = fr[fr.length - 1];
  check('M9', cur.from === pf.from && cur.round === pf.rounds[0] && JSON.stringify(cur.series) === JSON.stringify(pf.series[0]) && cur.clubs === pf.clubs, 'the last first round window is not the format');
  check('M9', mlb.MLB_NO_TIEBREAKER_GAME_FROM === pf.from, 'the tiebreaker game did not end with the format');
  /* No club played a 163rd game once the tiebreaker game was gone. */
  for (const r of rows) if (r.year >= mlb.MLB_NO_TIEBREAKER_GAME_FROM) check('M9', r.clubs.every(g => g.games <= r.games), `${r.year}: a club is over the schedule after the tiebreaker game ended`);

  /* M10: league scoring for both of the game's eras, against both receipts. */
  for (const era of game.MLB_ERAS) {
    const y = mlb.MLB_SCORING_YEAR[era.id]; const v = mlb.MLB_SCORING[era.id];
    const a = SRC['bref-league']?.values?.runsPerGame?.[y];
    const runs = SRC['espn-runs']?.values?.runs?.[y]; const tg = SRC['bref-league']?.values?.teamGames?.[y];
    check('M10', typeof v === 'number' && v === a, `MLB scoring for ${era.id} (${y}) is ${v}, the first receipt says ${a}`);
    check('M10', typeof v === 'number' && Math.abs(runs / tg - v) < 0.005, `MLB scoring for ${era.id} (${y}) is ${v}, the second receipt's ${runs} runs over ${tg} team games is ${(runs / tg).toFixed(3)}`);
    check('M10', y === (era.id === 'now' ? mlb.MLB_LENGTHS_VERIFIED_TO : era.startYear), `MLB scoring for ${era.id} is of ${y}`);
  }

  /* The club outside the league is in neither list. */
  for (const o of mlb.MLB_OUTSIDE_CLUBS) check('M3', !MLB_LISTS.some(l => l.teams.some(t => label(t) === o.team || t.id === o.team)), `${o.team} is in one of the game's MLB lists`);
}

/* ===== NHL ===== */
const OWN_NHL_TODAY = { Atlantic: 'BOS BUF DET FLA MTL OTT TBL TOR', Metropolitan: 'CAR CBJ NJD NYI NYR PHI PIT WSH', Central: 'CHI COL DAL MIN NSH STL UTA WPG', Pacific: 'ANA CGY EDM LAK SEA SJS VAN VGK' };
{
  const rows = nhl.NHL_SEASONS;
  const aligns = nhl.NHL_ALIGNMENTS;
  const alignOf = y => aligns.find(a => y >= a.from && (a.to === null || y <= a.to));
  /* N1: every season in range, once, in order. */
  check('N1', sameSet(rows.map(r => r.year), rangeOf(...OWN.nhlYears)) && rows.every((r, i) => i === 0 || r.year === rows[i - 1].year + 1),
    `NHL seasons are not ${OWN.nhlYears[0]} to ${OWN.nhlYears[1]} once each in order: ${rows.map(r => r.year).join(' ')}`);
  const lastDone = rows.filter(r => r.finished).map(r => r.year).pop();
  check('N1', nhl.NHL_LENGTHS_VERIFIED_TO === lastDone, `NHL_LENGTHS_VERIFIED_TO is ${nhl.NHL_LENGTHS_VERIFIED_TO}, the last finished season in the rows is ${lastDone}`);

  let teamsWant = 0;
  for (const r of rows) {
    /* N2: clubs times games is twice the league's games, by the row, the receipt and this file's own table. */
    const clubGames = Object.values(nhl.NHL_2019_CLUB_GAMES);
    const tg = r.games !== null ? r.teams * r.games : clubGames.reduce((t, x) => t + x, 0);
    const want = r.finished ? SRC['hr-league']?.values?.leagueGames?.[r.year] : OWN.nhl84.leagueGames;
    check('N2', tg === 2 * r.leagueGames, `${r.year}: ${r.teams} clubs add up to ${tg} team games, the row's league games are ${r.leagueGames}`);
    check('N2', r.leagueGames === want, `${r.year}: the row's league games are ${r.leagueGames}, ${r.finished ? 'the receipt says' : 'the own table of this harness says'} ${want}`);
    const mine = r.year in OWN.nhlGames ? OWN.nhlGames[r.year] : 82;
    check('N2', r.games === mine, `${r.year}: the row says ${r.games} games, the own table of this harness says ${mine}`);
    check('N2', (r.games === null) === (typeof r.why === 'string'), `${r.year}: a season with no single length needs its why, and only such a season`);
    if (r.games === null) check('N2', clubGames.length === r.teams && Math.min(...clubGames) === 68 && Math.max(...clubGames) === 71 && r.why.includes('68 to 71'), `${r.year}: the club games are not ${r.teams} clubs on 68 to 71`);
    teamsWant = OWN.nhlTeams[r.year] ?? teamsWant;
    check('N2', r.teams === teamsWant, `${r.year}: ${r.teams} clubs, the own table of this harness says ${teamsWant}`);
    check('N2', r.finished === (r.year <= nhl.NHL_LENGTHS_VERIFIED_TO), `${r.year}: finished is ${r.finished}`);

    /* N3: the season's alignment covers its year and holds its clubs once each. */
    const a = aligns.find(x => x.key === r.align);
    const clubs = a ? a.divisions.flatMap(d => d.teams) : [];
    check('N3', !!a && a === alignOf(r.year), `${r.year}: the alignment ${r.align} does not cover the year`);
    check('N3', clubs.length === r.teams && new Set(clubs).size === clubs.length, `${r.year}: the alignment holds ${clubs.length} clubs (${new Set(clubs).size} different), the row says ${r.teams}`);
    if (a) check('N3', a.divisions.every(d => (d.conf === null) === (r.year === 2020)), `${r.year}: a division has no conference, or has one in the season without conferences`);

    /* N4: where the header says the league IS one of the game's lists, it is, id for id. */
    const list = r.year <= 2010 ? NHL_LISTS[0] : r.year >= NHL_LISTS[1].from ? NHL_LISTS[1] : null;
    if (list) check('N4', sameSet(clubs, list.teams.map(t => t.id)), `${r.year}: the alignment is not the ${list.era} list of the game, id for id`);
    for (const s of nhl.NHL_NAME_SPANS) check('N4', clubs.includes(s.id) === (r.year >= s.from && r.year <= s.to), `${r.year}: ${s.id} (${s.club}) is ${clubs.includes(s.id) ? 'in' : 'not in'} the league, its span is ${s.from} to ${s.to}`);
  }
  check('N3', aligns[0].from === OWN.nhlYears[0] && aligns[aligns.length - 1].to === null && aligns.every((a, i) => i === 0 || a.from === aligns[i - 1].to + 1), 'the NHL alignments leave a gap or overlap');
  const today = aligns[aligns.length - 1];
  for (const d of today.divisions) check('N3', OWN_NHL_TODAY[d.name] === [...d.teams].sort().join(' '), `the ${d.name} of today is ${[...d.teams].sort().join(' ')}, the own table of this harness says ${OWN_NHL_TODAY[d.name]}`);
  const nowIds = new Set(game.NHL_TEAMS.map(t => t.id));
  const eraOnly = game.NHL_TEAMS_2006.filter(t => !nowIds.has(t.id));
  check('N4', sameSet(nhl.NHL_NAME_SPANS.map(s => s.id), eraOnly.map(t => t.id)), `the NHL spans name ${nhl.NHL_NAME_SPANS.map(s => s.id).join(' ')}, the ids only the 2006 list holds are ${eraOnly.map(t => t.id).join(' ')}`);
  for (const s of nhl.NHL_NAME_SPANS) { const t = game.NHL_TEAMS_2006.find(x => x.id === s.id); check('N4', !!t && label(t) === s.club, `the span of ${s.id} is not the 2006 list name ${t ? label(t) : '(no such id)'}`); }
  console.log(`NHL: ${rows.length} seasons in ${aligns.length} alignments; lengths ${[...new Set(rows.map(r => String(r.games)))].join(', ')}`);

  /* N5: the 84 game formula adds up, to the 2026 row and to that season's league. */
  const f = nhl.NHL_FORMULA_84; const r26 = rows.find(r => r.year === f.from); const a26 = alignOf(f.from);
  const total = f.division.total + f.conference.total + f.other.total;
  const home = f.division.opponents * f.division.home + f.conference.twiceAtHome * 2 + f.conference.onceAtHome + f.other.opponents * f.other.home;
  check('N5', f.division.opponents * f.division.games === f.division.total && f.conference.opponents * f.conference.games === f.conference.total && f.other.opponents * f.other.games === f.other.total, 'an NHL formula line does not multiply out');
  check('N5', total === f.games && f.games === OWN.nhlGames[2026] && !!r26 && r26.games === f.games, `the NHL formula makes ${total}, its games are ${f.games}, the ${f.from} row says ${r26?.games}`);
  check('N5', home === f.homeGames && home === OWN.nhl84.home && home * 2 === f.games, `the NHL formula puts ${home} games at home`);
  check('N5', f.conference.twiceAtHome + f.conference.onceAtHome === f.conference.opponents, 'the conference opponents are not split in two');
  if (a26 && r26) {
    const mine = a26.divisions[0];
    const conf = a26.divisions.filter(d => d.conf === mine.conf).flatMap(d => d.teams).length;
    check('N5', mine.teams.length - 1 === f.division.opponents && conf - mine.teams.length === f.conference.opponents && r26.teams - conf === f.other.opponents, 'the NHL formula does not fit the league it is for (7 rivals, 8 more in the conference, 16 in the other)');
  }

  /* N6: sixteen clubs, four best of sevens. */
  const pf = nhl.NHL_PLAYOFF_FORMAT;
  check('N6', pf.clubs === 16 && pf.rounds.length === 4 && pf.series.length === 4 && pf.series.every(([w, m]) => w === 4 && m === 7), 'the NHL playoffs are not sixteen clubs and four best of sevens');

  /* N7: scoring and overtime for both of the game's eras, against both receipts. */
  for (const era of game.NHL_ERAS) {
    const y = nhl.NHL_SCORING_YEAR[era.id]; const s = nhl.NHL_SCORING[era.id]; const o = nhl.NHL_OVERTIME[era.id]; const row = rows.find(r => r.year === y);
    const feed = SRC.nhl?.values; const hr = SRC['hr-shootout']?.values;
    check('N7', !!s && !!o && !!row && y === (era.id === 'now' ? nhl.NHL_LENGTHS_VERIFIED_TO : era.startYear), `NHL scoring for ${era.id} is of ${y}`);
    if (!s || !o || !row) continue;
    const tg = row.teams * row.games; const gf = feed?.goalsFor?.[y];
    check('N7', o.games === row.leagueGames && o.pastSixty === feed?.overtimeLosses?.[y] && o.pastSixty === hr?.overtimeLosses?.[y], `${era.id}: games past sixty are ${o.pastSixty} of ${o.games}; the receipts say ${feed?.overtimeLosses?.[y]} and ${hr?.overtimeLosses?.[y]}`);
    check('N7', o.shootouts === feed?.shootoutWins?.[y] && o.shootouts === hr?.shootoutWins?.[y] && o.shootouts > 0 && o.shootouts <= o.pastSixty, `${era.id}: shootouts are ${o.shootouts}; the receipts say ${feed?.shootoutWins?.[y]} and ${hr?.shootoutWins?.[y]}`);
    check('N7', gf === hr?.goalsFor?.[y] && Math.abs(gf / tg - s.onTheBoard) < 0.005, `${era.id}: goals on the board are ${s.onTheBoard}; ${gf} over ${tg} team games is ${(gf / tg).toFixed(3)}`);
    check('N7', s.inPlay === SRC['hr-league']?.values?.goalsPerGame?.[y] && Math.abs((gf - o.shootouts) / tg - s.inPlay) < 0.005, `${era.id}: goals in play are ${s.inPlay}; the receipts say ${SRC['hr-league']?.values?.goalsPerGame?.[y]} and ${((gf - o.shootouts) / tg).toFixed(3)}`);
  }
  check('N7', nhl.NHL_CLOCK.periods * nhl.NHL_CLOCK.minutes === 60, 'the NHL clock is not sixty minutes');
}

/* ===== THE RECEIPTS ===== */
{
  const cited = [];
  for (const r of mlb.MLB_SEASONS) cited.push([`MLB ${r.year}`, r.year, r.src]);
  for (const s of mlb.MLB_NAME_SPANS) cited.push([`MLB span ${s.id}`, null, s.src]);
  for (const f of mlb.MLB_FORMULAS) cited.push([`MLB formula ${f.from}`, null, f.src]);
  for (const o of mlb.MLB_OUTSIDE_CLUBS) cited.push([`MLB outside club ${o.team}`, null, o.src]);
  cited.push(['MLB_PLAYOFF_FORMAT', null, mlb.MLB_PLAYOFF_FORMAT.src]);
  for (const [name, keys] of Object.entries(mlb)) if (name.endsWith('_SRC')) cited.push([name, null, keys]);
  for (const r of nhl.NHL_SEASONS) cited.push([`NHL ${r.year}`, r.year, r.src]);
  for (const s of nhl.NHL_NAME_SPANS) cited.push([`NHL span ${s.id}`, null, s.src]);
  cited.push(['NHL_FORMULA_84', null, nhl.NHL_FORMULA_84.src], ['NHL_PLAYOFF_FORMAT', null, nhl.NHL_PLAYOFF_FORMAT.src]);
  for (const [name, keys] of Object.entries(nhl)) if (name.endsWith('_SRC')) cited.push([name, null, keys]);

  for (const [where, year, keys] of cited) {
    const got = keys.map(k => SRC[k]);
    /* R1: every key is a receipt, and a season by season receipt holds that season. */
    keys.forEach((k, i) => {
      check('R1', !!got[i], `${where} names the receipt "${k}", which does not exist`);
      if (got[i] && year !== null && got[i].years) check('R1', typeof got[i].years[year] === 'string', `${where}: the receipt "${k}" holds nothing for ${year}`);
    });
    /* R2: two independent sources at least. Two receipts of one group are one source. */
    const groups = new Set(got.filter(s => s && !s.thin).map(s => s.group));
    check('R2', groups.size >= 2, `${where} has ${groups.size} independent source(s) behind it: ${keys.join(', ')}`);
    /* R4: nothing leans on a receipt marked thin. */
    check('R4', got.every(s => !s || !s.thin), `${where} leans on a receipt marked thin`);
  }
  /* R3: every receipt is whole, was read on the ledger's day, and none is a wiki. */
  for (const [k, s] of Object.entries(SRC)) {
    const text = `${s.publisher} ${s.url} ${s.title}`.toLowerCase();
    check('R3', !/wiki|fandom/.test(text), `the receipt "${k}" is a wiki: ${s.url}`);
    check('R3', /^https:\/\//.test(s.url ?? '') && s.read === receipts.readOn && !!s.publisher && !!s.title && !!s.group && (s.sport === 'mlb' || s.sport === 'nhl'), `the receipt "${k}" is not whole`);
    check('R3', Array.isArray(s.says) ? s.says.length > 0 : !!s.years && Object.keys(s.years).length > 0, `the receipt "${k}" says nothing`);
  }
  check('R3', receipts.readOn === mlb.MLB_LEDGER_READ_ON && receipts.readOn === nhl.NHL_LEDGER_READ_ON, 'the ledgers and the receipts were not read on the same day');
  console.log(`receipts: ${Object.keys(SRC).length}, cited from ${cited.length} places, ${Object.values(SRC).filter(s => s.thin).length} marked thin and cited by nothing`);

  /* R5: a number only one source gave stays empty, and is named. */
  const empty = [
    ...Object.values(mlb.MLB_GAME_SHARES), mlb.MLB_GAME_RULES.innings, mlb.MLB_GAME_RULES.extraInningRunnerFrom,
    ...mlb.MLB_OUTSIDE_CLUBS.flatMap(o => [o.league, o.games]),
    ...mlb.MLB_FORMULAS.flatMap(f => [f.homeGames, f.league.homeTotal, f.division.series, f.division.homeTotal]),
    nhl.NHL_OVERTIME_RULES.skatersBefore2015,
  ];
  check('R5', empty.every(v => v === null), 'a number only one source gave has been filled');
  for (const t of [...mlb.MLB_THIN, ...nhl.NHL_THIN]) check('R5', [t.what, t.oneSource, t.tried].every(x => typeof x === 'string' && x.length > 8), 'a THIN entry is not whole');
  check('R5', mlb.MLB_THIN.length >= 5 && nhl.NHL_THIN.length >= 3, 'a THIN list has been emptied');

  /* D1: no en dash and no em dash in the ledgers, the receipts or this file. */
  const dashes = [String.fromCharCode(0x2013), String.fromCharCode(0x2014)];
  for (const f of ['src/data/usSeasonLedgerMlb.ts', 'src/data/usSeasonLedgerNhl.ts', 'scripts/data/usSeasonSources1211.json', 'scripts/simUsSeasonLedger.mjs']) {
    const text = readFileSync(path.join(ROOT, f), 'utf8') + EXTRA.text;
    check('D1', !dashes.some(d => text.includes(d)), `${f} holds an en dash or an em dash`);
  }
}

/* ===== NOTES FOR THE BINDING ROUNDS: where an engine plays something the ledger does not say. Never a red. ===== */
{
  const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const code = f => strip(readFileSync(path.join(ROOT, f), 'utf8'));
  const mlbSrc = code('src/lib/mlbMyCareer.ts'); const nhlSrc = code('src/lib/nhlMyCareer.ts');
  const readsLedger = s => s.includes('usSeasonLength') || s.includes('usSeasonLedger');

  /* The season lengths. */
  const mlbOdd = mlb.MLB_SEASONS.filter(r => r.games !== 162).map(r => `${r.year} (${r.games})`);
  if (readsLedger(mlbSrc)) notes.push('MLB engine: it reads a length ledger now. Read gamesFor again before trusting the notes below.');
  else if (mlbSrc.includes('155 + Math.floor(rng() * 8)')) notes.push(`MLB engine: a healthy hitter plays 155 to 162 games in every year (gamesFor), and it reads no length ledger. The ledger: the schedule was not 162 in ${mlbOdd.join(', ')}, and ${mlb.MLB_SEASONS.filter(r => r.clubs.some(g => g.games !== r.games)).length} seasons hold a club that did not play its schedule's length.`);
  else notes.push('MLB engine: the line that draws a hitter games count has moved; this note could not be made.');
  const nhlOdd = nhl.NHL_SEASONS.filter(r => r.games !== 82).map(r => `${r.year} (${r.games === null ? 'no single length' : r.games})`);
  if (readsLedger(nhlSrc)) notes.push('NHL engine: it reads a length ledger now. Read gamesFor again before trusting the notes below.');
  else if (nhlSrc.includes('79 + Math.floor(rng() * 4)')) notes.push(`NHL engine: a healthy skater plays 79 to 82 games in every year (gamesFor), and it reads no length ledger. The ledger: the season was not 82 in ${nhlOdd.join(', ')}. So the engine plays more than the real season in 2012, 2019 and 2020, and at most 82 of the 84 from 2026.`);
  else notes.push('NHL engine: the line that draws a skater games count has moved; this note could not be made.');
  if (nhlSrc.includes('games / 82')) notes.push('NHL engine: a skater production is scaled by games / 82 (simNhlSeason), and the season paper counts missed games from 82 (src/lib/nhlCareerLoop.ts). Both are the 82 game season.');

  /* The playoff games an engine saves against the rounds the ledger holds. */
  const fits = (sport, series) => {
    const out = [];
    for (let stage = 0; stage <= 4; stage++) {
      const rounds = Math.min(stage + 1, 4);
      const lo = series.slice(0, rounds).reduce((t, s) => t + s[0], 0); const hi = series.slice(0, rounds).reduce((t, s) => t + s[1], 0);
      const seen = new Map(); const N = 20000;
      for (let i = 0; i < N; i++) { const g = game.playoffGames(stage, () => (i + 0.5) / N, sport); seen.set(g, (seen.get(g) ?? 0) + 1); }
      const bad = [...seen].filter(([g]) => g < lo || g > hi).reduce((t, [, n]) => t + n, 0);
      out.push({ stage, lo, hi, counts: [...seen.keys()].sort((a, b) => a - b), bad: (100 * bad / N).toFixed(1) });
    }
    return out;
  };
  const mlbWords = (mlbSrc.match(/const stages = \[([^\]]*)\]/) ?? [])[1] ?? '';
  const nhlWords = (nhlSrc.match(/const stages = \[([^\]]*)\]/) ?? [])[1] ?? '';
  const say = (sport, words, rows) => rows.map(r => `stage ${r.stage} saves ${r.counts[0]} to ${r.counts[r.counts.length - 1]} games, the real rounds hold ${r.lo} to ${r.hi}: ${r.bad} percent cannot fit`).join('; ');
  notes.push(`MLB playoff games (careerVariance.playoffGames against MLB_PLAYOFF_FORMAT): ${say('mlb', mlbWords, fits('mlb', mlb.MLB_PLAYOFF_FORMAT.series))}. Stages are the engine results in order: ${mlbWords}.`);
  notes.push(`NHL playoff games (the same law against four best of sevens): ${say('nhl', nhlWords, fits('nhl', nhl.NHL_PLAYOFF_FORMAT.series))}. Stages: ${nhlWords}.`);
  if (mlbWords.includes('Wild Card')) notes.push(`MLB engine: it writes a Wild Card result in every year. The ledger: no wild card round from ${mlb.MLB_FIRST_ROUND[0].from} to ${mlb.MLB_FIRST_ROUND[0].to}, one game in 2012 to 2019 and 2021, a series only in 2020 and from ${mlb.MLB_PLAYOFF_FORMAT.from}; and the engine models no first round bye.`);

  /* The club outside the league. */
  for (const o of mlb.MLB_OUTSIDE_CLUBS) {
    const inEngine = code('src/lib/mlbCareerLifeB.ts').includes(`cc.team = '${o.team}'`);
    notes.push(inEngine ? `MLB engine: src/lib/mlbCareerLifeB.ts writes cc.team = '${o.team}', which is in neither MLB list of the game, and then plays MLB seasons for it. A binding round must hold such a row.` : `MLB engine: no line writes cc.team = '${o.team}' any more; MLB_OUTSIDE_CLUBS may be stale.`);
  }
  const ath = game.MLB_TEAMS.find(t => t.id === 'ATH');
  if (ath && label(ath) !== 'Athletics') notes.push(`The game prints "${label(ath)}" for ATH; both 2026 standings read for the ledger print "Athletics" with no city.`);
}

/* ===== the verdict ===== */
console.log('');
console.log('NOTES FOR THE BINDING ROUNDS (not failures):');
for (const n of notes) console.log(`  - ${n}`);
console.log('');
for (const [id, list] of red) for (const what of list.slice(0, 6)) console.log(`FAIL [${id}] ${what}`);
const reds = [...red.keys()].sort();
if (CONTROL) {
  const want = [...CONTROLS[CONTROL].expect].sort();
  if (reds.join() === want.join()) { console.log(`simUsSeasonLedger: CONTROL ${CONTROL} FIRED, red at exactly ${want.join(' and ')}`); process.exit(1); }
  console.log(`simUsSeasonLedger: CONTROL ${CONTROL} MISFIRED, red at ${reds.join(' ') || 'nothing'} where ${want.join(' and ')} was expected`);
  process.exit(3);
}
if (reds.length) { console.log(`simUsSeasonLedger: RED at ${reds.join(' ')} (${[...red.values()].reduce((t, l) => t + l.length, 0)} failed, ${passed} passed)`); process.exit(1); }
console.log(`simUsSeasonLedger: green. ${passed} checks passed over ${mlb.MLB_SEASONS.length} MLB and ${nhl.NHL_SEASONS.length} NHL seasons; ${notes.length} notes for the binding rounds.`);
