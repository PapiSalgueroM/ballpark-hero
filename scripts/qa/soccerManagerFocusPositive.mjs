import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {buildSoccerManagerFocusFixedObserver} from './buildSoccerManagerFocusFixedObserver.mjs';
import {buildSoccerManagerJobReviewObserver} from './buildSoccerManagerJobReviewObserver.mjs';
assert.equal(process.env.CI,'1','Remote CI only');
const ROOT=process.cwd(),OUT=path.resolve(process.env.SC_MANAGER_FOCUS_POSITIVE_OUT||'manager-focus-positive-artifacts');
const selected=JSON.parse(fs.readFileSync('qa/sc-manager-season-focus-v1/POSITIVE-SOURCE.json','utf8'));
const sha=b=>createHash('sha256').update(b).digest('hex'),git=b=>createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
fs.mkdirSync(OUT,{recursive:true});
const json=(name,value)=>fs.writeFileSync(path.join(OUT,name+'.json'),JSON.stringify(value,null,2)+'\n');
function held(){return selected.files.map(pin=>{assert(/^[a-f0-9]{64}$/.test(pin.sha256),'Bound selected source');const b=fs.readFileSync(path.join(ROOT,pin.path));assert.equal(b.length,pin.bytes,'Source bytes '+pin.path);assert.equal(sha(b),pin.sha256,'Source SHA '+pin.path);assert.equal(git(b),pin.gitBlob,'Source Git '+pin.path);return pin;});}
// Source fragments for the existing remote wrapper. No application imports.
// The caller supplies Node assert, selected exact cases and retained evidence.
const stripAnsi = value => value.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '');
const sameCase = (a, b) => a.file === b.file && a.fullName === b.fullName;
function classifyManagerFocus(result, cli, status, reportPath, cases, failures = []) {
  const text = stripAnsi(cli), failed = failures.length, total = cases.length;
  assert.equal(total, 23, 'EXACT_FOCUSED_CASE_COUNT');
  assert.equal(status, failed ? 1 : 0, 'ACTUAL_FOCUSED_RAW_EXIT');
  assert.equal(result.success, !failed, 'ACTUAL_FOCUSED_SUCCESS');
  assert(Array.isArray(result.testResults), 'ACTUAL_SUITE_SCHEMA');
  assert.equal(result.testResults.length, 2, 'ACTUAL_FOCUSED_FILE_COUNT');
  assert.equal(result.numTotalTests, total); assert.equal(result.numFailedTests, failed);
  assert.equal(result.numPassedTests, total - failed); assert.equal(result.numPendingTests, 0);
  assert.equal(result.numTodoTests || 0, 0); assert.equal(result.numPendingTestSuites, 0);
  assert(!/Unhandled (?:Errors?|Rejections?|Exceptions?)|Vitest caught|Failed Suites|No test files found|^\s*Errors\s+[1-9]\d*\s+errors?/mi.test(text), 'NO_INFRASTRUCTURE');
  const rows = [], fileStates = [];
  for (const suite of result.testResults) {
    assert.equal(suite.message, '', 'NO_SUITE_METHOD_ERROR');
    assert.equal(typeof suite.name, 'string', 'ACTUAL_SUITE_SCHEMA');
    assert(Array.isArray(suite.assertionResults), 'ACTUAL_SUITE_SCHEMA');
    const files = [...new Set(cases.map(item => item.file))].filter(file => suite.name.replaceAll('\\', '/').endsWith('/' + file));
    assert.equal(files.length, 1, 'EXACT_FOCUSED_FILE_IDENTITIES'); const file = files[0];
    assert(!fileStates.some(item => item.file === file), 'EXACT_FOCUSED_FILE_IDENTITIES');
    let fileFailed = false;
    for (const row of suite.assertionResults) {
      const identity = { file, fullName: row.fullName }, matches = cases.filter(item => sameCase(item, identity));
      assert.equal(matches.length, 1, 'EXACT_CASE_IDENTITIES'); assert.equal(row.title, matches[0].title);
      assert(!rows.some(item => sameCase(item, identity)), 'EXACT_CASE_IDENTITIES');
      const expectedFailure = failures.some(item => sameCase(item, identity));
      assert.equal(row.status, expectedFailure ? 'failed' : 'passed', 'EXACT_CASE_FAILURE_MAP ' + row.fullName);
      assert(Array.isArray(row.failureMessages), 'ACTUAL_ASSERTION_SCHEMA');
      if (expectedFailure) {
        assert(row.failureMessages.length > 0, 'OWNED_ASSERTION_ONLY'); fileFailed = true;
        for (const message of row.failureMessages) {
          assert(/AssertionError/.test(message), 'OWNED_ASSERTION_ONLY');
          assert(!/TypeError|ReferenceError|Cannot find module|Failed to resolve|FIXTURE_METHOD|timed out|TimeoutError/i.test(message), 'OWNED_ASSERTION_ONLY');
        }
      } else assert.deepEqual(row.failureMessages, []);
      rows.push({ ...identity, title: row.title, status: row.status });
    }
    fileStates.push({ file, failed: fileFailed });
  }
  assert.equal(rows.length, total, 'EXACT_CASE_IDENTITIES');
  assert.deepEqual(rows.map(item => item.file + ':' + item.fullName).sort(), cases.map(item => item.file + ':' + item.fullName).sort(), 'EXACT_CASE_IDENTITIES');
  assert.deepEqual(failures.map(item => item.file + ':' + item.fullName).sort(), rows.filter(item => item.status === 'failed').map(item => item.file + ':' + item.fullName).sort(), 'EXACT_CASE_FAILURE_MAP');
  const failedFiles = fileStates.filter(item => item.failed).length, fileParts = [], testParts = [];
  if (failedFiles) fileParts.push(failedFiles + ' failed'); if (2 - failedFiles) fileParts.push((2 - failedFiles) + ' passed');
  if (failed) testParts.push(failed + ' failed'); if (total - failed) testParts.push((total - failed) + ' passed');
  const fileClosing = text.match(/^\s*Test Files\s+(.+?)\s+\(2\)\s*$/m), testClosing = text.match(/^\s*Tests\s+(.+?)\s+\(23\)\s*$/m);
  assert(fileClosing && testClosing, 'ACTUAL_CLI_COMPLETION');
  assert.equal(fileClosing[1].replace(/\s+/g, ' '), fileParts.join(' | '), 'ACTUAL_CLI_COMPLETION');
  assert.equal(testClosing[1].replace(/\s+/g, ' '), testParts.join(' | '), 'ACTUAL_CLI_COMPLETION');
  assert.equal((text.match(/JSON report written to /g) || []).length, 1, 'ACTUAL_CLI_COMPLETION');
  assert(text.includes('JSON report written to ' + reportPath), 'ACTUAL_CLI_COMPLETION');
  return rows;
}
const managerAction = run => ({ value: run.value, raw: run.action.rawAfter, draws: run.action.draws, next: run.action.next });
function assertManagerFocusEvidence(e) {
  const a = e.acquisition, national = a.witnesses.national, unemployed = a.witnesses.unemployed;
  assert.deepEqual(a.policy, { constructorSeedStart:610000, constructors:128, youthSteps:12, managerSeedStart:910000, managerSteps:64, outcomeSeedStart:730000, outcomeSeeds:128 }, 'EXACT_ACQUISITION_POLICY');
  assert(a.attempts.length > 0 && a.attempts.length <= 128, 'BOUNDED_ACQUISITION');
  assert.equal(a.entry.playing.phase, 'playing'); assert.equal(a.entry.playing.retired, false);
  assert.equal(a.entry.evidence.retire, '🚪 Retire', 'ACTUAL_UI_ENTRY_ELIGIBILITY');
  assert.equal(a.entry.evidence.dialog, 'Retire?', 'ACTUAL_UI_ENTRY_ELIGIBILITY');
  assert.equal(a.entry.evidence.confirm, 'Confirm Retirement', 'ACTUAL_UI_ENTRY_ELIGIBILITY');
  assert.equal(a.entry.entry.phase, 'retirement_ceremony'); assert.equal(a.entry.entry.retired, true); assert.equal(a.entry.entry.hasLegacy, true);
  assert.equal(a.entry.entry.button, '📋 Become a Manager', 'ACTUAL_UI_ENTRY_ELIGIBILITY');
  assert.equal(a.entry.started.value.phase, 'manager_season'); assert.equal(a.entry.started.action.draws.length, 1);
  assert.equal(a.entry.started.action.rawBefore, a.entry.retired.action.rawAfter);
  assert(national && national.state.managerState.nationalTeamOffer && national.state.managerState.managingNationalTeam && !national.state.managerState.unemployed, 'NATURAL_NATIONAL_FLAGS_WITNESS');
  assert(unemployed && unemployed.state.managerState.unemployed && unemployed.state.managerState.offers.length > 0, 'NATURAL_UNEMPLOYED_OFFER_WITNESS');
  for (const witness of [national, unemployed]) { assert(witness.actions.length > 0 && witness.actions.length <= 64); assert.equal(witness.raw, witness.actions[witness.actions.length - 1].rawAfter); for (const action of witness.actions) assert.equal(action.phaseBefore, 'manager_season'); }
  assert.equal(e.defaults.pairs.length, 64, 'ACTUAL_DEFAULT_PAIR_COUNT'); const contexts = {};
  for (const pair of e.defaults.pairs) { contexts[pair.context] = (contexts[pair.context] || 0) + 1; assert.deepEqual(managerAction(pair.actual), managerAction(pair.expected), 'COMPLETE_DEFAULT_PAIR'); assert.equal(pair.actual.action.rawBefore, pair.expected.action.rawBefore, 'COMPLETE_DEFAULT_PAIR'); }
  assert.deepEqual(contexts, { ordinary:32, 'earned-national-flags':32 });
  assert.deepEqual(managerAction(e.acceptance.actual), managerAction(e.acceptance.expected), 'COMPLETE_ACCEPTED_PAIR');
  assert.deepEqual(e.acceptance.actual.action.draws, [], 'COMPLETE_ACCEPTED_PAIR'); assert.equal(e.acceptance.index, 0); assert.equal(e.acceptance.source.managerState.unemployed, true);
  assert.deepEqual(e.acceptance.offer, e.acceptance.source.managerState.offers[0]); assert.equal(e.acceptance.rawBefore, e.acceptance.rawAfter, 'COMPLETE_ACCEPTED_PAIR');
  const ui = e.ui; assert.equal(ui.actualEntryPresent, true, 'ACTUAL_FOCUS_UI'); assert.equal(ui.help.role, 'region'); assert.equal(ui.help.name, 'Season focus help');
  assert(['50%', '47%', '53%', 'not a guaranteed league point'].every(word => ui.help.example.includes(word)), 'ACTUAL_HELP_WORKED_EXAMPLE');
  assert.deepEqual(ui.choiceCalls, [['league']], 'ACTUAL_FOCUS_UI'); assert.deepEqual(ui.draws, [], 'ACTUAL_SELECTION_ZERO_DRAWS'); assert.equal(ui.rawBefore, ui.rawAfter, 'ACTUAL_FOCUS_UI');
  assert.equal(ui.selected.managerSeasonFocus.focus, 'league', 'ACTUAL_FOCUS_UI');
  const trade = e.tradeoff; assert.equal(trade.all.length, 256, 'ACTUAL_MATCHED_TRADEOFF_COUNT');
  const stages = ['out in the 3rd round','out in the 4th round','out in the quarter-final','out in the semi-final','beaten in the final','WON the cup'], counts = {}, seen = new Set();
  for (const item of trade.all) {
    assert(['ordinary', 'earned-national-flags'].includes(item.context)); assert(Number.isInteger(item.seed) && item.seed >= 730000 && item.seed < 730128);
    const key = item.context + ':' + item.seed; assert(!seen.has(key), 'ACTUAL_MATCHED_TRADEOFF_IDENTITIES'); seen.add(key);
    const rows = {};
    for (const choice of ['balanced', 'league', 'cup']) { const run = item.results[choice], ms = run.value.managerState, row = ms.seasonResults[ms.seasonResults.length - 1]; rows[choice] = row; assert.equal(run.action.phaseBefore, 'manager_season'); assert.equal(run.action.phaseAfter, 'manager_season'); assert.equal(row.focus, choice === 'balanced' ? undefined : choice, 'ACTUAL_PLAYED_FOCUS'); assert(!Object.prototype.hasOwnProperty.call(run.value, 'managerSeasonFocus'), 'ACTUAL_FOCUS_CONSUMED_ONCE'); assert.equal(typeof row.playerPts, 'number'); assert(stages.includes(row.cup)); assert(Array.isArray(run.action.draws) && run.action.draws.length > 0); assert(Number.isFinite(run.action.next) && run.action.next >= 0 && run.action.next < 1); }
    const c = counts[item.context] ||= { leagueGain:0, leagueCupCost:0, cupGain:0, cupLeagueCost:0 }, b = rows.balanced, l = rows.league, p = rows.cup;
    if (l.playerPts > b.playerPts) c.leagueGain++; if (stages.indexOf(l.cup) < stages.indexOf(b.cup)) c.leagueCupCost++;
    if (stages.indexOf(p.cup) > stages.indexOf(b.cup)) c.cupGain++; if (p.playerPts < b.playerPts) c.cupLeagueCost++;
  }
  assert.deepEqual(trade.counts, counts, 'ACTUAL_TRADEOFF_RECOMPUTED_COUNTS');
  assert.deepEqual(Object.keys(counts).sort(), ['earned-national-flags', 'ordinary']);
  for (const c of Object.values(counts)) assert(Object.values(c).every(value => value > 0), 'ACTUAL_MANAGER_SEASON_FOCUS_TRADEOFF');
  assert.equal(e.fixture.defaults.length, 2, 'CAPTURED_MANAGER_DEFAULT_WITNESS_COUNT');
  assert.deepEqual(e.fixture.defaults.map(item => item.context), ['ordinary', 'earned-national-flags'], 'CAPTURED_MANAGER_DEFAULT_CONTEXTS');
  const page = e.pageSelection; assert.deepEqual(page.draws, [], 'MANAGER_PAGE_STALE_CALLBACK_DRAWS'); assert.equal(page.selected.state.managerSeasonFocus.focus, 'league', 'MANAGER_PAGE_STALE_FOCUS_REPLAY');
  const selectedCore = structuredClone(page.selected.state); delete selectedCore.managerSeasonFocus;
  assert.deepEqual(selectedCore, page.initial.state, 'MANAGER_PAGE_SELECTION_CORE_HELD');
  const advance = e.pageAdvance; assert.equal(advance.selected.raw, page.selected.raw, 'MANAGER_PAGE_COMMITTED_SOURCE');
  assert.deepEqual(advance.actual.state, advance.expected.value, 'MANAGER_PAGE_COMPLETE_ONE_SEASON'); assert.equal(advance.actual.raw, advance.expected.raw, 'MANAGER_PAGE_COMPLETE_ONE_SEASON'); assert.deepEqual(advance.actual.draws, advance.expected.draws, 'MANAGER_PAGE_COMPLETE_ONE_SEASON'); assert.equal(advance.actual.next, advance.expected.next, 'MANAGER_PAGE_COMPLETE_ONE_SEASON');
  return { persistentCases:19, fixedCases:4, defaultPairs:64, tradeoffTriples:256, actualUIEntry:true, actualPageCommittedSource:true, capturedDefaultWitnesses:2 };
}

