import './lib/seedRandom.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {isDeepStrictEqual} from 'node:util';
import {execFileSync} from 'node:child_process';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const BASE=process.env.RUSSIA_BASE_ROOT||process.env.QA_BASE||process.env.BASE_SOURCE||null;
const OUT=process.env.RUSSIA_EVIDENCE_ROOT||fs.mkdtempSync(path.join(os.tmpdir(),'simRussiaBridge-'));
const MODE=process.env.RUSSIA_BRIDGE_CONTROL||'';
const NEW_NAMES=['Krasnodar','Spartak Moscow','CSKA Moscow','Lokomotiv Moscow','Rubin Kazan','Dynamo Moscow','Rostov','Akhmat Grozny','Krylia Sovetov','Baltika','Orenburg','Akron Tolyatti','Dynamo Makhachkala','Rodina Moscow','Fakel Voronezh'];
const RUSSIA='Russian Premier League';
const BASE_COMMIT='636b31efd64b749d4900e3f5773681e0496addf6';
const FROZEN={
  generated:'e472b0f5976b9070a8c968a02a748c76f54572dec0b35885e22213b1225e3b69',
  hand:'e12e673153af25689fa5e5db40e4d55f04b3f02cb74af1aa9a422e7b6c9a4fda',
  prefix:'02121b8f80118aec36396bdadb2e3a38bea1ae90ac2958f484d5205096d9e193',
  ladders:'361914683e9b82391b73468268b6bbb32bcda19fe05aa99b7d2c31b1404bff88',
  since:'61d58f2c9697f5431d929eeaee182aab12f3567a600a0af5aa3d227074d83886'
};
const EXPECTED={
  'drop-member':['CATALOGUE','SINCE','DRAW'],
  'early-since':['SINCE'],
  'old-prefix':['LEGACY','SINCE'],
  'cup-entry':['CUP','OPPONENT'],
  'opponent-entry':['OPPONENT'],
  'annual-ucl':['ANNUAL_UCL'],
  'league-cap':['LEAGUE_APPS'],
  'final-league-cap':['LEAGUE_APPS'],
  'draw-cap':['DRAW'],
  'projection-context':['PROJECTION']
};
function classifyControl(mode,failures){
  const allowed=EXPECTED[mode],families=[...new Set(failures.map(f=>f.family))];
  return {expectedPrimary:allowed[0],allowedFamilies:allowed,observedFamilies:families,
    primaryPresent:families.includes(allowed[0]),unexpectedFamilies:families.filter(f=>!allowed.includes(f)),
    owned:failures.length>0&&families.includes(allowed[0])&&families.every(f=>allowed.includes(f))};
}
const sha=b=>createHash('sha256').update(b).digest('hex');
const compact=v=>JSON.stringify(v);
const clone=v=>structuredClone(v);
const report={schema:'RUSSIA_CAREER_BRIDGE_V1',status:'failed',control:MODE||null,
  baseline:BASE?{root:BASE,commit:BASE_COMMIT,scope:'immutable original comparisons requested'}:{scope:'not supplied; standalone fingerprints and current model checks only'},
  policy:{cupFrom:2022,leagueAndMembershipFrom:2026,noReinstatementDate:true},
  checks:0,failures:[],cases:[],sources:[],controls:[],scope:'Prepared public-API and model boundary checks. No natural career, real-user save or browser claim.'};
