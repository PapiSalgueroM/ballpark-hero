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
const featurePaths=['src/components/us-career/UsCareerPractice.tsx','src/components/career/TrainingGround.tsx','src/components/career/drills/ZonePickDrill.tsx','src/components/career/drills/GateTapDrill.tsx','src/components/front-office/FrontOfficeBoard.tsx','src/lib/stadiumTycoon.ts','src/hooks/useStadiumTycoon.ts','src/pages/StadiumTycoon.tsx','src/components/hub/HubExperience.tsx','src/components/hub/HubExperience.module.css','src/lib/soccerCareerEngine.ts','src/pages/SoccerCareer.tsx','src/lib/soccerCareerProgramme.ts','src/components/soccer-career/SoccerCareerProgramme.tsx','src/lib/clubManager.ts','src/components/club-manager/TrainingScreen.tsx'];
const pins={};for(const file of featurePaths){pins[file]=git('rev-parse',core+':'+file);assert.equal(git('hash-object',file),pins[file],file);}
const tracked=git('ls-files','-z').split('\0').filter(Boolean).sort();
const source=async()=>Object.fromEntries(await Promise.all(tracked.map(async file=>[file,sha(await fs.readFile(file))])));
async function inventory(){const rows=[];async function walk(rel=''){for(const e of await fs.readdir(path.join(dist,rel),{withFileTypes:true})){const file=path.posix.join(rel,e.name);if(e.isDirectory())await walk(file);else{assert(e.isFile());const b=await fs.readFile(path.join(dist,file));rows.push({file,bytes:b.length,sha256:sha(b)});}}}await walk();return rows.sort((a,b)=>a.file<b.file?-1:a.file>b.file?1:0);}
const sourceBefore=await source(),distBefore=await inventory();assert(distBefore.length>100);
const entry=path.join(out,'entry.mjs'),bundle=path.join(out,'engines.mjs');
await fs.writeFile(entry,[
'const store=new Map();globalThis.localStorage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k),clear:()=>store.clear()};',
...Object.entries({sc:'soccerCareerEngine',codec:'soccerCareerSave',cm:'clubManager',fence:'saveFence',tycoon:'stadiumTycoon',fo:'frontOffice',foSave:'frontOfficeSave',clean:'nflSeasonStats',desk:'nflGmDesk',staff:'gmStaff',training:'careerTraining',appearance:'soccerCareerAppearance',nba:'nbaCareerSport',nfl:'nflCareerSport',names:'foNames',hubs:'sportHub'}).map(([key,file])=>'export const '+key+'=await import('+JSON.stringify(path.join(root,'src/lib/'+file+'.ts'))+');'),
'export const registry=await import('+JSON.stringify(path.join(root,'src/data/gameRegistry.ts'))+');',
].join('\n'),{flag:'wx'});
await build({entryPoints:[entry],outfile:bundle,bundle:true,format:'esm',platform:'node',alias:{'@':path.join(root,'src')},logLevel:'error'});
const e=await import(pathToFileURL(bundle).href),fixtures={};
async function put(name,key,raw,details={}){const file=name+'.json';await fs.writeFile(path.join(out,file),raw,{flag:'wx'});fixtures[name]={key,file,sha256:sha(raw),...details};}
for(const[sport,name]of[[e.nba.NBA_CAREER_SPORT,'nba'],[e.nfl.NFL_CAREER_SPORT,'nfl']]){
 const pos=name==='nba'?'PG':'QB',c=sport.startCareer('Free Practice Browser',pos,sport.create.archetypes[pos][0],()=>0.4,e.appearance.defaultAppearance(),'now');
 Object.assign(c,{ovr:70,pot:90,health:100,contractYears:3,pendingRivalryEvent:null,pendingRivalryChoice:null});
 const beforeRole=structuredClone(c);
 assert.equal(sport.campBattle(c,75,()=>0.4),null);assert.equal(c.role,'starter');assert.deepEqual(c,{...beforeRole,role:'starter'});
 const frame={c,phase:'season',teamQuality:75,coach:null},skin=await sport.loadTraining(pos);
 assert.equal(skin.drills.length,4);assert(skin.drills.some(d=>d.kind==='zones'&&d.mode==='pick'));
 await put(name,sport.saveKey,JSON.stringify(frame),{path:name==='nba'?'/nba-my-career':'/nfl-my-career',team:c.team,year:c.year,drills:skin.drills});
}
const rng=initial=>{let n=initial;return()=>{n=(Math.imul(1664525,n)+1013904223)>>>0;return n/4294967296;};};
const league=e.fo.initLeague(rng(904));league.cap=10000;
for(const team of Object.values(league.teams))team.players.forEach((p,i)=>{p.name='Fictional draft roster '+team.abbr+' '+i;});
league.week=17;const postseason=e.fo.runPlayoffs(league.teams,rng(51));league.champions.push({season:league.season,team:postseason.champion});
const draftClass=e.fo.generateDraftClass(rng(22),40,e.names.leagueNames(league)).map((p,i)=>({...p,id:'browser-prospect-'+String(i).padStart(2,'0'),name:'Draft Prospect '+String(i).padStart(2,'0'),pos:i<18?'RB':'QB',age:22,grade:90-Math.floor(i/2),trueOvr:80}));
e.fo.ensureFoLeagueIds(league,draftClass);e.clean.nflCleanSave(league);
const gm=e.desk.openNflDesk(league,'SEA'),level=e.staff.gmStaffLevel(e.desk.nflStaffOf(gm,league,'SEA').block,'scouting');
const ordered=draftClass.map(p=>({id:p.id,name:p.name,pos:p.pos,grade:e.desk.nflScoutRead(p,'SEA',league.season,level)})).sort((a,b)=>b.grade-a.grade||a.id.localeCompare(b.id));
const qbs=ordered.filter(p=>p.pos==='QB'),target=qbs[20];assert(target);assert(ordered.findIndex(p=>p.id===target.id)>=20);
const fo={league,myTeam:'SEA',phase:'draft',titles:2,seasonsPlayed:5,draftClass,picksLeft:3,draftBatchesLeft:3,postseason,gm};
assert(e.foSave.isFrontOfficeSave(fo,'NFL',17));
await put('fo','front-office-save-v1',JSON.stringify(fo),{ordered,qbs,target,rivals:draftClass.filter(p=>p.id!==target.id).slice(0,6).map(p=>p.name)});
for(const money of[1000,341]){
 const state={...e.tycoon.newTycoon(Date.now()),clubName:'Payroll Browser Club',money};
 const quote=e.tycoon.payrollPurchase(state,'steward',5);
 assert.equal(quote.quantity,money===1000?5:3);assert.equal(quote.cost,money===1000?648:341);
 await put('payroll'+money,e.tycoon.TYCOON_SAVE_KEY,e.tycoon.serializeTycoon(state,Date.now()),{quantity:quote.quantity,cost:quote.cost,moneyAfter:money-quote.cost});
}
const hubs=[];
for(const[route,game]of[['/soccer','/soccer-career'],['/pro-basketball','/nba-my-career'],['/pro-football','/nfl-my-career']]){
 const hub=e.hubs.hubFor(route);assert(hub);const games=e.registry.categoriesByTitle(...hub.titles).flatMap(c=>c.games);
 const chosen=games.find(g=>g.path===game),daily=games.find(g=>g.daily);assert(chosen&&daily);
 hubs.push({route,game:{path:chosen.path,label:chosen.label},daily:{path:daily.path,label:daily.label}});
}
assert(e.registry.VISIBLE_CATEGORIES.flatMap(c=>c.games).some(g=>g.path==='/squad-deal'));
const modules={};
for(const[name,key]of[['sc','--sc-module'],['cm','--cm-module']]){
 const file=path.relative(root,path.resolve(arg(key))).split(path.sep).join('/');assert(!file.startsWith('../')&&!path.isAbsolute(file));assert(tracked.includes(file),file+' must be tracked');
 modules[name]={file,sha256:sha(await fs.readFile(file))};
}
const scFlow=await import(pathToFileURL(path.resolve(modules.sc.file)).href),cmFlow=await import(pathToFileURL(path.resolve(modules.cm.file)).href);
const scFixture=await scFlow.createSelectedOfferFixture({engine:e.sc,codec:e.codec});
assert.equal(typeof scFixture.raw,'string');await put('sc','soccerCareerSave',scFixture.raw,{expected:scFixture.expected});
const cmFixture=await cmFlow.createCmTrainingFixture({engine:e.cm,fence:e.fence.saveFence});
assert.equal(typeof cmFixture.raw,'string');await put('cm',e.cm.SAVE_KEY,cmFixture.raw,{expected:cmFixture.expected});
const sourceAfter=await source();assert.deepEqual(sourceAfter,sourceBefore);assert.deepEqual(await inventory(),distBefore);
await fs.writeFile(out+'/manifest.json',JSON.stringify({schema:1,core,pins,sourceBefore,sourceAfter,distBefore,distDigest:sha(JSON.stringify(distBefore)),bundle:'engines.mjs',bundleSHA:sha(await fs.readFile(bundle)),fixtures,hubs,modules,scope:'Controlled fictional NBA/NFL careers, current real-scout NFL draft and payroll saves. Real constructors/helpers/save reader, explicit fixture labels and values. Native browser clocks/RNG remain untouched. Completed-build association is supplied by the outer caller.'},null,2)+'\n',{flag:'wx'});
console.log('expansionFeaturesFixtures: real saved fixtures and source/completed-dist inventories retained.');
