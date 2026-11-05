import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { spawnSync, execFileSync } from 'node:child_process';
const source='src/pages/MissingXi.tsx', test='src/test/missingXiLineupView.test.tsx';
const out='missing-xi-artifacts/arms', held=fs.readFileSync(source), names=["offers two native pressed-state view buttons and starts on the existing pitch","shows eleven ordered positions and ten complete names with a named blank while keeping the answer out of both views","keeps the selected guess puzzle daily log and completion count unchanged while repeatedly switching views","reveals the correct eleventh full name after the real winning guess and preserves the finished daily across reload and view switches"];
const hash=b=>crypto.createHash('sha256').update(b).digest('hex'), arms=[], mutations=[];
assert(!fs.existsSync(out),'fresh proof directory');fs.mkdirSync(out,{recursive:true});
function restore(){fs.writeFileSync(source,held);}
function run(name,expected){
 const dir=path.join(out,name);fs.mkdirSync(dir,{recursive:true});fs.copyFileSync(source,path.join(dir,'MissingXi.tsx'));
 const before=fs.readFileSync(source), child=spawnSync(process.execPath,['node_modules/vitest/vitest.mjs','run',test,'--maxWorkers=1','--minWorkers=1','--reporter=default','--reporter=json','--outputFile='+path.join(dir,'report.json')],{encoding:'utf8',maxBuffer:16*1024*1024,timeout:180000,env:process.env});
 fs.writeFileSync(path.join(dir,'stdout.log'),child.stdout??'');fs.writeFileSync(path.join(dir,'stderr.log'),child.stderr??'');
 assert.equal(child.error,undefined,name+' process completed');assert(fs.readFileSync(source).equals(before),name+' source held');
 const report=JSON.parse(fs.readFileSync(path.join(dir,'report.json'))),rows=report.testResults.flatMap(s=>s.assertionResults),failed=rows.filter(r=>r.status==='failed');
 assert.equal(rows.length,4);assert(rows.every(r=>['passed','failed'].includes(r.status)),name+' no skipped cases');
 assert.deepEqual(failed.map(r=>r.title).sort(),expected.map(i=>names[i]).sort(),name+' exact business failures');
 assert(failed.every(r=>r.failureMessages.join(' ').includes('AssertionError')),name+' no setup errors');
 assert.equal(child.status,expected.length?1:0);
 const row={name,sourceSha256:hash(before),passed:rows.length-failed.length,failed:failed.map(r=>({title:r.title,messages:r.failureMessages}))};
 arms.push(row);fs.writeFileSync(path.join(dir,'summary.json'),JSON.stringify(row,null,2)+'\n');console.log(name+': '+row.passed+' passed, '+failed.length+' exact failures');
}
function change(name,from,to,expected){
 restore();const body=fs.readFileSync(source,'utf8');assert.equal(body.split(from).length,2,name+' one executable anchor');
 const changed=body.replace(from,to);assert.notEqual(changed,body,name+' physical source changed');fs.writeFileSync(source,changed);
 mutations.push({name,from,to,before:hash(body),after:hash(changed)});run(name,expected);restore();
}
try{
 run('fixed',[]);
 fs.writeFileSync(source,execFileSync('git',['show','1acb33005073be70ba5aae0285ece5537f390f9a:'+source]));run('original',[0,1,2,3]);restore();
 change('wrong-view-label','role="group" aria-label="Lineup view"','role="group" aria-label="Other view"',[0]);
 change('omit-list',"{view === 'lineup' ? (","{false && view === 'lineup' ? (",[1,2,3]);
 change('leak-answer',"{isBlank ? (revealed ? candidate.name : 'Missing player') : slot.name}","{isBlank ? candidate.name : slot.name}",[1]);
 change('write-on-toggle','onClick={() => setView(next)}',"onClick={() => { setView(next); localStorage.setItem('lineup-unrelated', 'changed'); }}",[2]);
 change('omit-reveal',"{isBlank ? (revealed ? candidate.name : 'Missing player') : slot.name}","{isBlank ? 'Missing player' : slot.name}",[3]);
 run('restored',[]);assert.equal(arms[0].sourceSha256,arms.at(-1).sourceSha256);
 fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify({passed:true,arms,mutations},null,2)+'\n');
}finally{restore();assert(fs.readFileSync(source).equals(held),'full source restoration');}
