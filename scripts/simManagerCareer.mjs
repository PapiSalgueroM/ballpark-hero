/**
 * Round 111 harness: does getting sacked actually cost you anything?
 * Before this, being sacked hired you again on the very same line, at a
 * random club, instantly. A sack with no consequence makes the whole job
 * free. This measures the new behaviour over many simulated manager careers.
 *
 * Round 1029 adds section 5: the dugout's final table is the manager's own
 * league. It used to be every club in the world at his tier, so an Arsenal
 * manager finished behind Boca and Flamengo. Over 8 pooled seeds (120
 * careers a tier, 8 seasons each, a market job taken after every sack):
 *   a) every named row of every table is a club of his league (the club his
 *      save names, found by name or by the shared rivalry spelling, or the
 *      league a market job came with), and no row is his own club again;
 *   b) "of N" is printed exactly when N is the league's verified size;
 *   c) direct probes: Arsenal names only Premier League clubs, a Manchester
 *      City job (the market's spelling) never meets Man City, an RB Salzburg
 *      job never meets Red Bull Salzburg;
 *   d) the title, promotion and sack rates per tier stay inside main's band.
 *      Main (1aaba4d5) measured with this exact loop, seeds 1 to 8, pooled
 *      rate and the spread of one seed's rate (SD over the 8):
 *        t1 title .1050 (sd .0119)  sack .1147 (.0109)
 *        t2 title .0942 (.0111)  promo .1657 (.0133)  sack .1197 (.0141)
 *        t3 title .0843 (.0093)  promo .1516 (.0123)  sack .0637 (.0075)
 *        t4 title .0729 (.0079)  promo .1317 (.0088)
 *      The band is main's pooled rate plus or minus 1.5 seed SDs, which is
 *      about three standard errors of the gap between two 8 seed pools.
 *      This branch measured: t1 .0981 / .1125; t2 .0871 / .1630 / .1200;
 *      t3 .0855 / .1509 / .0592; t4 .0737 / .1312, the closest to an edge
 *      being t1 title (.0110 of its .0179 room left) and t3 sack (.0068 of
 *      .0113).
 * Negative controls, SIM_MANAGER_CONTROL=<name>, each asserting the string
 * it mutates exists first (exit 2 otherwise), each measured red:
 *   tierfield  the old field (every club at his tier, topped up) is back:
 *              111254 named rows from another league, and 4 tables naming
 *              his own club twice (main's own bug, Manchester City and Man
 *              City in one table)
 *   canon      his club is matched by its exact spelling only: Man City in
 *              8 of 10 Manchester City fields
 *   words      a market club's look alike names are no longer dropped: Red
 *              Bull Salzburg in the RB Salzburg table and field
 *   ofsize     "of N" is printed for every league: 18206 lines wrong
 *              (after the review fixes a named league of unknown size prints
 *              no position at all, so this fires on the club nothing names:
 *              all 6 of its probe seasons)
 *   field10    the unverified field shrinks from 20 to 10 clubs: 9 of the
 *              10 rates leave the band (t1 title .2810)
 * Review fixes (2026-10-06), on every season of the same loop:
 *   e) the table is the league this harness tracked for him: his job's
 *      league in the list's spelling (the market's "EFL Championship" is the
 *      list's Championship), moved only by the table (Premier League bottom
 *      three down to the Championship, Championship top two up) or by a
 *      poaching club's own league; the field names every club the list
 *      knows of it when they fit, and a field of unknown size is 20 or one
 *      more than it knows; a named league of unknown size prints no position
 *      and no points; "Promoted" and "Relegated" appear only where the
 *      league changes, and always there;
 *   f) four jobs through acceptManagerOffer (Nacional in Portugal, a Super
 *      Lig club under the market's accented spelling, West Ham United in the
 *      EFL Championship, Braunschweig in the 2. Bundesliga) and an old save
 *      at a market club with no league saved, which the market gives back;
 *      plus a club nothing names, which prints no "of N".
 *   The fixed branch measured 29518 seasons, 1478 market jobs (1195 in a
 *   league the list spells another way), 635 promotions to the Premier
 *   League, 164 relegations to the Championship, 14956 seasons of unknown
 *   size; rates t1 .1042 / .1145, t2 .0947 / .1657 / .1149, t3 .0908 /
 *   .1598 / .0606, t4 .0695 / .1293, all inside main's band.
 *   Their controls, each measured red: nomove (no league ever moves): 1622
 *   seasons in the wrong league, 1102 wrong lines; listfirst (the list's row
 *   beats the job's league): 1766 seasons, and Nacional plays the Primera
 *   Division Uruguay; zones (positions everywhere): 14956 lines; size (one
 *   known club dropped from a field of unknown size): 1124 tables; noaccept
 *   (acceptManagerOffer forgets the league): 5309 seasons and three probes;
 *   nofold (no accent folding): 125 seasons and the Super Lig probe;
 *   nomarket (no recovery from the market): the old save loses Serie A;
 *   wording ("Promoted" out of a top flight): 2710 lines.
 * Closing check (2026-10-06), on every season of the same loop:
 *   g) a season before 2026-27, the season the list's league labels
 *      describe, names no rival and flags lineupUnknown exactly when the
 *      list knows clubs of that league (it cannot say who was in the 2012
 *      Premier League); the field keeps its size;
 *   h) the Premier League and the Championship swap clubs only from
 *      2004/05, the first season the second tier had that name; before it
 *      the tracked league stays put and no line says Promoted or Relegated.
 *   Measured 29306 seasons, 46597 named rows, 6267 past seasons in a league
 *   the list knows, 253 finishes in the pair's move zones before 2004/05,
 *   470 promotions to the Premier League, 121 relegations; rates t1 .1049 /
 *   .1167, t2 .0868 / .1529 / .1242, t3 .0852 / .1515 / .0611, t4 .0632 /
 *   .1219, all inside main's band (the pair now stays put before 2004, so
 *   some fields are 20 rather than 24 and the stream moves).
 *   Their controls, each measured red: pastnames (a past season names the
 *   2026-27 list again): 16117 past names or flags, La Liga 1997 naming
 *   Sevilla; era2004 (the pair moves in any year): 3 failures, a 2000
 *   season "Relegated to the Championship"; poolyear (the pool header moved
 *   on to 2027-28): the fence fails. nomove now mutates the four argument
 *   signature (4 failures). The thirteen older controls all still go red.
 * The lead's decision on F14 (2026-10-06): a season before 2026-27 does
 *   not know which league his club was in, so it names none. On every
 *   season of the loop, and on a second set of careers playing 2011 to
 *   2018 at Premier League and Championship clubs (f2, its own seed, where
 *   the club still moves between the two): no league label of the list or
 *   the market in the table's header, the line under it (read through
 *   dugoutTableWords, the page's own words) or the season line, and
 *   lineupUnknown on every past season in a league the game holds; from
 *   2026-27 on the header names his league as before. A past move says
 *   Promoted or Relegated without where to.
 *   Measured: 7295 past seasons in a held league (53 with a move line),
 *   22011 later seasons headed; f2 893 seasons, 52 moves, 105 lines saying
 *   promoted or relegated; rates unchanged (the move is still made, only
 *   its words changed). Controls, each measured red: pastheader (the label
 *   back over a past table): 7295 seasons plus all 893 of f2; pastsentence
 *   (the label back in the line under it): 7295 plus 893; pastmove (a past
 *   move names its division): 53 plus 105; hideall (no header names a
 *   league, ever): 22011 later seasons.
 * Round 1037 (who was in each league, season by season): F14 holds now only
 *   where the league ledgers are silent. A past season of one of the six
 *   leagues they hold (Premier League, Championship, La Liga, Serie A,
 *   Bundesliga, Ligue 1, 1990-91 to 2025-26) is that season's real field:
 *   headed by the name the league carried ("First Division" in 1991), its
 *   named rows only that season's real members, not flagged lineupUnknown,
 *   at most three fewer names than the ledgers know (his own seat, a
 *   displaced seat, a look alike). A job or a poaching club taken for a past
 *   season plays the league its club was really in that season, so the
 *   tracked league follows the ledgers there too. Every past move is in the
 *   English pair, which the ledgers hold, so pastmove has nothing left to
 *   catch and gives way to ledgername (the season's name dropped from the
 *   row: the 1991 table headed Premier League). Measured: 3925 past seasons
 *   in a ledger league, 215 jobs placed by year, 0 wrong; floors 1900 and
 *   100. Every rate stays in main's band (29306 seasons). The bigUnverified
 *   floor (500) is retired: its fields were the Championship before 2004,
 *   unsized until the ledgers sized it (24), so the loop reads 0 where its
 *   base, release-ah fc30942e, read 1262; a probe after f2 holds the size
 *   rule for a field of unknown size knowing 24 clubs instead (the size
 *   control turns it red). Controls measured red on 2026-10-06: ledgername
 *   1194 past ledger seasons headed by the key, not the season's name;
 *   size 4 probe failures (23 for 24, 24 for 25, before and after 2026-27).
 * Run: node scripts/simManagerCareer.mjs
 */
