import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { createRequire } from 'node:module';
import { chromium } from '../lib/playwrightLoader.mjs';
import { answerConsent } from '../lib/answerConsent.mjs';
import { waitForScrollIdle } from './nativeScrollReady.mjs';

const arg=name=>{const i=process.argv.indexOf(name);assert(i>=0&&process.argv[i+1],name);return process.argv[i+1];};
const out=path.resolve(arg('--out')),dist=path.resolve(arg('--dist')),base=arg('--base-url').replace(/\/$/,''),origin=new URL(base).origin;
assert(process.env.CI,'Remote CI only');assert.equal(new URL(base).hostname,'127.0.0.1','Admitted local dist only');
const receipt=process.env.SIM_OFFLINE_RECEIPT,sha=b=>createHash('sha256').update(b).digest('hex'),clone=v=>JSON.parse(JSON.stringify(v));
const blob=b=>createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
const write=(file,value)=>fs.writeFileSync(path.join(out,file),JSON.stringify(value,null,2)+'\n');
function silent(){assert(receipt);assert.equal(fs.readFileSync(receipt).length,0,'RUSSIA_NATIVE_NODE_OFFLINE_RECEIPT');}silent();
assert(!fs.existsSync(out)||fs.readdirSync(out).length===0,'Fresh owned output');for(const name of ['frames','bodies','reference','input'])fs.mkdirSync(path.join(out,name),{recursive:true});
const m=JSON.parse(fs.readFileSync(arg('--manifest'),'utf8'));
assert(!JSON.stringify(m).includes('MUST_BIND'),'SC_LATER_NATIVE_ALL_ACTUAL_BINDINGS_REQUIRED');
assert.equal(m.schema,'SC_LATER_NATIVE_SOURCE_DIST_V1');assert.equal(m.status,'QUALIFIED_BUILD_AND_REACT_UI_FIXTURES_BOUND');
for(const value of Object.values(m.product))assert.match(value,/^[a-f0-9]{40}$/);
for(const name of['qualification','rawAdmission'])assert.match(m.admissions[name],/^[a-f0-9]{64}$/);
assert.deepEqual(m.sourceBefore,m.sourceAfter);assert(Array.isArray(m.sourcePins)&&m.sourcePins.length>0);
function sourceHeld(){for(const[file,digest]of Object.entries(m.sourceAfter)){assert.match(digest,/^[a-f0-9]{64}$/);assert.equal(sha(fs.readFileSync(file)),digest,file);}for(const row of m.sourcePins){assert.match(row.gitBlob,/^[a-f0-9]{40}$/);assert.equal(blob(fs.readFileSync(row.path)),row.gitBlob,row.path);assert(Object.hasOwn(m.sourceAfter,row.path));}}
sourceHeld();
const taskRequire=createRequire(path.join(process.cwd(),'package.json'));
function pureReferences(){
 const codecPath='src/lib/soccerCareerSave.ts',factPath='src/lib/soccerHistoricalArrivals.ts',panelPath='src/components/soccer-career/PhonePanel.tsx',pagePath='src/pages/SoccerCareer.tsx';
 const moduleFile=path.join(out,'reference','codec.cjs'),result=taskRequire('esbuild').buildSync({entryPoints:[codecPath],bundle:true,platform:'node',format:'cjs',outfile:moduleFile,metafile:true,logLevel:'silent'});
 const inputs=Object.keys(result.metafile.inputs).map(file=>path.relative(process.cwd(),path.resolve(file)).split(path.sep).join('/')).sort(),dep=m.codecDependency;
 assert.deepEqual(inputs,['node_modules/lz-string/libs/lz-string.js',codecPath].sort(),'SC_LATER_NATIVE_PURE_CODEC_INPUTS');
 assert.equal(dep.file,'node_modules/lz-string/libs/lz-string.js');assert(Number.isSafeInteger(dep.bytes)&&dep.bytes>0);assert.match(dep.sha256,/^[a-f0-9]{64}$/);
 const lock=JSON.parse(fs.readFileSync('package-lock.json')),pkg=JSON.parse(fs.readFileSync('node_modules/lz-string/package.json'));assert.equal(pkg.version,dep.version);assert.equal(lock.packages['node_modules/lz-string'].version,dep.version);
 for(const file of inputs){const bytes=fs.readFileSync(file);if(file===dep.file){assert.equal(bytes.length,dep.bytes);assert.equal(sha(bytes),dep.sha256);}else assert.equal(sha(bytes),m.sourceAfter[file]);const target=path.join(out,'reference','inputs',file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes,{flag:'wx'});}write('codec-metafile.json',result.metafile);
 const codec=taskRequire(moduleFile);for(const name of['parseSoccerCareerSave','serializeSoccerCareerSave','isSoccerCareerSave'])assert.equal(typeof codec[name],'function');
 const ts=taskRequire('typescript'),unwrap=node=>{while(ts.isAsExpression(node)||ts.isParenthesizedExpression(node)||ts.isTypeAssertionExpression(node)||ts.isSatisfiesExpression(node))node=node.expression;return node;};
 const literal=(file,name)=>{const sf=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS),vars=sf.statements.filter(ts.isVariableStatement).flatMap(node=>[...node.declarationList.declarations]),rows=vars.filter(node=>ts.isIdentifier(node.name)&&node.name.text===name);assert.equal(rows.length,1,name);return unwrap(rows[0].initializer);};
 const value=node=>{node=unwrap(node);if(ts.isStringLiteral(node))return node.text;if(ts.isNumericLiteral(node))return Number(node.text);if(ts.isArrayLiteralExpression(node))return node.elements.map(value);assert(ts.isObjectLiteralExpression(node),'SC_LATER_NATIVE_LITERAL_SOURCE_ONLY');return Object.fromEntries(node.properties.map(prop=>{assert(ts.isPropertyAssignment(prop));const key=ts.isIdentifier(prop.name)?prop.name.text:value(prop.name);return[key,value(prop.initializer)];}));};
 const facts=value(literal(factPath,'SOCCER_HISTORICAL_PLAYERS')),links=value(literal(panelPath,'HISTORICAL_ENTRY_SOURCES')),eras=value(literal(pagePath,'ERAS'));
 assert.deepEqual(facts.map(row=>row.id),['soccer:neymar','soccer:mbappe','soccer:haaland','soccer:bellingham']);
 for(const year of[2010,2015]){const expected=facts.filter(row=>row.entryYear>year);assert.equal(expected.length,year===2010?3:2);assert.equal(eras.filter(row=>row.startYear===year).length,1);for(const row of expected){assert.equal(links[row.id].length,2);assert(links[row.id].every(pair=>pair.length===2&&pair.every(v=>typeof v==='string'&&v.length>0)));}}
 write('pure-references.json',{inputs,codecDependency:dep,facts,links,eras,scope:'Pure save codec plus literal source AST only. No engine import, initialization, model callback or fixture generation.'});return{codec,facts,links,eras};
}
const requiredSources=['src/pages/SoccerCareer.tsx','src/lib/soccerCareerEngine.ts','src/lib/soccerHistoricalArrivals.ts','src/components/soccer-career/PhonePanel.tsx','src/lib/soccerCareerSave.ts','src/lib/saveFence.ts','src/integrations/supabase/client.ts','src/test/soccerHistoricalRealEntry.test.tsx','scripts/simSoccerHistoricalArrivals.mjs'];
for(const file of requiredSources){assert(Object.hasOwn(m.sourceAfter,file),'SC_LATER_NATIVE_REQUIRED_SOURCE '+file);assert.equal(m.sourcePins.filter(row=>row.path===file).length,1);}
const references=pureReferences();
function parsedSave(raw){if(raw===null)return null;assert.equal(typeof raw,'string');const value=references.codec.parseSoccerCareerSave(raw);assert(references.codec.isSoccerCareerSave(value));assert.equal(references.codec.serializeSoccerCareerSave(value),raw,'SC_LATER_NATIVE_FULL_CODEC_ROUNDTRIP');return value;}
function inventory(){const rows=[];function walk(rel=''){for(const entry of fs.readdirSync(path.join(dist,rel),{withFileTypes:true})){const file=path.posix.join(rel,entry.name);if(entry.isDirectory())walk(file);else{assert(entry.isFile());const bytes=fs.readFileSync(path.join(dist,file));rows.push({file,bytes:bytes.length,sha256:sha(bytes)});}}}walk();return rows.sort((a,b)=>a.file<b.file?-1:a.file>b.file?1:0);}
assert.deepEqual(inventory(),m.distBefore);assert.equal(sha(JSON.stringify(m.distBefore)),m.distDigest);
const refs=new Map(m.distBefore.map(row=>[row.file,row])),observed=new Map();assert(refs.has('prerender-boot.js'));
function expectedFor(year){assert([2010,2015].includes(year));return references.facts.filter(row=>row.entryYear>year);}
function validateRegistry(state,year,complete){const rows=expectedFor(year),wanted=complete?rows.map(({name,...row})=>row):[];assert.equal(state.seasons[0].year,year,'SC_LATER_NATIVE_REGISTRY');assert.deepEqual(state.historicalArrivals,{version:3,startYear:year,players:wanted},'SC_LATER_NATIVE_REGISTRY');return rows;}
assert.equal(m.fixtures.length,2);assert.deepEqual(m.fixtures.map(row=>row.startYear),[2010,2015]);
const fixtures=new Map();
for(const pin of m.fixtures){
 assert(path.isAbsolute(pin.file));assert(Number.isSafeInteger(pin.bytes)&&pin.bytes>0);assert.match(pin.sha256,/^[a-f0-9]{64}$/);assert.match(pin.rawSHA256,/^[a-f0-9]{64}$/);
 const bytes=fs.readFileSync(pin.file);assert.equal(bytes.length,pin.bytes);assert.equal(sha(bytes),pin.sha256);
 const outer=JSON.parse(bytes),v=outer.value;assert(Array.isArray(outer.importDraws));assert.equal(v.schema,'SC_LATER_START_FULL_EVENTS_V1');assert.equal(v.startYear,pin.startYear);const era=references.eras.find(row=>row.startYear===pin.startYear);assert.equal(v.era,era.value);assert.equal(v.ui.args[3],era.value);assert.equal(v.ui.args[6],pin.startYear);validateRegistry(v.ui.state,pin.startYear,false);
 const raw=v.repeated.loadedBytes,state=parsedSave(raw);assert.equal(Buffer.byteLength(raw),pin.rawBytes);assert.equal(sha(Buffer.from(raw)),pin.rawSHA256);assert.equal(raw,v.loaded.loadedBytes);assert.equal(raw,v.loaded.bytes);assert.equal(raw,v.repeated.bytes);assert.deepEqual(state,v.repeated.state);assert.equal(state.seasons.at(-1).year,2020);validateRegistry(state,pin.startYear,true);
 assert.equal(state.phase,pin.phase,'SC_LATER_NATIVE_ACTUAL_FIXTURE_PHASE');assert.equal(pin.rawAdmissionSHA256,m.admissions.rawAdmission);
 const target='input/later-ui-'+pin.startYear+'.json';fs.writeFileSync(path.join(out,target),bytes,{flag:'wx'});fixtures.set(pin.startYear,{pin,bytes,outer,value:v,raw,state});
}
const report={schema:'SC_LATER_NATIVE_BROWSER_V1',status:'incomplete',product:m.product,authority:{manifestSHA256:sha(fs.readFileSync(arg('--manifest'))),admissions:m.admissions,distDigest:m.distDigest},contexts:[],screenshots:[],scope:'Two genuine2010/2015 UI creations and two separate complete admitted2020 React-UI fixture readouts with one document reload each. Five start/identity cells, three people. No natural20-year browser progression, real-user save, inherited legacy rerun, public or provider-write claim.'};
const known=new Set(['https://flagcdn.com','https://fonts.googleapis.com','https://fonts.gstatic.com','https://flawuiqbvjobmkfkauhw.supabase.co']);
const idle=p=>p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))),scrollOf=p=>p.evaluate(()=>({x:scrollX,y:scrollY})),active=p=>p.evaluate(()=>{const n=document.activeElement;return n?{tag:n.tagName,id:n.id,name:n.getAttribute('aria-label'),text:n.textContent?.trim().slice(0,100)}:null;});
const KEY='soccerCareerSave';
async function storage(p) { return p.evaluate(() => Object.fromEntries(Object.keys(localStorage).sort().map(k => [k, localStorage.getItem(k)]))); }
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
 assert(t.y>=g.y+4&&t.bottom<=g.bottom-4&&t.x>=g.x&&t.right<=Math.min(g.right,width),'SC_REAL_ENTRY_NATIVE_TOUCH_TARGET_UNREACHABLE');
}
function copiedTouchGeometryControl(box,width){
 const original=JSON.stringify(box),copy=clone(box),top=copy.target.y;copy.target.y=copy.clip.y-5;const fault=JSON.stringify(copy);assert.notEqual(fault,original);
 let owned=null;try{validateTouchGeometry(copy,width);}catch(error){owned=error;}
 assert(owned instanceof assert.AssertionError);assert.match(owned.message,/^SC_REAL_ENTRY_NATIVE_TOUCH_TARGET_UNREACHABLE/);copy.target.y=top;assert.equal(JSON.stringify(copy),original);
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
 const reached=await targetGeometry(target);validateTouchGeometry(reached,r.width);r.touchReachControl??=copiedTouchGeometryControl(reached,r.width);
 r.actions.push({type:'trusted-touch-scroll-preparation',samples,reached});
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
 assert.deepEqual(next.document,before.document,'SC_REAL_ENTRY_NATIVE_REVIEW_DOCUMENT_SCROLL');
 assert.equal(next.saved.raw,before.saved.raw,'Phone read-only keeps every saved byte');assert.deepEqual(next.saved.state,before.saved.state);
 assert.deepEqual(next.storage,before.storage,'All browser storage held');assert.equal(next.url,before.url);assert.equal(next.writeRequests,before.writeRequests,'No new write request');
}
function copiedReviewScrollControl(before,after){
 const sample={before,after},original=JSON.stringify(sample),copy=clone(sample);copy.after.document.y+=10;const fault=JSON.stringify(copy);assert.notEqual(fault,original);
 let owned=null;try{validateReadonlyReview(copy.before,copy.after);}catch(error){owned=error;}
 assert(owned instanceof assert.AssertionError);assert.match(owned.message,/^SC_REAL_ENTRY_NATIVE_REVIEW_DOCUMENT_SCROLL/);
 const faultDocument=clone(copy.after.document);copy.after.document.y=after.document.y;assert.equal(JSON.stringify(copy),original);assert.equal(JSON.stringify(sample),original);
 return{actualSampleSHA256:sha(original),beforeDocument:before.document,actualAfterDocument:after.document,faultAfterDocument:faultDocument,ownedFailure:{name:owned.name,message:owned.message},wholeInverseExact:true,actualSampleHeld:true,scope:'Copied actual read-only review sample only. No physical input or signing-scroll control credit.'};
}

