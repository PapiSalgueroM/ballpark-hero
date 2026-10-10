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
   - The home and away numbers of the MLB formulas against the games played:
     seven club seasons read on Baseball Reference's schedule pages (one in
     2023, 2024 and 2025, four in 2026), each 162 games and 81 at home.
   1,389 checks in all. No band here was set by feel: every check is an
   equality, a sum or a set.

   IDENTITIES, NOT ONLY COUNTS (the fix pass of 2026-10-10). A count cannot
   tell which club, which year or which partner, so this file's own table
   (OWN, OWN_NHL_ALIGN) types them: the fifty MLB clubs off their schedule by
   name and season, the last real year of each 2004 id, the fifteen rival
   pairs, the first round windows, every NHL alignment division by division,
   the 31 club games of 2019-20 and the rules after sixty minutes. A single
   changed fact in a ledger's source is red here (the review's mutations A,
   B, D, E, G, H, N and O, each green before this pass).

   A SOURCE MUST SPEAK OF THE SEASON IT IS CITED FOR. A place cited with
   seasons (a formula row, its home and away numbers, the rival pairs of
   2026) counts only receipts that speak of one of those seasons, every one
   of its seasons must be read by somebody, and a dated receipt about
   another season is red (R1, R2). The values a block's general receipts do
   not all cover have a source list of their own (`homeSrc`,
   NHL_PLAYOFF_FROM_SRC, NHL_PLAYOFF_MODIFIED_SRC, NHL_OVERTIME_POINT_SRC).
   WHAT THIS STILL CANNOT SEE: whether the words of a receipt support a
   value. That is a reader's job; R5 guards a typed list of empty fields.

   CONTROLS (US_LEDGER_CONTROL=<name>): each changes one fact in the loaded
   data, refuses to run (exit 2, "CONTROL ... ABORTED") when the thing it
   changes is not there, and must turn exactly its NAMED check labels red.
   Fired: exit 1 and the last line says FIRED. Red anywhere else, or green:
   exit 3 and the last line says MISFIRED. Run with US_LEDGER_CONTROL=list to
   print the names. */
import os from 'node:os';
import path from 'node:path';
import { build } from 'esbuild';
import { readFileSync, unlinkSync, writeFileSync } from 'node:fs';
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
      "export * as shape from './src/lib/usSeasonShape.ts';",
      "export * as nhlEngine from './src/lib/nhlMyCareer.ts';",
      "export * as mlbEngine from './src/lib/mlbMyCareer.ts';",
      "export { nhlFullSlateOf, nhlHeadlinesFor } from './src/lib/nhlCareerLoop.ts';",
      "export { mlbSlateMark } from './src/lib/mlbCareerLoop.ts';",
    ].join('\n'),
    resolveDir: ROOT, loader: 'ts',
  },
  bundle: true, format: 'esm', platform: 'node', outfile: OUT,
  logLevel: 'error', alias: { '@': './src' },
});
/* Round 1226, the ENGINE controls: each puts one typed constant back into
   the bundled engine, where the reader of the ledger is asked today. They
   change the bundle's text and nothing on disk, and refuse to run when the
   line they change is not there. */
const ENGINE_CONTROLS = {
  nhltyped: { expect: ['E2'], from: 'const slate = seasonLength("nhl", c.year, c.team);', to: 'const slate = 82;' },
  mlbtyped: { expect: ['E6'], from: 'const slate = seasonLength("mlb", c.year, c.team);', to: 'const slate = 162;' },
  /* The engine's old law for the games of an October, for every year. */
  mlbrounds: { expect: ['E4'], from: 'const poG = playoffRunGames("mlb", c.year, depth, rng);', to: 'const poG = playoffGames(depth, rng, "mlb");' },
  /* One ladder for every year again: a Wild Card series in 2004 and in 2012. */
  mlbladder: { expect: ['E4'], from: 'result = stages[postseasonRung("mlb", c.year, stage)];', to: 'result = ladder[stage];' },
};
if (ENGINE_CONTROLS[CONTROL]) {
  const k = ENGINE_CONTROLS[CONTROL]; const text = readFileSync(OUT, 'utf8');
  if (text.split(k.from).length !== 2) { console.log(`CONTROL ${CONTROL} ABORTED: the engine line "${k.from}" is not there once to change`); process.exit(2); }
  writeFileSync(OUT, text.replace(k.from, () => k.to));
}
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
  /* year: WHICH clubs sat on each count that is not the plain schedule length
     (or held a tie inside it), by the name each carried that season. Fifty
     club lines over sixteen seasons. A count alone cannot tell the Dodgers
     from the Giants; a name can. */
  mlbOffClubs: {
    2004: { 161: 'Milwaukee Brewers|Pittsburgh Pirates|Tampa Bay Devil Rays|Toronto Blue Jays' },
    2005: { 163: 'Cincinnati Reds|Houston Astros' },
    2006: { 161: 'San Francisco Giants|St. Louis Cardinals' },
    2007: { 163: 'Colorado Rockies|San Diego Padres' },
    2008: { 161: 'Baltimore Orioles|Chicago Cubs|Florida Marlins|Houston Astros|Oakland Athletics|Washington Nationals', 163: 'Chicago White Sox|Minnesota Twins' },
    2009: { 161: 'Chicago Cubs|Pittsburgh Pirates', 163: 'Detroit Tigers|Minnesota Twins' },
    2011: { 161: 'Los Angeles Dodgers|Washington Nationals' },
    2013: { 163: 'Tampa Bay Rays|Texas Rangers' },
    2015: { 161: 'Cleveland Indians|Detroit Tigers' },
    2016: { 161: 'Atlanta Braves|Cleveland Indians|Detroit Tigers|Miami Marlins', 162: 'Chicago Cubs|Pittsburgh Pirates' },
    2018: { 161: 'Miami Marlins|Pittsburgh Pirates', 163: 'Chicago Cubs|Colorado Rockies|Los Angeles Dodgers|Milwaukee Brewers' },
    2019: { 161: 'Chicago White Sox|Detroit Tigers' },
    2020: { 58: 'Detroit Tigers|St. Louis Cardinals' },
    2021: { 161: 'Atlanta Braves|Colorado Rockies' },
    2024: { 161: 'Cleveland Guardians|Houston Astros' },
    2026: { 161: 'Baltimore Orioles|New York Yankees' },
  },
  mlb2026Short: ['BAL', 'NYY'],
  mlbSchedule: { 2020: 60 },
  /* id of the 2004 list: the last season it is a real club under that name, and its next name. */
  mlbSpans: {
    MON: [2004, 'Washington Nationals'], ANA: [2004, 'Los Angeles Angels of Anaheim'], TBD: [2007, 'Tampa Bay Rays'],
    FLA: [2011, 'Miami Marlins'], CLV: [2021, 'Cleveland Guardians'], OAK: [2024, 'Athletics'],
  },
  /* The fifteen interleague rival pairs, American League id first. */
  mlbRivals: 'NYY-NYM CHW-CHC LAA-LAD ATH-SFG CLE-CIN TBR-MIA BAL-WSN KCR-STL MIN-MIL BOS-ATL DET-PIT TOR-PHI TEX-ARI HOU-COL SEA-SDP',
  /* The first round, window by window: [from, to, its name or null for no wild card round, clubs in the field]. */
  mlbFirstRound: [[2004, 2011, null, 8], [2012, 2019, 'Wild Card Game', 10], [2020, 2020, 'Wild Card Series', 16], [2021, 2021, 'Wild Card Game', 10], [2022, null, 'Wild Card Series', 12]],
  nhlYears: [2006, 2026],
  nhlGames: { 2012: 48, 2019: null, 2020: 56, 2026: 84 },
  nhlTeams: { 2006: 30, 2017: 31, 2021: 32 },
  nhl84: { leagueGames: 1344, home: 42 },
  /* Games each club had played when 2019-20 stopped, club for club. */
  nhl2019: 'BOS 70 TBL 70 TOR 70 FLA 69 BUF 69 OTT 71 DET 71 MTL 71 WSH 69 PHI 69 PIT 69 CAR 68 NYI 68 CBJ 70 NYR 70 NJD 69 '
    + 'STL 71 COL 70 DAL 69 NSH 69 WPG 71 MIN 69 CHI 70 VGK 71 EDM 71 VAN 69 CGY 70 ARI 70 LAK 70 SJS 70 ANA 71',
  /* The rules after sixty minutes. */
  nhlRules: { minutes: 5, skatersFrom2015: 3, shootoutRounds: 3, loserGetsAPoint: true, playoffPeriodMinutes: 20, playoffShootout: false },
  /* How many entries each THIN list holds: one cannot quietly lose a line. */
  thin: { mlb: 10, nhl: 9 },
  /* The one first round whose length is thin (played, and only one source gave its length): the
     third window, the series of 2020. By its place in the list, so a moved year cannot hide it. */
  mlbThinFirstRound: [2],
  /* Club seasons whose schedule page was read for the home and away numbers. */
  mlbPlayed: 'DET 2023|TEX 2024|DET 2025|DET 2026|TOR 2026|TEX 2026|HOU 2026',
  /* The NHL playoff block: its first season, the two modified tournaments, its round names. */
  nhlPlayoff: { from: 2013, modified: [2019, 2020], rounds: ['First Round', 'Second Round', 'Conference Finals', 'Stanley Cup Final'] },
};

