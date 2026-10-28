import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {bundleCareerSources,poolInputs,POOL_LEAGUE_ROWS,NAME_ALIASES,slugOf} from '../lib/careerClubPool.mjs';
assert(process.env.CI,'Remote CI only');
const ROOT=process.cwd(),OUT=path.resolve(process.env.SC_SERIEB_BASELINE_OUT||'serieb-baseline-artifacts');
const BASE=process.env.SC_SERIEB_SOURCE_BASE;
assert(typeof BASE==='string'&&/^[0-9a-f]{40}$/.test(BASE),'Workflow must bind the exact source-vetted L2 parent');
const NOW=1791586800000,sha=b=>createHash('sha256').update(b).digest('hex');
const PRODUCT={
 'src/lib/clubManager.ts':'a4c8260bced0db3582437461afe6e6616f465e0b0b1ec887ba301757364681dd',
 'scripts/data/soccerCareerFacts.json':'352d9e65f0661c2943ca1bf5b5129e7cb405c3d8c4aa6dbe3bad6dad60f1349a',
 'scripts/lib/careerClubPool.mjs':'b2e24ba13301ec48c0119e69bf614bbc0f0e7f344103a5f1baddaffdfe325190',
 'src/data/soccerCareerClubPool.ts':'4fca8dcc0d83efaa0d79d58833a03d3f2787cd44fb5ea93a90c3cf207ef5efd2',
 'src/data/leagueFormat.ts':'dc73e10402d270a6ed01c0fab4f8165d305f336a55a238d863c9b310f7f8ab4d',
 'src/lib/soccerCareerLeague.ts':'0519defdf1ac93f69b83f14b11d36f1b9d2544f7bb6c60ba97c4539710cd9b52',
 'src/lib/soccerCareerDerby.ts':'c6a6859a5fd24f18d6a2e05b258ad9dddbc271a81d42c1767560d4a8cee8d906',
 'src/lib/soccerCareerEngine.ts':'bc616834e0a5399fcd3ec55d519ead1b194281a9801e3da8a43bf421cd5153b2',
 'src/lib/soccerCareerCoachingStart.ts':'7720957192ccb8a0de5b1fef64817e409ee30d7ce7dd035425e598d0fd903aff'
};
const RETAINED={
 'qa/sc-serieb-release-v1/original/soccerCareerClubPool.ts':'4fca8dcc0d83efaa0d79d58833a03d3f2787cd44fb5ea93a90c3cf207ef5efd2',
 'qa/sc-serieb-release-v1/retained/fixtures.json':'3ba6f1cbc7ddf56ec2938e3822b83b4920128cd1c8c9736eef46b0608ede4fa1',
 'qa/sc-serieb-release-v1/retained/old-generic.save.txt':'81777bcd5a7631c70edf52c626484c00e0a687ab2fd9a7fae7f3c3a2ade0da25'
};
const EXPECTED=['Cremonese','Verona','Pisa','Avellino','Carrarese','Catanzaro','Cesena','Empoli','Entella','Juve Stabia','Mantova','Modena','Padova','Palermo','Sampdoria','Sudtirol','Vicenza','Arezzo','Benevento','Ascoli'];
const LABEL='Serie B',sort=a=>[...a].sort(),copy=x=>structuredClone(x);
const names=[
 'complete initial-contract pool and since boundary',
 'complete modern finish ladder',
 'playing table size points and cadence boundary',
 'historic default manager entry excludes the appended20',
 'historic coursework read and commit exclude the appended20',
 'existing190 hand287 generated23 ladders and L2 eligibility remain frozen',
 'retained raw and genuine pending offer survive codec and acceptance'
];
const markers=['MISSING_SERIEB_PLAYING_POOL','MISSING_SERIEB_LADDER','MISSING_SERIEB_TABLE_GATE','MISSING_SERIEB_RETIREMENT_YEAR_GATE','MISSING_SERIEB_COURSEWORK_YEAR_GATE',null,null];
const sourceFiles=[...Object.keys(PRODUCT),'src/lib/careerEras.ts','src/lib/soccerCareerSave.ts','src/lib/soccerCareerLeagueWorld.ts',...Object.keys(RETAINED)];
const sourceMap=()=>Object.fromEntries(sourceFiles.map(file=>[file,sha(fs.readFileSync(path.join(ROOT,file)))]));
fs.mkdirSync(OUT,{recursive:true});
const json=(name,value)=>fs.writeFileSync(path.join(OUT,name+'.json'),JSON.stringify(value,null,2));
const report={status:'STARTED',sourceBase:BASE,workingProductManifest:'02da0797213ad87d8bf9122099e2ff910aa5f5c09fcf0237736df56043392ab0',sourceBefore:sourceMap(),cases:[],methodErrors:[],scope:'Actual source-vetted L2 APIs, global qualification pending; no product/data writes. All20 lower-world transfer destinations already exist. Module initialization is excluded and unmeasured; fixture constructor and action tapes are separate.'};
const flush=()=>json('report',report);
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'serieb-baseline-'));
globalThis.localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{},clear:()=>{}};
function taped(seed,action,forced=[]){
 const real=Math.random,now=Date.now,draws=[];let n=seed>>>0,at=0;
 const next=()=>{if(at<forced.length)return forced[at++];n+=0x6D2B79F5;let t=n;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};
 Math.random=()=>{const v=next();draws.push(v);return v;};Date.now=()=>NOW;
 try{const value=action();return{value,draws,next:next()};}finally{Math.random=real;Date.now=now;}
}
async function test(index,action){
 const row={index,name:names[index],marker:markers[index],status:'STARTED'};report.cases.push(row);flush();
 try{await action(row);row.status='passed';}
 catch(error){row.status=error?.name==='AssertionError'?'failed':'method-error';row.error={name:error?.name,message:error?.message,stack:error?.stack};if(row.status==='method-error')report.methodErrors.push(row.error);}
 json('case-'+(index+1),row);flush();
}
try{
 for(const [file,hash]of Object.entries({...PRODUCT,...RETAINED}))assert.equal(report.sourceBefore[file],hash,'Immutable baseline source '+file);
 const mod=await bundleCareerSources({root:ROOT,tmpDir:tmp,extra:{pool:'data/soccerCareerClubPool.ts',oldPool:'../qa/sc-serieb-release-v1/original/soccerCareerClubPool.ts',league:'lib/soccerCareerLeague.ts',format:'data/leagueFormat.ts',derby:'lib/soccerCareerDerby.ts',world:'lib/soccerCareerLeagueWorld.ts',coaching:'lib/soccerCareerCoachingStart.ts'}});
 const E=mod.engine,S=mod.save,C=mod.coaching,OP=mod.oldPool,inputs=poolInputs(mod);
 for(const [name,value]of Object.entries({init:E.initCareer,youth:E.advanceYouthYear,repair:E.repairCareer,retire:E.manualRetire,accept:E.acceptOffer,entry:E.choosePostRetirement,eligible:E.managerEntryClubInYear,choices:C.coachingStartChoices,commit:C.startCoachingAppointment,parse:S.parseSoccerCareerSave,serialize:S.serializeSoccerCareerSave}))assert.equal(typeof value,'function','Existing API '+name);
 const cm=mod.cm.REAL_LEAGUES.find(row=>row.id==='serieb'),mapping=POOL_LEAGUE_ROWS.find(row=>row.id==='serieb');
 assert(cm&&mapping&&mapping.label===LABEL&&mapping.top===false&&mapping.country==='Italy','Existing actual CM SerieB mapping');
 const careerName=n=>NAME_ALIASES[n]??inputs.fold(n),handNames=new Set(E.HAND_CLUBS.map(c=>c.name));
 assert.deepEqual(sort(cm.clubs.map(careerName)),sort(EXPECTED),'Existing verified20 CM identities');
 assert(cm.clubs.every(name=>!handNames.has(careerName(name))),'No hand-club overlap');
 const added=cm.clubs.map(n=>({id:'cm-'+slugOf(careerName(n)),name:careerName(n),country:mapping.country,tier:4,color:inputs.colorOf(n),league:mapping.label}));
 const addedIds=new Set(added.map(c=>c.id)),addedNames=new Set(added.map(c=>c.name));
 assert.equal(addedIds.size,20,'Actual unique mapped20');
 const oldPool=E.FALLBACK_CLUBS.filter(c=>!addedIds.has(c.id)),appended=[...oldPool,...added];
 assert.equal(oldPool.length,477,'Pinned L2 fallback477');
 const l2=OP.CAREER_CLUB_POOL.filter(c=>c.league==='Ligue 2'&&OP.CAREER_POOL_SINCE[c.name]===2026),l2Ids=new Set(l2.map(c=>c.id));
 assert.equal(l2.length,17,'Actual old L2 seventeen retained');
 const fixture=taped(1908,()=>{
  const stats={pace:70,shooting:70,passing:70,dribbling:70,defending:70,physical:70,reflexes:70};
  let state=E.initCareer('SerieB Boundary','France','CM','2000s',stats,70,2008,oldPool,null,80),steps=0;
  while(state.phase==='youth'&&steps++<12)state=E.advanceYouthYear(state,oldPool);
  assert(state.phase==='contract_offer'&&state.pendingOffers?.length,'Actual youth loop reaches genuine offers');
  const offered=E.repairCareer(copy(state));
  state=E.acceptOffer(state,state.pendingOffers[0]);assert.equal(state.phase,'playing','Canonical offer acceptance');
  state=E.repairCareer(state);const playing=copy(state),retired=E.manualRetire(copy(state));
  retired.lifeFlags={...retired.lifeFlags,coachingBadges:3};
  assert(retired.retired&&retired.phase==='retirement_ceremony'&&!retired.managerState&&!retired.postRetirementChoice,'Canonical retired fixture');
  const firstYear=(retired.seasons[retired.seasons.length-1]?.year??2024)+1;assert(firstYear<2026,'Actual earlier-year boundary');
  assert([offered,playing,retired].every(S.isSoccerCareerSave),'Complete official fixture shapes');
  return{offered,playing,retired,firstYear,steps};
 });
 report.fixture={...fixture,appendedDefinitions:added,oldPoolCount:oldPool.length,scope:'Actual constructor/youth/accept/manualRetire. Coursework3 is a labelled test presentation flag. Appended20 map actual CM identities/current colours, including11 neutral greys; no full unheld derive or grey-fence RED.'};json('fixtures',report.fixture);
 await test(0,row=>{
  const modern=mod.eras.adjustClubsForYear(E.FALLBACK_CLUBS,2026).filter(c=>c.league===LABEL),years=[];
  for(let year=1980;year<2026;year++){
   const oldDenied=oldPool.filter(c=>!E.managerEntryClubInYear(c,year)).map(c=>c.id);
   const candidateDenied=appended.filter(c=>!E.managerEntryClubInYear(c,year)).map(c=>c.id);
   const delta=candidateDenied.filter(id=>!oldDenied.includes(id));
   const eraLeak=mod.eras.adjustClubsForYear(E.FALLBACK_CLUBS,year).filter(c=>addedIds.has(c.id)).map(c=>c.id);
   years.push({year,oldDenied,candidateDenied,delta,eraLeak});
  }
  row.observation={modern,years,expectedNames:EXPECTED,oldL2DeniedIds:[...l2Ids],expectedAddedIds:[...addedIds]};
  assert.deepEqual(sort(modern.map(c=>c.name)),sort(EXPECTED),markers[0]);assert.equal(new Set(modern.map(c=>c.id)).size,20,markers[0]);
  for(const at of years){assert.deepEqual(sort(at.oldDenied),sort([...l2Ids]),markers[0]);assert.deepEqual(sort(at.delta),sort([...addedIds]),markers[0]);assert.deepEqual(at.eraLeak,[],markers[0]);}
  for(const club of added)assert.equal(mod.pool.CAREER_POOL_SINCE[club.name],2026,markers[0]);
 });
 await test(1,row=>{
  const value=mod.pool.CAREER_LEAGUE_LADDER[LABEL],groups=Array.isArray(value)?value:[],flat=groups.every(Array.isArray)?groups.flat():[];
  row.observation={groups,flat,expectedNames:EXPECTED};
  assert.deepEqual(sort(flat),sort(EXPECTED),markers[1]);assert.equal(new Set(flat).size,20,markers[1]);
 });
 await test(2,row=>{
  const at=year=>{const size=mod.league.leagueSizeFor(LABEL,year);return{year,size,dugout:mod.league.leagueSizeFor(LABEL,year,true),points:mod.format.leagueFormatFor(LABEL,year),meetings:mod.derby.derbyMeetings(LABEL,year),games:size===null?null:2*(size-1)};};
  row.observation={old:at(2025),modern:at(2026)};
  assert.deepEqual(row.observation,{old:{year:2025,size:null,dugout:null,points:null,meetings:null,games:null},modern:{year:2026,size:20,dugout:20,points:{win:3,draw:1,loss:0},meetings:2,games:38}},markers[2]);
 });
 await test(3,row=>{
  const historical=copy(fixture.value.retired),raw=S.serializeSoccerCareerSave(historical),year=fixture.value.firstYear;
  const oldEligible=oldPool.filter(c=>c.tier>=3&&E.managerEntryClubInYear(c,year)),candidateEligible=appended.filter(c=>c.tier>=3&&E.managerEntryClubInYear(c,year));
  const N=oldEligible.length,u=(N+0.5)/(N+20);
  assert(oldEligible.every(c=>!l2Ids.has(c.id))&&N>0,'OLD helper excludes L2 seventeen before forced draw');
  const reference=taped(4004,()=>E.choosePostRetirement(copy(historical),'manager',oldPool),[u]);
  const actual=taped(4004,()=>E.choosePostRetirement(copy(historical),'manager',appended),[u]);
  assert(reference.value.managerState&&!addedNames.has(reference.value.managerState.club),'Independent old candidate reference healthy');
  row.observation={historical,raw,year,N,u,oldEligibleIds:oldEligible.map(c=>c.id),candidateEligibleIds:candidateEligible.map(c=>c.id),reference,actual,inputRawAfter:S.serializeSoccerCareerSave(historical)};
  assert.equal(row.observation.inputRawAfter,raw,markers[3]);assert.deepEqual(actual,reference,markers[3]);
 });
 await test(4,row=>{
  const historical=copy(fixture.value.retired),nantes=E.HAND_CLUBS.find(c=>c.id==='fb-70'),bounded=[nantes,...added],before=S.serializeSoccerCareerSave(historical);
  assert(nantes?.name==='Nantes'&&E.managerEntryClubInYear(nantes,fixture.value.firstYear),'Actual eligible old hand club');
  const originalRead=taped(5004,()=>C.coachingStartChoices(historical,bounded)),request=originalRead.value.find(q=>addedIds.has(q.clubId));
  assert(request&&request.source===historical,'Genuine OLD pinned-L2 quote tied to SAME historical object');
  const read=taped(5005,()=>C.coachingStartChoices(historical,bounded)),commit=taped(5006,()=>C.startCoachingAppointment(historical,bounded,request));
  row.observation={historical,before,originalRead:{...originalRead,value:originalRead.value.map(({source,...q})=>q)},request:{...request,source:'SAME historical object'},read:{...read,value:read.value.map(({source,...q})=>q)},commit,rawAfter:S.serializeSoccerCareerSave(historical),sameIdentity:commit.value===historical,quoteScope:'Actual current-colour CM fixture. Fixed replay must form an OLD-source quote on this SAME historical object using actual newly selected colours, not fail on obsolete seal/source identity.'};
  assert.equal(row.observation.rawAfter,before,markers[4]);assert(read.value.every(q=>!addedIds.has(q.clubId))&&commit.value===historical&&commit.draws.length===0,markers[4]);
 });
 await test(5,row=>{
  const hand=E.HAND_CLUBS.map(c=>[c.id,c.name,c.country,c.tier,c.color,c.league]),fingerprint=sha(JSON.stringify(hand)).slice(0,16);
  const historical=copy(fixture.value.retired),before=S.serializeSoccerCareerSave(historical);
  const reference=taped(6001,()=>E.choosePostRetirement(copy(historical),'manager',oldPool)),read=taped(6002,()=>C.coachingStartChoices(historical,oldPool));
  const afterRead=taped(6001,()=>E.choosePostRetirement(copy(historical),'manager',oldPool));
  const observedGenerated=E.FALLBACK_CLUBS.slice(190).filter(c=>!addedIds.has(c.id));
  row.observation={handCount:hand.length,fingerprint,oldGenerated:observedGenerated,oldLadders:OP.CAREER_LEAGUE_LADDER,currentLadders:mod.pool.CAREER_LEAGUE_LADDER,oldSince:OP.CAREER_POOL_SINCE,reference,read:{...read,value:read.value.map(({source,...q})=>q)},afterRead,rawBefore:before,rawAfter:S.serializeSoccerCareerSave(historical),oldL2Denied:[...l2Ids]};
  assert.equal(hand.length,190);assert.equal(fingerprint,'e12e673153af2568');assert.deepEqual(E.FALLBACK_CLUBS.slice(0,190),E.HAND_CLUBS);
  assert.equal(OP.CAREER_CLUB_POOL.length,287);assert.equal(Object.keys(OP.CAREER_LEAGUE_LADDER).length,23);assert.deepEqual(observedGenerated,OP.CAREER_CLUB_POOL);
  for(const [name,groups]of Object.entries(OP.CAREER_LEAGUE_LADDER))assert.deepEqual(mod.pool.CAREER_LEAGUE_LADDER[name],groups,'Old ladder '+name);
  for(const [name,year]of Object.entries(OP.CAREER_POOL_SINCE))assert.equal(mod.pool.CAREER_POOL_SINCE[name],year,'Old since '+name);
  for(let year=1980;year<2026;year++)assert.deepEqual(sort(oldPool.filter(c=>!E.managerEntryClubInYear(c,year)).map(c=>c.id)),sort([...l2Ids]),'Old L2 seventeen retained');
  assert.equal(read.draws.length,0);assert(read.value.every(q=>!l2Ids.has(q.clubId)));assert.deepEqual(afterRead,reference);assert.equal(row.observation.rawAfter,before);
 });
 await test(6,row=>{
  const raw=fs.readFileSync('qa/sc-serieb-release-v1/retained/old-generic.save.txt','utf8'),loaded=E.repairCareer(S.parseSoccerCareerSave(raw));
  assert(S.isSoccerCareerSave(loaded)&&loaded.pendingOffers?.length,'Actual retained original raw fixture');
  const offer=copy(loaded.pendingOffers[0]),rawAfter=S.serializeSoccerCareerSave(loaded),accepted=taped(7008,()=>E.acceptOffer(copy(loaded),copy(offer)));
  const saved=JSON.parse(fs.readFileSync('qa/sc-serieb-release-v1/retained/fixtures.json','utf8')),replays=[];
  for(const key of ['playing','retired']){
   const value=copy(saved.value[key]),before=S.serializeSoccerCareerSave(value),restored=E.repairCareer(S.parseSoccerCareerSave(before));
   replays.push({key,before,restored,after:S.serializeSoccerCareerSave(restored)});assert.equal(replays.at(-1).after,before,'Genuine retained '+key+' fixture');
  }
  const genuine=copy(fixture.value.offered),genuineRaw=S.serializeSoccerCareerSave(genuine),genuineLoaded=E.repairCareer(S.parseSoccerCareerSave(genuineRaw));
  const genuineAcceptance=taped(7009,()=>E.acceptOffer(copy(genuineLoaded),copy(genuineLoaded.pendingOffers[0])));
  row.observation={raw,loaded,offer,rawAfter,accepted,replays,genuine,genuineRaw,genuineLoaded,genuineRawAfter:S.serializeSoccerCareerSave(genuineLoaded),genuineAcceptance,scope:'Raw81777 is the original labelled simulation-only French generic offer, unchanged and not regenerated. Playing/retired replays and the new pending initial offer follow actual constructors. A specific genuine Serie B later-move witness remains fixed qualification work; no synthetic Serie B contract is introduced.'};
  assert.equal(rawAfter,raw);assert.deepEqual(loaded.pendingOffers,[offer]);
  assert.deepEqual([accepted.value.currentClub,accepted.value.currentClubCountry,accepted.value.currentLeague,accepted.value.currentClubTier,accepted.value.currentClubColor],[offer.club.name,offer.club.country,offer.club.league,offer.club.tier,offer.club.color]);
  assert.equal(accepted.value.contractYearsLeft,offer.contractYears);assert.equal(accepted.value.phase,'playing');
  assert.equal(row.observation.genuineRawAfter,genuineRaw);assert.deepEqual(genuineLoaded.pendingOffers,genuine.pendingOffers);assert.equal(genuineAcceptance.value.currentClub,genuine.pendingOffers[0].club.name);assert.equal(genuineAcceptance.value.phase,'playing');
 });
 report.sourceAfter=sourceMap();assert.deepEqual(report.sourceAfter,report.sourceBefore,'All source bodies held');
 assert.equal(report.cases.length,7);assert.deepEqual(report.cases.map(c=>c.name),names);
 report.totals={cases:7,passed:report.cases.filter(c=>c.status==='passed').length,failed:report.cases.filter(c=>c.status==='failed').length,methodErrors:report.methodErrors.length};
 report.status=report.methodErrors.length?'METHOD_ERROR':report.totals.failed?'ASSERTION_RED':'PASSED';flush();
 console.log('SERIEB_BASELINE: '+report.totals.cases+' cases; '+report.totals.passed+' passed; '+report.totals.failed+' assertion failures; '+report.totals.methodErrors+' method errors; source held');
 process.exitCode=report.methodErrors.length?2:report.totals.failed?1:0;
}catch(error){report.status='METHOD_ERROR';report.infrastructure={name:error?.name,message:error?.message,stack:error?.stack};flush();console.error('SERIEB_BASELINE_METHOD_ERROR: '+error?.message);process.exitCode=2;}
finally{fs.rmSync(tmp,{recursive:true,force:true});}
