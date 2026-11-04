import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
const arg=n=>process.argv[process.argv.indexOf(n)+1];
for(const key of['--out','--dist','--core'])assert(process.argv.includes(key),key);
const out=path.resolve(arg('--out')),dist=path.resolve(arg('--dist')),root=process.cwd(),core=arg('--core');
assert.match(core,/^[a-f0-9]{40}$/);await fs.mkdir(out,{recursive:true});assert.equal((await fs.readdir(out)).length,0);
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
const featurePaths=['src/components/soccer-career/TrainingPanel.tsx','src/components/club-manager/TrainingScreen.tsx','src/components/us-career/UsCareerProgramme.tsx','src/components/front-office-shared/GmTradeBuilder.tsx','src/lib/stadiumTycoon.ts','src/hooks/useStadiumTycoon.ts','src/pages/StadiumTycoon.tsx','src/components/hub/HubExperience.tsx','src/components/home/ContinueRow.tsx'];
const pins={};for(const file of featurePaths){pins[file]=git('rev-parse',core+':'+file);assert.equal(git('hash-object',file),pins[file],file);}
const tracked=git('ls-files','-z').split('\0').filter(Boolean).sort();
const source=async()=>Object.fromEntries(await Promise.all(tracked.map(async file=>[file,sha(await fs.readFile(file))])));
async function inventory(){const rows=[];async function walk(rel=''){for(const e of await fs.readdir(path.join(dist,rel),{withFileTypes:true})){const file=path.posix.join(rel,e.name);if(e.isDirectory())await walk(file);else{assert(e.isFile());const b=await fs.readFile(path.join(dist,file));rows.push({file,bytes:b.length,sha256:sha(b)});}}}await walk();return rows.sort((a,b)=>a.file<b.file?-1:a.file>b.file?1:0);}
const sourceBefore=await source(),distBefore=await inventory();assert(distBefore.length>100);
const entry=path.join(out,'entry.mjs'),bundle=path.join(out,'engines.mjs');
await fs.writeFile(entry,[
'const store=new Map();globalThis.localStorage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k),clear:()=>store.clear()};',
...Object.entries({sc:'soccerCareerEngine',codec:'soccerCareerSave',cm:'clubManager',fence:'saveFence',tycoon:'stadiumTycoon',fo:'frontOffice',foSave:'frontOfficeSave',clean:'nflSeasonStats',gm:'gmDesk',appearance:'soccerCareerAppearance',nba:'nbaCareerSport',nfl:'nflCareerSport'}).map(([key,file])=>'export const '+key+'=await import('+JSON.stringify(path.join(root,'src/lib/'+file+'.ts'))+');')
].join('\n'),{flag:'wx'});
await build({entryPoints:[entry],outfile:bundle,bundle:true,format:'esm',platform:'node',alias:{'@':path.join(root,'src')},logLevel:'error'});
const e=await import(pathToFileURL(bundle).href),fixtures={};
async function put(name,key,raw,details={}){const file=name+'.json';await fs.writeFile(path.join(out,file),raw,{flag:'wx'});fixtures[name]={key,file,sha256:sha(raw),...details};}
const club={id:'practice-lab',name:'Practice Lab FC',country:'England',tier:1,color:'#123456',league:'Practice Fixture League'};
let sc=e.sc.initCareer('Practice Browser','England','ST','2020-24',{pace:75,shooting:75,passing:75,dribbling:75,defending:75,physical:75,reflexes:75},75,2020,[club],null,90);
sc=e.sc.applyTrainingResult(sc,'dribbling',0);
for(let i=0;i<2;i++)sc=e.sc.repairCareer(e.codec.parseSoccerCareerSave(e.codec.serializeSoccerCareerSave(sc)));
assert.equal(e.sc.trainingAvailable(sc),false);
await put('sc','soccerCareerSave',e.codec.serializeSoccerCareerSave(sc),{age:sc.age,trainingSeasonYear:sc.trainingSeasonYear});
for(const[sport,name]of[[e.nba.NBA_CAREER_SPORT,'nba'],[e.nfl.NFL_CAREER_SPORT,'nfl']]){
 const pos=name==='nba'?'PG':'QB',c=sport.startCareer('Programme Browser',pos,sport.create.archetypes[pos][0],()=>0.4,e.appearance.defaultAppearance(),'now');
 Object.assign(c,{health:96,morale:98,pendingRivalryEvent:null,pendingRivalryChoice:null});
 const beforeRole=structuredClone(c);
 assert.equal(sport.campBattle(c,75,()=>0.4),null);
 assert.equal(c.role,'starter');
 assert.deepEqual(c,{...beforeRole,role:'starter'});
 const frame={c,phase:'season',teamQuality:75,coach:null};
 await put(name,sport.saveKey,JSON.stringify(frame),{path:name==='nba'?'/nba-my-career':'/nfl-my-career',team:c.team,year:c.year});
}
const spec={name:'Preview Borough',stadium:'Preview Park',budgetTier:'mid',leagueId:e.cm.leagueOf('Everton').id,replacedClub:'Everton',crest:{shape:0,pattern:0,color1:'#123456',color2:'#ffffff',initials:'PB'}};
let cm=e.cm.startCareer(spec.name,e.cm.DEFAULT_ERA_ID,spec),player=cm.squad.find(p=>p.position!=='GK');assert(player);
cm={...cm,formationIndex:0,squad:cm.squad.map(p=>p.id===player.id?{...p,position:'LW',secondaryPositions:[],retraining:undefined,rating:80}:p)};
localStorage.clear();e.fence.saveFence.adopt(e.cm.SAVE_KEY);assert.equal(e.cm.saveCareer(cm),true);cm=e.cm.loadCareer();assert(cm);assert.equal(e.cm.saveCareer(cm),true);
await put('cm',e.cm.SAVE_KEY,localStorage.getItem(e.cm.SAVE_KEY),{playerId:player.id,target:'RW',expected:[{index:8,before:2,after:0}]});
let seed=73;const random=()=>{seed=seed*16807%2147483647;return(seed-1)/2147483646;};
const league=e.fo.initLeague(random,{depth:{}}),team='KC',partner='BUF';
for(const abbr of[team,partner])league.teams[abbr].players=league.teams[abbr].players.map((p,i)=>({...p,name:(abbr===team?'Trade Player ':'Trade Target ')+(i+1),salary:2,years:2,ovr:75,pot:80,age:24}));
e.fo.ensureFoLeagueIds(league,null);e.clean.nflCleanSave(league);
const fo={league,myTeam:team,phase:'hub',titles:0,seasonsPlayed:0,draftClass:null,picksLeft:0,gm:e.gm.readGmDesk(undefined)};
assert(e.foSave.isFrontOfficeSave(fo,'NFL',e.fo.REGULAR_WEEKS));
await put('fo','front-office-save-v1',JSON.stringify(fo),{partner,ownId:league.teams[team].players[0].id,theirMatchingIds:league.teams[partner].players.filter(p=>p.name.startsWith('Trade Target 1')).map(p=>'player:'+p.id).sort()});
const sourceAfter=await source();assert.deepEqual(sourceAfter,sourceBefore);assert.deepEqual(await inventory(),distBefore);
await fs.writeFile(out+'/manifest.json',JSON.stringify({schema:1,core,pins,sourceBefore,sourceAfter,distBefore,distDigest:sha(JSON.stringify(distBefore)),bundle:'engines.mjs',bundleSHA:sha(await fs.readFile(bundle)),fixtures,scope:'Controlled fixture generation only. Real constructors/codecs/writers, explicit fictional labels and declared rating/position fields. Browser RNG/clocks remain native. The outer caller supplies actual completed-build association.'},null,2)+'\n',{flag:'wx'});
console.log('topFeaturesFixtures: real SC/CM/NBA/NFL/FO saves and completed-dist/source inventory retained.');
