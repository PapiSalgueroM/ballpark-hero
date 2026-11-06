import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';

const out=process.env.ALPHABET_DEADLINE_CONTROL_OUT,reference=process.env.ALPHABET_FIXED_REFERENCE;
assert(out&&out.startsWith('/')&&!out.split('/').includes('..')&&!fs.existsSync(out),'Fresh absolute ALPHABET_DEADLINE_CONTROL_OUT required');
assert(reference&&reference.startsWith('/')&&fs.statSync(reference).isDirectory(),'Retained absolute ALPHABET_FIXED_REFERENCE required');
const expectedFixedSHA=process.env.ALPHABET_FIXED_RAW_SHA256,expectedFixedBytes=Number(process.env.ALPHABET_FIXED_RAW_BYTES);
assert.match(expectedFixedSHA||'',/^[a-f0-9]{64}$/,'Completed fixed RAW SHA256 binding required');
assert(Number.isSafeInteger(expectedFixedBytes)&&expectedFixedBytes>0,'Completed fixed RAW byte binding required');
assert.equal(process.env.SIM_NETWORK,'offline');
const offline=process.env.SIM_OFFLINE_RECEIPT;assert(offline&&fs.statSync(offline).isFile());assert.equal(fs.statSync(offline).size,0);
fs.mkdirSync(out,{recursive:true});
const page='src/pages/AlphabetSprint.tsx',test='src/test/alphabetSprintDeadline.test.tsx';
const pins={
 [page]:'f6a2b471abdf3ec5b21daa928348e11a3232019b',[test]:'e0904ccdeb6c068e73b305fdf6a3b50822a32f41',
 'src/lib/alphabetSprint.ts':'d3f58b309cbaa9b3b9f2e263774b16b99ecf7347',
 'src/App.tsx':'8bfedf7aaa1d076e0f0c8e2216c7e46632cd8a33','src/data/gameRegistry.ts':'f560b40a74d1468ac72dfde4ee6fec6635a9a255',
 'public/alphabet-sprint/index.html':'6d95820a7796a416464ed3d579b6b1f535287634',
 'package.json':'2ff64986fb76ebc51b706f2fd24765768874008a','package-lock.json':'97d6f12a052f25f400462938c241789a083f0bfe',
};
const sha=bytes=>createHash('sha256').update(bytes).digest('hex'),blob=bytes=>createHash('sha1').update(Buffer.from('blob '+bytes.length+'\0')).update(bytes).digest('hex');
const json=file=>JSON.parse(fs.readFileSync(file)),write=(file,value)=>fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');
for(const[file,want]of Object.entries(pins))assert.equal(blob(fs.readFileSync(file)),want,file+' actual physical body');
const fixedPage=fs.readFileSync(page),H=fixedPage.toString('utf8');
function once(text,from,to,name){assert.equal(text.split(from).length-1,1,name+' unique complete source anchor');assert.notEqual(from,to,name+' replacement changes source');const changed=text.replace(from,()=>to);assert.notEqual(changed,text,name+' actual physical change');return changed;}
const edits=[
 {name:'deadline ref',old:'  const inputRef = useRef<HTMLInputElement>(null);\n',fixed:'  const inputRef = useRef<HTMLInputElement>(null);\n  const deadlineRef = useRef(0);\n'},
 {name:'elapsed countdown',old:'      setTimeLeft(t => (t > 0 ? t - 1 : 0));',fixed:'      setTimeLeft(Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000)));'},
 {name:'start deadline',old:'    if (!first) return;\n    setModeId(id);',fixed:'    if (!first) return;\n    deadlineRef.current = Date.now() + modeById(id).seconds * 1000;\n    setModeId(id);'},
 {name:'Skip entry',old:"  const skip = () => {\n    if (phase !== 'running' || !letter || timeLeft <= 0) return;\n    setStreak(0);",fixed:"  const skip = () => {\n    if (phase !== 'running' || !letter || timeLeft <= 0) return;\n    if (Date.now() >= deadlineRef.current) {\n      setTimeLeft(0);\n      return;\n    }\n    setStreak(0);"},
 {name:'submit entry',old:"  const submit = () => {\n    if (phase !== 'running' || !letter || timeLeft <= 0) return;\n    if (input.trim().length < 2) return;",fixed:"  const submit = () => {\n    if (phase !== 'running' || !letter || timeLeft <= 0) return;\n    if (Date.now() >= deadlineRef.current) {\n      setTimeLeft(0);\n      return;\n    }\n    if (input.trim().length < 2) return;"},
];
let old=H;for(const edit of [...edits].reverse())old=once(old,edit.fixed,edit.old,'original inverse '+edit.name);
const originalPage=Buffer.from(old);assert.equal(blob(originalPage),'f8b98f42aeaca4d6399f0eebcf68dfbc03a2655e','All five inverse edits reconstruct exact original Page');
let reapplied=old;for(const edit of edits)reapplied=once(reapplied,edit.old,edit.fixed,'fixed forward '+edit.name);assert(Buffer.from(reapplied).equals(fixedPage),'Exact forward inverse reconstructs fixed physical body');
const originalBytes=fs.readFileSync(reference+'/original-packet/raw.json'),fixedBytes=fs.readFileSync(reference+'/raw.json');
assert.equal(originalBytes.length,18914298);assert.equal(sha(originalBytes),'72f5107496128c4a943e48fb382c728f6d6c45c0556a450798d01f9c51f94b9d');
assert.equal(fixedBytes.length,expectedFixedBytes);assert.equal(sha(fixedBytes),expectedFixedSHA);
const original=JSON.parse(originalBytes),fixed=JSON.parse(fixedBytes),proof=json(reference+'/fixed-admission.json');
assert.equal(proof.status,'fixed-six-deadline-passed-two-whole-preserves');assert.equal(proof.actualCases,6);assert.equal(proof.actualPasses,6);assert.equal(proof.actualFailures,0);assert.equal(proof.source.page,pins[page]);assert.equal(proof.rawFrames,69);assert.equal(proof.rawBytes,fixedBytes.length);assert.equal(proof.rawSHA256,sha(fixedBytes));
const keys=['ordinary','finish','lateSubmit','lateSkip','delayedTimeout','elapsedTick'],preserves=keys.slice(0,2),harms=keys.slice(2);
const ids={ordinary:'ALPHABET_PREDEADLINE_PRESERVE',finish:'ALPHABET_FINISH_REPLAY_PRESERVE',lateSubmit:'ALPHABET_LATE_SUBMIT',lateSkip:'ALPHABET_LATE_SKIP',delayedTimeout:'ALPHABET_DELAYED_TIMEOUT',elapsedTick:'ALPHABET_ELAPSED_TICK'};
const labels=Object.fromEntries(keys.map(key=>[key,original.cases[key].frames.map(frame=>frame.label)]));
assert.deepEqual(Object.values(labels).map(list=>list.length),[14,16,10,10,9,10]);
function report(file,failedKeys,name){
 const value=json(file),rows=value.testResults.flatMap(suite=>suite.assertionResults);assert.equal(value.numTotalTests,6);assert.equal(value.numPassedTests,6-failedKeys.length);assert.equal(value.numFailedTests,failedKeys.length);assert.equal(value.numPendingTests,0);assert.equal(rows.length,6);
 for(const field of['numRuntimeErrorTestSuites','numUnhandledErrors'])if(Object.hasOwn(value,field))assert.equal(value[field],0,name+' '+field);
 assert(rows.every(row=>row.status==='passed'||row.status==='failed'));assert.deepEqual(rows.map(row=>row.title).sort(),keys.map(key=>original.cases[key].title).sort(),name+' exact six actual titles');
 const failed=rows.filter(row=>row.status==='failed'),passed=rows.filter(row=>row.status==='passed');assert.deepEqual(failed.map(row=>row.title.split(' ')[0]).sort(),failedKeys.map(key=>ids[key]).sort(),name+' exact failed business IDs');
 for(const row of passed)assert(Array.isArray(row.failureMessages)&&row.failureMessages.length===0,name+' no hidden passed-row failure');
 for(const row of failed){assert(row.failureMessages.length>0);for(const message of row.failureMessages)assert(message.replace(/\x1b\[[0-9;]*m/g,'').startsWith('AssertionError: '+row.title.split(' ')[0]+' '),name+' actual named business AssertionError');}
 return{value,rows,failed,passed};
}
const badBanner=/Unhandled Errors|Unhandled Rejection|Uncaught Exception|Failed to resolve import|No test files found|SyntaxError/;
report(reference+'/original-packet/owned.json',harms,'qualified original');report(reference+'/owned.json',[],'qualified fixed');
assert(!badBanner.test(fs.readFileSync(reference+'/original-packet/owned.log','utf8')));assert(!badBanner.test(fs.readFileSync(reference+'/owned.log','utf8')));
assert.deepEqual({...fixed,cases:null},{...original,cases:null},'Entire RAW header and explicit fictional fixture held');assert.equal(fixed.version,1);assert.equal(fixed.unitClock,'2026-11-06T12:00:00Z');assert.equal(fixed.fixtureRows.length,50);
for(const key of preserves)assert.deepEqual(fixed.cases[key],original.cases[key],'Complete fixed/original preservation object '+key);
const query=[{method:'select',args:['player_name, nationality, club, market_value_usd']},{method:'eq',args:['year',2026]},{method:'gt',args:['market_value_usd',0]},{method:'order',args:['player_name',{ascending:true}]},{method:'range',args:[0,999]}];
function validateRaw(raw,name){
 assert.deepEqual({...raw,cases:null},{...original,cases:null},name+' entire RAW header/fixture');assert.deepEqual(Object.keys(raw.cases),keys,name+' exact ordered cases');let frames=0;
 for(const key of keys){const value=raw.cases[key];assert.equal(value.title,original.cases[key].title);assert.equal(value.title.split(' ')[0],ids[key]);assert.deepEqual(value.frames.map(frame=>frame.label),labels[key],name+' '+key+' all physical labels');const startup=original.cases[key].frames[0].draws;
  for(const frame of value.frames){frames++;assert(frame.page&&frame.clock&&frame.focus&&frame.library);assert.equal(frame.storage['alphabet-unrelated'],'held');assert(Number.isFinite(frame.clock.now));assert.equal(new Date(frame.clock.now).toISOString(),frame.clock.iso);assert(Number.isSafeInteger(frame.clock.timers)&&frame.clock.timers>=0);
   for(const array of[frame.draws,frame.usedAtLastDraw,frame.library.draws,frame.library.resolutions,frame.library.points,frame.transport,frame.unknownTransport,frame.completions,frame.storageWrites,frame.clock.operations,frame.clock.intervals,frame.clock.clears])assert(Array.isArray(array),name+' complete physical arrays');assert.deepEqual(frame.unknownTransport,[]);
   if(frame.label==='teardown-after'){assert.equal(frame.page.phase,'unmounted');assert.equal(frame.page.html,null);assert.equal(frame.clock.timers,0);}else assert(typeof frame.page.html==='string'&&frame.page.html.length>0,name+' full physical Page HTML');
   for(const draw of frame.library.draws){assert.equal(draw.pool.length,50);assert.deepEqual(draw.pool.map(player=>player.name),original.fixtureRows.map(row=>row.player_name));assert(Array.isArray(draw.used)&&Array.isArray(draw.playable));assert(draw.result===null||draw.result==='A'||draw.result==='B');}
   const actualRNGDraws=frame.library.draws.filter(draw=>draw.result!==null).length;assert.deepEqual(frame.draws,[...startup,...Array(actualRNGDraws).fill(0)],name+' exact retained startup tape plus actual nonempty draw RNG, no normalization');
   assert.equal(frame.transport.length,1);for(const wire of frame.transport){assert.equal(wire.table,'player_market_values_dedup');assert.deepEqual(wire.calls,query);assert(Number.isFinite(wire.startedAt)&&Number.isFinite(wire.settledAt)&&wire.startedAt<=wire.settledAt&&wire.settledAt<=frame.clock.now);assert.equal(wire.response.error,null);assert.deepEqual(wire.response.data,original.fixtureRows);}
   for(const completion of frame.completions){assert.equal(completion[0],'/alphabet-sprint');assert(Number.isSafeInteger(completion[1])&&completion[1]>=0);assert.equal(completion[2],'Fixture Manager');}
  }
  assert.deepEqual(value.frames[value.frames.length-2].label,'teardown-before');assert.equal(value.frames[value.frames.length-1].label,'teardown-after');
 }
 assert.equal(frames,69,name+' complete69 frames');return frames;
}
validateRaw(original,'qualified original');validateRaw(fixed,'qualified fixed');
const files=execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0').filter(Boolean),index=execFileSync('git',['ls-files','-s'],{encoding:'utf8'});
const scan=()=>files.map(file=>{const bytes=fs.readFileSync(file);return{file,mode:fs.statSync(file).mode&0o777,bytes:bytes.length,sha256:sha(bytes)};}),locks=()=>['package.json','package-lock.json'].map(file=>({file,sha256:sha(fs.readFileSync(file))}));
const installed=()=>{const lock=json('package-lock.json'),rows=Object.keys(lock.packages).filter(file=>file.startsWith('node_modules/')&&fs.existsSync(file+'/package.json')).map(file=>[file,json(file+'/package.json').version]);assert.equal(rows.length,521);for(const[file,version]of rows)assert.equal(version,lock.packages[file].version,file);return rows;};
execFileSync('git',['diff','--exit-code','HEAD','--','.']);const before=scan(),beforeLocks=locks(),versions=installed();
write(out+'/tracked-before.json',before);fs.writeFileSync(out+'/source-before.txt',index);write(out+'/locks-before.json',beforeLocks);write(out+'/installed-before.json',versions);
function holds(expected,name){assert.deepEqual(scan(),expected,name+' every actual tracked body/mode');assert.equal(execFileSync('git',['ls-files','-s'],{encoding:'utf8'}),index,name+' index');assert.deepEqual(locks(),beforeLocks,name+' locks');assert.deepEqual(installed(),versions,name+'521locked versions');assert.equal(fs.statSync(offline).size,0,name+' zero-byte offline receipt');}
const arms=[
 {name:'fixed',failed:[],make:()=>H},
 {name:'original',failed:harms,make:()=>old},
 {name:'omit-countdown',failed:['delayedTimeout','elapsedTick'],make:()=>once(H,edits[1].fixed,edits[1].old,'one countdown omission')},
 {name:'omit-submit',failed:['lateSubmit'],make:()=>once(H,edits[4].fixed,edits[4].old,'one submit entry omission')},
 {name:'omit-skip',failed:['lateSkip'],make:()=>once(H,edits[3].fixed,edits[3].old,'one Skip entry omission')},
 {name:'restored',failed:[],make:()=>H},
];
for(const arm of arms){const body=Buffer.from(arm.make());assert.equal(body.equals(fixedPage),arm.name==='fixed'||arm.name==='restored',arm.name+' actual source differs iff controlled fault');if(arm.name==='original')assert.equal(blob(body),'f8b98f42aeaca4d6399f0eebcf68dfbc03a2655e');}
const summaries=[];let failure=null,restorationFailure=null,restored=false;
const frameAt=(raw,key,label)=>{const found=raw.cases[key].frames.filter(frame=>frame.label===label);assert.equal(found.length,1,key+' unique physical frame '+label);return found[0];};
function faultOutcome(raw,name){
 if(name==='omit-countdown'){
  const late=frameAt(raw,'delayedTimeout','delayed-timeout-one-callback'),elapsed=frameAt(raw,'elapsedTick','elapsed-tick-one-callback'),deadline=frameAt(raw,'elapsedTick','elapsed-tick-declared-deadline');
  assert.deepEqual([late.page.phase,late.page.seconds,late.page.score,late.page.namedCount,late.completions],['running',19,6,5,[]]);assert.equal(elapsed.page.seconds,44);assert.deepEqual([deadline.page.phase,deadline.page.seconds,deadline.completions],['running',10,[]]);
  return{firstExpiredCallback:{phase:late.page.phase,seconds:late.page.seconds,completions:late.completions.length},elevenElapsedSecondsDisplay:elapsed.page.seconds,nominalDeadline:{phase:deadline.page.phase,seconds:deadline.page.seconds}};
 }
 if(name==='omit-submit'){
  const earned=frameAt(raw,'lateSubmit','late-submit-earned-five'),attempt=frameAt(raw,'lateSubmit','late-submit-attempt'),done=frameAt(raw,'lateSubmit','late-submit-eventual-result');
  assert.deepEqual([earned.page.score,earned.page.namedCount,attempt.page.score,attempt.page.namedCount,attempt.usedAtLastDraw.length,attempt.library.draws.length-earned.library.draws.length],[6,5,7,6,6,1]);assert.equal(JSON.parse(done.storage.alphabet_sprint_best_v1).insane,7);assert.deepEqual(done.completions,[['/alphabet-sprint',7,'Fixture Manager']]);
  return{earnedScore:earned.page.score,lateScore:attempt.page.score,lateNamed:attempt.page.namedCount,extraActualDraws:1,eventualBest:7,eventualCompletions:done.completions};
 }
 if(name==='omit-skip'){
  const earned=frameAt(raw,'lateSkip','late-skip-earned-five'),attempt=frameAt(raw,'lateSkip','late-skip-attempt');assert.deepEqual([attempt.library.draws.length-earned.library.draws.length,attempt.page.streak,attempt.page.lastGain,attempt.page.input,attempt.page.letter,attempt.page.score,attempt.page.namedCount],[1,0,null,'','A',6,5]);
  return{extraActualDraws:1,streak:attempt.page.streak,input:attempt.page.input,target:attempt.page.letter,score:attempt.page.score,named:attempt.page.namedCount};
 }
 return null;
}
fs.writeFileSync(out+'/fixed-page-before.tsx',fixedPage);
try{
 for(const arm of arms){
  const dir=out+'/'+arm.name;fs.mkdirSync(dir);const body=Buffer.from(arm.make()),different=!body.equals(fixedPage),expected=before.map(row=>row.file===page?{...row,bytes:body.length,sha256:sha(body)}:row);
  fs.writeFileSync(page,body);fs.writeFileSync(dir+'/working-page.tsx',body);
  const source={name:arm.name,changedPhysicalPaths:different?[page]:[],physicalPageBlob:blob(body),physicalPageBytes:body.length,physicalPageSHA256:sha(body),indexPageBlob:pins[page],indexIntentionallyHeld:true,expectedFailedBusinessIds:arm.failed.map(key=>ids[key])};write(dir+'/source.json',source);
  holds(expected,arm.name+' before child');assert.deepEqual(execFileSync('git',['diff','--name-only','HEAD','--','.'],{encoding:'utf8'}).trim().split('\n').filter(Boolean),different?[page]:[],arm.name+' only physical Page differs from fixed index');write(dir+'/tracked-before.json',scan());fs.writeFileSync(dir+'/source-before.txt',execFileSync('git',['ls-files','-s'],{encoding:'utf8'}));
  const rawFile=dir+'/raw.json',reportFile=dir+'/owned.json',logFile=dir+'/owned.log',fd=fs.openSync(logFile,'wx');let child;
  try{child=spawnSync(process.execPath,['node_modules/vitest/vitest.mjs','run',test,'--reporter=json','--outputFile='+reportFile],{cwd:process.cwd(),env:{...process.env,ALPHABET_DEADLINE_RAW:rawFile},stdio:['ignore',fd,fd],timeout:240000});}finally{fs.closeSync(fd);}
  write(dir+'/child.json',{status:child.status,signal:child.signal,error:child.error?String(child.error):null});assert.equal(child.error,undefined,arm.name+' fresh child launch');assert.equal(child.signal,null,arm.name+' no child termination');assert.equal(child.status,arm.failed.length?1:0,arm.name+' actual child exit');
  const actual=report(reportFile,arm.failed,arm.name),log=fs.readFileSync(logFile,'utf8');assert(!badBanner.test(log),arm.name+' no import/setup/runtime banner');
  const bytes=fs.readFileSync(rawFile),raw=JSON.parse(bytes),frames=validateRaw(raw,arm.name);
  for(const key of preserves){assert.equal(actual.rows.find(row=>row.title===original.cases[key].title).status,'passed');assert.deepEqual(raw.cases[key],original.cases[key],arm.name+' entire original preservation case '+key);}
  if(arm.name==='original')assert(bytes.equals(originalBytes),'Entire actual original RAW byte-equals admitted original');
  if(arm.name==='fixed'||arm.name==='restored')assert(bytes.equals(fixedBytes),arm.name+' entire actual RAW byte-equals completed qualified fixed');
  else assert(!bytes.equals(fixedBytes),arm.name+' fault physically changes actual RAW outcomes');
  const observations=faultOutcome(raw,arm.name);
  holds(expected,arm.name+' after child');write(dir+'/tracked-after.json',scan());fs.writeFileSync(dir+'/source-after.txt',execFileSync('git',['ls-files','-s'],{encoding:'utf8'}));write(dir+'/installed-after.json',installed());write(dir+'/locks-after.json',locks());
  const summary={status:'passed',...source,actualRows:actual.rows.length,actualFailed:actual.failed.map(row=>row.title),actualPassed:actual.passed.map(row=>row.title),rawCases:keys.length,rawFrames:frames,rawBytes:bytes.length,rawSHA256:sha(bytes),wholePreservationCases:preserves,faultObservations:observations,otherPhysicalTrackedBodiesHeld:true,indexHeld:true,locksHeld:true,installed521Held:true,offlineBytes:0,runtimeFields:Object.fromEntries(['numRuntimeErrorTestSuites','numUnhandledErrors'].map(field=>[field,{present:Object.hasOwn(actual.value,field),value:actual.value[field]??null}]))};
  write(dir+'/admission.json',summary);summaries.push(summary);console.log('PASS '+arm.name+': actual'+actual.failed.length+' named business reds/'+actual.passed.length+' passes/'+frames+' full RAW frames');
  fs.writeFileSync(page,fixedPage);holds(before,arm.name+' exact fixed source restored between arms');
 }
 assert.equal(summaries.length,6);assert.deepEqual(summaries.map(arm=>arm.actualFailed.length),[0,4,2,1,1,0]);assert.equal(summaries.reduce((count,arm)=>count+arm.actualRows,0),36);assert.equal(summaries.reduce((count,arm)=>count+arm.actualFailed.length,0),8);assert.equal(summaries.reduce((count,arm)=>count+arm.actualPassed.length,0),28);assert.equal(summaries.reduce((count,arm)=>count+arm.rawFrames,0),414);assert.equal(summaries.length*preserves.length,12);
}catch(cause){failure=cause;}finally{
 try{
  fs.writeFileSync(page,fixedPage);holds(before,'final restoration');assert.equal(blob(fs.readFileSync(page)),pins[page]);execFileSync('git',['diff','--exit-code','HEAD','--','.']);
  write(out+'/tracked-after.json',scan());fs.writeFileSync(out+'/source-after.txt',execFileSync('git',['ls-files','-s'],{encoding:'utf8'}));write(out+'/locks-after.json',locks());write(out+'/installed-after.json',installed());fs.writeFileSync(out+'/fixed-page-after.tsx',fs.readFileSync(page));restored=true;
 }catch(cause){restorationFailure=cause;}
 write(out+'/summary.json',{status:failure||restorationFailure?'failed':'passed',error:failure?String(failure):null,restorationError:restorationFailure?String(restorationFailure):null,pins,arms:summaries,completedArms:summaries.length,actualRows:summaries.reduce((count,arm)=>count+arm.actualRows,0),actualNamedBusinessReds:summaries.reduce((count,arm)=>count+arm.actualFailed.length,0),actualPasses:summaries.reduce((count,arm)=>count+arm.actualPassed.length,0),rawFrames:summaries.reduce((count,arm)=>count+arm.rawFrames,0),originalRawBytes:originalBytes.length,originalRawSHA256:sha(originalBytes),fixedRawBytes:fixedBytes.length,fixedRawSHA256:sha(fixedBytes),wholePreservationVectors:summaries.length*preserves.length,allTrackedRestored:restored,indexHeld:restored,locksHeld:restored,installed521Held:restored,offlineHeld:restored,limits:'Six actual separate source-control unit invocations only. Complete ordinary and finish preservation case objects equal admitted original in every arm. Actual global RNG tapes retain their startup idle prefix and every nonempty real draw call; nothing is filtered. Faulty branch chronology is retained honestly, without asserting fabricated whole-fault/original equality. Proper app types are separate workflow gates before and after controls. No App build, reader, cap, native browser, real-player, HTTP provider, backend-write, clock-edit-resistance or full-suite credit.'});
}
if(failure)throw failure;if(restorationFailure)throw restorationFailure;
console.log('PASS6 actual arms/36rows/8named business reds/28passes/414full RAW frames/12whole preservation vectors; exact fixed source/index/locks/521/offline restored');
