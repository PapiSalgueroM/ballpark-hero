import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const [manifestFile, distArg, outArg, base, phase] = process.argv.slice(2);
assert(manifestFile&&distArg&&outArg&&base&&['before','after'].includes(phase));
const dist=path.resolve(distArg),out=path.resolve(outArg),m=JSON.parse(await fs.readFile(manifestFile));
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const origin=new URL(base).origin;assert.equal(origin,'https://douknowball.com');assert.equal(new URL(base).protocol,'https:');
assert.equal(m.schema,'K_LEAGUE_PUBLIC_SOURCE_DIST_V1');assert.equal(m.status,'QUALIFIED_NATIVE_BUILD_PUBLIC_INPUT');
assert.equal(m.public?.schema,'K_LEAGUE_PUBLIC_ACTUAL_AUTHORITY_V1');assert.equal(m.public.status,'ACTUAL_PUBLISHED_NATIVE_BODY_AUTHORITY');
assert.equal(m.public.sourceTree,m.product.tree);assert.match(m.public.nativeAdmission,/^[a-f0-9]{64}$/);assert.equal(m.public.buildAdmission,m.admissions.build);
assert.deepEqual(m.sourceBefore,m.sourceAfter);assert.equal(sha(JSON.stringify(m.distBefore)),m.distDigest);
async function sourceHeld(){for(const[file,digest]of Object.entries(m.sourceAfter))assert.equal(sha(await fs.readFile(file)),digest,file);}
for(const file of ['src/App.tsx','src/pages/ClubManager.tsx','src/pages/SoccerCareer.tsx','src/components/deadline-day/DeadlineDayViews.tsx'])assert.match(m.sourceAfter[file],/^[a-f0-9]{64}$/);
await sourceHeld();
const routes=[{route:'/',reference:'index.html',file:'index.html'},{route:'/club-manager',reference:'club-manager/index.html',file:'club-manager.html'},{route:'/soccer-career',reference:'soccer-career/index.html',file:'soccer-career.html'},{route:'/deadline-day',reference:'deadline-day/index.html',file:'deadline-day.html'},{route:'/career-ladder',reference:'career-ladder/index.html',file:'career-ladder.html'},{route:'/dart-draft',reference:'dart-draft/index.html',file:'dart-draft.html'},{route:'/search',reference:'search/index.html',file:'search.html'},{route:'/who-am-i',reference:'who-am-i/index.html',file:'who-am-i.html'},{route:'/soccer',reference:'soccer/index.html',file:'soccer.html'},{route:'/cbb-dynasty',reference:'cbb-dynasty/index.html',file:'cbb-dynasty.html'}];
const rows=[],dir=path.join(out,'served-'+phase);await fs.mkdir(dir,{recursive:true});
for(const row of routes){row.referenceBytes=await fs.readFile(path.join(dist,row.reference));row.referenceHTML=row.referenceBytes.toString('utf8');await fs.writeFile(path.join(dir,'reference-'+row.file),row.referenceBytes,{flag:'wx'});}
const captured=await Promise.allSettled(routes.map(async row=>{
 const response=await fetch(new URL(row.route,base),{headers:{'cache-control':'no-cache'},signal:AbortSignal.timeout(20000)});
 const bytes=Buffer.from(await response.arrayBuffer());await fs.writeFile(path.join(dir,row.file),bytes,{flag:'wx'});
 return{response,headers:[...response.headers].map(([name,value])=>({name,value})),setCookie:response.headers.getSetCookie?.()??[],html:bytes.toString('utf8'),file:row.file,bytes:bytes.length,sha256:sha(bytes)};
}));
await fs.writeFile(path.join(dir,'html-capture.json'),JSON.stringify(captured.map((r,i)=>r.status==='fulfilled'
 ?{route:routes[i].route,status:r.value.response.status,headers:r.value.headers,setCookie:r.value.setCookie,file:r.value.file,bytes:r.value.bytes,sha256:r.value.sha256}
 :{route:routes[i].route,error:String(r.reason?.stack||r.reason)}),null,2)+'\n',{flag:'wx'});
