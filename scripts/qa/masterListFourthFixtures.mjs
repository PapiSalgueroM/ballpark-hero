import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
const arg=n=>process.argv[process.argv.indexOf(n)+1];
for(const key of['--out','--dist','--core','--sc-module','--cm-module'])assert(process.argv.includes(key),key);
const out=path.resolve(arg('--out')),dist=path.resolve(arg('--dist')),root=process.cwd(),core=arg('--core');
assert.match(core,/^[a-f0-9]{40}$/);await fs.mkdir(out,{recursive:true});assert.equal((await fs.readdir(out)).length,0);
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
const featurePaths=["src/lib/soccerCareerEngine.ts","src/lib/clubManager.ts","src/lib/soccerCareerProgramme.ts","src/lib/soccerCareerSave.ts","src/pages/SoccerCareer.tsx","src/pages/ClubManager.tsx","src/lib/clubManagerTactics.ts","src/lib/clubManagerMatchPlans.ts","src/lib/clubManagerMatchPlansCore.ts","src/hooks/useClubManager.ts","src/components/soccer-career/SoccerCareerProgramme.tsx","src/components/club-manager/TrainingScreen.tsx"];
const pins={};for(const file of featurePaths){pins[file]=git('rev-parse',core+':'+file);assert.equal(git('hash-object',file),pins[file],file);}
const tracked=git('ls-files','-z').split('\0').filter(Boolean).sort();
const source=async()=>Object.fromEntries(await Promise.all(tracked.map(async file=>[file,sha(await fs.readFile(file))])));
async function inventory(){const rows=[];async function walk(rel=''){for(const e of await fs.readdir(path.join(dist,rel),{withFileTypes:true})){const file=path.posix.join(rel,e.name);if(e.isDirectory())await walk(file);else{assert(e.isFile());const b=await fs.readFile(path.join(dist,file));rows.push({file,bytes:b.length,sha256:sha(b)});}}}await walk();return rows.sort((a,b)=>a.file<b.file?-1:a.file>b.file?1:0);}
const sourceBefore=await source(),distBefore=await inventory();assert(distBefore.length>100);
const entry=path.join(out,'entry.mjs'),bundle=path.join(out,'engines.mjs');
await fs.writeFile(entry,[
'const store=new Map();globalThis.localStorage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k),clear:()=>store.clear()};',
...Object.entries({sc:'soccerCareerEngine',codec:'soccerCareerSave',programme:'soccerCareerProgramme',cm:'clubManager',cmTactics:'clubManagerTactics',cmPlans:'clubManagerMatchPlans',fence:'saveFence',}).map(([key,file])=>'export const '+key+'=await import('+JSON.stringify(path.join(root,'src/lib/'+file+'.ts'))+');'),
].join('\n'),{flag:'wx'});
await build({entryPoints:[entry],outfile:bundle,bundle:true,format:'esm',platform:'node',alias:{'@':path.join(root,'src')},logLevel:'error'});
const e=await import(pathToFileURL(bundle).href),fixtures={};
async function put(name,key,raw,details={}){const file=name+'.json';await fs.writeFile(path.join(out,file),raw,{flag:'wx'});fixtures[name]={key,file,sha256:sha(raw),...details};}
const rng=initial=>{let n=initial;return()=>{n=(Math.imul(1664525,n)+1013904223)>>>0;return n/4294967296;};};
const modules={};
for(const[name,key]of[['sc','--sc-module'],['cm','--cm-module']]){
 const file=path.relative(root,path.resolve(arg(key))).split(path.sep).join('/');assert(!file.startsWith('../')&&!path.isAbsolute(file));assert(tracked.includes(file),file+' must be tracked');
 modules[name]={file,sha256:sha(await fs.readFile(file))};
}
const plansFile='scripts/qa/cmPlansNativeJourney.mjs';assert(tracked.includes(plansFile));modules.plans={file:plansFile,sha256:sha(await fs.readFile(plansFile))};
const scFlow=await import(pathToFileURL(path.resolve(modules.sc.file)).href),cmFlow=await import(pathToFileURL(path.resolve(modules.cm.file)).href);
const scFixture=await scFlow.createPrimaryRoleFixture({engine:e.sc,codec:e.codec,programme:e.programme});
assert.equal(typeof scFixture.raw,'string');await put('sc','soccerCareerSave',scFixture.raw,{expected:scFixture.expected});
const cmFixture=await cmFlow.createRecoveryWeekFixture({engine:e.cm,fence:e.fence.saveFence,plans:e.cmPlans});
assert.equal(typeof cmFixture.raw,'string');await put('cm',e.cm.SAVE_KEY,cmFixture.raw,{expected:cmFixture.expected});
const sourceAfter=await source();assert.deepEqual(sourceAfter,sourceBefore);assert.deepEqual(await inventory(),distBefore);
await fs.writeFile(out+'/manifest.json',JSON.stringify({schema:1,core,pins,sourceBefore,sourceAfter,distBefore,distDigest:sha(JSON.stringify(distBefore)),bundle:'engines.mjs',bundleSHA:sha(await fs.readFile(bundle)),fixtures,modules,scope:'Controlled fictional earned-primary-role and temporary player-recovery saves. Real constructors/helpers/save reader, explicit fixture labels and values. Native browser clocks/RNG remain untouched. Completed-build association is supplied by the outer caller.'},null,2)+'\n',{flag:'wx'});
console.log('masterListFourthFixtures: real saved fixtures and source/completed-dist inventories retained.');
