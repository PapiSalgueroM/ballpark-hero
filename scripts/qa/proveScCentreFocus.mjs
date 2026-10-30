import '../lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync,execFileSync} from 'node:child_process';
async function main(){
const ROOT=process.cwd(),OUT=process.env.SC_FOCUS_PROOF_OUT,COPY=process.env.SC_FOCUS_MATCHED,CONTRACT='qa/sc-centre-focus-v1/CONTRACT.json';
const sha=b=>createHash('sha256').update(b).digest('hex'),blob=b=>createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
const git=(...args)=>execFileSync('git',args,{cwd:ROOT,encoding:'utf8',maxBuffer:64*1024*1024,env:{...process.env,GIT_OPTIONAL_LOCKS:'0'}}).trim();
const write=(name,value)=>{const file=path.join(OUT,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');};
function outside(p){return path.isAbsolute(p||'')&&p!==ROOT&&!p.startsWith(ROOT+path.sep);}
assert(process.env.CI==='1'&&outside(OUT)&&outside(COPY)&&COPY!==OUT&&!COPY.startsWith(OUT+path.sep),'SC_FOCUS_PROOF_EXTERNAL');
fs.mkdirSync(OUT,{recursive:true});
const contractRaw=fs.readFileSync(CONTRACT);assert.equal(sha(contractRaw),process.env.SC_BROWSER_CONTRACT_SHA256,'SC_FOCUS_PROOF_CONTRACT');const C=JSON.parse(contractRaw);
const tracked=git('ls-files','-z').split('\0').filter(Boolean).sort();
function sourceRows(dir){return tracked.map(name=>{const f=path.join(dir,name);assert(fs.lstatSync(f).isFile(),'SC_FOCUS_REGULAR_SOURCE '+name);const b=fs.readFileSync(f);return{path:name,bytes:b.length,sha256:sha(b),gitBlob:blob(b),executable:!!(fs.statSync(f).mode&0o111)};});}
function members(dir){const seen=[];function walk(at){for(const e of fs.readdirSync(at,{withFileTypes:true})){const full=path.join(at,e.name),rel=path.relative(dir,full).split(path.sep).join('/');if(!rel.includes('/')&&['.git','node_modules','dist'].includes(rel))continue;if(e.isDirectory())walk(full);else{assert(e.isFile(),'SC_FOCUS_NO_OTHER_SYMLINK '+rel);seen.push(rel);}}}walk(dir);return seen.sort();}
function checkout(){return{head:git('rev-parse','HEAD'),refs:git('for-each-ref','--format=%(refname) %(objectname)'),index:sha(fs.readFileSync(path.resolve(ROOT,git('rev-parse','--git-path','index')))),untracked:git('ls-files','--others','--exclude-standard'),files:sourceRows(ROOT)};}
const before=checkout();write('checkout.before.json',before);
function held(variant='fixed'){
 assert.deepEqual(checkout(),before,'SC_FOCUS_ORIGINAL_CHECKOUT_SOURCE_MODE_INDEX_REFS_HELD');
 const expected=structuredClone(before.files);if(variant==='original-page'){const row=expected.find(r=>r.path===C.control.path);row.bytes=C.control.original.bytes;row.sha256=C.control.original.sha256;row.gitBlob=C.control.original.gitBlob;}
 assert.deepEqual(sourceRows(COPY),expected,'SC_FOCUS_MATCHED_WHOLE_SOURCE_MODES '+variant);assert.deepEqual(members(COPY),tracked,'SC_FOCUS_MATCHED_EXACT_MEMBERS');assert.equal(fs.realpathSync(path.join(COPY,'node_modules')),fs.realpathSync(path.join(ROOT,'node_modules')),'SC_FOCUS_PHYSICAL_SHARED_DEPENDENCIES');
}
function inventory(dir){const rows=[];function walk(at){for(const e of fs.readdirSync(at,{withFileTypes:true})){const f=path.join(at,e.name);assert(!e.isSymbolicLink());if(e.isDirectory())walk(f);else{assert(e.isFile());const b=fs.readFileSync(f);rows.push({path:path.relative(dir,f).split(path.sep).join('/'),bytes:b.length,sha256:sha(b)});}}}walk(dir);return rows.sort((a,b)=>a.path.localeCompare(b.path));}
function run(id,command,args,extra={},cwd=COPY,timeout=900000){
 const dir=path.join(OUT,'processes',id);fs.mkdirSync(dir,{recursive:true});const out=fs.openSync(path.join(dir,'stdout.log'),'w'),err=fs.openSync(path.join(dir,'stderr.log'),'w'),start=new Date().toISOString();let r;
 try{r=spawnSync(command,args,{cwd,env:{...process.env,...extra},timeout,stdio:['ignore',out,err]});}finally{fs.closeSync(out);fs.closeSync(err);}
 const row={id,command,args,cwd,start,end:new Date().toISOString(),raw:r.status,signal:r.signal,error:r.error?String(r.error):null};write('processes/'+id+'/process.json',row);assert(!row.signal&&!row.error,'SC_FOCUS_CHILD_PROCESS '+id);return row.raw;
}
const offline=()=>({SIM_NETWORK:'offline',NODE_OPTIONS:'--require='+path.join(COPY,'scripts/lib/offlineTransport.cjs'),SIM_OFFLINE_RECEIPT:path.join(OUT,'node-egress.jsonl')});
function archive(name,dir,source=false){const file=path.join(OUT,name+'.tar.gz'),args=source?['-czf',file,'--null','--verbatim-files-from','-T',path.join(OUT,'tracked-files.nul')]:['-czf',file,'-C',dir,'.'];assert.equal(run('archive-'+name,'tar',args,{},dir),0,'SC_FOCUS_ARCHIVE '+name);}
const preparedDir=process.env.SC_CENTRE_FOCUS_OUT,prepared=JSON.parse(fs.readFileSync(path.join(preparedDir,'FIXTURE-PREPARATION.json')));
assert.equal(prepared.status,'PREPARED');assert.equal(prepared.seniorSeed,C.baselineFixture.seniorSeed);assert.deepEqual(prepared.files,C.baselineFixture.files,'SC_FOCUS_BASELINE_ALL_EIGHT_FIXTURE_HASHES');
assert.deepEqual(prepared.youthAttempts.filter(r=>r.selected).map(r=>({seed:r.seed,selected:r.selected})),[{seed:30,selected:'cm-boulogne'}]);assert.deepEqual(prepared.seniorAttempts.filter(r=>r.accepted).map(r=>({seed:r.seed,club:r.club,drawCount:r.drawCount})),[{seed:1,club:'Boulogne',drawCount:134}]);
for(const pin of C.baselineFixture.files){const b=fs.readFileSync(path.join(preparedDir,pin.name));assert.equal(b.length,pin.bytes);assert.equal(sha(b),pin.sha256,'SC_FOCUS_ACTUAL_BASELINE_FIXTURE '+pin.name);}
const report={status:'STARTED',product:C.product,tree:C.tree,arms:[],fixtureBaseline:C.baselineFixture,scope:'Same frozen four cases in fixed, whole-original-Page and restored matched source. Fixed Resume chip held in all arms, no Resume runtime claim.'};
const flush=()=>write('REGRESSION.json',report);flush();
let fixedBody,controlAttempted=false,restored=false;
function arm(variant){
 held(variant);const dir=path.join(OUT,variant);fs.mkdirSync(dir);for(const pin of C.baselineFixture.files)fs.copyFileSync(path.join(preparedDir,pin.name),path.join(dir,pin.name));fs.copyFileSync(path.join(preparedDir,'FIXTURE-PREPARATION.json'),path.join(dir,'FIXTURE-PREPARATION.json'));
 const spec=structuredClone(C);spec.variant=variant;if(variant==='original-page')spec.sourcePins[C.control.path]=C.control.original;const contract=path.join(dir,'CONTRACT.json');fs.writeFileSync(contract,JSON.stringify(spec,null,2)+'\n');
 const env={...offline(),CI:'1',SC_CENTRE_FOCUS_OUT:dir,SC_BROWSER_COMPILED:path.join(dir,'compiled.json'),SC_BROWSER_CONTRACT:contract,SC_BROWSER_CONTRACT_SHA256:sha(fs.readFileSync(contract)),SC_BROWSER_CONTROL:'',SC_LEAGUE_BROWSER_WIDTH:''};
 assert.equal(run(variant+'-ordinary','npm',['run','build'],offline()),0,'SC_FOCUS_ORDINARY_BUILD '+variant);const ordinary=inventory(path.join(COPY,'dist'));write(variant+'/ordinary-dist.json',ordinary);
 assert.equal(run(variant+'-compile',process.execPath,['scripts/qa/playScCentreFocus.mjs','compile'],env),0,'SC_FOCUS_COMPILE '+variant);const compiled=JSON.parse(fs.readFileSync(path.join(dir,'compiled.json')));assert.equal(compiled.variant,variant);assert.deepEqual(compiled.distFiles,ordinary,'SC_FOCUS_OBSERVER_EQUAL_ORDINARY');assert.equal(compiled.sourcePins[C.control.path].gitBlob,spec.sourcePins[C.control.path].gitBlob);assert.equal(compiled.sourcePins[C.resumePath].gitBlob,C.sourcePins[C.resumePath].gitBlob,'SC_FOCUS_FIXED_RESUME_HELD');archive('dist-'+variant,path.join(COPY,'dist'));archive('source-'+variant,COPY,true);
 const receipt=path.join(dir,'font-receipts');fs.mkdirSync(receipt);const raw=run(variant+'-browser',process.execPath,['scripts/qa/playScCentreFocus.mjs','browser'],{...env,RELEASE_ROOT:COPY,PLAYWRIGHT_BROWSERS_PATH:process.env.PLAYWRIGHT_BROWSERS_PATH,FREE_KICK_FONT_CACHE:process.env.FREE_KICK_FONT_CACHE,FONT_CACHE_MANIFEST_SHA256:process.env.FONT_CACHE_MANIFEST_SHA256,SWEEP_CONTEXT_RECEIPT:path.join(receipt,'contexts.jsonl'),FONT_CACHE_USE_RECEIPT:path.join(receipt,'fonts.jsonl'),SWEEP_FLAG_RECEIPT:path.join(receipt,'flags.jsonl'),NODE_OPTIONS:env.NODE_OPTIONS+' --require='+path.join(ROOT,'.rc/fonts.cjs')});
 const actual=JSON.parse(fs.readFileSync(path.join(dir,'REPORT.json')));assert.equal(actual.compiledSHA256,sha(fs.readFileSync(path.join(dir,'compiled.json'))));assert.deepEqual(actual.cases.map(r=>r.id),C.cases.map(r=>r.id));
 for(const r of actual.cases){assert.deepEqual(r.errors,[]);assert.deepEqual(r.consoleErrors,[]);assert.deepEqual(r.unknown,[]);assert(!r.releaseError);assert.equal(r.custody.associated,true);assert.equal(r.captures.length,4);assert.equal(r.heldRequests.length,1);assert.equal(r.heldRequests[0].sha256,compiled.heldChunk.sha256);assert(r.snapshots.find(s=>s.label==='pending').activeInsideDialog);assert(r.snapshots.find(s=>s.label==='late-release').activeIsAfter);for(const pin of C.baselineFixture.files)assert.equal(sha(fs.readFileSync(path.join(dir,pin.name))),pin.sha256);}
 if(variant==='original-page'){
  assert.equal(raw,1);assert.equal(actual.status,'OWNED_FOCUS_FAILURES_OBSERVED');for(const r of actual.cases){assert.equal(r.status,'OWNED_FOCUS_FAILURE');assert.equal(r.error.name,'AssertionError');assert(String(r.error.message).split('\n')[0].startsWith('SC_CENTRE_RETURN_FOCUS '+r.id));for(const label of ['after','late-release'])assert.equal(r.snapshots.find(s=>s.label===label).active.tag,'BODY','SC_FOCUS_EXACT_ORIGINAL_BODY_PROFILE');}
 }else{assert.equal(raw,0);assert.equal(actual.status,'ALL_FOUR_PASSED');for(const r of actual.cases){assert.equal(r.status,'PASSED');assert(r.focusResult.afterExactConnectedTarget&&r.focusResult.lateExactConnectedTarget);}}
 assert.deepEqual(inventory(path.join(COPY,'dist')),compiled.distFiles);held(variant);const result={variant,raw,reportSHA256:sha(fs.readFileSync(path.join(dir,'REPORT.json'))),compiledSHA256:sha(fs.readFileSync(path.join(dir,'compiled.json'))),cases:actual.cases.map(r=>({id:r.id,status:r.status,focusResult:r.focusResult,rawSaves:r.snapshots.map(s=>({label:s.label,sha256:sha(s.rawSave)})),actionTape:r.actionTape}))};report.arms.push(result);flush();return{compiled,actual,result};
}
try{
 assert.equal(git('rev-parse','HEAD^'),C.product);assert.equal(git('rev-parse','HEAD^:'),C.tree);assert.equal(process.env.GITHUB_REF,'refs/heads/'+C.branch);assert.equal(tracked.length,5516);assert.deepEqual(git('diff','--name-status','HEAD^','HEAD').split('\n').sort(),C.qaPaths.map(f=>'A\t'+f).sort());assert.equal(before.untracked,'');assert(!fs.existsSync(COPY),'SC_FOCUS_FRESH_MATCHED_COPY');
 fs.mkdirSync(COPY);for(const name of tracked){const from=path.join(ROOT,name),to=path.join(COPY,name);fs.mkdirSync(path.dirname(to),{recursive:true});fs.copyFileSync(from,to);fs.chmodSync(to,fs.statSync(from).mode&0o777);}fs.symlinkSync(path.join(ROOT,'node_modules'),path.join(COPY,'node_modules'),'dir');fs.writeFileSync(path.join(OUT,'tracked-files.nul'),tracked.join('\0')+'\0');held();
 fixedBody=fs.readFileSync(path.join(COPY,C.control.path));assert.equal(blob(fixedBody),C.sourcePins[C.control.path].gitBlob);const original=fs.readFileSync(path.join(ROOT,C.control.originalBodyPath));assert.equal(blob(original),C.control.original.gitBlob);assert.equal(sha(original),C.control.original.sha256);assert.equal(original.length,C.control.original.bytes);write('PHYSICAL-PAGE-CONTROL.json',{fixed:C.sourcePins[C.control.path],original:C.control.original,wholeBody:true,resumeHeld:C.sourcePins[C.resumePath],noResumeRuntimeClaim:true});
 const fixed=arm('fixed');
 try{controlAttempted=true;fs.writeFileSync(path.join(COPY,C.control.path),original);const old=arm('original-page');const current=fixed.compiled.chunks.find(c=>c.modules.includes(C.control.path)),past=old.compiled.chunks.find(c=>c.modules.includes(C.control.path));assert(current&&past&&current.sha256!==past.sha256,'SC_FOCUS_PHYSICAL_PAGE_CHANGED_COMPILED_CHUNK');}
 finally{fs.writeFileSync(path.join(COPY,C.control.path),fixedBody);const again=arm('restored');assert.deepEqual(again.compiled.distFiles,fixed.compiled.distFiles,'SC_FOCUS_RESTORED_ALL_DIST_BYTES');assert.deepEqual(again.result.cases,fixed.result.cases,'SC_FOCUS_RESTORED_FOUR_OUTCOMES_SAVES_AND_TAPES');restored=true;}
 assert.deepEqual(report.arms.map(a=>a.variant),['fixed','original-page','restored']);report.status='QUALIFIED_FIXED_ORIGINAL_PAGE_RESTORED';
}catch(error){report.status='REFUSED';report.error={name:error.name,message:error.message,stack:error.stack};console.error(error);process.exitCode=2;}
finally{
 const errors=[];try{if(fixedBody&&fs.existsSync(COPY))fs.writeFileSync(path.join(COPY,C.control.path),fixedBody);if(fs.existsSync(COPY)){held();archive('matched-final',COPY,true);}assert.deepEqual(checkout(),before);}catch(error){errors.push(String(error));report.status='REFUSED';process.exitCode=2;}
 write('FINAL-HOLDS.json',{originalCheckoutHeld:errors.length===0,matchedRestored:errors.length===0,controlAttempted,restored,errors,dependencyIndexRefsFonts:'Original V4 all21 finish records independently required',cheapSPrerequisite:'ROOT_MUST_ADMIT_CURRENT_S_TYPES_BUILD_CAPS15_READERS15_BEFORE_LAUNCH'});flush();
}
}
try{await main();}catch(error){console.error(error);process.exitCode=2;}
