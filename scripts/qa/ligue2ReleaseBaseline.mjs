import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {bundleCareerSources,poolInputs,POOL_LEAGUE_ROWS,NAME_ALIASES,slugOf} from '../lib/careerClubPool.mjs';
assert(process.env.CI,'Remote CI only');
const ROOT=process.cwd(),OUT=path.resolve(process.env.SC_LIGUE2_BASELINE_OUT||'ligue2-baseline-artifacts');
const NOW=1791586800000,sha=b=>createHash('sha256').update(b).digest('hex');
const EXPECTED=['Metz','Nantes','Saint-Etienne','Red Star FC','Reims','Montpellier','Nancy','Annecy','Sochaux','Dijon','Pau','Guingamp','Dunkerque','Grenoble','Rodez','Clermont','Boulogne','Laval'];
const LABEL='Ligue 2',sort=a=>[...a].sort(),copy=x=>structuredClone(x);
const names=[
 'complete initial-contract pool and since boundary',
 'complete modern finish ladder',
 'playing table size points and cadence boundary',
 'historic default manager entry excludes the appended17',
 'historic coursework read and commit exclude the appended17',
 'existing190 hand definitions remain frozen',
 'retained generic lower-club offer survives codec and acceptance'
];
const markers=['MISSING_LIGUE2_PLAYING_POOL','MISSING_LIGUE2_LADDER','MISSING_LIGUE2_TABLE_GATE','MISSING_LIGUE2_RETIREMENT_YEAR_GATE','MISSING_LIGUE2_COURSEWORK_YEAR_GATE',null,null];
const sourceFiles=['src/lib/clubManager.ts','scripts/data/soccerCareerFacts.json','scripts/lib/careerClubPool.mjs','src/data/soccerCareerClubPool.ts','src/data/leagueFormat.ts','src/lib/soccerCareerLeague.ts','src/lib/soccerCareerDerby.ts','src/lib/soccerCareerEngine.ts','src/lib/soccerCareerCoachingStart.ts','src/lib/careerEras.ts','src/lib/soccerCareerSave.ts','src/lib/soccerCareerLeagueWorld.ts','qa/sc-ligue2-release-v1/original/soccerCareerCoachingStart.ts','qa/sc-ligue2-release-v1/original/soccerCareerEngine.ts'];
const sourceMap=()=>Object.fromEntries(sourceFiles.map(file=>[file,sha(fs.readFileSync(path.join(ROOT,file)))]));
fs.mkdirSync(OUT,{recursive:true});
const json=(name,value)=>fs.writeFileSync(path.join(OUT,name+'.json'),JSON.stringify(value,null,2));
const report={status:'STARTED',sourceBefore:sourceMap(),cases:[],methodErrors:[],scope:'Actual SC419 existing APIs. Initial-contract definitions, ladder and verified table are new; all18 lower-club transfer destinations already exist. No product/data writes.'};
const flush=()=>json('report',report);
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'ligue2-baseline-'));
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
 assert.equal(sha(fs.readFileSync('qa/sc-ligue2-release-v1/original/soccerCareerCoachingStart.ts')),'816ddd0c3c0e3e5538ffe0cc08828cb60b10b70a91280fb04a917897891679fc','Immutable old coursework body');
 const mod=await bundleCareerSources({root:ROOT,tmpDir:tmp,extra:{pool:'data/soccerCareerClubPool.ts',league:'lib/soccerCareerLeague.ts',format:'data/leagueFormat.ts',derby:'lib/soccerCareerDerby.ts',world:'lib/soccerCareerLeagueWorld.ts',coaching:'lib/soccerCareerCoachingStart.ts',oldCoaching:'../qa/sc-ligue2-release-v1/original/soccerCareerCoachingStart.ts'}});
 const E=mod.engine,S=mod.save,C=mod.coaching,OC=mod.oldCoaching,inputs=poolInputs(mod);
 for(const [name,value] of Object.entries({initCareer:E.initCareer,advanceYouthYear:E.advanceYouthYear,manualRetire:E.manualRetire,acceptOffer:E.acceptOffer,choosePostRetirement:E.choosePostRetirement,choices:C.coachingStartChoices,commit:C.startCoachingAppointment,oldChoices:OC.coachingStartChoices,parse:S.parseSoccerCareerSave,serialize:S.serializeSoccerCareerSave,project:mod.world.projectLeagueWorldClubs}))assert.equal(typeof value,'function','Existing API '+name);
 assert(Array.isArray(E.HAND_CLUBS)&&Array.isArray(E.FALLBACK_CLUBS),'Existing exported hand and full pool APIs');
 const cm=mod.cm.REAL_LEAGUES.find(row=>row.id==='ligue2'),mapping=POOL_LEAGUE_ROWS.find(row=>row.id==='ligue2');
 assert(cm&&mapping&&mapping.label===LABEL&&mapping.top===false&&mapping.country==='France','Existing actual CM Ligue2 mapping');
 const careerName=n=>NAME_ALIASES[n]??inputs.fold(n),handNames=new Set(E.HAND_CLUBS.map(c=>c.name));
 assert.deepEqual(sort(cm.clubs.map(careerName)),sort(EXPECTED),'Existing verified18 CM identities');
 const added=cm.clubs.filter(n=>!handNames.has(careerName(n))).map(n=>({id:'cm-'+slugOf(careerName(n)),name:careerName(n),country:mapping.country,tier:4,color:inputs.colorOf(n),league:mapping.label}));
 assert.equal(added.length,17,'Actual mapped17, excluding hand Nantes');
 const addedIds=new Set(added.map(c=>c.id)),addedNames=new Set(added.map(c=>c.name));
 const oldPool=E.FALLBACK_CLUBS.filter(c=>!addedIds.has(c.id)),appended=[...oldPool,...added],nantes=E.HAND_CLUBS.find(c=>c.name==='Nantes');
 assert(nantes?.id==='fb-70'&&nantes.tier===4&&nantes.league===LABEL,'Existing actual Nantes hand record');
 const fixture=taped(1908,()=>{
  const stats={pace:70,shooting:70,passing:70,dribbling:70,defending:70,physical:70,reflexes:70};
  let state=E.initCareer('Ligue2 Boundary','France','CM','2000s',stats,70,2008,oldPool,null,80),steps=0;
  while(state.phase==='youth'&&steps++<12)state=E.advanceYouthYear(state,oldPool);
  assert(state.phase==='contract_offer'&&state.pendingOffers?.length,'Canonical old youth loop reaches a real initial offer');
  state=E.acceptOffer(state,state.pendingOffers[0]);assert.equal(state.phase,'playing','Canonical initial offer acceptance');
  state=E.repairCareer(state);const playing=copy(state),retired=E.manualRetire(copy(state));
  retired.lifeFlags={...retired.lifeFlags,coachingBadges:3};
  assert(retired.retired&&retired.phase==='retirement_ceremony'&&!retired.managerState&&!retired.postRetirementChoice,'Canonical retired fixture');
  const firstYear=(retired.seasons[retired.seasons.length-1]?.year??2024)+1;assert(firstYear<2026,'Fixture uses a real earlier-year boundary');
  assert(S.isSoccerCareerSave(playing)&&S.isSoccerCareerSave(retired),'Actual complete official fixture shapes');
  return{playing,retired,firstYear,steps};
 });
 report.fixture={...fixture,appendedDefinitions:added,oldPoolCount:oldPool.length,scope:'Actual old constructor/youth/acceptance/manualRetire path. Coursework3 is a labelled presentation flag, not earned progression. Appended17 map existing CM identities and current neutral colours; no full unheld derive or grey-fence refusal.'};json('fixtures',report.fixture);
 await test(0,row=>{
  const modern=mod.eras.adjustClubsForYear(E.FALLBACK_CLUBS,2026).filter(c=>c.league===LABEL),early=[];
  for(let year=1980;year<2026;year++){const leaked=mod.eras.adjustClubsForYear(E.FALLBACK_CLUBS,year).filter(c=>addedIds.has(c.id)).map(c=>c.id);if(leaked.length)early.push({year,leaked});}
  row.observation={modern,early,expectedNames:EXPECTED};
  assert.deepEqual(sort(modern.map(c=>c.name)),sort(EXPECTED),markers[0]);
  assert.equal(new Set(modern.map(c=>c.id)).size,18,markers[0]);assert.deepEqual(early,[],markers[0]);
  for(const club of added)assert.equal(mod.pool.CAREER_POOL_SINCE[club.name],2026,markers[0]);
 });
 await test(1,row=>{
  const value=mod.pool.CAREER_LEAGUE_LADDER[LABEL],groups=Array.isArray(value)?value:[],flat=groups.every(Array.isArray)?groups.flat():[];
  row.observation={groups,flat,expectedNames:EXPECTED};
  assert.deepEqual(sort(flat),sort(EXPECTED),markers[1]);assert.equal(new Set(flat).size,18,markers[1]);
 });
 await test(2,row=>{
  const at=year=>{const size=mod.league.leagueSizeFor(LABEL,year);return{year,size,dugout:mod.league.leagueSizeFor(LABEL,year,true),points:mod.format.leagueFormatFor(LABEL,year),meetings:mod.derby.derbyMeetings(LABEL,year),games:size===null?null:2*(size-1)};};
  row.observation={old:at(2025),modern:at(2026)};
  assert.deepEqual(row.observation,{old:{year:2025,size:null,dugout:null,points:null,meetings:null,games:null},modern:{year:2026,size:18,dugout:18,points:{win:3,draw:1,loss:0},meetings:2,games:34}},markers[2]);
 });
 await test(3,row=>{
  const historical=copy(fixture.value.retired),raw=S.serializeSoccerCareerSave(historical),N=oldPool.filter(c=>c.tier>=3).length,u=(N+0.5)/(N+17);
  const reference=taped(4004,()=>E.choosePostRetirement(copy(historical),'manager',oldPool),[u]);
  const actual=taped(4004,()=>E.choosePostRetirement(copy(historical),'manager',appended),[u]);
  assert(reference.value.managerState&&!addedNames.has(reference.value.managerState.club),'Independent old candidate reference is healthy');
  row.observation={historical,raw,N,u,reference,actual,inputRawAfter:S.serializeSoccerCareerSave(historical)};
  assert.equal(row.observation.inputRawAfter,raw,markers[3]);
  assert.deepEqual(actual,reference,markers[3]);
 });
 await test(4,row=>{
  const historical=copy(fixture.value.retired),bounded=[nantes,...added],before=S.serializeSoccerCareerSave(historical);
  const originals=OC.coachingStartChoices(historical,bounded),request=originals.find(q=>addedIds.has(q.clubId));
  assert(request&&request.source===historical,'Genuine immutable old-helper quote bound to SAME historical object');
  const read=taped(5005,()=>C.coachingStartChoices(historical,bounded));
  const commit=taped(5006,()=>C.startCoachingAppointment(historical,bounded,request));
  row.observation={historical,before,originalQuotes:originals.map(({source,...q})=>q),request:{...request,source:'SAME historical object'},read:{...read,value:read.value.map(({source,...q})=>q)},commit,rawAfter:S.serializeSoccerCareerSave(historical),sameIdentity:commit.value===historical};
  assert.equal(row.observation.rawAfter,before,markers[4]);
  assert(read.value.every(q=>!addedIds.has(q.clubId))&&commit.value===historical&&commit.draws.length===0,markers[4]);
 });
 await test(5,row=>{
  const shape=E.HAND_CLUBS.map(c=>[c.id,c.name,c.country,c.tier,c.color,c.league]),fingerprint=sha(JSON.stringify(shape)).slice(0,16);
  row.observation={count:shape.length,fingerprint,head:E.FALLBACK_CLUBS.slice(0,shape.length)};
  assert.equal(shape.length,190,'Existing actual hand row count');assert.equal(fingerprint,'e12e673153af2568','Existing independent six-field hand fingerprint');
  assert.deepEqual(E.FALLBACK_CLUBS.slice(0,190),E.HAND_CLUBS,'Actual full pool begins with the unchanged hand rows');
 });
 await test(6,row=>{
  const projected=taped(7007,()=>mod.world.projectLeagueWorldClubs(copy(fixture.value.playing),oldPool,2026));
  const generic=projected.value.find(c=>c.name==='Saint-Étienne');
  assert(generic&&generic.id==='career-lower-saint-etienne'&&generic.color==='#64748b','Actual existing generic accented lower record required for BASELINE fixture');
  const input=copy(fixture.value.playing),offer={club:copy(generic),contractYears:3,wage:1200,transferFee:0};
  input.phase='contract_offer';input.pendingOffers=[offer];const raw=S.serializeSoccerCareerSave(input),loaded=E.repairCareer(S.parseSoccerCareerSave(raw));
  assert(S.isSoccerCareerSave(loaded),'Existing official complete generic-offer save');
  const rawAfter=S.serializeSoccerCareerSave(loaded),accepted=taped(7008,()=>E.acceptOffer(copy(loaded),copy(loaded.pendingOffers[0])));
  row.observation={generic,projectedDraws:projected.draws,projectedNext:projected.next,input,raw,loaded,rawAfter,accepted,scope:'Simulation-only offer1200/3 years/zero fee. Real club identity and neutral definition come from actual old projection. Retain this raw fixture for later fixed replay, do not regenerate it from expanded data.'};
  assert.equal(rawAfter,raw,'Official repair preserves every saved byte');
  assert.deepEqual(loaded.pendingOffers,[offer],'Saved complete generic offer remains unchanged');
  assert.deepEqual([accepted.value.currentClub,accepted.value.currentClubCountry,accepted.value.currentLeague,accepted.value.currentClubTier,accepted.value.currentClubColor],[generic.name,generic.country,generic.league,generic.tier,generic.color],'Actual acceptance uses retained generic tuple');
  assert.equal(accepted.value.contractYearsLeft,offer.contractYears,'Retained term');assert.equal(accepted.value.phase,'playing','Actual acceptance reaches playing');
 });
 report.sourceAfter=sourceMap();assert.deepEqual(report.sourceAfter,report.sourceBefore,'All source bodies held');
 assert.equal(report.cases.length,7);assert.deepEqual(report.cases.map(c=>c.name),names);
 report.totals={cases:7,passed:report.cases.filter(c=>c.status==='passed').length,failed:report.cases.filter(c=>c.status==='failed').length,methodErrors:report.methodErrors.length};
 report.status=report.methodErrors.length?'METHOD_ERROR':report.totals.failed?'ASSERTION_RED':'PASSED';flush();
 console.log('LIGUE2_BASELINE: '+report.totals.cases+' cases; '+report.totals.passed+' passed; '+report.totals.failed+' assertion failures; '+report.totals.methodErrors+' method errors; source held');
 process.exitCode=report.methodErrors.length?2:report.totals.failed?1:0;
}catch(error){report.status='METHOD_ERROR';report.infrastructure={name:error?.name,message:error?.message,stack:error?.stack};flush();console.error('LIGUE2_BASELINE_METHOD_ERROR: '+error?.message);process.exitCode=2;}
finally{fs.rmSync(tmp,{recursive:true,force:true});}