/* EVERY NHL ALIGNMENT, typed here division by division: key: [from, to, { division: [conference, its clubs] }]. */
const E = 'Eastern'; const W = 'Western';
const OWN_ATL8 = 'BOS BUF DET FLA MTL OTT TBL TOR'; const OWN_MET8 = 'CAR CBJ NJD NYI NYR PHI PIT WSH';
const ownSix = southeast => ({
  Atlantic: [E, 'NJD NYI NYR PHI PIT'], Northeast: [E, 'BOS BUF MTL OTT TOR'], Southeast: [E, southeast],
  Central: [W, 'CBJ CHI DET NSH STL'], Northwest: [W, 'CGY COL EDM MIN VAN'], Pacific: [W, 'ANA DAL LAK PHX SJS'],
});
const ownFour = (central, pacific) => ({ Atlantic: [E, OWN_ATL8], Metropolitan: [E, OWN_MET8], Central: [W, central], Pacific: [W, pacific] });
const OWN_NHL_ALIGN = {
  'six-2006': [2006, 2010, ownSix('ATL CAR FLA TBL WSH')],
  'six-2011': [2011, 2012, ownSix('CAR FLA TBL WPG WSH')],
  'four-2013': [2013, 2013, ownFour('CHI COL DAL MIN NSH STL WPG', 'ANA CGY EDM LAK PHX SJS VAN')],
  'four-2014': [2014, 2016, ownFour('CHI COL DAL MIN NSH STL WPG', 'ANA ARI CGY EDM LAK SJS VAN')],
  'four-2017': [2017, 2019, ownFour('CHI COL DAL MIN NSH STL WPG', 'ANA ARI CGY EDM LAK SJS VAN VGK')],
  'four-2020': [2020, 2020, { North: [null, 'CGY EDM MTL OTT TOR VAN WPG'], East: [null, 'BOS BUF NJD NYI NYR PHI PIT WSH'], Central: [null, 'CAR CBJ CHI DAL DET FLA NSH TBL'], West: [null, 'ANA ARI COL LAK MIN SJS STL VGK'] }],
  'four-2021': [2021, 2023, ownFour('ARI CHI COL DAL MIN NSH STL WPG', 'ANA CGY EDM LAK SEA SJS VAN VGK')],
  'four-2024': [2024, null, ownFour('CHI COL DAL MIN NSH STL UTA WPG', 'ANA CGY EDM LAK SEA SJS VAN VGK')],
};

