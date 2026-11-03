import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
const arg=(name,fallback)=>{const i=process.argv.indexOf(name);return i<0?fallback:process.argv[i+1];};
assert(process.argv.includes('--out'),'--out required');
const out=path.resolve(arg('--out')),dist=path.resolve(arg('--dist','dist')),mode=arg('--app-mode','fixed'),root=process.cwd();
assert(['fixed','original-control'].includes(mode));await fs.mkdir(out,{recursive:true});assert.equal((await fs.readdir(out)).length,0,'Use a fresh fixture directory');
const sha=v=>crypto.createHash('sha256').update(v).digest('hex');
const blob=v=>crypto.createHash('sha1').update(Buffer.concat([Buffer.from('blob '+v.length+'\0'),v])).digest('hex');
const pins={
 'src/App.tsx':mode==='fixed'?'8bfedf7aaa1d076e0f0c8e2216c7e46632cd8a33':'79da1b8cf2de7870ea216703d0a1a56fceb69673',
 'src/pages/Index.tsx':'fe43f115b5def2e2192b04f47fe6bd28a85c9863',
 'src/components/hub/HubExperience.tsx':'2fd20d58798ef438fa0566841121db855822f755',
 'src/components/us-career/UsCareerBoard.tsx':'b2f81114f357b4edd17dd3a94c560a213412c817',
 'src/pages/StadiumTycoon.tsx':'d1b78bdd5d5c98c5fae237f590d48d19954eb536',
 'src/components/tycoon/TicketPolicyCard.tsx':'1e54f08a33e0b40624c8ecc73cd423701aee5f2a',
 'scripts/lib/playwrightLoader.mjs':'4f7739e217e0a47ee82e6bfc8be1c04bed17454a',
 'scripts/lib/answerConsent.mjs':'c6d16997e4c06e8b35dcfd0bab5efcad3069d899'
};
for(const [file,pin]of Object.entries(pins))assert.equal(blob(await fs.readFile(file)),pin,file);
const entry=path.join(out,'entry.mjs'),bundle=path.join(out,'engines.mjs');
await fs.writeFile(entry,[
 'const store=new Map();globalThis.localStorage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k),clear:()=>store.clear()};',
 "export const NBA_CAREER_SPORT=(await import("+JSON.stringify(path.join(root,'src/lib/nbaCareerSport.ts'))+")).NBA_CAREER_SPORT;",
 "export const NFL_CAREER_SPORT=(await import("+JSON.stringify(path.join(root,'src/lib/nflCareerSport.ts'))+")).NFL_CAREER_SPORT;",
 "export const defaultAppearance=(await import("+JSON.stringify(path.join(root,'src/lib/soccerCareerAppearance.ts'))+")).defaultAppearance;",
 "export const tycoon=await import("+JSON.stringify(path.join(root,'src/lib/stadiumTycoon.ts'))+");",
 "export const categoriesByTitle=(await import("+JSON.stringify(path.join(root,'src/data/gameRegistry.ts'))+")).categoriesByTitle;",
 "export const hubFor=(await import("+JSON.stringify(path.join(root,'src/lib/sportHub.ts'))+")).hubFor;"
].join('\n'),{flag:'wx'});
const built=await build({entryPoints:[entry],outfile:bundle,bundle:true,format:'esm',platform:'node',metafile:true,
 alias:{'@':path.join(root,'src')},logLevel:'error'});
const paths=[...new Set([...Object.keys(pins),...Object.keys(built.metafile.inputs).filter(p=>p.startsWith('src/'))])].sort();
const snapshot=async()=>Object.fromEntries(await Promise.all(paths.map(async p=>[p,sha(await fs.readFile(p))])));
const sourceBefore=await snapshot(),engine=await import(pathToFileURL(bundle).href),careers=[];
for(const [label,sport]of [['NBA',engine.NBA_CAREER_SPORT],['NFL',engine.NFL_CAREER_SPORT]]){
 const pos=sport.create.defaultPos,c=sport.startCareer('Controlled Browser Player',pos,sport.create.archetypes[pos][0],()=>0.4,engine.defaultAppearance(),'now');
 Object.assign(c,{ovr:70,pot:90,health:100,contractYears:3,role:'starter'});
 const line=sport.simSeason(c,75,()=>0.4).line;sport.progress(c,()=>0.4);
 assert.deepEqual(c.seasons.at(-1),line);Object.assign(c,{pendingRivalryEvent:null,pendingRivalryChoice:null,summer:undefined});
 const raw=JSON.stringify({c,phase:'season',teamQuality:75,coach:null}),file=label.toLowerCase()+'.json';
 await fs.writeFile(path.join(out,file),raw,{flag:'wx'});
 careers.push({label,path:label==='NBA'?'/nba-my-career':'/nfl-my-career',saveKey:sport.saveKey,file,sha256:sha(raw),
  expected:('Last season: '+sport.statLine(line,c.pos)+' · '+line.teamResult).replace(/\s+/g,' ').trim(),rows:c.seasons.length});
}
const hubs=[];
for(const [route,game]of [['/soccer','/soccer-career'],['/pro-basketball','/nba-my-career'],['/pro-football','/nfl-my-career']]){
 const hub=engine.hubFor(route);assert(hub);const games=engine.categoriesByTitle(...hub.titles).flatMap(c=>c.games);
 const daily=games.find(g=>g.daily),featured=games.find(g=>g.path===game);assert(daily&&featured?.featured);
 const match=(g,q)=>(g.label+' '+g.description).toLocaleLowerCase().includes(q.toLocaleLowerCase());
 hubs.push({route,label:hub.navLabel,allPaths:games.map(g=>g.path).sort(),daily:{label:daily.label,paths:games.filter(g=>g.daily&&match(g,daily.label)).map(g=>g.path).sort()},
  featured:{path:featured.path,label:featured.label,paths:games.filter(g=>g.featured&&match(g,featured.label)).map(g=>g.path).sort()}});
}
async function distRows(){
 const rows=[];async function walk(rel=''){for(const e of await fs.readdir(path.join(dist,rel),{withFileTypes:true})){
  const file=path.posix.join(rel,e.name);if(e.isDirectory())await walk(file);else{assert(e.isFile());const b=await fs.readFile(path.join(dist,file));rows.push({file,bytes:b.length,sha256:sha(b)});}}}
 await walk();assert(rows.length>100);return rows.sort((a,b)=>a.file<b.file?-1:a.file>b.file?1:0);
}
const distBefore=await distRows(),sourceAfter=await snapshot();assert.deepEqual(sourceAfter,sourceBefore);
const manifest={schema:1,appMode:mode,sourcePins:pins,sourceBefore,sourceAfter,distBefore,distDigest:sha(JSON.stringify(distBefore)),
 bundle:'engines.mjs',bundleSHA:sha(await fs.readFile(bundle)),careers,hubs,stadium:{saveKey:engine.tycoon.TYCOON_SAVE_KEY,method:'Driver makes a fresh real newTycoon(Date.now())/serializeTycoon seed immediately before each context.'},
 scope:'Controlled engine-made ordinary saved screens, not natural careers or stat-loss reproduction. Browser RNG and clocks stay native. Home/Hub and Stadium are real App interactions.'};
await fs.writeFile(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
console.log('popularPagesFixtures: two real recorded careers, three existing hubs and completed-dist/source association retained.');
