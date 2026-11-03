import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';

const index=process.argv.indexOf('--out');assert(index>=0&&process.argv[index+1]);
const out=path.resolve(process.argv[index+1]),root=process.cwd();
assert(process.env.RUNNER_TEMP&&out.startsWith(path.resolve(process.env.RUNNER_TEMP)+path.sep));fs.mkdirSync(out,{recursive:true});
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const write=(file,v)=>fs.writeFileSync(file,JSON.stringify(v,null,2)+'\n');
const git=args=>execFileSync('git',args,{encoding:'utf8',maxBuffer:8*1024*1024}).trim();
assert.equal(git(['rev-parse','HEAD^']),'00c85815cac64d72014594e6b38515d4d6ce2e45');
const target='scripts/runAllSims.mjs',test='scripts/simBrowserHarnessDiscovery.mjs';
const candidate=fs.readFileSync(target,'utf8'),original=execFileSync('git',['show','HEAD^:'+target],{encoding:'utf8'});
assert.equal(hash(candidate),'9ee9714c98a600e92599beaf26d0c97c52587e55d71bd9d8f5bc88afc4dde738');
assert.equal(hash(original),'aea1ca2262f57a5cea27142b0a3576a63bac6120a61ee85bcff09a9a982eb493');
assert.equal(hash(fs.readFileSync(test)),'b6a35e26f499623b00d187829179611eaa2c9e6a9a166e5bd17a7f76d8539257');
const tracked=git(['ls-files','-z']).split('\0').filter(Boolean).sort(),snapshot=()=>Object.fromEntries(tracked.map(file=>[file,hash(fs.readFileSync(file))]));
const before=snapshot();write(out+'/source-before.json',before);
assert.equal(git(['status','--porcelain=v1','--untracked-files=all']),'');
const phases=[],plans={},originalDirs=()=>fs.existsSync('.sim-control')?fs.readdirSync('.sim-control').filter(name=>/^browser-discovery-/.test(name)):[];
const cleanEnv=receipt=>{const env={...process.env,CI:'1',SIM_NETWORK:'offline',TZ:'UTC',SIM_OFFLINE_RECEIPT:receipt,NODE_OPTIONS:'--require='+path.join(root,'scripts/lib/offlineTransport.cjs')};for(const key of ['ONLY','BROWSER','DB_PROBE','SIM_SUITE_NET_GUARD','SIM_SUITE_NET_FORCE'])delete env[key];return env;};
function child(name,file,args=[]){
 const dir=out+'/'+name;fs.mkdirSync(dir,{recursive:true});const receipt=dir+'/transport.log';fs.writeFileSync(receipt,'');
 const p=spawnSync(process.execPath,[file,...args],{env:cleanEnv(receipt),encoding:'utf8',maxBuffer:16*1024*1024,timeout:300000});
 fs.writeFileSync(dir+'/stdout.log',p.stdout||'');fs.writeFileSync(dir+'/stderr.log',p.stderr||'');fs.writeFileSync(dir+'/native.exit',String(p.status)+'\n');
 write(dir+'/process.json',{status:p.status,signal:p.signal,error:p.error?String(p.error):null});
 assert(!p.error&&!p.signal,name+' bounded child completes');assert.equal(fs.statSync(receipt).size,0);
 assert.doesNotMatch((p.stdout||'')+(p.stderr||''),/TypeError|ReferenceError|SyntaxError|Cannot find module|ERR_MODULE_NOT_FOUND|unhandledRejection|uncaughtException/);
 return{dir,p};
}
function plan(name){
 const{dir,p}=child(name,target,['--plan-json']);assert.equal(p.status,0);
 const r=JSON.parse(p.stdout);for(const key of ['nodeGroup','browserGroup'])assert(Array.isArray(r[key])&&r[key].every(v=>typeof v==='string'));
 const all=[...r.nodeGroup,...r.browserGroup].sort();assert.equal(new Set(all).size,all.length);assert.equal(all.length,1042);
 plans[name]=r;write(dir+'/plan.json',r);return r;
}
const signature=r=>r.observations.map(o=>({browser:o.browser,sourceSha256:o.sourceSha256,code:o.code,
 files:o.rows.map(row=>row.file).sort(),controlsHeld:o.rows.every(row=>row.only===null&&row.browser===null),
 failure:o.intendedFailure?{name:o.intendedFailure.name,actual:o.intendedFailure.actual,expected:o.intendedFailure.expected}:null}));
