/* Remote baseline reproduction, actual hook/position/validator code with fictional transport.
 * No browser, database or physical Safari diagnosis is claimed.
 */
import '../lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

assert(process.env.CI && process.env.SIM_NETWORK === 'offline', 'Remote offline CI only');
assert(process.env.XI_SELECTION_RACE_PHASE === 'baseline', 'Only the unchanged-app baseline is currently implemented');
assert(process.env.XI_RACE_OUT && path.isAbsolute(process.env.XI_RACE_OUT), 'Absolute XI_RACE_OUT required');
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'), OUT=process.env.XI_RACE_OUT;
const BASE='1823478805186fcd037d5f6b3145513a273aa4fb', TEST='src/test/xiSelectionHistoryRace.test.tsx', SELF='scripts/qa/proveXiSelectionRace.mjs';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const git=args=>{const p=spawnSync('git',args,{cwd:ROOT,encoding:'utf8',timeout:30000,maxBuffer:64*1024*1024});assert(!p.error&&!p.signal&&p.status===0,'Actual Git read '+args.join(' '));return p.stdout;};
assert(!fs.existsSync(path.join(OUT,'report.json')),'Never overwrite evidence');fs.mkdirSync(OUT,{recursive:true});
const json=(name,value)=>fs.writeFileSync(path.join(OUT,name),JSON.stringify(value,null,2)+'\n');
const tracked=()=>Object.fromEntries(git(['ls-files','-z']).split('\0').filter(Boolean).sort().map(file=>[file,sha(fs.readFileSync(path.join(ROOT,file)))]));
const before=tracked(), HEAD=git(['rev-parse','HEAD']).trim();
const report={head:HEAD,base:BASE,phase:'baseline',scope:'actual-hook deferred-history reproduction only',sourceHeld:false,qualified:false};
const checkpoint=()=>json('report.json',report);
json('tracked.before.json',before);checkpoint();
const OWNED='history race missing: a late history cannot replace the latest enabled-picker selection';
const PRESERVED=[
 'history race preservation: a matching-primary club pick stays local and immediate',
 'history race preservation: valid history still admits the originally selected player',
 'history race preservation: refused history releases the picker for a valid retry',
 'history race preservation: an unverified nation pick releases the picker and retry can succeed',
 'history race preservation: reroll abandons a pending history without publishing into its new team',
 'history race preservation: reset abandons a pending history without repopulating the formation',
 'history race preservation: the existing next-door history wait stays busy and settles normally',
];
const KEYS=['overlap','primary','valid-history','refused-retry','unverified-retry','reroll','reset','next-door'];
const CAUSE='XI_SELECTION_RACE_OWNERSHIP: late history replaced the most recent pick accepted by the enabled picker';
try {
 assert.equal(git(['status','--porcelain','--untracked-files=no']),'','Committed clean source required');
 assert.equal(sha(fs.readFileSync(path.join(ROOT,TEST))),'f4695edf40dbd2017015219cab791156c133bb679f7e330de40aabf970a9549d','Frozen eight-case test bytes');
 for(const file of [TEST,SELF]) assert.equal(fs.readFileSync(path.join(ROOT,file),'utf8'),git(['show',HEAD+':'+file]),'Actual method belongs to this HEAD');
 git(['merge-base','--is-ancestor',BASE,HEAD]);
 git(['diff','--exit-code',BASE,HEAD,'--','src','scripts','public','package.json','package-lock.json','bun.lock','bun.lockb',':!'+TEST,':!'+SELF]);
 const bound=['src/hooks/useLineupBuilder.ts','src/pages/LineupBuilder.tsx','src/lib/positionFit.ts','src/lib/validatorClient.ts',TEST,SELF];
 report.sources=bound.map(file=>{const bytes=fs.readFileSync(path.join(ROOT,file)),target=path.join(OUT,'source',file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes);return{file,bytes:bytes.length,sha256:sha(bytes)};});
 report.frozenTestSha256=sha(fs.readFileSync(path.join(ROOT,TEST)));checkpoint();
 const unitFile=path.join(OUT,'units.json'),rawFile=path.join(OUT,'raw.json');
 const child=spawnSync(process.execPath,['node_modules/vitest/vitest.mjs','run',TEST,'--maxWorkers=1','--minWorkers=1','--reporter=verbose','--reporter=json','--outputFile.json='+unitFile],
 {cwd:ROOT,env:{...process.env,FORCE_COLOR:'0',NO_COLOR:'1',XI_RACE_RAW:rawFile},encoding:'utf8',timeout:180000,maxBuffer:64*1024*1024});
 const stdout=child.stdout||'',stderr=child.stderr||'';
 fs.writeFileSync(path.join(OUT,'stdout.log'),stdout);fs.writeFileSync(path.join(OUT,'stderr.log'),stderr);
 report.process={exit:child.status,signal:child.signal,error:child.error?.message||null,stdoutSha256:sha(stdout),stderrSha256:sha(stderr)};checkpoint();
 process.stdout.write(stdout);process.stderr.write(stderr);
 assert(!child.error&&!child.signal&&child.status!==null,'Actual runner must finish');
 assert(!/Unhandled Errors?|Unhandled Rejection|Uncaught Exception|TypeError:|ReferenceError:|SyntaxError:|Failed to (?:load|resolve import)|Cannot find module|ERR_MODULE_NOT_FOUND|SIM_OFFLINE_BLOCK/i.test(stdout+stderr),'Setup failures do not qualify');
 const units=JSON.parse(fs.readFileSync(unitFile));assert.equal(units.testResults.length,1);
 const file=units.testResults[0];assert(!file.message);assert(file.name.replaceAll('\\','/').endsWith('/'+TEST));
 const cases=file.assertionResults,failed=cases.filter(test=>test.status==='failed');
 assert.equal(cases.length,8);assert.deepEqual(cases.map(test=>test.title).sort(),[OWNED,...PRESERVED].sort());
 assert(cases.every(test=>['passed','failed'].includes(test.status)));
 assert.equal(units.numPendingTests,0);assert.equal(units.numTodoTests,0);assert.equal(units.numTotalTests,8);
 assert.equal(units.success,false);assert.equal(units.numPassedTests,7);assert.equal(units.numFailedTests,1);assert.equal(child.status,1);
 assert.deepEqual(failed.map(test=>test.title),[OWNED]);assert.equal(failed[0].failureMessages.length,1);
 assert(failed[0].failureMessages[0].startsWith('AssertionError: '+CAUSE)&&failed[0].failureMessages[0].includes('expected false to be true'),'Only the exact retained ownership Boolean failure qualifies');
 const bytes=fs.readFileSync(rawFile),raw=JSON.parse(bytes).observations;
 assert.deepEqual(Object.keys(raw).sort(),[...KEYS].sort());
 const owner=snapshot=>snapshot.hook.filledSlots.find(([index])=>index===9)?.[1].playerName;
 const overlap=raw.overlap;
 assert.equal(overlap.before.hook.currentTeam.name,'Real Madrid');assert.equal(overlap.before.hook.selectedPositionIndex,9);
 assert.equal(overlap.duringHistory.hook.isValidating,false);assert.equal(overlap.retryEnabled,true);
 assert.equal(owner(overlap.afterRetry),'Fixture Harbor Striker');
 assert.equal(owner(overlap.afterHistory),'Fixture Harbor Defender');
 assert.equal(overlap.expectedOwner,'Fixture Harbor Striker');
 assert.equal(overlap.afterRetry.hook.filledCount,1);assert.equal(overlap.afterHistory.hook.filledCount,1);
 assert.deepEqual(overlap.afterHistory.hook.filledSlots[0][1].pick.played,['ST']);
 assert.equal(raw['refused-retry'].refused.hook.filledCount,0);assert.equal(raw['refused-retry'].retryEnabled,true);
 assert.equal(owner(raw['refused-retry'].afterRetry),'Fixture Harbor Striker');
 assert.equal(raw['unverified-retry'].unverified.hook.filledCount,0);assert.equal(raw['unverified-retry'].retryEnabled,true);
 assert.equal(owner(raw['unverified-retry'].afterRetry),'Fixture Nation Striker');
 let snapshots=0;
 for(const [id,row] of Object.entries(raw)){
  for(const [key,value] of Object.entries(row)){
   if(!value||!Object.hasOwn(value,'hook'))continue;
   snapshots++;assert(Array.isArray(value.hook.filledSlots)&&Array.isArray(value.hook.filledSlotsArray)&&Array.isArray(value.draws)&&Array.isArray(value.trace),'Complete actual public state/draw/action trace');
   assert.deepEqual(value.stores,row.before.stores,'All actual fixture storage bytes held: '+id+'/'+key);
   assert(value.draws.every(draw=>draw===0.5));
   assert(value.trace.filter(action=>action.action==='actual transport request').every(action=>['history','validator'].includes(action.kind)),'No hidden transport fixture path');
  }
 }
 assert.equal(snapshots,28);
 for(const id of ['reroll','reset']){
  assert.deepEqual(raw[id].after.hook,raw[id].cancelled.hook);assert.deepEqual(raw[id].after.draws,raw[id].cancelled.draws);
 }
 report.completed=8;report.preciseFaults=1;report.preserved=7;report.raw={file:'raw.json',bytes:bytes.length,sha256:sha(bytes),cases:8,snapshots};
 report.baselineObserved={latestAccepted:'Fixture Harbor Striker',lateOverwrite:'Fixture Harbor Defender',filledCount:1,queryGateObservedEnabled:true};checkpoint();
} catch(error){report.error=error.stack||String(error);throw error;}
finally{
 const after=tracked();json('tracked.after.json',after);report.sourceHeld=JSON.stringify(after)===JSON.stringify(before);checkpoint();
 assert.deepEqual(after,before,'Every tracked app/test/helper/public/package file remains held');
}
report.qualified=true;checkpoint();
console.log('XI selection race baseline:8 actual hook cases;1 exact latest-selection overwrite fault;7 preserves;28 complete state/draw/storage snapshots;source held.');
console.log('Fictional transport and catalog assignment. No browser, physical Safari, live DB or fixed-product qualification.');
