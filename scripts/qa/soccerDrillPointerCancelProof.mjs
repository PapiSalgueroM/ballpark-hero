import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {stripVTControlCharacters} from 'node:util';

const ROOT=process.cwd(), OUT=path.resolve(ROOT,process.env.SOCCER_DRILL_CANCEL_OUT||'career-drill-pointer-cancel-artifacts/proof');
assert(process.env.CI,'Remote verification only');
assert(!process.env.NO_DOUBLE_SWAP,'No inherited module substitution');
assert(process.env.RECORD_DRILL_MARKUP!=='1','Never refresh the held markup record');
assert(!fs.existsSync(OUT),'Fresh complete proof directory');
fs.mkdirSync(OUT,{recursive:true});
const report={status:'running',identity:{head:process.env.GITHUB_SHA,runId:process.env.GITHUB_RUN_ID,attempt:process.env.GITHUB_RUN_ATTEMPT},scope:'Six actual component unit cases in current/original-pointer-binding/whole-undo arms, separate five unchanged markup cases. Controlled unit clock/pointer fixtures, no browser/natural-career/RNG-tape claim.',processes:[],arms:[],diagnostics:[],errors:[]};
const hash=b=>createHash('sha256').update(b).digest('hex');
const save=()=>fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(report,null,2));
const ref=(name,value)=>{const full=path.join(OUT,name);fs.mkdirSync(path.dirname(full),{recursive:true});const raw=Buffer.isBuffer(value)?value:typeof value==='string'?Buffer.from(value):Buffer.from(JSON.stringify(value,null,2));fs.writeFileSync(full,raw);return{path:name,bytes:raw.length,sha256:hash(raw)};};
const errorText=error=>({name:error.name,message:error.message,stack:String(error.stack||error)});
const APP='src/components/soccer-career/DrillBoard.tsx', UNIT='src/test/drillBoardMatch.test.tsx', MARKUP='src/test/drillBoardMarkup.test.tsx';
const OLD=['plays the wall shot round it was handed, once, and writes no daily record','wins the tackle round by tapping the loose ball, and reports what the engine settles','lets a glove round run out as a miss, once','plays one through ball, reports once and offers no next ball or menu'];
const NEW=['cancels a Wall Shot drag without spending the round, then releases once','cancels a Gloves drag without spending the round, then releases once'];
const TITLES=[...OLD,...NEW], MARKUP_TITLES=['draws the Wall Shot as recorded','draws the Tackle as recorded','draws the Glove Save as recorded','draws the Through Ball as recorded','matches the record made before the match prop existed'];
const PINS=[[APP,42504,'42591173de244f05f7e21166035ee6b7fe2d04ac78a8dc54c69bbd817038a99e'],[UNIT,12037,'3641efe7c96f24e6500745940ce8957f2e9f686fe3bc2c739d189f4af7727c42'],['docs/CAREER-DRILL-POINTER-CANCEL.md',2000,'57df6eeec63e74ee6b5382c97ac8377fc4573fc30cc514c3d2d78d7ec205b921']];
const HELD=[APP,UNIT,MARKUP,'src/test/fixtures/drillBoardFrames.tsx','src/test/fixtures/drillBoardMarkup.recorded.json','src/lib/careerDrills.ts','src/lib/dailyRecord.ts','src/hooks/useArcadeFlight.ts','src/hooks/useRevealScroll.ts','src/lib/season/soccerMoments.ts','src/lib/throughBallDrill.ts','src/components/soccer-career/ThroughBallBoard.tsx','src/components/soccer-career/DrillPlayers.tsx','src/components/ui/button.tsx','src/lib/utils.ts','src/lib/dateUtils.ts','src/test/setup.ts','vitest.config.ts','tsconfig.app.json','package.json','package-lock.json','scripts/lib/offlineTransport.cjs','scripts/simCareerDrills.mjs','scripts/simCareerTraining.mjs','scripts/simFreeKick.mjs','scripts/simFreeKickPractice.mjs','scripts/qa/soccerDrillPointerCancelProof.mjs','.github/workflows/career-drill-pointer-cancel.yml','docs/CAREER-DRILL-POINTER-CANCEL.md'];
const captureSource=stage=>HELD.map(file=>({file,...ref(`source/${stage}/${file}`,fs.readFileSync(path.join(ROOT,file)))}));
const identity=rows=>rows.map(({file,bytes,sha256})=>({file,bytes,sha256}));
const child=(id,args,env)=>{const row={id,command:process.execPath,args:['--require',path.join(ROOT,'scripts/lib/offlineTransport.cjs'),...args],cwd:ROOT,env,status:'running'};report.processes.push(row);save();const c=spawnSync(row.command,row.args,{cwd:ROOT,env:{...process.env,...env},maxBuffer:100000000});row.stdout=ref(`process/${id}/stdout.txt`,c.stdout||Buffer.alloc(0));row.stderr=ref(`process/${id}/stderr.txt`,c.stderr||Buffer.alloc(0));row.exit=c.status;row.signal=c.signal;row.error=c.error?errorText(c.error):null;row.status='closed';save();return row;};
const detect=text=>/\b(?:Unhandled Errors|Unhandled Error|Unhandled Rejection|Failed Suites|Source Errors)\b/.test(text);
const diagnostics=(id,processRow)=>{const text=stripVTControlCharacters(fs.readFileSync(path.join(OUT,processRow.stdout.path),'utf8')+'\n'+fs.readFileSync(path.join(OUT,processRow.stderr.path),'utf8'));const row={id,status:'running',stdout:processRow.stdout,stderr:processRow.stderr,before:ref(`diagnostics/${id}/before.txt`,text),errors:[]};report.diagnostics.push(row);save();try{row.beforeFindings=detect(text)?['vitest-runtime-diagnostic']:[];save();assert.deepEqual(row.beforeFindings,[]);const banner='\nUnhandled Errors\n',fault=text+banner;row.fault=ref(`diagnostics/${id}/fault.txt`,fault);row.changed=fault!==text;row.faultFindings=detect(fault)?['vitest-runtime-diagnostic']:[];save();assert(row.changed);assert.deepEqual(row.faultFindings,['vitest-runtime-diagnostic']);assert(fault.endsWith(banner));const undo=fault.slice(0,-banner.length);row.undo=ref(`diagnostics/${id}/undo.txt`,undo);row.undoFindings=detect(undo)?['vitest-runtime-diagnostic']:[];row.actualSameFaultReversed=true;save();assert.equal(undo,text);assert.deepEqual(row.undoFindings,[]);row.status='pass';}catch(error){row.status='fail';row.errors.push(errorText(error));save();throw error;}save();};
const runUnits=(id,test,titles,failed,env)=>{
  const row={id,test,titles,expectedFailures:failed,status:'running',errors:[]};report.arms.push(row);save();
  try{
    const output=path.join(OUT,'arms',id,'vitest.json');fs.mkdirSync(path.dirname(output),{recursive:true});
    row.process=child(id,[path.join(ROOT,'node_modules/vitest/vitest.mjs'),'run',test,'--no-cache','--maxWorkers=1','--no-file-parallelism','--reporter=default','--reporter=json',`--outputFile=${output}`],env);
    if(fs.existsSync(output)){row.vitest=ref(`arms/${id}/vitest-retained.json`,fs.readFileSync(output));const result=JSON.parse(fs.readFileSync(output));row.assertions=ref(`arms/${id}/assertions.json`,result.testResults.flatMap(file=>file.assertionResults));save();}
    assert(row.vitest&&row.assertions,'Complete unit output required');assert.deepEqual([row.process.exit,row.process.signal,row.process.error],[failed.length?1:0,null,null]);
    const raw=fs.readFileSync(path.join(OUT,row.process.stdout.path),'utf8')+'\n'+fs.readFileSync(path.join(OUT,row.process.stderr.path),'utf8');assert(!/^\[SIM_OFFLINE_BLOCK\]/m.test(raw));
    const result=JSON.parse(fs.readFileSync(output));assert.equal(result.testResults.length,1);const file=result.testResults[0];assert.equal(file.name,path.join(ROOT,test));assert.equal(file.message,'');assert.equal(file.status,failed.length?'failed':'passed');const assertions=file.assertionResults;
    assert.deepEqual(assertions.map(x=>x.title).sort(),[...titles].sort());assert.deepEqual([result.numTotalTests,result.numPassedTests,result.numFailedTests,result.numPendingTests,result.numTodoTests],[titles.length,titles.length-failed.length,failed.length,0,0]);assert.equal(result.numPendingTestSuites,0);
    assert.deepEqual(assertions.filter(x=>x.status==='failed').map(x=>x.title).sort(),[...failed].sort());
    for(const assertion of assertions){assert.equal(assertion.status,failed.includes(assertion.title)?'failed':'passed');if(!failed.includes(assertion.title))assert.deepEqual(assertion.failureMessages,[]);else{const marker=assertion.title===NEW[0]?'DRILL_POINTER_CANCEL_wallshot':'DRILL_POINTER_CANCEL_gloves';assert(assertion.failureMessages.length&&assertion.failureMessages.every(message=>message.includes(marker)));}}
    diagnostics(id,row.process);row.status='pass';save();return row;
  }catch(error){row.status='fail';row.errors.push(errorText(error));save();throw error;}
};
const copyPath=path.join(ROOT,'src/components/soccer-career',`__drill_pointer_cancel_${process.pid}.tsx`);
let owned=null;
try{
  report.sourceBefore=captureSource('before');save();
  for(const[file,bytes,sha]of PINS){const raw=fs.readFileSync(path.join(ROOT,file));assert.equal(raw.length,bytes);assert.equal(hash(raw),sha);}
  const current=fs.readFileSync(path.join(ROOT,APP)),from='        onPointerCancel={onCancel}',to='        onPointerCancel={onUp}';assert.equal(current.toString('utf8').split(from).length-1,1);
  assert(!fs.existsSync(copyPath),'Owned module copy must be absent');fs.writeFileSync(copyPath,current,{flag:'wx'});owned=current;assert(fs.readFileSync(copyPath).equals(current));
  report.sourceControl={id:'original-pointer-cancel-binding',copyPath,from,to,before:ref('control/before.tsx',current),status:'running',errors:[]};save();
  runUnits('current',UNIT,TITLES,[],{NO_DOUBLE_SWAP:''});
  const fault=Buffer.from(current.toString('utf8').replace(from,to));assert(!fault.equals(current));assert.equal(fault.toString('utf8').split(to).length-1,1);assert(fs.readFileSync(copyPath).equals(current));fs.writeFileSync(copyPath,fault);owned=fault;assert(fs.readFileSync(copyPath).equals(fault));report.sourceControl.fault=ref('control/fault.tsx',fault);report.sourceControl.changed=true;save();
  try{runUnits('original-binding',UNIT,TITLES,NEW,{NO_DOUBLE_SWAP:JSON.stringify({'@/components/soccer-career/DrillBoard':copyPath})});}
  finally{assert(fs.readFileSync(copyPath).equals(fault),'Only reverse owned exact fault bytes');const undo=Buffer.from(fault.toString('utf8').replace(to,from));assert(undo.equals(current));fs.writeFileSync(copyPath,undo);owned=undo;assert(fs.readFileSync(copyPath).equals(current));report.sourceControl.undo=ref('control/undo.tsx',undo);report.sourceControl.actualSameCopyReversed=true;save();}
  runUnits('whole-undo',UNIT,TITLES,[],{NO_DOUBLE_SWAP:JSON.stringify({'@/components/soccer-career/DrillBoard':copyPath})});
  report.sourceControl.status='pass';save();
  runUnits('unchanged-markup',MARKUP,MARKUP_TITLES,[],{NO_DOUBLE_SWAP:'',RECORD_DRILL_MARKUP:''});
}catch(error){report.errors.push(errorText(error));save();}
finally{
  if(owned)try{const actual=fs.readFileSync(copyPath);report.temporarySource={path:copyPath,body:ref('source/temporary-copy.tsx',actual)};save();assert(actual.equals(owned),'Keep any unrelated/partial temporary Source for recovery');fs.unlinkSync(copyPath);report.temporaryRemoved=true;}catch(error){report.errors.push({stage:'temporary-cleanup',...errorText(error)});}
  try{report.sourceAfter=captureSource('after');assert.deepEqual(identity(report.sourceAfter),identity(report.sourceBefore));report.wholeSourceHeld=true;}catch(error){report.errors.push({stage:'source-after',...errorText(error)});}
  report.status=report.errors.length===0&&report.arms.length===4&&report.arms.every(x=>x.status==='pass')&&report.diagnostics.length===4&&report.diagnostics.every(x=>x.status==='pass')&&report.sourceControl?.status==='pass'&&report.sourceControl.actualSameCopyReversed&&report.wholeSourceHeld&&report.temporaryRemoved?'pass':'fail';save();
  try{const files=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(x=>x.isDirectory()?files(path.join(dir,x.name)):x.isFile()?[path.join(dir,x.name)]:(()=>{throw Error('Only regular proof files');})());ref('physical-body-vector.json',{files:files(OUT).sort().map(file=>{const b=fs.readFileSync(file);return{path:path.relative(OUT,file).split(path.sep).join('/'),bytes:b.length,sha256:hash(b)};})});}catch(error){report.errors.push({stage:'physical-vector',...errorText(error)});report.status='fail';save();}
}
console.log(`${report.status==='pass'?'PASS':'FAIL'} Drill pointer cancellation: three six-case arms, two original-binding assertion failures, five held markup cases, four diagnostic controls`);
if(report.status!=='pass')process.exitCode=1;
