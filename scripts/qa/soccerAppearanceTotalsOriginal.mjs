import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import assert from 'node:assert/strict';import {spawnSync,execFileSync} from 'node:child_process';
const engine='src/lib/soccerCareerEngine.ts',test='src/test/soccerClubAppearanceTotals.test.ts',out='integration-artifacts/appearance-original',held=fs.readFileSync(engine),sha=b=>crypto.createHash('sha256').update(b).digest('hex'),arms=[];
fs.mkdirSync(out,{recursive:true});
function run(name,expected){
 const dir=path.join(out,name);fs.mkdirSync(dir,{recursive:true});const before=fs.readFileSync(engine);fs.writeFileSync(path.join(dir,'soccerCareerEngine.ts'),before);
 const child=spawnSync(process.execPath,['node_modules/vitest/vitest.mjs','run',test,'--maxWorkers=1','--minWorkers=1','--reporter=default','--reporter=json','--outputFile='+path.join(dir,'report.json')],{encoding:'utf8',maxBuffer:16*1024*1024,timeout:180000,env:{...process.env,SC_CLUB_TOTALS_RAW:path.join(dir,'raw')}});
 fs.writeFileSync(path.join(dir,'stdout.log'),child.stdout??'');fs.writeFileSync(path.join(dir,'stderr.log'),child.stderr??'');assert.equal(child.error,undefined);assert(fs.readFileSync(engine).equals(before));
 const report=JSON.parse(fs.readFileSync(path.join(dir,'report.json'))),rows=report.testResults.flatMap(r=>r.assertionResults),failed=rows.filter(r=>r.status==='failed');
 assert.equal(rows.length,1);assert(rows.every(r=>['passed','failed'].includes(r.status)));assert.equal(failed.length,expected);assert.equal(child.status,expected?1:0);
 if(expected)assert(failed[0].failureMessages.join(' ').includes('SC_CLUB_TOTALS_WITHIN_ALL_APPS')&&failed[0].failureMessages.join(' ').includes('AssertionError'));
 const raw=fs.readFileSync(path.join(dir,'raw','appearance-total-invariant.json'));JSON.parse(raw);arms.push({name,sourceSha256:sha(before),passed:1-failed.length,failed:failed.map(r=>({title:r.title,messages:r.failureMessages})),rawSha256:sha(raw),rawBytes:raw.length});console.log(name+': '+(1-failed.length)+' passed, '+failed.length+' expected business failure');
}
try{fs.writeFileSync(engine,execFileSync('git',['show','5689ab28b63a754430926479477db5d0d49502b5:'+engine]));run('pre-policy',0);fs.writeFileSync(engine,held);run('uncapped-policy',1);assert.notEqual(arms[0].rawSha256,arms[1].rawSha256);fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify({passed:true,arms},null,2)+'\n');}finally{fs.writeFileSync(engine,held);assert(fs.readFileSync(engine).equals(held));}
