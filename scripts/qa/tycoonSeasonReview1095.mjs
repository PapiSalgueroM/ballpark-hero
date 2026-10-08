/* Finite actual page and running-season proof, not an app-shell or campaign sweep. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
assert(process.env.CI, 'Run this verification only in remote CI');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ART = path.join(ROOT, 'tycoon-season-review-artifacts'), OUT = path.join(ART, 'native'), CACHE = path.join(ART, 'asset-cache');
const PAGE = 'src/pages/StadiumTycoon.tsx', HOOK = 'src/hooks/useStadiumTycoon.ts', BASE = '23a540a8dfa5b3335821b94f9ab05134272f85ab', NOW = Date.parse('2026-10-07T12:00:00Z');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
function fileSha(file) { { const bytes = fs.readFileSync(file); return sha(bytes); } }
const read = file => fs.readFileSync(file, 'utf8').replace(/\r\n?/g, '\n');
const clone = value => JSON.parse(JSON.stringify(value));
const save = (file, value) => fs.writeFileSync(path.join(OUT, file), JSON.stringify(value, null, 2));
const template = read(path.join(ROOT, 'index.html'));
const fontLinks = [...template.replace(/<!--[\s\S]*?-->/g, '').matchAll(/<link\s+href="(https:\/\/fonts\.googleapis\.com\/[^\"]+)"\s+rel="stylesheet"/g)].map(match => new URL(match[1]).href);
assert.equal(fontLinks.length, 1);
if (process.argv.includes('--prefetch-assets-only')) {
  fs.mkdirSync(CACHE, { recursive: true }); const manifest = [];
  async function cached(url) {
    assert(['https://fonts.googleapis.com', 'https://fonts.gstatic.com'].includes(new URL(url).origin));
    const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(20000) }); assert.equal(response.status, 200);
    const body = Buffer.from(await response.arrayBuffer()), file = sha(url); fs.writeFileSync(path.join(CACHE, file), body);
    manifest.push({ url, file, sha256: sha(body), bytes: body.length, contentType: response.headers.get('content-type') }); return body.toString('utf8');
  }
  const css = await cached(fontLinks[0]);
  const urls = [...new Set([...css.matchAll(/url\(['"]?(https:\/\/fonts\.gstatic\.com\/[^)'"\s]+)/g)].map(match => match[1]))];
  assert(urls.length); for (const url of urls) await cached(url);
  fs.writeFileSync(path.join(CACHE, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`Cached ${manifest.length} actual template font payloads.`); process.exit(0);
}
fs.mkdirSync(OUT, { recursive: true });
function hashes(dirs, extra = []) {
  const map = {};
  function walk(dir) { for (const item of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).sort((a,b) => a.name.localeCompare(b.name))) {
    const file = `${dir}/${item.name}`; if (item.isDirectory()) walk(file); else map[file] = fileSha(path.join(ROOT, file));
  } }
  dirs.forEach(walk); for (const file of extra) map[file] = fileSha(path.join(ROOT, file)); return map;
}
const sources = () => hashes(['src', 'scripts'], ['index.html', 'package.json', 'package-lock.json']);
const report = { complete:false,phase:'prepare',cases:[],controls:[],domControls:[],errors:[],
  scope:'Actual page and hook in a finite provider host, with exact accepted-parent page pairs.',
  limits:['Natural near-final fixtures are derived through the actual engine. Only the remaining 0.15 seconds of the first final minute are staged.',
    'Comma stress adds an explicitly staged 1,000 to each club GF and GA; W/D/L, points, ordering and league conservation remain unchanged.',
    'Natural journeys play the actual following season through RAF. Stress journeys cover the first actual finish only. No archive, reload, full-route or campaign claim.',
    'Pagehide samples are synthetic serializer flushes. The actual page and current save continue while the review is open.'],
  sourceBefore:sources(),buildBefore:hashes(['dist']),cacheBefore:hashes(['tycoon-season-review-artifacts/asset-cache']) };const persist = () => save('report.json', report);
function once(text, from, to) { assert.equal(text.split(from).length - 1, 1); const changed = text.replace(from, to); assert.notEqual(changed, text); assert.equal(changed.split(to).length - 1, 1); assert.equal(changed.replace(to, from), text); return changed; }
function bundleReceipt(result, name) {
  const outputs = {};
  for (const file of result.outputFiles) { fs.writeFileSync(file.path, file.contents); outputs[path.basename(file.path)] = { bytes: file.contents.length, sha256: sha(file.contents) }; }
  const inputs = Object.fromEntries(Object.keys(result.metafile.inputs).filter(file => file !== '<stdin>').map(file => [file, fileSha(path.resolve(ROOT, file))]));
  save(`${name}-binding.json`, { inputs, outputs }); save(`${name}-metafile.json`, result.metafile); return inputs;
}
let browser,server;
try {
  const copyDir=path.join(OUT,'copies');fs.mkdirSync(copyDir,{recursive:true});
  const parent=execFileSync('git',['rev-parse',BASE],{cwd:ROOT,encoding:'utf8'}).trim();report.parent=parent;
  assert.deepEqual(execFileSync('git',['diff','--name-only',parent,'--','src'],{cwd:ROOT,encoding:'utf8'}).trim().split('\n'),[PAGE]);
  const old=execFileSync('git',['show',`${parent}:${PAGE}`],{cwd:ROOT,encoding:'utf8'}).replace(/\r\n?/g,'\n'),current=read(path.join(ROOT,PAGE));
  const inserted=current.slice(current.indexOf('function LatestSeasonReview('),current.indexOf('/* Round 582: the league.'));
  assert(inserted.startsWith('function LatestSeasonReview(')&&inserted.endsWith('\n\n'));
  const oldLast=old.slice(old.indexOf('      {last && ('),old.indexOf('      {options.length > 0'));
  assert(oldLast.startsWith('      {last && (')&&oldLast.endsWith('\n'));
  const inverse=[
    ["import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';","import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';"],
    ['SET_PIECE_WINDOW_SEC, type TycoonLeague,','SET_PIECE_WINDOW_SEC,'],
    ["import { useStadiumTycoon, type LastSeason } from '@/hooks/useStadiumTycoon';","import { useStadiumTycoon } from '@/hooks/useStadiumTycoon';"],
    [inserted,''],['      {last && <LatestSeasonReview last={last} league={lg} />}\n',oldLast],
  ];
  let restored=current;for(const[from,to]of inverse){assert.equal(restored.split(from).length-1,1);restored=restored.replace(from,to);}assert.equal(restored,old);
  const faults=[
    {name:'headline',assertion:'Actual season headline',stage:'natural',from:'{snapshot.label}</p>',to:"{'Season over'}</p>"},
    {name:'position',assertion:'Actual finishing position',stage:'natural',from:'{ordinal(snapshot.position)} of',to:'{ordinal(snapshot.position + 1)} of'},
    {name:'table',assertion:'Actual complete final table',stage:'natural',from:'{formatSeasonCount(club.pts)}</td>',to:'{formatSeasonCount(club.gf)}</td>'},
    {name:'live',assertion:'Opened season remains immutable',stage:'natural',long:true,from:'  const [snapshot, setSnapshot] = useState(last);',to:'  const [, setSnapshot] = useState(last); const snapshot = last;'},
    {name:'stale',assertion:'Reopen reads the latest completed season',stage:'natural',long:true,from:'    if (next) setSnapshot({ ...last, table: last.table.map(club => ({ ...club })) });',to:'    if (next && !snapshot) setSnapshot({ ...last, table: last.table.map(club => ({ ...club })) });'},
    {name:'commas',assertion:'Actual goal counts keep comma grouping',stage:'stress',from:"  const formatSeasonCount = (value: number) => value.toLocaleString('en-US');",to:'  const formatSeasonCount = (value: number) => String(value);'},
    {name:'side-effect',assertion:'Review opening has no gameplay side effect',stage:'natural',from:'      {last && <LatestSeasonReview last={last} league={lg} />}',to:'      {last && <div onClick={() => g.doTap(50, 50)}><LatestSeasonReview last={last} league={lg} /></div>}'},
    {name:'back-size',assertion:'Back is a visible 44px target',stage:'natural',from:'onClick={() => changeOpen(false)} className="min-h-11 min-w-11 w-full',to:'onClick={() => changeOpen(false)} style={{ height: 20, minHeight: 20 }} className="min-h-11 min-w-11 w-full'},
  ];
  const arms=[['old',old],['current',current],...faults.map(f=>[f.name,once(current,f.from,f.to)])];
  for(const[name,text]of arms)fs.writeFileSync(path.join(copyDir,`${name}.tsx`),text);
  save('source-relation.json',{parent,originalRaw:fileSha(path.join(ROOT,PAGE)),currentNormalized:sha(current),oldNormalized:sha(old),inverse,faults:faults.map(f=>({...f,copiedSha256:sha(arms.find(([name])=>name===f.name)[1])}))});
  const oracle = await build({ absWorkingDir:ROOT, stdin:{contents:`export * as T from './src/lib/stadiumTycoon'; export * as R from './src/lib/tycoonRewards'; export * as W from './src/lib/wonderkidFactory';`,resolveDir:ROOT}, outfile:path.join(OUT,'oracle.mjs'),bundle:true,write:false,platform:'node',format:'esm',metafile:true,alias:{'@':path.join(ROOT,'src')},logLevel:'silent' });
  const oracleInputs=bundleReceipt(oracle,'oracle'), oracleFile=path.join(OUT,'oracle.mjs');
  const epochFile='src/lib/entityIds.ts', epochSource='const EPOCH = `${Math.floor(Math.random() * 0x100000000).toString(36)}${Math.floor(Math.random() * 0x100000000).toString(36)}`;';
  assert.equal(oracleInputs[epochFile],report.sourceBefore[epochFile]);
  assert.equal(read(path.join(ROOT,epochFile)).split('\n').filter(line=>line===epochSource).length,1);
  const epochEmitted=epochSource.replace('const EPOCH','var EPOCH').replaceAll('0x100000000','4294967296'), oracleCode=read(oracleFile), oracleLines=oracleCode.split('\n');
  const epochIndexes=oracleLines.flatMap((line,index)=>line===epochEmitted?[index]:[]); assert.equal(epochIndexes.length,1);
  const epochLine=epochIndexes[0]+1; assert.equal(oracleLines[epochLine-2],`// ${epochFile}`);
  const epochColumns=[...epochEmitted.matchAll(/Math\.random\(\)/g)].map(match=>match.index+'Math.'.length+1); assert.equal(epochColumns.length,2);
  const countMessage='Only two entity-ID epoch initialization draws', callerMessage='Initialization draw must originate at the exact emitted epoch call';
  const initReceipt=file=>({complete:false,seed:1095,state:1095,draws:[],source:{path:epochFile,sha256:oracleInputs[epochFile],line:epochSource},emitted:{path:path.basename(file),sha256:fileSha(file),line:epochLine,expectedCode:epochEmitted,actualCode:read(file).split('\n')[epochLine-1],columns:epochColumns}});
  async function importOracle(file,receipt){
    const url=pathToFileURL(file).href;
    // Only the two source-bound entity-ID epoch calls may draw while this module initializes.
    Math.random=()=>{
      const stack=new Error('Oracle initialization draw').stack,caller=stack.split('\n')[2]?.trim(),index=receipt.draws.length,stateBefore=receipt.state;
      receipt.state=(Math.imul(receipt.state,1664525)+1013904223)>>>0;
      const value=receipt.state/0x100000000,expectedCaller=`at ${url}:${epochLine}:${epochColumns[index]}`;
      receipt.draws.push({index,stateBefore,stateAfter:receipt.state,value,caller,expectedCaller,stack});
      assert(index<2,countMessage); assert.equal(caller,expectedCaller,callerMessage); return value;
    };
    try { const module=await import(url); assert.equal(receipt.draws.length,2,'Exactly two entity-ID epoch initialization draws'); receipt.complete=true; return module; }
    catch(error){receipt.error={name:error.name,message:error.message,stack:error.stack};throw error;}
    finally { Math.random=()=>{throw new Error('Pure fixture operation consumed ambient RNG');}; save(`${path.basename(file,'.mjs')}-initialization.json`,receipt); }
  }
  report.oracleInitialization=initReceipt(oracleFile); report.oracleInitializationControls=[];
  const realRandom=Math.random, RealDate=Date; let T,R,W,fixtures,seedSaves;
  try {
    globalThis.Date=class extends RealDate{constructor(...args){super(...(args.length?args:[NOW]));}static now(){return NOW;}};
    ({T,R,W}=await importOracle(oracleFile,report.oracleInitialization));
    const importFaults=[
      {name:'extra-draw',assertion:countMessage,to:epochEmitted.slice(0,-1)+' + Math.random();',draws:3},
      {name:'wrong-caller',assertion:callerMessage,to:epochEmitted.replace('Math.random()','(() => Math.random())()'),draws:1},
    ];
    for(const fault of importFaults){
      const file=path.join(OUT,`oracle-init-${fault.name}.mjs`),copied=once(oracleCode,epochEmitted,fault.to);fs.writeFileSync(file,copied);
      const row={name:fault.name,complete:false,assertion:fault.assertion,from:epochEmitted,to:fault.to,originalSha256:fileSha(oracleFile),copiedSha256:fileSha(file),receipt:initReceipt(file)};
      report.oracleInitializationControls.push(row); let error;
      try{await importOracle(file,row.receipt);}catch(caught){error=caught;}
      assert(error instanceof assert.AssertionError);assert(error.message.includes(fault.assertion));assert.equal(row.receipt.complete,false);assert.equal(row.receipt.draws.length,fault.draws);
      const stateDraws=receipt=>receipt.draws.map(({index,stateBefore,stateAfter,value})=>({index,stateBefore,stateAfter,value}));
      assert.deepEqual(stateDraws(row.receipt).slice(0,Math.min(fault.draws,2)),stateDraws(report.oracleInitialization).slice(0,Math.min(fault.draws,2)));
      if(fault.name==='wrong-caller')assert.notEqual(row.receipt.draws[0].caller,row.receipt.draws[0].expectedCaller);
      row.complete=true;save(`oracle-init-${fault.name}-control.json`,row);
    }
    let state=T.newTycoon(NOW),seed=1095;const draws=[],history=[];
    const roll=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;const value=seed/4294967296;draws.push(value);return value;};
    const firstShape=T.leagueShape(state.league.division);
    for(let minute=0;minute<firstShape.matchdays*90-1;minute++){
      const before=clone(state),index=draws.length,result=T.tick(state,1.4,roll);state=result.state;
      history.push({minute,drawStart:index,drawEnd:draws.length,before,after:clone(state),events:clone(result.events)});
    }
    assert.equal(state.league.matchday,firstShape.matchdays-1);assert.equal(state.minute,89);
    const derived=clone(state);state.matchSec=1.25;
    const natural=T.deserializeTycoon(T.serializeTycoon(state,NOW),NOW);assert.deepEqual(natural.league,state.league);
    const stress=clone(natural);stress.league.clubs=stress.league.clubs.map(club=>({...club,gf:club.gf+1000,ga:club.ga+1000}));
    assert.deepEqual(T.deserializeTycoon(T.serializeTycoon(stress,NOW),NOW),stress);
    fixtures={natural,stress};const reward=R.newLedger(1095),academy=W.newFactory(NOW,1095);seedSaves={reward:JSON.stringify(reward),academy:W.serialize(academy)};
    save('fixtures.json',{now:NOW,firstShape,draws,history,derived,fixtures,staging:report.limits.slice(0,2),reward,academy,seedSaves});
  }finally{Math.random=realRandom;globalThis.Date=RealDate;}
  const observer=path.join(copyDir,'hook-observer.ts'),engineObserver=path.join(copyDir,'engine-observer.ts');
  fs.writeFileSync(observer,`import {useLayoutEffect} from 'react';import{useStadiumTycoon as actual}from${JSON.stringify(path.join(ROOT,HOOK))};const copy=v=>JSON.parse(JSON.stringify(v));export function useStadiumTycoon(edge){const g=actual(edge);useLayoutEffect(()=>{window.__season.hook=copy(Object.fromEntries(Object.entries(g).filter(([,value])=>typeof value!=='function')));});return{...g,doTap:(...args)=>{window.__season.calls.push({action:'tap',args,now:Date.now(),performance:performance.now()});return g.doTap(...args);}};}`);
  fs.writeFileSync(engineObserver,`export * from ${JSON.stringify(path.join(ROOT,'src/lib/stadiumTycoon.ts'))};import{tick as actual}from${JSON.stringify(path.join(ROOT,'src/lib/stadiumTycoon.ts'))};const copy=v=>JSON.parse(JSON.stringify(v));export function tick(state,dt,roll,edge){const q=window.__season,before=copy(state),drawStart=q.readRandom().draws.length,result=actual(state,dt,roll,edge);q.ticks.push({before,dt,edge:edge??0,drawStart,drawEnd:q.readRandom().draws.length,after:copy(result.state),events:copy(result.events),now:Date.now(),performance:performance.now()});return result;}`);
  const compiled={};
  for(const[arm]of arms){const pageFile=path.join(copyDir,`${arm}.tsx`),entry=`import React from'react';import{createRoot}from'react-dom/client';import{MemoryRouter}from'react-router-dom';import{HelmetProvider}from'react-helmet-async';import{AuthProvider,useAuth}from'@/contexts/AuthContext';import Page from${JSON.stringify(pageFile)};function Ready(){const{loading}=useAuth();return <div data-season-ready={!loading}>{!loading&&<Page/>}</div>;}createRoot(document.getElementById('root')).render(<HelmetProvider><MemoryRouter initialEntries={['/stadium-tycoon']}><AuthProvider><Ready/></AuthProvider></MemoryRouter></HelmetProvider>);`;
    fs.writeFileSync(path.join(OUT,`${arm}-entry.tsx`),entry);
    const result=await build({absWorkingDir:ROOT,stdin:{contents:entry,resolveDir:ROOT,loader:'tsx'},outfile:path.join(OUT,`${arm}.js`),bundle:true,write:false,platform:'browser',format:'esm',jsx:'automatic',metafile:true,define:{'process.env.NODE_ENV':'"production"'},logLevel:'silent',plugins:[{name:'delegating-page-observers',setup(b){b.onResolve({filter:/^@\/hooks\/useStadiumTycoon$/},()=>({path:observer}));b.onResolve({filter:/^@\/lib\/stadiumTycoon$/},()=>({path:engineObserver}));b.onResolve({filter:/^@\//},args=>b.resolve(path.join(ROOT,'src',args.path.slice(2)),{resolveDir:ROOT,kind:args.kind}));}}]});
    const inputs=bundleReceipt(result,arm),abs=Object.keys(inputs).map(file=>path.resolve(ROOT,file));
    for(const required of[pageFile,observer,engineObserver,path.join(ROOT,HOOK),path.join(ROOT,'src/lib/stadiumTycoon.ts')])assert(abs.includes(required));
    assert(!abs.includes(path.join(ROOT,PAGE)));for(const[other]of arms)if(other!==arm)assert(!abs.includes(path.join(copyDir,`${other}.tsx`)));
    compiled[arm]=new Map(result.outputFiles.map(file=>[`/${path.basename(file.path)}`,{body:Buffer.from(file.contents),type:file.path.endsWith('.css')?'text/css':'text/javascript'}]));
  }
  const service=new URL(/const SUPABASE_URL\s*=\s*["']([^"']+)/.exec(read(path.join(ROOT,'src/integrations/supabase/client.ts')))[1]).origin;
  const css=fs.readdirSync(path.join(ROOT,'dist/assets')).filter(file=>file.endsWith('.css')).sort();assert(css.length);
  const assets=new Map(JSON.parse(fs.readFileSync(path.join(CACHE,'manifest.json'),'utf8')).map(asset=>{const body=fs.readFileSync(path.join(CACHE,asset.file));assert.equal(sha(body),asset.sha256);assert.equal(body.length,asset.bytes);return[asset.url,{...asset,body}];}));
  server=createServer((_req,res)=>{res.writeHead(500);res.end('Undeclared request');});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}`;
  const {chromium}=await import('../lib/playwrightLoader.mjs');browser=await chromium.launch({headless:true});
  const clockSource='export async function advance(page) { await page.clock.runFor(128); }\n',clockFrom='await page.clock.runFor(128);',clockTo='await page.clock.runFor(129);';
  const clockCopy=once(clockSource,clockFrom,clockTo),clockFile=path.join(OUT,'clock-host.mjs'),clockFaultFile=path.join(OUT,'clock-host-plus-one.mjs');
  fs.writeFileSync(clockFile,clockSource);fs.writeFileSync(clockFaultFile,clockCopy);
  report.clockOperation={normal:{file:path.basename(clockFile),sha256:fileSha(clockFile)},copy:{file:path.basename(clockFaultFile),sha256:fileSha(clockFaultFile)},from:clockFrom,to:clockTo};
  const clockHost=await import(pathToFileURL(clockFile).href),clockFault=await import(pathToFileURL(clockFaultFile).href);
  const mounts=[];
  const dataFile=row=>`${row.id}-records.json`;
  function keep(row){save(dataFile(row),row);save('mounts.json',mounts.map(r=>({id:r.id,arm:r.arm,width:r.width,stage:r.stage,clockControl:r.clockControl,complete:r.complete,file:dataFile(r)})));}
  function checked(row,assertion,actual,expected){
    const record={assertion,actual:clone(actual),expected:clone(expected),passed:false};row.checks.push(record);keep(row);
    try{assert.deepEqual(actual,expected,assertion);record.passed=true;}
    catch(error){record.error={name:error.name,message:error.message,stack:error.stack};keep(row);assert(error instanceof assert.AssertionError);if(row.expectedAssertion!==assertion)throw error;row.failures.push(record.error);}
  }
  const counts=new Intl.NumberFormat('en-US',{maximumFractionDigits:0});
  function expectedReview(last,league){const own=last.table[0];return{headline:last.label,position:`${T.ordinal(last.position)} of ${counts.format(last.table.length)}`,points:counts.format(own.pts),record:`${counts.format(own.w)} / ${counts.format(own.d)} / ${counts.format(own.l)}`,goals:`${counts.format(own.gf)} / ${counts.format(own.ga)}`,rows:T.leagueStandings({...league,clubs:last.table}).map((club,index)=>({name:club.name,rank:String(index+1),record:`${counts.format(club.w)} / ${counts.format(club.d)} / ${counts.format(club.l)}`,goals:`GF ${counts.format(club.gf)}GA ${counts.format(club.ga)}`,points:counts.format(club.pts)}))};}
  async function mount(arm,width,stage,clockControl=false){
    const fault=faults.find(f=>f.name===arm),isOld=arm==='old',long=stage==='natural'&&(!fault||fault.long),id=`${clockControl?'clock-control-':''}${arm}-${width}-${stage}`;
    const fixture=clone(fixtures[stage]),row={id,arm,width,stage,long,clockControl,complete:false,expectedAssertion:fault?.assertion||null,checks:[],failures:[],states:[],surfaces:[],reviews:[],inputs:[],requests:[],errors:[],sockets:[],screenshots:[]};mounts.push(row);keep(row);report.phase=id;persist();
    const context=await browser.newContext({viewport:{width,height:width<700?844:900},isMobile:width<700,hasTouch:width<700,deviceScaleFactor:1,reducedMotion:'reduce',colorScheme:'dark',serviceWorkers:'block'});
    const resources=new Map(compiled[arm]);for(const file of css)resources.set(`/assets/${file}`,{body:fs.readFileSync(path.join(ROOT,'dist/assets',file)),type:'text/css'});
    const emittedCss=[...resources.keys()].filter(url=>url.endsWith('.css'));
    resources.set('/',{body:Buffer.from(`<!doctype html><html class="dark"><head><script>window.__season.clockBoot={now:Date.now(),performance:performance.now()};</script><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:,">${fontLinks.map(url=>`<link rel="stylesheet" href="${url}">`).join('')}${emittedCss.map(url=>`<link rel="stylesheet" href="${url}">`).join('')}</head><body><div id="root"></div><script type="module" src="/${arm}.js"></script></body></html>`),type:'text/html'});
    save(`${id}-resources.json`,Object.fromEntries([...resources].map(([url,payload])=>[url,{bytes:payload.body.length,sha256:sha(payload.body),type:payload.type}])));
    const pending=new Set(),drain=async()=>{while(pending.size)await Promise.all([...pending]);};
    await context.routeWebSocket('**/*',socket=>{row.sockets.push(socket.url());return socket.close();});
    await context.route('**/*',route=>{const task=(async()=>{const req=route.request(),url=new URL(req.url()),record={url:url.href,method:req.method()};row.requests.push(record);let payload,status=200;const cached=assets.get(url.href);
      if(url.origin===base&&req.method()==='GET'&&!url.search)payload=resources.get(url.pathname);
      else if(cached&&req.method()==='GET')payload={body:cached.body,type:cached.contentType};
      else if(url.origin===service&&url.pathname==='/rest/v1/game_completions'&&!url.search&&req.method()==='POST'){record.body=req.postDataJSON();assert.deepEqual(record.body,{game:'stadium-tycoon',player_name:'SeasonProof-95'});assert.equal(row.requests.filter(r=>r.method==='POST').length,1);status=503;payload={body:Buffer.from('{"message":"CI write rejected locally"}'),type:'application/json'};record.locallyRejected=true;}
      assert(payload,`Undeclared transport ${req.method()} ${url.href}`);record.status=status;record.bytes=payload.body.length;record.sha256=sha(payload.body);await route.fulfill({status,contentType:payload.type,body:payload.body});record.fulfilled=true;
    })().catch(async error=>{row.errors.push({name:error.name,message:error.message,stack:error.stack});try{await route.abort();}catch{}}).finally(()=>pending.delete(task));pending.add(task);return task;});
    await context.addInitScript(({raw,saveKey,rewardKey,reward,academyKey,academy})=>{
      localStorage.setItem(saveKey,raw);localStorage.setItem(rewardKey,reward);localStorage.setItem(academyKey,academy);localStorage.setItem('dukb-guest-handle','SeasonProof-95');localStorage.setItem('season-held-local','opaque bytes');sessionStorage.setItem('season-held-session','opaque bytes');
      let seed=1095;const draws=[];Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;const value=seed/4294967296;draws.push(value);return value;};
      const q=window.__season={calls:[],writes:[],events:[],ticks:[],readRandom:()=>({seed,draws:[...draws]})};
      for(const method of ['setItem','removeItem','clear']){const original=Storage.prototype[method];Storage.prototype[method]=function(...args){const result=original.apply(this,args);q.writes.push({scope:this===localStorage?'local':'session',method,args});return result;};}
      for(const type of ['pointerdown','pointerup','click','keydown','keyup'])addEventListener(type,event=>q.events.push({type,trusted:event.isTrusted,key:event.key||null,pointerType:event.pointerType||null}),true);
    },{raw:T.serializeTycoon(fixture,NOW),saveKey:T.TYCOON_SAVE_KEY,rewardKey:R.REWARDS_KEY,reward:seedSaves.reward,academyKey:W.SAVE_KEY,academy:seedSaves.academy});
    const page=await context.newPage();page.setDefaultTimeout(12000);page.on('pageerror',error=>row.errors.push({name:error.name,message:error.message,stack:error.stack}));
    async function snapshot(label){await drain();const value=await page.evaluate(()=>{const q=window.__season,store=s=>Object.fromEntries(Object.keys(s).sort().map(k=>[k,s.getItem(k)]));return{hook:q.hook,local:store(localStorage),session:store(sessionStorage),writes:q.writes,calls:q.calls,rng:q.readRandom(),now:Date.now(),performance:performance.now()};});row.states.push({label,value});keep(row);return value;}
    async function press(locator,label){await locator.scrollIntoViewIfNeeded();const box=await locator.boundingBox();assert(box);const index=await page.evaluate(()=>window.__season.events.length);if(width<700)await locator.tap();else await locator.click();await page.clock.runFor(0);const events=await page.evaluate(i=>window.__season.events.slice(i),index);assert(events.some(e=>e.type==='click'&&e.trusted));row.inputs.push({label,box,events});keep(row);}
    async function review(label){const value=await page.locator('[data-latest-season-review]').evaluate(pane=>{const text=selector=>pane.querySelector(selector).textContent.trim();return{headline:text('[data-season-headline]'),position:text('[data-season-position]'),points:text('[data-season-points]'),record:text('[data-season-record]'),goals:text('[data-season-goals]'),rows:[...pane.querySelectorAll('[data-season-club]')].map(tr=>({name:tr.getAttribute('data-season-club'),rank:tr.querySelector('th span').textContent.trim(),record:tr.querySelector('td div').textContent.trim(),goals:tr.querySelectorAll('td div')[1].textContent.trim(),points:tr.querySelector('td:last-child').textContent.trim()}))};});row.reviews.push({label,value});keep(row);return value;}
    async function surface(locator,label,scroll=true){if(scroll)await locator.scrollIntoViewIfNeeded();const value=await locator.evaluate((node,physical)=>{const box=el=>{const r=el.getBoundingClientRect();return{x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};const clips=el=>{const out=[];for(;el;el=el.parentElement){const s=getComputedStyle(el);if(/hidden|clip|auto|scroll/.test(s.overflowX+' '+s.overflowY)){const r=el.getBoundingClientRect();out.push({x:r.x+el.clientLeft,y:r.y+el.clientTop,right:r.x+el.clientLeft+el.clientWidth,bottom:r.y+el.clientTop+el.clientHeight,xClip:/hidden|clip|auto|scroll/.test(s.overflowX),yClip:/hidden|clip|auto|scroll/.test(s.overflowY)});}}return out;};const walker=document.createTreeWalker(node,NodeFilter.SHOW_TEXT),fragments=[];while(walker.nextNode()){const text=walker.currentNode;if(!text.textContent.trim()||text.parentElement.closest('.sr-only'))continue;const range=document.createRange();range.selectNodeContents(text);for(const r of range.getClientRects()){if(!r.width||!r.height)continue;const hit=document.elementFromPoint((r.left+r.right)/2,(r.top+r.bottom)/2);fragments.push({text:text.textContent,box:{x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height},font:parseFloat(getComputedStyle(text.parentElement).fontSize),clips:clips(text.parentElement),hit:!!hit&&(text.parentElement.contains(hit)||hit.contains(text.parentElement))});}}const r=box(node),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return{box:r,clips:clips(node.parentElement),fragments,hit:!!hit&&(node.contains(hit)||hit.contains(node)),html:node.outerHTML,scroll:{x:scrollX,y:scrollY},viewport:{width:physical.width,height:physical.height,layoutWidth:innerWidth,layoutHeight:innerHeight,scrollWidth:document.documentElement.scrollWidth},active:document.activeElement?.outerHTML||null};},page.viewportSize());row.surfaces.push({label,value});keep(row);return value;}
    function visible(value,assertion='Review text is visible'){const {viewport}=value;assert(value.box.width>0&&value.box.height>0,assertion);assert(viewport.scrollWidth<=viewport.width+1,assertion);const inside=(b,c,x=true,y=true)=>{if(x)assert(b.x>=c.x-1&&b.right<=c.right+1,assertion);if(y)assert(b.y>=c.y-1&&b.bottom<=c.bottom+1,assertion);};const screen={x:0,y:0,right:viewport.width,bottom:viewport.height};inside(value.box,screen);for(const c of value.clips)inside(value.box,c,c.xClip,c.yClip);for(const f of value.fragments){assert(f.font>=12&&f.hit,assertion);inside(f.box,screen);for(const c of f.clips)inside(f.box,c,c.xClip,c.yClip);}}
    async function screenshot(label){const file=`${id}-${label}.png`,bytes=await page.screenshot({path:path.join(OUT,file)});row.screenshots.push({file,sha256:sha(bytes),bytes:bytes.length});keep(row);}
    async function layout(label){const pane=page.locator('[data-latest-season-review]');for(const selector of ['[data-season-headline]','[data-season-position]','[data-season-points]','[data-season-record]','[data-season-goals]'])visible(await surface(pane.locator(selector),`${label}-${selector}`));const cells=pane.locator('[data-latest-season-table] th,[data-latest-season-table] td');for(let index=0;index<await cells.count();index++)visible(await surface(cells.nth(index),`${label}-cell-${index}`));const back=await surface(pane.getByRole('button',{name:'Back',exact:true}),`${label}-back`);visible(back);checked(row,'Back is a visible 44px target',{wide:back.box.width>=44,tall:back.box.height>=44,hit:back.hit},{wide:true,tall:true,hit:true});const close=await surface(pane.getByRole('button',{name:'Close',exact:true}),`${label}-close`);visible(close);assert(close.box.width>=44&&close.box.height>=44&&close.hit);await surface(pane.locator('[data-season-headline]'),`${label}-top`);await screenshot(label);}
    async function open(label){const trigger=page.getByRole('button',{name:/Latest season/});const triggerSurface=await surface(trigger,`${label}-trigger`);visible(triggerSurface);assert(triggerSurface.box.height>=44&&triggerSurface.box.width>=44);row.openScroll=triggerSurface.scroll;const before=await snapshot(`${label}-before`);await press(trigger,label);await page.getByRole('dialog',{name:'Latest season',exact:true}).waitFor();await page.waitForFunction(()=>document.activeElement===document.querySelector('[data-latest-season-review] h2'));const after=await snapshot(label);checked(row,'Review opening has no gameplay side effect',after,before);return after;}
    async function close(kind,label){const active=!isOld&&(kind==='Back'||!fault||fault.long);if(active){const pane=page.locator('[data-latest-season-review]');if(kind==='Escape'){const index=await page.evaluate(()=>window.__season.events.length);await page.keyboard.press('Escape');row.inputs.push({label,events:await page.evaluate(i=>window.__season.events.slice(i),index)});}else await press(pane.getByRole('button',{name:kind,exact:true}),label);}
      await page.clock.runFor(256);if(active)await page.locator('[data-latest-season-review]').waitFor({state:'detached'});await page.clock.runFor(0);
      if(active){const restored=await page.getByRole('button',{name:/Latest season/}).evaluate(node=>({focused:document.activeElement===node,scroll:{x:scrollX,y:scrollY}}));assert(restored.focused);assert(Math.abs(restored.scroll.x-row.openScroll.x)<=1&&Math.abs(restored.scroll.y-row.openScroll.y)<=1);row.surfaces.push({label:`${label}-restore`,value:restored});}
      return snapshot(label);
    }
    try{
      await page.clock.pauseAt(NOW);await page.goto(base+'/',{waitUntil:'load'});await page.locator('[data-season-ready="true"] [data-tycoon-pitch]').waitFor();
      row.clockBoot=await page.evaluate(()=>window.__season.clockBoot);assert.deepEqual(row.clockBoot,{now:NOW,performance:0});
      row.fonts=await page.evaluate(async()=>{const rows=[];for(const family of ['Space Grotesk','Inter'])for(const weight of [400,500,600,700]){await document.fonts.load(`${weight} 16px "${family}"`);rows.push({family,weight,loaded:document.fonts.check(`${weight} 16px "${family}"`)});}await document.fonts.ready;return{rows,faces:[...document.fonts].map(face=>({family:face.family,weight:face.weight,status:face.status}))};});
      assert(row.fonts.rows.every(font=>font.loaded&&row.fonts.faces.some(face=>face.family.replace(/["']/g,'')===font.family&&Number(face.weight)===font.weight&&face.status==='loaded')));
      row.beforeClockAdvance=await snapshot('before-clock-advance');assert.equal(row.beforeClockAdvance.now,NOW);assert.equal(row.beforeClockAdvance.performance,0);
      await(clockControl?clockFault:clockHost).advance(page);row.initial=await snapshot('initial');assert.equal(row.initial.now,NOW+128,'Declared 128ms clock advance');assert.equal(row.initial.performance,128,'Declared 128ms clock advance');assert.deepEqual(row.initial.hook.state,T.deserializeTycoon(T.serializeTycoon(fixture,NOW),NOW));assert.equal(row.initial.hook.lastSeason,null);
      await press(page.locator('[data-room="league"]'),'league-room');row.inLeague=await snapshot('in-league');assert.equal(await page.locator('[data-latest-season-review]').count(),0);
      await page.clock.runFor(256);row.firstFinish=await snapshot('first-finish');assert(row.firstFinish.hook.lastSeason);assert.equal(row.firstFinish.hook.state.totalMatches,fixture.totalMatches+1);assert.equal(await page.locator('[data-latest-season-review]').count(),0,'Review opens only by choice');
      const expected=expectedReview(row.firstFinish.hook.lastSeason,row.firstFinish.hook.state.league);row.expectedFirst=expected;
      if(!isOld){row.opened=await open('first-open');row.firstReview=await review('first-open');
        checked(row,'Actual season headline',row.firstReview.headline,expected.headline);checked(row,'Actual finishing position',row.firstReview.position,expected.position);
        if(stage==='natural')checked(row,'Actual complete final table',{points:row.firstReview.points,record:row.firstReview.record,goals:row.firstReview.goals,rows:row.firstReview.rows},{points:expected.points,record:expected.record,goals:expected.goals,rows:expected.rows});
        else{assert(expected.goals.includes('1,'));checked(row,'Actual goal counts keep comma grouping',row.firstReview,expected);}
        await layout('first-review');
        if(arm==='current'&&stage==='stress'){
          const control={name:`table-clipping-${width}`,assertion:'Actual table text clipping is rejected',complete:false};report.domControls.push(control);
          const target=page.locator('[data-latest-season-table] tbody th').first();await target.scrollIntoViewIfNeeded();
          control.before={surface:await surface(target,'clip-before',false),snapshot:await snapshot('clip-before'),html:await page.locator('[data-latest-season-review]').evaluate(node=>node.outerHTML)};
          await target.evaluate(node=>{const container=node.closest('table').parentElement;window.__season.clipRestore={container,style:container.getAttribute('style'),top:container.scrollTop,left:container.scrollLeft};container.style.height='1px';container.style.maxHeight='1px';container.style.overflow='hidden';});
          try{control.actual=await surface(target,'clip-actual',false);await screenshot('clipping-fault');let error;try{visible(control.actual,control.assertion);}catch(caught){error=caught;control.error={name: caught.name,message:caught.message,stack:caught.stack};}assert(error instanceof assert.AssertionError);assert(error.message.includes(control.assertion));}
          finally{await page.evaluate(()=>{const r=window.__season.clipRestore;if(r.style===null)r.container.removeAttribute('style');else r.container.setAttribute('style',r.style);r.container.scrollTop=r.top;r.container.scrollLeft=r.left;delete window.__season.clipRestore;});}
          control.after={surface:await surface(target,'clip-restored',false),snapshot:await snapshot('clip-restored'),html:await page.locator('[data-latest-season-review]').evaluate(node=>node.outerHTML)};
          assert.deepEqual(control.after,control.before);visible(control.after.surface);control.complete=true;persist();
        }
      }else row.opened=await snapshot('first-open');
      if(long){
        const shape=T.leagueShape(row.firstFinish.hook.state.league.division);row.nextShape=shape;row.nextAdvanceMs=shape.matchdays*90*1400+1000;
        assert.equal(shape.matchdays,5,'Natural fixture remains in an actual five-match league');
        await page.clock.runFor(row.nextAdvanceMs);row.continued=await snapshot('continued');
        assert(row.continued.hook.state.totalMatches>=row.firstFinish.hook.state.totalMatches+shape.matchdays);assert.notDeepEqual(row.continued.hook.lastSeason,row.firstFinish.hook.lastSeason,'Two actual completed season records must differ');
        if(!isOld){row.continuedReview=await review('continued-open');checked(row,'Opened season remains immutable',row.continuedReview,row.firstReview);await screenshot('continued-open');}
      }
      row.afterBack=await close('Back','back');
      if(!isOld&&(!fault||fault.long)){await open('reopen');row.reopened=await review('reopen');row.expectedLatest=expectedReview(row.afterBack.hook.lastSeason,row.afterBack.hook.state.league);checked(row,'Reopen reads the latest completed season',row.reopened,row.expectedLatest);await screenshot('latest-review');}
      row.afterEscape=await close('Escape','escape');
      if(!isOld&&(!fault||fault.long)){await open('close-open');await review('close-open');}
      row.afterClose=await close('Close','close');
      row.beforeFlush=await snapshot('before-flush');await page.evaluate(()=>dispatchEvent(new Event('pagehide')));row.flushed=await snapshot('flushed');assert.equal(row.flushed.local[T.TYCOON_SAVE_KEY],T.serializeTycoon(row.beforeFlush.hook.state,row.flushed.now));
      assert.deepEqual(row.flushed.session,row.initial.session);for(const key of[W.SAVE_KEY,'season-held-local'])assert.equal(row.flushed.local[key],row.initial.local[key]);
      row.ticks=await page.evaluate(()=>window.__season.ticks);row.rawInputEvents=await page.evaluate(()=>window.__season.events);keep(row);
      const allEvents=row.ticks.flatMap(t=>t.events),seasonEvents=allEvents.filter(e=>e.kind==='title'||e.kind==='seasonEnd');row.actualSeasonEvents=seasonEvents;assert.equal(seasonEvents.length,long?2:1);
      assert.deepEqual(row.firstFinish.hook.lastSeason,{label:seasonEvents[0].label??'Season over',position:seasonEvents[0].position,table:seasonEvents[0].table});
      if(long)assert.deepEqual(row.continued.hook.lastSeason,{label:seasonEvents[1].label??'Season over',position:seasonEvents[1].position,table:seasonEvents[1].table});
      const ambient=Math.random;Math.random=()=>{throw new Error('Pure observed-tick replay consumed ambient RNG');};
      try{for(const [index,t]of row.ticks.entries()){let draw=t.drawStart;const result=T.tick(clone(t.before),t.dt,()=>{assert(draw<t.drawEnd);return row.flushed.rng.draws[draw++];},t.edge);assert.equal(draw,t.drawEnd);assert.deepEqual(clone(result),{state:t.after,events:t.events},`Actual observed tick ${index}`);}}finally{Math.random=ambient;}
      await drain();assert.deepEqual(row.errors,[]);assert.deepEqual(row.sockets,[]);row.complete=true;keep(row);return row;
    }finally{
      try{if(!page.isClosed()){const raw=await page.evaluate(()=>{const q=window.__season;if(!q)return null;const store=s=>Object.fromEntries(Object.keys(s).sort().map(k=>[k,s.getItem(k)]));return{ticks:q.ticks,events:q.events,terminal:{hook:q.hook,local:store(localStorage),session:store(sessionStorage),writes:q.writes,calls:q.calls,rng:q.readRandom(),now:Date.now(),performance:performance.now()}};});row.terminalObservation=raw?.terminal??null;if(raw){row.ticks=raw.ticks;row.rawInputEvents=raw.events;}if(row.complete)assert(row.terminalObservation);}}catch(error){row.errors.push({phase:'retain-before-close',name:error.name,message:error.message,stack:error.stack});}
      await drain();await context.close();await drain();if(row.errors.length||row.sockets.length)row.complete=false;keep(row);assert.deepEqual(row.errors,[]);assert.deepEqual(row.sockets,[]);
    }
  }
  function paired(actual,old){
    for(const key of['beforeClockAdvance','initial','inLeague','firstFinish','opened','continued','afterBack','afterEscape','afterClose','beforeFlush','flushed'])assert.deepEqual(actual[key],old[key],`Full parent parity: ${actual.id} ${key}`);
    assert.deepEqual(actual.ticks,old.ticks);assert.deepEqual(actual.actualSeasonEvents,old.actualSeasonEvents);
  }
  for(const width of[320,1280])for(const stage of['natural','stress']){
    const row={width,stage,complete:false};report.cases.push(row);persist();const actual=await mount('current',width,stage),old=await mount('old',width,stage);row.actual=actual.id;row.baseline=old.id;paired(actual,old);assert.deepEqual(actual.failures,[]);row.events=actual.actualSeasonEvents.map(e=>({kind:e.kind,label:e.label,position:e.position}));row.complete=true;persist();
  }
  for(const fault of faults){
    const row={name:fault.name,assertion:fault.assertion,complete:false};report.controls.push(row);persist();const actual=await mount(fault.name,320,fault.stage),baseline=mounts.find(r=>r.id===`old-320-${fault.stage}`),healthy=mounts.find(r=>r.id===`current-320-${fault.stage}`);row.actual=actual.id;row.baseline=baseline.id;row.healthy=healthy.id;
    for(const key of['beforeClockAdvance','initial','inLeague','firstFinish'])assert.deepEqual(actual[key],baseline[key]);
    if(fault.name!=='side-effect')assert.deepEqual(actual.opened,baseline.opened);else assert.notDeepEqual(actual.opened,baseline.opened);
    if(fault.long)paired(actual,baseline);
    assert.equal(actual.failures.length,1);assert.equal(actual.checks.filter(c=>!c.passed).length,1);const mismatch=actual.checks.find(c=>!c.passed);assert.equal(mismatch.assertion,fault.assertion);assert.notDeepEqual(mismatch.actual,mismatch.expected);row.failure=actual.failures[0];row.mismatch={actual:mismatch.actual,expected:mismatch.expected};assert.equal(row.failure.name,'AssertionError');assert(row.failure.message.includes(fault.assertion));assert(healthy.complete&&baseline.complete);row.complete=true;persist();
  }
  const clockCheck={name:'extra-clock-millisecond',assertion:'Declared 128ms clock advance',complete:false,baseline:'current-320-natural'};report.clockControl=clockCheck;let clockError;
  try{await mount('current',320,'natural',true);}catch(error){clockError=error;clockCheck.error={name:error.name,message:error.message,stack:error.stack};}
  assert(clockError instanceof assert.AssertionError);assert(clockError.message.includes(clockCheck.assertion));const clockMount=mounts.at(-1),clockBaseline=mounts.find(row=>row.id===clockCheck.baseline);assert.equal(clockMount.id,'clock-control-current-320-natural');clockCheck.actual=clockMount.id;assert.deepEqual(clockMount.clockBoot,clockBaseline.clockBoot);assert.deepEqual(clockMount.beforeClockAdvance,clockBaseline.beforeClockAdvance);
  const clockActual=clockMount.states.find(r=>r.label==='initial').value;assert.equal(clockActual.now,NOW+129);assert.equal(clockActual.performance,129);const{now:actualNow,performance:actualPerformance,...actualRest}=clockActual,{now:baselineNow,performance:baselinePerformance,...baselineRest}=clockBaseline.initial;assert.deepEqual(actualRest,baselineRest);clockCheck.clocks={actual:{now:actualNow,performance:actualPerformance},baseline:{now:baselineNow,performance:baselinePerformance}};assert.equal(clockMount.complete,false);assert.deepEqual(clockMount.inputs,[]);assert.deepEqual(clockMount.screenshots,[]);clockCheck.complete=true;
  const regular=mounts.filter(r=>!r.clockControl);assert.equal(regular.length,16);assert(regular.every(r=>r.complete));assert.equal(mounts.length,17);assert.equal(report.domControls.length,2);assert(report.domControls.every(r=>r.complete));assert(mounts.every(r=>r.errors.length===0&&r.sockets.length===0));
  report.mounts={count:mounts.length,regularCount:regular.length,setupCount:1,records:mounts.map(r=>({id:r.id,file:dataFile(r),sha256:fileSha(path.join(OUT,dataFile(r)))})),screenshots:mounts.reduce((sum,r)=>sum+r.screenshots.length,0)};
  report.complete=true;
}catch(error){report.complete=false;report.errors.push({name:error.name,message:error.message,stack:error.stack});throw error;}
finally{
  let closingError;try{await browser?.close();if(server)await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()));}catch(error){closingError=error;report.complete=false;report.errors.push({name:error.name,message:error.message});}
  try{report.sourceAfter=sources();report.buildAfter=hashes(['dist']);report.cacheAfter=hashes(['tycoon-season-review-artifacts/asset-cache']);assert.deepEqual(report.sourceAfter,report.sourceBefore);assert.deepEqual(report.buildAfter,report.buildBefore);assert.deepEqual(report.cacheAfter,report.cacheBefore);}catch(error){closingError=error;report.complete=false;report.errors.push({name:error.name,message:error.message});}persist();if(closingError)throw closingError;
}
console.log('Season review native: four finite paired journeys, eight copied controls and two restored clipping controls passed.');
