import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';

assert.equal(process.env.CI,'1','Remote CI only');
const ROOT=process.cwd(),OUT=path.resolve(process.env.SC_SERIEB_GENERATOR_OUT||'serieb-generator-artifacts/probe');
const SELECTOR='qa/sc-serieb-release-v1/GENERATOR-SOURCE-READY.json';
const GENERATED='src/data/soccerCareerClubPool.ts',LABEL='Serie B';
const EXPECTED=['Cremonese','Verona','Pisa','Avellino','Carrarese','Catanzaro','Cesena','Empoli','Entella','Juve Stabia','Mantova','Modena','Padova','Palermo','Sampdoria','Sudtirol','Vicenza','Arezzo','Benevento','Ascoli'];
const sha=b=>createHash('sha256').update(b).digest('hex');
const git=b=>createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
const json=(name,value)=>fs.writeFileSync(path.join(OUT,name+'.json'),JSON.stringify(value,null,2)+'\n');
const sorted=a=>[...a].sort();
const selected=JSON.parse(fs.readFileSync(path.join(ROOT,SELECTOR),'utf8'));
fs.mkdirSync(OUT,{recursive:true});
function pin(p){const b=fs.readFileSync(path.join(ROOT,p.path));assert.equal(b.length,p.bytes,'pin bytes '+p.path);assert.equal(sha(b),p.sha256,'pin SHA '+p.path);assert.equal(git(b),p.gitBlob,'pin Git '+p.path);return{...p};}
const sources=selected.sourcePins.map(pin);
json('source-before',sources);
if(process.argv[2]==='source'){console.log('SERIEB_GENERATOR_SOURCE: all selected inputs and unchanged generator/sampler held');process.exit(0);}
assert.equal(process.argv[2],'run');
const {build}=await import('esbuild');
const {bundleCareerSources,POOL_LEAGUES,LEAGUE_LABELS}=await import('../lib/careerClubPool.mjs');
const generatedPath=path.join(ROOT,GENERATED),beforeBytes=fs.readFileSync(generatedPath);
fs.writeFileSync(path.join(OUT,'generated-before.ts'),beforeBytes);
function child(name,args,timeout=480000){
 const stdout=path.join(OUT,name+'.stdout.log'),stderr=path.join(OUT,name+'.stderr.log');
 const outFD=fs.openSync(stdout,'w'),errFD=fs.openSync(stderr,'w');let r;
 try{r=spawnSync(process.execPath,args,{cwd:ROOT,env:process.env,timeout,stdio:['ignore',outFD,errFD]});}finally{fs.closeSync(outFD);fs.closeSync(errFD);}
 r.stdout=fs.readFileSync(stdout,'utf8');r.stderr=fs.readFileSync(stderr,'utf8');
 json(name+'-process',{args,status:r.status,signal:r.signal,error:r.error?{name:r.error.name,message:r.error.message}:null});
 assert.equal(r.error,undefined,name+' method error');assert.equal(r.signal,null,name+' signal');return r;
}
async function data(name){
 const input=path.join(OUT,name+'.ts'),output=path.join(OUT,name+'.mjs');
 const result=await build({entryPoints:[input],bundle:true,format:'esm',platform:'node',outfile:output,metafile:true,logLevel:'error'});
 assert.equal(Object.keys(result.metafile.inputs).length,1,'generated data has one actual source input');
 json(name+'-metafile',result.metafile);
 const m=await import(pathToFileURL(output).href);
 return{rows:m.CAREER_CLUB_POOL,ladder:m.CAREER_LEAGUE_LADDER,since:m.CAREER_POOL_SINCE};
}
function validate(before,after){
 assert.equal(before.rows.length,287,'generated.old287');assert.equal(after.rows.length,307,'generated.new307');
 const oldIds=new Set(before.rows.map(c=>c.id));assert.equal(oldIds.size,287,'generated.oldIDs');
 const added=after.rows.filter(c=>!oldIds.has(c.id));assert.equal(added.length,20,'generated.added20');
 assert.deepEqual(after.rows.filter(c=>oldIds.has(c.id)),before.rows,'generated.old287-held-ordered');
 assert.deepEqual(sorted(added.map(c=>c.name)),sorted(EXPECTED),'generated.exact-new20');
 assert.equal(new Set(after.rows.map(c=>c.id)).size,307,'generated.uniqueIDs');
 assert(added.every(c=>c.country==='Italy'&&c.tier===4&&c.league===LABEL),'generated.new-row-facts');
 assert.equal(Object.keys(before.ladder).length,23,'generated.old23-ladders');
 assert.equal(Object.keys(after.ladder).length,24,'generated.new24-ladders');
 const newLadder=after.ladder[LABEL];assert(Array.isArray(newLadder),'generated.SerieB-ladder');
 const flat=newLadder.flat();assert.equal(flat.length,20,'generated.SerieB-ladder20');assert.equal(new Set(flat).size,20,'generated.SerieB-unique20');
 assert.deepEqual(sorted(flat),sorted(EXPECTED),'generated.SerieB-members');
 const restLadder=structuredClone(after.ladder);delete restLadder[LABEL];assert.deepEqual(restLadder,before.ladder,'generated.old-ladders-held');
 const restSince=structuredClone(after.since);
 for(const club of added){assert.equal(after.since[club.name],2026,'generated.newSince2026');assert(!Object.hasOwn(before.since,club.name),'generated.newSince-only');delete restSince[club.name];}
 assert.deepEqual(restSince,before.since,'generated.old-since-held');
 assert.equal(Object.keys(after.since).length,Object.keys(before.since).length+20,'generated.exact20-since');
 return{added,ladder:newLadder,oldRowsHeld:287,newRows:307,newSince:20,ladderClubs:20,oldLaddersHeld:23};
}
try{
 const generator=child('generator',['scripts/genCareerClubPool.mjs','--table']);
 assert.equal(generator.status,0,'generator failed');assert.equal(generator.stderr,'','generator stderr');
 const afterBytes=fs.readFileSync(generatedPath);fs.writeFileSync(path.join(OUT,'generated-after.ts'),afterBytes);
 assert.notEqual(sha(afterBytes),sha(beforeBytes),'generator physically changed output');
 const before=await data('generated-before'),after=await data('generated-after');
 json('generated-before-observation',before);json('generated-after-observation',after);
 const verified=validate(before,after),controls=[];
 function copied(name,change,pattern){
  const b=structuredClone(after),original=JSON.stringify(b);change(b);const changed=JSON.stringify(b);
  assert.notEqual(changed,original,'COPIED guard mutation must change bytes');json('control-'+name+'-before',after);json('control-'+name+'-changed',b);
  let refusal='';try{validate(before,b);}catch(e){refusal=e.message;}assert.match(refusal,pattern,'COPIED specific refusal');
  const restored=JSON.parse(original);assert.equal(JSON.stringify(restored),original);validate(before,restored);json('control-'+name+'-restored',restored);
  controls.push({name,scope:'COPIED generated observations only',beforeSHA256:sha(original),changedSHA256:sha(changed),restoredSHA256:sha(JSON.stringify(restored)),specificRefusal:refusal,readmitted:true});
 }
 copied('old-row',x=>{x.rows[0].color='#000001';},/generated.old287-held-ordered/);
 copied('ladder-member',x=>{x.ladder[LABEL][0][0]='COPIED_MISSING_CLUB';},/generated.SerieB-members/);
 copied('since-year',x=>{x.since[verified.added[0].name]=2025;},/generated.newSince2026/);
 copied('new-country',x=>{x.rows.find(c=>c.id===verified.added[0].id).country='COPIED';},/generated.new-row-facts/);
 json('copied-controls',controls);
 globalThis.localStorage={getItem:()=>null,setItem(){},removeItem(){},clear(){}};
 const mod=await bundleCareerSources({root:ROOT,tmpDir:OUT,extra:{pool:'data/soccerCareerClubPool.ts'}});
 assert.deepEqual(mod.pool.CAREER_CLUB_POOL,after.rows,'actual full engine bundle uses generated output');
 assert.equal(mod.engine.HAND_CLUBS.length,190);assert.equal(sha(JSON.stringify(mod.engine.HAND_CLUBS.map(c=>[c.id,c.name,c.country,c.tier,c.color,c.league]))).slice(0,16),'e12e673153af2568','HAND190 actual frozen fingerprint');assert.deepEqual(mod.engine.FALLBACK_CLUBS.slice(0,190),mod.engine.HAND_CLUBS);assert.equal(mod.engine.FALLBACK_CLUBS.length,497);
 const read=new Set(POOL_LEAGUES.map(id=>LEAGUE_LABELS[id])),four=new Set(['premier','championship','laliga','brasileirao'].map(id=>LEAGUE_LABELS[id]));
 const accounting=[1,2,3,4].map(tier=>{
  const candidates=mod.engine.FALLBACK_CLUBS.filter(c=>c.tier===tier),groups=mod.engine.leagueDrawGroups(candidates);
  return{tier,candidates:candidates.length,groups:groups.length,totalWeight:groups.reduce((s,g)=>s+g.weight,0),readWeight:groups.filter(g=>read.has(g.clubs[0].league)).reduce((s,g)=>s+g.weight,0),originalFourWeight:groups.filter(g=>four.has(g.clubs[0].league)).reduce((s,g)=>s+g.weight,0),leagueGroups:groups.map(g=>({league:g.clubs[0].league,tier:g.clubs[0].tier,size:g.clubs.length,weight:g.weight,perClub:{numerator:g.weight,denominator:groups.reduce((s,x)=>s+x.weight,0)*g.clubs.length}}))};
 });
 json('actual-sampler-accounting',accounting);
 const sampler=child('unchanged-existing-sampler',['scripts/simCareerClubPool.mjs']);
 const summary=(sampler.stdout||'').trim().split('\n').at(-1);
 const tier4=accounting.find(r=>r.tier===4),groups4=mod.engine.leagueDrawGroups(mod.engine.FALLBACK_CLUBS.filter(c=>c.tier===4));
 const priorShares={'Norwich City':[5,3762],Brentford:[5,1368],'Crystal Palace':[5,1368],'Real Betis':[5,2223],'Celta Vigo':[5,2223],Cruzeiro:[5,2394],Santos:[5,2394],Enyimba:[1,171],Twente:[5,2394],Utrecht:[5,2394],Hearts:[5,1710]};
 const oldRationalFaults=[];
 if(tier4.originalFourWeight!==20||tier4.readWeight!==114||tier4.totalWeight!==171||tier4.groups!==76)oldRationalFaults.push(`FAIL [5]: tier 4: the four leagues hold ${tier4.originalFourWeight}, the read labels ${tier4.readWeight}, of ${tier4.totalWeight} over ${tier4.groups} groups; 20, 114, 171 and 76 expected`);
 for(const [name,[a,b]] of Object.entries(priorShares)){const g=groups4.find(g=>g.clubs.some(c=>c.name===name));assert(g,'sampler named share group');if(g.weight*b!==a*tier4.totalWeight*g.clubs.length)oldRationalFaults.push(`FAIL [5]: ${name}: tier 4 share ${g.weight}/${tier4.totalWeight*g.clubs.length}, ${a}/${b} stated`);}
 json('existing-sampler-outcome',{status:sampler.status,summary,stderr:sampler.stderr,expectedCurrentSourceRationalDiagnostics:oldRationalFaults,accounting,scope:'Actual unchanged current sampler output only. No rational constants, historical proof, margin or cap changed.'});
 function rationalDiagnostic(stderr){assert.deepEqual(stderr.trim()?stderr.trim().split('\n').map(l=>l.trim()):[],oldRationalFaults,'existing sampler exact current-source rational causes only');}
 assert([0,1].includes(sampler.status),'existing sampler abnormal exit');
 if(sampler.status===1){assert(oldRationalFaults.length>0,'sampler failure must have measured rational differences');assert.equal(summary,`simCareerClubPool: ${oldRationalFaults.length} failure(s) in section(s) 5`,'existing sampler completed, only actual old rational section5 differences');rationalDiagnostic(sampler.stderr);}
 else{assert.equal(oldRationalFaults.length,0,'green sampler must match its measured rational constants');assert.equal(summary,'simCareerClubPool: all sections green');rationalDiagnostic(sampler.stderr);}
 const original=sampler.stderr,changed=original+'  FAIL [5]: hand group COPIED_HISTORICAL_ODDS changed\n';
 assert.notEqual(sha(original),sha(changed));json('control-sampler-historic-before',{stderr:original});json('control-sampler-historic-changed',{stderr:changed});
 let refusal='';try{rationalDiagnostic(changed);}catch(e){refusal=e.message;}assert.match(refusal,/existing sampler exact current-source rational causes only/);
 rationalDiagnostic(original);json('control-sampler-historic-restored',{stderr:original});
 controls.push({name:'sampler-historic',scope:'COPIED existing-sampler stderr only',beforeSHA256:sha(original),changedSHA256:sha(changed),restoredSHA256:sha(original),specificRefusal:refusal,readmitted:true});
 assert.equal(controls.length,5);json('copied-controls',controls);
 assert(sampler.stdout.includes('pickAcrossLeagues over tier 4:')&&sampler.stdout.includes('both Math.random calls on a'),'actual exact-grid sampler output retained');
 json('PROBE',{status:'GENERATED_OUTPUT_CAPTURED_NOT_FINAL_QUALIFICATION',generatorExit:0,generated:{path:GENERATED,beforeBytes:beforeBytes.length,beforeSHA256:sha(beforeBytes),beforeGit:git(beforeBytes),afterBytes:afterBytes.length,afterSHA256:sha(afterBytes),afterGit:git(afterBytes)},...verified,copiedControls:controls,accounting,existingSampler:{status:sampler.status,summary,sourceUnchanged:true,scope:'Unchanged current sampler, original six seeds and 48 careers defaults. Actual green or exact current-source rational refusals retained, not fixed qualification.'},limits:'Generated output is an uncommitted probe artifact only. Freeze its exact body into the final candidate before types, fixed tests, full suite, sims, build or browser qualification.'});
 console.log('SERIEB_GENERATOR_PROBE: 20 added, 287 old rows held, 20-club ladder, 20 since2026, 5 COPIED guards; actual unchanged sampler outcome retained');
}finally{
 fs.writeFileSync(generatedPath,beforeBytes);
 const afterSources=selected.sourcePins.map(pin);json('source-after',afterSources);assert.deepEqual(afterSources,sources,'All committed probe sources restored');
 json('generated-restoration',{path:GENERATED,sha256:sha(fs.readFileSync(generatedPath)),expectedSHA256:sha(beforeBytes),exactBytes:fs.readFileSync(generatedPath).equals(beforeBytes)});
}
