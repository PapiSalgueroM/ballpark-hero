'use strict';
async function main(mode) {
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const ROOT=fs.realpathSync(process.cwd()),OUT=fs.realpathSync(process.env.CM_MINIMIZE_OUT),SHADOW=path.resolve(process.env.CM_MINIMIZE_SHADOW),SELF=fs.realpathSync(__filename);
const PARENT='12c1b2cd001f9309a31a887e5c432ca63c373852',TREE='74358aec6fc334a3507aa202a2a86cad4142f6a7';
const WF='.github/workflows/cm-minimize-qualification.yml',HELPER='scripts/qa/cmMinimizeQualification.cjs',DOC='docs/PROJECT-STATE.md';
const DATA_PIN={"gitBlob":"c11e5d7b9c77d49f0c477894ba677a07eafad44f","bytes":33205,"sha256":"07eb2b7fa41e5cea00e25874d2e3c12754cb0ad477f775d3651cdd5799accdc2"},DOC_META={"parent":{"bytes":1860109,"sha256":"20bfd9466033d70020d8ba6295b393a394f8c0fb5a40152b813937230a226ee1","gitBlob":"8f378afd1e8f175dadef3d3de033e2f59366e308"},"candidate":{"bytes":1861160,"sha256":"ae6b67079f154d4e8a8e74bdf661a16afb5a84708d973c3c2d4f81b99c1eb6c5","gitBlob":"cff4928c19496e83e5fec928c87a1b2223791344"},"tail":{"path":"C:\\Users\\antho\\dukb-handoff\\2026-10-24\\cm-minimize-qualification-workflow-proposal-v1\\PROJECT-STATE.append.md","bytes":1051,"sha256":"4cdde8ca3b35ad9a0a5c58f0966e10f6dd2541831b48085f7691ff311805a9d9","gitBlob":"a7e5559a40f49cb8fb063160420145154b157b27"}};
const sha=b=>createHash('sha256').update(b).digest('hex');
const blob=b=>createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
const meta=b=>({bytes:b.length,sha256:sha(b),gitBlob:blob(b)});
function regular(file){const s=fs.lstatSync(file);assert(s.isFile()&&!s.isSymbolicLink(),'CM_MINIMIZE_REGULAR');return fs.readFileSync(file);}
function same(body,pin){assert.deepEqual(meta(body),{bytes:pin.bytes,sha256:pin.sha256,gitBlob:pin.gitBlob},'CM_MINIMIZE_BODY_PIN');}
const output=name=>{assert.equal(path.basename(name),name);return path.join(OUT,name);};
const write=(name,body)=>fs.writeFileSync(output(name),body,{flag:'wx'});
const save=(name,value)=>write(name,JSON.stringify(value,null,2)+'\n');
const json=name=>JSON.parse(regular(output(name)));
const git=args=>cp.execFileSync('git',args,{cwd:ROOT,encoding:'utf8',maxBuffer:32*1024*1024}).trim();
const rawData=regular(output('qualification-data.json'));same(rawData,DATA_PIN);
const DATA=JSON.parse(rawData);
assert.equal(DATA.format,1);assert.equal(DATA.parent,PARENT);assert.equal(DATA.parentTree,TREE);assert.equal(DATA.overlays.length,3);assert.equal(DATA.readers.length,18);
assert(OUT!==ROOT&&!OUT.startsWith(ROOT+path.sep)&&SHADOW!==ROOT&&!SHADOW.startsWith(ROOT+path.sep)&&SHADOW!==OUT&&!SHADOW.startsWith(OUT+path.sep));
function binding(){
 assert.equal(process.env.CM_MINIMIZE_PHASE,'detached-ui');
 assert.equal(process.env.GITHUB_REPOSITORY,'PapiSalgueroM/ballpark-hero');
 assert.equal(process.env.GITHUB_REPOSITORY_ID,'1195729679');
 assert.equal(process.env.GITHUB_REF,'refs/heads/codex/cm-minimize-shadow-20261026');
 assert.equal(git(['rev-parse','HEAD']),process.env.GITHUB_SHA);
 assert.equal(git(['show','-s','--format=%P','HEAD']),PARENT);
 assert.equal(git(['rev-parse',PARENT+'^{tree}']),TREE);
 assert.equal(process.env.NODE_OPTIONS,'--require='+path.join(ROOT,'scripts/lib/offlineTransport.cjs'));
 assert.equal(process.env.SIM_NETWORK,'offline');
 for(const name of Object.keys(process.env))if(/^(?:LIVE_FIT_|NO_DOUBLE_SWAP$|SIM_SEED$|NODE_PATH$|VITEST$|ONLY$)/.test(name))assert.fail('CM_MINIMIZE_INHERITED_OVERRIDE '+name);
 assert.equal(process.env.RC_OUT,undefined);
 const expected=['A\t'+WF,'M\t'+DOC,'A\t'+HELPER].sort();
 assert.deepEqual(git(['diff','--name-status',PARENT,'HEAD']).split('\n').sort(),expected);
 for(const file of [WF,HELPER])assert.equal(git(['ls-tree','-r','--name-only',PARENT,'--',file]),'');
 const critical={};
 for(const p of DATA.critical){const body=regular(path.join(ROOT,p.path));same(body,p);assert.equal(git(['rev-parse','HEAD:'+p.path]),p.gitBlob);assert.equal(git(['rev-parse',PARENT+':'+p.path]),p.gitBlob);critical[p.path]=meta(body);}
 const parent=cp.execFileSync('git',['show',PARENT+':'+DOC],{cwd:ROOT,maxBuffer:4*1024*1024}),doc=regular(path.join(ROOT,DOC));same(parent,DOC_META.parent);same(doc,DOC_META.candidate);
 assert(doc.subarray(0,parent.length).equals(parent));const tail=doc.subarray(parent.length);assert.equal(tail.length,DOC_META.tail.bytes);assert.equal(sha(tail),DOC_META.tail.sha256);
 assert.equal(blob(doc),git(['rev-parse','HEAD:'+DOC]));
 return {source:process.env.GITHUB_SHA,tree:git(['rev-parse','HEAD^{tree}']),parent:PARENT,parentTree:TREE,pid:process.pid,critical,helper:meta(regular(SELF)),data:DATA_PIN,canonicalBlobs:5380,productAdoption:false,manualPixelReview:'PENDING',live:false};
}
function sourceSnapshot(){const files=cp.execFileSync('git',['ls-files','-z'],{cwd:ROOT}).toString().split('\0');assert.equal(files.pop(),'');assert.equal(files.length,5380);return Object.fromEntries(files.map(file=>{const p=path.join(ROOT,file);assert(fs.realpathSync(p).startsWith(ROOT+path.sep));return[file,meta(regular(p))];}));}
function sourceHold(label){const after=sourceSnapshot();assert.deepEqual(after,json('source.before.json'));assert.equal(git(['status','--porcelain','--untracked-files=all']),'');save(label+'-canonical-hold.json',{source:process.env.GITHUB_SHA,pid:process.pid,current:after,allBodiesHeld:true});}
function snapshotShadow(allowDist=false){
 const link=path.join(SHADOW,'node_modules');assert(fs.lstatSync(link).isSymbolicLink());assert.equal(fs.realpathSync(link),fs.realpathSync(path.join(ROOT,'node_modules')));
 const rows={};function walk(dir,rel=''){for(const name of fs.readdirSync(dir).sort()){const r=rel?rel+'/'+name:name,p=path.join(dir,name),st=fs.lstatSync(p);if(r==='node_modules')continue;assert(!st.isSymbolicLink(),'CM_MINIMIZE_SHADOW_SOURCE_LINK');if(r==='dist'&&allowDist){assert(st.isDirectory());continue;}if(st.isDirectory())walk(p,r);else{assert(st.isFile());rows[r]=meta(regular(p));}}}
 walk(SHADOW);return rows;
}
function shadowHold(label,allowDist=false){const actual=snapshotShadow(allowDist);assert.deepEqual(actual,json('shadow-source.before.json'));save(label+'-shadow-hold.json',{source:process.env.GITHUB_SHA,pid:process.pid,current:actual,distIsSeparate:allowDist});}
function replay(body,stages){
 const original=body.toString('utf8');let text=original;const history=[];
 for(const s of stages){
  same(Buffer.from(text),{bytes:s.stageBeforeBytes,sha256:s.stageBeforeSha256,gitBlob:s.stageBeforeGitBlob});
  assert(s.before.length>0);const positions=[];for(let at=text.indexOf(s.before);at>=0;at=text.indexOf(s.before,at+s.before.length))positions.push(at);
  assert.equal(positions.length,s.occurrences);assert.deepEqual(positions,s.beforePositions);assert.deepEqual(positions.map(at=>Buffer.byteLength(text.slice(0,at))),s.beforeUtf8Positions);
  let next=text;for(let i=positions.length-1;i>=0;i--)next=next.slice(0,positions[i])+s.after+next.slice(positions[i]+s.before.length);
  same(Buffer.from(next),{bytes:s.stageAfterBytes,sha256:s.stageAfterSha256,gitBlob:s.stageAfterGitBlob});
  const after=positions.map((at,i)=>at+i*(s.after.length-s.before.length));assert.deepEqual(after,s.afterPositions);assert.deepEqual(after.map(at=>Buffer.byteLength(next.slice(0,at))),s.afterUtf8Positions);
  let inverse=next;for(let i=after.length-1;i>=0;i--){assert.equal(inverse.slice(after[i],after[i]+s.after.length),s.after);inverse=inverse.slice(0,after[i])+s.before+inverse.slice(after[i]+s.after.length);}assert.equal(inverse,text);
  history.push({s,after,before:text});text=next;
 }
 let inverse=text;for(let k=history.length-1;k>=0;k--){const {s,after,before}=history[k];for(let i=after.length-1;i>=0;i--)inverse=inverse.slice(0,after[i])+s.before+inverse.slice(after[i]+s.after.length);assert.equal(inverse,before);}assert.equal(inverse,original);return Buffer.from(text);
}
function createShadow(){
 assert(!fs.existsSync(SHADOW));fs.mkdirSync(SHADOW);const before=json('source.before.json');
 for(const [file,pin]of Object.entries(before)){assert(!path.isAbsolute(file)&&!file.split('/').includes('..'));const to=path.join(SHADOW,file);fs.mkdirSync(path.dirname(to),{recursive:true});fs.copyFileSync(path.join(ROOT,file),to,fs.constants.COPYFILE_EXCL);same(regular(to),pin);}
 fs.symlinkSync(path.join(ROOT,'node_modules'),path.join(SHADOW,'node_modules'),'dir');
 assert.deepEqual(snapshotShadow(),before);save('shadow-baseline-source.json',snapshotShadow());
}
function installCandidate(){
 const rows=[];
 for(const spec of DATA.overlays){const file=path.join(SHADOW,spec.file),prior=spec.basis?regular(file):Buffer.alloc(0);if(spec.basis)same(prior,spec.basis);else assert(!fs.existsSync(file));const next=spec.basis?replay(prior,spec.stages):Buffer.from(spec.newBody);same(next,spec.candidate);assert(!next.equals(prior));
  const dir=path.join(OUT,'overlay-source',spec.file);fs.mkdirSync(path.dirname(dir),{recursive:true});fs.writeFileSync(dir+'.before',prior,{flag:'wx'});fs.writeFileSync(dir+'.candidate',next,{flag:'wx'});fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,next,{flag:spec.basis?'w':'wx'});same(regular(file),spec.candidate);rows.push({file:spec.file,before:meta(prior),candidate:meta(next),stages:spec.stages.length});
 }
 const after=snapshotShadow();assert.equal(Object.keys(after).length,5381);save('shadow-source.before.json',after);save('candidate-overlay.json',{source:process.env.GITHUB_SHA,pid:process.pid,rows,canonicalAdoption:false});
 const caps=Buffer.from(DATA.capsPreload.body);same(caps,DATA.capsPreload.pin);write('caps-preload.cjs',caps);
}
function native(id,status){
 const r=json(id+'.closed.json');assert.equal(r.id,id);
 assert(Number.isInteger(r.pid)&&r.pid>0,'BUILD_XI_NATIVE_PID');
 assert.equal(r.status,status,'BUILD_XI_NATIVE_STATUS');assert.equal(r.signal,null);assert.equal(r.error,null);
 assert.equal(r.closed,true);assert.equal(r.deadlineExpired,false);assert.deepEqual(r.signalAttempts,[]);
 assert.equal(r.receiptBytes,0);assert.equal(regular(output(id+'.transport')).length,0);
 for(const stream of ['stdout','stderr']){const b=regular(output(id+'.'+stream));assert.equal(b.length,r[stream+'Bytes']);assert.equal(sha(b),r[stream+'Sha256']);}
 return r;
}
async function run(id,args,status,deadlineMs,extra={},command=process.execPath,cwd=ROOT){
 const receipt=output(id+'.transport');write(id+'.transport','');
 const so=fs.openSync(output(id+'.stdout'),'wx'),se=fs.openSync(output(id+'.stderr'),'wx');
 const r={id,command,args,cwd,overrides:extra,startedAt:new Date().toISOString(),pid:null,status:null,signal:null,error:null,closed:false,deadlineMs,deadlineExpired:false,signalAttempts:[]};
 const child=cp.spawn(command,args,{cwd,detached:true,stdio:['ignore',so,se],env:{...process.env,NODE_OPTIONS:'--require='+path.join(ROOT,'scripts/lib/offlineTransport.cjs'),SIM_OFFLINE_RECEIPT:receipt,SIM_NETWORK:'offline',...extra}});
 r.pid=child.pid??null;save(id+'.start.json',r);
 let term=null,kill=null;
 const signalGroup=signal=>{const a={signal,at:new Date().toISOString(),error:null};try{process.kill(-child.pid,signal);}catch(e){a.error={name:e.name,message:e.message,code:e.code??null};}r.signalAttempts.push(a);};
 if(child.pid)term=setTimeout(()=>{r.deadlineExpired=true;signalGroup('SIGTERM');kill=setTimeout(()=>{if(!r.closed)signalGroup('SIGKILL');},15000);},deadlineMs);
 child.on('error',e=>r.error={name:e.name,message:e.message,code:e.code??null});
 await new Promise(resolve=>child.on('close',(code,signal)=>{r.status=code;r.signal=signal;r.closed=true;r.closedAt=new Date().toISOString();resolve();}));
 if(term)clearTimeout(term);if(kill)clearTimeout(kill);fs.closeSync(so);fs.closeSync(se);
 r.receiptBytes=regular(receipt).length;
 for(const stream of ['stdout','stderr']){const b=regular(output(id+'.'+stream));r[stream+'Bytes']=b.length;r[stream+'Sha256']=sha(b);}
 save(id+'.closed.json',r);return {record:r,expectedStatus:status};
}



