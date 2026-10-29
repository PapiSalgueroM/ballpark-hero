import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {buildCmLightSeasonObserver} from './buildCmLightSeasonFixedObserver.mjs';

assert.equal(process.env.CI,'1','Remote first-positive only');
assert.equal(process.env.SIM_NETWORK,'offline','Existing offline transport required');
const ROOT=process.cwd(),OUT=path.resolve(process.env.CM_LIGHT_FIRST_POSITIVE_OUT||'cm-light-first-positive-artifacts');
const selected=JSON.parse(fs.readFileSync('qa/cm-light-season-v1/FIRST-POSITIVE-SOURCE.json','utf8'));
const sha=b=>createHash('sha256').update(b).digest('hex'),git=b=>createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
fs.mkdirSync(OUT,{recursive:true});
const json=(name,value)=>fs.writeFileSync(path.join(OUT,name+'.json'),JSON.stringify(value,null,2)+'\n');
const mode=process.argv[2]||'healthy',record={status:'STARTED',mode,scope:'Old PR420 Light v2 first-positive only. No physical fault, browser journey, full suite or global workload qualification.'};
const plain=text=>text.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g,'');
function held(){return selected.files.map(p=>{const b=fs.readFileSync(p.path);assert.equal(b.length,p.bytes,'Source bytes '+p.path);assert.equal(sha(b),p.sha256,'Source SHA '+p.path);assert.equal(git(b),p.gitBlob,'Source Git '+p.path);return p;});}
function execute(file,args,env,label,timeout){
 const log=path.join(OUT,label+'.log'),fd=fs.openSync(log,'w');let child;
 try{child=spawnSync(process.execPath,[file,...args],{cwd:ROOT,env:{...process.env,...env},stdio:['ignore',fd,fd],timeout});}finally{fs.closeSync(fd);}
 const result={status:child.status,signal:child.signal,error:child.error?String(child.error):null,logSHA256:sha(fs.readFileSync(log))};json(label+'-process',result);fs.writeFileSync(path.join(OUT,label+'.exit'),String(child.status)+'\n');assert.ifError(child.error);assert.equal(child.signal,null,'Actual '+label+' completed');return{...result,text:fs.readFileSync(log,'utf8')};
}
function classify(report,cli,status,reportPath){
 const text=plain(cli);assert.equal(status,0,'ACTUAL_HEALTHY_EXIT');assert.equal(report.success,true);assert.equal(report.testResults.length,2,'EXACT_TWO_FILES');
 assert.equal(report.numTotalTests,22);assert.equal(report.numPassedTests,22);assert.equal(report.numFailedTests,0);assert.equal(report.numPendingTests,0);assert.equal(report.numTodoTests||0,0);assert.equal(report.numFailedTestSuites,0);assert.equal(report.numPendingTestSuites,0);assert(report.numTotalTestSuites>0);assert.equal(report.numPassedTestSuites,report.numTotalTestSuites);
 assert(!/Unhandled (?:Errors?|Rejections?|Exceptions?)|Vitest caught|Failed Suites|No test files found|^\s*Errors\s+[1-9]\d*\s+errors?/mi.test(text),'NO_INFRASTRUCTURE');
 assert(/^\s*Test Files\s+2 passed\s+\(2\)\s*$/m.test(text),'COMPLETE_ACTUAL_CLI');assert(/^\s*Tests\s+22 passed\s+\(22\)\s*$/m.test(text),'COMPLETE_ACTUAL_CLI');assert.equal((text.match(/JSON report written to /g)||[]).length,1,'COMPLETE_ACTUAL_CLI');assert(text.includes('JSON report written to '+reportPath),'COMPLETE_ACTUAL_CLI');
 for(const expected of selected.suites){const suites=report.testResults.filter(s=>path.resolve(s.name)===path.join(ROOT,expected.path));assert.equal(suites.length,1,'EXACT_FILE_IDENTITY');const suite=suites[0];assert.equal(suite.message,'','NO_SUITE_METHOD_ERROR');assert.equal(suite.status,'passed');assert.deepEqual(suite.assertionResults.map(r=>r.title).sort(),[...expected.titles].sort(),'EXACT_CASE_IDENTITIES');for(const row of suite.assertionResults){assert.deepEqual(row.ancestorTitles,[expected.prefix]);assert.equal(row.status,'passed');assert.deepEqual(row.failureMessages,[]);}}
 return report.testResults.map(s=>({path:path.relative(ROOT,s.name),status:s.status,cases:s.assertionResults.map(r=>({title:r.title,status:r.status,duration:r.duration}))}));
}
function pair(a,b){assert.deepEqual(a.value,b.value,'COMPLETE_DEFAULT_PAIR');for(const key of ['inputBefore','inputAfter','full','trim','lean','next'])assert.equal(a[key],b[key],'COMPLETE_DEFAULT_PAIR');assert.deepEqual(a.draws,b.draws,'COMPLETE_DEFAULT_PAIR');}
function causal(caseOut){
 const read=name=>JSON.parse(fs.readFileSync(path.join(caseOut,name+'.json'),'utf8')),actors=read('actors'),control=read('control'),recovery=read('recovery'),growth=read('growth'),defaults=read('default'),invalid=read('invalid-and-decline'),double=read('double-week-and-night'),earned=read('earned-annual-growth'),loan=read('owned-loan-return'),incoming=read('incoming-loan-refusal'),validation=read('request-validation'),strict=read('strict-history');
 const player=(state,id)=>{const found=state.squad.filter(p=>p.id===id);assert.equal(found.length,1,'Unique actual player');return found[0];};
 assert.equal(control.found,true);assert.deepEqual(recovery.rows.map(r=>r.kind),['week','night']);
 for(const r of recovery.rows){assert.equal(player(r.actual.value,actors.fatigueId).fitness,player(r.light.value,actors.fatigueId).fitness);assert(player(r.actual.value,actors.fatigueId).fitness>player(r.normal.value,actors.fatigueId).fitness);assert.deepEqual(r.actual.draws,r.normal.draws);assert.equal(r.actual.next,r.normal.next);assert.deepEqual(r.actual.value.squad.filter(p=>p.id!==actors.fatigueId),r.normal.value.squad.filter(p=>p.id!==actors.fatigueId));}
 assert.equal(player(growth.actual.value,actors.growthId).rating,player(growth.light.value,actors.growthId).rating);assert(player(growth.normal.value,actors.growthId).rating>player(growth.actual.value,actors.growthId).rating);assert.equal(growth.actual.value.individualLightSeason,undefined);
 assert.deepEqual(defaults.rows.map(r=>r.intensity),['light','normal','double']);for(const row of defaults.rows){pair(row.week.actual,row.week.expected);pair(row.annual.actual,row.annual.expected);}assert.deepEqual(defaults.saved,defaults.reference);assert.deepEqual(defaults.ui.draws,[]);assert.equal(defaults.ui.value.length,1);
 assert.equal(invalid.rows.length,4);for(const row of invalid.rows)pair(row.actual,row.expected);assert.deepEqual(invalid.actual,invalid.reference);assert(invalid.reference.value.rating<invalid.older.rating);
 assert.deepEqual(double.rows.map(r=>r.period),['week','night']);for(const row of double.rows){assert.deepEqual(row.actual.draws,row.normal.draws);assert.equal(row.actual.next,row.normal.next);assert.deepEqual(row.actual.value.squad.map(p=>p.injuryWeeks),row.normal.value.squad.map(p=>p.injuryWeeks));}
 assert.deepEqual(validation.refused.value,[null,null,null,null,null]);assert.deepEqual(validation.refused.draws,[]);assert.equal(validation.originalRaw,validation.actualRaw);assert.equal(incoming.refused.value,null);assert.deepEqual(incoming.refused.draws,[]);
 const earnedId=earned.commit.value.individualLightSeason.playerId;assert(player(earned.actual.value,earnedId).rating<player(earned.normal.value,earnedId).rating);assert.equal(player(earned.actual.value,earnedId).rating,player(earned.light.value,earnedId).rating);assert.equal(earned.actual.value.individualLightSeason,undefined);assert.equal(earned.renewed.individualLightSeason.season,earned.actual.value.season);
 assert(player(loan.actual.value,loan.id).rating<player(loan.normal.value,loan.id).rating);assert.equal(player(loan.actual.value,loan.id).rating,player(loan.light.value,loan.id).rating);assert.equal(loan.actual.value.individualLightSeason,undefined);assert(loan.privateReturns.length>0&&loan.privateReturns.length<=128);for(const r of loan.privateReturns)assert.deepEqual(r.current,r.old,'Complete old separate loan-return receipt');assert(loan.privateReturns.some(r=>r.current.value.bought.some(p=>p.player.id===loan.id)),'Actual unchanged buy option');
 assert.equal(strict.observations.length,2);for(const r of strict.observations){assert.equal(r.wholeNodeStrictPass,true);assert.equal(r.vitestWholeRefusal.name,'AssertionError');assert.equal(r.bootVitestStrictPass,true);assert.equal(r.otherFieldsVitestStrictPass,true);assert.equal(r.rawSHA256,strict.expectedRawSHA256);}assert.equal(strict.copiedHistoryControls,1);assert.equal(strict.control.refusal.operator,'deepStrictEqual');assert.equal(strict.control.sameCopyRestored,true);assert.equal(strict.control.wholeNodeStrictReadmitted,true);
 const bodies=Object.fromEntries(['before','changed','restored'].map(name=>[name,fs.readFileSync(path.join(caseOut,'strict-history-copy.'+name+'.json'),'utf8')]));assert.equal(sha(bodies.before),strict.control.beforeSHA256);assert.equal(sha(bodies.changed),strict.control.changedSHA256);assert.equal(bodies.restored,bodies.before);assert.notEqual(bodies.changed,bodies.before);const a=JSON.parse(bodies.before),b=JSON.parse(bodies.changed);assert.notEqual(a.calendar.next,b.calendar.next);b.calendar.next=a.calendar.next;assert.deepEqual(b,a);
 const replays=fs.readdirSync(caseOut).filter(n=>/^replay-\d+\.json$/.test(n));assert(replays.length>=32);for(const name of replays){const r=JSON.parse(fs.readFileSync(path.join(caseOut,name),'utf8'));assert.deepEqual(r.constructor,actors.constructor);const expected=r.endpoint==='fatigue'?actors.fatigue:actors.finished,count=r.endpoint==='fatigue'?actors.fatigueDrawCount:actors.calendar.draws.length;assert.deepEqual(r.calendar.value,expected);assert.deepEqual(r.calendar.draws,actors.calendar.draws.slice(0,count));assert.equal(r.calendar.next,actors.calendar.draws[count]??actors.calendar.next);}
 return{healthyCases:22,defaultFullPairs:6,invalidFullPairs:4,officialSavePair:true,actualWeekAndNight:true,earnedAnnualRatingCost:true,parentOwnedLoanRatingCost:true,separateOldLoanOption:true,actualReplayFiles:replays.length,strictHistoryWitnesses:2,copiedHistoryControl:1,scope:'Actual retained healthy evidence only. Module initialization excluded; private return observations are separate from public annual draw suffix.'};
}
function readers(){
 const file=path.join(OUT,'build/readers.log'),text=plain(fs.readFileSync(file,'utf8')),exit=fs.readFileSync(path.join(OUT,'build/readers.exit'),'utf8').trim();assert.equal(exit,'0','Actual readers exit');
 const rows=[...text.matchAll(/^\s+(PASS|FAIL|EMPTY|SKIP)\s+([A-Za-z0-9]+\.mjs)\s+\d+\.\d+s\s*$/gm)].map(m=>({status:m[1],file:m[2]}));assert.equal(rows.length,15);assert.deepEqual(rows.map(r=>r.file).sort(),[...selected.readers].sort());assert(rows.every(r=>r.status==='PASS'));assert.equal((text.match(/^All 15 harnesses green\.$/gm)||[]).length,1);assert(!/Unhandled (?:Error|Rejection)|Vitest caught|No test files found|Failed Suites/.test(text));return{rows,exit:0,logSHA256:sha(fs.readFileSync(file))};
}
function caps(){
 const file=path.join(OUT,'build/weights.log'),text=plain(fs.readFileSync(file,'utf8')),exit=fs.readFileSync(path.join(OUT,'build/weights.exit'),'utf8').trim();
 const rows=[...text.matchAll(/^\s+(\/\S*)\s+(\d+)K gz over\s+(\d+) files \(budget (\d+)K, ([\d.]+)K to the tenth\)\s*$/gm)].map(m=>({path:m[1],roundedKiB:Number(m[2]),files:Number(m[3]),budgetKiB:Number(m[4]),toTenthKiB:Number(m[5])}));record.actualCaps={exit,rows,logSHA256:sha(fs.readFileSync(file))};json('caps-raw-observation',record.actualCaps);
 assert.equal(rows.length,15);assert.deepEqual(rows.map(r=>r.path).sort(),Object.keys(selected.caps).sort());for(const row of rows){assert.equal(row.budgetKiB,selected.caps[row.path],'Unchanged cap '+row.path);assert(row.files>0&&Number.isFinite(row.toTenthKiB));assert(row.roundedKiB<=row.budgetKiB,'ACTUAL_CAP_REFUSAL '+row.path);}assert.equal(exit,'0','Actual sweep exit');assert.equal((text.match(/^sweepWeight: green\. Every page is inside its budget, and the budgets came down this round\.$/gm)||[]).length,1);return record.actualCaps;
}
try{
 record.before=held();json(mode+'-source-before',record.before);
 if(mode==='source'){record.status='SOURCE_PINS_HELD';}
 else if(mode==='healthy'){
  const built=await buildCmLightSeasonObserver({root:ROOT,out:path.join(OUT,'observer')});record.observer=built.observer;assert.deepEqual(built.observer.sourceBefore,built.observer.sourceAfter);assert.equal(built.observer.topology.observed.engineLoads,1);assert.equal(built.observer.topology.base.engineLoads,1);
  const reportPath=path.join(OUT,'vitest.json'),caseOut=path.join(OUT,'cases');fs.mkdirSync(caseOut,{recursive:true});
  const run=execute(path.join(ROOT,'node_modules/vitest/vitest.mjs'),['run',...selected.suites.map(s=>s.path),'--maxWorkers=1','--minWorkers=1','--reporter=default','--reporter=json','--outputFile='+reportPath],{CM_LIGHT_SEASON_OBSERVER_DIR:built.directory,CM_LIGHT_SEASON_CASE_OUT:caseOut},'healthy',2_400_000);
  const report=JSON.parse(fs.readFileSync(reportPath,'utf8'));record.cases=classify(report,run.text,run.status,reportPath);record.causal=causal(caseOut);record.status='HEALTHY_22_PASS_FIRST_POSITIVE_ONLY';
 }else if(mode==='readers'){record.readers=readers();record.status='ALL_15_READERS_PASS';}
 else if(mode==='caps'){record.caps=caps();record.status='ALL_15_UNCHANGED_ROUNDED_CAPS_PASS';}
 else throw new Error('Unknown first-positive mode');
 record.after=held();assert.deepEqual(record.after,record.before);json(mode+'-ADMISSION',record);console.log('CM_LIGHT_FIRST_POSITIVE '+mode+': '+record.status);
}catch(error){record.status=mode==='caps'&&record.actualCaps?'CAP_OR_SWEEP_REFUSAL':'METHOD_OR_UNEXPECTED_FAILURE';record.failure={name:error.name,message:error.message,stack:error.stack};json(mode+'-ADMISSION',record);throw error;}