function admitFocused(input,reportPath){
 assert.equal(input.result.numFailedTestSuites,0,'NO_FAILED_SUITES');
 assert(Array.isArray(input.result.testResults),'ACTUAL_SUITE_SCHEMA');
 for(const file of input.result.testResults)assert.equal(file.status,'passed','NO_FAILED_FILES');
 const rows=classifyManagerFocus(input.result,input.cli,input.status,reportPath,selected.cases);
 const causal=assertManagerFocusEvidence(input.evidence);
 return{rows,causal};
}
function runVitest(name,files,extraEnv,timeout=600_000){
 const dir=path.join(OUT,name);fs.mkdirSync(dir,{recursive:true});
 const reportPath=path.join(dir,'vitest.json'),stdoutPath=path.join(dir,'stdout.log'),stderrPath=path.join(dir,'stderr.log');
 const out=fs.openSync(stdoutPath,'w'),err=fs.openSync(stderrPath,'w'),env={...process.env,...extraEnv};
 if(name==='compatibility')delete env.SC_MANAGER_REVIEW_OBSERVER;
 let child;
 try{child=spawnSync(process.execPath,[path.join(ROOT,'node_modules/vitest/vitest.mjs'),'run',...files,'--maxWorkers=1','--minWorkers=1','--reporter=default','--reporter=json','--outputFile.json='+reportPath],{cwd:ROOT,env,stdio:['ignore',out,err],timeout});}
 finally{fs.closeSync(out);fs.closeSync(err);}
 const processRecord={status:child.status,signal:child.signal,error:child.error?String(child.error):null,reportPath,stdoutPath,stderrPath,observerOverrideAbsent:name==='compatibility'?!Object.hasOwn(env,'SC_MANAGER_REVIEW_OBSERVER'):undefined};
 json(name+'-process',processRecord);fs.writeFileSync(path.join(dir,'raw.exit'),String(child.status)+'\n');
 assert.ifError(child.error);assert.equal(child.signal,null,'ACTUAL_CHILD_COMPLETED');assert.equal(child.status,0,'ACTUAL_POSITIVE_RAW_EXIT');
 const cli=fs.readFileSync(stdoutPath,'utf8')+'\n'+fs.readFileSync(stderrPath,'utf8');fs.writeFileSync(path.join(dir,'vitest.log'),cli);
 return{result:JSON.parse(fs.readFileSync(reportPath,'utf8')),cli,status:child.status,reportPath,processRecord};
}
function readJSON(file){return JSON.parse(fs.readFileSync(file,'utf8'));}
function evidenceAt(caseOut,testOut){
 return{acquisition:readJSON(path.join(caseOut,'acquisition.json')),defaults:readJSON(path.join(caseOut,'default-pairs.json')),acceptance:readJSON(path.join(caseOut,'unemployed-acceptance.json')),ui:readJSON(path.join(caseOut,'focus-ui.json')),tradeoff:readJSON(path.join(caseOut,'tradeoff.json')),fixture:readJSON(selected.fixturePath),pageSelection:readJSON(path.join(testOut,'page-selection.json')),pageAdvance:readJSON(path.join(testOut,'page-advance.json'))};
}
function copiedChecks(input,reportPath){
 const plan=readJSON(selected.copiedCheckerPlan),controls=[...plan.controls,{id:'failed-suite-count',cause:'NO_FAILED_SUITES'},{id:'failed-file-status',cause:'NO_FAILED_FILES'}];
 assert.equal(plan.controls.length,14);assert.equal(controls.length,16);
 const records=[];
 for(const control of controls){
  const copy=structuredClone(input),before=JSON.stringify(copy),patches=[];
  function edit(parts,value,absent=false){
   let parent=copy;for(const part of parts.slice(0,-1))parent=parent[part];
   const key=parts[parts.length-1],exists=Object.hasOwn(parent,key);
   assert.equal(exists,!absent,'COPIED_TARGET_PRESENCE '+control.id);
   const old=exists?structuredClone(parent[key]):undefined;
   if(exists&&JSON.stringify(old)===JSON.stringify(value))return;
   parent[key]=structuredClone(value);patches.push({path:parts,existed:exists,before:old,after:structuredClone(value)});
  }
  const id=control.id;
  if(id==='truncated-cli'){assert.equal((copy.cli.match(/^.*Test Files[^\n]*(?:\n|$)/gm)||[]).length,1);edit(['cli'],copy.cli.replace(/^.*Test Files[^\n]*(?:\n|$)/m,''));}
  else if(id==='suite-method-error'){assert.equal(copy.result.testResults[0].message,'');edit(['result','testResults',0,'message'],'COPIED method failure');}
  else if(id==='unhandled-cli')edit(['cli'],copy.cli+'\nUnhandled Rejection: COPIED diagnostic\n');
  else if(id==='actual-ui-entry'){assert.equal(copy.evidence.acquisition.entry.evidence.confirm,'Confirm Retirement');edit(['evidence','acquisition','entry','evidence','confirm'],'COPIED absent confirmation');}
  else if(id==='national-flags'){assert.equal(copy.evidence.acquisition.witnesses.national.state.managerState.nationalTeamOffer,true);edit(['evidence','acquisition','witnesses','national','state','managerState','nationalTeamOffer'],false);}
  else if(id==='default-draw'){const d=copy.evidence.defaults.pairs[0].actual.action.draws;assert(Array.isArray(d));edit(['evidence','defaults','pairs',0,'actual','action','draws'],[...d,0.123456]);}
  else if(id==='accepted-state')edit(['evidence','acceptance','actual','value','managerState','club'],'COPIED wrong club');
  else if(id==='played-focus'){const rows=copy.evidence.tradeoff.all[0].results.balanced.value.managerState.seasonResults;edit(['evidence','tradeoff','all',0,'results','balanced','value','managerState','seasonResults',rows.length-1,'focus'],'league',true);}
  else if(id==='consumed-once')edit(['evidence','tradeoff','all',0,'results','balanced','value','managerSeasonFocus'],{copied:true},true);
  else if(id==='tradeoff-claimed-count'){const v=copy.evidence.tradeoff.counts.ordinary.leagueGain;assert(Number.isInteger(v));edit(['evidence','tradeoff','counts','ordinary','leagueGain'],v+1);}
  else if(id==='tradeoff-actual-benefit'){
   for(let i=0;i<copy.evidence.tradeoff.all.length;i++){const item=copy.evidence.tradeoff.all[i],b=item.results.balanced.value.managerState.seasonResults,l=item.results.league.value.managerState.seasonResults;assert(Number.isFinite(b[b.length-1].playerPts));edit(['evidence','tradeoff','all',i,'results','league','value','managerState','seasonResults',l.length-1,'playerPts'],b[b.length-1].playerPts);}
   for(const context of ['ordinary','earned-national-flags']){assert(copy.evidence.tradeoff.counts[context].leagueGain>0);edit(['evidence','tradeoff','counts',context,'leagueGain'],0);}
  }
  else if(id==='captured-default-witness-drop'){assert.equal(copy.evidence.fixture.defaults.length,2);edit(['evidence','fixture','defaults'],[]);}
  else if(id==='page-selection-core'){const v=copy.evidence.pageSelection.selected.state.netWorth;assert(Number.isFinite(v));edit(['evidence','pageSelection','selected','state','netWorth'],v+1);}
  else if(id==='page-accepted-state'){const v=copy.evidence.pageAdvance.actual.state.netWorth;assert(Number.isFinite(v));edit(['evidence','pageAdvance','actual','state','netWorth'],v+1);}
  else if(id==='failed-suite-count'){assert.equal(copy.result.numFailedTestSuites,0);edit(['result','numFailedTestSuites'],1);}
  else if(id==='failed-file-status'){assert.equal(copy.result.testResults[0].status,'passed');edit(['result','testResults',0,'status'],'failed');}
  else assert.fail('Unknown selected COPIED control '+id);
  const changed=JSON.stringify(copy);assert(patches.length>0&&changed!==before,'COPIED_DIAGNOSTIC_CHANGED');
  let refusal;try{admitFocused(copy,reportPath);}catch(error){refusal={name:error.name,code:error.code,message:error.message};}
  assert.equal(refusal?.name,'AssertionError','COPIED_ASSERTION_ONLY');assert.equal(refusal.code,'ERR_ASSERTION');assert(refusal.message.includes(control.cause),'COPIED_SPECIFIC_CAUSE '+id);
  for(let i=patches.length-1;i>=0;i--){const patch=patches[i];let parent=copy;for(const part of patch.path.slice(0,-1))parent=parent[part];const key=patch.path[patch.path.length-1];assert.deepEqual(parent[key],patch.after,'COPIED_CHANGED_FIELD_HELD');if(patch.existed)parent[key]=structuredClone(patch.before);else delete parent[key];}
  const restored=JSON.stringify(copy);assert.equal(restored,before,'COPIED_EXACT_SAME_COPY_RESTORATION');admitFocused(copy,reportPath);
  const record={id,cause:control.cause,refusal,patches,originalSHA256:sha(before),changedSHA256:sha(changed),restoredSHA256:sha(restored),sameCopyRestored:true,scope:'Actual in-memory copied report/CLI/evidence. Exact patches and whole serialization hashes retained; any full changed copy reconstructed from these patches is derived.'};
  json('copied-'+id,record);records.push(record);
 }
 return records;
}
function admitCompatibility(run){
 const r=run.result,text=stripAnsi(run.cli);
 assert.equal(run.status,0);assert.equal(r.success,true);assert.equal(r.numFailedTestSuites,0,'COMPAT_NO_FAILED_SUITES');assert.equal(r.numFailedTests,0);assert.equal(r.numTotalTests,4);assert.equal(r.numPassedTests,4);assert.equal(r.numPendingTests,0);assert.equal(r.numTodoTests||0,0);assert.equal(r.numPendingTestSuites,0);
 assert.equal(r.testResults.length,1);const suite=r.testResults[0];assert.equal(suite.status,'passed');assert.equal(suite.message,'');assert(suite.name.replaceAll('\\','/').endsWith('/'+selected.compatibility.testPath));
 assert.deepEqual(suite.assertionResults.map(row=>({title:row.title,fullName:row.fullName,status:row.status,failureMessages:row.failureMessages})).sort((a,b)=>a.fullName.localeCompare(b.fullName)),selected.compatibility.cases.map(row=>({...row,status:'passed',failureMessages:[]})).sort((a,b)=>a.fullName.localeCompare(b.fullName)),'COMPAT_EXACT_FOUR_CASES');
 assert(!/Unhandled (?:Errors?|Rejections?|Exceptions?)|Vitest caught|Failed Suites|No test files found|^\s*Errors\s+[1-9]\d*\s+errors?/mi.test(text),'COMPAT_NO_INFRASTRUCTURE');
 assert(/^\s*Test Files\s+1 passed\s+\(1\)\s*$/m.test(text));assert(/^\s*Tests\s+4 passed\s+\(4\)\s*$/m.test(text));assert.equal((text.match(/JSON report written to /g)||[]).length,1);assert(text.includes('JSON report written to '+run.reportPath));
 return suite.assertionResults.map(row=>({title:row.title,fullName:row.fullName,status:row.status}));
}
const record={status:'STARTED',scope:'First positive producer on frozen PRE-BS source097589/code47dc. No eight physical source variants, full suite, build, browser, global profile, Ready or post-BS main qualification.'};
try{
 record.before=held();json('source-before',record.before);
 if(process.argv[2]==='source'){record.status='SOURCE_PINS_HELD';json('source-admission',record);console.log('MANAGER_FOCUS_POSITIVE_SOURCE: selected app, retained inputs and QA pins held');process.exit(0);}
 assert.equal(process.argv[2]||'healthy','healthy','Only first positive mode is authorized by this source');
 const built=await buildSoccerManagerFocusFixedObserver({root:ROOT,out:path.join(OUT,'observer')});record.observer=built.observer;json('observer-admission',built.observer);
 const caseOut=path.join(OUT,'focused','cases'),testOut=path.join(OUT,'focused','persistent');
 const run=runVitest('focused',selected.focusedTestPaths,{SC_MANAGER_FOCUS_OBSERVER:built.file,SC_MANAGER_FOCUS_REFERENCE:built.referenceFile,SC_MANAGER_FOCUS_CASE_OUT:caseOut,SC_MANAGER_FOCUS_TEST_OUT:testOut});
 const input={result:run.result,cli:run.cli,status:run.status,evidence:evidenceAt(caseOut,testOut)};
 const originalFiles=[run.reportPath,path.join(OUT,'focused','vitest.log'),...['acquisition','default-pairs','unemployed-acceptance','focus-ui','tradeoff'].map(name=>path.join(caseOut,name+'.json')),...['page-selection','page-advance'].map(name=>path.join(testOut,name+'.json')),selected.fixturePath].map(file=>({file,sha256:sha(fs.readFileSync(file))}));
 record.focused=admitFocused(input,run.reportPath);record.copiedControls=copiedChecks(input,run.reportPath);
 for(const file of originalFiles)assert.equal(sha(fs.readFileSync(file.file)),file.sha256,'Original report and evidence held');json('evidence-held',originalFiles);
 const compatibility=await buildSoccerManagerJobReviewObserver({root:ROOT,out:path.join(OUT,'compatibility-observer')});
 const meta=readJSON(path.join(OUT,'compatibility-observer','observed-page.metafile.json')),engine=path.resolve(ROOT,'src/lib/soccerCareerEngine.ts').replaceAll('\\','/').toLowerCase();
 const engineInputs=Object.keys(meta.inputs).filter(file=>path.resolve(ROOT,file).replaceAll('\\','/').toLowerCase()===engine).length;assert.equal(engineInputs,1,'COMPAT_ONE_CANONICAL_ENGINE_INPUT');json('compatibility-observer-admission',{...compatibility.observer,engineInputs,scope:'Separate retained explicit build; unchanged test below additionally uses its actual no-environment-override builder path.'});
 const compatRun=runVitest('compatibility',[selected.compatibility.testPath],{SC_MANAGER_REVIEW_CASE_OUT:path.join(OUT,'compatibility','cases')});
 record.compatibility={rows:admitCompatibility(compatRun),observerOverrideAbsent:compatRun.processRecord.observerOverrideAbsent};assert.equal(record.compatibility.observerOverrideAbsent,true);
 record.after=held();assert.deepEqual(record.after,record.before);record.status='ACTUAL_FIRST_POSITIVE_PRODUCER_ONLY';json('ADMISSION',record);
 console.log('MANAGER_FOCUS_POSITIVE: 23 actual passed, 4 held no-env compatibility passed, 64 default pairs, 256 outcome triples, 16 COPIED guards, source held; PRE-BS first positive only');
}catch(error){record.status='METHOD_OR_UNEXPECTED_FAILURE';record.failure={name:error.name,message:error.message,stack:error.stack};json('ADMISSION',record);throw error;}

