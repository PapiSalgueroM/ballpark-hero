import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { gzipSync, gunzipSync } from 'node:zlib';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const INPUT=path.resolve(process.env.MANAGER_UCL_EARNED_INPUT||'');
assert(process.env.MANAGER_UCL_EARNED_INPUT,'An immutable acquired finance80ad input is required');
const OUT=path.resolve(ROOT,process.env.MANAGER_UCL_EARNED_OUT||'manager-ucl-earned-artifacts/proof');
const BASE='4477e8038cdd08511cb246ab7d61d31a42b1922b',BASE_TREE='189744383b543613db2415276b8651a6e92c7c3d';
const OLD_HEAD='80ad811e54bb1a96a17c9ac95a4404a79afc313e',OLD_TREE='ebf65096a52dd7a5ae55d70502844053d1c9dce9';
const FILE='src/lib/clubManagerFinances.ts',sha=v=>createHash('sha256').update(v).digest('hex');
const clone=v=>JSON.parse(JSON.stringify(v)),lf=v=>v.replaceAll('\r\n','\n');
const json=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2));};
const read=file=>JSON.parse(fs.readFileSync(file));
const git=args=>execFileSync('git',args,{cwd:ROOT,encoding:'utf8',maxBuffer:128*1024*1024}).trim();
const HEAD=git(['rev-parse','HEAD']),TREE=git(['rev-parse','HEAD^{tree}']);
assert.equal(git(['rev-parse',`${BASE}^{tree}`]),BASE_TREE);
fs.mkdirSync(OUT,{recursive:true});
const heldFiles=[FILE,'src/lib/clubManager.ts','src/lib/clubManagerUclLeague.ts','src/lib/clubManagerXp.ts',
  'scripts/qa/managerUclEarnedForecastProof.mjs','package.json','package-lock.json'];
const held=()=>Object.fromEntries(heldFiles.map(file=>[file,sha(fs.readFileSync(path.join(ROOT,file)))]));
const sourceBefore=held(),manifestFile=path.resolve(process.env.UCL_EARNED_ARTIFACT_MANIFEST||path.join(OUT,'..','input-artifact-inventory.json'));
const acquisition=read(manifestFile);
assert.equal(acquisition.artifactId,11684728449);assert.equal(acquisition.runId,38092563931);
assert.equal(acquisition.head,OLD_HEAD);assert.equal(acquisition.zipBytes,516545839);
assert.equal(acquisition.zipSha256.toLowerCase(),'67cb08f992e1e4847ebc23155a39d532f36cd6b763dba33291f70e9934f627ae');
assert.equal(acquisition.files.length,3888);
const files=new Map();for(const row of acquisition.files){assert(!files.has(row.file));files.set(row.file,row);}
const retained=[];
function retain(relative){const bytes=fs.readFileSync(path.join(INPUT,relative)),expected=files.get(relative);assert(expected,relative);
  assert.equal(bytes.length,expected.bytes);assert.equal(sha(bytes),expected.sha256.toLowerCase());
  const target=path.join(OUT,'input',relative);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes);
  retained.push({file:relative,bytes:bytes.length,sha256:sha(bytes)});return bytes;}
