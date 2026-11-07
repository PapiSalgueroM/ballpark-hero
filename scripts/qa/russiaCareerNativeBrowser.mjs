import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';
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
assert.equal(m.schema,'RUSSIA_SC_NATIVE_SOURCE_DIST_V1');assert.equal(m.status,'QUALIFIED_BUILD_AND_RUSSIA_BRIDGE_BOUND');
for(const value of Object.values(m.product))assert.match(value,/^[a-f0-9]{40}$/);for(const name of ['generator','bridge','build','originalNative'])assert.match(m.admissions[name],/^[a-f0-9]{64}$/);
assert.equal(m.admissions.originalNative,'e1a8c8cd7bb546a779caca45e3912691645c24421c0e36efd05aa7e7d522b916');
assert.deepEqual(m.sourceBefore,m.sourceAfter);assert(Array.isArray(m.sourcePins)&&m.sourcePins.length>0);
function sourceHeld(){for(const[file,digest]of Object.entries(m.sourceAfter)){assert.match(digest,/^[a-f0-9]{64}$/);assert.equal(sha(fs.readFileSync(file)),digest,file);}for(const row of m.sourcePins){assert.match(row.gitBlob,/^[a-f0-9]{40}$/);assert.equal(blob(fs.readFileSync(row.path)),row.gitBlob,row.path);assert(Object.hasOwn(m.sourceAfter,row.path));}}
sourceHeld();
const taskRequire=createRequire(path.join(process.cwd(),'package.json'));
function pureReferences(){
 const codecPath='src/lib/soccerCareerSave.ts',enginePath='src/lib/soccerCareerEngine.ts',poolPath='src/data/soccerCareerClubPool.ts';
 assert.equal(blob(fs.readFileSync(codecPath)),'86ec011693fd5bc702b5e8ccec05d27775a72a76');
 const moduleFile=path.join(out,'reference','codec.cjs'),result=taskRequire('esbuild').buildSync({entryPoints:[codecPath],bundle:true,platform:'node',format:'cjs',outfile:moduleFile,metafile:true,logLevel:'silent'});
 const inputs=Object.keys(result.metafile.inputs).map(file=>path.relative(process.cwd(),path.resolve(file)).split(path.sep).join('/')).sort();assert.deepEqual(inputs,['node_modules/lz-string/libs/lz-string.js',codecPath].sort(),'RUSSIA_NATIVE_PURE_CODEC_INPUTS');
 for(const file of inputs){const bytes=fs.readFileSync(file),target=path.join(out,'reference','inputs',file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes,{flag:'wx'});}write('codec-metafile.json',result.metafile);
 const codec=taskRequire(moduleFile);for(const name of ['parseSoccerCareerSave','serializeSoccerCareerSave','isSoccerCareerSave'])assert.equal(typeof codec[name],'function');
 const ts=taskRequire('typescript'),unwrap=n=>{while(ts.isAsExpression(n)||ts.isParenthesizedExpression(n)||ts.isTypeAssertionExpression(n)||ts.isSatisfiesExpression(n))n=n.expression;return n;};
 const literal=(file,name)=>{const sf=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TS),vars=sf.statements.filter(ts.isVariableStatement).flatMap(node=>[...node.declarationList.declarations]),rows=vars.filter(node=>ts.isIdentifier(node.name)&&node.name.text===name);assert.equal(rows.length,1,name);return unwrap(rows[0].initializer);};
 const string=node=>{assert(ts.isStringLiteral(node));return node.text;},object=node=>{assert(ts.isObjectLiteralExpression(node));return Object.fromEntries(node.properties.map(prop=>{assert(ts.isPropertyAssignment(prop));const key=ts.isIdentifier(prop.name)?prop.name.text:string(prop.name),value=unwrap(prop.initializer);assert(ts.isStringLiteral(value)||ts.isNumericLiteral(value));return[key,ts.isStringLiteral(value)?value.text:Number(value.text)];}));};
 const hand=literal(enginePath,'HAND_CLUBS'),pool=literal(poolPath,'CAREER_CLUB_POOL');assert(ts.isArrayLiteralExpression(hand)&&ts.isArrayLiteralExpression(pool));assert.equal(hand.elements.length,190);assert.equal(pool.elements.length,349);
 const allClubs=[...hand.elements,...pool.elements].map(object),clubs=allClubs.filter(row=>row.country==='Russia');assert.equal(clubs.length,16);assert(clubs.every(row=>row.tier===2&&row.league==='Russian Premier League'));assert.equal(new Set(clubs.map(row=>row.id)).size,16);assert.equal(new Set(clubs.map(row=>row.name)).size,16);
 assert.deepEqual(clubs.find(row=>row.name==='Zenit'),{id:'fb-95',name:'Zenit',country:'Russia',tier:2,color:'#009FDF',league:'Russian Premier League'});assert.deepEqual(clubs,m.russia.clubs,'RUSSIA_NATIVE_ACTUAL_LITERAL_CLUBS');
 const since=literal(poolPath,'CAREER_POOL_SINCE');assert(ts.isObjectLiteralExpression(since));for(const club of clubs.filter(row=>row.name!=='Zenit')){const rows=since.properties.filter(prop=>ts.isPropertyAssignment(prop)&&ts.isStringLiteral(prop.name)&&prop.name.text===club.name);assert.equal(rows.length,1);assert.equal(rows[0].initializer.text,'2026');}
 const eraPath='src/lib/careerEras.ts';assert(Object.hasOwn(m.sourceAfter,eraPath));assert.equal(sha(fs.readFileSync(eraPath)),m.sourceAfter[eraPath]);
 const foundedNode=literal(eraPath,'CLUB_FOUNDED_AFTER'),tierNode=literal(eraPath,'ERA_TIER_RULES');
 assert(ts.isObjectLiteralExpression(foundedNode)&&ts.isArrayLiteralExpression(tierNode));
 const founded={};let poolSpread=0;
 for(const prop of foundedNode.properties){
  if(ts.isSpreadAssignment(prop)){assert(ts.isIdentifier(prop.expression)&&prop.expression.text==='CAREER_POOL_SINCE');poolSpread++;for(const item of since.properties){assert(ts.isPropertyAssignment(item)&&ts.isNumericLiteral(item.initializer));founded[string(item.name)]=Number(item.initializer.text);}}
  else{assert(ts.isPropertyAssignment(prop)&&ts.isNumericLiteral(prop.initializer));founded[string(prop.name)]=Number(prop.initializer.text);}
 }
 assert.equal(poolSpread,1);
 const tierRules=tierNode.elements.map(object),historicalClubs=allClubs.filter(row=>founded[row.name]===undefined||2005>=founded[row.name]).map(row=>{
  const rule=tierRules.find(rule=>rule.name===row.name&&(rule.from===undefined||2005>=rule.from)&&(rule.until===undefined||2005<=rule.until));
  return rule?{...row,tier:rule.tier}:row;
 });
 assert.deepEqual(historicalClubs.filter(row=>row.country==='Russia').map(row=>[row.name,row.tier]),[['Zenit',4]]);
 assert(!historicalClubs.some(row=>row.name==='Gimcheon Sangmu'));
 const historicalAcademies=historicalClubs.filter(row=>row.tier===1||row.tier===2);
 assert(historicalAcademies.length>0&&!historicalAcademies.some(row=>row.country==='Russia'));
 write('historical-academy-reference.json',{year:2005,overall:70,eraSource:{path:eraPath,gitBlob:blob(fs.readFileSync(eraPath))},founded,tierRules,historicalClubs,eligible:historicalAcademies,scope:'Pure literal source projection for the existing overall70 global tier1/2 fallback. No engine import, model callback or random draw.'});
 assert.equal(blob(fs.readFileSync('src/lib/completions.ts')),'61daf9b6c528f884551cd1d42f71357681c8728a');assert.equal(blob(fs.readFileSync('src/lib/saveFence.ts')),'1de45b573fd866433eb0982495af927a5427e8f4');
 const urls=literal('src/integrations/supabase/client.ts','SUPABASE_URL');assert.equal(string(urls),'https://flawuiqbvjobmkfkauhw.supabase.co');
 write('pure-references.json',{inputs,codec:{path:codecPath,gitBlob:blob(fs.readFileSync(codecPath))},engine:{path:enginePath,gitBlob:blob(fs.readFileSync(enginePath))},pool:{path:poolPath,gitBlob:blob(fs.readFileSync(poolPath))},clubs,scope:'Pure save codec and literal source AST only. No engine import, model initialization or fixture generation.'});
 return{codec,clubs,historicalAcademies,currentRussia:clubs.map(row=>row.name),oldRussia:['Zenit']};
}
const requiredSources=['src/pages/SoccerCareer.tsx','src/lib/soccerCareerEngine.ts','src/lib/soccerCareerContinental.ts','src/lib/soccerCareerLeague.ts','src/data/soccerCareerClubPool.ts','src/lib/soccerCareerSave.ts','src/lib/saveFence.ts','src/lib/completions.ts','src/integrations/supabase/client.ts','src/lib/managerJobMarket.ts','src/lib/managerOffers.ts'];
for(const file of requiredSources){assert(Object.hasOwn(m.sourceAfter,file),'RUSSIA_NATIVE_REQUIRED_SOURCE '+file);assert.equal(m.sourcePins.filter(row=>row.path===file).length,1,'RUSSIA_NATIVE_REQUIRED_GIT_PIN '+file);}
assert.equal(m.preparedManagerOffer.source.admission,m.admissions.bridge,'RUSSIA_NATIVE_PREPARED_TUPLE_ACTUAL_BRIDGE');
assert.equal(m.preparedManagerOffer.source.marketPath,'src/lib/managerJobMarket.ts');assert.equal(m.preparedManagerOffer.source.marketGitBlob,'82e11ce8c1c76b780059969674a26ad368bd4db4');assert.equal(blob(fs.readFileSync(m.preparedManagerOffer.source.marketPath)),m.preparedManagerOffer.source.marketGitBlob);
const marketClub=m.preparedManagerOffer.marketClub,prepared=m.preparedManagerOffer.offer;assert.deepEqual({club:prepared.club,country:prepared.country,tier:prepared.tier,league:prepared.league,budget:prepared.budget},{club:marketClub.name,country:marketClub.country,tier:marketClub.tier,league:marketClub.league,budget:marketClub.budget},'RUSSIA_NATIVE_ACTUAL_MARKET_TUPLE');
const references=pureReferences();
function parsedSave(raw){if(raw===null)return null;assert.equal(typeof raw,'string');const value=references.codec.parseSoccerCareerSave(raw);assert(references.codec.isSoccerCareerSave(value));assert.equal(references.codec.serializeSoccerCareerSave(value),raw,'RUSSIA_NATIVE_FULL_CODEC_ROUNDTRIP');return value;}
function inventory() {
  const rows = [];
  function walk(rel = '') { for (const e of fs.readdirSync(path.join(dist, rel), { withFileTypes: true })) { const file = path.posix.join(rel, e.name); if (e.isDirectory()) walk(file); else { assert(e.isFile()); const b = fs.readFileSync(path.join(dist, file)); rows.push({ file, bytes: b.length, sha256: sha(b) }); } } }
  walk(); return rows.sort((a, b) => a.file < b.file ? -1 : a.file > b.file ? 1 : 0);
}
assert.deepEqual(inventory(),m.distBefore);assert.equal(sha(JSON.stringify(m.distBefore)),m.distDigest);
const refs=new Map(m.distBefore.map(row=>[row.file,row])),observed=new Map(),activityMarker='[completions] activity insert failed (ignored):';
const activityRows=m.distBefore.filter(row=>row.file.startsWith('assets/')&&row.file.endsWith('.js')&&fs.readFileSync(path.join(dist,row.file),'utf8').includes(activityMarker));assert.equal(activityRows.length,1,'RUSSIA_NATIVE_ONE_ACTIVITY_COMPILED_OWNER');const activityOwner=activityRows[0];assert(refs.has('prerender-boot.js'));
const fixture=m.legacyFixture;assert(fixture&&path.isAbsolute(fixture.file));assert.equal(fixture.sourceNativeAdmission,m.admissions.originalNative);
const fixtureBytes=fs.readFileSync(fixture.file);assert.equal(fixtureBytes.length,31781);assert.equal(sha(fixtureBytes),'b4b65f686c5d5843a931da0d97ea47e847a3f684f66f2cf1b2769f70f168063b');const fixtureDecoded=gunzipSync(fixtureBytes);assert.equal(fixtureDecoded.length,139511);assert.equal(sha(fixtureDecoded),'60ccbf520b423f37a2eb2e7fc34b20076eefd3ac72ebbed7727631437db6e7e3');
const oldFrame=JSON.parse(fixtureDecoded);assert.equal(oldFrame.sequence,122);assert.equal(oldFrame.label,'Attributes complete saved career returned');assert.deepEqual(parsedSave(oldFrame.value.careerRaw),oldFrame.value.careerState);assert.equal(oldFrame.value.careerState.currentClub,'Jeonbuk Motors Youth');assert.equal(oldFrame.value.local['dukb-fence:soccerCareerSave'],'5');
fs.writeFileSync(path.join(out,'input','authentic-old-frame.json.gz'),fixtureBytes,{flag:'wx'});fs.writeFileSync(path.join(out,'input','authentic-old-frame.json'),fixtureDecoded,{flag:'wx'});
const report={schema:'RUSSIA_SC_NATIVE_BROWSER_V1',status:'incomplete',product:m.product,authority:{manifestSHA256:sha(fs.readFileSync(arg('--manifest'))),admissions:m.admissions,distDigest:m.distDigest},contexts:[],screenshots:[],scope:'Three natural current70 Russia player flows with one real youth year, actual parent contract and one playing season. Each then uses real retirement/manager creation, one explicitly prepared pending manager offer and actual job acceptance/season. One2005 preview and one authentic retained non-Russia save.23 ordinary targets. Provider activity attempts are physically aborted and retained as attempts. No all15 natural-draw, full16-row manager display, Russia promotion world, public or backend-write claim.'};
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
}function validateBlockedActivity(r,pw) {
 const marker='RUSSIA_NATIVE_ACTIVITY',url='https://flawuiqbvjobmkfkauhw.supabase.co/rest/v1/game_completions';
 assert.equal(pw.method,'POST',marker+' method');assert.equal(pw.url,url,marker+' exact endpoint');
 const phases=['russia-actual-next-year','russia-actual-next-season'];assert(phases.includes(pw.phase),marker+' source gesture');
 const gestures=(r.russiaProgression?.gestures??[]).filter(value=>value.label===pw.phase);assert.equal(gestures.length,1,marker+' exact actual gesture');const gesture=gestures[0];
 assert(gesture.playwrightRequestIDs.includes(pw.id),marker+' PW gesture parent');
 const native=r.nativeRequests.filter(value=>value.method==='POST'&&value.url===pw.url&&value.phase===pw.phase&&value.postData===pw.postData);assert.equal(native.length,1,marker+' exact native POST');const parent=native[0];assert(gesture.nativeRequestIDs.includes(parent.requestId),marker+' native gesture parent');
 assert.equal(typeof pw.postData,'string',marker+' raw POST body');const payload=JSON.parse(pw.postData),handle=gesture.before.value.local['dukb-display-name']||gesture.before.value.local['dukb-guest-handle'];assert.equal(typeof handle,'string');assert(handle.length>0);
 assert.deepEqual(payload,{game:'soccer-career',player_name:handle},marker+' payload');
 const aborts=r.aborts.filter(value=>value.id===pw.id&&value.method==='POST'&&value.url===pw.url&&value.phase===pw.phase);assert.equal(aborts.length,1,marker+' declared abort');assert.equal(aborts[0].reason,'existing offline policy',marker+' physical offline policy');
 const failures=r.failures.filter(value=>value.id===pw.id&&value.url===pw.url);assert.equal(failures.length,1,marker+' PW requestfailed');assert.equal(failures[0].error?.errorText,'net::ERR_BLOCKED_BY_CLIENT.Inspector',marker+' physical PW block');
 const nativeFailures=r.nativeEvents.filter(value=>value.kind==='loadingFailed'&&value.event.requestId===parent.requestId);assert.equal(nativeFailures.length,1,marker+' native completion');assert.equal(nativeFailures[0].event.errorText,'net::ERR_BLOCKED_BY_CLIENT.Inspector',marker+' native physical block');assert.equal(nativeFailures[0].event.blockedReason,'inspector',marker+' native inspector');assert.equal(nativeFailures[0].event.canceled,false,marker+' native cancellation');
 assert.equal(r.responses.filter(value=>value.id===pw.id).length,0,marker+' no PW response');assert.equal(r.nativeEvents.filter(value=>value.kind==='responseReceived'&&value.event.requestId===parent.requestId).length,0,marker+' no native response');
 const sources=readInitiatorSource(r,parent,pw);assert(sources.some(value=>r.assetBodies.find(body=>body.id===value.sourceRequestId)?.path===activityOwner.file),marker+' actual executed activity owner');
 return{pw,parent,gesture:{label:gesture.label,beforeSequence:gesture.before.sequence,afterSequence:gesture.after.sequence},declaredAbort:aborts[0],failure:failures[0],nativeFailure:nativeFailures[0],sourceBodies:sources,scope:'Actual attempted activity POST physically blocked. No provider write reached a response; raw attempts are retained and counted.'};
}
function linkedActivityPreflight(r,row,activities) {
 const marker='RUSSIA_NATIVE_ACTIVITY_PREFLIGHT';assert.equal(row.method,'OPTIONS',marker+' method');assert.equal(row.postData,null,marker+' empty body');assert.equal(row.initiator?.type,'preflight',marker+' initiator');
 const matches=activities.filter(value=>value.parent.requestId===row.initiator.requestId);assert.equal(matches.length,1,marker+' exact blocked parent');const activity=matches[0];assert.equal(row.url,activity.parent.url,marker+' URL');assert.equal(row.phase,activity.parent.phase,marker+' phase');assert.equal(row.initiator.url,row.url,marker+' initiator URL');
 const response=r.nativeEvents.filter(value=>value.kind==='responseReceived'&&value.event.requestId===row.requestId);assert.equal(response.length,1,marker+' actual preflight response');assert.equal(response[0].event.response.status,204,marker+' actual204');assert.equal(response[0].event.response.url,row.url,marker+' response URL');return{preflight:row,blockedActivity:activity,response:response[0],scope:'Only automatic empty CORS preflight reached a204; its actual source-owned POST parent was physically aborted.'};
}
function nativeRussiaCensus(r) {
 for(const row of r.nativeRequests)assert(['GET','HEAD','POST','OPTIONS'].includes(row.method),'RUSSIA_NATIVE_UNKNOWN_NATIVE_METHOD '+row.method);
 for(const row of r.requests)assert(['GET','HEAD','POST'].includes(row.method),'RUSSIA_NATIVE_UNKNOWN_PLAYWRIGHT_METHOD '+row.method);
 const activities=r.requests.filter(row=>row.method==='POST').map(row=>validateBlockedActivity(r,row));
 const expected=r.flow==='russia-current'?['russia-actual-next-year','russia-actual-next-season']:[];
 assert.deepEqual(activities.map(value=>value.pw.phase),expected,'RUSSIA_NATIVE_EXACT_PLAYER_ACTIVITY_GESTURES');
 assert.equal(r.nativeRequests.filter(row=>row.method==='POST').length,activities.length,'RUSSIA_NATIVE_NO_UNOWNED_NATIVE_POST');
 assert.deepEqual(r.aborts.filter(row=>!['GET','HEAD'].includes(row.method)).map(row=>row.id),activities.map(value=>value.pw.id),'RUSSIA_NATIVE_NO_UNOWNED_ABORT_METHOD');
 const preflights=r.nativeRequests.filter(row=>row.method==='OPTIONS').map(row=>activities.some(value=>value.parent.requestId===row.initiator?.requestId)?linkedActivityPreflight(r,row,activities):linkedNativeReadPreflight(r,row));
 const managerGestures=(r.russiaProgression?.gestures??[]).filter(value=>['russia-actual-become-manager','russia-actual-accept-manager-offer','russia-actual-next-manager-season'].includes(value.label)).map(value=>({label:value.label,playwrightRequestIDs:value.playwrightRequestIDs,nativeRequestIDs:value.nativeRequestIDs,actualMutationAttempts:r.requests.filter(row=>value.playwrightRequestIDs.includes(row.id)&&!['GET','HEAD'].includes(row.method)).length}));
 assert(managerGestures.every(value=>value.actualMutationAttempts===0),'RUSSIA_NATIVE_MANAGER_HANDLERS_NO_ACTIVITY_ATTEMPT');
 return{closed:true,playwrightMethods:r.requests.map(row=>({id:row.id,method:row.method,url:row.url})),nativeMethods:r.nativeRequests.map(row=>({requestId:row.requestId,method:row.method,url:row.url})),rawPlaywrightNonReadAttempts:writes(r),rawNativeNonGETHEAD:r.nativeRequests.filter(row=>!['GET','HEAD'].includes(row.method)).length,blockedActivityAttempts:activities,managerGestures,linkedPreflights:preflights,unownedMutations:0,providerWritesPassed:0,scope:'Source-owned attempted player activity writes are physically aborted, not erased from counts. Every other mutation/unknown method fails. Main-document/body/initiator and through-close census remain separate retained proof.'};
}
function activityCopiedControls(r) {
 if(r.flow!=='russia-current')return{status:'NO_PLAYER_ACTIVITY_NO_POSITIVE_CONTROL_CREDIT',controls:[]};const controls=[],actual=r.requests.find(row=>row.method==='POST');assert(actual);
 for(const kind of ['payload','abort']){
  const copy=clone(r),original=JSON.stringify(copy),pw=copy.requests.find(row=>row.id===actual.id);let restore;
  if(kind==='payload'){const native=copy.nativeRequests.find(row=>row.method==='POST'&&row.phase===pw.phase),beforePW=pw.postData,beforeNative=native.postData;pw.postData=JSON.stringify({...JSON.parse(pw.postData),score:0});native.postData=pw.postData;restore=()=>{pw.postData=beforePW;native.postData=beforeNative;};}
  else{const at=copy.aborts.findIndex(row=>row.id===pw.id),removed=copy.aborts.splice(at,1)[0];assert(at>=0&&removed);restore=()=>copy.aborts.splice(at,0,removed);}
  assert.notEqual(JSON.stringify(copy),original);const fault=kind==='payload'?{pw:clone(pw),native:clone(copy.nativeRequests.find(row=>row.method==='POST'&&row.phase===pw.phase))}:{aborts:clone(copy.aborts),actual:clone(pw)};let error;try{validateBlockedActivity(copy,pw);}catch(found){error=found;}
  assert(error instanceof assert.AssertionError);assert.match(error.message,kind==='payload'?/^RUSSIA_NATIVE_ACTIVITY payload/:/^RUSSIA_NATIVE_ACTIVITY declared abort/);restore();assert.equal(JSON.stringify(copy),original);validateBlockedActivity(copy,pw);
  controls.push({kind,fault,owned:{name:error.name,message:error.message},wholeInverseExact:true,actualHeld:true});
 }return{status:'COPIED_ACTUAL_ACTIVITY_GUARDS_PASSED',controls};
}
function assetControls(r) {
 const original=JSON.stringify(r),copy=clone(r),at=copy.assetBodies.findIndex(row=>row.path!=='prerender-boot.js');assert(at>=0,'Actual non-boot body exists for control');const[removed]=copy.assetBodies.splice(at,1);assert.notEqual(JSON.stringify(copy),original);let error;try{validateAssets(copy);}catch(found){error=found;}
 assert(error instanceof assert.AssertionError);assert.match(error.message,/^CM_TEAM_NATIVE_BODY_RECEIPT/);copy.assetBodies.splice(at,0,removed);assert.equal(JSON.stringify(copy),original);assert.equal(JSON.stringify(r),original);return{omitted:removed,owned:{name:error.name,message:error.message},changed:true,wholeInverseExact:true,actualHeld:true};
}
const photoLabels={'russia-current':['russia-current-academy','russia-current-youth','russia-parent-contract-review','russia-first-playing-season','russia-prepared-manager-offer','russia-accepted-manager-job','russia-manager-table'],'russia-historical':['russia-historical-academy'],'legacy-save':['authentic-old-save-restored']};
function validatePhotoCensus(r){assert.deepEqual(r.photos.map(row=>row.label),photoLabels[r.flow],'RUSSIA_NATIVE_COMPLETE_ORDINARY_PHOTOS');}
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
}
function validateAcademyReadout(readout,candidates){
 assert.equal(readout.children.length,1,'K_LEAGUE_NATIVE_SC_ONLY_FLAG_CHILD_EXCLUDED');assert.equal(readout.children[0].tag,'SPAN');
 const matches=candidates.filter(row=>readout.directText===row.name+' Youth');assert.equal(matches.length,1,'K_LEAGUE_NATIVE_SC_ELIGIBLE_ACADEMY');
 assert.deepEqual(readout.children[0].flagAlts,[matches[0].country],'RUSSIA_NATIVE_SC_ACADEMY_FLAG_COUNTRY');
 return matches[0];
}
function academyReadoutControls(actual,candidates){
 const before=JSON.stringify(actual),controls=[];
 for(const kind of['name','country']){
  const copy=clone(actual),old=kind==='name'?copy.directText:copy.children[0].flagAlts[0];
  if(kind==='name')copy.directText='Copied missing academy Youth';else copy.children[0].flagAlts[0]='Copied country';
  const fault=JSON.stringify(copy);assert.notEqual(fault,before);let owned;
  try{validateAcademyReadout(copy,candidates);}catch(error){owned=error;}
  assert(owned instanceof assert.AssertionError);assert.match(owned.message,kind==='name'?/^K_LEAGUE_NATIVE_SC_ELIGIBLE_ACADEMY/:/^RUSSIA_NATIVE_SC_ACADEMY_FLAG_COUNTRY/);
  if(kind==='name')copy.directText=old;else copy.children[0].flagAlts[0]=old;
  assert.equal(JSON.stringify(copy),before);assert.equal(JSON.stringify(actual),before);
  controls.push({kind,before:actual,fault:JSON.parse(fault),restored:copy,changed:true,wholeInverseExact:true,owned:{name:owned.name,message:owned.message},scope:'Copied actual DOM academy readout only.'});
 }
 return controls;
}
async function runRussiaCreation(p,r,api){
 const {flow,sample,press,photoBlock,drain,navigate,prepareControl,touchReach,idle,references,currentRussia,oldRussia}=api;
 assert(flow==='russia-current'||flow==='russia-historical');
 assert.equal(r.saveKey,'soccerCareerSave');assert.equal(r.allowSave,false);
 assert.equal(currentRussia.length,16);assert.equal(new Set(currentRussia).size,16);assert.deepEqual(oldRussia,['Zenit']);
 const current=flow==='russia-current',candidates=current?references.clubs:references.historicalAcademies,expected=candidates.map(row=>row.name);
 const expectedEra=current?'2026':'2005-09',expectedYear=current?2026:2005;
 const playerName=current?'Native Russia Current Tester':'Native Russia Historical Tester';
 const codec=references.codec;assert.equal(typeof codec.parseSoccerCareerSave,'function');assert.equal(typeof codec.serializeSoccerCareerSave,'function');assert.equal(typeof codec.isSoccerCareerSave,'function');
 const record={flow,naturalClock:true,naturalBrowserRng:true,expectedEra,expectedYear,steps:[],scope:'Actual creation controls and natural70 academy, domestic for current Russia and source-owned global fallback for2005. No forced club, repeated roll, model callback, RNG override or fabricated save. Later natural progression is a separate actor.'};
 r.russiaCreation=record;
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
 const target=list.getByRole('option',index===0?{name:/^Russia(?:\s+Russia)?$/}:{name:text,exact:true});await target.waitFor({state:'visible'});assert.equal(await target.count(),1);
 if(r.width<768){const label=target.locator(':scope > span').last();assert.equal(await label.count(),1);assert((await label.innerText()).includes(text));if(index===0)await reachNationalityOption(label);else await touchReach(p,r,label);await label.tap();}
 else{const wanted=await target.evaluate(n=>[...n.closest('[role="listbox"]').querySelectorAll('[role="option"]')].indexOf(n));assert(wanted>=0);await p.keyboard.press('Home');await idle(p);for(let i=0;i<wanted;i++){await p.keyboard.press('ArrowDown');await idle(p);}await p.waitForFunction(n=>n===document.activeElement||n.contains(document.activeElement),await target.elementHandle());await p.keyboard.press('Enter');}
 await idle(p);assert((await trigger.innerText()).includes(text));r.actions.push({type:'real-select',actor:r.actor,index,text});
}

 async function capture(label){await drain();const value=await sample(p,r,label);record.steps.push({label,sample:value});return value;}
 async function noSave(label){const value=await capture(label);assert.equal(value.value.careerRaw,null,'K_LEAGUE_NATIVE_SC_PREVIEW_NO_SAVE');return value;}
 await navigate('/soccer-career');await noSave(flow+' empty creation');
 await typeInto(p,r,p.getByPlaceholder('Enter your player name...'),playerName,'Actual Russia player name');await noSave(flow+' named');
 await selectOption(p,r,0,'Russia');await noSave(flow+' Russia selected');
 await selectOption(p,r,1,'Central Mid (CM)');await noSave(flow+' CM selected');
 await selectOption(p,r,2,current?'Current era (2026 start)':'Late 2000s (2005 start)');await noSave(flow+' era selected');
 await press(p,r,p.getByRole('button',{name:/Generate Starting Potential|Roll again/}),'Actual natural Russia starting roll');
 const customize=p.getByRole('button',{name:/Customize your build/});
 await customize.waitFor({state:'visible'});assert.equal(await customize.count(),1);await idle(p);
 await noSave(flow+' natural roll completed');
 await press(p,r,customize,'Open actual build editor for domestic academy request');
 const overall=p.getByRole('textbox',{name:'Starting overall',exact:true});
 await overall.waitFor({state:'visible'});assert.equal(await overall.count(),1);
 let value=Number(await overall.inputValue());assert(Number.isInteger(value)&&value>=40&&value<=99);
 record.naturalRolledOverall=value;record.overallSteps=[];
 for(let count=0;value!==70;count++){
  assert(count<60,'Source-bounded overall step count');
  const delta=value>70?(value-70>=5?-5:-1):(70-value>=5?5:1);
  const direction=delta<0?'down':'up',size=Math.abs(delta),before=await noSave(flow+' overall before '+count);
  await press(p,r,p.getByRole('button',{name:'Starting overall '+direction+' '+size,exact:true}),'Actual Starting overall '+direction+' '+size);
  const actual=Number(await overall.inputValue());assert.equal(actual,value+delta,'K_LEAGUE_NATIVE_SC_REAL_STEPPER_VALUE');
  const after=await noSave(flow+' overall after '+count);record.overallSteps.push({beforeValue:value,delta,afterValue:actual,before,after});value=actual;
 }
 assert.equal(await overall.inputValue(),'70');
 const lock=p.getByRole('button',{name:/Lock in build/});assert.equal(await lock.count(),1);assert.equal(await lock.isEnabled(),true);
 await press(p,r,lock,'Actual Lock in build at70');
 const begin=p.getByRole('button',{name:/Begin Career/});await begin.waitFor({state:'visible'});
 await p.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>/Begin Career/.test(b.textContent)&&!b.disabled));
 const stats=p.getByRole('heading',{name:'Starting Stats',exact:true}).locator('..');assert.equal(await stats.count(),1);
 assert.equal((await stats.locator(':scope > span').innerText()).trim(),'70','K_LEAGUE_NATIVE_SC_LOCKED_OVERALL');
 const academy=p.getByText('Academy Placement',{exact:true}).locator('..');await academy.waitFor({state:'visible'});assert.equal(await academy.count(),1);
 const nameElement=academy.locator('div.font-bold.text-sm.flex.items-center.gap-1');assert.equal(await nameElement.count(),1,'K_LEAGUE_NATIVE_SC_ACADEMY_NAME_OWNER');
 const nameReadout=await nameElement.evaluate(node=>({directText:[...node.childNodes].filter(child=>child.nodeType===Node.TEXT_NODE).map(child=>child.textContent).join('').trim(),children:[...node.children].map(child=>({tag:child.tagName,html:child.outerHTML,flagAlts:[...child.querySelectorAll('img')].map(img=>img.alt)})),html:node.outerHTML,fullText:node.textContent}));
 const chosenRow=validateAcademyReadout(nameReadout,candidates),chosen=chosenRow.name;
 record.academyOracleControls=academyReadoutControls(nameReadout,candidates);
 for(const row of references.clubs)if(row.accessHeld||!expected.includes(row.name))assert.notEqual(nameReadout.directText,row.name+' Youth','K_LEAGUE_NATIVE_SC_NO_HELD_OR_FUTURE_ACADEMY');
 record.preview={name:chosen,country:chosenRow.country,tuple:chosenRow,allEligible:expected.slice(),nameReadout,fullText:await academy.innerText(),snapshot:await noSave(flow+' actual70 academy preview')};
 await photoBlock(p,r,current?'russia-current-academy':'russia-historical-academy',academy,begin);
 await noSave(flow+' academy photo complete');
 if(!current){record.status='ACTUAL_HISTORICAL_PREVIEW_PASSED_NO_CAREER_COMMIT';return record;}
 r.allowSave=true;
 await press(p,r,begin,'Actual current Russia Begin Career');
 await p.waitForFunction(key=>localStorage.getItem(key)!==null,r.saveKey);await idle(p);
 const created=await capture(flow+' actual youth committed'),raw=created.value.careerRaw;
 assert.equal(typeof raw,'string');const state=codec.parseSoccerCareerSave(raw);assert(codec.isSoccerCareerSave(state));
 assert.deepEqual(state,created.value.careerState);assert.equal(codec.serializeSoccerCareerSave(state),raw,'K_LEAGUE_NATIVE_SC_COMPLETE_CODEC');
 assert.equal(state.playerName,playerName);assert.equal(state.nationality,'Russia');assert.equal(state.position,'CM');
 assert.equal(state.era,expectedEra);assert.equal(state.phase,'youth');assert.equal(state.seasons.length,1);assert.equal(state.seasons[0].year,expectedYear);
 assert.equal(state.overall,70);assert.equal(state.academyClubName,chosen);assert.equal(state.currentClub,chosen+' Youth','K_LEAGUE_NATIVE_SC_PREVIEW_BEGIN_IDENTITY');
 assert.equal(state.currentClubCountry,'Russia');assert.equal(state.currentClubTier,2);assert.equal(state.currentLeague,'Russian Premier League');assert(currentRussia.includes(state.academyClubName));
 record.created={sample:created,raw,state};r.allowSave=false;
 const youth=p.locator('div.bg-card.border.border-border.rounded-xl.p-4.flex.items-center.gap-4').filter({has:p.getByText('Youth Academy',{exact:true})});await youth.waitFor({state:'visible'});assert.equal(await youth.count(),1);
 const youthClub=youth.locator(':scope > div.flex-1.min-w-0 > div.font-bold');assert.equal(await youthClub.count(),1,'K_LEAGUE_NATIVE_SC_CURRENT_CLUB_OWNER');assert.equal(await youthClub.evaluate(node=>[...node.childNodes].filter(child=>child.nodeType===Node.TEXT_NODE).map(child=>child.textContent).join('').trim()),chosen+' Youth','K_LEAGUE_NATIVE_SC_CURRENT_CLUB_IDENTITY');
 await photoBlock(p,r,'russia-current-youth',youth,p.getByRole('button',{name:'Open your phone',exact:true}));
 const after=await capture(flow+' youth photo complete');assert.equal(after.value.careerRaw,raw);assert.deepEqual(after.value.careerState,state);
 record.status='ACTUAL_CURRENT_PREVIEW_AND_YOUTH_PASSED';return record;
}

