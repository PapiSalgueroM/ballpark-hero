import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Remote actual-import proof. Application source and test assertions are never edited.
const ROOT = fs.realpathSync(process.cwd()), TEMP = fs.realpathSync(process.env.RUNNER_TEMP);
assert.equal(process.argv.length, 4); assert.equal(process.argv[2], '--out');
const OUT = path.resolve(process.argv[3]);
assert(OUT.startsWith(TEMP + path.sep) && !fs.existsSync(OUT), 'CM_POSITION_CONTROL_FRESH_OUTPUT');
assert(fs.realpathSync(path.dirname(OUT)).startsWith(TEMP + path.sep), 'CM_POSITION_CONTROL_REAL_OUTPUT_PARENT');
assert.equal(process.env.CI, '1'); assert.equal(process.env.SIM_NETWORK, 'offline');
assert.equal(process.env.GITHUB_REPOSITORY, 'PapiSalgueroM/ballpark-hero'); assert.equal(process.env.GITHUB_REPOSITORY_ID, '1195729679');
assert.equal(process.env.GITHUB_REF, 'refs/heads/codex/cm-free-positions-20261023');
assert(/^[a-f0-9]{40}$/.test(process.env.GITHUB_SHA || ''));
assert(/^[1-9][0-9]*$/.test(process.env.GITHUB_RUN_ID || '') && /^[1-9][0-9]*$/.test(process.env.GITHUB_RUN_ATTEMPT || ''));
for (const key of ['NO_DOUBLE_SWAP','US_BOARD_CONTROL_ALIAS','US_BOARD_CONTROL_FILE','COMPLETION_HOOK','TYCOON_AWAY_CONTROL',
  'OWNED_TIMEOUTS_HOOK','POLL_FIXTURES','CONQUEST_NBA_HOOK','CONQUEST_NBA_BOARD','DAILY_RECORD_CONTROL','TYCOON_ROOMS_PAGE',
  'TYCOON_LOADS_STADIUM_HOOK','TYCOON_LOADS_ACADEMY_HOOK','TYCOON_LOADS_STADIUM_LIB','TYCOON_LOADS_ACADEMY_LIB',
  'TYCOON_PITCH_COMPONENT','TYCOON_PACKS_REWARDS','TYCOON_PACKS_PANEL']) assert(!process.env[key], 'CM_POSITION_CONTROL_NO_INHERITED_ALIAS_' + key);