fs.mkdirSync(OUT,{recursive:true});
function put(file,body){const dest=path.join(OUT,file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,body);return {file,bytes:Buffer.byteLength(body),sha256:sha(body)};}
function json(file,value){return put(file,compact(value)+'\n');}
function rawCase(label,value,kind='case'){const body=Buffer.from(compact(value));const gz=gzipSync(body);const row=put('cases/'+label+'.json.gz',gz);row.kind=kind;row.decodedBytes=body.length;row.decodedSHA256=sha(body);report.cases.push(row);return row;}
let section='';
function head(value){section=value;console.log('\n'+value);}
function check(value,family,message,detail=null){
  report.checks++;
  if(!value){const finding={section,family,message,detail};report.failures.push(finding);console.error('FAIL ['+family+']: '+message);}
  return !!value;
}
function uniqueSwap(source,before,after){
  const at=source.indexOf(before);
  if(at<0||source.indexOf(before,at+1)>=0)throw Error('SOURCE_ANCHOR_NOT_UNIQUE '+before.slice(0,80));
  const changed=source.slice(0,at)+after+source.slice(at+before.length);
  if(changed===source)throw Error('SOURCE_CONTROL_UNCHANGED');
  if(changed.slice(0,at)+before+changed.slice(at+after.length)!==source)throw Error('SOURCE_CONTROL_INVERSE');
  return {changed,at,before,after};
}
const seededRandom=Math.random;
let randomCalls=0,sourceAdvances=0;
const randomLedger=[];
function nextValue(){sourceAdvances++;return seededRandom();}
const countedRandom=()=>{randomCalls++;const value=nextValue();randomLedger.push({sequence:randomCalls,scope:'outside-case',value});return value;};
Math.random=countedRandom;
function stream(label,fn,tape=null,strict=false){
  const prior=Math.random,values=[],components=[];
  let attempted=0;
  const oldCapture=globalThis.__RUSSIA_APPEARANCE_CAPTURE__;
  globalThis.__RUSSIA_APPEARANCE_CAPTURE__=v=>components.push(clone(v));
  Math.random=()=>{
    randomCalls++;attempted++;
    const n=values.length;
    if(strict&&tape&&n>=tape.length){randomLedger.push({sequence:randomCalls,scope:label,exhausted:true});throw Error('REPLAY_TAPE_EXHAUSTED');}
    const replay=!!tape&&n<tape.length;
    const value=replay?tape[n]:nextValue();
    values.push(value);randomLedger.push({sequence:randomCalls,scope:label,source:replay?'recorded-global-value':'global-stream',value});return value;
  };
  const row={label};
  try{row.value=fn();}
  catch(e){row.error={name:e.name,message:e.message,stack:e.stack};}
  finally{Math.random=prior;globalThis.__RUSSIA_APPEARANCE_CAPTURE__=oldCapture;}
  Object.assign(row,{randomCalls:attempted,random:values,components,tapeLength:tape?.length??null,tapeFullyConsumed:tape?values.length===tape.length:null});
  return row;
}
function sameStream(label,left,right){
  const before=stream(label+'-original',left);
  const after=stream(label+'-patched',right,before.random);
  rawCase(label,{before,after});
  check(!before.error&&!after.error,'SETUP',label+' returns through actual public API',{before:before.error,after:after.error});
  return {before,after};
}
function stateFor(mod,row,year,overall=85){
  const stats=Object.fromEntries(['pace','shooting','passing','dribbling','defending','physical','reflexes'].map(k=>[k,overall]));
  const state=mod.engine.initCareer('Russia bridge prepared '+row.name,row.country,'ST','2020s',stats,overall,year-1,mod.engine.FALLBACK_CLUBS,null,99,null,null,'Zenit');
  return mod.engine.acceptOffer(state,{club:clone(row),contractYears:3,wage:20000,transferFee:0});
}
function sourceFiles(root,role){
  const names=['src/lib/soccerCareerEngine.ts','src/lib/soccerCareerContinental.ts','src/lib/soccerCareerLeague.ts','src/lib/soccerCareerTransferBrief.ts','src/lib/careerEras.ts','src/data/soccerCareerClubPool.ts','src/data/leagueFormat.ts','src/lib/soccerCareerDerby.ts','scripts/lib/careerClubPool.mjs','scripts/lib/seedRandom.mjs','scripts/data/soccerCareerFacts.json','src/lib/managerJobMarket.ts'];
  return names.map(file=>{let row;{const body=fs.readFileSync(path.join(root,file));row={role,file,bytes:body.length,sha256:sha(body)};}report.sources.push(row);return row;});
}
const observeBefore='  let apps = leagueApps + uclApps + cupApps;\n';
const observeAfter="  const bridgeObserve = (globalThis as { __RUSSIA_APPEARANCE_CAPTURE__?: (value: unknown) => void }).__RUSSIA_APPEARANCE_CAPTURE__;\n  if (bridgeObserve) bridgeObserve({ player: state?.playerName ?? null, club: state?.currentClub ?? null, country: state?.currentClubCountry ?? null, year: (state?.seasons[state.seasons.length - 1]?.year ?? 0) + 1, leagueApps, uclApps, cupApps });\n"+observeBefore;
function transformsFor(root,role){
  const enginePath='lib/soccerCareerEngine.ts',poolPath='data/soccerCareerClubPool.ts',contPath='lib/soccerCareerContinental.ts';
  const changed=new Map();
  const fault=(rel,before,after)=>{
    const original=changed.get(rel)||fs.readFileSync(path.join(root,'src',rel),'utf8').replaceAll('\r\n','\n');
    const op=uniqueSwap(original,before,after);
    changed.set(rel,op.changed);
    report.controls.push({mode:MODE,role,path:'src/'+rel,index:op.at,before:op.before,after:op.after,wholeInverse:true});
    put('physical/'+role+'/before/src/'+rel,original);put('physical/'+role+'/fault/src/'+rel,op.changed);
  };
  if(role==='patched'&&MODE){
    const pool=fs.readFileSync(path.join(root,'src',poolPath),'utf8').replaceAll('\r\n','\n');
    if(MODE==='drop-member'){
      const line=pool.split('\n').find(s=>s.startsWith('  { id: "cm-krasnodar",'));
      if(!line)throw Error('SOURCE_MISSING_ACTUAL_KRASNODAR_ROW');
      fault(poolPath,line+'\n','');
    }else if(MODE==='early-since')fault(poolPath,'"Krasnodar": 2026','"Krasnodar": 2025');
    else if(MODE==='old-prefix'){
      const line=pool.split('\n').find(s=>s.startsWith('  { id: "'));
      const newLine=line?.replace(/color: "#[0-9a-fA-F]{6}"/,'color: "#010203"');
      if(!line||!newLine||newLine===line)throw Error('SOURCE_PREFIX_CONTROL_NO_DELTA');
      fault(poolPath,line,newLine);
    }else if(MODE==='cup-entry')fault(contPath,"  if (country === 'Russia' && year >= 2022) return null;\n",'');
    else if(MODE==='opponent-entry')fault(contPath,"    .filter(c => c.country !== 'Russia' || clubCupFor(c.country, year) !== null)\n",'');
    else if(MODE==='annual-ucl')fault(enginePath,'  if (russiaYear >= 2022) uclApps = 0;\n','');
    else if(MODE==='league-cap'){
      fault(enginePath,'  if (russiaYear >= 2026 && state?.currentLeague === "Russian Premier League") leagueApps = Math.min(leagueApps, 30);\n','');
      fault(enginePath,'  if (russiaYear >= 2026 && state?.currentLeague === "Russian Premier League") leagueApps = Math.min(leagueApps, 30, apps);\n','');
    }else if(MODE==='final-league-cap')fault(enginePath,'  if (russiaYear >= 2026 && state?.currentLeague === "Russian Premier League") leagueApps = Math.min(leagueApps, 30, apps);\n','');
    else if(MODE==='draw-cap')fault(enginePath,'export const LEAGUE_DRAW_CAP = 5;','export const LEAGUE_DRAW_CAP = 4;');
    else if(MODE==='projection-context')fault('lib/soccerCareerTransferBrief.ts',
      '  return project(career.overall, club.tier, club.name, 0, { league: club.league, year: (career.seasons[career.seasons.length - 1]?.year ?? 0) + 1 });\n',
      '  return project(career.overall, club.tier, club.name, 0);\n');
  }
  const transforms=Object.fromEntries([...changed].map(([rel])=>[rel,()=>fs.readFileSync(path.join(OUT,'physical',role,'fault','src',rel),'utf8').replaceAll('\r\n','\n')]));
  const engine=changed.get(enginePath)||fs.readFileSync(path.join(root,'src',enginePath),'utf8').replaceAll('\r\n','\n');
  const observed=uniqueSwap(engine,observeBefore,observeAfter);
  if(!MODE){
    const copiedCRLF=engine.replaceAll('\n','\r\n');
    if(copiedCRLF===engine)throw Error('CRLF_SOURCE_CONTROL_NO_DELTA');
    let rawError;try{uniqueSwap(copiedCRLF,observeBefore,observeAfter);}catch(error){rawError=error;}
    if(rawError?.message!=='SOURCE_ANCHOR_NOT_UNIQUE '+observeBefore.slice(0,80))throw Error('CRLF_SOURCE_CONTROL_RAW_ANCHOR');
    const input=put('physical/'+role+'/crlf-source-control.ts',copiedCRLF);
    const restored=fs.readFileSync(path.join(OUT,input.file),'utf8').replaceAll('\r\n','\n');
    if(restored!==engine)throw Error('CRLF_SOURCE_CONTROL_WHOLE_INVERSE');
    const repeated=uniqueSwap(restored,observeBefore,observeAfter);
    if(repeated.changed!==observed.changed)throw Error('CRLF_SOURCE_CONTROL_OBSERVER_EXACT');
    report.controls.push({role,kind:'copied-crlf-source-read',input,normalizedBytes:Buffer.byteLength(restored),
      normalizedSHA256:sha(restored),rawAnchorRejected:true,wholeInverse:true,observedSourceExact:true,noModelCalls:true,noRandomDraws:true});
  }
  put('physical/'+role+'/observed/src/'+enginePath,observed.changed);
  report.controls.push({role,kind:'passive-appearance-local-observer',index:observed.at,wholeInverse:true,noNewModelCalls:true,noRandomDraws:true});
  transforms[enginePath]=()=>fs.readFileSync(path.join(OUT,'physical',role,'observed','src',enginePath),'utf8').replaceAll('\r\n','\n');
  return transforms;
}
async function main(){
  if(MODE&&!EXPECTED[MODE])throw Error('UNKNOWN_RUSSIA_BRIDGE_CONTROL '+MODE);
  if(process.env.QA_BASE&&process.env.BASE_SOURCE&&path.resolve(process.env.QA_BASE)!==path.resolve(process.env.BASE_SOURCE))throw Error('CONFLICTING_BASE_SOURCE_ROOTS');
  head('1. SOURCE AND FIXED ORIGINAL FINGERPRINTS');
  sourceFiles(ROOT,'patched');
  if(BASE){
    if(execFileSync('git',['-C',BASE,'rev-parse','HEAD'],{encoding:'utf8'}).trim()!==BASE_COMMIT)throw Error('BASE_SOURCE_COMMIT_NOT_636');
    sourceFiles(BASE,'original');
  }
  globalThis.localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{},clear:()=>{}};
  const helper=await import(pathToFileURL(path.join(ROOT,'scripts/lib/careerClubPool.mjs')).href);
  const extra={cont:'lib/soccerCareerContinental.ts',league:'lib/soccerCareerLeague.ts',pool:'data/soccerCareerClubPool.ts',programme:'lib/soccerCareerProgramme.ts',brief:'lib/soccerCareerTransferBrief.ts',format:'data/leagueFormat.ts',market:'lib/managerJobMarket.ts'};
  const temp=path.join(OUT,'bundles');fs.mkdirSync(temp,{recursive:true});
  const original=BASE?await helper.bundleCareerSources({root:path.resolve(BASE),tmpDir:temp,extra,transforms:transformsFor(BASE,'original')}):null;
  const patched=await helper.bundleCareerSources({root:ROOT,tmpDir:temp,extra,transforms:transformsFor(ROOT,'patched')});
  for(const name of ['initCareer','acceptOffer','calcAppearances','simulateUCL','projectLeagueApps','advanceProSeason'])
    if(typeof patched.engine[name]!=='function')throw Error('MISSING_ACTUAL_PUBLIC_API '+name);
  const hand=patched.engine.HAND_CLUBS,pool=patched.pool.CAREER_CLUB_POOL,all=patched.engine.FALLBACK_CLUBS;
  const source=fs.readFileSync(path.join(ROOT,'src/data/soccerCareerClubPool.ts'),'utf8').replaceAll('\r\n','\n');
  const controlledPool=MODE&&['drop-member','early-since','old-prefix'].includes(MODE)
    ?fs.readFileSync(path.join(OUT,'physical/patched/fault/src/data/soccerCareerClubPool.ts'),'utf8').replaceAll('\r\n','\n'):source;
  const rowLines=controlledPool.split('\n').filter(s=>s.startsWith('  { id: "'));
  check(hand.length===190&&sha(compact(hand.map(c=>[c.id,c.name,c.country,c.tier,c.color,c.league])))===FROZEN.hand,'LEGACY','190 original hand rows exact');
  check(sha(rowLines.slice(0,334).join('\n')+'\n')===FROZEN.prefix,'LEGACY','334 original generated source rows remain exact prefix');
  const tuple=c=>[c.id,c.name,c.country,c.tier,c.color,c.league];
  check(sha(compact(pool.slice(0,334).map(tuple)))===FROZEN.generated
    &&[...hand,...pool.slice(0,334)].every(c=>isDeepStrictEqual(Object.keys(c),['id','name','country','tier','color','league'])),'LEGACY','actual bundled old row values and complete six-field shapes remain exact');

  check(sha(compact(Object.entries(patched.pool.CAREER_LEAGUE_LADDER).slice(0,26)))===FROZEN.ladders,'LEGACY','26 original ladders/order exact');
  check(sha(compact(Object.entries(patched.pool.CAREER_POOL_SINCE).slice(0,283)))===FROZEN.since,'SINCE','283 original since entries/order exact');
  check(hand.find(c=>c.name==='Zenit')?.id==='fb-95'&&hand.find(c=>c.name==='Zenit')?.tier===2&&hand.find(c=>c.name==='Zenit')?.color==='#009FDF','LEGACY','Zenit identity/tier/palette held');

  head('2. CURRENT MEMBERSHIP, FIRST-OFFER YEAR AND PROVENANCE');
  const members=all.filter(c=>c.league===RUSSIA),ladder=patched.pool.CAREER_LEAGUE_LADDER;
  check(pool.length===349&&all.length===539&&Object.keys(ladder).length===27&&Object.values(ladder).flat(2).length===466,'CATALOGUE','349 generated,539 total,27 ladders,466 ladder members');
  check(members.length===16&&NEW_NAMES.every(n=>members.some(c=>c.name===n))&&members.some(c=>c.id==='fb-95'),'CATALOGUE','exact16 Russia members including15 new names and originalZenit');
  check(compact(pool.slice(334).map(c=>c.name))===compact(NEW_NAMES),'CATALOGUE','15 new members append in verified CM order');
  check(new Set(all.map(c=>c.id)).size===all.length&&new Set(all.map(c=>c.name)).size===all.length,'CATALOGUE','unique names and IDs');
  const since=patched.pool.CAREER_POOL_SINCE;
  check(Object.keys(since).length===298&&NEW_NAMES.every(n=>since[n]===2026),'SINCE','15 new first-game-offer entries are2026');
  for(const year of [1980,1990,2005,2021,2022,2025,2026,2030]){
    const view=patched.eras.adjustClubsForYear(all,year);
    check(NEW_NAMES.every(n=>view.some(c=>c.name===n)===(year>=2026)),'SINCE','current-only membership in '+year);
    if(original&&year<2026)check(isDeepStrictEqual(view,original.eras.adjustClubsForYear(original.engine.FALLBACK_CLUBS,year)),'SINCE','complete pre2026 catalogue view held '+year);
  }
  const facts=JSON.parse(fs.readFileSync(path.join(ROOT,'scripts/data/soccerCareerFacts.json'),'utf8'));
  const hosts=rows=>new Set((rows||[]).map(r=>new URL(r.url).hostname.replace(/^www\./,''))).size;
  for(const name of NEW_NAMES){
    const row=members.find(c=>c.name===name),colour=facts.clubColours?.clubs?.[name],country=facts.clubCountries?.clubs?.[name];
    check(row?.country==='Russia'&&country?.country==='Russia'&&hosts(country?.sources)>=2,'CATALOGUE',name+' explicit country provenance');
    check(typeof colour?.colour==='string'&&colour.colour.length>2&&hosts(colour.sources)>=2&&row?.color===colour.hex&&patched.cm.clubDefFor(name).color===colour.hex,'CATALOGUE',name+' two-source colour words/decorative palette from CM');
  }
  const world=facts.leagueWorld?.[RUSSIA];
  check(world?.size===16&&world.games===30&&world.shape==='plain'&&isDeepStrictEqual(world.points,[3,1,0]),'CATALOGUE','verified2026 Russia16/30/plain/3-1-0 facts');
  check(patched.league.leagueSizeFor(RUSSIA,2026)===16&&patched.league.leagueSizeFor(RUSSIA,2026,true)===16
    &&patched.league.leagueSizeFor(RUSSIA,2025)===null,'CATALOGUE','dated shared16-member player and manager table');
  check(isDeepStrictEqual(patched.format.leagueFormatFor(RUSSIA,2026),{win:3,draw:1,loss:0})
    &&patched.format.leagueFormatFor(RUSSIA,2025)===null,'CATALOGUE','dated real points-format owner');
  const market=stream('current-russia-manager-market',()=>patched.market.allOfferClubs().filter(c=>c.league===RUSSIA));
  check(!market.error&&market.value.length===16&&['Zenit',...NEW_NAMES].every(name=>market.value.some(c=>c.name===name&&c.country==='Russia')),'CATALOGUE','exact16 ordinary CM market tuples, independent of SC tiers');
  rawCase('current-russia-manager-market',market);
  report.russiaManagerMarketTuple=market.value?.[0]??null;
  rawCase('catalogue',{hand,pool,ladder,since,members});

  head('3. EXACT RUSSIA DRAW GROUP');
  const groups=patched.engine.leagueDrawGroups(all.filter(c=>c.tier===2)),group=groups.find(g=>g.key===RUSSIA+'|2');
  const valid=g=>!!g&&g.clubs.length===16&&g.weight===5&&['Zenit',...NEW_NAMES].every(n=>g.clubs.some(c=>c.name===n));
  check(patched.engine.LEAGUE_DRAW_CAP===5&&valid(group)&&groups.reduce((s,g)=>s+g.weight,0)===43,'DRAW','unchanged cap5, Russia16/5 and tier2 total43');
  if(group){
    const before=clone(group),missing=clone(group),wrongWeight=clone(group);missing.clubs.splice(missing.clubs.findIndex(c=>c.name==='Krasnodar'),1);wrongWeight.weight=4;
    check(!isDeepStrictEqual(missing,before)&&!valid(missing)&&!valid(wrongWeight)&&valid(before)&&isDeepStrictEqual(group,before),'DRAW','copied actual15-member and weight4 guards reject without mutating original');
    rawCase('copied-russia-groups',{before,missing,wrongWeight,restored:clone(group)});
  }

  head('4. DATED ENTRY AND OPPONENT POLICY');
  for(const year of [1990,2005,2021,2022,2025,2026,2030]){
    const own=stream('russia-cup-'+year,()=>patched.cont.clubCupFor('Russia',year));
    rawCase('russia-cup-'+year,own);
    check(!own.error&&(year<2022?own.value?.cup==='ucl':own.value===null),'CUP','Russia cup policy '+year);
    const opponents=patched.cont.continentalOpponents(all,'UEFA',year,'Ajax');
    check(year<2022?opponents.includes('Zenit'):opponents.every(name=>all.some(c=>c.name===name&&c.country!=='Russia')),'OPPONENT','Russian opponent eligibility '+year);
    check(opponents.some(name=>all.some(c=>c.name===name&&c.country!=='Russia')),'OPPONENT','policy retains other UEFA opponents '+year);
  }
  if(MODE){
    if(MODE==='projection-context')await legacyBriefChecks(null,patched);
    if(['annual-ucl','league-cap','final-league-cap'].includes(MODE)){
      const replayRoot=process.env.RUSSIA_REPLAY_ROOT;
      if(!replayRoot)throw Error('RAW_CONTROL_REQUIRES_RETAINED_NORMAL_EVIDENCE');
      const normal=JSON.parse(fs.readFileSync(path.join(replayRoot,'BRIDGE.json'),'utf8'));
      if(normal.status!=='passed'||normal.control!==null)throw Error('RAW_CONTROL_NORMAL_AUTHORITY');
      const selected=normal.cases.filter(c=>c.kind==='russia-appearance');
      if(selected.length!==210)throw Error('RAW_CONTROL_EXACT_210_APPEARANCE_INPUTS');
      for(const row of selected){
        const stored=fs.readFileSync(path.join(replayRoot,row.file));
        if(stored.length!==row.bytes||sha(stored)!==row.sha256)throw Error('RAW_CONTROL_STORED_INPUT_HASH');
        const body=gunzipSync(stored);
        if(body.length!==row.decodedBytes||sha(body)!==row.decodedSHA256)throw Error('RAW_CONTROL_DECODED_INPUT_HASH');
        const actual=JSON.parse(body);
        if(actual.schema!=='RUSSIA_APPEARANCE_CALL_V1'||typeof actual.label!=='string'||!actual.input||!actual.effects||!Array.isArray(actual.result?.random)||actual.result.randomCalls!==actual.result.random.length)throw Error('RAW_CONTROL_APPEARANCE_SCHEMA');
        const result=stream(actual.label+'-physical',()=>patched.engine.calcAppearances(actual.input.overall,actual.input.currentClubTier,actual.input.age,clone(actual.input)),actual.result.random,true);
        rawCase('physical-'+actual.label,{normalFile:row,input:actual.input,normal:actual.result,result});
        check(!result.error&&result.tapeFullyConsumed===true&&result.randomCalls===actual.result.randomCalls,'SETUP','physical appearance returns on exact whole normal tape '+actual.label,result.error);
        if(!result.error)appearanceRules(actual.input,result,actual.label);
      }
    }
    return;
  }

  head('5. OLD INPUTS AND GLOBAL RANDOM PRESERVATION');
  if(original){
    let n=0;
    for(const year of [1990,2005,2021,2022,2025,2026]){
      const candidates=original.eras.adjustClubsForYear(original.engine.FALLBACK_CLUBS,year);
      const selected=new Map();
      for(const club of candidates)if(club.country!=='Russia'||year<2022){
        const key=club.country+'|'+club.league+'|'+club.tier;
        if(!selected.has(key))selected.set(key,club);
      }
      for(const club of selected.values())for(const overall of [60,95]){
        const prepared=stream('prepare-held-'+n,()=>stateFor(original,club,year,overall));
        check(!prepared.error,'SETUP','original complete constructor '+n,prepared.error);
        if(prepared.error)continue;
        const input=prepared.value;
        const pair=sameStream('held-appearance-'+n,
          ()=>original.engine.calcAppearances(overall,club.tier,input.age,clone(input)),
          ()=>patched.engine.calcAppearances(overall,club.tier,input.age,clone(input)));
        check(isDeepStrictEqual(pair.before.value,pair.after.value)&&pair.before.randomCalls===pair.after.randomCalls&&isDeepStrictEqual(pair.before.components,pair.after.components),'PRESERVATION','complete held appearance and calls '+n);
        const cup=sameStream('held-cup-'+n,()=>original.engine.simulateUCL(clone(input),{}),()=>patched.engine.simulateUCL(clone(input),{}));
        check(isDeepStrictEqual(cup.before.value,cup.after.value)&&cup.before.randomCalls===cup.after.randomCalls,'PRESERVATION','complete held cup and calls '+n);
        const oldBand=original.engine.projectLeagueApps(overall,club.tier,club.name,0);
        check(isDeepStrictEqual(oldBand,patched.engine.projectLeagueApps(overall,club.tier,club.name,0)),'PROJECTION','original four-argument projection held '+n);
        n++;
      }
    }
    report.preservationCases=n;
    check(n>0,'PRESERVATION','immutable original matrix ran');
  }else console.log('  immutable original modules not supplied; no runtime preservation claim');

  head('6. RUSSIA RAW APPEARANCES, PROGRAMME, INJURY AND FULL SEASON');
  let injuries=0,programmed=0,annuals=0;
  const annualSamples={healthy:null,severe:null};
  for(const year of [2021,2022,2025,2026,2030]){
    const rows=year>=2026?members:[hand.find(c=>c.name==='Zenit')];
    for(const row of rows)for(const overall of [60,95,99])for(const programme of [false,true]){
      const label='current-appearance-'+year+'-'+row.id+'-'+overall+'-'+Number(programme);
      const prepared=stream(label+'-prepare',()=>{
        let state=stateFor(patched,row,year,overall);
        if(programme)state=patched.programme.chooseProgramme(state,'promise','starter');
        return state;
      });
      check(!prepared.error,'SETUP','prepared complete public career '+label,prepared.error);
      if(prepared.error)continue;
      const input=prepared.value,effects=patched.programme.programmeEffects(input);
      if(programme){check(effects.appsMult>1,'LEAGUE_APPS','actual nonneutral programme '+label);programmed++;}
      const result=stream(label,()=>patched.engine.calcAppearances(overall,row.tier,input.age,clone(input)));
      rawCase(label,{schema:'RUSSIA_APPEARANCE_CALL_V1',label,input,effects,result,preparation:prepared},'russia-appearance');
      check(!result.error,'SETUP','actual appearance return '+label,result.error);
      if(result.error)continue;
      appearanceRules(input,result,label);
      if(result.value.injured)injuries++;
      const cup=stream(label+'-cup',()=>patched.engine.simulateUCL(clone(input),{}));
      rawCase(label+'-cup',{input,result:cup});
      check(!cup.error,'SETUP','actual cup return '+label,cup.error);
      if(year>=2022)check(cup.value?.qualified===false&&cup.value.matches.length===0&&cup.value.playerGoals===0&&cup.value.result==='N/A'&&!cup.value.firstStage,'CUP','no suspended campaign '+label);
      if(year===2026&&overall===95){
        const played=stream(label+'-annual',()=>patched.engine.advanceProSeason(clone(input),all));
        const annualFrame=rawCase(label+'-annual',{input,result:played});
        check(!played.error,'SETUP','actual public annual step '+label,played.error);
        if(!played.error){
          const records=played.value.seasons.filter(s=>s.year===2026&&s.club===row.name&&s.type==='playing');
          check(records.length===1,'LEAGUE_APPS','one actual2026 raw playing record '+label);
          for(const season of records){
            check(Number.isInteger(season.leagueApps)&&season.leagueApps>=0&&season.leagueApps<=30,'LEAGUE_APPS','actual annual leagueApps0..30 '+label,season);
            const observed=annualVerdicts(input,played.value,season);
            for(const verdict of observed.checks)check(verdict.ok,verdict.family,verdict.message+' '+label,season);
            if(observed.checks.every(v=>v.ok)&&!annualSamples[observed.kind])annualSamples[observed.kind]=annualCopiedControls(input,played.value,season,label,annualFrame,observed.kind);
          }
          annuals+=records.length;
        }
      }
    }
  }
  report.actualAppearanceCoverage={injured:injuries,nonneutralProgramme:programmed,annualRecords:annuals};
  report.annualObserverSamples=annualSamples;
  check(annualSamples.healthy&&annualSamples.severe,'CATALOGUE','both actual annual branches supply copied guard controls');
  check(injuries>0&&programmed>0&&annuals===32,'LEAGUE_APPS','actual injury, programme and32 prepared full-season records exercised');
  console.log('  observed injuries '+injuries+', programme inputs '+programmed+', full annual records '+annuals);

  head('7. CURRENT PROJECTION AND PREPARED SAVED-BRIEF COMPATIBILITY');
  for(const row of members)for(const year of [2021,2022,2025,2026,2030])for(const overall of [60,85,99]){
    const old=patched.engine.projectLeagueApps(overall,row.tier,row.name,0);
    const current=patched.engine.projectLeagueApps(overall,row.tier,row.name,0,{league:RUSSIA,year});
    const want=year>=2026?{min:Math.min(old.min,30),max:Math.min(old.max,30)}:old;
    check(isDeepStrictEqual(current,want),'PROJECTION','exact contextual band '+row.name+' '+year+' '+overall);
    check(isDeepStrictEqual(patched.engine.projectLeagueApps(overall,row.tier,row.name,0,{league:'Premier League',year}),old),'PROJECTION','non-Russia context held');
  }
  // The prepared saved-brief unit block is integrated below before source freeze.
  await legacyBriefChecks(original,patched);

  head('8. SOURCE HOLDS AND CLOSING');
}
function annualVerdicts(input,played,season){
  const severe=!!season.injury&&season.injurySevere===true;
  if(severe){
    const rehab={name:season.injury,weeks:season.injuryWeeks??16,
      year:(input.seasons.at(-1)?.year??0)+1,specialistCost:input.netWorth>=1.6?0.8:null};
    return {kind:'severe',checks:[
      {ok:played.phase==='rehab_choice'&&isDeepStrictEqual(played.pendingRehab,rehab)
        &&season.leagueFinish===undefined&&season.leagueSize===undefined
        &&season.leagueTitle===false&&season.domesticCup===false
        &&isDeepStrictEqual(played.pendingSummary,input.pendingSummary),
        family:'CATALOGUE',message:'source-owned severe injury stops before the personal table'},
      {ok:season.championsLeague===false&&!season.clubCupTitle&&!season.clubCupRun?.qualified
        &&isDeepStrictEqual(played.lastUCLResult,input.lastUCLResult),
        family:'CUP',message:'severe injury keeps prior whole cup result and creates no European title/campaign'}
    ]};
  }
  return {kind:'healthy',checks:[
    {ok:season.leagueSize===16&&Number.isInteger(season.leagueFinish)&&season.leagueFinish>=1&&season.leagueFinish<=16,
      family:'CATALOGUE',message:'actual annual16-member finish record'},
    {ok:season.championsLeague===false&&!season.clubCupTitle&&!season.clubCupRun?.qualified&&played.lastUCLResult?.qualified===false,
      family:'CUP',message:'actual annual records have no suspended European title/campaign'}
  ]};
}
function annualCopiedControls(input,played,season,label,frame,kind){
  const index=played.seasons.indexOf(season);
  if(index<0)throw Error('ANNUAL_CONTROL_SOURCE_ROW');
  const snapshot=JSON.parse(compact({input,played})),beforeRaw=compact(snapshot);
  const change=(object,key,value)=>{
    const had=Object.hasOwn(object,key),old=object[key];object[key]=value;
    return ()=>{if(had)object[key]=old;else delete object[key];};
  };
  const mutations=kind==='healthy'?[
    ['table-size','CATALOGUE',copy=>change(copy.played.seasons[index],'leagueSize',15)],
    ['cup-qualification','CUP',copy=>change(copy.played.lastUCLResult,'qualified',true)]
  ]:[
    ['phase','CATALOGUE',copy=>change(copy.played,'phase','playing')],
    ['rehab-weeks','CATALOGUE',copy=>change(copy.played.pendingRehab,'weeks',copy.played.pendingRehab.weeks+1)],
    ['omitted-table','CATALOGUE',copy=>change(copy.played.seasons[index],'leagueSize',16)],
    ['prior-whole-cup','CUP',copy=>change(copy.played,'lastUCLResult',{qualified:false,matches:[],result:'N/A',playerGoals:0,isTopScorer:false})],
    ['european-title','CUP',copy=>change(copy.played.seasons[index],'championsLeague',true)]
  ];
  const healthy=annualVerdicts(snapshot.input,snapshot.played,snapshot.played.seasons[index]);
  check(healthy.kind===kind&&healthy.checks.every(v=>v.ok),'CATALOGUE','copied actual annual reference is healthy under its source-owned branch '+label);
  for(const [name,family,mutate] of mutations){
    const fault=JSON.parse(beforeRaw),undo=mutate(fault),faultRaw=compact(fault);
    const rejected=annualVerdicts(fault.input,fault.played,fault.played.seasons[index]);
    const failed=rejected.checks.filter(v=>!v.ok).map(v=>v.family);
    undo(fault);const restoredRaw=compact(fault);
    const restored=annualVerdicts(fault.input,fault.played,fault.played.seasons[index]);
    const owned=faultRaw!==beforeRaw&&failed.length===1&&failed[0]===family
      &&restoredRaw===beforeRaw&&restored.checks.every(v=>v.ok)&&compact(snapshot)===beforeRaw;
    check(owned,family,'copied actual '+kind+' annual '+name+' rejects its owned guard and restores all JSON bytes '+label);
    rawCase('annual-copied-'+kind+'-'+name,{sourceAnnual:frame,index,kind,name,
      beforeRaw,faultRaw,restoredRaw,rejected,restored,owned},'annual-observer-copied');
  }
  return {label,sourceAnnual:frame,controls:mutations.length};
}
function appearanceRules(input,result,label){
  const year=(input.seasons.at(-1)?.year??0)+1;
  const rows=result.components.filter(v=>v.player===input.playerName&&v.club===input.currentClub&&v.year===year);
  check(rows.length===1,'ANNUAL_UCL','one passive actual appearance-component row '+label);
  if(year>=2022)check(rows.length===1&&rows[0].uclApps===0,'ANNUAL_UCL','zero suspended UCL contribution '+label,rows);
  if(year>=2026&&input.currentLeague===RUSSIA)
    check(Number.isInteger(result.value.leagueApps)&&result.value.leagueApps>=0&&result.value.leagueApps<=30&&result.value.leagueApps<=result.value.apps,'LEAGUE_APPS','final raw leagueApps0..30 and within total '+label,result.value);
}
async function legacyBriefChecks(original,patched){
  const reference=original||patched;
  let factoryState,factory;
  if(MODE){
    const root=process.env.RUSSIA_REPLAY_ROOT;
    if(!root)throw Error('PROJECTION_CONTROL_REQUIRES_NORMAL_INPUT');
    const normal=JSON.parse(fs.readFileSync(path.join(root,'BRIDGE.json'),'utf8'));
    const rows=normal.cases.filter(c=>c.kind==='russia-brief-unit');
    if(normal.status!=='passed'||rows.length!==1)throw Error('PROJECTION_CONTROL_NORMAL_CENSUS');
    const row=rows[0],stored=fs.readFileSync(path.join(root,row.file));
    if(stored.length!==row.bytes||sha(stored)!==row.sha256)throw Error('PROJECTION_CONTROL_STORED_HASH');
    const body=gunzipSync(stored);
    if(body.length!==row.decodedBytes||sha(body)!==row.decodedSHA256)throw Error('PROJECTION_CONTROL_DECODED_HASH');
    const value=JSON.parse(body);
    if(value.schema!=='RUSSIA_PREPARED_BRIEF_UNIT_V1')throw Error('PROJECTION_CONTROL_SCHEMA');
    factoryState=value.factoryState;
  }else{
    factory=stream('prepared-brief-factory',()=>{
      const stats=Object.fromEntries(['pace','shooting','passing','dribbling','defending','physical','reflexes'].map(k=>[k,95]));
      return reference.engine.initCareer('Prepared Russia legacy brief','Russia','ST','2020s',stats,95,2025,reference.engine.FALLBACK_CLUBS,null,99,null,null,'Ajax');
    });
    check(!factory.error,'SETUP','complete actual constructor for prepared saved-brief unit',factory.error);
    if(factory.error)return;
    factoryState=factory.value;
  }
  const unit=stream('prepared-brief-read',()=>probePreparedBaselineZenitBrief({
    baselineEngine:reference.engine,baselineBrief:reference.brief,baselineSave:reference.save,
    candidateEngine:patched.engine,candidateBrief:patched.brief,candidateSave:patched.save,
    factoryState:clone(factoryState),baselineClubs:reference.engine.FALLBACK_CLUBS,candidateClubs:patched.engine.FALLBACK_CLUBS
  }));
  check(!unit.error,'LEGACY_BRIEF','prepared old-band Zenit result/raw remains readable and malformed neighbouring band rejects',unit.error);
  if(unit.error){rawCase('prepared-brief-unit-error',{factoryState,factory,unit});return;}
  unit.value.scope=original?'immutable636-factory prepared unit input; not natural or real-user history':'current-factory prepared old-four-argument-band unit input; no immutable original module supplied';
  const prepared=unit.value.prepared;
  const fresh=patched.brief.setTransferBrief(clone(prepared),'minutes',0);
  const zenit=patched.engine.FALLBACK_CLUBS.find(c=>c.name==='Zenit');
  const madrid=patched.engine.FALLBACK_CLUBS.find(c=>c.name==='Real Madrid');
  const eligible=[zenit,madrid];
  const freshRaw=patched.save.serializeSoccerCareerSave(fresh);
  const preview=patched.brief.previewTransferBrief(fresh,eligible,patched.engine.projectLeagueApps);
  const choices=patched.brief.transferBriefCandidates(fresh,eligible,patched.engine.projectLeagueApps);
  const home=preview.options.find(v=>v.id==='home');
  check(choices.length===1&&choices[0].name==='Real Madrid','PROJECTION','fresh most-minutes ranking uses current bands rather than old Russia34..38');
  check(home?.matchingCount===1&&home.projection?.min<=30&&home.projection?.max<=30,'PROJECTION','fresh Russia home-preview band never quotes over30');
  check(patched.save.serializeSoccerCareerSave(fresh)===freshRaw,'PROJECTION','fresh preview and ranking keep every saved byte');
  rawCase('prepared-brief-unit',{schema:'RUSSIA_PREPARED_BRIEF_UNIT_V1',factoryState,factory,unit,fresh,eligible,preview,choices,freshRaw},'russia-brief-unit');
}
async function finish(){
  try{await main();}
  catch(e){report.setupError={name:e.name,message:e.message,stack:e.stack};console.error(e.stack||e);}
  finally{
    section='8. SOURCE HOLDS AND CLOSING';
    for(const row of report.sources){
      const body=fs.readFileSync(path.join(row.role==='original'?BASE:ROOT,row.file));
      check(body.length===row.bytes&&sha(body)===row.sha256,'SOURCE_HOLD','source bytes held '+row.file);
    }
    if(report.setupError){report.status='setup-failed';process.exitCode=2;}
    else if(MODE){
      report.controlOwnership=classifyControl(MODE,report.failures);
      const owned=report.controlOwnership.owned;
      report.controlOwned=owned;report.status=owned?'owned-physical-failure':'control-not-owned';
      process.exitCode=owned?1:2;
    }else{report.status=report.failures.length?'failed':'passed';process.exitCode=report.failures.length?1:0;}
    rawCase('complete-global-random-ledger',{randomCalls,sourceAdvances,values:randomLedger},'random-ledger');
    Math.random=seededRandom;Object.assign(report,{randomCalls,sourceAdvances});
    json('BRIDGE.json',report);
    console.log('simRussiaCareerBridge: '+report.status+', '+report.failures.length+' finding(s), '+report.checks+' checks, '+randomCalls+' actual Math.random calls');
    console.log('  evidence '+OUT);
  }
}
async function controlRunner(){
  const normal=JSON.parse(fs.readFileSync(path.join(OUT,'BRIDGE.json'),'utf8'));
  if(normal.status!=='passed'||normal.control!==null)throw Error('CONTROLS_REQUIRE_PASSED_NORMAL_EVIDENCE');
  const results=[];
  for(const mode of Object.keys(EXPECTED)){
    const controlOut=path.join(OUT,'controls',mode);fs.mkdirSync(controlOut,{recursive:true});
    const command=[fileURLToPath(import.meta.url)];
    let native=0,stdout='',stderr='';
    try{stdout=execFileSync(process.execPath,command,{encoding:'utf8',env:{...process.env,RUSSIA_BRIDGE_CONTROL:mode,RUSSIA_EVIDENCE_ROOT:controlOut,RUSSIA_REPLAY_ROOT:OUT},stdio:['ignore','pipe','pipe']});}
    catch(e){native=e.status??2;stdout=String(e.stdout??'');stderr=String(e.stderr??'');}
    fs.writeFileSync(path.join(controlOut,'stdout.log'),stdout);fs.writeFileSync(path.join(controlOut,'stderr.log'),stderr);
    const child=JSON.parse(fs.readFileSync(path.join(controlOut,'BRIDGE.json'),'utf8'));
    const independent=classifyControl(mode,child.failures);
    const owned=native===1&&independent.owned&&child.controlOwned===true&&child.status==='owned-physical-failure'&&child.control===mode;
    if(mode==='cup-entry'&&owned){
      const original=clone(child.failures),noPrimary=original.filter(f=>f.family!=='CUP'),extra=[...clone(original),{family:'UNEXPECTED_CONTROL_FINDING',message:'copied extra finding'}];
      const a=classifyControl(mode,noPrimary),b=classifyControl(mode,extra);
      const copiedOwned=!a.owned&&!b.owned&&noPrimary.some(f=>f.family==='OPPONENT')&&isDeepStrictEqual(child.failures,original);
      json('COPIED-CONTROL-CLASSIFIER.json',{owned:copiedOwned,original,noPrimary,extra,noPrimaryVerdict:a,extraVerdict:b,restored:clone(child.failures)});
      if(!copiedOwned)throw Error('CONTROL_CLASSIFIER_COPIED_INVERSES');
    }
    const row={mode,command:[process.execPath,...command],native,owned,classification:independent,report:'controls/'+mode+'/BRIDGE.json'};
    results.push(row);console.log('  physical '+mode+': native'+native+', owned '+owned);
  }
  json('PHYSICAL-CONTROLS.json',{status:results.every(r=>r.owned)?'passed':'failed',normal:'BRIDGE.json',results});
  process.exitCode=results.every(r=>r.owned)?0:1;
  console.log('simRussiaCareerBridge controls: '+(process.exitCode?'failed':'all physical controls owned'));
}
if(process.argv.includes('--controls')){
  controlRunner().catch(e=>{console.error(e.stack||e);process.exitCode=2;}).finally(()=>{Math.random=seededRandom;});
}else finish();

