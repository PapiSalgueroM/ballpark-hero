import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import crypto from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import assert from 'node:assert/strict';
const PRODUCTS=[{"path":"scripts/lib/careerClubPool.mjs","beforeBlob":"16ccc6137958a1adf2e40e5d26b99de466b38e24","afterBlob":"9ac9f0b9437f68e6a6b1f20c640afce109a8352f"},{"path":"src/data/soccerCareerClubPool.ts","beforeBlob":"83e9df78441c0d16509f80b8ec0bfbadb0f08f26","afterBlob":"9340217fac2ae3a86877ac878fcd677d22c973bd"},{"path":"src/lib/clubManager.ts","beforeBlob":"e3c9bcf0aec0f1e1caeb27d38d506d591d694237","afterBlob":"4b0a734e9fe9ba1e7139ead8d4fe5d6a1574c484"},{"path":"scripts/data/soccerCareerFacts.json","beforeBlob":"9828e41da792eafeead8036879d49f05242a5164","afterBlob":"ae78078feb67f06fc2922802091a113366e25fcb"},{"path":"src/lib/soccerCareerEngine.ts","beforeBlob":"e88d6f91744bf14ac1d1afd43bbb26be9f9e15db","afterBlob":"94ccfb82dace9fc099c670357472732973e11d73"},{"path":"src/lib/soccerCareerCup.ts","beforeBlob":"0f2a6cc03afed64642d396af4d0979474a3c41cf","afterBlob":"1d93842578afa4fb92ed3c012701022fbf9d2e9c"},{"path":"scripts/data/domesticCupSources.json","beforeBlob":"b42a2d20fcb3882277902b80f5cb1bad510b2dff","afterBlob":"7ca21b866ac6641ff953c60c64f531bd674e48ce"},{"path":"src/pages/SoccerCareer.tsx","beforeBlob":"1f4d448cc9718bc3fa97b6987be5f14b27496c47","afterBlob":"e191a4634c44be5ebe511da0885579fdb6696dc5"}];
const OPS={"compare":[{"before":"function compare(label, got, want) {\n","after":"function compare(label, got, want) {\n  fs.mkdirSync(process.env.SC_CM_OBSERVE_OUT, { recursive: true });\n  fs.writeFileSync(path.join(process.env.SC_CM_OBSERVE_OUT, label + '.got.json'), JSON.stringify(got, null, 2) + '\\n');\n"}],"full":[{"before":"function compare(label, got, want) {\n","after":"function compare(label, got, want) {\n  fs.mkdirSync(process.env.SC_CM_OBSERVE_OUT, { recursive: true });\n  fs.writeFileSync(path.join(process.env.SC_CM_OBSERVE_OUT, label + '.got.json'), JSON.stringify(got, null, 2) + '\\n');\n"},{"before":"const SCRIPT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');","after":"import { gzipSync } from 'node:zlib';\nconst qaTapes = [], qaSaves = [];\nconst qaDir = process.env.SC_CM_OBSERVE_OUT;\nconst qaWrite = (file, value) => {\n  const raw = Buffer.from(JSON.stringify(value));\n  const body = gzipSync(raw);\n  fs.mkdirSync(path.dirname(path.join(qaDir, file)), { recursive: true });\n  fs.writeFileSync(path.join(qaDir, file), body);\n  return { file, bytes: body.length, sha256: createHash('sha256').update(body).digest('hex'), rawBytes: raw.length, rawSHA256: createHash('sha256').update(raw).digest('hex') };\n};\nconst qaFrame = (save, label, value, state, summary) => {\n  save.frames[label] = { ...qaWrite('frames/' + encodeURIComponent(save.key) + '/' + label + '.json.gz', value), stateDigest: hash(state), summaryDigest: summary === undefined ? null : hash(summary) };\n};\nprocess.on('exit', () => qaWrite('observation.json.gz', { saves: qaSaves, tapes: qaTapes }));\n\nconst SCRIPT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');"},{"before":"const seeded = s => { let x = (s >>> 0) || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; };","after":"const seeded = s => { let x = (s >>> 0) || 1; const tape = { seed: s, values: [] }; qaTapes.push(tape); return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; const value = x / 4294967296; tape.values.push(value); return value; }; };"},{"before":"    Math.random = seeded(hashKey(`cm-league-rules|${sv.key}`));","after":"    const qaSave = { key: sv.key, club: sv.club, eraId: sv.eraId, second: !!sv.second, tapeIndex: qaTapes.length, frames: {} }; qaSaves.push(qaSave);\n    Math.random = seeded(hashKey(`cm-league-rules|${sv.key}`));"},{"before":"    const comp = { start: hash(s) };","after":"    const comp = { start: hash(s) };\n    qaFrame(qaSave, 'start', s, s);"},{"before":"    Object.assign(comp, seasonComponents(cm, s));","after":"    Object.assign(comp, seasonComponents(cm, s));\n    qaFrame(qaSave, 'played', played, played.state);"},{"before":"    const fin = cm.finishSeason(s);\n    comp.summary = hash(fin.summary);","after":"    const fin = cm.finishSeason(s);\n    qaFrame(qaSave, 'finished', fin, fin.state, fin.summary);\n    comp.summary = hash(fin.summary);"},{"before":"    Object.assign(comp, nextComponents(next));","after":"    Object.assign(comp, nextComponents(next));\n    qaFrame(qaSave, 'next', next, next);"},{"before":"      const two = seasonComponents(cm, played.state);","after":"      const two = seasonComponents(cm, played.state);\n      qaFrame(qaSave, 'second', played, played.state);"}]};
const args=process.argv.slice(2);assert(args.includes('--out')&&args.includes('--dist'),'required --out DIR --dist DIR');
const out=path.resolve(args[args.indexOf('--out')+1]),dist=path.resolve(args[args.indexOf('--dist')+1]),root=process.cwd();
const BASE='3268307038c4586dbc35f4697da1849512b473d9',CURRENT='ebd69abeb38ebb0b93fbff71a0caf2fa453db832';
const HARNESS='scripts/simCmLeagueRules.mjs',HARNESS_BLOB='b1ac15d38741bce3dd0643e2d3842327da093d33';
const COPY={compare:'scripts/.qa-soccer-segunda-cm-compare.mjs',full:'scripts/.qa-soccer-segunda-cm-full.mjs'};
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),shortHash=v=>sha(typeof v==='string'?v:JSON.stringify(v??null)).slice(0,16);
const blob=b=>crypto.createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
const write=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,Buffer.isBuffer(value)||typeof value==='string'?value:JSON.stringify(value,null,2)+'\n');};
const git=(...a)=>cp.execFileSync('git',a,{maxBuffer:32*1024*1024});
const tracked=git('ls-files','-z').toString().split('\0').filter(Boolean),source=()=>Object.fromEntries(tracked.map(p=>{const b=fs.readFileSync(p);return[p,{bytes:b.length,sha256:sha(b)}];}));
const files=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)]).sort();
const distMap=()=>Object.fromEntries(files(dist).map(p=>[path.relative(dist,p).split(path.sep).join('/'),{bytes:fs.statSync(p).size,sha256:sha(fs.readFileSync(p))}]));
const status=()=>git('status','--porcelain=v1','-z','--untracked-files=all').toString().split('\0').filter(Boolean).sort();
assert.deepEqual(status(),[],'initial source must be clean');assert(fs.existsSync(path.join(dist,'assets')),'completed dist required');
for(const p of Object.values(COPY))assert(!fs.existsSync(p),'observer copy must not preexist');
const before=source(),distBefore=distMap(),original=new Map(),current=new Map(),runs={original:{},current:{}},copies={};
write(out+'/source-before.json',before);write(out+'/dist-before.json',distBefore);write(out+'/source-head.txt',git('rev-parse','HEAD'));write(out+'/source-tree.txt',git('rev-parse','HEAD^{tree}'));
const harness=fs.readFileSync(HARNESS);assert.equal(blob(harness),HARNESS_BLOB);const text=harness.toString('utf8');
for(const row of PRODUCTS){const now=fs.readFileSync(row.path);assert.equal(blob(now),row.afterBlob);current.set(row.path,now);const old=git('show',BASE+':'+row.path);assert.equal(blob(old),row.beforeBlob);original.set(row.path,old);write(out+'/original-app/'+row.path,old);}
process.env.GIT_NO_LAZY_FETCH='1';
function transform(which){
  let changed=text;for(const op of OPS[which]){assert.equal(changed.split(op.before).length,2,'unique observation span');changed=changed.replace(op.before,op.after);}
  let inverse=changed;for(const op of [...OPS[which]].reverse()){assert.equal(inverse.split(op.after).length,2);inverse=inverse.replace(op.after,op.before);}
  assert.equal(inverse,text,'complete copied harness inverse');assert.notEqual(changed,text);return Buffer.from(changed);
}
for(const which of ['compare','full']){copies[which]=transform(which);write(out+'/observer-source/'+which+'.mjs',copies[which]);}
write(out+'/observer-source/hunks.json',{source:HARNESS,blob:HARNESS_BLOB,operations:OPS,uniqueForward:true,wholeInverseExact:true,seededArithmeticHeld:true,noExpectedOrBaselineChange:true});
const originalMap=structuredClone(before);for(const [p,b] of original)originalMap[p]={bytes:b.length,sha256:sha(b)};
let installed=false;
function hold(arm){
  assert.deepEqual(source(),arm==='original'?originalMap:before,'all tracked source bytes');
  const expected=[...(arm==='original'?[...original.keys()].map(p=>' M '+p):[]),...(installed?Object.values(COPY).map(p=>'?? '+p):[])].sort();assert.deepEqual(status(),expected,'only exact original overlays and copied observers');
  assert.deepEqual(distMap(),distBefore,'completed dist bytes held');
}
function apply(arm){for(const [p,b] of (arm==='original'?original:current))fs.writeFileSync(p,b);hold(arm);}
function child(arm,kind,command,argv,observe){
  const dir=out+'/'+arm+'/'+kind,receipt=dir+'/transport.log';write(receipt,'');
  const env={...process.env,SIM_NETWORK:'offline',GIT_NO_LAZY_FETCH:'1',NODE_OPTIONS:'--require='+path.join(root,'scripts/lib/offlineTransport.cjs'),SIM_OFFLINE_RECEIPT:receipt,CM_RULES_DIST:dist};
  delete env.CM_RULES_CONTROL;delete env.CM_RULES_ROOT;delete env.SC_CM_OBSERVE_OUT;if(observe)env.SC_CM_OBSERVE_OUT=dir+'/observation';
  const r=cp.spawnSync(command,argv,{encoding:'utf8',maxBuffer:64*1024*1024,env});
  write(dir+'/stdout.log',r.stdout??'');write(dir+'/stderr.log',r.stderr??'');write(dir+'/native.json',{command:[command,...argv],exit:r.status,signal:r.signal,error:r.error?.message??null,CM_RULES_DIST:dist});
  assert.equal(r.signal,null);assert.equal(r.error,undefined);assert.equal(fs.statSync(receipt).size,0);hold(arm);return r;
}
function normalResult(r){
  assert([0,1].includes(r.status),'normal harness native exit');const stdout=r.stdout??'',stderr=r.stderr??'';
  if(r.status===0){assert(stdout.includes('simCmLeagueRules: all checks passed (modern, eras, pure, drop4, cupless, shapes, chunks)'));return{exit:0,failures:[]};}
  const end=stderr.match(/simCmLeagueRules: (\d+) failure\(s\)\s*$/);assert(end,'must reach the normal harness closing, not crash');
  const failures=stderr.split('\n').filter(x=>x.startsWith('  FAIL: '));assert.equal(failures.length,Number(end[1]));assert(failures.length>0);return{exit:1,failures};
}
function sameNative(normal,other){assert.equal(other.status,normal.status);assert.equal(other.stdout,normal.stdout,'actual stdout held');assert.equal(other.stderr,normal.stderr,'actual stderr held');}
function got(arm,kind){
  const dir=out+'/'+arm+'/'+kind+'/observation';const names=fs.readdirSync(dir).filter(p=>p.endsWith('.got.json')).sort();
  assert.deepEqual(names,['eras.got.json','modern.got.json','pure.got.json']);const value=Object.fromEntries(names.map(p=>[p.slice(0,-9),JSON.parse(fs.readFileSync(dir+'/'+p,'utf8'))]));
  assert.equal(Object.keys(value.modern).length,27);assert.equal(Object.keys(value.eras).length,20);assert.equal(Object.keys(value.pure).length,48);return value;
}
function validateObservation(arm,kind,g){
  const dir=out+'/'+arm+'/'+kind+'/observation',raw=gunzipSync(fs.readFileSync(dir+'/observation.json.gz')),o=JSON.parse(raw);
  assert.equal(o.saves.length,47);assert.equal(new Set(o.saves.map(s=>s.key)).size,47);assert(o.tapes.length>=47);let frameCount=0,drawCount=0;
  for(const tape of o.tapes){assert(Number.isInteger(tape.seed));assert(Array.isArray(tape.values));for(const v of tape.values)assert(Number.isFinite(v)&&v>=0&&v<1);drawCount+=tape.values.length;}
  for(const s of o.saves){
    const record=g.modern[s.key]??g.eras[s.key];assert(record,'actual got has every observed save');assert.equal(record.club,s.club);assert.equal(record.eraId,s.eraId);
    assert.deepEqual(Object.keys(s.frames).sort(),(s.second?['start','played','finished','next','second']:['start','played','finished','next']).sort());
    assert(Number.isInteger(s.tapeIndex)&&s.tapeIndex>=0&&s.tapeIndex<o.tapes.length);assert(o.tapes[s.tapeIndex].values.length>0);
    for(const [label,f] of Object.entries(s.frames)){
      const body=fs.readFileSync(dir+'/'+f.file),payload=gunzipSync(body);assert.equal(body.length,f.bytes);assert.equal(sha(body),f.sha256);assert.equal(payload.length,f.rawBytes);assert.equal(sha(payload),f.rawSHA256);
      const value=JSON.parse(payload),state=['played','finished','second'].includes(label)?value.state:value;assert.equal(shortHash(state),f.stateDigest);
      const key={start:'start',played:'whole',next:'wholeNext',second:'s2_whole'}[label];if(key)assert.equal(f.stateDigest,record.hashes[key]);
      if(label==='finished'){assert.equal(shortHash(value.summary),f.summaryDigest);assert.equal(f.summaryDigest,record.hashes.summary);}
      frameCount++;
    }
  }
  write(out+'/'+arm+'/'+kind+'/observation-validation.json',{saves:47,tapes:o.tapes.length,draws:drawCount,frames:frameCount,allFullFrameBodiesAndGotLinksVerified:true});return o;
}
let failure;
try{
  for(const arm of ['original','current']){
    apply(arm);const types=child(arm,'types','node_modules/.bin/tsc',['--noEmit','-p','tsconfig.app.json']);assert.equal(types.status,0);
    const normal=child(arm,'normal',process.execPath,[HARNESS],false);runs[arm].normal=normal;runs[arm].normalResult=normalResult(normal);
  }
  for(const which of ['compare','full'])fs.writeFileSync(COPY[which],copies[which]);installed=true;
  const observed={};
  for(const arm of ['original','current']){
    apply(arm);const normal=runs[arm].normal;
    for(const kind of ['compare','full','repeat']){
      const which=kind==='compare'?'compare':'full',r=child(arm,kind,process.execPath,[COPY[which]],true);runs[arm][kind]=r;sameNative(normal,r);
      const value=got(arm,kind);if(kind==='compare')observed[arm]=value;else{assert.deepEqual(value,observed[arm],'SC_CM_OBSERVED_GOT_PARITY');validateObservation(arm,kind,value);}
    }
    const a=out+'/'+arm+'/full/observation',b=out+'/'+arm+'/repeat/observation';
    const map=dir=>Object.fromEntries(files(dir).map(p=>[path.relative(dir,p).split(path.sep).join('/'),{bytes:fs.statSync(p).size,sha256:sha(fs.readFileSync(p))}]));
    assert.deepEqual(map(a),map(b),'complete repeated frame/tape/got bytes');
    write(out+'/'+arm+'/observer-parity.json',{normalExit:normal.status,compareFullRepeatGotExact:true,normalAndAllObserverStdoutStderrExitExact:true,fullRepeatAllBodyBytesExact:true,normalRawTapeDirectlyObserved:false});
  }
  const actual=observed.original,copy=structuredClone(actual),key=Object.keys(copy.modern)[0],prior=copy.modern[key].hashes.start;
  copy.modern[key].hashes.start='owned-observer-control';assert.notEqual(copy.modern[key].hashes.start,prior);
  write(out+'/got-control/changed.json',copy);assert.throws(()=>assert.deepEqual(copy,actual,'SC_CM_OBSERVED_GOT_PARITY'),e=>e instanceof assert.AssertionError&&e.message.includes('SC_CM_OBSERVED_GOT_PARITY'));
  copy.modern[key].hashes.start=prior;assert.deepEqual(copy,actual);write(out+'/got-control/receipt.json',{basis:'copy of actual original got',changed:true,ownedFailure:'SC_CM_OBSERVED_GOT_PARITY',wholeInverseExact:true,noAppOutcomeCredit:true});
  const differences=[];
  for(const part of ['modern','eras','pure'])for(const key of new Set([...Object.keys(observed.original[part]),...Object.keys(observed.current[part])])){
    const a=observed.original[part][key],b=observed.current[part][key];if(JSON.stringify(a)!==JSON.stringify(b))differences.push({part,key,original:a,current:b});
  }
  const normalOutputsExact=runs.original.normal.stdout===runs.current.normal.stdout&&runs.original.normal.stderr===runs.current.normal.stderr&&runs.original.normal.status===runs.current.normal.status;
  write(out+'/attribution.json',{status:'actual normal results and reversible copied observations; normal failures remain failures',base:BASE,current:CURRENT,normalOriginal:runs.original.normalResult,normalCurrent:runs.current.normalResult,normalOutputsExact,completeOriginalCurrentGotEqual:differences.length===0,differences,
    evidence:'Normal raw tapes are not exposed. Seeded arithmetic is source-held, complete got and native output match copied observers, and full observed frames/tapes repeat byte exactly. No direct uninstrumented-normal tape comparison is claimed.',
    noBaselineReset:true,noBroadSuiteGreen:true,normalRedNotWaived:true});
  if(runs.original.normal.status!==0||runs.current.normal.status!==0)failure=new Error('SC_CM_NORMAL_RED: actual normal CM failures retained; observer parity does not make this matrix row green');
}catch(e){failure=e;}
finally{
  for(const [p,b] of current)fs.writeFileSync(p,b);for(const p of Object.values(COPY))if(fs.existsSync(p))fs.unlinkSync(p);installed=false;
  const after=source(),distAfter=distMap();write(out+'/source-after.json',after);write(out+'/dist-after.json',distAfter);write(out+'/status-after.json',status());
  assert.deepEqual(after,before);assert.deepEqual(distAfter,distBefore);assert.deepEqual(status(),[]);
  const receipts=files(out).filter(p=>path.basename(p)==='transport.log').map(p=>({path:path.relative(out,p).split(path.sep).join('/'),bytes:fs.statSync(p).size}));assert(receipts.every(r=>r.bytes===0));
  write(out+'/final-hold.json',{allSourceBytesHeld:true,completedDistBytesHeld:true,status:'clean',receipts,observerCopiesRemoved:true,baselineUnchanged:true});
}
if(failure)throw failure;
console.log('SC_CM_NORMAL_GREEN_WITH_OBSERVATIONS actual original and current normal CM passed, complete copied observations and all holds admitted');