function validateRussiaPlayingRow(row, club) {
 const marker='RUSSIA_NATIVE_ACTUAL_PLAYING_ROW';
 assert.equal(row.type,'playing',marker+' type');assert.equal(row.club,club,marker+' club');
 assert.equal(row.clubCountry,'Russia',marker+' country');assert(Number.isInteger(row.year)&&row.year>=2026,marker+' year');
 assert(Number.isInteger(row.leagueApps)&&row.leagueApps>=0&&row.leagueApps<=30,marker+' leagueApps30');
 assert(Number.isInteger(row.apps)&&row.apps>=row.leagueApps,marker+' total apps');
 assert.equal(row.championsLeague,false,marker+' no UEFA title');
 assert(!row.clubCupRun?.qualified,marker+' no qualified club cup');
 if(row.leagueSize!==undefined)assert.equal(row.leagueSize,16,marker+' size16');
 else assert.equal(row.injurySevere,true,marker+' source-owned missing personal finish');
 return{year:row.year,club:row.club,leagueApps:row.leagueApps,apps:row.apps,leagueSize:row.leagueSize??null,injurySevere:row.injurySevere===true};
}
function validateRussiaManagerResult(row, club) {
 const marker='RUSSIA_NATIVE_ACTUAL_MANAGER_TABLE';
 assert.equal(row.club,club,marker+' accepted club');assert.equal(row.league,'Russian Premier League',marker+' league');
 assert.equal(row.leagueSize,16,marker+' size16');assert.equal(row.sizeVerified,true,marker+' verified size');
 assert(Number.isInteger(row.playerPos)&&row.playerPos>=1&&row.playerPos<=16,marker+' position');
 const record=/^(\d+)W (\d+)D (\d+)L$/.exec(row.record);assert(record,marker+' record shape');
 const [wins,draws,losses]=record.slice(1).map(Number);assert.equal(wins+draws+losses,30,marker+' games30');
 assert.equal(wins*3+draws,row.playerPts,marker+' recorded points');
 assert(Array.isArray(row.table)&&row.table.length===5,marker+' leaders and own-row window');
 const me=row.table.filter(value=>value.you===true);assert.equal(me.length,1,marker+' own row');assert.equal(me[0].club,club,marker+' own club');assert.equal(me[0].pos,row.playerPos);assert.equal(me[0].pts,row.playerPts);
 return{club,league:row.league,size:row.leagueSize,record:row.record,games:wins+draws+losses,actualWindow:row.table};
}
function russiaOutcomeCopiedControls(playing,manager,club) {
 const controls=[];
 for(const kind of ['leagueApps','managerSize']){
  const source=kind==='leagueApps'?playing:manager,copy=JSON.parse(JSON.stringify(source)),before=JSON.stringify(copy),key=kind==='leagueApps'?'leagueApps':'leagueSize',old=copy[key];copy[key]=kind==='leagueApps'?31:17;const fault=JSON.parse(JSON.stringify(copy));assert.notEqual(JSON.stringify(copy),before);let error;
  try{if(kind==='leagueApps')validateRussiaPlayingRow(copy,playing.club);else validateRussiaManagerResult(copy,club);}catch(found){error=found;}
  assert(error instanceof assert.AssertionError);assert.match(error.message,kind==='leagueApps'?/^RUSSIA_NATIVE_ACTUAL_PLAYING_ROW leagueApps30/:/^RUSSIA_NATIVE_ACTUAL_MANAGER_TABLE size16/);
  copy[key]=old;assert.equal(JSON.stringify(copy),before);assert.equal(JSON.stringify(source),before);
  controls.push({kind,actual:source,fault,owned:{name:error.name,message:error.message},wholeInverseExact:true,actualHeld:true,scope:'Copied actual saved outcome data, not a physical model fault.'});
 }
 return controls;
}
async function runRussiaProgression(p,r,api) {
 const {sample,press,photoBlock,drain,idle,references,preparedManagerOffer}=api,codec=references.codec;
 const creation=r.russiaCreation;assert(creation?.created&&creation.status==='ACTUAL_CURRENT_PREVIEW_AND_YOUTH_PASSED');
 const chosen=creation.preview.name,record={status:'incomplete',steps:[],observations:[],gestures:[],preparation:null,scope:'Natural current player progression and one explicitly prepared pending manager offer accepted by real UI. No model/RNG/source override.'};r.russiaProgression=record;
 const copy=v=>JSON.parse(JSON.stringify(v));
 async function capture(label){await drain();await idle(p);const full=await sample(p,r,label);assert.equal(codec.serializeSoccerCareerSave(full.value.careerState),full.value.careerRaw,'RUSSIA_NATIVE_FULL_SAVE_ROUNDTRIP');record.steps.push(full);return full;}
 async function waitState(predicate,label){
  const deadline=Date.now()+30000;let last=null;
  while(Date.now()<deadline){const raw=await p.evaluate(key=>localStorage.getItem(key),r.saveKey);assert.equal(typeof raw,'string');const state=codec.parseSoccerCareerSave(raw);assert(codec.isSoccerCareerSave(state));assert.equal(codec.serializeSoccerCareerSave(state),raw);
   if(raw!==last){record.observations.push({label,raw,state});last=raw;}if(predicate(state))return;await p.waitForTimeout(50);
  }assert.fail('RUSSIA_NATIVE_EXPECTED_REAL_TRANSITION '+label);
 }
 async function action(label,target,predicate){
  const before=await capture(label+' before'),requestAt=r.requests.length,nativeAt=r.nativeRequests.length;r.phase=label;r.allowSave=true;
  try{await press(p,r,target,label);await waitState(predicate,label);await drain();const after=await capture(label+' after');assert.notEqual(after.value.careerRaw,before.value.careerRaw,'RUSSIA_NATIVE_REAL_ACTION_CHANGED_SAVE');record.gestures.push({label,before,after,playwrightRequestIDs:r.requests.slice(requestAt).map(value=>value.id),nativeRequestIDs:r.nativeRequests.slice(nativeAt).map(value=>value.requestId)});return after;}finally{r.allowSave=false;}
 }
 async function heldPhoto(label,target,anchor){const before=await capture(label+' before');await photoBlock(p,r,label,target,anchor);const after=await capture(label+' after');assert.equal(after.value.careerRaw,before.value.careerRaw);assert.deepEqual(after.value.careerState,before.value.careerState);assert.deepEqual(after.value.local,before.value.local);assert.deepEqual(after.value.session,before.value.session);return after;}
 const youth=creation.created.state;assert.equal(youth.age,16);assert.equal(youth.phase,'youth');
 const offered=await action('russia-actual-next-year',p.getByRole('button',{name:'Next Year',exact:true}),state=>state.phase==='contract_offer'&&state.age===17);
 assert.equal(offered.value.careerState.seasons.length,youth.seasons.length+1);
 const offers=offered.value.careerState.pendingOffers.filter(value=>value.club.name===chosen);assert.equal(offers.length,1,'RUSSIA_NATIVE_ACTUAL_PARENT_OFFER');const offer=copy(offers[0]);assert.equal(offer.isHomegrown,true);assert.equal(offer.club.country,'Russia');assert.equal(offer.club.league,'Russian Premier League');
 const reviewTrigger=p.getByRole('button',{name:'Review contract with '+chosen,exact:true});await reviewTrigger.waitFor({state:'visible'});assert.equal(await reviewTrigger.count(),1);
 r.phase='russia-actual-parent-review';const beforeReview=await capture('before actual parent review');await press(p,r,reviewTrigger,'Review actual academy parent contract');
 const dialog=p.locator('[data-soccer-offer-review]');await dialog.waitFor({state:'visible'});assert.equal(await dialog.count(),1);assert.equal((await dialog.locator('[data-offer-club]').textContent()).trim(),chosen);
 const wage=Number(await dialog.locator('[data-offer-signed-wage]').getAttribute('data-offer-signed-wage')),years=Number(await dialog.locator('[data-offer-contract-years]').getAttribute('data-offer-contract-years'));
 assert(Number.isFinite(wage)&&wage>0);assert.equal(years,offer.contractYears);await heldPhoto('russia-parent-contract-review',dialog,dialog.getByRole('button',{name:'Sign contract',exact:true}));
 const afterReview=await capture('actual parent review remains unaccepted');assert.equal(afterReview.value.careerRaw,beforeReview.value.careerRaw);assert.deepEqual(afterReview.value.local,beforeReview.value.local);assert.deepEqual(afterReview.value.session,beforeReview.value.session);
 const signed=await action('russia-actual-parent-sign',dialog.getByRole('button',{name:'Sign contract',exact:true}),state=>state.phase==='playing'&&state.currentClub===chosen);
 assert.equal(signed.value.careerState.currentClubCountry,'Russia');assert.equal(signed.value.careerState.currentLeague,'Russian Premier League');assert.equal(signed.value.careerState.currentClubTier,offer.club.tier);assert.equal(signed.value.careerState.weeklyWage,wage);assert.equal(signed.value.careerState.contractYearsLeft,years);assert.deepEqual(signed.value.careerState.pendingOffers,[]);assert.deepEqual(signed.value.careerState.seasons,offered.value.careerState.seasons);
 const length=signed.value.careerState.seasons.length,played=await action('russia-actual-next-season',p.getByRole('button',{name:'Next Season',exact:true}),state=>state.seasons.length===length+1&&state.seasons.at(-1)?.type==='playing');
 const playing=copy(played.value.careerState.seasons.at(-1));record.playing=validateRussiaPlayingRow(playing,chosen);assert.equal(playing.year,signed.value.careerState.seasons.at(-1).year+1);assert(!played.value.careerState.lastUCLResult?.qualified,'RUSSIA_NATIVE_NO_CURRENT_QUALIFIED_UEFA_CAMPAIGN');
 const timeline=p.locator('[data-timeline-season="'+playing.year+'"]');assert.equal(await timeline.count(),1);const retire=p.getByRole('button',{name:'🚪 Retire',exact:true});assert.equal(await retire.count(),1);
 await heldPhoto('russia-first-playing-season',timeline,retire);
 r.phase='russia-actual-retirement-dialog';const beforeRetire=await capture('before actual retirement confirmation');await press(p,r,retire,'Open real retirement confirmation');
 const retireDialog=p.getByRole('dialog',{name:'Retire?',exact:true});await retireDialog.waitFor({state:'visible'});assert.equal(await retireDialog.count(),1);const waitingRetire=await capture('actual retirement dialog leaves save unchanged');assert.equal(waitingRetire.value.careerRaw,beforeRetire.value.careerRaw);
 const retired=await action('russia-actual-confirm-retirement',retireDialog.getByRole('button',{name:'Confirm Retirement',exact:true}),state=>state.phase==='retirement_ceremony'&&state.retired===true);
 const become=p.getByRole('button',{name:'📋 Become a Manager',exact:true});await become.waitFor({state:'visible'});assert.equal(await become.count(),1);
 const naturalManager=await action('russia-actual-become-manager',become,state=>state.phase==='manager_season'&&state.managerState!==null);
 assert.equal(naturalManager.value.careerState.managerState.season,0);assert.deepEqual(naturalManager.value.careerState.seasons,retired.value.careerState.seasons);
 const tuple=preparedManagerOffer;assert(tuple&&references.currentRussia.includes(tuple.club));assert.equal(tuple.country,'Russia');assert.equal(tuple.league,'Russian Premier League');assert(Number.isInteger(tuple.tier)&&tuple.tier>=1&&tuple.tier<=4);assert(Number.isFinite(tuple.budget)&&tuple.budget>=0);
 const briefs={1:'Win the league. Nothing else counts.',2:'Get us into Europe.',3:'Mid table is fine. Stability is the job.',4:'Stay up. That is the whole brief.'};
 assert.equal(tuple.brief,briefs[tuple.tier]);assert.equal(tuple.reason,'They wanted someone who knows the country and the league.');
 assert.deepEqual(Object.keys(tuple).sort(),['club','country','tier','league','brief','reason','budget'].sort());
 const beforePreparation=await capture('complete real manager input before explicit prepared offer'),preparedState=copy(beforePreparation.value.careerState),originalManager=copy(preparedState.managerState);
 preparedState.managerState.unemployed=true;preparedState.managerState.seasonsOut=0;preparedState.managerState.offers=[copy(tuple)];
 const inverse=copy(preparedState);inverse.managerState=originalManager;assert.deepEqual(inverse,beforePreparation.value.careerState,'RUSSIA_NATIVE_PREPARED_OFFER_WHOLE_INVERSE');
 const preparedRaw=codec.serializeSoccerCareerSave(preparedState);assert.notEqual(preparedRaw,beforePreparation.value.careerRaw);assert.deepEqual(codec.parseSoccerCareerSave(preparedRaw),preparedState);
 record.preparation={scope:'Explicit prepared pending-offer UI boundary. This offer was not naturally drawn. Active manager job tuple and all other state are unchanged before real Accept.',before:beforePreparation,afterRaw:preparedRaw,afterState:preparedState,changedPaths:['managerState.unemployed','managerState.seasonsOut','managerState.offers'],inverseRaw:codec.serializeSoccerCareerSave(inverse),wholeInverseExact:true,tupleSource:api.preparedManagerOfferSource};
 assert.equal(record.preparation.inverseRaw,beforePreparation.value.careerRaw);
 const fence='dukb-fence:soccerCareerSave',oldFence=beforePreparation.value.local[fence];assert(/^[1-9]\d*$/.test(oldFence));const documents=r.documentRequests.length;r.phase='russia-prepared-manager-document';r.allowSave=true;
 try{
  await Promise.all([p.waitForNavigation({waitUntil:'domcontentloaded'}),p.evaluate(({key,raw})=>{localStorage.setItem(key,raw);location.reload();},{key:r.saveKey,raw:preparedRaw})]);
  await p.getByRole('heading',{name:'OUT OF WORK',exact:true}).waitFor({state:'visible'});await waitState(state=>state.phase==='manager_season'&&state.managerState?.unemployed===true,'explicit prepared offer load');await drain();
  const loaded=await capture('actual prepared manager document loaded');assert.equal(r.documentRequests.length,documents+1);assert.equal(loaded.value.careerRaw,preparedRaw,'RUSSIA_NATIVE_PREPARED_RAW_LOAD_HELD');assert.deepEqual(loaded.value.careerState,preparedState);
  assert.deepEqual(loaded.value.local,{...beforePreparation.value.local,[r.saveKey]:preparedRaw,[fence]:String(Number(oldFence)+1)},'RUSSIA_NATIVE_PREPARED_DOCUMENT_EXACT_AUTOSAVE_FENCE');assert.deepEqual(loaded.value.session,beforePreparation.value.session);assert.equal(loaded.value.url,beforePreparation.value.url);record.preparation.actualLoaded=loaded;
 }finally{r.allowSave=false;}
 const heading=p.getByRole('heading',{name:'📋 Manager Career',exact:true});assert.equal(await heading.count(),1);const panel=heading.locator('..').locator('..'),button=panel.getByRole('button').filter({has:p.getByText(tuple.club,{exact:true})});assert.equal(await button.count(),1,'RUSSIA_NATIVE_ONE_REAL_MANAGER_OFFER_BUTTON');
 const motionSnapshot=()=>panel.evaluate(node=>node.getAnimations({subtree:true}).map(animation=>({name:animation.animationName??null,playState:animation.playState,pending:animation.pending,timing:{delay:animation.effect.getTiming().delay,duration:animation.effect.getTiming().duration,iterations:animation.effect.getTiming().iterations}})));
 record.preparation.offerMotion={before:await motionSnapshot()};
 await p.waitForFunction(node=>node.getAnimations({subtree:true}).every(animation=>animation.playState==='finished'),await panel.elementHandle());
 record.preparation.offerMotion.after=await motionSnapshot();record.preparation.offerMotion.finishedBeforeGeometry=true;
 assert((await button.textContent()).includes(tuple.brief));assert((await button.textContent()).includes(tuple.reason));await heldPhoto('russia-prepared-manager-offer',button,button);
 const accepted=await action('russia-actual-accept-manager-offer',button,state=>state.managerState?.unemployed===false&&state.managerState?.club===tuple.club),manager=accepted.value.careerState.managerState;
 assert.equal(manager.clubTier,tuple.tier);assert.equal(manager.league,tuple.league);assert.equal(manager.seasonsOut,0);assert.deepEqual(manager.offers,[]);assert.equal(manager.offerNote,undefined);assert.equal(manager.season,preparedState.managerState.season);
 assert.deepEqual(manager.seasonResults.slice(0,-1),preparedState.managerState.seasonResults);assert.deepEqual(manager.seasonResults.at(-1),{year:manager.season,club:tuple.club,tier:tuple.tier,result:'Took the '+tuple.club+' job. '+tuple.brief,trophy:false});
 const withoutManager=copy(accepted.value.careerState);withoutManager.managerState=copy(preparedState.managerState);assert.deepEqual(withoutManager,preparedState,'RUSSIA_NATIVE_ACCEPT_ONLY_SOURCE_OWNED_MANAGER_STATE');
 const nextManager=p.getByRole('button',{name:'Next Manager Season',exact:true});await nextManager.waitFor({state:'visible'});await heldPhoto('russia-accepted-manager-job',panel,nextManager);
 const resultCount=manager.seasonResults.length,season=await action('russia-actual-next-manager-season',nextManager,state=>state.managerState?.season===manager.season+1&&state.managerState.seasonResults.length===resultCount+1);
 const managerResult=copy(season.value.careerState.managerState.seasonResults.at(-1));record.managerResult=validateRussiaManagerResult(managerResult,tuple.club);
 const ownRecord=panel.getByText(managerResult.record,{exact:true});assert.equal(await ownRecord.count(),1);const table=ownRecord.locator('..').locator('..');assert((await table.textContent()).includes('Russian Premier League'));
 for(const row of managerResult.table){assert(references.currentRussia.includes(row.club));assert.equal(await table.getByText(row.club,{exact:true}).count(),1);}
 await heldPhoto('russia-manager-table',table,p.getByRole('button',{name:/^(?:Next Manager Season|Sit Out A Season)$/,exact:true}));
 record.controls=russiaOutcomeCopiedControls(playing,managerResult,tuple.club);record.final=await capture('complete Russia player and prepared-manager outcomes');record.status='passed';return record;
}

