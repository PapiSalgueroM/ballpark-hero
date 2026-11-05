import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const [manifestFile, distArg, outArg, base, phase] = process.argv.slice(2);
assert(manifestFile&&distArg&&outArg&&base&&['before','after'].includes(phase));
const dist=path.resolve(distArg),out=path.resolve(outArg),m=JSON.parse(await fs.readFile(manifestFile));
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const html=await fs.readFile(path.join(dist,'index.html'),'utf8'),routeReference=await fs.readFile(path.join(dist,'nba-my-career/index.html'),'utf8');
const rows=[],dir=path.join(out,'served-'+phase);await fs.mkdir(dir,{recursive:true});
await fs.writeFile(path.join(dir,'reference-index.html'),html,{flag:'wx'});
await fs.writeFile(path.join(dir,'reference-nba-my-career.html'),routeReference,{flag:'wx'});
const captured=await Promise.allSettled([['/','index.html'],['/nba-my-career','nba-my-career.html']].map(async([route,file])=>{
 const response=await fetch(new URL(route,base),{headers:{'cache-control':'no-cache'},signal:AbortSignal.timeout(20000)});
 const bytes=Buffer.from(await response.arrayBuffer());await fs.writeFile(path.join(dir,file),bytes,{flag:'wx'});
 return {response,html:bytes.toString('utf8'),file,bytes:bytes.length,sha256:sha(bytes)};
}));
await fs.writeFile(path.join(dir,'html-capture.json'),JSON.stringify(captured.map((r,i)=>r.status==='fulfilled'
 ?{route:i===0?'/':'/nba-my-career',status:r.value.response.status,file:r.value.file,bytes:r.value.bytes,sha256:r.value.sha256}
 :{route:i===0?'/':'/nba-my-career',error:String(r.reason?.stack||r.reason)}),null,2)+'\n',{flag:'wx'});
