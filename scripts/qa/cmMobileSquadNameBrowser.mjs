import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';
import { chromium } from '../lib/playwrightLoader.mjs';

const arg=name=>{const at=process.argv.indexOf(name);assert(at>=0&&process.argv[at+1],name);return process.argv[at+1];};
assert(process.env.CI,'Remote CI only');
const out=path.resolve(arg('--out')),manifestFile=path.resolve(arg('--manifest'));
const bases={baseline:arg('--baseline-url').replace(/\/$/,''),candidate:arg('--candidate-url').replace(/\/$/,'')};
for(const base of Object.values(bases)){const url=new URL(base);assert.equal(url.hostname,'127.0.0.1');assert.equal(url.protocol,'http:');assert.equal(url.pathname,'/');}
assert.notEqual(bases.baseline,bases.candidate,'Separate completed dist servers');
const sha=b=>createHash('sha256').update(b).digest('hex'),blob=b=>createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex'),clone=v=>JSON.parse(JSON.stringify(v));
const receipt=process.env.SIM_OFFLINE_RECEIPT;
function silent(){assert(receipt);assert.equal(fs.readFileSync(receipt).length,0,'CM_MOBILE_NODE_OFFLINE_RECEIPT');}
silent();assert(!fs.existsSync(out)||fs.readdirSync(out).length===0,'Fresh owned output');
for(const dir of ['frames','bodies','input','reference'])fs.mkdirSync(path.join(out,dir),{recursive:true});
const write=(file,value)=>fs.writeFileSync(path.join(out,file),JSON.stringify(value,null,2)+'\n');
const input=JSON.parse(fs.readFileSync(manifestFile,'utf8'));
assert.equal(input.schema,'CM_MOBILE_SQUAD_NAME_SOURCE_DIST_V1');
assert.equal(input.status,'BOTH_COMPLETED_DISTS_AND_AUTHENTIC_NATIVE_FIXTURE_BOUND');
const KEY='dukb-club-manager-save',FENCE='dukb-fence:'+KEY;
const fixed={
 baseline:{commit:'25193b6efbde2e4855c171a91077efd6647d0285',tree:'4debc9eb6ef46e9ace0c43e9a351e61efc6337c3',squad:'b4a61d1683f5df42602d86ed3b1dae19eead86bd'},
 candidate:{commit:'2005eabfa616f1232093851d76618747960c67af',tree:'b1f5ac6efe4d97a1645580c6b473d03616e471b7',squad:'90b29619567c0eca31b4939de622c01c24fc130a'}
};
function sourceFile(role,file){assert.equal(typeof file,'string');assert(file&&!file.startsWith('/')&&!file.split(/[\\/]/).includes('..'),'Relative protected source');const resolved=path.resolve(role.sourceRoot,file);assert(resolved.startsWith(path.resolve(role.sourceRoot)+path.sep),'Source remains inside declared root');assert(fs.lstatSync(resolved).isFile()&&!fs.lstatSync(resolved).isSymbolicLink());return resolved;}
function inventory(root){
 const rows=[];function walk(rel=''){for(const entry of fs.readdirSync(path.join(root,rel),{withFileTypes:true})){const file=path.posix.join(rel,entry.name);assert(!entry.isSymbolicLink(),'No dist links');if(entry.isDirectory())walk(file);else{assert(entry.isFile());const bytes=fs.readFileSync(path.join(root,file));rows.push({file,bytes:bytes.length,sha256:sha(bytes)});}}}walk();return rows.sort((a,b)=>a.file<b.file?-1:a.file>b.file?1:0);
}
function roleHeld(name){
 const role=input[name];assert(role&&path.isAbsolute(role.sourceRoot)&&path.isAbsolute(role.distPath),'Explicit source and dist roots');
 assert.deepEqual(role.product,{commit:fixed[name].commit,tree:fixed[name].tree});
 assert.deepEqual(role.sourceBefore,role.sourceAfter,'Complete source maps held');assert(Object.keys(role.sourceBefore).length>0);
 for(const [file,digest]of Object.entries(role.sourceAfter)){assert.match(digest,/^[a-f0-9]{64}$/);assert.equal(sha(fs.readFileSync(sourceFile(role,file))),digest,file);}
 assert(Array.isArray(role.pins)&&role.pins.length>0);for(const pin of role.pins){assert.match(pin.gitBlob,/^[a-f0-9]{40}$/);assert.equal(blob(fs.readFileSync(sourceFile(role,pin.path))),pin.gitBlob,pin.path);assert(role.sourceAfter[pin.path],'Pinned source belongs to whole map');}
 assert.equal(blob(fs.readFileSync(sourceFile(role,'src/components/club-manager/SquadScreen.tsx'))),fixed[name].squad);
 for(const [file,digest]of Object.entries({
  'src/hooks/useClubManager.ts':'272735868d2ee2038c52cdf03fbd7e6de41148b731c779555df21d4ee799f888',
  'src/lib/saveFence.ts':'75ac3c8cf136acdb2dae50938cac5ffe522e2db7827f59c453b98b67519d6216'
 }))assert.equal(role.sourceAfter[file],digest,'CM_MOBILE_BOOT_SOURCE '+file);
 assert.equal(blob(fs.readFileSync(sourceFile(role,'src/main.tsx'))),'afc04c03d788b698c7a6470812802238d4ece054','Production single mount owner');
 assert.deepEqual(inventory(role.distPath),role.distBefore,'Complete completed dist held');assert.equal(sha(JSON.stringify(role.distBefore)),role.distDigest,'Ordinal dist digest');
 assert(Number.isSafeInteger(role.completedTar.bytes)&&role.completedTar.bytes>0);assert.match(role.completedTar.sha256,/^[a-f0-9]{64}$/);
 assert(role.admissions&&Object.keys(role.admissions).length>0);for(const digest of Object.values(role.admissions))assert.match(digest,/^[a-f0-9]{64}$/);
}
for(const name of ['baseline','candidate'])roleHeld(name);
assert.equal(input.baseline.admissions.build,'34055f96eac95a773f26cb158a01c4fcbf4eb6d7c5295d038f674d1045baa264');
const fixturePin={storedBytes:85954,storedSHA256:'5e84698da5c6d34a04245911c36c537dac5812dcac446e8819af2a21bf24445b',decodedBytes:363866,decodedSHA256:'ddefb474badef0256f1a732eb7c7da059bb96e2ee33c229134242e6714dcee3e',sequence:166,label:'actual K hub after real slot resume',sourceNativeAdmission:'e1a8c8cd7bb546a779caca45e3912691645c24421c0e36efd05aa7e7d522b916'};
assert(path.isAbsolute(input.fixture.file));for(const [key,value]of Object.entries(fixturePin))assert.equal(input.fixture[key],value,'Exact authentic fixture '+key);
const stored=fs.readFileSync(input.fixture.file);assert.equal(stored.length,fixturePin.storedBytes);assert.equal(sha(stored),fixturePin.storedSHA256);
const decoded=gunzipSync(stored);assert.equal(decoded.length,fixturePin.decodedBytes);assert.equal(sha(decoded),fixturePin.decodedSHA256);
const fixture=JSON.parse(decoded);assert.equal(fixture.sequence,166);assert.equal(fixture.label,fixturePin.label);
const original=fixture.value;assert.equal(original.careerRaw.length,57210);assert.deepEqual(JSON.parse(original.careerRaw),original.careerState);assert.equal(original.careerState.clubName,'Gangwon FC');assert.equal(original.careerState.eraId,'now');assert.equal(original.careerState.season,1);assert.equal(Object.keys(original.careerState).length,71);assert.equal(original.careerState.squad.length,16);assert.equal(Object.keys(original.local).length,4);assert.equal(Object.keys(original.session).length,1);assert.equal(original.local[KEY],original.careerRaw);assert.equal(original.local[FENCE],'4');
const players=original.careerState.squad;assert.equal(new Set(players.map(p=>p.id)).size,16);for(const player of players){assert.match(player.id,/^[a-zA-Z0-9_-]+$/);assert.equal(typeof player.name,'string');assert(player.name.length>0);}
fs.writeFileSync(path.join(out,'input','authentic-native-frame.json.gz'),stored,{flag:'wx'});fs.writeFileSync(path.join(out,'input','authentic-native-frame.json'),decoded,{flag:'wx'});
fs.copyFileSync(manifestFile,path.join(out,'input','manifest.json'),fs.constants.COPYFILE_EXCL);
for(const roleName of ['baseline','candidate'])for(const file of ['src/components/club-manager/SquadScreen.tsx','src/hooks/useClubManager.ts','src/lib/saveFence.ts','src/main.tsx']){
 const dest=path.join(out,'reference',roleName,file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(sourceFile(input[roleName],file),dest,fs.constants.COPYFILE_EXCL);
}
const report={schema:'CM_MOBILE_SQUAD_NAME_BROWSER_V1',status:'incomplete',authority:{manifestSHA256:sha(fs.readFileSync(manifestFile)),fixture:clone(input.fixture),roles:Object.fromEntries(['baseline','candidate'].map(name=>[name,{product:input[name].product,distDigest:input[name].distDigest,completedTar:input[name].completedTar,admissions:input[name].admissions}]))},contexts:[],screenshots:[],scope:'One complete authentic already-normalized K save in six fresh local completed-dist contexts. Baseline phone clipping is an owned visibility negative. Candidate phone names must be fully visible. Desktop retains existing truncation semantics and actual baseline readability. One native longest-row detail open/close per context, full labels and saved input held. No generation, model calls, clock/RNG override, public-host or extra-suite claim. Storage hold begins after source-checked boot/Resume and ends at the final live frame; native request collection continues through real context close.'};
let m,origin,dist,refs;
const known=new Set(['https://flagcdn.com','https://fonts.googleapis.com','https://fonts.gstatic.com','https://flawuiqbvjobmkfkauhw.supabase.co']);
const idle=p=>p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
const scrollOf=p=>p.evaluate(()=>({x:scrollX,y:scrollY}));
const active=p=>p.evaluate(()=>{const n=document.activeElement;return n?{tag:n.tagName,id:n.id,name:n.getAttribute('aria-label'),text:n.textContent?.trim().slice(0,100)}:null;});
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

function review(v) { return { document: v.value.document, saved: { raw: v.value.careerRaw, state: v.value.careerState }, storage: v.value.local, session: v.value.session, url: v.value.url, writeRequests: v.writeRequests }; }
function sameScreen(a, b) { validateReadonlyReview(review(a), review(b)); assert.deepEqual(b.value.session, a.value.session, 'CM_TEAM_NATIVE_SESSION_HELD'); }

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
function exactSaved(frame){
 assert.equal(frame.value.careerRaw,original.careerRaw,'CM_MOBILE_AUTHENTIC_SAVED_BYTES');assert.deepEqual(frame.value.careerState,original.careerState,'CM_MOBILE_AUTHENTIC_SAVED_STATE');assert.equal(frame.value.local[KEY],original.careerRaw);assert.equal(frame.writeRequests,0,'CM_MOBILE_ZERO_WRITES');
}
function storageHeld(before,after){
 exactSaved(before);exactSaved(after);assert.deepEqual(after.value.local,before.value.local,'CM_MOBILE_ALL_LOCAL_STORAGE_HELD');assert.deepEqual(after.value.session,before.value.session,'CM_MOBILE_ALL_SESSION_STORAGE_HELD');assert.equal(after.value.url,before.value.url,'CM_MOBILE_URL_HELD');
}
function bootstrapHeld(actual){
 exactSaved(actual);assert.equal(actual.value.url,origin+'/club-manager');
 const expectedLocal={...original.local,[FENCE]:'5'};assert.deepEqual(actual.value.local,expectedLocal,'CM_MOBILE_SOURCE_OWNED_BOOT_FENCE');assert.deepEqual(actual.value.session,original.session,'CM_MOBILE_BOOT_SESSION_HELD');
 return{inputLocal:clone(original.local),inputSession:clone(original.session),expectedLocal,actualLocal:clone(actual.value.local),actualSession:clone(actual.value.session),frame:actual.sequence,careerRawExact:true,careerStateExact:true,sourceOwners:{main:'afc04c03d788b698c7a6470812802238d4ece054',hook:'272735868d2ee2038c52cdf03fbd7e6de41148b731c779555df21d4ee799f888',fence:'75ac3c8cf136acdb2dae50938cac5ffe522e2db7827f59c453b98b67519d6216'},scope:'One production mount without StrictMode, adopted complete normalized save and one career persistence effect. Resume changes phase/tab, not career. Exact4-to5 is confined to this retained bootstrap boundary.'};
}
function copiedBootstrapControl(r,frame){
 const original=JSON.stringify(frame),copy=clone(frame),value=copy.value.local[FENCE];assert.equal(value,'5');copy.value.local[FENCE]='6';assert.notEqual(JSON.stringify(copy),original);
 let error;try{bootstrapHeld(copy);}catch(e){error=e;}assert(error instanceof assert.AssertionError);assert.match(error.message,/^CM_MOBILE_SOURCE_OWNED_BOOT_FENCE/);
 const faultLocal=clone(copy.value.local),raw=Buffer.from(JSON.stringify(copy)+'\n'),bytes=gzipSync(raw),file='input/'+r.id+'-copied-bootstrap-fence-fault.json.gz';fs.writeFileSync(path.join(out,file),bytes,{flag:'wx'});
 copy.value.local[FENCE]=value;assert.equal(JSON.stringify(copy),original);assert.equal(JSON.stringify(frame),original);bootstrapHeld(copy);
 const actualFrame=r.frames[frame.sequence];assert.equal(sha(Buffer.from(JSON.stringify(copy)+'\n')),actualFrame.decodedSHA256);
 return{actualFrame:clone(actualFrame),actualLocal:clone(frame.value.local),fault:{file,bytes:bytes.length,sha256:sha(bytes),decodedBytes:raw.length,decodedSHA256:sha(raw),local:faultLocal},owned:{name:error.name,message:error.message},changed:true,wholeInverseExact:true,actualHeld:true,scope:'Copied complete actual boot frame only. No browser storage, input fixture or production clock is changed.'};
}
function copiedStorageControl(frame){
 const before=JSON.stringify(frame),copy=clone(frame);copy.value.local['cm-mobile-copied-unexpected-key']='changed';assert.notEqual(JSON.stringify(copy),before);let error;try{storageHeld(frame,copy);}catch(e){error=e;}assert(error instanceof assert.AssertionError);assert.match(error.message,/^CM_MOBILE_ALL_LOCAL_STORAGE_HELD/);delete copy.value.local['cm-mobile-copied-unexpected-key'];assert.equal(JSON.stringify(copy),before);assert.equal(JSON.stringify(frame),before);return{changed:true,owned:{name:error.name,message:error.message},wholeInverseExact:true,actualHeld:true};
}
function rowFor(p,id){return p.locator('[data-cm-squad-row='+JSON.stringify(id)+']');}
function nameFor(row,name){return row.locator('span[title='+JSON.stringify(name)+']');}
async function rowProjection(row,player){
 assert.equal(await row.count(),1,'CM_MOBILE_UNIQUE_REAL_ROW');const button=row.locator(':scope > button');assert.equal(await button.count(),1);assert.equal(await button.isEnabled(),true);assert.equal(await button.getAttribute('aria-expanded'),'false');
 const name=nameFor(row,player.name);assert.equal(await name.count(),1);assert.equal(await name.textContent(),player.name);assert.equal(await name.getAttribute('title'),player.name);
 const badge=button.getByText('MADE UP',{exact:true});assert.equal(await badge.count(),1,'CM_MOBILE_MADE_UP_BADGE');assert.equal(await badge.getAttribute('title'),'Not a real player. This club has no verified opening roster here, so its starting squad is generated.','CM_MOBILE_MADE_UP_TOOLTIP');
 return row.evaluate(n=>{const b=[...n.children].filter(x=>x.tagName==='BUTTON');if(b.length!==1)throw Error('CM_MOBILE_DIRECT_BUTTON_OWNER');const button=b[0];return{id:n.getAttribute('data-cm-squad-row'),rating:n.getAttribute('data-cm-rating'),potentialBand:n.getAttribute('data-cm-pot-band'),button:{type:button.type,disabled:button.disabled,expanded:button.getAttribute('aria-expanded'),text:button.textContent.replace(/\s+/g,' ').trim()},titles:[...button.querySelectorAll('[title]')].map(x=>({tag:x.tagName,title:x.getAttribute('title'),text:x.textContent})),cells:[...button.querySelectorAll('[data-cm-cell]')].map(x=>({cell:x.getAttribute('data-cm-cell'),text:x.textContent,title:x.getAttribute('title'),phoneKey:x.getAttribute('data-cm-phone-key')})),badges:[...button.querySelectorAll('span')].filter(x=>x.classList.contains('shrink-0')&&x.classList.contains('border')).map(x=>({text:x.textContent,title:x.getAttribute('title')})),html:n.outerHTML};});
}
async function readSquadName(p,row,expectedName){
 const name=nameFor(row,expectedName);assert.equal(await name.count(),1,'CM_SQUAD_NAME_UNIQUE_SOURCE_OWNER');
 return name.evaluate((n,expected)=>{
  const rectangle=b=>({x:b.x,y:b.y,right:b.right,bottom:b.bottom,width:b.width,height:b.height});
  const style=getComputedStyle(n),box=rectangle(n.getBoundingClientRect()),button=n.closest('button'),row=n.closest('[data-cm-squad-row]');
  if(!button||!row||button.parentElement!==row)throw Error('CM_SQUAD_NAME_ACTUAL_ROW_BUTTON');
  const ancestors=[],clip={x:0,y:0,right:innerWidth,bottom:innerHeight};
  for(let a=n;a;a=a.parentElement){const css=getComputedStyle(a),b=rectangle(a.getBoundingClientRect());ancestors.push({tag:a.tagName,className:a.className,box:b,display:css.display,visibility:css.visibility,opacity:css.opacity,overflowX:css.overflowX,overflowY:css.overflowY,scrollWidth:a.scrollWidth,clientWidth:a.clientWidth,scrollHeight:a.scrollHeight,clientHeight:a.clientHeight});
   if(a===n||['hidden','clip','auto','scroll'].includes(css.overflowX)){clip.x=Math.max(clip.x,b.x);clip.right=Math.min(clip.right,b.right);}if(a===n||['hidden','clip','auto','scroll'].includes(css.overflowY)){clip.y=Math.max(clip.y,b.y);clip.bottom=Math.min(clip.bottom,b.bottom);}}
  if(n.childNodes.length!==1||n.firstChild.nodeType!==Node.TEXT_NODE)throw Error('CM_SQUAD_NAME_DIRECT_TEXT_OWNER');
  const obstacleNodes=[...new Set([...button.children].filter(child=>child!==button.children[1]).concat([...button.querySelectorAll('span[title], [data-cm-cell], [data-cm-captain-badge], [data-cm-intl-badge]')], [...button.querySelectorAll('span.border')]))].filter(node=>node!==n&&!node.contains(n)&&!n.contains(node));
  const obstacles=obstacleNodes.map(node=>({tag:node.tagName,text:node.textContent,title:node.getAttribute('title'),box:rectangle(node.getBoundingClientRect()),display:getComputedStyle(node).display,visibility:getComputedStyle(node).visibility}));
  const text=n.firstChild,segments=[...new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(expected)],glyphs=segments.map(value=>{
   const range=document.createRange();range.setStart(text,value.index);range.setEnd(text,value.index+value.segment.length);
   const rects=[...range.getClientRects()].map(rectangle),hits=rects.map(b=>{const hit=document.elementFromPoint((b.x+b.right)/2,(b.y+b.bottom)/2);return{inside:!!hit&&(hit===n||n.contains(hit)),tag:hit?.tagName??null,text:hit?.textContent??null};});
   return{segment:value.segment,index:value.index,end:value.index+value.segment.length,rects,hits};
  });
  return{expectedName:expected,text:n.textContent,title:n.getAttribute('title'),rowId:row.getAttribute('data-cm-squad-row'),nameHTML:n.outerHTML,rowHTML:row.outerHTML,box,clip,glyphs,obstacles,ancestors,style:{display:style.display,visibility:style.visibility,opacity:style.opacity,whiteSpace:style.whiteSpace,overflowX:style.overflowX,overflowY:style.overflowY,textOverflow:style.textOverflow,font:style.font,lineHeight:style.lineHeight,wordBreak:style.wordBreak,overflowWrap:style.overflowWrap},dimensions:{clientWidth:n.clientWidth,scrollWidth:n.scrollWidth,clientHeight:n.clientHeight,scrollHeight:n.scrollHeight},button:rectangle(button.getBoundingClientRect()),identity:rectangle(button.children[1].getBoundingClientRect()),cells:[...button.querySelectorAll('[data-cm-cell]')].map(cell=>({cell:cell.getAttribute('data-cm-cell'),text:cell.textContent,display:getComputedStyle(cell).display,box:rectangle(cell.getBoundingClientRect())})),document:{width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth}};
 },expectedName);
}
function assertSquadNameReadable(value){
 const marker='CM_SQUAD_NAME_GLYPHS_VISIBLE';assert.equal(value.text,value.expectedName,marker+' exact name');assert.equal(value.title,value.expectedName,marker+' title');
 assert(value.glyphs.length>0&&value.glyphs.map(g=>g.segment).join('')===value.expectedName,marker+' complete glyph census');
 assert(value.ancestors.every(a=>a.display!=='none'&&a.visibility!=='hidden'&&Number(a.opacity)>0),marker+' visible source owner');
 assert(value.box.width>0&&value.box.height>0&&value.clip.right>value.clip.x&&value.clip.bottom>value.clip.y,marker+' positive name clip');
 const glyphs=value.glyphs.filter(g=>g.segment.trim().length>0);assert(glyphs.length>0,marker+' actual name glyphs');
 const quantum=1/64;
 for(const glyph of glyphs){assert(glyph.rects.length>0,marker+' glyph rectangle');for(let at=0;at<glyph.rects.length;at++){const b=glyph.rects[at];assert(b.width>0&&b.height>0&&b.x>=value.clip.x-quantum&&b.right<=value.clip.right+quantum&&b.y>=value.clip.y-quantum&&b.bottom<=value.clip.bottom+quantum,marker+' full glyph inside name/ancestor/viewport clip');assert(glyph.hits[at]?.inside,marker+' glyph hit owned by name');for(const obstacle of value.obstacles){const q=obstacle.box;if(obstacle.display!=='none'&&obstacle.visibility!=='hidden'&&q.width>0&&q.height>0)assert(Math.min(b.right,q.right)-Math.max(b.x,q.x)<=quantum||Math.min(b.bottom,q.bottom)-Math.max(b.y,q.y)<=quantum,marker+' no badge or adjacent-cell overlap');}}}
 assert(value.dimensions.scrollWidth<=value.dimensions.clientWidth+1,marker+' no hidden horizontal name text');assert(value.document.scrollWidth<=value.document.clientWidth+1,'CM_MOBILE_NO_BODY_OVERFLOW');
}
function glyphControls(value){
 assertSquadNameReadable(value);const before=JSON.stringify(value),controls=[];
 for(const kind of ['text','glyph-omission','clip','obstacle-overlap']){
  const copy=clone(value);let restored;
  if(kind==='text'){restored=copy.text;copy.text+=' copied';}
  else if(kind==='glyph-omission')restored=copy.glyphs.pop();
  else if(kind==='clip'){restored=copy.clip.right;copy.clip.right=copy.clip.x-1;}
  else{assert(copy.obstacles.length>0);restored=clone(copy.obstacles[0]);const b=copy.glyphs.find(g=>g.segment.trim()).rects[0];Object.assign(copy.obstacles[0],{box:clone(b),display:'block',visibility:'visible'});}
  assert.notEqual(JSON.stringify(copy),before);let error;try{assertSquadNameReadable(copy);}catch(e){error=e;}assert(error instanceof assert.AssertionError);assert.match(error.message,/^CM_SQUAD_NAME_GLYPHS_VISIBLE/);if(kind==='obstacle-overlap')assert.match(error.message,/no badge or adjacent-cell overlap/);
  const fault=clone(copy);if(kind==='text')copy.text=restored;else if(kind==='glyph-omission')copy.glyphs.push(restored);else if(kind==='clip')copy.clip.right=restored;else copy.obstacles[0]=restored;assert.equal(JSON.stringify(copy),before);assert.equal(JSON.stringify(value),before);assertSquadNameReadable(copy);
  controls.push({kind,changed:true,fault,owned:{name:error.name,message:error.message},wholeInverseExact:true,actualHeld:true});
 }return controls;
}
async function photo(p,r,label,target){
 const prep=await sample(p,r,label+' before native photo preparation');await prepareControl(p,r,target);await waitForScrollIdle(p);
 const geometry=await cardGeometry(target);validateCard(geometry);r.cardControl??=cardControl(geometry);
 const before=await sample(p,r,label+' photo baseline');storageHeld(r.baseline,before);storageHeld(prep,before);
 const file=r.id+'-'+label+'.png';await p.screenshot({path:path.join(out,file)});const after=await sample(p,r,label+' screenshot return');sameScreen(before,after);storageHeld(r.baseline,after);assert.deepEqual(after.value.focus,before.value.focus);
 const bytes=fs.readFileSync(path.join(out,file));assert(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),'Actual PNG');
 r.photos.push({label,file,bytes:bytes.length,sha256:sha(bytes),geometry,preparationFrame:prep.sequence,baselineFrame:before.sequence,afterFrame:after.sequence,scope:'Actual viewport. Detail-open proves native detail presence; it is not an all-detail-tile visibility claim.'});report.screenshots.push(file);
}
function photoCensus(r){assert.deepEqual(r.photos.map(row=>row.label),['first','longest','densest-badges','last','detail-open','detail-closed'],'CM_MOBILE_COMPLETE_PHOTOS');}
function photoControl(r){const before=JSON.stringify(r.photos),copy={photos:clone(r.photos)},removed=copy.photos.pop();assert(removed);assert.notEqual(JSON.stringify(copy.photos),before);let error;try{photoCensus(copy);}catch(e){error=e;}assert(error instanceof assert.AssertionError);assert.match(error.message,/^CM_MOBILE_COMPLETE_PHOTOS/);copy.photos.push(removed);assert.equal(JSON.stringify(copy.photos),before);assert.equal(JSON.stringify(r.photos),before);return{removed,changed:true,owned:{name:error.name,message:error.message},wholeInverseExact:true,actualHeld:true};}
function assetControls(r){
 const original=JSON.stringify(r),copy=clone(r),at=copy.assetBodies.findIndex(v=>v.path.endsWith('.js'));assert(at>=0);const [body]=copy.assetBodies.splice(at,1);assert.notEqual(JSON.stringify(copy),original);let error;try{validateAssets(copy);}catch(e){error=e;}assert(error instanceof assert.AssertionError);assert.match(error.message,/^CM_TEAM_NATIVE_BODY_RECEIPT/);copy.assetBodies.splice(at,0,body);assert.equal(JSON.stringify(copy),original);assert.equal(JSON.stringify(r),original);return{omitted:body,owned:{name:error.name,message:error.message},changed:true,wholeInverseExact:true,actualHeld:true};
}
function documentControl(r){
 const before=JSON.stringify(r),copy=clone(r),body=copy.documentBodies.shift();assert(body);assert.notEqual(JSON.stringify(copy),before);let error;try{validateDocuments(copy);}catch(e){error=e;}assert(error instanceof assert.AssertionError);assert.match(error.message,/^K_NATIVE_MAIN_DOCUMENT_BODY/);copy.documentBodies.unshift(body);assert.equal(JSON.stringify(copy),before);assert.equal(JSON.stringify(r),before);return{omitted:body,owned:{name:error.name,message:error.message},changed:true,wholeInverseExact:true,actualHeld:true};
}