async function cardGeometry(card){return card.evaluate(n=>{const b=n.getBoundingClientRect();let clip={x:0,y:0,right:innerWidth,bottom:innerHeight};for(let a=n.parentElement;a;a=a.parentElement){const s=getComputedStyle(a),q=a.getBoundingClientRect();if(['auto','scroll','hidden','clip'].includes(s.overflowX)){clip.x=Math.max(clip.x,q.x);clip.right=Math.min(clip.right,q.right);}if(['auto','scroll','hidden','clip'].includes(s.overflowY)){clip.y=Math.max(clip.y,q.y);clip.bottom=Math.min(clip.bottom,q.bottom);}}const target={x:b.x,y:b.y,right:b.right,bottom:b.bottom,width:b.width,height:b.height},points=[];for(const x of[b.x+8,(b.x+b.right)/2,b.right-8])for(const y of[b.y+8,(b.y+b.bottom)/2,b.bottom-8]){const hit=document.elementFromPoint(x,y);points.push({x,y,inside:!!hit&&(hit===n||n.contains(hit))});}return{target,clip,points,document:{scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth}};});}
function validateCard(box){const t=box.target,c=box.clip;assert(t.width>0&&t.height>0&&t.x>=c.x&&t.right<=c.right&&t.y>=c.y+4&&t.bottom<=c.bottom-4&&box.points.length===9&&box.points.every(p=>p.inside),'SC_REAL_ENTRY_CARD_WHOLE_VISIBLE');assert(box.document.scrollWidth<=box.document.clientWidth+1,'No horizontal document overflow');}
function cardControl(box){const before=JSON.stringify(box),copy=clone(box),y=copy.target.y;copy.target.y=copy.clip.y-5;assert.notEqual(JSON.stringify(copy),before);let owned=null;try{validateCard(copy);}catch(error){owned=error;}assert(owned instanceof assert.AssertionError);assert.match(owned.message,/^SC_REAL_ENTRY_CARD_WHOLE_VISIBLE/);copy.target.y=y;assert.equal(JSON.stringify(copy),before);assert.equal(JSON.stringify(box),before);return{changed:true,ownedFailure:{name:owned.name,message:owned.message},wholeInverseExact:true,actualHeld:true,scope:'Copied actual card geometry only, no physical negative-control credit.'};}

