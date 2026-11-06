import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';

const out=process.env.GRADE_SAVE_CONTROL_OUT,reference=process.env.GRADE_SAVE_FIXED_PACKET;
assert(out&&path.isAbsolute(out)&&!fs.existsSync(out),'Fresh absolute GRADE_SAVE_CONTROL_OUT required');
assert(reference&&path.isAbsolute(reference)&&fs.statSync(reference).isDirectory(),'Absolute retained GRADE_SAVE_FIXED_PACKET required');
assert.equal(process.env.SIM_NETWORK,'offline');assert(process.env.SIM_OFFLINE_RECEIPT&&fs.existsSync(process.env.SIM_OFFLINE_RECEIPT));assert.equal(fs.statSync(process.env.SIM_OFFLINE_RECEIPT).size,0);
fs.mkdirSync(out,{recursive:true});
const hook='src/hooks/useGradeTransfer.ts',test='src/test/gradeTransferSaveShape.test.tsx';
const pins={
 [hook]:'0048c0b04375b5035988dce33ddaa4abba80b74e',[test]:'c2d3dc2ef4e9d873e7e4a66fdab1c20eda43d585',
 'docs/plans/2026-11-06-grade-transfer-save-shape.md':'c15361c0dade1ffa9205ee5ef487783ff36bc5f9',
 'src/pages/GradeTransfer.tsx':'518f865c38c043e08048b4270a644baf50c48ce1',
 'src/components/grade-transfer/GradeTransferBoard.tsx':'79d6c0a974bf0f8edb9914edd0ecdcf27eec5af8',
 'src/lib/fetchTransferGrades.ts':'c7e8db542217df61adc4022facb0f2f8ca62423c',
 'src/lib/fetchAllRows.ts':'16a6d21750405e7a647576ff513ed8ee11d5ba6b',
 'src/lib/dateUtils.ts':'12c9de0ed37b0797492f3e936bcba70bdc03d585',
 'src/hooks/useGameCompletion.ts':'b104822551fd5d9b1c5d6ddb14f01c79e5a662b2',
 'src/lib/restoredFinish.ts':'a7707c36eba160b36eb31713039329658eebe51a',
 'src/test/noDoubleRecord.test.tsx':'35f0b55a98dbc9437bdbf4da83c6f015b54fb174',
 'package.json':'2ff64986fb76ebc51b706f2fd24765768874008a','package-lock.json':'97d6f12a052f25f400462938c241789a083f0bfe',
};
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const blob=bytes=>createHash('sha1').update(Buffer.from('blob '+bytes.length+'\0')).update(bytes).digest('hex');
const json=file=>JSON.parse(fs.readFileSync(file));
const write=(file,value)=>fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');
const fixedHook=fs.readFileSync(hook),H=fixedHook.toString('utf8');for(const[file,want]of Object.entries(pins))assert.equal(blob(fs.readFileSync(file)),want,file);
function once(text,from,to,label){assert.equal(text.split(from).length-1,1,label+' unique exact anchor');assert.notEqual(from,to,label+' physical edit');return text.replace(from,to);}
const originalBlock="    if (raw) return JSON.parse(raw);";
const fixedBlock="    if (raw) {\n      const parsed: unknown = JSON.parse(raw);\n      if (!parsed || typeof parsed !== 'object') return null;\n      const { grades, index } = parsed as Record<string, unknown>;\n      if (!Array.isArray(grades) ||\n        !grades.every(g => g === null || GRADES.includes(g)) ||\n        typeof index !== 'number' || !Number.isInteger(index) || index < 0) return null;\n      return { grades, index };\n    }";
const oldHook=fs.readFileSync(path.join(reference,'original-packet','original-hook.ts'));assert.equal(blob(oldHook),'5e677e844f8af33de27c206673fcf66849ad5930');assert(Buffer.from(once(H,fixedBlock,originalBlock,'complete loadSaved inverse')).equals(oldHook),'Entire original Hook differs only by the fixed loadSaved block');
const originalBytes=fs.readFileSync(path.join(reference,'original-packet','raw.json')),fixedBytes=fs.readFileSync(path.join(reference,'raw.json'));assert.equal(hash(originalBytes),'acd8e0e981dd522e77084b3d0eb20ba42cd7749afdf9363809bd562e906207ad');
assert.equal(fixedBytes.length,683385);assert.equal(hash(fixedBytes),'56c15cef01a71f0bf4a4424f57df3c3f2037984cdceec4b0410714a5b458d716');
const original=JSON.parse(originalBytes),fixed=JSON.parse(fixedBytes),fixedProof=json(path.join(reference,'fixed-admission.json'));assert.equal(fixedProof.status,'fixed-eleven-passed-six-whole-cases-held');assert.equal(fixedBytes.length,fixedProof.rawBytes);assert.equal(hash(fixedBytes),fixedProof.rawSHA256);
const keys=['gradesObject','indexNegative','indexFraction','indexString','gradeItem','missing','corrupt','short','partial','revealed','finished'],preserves=keys.slice(5);
function report(file,expectedFailed,arm){
 const value=json(file),rows=value.testResults.flatMap(s=>s.assertionResults);assert.equal(value.numTotalTests,11,arm+' total');assert.equal(value.numPassedTests,11-expectedFailed.length);assert.equal(value.numFailedTests,expectedFailed.length);assert.equal(value.numPendingTests,0);assert.equal(rows.length,11);
 for(const field of['numRuntimeErrorTestSuites','numUnhandledErrors'])if(Object.hasOwn(value,field))assert.equal(value[field],0,arm+' '+field);
 assert(rows.every(row=>row.status==='passed'||row.status==='failed'));assert.deepEqual(rows.map(row=>row.title).sort(),keys.map(key=>original.cases[key].title).sort());
 const failed=rows.filter(row=>row.status==='failed'),passed=rows.filter(row=>row.status==='passed');assert.deepEqual(failed.map(row=>row.title).sort(),expectedFailed.map(key=>original.cases[key].title).sort(),arm+' exact named business failures');assert(passed.every(row=>row.failureMessages.length===0));
 for(const row of failed){assert(row.failureMessages.length>0);for(const message of row.failureMessages)assert(message.replace(/\x1b\[[0-9;]*m/g,'').startsWith('AssertionError: '+row.title.split(' ')[0]+' '),arm+' actual named AssertionError, not setup/runtime failure');}
 return{value,rows,failed,passed};
}
report(path.join(reference,'original-packet','owned.json'),keys.slice(0,5),'reference original');report(path.join(reference,'owned.json'),[],'reference fixed');
assert.deepEqual({...fixed,cases:null},{...original,cases:null},'Reference RAW headers/catalog identical');assert.equal(fixed.version,1);assert.equal(fixed.unitClock,'2026-11-06T12:00:00Z');assert.equal(fixed.fictionalPool.length,5);assert(fixed.fictionalPool.every(tc=>tc.actualGrade==='A'));assert.equal(new Set(fixed.fictionalPool.map(tc=>tc.playerName)).size,5);
for(const raw of[original,fixed]){assert.deepEqual(Object.keys(raw.cases).sort(),[...keys].sort());assert.equal(Object.values(raw.cases).reduce((sum,c)=>sum+c.frames.length,0),47);}
for(const key of preserves)assert.deepEqual(fixed.cases[key],original.cases[key],'Whole reference preservation '+key);
const files=execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0').filter(Boolean),index=execFileSync('git',['ls-files','-s'],{encoding:'utf8'}),scan=()=>files.map(file=>{const bytes=fs.readFileSync(file);return{file,bytes:bytes.length,sha256:hash(bytes)};});
const before=scan();write(path.join(out,'tracked-before.json'),before);fs.writeFileSync(path.join(out,'index-before.txt'),index);
const installed=()=>{const lock=json('package-lock.json'),rows=Object.keys(lock.packages).filter(file=>file.startsWith('node_modules/')&&fs.existsSync(file+'/package.json')).map(file=>[file,json(file+'/package.json').version]);assert.equal(rows.length,521);for(const[file,version]of rows)assert.equal(version,lock.packages[file].version,file);return rows;};
const versions=installed();write(path.join(out,'installed-before.json'),versions);
const condition="      if (!Array.isArray(grades) ||\n        !grades.every(g => g === null || GRADES.includes(g)) ||\n        typeof index !== 'number' || !Number.isInteger(index) || index < 0) return null;";
const change=(replacement,label)=>()=>once(H,fixedBlock,once(fixedBlock,condition,replacement,label),'only loadSaved guard changed');
const arms=[
 {name:'fixed',failed:[],make:()=>H},
 {name:'original',failed:keys.slice(0,5),make:()=>oldHook.toString('utf8')},
 {name:'omit-grades-validation',failed:['gradesObject','gradeItem'],make:change("      if (typeof index !== 'number' || !Number.isInteger(index) || index < 0) return null;",'whole grades validation')},
 {name:'omit-grade-items',failed:['gradeItem'],make:change("      if (!Array.isArray(grades) ||\n        typeof index !== 'number' || !Number.isInteger(index) || index < 0) return null;",'grade item predicate')},
 {name:'omit-numeric-integer-pair',failed:['indexFraction','indexString'],make:change("      if (!Array.isArray(grades) ||\n        !grades.every(g => g === null || GRADES.includes(g)) ||\n        index < 0) return null;",'numeric and integer pair')},
 {name:'omit-nonnegative-index',failed:['indexNegative'],make:change("      if (!Array.isArray(grades) ||\n        !grades.every(g => g === null || GRADES.includes(g)) ||\n        typeof index !== 'number' || !Number.isInteger(index)) return null;",'nonnegative index')},
 {name:'restored',failed:[],make:()=>H},
];
assert.equal(arms.length,7);assert.equal(arms.reduce((sum,arm)=>sum+arm.failed.length,0),11);for(const arm of arms)assert.equal(Buffer.from(arm.make()).equals(fixedHook),arm.name==='fixed'||arm.name==='restored',arm.name+' changes actual physical source');
const summaries=[];let error=null;
try{
 for(const arm of arms){
  const dir=path.join(out,arm.name);fs.mkdirSync(dir);const body=Buffer.from(arm.make()),changed=body.equals(fixedHook)?[]:[hook];assert.equal(changed.length,arm.name==='fixed'||arm.name==='restored'?0:1);fs.writeFileSync(hook,body);fs.writeFileSync(path.join(dir,'working-hook.ts'),body);
  const receipt={name:arm.name,changed,hookBlob:blob(body),hookSha256:hash(body),predictedFailureIds:arm.failed.map(key=>original.cases[key].title.split(' ')[0])};write(path.join(dir,'source.json'),receipt);
  const expected=before.map(row=>row.file===hook?{file:hook,bytes:body.length,sha256:hash(body)}:row);assert.deepEqual(scan(),expected,arm.name+' tracked bodies before child');assert.equal(execFileSync('git',['ls-files','-s'],{encoding:'utf8'}),index,arm.name+' index before child');
  const logFile=path.join(dir,'unit.log'),fd=fs.openSync(logFile,'w'),rawFile=path.join(dir,'raw.json'),reportFile=path.join(dir,'owned.json');let child;
  try{child=spawnSync(process.execPath,['node_modules/vitest/vitest.mjs','run',test,'--maxWorkers=1','--minWorkers=1','--reporter=default','--reporter=json','--outputFile='+reportFile],{cwd:process.cwd(),env:{...process.env,GRADE_TRANSFER_SAVE_RAW:rawFile},stdio:['ignore',fd,fd],timeout:180000});}finally{fs.closeSync(fd);}
  write(path.join(dir,'child.json'),{status:child.status,signal:child.signal,error:child.error?String(child.error):null});assert.equal(child.error,undefined,arm.name+' launch');assert.equal(child.signal,null,arm.name+' signal');assert.equal(child.status,arm.failed.length?1:0,arm.name+' actual child exit');
  const result=report(reportFile,arm.failed,arm.name),log=fs.readFileSync(logFile,'utf8');assert(!/Unhandled Errors|Unhandled Rejection|Uncaught Exception|Failed to resolve import|No test files found|SyntaxError/.test(log),arm.name+' no setup/runtime banner');
  const bytes=fs.readFileSync(rawFile),raw=JSON.parse(bytes);assert.deepEqual({...raw,cases:null},{...fixed,cases:null},arm.name+' full RAW header/catalog');assert.deepEqual(Object.keys(raw.cases).sort(),[...keys].sort());let frames=0;const labels={};
  for(const key of keys){const value=raw.cases[key];assert.equal(value.title,original.cases[key].title);labels[key]=value.frames.map(frame=>frame.label);assert.deepEqual(labels[key],fixed.cases[key].frames.map(frame=>frame.label),arm.name+' '+key+' every physical outcome captured before assertions');assert.equal(labels[key].at(-1),'teardown-settled');
   for(const frame of value.frames){frames++;assert.equal(frame.state.rounds.length,5);assert.equal(frame.state.loading,false);assert.equal(frame.storage['grade-transfer-unrelated'],'held');for(const field of['draws','transport','operationErrors','boundaries','completions'])assert(Array.isArray(frame[field]));assert(frame.draws.every(draw=>draw===0));assert(frame.page&&Array.isArray(frame.page.gradeButtons)&&Array.isArray(frame.page.transferHeadings));for(const request of frame.transport){assert(['transfer_grade_pool','transfer_grade_votes'].includes(request.table));assert(Array.isArray(request.steps));assert.equal(request.response.error,null);}}
   assert.deepEqual(value,arm.failed.includes(key)?original.cases[key]:fixed.cases[key],arm.name+' whole '+(arm.failed.includes(key)?'original harmed ':'fixed unaffected ')+key);
  }
  assert.equal(frames,47);for(const key of preserves){assert(result.rows.find(row=>row.title===fixed.cases[key].title).status==='passed');assert.deepEqual(raw.cases[key],original.cases[key],arm.name+' whole original preservation '+key);}
  if(arm.name==='original')assert(bytes.equals(originalBytes),'Full original RAW exactly equals admitted original');if(arm.name==='fixed'||arm.name==='restored')assert(bytes.equals(fixedBytes),arm.name+' full RAW exactly equals admitted fixed');
  assert.deepEqual(scan(),expected,arm.name+' tracked bodies after child');assert.equal(execFileSync('git',['ls-files','-s'],{encoding:'utf8'}),index,arm.name+' index after child');assert.deepEqual(installed(),versions);assert.equal(fs.statSync(process.env.SIM_OFFLINE_RECEIPT).size,0);
  const summary={status:'passed',...receipt,actualRows:11,actualFailed:result.failed.map(row=>row.title),actualPassed:result.passed.map(row=>row.title),rawCases:11,rawFrames:frames,labels,rawBytes:bytes.length,rawSha256:hash(bytes),wholeHarmedCases:arm.failed,wholeUnaffectedCases:keys.filter(key=>!arm.failed.includes(key)),wholePreservationCases:preserves,otherTrackedBodiesHeld:true,indexHeld:true,installed521Held:true,offlineHeld:true,runtimeFields:Object.fromEntries(['numRuntimeErrorTestSuites','numUnhandledErrors'].map(key=>[key,{present:Object.hasOwn(result.value,key),value:result.value[key]??null}]))};
  write(path.join(dir,'admission.json'),summary);summaries.push(summary);console.log('PASS '+arm.name+' actual '+result.failed.length+' named reds, '+result.passed.length+' passes,47 complete RAW frames');fs.writeFileSync(hook,fixedHook);assert.deepEqual(scan(),before,arm.name+' exact fixed bodies restored between arms');
 }
}catch(cause){error=cause;throw cause;}finally{
 fs.writeFileSync(hook,fixedHook);const after=scan();write(path.join(out,'tracked-after.json'),after);assert.deepEqual(after,before,'Every tracked physical body restored exactly');assert.equal(blob(fs.readFileSync(hook)),pins[hook]);const finalIndex=execFileSync('git',['ls-files','-s'],{encoding:'utf8'});fs.writeFileSync(path.join(out,'index-after.txt'),finalIndex);assert.equal(finalIndex,index,'Exact index restored');const finalVersions=installed();write(path.join(out,'installed-after.json'),finalVersions);assert.deepEqual(finalVersions,versions);assert.equal(fs.statSync(process.env.SIM_OFFLINE_RECEIPT).size,0);
 write(path.join(out,'summary.json'),{status:error?'failed':'passed',error:error?String(error):null,pins,arms:summaries,completedArms:summaries.length,actualRows:summaries.reduce((sum,arm)=>sum+arm.actualRows,0),actualNamedBusinessReds:summaries.reduce((sum,arm)=>sum+arm.actualFailed.length,0),rawFrames:summaries.reduce((sum,arm)=>sum+arm.rawFrames,0),originalRawBytes:originalBytes.length,originalRawSha256:hash(originalBytes),fixedRawBytes:fixedBytes.length,fixedRawSha256:hash(fixedBytes),allTrackedRestored:true,indexHeld:true,installed521Held:true,offlineHeld:true,limits:'Source-only causal unit controls. Whole failed cases equal the qualified original harms, every unaffected whole case equals the qualified fixed body, and all six preservation vectors hold in every arm. Dropping Array.isArray alone or typeof alone is not used as an expected-failure control because the remaining checks still reject those inputs. No3-existing-case rerun,build,native,full-suite or live backend credit.'});
}
assert.equal(summaries.length,7);assert.equal(summaries.reduce((sum,arm)=>sum+arm.actualRows,0),77);assert.equal(summaries.reduce((sum,arm)=>sum+arm.actualFailed.length,0),11);assert.equal(summaries.reduce((sum,arm)=>sum+arm.rawFrames,0),329);console.log('PASS7 arms,77 actual rows,11 named business reds,329 RAW frames; all42 whole preservation vectors and original/fixed/restored RAW held');
