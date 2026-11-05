import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
assert(process.env.CI, 'Remote qualification only');
const FILE='src/hooks/useCareerGame.ts', TEST='src/test/careerSearchFairness.test.tsx', OUT='reveal-review-artifacts/fair-arms';
fs.mkdirSync(OUT,{recursive:true});
const source=fs.readFileSync(FILE,'utf8'), sha=value=>createHash('sha256').update(value).digest('hex'), rows=[];
function replaceOnce(from,to) {
  assert.equal(source.split(from).length,2,'Effective unique hook fault: '+from);
  const changed=source.replace(from,to); assert.notEqual(sha(changed),sha(source)); return changed;
}
function run(name,text,expected) {
  const dir=path.join(OUT,name); fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(FILE,text); fs.writeFileSync(path.join(dir,'useCareerGame.ts'),text);
  const outfile=path.join(dir,'units.json');
  const child=spawnSync(process.execPath,['node_modules/vitest/vitest.mjs','run',TEST,'--maxWorkers=1','--minWorkers=1','--reporter=default','--reporter=json','--outputFile='+outfile],{encoding:'utf8',maxBuffer:24*1024*1024,timeout:150000,env:process.env});
  fs.writeFileSync(path.join(dir,'stdout.log'),child.stdout||''); fs.writeFileSync(path.join(dir,'stderr.log'),child.stderr||'');
  assert(fs.existsSync(outfile),name+': actual report exists');
  const report=JSON.parse(fs.readFileSync(outfile,'utf8')), cases=report.testResults.flatMap(s=>s.assertionResults),failed=cases.filter(x=>x.status==='failed');
  rows.push({name,sourceSHA256:sha(text),status:child.status,cases}); fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(rows,null,2));
  assert.equal(report.numTotalTests,8); assert.equal(cases.length,8); assert.equal(cases.filter(x=>!['passed','failed'].includes(x.status)).length,0);
  assert(!/Unhandled Errors|Unhandled Rejection|Uncaught Exception|Failed to resolve import/.test((child.stdout||'')+(child.stderr||'')),name+': no runtime banners');
  assert.equal(child.status,expected.length?1:0); assert.deepEqual(failed.map(x=>x.title.split(' ')[0]),expected,name+': exact business failures');
  for(const c of failed) assert(c.failureMessages.every(m=>/^AssertionError: CAREER_SEARCH_/m.test(m.replace(/\u001b\[[0-?]*[ -/]*[@-~]/g,''))),name+': only named public-order assertions');
  for(const id of ['CAREER_SEARCH_PROGRESS','CAREER_SEARCH_DAILY','CAREER_SEARCH_SAME_EMPTY','CAREER_SEARCH_DRAWS']) assert.equal(cases.find(x=>x.title.startsWith(id+' '))?.status,'passed',name+': preservation '+id);
  console.log(name+': '+(cases.length-failed.length)+' passed, '+failed.length+' exact business failures');
}
try {
  run('fixed',source,[]);
  const union='return buildCareerPool(difficulty, fallbackPlayers).reduce(\n      (options, player) => ensureAnswerInOptions(options, player.name),\n      names,\n    );';
  const four=['CAREER_SEARCH_NORMAL','CAREER_SEARCH_EASY','CAREER_SEARCH_HARD','CAREER_SEARCH_SMALL'];
  const controls=[
    ['target-specific-append',union,'return ensureAnswerInOptions(names, targetPlayer.name);',four],
    ['omit-fallback-cohort',union,'return names;',four],
    ['unfiltered-fallback','buildCareerPool(difficulty, fallbackPlayers).reduce(','fallbackPlayers.reduce(',['CAREER_SEARCH_EASY','CAREER_SEARCH_HARD']],
    ['raw-name-dedup','ensureAnswerInOptions(options, player.name)','options.includes(player.name) ? options : [...options, player.name]',['CAREER_SEARCH_SMALL']],
    ['reverse-fallback-order','buildCareerPool(difficulty, fallbackPlayers).reduce(','buildCareerPool(difficulty, fallbackPlayers).slice().reverse().reduce(',four],
  ];
  for(const [name,from,to,expected] of controls)run(name,replaceOnce(from,to),expected);
  run('restored',source,[]);
} finally {
  fs.writeFileSync(FILE,source); assert.equal(sha(fs.readFileSync(FILE)),sha(source),'Hook restored exactly');
}
