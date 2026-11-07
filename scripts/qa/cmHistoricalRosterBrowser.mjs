import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import ts from 'typescript';
import { chromium } from '../lib/playwrightLoader.mjs';
import { answerConsent } from '../lib/answerConsent.mjs';

assert(process.env.CI, 'Remote CI only');
const arg = name => {
  const at = process.argv.indexOf(name);
  assert(at >= 0 && process.argv[at + 1], name);
  return process.argv[at + 1];
};
const out = path.resolve(arg('--out'));
const manifestPath = path.resolve(arg('--manifest'));
const manifestBytes = fs.readFileSync(manifestPath);
const input = JSON.parse(manifestBytes);
assert.equal(input.schema, 'CM_HISTORICAL_ROSTER_INPUT_V1');
assert.equal(input.status, 'EXACT_BASELINE_AND_CANDIDATE_COMPLETED_DIST_BOUND');
const bases = {baseline: 'http://127.0.0.1:4173', candidate: 'http://127.0.0.1:4174'};
const KEY = 'dukb-club-manager-save';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const clone = value => JSON.parse(JSON.stringify(value));
const receipt = process.env.SIM_OFFLINE_RECEIPT;
function silent() {
  assert(receipt);
  assert.equal(fs.readFileSync(receipt).length, 0, 'CM_ROSTER_NODE_OFFLINE_RECEIPT');
}
silent();
fs.mkdirSync(out);
for (const dir of ['frames', 'bodies']) fs.mkdirSync(path.join(out, dir));
const write = (file, value) => fs.writeFileSync(path.join(out, file), JSON.stringify(value, null, 2) + '\n');
function inventory(root) {
  const rows = [];
  function walk(rel = '') {
    for (const entry of fs.readdirSync(path.join(root, rel), {withFileTypes: true})) {
      const file = path.posix.join(rel, entry.name);
      if (entry.isDirectory()) walk(file);
      else {
        assert(entry.isFile(), 'Ordinary completed dist member');
        const bytes = fs.readFileSync(path.join(root, file));
        rows.push({file, bytes: bytes.length, sha256: sha(bytes)});
      }
    }
  }
  walk();
  return rows.sort((a, b) => a.file < b.file ? -1 : a.file > b.file ? 1 : 0);
}
function inputsHeld() {
  assert(fs.readFileSync(manifestPath).equals(manifestBytes));
  for (const role of Object.values(input.roles)) {
    assert(path.isAbsolute(role.distPath));
    assert.deepEqual(inventory(role.distPath), role.distBefore);
    assert.equal(sha(JSON.stringify(role.distBefore)), role.distDigest);
  }
}
inputsHeld();
const rosterPath = 'src/data/clubManagerEra2010.ts';
const bake = fs.readFileSync(rosterPath);
assert.equal(createHash('sha1').update(Buffer.from('blob ' + bake.length + '\0')).update(bake).digest('hex'), '1f34b2305279348a0b5ba2d5b056aa4ac47499a2');
const ast = ts.createSourceFile(rosterPath, bake.toString('utf8'), ts.ScriptTarget.Latest, true);
assert.deepEqual(ast.parseDiagnostics, []);
const declarations = ast.statements.filter(ts.isVariableStatement).flatMap(statement => [...statement.declarationList.declarations]);
function literal(name, isLiteral) {
  const nodes = declarations.filter(node => ts.isIdentifier(node.name) && node.name.text === name);
  assert.equal(nodes.length, 1, name);
  assert(nodes[0].initializer && isLiteral(nodes[0].initializer), name);
  return nodes[0].initializer;
}
const rosters = literal('ERA2010_ROSTERS', ts.isObjectLiteralExpression);
const partial = literal('ERA2010_PARTIAL', ts.isArrayLiteralExpression).elements.map(node => {
  assert(ts.isStringLiteral(node));
  return node.text;
});
const expected = Object.fromEntries(['Blackpool', 'Arsenal'].map(name => {
  const rows = rosters.properties.filter(node => ts.isPropertyAssignment(node) && ts.isStringLiteral(node.name) && node.name.text === name);
  assert.equal(rows.length, 1, name);
  assert(ts.isArrayLiteralExpression(rows[0].initializer));
  assert(rows[0].initializer.elements.every(ts.isObjectLiteralExpression));
  return [name, {count: rows[0].initializer.elements.length, partial: partial.includes(name)}];
}));
assert.deepEqual(expected, {Blackpool: {count: 6, partial: true}, Arsenal: {count: 35, partial: false}});
fs.writeFileSync(path.join(out, 'clubManagerEra2010.ts'), bake, {flag: 'wx'});
const report = {schema: 'CM_HISTORICAL_ROSTER_BROWSER_V1', status: 'incomplete',
  authority: {manifestSHA256: sha(manifestBytes), rosterBlob: '1f34b2305279348a0b5ba2d5b056aa4ac47499a2',
    roles: Object.fromEntries(Object.entries(input.roles).map(([name, role]) => [name, {product: role.product, distDigest: role.distDigest}]))},
  expected, contexts: [], screenshots: [],
  scope: 'Three fresh signed-out picker contexts. Source rows and era label before taking a job. No roster or save creation, generated coverage or migration claim.'};
