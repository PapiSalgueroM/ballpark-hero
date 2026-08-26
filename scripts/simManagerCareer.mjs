/**
 * Round 111 harness: does getting sacked actually cost you anything?
 * Before this, being sacked hired you again on the very same line, at a
 * random club, instantly. A sack with no consequence makes the whole job
 * free. This measures the new behaviour over many simulated manager careers.
 * Run: node scripts/simManagerCareer.mjs
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
fs.writeFileSync('/tmp/mcEntry.mjs', `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
export const e = await import('${ROOT}/src/lib/soccerCareerEngine.ts');
export const cm = await import('${ROOT}/src/lib/clubManager.ts');
`);
execSync(`${ROOT}/node_modules/.bin/esbuild /tmp/mcEntry.mjs --bundle --format=esm --platform=node --outfile=/tmp/mc.mjs --log-level=error`, { stdio:'inherit' });
const { e, cm } = await import('/tmp/mc.mjs');
let failures = 0; const fail = s => { failures += 1; console.error('  FAIL: ' + s); };

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
console.log(failures===0 ? '\nALL MANAGER CAREER CHECKS PASSED' : `\n${failures} FAILURES`);
process.exit(failures===0?0:1);