for(const row of acquisition.files.filter(row=>row.file.startsWith('current/observed/')))retain(row.file);
assert.equal(retained.length,1988,'The complete declared current observed directory, including controls and bundles');
for(const relative of ['original-source.tar.gz','current-source.tar.gz','current-git-tree.txt','original-git-tree.txt','report.json'])retain(relative);
const recorded=read(path.join(INPUT,'report.json'));assert.equal(recorded.head,OLD_HEAD);assert.equal(recorded.tree,OLD_TREE);
assert.equal(recorded.refs.current,BASE);assert.equal(recorded.trees.current,BASE_TREE);
const originalNow=Date.now;Date.now=()=>recorded.clock;
json(path.join(OUT,'retained-input.json'),{scope:'Whole current/observed directory, canonical source archives and root report; original full failed ZIP remains immutable',acquisitionSha256:sha(fs.readFileSync(manifestFile)),retained});
const processDir=path.join(INPUT,'current','observed'),observed=read(path.join(processDir,'observer.json'));
assert.equal(observed.cases.length,36);assert.equal(observed.rows.length,1959);
const random=read(path.join(processDir,'random.json')),packed=fs.readFileSync(path.join(processDir,'random.float64le.gz')),raw=gunzipSync(packed);
assert.equal(sha(packed),random.archiveSha256);assert.equal(sha(raw),random.sha256);assert.equal(raw.length,random.count*8);assert.equal(random.count,4154714);
for(let i=0;i<random.count;i++){const v=raw.readDoubleLE(i*8);assert(Number.isFinite(v)&&v>=0&&v<1);}
let assignment=-1;for(const item of random.assignments){assert(Number.isSafeInteger(item.cursor)&&item.cursor>=assignment&&item.cursor<=random.count);assignment=item.cursor;}
const objects=path.join(OUT,'objects');fs.mkdirSync(objects,{recursive:true});
function store(value){const bytes=Buffer.from(JSON.stringify(value)),hash=sha(bytes),file=`objects/${hash}.json.gz`,absolute=path.join(OUT,file);
  if(fs.existsSync(absolute))assert.deepEqual(gunzipSync(fs.readFileSync(absolute)),bytes);else fs.writeFileSync(absolute,gzipSync(bytes,{level:9}));
  return{file,sha256:hash,bytes:bytes.length,archiveSha256:sha(fs.readFileSync(absolute))};}
const states=new Map(),frameIndex=[],witnesses=[];let frameDraws=0;
function stateRef(state,origin){const bytes=JSON.stringify(state),hash=sha(bytes);if(!states.has(hash))states.set(hash,{state,hash,origins:[]});states.get(hash).origins.push(origin);return hash;}
for(const row of observed.rows){const bytes=gunzipSync(fs.readFileSync(path.join(processDir,row.file)));
  assert.equal(sha(bytes),row.sha256);assert.equal(bytes.length,row.bytes);assert.equal(sha(fs.readFileSync(path.join(processDir,row.file))),row.archiveSha256);
  const payload=JSON.parse(bytes);assert.equal(payload.start,row.start);assert.equal(payload.end,row.end);assert.equal(payload.draws.length,row.end-row.start);
  payload.draws.forEach((value,i)=>assert.equal(value,raw.readDoubleLE((row.start+i)*8)));frameDraws+=payload.draws.length;
  const index={file:row.file,sha256:row.sha256,kind:row.kind,caseId:row.caseId,start:row.start,end:row.end,states:{}};
  if(payload.state)index.states.state=stateRef(payload.state,{file:row.file,field:'state',kind:row.kind,caseId:row.caseId});
  if(payload.before)index.states.before=stateRef(payload.before,{file:row.file,field:'before',kind:row.kind,caseId:row.caseId});
  if(payload.inputAfter){assert.deepEqual(payload.inputAfter,payload.before);index.states.inputAfter=stateRef(payload.inputAfter,{file:row.file,field:'inputAfter',kind:row.kind,caseId:row.caseId});}
  if(payload.result?.state)index.states.result=stateRef(payload.result.state,{file:row.file,field:'result.state',kind:row.kind,caseId:row.caseId});
  if(row.kind==='snapshot'){assert.equal(payload.draws.length,0);witnesses.push({file:row.file,state:index.states.state,facts:payload,projection:payload.projection});}
  if(row.kind==='end'){assert.equal(payload.draws.length,0);witnesses.push({file:row.file,state:index.states.state,facts:payload});}
  if(row.kind==='action')witnesses.push({file:row.file,state:index.states.result,facts:payload.afterFacts});
  frameIndex.push(index);
}
for(const context of observed.cases){assert.equal(context.id,context.clubIndex*6+context.seed);assert.equal(context.effectiveSeed,1000+context.clubIndex*10+context.seed);assert.equal(context.simSeed,null);
  const rows=frameIndex.filter(row=>row.caseId===context.id);assert.equal(rows.length,context.rowsEnd-context.rowsStart);assert.equal(rows[0].kind,'constructor');assert.equal(rows.at(-1).kind,'end');
  let previous=null,cursor=context.start;for(const row of rows){assert.equal(row.start,cursor);cursor=row.end;
    if(row.kind==='constructor')previous=row.states.state;
    else if(row.kind==='action'){assert.equal(row.states.before,previous);assert.equal(row.states.inputAfter,previous);previous=row.states.result;}
    else {assert.equal(row.states.state,previous);assert.equal(row.start,row.end);}}
  assert.equal(cursor,context.end);}
