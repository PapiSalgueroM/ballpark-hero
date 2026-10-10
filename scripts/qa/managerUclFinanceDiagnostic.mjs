import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { gzipSync, gunzipSync } from 'node:zlib';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.resolve(ROOT, process.env.MANAGER_UCL_FINANCE_OUT || 'artifacts/manager-ucl-finance-diagnostic');
const REFS = { original: '09df145abfb241679022b41903d2f19bc254ebf9', current: '4477e8038cdd08511cb246ab7d61d31a42b1922b' };
const TREES = { original: '3d527d2a120e909132bbbde53148d140b6a014e1', current: '189744383b543613db2415276b8651a6e92c7c3d' };
const NAME = 'simClubManagerFinances.mjs';
const CLOCK = Number(process.env.FINANCE_DIAGNOSTIC_CLOCK || 1791590400000);
assert(Number.isSafeInteger(CLOCK) && CLOCK > 0);
const sha = value => createHash('sha256').update(value).digest('hex');
const lf = value => value.replaceAll('\r\n', '\n');
const git = args => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 }).trim();
const HEAD = git(['rev-parse', 'HEAD']), TREE = git(['rev-parse', 'HEAD^{tree}']);
const historical = ref => lf(execFileSync('git', ['show', `${ref}:scripts/${NAME}`], { cwd: ROOT, encoding: 'utf8' }));
assert.equal(historical(REFS.original), historical(REFS.current), 'The complete historical finance harness is unchanged');
for (const file of ['src/lib/clubManagerFinances.ts', 'package.json', 'package-lock.json']) {
  assert.equal(git(['rev-parse', `${REFS.original}:${file}`]), git(['rev-parse', `${REFS.current}:${file}`]), `${file} remains the same Git blob`);
}
fs.mkdirSync(OUT, { recursive: true });
const parent = path.join(ROOT, '.sim-control'); fs.mkdirSync(parent, { recursive: true });
const TEMP = fs.mkdtempSync(path.join(parent, 'ucl-finance-'));
const held = () => Object.fromEntries(['scripts/qa/managerUclFinanceDiagnostic.mjs', 'src/lib/clubManager.ts',
  'src/lib/clubManagerFinances.ts', 'src/lib/clubManagerUclLeague.ts', `scripts/${NAME}`, 'package.json', 'package-lock.json']
  .map(file => [file, sha(fs.readFileSync(path.join(ROOT, file)))]));
const sourceBefore = held();
const patches = [];
function replace(source, from, to, label) {
  const count = source.split(from).length - 1;
  assert.equal(count, 1, `One exact additive anchor: ${label}`); assert.notEqual(from, to);
  const result = source.replace(from, to);
  patches.push({ label, from, to, count, beforeSha256: sha(source), afterSha256: sha(result), effective: result !== source });
  return result;
}
const json = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2));
const writeGzip = (file, value) => { const bytes = Buffer.from(JSON.stringify(value)); const packed = gzipSync(bytes, { level: 9 });
  fs.writeFileSync(file, packed); return { file: path.relative(OUT, file).replaceAll('\\', '/'), sha256: sha(bytes), archiveSha256: sha(packed), bytes: bytes.length, archiveBytes: packed.length }; };
const readGzip = file => JSON.parse(gunzipSync(fs.readFileSync(file)));