async function runRetainedLegacy(p,r,navigate,drain) {
 r.allowSave=true;await navigate('/soccer-career');await p.getByRole('button',{name:'Open your phone',exact:true}).waitFor({state:'visible'});await drain();await idle(p);const loaded=await sample(p,r,'authentic complete old save restored');
 assert.equal(loaded.value.careerRaw,oldFrame.value.careerRaw,'RUSSIA_NATIVE_LEGACY_FULL_RAW_HELD');assert.deepEqual(loaded.value.careerState,oldFrame.value.careerState);
 assert.deepEqual(loaded.value.local,{...oldFrame.value.local,['dukb-fence:'+KEY]:'6'},'RUSSIA_NATIVE_LEGACY_ONLY_DOCUMENT_FENCE');assert.deepEqual(loaded.value.session,oldFrame.value.session);assert.equal(r.documentRequests.length,1);
 r.allowSave=false;r.legacy={status:'incomplete',sourceInput:fixture,completeOriginalFrame:'input/authentic-old-frame.json',loaded,scope:'Authentic retained Jeonbuk Motors Youth save. No Zenit, Russia or natural-manager input claim.'};
 const youth=p.locator('div.bg-card.border.border-border.rounded-xl.p-4.flex.items-center.gap-4').filter({has:p.getByText('Youth Academy',{exact:true})});assert.equal(await youth.count(),1);await photoBlock(p,r,'authentic-old-save-restored',youth,p.getByRole('button',{name:'Open your phone',exact:true}));
 r.phase='legacy-actual-attributes-open';const before=await sample(p,r,'old save before actual read-only attributes');await press(p,r,p.getByRole('button',{name:/^Full attributes/}),'Read actual old save attributes');
 await p.getByRole('heading',{name:oldFrame.value.careerState.playerName+', full attributes',exact:true}).waitFor({state:'visible'});await drain();const opened=await sample(p,r,'old save actual attributes');assert.equal(opened.value.careerRaw,before.value.careerRaw);assert.deepEqual(opened.value.local,before.value.local);assert.deepEqual(opened.value.session,before.value.session);assert.equal(r.documentRequests.length,1);
 await press(p,r,p.getByRole('button',{name:'← Back',exact:true}),'Actual old save attributes Back');await p.getByRole('button',{name:/^Full attributes/}).waitFor({state:'visible'});await drain();const returned=await sample(p,r,'old save actual Back complete');
 assert.equal(returned.value.careerRaw,loaded.value.careerRaw);assert.deepEqual(returned.value.careerState,loaded.value.careerState);assert.deepEqual(returned.value.local,loaded.value.local);assert.deepEqual(returned.value.session,loaded.value.session);assert.equal(r.documentRequests.length,1);
 const original=JSON.stringify(returned),copy=clone(returned);copy.value.careerRaw=copy.value.careerRaw+' ';assert.notEqual(JSON.stringify(copy),original);let error;try{assert.equal(copy.value.careerRaw,loaded.value.careerRaw,'RUSSIA_NATIVE_LEGACY_FULL_RAW_HELD');}catch(found){error=found;}assert(error instanceof assert.AssertionError);assert.match(error.message,/^RUSSIA_NATIVE_LEGACY_FULL_RAW_HELD/);copy.value.careerRaw=returned.value.careerRaw;assert.equal(JSON.stringify(copy),original);assert.equal(JSON.stringify(returned),original);
 r.legacy.control={changed:true,owned:{name:error.name,message:error.message},wholeInverseExact:true,actualHeld:true};r.legacy.returned=returned;r.legacy.status='passed';
}

