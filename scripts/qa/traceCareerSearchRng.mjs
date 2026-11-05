import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
assert(process.env.CI, 'Remote diagnostics only');
const FILE='src/hooks/useCareerGame.ts',OUT='fair-search-rng-diagnostic',TEST='src/test/careerSearchFairness.test.tsx';
fs.mkdirSync(OUT,{recursive:true});
const fixed=fs.readFileSync(FILE,'utf8'), original=execFileSync('git',['show','271e8af48b87ac36500c56138b81595b00d50775:'+FILE],{encoding:'utf8'});
const sha=v=>createHash('sha256').update(v).digest('hex'), rows=[];
try {
  for(const [name,body] of [['fixed',fixed],['original',original],['restored',fixed]]) {
    fs.writeFileSync(FILE,body); const dir=path.join(OUT,name); fs.mkdirSync(dir,{recursive:true});
    fs.writeFileSync(path.join(dir,'useCareerGame.ts'),body);
    const child=spawnSync(process.execPath,['node_modules/vitest/vitest.mjs','run',TEST,'--testNamePattern=CAREER_SEARCH_NORMAL','--maxWorkers=1','--minWorkers=1','--reporter=default','--reporter=json','--outputFile='+path.join(dir,'units.json')],{encoding:'utf8',maxBuffer:24*1024*1024,timeout:150000,env:process.env});
    fs.writeFileSync(path.join(dir,'stdout.log'),child.stdout||''); fs.writeFileSync(path.join(dir,'stderr.log'),child.stderr||'');
    assert(fs.existsSync(path.join(dir,'units.json')),'Actual report for '+name);
    rows.push({name,sourceSHA256:sha(body),status:child.status});
    console.log(name+': actual child exit '+child.status);
  }
} finally {
  fs.writeFileSync(FILE,fixed); assert.equal(sha(fs.readFileSync(FILE)),sha(fixed));
  fs.writeFileSync(path.join(OUT,'report.json'),JSON.stringify(rows,null,2));
}