const preload = path.join(OUT, 'preload.cjs');
fs.writeFileSync(preload, String.raw`
const fs = require('node:fs'), path = require('node:path'), {gzipSync} = require('node:zlib'), {createHash} = require('node:crypto');
const out = process.env.UCL_FINANCE_PROCESS_OUT;
const values = [], assignments = [], originals = new WeakMap(), wrappers = new WeakMap();
let raw = Math.random;
const wrapped = fn => {
  if (originals.has(fn)) fn = originals.get(fn);
  if (!wrappers.has(fn)) {
    const wrapper = function (...args) { const value = Reflect.apply(fn, this, args); values.push(value); return value; };
    wrappers.set(fn, wrapper); originals.set(wrapper, fn);
  }
  return wrappers.get(fn);
};
Object.defineProperty(Math, 'random', {configurable:true, enumerable:false,
  get:()=>wrapped(raw), set:fn=>{ if (typeof fn !== 'function') throw new Error('Non-function random assignment');
    raw=originals.get(fn)||fn; assignments.push({cursor:values.length}); }});
Date.now = () => Number(process.env.UCL_FINANCE_CLOCK);
globalThis.__uclFinanceTape = {cursor:()=>values.length, slice:(start,end)=>values.slice(start,end)};
process.on('exit', () => {
  const bytes = Buffer.alloc(values.length * 8); values.forEach((value,index)=>bytes.writeDoubleLE(value,index*8));
  const packed=gzipSync(bytes,{level:9}); fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'random.float64le.gz'),packed);
  const sha=value=>createHash('sha256').update(value).digest('hex');
  fs.writeFileSync(path.join(out,'random.json'),JSON.stringify({format:'Float64 little-endian, every unfiltered Math.random return',
    count:values.length,bytes:bytes.length,sha256:sha(bytes),archiveSha256:sha(packed),assignments,
    clock:Number(process.env.UCL_FINANCE_CLOCK),clockQualification:'Date.now is held equally in all four diagnostic processes; this is not a clock-free shared-run reproduction.'},null,2));
});
`);
const observer = path.join(OUT, 'observer.cjs');
fs.writeFileSync(observer, String.raw`
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{gzipSync}=require('node:zlib'),{createHash}=require('node:crypto');
module.exports = directory => {
  fs.mkdirSync(directory,{recursive:true});const rows=[],cases=[];let active=false,current=null,serial=0;
  const tape=()=>globalThis.__uclFinanceTape;
  const cursor=()=>tape()?.cursor()??0;
  const sha=value=>createHash('sha256').update(value).digest('hex');
  const manifest=()=>fs.writeFileSync(path.join(directory,'observer.json'),JSON.stringify({scope:'Exactly section3, six original clubs by six original seeds',rows,cases},null,2));
  function emit(kind,payload) {
    const bytes=Buffer.from(JSON.stringify(payload)),packed=gzipSync(bytes,{level:9}),file=String(serial++).padStart(5,'0')+'-'+kind+'.json.gz';
    fs.writeFileSync(path.join(directory,file),packed);
    const row={kind,caseId:current?.id??null,file,sha256:sha(bytes),archiveSha256:sha(packed),bytes:bytes.length,archiveBytes:packed.length,
      start:payload.start??null,end:payload.end??null,week:payload.state?.week??payload.before?.week??null};
    rows.push(row);
    manifest();return row;
  }
  function read(state,fn) {const before=JSON.stringify(state),start=cursor(),value=fn();
    assert.equal(JSON.stringify(state),before,'Diagnostic reading holds the complete saved input');
    assert.equal(cursor(),start,'Diagnostic reading draws zero random values');return value;}
  const facts=(state,cm,fin)=>read(state,()=>({books:fin.booksOf(state),closedSoFar:fin.closeLedger(state),
    fixtures:state.calendar.map((entry,index)=>({index,entry,involved:cm.entryInvolvesMe(state,entry),fixture:cm.fixtureFor(state,entry)})),
    certain:fin.certainFixturesLeft(state),travelUnit:{ordinary:fin.travelCost(state,'league'),europe:fin.travelCost(state,'uclKo')}}));
  return {emit,section:value=>{active=value;},beginCase:context=>{assert(active);assert.equal(current,null);
      current={...context,id:context.clubIndex*6+context.seed,start:cursor(),rowsStart:rows.length};cases.push(current);},
    construct:fn=>{if(!active)return fn();const start=cursor(),state=fn(),end=cursor();emit('constructor',{context:current,state,start,end,draws:tape().slice(start,end)});return state;},
    action:(state,fn,cm,fin)=>{if(!active)return fn();const before=JSON.parse(JSON.stringify(state)),start=cursor(),result=fn(),end=cursor(),afterFacts=facts(result.state,cm,fin);
      emit('action',{context:current,before,inputAfter:state,result,afterFacts,start,end,draws:tape().slice(start,end)});return result;},
    snapshot:(state,projection,cm,fin)=>{if(!active||projection===undefined)return;const start=cursor(),detail=facts(state,cm,fin);
      emit('snapshot',{context:current,state,projection,...detail,start,end:cursor(),draws:tape().slice(start,cursor())});},
    endCase:(state,cm,fin)=>{assert(active&&current);const start=cursor(),detail=facts(state,cm,fin);
      emit('end',{context:current,state,...detail,complete:state.week>=state.calendar.length,sacked:!!state.sacked,start,end:cursor(),draws:tape().slice(start,cursor())});
      current.end=cursor();current.rowsEnd=rows.length;current.complete=state.week>=state.calendar.length;current.sacked=!!state.sacked;current=null;manifest();},
    finish:()=>{assert.equal(current,null);manifest();}};
};
`);