const sha = body => crypto.createHash('sha256').update(body).digest('hex');
const hashFile = file => sha(fs.readFileSync(file));
const git = args => execFileSync('git', args, { cwd: ROOT }).toString();
assert.equal(git(['rev-parse','HEAD']).trim(), process.env.GITHUB_SHA);
assert.equal(git(['rev-parse','HEAD:vitest.config.ts']).trim(), 'ed2a9dc677f77dfe95c061064eeff5782b856864');
assert.equal(process.env.NODE_OPTIONS, '--require=' + path.join(ROOT,'scripts/lib/offlineTransport.cjs'));
const CORE='src/lib/clubManager.ts', TEST='src/test/clubManagerPositionLive.test.ts';
const CORE_SHA='518f9be7ab031e8a4e922d65c4992d2e8e82f5ab0810e19abc6855907fa81f87';
const recipeFile=path.join(ROOT,'scripts/qa/cmPosition.controls.json');
const inputPins={
  [CORE]:CORE_SHA,
  [TEST]:'f9fdacec90b4190da5405f72524c91f45ad1449ca78e0d0535225638af5d7b00',
  'src/lib/clubManagerPositions.ts':'ba6a2ab6f4a220439dec9373ba3655c7a962abaa640cc8f47c206644df0407a7',
  'src/test/clubManagerPositionIntegration.test.ts':'d6a8abf9ba8793ba0e87148dc9bf90e3892b4c9055e2820688bcbe9a35b64d77',
  'src/test/clubManagerPositions.test.ts':'625ee402d0d506d82f03c7f8bb7b8f524b2a7b5a2bf3b83254607b2b6aec6ed3',
  'src/test/TacticsScreen.freePositions.test.tsx':'f7eee388e3bb0dda643e22f9b852f58088935cf7b48e88618bb11bfc7273903e',
  'scripts/qa/cmPosition.controls.json':'2143e57f69c57d32ed2c501408dcdb9ecc4b85b061df67a79540a1a0b45cac55',
  'vitest.config.ts':'6a68dd2f214dab4a3013eb41bad38eea65d703d61440002710ec246495e1c58a',
  'scripts/lib/offlineTransport.cjs':'e60ff1534307e449ccef598e3b7470dcba58681b82cea4005cec7319f14f9221',
};
function inputHolds(){for(const [file,pin] of Object.entries(inputPins))assert.equal(hashFile(path.join(ROOT,file)),pin,'CM_POSITION_CONTROL_INPUT_'+file);}
inputHolds();
const original=fs.readFileSync(path.join(ROOT,CORE),'utf8'), ancestor='Custom positioning frozen live boundaries';
const titles=[
  'owns independent current and kickoff snapshots only for a valid new custom kickoff',
  'projects a custom base through the canonical role and the existing mentality shift',
  'reads the saved custom second-half snapshot rather than a changed tactics-tab shape',
  'never opts an unmarked saved live match into a later career shape',
  'keeps custom points through a real duty change and chooses history strictly after its minute',
  'clears only current custom points on a real formation change and retains the frozen kickoff',
  'rebuilds a missing first-half rate from kickoff geometry after a real formation change',
  'adds custom geometry to actual first-half recuts while preserving committed events',
  'keeps a real short XI duty change valid without moving its canonical slot indexes',
  'keeps an invalid career formation index on the old raw-preserving fallback without a new rule marker',
  ...['unknown-rule','null-current','bad-current-formation','missing-kickoff','bad-history'].map(fault=>'refuses '+fault+' marked recovery before either mutation or a random draw'),
  'returns exact paused recovery with a reason from non-null advancing APIs on an unknown rule',
];
assert.equal(titles.length,16);assert.equal(new Set(titles).size,16);
const recipes=JSON.parse(fs.readFileSync(recipeFile,'utf8')).recipes;assert.equal(recipes.length,17);
const markerless=new Set(['kickoff-current-alias','read-career-instead-of-live']);
function changedBody(recipe){
  assert.equal(recipe.candidateSha256,CORE_SHA);assert.equal(recipe.count,1);
  const position=original.indexOf(recipe.before);
  assert(position>=0&&original.indexOf(recipe.before,position+recipe.before.length)<0,'CM_POSITION_CONTROL_UNIQUE_BEFORE');
  const changed=original.slice(0,position)+recipe.after+original.slice(position+recipe.before.length);
  assert.notEqual(changed,original,'CM_POSITION_CONTROL_SOURCE_CHANGED');assert.equal(sha(changed),recipe.mutatedSha256,'CM_POSITION_CONTROL_CHANGED_SHA');
  assert.equal(changed.slice(position,position+recipe.after.length),recipe.after);
  const restored=changed.slice(0,position)+recipe.before+changed.slice(position+recipe.after.length);
  assert.equal(restored,original,'CM_POSITION_CONTROL_FULL_POSITIONED_INVERSE');assert.equal(sha(restored),CORE_SHA);
  return {changed,position};
}
const ids=new Set();
for(const recipe of recipes){
  assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(recipe.id)&&!ids.has(recipe.id));ids.add(recipe.id);assert(titles.includes(recipe.testCase));
  if(recipe.marker===null)assert(markerless.has(recipe.id));else assert(typeof recipe.marker==='string'&&/^[A-Z0-9_]+$/.test(recipe.marker));
  changedBody(recipe);
}
for(const id of markerless)assert(ids.has(id)&&recipes.find(r=>r.id===id).marker===null);
fs.mkdirSync(OUT);
const write=(name,body)=>fs.writeFileSync(path.join(OUT,name),body,{flag:'wx'});
const json=(name,value)=>write(name,JSON.stringify(value,null,2)+'\n');
const summary={status:'running',complete:false,applicationQualified:false,balanceQualified:false,uiIntegrated:false,
  source:process.env.GITHUB_SHA,runId:process.env.GITHUB_RUN_ID,attempt:process.env.GITHUB_RUN_ATTEMPT,
  runnerSha256:hashFile(fileURLToPath(import.meta.url)),recipesSha256:hashFile(recipeFile),actualConfigGitBlob:'ed2a9dc677f77dfe95c061064eeff5782b856864',
  copiedImports:'One exact core alias, no import adapter. Canonical helper and shared formation modules are unchanged.',runs:[],controls:[],errors:[]};
