import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
assert.equal(process.env.CI,'1','Remote fixed qualification only');
const ROOT=process.cwd(),OUT=path.resolve(process.env.SC_COACHING_GATE_OUT||'coaching-fixed-artifacts/proof'),mode=process.argv[2]||'source';
const sha=body=>createHash('sha256').update(body).digest('hex'),metaPath='qa/soccer-career-coaching-start-v1/SOURCE-READY.json';
const pins={
  [metaPath]:'d5122abea6ae1f52285cd2fd01bfca257808e3c1ff24f821151ddeb60c3538be',
  'qa/soccer-career-coaching-start-v1/SOURCE-FAULTS.json':'030ec20aa115c1aec45485c0191fda2d81e7b59f942fa130e154d2650ad62eb2',
  'scripts/qa/soccerCoachingStartConsumer.mjs':'4be9f4bd583adadbfd9f64fd1997b81861f8d368dd3bc1b6c36204b9fb623996',
  'scripts/qa/soccerCoachingStartControls.mjs':'2adc28c881990d23a5240ee72f4b8a8e8cb268cc68377181b1b46d42d1e3a259',
  'scripts/qa/buildSoccerCoachingStartObserver.mjs':'0c85bb482c920a1d745f67733165b721eb6fe3122141ef28b9bed73d0064bc16',
  'src/test/soccerCareerCoachingStart.consumer.test.tsx':'2a1d221b7640053953699c033a1db525b5f2cbe98878d4742f40ba951a978c5a',
  'src/test/soccerCareerCoachingStart.consumer.lifecycle.test.tsx':'c2d27bc50f8c1d5aa51c1b6c17761a36a3741f5aa976e066162a49cb47a2abea',
};
const focused={
 'src/test/soccerCareerCoachingStart.test.ts':10,
 'src/test/soccerCareerCoachingChooser.test.tsx':6,
 'src/test/soccerCareerCoachingTransaction.test.tsx':6,
 'src/test/soccerCareerCoachingStart.consumer.test.tsx':4,
 'src/test/soccerCareerCoachingStart.consumer.lifecycle.test.tsx':8,
};
// Exact58 identities from admitted3609 full suite, not a refreshed skip list.
const expectedSkipped=[
  "src/test/clubManagerVarLive.test.tsx\u0000Club Manager: VAR with the switch off (the dark rule) a Quick Sim through the hook is the match the engine plays without reviews",
  "src/test/clubManagerVarLive.test.tsx\u0000Club Manager: VAR with the switch off (the dark rule) a live kick off through the hook asks for no review",
  "src/test/clubManagerVarLive.test.tsx\u0000Club Manager: VAR with the switch off (the dark rule) the fast forward is the engine run without reviews",
  "src/test/dailySaveHardening.test.tsx\u00005) saves written before this round load unchanged captures saves from the hook under test (the harness points it at the pre 848 code)",
  "src/test/dailySaveParity.test.tsx\u0000one tab plays and restores exactly as before Round 848 afl-higher-lower",
  "src/test/dailySaveParity.test.tsx\u0000one tab plays and restores exactly as before Round 848 baseball-career",
  "src/test/dailySaveParity.test.tsx\u0000one tab plays and restores exactly as before Round 848 baseball-connections",
  "src/test/dailySaveParity.test.tsx\u0000one tab plays and restores exactly as before Round 848 career",
  "src/test/dailySaveParity.test.tsx\u0000one tab plays and restores exactly as before Round 848 career-ladder",
  "src/test/dailySaveParity.test.tsx\u0000one tab plays and restores exactly as before Round 848 cfb-higher-lower",
  "src/test/dailySaveParity.test.tsx\u0000one tab plays and restores exactly as before Round 848 college-grid",
  "src/test/dailySaveParity.test.tsx\u0000one tab plays and restores exactly as before Round 848 connections",
  "src/test/dailySaveParity.test.tsx\u0000one tab plays and restores exactly as before Round 848 f1-higher-lower",
  "src/test/dailySaveParity.test.tsx\u0000one tab plays and restores exactly as before Round 848 football-connect-4",
  "src/test/dailySaveParity.test.tsx\u0000one tab plays and restores exactly as before Round 848 football-draft",
  "src/test/dailySaveParity.test.tsx\u0000one tab plays and restores exactly as before Round 848 football-grid",
  "src/test/dailySaveParity.test.tsx\u0000one tab plays and restores exactly as before Round 848 footle",
  "src/test/dailySaveParity.test.tsx\u0000one tab plays and restores exactly as before Round 848 golf-higher-lower",
  "src/test/dailySaveParity.test.tsx\u0000one tab plays and restores exactly as before Round 848 guess-the-college",
  "src/test/dailySaveParity.test.tsx\u0000one tab plays and restores exactly as before Round 848 guess-the-golfer",
  "src/test/dailySaveParity.test.tsx\u0000one tab plays and restores exactly as before Round 848 guess-transfer-value",
  "src/test/dailySaveParity.test.tsx\u0000one tab plays and restores exactly as before Round 848 hockey-career",
  "src/test/dailySaveParity.test.tsx\u0000one tab plays and restores exactly as before Round 848 hockey-higher-lower",
  "src/test/dailySaveParity.test.tsx\u0000one tab plays and restores exactly as before Round 848 missing-eleven",
  "src/test/dailySaveParity.test.tsx\u0000one tab plays and restores exactly as before Round 848 missing-five",
  "src/test/dailySaveParity.test.tsx\u0000one tab plays and restores exactly as before Round 848 missing-nine",
  "src/test/dailySaveParity.test.tsx\u0000one tab plays and restores exactly as before Round 848 missing-xi",
  "src/test/dailySaveParity.test.tsx\u0000one tab plays and restores exactly as before Round 848 mlb-higher-lower",
  "src/test/dailySaveParity.test.tsx\u0000one tab plays and restores exactly as before Round 848 nba-career",
  "src/test/dailySaveParity.test.tsx\u0000one tab plays and restores exactly as before Round 848 nba-connections",
  "src/test/dailySaveParity.test.tsx\u0000one tab plays and restores exactly as before Round 848 nba-higher-lower",
  "src/test/dailySaveParity.test.tsx\u0000one tab plays and restores exactly as before Round 848 nfl-connections",
  "src/test/dailySaveParity.test.tsx\u0000one tab plays and restores exactly as before Round 848 nfl-higher-lower",
  "src/test/dailySaveParity.test.tsx\u0000one tab plays and restores exactly as before Round 848 nhl-connections",
  "src/test/dailySaveParity.test.tsx\u0000one tab plays and restores exactly as before Round 848 olympics",
  "src/test/dailySaveParity.test.tsx\u0000one tab plays and restores exactly as before Round 848 puck-detective",
  "src/test/dailySaveParity.test.tsx\u0000one tab plays and restores exactly as before Round 848 rank-em",
  "src/test/dailySaveParity.test.tsx\u0000one tab plays and restores exactly as before Round 848 shirt-number",
  "src/test/dailySaveParity.test.tsx\u0000one tab plays and restores exactly as before Round 848 soccer-grid",
  "src/test/dailySaveParity.test.tsx\u0000one tab plays and restores exactly as before Round 848 tennis-higher-lower",
  "src/test/dailySaveParity.test.tsx\u0000one tab plays and restores exactly as before Round 848 transfer-path",
  "src/test/dailySaveParity.test.tsx\u0000one tab plays and restores exactly as before Round 848 ufc",
  "src/test/dailySaveParity.test.tsx\u0000one tab plays and restores exactly as before Round 848 world-cup",
  "src/test/homeSearchRecovery.test.tsx\u0000Back clears the query and restores browse and input focus without scrolling",
  "src/test/homeSearchRecovery.test.tsx\u0000a failed focus prewarm keeps browsing until a query asks for recovery",
  "src/test/homeSearchRecovery.test.tsx\u0000a real zero-result query shows existing fallback games only after resolution",
  "src/test/homeSearchRecovery.test.tsx\u0000clearing a pending query keeps browse after late resolution and reuses the engine",
  "src/test/homeSearchRecovery.test.tsx\u0000failed search remains terminal through Back reentry focus and hover",
  "src/test/homeSearchRecovery.test.tsx\u0000only explicit Reload invokes the existing reload boundary once",
  "src/test/homeSearchRecovery.test.tsx\u0000pending import keeps honest busy state without false empty results or writes",
  "src/test/homeSearchRecovery.test.tsx\u0000rejected import clears busy and offers recovery without pretending no games exist",
  "src/test/homeSearchRecovery.test.tsx\u0000resolved import renders the latest query in unchanged engine rank order",
  "src/test/homeSearchRecovery.test.tsx\u0000unchanged search engine retains complete catalog and exact ranked results",
  "src/test/nhlContributors.test.ts\u0000NHL simulation contributor outcomes matches physical original rounds, AI, roster moves, playoffs and offseason",
  "src/test/usBoardFixture.test.tsx\u0000the four US career boards against the recorded fixture mlb",
  "src/test/usBoardFixture.test.tsx\u0000the four US career boards against the recorded fixture nba",
  "src/test/usBoardFixture.test.tsx\u0000the four US career boards against the recorded fixture nfl",
  "src/test/usBoardFixture.test.tsx\u0000the four US career boards against the recorded fixture nhl"
];
fs.mkdirSync(OUT,{recursive:true});
const write=(file,value)=>fs.writeFileSync(path.join(OUT,file),JSON.stringify(value,null,2));
function source(){
 for(const [file,hash]of Object.entries(pins))assert.equal(sha(fs.readFileSync(file)),hash,file);
 const meta=JSON.parse(fs.readFileSync(metaPath));assert.equal(meta.files.length,17);
 for(const file of meta.files)assert.equal(sha(fs.readFileSync(file.path)),file.sha256,file.path);
 const changed=execFileSync('git',['diff','--name-only','dd6548','HEAD'],{encoding:'utf8'}).trim().split('\n').filter(Boolean);
 const allowed=new Set([...meta.files.map(file=>file.path),...Object.keys(pins),'scripts/qa/soccerCoachingFixedGate.mjs','.github/workflows/soccer-coaching-start-baseline.yml','docs/PROJECT-STATE.md']);
 for(const file of changed)assert(allowed.has(file)||file.startsWith('qa/soccer-career-coaching-start-v1/'),'Unexpected source path '+file);
 write('selected-source-pins.json',{metadata:pins[metaPath],selected:meta.files,qa:pins,changed});
 console.log('PASS exact17selected bodies, fixedQA pins and owned source boundary');
 return Object.fromEntries([...new Set([...meta.files.map(file=>file.path),...Object.keys(pins)])].map(file=>[file,sha(fs.readFileSync(file))]));
}
function noInfrastructure(result,cli){
 for(const suite of result.testResults)assert.equal(suite.message,'','No suite/collection/setup error');
 const plain=cli.replace(/\u001b\[[0-?]*[ -/]*[@-~]/g,'');
 assert(!/Unhandled Errors?\b|Vitest caught [1-9]\d* unhandled errors?|\bUnhandled Rejection\b|\bUncaught Exception\b|\bFailed Suites\b|^\s*Errors\s+[1-9]\d*\s+errors?\b/m.test(plain),'No CLI infrastructure diagnostics');
}
function admit(jsonFile,logFile,full=false){
 const result=JSON.parse(fs.readFileSync(jsonFile,'utf8')),cli=fs.readFileSync(logFile,'utf8');noInfrastructure(result,cli);
 const suites=result.testResults,rows=suites.flatMap(suite=>suite.assertionResults);
 if(full){
  assert.equal(rows.length,9755);assert.equal(result.numTotalTests,9755);assert.equal(result.numPassedTests,9697);assert.equal(result.numFailedTests,0);assert.equal(result.numPendingTests,58);
  const skipped=suites.flatMap(suite=>suite.assertionResults.filter(row=>row.status==='pending').map(row=>path.relative(ROOT,suite.name).replaceAll('\\','/')+'\0'+row.fullName)).sort();
  assert.deepEqual(skipped,[...expectedSkipped].sort(),'Exact58 inherited skipped identities held');
  assert(rows.every(row=>row.status==='passed'||row.status==='pending'));
 }else{assert.equal(suites.length,5);assert.equal(rows.length,34);assert(rows.every(row=>row.status==='passed'));assert.equal(result.numPendingTests,0);}
 for(const [file,count]of Object.entries(focused)){const suite=suites.find(suite=>path.relative(ROOT,suite.name).replaceAll('\\','/')===file);assert(suite,file+' actually collected');assert.equal(suite.assertionResults.length,count);assert(suite.assertionResults.every(row=>row.status==='passed'),file+' has no filtered/skipped cases');}
 return{files:suites.length,total:rows.length,passed:rows.filter(row=>row.status==='passed').length,pending:rows.filter(row=>row.status==='pending').length,failed:rows.filter(row=>row.status==='failed').length};
}
function child(label,args,env){
 const file=path.join(OUT,label+'.log'),fd=fs.openSync(file,'w');let run;
 try{run=spawnSync(process.execPath,args,{cwd:ROOT,env,stdio:['ignore',fd,fd],timeout:900000});}finally{fs.closeSync(fd);}
 write(label+'-process.json',{status:run.status,signal:run.signal,error:run.error?String(run.error):null,args});
 assert(!run.error&&run.signal===null&&run.status===0,label+' actual process completed successfully');
 return file;
}
const before=source();
if(mode==='proof'){
 const clean={...process.env};delete clean.SC_COACHING_START_OBSERVER;
 child('supplied-consumer',['scripts/qa/soccerCoachingStartConsumer.mjs'],{...clean,SC_COACHING_START_PHASE:'fixed',SC_COACHING_START_OUT:path.join(OUT,'supplied-consumer')});
 const supplied=JSON.parse(fs.readFileSync(path.join(OUT,'supplied-consumer/admission.json')));assert.equal(supplied.status,'FIXED_CONSUMERS_PASSED');assert.equal(supplied.cases.length,4);assert(supplied.cases.every(row=>row.status==='passed'));
 const jsonFile=path.join(OUT,'focused.json');
 const log=child('focused-no-env',['node_modules/vitest/vitest.mjs','run',...Object.keys(focused),'--maxWorkers=1','--minWorkers=1','--reporter=default','--reporter=json','--outputFile.json='+jsonFile],clean);
 const healthy=admit(jsonFile,log);
 child('physical-controls',['scripts/qa/soccerCoachingStartControls.mjs'],{...clean,SC_COACHING_CONTROLS_OUT:path.join(OUT,'controls')});
 const controls=JSON.parse(fs.readFileSync(path.join(OUT,'controls/admission.json')));assert.equal(controls.status,'PASSED');assert.equal(controls.healthy.passed,22);assert.equal(controls.controls.length,11);
 for(const control of controls.controls){assert.equal(control.changed.status,1);assert.equal(control.changed.failed,1);assert.equal(control.changed.passed,1);assert.equal(control.changed.filtered,20);assert.equal(control.restored.passed,22);assert.equal(control.restored.failed,0);assert.equal(control.beforeSha256,control.restoredSourceSha256);assert.notEqual(control.beforeSha256,control.changedSha256);}
 write('fixed-admission.json',{status:'PASS',healthy,suppliedCases:4,sourceControls:11,fullRestores:11,defaultPreservation:'Both ordinary manager consumers retain full canonical state/serialized output/draw vector/next; immutable engine body held by selected metadata. No historical Programme family rerun or refresh.'});
 console.log('PASS coaching fixed:34no-env cases,4supplied consumers,11effective physical controls,11exact22case restores');
}else if(mode==='units-admit'){
 const result=admit(path.join(OUT,'full-units.json'),path.join(OUT,'full-units.log'),true);write('full-unit-admission.json',{status:'PASS',...result,exactInheritedSkipIdentities:58,newFocusedCases:34});console.log('PASS actual fullsuite:9755total,9697passed,58exact inherited skipped,0failed; all34new cases passed without observer env');
}else assert.equal(mode,'source');
const after=Object.fromEntries(Object.keys(before).map(file=>[file,sha(fs.readFileSync(file))]));assert.deepEqual(after,before,'All selected and fixedQA sources held');write('source-held.json',{before,after});