/* ---------- the controls: one changed fact each ---------- */
const EXTRA = { text: '', host: '' };
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
  /* The right count, the wrong club: a throwback row names the Giants where the Dodgers fell short, id and all. */
  mlbclub: { expect: ['M5'], run() { const g = mlbRow(2011).clubs[0]; must(g && g.clubs.includes('Los Angeles Dodgers') && g.ids.includes('LAD'), 'the 2011 Dodgers on 161'); g.clubs = g.clubs.map(c => (c === 'Los Angeles Dodgers' ? 'San Francisco Giants' : c)); g.ids = g.ids.map(i => (i === 'LAD' ? 'SFG' : i)); } },
  /* A span that ends a year late: the Devil Rays a real club in 2008. */
  mlbspanyear: { expect: ['M4'], run() { const s = mlb.MLB_NAME_SPANS.find(x => x.id === 'TBD'); must(s && s.to === 2007, 'the Devil Rays span ending in 2007'); s.to = 2008; } },
  /* Still fifteen pairs, every club once, each an AL club with an NL club: only the partners are wrong. */
  mlbrivalswap: { expect: ['M8'], run() { const b = mlb.MLB_RIVALS.find(x => x[0] === 'BOS'); const t = mlb.MLB_RIVALS.find(x => x[0] === 'TOR'); must(b && t && b[1] === 'ATL' && t[1] === 'PHI', 'Boston with Atlanta and Toronto with Philadelphia'); b[1] = 'PHI'; t[1] = 'ATL'; } },
  /* The windows still touch and still end in the format: only the middle years moved. */
  mlbfirstround: { expect: ['M9'], run() { const g = mlb.MLB_FIRST_ROUND.find(x => x.from === 2012); const s = mlb.MLB_FIRST_ROUND.find(x => x.from === 2020); must(g && s && g.to === 2019 && s.to === 2020, 'the Wild Card Game of 2012 to 2019 and the series of 2020'); g.to = 2018; s.from = 2019; } },
  mlbown: { expect: ['M5'], run() { const g = mlbRow(2026).clubs[0]; must(g && g.ids.includes('NYY'), 'the 2026 Yankees on 161'); g.clubs = g.clubs.filter(c => c !== 'New York Yankees'); g.ids = g.ids.filter(i => i !== 'NYY'); g.clubs.push('Boston Red Sox'); g.ids.push('BOS'); } },
  mlbdiv: { expect: ['M6'], run() { const w = mlb.MLB_DIVISIONS_2026.find(x => x.name === 'AL West'); const c = mlb.MLB_DIVISIONS_2026.find(x => x.name === 'AL Central'); must(w && c && w.teams.includes('HOU') && c.teams.includes('MIN'), 'Houston in the AL West and Minnesota in the AL Central'); w.teams = w.teams.map(t => (t === 'HOU' ? 'MIN' : t)); c.teams = c.teams.map(t => (t === 'MIN' ? 'HOU' : t)); } },
  mlbformula: { expect: ['M7'], run() { const f = mlb.MLB_FORMULAS.find(x => x.from === 2025); must(f && f.division.games === 13, 'the 13 division games'); f.division.games = 14; } },
  /* A home and away number off by one, with every total untouched: eight of the 14 interleague series at home. */
  mlbhome: { expect: ['M7'], run() { const f = mlb.MLB_FORMULAS.find(x => x.from === 2025); must(f && f.interleague.homeSeries === 7, 'the seven interleague series at home'); f.interleague.homeSeries = 8; } },
  /* The 2004 to 2011 window says a wild card round was played and still names none. */
  firstnull: { expect: ['M9', 'R5'], run() { const w = mlb.MLB_FIRST_ROUND[0]; must(w && w.wildCard === false && w.round === null, 'the window with no wild card round'); w.wildCard = true; } },
  /* A report about another season stands in for a source: the 2025 and 2026 home numbers lean on the 2023 article. */
  otherseason: { expect: ['R1', 'R2'], run() { const f = mlb.MLB_FORMULAS.find(x => x.from === 2025); must(f && f.homeSrc.includes('bref-schedule') && SRC['espn-2023-format'], 'the schedule pages behind the 2025 and 2026 home numbers'); f.homeSrc = f.homeSrc.map(k => (k === 'bref-schedule' ? 'espn-2023-format' : k)); } },
  host: { expect: ['D2'], run() { EXTRA.host = ' league.example.com'; } },
  nhlfrom: { expect: ['N6'], run() { must(nhl.NHL_PLAYOFF_FORMAT.from === 2013, 'the playoff block starting in 2013'); nhl.NHL_PLAYOFF_FORMAT.from = 2006; } },
  /* The league's own arithmetic stops giving the loser a point: a club of the receipt on twice its wins. */
  nhlpoint: { expect: ['N8'], run() { const r = SRC['nhl-points']?.values?.records?.COL; must(r && r[3] === 2 * r[0] + r[2], 'the Colorado record in the receipt'); r[3] = 2 * r[0]; } },
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
  /* Two clubs in each other's division in the six division years: the same clubs, the same counts. */
  nhlaligndiv: { expect: ['N3'], run() { for (const k of ['six-2006', 'six-2011']) { const c = nhlAlign(k).divisions.find(x => x.name === 'Central'); const n = nhlAlign(k).divisions.find(x => x.name === 'Northwest'); must(c && n && c.teams.includes('DET') && n.teams.includes('COL'), `Detroit in the Central and Colorado in the Northwest of ${k}`); c.teams = c.teams.map(t => (t === 'DET' ? 'COL' : t)); n.teams = n.teams.map(t => (t === 'COL' ? 'DET' : t)); } } },
  /* Two clubs of 2019-20 moved by one game each way: the count, the least, the most and the sum all hold. */
  nhlclubgames: { expect: ['N2'], run() { const g = nhl.NHL_2019_CLUB_GAMES; must(g.OTT === 71 && g.WSH === 69, 'Ottawa on 71 and Washington on 69'); g.OTT = 70; g.WSH = 70; } },
  /* The GAME's 2006 list loses Atlanta (the harness's copy of it), so the ledger's league is no longer that list. */
  nhllist: { expect: ['N4'], run() { const l = NHL_LISTS[0]; must(l.teams.some(t => t.id === 'ATL'), 'Atlanta in the 2006 list of the game'); l.teams = l.teams.map(t => (t.id === 'ATL' ? { ...t, id: 'WPG' } : t)); } },
  nhlrules: { expect: ['N8'], run() { must(nhl.NHL_OVERTIME_RULES.minutes === 5, 'the five minutes of overtime'); nhl.NHL_OVERTIME_RULES.minutes = 10; } },
  /* A THIN line dropped: the list is still long, and one fact is no longer named as thin. */
  thinlost: { expect: ['R5'], run() { must(mlb.MLB_THIN.length > 1, 'the MLB THIN list'); mlb.MLB_THIN.pop(); } },
  nhlformula: { expect: ['N5'], run() { must(nhl.NHL_FORMULA_84.division.games === 4, 'the four division games'); nhl.NHL_FORMULA_84.division.games = 3; } },
  nhlplayoff: { expect: ['N6'], run() { must(nhl.NHL_PLAYOFF_FORMAT.series[0][1] === 7, 'the best of seven'); nhl.NHL_PLAYOFF_FORMAT.series[0] = [3, 5]; } },
  nhlscore: { expect: ['N7'], run() { must(nhl.NHL_OVERTIME.now.shootouts === 119, 'the 119 shootouts'); nhl.NHL_OVERTIME.now.shootouts = 0; } },
};
for (const [name, k] of Object.entries(ENGINE_CONTROLS)) CONTROLS[name] = { expect: k.expect, run() {} };
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

    /* M5: this file's own table of the clubs off the schedule, club by club and by name. */
    const mine = Object.entries(OWN.mlbOffClubs[r.year] ?? {}).map(([g, names]) => `${g}: ${names.split('|').sort().join(', ')}`).sort().join('; ');
    const theirs = r.clubs.map(g => `${g.games}: ${[...g.clubs].sort().join(', ')}`).sort().join('; ');
    check('M5', mine === theirs, `${r.year}: the row holds [${theirs || 'no club'}], this harness's own table [${mine || 'no club'}]`);
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
    /* WHICH year: this file's own last season and next name for that id. */
    const [to, next] = OWN.mlbSpans[s.id] ?? [];
    check('M4', s.to === to && s.next === next, `the span of ${s.id} ends in ${s.to} as "${s.next}" next, this harness's own table says ${to} and "${next}"`);
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
    check('M7', f.interleague.homeSeries * 2 === f.interleague.opponents, `${tag}: ${f.interleague.homeSeries} of the ${f.interleague.opponents} interleague series at home is not half of them`);
  }
  check('M7', mlb.MLB_FORMULAS.some(f => f.from <= 2026 && f.to >= 2026), 'no MLB formula covers 2026');

  /* M7 again, against the games actually played: every club season whose schedule page is in the
     receipts fits the formula of its year, home and away included. [home, away] each. */
  const played = SRC['bref-schedule']?.values?.clubs ?? [];
  check('M7', played.map(c => `${c.club} ${c.year}`).join('|') === OWN.mlbPlayed, `the schedule pages in the receipts are ${played.map(c => `${c.club} ${c.year}`).join('|')}, this harness's own table says ${OWN.mlbPlayed}`);
  for (const f of mlb.MLB_FORMULAS) for (const y of rangeOf(f.from, f.to)) check('M7', played.some(c => c.year === y), `MLB formula ${f.from} to ${f.to}: no schedule page was read for ${y}`);
  const today = Object.fromEntries(divs.flatMap(d => d.teams.map(t => [t, d])));
  for (const c of played) {
    const tag = `${c.club} ${c.year} as played`;
    const f = mlb.MLB_FORMULAS.find(x => c.year >= x.from && c.year <= x.to);
    if (!f) { check('M7', false, `${tag}: no formula covers the season`); continue; }
    const div = Object.values(c.division); const lg = Object.values(c.league);
    const sum = (list, i) => list.reduce((t, x) => t + x[i], 0);
    check('M7', div.length === f.division.opponents && div.every(([h, a]) => h + a === f.division.games && Math.max(h, a) === f.division.homeOrAway[0] && Math.min(h, a) === f.division.homeOrAway[1]),
      `${tag}: the division games are not ${f.division.opponents} rivals at ${f.division.homeOrAway.join(' and ')}: ${JSON.stringify(c.division)}`);
    check('M7', lg.filter(([h, a]) => h + a === 6).length === f.league.sixGames && lg.filter(([h, a]) => h + a === 7).length === f.league.sevenGames,
      `${tag}: the league games are not six against ${f.league.sixGames} and seven against ${f.league.sevenGames}`);
    check('M7', c.rival[1] === f.rival.home && c.rival[1] + c.rival[2] === f.rival.games, `${tag}: the rival was met ${c.rival[1]} at home and ${c.rival[2]} away, the formula says ${f.rival.home} of ${f.rival.games} at home`);
    check('M7', c.nlHome.length === f.interleague.homeSeries && c.nlHome.length + c.nlAway.length === f.interleague.opponents,
      `${tag}: ${c.nlHome.length} of ${c.nlHome.length + c.nlAway.length} interleague series at home, the formula says ${f.interleague.homeSeries} of ${f.interleague.opponents}`);
    if (f.division.homeTotal !== null) check('M7', sum(div, 0) === f.division.homeTotal, `${tag}: ${sum(div, 0)} division games at home, the formula says ${f.division.homeTotal}`);
    if (f.league.homeTotal !== null) check('M7', sum(lg, 0) === f.league.homeTotal, `${tag}: ${sum(lg, 0)} league games at home, the formula says ${f.league.homeTotal}`);
    const games = sum(div, 0) + sum(div, 1) + sum(lg, 0) + sum(lg, 1) + c.rival[1] + c.rival[2] + f.interleague.games * (c.nlHome.length + c.nlAway.length);
    const home = sum(div, 0) + sum(lg, 0) + c.rival[1] + f.interleague.games * c.nlHome.length;
    check('M7', games === f.games && home === c.home, `${tag}: the page adds up to ${games} games and ${home} at home, the formula says ${f.games} and the page ${c.home}`);
    /* M6 again, against the games actually played: the clubs a 2026 page shows met 13 times are that
       club's division, the six and seven game clubs the rest of its league, the others the other league. */
    if (c.year === 2026 && today[c.club]) {
      const mine = today[c.club]; const others = game.MLB_TEAMS.map(t => t.id).filter(id => id !== c.club);
      check('M6', sameSet(Object.keys(c.division), mine.teams.filter(t => t !== c.club)) && sameSet(Object.keys(c.league), others.filter(id => today[id].conf === mine.conf && today[id] !== mine))
        && sameSet([c.rival[0], ...c.nlHome, ...c.nlAway], others.filter(id => today[id].conf !== mine.conf)), `${tag}: the opponents are not the division, the league and the other league of ${c.club} as MLB_DIVISIONS_2026 has them`);
    }
  }

  /* M8: fifteen pairs, an American League club with a National League club, every club once. */
  const leagueOf = Object.fromEntries(divs.flatMap(d => d.teams.map(t => [t, d.conf])));
  const paired = mlb.MLB_RIVALS.flat();
  check('M8', mlb.MLB_RIVALS.length === 15 && sameSet(paired, game.MLB_TEAMS.map(t => t.id)), 'the rival pairs do not hold every one of the 30 clubs exactly once');
  for (const [a, n] of mlb.MLB_RIVALS) check('M8', leagueOf[a] === 'AL' && leagueOf[n] === 'NL', `the pair ${a} and ${n} is not an AL club with an NL club`);
  /* WHO with whom: this file's own fifteen pairs. */
  const pairs = mlb.MLB_RIVALS.map(([a, n]) => `${a}-${n}`);
  check('M8', sameSet(pairs, OWN.mlbRivals.split(' ')), `the rival pairs are ${[...pairs].sort().join(' ')}, this harness's own table says ${OWN.mlbRivals.split(' ').sort().join(' ')}`);
  /* And the 2026 fixtures: the one club of the other league each schedule page shows met in both parks. */
  for (const c of played.filter(x => x.year === 2026)) {
    const pair = mlb.MLB_RIVALS.find(p => p.includes(c.club)) ?? [];
    check('M8', pair.find(id => id !== c.club) === c.rival[0], `the rival of ${c.club} is ${pair.find(id => id !== c.club)}, its 2026 schedule page shows ${c.rival[0]} met in both parks`);
  }

  /* M9: the rounds and their lengths, and a first round for every season from 2004. */
  const pf = mlb.MLB_PLAYOFF_FORMAT;
  check('M9', pf.rounds.length === 4 && pf.series.length === 4 && pf.series.every(([w, m]) => m === 2 * w - 1), 'an MLB series is not a best of an odd number');
  check('M9', pf.clubs === 12 && pf.byesPerLeague === 2 && pf.from === 2022, 'the MLB field is not twelve with two byes a league from 2022');
  const fr = mlb.MLB_FIRST_ROUND;
  check('M9', fr[0].from === OWN.mlbYears[0] && fr[fr.length - 1].to === null && fr.every((w, i) => i === 0 || w.from === fr[i - 1].to + 1), 'the first round windows leave a gap or overlap');
  /* WHICH years: this file's own windows, the middle ones too. */
  const windows = JSON.stringify(fr.map(w => [w.from, w.to, w.round, w.clubs]));
  check('M9', windows === JSON.stringify(OWN.mlbFirstRound), `the first round windows are ${windows}, this harness's own table says ${JSON.stringify(OWN.mlbFirstRound)}`);
  /* A null says one thing at a time: no wild card round means no name and no length, and only then. */
  for (const w of fr) check('M9', typeof w.wildCard === 'boolean' && w.wildCard === (w.round !== null) && (w.wildCard || w.series === null), `the first round window from ${w.from}: wildCard is ${w.wildCard}, its round is ${w.round} and its series ${JSON.stringify(w.series)}`);
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
    if (r.games === null) {
      check('N2', clubGames.length === r.teams && Math.min(...clubGames) === 68 && Math.max(...clubGames) === 71 && r.why.includes('68 to 71'), `${r.year}: the club games are not ${r.teams} clubs on 68 to 71`);
      /* WHICH club on which count: this file's own table, club for club. */
      const own = OWN.nhl2019.split(' '); const mineByClub = {};
      for (let i = 0; i < own.length; i += 2) mineByClub[own[i]] = Number(own[i + 1]);
      const wrong = [...new Set([...Object.keys(mineByClub), ...Object.keys(nhl.NHL_2019_CLUB_GAMES)])].filter(id => mineByClub[id] !== nhl.NHL_2019_CLUB_GAMES[id]);
      check('N2', wrong.length === 0, `${r.year}: the club games of ${wrong.join(' ')} are ${wrong.map(id => nhl.NHL_2019_CLUB_GAMES[id]).join(' ')}, this harness's own table says ${wrong.map(id => mineByClub[id]).join(' ')}`);
    }
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
  /* WHICH club in which division, in every alignment and not only today's: this file's own table. */
  check('N3', sameSet(aligns.map(a => a.key), Object.keys(OWN_NHL_ALIGN)), `the alignments are ${aligns.map(a => a.key).join(' ')}, this harness's own table holds ${Object.keys(OWN_NHL_ALIGN).join(' ')}`);
  for (const a of aligns) {
    const [from, to, mine] = OWN_NHL_ALIGN[a.key] ?? [null, null, {}];
    check('N3', a.from === from && a.to === to && sameSet(a.divisions.map(d => d.name), Object.keys(mine)), `${a.key} runs ${a.from} to ${a.to} in ${a.divisions.map(d => d.name).join(', ')}; this harness's own table says ${from} to ${to} in ${Object.keys(mine).join(', ')}`);
    for (const d of a.divisions) {
      const [conf, teams] = mine[d.name] ?? [undefined, ''];
      check('N3', d.conf === conf && [...d.teams].sort().join(' ') === teams, `${a.key}, ${d.name} (${d.conf}): ${[...d.teams].sort().join(' ')}; this harness's own table says (${conf}) ${teams}`);
    }
  }
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
  /* From WHEN, which tournaments were modified, and the names: this file's own table, and a receipt for each of those seasons. */
  check('N6', pf.from === OWN.nhlPlayoff.from && JSON.stringify(pf.modified) === JSON.stringify(OWN.nhlPlayoff.modified) && JSON.stringify(pf.rounds) === JSON.stringify(OWN.nhlPlayoff.rounds),
    `the NHL playoff block starts in ${pf.from}, sets ${JSON.stringify(pf.modified)} apart and names ${pf.rounds.join(', ')}; this harness's own table says ${OWN.nhlPlayoff.from}, ${JSON.stringify(OWN.nhlPlayoff.modified)} and ${OWN.nhlPlayoff.rounds.join(', ')}`);
  for (const y of [pf.from, ...pf.modified]) check('N6', typeof SRC['hr-playoffs']?.years?.[y] === 'string', `the playoffs receipt holds nothing for the season that starts in ${y}`);

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

  /* N8: the rules after sixty minutes, value for value, against this file's own table. */
  for (const [k, v] of Object.entries(OWN.nhlRules)) check('N8', nhl.NHL_OVERTIME_RULES[k] === v, `NHL_OVERTIME_RULES.${k} is ${nhl.NHL_OVERTIME_RULES[k]}, this harness's own table says ${v}`);
  check('N8', sameSet(Object.keys(nhl.NHL_OVERTIME_RULES), [...Object.keys(OWN.nhlRules), 'skatersBefore2015']), `NHL_OVERTIME_RULES holds ${Object.keys(nhl.NHL_OVERTIME_RULES).join(', ')}`);
  /* The loser's point in the league's own arithmetic: points are twice the wins plus the overtime losses. */
  const records = Object.entries(SRC['nhl-points']?.values?.records ?? {});
  check('N8', records.length >= 3 && nhl.NHL_OVERTIME_RULES.loserGetsAPoint === records.every(([, [w, , o, p]]) => o > 0 && p === 2 * w + o),
    `NHL_OVERTIME_RULES.loserGetsAPoint is ${nhl.NHL_OVERTIME_RULES.loserGetsAPoint}; the standings receipt holds ${records.map(([id, r]) => `${id} ${r.join('-')}`).join(', ') || 'no record'}`);
}

