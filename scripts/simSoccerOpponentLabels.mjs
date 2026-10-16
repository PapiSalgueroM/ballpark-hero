/* Display-only Belgian opponent labels. Runtime is restricted to remote Actions.
 * The finite progression cohort is 32 actual 2010 Belgian academy careers.
 * Altered year/name cases are reader counterexamples, never natural play claims. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { execFileSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(ROOT, process.env.SOCCER_OPPONENT_LABELS_OUT || 'career-opponent-labels-artifacts/proof');
const BASE = '86d0466cae5db2e2353577123b5ab6e2828a0a36';
const TREE = 'f98443d7948432461175285c9cf1ae0ccb79ae6c';
const ORIGINAL_COMPONENT_SHA = 'b553b6277e1b6e697a608f167e7ba2f16be007c1ad7d90063b24ca074ff32aed';
const PAGE = 'src/components/soccer-career/SoccerSeasonCentre.tsx';
const HELPER = 'src/lib/season/belgianOpponentLabels.ts';
const EXPORT = '\nexport { buildModel as __opponentModel };\n';
const ENV = '{"PROD":true,"DEV":false,"MODE":"production","SSR":false}';
const MEMBERS = ['Anderlecht','Antwerp','Cercle Brugge','Charleroi','Club Brugge','Dender','Genk','Gent','La Louviere','Mechelen','OH Leuven','Sint-Truiden','Standard Liege','Union Saint-Gilloise','Westerlo','Zulte Waregem'];
const NOTE = "2025/26 club membership is verified. Match order and results are simulated; extra opponents and their phase aren't recorded.";
/* Release BH: PR278's four hunks (the verified 2023 Premier League opponent) are reversed first, so the legacy page
   below is still the component this proof was qualified against. */
const REVERSE = [
  ["import { historicalOpponentLabels } from '@/lib/season/historicalOpponentLabels';\n",''],
  ['  const historical = historicalOpponentLabels(row, ctx, s);\n  const display = historical ?? belgian2025OpponentLabels(row, s);\n','  const display = belgian2025OpponentLabels(row, s);\n'],
  ["  if (historical && s.mode === 'table') notes.push(historical.note);\n",''],
  ['    season: historical ? { ...s, labels: historical.labels } : s,','    season: s,'],
  ["import { belgian2025OpponentLabels } from '@/lib/season/belgianOpponentLabels';\n",''],
  ['  const display = belgian2025OpponentLabels(row, s);\n',''],
  ['    names: display?.names ?? s.labels.map(l => (l.named ? l.name : SOCCER.words.unnamed)),','    names: s.labels.map(l => (l.named ? l.name : SOCCER.words.unnamed)),'],
  ["    resultsWhy: s.mode === 'table' ? null : [ctx.why === 'severe' ? 'Results only: your season was cut short, so there is no final table.' : RESULTS_WORDS, display?.note].filter(Boolean).join(' '),","    resultsWhy: s.mode === 'table' ? null : ctx.why === 'severe' ? 'Results only: your season was cut short, so there is no final table.' : RESULTS_WORDS,"],
  /* Round 1337: the help's first two paragraphs (HELP.intro) were reworded; the legacy page takes the old words back. */
  [`    'Your season was played the moment you pressed Next Season or 📺 Week by week. Here you watch it one matchday at a time, and the final table and your season totals end where your season summary has them.',`,
    `    'Your season was played the moment you pressed Next Season. This is that same season, match by match: the final table and your season totals are settled, and nothing here can change them.',`],
  [`    "Earlier seasons use the league's real clubs and competition rules where the game has them checked. From 2026-27, a season with a saved league world runs on your career's simulated clubs, with promotion and relegation between two divisions. Every score, every other club's result and every minute are your career's own.",`,
    `    "Earlier-season tables use verified league membership and competition rules. From 2026-27, saved league worlds use your career's simulated clubs and direct promotion and relegation between two divisions. The review marks the available Spanish lower-division club pool. Every score, every other club's result and every minute are your career's own.",`],
];
/* Round 1337: the same two help strings as the model carries them ([new, old], quotes and indentation off). The
   unrelated-model check maps exactly these back before it compares; any other difference in the model still fails. */
const INTRO_1337 = REVERSE.slice(-2).map(pair => pair.map(line => line.trim().replace(/,$/, '').slice(1, -1)));
const sha = b => createHash('sha256').update(b).digest('hex');
const json = v => JSON.stringify(v, (_k, x) => typeof x === 'function' ? { functionBody: String(x) } : x);
const clone = v => JSON.parse(JSON.stringify(v));
const write = (rel, value) => { const f=path.join(OUT,rel); fs.mkdirSync(path.dirname(f),{recursive:true}); fs.writeFileSync(f,typeof value==='string'||Buffer.isBuffer(value)?value:JSON.stringify(value,null,2)); return {file:rel,bytes:fs.statSync(f).size,sha256:sha(fs.readFileSync(f))}; };
const objects = new Map();
function hold(value) {
  const raw=Buffer.from(json(value)); const id=sha(raw); const file=`objects/${id}.json.gz`;
  if(!objects.has(id)){ const packed=gzipSync(raw,{level:9}); write(file,packed); objects.set(id,{id,file,rawBytes:raw.length,rawSha256:id,packedBytes:packed.length,packedSha256:sha(packed)}); }
  return id;
}
function read(id, root=OUT) { return JSON.parse(gunzipSync(fs.readFileSync(path.join(root,`objects/${id}.json.gz`))).toString('utf8')); }
const failures = (checks) => checks.filter(c=>!c.ok).map(c=>c.id);
const attempt = (checks,id,fn) => { try {fn();checks.push({id,ok:true});}catch(e){checks.push({id,ok:false,error:String(e),stack:e.stack});} };
const same = (a,b,message) => assert.equal(json(a),json(b),message);
const bodyRestoreState = s => ({...s,attribute:s.attribute===null&&s.declarations.length===0?'':s.attribute});
const one = (src,from,to,label) => { assert.equal(src.split(from).length-1,1,label+' forward'); const next=src.replace(from,to); assert.equal(next.split(to).length-1,1,label+' reverse'); assert.equal(next.replace(to,from),src,label+' whole undo'); return next; };
const FIXED_CLOCK=Date.UTC(2026,9,11,12);
function rng(seed){let n=seed|0;return()=>{n=(n+0x6d2b79f5)|0;let t=Math.imul(n^(n>>>15),1|n);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296;};}

/* Release AX: an image or a font is read as bytes in a block of its own, away from the source anchors, so the
   line ending fence (scripts/simHarnessAnchors.mjs) can see that no anchor is ever searched in it. The three
   text reads of this file normalise their line endings as they read, for the same fence: on a checkout with LF
   endings every receipt is the byte it was. */
