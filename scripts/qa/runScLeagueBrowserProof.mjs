import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawnSync,execFileSync} from 'node:child_process';
const ROOT=path.resolve(process.env.GITHUB_WORKSPACE||''),OUT=path.resolve(process.env.SC_BROWSER_PROOF_OUT||''),COPY=path.join(OUT,'matched-source');
const SELF=fileURLToPath(import.meta.url),CONTRACT='qa/sc-league-browser-v1/CONTRACT.json';
const sha=b=>createHash('sha256').update(b).digest('hex'),blob=b=>createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex');
assert(process.env.CI==='1'&&ROOT!==OUT&&!OUT.startsWith(ROOT+path.sep)&&path.isAbsolute(process.env.SC_BROWSER_PROOF_OUT||''),'Remote external evidence required');
assert.equal(sha(fs.readFileSync(SELF)),process.env.SC_BROWSER_CONTROLLER_SHA256,'Frozen controller');
const contractRaw=fs.readFileSync(path.join(ROOT,CONTRACT));
assert.equal(sha(contractRaw),process.env.SC_BROWSER_CONTRACT_SHA256,'Frozen contract');
const C=JSON.parse(contractRaw),git=(...args)=>execFileSync('git',args,{cwd:ROOT,encoding:'utf8',maxBuffer:64*1024*1024}).trim();
const write=(name,value)=>{const file=path.join(OUT,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');};
const read=name=>JSON.parse(fs.readFileSync(path.join(OUT,name),'utf8'));
const tracked=git('ls-files','-z').split('\0').filter(Boolean).sort();
function inventory(dir){
 const rows=[];function walk(at){for(const e of fs.readdirSync(at,{withFileTypes:true})){
  const full=path.join(at,e.name),rel=path.relative(dir,full).split(path.sep).join('/');
  if(e.isSymbolicLink())rows.push({path:rel,link:fs.readlinkSync(full)});
  else if(e.isDirectory())walk(full);
  else if(e.isFile()){const body=fs.readFileSync(full);rows.push({path:rel,bytes:body.length,sha256:sha(body)});}
  else throw Error('Unexpected filesystem body '+rel);
 }}walk(dir);return rows.sort((a,b)=>a.path.localeCompare(b.path));
}
function sourceFiles(dir){return tracked.map(name=>{const file=path.join(dir,name);assert(fs.lstatSync(file).isFile(),'Regular tracked '+name);const body=fs.readFileSync(file);return{path:name,bytes:body.length,sha256:sha(body),executable:!!(fs.statSync(file).mode&0o111)};});}
function checkout(){return{head:git('rev-parse','HEAD'),refs:git('for-each-ref','--format=%(refname) %(objectname)'),index:sha(fs.readFileSync(git('rev-parse','--git-path','index'))),untracked:git('ls-files','--others','--exclude-standard'),files:sourceFiles(ROOT)};}
function held(control=false){
 assert.deepEqual(checkout(),read('checkout.before.json'),'Checkout source, index, refs and untracked held');
 const expected=structuredClone(read('checkout.before.json').files);
 if(control){const row=expected.find(r=>r.path===C.control.path);row.bytes=C.control.changed.bytes;row.sha256=C.control.changed.sha256;}
 assert.deepEqual(sourceFiles(COPY),expected,'Matched exact whole tracked bodies and executable modes');
 const seen=[];function walk(at){for(const e of fs.readdirSync(at,{withFileTypes:true})){
  const rel=path.relative(COPY,path.join(at,e.name)).split(path.sep).join('/');
  if(!rel.includes('/')&&['node_modules','dist'].includes(rel))continue;
  if(e.isDirectory())walk(path.join(at,e.name));else{assert(e.isFile(),'No other matched symlink '+rel);seen.push(rel);}
 }}walk(COPY);assert.deepEqual(seen.sort(),tracked,'No other matched untracked output');
 assert.equal(fs.realpathSync(path.join(COPY,'node_modules')),fs.realpathSync(path.join(ROOT,'node_modules')),'Physical original dependencies');
 for(const [name,pin]of Object.entries(C.sourcePins)){const wanted=control&&name===C.control.path?C.control.changed:pin;assert.equal(blob(fs.readFileSync(path.join(COPY,name))),wanted.gitBlob,'Current source pin '+name);}
 for(const pin of C.frozenInputs)assert.equal(sha(fs.readFileSync(path.join(COPY,pin.path))),pin.sha256,'Frozen QA input '+pin.path);
}
function run(id,command,args,extra={},cwd=COPY,timeout=1200000){
 const dir=path.join(OUT,id);fs.mkdirSync(dir,{recursive:true});const out=fs.openSync(path.join(dir,'stdout.log'),'wx'),err=fs.openSync(path.join(dir,'stderr.log'),'wx');
 const start=new Date().toISOString(),clock=process.hrtime.bigint();let result;
 try{result=spawnSync(command,args,{cwd,env:{...process.env,...extra},timeout,stdio:['ignore',out,err]});}finally{fs.closeSync(out);fs.closeSync(err);}
 const actual={command,args,cwd,start,end:new Date().toISOString(),durationMs:Number(process.hrtime.bigint()-clock)/1e6,status:result.status,signal:result.signal,error:result.error?String(result.error):null};
 write(id+'/process.json',actual);fs.writeFileSync(path.join(dir,'raw.exit'),String(result.status)+'\n');
 assert(!actual.error&&!actual.signal&&Number.isInteger(actual.status),'Finite actual child '+id);return actual.status;
}
function zero(id,command,args,extra,cwd,timeout){assert.equal(run(id,command,args,extra,cwd,timeout),0,'Actual zero child '+id);}
function offline(){return{NODE_OPTIONS:'--require='+path.join(COPY,'scripts/lib/offlineTransport.cjs'),SIM_OFFLINE_RECEIPT:path.join(OUT,'node-egress.log'),SIM_NETWORK:'offline'};}
function dependencies(){
 const before=read('dependencies.before.json'),after=inventory(path.join(ROOT,'node_modules')),map=new Map(after.map(r=>[r.path,r]));
 for(const row of before){assert.deepEqual(map.get(row.path),row,'Original dependency body held '+row.path);map.delete(row.path);}
 const extras=[...map.values()].sort((a,b)=>a.path.localeCompare(b.path)),tools=fs.existsSync(path.join(OUT,'browser-tools.json'))?read('browser-tools.json'):null;
 const wanted=tools?['playwright','playwright-core'].sort().map(name=>({path:name,link:path.join(tools.tools,'node_modules',name)})):[];
 assert.deepEqual(extras,wanted,'Only two recorded external browser package links');
 if(tools)assert.deepEqual(inventory(tools.tools),read('browser-tools.bodies.json'),'External browser package bodies held');
 write('dependencies.after.json',after);
}
function archive(name,folder,files=false){
 const args=files?['-cf',path.join(OUT,name+'.tar'),'--null','--verbatim-files-from','-T',path.join(OUT,'tracked-files.nul')]:['-cf',path.join(OUT,name+'.tar'),'-C',folder,'.'];
 zero('archive-'+name,'tar',args,{},folder);
}
async function compile(label,control){
 held(control);assert.equal(JSON.parse(fs.readFileSync(path.join(COPY,'package.json'),'utf8')).scripts.build,'vite build');
 const {build}=await import('vite'),receipt={schema:1,product:C.product,tree:C.tree,variant:control?'frame-ui':'base',sourcePins:{},chunks:[]};
 for(const name of Object.keys(C.sourcePins)){const body=fs.readFileSync(path.join(COPY,name));receipt.sourcePins[name]={gitBlob:blob(body),sha256:sha(body)};}
 const observer={name:'sc-browser-module-custody',enforce:'post',generateBundle(_options,bundle){
  for(const item of Object.values(bundle))if(item.type==='chunk'){
   const modules=Object.entries(item.modules).map(([id,data])=>{const clean=id.split('?')[0];return{id:clean.startsWith(COPY+path.sep)?path.relative(COPY,clean).split(path.sep).join('/'):clean,renderedLength:data.renderedLength};});
   receipt.chunks.push({file:item.fileName,isEntry:item.isEntry,facade:item.facadeModuleId,modules:modules.map(m=>m.id),moduleLengths:Object.fromEntries(modules.map(m=>[m.id,m.renderedLength])),imports:item.imports,dynamicImports:item.dynamicImports,renderedCodeSHA256:sha(item.code)});
  }
 }};
 await build({root:COPY,configFile:path.join(COPY,'vite.config.ts'),plugins:[observer]});
 receipt.distFiles=inventory(path.join(COPY,'dist'));const files=new Map(receipt.distFiles.map(r=>[r.path,r]));
 for(const chunk of receipt.chunks){assert(files.has(chunk.file));chunk.sha256=files.get(chunk.file).sha256;}
 const index=fs.readFileSync(path.join(COPY,'dist/index.html'),'utf8');
 receipt.bootstrapModules=[...index.matchAll(/<script\b[^>]*>/g)].map(m=>m[0]).filter(tag=>/\btype="module"/.test(tag)).map(tag=>/\bsrc="([^"]+)"/.exec(tag)?.[1]?.replace(/^\/+/, '')).filter(Boolean);
 assert.equal(receipt.bootstrapModules.length,1,'Actual generated bootstrap');
 assert(receipt.bootstrapModules.every(name=>receipt.chunks.some(chunk=>chunk.file===name&&chunk.isEntry)));
 for(const name of C.modules)assert(receipt.chunks.some(chunk=>chunk.modules.includes(name)),'Actual compiled group '+name);
 write('compiled-'+label+'.json',receipt);held(control);
}
function rebuild(label,control){zero('build-'+label,process.execPath,[SELF,'compile',label,control?'frame-ui':''],offline(),ROOT);return read('compiled-'+label+'.json');}
function browser(id,label,league,control=false){
 held(control);const tools=read('browser-tools.json'),compiled=read('compiled-'+label+'.json'),spec=C.leagues[league];
 assert.deepEqual(inventory(path.join(COPY,'dist')),compiled.distFiles,'Actual served dist membership and bytes');
 const dir=path.join(OUT,id,'evidence'),env={...offline(),CI:'1',BASE:'',ANSWER_CONSENT_CONTROL:'',PLAYWRIGHT_BROWSERS_PATH:tools.browsers,FREE_KICK_FONT_CACHE:tools.fonts,FONT_CACHE_MANIFEST_SHA256:tools.manifestSHA256,
  SC_BROWSER_COMPILED:path.join(OUT,'compiled-'+label+'.json'),SC_BROWSER_CONTRACT:path.join(COPY,CONTRACT),SC_BROWSER_CONTRACT_SHA256:sha(contractRaw),
  SC_BROWSER_CONTROL:control?'frame-ui':'',SC_LEAGUE_BROWSER_WIDTH:control?C.control.controlledCases[league]:'', [spec.outEnv]:dir};
 const raw=run(id,process.execPath,[spec.driver],env),report=JSON.parse(fs.readFileSync(path.join(dir,'report.json'),'utf8'));
 assert.equal(report.compiledReceiptSHA256,sha(fs.readFileSync(path.join(OUT,'compiled-'+label+'.json'))));
 assert.deepEqual(report.cases.map(row=>row.id),control?[C.control.controlledCases[league]]:['320','390','1280'],'Exact existing profile identities');
 for(const row of report.cases){assert.deepEqual(row.errors,[]);assert.deepEqual(row.consoleErrors,[]);assert.deepEqual(row.assetErrors,[]);assert.deepEqual(row.unknown,[]);assert(!row.associationError);assert.equal(row.custody.associated,true);}
 if(control){
  const row=report.cases[0];assert.equal(raw,1);assert.equal(report.status,'FAILED');assert.equal(row.status,'FAILED');
  assert.equal(row.error.name,'AssertionError');assert(row.error.message.startsWith(C.control.markers[league]),'Exact owned frame refusal');
  assert.equal(report.copiedControls.length,0,'No unreached copied guard credit');
  assert.equal(row.telemetry.length,1,'Actual Next telemetry reached');
  const actual=JSON.parse(fs.readFileSync(path.join(dir,row.id+'-actual-season.json'),'utf8'));
  assert.equal(actual.actual.seasons.length,actual.input.seasons.length+1,'Actual saved senior row reached before frame refusal');
  assert.equal(row.failureState.rawSave,actual.actualRaw,'Failure original retains actual post-Next saved career');
  assert(row.failurePNG&&row.failureState.htmlFile,'Original failure screenshot and HTML retained');
  assert.equal(sha(fs.readFileSync(path.join(dir,row.failurePNG.file))),row.failurePNG.sha256);
  const changed=compiled.chunks.find(chunk=>chunk.modules.includes(C.control.path)),loaded=row.custody.loadedCurrentGroups.find(group=>group.module===C.control.path);
  assert(changed&&loaded&&loaded.sha256===changed.sha256,'Actual controlled UI chunk reached browser');
 }else{
  assert.equal(raw,0);assert.equal(report.status,'PASSED');assert(report.cases.every(row=>row.status==='PASSED'&&row.captures.length===4));
  assert.deepEqual(report.copiedControls.map(row=>row.name),spec.copiedGuards,'All retained copied guard identities');
 }
 assert.deepEqual(inventory(path.join(COPY,'dist')),compiled.distFiles,'Dist held through actual browser');
 held(control);dependencies();write(id+'/ADMISSION.json',{rawExit:raw,league,control,reportSHA256:sha(fs.readFileSync(path.join(dir,'report.json'))),associated:true});return report;
}
function outcome(report){return report.cases.map(row=>({id:row.id,row:row.resultRow,save:row.rawSaveSHA256,tape:row.actionTape,cells:row.visibleCells}));}
const phase=process.argv[2];
if(phase==='compile'){
 const label=process.argv[3],mode=process.argv[4]||'';assert(['base','frame-ui','restored'].includes(label));assert(['','frame-ui'].includes(mode));await compile(label,!!mode);
}else{
 assert.equal(phase,'all');assert.deepEqual(fs.readdirSync(OUT).sort(),['controller.stderr.log','controller.stdout.log'],'Fresh evidence only controller redirects');
 let passed=false,failure,finalHolds=false,baseline={},restored={};
 try{
  assert.equal(git('rev-parse',C.product+'^{tree}'),C.tree);assert.equal(git('rev-parse','HEAD'),process.env.GITHUB_SHA);assert.equal(process.env.GITHUB_REF,'refs/heads/'+C.branch);
  assert.deepEqual(git('show','-s','--format=%P','HEAD').split(' '),[C.product],'Proof sole product parent');
  assert.equal(git('ls-tree','-r','--name-only',C.product).split('\n').length,C.productFiles);assert.equal(tracked.length,C.productFiles+C.qaPaths.length);
  assert.deepEqual(git('diff','--name-status',C.product,'HEAD').split('\n').sort(),C.qaPaths.map(name=>'A\t'+name).sort(),'Only eight QA additions');
  assert.equal(git('ls-files','--others','--exclude-standard'),'','Clean checkout before proof');
  write('identity.json',{product:C.product,tree:C.tree,proof:git('rev-parse','HEAD'),proofFiles:tracked.length,ref:process.env.GITHUB_REF,appOverlays:0});
  write('checkout.before.json',checkout());fs.writeFileSync(path.join(OUT,'tracked-files.nul'),tracked.join('\0')+'\0');
  git('archive','--format=tar','-o',path.join(OUT,'product-source.tar'),C.product);git('archive','--format=tar','-o',path.join(OUT,'proof-source.tar'),'HEAD');
  fs.mkdirSync(COPY);for(const name of tracked){const from=path.join(ROOT,name),to=path.join(COPY,name);fs.mkdirSync(path.dirname(to),{recursive:true});fs.copyFileSync(from,to);fs.chmodSync(to,fs.statSync(from).mode&0o777);}
  fs.writeFileSync(path.join(OUT,'node-egress.log'),'');
  zero('npm-ci','npm',['ci'],{},ROOT);write('dependencies.before.json',inventory(path.join(ROOT,'node_modules')));
  fs.symlinkSync(path.join(ROOT,'node_modules'),path.join(COPY,'node_modules'),'dir');held();
  zero('types',process.execPath,[path.join(COPY,'node_modules/typescript/bin/tsc'),'--noEmit','-p','tsconfig.app.json'],offline());held();dependencies();
  zero('ordinary-build','npm',['run','build'],offline());const ordinary=inventory(path.join(COPY,'dist'));write('ordinary-dist.json',ordinary);held();
  const base=rebuild('base',false);assert.deepEqual(base.distFiles,ordinary,'Inert module observer byte-equal ordinary build');archive('dist-base',path.join(COPY,'dist'));
  const tools=path.join(OUT,'browser-tools'),browsers=path.join(OUT,'browsers'),fonts=path.join(OUT,'font-cache');
  zero('browser-install','npm',['install','--prefix',tools,'--no-save','--package-lock=false','playwright@1.64.0'],{},ROOT);
  for(const name of ['playwright','playwright-core']){assert(!fs.existsSync(path.join(ROOT,'node_modules',name)));fs.symlinkSync(path.join(tools,'node_modules',name),path.join(ROOT,'node_modules',name),'dir');}
  zero('browser-versions',process.execPath,['-e','const a=require("node:assert/strict");a.equal(require("playwright/package.json").version,"1.64.0");a.equal(require("playwright-core/package.json").version,"1.64.0");console.log(process.version,require("playwright/package.json").version)'],{},ROOT);
  zero('chromium-install',process.execPath,[path.join(tools,'node_modules/playwright/cli.js'),'install','--with-deps','chromium'],{PLAYWRIGHT_BROWSERS_PATH:browsers},ROOT);
  zero('font-prefetch',process.execPath,['scripts/qa/freeKickLab1070.mjs','--prefetch-fonts-only'],{FREE_KICK_FONT_CACHE:fonts,NODE_OPTIONS:''});
  write('browser-tools.json',{tools,browsers,fonts,version:'1.64.0',manifestSHA256:sha(fs.readFileSync(path.join(fonts,'manifest.json')))});write('browser-tools.bodies.json',inventory(tools));held();dependencies();
  for(const league of ['L2','SB'])baseline[league]=browser('normal-'+league,'base',league);
  const file=path.join(COPY,C.control.path),fixed=fs.readFileSync(file),text=fixed.toString('utf8');
  assert.equal(blob(fixed),C.control.original.gitBlob);assert.equal(text.split(C.control.before).length-1,1,'Unique active JSX control');
  const changed=Buffer.from(text.replace(C.control.before,()=>C.control.after));assert.equal(blob(changed),C.control.changed.gitBlob);assert.equal(sha(changed),C.control.changed.sha256);
  fs.mkdirSync(path.join(OUT,'control-source'));fs.writeFileSync(path.join(OUT,'control-source/original.tsx'),fixed);fs.writeFileSync(path.join(OUT,'control-source/changed.tsx'),changed);write('control-source/mutation.json',C.control);
  try{
   fs.writeFileSync(file,changed);held(true);const controlled=rebuild('frame-ui',true),before=base.chunks.find(chunk=>chunk.modules.includes(C.control.path)),after=controlled.chunks.find(chunk=>chunk.modules.includes(C.control.path));
   assert(before&&after&&before.sha256!==after.sha256,'Physical UI source control changes generated chunk');archive('dist-frame-ui',path.join(COPY,'dist'));
   for(const league of ['L2','SB'])browser('control-'+league,'frame-ui',league,true);
  }finally{
   fs.writeFileSync(file,fixed);held();const final=rebuild('restored',false);assert.deepEqual(final.distFiles,base.distFiles,'Exact same-copy healthy dist restored');
   archive('dist-restored',path.join(COPY,'dist'));for(const league of ['L2','SB']){restored[league]=browser('restored-'+league,'restored',league);assert.deepEqual(outcome(restored[league]),outcome(baseline[league]),'Same actual restored outcomes '+league);}
  }
  assert.equal(fs.statSync(path.join(OUT,'node-egress.log')).size,0,'No Node production egress');
  write('BROWSER-ADMISSION.json',{product:C.product,tree:C.tree,healthyJourneys:6,restoredJourneys:6,physicalControls:['L2/1280/L2_FRAME','SB/390/SB_FRAME'],copiedGuardsPerHealthyFleet:10,ordinaryBuildByteEqualObserved:true,sameCopyDistRestored:true,limits:C.limits,fullSuite:'UNRUN',fullSEO:'UNRUN',caps:'SEPARATE_ROOT_PREREQUISITE_NO_WAIVER'});passed=true;
 }catch(error){failure={name:error.name,message:error.message,stack:error.stack};write('QUALIFICATION-ERROR.json',failure);}
 finally{
  const errors=[];if(fs.existsSync(path.join(COPY,'package.json'))){try{held();if(fs.existsSync(path.join(OUT,'dependencies.before.json')))dependencies();finalHolds=true;}catch(error){errors.push(String(error));}}
  try{if(fs.existsSync(path.join(COPY,'package.json')))archive('matched-final',COPY,true);if(fs.existsSync(path.join(OUT,'font-cache')))archive('font-cache',path.join(OUT,'font-cache'));}catch(error){errors.push(String(error));finalHolds=false;}
  write('FINAL-HOLDS.json',{held:finalHolds,errors,sourceArchiveRetained:fs.existsSync(path.join(OUT,'proof-source.tar'))&&fs.existsSync(path.join(OUT,'product-source.tar')),appAndDataBodiesHeld:finalHolds,fullSuite:'UNRUN',fullSEO:'UNRUN',caps:'SEPARATE_ROOT_PREREQUISITE_NO_WAIVER'});
  write('COMPLETION.json',{status:passed&&finalHolds?'SCOPED_BROWSER_QUALIFIED':'FAILED_RETAIN_ALL_ACTUALS',product:C.product,source:process.env.GITHUB_SHA,failure,limits:C.limits});process.exitCode=passed&&finalHolds?0:1;
 }
}