json(path.join(OUT,'frame-index.json'),frameIndex);
const parent=path.join(ROOT,'.sim-control');fs.mkdirSync(parent,{recursive:true});const TEMP=fs.mkdtempSync(path.join(parent,'ucl-earned-'));
const startup=[],loaded=[];
const patches=[
  {id:'missing-home',from:'      home += 1; away += 1; euroAway += 1;',to:'      away += 1; euroAway += 1;',failures:['earned-home']},
  {id:'wrong-euro-travel',from:'      home += 1; away += 1; euroAway += 1;',to:'      home += 1; away += 1;',failures:['european-away']},
  {id:'premature-md7',from:'isUclLeagueStage(group) && group.matchday === 8',to:'isUclLeagueStage(group)',failures:['qualification']},
  {id:'rank-nine',from:'sortedUclLeague(group).slice(0, 8)',to:'sortedUclLeague(group).slice(0, 36)',failures:['qualification']},
  {id:'saved-book-mutation',from:'  let home = 0, away = 0, euroAway = 0;',to:'  if (state.books?.season) state.books.season.homeGames += 1;\n  let home = 0, away = 0, euroAway = 0;',failures:['read-only']},
];
const currentText=lf(fs.readFileSync(path.join(ROOT,FILE),'utf8'));
function observeRandom(){const descriptor=Object.getOwnPropertyDescriptor(Math,'random'),values=[],callers=[],assignments=[],originals=new WeakMap(),wrappers=new WeakMap();let raw=Math.random;
  const wrapped=fn=>{fn=originals.get(fn)||fn;if(!wrappers.has(fn)){const wrapper=function(...args){const value=Reflect.apply(fn,this,args);values.push(value);callers.push(new Error().stack);return value;};wrappers.set(fn,wrapper);originals.set(wrapper,fn);}return wrappers.get(fn);};
  Object.defineProperty(Math,'random',{configurable:true,enumerable:false,get:()=>wrapped(raw),set:fn=>{assert.equal(typeof fn,'function');raw=originals.get(fn)||fn;assignments.push({cursor:values.length});}});
  return{values,callers,assignments,restore:()=>Object.defineProperty(Math,'random',descriptor)};}
async function bundle(id,ref,patch=null){const directory=path.join(TEMP,id);fs.mkdirSync(directory,{recursive:true});
  execFileSync('git',['archive','--format=tar',`--output=${path.join(directory,'source.tar')}`,ref],{cwd:ROOT,maxBuffer:256*1024*1024});
  execFileSync('tar',['-xf',path.join(directory,'source.tar'),'-C',directory]);fs.unlinkSync(path.join(directory,'source.tar'));
  if(ref===HEAD)fs.writeFileSync(path.join(directory,FILE),currentText);
  const original=fs.readFileSync(path.join(directory,FILE),'utf8');let text=original,control=null;
  if(patch){assert.equal(text.split(patch.from).length-1,1);text=text.replace(patch.from,patch.to);assert.notEqual(text,original);
    assert.equal(text.split(patch.to).length-1,1);assert.equal(text.replace(patch.to,patch.from),original);fs.writeFileSync(path.join(directory,FILE),text);
    control={id:patch.id,from:patch.from,to:patch.to,count:1,effective:true,before:store(original),fault:store(text),undo:store(text.replace(patch.to,patch.from))};}
  fs.symlinkSync(path.join(ROOT,'node_modules'),path.join(directory,'node_modules'),'junction');
  const entry=path.join(directory,'entry.mjs'),output=path.join(directory,'reader.mjs'),metaFile=path.join(directory,'meta.json');
  fs.writeFileSync(entry,`export * as fin from './src/lib/clubManagerFinances.ts';\nexport * as cm from './src/lib/clubManager.ts';\nexport * as ucl from './src/lib/clubManagerUclLeague.ts';\nexport * as xp from './src/lib/clubManagerXp.ts';\n`);
  execFileSync(path.join(ROOT,'node_modules','.bin','esbuild'),[entry,'--bundle','--platform=node','--format=esm',`--outfile=${output}`,`--metafile=${metaFile}`,`--alias:@=${path.join(directory,'src')}`,'--log-level=error'],{cwd:directory});
  const meta=read(metaFile),inventory=[];for(const input of Object.keys(meta.inputs)){const absolute=path.resolve(directory,input),bytes=fs.readFileSync(absolute),relative=path.relative(directory,absolute).replaceAll('\\','/');
    inventory.push({input,relative,bytes:bytes.length,sha256:sha(bytes),raw:store(bytes.toString())});assert.equal(meta.inputs[input].bytes,bytes.length);
    if(relative!== 'entry.mjs'){const expected=relative===FILE?text:execFileSync('git',['show',`${ref}:${relative}`],{cwd:ROOT,maxBuffer:128*1024*1024});assert.equal(sha(bytes),sha(expected));}}
  const boot=observeRandom();let exports;try{exports=await import(pathToFileURL(output).href);}finally{boot.restore();}
  assert(boot.values.every(value=>Number.isFinite(value)&&value>=0&&value<1));assert.equal(boot.values.length,boot.callers.length);
  startup.push({id,scope:'Complete unfiltered module-import values, callers and assignments, not zero-draw reader credit',observations:store({values:boot.values,callers:boot.callers,assignments:boot.assignments})});
  const record={id,ref,tree:git(['rev-parse',`${ref}^{tree}`]),sourceSha256:sha(text),entry:store(fs.readFileSync(entry,'utf8')),bundle:store(fs.readFileSync(output,'utf8')),meta:store(meta),inventory,control};loaded.push(record);return{exports,record};}
