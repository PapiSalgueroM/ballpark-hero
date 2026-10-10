// Remote saved Derby History proof.
import '../lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
assert(process.env.CI, 'Derby history proof runs only in remote CI');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
/* Release AT: the base is the tree just before this round's own merge on the release line (3df03db1, Rounds 1193 and
   1194 merged), not the branch's own cut. */
const BASE = '3df03db11f3d3415a938f9dadabf8a6130e88c2f', BASE_TREE = '9020b1e50d91bea18ea730d40cb617c1c6f49f8c';
const OUT = path.resolve(ROOT, process.env.DERBY_HISTORY_ARTIFACTS || '.tmp-fx/derby-history/outcomes');
const HELPER = 'src/lib/soccerCareerDerbyHistory.ts';
const copy = value => JSON.parse(JSON.stringify(value)), sha = value => createHash('sha256').update(value).digest('hex');
const git = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
const text = file => fs.readFileSync(path.join(ROOT, file), 'utf8').replaceAll('\r\n', '\n');
const heldFiles = [HELPER, 'src/lib/soccerCareerEngine.ts', 'src/lib/soccerCareerDerby.ts', 'src/lib/soccerSeasonCompetitions.ts', 'src/components/soccer-career/SoccerDerbyHistory.tsx', 'src/pages/SoccerCareer.tsx', 'scripts/data/careerLeagueWorldSaves1100.json', 'scripts/qa/derbyHistory1195.mjs', 'scripts/playDerbyHistory1195.mjs', 'scripts/simSoccerDerbyHistory.mjs'];
function hashes() { const out = {}; for (const file of heldFiles) { const bytes = fs.readFileSync(path.join(ROOT, file)); out[file] = sha(bytes); } return out; }
const write = (dir, name, value) => { fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(path.join(dir, name + '.json'), JSON.stringify(value, null, 2)); };
export function withDerbyHistorySeed(seed, fn) {
  const random = Math.random, now = Date.now, draws = []; let state = seed >>> 0;
  Math.random = () => { state += 0x6D2B79F5; let t = state; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); const value = ((t ^ t >>> 14) >>> 0) / 4294967296; draws.push(value); return value; };
  Date.now = () => 1791586800000;
  try { return { value: fn(), draws }; } finally { Math.random = random; Date.now = now; }
}
export async function bundleDerbyHistory({ original = false, patch } = {}) {
  const receipts = [], loaded = [], require = createRequire(path.join(ROOT, 'package.json'));
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'derby-history-')), output = path.join(tmp, 'bundle.cjs');
  const stdin = "export * as soccer from './src/lib/soccerCareerEngine'; export * as reader from './src/lib/soccerSeasonCompetitions'; export * as derby from './src/lib/soccerCareerDerby'; export * as fixtures from './src/test/fixtures/soccerSeasonCompetitions1173';" + (original ? '' : "export * as history from './src/lib/soccerCareerDerbyHistory';");
  const plugin = { name: 'derby-history-source', setup(b) { b.onLoad({ filter: /\.(ts|tsx|json)$/ }, args => {
    const rel = path.relative(ROOT, args.path).replaceAll('\\', '/'); if (!rel.startsWith('src/')) return;
    let source = original ? execFileSync('git', ['show', BASE + ':' + rel], { cwd: ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }).replaceAll('\r\n', '\n') : fs.readFileSync(args.path, 'utf8').replaceAll('\r\n', '\n');
    const before = sha(source);
    if (patch && rel === patch.file) {
      assert.equal(source.split(patch.from).length - 1, 1, patch.name + ': unique source anchor');
      source = source.replace(patch.from, patch.to); assert.notEqual(sha(source), before, patch.name + ': effective copied source change');
      receipts.push({ name: patch.name, file: rel, beforeSha256: before, afterSha256: sha(source), effective: true });
    }
    loaded.push({ file: rel, beforeSha256: before, compiledSha256: sha(source), changed: before !== sha(source) });
    return { contents: source, loader: rel.endsWith('.tsx') ? 'tsx' : rel.endsWith('.json') ? 'json' : 'ts' };
  }); } };
  try {
    await build({ stdin: { contents: stdin, resolveDir: ROOT, loader: 'ts' }, bundle: true, platform: 'node', format: 'cjs', outfile: output, alias: { '@': path.join(ROOT, 'src') }, plugins: [plugin], define: { 'import.meta.env': '{"DEV":false,"PROD":true,"MODE":"production"}' }, loader: { '.css': 'empty', '.svg': 'empty', '.png': 'empty', '.jpg': 'empty', '.webp': 'empty' }, logLevel: 'error' });
    if (patch) assert.equal(receipts.length, 1, 'Copied helper defect was loaded exactly once');
    return { ...require(output), receipts, loaded };
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}
// Independent raw-save oracle. No production reader or current career fields are used.
const integer = value => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
const name = value => typeof value === 'string' && value.trim().length ? value : null;
const totals = () => ({ team:{meetings:0,w:0,d:0,l:0},player:{played:0,w:0,d:0,l:0,goals:0},missed:0 });
function validRaw(row) {
  if(!Array.isArray(row.derbies))return false;
  let played=0,goals=0;
  for(const derby of row.derbies){
    if(!derby||typeof derby!=='object'||!name(derby.rival)||!name(derby.name)||!['derby','rivalry'].includes(derby.kind)||!Array.isArray(derby.meetings)||!derby.meetings.length)return false;
    for(const m of derby.meetings){
      if(!m||typeof m!=='object'||typeof m.home!=='boolean'||typeof m.played!=='boolean'||[m.gf,m.ga,m.goals].some(v=>integer(v)===null||v>=100)||m.won!==undefined&&m.won!==true)return false;
      if(m.goals>m.gf||!m.played&&m.goals!==0||m.won&&(!m.played||m.gf<=m.ga||m.goals===0))return false;
      played+=Number(m.played);goals+=m.goals;
    }
  }
  return (integer(row.apps)===null||played<=row.apps)&&(integer(row.goals)===null||goals<=row.goals);
}
export function rawDerbyHistory(career) {
  const history={seasons:[],meetings:[],...totals()};
  career.seasons.forEach((row,seasonIndex)=>{
    if(!row||typeof row!=='object'||row.type!=='playing')return;
    const metadata={seasonIndex,year:integer(row.year),age:integer(row.age),club:name(row.club),onLoanFrom:name(row.onLoanFrom)},season={...metadata,status:'unrecorded',meetingCount:0,...totals()};history.seasons.push(season);
    if(row.derbies===undefined)return;
    if(!validRaw(row)){season.status='invalid';return;}
    if(!row.derbies.length){season.status='empty';return;}
    season.status='saved';
    row.derbies.forEach((derby,rivalIndex)=>derby.meetings.forEach((m,meetingIndex)=>{
      const result=m.gf>m.ga?'W':m.gf<m.ga?'L':'D',outcome=result.toLowerCase(),meeting={...metadata,rivalIndex,meetingIndex,rival:derby.rival,name:derby.name,kind:derby.kind,home:m.home,gf:m.gf,ga:m.ga,played:m.played,goals:m.goals,won:m.won===true,result,homeClub:m.home?metadata.club:derby.rival,awayClub:m.home?derby.rival:metadata.club,homeGoals:m.home?m.gf:m.ga,awayGoals:m.home?m.ga:m.gf};
      history.meetings.push(meeting);season.meetingCount++;
      for(const t of[history,season]){t.team.meetings++;t.team[outcome]++;if(m.played){t.player.played++;t.player[outcome]++;t.player.goals+=m.goals;}else t.missed++;}
    }));
  });
  return history;
}
export function rawRivalRecords(history) {
  const records=[];
  for(const m of history.meetings){let record=records.find(r=>r.rival===m.rival);if(!record){record={rival:m.rival,meetings:[],...totals()};records.push(record);}record.meetings.push(copy(m));const result=m.gf>m.ga?'w':m.gf<m.ga?'l':'d';record.team.meetings++;record.team[result]++;if(m.played){record.player.played++;record.player[result]++;record.player.goals+=m.goals;}else record.missed++;}
  return records;
}
export function derbyFixtures(carrier) {
  return ['playing-empty-events','retired','pending-newspaper'].map((id,caseIndex)=>{
    const career=copy(carrier),base=copy(carrier.seasons.at(-1)),meeting=(home,played,gf,ga,goals,won=false)=>({...{home,played,gf,ga,goals},...(won?{won:true}:{})}),rivals=missed=>Array.from({length:5},(_,i)=>({rival:'Generated Rival '+(i+1),name:'Recorded rivalry '+(i+1),kind:i%2?'rivalry':'derby',meetings:[meeting(true,!missed,2,1,missed?0:1,!missed),meeting(false,!missed,0,3,0)]}));
    Object.assign(career,{age:48,events:[],story:[],pendingEvents:[],pendingNews:[],pendingBallonDor:null,pendingSummary:null});
    career.seasons=Array.from({length:30},(_,i)=>({...copy(base),type:'playing',year:2020+i,age:19+i,club:carrier.currentClub,apps:24,leagueApps:20,goals:14,assists:4,cleanSheets:3,rating:7.2,ovr:70,injury:null,injuryWeeks:0,injurySevere:false,ballonDor:false,ballonDorRank:null,derbies:rivals(false).slice(0,1)}));
    career.seasons[0].type='youth';delete career.seasons[1].derbies;career.seasons[2].derbies=[];career.seasons[3].derbies=null;
    Object.assign(career.seasons[4],{year:2025,club:'FC Twente',onLoanFrom:'Anderlecht'});Object.assign(career.seasons[5],{year:2025,club:'FC Twente',derbies:rivals(false)});
    Object.assign(career.seasons[6],{apps:0,leagueApps:0,goals:0,assists:0,cleanSheets:0,rating:0,derbies:rivals(true)});
    career.seasons[7].derbies[0].meetings[0].goals=3;career.seasons[8].derbies[0].meetings[0].ga=2;career.seasons[9].derbies[0].meetings.push({home:true,played:true,gf:'2',ga:0,goals:1});career.seasons[11].type='manager';career.seasons[28].derbies[0].rival='generated rival 1';
    career.retired=caseIndex===1;career.phase=career.retired?'retired':'playing';
    if(caseIndex===2){career.phase='newspaper';const last=career.seasons.at(-1);last.ballonDor=true;last.ballonDorRank=1;career.pendingSummary=copy(last);career.pendingBallonDor={year:last.year,nominees:[],playerNominated:true,playerRank:1,playerWon:true,revealed:false,speech:null};career.awards=[...career.awards.filter(a=>a.name!=="Ballon d'Or"),{year:last.year,name:"Ballon d'Or",emoji:'🏆'}];career.pendingNews=[{newspaper:'Career Post',type:'positive',headline:'Recorded award awaiting its ceremony',body:'A fictional saved result, not yet announced.'}];}
    return{id,simulation:'Explicit fictional saved Derby History display inputs on an engine-recorded career. No real season or rival result is claimed.',career,selected:4,long:5,missed:6,missing:1,empty:2,invalid:3};
  });
}
function campaigns(B,carrier){return[['modern-europe','England',2027],['historical-europe','England',1980],['libertadores','Argentina',2027],['afc','Japan',2027],['caf','Egypt',2027],['concacaf','USA',2027]].map(([id,country,year])=>{const club=B.soccer.FALLBACK_CLUBS.find(c=>c.country===country);assert(club);return{id,state:{...copy(carrier),currentClub:club.name,currentClubCountry:country,currentClubTier:1,overall:99,position:'ST',seasons:[{...copy(carrier.seasons.at(-1)),year:year-1,club:club.name,clubCountry:country}]},row:{...copy(B.fixtures.cupSeason),year,club:club.name,clubCountry:country,domesticCup:false,cupRun:undefined,championsLeague:country==='England',clubCupTitle:undefined}};});}
const CONTROLS=[
  {name:'wrong-index',file:HELPER,from:'...metadata, rivalIndex, meetingIndex, rival: derby.rival',to:'...metadata, rivalIndex: 0, meetingIndex, rival: derby.rival',failed:['saved meetings','orientation','rival identities']},
  {name:'missing-as-empty',file:HELPER,from:'if (raw === undefined) return;',to:"if (raw === undefined) { season.status = 'empty'; return; }",failed:['recorded status']},
  {name:'away-orientation',file:HELPER,from:'homeGoals: held.home ? held.gf : held.ga,',to:'homeGoals: held.gf,',failed:['saved meetings','orientation']},
  {name:'missed-as-played',file:HELPER,from:'if (meeting.played) {',to:'if (true) {',failed:['team and player totals','rival totals']},
  {name:'team-goals-as-player',file:HELPER,from:'totals.player.goals += meeting.goals;',to:'totals.player.goals += meeting.gf;',failed:['team and player totals','rival totals']},
  {name:'truncate-rivals',file:HELPER,from:'derbies.forEach((derby, rivalIndex) => {',to:'derbies.slice(0, 3).forEach((derby, rivalIndex) => {',failed:['saved meetings','orientation','team and player totals','rival identities','rival totals']},
  {name:'invalid-as-saved',file:HELPER,from:"if (!valid) { season.status = 'invalid'; return; }",to:"if (!valid) { season.status = 'saved'; return; }",failed:['recorded status']},
  {name:'input-mutation',file:HELPER,from:'const history: SavedDerbyHistory =',to:'(career as SavedDerbyHistorySource & { changed?: boolean }).changed = true; const history: SavedDerbyHistory =',failed:['read boundary']},
  {name:'merge-rival-names',file:HELPER,from:'byRival.get(meeting.rival)',to:'records.find(record => record.rival.toLowerCase() === meeting.rival.toLowerCase())',failed:['rival identities','rival totals']},
  {name:'double-rival-totals',file:HELPER,from:'addMeeting(record, meeting);',to:'addMeeting(record, meeting); addMeeting(record, meeting);',failed:['rival totals']},
];
async function run(B,A,carrier,fixtures,dir){
  const report={head:git('rev-parse','HEAD'),tree:git('rev-parse','HEAD^{tree}'),baseHead:BASE,baseTree:BASE_TREE,cases:[],failed:[],counts:{},receipts:B.receipts,loaded:B.loaded,originalLoaded:A.loaded};
  const group=async(name,fn)=>{try{await fn();report.cases.push({name,passed:true});console.log('PASS '+name);}catch(error){report.cases.push({name,passed:false,errorName:error.name,error:String(error.stack||error)});report.failed.push(name);console.log('FAIL '+name+': '+error.message);}};
  await group('engine baseline',()=>{const pairs=[];try{for(let i=0;i<24;i++){const input=copy(carrier);Object.assign(input,{phase:'playing',pendingSummary:null,pendingEvents:[],pendingBallonDor:null});const before=structuredClone(input),seed=1195100+i,original=withDerbyHistorySeed(seed,()=>A.soccer.advanceProSeason(copy(input),A.soccer.FALLBACK_CLUBS)),current=withDerbyHistorySeed(seed,()=>B.soccer.advanceProSeason(copy(input),B.soccer.FALLBACK_CLUBS));pairs.push({seed,input,original,current});assert.deepEqual(current,original);assert.deepEqual(input,before);}}finally{write(dir,'engine-pairs',pairs);report.counts.enginePairs=pairs.length;}});
  await group('campaign baseline',()=>{const pairs=[];try{for(const item of campaigns(B,carrier))for(let i=0;i<32;i++){const seed=1195200+i,original=withDerbyHistorySeed(seed,()=>A.soccer.simulateUCL(copy(item.state),copy(item.row))),current=withDerbyHistorySeed(seed,()=>B.soccer.simulateUCL(copy(item.state),copy(item.row)));pairs.push({id:item.id,seed,input:item.state,row:item.row,original,current});assert.deepEqual(current,original);}}finally{write(dir,'campaign-pairs',pairs);report.counts.campaignPairs=pairs.length;}});
  await group('existing readers',()=>{const pairs=[];try{for(const item of fixtures)for(const row of item.career.seasons){const input=copy(row),original={read:A.derby.readSeasonDerbies(input),record:A.derby.derbyRecord(A.derby.readSeasonDerbies(input)),career:A.derby.careerDerbyRecord([input])},current={read:B.derby.readSeasonDerbies(input),record:B.derby.derbyRecord(B.derby.readSeasonDerbies(input)),career:B.derby.careerDerbyRecord([input])};pairs.push({id:item.id,input,original,current});assert.deepEqual(current,original);}}finally{write(dir,'existing-reader-pairs',pairs);report.counts.readerPairs=pairs.length;}});
  const observations=[];for(const item of fixtures){const input=copy(item.career),expected=rawDerbyHistory(input),actual=B.history.savedDerbyHistory(input);observations.push({id:item.id,input:copy(item.career),expected,actual});write(dir,item.id+'-history',observations.at(-1));}
  const metadata=row=>({seasonIndex:row.seasonIndex,year:row.year,age:row.age,club:row.club,onLoanFrom:row.onLoanFrom});
  await group('season identities',()=>{for(const o of observations)assert.deepEqual(o.actual.seasons.map(metadata),o.expected.seasons.map(metadata));report.counts.seasonRows=observations.reduce((n,o)=>n+o.expected.seasons.length,0);});
  await group('saved meetings',()=>{for(const o of observations)assert.deepEqual(o.actual.meetings,o.expected.meetings);report.counts.meetings=observations.reduce((n,o)=>n+o.expected.meetings.length,0);});
  await group('orientation',()=>{for(const o of observations)assert.deepEqual(o.actual.meetings.map(m=>({key:[m.seasonIndex,m.rivalIndex,m.meetingIndex],home:m.homeClub,away:m.awayClub,homeGoals:m.homeGoals,awayGoals:m.awayGoals,result:m.result})),o.expected.meetings.map(m=>({key:[m.seasonIndex,m.rivalIndex,m.meetingIndex],home:m.homeClub,away:m.awayClub,homeGoals:m.homeGoals,awayGoals:m.awayGoals,result:m.result})));});
  await group('team and player totals',()=>{const summary=o=>({team:o.team,player:o.player,missed:o.missed,seasons:o.seasons.map(s=>({seasonIndex:s.seasonIndex,meetingCount:s.meetingCount,team:s.team,player:s.player,missed:s.missed}))});for(const o of observations)assert.deepEqual(summary(o.actual),summary(o.expected));});
  await group('recorded status',()=>{for(const o of observations)assert.deepEqual(o.actual.seasons.map(s=>({index:s.seasonIndex,status:s.status})),o.expected.seasons.map(s=>({index:s.seasonIndex,status:s.status})));});
  const rivalObservations=observations.map(o=>({id:o.id,expected:rawRivalRecords(o.expected),actual:B.history.savedDerbyRivalRecords(o.actual)}));write(dir,'rival-observations',rivalObservations);
  await group('rival identities',()=>{const identities=records=>records.map(r=>({rival:r.rival,meetings:r.meetings.map(m=>({...metadata(m),rivalIndex:m.rivalIndex,meetingIndex:m.meetingIndex,name:m.name,rival:m.rival}))}));for(const o of rivalObservations)assert.deepEqual(identities(o.actual),identities(o.expected));report.counts.rivals=rivalObservations.reduce((n,o)=>n+o.expected.length,0);});
  await group('rival totals',()=>{const summaries=records=>records.map(r=>({rival:r.rival,team:r.team,player:r.player,missed:r.missed}));for(const o of rivalObservations)assert.deepEqual(summaries(o.actual),summaries(o.expected));});
  await group('read boundary',()=>{for(const item of fixtures){const input=copy(item.career),before=structuredClone(input),observed=withDerbyHistorySeed(1195,()=>{const history=B.history.savedDerbyHistory(input),held=structuredClone(history),rivals=B.history.savedDerbyRivalRecords(history);assert.deepEqual(history,held);return{history,rivals};});assert.deepEqual(observed.draws,[]);assert.deepEqual(input,before);}const probes=[{},null,{type:'manager',derbies:[]},{type:'playing',year:null,age:-1,club:'',derbies:[]},{type:'playing',apps:0,goals:0,derbies:copy(fixtures[0].career.seasons[4].derbies)},{type:'playing',apps:24,goals:0,derbies:copy(fixtures[0].career.seasons[4].derbies)}];const input={seasons:probes},before=structuredClone(input),expected=rawDerbyHistory(input),actual=B.history.savedDerbyHistory(input);write(dir,'boundary-probes',{input:before,expected,actual});assert.deepEqual(actual,expected);assert.deepEqual(input,before);});
  report.status=report.failed.length?'failed':'passed';write(dir,'report',report);return report;
}
if(process.env.DERBY_HISTORY_IMPORT_ONLY!=='1'){
  assert.equal(git('rev-parse',BASE+'^{tree}'),BASE_TREE,'Exact unchanged main baseline tree');const before=hashes(),A=await bundleDerbyHistory({original:true}),B=await bundleDerbyHistory(),recorded=JSON.parse(text('scripts/data/careerLeagueWorldSaves1100.json')).saves.find(save=>save.id==='ere').state,carrier=B.soccer.repairCareer(copy(recorded)),fixtures=derbyFixtures(carrier);
  const healthy=await run(B,A,carrier,fixtures,path.join(OUT,'healthy'));healthy.sourceBefore=before;healthy.sourceAfter=hashes();healthy.sourceHeld=JSON.stringify(before)===JSON.stringify(healthy.sourceAfter);write(path.join(OUT,'healthy'),'report',healthy);assert.equal(healthy.sourceHeld,true);assert.deepEqual(healthy.failed,[]);assert.equal(healthy.cases.length,11);write(OUT,'native-fixtures',{carrier,cases:fixtures});
  const controls=[];if(process.env.DERBY_HISTORY_CONTROL==='all')for(const patch of CONTROLS){const faulty=await bundleDerbyHistory({patch}),result=await run(faulty,A,carrier,fixtures,path.join(OUT,patch.name));assert.deepEqual([...result.failed].sort(),[...patch.failed].sort(),patch.name+': exact intended failed groups');assert(result.cases.filter(row=>!row.passed).every(row=>row.errorName==='AssertionError'));assert.equal(result.cases.length,11);for(const n of['engine baseline','campaign baseline','existing readers'])assert(result.cases.find(row=>row.name===n).passed,patch.name+': independent original contracts remain green');controls.push({name:patch.name,failed:result.failed,effective:faulty.receipts[0].effective,receipts:faulty.receipts});console.log('CONTROL FIRED('+patch.name+'): '+result.failed.join(', '));}
  write(OUT,'controls',{head:healthy.head,tree:healthy.tree,controls,sourceHeld:JSON.stringify(before)===JSON.stringify(hashes())});console.log('Derby history: '+healthy.cases.length+' groups,24 full main season pairs,192 full campaign/RNG pairs,'+controls.length+' effective controls; artifacts '+OUT);
}
