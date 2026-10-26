'use strict';
async function main(mode){
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),assert=require('node:assert/strict'),{createHash}=require('node:crypto'),{stripVTControlCharacters}=require('node:util'),{gunzipSync,createGunzip}=require('node:zlib'),readline=require('node:readline');
const ROOT=fs.realpathSync(process.cwd()),OUT=fs.realpathSync(process.env.AUSSIE_QA_OUT),SELF=fs.realpathSync(__filename),BASELINE=path.resolve(process.env.AUSSIE_QA_BASELINE),SHADOW=path.resolve(process.env.AUSSIE_QA_SHADOW);
const PARENT='b20ec6664df9d4c58d63ea0596791d33b2a3b8fc',PARENT_TREE='51e0c6a06a6c4fb7d143b4d408eb5a9437737553';
const DOC='docs/PROJECT-STATE.md',HELPER='scripts/qa/aussie-real-club-names/qualification.cjs',COLLECTOR='scripts/qa/aussie-real-club-names/fictional-outcome-collector.ts';
const DOC_BINDING={"parent":{"bytes":1860109,"sha256":"20bfd9466033d70020d8ba6295b393a394f8c0fb5a40152b813937230a226ee1","gitBlob":"8f378afd1e8f175dadef3d3de033e2f59366e308"},"tail":{"bytes":1107,"sha256":"5463b69692a0dd2dd840d8952ba7355cde4a774743b40c3953dbfd9e373698ba"},"candidate":{"bytes":1861216,"sha256":"026958b5cb646c3c5024ef375f0c878f5d0a24e95af67fe5857c67ffaa0fb0e2","gitBlob":"c5dc35966e9f65b246b89126f7adabeea85c99b6"}},COLLECTOR_PIN={"bytes":4264,"sha256":"e71358ac5f826f3b21eab102940edee3c0f96d8fc3f557bd145b2fd664db1f0c","gitBlob":"0dae503fc4da96e47f12199e6bf8c9efd3c09bb0"},PARTS=[{"path":"scripts/qa/aussie-real-club-names/overlays.part001.gz.b64","bytes":89413,"sha256":"ed19745359fcd1845dda2816f32e82ac6a5b9ccf7329506a99d3b3a6bee2059c","gitBlob":"44f1cb50d3484a5c1169d0dd5b875d5a69c9b37c"},{"path":"scripts/qa/aussie-real-club-names/overlays.part002.gz.b64","bytes":89413,"sha256":"0399208e763d9cbfc2b4fc8c371677612903feade7a6506a98a7931e2508d51b","gitBlob":"c986a17d82bda28746d418451be1aecc52b6b93d"}],PACKAGE={"bytes":460622,"sha256":"cb80bc6c10e94eae670502ab07bd7d91f71d9049fb18a549260392aed2736328"},PATHS=[".github/workflows/aussie-real-club-names-qualification.yml","docs/PROJECT-STATE.md","scripts/qa/aussie-real-club-names/qualification.cjs","scripts/qa/aussie-real-club-names/fictional-outcome-collector.ts","scripts/qa/aussie-real-club-names/overlays.part001.gz.b64","scripts/qa/aussie-real-club-names/overlays.part002.gz.b64"];
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