/* ===== THE RECEIPTS ===== */
{
  const cited = [];
  for (const r of mlb.MLB_SEASONS) cited.push([`MLB ${r.year}`, r.year, r.src]);
  for (const s of mlb.MLB_NAME_SPANS) cited.push([`MLB span ${s.id}`, null, s.src]);
  /* A place cited with [from, to] makes a claim about those seasons: its receipts must speak of them. */
  for (const f of mlb.MLB_FORMULAS) cited.push([`MLB formula ${f.from}`, [f.from, f.to], f.src], [`MLB formula ${f.from}, home and away`, [f.from, f.to], f.homeSrc ?? []]);
  cited.push(['MLB_RIVALS in 2026', [2026, 2026], mlb.MLB_RIVALS_2026_SRC ?? []]);
  for (const o of mlb.MLB_OUTSIDE_CLUBS) cited.push([`MLB outside club ${o.team}`, null, o.src]);
  cited.push(['MLB_PLAYOFF_FORMAT', null, mlb.MLB_PLAYOFF_FORMAT.src]);
  for (const [name, keys] of Object.entries(mlb)) if (name.endsWith('_SRC')) cited.push([name, null, keys]);
  for (const r of nhl.NHL_SEASONS) cited.push([`NHL ${r.year}`, r.year, r.src]);
  for (const s of nhl.NHL_NAME_SPANS) cited.push([`NHL span ${s.id}`, null, s.src]);
  cited.push(['NHL_FORMULA_84', null, nhl.NHL_FORMULA_84.src], ['NHL_PLAYOFF_FORMAT', null, nhl.NHL_PLAYOFF_FORMAT.src]);
  for (const [name, keys] of Object.entries(nhl)) if (name.endsWith('_SRC')) cited.push([name, null, keys]);

  /* Which seasons a receipt speaks of: its season by season lines, or its `seasons` (an article about
     one schedule or one format). A receipt with neither speaks of no season in particular. */
  const dated = s => !!(s.years || s.seasons);
  const speaksOf = (s, y) => (s.years ? typeof s.years[y] === 'string' : (s.seasons ?? []).includes(y));
  for (const [where, when, keys] of cited) {
    const got = keys.map(k => SRC[k]);
    const year = typeof when === 'number' ? when : null;
    const span = Array.isArray(when) ? rangeOf(when[0], when[1]) : null;
    /* R1: every key is a receipt, and a season by season receipt holds that season. */
    keys.forEach((k, i) => {
      check('R1', !!got[i], `${where} names the receipt "${k}", which does not exist`);
      if (got[i] && year !== null && got[i].years) check('R1', typeof got[i].years[year] === 'string', `${where}: the receipt "${k}" holds nothing for ${year}`);
      /* A report about another season is no receipt for this one. */
      if (got[i] && span && dated(got[i])) check('R1', span.some(y => speaksOf(got[i], y)), `${where}: the receipt "${k}" speaks of none of the seasons ${when.join(' to ')}`);
    });
    /* And no season of the place goes unread. */
    if (span) for (const y of span) check('R1', got.some(s => s && !s.thin && dated(s) && speaksOf(s, y)), `${where}: no receipt speaks of ${y}`);
    /* R2: two independent sources at least. Two receipts of one group are one source, and for a place
       with seasons only a receipt that speaks of one of them counts. */
    const groups = new Set(got.filter(s => s && !s.thin && (!span || !dated(s) || span.some(y => speaksOf(s, y)))).map(s => s.group));
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
    ...mlb.MLB_FORMULAS.flatMap(f => [f.homeGames, f.division.series, f.from >= 2025 ? f.league.homeTotal : f.division.homeTotal]),
    nhl.NHL_OVERTIME_RULES.skatersBefore2015,
  ];
  check('R5', empty.every(v => v === null), 'a number only one source gave has been filled');
  /* A first round that was played and has no length is thin, and this file's own list says which. */
  const thinRounds = mlb.MLB_FIRST_ROUND.map((w, i) => (w.wildCard && w.series === null ? i : -1)).filter(i => i >= 0);
  check('R5', JSON.stringify(thinRounds) === JSON.stringify(OWN.mlbThinFirstRound), `the first round windows with a thin length are number ${thinRounds.join(' ') || '(none)'} of the list (from 0), this harness's own table says ${OWN.mlbThinFirstRound.join(' ')}`);
  for (const t of [...mlb.MLB_THIN, ...nhl.NHL_THIN]) check('R5', [t.what, t.oneSource, t.tried].every(x => typeof x === 'string' && x.length > 8), 'a THIN entry is not whole');
  check('R5', mlb.MLB_THIN.length === OWN.thin.mlb && nhl.NHL_THIN.length === OWN.thin.nhl, `the THIN lists hold ${mlb.MLB_THIN.length} and ${nhl.NHL_THIN.length} entries, this harness's own table says ${OWN.thin.mlb} and ${OWN.thin.nhl}`);

  /* D1: no en dash and no em dash in the ledgers, the receipts, this file or the round's notes. */
  const dashes = [String.fromCharCode(0x2013), String.fromCharCode(0x2014)];
  for (const f of ['src/data/usSeasonLedgerMlb.ts', 'src/data/usSeasonLedgerNhl.ts', 'scripts/data/usSeasonSources1211.json', 'scripts/simUsSeasonLedger.mjs', 'docs/audits/ROUND-1211-NOTES.md']) {
    const text = readFileSync(path.join(ROOT, f), 'utf8') + EXTRA.text;
    check('D1', !dashes.some(d => text.includes(d)), `${f} holds an en dash or an em dash`);
  }

  /* D2: no address and no host name in a ledger (they ship in src; the receipts hold the addresses).
     A publisher is named by its name: "the league's own site", never its domain. */
  const hostLike = /https?:|www[.]|[a-z0-9-]+[.](com|org|net|jp|ca|co|io|tv)(?![a-z])/i;
  for (const f of ['src/data/usSeasonLedgerMlb.ts', 'src/data/usSeasonLedgerNhl.ts']) {
    const hit = (readFileSync(path.join(ROOT, f), 'utf8') + EXTRA.host).match(hostLike);
    check('D2', !hit, `${f} holds an address or a host name: ${hit ? hit[0] : ''}`);
  }
}