const browser=await chromium.launch({headless:true});
async function journey(width,flow){
 const r={id:'russia-'+flow+'-'+width,flow,saveKey:KEY,allowSave:false,width,height:width===390?844:900,actor:width<768?'touch':'keyboard',status:'incomplete',phase:'initial',actions:[],frames:[],traces:[],photos:[],requests:[],responses:[],failures:[],aborts:[],assetBodies:[],assetErrors:[],console:[],pageErrors:[],navigations:[],documentRequests:[],documentBodies:[],nativeRequests:[],nativeEvents:[],inputEvents:[]};report.contexts.push(r);
 const c=await browser.newContext({viewport:{width,height:r.height},deviceScaleFactor:1,isMobile:width<768,hasTouch:width<768,serviceWorkers:'block'}),p=await c.newPage();p.setDefaultTimeout(15000);p.setDefaultNavigationTimeout(30000);
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
  if(flow==='legacy-save'){
   await c.addInitScript(({origin,input})=>{if(location.origin!==origin)return;for(const[key,value]of Object.entries(input.local))localStorage.setItem(key,value);for(const[key,value]of Object.entries(input.session))sessionStorage.setItem(key,value);},{origin,input:{local:oldFrame.value.local,session:oldFrame.value.session}});
   r.phase='legacy-actual-document';await runRetainedLegacy(p,r,navigate,drain);
  }else{
   r.phase=flow+'-actual-creation';await runRussiaCreation(p,r,{flow,sample,press,photoBlock,drain,navigate,prepareControl,touchReach,idle,references,currentRussia:references.currentRussia,oldRussia:references.oldRussia});
   if(flow==='russia-current')await runRussiaProgression(p,r,{sample,press,photoBlock,drain,idle,references,preparedManagerOffer:m.preparedManagerOffer.offer,preparedManagerOfferSource:m.preparedManagerOffer.source});
  }
  validatePhotoCensus(r);r.status='passed';
 }catch(error){r.status='failed';r.error={name:error.name,message:error.message,stack:error.stack};try{await sample(p,r,'failure full state');const file=r.id+'-failure.png';await p.screenshot({path:path.join(out,file)});r.failureScreenshot=file;}catch(captureError){r.captureError=String(captureError.stack||captureError);}}
 finally{
  try{await drain();}catch(error){r.assetErrors.push({message:String(error.stack||error),phase:'finally drain'});}
  try{r.finalDOMTrace=await p.evaluate(()=>window.__cmNativeTrace);assert.equal(r.finalDOMTrace.overflow,false);}catch(error){r.status='failed';r.traceError=String(error.stack||error);}
  await c.close();await Promise.all([...reads]);
  try{r.finalNativeCensus=nativeRussiaCensus(r);r.activityControls=activityCopiedControls(r);validateAssets(r);r.assetControls=assetControls(r);validateDocuments(r);r.documentControl=documentControl(r);
   const expectedResource=e=>/^Failed to load resource: net::ERR_(?:BLOCKED_BY_CLIENT(?:\.Inspector)?|FAILED)$/.test(e.text)&&r.aborts.some(value=>value.url===e.location.url);
   r.expectedConsole=r.console.filter(e=>e.type==='error'&&expectedResource(e));r.unexpectedConsole=r.console.filter(e=>e.type==='error'&&!expectedResource(e));r.unexpectedPageErrors=r.pageErrors.slice();r.unexpectedExternalAborts=r.aborts.filter(row=>row.origin!==origin&&!known.has(row.origin.replace(/^ws/,'http')));r.localHttpErrors=r.responses.filter(row=>new URL(row.url).origin===origin&&row.status>=400);
   assert.equal(r.unexpectedConsole.length,0);assert.equal(r.unexpectedPageErrors.length,0);assert.equal(r.unexpectedExternalAborts.length,0);assert.equal(r.localHttpErrors.length,0);assert(r.inputEvents.length<=15000,'CM_TEAM_NATIVE_EVENT_BOUND');silent();
  }catch(error){r.status='failed';r.classificationError=String(error.stack||error);}
  write('report.json',report);
 }
}
try{for(const width of [320,390,1280])await journey(width,'russia-current');await journey(390,'russia-historical');await journey(390,'legacy-save');}
finally{try{sourceHeld();assert.deepEqual(inventory(),m.distBefore);assert(fs.readFileSync(fixture.file).equals(fixtureBytes));silent();report.sourceHeld=true;report.distHeld=true;report.fixtureHeld=true;}catch(error){report.finalHoldError=String(error.stack||error);}await browser.close();report.status=report.contexts.length===5&&report.screenshots.length===23&&report.contexts.every(row=>row.status==='passed')&&report.sourceHeld&&report.distHeld&&report.fixtureHeld?'passed':'failed';write('report.json',report);}
assert.equal(report.status,'passed','RUSSIA_NATIVE_FIVE_CONTEXTS_AND23ORDINARY_PHOTOS');
console.log('Russia scoped native: three natural70 current player careers, explicit prepared-manager offers accepted through actual UI, one historical preview and one authentic old non-Russia save. Full source/dist/save inputs retained, activity attempts physically blocked. No public or backend-write claim.');
