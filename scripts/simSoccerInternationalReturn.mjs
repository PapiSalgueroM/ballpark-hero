import './lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { BASE, KEY, OUT, action, bundleInternationalReturn, cappedPlayer, capturedPlayers, copy, evidence, findPlayedSeason, finishReturnYear, git, seeded, sourceReceipt } from './qa/soccerInternationalReturnKit.mjs';
const EVENT = 'Made yourself available for national-team selection again. A squad place still has to be earned.';
const files = ['src/lib/soccerInternationalReturn.ts','src/lib/soccerCareerEngine.ts','src/pages/SoccerCareer.tsx','src/components/soccer-career/InternationalReturnCard.tsx','scripts/simSoccerInternationalReturn.mjs','scripts/qa/soccerInternationalReturnKit.mjs'];
export function expectedReturn(input) {
  const source=input.seasons[input.seasons.length-1];
  return {...copy(input),internationalCareer:true,intStats:{...input.intStats,isRetired:false},internationalReturn:{version:1,sourceCount:input.seasons.length,sourceYear:source.year,sourceAge:source.age,nationality:input.nationality,caps:input.intStats.caps},events:[...input.events,EVENT]};
}
export function prepareReturnFixtures(B) {
  const selected=cappedPlayer(B),poor=cappedPlayer(B,{age:31,overall:62,nationality:'England'}),ban=cappedPlayer(B,{matchFixBanned:2}),summer=cappedPlayer(B);
  summer.seasons=summer.seasons.map(row=>({...row,year:row.year+1}));
  const definitions=[['selected',selected,s=>s.seasons.at(-1).intApps>0],['not-selected',poor,s=>s.seasons.at(-1).intApps===0],['ban',ban,s=>s.pendingSummary?.club==='BANNED'],['tournament',summer,s=>!!s.pendingTournament&&s.pendingTournament.qualified&&s.pendingTournament.squad?.called&&s.pendingTournament.playerApps>0]];
  return definitions.map(([id,input,predicate])=>{const available=B.comeback.makeInternationallyAvailable(copy(input));assert.deepEqual(available,expectedReturn(input));const played=findPlayedSeason(B,available,predicate);return{id,key:KEY,input,seed:played.seed,played,scope:'Explicit simulated capped-player context derived from the complete recorded ere save. Actual unchanged helper and engine choose the branch in bounded seeds; no real international result is claimed.'};});
}
function groups(B,O,prepared,prefix) {
  const results=[];
  const run=(name,test)=>{const data={};try{test(data);results.push({name,ok:true});}catch(e){results.push({name,ok:false,error:String(e.stack),assertion:e instanceof assert.AssertionError});}evidence(prefix+'-'+name+'.json',data);};
  run('declaration-whole-state',data=>{
    const input=cappedPlayer(B),bytes=JSON.stringify(input),read=seeded(11,()=>action(B,'read',input)),actual=seeded(12,()=>action(B,'return',input));Object.assign(data,{input,read,actual,expected:expectedReturn(input)});
    assert(read.value.eligibility.available);assert.deepEqual(read.draws,[]);assert.deepEqual(actual.value,expectedReturn(input));assert.deepEqual(actual.draws,[]);assert.equal(JSON.stringify(input),bytes);assert.notEqual(actual.value.intStats,input.intStats);assert.equal(actual.value.events.length,input.events.length+1);
  });
  run('eligibility-fail-closed',data=>{
    const source=cappedPlayer(B);data.cases=[];
    const changes=[['young',c=>c.age=17],['old',c=>c.age=45],['uncapped',c=>c.intStats.caps=0],['already-active',c=>{c.internationalCareer=true;c.intStats.isRetired=false;}],['youth',c=>c.seasons[c.seasons.length-1].type='youth'],['summary',c=>c.phase='season_summary'],['pending-summary',c=>c.pendingSummary=copy(c.seasons.at(-1))],['pending-events',c=>c.pendingEvents=[{id:2}]],['pending-rehab',c=>c.pendingRehab={year:2029}],['pending-tournament',c=>c.pendingTournament={year:2030}],['pending-award',c=>c.pendingBallonDor={year:2029}],['pending-world-cup',c=>c.pendingWorldCup={year:2030}],['pending-rival',c=>c.pendingRivalryEvent={year:2029}],['retired-career',c=>c.retired=true]];
    for(const[id,change]of changes){const input=copy(source);change(input);const bytes=JSON.stringify(input),read=seeded(21,()=>action(B,'read',input)),actual=seeded(22,()=>action(B,'return',input));data.cases.push({id,input,read,actual});assert.equal(read.value.eligibility.available,false,id);assert.deepEqual(actual.value,input,id);assert.deepEqual(read.draws,[]);assert.deepEqual(actual.draws,[]);assert.equal(JSON.stringify(input),bytes);}
  });
  run('receipt-integrity',data=>{
    const valid=expectedReturn(cappedPlayer(B));data.cases=[];
    for(const[id,change]of [['year',c=>c.internationalReturn.sourceYear++],['count',c=>c.internationalReturn.sourceCount++],['age',c=>c.internationalReturn.sourceAge++],['nationality',c=>c.internationalReturn.nationality='England'],['future-caps',c=>c.internationalReturn.caps=c.intStats.caps+1],['extra-field',c=>c.internationalReturn.guessed=true],['bad-version',c=>c.internationalReturn.version=2]]){const input=copy(valid);change(input);input.internationalCareer=false;input.intStats.isRetired=true;const bytes=JSON.stringify(input),read=seeded(30,()=>action(B,'read',input)),actual=seeded(31,()=>action(B,'return',input));data.cases.push({id,input,read,actual});assert.equal(read.value.receipt,null,id);assert.equal(read.value.eligibility.available,false,id);assert.deepEqual(actual.value,input);assert.deepEqual(read.draws,[]);assert.deepEqual(actual.draws,[]);assert.equal(JSON.stringify(input),bytes);}
  });
  run('same-year-held-once',data=>{
    const returned=expectedReturn(cappedPlayer(B)),retired=seeded(41,()=>action(B,'retire-international',copy(returned))).value;data.cases=[];
    const target=B.engine.FALLBACK_CLUBS.find(c=>c.name==='Arsenal');assert(target);
    const moved=seeded(42,()=>B.engine.acceptOffer(copy(retired),{club:target,wage:60000,contractYears:3,transferFee:0})).value;
    for(const[id,input]of [['retire-again',retired],['reload',JSON.parse(JSON.stringify(retired))],['actual-move',moved]]){const read=seeded(43,()=>action(B,'read',input)),actual=seeded(44,()=>action(B,'return',input));data.cases.push({id,input,read,actual});assert.equal(read.value.eligibility.available,false,id);assert.deepEqual(actual.value,input,id);assert.deepEqual(actual.draws,[]);assert.deepEqual(read.draws,[]);assert.equal(actual.value.internationalReturn.sourceCount,returned.seasons.length);}
  });
  run('later-recorded-year',data=>{
    const fixture=prepared.find(v=>v.id==='selected'),completed=finishReturnYear(B,fixture.played.value),played=completed.value;
    const input=B.engine.retireFromInternational(played),read=seeded(51,()=>action(B,'read',input)),actual=seeded(52,()=>action(B,'return',input));Object.assign(data,{scope:'Actual recorded engine row, followed by actual pending dismissal and event/transfer handlers. No second season is fabricated.',completed,input,read,actual});assert(read.value.eligibility.available);assert.deepEqual(actual.value,expectedReturn(input));assert.deepEqual(actual.draws,[]);assert.equal(actual.value.seasons.length,input.seasons.length);assert.equal(actual.value.internationalReturn.sourceCount,input.seasons.length);
  });
  run('original-selection-not-guaranteed',data=>{
    data.cases=[];
    for(const id of ['selected','not-selected']){const f=prepared.find(v=>v.id===id),input=expectedReturn(f.input),current=seeded(f.seed,()=>action(B,'next',copy(input))),original=seeded(f.seed,()=>action(O,'next',copy(input)));data.cases.push({id,input,current,original});assert.deepEqual(current,original,'Entire original selection, age penalties and full random vector');const row=current.value.seasons.at(-1);assert.equal(row.year,input.seasons.at(-1).year+1);assert.equal(current.value.intStats.debutYear,input.intStats.debutYear);assert.equal(current.value.intStats.debutAge,input.intStats.debutAge);if(id==='selected'){assert(input.age>33);assert(row.intApps>0);assert.equal(current.value.intStats.caps,input.intStats.caps+row.intApps);}else{assert.equal(row.intApps,0);assert.equal(current.value.intStats.caps,input.intStats.caps);}}
  });
  run('interrupted-seasons',data=>{
    data.cases=[];
    for(const[reason,extra]of [['BANNED',{matchFixBanned:2}],['PRISON',{prisonSeasons:1}]]){const input=expectedReturn(cappedPlayer(B,extra)),current=seeded(61,()=>action(B,'next',copy(input))),original=seeded(61,()=>action(O,'next',copy(input)));data.cases.push({reason,input,current,original});assert.deepEqual(current,original);assert.equal(current.value.seasons.at(-1).club,reason);assert.equal(current.value.seasons.at(-1).intApps,0);assert.equal(current.value.intStats.caps,input.intStats.caps);assert.equal(current.value.seasons.length,input.seasons.length+1);}
  });
  run('actual-tournament-history',data=>{
    const f=prepared.find(v=>v.id==='tournament'),input=expectedReturn(f.input),current=seeded(f.seed,()=>action(B,'next',copy(input))),original=seeded(f.seed,()=>action(O,'next',copy(input)));Object.assign(data,{input,current,original});assert.deepEqual(current,original);assert(current.value.pendingTournament?.qualified&&current.value.pendingTournament?.squad?.called);assert(current.value.pendingTournament.playerApps>0);assert.equal(current.value.intStats.caps,input.intStats.caps+current.value.seasons.at(-1).intApps);assert.equal(current.value.intlHistory.length,input.intlHistory.length+1);assert.deepEqual(current.value.intlHistory.slice(0,-1),input.intlHistory);assert.equal(current.value.intStats.debutYear,input.intStats.debutYear);
  });
  return results;
}
if(!process.env.SOCCER_INTERNATIONAL_RETURN_IMPORT_ONLY){
  fs.mkdirSync(OUT,{recursive:true});const before=sourceReceipt(files),current=await bundleInternationalReturn(),original=await bundleInternationalReturn({original:true}),B=current.value,O=original.value;
  const report={head:git('rev-parse','HEAD'),tree:git('rev-parse','HEAD^{tree}'),base:BASE,baseTree:git('rev-parse',BASE+'^{tree}'),sourceBefore:before,loaded:{current:current.loaded,original:original.loaded},neutral:[],groups:[],controls:[]};
  try{
    for(const captured of capturedPlayers())for(const seed of [101,102,103])for(const kind of ['absent','malformed','future'])for(const age of [captured.state.age,35]){const input=age===35?cappedPlayer(B,{age},captured.id):copy(captured.state);if(kind==='malformed')input.internationalReturn={version:1,sourceCount:'unknown'};if(kind==='future')input.internationalReturn={version:1,sourceCount:input.seasons.length+1,sourceYear:9999,sourceAge:35,nationality:input.nationality,caps:40};const inputBytes=JSON.stringify(input),read=seeded(seed,()=>action(B,'read',input));assert.deepEqual(read.draws,[]);assert.equal(JSON.stringify(input),inputBytes,'Plain read retains every input field');const first=seeded(seed,()=>action(O,'next',copy(input))),second=seeded(seed,()=>action(B,'next',copy(input)));const file=evidence('neutral-'+captured.id+'-'+age+'-'+seed+'-'+kind+'.json',{input,operation:'next',read,original:first,current:second});assert.deepEqual(second,first,'Entire original inactive state and exact draw vector');report.neutral.push({file,kind,age,draws:first.draws.length});}
    const prepared=prepareReturnFixtures(B);report.fixtures=prepared.map(({id,seed,scope})=>({id,seed,scope}));evidence('native-fixtures.json',prepared);report.groups=groups(B,O,prepared,'healthy');assert(report.groups.every(v=>v.ok),JSON.stringify(report.groups.filter(v=>!v.ok)));
    const faults=[
      {id:'wrong-source-year',file:'src/lib/soccerInternationalReturn.ts',from:'source.year !== value.sourceYear',to:'false',groups:['receipt-integrity']},
      {id:'uncapped-return',file:'src/lib/soccerInternationalReturn.ts',from:'career.intStats.caps < 1',to:'career.intStats.caps < 0',groups:['eligibility-fail-closed']},
      {id:'repeat-recorded-year',file:'src/lib/soccerInternationalReturn.ts',from:'career.seasons.length <= held.sourceCount || latest.year <= held.sourceYear',to:'false',groups:['same-year-held-once']},
      {id:'free-cap',file:'src/lib/soccerInternationalReturn.ts',from:'caps: prev.intStats.caps,',to:'caps: prev.intStats.caps + 1,',groups:['declaration-whole-state','later-recorded-year']},
      {id:'ignore-eligibility',file:'src/lib/soccerInternationalReturn.ts',from:'if (!internationalReturnEligibility(prev).available) return prev;',to:'if (false) return prev;',groups:['eligibility-fail-closed','receipt-integrity','same-year-held-once']},
      {id:'guaranteed-selection',file:'src/lib/soccerInternationalSquads.ts',from:'const called = myRank <= places;',to:'const called = true;',groups:['original-selection-not-guaranteed']},
    ];
    for(const fault of faults){const compiled=await bundleInternationalReturn({patches:[fault]}),actual=groups(compiled.value,O,prepared,'fault-'+fault.id),failed=actual.filter(v=>!v.ok);assert.deepEqual(failed.map(v=>v.name),fault.groups);assert(failed.every(v=>v.assertion),'Only exact outcome assertions count');assert.equal(actual.filter(v=>v.ok).length,8-fault.groups.length);report.controls.push({id:fault.id,expectedFailures:fault.groups,faults:compiled.faults,loaded:compiled.loaded,groups:actual});console.log('CONTROL FIRED '+fault.id+': '+fault.groups.join(', '));}
    console.log('PASS actual original09df full inactive saves and vectors: '+report.neutral.length+' pairs.');console.log('PASS actual return source groups: '+report.groups.length+'.');console.log('PASS actual selected, not-selected, ban and tournament fixtures: '+prepared.length+'.');
  }finally{report.sourceAfter=sourceReceipt(files);assert.deepEqual(report.sourceAfter,before);evidence('outcomes.json',report);}
  console.log('PASS international return copied production source bytes held.');
}