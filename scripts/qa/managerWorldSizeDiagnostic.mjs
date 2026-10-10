import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

// Diagnostic copies keep every historical case, assertion, seed and budget.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const BASE = '09df145abfb241679022b41903d2f19bc254ebf9';
const OUT = path.resolve(process.env.MANAGER_SIZE_DIAGNOSTICS || path.join(ROOT, 'manager-world-size-diagnostics'));
const sha = value => createHash('sha256').update(value).digest('hex');
const git = args => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).trim();
const HEAD = git(['rev-parse', 'HEAD']), TREE = git(['rev-parse', 'HEAD^{tree}']), BASE_TREE = git(['rev-parse', `${BASE}^{tree}`]);
assert.equal(BASE_TREE, '3d527d2a120e909132bbbde53148d140b6a014e1');
const harnessBlobs = Object.fromEntries(['simClubManagerSaveSize.mjs','simClubManagerSlots.mjs'].map(name => {
  const original = git(['rev-parse', `${BASE}:scripts/${name}`]), current = git(['rev-parse', `${HEAD}:scripts/${name}`]);
  assert.equal(current, original, `Historical harness Git blob stays unchanged: ${name}`);
  return [name, { original, current }];
}));
fs.mkdirSync(OUT, { recursive: true });
const parent = path.join(ROOT, '.sim-control'); fs.mkdirSync(parent, { recursive: true });
const TEMP = fs.mkdtempSync(path.join(parent, 'manager-world-size-'));
const patches = [];
function replace(source, from, to, file) {
  const count = source.split(from).length - 1;
  assert.equal(count, 1, `One additive observer anchor in ${file}: ${from}`);
  assert.notEqual(from, to);
  const output = source.replace(from, to); assert.notEqual(output, source);
  patches.push({ file, from, to, count, effective: true, beforeSha256: sha(source), afterSha256: sha(output) });
  return output;
}
function heldSources() {
  const result = {};
  for (const relative of ['src/lib/clubManager.ts', 'src/lib/clubManagerWorldRoster.ts', 'src/lib/clubManagerEras.ts',
    'src/lib/clubManagerCalendar.ts', 'scripts/simClubManagerSaveSize.mjs', 'scripts/simClubManagerSlots.mjs',
    'scripts/qa/managerWorldSizeDiagnostic.mjs', '.github/workflows/manager-world-size-diagnostic.yml', 'package.json', 'package-lock.json']) {
    const bytes = fs.readFileSync(path.join(ROOT, relative)); result[relative] = sha(bytes);
  }
  return result;
}
const before = heldSources();
const observer = path.join(TEMP, 'observer.cjs');
fs.writeFileSync(observer, String.raw`
const fs = require('node:fs'), path = require('node:path'), {createHash} = require('node:crypto'), {gzipSync} = require('node:zlib');
module.exports = (directory, label) => {
  fs.mkdirSync(directory, {recursive:true});
  const sha = bytes => createHash('sha256').update(bytes).digest('hex');
  let enabled = true, active = false, raw = Math.random, wrapped = null, draws = [], stream = null, phase = null, rows = [];
  const measure = state => {
    if (!state || typeof state !== 'object' || Array.isArray(state)) return null;
    const text = JSON.stringify(state), records = state.worldRoster?.records ?? [];
    return {club:state.clubName??null,season:state.season??null,worldSeed:state.worldSeed??null,chars:text.length,utf8Bytes:Buffer.byteLength(text),
      fields:Object.fromEntries(Object.entries(state).map(([key,value])=>{const text=JSON.stringify(value);return [key,text===undefined?null:{chars:text.length,utf8Bytes:Buffer.byteLength(text)}];})),
      roster:{count:records.length,statuses:Object.fromEntries(['owned','released','retired'].map(status=>[status,{count:records.filter(r=>r.status===status).length,chars:JSON.stringify(records.filter(r=>r.status===status)).length}]))}};
  };
  const manifest = () => fs.writeFileSync(path.join(directory,'observer.json'),JSON.stringify({label,scope:label.endsWith('SaveSize.mjs')?'the unchanged fifteen-season section1':'the unchanged alone/interleaved sections1+2',rows},null,2));
  const frame = (kind,value) => {
    const drawCount=draws.length,bytes = Buffer.from(JSON.stringify({kind,stream,phase,value,draws})); draws=[];
    const name=String(rows.length).padStart(4,'0')+'-'+kind+'.json.gz',packed=gzipSync(bytes,{level:6});
    fs.writeFileSync(path.join(directory,name),packed);
    const states = value?.state?[measure(value.state)]:value?.fin?[measure(value.input),measure(value.fin),measure(value.next)]:[];
    rows.push({kind,phase,drawCount,file:name,bytes:bytes.length,sha256:sha(bytes),archiveBytes:packed.length,archiveSha256:sha(packed),states});manifest();
  };
  const reseed = context => {
    if (!enabled) return;
    if (draws.length) frame('between-streams',null);
    raw=Math.random;stream=context;draws=[];
    wrapped=()=>{const value=raw();draws.push(value);return value;};Math.random=wrapped;active=true;
  };
  return {phase:value=>{phase=value;},begin:()=>reseed({seedRule:process.env.SIM_SEED===undefined?'existing filename default':'existing SIM_SEED',simSeed:process.env.SIM_SEED??null}),reseed,frame,
    storage:value=>frame('whole-storage',{entries:value}),
    stop:()=>{if(draws.length)frame('tail',null);if(active&&Math.random===wrapped)Math.random=raw;enabled=false;manifest();}};
};
`);
fs.copyFileSync(observer, path.join(OUT, 'observer.cjs'));
const results = [];
const selected = new Set(['src','scripts','package.json','package-lock.json','tsconfig.json','tsconfig.app.json','tsconfig.node.json',
  'vite.config.ts','vitest.config.ts','index.html','postcss.config.js','tailwind.config.ts']);
