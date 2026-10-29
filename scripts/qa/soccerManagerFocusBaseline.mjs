import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {buildSoccerManagerFocusObserver} from './buildSoccerManagerFocusObserver.mjs';
assert.equal(process.env.CI,'1','Remote baseline only');
const ROOT=process.cwd(),OUT=path.resolve(process.env.SC_MANAGER_FOCUS_OUT||'manager-focus-artifacts'),selectorPath='qa/sc-manager-season-focus-v1/BASELINE-SOURCE.json';
const selected=JSON.parse(fs.readFileSync(selectorPath,'utf8')),sha=b=>createHash('sha256').update(b).digest('hex'),git=b=>createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
fs.mkdirSync(OUT,{recursive:true});
const json=(name,value)=>fs.writeFileSync(path.join(OUT,name+'.json'),JSON.stringify(value,null,2)+'\n');
const record={status:'STARTED',scope:'Actual GameScreen retirement and manager-entry eligibility, actual ManagerPanel missing focus, actual Engine tradeoff RED, complete default and actual unemployed acceptance preservation. Page transaction closures are not tested by these callback adapters.'};
function held(){return selected.files.map(pin=>{const b=fs.readFileSync(pin.path);assert.equal(b.length,pin.bytes,'Source bytes '+pin.path);assert.equal(sha(b),pin.sha256,'Source SHA '+pin.path);assert.equal(git(b),pin.gitBlob,'Source Git '+pin.path);return pin;});}
const plain=s=>s.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g,'');
function classify(result,cli,status,reportPath){
 const text=plain(cli);
 assert.equal(result.testResults.length,1,'One consumer suite');assert.equal(result.testResults[0].message,'','NO_SUITE_METHOD_ERROR');
 assert(!/Unhandled (?:Errors?|Rejections?|Exceptions?)|Vitest caught|Failed Suites|No test files found|^\s*Errors\s+[1-9]\d*\s+errors?/mi.test(text),'NO_INFRASTRUCTURE');
 assert.equal(status,1,'Actual baseline raw exit1');assert.equal(result.success,false);assert.equal(result.numTotalTests,4);assert.equal(result.numPassedTests,2);assert.equal(result.numFailedTests,2);assert.equal(result.numPendingTests,0);assert.equal(result.numTodoTests||0,0);assert.equal(result.numPendingTestSuites,0);
 assert(/^\s*Test Files\s+1 failed\s+\(1\)\s*$/m.test(text),'ACTUAL_CLI_COMPLETION');assert(/^\s*Tests\s+2 failed\s+\|\s+2 passed\s+\(4\)\s*$/m.test(text),'ACTUAL_CLI_COMPLETION');assert.equal((text.match(/JSON report written to /g)||[]).length,1,'ACTUAL_CLI_COMPLETION');assert(text.includes('JSON report written to '+reportPath),'ACTUAL_CLI_COMPLETION');
 const rows=result.testResults.flatMap(s=>s.assertionResults);assert.equal(rows.length,4);assert.deepEqual(rows.map(r=>r.title).sort(),selected.cases.map(r=>r.title).sort(),'EXACT_CASE_IDENTITIES');
 for(const expected of selected.cases){const row=rows.find(r=>r.title===expected.title);assert.equal(row.status,expected.status,'Expected case status '+expected.title);if(expected.status==='failed'){assert(row.failureMessages.length>0);for(const message of row.failureMessages){assert(/AssertionError/.test(message)&&message.includes(expected.marker),'OWNED_ASSERTION_ONLY');assert(!/TypeError|ReferenceError|Cannot find module|Failed to resolve|FIXTURE_METHOD|timed out|TimeoutError/i.test(message),'OWNED_ASSERTION_ONLY');}}else assert.deepEqual(row.failureMessages,[]);}
 return rows;
}
const raw=x=>x.action.rawAfter,tape=x=>({value:x.value,raw:raw(x),draws:x.action.draws,next:x.action.next});
function evidence(e){
 const a=e.acquisition;
 assert.deepEqual(a.policy,selected.acquisitionPolicy,'Exact acquisition policy');assert(a.attempts.length>0&&a.attempts.length<=128,'Bounded constructors');
 assert.equal(a.entry.playing.phase,'playing');assert.equal(a.entry.playing.retired,false);assert.equal(a.entry.evidence.retire,'🚪 Retire','ACTUAL_UI_ENTRY_ELIGIBILITY');assert.equal(a.entry.evidence.dialog,'Retire?','ACTUAL_UI_ENTRY_ELIGIBILITY');assert.equal(a.entry.evidence.confirm,'Confirm Retirement','ACTUAL_UI_ENTRY_ELIGIBILITY');
 assert.equal(a.entry.entry.phase,'retirement_ceremony');assert.equal(a.entry.entry.retired,true);assert.equal(a.entry.entry.hasLegacy,true);assert.equal(a.entry.entry.button,'📋 Become a Manager','ACTUAL_UI_ENTRY_ELIGIBILITY');assert.equal(a.entry.started.value.phase,'manager_season');assert.equal(a.entry.started.action.draws.length,1,'Canonical one-draw manager entry');
 assert.equal(a.entry.started.action.rawBefore,a.entry.retired.action.rawAfter,'Canonical retire-to-manager chain');
 const n=a.witnesses.national,u=a.witnesses.unemployed;
 assert(n&&n.state.managerState.nationalTeamOffer&&n.state.managerState.managingNationalTeam&&!n.state.managerState.unemployed,'NATURAL_NATIONAL_FLAGS_WITNESS');
 assert(u&&u.state.managerState.unemployed&&u.state.managerState.offers.length>0,'NATURAL_UNEMPLOYED_OFFER_WITNESS');
 for(const witness of [n,u]){assert(witness.actions.length>0&&witness.actions.length<=64,'Bounded actual manager actions');assert.equal(witness.raw,witness.actions[witness.actions.length-1].rawAfter,'Actual action chain reaches retained actor');for(const action of witness.actions)assert.equal(action.phaseBefore,'manager_season');}
 const defaults=e.defaults;assert.equal(defaults.pairs.length,64,'ACTUAL_DEFAULT_PAIR_COUNT');
 const contexts=defaults.pairs.reduce((map,p)=>{map[p.context]=(map[p.context]||0)+1;assert.deepEqual(tape(p.actual),tape(p.expected),'COMPLETE_DEFAULT_PAIR');assert.equal(p.actual.action.rawBefore,p.expected.action.rawBefore,'COMPLETE_DEFAULT_PAIR');return map;},{});
 assert.deepEqual(contexts,{ordinary:32,'earned-national-flags':32});
 const accept=e.acceptance;assert.deepEqual(tape(accept.actual),tape(accept.expected),'COMPLETE_ACCEPTED_PAIR');assert.deepEqual(accept.actual.action.draws,[],'COMPLETE_ACCEPTED_PAIR');assert.equal(accept.index,0);assert.equal(accept.source.managerState.unemployed,true);assert.deepEqual(accept.offer,accept.source.managerState.offers[0]);assert.equal(accept.rawBefore,accept.rawAfter,'COMPLETE_ACCEPTED_PAIR');
 const trade=e.tradeoff;assert.equal(trade.all.length,256,'All actual matched seed triples');assert.deepEqual(trade.policy,selected.acquisitionPolicy);
 for(const row of trade.all){assert.deepEqual(row.results.league.value.managerState,row.results.balanced.value.managerState,'BASELINE_FOCUS_IGNORED_OUTCOME');assert.deepEqual(row.results.cup.value.managerState,row.results.balanced.value.managerState,'BASELINE_FOCUS_IGNORED_OUTCOME');for(const choice of ['league','cup']){assert.deepEqual(row.results[choice].action.draws,row.results.balanced.action.draws,'BASELINE_FOCUS_IGNORED_OUTCOME');assert.equal(row.results[choice].action.next,row.results.balanced.action.next,'BASELINE_FOCUS_IGNORED_OUTCOME');}}
 assert.deepEqual(trade.counts,{ordinary:{leagueGain:0,leagueCupCost:0,cupGain:0,cupLeagueCost:0},'earned-national-flags':{leagueGain:0,leagueCupCost:0,cupGain:0,cupLeagueCost:0}},'Actual old engine ignores planned test payload');
 return{cases:4,ownedRed:2,preservationPass:2,defaultPairs:64,tradeoffTriples:256,actualUIEntry:true,nationalFlags:true,actualUnemployedOffer:true};
}
try{
 record.before=held();json('source-before',record.before);
 if(process.argv[2]==='source'){record.status='SOURCE_PINS_HELD';json('source-admission',record);console.log('MANAGER_FOCUS_SOURCE: selected canonical and QA pins held');process.exit(0);}
 const built=await buildSoccerManagerFocusObserver({root:ROOT,out:path.join(OUT,'observer')});record.observer=built.observer;
 const reportPath=path.join(OUT,'vitest.json'),caseOut=path.join(OUT,'cases');
 const child=spawnSync(process.execPath,[path.join(ROOT,'node_modules/vitest/vitest.mjs'),'run',selected.testPath,'--maxWorkers=1','--minWorkers=1','--reporter=default','--reporter=json','--outputFile.json='+reportPath],{cwd:ROOT,env:{...process.env,SC_MANAGER_FOCUS_OBSERVER:built.file,SC_MANAGER_FOCUS_REFERENCE:built.referenceFile,SC_MANAGER_FOCUS_CASE_OUT:caseOut},encoding:'utf8',timeout:480_000,maxBuffer:8*1024*1024});
 const cli=(child.stdout||'')+'\n'+(child.stderr||'');fs.writeFileSync(path.join(OUT,'vitest.log'),cli);fs.writeFileSync(path.join(OUT,'vitest.exit'),String(child.status)+'\n');record.process={status:child.status,signal:child.signal,error:child.error?String(child.error):null};
 assert.ifError(child.error);assert.equal(child.signal,null,'Actual consumer completed');
 const result=JSON.parse(fs.readFileSync(reportPath,'utf8'));record.cases=classify(result,cli,child.status,reportPath);
 const read=name=>JSON.parse(fs.readFileSync(path.join(caseOut,name+'.json'),'utf8'));
 const actual={acquisition:read('acquisition'),defaults:read('default-pairs'),acceptance:read('unemployed-acceptance'),tradeoff:read('tradeoff')};record.causal=evidence(actual);
 const original={report:sha(fs.readFileSync(reportPath)),cli:sha(fs.readFileSync(path.join(OUT,'vitest.log')))};record.copiedControls=[];
 for(const kind of ['truncated-cli','suite-error','unhandled-cli','ui-entry','national-witness','default-draw','accepted-state','tradeoff-outcome']){
  const copied={result:structuredClone(result),cli,evidence:structuredClone(actual)},before=JSON.stringify(copied);let restore,expected;
  if(kind==='truncated-cli'){const old=copied.cli;copied.cli=copied.cli.replace(/^.*Test Files.*(?:\r?\n|$)/m,'');restore=()=>{copied.cli=old;};expected='ACTUAL_CLI_COMPLETION';}
  if(kind==='suite-error'){copied.result.testResults[0].message='COPIED method failure';restore=()=>{copied.result.testResults[0].message='';};expected='NO_SUITE_METHOD_ERROR';}
  if(kind==='unhandled-cli'){const old=copied.cli;copied.cli+='\nUnhandled Rejection: COPIED diagnostic\n';restore=()=>{copied.cli=old;};expected='NO_INFRASTRUCTURE';}
  if(kind==='ui-entry'){const v=copied.evidence.acquisition.entry.evidence.confirm;copied.evidence.acquisition.entry.evidence.confirm='COPIED missing confirmation';restore=()=>{copied.evidence.acquisition.entry.evidence.confirm=v;};expected='ACTUAL_UI_ENTRY_ELIGIBILITY';}
  if(kind==='national-witness'){copied.evidence.acquisition.witnesses.national.state.managerState.nationalTeamOffer=false;restore=()=>{copied.evidence.acquisition.witnesses.national.state.managerState.nationalTeamOffer=true;};expected='NATURAL_NATIONAL_FLAGS_WITNESS';}
  if(kind==='default-draw'){const d=copied.evidence.defaults.pairs[0].actual.action.draws;d.push(0.123456);restore=()=>{d.pop();};expected='COMPLETE_DEFAULT_PAIR';}
  if(kind==='accepted-state'){const m=copied.evidence.acceptance.actual.value.managerState,v=m.club;m.club='COPIED wrong club';restore=()=>{m.club=v;};expected='COMPLETE_ACCEPTED_PAIR';}
  if(kind==='tradeoff-outcome'){const rows=copied.evidence.tradeoff.all[0].results.league.value.managerState.seasonResults,row=rows[rows.length-1],v=row.playerPts;row.playerPts=v+1;restore=()=>{row.playerPts=v;};expected='BASELINE_FOCUS_IGNORED_OUTCOME';}
  assert.notEqual(JSON.stringify(copied),before,'COPIED diagnostic actually changed');json('copied-'+kind+'-changed',copied);
  let refusal;try{classify(copied.result,copied.cli,child.status,reportPath);evidence(copied.evidence);}catch(error){refusal={name:error.name,message:error.message};}
  assert.equal(refusal?.name,'AssertionError');assert(refusal.message.includes(expected),'Specific COPIED cause '+kind);restore();assert.equal(JSON.stringify(copied),before,'Exact same COPIED evidence restoration');classify(copied.result,copied.cli,child.status,reportPath);evidence(copied.evidence);
  json('copied-'+kind+'-restored',copied);record.copiedControls.push({kind,scope:'COPIED retained observations only, no physical product mutation',changed:true,expected,refusal,sameCopyRestored:true,originalReadmitted:true});
 }
 assert.equal(sha(fs.readFileSync(reportPath)),original.report);assert.equal(sha(fs.readFileSync(path.join(OUT,'vitest.log'))),original.cli);
 record.after=held();assert.deepEqual(record.after,record.before,'All selected source held');record.status='ACTUAL_CAUSE_QUALIFIED_BASELINE_RED';json('ADMISSION',record);
 console.log('MANAGER_FOCUS_BASELINE: 4 actual cases, 2 precise owned RED, 2 preservation PASS, 64 default pairs, 256 outcome triples, 8 COPIED guards, source held');
}catch(error){record.status='METHOD_OR_UNEXPECTED_FAILURE';record.failure={name:error.name,message:error.message,stack:error.stack};json('ADMISSION',record);throw error;}
