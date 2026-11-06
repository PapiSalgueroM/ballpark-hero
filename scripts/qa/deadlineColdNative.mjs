import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { createRequire } from 'node:module';
import pw, { chromium } from '../lib/playwrightLoader.mjs';
import { answerConsent } from '../lib/answerConsent.mjs';
import { waitForScrollIdle } from './nativeScrollReady.mjs';

const arg=name=>{const i=process.argv.indexOf(name);assert(i>=0&&process.argv[i+1],name);return process.argv[i+1];};
const out=path.resolve(arg('--out')),dist=path.resolve(arg('--dist')),base=arg('--base-url').replace(/\/$/,''),origin=new URL(base).origin;
assert(process.env.CI,'Remote CI only');assert.equal(new URL(base).hostname,'127.0.0.1','Completed local dist only');
const sha=b=>createHash('sha256').update(b).digest('hex'),blob=b=>createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex'),clone=v=>JSON.parse(JSON.stringify(v));
const write=(file,v)=>fs.writeFileSync(path.join(out,file),JSON.stringify(v,null,2)+'\n');
function silent(){assert(process.env.SIM_OFFLINE_RECEIPT);assert.equal(fs.readFileSync(process.env.SIM_OFFLINE_RECEIPT).length,0,'DEADLINE_NATIVE_OFFLINE_RECEIPT');}
silent();assert(!fs.existsSync(out)||fs.readdirSync(out).length===0,'Fresh owned output');
for(const name of['frames','bodies','reference'])fs.mkdirSync(path.join(out,name),{recursive:true});
const m=JSON.parse(fs.readFileSync(arg('--manifest'),'utf8'));
assert.equal(m.schema,'DEADLINE_COLD_NATIVE_SOURCE_DIST_V1');assert.equal(m.status,'QUALIFIED_FIXED_BUILD_NATIVE_INPUT');
for(const key of['commit','tree'])assert.match(m.product[key],/^[a-f0-9]{40}$/);
for(const key of['build','headless'])assert.match(m.admissions[key],/^[a-f0-9]{64}$/);
assert.deepEqual(m.sourceBefore,m.sourceAfter);
function sourceHeld(){for(const[file,hash]of Object.entries(m.sourceAfter))assert.equal(sha(fs.readFileSync(file)),hash,file);}
sourceHeld();
const pinned={
 'src/hooks/useDeadlineDay.ts':'8fa614ad931757951486c937a775a0ad680f5881',
 'src/lib/deadlineDay.ts':'2b9e1ec39f7a699e876298706f0124cae4288fe9',
 'src/hooks/useGameCompletion.ts':'b104822551fd5d9b1c5d6ddb14f01c79e5a662b2',
 'src/lib/completions.ts':'61daf9b6c528f884551cd1d42f71357681c8728a',
 'src/components/game/ResultScreen.tsx':'dd6a06380851ab68d3b85c3a567d77c99e88b386',
 'scripts/simDeadlineDay.mjs':'03e9f8fa30080e50d8dd551fba11755dc00e7b07'
};
for(const[file,pin]of Object.entries(pinned)){assert(m.sourceAfter[file]);assert.equal(blob(fs.readFileSync(file)),pin,file);}
const taskRequire=createRequire(path.join(process.cwd(),'package.json')),ts=taskRequire('typescript');
const originalBoard=fs.readFileSync(arg('--original-board'));
assert.equal(blob(originalBoard),'8d6e012def957f92a8cf2aa001c0b5a5d006a711','Actual old played-view source authority');
function declarationMap(text,file){
 const ast=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),rows=new Map();
 for(const node of ast.statements){if(ts.isImportDeclaration(node))continue;
  const name=node.name?.text??(ts.isVariableStatement(node)&&node.declarationList.declarations.length===1?node.declarationList.declarations[0].name.getText(ast):null);
  if(name){assert(!rows.has(name));rows.set(name,node.getText(ast).replace(/^export /,''));}
 }return rows;
}
const viewPath='src/components/deadline-day/DeadlineDayViews.tsx',oldDeclarations=declarationMap(originalBoard.toString('utf8'),'old-Board.tsx'),newDeclarations=declarationMap(fs.readFileSync(viewPath,'utf8'),viewPath),presentation=[];
for(const[name,text]of newDeclarations){assert(oldDeclarations.has(name),'Existing source declaration '+name);assert.equal(text,oldDeclarations.get(name),'Whole original played-view declaration '+name);presentation.push({name,bytes:Buffer.byteLength(text),sha256:sha(text)});}
assert.deepEqual([...newDeclarations.keys()],['Hook','STATUS','LIVE','round1','Dots','Strip','tileLine','Desk','FeeTable','TermsTable','Deal','Sales','Result']);
fs.writeFileSync(path.join(out,'reference','original-DeadlineDayBoard.tsx'),originalBoard);fs.copyFileSync(viewPath,path.join(out,'reference','current-DeadlineDayViews.tsx'));
write('presentation-source-bridge.json',{originalGitBlob:blob(originalBoard),originalBytes:originalBoard.length,currentViewGitBlob:blob(fs.readFileSync(viewPath)),declarations:presentation,scope:'Full executable source declarations equal after removal of only export prefixes. No old played-browser baseline claim.'});
function inventory(){const rows=[];function walk(rel=''){for(const e of fs.readdirSync(path.join(dist,rel),{withFileTypes:true})){const file=path.posix.join(rel,e.name);if(e.isDirectory())walk(file);else{assert(e.isFile());const b=fs.readFileSync(path.join(dist,file));rows.push({file,bytes:b.length,sha256:sha(b)});}}}walk();return rows.sort((a,b)=>a.file<b.file?-1:a.file>b.file?1:0);}
assert.deepEqual(inventory(),m.distBefore);assert.equal(sha(JSON.stringify(m.distBefore)),m.distDigest);
const refs=new Map(m.distBefore.map(r=>[r.file,r])),observed=new Map();
const leafRows=m.distBefore.filter(r=>r.file.startsWith('assets/')&&r.file.endsWith('.js')&&/["']data-testid["']\s*:\s*["']deadline-desk["']/.test(fs.readFileSync(path.join(dist,r.file),'utf8')));
assert.equal(leafRows.length,1,'DEADLINE_NATIVE_ONE_EXECUTABLE_VIEW_LEAF');
const leaf=leafRows[0],leafURL=origin+'/'+leaf.file,KEY='deadline-day-free',STALE='dukb-reloaded-stale-chunk';
const report={schema:'DEADLINE_COLD_NATIVE_ACTUAL_V1',status:'incomplete',product:m.product,admissions:m.admissions,manifestSHA256:sha(fs.readFileSync(arg('--manifest'))),executableLeaf:leaf,contexts:[],screenshots:[],scope:'Three fresh widths, real free-play UI and natural browser RNG/clock. Actual v1 action receipts and full DOM/storage, no hidden full DeadlineRun/browser RNG tape claim. Source-derived replay references are separately labelled. Existing view navigation reveal movement is retained, late leaf arrival and ordinary screenshot holds are strict. Every backend write is physically aborted; only one actual source-bound End completion attempt is separately classified.'};
const known=new Set(['https://flagcdn.com','https://fonts.googleapis.com','https://fonts.gstatic.com','https://flawuiqbvjobmkfkauhw.supabase.co']);
const idle=p=>p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
const scrollOf=p=>p.evaluate(()=>({x:scrollX,y:scrollY}));
const active=p=>p.evaluate(()=>{const n=document.activeElement;return n?{tag:n.tagName,id:n.id,name:n.getAttribute('aria-label'),text:n.textContent?.trim().slice(0,100)}:null;});
function validateReceipt(raw){
 if(raw===null)return null;assert.equal(typeof raw,'string');const v=JSON.parse(raw);
 assert.deepEqual(Object.keys(v).sort(),['actions','club','done','seed','v']);assert.equal(v.v,1);assert.equal(typeof v.club,'string');assert(v.club.length>0);
 assert(Number.isInteger(v.seed)&&v.seed>=0&&v.seed<=4294967295);assert.equal(typeof v.done,'boolean');assert(Array.isArray(v.actions)&&v.actions.length<=80);
 for(const a of v.actions){assert(a&&typeof a==='object');assert(['open','walk','sell','bid','terms','end'].includes(a.t));
  if(['open','walk','sell','bid','terms'].includes(a.t))assert(Number.isInteger(a.i)&&a.i>=0&&a.i<40);
  if(a.t==='bid')assert(Number.isFinite(a.amt)&&a.amt>=.1&&a.amt<=100000);
  if(a.t==='terms')assert(Number.isFinite(a.wage)&&a.wage>=1&&a.wage<=100000&&Number.isFinite(a.years)&&a.years>=1&&a.years<=10&&Number.isFinite(a.bonus)&&a.bonus>=0&&a.bonus<=100000);
 }return v;
}
const referenceDependency={file:'node_modules/lz-string/libs/lz-string.js',bytes:16032,sha256:'550034b821027008776cb9bcd1700bb5d31e8b3de224cb130fc966a75dab0e5e',lockFile:'package-lock.json',lockKey:'node_modules/lz-string',version:'1.5.0',resolved:'https://registry.npmjs.org/lz-string/-/lz-string-1.5.0.tgz',integrity:'sha512-h5bgJWpxJNswbU7qCrV0tIKQCaS3blPDrqKWx+QxzuzL1zGUzij9XCWLrSLsJPu5t+eWA/ycetzYAO5IOMcWAQ=='};
function validateReferenceDependency(bytes,lock){
 const row=lock.packages?.[referenceDependency.lockKey];
 assert(row&&row.version===referenceDependency.version&&row.resolved===referenceDependency.resolved&&row.integrity===referenceDependency.integrity,'DEADLINE_REFERENCE_DEPENDENCY_LOCK');
 assert.equal(bytes.length,referenceDependency.bytes,'DEADLINE_REFERENCE_DEPENDENCY_BODY');
 assert.equal(sha(bytes),referenceDependency.sha256,'DEADLINE_REFERENCE_DEPENDENCY_BODY');
}
const referenceDependencyBytes=fs.readFileSync(referenceDependency.file),referenceLock=JSON.parse(fs.readFileSync(referenceDependency.lockFile,'utf8'));
fs.writeFileSync(path.join(out,'reference/lz-string-1.5.0.js'),referenceDependencyBytes,{flag:'wx'});
validateReferenceDependency(referenceDependencyBytes,referenceLock);
function referenceDependencyHeld(){
 const bytes=fs.readFileSync(referenceDependency.file);validateReferenceDependency(bytes,JSON.parse(fs.readFileSync(referenceDependency.lockFile,'utf8')));
 assert(bytes.equals(referenceDependencyBytes),'DEADLINE_REFERENCE_DEPENDENCY_BODY');
}
function validateReferenceInputs(rows,source){
 for(const row of rows){const expected=Object.hasOwn(source,row.file)?source[row.file]:row.file===referenceDependency.file?referenceDependency.sha256:undefined;assert.notEqual(expected,undefined,'DEADLINE_REFERENCE_INPUT_PROTECTION');assert.equal(row.sha256,expected,'DEADLINE_REFERENCE_INPUT_PROTECTION');}
 assert.equal(rows.filter(row=>row.file===referenceDependency.file).length,1,'DEADLINE_REFERENCE_DEPENDENCY_CENSUS');
}
const referenceControls=[];
function referenceRejected(label,marker,run,file){
 let owned;try{run();}catch(error){owned=error;}assert(owned instanceof assert.AssertionError);assert(owned.message.includes(marker));
 referenceControls.push({label,file,changed:true,owned:{name:owned.name,message:owned.message},wholeInverseExact:true});
}
const referenceEntry=path.join(out,'reference','entry.mjs'),referenceBundle=path.join(out,'reference','deadline.cjs');
fs.writeFileSync(referenceEntry,"export * as dd from '@/lib/deadlineDay';\nexport * as cm from '@/lib/clubManager';\n");
const compiled=await taskRequire('esbuild').build({entryPoints:[referenceEntry],bundle:true,platform:'node',format:'cjs',outfile:referenceBundle,metafile:true,logLevel:'silent',plugins:[{name:'actual-source-alias',setup(b){b.onResolve({filter:/^@\//},async args=>{const v=await b.resolve('./'+args.path.slice(2),{resolveDir:path.resolve('src'),kind:args.kind});return{path:v.path,errors:v.errors};});}}]});
const referenceInputs=Object.keys(compiled.metafile.inputs).filter(f=>path.resolve(f)!==referenceEntry).map(file=>({file:path.relative(process.cwd(),path.resolve(file)).split(path.sep).join('/'),sha256:sha(fs.readFileSync(file))}));
write('reference/input-manifest.json',{inputs:referenceInputs,bundle:{bytes:fs.statSync(referenceBundle).size,sha256:sha(fs.readFileSync(referenceBundle))},dependency:referenceDependency,scope:'Every tracked input matches the authenticated source map. Only the exact separately pinned lz-string dependency is additional; unknown inputs are fatal. Source-bound Node reference only, with no browser model hook, clock or RNG override.'});
validateReferenceInputs(referenceInputs,m.sourceAfter);
const trackedAt=referenceInputs.findIndex(row=>Object.hasOwn(m.sourceAfter,row.file)),dependencyAt=referenceInputs.findIndex(row=>row.file===referenceDependency.file);
assert(trackedAt>=0&&dependencyAt>=0);
for(const[label,at,key,value]of[['unknown-input',trackedAt,'file','node_modules/unprotected-reference-copy.js'],['tracked-hash',trackedAt,'sha256','0'.repeat(64)],['dependency-hash',dependencyAt,'sha256','0'.repeat(64)]]){
 const copied=clone(referenceInputs),old=copied[at][key];assert.notEqual(old,value);copied[at][key]=value;const file='reference/control-'+label+'.json';write(file,copied);
 referenceRejected(label,'DEADLINE_REFERENCE_INPUT_PROTECTION',()=>validateReferenceInputs(copied,m.sourceAfter),file);copied[at][key]=old;assert.deepEqual(copied,referenceInputs);
}
{
 const copied=clone(referenceInputs),removed=copied.splice(dependencyAt,1)[0];assert.equal(copied.length,referenceInputs.length-1);const file='reference/control-dependency-omission.json';write(file,copied);
 referenceRejected('dependency-omission','DEADLINE_REFERENCE_DEPENDENCY_CENSUS',()=>validateReferenceInputs(copied,m.sourceAfter),file);copied.splice(dependencyAt,0,removed);assert.deepEqual(copied,referenceInputs);
}
{
 const copied=Buffer.from(referenceDependencyBytes);copied[0]^=1;assert(!copied.equals(referenceDependencyBytes));const file='reference/control-dependency-body.js';fs.writeFileSync(path.join(out,file),copied,{flag:'wx'});
 referenceRejected('dependency-body','DEADLINE_REFERENCE_DEPENDENCY_BODY',()=>validateReferenceDependency(copied,referenceLock),file);copied[0]^=1;assert(copied.equals(referenceDependencyBytes));
}
{
 const copied=clone(referenceLock),old=copied.packages[referenceDependency.lockKey].version;copied.packages[referenceDependency.lockKey].version='1.5.0-copied-fault';assert.notEqual(old,copied.packages[referenceDependency.lockKey].version);const file='reference/control-dependency-lock.json';write(file,copied);
 referenceRejected('dependency-lock','DEADLINE_REFERENCE_DEPENDENCY_LOCK',()=>validateReferenceDependency(referenceDependencyBytes,copied),file);copied.packages[referenceDependency.lockKey].version=old;assert.deepEqual(copied,referenceLock);
}
validateReferenceInputs(referenceInputs,m.sourceAfter);referenceDependencyHeld();
write('reference/protection-controls.json',{controls:referenceControls,actualInputsHeld:true,dependencyBodyHeld:true,lockSourceHeld:true});
const referenceManifestBytes=fs.readFileSync(path.join(out,'reference/input-manifest.json'));
report.referenceProtection={dependency:referenceDependency,body:{file:'reference/lz-string-1.5.0.js',bytes:referenceDependencyBytes.length,sha256:sha(referenceDependencyBytes)},inputManifest:{file:'reference/input-manifest.json',bytes:referenceManifestBytes.length,sha256:sha(referenceManifestBytes)},controls:referenceControls,throughCloseHeld:false};
const nodeStorage=new Map(),oldNodeStorage=globalThis.localStorage;globalThis.localStorage={getItem:k=>nodeStorage.get(k)??null,setItem:(k,v)=>nodeStorage.set(k,String(v)),removeItem:k=>nodeStorage.delete(k),clear:()=>nodeStorage.clear()};
const reference=taskRequire(referenceBundle);
function replayReference(r,full,label){
 const saved=validateReceipt(full.value.receiptRaw);assert(saved&&saved.actions.length>0,'Only actual persisted action receipts are replayed');
 const before=clone(reference.cm.engineRegistrations()),random=Math.random;
 const run=reference.dd.replayDeadlineDay({club:saved.club,seed:saved.seed},saved.actions);
 assert.equal(Math.random,random);assert.deepEqual(reference.cm.engineRegistrations(),before);assert.deepEqual(run.actions,saved.actions);assert.equal(!!run.grade,saved.done);
 const raw=Buffer.from(JSON.stringify({label,actualFrame:full.sequence,actualReceiptRaw:full.value.receiptRaw,sourceDerivedRun:run,registrationsBefore:before,registrationsAfter:reference.cm.engineRegistrations(),scope:'Expected full replay output from actual complete receipt and protected source, not observed browser hidden state or global RNG tape.'})+'\n'),gz=gzipSync(raw),file='reference/'+r.id+'-'+r.references.length+'.json.gz';
 fs.writeFileSync(path.join(out,file),gz,{flag:'wx'});r.references.push({label,file,bytes:gz.length,sha256:sha(gz),decodedBytes:raw.length,decodedSHA256:sha(raw)});return run;
}

async function keyboardTo(p,r,target){
 assert.equal(await target.count(),1,'Unique keyboard target');
 const limit=await p.locator('a[href],button,input,select,textarea,[tabindex]').count()+2,events=[];
 for(let i=0;i<=limit;i++){if(await target.evaluate(n=>n===document.activeElement||n.contains(document.activeElement))){r.actions.push({type:'keyboard-reach',events,focus:await active(p)});return;}await p.keyboard.press('Tab');events.push(await active(p));}
 assert.fail('Actual Tab traversal did not reach the target');
}
const targetGeometry=target=>target.evaluate(n=>{const b=n.getBoundingClientRect();let clip={x:0,y:0,right:innerWidth,bottom:innerHeight};
   for(let a=n.parentElement;a;a=a.parentElement){const s=getComputedStyle(a),q=a.getBoundingClientRect();if(['auto','scroll'].includes(s.overflowY)&&a.scrollHeight>a.clientHeight+1){clip={x:Math.max(clip.x,q.x),y:Math.max(clip.y,q.y),right:Math.min(clip.right,q.right),bottom:Math.min(clip.bottom,q.bottom)};}}
   return{target:{x:b.x,y:b.y,right:b.right,bottom:b.bottom,height:b.height},clip};});
function validateTouchGeometry(box,width){
 const t=box.target,g=box.clip;
 assert(t.y>=g.y+4&&t.bottom<=g.bottom-4&&t.x>=g.x&&t.right<=Math.min(g.right,width),'DEADLINE_NATIVE_NATIVE_TOUCH_TARGET_UNREACHABLE');
}
function copiedTouchGeometryControl(box,width){
 const original=JSON.stringify(box),copy=clone(box),top=copy.target.y;copy.target.y=copy.clip.y-5;const fault=JSON.stringify(copy);assert.notEqual(fault,original);
 let owned=null;try{validateTouchGeometry(copy,width);}catch(error){owned=error;}
 assert(owned instanceof assert.AssertionError);assert.match(owned.message,/^DEADLINE_NATIVE_NATIVE_TOUCH_TARGET_UNREACHABLE/);copy.target.y=top;assert.equal(JSON.stringify(copy),original);
 return{before:box,fault:JSON.parse(fault),ownedFailure:{name:owned.name,message:owned.message},wholeInverseExact:true};
}
async function touchReach(p,r,target){
 assert.equal(await target.count(),1,'Unique touch target');const session=await p.context().newCDPSession(p),samples=[];
 try{for(let attempt=0;attempt<20;attempt++){
  const box=await targetGeometry(target);
  const t=box.target,g=box.clip;if(t.y>=g.y+4&&t.bottom<=g.bottom-4&&t.x>=g.x&&t.right<=Math.min(g.right,r.width))break;
  assert(g.bottom-g.y>48&&g.right-g.x>48,'A real touch scroll surface is visible');
  const down=t.bottom>g.bottom-4,x=(g.x+g.right)/2,start=down?g.bottom-20:g.y+20;
  const end=down?Math.max(g.y+20,start-Math.min(360,(g.bottom-g.y)*.65)):Math.min(g.bottom-20,start+Math.min(360,(g.bottom-g.y)*.65));
  const before=await scrollOf(p);
  await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y:start,radiusX:1,radiusY:1,force:1,id:1}]});
  for(let step=1;step<=10;step++){await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:start+(end-start)*step/10,radiusX:1,radiusY:1,force:1,id:1}]});await p.waitForTimeout(25);}
  await p.waitForTimeout(120);await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await idle(p);
  samples.push({attempt,box,before,after:await scrollOf(p)});
 }}finally{await session.detach();}
 const reached=await targetGeometry(target);r.actions.push({type:'trusted-touch-scroll-preparation',samples,reached});
 validateTouchGeometry(reached,r.width);r.touchReachControl??=copiedTouchGeometryControl(reached,r.width);
}
async function prepareControl(p,r,target){
 await waitForScrollIdle(p);if(r.width<768)await touchReach(p,r,target);else await keyboardTo(p,r,target);
 await target.click({trial:true});await idle(p);await waitForScrollIdle(p);
}
async function pressPrepared(p,r,target,label){
 if(r.width<768)await target.tap();else{assert(await target.evaluate(n=>n===document.activeElement||n.contains(document.activeElement)),'Keyboard target keeps focus after preflight');await p.keyboard.press('Enter');}
 r.actions.push({type:r.actor,label,focus:await active(p)});
}
async function press(p,r,target,label){await prepareControl(p,r,target);await pressPrepared(p,r,target,label);await idle(p);}

function validateReadonlyReview(before,next){
 assert.deepEqual(next.document,before.document,'DEADLINE_NATIVE_NATIVE_REVIEW_DOCUMENT_SCROLL');
 assert.equal(next.saved.raw,before.saved.raw,'Deadline read-only keeps every receipt byte');assert.deepEqual(next.saved.state,before.saved.state);
 assert.deepEqual(next.storage,before.storage,'All browser storage held');assert.equal(next.url,before.url);assert.equal(next.writeRequests,before.writeRequests,'No new write request');
}
function copiedReviewScrollControl(before,after){
 const sample={before,after},original=JSON.stringify(sample),copy=clone(sample);copy.after.document.y+=10;const fault=JSON.stringify(copy);assert.notEqual(fault,original);
 let owned=null;try{validateReadonlyReview(copy.before,copy.after);}catch(error){owned=error;}
 assert(owned instanceof assert.AssertionError);assert.match(owned.message,/^DEADLINE_NATIVE_NATIVE_REVIEW_DOCUMENT_SCROLL/);
 const faultDocument=clone(copy.after.document);copy.after.document.y=after.document.y;assert.equal(JSON.stringify(copy),original);assert.equal(JSON.stringify(sample),original);
 return{actualSampleSHA256:sha(original),beforeDocument:before.document,actualAfterDocument:after.document,faultAfterDocument:faultDocument,ownedFailure:{name:owned.name,message:owned.message},wholeInverseExact:true,actualSampleHeld:true,scope:'Copied actual read-only review sample only. No physical input or signing-scroll control credit.'};
}

async function cardGeometry(card){return card.evaluate(n=>{const b=n.getBoundingClientRect();let clip={x:0,y:0,right:innerWidth,bottom:innerHeight};for(let a=n.parentElement;a;a=a.parentElement){const s=getComputedStyle(a),q=a.getBoundingClientRect();if(['auto','scroll','hidden','clip'].includes(s.overflowX)){clip.x=Math.max(clip.x,q.x);clip.right=Math.min(clip.right,q.right);}if(['auto','scroll','hidden','clip'].includes(s.overflowY)){clip.y=Math.max(clip.y,q.y);clip.bottom=Math.min(clip.bottom,q.bottom);}}const target={x:b.x,y:b.y,right:b.right,bottom:b.bottom,width:b.width,height:b.height},points=[];for(const x of[b.x+8,(b.x+b.right)/2,b.right-8])for(const y of[b.y+8,(b.y+b.bottom)/2,b.bottom-8]){const hit=document.elementFromPoint(x,y);points.push({x,y,inside:!!hit&&(hit===n||n.contains(hit))});}return{target,clip,points,document:{scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth}};});}
function validateCard(box){const t=box.target,c=box.clip;assert(t.width>0&&t.height>0&&t.x>=c.x&&t.right<=c.right&&t.y>=c.y+4&&t.bottom<=c.bottom-4&&box.points.length===9&&box.points.every(p=>p.inside),'DEADLINE_NATIVE_CARD_WHOLE_VISIBLE');assert(box.document.scrollWidth<=box.document.clientWidth+1,'No horizontal document overflow');}
function cardControl(box){const before=JSON.stringify(box),copy=clone(box),y=copy.target.y;copy.target.y=copy.clip.y-5;assert.notEqual(JSON.stringify(copy),before);let owned=null;try{validateCard(copy);}catch(error){owned=error;}assert(owned instanceof assert.AssertionError);assert.match(owned.message,/^DEADLINE_NATIVE_CARD_WHOLE_VISIBLE/);copy.target.y=y;assert.equal(JSON.stringify(copy),before);assert.equal(JSON.stringify(box),before);return{changed:true,ownedFailure:{name:owned.name,message:owned.message},wholeInverseExact:true,actualHeld:true,scope:'Copied actual card geometry only, no physical negative-control credit.'};}


function writes(r){return r.requests.filter(q=>!['GET','HEAD'].includes(q.method)).length;}
async function sample(p,r,label){
 const value=await p.evaluate(key=>{const a=document.activeElement;return{url:location.href,html:document.documentElement.outerHTML,text:document.body.innerText,document:{x:scrollX,y:scrollY},focus:a?{tag:a.tagName,id:a.id,name:a.getAttribute('aria-label'),text:a.textContent?.trim().slice(0,100)}:null,local:Object.fromEntries(Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)])),session:Object.fromEntries(Object.keys(sessionStorage).sort().map(k=>[k,sessionStorage.getItem(k)])),receiptRaw:localStorage.getItem(key)};},KEY);
 value.receipt=validateReceipt(value.receiptRaw);
 const full={sequence:r.frames.length,label,phase:r.phase,at:performance.now(),writeRequests:writes(r),value},raw=Buffer.from(JSON.stringify(full)+'\n'),gz=gzipSync(raw),file='frames/'+r.id+'-'+String(full.sequence).padStart(3,'0')+'.json.gz';
 assert(raw.length<=44*1024*1024&&gz.length<=12*1024*1024,'DEADLINE_NATIVE_COMPLETE_FRAME_BOUND');
 fs.writeFileSync(path.join(out,file),gz,{flag:'wx'});r.frames.push({sequence:full.sequence,label,phase:r.phase,file,bytes:gz.length,sha256:sha(gz),decodedBytes:raw.length,decodedSHA256:sha(raw)});return full;
}
function review(v){return{document:v.value.document,saved:{raw:v.value.receiptRaw,state:v.value.receipt},storage:v.value.local,session:v.value.session,url:v.value.url,writeRequests:v.writeRequests};}
function sameScreen(a,b){validateReadonlyReview(review(a),review(b));assert.deepEqual(b.value.session,a.value.session);}
function heldState(a,b){assert.equal(b.value.receiptRaw,a.value.receiptRaw,'DEADLINE_NATIVE_FULL_RECEIPT_HELD');assert.deepEqual(b.value.receipt,a.value.receipt);assert.deepEqual(b.value.local,a.value.local);assert.deepEqual(b.value.session,a.value.session);assert.equal(b.value.url,a.value.url);assert.equal(b.writeRequests,a.writeRequests,'DEADLINE_NATIVE_NO_NEW_WRITE');}
async function photo(p,r,label,target=null){
 const prep=await sample(p,r,label+' incoming photo preparation');
 if(target)await prepareControl(p,r,target);await waitForScrollIdle(p);
 const before=await sample(p,r,label+' fresh photo baseline');heldState(prep,before);
 const geometry=target?await cardGeometry(target):null;if(geometry){validateCard(geometry);r.cardControl??=cardControl(geometry);}
 const file=r.id+'-'+label+'.png';await p.screenshot({path:path.join(out,file)});
 const after=await sample(p,r,label+' screenshot return');sameScreen(before,after);assert.deepEqual(after.value.focus,before.value.focus);
 assert(await p.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1),'DEADLINE_NATIVE_NO_HORIZONTAL_OVERFLOW');
 r.photos.push({label,file,geometry,preparationFrame:prep.sequence,baselineFrame:before.sequence,afterFrame:after.sequence,scope:'Ordinary viewport screenshot. Existing native preparation is separate from fresh strict no-side-effect baseline.'});report.screenshots.push(file);
}
async function beginWatch(p) {
  return p.evaluate(() => {
    const trace = window.__deadlineNativeTrace; assertTrace(trace);
    function assertTrace(v) { if (!v || v.watching) throw Error('DEADLINE_NATIVE_TRACE_SETUP'); }
    trace.watching = true; trace.current = [];
    const read = () => { if (!trace.watching) return; const a = document.activeElement; trace.current.push({ sequence: trace.current.length, at: performance.now(), document: { x: scrollX, y: scrollY }, focus: a ? { tag: a.tagName, id: a.id, name: a.getAttribute('aria-label'), text: a.textContent?.trim().slice(0, 100) } : null, url: location.href, local: JSON.stringify(Object.fromEntries(Object.keys(localStorage).sort().map(k => [k, localStorage.getItem(k)]))), session: JSON.stringify(Object.fromEntries(Object.keys(sessionStorage).sort().map(k => [k, sessionStorage.getItem(k)]))) }); if (trace.current.length > 900) { trace.overflow = true; trace.watching = false; return; } requestAnimationFrame(read); };
    read(); return trace.events.length;
  });
}
async function endWatch(p, r, label, startEvent) {
  const t = await p.evaluate(() => { const t = window.__deadlineNativeTrace; t.watching = false; return { frames: t.current, events: t.events, overflow: t.overflow }; });
  assert.equal(t.overflow, false, 'DEADLINE_NATIVE_TRACE_BOUND'); assert(t.frames.length >= 1);
  const value = { label, firstSequence: 0, lastSequence: t.frames.length - 1, frames: t.frames, events: t.events.slice(startEvent) };
  r.traces.push(value); return value;
}
function validateTrace(value, before, focusHeld) {
  assert.equal(value.frames.length, value.lastSequence - value.firstSequence + 1, 'DEADLINE_NATIVE_TRACE_COMPLETE');
  for (let i = 0; i < value.frames.length; i++) {
    const f = value.frames[i]; assert.equal(f.sequence, value.firstSequence + i, 'DEADLINE_NATIVE_TRACE_COMPLETE');
    assert.deepEqual(f.document, before.value.document, 'DEADLINE_NATIVE_EARLY_DOCUMENT');
    assert.equal(f.url, before.value.url); assert.equal(f.local, JSON.stringify(before.value.local), 'DEADLINE_NATIVE_EARLY_STORAGE');
    assert.equal(f.session, JSON.stringify(before.value.session), 'DEADLINE_NATIVE_EARLY_SESSION');
    if (focusHeld) assert.deepEqual(f.focus, before.value.focus, 'DEADLINE_NATIVE_ARRIVAL_FOCUS');
  }
}
function traceOmissionControl(value, before) {
  const original = JSON.stringify(value), copy = clone(value); assert(copy.frames.length > 1);
  const [removed] = copy.frames.splice(1, 1); assert.notEqual(JSON.stringify(copy), original);
  let owned; try { validateTrace(copy, before, true); } catch (e) { owned = e; }
  assert(owned instanceof assert.AssertionError); assert.match(owned.message, /^DEADLINE_NATIVE_TRACE_COMPLETE/);
  copy.frames.splice(1, 0, removed); assert.equal(JSON.stringify(copy), original); assert.equal(JSON.stringify(value), original);
  return { changed: true, omittedSequence: removed.sequence, owned: { name: owned.name, message: owned.message }, wholeInverseExact: true, actualHeld: true };
}
async function readBlockReach(p,r,target,anchor){
 assert.equal(await target.count(),1,'Unique actual disclosure target');assert.equal(await anchor.count(),1,'Unique adjacent actual control');
 const before=await sample(p,r,'before read-only disclosure preparation');
 if(r.width<768)await touchReach(p,r,target);else{
  await prepareControl(p,r,anchor);let reached=false;const steps=[];
  for(let i=0;i<24;i++){await waitForScrollIdle(p);const box=await cardGeometry(target);try{validateCard(box);reached=true;break;}catch{}
   const key=box.target.y<box.clip.y+4?'PageUp':'PageDown';await p.keyboard.press(key);steps.push({key,geometry:box});await idle(p);
  }assert(reached,'DEADLINE_NATIVE_DISCLOSURE_KEYBOARD_REACH');r.actions.push({type:'actual-keyboard-disclosure-reach',steps});
 }
 await waitForScrollIdle(p);const geometry=await cardGeometry(target);validateCard(geometry);const after=await sample(p,r,'after read-only disclosure preparation');assert.equal(after.value.receiptRaw,before.value.receiptRaw);assert.deepEqual(after.value.receipt,before.value.receipt);assert.deepEqual(after.value.local,before.value.local);assert.deepEqual(after.value.session,before.value.session);assert.equal(after.value.url,before.value.url);return geometry;
}
async function photoBlock(p,r,label,target,anchor){
 const geometry=await readBlockReach(p,r,target,anchor);await photo(p,r,label);assert.deepEqual(await cardGeometry(target),geometry);const actual=r.photos.at(-1);assert.equal(actual.label,label);actual.geometry=geometry;actual.actualDisclosureRead=true;return actual;
}
function validateAssets(r) {
  assert.deepEqual(r.failures.filter(q => !r.aborts.some(a => a.id === q.id)), [], 'DEADLINE_NATIVE_UNDECLARED_REQUEST_FAILURE');
  assert(r.assetBodies.some(a => a.path === 'prerender-boot.js'), 'DEADLINE_NATIVE_BOOT_OBSERVED');
  for (const q of r.requests.filter(q => q.asset && !r.aborts.some(a => a.id === q.id))) assert.equal(r.assetBodies.filter(a => a.id === q.id).length, 1, 'DEADLINE_NATIVE_BODY_RECEIPT');
  assert.equal(r.assetErrors.length, 0, 'DEADLINE_NATIVE_BODY_READ_ERROR');
}
function assetControls(r) {
  const original = JSON.stringify(r), copy = clone(r);
  const index = copy.assetBodies.findIndex(v => v.path === leaf.file); assert(index >= 0);
  const [body] = copy.assetBodies.splice(index, 1); assert.notEqual(JSON.stringify(copy), original);
  let owned; try { validateAssets(copy); } catch (e) { owned = e; }
  assert(owned instanceof assert.AssertionError); assert.match(owned.message, /^DEADLINE_NATIVE_BODY_RECEIPT/);
  copy.assetBodies.splice(index, 0, body); assert.equal(JSON.stringify(copy), original);
  const failure = copy.failures.find(f => copy.aborts.some(a => a.id === f.id)); assert(failure);
  const ix = copy.aborts.findIndex(a => a.id === failure.id), [abort] = copy.aborts.splice(ix, 1); assert.notEqual(JSON.stringify(copy), original);
  let abortOwned; try { validateAssets(copy); } catch (e) { abortOwned = e; }
  assert(abortOwned instanceof assert.AssertionError); assert.match(abortOwned.message, /^DEADLINE_NATIVE_UNDECLARED_REQUEST_FAILURE/);
  copy.aborts.splice(ix, 0, abort); assert.equal(JSON.stringify(copy), original); assert.equal(JSON.stringify(r), original);
  return { body: { omitted: body, owned: { name: owned.name, message: owned.message } }, abort: { omitted: abort, owned: { name: abortOwned.name, message: abortOwned.message } }, wholeInverseExact: true, actualHeld: true };
}