function instrument(source, evidence, observed) {
  const local = patches.length;
  const prefix = `import {createRequire as __financeRequire} from 'node:module';\nconst __finance = __financeRequire(import.meta.url)(${JSON.stringify(observer)})(${JSON.stringify(evidence)});\n`;
  source = replace(source, '--log-level=error ${aliases.join(\' \')}', `--log-level=error --metafile=${JSON.stringify(path.join(evidence, 'bundle-meta.json'))} \${aliases.join(' ')}`, 'bundle metadata');
  if (observed) {
    source = replace(source, '  const AT = [5, 15, 30];', '  __finance.section(true);\n  const AT = [5, 15, 30];', 'section3 starts');
    source = replace(source, '        const snaps = {};', '        __finance.beginCase({club,clubIndex:i,seed,effectiveSeed:1000+i*10+seed+SEED_OFFSET,simSeed:process.env.SIM_SEED??null});\n        const snaps = {};', 'case identity');
    const line = '        const end = playSeason(startCareer(club), s => { if (AT.includes(s.week) || s.week === 2) snaps[s.week] = projectFinances(s); });';
    source = replace(source, line, '        const end = playSeason(__finance.construct(() => startCareer(club)), s => { if (AT.includes(s.week) || s.week === 2) { snaps[s.week] = projectFinances(s); __finance.snapshot(s,snaps[s.week],cm,fin); } });\n        __finance.endCase(end,cm,fin);', 'actual cohort constructor and forecast');
    source = replace(source, '    if (at) at(s);\n    const r = playNextEntry(s, { skipHalftime: true });', '    if (at) at(s);\n    const r = __finance.action(s, () => playNextEntry(s, { skipHalftime: true }), cm, fin);', 'actual calendar action');
    const close = "  if (!tight('income')) fail('the income projection is no tighter at week 30 than at week 5');\n}";
    source = replace(source, close, close + '\n__finance.section(false);\n__finance.finish();', 'section3 ends');
  }
  const changes = patches.slice(local); let restored = source;
  for (const patch of [...changes].reverse()) {assert.equal(restored.split(patch.to).length-1,1);restored=restored.replace(patch.to,patch.from);}
  assert.equal(restored, historical(REFS.original), 'Full source restored by undoing only declared additive observations');
  return { source: prefix + source, prefix, changes, restoredSha256: sha(restored) };
}

function readFrame(directory,row) {const packed=fs.readFileSync(path.join(directory,row.file)),raw=gunzipSync(packed);
  assert.equal(sha(packed),row.archiveSha256);assert.equal(sha(raw),row.sha256);assert.equal(raw.length,row.bytes);return JSON.parse(raw);}
