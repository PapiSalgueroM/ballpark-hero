import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';

assert.equal(process.env.CI,'1','Remote baseline only');
const ROOT=process.cwd(),OUT=path.resolve(process.env.CM_RECRUITMENT_OUT||'cm-recruitment-baseline-artifacts');
const BASE='14ec28b1cbc82b1abcdf14244dec7acae25d1507',BRANCH='codex/cm-recruitment-shortlist-baseline-20261028';
const TEST='src/test/clubManagerRecruitmentBaseline.test.tsx';
const allowed=[TEST,'scripts/qa/cmRecruitmentBaseline.mjs','.github/workflows/cm-recruitment-shortlist-baseline.yml'].sort();
const pins={
  "src/components/club-manager/LoanPlanCard.tsx": "b7b713399752fd97a5b27174108f2488d85bd037",
  "src/components/club-manager/TransferScreen.tsx": "298bdd722e4baa0bf5c4a52d611570d0ac066534",
  "src/hooks/useClubManager.ts": "82f4f4fe9044901c968a796b728068b0191f8fdf",
  "src/lib/clubManager.ts": "a505743537b383bc7885bb81f5a72c11e154b566",
  "src/lib/clubManagerDeals.ts": "6e62966e4950ac6e2fa0577f45d21527b9266ce6",
  "src/lib/clubManagerLoanDevelopment.ts": "98265b3e10752b671127c1b23d6725d83d28e47b",
  "src/lib/clubManagerLoanPlan.ts": "419b68389dad53c297d1a225611a653c0ed83b30",
  "src/pages/ClubManager.tsx": "0ac89439990e4c028860aa61965d93d40c308f75",
  "src/test/clubManagerRecruitmentBaseline.test.tsx": "23fbabdbf6164fa16ce3b7a806ec749a63949561"
};
const expected=[
  [
    "adds a current Buy row without starting talks or changing any old career field",
    "CM_RECRUITMENT_SAVE_MISSING"
  ],
  [
    "opens an empty shortlist while the transfer window is shut without writing",
    "CM_RECRUITMENT_CLOSED_OPENER_MISSING"
  ],
  [
    "reopens a saved identity using the current record and leaves saved bytes unchanged",
    "CM_RECRUITMENT_SAVED_OPENER_MISSING"
  ],
  [
    "does not present a same-club target copied from another era as current or repair it on read",
    "CM_RECRUITMENT_FOREIGN_OPENER_MISSING"
  ],
  [
    "preserves the ordinary Talk callback with the exact existing current player object",
    null
  ],
  [
    "ordinary rendering and a no-match search preserve input bytes and consume no random draws",
    null
  ]
];
const sha=body=>createHash('sha256').update(body).digest('hex');
const git=body=>createHash('sha1').update('blob '+body.length+'\0').update(body).digest('hex');
const plain=text=>String(text).replace(/\u001b\[[0-?]*[ -/]*[@-~]/g,'');
fs.mkdirSync(OUT,{recursive:true});
const write=(name,value)=>fs.writeFileSync(path.join(OUT,name),JSON.stringify(value,null,2)+'\n');
const read=file=>fs.readFileSync(path.join(ROOT,file));
const before=Object.fromEntries(Object.keys(pins).map(file=>[file,sha(read(file))]));
for(const [file,pin]of Object.entries(pins))assert.equal(git(read(file)),pin,'Exact baseline source '+file);
assert.equal(before[TEST],'221815aef3f0d385205c8d5cbf014dc25f84dd3b2d2c1f23f46d990aa514ed46','Frozen six-case test');
assert.equal(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),process.env.GITHUB_SHA);
assert.equal(execFileSync('git',['rev-parse','HEAD^'],{encoding:'utf8'}).trim(),BASE,'One atomic child of qualified PR416');
assert.equal(process.env.GITHUB_REF_NAME,BRANCH);
const changed=execFileSync('git',['diff','--name-status',BASE,'HEAD'],{encoding:'utf8'}).trim().split('\n').filter(Boolean);
assert.deepEqual(changed.map(row=>{assert(row.startsWith('A\t'),'Only new QA paths');return row.slice(2);}).sort(),allowed);
write('selected-source-pins.json',{base:BASE,branch:BRANCH,pins,sha256:before,changed});
function admit(result,log){
  const cli=plain(log);
  assert(Array.isArray(result.testResults)&&result.testResults.length===1,'One actual collected test file');
  const suite=result.testResults[0];
  assert.equal(suite.name.replaceAll('\\','/').endsWith('/'+TEST),true,'Actual target file');
  assert.equal(typeof suite.message,'string','Actual suite diagnostic field');
  assert.equal(suite.message,'','Suite diagnostics must be empty');
  assert(!/Failed Suites|Unhandled Errors|Vitest caught\s+\d+\s+unhandled|UnhandledRejection|UncaughtException|^\s*Errors\s+\d+\s+errors?/mi.test(cli),'CLI infrastructure diagnostics');
  assert.equal(result.numTotalTests,6);assert.equal(result.numPassedTests,2);assert.equal(result.numFailedTests,4);assert.equal(result.numPendingTests,0);assert.equal(result.numTodoTests,0);assert.equal(result.success,false);
  const rows=suite.assertionResults;
  assert.equal(rows.length,6);assert.equal(new Set(rows.map(row=>row.fullName)).size,6);
  const prefix='Club Manager recruitment shortlist first behavior baseline ';
  assert.deepEqual(rows.map(row=>row.fullName).sort(),expected.map(([title])=>prefix+title).sort(),'Exact six identities');
  for(const [title,marker]of expected){
    const row=rows.find(row=>row.fullName===prefix+title);
    assert.equal(row.status,marker?'failed':'passed','Exact expected status '+title);
    assert(Array.isArray(row.failureMessages),'Actual failure messages');
    if(marker){
      assert(row.failureMessages.length>0,'Intended assertion has a message');
      for(const raw of row.failureMessages){
        const message=plain(raw);
        assert(message.includes(marker),'Exact missing-feature marker '+marker);
        assert(/AssertionError|Error:\s*expect\(/.test(message)&&!/Cannot find module|Failed to resolve|ReferenceError|TypeError|timed out|Invalid Chai property|Invariant violation/i.test(message),'Intended assertion only');
      }
    }else assert.equal(row.failureMessages.length,0);
  }
  assert(/^\s*Test Files\s+1 failed\s+\(1\)\s*$/m.test(cli),'Complete actual Test Files closing');
  assert(/^\s*Tests\s+4 failed\s*\|\s*2 passed\s+\(6\)\s*$/m.test(cli),'Complete actual Tests closing');
  assert(cli.includes('JSON report written to '+path.join(OUT,'baseline.json')),'JSON-written closing');
  return{total:6,failed:4,passed:2,skipped:0,missingMarkers:expected.filter(([,marker])=>marker).map(([,marker])=>marker)};
}
if((process.argv[2]||'run')==='run'){
  const report=path.join(OUT,'baseline.json'),log=path.join(OUT,'baseline.log');
  const fd=fs.openSync(log,'w');let child;
  try{child=spawnSync(process.execPath,['node_modules/vitest/vitest.mjs','run',TEST,'--maxWorkers=1','--minWorkers=1','--reporter=verbose','--reporter=json','--outputFile.json='+report],{cwd:ROOT,env:{...process.env},stdio:['ignore',fd,fd],timeout:180_000});}finally{fs.closeSync(fd);}
  write('process.json',{status:child.status,signal:child.signal,error:child.error?String(child.error):null});
  assert.ifError(child.error);assert.equal(child.signal,null);assert.equal(child.status,1,'Expected assertion-failure process only');
  const raw=fs.readFileSync(report),logRaw=fs.readFileSync(log),result=JSON.parse(raw),text=logRaw.toString('utf8');
  const actual=admit(result,text),controls=[];
  for(const kind of ['suite-message','unhandled-cli','method-error']){
    const copy=JSON.parse(raw);let copiedLog=text,expectedError;
    if(kind==='suite-message'){copy.testResults[0].message='Copied QA collection diagnostic';expectedError=/Suite diagnostics/;}
    if(kind==='unhandled-cli'){copiedLog+='\nUnhandled Errors\n';expectedError=/CLI infrastructure/;}
    if(kind==='method-error'){const target=copy.testResults[0].assertionResults.find(row=>row.status==='failed');target.failureMessages=['AssertionError: TypeError: copied QA method failure '+expected[0][1]];expectedError=/Intended assertion only/;}
    const changed=Buffer.from(JSON.stringify(copy));
    assert(sha(changed)!==sha(raw)||sha(copiedLog)!==sha(text),'Copied diagnostic changed bytes');
    write('copied-'+kind+'.json',copy);fs.writeFileSync(path.join(OUT,'copied-'+kind+'.log'),copiedLog);
    assert.throws(()=>admit(copy,copiedLog),expectedError,'Copied diagnostic rejected');
    assert.deepEqual(admit(JSON.parse(raw),text),actual,'Original full record restored after copied diagnostic');
    controls.push({kind,copiedObservation:true,changed:true,rejected:true,originalRestored:true});
  }
  assert.equal(sha(read(path.relative(ROOT,report))),sha(raw),'Original JSON held');
  assert.equal(sha(fs.readFileSync(log)),sha(logRaw),'Original CLI held');
  write('BASELINE-ADMISSION.json',{status:'QUALIFIED_MISSING_FEATURE_RED',...actual,processStatus:child.status,copiedDiagnosticControls:controls,sourceParent:BASE,scope:'Old actual TransferScreen with qualified Loan416 held. Four missing-feature assertions and two independent preservation passes. No product authored.'});
  console.log('PASS baseline:6collected,4precise missing-feature assertion failures,2preservation passes,0skips,3changed copied diagnostic refusals/restores');
}
const after=Object.fromEntries(Object.keys(pins).map(file=>[file,sha(read(file))]));
assert.deepEqual(after,before,'All critical baseline and test bodies held');write('source-held.json',{before,after});
