import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {bundleCareerSources} from '../lib/careerClubPool.mjs';
assert(process.env.CI,'Remote CI only');
const ROOT=process.cwd(),OUT=path.resolve(process.env.SC_SERIEB_FIXTURES_OUT||'serieb-fixture-artifacts/acquisition');
const SELECTOR='qa/sc-serieb-release-v1/FIXTURE-ACQUISITION-SOURCE.json',SELECTOR_SHA='ab23168104f8598a8fc7fb82d2a0fb460064773e027221c17974b35f9e095cad';
const NOW=1791586800000,sha=b=>createHash('sha256').update(b).digest('hex'),copy=x=>structuredClone(x);
fs.mkdirSync(OUT,{recursive:true});
const write=(name,value)=>fs.writeFileSync(path.join(OUT,name),typeof value==='string'?value:JSON.stringify(value,null,2));
const report={status:'STARTED',witnesses:[],attempts:[],copiedControls:[],limits:'Actual pre-product Serie B later choices from one source-vetted L2 engine. Separate acquisition, not baseline or global qualification. No injected saved fields. Action tapes include global draws and next; module initialization is excluded and unmeasured.'};
const flush=()=>write('report.json',report),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'serieb-old-choices-'));
globalThis.localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{},clear:()=>{}};
function taped(seed,fn){
 const oldRandom=Math.random,oldNow=Date.now,draws=[];let n=seed>>>0;
 const next=()=>{n+=0x6D2B79F5;let t=n;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};
 Math.random=()=>{const v=next();draws.push(v);return v;};Date.now=()=>NOW;
 try{return{value:fn(draws),draws,next:next()};}finally{Math.random=oldRandom;Date.now=oldNow;}
}
function permanentOffers(state){
 const t=state.transferSituation;
 if(state.phase!=='transfer_window'||!t)return[];
 if(['one_offer','dream_club','request_result'].includes(t.type))return t.offer?[{slot:'offer',offer:t.offer}]:[];
 if(t.type==='bidding_war')return[{slot:'offerA',offer:t.offerA},{slot:'offerB',offer:t.offerB}].filter(x=>x.offer);
 if(t.type==='contract_expiry')return(t.offers||[]).map((offer,index)=>({slot:'offers.'+index,offer}));
 return[];
}
let E,S,L,Life,World,selector,serieBKeys;
const rawOf=s=>S.serializeSoccerCareerSave(s);
function isSerieB(offer){
 return !!offer&&offer.club?.league==='Serie B'&&offer.club?.country==='Italy'
  &&serieBKeys.has(World.clubKeyOf(offer.club.name))&&typeof offer.club.id==='string'
  &&offer.club.id.startsWith('career-lower-');
}
function brief(state){
 return{phase:state.phase,age:state.age,overall:state.overall,club:state.currentClub,league:state.currentLeague,contractYears:state.contractYearsLeft,lastYear:state.seasons[state.seasons.length-1]?.year,
  transferType:state.transferSituation?.type,permanent:permanentOffers(state).map(x=>({slot:x.slot,club:x.offer.club.name,league:x.offer.club.league,id:x.offer.club.id,years:x.offer.contractYears})),
  loans:(state.pendingLoanOffers||[]).map(o=>({club:o.club.name,league:o.club.league,id:o.club.id}))};
}
function storedOffer(state,kind,slot){
 if(kind==='club-loan')return state.pendingLoanOffers?.[Number(slot)];
 return permanentOffers(state).find(x=>x.slot===slot)?.offer;
}
function applyAction(trace,draws,name,state,fn){
 const input=state===null?null:copy(state),before=input===null?null:rawOf(input),start=draws.length;
 const next=fn(input),afterInput=input===null?null:rawOf(input),after=rawOf(next);
 trace.push({name,drawStart:start,drawEnd:draws.length,beforeRaw:before,inputAfterRaw:afterInput,afterRaw:after,after:brief(next)});
 return next;
}
function annualWindow(state,trace,draws){
 let s=applyAction(trace,draws,'advanceProSeason',state,x=>E.advanceProSeason(x,E.FALLBACK_CLUBS));
 for(let step=0;step<selector.search.maxAnnualDismissals;step++){
  if(s.phase==='transfer_window')return{state:s};
  const methods={newspaper:'dismissNewspaper',season_summary:'dismissSummary',ballon_dor:'dismissBallonDor',
   international_debut:'dismissDebut',world_cup:'dismissWorldCup',rivalry_event:'dismissRivalryEvent',
   social_media_action:'dismissSocialMediaPhase',random_events:'applyEventChoice',red_card_appeal_result:'dismissAppealResult'};
  if(s.phase==='moral_dilemma'){
   s=applyAction(trace,draws,'applyMoralDilemmaChoice:0',s,x=>E.applyMoralDilemmaChoice(x,0));
   s=applyAction(trace,draws,'dismissMoralDilemma',s,x=>E.dismissMoralDilemma(x,E.FALLBACK_CLUBS));continue;
  }
  const method=methods[s.phase];if(!method)return{state:null,stopped:s.phase};
  s=applyAction(trace,draws,method+(method==='applyEventChoice'?':0':''),s,x=>
   method==='dismissNewspaper'?E[method](x):method==='applyEventChoice'?E[method](x,0,E.FALLBACK_CLUBS):E[method](x,E.FALLBACK_CLUBS));
 }
 return{state:null,stopped:'bounded48-dismissal-limit'};
}
function searchSeed(seed){
 return taped(seed,draws=>{
  const trace=[],c=selector.constructor,stats=Object.fromEntries(['pace','shooting','passing','dribbling','defending','physical','reflexes'].map(k=>[k,c.stats]));
  let s=applyAction(trace,draws,'initCareer',null,()=>E.initCareer(c.name,c.nationality,c.position,c.era,stats,c.overall,c.startYear,E.FALLBACK_CLUBS,null,c.potential));
  for(let year=0;s.phase==='youth'&&year<selector.search.maxYouthYears;year++)s=applyAction(trace,draws,'advanceYouthYear',s,x=>E.advanceYouthYear(x,E.FALLBACK_CLUBS));
  assert.equal(s.phase,'contract_offer','Actual constructor reaches initial offers');
  const index=s.pendingOffers.findIndex(o=>o.isHomegrown&&o.club.tier===2&&o.contractYears>=3&&E.projectLeagueApps(s.overall,2,o.club.name,0).max<24);
  if(index<0)return{stopped:'no-genuine-fringe-homegrown',trace,state:null};
  const initialOffer=copy(s.pendingOffers[index]);
  s=applyAction(trace,draws,'acceptOffer:initial-homegrown',s,x=>E.acceptOffer(x,x.pendingOffers[index]));
  s=applyAction(trace,draws,'repairCareer:after-initial-accept',s,x=>E.repairCareer(x));
  assert.equal(s.phase,'playing','Actual initial acceptance reaches playing');
  const annual=annualWindow(s,trace,draws);
  if(!annual.state)return{stopped:annual.stopped,trace,state:null,initialOffer};
  return{state:copy(annual.state),trace,initialOffer};
 });
}
function acceptance(state,kind,slot,seed){
 return taped(seed,draws=>{
  const before=rawOf(state),input=copy(state),offer=storedOffer(input,kind,slot);
  assert(offer,'Retained actual offer exists');
  const value=kind==='club-loan'?E.acceptLoan(input,offer):E.acceptOffer(input,offer);
  return{before,inputAfter:rawOf(input),value,raw:rawOf(value)};
 });
}
function validateWitness(w){
 assert(isSerieB(w.offer),'SERIEB_FIXTURE_MEMBERSHIP: actual current old generic Serie B offer');
 assert.equal(w.state.phase,'transfer_window','SERIEB_FIXTURE_STATE: natural later window');
 assert.deepEqual(storedOffer(w.state,w.kind,w.slot),w.offer,'SERIEB_FIXTURE_STATE: exact stored offer');
 assert(S.isSoccerCareerSave(w.state),'SERIEB_FIXTURE_STATE: official complete save');
 assert.equal(sha(w.raw),w.rawSHA256,'SERIEB_FIXTURE_RAW: hash');
 assert.equal(rawOf(w.state),w.raw,'SERIEB_FIXTURE_RAW: source bytes');
 assert.deepEqual(w.codec.parsed,w.state,'SERIEB_FIXTURE_RAW: parsed typed state');
 assert.deepEqual(w.codec.repaired,w.state,'SERIEB_FIXTURE_RAW: repaired typed state');
 assert.equal(w.codec.serialized,w.raw,'SERIEB_FIXTURE_RAW: official replay bytes');
 assert(w.pipeline.trace.some(x=>x.name==='initCareer')&&w.pipeline.trace.some(x=>x.name==='advanceProSeason')
  &&w.pipeline.trace.some(x=>x.name==='acceptOffer:initial-homegrown'),'SERIEB_FIXTURE_PIPELINE: genuine constructor and annual pipeline');
 assert.equal(w.pipeline.trace[w.pipeline.trace.length-1].afterRaw,w.raw,'SERIEB_FIXTURE_PIPELINE: final action raw matches witness');
 assert.equal(w.acceptance.original.value.before,w.raw,'SERIEB_FIXTURE_ACCEPT: original input bytes');
 assert.equal(w.acceptance.loaded.value.before,w.raw,'SERIEB_FIXTURE_ACCEPT: loaded input bytes');
 assert.equal(w.acceptance.original.value.inputAfter,w.raw,'SERIEB_FIXTURE_ACCEPT: original input held');
 assert.equal(w.acceptance.loaded.value.inputAfter,w.raw,'SERIEB_FIXTURE_ACCEPT: loaded input held');
 assert.deepEqual(w.acceptance.original.value.value,w.acceptance.loaded.value.value,'SERIEB_FIXTURE_ACCEPT: typed equality');
 assert.equal(w.acceptance.original.value.raw,w.acceptance.loaded.value.raw,'SERIEB_FIXTURE_ACCEPT: raw equality');
 assert.deepEqual(w.acceptance.original.draws,w.acceptance.loaded.draws,'SERIEB_FIXTURE_ACCEPT: action draw tape');
 assert.equal(w.acceptance.original.next,w.acceptance.loaded.next,'SERIEB_FIXTURE_ACCEPT: next draw');
 const signed=w.acceptance.loaded.value.value;
 assert.equal(signed.phase,'playing','SERIEB_FIXTURE_ACCEPT: actual acceptance');
 assert.deepEqual([signed.currentClub,signed.currentClubCountry,signed.currentClubTier,signed.currentClubColor,signed.currentLeague],
  [w.offer.club.name,w.offer.club.country,w.offer.club.tier,w.offer.club.color,w.offer.club.league],'SERIEB_FIXTURE_ACCEPT: actual full club tuple');
 if(w.kind==='club-loan'){
  assert.equal(w.offer.isLoan,true,'SERIEB_FIXTURE_ACCEPT: actual loan offer');
  assert.equal(signed.loan.parentClub,w.state.currentClub,'SERIEB_FIXTURE_ACCEPT: actual parent retained');
  assert.equal(signed.contractYearsLeft,w.state.contractYearsLeft,'SERIEB_FIXTURE_ACCEPT: parent contract held');
  assert.equal(signed.weeklyWage,w.state.weeklyWage,'SERIEB_FIXTURE_ACCEPT: parent wage held');
 }else{
  assert(!w.offer.isLoan,'SERIEB_FIXTURE_ACCEPT: permanent offer');
  assert.equal(signed.contractYearsLeft,w.offer.contractYears,'SERIEB_FIXTURE_ACCEPT: actual offered term');
 }
 if(w.kind==='elected-loyalty'){
  const ledger=L.readLoyalty(w.state),signedLedger=L.readLoyalty(signed);
  assert(ledger?.pending&&ledger.pending.club===w.offer.club.name,'SERIEB_FIXTURE_LOYALTY: actual elected pending quote');
  assert.equal(w.election.draws.length,0,'SERIEB_FIXTURE_LOYALTY: election draws none');
  assert.equal(signed.weeklyWage,ledger.pending.weeklyWage,'SERIEB_FIXTURE_LOYALTY: accepted elected wage');
  assert(signedLedger?.deals.some(d=>d.club===w.offer.club.name&&d.status==='active'),'SERIEB_FIXTURE_LOYALTY: accepted actual ledger');
 }
 return true;
}
function retain(kind,seed,run,state,slot,trace,election=null,request=null){
 const raw=rawOf(state),parsed=S.parseSoccerCareerSave(raw),repaired=E.repairCareer(copy(parsed));
 const acceptanceSeed=91000+['permanent-transfer','club-loan','elected-loyalty'].indexOf(kind);
 const w={kind,seed,slot,offer:copy(storedOffer(state,kind,slot)),state:copy(state),raw,rawSHA256:sha(raw),
  pipeline:{seed,initialOffer:run.value.initialOffer,draws:run.draws,next:run.next,trace:copy(trace)},
  codec:{parsed,repaired,serialized:rawOf(repaired)},election,request,
  acceptance:{seed:acceptanceSeed,original:acceptance(copy(state),kind,slot,acceptanceSeed),loaded:acceptance(copy(repaired),kind,slot,acceptanceSeed)}};
 validateWitness(w);
 write(kind+'.save.txt',raw);write(kind+'.json',w);
 report.witnesses.push({kind,seed,slot,club:w.offer.club,rawBytes:Buffer.byteLength(raw),rawSHA256:w.rawSHA256,file:kind+'.save.txt',record:kind+'.json'});
 flush();return w;
}
try{
 const selectedBytes=fs.readFileSync(SELECTOR);assert.equal(sha(selectedBytes),SELECTOR_SHA,'Acquisition selector hash');selector=JSON.parse(selectedBytes);
 assert.equal(process.env.SC_SERIEB_SOURCE_BASE,selector.baseCommit,'Exact source-vetted base environment');
 assert.equal(process.env.SC_SERIEB_SOURCE_TREE,selector.baseTree,'Exact source-vetted tree environment');
 const sourcePaths=[...selector.critical.map(x=>x.path),SELECTOR,'scripts/qa/acquireSerieBOldChoices.mjs','.github/workflows/sc-serieb-fixtures.yml'];
 const sourceMap=()=>Object.fromEntries(sourcePaths.map(p=>[p,sha(fs.readFileSync(p))]));
 report.sourceBefore=sourceMap();report.selector=selector;flush();
 for(const p of selector.critical)assert.equal(report.sourceBefore[p.path],p.sha256,'Pinned canonical source '+p.path);
 const mod=await bundleCareerSources({root:ROOT,tmpDir:tmp,extra:{pool:'data/soccerCareerClubPool.ts',life:'lib/soccerCareerLife.ts',loyalty:'lib/soccerCareerLoyalty.ts',world:'lib/soccerCareerLeagueWorld.ts'}});
 E=mod.engine;S=mod.save;L=mod.loyalty;Life=mod.life;World=mod.world;
 const cm=mod.cm.REAL_LEAGUES.find(x=>x.id==='serieb');assert.equal(cm.clubs.length,20,'Actual held twenty-club catalogue');
 serieBKeys=new Set(cm.clubs.map(World.clubKeyOf));assert.equal(serieBKeys.size,20,'Twenty distinct actual club identities');
 assert.equal(mod.pool.CAREER_CLUB_POOL.filter(c=>c.league==='Serie B').length,0,'Pre-product generated Serie B remains absent');
 const found=new Map();
 for(let at=0;at<selector.search.seeds&&found.size<3;at++){
  const seed=selector.search.firstSeed+at,run=searchSeed(seed),v=run.value;
  const attempt={seed,stopped:v.stopped||null,natural:v.state?brief(v.state):null,requested:null,draws:run.draws.length,next:run.next};
  report.attempts.push(attempt);
  if(v.state){
   if(!found.has('club-loan')){
    const index=(v.state.pendingLoanOffers||[]).findIndex(isSerieB);
    if(index>=0)found.set('club-loan',retain('club-loan',seed,run,v.state,String(index),v.trace));
   }
   let requested=null;
   if((!found.has('permanent-transfer')||!found.has('elected-loyalty'))&&['no_interest','one_offer','dream_club'].includes(v.state.transferSituation?.type)){
    const trace=copy(v.trace),requestSeed=seed+50000;
    const request=taped(requestSeed,draws=>applyAction(trace,draws,'requestTransferDecision',v.state,x=>E.requestTransferDecision(x,E.FALLBACK_CLUBS)));
    trace[trace.length-1].tapeSeed=requestSeed;requested={state:request.value,trace,request:{seed:requestSeed,...request}};
    attempt.requested=brief(request.value);
   }
   for(const candidate of [{state:v.state,trace:v.trace,request:null},requested].filter(Boolean)){
    if(!candidate.state)continue;
    const current=permanentOffers(candidate.state).find(x=>isSerieB(x.offer)&&!x.offer.isLoan&&x.offer.club.name!==candidate.state.currentClub);
    if(!current)continue;
    if(!found.has('permanent-transfer'))found.set('permanent-transfer',retain('permanent-transfer',seed,run,candidate.state,current.slot,candidate.trace,null,candidate.request));
    if(!found.has('elected-loyalty')){
     const input=copy(candidate.state),before=rawOf(input),baseWage=Math.round(current.offer.wage*Life.agentWageMult(input.agentId));
     const choice=taped(seed+100000,()=>L.chooseLoyalty(input,storedOffer(input,'permanent-transfer',current.slot),baseWage,'loyalty'));
     assert.equal(rawOf(input),before,'Actual election input held');
     if(L.readLoyalty(choice.value)?.pending){
      const trace=copy(candidate.trace);
      trace.push({name:'chooseLoyalty:loyalty',drawStart:0,drawEnd:choice.draws.length,beforeRaw:before,inputAfterRaw:rawOf(input),afterRaw:rawOf(choice.value),after:brief(choice.value),tapeSeed:seed+100000});
      found.set('elected-loyalty',retain('elected-loyalty',seed,run,choice.value,current.slot,trace,{seed:seed+100000,...choice},candidate.request));
     }
    }
   }
  }
  flush();
 }
 assert.equal(found.size,3,'SERIEB_ACQUISITION_SEARCH_EXHAUSTED: three genuine witnesses required within the declared seed bound');
 const healthy=found.get('elected-loyalty');
 const controls=[
  {id:'COPIED wrong league',prefix:'SERIEB_FIXTURE_MEMBERSHIP:',change:w=>{w.offer.club.league='Serie A';}},
  {id:'COPIED saved raw bytes',prefix:'SERIEB_FIXTURE_RAW:',change:w=>{w.raw+=' ';}},
  {id:'COPIED missing annual provenance',prefix:'SERIEB_FIXTURE_PIPELINE:',change:w=>{w.pipeline.trace=w.pipeline.trace.filter(x=>x.name!=='advanceProSeason');}},
  {id:'COPIED acceptance extra global draw',prefix:'SERIEB_FIXTURE_ACCEPT:',change:w=>{w.acceptance.loaded.draws.push(0.25);}}
 ];
 for(const c of controls){
  const changed=copy(healthy),before=JSON.stringify(changed);c.change(changed);const after=JSON.stringify(changed);assert.notEqual(after,before,'Effective '+c.id);
  let rejection=null;try{validateWitness(changed);}catch(e){assert.equal(e.name,'AssertionError',c.id+' assertion only');assert(e.message.startsWith(c.prefix),c.id+' specific refusal');rejection={name:e.name,message:e.message};}
  assert(rejection,c.id+' rejected');const restored=JSON.parse(before);Object.keys(changed).forEach(k=>delete changed[k]);Object.assign(changed,restored);
  assert.equal(JSON.stringify(changed),before,c.id+' same-copy exact restoration');validateWitness(changed);
  const row={id:c.id,classification:'COPIED observation control, not a physical source fault',before,changed:after,rejection,restored:JSON.stringify(changed),readmitted:true};
  write('control-'+(report.copiedControls.length+1)+'.json',row);report.copiedControls.push({id:c.id,changed:true,rejection,exactSameCopyRestored:true,readmitted:true});
 }
 const bundles=path.join(OUT,'bundles');fs.mkdirSync(bundles,{recursive:true});
 report.bundles=fs.readdirSync(tmp).filter(n=>n.endsWith('.mjs')).map(name=>{const bytes=fs.readFileSync(path.join(tmp,name));fs.writeFileSync(path.join(bundles,name),bytes);return{name,bytes:bytes.length,sha256:sha(bytes)};});
 report.sourceAfter=sourceMap();assert.deepEqual(report.sourceAfter,report.sourceBefore,'Every canonical and owned source held');
 assert.deepEqual([...found.keys()].sort(),['club-loan','elected-loyalty','permanent-transfer']);assert.equal(report.copiedControls.length,4);
 report.status='PASSED';report.totals={witnesses:3,attempts:report.attempts.length,copiedControls:4,methodErrors:0};flush();
 console.log('SERIEB_OLD_CHOICES_ACQUIRED: 3 genuine witnesses, 4 COPIED controls, source held');
}catch(e){
 report.status=e?.name==='AssertionError'?'ACQUISITION_ASSERTION_FAILED':'METHOD_ERROR';report.error={name:e?.name,message:e?.message,stack:e?.stack};
 flush();console.error('SERIEB_OLD_CHOICES_FAILED: '+e?.name+': '+e?.message);process.exitCode=report.status==='METHOD_ERROR'?2:1;
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