const sha=b=>createHash('sha256').update(b).digest('hex');
const blob=b=>createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
const meta=b=>({bytes:b.length,sha256:sha(b),gitBlob:blob(b)});
function regular(file){const st=fs.lstatSync(file);assert(st.isFile()&&!st.isSymbolicLink(),'AUSSIE_QA_REGULAR');return fs.readFileSync(file);}
function same(body,pin){assert.deepEqual(meta(body),{bytes:pin.bytes,sha256:pin.sha256,gitBlob:pin.gitBlob},'AUSSIE_QA_FULL_PIN');}
function output(name){assert.equal(path.basename(name),name);return path.join(OUT,name);}
const write=(name,body)=>fs.writeFileSync(output(name),body,{flag:'wx'});
const save=(name,value)=>write(name,JSON.stringify(value,null,2)+'\n');
const json=name=>JSON.parse(regular(output(name)));
const git=args=>cp.execFileSync('git',args,{cwd:ROOT,encoding:'utf8',maxBuffer:32*1024*1024}).trim();
for(const dir of [OUT,BASELINE,SHADOW]){assert.notEqual(dir,ROOT);assert(!dir.startsWith(ROOT+path.sep));}
for(const a of [OUT,BASELINE,SHADOW])for(const b of [OUT,BASELINE,SHADOW])if(a!==b)assert(!a.startsWith(b+path.sep),'AUSSIE_QA_SEPARATE_ROOTS');
function loadPackage(){
 const pieces=PARTS.map(pin=>{const body=regular(path.join(ROOT,pin.path));same(body,pin);assert(/^[A-Za-z0-9+/=]+\n$/.test(body.toString()));return body.toString().trim();});
 const raw=gunzipSync(Buffer.from(pieces.join(''),'base64'));assert.equal(raw.length,PACKAGE.bytes);assert.equal(sha(raw),PACKAGE.sha256);
 const p=JSON.parse(raw);assert.equal(p.schema,'aussie-real-club-qualification-overlays-v1');assert.equal(p.overlays.length,20);assert.equal(p.controls.length,9);assert.equal(p.suites.length,9);assert.equal(p.suites.reduce((n,s)=>n+s.cases,0),97);
 for(const row of p.overlays){assert(!path.isAbsolute(row.target)&&!row.target.split('/').includes('..'));same(Buffer.from(row.body),row.selected);}return p;
}
const DATA=loadPackage(),SUITES=DATA.suites,RECIPES=DATA.controls;
function suite(id){const found=SUITES.filter(s=>s.id===id);assert.equal(found.length,1);return found[0];}
function cases(s){return s.groups.flatMap(g=>g.titles.map(title=>({title,ancestor:g.ancestor,fullName:g.ancestor+' '+title})));}
function focusOf(spec){const found=cases(suite(spec.suite)).filter(c=>c.title===spec.focusedCase);assert.equal(found.length,1);return found[0].fullName;}
function binding(){
 assert.equal(process.env.AUSSIE_QA_PHASE,'real-club-shadow');assert.equal(process.env.GITHUB_REPOSITORY,'PapiSalgueroM/ballpark-hero');assert.equal(process.env.GITHUB_REPOSITORY_ID,'1195729679');assert.equal(process.env.GITHUB_REF,'refs/heads/codex/aussie-real-club-choice-qualification-20261026');
 assert.equal(git(['rev-parse','HEAD']),process.env.GITHUB_SHA);assert.equal(git(['show','-s','--format=%P','HEAD']),PARENT);assert.equal(git(['rev-parse',PARENT+'^{tree}']),PARENT_TREE);
 for(const key of ['NO_DOUBLE_SWAP','SIM_SEED','ONLY','VITEST','NODE_PATH','AUSSIE_MANAGER_CONTROL','AUSSIE_RULES_BOARD_CONTROL','AUSSIE_LEAGUE_BOARD_CONTROL','HOME_FRONT_CONTROL','SIM_SAVE_KEEPER_CONTROL'])assert.equal(process.env[key],undefined,'AUSSIE_QA_NO_INHERITED_OVERRIDE');
 assert.equal(process.env.NODE_OPTIONS,'--require='+path.join(ROOT,'scripts/lib/offlineTransport.cjs'));assert.equal(process.env.SIM_NETWORK,'offline');
 const critical={};for(const[file,pin]of Object.entries(DATA.canonicalCritical)){const b=regular(path.join(ROOT,file));same(b,pin);assert.equal(git(['rev-parse','HEAD:'+file]),pin.gitBlob);assert.equal(git(['rev-parse',PARENT+':'+file]),pin.gitBlob);critical[file]=meta(b);}
 for(const file of PATHS.filter(p=>p!==DOC))assert.equal(git(['ls-tree','-r','--name-only',PARENT,'--',file]),'');
 assert.deepEqual(git(['diff','--name-status',PARENT,'HEAD']).split('\n').filter(Boolean).sort(),PATHS.map(file=>(file===DOC?'M':'A')+'\t'+file).sort(),'AUSSIE_QA_SIX_PATH_FENCE');
 const before=cp.execFileSync('git',['show',PARENT+':'+DOC],{cwd:ROOT,maxBuffer:4*1024*1024}),now=regular(path.join(ROOT,DOC));same(before,DOC_BINDING.parent);assert(now.subarray(0,before.length).equals(before));same(now,DOC_BINDING.candidate);const tail=now.subarray(before.length);assert.equal(tail.length,DOC_BINDING.tail.bytes);assert.equal(sha(tail),DOC_BINDING.tail.sha256);
 same(regular(path.join(ROOT,COLLECTOR)),COLLECTOR_PIN);
 const listed=cp.execFileSync('git',['ls-files','-z'],{cwd:ROOT}).toString().split('\0');assert.equal(listed.pop(),'');assert.equal(listed.length,5383);for(const f of listed){regular(path.join(ROOT,f));assert(fs.realpathSync(path.join(ROOT,f)).startsWith(ROOT+path.sep));}
 assert.equal(git(['rev-parse','HEAD:'+HELPER]),blob(regular(SELF)));
 return {source:process.env.GITHUB_SHA,parent:PARENT,parentTree:PARENT_TREE,tree:git(['rev-parse','HEAD^{tree}']),run:process.env.GITHUB_RUN_ID,attempt:process.env.GITHUB_RUN_ATTEMPT,pid:process.pid,sourceBlobs:5383,parentBlobs:5378,directPaths:6,critical,helper:meta(regular(SELF)),package:PACKAGE,canonicalProductChanged:false,fullSuite:false,live:false};
}
function sourceSnapshot(){return Object.fromEntries(cp.execFileSync('git',['ls-files','-z'],{cwd:ROOT}).toString().split('\0').filter(Boolean).map(file=>[file,meta(regular(path.join(ROOT,file)))]));}
function sourceHold(label){const before=json('all-source.before.json'),after=sourceSnapshot();assert.deepEqual(after,before,'AUSSIE_QA_CANONICAL_SOURCE_HOLD');const status=cp.execFileSync('git',['status','--porcelain','--untracked-files=all'],{cwd:ROOT,encoding:'utf8',maxBuffer:32*1024*1024});assert.equal(status,'');save(label+'-source-hold.json',{pid:process.pid,source:process.env.GITHUB_SHA,current:after,rawStatus:status});}
function snapshotRoot(root){
 const link=path.join(root,'node_modules');assert(fs.existsSync(link)&&fs.lstatSync(link).isSymbolicLink(),'AUSSIE_QA_REQUIRED_MODULE_LINK');assert.equal(fs.realpathSync(link),fs.realpathSync(path.join(ROOT,'node_modules')));
 const rows={};function walk(dir,rel=''){for(const name of fs.readdirSync(dir).sort()){const r=rel?rel+'/'+name:name,p=path.join(dir,name),st=fs.lstatSync(p);if(r==='node_modules'){assert(st.isSymbolicLink());continue;}assert(!st.isSymbolicLink(),'AUSSIE_QA_NO_SOURCE_LINK');if(st.isDirectory())walk(p,r);else{assert(st.isFile());rows[r]=meta(regular(p));}}}walk(root);return rows;
}
function rootHold(label,root,expected,mutant=null){const now=snapshotRoot(root);assert.deepEqual(Object.keys(now).sort(),Object.keys(expected).sort());const changed=Object.keys(expected).filter(f=>JSON.stringify(now[f])!==JSON.stringify(expected[f]));assert.deepEqual(changed,mutant?[mutant.target]:[],'AUSSIE_QA_ONLY_OWNED_SOURCE_DIFF');if(mutant)assert.deepEqual(now[mutant.target],mutant.mutant);save(label+'-shadow-hold.json',{pid:process.pid,root,changed,actual:now});return now;}
function createRoots(){
 const canonical=json('all-source.before.json');
 for(const root of [BASELINE,SHADOW]){assert(!fs.existsSync(root),'AUSSIE_QA_FRESH_SHADOW');fs.mkdirSync(root);for(const[file,pin]of Object.entries(canonical)){assert(!path.isAbsolute(file)&&!file.split('/').includes('..'));const dest=path.join(root,file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(ROOT,file),dest,fs.constants.COPYFILE_EXCL);same(regular(dest),pin);}fs.symlinkSync(path.join(ROOT,'node_modules'),path.join(root,'node_modules'),'dir');assert.deepEqual(snapshotRoot(root),canonical);}
 for(const s of [suite('core'),suite('shared')]){const row=DATA.overlays.find(r=>r.target===s.file);assert(row&&row.status==='A');const dest=path.join(BASELINE,row.target);assert(!fs.existsSync(dest));fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,row.body,{flag:'wx'});}
 save('baseline-source.before.json',snapshotRoot(BASELINE));
 const changes=[];for(const row of DATA.overlays){const dest=path.join(SHADOW,row.target);if(row.status==='M')same(regular(dest),row.basis);else{assert.equal(row.status,'A');assert(!fs.existsSync(dest));}
 const held=path.join(OUT,'overlays',row.target);fs.mkdirSync(path.dirname(held),{recursive:true});if(row.status==='M')fs.writeFileSync(held+'.original',regular(dest),{flag:'wx'});fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,row.body,{flag:row.status==='A'?'wx':'w'});same(regular(dest),row.selected);fs.writeFileSync(held+'.selected',regular(dest),{flag:'wx'});changes.push({target:row.target,status:row.status,basis:row.basis,selected:row.selected});}
 const candidate=snapshotRoot(SHADOW),keys=new Set([...Object.keys(canonical),...Object.keys(candidate)]);assert.deepEqual([...keys].filter(f=>JSON.stringify(candidate[f])!==JSON.stringify(canonical[f])).sort(),DATA.overlays.map(r=>r.target).sort());
 save('candidate-source.before.json',candidate);save('shadow-overlays.json',{pid:process.pid,canonicalProductChanged:false,rows:changes,baselineRoot:BASELINE,candidateRoot:SHADOW,fullTrackedGraphCopied:true,sourceImportsRewritten:false});
}
function groupArgs(id,s,focus=null,root=SHADOW){return[path.join(ROOT,'node_modules/vitest/vitest.mjs'),'run',s.file,'--config='+path.join(root,'vitest.config.ts'),'--root='+root,'--no-cache','--maxWorkers=1','--no-file-parallelism','--reporter=verbose','--reporter=json','--outputFile='+output(id+'.json'),...(s.testTimeoutMs?['--testTimeout='+s.testTimeoutMs]:[]),...(focus?['--testNamePattern=^'+focus.replace(/[.*+?^$(){}|[\]\\]/g,'\\$&')+'$']:[])];}
function classify(file,s,fault=null,focus=null,root=SHADOW){
 const report=JSON.parse(regular(file)),expected=cases(s),failed=fault?1:0,pending=focus?expected.length-1:0,passed=expected.length-failed-pending;
 assert.equal(report.success,failed===0);assert.equal(report.numTotalTests,expected.length);assert.equal(report.numPassedTests,passed);assert.equal(report.numFailedTests,failed);assert.equal(report.numPendingTests,pending);assert.equal(report.numTodoTests,0);assert.equal(report.testResults.length,1);
 const result=report.testResults[0];assert.equal(path.resolve(result.name),path.join(root,s.file));assert.equal(result.message??'','');assert.equal(result.status,failed?'failed':'passed');assert.equal(result.assertionResults.length,expected.length);
 const rows=[];for(const c of expected){const found=result.assertionResults.filter(r=>r.fullName===c.fullName);assert.equal(found.length,1,'AUSSIE_QA_CASE_IDENTITY');const r=found[0];assert.equal(r.title,c.title);assert.deepEqual(r.ancestorTitles,[c.ancestor]);const wanted=focus&&c.fullName!==focus?'skipped':fault&&c.fullName===fault.fullName?'failed':'passed';assert.equal(r.status,wanted);assert(Array.isArray(r.failureMessages));
 if(wanted==='failed'){assert.equal(r.failureMessages.length,1);const error=stripVTControlCharacters(r.failureMessages[0]);assert(/^\s*AssertionError(?::|\s|\[)/.test(error),'AUSSIE_QA_OWNED_ASSERTION');assert(error.includes(path.basename(s.file)+':'),'AUSSIE_QA_SOURCE_STACK');if(fault.marker)assert(error.trimStart().split(/\r?\n/,1)[0].includes(fault.marker),'AUSSIE_QA_OWNED_MARKER');assert(!/TypeError|ReferenceError|SyntaxError|TestingLibraryElementError|TimeoutError|Test timed out|Failed to load|Cannot find module|Cannot find package/i.test(error),'AUSSIE_QA_NO_INFRASTRUCTURE_CREDIT');}else assert.deepEqual(r.failureMessages,[]);rows.push({fullName:r.fullName,status:r.status,failureMessages:r.failureMessages});}
 return{file:s.file,passed,failed,intentionallyFiltered:pending,rows};
}
function noRuntimeCredit(id){const logs=regular(output(id+'.stdout')).toString()+'\n'+regular(output(id+'.stderr')).toString();assert(!/Unhandled (?:Errors?|Rejection|Exception)|Error during collection|Failed to load url|Cannot find module|Cannot find package|Test timed out|worker exited unexpectedly/i.test(logs),'AUSSIE_QA_NO_RUNTIME_CREDIT');}
function firstCase(s){return cases(s)[0].fullName;}
async function baselineWitnesses(){for(const id of ['core','shared']){const s=suite(id),name='baseline-'+id,focus=firstCase(s),fault={fullName:focus,marker:id==='core'?'AUSSIE_REAL_NAMES_START':'AUSSIE_SAVE_REGISTRATION'};await run(name,groupArgs(name,s,focus,BASELINE),1,240000,{},process.execPath,BASELINE);native(name,1);noRuntimeCredit(name);classify(output(name+'.json'),s,fault,focus,BASELINE);}rootHold('baseline-owned-red',BASELINE,json('baseline-source.before.json'));}

async function sourceTrips(){
 const rows=[];for(const spec of RECIPES){
 const s=suite(spec.suite),focus=focusOf(spec),file=path.join(SHADOW,spec.target),actual=regular(file),body=actual.toString('utf8');same(actual,spec.basis);const at=body.indexOf(spec.before);assert.equal(at,spec.position);assert.equal(Buffer.byteLength(body.slice(0,at)),spec.utf8Position);assert(at>=0&&body.indexOf(spec.before,at+spec.before.length)<0);
 const changed=Buffer.from(body.slice(0,at)+spec.after+body.slice(at+spec.before.length));same(changed,spec.mutant);assert(!changed.equals(actual));assert.equal(changed.toString().slice(0,at)+spec.before+changed.toString().slice(at+spec.after.length),body);
 const dir=path.join(OUT,'source-controls',spec.id);fs.mkdirSync(dir,{recursive:true});for(const role of ['actual','work'])fs.writeFileSync(path.join(dir,'source.'+role),actual,{flag:'wx'});
 const row={id:spec.id,target:spec.target,focus,position:at,utf8Position:spec.utf8Position,original:spec.basis,mutant:spec.mutant,roles:[],restoration:null};
 try{
 rootHold(spec.id+'-before',SHADOW,json('candidate-source.before.json'));
 const healthy=spec.id+'-healthy';await run(healthy,groupArgs(healthy,s,focus),0,240000,{},process.execPath,SHADOW);const h=native(healthy,0);noRuntimeCredit(healthy);classify(output(healthy+'.json'),s,null,focus);row.roles.push({role:'healthy',id:healthy,pid:h.pid,status:h.status});
 fs.writeFileSync(file,changed);assert(regular(file).equals(changed));fs.writeFileSync(path.join(dir,'source.changed'),regular(file),{flag:'wx'});rootHold(spec.id+'-changed',SHADOW,json('candidate-source.before.json'),spec);
 const fault=spec.id+'-fault';await run(fault,groupArgs(fault,s,focus),1,240000,{},process.execPath,SHADOW);const f=native(fault,1);noRuntimeCredit(fault);const owned=classify(output(fault+'.json'),s,{fullName:focus},focus);assert.equal(owned.failed,1);assert.equal(owned.intentionallyFiltered,6);assert(regular(file).equals(changed));row.roles.push({role:'fault',id:fault,pid:f.pid,status:f.status});
 }finally{
 fs.writeFileSync(file,actual);const restored=regular(file);fs.writeFileSync(path.join(dir,'source.restored'),restored,{flag:'wx'});row.restoration={finallyExecuted:true,...meta(restored),exact:restored.equals(actual)};fs.writeFileSync(path.join(dir,'restoration.json'),JSON.stringify(row,null,2)+'\n',{flag:'wx'});assert(row.restoration.exact);rootHold(spec.id+'-restored',SHADOW,json('candidate-source.before.json'));sourceHold(spec.id+'-canonical');
 }
 const restored=spec.id+'-restored';await run(restored,groupArgs(restored,s,focus),0,240000,{},process.execPath,SHADOW);const r=native(restored,0);noRuntimeCredit(restored);classify(output(restored+'.json'),s,null,focus);row.roles.push({role:'restored',id:restored,pid:r.pid,status:r.status});fs.writeFileSync(path.join(dir,'complete.json'),JSON.stringify(row,null,2)+'\n',{flag:'wx'});rows.push(row);
 }
 save('source-controls.json',{source:process.env.GITHUB_SHA,pid:process.pid,rows,nativeProcesses:27,canonicalProductChanged:false});
}
async function collectRole(role){
 const root=role==='baseline'?BASELINE:SHADOW,expected=json(role==='baseline'?'baseline-source.before.json':'candidate-source.before.json'),bundle=output('collector-'+role+'.cjs');
 const esbuild=require(path.join(ROOT,'node_modules/esbuild'));
 const result=esbuild.buildSync({entryPoints:[path.join(root,COLLECTOR)],absWorkingDir:root,tsconfig:path.join(root,'tsconfig.app.json'),bundle:true,format:'cjs',platform:'node',outfile:bundle,metafile:true,sourcemap:'external',write:false,logLevel:'error'});
 for(const file of result.outputFiles){assert(path.resolve(file.path).startsWith(OUT+path.sep));fs.writeFileSync(file.path,file.contents,{flag:'wx'});}
 const closure={};for(const file of Object.keys(result.metafile.inputs)){const full=path.resolve(root,file);assert(full.startsWith(root+path.sep));const rel=path.relative(root,full).split(path.sep).join('/');assert(expected[rel],'AUSSIE_QA_BUNDLE_INPUT_OWNED');const b=regular(full);same(b,expected[rel]);closure[rel]=meta(b);}
 save('collector-'+role+'-metafile.json',result.metafile);save('collector-'+role+'-closure.json',{pid:process.pid,root,tsconfig:path.join(root,'tsconfig.app.json'),entry:COLLECTOR,inputClosure:closure,bundle:meta(regular(bundle)),api:'esbuild.buildSync then exact generated collect export; nested compiler service is not a separately claimed supervised PID'});
 const collected=await require(bundle).collect(path.join(OUT,'fictional-parity',role),role);save('collector-'+role+'-complete.json',collected);
}
function parityRow(before,after){assert.equal(after,before,'AUSSIE_FICTIONAL_PARITY_EXACT_FULL_ROW');}
async function parity(){
 const bRoot=path.join(OUT,'fictional-parity/baseline'),cRoot=path.join(OUT,'fictional-parity/candidate'),b=JSON.parse(regular(path.join(bRoot,'campaigns.json'))),c=JSON.parse(regular(path.join(cRoot,'campaigns.json')));assert.equal(b.role,'baseline');assert.equal(c.role,'candidate');assert.equal(b.rows.length,4);assert.equal(c.rows.length,4);
 const rows=[];let controlBefore=null;
 for(let i=0;i<b.rows.length;i++){
 const x=b.rows[i],y=c.rows[i];assert.deepEqual([y.seed,y.club,y.file,y.rows,y.actions,y.seasons],[x.seed,x.club,x.file,x.rows,x.actions,x.seasons]);
 for(const[root,r]of [[bRoot,x],[cRoot,y]]){const bytes=regular(path.join(root,r.file));assert.equal(bytes.length,r.bytes);assert.equal(sha(bytes),r.sha256);}
 const left=readline.createInterface({input:fs.createReadStream(path.join(bRoot,x.file)).pipe(createGunzip()),crlfDelay:Infinity}),right=readline.createInterface({input:fs.createReadStream(path.join(cRoot,y.file)).pipe(createGunzip()),crlfDelay:Infinity}),iterator=right[Symbol.asyncIterator]();let count=0;
 try{for await(const line of left){const next=await iterator.next();assert.equal(next.done,false);parityRow(line,next.value);if(controlBefore===null)controlBefore=line;count++;}assert.equal((await iterator.next()).done,true);}finally{left.close();right.close();}
 assert.equal(count,x.rows);rows.push({seed:x.seed,club:x.club,rows:count,actions:x.actions,seasons:x.seasons,completeCompressedBaseline:meta(regular(path.join(bRoot,x.file))),completeCompressedCandidate:meta(regular(path.join(cRoot,y.file))),completeRawLinesExactlyEqual:true});
 }
 const dir=path.join(OUT,'parity-control');fs.mkdirSync(dir);const actual=Buffer.from(controlBefore),work=path.join(dir,'work.json');for(const name of ['before.json','work.json'])fs.writeFileSync(path.join(dir,name),actual,{flag:'wx'});parityRow(actual.toString(),regular(work).toString());const detail={pid:process.pid,nativeProcessesAdded:0,diagnosticCounts:[0],changed:false,restored:false,error:null};
 try{
 const changed=JSON.parse(actual);assert.equal(changed.kind,'default-api');assert(typeof changed.defaults.world.clubs[0].players[0].name==='string');changed.defaults.world.clubs[0].players[0].name+=' changed control';const bytes=Buffer.from(JSON.stringify(changed));assert(!bytes.equals(actual));fs.writeFileSync(work,bytes);fs.writeFileSync(path.join(dir,'changed.json'),bytes,{flag:'wx'});detail.changed=true;
 try{parityRow(actual.toString(),regular(work).toString());}catch(error){assert(error instanceof assert.AssertionError);assert(error.message.includes('AUSSIE_FICTIONAL_PARITY_EXACT_FULL_ROW'));detail.error={name:error.name,message:error.message,stack:error.stack};}assert(detail.error);detail.diagnosticCounts.push(1);
 }finally{fs.writeFileSync(work,actual);fs.writeFileSync(path.join(dir,'restored.json'),regular(work),{flag:'wx'});detail.restored=regular(work).equals(actual);assert(detail.restored);}
 parityRow(actual.toString(),regular(work).toString());detail.diagnosticCounts.push(0);save('parity-control.json',detail);save('fictional-parity.json',{source:process.env.GITHUB_SHA,pid:process.pid,rows,campaignsPerArm:4,completedSeasonsPerArm:8,fullRawStateAndActionComparison:true,universalRandomOrPerformanceEquivalence:false});
}
function linkControl(){
 const link=path.join(SHADOW,'node_modules'),held=SHADOW+'.node-modules-held';let occupied=false;try{fs.lstatSync(held);occupied=true;}catch(error){if(error.code!=='ENOENT')throw error;}assert.equal(occupied,false,'AUSSIE_QA_FRESH_LINK_HOLD');const before=snapshotRoot(SHADOW),text=fs.readlinkSync(link),target=fs.realpathSync(link),row={pid:process.pid,nativeProcessesAdded:0,diagnosticCounts:[0],physicalChange:false,exactRestoration:false,error:null};
 try{fs.renameSync(link,held);assert(!fs.existsSync(link));row.physicalChange=true;try{snapshotRoot(SHADOW);}catch(error){assert(error instanceof assert.AssertionError);assert(error.message.includes('AUSSIE_QA_REQUIRED_MODULE_LINK'));row.error={name:error.name,message:error.message,stack:error.stack};}assert(row.error);row.diagnosticCounts.push(1);}
 finally{fs.renameSync(held,link);row.exactRestoration=fs.readlinkSync(link)===text&&fs.realpathSync(link)===target;assert(row.exactRestoration);save('shadow-link-restoration.json',{finallyExecuted:true,text,target,exact:true});}
 assert.deepEqual(snapshotRoot(SHADOW),before);row.diagnosticCounts.push(0);save('shadow-link-control.json',row);
}
function reportControls(){
 const s=suite('core'),spec=RECIPES[0],focus=focusOf(spec),normal=regular(output('normal-core.json')),fault=regular(output(spec.id+'-fault.json'));
 const configs=[
 {id:'passed-row-status',bytes:normal,fault:null,focus:null,change:r=>{const row=r.testResults[0].assertionResults.find(x=>x.fullName===firstCase(s));assert.equal(row.status,'passed');row.status='failed';}},
 {id:'assertion-kind',bytes:fault,fault:{fullName:focus},focus,change:r=>{const row=r.testResults[0].assertionResults.find(x=>x.fullName===focus);assert(row.failureMessages[0].includes('AssertionError'));row.failureMessages[0]=row.failureMessages[0].replace('AssertionError','ReferenceError');}},
 {id:'owned-case-identity',bytes:fault,fault:{fullName:focus},focus,change:r=>{const row=r.testResults[0].assertionResults.find(x=>x.fullName===focus);assert(row);row.fullName+=' wrong owned identity';}},
 {id:'failed-count',bytes:fault,fault:{fullName:focus},focus,change:r=>{assert.equal(r.numFailedTests,1);r.numFailedTests=2;}}
 ];const rows=[];
 for(const c of configs){const dir=path.join(OUT,'report-controls',c.id);fs.mkdirSync(dir,{recursive:true});const work=path.join(dir,'work.json');for(const name of ['before.json','work.json'])fs.writeFileSync(path.join(dir,name),c.bytes,{flag:'wx'});const row={id:c.id,pid:process.pid,nativeProcessesAdded:0,diagnosticCounts:[0],changed:false,fullRestoration:false,error:null};classify(work,s,c.fault,c.focus);
 try{const value=JSON.parse(c.bytes),before=JSON.stringify(value);c.change(value);assert.notEqual(JSON.stringify(value),before);const changed=Buffer.from(JSON.stringify(value,null,2)+'\n');assert(!changed.equals(c.bytes));fs.writeFileSync(work,changed);fs.writeFileSync(path.join(dir,'changed.json'),changed,{flag:'wx'});row.changed=true;try{classify(work,s,c.fault,c.focus);}catch(error){assert(error instanceof assert.AssertionError);row.error={name:error.name,message:error.message,stack:error.stack};}assert(row.error);row.diagnosticCounts.push(1);}
 finally{fs.writeFileSync(work,c.bytes);fs.writeFileSync(path.join(dir,'restored.json'),regular(work),{flag:'wx'});row.fullRestoration=regular(work).equals(c.bytes);assert(row.fullRestoration);}
 classify(work,s,c.fault,c.focus);row.diagnosticCounts.push(0);rows.push(row);fs.writeFileSync(path.join(dir,'diagnostics.json'),JSON.stringify(row,null,2)+'\n',{flag:'wx'});
 }save('report-controls.json',{source:process.env.GITHUB_SHA,pid:process.pid,rows,nativeProcessesAdded:0});
}

const ids=()=>['baseline-core','baseline-shared','types',...SUITES.map(s=>'normal-'+s.id),'collector-baseline','collector-candidate',...RECIPES.flatMap(s=>['healthy','fault','restored'].map(r=>s.id+'-'+r)),'home-front','save-keeper'];
async function execute(){
 if(mode==='source'){save('source-binding.json',binding());save('all-source.before.json',sourceSnapshot());return;}
 if(mode==='collect-baseline'||mode==='collect-candidate'){await collectRole(mode.slice(8));return;}
 if(mode==='checks'){
 save('orchestrator.start.json',{pid:process.pid,source:process.env.GITHUB_SHA});createRoots();await baselineWitnesses();linkControl();
 await run('types',[path.join(ROOT,'node_modules/typescript/bin/tsc'),'--noEmit','-p','tsconfig.app.json'],0,240000,{},process.execPath,SHADOW);native('types',0);noRuntimeCredit('types');
 for(const s of SUITES){const id='normal-'+s.id;await run(id,groupArgs(id,s),0,s.deadlineMs,{},process.execPath,SHADOW);native(id,0);noRuntimeCredit(id);const r=classify(output(id+'.json'),s);assert.equal(r.passed,s.cases);rootHold(id,SHADOW,json('candidate-source.before.json'));}
 fs.mkdirSync(path.join(OUT,'fictional-parity'));
 for(const role of ['baseline','candidate']){const id='collector-'+role;await run(id,[SELF,'collect-'+role],0,600000,{},process.execPath,ROOT);native(id,0);noRuntimeCredit(id);}
 await parity();await sourceTrips();reportControls();
 for(const[id,file]of [['home-front','scripts/simHomeFront.mjs'],['save-keeper','scripts/simSaveKeeper.mjs']]){await run(id,[path.join(SHADOW,file)],0,600000,{},process.execPath,SHADOW);native(id,0);noRuntimeCredit(id);}
 rootHold('checks-candidate',SHADOW,json('candidate-source.before.json'));rootHold('checks-baseline',BASELINE,json('baseline-source.before.json'));sourceHold('checks');
 save('functional-admission.json',{source:process.env.GITHUB_SHA,pid:process.pid,normalSuites:9,normalCases:97,newCoreCases:7,newSharedCases:7,baselineOwnedRed:2,sourceTrips:9,sourceTripProcesses:27,supervisedProcesses:43,parityCampaignsPerArm:4,completedSeasonsPerArm:8,reportControls:4,linkControls:1,parityControls:1,canonicalProductChanged:false,fullSuite:false,live:false});return;
 }
 if(mode==='final'){
 const before=json('source-binding.json'),now=binding();assert.equal(now.source,before.source);assert.deepEqual(now.critical,before.critical);assert.deepEqual(now.helper,before.helper);
 const rows=ids().map(id=>native(id,id.startsWith('baseline-')||id.endsWith('-fault')?1:0));assert.equal(rows.length,43);assert.equal(new Set(rows.map(r=>r.pid)).size,43);for(const id of ids())noRuntimeCredit(id);
 for(const s of SUITES)classify(output('normal-'+s.id+'.json'),s);
 for(const id of ['core','shared']){const s=suite(id),focus=firstCase(s);classify(output('baseline-'+id+'.json'),s,{fullName:focus,marker:id==='core'?'AUSSIE_REAL_NAMES_START':'AUSSIE_SAVE_REGISTRATION'},focus,BASELINE);}
 for(const spec of RECIPES)for(const role of ['healthy','fault','restored'])classify(output(spec.id+'-'+role+'.json'),suite(spec.suite),role==='fault'?{fullName:focusOf(spec)}:null,focusOf(spec));
 const trips=json('source-controls.json');assert.equal(trips.rows.length,9);for(const r of trips.rows){assert.deepEqual(r.roles.map(x=>x.status),[0,1,0]);assert.equal(r.restoration.exact,true);}
 const reports=json('report-controls.json');assert.equal(reports.rows.length,4);for(const r of reports.rows){assert.equal(r.changed,true);assert.equal(r.fullRestoration,true);assert.deepEqual(r.diagnosticCounts,[0,1,0]);assert(r.error.stack);}
 for(const name of ['shadow-link-control','parity-control']){const r=json(name+'.json');assert.deepEqual(r.diagnosticCounts,[0,1,0]);assert(r.error.stack);assert.equal(r.nativeProcessesAdded,0);}
 const parity=json('fictional-parity.json');assert.equal(parity.campaignsPerArm,4);assert.equal(parity.rows.length,4);assert(parity.rows.every(r=>r.completeRawLinesExactlyEqual));for(const r of parity.rows)for(const role of ['baseline','candidate']){const name=r.seed+'-'+r.club+'.jsonl.gz';assert.equal(path.basename(name),name);same(regular(path.join(OUT,'fictional-parity',role,name)),role==='baseline'?r.completeCompressedBaseline:r.completeCompressedCandidate);}assert.equal(json('functional-admission.json').normalCases,97);
 rootHold('final-baseline',BASELINE,json('baseline-source.before.json'));rootHold('final-candidate',SHADOW,json('candidate-source.before.json'));sourceHold('final');
 for(const name of ['foundation','orchestrator']){assert.equal(regular(output(name+'.exit')).toString().trim(),'0');assert.equal(regular(output(name+'.transport')).length,0);}
 const outer=[before.pid,json('orchestrator.start.json').pid,process.pid];assert(outer.every(p=>Number.isInteger(p)&&p>0));assert.equal(new Set([...rows.map(r=>r.pid),...outer]).size,46);
 save('native-selected-processes.json',{source:process.env.GITHUB_SHA,rows,outerPids:outer,supervised:43,outer:3,selectedGuardedNodeCohorts:46,allDescendantPidsClaimed:false,nestedBundlerServicesSeparatelyUncounted:true});
 save('final-binding.json',{source:process.env.GITHUB_SHA,pid:process.pid,normalCases:97,newCases:14,sourceTriplets:9,parityCampaignsPerArm:4,canonicalProductChanged:false,detachedQualificationOnly:true,ownerIIntegrationQualified:false,fullSuite:false,live:false});return;
 }
 throw Error('Unknown Aussie QA mode');
}
await execute();
}
main(process.argv[2]).then(()=>console.log('Aussie detached '+process.argv[2]+' complete, pid '+process.pid)).catch(error=>{console.error(error.stack||error);process.exitCode=1;});
