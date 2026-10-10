// Inspect retained output, not elapsed time or a green process with empty work.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {OUT,sha} from './careerPressMarketKit.mjs';
assert(process.env.CI,'Artifact checker runs remotely');
const mode=process.argv[2],read=file=>JSON.parse(fs.readFileSync(path.join(OUT,file),'utf8'));
if(mode==='units'){
 const report=read('units.json'),files=['src/lib/soccerCareerPress.test.ts','src/test/soccerPressRoomUi.test.tsx','src/lib/usCareerMarket.test.ts','src/test/usCareerMarketUi.test.tsx','src/test/usCareerMarketBoard.test.tsx','src/test/usCareerSummer.test.tsx','src/test/usBoardFixture.test.tsx'];
 assert.equal(report.success,true);assert.equal(report.numFailedTests,0);assert.equal(report.numPendingTests,0);const observed=[];
 for(const file of files){const suite=report.testResults.find(v=>v.name.replaceAll('\\','/').endsWith('/'+file));assert(suite,'Expected actual unit file '+file);assert(suite.assertionResults.length>0,'Nonempty actual tests '+file);assert(suite.assertionResults.every(v=>v.status==='passed'),'Every actual assertion passed '+file);observed.push({file,passed:suite.assertionResults.length});}
 assert.equal(report.numPassedTests,report.testResults.flatMap(v=>v.assertionResults).filter(v=>v.status==='passed').length);fs.writeFileSync(path.join(OUT,'units-receipt.json'),JSON.stringify({observed,passed:report.numPassedTests,failed:0},null,2));console.log('Units: '+report.numPassedTests+' actual passed assertions in all7 required files.');
}else if(mode==='outcomes'){
 const report=read('outcomes.json');assert.equal(report.groups.length,6);assert(report.groups.every(v=>v.ok));assert.equal(report.neutral.length,27);assert(report.neutral.every(v=>v.drawCount>0));assert.equal(report.controls.length,6);assert.equal(report.fixtures.length,18);assert.deepEqual(report.sourceAfter,report.sourceBefore);
 for(const c of report.controls){assert.equal(c.faults.length,1);assert.notEqual(c.faults[0].before,c.faults[0].after);assert.deepEqual(c.groups.filter(v=>!v.ok).map(v=>v.name),[c.expectedFailure]);assert(c.groups.filter(v=>!v.ok).every(v=>v.assertion));assert.equal(c.groups.filter(v=>v.ok).length,5);}
 for(const pair of report.neutral){const v=read(pair.file);assert.deepEqual(v.current,v.original,'Whole original state/draws pair '+pair.file);}
 console.log('Outcomes:6 healthy groups,27 entire original/current state+RNG pairs,6 effective exact copied failures,18 prepared fixture branches.');
}else if(mode==='native'){
 const report=read('native/report.json');assert.equal(report.failed,0);assert.equal(report.cases.length,54);assert(report.cases.every(v=>v.ok));assert.equal(report.controls.length,3);assert(report.controls.every(v=>v.effective&&v.restored));assert.equal(report.forwarded,0);assert.deepEqual(report.sourceAfter,report.sourceBefore);assert(report.fontManifest.length>0);
 let pairs=0,reloads=0,rng=0,shots=0,layouts=0,restorations=0;const widths=new Map();
 for(const c of report.cases){widths.set(c.width,(widths.get(c.width)??0)+1);assert(c.checks>0);assert.equal(c.errors.length,0);assert.equal(c.assetErrors.length,0);assert(c.fontsUsed.length>0);assert(c.layouts.length>0);
  for(const pair of c.pairs){const v=read('native/'+pair.file);assert.equal(v.diff.length,0);assert.equal(v.actualBytes,v.expectedBytes);assert.equal(v.actualSha256,sha(v.actualBytes));assert.equal(v.expectedSha256,sha(v.expectedBytes));assert.equal(v.actualBytes,JSON.stringify(v.actual));assert.equal(v.expectedBytes,JSON.stringify(v.expected));pairs++;}
  for(const reload of c.reloads){const v=read('native/'+reload.file);assert.equal(v.before,v.after);assert.equal(v.beforeSha256,sha(v.before));assert.equal(v.afterSha256,sha(v.after));reloads++;}
  for(const draw of c.rng){const v=read('native/'+draw.file);assert.deepEqual(v.actual,v.expected);rng++;}
  for(const shot of c.shots){const bytes=fs.readFileSync(path.join(OUT,'native',shot.file));assert.equal(sha(bytes),shot.sha256);shots++;}
  for(const v of c.layouts){assert(Math.abs(v.viewport.inner.width-c.width)<=1&&v.viewport.client.width<=c.width+1);assert(!v.viewport.visual||Math.abs(v.viewport.visual.scale-1)<=0.01);assert(v.required.every(t=>t.inside&&t.painted&&t.width>=43.5&&t.height>=43.5));assert(v.stableFrames>=4&&v.finiteAnimations===0&&v.fonts==='loaded'&&v.fontFaces.every(f=>f.status!=='error')&&!v.overflow);layouts++;}
  for(const v of c.restorations){assert(v.focus);assert.deepEqual(v.after,v.before);restorations++;}
 }
 assert.deepEqual([...widths.entries()],[[320,18],[390,18],[1280,18]]);assert.equal(pairs,225);assert.equal(reloads,252);assert.equal(rng,147);assert.equal(shots,93);assert.equal(layouts,186);assert.equal(restorations,30);assert.equal(report.checks,report.cases.reduce((n,v)=>n+v.checks,0));
 const receipt={head:report.head,tree:report.tree,journeys:54,checks:report.checks,pairs,reloads,rng,shots,layouts,restorations,detectors:3,forwarded:0,sourceHeld:true,scope:'Complete retained native receipts. Manual pixel review is separate.'};fs.writeFileSync(path.join(OUT,'native-receipt.json'),JSON.stringify(receipt,null,2));console.log('Native: '+report.checks+' checks,54 journeys,225 whole-save pairs,252 raw reloads,147 engine RNG pairs,93 PNGs,186 layouts,30 exact restorations,3 copied detectors.');
}else throw Error('Unknown artifact check '+mode);