/* Conditional remote measurement only. Requires admitted baseline and a separately pinned zero-point engine. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import { mulberry } from '../lib/tycoonBots.mjs';

const ROOT=process.cwd(),OUT=process.env.STADIUM_PLAN_MEASUREMENT_OUT,PHASE=process.env.STADIUM_PLAN_PHASE;
const CLOCK=Date.parse('2026-10-29T18:00:00.000Z'),POINTS=[4,6,8,10],PLANS=['protect','balanced','chase'];
const METRICS=['protectLeadRetention','protectScoringCost','chaseDeficitRescue','chaseConcedingCost','chaseLeadLossCost'];
const ANCHOR='\nconst MATCH_PLAN_POINTS = 0;\n',RNG_DOMAIN=0x4c415445,INITIAL_DOMAIN=0x494e4954;
const sha=body=>createHash('sha256').update(body).digest('hex'),bytes=file=>fs.readFileSync(file);
const git=body=>createHash('sha1').update(Buffer.from('blob '+body.length+'\0')).update(body).digest('hex');
const write=(name,value)=>fs.writeFileSync(path.join(OUT,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
const frozen=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.freeze(value);for(const child of Object.values(value))frozen(child);}return value;};
const omitPlan=value=>{const {matchPlan,...rest}=value;return rest;};
const snapshot=value=>JSON.stringify(value);
assert(process.env.CI==='true'&&/^[a-f0-9]{40}$/.test(process.env.GITHUB_SHA||''),'REMOTE_MEASUREMENT_ONLY');
assert(['calibration','controls','holdout'].includes(PHASE),'EXPLICIT_MEASUREMENT_PHASE_REQUIRED');
assert(OUT&&path.isAbsolute(OUT)&&path.resolve(OUT)!==ROOT&&!path.resolve(OUT).startsWith(ROOT+path.sep),'OUTSIDE_SOURCE_OUTPUT');
fs.mkdirSync(OUT,{recursive:true});assert.equal(fs.readdirSync(OUT).length,0,'FRESH_OUTPUT');
const engineFile=path.join(ROOT,'src/lib/stadiumTycoon.ts'),zeroBody=bytes(engineFile),zeroText=zeroBody.toString('utf8');
assert.match(process.env.STADIUM_PLAN_ZERO_ENGINE_SHA256||'',/^[a-f0-9]{64}$/);
assert.equal(sha(zeroBody),process.env.STADIUM_PLAN_ZERO_ENGINE_SHA256,'PINNED_FUTURE_ZERO_ENGINE');
assert.equal(zeroText.split(ANCHOR).length,2,'ONE_ACTUAL_PRIVATE_ZERO_STATEMENT');
const originalFile=process.env.STADIUM_PLAN_ORIGINAL_ENGINE;
assert(originalFile&&path.isAbsolute(originalFile)&&!path.resolve(originalFile).startsWith(ROOT+path.sep),'RETAINED_ORIGINAL_OUTSIDE_SOURCE');
const originalBody=bytes(originalFile);
assert.equal(sha(originalBody),'7ae67d9000bd6e371a7745b458060a0d3bdd6c8dc893c743cfdde46231b6280e','EXACT_PRE_FEATURE_ENGINE');
assert.equal(git(originalBody),'6a1fb1c55c7367c729a401c43c2e4092c9c2d829');
const held={'src/lib/season/law.ts':'f0ce689cb9523aaf7f703188ff875342f3e31159','src/lib/leagueCore.ts':'1405c2c4982a4da0fc129769f53082a11bc06c93','scripts/lib/tycoonBots.mjs':'2fdd9dfe6f962b5880771306eba9213bdc1239ae'};
const before=Object.keys(held).map(file=>{const body=bytes(file);assert.equal(git(body),held[file],'UNCHANGED_SHARED_SOURCE:'+file);return{file,bytes:body.length,sha256:sha(body),gitBlob:git(body)};});
before.push({file:'src/lib/stadiumTycoon.ts',bytes:zeroBody.length,sha256:sha(zeroBody),gitBlob:git(zeroBody)});
write('source-before.json',before);fs.writeFileSync(path.join(OUT,'original-engine.ts'),originalBody,{flag:'wx'});fs.writeFileSync(path.join(OUT,'zero-engine.ts'),zeroBody,{flag:'wx'});
let sequence=0;
async function bundled(file,label){
  const id=String(++sequence).padStart(3,'0')+'-'+label,entry=path.join(OUT,id+'.entry.mjs'),output=path.join(OUT,id+'.engine.mjs');
  const bridge='export * from '+JSON.stringify(file)+';\nexport {hash32} from '+JSON.stringify(path.join(ROOT,'src/lib/leagueCore.ts'))+';\nexport {LAW,goalLambda} from '+JSON.stringify(path.join(ROOT,'src/lib/season/law.ts'))+';\n';
  fs.writeFileSync(entry,bridge,{flag:'wx'});
  const result=await build({entryPoints:[entry],bundle:true,format:'esm',platform:'node',outfile:output,metafile:true,logLevel:'error',alias:{'@':path.join(ROOT,'src')}});
  write(id+'.metafile.json',result.metafile);return import(pathToFileURL(output).href);
}
function sink(name){
  const file=path.join(OUT,name),fd=fs.openSync(file,'wx');let buffer='',rows=0;
  return {file,row(value){buffer+=JSON.stringify(value)+'\n';rows++;if(buffer.length>=65536){fs.writeSync(fd,buffer);buffer='';}},end(){if(buffer)fs.writeSync(fd,buffer);fs.closeSync(fd);return{file:path.basename(file),rows,bytes:fs.statSync(file).size,sha256:sha(bytes(file))};}};
function sourceAt(points){return zeroText.replace(ANCHOR,'\nconst MATCH_PLAN_POINTS = '+points+';\n');}
function pinDecision(){
  const file=process.env.STADIUM_PLAN_DECISION_JSON,pin=process.env.STADIUM_PLAN_DECISION_SHA256;
  assert(file&&path.isAbsolute(file)&&/^[a-f0-9]{64}$/.test(pin||''),'FROZEN_DECISION_REQUIRED');
  const body=bytes(file);assert.equal(sha(body),pin);const d=JSON.parse(body);
  assert.equal(d.status,'FROZEN_AFTER_CALIBRATION_BEFORE_HOLDOUT');assert.equal(d.zeroEngineSHA256,sha(zeroBody));assert(POINTS.includes(d.selectedPoints));
  assert.match(d.calibrationSummarySHA256,/^[a-f0-9]{64}$/);assert.match(d.scenarioManifestSHA256,/^[a-f0-9]{64}$/);
  assert.deepEqual(Object.keys(d.floors).sort(),[...METRICS].sort());
  for(const key of METRICS)assert(Number.isFinite(d.floors[key])&&d.floors[key]>0,'POSITIVE_FROZEN_FLOOR:'+key);
  const calibrationFile=process.env.STADIUM_PLAN_CALIBRATION_JSON;assert(calibrationFile&&path.isAbsolute(calibrationFile),'ACTUAL_CALIBRATION_RECEIPT_REQUIRED');
  const calibrationBody=bytes(calibrationFile);assert.equal(sha(calibrationBody),d.calibrationSummarySHA256);const calibration=JSON.parse(calibrationBody);
  assert.equal(calibration.status,'MEASURED_ALL_FOUR_PREDECLARED_CANDIDATES_NO_SELECTION');assert.equal(calibration.zeroEngineSHA256,sha(zeroBody));assert.equal(calibration.scenarioManifestSHA256,d.scenarioManifestSHA256);assert.deepEqual(calibration.summaries.map(row=>row.points),POINTS);
  const selected=calibration.summaries.find(row=>row.points===d.selectedPoints);
  for(const key of METRICS)for(const block of [selected.metrics,...selected.halfBlocks])assert(d.floors[key]<block[key].mean,'FROZEN_FLOOR_BELOW_MEASURED_CALIBRATION_HEADROOM:'+key);
  write('frozen-decision.json',d);return{...d,decisionSHA256:pin};
}
function play(T,initial,seed,edge,minutes=30){
  const state=structuredClone(initial),events=[],rng=mulberry(T.hash32(seed,initial.__scenarioOrdinal??0,RNG_DOMAIN));let calls=0;
  delete state.__scenarioOrdinal;
  for(let minute=0;minute<minutes;minute++)T.playMinute(state,()=>{calls++;return rng();},events,{pay:true},edge);
  assert.equal(calls,minutes*2);const full=events.filter(e=>['win','draw','loss'].includes(e.kind));
  assert.equal(full.length,1);assert.equal(state.totalMatches,(initial.totalMatches??0)+1);assert.equal(state.minute,0);
  const gf=state.totalGoals-initial.totalGoals,ga=events.filter(e=>e.kind==='conceded').length,pay=events.reduce((sum,e)=>sum+(e.amount??0),0);
  assert.equal(state.money,events.reduce((sum,e)=>sum+(e.amount??0),initial.money));assert.equal(state.lifetime,events.reduce((sum,e)=>sum+(e.amount??0),initial.lifetime));
  return{state,events,calls,gf,ga,pay,result:full[0].kind,serialized:T.serializeTycoon(state,CLOCK)};
}
function neutralEqual(T,old,actual,marker){
  assert.equal(actual.calls,old.calls,marker+':RNG');
  assert.deepEqual(omitPlan(actual.state),old.state,marker+':STATE');assert.deepEqual(actual.events,old.events,marker+':EVENTS');
  assert.equal(T.serializeTycoon(omitPlan(actual.state),CLOCK),old.serialized,marker+':SERIALIZED');
}
async function scenarios(T){
  const rows=[];let ordinal=0;
  const max=T.TRACKS.find(track=>track.id==='squad').maxLevel;assert(Number.isSafeInteger(max)&&max>=0);
  for(const division of [0,4,9])for(const target of [-12,0,12])for(const edge of [0,0.2,0.4])for(const [score,gf,ga] of [['lead',1,0],['trail',0,1],['level',0,0]]){
    ordinal++;const base=T.newTycoon(CLOCK);base.league=T.newLeague(base.rep,division,0);base.bestDivision=division;
    let nearest=0,distance=Infinity;
    for(let level=0;level<=max;level++){base.levels.squad=level;const d=Math.abs(T.matchGap(base)-target);if(d<distance){distance=d;nearest=level;}}
    base.levels.squad=nearest;let initial=null,initialSeed=null,initialEvents=null;
    for(let candidate=1;candidate<=4096;candidate++){
      const state=structuredClone(base),events=[],random=mulberry(T.hash32(candidate,ordinal,INITIAL_DOMAIN));let calls=0;
      for(let minute=0;minute<60;minute++)T.playMinute(state,()=>{calls++;return random();},events,{pay:true},edge);
      assert.equal(calls,120);
      if(state.goalsFor===gf&&state.goalsAgainst===ga){initial=state;initialSeed=candidate;initialEvents=events;break;}
    }
    assert(initial,'PREDECLARED_INITIAL_SCORE_REACHABLE:'+ordinal);assert.equal(initial.minute,60);assert.equal(initial.totalMatches,0);
    rows.push({id:'d'+division+'-g'+target+'-e'+edge+'-'+score,ordinal,syntheticSimulationFixture:true,notBrowserSave:true,division,targetGap:target,actualGap:T.matchGap(initial),distanceToTarget:distance,squadLevel:nearest,opponentOffset:T.currentOpponentOffset(initial),academyEdge:edge,score,initialSeed,initialEvents,initialState:frozen(initial),initialStateSHA256:sha(snapshot(initial))});
  }
  assert.equal(rows.length,81);return rows;
}
function rates(T,state,edge,points,plan){
  const gap=T.matchGap(state),shift=plan==='protect'?-points:plan==='chase'?points:0,homeInput=gap+shift,awayInput=-gap+shift;
  assert.equal(T.goalChancePerMin(state),T.goalLambda(homeInput,T.LAW.home)/90,'ACTUAL_HOME_LAW_INPUT');assert.equal(T.oppChancePerMin(state,edge),T.goalLambda(awayInput,T.LAW.away)*(1-edge)/90,'ACTUAL_AWAY_LAW_BEFORE_ACADEMY');
  return{homeInput,awayInput,homeUnclamped:T.LAW.base+homeInput*T.LAW.perPoint+T.LAW.home,awayUnclampedBeforeAcademy:T.LAW.base+awayInput*T.LAW.perPoint+T.LAW.away,
    homeExpectedGoals:T.goalChancePerMin(state)*90,awayExpectedGoalsAfterAcademy:T.oppChancePerMin(state,edge)*90,
    homeClamped:T.goalLambda(homeInput,T.LAW.home),awayClampedBeforeAcademy:T.goalLambda(awayInput,T.LAW.away),academyEdge:edge};
}
function commit(T,initial,choice){
  assert.equal(T.canSetMatchPlan(initial),true,'ACTUAL_COMMIT_ELIGIBLE');
  const hash=sha(snapshot(initial)),state=T.setMatchPlan(initial,choice);assert.notEqual(state,initial);assert.equal(sha(snapshot(initial)),hash);
  assert.deepEqual(omitPlan(state),initial,'COMMIT_METADATA_ONLY');
  assert.deepEqual(T.matchPlanFor(state),{rep:initial.rep,match:initial.totalMatches??0,choice});return frozen(state);
}
const sums=()=>({n:0,w:0,d:0,l:0,gf:0,ga:0,pay:0,rolls:0});
function add(sum,r){sum.n++;sum.w+=r.result==='win';sum.d+=r.result==='draw';sum.l+=r.result==='loss';sum.gf+=r.gf;sum.ga+=r.ga;sum.pay+=r.pay;sum.rolls+=r.calls;}
function metrics(cohorts,block=null){
  const totals=Object.fromEntries(METRICS.map(key=>[key,{delta:0,n:0}]));
  for(const cell of cohorts){
    const group=block===null?cell.totals:cell.blocks[block],p=group.protect,b=group.balanced,c=group.chase;
    assert.equal(p.n,b.n);assert.equal(c.n,b.n);assert(b.n>0);
    const addMetric=(key,delta)=>{totals[key].delta+=delta;totals[key].n+=b.n;};
    if(cell.score==='lead'){addMetric('protectLeadRetention',p.w-b.w);addMetric('chaseLeadLossCost',c.l-b.l);}
    if(cell.score==='trail')addMetric('chaseDeficitRescue',(c.w+c.d)-(b.w+b.d));
    addMetric('protectScoringCost',b.gf-p.gf);addMetric('chaseConcedingCost',c.ga-b.ga);
  }
  return Object.fromEntries(METRICS.map(key=>{const t=totals[key];assert(t.n>0);return[key,{delta:t.delta,denominator:t.n,mean:t.delta/t.n}];}));
}
function judge(summary,decision){
  const failed=METRICS.filter(key=>summary.metrics[key].mean<decision.floors[key]);
  assert.equal(failed.length,0,'OWNED_PLAN_OUTCOME_FLOORS:'+failed.join(','));return true;
}
let original,zero,fixtureRows,manifestSHA;
async function measure(T,points,label,first,last){
  const raw=sink(label+'.outcomes.jsonl'),means=sink(label+'.seed-means.jsonl'),seedMeans=new Map(),cohorts=[],count=last-first+1;let compatibility=0;
  try {
    for(const fixture of fixtureRows){
      const initial=fixture.initialState,inputHash=sha(snapshot(initial)),planned=Object.fromEntries(PLANS.map(plan=>[plan,commit(T,initial,plan)]));
      const actualRates=Object.fromEntries(PLANS.map(plan=>[plan,rates(T,planned[plan],fixture.academyEdge,points,plan)]));
      const fullySaturated=PLANS.every(plan=>actualRates[plan].homeExpectedGoals===actualRates.balanced.homeExpectedGoals&&actualRates[plan].awayExpectedGoalsAfterAcademy===actualRates.balanced.awayExpectedGoalsAfterAcademy);
      const totals=Object.fromEntries(PLANS.map(plan=>[plan,sums()])),blocks=[0,1].map(()=>Object.fromEntries(PLANS.map(plan=>[plan,sums()])));
      for(let seed=first;seed<=last;seed++){
        const bind=value=>({...value,__scenarioOrdinal:fixture.ordinal});
        const old=play(original,bind(initial),seed,fixture.academyEdge);
        if(seed-first<64){const absent=play(T,bind(initial),seed,fixture.academyEdge);neutralEqual(T,old,absent,'ABSENT_PLAN_ORIGINAL');compatibility++;}
        for(let index=0;index<PLANS.length;index++){
          const plan=PLANS[index],r=play(T,bind(planned[plan]),seed,fixture.academyEdge);
          assert.equal(T.matchPlanFor(r.state),null,'FULL_TIME_IDENTITY_EXPIRES');
          if(plan==='balanced'||fullySaturated)neutralEqual(T,old,r,plan==='balanced'?'BALANCED_METADATA_ONLY':'FULLY_SATURATED_NEUTRAL');
          add(totals[plan],r);add(blocks[seed-first<count/2?0:1][plan],r);
          const key=seed+'|'+plan,mean=seedMeans.get(key)??{seed,plan,...sums()};add(mean,r);seedMeans.set(key,mean);
          raw.row([points,fixture.ordinal,seed,index,['win','draw','loss'].indexOf(r.result),r.gf,r.ga,r.pay,r.calls]);
        }
      }
      assert.equal(sha(snapshot(initial)),inputHash,'FROZEN_INITIAL_STATE_HELD');
      for(const plan of PLANS){assert.equal(totals[plan].n,count);assert.equal(totals[plan].rolls,count*60);}
      cohorts.push({id:fixture.id,ordinal:fixture.ordinal,score:fixture.score,actualRates,fullySaturated,totals,blocks});
      console.log('MEASURE '+label+' '+fixture.id+' seeds '+first+'..'+last+' complete.');
    }
    for(const row of seedMeans.values()){assert.equal(row.n,81);means.row({seed:row.seed,plan:row.plan,cohorts:row.n,winMean:row.w/row.n,drawMean:row.d/row.n,lossMean:row.l/row.n,lateGoalsForMean:row.gf/row.n,lateGoalsAgainstMean:row.ga/row.n,payoutMean:row.pay/row.n,callerRolls:row.rolls});}
  } finally {var rawReceipt=raw.end(),meanReceipt=means.end();}
  assert.equal(cohorts.length,81);assert.equal(rawReceipt.rows,81*count*3);
  const summary={schema:1,phase:PHASE,points,label,firstSeed:first,lastSeed:last,scenarioManifestSHA256:manifestSHA,cohorts,metrics:metrics(cohorts),halfBlocks:[metrics(cohorts,0),metrics(cohorts,1)],absentCompatibilityTrials:compatibility,balancedCompatibilityTrials:81*count,originalOracleTrials:81*count,measuredPlanTrials:81*count*3,totalRemainderTrials:81*count*4+compatibility,outcomes:rawReceipt,seedMeans:meanReceipt,allCohortsIncluded:true,parameterSelected:false,productReady:false};
  write(label+'.summary.json',summary);return summary;
}
try {
  original=await bundled(path.join(OUT,'original-engine.ts'),'original');
  zero=await bundled(path.join(OUT,'zero-engine.ts'),'zero');
  for(const key of ['matchPlanFor','canSetMatchPlan','setMatchPlan'])assert.equal(typeof zero[key],'function','FUTURE_FROZEN_API_REQUIRED:'+key);
  fixtureRows=await scenarios(original);write('scenario-manifest.json',fixtureRows);manifestSHA=sha(bytes(path.join(OUT,'scenario-manifest.json')));
  write('RUN-CONTRACT.json',{phase:PHASE,source:process.env.GITHUB_SHA,zeroEngineSHA256:sha(zeroBody),originalEngineSHA256:sha(originalBody),points:POINTS,plans:PLANS,scenarioCount:81,rngDomain:RNG_DOMAIN,initialDomain:INITIAL_DOMAIN,seedMix:'actual hash32(seed,scenarioOrdinal,domain) then held tycoonBots.mulberry',calibrationSeeds:[1,2000],holdoutSeeds:[100001,108000],initialSearchSeeds:[1,4096],absentCompatibility:'first64 seeds of every scenario and candidate',rawColumns:['points','scenarioOrdinal','seed','planIndex','resultIndex','lateGF','lateGA','actualPayout','callerRolls'],resultIndex:['win','draw','loss'],unclampedDiagnostic:'actual LAW.base + input * LAW.perPoint + venue; outcomes always actual playMinute',noSettlementOrRivalFixtureShortcut:true,holdoutNotReadBeforeFrozenDecision:true});
  if(PHASE==='calibration'){
    const summaries=[];
    for(const points of POINTS){const file=path.join(OUT,'candidate-'+points+'.ts');fs.writeFileSync(file,sourceAt(points),{flag:'wx'});summaries.push(await measure(await bundled(file,'candidate-'+points),points,'calibration-'+points,1,2000));}
    write('CALIBRATION-COMPLETE.json',{status:'MEASURED_ALL_FOUR_PREDECLARED_CANDIDATES_NO_SELECTION',source:process.env.GITHUB_SHA,zeroEngineSHA256:sha(zeroBody),scenarioManifestSHA256:manifestSHA,summaries:summaries.map(s=>({points:s.points,metrics:s.metrics,halfBlocks:s.halfBlocks,summarySHA256:sha(bytes(path.join(OUT,s.label+'.summary.json')))})),holdout:'UNRUN',controls:'UNRUN_REQUIRES_FROZEN_SELECTION',parameterSelected:false});
  } else {
    const decision=pinDecision();assert.equal(decision.scenarioManifestSHA256,manifestSHA);
    const working=path.join(OUT,'selected-working-engine.ts'),healthy=Buffer.from(sourceAt(decision.selectedPoints));
    fs.writeFileSync(working,healthy,{flag:'wx'});
    if(PHASE==='controls'){
      const positive=await measure(await bundled(working,'control-positive'),decision.selectedPoints,'controls-healthy',1,2000);judge(positive,decision);
      const controls=[];
      for(const [id,value] of [['neutralized',0],['reversed',-decision.selectedPoints]]){
        const prefix='control-'+id,changed=Buffer.from(sourceAt(value));assert.notDeepEqual(changed,healthy);assert.deepEqual(bytes(working),healthy);
        fs.writeFileSync(path.join(OUT,prefix+'.before.ts'),bytes(working),{flag:'wx'});let refusal=null,restoration=null;
        try {
          fs.writeFileSync(working,changed);assert.deepEqual(bytes(working),changed);fs.writeFileSync(path.join(OUT,prefix+'.changed.ts'),bytes(working),{flag:'wx'});
          const bad=await measure(await bundled(working,prefix),value,prefix,1,2000);
          try{judge(bad,decision);}catch(error){refusal=String(error.message);}
          assert(refusal&&refusal.includes('OWNED_PLAN_OUTCOME_FLOORS'),'OWNED_SOURCE_CONTROL_REFUSAL:'+id);
        } finally {
          fs.writeFileSync(working,healthy);assert.deepEqual(bytes(working),healthy);fs.writeFileSync(path.join(OUT,prefix+'.restored.ts'),bytes(working),{flag:'wx'});
          const restored=await measure(await bundled(working,prefix+'-restored'),decision.selectedPoints,prefix+'-restored',1,2000);judge(restored,decision);
          assert.equal(restored.outcomes.sha256,positive.outcomes.sha256,'SAME_SOURCE_AND_STREAM_RESTORED');restoration=true;
          controls.push({id,value,refusal,restoration,sameWorkingFile:working,beforeSHA256:sha(healthy),changedSHA256:sha(changed),restoredSHA256:sha(bytes(working))});write(prefix+'.receipt.json',controls.at(-1));
        }
      }
      write('SOURCE-CONTROLS-COMPLETE.json',{status:'TWO_EFFECTIVE_SOURCE_CONTROLS_AND_SAME_COPY_HEALTHY_RESTORES',decisionSHA256:decision.decisionSHA256,zeroEngineSHA256:sha(zeroBody),scenarioManifestSHA256:manifestSHA,controls,holdout:'UNRUN'});
    } else {
      const controlFile=process.env.STADIUM_PLAN_CONTROLS_JSON,controlPin=process.env.STADIUM_PLAN_CONTROLS_SHA256;
      assert(controlFile&&/^[a-f0-9]{64}$/.test(controlPin||''),'ACTUAL_SOURCE_CONTROLS_RECEIPT_REQUIRED');assert.equal(sha(bytes(controlFile)),controlPin);
      const controls=JSON.parse(bytes(controlFile));assert.equal(controls.status,'TWO_EFFECTIVE_SOURCE_CONTROLS_AND_SAME_COPY_HEALTHY_RESTORES');assert.equal(controls.decisionSHA256,decision.decisionSHA256);assert.equal(controls.zeroEngineSHA256,sha(zeroBody));assert.equal(controls.scenarioManifestSHA256,manifestSHA);assert.equal(controls.controls.length,2);assert.deepEqual(controls.controls.map(row=>row.id),['neutralized','reversed']);assert.deepEqual(controls.controls.map(row=>row.value),[0,-decision.selectedPoints]);
      for(const row of controls.controls){assert(row.refusal.includes('OWNED_PLAN_OUTCOME_FLOORS')&&row.restoration===true);assert.notEqual(row.beforeSHA256,row.changedSHA256);assert.equal(row.beforeSHA256,row.restoredSHA256);}
      const held=await measure(await bundled(working,'holdout'),decision.selectedPoints,'holdout',100001,108000);judge(held,decision);
      write('HOLDOUT-COMPLETE.json',{status:'FROZEN_SELECTED_PARAMETER_PASSED_PREDECLARED_HOLDOUT',decisionSHA256:decision.decisionSHA256,sourceControlsSHA256:controlPin,zeroEngineSHA256:sha(zeroBody),scenarioManifestSHA256:manifestSHA,metrics:held.metrics,summarySHA256:sha(bytes(path.join(OUT,'holdout.summary.json'))),productReady:false});
    }
  }
} catch(error){write('MEASUREMENT-NOT-ADMITTED.json',{status:'MEASUREMENT_NOT_ADMITTED',phase:PHASE,error:String(error.stack||error),productReady:false});process.exitCode=2;}
finally{
  try{for(const row of before)assert.equal(sha(bytes(row.file)),row.sha256,'SHIPPING_SOURCE_HELD:'+row.file);write('source-after.json',before);}
  catch(error){write('SOURCE-HOLD-FAILURE.json',{error:String(error.stack||error)});process.exitCode=2;}
}
if(!process.exitCode)console.log('STADIUM_PLAN_MEASUREMENT_COMPLETE: '+PHASE+' completed with shipping source held; no product-ready claim.');
