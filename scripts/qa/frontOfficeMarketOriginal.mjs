import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync, execFileSync } from 'node:child_process';
const out=process.env.QA_OUT;
assert(out && !out.startsWith(process.cwd()+path.sep));
const target='src/components/front-office/FrontOfficeBoard.tsx';
assert.equal(execFileSync('git',['hash-object',target],{encoding:'utf8'}).trim(),'62894f3be7302ebf0ed71dbd7d4cb4ae2cfe2b33');
const cases=[
['NFL Front Office complete free agent market shows the complete sorted saved pool and explains opening or legacy ratings beyond the first 24','FO_MARKET_COMPLETE_POOL'],
['NFL Front Office complete free agent market signs a player beyond the first 24 through the unchanged model and reloads the complete saved result','FO_MARKET_TAIL_SIGN'],
['NFL Front Office complete free agent market preserves the existing head signing result and cap full roster and released player refusals',null]
];
const folder=path.join(out,'original'); fs.mkdirSync(folder,{recursive:true});
const receipt=path.join(folder,'transport.log'); fs.writeFileSync(receipt,'');
const raw=path.join(folder,'raw'); fs.mkdirSync(raw);
const p=spawnSync(process.execPath,['node_modules/vitest/vitest.mjs','run','src/test/frontOfficeMarketAccess.test.tsx','--maxWorkers=1','--no-file-parallelism','--reporter=default','--reporter=json','--outputFile='+path.join(folder,'units.json')],{encoding:'utf8',env:{...process.env,FO_MARKET_ACCESS_RAW:raw,SIM_OFFLINE_RECEIPT:receipt},timeout:120000,maxBuffer:16*1024*1024});
const log=(p.stdout||'')+'\n'+(p.stderr||''); fs.writeFileSync(path.join(folder,'units.log'),log);
assert(!p.error && !p.signal,'native worker completed');
assert.equal(p.status,1,'original native status'); assert.equal(fs.statSync(receipt).size,0);
assert(!/Unhandled\s+(?:Error|Rejection)|Vitest caught [1-9]|uncaughtException|unhandledRejection/i.test(log));
const j=JSON.parse(fs.readFileSync(path.join(folder,'units.json')));
assert.equal(j.testResults.length,1); assert.equal(j.numPendingTests,0);assert.equal(j.numTodoTests,0);
assert.equal(j.numFailedTests,2);assert.equal(j.numPassedTests,1);
const rows=j.testResults[0].assertionResults;assert.deepEqual(rows.map(x=>x.fullName).sort(),cases.map(x=>x[0]).sort());
for(const [name,marker] of cases){
 const row=rows.find(x=>x.fullName===name); assert.equal(row.status,marker?'failed':'passed');
 if(marker){const message=row.failureMessages.join('\n'); assert(message.includes('AssertionError')&&message.includes(marker),'owned original assertion '+marker);assert(!/TypeError|ReferenceError|SyntaxError/.test(message));}
}
assert.deepEqual(fs.readdirSync(raw).sort(),['complete-pool.json','legacy-guards.json','tail-sign.json']);
const complete=JSON.parse(fs.readFileSync(path.join(raw,'complete-pool.json')));
assert(complete.observations.observations.every(x=>x.ids.length===24 && !x.openingLegend && !x.legacyLegend),'actual original row and legend defect');
const tail=JSON.parse(fs.readFileSync(path.join(raw,'tail-sign.json')));
assert.equal(tail.observations.actual.rowPresent,false); assert.equal(tail.observations.reference.accepted,true);
assert.equal(tail.observations.actual.bytes,tail.observations.initialBytes);
fs.writeFileSync(path.join(out,'admission.json'),JSON.stringify({status:'qualified-original',scope:'Test-first original board only. No fixed, build, browser or publication claim.',base:'a4d6eaa2cb0d57b8bcbb301fd35f757b60bf0a41',boardBlob:'62894f3be7302ebf0ed71dbd7d4cb4ae2cfe2b33',nativeStatus:p.status,ownedFailures:2,heldPasses:1,cases:rows.map(x=>({name:x.fullName,status:x.status}))},null,2)+'\n');
console.log('Front Office original: 2 owned AssertionErrors, 1 held compatibility pass; complete RAW emitted.');
