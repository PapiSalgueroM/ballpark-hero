import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import crypto from 'node:crypto';
import { gzipSync } from 'node:zlib';
import assert from 'node:assert/strict';
const BASE='3268307038c4586dbc35f4697da1849512b473d9',CURRENT='76e2af6a555d86743a481a50c24dccb8348b26b7',TREE='8106a333f4e95ecb7f9197c98e4708ec232080b6';
const PRODUCTS=[{"path":"scripts/lib/careerClubPool.mjs","beforeBlob":"16ccc6137958a1adf2e40e5d26b99de466b38e24","afterBlob":"9ac9f0b9437f68e6a6b1f20c640afce109a8352f"},{"path":"src/data/soccerCareerClubPool.ts","beforeBlob":"83e9df78441c0d16509f80b8ec0bfbadb0f08f26","afterBlob":"9340217fac2ae3a86877ac878fcd677d22c973bd"},{"path":"src/lib/clubManager.ts","beforeBlob":"e3c9bcf0aec0f1e1caeb27d38d506d591d694237","afterBlob":"4b0a734e9fe9ba1e7139ead8d4fe5d6a1574c484"},{"path":"scripts/data/soccerCareerFacts.json","beforeBlob":"9828e41da792eafeead8036879d49f05242a5164","afterBlob":"5a8bcd1ae9b048d2bfa6b759b6b8fff1a7131e13"},{"path":"src/lib/soccerCareerEngine.ts","beforeBlob":"e88d6f91744bf14ac1d1afd43bbb26be9f9e15db","afterBlob":"94ccfb82dace9fc099c670357472732973e11d73"},{"path":"src/lib/soccerCareerCup.ts","beforeBlob":"0f2a6cc03afed64642d396af4d0979474a3c41cf","afterBlob":"1d93842578afa4fb92ed3c012701022fbf9d2e9c"},{"path":"scripts/data/domesticCupSources.json","beforeBlob":"b42a2d20fcb3882277902b80f5cb1bad510b2dff","afterBlob":"7ca21b866ac6641ff953c60c64f531bd674e48ce"},{"path":"src/pages/SoccerCareer.tsx","beforeBlob":"1f4d448cc9718bc3fa97b6987be5f14b27496c47","afterBlob":"e191a4634c44be5ebe511da0885579fdb6696dc5"},{"path":"src/lib/soccerCareerLeague.ts","beforeBlob":"9c05bf681f30bcd3703f55ad72c1289f4eeb9844","afterBlob":"3bf1c117da22ea2253b8dce264da1ea3a49a0517"}];
const PINS={"src/test/soccerSegundaHistoricalIdentity.test.ts":"008a5c95ff12b0e029b264078843744f2888fbd2","scripts/simCareerLeagueSeasons.mjs":"d9e77ab7a84f166ad2026bdd9e4d9d6afb22496e","scripts/lib/careerDevelopmentAttribution1185.mjs":"22a0e6e7830aa489aede6b7e5584cc713fc73521","scripts/lib/careerStoryRoleAttribution1190.mjs":"c1ba5b025cd11428bd68c5598e5a6ce4f942a51d","scripts/lib/careerLifeChainBF.mjs":"ac50944916d582e266bafaa00a1c49981459d5ad"};
const BASE_EXTRA_PINS={"scripts/lib/cmValueCurve.mjs":"0e7343b58edf9625a66e90c100833e861a035bdf","scripts/lib/cmAges.mjs":"cc06eb82058891797e2842accb7ddc167c529773"};
const HISTORY=[{"ref":"3268307038c4586dbc35f4697da1849512b473d9","tree":"6d18d84bcef424def83e496087830c096ba4163b","roots":["src","scripts/lib/careerClubPool.mjs","scripts/data/soccerCareerFacts.json","scripts/data/domesticCupSources.json","scripts/lib/cmValueCurve.mjs","scripts/lib/cmAges.mjs"],"srcTree":"74a5e5cf63544d3e037dfb7ae3091248ecd9f098","srcFiles":2594,"srcBytes":43689015},{"ref":"4ab80fa978cf362427bcd024c64c6691e7f83c2a","tree":"b821dca156ca13f7060b6299539f17603c87f677","roots":["src"],"srcTree":"47ead5c374ce4b3489d8b807bbfdd539fcb7dbd3","srcFiles":1882,"srcBytes":32660588}];
const REFS={simCareerLeagueSeasons:[0,1]};
const VERDICT={simCareerLeagueSeasons:/^simCareerLeagueSeasons: (?:all sections green|\d+ failures \(sections)/m};
delete process.env.GIT_NO_LAZY_FETCH;
const args=process.argv.slice(2);assert.equal(args.length,6);assert.equal(args[0],'--out');assert.equal(args[2],'--reference');assert.equal(args[4],'--reference-zip');
const out=path.resolve(args[1]),reference=path.resolve(args[3]),referenceZip=path.resolve(args[5]),harness='simCareerLeagueSeasons',root=process.cwd();assert(!out.startsWith(root+path.sep),'evidence belongs outside tracked checkout');
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
for(const key of Object.keys(process.env))assert(!/^(?:RECORD(?:_.*)?|WORLD|CAREERS|SEEDS|SEED_OFFSET|NATION|SNAPSHOT_PROBE_ONLY|WORLD_TRUTH_ONLY|WORLD_TRUTH_BASE_FROM_HEAD|WORLD_TRUTH_CONTROL|CUP_CONTROL|CM_RULES_CONTROL|SIM_LEAGUE_(?:FINISH|SEASONS)_(?!ARTIFACTS$).*)$/.test(key),'no inherited harness override '+key);
const before=inventory(),held=new Map(PRODUCTS.map(p=>[p.path,fs.readFileSync(p.path)]));
write(path.join(out,'source-before.json'),before);write(path.join(out,'source.txt'),text('rev-parse','HEAD','HEAD^{tree}')+'\n');
const original=new Map(),hydrated=[],results=[];
const normalHarness=fs.readFileSync('scripts/simCareerLeagueSeasons.mjs');
const CASES=[{"fullName":"Segunda historical identity boundary refuses the current Burgos profile's three unresolved historical aliases","status":"failed","marker":"SC_SEGUNDA_IDENTITY_BURGOS","file":"burgos"},{"fullName":"Segunda historical identity boundary refuses all 118 unresolved pre-2026 matches for the added canonical profiles","status":"failed","marker":"SC_SEGUNDA_IDENTITY_UNRESOLVED","file":"unresolved"},{"fullName":"Segunda historical identity boundary keeps verified historical canon and the distinct Real Burgos source identity","status":"passed","marker":"SC_SEGUNDA_IDENTITY_KNOWN","file":"known-canon"},{"fullName":"Segunda historical identity boundary keeps all nineteen real profiles and their modern 2026 labels","status":"passed","marker":"SC_SEGUNDA_IDENTITY_MODERN","file":"modern"},{"fullName":"Segunda historical identity boundary keeps unrelated unnamed manager-own identities readable","status":"passed","marker":"SC_SEGUNDA_IDENTITY_NEUTRAL","file":"neutral"}];
const GUARD_OPS=[{"before":"import { CAREER_LEAGUE_LADDER } from \"../data/soccerCareerClubPool\";","after":"import { CAREER_LEAGUE_LADDER, CAREER_POOL_SINCE } from \"../data/soccerCareerClubPool\";"},{"before":"  const m = ledgerMember(club, year);\n  const s = m ? ledgerLeague(m.key, year) : null;","after":"  const m = ledgerMember(club, year);\n  /* A future-only Segunda profile does not bind an unnamed historical alias.\n     An explicitly verified historical canon result remains authoritative. */\n  const since = CAREER_POOL_SINCE[club];\n  if (m?.canon === null && since !== undefined && year < since\n    && CAREER_LEAGUE_LADDER[\"Segunda Division\"]?.some(group => group.includes(club))) return null;\n  const s = m ? ledgerLeague(m.key, year) : null;"}];
const OBSERVER_OPS=[{"label":"declare observer","before":"const shown = {};\n","after":"const shown = {};\nconst lookupObservationFile = process.env.SOCCER_LEAGUE_LOOKUP_OBSERVATION;\nif (!lookupObservationFile || !path.isAbsolute(lookupObservationFile)) throw new Error('SOCCER_LEAGUE_LOOKUP_OBSERVATION must be an absolute evidence path');\nconst lookupObservation = { rows: [], failures: [] };\n"},{"label":"retain every failure","before":"  failures += 1; red.add(section);\n","after":"  failures += 1; red.add(section);\n  lookupObservation.failures.push({ section, message: m });\n"},{"label":"retain each real lookup result","before":"    const m = L.clubLedgerSeason(c.name, y);\n    ok(!(m && m.canon === null)","after":"    const m = L.clubLedgerSeason(c.name, y);\n    lookupObservation.rows.push({ club: structuredClone(c), year: y, expected: want, actual: { league: got, key: L.leagueKeyInYear(c, y), ledger: m } });\n    ok(!(m && m.canon === null)"},{"label":"retain completed section A before later setup","before":"/* ─── b. PLAYED ─── */\n","after":"fs.mkdirSync(path.dirname(lookupObservationFile), { recursive: true });\nfs.writeFileSync(lookupObservationFile, JSON.stringify({\n  schema: 'soccer-league-lookup-observation-v1',\n  scope: 'Actual section A results from the unchanged assertion loop. Later sections retain their normal behavior; this file is written before section B and is not a full-harness pass receipt.',\n  source: {\n    trackedHarness: createHash('sha256').update(fs.readFileSync(path.join(ROOT, 'scripts/simCareerLeagueSeasons.mjs'))).digest('hex'),\n    observedHarness: createHash('sha256').update(fs.readFileSync(fileURLToPath(import.meta.url))).digest('hex'),\n    league: createHash('sha256').update(fs.readFileSync(path.join(ROOT, 'src/lib/soccerCareerLeague.ts'))).digest('hex'),\n    generatedSeasons: createHash('sha256').update(fs.readFileSync(path.join(ROOT, 'src/data/careerLeagueSeasons.ts'))).digest('hex'),\n    canonicalPool: createHash('sha256').update(fs.readFileSync(path.join(ROOT, 'src/data/soccerCareerClubPool.ts'))).digest('hex'),\n  },\n  listSeason: LIST_SEASON, world: WORLD, ledgers,\n  answers, placed, seasonsIn, canonIn, failureCounts: { ...shown },\n  ...lookupObservation,\n}, null, 2) + '\\n');\n\n/* ─── b. PLAYED ─── */\n"}];
const TEST='src/test/soccerSegundaHistoricalIdentity.test.ts';
const referenceBytes=fs.readFileSync(referenceZip);
assert.equal(referenceBytes.length,15978538);assert.equal(sha(referenceBytes),'9a8036d064cec27c83a68e186dc5f345446c8aa512471a590ae7a489f364bd60');
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const originalUnit=read(path.join(reference,'replay/original-unit/admission.json'));
assert.deepEqual(originalUnit.cases,CASES);assert.equal(originalUnit.raw.length,5);
assert.equal(originalUnit.status,'expected-original-owned-red');assert.equal(originalUnit.source,'86919f885e7fc45c16822896f107e07c57450652');assert.equal(originalUnit.properTypesExit,0);assert.equal(originalUnit.nativeVitestExit,1);assert.equal(originalUnit.testBlob,PINS[TEST]);
const oldObservationBytes=fs.readFileSync(path.join(reference,'replay/original/lookup-observation.json'));
assert.equal(oldObservationBytes.length,17832372);assert.equal(sha(oldObservationBytes),'feb9af8d9542b5e9ba9802a276c381e309ed31d473f277a5972a3fc4123cb668');
const oldObservation=JSON.parse(oldObservationBytes);assert.equal(oldObservation.rows.length,497*36);assert.equal(oldObservation.failures.length,582);
for(const item of originalUnit.raw){const b=fs.readFileSync(path.join(reference,'replay/original-unit/evidence',item.file));assert.equal(b.length,item.bytes);assert.equal(sha(b),item.sha256);}
write(path.join(out,'input-provenance.json'),{run:41983973484,job:127100291579,artifact:13394699766,bytes:referenceBytes.length,sha256:sha(referenceBytes),scope:'Original owned red and complete original-domain section A reference. The original diagnostic job remained red.'});
const qualification={status:'incomplete',candidate:CURRENT,tree:TREE,normalGreen:false,scope:'Identity guard qualification only. Preexisting582 normal assertions stay unresolved. No build/native/public or full-fleet credit.',units:[],normals:[]};
const sourceFrame=buffers=>{const expected={...before};for(const[file,b]of buffers)expected[file]={bytes:b.length,sha256:sha(b)};return expected;};
function apply(buffers=new Map()){
  for(const[file,b]of held)fs.writeFileSync(file,b);fs.writeFileSync('scripts/simCareerLeagueSeasons.mjs',normalHarness);
  for(const[file,b]of buffers)fs.writeFileSync(file,b);
  const expected=sourceFrame(buffers);assert.deepEqual(inventory(),expected);return expected;
}
function typesAt(dir,extra={}){
  const receipt=path.join(out,dir,'types-transport.log');write(receipt,'');
  cleanNative(native(dir+'/types',path.join(root,'node_modules/.bin/tsc'),['--noEmit','-p','tsconfig.app.json'],{...process.env,NODE_OPTIONS:'--require='+path.join(root,'scripts/lib/offlineTransport.cjs'),SIM_NETWORK:'offline',SIM_OFFLINE_RECEIPT:receipt,...extra}));
  assert.equal(fs.statSync(receipt).size,0);
}
function reportOf(dir,failed){
  const result=read(path.join(out,dir,'vitest.json')),rows=result.testResults.flatMap(file=>file.assertionResults);reportOfValue(result,failed);
  assert.equal(result.testResults.length,1);assert.equal(rows.length,5,'SC_SEGUNDA_FIXED_CASE_CENSUS');assert.equal(result.numTotalTests,5);assert.equal(result.numPassedTests,5-failed.length);assert.equal(result.numFailedTests,failed.length);assert.equal(result.numPendingTests,0);assert.equal(result.numTodoTests??0,0);assert.equal(result.success,failed.length===0);
  assert.deepEqual(rows.map(row=>row.fullName).sort(),CASES.map(row=>row.fullName).sort(),'SC_SEGUNDA_FIXED_CASE_CENSUS');
  assert.deepEqual(rows.filter(row=>row.status==='failed').map(row=>row.fullName).sort(),[...failed].sort());
  for(const key of ['numRuntimeErrors','numRuntimeErrorTestSuites','numUnhandledErrors'])if(key in result)assert.equal(result[key],0);
  if('unhandledErrors' in result)assert.deepEqual(result.unhandledErrors,[]);
  for(const row of rows){assert.equal(row.status,failed.includes(row.fullName)?'failed':'passed');const messages=row.failureMessages??[];
    if(row.status==='passed'){assert.equal(messages.length,0);continue;}
    assert(messages.length>0);const message=messages.join('\n').replace(/\x1b\[[0-9;]*m/g,'');assert(/^AssertionError(?::|\b)/.test(message));assert(!/\b(?:TypeError|ReferenceError|SyntaxError)\b/.test(message));
    const item=CASES.find(item=>item.fullName===row.fullName);if(item.status==='failed')assert(message.includes(item.marker),item.marker);
  }
  return result;
}
function unitArm(dir,buffers,failed){
  const frame=apply(buffers);typesAt(dir);
  const receipt=path.join(out,dir,'vitest-transport.log');write(receipt,'');
  const r=native(dir+'/vitest',path.join(root,'node_modules/.bin/vitest'),['run',TEST,'--reporter=json','--outputFile='+path.join(out,dir,'vitest.json'),'--maxWorkers=1','--minWorkers=1'],{...process.env,NODE_OPTIONS:'--require='+path.join(root,'scripts/lib/offlineTransport.cjs'),SIM_NETWORK:'offline',SIM_OFFLINE_RECEIPT:receipt,SC_SEGUNDA_IDENTITY_EVIDENCE:path.join(out,dir,'evidence')});
  assert.equal(r.signal,null);assert.equal(r.error,null);assert.equal(r.nativeExit,failed.length?1:0);assert.equal(fs.statSync(receipt).size,0);assert(!/Unhandled|Vitest caught|uncaught|unhandled rejection/i.test(r.stdout.toString()+'\n'+r.stderr.toString()));
  const result=reportOf(dir,failed),control=structuredClone(result),removed=control.testResults[0].assertionResults.pop();assert.notDeepEqual(control,result);
  assert.throws(()=>reportOfValue(control,failed),error=>error.name==='AssertionError'&&error.message.includes('SC_SEGUNDA_FIXED_CASE_CENSUS'));
  control.testResults[0].assertionResults.push(removed);assert.deepEqual(control,result);
  const raw={};for(const item of CASES){const file=path.join(out,dir,'evidence',item.file+'.json'),b=fs.readFileSync(file),value=JSON.parse(b);assert.equal(value.marker,item.marker);raw[item.file]=b;}
  assert.deepEqual(inventory(),frame);
  qualification.units.push({arm:dir,nativeExit:r.nativeExit,failedFullNames:failed,raw:Object.fromEntries(Object.entries(raw).map(([file,b])=>[file,{bytes:b.length,sha256:sha(b)}])),copiedActualCensusControl:true});write(path.join(out,dir,'admission.json'),qualification.units.at(-1));return raw;
}
function reportOfValue(result,failed){
  const rows=result.testResults.flatMap(file=>file.assertionResults);assert.equal(rows.length,5,'SC_SEGUNDA_FIXED_CASE_CENSUS');assert.deepEqual(rows.map(row=>row.fullName).sort(),CASES.map(row=>row.fullName).sort(),'SC_SEGUNDA_FIXED_CASE_CENSUS');
  assert.deepEqual(rows.filter(row=>row.status==='failed').map(row=>row.fullName).sort(),[...failed].sort());return result;
}
function normalArm(dir,buffers,observed=false){
  const frame=apply(buffers);typesAt(dir);
  const receipt=path.join(out,dir,'normal-transport.log');write(receipt,'');
  const r=native(dir+'/normal',process.execPath,['scripts/simCareerLeagueSeasons.mjs'],{...process.env,NODE_OPTIONS:'--require='+path.join(root,'scripts/lib/offlineTransport.cjs'),SIM_NETWORK:'offline',SIM_OFFLINE_RECEIPT:receipt,SIM_LEAGUE_SEASONS_BASE:BASE,SIM_LEAGUE_SEASONS_ARTIFACTS:path.join(out,dir,'league-seasons'),...(observed?{SOCCER_LEAGUE_LOOKUP_OBSERVATION:path.join(out,dir,'lookup-observation.json')}:{})});
  assert.equal(r.signal,null);assert.equal(r.error,null);assert.equal(r.nativeExit,1);assert.equal(fs.statSync(receipt).size,0);assert.deepEqual(inventory(),frame);
  const report=read(path.join(out,dir,'league-seasons/report.json'));
  assert.equal(report.failures,582);assert.deepEqual(report.failedSections,['a']);assert.deepEqual(report.failureCounts,{a:582});assert.equal(report.status,'failed');
  assert.equal(report.baseline.careers,12);assert.equal(report.baseline.same,12);assert.equal(report.baseline.differ,0);assert.equal(report.baseline.rows,429);assert.equal(report.cases.length,12);
  const acceptedCases=[];
  for(const item of report.cases){
    const mine=fs.readFileSync(path.join(out,dir,'league-seasons',item.current.file)),base=fs.readFileSync(path.join(out,dir,'league-seasons',item.baseReleased.file));
    assert.equal(sha(mine),item.current.sha256);assert.equal(sha(base),item.baseReleased.sha256);
    const kept=fs.readFileSync(path.join(out,dir,'league-seasons',item.baseKept.file));assert.equal(sha(kept),item.baseKept.sha256);
    for(const attempt of item.attempts){const bytes=fs.readFileSync(path.join(out,dir,'league-seasons',attempt.file));assert.equal(sha(bytes),attempt.sha256,'actual retained attempt body '+attempt.arm);}
    let accepted=item.current;
    if(item.acceptedArm!=='raw'){
      const matches=item.attempts.filter(attempt=>attempt.arm===item.acceptedArm);assert.equal(matches.length,1,'one actual recorded accepted arm');assert.equal(matches[0].equal,true,'existing harness accepted exact equality');accepted=matches[0];
    }
    const payload=fs.readFileSync(path.join(out,dir,'league-seasons',accepted.file));assert.equal(sha(payload),accepted.sha256);
    assert.deepEqual(payload,base,'complete actual accepted payload equals base, without filtering or a new arm');
    acceptedCases.push({seed:item.seed,acceptedArm:item.acceptedArm,acceptedFile:accepted.file,acceptedSHA256:accepted.sha256,rawCurrentSHA256:item.current.sha256,baseReleasedSHA256:item.baseReleased.sha256,baseKeptSHA256:item.baseKept.sha256,rawCurrentEqualsBase:mine.equals(base),acceptedWholeBytesEqualBase:true});
  }
  assert(r.stdout.toString().includes('simCareerLeagueSeasons: 582 failures (sections a)'));
  qualification.normals.push({arm:dir,nativeExit:1,failures:582,sections:['a'],futureCareers:12,completeRows:429,acceptedCases,normalGreen:false,sourceHeld:true});return{r,report,dir};
}
function bodyFiles(dir){
  const walk=(base,rel='')=>fs.readdirSync(path.join(base,rel),{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(base,path.join(rel,e.name)):[path.join(rel,e.name)]);return walk(dir).sort();
}

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

  let inverseGuard=held.get('src/lib/soccerCareerLeague.ts').toString();
  for(const op of [...GUARD_OPS].reverse()){assert.equal(inverseGuard.split(op.after).length-1,1);inverseGuard=inverseGuard.replace(op.after,()=>op.before);}
  assert.deepEqual(Buffer.from(inverseGuard),original.get('src/lib/soccerCareerLeague.ts'),'exact two-span guard inverse to actual original');
  const originalNormal=normalArm('normal-original',original);
  const currentNormal=normalArm('normal-current',new Map());
  let observed=normalHarness.toString();
  for(const op of OBSERVER_OPS){assert.equal(observed.split(op.before).length-1,1);observed=observed.replace(op.before,()=>op.after);}
  const observedBytes=Buffer.from(observed);assert.equal(blob(observedBytes),'a1e7030f67c892d0d0161d234d678f7ec7bc928d');
  const observedNormal=normalArm('observed-current',new Map([['scripts/simCareerLeagueSeasons.mjs',observedBytes]]),true);
  assert.deepEqual(observedNormal.r.stdout,currentNormal.r.stdout,'actual full normal/observer stdout bytes');assert.deepEqual(observedNormal.r.stderr,currentNormal.r.stderr,'actual full normal/observer stderr bytes');
  const normalDir=path.join(out,'normal-current/league-seasons'),observedDir=path.join(out,'observed-current/league-seasons');
  const normalFiles=bodyFiles(normalDir),observedFiles=bodyFiles(observedDir);assert.deepEqual(observedFiles,normalFiles);
  for(const file of normalFiles){const normal=fs.readFileSync(path.join(normalDir,file)),measured=fs.readFileSync(path.join(observedDir,file));
    if(file==='report.json'){const from=sha(observedBytes),to=sha(normalHarness),text=measured.toString();assert.equal(text.split(from).length-1,2,'only before/after harness source hashes differ');assert.deepEqual(Buffer.from(text.split(from).join(to)),normal,'full report two-hash inverse');}
    else assert.deepEqual(measured,normal,'complete observed/normal returned state '+file);
  }
  const observationFile=path.join(out,'observed-current/lookup-observation.json'),observationBytes=fs.readFileSync(observationFile),observation=JSON.parse(observationBytes);
  function validateRows(value){assert.equal(value.rows.length,516*36,'SC_SEGUNDA_FIXED_LOOKUP_CENSUS');const keys=new Set(value.rows.map(row=>row.club.id+'|'+row.year));assert.equal(keys.size,value.rows.length,'SC_SEGUNDA_FIXED_LOOKUP_CENSUS');for(const club of value.world)for(let year=1990;year<2026;year++)assert(keys.has(club.id+'|'+year),'SC_SEGUNDA_FIXED_LOOKUP_CENSUS');}
  validateRows(observation);assert.equal(observation.source.trackedHarness,sha(observedBytes));assert.equal(observation.source.observedHarness,sha(observedBytes));assert.equal(observation.source.league,sha(held.get('src/lib/soccerCareerLeague.ts')));assert.equal(observation.world.length,516);assert.equal(observation.answers,18576);assert.equal(observation.failures.length,582);assert.deepEqual(observation.failures,oldObservation.failures,'complete ordered original582 assertions held');
  const oldIds=new Set(oldObservation.world.map(club=>club.id)),oldRows=new Map(oldObservation.rows.map(row=>[row.club.id+'|'+row.year,row]));
  const heldRows=observation.rows.filter(row=>oldIds.has(row.club.id));assert.equal(heldRows.length,497*36);for(const row of heldRows)assert.deepEqual(row,oldRows.get(row.club.id+'|'+row.year),'all old307 generated and190 hand historical rows exact');
  const added=observation.rows.filter(row=>!oldIds.has(row.club.id));assert.equal(added.length,19*36);assert(added.every(row=>row.actual.league===null&&row.actual.key===null&&row.actual.ledger===null),'all newly added canon-null historical lookups unknown');
  const copy=structuredClone(observation),removed=copy.rows.pop();assert.notDeepEqual(copy,observation);assert.throws(()=>validateRows(copy),error=>error.name==='AssertionError'&&error.message.includes('SC_SEGUNDA_FIXED_LOOKUP_CENSUS'));copy.rows.push(removed);assert.deepEqual(copy,observation);validateRows(copy);assert.deepEqual(fs.readFileSync(observationFile),observationBytes);
  write(path.join(out,'lookup-admission.json'),{oldRows:heldRows.length,oldGeneratedProfiles:307,handProfiles:190,orderedOriginalFailures:582,newProfiles:19,newRows:added.length,unknownNewRows:added.length,new118UnresolvedMatchesRefused:true,copiedActualRowControl:true,wholeInverseExact:true,normalStdoutStderrExact:true,completeNormalObserverStatesExact:true,normalReportOnlyTwoSourceHashesDiffer:true,scope:'Same-name neutral lookups for these nineteen names intentionally become unknown before their since-year. No ledger fact was promoted or rewritten. Raw unmodified normal RNG tapes are not exposed.'});
  const fixed=unitArm('unit-fixed',new Map(),[]);
  for(const item of CASES.filter(item=>item.status==='passed'))assert.deepEqual(fixed[item.file],fs.readFileSync(path.join(reference,'replay/original-unit/evidence',item.file+'.json')),'complete original held RAW '+item.file);
  const reversed=unitArm('unit-guard-reversed',new Map([['src/lib/soccerCareerLeague.ts',original.get('src/lib/soccerCareerLeague.ts')]]),CASES.filter(item=>item.status==='failed').map(item=>item.fullName));
  for(const item of CASES)assert.deepEqual(reversed[item.file],fs.readFileSync(path.join(reference,'replay/original-unit/evidence',item.file+'.json')),'whole guard-reversal original RAW '+item.file);
  const guard=held.get('src/lib/soccerCareerLeague.ts').toString(),anchor='  const m = ledgerMember(club, year);\n';assert.equal(guard.split(anchor).length-1,1);
  const broad=guard.replace(anchor,()=>anchor+'  if (m?.canon !== null) return null;\n');assert.notEqual(broad,guard);assert.equal(broad.replace(anchor+'  if (m?.canon !== null) return null;\n',()=>anchor),guard);
  const broadRaw=unitArm('unit-overbroad-known-canon',new Map([['src/lib/soccerCareerLeague.ts',Buffer.from(broad)]]),[CASES[2].fullName]);
  const denied=JSON.parse(broadRaw['known-canon']).rows;assert(denied.slice(0,3).every(row=>row.member===null));assert.equal(denied[3].member.canon,null,'distinct unnamed Real Burgos stays separate');
  write(path.join(out,'source-controls.json'),{guardReversal:{beforeBlob:blob(held.get('src/lib/soccerCareerLeague.ts')),faultBlob:blob(original.get('src/lib/soccerCareerLeague.ts')),actualTwoSpanInverse:true,failedFullNames:CASES.filter(item=>item.status==='failed').map(item=>item.fullName)},overbroadKnownCanon:{beforeBlob:blob(held.get('src/lib/soccerCareerLeague.ts')),faultBlob:blob(Buffer.from(broad)),before:anchor,after:anchor+'  if (m?.canon !== null) return null;\n',changed:true,wholeInverseExact:true,failedFullNames:[CASES[2].fullName]}});
  const restored=unitArm('unit-restored-fixed',new Map(),[]);for(const item of CASES)assert.deepEqual(restored[item.file],fixed[item.file],'all five complete fixed/restored RAW bytes '+item.file);
  qualification.status='targeted-proof-complete-normal-red';qualification.targetedProofComplete=true;qualification.normalObserverCompleteBytesExact=true;qualification.frozenSevenRemeasure='separate workflow, no credit here';
}catch(error){fatal=error;qualification.error={name:error.name,message:error.message,stack:error.stack};}
finally{
  for(const[file,b]of held)fs.writeFileSync(file,b);fs.writeFileSync('scripts/simCareerLeagueSeasons.mjs',normalHarness);
  write(path.join(out,'source-after.json'),inventory());assert.deepEqual(inventory(),before,'complete candidate source restored');write(path.join(out,'status-after.txt'),status());assert.equal(status(),'');write(path.join(out,'source-held.txt'),'SC_SEGUNDA_IDENTITY_FIXED_SOURCE_HELD\n');qualification.sourceAndLockHeld=true;write(path.join(out,'qualification.json'),qualification);
}
if(fatal)throw fatal;
assert.equal(qualification.units.length,4);assert.equal(qualification.normals.length,3);
assert(qualification.normals.every(row=>row.normalGreen),'Preexisting actual normal582 assertions remain red after complete targeted proof; not waived or called green.');