for(const r of captured)assert.equal(r.status,'fulfilled','Actual ten HTML captures completed before validation');
const html=routes[0].referenceHTML,servedHtml=captured[0].value.html,response=captured[0].value.response;assert.equal(response.status,200);
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
 assert.equal(entries.length,1,'CM_TEAM_PUBLIC_ASSET_REFERENCE_ROOT_ENTRY');
 assert.match(entries[0],/^\/assets\/index-[^/?#]+\.js$/,'CM_TEAM_PUBLIC_ASSET_REFERENCE_ROOT_ENTRY_SHAPE');
 assert.deepEqual(rp.modules.map(s=>s.src),entries,'CM_TEAM_PUBLIC_ASSET_REFERENCE_ROUTE_CURRENT_ENTRY');
 assert(rp.snapshot,'CM_TEAM_PUBLIC_ASSET_REFERENCE_ROUTE_SNAPSHOT');assert(rp.scripts.some(s=>s.src==='/prerender-boot.js'),'CM_TEAM_PUBLIC_ASSET_REFERENCE_ROUTE_STABLE_BOOT');
 assert.deepEqual(ar.modules.map(s=>s.src),entries,'CM_TEAM_PUBLIC_ASSET_ROOT_CURRENT_ENTRY');
 assert.deepEqual(ap.modules.map(s=>s.src),rp.modules.map(s=>s.src),'CM_TEAM_PUBLIC_ASSET_ROUTE_CURRENT_ENTRY');
 assert(ap.snapshot,'CM_TEAM_PUBLIC_ASSET_ROUTE_SNAPSHOT');assert(ap.scripts.some(s=>s.src==='/prerender-boot.js'),'CM_TEAM_PUBLIC_ASSET_ROUTE_STABLE_BOOT');
 return {entries,routeEntries:ap.modules.map(s=>s.src)};
}
function cssDeclarations(text){
 const styles=[],links=[];
 for(const row of text.matchAll(/<!--[\s\S]*?-->|<script\b[^>]*>[\s\S]*?<\/script\s*>|<style\b[^>]*>([\s\S]*?)<\/style\s*>|<link\b([^>]*)>/gi)){
  if(row[1]!==undefined){styles.push({tag:row[0],body:row[1]});continue;}
  if(row[2]===undefined)continue;
  const attr=name=>{const hit=new RegExp('(?:^|\\s)'+name+'\\s*=\\s*(?:"([^"]*)"|\\x27([^\\x27]*)\\x27)','i').exec(row[2]);return hit?(hit[1]??hit[2]):null;};
  if(!(attr('rel')??'').toLowerCase().split(/\s+/).includes('stylesheet'))continue;
  const href=attr('href');assert(href,'K_PUBLIC_HTTP_STYLESHEET_HREF');links.push({tag:row[0],href,absolute:new URL(href,base).href});
 }
 return{styles,links};
}
function validateCSS(reference,actual){
 const expected=cssDeclarations(reference),served=cssDeclarations(actual);
 assert(expected.styles.length||expected.links.some(row=>new URL(row.absolute).origin===origin),'K_PUBLIC_HTTP_REFERENCE_APP_CSS');
 assert.deepEqual(served.styles.map(row=>row.body),expected.styles.map(row=>row.body),'K_PUBLIC_HTTP_INLINE_CSS_BODY');
 assert.deepEqual(served.links.map(row=>row.absolute),expected.links.map(row=>row.absolute),'K_PUBLIC_HTTP_STYLESHEET_URLS');
 return{inline:served.styles.map(row=>({bytes:Buffer.byteLength(row.body),sha256:sha(row.body)})),stylesheetURLs:served.links.map(row=>row.absolute),scope:'Exact actual inline CSS bodies and declared stylesheet URLs versus the admitted document. External font declarations are not a font availability or font response-body claim.'};
}
const cssProofs=[];
for(let i=0;i<routes.length;i++){
 const row=routes[i],actual=captured[i].value.html,positive=validateCSS(row.referenceHTML,actual),parts=cssDeclarations(actual);
 let oldTag,newTag,marker;
 if(parts.styles.length){oldTag=parts.styles[0].tag;const end=oldTag.toLowerCase().lastIndexOf('</style');assert(end>=0);newTag=oldTag.slice(0,end)+'/* K_PUBLIC_COPIED_CSS_CONTROL */'+oldTag.slice(end);marker=/^K_PUBLIC_HTTP_INLINE_CSS_BODY/;}
 else{const link=parts.links.find(item=>new URL(item.absolute).origin===origin);assert(link);oldTag=link.tag;newTag=oldTag.split(link.href).join(link.href+'?k-public-css-control=1');marker=/^K_PUBLIC_HTTP_STYLESHEET_URLS/;}
 assert.equal(actual.split(oldTag).length-1,1);assert.notEqual(newTag,oldTag);const at=actual.indexOf(oldTag),fault=actual.slice(0,at)+newTag+actual.slice(at+oldTag.length);assert.notEqual(fault,actual);
 let rejected;try{validateCSS(row.referenceHTML,fault);}catch(error){rejected=error;}
 assert(rejected instanceof assert.AssertionError);assert.match(rejected.message,marker);assert.equal(fault.slice(0,at)+oldTag+fault.slice(at+newTag.length),actual);
 const file=row.file.replace('.html','-css-control.html');await fs.writeFile(path.join(dir,file),fault,{flag:'wx'});
 const control={changed:true,file,originalSHA256:sha(actual),faultSHA256:sha(fault),ownedFailure:{name:rejected.name,message:rejected.message},wholeInverseExact:true,scope:'Copied actual CSS declaration or inline body only. No actual HTTP response or rendered style is changed.'};
 await fs.writeFile(path.join(dir,row.file.replace('.html','-css-control.json')),JSON.stringify(control,null,2)+'\n',{flag:'wx'});cssProofs.push({...positive,control});
}

const rootModule=htmlShape(servedHtml).modules;assert.equal(rootModule.length,1);
const rootTag=rootModule[0].tag;assert.equal(servedHtml.split(rootTag).length-1,1);
const rootFaultTag=rootTag.replace(rootModule[0].src,'/assets/index-k-league-public-stale-root-control.js'),rootFault=servedHtml.replace(rootTag,rootFaultTag);assert.notEqual(rootFault,servedHtml);
let rootRejected;try{validateHtml(html,routes[1].referenceHTML,rootFault,captured[1].value.html);}catch(error){rootRejected=error;}
assert(rootRejected instanceof assert.AssertionError);assert.match(rootRejected.message,/^CM_TEAM_PUBLIC_ASSET_ROOT_CURRENT_ENTRY/);assert.equal(rootFault.replace(rootFaultTag,rootTag),servedHtml);
await fs.writeFile(path.join(dir,'index-stale-entry-control.html'),rootFault,{flag:'wx'});
const rootControl={changed:true,originalSHA256:sha(servedHtml),faultSHA256:sha(rootFault),ownedFailure:{name:rootRejected.name,message:rootRejected.message},wholeInverseExact:true,scope:'Copied actual root HTML only; no response or App replacement.'};
await fs.writeFile(path.join(dir,'index-html-control.json'),JSON.stringify(rootControl,null,2)+'\n',{flag:'wx'});
const routeHTML=[{route:'/',status:response.status,headers:captured[0].value.headers,setCookie:captured[0].value.setCookie,file:'index.html',bytes:captured[0].value.bytes,sha256:captured[0].value.sha256,referenceHTMLSHA256:sha(routes[0].referenceBytes),entries:rootModule.map(row=>row.src),snapshotRequired:false,css:cssProofs[0],control:rootControl}];
for(let i=1;i<routes.length;i++){
 const row=routes[i],actual=captured[i].value;assert.equal(actual.response.status,200);
 const positive=validateHtml(html,row.referenceHTML,servedHtml,actual.html),tag=htmlShape(actual.html).modules[0].tag;
 assert.equal(actual.html.split(tag).length-1,1,'Unique actual current module tag');
 const staleEntry='/assets/index-k-league-public-stale-control.js',staleTag=tag.replace(positive.entries[0],staleEntry),stale=actual.html.replace(tag,staleTag);
 assert.notEqual(staleTag,tag);assert.notEqual(stale,actual.html);await fs.writeFile(path.join(dir,row.file.replace('.html','-stale-entry-control.html')),stale,{flag:'wx'});
 let rejected;try{validateHtml(html,row.referenceHTML,servedHtml,stale);}catch(error){rejected=error;}
 assert(rejected instanceof assert.AssertionError);assert.match(rejected.message,/^CM_TEAM_PUBLIC_ASSET_ROUTE_CURRENT_ENTRY/);assert.equal(stale.replace(staleTag,tag),actual.html);
 const control={changed:true,originalSHA256:sha(actual.html),faultSHA256:sha(stale),staleEntry,ownedFailure:{name:rejected.name,message:rejected.message},wholeInverseExact:true,scope:'Copied actual published raw HTML only. No HTTP response or App replacement.'};
 await fs.writeFile(path.join(dir,row.file.replace('.html','-html-control.json')),JSON.stringify(control,null,2)+'\n',{flag:'wx'});
 routeHTML.push({route:row.route,status:actual.response.status,headers:actual.headers,setCookie:actual.setCookie,file:row.file,bytes:actual.bytes,sha256:actual.sha256,referenceHTMLSHA256:sha(row.referenceBytes),entries:positive.routeEntries,snapshot:true,stableBoot:true,css:cssProofs[i],control});
}

const changedCatalogRoutes=new Set(['/career-ladder','/dart-draft','/soccer-career','/search','/who-am-i','/soccer','/club-manager','/cbb-dynasty']);
const catalogueText='Manage a club across current and historical leagues: negotiations, board objectives, trophies and the sack race';
const catalogueBefore='Manage any of 454 real clubs across 27 leagues, today or in a real past season: negotiations, board objectives, trophies and the sack race';
const metaText='Manage a club across current and historical leagues. Transfers, tactics, the board and the sack race. Free soccer management sim.';
const metaBefore='Manage any of 454 real clubs across 27 leagues, today or in a real past season. Transfers, tactics, the board and the sack race. Free soccer management sim.';
function attrValue(attrs,name){const hit=new RegExp('(?:^|\\s)'+name+'\\s*=\\s*(?:"([^"]*)"|\\x27([^\\x27]*)\\x27)','i').exec(attrs);return hit?(hit[1]??hit[2]):null;}
function attributeText(text){return text.replace(/&#x([0-9a-f]+);/gi,(_,x)=>String.fromCodePoint(parseInt(x,16))).replace(/&#(\d+);/g,(_,x)=>String.fromCodePoint(Number(x))).replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();}
function readableText(text){return attributeText(text.replace(/<[^>]+>/g,' '));}
function catalogProjection(text){
 const clean=text.replace(/<!--[\s\S]*?-->/g,''),visible=clean.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi,'');
 const values=[catalogueText,catalogueBefore,metaText,metaBefore],readable=[],metas=[],ld=[],stale=[],witnesses=[];
 const mark=(value,tag,kind)=>{if(value.includes(catalogueBefore)||value.includes(metaBefore))stale.push({kind,value});const needle=value.includes(catalogueText)?catalogueText:value.includes(metaText)?metaText:null;if(needle)witnesses.push({tag,kind,needle,before:needle===catalogueText?catalogueBefore:metaBefore});};
 for(const m of visible.matchAll(/<(a|p)\b([^>]*)>([\s\S]*?)<\/\1\s*>/gi)){const value=readableText(m[3]);if(!values.some(x=>value.includes(x)))continue;const row={tag:m[1].toLowerCase(),href:m[1].toLowerCase()==='a'?attrValue(m[2],'href'):null,text:value};readable.push(row);mark(value,m[0],'readable-'+row.tag);}
 for(const m of visible.matchAll(/<meta\b([^>]*)>/gi)){const key=(attrValue(m[1],'name')??attrValue(m[1],'property')??'').toLowerCase(),value=attributeText(attrValue(m[1],'content')??'');if(!['description','og:description','twitter:description'].includes(key)||!values.some(x=>value.includes(x)))continue;metas.push({key,content:value});mark(value,m[0],'head-meta');}
 for(const m of text.matchAll(/<!--[\s\S]*?-->|<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)){
  if(m[1]===undefined)continue;
  if((attrValue(m[1],'type')??'').toLowerCase()!=='application/ld+json')continue;
  let value;try{value=JSON.parse(m[2]);}catch{assert.fail('K_PUBLIC_HTTP_CATALOG_JSONLD_PARSE');}
  function walk(n){if(Array.isArray(n)){for(const item of n)walk(item);return;}if(!n||typeof n!=='object')return;for(const[k,v]of Object.entries(n)){if(k==='description'&&typeof v==='string'&&values.some(x=>v.includes(x))){ld.push({type:n['@type']??null,description:v});mark(v,m[0],'game-jsonld');}else if(v&&typeof v==='object')walk(v);}}
  walk(value);
 }
 return{value:{readable,metas,ld,stale},witnesses};
}
function validateCatalog(reference,actual){
 const expected=catalogProjection(reference),served=catalogProjection(actual);
 assert.equal(expected.value.stale.length,0,'K_PUBLIC_HTTP_CATALOG_COPY');assert(expected.witnesses.length>0,'K_PUBLIC_HTTP_CATALOG_COPY');
 assert.equal(served.value.stale.length,0,'K_PUBLIC_HTTP_CATALOG_COPY');assert.deepEqual(served.value,expected.value,'K_PUBLIC_HTTP_CATALOG_COPY');
 return{expected:expected.value,actual:served.value,scope:'Exact source-derived readable Club Manager link/paragraph and head-meta/GameJSONLD description projection. No unrelated historical count or guide text is rewritten.'};
}
function requireDocuments(rows){assert.deepEqual(rows.map(row=>row.route),routes.map(row=>row.route),'K_PUBLIC_HTTP_DOCUMENT_CENSUS');}
for(const row of routeHTML){
 if(!changedCatalogRoutes.has(row.route))continue;
 const index=routes.findIndex(r=>r.route===row.route),actual=captured[index].value.html,reference=routes[index].referenceHTML,positive=validateCatalog(reference,actual),witness=catalogProjection(actual).witnesses.find(w=>w.tag.includes(w.needle));assert(witness,'K_PUBLIC_HTTP_ACTUAL_CATALOG_CONTROL_ANCHOR');
 const tagAt=actual.indexOf(witness.tag);assert(tagAt>=0&&actual.indexOf(witness.tag,tagAt+witness.tag.length)<0,'Unique actual catalogue witness');const within=witness.tag.indexOf(witness.needle),changedTag=witness.tag.slice(0,within)+witness.before+witness.tag.slice(within+witness.needle.length),fault=actual.slice(0,tagAt)+changedTag+actual.slice(tagAt+witness.tag.length);assert.notEqual(fault,actual);
 let owned;try{validateCatalog(reference,fault);}catch(error){owned=error;}assert(owned instanceof assert.AssertionError);assert.match(owned.message,/^K_PUBLIC_HTTP_CATALOG_COPY/);assert.equal(fault.slice(0,tagAt)+witness.tag+fault.slice(tagAt+changedTag.length),actual);
 const file=row.file.replace('.html','-catalog-control.html');await fs.writeFile(path.join(dir,file),fault,{flag:'wx'});
 const control={changed:true,file,witnessKind:witness.kind,originalSHA256:sha(actual),faultSHA256:sha(fault),ownedFailure:{name:owned.name,message:owned.message},wholeInverseExact:true,scope:'Copied actual rendered or metadata description only. No live response or product mutation.'};
 await fs.writeFile(path.join(dir,row.file.replace('.html','-catalog-control.json')),JSON.stringify(control,null,2)+'\n',{flag:'wx'});row.catalogCopy={...positive,control};const sourcePath='public'+row.route+'/index.html',sourceBytes=await fs.readFile(sourcePath);assert.equal(sha(sourceBytes),m.sourceAfter[sourcePath],'K_PUBLIC_HTTP_SNAPSHOT_SOURCE_ROLE');row.sourceSnapshot={path:sourcePath,bytes:sourceBytes.length,sha256:sha(sourceBytes),gitBlob:crypto.createHash('sha1').update(Buffer.from('blob '+sourceBytes.length+'\0')).update(sourceBytes).digest('hex')};
}
requireDocuments(routeHTML);const copy=structuredClone(routeHTML),removeAt=copy.findIndex(row=>row.route==='/career-ladder');assert(removeAt>=0);const originalCensus=JSON.stringify(copy),removed=copy.splice(removeAt,1)[0];assert.notEqual(JSON.stringify(copy),originalCensus);
let omitted;try{requireDocuments(copy);}catch(error){omitted=error;}assert(omitted instanceof assert.AssertionError);assert.match(omitted.message,/^K_PUBLIC_HTTP_DOCUMENT_CENSUS/);copy.splice(removeAt,0,removed);assert.equal(JSON.stringify(copy),originalCensus);
const documentControl={changed:true,removedRoute:removed.route,ownedFailure:{name:omitted.name,message:omitted.message},wholeInverseExact:true,actualHeld:true,scope:'Copied actual ten-document metadata row omission only.'};
await fs.writeFile(path.join(dir,'required-document-omission-control.json'),JSON.stringify(documentControl,null,2)+'\n',{flag:'wx'});

const {entries}=validateHtml(html,routes[1].referenceHTML,servedHtml,captured[1].value.html);
const refs=new Map(m.distBefore.map(row=>[row.file,row]));
function exactRow(row,label){assert(row&&typeof row.file==='string',label);assert.deepEqual(refs.get(row.file),row,label);return row;}
function one(pattern,label){const found=m.distBefore.filter(row=>pattern.test(row.file));assert.equal(found.length,1,label);return found[0];}
const teamRows=[];for(const row of m.distBefore.filter(row=>row.file.startsWith('assets/')&&row.file.endsWith('.js')))if(/["']data-cm-board-wants["']\s*:/.test(await fs.readFile(path.join(dist,row.file),'utf8')))teamRows.push(row);
assert.equal(teamRows.length,1,'K_PUBLIC_HTTP_ONE_EXECUTABLE_TEAM');
assert.equal(m.cmCold?.schema,'K_LEAGUE_CM_COLD_EXTENSION_V1');assert.equal(m.scAttributes?.status,'QUALIFIED_ATTRIBUTES_SOURCE_AND_BUILD');
const rootEntry=exactRow(refs.get(entries[0].replace(/^\//,'')),'K_PUBLIC_HTTP_ENTRY_BODY');
const css=m.distBefore.filter(row=>/^assets\/index-.*\.css$/.test(row.file));assert(css.length>0,'K_PUBLIC_HTTP_CSS_BODY');
const roles=[
 {role:'actual root and App entry boundary',row:rootEntry},
 ...css.map(row=>({role:'current root stylesheet '+row.file,row})),
 {role:'stable snapshot boot',row:one(/^prerender-boot\.js$/,'K_PUBLIC_HTTP_BOOT')},
 {role:'CM route',row:one(/^assets\/ClubManager-[^/]+\.js$/,'K_PUBLIC_HTTP_CM_ROUTE')},
 {role:'SC route',row:one(/^assets\/SoccerCareer-[^/]+\.js$/,'K_PUBLIC_HTTP_SC_ROUTE')},
 {role:'Deadline route body identity only',row:one(/^assets\/DeadlineDay-[^/]+\.js$/,'K_PUBLIC_HTTP_DEADLINE_ROUTE')},
 {role:'actual executable Team leaf',row:teamRows[0]},
 {role:'actual Attributes leaf',row:exactRow(m.scAttributes.leaf,'K_PUBLIC_HTTP_ATTRIBUTES')},
 {role:'actual CM DeferredViews owner',row:exactRow(m.cmCold.deferredViews,'K_PUBLIC_HTTP_CM_DEFERRED')},
 {role:'actual CM Tabs owner',row:exactRow(m.cmCold.tabs,'K_PUBLIC_HTTP_CM_TABS')},
 {role:'Deadline Views body identity only',row:one(/^assets\/DeadlineDayViews-[^/]+\.js$/,'K_PUBLIC_HTTP_DEADLINE_VIEWS')}
];
const unique=new Map();for(const owner of roles){exactRow(owner.row,owner.role);unique.set(owner.row.file,owner.row);}
const critical=[...unique.values()].sort((a,b)=>a.file<b.file?-1:a.file>b.file?1:0);
function requireCritical(actual){assert.deepEqual(actual,critical,'K_PUBLIC_HTTP_COMPLETE_CRITICAL_INVENTORY');}
requireCritical(critical);const controls=[];
for(const owner of roles){
 const index=critical.findIndex(row=>row.file===owner.row.file),copy=critical.filter((_,i)=>i!==index);assert.equal(critical.length-copy.length,1);
 let rejected;try{requireCritical(copy);}catch(error){rejected=error;}assert(rejected instanceof assert.AssertionError);assert.match(rejected.message,/^K_PUBLIC_HTTP_COMPLETE_CRITICAL_INVENTORY/);
 const restored=[...copy];restored.splice(index,0,critical[index]);assert.deepEqual(restored,critical);
 controls.push({role:owner.role,removed:critical[index],changed:true,originalSHA256:sha(JSON.stringify(critical)),faultSHA256:sha(JSON.stringify(copy)),ownedFailure:{name:rejected.name,message:rejected.message},wholeInverseExact:true,scope:'Copied actual admitted critical inventory only. No source, HTTP body or App mutation.'});
}
await fs.writeFile(path.join(dir,'critical-inventory-controls.json'),JSON.stringify({roles,controls},null,2)+'\n',{flag:'wx'});
for(const expected of critical){
 const source=await fs.readFile(path.join(dist,expected.file));assert.equal(source.length,expected.bytes);assert.equal(sha(source),expected.sha256);
 const result=await fetch(new URL('/'+expected.file,base),{headers:{'cache-control':'no-cache'},signal:AbortSignal.timeout(20000)});
 const bytes=Buffer.from(await result.arrayBuffer()),digest=sha(bytes),target=path.join(dir,expected.file);await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,bytes,{flag:'wx'});
 rows.push({file:expected.file,status:result.status,bytes:bytes.length,sha256:digest});
 await fs.writeFile(path.join(dir,'asset-capture-progress.json'),JSON.stringify({phase,rows},null,2)+'\n');
 assert.equal(result.status,200,expected.file);assert.equal(bytes.length,expected.bytes,expected.file+' bytes');assert.equal(digest,expected.sha256,expected.file+' SHA256');assert(bytes.equals(source),expected.file+' complete body');
}
if(phase==='after'){
 const before=JSON.parse(await fs.readFile(path.join(out,'served-assets-before.json')));
 assert.deepEqual(rows,before.rows,'Critical actual served asset bodies hold before and after public journeys');
 assert.deepEqual(roles,before.criticalOwners,'Exact critical owner inventory held across both actual HTTP phases');
 assert.deepEqual(routeHTML.map(row=>row.route),before.routeHTML.map(row=>row.route),'Four actual document route census held');
}
await sourceHeld();
await fs.writeFile(path.join(out,'served-assets-'+phase+'.json'),JSON.stringify({
 schema:'K_LEAGUE_PUBLIC_HTTP_BODIES_V1',phase,base,entry:entries[0],rootStatus:response.status,
 rootHTML:{route:'/',status:response.status,headers:captured[0].value.headers,setCookie:captured[0].value.setCookie,file:'index.html',bytes:captured[0].value.bytes,sha256:captured[0].value.sha256,referenceHTMLSHA256:sha(routes[0].referenceBytes)},
 routeHTML,requiredDocumentControl:documentControl,changedCatalogRoutes:[...changedCatalogRoutes],criticalOwners:roles,criticalInventoryControls:'served-'+phase+'/critical-inventory-controls.json',rows,
 scope:'Full root/CM/SC/Deadline and six measured catalogue-copy consumer raw documents are retained before validation. Current entry, snapshot and boot shapes are checked, with all declared critical CSS/entry/App boundary/routes/cold-owner HTTP bodies byte-equal to the authenticated completed dist before and after actual CM/SC public journeys. Every executed observed App asset is separately byte-checked by the public driver. Deadline and the six additional document consumers are HTTP/body identity only; no extra UI journey, gameplay, End or completion claim. Actual Fetch headers are retained as exposed, with separate Set-Cookie values; no wire header order or timing claim. Search intentional noindex policy and scoped IndexNow are owned by the carrier.'
},null,2)+'\n',{flag:'wx'});
console.log('kLeaguePublicAssets: ten actual documents and '+rows.length+' exact critical bodies match the same completed build ('+phase+'); Deadline body identity only.');
