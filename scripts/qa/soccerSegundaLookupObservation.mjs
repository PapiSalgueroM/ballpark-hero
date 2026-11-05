import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import crypto from 'node:crypto';
import { gzipSync } from 'node:zlib';
import assert from 'node:assert/strict';
const BASE='3268307038c4586dbc35f4697da1849512b473d9',CURRENT='86919f885e7fc45c16822896f107e07c57450652',TREE='62f7696a9bf41c1be237daf2e26a294ba6cb48e0';
const PRODUCTS=[{"path":"scripts/lib/careerClubPool.mjs","beforeBlob":"16ccc6137958a1adf2e40e5d26b99de466b38e24","afterBlob":"9ac9f0b9437f68e6a6b1f20c640afce109a8352f"},{"path":"src/data/soccerCareerClubPool.ts","beforeBlob":"83e9df78441c0d16509f80b8ec0bfbadb0f08f26","afterBlob":"9340217fac2ae3a86877ac878fcd677d22c973bd"},{"path":"src/lib/clubManager.ts","beforeBlob":"e3c9bcf0aec0f1e1caeb27d38d506d591d694237","afterBlob":"4b0a734e9fe9ba1e7139ead8d4fe5d6a1574c484"},{"path":"scripts/data/soccerCareerFacts.json","beforeBlob":"9828e41da792eafeead8036879d49f05242a5164","afterBlob":"5a8bcd1ae9b048d2bfa6b759b6b8fff1a7131e13"},{"path":"src/lib/soccerCareerEngine.ts","beforeBlob":"e88d6f91744bf14ac1d1afd43bbb26be9f9e15db","afterBlob":"94ccfb82dace9fc099c670357472732973e11d73"},{"path":"src/lib/soccerCareerCup.ts","beforeBlob":"0f2a6cc03afed64642d396af4d0979474a3c41cf","afterBlob":"1d93842578afa4fb92ed3c012701022fbf9d2e9c"},{"path":"scripts/data/domesticCupSources.json","beforeBlob":"b42a2d20fcb3882277902b80f5cb1bad510b2dff","afterBlob":"7ca21b866ac6641ff953c60c64f531bd674e48ce"},{"path":"src/pages/SoccerCareer.tsx","beforeBlob":"1f4d448cc9718bc3fa97b6987be5f14b27496c47","afterBlob":"e191a4634c44be5ebe511da0885579fdb6696dc5"}];
const PINS={"scripts/simCareerLeagueSeasons.mjs":"a1e7030f67c892d0d0161d234d678f7ec7bc928d","scripts/lib/careerDevelopmentAttribution1185.mjs":"22a0e6e7830aa489aede6b7e5584cc713fc73521","scripts/lib/careerStoryRoleAttribution1190.mjs":"c1ba5b025cd11428bd68c5598e5a6ce4f942a51d","scripts/lib/careerLifeChainBF.mjs":"ac50944916d582e266bafaa00a1c49981459d5ad"};
const BASE_EXTRA_PINS={"scripts/lib/cmValueCurve.mjs":"0e7343b58edf9625a66e90c100833e861a035bdf","scripts/lib/cmAges.mjs":"cc06eb82058891797e2842accb7ddc167c529773"};
const HISTORY=[{"ref":"3268307038c4586dbc35f4697da1849512b473d9","tree":"6d18d84bcef424def83e496087830c096ba4163b","roots":["src","scripts/lib/careerClubPool.mjs","scripts/data/soccerCareerFacts.json","scripts/data/domesticCupSources.json","scripts/lib/cmValueCurve.mjs","scripts/lib/cmAges.mjs"],"srcTree":"74a5e5cf63544d3e037dfb7ae3091248ecd9f098","srcFiles":2594,"srcBytes":43689015},{"ref":"4ab80fa978cf362427bcd024c64c6691e7f83c2a","tree":"b821dca156ca13f7060b6299539f17603c87f677","roots":["src"],"srcTree":"47ead5c374ce4b3489d8b807bbfdd539fcb7dbd3","srcFiles":1882,"srcBytes":32660588}];
const REFS={simCareerLeagueSeasons:[0,1]};
const VERDICT={simCareerLeagueSeasons:/^simCareerLeagueSeasons: (?:all sections green|\d+ failures \(sections)/m};
const IDENTITY_TEST='src/test/soccerSegundaHistoricalIdentity.test.ts',IDENTITY_TEST_BLOB='008a5c95ff12b0e029b264078843744f2888fbd2';
const IDENTITY_CASES=[{"fullName":"Segunda historical identity boundary refuses the current Burgos profile's three unresolved historical aliases","status":"failed","marker":"SC_SEGUNDA_IDENTITY_BURGOS","file":"burgos"},{"fullName":"Segunda historical identity boundary refuses all 118 unresolved pre-2026 matches for the added canonical profiles","status":"failed","marker":"SC_SEGUNDA_IDENTITY_UNRESOLVED","file":"unresolved"},{"fullName":"Segunda historical identity boundary keeps verified historical canon and the distinct Real Burgos source identity","status":"passed","marker":"SC_SEGUNDA_IDENTITY_KNOWN","file":"known-canon"},{"fullName":"Segunda historical identity boundary keeps all nineteen real profiles and their modern 2026 labels","status":"passed","marker":"SC_SEGUNDA_IDENTITY_MODERN","file":"modern"},{"fullName":"Segunda historical identity boundary keeps unrelated unnamed manager-own identities readable","status":"passed","marker":"SC_SEGUNDA_IDENTITY_NEUTRAL","file":"neutral"}];
const validateIdentityReport=value=>{
  const assertions=value.testResults?.flatMap(row=>row.assertionResults??[])??[];
  assert.equal(assertions.length,5,'SC_SEGUNDA_IDENTITY_CASE_CENSUS');
  assert.deepEqual(assertions.map(row=>[row.fullName,row.status]).sort(),IDENTITY_CASES.map(row=>[row.fullName,row.status]).sort(),'SC_SEGUNDA_IDENTITY_CASE_CENSUS');
  assert.equal(value.numTotalTests,5);assert.equal(value.numPassedTests,3);assert.equal(value.numFailedTests,2);assert.equal(value.numPendingTests,0);assert.equal(value.numTodoTests??0,0);assert.equal(value.success,false);
  assert.equal(value.testResults.length,1);
  for(const key of ['numRuntimeErrorTestSuites','numRuntimeErrors','numUnhandledErrors'])if(key in value)assert.equal(value[key],0,key);
  if('unhandledErrors' in value)assert.deepEqual(value.unhandledErrors,[]);
  for(const item of IDENTITY_CASES){const row=assertions.find(row=>row.fullName===item.fullName),messages=row.failureMessages??[];
    if(item.status==='passed'){assert.equal(messages.length,0);continue;}
    assert(messages.length>0);const diagnostic=messages.join('\n').replace(/\x1b\[[0-9;]*m/g,'');
    assert(/^AssertionError(?::|\b)/.test(diagnostic),item.fullName);assert(diagnostic.includes(item.marker),item.marker);
    assert(!/\b(?:TypeError|SyntaxError|ReferenceError)\b/.test(diagnostic),'owned errors must be business assertions');
  }
  return assertions;
};
const NORMAL_HARNESS_BLOB='d9e77ab7a84f166ad2026bdd9e4d9d6afb22496e';
const OBSERVER_OPS=[{"label":"declare observer","before":"const shown = {};\n","after":"const shown = {};\nconst lookupObservationFile = process.env.SOCCER_LEAGUE_LOOKUP_OBSERVATION;\nif (!lookupObservationFile || !path.isAbsolute(lookupObservationFile)) throw new Error('SOCCER_LEAGUE_LOOKUP_OBSERVATION must be an absolute evidence path');\nconst lookupObservation = { rows: [], failures: [] };\n"},{"label":"retain every failure","before":"  failures += 1; red.add(section);\n","after":"  failures += 1; red.add(section);\n  lookupObservation.failures.push({ section, message: m });\n"},{"label":"retain each real lookup result","before":"    const m = L.clubLedgerSeason(c.name, y);\n    ok(!(m && m.canon === null)","after":"    const m = L.clubLedgerSeason(c.name, y);\n    lookupObservation.rows.push({ club: structuredClone(c), year: y, expected: want, actual: { league: got, key: L.leagueKeyInYear(c, y), ledger: m } });\n    ok(!(m && m.canon === null)"},{"label":"retain completed section A before later setup","before":"/* ─── b. PLAYED ─── */\n","after":"fs.mkdirSync(path.dirname(lookupObservationFile), { recursive: true });\nfs.writeFileSync(lookupObservationFile, JSON.stringify({\n  schema: 'soccer-league-lookup-observation-v1',\n  scope: 'Actual section A results from the unchanged assertion loop. Later sections retain their normal behavior; this file is written before section B and is not a full-harness pass receipt.',\n  source: {\n    trackedHarness: createHash('sha256').update(fs.readFileSync(path.join(ROOT, 'scripts/simCareerLeagueSeasons.mjs'))).digest('hex'),\n    observedHarness: createHash('sha256').update(fs.readFileSync(fileURLToPath(import.meta.url))).digest('hex'),\n    league: createHash('sha256').update(fs.readFileSync(path.join(ROOT, 'src/lib/soccerCareerLeague.ts'))).digest('hex'),\n    generatedSeasons: createHash('sha256').update(fs.readFileSync(path.join(ROOT, 'src/data/careerLeagueSeasons.ts'))).digest('hex'),\n    canonicalPool: createHash('sha256').update(fs.readFileSync(path.join(ROOT, 'src/data/soccerCareerClubPool.ts'))).digest('hex'),\n  },\n  listSeason: LIST_SEASON, world: WORLD, ledgers,\n  answers, placed, seasonsIn, canonIn, failureCounts: { ...shown },\n  ...lookupObservation,\n}, null, 2) + '\\n');\n\n/* ─── b. PLAYED ─── */\n"}];
const validateObservation=(value,arm)=>{
  assert.equal(value.schema,'soccer-league-lookup-observation-v1');
  assert.equal(value.listSeason,2026);assert.equal(value.world.length,arm==='original'?497:516);
  assert.equal(value.answers,value.world.length*36);assert.equal(value.rows.length,value.answers,'SC_SEGUNDA_LOOKUP_OBSERVATION_CENSUS');
  const keys=new Set(value.rows.map(row=>row.club.id+'|'+row.year));assert.equal(keys.size,value.rows.length,'SC_SEGUNDA_LOOKUP_OBSERVATION_CENSUS');
  for(const club of value.world)for(let year=1990;year<2026;year++)assert(keys.has(club.id+'|'+year),'SC_SEGUNDA_LOOKUP_OBSERVATION_CENSUS');
  assert.equal(value.failures.length,value.failureCounts.a??0);assert(value.failures.every(row=>row.section==='a'));
  return value;
};
delete process.env.GIT_NO_LAZY_FETCH;
const args=process.argv.slice(2);assert.equal(args.length,4);assert.equal(args[0],'--out');assert.equal(args[2],'--harness');
const out=path.resolve(args[1]),harness=args[3],root=process.cwd();assert(REFS[harness]);assert(!out.startsWith(root+path.sep),'evidence belongs outside tracked checkout');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const blob=b=>crypto.createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
const write=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,Buffer.isBuffer(value)||typeof value==='string'?value:JSON.stringify(value,null,2)+'\n');};
const git=(...args)=>cp.execFileSync('git',args,{maxBuffer:128*1024*1024});
const text=(...args)=>git(...args).toString().trim();
const files=git('ls-files','-z').toString().split('\0').filter(Boolean);
const inventory=()=>Object.fromEntries(files.map(file=>{const b=fs.readFileSync(file);return[file,{bytes:b.length,sha256:sha(b)}];}));
const status=()=>git('status','--porcelain=v1','--untracked-files=all').toString();
const native=(name,command,argv,env=process.env)=>{
  const r=cp.spawnSync(command,argv,{env,maxBuffer:192*1024*1024});
  write(path.join(out,name+'.stdout.log'),r.stdout??Buffer.alloc(0));write(path.join(out,name+'.stderr.log'),r.stderr??Buffer.alloc(0));
  const receipt={command,argv,nativeExit:r.status,signal:r.signal,error:r.error?String(r.error):null,stdoutBytes:r.stdout?.length??0,stderrBytes:r.stderr?.length??0};
  write(path.join(out,name+'.native.json'),receipt);return{...receipt,stdout:r.stdout??Buffer.alloc(0),stderr:r.stderr??Buffer.alloc(0)};
};
const cleanNative=r=>{assert.equal(r.error,null);assert.equal(r.signal,null);assert.equal(r.nativeExit,0);};
assert.equal(text('rev-parse',CURRENT+'^{tree}'),TREE);assert.equal(status(),'');
for(const[file,want]of Object.entries(PINS))assert.equal(blob(fs.readFileSync(file)),want,file);
for(const p of PRODUCTS)assert.equal(blob(fs.readFileSync(p.path)),p.afterBlob,p.path+' current');
assert.equal(blob(fs.readFileSync(IDENTITY_TEST)),IDENTITY_TEST_BLOB);assert.equal(process.env.SC_SEGUNDA_IDENTITY_EVIDENCE,undefined,'no inherited unit evidence');
assert.equal(process.env.SOCCER_LEAGUE_LOOKUP_OBSERVATION,undefined,'no inherited observation output');
const observedHarness=fs.readFileSync('scripts/simCareerLeagueSeasons.mjs');
const normalHarness=git('show',CURRENT+':scripts/simCareerLeagueSeasons.mjs');assert.equal(blob(normalHarness),NORMAL_HARNESS_BLOB);
let reconstructed=observedHarness.toString();
for(const op of [...OBSERVER_OPS].reverse()){assert.equal(reconstructed.split(op.after).length-1,1,op.label+' unique inverse');reconstructed=reconstructed.replace(op.after,op.before);}
assert.deepEqual(Buffer.from(reconstructed),normalHarness,'four-region whole-source observer inverse');
write(path.join(out,'harness-source/original-d9.mjs'),normalHarness);
write(path.join(out,'harness-source/observer-hunks.json'),{normalBlob:NORMAL_HARNESS_BLOB,observedBlob:blob(observedHarness),ops:OBSERVER_OPS,wholeInverseExact:true,scope:'Four receipt-only insertions. Original assertions, limits, seeded arithmetic, historical refs and all gameplay App inputs are held.'});
for(const key of Object.keys(process.env))assert(!/^(?:RECORD(?:_.*)?|WORLD|CAREERS|SEEDS|SEED_OFFSET|NATION|SNAPSHOT_PROBE_ONLY|WORLD_TRUTH_ONLY|WORLD_TRUTH_BASE_FROM_HEAD|WORLD_TRUTH_CONTROL|CUP_CONTROL|CM_RULES_CONTROL|SIM_LEAGUE_(?:FINISH|SEASONS)_(?!ARTIFACTS$).*)$/.test(key),'no inherited harness override '+key);
const before=inventory(),held=new Map(PRODUCTS.map(p=>[p.path,fs.readFileSync(p.path)]));
write(path.join(out,'source-before.json'),before);write(path.join(out,'source.txt'),text('rev-parse','HEAD','HEAD^{tree}')+'\n');
const original=new Map(),hydrated=[],results=[],observations=[];
let fatal=null;
try{
  const online={...process.env};delete online.GIT_NO_LAZY_FETCH;delete online.NODE_OPTIONS;delete online.SIM_OFFLINE_RECEIPT;
  for(const index of REFS[harness]){
    const spec=HISTORY[index],dir='history/'+spec.ref;
    cleanNative(native(dir+'/fetch','git',['fetch','--no-tags','--depth=1','--filter=blob:none','origin',spec.ref],online));
    assert.equal(text('rev-parse',spec.ref+'^{commit}'),spec.ref);assert.equal(text('rev-parse',spec.ref+'^{tree}'),spec.tree);
    if(spec.srcTree)assert.equal(text('rev-parse',spec.ref+':src'),spec.srcTree);
    const roots=[...spec.roots];if(index===0)roots.push('.gitattributes');
    const rows=git('ls-tree','-r','-z',spec.ref,'--',...roots).toString().split('\0').filter(Boolean).map(line=>{
      const m=line.match(/^(\d+) blob ([a-f0-9]{40})\t(.+)$/);assert(m,line);return{mode:m[1],blob:m[2],path:m[3]};
    });assert(rows.length>0);
    if(index===0)for(const[file,want]of Object.entries(BASE_EXTRA_PINS))assert.equal(rows.find(r=>r.path===file)?.blob,want,'actual BASE archive helper '+file);
    if(spec.pins){assert.equal(rows.length,Object.keys(spec.pins).length);for(const row of rows)assert.equal(row.blob,spec.pins[row.path],row.path);}
    const ids=[...new Set(rows.map(r=>r.blob))],bodies=new Map();
    for(let i=0;i<ids.length;i+=32){
      const batch=ids.slice(i,i+32),request=batch.join('\n')+'\n',b=cp.spawnSync('git',['cat-file','--batch'],{env:online,input:request,maxBuffer:128*1024*1024});
      write(path.join(out,dir+'/body-'+i+'.stderr.log'),b.stderr??Buffer.alloc(0));write(path.join(out,dir+'/body-'+i+'.native.json'),{nativeExit:b.status,signal:b.signal,error:b.error?String(b.error):null,requested:batch.length});
      assert.equal(b.status,0);assert.equal(b.signal,null);assert.equal(b.error,undefined);let at=0;
      for(const id of batch){const end=b.stdout.indexOf(10,at);assert(end>=0);const h=b.stdout.subarray(at,end).toString().split(' ');assert.equal(h[0],id);assert.equal(h[1],'blob');const size=Number(h[2]);assert(Number.isSafeInteger(size)&&size>=0);const body=b.stdout.subarray(end+1,end+1+size);assert.equal(body.length,size);assert.equal(b.stdout[end+1+size],10);assert.equal(blob(body),id);bodies.set(id,{bytes:size,sha256:sha(body)});at=end+2+size;}assert.equal(at,b.stdout.length);
    }
    if(spec.srcFiles){const src=rows.filter(r=>r.path.startsWith('src/'));assert.equal(src.length,spec.srcFiles);assert.equal(src.reduce((n,r)=>n+bodies.get(r.blob).bytes,0),spec.srcBytes);}
    hydrated.push({spec,rows:rows.map(r=>({...r,...bodies.get(r.blob)}))});write(path.join(out,dir+'/hydration.json'),hydrated.at(-1));
  }
  for(const p of PRODUCTS){const b=git('show',BASE+':'+p.path);assert.equal(blob(b),p.beforeBlob,p.path+' original');assert.notDeepEqual(b,held.get(p.path));original.set(p.path,b);}
  const baseArchiveExtras=text('ls-tree','-r','--name-only',BASE,'--',...Object.keys(BASE_EXTRA_PINS)).split('\n').filter(Boolean);
  assert.deepEqual([...baseArchiveExtras].sort(),Object.keys(BASE_EXTRA_PINS).sort(),'exact actual BASE helper presence');
  const archiveArgs=['archive',BASE,'src',...baseArchiveExtras];
  let archive=null;
  if(harness==='simCareerLeagueSeasons'){
    const r=native('history/archive-online','git',archiveArgs,online);cleanNative(r);assert(r.stdout.length>1024);archive=r.stdout;
    write(path.join(out,'history/original-src.tar.gz'),gzipSync(archive));write(path.join(out,'history/archive-online.json'),{bytes:archive.length,sha256:sha(archive),nativeExit:0,command:['git',...archiveArgs]});
    fs.unlinkSync(path.join(out,'history/archive-online.stdout.log'));
  }
  process.env.GIT_NO_LAZY_FETCH='1';
  for(const h of hydrated){const ids=[...new Set(h.rows.map(r=>r.blob))],r=cp.spawnSync('git',['cat-file','--batch-check'],{input:ids.join('\n')+'\n',env:process.env,maxBuffer:16*1024*1024});
    write(path.join(out,'history/'+h.spec.ref+'/offline-native.json'),{nativeExit:r.status,signal:r.signal,error:r.error?String(r.error):null});write(path.join(out,'history/'+h.spec.ref+'/offline.stderr.log'),r.stderr??Buffer.alloc(0));
    assert.equal(r.status,0);assert.equal(r.signal,null);assert.equal(r.error,undefined);const rows=r.stdout.toString().trim().split('\n');assert.equal(rows.length,ids.length);
    for(let i=0;i<ids.length;i++){const parts=rows[i].split(' ');assert.equal(parts[0],ids[i]);assert.equal(parts[1],'blob');assert.equal(Number(parts[2]),h.rows.find(row=>row.blob===ids[i]).bytes);}
  }
  if(archive){const r=native('history/archive-offline','git',archiveArgs);cleanNative(r);assert.deepEqual(r.stdout,archive,'real offline archive bytes');write(path.join(out,'history/archive-offline.json'),{bytes:r.stdout.length,sha256:sha(r.stdout),nativeExit:0,exactOnlineBytes:true});fs.unlinkSync(path.join(out,'history/archive-offline.stdout.log'));}
  write(path.join(out,'history/admission.json'),{harness,refs:hydrated.map(h=>h.spec),actualBinaryBodiesVerified:true,noLazyRepeat:true,actualArchiveRepeated:harness==='simCareerLeagueSeasons',baseArchiveExtras,baseExtraPins:BASE_EXTRA_PINS});
  const unitOut=path.join(out,'original-unit'),unitEnv={...process.env,NODE_OPTIONS:'--require='+path.join(root,'scripts/lib/offlineTransport.cjs'),SIM_NETWORK:'offline',SC_SEGUNDA_IDENTITY_EVIDENCE:path.join(unitOut,'evidence')};
  assert.deepEqual(inventory(),before,'current869 source before original-first test');
  const unitTypesTransport=path.join(unitOut,'types-transport.log');write(unitTypesTransport,'');
  cleanNative(native('original-unit/types',path.join(root,'node_modules/.bin/tsc'),['--noEmit','-p','tsconfig.app.json'],{...unitEnv,SIM_OFFLINE_RECEIPT:unitTypesTransport}));assert.equal(fs.statSync(unitTypesTransport).size,0);
  const unitTransport=path.join(unitOut,'vitest-transport.log');write(unitTransport,'');
  const unit=native('original-unit/vitest',path.join(root,'node_modules/.bin/vitest'),['run',IDENTITY_TEST,'--reporter=json','--outputFile='+path.join(unitOut,'vitest.json'),'--maxWorkers=1','--minWorkers=1'],{...unitEnv,SIM_OFFLINE_RECEIPT:unitTransport});
  assert.equal(unit.signal,null);assert.equal(unit.error,null);assert.equal(unit.nativeExit,1);assert.equal(fs.statSync(unitTransport).size,0);
  assert(!/Unhandled|Vitest caught|uncaught|unhandled rejection/i.test(unit.stdout.toString()+'\n'+unit.stderr.toString()),'no unhandled unit output');
  const unitReportBytes=fs.readFileSync(path.join(unitOut,'vitest.json')),unitReport=JSON.parse(unitReportBytes);validateIdentityReport(unitReport);
  const unitControl=structuredClone(unitReport),removedCase=unitControl.testResults[0].assertionResults.pop();assert.notDeepEqual(unitControl,unitReport);
  assert.throws(()=>validateIdentityReport(unitControl),error=>error.name==='AssertionError'&&error.message.includes('SC_SEGUNDA_IDENTITY_CASE_CENSUS'));
  unitControl.testResults[0].assertionResults.push(removedCase);assert.deepEqual(unitControl,unitReport);validateIdentityReport(unitControl);assert.deepEqual(fs.readFileSync(path.join(unitOut,'vitest.json')),unitReportBytes);
  const unitRaw=IDENTITY_CASES.map(item=>{const file=path.join(unitEnv.SC_SEGUNDA_IDENTITY_EVIDENCE,item.file+'.json'),bytes=fs.readFileSync(file),value=JSON.parse(bytes);assert.equal(value.marker,item.marker);assert(Array.isArray(value.rows)&&value.rows.length>0);return{file:item.file+'.json',bytes:bytes.length,sha256:sha(bytes),rows:value.rows.length};});
  assert.equal(JSON.parse(fs.readFileSync(path.join(unitEnv.SC_SEGUNDA_IDENTITY_EVIDENCE,'burgos.json'))).rows.length,3);
  const unresolvedRaw=JSON.parse(fs.readFileSync(path.join(unitEnv.SC_SEGUNDA_IDENTITY_EVIDENCE,'unresolved.json')));assert.equal(unresolvedRaw.rows.length,118);assert.equal(unresolvedRaw.wrong.length,118);assert.equal(unresolvedRaw.profiles.length,19);
  write(path.join(unitOut,'admission.json'),{status:'expected-original-owned-red',source:CURRENT,testBlob:IDENTITY_TEST_BLOB,properTypesExit:0,nativeVitestExit:1,cases:IDENTITY_CASES,raw:unitRaw,transportBytes:0,copiedCensusControl:{marker:'SC_SEGUNDA_IDENTITY_CASE_CENSUS',changed:true,ownedAssertion:true,wholeInverseExact:true,originalJsonBytesHeld:true},scope:'Actual current869 before any original App overlay. Two owned business AssertionErrors and three held passes, not a green test suite or an implemented App fix.'});
  assert.deepEqual(inventory(),before,'full current869 source held after original-first unit');
  for(const arm of ['original','current']){
    for(const p of PRODUCTS)fs.writeFileSync(p.path,arm==='original'?original.get(p.path):held.get(p.path));
    const frame=inventory();for(const file of files){const p=PRODUCTS.find(p=>p.path===file);assert.equal(frame[file].sha256,p?sha(arm==='original'?original.get(file):held.get(file)):before[file].sha256,file+' exact overlay');}
    write(path.join(out,arm+'/source-before.json'),frame);const armEnv={...process.env,NODE_OPTIONS:'--require='+path.join(root,'scripts/lib/offlineTransport.cjs'),SIM_NETWORK:'offline',SIM_LEAGUE_SEASONS_BASE:BASE,SIM_LEAGUE_FINISH_ARTIFACTS:path.join(out,arm,'league-finish'),SIM_LEAGUE_SEASONS_ARTIFACTS:path.join(out,arm,'league-seasons'),SOCCER_LEAGUE_LOOKUP_OBSERVATION:path.join(out,arm,'lookup-observation.json')};
    const typeReceipt=path.join(out,arm,'types-transport.log');write(typeReceipt,'');const type=native(arm+'/types',path.join(root,'node_modules/.bin/tsc'),['--noEmit','-p','tsconfig.app.json'],{...armEnv,SIM_OFFLINE_RECEIPT:typeReceipt});cleanNative(type);assert.equal(fs.statSync(typeReceipt).size,0);
    const transport=path.join(out,arm,'normal-transport.log');write(transport,'');const r=native(arm+'/normal',process.execPath,['scripts/'+harness+'.mjs'],{...armEnv,SIM_OFFLINE_RECEIPT:transport});
    assert.equal(r.signal,null);assert.equal(r.error,null);assert([0,1].includes(r.nativeExit));assert.equal(fs.statSync(transport).size,0);assert.deepEqual(inventory(),frame,'full source held after '+arm);
    const observationFile=armEnv.SOCCER_LEAGUE_LOOKUP_OBSERVATION,observationBytes=fs.readFileSync(observationFile),observation=validateObservation(JSON.parse(observationBytes),arm);
    assert.equal(observation.source.trackedHarness,sha(observedHarness));assert.equal(observation.source.observedHarness,sha(observedHarness));
    assert.equal(observation.source.league,frame['src/lib/soccerCareerLeague.ts'].sha256);assert.equal(observation.source.generatedSeasons,frame['src/data/careerLeagueSeasons.ts'].sha256);assert.equal(observation.source.canonicalPool,frame['src/data/soccerCareerClubPool.ts'].sha256);
    const copied=structuredClone(observation),removed=copied.rows.pop();assert.notEqual(JSON.stringify(copied),JSON.stringify(observation));
    assert.throws(()=>validateObservation(copied,arm),error=>error.name==='AssertionError'&&error.message.includes('SC_SEGUNDA_LOOKUP_OBSERVATION_CENSUS'));
    copied.rows.push(removed);assert.deepEqual(copied,observation);validateObservation(copied,arm);assert.deepEqual(fs.readFileSync(observationFile),observationBytes);
    write(path.join(out,arm,'observation-census-control.json'),{marker:'SC_SEGUNDA_LOOKUP_OBSERVATION_CENSUS',removedActualRow:{club:removed.club,year:removed.year},changed:true,ownedAssertion:true,wholeInverseExact:true,actualRawHeld:true});
    observations.push(observation);
    const stdout=r.stdout.toString(),stderr=r.stderr.toString(),stdoutVerdict=stdout.match(VERDICT[harness]),stderrVerdict=stderr.match(VERDICT[harness]);
    const verdictStream=stdoutVerdict?'stdout':stderrVerdict?'stderr':null,verdict=(stdoutVerdict??stderrVerdict)?.[0]??null;
    const failures=stderr.split('\n').filter(line=>/^\s*FAIL(?:[: [(])/.test(line));const closing=(verdictStream==='stderr'?stderr:stdout).split('\n').filter(line=>line.startsWith(harness+':')).at(-1)??null;
    const result={arm,nativeExit:r.nativeExit,properTypesExit:0,verdictStream,verdict,closing,printedFailureLines:failures,stdoutSHA256:sha(r.stdout),stderrSHA256:sha(r.stderr),sourceHeld:true,transportBytes:0,scope:'Actual full default harness with receipt-only observation, original capped console diagnostics held. Complete section A rows and failures are retained separately. This does not turn a red normal result green or expose a raw normal RNG tape.'};
    results.push(result);write(path.join(out,arm+'/outcome.json'),result);write(path.join(out,arm+'/source-after.json'),inventory());
  }
  const old=observations[0],current=observations[1],oldIds=new Set(old.world.map(club=>club.id));
  const oldRows=new Map(old.rows.map(row=>[row.club.id+'|'+row.year,row])),heldRows=current.rows.filter(row=>oldIds.has(row.club.id));
  assert.equal(heldRows.length,old.rows.length);
  for(const row of heldRows)assert.deepEqual(row,oldRows.get(row.club.id+'|'+row.year),'complete old-domain lookup row held');
  const addedRows=current.rows.filter(row=>!oldIds.has(row.club.id));assert.equal(addedRows.length,19*36);
  const oldMessages=new Set(old.failures.map(row=>row.message)),heldFailures=current.failures.filter(row=>oldMessages.has(row.message)),addedFailures=current.failures.filter(row=>!oldMessages.has(row.message));
  assert.deepEqual(heldFailures,old.failures,'entire ordered old section A failure list held');
  const addedNames=new Set(current.world.filter(club=>!oldIds.has(club.id)).map(club=>club.name));
  assert(addedFailures.every(row=>[...addedNames].some(name=>row.message.startsWith(name+' '))),'all extra findings belong to the new profile domain');
  write(path.join(out,'lookup-delta.json'),{schema:'soccer-league-lookup-delta-v1',oldCompleteRows:old.rows.length,currentCompleteRows:current.rows.length,oldDomainRowsExact:true,oldFailures:old.failures,addedProfiles:current.world.filter(club=>!oldIds.has(club.id)),addedRows,addedFailures,scope:'Actual source-domain delta, not a claim that every added finding is false history or naturally reachable. Canon-null identity matches remain unresolved. Unmodified normal state/output comparison is a separate future artifact admission; its RNG tape is not directly exposed.'});
  write(path.join(out,'comparison.json'),{harness,base:BASE,current:CURRENT,results,nativeExitsExact:results[0].nativeExit===results[1].nativeExit,fullStdoutBytesExact:results[0].stdoutSHA256===results[1].stdoutSHA256,fullStderrBytesExact:results[0].stderrSHA256===results[1].stderrSHA256,printedFailureLinesExact:JSON.stringify(results[0].printedFailureLines)===JSON.stringify(results[1].printedFailureLines),normalGreen:results.every(r=>r.nativeExit===0&&r.verdict),scope:'Finite original/current full harness diagnostic with uncapped section A observation. Existing assertions, capped console output and native exit remain authoritative. No App/ledger/generated-data edit, full-fleet claim or pending-test waiver. Full observed states are retained; later comparison to the separately executed d9 normal artifacts is required where available.'});
}catch(error){fatal=error;write(path.join(out,'fatal.json'),{name:error.name,message:error.message,stack:error.stack});}
finally{
  for(const[file,b]of held)fs.writeFileSync(file,b);
  write(path.join(out,'source-after.json'),inventory());assert.deepEqual(inventory(),before,'full current source restored');write(path.join(out,'status-after.txt'),status());assert.equal(status(),'');write(path.join(out,'source-held.txt'),'SC_SEGUNDA_LOOKUP_OBSERVATION_SOURCE_HELD\n');
}
if(fatal)throw fatal;
assert.equal(results.length,2);assert(results.every(r=>r.verdict),'both unchanged harnesses reached their actual closing verdict');
assert(results.every(r=>r.nativeExit===0),'Unresolved actual normal red remains fatal after both arms and complete source restoration.');
console.log('SC_SEGUNDA_LOOKUP_OBSERVATION_BOTH_GREEN '+harness);