/* ===== Round 1226, THE REVERSE CHECK: the engines play what the ledger says. =====
   E1  the reader (src/lib/usSeasonShape.ts) hands back the ledger's length
       for every NHL season in range, held to THIS FILE'S OWN TABLE, and the
       engine's own season where the ledger holds nothing.
   E2  the NHL engine plays it: a skater's season never holds more games than
       his club's did, about a quarter of healthy seasons are the whole
       schedule (the engine's own draw is four equal counts, so 25 percent;
       measured 23.5 to 26.1 percent over 12 year and club cells of 1,500
       seasons each, about 1,140 of them healthy skaters; the band is 19 to 31), the saved line carries the length
       exactly when it is not the engine's own, and the engine's code types
       no season length of its own. Control: nhltyped. */
const mulberry = seed => () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const ENGINE_OWN = 82;
{
  const S = game.shape;
  const own2019 = Object.fromEntries(OWN.nhl2019.split(' ').reduce((a, x, i, l) => (i % 2 ? a : [...a, [x, Number(l[i + 1])]]), []));
  /* Ids typed here: two the ledger holds in 2019-20 under the game's id, and the two of the 2006 list it does not. */
  const IDS = ['BOS', 'CAR', 'ATL', 'PHX'];
  for (const y of rangeOf(OWN.nhlYears[0], OWN.nhlYears[1])) for (const id of IDS) {
    const want = y === 2019 ? (own2019[id] ?? ENGINE_OWN) : (y in OWN.nhlGames ? OWN.nhlGames[y] : ENGINE_OWN);
    const from = y === 2019 && !(id in own2019) ? 'engine' : 'ledger';
    const got = S.seasonLengthRow('nhl', y, id);
    check('E1', got.games === want && got.from === from && S.seasonLength('nhl', y, id) === want, `the reader says ${got.games} (${got.from}) for the NHL ${y} season of ${id}; this file's own table says ${want} (${from})`);
  }
  for (const y of [2027, 2035, 2046]) { const got = S.seasonLengthRow('nhl', y, 'BOS'); check('E1', got.games === OWN.nhlGames[2026] && got.from === 'carried', `the reader says ${got.games} (${got.from}) for the NHL ${y} season; the last row carried forward is ${OWN.nhlGames[2026]}`); }
  for (const y of [1990, 2005]) { const got = S.seasonLengthRow('nhl', y, 'BOS'); check('E1', got.games === ENGINE_OWN && got.from === 'engine', `the reader says ${got.games} (${got.from}) for the NHL ${y} season, a year before the ledger; the engine's own season is ${ENGINE_OWN}`); }
  check('E1', S.US_ENGINE_SEASON.nhl === ENGINE_OWN && S.slateOf('nhl', {}) === ENGINE_OWN && S.slateOf('nhl', { slate: 84 }) === 84, 'a saved line with no slate is not read as the engine own season, or one with a slate is not read as its own');

  /* E2: the engine, played. */
  const N = game.nhlEngine;
  const CELLS = [[2006, 'BOS', 82], [2012, 'BOS', 48], [2012, 'ATL', 48], [2019, 'BOS', 70], [2019, 'CAR', 68], [2019, 'ATL', 82], [2020, 'BOS', 56], [2025, 'BOS', 82], [2026, 'BOS', 84], [2026, 'UTA', 84], [2031, 'BOS', 84], [2040, 'BOS', 84]];
  for (const [year, team, want] of CELLS) {
    let over = 0; let whole = 0; let healthy = 0; let slateBad = 0; let goalieOver = 0; const SEASONS = 1500;
    for (let i = 0; i < SEASONS; i++) {
      const rng = mulberry(year * 1000 + i);
      const pos = i % 5 === 4 ? 'G' : ['C', 'LW', 'RW', 'D'][i % 4];
      const c = N.startNhlCareer('Ledger Check', pos, N.NHL_ARCHETYPES[pos][0], rng, null, year < 2026 ? 'y2006' : undefined);
      c.year = year; c.team = team; c.health = 100;
      const { line, notes: said } = N.simNhlSeason(c, 80, rng);
      if ((line.slate ?? ENGINE_OWN) !== want || ('slate' in line) !== (want !== ENGINE_OWN)) slateBad++;
      if (pos === 'G') { if (line.games > want) goalieOver++; continue; }
      if (line.games > want) over++;
      if (!said.some(n => n.includes('Injuries'))) { healthy++; if (line.games === want) whole++; }
    }
    const share = healthy ? 100 * whole / healthy : 0;
    if (process.env.US_LEDGER_MEASURE) console.log(`MEASURE nhl ${year} ${team} want ${want}: whole ${share.toFixed(1)} percent of ${healthy} healthy skater seasons`);
    check('E2', over === 0 && goalieOver === 0, `${over} skater seasons and ${goalieOver} goalie seasons of ${SEASONS} hold more games than the ${want} of the ${year} season of ${team}`);
    check('E2', share >= 19 && share <= 31, `${share.toFixed(1)} percent of healthy skater seasons are the whole ${want} game schedule of ${year} (${team}); the engine's draw makes it 25 (band 19 to 31)`);
    check('E2', slateBad === 0, `${slateBad} of ${SEASONS} saved lines of ${year} (${team}) carry the wrong season length, or carry one where the engine's own was played`);
  }
  /* The engine's code, comments stripped, types no season length. */
  const stripC = t => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const nhlCode = stripC(readFileSync(path.join(ROOT, 'src/lib/nhlMyCareer.ts'), 'utf8')).split('export const NHL_SPEND_ITEMS')[0];
  const loopCode = stripC(readFileSync(path.join(ROOT, 'src/lib/nhlCareerLoop.ts'), 'utf8'));
  for (const [what, code, re] of [['nhlMyCareer.ts', nhlCode, /\/ 8[24]\b|\b79 \+ Math\.floor|= 8[24];/], ['nhlCareerLoop.ts', loopCode, /\b8[24]\b|\b78\b/]]) {
    const hit = code.match(re);
    check('E2', !hit, `src/lib/${what} types a season length of its own again ("${hit?.[0]}"); it must ask src/lib/usSeasonShape.ts`);
  }
  /* A saved line keeps the season it was played on: the mark for a full season and the paper's count both read it. */
  check('E2', game.nhlFullSlateOf('C', {}) === 78 && game.nhlFullSlateOf('C', { slate: 84 }) === 80 && game.nhlFullSlateOf('C', { slate: 48 }) === 46 && game.nhlFullSlateOf('G', { slate: 84 }) === 55 && game.nhlFullSlateOf('G', { slate: 48 }) === 32,
    `the full season mark does not follow the saved length: ${[{}, { slate: 84 }, { slate: 48 }].map(l => game.nhlFullSlateOf('C', l)).join(', ')} for a skater (78, 80, 46 expected), ${game.nhlFullSlateOf('G', { slate: 84 })} and ${game.nhlFullSlateOf('G', { slate: 48 })} for a goalie (55 and 32)`);
}