function assetReceipt(absolute){const assetOut={b64:'',digest:''};{const bytes=fs.readFileSync(absolute);assetOut.b64=String(bytes.toString('base64'));assetOut.digest=createHash('sha256').update(bytes).digest('hex');}return assetOut;}
async function bundle(name, sourceRoot, patch=null, options={}) {
  const dir=path.join(OUT,'bundles',name); fs.mkdirSync(dir,{recursive:true});
  const entry=`export * as engine from './src/lib/soccerCareerEngine';\nexport * as core from './src/lib/season/core';\nexport * as soccer from './src/lib/season/soccer';\nexport * as events from './src/lib/season/soccerEvents';\nexport * as moments from './src/lib/season/momentsSave';\nexport { __opponentModel as model } from './${PAGE}';\n`;
  const loaded=[],patches=[]; let effective=0;
  const result=await build({stdin:{contents:entry,sourcefile:'opponent-proof.tsx',resolveDir:sourceRoot,loader:'tsx'},outfile:path.join(dir,'compiled.cjs'),absWorkingDir:sourceRoot,bundle:true,format:'cjs',platform:'node',jsx:'automatic',metafile:true,minify:false,nodePaths:[path.join(ROOT,'node_modules')],alias:{'@':path.join(sourceRoot,'src')},define:{'import.meta.env':ENV},loader:{'.svg':'empty','.png':'empty','.jpg':'empty','.woff':'empty','.woff2':'empty'},plugins:[{name:'retained-opponent-source',setup(api){api.onLoad({filter:/\.(?:[cm]?[jt]sx?|json|css)$/},async args=>{
    const raw=Buffer.from(fs.readFileSync(args.path,'utf8').replace(/\r\n/g,'\n')),rel=path.relative(sourceRoot,args.path).replaceAll(path.sep,'/'); let text=raw.toString('utf8').replace(/\r\n/g,'\n'); const before=text;
    if(patch&&rel===patch.file){text=one(text,patch.from,patch.to,name);effective++;patches.push({file:rel,before:hold(before),after:hold(text),undo:hold(text.replace(patch.to,patch.from))});}
    for(const fault of options.undoPatches??[])if(rel===fault.file){const healthy=text,bad=one(text,fault.from,fault.to,'compiled undo '+rel);text=bad.replace(fault.to,fault.from);assert.equal(text,healthy);patches.push({file:rel,kind:'compiled fault reversal',before:hold(healthy),fault:hold(bad),undo:hold(text)});}
    if(options.legacy&&rel===PAGE){const current=text;for(const[from,to]of REVERSE){assert.equal(text.split(from).length-1,1,'component reverse anchor');text=text.replace(from,to);}assert.equal(sha(Buffer.from(text)),ORIGINAL_COMPONENT_SHA,'complete canonical original component');patches.push({file:rel,kind:'exact original reconstruction',before:hold(current),after:hold(text),canonicalSha256:ORIGINAL_COMPONENT_SHA});}
    if(rel===PAGE){const beforeExport=text;text+=EXPORT;assert.equal(text.split(EXPORT).length-1,1,'private export exact');assert.equal(text.replace(EXPORT,''),beforeExport);patches.push({file:rel,kind:'private export',before:hold(beforeExport),after:hold(text),undo:hold(text.replace(EXPORT,''))});}
    loaded.push({file:rel,absolute:args.path,raw:hold(raw.toString('utf8')),rawSha256:sha(raw),loaded:hold(text),loadedSha256:sha(Buffer.from(text))});
    const ext=path.extname(args.path); const loader=ext==='.css'?'empty':ext==='.json'?'json':ext==='.tsx'?'tsx':ext==='.ts'?'ts':ext==='.jsx'?'jsx':'js'; return{contents:text,loader,resolveDir:path.dirname(args.path)};
  });}}]});
  if(patch)assert.equal(effective,1,name+' effective copied source');
  const meta=write(`bundles/${name}/metafile.json`,result.metafile); const compiled=write(`bundles/${name}/compiled.cjs`,fs.readFileSync(path.join(dir,'compiled.cjs')));
  const inputs=Object.entries(result.metafile.inputs).map(([file,details])=>{
    if(file.startsWith('<define:'))return{file,details,virtual:true,configuredExpression:ENV};
    if(file==='opponent-proof.tsx')return{file,details,virtual:true,actualEntry:hold(entry)};
    const absolute=path.resolve(sourceRoot,file);let record=loaded.find(r=>r.absolute===absolute);
    if(!record&&/\.(svg|png|jpg|woff2?)$/.test(file)){const asset=assetReceipt(absolute);record={file,absolute,rawEncoding:'base64',raw:hold(asset.b64),rawSha256:asset.digest,loaded:hold(''),loadedSha256:sha(Buffer.alloc(0)),loader:'empty'};loaded.push(record);}
    assert(record,'all actual metafile inputs retained: '+file);return{file,details,record};
  });
  const startup=[]; const actual=Math.random; const taskMath=Object.create(Math); taskMath.random=()=>{const value=actual();startup.push({value,stack:new Error('bundle startup').stack});return value;};
  const sandbox={module:{exports:{}},exports:{},require:createRequire(path.join(ROOT,'package.json')),console,process,Buffer,URL,TextEncoder,TextDecoder,setTimeout,clearTimeout,setInterval,clearInterval,queueMicrotask,structuredClone,Math:taskMath,Date:class extends Date {constructor(...a){super(...(a.length?a:[FIXED_CLOCK]));}static now(){return FIXED_CLOCK;}},localStorage:{getItem:()=>null,setItem:()=>{},removeItem:()=>{}}};sandbox.global=sandbox;sandbox.exports=sandbox.module.exports;
  vm.createContext(sandbox);vm.runInContext(fs.readFileSync(path.join(dir,'compiled.cjs'),'utf8'),sandbox,{filename:path.join(dir,'compiled.cjs')});
  const receipt={name,sourceRoot,entry:hold(entry),compiled,meta,inputs,loaded,patches,startup:hold(startup),patch:patch??null,options};write(`bundles/${name}/receipt.json`,receipt);
  return {name,api:sandbox.module.exports,math:taskMath,receipt};
}