function noInfrastructure(id){const logs=regular(output(id+'.stdout')).toString()+'\n'+regular(output(id+'.stderr')).toString();assert(!/Unhandled (?:Errors?|Rejection|Exception)|Cannot find module|Cannot find package|SyntaxError|ReferenceError|TimeoutError|Test timed out|Failed to load/i.test(logs),'CM_MINIMIZE_NO_INFRASTRUCTURE_CREDIT');}
function browserAdmission(id,control){
 const row=native(id,control?1:0);noInfrastructure(id);
 const text=regular(output(id+'.stdout')).toString(),lines=text.split(/\r?\n/);
 if(control){assert.equal(lines.filter(s=>/^playLiveMatchFit: control tabout turned section 6 red on the line it must \(with every Tab swallowed before the stage heard it, the focus reached the page under the stage [1-9][0-9]* times\) and left the rest green\.$/.test(s)).length,1);}
 else assert.equal(lines.filter(s=>s==='playLiveMatchFit: all green. The goal in order, reduced motion, the fit at five sizes, nothing moves the page, the reload, Back, a wide screen, an own goal drawn as one.').length,1);
 const dir=path.join(OUT,id),obs=regular(path.join(dir,'observations.jsonl'));assert(obs.length>0,'CM_MINIMIZE_RAW_CAPTURE_PRESENT');
 return {id,pid:row.pid,status:row.status,observations:meta(obs),manualGeometryAndPixelReview:'PENDING'};
}
function distSnapshot(){const rows={};function walk(dir,rel=''){for(const name of fs.readdirSync(dir).sort()){const file=path.join(dir,name),r=rel?rel+'/'+name:name,st=fs.lstatSync(file);assert(!st.isSymbolicLink());if(st.isDirectory())walk(file,r);else{assert(st.isFile());rows[r]=meta(regular(file));}}}walk(path.join(SHADOW,'dist'));return rows;}
async function caps(){
 write('server.transport','');const so=fs.openSync(output('server.stdout'),'wx'),se=fs.openSync(output('server.stderr'),'wx');
 const record={id:'server',args:['scripts/lib/hostLikeServer.mjs','dist','4173'],pid:null,status:null,signal:null,error:null,closed:false,ownedShutdown:false,signalAttempts:[]};
 const server=cp.spawn(process.execPath,record.args,{cwd:SHADOW,stdio:['ignore',so,se],env:{...process.env,NODE_OPTIONS:'--require='+path.join(ROOT,'scripts/lib/offlineTransport.cjs'),SIM_OFFLINE_RECEIPT:output('server.transport'),SIM_NETWORK:'offline'}});record.pid=server.pid??null;save('server.start.json',record);
 const done=new Promise(resolve=>{server.on('error',e=>record.error={name:e.name,message:e.message,code:e.code??null});server.on('close',(status,signal)=>{record.status=status;record.signal=signal;record.closed=true;for(const stream of ['stdout','stderr']){const body=regular(output('server.'+stream));record[stream+'Bytes']=body.length;record[stream+'Sha256']=sha(body);}fs.closeSync(so);fs.closeSync(se);save('server.closed.json',record);resolve();});});
 try{
  for(let i=0;;i++){assert(!record.closed);try{const res=await fetch('http://127.0.0.1:4173/');assert(res.ok);await res.arrayBuffer();break;}catch(e){if(i===9)throw e;await new Promise(r=>setTimeout(r,500));}}
  await run('caps',['scripts/sweepWeight.mjs'],0,300000,{BASE:'http://127.0.0.1:4173',SWEEP_BASE:'http://127.0.0.1:4173',SWEEP_OFFLINE:'1',NODE_OPTIONS:'--require='+path.join(ROOT,'scripts/lib/offlineTransport.cjs')+' --require='+output('caps-preload.cjs')},process.execPath,SHADOW);native('caps',0);
 }finally{
  if(!record.closed){record.ownedShutdown=true;record.signalAttempts.push({signal:'SIGTERM',accepted:server.kill('SIGTERM')});const timer=setTimeout(()=>{if(!record.closed)record.signalAttempts.push({signal:'SIGKILL',accepted:server.kill('SIGKILL')});},15000);try{await done;}finally{clearTimeout(timer);}}
 }
 assert(record.closed&&Number.isInteger(record.pid)&&record.pid>0&&!record.error&&record.ownedShutdown&&record.signal==='SIGTERM');assert.equal(regular(output('server.transport')).length,0);
}
const ids=()=>['types-baseline','types-candidate','build',...DATA.readers,'caps','normal','tabout'];
async function execute(){
 if(mode==='source'){save('source-binding.json',binding());save('source.before.json',sourceSnapshot());return;}
 if(mode==='checks'){
  save('orchestrator.start.json',{pid:process.pid,source:process.env.GITHUB_SHA});createShadow();
  await run('types-baseline',[path.join(ROOT,'node_modules/typescript/bin/tsc'),'--noEmit','-p','tsconfig.app.json'],0,240000,{},process.execPath,SHADOW);native('types-baseline',0);sourceHold('baseline');
  assert.deepEqual(snapshotShadow(),json('shadow-baseline-source.json'));installCandidate();
  await run('types-candidate',[path.join(ROOT,'node_modules/typescript/bin/tsc'),'--noEmit','-p','tsconfig.app.json'],0,240000,{},process.execPath,SHADOW);native('types-candidate',0);shadowHold('types');
  await run('build',['run','build'],0,900000,{},'npm',SHADOW);native('build',0);shadowHold('build',true);sourceHold('build');
  const dist=distSnapshot();save('dist.before.json',dist);cp.execFileSync('tar',['-cf',output('dist.tar'),'-C',path.join(SHADOW,'dist'),'.']);
  for(const reader of DATA.readers){await run(reader,['scripts/'+reader+'.mjs'],0,180000,{},process.execPath,SHADOW);native(reader,0);}
  await caps();
  const browsers=[];
  for(const role of ['normal','tabout']){
   const dir=path.join(OUT,role);fs.mkdirSync(dir);fs.mkdirSync(path.join(dir,'pngs'));
   const extra={CM_MINIMIZE_QA_OUT:dir,CM_MINIMIZE_QA_ROLE:role,LIVE_FIT_SHOTS:path.join(dir,'pngs'),PORT:'4191'};
   if(role==='tabout')extra.LIVE_FIT_CONTROL='tabout';
   await run(role,['scripts/playLiveMatchFit.mjs'],role==='tabout'?1:0,900000,extra,process.execPath,SHADOW);
   browsers.push(browserAdmission(role,role==='tabout'));shadowHold(role,true);sourceHold(role);assert.deepEqual(distSnapshot(),dist);
  }
  save('automated-admission.json',{source:process.env.GITHUB_SHA,pid:process.pid,browsers,readers:DATA.readers,supervised:24,capsSourceUnchanged:true,canonicalProductAdopted:false,manualGeometryAndOriginalPixels:'PENDING',fullSuite:false,live:false});return;
 }
 if(mode==='final'){
  const before=json('source-binding.json'),now=binding();assert.deepEqual(now.critical,before.critical);assert.deepEqual(now.helper,before.helper);assert.deepEqual(now.data,before.data);sourceHold('final');shadowHold('final',true);assert.deepEqual(distSnapshot(),json('dist.before.json'));
  const rows=ids().map(id=>native(id,id==='tabout'?1:0));assert.equal(rows.length,24);for(const id of ids())noInfrastructure(id);
  browserAdmission('normal',false);browserAdmission('tabout',true);for(const spec of DATA.overlays)same(regular(path.join(SHADOW,spec.file)),spec.candidate);
  const server=json('server.closed.json');assert(server.closed&&server.ownedShutdown&&!server.error&&server.signal==='SIGTERM');assert.equal(regular(output('server.transport')).length,0);
  const outer=[before.pid,json('orchestrator.start.json').pid,process.pid];assert(outer.every(pid=>Number.isInteger(pid)&&pid>0));assert.equal(new Set([...rows.map(r=>r.pid),server.pid,...outer]).size,28);
  for(const name of ['foundation','orchestrator']){assert.equal(regular(output(name+'.exit')).toString().trim(),'0');assert.equal(regular(output(name+'.transport')).length,0);}
  save('native-selected-processes.json',{source:process.env.GITHUB_SHA,rows,server,outerPids:outer,selectedSupervisedCommands:24,guardedHostServer:1,outerGuardedCohorts:3,selectedCohorts:28,scope:'Selected commands/cohorts only. Internal browser hosts, Chromium renderers and other descendants are not assigned separate receipt credit.'});
  save('final-binding.json',{source:process.env.GITHUB_SHA,pid:process.pid,parent:PARENT,allCanonicalSourcesHeld:true,candidateShadowSourceHeld:true,distHeldAfterBuild:true,manualGeometryAndOriginalPixels:'PENDING',protectedIntegration:false,fullSuite:false,live:false});return;
 }
 throw Error('Unknown Minimize helper mode');
}
await execute();
}
main(process.argv[2]).then(()=>console.log('CM Minimize qualification '+process.argv[2]+' complete, pid '+process.pid)).catch(error=>{console.error(error.stack||error);process.exitCode=1;});
