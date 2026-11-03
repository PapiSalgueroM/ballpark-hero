import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

const out=process.env.OUT,sha=body=>createHash('sha256').update(body).digest('hex');
assert(out&&path.isAbsolute(out));
const save=(name,value)=>fs.writeFileSync(path.join(out,name),JSON.stringify(value,null,2)+'\n');
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const expected=read('.qa-inputs/world-xi-expected-units.json');
const order=rows=>rows.sort((a,b)=>a.file<b.file?-1:a.file>b.file?1:a.fullName<b.fullName?-1:a.fullName>b.fullName?1:0);
function report(file){
  const body=read(file),rows=[];
  assert.equal(body.success,true,'WORLD_XI_UNITS_SUCCESS');
  assert.equal(body.numTotalTests,34,'WORLD_XI_UNITS_COUNT');
  assert.equal(body.numPassedTests,34,'WORLD_XI_UNITS_PASSES');
  assert.equal(body.numFailedTests,0,'WORLD_XI_UNITS_FAILURES');
  assert.equal(body.numPendingTests,0,'WORLD_XI_UNITS_PENDING');
  assert.equal(body.testResults.length,6,'WORLD_XI_UNITS_FILES');
  for(const suite of body.testResults){
    assert.equal(suite.status,'passed','WORLD_XI_UNITS_FILE_STATUS');
    const file=path.relative(process.cwd(),suite.name).split(path.sep).join('/');
    for(const item of suite.assertionResults){
      assert.equal(item.status,'passed','WORLD_XI_UNITS_CASE_STATUS');
      assert.equal(item.failureMessages.length,0,'WORLD_XI_UNITS_CASE_FAILURES');
      rows.push({file,fullName:item.fullName,status:item.status});
    }
  }
  assert.deepEqual(order(rows),order(structuredClone(expected.cases)),'WORLD_XI_UNITS_IDENTITIES');
  return rows;
}
function logs(stdout,stderr){
  const text=Buffer.concat([fs.readFileSync(stdout),Buffer.from('\n'),fs.readFileSync(stderr)]).toString('utf8');
  const findings=[];
  for(const [name,pattern] of [
    ['unhandled',/UnhandledPromiseRejection(?:Warning|Error)?|Unhandled Rejection|Unhandled Exception|Unhandled Errors|uncaughtException|unhandledRejection|unhandled promise/i],
    ['runtime',/(?:^|\n)\s*(?:TypeError|ReferenceError|SyntaxError|RangeError):/],
  ])if(pattern.test(text))findings.push(name);
  assert.deepEqual(findings,[],'WORLD_XI_UNITS_RUNTIME');
  return {knownShapeFindings:findings,scope:'Known diagnostics only. Absent optional runtime counters remain UNKNOWN.'};
}
const controls=[];
try{
  assert.equal(read('node_modules/vitest/package.json').version,'3.2.7');
  assert.equal(expected.cases.length,34);
  const sourcePins=expected.allSixCurrentGitSHAAndBytePins.map(row=>{
    const body=fs.readFileSync(row.path);
    assert.equal(body.length,row.pin.bytes);
    assert.equal(sha(body),row.pin.sha256);
    return {path:row.path,bytes:body.length,sha256:sha(body)};
  });
  const reportPath=path.join(out,'world-xi-units.json'),stdout=path.join(out,'units.stdout'),stderr=path.join(out,'units.stderr');
  const rows=report(reportPath),runtime=logs(stdout,stderr),directory=path.join(out,'unit-reader-controls');
  fs.mkdirSync(directory);
  function probe(name,original,changed,marker,check){
    assert(!original.equals(changed),name+' changed physical copy');
    const file=path.join(directory,name),beforePin={bytes:original.length,sha256:sha(original)};
    fs.writeFileSync(file+'.before',original);fs.writeFileSync(file+'.changed',changed);
    assert(fs.readFileSync(file+'.changed').equals(changed));
    let primary=null;
    try{check(file+'.changed');}catch(error){
      primary={name:error.name,message:error.message,stack:error.stack,code:error.code??null,operator:error.operator??null};
      save('unit-reader-controls/'+name+'.primary.json',primary);
      assert(error instanceof assert.AssertionError,name+' native assertion');
      assert.equal(error.message.split('\n')[0],marker,name+' exact owned first assertion');
    }
    assert(primary,name+' guard refused');
    fs.writeFileSync(file+'.restored',original);
    assert(fs.readFileSync(file+'.restored').equals(original));
    check(file+'.restored');
    controls.push({name,changed:true,before:beforePin,changedPin:{bytes:changed.length,sha256:sha(changed)},restored:beforePin,fullByteInverse:true,ownedFirstAssertion:marker,healthyRestore:true,primary});
  }
  const originalReport=fs.readFileSync(reportPath),changedReport=read(reportPath);
  changedReport.testResults[0].assertionResults[0].fullName+=' CONTROL';
  probe('identity.json',originalReport,Buffer.from(JSON.stringify(changedReport)),'WORLD_XI_UNITS_IDENTITIES',report);
  const originalErr=fs.readFileSync(stderr);
  probe('unhandled.stderr',originalErr,Buffer.concat([originalErr,Buffer.from('\nUnhandledRejection: WORLD_XI_CONTROL\n')]),'WORLD_XI_UNITS_RUNTIME',file=>logs(stdout,file));
  probe('type.stderr',originalErr,Buffer.concat([originalErr,Buffer.from('\nTypeError: WORLD_XI_CONTROL\n')]),'WORLD_XI_UNITS_RUNTIME',file=>logs(stdout,file));
  report(reportPath);logs(stdout,stderr);
  save('world-xi-units-admission.json',{schemaVersion:1,status:'PASS',actualCases:rows,sourcePins,runtime,controls,actualFramework:'3.2.7',runtimeCounters:null,runtimeCounterCompleteness:'UNKNOWN',scope:'34 existing focused cases and three copied-reader negatives. No new App/browser or full-unit-suite credit.'});
  console.log('WORLD_XI_UNITS PASS: 34 existing cases, three changed refused and restored copied-reader controls');
}catch(error){
  save('world-xi-units-primary.json',{name:error.name,message:error.message,stack:error.stack,code:error.code??null});
  throw error;
}