function action(arm,id,seed,fn) {
  const values=[],stacks=[];const gen=rng(seed);const prior=arm.math.random;arm.math.random=()=>{const v=gen();values.push(v);stacks.push(new Error('action draw').stack);return v;};
  try {const value=fn();return{value,record:{id,seed,output:hold(value),draws:hold(values),stacks:hold(stacks),count:values.length}};}finally{arm.math.random=prior;}
}
function dispatch(E,s,clubs) {
  switch(s.phase){
    case'youth':return{method:'advanceYouthYear',value:E.advanceYouthYear(s,clubs)};
    case'contract_offer':{const o=s.pendingOffers?.find(x=>x.isHomegrown)||s.pendingOffers?.[0];return o?{method:'acceptOffer',argument:o,value:E.acceptOffer(s,o)}:null;}
    case'playing':return{method:'advanceProSeason',value:E.advanceProSeason(s,clubs)};
    case'newspaper':return{method:'dismissNewspaper',value:E.dismissNewspaper(s)};
    case'season_summary':return{method:'dismissSummary',value:E.dismissSummary(s,clubs)};
    case'ballon_dor':return{method:'dismissBallonDor',value:E.dismissBallonDor(s,clubs)};
    case'international_debut':return{method:'dismissDebut',value:E.dismissDebut(s,clubs)};
    case'world_cup':return{method:'dismissWorldCup',value:E.dismissWorldCup(s,clubs)};
    case'rivalry_event':return{method:'dismissRivalryEvent',value:E.dismissRivalryEvent(s,clubs)};
    case'social_media_action':return{method:'dismissSocialMediaPhase',value:E.dismissSocialMediaPhase(s,clubs)};
    case'moral_dilemma':return{method:'dismissMoralDilemma',value:E.dismissMoralDilemma(s,clubs)};
    case'red_card_appeal_result':return{method:'dismissAppealResult',value:E.dismissAppealResult(s,clubs)};
    case'rehab_choice':return{method:'applyRehabChoice',argument:1,value:E.applyRehabChoice(s,1)};
    case'random_events':return s.pendingEvents?.length?{method:'applyEventChoice',argument:0,value:E.applyEventChoice(s,0,clubs)}:null;
    case'retirement_suggestion':return{method:'declineRetirementSuggestion',value:E.declineRetirementSuggestion(s,clubs)};
    case'transfer_window':{const t=s.transferSituation;if(t?.type==='frozen_out'&&t.mode==='released'){const o=t.offers?.find(x=>x.club.name==='Anderlecht')||t.offers?.[0];return o?{method:o.isLoan?'acceptLoan':'acceptOffer',argument:o,value:o.isLoan?E.acceptLoan(s,o):E.acceptOffer(s,o)}:null;}return{method:'stayAtClub',value:E.stayAtClub(s)};}
    default:return null;
  }
}
function career(arm,seed) {
  const E=arm.api.engine,clubs=E.FALLBACK_CLUBS; const gen=rng(seed),values=[];const prior=arm.math.random;arm.math.random=()=>{const v=gen();values.push(v);return v;};const frames=[];let s,witness=null;
  const frame=(method,before,argument,result,start)=>{frames.push({method,start,end:values.length,before:hold(before),inputAfter:hold(s),argument:hold(argument??null),after:hold(result)});s=result;};
  try {
    const start=values.length;const abilities={pace:60,shooting:60,passing:60,dribbling:60,defending:60,physical:60,reflexes:60};
    s=E.initCareer(`Belgian replay ${seed}`,'Belgium','ST','2010-14',abilities,60,2010,clubs,null,92);frames.push({method:'initCareer',start,end:values.length,arguments:hold([s.playerName,'Belgium','ST','2010-14',abilities,60,2010,clubs,null,92]),after:hold(s)});
    for(let step=0;step<320&&!s.retired;step++){
      const latest=s.seasons.at(-1);if(s.phase==='season_summary'&&s.pendingSummary?.type==='playing'&&s.pendingSummary.year===2025&&s.pendingSummary.club==='Anderlecht'&&s.pendingSummary.apps>0&&!witness)witness=hold(s);
      if(latest?.year>=2026)break;const before=clone(s),begin=values.length;const next=dispatch(E,s,clubs);if(!next)break;frame(next.method,before,next.argument,next.value,begin);
    }
    return{seed,initial:frames[0].after,final:hold(s),frames,draws:hold(values),count:values.length,witness,stop:s.seasons.at(-1)?.year>=2026?'reached2026':s.retired?'retired':'unsupported phase or320 action bound'};
  }catch(e){return{seed,initial:frames[0]?.after??null,final:hold(s??null),frames,draws:hold(values),count:values.length,witness,error:{message:String(e),stack:e.stack}};
  }finally{arm.math.random=prior;}
}
function derive(A,save,row) {
  const ctx=A.soccer.buildSoccerSeasonCtx(save,A.engine.FALLBACK_CLUBS,row);const plan=A.core.deriveSeason(A.soccer.SOCCER,row,ctx);assert(plan,'actual season derives');
  const planned=A.core.planMoments(A.soccer.SOCCER,row,ctx,plan);const ledger=A.moments.readSeasonMoments(save.seasonMoments);const entries=A.moments.ledgerOf(ledger,plan.key);
  const decided=ledger?.key===plan.key&&planned.length?A.core.applyDecisions(A.soccer.SOCCER,row,ctx,plan,planned,entries):plan;
  const season=A.events.soccerOwnGoals(decided,planned);return{ctx,plan,planned,ledger,entries,season};
}
function expectedNames(row,season) {
  if(row.type!=='playing'||row.year!==2025||season.mode!=='results'||!MEMBERS.includes(row.club))return null;
  const canon=n=>n==='FCV Dender EH'?'Dender':n;const names=season.labels.map(l=>l.named?l.name:'Opponent not recorded');const used=new Set([row.club]);
  for(const l of season.labels.slice(1)){if(l.named){const name=canon(l.name);if(!MEMBERS.includes(name)||used.has(name))return null;used.add(name);}}
  const slots=[...new Set(season.games.map(g=>g.opp))]; const remaining=MEMBERS.filter(n=>!used.has(n));let at=0;
  for(const slot of slots)if(slot!==0&&!season.labels[slot].named&&at<remaining.length)names[slot]=remaining[at++];return names;
}
function reading(arm,item) {
  const input={save:clone(item.save),row:clone(item.row),season:clone(item.season),ctx:clone(item.ctx)};const before=hold(input);
  const a=action(arm,item.id,711,()=>{const m=arm.api.model(input.row,input.ctx,input.season,null,'#5E2C81');const words=input.season.games.map(g=>g.events.map(e=>m.sport.clock.words(e,input.row.club,m.names[g.opp])));return{model:m,eventWords:words};});
  return{id:item.id,kind:item.kind,input:before,inputAfter:hold(input),output:a.record.output,draws:a.record.draws,count:a.record.count,stacks:a.record.stacks};
}
function checkReading(row,item,original) {
  const out=read(row.output),base=read(original.output),checks=[];const expected=expectedNames(item.row,item.season);
  attempt(checks,'read-only',()=>assert.equal(row.inputAfter,row.input));attempt(checks,'read-vector',()=>{assert.equal(row.count,0);same(read(row.draws),[]);});
  attempt(checks,'whole-season',()=>same(out.model.season,item.season));
  attempt(checks,'unrelated-model',()=>{const a=clone(out.model),b=clone(base.model);delete a.names;delete b.names;delete a.resultsWhy;delete b.resultsWhy;if(a.help?.intro)a.help.intro=a.help.intro.map(p=>INTRO_1337.find(([now])=>now===p)?.[1]??p);same(a,b);});
  attempt(checks,'display',()=>{if(expected){same(out.model.names,expected);assert.equal(out.model.resultsWhy,base.model.resultsWhy+' '+NOTE);const words=item.season.games.map((g,gi)=>g.events.map((e,ei)=>{if(e.kind!=='goal'||e.side!=='them')return base.eventWords[gi][ei];if(e.ownGoalBy){const who=e.ownGoalBy==='you'?'You':e.ownGoalBy==='teammate'?'A teammate':'An opponent';return `⚽ ${who} (O.G), goal for ${expected[g.opp]}`;}return `⚽ Goal, ${expected[g.opp]}`;}));same(out.eventWords,words,'complete event text with independent opponent-goal labels');}else same(out,base);});
  return checks;
}

