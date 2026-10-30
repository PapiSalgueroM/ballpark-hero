import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { build } from 'esbuild';

const root = process.cwd(), out = process.env.NFL_TE_OUT;
const hash = body => createHash('sha256').update(body).digest('hex');
const blob = body => createHash('sha1').update(Buffer.from('blob ' + body.length + '\0')).update(body).digest('hex');
const json = (file, value) => fs.writeFileSync(path.join(out, file), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const fixtureDir = 'scripts/qa/fixtures/nfl-te/';
const FIXTURES = { 'aggregate.json': '9328ce468d4750aa2f2758cec68a411e2ff3d1b2363d8a71cb6cf4e1b8eb0b01', 'weekly.json': '9bc1dff6891a20eef77beb63eb0dc29b6f1db3d20414b9ef90b1a19e2cd84075', 'defense.json': '6b32f514a29d128ad07aa4c9f0a9ca8a46a9f8a0f05513902fcb134c2a91a1c2' };
const APP_PINS = {
  'src/lib/perfectSeasonNfl.ts': 'e7ab2d13bd5e8d59e22bf1b570c6d17a6af6c97e',
  'src/pages/PerfectSeasonNfl.tsx': '6d62a1fd7fb58e52789dd8835ab456973bf803fa',
  'src/lib/perfectSeason.ts': '2acc9b8498e15b53c9eebc87ea45d3dd77ec2de6',
  'src/lib/perfectSeasonExpansion.ts': '2c681b79098f6186cc92122b215b1b137826358c',
  'src/data/nflCoaches.ts': '29dc92839926cb10a5307c4e0bcc014c5fee5972',
  'scripts/lib/offlineTransport.cjs': '0fda542a2649fe5da937c6976fd0f5b6073e74b6',
};
const LEAF = 'src/test/nflTeReceivingExperiment.test.ts', LEAF_BLOB = '08238d36e9b0711989c7667e3d0f91331efe8ded';
const TITLES = [
  'reads the real tight-end anchors through the actual squad adapter',
  'keeps representative wide receivers on their unchanged ratings',
  'loads the actual other positions and the two retained defense units',
  'retains the actual statistic lines and source query boundaries',
];
const TRAIN = [1999,2000,2001,2004,2005,2006,2007,2010,2011,2012,2013,2014,2018,2019,2020,2021];
const HOLDOUT = [2002,2003,2008,2009,2015,2016,2017,2022,2023,2024];
const BUCKETS = [[1999,2003,1.05],[2004,2009,1.03],[2010,2017,1],[2018,2024,0.98]], QS = [0.5,0.75,0.9];
const SOURCE = 'src/lib/perfectSeasonNfl.ts';
const BEFORE = "rating = recRating(t, entry.year);\n        eligible = ['TE', 'FLEX'];";
const REPORTER_PINS = [
  ['node_modules/vitest/dist/reporters.js','374f93a9d3bede1ad1575081077fd72037067d75eb71e24dce000d90b815c905'],
  ['node_modules/vitest/dist/chunks/index.VByaPkjc.js','59d12f5f70a230e6cf7d165a7ebba867675e992c49a7eb2308a032c6619d3870'],
  ['node_modules/vitest/dist/chunks/cli-api.DVe0nWUx.js','4c2fecfeb976ee9cdf00cf4a03daef462cefd08e0e502b2ce7c1daf3ac540135'],
  ['node_modules/@vitest/runner/dist/chunk-hooks.js','5e0b0ece2242e3475a0312a375fac6e47287602792d7f4999d2d733ecda2d69a'],
];
assert.equal(process.env.CI, 'true', 'NFL_TE_REMOTE_ONLY');
assert(out && path.isAbsolute(out) && root === path.join(out, 'work'), 'NFL_TE_MATCHED_COPY_ONLY');
assert.match(process.env.EXPECTED_BASE || '', /^[a-f0-9]{40}$/, 'NFL_TE_BASE_UNBOUND');
for (const [file, expected] of Object.entries(APP_PINS)) assert.equal(blob(fs.readFileSync(file)), expected, 'NFL_TE_APP_PIN:' + file);
assert.equal(blob(fs.readFileSync(LEAF)), LEAF_BLOB, 'NFL_TE_LEAF_PIN');
const docs = {};
for (const [name, expected] of Object.entries(FIXTURES)) {
  const body = fs.readFileSync(fixtureDir + name); assert.equal(hash(body), expected, 'NFL_TE_SNAPSHOT_PIN:' + name);
  docs[name] = JSON.parse(body); assert.equal(docs[name].readOnly, true, 'NFL_TE_READ_ONLY_SNAPSHOT');
}
assert.equal(docs['aggregate.json'].rows.length,8023); assert.equal(docs['weekly.json'].rows.length,355); assert.equal(docs['defense.json'].rows.length,2);
const members = fs.readFileSync(path.join(out,'source-members.before')).toString().split('\0').filter(Boolean);
const heldBodies = new Map(members.map(file => [file, hash(fs.readFileSync(file))]));
const held = () => { for (const [file, expected] of heldBodies) assert.equal(hash(fs.readFileSync(file)), expected, 'NFL_TE_MATCHED_SOURCE_HELD:' + file); };
const original = fs.readFileSync(SOURCE), originalText = original.toString('utf8');
assert.equal(originalText.split(BEFORE).length - 1, 1, 'NFL_TE_SOURCE_SINGLETON');
function prepareReporter() {
  assert.equal(JSON.parse(fs.readFileSync('package.json')).scripts.test,'vitest run');
  assert.equal(JSON.parse(fs.readFileSync('node_modules/vitest/package.json')).version,'3.2.7');
  for (const [file, expected] of REPORTER_PINS) assert.equal(hash(fs.readFileSync(file)),expected,'NFL_TE_REPORTER_PIN');
  const resolved = fs.realpathSync(createRequire(path.join(root,'package.json')).resolve('vitest/reporters'));
  assert.equal(resolved,fs.realpathSync('node_modules/vitest/dist/reporters.js'));
  const body = [
    'import { JsonReporter } from ' + JSON.stringify(pathToFileURL(resolved).href) + ';',
    'import fs from "node:fs";',
    'export default class extends JsonReporter { async onFinished(files,errors,coverage) {',
    'if(!Array.isArray(files)||!Array.isArray(errors))throw new Error("NFL_TE_ACTUAL_ERRORS");',
    'const clean=e=>({name:e?.name??null,message:e?.message??String(e),stack:e?.stack??null});',
    'fs.writeFileSync(process.env.NFL_TE_RUNTIME,JSON.stringify({arrayReceived:true,count:errors.length,errors:errors.map(clean),fileErrors:files.flatMap(f=>(f.result?.errors??[]).map(e=>({file:f.filepath,...clean(e)})))},null,2)+"\\n",{flag:"wx"});',
    'await super.onFinished(files,errors,coverage);}}',
  ].join('\n') + '\n';
  const file=path.join(out,'runtime-reporter.mjs');fs.writeFileSync(file,body,{flag:'wx'});
  const syntax=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});json('reporter-syntax.json',{status:syntax.status,signal:syntax.signal,error:syntax.error?String(syntax.error):null,stdout:syntax.stdout,stderr:syntax.stderr});
  assert.equal(syntax.status,0);assert.equal(syntax.signal,null);return {file,body};
}
function inspect(actual, redMarker) {
  const failed=redMarker?1:0,r=actual.report;
  assert.equal(actual.process.status,failed,'NFL_TE_RAW');assert.equal(actual.process.signal,null,'NFL_TE_RAW');assert.equal(actual.process.error,null,'NFL_TE_RAW');
  assert.equal(actual.runtime.arrayReceived,true,'NFL_TE_RUNTIME');assert.equal(actual.runtime.count,0,'NFL_TE_RUNTIME');assert.deepEqual(actual.runtime.errors,[],'NFL_TE_RUNTIME');assert.deepEqual(actual.runtime.fileErrors,[],'NFL_TE_RUNTIME');
  assert.equal(r.testResults.length,1,'NFL_TE_FILES');const file=r.testResults[0];
  assert.equal(path.relative(root,file.name).split(path.sep).join('/'),LEAF,'NFL_TE_FILES');assert.equal(file.message,'','NFL_TE_METHOD');assert.equal(file.status,failed?'failed':'passed','NFL_TE_STATUS');
  const rows=file.assertionResults;assert.equal(rows.length,4,'NFL_TE_IDENTITIES');assert.equal(new Set(rows.map(row=>row.title)).size,4,'NFL_TE_IDENTITIES');assert.deepEqual(rows.map(row=>row.title).sort(),[...TITLES].sort(),'NFL_TE_IDENTITIES');
  for(const [index,title] of TITLES.entries()){
    const row=rows.find(row=>row.title===title),red=index===0&&redMarker;
    assert.deepEqual(row.ancestorTitles,['NFL tight-end receiving experiment'],'NFL_TE_IDENTITIES');assert.equal(row.fullName,'NFL tight-end receiving experiment '+title,'NFL_TE_IDENTITIES');assert.equal(row.status,red?'failed':'passed','NFL_TE_STATUS');
    if(red){assert.equal(row.failureMessages.length,1,'NFL_TE_METHOD');assert.match(row.failureMessages[0],/^AssertionError(?:\s|\[|:)/,'NFL_TE_METHOD');assert(row.failureMessages[0].split('\n')[0].includes(redMarker),'NFL_TE_OWNED_MARKER');}
    else assert.deepEqual(row.failureMessages,[],'NFL_TE_STATUS');
  }
  for(const [key,value] of Object.entries({numTotalTests:4,numPassedTests:4-failed,numFailedTests:failed,numPendingTests:0,numTodoTests:0}))assert.equal(r[key],value,'NFL_TE_COUNTS');
  assert(Number.isInteger(r.numTotalTestSuites)&&r.numTotalTestSuites>0,'NFL_TE_COUNTS');assert(Number.isInteger(r.numFailedTestSuites)&&r.numFailedTestSuites>=0,'NFL_TE_COUNTS');assert.equal(r.numFailedTestSuites>0,!!failed,'NFL_TE_COUNTS');assert.equal(r.numPendingTestSuites,0,'NFL_TE_COUNTS');assert(Number.isInteger(r.numPassedTestSuites)&&r.numPassedTestSuites>=0,'NFL_TE_COUNTS');assert.equal(r.numTotalTestSuites,r.numPassedTestSuites+r.numFailedTestSuites+r.numPendingTestSuites,'NFL_TE_COUNTS');
  assert.equal(r.success,!failed,'NFL_TE_COUNTS');return {total:4,passed:4-failed,failed,runtimeErrors:0};
}
function units(id,policy,gain,redMarker,reporter) {
  const dir=path.join(out,id);fs.mkdirSync(dir);
  const args=['test','--',LEAF,'--no-cache','--maxWorkers=1','--minWorkers=1','--no-file-parallelism','--reporter=default','--reporter='+reporter.file,'--outputFile.json='+path.join(dir,'vitest.json')];
  const env={...process.env,NFL_TE_EXPECTED_POLICY:policy,NFL_TE_EXPECTED_GAIN:String(gain),NFL_TE_RUNTIME:path.join(dir,'runtime.json'),NFL_TE_OUTCOME_FILE:path.join(dir,'outcomes.json'),SIM_OFFLINE_RECEIPT:path.join(dir,'transport.log')};
  fs.writeFileSync(env.SIM_OFFLINE_RECEIPT,'',{flag:'wx'});
  const stdout=fs.openSync(path.join(dir,'stdout.log'),'wx'),stderr=fs.openSync(path.join(dir,'stderr.log'),'wx');let child;
  try{child=spawnSync('npm',args,{cwd:root,env,timeout:180000,stdio:['ignore',stdout,stderr]});}finally{fs.closeSync(stdout);fs.closeSync(stderr);}
  const processRecord={executable:'npm',args,status:child.status,signal:child.signal,error:child.error?String(child.error):null};
  fs.writeFileSync(path.join(dir,'process.json'),JSON.stringify(processRecord,null,2)+'\n',{flag:'wx'});fs.writeFileSync(path.join(dir,'raw.exit'),String(child.status)+'\n',{flag:'wx'});
  assert.equal(fs.statSync(env.SIM_OFFLINE_RECEIPT).size,0,'NFL_TE_OFFLINE_TRANSPORT');assert.equal(hash(fs.readFileSync(reporter.file)),hash(reporter.body),'NFL_TE_REPORTER_HELD');
  const actual={process:processRecord,report:JSON.parse(fs.readFileSync(path.join(dir,'vitest.json'))),runtime:JSON.parse(fs.readFileSync(env.NFL_TE_RUNTIME))};
  const counts=inspect(actual,redMarker);fs.writeFileSync(path.join(dir,'CLASSIFICATION.json'),JSON.stringify({id,policy,gain,counts},null,2)+'\n',{flag:'wx'});
  return {actual,counts,outcomes:JSON.parse(fs.readFileSync(env.NFL_TE_OUTCOME_FILE))};
}
function classifierControls(foundation) {
  const body=Buffer.from(JSON.stringify(foundation.actual,null,2)+'\n'),working=path.join(out,'classifier-working.json'),receipts=[];
  fs.writeFileSync(working,body,{flag:'wx'});
  for(const [id,marker,mutate] of [['raw','NFL_TE_RAW',x=>{x.process.status=1;}],['identity','NFL_TE_IDENTITIES',x=>{x.report.testResults[0].assertionResults.pop();}],['runtime','NFL_TE_RUNTIME',x=>{x.runtime.count=1;x.runtime.errors.push({name:'Error',message:'copied control'});}]]){
    const value=structuredClone(foundation.actual);mutate(value);const changed=Buffer.from(JSON.stringify(value,null,2)+'\n');assert.notDeepEqual(changed,body);fs.writeFileSync(path.join(out,'classifier-'+id+'.changed.json'),changed,{flag:'wx'});fs.writeFileSync(working,changed);let refusal;
    try{inspect(JSON.parse(fs.readFileSync(working)),null);}catch(error){refusal=error;}finally{fs.writeFileSync(working,body);}
    assert(refusal instanceof assert.AssertionError&&refusal.message.includes(marker),'NFL_TE_CLASSIFIER_CONTROL');assert.deepEqual(fs.readFileSync(working),body);inspect(JSON.parse(fs.readFileSync(working)),null);
    receipts.push({id,marker,before:hash(body),changed:hash(changed),restored:hash(fs.readFileSync(working)),refusal:{name:refusal.name,message:refusal.message},featureCredit:false});
  }
  json('classifier-controls.json',receipts);
}
function putVariant(id,replacement) {
  assert.equal(hash(fs.readFileSync(SOURCE)),hash(original),'NFL_TE_VARIANT_STARTS_ORIGINAL');
  const changed=Buffer.from(originalText.replace(BEFORE,replacement));
  assert.notDeepEqual(changed,original);assert.equal(changed.toString().split(replacement).length-1,1);assert.equal(changed.toString().replace(replacement,BEFORE),originalText);
  fs.writeFileSync(path.join(out,id+'.source.ts'),changed,{flag:'wx'});fs.writeFileSync(SOURCE,changed);
  json(id+'.source.json',{source:SOURCE,beforeSHA256:hash(original),changedSHA256:hash(changed),changedGitBlob:blob(changed),wholeInverseExact:true,before:BEFORE,after:replacement});
}
function compareOutcomes(baseline,changed,teRating) {
  assert.deepEqual(changed.calls,baseline.calls,'NFL_TE_SOURCE_QUERIES_HELD');
  for(const squad of baseline.squads){
    const other=changed.squads.find(row=>row.squadId===squad.squadId);assert(other);assert.equal(other.players.length,squad.players.length);
    const sort=rows=>[...rows].sort((a,b)=>a.playerId.localeCompare(b.playerId));
    const before=sort(squad.players),after=sort(other.players);assert.deepEqual(before.filter(p=>!p.eligible.includes('TE')),after.filter(p=>!p.eligible.includes('TE')),'NFL_TE_ALL_OTHER_POSITIONS_EXACT');
    for(const player of before.filter(p=>p.eligible.includes('TE'))){const current=after.find(p=>p.playerId===player.playerId);assert.deepEqual({...current,rating:player.rating},player,'NFL_TE_IDENTITY_STATS_ELIGIBILITY_HELD');if(teRating!==null)assert.equal(current.rating,teRating);}
  }
}
const quantile=(values,p)=>{const sorted=[...values].sort((a,b)=>a-b),i=(sorted.length-1)*p,a=Math.floor(i),b=Math.ceil(i);assert(sorted.length);return sorted[a]+(sorted[b]-sorted[a])*(i-a);};
const era=year=>BUCKETS.find(([from,to])=>year>=from&&year<=to);
const rating=(row,k)=>Math.round(Math.min(99,Math.max(40,(42.5+k*row.score)*era(row.year)[2])));
function cohortRows() {
  const rows=docs['aggregate.json'].rows.map(r=>{
    const year=Number(r.season),g=Number(r.distinct_weeks),rec=Number(r.receptions),yards=Number(r.receiving_yards),td=Number(r.receiving_tds);
    assert(TRAIN.includes(year)||HOLDOUT.includes(year));assert(['TE','WR'].includes(r.position_group));assert(Number.isInteger(g)&&g>0&&Number(r.rows)===g);assert([rec,yards,td].every(Number.isFinite));assert.equal(Number(r.null_receptions)+Number(r.null_receiving_yards)+Number(r.null_receiving_tds),0);
    return {id:r.player_id,team:r.recent_team,year,group:r.position_group,g,rec,yards,td,score:0.42*yards/g+12*td/g};
  }).filter(row=>row.rec>=15);
  assert.equal(rows.length,4263);return rows;
}
function fitTraining(rows) {
  const train=rows.filter(row=>TRAIN.includes(row.year)),points=[];assert.equal(train.filter(r=>r.group==='TE').length,756);assert.equal(train.filter(r=>r.group==='WR').length,1834);
  for(const [from,to] of BUCKETS)for(const q of QS){
    const values=group=>train.filter(row=>row.year>=from&&row.year<=to&&row.group===group).map(row=>row.score);
    points.push({from,to,q,te:quantile(values('TE'),q),wr:quantile(values('WR'),q)});
  }
  const gain=points.reduce((sum,p)=>sum+p.te*p.wr,0)/points.reduce((sum,p)=>sum+p.te*p.te,0);
  assert(Number.isFinite(gain)&&gain>1,'NFL_TE_TRAINING_GAIN_CHANGED');const result={policy:'One positive scalar on receiving production above unchanged42.5 intercept;equal12 era/quantile points;no names/no additive boost',TRAIN,HOLDOUT,quantiles:QS,points,gain,holdoutUsedForFitting:false};
  json('TRAINING-FIT.json',result);return Object.freeze(result);
}
function evaluate(rows,gain) {
  const result=[];
  for(const split of ['train','holdout'])for(const [from,to] of BUCKETS){
    const years=split==='train'?TRAIN:HOLDOUT,part=rows.filter(r=>years.includes(r.year)&&r.year>=from&&r.year<=to),te=part.filter(r=>r.group==='TE'),wr=part.filter(r=>r.group==='WR');
    result.push({split,from,to,nTE:te.length,nWR:wr.length,quantiles:QS.map(q=>{const old=quantile(te.map(r=>rating(r,1)),q),candidate=quantile(te.map(r=>rating(r,gain)),q),reference=quantile(wr.map(r=>rating(r,1)),q);return {q,old,candidate,reference,oldAbsGap:Math.abs(old-reference),candidateAbsGap:Math.abs(candidate-reference)};}),oldElite:te.filter(r=>rating(r,1)>=90).length,candidateElite:te.filter(r=>rating(r,gain)>=90).length,wrElite:wr.filter(r=>rating(r,1)>=90).length});
  }
  const heldout=result.filter(r=>r.split==='holdout'),improvesEveryHeldoutQuantile=heldout.every(r=>r.quantiles.every(p=>p.candidateAbsGap<p.oldAbsGap));
  const report={result,improvesEveryHeldoutQuantile,policyVerdict:improvesEveryHeldoutQuantile?'HELDOUT_QUANTILE_PRINCIPLE_MET_NOT_PRODUCT_GO':'HELDOUT_PRINCIPLE_NOT_MET_DO_NOT_RETUNE_USING_HOLDOUT',coefficientFrozenFromTraining:true,productionAdoption:false};
  json('COHORT-EVALUATION.json',report);return report;
}
async function simulatePairs(baseline,candidate) {
  const entry=path.join(out,'actual-simulation-entry.mjs'),bundle=path.join(out,'actual-simulation.mjs');
  fs.writeFileSync(entry,'export { teamOverall } from '+JSON.stringify(path.join(root,'src/lib/perfectSeason.ts'))+';\nexport { simulateSeasonFair, expectedWins } from '+JSON.stringify(path.join(root,'src/lib/perfectSeasonExpansion.ts'))+';\n',{flag:'wx'});
  const built=await build({entryPoints:[entry],outfile:bundle,bundle:true,platform:'node',format:'esm',alias:{'@':path.join(root,'src')},absWorkingDir:root,metafile:true});
  json('actual-simulation-metafile.json',built.metafile);const engine=await import(pathToFileURL(bundle).href);
  const slots=[{key:'QB',weight:1.8},{key:'RB',weight:1},{key:'WR',weight:1},{key:'WR2',weight:1},{key:'TE',weight:1},{key:'FLEX',weight:1},{key:'DEF',weight:1.3},{key:'HC',weight:0.7}],reports=[],records=[];
  assert(Math.abs(slots.reduce((n,s)=>n+s.weight,0)-8.8)<1e-12);
  for(const squad of baseline.squads)for(const tightEnd of squad.players.filter(p=>p.eligible.includes('TE'))){
    const picks={},used=new Set([tightEnd.playerId]);picks.TE=tightEnd;
    for(const slot of slots.filter(s=>s.key!=='TE')){
      const player=[...squad.players].filter(p=>!used.has(p.playerId)&&p.eligible.includes(slot.key)&&!p.eligible.includes('TE')).sort((a,b)=>b.rating-a.rating||a.playerId.localeCompare(b.playerId))[0];
      assert(player,'NFL_TE_ACTUAL_FULL_DRAFT:'+slot.key);picks[slot.key]=player;used.add(player.playerId);
    }
    const current=candidate.squads.find(s=>s.squadId===squad.squadId).players.find(p=>p.playerId===tightEnd.playerId),newPicks={...picks,TE:current},oldOverall=engine.teamOverall(slots,picks),newOverall=engine.teamOverall(slots,newPicks);
    assert(Math.abs((newOverall-oldOverall)-(current.rating-tightEnd.rating)/8.8)<1e-10);
    const oldWins=[],newWins=[];let oldPerfect=0,newPerfect=0,oldPlayoff=0,newPlayoff=0;
    for(let seed=1;seed<=2400;seed++){
      const old=engine.simulateSeasonFair('nfl',oldOverall,17,seed),next=engine.simulateSeasonFair('nfl',newOverall,17,seed);
      assert(next.wins>=old.wins,'NFL_TE_COUPLED_SIM_MONOTONIC');oldWins.push(old.wins);newWins.push(next.wins);oldPerfect+=Number(old.perfect);newPerfect+=Number(next.perfect);oldPlayoff+=Number(old.wins>=12);newPlayoff+=Number(next.wins>=12);
      records.push({squad:squad.squadId,te:tightEnd.playerId,seed,oldWins:old.wins,candidateWins:next.wins,oldPerfect:old.perfect,candidatePerfect:next.perfect});
    }
    const mean=a=>a.reduce((n,v)=>n+v,0)/a.length,curveShift=engine.expectedWins('nfl',newOverall)-engine.expectedWins('nfl',oldOverall);
    assert(curveShift<=0.6*Math.abs(current.rating-tightEnd.rating)/8.8+1e-10,'NFL_TE_EXISTING_WIN_CURVE_BOUND');
    reports.push({squad:squad.squadId,tightEnd:{id:tightEnd.playerId,name:tightEnd.name},picks,oldRating:tightEnd.rating,candidateRating:current.rating,oldOverall,newOverall,curveShift,seeds:2400,oldMeanWins:mean(oldWins),candidateMeanWins:mean(newWins),oldMedianWins:quantile(oldWins,.5),candidateMedianWins:quantile(newWins,.5),oldPerfect,newPerfect,oldPlayoff,newPlayoff});
  }
  assert.equal(reports.length,4,'NFL_TE_EXACT_FOUR_ANCHOR_DRAFTS');json('SIMULATION-PAIRS.json',{method:'Actual unchanged simulateSeasonFair,common2400seeds,fullactual8slotdrafts,TEslotonly',reports,noOutcomeAcceptanceMarginsInvented:true});json('SIMULATION-RAW-PAIRS.json',records);
}
let phase='started',qualification;
try {
  const reporter=prepareReporter();
  const old=units('old-green','legacy',1,null,reporter);held();classifierControls(old);phase='old-green';
  putVariant('baseline-te-path-control',"rating = 40;\n        eligible = ['TE', 'FLEX'];");
  const fault=units('baseline-te-path-control','legacy',1,'NFL_TE_BASELINE_PATH',reporter);compareOutcomes(old.outcomes,fault.outcomes,40);fs.writeFileSync(SOURCE,original);
  const restored=units('old-restored','legacy',1,null,reporter);assert.deepEqual(restored.outcomes,old.outcomes);held();phase='old-and-physical-control-qualified';
  json('OLD-SOURCE-ADMISSION.json',{status:'ACTUAL_OLD4_GREEN_TE_PATH_1OWNED_RED_3PRESERVES_AND_RESTORED4_GREEN',old:old.counts,control:fault.counts,restored:restored.counts,otherPositionsAndAllStatisticsExact:true});
  const rows=cohortRows(),fit=fitTraining(rows),evaluation=evaluate(rows,fit.gain);phase='training-fit-frozen';
  const replacement='rating = clampRating((42.5 + '+String(fit.gain)+' * (0.42 * t.recyds / Math.max(1, t.weeks.size) + 12 * t.rectd / Math.max(1, t.weeks.size))) * eraMult(entry.year));\n        eligible = [\'TE\', \'FLEX\'];';
  putVariant('experimental-te-production-scalar',replacement);
  const proposed=units('candidate-green','candidate',fit.gain,null,reporter);compareOutcomes(old.outcomes,proposed.outcomes,null);
  fs.writeFileSync(SOURCE,original);
  const originalControl=units('original-under-candidate','candidate',fit.gain,'NFL_TE_POSITION_CURVE_MISSING',reporter);assert.deepEqual(originalControl.outcomes,old.outcomes);
  fs.writeFileSync(SOURCE,Buffer.from(originalText.replace(BEFORE,replacement)));
  const candidateRestored=units('candidate-restored','candidate',fit.gain,null,reporter);assert.deepEqual(candidateRestored.outcomes,proposed.outcomes);fs.writeFileSync(SOURCE,original);
  const finalOld=units('final-old-restored','legacy',1,null,reporter);assert.deepEqual(finalOld.outcomes,old.outcomes);held();phase='all-physical-source-arms-restored';
  await simulatePairs(old.outcomes,proposed.outcomes);held();
  qualification={status:'MEASURED_EXPERIMENT_COMPLETED_NO_PRODUCT_ADOPTION',base:process.env.EXPECTED_BASE,proof:process.env.GITHUB_SHA,counts:{runs:7,casesPerRun:4,sourceControls:2,copiedClassifierControls:3},fitGain:fit.gain,heldoutPolicy:evaluation.policyVerdict,applicationSourceRestored:true,otherPositionOutputsExact:true,dbOrEmailTransport:false,productCurveCommitted:false,dailyMigrationOrLiveAdoption:false,fullSuiteBuildSeoBrowser:'UNRUN_NOT_A_SHIP_PROOF'};
  json('EXPERIMENT-ADMISSION.json',qualification);
} finally {
  fs.writeFileSync(SOURCE,original);
  let sourceHeld=false;try{held();sourceHeld=true;}finally{json('MATCHED-COPY-FINAL-HOLDS.json',{phase,sourceHeld,originalSourceSHA256:hash(original),actualSourceSHA256:hash(fs.readFileSync(SOURCE)),experimentCompleted:!!qualification});}
}
console.log('NFL_TE_EXPERIMENT: completed; actual source arms restored; candidate remains unadopted.');