function completedRank(state) {
  const group=state.uclGroup;
  if(group?.format!=='league36'||group.matchday!==8)return null;
  assert.equal(group.table.length,36);assert.equal(group.fixtures.length,8);assert.equal(group.results.length,144);
  const totals=new Map(group.table.map(row=>[row.club,{club:row.club,w:0,d:0,l:0,gf:0,ga:0,pts:0}]));
  assert.equal(totals.size,36);const ordered=group.fixtures.flat();const seen=new Set();
  for(let index=0;index<ordered.length;index++){const [home,away]=ordered[index],result=group.results[index];
    assert.equal(result.home,home);assert.equal(result.away,away);assert(!seen.has(JSON.stringify([home,away])));seen.add(JSON.stringify([home,away]));
    assert(Number.isSafeInteger(result.hg)&&result.hg>=0&&Number.isSafeInteger(result.ag)&&result.ag>=0);
    const h=totals.get(home),a=totals.get(away);assert(h&&a&&home!==away);h.gf+=result.hg;h.ga+=result.ag;a.gf+=result.ag;a.ga+=result.hg;
    if(result.hg>result.ag){h.w++;h.pts+=3;a.l++;}else if(result.hg<result.ag){a.w++;a.pts+=3;h.l++;}else{h.d++;a.d++;h.pts++;a.pts++;}}
  for(const row of group.table)assert.deepEqual(row,totals.get(row.club),'Whole table is certified from all saved league-phase results');
  const extra=new Map(group.table.map(row=>[row.club,{awayGoals:0,awayWins:0,points:0,gd:0,goals:0}]));
  for(const r of group.results){const home=extra.get(r.home),away=extra.get(r.away),h=totals.get(r.home),a=totals.get(r.away);
    away.awayGoals+=r.ag;if(r.ag>r.hg)away.awayWins++;home.points+=a.pts;home.gd+=a.gf-a.ga;home.goals+=a.gf;
    away.points+=h.pts;away.gd+=h.gf-h.ga;away.goals+=h.gf;}
  const index=new Map(group.table.map((row,i)=>[row.club,i]));
  const ranked=[...group.table].sort((a,b)=>{const x=extra.get(a.club),y=extra.get(b.club);return b.pts-a.pts||(b.gf-b.ga)-(a.gf-a.ga)||b.gf-a.gf
    ||y.awayGoals-x.awayGoals||b.w-a.w||y.awayWins-x.awayWins||y.points-x.points||y.gd-x.gd||y.goals-x.goals||index.get(a.club)-index.get(b.club);});
  const rank=ranked.findIndex(row=>row.club===state.clubName)+1;assert(rank>0);return{rank,ranked};
}
function analyse(directory,manifest,tape) {
  assert.equal(manifest.cases.length,36);assert.deepEqual(manifest.cases.map(c=>c.id),Array.from({length:36},(_,i)=>i));
  const cases=[];
  for(const context of manifest.cases){const rows=manifest.rows.filter(row=>row.caseId===context.id);
    assert.equal(rows.filter(row=>row.kind==='constructor').length,1);assert.equal(rows.filter(row=>row.kind==='end').length,1);
    const payloads=rows.map(row=>({row,value:readFrame(directory,row)}));
    for(const {value}of payloads){assert.deepEqual(value.draws,tape.slice(value.start,value.end));assert.equal(value.draws.length,value.end-value.start);}
    const end=payloads.find(p=>p.row.kind==='end').value,actions=payloads.filter(p=>p.row.kind==='action');
    assert(actions.length>0);let previous=payloads.find(p=>p.row.kind==='constructor').value.state;
    for(const {value}of actions){assert.deepEqual(value.before,previous);previous=value.result.state;}
    assert.deepEqual(end.state,previous);assert.equal(end.complete,context.complete);assert.equal(end.sacked,context.sacked);
    const snapshots=payloads.filter(p=>p.row.kind==='snapshot').map(({row,value:snap})=>{
      assert([2,5,15,30].includes(snap.state.week));assert.equal(snap.draws.length,0);
      const stage=completedRank(snap.state),missing=snap.fixtures.filter(f=>f.index>=snap.state.week&&f.entry.type==='uclKo'&&f.involved&&f.fixture===null);
      const guaranteed=stage&&stage.rank<=8&&snap.state.uclKoRound==='R16'&&!snap.state.uclDraw.R16
        ?missing.filter(f=>f.entry.uclRound==='R16'):[];
      const later=actions.filter(p=>p.value.before.week>=snap.state.week).map(p=>({row:p.row,value:p.value}));
      const actualMissing=missing.map(f=>{const action=later.find(p=>p.value.result.report&&p.value.result.state.resultLog?.at(-1)?.week===f.index),v=action?.value;
        if(v){assert.equal(v.result.state.week,f.index+1);assert.equal(v.result.report.competition,'uclKo');}
        return{entry:f,actionFile:action?.row.file??null,resultKind:v?.result.kind??null,report:v?.result.report??null,
          actualSavedMatch:v?.result.state.resultLog?.at(-1)??null,booksBefore:v?.before.books??null,booksAfter:v?.result.state.books??null};});
      const diff=Object.fromEntries(snap.projection.income.concat(snap.projection.spend).map(line=>[line.id,{actualAtSnapshot:line.actual,projected:line.projected,final:end.closedSoFar[line.id]??null}]));
      return{file:row.file,sha256:row.sha256,week:snap.state.week,stage,missingInvolvedFixtures:missing,guaranteedUndrawnR16:guaranteed,
        guaranteedUndrawnR16Count:guaranteed.length,laterConfirmedGuaranteedCount:actualMissing.filter(f=>guaranteed.some(g=>g.index===f.entry.index)&&f.report!==null).length,
        actualMissingFixtures:actualMissing,remainingActualMatchFiles:later.filter(p=>p.value.result.report).map(p=>p.row.file),lineComparisons:diff,
        incomeError:end.complete?(snap.projection.incomeProjected-end.closedSoFar.income)/Math.max(1,end.closedSoFar.income):null,
        spendError:end.complete?(snap.projection.spendProjected-end.closedSoFar.spend)/Math.max(1,end.closedSoFar.spend):null};});
    const earnedUndrawnWindows=actions.flatMap(({row,value})=>{const state=value.result.state,stage=completedRank(state);
      if(!stage||stage.rank>8||state.uclKoRound!=='R16'||state.uclDraw.R16)return[];
      const missing=value.afterFacts.fixtures.filter(f=>f.index>=state.week&&f.entry.type==='uclKo'&&f.entry.uclRound==='R16'&&f.involved&&f.fixture===null);
      return[{file:row.file,sha256:row.sha256,week:state.week,stage,guaranteedUndrawnCount:missing.length,entries:missing}];});
    cases.push({...context,constructorFile:rows.find(r=>r.kind==='constructor').file,endFile:rows.find(r=>r.kind==='end').file,actionFiles:actions.map(p=>p.row.file),snapshots,earnedUndrawnWindows});
  }
  const median=a=>{const s=[...a].sort((a,b)=>a-b);return s.length?s[Math.floor(s.length/2)]:null;};
  const p90=a=>{const s=[...a].sort((a,b)=>a-b);return s.length?s[Math.min(s.length-1,Math.floor(s.length*.9))]:null;};
  return{cases,complete:cases.filter(c=>c.complete).length,sacked:cases.filter(c=>c.sacked).length,
    bands:Object.fromEntries([5,15,30].map(week=>{const samples=cases.flatMap(c=>c.snapshots.filter(s=>s.week===week&&s.incomeError!==null));
      return[week,{count:samples.length,income:{signedMedian:median(samples.map(s=>s.incomeError)),absMedian:median(samples.map(s=>Math.abs(s.incomeError))),p90:p90(samples.map(s=>Math.abs(s.incomeError)))},
        spend:{signedMedian:median(samples.map(s=>s.spendError)),absMedian:median(samples.map(s=>Math.abs(s.spendError))),p90:p90(samples.map(s=>Math.abs(s.spendError)))}}];}))};
}
function observationControl(directory,manifest) {
  const control=path.join(directory,'observation-control');fs.mkdirSync(control,{recursive:true});
  const source=fs.readFileSync(observer,'utf8'),from='    rows.push(row);',to="    if (!['constructor','snapshot','action'].includes(kind)) rows.push(row);";
  assert.equal(source.split(from).length-1,1);const fault=source.replace(from,to);assert.notEqual(fault,source);
  const undo=fault.replace(to,from);assert.equal(undo,source);
  const selected=['constructor','snapshot','action'].map(kind=>manifest.rows.find(row=>row.kind===kind));assert(selected.every(Boolean));
  const observations={};
  for(const [name,text]of Object.entries({healthy:source,fault,undo})){const file=path.join(control,name+'.cjs'),out=path.join(control,name);fs.writeFileSync(file,text);
    const emit=createRequire(import.meta.url)(file)(out);for(const row of selected)emit.emit(row.kind,readFrame(directory,row));emit.finish();
    const raw=fs.readFileSync(path.join(out,'observer.json')),data=JSON.parse(raw),failures=[];
    for(const kind of ['constructor','snapshot','action']){try{assert.equal(data.rows.filter(r=>r.kind===kind).length,1);}catch(e){assert.equal(e.name,'AssertionError');failures.push(kind+'-retained');}}
    const files=fs.readdirSync(out).filter(f=>f.endsWith('.json.gz')).sort().map(f=>({file:f,sha256:sha(gunzipSync(fs.readFileSync(path.join(out,f))))}));
    assert.equal(files.length,3,'All underlying complete observed files remain retained');assert.equal(sha(fs.readFileSync(file)),sha(text));
    observations[name]={sourceSha256:sha(text),manifestSha256:sha(raw),failures,files};}
  assert.deepEqual(observations.healthy.failures,[]);assert.deepEqual(observations.fault.failures,['constructor-retained','snapshot-retained','action-retained']);
  assert.deepEqual(observations.undo,observations.healthy);assert.deepEqual(observations.fault.files,observations.healthy.files);
  assert.equal(sha(fs.readFileSync(observer)),sha(source));json(path.join(control,'receipt.json'),{scope:'Copied observation retention only, no product assertion credit',from,to,count:1,effective:true,observations});
  return{file:path.relative(OUT,path.join(control,'receipt.json')).replaceAll('\\','/'),sha256:sha(fs.readFileSync(path.join(control,'receipt.json')))};
}

