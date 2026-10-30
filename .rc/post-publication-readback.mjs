import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
const ROOT=process.cwd(), OUT=path.resolve(process.env.POST_PUBLICATION_OUT||''), SITE='https://douknowball.com';
const M=process.env.POST_PUBLICATION_PRODUCT||'', TREE=process.env.POST_PUBLICATION_TREE||'', N=process.env.POST_PUBLICATION_FILES||'', DEP=process.env.POST_PUBLICATION_DEPLOYMENT_SHA256||'';
const P='f296854dc83b4337487dec8a5af50a348cd0d3cc', PT='0e457d0a519a196828529ec0a25d066b2aae450c';
const sha=b=>createHash('sha256').update(b).digest('hex');
const git=(...args)=>execFileSync('git',args,{cwd:ROOT,encoding:'utf8',maxBuffer:32*1024*1024,env:{...process.env,GIT_OPTIONAL_LOCKS:'0'}}).trim();
const rel=path.relative(ROOT,OUT);
assert(process.env.CI==='true'&&path.isAbsolute(OUT)&&(rel==='..'||rel.startsWith('..'+path.sep)),'Outside-source remote output only');
assert(/^[a-f0-9]{40}$/.test(M)&&/^[a-f0-9]{40}$/.test(TREE)&&/^[1-9][0-9]*$/.test(N)&&/^[a-f0-9]{64}$/.test(DEP),'UNBOUND_PUBLICATION');
assert.equal(git('rev-parse','HEAD^'),M);assert.equal(git('rev-parse',M+'^{tree}'),TREE);assert.equal(git('rev-parse',P+'^{tree}'),PT);
const pins={'scripts/auditLive.mjs':'5378a500253a2c44cac1060d8c30a2108d7fd9ef','scripts/playLiveRenderedAudit.mjs':'fa381745ea1e97a3a47d3e09ff3e8fd537b0587c','scripts/auditLiveRenderedReadOnly.mjs':'0fe8c8697528914bbbe1418cbba0c00f6175b2ac','scripts/lib/playwrightLoader.mjs':'4f7739e217e0a47ee82e6bfc8be1c04bed17454a','scripts/lib/liveIndexability.mjs':'f3a0a3da0c5c81ebb0e3c0515d11775629c3dc04'};
for(const [file,blob] of Object.entries(pins))assert.equal(git('hash-object',file),blob,'Actual source pin '+file);
const featureGroups=[
  {
    "id": "cm-price-mode",
    "role": "cm",
    "path": "src/components/club-manager/TransferScreen.tsx",
    "blob": "1157975509a11dc6ce7d75d1d02221787716ad1b",
    "literals": [
      "cm-market-max-ask",
      "Maximum asking price (",
      "Blank means no custom ceiling.",
      "Free agents ("
    ]
  },
  {
    "id": "cm-closed-pool",
    "role": "cm",
    "path": "src/components/club-manager/FreeAgentPool.tsx",
    "blob": "a85232cafe27b0a4bafc9914be2a8c74a7ee96e9",
    "literals": [
      ", and the window being shut does not stop these"
    ]
  },
  {
    "id": "sc-page",
    "role": "sc",
    "path": "src/pages/SoccerCareer.tsx",
    "blob": "70e1f27988ec3891a15a5260282dfe9fd1502f18",
    "literals": [
      "Season replays",
      "Week by week: watch your season match by match"
    ]
  },
  {
    "id": "ticker",
    "role": "entry",
    "path": "src/components/layout/TopTicker.tsx",
    "blob": "7fa37e32723aa511e4bf47bcd0f7c3a399db0375",
    "sourceRequired": "onPointerMove={(e) => { if (e.pointerType === 'mouse') setPaused(true); }}",
    "literals": [
      "Live scores ticker",
      "onPointerMove",
      "pointerType",
      "Pause the scores ticker"
    ]
  },
  {
    "id": "sc-league-format",
    "role": "sc",
    "path": "src/lib/soccerCareerLeague.ts",
    "blob": "9c05bf681f30bcd3703f55ad72c1289f4eeb9844",
    "sourceRequired": "\"Ligue 2\": [{ from: 2026, size: 18 }]",
    "literals": [
      "Ligue 2",
      "Serie B"
    ]
  },
  {
    "id": "sc-playing-pool",
    "role": "sc",
    "path": "src/data/soccerCareerClubPool.ts",
    "blob": "83e9df78441c0d16509f80b8ec0bfbadb0f08f26",
    "literals": [
      "cm-cremonese",
      "cm-verona",
      "cm-pisa",
      "cm-avellino",
      "cm-carrarese",
      "cm-catanzaro",
      "cm-cesena",
      "cm-empoli",
      "cm-entella",
      "cm-juve-stabia",
      "cm-mantova",
      "cm-modena",
      "cm-padova",
      "cm-palermo",
      "cm-sampdoria",
      "cm-sudtirol",
      "cm-vicenza",
      "cm-arezzo",
      "cm-benevento",
      "cm-ascoli",
      "cm-metz",
      "cm-saint-etienne",
      "cm-red-star-fc",
      "cm-reims",
      "cm-montpellier",
      "cm-nancy",
      "cm-annecy",
      "cm-sochaux",
      "cm-dijon",
      "cm-pau",
      "cm-guingamp",
      "cm-dunkerque",
      "cm-grenoble",
      "cm-rodez",
      "cm-clermont",
      "cm-boulogne",
      "cm-laval"
    ]
  }
];
const featureContract=[];
for(const group of featureGroups){
 assert.equal(git('hash-object',group.path),group.blob,'Predeclared feature source pin '+group.path);
 const source=fs.readFileSync(group.path,'utf8');if(group.sourceRequired)assert(source.includes(group.sourceRequired),'Actual source expression '+group.id);
 for(const literal of group.literals){assert(source.includes(literal),'Predeclared source literal '+literal);featureContract.push({id:group.id+':'+literal,role:group.role,path:group.path,blob:group.blob,literal});}
 if(group.id==='sc-playing-pool'){
  const rows=[...source.matchAll(/^  \{ id: "(cm-[^"]+)", name: "[^"]+",[^\n]+league: "(Serie B|Ligue 2)" \},$/gm)];
  assert.equal(rows.length,37);assert.deepEqual(rows.map(r=>r[1]),group.literals);assert.equal(rows.filter(r=>r[2]==='Serie B').length,20);assert.equal(rows.filter(r=>r[2]==='Ligue 2').length,17);
 }
}