const browser=await chromium.launch({headless:true});
async function journey(roleName,width){
 m=input[roleName];origin=new URL(bases[roleName]).origin;dist=m.distPath;refs=new Map(m.distBefore.map(row=>[row.file,row]));
 const r={id:'cm-mobile-'+roleName+'-'+width,role:roleName,width,height:width===390?844:900,actor:width<768?'touch':'keyboard',status:'incomplete',phase:'bootstrap',actions:[],frames:[],photos:[],names:[],rows:[],requests:[],responses:[],failures:[],aborts:[],assetBodies:[],assetErrors:[],console:[],pageErrors:[],navigations:[],documentRequests:[],documentBodies:[],nativeRequests:[],nativeEvents:[],inputEvents:[]};report.contexts.push(r);
 const c=await browser.newContext({viewport:{width,height:r.height},deviceScaleFactor:1,isMobile:width<768,hasTouch:width<768,serviceWorkers:'block'});
 await c.addInitScript(({expectedOrigin,local,session})=>{if(location.origin!==expectedOrigin)return;const before={local:Object.fromEntries(Object.keys(localStorage).map(k=>[k,localStorage.getItem(k)])),session:Object.fromEntries(Object.keys(sessionStorage).map(k=>[k,sessionStorage.getItem(k)]))};if(Object.keys(before.local).length||Object.keys(before.session).length)throw Error('CM_MOBILE_FRESH_CONTEXT_INPUT');for(const [key,value]of Object.entries(local))localStorage.setItem(key,value);for(const [key,value]of Object.entries(session))sessionStorage.setItem(key,value);window.__cmMobileInjected={before,local:Object.fromEntries(Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)])),session:Object.fromEntries(Object.keys(sessionStorage).sort().map(k=>[k,sessionStorage.getItem(k)]))};},{expectedOrigin:origin,local:original.local,session:original.session});
 const p=await c.newPage();p.setDefaultTimeout(15000);p.setDefaultNavigationTimeout(30000);
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

 try{
  const response=await p.goto(bases[roleName]+'/club-manager',{waitUntil:'load'});assert.equal(response.status(),200);await p.locator('#dukb-main').waitFor({state:'visible'});await p.locator('[data-testid="cm-slots"]').waitFor({state:'visible'});await p.getByRole('button',{name:'Resume Career',exact:true}).waitFor({state:'visible'});await idle(p);await drain();
  const injected=await p.evaluate(()=>window.__cmMobileInjected);assert(injected);assert.deepEqual(injected.before,{local:{},session:{}});assert.deepEqual(injected.local,original.local);assert.deepEqual(injected.session,original.session);r.injectedInput=injected;
  const loaded=await sample(p,r,'authentic complete input after production boot');r.bootstrap=bootstrapHeld(loaded);r.bootstrapControl=copiedBootstrapControl(r,loaded);
  const resume=p.getByRole('button',{name:'Resume Career',exact:true});assert.equal(await resume.count(),1);await press(p,r,resume,'Actual saved slot Resume Career');
  await p.locator('[data-cm-hub]').waitFor({state:'visible'});await waitForScrollIdle(p);await drain();
  const resumed=await sample(p,r,'authentic saved career after actual Resume');storageHeld(loaded,resumed);
  const squad=p.getByRole('tab',{name:'Squad',exact:true});assert.equal(await squad.count(),1);
  if(width<768)await press(p,r,squad,'Actual saved Squad tab');
  else{
   const tabGroup=squad.locator('xpath=..'),activeTab=tabGroup.locator('[role="tab"][data-state="active"]');assert.equal(await activeTab.count(),1);await prepareControl(p,r,activeTab);
   const documents=r.documentRequests.map(row=>row.id),count=await tabGroup.getByRole('tab').count();
   for(let step=0;step<count&&await squad.getAttribute('data-state')!=='active';step++){
    assert.equal(await activeTab.count(),1,'K_CM_COLD_ONE_SELECTED_TAB');assert(await activeTab.evaluate(node=>node===document.activeElement||node.contains(document.activeElement)),'K_CM_COLD_SELECTED_TAB_OWNS_ARROW');
    const beforeArrow=await sample(p,r,'Actual saved Squad tab before actual ArrowRight '+step),eventStart=r.inputEvents.length;storageHeld(resumed,beforeArrow);await p.keyboard.press('ArrowRight');
    for(const point of ['immediate','raf1','raf2']){if(point!=='immediate')await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(resolve)));const early=await sample(p,r,'Actual saved Squad tab ArrowRight '+step+' '+point);storageHeld(beforeArrow,early);assert.deepEqual(r.documentRequests.map(row=>row.id),documents);}
    await waitForScrollIdle(p);await drain();const afterArrow=await sample(p,r,'Actual saved Squad tab ArrowRight '+step+' settled');storageHeld(beforeArrow,afterArrow);assert(r.inputEvents.slice(eventStart).some(event=>event.trusted&&event.type==='keydown'&&event.key==='ArrowRight'),'K_CM_COLD_REAL_ARROW_ACK');r.actions.push({type:'actual-selected-tab-arrow',label:'Actual saved Squad tab',step,before:beforeArrow.sequence,after:afterArrow.sequence});
   }
   assert.equal(await squad.getAttribute('data-state'),'active','K_CM_COLD_ACTUAL_TAB_ARROW_REACH');
  }
  await p.locator('[data-cm-squad-list]').waitFor({state:'visible'});await waitForScrollIdle(p);await drain();
  r.phase='settled-squad';r.baseline=await sample(p,r,'settled authentic Squad storage baseline');storageHeld(resumed,r.baseline);r.storageControl=copiedStorageControl(r.baseline);
  const rows=p.locator('[data-cm-squad-row]');assert.equal(await rows.count(),16);r.rowOrder=await rows.evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-cm-squad-row')));assert.deepEqual([...r.rowOrder].sort(),players.map(player=>player.id).sort());
  assert.equal(await p.locator('[data-cm-squad-detail]').count(),0,'Fresh actual Squad details collapsed');
  const playerMap=new Map(players.map(player=>[player.id,player]));
  r.phase='all-name-glyphs';
  for(const playerId of r.rowOrder){
   const player=playerMap.get(playerId),row=rowFor(p,playerId),button=row.locator(':scope > button');
   const before=await sample(p,r,player.name+' before native row reach');storageHeld(r.baseline,before);await prepareControl(p,r,button);await waitForScrollIdle(p);
   const projection=await rowProjection(row,player),measurement=await readSquadName(p,row,player.name),after=await sample(p,r,player.name+' complete actual glyph/row read');storageHeld(r.baseline,after);storageHeld(before,after);
   assert.equal(projection.id,player.id);assert.equal(projection.rating,String(player.rating));assert.equal(measurement.document.scrollWidth<=measurement.document.clientWidth+1,true,'CM_MOBILE_NO_BODY_OVERFLOW');
   let failure=null;try{assertSquadNameReadable(measurement);}catch(error){assert(error instanceof assert.AssertionError);assert.match(error.message,/^CM_SQUAD_NAME_GLYPHS_VISIBLE/);failure={name:error.name,message:error.message};}
   r.rows.push(projection);r.names.push({id:player.id,name:player.name,measurement,failure,beforeFrame:before.sequence,afterFrame:after.sequence});
  }
  const visible=r.names.find(row=>row.failure===null);r.glyphControls=visible?glyphControls(visible.measurement):{status:'NO_POSITIVE_BASELINE_PHONE_NAME_NO_COPIED_CONTROL_CREDIT'};
  const longest=[...r.rowOrder].sort((a,b)=>Array.from(playerMap.get(b).name).length-Array.from(playerMap.get(a).name).length||r.rowOrder.indexOf(a)-r.rowOrder.indexOf(b))[0];
  const densest=[...r.rows].sort((a,b)=>b.badges.length-a.badges.length||r.rowOrder.indexOf(a.id)-r.rowOrder.indexOf(b.id))[0].id;r.selectedRows={first:r.rowOrder[0],longest,densest,last:r.rowOrder.at(-1)};
  r.phase='source-owned-name-photos';
  for(const [label,playerId]of [['first',r.selectedRows.first],['longest',longest],['densest-badges',densest],['last',r.selectedRows.last]])await photo(p,r,label,rowFor(p,playerId).locator(':scope > button'));
  r.phase='actual-longest-player-detail';
  const longestRow=rowFor(p,longest),button=longestRow.locator(':scope > button'),detail=longestRow.locator('[data-cm-squad-detail='+JSON.stringify(longest)+']');
  const beforeOpen=await sample(p,r,'longest actual row before detail input');storageHeld(r.baseline,beforeOpen);const openStart=r.inputEvents.length;
  await press(p,r,button,'Actual longest player detail open');await detail.waitFor({state:'visible'});await waitForScrollIdle(p);await drain();assert.equal(await button.getAttribute('aria-expanded'),'true');assert.equal(await detail.count(),1);assert.equal(await p.locator('[data-cm-squad-detail]').count(),1);
  const detailCells=await detail.locator('[data-cm-detail]').evaluateAll(nodes=>nodes.map(n=>({cell:n.getAttribute('data-cm-detail'),text:n.textContent,html:n.outerHTML})));
  assert.deepEqual(detailCells.map(cell=>cell.cell),['pot','deal','worth','interest','gametime','role','condition','season'],'CM_MOBILE_REAL_DETAIL_CELLS');
  assert(r.inputEvents.slice(openStart).some(event=>event.trusted&&(event.type==='click'||event.type==='keydown'&&event.key==='Enter')),'CM_MOBILE_TRUSTED_DETAIL_INPUT');
  const opened=await sample(p,r,'actual native longest player detail open');storageHeld(r.baseline,opened);await photo(p,r,'detail-open',button);
  await press(p,r,button,'Actual longest player detail close');await detail.waitFor({state:'detached'});await waitForScrollIdle(p);await drain();assert.equal(await button.getAttribute('aria-expanded'),'false');assert.equal(await p.locator('[data-cm-squad-detail]').count(),0);
  const closed=await sample(p,r,'actual native longest player detail closed');storageHeld(r.baseline,closed);r.detail={id:longest,name:playerMap.get(longest).name,beforeFrame:beforeOpen.sequence,openFrame:opened.sequence,closedFrame:closed.sequence,cells:detailCells,opened:true,closed:true,scope:'Actual native row/detail open and close, no player or model callback.'};await photo(p,r,'detail-closed',button);
  const final=await sample(p,r,'final live settled Squad input');storageHeld(r.baseline,final);r.finalFrame=final.sequence;r.storageHeld=true;photoCensus(r);r.photoControl=photoControl(r);assert.equal(r.documentRequests.length,1,'CM_MOBILE_ONE_ACTUAL_DOCUMENT');
  const findings=r.names.filter(row=>row.failure).map(row=>({id:row.id,name:row.name,...row.failure}));
  if(width<768&&roleName==='baseline'){assert(findings.length>0,'CM_MOBILE_ACTUAL_BASELINE_NEGATIVE_REQUIRED');r.visibility={oracleStatus:'owned-baseline-negative',guard:'CM_SQUAD_NAME_GLYPHS_VISIBLE',checked:16,visible:16-findings.length,findings,scope:'Measured old compiled phone clipping. Every saved name, title, badge and native row remains present; this context is not a full-name visibility pass.'};}
  else if(width<768){assert.deepEqual(findings,[],'CM_MOBILE_CANDIDATE_ALL_NAMES_VISIBLE');r.visibility={oracleStatus:'candidate-full-name-pass',checked:16,visible:16,findings};}
  else r.visibility={oracleStatus:'desktop-baseline-parity',checked:16,visible:16-findings.length,findings,scope:'Existing desktop truncate semantics measured. Final cross-arm check requires all candidate names if all baseline names fit, and exact row data/cell census.'};
  r.status='passed';
 }catch(error){
  r.status='failed';r.error={name:error.name,message:error.message,stack:error.stack};try{await sample(p,r,'failure full actual state');const file=r.id+'-failure.png';await p.screenshot({path:path.join(out,file)});const bytes=fs.readFileSync(path.join(out,file));r.failureScreenshot={file,bytes:bytes.length,sha256:sha(bytes)};}catch(captureError){r.captureError=String(captureError.stack||captureError);}
 }finally{
  try{await drain();}catch(error){r.assetErrors.push({message:String(error.stack||error),phase:'finally drain'});r.status='failed';}
  await c.close();await Promise.all([...reads]);
  try{
   r.finalNativeCensus=nativeZeroWriteCensus(r);r.nativeMethodControls=nativeMethodCopiedControls(r);r.readPreflightControls=readPreflightCopiedControls(r);
   const expectedResource=e=>/^Failed to load resource: net::ERR_(?:BLOCKED_BY_CLIENT(?:\.Inspector)?|FAILED)$/.test(e.text)&&r.aborts.some(a=>a.url===e.location.url);
   r.expectedConsole=r.console.filter(e=>e.type==='error'&&expectedResource(e));r.unexpectedConsole=r.console.filter(e=>e.type==='error'&&!expectedResource(e));r.unexpectedPageErrors=clone(r.pageErrors);
   r.unexpectedExternalAborts=r.aborts.filter(a=>a.origin!==origin&&!known.has(a.origin.replace(/^ws/,'http')));r.localHttpErrors=r.responses.filter(a=>new URL(a.url).origin===origin&&a.status>=400);
   assert(r.inputEvents.length<=15000,'CM_MOBILE_EVENT_BOUND');validateAssets(r);r.assetControl=assetControls(r);validateDocuments(r);r.documentControl=documentControl(r);assert.equal(writes(r),0);assert.deepEqual(r.unexpectedConsole,[]);assert.deepEqual(r.unexpectedPageErrors,[]);assert.deepEqual(r.unexpectedExternalAborts,[]);assert.deepEqual(r.localHttpErrors,[]);silent();r.protocolHeld=true;
  }catch(error){r.status='failed';r.classificationError=String(error.stack||error);}
  // Keep CDP attached through context close so late native requests remain in the census.
  write('report.json',report);
 }
}
function rowData(row){const {html,...data}=row;return data;}
function desktopCells(measurement){return measurement.cells.filter(cell=>cell.display!=='none').map(cell=>({cell:cell.cell,text:cell.text}));}
function desktopGeometry(actual,baseline){
 const relative=(box,button)=>({x:box.x-button.x,y:box.y-button.y,width:box.width,height:box.height}),compare=(a,b,label)=>{for(const key of ['x','y','width','height'])assert(Math.abs(a[key]-b[key])<=1,'CM_MOBILE_DESKTOP_GEOMETRY_HELD '+label+' '+key);};
 compare(relative(actual.identity,actual.button),relative(baseline.identity,baseline.button),'identity');compare(relative(actual.box,actual.button),relative(baseline.box,baseline.button),'name');
 assert(Math.abs(actual.button.width-baseline.button.width)<=1&&Math.abs(actual.button.height-baseline.button.height)<=1,'CM_MOBILE_DESKTOP_ROW_SIZE_HELD');
 const old=new Map(baseline.cells.filter(cell=>cell.display!=='none').map(cell=>[cell.cell,cell]));for(const cell of actual.cells.filter(cell=>cell.display!=='none'))compare(relative(cell.box,actual.button),relative(old.get(cell.cell).box,baseline.button),cell.cell);
}
try{
 for(const width of [320,390,1280])for(const role of ['baseline','candidate'])await journey(role,width);
 assert.equal(report.contexts.length,6);
 for(const width of [320,390,1280]){
  const baseline=report.contexts.find(c=>c.role==='baseline'&&c.width===width),candidate=report.contexts.find(c=>c.role==='candidate'&&c.width===width);assert.equal(baseline.status,'passed');assert.equal(candidate.status,'passed');assert.deepEqual(candidate.rowOrder,baseline.rowOrder,'CM_MOBILE_FULL_ROW_ORDER_HELD');assert.deepEqual(candidate.rows.map(rowData),baseline.rows.map(rowData),'CM_MOBILE_COMPLETE_LABEL_VALUE_CENSUS_HELD');assert.equal(candidate.detail.id,baseline.detail.id);assert.deepEqual(candidate.detail.cells.map(({html,...cell})=>cell),baseline.detail.cells.map(({html,...cell})=>cell),'CM_MOBILE_COMPLETE_DETAIL_VALUES_HELD');
  if(width===1280){
   const baselineNames=new Map(baseline.names.map(row=>[row.id,row]));for(const row of candidate.names){const old=baselineNames.get(row.id);desktopGeometry(row.measurement,old.measurement);assert.deepEqual(desktopCells(row.measurement),desktopCells(old.measurement),'CM_MOBILE_DESKTOP_COLUMN_CENSUS_HELD');for(const key of ['whiteSpace','textOverflow','overflowX','font'])assert.equal(row.measurement.style[key],old.measurement.style[key],'CM_MOBILE_DESKTOP_NAME_STYLE_HELD '+key);if(!old.failure)assert.equal(row.failure,null,'CM_MOBILE_DESKTOP_READABLE_NAME_HELD');}
   if(baseline.names.every(row=>row.failure===null))assert(candidate.names.every(row=>row.failure===null),'CM_MOBILE_ALL_BASELINE_DESKTOP_NAMES_STAY_VISIBLE');
  }
 }
 const desktop=report.contexts.find(c=>c.role==='candidate'&&c.width===1280).names[0].measurement,desktopBefore=JSON.stringify(desktop),desktopCopy=clone(desktop);desktopCopy.box.x+=4;assert.notEqual(JSON.stringify(desktopCopy),desktopBefore);let desktopError;try{desktopGeometry(desktopCopy,desktop);}catch(error){desktopError=error;}assert(desktopError instanceof assert.AssertionError);assert.match(desktopError.message,/^CM_MOBILE_DESKTOP_GEOMETRY_HELD/);desktopCopy.box.x=desktop.box.x;assert.equal(JSON.stringify(desktopCopy),desktopBefore);assert.equal(JSON.stringify(desktop),desktopBefore);report.desktopGeometryControl={changed:true,owned:{name:desktopError.name,message:desktopError.message},wholeInverseExact:true,actualHeld:true};
 report.crossArmHeld=true;
}catch(error){report.closingError={name:error.name,message:error.message,stack:error.stack};}
finally{
 try{for(const role of ['baseline','candidate'])roleHeld(role);silent();report.sourceHeld=true;report.distHeld=true;}catch(error){report.finalHoldError=String(error.stack||error);}
 await browser.close();report.storageHeld=report.contexts.length===6&&report.contexts.every(c=>c.storageHeld===true);report.status=report.contexts.length===6&&report.screenshots.length===36&&report.contexts.every(c=>c.status==='passed'&&c.protocolHeld===true)&&report.crossArmHeld&&report.sourceHeld&&report.distHeld&&report.storageHeld?'passed':'failed';write('report.json',report);
}
assert.equal(report.status,'passed','CM_MOBILE_SQUAD_NAME_ALL_SIX_CONTEXTS');
console.log('Mobile Squad names: six completed-dist contexts, same full authentic16-player save; old phone visibility negatives owned, candidate full phone names, desktop baseline parity, actual longest-row detail open/close,36photos and complete source/dist/save/network holds.');