import { build } from 'esbuild';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fwd = ROOT.replaceAll('\\', '/');
const CONTROL = process.env.SIM_MANAGER_CONTROL ?? '';
const CONTROLS = {
  tierfield: { file: 'soccerCareerEngine.ts',
    from: 'managerLeagueField({ clubs, club: ms.club, league: savedLeague, year: calYear }, Math.random)',
    to: '{ league: null, size: 20, sizeVerified: false, named: [...clubs.filter(c => c.tier === ms.clubTier && c.name !== ms.club), ...clubs.filter(c => Math.abs(c.tier - ms.clubTier) === 1 && c.name !== ms.club)].slice(0, 19).map(c => c.name) }' },
  canon: { file: 'soccerCareerLeague.ts', from: 'foldName(SC_CLUB_CANON[name] ?? name)', to: 'foldName(name)' },
  words: { file: 'soccerCareerLeague.ts', from: '(inLeague || !nameWords(c.name).some(w => myWords.includes(w)))', to: 'true' },
  ofsize: { file: 'soccerCareerEngine.ts', from: 'const ofSize = lf.sizeVerified ? ` of ${leagueSize}` : "";', to: 'const ofSize = ` of ${leagueSize}`;' },
  field10: { file: 'soccerCareerLeague.ts', from: 'export const MANAGER_FIELD = 20;', to: 'export const MANAGER_FIELD = 10;' },
  /* the review fixes' controls (single line strings, so a CRLF checkout matches too) */
  nomove: { file: 'soccerCareerLeague.ts', from: 'export function divisionMove(league: string | null, pos: number, size: number, year: number): { to: string; up: boolean } | null {',
    to: 'export function divisionMove(league: string | null, pos: number, size: number, year: number): { to: string; up: boolean } | null { return null;' },
  listfirst: { file: 'soccerCareerLeague.ts', from: '? listLeague(input.clubs, input.league) ?? input.league',
    to: '? input.clubs.find(c => clubKey(c.name) === mine)?.league ?? listLeague(input.clubs, input.league) ?? input.league' },
  zones: { file: 'soccerCareerEngine.ts', from: 'const sizeUnknown = lf.league !== null && !lf.sizeVerified;', to: 'const sizeUnknown = false;' },
  size: { file: 'soccerCareerLeague.ts', from: 'Math.max(MANAGER_FIELD, names.length + 1)', to: 'Math.max(MANAGER_FIELD, names.length)' },
  noaccept: { file: 'soccerCareerEngine.ts', from: '  ms.league = leagueKeyInYear({ name: offer.club, league: offer.league }, managerNextSeasonYear(s)) ?? offer.league;', to: '' },
  nofold: { file: 'soccerCareerLeague.ts', from: 'const f = foldName(label);', to: 'const f = label.toLowerCase().trim();' },
  nomarket: { file: 'soccerCareerEngine.ts', from: 'if (marketJob && MARKET) {', to: 'if (false) {' },
  /* the closing check's controls: a past season names the 2026-27 list again; the English pair moves before the Championship had its name */
  pastnames: { file: 'soccerCareerLeague.ts', from: 'named: lineupUnknown ? [] : names.slice(0, size - 1)', to: 'named: names.slice(0, size - 1)' },
  era2004: { file: 'soccerCareerLeague.ts', from: 'if (league === null || year < DIVISION_FROM) return null;', to: 'if (league === null) return null;' },
  poolyear: { file: null }, // the pool header fence below reads a pool that moved on to 2027-28
  wording: { file: 'soccerCareerEngine.ts', from: '` ${ms.club} move up to Tier ${ms.clubTier}.`', to: '` Promoted with ${ms.club} to Tier ${ms.clubTier}!`' },
  /* the lead's decision on F14: put the league back over a past table, under it, and in a past move line */
  pastheader: { file: 'soccerCareerLeague.ts', from: 'const league = last.lineupUnknown === true ? null : held;', to: 'const league = held;' },
  hideall: { file: 'soccerCareerLeague.ts', from: 'const league = last.lineupUnknown === true ? null : held;', to: 'const league = null;' },
  pastsentence: { file: 'soccerCareerLeague.ts', from: '"We don\'t know who was in the league that year, so the rest of the field is counted, not named."',
    to: '`We don\'t know who was in ${held} that year, so the rest of the field is counted, not named.`' },
  /* Round 1037: every past move is in the English pair, which the ledgers hold, so a past move names its division now and pastmove has nothing left to catch; ledgername drops the name a ledger season carried (the First Division of 1991) */
  ledgername: { file: 'soccerCareerEngine.ts', from: '...(lf.leagueName && lf.leagueName !== lf.league ? { leagueName: lf.leagueName } : {}),', to: '' },
};
if (CONTROL && !CONTROLS[CONTROL]) { console.error(`unknown control ${CONTROL}`); process.exit(2); }
let applied = false;
const controlPlugin = { name: 'control', setup(b) {
  b.onLoad({ filter: /soccerCareer(Engine|League)\.ts$/ }, args => {
    let src = fs.readFileSync(args.path, 'utf8');
    const c = CONTROLS[CONTROL];
    if (c && args.path.replaceAll('\\', '/').endsWith(`/src/lib/${c.file}`)) {
      if (!src.includes(c.from)) { console.error(`control ${CONTROL}: the string it mutates is not in ${c.file}`); process.exit(2); }
      src = src.replace(c.from, c.to);
      applied = true;
    }
    return { contents: src, loader: 'ts' };
  });
} };
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'simManagerCareer-'));
process.on('exit', () => { try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* best effort */ } });
fs.writeFileSync(path.join(tmp, 'entry.mjs'), `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
export const e = await import('${fwd}/src/lib/soccerCareerEngine.ts');
export const cm = await import('${fwd}/src/lib/clubManager.ts');
export const lg = await import('${fwd}/src/lib/soccerCareerLeague.ts');
export const rv = await import('${fwd}/src/data/clubRivalries.ts');
export const ce = await import('${fwd}/src/lib/careerEras.ts');
export const jm = await import('${fwd}/src/lib/managerJobMarket.ts');
`);
await build({ entryPoints: [path.join(tmp, 'entry.mjs')], bundle: true, format: 'esm', platform: 'node',
  outfile: path.join(tmp, 'mc.mjs'), logLevel: 'error', alias: { '@': `${fwd}/src` }, plugins: [controlPlugin] });
