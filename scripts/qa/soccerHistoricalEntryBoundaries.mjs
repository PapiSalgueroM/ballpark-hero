import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';

const args=process.argv.slice(2);
assert.equal(args.length,6,'--out DIR --spec JSON --original-bodies DIR');
const arg=k=>{const i=args.indexOf(k);assert(i>=0&&args[i+1],k);return args[i+1];};
const root=process.cwd(),out=path.resolve(arg('--out')),original=path.resolve(arg('--original-bodies'));
assert(out!==root&&!out.startsWith(root+path.sep),'Evidence outside checkout');
assert(process.env.CI&&process.env.SIM_NETWORK==='offline'&&process.env.GIT_NO_LAZY_FETCH==='1');
assert.equal(process.env.NODE_OPTIONS,'--require='+path.join(root,'scripts/lib/offlineTransport.cjs'));
const spec=JSON.parse(await fs.readFile(arg('--spec'),'utf8'));
assert.equal(spec.authorization,'CANDIDATE_AFTER_OWNED_ORIGINAL_ADMITTED');
assert.match(spec.candidate,/^[a-f0-9]{40}$/);assert.match(spec.tree,/^[a-f0-9]{40}$/);
const git=(...a)=>execFileSync('git',a,{encoding:'utf8',env:{...process.env,GIT_NO_LAZY_FETCH:'1'}});
assert.equal(git('rev-parse','HEAD^').trim(),spec.candidate);
assert.equal(git('rev-parse',spec.candidate+'^{tree}').trim(),spec.tree);
assert.equal(git('status','--porcelain=v1','--untracked-files=all'),'');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const blob=b=>crypto.createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
const copy=x=>JSON.parse(JSON.stringify(x));
await fs.mkdir(out,{recursive:true});
const source={};
for(const [file,pin]of Object.entries(spec.sourcePins)){
  assert.match(pin,/^[a-f0-9]{40}$/);const body=await fs.readFile(path.join(root,file));
  assert.equal(blob(body),pin,file);source[file]=sha(body);
}
assert(spec.sourcePins['src/lib/soccerHistoricalArrivals.ts'],'Bind actual helper source');
const oldPins={'src/lib/soccerCareerEngine.ts':'94ccfb82dace9fc099c670357472732973e11d73','src/lib/soccerPhone.ts':'f81e5a1b5207d776aea9594e28f130d0e8888832'};
const bodies=new Map();
for(const [file,pin]of Object.entries(oldPins)){const body=await fs.readFile(path.join(original,file));assert.equal(blob(body),pin,'Immutable original '+file);bodies.set(path.join(root,file),body.toString('utf8'));}
const entry=(withHelper)=>['export * as E from '+JSON.stringify(path.join(root,'src/lib/soccerCareerEngine.ts'))+';',
  'export * as P from '+JSON.stringify(path.join(root,'src/lib/soccerPhone.ts'))+';',
  'export * as C from '+JSON.stringify(path.join(root,'src/lib/soccerCareerSave.ts'))+';',
  'export * as G from '+JSON.stringify(path.join(root,'src/lib/soccerOwnerGate.ts'))+';',
  ...(withHelper?['export * as H from '+JSON.stringify(path.join(root,'src/lib/soccerHistoricalArrivals.ts'))+';']:[])].join('\n');