let m, origin, dist, refs;
const known = new Set(['https://flagcdn.com', 'https://fonts.googleapis.com', 'https://fonts.gstatic.com', 'https://flawuiqbvjobmkfkauhw.supabase.co']);
const idle = p => p.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const scrollOf = p => p.evaluate(() => ({x: scrollX, y: scrollY}));
async function waitForScrollIdle(page) {
  await page.evaluate(() => new Promise((resolve, reject) => {
    let x = scrollX, y = scrollY, stable = 0, frame, done = false;
    const finish = error => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      cancelAnimationFrame(frame);
      if (error) reject(error); else resolve();
    };
    const timer = setTimeout(() => finish(new Error('NATIVE_SCROLL_PREPARATION_UNSETTLED')), 3000);
    const sample = () => {
      const nextX = scrollX, nextY = scrollY;
      stable = nextX === x && nextY === y ? stable + 1 : 0;
      x = nextX; y = nextY;
      if (stable >= 8) finish(); else frame = requestAnimationFrame(sample);
    };
    frame = requestAnimationFrame(sample);
  }));
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
async function touchReach(p,r,target,measure=()=>targetGeometry(target)){
 assert.equal(await target.count(),1,'Unique touch target');const session=await p.context().newCDPSession(p),samples=[];
 try{for(let attempt=0;attempt<20;attempt++){
  const box=await measure();
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
 const reached=await measure();validateTouchGeometry(reached,r.width);r.touchReachControl??=copiedTouchGeometryControl(reached,r.width);
 r.actions.push({type:'trusted-touch-scroll-preparation',samples,reached});
}
async function cardGeometry(card){return card.evaluate(n=>{const b=n.getBoundingClientRect();let clip={x:0,y:0,right:innerWidth,bottom:innerHeight};for(let a=n.parentElement;a;a=a.parentElement){const s=getComputedStyle(a),q=a.getBoundingClientRect();if(['auto','scroll','hidden','clip'].includes(s.overflowX)){clip.x=Math.max(clip.x,q.x);clip.right=Math.min(clip.right,q.right);}if(['auto','scroll','hidden','clip'].includes(s.overflowY)){clip.y=Math.max(clip.y,q.y);clip.bottom=Math.min(clip.bottom,q.bottom);}}const target={x:b.x,y:b.y,right:b.right,bottom:b.bottom,width:b.width,height:b.height},points=[];for(const x of[b.x+8,(b.x+b.right)/2,b.right-8])for(const y of[b.y+8,(b.y+b.bottom)/2,b.bottom-8]){const hit=document.elementFromPoint(x,y);points.push({x,y,inside:!!hit&&(hit===n||n.contains(hit))});}return{target,clip,points,document:{scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth}};});}
function validateCard(box){const t=box.target,c=box.clip;assert(t.width>0&&t.height>0&&t.x>=c.x&&t.right<=c.right&&t.y>=c.y+4&&t.bottom<=c.bottom-4&&box.points.length===9&&box.points.every(p=>p.inside),'SC_REAL_ENTRY_CARD_WHOLE_VISIBLE');assert(box.document.scrollWidth<=box.document.clientWidth+1,'No horizontal document overflow');}
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

function validateAssets(r) {
  assert.deepEqual(r.failures.filter(q => !r.aborts.some(a => a.id === q.id)), [], 'CM_TEAM_NATIVE_UNDECLARED_REQUEST_FAILURE');
  assert(r.assetBodies.some(a => a.path === 'prerender-boot.js'), 'CM_TEAM_NATIVE_BOOT_OBSERVED');
  for (const q of r.requests.filter(q => q.asset && !r.aborts.some(a => a.id === q.id))) assert.equal(r.assetBodies.filter(a => a.id === q.id).length, 1, 'CM_TEAM_NATIVE_BODY_RECEIPT');
  assert.equal(r.assetErrors.length, 0, 'CM_TEAM_NATIVE_BODY_READ_ERROR');
}

function validateDocuments(r){
 const requests=r.documentRequests,seen=new Set();assert(requests.length>0,'K_NATIVE_MAIN_DOCUMENT_GETS');
 for(const q of requests){assert(!seen.has(q.id),'K_NATIVE_UNIQUE_DOCUMENT_ID');seen.add(q.id);const rows=r.documentBodies.filter(b=>b.id===q.id);assert.equal(rows.length,1,'K_NATIVE_MAIN_DOCUMENT_BODY');assert.equal(rows[0].url,q.url);assert.equal(rows[0].status,200);const reference=refs.get(rows[0].path);assert(reference);assert.equal(rows[0].bytes,reference.bytes);assert.equal(rows[0].sha256,reference.sha256);}
 assert(r.documentBodies.every(row=>seen.has(row.id)),'K_NATIVE_NO_EXTRA_DOCUMENT_BODY');
}


async function sample(p,r,label){
 const value=await p.evaluate(key=>{const a=document.activeElement;return{url:location.href,html:document.documentElement.outerHTML,text:document.body.innerText,document:{x:scrollX,y:scrollY},focus:a?{tag:a.tagName,id:a.id,name:a.getAttribute('aria-label'),text:a.textContent?.trim().slice(0,100)}:null,local:Object.fromEntries(Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)])),session:Object.fromEntries(Object.keys(sessionStorage).sort().map(k=>[k,sessionStorage.getItem(k)])),careerRaw:localStorage.getItem(key)};},KEY);
 value.careerState=value.careerRaw===null?null:JSON.parse(value.careerRaw);
 const full={sequence:r.frames.length,label,phase:r.phase,at:performance.now(),writeRequests:writes(r),value};
 const raw=Buffer.from(JSON.stringify(full)+'\n'),bytes=gzipSync(raw),file='frames/'+r.id+'-'+String(full.sequence).padStart(3,'0')+'.json.gz';
 assert(raw.length<=44*1024*1024&&bytes.length<=12*1024*1024,'CM_MOBILE_FULL_FRAME_RETENTION');fs.writeFileSync(path.join(out,file),bytes,{flag:'wx'});
 r.frames.push({sequence:full.sequence,label,phase:r.phase,file,bytes:bytes.length,sha256:sha(bytes),decodedBytes:raw.length,decodedSHA256:sha(raw)});return full;
}
function sameSelection(a, b) {
  for (const key of ['careerRaw', 'careerState', 'local', 'session', 'url']) {
    assert.deepEqual(b.value[key], a.value[key], 'CM_ROSTER_SELECTION_HELD ' + key);
  }
  assert.equal(b.value.careerRaw, null, 'CM_ROSTER_NO_CAREER_CREATION');
  assert.equal(a.writeRequests, b.writeRequests, 'CM_ROSTER_SELECTION_HELD writes');
}
const job = p => p.getByRole('button', {name: 'Take the job', exact: true});
const teamRows = p => p.locator('[data-cm-board-wants]').locator('xpath=..');
const teamButton = (p, name) => teamRows(p).filter({has: p.getByText(name, {exact: true})});
async function readyTouch(p, r, target) {
  await target.waitFor({state: 'visible'});
  assert.equal(await target.count(), 1, 'Unique actual touch target');
  await waitForScrollIdle(p);
  const take = job(p);
  const count = await take.count();
  assert(count <= 1, 'Unique actual confirmation action');
  const bar = count ? await take.evaluate(n => {
    const f = n.closest('div.fixed');
    if (!f) return null;
    const b = f.getBoundingClientRect();
    return {x: b.x, right: b.right, y: b.y, position: getComputedStyle(f).position};
  }) : null;
  if (count) assert(bar?.position === 'fixed' && bar.x <= 0 && bar.right >= r.width && bar.y > 0);
  await touchReach(p, r, target, bar ? async () => {
    const box = await targetGeometry(target);
    return {...box, clip: {...box.clip, bottom: Math.min(box.clip.bottom, bar.y)}, fixedBar: bar};
  } : undefined);
}
async function tap(p, r, target, label) {
  await readyTouch(p, r, target);
  const at = r.inputEvents.length;
  await target.tap();
  await idle(p);
  assert(r.inputEvents.slice(at).some(e => e.trusted && e.type === 'touchstart'), 'CM_ROSTER_REAL_TOUCH_INPUT');
  r.actions.push({type: 'touch', label});
}
async function readTeamRows(p) {
  return teamRows(p).evaluateAll(buttons => buttons.map(button => {
    const note = node => /players recorded in the .* roster snapshot\.$/.test(node.textContent?.trim() ?? '');
    const name = button.querySelector('span.font-bold.truncate');
    const children = [...button.children];
    return {
      name: name?.textContent?.trim() ?? null,
      selected: button.classList.contains('border-primary'),
      notes: children.filter(note).map(node => node.textContent.trim()),
      unchangedText: children.filter(node => !note(node)).map(node => node.textContent.trim()),
      badges: [...button.querySelectorAll('span[title]')].map(node => ({title: node.title, text: node.textContent.trim()})),
    };
  }));
}
function validateRows(rows, club, text) {
  assert.equal(new Set(rows.map(row => row.name)).size, rows.length, 'CM_ROSTER_UNIQUE_CLUBS');
  assert.deepEqual(rows.filter(row => row.selected).map(row => row.name), club ? [club] : [], 'CM_ROSTER_ACTUAL_SELECTION');
  assert.deepEqual(rows.flatMap(row => row.notes.map(note => [row.name, note])), text ? [[club, text]] : [], 'CM_ROSTER_EXACT_SELECTED_NOTE');
}
function copiedNoteControl(rows, club, text, wrong) {
  const before = JSON.stringify(rows), copy = clone(rows), row = copy.find(value => value.name === club);
  const actual = row.notes;
  row.notes = [wrong];
  const fault = clone(copy);
  assert.notEqual(JSON.stringify(copy), before);
  assert.throws(() => validateRows(copy, club, text), {name: 'AssertionError', message: /^CM_ROSTER_EXACT_SELECTED_NOTE/});
  row.notes = actual;
  assert.equal(JSON.stringify(copy), before);
  assert.equal(JSON.stringify(rows), before);
  return {changed: true, fault, marker: 'CM_ROSTER_EXACT_SELECTED_NOTE', wholeInverseExact: true, actualHeld: true};
}
async function capturePhoto(p, r, label, club, text) {
  const target = teamButton(p, club);
  await readyTouch(p, r, target);
  await waitForScrollIdle(p);
  const geometry = await cardGeometry(target);
  validateCard(geometry);
  const take = await cardGeometry(job(p));
  validateCard(take);
  let noteGeometry = null;
  if (text) {
    const note = target.getByText(text, {exact: true});
    assert.equal(await note.count(), 1);
    noteGeometry = await note.evaluate(node => {
      const range = document.createRange();
      range.selectNodeContents(node);
      const card = node.closest('button').getBoundingClientRect();
      const rects = [...range.getClientRects()].map(b => ({x: b.x, y: b.y, right: b.right, bottom: b.bottom, width: b.width, height: b.height}));
      return {card: {x: card.x, y: card.y, right: card.right, bottom: card.bottom}, rects, text: node.textContent.trim()};
    });
    assert.equal(noteGeometry.text, text);
    const b = noteGeometry.card;
    assert(noteGeometry.rects.length && noteGeometry.rects.every(rect =>
      rect.width > 0 && rect.height > 0 && rect.x >= b.x && rect.right <= b.right &&
      rect.y >= b.y && rect.bottom <= b.bottom), 'CM_ROSTER_FULL_NOTE_WRAP');
  }
  const before = await sample(p, r, label + ' photo baseline');
  const file = r.id + '-' + label + '.png';
  await p.screenshot({path: path.join(out, file)});
  const after = await sample(p, r, label + ' photo return');
  sameSelection(before, after);
  assert.deepEqual(after.value.document, before.value.document);
  assert.deepEqual(after.value.focus, before.value.focus);
  assert.deepEqual(await cardGeometry(target), geometry);
  assert.deepEqual(await cardGeometry(job(p)), take);
  const body = fs.readFileSync(path.join(out, file));
  const photo = {label, file, bytes: body.length, sha256: sha(body), geometry, takeTheJob: take, noteGeometry, before: before.sequence, after: after.sequence};
  r.photos.push(photo);
  report.screenshots.push(photo);
}
async function runPicker(p, r, drain) {
  const current = r.case === 'current';
  const era = current ? '2026-27' : '2010-11';
  const nation = current ? 'South Korea' : 'England';
  const league = current ? 'K League 1' : 'Premier League';
  const enter = text => p.getByText(text, {exact: true}).locator('xpath=ancestor::button[1]');
  const response = await p.goto(origin + '/club-manager', {waitUntil: 'load'});
  assert.equal(response.status(), 200);
  await p.locator('#dukb-main').waitFor({state: 'visible'});
  await answerConsent(p, {wait: 1000});
  await enter(era).waitFor({state: 'visible'});
  await drain();
  const initial = await sample(p, r, 'fresh picker ready');
  assert.equal(initial.value.careerRaw, null);
  r.phase = 'era';
  await tap(p, r, enter(era), era);
  r.phase = 'nation';
  await tap(p, r, p.getByRole('button', {name: new RegExp('^' + nation + '(?:\\s|$)')}), nation);
  r.phase = 'league';
  await tap(p, r, enter(league), league);
  await teamRows(p).first().waitFor({state: 'visible'});
  await drain();
  const unselected = await readTeamRows(p);
  assert.equal(unselected.length, current ? 11 : 20);
  validateRows(unselected, null, null);
  const before = await sample(p, r, 'unselected team rows');
  sameSelection(initial, before);
  const cases = current ? ['Gangwon FC'] : r.role === 'baseline' ? ['Blackpool'] : ['Blackpool', 'Arsenal'];
  r.selections = [];
  for (const club of cases) {
    r.phase = 'team-' + club;
    await tap(p, r, teamButton(p, club), club);
    await job(p).waitFor({state: 'visible'});
    await drain();
    const rows = await readTeamRows(p);
    const text = !current && r.role === 'candidate' ? expected[club].count + ' players recorded in the ' + era + ' roster snapshot.' : null;
    validateRows(rows, club, text);
    const selected = rows.find(row => row.selected);
    assert.equal(selected.badges.some(badge => badge.text === '· partial data'), club === 'Blackpool');
    assert.equal(selected.badges.some(badge => badge.text === '· generated squad'), current);
    const actual = await sample(p, r, club + ' selected');
    sameSelection(before, actual);
    const wrong = text ? (expected[club].count + 1) + text.replace(/^\d+/, '') : '6 players recorded in the 2010-11 roster snapshot.';
    const control = copiedNoteControl(rows, club, text, wrong);
    await capturePhoto(p, r, current ? 'current-generated' : club.toLowerCase(), club, text);
    r.selections.push({club, rows, text, frame: actual.sequence, control});
  }
  await drain();
  sameSelection(initial, await sample(p, r, 'final picker unchanged storage'));
  assert.equal(r.documentRequests.length, 1, 'CM_ROSTER_ONE_ACTUAL_DOCUMENT');
  r.status = 'passed';
}
const browser = await chromium.launch({headless: true});
async function journey(roleName, caseName, width, height) {
  m = input.roles[roleName];
  origin = bases[roleName];
  dist = m.distPath;
  refs = new Map(m.distBefore.map(row => [row.file, row]));
  const r = {id: 'cm-roster-' + roleName + '-' + caseName + '-' + width, role: roleName, case: caseName, width, height,
    status: 'incomplete', phase: 'bootstrap', actions: [], frames: [], photos: [], requests: [], responses: [],
    failures: [], aborts: [], assetBodies: [], assetErrors: [], console: [], pageErrors: [], navigations: [],
    documentRequests: [], documentBodies: [], nativeRequests: [], nativeEvents: [], inputEvents: []};
  report.contexts.push(r);
  const c = await browser.newContext({viewport: {width, height}, deviceScaleFactor: 1, isMobile: true, hasTouch: true, serviceWorkers: 'block'});
  const p = await c.newPage();
  p.setDefaultTimeout(15000);
  p.setDefaultNavigationTimeout(30000);
 const ids=new WeakMap();let nextId=0,lastAsset=Date.now();const observed=new Map(),activeAssets=new Set(),reads=new Set(),nativeSession=await c.newCDPSession(p),id=q=>{if(!ids.has(q))ids.set(q,++nextId);return ids.get(q);};
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

 await p.exposeBinding('__cmMobileEvent',({frame},event)=>r.inputEvents.push({...event,frameURL:frame.url(),phase:r.phase}));
 await c.addInitScript(()=>{const events=[];window.__cmMobileInput=events;for(const type of ['pointerdown','touchstart','click','keydown','focusin','scroll'])addEventListener(type,event=>{const n=event.target,row={type,trusted:event.isTrusted,key:event.key??null,at:performance.now(),target:n instanceof Element?{tag:n.tagName,id:n.id,text:n.textContent?.trim().slice(0,100)}:null};events.push(row);void window.__cmMobileEvent(row);},true);});
 await c.route('**/*',async route=>{const q=route.request(),u=new URL(q.url());if(u.origin!==origin||!['GET','HEAD'].includes(q.method())){r.aborts.push({id:id(q),url:q.url(),origin:u.origin,method:q.method(),reason:'existing offline policy',phase:r.phase});return route.abort('blockedbyclient');}return route.continue();});
 await c.routeWebSocket('**/*',async socket=>{r.aborts.push({id:'ws',url:socket.url(),origin:new URL(socket.url()).origin,method:'WEBSOCKET',reason:'existing offline policy',phase:r.phase});await socket.close({code:1008,reason:'CM completed-dist QA'});});
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

  try {
    await runPicker(p, r, drain);
  } catch (error) {
    r.status = 'failed';
    r.error = {name: error.name, message: error.message, stack: error.stack};
    try {
      await sample(p, r, 'failure full picker state');
      const file = r.id + '-failure.png';
      await p.screenshot({path: path.join(out, file)});
      r.failureScreenshot = file;
    } catch (captureError) { r.captureError = String(captureError.stack || captureError); }
  } finally {
    try { await drain(); } catch (error) {
      r.status = 'failed';
      r.assetErrors.push({phase: 'final drain', message: String(error.stack || error)});
    }
    await c.close();
    await Promise.all([...reads]);
    try {
      r.finalNativeCensus = nativeZeroWriteCensus(r);
      r.nativeMethodControls = nativeMethodCopiedControls(r);
      r.readPreflightControls = readPreflightCopiedControls(r);
      const expectedResource = e => /^Failed to load resource: net::ERR_(?:BLOCKED_BY_CLIENT(?:\.Inspector)?|FAILED)$/.test(e.text) && r.aborts.some(a => a.url === e.location.url);
      r.unexpectedConsole = r.console.filter(e => e.type === 'error' && !expectedResource(e));
      r.unexpectedExternalAborts = r.aborts.filter(a => a.origin !== origin && !known.has(a.origin));
      r.localHttpErrors = r.responses.filter(a => new URL(a.url).origin === origin && a.status >= 400);
      validateAssets(r);
      validateDocuments(r);
      assert(r.inputEvents.length <= 15000);
      assert.deepEqual(r.unexpectedConsole, []);
      assert.deepEqual(r.pageErrors, []);
      assert.deepEqual(r.unexpectedExternalAborts, []);
      assert.deepEqual(r.localHttpErrors, []);
      silent();
      r.protocolHeld = true;
    } catch (error) {
      r.status = 'failed';
      r.classificationError = String(error.stack || error);
    }
    write('report.json', report);
  }
}
try {
  await journey('baseline', 'historical', 390, 844);
  await journey('candidate', 'historical', 320, 900);
  await journey('candidate', 'current', 320, 900);
  assert.deepEqual(report.contexts.map(r => r.status), ['passed', 'passed', 'passed']);
  const [base, hist, current] = report.contexts;
  const withoutNote = rows => rows.map(({notes, ...row}) => row);
  assert.deepEqual(withoutNote(hist.selections[0].rows), withoutNote(base.selections[0].rows), 'CM_ROSTER_BASELINE_TILE_VALUES_HELD');
  assert.deepEqual(base.photos.map(p => p.label), ['blackpool']);
  assert.deepEqual(hist.photos.map(p => p.label), ['blackpool', 'arsenal']);
  assert.deepEqual(current.photos.map(p => p.label), ['current-generated']);
  assert.equal(report.screenshots.length, 4);
  inputsHeld();
  report.status = 'passed';
  report.completeDistInputsHeld = true;
} catch (error) {
  report.status = 'failed';
  report.finalError = {name: error.name, message: error.message, stack: error.stack};
  throw error;
} finally {
  await browser.close();
  write('report.json', report);
}
