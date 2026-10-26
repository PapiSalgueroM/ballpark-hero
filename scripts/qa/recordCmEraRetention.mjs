import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

let failurePath;
async function main(){
 const [arm,rootArg,outArg,...extraArgs]=process.argv.slice(2);
 assert(extraArgs.length===0&&(arm==='baseline'||arm==='candidate'),'CM_ERA_RECORD_ARGUMENTS');
 const ROOT=fs.realpathSync(rootArg),OUT=path.resolve(outArg),SELF=fs.realpathSync(fileURLToPath(import.meta.url));
 assert(!fs.existsSync(OUT)&&OUT!==ROOT&&!OUT.startsWith(ROOT+path.sep),'CM_ERA_FRESH_OUTSIDE');
 assert(fs.lstatSync(path.dirname(OUT)).isDirectory());
 fs.mkdirSync(OUT);failurePath=path.join(OUT,'failure.json');
 const sha=b=>createHash('sha256').update(b).digest('hex');
 const blob=b=>createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
 const output=name=>{assert.equal(path.basename(name),name);return path.join(OUT,name);};
 const write=(name,body)=>fs.writeFileSync(output(name),body,{flag:'wx'});
 const save=(name,value)=>write(name,JSON.stringify(value,null,2)+'\n');
 function regular(file){const stat=fs.lstatSync(file);assert(stat.isFile()&&!stat.isSymbolicLink(),'CM_ERA_REGULAR_FILE');return fs.readFileSync(file);}
 const SOURCE_PINS={"src/lib/clubManagerEras.ts":{"bytes":55905,"sha256":"74fcf309fee3943670a4ec1c44333a68ffb290f67b1d1325769dc2d368e55ec3","gitBlob":"8ebd4c560e81ba65dd4712d3271bcfd05a906d2b","role":"runtime"},"src/lib/clubManagerTrajectory.ts":{"bytes":3038,"sha256":"7c235eacea92c60509cd2d02321b62dc924ed06e2543d6bc24f27ae790925da6","gitBlob":"08273e767320b6b268cf9a071511611fc2468136","role":"runtime"},"src/data/clubManagerRosters.ts":{"bytes":276025,"sha256":"f1a2ef3b68df755765e624d359831cf2627378e6987b3387d26f2943a087bbed","gitBlob":"01a6be13a8bc7f4594f8a5810a19a4c959001dbf","role":"runtime"},"src/data/clubManagerWorldRosters.ts":{"bytes":4830,"sha256":"32f4d470368576706016afb77508a15b4be5335f700eb223af6aec783a64e65d","gitBlob":"dd40be6c6a2060eadc7b546a74b91b0d6f66f3ec","role":"runtime"},"src/data/clubManagerALeague2026.ts":{"bytes":32647,"sha256":"5fb22a86874955dd53e704bbbcf8c09cf935f301ddd96c6d9a4ad7f00a059ece","gitBlob":"89be13074147347c1fdb8277255077a5567a0d77","role":"runtime"},"src/data/clubManagerRussia2026.ts":{"bytes":40325,"sha256":"ccbb26127e4609f743ef07593f186efa36ebed6f6c163622746544bdf1ca02ba","gitBlob":"13c075218cac112a1e09b1db3658d274c9661588","role":"runtime"},"src/data/clubManagerEra2010.ts":{"bytes":107562,"sha256":"ca2955e4c541d3e76bbd527382ee92c613010150876d99c590bf0117fef36e5f","gitBlob":"1f34b2305279348a0b5ba2d5b056aa4ac47499a2","role":"runtime"},"src/data/clubManagerEra2015.ts":{"bytes":102476,"sha256":"4c65cb2f0c76abc8ca9388a0d090499f4bfed1a10c9f4ae46ded1fa8750d6a6c","gitBlob":"47c8044b864564db419dcb1f5b36e7ce02ae0344","role":"runtime"},"src/data/clubManagerEra2005.ts":{"bytes":106546,"sha256":"bdd5c1f5eaeeae5a0a2b9394010f1aac3d407f48e0b8c6b2669e75b89668ee6a","gitBlob":"31f40b53e7f568eef4e6246bc38e22b42223a772","role":"runtime"},"src/data/clubManagerEra2020.ts":{"bytes":109379,"sha256":"2e8d121349d0d056dc3834f60f8e470459f1518d60f896c6181511a97cbfc5b3","gitBlob":"a6ca4b97e0eec1f1389d14621beb8c9148c3f095","role":"runtime"},"src/data/playerNationalities.ts":{"bytes":142698,"sha256":"db21b93b9a7202e88f7e66bb5d0774261e4b05ab5cda8ed8d0e4f411288c8779","gitBlob":"5cfd22a23453577cc15834b54a7c713d4e28275b","role":"runtime"},"src/data/nationalities/era2020.ts":{"bytes":55043,"sha256":"d0c8b1b9bec1c29f0f9727bbe6d9d55f2ed5f71d6578594412efcaa776932522","gitBlob":"a74e62e5768bcead6547c34075468ad8bd2e5b4a","role":"runtime"},"src/data/nationalities/era2015.ts":{"bytes":51422,"sha256":"e52489a133a95b989959266edfae9651e9dc52b2af0cb4e9b9aab1f515fa2637","gitBlob":"8dc92bf5533ee12652695c141b2b0e86e9b46a08","role":"runtime"},"src/data/nationalities/era2010.ts":{"bytes":54112,"sha256":"c1cc235a5e243520b639800cc9abdb8074060f8d8d4c578ac847c755d0cd7bb3","gitBlob":"782d4930ec3ec1e3900e3e7aa9157fd0c57e29fa","role":"runtime"},"src/data/nationalities/era2005.ts":{"bytes":53661,"sha256":"8fdd3851fd30f7d5f22e1cc97b618f1b97c0c6316b02ad4dae44a90dacb86e1f","gitBlob":"abe7ef244e83fb5ee71f10adfe8f218ff919f479","role":"runtime"},"src/types/game.ts":{"bytes":3484,"sha256":"46ea390790fb89ed8818338251ad6cedb7a14fae4e0bcfc6612dd23219724ff3","gitBlob":"3a894340e0434cd3e5c7ebfce7d436eef131a3d6","role":"source-binding-only"},"tsconfig.json":{"bytes":396,"sha256":"406e63e666958bb699aae6562e561a0cec963ee3dfe771c644ace7d97304974f","gitBlob":"6b68d80b7d92d0c4a5d774897f2bedfa95b42669","role":"source-binding-only"},"tsconfig.app.json":{"bytes":680,"sha256":"b12030bfe21ea5be66670842c71d66d194d1771f93f0b8c076e97c867b4b0552","gitBlob":"51f581dd91641b4c1f1219f646788e73cf6bf00c","role":"source-binding-only"},"package.json":{"bytes":3495,"sha256":"acfe14626dea53cf5f9c5e0286b766a22237656b52aac4c888b080873ac90e31","gitBlob":"2ff64986fb76ebc51b706f2fd24765768874008a","role":"source-binding-only"},"package-lock.json":{"bytes":309049,"sha256":"c7e3867eabf0bfa03a8aa6a5e601b0050b937ed210d48c6bbd241019e3c9ea76","gitBlob":"97d6f12a052f25f400462938c241789a083f0bfe","role":"source-binding-only"},"scripts/lib/offlineTransport.cjs":{"bytes":10660,"sha256":"e60ff1534307e449ccef598e3b7470dcba58681b82cea4005cec7319f14f9221","gitBlob":"0fda542a2649fe5da937c6976fd0f5b6073e74b6","role":"source-binding-only"},"scripts/simEras.mjs":{"bytes":55390,"sha256":"82f5119eaaa5f1e54b335e32190250c0290adddc32f0be8c9b51ef1833f5e469","gitBlob":"db0e5773224513fb0b828d657ba7d6fd81cb5bea","role":"source-binding-only"},"src/lib/clubManagerWorldRoster.ts":{"bytes":21152,"sha256":"f6adb423530a29fc75fcc6e759bb746e6885b2b718ef4dc12033304e8669e4b4","gitBlob":"8fc15c82723512dd36482747bf9d06f8c731fa01","role":"source-binding-only"}};
 const ERAS='src/lib/clubManagerEras.ts';
 const candidate={bytes:55986,sha256:'4cc47c4d80912bb2fd8aaa8e8246ce92db3eac69c5ad1e14f8576643eed31c54',gitBlob:'9dac14a65c0a31754b2e6cfa255c1f31e0bba763'};
 function sourceBinding(){
  const rows={};
  for(const [file,pin]of Object.entries(SOURCE_PINS)){
   const absolute=path.join(ROOT,file),body=regular(absolute),expected=file===ERAS&&arm==='candidate'?candidate:pin;
   assert.equal(fs.realpathSync(absolute),absolute,'CM_ERA_SOURCE_REALPATH');
   assert.equal(body.length,expected.bytes,'CM_ERA_SOURCE_BYTES');assert.equal(sha(body),expected.sha256,'CM_ERA_SOURCE_SHA');assert.equal(blob(body),expected.gitBlob,'CM_ERA_SOURCE_GIT');
   rows[file]={bytes:body.length,sha256:sha(body),gitBlob:blob(body),role:pin.role};
  }
  return rows;
 }
 for(const name of ['SIM_ERAS_CONTROL','SIM_SEED','CM_ERA_CONTROL','NODE_PATH','NO_DOUBLE_SWAP'])assert.equal(process.env[name],undefined,'CM_ERA_NO_INHERITED_OVERRIDE');
 assert.equal(process.env.SIM_NETWORK,'offline');
 assert.equal(process.env.NODE_OPTIONS,'--require='+path.join(ROOT,'scripts/lib/offlineTransport.cjs'),'CM_ERA_ORIGINAL_OFFLINE_GUARD');
 assert(process.env.SIM_OFFLINE_RECEIPT,'CM_ERA_OUTER_RECEIPT');assert.equal(regular(process.env.SIM_OFFLINE_RECEIPT).length,0);
 const before=sourceBinding();
 const recorder={file:SELF,bytes:regular(SELF).length,sha256:sha(regular(SELF)),pid:process.pid,argv:process.argv,cwd:process.cwd(),root:ROOT,arm};
 save('recorder-start.json',recorder);save('source-bindings.before.json',before);write('clubManagerEras.actual.ts',regular(path.join(ROOT,ERAS)));
 const entry="globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };\n"+
  "const E = await import("+JSON.stringify(path.join(ROOT,ERAS).split(path.sep).join('/'))+");\n"+
  "const WORLD = await import("+JSON.stringify(path.join(ROOT,'src/data/clubManagerWorldRosters.ts').split(path.sep).join('/'))+");\n"+
  "export { E, WORLD };\n";
 write('entry.mjs',entry);
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
 const packageBody=regular(path.join(ROOT,'node_modules/esbuild/package.json')),toolPackage=JSON.parse(packageBody),lock=JSON.parse(regular(path.join(ROOT,'package-lock.json')));
 assert.equal(toolPackage.name,'esbuild');assert.equal(toolPackage.version,lock.packages['node_modules/esbuild'].version,'CM_ERA_LOCKED_ESBUILD');
 const bundlerCommand=path.join(ROOT,'node_modules/.bin/esbuild'),resolvedBundler=fs.realpathSync(bundlerCommand),bundlerBody=regular(resolvedBundler);
 save('bundler-tool.json',{command:bundlerCommand,resolved:resolvedBundler,bytes:bundlerBody.length,sha256:sha(bundlerBody),packageSha256:sha(packageBody),version:toolPackage.version,scope:'Installed native esbuild CLI. NODE_OPTIONS does not instrument native Go code; no provider or application network request is part of this bundle operation.'});
 const args=[output('entry.mjs'),'--bundle','--format=esm','--platform=node','--tsconfig='+path.join(ROOT,'tsconfig.app.json'),'--metafile='+output('bundle.metafile.json'),'--outfile='+output('bundle.mjs'),'--log-level=error'];
 const built=await run('bundle',args,0,240000,{},bundlerCommand);
 const native=built.record;
 assert(Number.isInteger(native.pid)&&native.pid>0&&native.closed&&native.status===0&&native.signal===null&&native.error===null&&!native.deadlineExpired&&native.receiptBytes===0,'CM_ERA_BUNDLE_NATIVE_ZERO');
 const metadata=JSON.parse(regular(output('bundle.metafile.json'))),closure={};
 for(const [input,info]of Object.entries(metadata.inputs)){
  const absolute=path.resolve(ROOT,input),body=regular(absolute);
  if(absolute===output('entry.mjs')){assert.equal(body.toString(),entry);closure['@entry']={bytes:body.length,sha256:sha(body)};}
  else{
   assert(absolute.startsWith(ROOT+path.sep),'CM_ERA_BUNDLE_NO_FOREIGN_SOURCE');
   const relative=path.relative(ROOT,absolute).split(path.sep).join('/');
   assert(SOURCE_PINS[relative]?.role==='runtime','CM_ERA_BUNDLE_EXACT_CLOSURE');
   assert.equal(info.bytes,body.length);assert.deepEqual({bytes:body.length,sha256:sha(body),gitBlob:blob(body)},{bytes:before[relative].bytes,sha256:before[relative].sha256,gitBlob:before[relative].gitBlob});
   closure[relative]={bytes:body.length,sha256:sha(body),gitBlob:blob(body)};
  }
 }
 assert.deepEqual(Object.keys(closure).sort(),['@entry',...Object.keys(SOURCE_PINS).filter(file=>SOURCE_PINS[file].role==='runtime')].sort(),'CM_ERA_BUNDLE_COMPLETE_CLOSURE');
 const emitted=Object.entries(metadata.outputs);assert.equal(emitted.length,1);assert.equal(path.resolve(ROOT,emitted[0][0]),output('bundle.mjs'));
 assert.deepEqual(emitted[0][1].imports,[],'CM_ERA_NO_EXTERNAL_BUNDLE_IMPORT');
 const bundle=regular(output('bundle.mjs'));
 save('resolved-module-graph.json',{arm,root:ROOT,entry:{bytes:Buffer.byteLength(entry),sha256:sha(Buffer.from(entry))},inputs:closure,explicitTsconfig:path.join(ROOT,'tsconfig.app.json'),bundle:{file:output('bundle.mjs'),bytes:bundle.length,sha256:sha(bundle)},metafile:{bytes:regular(output('bundle.metafile.json')).length,sha256:sha(regular(output('bundle.metafile.json')))},bundlerNative:native});
 const {E,WORLD}=await import(pathToFileURL(output('bundle.mjs')).href);
 await E.ensureAllEraRosters();
 const modern={rosters:WORLD.CM_WORLD_ROSTERS,partial:WORLD.CM_WORLD_PARTIAL};
 const modernBody=Buffer.from(JSON.stringify(modern,null,2)+'\n');write('modern-source-world.json',modernBody);
 const records=[],contexts=[{era:'era2005',seed:null},{era:'era2005',seed:31},{era:'now',seed:null},{era:'now',seed:31}];
 for(const context of contexts){
  const years=[0,1,2,3,4,5,6,7,8,9,10,...(context.era==='now'&&context.seed===null?[20,30]:[])];
  for(const year of years){
   const id=context.era+'-'+(context.seed===null?'unseeded':'seed31')+'-y'+String(year).padStart(2,'0');
   const startedAt=new Date().toISOString(),world=E.projectedWorldFor(context.era,year,context.seed===null?undefined:context.seed);
   const body=Buffer.from(JSON.stringify(world,null,2)+'\n');
   write(id+'.world.json',body);
   const xis={};for(const club of Object.keys(world))xis[club]=E.projectedXIAvg(club,year,context.era,context.seed===null?undefined:context.seed);
   const row={id,era:context.era,seed:context.seed,year,startYear:E.eraById(context.era).startYear,effectiveCacheKey:context.era+'|'+year+(year>0&&context.seed!==null?'|seed:'+context.seed:''),file:id+'.world.json',bytes:body.length,sha256:sha(body),xis,startedAt,recordedAt:new Date().toISOString(),pid:process.pid};
   save(id+'.record.json',row);records.push(row);
  }
 }
 assert.equal(records.length,46);assert.equal(new Set(records.map(row=>row.effectiveCacheKey)).size,44);
 for(const era of ['era2005','now'])assert.equal(records.find(row=>row.era===era&&row.year===0&&row.seed===null).sha256,records.find(row=>row.era===era&&row.year===0&&row.seed===31).sha256,'CM_ERA_YEAR_ZERO_CACHE_ALIAS');
 const after=sourceBinding();assert.deepEqual(after,before,'CM_ERA_SOURCE_END_HOLD');save('source-bindings.after.json',after);
 assert.equal(sha(regular(output('bundle.mjs'))),sha(bundle),'CM_ERA_BUNDLE_END_HOLD');assert.equal(regular(process.env.SIM_OFFLINE_RECEIPT).length,0);
 save('index.json',{schema:'cm-era-retention-recordings-v1',arm,recorder,records,sourceBindings:before,modern:{file:'modern-source-world.json',bytes:modernBody.length,sha256:sha(modernBody)},bundle:{file:'bundle.mjs',bytes:bundle.length,sha256:sha(bundle)},resolvedGraph:'resolved-module-graph.json',worldRecords:46,effectiveCacheKeys:44,fullHarness:false,guardVerdict:'NOT_JUDGED_HERE',userSaveReproduced:false});
 save('recorder-complete.json',{arm,pid:process.pid,worldRecords:46,effectiveCacheKeys:44,sourceEndHeld:true,offlineReceiptBytes:0,scope:'Actual full-world API recording only. Guard and candidate decisions belong to the paired judge.',completedAt:new Date().toISOString()});
}
main().catch(error=>{try{if(failurePath)fs.writeFileSync(failurePath,JSON.stringify({name:error.name,message:error.message,stack:error.stack,pid:process.pid},null,2)+'\n',{flag:'wx'});}catch{}console.error(error.stack??error);process.exitCode=1;});