async function pure() {
  const report={status:'running',head:execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim(),tree:execFileSync('git',['rev-parse','HEAD^{tree}'],{cwd:ROOT,encoding:'utf8'}).trim(),base:BASE,baseTree:TREE,cohort:{seeds:Array.from({length:32},(_,i)=>i+1),startYear:2010,nationality:'Belgium',overall:60,potential:92,position:'ST',bound:320,policy:'accept homegrown offer, stay unless released, first event choice, decline retirement suggestion'},arms:[],careers:[],readings:[],controls:[]};
  const heldFiles=[PAGE,HELPER,'src/data/belgianSeasonMembership.ts','scripts/simSoccerOpponentLabels.mjs','package.json','package-lock.json'];const before=heldFiles.map(file=>({file,sha256:sha(fs.readFileSync(path.join(ROOT,file),'utf8').replace(/\r\n/g,'\n'))}));
  let oldRoot;
  try {
    let hasBase=false;try{hasBase=execFileSync('git',['rev-parse',BASE+'^{tree}'],{cwd:ROOT,encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim()===TREE;}catch{/* A normal shallow checkout uses the certified component reversal below. */}
    /* Release AX: the pinned base is "this head with the overlay out" only while no other source moved. Once a later
       merge changes the engine (the Press room did: one more module in the bundle, and esbuild renames a helper that
       two modules both call clamp, so the function bodies this proof stores in a pending event differ between the two
       bundles although every career is the same), the whole base is no longer that tree. Then the original is the
       certified reversal of this head's own component, which is the same comparison on the tree in front of us. */
    if(hasBase){try{execFileSync('git',['diff','--quiet',BASE,'HEAD','--','src',':(exclude)'+PAGE,':(exclude)'+HELPER,':(exclude)src/data/belgianSeasonMembership.ts',':(exclude)src/test',':(exclude)src/**/*.test.ts',':(exclude)src/**/*.test.tsx'],{cwd:ROOT,stdio:'ignore'});}catch{hasBase=false;report.baseMoved='source outside the overlay differs from the pinned base, so the original is the certified reversal of this head';console.log('note: '+report.baseMoved);}}
    let old;if(hasBase){const tar=execFileSync('git',['archive','--format=tar',BASE],{cwd:ROOT,maxBuffer:150000000});write('original/source.tar.gz',gzipSync(tar,{level:9}));write('original/source-inventory.txt',execFileSync('git',['ls-tree','-r',BASE],{cwd:ROOT}));oldRoot=fs.mkdtempSync(path.join(os.tmpdir(),'opponent-original-'));execFileSync('tar',['-xf','-','-C',oldRoot],{input:tar});old=await bundle('original',oldRoot);report.originalScope='complete pinned f780 source';}
    else{old=await bundle('original',ROOT,null,{legacy:true});report.originalScope='canonical f780 component reconstructed, other engine/read modules from current shallow checkout';}
    const current=await bundle('current',ROOT);
    const remove={file:PAGE,from:'  const display = historical ?? belgian2025OpponentLabels(row, s);',to:'  const display = historical ?? null;'};
    const widen={file:HELPER,from:'row.year !== 2025',to:'row.year !== 2024 && row.year !== 2025'};
    const removed=await bundle('remove-overlay',ROOT,remove),wide=await bundle('widen-year',ROOT,widen),undo=await bundle('whole-undo',ROOT,null,{undoPatches:[remove,widen]});report.arms=[old,current,removed,wide,undo].map(a=>a.receipt);assert.equal(undo.receipt.compiled.sha256,current.receipt.compiled.sha256,'whole compiled undo');
    for(const seed of report.cohort.seeds){const a=career(old,seed),b=career(current,seed);report.careers.push({original:a,current:b});}
    write('careers.json',report.careers);
    for(const pair of report.careers){assert(!pair.current.error&&!pair.original.error,'no unexpected career exception '+pair.original.seed);same(pair.current,pair.original,'complete genuine career and draw vector '+pair.original.seed);}
    report.witnessCandidates=report.careers.filter(p=>p.current.witness).map(p=>{const saved=read(p.current.witness),row=saved.pendingSummary,actual=derive(current.api,saved,row),original=derive(old.api,clone(saved),clone(row));same(actual,original,'complete candidate original/current derived season');const names=expectedNames(row,actual.season),game2=actual.season.games[1];return{seed:p.current.seed,save:p.current.witness,actual:hold(actual),original:hold(original),game2:hold(game2),qualified:game2?.them>0&&names!==null&&MEMBERS.includes(names[game2.opp])};});
    const candidate=report.witnessCandidates.find(p=>p.qualified);assert(candidate,'32 declared careers contain a genuine senior2025 Anderlecht summary with a named game2 opponent goal');const selected=report.careers.find(p=>p.current.seed===candidate.seed);
    const save=read(selected.current.witness),row=save.pendingSummary;assert(save.seasons.some(r=>json(r)===json(row)),'summary is the actual recorded row');assert.equal(row.age,31);assert.equal(save.era,'2010-14');
    const actual=derive(current.api,save,row),originalActual=derive(old.api,clone(save),clone(row));same(actual,originalActual,'complete original/current derived season, moments and context');assert.equal(actual.season.mode,'results');
    const first={id:'genuine2025',kind:'actual progressed save',save,row,ctx:actual.ctx,season:actual.season};const cases=[first,{...first,id:'json-reload',kind:'exact full JSON save reload',save:clone(save),row:clone(row)}];
    for(const [id,year]of[['year2024',2024],['year2026',2026],['year-null',null],['year-string','2025'],['year-fraction',2025.5]])cases.push({...first,id,kind:'explicitly altered recorded year',row:{...clone(row),year}});
    for(const club of['Beveren','Everton']){const season=clone(actual.season);season.labels[0].name=club;cases.push({...first,id:'nonmember-'+club,kind:'explicitly altered identity',row:{...clone(row),club},season});}
    const named=clone(actual.season);const unnamed=named.games.find(g=>!named.labels[g.opp].named)?.opp;assert(unnamed>0);named.labels[unnamed]={...named.labels[unnamed],name:'Dender',named:true};cases.push({...first,id:'recorded-valid-name',kind:'explicitly recorded verified name counterexample',season:named});
    const alias=clone(named);alias.labels[unnamed].name='FCV Dender EH';cases.push({...first,id:'recorded-alias',kind:'explicitly recorded verified alias counterexample',season:alias});
    const contradiction=clone(named);contradiction.labels[unnamed].name='Beveren';cases.push({...first,id:'named-nonmember',kind:'explicitly recorded nonmember contradiction',season:contradiction});
    const duplicate=clone(named);duplicate.labels[unnamed].name='Anderlecht';cases.push({...first,id:'named-duplicate',kind:'explicitly recorded own-member contradiction',season:duplicate});
    const prior=save.seasons.find(r=>r.type==='playing'&&r.year===2024);assert(prior,'genuine prior saved season retained');cases.push({id:'actual2024',kind:'actual earlier saved season',save,row:prior,...derive(current.api,save,prior)});
    const next=report.careers.flatMap(p=>read(p.current.final).seasons.map(r=>({save:read(p.current.final),row:r}))).find(x=>x.row.type==='playing'&&x.row.year===2026);assert(next,'genuine2026 row retained');cases.push({id:'actual2026',kind:'actual later saved season',...next,...derive(current.api,next.save,next.row)});
    report.cases=hold(cases);const rowsByArm={};
    for(const arm of[current,removed,wide,undo]){
      const rows=[];for(const item of cases){const baseline=reading(old,item);const result=reading(arm,item);const checks=checkReading(result,item,baseline);
      rows.push({caseId:item.id,original:baseline,current:result,checks});}rowsByArm[arm.name]=rows;write(`reads/${arm.name}.json`,rows);report.readings.push({arm:arm.name,rows:hold(rows)});
    }
    const priorCase=cases.find(c=>c.id==='actual2024');const priorEligible=expectedNames({...priorCase.row,year:2025},priorCase.season)!==null;
    const maps={'current':[],'remove-overlay':['genuine2025/display','json-reload/display','recorded-valid-name/display','recorded-alias/display'],'widen-year':['year2024/display',...(priorEligible?['actual2024/display']:[])],'whole-undo':[]};
    for(const [name,rows]of Object.entries(rowsByArm)){const actualFailures=rows.flatMap(r=>failures(r.checks).map(id=>r.caseId+'/'+id));report.controls.push({arm:name,actualFailures,expected:maps[name]});}
    write('report.json',report);for(const control of report.controls)same(control.actualFailures,control.expected,control.arm+' exact failure map');
    const healthy=rowsByArm.current;
    for(const [name,rows]of Object.entries(rowsByArm))for(let i=0;i<rows.length;i++){
      if(name==='whole-undo')same(rows[i].current,healthy[i].current,'complete reader undo');
      if(name==='remove-overlay'||name==='widen-year'){const ids=maps[name].map(x=>x.split('/')[0]);if(!ids.includes(rows[i].caseId))assert.equal(rows[i].current.output,healthy[i].current.output,'all unrelated whole outputs held');}
    }
    const names=read(healthy[0].current.output).model.names;const opponents=[...new Set(actual.season.games.map(g=>g.opp))];const verified=opponents.map(i=>names[i]).filter(n=>MEMBERS.includes(n));same([...verified].sort(),MEMBERS.filter(n=>n!=='Anderlecht').sort(),'all15 verified opponent identities');assert.equal(opponents.filter(i=>names[i]==='Opponent not recorded').length,4,'four surplus opponent slots explicitly unrecorded');assert.notEqual(names[actual.season.games[1].opp],'Opponent not recorded','game2 named');
    for(const slot of opponents){const games=actual.season.games.filter(g=>g.opp===slot);assert.equal(games.length,2,'paired meetings');same(games.map(g=>g.home).sort(),[false,true],'one home and one away');}
    const healthyRead=healthy[0].current,detectors=[];
    for(const [field,id]of[['inputAfter','read-only'],['count','read-vector'],['output','whole-season'],['eventWords','display']]){
      const original=clone(healthyRead),fault=clone(original);if(field==='inputAfter')fault.inputAfter=hold({...read(original.input),omission:1});if(field==='count'){fault.count=1;fault.draws=hold([0.125]);}if(field==='output'){const out=read(original.output);out.model.season.games[0].us+=1;fault.output=hold(out);}if(field==='eventWords'){const out=read(original.output),at=actual.season.games[1].events.findIndex(e=>e.kind==='goal'&&e.side==='them');assert(at>=0,'actual game2 opponent-goal witness');out.eventWords[1][at]='opponent label omitted';fault.output=hold(out);}
      const bad=checkReading(fault,first,healthy[0].original),undoRow=clone(fault);const target=field==='eventWords'?'output':field;undoRow[target]=original[target];if(field==='count')undoRow.draws=original.draws;same(undoRow,original);const expected=field==='output'?['whole-season','unrelated-model']:[id];same(failures(bad),expected);assert.equal(failures(checkReading(undoRow,first,healthy[0].original)).length,0);detectors.push({field,intended:expected,original:hold(original),fault:hold(fault),undo:hold(undoRow),failures:failures(bad)});
    }
    report.observationDetectors=detectors;write('fixtures.json',{save:selected.current.witness,row:hold(row),actual:hold(actual),model:healthy[0].current.output,seed:selected.current.seed,progression:hold(selected),names,readOnlyMoments:actual.ledger?'actual saved ledger replayed':'no saved moment ledger in this genuine engine progression, planned moments and full derived events held'});
    report.sourceHold={before,after:heldFiles.map(file=>({file,sha256:sha(fs.readFileSync(path.join(ROOT,file),'utf8').replace(/\r\n/g,'\n'))}))};same(report.sourceHold.after,before);report.status='pass';write('objects.json',[...objects.values()]);write('report.json',report);
    console.log(`ok   ${report.careers.length} complete original/current careers, ${report.careers.reduce((n,p)=>n+p.current.frames.length,0)} actual action frames and ${report.careers.reduce((n,p)=>n+p.current.count,0)} unfiltered current draws`);
    console.log(`ok   ${cases.length} whole reader cases, ${report.controls.length} source arms, ${detectors.length} effective observation controls`);
    console.log(`ok   all15 verified identities,4 unrecorded slots and paired venues; compiled/full runtime undo and ${before.length} source holds`);
    console.log('PASS simSoccerOpponentLabels: complete original/current careers, display controls and whole undo');
  }catch(e){report.status='fail';report.error={message:String(e),stack:e.stack};write('objects.json',[...objects.values()]);write('report.json',report);throw e;}finally{if(oldRoot)fs.rmSync(oldRoot,{recursive:true,force:true});}
}

async function browserProof() {
  const inputRoot=path.resolve(ROOT,process.env.SOCCER_OPPONENT_LABELS_INPUT||'career-opponent-labels-artifacts/proof');const fixture=JSON.parse(fs.readFileSync(path.join(inputRoot,'fixtures.json'),'utf8')),save=read(fixture.save,inputRoot),actual=read(fixture.actual,inputRoot);
  /* Release AX: since Release AU a career event can leave a chance wheel receipt on the save, and until it is seen the
     wheel stands over the summary and takes every press (this proof was cut from a base without it and timed out on
     the Watch button under the wheel, in all three widths). The witness is a genuine save, so it can hold one. It is
     acknowledged here exactly as the page's own close writes it (seen true, nothing else), before the save is loaded:
     the journey then starts where a player stands once he has looked at his wheel, and every byte comparison below is
     against that save. The wheel has walks of its own. */
  const wheelAcknowledged=!!(save.chanceWheel&&typeof save.chanceWheel==='object'&&save.chanceWheel.seen===false);if(wheelAcknowledged)save.chanceWheel={...save.chanceWheel,seen:true};
  const saved=JSON.stringify(save);const inputReport=JSON.parse(fs.readFileSync(path.join(inputRoot,'report.json'),'utf8'));assert.equal(inputReport.status,'pass');
  const {default:pw}=await import('./lib/playwrightLoader.mjs');const port=4597,base=`http://127.0.0.1:${port}`;const server=spawn(process.execPath,[path.join(ROOT,'scripts/lib/hostLikeServer.mjs'),path.join(ROOT,'dist'),String(port)],{stdio:'pipe'});let serverText='';server.stdout.on('data',b=>serverText+=String(b));
  const report={status:'running',head:execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim(),input:{root:inputRoot,file:'fixtures.json',sha256:sha(fs.readFileSync(path.join(inputRoot,'fixtures.json'))),reportSha256:sha(fs.readFileSync(path.join(inputRoot,'report.json')))},journeys:[],detectors:[]};assert.equal(report.head,inputReport.head,'actual browser and fresh method source head');let browser;
  try{
    await new Promise((resolve,reject)=>{const end=Date.now()+15000;const poll=()=>{if(serverText.includes('host-like server:'))resolve();else if(Date.now()>end)reject(new Error('actual server readiness'));else setTimeout(poll,50);};poll();});browser=await pw.chromium.launch({args:['--no-sandbox','--no-proxy-server']});
    for(const width of[320,390,1280]){const row={width,height:width<500?844:900,status:'running',save:fixture.save,reads:[],shots:[],layouts:[],assets:[],errors:[],assetErrors:[],externalRequests:[]};report.journeys.push(row);let context;
      try{context=await browser.newContext({viewport:{width,height:row.height},reducedMotion:'reduce'});await context.addInitScript(([bytes])=>{if(!sessionStorage.getItem('opponent-loaded')){sessionStorage.setItem('opponent-loaded','1');localStorage.setItem('soccerCareerSave',bytes);localStorage.setItem('cookie-consent','essential');localStorage.setItem('seasonCentre:help','1');}window.__opponentBoot=[];const real=Math.random;Math.random=()=>{const value=real();window.__opponentBoot.push({value,stack:new Error('site startup').stack});return value;};window.__opponentMonitor=()=>{window.__opponentReads=[];Math.random=()=>{const value=real();window.__opponentReads.push({value,stack:new Error('actual UI read/action').stack});return value;};};},[saved]);
        await context.route('**/*',route=>{const url=route.request().url();if(url.startsWith(base+'/')||url.startsWith('data:'))return route.continue();row.externalRequests.push(url);return route.abort();});row.fontScope='network-free installed fallback fonts, actual document.fonts.ready; saved help preference already seen';
        const page=await context.newPage(),assetTasks=[];page.on('pageerror',e=>row.errors.push({message:String(e),stack:e.stack}));page.on('response',response=>{if(response.url().startsWith(base+'/assets/'))assetTasks.push((async()=>{try{const body=await response.body();row.assets.push({url:response.url(),status:response.status(),body:hold(body.toString('base64')),bytes:body.length,sha256:sha(body)});}catch(e){row.assetErrors.push(String(e));}})());});
        const response=await page.goto(base+'/soccer-career',{waitUntil:'networkidle'});row.document=hold((await response.body()).toString('base64'));await page.locator('[data-watch-week-by-week]').waitFor({state:'visible'});row.startup=hold(await page.evaluate(()=>window.__opponentBoot));row.loadedSave=hold(await page.evaluate(()=>localStorage.getItem('soccerCareerSave')));assert.equal(read(row.loadedSave),saved,'whole initial saved raw JSON');
        const bodyState=()=>page.evaluate(()=>({attribute:document.body.getAttribute('style'),declarations:Array.from(document.body.style).map(k=>[k,document.body.style.getPropertyValue(k),document.body.style.getPropertyPriority(k)]),overflow:getComputedStyle(document.body).overflow,pointerEvents:getComputedStyle(document.body).pointerEvents,marginRight:getComputedStyle(document.body).marginRight,position:getComputedStyle(document.body).position}));row.bodyBefore=await bodyState();
        const openGame2=async()=>{await page.evaluate(()=>window.__opponentMonitor());await page.locator('[data-watch-week-by-week]').click();await page.locator('[data-centre-header]').waitFor({state:'visible'});
          const arrive=async md=>{for(let turn=0;turn<16;turn++){await page.waitForFunction(md=>!!document.querySelector(`[data-matchday="${md}"] [data-full-time]`)||!!document.querySelector('[data-moment-pass]')||Array.from(document.querySelectorAll('[data-centre-bar] button')).some(b=>b.textContent.trim()===`▶ League game ${md}`),md,{timeout:30000});
            if(await page.locator('[data-moment-pass]').isVisible())await page.locator('[data-moment-pass]').click();else if(await page.locator(`[data-matchday="${md}"] [data-full-time]`).isVisible())return;else await page.getByRole('button',{name:`▶ League game ${md}`,exact:true}).click();}throw new Error('actual match arrival bound');};
          await page.getByRole('button',{name:'▶ Kick off',exact:true}).click();await arrive(1);await page.getByRole('button',{name:'▶ League game 2',exact:true}).click();await arrive(2);
          const game=actual.season.games[1],name=fixture.names[game.opp],bar=await page.locator('[data-matchday="2"] [data-score-bar]').innerText(),scoreboard=await page.locator('[data-matchday="2"] [data-score-bar] span').allTextContents(),clock=await page.locator('[data-matchday="2"] [data-match-clock]').getAttribute('data-score'),events=await page.locator('[data-matchday="2"] [data-clock-events] li').allTextContents(),expected=read(fixture.model,inputRoot).eventWords[1];
          assert.equal(clock,`${game.us}-${game.them}`);same(scoreboard,game.home?['Anderlecht',`${game.us}-${game.them}`,name]:[name,`${game.them}-${game.us}`,'Anderlecht'],'complete venue-ordered scoreboard');if(expected.length){assert.equal(events.length,expected.length);expected.forEach((word,i)=>assert(events[i].includes(word),'actual ordered event label '+word));}else{assert.equal(events.length,1);assert(events[0].includes('Kick off.'));}return{game:hold(game),name,bar,scoreboard,events,expected,clock};};
        row.game2=await openGame2();
        const measure=async(label,target)=>{const facts=await page.evaluate(async([label,selector])=>{await document.fonts.ready;await Promise.all(document.getAnimations().filter(a=>a.playState==='running'&&Number.isFinite(a.effect?.getComputedTiming().endTime)).map(a=>a.finished.catch(()=>{})));let stable=0,previous='';for(let n=0;n<4;n++){await new Promise(r=>requestAnimationFrame(r));const e=document.querySelector(selector),r=e?.getBoundingClientRect();const value=JSON.stringify(r&&[r.x,r.y,r.width,r.height]);if(value===previous)stable++;previous=value;}const e=document.querySelector(selector),r=e?.getBoundingClientRect();const points=r?[[.5,.5],[.2,.2],[.8,.2],[.2,.8],[.8,.8]].map(([x,y])=>{const px=r.x+r.width*x,py=r.y+r.height*y,hit=document.elementFromPoint(px,py);return{px,py,hit:hit?.outerHTML??null,painted:!!hit&&(hit===e||e.contains(hit))};}):[];return{label,width:innerWidth,height:innerHeight,visualWidth:visualViewport?.width??innerWidth,visualHeight:visualViewport?.height??innerHeight,scale:visualViewport?.scale??1,overflow:document.documentElement.scrollWidth>innerWidth,stableFrames:stable+1,finiteAnimations:document.getAnimations().filter(a=>a.playState==='running'&&Number.isFinite(a.effect?.getComputedTiming().endTime)).length,rect:r&&{x:r.x,y:r.y,width:r.width,height:r.height},inside:!!r&&r.left>=0&&r.top>=0&&r.right<=innerWidth&&r.bottom<=innerHeight,points,body:{attribute:document.body.getAttribute('style'),declarations:Array.from(document.body.style).map(k=>[k,document.body.style.getPropertyValue(k),document.body.style.getPropertyPriority(k)])},fonts:document.fonts.status};},[label,target]);row.layouts.push(facts);assert.equal(facts.width,width);assert.equal(facts.height,row.height);assert.equal(facts.visualWidth,width);assert.equal(facts.visualHeight,row.height);assert.equal(facts.scale,1);assert.equal(facts.overflow,false);assert.equal(facts.finiteAnimations,0);assert(facts.inside);assert(facts.rect.width>0&&facts.rect.height>0);assert.equal(facts.stableFrames,4);assert(facts.points.every(p=>p.painted));assert.equal(facts.fonts,'loaded');return facts;};
        await measure('game2 scoreboard','[data-matchday="2"] [data-score-bar]');row.shots.push(write(`shots/${width}-game2.png`,await page.screenshot()));
        if(width<500)await page.locator('[data-centre-fixtures]').click();
        const list=page.locator(width<500?'[data-centre-stage] [data-fixture-name]':'aside[aria-label="Fixtures"] [data-fixture-name]');await list.first().waitFor({state:'visible'});row.fixtureText=await list.allTextContents();same(row.fixtureText,actual.season.games.map(g=>fixture.names[g.opp]),'complete actual fixture DOM order');for(const name of MEMBERS.filter(n=>n!=='Anderlecht'))assert(row.fixtureText.includes(name),'actual fixture identity '+name);assert(row.fixtureText.includes('Opponent not recorded'));row.shots.push(write(`shots/${width}-fixtures.png`,await page.screenshot()));
        if(width<500)await page.locator('[data-centre-stage]').getByRole('button',{name:'← Back',exact:true}).click();
        await page.locator('[data-centre-exit]').click();await page.locator('[data-season-centre]').waitFor({state:'hidden'});row.saveAfter=hold(await page.evaluate(()=>localStorage.getItem('soccerCareerSave')));row.reads=hold(await page.evaluate(()=>window.__opponentReads));assert.equal(read(row.saveAfter),saved,'whole saved bytes after actual replay');assert.equal(read(row.reads).length,0,'all postboot UI read draws');row.bodyAfter=await bodyState();same(bodyRestoreState(row.bodyAfter),bodyRestoreState(row.bodyBefore),'complete body declarations and computed modal restore');
        await page.reload({waitUntil:'networkidle'});await page.locator('[data-watch-week-by-week]').waitFor({state:'visible'});row.reloadStartup=hold(await page.evaluate(()=>window.__opponentBoot));row.reloadSave=hold(await page.evaluate(()=>localStorage.getItem('soccerCareerSave')));assert.equal(read(row.reloadSave),saved);await page.evaluate(()=>localStorage.removeItem('seasonCentre:v1:soccer'));row.reloadedGame2=await openGame2();same(row.reloadedGame2,row.game2,'full DOM game2 after exact save reload');await measure('reloaded game2 scoreboard','[data-matchday="2"] [data-score-bar]');row.shots.push(write(`shots/${width}-game2-reload.png`,await page.screenshot()));await page.locator('[data-centre-exit]').click();await page.locator('[data-season-centre]').waitFor({state:'hidden'});row.reloadFinalSave=hold(await page.evaluate(()=>localStorage.getItem('soccerCareerSave')));row.reloadReads=hold(await page.evaluate(()=>window.__opponentReads));assert.equal(read(row.reloadFinalSave),saved);assert.equal(read(row.reloadReads).length,0);row.bodyReloadAfter=await bodyState();same(bodyRestoreState(row.bodyReloadAfter),bodyRestoreState(row.bodyBefore));await Promise.all(assetTasks);same(row.errors,[],'no actual page crash');same(row.assetErrors,[],'all served asset bodies retained');row.status='pass';
      }catch(e){row.status='fail';row.error={message:String(e),stack:e.stack};if(context){const page=context.pages()[0];if(page)row.shots.push(write(`shots/${width}-failure.png`,await page.screenshot().catch(()=>Buffer.alloc(0))));}}finally{if(context)await context.close();write('report.json',report);}}
    assert(report.journeys.every(r=>r.status==='pass'),'all3 native saved-row journeys');
    const original=clone(report.journeys[0].layouts[0]),bad=clone(original);
    Object.assign(bad,{width:1,height:1,visualWidth:1,visualHeight:1,scale:2,overflow:true,finiteAnimations:1,inside:false,stableFrames:0,fonts:'loading'});bad.points[0].painted=false;bad.rect.width=0;
    const detect=x=>Object.entries({width:x.width===320,height:x.height===844,visualWidth:x.visualWidth===320,visualHeight:x.visualHeight===844,scale:x.scale===1,overflow:!x.overflow,animations:x.finiteAnimations===0,inside:x.inside,stable:x.stableFrames===4,fonts:x.fonts==='loaded',painted:x.points.every(p=>p.painted),rect:x.rect.width>0&&x.rect.height>0}).filter(([,ok])=>!ok).map(([id])=>id);
    same(detect(original),[]);same(detect(bad),['width','height','visualWidth','visualHeight','scale','overflow','animations','inside','stable','fonts','painted','rect']);const undo=clone(bad);for(const key of['width','height','visualWidth','visualHeight','scale','overflow','finiteAnimations','inside','stableFrames','fonts'])undo[key]=original[key];undo.points[0].painted=original.points[0].painted;undo.rect.width=original.rect.width;same(undo,original);same(detect(undo),[]);report.detectors.push({kind:'geometry',original:hold(original),fault:hold(bad),undo:hold(undo),failures:detect(bad)});
    const r=report.journeys[0],facts={loaded:read(r.loadedSave),after:read(r.saveAfter),reloaded:read(r.reloadSave),final:read(r.reloadFinalSave),game2:r.game2,reloadedGame2:r.reloadedGame2,fixtures:r.fixtureText,reads:read(r.reads),reloadReads:read(r.reloadReads),bodyBefore:r.bodyBefore,bodyAfter:r.bodyAfter,bodyReloadAfter:r.bodyReloadAfter,errors:r.errors,assetErrors:r.assetErrors};
    const g=actual.season.games[1],n=fixture.names[g.opp],scoreboard=g.home?['Anderlecht',`${g.us}-${g.them}`,n]:[n,`${g.them}-${g.us}`,'Anderlecht'];
    const detectFacts=f=>Object.entries({'whole-save':[f.loaded,f.after,f.reloaded,f.final].every(s=>s===saved),scoreboard:json(f.game2.scoreboard)===json(scoreboard)&&f.game2.clock===`${g.us}-${g.them}`,'goal-labels':f.game2.expected.length?f.game2.events.length===f.game2.expected.length&&f.game2.expected.every((s,i)=>f.game2.events[i].includes(s)):f.game2.events.length===1&&f.game2.events[0].includes('Kick off.'),'fixture-order':json(f.fixtures)===json(actual.season.games.map(g=>fixture.names[g.opp])),'read-vector':f.reads.length===0&&f.reloadReads.length===0,'body-restore':json(bodyRestoreState(f.bodyBefore))===json(bodyRestoreState(f.bodyAfter))&&json(bodyRestoreState(f.bodyBefore))===json(bodyRestoreState(f.bodyReloadAfter)),'page-errors':f.errors.length===0&&f.assetErrors.length===0,'reloaded-game2':json(f.reloadedGame2)===json(f.game2)}).filter(([,ok])=>!ok).map(([id])=>id);
    same(detectFacts(facts),[]);const fault=clone(facts);fault.after+=' ';fault.game2.scoreboard[1]='99-99';fault.game2.events=['omitted event'];fault.fixtures.pop();fault.reads=[{value:0.125,stack:'copied observation'}];fault.bodyAfter.position='absolute';fault.errors.push('copied page error');const restored=clone(fault);for(const key of['after','game2','fixtures','reads','bodyAfter','errors'])restored[key]=clone(facts[key]);same(restored,facts);same(detectFacts(fault),['whole-save','scoreboard','goal-labels','fixture-order','read-vector','body-restore','page-errors','reloaded-game2']);same(detectFacts(restored),[]);const emptyAttributeEquivalent=clone(facts);assert.equal(facts.bodyBefore.attribute,null);assert.equal(facts.bodyAfter.attribute,'');emptyAttributeEquivalent.bodyAfter.attribute=null;assert.notEqual(emptyAttributeEquivalent.bodyAfter.attribute,facts.bodyAfter.attribute);same(detectFacts(emptyAttributeEquivalent),[]);const nonemptyAttributeFault=clone(facts);nonemptyAttributeFault.bodyAfter.attribute='overflow: hidden;';assert.notEqual(nonemptyAttributeFault.bodyAfter.attribute,facts.bodyAfter.attribute);same(detectFacts(nonemptyAttributeFault),['body-restore']);const bodyAttributeUndo=clone(nonemptyAttributeFault);bodyAttributeUndo.bodyAfter=clone(facts.bodyAfter);same(bodyAttributeUndo,facts);same(detectFacts(bodyAttributeUndo),[]);report.detectors.push({kind:'facts',original:hold(facts),fault:hold(fault),undo:hold(restored),failures:detectFacts(fault),emptyAttributeEquivalent:hold(emptyAttributeEquivalent),nonemptyAttributeFault:hold(nonemptyAttributeFault),bodyAttributeUndo:hold(bodyAttributeUndo),bodyAttributeFailures:detectFacts(nonemptyAttributeFault)});
    report.status='pass';write('objects.json',[...objects.values()]);write('report.json',report);console.log('PASS simSoccerOpponentLabels browser: 3 actual saved-row journeys, complete saves and read vectors');
  }catch(e){report.status='fail';report.error={message:String(e),stack:e.stack};write('objects.json',[...objects.values()]);write('report.json',report);throw e;}finally{if(browser)await browser.close();server.kill();}
}

if(process.env.SOCCER_OPPONENT_LABELS_BROWSER==='1')await browserProof();else await pure();
