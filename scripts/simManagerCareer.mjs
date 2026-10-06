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
 *   Their controls: pastnames (a past season names the 2026-27 list again)
 *   and era2004 (the pair moves in any year); results in the next lines.
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
  noaccept: { file: 'soccerCareerEngine.ts', from: '  ms.league = offer.league;', to: '' },
  nofold: { file: 'soccerCareerLeague.ts', from: 'const f = foldName(label);', to: 'const f = label.toLowerCase().trim();' },
  nomarket: { file: 'soccerCareerEngine.ts', from: 'if (marketJob && MARKET) {', to: 'if (false) {' },
  /* the closing check's controls: a past season names the 2026-27 list again; the English pair moves before the Championship had its name */
  pastnames: { file: 'soccerCareerLeague.ts', from: 'named: lineupUnknown ? [] : names.slice(0, size - 1)', to: 'named: names.slice(0, size - 1)' },
  era2004: { file: 'soccerCareerLeague.ts', from: 'if (league === null || year < DIVISION_FROM) return null;', to: 'if (league === null) return null;' },
  poolyear: { file: null }, // the pool header fence below reads a pool that moved on to 2027-28
  wording: { file: 'soccerCareerEngine.ts', from: '` ${ms.club} move up to Tier ${ms.clubTier}.`', to: '` Promoted with ${ms.club} to Tier ${ms.clubTier}!`' },
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
  'mls eastern conference': 'MLS', 'mls western conference': 'MLS' };
const listLabel = lab => { const f = foldName(lab); const w = ALIAS[f]; return FB.find(c => (w ? c.league === w : foldName(c.league) === f))?.league ?? null; };
/** The league a job's first table must be: the league the job came with, in
 *  the list's spelling (the card showed it), else his club found in the
 *  list by name or by the shared spelling. */
function expectedLeague(club, jobLeague) {
  if (jobLeague) return listLabel(jobLeague) ?? jobLeague;
  return FB.find(c => keyOf(c.name) === keyOf(club))?.league ?? null;
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
  accepted: 0, relabelled: 0, up: 0, down: 0, zones: 0, bigUnverified: 0, past: 0, early: 0 };
const bad = { league: 0, self: 0, ofN: 0, size: 0, table: 0, known: 0, zone: 0, words: 0, past: 0 };
const firstBad = [];
const note = s => { if (firstBad.length < 6) firstBad.push(s); };
/** Every check of a), b) and e) on one employed season. `want` is the league
 *  this harness tracked for him: his job's, moved by the table's own rule. */
function checkSeason(s, club0, want, lastYear) {
  const ms = s.managerState;
  const row = ms.seasonResults[ms.seasonResults.length - 1];
  const calYear = lastYear + ms.season;
  /* the table is the league he is in, on every season, named or not */
  if ((row.league ?? null) !== want) { bad.table += 1; note(`${club0} S${ms.season}: table ${row.league ?? 'none'}, his league ${want ?? 'none'}`); }
  /* the field holds every club it knows of that league when they fit, and
     a field of unknown size is 20 or one more than it knows */
  const K = knownIn(want, club0, calYear);
  /* a season before the list's own (2026-27) names nobody, and says so
     exactly when the list does know clubs of that league */
  const past = calYear < LIST_SEASON;
  if (row.knownRivals !== (past ? 0 : Math.min(K, row.leagueSize - 1))) { bad.known += 1; note(`${want} ${calYear}: ${row.knownRivals} known, the list has ${K}`); }
  if (!!row.lineupUnknown !== (past && K > 0)) { bad.past += 1; note(`${want} ${calYear}: lineupUnknown ${row.lineupUnknown}, the list has ${K}`); }
  if (past && K > 0) cover.past += 1;
  if (!row.sizeVerified && row.leagueSize !== Math.max(20, K + 1)) { bad.size += 1; note(`${want} ${calYear}: unverified size ${row.leagueSize} for ${K} known`); }
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
  if (row.league && promo && !(moves && row.league === 'Championship' && / to the Premier League!/.test(row.result))) { bad.words += 1; note(`[${row.league} ${calYear}] ${row.result.slice(0, 80)}`); }
  if (row.league && rele && !(moves && row.league === 'Premier League' && /Relegated to the Championship/.test(row.result))) { bad.words += 1; note(`[${row.league} ${calYear}] ${row.result.slice(0, 80)}`); }
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
    if (past) { bad.past += 1; note(`${club0} ${calYear}: names ${r.club}, a season before the list's own`); }
    const got = byName.get(r.club)?.league ?? '(not a club of the list)';
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
      for (let y = 0; y < SEASONS; y++) {
        if (s.managerState.unemployed) {
          const offer = (s.managerState.offers ?? [])[0];
          if (offer) {
            s = e.acceptManagerOffer(s, 0);
            want = expectedLeague(offer.club, offer.league);
            cover.accepted += 1;
            if (want !== offer.league) cover.relabelled += 1;
          } else { s = e.advanceManagerSeason(s, FB); continue; }
        }
        const t0 = s.managerState.clubTier, c0 = s.managerState.club;
        s = e.advanceManagerSeason(s, FB);
        const row = checkSeason(s, c0, want, lastYear);
        const ms = s.managerState;
        /* where he plays next: a poaching club's own league, or the table's
           move (Premier League bottom three down, Championship top two up) */
        if (!ms.unemployed) {
          if (ms.club !== c0) want = FB.find(c => c.name === ms.club)?.league ?? null;
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
console.log(`   ${cover.accepted} market jobs taken (${cover.relabelled} in a league the list spells another way), ${cover.up} promotions to the Premier League, ${cover.down} relegations to the Championship, ${cover.zones} seasons in a named league of unknown size (${cover.bigUnverified} knowing 20 or more clubs)`);
console.log(`   table not his league ${bad.table}, known clubs wrong ${bad.known}, a position in a league of unknown size ${bad.zone}, promotion or relegation words wrong ${bad.words}`);
console.log(`   ${cover.past} seasons before 2026-27 in a league the list knows clubs of, ${cover.early} finishes in the English pair's move zones before 2004/05; a past season naming a rival or misflagged ${bad.past}`);
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
if (cover.home < 14000 || cover.market < 250 || cover.verified < 4500 || cover.thin < 4000 || cover.named < 30000
  || cover.accepted < 700 || cover.relabelled < 500 || cover.up < 300 || cover.down < 80 || cover.zones < 7000 || cover.bigUnverified < 500
  || cover.past < PAST_FLOOR || cover.early < EARLY_FLOOR) {
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