function readState(B,input){const state=clone(input),before=JSON.stringify(state),random=observeRandom();
  let value;try{value={books:clone(B.fin.booksOf(state)),closed:clone(B.fin.closeLedger(state)),certain:B.fin.certainFixturesLeft(state),projection:B.fin.projectFinances(state),
    fixtures:state.calendar.map((entry,index)=>({index,entry,involved:B.cm.entryInvolvesMe(state,entry),fixture:B.cm.fixtureFor(state,entry)})),
    rates:{crowd:B.fin.expectedHomeCrowd(state),food:B.fin.concessionPerFan(state),gate:B.cm.gatePricePerFan(state),edge:B.xp.gateEdge(state),leagueTravel:B.fin.travelCost(state,'league'),europeTravel:B.fin.travelCost(state,'uclGroup')}};}finally{random.restore();}
  return{value,inputBeforeSha256:sha(before),inputAfterSha256:sha(JSON.stringify(state)),inputAfter:store(state),draws:random.values,drawCallers:random.callers,randomAssignments:random.assignments};}
const round2=n=>Math.round(n*100)/100;
function eligible(state,B){if(state.uclFormat!=='league36'||state.uclKoRound!=='R16'||state.uclExit!=null||!Number.isSafeInteger(state.week)||state.week<0||!state.uclDraw||Array.isArray(state.uclDraw)||typeof state.uclDraw!=='object'||'R16'in state.uclDraw)return false;
  const group=state.uclGroup;if(!B.ucl.isUclLeagueStage(group)||group.matchday!==8||!B.ucl.sortedUclLeague(group).slice(0,8).some(row=>row.club===state.clubName))return false;
  const legs=state.calendar.map((entry,index)=>({entry,index})).filter(row=>row.entry.type==='uclKo'&&row.entry.uclRound==='R16');
  return legs.length===2&&legs[0].index>=state.week&&legs[0].entry.uclLeg===1&&legs[1].entry.uclLeg===2&&legs.every(row=>B.cm.fixtureFor(state,row.entry)===null);}