async function sessionStorageOf(p) { return p.evaluate(() => Object.fromEntries(Object.keys(sessionStorage).sort().map(k => [k, sessionStorage.getItem(k)]))); }
function writes(r) { return r.requests.filter(q => !['GET', 'HEAD'].includes(q.method)).length; }
function nativeCensusInput(r){return{requests:r.requests,nativeRequests:r.nativeRequests,aborts:r.aborts,failures:r.failures,nativeEvents:r.nativeEvents,assetBodies:r.assetBodies,responses:r.responses};}
function readInitiatorSource(r,parent,pw){
 const marker='K_NATIVE_READ_PREFLIGHT_SOURCE_BODY',frames=[];
 const walk=stack=>{if(!stack)return;for(const frame of stack.callFrames??[])if(frame.url)frames.push(frame);walk(stack.parent);};walk(parent.initiator?.stack);
 assert.equal(parent.initiator?.type,'script',marker+' script initiator');assert(frames.length>0,marker+' actual call frames');
 return frames.map(frame=>{
  const url=new URL(frame.url);assert.equal(url.origin,origin,marker+' local executed source');
  const rows=r.assetBodies.filter(body=>body.url===frame.url&&body.id<pw.id);assert(rows.length>0,marker+' observed response body');
  const row=rows[0],expected=m.distBefore.find(value=>value.file===row.path);assert(expected,marker+' completed dist owner');
  const bytes=fs.readFileSync(path.join(out,row.file));assert.equal(row.status,200,marker+' HTTP200');assert.equal(bytes.length,row.bytes,marker+' complete bytes');assert.equal(sha(bytes),row.sha256,marker+' retained response bytes');assert.equal(row.sha256,expected.sha256,marker+' dist SHA');assert.equal(row.bytes,expected.bytes,marker+' dist bytes');
  const request=r.requests.filter(value=>value.id===row.id),response=r.responses.filter(value=>value.id===row.id);
  assert.equal(request.length,1,marker+' source request');assert.equal(request[0].method,'GET',marker+' source GET');assert.equal(request[0].url,frame.url,marker+' source URL');
  assert.equal(response.length,1,marker+' source response');assert.equal(response[0].status,200,marker+' response200');assert.equal(response[0].url,frame.url,marker+' response URL');
  const lines=bytes.toString('utf8').split('\n');assert(Number.isInteger(frame.lineNumber)&&frame.lineNumber>=0&&frame.lineNumber<lines.length,marker+' source line');assert(Number.isInteger(frame.columnNumber)&&frame.columnNumber>=0&&frame.columnNumber<=lines[frame.lineNumber].length,marker+' source column');
  return{scriptId:frame.scriptId,functionName:frame.functionName,url:frame.url,lineNumber:frame.lineNumber,columnNumber:frame.columnNumber,sourceRequestId:row.id,file:row.file,bytes:row.bytes,sha256:row.sha256};
 });
}
function linkedNativeReadPreflight(r,row){
 const marker='K_NATIVE_READ_PREFLIGHT';
 assert.equal(row.method,'OPTIONS',marker+' method');assert.equal(row.postData,null,marker+' empty body');assert.equal(row.initiator?.type,'preflight',marker+' native initiator');
 assert.equal(typeof row.initiator.requestId,'string',marker+' parent ID');
 const parents=r.nativeRequests.filter(value=>value.requestId===row.initiator.requestId);assert.equal(parents.length,1,marker+' exact parent ID');
 const parent=parents[0];assert.equal(parent.method,'GET',marker+' parent GET');assert.equal(parent.postData,null,marker+' parent empty body');assert.equal(parent.url,row.url,marker+' parent URL');assert.equal(parent.phase,row.phase,marker+' parent phase');assert.equal(row.initiator.url,row.url,marker+' initiator URL');
 const requests=r.requests.filter(value=>value.method==='GET'&&value.url===row.url&&value.phase===row.phase);assert.equal(requests.length,1,marker+' exact PW GET');const pw=requests[0];assert.equal(pw.postData,null,marker+' PW empty body');
 const aborts=r.aborts.filter(value=>value.id===pw.id&&value.method==='GET'&&value.url===row.url&&value.phase===row.phase);assert.equal(aborts.length,1,marker+' declared GET abort');assert.equal(aborts[0].reason,'existing offline policy',marker+' declared policy');
 const failures=r.failures.filter(value=>value.id===pw.id&&value.url===row.url&&value.phase===row.phase);assert.equal(failures.length,1,marker+' PW requestfailed');assert.equal(failures[0].error?.errorText,'net::ERR_BLOCKED_BY_CLIENT.Inspector',marker+' physical PW abort');
 const nativeFailures=r.nativeEvents.filter(value=>value.kind==='loadingFailed'&&value.event.requestId===parent.requestId);assert.equal(nativeFailures.length,1,marker+' native completion');assert.equal(nativeFailures[0].event.errorText,'net::ERR_BLOCKED_BY_CLIENT.Inspector',marker+' native physical abort');assert.equal(nativeFailures[0].event.blockedReason,'inspector',marker+' native block reason');assert.equal(nativeFailures[0].event.canceled,false,marker+' native inspector outcome');
 assert.equal(r.nativeEvents.filter(value=>value.kind==='responseReceived'&&value.event.requestId===parent.requestId).length,0,marker+' parent did not reach response');
 const preflightResponses=r.nativeEvents.filter(value=>value.kind==='responseReceived'&&value.event.requestId===row.requestId);assert.equal(preflightResponses.length,1,marker+' actual preflight response');assert.equal(preflightResponses[0].event.response.status,204,marker+' actual preflight204');
 assert.equal(preflightResponses[0].event.response.url,row.url,marker+' response URL');
 return{preflight:row,parent,pw,declaredAbort:aborts[0],requestfailed:failures[0],nativeCompletion:nativeFailures[0],response:preflightResponses[0],sourceBodies:readInitiatorSource(r,parent,pw),scope:'Automatic empty read preflight reached provider with204. Only its exact GET parent was physically aborted. No game/provider write or blanket OPTIONS permission.'};
}
async function sample(p, r, label) {
  const v = await p.evaluate(key => {
    const a = document.activeElement;
    return { url: location.href, html: document.documentElement.outerHTML, text: document.body.innerText,
      document: { x: scrollX, y: scrollY }, focus: a ? { tag: a.tagName, id: a.id, name: a.getAttribute('aria-label'), text: a.textContent?.trim().slice(0, 100) } : null,
      local: Object.fromEntries(Object.keys(localStorage).sort().map(k => [k, localStorage.getItem(k)])),
      session: Object.fromEntries(Object.keys(sessionStorage).sort().map(k => [k, sessionStorage.getItem(k)])),
      careerRaw: localStorage.getItem(key),
      rows: [...document.querySelectorAll('[data-cm-board-wants]')].map(n => ({ html: n.closest('button').outerHTML, demand: n.textContent, name: n.closest('button').querySelector('span.text-xs.font-bold.truncate')?.textContent })) };
  }, r.saveKey || KEY);
  if(!r.allowSave&&!r.committed)assert.equal(v.careerRaw,null,'K_NATIVE_NO_SAVE_BEFORE_REAL_COMMIT');
  v.careerState=parsedSave(v.careerRaw,r.saveKey || KEY);
  if(r.allowSave&&v.careerRaw!==null)r.committed=true;
  const full = { sequence: r.frames.length, label, phase: r.phase, at: performance.now(), writeRequests: writes(r), value: v };
  const raw = Buffer.from(JSON.stringify(full) + '\n'), bytes = gzipSync(raw), file = 'frames/' + r.id + '-' + String(full.sequence).padStart(3, '0') + '.json.gz';
  assert(raw.length <= 44 * 1024 * 1024 && bytes.length <= 12 * 1024 * 1024, 'CM_TEAM_NATIVE_FULL_FRAME_RETENTION');
  fs.writeFileSync(path.join(out, file), bytes, { flag: 'wx' });
  r.frames.push({ sequence: full.sequence, label, phase: r.phase, file, bytes: bytes.length, sha256: sha(bytes), decodedBytes: raw.length, decodedSHA256: sha(raw) });
  return full;
}
function review(v) { return { document: v.value.document, saved: { raw: v.value.careerRaw, state: v.value.careerState }, storage: v.value.local, session: v.value.session, url: v.value.url, writeRequests: v.writeRequests }; }
function sameScreen(a, b) { validateReadonlyReview(review(a), review(b)); assert.deepEqual(b.value.session, a.value.session, 'CM_TEAM_NATIVE_SESSION_HELD'); }function validateFooter(box) {
  const t = box.target, c = box.clip;
  assert(t.width > 0 && t.height > 0 && t.x >= c.x - 1 && t.right <= c.right + 1 && t.y >= c.y - 1 && t.bottom <= c.bottom + 1 && box.points.length === 9 && box.points.every(p => p.inside), 'CM_TEAM_NATIVE_FIXED_FOOTER_WHOLE_VISIBLE');
  assert(box.document.scrollWidth <= box.document.clientWidth + 1, 'No horizontal document overflow');
}
function footerControl(box) {
  const original = JSON.stringify(box), copy = clone(box), bottom = copy.target.bottom; copy.target.bottom = copy.clip.bottom + 2; assert.notEqual(JSON.stringify(copy), original);
  let owned; try { validateFooter(copy); } catch (error) { owned = error; } assert(owned instanceof assert.AssertionError); assert.match(owned.message, /^CM_TEAM_NATIVE_FIXED_FOOTER_WHOLE_VISIBLE/);
  copy.target.bottom = bottom; assert.equal(JSON.stringify(copy), original); assert.equal(JSON.stringify(box), original); return { changed: true, owned: { name: owned.name, message: owned.message }, wholeInverseExact: true, actualHeld: true };
}
async function photo(p, r, label, target = null, fixedFooter = false) {
  const prep = await sample(p, r, label + ' before native photo preparation');
  let geometry = null;
  if (target) { if (!fixedFooter) await prepareControl(p, r, target); await waitForScrollIdle(p); geometry = await cardGeometry(target); if (fixedFooter) { validateFooter(geometry); r.footerControl ??= footerControl(geometry); } else { validateCard(geometry); r.cardControl ??= cardControl(geometry); } }
  const before = await sample(p, r, label + ' photo baseline');
  assert.deepEqual(before.value.local, prep.value.local); assert.deepEqual(before.value.session, prep.value.session); assert.equal(before.value.url, prep.value.url);
  const file = r.id + '-' + label + '.png'; await p.screenshot({ path: path.join(out, file) });
  const after = await sample(p, r, label + ' screenshot return'); sameScreen(before, after); assert.deepEqual(after.value.focus, before.value.focus);
  assert(await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), 'CM_TEAM_NATIVE_NO_HORIZONTAL_OVERFLOW');
  r.photos.push({ file, label, geometry, preparationFrame: prep.sequence, baselineFrame: before.sequence, afterFrame: after.sequence, scope: 'Viewport only, native preparation before fresh screenshot baseline.' }); report.screenshots.push(file);
}function validateAssets(r) {
  assert.deepEqual(r.failures.filter(q => !r.aborts.some(a => a.id === q.id)), [], 'CM_TEAM_NATIVE_UNDECLARED_REQUEST_FAILURE');
  assert(r.assetBodies.some(a => a.path === 'prerender-boot.js'), 'CM_TEAM_NATIVE_BOOT_OBSERVED');
  for (const q of r.requests.filter(q => q.asset && !r.aborts.some(a => a.id === q.id))) assert.equal(r.assetBodies.filter(a => a.id === q.id).length, 1, 'CM_TEAM_NATIVE_BODY_RECEIPT');
  assert.equal(r.assetErrors.length, 0, 'CM_TEAM_NATIVE_BODY_READ_ERROR');
}
function nativeZeroWriteCensus(r){
 for(const q of r.nativeRequests)assert(['GET','HEAD','POST','OPTIONS'].includes(q.method),'K_NATIVE_UNKNOWN_NATIVE_METHOD '+q.method);
 for(const q of r.requests)assert(['GET','HEAD','POST','OPTIONS'].includes(q.method),'K_NATIVE_UNKNOWN_PLAYWRIGHT_METHOD '+q.method);
 assert.deepEqual(r.nativeRequests.filter(q=>!['GET','HEAD','OPTIONS'].includes(q.method)),[],'K_NATIVE_NON_READONLY_NATIVE_METHOD');
 assert.equal(writes(r),0,'CM_TEAM_NATIVE_NO_WRITE_ATTEMPT');
 assert.deepEqual(r.aborts.filter(q=>!['GET','HEAD'].includes(q.method)),[],'K_NATIVE_NON_READONLY_ABORT_METHOD');
 const preflights=r.nativeRequests.filter(q=>q.method==='OPTIONS').map(q=>linkedNativeReadPreflight(r,q));
 return{closed:true,playwrightRequests:r.requests.length,nativeRequests:r.nativeRequests.length,playwrightMethods:r.requests.map(q=>({id:q.id,method:q.method,url:q.url})),nativeMethods:r.nativeRequests.map(q=>({requestId:q.requestId,method:q.method,url:q.url})),nonReadonly:0,rawNativeNonGETHEAD:preflights.length,linkedReadPreflights:preflights,scope:'nonReadonly counts game/provider writes, all0. Raw automatic OPTIONS and actual204 remain visible; no claim that OPTIONS was aborted.'};
}
function nativeMethodCopiedControls(r){
 const original=JSON.stringify(nativeCensusInput(r)),controls=[];
 for(const method of ['PUT','POST']){
  const copy=clone(nativeCensusInput(r)),row=copy.nativeRequests.find(q=>q.method==='GET');assert(row,'K_NATIVE_ACTUAL_NATIVE_GET_FOR_CONTROL');const old=row.method;row.method=method;assert.notEqual(JSON.stringify(copy),original);
  let owned;try{nativeZeroWriteCensus(copy);}catch(error){owned=error;}assert(owned instanceof assert.AssertionError);
  assert.match(owned.message,method==='PUT'?/^K_NATIVE_UNKNOWN_NATIVE_METHOD/:/^K_NATIVE_NON_READONLY_NATIVE_METHOD/);
  row.method=old;assert.equal(JSON.stringify(copy),original);assert.equal(JSON.stringify(nativeCensusInput(r)),original);
  controls.push({method,changed:true,name:owned.name,message:owned.message,wholeInverseExact:true,actualHeld:true});
 }
 return controls;
}
function readPreflightCopiedControls(r){
 const original=JSON.stringify(nativeCensusInput(r)),actual=r.nativeRequests.find(row=>row.method==='OPTIONS');
 if(!actual)return{status:'NO_ACTUAL_READ_PREFLIGHT_NO_CONTROL_CREDIT',actualHeld:true,controls:[]};
 const controls=[];
 for(const kind of ['parent-id','parent-method','body','source-body']){
  const copy=clone(nativeCensusInput(r)),row=copy.nativeRequests.find(value=>value.requestId===actual.requestId);
  let target,key,old,marker=/^K_NATIVE_READ_PREFLIGHT/;
  if(kind==='parent-id'){target=row.initiator;key='requestId';}
  else if(kind==='parent-method'){target=copy.nativeRequests.find(value=>value.requestId===row.initiator.requestId);key='method';}
  else if(kind==='body'){target=row;key='postData';}
  else{const parent=copy.nativeRequests.find(value=>value.requestId===row.initiator.requestId),frames=[];const walk=stack=>{if(!stack)return;frames.push(...(stack.callFrames??[]));walk(stack.parent);};walk(parent.initiator.stack);target=copy.assetBodies.find(value=>value.url===frames.find(frame=>frame.url).url);assert(target);key='sha256';marker=/^K_NATIVE_READ_PREFLIGHT_SOURCE_BODY/;}
  old=target[key];const before=clone(target);target[key]=kind==='parent-method'?'POST':kind==='body'?'copied unexpected preflight body':kind==='source-body'?'0'.repeat(64):old+'-copied-missing-parent';
  const fault=clone(target);assert.notEqual(JSON.stringify(copy),original);let owned;
  try{linkedNativeReadPreflight(copy,row);}catch(error){owned=error;}
  assert(owned instanceof assert.AssertionError);assert.match(owned.message,marker);
  target[key]=old;assert.equal(JSON.stringify(copy),original);linkedNativeReadPreflight(copy,row);assert.equal(JSON.stringify(nativeCensusInput(r)),original);
  controls.push({kind,before,fault,restored:clone(target),changed:true,owned:{name:owned.name,message:owned.message},wholeInverseExact:true,actualHeld:true});
 }
 return{status:'ACTUAL_LINKED_READ_PREFLIGHT_CONTROLS_PASSED',actualNativeRequestId:actual.requestId,controls,actualHeld:true};
}
function assetControls(r) {
 const original=JSON.stringify(r),copy=clone(r),at=copy.assetBodies.findIndex(row=>row.path!=='prerender-boot.js');assert(at>=0,'Actual non-boot body exists for control');const[removed]=copy.assetBodies.splice(at,1);assert.notEqual(JSON.stringify(copy),original);let error;try{validateAssets(copy);}catch(found){error=found;}
 assert(error instanceof assert.AssertionError);assert.match(error.message,/^CM_TEAM_NATIVE_BODY_RECEIPT/);copy.assetBodies.splice(at,0,removed);assert.equal(JSON.stringify(copy),original);assert.equal(JSON.stringify(r),original);return{omitted:removed,owned:{name:error.name,message:error.message},changed:true,wholeInverseExact:true,actualHeld:true};
}
const photoLabels={'create-2010':['created-2010'],'create-2015':['created-2015'],'fixture-2010':['entry-mbappe','entry-haaland','entry-bellingham','reloaded-2020'],'fixture-2015':['entry-haaland','entry-bellingham','reloaded-2020']};
function validatePhotoCensus(r){assert.deepEqual(r.photos.map(row=>row.label),photoLabels[r.flow],'SC_LATER_NATIVE_COMPLETE_ORDINARY_PHOTOS');}
function validateDocuments(r){
 const requests=r.documentRequests,seen=new Set();assert(requests.length>0,'K_NATIVE_MAIN_DOCUMENT_GETS');
 for(const q of requests){assert(!seen.has(q.id),'K_NATIVE_UNIQUE_DOCUMENT_ID');seen.add(q.id);const rows=r.documentBodies.filter(b=>b.id===q.id);assert.equal(rows.length,1,'K_NATIVE_MAIN_DOCUMENT_BODY');assert.equal(rows[0].url,q.url);assert.equal(rows[0].status,200);const reference=refs.get(rows[0].path);assert(reference);assert.equal(rows[0].bytes,reference.bytes);assert.equal(rows[0].sha256,reference.sha256);}
 assert(r.documentBodies.every(row=>seen.has(row.id)),'K_NATIVE_NO_EXTRA_DOCUMENT_BODY');
}
function documentControl(r){
 const before=JSON.stringify(r),copy=clone(r),body=copy.documentBodies.shift();assert(body);assert.notEqual(JSON.stringify(copy),before);let error;try{validateDocuments(copy);}catch(e){error=e;}assert(error instanceof assert.AssertionError);assert.match(error.message,/^K_NATIVE_MAIN_DOCUMENT_BODY/);copy.documentBodies.unshift(body);assert.equal(JSON.stringify(copy),before);assert.equal(JSON.stringify(r),before);
 return{omitted:body,name:error.name,message:error.message,changed:true,wholeInverseExact:true,actualHeld:true,scope:'Copied actual document response evidence; all raw framenavigated events remain separate.'};
}
async function readBlockReach(p,r,target,anchor){
 assert.equal(await target.count(),1,'Unique actual disclosure target');assert.equal(await anchor.count(),1,'Unique adjacent actual control');
 const before=await sample(p,r,'before read-only disclosure preparation');
 if(r.width<768)await touchReach(p,r,target);else{
  await prepareControl(p,r,anchor);let reached=false;const steps=[];
  for(let i=0;i<24;i++){await waitForScrollIdle(p);const box=await cardGeometry(target);try{validateCard(box);reached=true;break;}catch{}
   const key=box.target.y<box.clip.y+4?'PageUp':'PageDown';await p.keyboard.press(key);steps.push({key,geometry:box});await idle(p);
  }assert(reached,'K_NATIVE_DISCLOSURE_KEYBOARD_REACH');r.actions.push({type:'actual-keyboard-disclosure-reach',steps});
 }
 await waitForScrollIdle(p);const geometry=await cardGeometry(target);validateCard(geometry);const after=await sample(p,r,'after read-only disclosure preparation');assert.equal(after.value.careerRaw,before.value.careerRaw);assert.deepEqual(after.value.careerState,before.value.careerState);assert.deepEqual(after.value.local,before.value.local);assert.deepEqual(after.value.session,before.value.session);assert.equal(after.value.url,before.value.url);return geometry;
}
async function photoBlock(p,r,label,target,anchor){
 const geometry=await readBlockReach(p,r,target,anchor);await photo(p,r,label);assert.deepEqual(await cardGeometry(target),geometry);const actual=r.photos.at(-1);assert.equal(actual.label,label);actual.geometry=geometry;actual.actualDisclosureRead=true;return actual;
}function phoneOpener(p){return p.locator('[data-career-utility="phone"]').and(p.getByRole('button',{name:'Open your phone',exact:true}));}
function registryControl(frame,year,complete){
 const before=JSON.stringify(frame),copy=clone(frame),registry=copy.value.careerState.historicalArrivals;
 registry.startYear=year===2010?2015:2010;
 copy.value.careerRaw=references.codec.serializeSoccerCareerSave(copy.value.careerState);
 copy.value.local[KEY]=copy.value.careerRaw;
 assert.deepEqual(parsedSave(copy.value.careerRaw),copy.value.careerState);
 const fault=JSON.stringify(copy);assert.notEqual(fault,before);
 let owned;try{validateRegistry(copy.value.careerState,year,complete);}catch(error){owned=error;}
 assert(owned instanceof assert.AssertionError);assert.match(owned.message,/^SC_LATER_NATIVE_REGISTRY/);
 registry.startYear=year;copy.value.careerRaw=references.codec.serializeSoccerCareerSave(copy.value.careerState);copy.value.local[KEY]=copy.value.careerRaw;
 assert.equal(JSON.stringify(copy),before);assert.equal(JSON.stringify(frame),before);
 return {before:frame,fault:JSON.parse(fault),restored:copy,changed:true,wholeInverse:true,owned:{name:owned.name,message:owned.message}};
}
async function createLaterCareer(p,r,navigate,drain){
 const year=r.startYear,era=references.eras.find(row=>row.startYear===year),playerName='Native Historical '+year+' Tester';
 const record={startYear:year,era:era.value,steps:[],actualInput:true,naturalBrowserRng:true};r.creation=record;
async function typeInto(p,r,target,value,label){
 await prepareControl(p,r,target);if(r.width<768)await target.tap();
 await p.keyboard.press('ControlOrMeta+A');await p.keyboard.type(value);await p.keyboard.press('Tab');await idle(p);
 r.actions.push({type:'real-text-entry',actor:r.actor,label,value});
}
async function reachNationalityOption(label){
 const measure=()=>label.evaluate(node=>{const option=node.closest('[role="option"]'),viewport=option?.closest('[data-radix-select-viewport]');if(!option||!viewport)throw new Error('Actual nationality option scroll owner missing');const options=[...viewport.querySelectorAll('[role="option"]')];return{optionCount:options.length,targetIndex:options.indexOf(option),scrollTop:viewport.scrollTop,scrollHeight:viewport.scrollHeight,clientHeight:viewport.clientHeight,optionHeight:option.getBoundingClientRect().height};});
 const initial=await measure();assert(initial.optionCount>0&&initial.targetIndex>=0&&initial.clientHeight>48&&initial.scrollHeight>=initial.clientHeight,'K_SC_NATIONALITY_ACTUAL_SCROLL_EXTENT');
 const limit=initial.optionCount+Math.ceil(initial.scrollHeight/initial.clientHeight)+2;
 const run={initial,attemptLimit:limit,samples:[],status:'preparing',scope:'Nationality-option-only real touch preparation. Bound derives from actual DOM option census plus complete scroll pages. Generic20 touch reach and final geometry guard are unchanged.'};
 record.nationalityReach=run;const session=await p.context().newCDPSession(p);
 try{
  for(let attempt=0;attempt<limit;attempt++){
   const box=await targetGeometry(label),before=await measure(),row={attempt,box,before};run.samples.push(row);
   const t=box.target,g=box.clip;if(t.y>=g.y+4&&t.bottom<=g.bottom-4&&t.x>=g.x&&t.right<=Math.min(g.right,r.width)){row.alreadyReached=true;break;}
   assert(g.bottom-g.y>48&&g.right-g.x>48,'A real touch scroll surface is visible');
   const down=t.bottom>g.bottom-4,x=(g.x+g.right)/2,start=down?g.bottom-20:g.y+20;
   const end=down?Math.max(g.y+20,start-Math.min(360,(g.bottom-g.y)*.65)):Math.min(g.bottom-20,start+Math.min(360,(g.bottom-g.y)*.65));
   await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y:start,radiusX:1,radiusY:1,force:1,id:1}]});
   for(let step=1;step<=10;step++){await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:start+(end-start)*step/10,radiusX:1,radiusY:1,force:1,id:1}]});await p.waitForTimeout(25);}
   await p.waitForTimeout(120);await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await idle(p);
   row.after=await measure();row.afterBox=await targetGeometry(label);
  }
 }finally{await session.detach();run.final={box:await targetGeometry(label),scroll:await measure()};run.status='final-geometry-retained';}
 validateTouchGeometry(run.final.box,r.width);run.status='passed';r.touchReachControl??=copiedTouchGeometryControl(run.final.box,r.width);
 r.actions.push({type:'trusted-touch-nationality-scroll-preparation',attempts:run.samples.length,attemptLimit:limit,reached:run.final.box});
}
async function selectOption(p,r,index,text){
 const trigger=p.getByRole('combobox').nth(index);await press(p,r,trigger,'Open actual creation picker '+index);
 const list=p.getByRole('listbox');await list.waitFor({state:'visible'});assert.equal(await list.count(),1);
 const target=list.getByRole('option',index===0?{name:/^England(?:\s+England)?$/}:{name:text,exact:true});await target.waitFor({state:'visible'});assert.equal(await target.count(),1);
 if(r.width<768){const label=target.locator(':scope > span').last();assert.equal(await label.count(),1);assert((await label.innerText()).includes(text));if(index===0)await reachNationalityOption(label);else await touchReach(p,r,label);await label.tap();}
 else{const wanted=await target.evaluate(n=>[...n.closest('[role="listbox"]').querySelectorAll('[role="option"]')].indexOf(n));assert(wanted>=0);await p.keyboard.press('Home');await idle(p);for(let i=0;i<wanted;i++){await p.keyboard.press('ArrowDown');await idle(p);}await p.waitForFunction(n=>n===document.activeElement||n.contains(document.activeElement),await target.elementHandle());await p.keyboard.press('Enter');}
 await idle(p);assert((await trigger.innerText()).includes(text));r.actions.push({type:'real-select',actor:r.actor,index,text});
}


 async function noSave(label){await drain();const f=await sample(p,r,label);assert.equal(f.value.careerRaw,null,'SC_LATER_NATIVE_CREATION_NO_EARLY_SAVE');record.steps.push({label,frame:f.sequence});return f;}
 await navigate('/soccer-career');await noSave('fresh empty creation');
 await typeInto(p,r,p.getByPlaceholder('Enter your player name...'),playerName,'Actual player name');await noSave('name entered');
 await selectOption(p,r,0,'England');await noSave('England selected');
 await selectOption(p,r,1,'Central Mid (CM)');await noSave('CM selected');
 await selectOption(p,r,2,era.label);await noSave('actual era selected');
 await press(p,r,p.getByRole('button',{name:/Generate Starting Potential|Roll again/}),'One natural starting roll');
 const customize=p.getByRole('button',{name:/Customize your build/});await customize.waitFor({state:'visible'});await noSave('natural roll settled');
 await press(p,r,customize,'Actual build editor');
 const overall=p.getByRole('textbox',{name:'Starting overall',exact:true});await overall.waitFor({state:'visible'});
 let value=Number(await overall.inputValue());assert(Number.isInteger(value)&&value>=40&&value<=99);record.naturalRolledOverall=value;
 for(let count=0;value!==70;count++){
  assert(count<60,'Source-bounded overall step count');
  const delta=value>70?(value-70>=5?-5:-1):(70-value>=5?5:1),direction=delta<0?'down':'up',size=Math.abs(delta);
  await press(p,r,p.getByRole('button',{name:'Starting overall '+direction+' '+size,exact:true}),'Actual Starting overall '+direction+' '+size);
  const next=Number(await overall.inputValue());assert.equal(next,value+delta,'SC_LATER_NATIVE_ACTUAL_STEPPER');
  await noSave('overall step '+count);value=next;
 }
 assert.equal(await overall.inputValue(),'70');
 await press(p,r,p.getByRole('button',{name:/Lock in build/}),'Lock actual build at 70');
 const begin=p.getByRole('button',{name:/Begin Career/});await begin.waitFor({state:'visible'});
 await p.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>/Begin Career/.test(b.textContent)&&!b.disabled));
 const stats=p.getByRole('heading',{name:'Starting Stats',exact:true}).locator('..');
 assert.equal((await stats.locator(':scope > span').innerText()).trim(),'70','SC_LATER_NATIVE_LOCKED_OVERALL');
 await noSave('locked 70 before real Begin');
 r.allowSave=true;await press(p,r,begin,'Actual Begin Career');
 await p.waitForFunction(key=>localStorage.getItem(key)!==null,KEY);await phoneOpener(p).waitFor({state:'visible'});await idle(p);await drain();
 const created=await sample(p,r,'genuine youth career committed'),state=created.value.careerState;
 r.allowSave=false;
 assert.equal(state.playerName,playerName);assert.equal(state.nationality,'England');assert.equal(state.position,'CM');assert.equal(state.era,era.value);
 assert.equal(state.phase,'youth');assert.equal(state.overall,70);assert.equal(state.seasons.length,1);validateRegistry(state,year,false);
 assert.equal(created.value.local[KEY],created.value.careerRaw);
 record.created={frame:created.sequence,academy:state.academyClubName,rawSHA256:sha(Buffer.from(created.value.careerRaw)),registry:state.historicalArrivals};
 const fault=registryControl(created,year,false),file='input/'+r.id+'-registry-control.json';write(file,fault);record.registryControl={file,changed:fault.changed,wholeInverse:fault.wholeInverse,owned:fault.owned};
 const youth=p.locator('div.bg-card.border.border-border.rounded-xl.p-4.flex.items-center.gap-4').filter({has:p.getByText('Youth Academy',{exact:true})});await youth.waitFor({state:'visible'});
 await photoBlock(p,r,'created-'+year,youth,phoneOpener(p));
 const after=await sample(p,r,'creation photo and full committed save held');assert.equal(after.value.careerRaw,created.value.careerRaw);assert.deepEqual(after.value.careerState,state);
 assert.equal(r.documentRequests.length,1,'SC_LATER_NATIVE_CREATION_DOCUMENT_CENSUS');record.status='passed';
}
async function beginWatch(p) {
  return p.evaluate(() => {
    const trace = window.__cmNativeTrace; assertTrace(trace);
    function assertTrace(v) { if (!v || v.watching) throw Error('CM_TEAM_NATIVE_TRACE_SETUP'); }
    trace.watching = true; trace.current = [];
    const read = () => { if (!trace.watching) return; const a = document.activeElement; trace.current.push({ sequence: trace.current.length, at: performance.now(), document: { x: scrollX, y: scrollY }, focus: a ? { tag: a.tagName, id: a.id, name: a.getAttribute('aria-label'), text: a.textContent?.trim().slice(0, 100) } : null, url: location.href, local: JSON.stringify(Object.fromEntries(Object.keys(localStorage).sort().map(k => [k, localStorage.getItem(k)]))), session: JSON.stringify(Object.fromEntries(Object.keys(sessionStorage).sort().map(k => [k, sessionStorage.getItem(k)]))) }); if (trace.current.length > 900) { trace.overflow = true; trace.watching = false; return; } requestAnimationFrame(read); };
    read(); return trace.events.length;
  });
}
async function endWatch(p, r, label, startEvent) {
  const t = await p.evaluate(() => { const t = window.__cmNativeTrace; t.watching = false; return { frames: t.current, events: t.events, overflow: t.overflow }; });
  assert.equal(t.overflow, false, 'CM_TEAM_NATIVE_TRACE_BOUND'); assert(t.frames.length >= 1);
  const value = { label, firstSequence: 0, lastSequence: t.frames.length - 1, frames: t.frames, events: t.events.slice(startEvent) };
  r.traces.push(value); return value;
}
function validateTrace(value, before, focusHeld) {
  assert.equal(value.frames.length, value.lastSequence - value.firstSequence + 1, 'CM_TEAM_NATIVE_TRACE_COMPLETE');
  for (let i = 0; i < value.frames.length; i++) {
    const f = value.frames[i]; assert.equal(f.sequence, value.firstSequence + i, 'CM_TEAM_NATIVE_TRACE_COMPLETE');
    assert.deepEqual(f.document, before.value.document, 'CM_TEAM_NATIVE_EARLY_DOCUMENT');
    assert.equal(f.url, before.value.url); assert.equal(f.local, JSON.stringify(before.value.local), 'CM_TEAM_NATIVE_EARLY_STORAGE');
    assert.equal(f.session, JSON.stringify(before.value.session), 'CM_TEAM_NATIVE_EARLY_SESSION');
    if (focusHeld) assert.deepEqual(f.focus, before.value.focus, 'CM_TEAM_NATIVE_ARRIVAL_FOCUS');
  }
}
function traceOmissionControl(value, before) {
  const original = JSON.stringify(value), copy = clone(value); assert(copy.frames.length > 1);
  const [removed] = copy.frames.splice(1, 1); assert.notEqual(JSON.stringify(copy), original);
  let owned; try { validateTrace(copy, before, true); } catch (e) { owned = e; }
  assert(owned instanceof assert.AssertionError); assert.match(owned.message, /^CM_TEAM_NATIVE_TRACE_COMPLETE/);
  copy.frames.splice(1, 0, removed); assert.equal(JSON.stringify(copy), original); assert.equal(JSON.stringify(value), original);
  return { changed: true, omittedSequence: removed.sequence, owned: { name: owned.name, message: owned.message }, wholeInverseExact: true, actualHeld: true };
}

