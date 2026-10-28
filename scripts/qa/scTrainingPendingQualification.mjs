import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';

assert.equal(process.env.CI,'1','Remote CI qualification only');

const ROOT=process.cwd(),OUT=path.resolve(process.env.SC_TRAINING_FIXED_OUT||'training-fixed-artifacts/proof');
const mode=process.argv[2],manifestPath='qa/sc-training-pending-fixed-v1/SOURCE-READY.json';
assert(['source','focused','full'].includes(mode),'Explicit qualification mode');
fs.mkdirSync(OUT,{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex');
const git=b=>createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
const write=(name,value)=>fs.writeFileSync(path.join(OUT,name+'.json'),JSON.stringify(value,null,2));
const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
assert.equal(manifest.base,'b20ec6664df9d4c58d63ea0596791d33b2a3b8fc');
assert(Array.isArray(manifest.files)&&manifest.files.length>0,'Frozen selected source bodies');
assert(Array.isArray(manifest.held)&&manifest.held.length>0,'Frozen held engine/codec/data bodies');
assert(Number.isSafeInteger(manifest.expectedFocused)&&manifest.expectedFocused>0,'Final focused count must be bound');
assert(Array.isArray(manifest.focused)&&manifest.focused.length===manifest.expectedFocused,'Independent frozen case names');
assert(Array.isArray(manifest.allowedChanges)&&manifest.allowedChanges.length>0,'Exact bounded source delta');
const pin=f=>{const b=fs.readFileSync(f.path);assert.equal(b.length,f.bytes,f.path);assert.equal(sha(b),f.sha256,f.path);assert.equal(git(b),f.gitBlob,f.path);return{path:f.path,bytes:b.length,sha256:sha(b),gitBlob:git(b)};};
const sourceBefore=[...manifest.files,...manifest.held].map(pin);write('selected-source-pins',sourceBefore);
fs.writeFileSync(path.join(OUT,'expected-paths.txt'),[...manifest.allowedChanges].sort().join('\n')+'\n');
if(mode==='source'){console.log('SC_TRAINING_FIXED_SOURCE: selected and held body pins match');}
else{
 const files=[...new Set(manifest.focused.map(row=>row.file))];
 const jsonFile=path.join(OUT,'vitest.json');
 const args=['node_modules/vitest/vitest.mjs','run',...(mode==='focused'?files:[]),'--maxWorkers=1','--minWorkers=1','--reporter=verbose','--reporter=json','--outputFile.json='+jsonFile];
 const child=spawnSync(process.execPath,args,{cwd:ROOT,env:{...process.env,CI:'1'},encoding:'utf8',timeout:mode==='full'?40*60_000:180_000,maxBuffer:24*1024*1024});
 fs.writeFileSync(path.join(OUT,'vitest.stdout.log'),child.stdout||'');fs.writeFileSync(path.join(OUT,'vitest.stderr.log'),child.stderr||'');
 fs.writeFileSync(path.join(OUT,'vitest.log'),(child.stdout||'')+(child.stderr||''));
 write('process',{status:child.status,signal:child.signal,error:child.error?String(child.error):null,args});
 assert.ifError(child.error);assert.equal(child.signal,null);assert.equal(child.status,0,'Actual complete Vitest process must pass');
 const report=JSON.parse(fs.readFileSync(jsonFile,'utf8'));
 const plain=((child.stdout||'')+(child.stderr||'')).replace(/\x1b\[[0-?]*[ -/]*[@-~]/g,'');
 assert(!/Failed Suites|Unhandled Errors|Vitest caught\s+\d+\s+unhandled|UnhandledRejection|UncaughtException|^\s*Errors\s+\d+\s+errors?/m.test(plain),'No CLI infrastructure diagnostics');
 assert.equal(report.success,true);assert.equal(report.numFailedTestSuites,0);assert.equal(report.numFailedTests,0);assert.equal(report.numTodoTests,0);
 assert(Array.isArray(report.testResults)&&report.testResults.length>0,'Actual completed files');
 const rows=[];
 for(const suite of report.testResults){
  assert(['passed','skipped'].includes(suite.status));assert.equal(suite.message,'');
  const file=path.relative(ROOT,suite.name).replaceAll('\\','/');assert(!file.startsWith('../'),'Actual source test file');
  for(const row of suite.assertionResults){
   assert(['passed','skipped'].includes(row.status));assert.deepEqual(row.failureMessages,[]);
   rows.push({file,name:row.fullName,status:row.status});
  }
 }
 assert.equal(rows.length,report.numTotalTests);assert.equal(rows.filter(row=>row.status==='passed').length,report.numPassedTests);
 const identity=row=>JSON.stringify([row.file,row.name,row.status]);
 for(const file of files){
  const expected=manifest.focused.filter(row=>row.file===file).map(row=>identity({...row,status:'passed'})).sort();
  assert.deepEqual(rows.filter(row=>row.file===file).map(identity).sort(),expected,'All exact owned cases pass without skips');
 }
 const skipped=rows.filter(row=>row.status==='skipped');
 if(mode==='focused'){
  assert.equal(rows.length,manifest.expectedFocused);assert.equal(skipped.length,0);assert.equal(report.numPendingTests,0);
 }else{
  const referenceBytes=fs.readFileSync(manifest.skipReference.path);assert.equal(sha(referenceBytes),manifest.skipReference.sha256,'Frozen prior skip reference');
  const reference=JSON.parse(referenceBytes.toString('utf8'));assert(Array.isArray(reference.rows));assert.equal(reference.rows.length,58);
  assert(reference.rows.every(row=>row.status==='skipped'));assert.deepEqual(skipped.map(identity).sort(),reference.rows.map(identity).sort(),'Exact58 prior skipped identities and multiplicities');
  assert.equal(report.numPendingTests,58);
 }
 assert(plain.includes('JSON report written to '),'Actual JSON-written closing');
 const filesClosing=new RegExp('^\\s*Test Files\\s+.*\\('+report.testResults.length+'\\)\\s*$','m');
 const caseClosing=new RegExp('^\\s*Tests\\s+.*\\('+rows.length+'\\)\\s*$','m');
 assert(filesClosing.test(plain)&&caseClosing.test(plain),'Actual complete file and case closings');
 const sourceAfter=[...manifest.files,...manifest.held].map(pin);assert.deepEqual(sourceAfter,sourceBefore);
 write('ADMISSION',{status:'ACTUAL_'+mode.toUpperCase()+'_PASS',mode,files:report.testResults.length,total:rows.length,passed:report.numPassedTests,skipped:skipped.length,failed:0,ownedPassed:manifest.expectedFocused,sourceBefore,sourceAfter,limits:'Fresh current source only. Old reference supplies58skipidentities, never an imported full-suite denominator. Browser/build/source archives have separate mandatory evidence.'});
 console.log('SC_TRAINING_FIXED_'+mode.toUpperCase()+': '+rows.length+' actual cases, '+report.numPassedTests+' passed, '+skipped.length+' existing skips, '+manifest.expectedFocused+' owned passed, 0 infrastructure errors');
}