function expectedProjection(base,counts,rates){const p=clone(base.projection);p.caveat='Counts league fixtures, ties already drawn and a round of 16 tie earned by finishing in the league phase top eight. Later rounds depend on results and are left out, and so are deals you have not done.';
  p.homeGamesLeft=counts.home;p.awayTripsLeft=counts.away;const season=base.books.season;
  const foodLeft=round2(rates.crowd*rates.food/1e6*counts.home),ticketsLeft=round2(rates.crowd*rates.gate*rates.edge/1e6*counts.home-foodLeft);
  const tickets=p.income.find(line=>line.id==='tickets'),food=p.income.find(line=>line.id==='concessions'),travel=p.spend.find(line=>line.id==='travel');
  tickets.projected=round2(season.tickets+ticketsLeft);tickets.note=`${counts.home} certain home game${counts.home===1?'':'s'} left`;food.projected=round2(season.concessions+foodLeft);
  travel.projected=round2(season.travel+round2(rates.leagueTravel*(counts.away-counts.euroAway)+rates.europeTravel*counts.euroAway));travel.note=`${counts.away} certain away trip${counts.away===1?'':'s'} left`;
  p.incomeProjected=round2(p.income.reduce((n,line)=>n+line.projected,0));p.spendProjected=round2(p.spend.reduce((n,line)=>n+line.projected,0));p.resultProjected=round2(p.incomeProjected-p.spendProjected);return p;}
function counters(example,base){const out=[];const add=(id,fn)=>{const state=clone(example);fn(state);assert.notEqual(JSON.stringify(state),JSON.stringify(example));out.push({id,state,scope:'Deliberately altered saved-state counterexample, not a simulated action or sporting result'});};
  add('absent-format',s=>delete s.uclFormat);add('wrong-format',s=>s.uclFormat='groups');
  add('declared-null-draw',s=>s.uclDraw.R16=null);add('declared-empty-draw',s=>s.uclDraw.R16=[]);
  add('out',s=>s.uclExit='R16');add('future-qf',s=>s.uclKoRound='QF');add('future-sf',s=>s.uclKoRound='SF');
  add('after-first-leg',s=>s.week=s.calendar.findIndex(entry=>entry.type==='uclKo'&&entry.uclRound==='R16')+1);
  add('end',s=>s.week=s.calendar.length);add('malformed-stage',s=>s.uclGroup.results[0].hg=-1);
  add('extra-leg',s=>s.calendar.push(clone(s.calendar.find(entry=>entry.type==='uclKo'&&entry.uclRound==='R16'))));
  add('rank-nine',s=>s.clubName=base.ucl.sortedUclLeague(s.uclGroup)[8].club);
  add('md7',s=>{s.uclGroup.matchday=7;s.uclGroup.results=s.uclGroup.results.slice(0,126);
    const table=new Map(s.uclGroup.table.map(row=>[row.club,{club:row.club,w:0,d:0,l:0,gf:0,ga:0,pts:0}]));
    for(const r of s.uclGroup.results){const h=table.get(r.home),a=table.get(r.away);h.gf+=r.hg;h.ga+=r.ag;a.gf+=r.ag;a.ga+=r.hg;
      if(r.hg>r.ag){h.w++;h.pts+=3;a.l++;}else if(r.hg<r.ag){a.w++;a.pts+=3;h.l++;}else{h.d++;a.d++;h.pts++;a.pts++;}}
    s.uclGroup.table=s.uclGroup.table.map(row=>table.get(row.club));
    assert(base.ucl.isUclLeagueStage(s.uclGroup),'Counterexample has a complete valid MD7 table, not malformed totals');
    s.clubName=base.ucl.sortedUclLeague(s.uclGroup)[0].club;});
  for(const row of out)assert.equal(eligible(row.state,base),false,row.id);return out;}
function drawnCounts(state,B){const count={home:0,away:0,euroAway:0};for(let index=state.week;index<state.calendar.length;index++){
  const entry=state.calendar[index];if(entry.type==='window')continue;const fx=B.cm.fixtureFor(state,entry);if(!fx)continue;
  if(fx.home===true)count.home++;else if(fx.home===false){count.away++;if(['uclGroup','uclKo'].includes(entry.type))count.euroAway++;}}
  return count;}