const results=[];
try {
  for(const [arm,ref]of Object.entries(REFS)){
    assert.equal(git(['rev-parse',`${ref}^{tree}`]),TREES[arm]);const archive=path.join(OUT,arm+'-source.tar.gz');
    execFileSync('git',['archive','--format=tar.gz',`--output=${archive}`,ref],{cwd:ROOT});
    const treeText=execFileSync('git',['ls-tree','-r',ref],{cwd:ROOT,encoding:'utf8',maxBuffer:128*1024*1024});fs.writeFileSync(path.join(OUT,arm+'-git-tree.txt'),treeText);
    let plain=null;
    for(const mode of ['plain','observed']){
      const directory=path.join(TEMP,arm+'-'+mode),evidence=path.join(OUT,arm,mode);fs.mkdirSync(directory,{recursive:true});fs.mkdirSync(evidence,{recursive:true});
      execFileSync('tar',['-xzf',archive,'-C',directory]);fs.symlinkSync(path.join(ROOT,'node_modules'),path.join(directory,'node_modules'),'junction');
      const sourceManifest={};for(const line of treeText.trim().split('\n')){const match=/^\d+ blob ([a-f0-9]+)\t(.+)$/.exec(line);if(!match)continue;
        const bytes=fs.readFileSync(path.join(directory,match[2]));sourceManifest[match[2]]={gitBlob:match[1],sha256:sha(bytes),bytes:bytes.length};}
      const file=path.join(directory,'scripts',NAME),raw=fs.readFileSync(file),measured=lf(raw.toString());assert.equal(measured,historical(ref));
      fs.writeFileSync(path.join(evidence,'measured-harness.mjs'),raw);const built=instrument(measured,evidence,mode==='observed');fs.writeFileSync(file,built.source);fs.writeFileSync(path.join(evidence,NAME),built.source);
      json(path.join(evidence,'source.json'),{arm,mode,ref,tree:TREES[arm],archive:{file:path.basename(archive),sha256:sha(fs.readFileSync(archive))},sourceManifest,
        measuredHarnessRawSha256:sha(raw),measuredHarnessLfSha256:sha(measured),executedHarnessSha256:sha(built.source),restoredHarnessLfSha256:built.restoredSha256,
        prefix:built.prefix,patches:built.changes,preloadSha256:sha(fs.readFileSync(preload)),observerSha256:sha(fs.readFileSync(observer))});
      const run=spawnSync(process.execPath,['--require',preload,file],{cwd:directory,encoding:'utf8',maxBuffer:64*1024*1024,timeout:30*60*1000,
        env:{...process.env,UCL_FINANCE_PROCESS_OUT:evidence,UCL_FINANCE_CLOCK:String(CLOCK),CM_FINANCES_CONTROL:'',CI:'1',FORCE_COLOR:'0',NO_COLOR:'1'}});
      fs.writeFileSync(path.join(evidence,'stdout.log'),run.stdout??'');fs.writeFileSync(path.join(evidence,'stderr.log'),run.stderr??'');
      const random=JSON.parse(fs.readFileSync(path.join(evidence,'random.json'))),randomPacked=fs.readFileSync(path.join(evidence,'random.float64le.gz')),randomRaw=gunzipSync(randomPacked);
      assert.equal(sha(randomPacked),random.archiveSha256);assert.equal(sha(randomRaw),random.sha256);assert.equal(randomRaw.length,random.count*8);
      const tape=Array.from({length:random.count},(_,i)=>randomRaw.readDoubleLE(i*8));assert(tape.every(v=>Number.isFinite(v)&&v>=0&&v<1));
      for(const name of ['clubManagerFinances.entry.mjs','clubManagerFinances.bundle.mjs'])fs.copyFileSync(path.join(os.tmpdir(),name),path.join(evidence,name));
      const meta=JSON.parse(fs.readFileSync(path.join(evidence,'bundle-meta.json'))),loaded=[];
      for(const name of Object.keys(meta.inputs)){const absolute=path.resolve(directory,name),relative=path.relative(directory,absolute).replaceAll('\\','/'),bytes=fs.readFileSync(absolute);
        if(sourceManifest[relative])assert.equal(sha(bytes),sourceManifest[relative].sha256);loaded.push({input:name,relative,sha256:sha(bytes),bytes:bytes.length,gitBlob:sourceManifest[relative]?.gitBlob??null});}
      json(path.join(evidence,'loaded.json'),loaded);
      const result={arm,mode,ref,tree:TREES[arm],status:run.status,signal:run.signal,error:run.error?{name:run.error.name,message:run.error.message}:null,
        stdoutSha256:sha(run.stdout??''),stderrSha256:sha(run.stderr??''),random,loadedCount:loaded.length,
        expectedQualification:'Historical harness exit remains its actual result. A diagnostic completion is not a finance-band or product PASS.'};
      results.push(result);json(path.join(OUT,'report.json'),{head:HEAD,tree:TREE,refs:REFS,trees:TREES,clock:CLOCK,simSeed:process.env.SIM_SEED??null,sourceBefore,results});
      assert.equal(result.error,null);assert.equal(result.signal,null);assert([0,1].includes(result.status),'A completed assertion result, not a signal/setup timeout');
      if(mode==='plain')plain={result,tape};else{
        assert.equal(result.status,plain.result.status);assert.equal(result.stdoutSha256,plain.result.stdoutSha256);assert.equal(result.stderrSha256,plain.result.stderrSha256);
        assert.deepEqual(random,plain.result.random,'Whole unfiltered draw tape and all original stream assignments are identical');assert.deepEqual(tape,plain.tape);
        const manifest=JSON.parse(fs.readFileSync(path.join(evidence,'observer.json'))),analysis=analyse(evidence,manifest,tape);
        result.analysis=writeGzip(path.join(evidence,'analysis.json.gz'),analysis);result.cases=36;result.frames=manifest.rows.length;result.completed=analysis.complete;result.sacked=analysis.sacked;
        result.observationControl=observationControl(evidence,manifest);
      }
      console.log(`DIAGNOSTIC ${arm}/${mode}: historical exit ${result.status}, ${random.count} complete random values${mode==='observed'?', all36 cohort cases retained':''}`);
    }
  }
  const sourceAfter=held();assert.deepEqual(sourceAfter,sourceBefore);
  json(path.join(OUT,'report.json'),{head:HEAD,tree:TREE,refs:REFS,trees:TREES,clock:CLOCK,simSeed:process.env.SIM_SEED??null,
    scope:'Full36 original/current historical cohort diagnosis only, actual original/current harness status remains qualified',sourceBefore,sourceAfter,sourceHeld:true,results});
  let totalBytes=0;const inventory=[];function scan(directory){for(const e of fs.readdirSync(directory,{withFileTypes:true})){const absolute=path.join(directory,e.name);if(e.isDirectory())scan(absolute);else{
    if(absolute===path.join(OUT,'inventory.json'))continue;const bytes=fs.readFileSync(absolute);totalBytes+=bytes.length;inventory.push({file:path.relative(OUT,absolute).replaceAll('\\','/'),bytes:bytes.length,sha256:sha(bytes)});}}}scan(OUT);
  json(path.join(OUT,'inventory.json'),inventory);
  assert(totalBytes+fs.statSync(path.join(OUT,'inventory.json')).size<500000000,'Complete retained diagnostic evidence stays below500MB without dropping records');
  console.log('DIAGNOSTIC complete: all36 cases per source, plain/observed full outputs and unfiltered vectors held, full ledgers/matches and effective observation controls retained. No product gate credit.');
} finally {
  const resolved=fs.realpathSync(TEMP),safe=fs.realpathSync(parent);assert(resolved.startsWith(safe+path.sep));assert(path.basename(resolved).startsWith('ucl-finance-'));
  fs.rmSync(resolved,{recursive:true,force:true});
}