const deploymentBytes=fs.readFileSync('.rc/publication-deployment.json');assert.equal(sha(deploymentBytes),DEP,'Actual bound deployment receipt');
const deployment=JSON.parse(deploymentBytes);assert.equal(deployment.status,'ACTUAL_PUBLISH_COMPLETED');assert.equal(deployment.projectId,'c29d224f-a662-4a15-b809-d86fa3b3f0ad');assert.equal(deployment.mergedMain,M);assert.equal(deployment.latest_commit_sha,M);
assert(typeof deployment.deployment_id==='string'&&deployment.deployment_id.length>0&&!deployment.deployment_id.startsWith('__'));
assert(Array.isArray(deployment.toolEvidenceSHA256)&&deployment.toolEvidenceSHA256.length>0&&deployment.toolEvidenceSHA256.every(v=>/^[a-f0-9]{64}$/.test(v)),'Actual tool evidence hashes');
const docs=deployment.docsOnlyAllowedPaths;assert(Array.isArray(docs)&&docs.every(v=>/^docs\/[^]*\.md$/.test(v)&&!v.split('/').includes('..')),'Explicit docs-only allowlist');
const changes=git('diff','--name-only','--no-renames',P,M).split('\n').filter(Boolean);
assert(changes.every(file=>docs.includes(file)),'Merged code/generated/config/package/index/script inputs differ from P');
assert.equal(git('ls-tree','-r','--name-only',M).split('\n').length,Number(N),'Actual complete merged-source count');
const ledgerBytes=fs.readFileSync('.rc/post-publication-p-dist.json');assert.equal(sha(ledgerBytes),'2e392f0bc17ca9c8ad4dccfb6bd959d75f9f0af9a1d019f13fcc69d011c55f97','Admitted P836 dist ledger');
const ledger=JSON.parse(ledgerBytes), expected=new Map();assert.equal(ledger.length,836);
for(const r of ledger){const name=r.name.replace(/^(?:\.\/)+/,'');assert(!expected.has(name)&&Number.isInteger(r.bytes)&&r.bytes>=0&&/^[a-f0-9]{64}$/.test(r.sha256));expected.set(name,{...r,name});}
const local=[];function walk(dir,prefix=''){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const name=prefix+e.name,full=path.join(dir,e.name);if(e.isDirectory())walk(full,name+'/');else{assert(e.isFile(),'Regular built files only');const body=fs.readFileSync(full);local.push({name,bytes:body.length,sha256:sha(body)});}}}
walk(path.join(ROOT,'dist'));assert.equal(local.length,836);
for(const r of local){const e=expected.get(r.name);assert(e&&e.bytes===r.bytes&&e.sha256===r.sha256,'Actual merged ordinary build must equal P836: '+r.name);}
assert(!fs.existsSync(OUT),'Fresh publication evidence');fs.mkdirSync(OUT,{recursive:true});
const save=(file,value)=>fs.writeFileSync(path.join(OUT,file),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
fs.writeFileSync(path.join(OUT,'publication-deployment.json'),deploymentBytes,{flag:'wx'});
save('APP-EQUIVALENCE.json',{M,TREE,sourceFiles:Number(N),P,PT,explicitDocsOnlyAllowed:docs,actualChangedPaths:changes,allOtherRepositoryBodiesModesHeld:true,actualLocalDistFiles:local,pDistLedgerSHA256:sha(ledgerBytes)});
const requests=[];let sequence=0;
function get(label,url){
 const u=new URL(url);assert(!u.username&&!u.password&&u.protocol==='https:');
 assert(u.origin===SITE||u.origin==='https://fonts.googleapis.com','Only owned public GET or actual home font stylesheet');
 const stem=String(++sequence).padStart(4,'0')+'-'+label,bodyFile=path.join(OUT,stem+'.body'),headerFile=path.join(OUT,stem+'.headers'),statusFile=path.join(OUT,stem+'.status'),errorFile=path.join(OUT,stem+'.stderr.log');
 const args=['--silent','--show-error','--compressed','--proto','=https','--dump-header',headerFile,'--output',bodyFile,'--write-out','%{http_code}',u.href],start=new Date().toISOString();
 const out=fs.openSync(statusFile,'wx'),err=fs.openSync(errorFile,'wx');let result;
 try{result=spawnSync('curl',args,{cwd:ROOT,stdio:['ignore',out,err]});}finally{fs.closeSync(out);fs.closeSync(err);}
 const body=fs.existsSync(bodyFile)?fs.readFileSync(bodyFile):Buffer.alloc(0),headers=fs.existsSync(headerFile)?fs.readFileSync(headerFile):Buffer.alloc(0);
 const row={label,url:u.href,method:'GET',start,end:new Date().toISOString(),command:'curl',args,status:result.status,signal:result.signal,error:result.error?String(result.error):null,httpStatus:Number(fs.readFileSync(statusFile,'utf8')),bodyFile:path.basename(bodyFile),headerFile:path.basename(headerFile),bytes:body.length,sha256:sha(body),headersSHA256:sha(headers)};
 requests.push(row);save(stem+'.process.json',row);
 assert(!row.error&&!row.signal&&row.status===0,'Actual public GET completed '+label);return {row,body,headers};
}
const liveURL=file=>{const u=new URL('/'+file.replace(/^\/+/,''),SITE);u.searchParams.set('v',M);return u.href;};
save('PREDECLARED-M-FEATURES.json',{M,features:featureContract,scope:'Source-pinned stable literal/property presence only. No full hosted code equivalence or behavior claim.'});
function htmlIdentity(actual){
 assert.equal(actual.row.httpStatus,200,'Actual HTML200 '+actual.row.label);
 const ids=[...actual.headers.toString('utf8').matchAll(/^x-deployment-id:\s*([^\r\n]+)\s*$/gim)].map(m=>m[1].trim());
 assert.equal(ids.length,1,'One actual deployment header '+actual.row.label);
 assert(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(deployment.deployment_id),'Bound actual D');
 const deploymentPattern=new RegExp('^psr2\\.'+deployment.deployment_id+'\\.[0-9]+\\.[A-Za-z0-9_-]+$');
 assert(deploymentPattern.test(ids[0]),'Actual HTML belongs to exact deployment D '+actual.row.label);
 const html=actual.body.toString('utf8').replace(/<!--[\s\S]*?-->/g,'').replace(/(<script\b[^>]*>)[\s\S]*?<\/script>/gi,'$1</script>');
 const commits=[...html.matchAll(/<[A-Za-z][^>]*>/g)].flatMap(tag=>[...tag[0].matchAll(/\bdata-commit-sha\s*=\s*(["'])([^"']+)\1/gi)].map(m=>m[2]));
 assert.deepEqual(commits,[M],'Actual HTML platform commit is M '+actual.row.label);
 return {label:actual.row.label,url:actual.row.url,deploymentHeader:ids[0],platformCommit:commits[0],...actual.row};
}
const home=get('home',liveURL('')),sitemap=get('sitemap',liveURL('sitemap.xml'));const htmlIdentities=[htmlIdentity(home)];assert.equal(sitemap.row.httpStatus,200);
const urls=xml=>[...new Set([...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map(m=>m[1]))].sort();
const committedBytes=fs.readFileSync('public/sitemap.xml'),committed=urls(committedBytes.toString('utf8')),served=urls(sitemap.body.toString('utf8'));
assert.equal(committed.length,172,'Exact committed sitemap URL count');assert.deepEqual(served,committed,'Complete merged/served172 sitemap URL set');assert.equal(sitemap.row.sha256,sha(committedBytes),'Actual sitemap body equals committed M');
save('SITEMAP-SET.json',{committed,served,equal:true,bodyEqual:true,committedBodySHA256:sha(committedBytes),servedBodySHA256:sitemap.row.sha256});
for(const route of ['/club-manager','/club-manager/','/soccer-career','/soccer-career/'])htmlIdentities.push(htmlIdentity(get('route-'+route.replace(/[^a-z0-9]/g,'_'),liveURL(route))));
assert.equal(htmlIdentities.length,5);
function ownedFile(literal,parent){
 const base=literal.startsWith('assets/')?SITE+'/':SITE+'/'+parent,u=new URL(literal,base);
 assert(u.origin===SITE&&!u.username&&!u.password&&!u.search&&!u.hash,'Only observed same-origin asset imports');
 const file=u.pathname.replace(/^\//,'');assert(/^assets\/[A-Za-z0-9_.-]+\.(?:js|css)$/.test(file),'Safe existing asset path');
 return file;
}
const tags=[...home.body.toString('utf8').matchAll(/<script\b[^>]*>/g)].map(m=>m[0]).filter(t=>/\btype=["']module["']/.test(t)).map(t=>/\bsrc=["']([^"']+)["']/.exec(t)?.[1]).filter(Boolean);
const entries=tags.map(v=>new URL(v,SITE+'/')).filter(u=>u.origin===SITE&&/^\/assets\/index[-_][A-Za-z0-9_-]+\.js$/.test(u.pathname));
assert.equal(entries.length,1,'One actual owned home module entry');const entryFile=ownedFile(entries[0].href,'index.html');
const fetched=new Map(),edges=[],edgeKeys=new Set(),roles={entry:new Set(),cm:new Set(),sc:new Set()};
function asset(file,parent,literal){
 assert(/^assets\/[A-Za-z0-9_.-]+\.(?:js|css)$/.test(file),'Safe observed asset');if(fetched.has(file))return fetched.get(file);
 const actual=get('asset-'+path.basename(file).replace(/[^a-zA-Z0-9._-]/g,'_'),liveURL(file));assert.equal(actual.row.httpStatus,200,'Observed asset200 '+file);
 const r={...actual,file,parent,literal};fetched.set(file,r);return r;
}
function refs(file,body){
 const text=body.toString('utf8'),rows=[];
 const add=(literal,kind)=>{const name=ownedFile(literal,file);if(!rows.some(v=>v.file===name&&v.literal===literal&&v.kind===kind))rows.push({parent:file,literal,file:name,kind});};
 for(const m of text.matchAll(/\bimport\s*\(\s*(["'])([^"'\\\s]+\.js)\1\s*\)/g))add(m[2],'dynamic-import');
 for(const m of text.matchAll(/\b(?:import|export)\s*(?:[^"'();\n]*?\bfrom\s*)?(["'])([^"'\\\s]+\.js)\1/g))add(m[2],'static-import');
 for(const m of text.matchAll(/["']([^"'\\\s]+\.css)["']/g))add(m[1],'quoted-css-reference');
 return rows;
}
const record=r=>{const key=JSON.stringify(r);if(!edgeKeys.has(key)){edgeKeys.add(key);edges.push(r);}};
const entry=asset(entryFile,'home',entries[0].pathname),entryRefs=refs(entryFile,entry.body);entryRefs.forEach(record);roles.entry.add(entryFile);
const routeRole=(name,pattern,records=entryRefs)=>{const rows=records.filter(r=>r.kind==='dynamic-import'&&pattern.test(r.file));assert.equal(rows.length,1,'One actual '+name+' lazy import in entry');return rows[0];};
const cm=routeRole('CM',/^assets\/ClubManager[-_][A-Za-z0-9_-]+\.js$/),sc=routeRole('SC',/^assets\/SoccerCareer[-_][A-Za-z0-9_-]+\.js$/);
function visit(file,role,parent,literal){
 if(roles[role].has(file))return;roles[role].add(file);const a=asset(file,parent,literal);if(file===entryFile)return;
 for(const r of refs(file,a.body)){record(r);visit(r.file,role,r.parent,r.literal);}
}
for(const r of entryRefs)if(r.kind==='static-import'||r.file.endsWith('.css'))visit(r.file,'entry',r.parent,r.literal);
visit(cm.file,'cm',cm.parent,cm.literal);visit(sc.file,'sc',sc.parent,sc.literal);
const core=[...roles.cm].filter(file=>/^assets\/clubManager[-_][A-Za-z0-9_-]+\.js$/.test(file));assert.equal(core.length,1,'One actual CM core reached from its route graph');
for(const tag of home.body.toString('utf8').matchAll(/<link\b[^>]*>/g)){
 if(!/\brel=["']stylesheet["']/.test(tag[0]))continue;const href=/\bhref=["']([^"']+)["']/.exec(tag[0])?.[1];assert(href,'Actual stylesheet href');
 const u=new URL(href,SITE+'/');if(u.origin===SITE){const file=ownedFile(href,'index.html');visit(file,'entry','home stylesheet',href);}
 else{assert.equal(u.origin,'https://fonts.googleapis.com');const fonts=JSON.parse(fs.readFileSync(process.env.POST_PUBLICATION_FONTS+'/manifest.json','utf8'));assert(fonts.some(f=>f.url===u.href),'Actual home font stylesheet belongs to prepared manifest');get('home-font-stylesheet',u.href);}
}
function featurePresence(bodies){
 return featureContract.map(f=>{
  const files=[...new Set([...roles.entry,...roles[f.role]])],hits=[];
  for(const file of files){const text=bodies.get(file).body.toString('utf8');let at=text.indexOf(f.literal);while(at!==-1){hits.push({file,offset:at,literal:f.literal,context:text.slice(Math.max(0,at-120),at+f.literal.length+120)});at=text.indexOf(f.literal,at+f.literal.length);}}
  return {...f,hits,present:hits.length>0};
 });
}
function requireFeatures(bodies){const results=featurePresence(bodies);assert(results.every(f=>f.present),'All predeclared M feature literals are present in actual role graphs');return results;}
const featureResults=featurePresence(fetched);
save('M-FEATURE-PRESENCE.json',{M,features:featureResults,scope:'Predeclared source-pinned literal/property presence in actual role-reached hosted bodies. Not AST equivalence, engine behavior or ticker-hover gameplay.'});
requireFeatures(fetched);
const originals=()=>requests.map(r=>{const body=fs.readFileSync(path.join(OUT,r.bodyFile)),headers=fs.readFileSync(path.join(OUT,r.headerFile));assert.equal(sha(body),r.sha256);assert.equal(sha(headers),r.headersSHA256);return {bodyFile:r.bodyFile,sha256:r.sha256,headerFile:r.headerFile,headersSHA256:r.headersSHA256};});
const originalHashes=originals(),controls=[];
function mustRefuse(name,mutations,check,reason){
 assert(mutations.length>0&&mutations.every(r=>r.beforeSHA256!==r.afterSHA256&&r.occurrences>0),'Control actually changed captured copies '+name);
 let error=null;try{check();}catch(e){error=e;}
 const row={name,mutations,error:error?{name:error.name,firstLine:String(error.message).split('\n')[0],message:String(error.message)}:null,noGET:true,originalMutation:false};
 controls.push(row);save('control-'+name+'.json',row);
 assert(error&&error.name==='AssertionError'&&row.error.firstLine.includes(reason),'Exact owned in-memory refusal '+name);
}
function changedText(file,buffer,before,after){const text=buffer.toString('utf8'),occurrences=text.split(before).length-1,body=Buffer.from(text.split(before).join(after));return {body,mutation:{file,beforeSHA256:sha(buffer),afterSHA256:sha(body),occurrences,replaced:before}};}
const badM=changedText(home.row.bodyFile,home.body,M,'0000000000000000000000000000000000000000');
mustRefuse('wrong-M',[badM.mutation],()=>htmlIdentity({...home,body:badM.body}),'Actual HTML platform commit is M');
const badD=changedText(home.row.headerFile,home.headers,deployment.deployment_id,'00000000-0000-0000-0000-000000000000');
mustRefuse('wrong-D',[badD.mutation],()=>htmlIdentity({...home,headers:badD.body}),'Actual HTML belongs to exact deployment D');
for(const [name,row,pattern] of [['CM',cm,/^assets\/ClubManager[-_][A-Za-z0-9_-]+\.js$/],['SC',sc,/^assets\/SoccerCareer[-_][A-Za-z0-9_-]+\.js$/]]){
 const token=path.basename(row.file),copy=changedText(entry.row.bodyFile,entry.body,token,'__REMOVED_'+name+'_REFERENCE__');assert(!copy.body.includes(Buffer.from(token)),'All matching role literals removed');
 mustRefuse('missing-'+name+'-entry',[copy.mutation],()=>routeRole(name,pattern,refs(entryFile,copy.body)),'One actual '+name+' lazy import in entry');
}
for(const [name,literal] of [['CM','cm-market-max-ask'],['SC','cm-red-star-fc'],['ticker','onPointerMove']]){
 assert(featureContract.some(f=>f.literal===literal),'Selected control uses predeclared source fingerprint');
 const copies=new Map(),mutations=[];for(const [file,a] of fetched){const copy=changedText(a.row.bodyFile,a.body,literal,'__REMOVED_'+name+'_FEATURE__');copies.set(file,{...a,body:copy.body});if(copy.mutation.occurrences>0)mutations.push(copy.mutation);}
 assert([...copies.values()].every(a=>!a.body.includes(Buffer.from(literal))),'All matching category fingerprint literals removed');
 mustRefuse('missing-'+name+'-feature',mutations,()=>requireFeatures(copies),'All predeclared M feature literals are present in actual role graphs');
}
assert.equal(controls.length,7);assert.deepEqual(originals(),originalHashes,'All original captured body/header files remain unchanged');
save('IN-MEMORY-CONTROLS.json',{controls,all7ExactOwnedRefusals:true,originalHashes,originalsUnchanged:true,additionalGETs:0});
save('ASSET-GRAPH.json',{M,P,entry:entryFile,cm:cm.file,sc:sc.file,cmCore:core[0],actualHomeModuleTags:tags,edges,roleFiles:Object.fromEntries(Object.entries(roles).map(([role,files])=>[role,[...files]])),assets:[...fetched].map(([file,a])=>({file,parent:a.parent,literal:a.literal,...a.row})),hostedPByteEquivalence:'NOT_ESTABLISHED_DIFFERENT_BUILD_INPUTS_POSSIBLE_ORIGINAL_FAILED_COMPARISON_PRESERVED',all836HostedClaim:false,featureAssociation:'Actual platform M/D plus source-pinned feature presence and observed CM/SC import graph. Mount audits remain separate.'});
save('HOSTED-M-GRAPH-OBSERVATION.json',{status:'HOSTED_M_GRAPH_AND_FEATURE_OBSERVATION_ONLY_MOUNT_AUDITS_PENDING',M,TREE,P,PT,deployment_id:deployment.deployment_id,sourcePins:pins,docsOnlyChanges:changes,localDistMatchedP836:true,hostedPByteEquivalence:'NOT_ESTABLISHED_ORIGINAL_FAILED_PROOF_PRESERVED',htmlIdentities,servedSitemapSetEqual:true,servedSitemapBodyEqual:true,requests,actualFetchedOwnedAssets:[...fetched.keys()],predeclaredFeatureCount:featureContract.length,allFeaturesPresent:true,inMemoryControls:controls,all7ExactOwnedRefusals:true,originalCapturedFilesUnchanged:true,all836HostedClaim:false,fullRawAndRenderedAudits:'PENDING_SEPARATE_PHASES',gameplayCredit:false,IndexNow:'NOT_INCLUDED'});
console.log('HOSTED_M_GRAPH_OBSERVATION: actual M/D HTML,172 sitemap, observed entry/lazy JS/CSS graph and predeclared source features captured; mount audits remain separate.');