/* ===== Round 1226, the reverse check for October (MLB). =====
   E3  the reader hands back the ledger's rounds for every MLB season, held to
       THIS FILE'S OWN TABLE: no wild card round to 2011 (three rounds), one
       game in 2012 to 2019 and 2021, a series of a thin length in 2020, and
       the best of three, five, seven and seven from 2022.
   E4  the MLB engine plays it: no Wild Card result in a year with no wild
       card round, a Wild Card Game that is one game, and from 2022 every run
       inside the rounds it went through, with a swept Wild Card Series among
       them (measured: 43.3 to 44.2 percent of Wild Card exits are two games,
       over three years of 6,000 seasons each and about 1,900 exits a year;
       the law makes it 42.4; the band is 34 to 51). Controls: mlbrounds,
       mlbladder. */
const OWN_OCTOBER = { names: ['Wild Card Series', 'Division Series', 'Championship Series', 'World Series'], series: [[2, 3], [3, 5], [4, 7], [4, 7]], from: 2022, game: [1, 1] };
{
  const S = game.shape; const M = game.mlbEngine;
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const open = n => Array.from({ length: n }, () => ({ name: null, series: null }));
  const wantRounds = y => {
    if (y >= OWN_OCTOBER.from) return OWN_OCTOBER.names.map((name, i) => ({ name, series: OWN_OCTOBER.series[i] }));
    const w = OWN.mlbFirstRound.find(x => y >= x[0] && (x[1] === null || y <= x[1]));
    if (!w) return open(4);
    if (w[2] === null) return open(3);
    return [{ name: w[2], series: w[2] === 'Wild Card Game' ? OWN_OCTOBER.game : null }, ...open(3)];
  };
  for (const y of rangeOf(2000, 2040)) check('E3', same(S.postseasonRounds('mlb', y), wantRounds(y)), `the reader's rounds for the MLB ${y} postseason are ${JSON.stringify(S.postseasonRounds('mlb', y))}; this file's own table says ${JSON.stringify(wantRounds(y))}`);
  for (const y of rangeOf(2000, 2040)) {
    const p = OWN.nhlPlayoff; const bound = y >= p.from && !p.modified.includes(y);
    const want = bound ? p.rounds.map(name => ({ name, series: [4, 7] })) : open(4);
    check('E3', same(S.postseasonRounds('nhl', y), want), `the reader's rounds for the NHL playoffs of the season that started in ${y} are not this file's own (${bound ? 'four best of sevens' : 'four open rounds'})`);
  }

  const RESULTS = { wcs: 'Lost the Wild Card series', wcg: 'Lost the Wild Card Game', ds: 'Lost the Division Series', cs: 'Lost the Championship Series', ws: 'Lost the World Series', won: 'WON THE WORLD SERIES' };
  const play = (year, n) => {
    const by = new Map();
    for (let i = 0; i < n; i++) {
      const rng = mulberry(year * 7919 + i);
      const pos = ['CF', 'SS', '1B', 'SP', 'RP', 'DH'][i % 6];
      const c = M.startMlbCareer('Ledger Check', pos, M.MLB_ARCHETYPES[pos][0], rng, null, year < 2026 ? 'y2004' : undefined);
      c.year = year; c.health = 100;
      const { line } = M.simMlbSeason(c, 90, rng);
      if (line.poGames === undefined) continue;
      if (!by.has(line.teamResult)) by.set(line.teamResult, []);
      by.get(line.teamResult).push(line.poGames);
    }
    return by;
  };
  const outside = (list, lo, hi) => (list ?? []).filter(g => g < lo || g > hi).length;
  for (const year of [2004, 2011, 2012, 2019, 2020, 2021, 2022, 2026, 2033]) {
    const by = play(year, 6000); const w = OWN.mlbFirstRound.find(x => year >= x[0] && (x[1] === null || year <= x[1]));
    const seen = [...by.keys()]; const n = k => (by.get(RESULTS[k]) ?? []).length;
    check('E4', seen.every(r => Object.values(RESULTS).includes(r)) && n('ds') > 100 && n('won') > 10, `the ${year} postseason wrote a result outside the ladder, or too few runs to judge (${seen.join(' | ')})`);
    if (w[2] === null) check('E4', n('wcs') === 0 && n('wcg') === 0, `${n('wcs') + n('wcg')} seasons of ${year} ended in a wild card round; the ledger says that year had none`);
    else if (w[2] === 'Wild Card Game') check('E4', n('wcs') === 0 && n('wcg') > 100 && outside(by.get(RESULTS.wcg), 1, 1) === 0, `in ${year} the wild card was one game: ${n('wcs')} seasons read as a series, ${n('wcg')} as the game, ${outside(by.get(RESULTS.wcg), 1, 1)} of those not one game long`);
    else check('E4', n('wcg') === 0 && n('wcs') > 100, `in ${year} the wild card was a series: ${n('wcg')} seasons read as a single game, ${n('wcs')} as the series`);
    if (year >= OWN_OCTOBER.from) {
      const sum = (k, upTo) => OWN_OCTOBER.series.slice(0, upTo).reduce((t, x) => t + x[k], 0);
      const bad = outside(by.get(RESULTS.wcs), sum(0, 1), sum(1, 1)) + outside(by.get(RESULTS.ds), sum(0, 2), sum(1, 2)) + outside(by.get(RESULTS.cs), sum(0, 3), sum(1, 3)) + outside(by.get(RESULTS.ws), sum(0, 4), sum(1, 4)) + outside(by.get(RESULTS.won), sum(0, 4), sum(1, 4));
      check('E4', bad === 0, `${bad} runs of ${year} hold a count of games their rounds cannot (a best of three, five, seven and seven)`);
      const swept = 100 * (by.get(RESULTS.wcs) ?? []).filter(g => g === 2).length / Math.max(1, n('wcs'));
      if (process.env.US_LEDGER_MEASURE) console.log(`MEASURE mlb ${year}: ${swept.toFixed(1)} percent of ${n('wcs')} Wild Card exits are two games; Division Series exits by games 5 to 8: ${[5, 6, 7, 8].map(g => (by.get(RESULTS.ds) ?? []).filter(x => x === g).length).join(' ')}`);
      check('E4', swept >= 34 && swept <= 51, `${swept.toFixed(1)} percent of the Wild Card exits of ${year} are two games; the law makes it 42.4 (band 34 to 51)`);
    }
  }
  const stripC = t => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const mlbCode = stripC(readFileSync(path.join(ROOT, 'src/lib/mlbMyCareer.ts'), 'utf8'));
  check('E4', !mlbCode.includes('playoffGames(') && mlbCode.includes("playoffRunGames('mlb', c.year, depth, rng)") && mlbCode.includes("stages[postseasonRung('mlb', c.year, stage)]"), 'src/lib/mlbMyCareer.ts no longer asks src/lib/usSeasonShape.ts for the rounds and the games of its October');
}