function validateDeadlineCompletionTrace(value) {
 assert.equal(value.commitKind,'actual-End-to-Result','DEADLINE_NATIVE_COMPLETION_PHASE');
 const {write,native,abort,playerName,scriptProofs}=value;
 assert.equal(write.phase,'end-commit','DEADLINE_NATIVE_COMPLETION_PHASE');
 assert.equal(native.phase,'end-commit','DEADLINE_NATIVE_COMPLETION_PHASE');
 assert.equal(write.method,'POST','DEADLINE_NATIVE_COMPLETION_BODY');
 assert.equal(native.method,'POST','DEADLINE_NATIVE_COMPLETION_BODY');
 assert.equal(write.url,native.url,'DEADLINE_NATIVE_COMPLETION_PAIR');
 const endpoint=new URL(write.url);
 assert.equal(endpoint.origin,'https://flawuiqbvjobmkfkauhw.supabase.co','DEADLINE_NATIVE_COMPLETION_BODY');
 assert.equal(endpoint.pathname,'/rest/v1/game_completions','DEADLINE_NATIVE_COMPLETION_BODY');
 assert.equal(endpoint.search,'','DEADLINE_NATIVE_COMPLETION_BODY');
 assert.equal(typeof playerName,'string');assert(playerName.length>0);
 assert.equal(typeof write.postData,'string','DEADLINE_NATIVE_COMPLETION_BODY');
 assert.equal(write.postData,native.postData,'DEADLINE_NATIVE_COMPLETION_PAIR');
 const body=JSON.parse(write.postData);
 assert.deepEqual(body,{game:'deadline-day',player_name:playerName},'DEADLINE_NATIVE_COMPLETION_BODY');
 assert(Number.isSafeInteger(write.id)&&write.id>0,'DEADLINE_NATIVE_COMPLETION_PAIR');
 assert.equal(typeof native.requestId,'string');assert(native.requestId.length>0);
 assert.equal(abort.id,write.id,'DEADLINE_NATIVE_COMPLETION_ABORT');
 assert.equal(abort.method,'POST','DEADLINE_NATIVE_COMPLETION_ABORT');
 assert.equal(abort.url,write.url,'DEADLINE_NATIVE_COMPLETION_ABORT');
 assert.equal(abort.reason,'all writes physically aborted','DEADLINE_NATIVE_COMPLETION_ABORT');
 assert.equal(abort.completed,true,'DEADLINE_NATIVE_COMPLETION_ABORT');
 assert.equal(native.initiator?.type,'script','DEADLINE_NATIVE_COMPLETION_INITIATOR');
 const frames=[];for(let stack=native.initiator.stack;stack;stack=stack.parent)for(const frame of stack.callFrames||[])frames.push(frame);
 const matches=frames.filter(frame=>scriptProofs.some(proof=>proof.url===frame.url&&proof.status===200&&proof.receivedBeforeCommit===true&&proof.completionInsertCall===true&&/^[a-f0-9]{64}$/.test(proof.sha256)));
 assert(matches.length>0,'DEADLINE_NATIVE_COMPLETION_INITIATOR');
 return {nativeRequestId:native.requestId,playwrightId:write.id,body,initiatingFrames:matches,allBytesRetained:true,physicalAbort:true};
}
function deadlineCompletionCopiedControls(actual) {
 const original=JSON.stringify(actual),bodyCopy=clone(actual),oldBody=bodyCopy.write.postData;
 const bad=JSON.parse(oldBody);bad.game='not-the-completed-game';
 bodyCopy.write.postData=JSON.stringify(bad);bodyCopy.native.postData=bodyCopy.write.postData;
 assert.notEqual(JSON.stringify(bodyCopy),original);
 let bodyOwned;try{validateDeadlineCompletionTrace(bodyCopy);}catch(error){bodyOwned=error;}
 assert(bodyOwned instanceof assert.AssertionError);assert.match(bodyOwned.message,/^DEADLINE_NATIVE_COMPLETION_BODY/);
 bodyCopy.write.postData=oldBody;bodyCopy.native.postData=oldBody;assert.equal(JSON.stringify(bodyCopy),original);
 const phaseCopy=clone(actual),oldPhase=phaseCopy.write.phase;phaseCopy.write.phase='read-only-review';assert.notEqual(JSON.stringify(phaseCopy),original);
 let phaseOwned;try{validateDeadlineCompletionTrace(phaseCopy);}catch(error){phaseOwned=error;}
 assert(phaseOwned instanceof assert.AssertionError);assert.match(phaseOwned.message,/^DEADLINE_NATIVE_COMPLETION_PHASE/);
 phaseCopy.write.phase=oldPhase;assert.equal(JSON.stringify(phaseCopy),original);assert.equal(JSON.stringify(actual),original);
 const sourceCopy=clone(actual),sourceBefore=sourceCopy.scriptProofs;sourceCopy.scriptProofs=[];assert.notEqual(JSON.stringify(sourceCopy),original);let sourceOwned;try{validateDeadlineCompletionTrace(sourceCopy);}catch(error){sourceOwned=error;}assert(sourceOwned instanceof assert.AssertionError);assert.match(sourceOwned.message,/^DEADLINE_NATIVE_COMPLETION_INITIATOR/);sourceCopy.scriptProofs=sourceBefore;assert.equal(JSON.stringify(sourceCopy),original);
 return {initiator:{changed:true,owned:{name:sourceOwned.name,message:sourceOwned.message},wholeInverseExact:true},body:{changed:true,owned:{name:bodyOwned.name,message:bodyOwned.message},wholeInverseExact:true},phase:{changed:true,owned:{name:phaseOwned.name,message:phaseOwned.message},wholeInverseExact:true},actualHeld:true,scope:'Copied actual guard evidence only. No physical App fault or backend write.'};
}
function validateDeadlinePreflight(row,parent,request,abort) {
 assert.equal(row.method,'OPTIONS','DEADLINE_NATIVE_PREFLIGHT_LINK');
 assert.equal(row.initiator?.type,'preflight','DEADLINE_NATIVE_PREFLIGHT_LINK');
 assert.equal(row.initiator.requestId,parent.requestId,'DEADLINE_NATIVE_PREFLIGHT_LINK');
 assert.equal(parent.method,request.method,'DEADLINE_NATIVE_PREFLIGHT_LINK');
 assert.equal(parent.url,request.url,'DEADLINE_NATIVE_PREFLIGHT_LINK');
 assert.equal(row.url,parent.url,'DEADLINE_NATIVE_PREFLIGHT_LINK');
 assert.equal(abort.id,request.id,'DEADLINE_NATIVE_PREFLIGHT_LINK');assert.equal(abort.completed,true,'DEADLINE_NATIVE_PREFLIGHT_LINK');
 assert.equal(abort.method,request.method,'DEADLINE_NATIVE_PREFLIGHT_LINK');assert.equal(abort.url,request.url,'DEADLINE_NATIVE_PREFLIGHT_LINK');
 assert(['GET','POST'].includes(parent.method),'DEADLINE_NATIVE_PREFLIGHT_LINK');
 if(parent.method==='POST')assert.equal(parent.postData,request.postData,'DEADLINE_NATIVE_PREFLIGHT_LINK');
 return {requestId:row.requestId,parentRequestId:parent.requestId,playwrightId:request.id,parentMethod:parent.method,abortId:abort.id};
}
function deadlinePreflightCopiedControl(actual) {
 const original=JSON.stringify(actual),copy=clone(actual),old=copy.row.initiator.requestId;
 copy.row.initiator.requestId=old+'-unobserved';assert.notEqual(JSON.stringify(copy),original);
 let owned;try{validateDeadlinePreflight(copy.row,copy.parent,copy.request,copy.abort);}catch(error){owned=error;}
 assert(owned instanceof assert.AssertionError);assert.match(owned.message,/^DEADLINE_NATIVE_PREFLIGHT_LINK/);
 copy.row.initiator.requestId=old;assert.equal(JSON.stringify(copy),original);assert.equal(JSON.stringify(actual),original);
 return {changed:true,owned:{name:owned.name,message:owned.message},wholeInverseExact:true,actualHeld:true};
}

