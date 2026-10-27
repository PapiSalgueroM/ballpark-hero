'use strict';
async function main(mode) {
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const ROOT=fs.realpathSync(process.cwd()),OUT=fs.realpathSync(process.env.CM_MINIMIZE_OUT),SHADOW=path.resolve(process.env.CM_MINIMIZE_SHADOW),SELF=fs.realpathSync(__filename);
const PARENT='f2fc488bc0d58f9a0d7b0d96f502dac907dd48e7',TREE='5a05ae37ca03157ec983df887dfbb1a00854364f',FOUNDATION='12c1b2cd001f9309a31a887e5c432ca63c373852',FOUNDATION_TREE='74358aec6fc334a3507aa202a2a86cad4142f6a7';
const WF='.github/workflows/cm-minimize-qualification.yml',HELPER='scripts/qa/cmMinimizeQualification.cjs',DOC='docs/PROJECT-STATE.md';
const DATA_PIN={"gitBlob":"c11e5d7b9c77d49f0c477894ba677a07eafad44f","bytes":33205,"sha256":"07eb2b7fa41e5cea00e25874d2e3c12754cb0ad477f775d3651cdd5799accdc2"},DOC_META={"tail":{"path":"C:\\Users\\antho\\dukb-handoff\\2026-10-24\\cm-minimize-generation-qualification-proposal-v2\\PROJECT-STATE.append.md","bytes":1484,"sha256":"99f9f68d95f99fbd33f942d06495acafd3ddb94205972a6a863f6c9d92f1583a","gitBlob":"825446a1152bb760edb07d0659a3e885d236359d"},"parent":{"bytes":1861160,"sha256":"ae6b67079f154d4e8a8e74bdf661a16afb5a84708d973c3c2d4f81b99c1eb6c5","gitBlob":"cff4928c19496e83e5fec928c87a1b2223791344"},"candidate":{"bytes":1862644,"sha256":"5fbfccb78642ac161f0248de50167c78d4b2d2b8d9803ba4fa3814a94aca5ec0","gitBlob":"ccc398903f41203b0b957e00753ffc8f3197ca58"}};
const GENERATION_PINS=[{"bytes":50126,"file":"scripts/prerender.mjs","sha256":"9eb04f0d5fa75aa2f073475f4b5e3c8243326bd148bc7cc5049a7ba5c1ddc80f","gitBlob":"3d4fb1e595413c48c7bd65b927730d25cc3a2e18"},{"bytes":21388,"file":"scripts/genSitemap.mjs","sha256":"f3e6d4dc051ca484d39f36386381c5211e4847bc203e1e223dc5f54f6105fafc","gitBlob":"08344dfc84be3ca24533c8d56e0f229b02b93c0a"},{"bytes":6039,"file":"scripts/lib/atomicWrite.mjs","sha256":"c2f21d05e485543d8e96a157ef47ecddfd1645578bf88e71842a103dea82015c","gitBlob":"0086680dfc663bb133d0a8c555180c7f6bc4a0a7"},{"bytes":1176,"file":"scripts/lib/prerenderClock.mjs","sha256":"345e979b512b2c20172d8f4677efc2e684d9ed27521485066feb389927fcca31","gitBlob":"da0aa64a36581e239563bccc6844713930e1fe0d"},{"bytes":2414,"file":"scripts/lib/retiredRoutes.mjs","sha256":"2fa68d81241425e9097e3608caeaeafef3031b05d57c3c17b896f4b2a32f4470","gitBlob":"d5f0d43f11bef6a15ee23f0c1a77f7667da1a519"},{"bytes":381239,"file":"public/whats-new/index.html","sha256":"ab330ed3dbc6ee03fefb29a31b09e4764be56bd4a6c486fd0428b650643d7a08","gitBlob":"70f5e100156278fa6fbbdc97222d39fc11996aa8"},{"bytes":14709,"file":"scripts/data/lastmod.json","sha256":"d7359465752272ccf3a4c8e83cac997b2a99908fa39afb177555ad182172c611","gitBlob":"4b42fe4dce574ea8f7adece96743a17e921f126e"},{"bytes":25678,"file":"public/sitemap.xml","sha256":"026b74bb2968bb9d73760bc3e2af8a3a8c168e2678c758daf0feeba21dc9f013","gitBlob":"c84e14c3a74738ca2daf6daec937187e9dae00b2"},{"bytes":1849,"file":"public/llms.txt","sha256":"5f1dd7052088ff6ade839abff67bf1c8e4b8bc3e029f0f47e55d744157614876","gitBlob":"453a6e0809eee7688b484bee12c83dfe8a50eca1"},{"bytes":410688,"file":"src/pages/WhatsNew.tsx","sha256":"093717189479315805235fcfbe339eab7b2296be3bdc83099fa2a78416c44310","gitBlob":"8f6ee0b04cb5d480db288f05af51547c51117f6c"}],PARENT_QA={".github/workflows/cm-minimize-qualification.yml":{"gitBlob":"1ece2a08b3f323f792ea7878e65afdb4114576e6","bytes":27890,"sha256":"00121656d54fc68ce12039cd10602816a1c346764c5eac058695d028e79529a6"},"scripts/qa/cmMinimizeQualification.cjs":{"gitBlob":"f74bc1d2ea410015933ce2354e0fb9907bec67b4","bytes":19906,"sha256":"ddb32466fc66d4a85a60ecc07a52aac6198799a16457f0c99ccb558e517b6c90"}},PRERENDER_FONTS_PIN={"gitBlob":"925092499944f0447beed2e422609163bfb29b96","bytes":3322,"sha256":"60f9173a5ddab72df4cb41b93df389a7c8a21a8c0ecf310bbac2c3d57ee95d11"};
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
assert.equal(DATA.format,1);assert.equal(DATA.parent,FOUNDATION);assert.equal(DATA.parentTree,FOUNDATION_TREE);assert.equal(DATA.overlays.length,3);assert.equal(DATA.readers.length,18);
assert(OUT!==ROOT&&!OUT.startsWith(ROOT+path.sep)&&SHADOW!==ROOT&&!SHADOW.startsWith(ROOT+path.sep)&&SHADOW!==OUT&&!SHADOW.startsWith(OUT+path.sep));
function binding(){
 assert.equal(process.env.CM_MINIMIZE_PHASE,'detached-ui');
 assert.equal(process.env.GITHUB_REPOSITORY,'PapiSalgueroM/ballpark-hero');
 assert.equal(process.env.GITHUB_REPOSITORY_ID,'1195729679');
 assert.equal(process.env.GITHUB_REF,'refs/heads/codex/cm-minimize-generation-shadow-20261027');
 assert.equal(git(['rev-parse','HEAD']),process.env.GITHUB_SHA);
 assert.equal(git(['show','-s','--format=%P','HEAD']),PARENT);
 assert.equal(git(['rev-parse',PARENT+'^{tree}']),TREE);
 assert.equal(git(['rev-parse',FOUNDATION+'^{tree}']),FOUNDATION_TREE);
 assert.equal(process.env.NODE_OPTIONS,'--require='+path.join(ROOT,'scripts/lib/offlineTransport.cjs'));
 assert.equal(process.env.SIM_NETWORK,'offline');
 for(const name of Object.keys(process.env))if(/^(?:LIVE_FIT_|PRERENDER_|NO_DOUBLE_SWAP$|SIM_SEED$|NODE_PATH$|VITEST$|ONLY$)/.test(name))assert.fail('CM_MINIMIZE_INHERITED_OVERRIDE '+name);
 assert.equal(process.env.RC_OUT,undefined);assert.equal(process.env.FONT_CACHE_USE_RECEIPT,undefined);
 const expected=['M\t'+WF,'M\t'+DOC,'M\t'+HELPER].sort();
 assert.deepEqual(git(['diff','--name-status',PARENT,'HEAD']).split('\n').sort(),expected);
 assert.deepEqual(git(['diff','--name-status',FOUNDATION,'HEAD']).split('\n').sort(),['A\t'+WF,'M\t'+DOC,'A\t'+HELPER].sort());
 for(const file of [WF,HELPER]){const body=cp.execFileSync('git',['show',PARENT+':'+file],{cwd:ROOT,maxBuffer:2*1024*1024});same(body,PARENT_QA[file]);assert.equal(git(['rev-parse',PARENT+':'+file]),PARENT_QA[file].gitBlob);}
 const critical={};
 for(const p of DATA.critical){const body=regular(path.join(ROOT,p.path));same(body,p);assert.equal(git(['rev-parse','HEAD:'+p.path]),p.gitBlob);assert.equal(git(['rev-parse',PARENT+':'+p.path]),p.gitBlob);critical[p.path]=meta(body);}
 for(const pin of GENERATION_PINS){same(regular(path.join(ROOT,pin.file)),pin);assert.equal(git(['rev-parse','HEAD:'+pin.file]),pin.gitBlob);assert.equal(git(['rev-parse',PARENT+':'+pin.file]),pin.gitBlob);critical[pin.file]=meta(regular(path.join(ROOT,pin.file)));}
 same(regular(output('prerender-fonts.cjs')),PRERENDER_FONTS_PIN);
 const parent=cp.execFileSync('git',['show',PARENT+':'+DOC],{cwd:ROOT,maxBuffer:4*1024*1024}),doc=regular(path.join(ROOT,DOC));same(parent,DOC_META.parent);same(doc,DOC_META.candidate);
 assert(doc.subarray(0,parent.length).equals(parent));const tail=doc.subarray(parent.length);assert.equal(tail.length,DOC_META.tail.bytes);assert.equal(sha(tail),DOC_META.tail.sha256);
 assert.equal(blob(doc),git(['rev-parse','HEAD:'+DOC]));
 return {source:process.env.GITHUB_SHA,tree:git(['rev-parse','HEAD^{tree}']),parent:PARENT,parentTree:TREE,foundation:FOUNDATION,foundationTree:FOUNDATION_TREE,prerenderPreload:PRERENDER_FONTS_PIN,pid:process.pid,critical,helper:meta(regular(SELF)),data:DATA_PIN,canonicalBlobs:5380,productAdoption:false,manualPixelReview:'PENDING',live:false};
}
function sourceSnapshot(){const files=cp.execFileSync('git',['ls-files','-z'],{cwd:ROOT}).toString().split('\0');assert.equal(files.pop(),'');assert.equal(files.length,5380);return Object.fromEntries(files.map(file=>{const p=path.join(ROOT,file);assert(fs.realpathSync(p).startsWith(ROOT+path.sep));return[file,meta(regular(p))];}));}
function sourceHold(label){const after=sourceSnapshot();assert.deepEqual(after,json('source.before.json'));assert.equal(git(['status','--porcelain','--untracked-files=all']),'');save(label+'-canonical-hold.json',{source:process.env.GITHUB_SHA,pid:process.pid,current:after,allBodiesHeld:true});}
function snapshotShadow(allowDist=false){
 const link=path.join(SHADOW,'node_modules');assert(fs.lstatSync(link).isSymbolicLink());assert.equal(fs.realpathSync(link),fs.realpathSync(path.join(ROOT,'node_modules')));
 const rows={};function walk(dir,rel=''){for(const name of fs.readdirSync(dir).sort()){const r=rel?rel+'/'+name:name,p=path.join(dir,name),st=fs.lstatSync(p);if(r==='node_modules')continue;assert(!st.isSymbolicLink(),'CM_MINIMIZE_SHADOW_SOURCE_LINK');if(r==='dist'&&allowDist){assert(st.isDirectory());continue;}if(st.isDirectory())walk(p,r);else{assert(st.isFile());rows[r]=meta(regular(p));}}}
 walk(SHADOW);return rows;
}
function shadowHold(label,allowDist=false){const actual=snapshotShadow(allowDist),expected=fs.existsSync(output('generation-admission.json'))?'shadow-source.generated.json':'shadow-source.before.json';assert.deepEqual(actual,json(expected));save(label+'-shadow-hold.json',{source:process.env.GITHUB_SHA,pid:process.pid,current:actual,distIsSeparate:allowDist});}
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
const GENERATED=['public/whats-new/index.html','scripts/data/lastmod.json','public/sitemap.xml'];
function generationScope(before,after){
 assert.deepEqual(Object.keys(after).sort(),Object.keys(before).sort(),'CM_MINIMIZE_GENERATED_MEMBERS');
 const changed=Object.keys(before).filter(file=>JSON.stringify(before[file])!==JSON.stringify(after[file])).sort();
 assert(changed.every(file=>GENERATED.includes(file)),'CM_MINIMIZE_GENERATED_SCOPE');
 assert(changed.includes('public/whats-new/index.html'),'CM_MINIMIZE_SNAPSHOT_REALLY_CHANGED');
 return changed;
}
function judgeLedger(before,after){
 assert.deepEqual(Object.keys(after).sort(),Object.keys(before).sort(),'CM_MINIMIZE_LEDGER_MEMBERS');
 assert.equal(after.__version,before.__version,'CM_MINIMIZE_LEDGER_VERSION_HELD');
 for(const key of Object.keys(before))if(key!=='/whats-new')assert.deepEqual(after[key],before[key],'CM_MINIMIZE_LEDGER_OTHER_ROUTE_HELD');
 const old=before['/whats-new'],now=after['/whats-new'];assert(old&&now);
 assert.deepEqual(Object.keys(now).sort(),Object.keys(old).sort());assert.equal(typeof now.hash,'string');assert.notEqual(now.hash,old.hash,'CM_MINIMIZE_WHATS_NEW_FINGERPRINT_CHANGED');
 assert.match(now.date,/^\d{4}-\d{2}-\d{2}$/);
}
function sitemapRows(text){
 const rows=new Map(),names=[],pattern=/<url>[\s\S]*?<\/url>/g;
 for(const match of text.matchAll(pattern)){const loc=match[0].match(/<loc>([^<]+)<\/loc>/);assert(loc&&!rows.has(loc[1]));rows.set(loc[1],match[0]);names.push(loc[1]);}
 assert(names.length>0);return {rows,names,skeleton:text.replace(pattern,'__URL_ROW__')};
}
function sitemapHeaderDate(text){
 const pattern=/(^  Generated by scripts\/genSitemap\.mjs from src\/App\.tsx routes plus\n  src\/data\/gameRegistry\.ts on )(\d{4}-\d{2}-\d{2})( \(Round 148\)\. Redirect routes are$)/gm;
 const matches=[...text.matchAll(pattern)];assert.equal(matches.length,1,'CM_MINIMIZE_SITEMAP_GENERATOR_HEADER');
 const match=matches[0],at=match.index+match[1].length;
 return text.slice(0,at)+'__GENERATOR_DATE__'+text.slice(at+match[2].length);
}
function judgeSitemap(before,after,ledger){
 const a=sitemapRows(before),b=sitemapRows(after),target='https://douknowball.com/whats-new';
 assert.deepEqual(b.names,a.names,'CM_MINIMIZE_SITEMAP_MEMBERS');assert.equal(sitemapHeaderDate(b.skeleton),sitemapHeaderDate(a.skeleton),'CM_MINIMIZE_SITEMAP_STRUCTURE');
 for(const loc of a.names)if(loc!==target)assert.equal(b.rows.get(loc),a.rows.get(loc),'CM_MINIMIZE_SITEMAP_OTHER_ROUTE_HELD');
 const scrub=text=>text.replace(/<lastmod>[^<]*<\/lastmod>/,'<lastmod>__DATE__</lastmod>');
 assert(a.rows.has(target)&&b.rows.has(target));assert.equal(scrub(b.rows.get(target)),scrub(a.rows.get(target)),'CM_MINIMIZE_WHATS_NEW_ROUTE_FACTS_HELD');
 const date=b.rows.get(target).match(/<lastmod>([^<]+)<\/lastmod>/);assert(date);assert.equal(date[1],ledger['/whats-new'].date,'CM_MINIMIZE_GENERATED_DATE_PAIR');
}
function captureGenerationBefore(){
 const dir=path.join(OUT,'generated-sources');fs.mkdirSync(dir);
 for(const file of GENERATED){const to=path.join(dir,file+'.before');fs.mkdirSync(path.dirname(to),{recursive:true});fs.writeFileSync(to,regular(path.join(SHADOW,file)),{flag:'wx'});}
 save('generation-source.before.json',snapshotShadow(true));
}
function copiedGenerationControl(id,body,mutate,judge,marker){
 const dir=path.join(OUT,'generation-controls',id);fs.mkdirSync(dir,{recursive:true});const work=path.join(dir,'work');
 for(const name of ['before','work'])fs.writeFileSync(path.join(dir,name),body,{flag:'wx'});
 const row={id,pid:process.pid,diagnosticCounts:[0],nativeProcessesAdded:0,changed:false,fullRestoration:false,error:null,before:meta(body)};judge(regular(work));
 try{
  const changed=mutate(body);assert(!changed.equals(body),'CM_MINIMIZE_GENERATION_CONTROL_CHANGED');
  fs.writeFileSync(work,changed);fs.writeFileSync(path.join(dir,'changed'),regular(work),{flag:'wx'});row.changed=true;row.changedBody=meta(changed);
  try{judge(regular(work));}catch(error){assert(error instanceof assert.AssertionError);assert(error.message.includes(marker));row.error={name:error.name,message:error.message,stack:error.stack};}
  assert(row.error&&row.error.stack,'CM_MINIMIZE_GENERATION_CONTROL_OWNED');row.diagnosticCounts.push(1);
 }finally{fs.writeFileSync(work,body);fs.writeFileSync(path.join(dir,'restored'),regular(work),{flag:'wx'});row.fullRestoration=regular(work).equals(body);assert(row.fullRestoration);}
 judge(regular(work));row.diagnosticCounts.push(0);assert.deepEqual(row.diagnosticCounts,[0,1,0]);row.restored=meta(regular(work));fs.writeFileSync(path.join(dir,'diagnostics.json'),JSON.stringify(row,null,2)+'\n',{flag:'wx'});return row;
}
function admitGeneration(){
 const before=json('generation-source.before.json'),after=snapshotShadow(true),changed=generationScope(before,after);
 const oldLedger=JSON.parse(regular(path.join(OUT,'generated-sources/scripts/data/lastmod.json.before'))),ledgerBody=regular(path.join(SHADOW,'scripts/data/lastmod.json')),ledger=JSON.parse(ledgerBody);
 const oldSitemap=regular(path.join(OUT,'generated-sources/public/sitemap.xml.before')).toString(),sitemapBody=regular(path.join(SHADOW,'public/sitemap.xml')),sitemap=sitemapBody.toString();
 judgeLedger(oldLedger,ledger);judgeSitemap(oldSitemap,sitemap,ledger);
 const rows=[];
 for(const file of GENERATED){const actual=regular(path.join(SHADOW,file)),original=regular(path.join(OUT,'generated-sources',file+'.before'));const dest=path.join(OUT,'generated-sources',file+'.generated');fs.writeFileSync(dest,actual,{flag:'wx'});rows.push({file,before:meta(original),after:meta(actual),changed:!actual.equals(original)});}
 const controls=[];
 controls.push(copiedGenerationControl('outside-generated-scope',Buffer.from(JSON.stringify(after,null,2)+'\n'),body=>{const value=JSON.parse(body),pin=value['public/llms.txt'];assert(pin);pin.sha256=(pin.sha256[0]==='0'?'1':'0')+pin.sha256.slice(1);return Buffer.from(JSON.stringify(value,null,2)+'\n');},body=>generationScope(before,JSON.parse(body)),'CM_MINIMIZE_GENERATED_SCOPE'));
 controls.push(copiedGenerationControl('other-ledger-route',ledgerBody,body=>{const value=JSON.parse(body),key=Object.keys(value).find(key=>key!=='__version'&&key!=='/whats-new');assert(key&&value[key].date!=='1900-01-01');value[key].date='1900-01-01';return Buffer.from(JSON.stringify(value,null,2)+'\n');},body=>judgeLedger(oldLedger,JSON.parse(body)),'CM_MINIMIZE_LEDGER_OTHER_ROUTE_HELD'));
 controls.push(copiedGenerationControl('other-sitemap-route',sitemapBody,body=>{const value=body.toString(),view=sitemapRows(value),key=view.names.find(loc=>loc!=='https://douknowball.com/whats-new'),row=view.rows.get(key);assert(row&&!row.includes('<lastmod>1900-01-01</lastmod>'));return Buffer.from(value.replace(row,row.replace(/<lastmod>[^<]+<\/lastmod>/,'<lastmod>1900-01-01</lastmod>')));},body=>judgeSitemap(oldSitemap,body.toString(),ledger),'CM_MINIMIZE_SITEMAP_OTHER_ROUTE_HELD'));
 controls.push(copiedGenerationControl('generator-header-text',sitemapBody,body=>{const value=body.toString(),from='  Generated by scripts/genSitemap.mjs from src/App.tsx routes plus\n  src/data/gameRegistry.ts on ';assert.equal(value.split(from).length-1,1);return Buffer.from(value.replace(from,from.replace(' on ',' at ')));},body=>judgeSitemap(oldSitemap,body.toString(),ledger),'CM_MINIMIZE_SITEMAP_GENERATOR_HEADER'));
 save('generation-controls.json',{source:process.env.GITHUB_SHA,pid:process.pid,rows:controls,nativeProcessesAdded:0,scope:'Copied actual completed source-manifest/ledger/sitemap records. In-process0/1/0 diagnostics, not four native exits or product source mutations.'});
 save('shadow-source.generated.json',after);
 save('generation-admission.json',{source:process.env.GITHUB_SHA,pid:process.pid,allowed:GENERATED,changed,rows,otherSourceBodiesHeld:true,allOtherLedgerAndSitemapRowsHeld:true,llmsHeld:true,otherRoutes:Object.keys(oldLedger).filter(key=>key!=='__version'&&key!=='/whats-new').length,copiedRecordControls:4});
}

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
const ids=()=>['types-baseline','types-candidate','build','prerender-whats-new','sitemap','build-final',...DATA.readers,'caps','normal','tabout'];
async function execute(){
 if(mode==='source'){save('source-binding.json',binding());save('source.before.json',sourceSnapshot());return;}
 if(mode==='checks'){
  save('orchestrator.start.json',{pid:process.pid,source:process.env.GITHUB_SHA});createShadow();
  await run('types-baseline',[path.join(ROOT,'node_modules/typescript/bin/tsc'),'--noEmit','-p','tsconfig.app.json'],0,240000,{},process.execPath,SHADOW);native('types-baseline',0);sourceHold('baseline');
  assert.deepEqual(snapshotShadow(),json('shadow-baseline-source.json'));installCandidate();
  await run('types-candidate',[path.join(ROOT,'node_modules/typescript/bin/tsc'),'--noEmit','-p','tsconfig.app.json'],0,240000,{},process.execPath,SHADOW);native('types-candidate',0);shadowHold('types');
  await run('build',['run','build'],0,900000,{},'npm',SHADOW);native('build',0);shadowHold('build',true);sourceHold('build');
  save('dist.initial.json',distSnapshot());cp.execFileSync('tar',['-cf',output('dist-initial.tar'),'-C',path.join(SHADOW,'dist'),'.']);
  captureGenerationBefore();same(regular(output('prerender-fonts.cjs')),PRERENDER_FONTS_PIN);
  write('prerender-fonts-use.jsonl','');
  await run('prerender-whats-new',['scripts/prerender.mjs'],0,600000,{PRERENDER_ONLY:'/whats-new',PRERENDER_PORT:'4310',FONT_CACHE_USE_RECEIPT:output('prerender-fonts-use.jsonl'),NODE_OPTIONS:'--require='+path.join(ROOT,'scripts/lib/offlineTransport.cjs')+' --require='+output('prerender-fonts.cjs')},process.execPath,SHADOW);native('prerender-whats-new',0);
  const temp=path.join(OUT,'sitemap-tmp');fs.mkdirSync(temp);
  await run('sitemap',['scripts/genSitemap.mjs'],0,240000,{TMPDIR:temp},process.execPath,SHADOW);native('sitemap',0);
  admitGeneration();sourceHold('generation');
  await run('build-final',['run','build'],0,900000,{},'npm',SHADOW);native('build-final',0);shadowHold('build-final',true);sourceHold('build-final');
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
  save('automated-admission.json',{source:process.env.GITHUB_SHA,pid:process.pid,browsers,readers:DATA.readers,supervised:27,capsSourceUnchanged:true,canonicalProductAdopted:false,manualGeometryAndOriginalPixels:'PENDING',fullSuite:false,live:false});return;
 }
 if(mode==='final'){
  const generation=json('generation-admission.json');assert.equal(generation.source,process.env.GITHUB_SHA);assert.equal(generation.copiedRecordControls,4);const controls=json('generation-controls.json');assert.equal(controls.source,process.env.GITHUB_SHA);assert.equal(controls.rows.length,4);for(const row of controls.rows){assert(row.changed&&row.fullRestoration&&row.error.stack);assert.deepEqual(row.diagnosticCounts,[0,1,0]);}
  const before=json('source-binding.json'),now=binding();assert.deepEqual(now.prerenderPreload,before.prerenderPreload);assert.deepEqual(now.critical,before.critical);assert.deepEqual(now.helper,before.helper);assert.deepEqual(now.data,before.data);sourceHold('final');shadowHold('final',true);assert.deepEqual(distSnapshot(),json('dist.before.json'));
  const rows=ids().map(id=>native(id,id==='tabout'?1:0));assert.equal(rows.length,27);for(const id of ids())noInfrastructure(id);
  browserAdmission('normal',false);browserAdmission('tabout',true);for(const spec of DATA.overlays)same(regular(path.join(SHADOW,spec.file)),spec.candidate);
  const server=json('server.closed.json');assert(server.closed&&server.ownedShutdown&&!server.error&&server.signal==='SIGTERM');assert.equal(regular(output('server.transport')).length,0);
  const outer=[before.pid,json('orchestrator.start.json').pid,process.pid];assert(outer.every(pid=>Number.isInteger(pid)&&pid>0));assert.equal(new Set([...rows.map(r=>r.pid),server.pid,...outer]).size,31);
  for(const name of ['foundation','orchestrator']){assert.equal(regular(output(name+'.exit')).toString().trim(),'0');assert.equal(regular(output(name+'.transport')).length,0);}
  save('native-selected-processes.json',{source:process.env.GITHUB_SHA,rows,server,outerPids:outer,selectedSupervisedCommands:27,guardedHostServer:1,outerGuardedCohorts:3,selectedCohorts:31,scope:'Selected commands/cohorts only. Internal browser hosts, Chromium renderers and other descendants are not assigned separate receipt credit.'});
  save('final-binding.json',{source:process.env.GITHUB_SHA,pid:process.pid,parent:PARENT,allCanonicalSourcesHeld:true,candidateShadowSourceHeld:true,distHeldAfterBuild:true,generatedSourceControlled:true,generationChangedPaths:generation.changed,manualGeometryAndOriginalPixels:'PENDING',protectedIntegration:false,fullSuite:false,live:false});return;
 }
 throw Error('Unknown Minimize helper mode');
}
await execute();
}
main(process.argv[2]).then(()=>console.log('CM Minimize qualification '+process.argv[2]+' complete, pid '+process.pid)).catch(error=>{console.error(error.stack||error);process.exitCode=1;});