function compare(id,state,baseRead,actual,qualifies,groupFailures){const expectedCounts={...baseRead.value.certain};if(qualifies){expectedCounts.home++;expectedCounts.away++;expectedCounts.euroAway++;}
  const expected=expectedProjection(baseRead.value,expectedCounts,baseRead.value.rates),got=actual.value;
  const check=(group,fn)=>{try{fn();}catch(error){assert.equal(error.name,'AssertionError','Only actual assertion failures may earn detector credit');groupFailures[group].push({id,name:error.name,message:error.message});}};
  check('read-only',()=>{assert.equal(actual.inputBeforeSha256,sha(JSON.stringify(state)));assert.equal(actual.inputAfterSha256,actual.inputBeforeSha256);assert.deepEqual(actual.draws,[]);
    assert.deepEqual(actual.drawCallers,[]);assert.deepEqual(actual.randomAssignments,[]);
    assert.deepEqual(Object.keys(got.projection),Object.keys(expected));assert.deepEqual(Object.keys(got.certain),Object.keys(expectedCounts));
    for(const key of ['books','closed','fixtures','rates'])assert.deepEqual(got[key],baseRead.value[key],key);
    for(const key of ['weeksPlayed','weeksLeft','incomeActual','spendActual','resultActual','possibleBonus','caveat'])assert.deepEqual(got.projection[key],expected[key],key);
    assert.equal(got.projection.incomeProjected,round2(got.projection.income.reduce((n,line)=>n+line.projected,0)));
    assert.equal(got.projection.spendProjected,round2(got.projection.spend.reduce((n,line)=>n+line.projected,0)));
    assert.equal(got.projection.resultProjected,round2(got.projection.incomeProjected-got.projection.spendProjected));});
  if(qualifies){check('earned-home',()=>{assert.equal(got.certain.home,expectedCounts.home);assert.equal(got.projection.homeGamesLeft,expected.homeGamesLeft);assert.deepEqual(got.projection.income,expected.income);assert.equal(got.projection.incomeProjected,expected.incomeProjected);});
    check('european-away',()=>{assert.equal(got.certain.away,expectedCounts.away);assert.equal(got.certain.euroAway,expectedCounts.euroAway);assert.equal(got.projection.awayTripsLeft,expected.awayTripsLeft);assert.deepEqual(got.projection.spend,expected.spend);assert.equal(got.projection.spendProjected,expected.spendProjected);});}
  else check('qualification',()=>{assert.deepEqual(got.certain,baseRead.value.certain);assert.deepEqual(got.projection,expected);});
}
let result;
try {
  const baseline=await bundle('baseline',BASE),healthy=await bundle('healthy',HEAD),B=baseline.exports;
  const baselines=new Map(),stateInventory=[];
  for(const [hash,item]of states){const value=readState(B,item.state);assert.equal(value.inputAfterSha256,value.inputBeforeSha256);assert.deepEqual(value.draws,[]);
    assert.deepEqual(value.value.certain,drawnCounts(item.state,B),'Baseline counted fixtures are independently walked');baselines.set(hash,value);
    stateInventory.push({hash,input:store(item.state),origins:item.origins,baseline:store(value),qualifies:eligible(item.state,B)});}
  for(const witness of witnesses){const value=baselines.get(witness.state).value;
    assert.deepEqual(value.books,witness.facts.books);assert.deepEqual(value.closed,witness.facts.closedSoFar);assert.deepEqual(value.certain,witness.facts.certain);assert.deepEqual(value.fixtures,witness.facts.fixtures);
    assert.equal(value.rates.leagueTravel,witness.facts.travelUnit.ordinary);assert.equal(value.rates.europeTravel,witness.facts.travelUnit.europe);
    if(witness.projection)assert.deepEqual(value.projection,witness.projection,'Complete recorded snapshot projection from immutable4477');}
  const earned=stateInventory.filter(row=>row.qualifies);assert(earned.length>0,'Genuine saved earned windows exist');
  const extra=counters(states.get(earned[0].hash).state,B);assert(extra.some(row=>row.id==='md7')&&extra.some(row=>row.id==='rank-nine'));
  for(const row of extra){row.hash=sha(JSON.stringify(row.state));row.baseline=readState(B,row.state);assert.equal(row.baseline.inputBeforeSha256,row.baseline.inputAfterSha256);assert.deepEqual(row.baseline.draws,[]);}
  json(path.join(OUT,'state-inputs.json'),{scope:'Every distinct whole constructor, before, inputAfter, result, snapshot and end state from all1959 frames',states:stateInventory,
    counterexamples:extra.map(row=>({id:row.id,scope:row.scope,input:store(row.state),baseline:store(row.baseline)}))});
  const evaluate=arm=>{const groups={'earned-home':[],'european-away':[],qualification:[],'read-only':[]},outputs=[];let week30=0;
    for(const [hash,item]of states){const value=readState(arm.exports,item.state),qualifies=eligible(item.state,B);compare(hash,item.state,baselines.get(hash),value,qualifies,groups);outputs.push({id:hash,qualifies,read:store(value)});
      if(item.state.week===30){week30++;assert.equal(qualifies,false,'No premature guarantee is credited at any actual week30 state');}}
    for(const row of extra){const value=readState(arm.exports,row.state);compare(row.id,row.state,row.baseline,value,false,groups);outputs.push({id:row.id,counterexample:true,qualifies:false,read:store(value)});}
    return{groups,failed:Object.keys(groups).filter(key=>groups[key].length),outputs,week30};};
  const original=evaluate(healthy);assert.deepEqual(original.failed,[],'Healthy complete reader states and counterexamples');
  const arms=[{id:'healthy',loaded:healthy.record,results:store(original)}];
  for(const patch of patches){const fault=await bundle(patch.id,HEAD,patch),outcome=evaluate(fault);assert.deepEqual(outcome.failed,patch.failures,patch.id+' exact failure groups');
    assert(outcome.groups[patch.failures[0]].length>0,'Actual faulty reader outputs change');
    const intended=new Set(outcome.groups[patch.failures[0]].map(row=>row.id));
    if(patch.id==='premature-md7')assert(intended.has('md7'));if(patch.id==='rank-nine')assert(intended.has('rank-nine'));
    let changed=0;for(let index=0;index<outcome.outputs.length;index++){const good=original.outputs[index],bad=outcome.outputs[index];assert.equal(good.id,bad.id);
      if(good.read.sha256!==bad.read.sha256){assert(intended.has(bad.id),'Every changed complete read output belongs to the intended failure group');changed++;}
      if(!intended.has(bad.id))assert.equal(bad.read.sha256,good.read.sha256,'Every unrelated complete read output remains byte-identical');}
    assert(changed>0,'Loaded source fault alters actual complete read outputs');arms.push({id:patch.id,loaded:fault.record,changedOutputs:changed,exactFailures:patch.failures,results:store(outcome)});}
  const undo=await bundle('undo',HEAD),restored=evaluate(undo);assert.deepEqual(restored,original,'Complete healthy output/state/draw restoration');
  assert.equal(undo.record.sourceSha256,healthy.record.sourceSha256);arms.push({id:'undo',loaded:undo.record,results:store(restored)});
  const links=[],ties=new Map();
  for(const item of earned){const state=states.get(item.hash).state,origin=item.origins.find(row=>row.kind==='action'&&row.field==='result.state');assert(origin,'Earned saved window is an actual completed action');
    const legs=state.calendar.map((entry,index)=>({entry,index})).filter(row=>row.entry.type==='uclKo'&&row.entry.uclRound==='R16');
    const actions=frameIndex.filter(row=>row.caseId===origin.caseId&&row.kind==='action');const reports=[];
    for(const leg of legs){const selected=actions.find(row=>{const before=states.get(row.states.before).state;return before.week===leg.index;});assert(selected,'The earned future leg was actually executed');
      const payload=JSON.parse(gunzipSync(fs.readFileSync(path.join(processDir,selected.file))));assert(payload.result.report);assert.equal(payload.result.report.competition,'uclKo');
      assert.equal(payload.result.state.week,leg.index+1);assert.equal(payload.result.state.resultLog.at(-1).week,leg.index);
      const home=payload.result.report.home===state.clubName,away=payload.result.report.away===state.clubName;assert(home!==away);
      const before=payload.before.books.season,after=payload.result.state.books.season;assert.equal(after.homeGames-before.homeGames,+home);assert.equal(after.awayTrips-before.awayTrips,+away);
      if(away)assert.equal(round2(after.travel-before.travel),B.fin.travelCost(payload.before,'uclKo'));
      reports.push({file:selected.file,sha256:selected.sha256,leg:leg.entry.uclLeg,home,away,report:payload.result.report,savedResult:payload.result.state.resultLog.at(-1),booksBefore:payload.before.books,booksAfter:payload.result.state.books});}
    assert.equal(reports.filter(row=>row.home).length,1);assert.equal(reports.filter(row=>row.away).length,1);
    const tieId=JSON.stringify([origin.caseId,...legs.map(row=>row.index)]);if(ties.has(tieId))assert.deepEqual(ties.get(tieId),reports);else ties.set(tieId,reports);
    links.push({state:item.hash,origin,legs:legs.map(row=>({index:row.index,entry:row.entry})),reports:store(reports)});}
  json(path.join(OUT,'earned-later-links.json'),{derivedWindows:earned.length,distinctTies:ties.size,laterActualReports:ties.size*2,links});
  json(path.join(OUT,'startup-observations.json'),startup);json(path.join(OUT,'loaded-sources.json'),loaded);
  const sourceAfter=held();assert.deepEqual(sourceAfter,sourceBefore);result={head:HEAD,tree:TREE,baseline:{ref:BASE,tree:BASE_TREE},sourceBefore,sourceAfter,sourceHeld:true,
    input:{artifactId:11684728449,head:OLD_HEAD,tree:OLD_TREE,manifestSha256:sha(fs.readFileSync(manifestFile)),retainedFiles:retained.length,currentObservedFiles:1988,frames:1959,cases:36,
      fullRandom:{count:random.count,sha256:random.sha256,archiveSha256:random.archiveSha256,assignments:random.assignments},frameDrawValues:frameDraws},
    distinctStates:states.size,recordedWitnesses:witnesses.length,derivedEarnedWindows:earned.length,distinctEarnedTies:ties.size,laterActualReports:ties.size*2,
    genuineWeek30States:original.week30,counterexamples:extra.length,groups:Object.keys(original.groups),sourceControls:patches.length,arms,
    scope:'Actual complete4477 recorded states versus repaired readers. Historical finance bands are separate unchanged failing assertions, not accepted by this proof.',
    limits:['Counterexample clones are deliberately altered saves, not genuine play or sporting outcomes.','Constructor states lack a separately recorded projection; all snapshot and after/end facts match immutable recorded witnesses.','The exact declared caveat text changes in every projection; every other field is held or independently accounts for one earned home and one European away leg.','Unfiltered module startup observations are retained separately; every post-import read and full input state must hold0draws.']};
  json(path.join(OUT,'report.json'),result);
  const inventory=[];let bytes=0;function scan(directory){for(const entry of fs.readdirSync(directory,{withFileTypes:true})){const absolute=path.join(directory,entry.name);if(entry.isDirectory())scan(absolute);else{const data=fs.readFileSync(absolute);bytes+=data.length;inventory.push({file:path.relative(OUT,absolute).replaceAll('\\','/'),bytes:data.length,sha256:sha(data)});}}}scan(OUT);
  json(path.join(OUT,'inventory.json'),inventory);assert(bytes+fs.statSync(path.join(OUT,'inventory.json')).size<500000000,'Whole complete proof below500MB without dropping declared inputs or outputs');
  console.log(`PASS earned R16: all1959 frames, ${states.size} full distinct states, ${earned.length} actual earned windows, ${ties.size*2} later actual reports`);
  console.log(`PASS recorded4477 baseline: ${witnesses.length} exact facts/projection witnesses; ${original.week30} actual week30 states held`);
  console.log(`PASS copied-source controls: ${patches.length} effective exact failure maps, complete output/source undo`);
  console.log('PASS full inputs/books, zero reader draws, separately retained startup, complete source holds and lossless output sharing');
}finally{
  Date.now=originalNow;
  if(!result){json(path.join(OUT,'loaded-sources.json'),loaded);json(path.join(OUT,'startup-observations.json'),startup);json(path.join(OUT,'source-final.json'),{head:HEAD,tree:TREE,before:sourceBefore,after:held(),failure:true});}
  const resolved=fs.realpathSync(TEMP);assert(resolved.startsWith(fs.realpathSync(parent)+path.sep)&&path.basename(resolved).startsWith('ucl-earned-'));fs.rmSync(resolved,{recursive:true,force:true});
}
