import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
const root=process.cwd(),out=path.resolve(process.argv[2]||'');
assert(process.argv[2]&&!out.startsWith(root+path.sep),'Use a fresh evidence directory outside the repository');
fs.mkdirSync(out,{recursive:true});assert(!fs.existsSync(out+'/admission.json'),'Never overwrite evidence');
const panel='src/components/soccer-career/TrainingPanel.tsx',test='src/test/trainingClassicPractice.test.tsx',feedback='src/test/trainingFeedbackMotion.test.tsx',harness='scripts/simTrainingFeedbackMotion.mjs';
const pins={
 [panel]:'d1beb9426daab4620807139d7634b47dc3dca601',
 [test]:'ea0ba5a61e5499b15cec36d1c2718ee0ad8cdf71',
 [feedback]:'2ddc596d8587e6ab2689cc3bd33a020bf6a58e0e',
 [harness]:'9bca78fede889ff2deef10143a15ba5ea3aed5d4',
 'vitest.config.ts':'ed2a9dc677f77dfe95c061064eeff5782b856864'
};
const held=new Map(Object.keys(pins).map(file=>[file,fs.readFileSync(file)]));
for(const[file,pin]of Object.entries(pins))assert.equal(execFileSync('git',['hash-object',file],{encoding:'utf8'}).trim(),pin,file);
const fixed=held.get(panel).toString(),old=execFileSync('git',['cat-file','blob','7027493bc968cf77bdcde7c6e21646441dc40bd4']);
fs.mkdirSync(out+'/sources');fs.writeFileSync(out+'/sources/fixed.tsx',fixed);fs.writeFileSync(out+'/sources/held-original.tsx',old);
const titles=[
 'keeps the existing rewarded penalty score, five global draws and one bank',
 'keeps all four classic drills open after the reward and repeats cones and sprint without a bank',
 'keeps a banked session spent when the same drill is retried without a parent rerender',
 "repeats free 'penalty' runs without reward callbacks or global career draws",
 "repeats free 'keeper' runs without reward callbacks or global career draws",
 "repeats free 'passing' runs without reward callbacks or global career draws"
].map(name=>'Soccer classic practice '+name);
const oldMarkers=['SC_CLASSIC_SPENT_MENU','SC_CLASSIC_BANKED_RETRY','SC_CLASSIC_FREE_PENALTY','SC_CLASSIC_FREE_KEEPER','SC_CLASSIC_FREE_PASSING'];
const rawNames=['rewarded-held','menu-free','banked-repeat','free-penalty','free-keeper','free-passing'];
const strip=value=>value.replace(/\u001b\[[0-?]*[ -/]*[@-~]/g,'');
const env={...process.env,NO_COLOR:'1',FORCE_COLOR:'0',DEBUG_PRINT_LIMIT:'2500'};
for(const key of['NO_DOUBLE_SWAP','TRAINING_FEEDBACK_CONTROL','SC_CLASSIC_PRACTICE_RAW'])delete env[key];
const rows=[],copies=[];
const raw=(arm,name)=>JSON.parse(fs.readFileSync(out+'/'+arm+'/raw/'+name+'.json'));
function run(name,args,extra={}){
 const dir=out+'/'+name;fs.mkdirSync(dir);fs.mkdirSync(dir+'/raw');
 const receipt=dir+'/transport.log';fs.writeFileSync(receipt,'');
 const child=spawnSync(process.execPath,args,{cwd:root,env:{...env,...extra,SIM_OFFLINE_RECEIPT:receipt},encoding:'utf8',timeout:180000,maxBuffer:32*1024*1024});
 const log=(child.stdout||'')+'\n'+(child.stderr||'');
 fs.writeFileSync(dir+'/output.log',log);fs.writeFileSync(dir+'/exit.json',JSON.stringify({status:child.status,signal:child.signal,error:child.error?String(child.error):null})+'\n');
 assert(!child.error&&child.signal===null,name+': native completion');
 assert.equal(fs.statSync(receipt).size,0,name+': offline receipt');
 assert.doesNotMatch(strip(log),/Unhandled\s+(?:Error|Rejection)s?|Vitest caught [1-9][0-9]* unhandled|uncaughtException|unhandledRejection/i,name);
 return{child,log};
}
function suite(name,file,pass,fail,alias,selected,markers=[]){
 const report=out+'/'+name+'/units.json',extra={SC_CLASSIC_PRACTICE_RAW:out+'/'+name+'/raw'};
 if(alias)extra.NO_DOUBLE_SWAP=JSON.stringify({'@/components/soccer-career/TrainingPanel':alias});
 const args=['node_modules/vitest/vitest.mjs','run',file,'--reporter=json','--outputFile='+report];
 if(selected)args.push('-t','^'+selected.replace(/[.*+?^$()|[\]\\{}]/g,'\\$&')+'$');
 const result=run(name,args,extra),j=JSON.parse(fs.readFileSync(report)),total=file===test?6:12;
 assert.equal(result.child.status,fail?1:0,name+': native exit');
 if(j.numRuntimeErrors!==undefined)assert.equal(j.numRuntimeErrors,0,name);
 assert.deepEqual([j.numTotalTests,j.numPassedTests,j.numFailedTests,j.numPendingTests,j.numTodoTests],[total,pass,fail,selected?5:0,0],name);
 assert.equal(j.testResults.length,1,name);
 const found=j.testResults[0].assertionResults;assert.equal(found.length,total,name);
 if(file===test)assert.deepEqual(found.map(row=>row.fullName).sort(),[...titles].sort(),name);
 if(selected)assert.deepEqual(found.filter(row=>!['pending','skipped'].includes(row.status)).map(row=>row.fullName),[selected],name);
 else assert(found.every(row=>['passed','failed'].includes(row.status)),name);
 const failures=found.filter(row=>row.status==='failed'),wanted=selected?[selected]:titles.slice(1);
 if(fail){
  assert.deepEqual(failures.map(row=>row.fullName).sort(),[...wanted].sort(),name);
  for(const row of failures){
   const message=strip(row.failureMessages.join('\n')),marker=markers[wanted.indexOf(row.fullName)];
   assert(message.includes(marker)&&message.includes('AssertionError'),name+': exact owned failure '+row.fullName);
   assert.doesNotMatch(message,/TypeError|SyntaxError|ReferenceError|Cannot find module|ERR_MODULE_NOT_FOUND|is not a function/,name);
  }
 }
 rows.push({name,nativeExit:result.child.status,pass,fail,unselectedNoCredit:selected?5:0,runtimeErrors:j.numRuntimeErrors??'UNKNOWN'});
}
function copy(name,source){
 const file=path.resolve(path.dirname(panel),'__qa_classic_'+name+'_TrainingPanel.tsx');
 assert(!fs.existsSync(file),'Never overwrite a source copy');fs.writeFileSync(file,source,{flag:'wx'});
 const retained=out+'/sources/'+name+'.tsx';fs.writeFileSync(retained,source,{flag:'wx'});copies.push({file,retained});return file;
}
function checkRaw(arm,isOld=false,selected){
 const names=selected?[selected]:rawNames;
 assert.deepEqual(fs.readdirSync(out+'/'+arm+'/raw').sort(),names.map(name=>name+'.json').sort(),arm);
 for(const name of names){
  const r=raw(arm,name);assert.equal(r.inputHeld,true);assert.equal(r.storageHeld,true);assert.deepEqual(r.callbacks.drill,[]);
  if(name==='rewarded-held'){assert.deepEqual(r.draws,Array(5).fill(0.5));assert.deepEqual(r.callbacks.complete,[['shooting',100]]);assert.equal(r.score,'100');}
  else if(name==='banked-repeat'){assert.deepEqual(r.draws,[]);assert.deepEqual(r.callbacks.complete,[['dribbling',100]]);if(isOld)assert.equal(r.retryAvailable,false);else assert.equal(r.score,'100');}
  else{
   assert.deepEqual(r.draws,[]);assert.deepEqual(r.callbacks.complete,[]);
   if(name==='menu-free'){assert.deepEqual(r.available,Array(4).fill(!isOld));if(!isOld)assert.equal(r.score,'64');}
   else if(isOld)assert.equal(r.available,false);
   else{assert(r.first>=0&&r.first<=100);assert(Number(r.score)>=0&&Number(r.score)<=100);}
  }
 }
}
function sameRaw(left,right,names){
 for(const name of names)assert(fs.readFileSync(out+'/'+left+'/raw/'+name+'.json').equals(fs.readFileSync(out+'/'+right+'/raw/'+name+'.json')),name+': exact restored RAW');
}
const faults=[
 {name:'free-bank',before:'{!banked && available && !practiceOnly ? (',after:'{!banked ? (',selected:titles[1],marker:'SC_CLASSIC_NO_FREE_BANK',raw:'menu-free'},
 {name:'global-rng',before:'if (!practiceOnly) return Math.random();',after:'if (true) return Math.random();',selected:titles[3],marker:'SC_CLASSIC_FREE_GLOBAL_DRAWS',raw:'free-penalty'}
];
try{
 suite('fixed',test,6,0);checkRaw('fixed');
 suite('whole-original',test,1,5,copy('original',old),undefined,oldMarkers);checkRaw('whole-original',true);
 suite('restored',test,6,0);checkRaw('restored');sameRaw('fixed','restored',rawNames);
 suite('feedback',feedback,12,0);
 for(const f of faults){
  assert.equal(fixed.split(f.before).length-1,1,f.name+': unique executable anchor');
  const changed=fixed.replace(f.before,f.after);assert.notEqual(changed,fixed);
  assert.equal(changed.split(f.after).length-1,1,f.name+': unique inverse');assert.equal(changed.replace(f.after,f.before),fixed);
  suite(f.name,test,0,1,copy(f.name,changed),f.selected,[f.marker]);
  const r=raw(f.name,f.raw);assert.equal(r.inputHeld,true);assert.equal(r.storageHeld,true);assert.deepEqual(r.callbacks.complete,[]);assert.deepEqual(r.callbacks.drill,[]);
  assert(!fs.readFileSync(out+'/'+f.name+'/raw/'+f.raw+'.json').equals(fs.readFileSync(out+'/fixed/raw/'+f.raw+'.json')),f.name+': RAW observation must change');
  if(f.name==='global-rng')assert(r.draws.length>0,'Actual global draw vector changed');
  suite(f.name+'-restored',test,1,0,undefined,f.selected);checkRaw(f.name+'-restored',false,f.raw);sameRaw('fixed',f.name+'-restored',[f.raw]);
 }
 for(const control of['unshot','unmarker','unresult','unbank']){
  const name='feedback-'+control,result=run(name,[harness],{TRAINING_FEEDBACK_CONTROL:control});
  assert.equal(result.child.status,0,name+': unchanged strict classifier');
  assert.match(strip(result.log),new RegExp('simTrainingFeedbackMotion '+control+':'));
  rows.push({name,nativeExit:0,selected:12,rejected:['unshot','unmarker'].includes(control)?5:6,heldPass:['unshot','unmarker'].includes(control)?7:6});
 }
}finally{
 for(const c of copies){assert(fs.readFileSync(c.file).equals(fs.readFileSync(c.retained)),'Actual copied source held');fs.unlinkSync(c.file);}
 for(const[file,bytes]of held)assert(fs.readFileSync(file).equals(bytes),file+': actual tracked source held');
 fs.writeFileSync(out+'/closure.json',JSON.stringify({pins,trackedHeld:true,adjacentCopiesRemoved:copies.every(c=>!fs.existsSync(c.file)),scope:'No build, full-suite, browser, engine or save credit.'},null,2)+'\n');
}
fs.writeFileSync(out+'/admission.json',JSON.stringify({status:'SC_CLASSIC_FOCUSED_QUALIFICATION_PASS',ordinaryUnique:18,rows,scope:'Six new actual-panel cases and twelve existing feedback cases. Selected skips carry no pass credit. No build, full-suite or browser credit.'},null,2)+'\n',{flag:'wx'});
console.log('SC classic practice: fixed6, original5-owned/1-held, restored6, feedback12, two effective faults/restorations and four existing feedback controls passed.');
