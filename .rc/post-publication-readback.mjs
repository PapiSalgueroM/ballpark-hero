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
 assert(!row.error&&!row.signal&&row.status===0,'Actual public GET completed '+label);return {row,body};
}
const liveURL=file=>{const u=new URL('/'+file.replace(/^\/+/,''),SITE);u.searchParams.set('v',M);return u.href;};
const home=get('home',liveURL('')),sitemap=get('sitemap',liveURL('sitemap.xml'));assert.equal(home.row.httpStatus,200);assert.equal(sitemap.row.httpStatus,200);
const urls=xml=>[...new Set([...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map(m=>m[1]))].sort();
const committed=urls(fs.readFileSync('public/sitemap.xml','utf8')),served=urls(sitemap.body.toString('utf8'));assert.deepEqual(served,committed,'Complete merged/served sitemap URL set');
save('SITEMAP-SET.json',{committed,served,equal:true,committedBodySHA256:sha(fs.readFileSync('public/sitemap.xml')),servedBodySHA256:sitemap.row.sha256});
for(const route of ['/club-manager','/club-manager/','/soccer-career','/soccer-career/'])get('route-'+route.replace(/[^a-z0-9]/g,'_'),liveURL(route));
const one=pattern=>{const names=[...expected.keys()].filter(v=>pattern.test(v));assert.equal(names.length,1,'One actual P role asset');return names[0];};
const entryExpected=one(/^assets\/index-[^/]+\.js$/),cm=one(/^assets\/ClubManager-[^/]+\.js$/),sc=one(/^assets\/SoccerCareer-[^/]+\.js$/);
const tags=[...home.body.toString('utf8').matchAll(/<script\b[^>]*>/g)].map(m=>m[0]).filter(t=>/\btype=["']module["']/.test(t)).map(t=>/\bsrc=["']([^"']+)["']/.exec(t)?.[1]).filter(Boolean);
const entries=tags.map(v=>new URL(v,SITE+'/')).filter(u=>u.origin===SITE&&u.pathname.replace(/^\//,'')===entryExpected);assert.equal(entries.length,1,'Actual home names the admitted P entry');
const fetched=new Map(),edges=[];
function asset(file,parent,literal){
 assert(expected.has(file)&&file.startsWith('assets/'),'Referenced asset belongs to admitted P');if(fetched.has(file))return fetched.get(file);
 const actual=get('asset-'+path.basename(file).replace(/[^a-zA-Z0-9._-]/g,'_'),liveURL(file)),e=expected.get(file);assert.equal(actual.row.httpStatus,200);assert.equal(actual.body.length,e.bytes);assert.equal(actual.row.sha256,e.sha256,'Actual JS/CSS body equals qualified P '+file);
 const r={...actual,file,parent,literal};fetched.set(file,r);return r;
}
function refs(file,body){
 const rows=[];for(const m of body.toString('utf8').matchAll(/["']([^"'\\\s]+\.(?:js|css))["']/g)){
  const candidates=[new URL(m[1],SITE+'/'),new URL(m[1],SITE+'/'+file)].filter(u=>u.origin===SITE).map(u=>u.pathname.replace(/^\//,'')).filter(v=>expected.has(v));
  const names=[...new Set(candidates)];assert(names.length<=1,'Unambiguous actual asset reference');if(names.length){const row={parent:file,literal:m[1],file:names[0]};if(!rows.some(v=>v.file===row.file&&v.literal===row.literal))rows.push(row);}
 }return rows;
}
const entry=asset(entryExpected,'home',entries[0].pathname),entryRefs=refs(entryExpected,entry.body);edges.push(...entryRefs);assert(entryRefs.some(r=>r.file===cm)&&entryRefs.some(r=>r.file===sc),'Both route lazy assets are actual entry references');
for(const tag of home.body.toString('utf8').matchAll(/<link\b[^>]*>/g)){
 if(!/\brel=["']stylesheet["']/.test(tag[0]))continue;const href=/\bhref=["']([^"']+)["']/.exec(tag[0])?.[1];assert(href,'Actual stylesheet href');
 const u=new URL(href,SITE+'/');if(u.origin===SITE)asset(u.pathname.replace(/^\//,''),'home stylesheet',href);
 else{assert.equal(u.origin,'https://fonts.googleapis.com');const fonts=JSON.parse(fs.readFileSync(process.env.POST_PUBLICATION_FONTS+'/manifest.json','utf8'));assert(fonts.some(f=>f.url===u.href),'Actual home font stylesheet belongs to prepared manifest');get('home-font-stylesheet',u.href);}
}
const visited=new Set([entryExpected]);
function visit(file,parent,literal){if(visited.has(file))return;visited.add(file);const a=asset(file,parent,literal);for(const r of refs(file,a.body)){edges.push(r);visit(r.file,r.parent,r.literal);}}
for(const r of entryRefs)if(r.file===cm||r.file===sc||r.file.endsWith('.css'))visit(r.file,r.parent,r.literal);
save('ASSET-GRAPH.json',{M,P,entry:entryExpected,cm,sc,actualHomeModuleTags:tags,edges,assets:[...fetched].map(([file,a])=>({file,parent:a.parent,literal:a.literal,...a.row})),allFetchedOwnedJSAndCSSEqualP:true,all836HostedClaim:false,featureAssociation:'Exact qualified P assets and unchanged application/script inputs bind the shared CM free-agent/price and SC league implementations. This is not gameplay.'});
save('READBACK-ADMISSION.json',{status:'PUBLIC_READBACK_ONLY_MOUNT_AUDITS_PENDING',M,TREE,P,PT,deployment_id:deployment.deployment_id,sourcePins:pins,docsOnlyChanges:changes,localDistMatchedP836:true,servedSitemapSetEqual:true,requests,actualFetchedOwnedAssets:[...fetched.keys()],all836HostedClaim:false,fullRawAndRenderedAudits:'PENDING_SEPARATE_PHASES',gameplayCredit:false,IndexNow:'NOT_INCLUDED'});
console.log('POST_PUBLICATION_READBACK: source, actual public entry/lazy JS/CSS and sitemap association captured; mount audits remain separate.');
