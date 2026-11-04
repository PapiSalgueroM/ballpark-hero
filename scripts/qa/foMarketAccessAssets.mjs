import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const [manifestFile, distArg, outArg, base, phase] = process.argv.slice(2);
assert(manifestFile&&distArg&&outArg&&base&&['before','after'].includes(phase));
const dist=path.resolve(distArg),out=path.resolve(outArg),m=JSON.parse(await fs.readFile(manifestFile));
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const html=await fs.readFile(path.join(dist,'index.html'),'utf8');
const entries=[...new Set([...html.matchAll(/src=["'](\/assets\/index-[^"']+\.js)["']/g)].map(row=>row[1]))];
assert.equal(entries.length,1,'Exactly one completed-build module entry');
const response=await fetch(new URL('/',base),{headers:{'cache-control':'no-cache'},signal:AbortSignal.timeout(20000)});
assert.equal(response.status,200);
const servedHtml=await response.text();
const actual=[...new Set([...servedHtml.matchAll(/src=["'](\/assets\/index-[^"']+\.js)["']/g)].map(row=>row[1]))];
assert.deepEqual(actual,entries,'Actual served root entry must match the completed build');
const routeResponse=await fetch(new URL('/front-office',base),{headers:{'cache-control':'no-cache'},signal:AbortSignal.timeout(20000)});
assert.equal(routeResponse.status,200);
const routeHtml=await routeResponse.text(),routeReference=await fs.readFile(path.join(dist,'front-office/index.html'),'utf8');
for(const text of [routeReference,routeHtml]){
 assert(/id=["']dukb-snapshot["']/.test(text),'Real route snapshot marker');
 assert(/<script\b[^>]*src=["']\/prerender-boot\.js["'][^>]*>/i.test(text),'Real route uses the stable prerender boot script');
 assert(!/src=["']\/assets\/index-[^"']+\.js["']/.test(text),'Snapshot does not freeze a hashed entry');
}
const critical=m.distBefore.filter(row=>/^assets\/(?:index-|FrontOffice-).*\.js$/.test(row.file)||/^assets\/index-.*\.css$/.test(row.file)||row.file==='prerender-boot.js');
assert(critical.some(row=>/^assets\/FrontOffice-.*\.js$/.test(row.file)),'Completed build contains the actual FO route chunk');
assert(critical.some(row=>'/'+row.file===entries[0]));
const rows=[],dir=path.join(out,'served-'+phase);await fs.mkdir(dir,{recursive:true});
await fs.writeFile(path.join(dir,'index.html'),servedHtml,{flag:'wx'});
await fs.writeFile(path.join(dir,'front-office.html'),routeHtml,{flag:'wx'});
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