async function readOnlyAction(p,r,target,label,ready,drain){
 await prepareControl(p,r,target);
 const before=await sample(p,r,label+' baseline'),start=await beginWatch(p);
 await pressPrepared(p,r,target,label);
 const immediate=await sample(p,r,label+' immediate');
 await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(resolve)));const raf1=await sample(p,r,label+' rAF1');
 await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(resolve)));const raf2=await sample(p,r,label+' rAF2');
 await ready();await idle(p);await drain();
 const after=await sample(p,r,label+' settled'),trace=await endWatch(p,r,label,start);
 for(const value of [immediate,raf1,raf2,after])sameScreen(before,value);
 validateTrace(trace,before,false);r.traceControl??=traceOmissionControl(trace,before);
 r.readOnlyActions.push({label,before:before.sequence,immediate:immediate.sequence,raf1:raf1.sequence,raf2:raf2.sequence,after:after.sequence,trace:r.traces.length-1});
 return after;
}
function validateCards(actual,state,year){
 const expected=validateRegistry(state,year,true);
 assert.equal(actual.length,expected.length,'SC_LATER_NATIVE_ARRIVAL_CARD_ASSOCIATION');
 for(let i=0;i<expected.length;i++){
  const entry=expected[i],card=actual[i],world=state.phone?.clubs?.[entry.name];
  assert.equal(world,entry.entryClub,'SC_LATER_NATIVE_ARRIVAL_CARD_ASSOCIATION');
  assert.equal(card.paragraphs.length,4,'SC_LATER_NATIVE_ARRIVAL_CARD_ASSOCIATION');
  assert.deepEqual(card.paragraphs.slice(0,3),[entry.name,'First-team entry: '+entry.entryYear+' at '+entry.entryClub+'.','Career world: '+world+'. This club belongs to your save. Development and results are simulated.'],'SC_LATER_NATIVE_ARRIVAL_CARD_ASSOCIATION');
  assert.deepEqual(card.links,references.links[entry.id],'SC_LATER_NATIVE_ARRIVAL_CARD_ASSOCIATION');
 }
 return expected.map(({id,name,entryYear,entryClub})=>({id,name,entryYear,entryClub,worldClub:state.phone.clubs[name]}));
}
function cardAssociationControl(cards,state,year){
 const before=JSON.stringify(cards),copy=clone(cards),world=copy[0].paragraphs[2];
 copy[0].paragraphs[2]='Career world: copied incorrect association.';
 const fault=JSON.stringify(copy);assert.notEqual(fault,before);
 let owned;try{validateCards(copy,state,year);}catch(error){owned=error;}
 assert(owned instanceof assert.AssertionError);assert.match(owned.message,/^SC_LATER_NATIVE_ARRIVAL_CARD_ASSOCIATION/);
 copy[0].paragraphs[2]=world;assert.equal(JSON.stringify(copy),before);assert.equal(JSON.stringify(cards),before);
 return {before:cards,fault:JSON.parse(fault),restored:copy,changed:true,wholeInverse:true,owned:{name:owned.name,message:owned.message}};
}
async function readLaterFixture(p,r,navigate,drain){
 const year=r.startYear,{pin,raw,state}=fixtures.get(year),fence='dukb-fence:'+KEY;
 const dialog=p.getByRole('dialog',{name:'Your phone',exact:true}),region=dialog.getByRole('region',{name:'Real player arrivals',exact:true});
 const feed=dialog.locator('button[data-phone-app="news"]').and(dialog.getByRole('button',{name:/SportsFeed/}));
 const back=dialog.locator('button[data-phone-back]').and(dialog.getByRole('button',{name:/Home/}));
 const close=dialog.getByRole('button',{name:'Put phone away',exact:true});
 const record={startYear:year,fixture:pin,source:'Complete admitted React UI qualification save',documentLoads:[],cards:[]};r.fixtureReadout=record;
 assert.deepEqual(r.fixtureContextStorage,{kind:'playwright-context-storage-state',rawSHA256:pin.rawSHA256,rawBytes:pin.rawBytes,initialFence:'5',noNavigationScript:true});
 record.preload=r.fixtureContextStorage;
 r.allowSave=true;
 await navigate('/soccer-career');
 assert.equal(r.documentRequests.length,1,'SC_LATER_NATIVE_INITIAL_FIXTURE_DOCUMENT_CENSUS');
 async function loaded(label,expectedFence){
  await phoneOpener(p).waitFor({state:'visible'});
  await p.waitForFunction(({fence,expectedFence})=>localStorage.getItem(fence)===expectedFence,{fence,expectedFence});
  await idle(p);await drain();
  const frame=await sample(p,r,label);
  assert.equal(frame.value.careerRaw,raw,'SC_LATER_NATIVE_ADMITTED_RAW_EXACT');
  assert.deepEqual(frame.value.careerState,state);assert.equal(frame.value.local[KEY],raw);
  assert.equal(frame.value.local[fence],expectedFence,'SC_LATER_NATIVE_SOURCE_OWNED_FENCE');
  validateRegistry(frame.value.careerState,year,true);record.documentLoads.push({frame:frame.sequence,fence:expectedFence,rawSHA256:pin.rawSHA256});
  r.allowSave=false;return frame;
 }
 const first=await loaded('complete admitted 2020 save loaded','6');
 async function openFeed(){
  await readOnlyAction(p,r,phoneOpener(p),'Open phone',()=>feed.waitFor({state:'visible'}),drain);
  await readOnlyAction(p,r,feed,'Open SportsFeed',()=>region.waitFor({state:'visible'}),drain);
 }
 async function cards(label){
  assert.equal(await region.count(),1,'SC_LATER_NATIVE_ARRIVAL_REGION_OWNER');
  const rows=await region.evaluate(section=>[...section.children].map(card=>({html:card.outerHTML,paragraphs:[...card.querySelectorAll(':scope > p')].map(node=>node.textContent),links:[...card.querySelectorAll('a')].map(node=>[node.getAttribute('href'),node.textContent])})));
  const cells=validateCards(rows,state,year),frame=await sample(p,r,label);assert.equal(frame.value.careerRaw,raw);
  record.cards.push({label,frame:frame.sequence,cells,rows});return{rows,cells};
 }
 await openFeed();
 const initial=await cards('initial five-cell subset for this start');
 const fault=cardAssociationControl(initial.rows,state,year),file='input/'+r.id+'-card-control.json';write(file,fault);record.cardControl={file,changed:fault.changed,wholeInverse:fault.wholeInverse,owned:fault.owned};
 for(const cell of initial.cells){
  const card=region.getByText(cell.name,{exact:true}).locator('..');
  const shot=await photoBlock(p,r,'entry-'+cell.id.split(':')[1],card,back);
  record.photos??=[];record.photos.push({id:cell.id,photo:shot.file,geometry:shot.geometry});
 }
 await readOnlyAction(p,r,back,'SportsFeed Home',()=>feed.waitFor({state:'visible'}),drain);
 await readOnlyAction(p,r,feed,'Reopen SportsFeed',()=>region.waitFor({state:'visible'}),drain);
 assert.deepEqual((await cards('reopened SportsFeed')).rows,initial.rows);
 await readOnlyAction(p,r,close,'Put phone away',()=>dialog.waitFor({state:'hidden'}),drain);
 const before=await sample(p,r,'full state before actual document reload');
 assert.equal(before.value.careerRaw,first.value.careerRaw);assert.deepEqual(before.value.careerState,first.value.careerState);assert.deepEqual(before.value.local,first.value.local);assert.deepEqual(before.value.session,first.value.session);assert.equal(before.value.url,first.value.url);assert.equal(before.writeRequests,first.writeRequests);
 await drain();r.phase=r.flow+'-actual-document-reload';r.allowSave=true;
 const response=await p.reload({waitUntil:'load'});assert.equal(response.status(),200);
 const after=await loaded('complete save after actual document reload','7');
 assert.equal(r.documentRequests.length,2,'SC_LATER_NATIVE_EXACT_ONE_RELOAD');
 assert.deepEqual(after.value.local,{...before.value.local,[fence]:'7'},'SC_LATER_NATIVE_RELOAD_ONLY_FENCE');
 assert.deepEqual(after.value.session,before.value.session);assert.equal(after.value.url,before.value.url);assert.equal(after.writeRequests,before.writeRequests);
 await openFeed();
 assert.deepEqual((await cards('complete associations after reload')).rows,initial.rows);
 await photo(p,r,'reloaded-2020');
 const final=await sample(p,r,'reloaded overview complete');assert.equal(final.value.careerRaw,raw);assert.deepEqual(final.value.careerState,state);
 assert.deepEqual(final.value.local,after.value.local);assert.deepEqual(final.value.session,after.value.session);record.status='passed';
}
const browser=await chromium.launch({headless:true});
async function journey(flow,startYear){
 const width=390;
 const r={id:'sc-later-'+flow,flow,startYear,readOnlyActions:[],saveKey:KEY,allowSave:false,width,height:844,actor:'touch',status:'incomplete',phase:'initial',actions:[],frames:[],traces:[],photos:[],requests:[],responses:[],failures:[],aborts:[],assetBodies:[],assetErrors:[],console:[],pageErrors:[],navigations:[],documentRequests:[],documentBodies:[],nativeRequests:[],nativeEvents:[],inputEvents:[]};report.contexts.push(r);
 const fixture=flow==='fixture-'+startYear?fixtures.get(startYear):null;
 const fence='dukb-fence:'+KEY;
 const initialStorage=fixture?{cookies:[],origins:[{origin,localStorage:[{name:KEY,value:fixture.raw},{name:fence,value:'5'}]}]}:undefined;
 const c=await browser.newContext({viewport:{width,height:r.height},deviceScaleFactor:1,isMobile:width<768,hasTouch:width<768,serviceWorkers:'block',storageState:initialStorage});
 if(fixture){
   const held=await c.storageState();
   assert.deepEqual(held.cookies,[]);
   assert.deepEqual(held.origins.map(row=>row.origin),[origin],'SC_LATER_NATIVE_FIXTURE_CONTEXT_ORIGIN');
   const local=Object.fromEntries(held.origins[0].localStorage.map(row=>[row.name,row.value]));
   assert.deepEqual(local,{[KEY]:fixture.raw,[fence]:'5'},'SC_LATER_NATIVE_FIXTURE_CONTEXT_STORAGE');
   r.fixtureContextStorage={kind:'playwright-context-storage-state',rawSHA256:sha(local[KEY]),rawBytes:Buffer.byteLength(local[KEY]),initialFence:local[fence],noNavigationScript:true};
 }
 const p=await c.newPage();p.setDefaultTimeout(15000);p.setDefaultNavigationTimeout(30000);
 const ids=new WeakMap();let nextId=0,lastAsset=Date.now();const activeAssets=new Set(),reads=new Set(),nativeSession=await c.newCDPSession(p),id=q=>{if(!ids.has(q))ids.set(q,++nextId);return ids.get(q);};
 const isAsset=url=>{const u=new URL(url);return u.origin===origin&&(u.pathname.startsWith('/assets/')||u.pathname==='/prerender-boot.js');};
 async function drain(){const deadline=Date.now()+20000;while(activeAssets.size||reads.size||Date.now()-lastAsset<100){assert(Date.now()<deadline,'CM_TEAM_NATIVE_ASSET_DRAIN');await p.waitForTimeout(25);}assert.equal(r.assetErrors.length,0,'CM_TEAM_NATIVE_ASSET_READ');}
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
  await p.exposeBinding('__cmNativeEvent', ({ frame }, event) => { r.inputEvents.push({ ...event, frameURL: frame.url(), phase: r.phase }); });
  await c.addInitScript(() => {
    const t = { events: [], current: [], watching: false, overflow: false }; window.__cmNativeTrace = t;
    for (const type of ['pointerdown', 'touchstart', 'click', 'keydown', 'focusin', 'scroll']) addEventListener(type, event => { const n = event.target; const row = { type, trusted: event.isTrusted, key: event.key ?? null, at: performance.now(), target: n instanceof Element ? { tag: n.tagName, id: n.id, text: n.textContent?.trim().slice(0, 100) } : null }; t.events.push(row); void window.__cmNativeEvent(row); if (t.events.length > 5000) t.overflow = true; }, true);
  });
  await c.route('**/*',async route=>{const q=route.request(),u=new URL(q.url());if(u.origin!==origin||!['GET','HEAD'].includes(q.method())){r.aborts.push({id:id(q),url:q.url(),origin:u.origin,method:q.method(),postData:q.postData(),reason:'existing offline policy',phase:r.phase});return route.abort('blockedbyclient');}return route.continue();});
  await c.routeWebSocket('**/*',async socket=>{r.aborts.push({id:'ws',url:socket.url(),origin:new URL(socket.url()).origin,method:'WEBSOCKET',reason:'existing offline policy',phase:r.phase});await socket.close({code:1008,reason:'Source-bound QA'});});
  p.on('request', q => { const row={ id: id(q), url: q.url(), method: q.method(), postData:q.postData(), resourceType: q.resourceType(), phase: r.phase, asset: isAsset(q.url()), at: performance.now() }; r.requests.push(row);if(q.resourceType()==='document'&&q.isNavigationRequest()&&q.frame()===p.mainFrame()){assert.equal(q.method(),'GET');r.documentRequests.push({...row,mainDocument:true});} if (isAsset(q.url())) { activeAssets.add(q); lastAsset = Date.now(); } });
  const finished = q => { if (activeAssets.delete(q)) lastAsset = Date.now(); };
  p.on('requestfinished', finished); p.on('requestfailed', q => { r.failures.push({ id: id(q), url: q.url(), error: q.failure(), phase: r.phase }); finished(q); });
  p.on('response', response => {
    const q = response.request(), u = new URL(response.url()); r.responses.push({ id: id(q), url: response.url(), status: response.status(), phase: r.phase });
    if(q.resourceType()==='document'&&q.isNavigationRequest()&&q.frame()===p.mainFrame()){
      const work=(async()=>{assert.equal(response.status(),200);const pathname=new URL(response.url()).pathname,rel=pathname==='/'?'index.html':pathname.replace(/^\//,'').replace(/\/$/,'')+'/index.html',reference=refs.get(rel);assert(reference,'Actual document belongs to admitted fixed dist');const bytes=await response.body();assert.equal(bytes.length,reference.bytes);assert.equal(sha(bytes),reference.sha256);const file='bodies/'+sha(bytes)+'.html';if(!fs.existsSync(path.join(out,file)))fs.writeFileSync(path.join(out,file),bytes,{flag:'wx'});else assert(fs.readFileSync(path.join(out,file)).equals(bytes));r.documentBodies.push({id:id(q),url:response.url(),status:response.status(),path:rel,file,bytes:bytes.length,sha256:sha(bytes),phase:r.phase});})().catch(error=>r.assetErrors.push({url:response.url(),message:String(error.stack||error),phase:r.phase}));
      reads.add(work);void work.finally(()=>{reads.delete(work);lastAsset=Date.now();});
    }
    if (!isAsset(response.url())) return;
    const work = (async () => {
      const rel = decodeURIComponent(u.pathname.slice(1)), ref = refs.get(rel); assert(ref, 'Unknown completed asset ' + rel); assert.equal(response.status(), 200);
      const bytes = await response.body(); assert.equal(bytes.length, ref.bytes); assert.equal(sha(bytes), ref.sha256);
      const expected = fs.readFileSync(path.join(dist, rel)); assert(bytes.equals(expected), 'actual served body differs from completed dist');
      const file = 'bodies/' + sha(bytes) + path.extname(rel);
      if (!observed.has(rel)) { if (!fs.existsSync(path.join(out, file))) fs.writeFileSync(path.join(out, file), bytes, { flag: 'wx' }); else assert(fs.readFileSync(path.join(out, file)).equals(bytes)); observed.set(rel, ref.sha256); } else assert.equal(observed.get(rel), ref.sha256);
      r.assetBodies.push({ id: id(q), path: rel, url: response.url(), status: response.status(), file, bytes: bytes.length, sha256: sha(bytes), gzipBytes: gzipSync(bytes).length, phase: r.phase });
    })().catch(e => r.assetErrors.push({ url: response.url(), message: String(e.stack || e), phase: r.phase }));
    reads.add(work); void work.finally(() => { reads.delete(work); lastAsset = Date.now(); });
  });
  p.on('console', e => r.console.push({ type: e.type(), text: e.text(), location: e.location(), phase: r.phase }));
  p.on('pageerror', e => r.pageErrors.push({ name: e.name, message: e.message, stack: e.stack, phase: r.phase }));
  p.on('framenavigated', f => { if (f === p.mainFrame()) r.navigations.push({ url: f.url(), phase: r.phase, at: performance.now() }); });
  async function navigate(route='/soccer-career') {
    await drain();
    const response = await p.goto(base + route, { waitUntil: 'load' }); assert.equal(response.status(), 200);
    const bytes = await response.body(), reference = fs.readFileSync(path.join(dist, route.replace(/^\//,'')+'/index.html')); assert(bytes.equals(reference), 'Actual completed route HTML');
    const file = 'bodies/' + sha(bytes) + '.html'; if (!fs.existsSync(path.join(out, file))) fs.writeFileSync(path.join(out, file), bytes, { flag: 'wx' });
    r.actions.push({ type: 'actual-route-document', url: response.url(), file, bytes: bytes.length, sha256: sha(bytes) });
    await p.locator('#dukb-main').waitFor({ state: 'visible' }); await answerConsent(p, { wait: 1000 }); await idle(p); await drain();
    await sample(p, r, 'actual admitted route document ready');
  }
 try{
  r.phase=flow+'-actual-document';
  if(flow==='create-'+startYear)await createLaterCareer(p,r,navigate,drain);
  else{assert.equal(flow,'fixture-'+startYear);await readLaterFixture(p,r,navigate,drain);}
  validatePhotoCensus(r);r.status='passed';
 }catch(error){r.status='failed';r.error={name:error.name,message:error.message,stack:error.stack};try{await sample(p,r,'failure full state');const file=r.id+'-failure.png';await p.screenshot({path:path.join(out,file)});r.failureScreenshot=file;}catch(captureError){r.captureError=String(captureError.stack||captureError);}}
 finally{
  try{await drain();}catch(error){r.assetErrors.push({message:String(error.stack||error),phase:'finally drain'});}
  try{r.finalDOMTrace=await p.evaluate(()=>window.__cmNativeTrace);assert.equal(r.finalDOMTrace.overflow,false);}catch(error){r.status='failed';r.traceError=String(error.stack||error);}
  await c.close();await Promise.all([...reads]);
  try{r.finalNativeCensus=nativeZeroWriteCensus(r);r.methodControls=nativeMethodCopiedControls(r);r.preflightControls=readPreflightCopiedControls(r);validateAssets(r);r.assetControls=assetControls(r);validateDocuments(r);r.documentControl=documentControl(r);
   const expectedResource=e=>/^Failed to load resource: net::ERR_(?:BLOCKED_BY_CLIENT(?:\.Inspector)?|FAILED)$/.test(e.text)&&r.aborts.some(value=>value.url===e.location.url);
   r.expectedConsole=r.console.filter(e=>e.type==='error'&&expectedResource(e));r.unexpectedConsole=r.console.filter(e=>e.type==='error'&&!expectedResource(e));r.unexpectedPageErrors=r.pageErrors.slice();r.unexpectedExternalAborts=r.aborts.filter(row=>row.origin!==origin&&!known.has(row.origin.replace(/^ws/,'http')));r.localHttpErrors=r.responses.filter(row=>new URL(row.url).origin===origin&&row.status>=400);
   assert.equal(r.unexpectedConsole.length,0);assert.equal(r.unexpectedPageErrors.length,0);assert.equal(r.unexpectedExternalAborts.length,0);assert.equal(r.localHttpErrors.length,0);assert(r.inputEvents.length<=15000,'CM_TEAM_NATIVE_EVENT_BOUND');silent();
  }catch(error){r.status='failed';r.classificationError=String(error.stack||error);}
  write('report.json',report);
 }
}
try{for(const year of [2010,2015])await journey('create-'+year,year);for(const year of [2010,2015])await journey('fixture-'+year,year);}
finally{
 try{sourceHeld();assert.deepEqual(inventory(),m.distBefore);for(const {pin,bytes} of fixtures.values())assert(fs.readFileSync(pin.file).equals(bytes));silent();report.sourceHeld=true;report.distHeld=true;report.fixturesHeld=true;}
 catch(error){report.finalHoldError=String(error.stack||error);}
 await browser.close();
 report.status=report.contexts.length===4&&report.screenshots.length===9&&report.contexts.every(row=>row.status==='passed')&&report.sourceHeld&&report.distHeld&&report.fixturesHeld?'passed':'failed';
 write('report.json',report);
}
assert.equal(report.status,'passed','SC_LATER_NATIVE_FOUR_CONTEXTS_AND_NINE_PHOTOS');
console.log('Soccer Career historical native: two genuine 2010/2015 UI starts, two separate admitted 2020 fixture readouts, five complete arrival cards and one reload per fixture.');
