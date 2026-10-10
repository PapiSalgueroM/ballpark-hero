import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { OUT, BASE, sha } from './soccerFarewellKit.mjs';
const read=file=>JSON.parse(fs.readFileSync(path.join(OUT,file),'utf8'));
const mode=process.argv[2];
let result;
if(mode==='units'){
 const v=read('units.json'),assertions=v.testResults.flatMap(t=>t.assertionResults);
 assert.equal(v.success,true);assert.equal(v.numFailedTests,0);assert.equal(v.numPendingTests,0);assert(assertions.length>0&&assertions.every(t=>t.status==='passed'));
 const files=['soccerCareerFarewell.test.ts','soccerFarewellUi.test.tsx','soccerFarewellPage.test.tsx','soccerCareerSaveRetry.test.tsx'];
 result={mode,total:assertions.length,files:files.map(file=>{const rows=v.testResults.filter(t=>t.name.replaceAll('\\','/').endsWith('/'+file));assert.equal(rows.length,1);assert(rows[0].assertionResults.length>0);assert(rows[0].assertionResults.every(t=>t.status==='passed'));return{file,passed:rows[0].assertionResults.length};})};
}else if(mode==='outcomes'){
 const v=read('outcomes.json');assert.equal(v.base,BASE);assert.deepEqual(v.sourceAfter,v.sourceBefore);
 assert.equal(v.groups.length,9);assert(v.groups.every(t=>t.ok));assert.equal(v.controls.length,6);assert(v.neutral.length>=144,'Original child and adult advance plus pending-year and genuine summary continuations');
 const operations=new Set();
 for(const row of v.neutral){const pair=read(row.file);assert.deepEqual(pair.current,pair.original);operations.add(pair.operation??'next');assert(Array.isArray(pair.original.draws));}
 for(const op of ['next','suggestion','newspaper','summary'])assert(operations.has(op),'Actual neutral continuation '+op);
 for(const control of v.controls){assert.equal(control.faults.length,1);assert.equal(control.faults[0].targetCount,1);assert.notEqual(control.faults[0].before,control.faults[0].after);assert(control.loaded.length>0);assert.deepEqual(control.groups.filter(t=>!t.ok).map(t=>t.name),control.expectedFailures);assert(control.groups.filter(t=>!t.ok).every(t=>t.assertion));assert.equal(control.groups.filter(t=>t.ok).length,9-control.expectedFailures.length);}
 assert.equal(v.fixtures.length,6);result={mode,groups:9,neutralPairs:v.neutral.length,sourceControls:6,preparedBranches:6,sourceHeld:true};
}else if(mode==='page-control'){
 const v=read('page-control-receipt.json');assert.deepEqual(v.sourceAfter,v.sourceBefore);assert.equal(v.baseline.passed,13);assert.equal(v.baseline.exit,0);assert.equal(v.controls.length,2);
 for(const c of v.controls){assert.equal(c.exit,1);assert.equal(c.targetCount,1);assert.notEqual(c.faultHash,c.sourceHash);assert.equal(c.unrelatedPassed,13-c.failed.length);assert(c.failed.length>0&&c.failed.every(t=>t.messages.length>0));}
 assert.equal(v.component.baseline,14);assert.equal(v.component.targetCount,1);assert.notEqual(v.component.faultHash,v.component.sourceHash);assert.equal(v.component.exit,1);assert.equal(v.component.failed.length,1);assert.equal(v.component.unrelatedPassed,13);
 result={mode,baseline:13,componentBaseline:14,componentSourceControls:1,pageSourceControls:2,intendedFailures:v.controls.map(c=>({id:c.id,failed:c.failed.map(t=>t.title),unrelatedPassed:c.unrelatedPassed}))};
}else if(mode==='native'){
 const v=read('native/report.json');assert.equal(v.failed,0);assert.equal(v.forwarded,0);assert.equal(v.cases.length,18);assert.equal(v.controls.length,3);assert.deepEqual(v.sourceAfter,v.sourceBefore);assert.deepEqual(v.bootstrapSourceAfter,v.bootstrapSources.map(({file,sha256})=>({file,sha256})));
 let pairs=0,reloads=0,vectors=0,bootstraps=0,layouts=0,restorations=0,shots=0,legacyControls=0;
 const seen=new Set();
 for(const c of v.cases){assert(c.ok&&c.checks>0);assert(!c.errors.length&&!c.assetErrors.length);assert(c.fontsUsed.length>0);assert([320,390,1280].includes(c.width));assert(['normal','suggestion','ban','prison','rehab','ceremonies'].includes(c.fixture));assert(!seen.has(c.id));seen.add(c.id);
  assert(c.pairs.length>=3);assert(c.reloads.length>=4);assert.equal(c.bootstrap.length,c.reloads.length);assert(c.restorations.length>=2);assert(c.actions.some(a=>a.op==='announce'));assert(c.fixture==='suggestion'||c.actions.some(a=>a.op==='next'));
  for(const p of c.pairs){const d=read('native/'+p.file);assert.equal(d.actualBytes,d.expectedBytes);assert.equal(d.actualSha256,sha(d.actualBytes));assert.equal(d.expectedSha256,sha(d.expectedBytes));assert.deepEqual(d.actual,d.expected);assert.deepEqual(d.diff,[]);pairs++;}
  for(const p of c.reloads){const d=read('native/'+p.file);assert.equal(d.before,d.after);assert.equal(d.beforeSha256,sha(d.before));assert.equal(d.afterSha256,sha(d.after));reloads++;}
  for(const p of c.rng){const d=read('native/'+p.file);assert.deepEqual(d.actual,d.expected);assert.equal(p.actualSha256,sha(JSON.stringify(d.actual)));assert.equal(p.expectedSha256,sha(JSON.stringify(d.expected)));vectors++;}
  for(const p of c.bootstrap){const d=read('native/'+p.file);assert.equal(d.callerFilter,false);assert.equal(d.engineOracleComparison,false);assert.equal(d.startedBeforeModules,true);assert.equal(d.scope,'unfiltered-site-reload-to-ready');assert.deepEqual(d.draws,d.calls.map(t=>t.value));assert.equal(p.drawCount,d.calls.length);assert.equal(p.callsSha256,sha(JSON.stringify(d.calls)));assert.equal(p.drawsSha256,sha(JSON.stringify(d.draws)));assert(d.calls.every(t=>Number.isFinite(t.value)&&t.value>=0&&t.value<1&&typeof t.stack==='string'&&t.stack.length>0));const raw=read('native/'+d.rawReload);assert.equal(d.beforeSha256,raw.beforeSha256);assert.equal(d.afterSha256,raw.afterSha256);for(const asset of d.assets){const held=v.bootstrapSources.find(t=>t.file===asset.file);assert(held);assert.equal(held.sha256,asset.sha256);}bootstraps++;}
  for(const p of c.restorations){assert.equal(p.focus,true);assert.deepEqual(p.before,p.after);assert(Array.isArray(p.before.declarations));restorations++;}
  for(const d of c.layouts){assert.equal(d.viewport.requested.width,c.width);assert(Math.abs(d.viewport.inner.width-c.width)<=1);assert(d.viewport.client.width<=c.width+1);assert(!d.viewport.visual||Math.abs(d.viewport.visual.scale-1)<=0.01);assert.equal(d.overflow,false);assert(d.stableFrames>=4&&d.finiteAnimations===0&&d.fonts==='loaded');assert(d.required.length>0);for(const target of d.required){assert(target.inside&&target.painted);assert.equal(target.points.length,5);assert(target.points.every(t=>t.insideTarget&&Number.isFinite(t.x)&&Number.isFinite(t.y)));if(target.touchFloor>0)assert(target.width>=target.touchFloor-0.5&&target.height>=target.touchFloor-0.5);}layouts++;}
  for(const p of c.shots){assert.equal(sha(fs.readFileSync(path.join(OUT,'native',p.file))),p.sha256);shots++;}
  legacyControls+=c.legacyControls.length;
 }
 assert.equal(shots,39);assert(v.controls.every(c=>c.effective&&c.restored));for(const c of v.controls){for(const probe of c.probes??[c]){assert.notDeepEqual(probe.faulty,probe.observed);assert.deepEqual(probe.restoredObservation,probe.observed);assert(probe.failed.length>0);}}
 for(const item of v.fontManifest)assert.equal(sha(fs.readFileSync(path.join(process.env.FREE_KICK_FONT_CACHE,item.file))),item.sha256);
 for(const item of v.bootstrapSources)assert.equal(sha(fs.readFileSync(path.join(OUT,'native',item.retained))),item.sha256);
 result={mode,checks:v.checks,journeys:18,wholePairs:pairs,postStartupExactVectors:vectors,rawReloads:reloads,unfilteredStartupObservations:bootstraps,layouts,restorations,shots,observationControls:3,legacyControls,scope:'Only new farewell/cookie/Next controls assert44px. Legacy ceremony dimensions are retained without a44px claim. Startup is unfiltered and retained separately from exact action vectors.'};
}else throw Error('Unknown farewell receipt mode '+mode);
fs.writeFileSync(path.join(OUT,'checked-'+mode+'.json'),JSON.stringify(result,null,2));console.log('PASS farewell '+mode+': '+JSON.stringify(result));
