import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {bundleCareerSources,deriveCareerClubPool,poolInputs} from '../lib/careerClubPool.mjs';
assert(process.env.CI,'Remote CI only');
const ROOT=process.cwd(),OUT=path.resolve(process.env.SC_SERIEB_FIXED_OUT||'serieb-fixed-artifacts');
const SPEC='qa/sc-serieb-release-v1/FIXED-CONSUMER-SOURCE.json',SPEC_SHA='e7139a610101b59f5bb7a19a05c4911d251c9c3f1e541e10bbedc5f9411f1608';
const NOW=1791586800000,LABEL='Serie B',Q='qa/sc-serieb-release-v1/',sha=b=>createHash('sha256').update(b).digest('hex'),copy=x=>structuredClone(x),sort=x=>[...x].sort();
const EXPECTED=['Cremonese','Verona','Pisa','Avellino','Carrarese','Catanzaro','Cesena','Empoli','Entella','Juve Stabia','Mantova','Modena','Padova','Palermo','Sampdoria','Sudtirol','Vicenza','Arezzo','Benevento','Ascoli'];
const report={status:'STARTED',cases:[],methodErrors:[],goldenCopiedControls:[],limits:'Seven positive cases. Historical reference freezes only old bc616 Engine,4fca pool and772 coaching; other dependencies are selected current. Saved-choice goldens are exact captured pre-product accepted outputs, not reference recompilations. Retained coursework flags are labelled presentation inputs, not earned progression. Module initialization is excluded and unmeasured. Modern future catalogue RNG intentionally changes.'};
fs.mkdirSync(OUT,{recursive:true});const json=(name,value)=>fs.writeFileSync(path.join(OUT,name+'.json'),JSON.stringify(value,null,2)),flush=()=>json('report',report),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'serieb-fixed-'));
globalThis.localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{},clear:()=>{}};
let spec,mod,old,E,S,names,markers,sourceMap;
function taped(seed,action,forced=[]){
 const real=Math.random,now=Date.now,draws=[];let n=seed>>>0,at=0;
 const next=()=>{if(at<forced.length)return forced[at++];n+=0x6D2B79F5;let t=n;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};
 Math.random=()=>{const v=next();draws.push(v);return v;};Date.now=()=>NOW;
 try{return{value:action(),draws,next:next()};}finally{Math.random=real;Date.now=now;}
}
function stateCall(module,input,seed,action,forced=[]){
 const before=module.save.serializeSoccerCareerSave(input),run=taped(seed,()=>action(input),forced);
 return{...run,raw:module.save.serializeSoccerCareerSave(run.value),before,after:module.save.serializeSoccerCareerSave(input),sameIdentity:run.value===input};
}
function sameState(a,b,m){assert.deepEqual(a.value,b.value,m);assert.equal(a.raw,b.raw,m);assert.deepEqual(a.draws,b.draws,m);assert.equal(a.next,b.next,m);assert.equal(a.after,a.before,m);assert.equal(b.after,b.before,m);}
const strip=quotes=>quotes.map(({source,...quote})=>quote);
function pinned(rel){
 const pin=spec.retained.find(x=>x.path===rel);if(!pin)throw new Error('Missing immutable input pin '+rel);
 const b=fs.readFileSync(rel);assert.equal(sha(b),pin.sha256,'Immutable input '+rel);assert.equal(b.length,pin.bytes,'Immutable bytes '+rel);return b;
}
function offerIn(state,kind,slot){
 if(kind==='club-loan')return state.pendingLoanOffers?.[Number(slot)];
 const t=state.transferSituation;if(!t)return undefined;
 if(slot==='offer'||slot==='offerA'||slot==='offerB')return t[slot];
 if(slot.startsWith('offers.'))return t.offers?.[Number(slot.slice(7))];
 return undefined;
}
function assertCaptured(actual,golden,raw){
 assert.equal(actual.before,raw,'SERIEB_GOLDEN_INPUT: exact original bytes');
 assert.equal(actual.after,raw,'SERIEB_GOLDEN_INPUT: acceptance input held');
 assert.deepEqual(actual.value,golden.loaded.value.value,'SERIEB_GOLDEN_TYPED: full captured accepted state');
 assert.equal(actual.raw,golden.loaded.value.raw,'SERIEB_GOLDEN_RAW: full captured accepted bytes');
 assert.deepEqual(actual.draws,golden.loaded.draws,'SERIEB_GOLDEN_DRAWS: captured action tape');
 assert.equal(actual.next,golden.loaded.next,'SERIEB_GOLDEN_NEXT: captured next draw');
}
async function test(index,action){
 const row={index,name:names[index],marker:markers[index],status:'STARTED'};report.cases.push(row);flush();
 try{await action(row);row.status='passed';}catch(e){row.status=e?.name==='AssertionError'?'failed':'method-error';row.error={name:e?.name,message:e?.message,stack:e?.stack};if(row.status==='method-error')report.methodErrors.push(row.error);}
 json('case-'+(index+1),row);flush();
}
try{
 const selected=fs.readFileSync(SPEC);assert.equal(sha(selected),SPEC_SHA,'Selected immutable fixed-input descriptor');spec=JSON.parse(selected);
 if(!spec.ready||!(/^[a-f0-9]{64}$/).test(spec.productManifestSHA256)||!(/^[a-f0-9]{64}$/).test(spec.generatedSHA256))throw new Error('FIXED_INPUTS_PENDING: actual generator and complete product manifest are not selected');
 const pb=fs.readFileSync(spec.productManifestPath);assert.equal(sha(pb),spec.productManifestSHA256,'Selected complete product manifest');const product=JSON.parse(pb);
 assert.equal(product.files.length,8,'Exactly eight product bodies');for(const f of product.files)assert.equal(f.sha256,spec.critical.find(x=>x.path===f.path)?.sha256,'Immutable product binding '+f.path);
 assert.equal(product.files.find(x=>x.path==='src/data/soccerCareerClubPool.ts')?.sha256,spec.generatedSHA256,'Selected admitted generated body');
 const paths=[...new Set([...spec.critical.map(x=>x.path),...spec.retained.map(x=>x.path),SPEC,spec.productManifestPath,'scripts/qa/serieBReleaseFixed.mjs'])];
 sourceMap=()=>Object.fromEntries(paths.map(p=>[p,sha(fs.readFileSync(p))]));report.sourceBefore=sourceMap();report.product=product;names=spec.cases;markers=spec.markers;
 for(const p of spec.retained)pinned(p.path);
 const engineBefore=pinned(Q+'original/soccerCareerEngine.ts').toString('utf8'),poolBefore=pinned(Q+'original/soccerCareerClubPool.ts').toString('utf8'),coachingBefore=pinned(Q+'original/soccerCareerCoachingStart.ts').toString('utf8');
 const extra={pool:'data/soccerCareerClubPool.ts',league:'lib/soccerCareerLeague.ts',format:'data/leagueFormat.ts',derby:'lib/soccerCareerDerby.ts',coaching:'lib/soccerCareerCoachingStart.ts',loyalty:'lib/soccerCareerLoyalty.ts'};
 mod=await bundleCareerSources({root:ROOT,tmpDir:tmp,extra});
 old=await bundleCareerSources({root:ROOT,tmpDir:tmp,transforms:{'lib/soccerCareerEngine.ts':()=>engineBefore,'data/soccerCareerClubPool.ts':()=>poolBefore,'lib/soccerCareerCoachingStart.ts':()=>coachingBefore},extra});
 E=mod.engine;S=mod.save;const C=mod.coaching,OC=old.coaching,oldPool=old.engine.FALLBACK_CLUBS,oldIds=new Set(oldPool.map(c=>c.id));
 const added=mod.pool.CAREER_CLUB_POOL.filter(c=>!oldIds.has(c.id)),addedIds=new Set(added.map(c=>c.id)),addedNames=new Set(added.map(c=>c.name)),appended=[...oldPool,...added];
 const oldL2=old.pool.CAREER_CLUB_POOL.filter(c=>c.league==='Ligue 2'&&old.pool.CAREER_POOL_SINCE[c.name]===2026),l2Ids=new Set(oldL2.map(c=>c.id));
 const fixture=JSON.parse(pinned(Q+'retained/fixtures.json')),historical=fixture.value.retired,firstYear=(historical.seasons[historical.seasons.length-1]?.year??2024)+1;
 const modern=JSON.parse(pinned(Q+'retained/modern-fixture.json')),modernState=modern.value,modernYear=(modernState.seasons[modernState.seasons.length-1]?.year??2024)+1;
 assert(firstYear<2026&&S.isSoccerCareerSave(historical),'Actual retained historical source state');assert(modernYear>=2026&&S.isSoccerCareerSave(modernState),'Actual retained modern source state');
 const ledger=JSON.parse(pinned(Q+'research/COLOUR-WORD-LEDGER.json')),palette=JSON.parse(pinned(Q+'research/PALETTE-DESIGN.json')),facts=JSON.parse(fs.readFileSync('scripts/data/soccerCareerFacts.json','utf8')),inputs=poolInputs(mod),nantes=E.HAND_CLUBS.find(c=>c.id==='fb-70');
 report.inputs={oldPoolCount:oldPool.length,oldGeneratedCount:old.pool.CAREER_CLUB_POOL.length,oldL2DeniedIds:[...l2Ids],firstYear,modernYear,historical,modern:modernState,added,referenceScope:spec.referenceScope};json('inputs',report.inputs);
 await test(0,row=>{
  const m=markers[0],modernClubs=mod.eras.adjustClubsForYear(E.FALLBACK_CLUBS,2026).filter(c=>c.league===LABEL),census=[],early=[];
  for(let year=1980;year<=2030;year++){
   const oldDenied=oldPool.filter(c=>!old.engine.managerEntryClubInYear(c,year)).map(c=>c.id),denied=E.FALLBACK_CLUBS.filter(c=>!E.managerEntryClubInYear(c,year)).map(c=>c.id);
   census.push({year,oldDenied,denied,delta:denied.filter(id=>!oldDenied.includes(id))});
   if(year<2026){const leaked=mod.eras.adjustClubsForYear(E.FALLBACK_CLUBS,year).filter(c=>addedIds.has(c.id)).map(c=>c.id);if(leaked.length)early.push({year,leaked});}
  }
  row.observation={added,modern:modernClubs,early,census,provenance:palette.selections.map(c=>({club:c.careerName,actual:facts.clubColours.clubs[c.careerName],cmColour:inputs.colorOf(c.cmName)}))};
  assert.equal(added.length,20,m);assert.equal(addedIds.size,20,m);assert.equal(mod.pool.CAREER_CLUB_POOL.length,307,m);assert.deepEqual(sort(added.map(c=>c.name)),sort(EXPECTED),m);
  assert.deepEqual(sort(modernClubs.map(c=>c.name)),sort(EXPECTED),m);assert.equal(new Set(modernClubs.map(c=>c.id)).size,20,m);assert.deepEqual(early,[],m);
  for(const c of added){assert.equal(c.country,'Italy',m);assert.equal(c.tier,4,m);assert.equal(mod.pool.CAREER_POOL_SINCE[c.name],2026,m);}
  for(const c of census){
   assert.deepEqual(sort(c.oldDenied),c.year<2026?sort([...l2Ids]):[],m);
   assert.deepEqual(sort(c.denied),c.year<2026?sort([...l2Ids,...addedIds]):[],m);
   assert.deepEqual(sort(c.delta),c.year<2026?sort([...addedIds]):[],m);
  }
  assert(E.managerEntryClubInYear(null,2025)&&E.managerEntryClubInYear(undefined,2025),m);
  for(const c of palette.selections){
   const actual=facts.clubColours.clubs[c.careerName],sealed=ledger.clubs.find(x=>x.careerName===c.careerName);
   assert(actual&&actual.sources.length===2&&sealed,m);assert.equal(actual.colour,sealed.words.join(' and '),m);
   assert.equal(actual.hex,c.hex,m);assert.equal(inputs.colorOf(c.cmName),c.hex,m);
   assert.equal(new Set(actual.sources.map(x=>x.publisherGroup)).size,2,m);
   const expected=sealed.sources.map(x=>({url:x.url,publisher:x.publisher,publisherGroup:x.publisherGroup,read:ledger.readDate,
    says:[x.quote,x.secondQuote,x.thirdQuote].filter(Boolean).join('; '),access:x.access,...(x.published?{published:x.published}:{}),locator:x.locator}));
   assert.deepEqual(actual.sources,expected,m);
  }
  const fresh=deriveCareerClubPool({...inputs,since:facts.clubSince});row.observation.derived={rows:fresh.rows,poolSince:fresh.poolSince};
  assert.deepEqual(mod.pool.CAREER_CLUB_POOL,fresh.rows,m);assert.deepEqual(mod.pool.CAREER_POOL_SINCE,fresh.poolSince,m);
  const witnesses=[],attempts=[],found=new Set(),low={pace:45,shooting:45,passing:45,dribbling:45,defending:45,physical:45,reflexes:45};
  for(let attempt=0;attempt<spec.boots.ceiling&&found.size<20;attempt++){
   const seed=40000+attempt,constructor=taped(seed,()=>{
    let s=E.initCareer('SerieB Pool Boot',spec.boots.nationality,'CM','2020s',low,45,2026,E.FALLBACK_CLUBS,null,55),steps=0;
    while(s.phase==='youth'&&steps++<12)s=E.advanceYouthYear(s,E.FALLBACK_CLUBS);
    assert(s.phase==='contract_offer'&&s.pendingOffers?.length,'Actual full-pool constructor reaches offers');return s;
   });
   attempts.push({seed,phase:constructor.value.phase,offered:constructor.value.pendingOffers.map(o=>({id:o.club.id,name:o.club.name,league:o.club.league})),draws:constructor.draws.length,next:constructor.next});
   for(const [offerIndex,offer] of constructor.value.pendingOffers.entries()){
    if(offer.club.league!==LABEL||found.has(offer.club.name))continue;
    const accepted=stateCall(mod,copy(constructor.value),50000+attempt*4+offerIndex,s=>E.acceptOffer(s,s.pendingOffers[offerIndex]));
    const normalized=E.repairCareer(copy(accepted.value)),saved=S.serializeSoccerCareerSave(normalized),loaded=E.repairCareer(S.parseSoccerCareerSave(saved));
    const witness={seed,offerIndex,constructor,offer,accepted,normalized,saved,loaded,loadedRaw:S.serializeSoccerCareerSave(loaded)};witnesses.push(witness);json('boot-'+witnesses.length,witness);
    assert(S.isSoccerCareerSave(loaded)&&loaded.phase==='playing',m);assert.equal(loaded.currentClub,offer.club.name,m);assert.equal(loaded.currentClubColor,offer.club.color,m);
    assert.equal(loaded.currentLeague,LABEL,m);assert.equal(loaded.contractYearsLeft,offer.contractYears,m);assert.equal(witness.loadedRaw,saved,m);assert.deepEqual(loaded,normalized,m);found.add(offer.club.name);
   }
  }
  row.observation.boots={seedCeiling:spec.boots.ceiling,creationNationality:spec.boots.nationality,attempts,witnessCount:witnesses.length,names:sort([...found]),scope:'Twenty successful actual full-pool constructor/offer/accept/officialcodec witnesses; no club, phase, rating, offer or contract injection.'};
  assert.deepEqual(sort([...found]),sort(EXPECTED),m);assert.equal(witnesses.length,20,m);
 });
 await test(1,row=>{
  const m=markers[1],groups=mod.pool.CAREER_LEAGUE_LADDER[LABEL],flat=Array.isArray(groups)&&groups.every(Array.isArray)?groups.flat():[];
  row.observation={groups,flat,oldLadders:old.pool.CAREER_LEAGUE_LADDER};
  assert.deepEqual(sort(flat),sort(EXPECTED),m);assert.equal(new Set(flat).size,20,m);assert.equal(Object.keys(mod.pool.CAREER_LEAGUE_LADDER).length,24,m);
  for(const [league,ladder] of Object.entries(old.pool.CAREER_LEAGUE_LADDER))assert.deepEqual(mod.pool.CAREER_LEAGUE_LADDER[league],ladder,m);
  const fresh=deriveCareerClubPool({...inputs,since:facts.clubSince});assert.deepEqual(groups,fresh.ladder[LABEL],m);
 });
 await test(2,row=>{
  const m=markers[2],at=year=>{const size=mod.league.leagueSizeFor(LABEL,year);return{year,size,dugout:mod.league.leagueSizeFor(LABEL,year,true),points:mod.format.leagueFormatFor(LABEL,year),meetings:mod.derby.derbyMeetings(LABEL,year),games:size===null?null:2*(size-1)};};
  row.observation={old:at(2025),modern:at(2026),later:at(2030),evidence:facts.leagueWorld[LABEL]};
  assert.deepEqual(row.observation.old,{year:2025,size:null,dugout:null,points:null,meetings:null,games:null},m);
  for(const r of [row.observation.modern,row.observation.later])assert.deepEqual(r,{year:r.year,size:20,dugout:20,points:{win:3,draw:1,loss:0},meetings:2,games:38},m);
  assert.deepEqual(sort(facts.leagueWorld[LABEL].members),sort(EXPECTED),m);assert.equal(facts.leagueWorld[LABEL].games,38,m);assert.equal(2*(20-1),38,m);
  for(const source of ledger.format.newSources)assert(facts.leagueWorld[LABEL].format.some(x=>x.url===source.url),m);
  assert(facts.leagueWorld[LABEL].format.some(x=>x.url===ledger.format.existingWitness.url),m);
 });
 await test(3,row=>{
  const m=markers[3],oldEligible=oldPool.filter(c=>c.tier>=3&&old.engine.managerEntryClubInYear(c,firstYear)),N=oldEligible.length,u=(N+0.5)/(N+added.length);
  const eligible=appended.filter(c=>c.tier>=3&&E.managerEntryClubInYear(c,firstYear));
  row.observation={N,u,oldEligibleIds:oldEligible.map(c=>c.id),candidateEligibleIds:eligible.map(c=>c.id),historical:[],modern:null};
  for(const seed of [4004,4104]){
   const reference=stateCall(old,copy(historical),seed,s=>old.engine.choosePostRetirement(s,'manager',oldPool),[u]);
   const actual=stateCall(mod,copy(historical),seed,s=>E.choosePostRetirement(s,'manager',appended),[u]);
   row.observation.historical.push({seed,reference,actual});assert(reference.value.managerState&&!addedNames.has(reference.value.managerState.club),m);sameState(actual,reference,m);assert.equal(actual.draws.length,1,m);
  }
  assert.deepEqual(eligible,oldEligible,m);
  const modernEligible=oldPool.filter(c=>c.tier>=3&&old.engine.managerEntryClubInYear(c,modernYear)),modernN=modernEligible.length,modernU=(modernN+0.5)/(modernN+added.length);
  const reference=stateCall(old,copy(modernState),4204,s=>old.engine.choosePostRetirement(s,'manager',appended),[modernU]);
  const actual=stateCall(mod,copy(modernState),4204,s=>E.choosePostRetirement(s,'manager',appended),[modernU]);
  row.observation.modern={modernN,modernU,reference,actual};sameState(actual,reference,m);assert.equal(actual.value.managerState.club,added[0].name,m);assert.equal(actual.draws.length,1,m);
 });
 await test(4,row=>{
  const m=markers[4],h=copy(historical),bounded=[nantes,...added],before=S.serializeSoccerCareerSave(h);
  const originalRead=taped(5004,()=>OC.coachingStartChoices(h,bounded)),request=originalRead.value.find(q=>addedIds.has(q.clubId));
  assert(request&&request.source===h&&originalRead.value.filter(q=>addedIds.has(q.clubId)).length>=2,'Genuine old772 helper current-colour quote on SAME historical object');
  const requested=added.find(c=>c.id===request.clubId);assert.equal(JSON.parse(request.seal).at(-1),requested.color,'Actual selected new colour, not obsolete grey or a mismatched source seal');
  const read=taped(5005,()=>C.coachingStartChoices(h,bounded)),commit=stateCall(mod,h,5006,s=>C.startCoachingAppointment(s,bounded,request));
  row.observation={historical:h,before,originalRead:{...originalRead,value:strip(originalRead.value)},request:{...request,source:'SAME historical object'},read:{...read,value:strip(read.value)},commit,oldPool:null,validHistorical:null,modern:null,malformed:null};
  assert(read.value.every(q=>!addedIds.has(q.clubId))&&commit.sameIdentity&&commit.draws.length===0,m);assert.equal(commit.after,before,m);
  const currentOld=taped(5010,()=>C.coachingStartChoices(h,oldPool)),referenceOld=taped(5010,()=>OC.coachingStartChoices(h,oldPool));
  row.observation.oldPool={current:{...currentOld,value:strip(currentOld.value)},reference:{...referenceOld,value:strip(referenceOld.value)}};assert.deepEqual(row.observation.oldPool.current,row.observation.oldPool.reference,m);
  const valid=C.coachingStartChoices(h,bounded)[0];assert(valid&&valid.source===h&&valid.clubId===nantes.id,m);
  const accepted=stateCall(mod,h,5011,s=>C.startCoachingAppointment(s,bounded,valid)),canonical=stateCall(old,copy(h),5011,s=>old.engine.choosePostRetirement(s,'manager',[nantes]));
  row.observation.validHistorical={accepted,canonical};sameState(accepted,canonical,m);assert.equal(accepted.draws.length,1,m);
  const mh=copy(modernState),mq=C.coachingStartChoices(mh,bounded),oq=OC.coachingStartChoices(mh,bounded),newQuote=mq.find(q=>addedIds.has(q.clubId));
  assert(newQuote&&newQuote.source===mh,m);assert.deepEqual(strip(mq),strip(oq),m);
  const club=added.find(c=>c.id===newQuote.clubId),acceptedModern=stateCall(mod,mh,5020,s=>C.startCoachingAppointment(s,bounded,newQuote)),canonicalModern=stateCall(old,copy(mh),5020,s=>old.engine.choosePostRetirement(s,'manager',[club]));
  row.observation.modern={choices:strip(mq),oldChoices:strip(oq),accepted:acceptedModern,canonical:canonicalModern};sameState(acceptedModern,canonicalModern,m);assert.equal(acceptedModern.draws.length,1,m);assert.equal(acceptedModern.value.managerState.club,club.name,m);
  const malformed=[null,undefined,{},false,nantes],a=taped(5030,()=>C.coachingStartChoices(h,malformed)),b=taped(5030,()=>OC.coachingStartChoices(h,malformed));
  row.observation.malformed={actual:{...a,value:strip(a.value)},reference:{...b,value:strip(b.value)}};assert.deepEqual(row.observation.malformed.actual,row.observation.malformed.reference,m);assert.equal(S.serializeSoccerCareerSave(h),before,m);
 });
 await test(5,row=>{
  const m=markers[5],shape=E.HAND_CLUBS.map(c=>[c.id,c.name,c.country,c.tier,c.color,c.league]),years=[];
  row.observation={handCount:E.HAND_CLUBS.length,oldPoolCount:oldPool.length,oldGeneratedCount:old.pool.CAREER_CLUB_POOL.length,newGeneratedCount:mod.pool.CAREER_CLUB_POOL.length,fingerprint:sha(JSON.stringify(shape)).slice(0,16),oldGenerated:old.pool.CAREER_CLUB_POOL,heldGenerated:mod.pool.CAREER_CLUB_POOL.filter(c=>oldIds.has(c.id)),years};
  assert.equal(shape.length,190,m);assert.equal(row.observation.fingerprint,'e12e673153af2568',m);assert.deepEqual(E.HAND_CLUBS,old.engine.HAND_CLUBS,m);
  assert.equal(oldPool.length,477,m);assert.equal(old.pool.CAREER_CLUB_POOL.length,287,m);assert.equal(Object.keys(old.pool.CAREER_LEAGUE_LADDER).length,23,m);assert.equal(l2Ids.size,17,m);
  assert.deepEqual(E.FALLBACK_CLUBS.slice(0,190),old.engine.HAND_CLUBS,m);assert.deepEqual(row.observation.heldGenerated,old.pool.CAREER_CLUB_POOL,m);assert.deepEqual(E.FALLBACK_CLUBS.filter(c=>oldIds.has(c.id)),oldPool,m);
  for(const [league,groups] of Object.entries(old.pool.CAREER_LEAGUE_LADDER))assert.deepEqual(mod.pool.CAREER_LEAGUE_LADDER[league],groups,m);
  for(const [name,since] of Object.entries(old.pool.CAREER_POOL_SINCE))assert.equal(mod.pool.CAREER_POOL_SINCE[name],since,m);
  for(let year=1980;year<=2030;year++){
   const actualDenied=oldPool.filter(c=>!E.managerEntryClubInYear(c,year)).map(c=>c.id),referenceDenied=oldPool.filter(c=>!old.engine.managerEntryClubInYear(c,year)).map(c=>c.id);
   const actualEra=mod.eras.adjustClubsForYear(E.FALLBACK_CLUBS,year).filter(c=>oldIds.has(c.id)),referenceEra=old.eras.adjustClubsForYear(oldPool,year);
   years.push({year,actualDenied,referenceDenied,actualEra,referenceEra});assert.deepEqual(actualDenied,referenceDenied,m);assert.deepEqual(sort(actualDenied),year<2026?sort([...l2Ids]):[],m);assert.deepEqual(actualEra,referenceEra,m);
  }
  const h=copy(historical),before=S.serializeSoccerCareerSave(h),reference=stateCall(old,copy(h),6001,s=>old.engine.choosePostRetirement(s,'manager',oldPool));
  const read=taped(6002,()=>C.coachingStartChoices(h,oldPool)),afterRead=stateCall(mod,h,6001,s=>E.choosePostRetirement(s,'manager',oldPool)),oldRead=taped(6002,()=>OC.coachingStartChoices(h,oldPool));
  row.observation.defaultAndRead={reference,read:{...read,value:strip(read.value)},oldRead:{...oldRead,value:strip(oldRead.value)},afterRead,before,after:S.serializeSoccerCareerSave(h)};
  assert.equal(read.draws.length,0,m);assert.deepEqual(row.observation.defaultAndRead.read,row.observation.defaultAndRead.oldRead,m);sameState(afterRead,reference,m);assert.equal(S.serializeSoccerCareerSave(h),before,m);
 });
 await test(6,row=>{
  const m=markers[6],frenchRaw=pinned(Q+'retained/old-generic.save.txt').toString('utf8'),french=E.repairCareer(S.parseSoccerCareerSave(frenchRaw)),oldFrench=old.engine.repairCareer(old.save.parseSoccerCareerSave(frenchRaw));
  assert(S.isSoccerCareerSave(french)&&french.pendingOffers?.length===1,m);assert.equal(S.serializeSoccerCareerSave(french),frenchRaw,m);assert.deepEqual(french,oldFrench,m);
  assert.equal(french.pendingOffers[0].club.id,'career-lower-saint-etienne',m);assert.equal(french.pendingOffers[0].club.name,'Saint-Étienne',m);assert.equal(french.pendingOffers[0].club.color,'#64748b',m);
  const frenchActual=stateCall(mod,copy(french),7008,s=>E.acceptOffer(s,s.pendingOffers[0])),frenchReference=stateCall(old,copy(oldFrench),7008,s=>old.engine.acceptOffer(s,s.pendingOffers[0]));
  row.observation={french:{raw:frenchRaw,loaded:french,actual:frenchActual,reference:frenchReference,scope:'Original French81777 is additional generic preservation only; this reference arm is not a Serie B golden output.'},golden:[],copiedControls:report.goldenCopiedControls};sameState(frenchActual,frenchReference,m);
  for(const origin of spec.goldenOrigins){
   const raw=pinned(origin.raw).toString('utf8'),golden=JSON.parse(pinned(origin.golden)),loaded=E.repairCareer(S.parseSoccerCareerSave(raw));
   assert.equal(sha(raw),origin.rawSHA256,m);assert.equal(golden.sourceRecordSHA256,origin.originalRecordSHA256,m);assert.equal(golden.seed,origin.recordedSeed,m);
   assert.equal(golden.rawSHA256,origin.rawSHA256,m);assert(S.isSoccerCareerSave(loaded)&&loaded.phase==='transfer_window',m);
   assert.equal(S.serializeSoccerCareerSave(loaded),raw,m);assert.deepEqual(loaded,golden.sourceState,m);assert.equal(golden.loaded.value.before,raw,m);assert.equal(golden.loaded.value.inputAfter,raw,m);
   const offer=offerIn(loaded,golden.kind,golden.slot);assert.deepEqual(offer,golden.offer,m);assert.equal(offer.club.league,LABEL,m);assert.equal(offer.club.country,'Italy',m);assert(offer.club.id.startsWith('career-lower-'),m);assert.equal(offer.club.color,'#64748b',m);
   const actual=stateCall(mod,loaded,golden.seed,s=>golden.kind==='club-loan'?E.acceptLoan(s,offerIn(s,golden.kind,golden.slot)):E.acceptOffer(s,offerIn(s,golden.kind,golden.slot)));
   const retained={kind:golden.kind,raw,sourceRecordSHA256:golden.sourceRecordSHA256,seed:golden.seed,offer,loaded,actual,golden:golden.loaded};row.observation.golden.push(retained);json('golden-'+golden.kind,retained);
   assertCaptured(actual,golden,raw);
  }
  assert.deepEqual(sort(row.observation.golden.map(x=>x.kind)),['club-loan','elected-loyalty','permanent-transfer'],m);
  const selected=row.observation.golden.find(x=>x.kind==='elected-loyalty'),origin=spec.goldenOrigins.find(x=>x.kind==='elected-loyalty'),golden=JSON.parse(pinned(origin.golden));
  assert(mod.loyalty.readLoyalty(selected.loaded)?.pending,m);
  const controls=[
   {id:'COPIED accepted typed field',prefix:'SERIEB_GOLDEN_TYPED:',change:a=>{a.value.weeklyWage+=1;}},
   {id:'COPIED accepted raw bytes',prefix:'SERIEB_GOLDEN_RAW:',change:a=>{a.raw+=' ';}},
   {id:'COPIED accepted draw vector',prefix:'SERIEB_GOLDEN_DRAWS:',change:a=>{a.draws.push(0.25);}},
   {id:'COPIED accepted next draw',prefix:'SERIEB_GOLDEN_NEXT:',change:a=>{a.next=a.next===0?1:0;}}
  ];
  for(const control of controls){
   const changed=copy(selected.actual),before=JSON.stringify(changed);control.change(changed);const after=JSON.stringify(changed);assert.notEqual(after,before,'Effective '+control.id);
   let rejection=null;try{assertCaptured(changed,golden,selected.raw);}catch(e){assert.equal(e.name,'AssertionError',control.id+' assertion only');assert(e.message.startsWith(control.prefix),control.id+' specific refusal');rejection={name:e.name,message:e.message};}
   assert(rejection,control.id+' rejected');const restored=JSON.parse(before);Object.keys(changed).forEach(k=>delete changed[k]);Object.assign(changed,restored);
   assert.equal(JSON.stringify(changed),before,control.id+' exact same-copy restoration');assertCaptured(changed,golden,selected.raw);
   const record={id:control.id,classification:'COPIED accepted-output observation, not a physical source fault',before,changed:after,rejection,restored:JSON.stringify(changed),readmitted:true};
   json('golden-control-'+(report.goldenCopiedControls.length+1),record);report.goldenCopiedControls.push({id:control.id,changed:true,rejection,exactSameCopyRestored:true,readmitted:true});
  }
 });
 const bundleDir=path.join(OUT,'bundles');fs.mkdirSync(bundleDir,{recursive:true});
 report.bundles=fs.readdirSync(tmp).filter(n=>n.endsWith('.mjs')).map(name=>{const b=fs.readFileSync(path.join(tmp,name));fs.writeFileSync(path.join(bundleDir,name),b);return{name,bytes:b.length,sha256:sha(b)};});
 report.sourceAfter=sourceMap();assert.deepEqual(report.sourceAfter,report.sourceBefore,'Every canonical and immutable source held within this run');assert.deepEqual(report.cases.map(x=>x.name),names);
 report.totals={cases:7,passed:report.cases.filter(x=>x.status==='passed').length,failed:report.cases.filter(x=>x.status==='failed').length,methodErrors:report.methodErrors.length,goldenCopiedControls:report.goldenCopiedControls.length};
 report.status=report.methodErrors.length?'METHOD_ERROR':report.totals.failed?'ASSERTION_RED':'PASSED';
 if(report.status==='PASSED')assert.equal(report.goldenCopiedControls.length,4,'Four effective copied captured-output controls');
 flush();console.log('SERIEB_FIXED: 7 cases; '+report.totals.passed+' passed; '+report.totals.failed+' assertion failures; '+report.totals.methodErrors+' method errors; '+report.goldenCopiedControls.length+' COPIED golden controls; source held');
 process.exitCode=report.methodErrors.length?2:report.totals.failed?1:0;
}catch(e){report.status='METHOD_ERROR';report.infrastructure={name:e?.name,message:e?.message,stack:e?.stack};flush();console.error('SERIEB_FIXED_METHOD_ERROR: '+e?.message);process.exitCode=2;}
finally{fs.rmSync(tmp,{recursive:true,force:true});}