for(const r of captured)assert.equal(r.status,'fulfilled','Actual HTML capture completed before validation');
const response=captured[0].value.response,servedHtml=captured[0].value.html,routeResponse=captured[1].value.response,routeHtml=captured[1].value.html;
assert.equal(response.status,200);assert.equal(routeResponse.status,200);
function htmlShape(text){
 const clean=text.replace(/<!--[\s\S]*?-->/g,'');
 const scripts=[...clean.matchAll(/<script\b([^>]*)>[\s\S]*?<\/script\s*>/gi)].map(m=>{
  const src=/(?:^|\s)src\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(m[1]),type=/(?:^|\s)type\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(m[1]);
  return {tag:m[0],src:src?(src[1]??src[2]):null,type:type?(type[1]??type[2]).toLowerCase():null};
 });
 const body=clean.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi,'');
 return {scripts,modules:scripts.filter(s=>s.type==='module'),snapshot:/<div\b[^>]*\sid\s*=\s*(?:"dukb-snapshot"|'dukb-snapshot')[^>]*>/i.test(body)};
}
function validateHtml(rootRef,routeRef,rootActual,routeActual){
 const rr=htmlShape(rootRef),rp=htmlShape(routeRef),ar=htmlShape(rootActual),ap=htmlShape(routeActual),entries=rr.modules.map(s=>s.src);
 assert.equal(entries.length,1,'NBA_2004_ASSET_REFERENCE_ROOT_ENTRY');
 assert.match(entries[0],/^\/assets\/index-[^/?#]+\.js$/,'NBA_2004_ASSET_REFERENCE_ROOT_ENTRY_SHAPE');
 assert.deepEqual(rp.modules.map(s=>s.src),entries,'NBA_2004_ASSET_REFERENCE_ROUTE_CURRENT_ENTRY');
 assert(rp.snapshot,'NBA_2004_ASSET_REFERENCE_ROUTE_SNAPSHOT');assert(rp.scripts.some(s=>s.src==='/prerender-boot.js'),'NBA_2004_ASSET_REFERENCE_ROUTE_STABLE_BOOT');
 assert.deepEqual(ar.modules.map(s=>s.src),entries,'NBA_2004_ASSET_ROOT_CURRENT_ENTRY');
 assert.deepEqual(ap.modules.map(s=>s.src),rp.modules.map(s=>s.src),'NBA_2004_ASSET_ROUTE_CURRENT_ENTRY');
 assert(ap.snapshot,'NBA_2004_ASSET_ROUTE_SNAPSHOT');assert(ap.scripts.some(s=>s.src==='/prerender-boot.js'),'NBA_2004_ASSET_ROUTE_STABLE_BOOT');
 return {entries,routeEntries:ap.modules.map(s=>s.src)};
}
const positive=validateHtml(html,routeReference,html,routeReference),tag=htmlShape(routeReference).modules[0].tag;
assert.equal(routeReference.split(tag).length-1,1,'Unique actual current module script tag');
const staleEntry='/assets/index-nba-2004-stale-control.js',staleTag=tag.replace(positive.entries[0],staleEntry),stale=routeReference.replace(tag,staleTag);
assert.notEqual(staleTag,tag);assert.notEqual(stale,routeReference);assert.deepEqual(htmlShape(stale).modules.map(s=>s.src),[staleEntry]);
await fs.writeFile(path.join(dir,'nba-my-career-stale-entry-control.html'),stale,{flag:'wx'});
let rejected=null;try{validateHtml(html,routeReference,html,stale);}catch(error){rejected=error;}
assert(rejected instanceof assert.AssertionError,'Copied stale HTML must fail its actual entry validator');
assert.match(rejected.message,/^NBA_2004_ASSET_ROUTE_CURRENT_ENTRY/,'Owned stale-entry assertion, not setup failure');
assert.equal(stale.replace(staleTag,tag),routeReference,'Copied HTML control restores every original byte');
await fs.writeFile(path.join(dir,'html-control.json'),JSON.stringify({positive,changed:true,originalSHA256:sha(routeReference),faultSHA256:sha(stale),
 staleEntry,ownedFailure:{name:rejected.name,message:rejected.message},wholeInverseExact:true,scope:'Copied authentic completed HTML only. Same validator rejects the changed real script tag; actual HTTP responses are never mocked.'},null,2)+'\n',{flag:'wx'});
const {entries}=validateHtml(html,routeReference,servedHtml,routeHtml);
const critical=m.distBefore.filter(row=>/^assets\/(?:index-|NbaMyCareer-|NbaHistoricalDraftClass-).*\.js$/.test(row.file)||/^assets\/index-.*\.css$/.test(row.file)||row.file==='prerender-boot.js');
function requireBoot(rows){assert.equal(rows.filter(row=>row.file==='prerender-boot.js').length,1,'NBA_2004_ASSET_CRITICAL_STABLE_BOOT');}
requireBoot(critical);
function requireClass(rows){assert.equal(rows.filter(row=>/^assets\/NbaHistoricalDraftClass-.*\.js$/.test(row.file)).length,1,'NBA_2004_ASSET_CRITICAL_CLASS');}
requireClass(critical);
const classIndex=critical.findIndex(row=>/^assets\/NbaHistoricalDraftClass-.*\.js$/.test(row.file)),missingClass=critical.filter((_,i)=>i!==classIndex);
assert.equal(critical.length-missingClass.length,1,'Actual copied class-inventory omission changed one row');
let classRejected=null;try{requireClass(missingClass);}catch(error){classRejected=error;}
assert(classRejected instanceof assert.AssertionError);assert.match(classRejected.message,/^NBA_2004_ASSET_CRITICAL_CLASS/);
const restoredClass=[...missingClass];restoredClass.splice(classIndex,0,critical[classIndex]);assert.deepEqual(restoredClass,critical);
await fs.writeFile(path.join(dir,'class-inventory-control.json'),JSON.stringify({changed:true,removed:critical[classIndex],originalSHA256:sha(JSON.stringify(critical)),faultSHA256:sha(JSON.stringify(missingClass)),ownedFailure:{name:classRejected.name,message:classRejected.message},wholeInverseExact:true,scope:'Copied actual completed class chunk row only. HTTP body proof, no first-paint, browser lazy-load or new cap claim.'},null,2)+'\n',{flag:'wx'});
const bootIndex=critical.findIndex(row=>row.file==='prerender-boot.js'),missingBoot=critical.filter((_,i)=>i!==bootIndex);
assert.equal(critical.length-missingBoot.length,1,'Copied inventory control removes exactly the actual boot row');
let bootRejected=null;try{requireBoot(missingBoot);}catch(error){bootRejected=error;}
assert(bootRejected instanceof assert.AssertionError);assert.match(bootRejected.message,/^NBA_2004_ASSET_CRITICAL_STABLE_BOOT/);
const restoredBoot=[...missingBoot];restoredBoot.splice(bootIndex,0,critical[bootIndex]);assert.deepEqual(restoredBoot,critical,'Copied boot-inventory control restores every original row');
await fs.writeFile(path.join(dir,'boot-inventory-control.json'),JSON.stringify({changed:true,removed:critical[bootIndex],originalSHA256:sha(JSON.stringify(critical)),faultSHA256:sha(JSON.stringify(missingBoot)),ownedFailure:{name:bootRejected.name,message:bootRejected.message},wholeInverseExact:true,scope:'Copied authentic completed inventory only. No live response, source or artifact body is changed.'},null,2)+'\n',{flag:'wx'});
assert(critical.some(row=>/^assets\/NbaMyCareer-.*\.js$/.test(row.file)),'Completed build contains the actual NBA My Career route chunk');
assert(critical.some(row=>'/'+row.file===entries[0]));
for(const expected of critical){
 const source=await fs.readFile(path.join(dist,expected.file));
 assert.equal(source.length,expected.bytes);assert.equal(sha(source),expected.sha256);
 const result=await fetch(new URL('/'+expected.file,base),{headers:{'cache-control':'no-cache'},signal:AbortSignal.timeout(20000)});
 assert.equal(result.status,200,expected.file);
 const bytes=Buffer.from(await result.arrayBuffer()),digest=sha(bytes);
 assert.equal(bytes.length,expected.bytes,expected.file+' bytes');assert.equal(digest,expected.sha256,expected.file+' SHA256');
 const target=path.join(dir,expected.file);await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,bytes,{flag:'wx'});
 rows.push({file:expected.file,status:result.status,bytes:bytes.length,sha256:digest});
}
if(phase==='after'){
 const before=JSON.parse(await fs.readFile(path.join(out,'served-assets-before.json')));
 assert.deepEqual(rows,before.rows,'Critical actual served asset bodies hold before and after the native journeys');
}
await fs.writeFile(path.join(out,'served-assets-'+phase+'.json'),JSON.stringify({phase,base,entry:entries[0],rootStatus:response.status,routeStatus:routeResponse.status,routeHTMLSHA256:sha(routeHtml),routeReferenceHTMLSHA256:sha(routeReference),
 htmlSHA256:sha(servedHtml),rows,scope:'Actual HTTP response bodies retained and byte compared to the exact completed artifact. Entry/critical asset proof only; native driver verifies every observed asset.'},null,2)+'\n',{flag:'wx'});
console.log('nbaHistoricalDraftAssets: actual route entry and '+rows.length+' critical served bodies match the completed build ('+phase+').');