/* ===== Round 1226, the reverse check for the MLB season's length. =====
   E5  the reader hands back the ledger's length for every MLB season and
       every id of the game's lists, held to THIS FILE'S OWN TABLE (the clubs
       off their schedule BY NAME, found in the game's lists the way M3 does).
   E6  the MLB engine plays it: nobody plays more games than his club did, a
       healthy hitter misses seven at most, about an eighth of them play the
       whole schedule in a full season and a quarter in the short one
       (measured 10.1 to 14.2 percent and 25.0 percent over ten year and club
       cells of 2,400 seasons, about 1,520 healthy hitters each; the band is
       8 to 32), a starter and a
       reliever fit a short season, and the saved line carries the length
       exactly when it is not the engine's own. Control: mlbtyped. */
const MLB_OWN = 162;
{
  const S = game.shape; const M = game.mlbEngine;
  const wantMlb = (y, id) => {
    if (y < OWN.mlbYears[0]) return [MLB_OWN, 'engine'];
    if (y > OWN.mlbYears[1]) return [OWN.mlbSchedule[OWN.mlbYears[1]] ?? MLB_OWN, 'carried'];
    for (const l of MLB_LISTS) {
      if (y < l.from) continue;
      const t = l.teams.find(x => x.id === id); if (!t) continue;
      for (const [games, names] of Object.entries(OWN.mlbOffClubs[y] ?? {})) if (names.split('|').includes(label(t))) return [Number(games), 'ledger'];
    }
    return [OWN.mlbSchedule[y] ?? MLB_OWN, 'ledger'];
  };
  const allIds = [...new Set(MLB_LISTS.flatMap(l => l.teams.map(t => t.id)))];
  let off = 0;
  for (const y of rangeOf(2000, 2035)) for (const id of allIds) {
    const [want, from] = wantMlb(y, id); const got = S.seasonLengthRow('mlb', y, id);
    if (want !== (OWN.mlbSchedule[y] ?? MLB_OWN)) off++;
    check('E5', got.games === want && got.from === from, `the reader says ${got.games} (${got.from}) for the MLB ${y} season of ${id}; this file's own table says ${want} (${from})`);
  }
  /* 42 of the 50 club lines: six are clubs under a name no list of the game holds that year, and two played the whole schedule with a tie inside it. */
  check('E5', off === 42, `${off} year and id pairs are off their schedule's length by this file's own table; 42 expected`);
  check('E5', S.seasonLength('mlb', 2026) === MLB_OWN && S.seasonLength('mlb', 2020) === OWN.mlbSchedule[2020] && S.seasonLength('mlb', 2026, 'Yomiuri Giants') === MLB_OWN, 'a season asked for with no club, or for a club outside the league, is not the schedule of that year');

  const CELLS = [[2004, 'BOS', 162], [2004, 'PIT', 161], [2005, 'CIN', 163], [2008, 'MON', 162], [2016, 'CHC', 162], [2020, 'BOS', 60], [2020, 'DET', 58], [2026, 'NYY', 161], [2026, 'BOS', 162], [2027, 'NYY', 162]];
  for (const [year, team, want] of CELLS) {
    let over = 0; let whole = 0; let healthy = 0; let far = 0; let slateBad = 0; let arms = 0; const SEASONS = 2400;
    for (let i = 0; i < SEASONS; i++) {
      const rng = mulberry(year * 3301 + i);
      const pos = ['CF', 'SS', '1B', 'C', 'SP', 'RP'][i % 6];
      const c = M.startMlbCareer('Ledger Check', pos, M.MLB_ARCHETYPES[pos][0], rng, null, year < 2026 ? 'y2004' : undefined);
      c.year = year; c.team = team; c.health = 100;
      const { line, notes: said } = M.simMlbSeason(c, 80, rng);
      if ((line.slate ?? MLB_OWN) !== want || ('slate' in line) !== (want !== MLB_OWN)) slateBad++;
      if (line.games > want) over++;
      if (pos === 'SP' || pos === 'RP') { if (line.games > want * (pos === 'SP' ? 0.25 : 0.5)) arms++; continue; }
      if (said.some(n => n.includes('Injured list'))) continue;
      healthy++; if (line.games === want) whole++; if (line.games < want - 7) far++;
    }
    const share = healthy ? 100 * whole / healthy : 0;
    if (process.env.US_LEDGER_MEASURE) console.log(`MEASURE mlb ${year} ${team} want ${want}: whole ${share.toFixed(1)} percent of ${healthy} healthy hitter seasons`);
    check('E6', over === 0 && far === 0, `${over} seasons of ${SEASONS} hold more games than the ${want} of the ${year} season of ${team}, and ${far} healthy hitters missed more than seven`);
    check('E6', arms === 0, `${arms} pitcher seasons of ${year} (${team}) hold more starts or appearances than a ${want} game season can`);
    check('E6', share >= 8 && share <= 32, `${share.toFixed(1)} percent of healthy hitter seasons are the whole ${want} game schedule of ${year} (${team}); band 8 to 32`);
    check('E6', slateBad === 0, `${slateBad} of ${SEASONS} saved lines of ${year} (${team}) carry the wrong season length, or carry one where the engine's own was played`);
  }
  const stripC = t => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const code = stripC(readFileSync(path.join(ROOT, 'src/lib/mlbMyCareer.ts'), 'utf8')).split('export const MLB_SPEND_ITEMS')[0];
  const loop = stripC(readFileSync(path.join(ROOT, 'src/lib/mlbCareerLoop.ts'), 'utf8'));
  for (const [what, text, re] of [['mlbMyCareer.ts', code, /\b155 \+ Math\.floor|= 16[0-3];|\/ 16[1-3]\b/], ['mlbCareerLoop.ts', loop, /\b155\b|\b16[1-3]\b/]]) {
    const hit = text.match(re);
    check('E6', !hit, `src/lib/${what} types a season length of its own again ("${hit?.[0]}"); it must ask src/lib/usSeasonShape.ts`);
  }
  check('E6', game.mlbSlateMark('CF', 150, {}) === 150 && game.mlbSlateMark('CF', 150, { slate: 60 }) === 56 && game.mlbSlateMark('SP', 30, { slate: 60 }) === 11 && game.mlbSlateMark('SP', 30, { slate: 163 }) === 30,
    `the full season mark does not follow the saved length: ${game.mlbSlateMark('CF', 150, {})}, ${game.mlbSlateMark('CF', 150, { slate: 60 })}, ${game.mlbSlateMark('SP', 30, { slate: 60 })}, ${game.mlbSlateMark('SP', 30, { slate: 163 })} (150, 56, 11 and 30 expected)`);
}