if (CONTROL && !applied && CONTROL !== 'poolyear') { console.error(`control ${CONTROL} never reached its file`); process.exit(2); }
if (CONTROL) console.log(`CONTROL ${CONTROL} applied: this run is meant to go red`);
const { e, cm, lg, rv, ce, jm } = await import(pathToFileURL(path.join(tmp, 'mc.mjs')).href);
let failures = 0; const fail = s => { failures += 1; console.error('  FAIL: ' + s); };
/** mulberry32, the same stream the Round 1029 bands were measured on. */
function seedRandom(seed) {
  let a = seed >>> 0;
  Math.random = () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CLUBS = cm.REAL_LEAGUES.flatMap(l => cm.playableClubs(l.id).map(c => ({ name:c.name, tier:c.tier })));
/* Round 273. The job market is a separate download now, because a static
   import of it was putting the whole Club Manager engine in front of every
   Soccer Career player before the first screen. Two things follow, and this
   harness checks both rather than just calling the loader and moving on.

   FIRST, before loading anything: an offer feed that has not arrived must not
   look like an offer feed with nothing in it. Zero offers is a real state in
   this game and the note under it is written to sting, so faking it while a
   file downloads would tell a player his career is finished when it is not. */
console.log('0) an unloaded job market says so, and never pretends to be an empty one');
{
  const probe = {
    nationality:'England', peakOverall:74, intStats:{ caps:5 }, seasons:[], events:[],
    phase:'manager_season', overall:74, age:40,
    managerState:{ club:'Everton', clubTier:2, season:1, trophies:0, promotions:0, seasonResults:[],
      nationalTeamOffer:false, managingNationalTeam:false, unemployed:true, seasonsOut:0 },
  };
  if (e.managerMarketReady()) {
    fail('the market is already loaded before anything asked for it, so it is still a static import somewhere');
  }
  const out = e.advanceManagerSeason(probe, CLUBS);
  const note = out.managerState.offerNote ?? '';
  if ((out.managerState.offers ?? []).length !== 0) fail('an unloaded market produced offers out of nowhere');
  if (!/phone lines/i.test(note)) {
    fail(`an unloaded market gave the note ${JSON.stringify(note)}, which reads like a real verdict on the player`);
  }
  console.log(`   unloaded: 0 offers and the note is ${JSON.stringify(note.slice(0, 46))}`);
}

/* SECOND: load it, exactly as the game does before it lets anyone into the
   dugout, and run everything below against a real market. */
await e.loadManagerMarket();
if (!e.managerMarketReady()) { console.error('  FAIL: the market never loaded'); process.exit(1); }

function season(o){ return { year:2030, age:28, club:'Club', clubCountry:'England', clubTier:2, apps:34, goals:10,
  assists:5, cleanSheets:0, yellowCards:2, redCards:0, rating:7.1, leagueTitle:false, domesticCup:false,
  championsLeague:false, worldCup:false, ballonDor:false, ballonDorRank:null, type:'playing',
  intApps:0, intGoals:0, intAssists:0, intRating:0, tournament:null, tournamentResult:null, ...o }; }

function makeCareer(tier, decorated){
  return {
    nationality:'England', peakOverall: decorated?92:74, intStats:{ caps: decorated?95:5 },
    seasons: Array.from({length:14},(_,i)=>season({ clubTier:tier, leagueTitle: decorated && i%3===0,
      championsLeague: decorated && i%5===0, ballonDor: decorated && i===8, goals: decorated?21:7 })),
    events: [], phase:'manager_season', overall: decorated?92:74, age:40,
    managerState:{ club:'Everton', clubTier:tier, season:1, trophies:0, promotions:0, seasonResults:[],
      nationalTeamOffer:false, managingNationalTeam:false },
  };
}

console.log('1) A sack no longer hands you another job on the same line');
{
  let sacks=0, instantRehires=0, unemployedSpells=0;
  for (let c=0;c<250;c++){
    let s = makeCareer(2,false);
    for (let yr=0; yr<10; yr++){
      const before = s.managerState.club;
      const wasOut = !!s.managerState.unemployed;
      s = e.advanceManagerSeason(s, CLUBS);
      const ms = s.managerState;
      /* Round 227: a sack is the unemployed flag flipping on, not a word in
         the line. The rewrite added a survivable relegation ("the board
         kept faith", you go down WITH the club), which matches /Relegated/
         but is not a sacking and must not count as one. */
      if (!wasOut && ms.unemployed) {
        sacks++;
        unemployedSpells++;
        if (ms.club !== before) instantRehires++;
      }
    }
  }
  console.log(`   ${sacks} sackings across 250 careers, ${unemployedSpells} left the manager unemployed, ${instantRehires} were instant rehires`);
  if (sacks === 0) fail('nobody ever got sacked, so there is nothing to measure');
  if (instantRehires > 0) fail(`${instantRehires} sackings still handed out a job on the spot`);
}

console.log('2) A decorated player gets more interest than a nobody when sacked');
{
  const measure = (decorated) => {
    let offers=0, empty=0, spells=0;
    for (let c=0;c<250;c++){
      let s = makeCareer(2, decorated);
      for (let yr=0; yr<10 && spells<400; yr++){
        s = e.advanceManagerSeason(s, CLUBS);
        if (s.managerState.unemployed) { spells++; offers += (s.managerState.offers??[]).length;
          if(!(s.managerState.offers??[]).length) empty++; break; }
      }
    }
    return { avg: offers/Math.max(1,spells), empty: empty/Math.max(1,spells), spells };
  };
  const legend = measure(true), nobody = measure(false);
  console.log(`   Ballon d'Or winner sacked: ${legend.avg.toFixed(2)} offers, ${(legend.empty*100).toFixed(0)}% empty (${legend.spells} spells)`);
  console.log(`   journeyman sacked:         ${nobody.avg.toFixed(2)} offers, ${(nobody.empty*100).toFixed(0)}% empty (${nobody.spells} spells)`);
  if (legend.avg <= nobody.avg) fail('a Ballon d\'Or winner gets no more interest than a journeyman');
}

console.log('3) Sitting out makes it worse, and you can accept a job');
{
  let s = makeCareer(3,false);
  let guard=0;
  while (!s.managerState.unemployed && guard++ < 40) s = e.advanceManagerSeason(s, CLUBS);
  if (!s.managerState.unemployed) { console.log('   (never got sacked in 40 seasons, skipping)'); }
  else {
    const first = (s.managerState.offers??[]).length;
    const note1 = s.managerState.offerNote;
    s = e.advanceManagerSeason(s, CLUBS);
    const out2 = s.managerState.seasonsOut;
    console.log(`   sacked with ${first} offers ("${(note1||'').slice(0,50)}..."), after another season out: seasonsOut ${out2}`);
    if (out2 !== 1) fail(`seasonsOut is ${out2} after one season unemployed`);
    if (!note1) fail('no note explaining the offer feed');
    // accept one if there is one
    const offers = s.managerState.offers ?? [];
    if (offers.length) {
      const target = offers[0];
      s = e.acceptManagerOffer(s, 0);
      console.log(`   accepted ${target.club} (tier ${target.tier}): unemployed now ${s.managerState.unemployed}`);
      if (s.managerState.unemployed) fail('still unemployed after accepting a job');
      if (s.managerState.club !== target.club) fail('accepting an offer did not move him to that club');
      if (!cm.clubByName(s.managerState.club)) fail('accepted a club the engine does not know');
    }
  }
}

console.log('4) Copy check');
{
  const t = fs.readFileSync(path.join(ROOT,'src/lib/soccerCareerEngine.ts'),'utf8');
  let bad=0;
  t.split('\n').forEach((l,i)=>{ if(/Round 111/.test(l) && /[–—]/.test(l)) { bad++; fail(`line ${i+1} has a dash`); } });
  if(!bad) console.log('   clean');
}

console.log('5) Round 1029: the final table is his own league');
const FB = e.FALLBACK_CLUBS;
const foldName = s => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
const keyOf = n => foldName(rv.SC_CLUB_CANON[n] ?? n);
const byName = new Map(FB.map(c => [c.name, c]));
/* Market leagues the list spells its own way, written out here and not read
   from the engine. */
const ALIAS = { 'efl championship': 'Championship', 'brasileirao serie a': 'Brasileirao', 'supersport hnl': 'HNL',
  'mls eastern conference': 'MLS', 'mls western conference': 'MLS',
  /* Round 1100: the job market's "A-League Men" is the list's "A-League" */
  'a-league men': 'A-League' };
const listLabel = lab => { const f = foldName(lab); const w = ALIAS[f]; return FB.find(c => (w ? c.league === w : foldName(c.league) === f))?.league ?? null; };
/** The league a job's first table must be: the league the job came with, in
 *  the list's spelling (the card showed it), else his club found in the
 *  list by name or by the shared spelling. */
function expectedLeague(club, jobLeague) {
  if (jobLeague) return listLabel(jobLeague) ?? jobLeague;
  return FB.find(c => keyOf(c.name) === keyOf(club))?.league ?? null;
}
/* Round 1037: a job taken, or a poaching club joined, for a season before
   2026-27 is played in the league the club was really in that season (the
   league ledgers), when they place it in one; otherwise as before */
function jobLeague(s, offer) {
  const year = e.managerNextSeasonYear(s);
  const real = lg.leagueKeyInYear({ name: offer.club, league: offer.league }, year);
  if (real && year < LIST_SEASON) { cover.yearJobs += 1; return real; }
  return expectedLeague(offer.club, offer.league);
}
function poachLeague(club, year) {
  const c = FB.find(x => x.name === club);
  return c ? (lg.leagueKeyInYear(c, year) ?? c.league) : null;
}
/* Round 1037 review: a season before 2026-27 that nothing the game played
   put his club in (a job's first season, or one after a season it could not
   name) is played where the ledgers put the club that year, and when they
   put it in none of the six while the label names one of them, in no league
   at all (unplaced: no league, nobody named, lineup unknown). Today's label
   never seats a club in a past league. `placed` is this harness's own: the
   season before was played at this club in a league it named. */
function settle(club, want, calYear, placed) {
  if (placed || calYear >= LIST_SEASON) return { want, unplaced: false };
  const real = lg.leagueKeyInYear({ name: club, league: want ?? '' }, calYear);
  if (real) return { want: real, unplaced: false };
  return want && lg.ledgerLeague(want, calYear) ? { want: null, unplaced: true } : { want, unplaced: false };
}
/* The closing check's two year rules, held here rather than read from the
   module: the list's league labels are the 2026-27 season's (the pool says
   so in its header, and a regenerated pool that moves on has to move this
   too), and the second tier was called the Championship from 2004/05. */
const LIST_SEASON = 2026, MOVES_FROM = 2004;
let poolHead = fs.readFileSync(path.join(ROOT, 'src/data/soccerCareerClubPool.ts'), 'utf8').split('*/')[0];
if (CONTROL === 'poolyear') {
  if (!poolHead.includes('2026-27')) { console.error('control poolyear: the pool header has no 2026-27 to move'); process.exit(2); }
  poolHead = poolHead.replaceAll('2026-27', '2027-28');
}
if (!/2026-27/.test(poolHead)) {
  fail('the club pool no longer says its labels are 2026-27: move LIST_SEASON here and in soccerCareerLeague.ts with it');
}
const PLAIN = new Set(['city', 'united', 'club', 'real', 'sporting', 'athletic', 'atletico', 'town', 'county', 'rovers', 'football']);
const words = n => foldName(n).split(/[^a-z0-9]+/).filter(w => w.length >= 4 && !PLAIN.has(w));
/** Distinct clubs of `league` the list knows in `year`, his own (and, when he
 *  is not in that league, its look alikes) left out. */
function knownIn(league, club, year) {
  if (!league) return 0;
  const world = ce.adjustClubsForYear([...FB], year);
  const mine = keyOf(club), mw = words(club);
  const inLeague = world.some(c => c.league === league && keyOf(c.name) === mine);
  return new Set(world.filter(c => c.league === league && keyOf(c.name) !== mine
    && (inLeague || !words(c.name).some(w => mw.includes(w)))).map(c => keyOf(c.name))).size;
}
function seasonRow(year, tier) {
  return { year, age: 28, club: 'Club', clubCountry: 'England', clubTier: tier, apps: 34, goals: 10,
    assists: 5, cleanSheets: 0, yellowCards: 2, redCards: 0, rating: 7.1, leagueTitle: false, domesticCup: false,
    championsLeague: false, worldCup: false, ballonDor: false, ballonDorRank: null, type: 'playing',
    intApps: 0, intGoals: 0, intAssists: 0, intRating: 0, tournament: null, tournamentResult: null };
}
function dugout(club, tier, lastYear, league) {
  return { nationality: 'England', peakOverall: 80, intStats: { caps: 10 },
    seasons: Array.from({ length: 12 }, (_, i) => seasonRow(lastYear - 11 + i, 2)), events: [], awards: [],
    phase: 'manager_season', overall: 80, age: 40,
    managerState: { club, clubTier: tier, season: 0, trophies: 0, promotions: 0, seasonResults: [],
      nationalTeamOffer: false, managingNationalTeam: false, ...(league ? { league } : {}) } };
}
const cover = { seasons: 0, home: 0, market: 0, verified: 0, thin: 0, named: 0, unnamed: 0,
  accepted: 0, relabelled: 0, up: 0, down: 0, zones: 0, bigUnverified: 0, past: 0, early: 0,
  pastHeld: 0, pastMoves: 0, headed: 0, pastLedger: 0, yearJobs: 0, unplaced: 0 };
const bad = { league: 0, self: 0, ofN: 0, size: 0, table: 0, known: 0, zone: 0, words: 0, past: 0, pastLeague: 0, header: 0, pastLedger: 0 };
/* the lead's decision on F14: every league label the game can print (the
   list's and the job market's). A club whose name holds a league label is
   taken out of a line before it is searched (none does today); only those,
   since stripping every club hid two labels that hold a club's name (Liga
   Nacional Honduras and Guatemala, which hold Nacional) */
const LEAGUE_NAMES = [...new Set([...FB.map(c => c.league), ...jm.allOfferClubs().map(o => o.league)])].filter(Boolean);
const CLUB_NAMES = [...new Set([...FB.map(c => c.name), ...jm.allOfferClubs().map(o => o.name)])]
  .filter(n => LEAGUE_NAMES.some(l => n.includes(l))).sort((a, b) => b.length - a.length);
function leagueIn(text) {
  let t = text ?? '';
  for (const n of CLUB_NAMES) if (t.includes(n)) t = t.split(n).join('|');
  return LEAGUE_NAMES.find(l => t.includes(l)) ?? null;
}
const firstBad = [];
const note = s => { if (firstBad.length < 6) firstBad.push(s); };
/** Every check of a), b) and e) on one employed season. `want` is the league
 *  this harness tracked for him: his job's, moved by the table's own rule. */
function checkSeason(s, club0, want, lastYear, unplaced = false) {
  const ms = s.managerState;
  const row = ms.seasonResults[ms.seasonResults.length - 1];
  const calYear = lastYear + ms.season;
  /* the table is the league he is in, on every season, named or not */
  if ((row.league ?? null) !== want) { bad.table += 1; note(`${club0} S${ms.season}: table ${row.league ?? 'none'}, his league ${want ?? 'none'}`); }
  /* the field holds every club it knows of that league when they fit, and
     a field of unknown size is 20 or one more than it knows */
  const K = knownIn(want, club0, calYear);
  /* a season before the list's own (2026-27) names nobody, and is flagged
     whenever it is played in a league the game holds (the lead's decision
     on F14: then it names no league either, see below) */
  const past = calYear < LIST_SEASON;
  /* Round 1037: a past season of a league the league ledgers hold is that
     season's real field: its real members named (never more than the
     ledgers know by name, at most his own seat, a displaced seat and a look
     alike fewer), not flagged, headed by the name the league carried */
  const ledger = past && row.league ? lg.ledgerLeague(row.league, calYear) : null;
  if (ledger ? !(row.knownRivals <= ledger.clubs.length && row.knownRivals >= ledger.clubs.length - 3)
    : row.knownRivals !== (past ? 0 : Math.min(K, row.leagueSize - 1))) { bad.known += 1; note(`${want} ${calYear}: ${row.knownRivals} known, the ${ledger ? 'ledgers name' : 'list has'} ${ledger ? ledger.clubs.length : K}`); }
  if (!!row.lineupUnknown !== (past && ((want !== null && !ledger) || unplaced))) { bad.past += 1; note(`${want} ${calYear}: lineupUnknown ${row.lineupUnknown}, the list has ${K}${unplaced ? ', unplaced' : ''}`); }
  if (unplaced) cover.unplaced += 1;
  if (past && K > 0) cover.past += 1;
  /* F14: a past season the ledgers do not hold names no league over the
     table, under it or in its season line; from 2026-27 on the header names
     his league, as before; a ledger season is headed by its own name */
  const tw = lg.dugoutTableWords(row);
  if (past && row.league) {
    cover.pastHeld += 1;
    if (ledger) {
      cover.pastLedger += 1;
      if (tw.header !== `Final table · ${ledger.name}`) { bad.pastLedger += 1; note(`${club0} ${calYear}: header ${tw.header}, the season's league was ${ledger.name}`); }
    } else {
      const hit = leagueIn(tw.header) ?? leagueIn(tw.note) ?? leagueIn(tw.orderNote) ?? leagueIn(row.result);
      if (hit) { bad.pastLeague += 1; note(`${club0} ${calYear} names ${hit}: ${tw.header} | ${(tw.note ?? row.result).slice(0, 70)}`); }
    }
  }
  if (!past && row.league) {
    cover.headed += 1;
    if (tw.header !== `Final table · ${row.league}`) { bad.header += 1; note(`${club0} ${calYear}: header ${tw.header}`); }
  }
  /* Round 1100: a league in the odd ledger (it splits, or plays in
     conferences) has that league's real number of rows, still unverified */
  const oddRows = row.league ? lg.oddFormatFor(row.league, calYear)?.clubs : undefined;
  if (!row.sizeVerified && row.leagueSize !== (oddRows ?? Math.max(20, K + 1))) { bad.size += 1; note(`${want} ${calYear}: unverified size ${row.leagueSize} for ${K} known${oddRows ? `, the odd ledger says ${oddRows}` : ''}`); }
  if (!row.sizeVerified && K >= 20) cover.bigUnverified += 1;
  /* a named league of unknown size prints no position and no points */
  if (row.league && !row.sizeVerified) {
    cover.zones += 1;
    if (/\d(st|nd|rd|th)\b| points/.test(row.result)) { bad.zone += 1; note(`[${row.league}] ${row.result.slice(0, 60)}`); }
  }
  /* promotion and relegation are said only where the club changes league,
     and always said there */
  const promo = /Promoted with/.test(row.result), rele = /Relegated/.test(row.result);
  /* and only from 2004/05, when the second tier took the Championship's name */
  const moves = calYear >= MOVES_FROM;
  const pairZone = (row.league === 'Premier League' && row.playerPos >= row.leagueSize - 2) || (row.league === 'Championship' && row.playerPos <= 2);
  if (pairZone && !moves) cover.early += 1;
  /* in a past season the move is said without its destination (F14) */
  if (row.league && promo && !(moves && row.league === 'Championship' && (past || / to the Premier League!/.test(row.result)))) { bad.words += 1; note(`[${row.league} ${calYear}] ${row.result.slice(0, 80)}`); }
  if (row.league && rele && !(moves && row.league === 'Premier League' && (past || /Relegated to the Championship/.test(row.result)))) { bad.words += 1; note(`[${row.league} ${calYear}] ${row.result.slice(0, 80)}`); }
  if (past && row.league && (promo || rele)) cover.pastMoves += 1;
  if (moves && row.league === 'Premier League' && row.playerPos >= row.leagueSize - 2 && !rele) { bad.words += 1; note(`PL ${row.playerPos}/${row.leagueSize} not relegated: ${row.result.slice(0, 60)}`); }
  if (moves && row.league === 'Championship' && row.playerPos <= 2 && !promo) { bad.words += 1; note(`Championship ${row.playerPos} not promoted: ${row.result.slice(0, 60)}`); }
  cover.seasons += 1;
  if (FB.some(c => keyOf(c.name) === keyOf(club0))) cover.home += 1; else cover.market += 1;
  if (row.sizeVerified) cover.verified += 1;
  const rivals = (row.table ?? []).filter(r => !r.you);
  if (!rivals.some(r => !r.unnamed)) cover.thin += 1;
  for (const r of rivals) {
    if (r.unnamed) { cover.unnamed += 1; if (r.club) { bad.league += 1; firstBad.push(`unnamed row carries a name ${r.club}`); } continue; }
    cover.named += 1;
    if (past && !ledger) { bad.past += 1; note(`${club0} ${calYear}: names ${r.club}, a season before the list's own`); }
    /* Round 1037: a ledger season names that season's members, whatever
       league the list puts them in today */
    const got = ledger ? (ledger.clubs.includes(r.club) ? want : `not in the ${calYear} ${ledger.name}`) : byName.get(r.club)?.league ?? '(not a club of the list)';
    if (got !== want) { bad.league += 1; if (firstBad.length < 6) firstBad.push(`${club0} (${want}) S${ms.season}: ${r.club} is ${got}`); }
    if (keyOf(r.club) === keyOf(club0)) { bad.self += 1; if (firstBad.length < 6) firstBad.push(`${club0} meets himself as ${r.club}`); }
  }
  const printsOf = / of \d+/.test(row.result);
  if (printsOf !== !!row.sizeVerified) { bad.ofN += 1; if (firstBad.length < 6) firstBad.push(`${club0}: "${row.result.slice(0, 40)}" with sizeVerified ${row.sizeVerified}`); }
  const real = row.league ? lg.leagueSizeFor(row.league, calYear, true) : null;
  if (row.sizeVerified ? row.leagueSize !== real : real !== null) { bad.size += 1; if (firstBad.length < 6) firstBad.push(`${row.league} ${calYear}: size ${row.leagueSize}, verified ${real}`); }
  return row;
}
const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8], CAREERS_PER_TIER = 120, SEASONS = 8;
const stat = {};
const bump = (t, k) => { stat[t] ??= { seasons: 0, title: 0, promo: 0, sack: 0 }; stat[t][k] += 1; };
for (const seed of SEEDS) {
  seedRandom(0x1029a + seed * 7919);
  for (const tier of [1, 2, 3, 4]) {
    const pool = FB.filter(c => c.tier === tier);
    for (let k = 0; k < CAREERS_PER_TIER; k++) {
      const lastYear = k % 4 === 0 ? 1996 : 2030;
      let s = dugout(pool[k % pool.length].name, tier, lastYear);
      let want = expectedLeague(s.managerState.club);
      let placed = false;
      for (let y = 0; y < SEASONS; y++) {
        if (s.managerState.unemployed) {
          const offer = (s.managerState.offers ?? [])[0];
          if (offer) {
            want = jobLeague(s, offer);
            s = e.acceptManagerOffer(s, 0);
            cover.accepted += 1;
            if (want !== offer.league) cover.relabelled += 1;
            placed = false;
          } else { s = e.advanceManagerSeason(s, FB); placed = false; continue; }
        }
        const t0 = s.managerState.clubTier, c0 = s.managerState.club;
        const st = settle(c0, want, lastYear + s.managerState.season + 1, placed);
        /* an unplaced season is played in no league; the job's league is
           kept, unprinted, as the engine keeps it */
        if (!st.unplaced) want = st.want;
        s = e.advanceManagerSeason(s, FB);
        const row = checkSeason(s, c0, st.want, lastYear, st.unplaced);
        const ms = s.managerState;
        placed = !ms.unemployed && ms.club === c0 && typeof row.league === 'string' && row.lineupUnknown !== true;
        /* where he plays next: a poaching club's own league, or the table's
           move (Premier League bottom three down, Championship top two up) */
        if (!ms.unemployed) {
          if (ms.club !== c0) { want = poachLeague(ms.club, lastYear + ms.season + 1); placed = false; }
          else if (st.unplaced) { /* a season in no league moves nothing */ }
          else if (lastYear + ms.season < MOVES_FROM) { /* before 2004/05 the pair does not move */ }
          else if (want === 'Premier League' && row.playerPos >= row.leagueSize - 2) { want = 'Championship'; cover.down += 1; }
          else if (want === 'Championship' && row.playerPos <= 2) { want = 'Premier League'; cover.up += 1; }
        }
        const tk = Math.max(1, Math.min(5, t0));
        bump(tk, 'seasons');
        if (row.playerPos === 1) bump(tk, 'title');
        if (ms.unemployed) bump(tk, 'sack');
        else if (ms.club === c0 && ms.clubTier === t0 - 1) bump(tk, 'promo');
      }
    }
  }
}
console.log(`   ${cover.seasons} seasons: ${cover.home} at a club of the list, ${cover.market} at a market club, ${cover.verified} with a verified size, ${cover.thin} with no rival to name`);
console.log(`   ${cover.named} named rows checked, ${cover.unnamed} unnamed; wrong league ${bad.league}, himself twice ${bad.self}, "of N" wrong ${bad.ofN}, size wrong ${bad.size}`);
console.log(`   ${cover.home} seasons at a club of the list, ${cover.market} at a market club outside it`);
console.log(`   ${cover.accepted} market jobs taken (${cover.relabelled} in a league the list spells another way), ${cover.up} promotions to the Premier League, ${cover.down} relegations to the Championship, ${cover.zones} seasons in a named league of unknown size (${cover.bigUnverified} knowing 20 or more clubs)`);
console.log(`   table not his league ${bad.table}, known clubs wrong ${bad.known}, a position in a league of unknown size ${bad.zone}, promotion or relegation words wrong ${bad.words}`);
console.log(`   ${cover.past} seasons before 2026-27 in a league the list knows clubs of, ${cover.early} finishes in the English pair's move zones before 2004/05; a past season naming a rival or misflagged ${bad.past}`);
console.log(`   ${cover.pastHeld} past seasons in a league the game holds, ${cover.pastMoves} of them with a move line; naming a league ${bad.pastLeague}; ${cover.headed} later seasons, header without his league ${bad.header}`);
console.log(`   Round 1037: ${cover.pastLedger} past seasons in a league the ledgers hold, headed wrong ${bad.pastLedger}; ${cover.yearJobs} jobs placed in the league their club was in that year; ${cover.unplaced} past seasons unplaced (the ledgers put the club in none of the six while its label names one)`);
for (const f of firstBad.slice(0, 6)) console.log(`     e.g. ${f}`);
/* coverage floors, about half of what this branch measured (29311 seasons:
   28814 at a club of the list, 497 at a market club, 9471 with a verified
   size, 8340 with no rival to name, 63756 named rows; after the review
   fixes 29518, 28951, 567, 14562 with the Championship verified, 8214 and
   63145); a run that skips a path proves nothing about it */
