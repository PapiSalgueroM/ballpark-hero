import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync, execFileSync } from 'node:child_process';

const out=path.resolve(process.argv[2]||'');
assert(process.argv[2], 'Pass an evidence directory outside the working tree');
assert(!out.startsWith(process.cwd()+path.sep), 'Evidence must stay outside the source tree');
fs.mkdirSync(out,{recursive:true});
const testFiles=["src/test/usCareerFreePractice.test.tsx","src/test/frontOfficeDraftAccess.test.tsx","src/test/tycoonPayrollBatch.test.tsx","src/test/hubGamePicks.test.tsx","src/test/soccerOfferNegotiationTarget.test.tsx","src/test/clubManagerTrainingExposure.test.ts"];
const expected=[{"fullName":"US free practice after banking NBA repeats a banked drill without another reward or save","status":"failed","marker":"US_FREE_PRACTICE_NBA_REPEAT"},{"fullName":"US free practice after banking NFL repeats a banked drill without another reward or save","status":"failed","marker":"US_FREE_PRACTICE_NFL_REPEAT"},{"fullName":"US free practice after banking NBA reopens all four free drills with private randomness and unchanged career bytes","status":"failed","marker":"US_FREE_PRACTICE_NBA_ALL_DRILLS"},{"fullName":"US free practice after banking NFL reopens all four free drills with private randomness and unchanged career bytes","status":"failed","marker":"US_FREE_PRACTICE_NFL_ALL_DRILLS"},{"fullName":"US free practice after banking MLB keeps the existing post-bank lock without writes or random draws","status":"passed","marker":null},{"fullName":"US free practice after banking NHL keeps the existing post-bank lock without writes or random draws","status":"passed","marker":null},{"fullName":"NFL draft prospect access reaches all forty prospects through eighteen-row pages without changing the draft","status":"failed","marker":"FO_DRAFT_PROSPECT_ALL_PAGES"},{"fullName":"NFL draft prospect access drafts a filtered prospect beyond the first page and preserves exact rival picks and draws","status":"failed","marker":"FO_DRAFT_PROSPECT_POSITION_ACCESS"},{"fullName":"NFL draft prospect access resets a later page when the position changes and keeps empty groups safe","status":"failed","marker":"FO_DRAFT_PROSPECT_EMPTY_POSITION"},{"fullName":"NFL draft prospect access holds the scouting directors grades and order without exposing true ratings","status":"passed","marker":null},{"fullName":"Stadium payroll batches holds one hire, unrelated fields, input and global draws","status":"passed","marker":null},{"fullName":"Stadium payroll batches buys five steward levels at their existing escalating prices","status":"failed","marker":"PAYROLL_FIVE_REAL_HIRES"},{"fullName":"Stadium payroll batches buys only three affordable steward levels from341","status":"failed","marker":"PAYROLL_AFFORDABLE_HIRES"},{"fullName":"Stadium payroll batches holds the existing staff cap and exact unaffordable no-ops","status":"passed","marker":null},{"fullName":"Stadium payroll batches quotes, hires and persists the affordable payroll batch from1000","status":"failed","marker":"PAYROLL_REAL_PAGE_CONTROL"},{"fullName":"Stadium payroll batches quotes, hires and persists the affordable payroll batch from341","status":"failed","marker":"PAYROLL_REAL_PAGE_CONTROL"},{"fullName":"Sport hub picks and Home pins from /soccer and restores the exact Home destination","status":"failed","marker":"HUB_PICK_BUTTON"},{"fullName":"Sport hub picks and Home pins from /pro-basketball and restores the exact Home destination","status":"failed","marker":"HUB_PICK_BUTTON"},{"fullName":"Sport hub picks and Home pins from /pro-football and restores the exact Home destination","status":"failed","marker":"HUB_PICK_BUTTON"},{"fullName":"Sport hub picks and Home unpins only the selected hub game and keeps the existing Home pick","status":"failed","marker":"HUB_UNPIN_CONTROL"},{"fullName":"Sport hub picks and Home uses the existing honest this-visit warning when a hub pin cannot be saved","status":"failed","marker":"HUB_PICK_FAILED_STORAGE_CONTROL"},{"fullName":"Soccer selected offer negotiation selects offer B in the real plans screen, counters it, signs and reloads its exact wage","status":"failed","marker":"SC_OFFER_TARGET_UI_B"},{"fullName":"Soccer selected offer negotiation shortens the selected pending offer and retains the real agent wage and fee transforms","status":"failed","marker":"SC_OFFER_TARGET_SHORTER_B"},{"fullName":"Soccer selected offer negotiation counters an expiry offer before applying the existing quoted loyalty contract and codec","status":"failed","marker":"SC_OFFER_TARGET_LOYALTY_B"},{"fullName":"Soccer selected offer negotiation records a rejected B attempt once while preserving both offers and leaving A available","status":"failed","marker":"SC_OFFER_TARGET_REJECT_B"},{"fullName":"Soccer selected offer negotiation refuses stale, outside, loan and invalid explicit targets without touching the current first offer","status":"failed","marker":"SC_OFFER_TARGET_REFUSAL"},{"fullName":"Soccer selected offer negotiation preserves omitted-target first-offer behavior through signing and the existing save codec","status":"passed","marker":null},{"fullName":"Club Manager recorded training exposure records the charged policy once per player and never charges a skipped night","status":"failed","marker":"CM_TRAINING_CHARGED_POLICY"},{"fullName":"Club Manager recorded training exposure uses the charged season instead of a last-week switch at the real summer rollover","status":"failed","marker":"CM_TRAINING_LATE_FLIP_SUMMER"},{"fullName":"Club Manager recorded training exposure preserves all nine constant-plan annual states and complete random tapes","status":"passed","marker":null},{"fullName":"Club Manager recorded training exposure applies the literal mixed-policy mean while keeping the current-plan forecast unchanged","status":"failed","marker":"CM_TRAINING_MIXED_MEAN"},{"fullName":"Club Manager recorded training exposure keeps observations through real save/load and starts the next season with no inherited weeks","status":"failed","marker":"CM_TRAINING_RELOAD_ROLLOVER"},{"fullName":"Club Manager recorded training exposure starts new signings and incoming loans at their own first charged week","status":"failed","marker":"CM_TRAINING_PLAYER_OWNERSHIP"},{"fullName":"Club Manager recorded training exposure freezes a loaned-out player while absent and resumes only his own count on recall","status":"failed","marker":"CM_TRAINING_LOAN_ABSENCE"},{"fullName":"Club Manager recorded training exposure does not carry a previous employer or previous season into a new charged week","status":"failed","marker":"CM_TRAINING_SCOPE_RESET"},{"fullName":"Club Manager recorded training exposure keeps missing, empty and unsupported history readable with no invented past observations","status":"passed","marker":null}];
const products=[
  'src/lib/soccerCareerProgramme.ts',
  'src/components/soccer-career/SoccerCareerProgramme.tsx',
  'src/lib/clubManager.ts',
  'src/components/club-manager/TrainingScreen.tsx',
  'src/components/us-career/UsCareerPractice.tsx',
  'src/components/career/TrainingGround.tsx',
  'src/components/career/drills/ZonePickDrill.tsx',
  'src/components/career/drills/GateTapDrill.tsx',
  'src/components/front-office/FrontOfficeBoard.tsx',
  'src/lib/stadiumTycoon.ts',
  'src/hooks/useStadiumTycoon.ts',
  'src/pages/StadiumTycoon.tsx',
  'src/components/hub/HubExperience.tsx',
  'src/components/hub/HubExperience.module.css',
];
const git=(...args)=>execFileSync('git',args,{maxBuffer:8*1024*1024});
const sha=b=>createHash('sha256').update(b).digest('hex');
const fixed=new Map(products.map(p=>[p,fs.readFileSync(p)]));
const originals=new Map(products.map(p=>[p,git('show','978e9f7081a36c6ab105adf92d7696b715e6122d:'+p)]));
for(const p of products)assert(!fixed.get(p).equals(originals.get(p)),'Negative control must change '+p);
const bindings=products.map(p=>({path:p,fixedSha256:sha(fixed.get(p)),originalSha256:sha(originals.get(p))}));
fs.writeFileSync(path.join(out,'product-bindings.json'),JSON.stringify(bindings,null,2)+'\n');
function run(name,old){
  const dir=path.join(out,name);fs.mkdirSync(dir,{recursive:true});
  const raw=path.join(dir,'raw');for(const key of ['sc','cm','us','fo','payroll','hub'])fs.mkdirSync(path.join(raw,key),{recursive:true});
  const receipt=path.join(dir,'transport.log');fs.writeFileSync(receipt,'');
  const p=spawnSync(process.execPath,['node_modules/vitest/vitest.mjs','run',...testFiles,'--maxWorkers=1','--no-file-parallelism','--reporter=default','--reporter=json','--outputFile='+path.join(dir,'units.json')],{
    env:{...process.env,SIM_OFFLINE_RECEIPT:receipt,SC_OFFER_NEGOTIATION_RAW:path.join(raw,'sc'),CM_TRAINING_EXPOSURE_RAW:path.join(raw,'cm'),US_FREE_PRACTICE_RAW:path.join(raw,'us'),FO_DRAFT_PROSPECT_RAW:path.join(raw,'fo'),TYCOON_PAYROLL_RAW:path.join(raw,'payroll'),HUB_GAME_PICKS_RAW:path.join(raw,'hub')},
    encoding:'utf8',timeout:900000,maxBuffer:32*1024*1024});
  const log=(p.stdout||'')+'\n'+(p.stderr||'');
  fs.writeFileSync(path.join(dir,'units.log'),log);
  fs.writeFileSync(path.join(dir,'native-exit.json'),JSON.stringify({status:p.status,signal:p.signal,error:p.error?String(p.error):null})+'\n');
  assert(!p.error&&p.signal===null,name+' native completion');
  assert.equal(p.status,old?1:0,name+' native status');assert.equal(fs.statSync(receipt).size,0);
  assert(!/Unhandled\s+(?:Error|Rejection)|Vitest caught [1-9]|uncaughtException|unhandledRejection/i.test(log),name+' runtime errors');
  const j=JSON.parse(fs.readFileSync(path.join(dir,'units.json'))),rows=j.testResults.flatMap(r=>r.assertionResults);
  assert.deepEqual([j.numTotalTests,j.numPassedTests,j.numFailedTests,j.numPendingTests,j.numTodoTests],[36,old?8:36,old?28:0,0,0],name+' full census');
  assert.equal(j.testResults.length,6);assert.equal(rows.length,36);
  assert.deepEqual(rows.map(r=>r.fullName).sort(),expected.map(r=>r.fullName).sort());
  for(const r of rows){
    const e=expected.find(e=>e.fullName===r.fullName);assert.equal(r.status,old?e.status:'passed',r.fullName);
    if(old&&e.status==='failed'){
      const m=r.failureMessages.join('\n');assert(m.includes('AssertionError')&&m.includes(e.marker),r.fullName);
      assert(!/TypeError|SyntaxError|ReferenceError|Cannot find module|is not a function/.test(m),r.fullName);
    }
  }
  const census={sc:6,cm:9,us:6,fo:4,payroll:old?6:8,hub:old?5:8};
  const raws={};for(const[key,n]of Object.entries(census)){
    const files=fs.readdirSync(path.join(raw,key)).sort();assert.equal(files.length,n,key);
    raws[key]={};for(const file of files){const bytes=fs.readFileSync(path.join(raw,key,file));JSON.parse(bytes);raws[key][file]=sha(bytes);}
  }
  const admission={name,status:old?'expected-owned-red':'all-fixed-pass',nativeExit:p.status,total:36,passed:j.numPassedTests,failed:j.numFailedTests,runtimeErrors:j.numRuntimeErrors??'UNKNOWN',raw:raws};
  fs.writeFileSync(path.join(dir,'admission.json'),JSON.stringify(admission,null,2)+'\n');return admission;
}
const heldBefore=git('status','--porcelain=v1','--untracked-files=all').toString();
assert.equal(heldBefore,'','Clean starting source');
let first,control,restored;
try{
  first=run('fixed',false);
  for(const p of products)fs.writeFileSync(p,originals.get(p));
  for(const p of products)assert(fs.readFileSync(p).equals(originals.get(p)),p+' original installed');
  control=run('whole-original',true);
}finally{
  for(const p of products)fs.writeFileSync(p,fixed.get(p));
  for(const p of products)assert(fs.readFileSync(p).equals(fixed.get(p)),p+' fixed restored');
}
restored=run('restored',false);
assert.deepEqual(first.raw,restored.raw,'Every deterministic raw outcome restored exactly');
assert.equal(git('status','--porcelain=v1','--untracked-files=all').toString(),heldBefore);
git('diff','--exit-code','HEAD');
fs.writeFileSync(path.join(out,'admission.json'),JSON.stringify({status:'qualified',cases:36,fixedPassed:36,originalOwnedFailures:28,originalHeldPasses:8,restoredPassed:36,physicalChangedProducts:products.length,rawRestoredExactly:true,limits:'Outcome controls only. No full fleet, build, browser or public claim.'},null,2)+'\n');
console.log('36 fixed PASS, 28 whole-original owned RED plus 8 held PASS, 36 restored PASS. All14 product substitutions changed bytes and restored exact RAW.');
