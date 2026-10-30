/* Remote continuation for the frozen Stadium product. No current-main or publication claim. */
import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
const ROOT = process.cwd(), OUT = process.env.PLACEMENT_OUT, Q = process.env.QUALIFICATION_ROOT;
const INPUT = path.join(OUT || '', 'inputs'), phase = process.argv[2];
const PRODUCT = '7fc9b3b3f8fe1170531cefc759b25078720d2c52', TREE = '15ba00595f02019e6a0eba8c0e8269d99da0c584';
const ZIP_SHA = 'd7122df900779712b2fda64f0c5d477ba981599a3eb4608b19b17ec519b3f069';
const ENGINE = 'bd510c2277e61eef5e7cbcf4f283c07124735c8f25b6503297fc61e477a0c428';
const FOOTLE = '855d96b7919837962e0983879122da8104482b6f6cf53a26f46e48c37eae1ee0';
const DRIVER = 'f1d4b7c79dd23b5e66f7cf129a4ebc3c2ceda93b231e7b8950f3cc4816a502ed';
const JOURNAL = 'cebc5ca6798b62f06a7a14132bfeffb2ab89f8b7f984ae84f5933632c77b3ede';
const QA = ['.github/workflows/stadium-plan-continuation.yml', 'scripts/qa/proveStadiumContinuation.mjs', 'scripts/qa/playStadiumLatePlan.mjs', 'scripts/qa/stadiumChildJournal.cjs'];
const HELPERS = {'helpers/run-gate.sh':'4fdb5ab0cbc5f35b712e06b5fb13288331dbec44e401d28682c2093b324b7ab3','helpers/prepared-fonts.cjs':'233080a7eccb75c071287e229e5413415bddb8fb0d1cbeb4a51ab36f6bfc6898','helpers/validate-prepared-flags.cjs':'ba708114749f2619d6e83f544983ad8fad27e98cd52445bcbc91610da0b1d043','helpers/stadium-browser.cjs':'b6bd02d0c44a4470328b1a5e9a7ee9857972923a75412567778c257a1f67a3a3','weights-cached-fonts.cjs':'877ba355cc1311f1c3a51df4ff1ca736cee660818ee19109d3f8da3866459140'};
const RELEASE = {'public/stadium-tycoon/index.html':'41169c79dfa3c5d2978c62317e1bfb73381377d33cdf13d6f07f200ef01639b5','public/sitemap.xml':'fa44d9d9a737d057b93b848e0cb47ed8e6f03e5d216445d47e159816c1b54688','scripts/data/lastmod.json':'c15b8c13223a0f1672c25130f7d1e4637fa10a1b407f02dbe9cdcd03a88de7cd','scripts/data/guideHeadingsFrozen.json':'a9fb2ee4497cb6228f84a83a49278ee48e12487a37020ea88eec44b5be94405f'};
const sha = b => createHash('sha256').update(b).digest('hex'), read = f => fs.readFileSync(f), json = f => JSON.parse(read(f)), fileSha = f => sha(read(f));
const write = (f,v) => { fs.mkdirSync(path.dirname(f),{recursive:true}); fs.writeFileSync(f,typeof v === 'string' ? v : JSON.stringify(v,null,2)+'\n',{flag:'wx'}); };
const exec = (command,args,options={}) => cp.execFileSync(command,args,{cwd:ROOT,encoding:'utf8',maxBuffer:64*1024*1024,...options});
const git = (...args) => exec('git',args).trimEnd();
const outside = (base,target) => {const rel=path.relative(base,target);return rel==='..'||rel.startsWith('..'+path.sep)||path.isAbsolute(rel);};
assert.equal(process.env.CI,'true'); assert.match(process.env.GITHUB_SHA || '',/^[a-f0-9]{40}$/); assert.equal(process.env.EXPECTED_PARENT,PRODUCT);
assert(OUT && Q && path.isAbsolute(OUT) && path.isAbsolute(Q) && outside(ROOT,OUT) && outside(ROOT,Q) && outside(Q,OUT));
fs.mkdirSync(OUT,{recursive:true});
function files(root) {
 const result={}; if(!fs.existsSync(root))return result;
 function walk(dir){for(const item of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const f=path.join(dir,item.name),rel=path.relative(root,f).split(path.sep).join('/');if(item.isSymbolicLink()) result[rel]={link:fs.readlinkSync(f)};else if(item.isDirectory())walk(f);else if(item.isFile()){const b=read(f);result[rel]={bytes:b.length,sha256:sha(b)};}else assert.fail('STADIUM_SPECIAL_FILE:'+f);}}
 walk(root);return result;
}
function tracked(root=ROOT){const rows=exec('git',['ls-files','-s','-z'],{cwd:root}).split('\0').filter(Boolean);return Object.fromEntries(rows.map(row=>{const m=row.match(/^(100644|100755) ([a-f0-9]{40}) 0\t(.+)$/);assert(m,'STADIUM_REGULAR_TRACKED_ONLY');return [m[3],{mode:m[1],blob:m[2],sha256:fileSha(path.join(root,m[3]))}];}));}
function untracked(root){return exec('git',['ls-files','--others','--exclude-standard','-z'],{cwd:root}).split('\0').filter(Boolean).sort();}
function identity(){
 assert.equal(git('rev-parse','HEAD'),process.env.GITHUB_SHA);assert.equal(git('show','-s','--format=%P','HEAD'),PRODUCT);assert.equal(git('rev-parse',PRODUCT+'^{tree}'),TREE);
 const parent=git('ls-tree','-r',PRODUCT).split('\n').map(x=>{const m=x.match(/^(100644|100755) blob ([a-f0-9]{40})\t(.+)$/);assert(m);return m;});assert.equal(parent.length,5458);
 const actual=tracked();assert.deepEqual(Object.keys(actual).sort(),[...parent.map(x=>x[3]),...QA].sort());
 for(const m of parent){assert.equal(actual[m[3]].mode,m[1]);if(m[3]!=='scripts/simFootleKitNumbers.mjs')assert.equal(actual[m[3]].blob,m[2],'STADIUM_PRODUCT_BODY_HELD:'+m[3]);}
 assert.equal(fileSha('src/lib/stadiumTycoon.ts'),ENGINE);assert.equal(fileSha('scripts/simFootleKitNumbers.mjs'),FOOTLE);assert.equal(fileSha('scripts/qa/playStadiumLatePlan.mjs'),DRIVER);assert.equal(fileSha('scripts/qa/stadiumChildJournal.cjs'),JOURNAL);
 assert.equal(git('hash-object','src/lib/stadiumTycoon.ts'),'b01fb7b2555f1528fadb2506c862c5b16eea878f');
 return {source:process.env.GITHUB_SHA,product:PRODUCT,tree:TREE,files:actual,declaredNonAppDelta:'scripts/simFootleKitNumbers.mjs',qa:QA,currentMainCompatibility:'UNPROVEN_SEPARATE_LEAD_INTEGRATION'};
}
const UNPACK = String.raw`
import sys, pathlib, zipfile, tarfile, hashlib, json
out=pathlib.Path(sys.argv[1]); original=out/'original-v5.zip'; target=out/'reused'; target.mkdir()
selected=['source.tar','early-dist.tar','dist.tar','qualified-public.tar','qualified-lastmod.json','font-cache.tar','guide-fixture/derived.json','guide-fixture/DERIVATION.json','guide-fixture/CONTROL.json','REUSED-FULL-SEO-INPUT.json','full-suite/ACTUAL-DEFAULT-FULL-SUITE-ADMISSION.json','full-suite/actual-runtime-errors.json','caps-font-summary.json','caps.exit','gates/seo-head-full-current/raw.exit','helpers/run-gate.sh','helpers/prepared-fonts.cjs','helpers/validate-prepared-flags.cjs','helpers/stadium-browser.cjs','weights-cached-fonts.cjs']
for method in ['simAdsense','simBrand','simHeadTags','simHiddenPages','simHubs','simIndexNow','simIndexing','simInternalLinks','simNoRivalNames','simPrerender','simPrerenderBoot','simRetiredRoutes','simSchema','simSeoTitles','simSitemap','simSnapshotAssets','simHomeCopy','simHomeFront','simSiteSearch','simTrustCopy']:
 selected.append('gates/'+method+'/raw.exit')
with zipfile.ZipFile(original) as z:
 names=z.namelist(); assert len(names)==len(set(names))==795
 ledger=[]
 for name in names:
  p=pathlib.PurePosixPath(name); assert not p.is_absolute() and '..' not in p.parts
  b=z.read(name); ledger.append(dict(name=name,bytes=len(b),sha256=hashlib.sha256(b).hexdigest()))
  if name in selected:
   f=target/name; f.parent.mkdir(parents=True,exist_ok=True); f.write_bytes(b)
 assert set(selected).issubset(names)
(out/'ORIGINAL-ZIP-MEMBERS.json').write_text(json.dumps(ledger,indent=2)+'\n')
for source,dest in [('source.tar','source'),('early-dist.tar','early-dist'),('dist.tar','dist'),('qualified-public.tar','public'),('font-cache.tar','fonts')]:
 base=target/dest; base.mkdir(); entries=[]
 with tarfile.open(target/source) as tar:
  for member in tar:
   p=pathlib.PurePosixPath(member.name); assert not p.is_absolute() and '..' not in p.parts and (member.isdir() or member.isfile())
   file=base.joinpath(*p.parts)
   if member.isdir():file.mkdir(parents=True,exist_ok=True)
   else:
    file.parent.mkdir(parents=True,exist_ok=True); b=tar.extractfile(member).read(); file.write_bytes(b)
    entries.append(dict(path=str(p),bytes=len(b),sha256=hashlib.sha256(b).hexdigest()))
 (target/(dest+'-bodies.json')).write_text(json.dumps(entries,indent=2)+'\n')
`;
async function original(){
 const state=identity();write(path.join(OUT,'PROOF-INPUT-IDENTITY.json'),state);
 assert(process.env.PRIOR_ARTIFACT_TOKEN);const response=await fetch('https://api.github.com/repos/PapiSalgueroM/ballpark-hero/actions/artifacts/12957707602/zip',{headers:{authorization:'Bearer '+process.env.PRIOR_ARTIFACT_TOKEN,accept:'application/vnd.github+json'}});assert(response.ok,'STADIUM_ORIGINAL_DOWNLOAD_HTTP_'+response.status);await pipeline(Readable.fromWeb(response.body),fs.createWriteStream(path.join(OUT,'original-v5.zip'),{flags:'wx'}));
 assert.equal(fs.statSync(path.join(OUT,'original-v5.zip')).size,190935369);assert.equal(fileSha(path.join(OUT,'original-v5.zip')),ZIP_SHA,'STADIUM_ORIGINAL_ZIP_HASH_FIRST');
 exec('python3',['-c',UNPACK,OUT]);const old=path.join(OUT,'reused','source');
 const expected=git('ls-tree','-r',PRODUCT).split('\n');for(const row of expected){const m=row.match(/^\d+ blob ([a-f0-9]{40})\t(.+)$/),body=read(path.join(old,m[2]));assert.equal(createHash('sha1').update(Buffer.from('blob '+body.length+'\0')).update(body).digest('hex'),m[1],'STADIUM_ORIGINAL_PRODUCT_BODY:'+m[2]);}
 assert.equal(Object.keys(files(old)).length,5460);for(const [file,pin]of Object.entries(HELPERS))assert.equal(fileSha(path.join(OUT,'reused',file)),pin);
 fs.mkdirSync(INPUT);for(const file of Object.keys(HELPERS)){const dest=path.join(INPUT,file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(OUT,'reused',file),dest);}
 const wf=read(path.join(old,'.github/workflows/stadium-plan-qualified.yml')).toString();assert.equal(sha(wf),'d2c82bdca05ac0cd4a2fb5cf61e843830b47121870b7e05d62d3f5e4178d9879');
 const start=wf.indexOf('          : > "$out/caps-server.transport";'),end=wf.indexOf('\n      - name: Reuse admitted prior full SEO',start);assert(start>0&&end>start);
 const body=wf.slice(start,end).split('\n').map(line=>{assert(!line||line.startsWith('          '));return line.slice(10);}).join('\n');
 write(path.join(INPUT,'helpers/caps-proof.sh'),'set -euo pipefail\ncd "$QUALIFICATION_ROOT"\nout="$PLACEMENT_OUT"\n: > "$out/caps-controller.transport"\nexport NODE_OPTIONS="--require=$PWD/scripts/lib/offlineTransport.cjs"\n'+body+'\n');
 for(const file of ['run-gate.sh','prepared-fonts.cjs','validate-prepared-flags.cjs','stadium-browser.cjs']){fs.mkdirSync(path.join(OUT,'helpers'),{recursive:true});fs.copyFileSync(path.join(INPUT,'helpers',file),path.join(OUT,'helpers',file));}
 fs.copyFileSync(path.join(INPUT,'weights-cached-fonts.cjs'),path.join(OUT,'weights-cached-fonts.cjs'));
 fs.cpSync(path.join(OUT,'reused','fonts'),path.join(INPUT,'fonts'),{recursive:true});write(path.join(OUT,'ORIGINAL-REUSE-PINS.json'),{run:41001903471,attempt:1,artifact:12957707602,zipSHA256:ZIP_SHA,originalStatus:'CANCELLED_REMAINS_CANCELLED',currentFullBuildSeoExecuted:false,priorFullSeo:json(path.join(OUT,'reused','REUSED-FULL-SEO-INPUT.json'))});
}
function verifyInputs(){
 const manifestFile=path.join(INPUT,'manifest.json');assert.equal(fileSha(manifestFile),process.env.EXPECTED_INPUT_MANIFEST_SHA,'STADIUM_INPUT_MANIFEST_BOUND');const m=json(manifestFile);assert.equal(m.source,process.env.GITHUB_SHA);assert.equal(m.product,PRODUCT);assert.equal(m.run,process.env.GITHUB_RUN_ID);assert.equal(m.attempt,process.env.GITHUB_RUN_ATTEMPT);
 const actual=files(INPUT);delete actual['manifest.json'];assert.deepEqual(actual,m.files,'STADIUM_EXACT_INPUT_MEMBERS_AND_BODIES');return m;
}
function environment(){
 const fonts=path.join(INPUT,'fonts');assert(fs.existsSync(path.join(fonts,'manifest.json')));for(const [name,value]of Object.entries({FREE_KICK_FONT_CACHE:fonts,FONT_CACHE_MANIFEST_SHA256:fileSha(path.join(fonts,'manifest.json'))}))fs.appendFileSync(process.env.GITHUB_ENV,name+'='+value+'\n');
}
function begin(){
 identity();if(process.env.STADIUM_PHASE!=='inputs'){verifyInputs();for(const [file,pin]of Object.entries(HELPERS)){assert.equal(fileSha(path.join(INPUT,file)),pin);const target=path.join(OUT,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(INPUT,file),target);}}
 write(path.join(OUT,'SOURCE-BEFORE.json'),tracked());write(path.join(OUT,'CHECKOUT-UNTRACKED-BEFORE.json'),untracked(ROOT));write(path.join(OUT,'REFS-BEFORE.txt'),git('for-each-ref','--format=%(refname) %(objectname)')+'\n');write(path.join(OUT,'INDEX-BEFORE.txt'),fileSha(git('rev-parse','--git-path','index'))+'\n');
 assert(!fs.existsSync(Q));exec('git',['worktree','add','--detach',Q,'HEAD']);fs.symlinkSync(path.join(ROOT,'node_modules'),path.join(Q,'node_modules'),'dir');
 write(path.join(OUT,'MATCHED-BEFORE.json'),tracked(Q));write(path.join(OUT,'MATCHED-INDEX-BEFORE.txt'),fileSha(path.resolve(Q,exec('git',['rev-parse','--git-path','index'],{cwd:Q}).trimEnd()))+'\n');write(path.join(OUT,'FONTS-BEFORE.json'),files(path.join(INPUT,'fonts')));write(path.join(OUT,'DEPS-BEFORE.json'),files(path.join(ROOT,'node_modules')));write(path.join(OUT,'TOOLS-BEFORE.json'),files(process.env.PLACEMENT_TOOLS));
 const before=json(path.join(OUT,'DEPS-BEFORE.json'));assert(!Object.keys(before).some(f=>f.startsWith('.vite/vitest/')),'STADIUM_CLEAN_INITIAL_VITEST_CACHE');
 if(process.env.STADIUM_PHASE!=='inputs'){exec('tar',['-xf',path.join(INPUT,'dist.tar'),'-C',Q]);applyRelease();write(path.join(OUT,'DIST-BEFORE.json'),files(path.join(Q,'dist')));}
 write(path.join(OUT,'HELPERS-BEFORE.json'),files(path.join(OUT,'helpers')));environment();
}
function applyRelease(){for(const [file,pin]of Object.entries(RELEASE)){const source=path.join(INPUT,'release',file);assert.equal(fileSha(source),pin);fs.copyFileSync(source,path.join(Q,file));}}
function copiedControl(dir,id,foundation,mutate,judge,marker){
 fs.mkdirSync(dir,{recursive:true});const actual=JSON.stringify(foundation,null,2)+'\n',working=path.join(dir,id+'.working.json');write(working,actual);const changed=JSON.parse(actual);mutate(changed);const body=JSON.stringify(changed,null,2)+'\n';assert.notEqual(sha(body),sha(actual));let error;
 try{fs.writeFileSync(working,body);write(path.join(dir,id+'.changed.json'),read(working).toString());try{judge(json(working));}catch(e){error=e;}}finally{fs.writeFileSync(working,actual);write(path.join(dir,id+'.restored.json'),read(working).toString());}
 assert(error instanceof assert.AssertionError&&error.message.includes(marker),'STADIUM_CONTROL_EFFECTIVE:'+id);assert.equal(fileSha(working),sha(actual));judge(json(working));return{id,scope:'ACTUAL_RECEIPT_COPY_CLASSIFIER_ONLY',featurePassCredit:false,beforeSHA256:sha(actual),changedSHA256:sha(body),restoredSHA256:fileSha(working),sameCopyRestored:true,failure:{name:error.name,message:error.message}};
}
function admit(){
 const reused=path.join(OUT,'reused'),early=files(path.join(reused,'early-dist')),fresh=files(path.join(Q,'dist')),old=files(path.join(reused,'dist'));
 assert.equal(Object.keys(fresh).length,833);assert.deepEqual(fresh,early,'STADIUM_FRESH_833_EARLY_MEMBERS_AND_BODIES');const assets=Object.fromEntries(Object.entries(fresh).filter(([key])=>key.startsWith('assets/')));assert.equal(Object.keys(assets).length,613);
 const judge=v=>assert.deepEqual(v,assets,'STADIUM_FRESH_ASSET_MEMBERS_AND_BODIES');const first=Object.keys(assets)[0],controls=[copiedControl(path.join(OUT,'asset-controls'),'changed-body',assets,v=>v[first].sha256=sha('Declared copied asset fault'),judge,'STADIUM_FRESH_ASSET_MEMBERS_AND_BODIES'),copiedControl(path.join(OUT,'asset-controls'),'missing-member',assets,v=>delete v[first],judge,'STADIUM_FRESH_ASSET_MEMBERS_AND_BODIES')];
 const differences=Object.keys(old).filter(k=>JSON.stringify(old[k])!==JSON.stringify(early[k]));assert.deepEqual(differences.sort(),['sitemap.xml','stadium-tycoon/index.html']);
 const before=json(path.join(Q,'scripts/data/lastmod.json')),after=json(path.join(reused,'qualified-lastmod.json'));assert.deepEqual(Object.keys(after),Object.keys(before));const route='/stadium-tycoon';
 assert.deepEqual(before[route],{hash:'4fb8af7494ca1c2b',date:'2026-10-23'});assert.deepEqual(after[route],{hash:'4c75c74046eccf7c',date:'2026-10-30'});for(const key of Object.keys(before))if(key!==route)assert.deepEqual(after[key],before[key],'STADIUM_LEDGER_OTHER_ROUTE_HELD:'+key);
 const guideBefore=json(path.join(Q,'scripts/data/guideHeadingsFrozen.json')),guideAfter=json(path.join(reused,'guide-fixture/derived.json')),derivation=json(path.join(reused,'guide-fixture/DERIVATION.json')),control=json(path.join(reused,'guide-fixture/CONTROL.json'));
 assert.equal(derivation.source,'9db32ac2804dfda3011cdc91c590f4c15a60cf24');assert.equal(derivation.idempotentSecondRun,true);assert.equal(derivation.derivedSHA256,RELEASE['scripts/data/guideHeadingsFrozen.json']);assert.equal(control.negativeRaw,1);assert.equal(control.restoredRaw,0);assert.equal(control.sameCanonicalFixtureRestored,true);
 assert.deepEqual(Object.keys(guideBefore),Object.keys(guideAfter));assert.deepEqual(Object.keys(guideBefore.routes),Object.keys(guideAfter.routes));for(const key of Object.keys(guideBefore.routes))if(key!==route)assert.deepEqual(guideAfter.routes[key],guideBefore.routes[key]);for(const key of Object.keys(guideBefore))if(key!=='routes'&&key!=='about')assert.deepEqual(guideAfter[key],guideBefore[key]);assert.deepEqual(guideAfter.routes[route].rules,guideBefore.routes[route].rules);assert.deepEqual(guideAfter.routes[route].tips,guideBefore.routes[route].tips);
 const sources={'public/stadium-tycoon/index.html':path.join(reused,'public/stadium-tycoon/index.html'),'public/sitemap.xml':path.join(reused,'public/sitemap.xml'),'scripts/data/lastmod.json':path.join(reused,'qualified-lastmod.json'),'scripts/data/guideHeadingsFrozen.json':path.join(reused,'guide-fixture/derived.json')};
 for(const [file,source]of Object.entries(sources)){assert.equal(fileSha(source),RELEASE[file]);const dest=path.join(INPUT,'release',file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(source,dest);}applyRelease();
 for(const file of differences)fs.copyFileSync(path.join(reused,'dist',file),path.join(Q,'dist',file));assert.deepEqual(files(path.join(Q,'dist')),old,'STADIUM_EXACT_ADMITTED_833_FINAL_BODIES');
 exec('tar',['-cf',path.join(INPUT,'dist.tar'),'-C',Q,'dist']);write(path.join(OUT,'DIST-BEFORE.json'),files(path.join(Q,'dist')));
 const units=json(path.join(reused,'full-suite/ACTUAL-DEFAULT-FULL-SUITE-ADMISSION.json')),runtime=json(path.join(reused,'full-suite/actual-runtime-errors.json'));assert.equal(runtime.count,0);assert.equal(runtime.arrayReceived,true);assert.deepEqual(runtime.errors,[]);assert.equal(read(path.join(reused,'caps.exit')).toString().trim(),'0');assert.equal(read(path.join(reused,'gates/seo-head-full-current/raw.exit')).toString().trim(),'0');
 const readers=['simAdsense','simBrand','simHeadTags','simHiddenPages','simHubs','simIndexNow','simIndexing','simInternalLinks','simNoRivalNames','simPrerender','simPrerenderBoot','simRetiredRoutes','simSchema','simSeoTitles','simSitemap','simSnapshotAssets','simHomeCopy','simHomeFront','simSiteSearch','simTrustCopy'];for(const method of readers)assert.equal(read(path.join(reused,'gates',method,'raw.exit')).toString().trim(),'0');
 assert.equal(read(path.join(OUT,'caps.exit')).toString().trim(),'0');const caps=json(path.join(OUT,'caps-font-summary.json'));assert.equal(caps.capRows,15);assert.equal(caps.complete,true);assert.equal(caps.source,process.env.GITHUB_SHA);
 write(path.join(INPUT,'admission.json'),{schema:1,source:process.env.GITHUB_SHA,product:PRODUCT,productTree:TREE,run:process.env.GITHUB_RUN_ID,attempt:process.env.GITHUB_RUN_ATTEMPT,sourceFiles:5462,engineSHA256:ENGINE,strength:4,driverSHA256:DRIVER,onlyNewNonAppDependency:{path:'scripts/simFootleKitNumbers.mjs',gitBlob:'8aae063c6b06d99d631f583096662c7174930749',cleanProduct:'07e0659c638f7a8f8adffca8140aacd1bc42de2d',qualifiedRun:41013778788},freshVite:{earlyBodies:833,assets:613,allEarlyBodiesExact:true,assetControls:controls},freshCaps:caps,distFinalBodies:old,release:RELEASE,publicBodiesOverwritten:2,ledgerOnlyChangedRoute:route,guideDerivation:derivation,guideControl:control,reusedUnits:units,reusedRuntime:runtime,reusedReaderRawZero:readers,priorFullSeo:json(path.join(reused,'REUSED-FULL-SEO-INPUT.json')),cancelledDefaultDispatch:'NO_COMPLETION_CREDIT',currentFullBuildSeoExecuted:false,reusedOriginalStatus:'CANCELLED_REMAINS_CANCELLED',currentMainCompatibility:'SEPARATE_UNPROVEN',shipOutputs:'REFERENCE_UNSHIPPED'});
}
function seal(){assert.equal(json(path.join(OUT,'FINAL-HOLDS.json')).raw,0);fs.copyFileSync(path.join(OUT,'FINAL-HOLDS.json'),path.join(INPUT,'INPUT-HOLDS.json'));const m={schema:1,source:process.env.GITHUB_SHA,product:PRODUCT,run:process.env.GITHUB_RUN_ID,attempt:process.env.GITHUB_RUN_ATTEMPT,files:files(INPUT)};write(path.join(INPUT,'manifest.json'),m);fs.appendFileSync(process.env.GITHUB_OUTPUT,'manifest_sha='+fileSha(path.join(INPUT,'manifest.json'))+'\n');}
function journalJudge(rows,plan){
 assert.equal(rows.filter(r=>r.event==='journal-active').length,1,'STADIUM_DEFAULT_JOURNAL_ACTIVE');assert(!rows.some(r=>['error','spawn-throw','journal-error'].includes(r.event)),'STADIUM_DEFAULT_JOURNAL_ERRORS_ZERO');const starts=rows.filter(r=>r.event==='start'),closes=rows.filter(r=>r.event==='close');assert.equal(starts.length,plan.length,'STADIUM_DEFAULT_JOURNAL_EXACT_STARTS');assert.equal(closes.length,plan.length,'STADIUM_DEFAULT_JOURNAL_EXACT_CLOSES');assert.deepEqual(starts.map(r=>path.basename(r.args[0])).sort(),[...plan].sort(),'STADIUM_DEFAULT_JOURNAL_SELECTION');assert.equal(new Set(starts.map(r=>r.id)).size,plan.length);
 for(const start of starts){assert.equal(start.command,process.execPath);assert.equal(start.cwd,Q);assert.equal(start.args.length,1);assert.equal(start.args[0],path.join(Q,'scripts',path.basename(start.args[0])));assert(Number.isSafeInteger(start.pid)&&start.pid>0);const close=closes.filter(r=>r.id===start.id);assert.equal(close.length,1);assert.equal(close[0].pid,start.pid,'STADIUM_DEFAULT_JOURNAL_PID');assert.equal(close[0].signal,null);assert(Number.isInteger(close[0].code)&&close[0].code>=0);assert(Number.isFinite(close[0].durationMs)&&close[0].durationMs>=0);for(const stream of ['stdout','stderr']){assert.equal(path.basename(start[stream]),start[stream]);assert(fs.statSync(path.join(OUT,'child-journal',start[stream])).isFile());}}
}
function defaultAdmission(){
 verifyInputs();const plan=json(path.join(OUT,'gates/default-sims-plan/stdout.log'));assert.equal(plan.nodeGroup.length,821);assert.equal(plan.browserGroup.length,198);assert(plan.nodeGroup.includes('simFootleKitNumbers.mjs'));assert.equal(read(path.join(OUT,'gates/default-node-sims/raw.exit')).toString().trim(),'0');
 const stdout=read(path.join(OUT,'gates/default-node-sims/stdout.log')).toString(),verdicts=[...stdout.matchAll(/^  (PASS|SKIP|FAIL|EMPTY) +([A-Za-z0-9]+\.mjs) +[0-9.]+s$/gm)].map(m=>({verdict:m[1],file:m[2]}));assert.equal(verdicts.length,821);assert.deepEqual(verdicts.map(r=>r.file).sort(),[...plan.nodeGroup].sort());assert(verdicts.every(r=>r.verdict==='PASS'||r.verdict==='SKIP'));
 const pass=verdicts.filter(r=>r.verdict==='PASS').length,skip=verdicts.length-pass,closing='All '+pass+' harnesses green'+(skip?', '+skip+' skipped above':'')+'.';assert.equal(stdout.split('\n').filter(line=>line===closing).length,1,'STADIUM_DEFAULT_ACTUAL_CLOSING');
 assert(!fs.existsSync(path.join(OUT,'child-journal/journal-errors.jsonl')));const rows=read(path.join(OUT,'child-journal/journal.jsonl')).toString().trim().split('\n').map(x=>JSON.parse(x));journalJudge(rows,plan.nodeGroup);
 const controls=[copiedControl(path.join(OUT,'journal-controls'),'missing-close',rows,v=>v.splice(v.findIndex(r=>r.event==='close'),1),v=>journalJudge(v,plan.nodeGroup),'STADIUM_DEFAULT_JOURNAL_EXACT_CLOSES'),copiedControl(path.join(OUT,'journal-controls'),'wrong-pid',rows,v=>v.find(r=>r.event==='close').pid=-1,v=>journalJudge(v,plan.nodeGroup),'STADIUM_DEFAULT_JOURNAL_PID')];
 const footle=rows.find(r=>r.event==='start'&&path.basename(r.args[0])==='simFootleKitNumbers.mjs'),footleClose=rows.find(r=>r.event==='close'&&r.id===footle.id),footleOutput=read(path.join(OUT,'child-journal',footle.stdout)).toString()+read(path.join(OUT,'child-journal',footle.stderr));assert.equal(verdicts.find(r=>r.file==='simFootleKitNumbers.mjs').verdict,'SKIP');assert.equal(footleClose.code,1);assert.match(footleOutput,/NOTHING WAS CHECKED/);assert.match(footleOutput,/\[SIM_OFFLINE_BLOCK\] database /);
 write(path.join(OUT,'DEFAULT-SIMS-ADMISSION.json'),{source:process.env.GITHUB_SHA,product:PRODUCT,scope:'UNCHANGED_ACTUAL_DEFAULT_NODE_DISPATCH_OFFLINE',raw:0,planNode:821,sourceExcludedBrowser:198,pass,skip,verdicts,journalStarts:821,journalCloses:821,journalCopiedControls:controls,childStreams:files(path.join(OUT,'child-journal')),journalChangesChildArgumentsOrVerdicts:false,footle:'ACTUAL_OFFLINE_REFUSAL_CLASSIFIED_SKIP_NOT_PASS',optionalDatabaseProfiles:'ONLY_ACTUAL_SOURCE_PRINTED_SKIPS_NO_LIVE_PROBE',browserGroup:'UNRUN_BY_DEFAULT',oldCancelledRun:'NO_COMPLETION_CREDIT'});
}
function dependencyHold(){
 const before=json(path.join(OUT,'DEPS-BEFORE.json')),after=files(path.join(ROOT,'node_modules'));write(path.join(OUT,'DEPS-AFTER.json'),after);const cache='.vite/vitest/da39a3ee5e6b4b0d3255bfef95601890afd80709/results.json';const additions=Object.keys(after).filter(k=>!(k in before));assert(additions.every(k=>k===cache),'STADIUM_ONLY_EXACT_VITEST_RESULT_CACHE');assert(additions.length<=1);const cacheRows=[];
 for(const key of additions){assert.equal(json(path.join(ROOT,'node_modules/vitest/package.json')).version,'3.2.7');assert.equal(fileSha(path.join(ROOT,'node_modules/vitest/dist/chunks/cli-api.DVe0nWUx.js')),'4c2fecfeb976ee9cdf00cf4a03daef462cefd08e0e502b2ce7c1daf3ac540135');const body=read(path.join(ROOT,'node_modules',key));write(path.join(OUT,'generated/default-vitest-results-cache.json'),body.toString());const data=JSON.parse(body);assert.deepEqual(Object.keys(data).sort(),['results','version']);assert.equal(data.version,'3.2.7');assert(Array.isArray(data.results)&&data.results.length>0);const keys=new Set();for(const row of data.results){assert(Array.isArray(row)&&row.length===2);assert.equal(typeof row[0],'string');assert(/^:[^\0\r\n]+\.(?:[cm]?[jt]sx?)$/.test(row[0]));assert(!keys.has(row[0]));keys.add(row[0]);assert.deepEqual(Object.keys(row[1]).sort(),['duration','failed']);assert.equal(typeof row[1].failed,'boolean');assert(Number.isFinite(row[1].duration)&&row[1].duration>=0);}cacheRows.push({path:'node_modules/'+key,...after[key],kind:'GENERATED_DEFAULT_VITEST_OUTPUT_NOT_PACKAGE_CODE',failedFlagsAreNotParentVerdicts:true});delete after[key];}
 assert.deepEqual(after,before,'STADIUM_ORIGINAL_DEPENDENCY_BODIES_AND_LINKS_HELD');return cacheRows;
}
function hold(){
 const failures=[],check=(id,fn)=>{try{return fn();}catch(error){failures.push({id,name:error.name,message:String(error.stack||error)});return null;}};
 check('checkout-source',()=>assert.deepEqual(tracked(),json(path.join(OUT,'SOURCE-BEFORE.json'))));check('checkout-untracked',()=>assert.deepEqual(untracked(ROOT),json(path.join(OUT,'CHECKOUT-UNTRACKED-BEFORE.json'))));check('refs',()=>assert.equal(git('for-each-ref','--format=%(refname) %(objectname)')+'\n',read(path.join(OUT,'REFS-BEFORE.txt')).toString()));check('index',()=>assert.equal(fileSha(git('rev-parse','--git-path','index'))+'\n',read(path.join(OUT,'INDEX-BEFORE.txt')).toString()));
 check('matched-source',()=>{const before=json(path.join(OUT,'MATCHED-BEFORE.json')),after=tracked(Q);write(path.join(OUT,'MATCHED-AFTER.json'),after);assert.deepEqual(Object.keys(after),Object.keys(before));for(const file of Object.keys(before)){assert.equal(after[file].mode,before[file].mode);assert.equal(after[file].blob,before[file].blob);assert.equal(after[file].sha256,file in RELEASE&&fs.existsSync(path.join(INPUT,'release',file))?RELEASE[file]:before[file].sha256,'STADIUM_MATCHED_SOURCE_HELD:'+file);}});
 const wall=check('matched-untracked',()=>{const names=untracked(Q),allowed='.tmp-fx/wall-shot-tests.json';write(path.join(OUT,'MATCHED-UNTRACKED-AFTER.json'),names);for(const name of names){const from=path.join(Q,name);assert(!outside(Q,from));if(fs.lstatSync(from).isFile()){const to=path.join(OUT,'retained-untracked',name);fs.mkdirSync(path.dirname(to),{recursive:true});fs.copyFileSync(from,to);}}assert(names.every(f=>f===allowed),'STADIUM_UNEXPLAINED_UNTRACKED_DRIFT');if(!names.length)return null;const file=path.join(Q,allowed);assert(fs.lstatSync(file).isFile());const body=read(file);JSON.parse(body);write(path.join(OUT,'generated/wall-shot-tests.json'),body.toString());return{path:allowed,bytes:body.length,sha256:sha(body),sourceOwner:'scripts/simCareerWallShotFriendly.mjs:9'};});
 check('matched-index',()=>assert.equal(fileSha(path.resolve(Q,exec('git',['rev-parse','--git-path','index'],{cwd:Q}).trimEnd()))+'\n',read(path.join(OUT,'MATCHED-INDEX-BEFORE.txt')).toString()));check('fonts',()=>assert.deepEqual(files(path.join(INPUT,'fonts')),json(path.join(OUT,'FONTS-BEFORE.json'))));const cache=check('dependency-bodies',dependencyHold);check('tools',()=>assert.deepEqual(files(process.env.PLACEMENT_TOOLS),json(path.join(OUT,'TOOLS-BEFORE.json'))));check('helpers',()=>assert.deepEqual(files(path.join(OUT,'helpers')),json(path.join(OUT,'HELPERS-BEFORE.json'))));check('weights-helper',()=>assert.equal(fileSha(path.join(OUT,'weights-cached-fonts.cjs')),HELPERS['weights-cached-fonts.cjs']));check('dist',()=>assert.deepEqual(files(path.join(Q,'dist')),json(path.join(OUT,'DIST-BEFORE.json'))));
 if(process.env.STADIUM_PHASE!=='inputs')check('input-bodies',verifyInputs);
 if(fs.existsSync(path.join(OUT,'child-journal/journal.jsonl')))check('retain-partial-journal',()=>{const rows=read(path.join(OUT,'child-journal/journal.jsonl')).toString().trim().split('\n').map(x=>JSON.parse(x));write(path.join(OUT,'PARTIAL-OR-COMPLETE-JOURNAL.json'),{source:process.env.GITHUB_SHA,starts:rows.filter(x=>x.event==='start').length,closes:rows.filter(x=>x.event==='close').length,rows:rows.length,admissionExists:fs.existsSync(path.join(OUT,'DEFAULT-SIMS-ADMISSION.json')),partialEvidenceIsNotSuitePass:true,files:files(path.join(OUT,'child-journal'))});});
 exec('git',['archive','--format=tar','--output='+path.join(OUT,'source.tar'),'HEAD']);write(path.join(OUT,'SOURCE-AFTER.json'),tracked());write(path.join(OUT,'FINAL-HOLDS.json'),{source:process.env.GITHUB_SHA,phase:process.env.STADIUM_PHASE,raw:failures.length?1:0,failures,generatedCache:cache,wallShot:wall,trackedReleaseOutputsUnshipped:RELEASE,noBroadTmpOrViteAllowance:true});assert.equal(failures.length,0,'STADIUM_FINAL_HOLDS_ZERO');
}
function browserAdmission(){verifyInputs();const a=json(path.join(OUT,'stadium-browser/BROWSER-ADMISSION.json'));assert.equal(a.source,process.env.GITHUB_SHA);assert.equal(a.actualEngineSHA256,ENGINE);assert.equal(a.rawExit,0);assert.equal(a.profiles,5);assert.equal(a.normalImages,10);assert.equal(a.compiledGroupPhysicalControl,1);assert.equal(a.sameCanonicalCompiledFileRestored,true);assert.equal(a.completionCopyControls,2);write(path.join(OUT,'BROWSER-JOB-ADMISSION.json'),{...a,currentMainCompatibility:'SEPARATE_UNPROVEN',oldDefaultDispatchCredit:false,visualOriginalReviewStillOwed:true});}
function join(){
 assert.equal(process.env.INPUT_RESULT,'success');assert.equal(process.env.BROWSER_RESULT,'success');assert.equal(process.env.DEFAULT_RESULT,'success');
 const base=process.env.JOIN_INPUT,manifest=json(path.join(base,'inputs/manifest.json'));assert.equal(fileSha(path.join(base,'inputs/manifest.json')),process.env.EXPECTED_INPUT_MANIFEST_SHA);assert.equal(manifest.source,process.env.GITHUB_SHA);const inputFiles=files(path.join(base,'inputs'));delete inputFiles['manifest.json'];assert.deepEqual(inputFiles,manifest.files);assert.equal(json(path.join(base,'inputs/INPUT-HOLDS.json')).raw,0);
 for(const job of ['browser','default']){const dir=path.join(base,job);assert.equal(json(path.join(dir,'FINAL-HOLDS.json')).raw,0);const file=job==='browser'?'BROWSER-JOB-ADMISSION.json':'DEFAULT-SIMS-ADMISSION.json';assert.equal(json(path.join(dir,file)).source,process.env.GITHUB_SHA);}
 write(path.join(OUT,'CONTINUATION-JOIN.json'),{source:process.env.GITHUB_SHA,product:PRODUCT,engineSHA256:ENGINE,driverSHA256:DRIVER,strength:4,status:'FROZEN_PRODUCT_SCOPED_CONTINUATION_JOBS_JOINED',inputManifestSHA256:process.env.EXPECTED_INPUT_MANIFEST_SHA,actualIndependentBrowserAndDefaultJobs:true,priorScopedInputs:'SEE_SOURCE_BOUND_INPUT_ADMISSION_AND_ORIGINAL_PRODUCERS',oldRun41001903471:'CANCELLED_REMAINS_CANCELLED',currentFullBuildSeoExecuted:false,visualOriginalReview:'ROOT_OWES',modelCasesCohortsFloorsAndControls:'HELD_SEPARATE_ADMITTED_MODEL',currentMainCompatibility:'SEPARATE_UNPROVEN',generatedOutputs:'REFERENCE_UNSHIPPED',mergeOrPublicationReady:false});
}
if(phase==='original')await original();else if(phase==='begin')begin();else if(phase==='admit')admit();else if(phase==='seal')seal();else if(phase==='default-admission')defaultAdmission();else if(phase==='browser-admission')browserAdmission();else if(phase==='hold')hold();else if(phase==='join')join();else assert.fail('Unknown continuation phase');
