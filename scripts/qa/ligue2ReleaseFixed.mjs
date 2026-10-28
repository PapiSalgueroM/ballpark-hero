import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {bundleCareerSources,poolInputs} from '../lib/careerClubPool.mjs';
assert(process.env.CI,'Remote CI only');
const ROOT=process.cwd(),OUT=path.resolve(process.env.SC_LIGUE2_FIXED_OUT||'ligue2-fixed-artifacts');
const BASE='e1b33581532b1514e4510e9d89e633e5305fa963',NOW=1791586800000,LABEL='Ligue 2';
const sha=b=>createHash('sha256').update(b).digest('hex'),copy=x=>structuredClone(x),sort=a=>[...a].sort();
const EXPECTED=['Metz','Nantes','Saint-Etienne','Red Star FC','Reims','Montpellier','Nancy','Annecy','Sochaux','Dijon','Pau','Guingamp','Dunkerque','Grenoble','Rodez','Clermont','Boulogne','Laval'];
const names=['complete initial-contract pool and since boundary','complete modern finish ladder','playing table size points and cadence boundary','historic default manager entry excludes the appended17','historic coursework read and commit exclude the appended17','existing190 hand definitions remain frozen','retained generic lower-club offer survives codec and acceptance'];
const markers=['LIGUE2_POOL','LIGUE2_LADDER','LIGUE2_TABLE','LIGUE2_DEFAULT_ENTRY','LIGUE2_COURSEWORK_ENTRY','LIGUE2_OLD_DEFINITIONS','LIGUE2_RETAINED_SAVE'];
const retained='qa/sc-ligue2-release-v1/retained/',research='qa/sc-ligue2-release-v1/research/VERIFIED-FACTS.json';
const paths=['src/lib/clubManager.ts','scripts/data/soccerCareerFacts.json','scripts/lib/careerClubPool.mjs','src/data/soccerCareerClubPool.ts','src/data/leagueFormat.ts','src/lib/soccerCareerLeague.ts','src/lib/soccerCareerDerby.ts','src/lib/soccerCareerEngine.ts','src/lib/soccerCareerCoachingStart.ts','src/lib/careerEras.ts','src/lib/soccerCareerSave.ts','src/lib/soccerCareerLeagueWorld.ts','src/lib/soccerCareerLife.ts','src/lib/soccerCareerLoyalty.ts','qa/sc-ligue2-release-v1/original/soccerCareerCoachingStart.ts','qa/sc-ligue2-release-v1/original/soccerCareerEngine.ts',retained+'fixtures.json',retained+'old-generic.save.txt',research,'qa/sc-ligue2-release-v1/PRODUCT-SOURCE-READY.json','scripts/qa/ligue2ReleaseFixed.mjs'];
const sourceMap=()=>Object.fromEntries(paths.map(p=>[p,sha(fs.readFileSync(path.join(ROOT,p)))]));
fs.mkdirSync(OUT,{recursive:true});
const json=(name,x)=>fs.writeFileSync(path.join(OUT,name+'.json'),JSON.stringify(x,null,2));
const report={status:'STARTED',sourceBefore:sourceMap(),cases:[],methodErrors:[],scope:'Seven positive cases on actual retained baseline inputs and canonical APIs. Full typed states, official bytes and action draw/next compared. Modern future outcomes intentionally may change. References replace only the engine and generated pool; every other bundled dependency is the selected candidate, not an entire old build. Module initialization is excluded and unmeasured.'};
const flush=()=>json('report',report),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'ligue2-fixed-'));
globalThis.localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{},clear:()=>{}};
function taped(seed,action,forced=[]){
 const real=Math.random,now=Date.now,draws=[];let n=seed>>>0,at=0;
 const next=()=>{if(at<forced.length)return forced[at++];n+=0x6D2B79F5;let t=n;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};
 Math.random=()=>{const v=next();draws.push(v);return v;};Date.now=()=>NOW;
 try{return{value:action(),draws,next:next()};}finally{Math.random=real;Date.now=now;}
}
function stateCall(mod,input,seed,action,forced=[]){
 const before=mod.save.serializeSoccerCareerSave(input),run=taped(seed,()=>action(input),forced);
 return{...run,raw:mod.save.serializeSoccerCareerSave(run.value),before,after:mod.save.serializeSoccerCareerSave(input),sameIdentity:run.value===input};
}
function sameState(a,b,marker){assert.deepEqual(a.value,b.value,marker);assert.equal(a.raw,b.raw,marker);assert.deepEqual(a.draws,b.draws,marker);assert.equal(a.next,b.next,marker);assert.equal(a.after,a.before,marker);assert.equal(b.after,b.before,marker);}
const strip=quotes=>quotes.map(({source,...q})=>q);
function gitBody(file,pin){
 const r=spawnSync('git',['show',BASE+':'+file],{cwd:ROOT,encoding:'utf8',maxBuffer:2*1024*1024});
 if(r.error||r.status!==0)throw new Error('Immutable reference unavailable '+file+': '+(r.error?.message||r.stderr));
 assert.equal(sha(r.stdout),pin,'Immutable reference SHA '+file);
 return r.stdout;
}
function pendingLoanWindow(E,playing,clubs){
 let state=E.advanceProSeason(playing,clubs);const trace=[];
 for(let step=0;step<48;step++){
  trace.push({phase:state.phase,age:state.age,overall:state.overall,club:state.currentClub,loans:state.pendingLoanOffers?.length||0});
  if(state.phase==='transfer_window')return{state,trace};
  const handlers={newspaper:()=>E.dismissNewspaper(state),season_summary:()=>E.dismissSummary(state,clubs),ballon_dor:()=>E.dismissBallonDor(state,clubs),international_debut:()=>E.dismissDebut(state,clubs),world_cup:()=>E.dismissWorldCup(state,clubs),rivalry_event:()=>E.dismissRivalryEvent(state,clubs),social_media_action:()=>E.dismissSocialMediaPhase(state,clubs),moral_dilemma:()=>E.dismissMoralDilemma(E.applyMoralDilemmaChoice(state,0),clubs),random_events:()=>E.applyEventChoice(state,0,clubs),red_card_appeal_result:()=>E.dismissAppealResult(state,clubs)};
  if(!handlers[state.phase])return{state:null,trace,stopped:state.phase};
  state=handlers[state.phase]();
 }
 return{state:null,trace,stopped:'bounded48-phase-limit'};
}
async function test(index,action){
 const row={index,name:names[index],marker:markers[index],status:'STARTED'};report.cases.push(row);flush();
 try{await action(row);row.status='passed';}catch(e){row.status=e?.name==='AssertionError'?'failed':'method-error';row.error={name:e?.name,message:e?.message,stack:e?.stack};if(row.status==='method-error')report.methodErrors.push(row.error);}
 json('case-'+(index+1),row);flush();
}
try{
 const read=(file,pin)=>{const b=fs.readFileSync(path.join(ROOT,file));assert.equal(sha(b),pin,'Retained input SHA '+file);return b;};
 const product=JSON.parse(read('qa/sc-ligue2-release-v1/PRODUCT-SOURCE-READY.json','ca4be0b4b16d7d345603854d9294b528e82019861121a63a64e3ce7d326f10d0'));report.product=product;
 const fixture=JSON.parse(read(retained+'fixtures.json','3ba6f1cbc7ddf56ec2938e3822b83b4920128cd1c8c9736eef46b0608ede4fa1'));
 const raw=read(retained+'old-generic.save.txt','81777bcd5a7631c70edf52c626484c00e0a687ab2fd9a7fae7f3c3a2ade0da25').toString('utf8');
 const ledger=JSON.parse(read(research,'24ba62d691c0cd088fa6356f58b7d9ac20fd25e998929998b689eab8247e9a5a'));
 read('qa/sc-ligue2-release-v1/original/soccerCareerCoachingStart.ts','816ddd0c3c0e3e5538ffe0cc08828cb60b10b70a91280fb04a917897891679fc');
 const engineBefore=gitBody('src/lib/soccerCareerEngine.ts','d7d94a36b796af66914cdf9bd4803cf42b027f423ceb8baac9fb144677de7030');
 const poolBefore=gitBody('src/data/soccerCareerClubPool.ts','735d636cb22c14794692fef45e22323fe85d3c38cbbdbaa1df1ccc7aba961bd8');
 fs.writeFileSync(path.join(OUT,'original-engine.ts'),engineBefore);fs.writeFileSync(path.join(OUT,'original-pool.ts'),poolBefore);
 const extra={pool:'data/soccerCareerClubPool.ts',league:'lib/soccerCareerLeague.ts',format:'data/leagueFormat.ts',derby:'lib/soccerCareerDerby.ts',coaching:'lib/soccerCareerCoachingStart.ts',life:'lib/soccerCareerLife.ts',loyalty:'lib/soccerCareerLoyalty.ts',oldCoaching:'../qa/sc-ligue2-release-v1/original/soccerCareerCoachingStart.ts'};
 const mod=await bundleCareerSources({root:ROOT,tmpDir:tmp,extra});
 const old=await bundleCareerSources({root:ROOT,tmpDir:tmp,transforms:{'lib/soccerCareerEngine.ts':()=>engineBefore,'data/soccerCareerClubPool.ts':()=>poolBefore},extra:{pool:'data/soccerCareerClubPool.ts',coaching:'../qa/sc-ligue2-release-v1/original/soccerCareerCoachingStart.ts',life:'lib/soccerCareerLife.ts',loyalty:'lib/soccerCareerLoyalty.ts'}});
 const E=mod.engine,C=mod.coaching,OC=mod.oldCoaching,S=mod.save,oldPool=old.engine.FALLBACK_CLUBS,oldIds=new Set(oldPool.map(c=>c.id));
 assert.equal(typeof E.managerEntryClubInYear,'function','Actual fixed shared API');
 const added=mod.pool.CAREER_CLUB_POOL.filter(c=>!oldIds.has(c.id)),addedIds=new Set(added.map(c=>c.id)),addedNames=new Set(added.map(c=>c.name)),appended=[...oldPool,...added];
 const nantes=E.HAND_CLUBS.find(c=>c.id==='fb-70'),inputs=poolInputs(mod),facts=JSON.parse(fs.readFileSync('scripts/data/soccerCareerFacts.json','utf8'));
 const historical=fixture.value.retired;
 assert.equal((historical.seasons[historical.seasons.length-1]?.year??2024)+1,fixture.value.firstYear,'Retained canonical historical boundary');
 assert(fixture.value.firstYear<2026&&S.isSoccerCareerSave(historical),'Retained actual complete historical fixture');
 report.inputs={base:BASE,oldEngineSHA:sha(engineBefore),oldPoolSHA:sha(poolBefore),fixtureSHA:sha(fs.readFileSync(retained+'fixtures.json')),rawSHA:sha(raw),researchSHA:sha(fs.readFileSync(research)),oldPoolCount:oldPool.length,addedDefinitions:added,historical};json('inputs',report.inputs);
 const modern=taped(2026,()=>{
  const stats={pace:70,shooting:70,passing:70,dribbling:70,defending:70,physical:70,reflexes:70};
  let s=old.engine.initCareer('Ligue2 Modern Boundary','France','CM','2020s',stats,70,2026,oldPool,null,80),steps=0;
  while(s.phase==='youth'&&steps++<12)s=old.engine.advanceYouthYear(s,oldPool);
  assert(s.phase==='contract_offer'&&s.pendingOffers?.length,'Actual modern constructor reaches an initial offer');
  s=old.engine.acceptOffer(s,s.pendingOffers[0]);s=old.engine.repairCareer(s);s=old.engine.manualRetire(s);s.lifeFlags={...s.lifeFlags,coachingBadges:3};
  assert(s.retired&&s.phase==='retirement_ceremony'&&!s.managerState&&!s.postRetirementChoice,'Actual modern retired state');
  assert((s.seasons[s.seasons.length-1]?.year??2024)+1>=2026&&S.isSoccerCareerSave(s),'Modern canonical year and official shape');
  return s;
 });
 report.modernFixture={...modern,scope:'Actual old constructor/youth/offer/accept/repair/manualRetire path with2026 start; coursework3 is a labelled presentation flag, not earned progression.'};json('modern-fixture',report.modernFixture);
 await test(0,row=>{
  const m=markers[0],modernClubs=mod.eras.adjustClubsForYear(E.FALLBACK_CLUBS,2026).filter(c=>c.league===LABEL),early=[],census=[];
  for(let year=1980;year<=2026;year++){
   const denied=E.FALLBACK_CLUBS.filter(c=>!E.managerEntryClubInYear(c,year)).map(c=>c.id),oldDenied=oldPool.filter(c=>!E.managerEntryClubInYear(c,year)).map(c=>c.id);
   census.push({year,denied,oldDenied});
   if(year<2026){const leaked=mod.eras.adjustClubsForYear(E.FALLBACK_CLUBS,year).filter(c=>addedIds.has(c.id)).map(c=>c.id);if(leaked.length)early.push({year,leaked});}
  }
  row.observation={modern:modernClubs,early,census,added,provenance:ledger.clubs.map(c=>({club:c.cmName,actual:facts.clubColours.clubs[c.cmName],colour:inputs.colorOf(c.cmName)}))};
  assert.equal(added.length,17,m);assert.equal(addedIds.size,17,m);assert.equal(mod.pool.CAREER_CLUB_POOL.length,287,m);assert.deepEqual(sort(added.map(c=>c.name)),sort(EXPECTED.filter(n=>n!=='Nantes')),m);
  assert.deepEqual(sort(modernClubs.map(c=>c.name)),sort(EXPECTED),m);assert.equal(new Set(modernClubs.map(c=>c.id)).size,18,m);assert.deepEqual(early,[],m);
  for(const c of added){assert.equal(c.country,'France',m);assert.equal(c.tier,4,m);assert.equal(mod.pool.CAREER_POOL_SINCE[c.name],2026,m);}
  for(const c of census){assert.deepEqual(sort(c.denied),c.year<2026?sort([...addedIds]):[],m);assert.deepEqual(c.oldDenied,[],m);}
  assert(E.managerEntryClubInYear(null,2025)&&E.managerEntryClubInYear(undefined,2025),m);
  for(const c of ledger.clubs){
   const actual=facts.clubColours.clubs[c.cmName];assert(actual&&actual.sources.length===2,m);assert.equal(actual.colour,c.colour,m);assert.equal(actual.hex,inputs.colorOf(c.cmName),m);
   assert.equal(new Set(actual.sources.map(s=>new URL(s.url).host)).size,2,m);assert.equal(new Set(actual.sources.map(s=>s.publisher)).size,2,m);
   assert.deepEqual(actual.sources.map(s=>[s.url,s.publisher,s.read,s.says,s.access]),c.sources.map(s=>[s.url,s.publisher,s.read,s.quote,s.access]),m);
  }
  const witnesses=[],attempts=[],found=new Set(),low={pace:45,shooting:45,passing:45,dribbling:45,defending:45,physical:45,reflexes:45};
  for(let attempt=0;attempt<4096&&found.size<18;attempt++){
   const seed=40000+attempt,constructor=taped(seed,()=>{let s=E.initCareer('Ligue2 Pool Boot','France','CM','2020s',low,45,2026,E.FALLBACK_CLUBS,null,55),steps=0;while(s.phase==='youth'&&steps++<12)s=E.advanceYouthYear(s,E.FALLBACK_CLUBS);assert(s.phase==='contract_offer'&&s.pendingOffers?.length,'Actual complete pool constructor reaches offers');return s;});
   attempts.push({seed,phase:constructor.value.phase,offered:constructor.value.pendingOffers.map(o=>({id:o.club.id,name:o.club.name,league:o.club.league})),draws:constructor.draws.length,next:constructor.next});
   for(const [offerIndex,offer] of constructor.value.pendingOffers.entries()){
    if(offer.club.league!==LABEL||found.has(offer.club.name))continue;
    const accepted=stateCall(mod,copy(constructor.value),50000+attempt*4+offerIndex,s=>E.acceptOffer(s,s.pendingOffers[offerIndex])),normalized=E.repairCareer(copy(accepted.value)),saved=S.serializeSoccerCareerSave(normalized),loaded=E.repairCareer(S.parseSoccerCareerSave(saved));
    const witness={seed,offerIndex,constructor,offer,accepted,normalized,saved,loaded,loadedRaw:S.serializeSoccerCareerSave(loaded)};witnesses.push(witness);json('boot-'+witnesses.length,witness);
    assert(S.isSoccerCareerSave(loaded)&&loaded.phase==='playing',m);assert.equal(loaded.currentClub,offer.club.name,m);assert.equal(loaded.currentClubColor,offer.club.color,m);assert.equal(loaded.currentLeague,LABEL,m);assert.equal(loaded.contractYearsLeft,offer.contractYears,m);assert.equal(witness.loadedRaw,saved,m);assert.deepEqual(loaded,normalized,m);found.add(offer.club.name);
   }
  }
  row.observation.boots={seedCeiling:4096,attempts,witnessCount:witnesses.length,names:sort([...found]),scope:'Only18 successful actual constructor/offer/accept/officialcodec witnesses retained; no manual offer or currentClub assignment.'};
  assert.deepEqual(sort([...found]),sort(EXPECTED),m);assert.equal(witnesses.length,18,m);
 });
 await test(1,row=>{
  const m=markers[1],groups=mod.pool.CAREER_LEAGUE_LADDER[LABEL],flat=Array.isArray(groups)&&groups.every(Array.isArray)?groups.flat():[];
  row.observation={groups,flat,oldLadders:old.pool.CAREER_LEAGUE_LADDER};
  assert.deepEqual(sort(flat),sort(EXPECTED),m);assert.equal(new Set(flat).size,18,m);
  for(const [league,ladder] of Object.entries(old.pool.CAREER_LEAGUE_LADDER))assert.deepEqual(mod.pool.CAREER_LEAGUE_LADDER[league],ladder,m);
 });
 await test(2,row=>{
  const m=markers[2],at=year=>{const size=mod.league.leagueSizeFor(LABEL,year);return{year,size,dugout:mod.league.leagueSizeFor(LABEL,year,true),points:mod.format.leagueFormatFor(LABEL,year),meetings:mod.derby.derbyMeetings(LABEL,year),games:size===null?null:2*(size-1)};};
  row.observation={old:at(2025),modern:at(2026),evidence:facts.leagueWorld[LABEL]};
  assert.deepEqual(row.observation.old,{year:2025,size:null,dugout:null,points:null,meetings:null,games:null},m);
  assert.deepEqual(row.observation.modern,{year:2026,size:18,dugout:18,points:{win:3,draw:1,loss:0},meetings:2,games:34},m);
  assert.equal(facts.leagueWorld[LABEL].members.length,18,m);assert.equal(facts.leagueWorld[LABEL].games,34,m);assert.equal(2*(18-1),34,m);
  const format=facts.leagueWorld[LABEL].format;assert(format.length>=3&&format.some(s=>s.url===ledger.season.freshOfficialRule.url)&&format.some(s=>s.url===ledger.season.freshIndependentClubSchedule.url),m);
 });
 await test(3,row=>{
  const m=markers[3],N=oldPool.filter(c=>c.tier>=3).length,u=(N+0.5)/(N+added.length);row.observation={N,u,historical:[],modern:null};
  for(const seed of [4004,4104]){
   const reference=stateCall(old,copy(historical),seed,s=>old.engine.choosePostRetirement(s,'manager',oldPool),[u]);
   const actual=stateCall(mod,copy(historical),seed,s=>E.choosePostRetirement(s,'manager',appended),[u]);
   row.observation.historical.push({seed,reference,actual});assert(reference.value.managerState&&!addedNames.has(reference.value.managerState.club),m);sameState(actual,reference,m);assert.equal(actual.draws.length,1,m);
  }
  const reference=stateCall(old,copy(modern.value),4204,s=>old.engine.choosePostRetirement(s,'manager',appended),[u]),actual=stateCall(mod,copy(modern.value),4204,s=>E.choosePostRetirement(s,'manager',appended),[u]);
  row.observation.modern={reference,actual};sameState(actual,reference,m);assert.equal(actual.value.managerState.club,added[0].name,m);assert.equal(actual.draws.length,1,m);
 });
 await test(4,row=>{
  const m=markers[4],h=copy(historical),bounded=[nantes,...added],before=S.serializeSoccerCareerSave(h),originals=OC.coachingStartChoices(h,bounded),request=originals.find(q=>addedIds.has(q.clubId));
  assert(request&&request.source===h&&originals.filter(q=>addedIds.has(q.clubId)).length>=2,'Genuine old-helper current-colour quote on SAME historical object');
  const requested=added.find(c=>c.id===request.clubId);assert.equal(JSON.parse(request.seal).at(-1),requested.color,'Old quote uses actual current colour, never stale baseline grey');
  const read=taped(5005,()=>C.coachingStartChoices(h,bounded)),commit=stateCall(mod,h,5006,s=>C.startCoachingAppointment(s,bounded,request));
  row.observation={historical:h,before,originalQuotes:strip(originals),request:{...request,source:'SAME historical object'},read:{...read,value:strip(read.value)},commit,oldPool:null,validHistorical:null,modern:null,malformed:null};
  assert(read.value.every(q=>!addedIds.has(q.clubId))&&commit.sameIdentity&&commit.draws.length===0,m);assert.equal(commit.after,before,m);
  const currentOld=taped(5010,()=>C.coachingStartChoices(h,oldPool)),referenceOld=taped(5010,()=>old.coaching.coachingStartChoices(h,oldPool));
  row.observation.oldPool={current:{...currentOld,value:strip(currentOld.value)},reference:{...referenceOld,value:strip(referenceOld.value)}};assert.deepEqual(row.observation.oldPool.current,row.observation.oldPool.reference,m);
  const valid=C.coachingStartChoices(h,bounded)[0];assert(valid&&valid.source===h&&valid.clubId===nantes.id,m);
  const accepted=stateCall(mod,h,5011,s=>C.startCoachingAppointment(s,bounded,valid)),canonical=stateCall(old,copy(h),5011,s=>old.engine.choosePostRetirement(s,'manager',[nantes]));
  row.observation.validHistorical={accepted,canonical};sameState(accepted,canonical,m);assert.equal(accepted.draws.length,1,m);
  const mh=copy(modern.value),mq=C.coachingStartChoices(mh,bounded),oq=OC.coachingStartChoices(mh,bounded),newQuote=mq.find(q=>addedIds.has(q.clubId));assert(newQuote&&newQuote.source===mh,m);assert.deepEqual(strip(mq),strip(oq),m);
  const club=added.find(c=>c.id===newQuote.clubId),acceptedModern=stateCall(mod,mh,5020,s=>C.startCoachingAppointment(s,bounded,newQuote)),canonicalModern=stateCall(old,copy(mh),5020,s=>old.engine.choosePostRetirement(s,'manager',[club]));
  row.observation.modern={choices:strip(mq),oldChoices:strip(oq),accepted:acceptedModern,canonical:canonicalModern};sameState(acceptedModern,canonicalModern,m);assert.equal(acceptedModern.draws.length,1,m);assert.equal(acceptedModern.value.managerState.club,club.name,m);
  const malformed=[null,undefined,{},false,nantes],a=taped(5030,()=>C.coachingStartChoices(h,malformed)),b=taped(5030,()=>OC.coachingStartChoices(h,malformed));
  row.observation.malformed={actual:{...a,value:strip(a.value)},reference:{...b,value:strip(b.value)}};assert.deepEqual(row.observation.malformed.actual,row.observation.malformed.reference,m);
  assert.equal(S.serializeSoccerCareerSave(h),before,m);
 });
 await test(5,row=>{
  const m=markers[5],shape=E.HAND_CLUBS.map(c=>[c.id,c.name,c.country,c.tier,c.color,c.league]);
  row.observation={handCount:E.HAND_CLUBS.length,oldGeneratedCount:old.pool.CAREER_CLUB_POOL.length,newGeneratedCount:mod.pool.CAREER_CLUB_POOL.length,fingerprint:sha(JSON.stringify(shape)).slice(0,16),oldGenerated:old.pool.CAREER_CLUB_POOL,heldGenerated:mod.pool.CAREER_CLUB_POOL.filter(c=>oldIds.has(c.id))};
  assert.equal(shape.length,190,m);assert.equal(row.observation.fingerprint,'e12e673153af2568',m);assert.deepEqual(E.HAND_CLUBS,old.engine.HAND_CLUBS,m);assert.deepEqual(E.FALLBACK_CLUBS.slice(0,190),old.engine.HAND_CLUBS,m);
  assert.equal(old.pool.CAREER_CLUB_POOL.length,270,m);assert.deepEqual(row.observation.heldGenerated,old.pool.CAREER_CLUB_POOL,m);assert.deepEqual(E.FALLBACK_CLUBS.filter(c=>oldIds.has(c.id)),oldPool,m);
  for(const [name,since] of Object.entries(old.pool.CAREER_POOL_SINCE))assert.equal(mod.pool.CAREER_POOL_SINCE[name],since,m);
 });
 await test(6,row=>{
  const m=markers[6],input=JSON.parse(JSON.stringify(S.parseSoccerCareerSave(raw))),referenceInput=copy(input);
  assert(S.isSoccerCareerSave(input)&&input.pendingOffers?.length===1,m);
  const loaded=E.repairCareer(input),oldLoaded=old.engine.repairCareer(referenceInput);assert.equal(S.serializeSoccerCareerSave(loaded),raw,m);assert.equal(old.save.serializeSoccerCareerSave(oldLoaded),raw,m);assert.deepEqual(loaded,oldLoaded,m);
  const offer=loaded.pendingOffers[0];assert.equal(offer.club.id,'career-lower-saint-etienne',m);assert.equal(offer.club.name,'Saint-Étienne',m);assert.equal(offer.club.color,'#64748b',m);
  const actual=stateCall(mod,copy(loaded),7008,s=>E.acceptOffer(s,copy(s.pendingOffers[0]))),reference=stateCall(old,copy(oldLoaded),7008,s=>old.engine.acceptOffer(s,copy(s.pendingOffers[0])));
  row.observation={raw,loaded,oldLoaded,actual,reference,scope:'The exact admitted6412-byte original save, not a new offer or current-club fixture.'};sameState(actual,reference,m);
  assert.deepEqual([actual.value.currentClub,actual.value.currentClubCountry,actual.value.currentLeague,actual.value.currentClubTier,actual.value.currentClubColor],[offer.club.name,offer.club.country,offer.club.league,offer.club.tier,offer.club.color],m);assert.equal(actual.value.phase,'playing',m);assert.equal(actual.value.contractYearsLeft,offer.contractYears,m);
  const baseWage=Math.round(offer.wage*old.life.agentWageMult(oldLoaded.agentId)),elected=old.loyalty.chooseLoyalty(copy(oldLoaded),copy(offer),baseWage,'loyalty');
  assert(elected!==oldLoaded&&old.loyalty.readLoyalty(elected)?.pending,'Actual old elective loyalty choice exists');
  const electedRaw=old.save.serializeSoccerCareerSave(elected),electedLoaded=E.repairCareer(S.parseSoccerCareerSave(electedRaw)),oldElectedLoaded=old.engine.repairCareer(old.save.parseSoccerCareerSave(electedRaw));
  const electedActual=stateCall(mod,copy(electedLoaded),7108,s=>E.acceptOffer(s,copy(s.pendingOffers[0]))),electedReference=stateCall(old,copy(oldElectedLoaded),7108,s=>old.engine.acceptOffer(s,copy(s.pendingOffers[0])));
  row.observation.electedLoyalty={elected,electedRaw,electedLoaded,oldElectedLoaded,actual:electedActual,reference:electedReference};
  assert.equal(S.serializeSoccerCareerSave(electedLoaded),electedRaw,m);assert.deepEqual(electedLoaded,elected,m);assert.deepEqual(electedLoaded.pendingOffers,elected.pendingOffers,m);assert.deepEqual(electedLoaded.loyaltyContracts,elected.loyaltyContracts,m);sameState(electedActual,electedReference,m);
  const loanAttempts=[];let loanWitness=null;
  for(let attempt=0;attempt<256&&!loanWitness;attempt++){
   const seed=60000+attempt,run=taped(seed,()=>{
    const stats={pace:55,shooting:55,passing:55,dribbling:55,defending:55,physical:55,reflexes:55};let s=old.engine.initCareer('Ligue2 Retained Loan','France','CM','2020s',stats,55,2026,oldPool,null,65),steps=0;
    while(s.phase==='youth'&&steps++<12)s=old.engine.advanceYouthYear(s,oldPool);
    assert(s.phase==='contract_offer'&&s.pendingOffers?.length,'Actual old loan constructor reaches offers');
    const offerIndex=s.pendingOffers.findIndex(o=>o.isHomegrown&&o.club.tier===2&&o.contractYears>=3&&old.engine.projectLeagueApps(s.overall,2,o.club.name,0).max<24);
    if(offerIndex<0)return{state:null,trace:[],stopped:'no-genuine-fringe-homegrown',offered:s.pendingOffers};
    const initial=s;s=old.engine.repairCareer(old.engine.acceptOffer(s,s.pendingOffers[offerIndex]));return{...pendingLoanWindow(old.engine,s,oldPool),initial,offerIndex};
   });
   loanAttempts.push({seed,stopped:run.value.stopped,trace:run.value.trace,loanCount:run.value.state?.pendingLoanOffers?.length||0,draws:run.draws.length,next:run.next});
   if(run.value.state?.phase==='transfer_window'&&run.value.state.pendingLoanOffers?.length)loanWitness={seed,run};
  }
  row.observation.loan={seedCeiling:256,attempts:loanAttempts,witness:loanWitness};
  assert(loanWitness,'LIGUE2_RETAINED_SAVE: actual old legal pending loan reached within bounded search');
  const loanState=old.engine.repairCareer(copy(loanWitness.run.value.state)),loanRaw=old.save.serializeSoccerCareerSave(loanState),loanLoaded=E.repairCareer(S.parseSoccerCareerSave(loanRaw)),oldLoanLoaded=old.engine.repairCareer(old.save.parseSoccerCareerSave(loanRaw));
  const loanActual=stateCall(mod,copy(loanLoaded),7208,s=>E.acceptLoan(s,copy(s.pendingLoanOffers[0]))),loanReference=stateCall(old,copy(oldLoanLoaded),7208,s=>old.engine.acceptLoan(s,copy(s.pendingLoanOffers[0])));
  Object.assign(row.observation.loan,{loanRaw,loanLoaded,oldLoanLoaded,actual:loanActual,reference:loanReference});
  assert(S.isSoccerCareerSave(loanLoaded)&&loanLoaded.phase==='transfer_window',m);assert.equal(S.serializeSoccerCareerSave(loanLoaded),loanRaw,m);assert.deepEqual(loanLoaded,loanState,m);assert.deepEqual(loanLoaded.pendingLoanOffers,loanState.pendingLoanOffers,m);sameState(loanActual,loanReference,m);
 });
 const bundleDir=path.join(OUT,'bundles');fs.mkdirSync(bundleDir,{recursive:true});
 report.bundles=fs.readdirSync(tmp).filter(n=>n.endsWith('.mjs')).map(name=>{const b=fs.readFileSync(path.join(tmp,name));fs.writeFileSync(path.join(bundleDir,name),b);return{name,bytes:b.length,sha256:sha(b)};});
 report.sourceAfter=sourceMap();assert.deepEqual(report.sourceAfter,report.sourceBefore,'Every source and retained input held');assert.deepEqual(report.cases.map(c=>c.name),names);
 report.totals={cases:7,passed:report.cases.filter(c=>c.status==='passed').length,failed:report.cases.filter(c=>c.status==='failed').length,methodErrors:report.methodErrors.length};
 report.status=report.methodErrors.length?'METHOD_ERROR':report.totals.failed?'ASSERTION_RED':'PASSED';flush();
 console.log('LIGUE2_FIXED: 7 cases; '+report.totals.passed+' passed; '+report.totals.failed+' assertion failures; '+report.totals.methodErrors+' method errors; source held');
 process.exitCode=report.methodErrors.length?2:report.totals.failed?1:0;
}catch(e){report.status='METHOD_ERROR';report.infrastructure={name:e?.name,message:e?.message,stack:e?.stack};flush();console.error('LIGUE2_FIXED_METHOD_ERROR: '+e?.message);process.exitCode=2;}
finally{fs.rmSync(tmp,{recursive:true,force:true});}