const math=Math.random,rows=[],imports={},preparations=[];
let values=[],lastDiagnostic=null;
function tape(value,fn){const prior=Math.random;values=[];Math.random=()=>{values.push(value);return value;};try{const result=fn();return{result,draws:[...values]};}finally{Math.random=prior;}}
async function bundle(mode){
  const ep=path.join(out,mode+'-entry.mjs'),dest=path.join(out,mode+'.mjs');await fs.writeFile(ep,entry(mode==='candidate'));
  await build({entryPoints:[ep],outfile:dest,bundle:true,format:'esm',platform:'node',alias:{'@':path.join(root,'src')},logLevel:'error',
    plugins:mode==='original'?[{name:'immutable-original-two-source-overlay',setup(b){b.onLoad({filter:/soccerCareerEngine\.ts$|soccerPhone\.ts$/},a=>bodies.has(a.path)?{contents:bodies.get(a.path),loader:'ts',resolveDir:path.dirname(a.path)}:undefined);}}]:[]});
  const prior=Math.random;let state=7301;values=[];Math.random=()=>{state=state*16807%2147483647;const n=(state-1)/2147483646;values.push(n);return n;};
  try{const kit=await import(pathToFileURL(dest).href);await kit.G.loadOwnerTail();imports[mode]=[...values];return kit;}finally{Math.random=prior;}
}
try{
  const B=await bundle('original'),K=await bundle('candidate');
  assert.deepEqual(imports.candidate,imports.original,'SC_ENTRY_BOUNDARY_IMPORT_TAPE');
  for(const name of ['recordSoccerHistoricalArrivals','readSoccerHistoricalArrivals','hasSoccerHistoricalPlayer'])assert.equal(typeof K.H[name],'function',name);
  const init=(kit,year)=>kit.E.initCareer('Boundary Tester','Spain','CM','2005-09',
    {pace:60,shooting:60,passing:60,dribbling:60,defending:60,physical:60,reflexes:60},60,year,kit.E.FALLBACK_CLUBS,null,85,null,null,null);
  const setup=tape(.5,()=>{const youth=init(B,2007),offers=B.E.advanceYouthYear(youth,B.E.FALLBACK_CLUBS);
    const offer=offers.pendingOffers.find(o=>o.isHomegrown)??offers.pendingOffers[0];assert(offer);return B.E.acceptOffer(offers,offer);});
  const pro=setup.result;assert.equal(pro.seasons.at(-1).year,2008);
  const opaque={version:999,players:[{id:'future:opaque',entryYear:2009,club:'opaque',moves:[]}],extension:{keep:['all','fields']}};
  const entryRow={id:'soccer:neymar',entryYear:2009,entryClub:'Santos'};
  const ledger=s=>s.historicalArrivals;
  const noDraw=draws=>assert.equal(draws.length,0,'SC_ENTRY_HELPER_NO_GLOBAL_DRAW');
  const sameLegacy=(a,b)=>assert.deepEqual(a,b,'SC_ENTRY_BOUNDARY_LEGACY_FULL');
  const supported=s=>{s.historicalArrivals={version:1,players:[]};return s;};
  const year=s=>s.seasons.at(-1).year;
  const frame=(kit,s)=>{const saved=kit.C.serializeSoccerCareerSave(s),parsed=kit.C.parseSoccerCareerSave(saved);
    assert(kit.C.isSoccerCareerSave(parsed));assert.deepEqual(parsed,copy(s));return{state:copy(s),saved,sha256:sha(saved)};};
  const baseInput=()=>copy(pro);
  const definitions=[
    ['old-rehab-record',s=>{s.phase='rehab_choice';s.age+=1;s.pendingRehab={name:'Declared old injury',weeks:20,year:2009,specialistCost:null};},(k,s)=>k.E.applyRehabChoice(s,1),.5,s=>s.seasons.at(-1).injury==='Declared old injury'],
    ['youth',null,(k,s)=>k.E.advanceYouthYear(s,k.E.FALLBACK_CLUBS),.5,s=>s.seasons.at(-1).type==='youth'],
    ['match-fixing-ban',s=>{s.matchFixBanned=2;},(k,s)=>k.E.advanceProSeason(s,k.E.FALLBACK_CLUBS),.5,s=>s.seasons.at(-1).club==='BANNED'],
    ['prison',s=>{s.prisonSeasons=1;},(k,s)=>k.E.advanceProSeason(s,k.E.FALLBACK_CLUBS),.5,s=>s.seasons.at(-1).club==='PRISON'],
    ['conviction',s=>{s.corruptionHeat=100;s.dirtyMoney=1;},(k,s)=>k.E.advanceProSeason(s,k.E.FALLBACK_CLUBS),.000001,s=>s.seasons.at(-1).club==='CONVICTED'],
    ['ped-ban',s=>{s.pedActive=true;s.pedSeasonsRemaining=1;},(k,s)=>k.E.advanceProSeason(s,k.E.FALLBACK_CLUBS),.000001,s=>s.seasons.at(-1).club==='BANNED (PED)'],
    ['forced-retirement',s=>{s.age=44;s.seasons.at(-1).age=44;},(k,s)=>k.E.advanceProSeason(s,k.E.FALLBACK_CLUBS),.5,s=>s.seasons.at(-1).type==='retired'],
    ['severe-injury',null,(k,s)=>k.E.advanceProSeason(s,k.E.FALLBACK_CLUBS),.000001,s=>s.phase==='rehab_choice'&&s.seasons.at(-1).injurySevere===true],
    ['ordinary-pro',null,(k,s)=>k.E.advanceProSeason(s,k.E.FALLBACK_CLUBS),.999,s=>s.seasons.at(-1).type==='playing'&&!s.seasons.at(-1).injurySevere],
    ['old-conviction-record',s=>{s.phase='newspaper';s.pendingSummary=null;s.prisonSeasons=1;s.age+=1;},(k,s)=>k.E.dismissNewspaper(s),.5,s=>s.seasons.at(-1).club==='CONVICTED'],
    ['accepted-retirement',s=>{s.phase='retirement_suggestion';s.age+=1;},(k,s)=>k.E.acceptRetirementSuggestion(s),.5,s=>s.seasons.at(-1).type==='retired'],
  ];
  const withoutNew=s=>{s=copy(s);delete s.historicalArrivals;if(s.phone?.clubs)delete s.phone.clubs.Neymar;return s;};
  function checkArrival(s){assert.deepEqual(ledger(s),{version:1,players:[entryRow]},'SC_ENTRY_BOUNDARY_ARRIVAL');assert.equal(K.P.worldClubOf(s,'Neymar'),'Santos','SC_ENTRY_BOUNDARY_CLUB');}
  function execute(name,prepare,call,value,branch,kind='player'){
    const preparation=tape(.5,()=>{const input=name==='youth'?init(B,2008):baseInput();prepare?.(input);return input;});
    const input=preparation.result;
    preparations.push({name,kind,originalOnly:true,sharedExactPreparedInputForBothApps:true,draws:preparation.draws,input:copy(input)});
    for(const mode of ['legacy','opaque','supported']){
      const prepared=copy(input);if(mode==='opaque')prepared.historicalArrivals=copy(opaque);if(mode==='supported')supported(prepared);
      const a=copy(prepared),b=copy(prepared),before=copy(prepared);
      lastDiagnostic={name,kind,mode,declared:true,input:before};
      const old=tape(value,()=>call(B,a)),now=tape(value,()=>call(K,b));
      const actual={name,kind,mode,declared:true,randomValue:value,input:before,originalInputAfter:copy(a),candidateInputAfter:copy(b),
        original:frame(B,old.result),candidate:frame(K,now.result),originalGlobal:old.draws,candidateGlobal:now.draws};rows.push(actual);lastDiagnostic=actual;
      assert(branch(old.result)&&branch(now.result),'Actual intended branch '+name);
      if(kind==='player')assert.equal(year(now.result),2009,'Actual committed year '+name);
      assert.deepEqual(now.draws,old.draws,'SC_ENTRY_BOUNDARY_GLOBAL_TAPE '+name);
      if(mode==='supported'){
        checkArrival(now.result);assert.deepEqual(ledger(b),before.historicalArrivals,'Supported prior record held '+name);
        assert.deepEqual(withoutNew(now.result),withoutNew(old.result),'SC_ENTRY_BOUNDARY_OTHER_STATE '+name);
      }else{
        sameLegacy(frame(K,now.result),frame(B,old.result));
        assert.deepEqual(b,a,'SC_ENTRY_BOUNDARY_INPUT_MUTATION_PARITY '+name);
        if(mode==='opaque')assert.deepEqual(ledger(now.result),opaque,'SC_ENTRY_BOUNDARY_OPAQUE '+name);
        else assert(!Object.hasOwn(now.result,'historicalArrivals'),'SC_ENTRY_BOUNDARY_ABSENT '+name);
      }

    }
  }
  for(const row of definitions)execute(...row);
  const tailPrepare=(choice,unemployed=false)=>s=>{
    const retired=B.E.manualRetire(s);retired.netWorth=1000;
    const chosen=B.E.choosePostRetirement(retired,choice,B.E.FALLBACK_CLUBS);
    assert(chosen!==s&&chosen[choice+'State'],'Actual tail constructor '+choice);
    if(unemployed){chosen.managerState.unemployed=true;chosen.managerState.seasonsOut=0;}
    for(const key of Object.keys(s))delete s[key];Object.assign(s,chosen);
  };
  execute('manager-employed',tailPrepare('manager'),(k,s)=>k.E.advanceManagerSeason(s,k.E.FALLBACK_CLUBS),.5,s=>s.managerState?.season===1,'tail');
  execute('manager-unemployed',tailPrepare('manager',true),(k,s)=>k.E.advanceManagerSeason(s,k.E.FALLBACK_CLUBS),.5,s=>s.managerState?.season===1&&s.managerState?.unemployed===true,'tail');
  execute('pundit',tailPrepare('pundit'),(k,s)=>k.E.advancePunditSeason(s,'praise_player'),.5,s=>s.punditState?.season===1,'tail');
  execute('owner',tailPrepare('owner'),(k,s)=>k.E.advanceOwnerSeason(s,k.E.FALLBACK_CLUBS),.5,s=>s.ownerState?.season===1,'tail');
  assert.equal(rows.length,45);assert.equal(preparations.length,15);
  const direct=[];let s=supported(baseInput());
  for(const y of [2008,2009,2009,2015]){
    const prior=copy(s),next={...s};const call=tape(.5,()=>K.H.recordSoccerHistoricalArrivals(next,y));
    lastDiagnostic={name:'direct-helper',year:y,before:prior,after:copy(next),draws:call.draws};noDraw(call.draws);assert.deepEqual(s,prior,'SC_ENTRY_HELPER_PRIOR_FULL');
    if(y<2009)assert.deepEqual(ledger(next),{version:1,players:[]});else checkArrival(next);
    if(y===2009&&ledger(prior).players.length)assert.deepEqual(next,prior,'SC_ENTRY_HELPER_IDEMPOTENT');
    direct.push({year:y,before:prior,after:copy(next),read:copy(K.H.readSoccerHistoricalArrivals(next)),draws:call.draws});s=next;
  }
  assert(K.H.hasSoccerHistoricalPlayer(s,'Neymar'));assert(!K.H.hasSoccerHistoricalPlayer(s,'Unknown declared cache name'));
  for(const policy of [undefined,opaque]){
    const x=baseInput();if(policy)x.historicalArrivals=copy(policy);const before=copy(x);
    const result=tape(.5,()=>K.H.recordSoccerHistoricalArrivals(x,2015));assert.equal(result.draws.length,0);assert.deepEqual(x,before,'SC_ENTRY_HELPER_OPAQUE_ABSENT_FULL');
    assert(!K.H.hasSoccerHistoricalPlayer(x,'Neymar'));
  }
  const admissionCap=supported(baseInput());
  admissionCap.phone.clubs=Object.fromEntries(Array.from({length:28},(_,i)=>['declared-cache-sentinel-'+i,'Declared cache sentinel']));
  const beforeAdmissionCap=copy(admissionCap);
  const admissionCall=tape(.5,()=>K.H.recordSoccerHistoricalArrivals(admissionCap,2009));
  noDraw(admissionCall.draws);checkArrival(admissionCap);
  assert.equal(Object.keys(admissionCap.phone.clubs).length,28,'SC_ENTRY_ADMISSION_CAP28');
  assert(!Object.hasOwn(admissionCap.phone.clubs,'declared-cache-sentinel-0'),'Oldest unregistered cache key drops');
  for(let i=1;i<28;i++)assert.equal(admissionCap.phone.clubs['declared-cache-sentinel-'+i],'Declared cache sentinel');
  const invalidYears=[];
  for(const target of [NaN,Infinity,-Infinity,2008.5,2009.5]){
    const input=supported(baseInput()),before=copy(input);
    const result=tape(.5,()=>K.H.recordSoccerHistoricalArrivals(input,target));
    noDraw(result.draws);assert.deepEqual(input,before,'SC_ENTRY_INVALID_YEAR_FULL');
    invalidYears.push({target:String(target),before,after:copy(input),draws:result.draws});
  }
  const cached=copy(s);cached.phone.clubs={Neymar:'Santos',...Object.fromEntries(Array.from({length:27},(_,i)=>['declared-cache-sentinel-'+i,'Declared cache sentinel']))};
  const cacheBefore=copy(cached),recordBefore=copy(ledger(cached));
  const world=tape(.5,()=>K.P.worldSeasonTick(cached,{year:2015,playerLeagueTitle:false,playerUcl:false}));
  const validateCache=x=>{assert.equal(K.P.worldClubOf(x,'Neymar'),'Santos','SC_ENTRY_REGISTERED_CACHE');assert(Object.keys(x.phone.clubs).length<=28,'SC_ENTRY_CACHE_CAP28');assert.deepEqual(ledger(x),recordBefore,'SC_ENTRY_SOURCE_FACTS_HELD');};
  lastDiagnostic={name:'world-cache',before:cacheBefore,after:copy(cached),world:world.result,global:world.draws};
  validateCache(cached);assert.equal(world.draws.length,0,'Existing private phone stream needs no global draw');
  assert.deepEqual(world.result.moves,[],'Historical transfer suppression remains');
  const missingCache=copy(cacheBefore);delete missingCache.phone.clubs.Neymar;
  const missingBefore=copy(missingCache),missingWorld=tape(.5,()=>K.P.worldSeasonTick(missingCache,{year:2015,playerLeagueTitle:false,playerUcl:false}));
  validateCache(missingCache);assert.deepEqual(missingWorld.result.moves,[]);assert.equal(missingWorld.draws.length,0);
  const controls=[];
  const legacyActual=rows.find(r=>r.mode==='legacy'),badLegacy=copy(legacyActual.candidate),legacyBefore=JSON.stringify(badLegacy);
  badLegacy.saved+=' ';let legacyError;try{sameLegacy(badLegacy,legacyActual.original);}catch(e){legacyError=e;}
  assert(legacyError?.name==='AssertionError'&&legacyError.message.includes('SC_ENTRY_BOUNDARY_LEGACY_FULL'));
  badLegacy.saved=legacyActual.candidate.saved;assert.equal(JSON.stringify(badLegacy),legacyBefore);
  controls.push({name:'copied-actual-save-parity',changed:true,owned:String(legacyError),wholeInverse:true});
  const badDraws=copy(direct[0].draws),drawBefore=JSON.stringify(badDraws);badDraws.push(.5);
  assert.notEqual(JSON.stringify(badDraws),drawBefore,'Copied actual empty tape changed');
  let drawError;try{noDraw(badDraws);}catch(e){drawError=e;}
  assert(drawError?.name==='AssertionError'&&drawError.message.includes('SC_ENTRY_HELPER_NO_GLOBAL_DRAW'));
  badDraws.pop();assert.equal(JSON.stringify(badDraws),drawBefore);assert.deepEqual(badDraws,direct[0].draws);
  controls.push({name:'copied-actual-empty-draw-tape',changed:true,owned:String(drawError),wholeInverse:true});

  for(const [name,value]of [['era-reseed','PSG'],['cache-omission',undefined]]){
    const changed=copy(cached),before=JSON.stringify(changed);if(value===undefined)delete changed.phone.clubs.Neymar;else changed.phone.clubs.Neymar=value;
    assert.notEqual(JSON.stringify(changed),before);let error;try{validateCache(changed);}catch(e){error=e;}
    assert(error?.name==='AssertionError'&&error.message.includes('SC_ENTRY_REGISTERED_CACHE'));
    changed.phone.clubs=copy(cached.phone.clubs);assert.equal(JSON.stringify(changed),before);
    controls.push({name,changed:true,owned:String(error),wholeInverse:true});
  }
  for(const [file,hash]of Object.entries(source))assert.equal(sha(await fs.readFile(path.join(root,file))),hash,'Source held '+file);
  assert.equal(git('status','--porcelain=v1','--untracked-files=all'),'');
  const full={status:'candidate-declared-boundaries-passed',scope:'Prepared API states, not a naturally played browser career',setup,imports,preparations,rows,direct,admissionCap:{before:beforeAdmissionCap,after:admissionCap,draws:admissionCall.draws},invalidYears,missingCache:{before:missingBefore,after:missingCache,world:missingWorld.result,global:missingWorld.draws},cache:{before:cacheBefore,after:cached,world:world.result,global:world.draws,controls}};
  const raw=Buffer.from(JSON.stringify(full)),packed=gzipSync(raw);
  assert(packed.length<=50000000,'Unchanged50MB artifact ceiling');await fs.writeFile(path.join(out,'declared-boundaries.json.gz'),packed);
  await fs.writeFile(path.join(out,'boundary-summary.json'),JSON.stringify({status:full.status,candidate:spec.candidate,tree:spec.tree,
    playerCommitPaths:11,tailPaths:4,modes:3,actualCases:rows.length,allLegacyOpaqueFullOutcomesAndGlobalTapesEqual:true,
    supportedOtherStateAndGlobalTapesEqual:true,directNoGlobalDraw:true,eraReseedAndCap28Controls:controls,
    rawBytes:raw.length,rawSHA256:sha(raw),gzipBytes:packed.length,gzipSHA256:sha(packed),sourcePins:spec.sourcePins,
    limits:['Prepared states and two declared branch-selection tapes, not natural or native delivery.','Global tapes measured; private values are not claimed as a full tape. Constant branch tapes prove actual values/count parity, not semantic ordering of equal-valued draws.','Full tracked-source/offline receipts remain the outer workflow responsibility.']},null,2)+'\n');
  console.log('SC_ENTRY_DECLARED_BOUNDARIES_PASSED 11player+4tail paths,45actual outcomes; helper no global draw, legacy/opaque full baseline parity, cache controls.');
}catch(error){
  const raw=Buffer.from(JSON.stringify({status:'NOT_ADMITTED',error:String(error),imports,preparations,rows,lastDiagnostic}));
  const packed=gzipSync(raw);assert(packed.length<=50000000);
  await fs.writeFile(path.join(out,'boundary-failure.json.gz'),packed);
  await fs.writeFile(path.join(out,'boundary-summary.json'),JSON.stringify({status:'NOT_ADMITTED',error:String(error),completedOutcomes:rows.length,gzipBytes:packed.length,gzipSHA256:sha(packed),scope:'Retained actual partial failure, no boundary qualification.'},null,2)+'\n');
  throw error;
}finally{Math.random=math;}