try {
  for (const [arm, ref] of [['original', BASE], ['current', HEAD]]) {
    const directory = path.join(TEMP, arm); fs.mkdirSync(directory);
    const paths = git(['ls-tree', '--name-only', ref]).split('\n').filter(name => selected.has(name));
    assert(paths.includes('src') && paths.includes('scripts') && paths.includes('vitest.config.ts'));
    const archive = path.join(OUT, `${arm}-source.tar.gz`);
    execFileSync('git', ['archive','--format=tar.gz',`--output=${archive}`,ref,...paths], {cwd:ROOT});
    execFileSync('tar', ['-xzf',archive,'-C',directory], {cwd:ROOT});
    const sourceManifest = {};
    for (const relative of ['src/lib/clubManager.ts','src/lib/clubManagerEras.ts','src/lib/clubManagerCalendar.ts',
      'scripts/simClubManagerSaveSize.mjs','scripts/simClubManagerSlots.mjs','scripts/lib/seedRandom.mjs','package.json','package-lock.json']) {
      const bytes = fs.readFileSync(path.join(directory,relative)); sourceManifest[relative]=sha(bytes);
    }
    for (const name of ['simClubManagerSaveSize.mjs','simClubManagerSlots.mjs']) {
      const evidence = path.join(OUT,arm,name);fs.mkdirSync(evidence,{recursive:true});
      const file = path.join(directory,'scripts',name);
      const original = fs.readFileSync(file,'utf8').replaceAll('\r\n','\n'); let source=original;
      const prefix = `import {createRequire as __diagnosticRequire} from 'node:module';\nconst __diagnostic = __diagnosticRequire(import.meta.url)(${JSON.stringify(observer)})(${JSON.stringify(evidence)},${JSON.stringify(arm+'/'+name)});\n__diagnostic.begin();\n`;
      if (name==='simClubManagerSaveSize.mjs') {
        source=replace(source,'  let s = startCareer(club);','  let s = startCareer(club);\n  __diagnostic.frame(\'start\',{state:s});',arm+'/'+name);
        source=replace(source,'    const fin = finishSeason(s).state;','    const fin = finishSeason(s).state;\n    __diagnostic.frame(\'finished\',{state:fin});',arm+'/'+name);
        source=replace(source,'    s = startNextSeason(fin);','    s = startNextSeason(fin);\n    __diagnostic.frame(\'rollover\',{state:s});',arm+'/'+name);
        source=replace(source,"if (!snapForSection2) abort(","__diagnostic.stop();\nif (!snapForSection2) abort(",arm+'/'+name);
      } else {
        source=replace(source,'    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;\n  };\n}\n\nlet nudges = 0;',
          '    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;\n  };\n  __diagnostic.reseed({career,season});\n}\n\nlet nudges = 0;',arm+'/'+name);
        source=replace(source,'  saveCareer(startCareer(C.club, C.era, undefined, C.manager));',
          "  const __diagnosticStarted=startCareer(C.club,C.era,undefined,C.manager);\n  saveCareer(__diagnosticStarted);\n  __diagnostic.frame('start',{state:__diagnosticStarted});",arm+'/'+name);
        source=replace(source,'  mem = startCareer(C.club, C.era, undefined, C.manager);',
          "  mem = startCareer(C.club, C.era, undefined, C.manager);\n  __diagnostic.frame('start',{state:mem});",arm+'/'+name);
        source=replace(source,'const alone = [];',"__diagnostic.phase('alone');\nconst alone = [];",arm+'/'+name);
        source=replace(source,'let mem = null;',"__diagnostic.phase('interleaved');\nlet mem = null;",arm+'/'+name);
        source=replace(source,'function playOne(s) {','function playOne(s) {\n  const __diagnosticInput=JSON.parse(JSON.stringify(s));',arm+'/'+name);
        source=replace(source,'  return { fin: r.state, sum: r.summary, next: startNextSeason(r.state) };',
          "  const next = startNextSeason(r.state);\n  __diagnostic.frame('season',{input:__diagnosticInput,fin:r.state,sum:r.summary,next});\n  return { fin: r.state, sum: r.summary, next };",arm+'/'+name);
        source=replace(source,'const total = cmKeys.reduce((a, k) => a + bytesOf(k), 0);',
          "const total = cmKeys.reduce((a, k) => a + bytesOf(k), 0);\n__diagnostic.storage([...store.entries()]);\n__diagnostic.stop();",arm+'/'+name);
      }
      source=prefix+source;fs.writeFileSync(file,source);
      fs.writeFileSync(path.join(evidence,name),source);
      fs.writeFileSync(path.join(evidence,'observer-source.json'),JSON.stringify({arm,ref,tree:git(['rev-parse',`${ref}^{tree}`]),sourceManifest,
        sourceArchive:{file:path.basename(archive),sha256:sha(fs.readFileSync(archive))},
        harness:{file:'scripts/'+name,retainedFile:name,normalizedOriginalSha256:sha(original),compiledObserverSha256:sha(source)},
        patches:patches.filter(row=>row.file===arm+'/'+name),observerFile:'../../observer.cjs',observerSha256:sha(fs.readFileSync(observer))},null,2));
      const run=spawnSync(process.execPath,[file],{cwd:directory,encoding:'utf8',maxBuffer:64*1024*1024,timeout:45*60*1000,
        env:{...process.env,CI:'1',FORCE_COLOR:'0',NO_COLOR:'1',CM_SLOTS_ARTIFACTS:path.join(evidence,'slots-receipts')}});
      fs.writeFileSync(path.join(evidence,'stdout.log'),run.stdout??'');fs.writeFileSync(path.join(evidence,'stderr.log'),run.stderr??'');
      const observed=fs.existsSync(path.join(evidence,'observer.json'))?JSON.parse(fs.readFileSync(path.join(evidence,'observer.json'),'utf8')):null;
      const result={arm,ref,name,status:run.status,signal:run.signal,error:run.error?{name:run.error.name,message:run.error.message}:null,
        observerRows:observed?.rows.length??0,finishedSeasons:observed?.rows.filter(row=>row.kind==='finished').length??0,
        slotSeasonFrames:observed?.rows.filter(row=>row.kind==='season').length??0,
        stdoutSha256:sha(run.stdout??''),stderrSha256:sha(run.stderr??'')};
      results.push(result);fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify({head:HEAD,tree:TREE,base:BASE,baseTree:BASE_TREE,harnessBlobs,simSeed:process.env.SIM_SEED??null,
        scope:'diagnostic only, historical budget failures remain failures',sourceBefore:before,results,patches},null,2));
      console.log(`DIAGNOSTIC ${arm} ${name}: exit ${run.status}, ${result.finishedSeasons} finished size seasons, ${result.slotSeasonFrames} slot season frames`);
    }
  }
  const after=heldSources();assert.deepEqual(after,before);
  assert.equal(results.length,4);assert(results.every(row=>row.error===null&&row.signal===null),'All diagnostic processes completed');
  for(const result of results){assert.equal(result.name==='simClubManagerSaveSize.mjs'?result.finishedSeasons:result.slotSeasonFrames,result.name==='simClubManagerSaveSize.mjs'?45:65,'All original/current fixed historical season frames retained');}
  fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify({head:HEAD,tree:TREE,base:BASE,baseTree:BASE_TREE,harnessBlobs,simSeed:process.env.SIM_SEED??null,
    scope:'diagnostic only, historical budget failures remain failures',sourceBefore:before,sourceAfter:after,sourceHeld:true,results,patches},null,2));
  console.log('DIAGNOSTIC complete: original/current unchanged historical budgets, full raw states, storage and unfiltered action vectors retained');
} finally {
  assert.equal(path.dirname(fs.realpathSync(TEMP)),fs.realpathSync(parent));
  assert(path.basename(TEMP).startsWith('manager-world-size-'));
  fs.rmSync(TEMP,{recursive:true,force:true});
}