write('source-recipes.json',fs.readFileSync(recipeFile));
function sourceInventory(){
  const files=git(['ls-files','-z']).split('\0');assert.equal(files.pop(),'');assert.equal(new Set(files).size,files.length);
  return files.sort().map(file=>{
    assert(file&&!/[\r\n\\]/.test(file)&&!path.isAbsolute(file)&&!file.split('/').some(p=>p==='.'||p==='..'));
    const full=path.join(ROOT,file),stat=fs.lstatSync(full);assert(stat.isFile()&&!stat.isSymbolicLink());
    return {file,bytes:stat.size,sha256:hashFile(full)};
  });
}
function dependencyInventory(){
  const rows=[];
  function walk(directory){
    for(const entry of fs.readdirSync(directory,{withFileTypes:true})){
      const full=path.join(directory,entry.name),file=path.relative(ROOT,full).split(path.sep).join('/');if(file==='node_modules/.vite')continue;
      const stat=fs.lstatSync(full);
      if(stat.isSymbolicLink())rows.push({file,link:fs.readlinkSync(full)});
      else if(stat.isDirectory())walk(full);else{assert(stat.isFile());rows.push({file,bytes:stat.size,sha256:hashFile(full)});}
    }
  }
  walk(path.join(ROOT,'node_modules'));assert(rows.length);return rows.sort((a,b)=>a.file<b.file?-1:a.file>b.file?1:0);
}
const copied=path.join(OUT,'copies'),activeRoot=path.join(ROOT,'.sim-control','cm-free-positions',process.env.GITHUB_RUN_ID+'-'+process.env.GITHUB_RUN_ATTEMPT+'-'+process.env.GITHUB_SHA);
assert(!fs.existsSync(activeRoot),'CM_POSITION_CONTROL_FRESH_ACTIVE_COPIES');
assert.equal(git(['check-ignore','--',path.relative(ROOT,activeRoot).split(path.sep).join('/')]).trim(),path.relative(ROOT,activeRoot).split(path.sep).join('/'));
for(let parent=path.dirname(activeRoot);parent!==ROOT;parent=path.dirname(parent)){if(fs.existsSync(parent)){const stat=fs.lstatSync(parent);assert(stat.isDirectory()&&!stat.isSymbolicLink());}}
const copyRows=[];
function assertCopies(){
  const names=copyRows.map(row=>row.name).sort();for(const folder of [activeRoot,copied])assert.deepEqual(fs.readdirSync(folder).sort(),names,'CM_POSITION_CONTROL_COPY_MEMBERS');
  for(const row of copyRows)for(const file of [row.active,row.evidence]){const stat=fs.lstatSync(file);assert(stat.isFile()&&!stat.isSymbolicLink());assert.equal(stat.size,row.bytes);assert.equal(hashFile(file),row.sha256,'CM_POSITION_CONTROL_IMMUTABLE_FULL_COPY');}
  return copyRows.map(row=>({...row}));
}
function createCopy(name,body,expectedSha){
  assert.equal(path.basename(name),name);assert(!copyRows.some(row=>row.name===name));assert.equal(sha(body),expectedSha);
  const active=path.join(activeRoot,name),evidence=path.join(copied,name);fs.writeFileSync(active,body,{flag:'wx'});fs.writeFileSync(evidence,body,{flag:'wx'});
  copyRows.push({name,active,evidence,bytes:Buffer.byteLength(body),sha256:expectedSha});assertCopies();return active;
}
const stripAnsi=value=>value.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g,'');
const escapeRegex=value=>value.replace(/[.*+?^{}$()|[\]\\]/g,'\\$&');
let healthy;
function run(label,recipe=null,fault=false,faultFile=null){
  inputHolds();const selectedFile=fault?faultFile:healthy,swap={'@/lib/clubManager':selectedFile},expectedSha=fault?recipe.mutatedSha256:CORE_SHA;
  const copiesBefore=assertCopies();json(label+'.copy-members.before.json',copiesBefore);assert.equal(hashFile(selectedFile),expectedSha);
  const reportFile=path.join(OUT,label+'.report.json'),logFile=path.join(OUT,label+'.log'),transport=path.join(OUT,label+'.transport');write(label+'.transport','');
  const args=['run',TEST,'--maxWorkers=1','--no-file-parallelism','--reporter=default','--reporter=json','--outputFile='+reportFile];
  if(recipe)args.push('--testNamePattern=^'+escapeRegex(ancestor+' '+recipe.testCase)+'$');
  const fd=fs.openSync(logFile,'wx');let child;
  try{child=spawnSync('node_modules/.bin/vitest',args,{cwd:ROOT,env:{...process.env,NO_DOUBLE_SWAP:JSON.stringify(swap),SIM_OFFLINE_RECEIPT:transport},
    stdio:['ignore',fd,fd],timeout:recipe?180000:600000,killSignal:'SIGTERM'});}finally{fs.closeSync(fd);}
  json(label+'.process.json',{status:child.status,signal:child.signal,error:child.error?{name:child.error.name,message:child.error.message,code:child.error.code}:null,args,swap,selectedSha256:expectedSha});
  write(label+'.exit',child.status===null?'NO_EXIT_CODE\n':child.status+'\n');
  const copiesAfter=assertCopies();json(label+'.copy-members.after.json',copiesAfter);assert.deepEqual(copiesAfter,copiesBefore);inputHolds();
  assert.equal(child.error,undefined,'CM_POSITION_CONTROL_NO_SPAWN_OR_TIMEOUT');assert.equal(child.signal,null);assert.equal(child.status,fault?1:0);assert.equal(fs.statSync(transport).size,0);
  const raw=JSON.parse(fs.readFileSync(reportFile,'utf8'));assert.equal(raw.success,!fault);assert.equal(raw.numTotalTests,16);
  assert.equal(raw.numPassedTests,fault?0:recipe?1:16);assert.equal(raw.numFailedTests,fault?1:0);assert.equal(raw.numPendingTests,recipe?15:0);assert.equal(raw.numTodoTests,0);assert.equal(raw.testResults.length,1);
  const suite=raw.testResults[0];assert.equal(path.resolve(suite.name),path.resolve(TEST));assert.equal(suite.status,fault?'failed':'passed');if('message'in suite)assert.equal(suite.message,'');assert.equal(suite.assertionResults.length,16);
  const seen=new Set(),owned=[];let executed=0;
  for(const row of suite.assertionResults){
    assert(titles.includes(row.title)&&!seen.has(row.title));seen.add(row.title);assert.equal(row.fullName,ancestor+' '+row.title);
    if(recipe&&row.title!==recipe.testCase){assert(['pending','skipped'].includes(row.status));assert.deepEqual(row.failureMessages,[]);continue;}
    executed+=1;assert.equal(row.status,fault?'failed':'passed');if(!fault){assert.deepEqual(row.failureMessages,[]);continue;}
    assert.equal(row.failureMessages.length,1);const error=stripAnsi(row.failureMessages[0]);assert.match(error,/^\s*AssertionError:/,'CM_POSITION_CONTROL_NATIVE_ASSERTION');
    assert.doesNotMatch(error,/\b(?:TypeError|ReferenceError|SyntaxError|RangeError|TimeoutError|UnhandledError)\s*:|\b(?:timed out|test timeout|hook timeout)\b/i);
    if(recipe.marker!==null)assert(new RegExp('(?:^|[^A-Z0-9_])'+recipe.marker+'(?:$|[^A-Z0-9_])').test(error),'CM_POSITION_CONTROL_OWNED_MARKER');
    else assert(markerless.has(recipe.id),'CM_POSITION_CONTROL_DECLARED_CASE_ONLY');
    owned.push({fullName:row.fullName,marker:recipe.marker,attribution:recipe.marker===null?'EXACT_CASE_NATIVE_ASSERTION_ONLY':'EXACT_CASE_AND_MARKER',failureMessages:row.failureMessages});
  }
  assert.equal(seen.size,16);assert.equal(executed,recipe?1:16);assert.equal(owned.length,fault?1:0);
  const runtime=['numRuntimeErrorTestSuites','numUnhandledErrors'];for(const key of runtime)if(key in raw)assert.equal(raw[key],0);if('unhandledErrors'in raw)assert.deepEqual(raw.unhandledErrors,[]);
  assert.doesNotMatch(fs.readFileSync(logFile,'utf8'),/Unhandled\s+(?:Errors?|Rejections?)|Uncaught\s+Exceptions?|Failed to resolve import|Cannot find (?:module|package)|No test files found/i);
  const observation={label,exit:child.status,selectedCase:recipe?.testCase??null,passed:raw.numPassedTests,failed:raw.numFailedTests,pending:raw.numPendingTests,
    observedRuntimeCounters:Object.fromEntries(runtime.filter(key=>key in raw).map(key=>[key,raw[key]])),absentRuntimeCountersUnknown:runtime.filter(key=>!(key in raw)),
    unhandledErrors:'unhandledErrors'in raw?raw.unhandledErrors:'UNKNOWN_ABSENT',owned,reportSha256:hashFile(reportFile),logSha256:hashFile(logFile),transportSha256:hashFile(transport)};
  summary.runs.push(observation);json(label+'.observation.json',observation);return observation;
}
let sourceBefore,depsBefore;
try{
  sourceBefore=sourceInventory();depsBefore=dependencyInventory();json('source-before.json',sourceBefore);json('dependencies-before.json',depsBefore);
  fs.mkdirSync(copied);fs.mkdirSync(activeRoot,{recursive:true});assert.equal(fs.realpathSync(activeRoot),activeRoot);healthy=createCopy('clubManager.healthy.ts',original,CORE_SHA);
  run('all-sixteen-healthy');
  for(const recipe of recipes){
    const record={id:recipe.id,sourceSha256:CORE_SHA,mutatedSha256:recipe.mutatedSha256,position:changedBody(recipe).position,healthy:false,fault:false,restored:false,errors:[]};
    try{run(recipe.id+'-healthy',recipe);record.healthy=true;const faultFile=createCopy(recipe.id+'.fault.ts',changedBody(recipe).changed,recipe.mutatedSha256);
      run(recipe.id+'-fault',recipe,true,faultFile);record.fault=true;
    }catch(error){record.errors.push({name:error.name,message:error.message,stack:error.stack});}
    finally{try{run(recipe.id+'-restored',recipe);record.restored=true;}catch(error){record.errors.push({name:error.name,message:error.message,stack:error.stack});}}
    summary.controls.push(record);if(!record.healthy||!record.fault||!record.restored||record.errors.length)summary.errors.push({control:recipe.id,message:'control not admitted'});
  }
}catch(error){summary.errors.push({phase:'setup-or-all-healthy',name:error.name,message:error.message,stack:error.stack});}
finally{
  try{if(healthy)run('all-sixteen-restored');}catch(error){summary.errors.push({phase:'all-restored',name:error.name,message:error.message,stack:error.stack});}
  try{
    const sourceAfter=sourceInventory(),depsAfter=dependencyInventory();json('source-after.json',sourceAfter);json('dependencies-after.json',depsAfter);
    assert.deepEqual(sourceAfter,sourceBefore,'CM_POSITION_CONTROL_FULL_SOURCE_HOLD');assert.deepEqual(depsAfter,depsBefore,'CM_POSITION_CONTROL_FULL_DEPENDENCY_HOLD');
    inputHolds();assert.equal(hashFile(recipeFile),summary.recipesSha256);assert.equal(hashFile(fileURLToPath(import.meta.url)),summary.runnerSha256);
    const copies=assertCopies();assert.deepEqual(copies.map(row=>row.name).sort(),['clubManager.healthy.ts',...recipes.map(r=>r.id+'.fault.ts')].sort());
    json('input-holds.json',{allEqual:true,sourceRows:sourceAfter.length,dependencyRows:depsAfter.length,inputPins,copies});
  }catch(error){summary.errors.push({phase:'final-holds',name:error.name,message:error.message,stack:error.stack});}
  summary.complete=summary.errors.length===0&&summary.runs.length===53&&summary.controls.length===17&&summary.controls.every(c=>c.healthy&&c.fault&&c.restored);
  summary.status=summary.complete?'ACTUAL_SIXTEEN_AND_SEVENTEEN_COPIED_CORE_CONTROLS_PASS':'REFUSED';json('proof.json',summary);
}
console.log('CM position controls: '+summary.status+', '+summary.runs.length+'/53 processes, '+summary.controls.filter(c=>c.healthy&&c.fault&&c.restored).length+'/17 controls.');
if(!summary.complete)process.exitCode=1;