function completionInsertSites(bytes,file){
 const ast=ts.createSourceFile(file,bytes.toString('utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),sites=[];
 function visit(n){if(ts.isCallExpression(n)&&ts.isPropertyAccessExpression(n.expression)&&n.expression.name.text==='insert'){
  const from=n.expression.expression;if(ts.isCallExpression(from)&&ts.isPropertyAccessExpression(from.expression)&&from.expression.name.text==='from'&&from.arguments.length===1&&ts.isStringLiteral(from.arguments[0])&&from.arguments[0].text==='game_completions')sites.push({start:n.getStart(ast),end:n.end,expression:n.getText(ast)});
 }ts.forEachChild(n,visit);}visit(ast);return sites;
}
function pending(message){const e=new Error(message);e.pendingCollector=true;throw e;}
function writeSnapshot(r){
 for(const q of r.nativeRequests.filter(q=>!['GET','HEAD','POST','OPTIONS'].includes(q.method)))assert.fail('DEADLINE_NATIVE_UNRECOGNIZED_NATIVE_WRITE '+q.method);
 for(const q of r.requests.filter(q=>!['GET','HEAD','POST','OPTIONS'].includes(q.method)))assert.fail('DEADLINE_NATIVE_UNRECOGNIZED_WRITE '+q.method);
 const pw=r.requests.filter(q=>q.method==='POST'),native=r.nativeRequests.filter(q=>q.method==='POST');
 if(pw.length!==native.length)pending('DEADLINE_NATIVE_PENDING_POST_CENSUS');
 const completions=[];
 for(let i=0;i<pw.length;i++){
  const request=pw[i],n=native[i];assert.equal(n.url,request.url,'DEADLINE_NATIVE_WRITE_PAIR');assert.equal(n.method,request.method);
  if(typeof n.postData!=='string')pending('DEADLINE_NATIVE_PENDING_POST_BODY');
  const abort=r.aborts.find(a=>a.id===request.id);if(!abort?.completed)pending('DEADLINE_NATIVE_PENDING_ABORT');
  const value={commitKind:'actual-End-to-Result',write:request,native:n,abort,playerName:r.completionPlayerName,scriptProofs:r.scriptProofs.filter(s=>s.at<r.commitAt)};
  completions.push({value,proof:validateDeadlineCompletionTrace(value)});
 }
 assert(pw.length<=1,'DEADLINE_NATIVE_SINGLE_COMPLETION_ATTEMPT');
 const preflights=[];
 for(const row of r.nativeRequests.filter(q=>q.method==='OPTIONS')){
  assert.equal(row.initiator?.type,'preflight','DEADLINE_NATIVE_PREFLIGHT_LINK');
  const parent=r.nativeRequests.find(q=>q.requestId===row.initiator.requestId);if(!parent)pending('DEADLINE_NATIVE_PENDING_PREFLIGHT_PARENT');
  const sameNative=r.nativeRequests.filter(q=>q.method===parent.method&&q.url===parent.url),index=sameNative.findIndex(q=>q.requestId===parent.requestId),samePW=r.requests.filter(q=>q.method===parent.method&&q.url===parent.url),request=samePW[index];
  if(!request)pending('DEADLINE_NATIVE_PENDING_PREFLIGHT_PW_PARENT');
  const abort=r.aborts.find(a=>a.id===request.id);if(!abort?.completed)pending('DEADLINE_NATIVE_PENDING_PREFLIGHT_ABORT');
  if(parent.method==='POST')assert(completions.some(v=>v.proof.nativeRequestId===parent.requestId),'DEADLINE_NATIVE_PREFLIGHT_POST_QUALIFIED');
  else assert.equal(parent.method,'GET','DEADLINE_NATIVE_PREFLIGHT_LINK');
  preflights.push({value:{row,parent,request,abort},proof:validateDeadlinePreflight(row,parent,request,abort)});
 }
 for(const row of r.requests.filter(q=>q.method==='OPTIONS')){
  const nativeRows=r.nativeRequests.filter(n=>n.method==='OPTIONS'&&n.url===row.url);assert(nativeRows.length>0,'DEADLINE_NATIVE_OPTIONS_NATIVE_PROOF');
  const abort=r.aborts.find(a=>a.id===row.id);if(!abort?.completed)pending('DEADLINE_NATIVE_PENDING_OPTIONS_ABORT');
  assert(preflights.some(v=>v.value.row.url===row.url),'DEADLINE_NATIVE_OPTIONS_PARENT_PROOF');
 }
 return {attemptedWrites:r.requests.filter(q=>!['GET','HEAD'].includes(q.method)).map(q=>({id:q.id,url:q.url,method:q.method,postData:q.postData,phase:q.phase})),completions,preflights};
}
function nativeMethodCopiedControl(actual){
 const original=JSON.stringify(actual),copy=clone(actual),row=copy.nativeRequests.find(q=>q.method==='POST');assert(row);const before=row.method;
 row.method='PUT';assert.notEqual(JSON.stringify(copy),original);let owned;try{writeSnapshot(copy);}catch(error){owned=error;}
 assert(owned instanceof assert.AssertionError);assert.match(owned.message,/^DEADLINE_NATIVE_UNRECOGNIZED_NATIVE_WRITE/);
 row.method=before;assert.equal(JSON.stringify(copy),original);assert.equal(JSON.stringify(actual),original);
 return{changed:true,owned:{name:owned.name,message:owned.message},wholeInverseExact:true,actualHeld:true,scope:'Copied actual native method guard only, no physical additional request.'};
}
async function paired(p,r,label){
 const start=performance.now(),samples=[];let last;
 while(true){
  assert(performance.now()-start<=5000,'DEADLINE_NATIVE_PAIRING_DEADLINE '+String(last));
  try{const value=writeSnapshot(r);samples.push({at:performance.now(),pwPosts:r.requests.filter(q=>q.method==='POST').length,nativePosts:r.nativeRequests.filter(q=>q.method==='POST').length,complete:true});r.pairingWaits.push({label,start,elapsed:performance.now()-start,samples});return value;}
  catch(error){if(!error.pendingCollector)throw error;last=error.message;samples.push({at:performance.now(),pwPosts:r.requests.filter(q=>q.method==='POST').length,nativePosts:r.nativeRequests.filter(q=>q.method==='POST').length,pending:error.message});await p.waitForTimeout(10);}
 }
}
function validateDocuments(r){
 assert(r.documentRequests.length>=1,'DEADLINE_NATIVE_DOCUMENT_CENSUS');
 for(const q of r.documentRequests)assert.equal(r.documentBodies.filter(b=>b.id===q.id).length,1,'DEADLINE_NATIVE_DOCUMENT_BODY');
}
function receiptAppend(before,after,action){
 assert(after.value.receipt,'Actual changed action persisted');const a=after.value.receipt,b=before.value.receipt;
 if(b){assert.equal(a.club,b.club);assert.equal(a.seed,b.seed);assert.deepEqual(a.actions,[...b.actions,action]);}
 else assert.deepEqual(a.actions,[action]);
 assert.equal(a.done,action.t==='end');
}
function photoCensus(r){
 assert.deepEqual(r.photos.map(p=>p.label),['pending-back','late-arrival-menu','actual-desk','actual-sales','actual-deal','actual-fee-table','actual-terms-table','actual-reloaded-desk','actual-refused-leaf','actual-recovered-desk','actual-result'],'DEADLINE_NATIVE_COMPLETE_PHOTOS');
}



function receiptActionControl(before,after,action){
 const original=JSON.stringify(after),copy=clone(after),last=copy.value.receipt.actions.length-1,old=copy.value.receipt.actions[last];
 copy.value.receipt.actions[last]={t:'end'};assert.notEqual(JSON.stringify(copy),original);let owned;
 try{receiptAppend(before,copy,action);}catch(error){owned=error;}
 assert(owned instanceof assert.AssertionError);copy.value.receipt.actions[last]=old;assert.equal(JSON.stringify(copy),original);assert.equal(JSON.stringify(after),original);
 return{changed:true,owned:{name:owned.name,message:owned.message},wholeInverseExact:true,actualHeld:true,scope:'Copied actual persisted action only, no physical game fault.'};
}
function photoOmissionControl(r){
 const original=JSON.stringify(r.photos),copy={photos:clone(r.photos)},removed=copy.photos.pop();assert(removed);assert.notEqual(JSON.stringify(copy.photos),original);let owned;
 try{photoCensus(copy);}catch(error){owned=error;}assert(owned instanceof assert.AssertionError);assert.match(owned.message,/^DEADLINE_NATIVE_COMPLETE_PHOTOS/);
 copy.photos.push(removed);assert.equal(JSON.stringify(copy.photos),original);assert.equal(JSON.stringify(r.photos),original);return{changed:true,owned:{name:owned.name,message:owned.message},wholeInverseExact:true,actualHeld:true};
}
function documentOmissionControl(r){
 const original=JSON.stringify(r.documentBodies),copy={documentRequests:r.documentRequests,documentBodies:clone(r.documentBodies)},removed=copy.documentBodies.pop();assert(removed);let owned;
 try{validateDocuments(copy);}catch(error){owned=error;}assert(owned instanceof assert.AssertionError);assert.match(owned.message,/^DEADLINE_NATIVE_DOCUMENT_BODY/);
 copy.documentBodies.push(removed);assert.equal(JSON.stringify(copy.documentBodies),original);assert.equal(JSON.stringify(r.documentBodies),original);return{changed:true,owned:{name:owned.name,message:owned.message},wholeInverseExact:true,actualHeld:true};
}

const browser=await chromium.launch({headless:true});
async function journey(width){
 const r={id:'deadline-'+width,width,height:width===390?844:900,actor:width<768?'touch':'keyboard',status:'incomplete',phase:'initial',actions:[],frames:[],traces:[],photos:[],requests:[],nativeRequests:[],nativeEvents:[],pairingWaits:[],responses:[],failures:[],aborts:[],assetBodies:[],assetErrors:[],scriptProofs:[],documentRequests:[],documentBodies:[],console:[],pageErrors:[],navigations:[],leafAttempts:[],inputEvents:[],references:[],commitAt:Infinity};
 report.contexts.push(r);
 const c=await browser.newContext({viewport:{width,height:r.height},deviceScaleFactor:1,isMobile:width<768,hasTouch:width<768,serviceWorkers:'block'});
 const p=await c.newPage();p.setDefaultTimeout(15000);p.setDefaultNavigationTimeout(30000);
 const ids=new WeakMap(),id=q=>{if(!ids.has(q))ids.set(q,idsNext++);return ids.get(q);};let idsNext=1,mode='hold',held=null,lastAsset=Date.now();
 const activeAssets=new Set(),reads=new Set(),nativeSession=await c.newCDPSession(p);
 const isAsset=url=>{const u=new URL(url);return u.origin===origin&&(u.pathname.startsWith('/assets/')||u.pathname==='/prerender-boot.js');};
 async function drain(allowHeld=false){const end=Date.now()+20000;while([...activeAssets].some(q=>!allowHeld||q.url()!==leafURL)||reads.size||Date.now()-lastAsset<100){assert(Date.now()<end,'DEADLINE_NATIVE_ASSET_DRAIN');await p.waitForTimeout(25);}assert.equal(r.assetErrors.length,0,'DEADLINE_NATIVE_ASSET_READ');}
 nativeSession.on('Network.requestWillBeSent',event=>{
  r.nativeEvents.push({kind:'requestWillBeSent',event,phase:r.phase,at:performance.now()});
  const row={requestId:event.requestId,url:event.request.url,method:event.request.method,postData:event.request.postData??null,initiator:event.initiator,loaderId:event.loaderId,documentURL:event.documentURL,phase:r.phase,at:performance.now()};r.nativeRequests.push(row);
  if(row.method==='POST'&&row.postData===null){
   const work=nativeSession.send('Network.getRequestPostData',{requestId:row.requestId}).then(v=>{row.postData=v.postData;row.postDataSource='actual Network.getRequestPostData';}).catch(error=>{row.postDataError=String(error.message);});
   reads.add(work);void work.finally(()=>reads.delete(work));
  }
 });
 nativeSession.on('Network.loadingFailed',event=>r.nativeEvents.push({kind:'loadingFailed',event,phase:r.phase,at:performance.now()}));
 nativeSession.on('Network.responseReceived',event=>r.nativeEvents.push({kind:'responseReceived',event,phase:r.phase,at:performance.now()}));
 await nativeSession.send('Network.enable',{maxPostDataSize:1048576});
 await p.exposeBinding('__deadlineNativeEvent',({frame},event)=>r.inputEvents.push({...event,frameURL:frame.url(),phase:r.phase}));
 await c.addInitScript(()=>{
  const t={events:[],current:[],watching:false,overflow:false};window.__deadlineNativeTrace=t;
  for(const type of['pointerdown','touchstart','click','keydown','focusin','scroll'])addEventListener(type,event=>{const n=event.target,row={type,trusted:event.isTrusted,key:event.key??null,at:performance.now(),target:n instanceof Element?{tag:n.tagName,id:n.id,text:n.textContent?.trim().slice(0,100)}:null};t.events.push(row);void window.__deadlineNativeEvent(row);if(t.events.length>5000)t.overflow=true;},true);
 });
 await c.route('**/*',async route=>{
  const q=route.request(),u=new URL(q.url());
  if(u.origin!==origin||!['GET','HEAD'].includes(q.method())){
   const record={id:id(q),url:q.url(),origin:u.origin,method:q.method(),postData:q.postData(),phase:r.phase,reason:!['GET','HEAD'].includes(q.method())?'all writes physically aborted':'existing offline policy',completed:false};r.aborts.push(record);
   await route.abort('blockedbyclient');record.completed=true;record.completedAt=performance.now();return;
  }
  if(q.url()===leafURL){const attempt={id:id(q),url:q.url(),mode,phase:r.phase,at:performance.now()};r.leafAttempts.push(attempt);
   if(mode==='hold'){assert.equal(held,null,'One actual held view request');await new Promise(resolve=>{held={resolve,attempt};});attempt.releasedAt=performance.now();held=null;return route.continue();}
   if(mode==='refuse'){const record={id:id(q),url:q.url(),origin,method:q.method(),reason:'actual refused leaf control',phase:r.phase,completed:false};r.aborts.push(record);await route.abort('failed');record.completed=true;return;}
  }return route.continue();
 });
 await c.routeWebSocket('**/*',async socket=>{r.aborts.push({id:'ws',url:socket.url(),origin:new URL(socket.url()).origin,method:'WEBSOCKET',reason:'existing offline policy',phase:r.phase});await socket.close({code:1008,reason:'Deadline source-bound QA'});});
 p.on('request',q=>{
  const row={id:id(q),url:q.url(),method:q.method(),postData:q.postData(),resourceType:q.resourceType(),phase:r.phase,asset:isAsset(q.url()),at:performance.now()};r.requests.push(row);
  if(q.resourceType()==='document'&&q.isNavigationRequest()&&q.frame()===p.mainFrame())r.documentRequests.push({...row,mainDocument:true});
  if(row.asset){activeAssets.add(q);lastAsset=Date.now();}
 });
 const finished=q=>{if(activeAssets.delete(q))lastAsset=Date.now();};
 p.on('requestfinished',finished);p.on('requestfailed',q=>{r.failures.push({id:id(q),url:q.url(),error:q.failure(),phase:r.phase});finished(q);});
 p.on('response',response=>{
  const q=response.request(),u=new URL(response.url());r.responses.push({id:id(q),url:response.url(),status:response.status(),phase:r.phase});
  const document=q.resourceType()==='document'&&q.isNavigationRequest()&&q.frame()===p.mainFrame();
  if(!document&&!isAsset(response.url()))return;
  const phase=r.phase,at=performance.now(),work=(async()=>{
   const rel=document?(u.pathname==='/'?'index.html':u.pathname.replace(/^\//,'').replace(/\/$/,'')+'/index.html'):decodeURIComponent(u.pathname.slice(1)),ref=refs.get(rel);assert(ref,'Unknown completed body '+rel);assert.equal(response.status(),200);
   const bytes=await response.body();assert.equal(bytes.length,ref.bytes);assert.equal(sha(bytes),ref.sha256);assert(bytes.equals(fs.readFileSync(path.join(dist,rel))),'Full actual HTTP body equals compiled authority');
   const file='bodies/'+sha(bytes)+path.extname(rel);if(!fs.existsSync(path.join(out,file)))fs.writeFileSync(path.join(out,file),bytes,{flag:'wx'});else assert(fs.readFileSync(path.join(out,file)).equals(bytes));
   const row={id:id(q),path:rel,url:response.url(),status:response.status(),file,bytes:bytes.length,sha256:sha(bytes),gzipBytes:gzipSync(bytes).length,phase,at};
   if(document)r.documentBodies.push(row);else{r.assetBodies.push(row);observed.set(rel,ref.sha256);
    if(rel.endsWith('.js')){const sites=completionInsertSites(bytes,rel);if(sites.length)r.scriptProofs.push({...row,completionInsertCall:true,receivedBeforeCommit:true,sites});}
   }
  })().catch(error=>r.assetErrors.push({url:response.url(),phase,message:String(error.stack||error)}));reads.add(work);void work.finally(()=>{reads.delete(work);lastAsset=Date.now();});
 });
 p.on('console',e=>r.console.push({type:e.type(),text:e.text(),location:e.location(),phase:r.phase}));
 p.on('pageerror',e=>r.pageErrors.push({name:e.name,message:e.message,stack:e.stack,phase:r.phase}));
 p.on('framenavigated',f=>{if(f===p.mainFrame())r.navigations.push({url:f.url(),phase:r.phase,at:performance.now()});});
 async function navigate(){
  await drain();const response=await p.goto(base+'/deadline-day',{waitUntil:'load'});assert.equal(response.status(),200);
  await p.locator('#dukb-main').waitFor({state:'visible'});await answerConsent(p,{wait:1000});
  const rules=p.getByRole('button',{name:"Let's Play!",exact:true});if(await rules.count())await press(p,r,rules,'Actual Deadline rules close');
  await p.getByRole('button',{name:'Pick a club',exact:true}).waitFor({state:'visible'});await waitForScrollIdle(p);await drain();await paired(p,r,'initial actual document paired');return sample(p,r,'actual empty-storage Deadline menu');
 }
 async function reloadActual(label){
  const before=await sample(p,r,label+' before real reload'),response=await p.reload({waitUntil:'load'});assert.equal(response.status(),200);
  await p.getByRole('button',{name:'Pick a club',exact:true}).waitFor({state:'visible'});await waitForScrollIdle(p);await drain();await paired(p,r,label+' reload paired');
  const after=await sample(p,r,label+' actual menu after reload');assert.equal(after.value.receiptRaw,before.value.receiptRaw,'Complete actual JSON receipt retained across reload');
  r.actions.push({type:'actual-reload',label,before:before.sequence,after:after.sequence,scope:'Full receipt bytes held; every auxiliary storage field retained without claiming all-storage reload equality.'});return after;
 }
 async function pressReload(target,label){
  await prepareControl(p,r,target);const eventStart=r.inputEvents.length,navigation=p.waitForEvent('framenavigated',{predicate:f=>f===p.mainFrame(),timeout:30000});
  const result=await Promise.allSettled([pressPrepared(p,r,target,label),navigation]);assert.equal(result[1].status,'fulfilled','DEADLINE_NATIVE_ACTUAL_RELOAD_REQUIRED');
  if(result[0].status==='rejected'){assert.match(String(result[0].reason.message),/Execution context was destroyed|Cannot find context with specified id/);r.actions.push({type:'actual-input-replaced-document',label,message:result[0].reason.message});}
  assert(r.inputEvents.slice(eventStart).some(e=>e.trusted&&(e.type==='click'||e.type==='keydown'&&e.key==='Enter')));
  await p.getByRole('button',{name:'Pick a club',exact:true}).waitFor({state:'visible'});await waitForScrollIdle(p);await drain();
 }
 async function readView(target,label,ready,allowHeld=false){
  await prepareControl(p,r,target);await paired(p,r,label+' before');
  const before=await sample(p,r,label+' immediately before input');await pressPrepared(p,r,target,label);
  for(const point of['immediate','raf1','raf2']){if(point!=='immediate')await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(resolve)));const after=await sample(p,r,label+' '+point);heldState(before,after);}
  await ready();await waitForScrollIdle(p);await drain(allowHeld);await paired(p,r,label+' after early samples');const after=await sample(p,r,label+' settled');heldState(before,after);
  r.actions.push({type:'actual-read-only-view',label,before:before.sequence,after:after.sequence,scope:'Full receipt/storage/URL/write holds. Existing source reveal scroll and focus recorded, no new zero-scroll claim for pre-existing view navigation.'});return after;
 }
 async function commit(target,label,action,ready){
  await prepareControl(p,r,target);await paired(p,r,label+' before');
  const before=await sample(p,r,label+' immediately before actual commit');await pressPrepared(p,r,target,label);
  for(const point of['immediate','raf1','raf2']){if(point!=='immediate')await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(resolve)));await sample(p,r,label+' '+point);}
  await ready();await waitForScrollIdle(p);await drain();await paired(p,r,label+' after early samples');
  const after=await sample(p,r,label+' actual persisted result');receiptAppend(before,after,action);r.receiptControl??=receiptActionControl(before,after,action);r.actions.push({type:'actual-game-commit',label,action,before:before.sequence,after:after.sequence});return{full:after,run:replayReference(r,after,label)};
 }
 const desk=()=>p.getByTestId('deadline-desk'),deal=()=>p.getByTestId('deadline-deal'),sales=()=>p.getByTestId('deadline-sales');
 const backMenu=()=>p.getByRole('button',{name:'Back to the menu',exact:true}),carry=()=>p.getByRole('button',{name:/^Carry on at /});
 async function pick(){
  await readView(p.getByRole('button',{name:'Pick a club',exact:true}),'Actual Pick a club',()=>p.locator('#deadline-league').waitFor({state:'visible'}));
  assert.equal(await p.locator('#deadline-league').inputValue(),'premier');
  const clubs=p.locator('#deadline-league').locator('..').locator(':scope > div.grid > button');assert((await clubs.count())>=1);
  const target=clubs.nth(r.width<768?2:0),name=(await target.innerText()).trim();assert(name.length>0);
  await press(p,r,target,'Actual visible club '+name);r.chosenClub=name;return name;
 }
 async function release(){assert(held);held.resolve();await desk().waitFor({state:'visible',timeout:30000});await drain();}


 try{
  const initial=await navigate();assert.equal(initial.value.receiptRaw,null,'Fresh actual free-play receipt absent');
  assert.equal(r.assetBodies.filter(b=>b.path===leaf.file).length,0,'DEADLINE_NATIVE_NO_EARLY_VIEW');
  r.phase='pending-back';await pick();
  await p.getByText('Opening the desk...',{exact:true}).waitFor({state:'visible'});
  for(let i=0;!held&&i<200;i++)await p.waitForTimeout(25);assert(held,'Actual played-view request held');await waitForScrollIdle(p);await drain(true);
  const pending=await sample(p,r,'actual pending window before Back');assert.equal(pending.value.receiptRaw,null);await photo(p,r,'pending-back',backMenu());
  await readView(backMenu(),'Actual pending Back to menu',()=>p.getByRole('button',{name:'Pick a club',exact:true}).waitFor({state:'visible'}),true);
  const lateBefore=await sample(p,r,'late leaf baseline after completed menu reveal'),watch=await beginWatch(p);
  assert(held);held.resolve();await drain();await p.waitForTimeout(150);
  const late=await sample(p,r,'actual late body cannot reopen abandoned window');sameScreen(lateBefore,late);assert.equal(await desk().count(),0);
  const lateTrace=await endWatch(p,r,'late played-view body after Back',watch);validateTrace(lateTrace,lateBefore,true);r.traceOmissionControl=traceOmissionControl(lateTrace,lateBefore);
  await photo(p,r,'late-arrival-menu',p.getByRole('button',{name:'Pick a club',exact:true}));
  r.phase='held-arrival';mode='hold';await navigate();await pick();await p.getByText('Opening the desk...',{exact:true}).waitFor({state:'visible'});
  for(let i=0;!held&&i<200;i++)await p.waitForTimeout(25);assert(held);await prepareControl(p,r,p.getByRole('button',{name:'How to play',exact:true}));await waitForScrollIdle(p);await drain(true);
  const arrival=await sample(p,r,'actual settled pending view before release'),arrivalWatch=await beginWatch(p);await release();await p.waitForTimeout(150);
  const arrived=await sample(p,r,'actual arrived played view');sameScreen(arrival,arrived);assert.deepEqual(arrived.value.focus,arrival.value.focus);
  validateTrace(await endWatch(p,r,'played-view arrival after existing phase reveal',arrivalWatch),arrival,true);
  r.reviewScrollControl=copiedReviewScrollControl(review(arrival),review(arrived));
  const warmCount=r.leafAttempts.length;r.phase='warm-reentry';
  await readView(p.getByRole('button',{name:'Menu',exact:true}),'Actual warm Menu',()=>p.getByRole('button',{name:'Pick a club',exact:true}).waitFor({state:'visible'}));
  mode='allow';await pick();await desk().waitFor({state:'visible'});await waitForScrollIdle(p);await drain();assert.equal(r.leafAttempts.length,warmCount,'DEADLINE_NATIVE_WARM_NO_NEW_MODULE_REQUEST');
  const warm=await sample(p,r,'actual warm natural free window');assert.equal(warm.value.receiptRaw,null,'No committed action means no saved seed promise');
  await photo(p,r,'actual-desk',p.getByTestId('deadline-target').first());
  r.phase='actual-sales';
  await readView(desk().getByRole('button').filter({has:p.getByText('Sell to raise money',{exact:true})}),'Actual Sales view',()=>sales().waitFor({state:'visible'}));
  const sell=sales().getByRole('button',{name:'Sell (1 hour)',exact:true}).first();assert.equal(await sell.count(),1);
  await photo(p,r,'actual-sales',sell);
  const sold=await commit(sell,'Actual bench sale',{t:'sell',i:0},()=>sales().getByText('Sold',{exact:true}).first().waitFor({state:'visible'}));
  assert.equal(sold.run.setup.club,r.chosenClub);assert.equal(sold.run.sales[0].done,true);
  await readView(p.getByRole('button',{name:'Back to the desk',exact:true}),'Actual Sales Back',()=>desk().waitFor({state:'visible'}));
  const candidates=sold.run.targets.map((t,i)=>({t,i,refusal:reference.dd.openRefusal(sold.run,i)})).filter(row=>row.t.status==='idle'&&row.refusal===null).sort((a,b)=>a.t.mp.price-b.t.mp.price||a.i-b.i);
  assert(candidates.length>0,'A real callable target exists');const chosen=candidates[0],target=p.getByTestId('deadline-target').filter({has:p.getByText(chosen.t.mp.name,{exact:true})});
  r.actualDealChoice={sourceReference:r.references.at(-1),index:chosen.i,name:chosen.t.mp.name,price:chosen.t.mp.price,policy:'Cheapest callable target in the separately retained actual-receipt replay, no seed or outcome search.'};
  r.phase='actual-deal';await readView(target,'Actual selected target detail',()=>deal().waitFor({state:'visible'}));
  const call=deal().getByRole('button',{name:/^Call .+ \(free\)$/});assert.equal(await call.count(),1);
  await photo(p,r,'actual-deal',call);
  const opened=await commit(call,'Actual call selling club',{t:'open',i:chosen.i},()=>p.getByTestId('deadline-fee-table').waitFor({state:'visible'}));assert.equal(opened.run.targets[chosen.i].status,'talks');
  const fee=p.getByTestId('deadline-fee-table'),bid=fee.getByRole('button',{name:/^Bid .* \(1 hour\)$/}),chip=fee.getByRole('button',{name:/^(Meet the ask|Beat them) /});assert.equal(await chip.count(),1);
  await photoBlock(p,r,'actual-fee-table',fee,chip);
  await readView(chip,'Actual visible bid chip',async()=>{});const amount=Number(await p.getByRole('spinbutton',{name:'Your bid in millions',exact:true}).inputValue());assert(amount>0&&amount<=opened.run.state.budget);
  r.phase='actual-fee-commit';const agreed=await commit(bid,'Actual supported fee bid',{t:'bid',i:chosen.i,amt:amount},()=>p.getByTestId('deadline-terms-table').waitFor({state:'visible'}));
  assert.equal(agreed.run.targets[chosen.i].status,'terms');const terms=p.getByTestId('deadline-terms-table'),offer=terms.getByRole('button',{name:'Offer terms (1 hour)',exact:true});
  await photoBlock(p,r,'actual-terms-table',terms,offer);
  const want=reference.dd.termsWanted(agreed.run,chosen.i);assert(want);assert.equal(await p.locator('#deadline-wage').inputValue(),String(want.wage));assert.equal(await p.locator('#deadline-bonus').inputValue(),String(want.bonus));
  assert.equal(await offer.isEnabled(),true,'Actual budget and squad permit displayed asking terms');
  const termsAction={t:'terms',i:chosen.i,wage:want.wage,years:want.years,bonus:want.bonus};
  const signed=await commit(offer,'Actual displayed asking terms',termsAction,()=>deal().getByText('Signed',{exact:true}).waitFor({state:'visible'}));
  assert.equal(signed.run.targets[chosen.i].status,'signed');
  await readView(p.getByRole('button',{name:'Back to the desk',exact:true}),'Actual deal Back',()=>desk().waitFor({state:'visible'}));
  r.phase='pre-finish-reload';const beforeReload=await sample(p,r,'actual complete pre-finish receipt');assert.equal(beforeReload.value.receipt.done,false);
  const oldReference=replayReference(r,beforeReload,'before actual pre-finish reload');await reloadActual('Actual pre-finish reload');
  await press(p,r,carry(),'Actual pre-finish Carry on');await desk().waitFor({state:'visible'});await waitForScrollIdle(p);await drain();await paired(p,r,'actual resumed Desk');
  const resumed=await sample(p,r,'actual pre-finish restored Desk');assert.equal(resumed.value.receiptRaw,beforeReload.value.receiptRaw);assert.deepEqual(replayReference(r,resumed,'actual pre-finish restored receipt reference'),oldReference);
  r.reloadReceipt={before:beforeReload.sequence,after:resumed.sequence,fullCodecEqual:true,scope:'Actual action receipt resumes Desk. No promise that transient detail-tab/unsaved editor state is serialized.'};
  await photo(p,r,'actual-reloaded-desk',p.getByTestId('deadline-target').first());
  r.phase='refusal-new-page';mode='refuse';await reloadActual('Persisted receipt before real refusal');
  const stored=await sample(p,r,'actual persisted receipt before two refused imports');assert.equal(stored.value.session[STALE],undefined);
  const navBefore=r.documentRequests.length;r.phase='refusal-first';await pressReload(carry(),'First actual played-view refusal');
  const auto=await sample(p,r,'actual existing one-time stale module reload');assert.equal(auto.value.receiptRaw,stored.value.receiptRaw);assert.equal(r.documentRequests.length,navBefore+1);assert.equal(auto.value.session[STALE],'1');
  r.phase='refusal-second';const secondNav=r.documentRequests.length;await press(p,r,carry(),'Second actual played-view refusal');
  await p.getByText("The desk didn't load.",{exact:true}).waitFor({state:'visible'});await waitForScrollIdle(p);await drain();await paired(p,r,'actual second refusal');
  const refused=await sample(p,r,'actual local played-view failure boundary');assert.equal(refused.value.receiptRaw,stored.value.receiptRaw);assert.equal(r.documentRequests.length,secondNav);
  const retry=p.getByRole('button',{name:'Retry',exact:true});await photo(p,r,'actual-refused-leaf',retry);
  r.phase='refusal-user-retry';mode='allow';await pressReload(retry,'Actual existing user Retry');
  await press(p,r,carry(),'Actual Carry on after user Retry');await desk().waitFor({state:'visible'});await waitForScrollIdle(p);await drain();await paired(p,r,'actual recovered Desk');
  const recovered=await sample(p,r,'actual receipt after real refused-leaf recovery');assert.equal(recovered.value.receiptRaw,stored.value.receiptRaw);assert.deepEqual(replayReference(r,recovered,'recovered receipt source reference'),oldReference);
  assert.equal(r.leafAttempts.filter(a=>a.mode==='refuse').length,2);assert.equal(r.documentRequests.length,secondNav+1);
  await photo(p,r,'actual-recovered-desk',p.getByTestId('deadline-target').first());
  r.phase='end-confirmation';
  await readView(p.getByRole('button',{name:'I am done, shut the window',exact:true}),'Actual end confirmation disclosure',()=>p.getByRole('button',{name:'Shut it',exact:true}).waitFor({state:'visible'}));
  const end=p.getByRole('button',{name:'Shut it',exact:true});await prepareControl(p,r,end);await paired(p,r,'immediately before sole End commit');
  const beforeEnd=await sample(p,r,'immediately before actual End game commit');assert.equal(beforeEnd.writeRequests,0);assert(r.scriptProofs.length>0,'Actual received compiled completion source exists');
  r.completionPlayerName=beforeEnd.value.local['dukb-display-name']||beforeEnd.value.local['dukb-guest-handle'];r.commitAt=performance.now();r.phase='end-commit';await pressPrepared(p,r,end,'Actual Shut it commit');
  for(const point of['immediate','raf1','raf2']){if(point!=='immediate')await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(resolve)));await sample(p,r,'actual End '+point);}
  await p.getByTestId('deadline-grade').waitFor({state:'visible'});await waitForScrollIdle(p);await drain();
  const completed=await sample(p,r,'actual completed Result and receipt');
  r.completionPlayerName=completed.value.local['dukb-display-name']||completed.value.local['dukb-guest-handle'];receiptAppend(beforeEnd,completed,{t:'end'});
  const finalNetwork=await paired(p,r,'actual sole End completion pairing');assert.equal(finalNetwork.completions.length,1,'One actual source-bound completion POST');
  r.completionTrace=finalNetwork.completions[0];r.completionControls=deadlineCompletionCopiedControls(r.completionTrace.value);r.nativeMethodControl=nativeMethodCopiedControl(r);
  r.preflightEvidence=finalNetwork.preflights;if(finalNetwork.preflights.length)r.preflightControl=deadlinePreflightCopiedControl(finalNetwork.preflights[0].value);
  else r.preflightControl={status:'NO_ACTUAL_PREFLIGHT_OBSERVATION_NO_CONTROL_CREDIT'};
  const result=replayReference(r,completed,'actual final persisted End reference');assert(result.grade);assert.equal(await p.getByText('Grade '+result.grade.letter+' at '+result.state.clubName,{exact:true}).count(),1);
  r.gameCommit={before:beforeEnd.sequence,after:completed.sequence,network:r.completionTrace.proof,scope:'Deliberate game commit, not read-only. Every actual POST is physically aborted, no backend row is sent.'};
  r.phase='result-review';await photoBlock(p,r,'actual-result',p.getByRole('heading',{name:'Grade '+result.grade.letter+' at '+result.state.clubName,exact:true}),p.getByRole('button',{name:'New club',exact:true}));
  const final=await sample(p,r,'complete Result ordinary review held');heldState(completed,final);await paired(p,r,'final read-only Result');photoCensus(r);r.photoOmissionControl=photoOmissionControl(r);r.status='passed';
 }catch(error){
  r.status='failed';r.error={name:error.name,message:error.message,stack:error.stack};
  try{await sample(p,r,'failure complete observed state');const file=r.id+'-failure.png';await p.screenshot({path:path.join(out,file)});r.failureScreenshot=file;}catch(captureError){r.captureError=String(captureError.stack||captureError);}
 }finally{
  if(held)held.resolve();try{await drain();}catch(error){r.assetErrors.push({message:String(error.stack||error),phase:'finally drain'});}
  try{const t=await p.evaluate(()=>window.__deadlineNativeTrace);r.finalDOMTrace=t;assert.equal(t.overflow,false);}catch(error){r.traceError=String(error.stack||error);r.status='failed';}
  await c.close();await Promise.all([...reads]);
  const expectedResource=e=>/^Failed to load resource: net::ERR_(?:BLOCKED_BY_CLIENT(?:\.Inspector)?|FAILED)$/.test(e.text)&&r.aborts.some(a=>a.url===e.location.url&&a.completed!==false);
  const expectedImport=e=>/Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/.test(e.message??e.text)&&(e.message??e.text).includes(leafURL)&&/^refusal-/.test(e.phase)&&r.aborts.some(a=>a.url===leafURL&&a.phase===e.phase);
  r.unexpectedConsole=r.console.filter(e=>e.type==='error'&&!expectedResource(e)&&!expectedImport(e));r.unexpectedPageErrors=r.pageErrors.filter(e=>!expectedImport(e));
  r.unexpectedExternalAborts=r.aborts.filter(a=>a.origin!==origin&&!known.has(a.origin.replace(/^ws/,'http')));
  r.localHttpErrors=r.responses.filter(a=>new URL(a.url).origin===origin&&a.status>=400);
  try{assert(r.inputEvents.length<=15000,'DEADLINE_NATIVE_EVENT_BOUND');validateAssets(r);validateDocuments(r);r.documentOmissionControl=documentOmissionControl(r);r.assetControls=assetControls(r);
   const final=writeSnapshot(r);assert.equal(final.completions.length,1);assert(r.completionControls);assert.equal(r.unexpectedConsole.length,0);assert.equal(r.unexpectedPageErrors.length,0);assert.equal(r.unexpectedExternalAborts.length,0);assert.equal(r.localHttpErrors.length,0);silent();
  }catch(error){r.status='failed';r.classificationError=String(error.stack||error);}
  write('report.json',report);
 }
}
try{for(const width of[320,390,1280])await journey(width);}
finally{
 try{sourceHeld();referenceDependencyHeld();assert.deepEqual(inventory(),m.distBefore);silent();report.referenceProtection.throughCloseHeld=true;report.sourceHeld=true;report.distHeld=true;}catch(error){report.finalHoldError=String(error.stack||error);}
 await browser.close();if(oldNodeStorage===undefined)delete globalThis.localStorage;else globalThis.localStorage=oldNodeStorage;
 report.status=report.contexts.length===3&&report.screenshots.length===33&&report.contexts.every(r=>r.status==='passed')&&report.sourceHeld&&report.distHeld?'passed':'failed';write('report.json',report);
}
assert.equal(report.status,'passed','DEADLINE_NATIVE_ALL_THREE_CONTEXTS');
console.log('Deadline cold native: three actual free-play journeys, pending Back/late/warm/recovery, Desk/Deal/Fee/Terms/Sales/Result and complete real receipts. All actual backend writes aborted and separately classified; no hidden browser model-state or RNG tape claim.');