/* the review fixes' floors, about half of the fixed branch's 1478 market
   jobs, 1195 relabelled, 635 promotions to the Premier League, 164
   relegations to the Championship, 14956 seasons of unknown size and 1088
   of them knowing 20 or more clubs (the only fields where an off by one in
   the size can show) */
/* the closing check's floors, about half of its 6267 seasons before 2026-27
   in a league the list knows clubs of and 253 finishes in the English
   pair's move zones before 2004/05 (the quarter of careers that retire in 1996) */
const PAST_FLOOR = 3000, EARLY_FLOOR = 120;
/* Round 1100: the career club pool grew from 241 to 460 clubs (every Club
   Manager league but three held second flights), so a job at a club outside
   the list is rare now: 101 seasons at a market club where the tree before
   it read 567 (the same run with main's pool file put back passes the old
   floor of 250, so the pool moved it and nothing else). About half of 101.
   When Serie B, Ligue 2 and the Segunda Division are released every job
   market club is a list club: this floor then reads 0 and the path is gone. */
const MARKET_FLOOR = 50;
const PAST_LEDGER_FLOOR = 1900, YEAR_JOBS_FLOOR = 100;
if (cover.home < 14000 || cover.market < MARKET_FLOOR || cover.verified < 4500 || cover.thin < 4000 || cover.named < 30000
  /* Round 1037: bigUnverified (fields of unknown size knowing 20 or more
     clubs) came from the Championship before 2004, which the league ledgers
     now size (24), so the loop reads 0 where its base read 1262; the size
     rule is held by the probe after f2 instead */
  || cover.accepted < 700 || cover.relabelled < 500 || cover.up < 300 || cover.down < 80 || cover.zones < 7000
  || cover.past < PAST_FLOOR || cover.early < EARLY_FLOOR
  || cover.pastHeld < 3500 || cover.pastMoves < 25 || cover.headed < 11000) {
  fail(`a path went unexercised: ${JSON.stringify(cover)}`);
}
if (bad.league) fail(`${bad.league} named rows are not clubs of the manager's league`);
if (bad.self) fail(`${bad.self} tables name the manager's own club as a rival`);
if (bad.ofN) fail(`${bad.ofN} result lines print "of N" when the size is not verified, or leave it out when it is`);
if (bad.size) fail(`${bad.size} tables disagree with the verified league size, or with the field of unknown size`);
if (bad.table) fail(`${bad.table} seasons played in a league other than his own`);
if (bad.known) fail(`${bad.known} tables name fewer known clubs than fit`);
if (bad.zone) fail(`${bad.zone} result lines print a position or points in a league of unknown size`);
if (bad.past) fail(`${bad.past} seasons before 2026-27 name a rival the list cannot place in that year, or flag the lineup wrongly`);
if (bad.words) fail(`${bad.words} result lines say promoted or relegated where the club does not change league, or stay quiet where it does`);
if (bad.pastLeague) fail(`${bad.pastLeague} seasons before 2026-27 name a league over the table, under it or in the season line`);
if (bad.header) fail(`${bad.header} seasons from 2026-27 on lost their league from the table's header`);
if (bad.pastLedger) fail(`${bad.pastLedger} seasons before 2026-27 in a league the ledgers hold are not headed by the name it carried that season`);
/* Round 1037 floors, about half of what it measured (see the header) */
if (cover.pastLedger < PAST_LEDGER_FLOOR || cover.yearJobs < YEAR_JOBS_FLOOR) fail(`the ledger seasons went unexercised: ${cover.pastLedger} past ledger seasons, ${cover.yearJobs} jobs placed by year`);
/* f2) the lead's decision on F14, inside the English pair's move window:
   careers that retire in 2010 at Premier League and Championship clubs play
   2011 to 2018, where the club still moves between the two, and no season
   of it may name either. Its own careers and seed, so the rates and floors
   above do not move; every check of checkSeason runs on each season. */
{
  const before = { ...bad };
  let seasons = 0, moves = 0, said = 0;
  seedRandom(0x1029f14);
  const pair = FB.filter(c => (c.league === 'Premier League' || c.league === 'Championship') && c.tier <= 3);
  for (let k = 0; k < 160; k++) {
    const club = pair[k % pair.length];
    let s = dugout(club.name, club.tier, 2010);
    let want = expectedLeague(club.name);
    let placed = false;
    for (let y = 0; y < 8 && !s.managerState.unemployed; y++) {
      const c0 = s.managerState.club;
      const st = settle(c0, want, 2010 + s.managerState.season + 1, placed);
      if (!st.unplaced) want = st.want;
      s = e.advanceManagerSeason(s, FB);
      const row = checkSeason(s, c0, st.want, 2010, st.unplaced);
      seasons += 1;
      if (/Promoted with|Relegated/.test(row.result)) said += 1;
      const ms = s.managerState;
      if (ms.unemployed) break;
      placed = ms.club === c0 && typeof row.league === 'string' && row.lineupUnknown !== true;
      if (ms.club !== c0) { want = poachLeague(ms.club, 2010 + ms.season + 1); placed = false; }
      else if (st.unplaced) { /* a season in no league moves nothing */ }
      else if (want === 'Premier League' && row.playerPos >= row.leagueSize - 2) { want = 'Championship'; moves += 1; }
      else if (want === 'Championship' && row.playerPos <= 2) { want = 'Premier League'; moves += 1; }
    }
  }
  const grew = Object.keys(bad).filter(k => bad[k] > before[k]).map(k => `${k} +${bad[k] - before[k]}`);
  console.log(`   2011 to 2018 in the English pair: ${seasons} seasons, ${moves} moves between the two, ${said} lines saying promoted or relegated${grew.length ? '; new failures ' + grew.join(', ') : ''}`);
  for (const f of firstBad.slice(0, 6)) if (grew.length) console.log(`     e.g. ${f}`);
  /* floors about half of the 893 seasons and 52 moves measured */
  if (seasons < 450 || moves < 25) fail(`the English pair window went unexercised: ${seasons} seasons, ${moves} moves`);
  if (grew.length) fail(`seasons of 2011 to 2018 in the English pair broke a check: ${grew.join(', ')}`);
}
/* Round 1037: the size rule for a field of unknown size that knows 20 or
   more clubs (it is 20, or one more than it knows), which the loop above no
   longer reaches: a league no table sizes, with 24 known clubs, from 2026-27
   and before it. The size control turns this red. */
{
  const big = [...FB, ...Array.from({ length: 24 }, (_, i) => ({ id: `probe-${i}`, name: `Synth${i}`, country: 'Sweden', tier: 3, color: '#000', league: 'Probe League' }))];
  for (const year of [2012, 2030]) {
    const f = lg.managerLeagueField({ clubs: big, club: 'Synth0', year }, () => 0.5);
    const want = { size: 24, named: year < LIST_SEASON ? 0 : 23 };
    if (f.size !== want.size || f.sizeVerified || f.named.length !== want.named) fail(`a field of unknown size knowing 24 clubs (${year}): size ${f.size}, verified ${f.sizeVerified}, named ${f.named.length}; want size ${want.size}, named ${want.named}`);
    const g = lg.managerLeagueField({ clubs: big, club: 'Outsider Town', league: 'Probe League', year }, () => 0.5);
    if (g.size !== 25) fail(`a market club outside the list in a league of 24 known clubs (${year}): size ${g.size}, want 25`);
  }
  console.log('   the field of unknown size knowing 24 clubs: 24 with his own, 25 for a club outside the list, before and after 2026-27');
}

