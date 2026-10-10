import './lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {OUT,ROOT,evidence,sha,sourceReceipt} from './qa/soccerAgentReviewKit.mjs';
assert(process.env.CI,'Actual agent review page and component controls run remotely');
const page='src/pages/SoccerCareer.tsx',component='src/components/soccer-career/AgentReviewCard.tsx',pageTest='src/test/soccerAgentReviewPage.test.tsx',uiTest='src/test/soccerAgentReviewUi.test.tsx',files=[page,component,pageTest,uiTest],before=sourceReceipt(files);
const parent=path.join(ROOT,'.sim-control');fs.mkdirSync(parent,{recursive:true});const temp=fs.mkdtempSync(path.join(parent,'agent-review-'));assert.equal(path.dirname(temp),parent);assert(path.basename(temp).startsWith('agent-review-'));
const report={sourceBefore:before,controls:[],scope:'Actual unchanged helper and component with captured callbacks. One page fault removes two independent masking barriers, each uniquely and effectively; the assertion counts real zero-draw helper invocations, retaining entire saves and vectors.'};
function run(kind,mode,source){
 const name=kind==='page'?'SoccerCareer':'AgentReviewCard',inputFile=kind==='page'?pageTest:uiTest,importName=kind==='page'?'@/pages/SoccerCareer':'@/components/soccer-career/AgentReviewCard',test=fs.readFileSync(inputFile,'utf8').replaceAll('\r\n','\n');
 assert.equal(test.split("'"+importName+"'").length,2,'Unique actual production import');fs.writeFileSync(path.join(temp,name+'.tsx'),source);const copyFile=path.join(temp,path.basename(inputFile));fs.writeFileSync(copyFile,test.replace("'"+importName+"'","'./"+name+"'"));
 const config=path.join(temp,kind+'-vitest.config.ts');fs.writeFileSync(config,"import base from '../../vitest.config';export default {...base,test:{...base.test,include:["+JSON.stringify(path.relative(ROOT,copyFile).replaceAll('\\','/'))+"]}};");
 const file=path.join(OUT,kind+'-control-'+mode+'.json'),child=spawnSync(process.execPath,['node_modules/vitest/vitest.mjs','run',copyFile,'--config='+config,'--maxWorkers=1','--minWorkers=1','--reporter=json','--outputFile='+file],{cwd:ROOT,encoding:'utf8',maxBuffer:30*1024*1024,env:process.env});fs.writeFileSync(path.join(OUT,kind+'-control-'+mode+'.log'),(child.stdout??'')+(child.stderr??''));assert.equal(child.error,undefined);assert(fs.existsSync(file),'Real structured assertions retained');return{exit:child.status,result:JSON.parse(fs.readFileSync(file,'utf8'))};
}
try{
 fs.mkdirSync(OUT,{recursive:true});
 for(const spec of [
  {id:'page-double-callback',kind:'page',file:page,total:10,failed:['executes the real agent mutation once for two captured same-render page callbacks','does not consume the captured-state guard for an invalid or current-agent selection','rejects a never-used stale eligible callback after the actual next season without invoking the agent mutation'],edits:[{from:'agentReviewAttempt.current === career || ',to:''},{from:'prev === career ? changeCareerAgent(prev, agentId) : prev',to:'changeCareerAgent(prev, agentId)'}]},
  {id:'component-double-confirm',kind:'component',file:component,total:28,failed:['confirms once for two captured rapid confirmation clicks through the real component guard'],edits:[{from:'submitted.current || ',to:''}]},
 ]){
  const source=fs.readFileSync(spec.file,'utf8').replaceAll('\r\n','\n'),baseline=run(spec.kind,'baseline',source),healthy=baseline.result.testResults.flatMap(t=>t.assertionResults);assert.equal(baseline.exit,0);assert.equal(baseline.result.success,true);assert.equal(baseline.result.numPendingTests,0);assert.equal(healthy.length,spec.total);assert(healthy.every(t=>t.status==='passed'));
  let changed=source;const edits=[];for(const e of spec.edits){assert.equal(changed.split(e.from).length,2,'Unique actual captured-state barrier');const old=sha(changed);changed=changed.replace(e.from,e.to);assert.notEqual(sha(changed),old);edits.push({targetCount:1,before:old,after:sha(changed),anchor:e.from});}
  const fault=run(spec.kind,'fault',changed),all=fault.result.testResults.flatMap(t=>t.assertionResults),failed=all.filter(t=>t.status==='failed');assert.equal(fault.exit,1);assert.equal(fault.result.numPendingTests,0);assert.equal(all.length,spec.total);assert.deepEqual(failed.map(t=>t.title),spec.failed);assert.equal(all.filter(t=>t.status==='passed').length,spec.total-spec.failed.length);
  assert(failed.every(item=>item.failureMessages.some(t=>/expected[\s\S]*(?:to be called 1 times|to not be called(?: at all)?|not to be called(?: at all)?)/.test(t))),'Exact real-helper or callback invocation assertion, never import/type/setup failure');report.controls.push({id:spec.id,baseline:spec.total,baselineExit:baseline.exit,baselineTitles:healthy.map(t=>t.title),edits,sourceHash:sha(source),faultHash:sha(changed),exit:fault.exit,failed:failed.map(t=>({title:t.title,messages:t.failureMessages})),unrelatedPassed:spec.total-spec.failed.length});
  console.log('PASS '+spec.kind+' actual healthy baseline:'+spec.total+' cases.');console.log('CONTROL FIRED '+spec.id+':'+spec.failed.length+' actual invocation assertions,'+(spec.total-spec.failed.length)+' unrelated cases pass.');
 }
 report.sourceAfter=sourceReceipt(files);assert.deepEqual(report.sourceAfter,before);evidence('page-control-receipt.json',report);console.log('PASS actual page/component source held and exact evidence retained.');
}finally{assert.equal(path.dirname(temp),parent);assert(path.basename(temp).startsWith('agent-review-'));fs.rmSync(temp,{recursive:true,force:true});}