import assert from 'node:assert/strict';

/*
 * Source-only unit probe. The caller must retain the complete factoryState
 * emitted by baseline initCareer with Russia nationality, a non-Russia
 * academy, overall high enough for an old band above30, and startYear>=2025.
 * This prepares age/window/result fields explicitly. It is not a natural
 * progression, natural Zenit draw, real-user save or authentic old offer.
 */
export function probePreparedBaselineZenitBrief({
  baselineEngine, baselineBrief, baselineSave,
  candidateEngine, candidateBrief, candidateSave,
  factoryState, baselineClubs, candidateClubs,
}) {
  const factoryBefore = structuredClone(factoryState);
  assert.equal(factoryState.nationality, 'Russia');
  assert.notEqual(factoryState.currentClubCountry, 'Russia');
  assert.ok(factoryState.seasons.at(-1)?.year >= 2025);
  assert.equal(factoryState.retired, false);
  assert.ok(!factoryState.loan && factoryState.transferBrief === undefined);
  const zenit = baselineClubs.find(club => club.name === 'Zenit');
  assert.ok(zenit && zenit.country === 'Russia');
  const prepared = {
    ...factoryState, age: Math.max(18, factoryState.age),
    phase: 'transfer_window', transferSituation: { type: 'no_interest' },
  };
  const changedFactoryFields = ['age', 'phase', 'transferSituation'];
  for (const key of Object.keys(factoryState)) {
    if (!changedFactoryFields.includes(key)) {
      assert.deepEqual(prepared[key], factoryState[key], 'Prepared input held field ' + key);
    }
  }
  const oldBand = baselineEngine.projectLeagueApps(prepared.overall, zenit.tier, zenit.name, 0);
  const currentBand = candidateEngine.projectLeagueApps(
    prepared.overall, zenit.tier, zenit.name, 0,
    { league: zenit.league, year: prepared.seasons.at(-1).year + 1 },
  );
  assert.ok(oldBand.max > 30 && oldBand.max > oldBand.min);
  assert.ok(currentBand.min <= 30 && currentBand.max <= 30);
  assert.notDeepEqual(oldBand, currentBand);
  const withBrief = baselineBrief.setTransferBrief(prepared, 'home', 0);
  assert.notEqual(withBrief, prepared);
  const offered = baselineBrief.storeTransferBriefResult(withBrief, {
    status: 'offered',
    offer: { club: { ...zenit }, contractYears: 3, wage: 5000, transferFee: 0 },
    eligibleCount: 1, matchingCount: 1, projection: { ...oldBand },
  });
  const oldBrief = baselineBrief.readTransferBrief(offered, baselineEngine.projectLeagueApps);
  assert.ok(oldBrief && oldBrief.result?.status === 'offered');
  assert.equal(oldBrief.result.offer.club.name, 'Zenit');
  const raw = baselineSave.serializeSoccerCareerSave(offered);
  const loaded = candidateSave.parseSoccerCareerSave(raw);
  assert.equal(candidateSave.isSoccerCareerSave(loaded), true);
  assert.equal(candidateSave.serializeSoccerCareerSave(loaded), raw);
  const read = candidateBrief.readTransferBrief(loaded, candidateEngine.projectLeagueApps);
  assert.deepEqual(read, oldBrief);
  const loadedBefore = structuredClone(loaded);
  const decision = candidateEngine.requestTransferDecision(loaded, candidateClubs);
  assert.equal(decision, loaded, 'Existing offered result returns the same state object');
  assert.deepEqual(loaded, loadedBefore);
  assert.equal(candidateSave.serializeSoccerCareerSave(decision), raw);
  const fault = structuredClone(loaded);
  const oldMax = fault.transferBrief.result.projection.max;
  fault.transferBrief.result.projection.max = oldMax - 1;
  assert.ok(fault.transferBrief.result.projection.max >= fault.transferBrief.result.projection.min);
  assert.notDeepEqual(fault.transferBrief.result.projection, oldBand);
  assert.notDeepEqual(fault.transferBrief.result.projection, currentBand);
  const faultRaw = candidateSave.serializeSoccerCareerSave(fault);
  assert.notEqual(faultRaw, raw);
  assert.equal(candidateBrief.readTransferBrief(fault, candidateEngine.projectLeagueApps), null);
  fault.transferBrief.result.projection.max = oldMax;
  assert.deepEqual(fault, loaded);
  assert.equal(candidateSave.serializeSoccerCareerSave(fault), raw);
  assert.deepEqual(factoryState, factoryBefore);
  return {
    scope: 'baseline-generated prepared input, not a naturally drawn or real-user old offer',
    preparedFields: changedFactoryFields,
    preparedOfferFields: { contractYears: 3, wage: 5000, transferFee: 0, eligibleCount: 1, matchingCount: 1 },
    factoryBefore, prepared, offered, oldBrief, oldBand, currentBand,
    raw, loaded, faultRaw, restoredRaw: raw, decisionReturnedSameInput: true,
  };
}