/* ===== NOTES FOR THE BINDING ROUNDS: where an engine plays something the ledger does not say. Never a red. ===== */
{
  const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const code = f => strip(readFileSync(path.join(ROOT, f), 'utf8'));
  const mlbSrc = code('src/lib/mlbMyCareer.ts'); const nhlSrc = code('src/lib/nhlMyCareer.ts');
  const readsLedger = s => s.includes('usSeasonLength') || s.includes('usSeasonLedger');

  /* The season lengths. */
  const mlbOdd = mlb.MLB_SEASONS.filter(r => r.games !== 162).map(r => `${r.year} (${r.games})`);
  const noId = mlb.MLB_SEASONS.flatMap(r => r.clubs.map(g => [r.year, g.clubs.length - g.ids.length])).filter(x => x[1] > 0);
  if (mlbSrc.includes("seasonLength('mlb', c.year, c.team)")) notes.push(`MLB engine: it reads its season length from the ledger by year and club (Round 1226, src/lib/usSeasonShape.ts). What it still plays on the schedule's own length: ${noId.reduce((t, x) => t + x[1], 0)} club seasons the ledger names that no list of the game holds under that name that year (${noId.map(x => x[0]).join(', ')}: no club is mapped across a move or a rename), and a pitcher keeps the engine's 32 starts or 62 to 71 appearances and gives way only to a season too short to hold them.`);
  else if (mlbSrc.includes('155 + Math.floor(rng() * 8)')) notes.push(`MLB engine: a healthy hitter plays 155 to 162 games in every year (gamesFor), and it reads no length ledger. The ledger: the schedule was not 162 in ${mlbOdd.join(', ')}, and ${mlb.MLB_SEASONS.filter(r => r.clubs.some(g => g.games !== r.games)).length} seasons hold a club that did not play its schedule's length.`);
  else notes.push('MLB engine: the line that draws a hitter games count has moved; this note could not be made.');
  const nhlOdd = nhl.NHL_SEASONS.filter(r => r.games !== 82).map(r => `${r.year} (${r.games === null ? 'no single length' : r.games})`);
  const nhlUnheld = NHL_LISTS[0].teams.map(t => t.id).filter(id => !(id in nhl.NHL_2019_CLUB_GAMES));
  if (nhlSrc.includes("seasonLength('nhl', c.year, c.team)")) notes.push(`NHL engine: it reads its season length from the ledger by year and club (Round 1226, src/lib/usSeasonShape.ts). What it still plays on its own ${ENGINE_OWN} games: the 2019-20 season of a club the ledger does not hold under the game's id (${nhlUnheld.join(', ')} of the 2006 list: that season has no single length, and no club is mapped across a move or a rename). A goalie keeps the engine's 58 to 67 starts and gives way only to a season too short to hold them.`);
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
  /* The years are read from the windows, never typed: a note may not contradict the data it describes. */
  const yearsOf = round => mlb.MLB_FIRST_ROUND.filter(w => w.round === round).map(w => (w.to === null ? `from ${w.from}` : w.from === w.to ? `${w.from}` : `${w.from} to ${w.to}`)).join(' and ');
  const mlbWords = (mlbSrc.match(/const stages = \[([^\]]*)\]/) ?? [])[1] ?? '';
  const nhlWords = (nhlSrc.match(/const stages = \[([^\]]*)\]/) ?? [])[1] ?? '';
  const say = (sport, words, rows) => rows.map(r => `stage ${r.stage} saves ${r.counts[0]} to ${r.counts[r.counts.length - 1]} games, the real rounds hold ${r.lo} to ${r.hi}: ${r.bad} percent cannot fit`).join('; ');
  const mlbAsks = mlbSrc.includes("playoffRunGames('mlb', c.year, depth, rng)");
  if (mlbAsks) notes.push(`MLB engine: the games of an October are held to the ledger's rounds (Round 1226, src/lib/usSeasonShape.ts): from ${mlb.MLB_PLAYOFF_FORMAT.from} every run fits its rounds, the wild card of ${yearsOf('Wild Card Game')} is one game, and no Wild Card result is written in ${yearsOf(null)}. What it still plays by its own law, because the ledger does not hold the length: every round after the first before ${mlb.MLB_PLAYOFF_FORMAT.from}, and the Wild Card Series of ${mlb.MLB_FIRST_ROUND.filter(w => w.wildCard && w.series === null).map(w => w.from).join(', ')} (MLB_THIN). It models no first round bye (MLB_PLAYOFF_FORMAT.byesPerLeague): a career's club always plays the first round.`);
  else notes.push(`MLB playoff games (careerVariance.playoffGames against MLB_PLAYOFF_FORMAT): ${say('mlb', mlbWords, fits('mlb', mlb.MLB_PLAYOFF_FORMAT.series))}. Stages are the engine results in order: ${mlbWords}.`);
  notes.push(`NHL playoff games (the same law against four best of sevens): ${say('nhl', nhlWords, fits('nhl', nhl.NHL_PLAYOFF_FORMAT.series))}. Stages: ${nhlWords}.`);
  const npf = nhl.NHL_PLAYOFF_FORMAT;
  notes.push(`NHL engine: it writes the same four results in every year. The ledger: NHL_PLAYOFF_FORMAT is two sourced from ${npf.from}-${String(npf.from + 1).slice(2)} only; what the playoffs of ${nhl.NHL_SEASONS[0].year} to ${npf.from - 1} were has one source (NHL_THIN: the same sixteen clubs and four rounds, under other round names), and the tournaments of the seasons that started in ${npf.modified.join(' and ')} were modified. A binding round that draws a path before ${npf.from} must source it first or draw none.`);
  if (mlbWords.includes('Wild Card')) notes.push(`MLB engine: it writes a Wild Card result in every year. The ledger: no wild card round in ${yearsOf(null)}, one game in ${yearsOf('Wild Card Game')}, a series only in ${yearsOf('Wild Card Series')}; and the engine models no first round bye.`);

  /* The club outside the league. */
  for (const o of mlb.MLB_OUTSIDE_CLUBS) {
    const inEngine = code('src/lib/mlbCareerLifeB.ts').includes(`cc.team = '${o.team}'`);
    notes.push(inEngine ? `MLB engine: src/lib/mlbCareerLifeB.ts writes cc.team = '${o.team}', which is in neither MLB list of the game, and then plays MLB seasons for it. A binding round must hold such a row.` : `MLB engine: no line writes cc.team = '${o.team}' any more; MLB_OUTSIDE_CLUBS may be stale.`);
  }
  const ath = game.MLB_TEAMS.find(t => t.id === 'ATH');
  if (ath && label(ath) !== 'Athletics') notes.push(`The game prints "${label(ath)}" for ATH; both 2026 standings read for the ledger print "Athletics" with no city. CONSEQUENCE for the binding round: an id is listed only where a list's own name is the club's real name, so a present day season row that names the Athletics would carry NO id for them, and a binding that holds clubs by id would open a full view for a club the row lists as short. No such row exists today (2026 lists BAL and NYY). Fix the name or key such a row by id before the first one is written.`);
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
