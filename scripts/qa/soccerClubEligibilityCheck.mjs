import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync, execFileSync } from 'node:child_process';

const root=process.cwd(), out=path.join(root,'club-policy-artifacts','arms');
const files=['src/lib/soccerCareerContinental.ts','src/lib/soccerCareerEngine.ts'];
const tests=['src/test/soccerClubEligibility.test.ts','src/test/soccerClubEligibilityEvents.test.ts'];
const names=[
  "excludes tier one and two Russian clubs from complete seasons starting in 2022 with no cup draw",
  "counts only league and domestic cup appearances at Russian clubs from the exact 2021 row to 2022 season boundary",
  "preserves Russian club cup selection and complete simulation outputs before the first fully excluded season",
  "preserves Russian club aggregate appearance outputs and full draw tapes for seasons starting in 2021 and earlier",
  "uses the employer country rather than Russian player nationality for an English club",
  "keeps UEFA affiliation and existing club cup choices for the other confederations",
  "preserves appearance behavior without state or without a saved employer country",
  "leaves exact nonmatching country strings and all pure-export inputs untouched",
  "round trips already recorded Russian seasons and their continental receipts without rewriting history",
  "records the actual newly played 2022 season without a named continental cup and reloads the complete career",
  "excludes a fresh European trip from the actual eligible pool while preserving foreign and pre-2022 eligibility",
  "excludes a fresh rivalry semifinal claim for a suspended employer while preserving foreign and pre-2022 gates",
  "resolves an already delivered passport choice after real codec reload through the existing catalog",
  "resolves an already delivered rivalry card after real codec reload without rechecking its fresh gate"
];
const originalFailed=[0,1,9,10,11].map(i=>names[i]).sort();
const held=new Map(files.map(file=>[file,fs.readFileSync(file)]));
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const source=()=>Object.fromEntries(files.map(file=>[file,hash(fs.readFileSync(file))]));
const fixedSource=source(), arms=[]; fs.mkdirSync(out,{recursive:true});
function run(name,expected,marker) {
 const dir=path.join(out,name);fs.mkdirSync(dir,{recursive:true});
 for(const file of files){const dest=path.join(dir,'source',file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(file,dest);}
 const before=source();
 const child=spawnSync(process.execPath,['node_modules/vitest/vitest.mjs','run',...tests,'--maxWorkers=1','--minWorkers=1','--reporter=default','--reporter=json','--outputFile='+path.join(dir,'report.json')],
  {cwd:root,encoding:'utf8',maxBuffer:16*1024*1024,env:{...process.env,SC_CLUB_POLICY_RAW:path.join(dir,'raw')}});
 fs.writeFileSync(path.join(dir,'stdout.log'),child.stdout??'');fs.writeFileSync(path.join(dir,'stderr.log'),child.stderr??'');
 assert.equal(child.error,undefined,name+' spawned');
 const report=JSON.parse(fs.readFileSync(path.join(dir,'report.json'))),results=report.testResults.flatMap(r=>r.assertionResults),failed=results.filter(r=>r.status==='failed');
 assert.equal(results.length,14,name+' complete case census');assert(results.every(r=>['passed','failed'].includes(r.status)),name+' no skips');
 for(const row of failed)assert(row.failureMessages.some(m=>m.includes('AssertionError')),name+' business failure, not setup');
 if(expected==='pass'){assert.equal(child.status,0);assert.equal(failed.length,0);}
 else if(expected==='original'){assert.equal(child.status,1);assert.deepEqual(failed.map(r=>r.title).sort(),originalFailed);}
 else{assert.equal(child.status,1);assert.deepEqual(failed.map(r=>r.title).sort(),expected.map(i=>names[i]).sort());if(marker)assert(failed.some(r=>r.failureMessages.some(m=>m.includes(marker))),name+' exact business marker');}
 assert.deepEqual(source(),before,name+' child holds source');
 const rawFiles=fs.readdirSync(path.join(dir,'raw')).sort();assert.equal(rawFiles.length,14,name+' complete full RAW');
 const raw=Object.fromEntries(rawFiles.map(file=>{const b=fs.readFileSync(path.join(dir,'raw',file));JSON.parse(b);return[file,hash(b)];}));
 const row={name,exit:child.status,passed:results.length-failed.length,failed:failed.map(r=>({title:r.title,messages:r.failureMessages})),source:before,raw,bytes:rawFiles.reduce((n,f)=>n+fs.statSync(path.join(dir,'raw',f)).size,0)};
 arms.push(row);fs.writeFileSync(path.join(dir,'summary.json'),JSON.stringify(row,null,2)+'\n');console.log(name+': '+row.passed+' passed, '+failed.length+' owned failures, '+row.bytes+' full-frame bytes');return row;
}
function restore(){for(const[file,body]of held)fs.writeFileSync(file,body);}
function edit(file,from,to){const src=fs.readFileSync(file,'utf8');assert.equal(src.split(from).length,2,'one executable control anchor');const next=src.replace(from,to);assert.notEqual(next,src);fs.writeFileSync(file,next);return{file,from,to,before:hash(src),after:hash(next)};}
try{
 const fixed=run('fixed','pass');
 for(const file of files)fs.writeFileSync(file,execFileSync('git',['show','5689ab28b63a754430926479477db5d0d49502b5:'+file]));
 const original=run('original','original');restore();
 const controls=[
  {name:'omit-named-cup',file:files[0],from:'if (clubContinentalSuspended(country, year)) return null;',to:'if (false && clubContinentalSuspended(country, year)) return null;',expected:[0,9],marker:'SC_CLUB_POLICY_CUP',changed:'cup-exclusion.json'},
  {name:'omit-appearance-gate',file:files[1],from:'if (clubTier <= 2 && !(state && clubContinentalSuspended(state.currentClubCountry, clubYear))) {',to:'if (clubTier <= 2) {',expected:[1],marker:'SC_CLUB_POLICY_APPS',changed:'appearance-exclusion.json'},
  {name:'overbroad-country',file:files[0],from:"return country === 'Russia' && year >= 2022;",to:'return true && year >= 2022;',expected:[4,5,6,7,10,11],changed:'other-countries.json'},
  {name:'omit-passport-gate',file:files[1],from:'if (e.id === 65 && clubContinentalSuspended(state.currentClubCountry, completedYear)) return false;',to:'if (false && e.id === 65 && clubContinentalSuspended(state.currentClubCountry, completedYear)) return false;',expected:[10],marker:'SC_CLUB_POLICY_PASSPORT',changed:'fresh-passport-policy.json'},
  {name:'omit-rivalry-gate',file:files[1],from:'when: (s, r) => r.championsLeagues > 0 && !clubContinentalSuspended(s.currentClubCountry, s.seasons[s.seasons.length - 1]?.year ?? 2024),',to:'when: (_s, r) => r.championsLeagues > 0,',expected:[11],marker:'SC_CLUB_POLICY_RIVALRY',changed:'fresh-rivalry-policy.json'},
 ];
 const mutations=[];
 for(const control of controls){const mutation=edit(control.file,control.from,control.to);const row=run(control.name,control.expected,control.marker);assert.notEqual(row.raw[control.changed],fixed.raw[control.changed],control.name+' changed actual RAW outcome');mutations.push({...control,...mutation});restore();}
 const restored=run('restored','pass');assert.deepEqual(restored.raw,fixed.raw,'every fixed/restored RAW byte held');
 const preservation=['prior-season-cups','prior-season-appearances','nationality-preserved','other-countries','missing-context','exact-country-and-purity','recorded-history-codec','delivered-passport-choice','delivered-rivalry-dismissal'];
 for(const file of preservation)assert.equal(fixed.raw[file+'.json'],original.raw[file+'.json'],file+' exact original preservation');
 for(const arm of arms.filter(r=>r.name!=='overbroad-country'))for(const file of preservation)assert.equal(arm.raw[file+'.json'],fixed.raw[file+'.json'],arm.name+' holds '+file);
 for(const file of ['fresh-passport-policy','fresh-rivalry-policy']){const a=JSON.parse(fs.readFileSync(path.join(out,'fixed','raw',file+'.json'))),b=JSON.parse(fs.readFileSync(path.join(out,'original','raw',file+'.json')));assert.deepEqual(a.frames.slice(1),b.frames.slice(1),file+' foreign and historical vectors held');}
 fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify({complete:true,passed:true,fixedSource,arms,mutations},null,2)+'\n');
}finally{restore();assert.deepEqual(source(),fixedSource,'complete source restored');}
