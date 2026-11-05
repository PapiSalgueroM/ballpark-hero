import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {build} from 'esbuild';
const arg=n=>{const i=process.argv.indexOf(n);assert(i>=0&&process.argv[i+1],n);return process.argv[i+1];};
assert(process.env.CI,'Remote preparation only');
const root=process.cwd(),out=path.resolve(arg('--out')),dist=path.resolve(arg('--dist')),input=path.resolve(arg('--outcomes')),buildRef=path.resolve(arg('--build')),spec=JSON.parse(await fs.readFile(arg('--spec')));
assert(out!==root&&!out.startsWith(root+path.sep),'All outputs outside source');
await fs.mkdir(out,{recursive:true});assert.equal((await fs.readdir(out)).length,0);
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),blob=b=>crypto.createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex'),plain=v=>JSON.parse(JSON.stringify(v));
const write=(file,value)=>fs.writeFile(path.join(out,file),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
const silent=async()=>{assert(process.env.SIM_OFFLINE_RECEIPT);assert.equal((await fs.readFile(process.env.SIM_OFFLINE_RECEIPT)).length,0);};await silent();
for(const[file,pin]of Object.entries(spec.sourcePins)){assert.match(pin,/^[a-f0-9]{40}$/,'Bound source pin');assert.equal(blob(await fs.readFile(file)),pin,file);}
for(const row of spec.fixtures){assert.match(row.sourceRawSHA256,/^[a-f0-9]{64}$/,'Healthy admitted source RAW must be bound');assert.match(row.sourceSaveSHA256,/^[a-f0-9]{64}$/,'Selected full save must be bound');}
assert.equal(spec.product,'4e45ee3605589aeb5a268b2e6a902fb4ff71af92');assert.equal(spec.artifacts.build.id,13411692407);
const tracked=execFileSync('git',['ls-files','-z']).toString().split('\0').filter(Boolean),snapshot=async()=>Object.fromEntries(await Promise.all(tracked.map(async file=>[file,sha(await fs.readFile(file))]))),sourceBefore=await snapshot();
const ledger=b=>Object.fromEntries(b.toString().trim().split('\n').filter(Boolean).map(line=>{const m=/^([a-f0-9]{64})  (.+)$/.exec(line);assert(m);return[m[2],m[1]];}));
const builtBytes=await fs.readFile(path.join(buildRef,'source-before.sha256'));assert(builtBytes.equals(await fs.readFile(path.join(buildRef,'source-after.sha256'))));
const built=ledger(builtBytes),protectedPath=p=>!p.startsWith('.github/')&&!p.startsWith('docs/')&&!p.startsWith('scripts/qa/')&&!/^[^/]+\.md$/i.test(p),protectedUnion=[...new Set([...Object.keys(built),...tracked])].filter(protectedPath).sort();
for(const file of protectedUnion)assert.equal(sourceBefore[file],built[file],'Complete protected build/current union '+file);
const distLedger=await fs.readFile(path.join(buildRef,'dist-before.sha256'));assert.equal(sha(distLedger),spec.artifacts.build.distInventorySHA256);assert(distLedger.equals(await fs.readFile(path.join(buildRef,'dist-after.sha256'))));
const expectedDist=Object.fromEntries(Object.entries(ledger(distLedger)).map(([file,digest])=>{assert(file.startsWith('dist/'));return[file.slice(5),digest];}));
const qualification=JSON.parse(await fs.readFile(path.join(input,'qualification.json')));assert.equal(qualification.status,'FIVE_CANDIDATE_CASES_AND_SIX_OWNED_SOURCE_FAULTS_ADMITTED');assert.equal(qualification.fixedRestoredWholeFiveRawExact,true);assert.equal(qualification.everyArmOriginalSavedGameplayAndGlobalTapeExact,true);
const fixed=JSON.parse(await fs.readFile(path.join(input,'arms/fixed/raw/closing.json'))),restored=JSON.parse(await fs.readFile(path.join(input,'arms/restored/raw/closing.json')));
assert.equal(fixed.beforeAllFailure,null);assert.equal(restored.beforeAllFailure,null);
const rawSources=new Map();
async function actualRaw(logical,wanted){
 if(rawSources.has(logical)){const cached=rawSources.get(logical);assert.equal(cached.sha256,wanted,'Every repeated logical source hash must agree');return cached;}
 const records=[fixed,restored].map(c=>{const rows=c.records.filter(r=>r.file===logical);assert.equal(rows.length,1,'Exact closing source row '+logical);return rows[0];});
 assert.equal(records[0].sha256,wanted);assert.equal(records[1].sha256,wanted);assert.equal(records[0].encoding,spec.transport.encoding);assert.equal(records[1].encoding,spec.transport.encoding);
 let retained=null;
 for(const[at,arm]of['fixed','restored'].entries()){const row=records[at];assert.equal(row.storedFile,logical+'.gz');assert(!row.storedFile.includes('..'));const gz=await fs.readFile(path.join(input,'arms',arm,'raw',row.storedFile));assert.equal(gz.length,row.storedBytes);assert.equal(sha(gz),row.storedSHA256);const bytes=gunzipSync(gz);assert.equal(bytes.length,row.bytes);assert.equal(sha(bytes),wanted);if(retained)assert(bytes.equals(retained.bytes),'Whole selected fixed/restored RAW bytes');else retained={bytes,gz,row};}
 const tag='source-'+String(rawSources.size+1),gzFile=tag+'.json.gz',file=tag+'.json';await fs.writeFile(path.join(out,gzFile),retained.gz,{flag:'wx'});await fs.writeFile(path.join(out,file),retained.bytes,{flag:'wx'});
 const value=JSON.parse(retained.bytes);rawSources.set(logical,{value,file,gzFile,bytes:retained.bytes.length,sha256:wanted,storedBytes:retained.gz.length,storedSHA256:sha(retained.gz)});return rawSources.get(logical);
}
const imports={nba:'src/lib/nbaMyCareer.ts',binding:'src/lib/nbaCareerSport.ts',summer:'src/lib/usCareerSummer.ts',retirement:'src/lib/usCareerRetirementFlow.ts',coach:'src/lib/usCoachCareer.ts',market:'src/lib/usCareerMarket.ts',preDraft:'src/lib/careerPreDraft.ts',data:'src/data/nbaDraft2004.ts'};
const prefix="import assert from 'node:assert/strict';\n"+Object.entries(imports).map(([key,file])=>'import * as '+key+' from '+JSON.stringify(path.join(root,file))+';').join('\n')+"\nexport {nba}; export const rows=data.NBA_DRAFT_2004; const sport=binding.NBA_CAREER_SPORT;\nconst {repairSummerOnLoad,seekSummerCard}=summer,{repairHallOnLoad,talkDeckFilter,pendingTalk}=retirement,{ensureCoachCareer}=coach,{restoreMarketTalk}=market,{loadPreDraft}=preDraft;\n";
const entry='reference-entry.mjs',bundle='reference.mjs';
await fs.writeFile(path.join(out,entry),prefix+"\nlet intlFace;\nexport async function prepare(){intlFace=sport.intl?await sport.intl.load():null;}\nfunction shape(value){\n const undefinedPaths=[],keyOrder=[];\n function visit(v,p){if(v===undefined){undefinedPaths.push(p);return;}if(!v||typeof v!=='object')return;if(!Array.isArray(v))keyOrder.push({path:p,keys:Object.keys(v)});for(const k of Object.keys(v))visit(v[k],p+'/'+k);}\n visit(value,'');return{json:value===undefined?null:JSON.parse(JSON.stringify(value)),undefinedPaths,keyOrder};\n}\nexport function observeLoad(raw){\n const s=JSON.parse(raw),before=JSON.parse(raw);assert(s&&s.c,'Complete professional JSON save required');\n if(!s.c.role)s.c.role='starter';\n if(s.c.prospect&&(!loadPreDraft(s.c.prospect)||s.c.prospect.sport!==sport.slug))delete s.c.prospect;\n let loaded=sport.repairNetWorth(s.c);\n repairSummerOnLoad(loaded);repairHallOnLoad(loaded);\n let intlRepaired=false;\n if(sport.intl&&loaded.intl!==undefined){assert(intlFace,'Real lazy international face prepared');const copy=JSON.parse(JSON.stringify(loaded));if(intlFace.repairOnLoad(copy)){loaded=copy;intlRepaired=true;}}\n const coach=ensureCoachCareer(s.coach,sport.slug);\n let phase=!s.c.retired?'season':s.phase==='coach'&&coach?'coach':'retired';\n const heldTalk=restoreMarketTalk(s.contractTalk,loaded,sport.slug);\n let wouldPersist=false,modal=null;\n if(heldTalk&&!(heldTalk.kind==='extension'&&heldTalk.declined))phase=heldTalk.kind==='extension'?'extension':'freeagency';\n else if(phase==='season'&&loaded.summer){const card=seekSummerCard(loaded,sport,talkDeckFilter(loaded,sport.hall));if(card){phase='event';modal='saved summer card';}else wouldPersist=true;}\n if(loaded.pendingRivalryEvent)modal='pending rivalry event';\n if(loaded.pendingRivalryChoice)modal='pending rivalry choice';\n if((phase==='season'||phase==='event')&&pendingTalk(loaded,sport.hall))modal='retirement talk';\n const intlCallYear=(phase==='season'||phase==='event')&&sport.intl?sport.intl.pendingYear(loaded):null;\n if(intlCallYear!==null)modal='international call';\n return{storageRaw:raw,storage:before,loadedCareer:shape(loaded),coach:shape(coach),heldTalk:shape(heldTalk),phase,modal,wouldPersist,intlRepaired,intlCallYear,\n  scope:'Actual Board JSON and ordered real repair/coach/market/summer helpers. In-memory changes are retained separately; no rewritten storage or React-state introspection claim. A completed-summer roll/write or pending modal is unsupported and refused.'};\n}\n",{flag:'wx'});
await build({entryPoints:[path.join(out,entry)],outfile:path.join(out,bundle),bundle:true,format:'esm',platform:'node',alias:{'@':path.join(root,'src')},banner:{js:"import {createRequire as __qaCreateRequire} from 'node:module';const require=__qaCreateRequire("+JSON.stringify(path.join(root,'package.json'))+");"},logLevel:'error'});
const memory=new Map();globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,String(v)),removeItem:k=>memory.delete(k),clear:()=>memory.clear()};
const random=Math.random,importDraws=[];let seed=7301,api;
try{Math.random=()=>{seed=seed*16807%2147483647;const v=(seed-1)/2147483646;importDraws.push(v);return v;};api=await import(pathToFileURL(path.join(out,bundle)).href);await api.prepare();}finally{Math.random=random;}
assert.deepEqual(api.rows.map(p=>({id:p.id,pick:p.pick,name:p.name,families:[...p.families],dob:p.dob})),spec.expectedClass.map(p=>({id:p.id,pick:p.pick,name:p.name,families:p.broadFamilies,dob:p.dateOfBirth})));
const preparation={scope:'Copy actual complete admitted storage strings. Real loader-helper observations only, no constructor/annual action/camp/signing generated.',importSeed:7301,importDraws,loads:[]},fixtures={};
for(const selection of spec.fixtures){
 const source=await actualRaw(selection.sourceRaw,selection.sourceRawSHA256);let raw,selectedFrame=null;
 if(selection.kind==='original-professional'){assert.equal(source.value.inputSource,'AUTHENTICATED_ORIGINAL');raw=source.value.inputRaw;assert.equal(Buffer.byteLength(raw),spec.originalProfessional.bytes);assert.equal(sha(raw),spec.originalProfessional.sha256);}
 else{const matches=source.value.frames.filter(f=>f.action===selection.action);assert.equal(matches.length,1,'Exactly one actual selected frame '+selection.action);selectedFrame=matches[0];raw=selectedFrame.raw;assert.deepEqual(JSON.parse(raw),selectedFrame.save);}
 assert.equal(sha(raw),selection.sourceSaveSHA256);const parsed=JSON.parse(raw);assert(parsed.c&&parsed.phase==='season','Only actual complete hub saves, no phase rewriting');assert.equal(parsed.c.year,selection.year);
 const rng=Math.random,clock=Date.now;let draws=0,clocks=0,reference;
 try{Math.random=()=>{draws++;throw Error('Loader observation drew RNG');};Date.now=()=>{clocks++;throw Error('Loader observation read clock');};reference=api.observeLoad(raw);}finally{Math.random=rng;Date.now=clock;}
 assert.equal(reference.phase,'season');assert.equal(reference.modal,null,'Genuine pending modal needs separate authorization');assert.equal(reference.wouldPersist,false,'Completed summer would require an actual roll/write');
 const block=parsed.c.draft2004;
 if(selection.active){assert.deepEqual(block.ids,spec.expectedClass.map(r=>r.id));assert.equal(block.v,1);assert.equal(block.visits.length,selection.name==='preCamp'?0:1);}
 else assert.equal(block,undefined,'Authentic legacy/current input stays unmarked');
 const file=selection.name+'.json';await fs.writeFile(path.join(out,file),raw,{flag:'wx'});
 fixtures[selection.name]={file,bytes:Buffer.byteLength(raw),sha256:sha(raw),expected:{raw,save:parsed},loader:reference,source:{...selection,decoded:source.file,gzip:source.gzFile,logicalRaw:selection.sourceRaw,selectedFrame},scope:selection.scope};
 preparation.loads.push({name:selection.name,inputRaw:raw,input:parsed,reference,draws,clocks,sourceSelection:selection});
}
assert.deepEqual(fixtures.laterFa.expected.save.c.draft2004.visits.slice(0,fixtures.postCamp.expected.save.c.draft2004.visits.length),fixtures.postCamp.expected.save.c.draft2004.visits,'Actual same-journey visit prefix');
const preparationFile='preparation.json';await write(preparationFile,preparation);
const distBefore=[];async function walk(rel=''){for(const e of await fs.readdir(path.join(dist,rel),{withFileTypes:true})){const file=path.posix.join(rel,e.name);if(e.isDirectory())await walk(file);else{assert(e.isFile());const b=await fs.readFile(path.join(dist,file));assert.equal(sha(b),expectedDist[file],file);distBefore.push({file,bytes:b.length,sha256:sha(b)});}}}await walk();distBefore.sort((a,b)=>a.file<b.file?-1:a.file>b.file?1:0);assert.equal(distBefore.length,849);assert.deepEqual(distBefore.map(r=>r.file),Object.keys(expectedDist).sort());
const sourceAfter=await snapshot();assert.deepEqual(sourceAfter,sourceBefore);await silent();
await write('source-build-bridge.json',{sourceBuild:spec.artifacts.build.head,sourceCurrent:execFileSync('git',['rev-parse','HEAD']).toString().trim(),protectedUnion,allProtectedBuildBodiesHeld:true,distFiles:849,distLedgerSHA256:sha(distLedger),noAppBuild:true,noModelGeneration:true});
await write('manifest.json',{schema:1,product:spec.product,productTree:spec.productTree,sourceBefore,sourceAfter,pins:spec.sourcePins,bundle,bundleSHA:sha(await fs.readFile(path.join(out,bundle))),entry,entrySHA:sha(await fs.readFile(path.join(out,entry))),preparation:{file:preparationFile,sha256:sha(await fs.readFile(path.join(out,preparationFile)))},importDraws,expectedClass:spec.expectedClass,fixtures,rawSources:Object.fromEntries([...rawSources].map(([k,v])=>[k,{...v,value:undefined}])),distBefore,distDigest:sha(JSON.stringify(distBefore)),sources:spec.artifacts,scope:spec.scope});
console.log('NBA_DRAFT_2004_FIXTURES_ADMITTED five complete actual saved boundaries,full lossless RAW/source/loader references,849 completed bodies; no generated season');
