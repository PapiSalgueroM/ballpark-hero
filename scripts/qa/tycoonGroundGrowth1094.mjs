/* Finite actual page mounts, not the app shell, a full match or a campaign. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { inflateSync } from 'node:zlib';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
assert(process.env.CI, 'Run this verification only in remote CI');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ART = path.join(ROOT, 'tycoon-ground-growth-artifacts'), OUT = path.join(ART, 'native'), CACHE = path.join(ART, 'asset-cache');
const PAGE = 'src/pages/StadiumTycoon.tsx', HOOK = 'src/hooks/useStadiumTycoon.ts', BASE = '0a02f879', NOW = Date.parse('2026-10-07T12:00:00Z');
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
const report = { complete: false, phase: 'prepare', cases: [], controls: [], errors: [],
  scope: 'Actual StadiumTycoon page and hook in a finite provider host; four reduced-motion widths, paired unchanged parent pages.',
  limits: ['Stands levels 17 and 200, attendance-only 110 fans and unrelated-upgrade cash are explicit staged fixtures, not earned campaigns.',
    'The actual first Stands purchase starts from the source-created 40 dollars and 90 fans. No match tick is advanced.',
    'Selected ground geometry and viewport PNGs are measured after declared navigation. No app-shell, whole-route, animation or physical-device acceptance.'],
  sourceBefore: sources(), buildBefore: hashes(['dist']), cacheBefore: hashes(['tycoon-ground-growth-artifacts/asset-cache']) };
const persist = () => save('report.json', report);
function once(text, from, to) { assert.equal(text.split(from).length - 1, 1); const changed = text.replace(from, to); assert.notEqual(changed, text); assert.equal(changed.split(to).length - 1, 1); assert.equal(changed.replace(to, from), text); return changed; }
function bundleReceipt(result, name) {
  const outputs = {};
  for (const file of result.outputFiles) { fs.writeFileSync(file.path, file.contents); outputs[path.basename(file.path)] = { bytes: file.contents.length, sha256: sha(file.contents) }; }
  const inputs = Object.fromEntries(Object.keys(result.metafile.inputs).filter(file => file !== '<stdin>').map(file => [file, fileSha(path.resolve(ROOT, file))]));
  save(`${name}-binding.json`, { inputs, outputs }); save(`${name}-metafile.json`, result.metafile); return inputs;
}
// Decode actual browser PNG scanlines, keeping pixel differences independent of DOM attributes.
function png(bytes) {
  assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a'); let width, height, channels; const chunks = [];
  for (let at = 8; at < bytes.length;) { const length = bytes.readUInt32BE(at), type = bytes.toString('ascii', at + 4, at + 8), data = bytes.subarray(at + 8, at + 8 + length); at += length + 12;
    if (type === 'IHDR') { width = data.readUInt32BE(0); height = data.readUInt32BE(4); assert.equal(data[8], 8); assert([2, 6].includes(data[9])); channels = data[9] === 6 ? 4 : 3; assert.equal(data[12], 0); }
    if (type === 'IDAT') chunks.push(data);
  }
  const raw = inflateSync(Buffer.concat(chunks)), stride = width * channels, pixels = Buffer.alloc(stride * height); assert.equal(raw.length, (stride + 1) * height);
  for (let y = 0; y < height; y++) { const mode = raw[y * (stride + 1)]; assert(mode <= 4);
    for (let x = 0; x < stride; x++) { const a = x >= channels ? pixels[y * stride + x - channels] : 0, b = y ? pixels[(y - 1) * stride + x] : 0, c = y && x >= channels ? pixels[(y - 1) * stride + x - channels] : 0;
      const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c), predictor = mode === 0 ? 0 : mode === 1 ? a : mode === 2 ? b : mode === 3 ? Math.floor((a + b) / 2) : pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      pixels[y * stride + x] = (raw[y * (stride + 1) + 1 + x] + predictor) & 255;
    }
  }
  return { width, height, channels, pixels };
}
function pixelDifference(x, y) { const sameSize=x.width===y.width&&x.height===y.height&&x.channels===y.channels; if(!sameSize)return{before:[x.width,x.height,x.channels],after:[y.width,y.height,y.channels],sameSize:false,changedPixels:null}; let changed = 0; for (let i=0;i<x.pixels.length;i+=x.channels) { if (!x.pixels.subarray(i,i+x.channels).equals(y.pixels.subarray(i,i+y.channels))) changed++; } return { width:x.width,height:x.height,sameSize:true,changedPixels:changed }; }
let browser, server;
try {
  const copyDir = path.join(OUT, 'copies'); fs.mkdirSync(copyDir, { recursive: true });
  const parent = execFileSync('git', ['rev-parse', BASE], { cwd: ROOT, encoding: 'utf8' }).trim(); report.parent = parent;
  assert.deepEqual(execFileSync('git',['diff','--name-only',parent,'--','src'],{cwd:ROOT,encoding:'utf8'}).trim().split('\n'),[PAGE],'Only the declared page changes from the parent');
  const old = execFileSync('git', ['show', `${parent}:${PAGE}`], { cwd: ROOT, encoding: 'utf8' }).replace(/\r\n?/g, '\n'), current = read(path.join(ROOT, PAGE));
  const memo = `  const standBays = useMemo(() => Array.from({ length: Math.min(203, Math.floor(cap / 40)) }, (_, i) => {\n    const column = i % 20;\n    const centered = column % 2 === 0 ? 9 - Math.floor(column / 2) : 10 + Math.floor(column / 2);\n    return { x: 8 + centered * 15, y: 56 - Math.floor(i / 20) * 5 };\n  }), [cap]);\n\n`;
  const svg = `            <svg data-tycoon-terraces aria-hidden="true" viewBox="0 0 320 64" preserveAspectRatio="none" className="absolute inset-0 h-full w-full pointer-events-none text-muted-foreground/50">\n              {standBays.map((bay, i) => (\n                <rect key={i} x={bay.x} y={bay.y} width="13" height="3" rx="1" fill="currentColor" />\n              ))}\n            </svg>\n`;
  assert.equal(current.split(memo).length - 1, 1); assert.equal(current.split(svg).length - 1, 1); assert.equal(current.replace(memo, '').replace(svg, ''), old);
  const faults = [
    { name: 'frozen', assertion: 'Visible capacity growth', stage:'first', from:'Math.min(203, Math.floor(cap / 40))', to:'Math.min(203, Math.floor(120 / 40))' },
    { name: 'attendance', assertion: 'Capacity creates structure', stage:'attendance', from:'Math.min(203, Math.floor(cap / 40))', to:'Math.min(203, Math.floor(fans / 40))' },
    { name: 'height', assertion: 'Fixed ground exterior', stage:'attendance', from:'className="relative h-16 md:h-20 bg-gradient-to-b from-secondary to-secondary/40 border-b border-border overflow-hidden"', to:'className="relative h-16 md:h-20 bg-gradient-to-b from-secondary to-secondary/40 border-b border-border overflow-hidden" style={{ height: cap }}' },
    { name: 'interception', assertion: 'Terrace tap delivery', stage:'first', from:svg.split('\n')[0], to:svg.split('\n')[0].replace('pointer-events-none','pointer-events-auto').replace('<svg ', '<svg onClick={event => event.stopPropagation()} ') },
  ];
  const arms = [['old', old], ['current', current], ...faults.map(fault => [fault.name, once(current, fault.from, fault.to)])];
  for (const [name, text] of arms) fs.writeFileSync(path.join(copyDir, `${name}.tsx`), text);
  save('source-relation.json', { parent, originalRaw:fileSha(path.join(ROOT,PAGE)), currentNormalized:sha(current), oldNormalized:sha(old), memo, svg, faults: faults.map(fault => ({...fault, copiedSha256:sha(arms.find(([name])=>name===fault.name)[1])})) });
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
  const initReceipt=file=>({complete:false,seed:1094,state:1094,draws:[],source:{path:epochFile,sha256:oracleInputs[epochFile],line:epochSource},emitted:{path:path.basename(file),sha256:fileSha(file),line:epochLine,expectedCode:epochEmitted,actualCode:read(file).split('\n')[epochLine-1],columns:epochColumns}});
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
    const fresh=T.newTycoon(NOW), boundary={...clone(fresh),levels:{...fresh.levels,stands:17},money:1e9}, max={...clone(fresh),levels:{...fresh.levels,stands:200},money:1e9};
    fixtures={first:fresh,boundary,max,attendance:{...clone(fresh),fanbase:110},unrelated:{...clone(fresh),money:100}};
    assert.equal(T.capacity(fresh),120); assert.equal(T.attendance(fresh),90); assert.equal(T.capacity(T.buy(fresh,'stands')),160); assert.equal(T.attendance(T.buy(fresh,'stands')),90);
    assert.equal(T.capacity(boundary),800); assert.equal(T.capacity(T.buy(boundary,'stands')),840); assert.equal(T.capacity(max),8120);
    const reward=R.newLedger(1094),academy=W.newFactory(NOW,1094);seedSaves={reward:JSON.stringify(reward),academy:W.serialize(academy)};
    save('fixtures.json',{now:NOW,fixtures,staging:report.limits[0],reward,academy,seedSaves});
  } finally {Math.random=realRandom;globalThis.Date=RealDate;}
  const observer=path.join(copyDir,'hook-observer.ts');
  fs.writeFileSync(observer,`import {useLayoutEffect} from 'react'; import {useStadiumTycoon as actual} from ${JSON.stringify(path.join(ROOT,HOOK))};
const copy=value=>JSON.parse(JSON.stringify(value)); export function useStadiumTycoon(edge){const g=actual(edge);useLayoutEffect(()=>{window.__ground.hook=copy(Object.fromEntries(Object.entries(g).filter(([,value])=>typeof value!=='function')));});return {...g,doBuy:(...args)=>{window.__ground.calls.push({action:'buy',args,now:Date.now(),performance:performance.now()});return g.doBuy(...args);},doTap:(...args)=>{window.__ground.calls.push({action:'tap',args,now:Date.now(),performance:performance.now()});return g.doTap(...args);}};}`);
  const compiled={};
  for(const [arm] of arms){const pageFile=path.join(copyDir,`${arm}.tsx`), entry=`import React from 'react';import{createRoot}from'react-dom/client';import{MemoryRouter}from'react-router-dom';import{HelmetProvider}from'react-helmet-async';import{AuthProvider,useAuth}from'@/contexts/AuthContext';import Page from ${JSON.stringify(pageFile)};function Ready(){const{loading}=useAuth();return <div data-ground-ready={!loading}>{!loading&&<Page/>}</div>;}createRoot(document.getElementById('root')).render(<HelmetProvider><MemoryRouter initialEntries={['/stadium-tycoon']}><AuthProvider><Ready/></AuthProvider></MemoryRouter></HelmetProvider>);`;
    fs.writeFileSync(path.join(OUT,`${arm}-entry.tsx`),entry);
    const result=await build({absWorkingDir:ROOT,stdin:{contents:entry,resolveDir:ROOT,loader:'tsx'},outfile:path.join(OUT,`${arm}.js`),bundle:true,write:false,platform:'browser',format:'esm',jsx:'automatic',metafile:true,define:{'process.env.NODE_ENV':'"production"'},logLevel:'silent',plugins:[{name:'actual-page-hook-observer',setup(b){b.onResolve({filter:/^@\/hooks\/useStadiumTycoon$/},()=>({path:observer}));b.onResolve({filter:/^@\//},args=>b.resolve(path.join(ROOT,'src',args.path.slice(2)),{resolveDir:ROOT,kind:args.kind}));}}]});
    const inputs=bundleReceipt(result,arm),abs=Object.keys(inputs).map(file=>path.resolve(ROOT,file));assert(abs.includes(pageFile)&&abs.includes(observer)&&abs.includes(path.join(ROOT,HOOK)));assert(!abs.includes(path.join(ROOT,PAGE)));for(const [other]of arms)if(other!==arm)assert(!abs.includes(path.join(copyDir,`${other}.tsx`)));assert(inputs['src/lib/stadiumTycoon.ts']);
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
  const complete=[];
  async function mount(arm,width,stage,tapReference=null,clockControl=false){
    const id=`${clockControl?'clock-control-':''}${arm}-${width}-${stage}`,fixture=clone(fixtures[stage]);const row={id,arm,width,stage,clockControl,complete:false,states:[],surfaces:[],inputs:[],requests:[],errors:[],sockets:[],screenshots:[]};complete.push(row);save('mounts.json',complete);report.phase=id;persist();
    const context=await browser.newContext({viewport:{width,height:width<700?844:900},isMobile:width<700,hasTouch:width<700,deviceScaleFactor:1,reducedMotion:'reduce',colorScheme:'dark',serviceWorkers:'block'});
    const resources=new Map(compiled[arm]);for(const file of css)resources.set(`/assets/${file}`,{body:fs.readFileSync(path.join(ROOT,'dist/assets',file)),type:'text/css'});
    const emittedCss=[...resources.keys()].filter(url=>url.endsWith('.css'));
    resources.set('/',{body:Buffer.from(`<!doctype html><html class="dark"><head><script>window.__ground.clockBoot={now:Date.now(),performance:performance.now()};</script><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:,">${fontLinks.map(url=>`<link rel="stylesheet" href="${url}">`).join('')}${emittedCss.map(url=>`<link rel="stylesheet" href="${url}">`).join('')}</head><body><div id="root"></div><script type="module" src="/${arm}.js"></script></body></html>`),type:'text/html'});
    save(`${id}-resources.json`,Object.fromEntries([...resources].map(([url,payload])=>[url,{bytes:payload.body.length,sha256:sha(payload.body),type:payload.type}])));
    const pending=new Set();const drain=async()=>{while(pending.size)await Promise.all([...pending]);};
    await context.routeWebSocket('**/*',socket=>{row.sockets.push(socket.url());return socket.close();});
    await context.route('**/*',route=>{const task=(async()=>{const req=route.request(),url=new URL(req.url()),record={url:url.href,method:req.method()};row.requests.push(record);
      let payload,status=200;const cached=assets.get(url.href);
      if(url.origin===base&&req.method()==='GET'&&!url.search)payload=resources.get(url.pathname);
      else if(cached&&req.method()==='GET')payload={body:cached.body,type:cached.contentType};
      else if(url.origin===service&&url.pathname==='/rest/v1/game_completions'&&!url.search&&req.method()==='POST'){const body=req.postDataJSON();record.body=body;assert.deepEqual(body,{game:'stadium-tycoon',player_name:'GroundProof-94'});assert.equal(row.requests.filter(r=>r.method==='POST').length,1);status=503;payload={body:Buffer.from('{"message":"CI write rejected locally"}'),type:'application/json'};record.locallyRejected=true;}
      assert(payload,`Undeclared transport ${url.href} ${req.method()}`);record.status=status;record.bytes=payload.body.length;record.sha256=sha(payload.body);await route.fulfill({status,contentType:payload.type,body:payload.body});record.fulfilled=true;
    })().catch(async error=>{row.errors.push({name:error.name,message:error.message,stack:error.stack});try{await route.abort();}catch{}}).finally(()=>pending.delete(task));pending.add(task);return task;});
    await context.addInitScript(({raw,saveKey,rewardKey,reward,academyKey,academy})=>{
      localStorage.setItem(saveKey,raw);localStorage.setItem(rewardKey,reward);localStorage.setItem(academyKey,academy);localStorage.setItem('dukb-guest-handle','GroundProof-94');localStorage.setItem('ground-held-local','opaque bytes');sessionStorage.setItem('ground-held-session','opaque bytes');
      let seed=1094;const draws=[];Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;const value=seed/4294967296;draws.push(value);return value;};
      const q=window.__ground={calls:[],writes:[],events:[],readRandom:()=>({seed,draws:[...draws]})};
      for(const method of ['setItem','removeItem','clear']){const original=Storage.prototype[method];Storage.prototype[method]=function(...args){const result=original.apply(this,args);q.writes.push({scope:this===localStorage?'local':'session',method,args});return result;};}
      for(const type of ['pointerdown','pointerup','click','keydown','keyup'])addEventListener(type,event=>q.events.push({type,trusted:event.isTrusted,key:event.key||null,pointerType:event.pointerType||null}),true);
    },{raw:T.serializeTycoon(fixture,NOW),saveKey:T.TYCOON_SAVE_KEY,rewardKey:R.REWARDS_KEY,reward:seedSaves.reward,academyKey:W.SAVE_KEY,academy:seedSaves.academy});
    const page=await context.newPage();page.setDefaultTimeout(12000);page.on('pageerror',error=>row.errors.push({name:error.name,message:error.message,stack:error.stack}));
    async function snapshot(label){await drain();const value=await page.evaluate(()=>{const q=window.__ground,store=s=>Object.fromEntries(Object.keys(s).sort().map(k=>[k,s.getItem(k)]));return{hook:q.hook,local:store(localStorage),session:store(sessionStorage),writes:q.writes,calls:q.calls,rng:q.readRandom(),now:Date.now(),performance:performance.now()};});row.states.push({label,value});save('mounts.json',complete);return value;}
    async function geometry(label,show=true){if(show)await page.locator('[data-tycoon-pitch]').evaluate(node=>node.parentElement.scrollIntoView({block:'center'}));
      const value=await page.evaluate(()=>{const pitch=document.querySelector('[data-tycoon-pitch]'),wrap=pitch.parentElement,stand=wrap.firstElementChild,svg=stand.querySelector('svg[data-tycoon-terraces]');const box=node=>{const r=node.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom,docX:r.x+scrollX,docY:r.y+scrollY};};
        const clips=node=>{const out=[];for(let el=node;el;el=el.parentElement){const s=getComputedStyle(el);if(/hidden|clip|auto|scroll/.test(s.overflowX+' '+s.overflowY)){const r=el.getBoundingClientRect();out.push({x:r.x+el.clientLeft,y:r.y+el.clientTop,right:r.x+el.clientLeft+el.clientWidth,bottom:r.y+el.clientTop+el.clientHeight,xClip:/hidden|clip|auto|scroll/.test(s.overflowX),yClip:/hidden|clip|auto|scroll/.test(s.overflowY)});}}return out;};
        const rects=[...(svg?.querySelectorAll('rect')||[])].map(node=>{const b=box(node),s=getComputedStyle(node);return{box:b,fill:s.fill,opacity:s.opacity,visibility:s.visibility,display:s.display,clips:clips(node.parentElement)};});
        const sr=stand.getBoundingClientRect(),hit=document.elementFromPoint(sr.x+sr.width/2,sr.y+sr.height/2);
        return{stand:box(stand),pitch:box(pitch),wrap:box(wrap),following:wrap.nextElementSibling?box(wrap.nextElementSibling):null,rects,crowd:[...stand.querySelectorAll('span')].map(box),hit:{tag:hit?.tagName||null,withinGround:!!hit&&wrap.contains(hit)},svg:svg?{pointerEvents:getComputedStyle(svg).pointerEvents,ariaHidden:svg.getAttribute('aria-hidden'),box:box(svg)}:null,scroll:{x:scrollX,y:scrollY},viewport:{width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth},html:stand.outerHTML};});
      row.surfaces.push({label,value});save('mounts.json',complete);return value;
    }
    async function capture(label){const surface=await geometry(label);const viewport=`${id}-${label}.png`;const bytes=await page.screenshot({path:path.join(OUT,viewport)}),decoded=png(bytes);
      const r=surface.stand,clip={x:Math.ceil(r.x),y:Math.ceil(r.y),width:Math.floor(r.right)-Math.ceil(r.x),height:Math.floor(r.bottom)-Math.ceil(r.y)};assert(clip.x>=0&&clip.y>=0&&clip.x+clip.width<=width&&clip.y+clip.height<=surface.viewport.height);
      assert.equal(decoded.width,width);assert.equal(decoded.height,surface.viewport.height);const pixels=Buffer.alloc(clip.width*clip.height*decoded.channels);for(let y=0;y<clip.height;y++){const from=((clip.y+y)*decoded.width+clip.x)*decoded.channels;decoded.pixels.copy(pixels,y*clip.width*decoded.channels,from,from+clip.width*decoded.channels);}
      const region={width:clip.width,height:clip.height,channels:decoded.channels,pixels};row.screenshots.push({file:viewport,sha256:sha(bytes),standRegion:{...clip,channels:decoded.channels,sha256:sha(pixels)}});return{surface,region};
    }
    async function press(locator,label){await locator.scrollIntoViewIfNeeded();const box=await locator.boundingBox();assert(box);const before=await snapshot(`${label}-before`);const first=await page.evaluate(()=>window.__ground.events.length);if(width<700)await locator.tap();else await locator.click();await page.waitForFunction(()=>window.__ground.calls.length>0);await drain();const events=await page.evaluate(start=>window.__ground.events.slice(start),first);assert(events.some(event=>event.type==='click'&&event.trusted));row.inputs.push({label,box,events});return before;}
    try{
      await page.clock.pauseAt(NOW);await page.goto(base+'/',{waitUntil:'load'});await page.locator('[data-ground-ready="true"] [data-tycoon-pitch]').waitFor();
      row.clockBoot=await page.evaluate(()=>window.__ground.clockBoot);assert.deepEqual(row.clockBoot,{now:NOW,performance:0});
      row.fonts=await page.evaluate(async()=>{const rows=[];for(const family of ['Space Grotesk','Inter'])for(const weight of [400,500,600,700]){await document.fonts.load(`${weight} 16px "${family}"`);rows.push({family,weight,loaded:document.fonts.check(`${weight} 16px "${family}"`)});}await document.fonts.ready;return{rows,faces:[...document.fonts].map(face=>({family:face.family,weight:face.weight,status:face.status}))};});assert(row.fonts.rows.every(font=>font.loaded&&row.fonts.faces.some(face=>face.family.replace(/["']/g,'')===font.family&&Number(face.weight)===font.weight&&face.status==='loaded')));
      row.beforeClockAdvance=await snapshot('before-clock-advance');assert.equal(row.beforeClockAdvance.now,NOW);assert.equal(row.beforeClockAdvance.performance,0);
      await (clockControl?clockFault:clockHost).advance(page);const initial=await snapshot('initial');assert.equal(initial.now,NOW+128,'Declared 128ms clock advance');assert.equal(initial.performance,128,'Declared 128ms clock advance');assert.deepEqual(initial.hook.state,T.deserializeTycoon(T.serializeTycoon(fixture,NOW),NOW));
      const before=await capture('before');row.before=before.surface;row.initial=initial;
      if(['first','boundary','unrelated'].includes(stage)){
        const track=stage==='unrelated'?'tickets':'stands',label=track==='stands'?'Stands':'Ticket Office',button=page.getByRole('button').filter({has:page.getByText(label,{exact:true})});
        await button.scrollIntoViewIfNeeded();const layoutBefore=await geometry('purchase-layout-before',false);await press(button,'purchase');await page.waitForFunction(({id,value})=>window.__ground.hook.state.levels[id]===value,{id:track,value:T.levelOf(fixture,track)+1});
        const after=await snapshot('after-buy');assert.deepEqual(after.hook.state,T.buy(initial.hook.state,track));const layoutAfter=await geometry('purchase-layout-after',false);row.purchaseLayout={before:layoutBefore,after:layoutAfter};
        const afterPicture=await capture('after-buy');row.afterBuy=after;row.after=afterPicture.surface;row.pixelChange=pixelDifference(before.region,afterPicture.region);
      }
      if(stage==='first'){
        const surface=await geometry('tap-location'),bay=surface.rects[0]?.box;const beforeTap=await snapshot('before-tap'),start=await page.evaluate(()=>window.__ground.events.length);
        const point=bay?{x:bay.x+bay.width/2,y:bay.y+bay.height/2}:tapReference;assert(point,'Old page uses the actual current first-bay center');const{x,y}=point;
        const hit=await page.evaluate(({x,y})=>{const node=document.elementFromPoint(x,y),wrap=document.querySelector('[data-tycoon-pitch]').parentElement;return{tag:node?.tagName||null,html:node?.outerHTML||null,withinGround:!!node&&wrap.contains(node),terrace:!!node?.closest('[data-tycoon-terraces]')};},point);assert(hit.withinGround);row.tapPoint={x,y,bay:bay||null,hit,reference:tapReference};
        if(width<700)await page.touchscreen.tap(x,y);else await page.mouse.click(x,y);
        await page.waitForFunction(taps=>window.__ground.hook.state.totalTaps===taps,beforeTap.hook.state.totalTaps+(arm==='interception'?0:1));await drain();const afterTap=await snapshot('after-tap');const events=await page.evaluate(i=>window.__ground.events.slice(i),start);assert(events.some(event=>event.type==='click'&&event.trusted));row.inputs.push({label:'terrace-tap',x,y,events});row.tap={before:beforeTap,after:afterTap,expected:T.tap(beforeTap.hook.state)};
      }
      row.beforeFlush=await snapshot('before-flush');await page.evaluate(()=>dispatchEvent(new Event('pagehide')));row.flushed=await snapshot('flushed');assert.equal(row.flushed.local[T.TYCOON_SAVE_KEY],T.serializeTycoon(row.beforeFlush.hook.state,row.flushed.now));
      assert.deepEqual(row.flushed.session,initial.session);for(const key of [R.REWARDS_KEY,W.SAVE_KEY,'ground-held-local'])assert.equal(row.flushed.local[key],initial.local[key]);
      await drain();assert.deepEqual(row.errors,[]);assert.deepEqual(row.sockets,[]);row.complete=true;return row;
    }finally{await drain();await context.close();await drain();if(row.errors.length||row.sockets.length)row.complete=false;save('mounts.json',complete);assert.deepEqual(row.errors,[]);assert.deepEqual(row.sockets,[]);}
  }
  const cleanRect=rect=>rect&&({x:rect.docX,y:rect.docY,width:rect.width,height:rect.height});
  function exterior(surface){return{stand:cleanRect(surface.stand),pitch:cleanRect(surface.pitch),wrap:cleanRect(surface.wrap),following:cleanRect(surface.following)};}
  function visible(surface){assert(surface.hit.withinGround,'Ground center is not covered by another control');for(const outer of [surface.stand,surface.pitch,surface.wrap])assert(outer.x>=-1&&outer.y>=-1&&outer.right<=surface.viewport.width+1&&outer.bottom<=surface.viewport.height+1);for(const row of surface.rects){const r=row.box;assert(r.width>0&&r.height>0);assert.notEqual(row.fill,'none');assert(Number(row.opacity)>0);assert.notEqual(row.display,'none');assert.notEqual(row.visibility,'hidden');assert(r.x>=-1&&r.y>=-1&&r.right<=surface.viewport.width+1&&r.bottom<=surface.viewport.height+1);for(const clip of row.clips){if(clip.xClip)assert(r.x>=clip.x-1&&r.right<=clip.right+1);if(clip.yClip)assert(r.y>=clip.y-1&&r.bottom<=clip.bottom+1);}}assert(surface.viewport.scrollWidth<=surface.viewport.width+1);}
  function check(label,row,fn,failures){if(row.expectedAssertion&&row.expectedAssertion!==label)return;try{fn();}catch(error){assert.equal(error.name,'AssertionError');const record={assertion:label,name:error.name,message:error.message,stack:error.stack};failures.push(record);if(!row.expectedAssertion)throw error;}}
  function stageChecks(actual,old,row){
    const errors=row.failures;for(const value of [actual.before,actual.after].filter(Boolean))visible(value);
    // Baseline comparisons stay strict even inside copied source controls.
    assert.deepEqual(actual.initial,old.initial);assert.deepEqual(actual.afterBuy,old.afterBuy);assert.deepEqual(actual.flushed.session,old.flushed.session);
    if(old.tap)assert.deepEqual(old.tap.after.hook.state,old.tap.expected,'The unchanged original page tap baseline remains healthy');
    if(actual.arm!=='interception')assert.deepEqual(actual.flushed,old.flushed);
    check('Fixed ground exterior',row,()=>{assert.deepEqual(exterior(actual.before),exterior(old.before));if(actual.after)assert.deepEqual(exterior(actual.after),exterior(old.after));if(actual.purchaseLayout){assert.deepEqual(exterior(actual.purchaseLayout.before),exterior(actual.purchaseLayout.after));assert.deepEqual(actual.purchaseLayout.before.scroll,actual.purchaseLayout.after.scroll);}},errors);
    if(actual.stage==='first'||actual.stage==='boundary')check('Visible capacity growth',row,()=>{const count=actual.stage==='first'?3:20;assert.equal(actual.before.rects.length,count);assert.equal(actual.after.rects.length,count+1);assert(actual.pixelChange.changedPixels>0);assert.equal(old.pixelChange.changedPixels,0);const boxes=actual.after.rects.map(r=>cleanRect(r.box));assert.equal(new Set(boxes.map(b=>`${b.x},${b.y}`)).size,count+1);if(count===20)assert(actual.after.rects[20].box.y<actual.before.rects[0].box.y);assert.deepEqual(actual.before.crowd,actual.after.crowd);},errors);
    if(actual.stage==='max'||actual.stage==='attendance')check('Capacity creates structure',row,()=>{assert.equal(actual.before.rects.length,actual.stage==='max'?203:3);const ys=new Set(actual.before.rects.map(r=>r.box.y));assert.equal(ys.size,actual.stage==='max'?11:1);},errors);
    if(actual.stage==='unrelated')check('Unrelated upgrade holds structure',row,()=>{assert.deepEqual(actual.before.rects,actual.after.rects);assert.equal(actual.pixelChange.changedPixels,0);assert.equal(old.pixelChange.changedPixels,0);},errors);
    if(actual.stage==='first')check('Terrace tap delivery',row,()=>{assert.deepEqual({x:actual.tapPoint.x,y:actual.tapPoint.y},{x:old.tapPoint.x,y:old.tapPoint.y});assert.deepEqual(actual.tap.after.hook.state,actual.tap.expected);assert.deepEqual(actual.tap,old.tap);assert.deepEqual(actual.flushed,old.flushed);assert.equal(actual.tap.after.calls.filter(call=>call.action==='tap').length,1);},errors);
  }
  for(const width of [320,390,430,1440]){
    const row={width,complete:false,stages:[],failures:[]};report.cases.push(row);persist();
    for(const stage of ['first','boundary','max','attendance','unrelated']){const actual=await mount('current',width,stage),old=await mount('old',width,stage,actual.tapPoint?{x:actual.tapPoint.x,y:actual.tapPoint.y}:null);row.stages.push({stage,baseline:old.id,actual:actual.id});stageChecks(actual,old,row);}
    const first=complete.find(r=>r.id===`current-${width}-first`),attendance=complete.find(r=>r.id===`current-${width}-attendance`);assert.deepEqual(first.before.rects,attendance.before.rects);assert.notEqual(first.before.crowd.length,attendance.before.crowd.length);row.complete=true;persist();
  }
  for(const fault of faults){const row={name:fault.name,expectedAssertion:fault.assertion,complete:false,failures:[]};report.controls.push(row);persist();const old=complete.find(r=>r.id===`old-390-${fault.stage}`),actual=await mount(fault.name,390,fault.stage);row.baseline=old.id;row.actual=actual.id;stageChecks(actual,old,row);assert.equal(row.failures.length,1);assert.equal(row.failures[0].assertion,fault.assertion);row.complete=true;persist();}
  const clockCheck={name:'extra-clock-millisecond',assertion:'Declared 128ms clock advance',complete:false,baseline:'current-320-first'};report.clockControl=clockCheck;let clockError;
  try{await mount('current',320,'first',null,true);}catch(error){clockError=error;clockCheck.error={name:error.name,message:error.message,stack:error.stack};}
  assert(clockError instanceof assert.AssertionError);assert(clockError.message.includes(clockCheck.assertion));
  const clockMount=complete.at(-1),clockBaseline=complete.find(row=>row.id===clockCheck.baseline);assert.equal(clockMount.id,'clock-control-current-320-first');clockCheck.actual=clockMount.id;
  assert.deepEqual(clockMount.clockBoot,clockBaseline.clockBoot);assert.deepEqual(clockMount.beforeClockAdvance,clockBaseline.beforeClockAdvance);
  const clockActual=clockMount.states.find(row=>row.label==='initial').value;assert.equal(clockActual.now,NOW+129);assert.equal(clockActual.performance,129);
  const {now:actualNow,performance:actualPerformance,...actualRest}=clockActual,{now:baselineNow,performance:baselinePerformance,...baselineRest}=clockBaseline.initial;
  assert.deepEqual(actualRest,baselineRest);clockCheck.clocks={actual:{now:actualNow,performance:actualPerformance},baseline:{now:baselineNow,performance:baselinePerformance}};
  assert.equal(clockMount.complete,false);assert.deepEqual(clockMount.inputs,[]);assert.deepEqual(clockMount.screenshots,[]);clockCheck.complete=true;
  const regularMounts=complete.filter(row=>!row.clockControl);assert.equal(regularMounts.length,44);assert(regularMounts.every(row=>row.complete));assert.equal(complete.length,45);assert(complete.every(row=>row.errors.length===0&&row.sockets.length===0));
  save('mounts.json',complete);report.mounts={file:'mounts.json',count:complete.length,regularCount:regularMounts.length,setupCount:1,sha256:fileSha(path.join(OUT,'mounts.json')),screenshots:complete.reduce((sum,row)=>sum+row.screenshots.length,0)};
  report.complete=true;
}catch(error){report.complete=false;report.errors.push({name:error.name,message:error.message,stack:error.stack});throw error;}
finally{
  let closingError;
  try{await browser?.close();if(server)await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()));}catch(error){closingError=error;report.complete=false;report.errors.push({name:error.name,message:error.message});}
  try{report.sourceAfter=sources();report.buildAfter=hashes(['dist']);report.cacheAfter=hashes(['tycoon-ground-growth-artifacts/asset-cache']);assert.deepEqual(report.sourceAfter,report.sourceBefore);assert.deepEqual(report.buildAfter,report.buildBefore);assert.deepEqual(report.cacheAfter,report.cacheBefore);}catch(error){closingError=error;report.complete=false;report.errors.push({name:error.name,message:error.message});}persist();if(closingError)throw closingError;
}
console.log('Ground growth native: four finite page journeys and four effective copied controls passed.');
