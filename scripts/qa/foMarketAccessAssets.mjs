import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const [manifestFile, distArg, outArg, base, phase] = process.argv.slice(2);
assert(manifestFile&&distArg&&outArg&&base&&['before','after'].includes(phase));
const dist=path.resolve(distArg),out=path.resolve(outArg),m=JSON.parse(await fs.readFile(manifestFile));
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const html=await fs.readFile(path.join(dist,'index.html'),'utf8'),routeReference=await fs.readFile(path.join(dist,'front-office/index.html'),'utf8');
const rows=[],dir=path.join(out,'served-'+phase);await fs.mkdir(dir,{recursive:true});
await fs.writeFile(path.join(dir,'reference-index.html'),html,{flag:'wx'});
await fs.writeFile(path.join(dir,'reference-front-office.html'),routeReference,{flag:'wx'});
const captured=await Promise.allSettled([['/','index.html'],['/front-office','front-office.html']].map(async([route,file])=>{
 const response=await fetch(new URL(route,base),{headers:{'cache-control':'no-cache'},signal:AbortSignal.timeout(20000)});
 const bytes=Buffer.from(await response.arrayBuffer());await fs.writeFile(path.join(dir,file),bytes,{flag:'wx'});
 return {response,html:bytes.toString('utf8'),file,bytes:bytes.length,sha256:sha(bytes)};
}));
await fs.writeFile(path.join(dir,'html-capture.json'),JSON.stringify(captured.map((r,i)=>r.status==='fulfilled'
 ?{route:i===0?'/':'/front-office',status:r.value.response.status,file:r.value.file,bytes:r.value.bytes,sha256:r.value.sha256}
 :{route:i===0?'/':'/front-office',error:String(r.reason?.stack||r.reason)}),null,2)+'\n',{flag:'wx'});
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
 assert.equal(entries.length,1,'FO_ASSET_REFERENCE_ROOT_ENTRY');
 assert.match(entries[0],/^\/assets\/index-[^/?#]+\.js$/,'FO_ASSET_REFERENCE_ROOT_ENTRY_SHAPE');
 assert.deepEqual(rp.modules.map(s=>s.src),entries,'FO_ASSET_REFERENCE_ROUTE_CURRENT_ENTRY');
 assert(rp.snapshot,'FO_ASSET_REFERENCE_ROUTE_SNAPSHOT');assert(rp.scripts.some(s=>s.src==='/prerender-boot.js'),'FO_ASSET_REFERENCE_ROUTE_STABLE_BOOT');
 assert.deepEqual(ar.modules.map(s=>s.src),entries,'FO_ASSET_ROOT_CURRENT_ENTRY');
 assert.deepEqual(ap.modules.map(s=>s.src),rp.modules.map(s=>s.src),'FO_ASSET_ROUTE_CURRENT_ENTRY');
 assert(ap.snapshot,'FO_ASSET_ROUTE_SNAPSHOT');assert(ap.scripts.some(s=>s.src==='/prerender-boot.js'),'FO_ASSET_ROUTE_STABLE_BOOT');
 return {entries,routeEntries:ap.modules.map(s=>s.src)};
}
const positive=validateHtml(html,routeReference,html,routeReference),tag=htmlShape(routeReference).modules[0].tag;
assert.equal(routeReference.split(tag).length-1,1,'Unique actual current module script tag');
const staleEntry='/assets/index-fo-market-stale-control.js',staleTag=tag.replace(positive.entries[0],staleEntry),stale=routeReference.replace(tag,staleTag);
assert.notEqual(staleTag,tag);assert.notEqual(stale,routeReference);assert.deepEqual(htmlShape(stale).modules.map(s=>s.src),[staleEntry]);
await fs.writeFile(path.join(dir,'front-office-stale-entry-control.html'),stale,{flag:'wx'});
let rejected=null;try{validateHtml(html,routeReference,html,stale);}catch(error){rejected=error;}
assert(rejected instanceof assert.AssertionError,'Copied stale HTML must fail its actual entry validator');
assert.match(rejected.message,/^FO_ASSET_ROUTE_CURRENT_ENTRY/,'Owned stale-entry assertion, not setup failure');
assert.equal(stale.replace(staleTag,tag),routeReference,'Copied HTML control restores every original byte');
await fs.writeFile(path.join(dir,'html-control.json'),JSON.stringify({positive,changed:true,originalSHA256:sha(routeReference),faultSHA256:sha(stale),
 staleEntry,ownedFailure:{name:rejected.name,message:rejected.message},wholeInverseExact:true,scope:'Copied authentic completed HTML only. Same validator rejects the changed real script tag; actual HTTP responses are never mocked.'},null,2)+'\n',{flag:'wx'});
const {entries}=validateHtml(html,routeReference,servedHtml,routeHtml);
const critical=m.distBefore.filter(row=>/^assets\/(?:index-|FrontOffice-).*\.js$/.test(row.file)||/^assets\/index-.*\.css$/.test(row.file)||row.file==='prerender-boot.js');
assert(critical.some(row=>/^assets\/FrontOffice-.*\.js$/.test(row.file)),'Completed build contains the actual FO route chunk');
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
console.log('foMarketAccessAssets: actual route entry and '+rows.length+' critical served bodies match the completed build ('+phase+').');