/* c) the three cases the round was written for, each six seasons */
const probe = (club, tier, league, check) => {
  seedRandom(0x1029);
  let s = dugout(club, tier, 2030, league);
  const seen = new Set();
  for (let y = 0; y < 6; y++) {
    if (s.managerState.unemployed) break;
    s = e.advanceManagerSeason(s, FB);
    const row = s.managerState.seasonResults[s.managerState.seasonResults.length - 1];
    for (const r of row.table ?? []) if (!r.you && !r.unnamed) seen.add(r.club);
    check(row);
  }
  return [...seen];
};
{
  const arsenal = probe('Arsenal', 1, undefined, row => {
    if (row.league !== 'Premier League' || !row.sizeVerified || row.leagueSize !== 20) fail(`Arsenal played in ${row.league} of ${row.leagueSize}`);
  });
  const stray = arsenal.filter(n => byName.get(n)?.league !== 'Premier League');
  console.log(`   Arsenal met ${arsenal.length} named clubs, ${stray.length} from outside the Premier League${stray.length ? ': ' + stray.slice(0, 4).join(', ') : ''}`);
  if (!arsenal.length || stray.length) fail('an Arsenal table names a club from outside the Premier League');
  const city = probe('Manchester City', 1, 'Premier League', () => {});
  console.log(`   a Manchester City job met ${city.length} named clubs; Man City among them: ${city.includes('Man City')}`);
  if (!city.length || city.includes('Man City')) fail('a Manchester City job meets Man City in its own table');
  const salzburg = probe('RB Salzburg', 3, 'Austrian Bundesliga', row => {
    if (row.league !== 'Austrian Bundesliga') fail(`an RB Salzburg job played in ${row.league}`);
  });
  console.log(`   an RB Salzburg job named ${salzburg.length ? salzburg.join(', ') : 'nobody'}`);
  if (salzburg.includes('Red Bull Salzburg')) fail('an RB Salzburg job meets Red Bull Salzburg in its own table');
  /* a club nothing names (no list row, no job league): no league, nobody
     named, and no "of N", as the field's 20 is the dugout's own */
  const nowhere = probe('Unknown FC', 3, undefined, row => {
    if (row.league || row.knownRivals !== 0 || / of \d+/.test(row.result)) fail(`a club nothing names played ${row.league}: "${row.result.slice(0, 50)}"`);
  });
  console.log(`   a club nothing names met ${nowhere.length} named clubs`);
  if (nowhere.length) fail('a club nothing names met named rivals');
  /* the stored table is a five row window, so a club can hide below it:
     ask the field itself, whole, for the same three jobs */
  seedRandom(0x1029);
  const field = (club, league) => lg.managerLeagueField({ clubs: FB, club, league, year: 2030 }, Math.random);
  const fa = field('Arsenal'), fc = field('Manchester City', 'Premier League'), fs2 = field('RB Salzburg', 'Austrian Bundesliga');
  console.log(`   whole fields: Arsenal ${fa.named.length} named of ${fa.size}, Manchester City ${fc.named.length} of ${fc.size}, RB Salzburg ${fs2.named.length} of ${fs2.size}`);
  if (fa.named.length !== 19 || fa.named.some(n => byName.get(n)?.league !== 'Premier League')) fail('the Arsenal field is not 19 Premier League clubs');
  /* 22 Premier League clubs are known and 19 fit, so draw ten fields */
  const cityDraws = Array.from({ length: 10 }, () => field('Manchester City', 'Premier League'));
  const withCity = cityDraws.filter(f => f.named.includes('Man City')).length;
  if (fc.named.length !== 19 || withCity) fail(`the Manchester City field holds ${fc.named.length} clubs, and Man City in ${withCity} of 10 draws`);
  if (fs2.named.includes('Red Bull Salzburg')) fail('the RB Salzburg field names Red Bull Salzburg');
}
/* f) jobs taken through acceptManagerOffer itself, the way the page takes
   them, each played one season: the league on the card is the table's */
{
  const SUPER = 'S' + String.fromCharCode(252) + 'per Lig';
  const jobs = [
    ['Nacional', 'Portugal', 'Primeira Liga', 'Primeira Liga'],
    ['Kasimpasa', 'Turkey', SUPER, 'Super Lig'],
    ['West Ham United', 'England', 'EFL Championship', 'Championship'],
    ['Eintracht Braunschweig', 'Germany', '2. Bundesliga', '2. Bundesliga'],
  ];
  for (const [club, country, league, want] of jobs) {
    seedRandom(0x1029f);
    let s = dugout('Everton', 2, 2030);
    s = { ...s, managerState: { ...s.managerState, unemployed: true,
      offers: [{ club, country, tier: 4, league, brief: 'Keep them up.', reason: 'They called.', budget: 10 }] } };
    s = e.acceptManagerOffer(s, 0);
    s = e.advanceManagerSeason(s, FB);
    const row = s.managerState.seasonResults[s.managerState.seasonResults.length - 1];
    const stray = (row.table ?? []).filter(r => !r.you && !r.unnamed && byName.get(r.club)?.league !== want).map(r => r.club);
    console.log(`   took ${club} (${league}): table ${row.league}, ${row.knownRivals} known rivals${stray.length ? ', strays ' + stray.join(', ') : ''}`);
    if (row.league !== want || stray.length) fail(`a ${club} job from the market played ${row.league} (want ${want})`);
  }
  /* a save from before the round: a market job, no league saved. The
     market (loaded in section 2) gives it back by the club's exact name. */
  const lost = jm.allOfferClubs().find(o => !FB.some(c => keyOf(c.name) === keyOf(o.name))
    && jm.allOfferClubs().filter(x => x.name === o.name).length === 1);
  seedRandom(0x1029e);
  let s = dugout(lost.name, 4, 2030);
  s = { ...s, managerState: { ...s.managerState, seasonResults: [{ year: 0, club: lost.name, tier: 4, result: `Took the ${lost.name} job. Fine.`, trophy: false }] } };
  s = e.advanceManagerSeason(s, FB);
  const row = s.managerState.seasonResults[s.managerState.seasonResults.length - 1];
  const want = expectedLeague(lost.name, lost.league);
  console.log(`   an old save at ${lost.name} (${lost.league}) with no league saved plays ${row.league ?? 'nothing named'}`);
  if (row.league !== want || s.managerState.league !== want) fail(`an old save at ${lost.name} lost its league (${row.league}, want ${want})`);
}
/* d) rates per tier against main's band (numbers in the header) */
{
  const MAIN = {
    '1.title': [0.1050, 0.0119], '1.sack': [0.1147, 0.0109],
    '2.title': [0.0942, 0.0111], '2.promo': [0.1657, 0.0133], '2.sack': [0.1197, 0.0141],
    '3.title': [0.0843, 0.0093], '3.promo': [0.1516, 0.0123], '3.sack': [0.0637, 0.0075],
    '4.title': [0.0729, 0.0079], '4.promo': [0.1317, 0.0088],
  };
  const out = [];
  for (const [key, [mean, sd]] of Object.entries(MAIN)) {
    const [t, k] = key.split('.');
    const v = stat[t] ? stat[t][k] / stat[t].seasons : NaN;
    const lo = mean - 1.5 * sd, hi = mean + 1.5 * sd;
    out.push(`t${key} ${v.toFixed(4)}`);
    if (!(v >= lo && v <= hi)) fail(`tier ${t} ${k} rate ${v.toFixed(4)} left main's band ${lo.toFixed(4)} to ${hi.toFixed(4)}`);
  }
  console.log(`   rates: ${out.join(', ')}`);
}
/* the dash rule on this round's own lines */
{
  const dash = new RegExp(`[${String.fromCharCode(0x2013, 0x2014)}]`);
  for (const f of ['src/lib/soccerCareerEngine.ts', 'src/lib/soccerCareerLeague.ts', 'src/pages/SoccerCareer.tsx']) {
    const lines = fs.readFileSync(path.join(ROOT, f), 'utf8').split('\n');
    let inRound = false;
    lines.forEach((l, i) => {
      if (/Round 1029/.test(l)) inRound = true;
      else if (/Round \d+/.test(l)) inRound = false;
      if (inRound && dash.test(l)) fail(`${f}:${i + 1} has a dash`);
    });
  }
}
console.log(failures===0 ? '\nALL MANAGER CAREER CHECKS PASSED' : `\n${failures} FAILURES`);
process.exit(failures===0?0:1);
