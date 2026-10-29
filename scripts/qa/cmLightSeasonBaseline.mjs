import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {buildCmLightSeasonObserver} from './buildCmLightSeasonObserver.mjs';

assert.equal(process.env.CI,'1','Remote baseline only');
const ROOT=process.cwd(),OUT=path.resolve(process.env.CM_LIGHT_SEASON_OUT||'cm-light-season-artifacts');
const selected=JSON.parse(fs.readFileSync('qa/cm-light-season-v1/BASELINE-SOURCE.json','utf8'));
const sha=b=>createHash('sha256').update(b).digest('hex'),git=b=>createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
fs.mkdirSync(OUT,{recursive:true});
const json=(name,value)=>fs.writeFileSync(path.join(OUT,name+'.json'),JSON.stringify(value,null,2)+'\n');
const record={status:'STARTED',scope:'Five actual-source cases: three missing individual Light-season outcomes and two preservation cases. Prospective optional metadata is explicit. Actual Hook and Page transactions are not exercised.'};
function held(){return selected.files.map(pin=>{const b=fs.readFileSync(pin.path);assert.equal(b.length,pin.bytes,'Source bytes '+pin.path);assert.equal(sha(b),pin.sha256,'Source SHA '+pin.path);assert.equal(git(b),pin.gitBlob,'Source Git '+pin.path);return pin;});}
const plain=s=>s.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g,'');
function classify(result,cli,status,reportPath){
 const text=plain(cli);
 assert.equal(result.testResults.length,1,'ONE_ACTUAL_SUITE');assert.equal(result.testResults[0].message,'','NO_SUITE_METHOD_ERROR');
 assert(!/Unhandled (?:Errors?|Rejections?|Exceptions?)|Vitest caught|Failed Suites|No test files found|^\s*Errors\s+[1-9]\d*\s+errors?/mi.test(text),'NO_INFRASTRUCTURE');
 assert.equal(status,1,'ACTUAL_RAW_EXIT');assert.equal(result.success,false);assert.equal(result.numTotalTests,5);assert.equal(result.numPassedTests,2);assert.equal(result.numFailedTests,3);assert.equal(result.numPendingTests,0);assert.equal(result.numTodoTests||0,0);assert.equal(result.numPendingTestSuites,0);
 assert(/^\s*Test Files\s+1 failed\s+\(1\)\s*$/m.test(text),'ACTUAL_CLI_COMPLETION');assert(/^\s*Tests\s+3 failed\s+\|\s+2 passed\s+\(5\)\s*$/m.test(text),'ACTUAL_CLI_COMPLETION');
 assert.equal((text.match(/JSON report written to /g)||[]).length,1,'ACTUAL_CLI_COMPLETION');assert(text.includes('JSON report written to '+reportPath),'ACTUAL_CLI_COMPLETION');
 const rows=result.testResults.flatMap(s=>s.assertionResults);assert.equal(rows.length,5);assert.deepEqual(rows.map(r=>r.title).sort(),selected.cases.map(r=>r.title).sort(),'EXACT_CASE_IDENTITIES');
 for(const expected of selected.cases){const row=rows.find(r=>r.title===expected.title);assert.equal(row.status,expected.status,'Expected case status '+expected.title);if(expected.status==='failed'){assert(row.failureMessages.length>0);for(const message of row.failureMessages){assert(/AssertionError/.test(message)&&message.includes(expected.marker),'OWNED_ASSERTION_ONLY');assert(!/TypeError|ReferenceError|Cannot find module|Failed to resolve|No genuine|timed out|TimeoutError/i.test(message),'OWNED_ASSERTION_ONLY');}}else assert.deepEqual(row.failureMessages,[]);}
 return rows;
}
function pair(a,b){
 assert.deepEqual(a.value,b.value,'COMPLETE_PRESERVATION_PAIR');for(const key of ['inputBefore','inputAfter','full','trim','lean','next'])assert.equal(a[key],b[key],'COMPLETE_PRESERVATION_PAIR');assert.deepEqual(a.draws,b.draws,'COMPLETE_PRESERVATION_PAIR');
}
function evidence(e){
 const s=e.strict;assert.equal(s.observations.length,2,'ACTUAL_STRICT_HISTORY_CAUSE');assert.deepEqual(s.observations.map(x=>x.name),['normal','light'],'ACTUAL_STRICT_HISTORY_CAUSE');
 for(const o of s.observations){for(const key of ['wholeNodeStrictPass','ownConstructorIsTraceObject','bootVitestStrictPass','otherFieldsVitestStrictPass'])assert.equal(o[key],true,'ACTUAL_STRICT_HISTORY_CAUSE');assert.equal(o.constructorSameReference,false,'ACTUAL_STRICT_HISTORY_CAUSE');assert.equal(o.rawSHA256,s.expectedRawSHA256,'ACTUAL_STRICT_HISTORY_CAUSE');assert.equal(o.vitestWholeRefusal.name,'AssertionError','ACTUAL_STRICT_HISTORY_CAUSE');assert(o.vitestWholeRefusal.message.includes('to strictly equal'),'ACTUAL_STRICT_HISTORY_CAUSE');}
 assert.equal(s.copiedHistoryControls,1,'ACTUAL_STRICT_HISTORY_CONTROL');const c=s.control;assert.equal(c.path,'calendar.next','ACTUAL_STRICT_HISTORY_CONTROL');assert(Number.isFinite(c.before)&&Number.isFinite(c.changedValue),'ACTUAL_STRICT_HISTORY_CONTROL');assert.notEqual(c.before,c.changedValue,'ACTUAL_STRICT_HISTORY_CONTROL');assert.equal(c.changed,true,'ACTUAL_STRICT_HISTORY_CONTROL');assert.notEqual(c.beforeSHA256,c.changedSHA256,'ACTUAL_STRICT_HISTORY_CONTROL');assert.equal(c.beforeSHA256,c.restoredSHA256,'ACTUAL_STRICT_HISTORY_CONTROL');assert.equal(c.refusal.name,'AssertionError','ACTUAL_STRICT_HISTORY_CONTROL');assert.equal(c.refusal.code,'ERR_ASSERTION','ACTUAL_STRICT_HISTORY_CONTROL');assert.equal(c.refusal.operator,'deepStrictEqual','ACTUAL_STRICT_HISTORY_CONTROL');assert.equal(c.sameCopyRestored,true,'ACTUAL_STRICT_HISTORY_CONTROL');assert.equal(c.wholeNodeStrictReadmitted,true,'ACTUAL_STRICT_HISTORY_CONTROL');
 const a=e.actors;assert(a.seed>=1&&a.seed<=24);assert(a.steps<=140);assert(a.annualAttempts.length>0&&a.annualAttempts.length<=64);assert(a.attempts.length<=24);assert.equal(a.fatigue.clubName,a.finished.clubName);assert(!a.finished.sacked);
 const target=(state,id)=>{const found=state.squad.filter(p=>p.id===id);assert.equal(found.length,1,'ACTUAL_UNIQUE_ACTOR');return found[0];};
 const tired=target(a.fatigue,a.fatigueId),growing=target(a.finished,a.growthId);assert(tired.fitness<100&&tired.injuryWeeks===0&&!tired.onLoan,'GENUINE_TIRED_ACTOR');assert(!growing.onLoan&&growing.injuryWeeks===0&&(growing.contractYears??0)>1,'GENUINE_GROWTH_ACTOR');
 assert.equal(e.control.found,false,'ACTUAL_MISSING_CONTROL');assert(e.control.rendered.includes('How hard you work them'),'ACTUAL_MISSING_CONTROL');
 assert.equal(e.recovery.rows.length,1);const r=e.recovery.rows[0];assert.equal(r.kind,'week');
 assert(target(r.light.value,tired.id).fitness>target(r.normal.value,tired.id).fitness,'ACTUAL_LIGHT_RECOVERY_REFERENCE');assert.equal(target(r.actual.value,tired.id).fitness,target(r.normal.value,tired.id).fitness,'ACTUAL_OLD_RECOVERY_IGNORES_OPTION');assert.deepEqual(r.actual.draws,r.normal.draws);assert.equal(r.actual.next,r.normal.next);
 const g=e.growth;assert.equal(g.actor.id,growing.id);assert.equal(g.actual.value.season,a.finished.season+1);assert.equal(target(g.actual.value,growing.id).rating,target(g.normal.value,growing.id).rating,'ACTUAL_OLD_GROWTH_IGNORES_OPTION');assert(target(g.normal.value,growing.id).rating>target(g.light.value,growing.id).rating,'ACTUAL_LIGHT_GROWTH_REFERENCE');
 assert.equal(g.actual.value.individualLightSeason.playerId,growing.id,'ACTUAL_OLD_GROWTH_IGNORES_OPTION');
 assert.deepEqual(e.defaults.rows.map(r=>r.intensity),['light','normal','double']);for(const row of e.defaults.rows){pair(row.week.actual,row.week.expected);pair(row.annual.actual,row.annual.expected);}
 assert.deepEqual(e.defaults.saved,e.defaults.reference,'OFFICIAL_SAVE_PAIR');assert.deepEqual(e.defaults.ui.draws,[]);assert.equal(e.defaults.ui.value.length,1);
 assert.equal(e.invalid.rows.length,4);for(const row of e.invalid.rows)pair(row.actual,row.expected);assert.deepEqual(e.invalid.actual,e.invalid.reference,'ACTUAL_NEGATIVE_DRIFT');assert(e.invalid.reference.value.rating<e.invalid.older.rating,'ACTUAL_NEGATIVE_DRIFT');
 assert.equal(e.replays.length,29,'NATURAL_REPLAY_COUNT');
 for(const replay of e.replays){assert(['actual','reference'].includes(replay.which));const expected=replay.endpoint==='fatigue'?a.fatigue:a.finished,count=replay.endpoint==='fatigue'?a.fatigueDrawCount:a.calendar.draws.length;assert.deepEqual(replay.constructor,a.constructor,'ACTUAL_REPLAY_HISTORY');assert.deepEqual(replay.calendar.value,expected,'ACTUAL_REPLAY_HISTORY');assert.deepEqual(replay.calendar.draws,a.calendar.draws.slice(0,count),'ACTUAL_REPLAY_HISTORY');assert.equal(replay.calendar.next,a.calendar.draws[count]??a.calendar.next,'ACTUAL_REPLAY_HISTORY');}
 return{cases:5,ownedRed:3,preservationPass:2,defaultFullPairs:6,invalidFullPairs:4,officialSavePair:true,negativeDrift:true,naturalReplays:29,strictHistoryCauseWitnesses:2,copiedHistoryControls:1,moduleInitialization:'excluded and unmeasured'};
}
try{
 record.before=held();json('source-before',record.before);
 if(process.argv[2]==='source'){record.status='SOURCE_PINS_HELD';json('source-admission',record);console.log('CM_LIGHT_SEASON_SOURCE: exact PR420 and selected QA pins held');process.exit(0);}
 const built=await buildCmLightSeasonObserver({root:ROOT,out:path.join(OUT,'observer')});record.observer=built.observer;
 const reportPath=path.join(OUT,'vitest.json'),caseOut=path.join(OUT,'cases'),logPath=path.join(OUT,'vitest.log');fs.mkdirSync(caseOut,{recursive:true});
 const fd=fs.openSync(logPath,'w');let child;
 try{child=spawnSync(process.execPath,[path.join(ROOT,'node_modules/vitest/vitest.mjs'),'run',selected.testPath,'--maxWorkers=1','--minWorkers=1','--reporter=default','--reporter=json','--outputFile='+reportPath],{cwd:ROOT,env:{...process.env,CM_LIGHT_SEASON_OBSERVER_DIR:built.directory,CM_LIGHT_SEASON_CASE_OUT:caseOut},stdio:['ignore',fd,fd],timeout:1_800_000});}finally{fs.closeSync(fd);}
 fs.writeFileSync(path.join(OUT,'vitest.exit'),String(child.status)+'\n');record.process={status:child.status,signal:child.signal,error:child.error?String(child.error):null};assert.ifError(child.error);assert.equal(child.signal,null,'Actual consumer completed');
 const cli=fs.readFileSync(logPath,'utf8'),result=JSON.parse(fs.readFileSync(reportPath,'utf8'));record.cases=classify(result,cli,child.status,reportPath);
 const read=name=>JSON.parse(fs.readFileSync(path.join(caseOut,name+'.json'),'utf8'));
 const actual={strict:read('strict-history'),actors:read('actors'),control:read('control'),recovery:read('recovery'),growth:read('growth'),defaults:read('default'),invalid:read('invalid-and-decline'),replays:fs.readdirSync(caseOut).filter(n=>/^replay-\d+\.json$/.test(n)).sort((a,b)=>Number(a.match(/\d+/)[0])-Number(b.match(/\d+/)[0])).map(n=>JSON.parse(fs.readFileSync(path.join(caseOut,n),'utf8')))};
 record.causal=evidence(actual);
 const historyBodies=Object.fromEntries(['before','changed','restored'].map(name=>[name,fs.readFileSync(path.join(caseOut,'strict-history-copy.'+name+'.json'),'utf8')])),historyControl=actual.strict.control;
 assert.equal(sha(historyBodies.before),historyControl.beforeSHA256);assert.equal(sha(historyBodies.changed),historyControl.changedSHA256);assert.equal(sha(historyBodies.restored),historyControl.restoredSHA256);assert.equal(historyBodies.before,historyBodies.restored);assert.equal(sha(historyBodies.before),actual.strict.expectedRawSHA256);
 const beforeHistory=JSON.parse(historyBodies.before),changedHistory=JSON.parse(historyBodies.changed);assert.equal(beforeHistory.calendar.next,historyControl.before);assert.equal(changedHistory.calendar.next,historyControl.changedValue);changedHistory.calendar.next=historyControl.before;assert.deepStrictEqual(changedHistory,beforeHistory,'Only retained copied calendar.next changed');
 record.strictHistoryRetainedCopies={beforeSHA256:sha(historyBodies.before),changedSHA256:sha(historyBodies.changed),restoredSHA256:sha(historyBodies.restored),singleCopiedLeaf:'calendar.next',restoredExact:true,typedWholeComparison:'Performed on actual in-memory histories before serialization; these files retain raw copied observation bytes only'};
 const original={report:sha(fs.readFileSync(reportPath)),cli:sha(fs.readFileSync(logPath))};record.copiedControls=[];
 for(const kind of ['truncated-cli','suite-error','unhandled-cli','unowned-assertion','raw-exit','default-draw','replay-history']){
  const copied={result:structuredClone(result),cli,status:child.status,evidence:structuredClone(actual)},before=JSON.stringify(copied);let restore,expected;
  if(kind==='truncated-cli'){const v=copied.cli;copied.cli=copied.cli.replace(/^.*Test Files.*(?:\r?\n|$)/m,'');restore=()=>{copied.cli=v;};expected='ACTUAL_CLI_COMPLETION';}
  if(kind==='suite-error'){copied.result.testResults[0].message='COPIED method failure';restore=()=>{copied.result.testResults[0].message='';};expected='NO_SUITE_METHOD_ERROR';}
  if(kind==='unhandled-cli'){const v=copied.cli;copied.cli+='\nUnhandled Rejection: COPIED diagnostic\n';restore=()=>{copied.cli=v;};expected='NO_INFRASTRUCTURE';}
  if(kind==='unowned-assertion'){const row=copied.result.testResults[0].assertionResults.find(r=>r.status==='failed'),v=row.failureMessages;row.failureMessages=['AssertionError: COPIED unrelated failure'];restore=()=>{row.failureMessages=v;};expected='OWNED_ASSERTION_ONLY';}
  if(kind==='raw-exit'){copied.status=0;restore=()=>{copied.status=child.status;};expected='ACTUAL_RAW_EXIT';}
  if(kind==='default-draw'){const d=copied.evidence.defaults.rows[0].week.actual.draws;d.push(0.123456);restore=()=>{d.pop();};expected='COMPLETE_PRESERVATION_PAIR';}
  if(kind==='replay-history'){const c=copied.evidence.replays[0].calendar,v=c.next;c.next=v===0?1:0;restore=()=>{c.next=v;};expected='ACTUAL_REPLAY_HISTORY';}
  assert.notEqual(JSON.stringify(copied),before,'COPIED diagnostic actually changed');json('copied-'+kind+'-changed',copied);
  let refusal;try{classify(copied.result,copied.cli,copied.status,reportPath);evidence(copied.evidence);}catch(error){refusal={name:error.name,message:error.message};}
  assert.equal(refusal?.name,'AssertionError');assert(refusal.message.includes(expected),'Specific COPIED cause '+kind);restore();assert.equal(JSON.stringify(copied),before,'Exact same COPIED observation restoration');classify(copied.result,copied.cli,copied.status,reportPath);evidence(copied.evidence);
  json('copied-'+kind+'-restored',copied);record.copiedControls.push({kind,scope:'COPIED observations only, no physical product mutation',changed:true,expected,refusal,sameCopyRestored:true,originalReadmitted:true});
 }
 assert.equal(sha(fs.readFileSync(reportPath)),original.report);assert.equal(sha(fs.readFileSync(logPath)),original.cli);record.after=held();assert.deepEqual(record.after,record.before,'All selected source held');record.status='ACTUAL_CAUSE_QUALIFIED_BASELINE_RED';json('ADMISSION',record);
 console.log('CM_LIGHT_SEASON_BASELINE: 5 actual cases, 3 precise owned RED, 2 preservation PASS, 29 natural replays, 7 COPIED diagnostics, 1 copied strict-history control, source held');
}catch(error){record.status='METHOD_OR_UNEXPECTED_FAILURE';record.failure={name:error.name,message:error.message,stack:error.stack};json('ADMISSION',record);throw error;}
