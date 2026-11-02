import '../lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import postcss from 'postcss';
import tailwind from 'tailwindcss';
import loadTailwindConfig from 'tailwindcss/loadConfig.js';
import { chromium } from '../lib/playwrightLoader.mjs';

assert.equal(process.env.CI, '1'); assert.equal(process.env.SIM_NETWORK, 'offline');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const base=path.resolve(process.env.WALL_TOUCH_OUT||path.join(root,'tmp/wall-touch-artifacts'));
assert(base.startsWith(path.join(root,'tmp')+path.sep));fs.mkdirSync(base,{recursive:true});
const out=fs.mkdtempSync(path.join(base,'wall-touch-'));
const sha=value=>createHash('sha256').update(value).digest('hex');
const blob=bytes=>createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
const fixturePath='scripts/qa/fixtures/wallPracticeTouchHeld.json';
const files=[fixturePath,'scripts/qa/playWallPracticeTouch.mjs','src/components/soccer-career/DrillBoard.tsx',
'src/components/soccer-career/DrillPlayers.tsx','src/lib/careerDrills.ts','src/lib/freeKick.ts','src/lib/arcade.ts',
'src/hooks/useArcadeFlight.ts','src/hooks/useRevealScroll.ts','src/components/ui/button.tsx',
'src/index.css','tailwind.config.ts','index.html','public/favicon.ico','package.json','package-lock.json'];
const held=new Map(files.map(file=>[file,fs.readFileSync(path.join(root,file))])), imported=new Map();
const write=(name,value)=>fs.writeFileSync(path.join(out,name),JSON.stringify(value,null,2)+'\n');
const receipts=values=>[...values].map(([file,bytes])=>({file,bytes:bytes.length,sha256:sha(bytes),gitBlob:blob(bytes)}));
const hold=()=>{for(const[file,bytes]of[...held,...imported])assert.deepEqual(fs.readFileSync(path.join(root,file)),bytes,'Source held: '+file);};
write('source-before.json',receipts(held));
for(const[file,bytes]of held){const target=path.join(out,'source',file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes);}
const configured=[
{id:'mini-full',width:360,height:664,dpr:2,motion:'no-preference'},
{id:'mini-reduced',width:360,height:664,dpr:2,motion:'reduce'},
{id:'phone-full',width:392,height:731,dpr:2.75,motion:'no-preference'},
{id:'phone-reduced',width:392,height:731,dpr:2.75,motion:'reduce'}];
const rows=[],controls=[],handlers=new Set();let browser,server,origin,primary=null;
const errorRecord=error=>({name:error.name,message:error.message,stack:error.stack});
function remember(meta){for(const file of Object.keys(meta.inputs)){
if(['wall-engine-entry.mjs','wall-touch-entry.tsx'].includes(file))continue;
const absolute=path.resolve(root,file);assert(absolute.startsWith(root+path.sep));
imported.set(path.relative(root,absolute),fs.readFileSync(absolute));}}
try{
assert.equal(sha(held.get(fixturePath)),'7f40e8174712d6f35fe65e69e8ed61dcf75923e84717e99e268b33c58c013986');
for(const[file,expected]of[
['src/components/soccer-career/DrillBoard.tsx','c3c6500b976bce912d3626643269fb1b5388234b'],
['src/components/soccer-career/DrillPlayers.tsx','2556cfa8ce62cd09b36a99969e9ace515198c6b9'],
['src/lib/careerDrills.ts','6125570ccdf2f037a7debeaa7ad14815e9ed860e'],
['src/lib/freeKick.ts','7320c7d87029d6805d808eabb3d02b0f8e32cb4e'],
['src/lib/arcade.ts','218a3bf3b415164920411273923b094172999618']])assert.equal(blob(held.get(file)),expected,file);
const fixture=JSON.parse(held.get(fixturePath)),m=fixture.measurement;
assert.equal(fixture.schemaVersion,1);assert.equal(m.sourceRun,41481586027);assert.equal(m.sourceArtifact,13160530622);
assert.equal(m.sourceZipSHA256,'0266200ed375fe64dc665583f6892b5f43e245456d37767a33e8c3bbc654e1dc');
assert.equal(m.sourceMemberSHA256,'d48188d5d8eba490f3e7afb5ac21c307d5a01e0891735bdbfb0d5923536b613e');
assert.equal(m.selectedEncoding,'base64');assert.equal(m.terminalLfRetained,true);
const rowBytes=Buffer.from(m.selectedBody,'base64');fs.writeFileSync(path.join(out,'held-report-round.jsonl'),rowBytes);
assert.equal(rowBytes.length,2146);assert.equal(rowBytes.at(-1),10);
assert.equal(sha(rowBytes),'e3356f9695db37f39ce7383781c4f17c7d4dad7472d30370009605249d471636');
const tape=JSON.parse(rowBytes);
assert.equal(tape.date,'2026-10-31');assert.equal(tape.round,10);assert.equal(tape.seed,1533316405);
assert.equal(tape.drawCount,4);assert.equal(tape.draws.length,4);assert.equal(sha(JSON.stringify(tape.draws)),tape.drawSha256);
const f=fixture.fonts,manifestBytes=Buffer.from(f.sourceManifestBody,'base64');
assert.equal(f.sourceRun,41443229767);assert.equal(f.sourceArtifact,13140509319);
assert.equal(f.sourceNativeFixtureSHA256,'e0e0bbc34d41ebd3c926bd475dfee311b323137e26628bc3b93caaa6fd357993');
assert.equal(sha(manifestBytes),f.sourceManifestSHA256);
const manifest=JSON.parse(manifestBytes),fonts=new Map();assert.equal(manifest.length,9);assert.equal(f.entries.length,9);
for(const entry of f.entries){
assert.equal(entry.encoding,'gzip+base64');const body=gunzipSync(Buffer.from(entry.body,'base64')),original=manifest.find(row=>row.url===entry.url);
assert(original);assert.equal(path.basename(entry.originalFile),original.file);assert.equal(body.length,entry.bytes);
assert.equal(sha(body),entry.sha256);assert.equal(original.sha256,entry.sha256);assert.equal(original.contentType,entry.contentType);
assert(['https://fonts.googleapis.com','https://fonts.gstatic.com'].includes(new URL(entry.url).origin));
assert(!fonts.has(entry.url));fonts.set(entry.url,{body,contentType:entry.contentType});}
write('held-data-custody.json',{measurement:m,rowSha256:sha(rowBytes),fontSourceFixtureSha256:f.sourceNativeFixtureSHA256,
manifestSha256:sha(manifestBytes),fonts:[...fonts].map(([url,row])=>({url,bytes:row.body.length,sha256:sha(row.body)})),downloads:0});
const shim='const store=new Map();globalThis.localStorage={getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k),key:i=>[...store.keys()][i]??null,get length(){return store.size;},clear:()=>store.clear()};\n';
const engineEntry=shim+'const laws=await import('+JSON.stringify(path.join(root,'src/lib/careerDrills.ts').replaceAll('\\','/'))+');export{laws};';
const engineFile=path.join(out,'actual-wall-engine.mjs');
const engineBundle=await build({absWorkingDir:root,stdin:{contents:engineEntry,resolveDir:root,sourcefile:'wall-engine-entry.mjs'},
outfile:engineFile,bundle:true,write:false,format:'esm',platform:'node',alias:{'@':path.join(root,'src')},metafile:true,logLevel:'silent'});
assert.equal(engineBundle.outputFiles.length,1);fs.writeFileSync(engineFile,Buffer.from(engineBundle.outputFiles[0].contents));remember(engineBundle.metafile);
const{laws}=await import(pathToFileURL(engineFile).href);
assert.deepEqual(laws.buildWallShotRun(tape.seed)[9],tape.setup);
const daily=laws.lehmer(tape.seed^0x5eed1234);for(let i=0;i<36;i++)daily();
assert.deepEqual(Array.from({length:4},()=>daily()),tape.draws);
const heights=[];
for(const y of[0.95,1,1.05,1.1]){
const input={x:0.12,y,power:0.5,press:1.8355},before=JSON.stringify({input,setup:tape.setup,draws:tape.draws});let cursor=0;
const result=laws.takeWallShot(input,tape.setup,()=>tape.draws[cursor++]);
heights.push({input,setup:tape.setup,draws:tape.draws,consumed:cursor,result});write('engine-height-replays.json',heights);
assert.equal(cursor,4);assert.equal(JSON.stringify({input,setup:tape.setup,draws:tape.draws}),before);}
write('engine-height-scope.json',{observed:heights.map(row=>({y:row.input.y,won:row.result.won,verdict:row.result.verdict})),
scope:'Four legal exact-tape replays. No outcome threshold, continuous optimum, coefficient adoption or original random-practice seed claim.'});
const entry=String.raw`
import React from 'react';
import {createRoot} from 'react-dom/client';
import DrillBoard from '@/components/soccer-career/DrillBoard';
import {buildWallShotRun,lehmer} from '@/lib/careerDrills';
import type {CareerState} from '@/lib/soccerCareerEngine';
const config=__CONFIG__;
const native={date:Date,random:Math.random,now:performance.now,raf:requestAnimationFrame,timeout:setTimeout,interval:setInterval};
const state:any={results:[],events:[],bankCalls:0,backCalls:0,factories:0,providedDraws:[],startClick:null};
const storage=()=>Object.fromEntries(Array.from({length:localStorage.length},(_,i)=>localStorage.key(i)!).sort().map(key=>[key,localStorage.getItem(key)]));
state.storageBefore=storage();
document.addEventListener('click',event=>{const n=event.target instanceof Element?event.target.closest('button'):null;if(n?.textContent?.trim()==='Start')state.startClick={now:performance.now(),timeStamp:event.timeStamp,isTrusted:event.isTrusted};},true);
for(const type of['pointerdown','pointermove','pointerup','pointercancel'])document.addEventListener(type,event=>{const e=event as PointerEvent;if(!(e.target instanceof Element)||!e.target.closest('[data-drill-board]'))return;state.events.push({type,pointerType:e.pointerType,pointerId:e.pointerId,clientX:e.clientX,clientY:e.clientY,now:performance.now(),timeStamp:e.timeStamp,isTrusted:e.isTrusted});},true);
const career={position:'ST',overall:60,potential:90,potentialEarned:0,seasons:[{year:2026}],statBoostNextSeason:{},morale:50,events:[]} as unknown as CareerState;
const match={kind:'wallshot' as const,seed:config.seed,round:9,rng:()=>{state.factories++;const rng=lehmer(config.seed^0x5eed1234);for(let i=0;i<36;i++)rng();return()=>{const value=rng();state.providedDraws.push(value);return value;};},onResult:(value:any)=>state.results.push(structuredClone(value))};
Object.defineProperty(window,'__wallTouchRead',{value:()=>structuredClone({...state,storageAfter:storage(),setup:buildWallShotRun(config.seed)[9],phase:document.querySelector('[data-drill-board]')?.getAttribute('data-drill-phase'),motion:document.querySelector('[data-drill-board]')?.getAttribute('data-drill-motion'),native:{date:Date===native.date,random:Math.random===native.random,now:performance.now===native.now,raf:requestAnimationFrame===native.raf,timeout:setTimeout===native.timeout,interval:setInterval===native.interval,nativeFunctions:[Date,Math.random,performance.now,requestAnimationFrame,setTimeout,setInterval].every(fn=>Function.prototype.toString.call(fn).includes('[native code]'))}}),writable:false,configurable:false});
createRoot(document.getElementById('root')!).render(<DrillBoard career={career} canBank={false} onBank={()=>{state.bankCalls++;}} onBack={()=>{state.backCalls++;}} match={match}/>);
`.replace('__CONFIG__',JSON.stringify({seed:tape.seed}));
fs.writeFileSync(path.join(out,'wall-touch-entry.tsx'),entry);
const scriptFile=path.join(out,'fixture.js'),moduleCssFile=path.join(out,'fixture.css');
const bundle=await build({absWorkingDir:root,stdin:{contents:entry,resolveDir:root,sourcefile:'wall-touch-entry.tsx',loader:'tsx'},
outfile:scriptFile,bundle:true,write:false,format:'iife',platform:'browser',jsx:'automatic',alias:{'@':path.join(root,'src')},
define:{'process.env.NODE_ENV':'"production"'},metafile:true,logLevel:'silent'});remember(bundle.metafile);
const js=bundle.outputFiles.find(row=>path.resolve(row.path)===scriptFile),moduleCss=bundle.outputFiles.find(row=>path.resolve(row.path)===moduleCssFile);
assert(js);assert.equal(bundle.outputFiles.length,moduleCss?2:1);
const css=(await postcss([tailwind({...loadTailwindConfig(path.join(root,'tailwind.config.ts')),content:[
{raw:held.get('src/components/soccer-career/DrillBoard.tsx').toString('utf8'),extension:'tsx'},
{raw:held.get('src/components/ui/button.tsx').toString('utf8'),extension:'tsx'},{raw:entry,extension:'tsx'}]})])
.process(held.get('src/index.css').toString('utf8'),{from:path.join(root,'src/index.css')})).css;
const index=held.get('index.html').toString('utf8').replace(/<!--[\s\S]*?-->/g,'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
const tags=[...index.matchAll(/<link\b[^>]*>/gi)].map(match=>match[0]),fontTags=tags.filter(tag=>/rel=["']stylesheet["']/i.test(tag)&&/href=["']https:\/\/fonts\.googleapis\.com\//i.test(tag));
assert.equal(fontTags.length,1);assert(fonts.has(fontTags[0].match(/href=["']([^"']+)/i)[1]));
const html='<!doctype html><html class="dark" lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1">'+fontTags[0]
+'<link rel="icon" href="/favicon.ico"><link rel="stylesheet" href="/preview.css">'+(moduleCss?'<link rel="stylesheet" href="/fixture.css">':'')
+'<title>Wall practice input fixture</title></head><body class="bg-background text-foreground"><main style="max-width:560px;margin:0 auto"><div id="root"></div></main><script src="/fixture.js"></script></body></html>';
const assets=new Map([['/wall-touch-fixture',{body:Buffer.from(html),contentType:'text/html'}],
['/fixture.js',{body:Buffer.from(js.contents),contentType:'text/javascript'}],['/preview.css',{body:Buffer.from(css),contentType:'text/css'}],
['/favicon.ico',{body:held.get('public/favicon.ico'),contentType:'image/x-icon'}]]);
if(moduleCss)assets.set('/fixture.css',{body:Buffer.from(moduleCss.contents),contentType:'text/css'});
for(const[url,row]of assets)fs.writeFileSync(path.join(out,url==='/wall-touch-fixture'?'fixture.html':url.slice(1)),row.body);
write('compile-inputs.json',{source:receipts(imported),engineMetafile:engineBundle.metafile,browserMetafile:bundle.metafile,
cssScope:'Actual index.css/Tailwind config and board/button/fixture source; no dist/public write or full-route styling claim.',
assets:[...assets].map(([url,row])=>({url,bytes:row.body.length,sha256:sha(row.body),contentType:row.contentType}))});hold();
server=http.createServer((_req,res)=>{res.writeHead(404);res.end('Unexpected direct fixture-server request');});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
origin='http://127.0.0.1:'+server.address().port;
browser=await chromium.launch({args:['--no-sandbox']});
const read=page=>page.evaluate(()=>window.__wallTouchRead());
async function geometry(page,x,y){
return page.locator('[data-drill-board]').evaluate((svg,aim)=>{
const posts=[...svg.querySelectorAll('line')].filter(line=>line.getAttribute('stroke')==='white'&&line.getAttribute('stroke-width')==='3.5');
const vertical=posts.filter(line=>line.x1.baseVal.value===line.x2.baseVal.value);if(vertical.length!==2)throw Error('Two actual goal posts required');
const left=Math.min(...vertical.map(line=>line.x1.baseVal.value)),right=Math.max(...vertical.map(line=>line.x1.baseVal.value));
const top=Math.min(...vertical.map(line=>Math.min(line.y1.baseVal.value,line.y2.baseVal.value))),bottom=Math.max(...vertical.map(line=>Math.max(line.y1.baseVal.value,line.y2.baseVal.value)));
const matrix=svg.getScreenCTM();if(!matrix)throw Error('SVG screen transform required');
const project=input=>{const p=svg.createSVGPoint();p.x=left+(input.x+1)/2*(right-left);p.y=bottom-input.y*(bottom-top);const v=p.matrixTransform(matrix);return{x:v.x,y:v.y};};
const box=svg.getBoundingClientRect(),style=getComputedStyle(svg);
const circles=[...svg.querySelectorAll('circle')].filter(circle=>circle.getAttribute('fill')==='none'&&circle.getAttribute('r')==='7');
let marker=null;if(circles.length===1){const p=svg.createSVGPoint();p.x=circles[0].cx.baseVal.value;p.y=circles[0].cy.baseVal.value;const v=p.matrixTransform(matrix);marker={x:v.x,y:v.y};}
return{aim,target:project(aim),marker,posts:{left,right,top,bottom},matrix:{a:matrix.a,b:matrix.b,c:matrix.c,d:matrix.d,e:matrix.e,f:matrix.f},
box:{x:box.x,y:box.y,width:box.width,height:box.height},borders:[style.borderLeftWidth,style.borderRightWidth,style.borderTopWidth,style.borderBottomWidth].map(Number.parseFloat),
scrollY,scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth};
},{x,y});}
async function target(locator,name){
const box=await locator.boundingBox();assert(box,name+': actual box');
const hit=await locator.evaluate(el=>{const r=el.getBoundingClientRect(),n=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return!!n&&(n===el||el.contains(n));});
return{name,box,hit};}
function oracle(record){
const value=record.after.results[0];if(!value)return null;const[x,y,power,press]=value.input;let cursor=0;
const r=laws.takeWallShot({x,y,power,press},tape.setup,()=>tape.draws[cursor++]);
return{consumed:cursor,won:r.won,verdict:r.verdict,points:r.points,end:{x:r.x,y:r.y},saved:r.saved,hitWall:r.hitWall,open:r.open};}
for(const size of configured){
const row={size,cases:[],assets:[],fonts:[],unexpected:[],writes:[],routeErrors:[],pageErrors:[],consoleErrors:[],failedRequests:[],screenshots:[],errors:[]};rows.push(row);
let context,page;
try{
context=await browser.newContext({viewport:{width:size.width,height:size.height},deviceScaleFactor:size.dpr,isMobile:true,hasTouch:true,
reducedMotion:size.motion,locale:'en-US',timezoneId:'Europe/Helsinki'});
await context.route('**/*',route=>{
const task=(async()=>{
const req=route.request(),url=new URL(req.url()),method=req.method();
if(method!=='GET'){row.writes.push({url:url.href,method});await route.abort();return;}
const local=url.origin===origin&&!url.search&&assets.get(url.pathname),asset=local||fonts.get(url.href);
if(!asset){row.unexpected.push({url:url.href,method});await route.abort();return;}
const body=Buffer.from(asset.body);assert.equal(body.length,asset.body.length);assert.equal(sha(body),sha(asset.body));
await route.fulfill({status:200,body,contentType:asset.contentType});
(local?row.assets:row.fonts).push({url:url.href,bytes:body.length,sha256:sha(body),fulfilledBodyType:body.constructor.name});
})().catch(async error=>{row.routeErrors.push(errorRecord(error));try{await route.abort();}catch{}});
handlers.add(task);task.finally(()=>handlers.delete(task));return task;});
page=await context.newPage();page.setDefaultTimeout(7000);
page.on('pageerror',error=>row.pageErrors.push(errorRecord(error)));
page.on('console',m=>{if(m.type()==='error')row.consoleErrors.push(m.text());});
page.on('requestfailed',req=>row.failedRequests.push({url:req.url(),reason:req.failure()?.errorText??null}));
const cdp=await context.newCDPSession(page);
const touch=(type,point=null)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:point?[{x:point.x,y:point.y,id:1,radiusX:1,radiusY:1,force:1}]:[]});
const settle=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
const screenshot=async stage=>{const file=path.join(out,size.id+'-'+stage+'.png');await page.screenshot({path:file,fullPage:true});row.screenshots.push({stage,file:path.basename(file),sha256:sha(fs.readFileSync(file))});};
async function shot(id,aim,cancelFirst=false){
const record={id,aim,cancelFirst};row.cases.push(record);
await page.goto(origin+'/wall-touch-fixture',{waitUntil:'load'});await page.evaluate(()=>document.fonts.ready);await page.locator('[data-drill-phase="ready"]').waitFor();
record.ready=await read(page);record.startTarget=await target(page.getByRole('button',{name:'Start',exact:true}),'Start');
if(id==='default')await screenshot('setup');
await page.getByRole('button',{name:'Start',exact:true}).tap();await page.locator('[data-drill-phase="playing"]').waitFor();
record.before=await read(page);record.startGeometry=await geometry(page,0,0.8);
if(aim){
const from=(await geometry(page,0,0.8)).target;
if(cancelFirst){
await touch('touchStart',from);await settle();await touch('touchMove',(await geometry(page,-0.4,0.6)).target);await settle();
await touch('touchCancel');await settle();record.cancel=await read(page);
}
if(id==='upper'){
const range=page.getByRole('slider',{name:'How hard to hit it',exact:true});
await range.press('ArrowLeft');await range.press('ArrowLeft');await range.press('ArrowLeft');
record.powerSetup={method:'Three native keyboard decrements from0.65. No touch-slider precision claim.',value:Number(await range.inputValue())};
}
await touch('touchStart',from);await settle();
await touch('touchMove',(await geometry(page,aim.x/2,(0.8+aim.y)/2)).target);await settle();
record.intended=await geometry(page,aim.x,aim.y);await touch('touchMove',record.intended.target);await settle();
record.aimed=await geometry(page,aim.x,aim.y);
if(id==='aimed')await screenshot('aimed');
await page.locator('[data-wall-shot-window="open"]').waitFor();
record.cue={text:await page.locator('[data-wall-shot-window]').innerText(),beforeRelease:await read(page)};
await touch('touchEnd');
}else{
record.shootTarget=await target(page.getByRole('button',{name:'Shoot now',exact:true}),'Shoot now');
await page.locator('[data-wall-shot-window="open"]').waitFor();
record.cue={text:await page.locator('[data-wall-shot-window]').innerText(),beforeRelease:await read(page)};
await page.getByRole('button',{name:'Shoot now',exact:true}).tap();
}
await page.waitForFunction(()=>window.__wallTouchRead().results.length>0);
await page.locator('[data-drill-phase="roundEnd"]').waitFor();await settle();
record.after=await read(page);record.geometryAfter=await geometry(page,aim?.x??0,aim?.y??0.8);record.expected=oracle(record);
if(aim){
const packed=record.after.results[0].input,projected=await geometry(page,packed[0],packed[1]);
const lastUp=record.after.events.filter(event=>event.type==='pointerup').at(-1);
record.mapping={client:lastUp?{x:lastUp.clientX,y:lastUp.clientY}:null,projectedCallback:projected.target,
visibleMarkerBeforeRelease:record.aimed.marker,measuredBorders:record.aimed.borders,
cssPixelAllowance:Math.max(...record.aimed.borders)+1+Math.max(record.aimed.box.width,record.aimed.box.height)*0.0001,
allowanceScope:'Measured SVG border plus one CSS pixel for event/screen quantization and four-place rounding. Not human thumb accuracy.'};
}
write(size.id+'-'+id+'.json',record);if(id==='upper')await screenshot('result');
}
await shot('default',null);await shot('aimed',{x:0.12,y:0.85});await shot('upper',{x:0.12,y:1.05},true);
row.completed=true;
}catch(error){
row.errors.push(errorRecord(error));
if(page&&!page.isClosed()){
try{row.partial=await read(page);}catch(e){row.partialReadError=errorRecord(e);}
try{const file=path.join(out,size.id+'-failure.png');await page.screenshot({path:file,fullPage:true});row.failureImage={file:path.basename(file),sha256:sha(fs.readFileSync(file))};}catch(e){row.imageError=errorRecord(e);}
}
}finally{
await Promise.allSettled([...handlers]);
if(context)try{await context.close();}catch(error){row.errors.push({step:'context-close',...errorRecord(error)});}
try{hold();}catch(error){row.errors.push({step:'holds',...errorRecord(error)});}
write(size.id+'.json',row);
}}
function validate(values){
assert.equal(values.length,4,'WALL_TOUCH_CONTEXTS');
for(const row of values){
assert.equal(row.completed,true,'WALL_TOUCH_CONTEXT_COMPLETED');
assert.deepEqual(row.errors,[],'WALL_TOUCH_PRIMARY_ERRORS');
assert.deepEqual(row.routeErrors,[],'WALL_TOUCH_ROUTE_ERRORS');assert.deepEqual(row.pageErrors,[],'WALL_TOUCH_RUNTIME');
assert.deepEqual(row.consoleErrors,[],'WALL_TOUCH_CONSOLE');assert.deepEqual(row.failedRequests,[],'WALL_TOUCH_FAILED_REQUEST');
assert.deepEqual(row.unexpected,[],'WALL_TOUCH_TRANSPORT');assert.deepEqual(row.writes,[],'WALL_TOUCH_WRITES');
assert.deepEqual(row.cases.map(r=>r.id),['default','aimed','upper'],'WALL_TOUCH_CASE_IDENTITIES');
assert.equal(row.screenshots.length,3,'WALL_TOUCH_IMAGES');
for(const r of row.cases){
assert(r.startTarget.hit,'WALL_TOUCH_START_REACHABLE');assert.equal(r.after.results.length,1,'WALL_TOUCH_ONE_SETTLEMENT');
assert.equal(r.after.factories,1);assert.deepEqual(r.after.providedDraws,tape.draws,'WALL_TOUCH_EXACT_TAPE');
assert.deepEqual(r.after.setup,tape.setup);assert.equal(r.expected.consumed,4);
assert.equal(r.after.bankCalls,0);assert.equal(r.after.backCalls,0);
assert.deepEqual(r.after.storageAfter,r.ready.storageBefore,'WALL_TOUCH_STORAGE_HELD');
assert(Object.values(r.after.native).every(v=>v===true),'WALL_TOUCH_NATIVE_APIS');
assert.equal(r.after.motion,row.size.motion==='reduce'?'reduced':'full');
assert(r.after.startClick?.isTrusted,'WALL_TOUCH_NATIVE_START');
const actual=r.after.results[0];
assert.deepEqual({won:actual.won,verdict:actual.verdict,points:actual.points},{won:r.expected.won,verdict:r.expected.verdict,points:r.expected.points},'WALL_TOUCH_ACTUAL_INPUT_PARITY');
assert(actual.input.length===4&&actual.input.every(Number.isFinite));
assert(r.geometryAfter.scrollWidth<=r.geometryAfter.clientWidth+1,'WALL_TOUCH_NO_OVERFLOW');
if(r.aim){
assert(r.after.events.every(e=>e.pointerType==='touch'&&e.isTrusted),'WALL_TOUCH_TRUSTED_POINTERS');
for(const type of['pointerdown','pointermove','pointerup'])assert(r.after.events.some(e=>e.type===type));
const m=r.mapping;assert(m.client&&m.visibleMarkerBeforeRelease);
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
assert(distance(m.client,m.projectedCallback)<=m.cssPixelAllowance,'WALL_TOUCH_MAPPING');
assert(distance(m.client,m.visibleMarkerBeforeRelease)<=m.cssPixelAllowance,'WALL_TOUCH_VISIBLE_AIM');
}else{
assert(r.shootTarget.hit,'WALL_TOUCH_SHOOT_REACHABLE');assert.deepEqual(actual.input.slice(0,3),[0,0.8,0.65]);
}
if(r.cancelFirst){
assert(r.cancel.phase==='playing'&&r.cancel.results.length===0&&r.cancel.factories===0&&r.cancel.providedDraws.length===0,'WALL_TOUCH_CANCEL_NO_SHOT');
assert(r.cancel.events.some(e=>e.type==='pointercancel'&&e.isTrusted),'WALL_TOUCH_NATIVE_CANCEL');
assert.equal(r.powerSetup.value,0.5,'WALL_TOUCH_ACTUAL_POWER');
}
}}}
write('actual-observations.json',rows);validate(rows);
for(const[name,marker,mutate]of[
['mapping','WALL_TOUCH_MAPPING',v=>{v[0].cases[1].mapping.projectedCallback.x+=8;}],
['parity','WALL_TOUCH_ACTUAL_INPUT_PARITY',v=>{v[0].cases[0].after.results[0].won=!v[0].cases[0].after.results[0].won;}],
['cancel','WALL_TOUCH_CANCEL_NO_SHOT',v=>{v[0].cases[2].cancel.results.push({copied:true});}],
['storage','WALL_TOUCH_STORAGE_HELD',v=>{v[0].cases[0].after.storageAfter['wall-touch-copy']='changed';}],
['native','WALL_TOUCH_NATIVE_APIS',v=>{v[0].cases[0].after.native.now=false;}],
['transport','WALL_TOUCH_TRANSPORT',v=>{v[0].unexpected.push({url:'https://example.invalid/'});}],
]){
const copy=structuredClone(rows);mutate(copy);assert.notEqual(sha(JSON.stringify(copy)),sha(JSON.stringify(rows)));
assert.throws(()=>validate(copy),e=>e instanceof assert.AssertionError&&e.message.includes(marker),'Owned copied-observation refusal: '+name);
validate(rows);controls.push({name,marker,changed:true,ownedRefusal:true,restoredHealthy:true});
}
hold();
write('summary.json',{scope:'Actual compiled one-round DrillMatch input fixture on PR450, not original practice/full career route/human precision.',
configuredContexts:4,attemptedContexts:rows.length,completedContexts:rows.filter(r=>r.completed).length,nativeCommits:12,nativeCancels:4,
screenshots:rows.reduce((n,r)=>n+r.screenshots.length,0),engineHeightReplays:heights.map(r=>({input:r.input,won:r.result.won,verdict:r.result.verdict})),
controls,observationSha256:sha(JSON.stringify(rows)),styles:'Actual source styles into QA output only, no dist/public writes.',
limits:'Power setup uses native keyboard range events. No touch-slider precision, physical Android, original user run, daily save/bank, continuous optimum or balance adoption claim.'});
console.log('WALL_TOUCH:4 exact height replays;4 actual component contexts,12 native commits,4 native cancels,12 images,6 effective copied-observation controls and restorations.');
console.log('Evidence: '+out);
}catch(error){primary=error;write('failure.json',errorRecord(error));throw error;}
finally{
const cleanup=[];await Promise.allSettled([...handlers]);
if(browser)try{await browser.close();}catch(error){cleanup.push({step:'browser',...errorRecord(error)});}
if(server?.listening)try{await new Promise(resolve=>server.close(resolve));}catch(error){cleanup.push({step:'server',...errorRecord(error)});}
try{
write('source-after.json',receipts(new Map([...held.keys()].map(file=>[file,fs.readFileSync(path.join(root,file))]))));
write('imported-after.json',receipts(new Map([...imported.keys()].map(file=>[file,fs.readFileSync(path.join(root,file))]))));hold();
}catch(error){cleanup.push({step:'holds',...errorRecord(error)});}
write('cleanup.json',cleanup);if(!primary)assert.deepEqual(cleanup,[],'Source and resource cleanup');
}
