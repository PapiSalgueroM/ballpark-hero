// QA-only physical Start gate control. Remote CI only; original fixture/assertions stay unchanged.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
assert(process.env.CI,'Remote CI only');
const ROOT=process.cwd(),OUT=path.resolve(process.env.FD_RULES_GATE_OUT||'fantasy-draft-criteria-controls');
const originalRaw=process.env.FD_RULES_ORIGINAL_RAW;
assert(originalRaw&&path.isAbsolute(originalRaw),'FD_RULES_ORIGINAL_RAW is the retained absolute original RAW path');
assert(!fs.existsSync(OUT),'Fresh evidence directory required');fs.mkdirSync(OUT,{recursive:true});
const PAGE='src/pages/FantasyDraft.tsx',OWNED='src/test/fantasyDraftCriteriaStart.test.tsx';
const FIXED='d1b38c9aaae0ead2c68d746866e0ccb3b47adccd',ORIGINAL='2343cadb8ff109230f8ed6d13fe3c70e21c57014';
const PINS={
 [PAGE]:FIXED,[OWNED]:'4e9d54803677696454ef0cbbf155182192e03769',
 'src/lib/fantasyCriteria.ts':'f6f7d27ee0af80e4386e650a9d7128cd89702f90',
 'src/components/fantasy-draft/PlayerPool.tsx':'08a84d008390d68293482de3e818fada9120c5b3',
 'src/components/fantasy-draft/DraftRoster.tsx':'61d938308edcded2adffc810c01b7d9c12fd3a35',
 'src/test/fantasyDraftFormation.test.tsx':'4db9e392fdc40f01e2c668342e45eafcf37b79f6',
 'src/test/draftPoolFilters.test.tsx':'b6daf9f4023fe32cc87e55f50132dff5f8aa1295',
 'src/test/draftRosterMotion.test.tsx':'c0d6c95f3fbbbf189c064b46bb3cf0c452cf0dfd',
 'src/test/draftWinnerFeedback.test.tsx':'652c509b9d4ff791305bc2a6044c03aa41736b91',
 'package.json':'2ff64986fb76ebc51b706f2fd24765768874008a','package-lock.json':'97d6f12a052f25f400462938c241789a083f0bfe',
};
const EXISTING={'fantasyDraftFormation.test.tsx':3,'draftPoolFilters.test.tsx':7,'draftRosterMotion.test.tsx':4,'draftWinnerFeedback.test.tsx':5};
const TITLES=[
 'FD_RULES_PENDING_SUCCESS refuses premature admission and resumes after the deferred callback',
 'FD_RULES_PENDING_REJECTION refuses premature admission and resumes after the deferred callback',
 'FD_RULES_SETTLED_NULL preserves permissive picks and the original AI turn sequence',
 'FD_RULES_SETTLED_LEGACY preserves permissive picks and the original AI turn sequence',
];
const sha=b=>createHash('sha256').update(b).digest('hex'),blob=b=>createHash('sha1').update(Buffer.concat([Buffer.from('blob '+b.length+'\0'),b])).digest('hex');
const put=(name,v)=>{const b=Buffer.from(JSON.stringify(v,null,2)+'\n');fs.writeFileSync(path.join(OUT,name),b);return{file:name,bytes:b.length,sha256:sha(b)};};
const trackedFiles=execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
const capture=()=>trackedFiles.map(file=>{const b=fs.readFileSync(file);return{file,bytes:b.length,sha256:sha(b)};});
const versions=()=>Object.keys(JSON.parse(fs.readFileSync('package-lock.json')).packages).filter(p=>p.startsWith('node_modules/')&&fs.existsSync(p+'/package.json')).map(p=>[p,JSON.parse(fs.readFileSync(p+'/package.json')).version]);
const pins=()=>{for(const[file,id]of Object.entries(PINS))assert.equal(blob(fs.readFileSync(file)),id,file);};
pins();const head=capture(),installed=versions();assert.equal(installed.length,521);put('tracked-before.json',head);put('installed-before.json',installed);
const fixed=fs.readFileSync(PAGE),anchor='                  disabled={loadingCriteria}\n';assert.equal(fixed.toString('utf8').split(anchor).length-1,1,'One exact Start disabled gate');
const removed=Buffer.from(fixed.toString('utf8').replace(anchor,''));assert.notEqual(blob(removed),FIXED);assert.equal(blob(removed),ORIGINAL,'Removing only the gate restores exact immutable original Page');
const originalBytes=fs.readFileSync(originalRaw);assert.equal(sha(originalBytes),'cb4a95ed5b94ba2437fd81e1f5a2d0b64410110967a926c03c48db999862802e','Retained original RAW bytes');
fs.writeFileSync(path.join(OUT,'original-raw.json'),originalBytes);const original=JSON.parse(originalBytes);
const semantics=raw=>Object.fromEntries(Object.entries(raw.cases).map(([key,v])=>[key,v.frames.map(({label,state,inputPool})=>({label,state,inputPool}))]));
const rawCensus=(raw,negative)=>{
 assert.equal(raw.version,1);assert.deepEqual(Object.keys(raw.cases).sort(),['legacy','null','rejection','success']);
 const common=['criterion-settled-before-start','after-native-human-and-two-ai-picks','final-before-cleanup'];
 for(const[key,v]of Object.entries(raw.cases)){
  const pending=['pending-after-start-and-possible-pick','deferred-criteria-settled'];
  if(!negative)pending.push('after-native-human-and-two-ai-picks');pending.push('final-before-cleanup');
  assert.deepEqual(v.frames.map(f=>f.label),['success','rejection'].includes(key)?pending:common,key+' actual complete frame census');
  for(const f of v.frames){assert.equal(f.inputPool.length,27);assert.equal(new Set(f.inputPool.map(p=>p.id)).size,27);assert.equal(typeof f.html,'string');assert(f.state&&Array.isArray(f.state.draws)&&Array.isArray(f.state.human)&&Array.isArray(f.state.ai));}
 }
};
rawCensus(original,true);
const result={status:'running',pins:PINS,originalPage:ORIGINAL,originalRaw:{bytes:originalBytes.length,sha256:sha(originalBytes)},mutation:{anchor,fixed:FIXED,removed:blob(removed),changed:true,inverseExact:Buffer.from(removed.toString('utf8').replace('                  onClick={() => setStarted(true)}',anchor+'                  onClick={() => setStarted(true)}')).equals(fixed)},arms:[]};
assert(result.mutation.inverseExact);let fixedRaw;
function run(name,negative,includeExisting){
 const dir=path.join(OUT,name);fs.mkdirSync(dir);const before=capture(),expected=head.map(r=>r.file===PAGE?{file:PAGE,bytes:negative?removed.length:fixed.length,sha256:sha(negative?removed:fixed)}:r);
 assert.deepEqual(before,expected,'Only the declared physical gate differs');
 const rawPath=path.join(dir,'raw.json'),jsonPath=path.join(dir,'tests.json'),tests=[OWNED,...(includeExisting?Object.keys(EXISTING).map(f=>'src/test/'+f):[])];
 const child=spawnSync(process.execPath,['node_modules/vitest/vitest.mjs','run',...tests,'--maxWorkers=1','--minWorkers=1','--reporter=default','--reporter=json','--outputFile='+jsonPath],{cwd:ROOT,env:{...process.env,FD_RULES_START_RAW:rawPath},encoding:'utf8',maxBuffer:32*1024*1024});
 const log=(child.stdout||'')+(child.stderr||'');fs.writeFileSync(path.join(dir,'tests.log'),log);fs.writeFileSync(path.join(dir,'exit.txt'),String(child.status)+'\n');
 assert(!child.error&&!child.signal,'Child completed without runtime/spawn signal');assert.equal(child.status,negative?1:0,'Actual child exit');
 const r=JSON.parse(fs.readFileSync(jsonPath)),raw=JSON.parse(fs.readFileSync(rawPath));const total=includeExisting?23:4;
 assert.equal(r.numTotalTests,total);assert.equal(r.numFailedTests,negative?2:0);assert.equal(r.numPassedTests,total-(negative?2:0));assert.equal(r.numPendingTests,0);
 for(const key of ['numRuntimeErrorTestSuites','numUnhandledErrors'])if(Object.hasOwn(r,key))assert.equal(r[key],0,key);
 assert(!/Unhandled Errors|Unhandled Rejection|Uncaught Exception|Failed to resolve import|No test files found|SyntaxError/.test(log),'No setup/runtime banners');
 const suites=r.testResults,owned=suites.find(s=>path.basename(s.name)===path.basename(OWNED));assert(owned);assert.deepEqual(owned.assertionResults.map(v=>v.title).sort(),[...TITLES].sort());
 const failed=owned.assertionResults.filter(v=>v.status==='failed');assert.deepEqual(failed.map(v=>v.title).sort(),negative?TITLES.slice(0,2).sort():[]);
 for(const row of owned.assertionResults){assert.equal(row.status,negative&&TITLES.slice(0,2).includes(row.title)?'failed':'passed');if(row.status==='failed'){const id=row.title.split(' ')[0];assert(row.failureMessages.length>0);for(const rawMessage of row.failureMessages){const message=rawMessage.replace(/\x1b\[[0-9;]*m/g,'');assert(message.startsWith('AssertionError: '+id+' '),'Named business AssertionError only');}}}
 const actualSuites=Object.fromEntries(suites.map(s=>[path.basename(s.name),s.assertionResults.length]));assert.deepEqual(actualSuites,{[path.basename(OWNED)]:4,...(includeExisting?EXISTING:{})});
 for(const suite of suites.filter(s=>s!==owned))assert(suite.assertionResults.every(v=>v.status==='passed'),'Every old assertion passed');
 rawCensus(raw,negative);assert.deepEqual(capture(),before,'All working source bytes held through child');assert.deepEqual(versions(),installed);
 const semantic=semantics(raw),old=semantics(original);for(const key of ['null','legacy'])assert.deepEqual(semantic[key],old[key],name+' complete settled semantic frames vs retained original');
 if(negative)assert.deepEqual(semantic,old,'Physical original full semantic frame parity');
 if(name==='fixed')fixedRaw=raw;
 if(name==='restored')assert.deepEqual(semantic,semantics(fixedRaw),'Every fixed/restored semantic frame, including full pool, draws, storage, calls');
 const files=['tests.json','tests.log','raw.json','exit.txt'].map(file=>{const b=fs.readFileSync(path.join(dir,file));return{file:name+'/'+file,bytes:b.length,sha256:sha(b)};});
 const receipt={name,physicalPage:blob(fs.readFileSync(PAGE)),tests:total,passed:r.numPassedTests,failed:failed.map(v=>v.title),rawCases:Object.keys(raw.cases).length,rawFrames:Object.values(raw.cases).reduce((n,v)=>n+v.frames.length,0),files};
 result.arms.push(receipt);put(name+'-admission.json',receipt);console.log('PASS '+JSON.stringify(receipt));
}
try{
 run('fixed',false,true);
 fs.writeFileSync(PAGE,removed);assert.equal(blob(fs.readFileSync(PAGE)),ORIGINAL);run('remove-gate',true,false);
 fs.writeFileSync(PAGE,fixed);pins();run('restored',false,false);
 assert.equal(result.arms.reduce((n,a)=>n+a.tests,0),31);assert.equal(result.arms.reduce((n,a)=>n+a.failed.length,0),2);result.status='passed';
}catch(error){result.status='failed';result.error=String(error.stack||error);throw error;}
finally{
 fs.writeFileSync(PAGE,fixed);pins();const after=capture();put('tracked-after.json',after);assert.deepEqual(after,head,'Exact entire tracked source restoration');const afterVersions=versions();put('installed-after.json',afterVersions);assert.deepEqual(afterVersions,installed);
 result.restored=true;result.trackedRows=after.length;result.installed=installed.length;result.semanticScope='All label/state/inputPool fields, including complete storage, every observed draw and all calls. Full unfiltered html retained separately; no html parity claim.';
 put('report.json',result);
}
