// Remote-only actual seasons, complete legacy comparisons and effective copied-source controls.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {gzipSync} from 'node:zlib';
import {BASE,OUT,copy,git,held,seeded,store,bundleUcl,scheduleProof,runSeason,advance,saveProof} from './qa/managerUclLeagueKit.mjs';
assert(process.env.CI,'Manager league-phase runtime is remote-only');
fs.mkdirSync(OUT,{recursive:true});
const files=['src/lib/clubManager.ts','src/lib/clubManagerUclLeague.ts','src/lib/clubManagerCalendar.ts','src/components/club-manager/CalendarCard.tsx','src/lib/uclFormatHistoryEngine.ts','src/data/uclEngineShapes.json','src/components/club-manager/UclGroupsCard.tsx','src/components/club-manager/UclBracketCard.tsx','src/pages/ClubManager.tsx','src/hooks/useClubManager.ts','package.json','package-lock.json'];
const report={base:BASE,head:git('rev-parse','HEAD').trim(),tree:git('rev-parse','HEAD^{tree}').trim(),sourceBefore:held(files),neutralPairs:[],modernAttempts:[],groups:[],controls:[],scope:{qualification:'Saved simulated standings model. No coefficient pots or association constraints are asserted.',modern:'All36 entrants and144 directed saved results. Genuine complete callbacks include managed elimination.',legacy:'Original historic starts and existing modern group saves use complete values and draw vectors.',faults:'Four copied-source arms run all four focused outcome groups; full season search and original replay are healthy witnesses.'}};
const put=(name,value)=>{const file=name+'.json.gz';fs.writeFileSync(path.join(OUT,file),gzipSync(JSON.stringify(value)));return file;};
const flush=()=>fs.writeFileSync(path.join(OUT,'pure-report.json'),JSON.stringify(report,null,2));
store();const current=await bundleUcl(),original=await bundleUcl({original:true}),B=current.value,O=original.value;report.loaded={current:current.loaded,original:original.loaded};flush();
function pair(label,seed,actual,expected){assert.deepEqual(actual.value,expected.value,label+' entire output');assert.deepEqual(actual.draws,expected.draws,label+' full draw vector');const file=put('neutral-'+report.neutralPairs.length,{label,seed,actual,expected});report.neutralPairs.push({label,seed,file});}
// Every era uses its actual installed bake before its genuine engine callbacks.
for(const era of ['era2005','era2010','era2015','era2020']){
 await Promise.all([B.E.ensureEraRosters(era),O.E.ensureEraRosters(era)]);
 for(const seed of [11,31,2026]){
  const actual=seeded(seed,()=>B.E.startCareer('Barcelona',era)),expected=seeded(seed,()=>O.E.startCareer('Barcelona',era));pair('historic-start-'+era,seed,actual,expected);
  pair('historic-first-callback-'+era,seed+1,advance(B,actual.value,seed+1),advance(O,expected.value,seed+1));
 }
}
const legacyStarts=[];
for(const seed of [11,31,2026]){
 const preparedOld=await bundleUcl({original:true}),currentOld=await bundleUcl(),originalOld=await bundleUcl({original:true});
 report.loaded['old-'+seed]={prepared:preparedOld.loaded,current:currentOld.loaded,original:originalOld.loaded};
 const originalStart=seeded(seed,()=>preparedOld.value.E.startCareer('Arsenal','now'));assert(!originalStart.value.uclGroup?.format);legacyStarts.push(originalStart.value);
 let actual=copy(originalStart.value),expected=copy(originalStart.value);
 for(let step=0;step<12;step++){
  const a=advance(currentOld.value,actual,seed+step),e=advance(originalOld.value,expected,seed+step);pair('old-modern-group-callback-'+seed+'-'+step,seed+step,a,e);actual=a.value.state;expected=e.value.state;
 }
 const a=saveProof(currentOld.value,actual,seed+900),e=saveProof(originalOld.value,expected,seed+900);assert.deepEqual(a,e,'Whole old group canonical loader bytes and vectors');put('legacy-reload-'+seed,{actual:a,expected:e});
}
const historicArm=await bundleUcl(),originalHistoricArm=await bundleUcl({original:true});
await Promise.all([historicArm.value.E.ensureEraRosters('era2010'),originalHistoricArm.value.E.ensureEraRosters('era2010')]);
report.loaded.historicFull={current:historicArm.loaded,original:originalHistoricArm.loaded};
const historicFullStart=seeded(101,()=>historicArm.value.E.startCareer('Barcelona','era2010')),originalFullStart=seeded(101,()=>originalHistoricArm.value.E.startCareer('Barcelona','era2010'));
const historicFull=runSeason(historicArm.value,historicFullStart.value,400),originalHistoricFull=runSeason(originalHistoricArm.value,originalFullStart.value,400);assert.deepEqual(historicFull,originalHistoricFull,'Complete actual historic season and every callback vector');put('historic-complete-season',{actual:historicFull,expected:originalHistoricFull});
const oldFullArm=await bundleUcl(),originalOldFullArm=await bundleUcl({original:true});report.loaded.oldFull={current:oldFullArm.loaded,original:originalOldFullArm.loaded};
const legacyFull=runSeason(oldFullArm.value,legacyStarts[1],650),originalLegacyFull=runSeason(originalOldFullArm.value,legacyStarts[1],650);assert.deepEqual(legacyFull,originalLegacyFull,'Complete old modern group season and every callback vector');put('old-modern-complete-season',{actual:legacyFull,expected:originalLegacyFull});
// The existing compact card remains byte-identical for genuine original group saves.
report.legacyCalendar=[];
for(const [index,input]of legacyStarts.entries()){const before=JSON.stringify(input),actual=seeded(780,()=>B.renderCalendar(input)),expected=seeded(780,()=>O.renderCalendar(input));assert.deepEqual(actual,expected,'Whole original compact calendar markup/read vector');assert.equal(JSON.stringify(input),before);report.legacyCalendar.push({file:put('legacy-calendar-'+index,{input,actual,expected})});}
const shapes=B.M.clubManagerUclShapes(),savedShapes=JSON.parse(fs.readFileSync(path.join(OUT,'..','src','data','uclEngineShapes.json'),'utf8')).shapes;
assert.deepEqual(shapes,savedShapes,'Entire generated metadata equals actual current engine shapes');
assert.deepEqual(shapes.filter(s=>s.era.id!=='now'),O.M.clubManagerUclShapes().filter(s=>s.era.id!=='now'),'All original historical metadata held');
report.metadata={file:put('metadata-current-original',{actual:shapes,original:O.M.clubManagerUclShapes(),generated:savedShapes})};
const field=B.E.seasonOneUclField('now');assert.equal(field.length,36);assert.equal(new Set(field).size,36);
const fixtures={},attempts=[];
const candidates=[...field].filter(club=>B.E.clubByName(club)).sort((a,b)=>B.E.clubDefFor(a).tier-B.E.clubDefFor(b).tier);
// Stop on the three actual sporting outcomes, retain every attempted seed and full callback stream.
for(const club of candidates){
 if(Object.keys(fixtures).length===3)break;
 for(const seed of [31,107,2026]){
  const start=seeded(seed,()=>B.E.startCareer(club,'now'));if(!start.value.uclGroup)continue;
  scheduleProof(start.value.uclGroup,field,club);
  const league=runSeason(B,start.value,seed+300,{stopAtLeague:true});scheduleProof(league.state.uclGroup,field,club);assert.equal(league.state.uclGroup.matchday,8);
  const position=B.L.sortedUclLeague(league.state.uclGroup).findIndex(row=>row.club===club)+1;
  const id=position<=8?'top8':position<=24?'playoff':'out';
  assert.equal(league.state.uclKoRound,id==='top8'?'R16':id==='playoff'?'PO':'out');
  const file=put('modern-attempt-'+attempts.length,{club,seed,start,league});attempts.push({club,seed,position,id,file});
  if(!fixtures[id]){
   const rest=runSeason(B,league.state,seed+1000),final=rest.state;
   scheduleProof(final.uclGroup,field,club);assert.equal(final.week,final.calendar.length);
   for(const[round,count]of [['PO',8],['R16',8],['QF',4],['SF',2],['F',1]]){
    const ties=final.uclBracket.filter(t=>t.round===round);assert.equal(ties.length,count,'Whole tournament '+round);assert(ties.every(t=>t.winner===t.home||t.winner===t.away),'Every tournament tie finishes '+round);
   }
   const myReports=[...league.reports,...rest.reports].filter(r=>r.competition==='uclGroup');assert.equal(myReports.length,8,'Exactly eight actual managed league-phase matches');assert.equal(myReports.filter(r=>r.home===club).length,4);assert.equal(myReports.filter(r=>r.away===club).length,4);
   const minePo=final.uclBracket.filter(t=>t.round==='PO'&&t.mine);assert.equal(minePo.length,id==='playoff'?1:0,'Top8 and eliminated clubs never play PO');
   const allTrace=[...league.trace,...rest.trace],afterPo=rest.trace.find(t=>t.result.state.uclBracket?.filter(k=>k.round==='R16').length===8)?.result.state;
   assert(afterPo,'Actual completed PO seeds all16');
   if(afterPo.sacked){attempts[attempts.length-1].nativeEligible=false;continue;}attempts[attempts.length-1].nativeEligible=true;
   const beforeMd=league.trace.find(t=>t.result.state.uclGroup?.matchday===1&&t.input.uclGroup?.matchday===0)?.input;assert(beforeMd);
   const calendar=B.C.seasonDays(start.value);const days=[...calendar.entryDays.values()].filter(d=>d.competition==='uclGroup');assert.equal(days.length,8);assert(days.every(d=>/League MD/.test(d.compLabel)));assert.deepEqual(days.map(d=>d.opponent).sort(),start.value.uclGroup.opponents.slice().sort());
   const reload=saveProof(B,afterPo,seed+8000);scheduleProof(reload.second.value.uclGroup,field,club);
   fixtures[id]={id,club,seed,position,start:start.value,league:league.state,afterPo,beforeMd,final,reload,calendar:days};put('modern-complete-'+id,{fixture:fixtures[id],league,rest});
  }
  if(Object.keys(fixtures).length===3)break;
 }
 assert(attempts.length<=30,'Bounded genuine fixture discovery');
}
assert.deepEqual(Object.keys(fixtures).sort(),['out','playoff','top8'],'Actual top8/playoff/out fixtures found without editing outcomes');report.modernAttempts=attempts;
fs.writeFileSync(path.join(OUT,'native-fixtures.json'),JSON.stringify(Object.values(fixtures),null,2));
const mdInput=fixtures.top8.beforeMd;
const baselineCommit=await bundleUcl(),mdBaseline=advance(baselineCommit.value,mdInput,901);
report.loaded.commitBaseline=baselineCommit.loaded;
const paths=fixtures.top8.afterPo,ranked=B.L.sortedUclLeague(paths.uclGroup).map(r=>r.club);
const expectedRoutes=[6,0,4,2,7,1,5,3],expectedSeeded=[0,7,3,4,1,6,2,5];
const groups={
 'draw-conservation':Q=>{for(const seed of [0,1,31,4294967295]){const saved=Q.L.createUclLeagueStage(field,field[0],seed);scheduleProof(saved,field,field[0]);assert(Q.L.isUclLeagueStage(saved));}},
 'sporting-paths':Q=>{const po=paths.uclBracket.filter(t=>t.round==='PO').sort((a,b)=>a.slot-b.slot),actual=Q.L.uclLeagueRoundOf16(copy(paths.uclGroup),copy(po),paths.clubName);assert(actual);assert.deepEqual(actual.map(t=>[t.home,t.away]),expectedRoutes.map((route,i)=>[po[route].winner,ranked[expectedSeeded[i]]]));assert.deepEqual(actual.map(t=>[t.home,t.away]),paths.uclBracket.filter(t=>t.round==='R16').sort((a,b)=>a.slot-b.slot).map(t=>[t.home,t.away]));},
 'actual-matchday-commit':Q=>{const actual=advance(Q,mdInput,901);put('commit-'+activeFault,{input:mdInput,actual,expected:mdBaseline});assert.deepEqual(actual.value,mdBaseline.value,'Entire actual committed output');assert.deepEqual(actual.draws,mdBaseline.draws,'Unfiltered committed action vector');scheduleProof(actual.value.state.uclGroup,field,actual.value.state.clubName);assert.equal(actual.value.state.uclGroup.matchday,1);},
 'legacy-held':Q=>{for(const input of legacyStarts){const before=JSON.stringify(input);for(const entry of input.calendar){const actual=seeded(707,()=>Q.E.fixtureFor(input,entry)),expected=seeded(707,()=>O.E.fixtureFor(input,entry));assert.deepEqual(actual,expected,'Entire original old-group fixture read and draw vector');}assert.equal(JSON.stringify(input),before,'Old saved input remains unchanged');}},
};
let activeFault='healthy';function outcomes(Q){const result=[];for(const[name,fn]of Object.entries(groups)){try{fn(Q);result.push({name,ok:true});}catch(error){result.push({name,ok:false,error:{name:error.name,message:error.message,stack:error.stack}});}}return result;}
const focused=await bundleUcl();report.loaded.focused=focused.loaded;report.groups=outcomes(focused.value);flush();assert(report.groups.every(g=>g.ok),'All focused healthy outcome groups');
const controls=[
 {name:'duplicate-opponents',file:'src/lib/clubManagerUclLeague.ts',from:'ring.splice(1, 0, ring.pop()!);',to:'ring.splice(1, 0, ring.splice(1, 1)[0]);',expected:['draw-conservation']},
 {name:'home-imbalance',file:'src/lib/clubManagerUclLeague.ts',from:'pair[0] = club; pair[1] = other;',to:'pair[0] = pair[0]; pair[1] = pair[1];',expected:['draw-conservation']},
 {name:'wrong-r16-route',file:'src/lib/clubManagerUclLeague.ts',from:'routes = [6, 0, 4, 2, 7, 1, 5, 3]',to:'routes = [0, 6, 4, 2, 7, 1, 5, 3]',expected:['sporting-paths']},
 {name:'matchday-double',file:'src/lib/clubManager.ts',from:'    group.matchday++;\n    if (group.matchday === 8)',to:'    group.matchday += 2;\n    if (group.matchday === 8)',expected:['actual-matchday-commit']},
];
for(const control of controls){activeFault=control.name;const arm=await bundleUcl({patch:control}),result=outcomes(arm.value),failed=result.filter(r=>!r.ok);report.controls.push({name:control.name,expected:control.expected,loaded:arm.loaded,faults:arm.faults,result});flush();assert.deepEqual(failed.map(r=>r.name),control.expected,'Exact copied-source failure identities '+control.name);assert(failed.every(r=>r.error.name==='AssertionError'),'Only real assertion failures earn source-control credit');console.log('CONTROL FIRED('+control.name+') '+control.expected.join(','));}
// A real original group season rolls into the new format, using its own saved sporting tables.
const oldFinish=seeded(410,()=>B.E.finishSeason(copy(legacyFull.state))),rolled=seeded(411,()=>B.E.startNextSeason(oldFinish.value.state));assert.equal(rolled.value.calendar.filter(e=>e.type==='uclGroup').length,8);assert.equal(rolled.value.calendar.filter(e=>e.type==='uclKo'&&e.uclRound==='PO').length,2);if(rolled.value.uclGroup){assert.equal(rolled.value.uclGroup.format,'league36');assert.equal(rolled.value.uclField.length,36);scheduleProof(rolled.value.uclGroup,rolled.value.uclField,rolled.value.clubName);}put('actual-old-to-modern-rollover',{input:legacyFull.state,finish:oldFinish,rolled});report.rollover={qualified:!!rolled.value.uclGroup,format:rolled.value.uclGroup?.format??null,field:rolled.value.uclField};
// Both formats enter a qualified job through an actual pending application and real match callbacks.
report.jobMoves=[];
for(const originalMode of[false,true]){
 let found=false;
 for(let attempt=0;attempt<24&&!found;attempt++){
  const prepared=await bundleUcl({original:originalMode}),currentArm=await bundleUcl(),baseArm=originalMode?await bundleUcl({original:true}):null;
  const start=seeded(220,()=>prepared.value.E.startCareer('Chelsea','now'));assert.equal(start.value.uclGroup,null,'Genuine initially unqualified club');
  if(!originalMode)assert.equal(start.value.uclFormat,'league36');else assert.equal(start.value.uclFormat,undefined);
  const apply=seeded(1800+attempt,()=>currentArm.value.E.applyForJob(copy(start.value),'Arsenal'));assert(apply.value,'Actual application is allowed');
  const expectedApply=baseArm?seeded(1800+attempt,()=>baseArm.value.E.applyForJob(copy(start.value),'Arsenal')):null;if(baseArm)assert.deepEqual(apply,expectedApply);
  let state=apply.value,expected=expectedApply?.value;const trace=[];
  for(let step=0;step<8&&state.jobHunt?.open?.status==='pending';step++){const actual=advance(currentArm.value,state,1900+step),old=baseArm?advance(baseArm.value,expected,1900+step):null;if(baseArm)assert.deepEqual(actual,old,'Whole original unqualified job callback/vector');trace.push({input:state,actual,expected:old});state=actual.value.state;expected=old?.value.state;}
  const receipt={originalMode,attempt,start,apply,expectedApply,trace,loaded:{prepared:prepared.loaded,current:currentArm.loaded,original:baseArm?.loaded}};
  if(state.jobHunt?.open?.status==='accepted'&&!state.sacked){const joined=seeded(2100,()=>currentArm.value.C.joinClubNow(copy(state))),old=baseArm?seeded(2100,()=>baseArm.value.C.joinClubNow(copy(expected))):null;assert(joined.value);if(baseArm){assert.deepEqual(joined,old,'Whole original unqualified-to-qualified job handover/vector');assert(!joined.value.uclGroup?.format);}else{assert.equal(joined.value.uclFormat,'league36');assert.equal(joined.value.uclGroup?.format,'league36');scheduleProof(joined.value.uclGroup,joined.value.uclField,joined.value.clubName);assert.equal(joined.value.calendar.filter(e=>e.type==='uclGroup').length,8);}receipt.joined=joined;receipt.expectedJoin=old;found=true;}
  report.jobMoves.push({originalMode,attempt,accepted:found,file:put('job-'+(originalMode?'old':'modern')+'-'+attempt,receipt)});
 }
 assert(found,'Genuine accepted qualified job found in bounded seeded attempts');
}
report.sourceAfter=held(files);assert.deepEqual(report.sourceAfter,report.sourceBefore);report.ok=true;flush();
console.log('PASS '+report.neutralPairs.length+' complete original/current historical and old-save callbacks with exact draw vectors.');
console.log('PASS three complete modern seasons, all36 rows/144 games and every knockout round finish.');
console.log('PASS four healthy outcome groups, four effective copied-source controls and source-held receipts.');