function discovery(name,old=false){
 const dirs=new Set(originalDirs()),{dir,p}=child(name,test),created=originalDirs().filter(name=>!dirs.has(name));assert.equal(created.length,1,'One actual owned fixture tree');
 const source=path.resolve('.sim-control',created[0]);assert(source.startsWith(path.resolve('.sim-control')+path.sep));
 assert(fs.statSync(source).isDirectory()&&!fs.lstatSync(source).isSymbolicLink());
 fs.cpSync(source,dir+'/owned-fixture',{recursive:true,errorOnExist:true,force:false});
 const r=read(dir+'/owned-fixture/report.json');assert.equal(r.fixtures.length,28);
 assert.equal(r.before[target],old?hash(original):hash(candidate));
 assert.equal(r.before['scripts/lib/answerConsent.mjs'],hash(fs.readFileSync('scripts/lib/answerConsent.mjs')));
 for(const file of ['playNbaLotteryNight.mjs','playTycoonScorelines.mjs'])assert(r.fixtures.some(row=>row.file===file&&row.browser&&row.actualSourceSha256));
 assert(r.fixtures.filter(row=>row.guarded).every(row=>!row.browser));
 if(old){
  assert.equal(p.status,1);assert.match(p.stderr,/AssertionError/);assert.match(p.stderr,/Default runner omits every actual and synthetic browser import/);
  assert.equal(r.observations.length,1);assert.equal(r.observations[0].code,0);
  for(const file of ['playNbaLotteryNight.mjs','playTycoonScorelines.mjs'])assert(r.observations[0].rows.some(row=>row.file===file));
 }else{
  assert.equal(p.status,0);assert.equal(r.observations.length,6);
  assert.deepEqual(r.observations.map(o=>o.rows.length),[12,28,24,8,15,15]);
  assert(r.observations.every(o=>o.code===0));assert.equal(r.observations.flatMap(o=>o.rows).length,102);
  assert(r.observations.slice(2).every(o=>o.intendedFailure?.name==='AssertionError'));
  assert.equal(r.observations.slice(2).length,4);
 }
 const phase={name,nativeExit:p.status,observations:r.observations.length,sentinelChildren:r.observations.flatMap(o=>o.rows).length,signature:signature(r),meaning:'Selection sentinels exit before gameplay. Full fixture/report/log evidence retained.'};
 phases.push(phase);write(dir+'/admission.json',phase);return phase;
}
let problem=null;
try{
 const healthyPlan=plan('fixed-plan'),healthy=discovery('fixed');
 try{
  fs.writeFileSync(target,original);assert.equal(hash(fs.readFileSync(target)),hash(original));
  plan('whole-old-plan');discovery('whole-old',true);
 }finally{
  assert.equal(fs.readFileSync(target,'utf8'),original,'Only exact owned old runner is restored');fs.writeFileSync(target,candidate);
  assert.equal(fs.readFileSync(target,'utf8'),candidate);
 }
 const restoredPlan=plan('restored-plan'),restored=discovery('restored');
 assert.deepEqual(restoredPlan,healthyPlan);assert.deepEqual(restored.signature,healthy.signature);
 const old=plans['whole-old-plan'],all=r=>[...r.nodeGroup,...r.browserGroup].sort();
 assert.deepEqual(all(old),all(healthyPlan));const movedToBrowser=healthyPlan.browserGroup.filter(file=>old.nodeGroup.includes(file)),movedToNode=healthyPlan.nodeGroup.filter(file=>old.browserGroup.includes(file));
 assert.deepEqual(movedToNode,[]);
 for(const file of ['playNbaLotteryNight.mjs','playTycoonScorelines.mjs'])assert(movedToBrowser.includes(file)&&!healthyPlan.nodeGroup.includes(file));
 for(const file of ['simLoginReturn.mjs','simBracketMoment.mjs'])assert(old.nodeGroup.includes(file)&&healthyPlan.nodeGroup.includes(file));
 write(out+'/actual-census.json',{discovered:all(old).length,old:{node:old.nodeGroup.length,browser:old.browserGroup.length},fixed:{node:healthyPlan.nodeGroup.length,browser:healthyPlan.browserGroup.length},movedToBrowser,movedToNode,
 allIdentitiesHeld:true,optionalHybridsHeld:true,limits:'Group counts come from actual executable discovery. Every moved browser file still needs served-build execution; none earns gameplay or skip-to-pass credit here.'});
}catch(error){problem={name:error.name,message:error.message,stack:error.stack};}
finally{
 assert.equal(fs.readFileSync(target,'utf8'),candidate,'Candidate runner source restored');
 const after=snapshot();write(out+'/source-after.json',after);const sourceHeld=JSON.stringify(after)===JSON.stringify(before),status=git(['status','--porcelain=v1','--untracked-files=all']);
 fs.writeFileSync(out+'/status-after.txt',status);
 write(out+'/discovery-admission.json',{eligible:!problem&&sourceHeld&&status==='',problem,phases,sourceHeld,cleanAfter:status==='',limits:'Node-only discovery and physical-old-runner check. No browser gameplay, full fleet, timeout repair or release credit.'});
 if(!sourceHeld||status!=='')problem||={message:'Source closure failed'};
}
if(problem){console.error(problem);process.exitCode=1;}else console.log('Discovery healthy/old-owned/restored and full actual membership census qualified; actual browser play remains separate.');
