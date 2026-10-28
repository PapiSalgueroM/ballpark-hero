import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';

assert.equal(process.env.CI,'1','Remote CI qualification only');
const ROOT=process.cwd(),OUT=path.resolve(process.env.SC_SERIEB_QUAL_OUT||'serieb-baseline-artifacts/qualification');
const mode=process.argv[2],manifestPath='qa/sc-serieb-release-v1/BASELINE-SOURCE-READY.json';
assert(['source','run'].includes(mode),'Explicit baseline mode');
fs.mkdirSync(OUT,{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex');
const git=b=>createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
const write=(name,value)=>fs.writeFileSync(path.join(OUT,name+'.json'),JSON.stringify(value,null,2));
const plain=text=>text.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g,'');
const spec=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
assert(typeof spec.baseCommit==='string'&&/^[0-9a-f]{40}$/.test(spec.baseCommit),'Explicit source-vetted clean L2 parent');
assert.equal(spec.baseCommit,process.env.SC_SERIEB_SOURCE_BASE,'Source parent environment binding');
assert(typeof spec.baseTree==='string'&&/^[0-9a-f]{40}$/.test(spec.baseTree),'Explicit source-vetted clean L2 tree');
assert.equal(spec.baseTree,process.env.SC_SERIEB_SOURCE_TREE,'Source tree environment binding');
assert.equal(spec.critical.length,15);assert.equal(spec.producers.length,1);assert.equal(spec.cases.length,7);assert.equal(spec.allowedChanges.length,7);
const allPins=[...spec.critical,...spec.producers];
assert.equal(new Set(allPins.map(row=>row.path)).size,16,'Distinct frozen physical sources');
const pin=row=>{const b=fs.readFileSync(row.path);assert.equal(b.length,row.bytes,row.path);assert.equal(sha(b),row.sha256,row.path);assert.equal(git(b),row.gitBlob,row.path);return{path:row.path,bytes:b.length,sha256:sha(b),gitBlob:git(b)};};
const sourceBefore=allPins.map(pin),sourceExpected=Object.fromEntries(spec.critical.map(row=>[row.path,row.sha256]));
write('source-before',sourceBefore);
fs.writeFileSync(path.join(OUT,'expected-paths.txt'),[...spec.allowedChanges].sort().join('\n')+'\n');

function assertCausalBaseline(report) {
 const rows=report.cases,fixture=report.fixture,added=fixture?.appendedDefinitions,sort=a=>[...a].sort();
 assert(Array.isArray(rows)&&rows.length===7,'causal.seven-rows');
 assert(Array.isArray(added)&&added.length===20,'causal.appended20');
 const ids=new Set(added.map(c=>c.id)),names=new Set(added.map(c=>c.name));
 assert.equal(ids.size,20,'causal.unique-added-ids');assert.equal(names.size,20,'causal.unique-added-names');
 assert.deepEqual(added.map(c=>c.id),spec.expectedAddedIds,'causal.actual-added-ids');
 assert.deepEqual(added.map(c=>c.name),spec.expectedAddedNames,'causal.actual-added-names');
 assert(added.every(c=>c.country==='Italy'&&c.tier===4&&c.league==='Serie B'),'causal.actual-mapped-definitions');
 assert.equal(fixture.oldPoolCount,477,'causal.old-L2-pool477');
 assert.equal(spec.oldL2DeniedIds.length,17,'causal.old-L2-denial-census');
 const observations=rows.map((row,index)=>{assert.equal(row.index,index,'causal.row-order');assert(row.observation&&typeof row.observation==='object','causal.observation-'+index);return row.observation;});
 const [pool,ladder,table,normal,coursework,hand,saved]=observations;
 assert.deepEqual(pool.modern,[],'causal.pool.absent');
 assert.deepEqual(pool.expectedNames,spec.expectedAddedNames,'causal.pool.expected-members');
 assert.deepEqual(sort(pool.oldL2DeniedIds),sort(spec.oldL2DeniedIds),'causal.pool.old-L2-source-ids');
 assert.deepEqual(pool.expectedAddedIds,spec.expectedAddedIds,'causal.pool.new20-source-ids');
 assert.equal(pool.years.length,46,'causal.pool.all-pre2026-years');
 for(let index=0;index<46;index++){
  const at=pool.years[index];assert.equal(at.year,1980+index,'causal.pool.year-order');
  assert.deepEqual(sort(at.oldDenied),sort(spec.oldL2DeniedIds),'causal.pool.old-L2-denials');
  assert.deepEqual(at.candidateDenied,at.oldDenied,'causal.pool.old-denials-held');
  assert.deepEqual(at.delta,[],'causal.pool.no-new-denials-yet');
  assert.deepEqual(at.eraLeak,[],'causal.pool.no-ordinary-era-leak');
 }
 assert.deepEqual(ladder.groups,[],'causal.ladder.absent');assert.deepEqual(ladder.flat,[],'causal.ladder.no-members');
 assert.deepEqual(table,{old:{year:2025,size:null,dugout:null,points:null,meetings:null,games:null},modern:{year:2026,size:null,dugout:20,points:null,meetings:null,games:null}},'causal.table.actual-old-baseline');
 assert(Number.isInteger(normal.N)&&normal.N>0&&normal.N<=477,'causal.default.old-candidate-count');
 assert.equal(normal.N,normal.oldEligibleIds.length,'causal.default.actual-eligible-N');
 assert.equal(new Set(normal.oldEligibleIds).size,normal.N,'causal.default.unique-old-candidates');
 assert(normal.oldEligibleIds.every(id=>!ids.has(id)&&!spec.oldL2DeniedIds.includes(id)),'causal.default.old-helper-excludes-L2');
 assert.deepEqual(normal.candidateEligibleIds,[...normal.oldEligibleIds,...spec.expectedAddedIds],'causal.default.old-order-plus20');
 assert.equal(normal.u,(normal.N+0.5)/(normal.N+20),'causal.default.forced-u');
 assert(normal.u>=0&&normal.u<1,'causal.default.valid-u');
 const firstYear=(normal.historical.seasons[normal.historical.seasons.length-1]?.year??2024)+1;
 assert(firstYear<2026&&firstYear===fixture.value.firstYear&&normal.year===firstYear,'causal.default.historic-year');
 assert.equal(normal.raw,normal.inputRawAfter,'causal.default.input-held');assert.deepEqual(normal.historical,fixture.value.retired,'causal.default.actual-fixture');
 for(const arm of [normal.reference,normal.actual]){
  assert.equal(arm.value.phase,'manager_season','causal.default.canonical-manager-phase');assert(arm.value.managerState,'causal.default.actual-manager-state');
  assert.deepEqual(arm.draws,[normal.u],'causal.default.one-forced-draw');assert(Number.isFinite(arm.next)&&arm.next>=0&&arm.next<1,'causal.default.next-draw');
 }
 assert.equal(normal.actual.value.managerState.club,added[0].name,'causal.default.first-appended-employment');
 assert(!names.has(normal.reference.value.managerState.club),'causal.default.old-reference-employment');
 assert.notEqual(normal.actual.value.managerState.club,normal.reference.value.managerState.club,'causal.default.changed-employment');
 assert.equal(normal.actual.next,normal.reference.next,'causal.default.same-next-draw');
 const core=state=>{const out=structuredClone(state);delete out.managerState.club;delete out.managerState.clubTier;delete out.managerState.league;return out;};
 assert.deepEqual(core(normal.actual.value),core(normal.reference.value),'causal.default.only-employment-differs');
 assert.equal(coursework.rawAfter,coursework.before,'causal.coursework.input-held');assert.deepEqual(coursework.historical,fixture.value.retired,'causal.coursework.actual-fixture');
 assert.equal(coursework.request.source,'SAME historical object','causal.coursework.same-source-binding');assert(ids.has(coursework.request.clubId),'causal.coursework.real-added-request');
 const target=added.find(c=>c.id===coursework.request.clubId);
 assert.equal(coursework.request.clubName,target.name,'causal.coursework.request-name');assert.equal(coursework.request.country,target.country,'causal.coursework.request-country');assert.equal(coursework.request.level,target.tier,'causal.coursework.request-level');
 assert.equal(coursework.originalRead.value.length,3,'causal.coursework.three-old-source-quotes');assert.equal(coursework.read.value.length,3,'causal.coursework.three-current-quotes');
 assert(coursework.read.value.filter(q=>ids.has(q.clubId)).length>=2,'causal.coursework.at-least-two-added-choices');assert.deepEqual(coursework.read.value,coursework.originalRead.value,'causal.coursework.genuine-old-source-quotes');
 const request={...coursework.request};delete request.source;assert.deepEqual(request,coursework.originalRead.value.find(q=>q.clubId===request.clubId),'causal.coursework.actual-original-request');
 assert.deepEqual(coursework.originalRead.draws,[],'causal.coursework.old-read-no-draw');assert.deepEqual(coursework.read.draws,[],'causal.coursework.read-no-draw');
 assert.equal(coursework.commit.value.phase,'manager_season','causal.coursework.actual-commit-phase');assert.equal(coursework.commit.value.managerState.club,request.clubName,'causal.coursework.actual-commit-destination');
 assert.equal(coursework.commit.draws.length,1,'causal.coursework.canonical-one-draw');assert(coursework.commit.draws.every(v=>Number.isFinite(v)&&v>=0&&v<1),'causal.coursework.valid-draw');assert.equal(coursework.sameIdentity,false,'causal.coursework.commit-really-adopted');
 assert.equal(hand.handCount,190,'causal.preserve.hand190');assert.equal(hand.fingerprint,'e12e673153af2568','causal.preserve.hand-fingerprint');
 assert.equal(hand.oldGenerated.length,287,'causal.preserve.old-generated287');assert.equal(new Set(hand.oldGenerated.map(c=>c.id)).size,287,'causal.preserve.unique-old-generated');
 assert(hand.oldGenerated.every(c=>!ids.has(c.id)),'causal.preserve.old-generated-has-no-new20');
 assert.equal(Object.keys(hand.oldLadders).length,23,'causal.preserve.old-ladders23');assert.deepEqual(hand.currentLadders,hand.oldLadders,'causal.preserve.all-old-ladders');
 assert.deepEqual(sort(hand.oldL2Denied),sort(spec.oldL2DeniedIds),'causal.preserve.L2-denials');assert.deepEqual(hand.afterRead,hand.reference,'causal.preserve.default-receipt-and-tape');assert.equal(hand.rawAfter,hand.rawBefore,'causal.preserve.input-held');assert.deepEqual(hand.read.draws,[],'causal.preserve.coaching-read-no-draw');assert(hand.read.value.every(q=>!spec.oldL2DeniedIds.includes(q.clubId)),'causal.preserve.no-old-L2-quotes');
 assert.equal(sha(saved.raw),'81777bcd5a7631c70edf52c626484c00e0a687ab2fd9a7fae7f3c3a2ade0da25','causal.preserve.original-French-raw');
 assert.equal(saved.rawAfter,saved.raw,'causal.preserve.all-raw-bytes');assert.deepEqual(saved.loaded,JSON.parse(saved.raw),'causal.preserve.loaded-original-raw');
 assert.equal(saved.loaded.phase,'contract_offer','causal.preserve.saved-choice-phase');assert.deepEqual(saved.loaded.pendingOffers,[saved.offer],'causal.preserve.complete-offer');
 assert.deepEqual(saved.offer.club,{id:'career-lower-saint-etienne',name:'Saint-Étienne',country:'France',tier:4,color:'#64748b',league:'Ligue 2'},'causal.preserve.French-generic-tuple');
 const accepted=saved.accepted.value;assert.equal(accepted.phase,'playing','causal.preserve.accepted-phase');assert.equal(accepted.contractYearsLeft,saved.offer.contractYears,'causal.preserve.accepted-term');
 assert.deepEqual([accepted.currentClub,accepted.currentClubCountry,accepted.currentLeague,accepted.currentClubTier,accepted.currentClubColor],[saved.offer.club.name,saved.offer.club.country,saved.offer.club.league,saved.offer.club.tier,saved.offer.club.color],'causal.preserve.accepted-retained-tuple');assert.deepEqual(accepted.pendingOffers,[],'causal.preserve.choice-consumed');
 const oldFixture=JSON.parse(fs.readFileSync('qa/sc-serieb-release-v1/retained/fixtures.json','utf8'));
 assert.deepEqual(saved.replays.map(r=>r.key),['playing','retired'],'causal.preserve.genuine-replay-keys');
 for(const replay of saved.replays){assert.equal(replay.after,replay.before,'causal.preserve.genuine-raw-held');assert.deepEqual(replay.restored,oldFixture.value[replay.key],'causal.preserve.genuine-state-held');}
 assert.deepEqual(saved.genuine,fixture.value.offered,'causal.preserve.constructor-produced-pending');assert(saved.genuine.phase==='contract_offer'&&saved.genuine.pendingOffers.length>0,'causal.preserve.actual-pending-offer');
 assert.equal(saved.genuineRawAfter,saved.genuineRaw,'causal.preserve.genuine-pending-raw');assert.deepEqual(saved.genuineLoaded,saved.genuine,'causal.preserve.genuine-pending-state');assert.equal(saved.genuineAcceptance.value.currentClub,saved.genuine.pendingOffers[0].club.name,'causal.preserve.genuine-offer-accepted');assert.equal(saved.genuineAcceptance.value.phase,'playing','causal.preserve.genuine-playing');
}
function validate(input){
 assert.equal(input.status,1,'classifier.raw-exit');
 assert.equal(input.signal,null,'classifier.no-signal');assert.equal(input.error,null,'classifier.no-process-error');
 assert.equal(plain(input.stdout).trim(),spec.closing,'classifier.stdout-closing');
 assert.equal(plain(input.stderr).trim(),'','classifier.stderr-empty');
 assert(!/SERIEB_BASELINE_METHOD_ERROR|Unhandled|Uncaught|ERR_MODULE_NOT_FOUND|Cannot find module|SyntaxError|ReferenceError/.test(plain(input.stdout+'\n'+input.stderr)),'classifier.no-method-output');
 const r=input.report;
 assert(r&&typeof r==='object'&&!Array.isArray(r),'classifier.report-object');
 assert.equal(Object.hasOwn(r,'infrastructure'),false,'classifier.no-infrastructure');
 assert.deepEqual(r.methodErrors,[],'classifier.no-method-errors');
 assert.equal(r.status,'ASSERTION_RED','classifier.expected-red-status');
 assert.equal(r.sourceBase,spec.baseCommit,'classifier.source-parent');
 assert.equal(r.workingProductManifest,spec.referenceProductManifestSHA256,'classifier.L2-product-manifest');
 assert.deepEqual(r.totals,{cases:7,passed:2,failed:5,methodErrors:0},'classifier.exact-totals');
 assert(Array.isArray(r.cases)&&r.cases.length===7,'classifier.exact-seven-rows');
 for(let index=0;index<7;index++){
  const row=r.cases[index],expected=spec.cases[index];
  assert.equal(row.index,index,'classifier.row-index.'+index);assert.equal(row.name,expected.name,'classifier.row-name.'+index);
  assert.equal(row.status,expected.status,'classifier.row-status.'+index);assert.equal(row.marker,expected.requiredMessagePrefix,'classifier.row-marker.'+index);
  if(expected.status==='failed'){
   assert.equal(row.error?.name,'AssertionError','classifier.error-name.'+index);
   assert(typeof row.error.message==='string'&&row.error.message.startsWith(expected.requiredMessagePrefix),'classifier.error-prefix.'+index);
   assert(typeof row.error.stack==='string'&&row.error.stack.includes('AssertionError'),'classifier.real-assertion-stack.'+index);
  }else assert.equal(Object.hasOwn(row,'error'),false,'classifier.preservation-no-error.'+index);
 }
 assert.deepEqual(r.sourceBefore,sourceExpected,'classifier.source-before');
 assert.deepEqual(r.sourceAfter,sourceExpected,'classifier.source-after');
 assertCausalBaseline(r);
}
if(mode==='source')console.log('SERIEB_BASELINE_SOURCE: 15 critical and 1 producer body held; no product changes');
else{
 try{
  const raw=path.resolve(process.env.SC_SERIEB_BASELINE_OUT||'serieb-baseline-artifacts/consumer');fs.mkdirSync(raw,{recursive:true});
  const args=['scripts/qa/serieBReleaseBaseline.mjs'];
  const child=spawnSync(process.execPath,args,{cwd:ROOT,env:{...process.env,CI:'1',SC_SERIEB_BASELINE_OUT:raw},encoding:'utf8',timeout:180_000,maxBuffer:8*1024*1024});
  fs.writeFileSync(path.join(OUT,'consumer.stdout.log'),child.stdout||'');fs.writeFileSync(path.join(OUT,'consumer.stderr.log'),child.stderr||'');
  write('process',{status:child.status,signal:child.signal,error:child.error?String(child.error):null,args,output:raw});
  assert(fs.existsSync(path.join(raw,'report.json')),'classifier.actual-report-exists');
  const actual={status:child.status,signal:child.signal,error:child.error?String(child.error):null,stdout:child.stdout||'',stderr:child.stderr||'',report:JSON.parse(fs.readFileSync(path.join(raw,'report.json'),'utf8'))};
  validate(actual);
  const controls=[];
  function copied(name,change,expected){
   const input=structuredClone(actual),before=JSON.stringify(input);write('control-'+name+'-before',input);
   const restore=change(input),changed=JSON.stringify(input);assert.notEqual(sha(changed),sha(before),'Physical copied bytes changed: '+name);write('control-'+name+'-changed',input);
   let message=null;try{validate(input);}catch(error){message=String(error.message);}
   assert(message&&expected.test(message),'Specific copied diagnostic refused: '+name);restore();assert.equal(JSON.stringify(input),before,'Exact same copied body restored: '+name);validate(input);write('control-'+name+'-restored',input);
   controls.push({name,scope:'COPIED retained report/process/log observations only, no product or served source mutation',beforeSHA256:sha(before),changedSHA256:sha(changed),restoredSHA256:sha(JSON.stringify(input)),specificRefusal:message,changed:true,sameCopyRestored:true,readmitted:true});
  }
  copied('raw-method-exit',x=>{const old=x.status;x.status=2;return()=>{x.status=old;};},/classifier\.raw-exit/);
  copied('infrastructure-record',x=>{x.report.infrastructure={name:'Error',message:'COPIED method record'};return()=>{delete x.report.infrastructure;};},/classifier\.no-infrastructure/);
  copied('wrong-error-kind',x=>{const row=x.report.cases[0].error,old=row.name;row.name='TypeError';return()=>{row.name=old;};},/classifier\.error-name\.0/);
  copied('unowned-assertion',x=>{const row=x.report.cases[0].error,old=row.message;row.message='COPIED_UNOWNED_ASSERTION';return()=>{row.message=old;};},/classifier\.error-prefix\.0/);
  copied('unhandled-cli',x=>{const old=x.stdout;x.stdout+='\nUnhandled Errors: COPIED diagnostic\n';return()=>{x.stdout=old;};},/classifier\.stdout-closing/);
  copied('wrong-pool-observation',x=>{const rows=x.report.cases[0].observation.modern;rows.push({id:'COPIED_WRONG_POOL',name:'COPIED_WRONG_POOL'});return()=>{rows.pop();};},/causal\.pool\.absent/);
  copied('wrong-old-L2-denial',x=>{const ids=x.report.cases[0].observation.years[0].oldDenied,old=ids.pop();return()=>{ids.push(old);};},/causal\.pool\.old-L2-denials/);
  copied('extra-default-draw',x=>{const draws=x.report.cases[3].observation.actual.draws;draws.push(0.25);return()=>{draws.pop();};},/causal\.default\.one-forced-draw/);
  copied('wrong-coursework-destination',x=>{const row=x.report.cases[4].observation.commit.value.managerState,old=row.club;row.club='COPIED_WRONG_DESTINATION';return()=>{row.club=old;};},/causal\.coursework\.actual-commit-destination/);
  assert.equal(controls.length,9);validate(actual);write('controls',controls);
  write('ADMISSION',{status:'ACTUAL_INTENDED_BASELINE_RED_QUALIFIED',cases:7,intendedAssertionFailures:5,preservationPasses:2,methodErrors:0,rawExit:1,preciseCases:actual.report.cases.map(({index,name,status,marker,error})=>({index,name,status,marker,error})),criticalSources:15,producerSources:1,copiedDiagnosticControls:controls,sourceBefore,limits:'Baseline only, no product/data implementation or fixed pass. Original French raw81777 remains additional preservation only; genuine pre-product SerieB transfer/loan/elected-loyalty acquisition is still required before product edits.'});
  console.log('SERIEB_BASELINE_QUALIFIED: 7 cases, 5 intended feature assertions, 2 preservation passes, 9 COPIED diagnostic controls, 0 method errors');
 }finally{
  const sourceAfter=allPins.map(pin);write('source-after',sourceAfter);assert.deepEqual(sourceAfter,sourceBefore,'All frozen critical and producer sources held');
 }
}
