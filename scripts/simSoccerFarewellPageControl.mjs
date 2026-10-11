// Actual captured page callbacks with copied single-guard defects, not engine mocks.
import './lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { OUT, ROOT, evidence, sha, sourceReceipt } from './qa/soccerFarewellKit.mjs';
assert(process.env.CI, 'Farewell page controls run remotely');
const pageFile='src/pages/SoccerCareer.tsx',testFile='src/test/soccerFarewellPage.test.tsx',componentFile='src/components/soccer-career/FarewellSeasonCard.tsx',uiTestFile='src/test/soccerFarewellUi.test.tsx',before=sourceReceipt([pageFile,testFile,componentFile,uiTestFile]);
const source=fs.readFileSync(pageFile,'utf8').replaceAll('\r\n','\n'),test=fs.readFileSync(testFile,'utf8').replaceAll('\r\n','\n');
assert.equal(test.split("'@/pages/SoccerCareer'").length,2,'Unique actual page import');
const copiedTest=test.replace("'@/pages/SoccerCareer'","'./SoccerCareer'");
const parent=path.resolve(ROOT,'.sim-control');fs.mkdirSync(parent,{recursive:true});
const temp=fs.mkdtempSync(path.join(parent,'soccer-farewell-page-'));
assert.equal(path.dirname(temp),parent);assert(path.basename(temp).startsWith('soccer-farewell-page-'));
const faults=[
 {id:'announcement-reentry',anchor:'farewellAnnouncement.current === career || ',replacement:'',failed:['resumes the already-aged suggestion exactly once for two captured page announcement callbacks']},
 {id:'advance-reentry',anchor:'if (farewellAdvance.current === career) return;',replacement:'if (false) return;',failed:['plays one complete final year and draw vector for two captured Next Season clicks','banks a genuine open moment and plays one final year for two captured asynchronous Next Season clicks']},
];
const report={sourceBefore:before,sourceHash:sha(source),controls:[],scope:'Actual13 page cases, full engine/loader/component. Copied page guards independently bypass the component guard or open moments banking path.'};
try{
 fs.mkdirSync(OUT,{recursive:true});fs.writeFileSync(path.join(temp,'soccerFarewellPage.test.tsx'),copiedTest);
 const config=path.join(temp,'vitest.config.ts');
 fs.writeFileSync(config,"import base from '../../vitest.config';export default {...base,test:{...base.test,include:["+JSON.stringify(path.relative(ROOT,path.join(temp,'soccerFarewellPage.test.tsx')).replaceAll('\\','/'))+"]}};");
 const run=(mode,pageSource)=>{
  fs.writeFileSync(path.join(temp,'SoccerCareer.tsx'),pageSource);
  const file=path.join(OUT,'page-control-'+mode+'.json');
  const child=spawnSync(process.execPath,['node_modules/vitest/vitest.mjs','run',path.join(temp,'soccerFarewellPage.test.tsx'),'--config='+config,'--maxWorkers=1','--minWorkers=1','--reporter=json','--outputFile='+file],{cwd:ROOT,encoding:'utf8',maxBuffer:30*1024*1024,env:process.env});
  fs.writeFileSync(path.join(OUT,'page-control-'+mode+'.log'),(child.stdout??'')+(child.stderr??''));
  assert.equal(child.error,undefined,'Vitest starts');assert(fs.existsSync(file),'Structured actual assertion output');
  return{exit:child.status,result:JSON.parse(fs.readFileSync(file,'utf8'))};
 };
 const baseline=run('baseline',source),healthy=baseline.result.testResults.flatMap(v=>v.assertionResults);
 assert.equal(baseline.exit,0);assert.equal(baseline.result.success,true);assert.equal(baseline.result.numPendingTests,0);assert.equal(healthy.length,13);assert(healthy.every(v=>v.status==='passed'));
 report.baseline={exit:baseline.exit,passed:healthy.length,titles:healthy.map(v=>v.title)};
 console.log('PASS copied page baseline:13 complete-state and callback cases.');
 for(const fault of faults){
  assert.equal(source.split(fault.anchor).length,2,'Unique real copied guard '+fault.id);
  const changed=source.replace(fault.anchor,fault.replacement);assert.notEqual(sha(changed),sha(source),'Effective actual source mutation');
  const result=run(fault.id,changed),assertions=result.result.testResults.flatMap(v=>v.assertionResults),failed=assertions.filter(v=>v.status==='failed');
  assert.equal(result.exit,1);assert.equal(result.result.numPendingTests,0);assert.equal(assertions.length,healthy.length);
  assert.deepEqual(failed.map(v=>v.title),fault.failed,'Exact real callback outcome failures');assert.equal(assertions.filter(v=>v.status==='passed').length,healthy.length-fault.failed.length);
  for(const item of failed)assert(/AssertionError|expect\(received\)\.to(Equal|Be)|expected .* to (be|deeply equal|equal)/s.test(item.failureMessages.join('\n')),'Setup/import/type failures never count');
  report.controls.push({id:fault.id,targetCount:1,sourceHash:sha(source),faultHash:sha(changed),exit:result.exit,failed:failed.map(v=>({title:v.title,messages:v.failureMessages})),unrelatedPassed:assertions.filter(v=>v.status==='passed').length});
  console.log('CONTROL FIRED '+fault.id+':'+fault.failed.length+' actual callback equality failures,'+(healthy.length-fault.failed.length)+' unrelated actual page cases pass.');
 }
 const component=fs.readFileSync(componentFile,'utf8').replaceAll('\r\n','\n'),uiTest=fs.readFileSync(uiTestFile,'utf8').replaceAll('\r\n','\n');
 const componentAnchor='submitted.current || ';assert.equal(component.split(componentAnchor).length,2,'Unique actual component submit guard');
 assert.equal(uiTest.split("'@/components/soccer-career/FarewellSeasonCard'").length,2);
 fs.writeFileSync(path.join(temp,'soccerFarewellUi.test.tsx'),uiTest.replace("'@/components/soccer-career/FarewellSeasonCard'","'./FarewellSeasonCard'"));
 const uiConfig=path.join(temp,'vitest-ui.config.ts');fs.writeFileSync(uiConfig,"import base from '../../vitest.config';export default {...base,test:{...base.test,include:["+JSON.stringify(path.relative(ROOT,path.join(temp,'soccerFarewellUi.test.tsx')).replaceAll('\\','/'))+"]}};");
 const uiRun=(mode,contents)=>{
  fs.writeFileSync(path.join(temp,'FarewellSeasonCard.tsx'),contents);const file=path.join(OUT,'component-control-'+mode+'.json');
  const child=spawnSync(process.execPath,['node_modules/vitest/vitest.mjs','run',path.join(temp,'soccerFarewellUi.test.tsx'),'--config='+uiConfig,'--maxWorkers=1','--minWorkers=1','--reporter=json','--outputFile='+file],{cwd:ROOT,encoding:'utf8',maxBuffer:20*1024*1024,env:process.env});
  fs.writeFileSync(path.join(OUT,'component-control-'+mode+'.log'),(child.stdout??'')+(child.stderr??''));assert.equal(child.error,undefined);assert(fs.existsSync(file));return{exit:child.status,result:JSON.parse(fs.readFileSync(file,'utf8'))};
 };
 const uiBaseline=uiRun('baseline',component),uiHealthy=uiBaseline.result.testResults.flatMap(v=>v.assertionResults);assert.equal(uiBaseline.exit,0);assert.equal(uiBaseline.result.numPendingTests,0);assert.equal(uiHealthy.length,14);assert(uiHealthy.every(v=>v.status==='passed'));
 const changedComponent=component.replace(componentAnchor,'');assert.notEqual(sha(changedComponent),sha(component));
 const uiFault=uiRun('fault',changedComponent),uiAssertions=uiFault.result.testResults.flatMap(v=>v.assertionResults),uiFailed=uiAssertions.filter(v=>v.status==='failed');
 assert.equal(uiFault.exit,1);assert.equal(uiFault.result.numPendingTests,0);assert.equal(uiAssertions.length,14);assert.deepEqual(uiFailed.map(v=>v.title),['confirms only once for two captured rapid clicks and preserves the supplied career']);assert.equal(uiAssertions.filter(v=>v.status==='passed').length,13);
 assert(/AssertionError|expected .* to be called/s.test(uiFailed[0].failureMessages.join('\n')),'Actual invocation assertion, never a setup failure');
 report.component={targetCount:1,sourceHash:sha(component),faultHash:sha(changedComponent),baseline:14,exit:uiFault.exit,failed:uiFailed.map(v=>({title:v.title,messages:v.failureMessages})),unrelatedPassed:13};
 console.log('CONTROL FIRED component-reentry:1 actual consume-once assertion,13 unrelated UI cases pass,14 healthy baseline cases.');
 report.sourceAfter=sourceReceipt([pageFile,testFile,componentFile,uiTestFile]);assert.deepEqual(report.sourceAfter,before);evidence('page-control-receipt.json',report);
 console.log('PASS farewell copied source held and complete evidence retained.');
}finally{
 assert.equal(path.dirname(temp),parent);assert(path.basename(temp).startsWith('soccer-farewell-page-'));fs.rmSync(temp,{recursive:true,force:true});
}
