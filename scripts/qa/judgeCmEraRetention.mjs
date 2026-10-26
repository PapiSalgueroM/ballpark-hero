import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

let failurePath;
async function main(){
 const [baselineArg,candidateArg,outArg,...extra]=process.argv.slice(2);assert(extra.length===0&&baselineArg&&candidateArg&&outArg,'CM_ERA_JUDGE_ARGUMENTS');
 const baselineDir=fs.realpathSync(baselineArg),candidateDir=fs.realpathSync(candidateArg),OUT=path.resolve(outArg),SELF=fs.realpathSync(fileURLToPath(import.meta.url));
 assert(baselineDir!==candidateDir&&!fs.existsSync(OUT),'CM_ERA_JUDGE_ISOLATION');
 assert(!OUT.startsWith(baselineDir+path.sep)&&!OUT.startsWith(candidateDir+path.sep),'CM_ERA_JUDGE_OUTSIDE_RECORDINGS');fs.mkdirSync(OUT);failurePath=path.join(OUT,'failure.json');
 const sha=b=>createHash('sha256').update(b).digest('hex');
 function regular(file){const s=fs.lstatSync(file);assert(s.isFile()&&!s.isSymbolicLink(),'CM_ERA_JUDGE_REGULAR');return fs.readFileSync(file);}
 const save=(name,value)=>{assert.equal(path.basename(name),name);fs.writeFileSync(path.join(OUT,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});};
 const load=(dir,name)=>{assert.equal(path.basename(name),name);return JSON.parse(regular(path.join(dir,name)));};
 function boundBody(dir,row){assert.equal(path.basename(row.file),row.file);const b=regular(path.join(dir,row.file));assert.equal(b.length,row.bytes);assert.equal(sha(b),row.sha256,'CM_ERA_RECORDED_BODY_HASH');return JSON.parse(b);}
 const expectedEras={baseline:'74fcf309fee3943670a4ec1c44333a68ffb290f67b1d1325769dc2d368e55ec3',candidate:'4cc47c4d80912bb2fd8aaa8e8246ce92db3eac69c5ad1e14f8576643eed31c54'};
 const expectedRecorderSha='1150b95459022f847766b934caf2952280554dd07dc4f1697725c520e5d746da';
 const recording=(dir,arm)=>{
  const index=load(dir,'index.json'),complete=load(dir,'recorder-complete.json'),start=load(dir,'recorder-start.json');
  assert.equal(index.schema,'cm-era-retention-recordings-v1');assert.equal(index.arm,arm);assert.deepEqual(index.recorder,start);assert.equal(start.sha256,expectedRecorderSha,'CM_ERA_EXECUTED_RECORDER_SOURCE');
  assert(Number.isInteger(start.pid)&&start.pid>0);assert.equal(complete.pid,start.pid);assert.equal(complete.arm,arm);assert.equal(complete.sourceEndHeld,true);assert.equal(complete.offlineReceiptBytes,0);
  assert.equal(index.worldRecords,46);assert.equal(index.effectiveCacheKeys,44);assert.equal(complete.worldRecords,46);assert.equal(complete.effectiveCacheKeys,44);assert.equal(index.records.length,46);
  const before=load(dir,'source-bindings.before.json'),after=load(dir,'source-bindings.after.json');assert.deepEqual(after,before);assert.deepEqual(before,index.sourceBindings);
  assert.equal(before['src/lib/clubManagerEras.ts'].sha256,expectedEras[arm]);assert.equal(sha(regular(path.join(dir,'clubManagerEras.actual.ts'))),expectedEras[arm]);
  const graph=load(dir,'resolved-module-graph.json'),closed=load(dir,'bundle.closed.json');
  assert.deepEqual(graph.bundlerNative,closed);assert(Number.isInteger(closed.pid)&&closed.pid>0&&closed.closed&&closed.status===0&&closed.signal===null&&closed.error===null&&!closed.deadlineExpired&&closed.receiptBytes===0,'CM_ERA_RECORDED_BUNDLE_NATIVE');
  for(const stream of ['stdout','stderr']){const body=regular(path.join(dir,'bundle.'+stream));assert.equal(body.length,closed[stream+'Bytes']);assert.equal(sha(body),closed[stream+'Sha256']);}
  assert.equal(regular(path.join(dir,'bundle.transport')).length,0);
  const bundle=regular(path.join(dir,index.bundle.file));assert.equal(bundle.length,index.bundle.bytes);assert.equal(sha(bundle),index.bundle.sha256);assert.equal(graph.bundle.sha256,index.bundle.sha256);
  assert.deepEqual(Object.keys(graph.inputs).sort(),['@entry',...Object.keys(before).filter(file=>before[file].role==='runtime')].sort());
  for(const [file,pin]of Object.entries(graph.inputs))if(file!=='@entry')assert.deepEqual(pin,{bytes:before[file].bytes,sha256:before[file].sha256,gitBlob:before[file].gitBlob});
  const ids=new Set(),keys=new Set(),records=[];
  for(const row of index.records){
   const expectedId=row.era+'-'+(row.seed===null?'unseeded':'seed31')+'-y'+String(row.year).padStart(2,'0');
   assert(['era2005','now'].includes(row.era)&&(row.seed===null||row.seed===31));assert.equal(row.startYear,row.era==='era2005'?2005:2026);assert.equal(row.pid,start.pid);
   assert.equal(row.id,expectedId);assert.equal(row.file,row.id+'.world.json');assert(!ids.has(row.id));ids.add(row.id);
   assert.equal(row.effectiveCacheKey,row.era+'|'+row.year+(row.year>0&&row.seed!==null?'|seed:'+row.seed:''));keys.add(row.effectiveCacheKey);
   assert.deepEqual(load(dir,row.id+'.record.json'),row);
   const world=boundBody(dir,row);assert.deepEqual(Object.keys(row.xis).sort(),Object.keys(world).sort());
   for(const value of Object.values(row.xis))assert(value===null||Number.isFinite(value),'CM_ERA_ACTUAL_XI_VALUE');
   records.push({...row,world});
  }
  const wanted=[];for(const era of ['era2005','now'])for(const seed of [null,31])for(const year of [0,1,2,3,4,5,6,7,8,9,10,...(era==='now'&&seed===null?[20,30]:[])])wanted.push(era+'-'+(seed===null?'unseeded':'seed31')+'-y'+String(year).padStart(2,'0'));
  assert.deepEqual([...ids].sort(),wanted.sort());assert.equal(keys.size,44);
  for(const era of ['era2005','now'])assert.equal(records.find(r=>r.era===era&&r.year===0&&r.seed===null).sha256,records.find(r=>r.era===era&&r.year===0&&r.seed===31).sha256);
  return{dir,index,complete,graph,records,modern:boundBody(dir,index.modern),pid:start.pid,bundlePid:closed.pid};
 };
 const baseline=recording(baselineDir,'baseline'),candidate=recording(candidateDir,'candidate');
 assert.notEqual(baseline.pid,candidate.pid);assert.notEqual(baseline.graph.root,candidate.graph.root,'CM_ERA_SEPARATE_SOURCE_ROOTS');assert.notEqual(baseline.graph.bundle.file,candidate.graph.bundle.file);
 const bPins=baseline.index.sourceBindings,cPins=candidate.index.sourceBindings;assert.deepEqual(Object.keys(bPins).sort(),Object.keys(cPins).sort());
 for(const file of Object.keys(bPins))if(file!=='src/lib/clubManagerEras.ts')assert.deepEqual(bPins[file],cPins[file],'CM_ERA_ONLY_REVIEWED_SOURCE_DIFFERENCE');
 assert.deepEqual(baseline.modern,candidate.modern,'CM_ERA_SAME_BAKED_WORLD');
 const mean=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0;
 function stats(rows){
  const ages=rows.map(r=>r.a).sort((a,b)=>a-b),q=p=>ages.length?ages[Math.floor((ages.length-1)*p)]:null;
  return{count:rows.length,age:{mean:ages.length?mean(ages):null,q05:q(.05),q25:q(.25),median:q(.5),q75:q(.75),q95:q(.95),bands:{through21:ages.filter(a=>a<=21).length,age22to25:ages.filter(a=>a>=22&&a<=25).length,age26to29:ages.filter(a=>a>=26&&a<=29).length,age30to33:ages.filter(a=>a>=30&&a<=33).length,age34plus:ages.filter(a=>a>=34).length}},ratingMean:rows.length?mean(rows.map(r=>r.r)):null,valueMean:rows.length?mean(rows.map(r=>r.v)):null};
 }
 function groups(rows){
  const result={all:stats(rows),original:stats(rows.filter(p=>p.g!==true)),generated:stats(rows.filter(p=>p.g===true)),keeper:stats(rows.filter(p=>p.p==='GK')),outfield:stats(rows.filter(p=>p.p!=='GK')),positions:{}};
  for(const p of [...new Set(rows.map(p=>p.p))].sort())result.positions[p]=stats(rows.filter(row=>row.p===p));
  return result;
 }
 function identities(record){
  const out=new Map();
  for(const [club,rows]of Object.entries(record.world)){
   assert(Array.isArray(rows));for(const p of rows){
    assert(typeof p.n==='string'&&p.n&&typeof p.p==='string'&&p.p&&Number.isSafeInteger(p.a)&&p.a>0&&Number.isSafeInteger(p.since)&&p.since>=0&&Number.isFinite(p.r)&&Number.isFinite(p.v),'CM_ERA_PLAYER_RECORD');
    const key=JSON.stringify([record.era,club,p.n,p.p,record.startYear+record.year-p.a,p.since]);
    if(p.worldRosterKey!==undefined)assert.equal(p.worldRosterKey,key,'CM_ERA_CARRIED_IDENTITY_FORMULA');
    assert(!out.has(key),'CM_ERA_DUPLICATE_IDENTITY');out.set(key,{key,club,player:p});
   }
  }
  return out;
 }
 const maps={baseline:new Map(),candidate:new Map()},sharedMismatches=[],paired=[];
 for(const arm of [baseline,candidate]){
  const map=maps[arm.index.arm],summary=[];
  for(const record of arm.records){
   const ids=identities(record);map.set(record.id,ids);
   const all=[...ids.values()].map(row=>row.player),clubs={};for(const [club,rows]of Object.entries(record.world))clubs[club]=groups(rows);
   const row={id:record.id,era:record.era,seed:record.seed,year:record.year,sourceWorldSha256:record.sha256,world:groups(all),clubs};
   save(arm.index.arm+'-'+record.id+'.summary.json',row);summary.push({id:record.id,world:row.world});
  }
  save(arm.index.arm+'-summary-index.json',summary);
 }
 for(const b of baseline.records){
  const c=candidate.records.find(row=>row.id===b.id),bm=maps.baseline.get(b.id),cm=maps.candidate.get(b.id);assert(c);
  let sharedOriginal=0;
  for(const [key,row]of bm)if(row.player.g!==true&&cm.has(key)&&cm.get(key).player.g!==true){sharedOriginal++;if(JSON.stringify(row.player)!==JSON.stringify(cm.get(key).player))sharedMismatches.push({id:b.id,key,baseline:row.player,candidate:cm.get(key).player});}
  paired.push({id:b.id,baseline:stats([...bm.values()].map(r=>r.player)),candidate:stats([...cm.values()].map(r=>r.player)),sharedOriginal});
 }
 const transitions=[];
 for(const arm of [baseline,candidate])for(const era of ['era2005','now'])for(const seed of [null,31]){
  const sequence=arm.records.filter(r=>r.era===era&&r.seed===seed&&r.year<=10).sort((a,b)=>a.year-b.year),initial=maps[arm.index.arm].get(sequence[0].id);
  for(let i=1;i<sequence.length;i++){
   const previous=maps[arm.index.arm].get(sequence[i-1].id),current=maps[arm.index.arm].get(sequence[i].id),missing=[...previous.values()].filter(row=>!current.has(row.key)),entered=[...current.values()].filter(row=>!previous.has(row.key));
   const initialCohorts={};for(const [key,row]of initial){const p=row.player,bucket='initialAge'+Math.floor(p.a/5)*5+'-initialRating'+Math.floor(p.r/10)*10;initialCohorts[bucket]??={starting:0,surviving:0};initialCohorts[bucket].starting++;if(current.has(key))initialCohorts[bucket].surviving++;}
   transitions.push({arm:arm.index.arm,era,seed,fromYear:sequence[i-1].year,toYear:sequence[i].year,missing:missing.map(r=>({key:r.key,club:r.club,generated:r.player.g===true,attainedAge:r.player.a+1,nonretirementAttrition:r.player.a+1<32})),newGenerated:entered.filter(r=>r.player.g===true).map(r=>({key:r.key,club:r.club,position:r.player.p})),initialCohorts});
  }
 }
 const reported=[];
 for(const seed of [null,31]){
  const find=(arm,year)=>{const r=arm.records.find(row=>row.era==='era2005'&&row.seed===seed&&row.year===year);return [...maps[arm.index.arm].get(r.id).values()].filter(row=>row.club==='Barcelona'&&row.player.n==='Lionel Messi'&&row.player.g!==true);};
  const original=find(baseline,0);assert.equal(original.length,1,'CM_ERA_REPORTED_BAKED_IDENTITY');
  reported.push({seed,identity:original[0].key,originalRow:original[0].player,keyedExit:'Barcelona|Lionel Messi|2|ret',baseline:[0,1,2,3].map(year=>({year,rows:find(baseline,year)})),candidate:[0,1,2,3].map(year=>({year,rows:find(candidate,year)}))});
 }
 save('comparison.json',{schema:'cm-era-retention-paired-comparison-v1',pid:process.pid,judge:{file:SELF,sha256:sha(regular(SELF))},collectorPids:[baseline.pid,candidate.pid],bundlerPids:[baseline.bundlePid,candidate.bundlePid],worldRecords:92,effectiveCacheKeys:88,paired,sharedOriginalMismatches:sharedMismatches,reportedCase:reported,scope:'Measured background projections only. No user-save, owned-ledger overlay, national callup, market or full simEras execution.'});
 save('identity-transitions.json',transitions);
 const modernRecords=arm=>new Map(arm.records.filter(row=>row.era==='now'&&row.seed===null).map(row=>[row.year,row]));
 function legacyWorldGuards(records,modern){
  const REAL=modern.rosters,WORLD={CM_WORLD_PARTIAL:modern.partial},REAL_COUNT=Object.values(REAL).flat().length;
  const projectedWorld=y=>{const record=records.get(y);assert(record,'CM_ERA_LEGACY_SCOPE');return record.world;};
  const projectedXIAvg=(club,y)=>{const record=records.get(y);assert(Object.hasOwn(record.xis,club),'CM_ERA_ACTUAL_XI_PRESENT');return record.xis[club];};
  const fx=(v,n=2)=>Number(v).toFixed(n);
  const fail=message=>assert.fail((message.startsWith('the whole world averages ')?'CM_ERA_LEGACY_AGE':'CM_ERA_LEGACY_GUARD')+': '+message);
  for (const y of [0, 5, 10, 20, 30]) {
    const world = projectedWorld(y);
    const sizes = Object.values(world).map(r => r.length);
    const all = Object.values(world).flat();
    const empty = sizes.filter(n => n === 0).length;
    const xis = Object.keys(world).map(c => projectedXIAvg(c, y)).filter(v => v !== null);
    const oldPerClub = Object.values(world).filter(r => r.length).map(r => Math.max(...r.map(p => p.a)));
    console.log(`   world +${String(y).padStart(2)}y: ${all.length} players, mean age ${fx(mean(all.map(p => p.a)), 1)}, club XI mean ${fx(mean(xis), 1)} (min ${Math.min(...xis)}, max ${Math.max(...xis)}), oldest club man median ${oldPerClub.sort((a, b) => a - b)[Math.floor(oldPerClub.length / 2)]}`);
    /* Some clubs are empty in the bake itself (the dataset ranks players by
       value worldwide and the smallest squads sit under its floor) and the
       engine youth-pads them. The honest bound is the bake's own truth, not
       a number pinned in a harness: every empty club must be one that baked
       empty AND is disclosed in CM_PARTIAL. Round 140 grew that set from 3
       to 10 when Portugal, Scotland and Turkey arrived. */
    /* Round 1304: read off the joined world and its joined partial list (the
       world, not the bake, is what a projection starts from). The bake is
       712 men short of the world, so 98 percent of the bake let the world
       lose about 800 men unnoticed; it is 98 percent of the world now. */
    const bakedEmpty = Object.entries(REAL).filter(([, r]) => r.length === 0).map(([c]) => c);
    const undisclosed = bakedEmpty.filter(c => !WORLD.CM_WORLD_PARTIAL.includes(c));
    if (undisclosed.length) fail(`empty clubs not disclosed in CM_PARTIAL: ${undisclosed.join(', ')}`);
    if (empty > bakedEmpty.length) fail(`${empty} clubs have no players at all at +${y} years, but only ${bakedEmpty.length} baked empty: somebody new ran dry`);
    if (all.length < REAL_COUNT * 0.98) fail(`the world lost players by +${y} years (${all.length})`);
    if (mean(all.map(p => p.a)) > 27.5) fail(`the whole world averages ${fx(mean(all.map(p => p.a)), 1)} years old at +${y}`);
    /* The anchor is the measured year-zero mean club XI of the CURRENT
       world and moves when the world's composition does. 74.1 was the
       272-club world; Round 177 added Austria and Greece, 24 clubs whose
       thin tails run youth-padded, and the measured mean settled at 71.6.
       The check still catches what it exists to catch: the PROJECTION
       drifting away from year zero across the three horizons. */
    if (Math.abs(mean(xis) - 71.6) > 2.5) fail(`club strength drifted to ${fx(mean(xis), 1)} at +${y} years, it starts at 71.6`);
    // The pecking order itself, not just the average.
    const strong = projectedXIAvg('Real Madrid', y);
    const weak = projectedXIAvg('Lincoln City', y);
    if (!(strong > weak + 15)) fail(`Real Madrid (${strong}) is no longer far stronger than Lincoln City (${weak}) at +${y}`);
  }

 }
 const bModern=modernRecords(baseline);legacyWorldGuards(bModern,baseline.modern);
 const actual=baseline.records.find(row=>row.era==='now'&&row.seed===null&&row.year===10),before=regular(path.join(baselineDir,actual.file)),work=path.join(OUT,'age-control.work.json');
 fs.writeFileSync(path.join(OUT,'age-control.before.json'),before,{flag:'wx'});fs.writeFileSync(work,before,{flag:'wx'});
 const control={pid:process.pid,nativeProcessesAdded:0,diagnosticCounts:[0],changed:false,exactRestoration:false,beforeSha256:sha(before),error:null};
 try{
  const changedWorld=JSON.parse(before);for(const rows of Object.values(changedWorld))for(const p of rows)p.a=40;
  const changed=Buffer.from(JSON.stringify(changedWorld,null,2)+'\n');assert(!changed.equals(before),'CM_ERA_AGE_CONTROL_EFFECTIVE');
  fs.writeFileSync(work,changed);fs.writeFileSync(path.join(OUT,'age-control.changed.json'),changed,{flag:'wx'});control.changed=true;control.changedSha256=sha(changed);
  const records=new Map(bModern);records.set(10,{...actual,world:JSON.parse(regular(work))});
  let observed;try{legacyWorldGuards(records,baseline.modern);}catch(error){observed=error;}
  assert(observed?.name==='AssertionError'&&observed.message.startsWith('CM_ERA_LEGACY_AGE:')&&observed.stack.includes('legacyWorldGuards')&&observed.stack.includes(path.basename(SELF)),'CM_ERA_AGE_CONTROL_OWNED_ASSERTION');
  control.error={name:observed.name,message:observed.message,stack:observed.stack};control.diagnosticCounts.push(1);
 }finally{
  fs.writeFileSync(work,before);const restored=regular(work);fs.writeFileSync(path.join(OUT,'age-control.restored.json'),restored,{flag:'wx'});
  control.exactRestoration=restored.equals(before);control.restoredSha256=sha(restored);assert(control.exactRestoration,'CM_ERA_AGE_CONTROL_RESTORED');
  const records=new Map(bModern);records.set(10,{...actual,world:JSON.parse(restored)});legacyWorldGuards(records,baseline.modern);control.diagnosticCounts.push(0);save('age-control.json',control);
 }
 assert.deepEqual(control.diagnosticCounts,[0,1,0]);assert.equal(sharedMismatches.length,0,'CM_ERA_SHARED_ORIGINAL_DEVELOPMENT');
 for(const row of reported){
  assert.equal(row.baseline[1].rows.length,1,'CM_ERA_REPORTED_BASELINE_BEFORE');
  assert.equal(row.baseline[2].rows.length,0,'CM_ERA_REPORTED_BASELINE_EXIT');
  assert.equal(row.baseline[3].rows.length,0,'CM_ERA_REPORTED_BASELINE_STILL_ABSENT');
  for(const record of row.candidate)assert.equal(record.rows.length,1,'CM_ERA_REPORTED_CANDIDATE_RETENTION');
 }
 save('reported-case-admission.json',{rows:reported,sourceDefinedUnder32RetirementChance:0,userSaveReproduced:false});
 legacyWorldGuards(modernRecords(candidate),candidate.modern);
 save('judge-complete.json',{pid:process.pid,worldRecords:92,effectiveCacheKeys:88,baselineOriginalGuards:'PASS',candidateOriginalGuards:'PASS',sourceCandidateAdoption:'NOT_ADOPTION_READY',scope:'Only the bounded paired diagnostic and retained simEras world clauses. Four existing regressions, two source triplets, remaining full harness and Owner I review remain separate requirements.'});
}
main().catch(error=>{try{if(failurePath)fs.writeFileSync(failurePath,JSON.stringify({name:error.name,message:error.message,stack:error.stack,pid:process.pid},null,2)+'\n',{flag:'wx'});}catch{}console.error(error.stack??error);process.exitCode=1;});
