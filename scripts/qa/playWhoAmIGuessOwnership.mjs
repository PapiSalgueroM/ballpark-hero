// Remote Chromium evidence for the public Who Am I round-owned player lookup.
import '../lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync,spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {fileURLToPath} from 'node:url';
import pw from '../lib/playwrightLoader.mjs';

const PAGE='76c3c1d99a4c0b6752df0c3b27cd548f88d51fae';
const FIXED={"run":42362221393,"artifact":13569588361,"head":"6713d0d2396d077f5a4c52ead9afe809458480b5","tree":"f1ee6cbb42e3ebc3298e54f02aa99ca7bef4f25d","zipBytes":3672379,"zipSHA256":"30f0bd05c215e2a4cef038d39c6aef4ef566ae6946cba8ea3d0a0a464d32edcc","rawBytes":274774,"rawSHA256":"04c43f5f3558d6b65b6ab0cdfe0257d0a258078d35926352f28ab083a9a22418"};
const CONTROLS={"run":42362517871,"artifact":13570079080,"head":"22fbb8a4e509d903dbf0127b3218660d234221c0","tree":"1b20bc5437855d0981ae2fb9dbb060867507d75e","zipBytes":7390268,"zipSHA256":"69abb8fe51dd61efbc819009e9fb27d93928d8ee5482a9c7bd2fc10239694de1","admissionFile":"admission.json","admissionBytes":25374,"admissionSHA256":"9327a36964efce44c376cdf71733aa437c500a2899592ce7e8cb1af0abe306fd"};
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const ROUTE='/who-am-i',pageFile='src/pages/WhoAmI.tsx';
const helperFile='scripts/qa/playWhoAmIGuessOwnership.mjs';
const workflowFile='.github/workflows/who-am-i-guess-ownership-20261107.yml';
const widths=[[320,568],[390,844],[1280,900]];
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const blob=bytes=>createHash('sha1').update(Buffer.from('blob '+bytes.length+'\0')).update(bytes).digest('hex');
const read=(...parts)=>fs.readFileSync(path.join(...parts));
const json=(...parts)=>JSON.parse(read(...parts));
const tuple=(file,bytes)=>({file,bytes:bytes.length,sha256:sha(bytes)});
const equal=assert.deepEqual;
const env=process.env;
assert(env.CI&&env.SIM_NETWORK==='offline'&&process.versions.node==='24.22.1');
assert.equal(env.WHO_AM_I_GUESS_OWNERSHIP_PAGE_BLOB,PAGE);
function absoluteOutput(key){
  const value=env[key];
  assert(value&&path.isAbsolute(value)&&path.resolve(value).startsWith(ROOT+path.sep),key+' absolute path inside checkout');
  return path.resolve(value);
}
const out=absoluteOutput('WHO_AM_I_GUESS_OWNERSHIP_BROWSER_OUT');
const full=absoluteOutput('WHO_AM_I_GUESS_OWNERSHIP_FULL_UNIT');
const fixed=absoluteOutput('WHO_AM_I_GUESS_OWNERSHIP_FIXED_REFERENCE');
const controls=absoluteOutput('WHO_AM_I_GUESS_OWNERSHIP_CONTROLS_REFERENCE');
equal([out,fixed,controls].map(value=>path.dirname(value)),Array(3).fill(full));
assert(!fs.existsSync(out));fs.mkdirSync(out);
function save(file,body){
  const location=path.join(out,file);
  fs.mkdirSync(path.dirname(location),{recursive:true});
  fs.writeFileSync(location,body,{flag:'wx'});
  return tuple(file,body);
}
const write=(file,value)=>save(file,Buffer.from(JSON.stringify(value,null,2)+'\n'));
const git=(...args)=>execFileSync('git',args,{cwd:ROOT,encoding:'utf8',maxBuffer:16*1024*1024});
function walk(dir,prefix=''){
  return fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name)).flatMap(entry=>{
    const file=prefix+entry.name;
    if(entry.isDirectory())return walk(path.join(dir,entry.name),file+'/');
    assert(entry.isFile(),'regular file '+file);
    return [file];
  });
}
const tracked=()=>git('ls-files','-z').split('\0').filter(Boolean).map(file=>tuple(file,read(ROOT,file)));
const built=()=>walk(path.join(ROOT,'dist'),'dist/').map(file=>tuple(file,read(ROOT,file)));
const index=()=>Buffer.from(git('ls-files','--stage','-z'));
function installed(){
  const lock=json(ROOT,'package-lock.json');
  const rows=Object.keys(lock.packages).filter(file=>file.startsWith('node_modules/')&&fs.existsSync(path.join(ROOT,file,'package.json')))
    .map(file=>[file,json(ROOT,file,'package.json').version]);
  assert.equal(rows.length,521);
  for(const [file,version] of rows)assert.equal(version,lock.packages[file].version,file);
  return rows;
}
const locks=()=>['package.json','package-lock.json','bun.lock','bun.lockb'].map(file=>tuple(file,read(ROOT,file)));
const offline=()=>{
  const file=path.resolve(ROOT,env.SIM_OFFLINE_RECEIPT);
  const receipt=tuple(path.relative(ROOT,file),read(file));
  assert.equal(receipt.bytes,0);
  return receipt;
};
function reference(directory,pin){
  const run=json(directory,'run.json'),meta=json(directory,'artifact.json');
  if(Object.hasOwn(meta,'artifacts'))assert.equal(meta.artifacts.length,1);
  const artifact=meta.artifacts?.[0]??meta;
  equal([run.id,run.status,run.conclusion,run.head_sha,run.head_commit.tree_id],
    [pin.run,'completed','success',pin.head,pin.tree]);
  equal([artifact.id,artifact.workflow_run.id,artifact.workflow_run.head_sha,artifact.size_in_bytes,artifact.digest],
    [pin.artifact,pin.run,pin.head,pin.zipBytes,'sha256:'+pin.zipSHA256]);
  const zip=read(directory,'artifact.zip');
  equal([zip.length,sha(zip)],[pin.zipBytes,pin.zipSHA256]);
  equal([read(directory,'packet','head.txt').toString('utf8').trim(),read(directory,'packet','tree.txt').toString('utf8').trim()],[pin.head,pin.tree]);
}
reference(fixed,FIXED);
reference(controls,CONTROLS);
const fullUnit=read(full,'case-fixed','raw.json'),fixedUnit=read(fixed,'packet','case-fixed','raw.json');
equal([fixedUnit.length,sha(fixedUnit)],[FIXED.rawBytes,FIXED.rawSHA256]);
assert(fullUnit.equals(fixedUnit),'whole fresh fixed RAW equals completed fixed run');
assert(/^[A-Za-z0-9._/-]+$/.test(CONTROLS.admissionFile)&&CONTROLS.admissionFile.split('/').every(part=>part&&part!=='.'&&part!=='..'));
const controlBody=read(controls,'packet',CONTROLS.admissionFile);
equal([controlBody.length,sha(controlBody)],[CONTROLS.admissionBytes,CONTROLS.admissionSHA256]);
const unit=JSON.parse(fixedUnit);
assert.equal(unit.schema,'who-am-i-lookup-ownership-v1');
const [latest,carried,history]=unit.cases.keepPlaying.queries;
equal([latest.role,carried.role,history.role],['boot-current','boot-carried','boot-history']);
const pool=latest.rows;
equal([unit.fixture.poolSize,pool.length,history.rows.length],[52,52,52]);
equal(carried.rows,[]);
assert(pool.every(row=>row.year===2026&&row.age>0&&row.market_value_usd>0&&row.player_name.startsWith('Fixture Keep ')));
assert.equal(new Set(pool.map(row=>row.person_key)).size,pool.length);
equal(history.rows,pool.map(row=>({n:row.player_name,c:row.club,a:row.age,y:row.year,k:row.person_key})));
const outside=['Alder','Birch'].map((name,i)=>({player_name:'Fixture Lookup '+name,person_key:'who-native-lookup-'+name.toLowerCase(),
  nationality:'Fixture Nation',position:'Centre-Forward',club:'Fixture Lookup Club',market_value_usd:700000-i*100000,age:0,year:2026}));
assert(outside.every(row=>!pool.some(player=>player.player_name===row.player_name||player.person_key===row.person_key)));
const fixture={schema:'who-am-i-native-fixture-v1',bootRows:pool,carriedRows:carried.rows,historyRows:history.rows,outsideRows:outside};
const fixtureBody=write('fixture.json',fixture);
const packed=columns=>columns.replace(/\s/g,'');
const poolColumns=packed(unit.fixture.columns),historyColumns=packed(unit.fixture.historyColumns),searchColumns=packed(unit.fixture.searchColumns);
equal([poolColumns,historyColumns,searchColumns],['player_name,nationality,position,club,market_value_usd,age,year,person_key',
  'n:player_name,c:club,a:age,y:year,k:person_key','player_name,market_value_usd,year,club,nationality,position,age,person_key']);
const bootOrder='market_value_usd.desc,player_name.asc,id.asc',searchOrder='market_value_usd.desc,year.desc,player_name.asc';
const range={offset:'0',limit:'1000'},bootColumns={select:poolColumns,age:'gt.0',order:bootOrder,...range};
const specs=[
  ['boot-current',{...bootColumns,year:'eq.2026',market_value_usd:'gt.0'},pool],
  ['boot-carried',{...bootColumns,year:'eq.2025',market_value_usd:'gte.0'},[]],
  ['boot-history',{select:historyColumns,player_name:'in.('+pool.map(row=>row.player_name).join(',')+')',order:'id.asc',...range},history.rows],
  ['search-a',{select:searchColumns,name_folded:'ilike.%'+outside[0].player_name.toLowerCase()+'%',order:searchOrder,limit:'200'},[outside[0]]],
  ['search-b',{select:searchColumns,name_folded:'ilike.%'+outside[1].player_name.toLowerCase()+'%',order:searchOrder,limit:'200'},[outside[1]]],
  ['search-prominence',{select:searchColumns,order:searchOrder,limit:'1000'},[...pool,...outside]],
  ...outside.map((row,i)=>[i?'lookup-b':'lookup-a',{select:poolColumns,person_key:'eq.'+row.person_key,year:'in.(2026,2025)',order:'year.desc,market_value_usd.desc',limit:'1'},[row]]),
].map(([role,query,rows])=>({role,query:Object.entries(query).sort(),body:save('wire/'+role+'.json',Buffer.from(JSON.stringify(rows)))}));
function findSpec(url){
  const query=[...url.searchParams].sort();
  return specs.find(spec=>JSON.stringify(query)===JSON.stringify(spec.query));
}
const backend='https://flawuiqbvjobmkfkauhw.supabase.co',poolPath='/rest/v1/player_market_values';
const completionPath='/rest/v1/game_completions';
const head=git('rev-parse','HEAD').trim(),tree=git('rev-parse','HEAD^{tree}').trim();
assert.equal(head,env.GITHUB_SHA);
equal(git('rev-list','--parents','-n','1','HEAD').trim().split(' '),[head,FIXED.head]);
assert.equal(git('rev-parse',FIXED.head+'^{tree}').trim(),FIXED.tree);
const treeRows=ref=>git('ls-tree','-r','-z',ref).split('\0').filter(Boolean);
const fileOf=row=>row.split('\t')[1];
const beforeTree=treeRows(FIXED.head),afterTree=treeRows('HEAD');
const held=rows=>rows.filter(row=>![helperFile,workflowFile].includes(fileOf(row)));
const scoped=rows=>rows.filter(row=>/^(src|public|scripts)\//.test(fileOf(row))).length;
equal([beforeTree.length,afterTree.length,held(beforeTree).length,scoped(beforeTree),scoped(afterTree)],[5790,5791,5789,4663,4664]);
equal(held(beforeTree),held(afterTree));
equal(git('diff','--name-status',FIXED.head,'HEAD').trim().split('\n').sort(),['A\t'+helperFile,'M\t'+workflowFile].sort());
git('diff','--exit-code','HEAD','--','.');
const pins={
  [pageFile]:PAGE,
  'src/lib/whoAmI.ts':'8b6da5c480857fa8b7164d50c322eaccd0f6a8af',
  'src/components/game/PlayerAutocomplete.tsx':'a0bd500b63306c75e0dea251cb6fb67ea2ed9452',
  'src/components/game/GiveUpButton.tsx':'2462260a7b5f1d5d3b70915df2428d5d4397b0a0',
  'src/components/game/RulesGate.tsx':'ad59d4218dbd3790cad1ae7dac52fd27f459f15d',
  'src/lib/playerSearch.ts':'0d19f2c23735eb30512dc7fc3a447eacef5e128f',
  'src/lib/fetchAllRows.ts':'16a6d21750405e7a647576ff513ed8ee11d5ba6b',
  'src/lib/completions.ts':'61daf9b6c528f884551cd1d42f71357681c8728a',
  'src/App.tsx':'8bfedf7aaa1d076e0f0c8e2216c7e46632cd8a33',
  'src/data/gameRegistry.ts':'f560b40a74d1468ac72dfde4ee6fec6635a9a255',
  'public/who-am-i/index.html':'cd4d7ab7de79d9742bfbebea4de649ada9349fea',
  'scripts/lib/offlineTransport.cjs':'0fda542a2649fe5da937c6976fd0f5b6073e74b6',
  'scripts/lib/hostLikeServer.mjs':'21059d5e8114669df61106c125d5272d357b6236',
};
for(const [file,oid] of Object.entries(pins))assert.equal(blob(read(ROOT,file)),oid,file);
const helper=git('rev-parse','HEAD:'+helperFile).trim(),workflow=git('rev-parse','HEAD:'+workflowFile).trim();
assert.equal(blob(read(ROOT,helperFile)),helper);
const source={head,tree,workflow,trackedBodies:5791,scopedSourceRows:4664,heldFixedRows:5789,rootConfigurations:11,distBodies:850,installedVersions:521};
const before={source:tracked(),dist:built(),locks:locks(),installed:installed(),offline:offline()};
equal([before.source.length,before.dist.length],[5791,850]);
equal(before.source,json(full,'tracked-before.json'));
equal(before.dist,json(full,'dist-before.json'));
equal(before.installed,json(full,'installed-before.json'));
const builtByName=new Map(before.dist.map(row=>[row.file,row]));
const docPath='dist/who-am-i/index.html';
const docBytes=read(ROOT,docPath);
equal(tuple(docPath,docBytes),builtByName.get(docPath));
const docHead=docBytes.toString('utf8').split('</head>')[0];
const modules=[...docHead.matchAll(/<script\b[^>]*\btype="module"[^>]*\bsrc="(\/assets\/index-[^"]+\.js)"[^>]*>/g)];
assert.equal(modules.length,1,'physical active Who Am I module');
const entryPath=modules[0][1];
const indexBefore=save('index-before.bin',index());
const binding=write('qualified-input.json',{fixed:FIXED,controls:CONTROLS,fullUnit:tuple('case-fixed/raw.json',fullUnit),source,page:PAGE,helper});
const report={version:1,status:'running',route:ROUTE,page:PAGE,helper,source,binding,fixture:fixtureBody,wire:specs,indexBefore,before,entryPath,journeys:[],
  limits:['Three fresh signed-out Chromium contexts on the actual built Who Am I route.',
    'Actual trusted pointer and keyboard selection, browser-native text insertion, held local SDK deliveries. No private state, RNG override, or external continuation.',
    'One genuine Give up per context. The exact completion POST is intercepted and aborted locally. Replay stays playing when old A settles while B is pending. Only the distinct B guess is accepted.',
    'Fictional current pool is joined to admitted unit data; two age-zero wide-only identities cannot be drawn as secrets. No exact-win, live-provider, timing, hardware touch, or sitewide browser claim.']};
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function wait(get,label,ms=15000){
  const until=Date.now()+ms;
  for(;;){const value=await get();if(value)return value;assert(Date.now()<until,label);await pause(30);}
}
async function reservePort(){
  const sock=createServer();
  await new Promise((resolve,reject)=>{sock.on('error',reject);sock.listen(0,'127.0.0.1',resolve);});
  const port=sock.address().port;
  await new Promise((resolve,reject)=>sock.close(error=>error?reject(error):resolve()));
  return port;
}
async function journey(browser,base,width,height){
  const id=String(width),row={id,width,height,status:'running',navigations:[],requests:[],responses:[],firstParty:[],errors:[],
    frames:[],actions:[],wheels:[],screenshots:[],deliveries:[],completion:[]};
  report.journeys.push(row);
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,serviceWorkers:'block',reducedMotion:'reduce',timezoneId:'UTC'});
  let page;
  const tasks=new Set(),gates=new Map();
  const track=promise=>{
    tasks.add(promise);
    promise.then(()=>tasks.delete(promise),error=>{row.errors.push(String(error.stack||error));tasks.delete(promise);});
    return promise;
  };
  const frame=async name=>{
    const state=await page.evaluate(()=>{
      const main=document.querySelector('main#dukb-main');
      const words=node=>node?.textContent?.replace(/\s+/g,' ').trim()??null;
      const matching=(root,selector,text)=>[...root?.querySelectorAll(selector)??[]].find(node=>words(node)===text);
      const combo=main?.querySelector('input[role=combobox]')??null;
      const list=combo?document.getElementById(combo.getAttribute('aria-controls')):null;
      const spans=[...main?.querySelectorAll('span')??[]].map(words);
      const guess=spans.find(text=>/^Guess \d+ of \d+$/.test(text))?.match(/^Guess (\d+) of (\d+)$/);
      const left=spans.find(text=>/^\d+ left$/.test(text))?.match(/^(\d+) left$/);
      const h2=[...main?.querySelectorAll('h2')??[]].find(node=>/^(Out of guesses|Found him in \d+ guess(?:es)?)$/.test(words(node)));
      const last=matching(main,'div','Last guess')?.nextElementSibling??null;
      const lastName=last?.querySelector('span.font-semibold.truncate')??null;
      const lastScore=last?.querySelector('span.font-bold.font-display')??null;
      const dialog=document.querySelector('[role=dialog]');
      const cookie=document.querySelector('[role=region][aria-label="Cookie choices"]');
      const storage=area=>Object.fromEntries(Object.keys(area).sort().map(key=>[key,area.getItem(key)]));
      return {url:location.href,at:Date.now(),visible:document.visibilityState,viewport:{width:innerWidth,height:innerHeight},scroll:{x:scrollX,y:scrollY},
        heading:words(main?.querySelector('h1')),phase:h2?(words(h2)==='Out of guesses'?'lost':'won'):combo?'playing':
          matching(main,'button div','Casual')?'mode':matching(main,'p','Scouting the player pool...')?'boot':'unavailable',
        dialog:dialog?{title:words(dialog.querySelector('h2')),html:dialog.outerHTML}:null,cookie:cookie?{inDialog:!!dialog?.contains(cookie),html:cookie.outerHTML}:null,
        combo:combo?{value:combo.value,focus:combo===document.activeElement,expanded:combo.getAttribute('aria-expanded'),html:combo.outerHTML,
          options:[...list?.querySelectorAll('[role=option]')??[]].map(node=>({name:words(node.firstElementChild),text:words(node),html:node.outerHTML}))}:null,
        checking:!!matching(main,'p','Checking his season...'),
        lookupFailed:!!matching(main,'p',"Couldn't pull up his season just then, so that one doesn't count. Pick him again."),
        guess:guess?Number(guess[1]):null,budget:guess?Number(guess[2]):null,left:left?Number(left[1]):null,
        last:last?{name:words(lastName),score:lastScore?Number(words(lastScore)):null,html:last.outerHTML}:null,
        result:h2?{title:words(h2),answer:words(h2.parentElement.querySelector('div.text-xl.font-bold')),html:h2.parentElement.outerHTML}:null,
        html:main?.outerHTML??null,storage:{local:storage(localStorage),session:storage(sessionStorage)}};
    });
    const value={name,...state};
    equal([value.url,value.visible,value.viewport],[base+ROUTE,'visible',{width,height}]);
    row.frames.push(write(id+'/frames/'+String(row.frames.length).padStart(2,'0')+'-'+name+'.json',value));
    return value;
  };
  const events=()=>page.evaluate(()=>window.__whoAmINativeEvents);
  function geometry(locator){
    return locator.evaluate(el=>{
      const r=el.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2,hit=document.elementFromPoint(x,y);
      const clip={left:0,top:0,right:innerWidth,bottom:innerHeight},ancestors=[];
      for(const node of document.querySelectorAll('header,[data-site-chrome]')){
        if(node.contains(el)||el.contains(node))continue;
        const style=getComputedStyle(node),box=node.getBoundingClientRect();
        if(!['fixed','sticky'].includes(style.position)||box.width<innerWidth/2||!box.height)continue;
        if(box.top<=2&&box.bottom>0)clip.top=Math.max(clip.top,box.bottom);
        if(box.bottom>=innerHeight-2&&box.top<innerHeight)clip.bottom=Math.min(clip.bottom,box.top);
      }
      for(let p=el.parentElement;p;p=p.parentElement){
        if(p===document.scrollingElement)continue;
        const css=getComputedStyle(p),box=p.getBoundingClientRect(),flags=['auto','scroll','hidden','clip','overlay'];
        if(flags.includes(css.overflowX)){clip.left=Math.max(clip.left,box.x+p.clientLeft);clip.right=Math.min(clip.right,box.x+p.clientLeft+p.clientWidth);}
        if(flags.includes(css.overflowY)){clip.top=Math.max(clip.top,box.y+p.clientTop);clip.bottom=Math.min(clip.bottom,box.y+p.clientTop+p.clientHeight);}
        if(flags.includes(css.overflowX)||flags.includes(css.overflowY))ancestors.push({tag:p.tagName,overflowX:css.overflowX,overflowY:css.overflowY,scrollTop:p.scrollTop});
      }
      return {rect:{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom},center:{x,y},clip,ancestors,
        scroll:{x:scrollX,y:scrollY},viewport:{width:innerWidth,height:innerHeight},hit:hit===el||el.contains(hit),
        enabled:!el.matches(':disabled')&&el.getAttribute('aria-disabled')!=='true',tag:el.tagName,text:el.textContent.replace(/\s+/g,' ').trim()};
    });
  }
  async function prepare(locator,label){
    assert.equal(await locator.count(),1,label+' unique');
    for(let attempt=0;attempt<12;attempt++){
      const g=await geometry(locator),{rect:r,clip:c}=g;
      if(g.hit&&g.enabled&&r.width>0&&r.height>0&&r.x>=c.left&&r.right<=c.right&&r.y>=c.top&&r.bottom<=c.bottom)return g;
      assert(r.width>0&&r.height>0&&r.x>=c.left&&r.right<=c.right&&c.bottom>c.top,label+' horizontally available');
      const delta=Math.round(r.y<c.top?r.y-c.top-12:r.bottom>c.bottom?r.bottom-c.bottom+12:0);
      assert(delta,label+' measured vertical positioning needed');
      const x=Math.max(2,Math.min(width-2,g.center.x)),y=Math.max(2,Math.min(height-2,(c.top+c.bottom)/2));
      const count=(await events()).length;
      await page.mouse.move(x,y);await page.mouse.wheel(0,delta);
      const wheelEvents=await wait(async()=>{const found=(await events()).slice(count).filter(event=>event.type==='wheel');return found.length?found:null;},label+' trusted wheel');
      assert(wheelEvents.every(event=>event.trusted&&event.deltaMode===0));
      assert.equal(wheelEvents.reduce((sum,event)=>sum+event.deltaY,0),delta);
      await pause(45);
      row.wheels.push({label,attempt,x,y,delta,before:g,after:await geometry(locator),events:wheelEvents});
    }
    throw Error(label+' never fit native hit target');
  }
  async function click(locator,label){
    const layout=await prepare(locator,label),start=(await events()).length;
    const before=await frame(label+'-before');
    await page.mouse.click(layout.center.x,layout.center.y);
    const observed=await wait(async()=>{
      const found=(await events()).slice(start).filter(event=>['pointerdown','pointerup','click'].includes(event.type));
      return found.length>=3?found:null;
    },label+' trusted pointer receipt');
    equal(observed.map(event=>event.type),['pointerdown','pointerup','click']);
    assert(observed.every(event=>event.trusted&&event.pointerType==='mouse'&&event.tag===layout.tag&&event.text===layout.text));
    assert(Math.abs(observed[2].x-layout.center.x)<=1&&Math.abs(observed[2].y-layout.center.y)<=1);
    const after=await frame(label+'-after');
    row.actions.push({label,method:'mouse',before:before.name,after:after.name,layout,events:observed});
    return after;
  }
  async function key(keyName,label,locator=null){
    const layout=locator?await prepare(locator,label):null;
    const before=await frame(label+'-before');
    if(locator)assert(before.combo?.focus,label+' actual combo focus');
    else assert(before.dialog?.title==='How to Play Who Am I?',label+' actual dialog owns Escape');
    const start=(await events()).length;
    await page.keyboard.press(keyName);
    const observed=(await events()).slice(start).filter(event=>event.type==='keydown'||event.type==='keyup');
    equal(observed.map(event=>[event.type,event.key,event.trusted]),[['keydown',keyName,true],['keyup',keyName,true]]);
    if(locator)equal([observed[0].tag,observed[0].role],['INPUT','combobox']);
    const after=await frame(label+'-after');
    row.actions.push({label,method:'keyboard',key:keyName,before:before.name,after:after.name,layout,events:observed});
    return after;
  }
  async function type(locator,text,label){
    const layout=await prepare(locator,label);
    const before=await frame(label+'-before'),start=(await events()).length;
    assert(before.combo?.focus&&before.combo.value==='',label+' empty focused combo');
    await page.keyboard.insertText(text);
    const observed=(await events()).slice(start).filter(event=>event.type==='input');
    equal(observed.map(event=>[event.trusted,event.tag,event.role,event.data,event.value]),[[true,'INPUT','combobox',text,text]]);
    const after=await frame(label+'-after');
    assert.equal(after.combo?.value,text);
    row.actions.push({label,method:'typing',text,before:before.name,after:after.name,layout,events:observed});
    return after;
  }
  function game(value,{checking=false,guess=1,left=25,last=null}={}){
    equal([value.phase,value.heading,value.checking,value.lookupFailed,value.guess,value.budget,value.left,value.last?.name??null,value.result],
      ['playing','WHO AM I?',checking,false,guess,25,left,last,null],value.name);
  }
  async function photo(locator,label,marker){
    const layout=await prepare(locator,'photo-'+label);
    const before=await frame(label+'-photo-before');
    const png=await page.screenshot({fullPage:false,animations:'allow',caret:'initial',timeout:10000});
    equal([png.readUInt32BE(16),png.readUInt32BE(20)],[width,height]);
    const after=await frame(label+'-photo-after');
    for(const point of [before,after]){
      equal([point.phase,point.checking,point.lookupFailed,point.guess,point.left,point.last,point.result?.answer??null],
        [marker.phase,marker.checking,marker.lookupFailed,marker.guess,marker.left,marker.last,marker.result?.answer??null]);
      equal(point.storage,marker.storage);
    }
    row.screenshots.push({...save(id+'-'+label+'.png',png),label,before:before.name,after:after.name,layout});
  }
  function gate(role){
    let finish;
    const ready=new Promise(resolve=>{finish=resolve;});
    const value={role,ready,finish};
    assert(!gates.has(role),role+' unique outstanding wire');
    gates.set(role,value);
    return value;
  }
  async function release(role){
    const value=gates.get(role);
    assert(value&&!value.releasedAt,role+' must be held first');
    value.releasedAt=Date.now();
    const receipt={role,at:value.releasedAt,beforeResponses:row.responses.filter(item=>item.role===role).length};
    assert.equal(receipt.beforeResponses,0);
    row.deliveries.push(receipt);
    value.finish(true);
    await wait(()=>row.responses.some(item=>item.role===role),role+' actual browser response body');
    await page.evaluate(async()=>{
      for(let i=0;i<2;i++)await new Promise(resolve=>{
        const channel=new MessageChannel();
        channel.port1.onmessage=()=>{channel.port1.close();channel.port2.close();resolve();};
        channel.port2.postMessage(0);
      });
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    });
  }
  try{
    await context.routeWebSocket('**/*',socket=>{row.errors.push('Unexpected WebSocket intent');socket.close();});
    await context.route('**/*',route=>track((async()=>{
      const request=route.request(),url=new URL(request.url()),method=request.method();
      if(url.origin===base){
        assert(['GET','HEAD'].includes(method)&&!request.postDataBuffer());
        await route.continue();return;
      }
      const headers=request.headers(),query=[...url.searchParams];
      const item={at:Date.now(),url:url.href,method,query,outcome:'blocked'};
      row.requests.push(item);
      const spec=url.origin===backend&&url.pathname===poolPath?findSpec(url):null;
      const isCompletion=url.origin===backend&&url.pathname===completionPath;
      if(spec&&method==='OPTIONS'||isCompletion&&method==='OPTIONS'&&headers['access-control-request-method']==='POST'){
        const target=spec?'GET':'POST';
        assert.equal(headers['access-control-request-method'],target);
        assert(!request.postDataBuffer());
        await route.fulfill({status:204,headers:{'access-control-allow-origin':base,'access-control-allow-methods':target+',OPTIONS',
          'access-control-allow-headers':headers['access-control-request-headers']??''}});
        item.outcome='local-cors';item.role=spec?.role??'completion';return;
      }
      if(spec){
        equal([method,headers.origin],['GET',base]);
        assert(!request.postDataBuffer());
        item.role=spec.role;item.body=spec.body;
        if(spec.role.startsWith('lookup-')){
          const held=gate(spec.role);
          item.heldAt=Date.now();item.outcome='held-local';
          if(!await held.ready){item.outcome='cancelled';await route.abort();return;}
          item.releaseAt=held.releasedAt;
        }
        item.outcome='local-fixture';
        await route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':base},body:read(out,spec.body.file)});
        item.fulfilledAt=Date.now();
        return;
      }
      if(isCompletion&&method==='POST'){
        equal(headers.origin,base);equal(query,[]);
        const body=request.postDataBuffer();
        assert(body);
        const text=body.toString('utf8'),data=JSON.parse(text);
        equal(Object.keys(data).sort(),['game','player_name']);
        assert(data.game==='who-am-i'&&typeof data.player_name==='string'&&data.player_name.length>0);
        item.outcome='completion-aborted';
        item.body=save(id+'/completion-'+row.completion.length+'.json',body);
        row.completion.push({at:item.at,url:item.url,data,body:item.body});
        await route.abort();return;
      }
      const background=url.origin===backend&&['/rest/v1/live_scores',completionPath].includes(url.pathname)&&
        (method==='GET'||method==='OPTIONS'&&headers['access-control-request-method']==='GET');
      const staticRead=method==='GET'&&((url.hostname==='fonts.googleapis.com'&&url.pathname==='/css2')||
        (url.hostname==='fonts.gstatic.com'&&url.pathname.startsWith('/s/'))||
        (url.hostname==='flagcdn.com'&&/^\/w(?:20|40|80|160|320)\/(?:[a-z]{2}|gb-(?:eng|sct|wls|nir))\.png$/.test(url.pathname)&&!url.search));
      await route.abort();
      assert(background||staticRead,'Undeclared refused transport '+method+' '+url.origin+url.pathname);
    })().catch(async error=>{try{await route.abort();}catch{}throw error;})));
    page=await context.newPage();
    page.on('pageerror',error=>row.errors.push(String(error.stack||error)));
    page.on('framenavigated',frame=>{if(frame===page.mainFrame())row.navigations.push({at:Date.now(),url:frame.url()});});
    page.on('response',response=>track((async()=>{
      const url=new URL(response.url()),request=response.request();
      if(url.origin===base&&request.method()==='GET'){
        const file=url.pathname===ROUTE?docPath:url.pathname==='/'?'dist/index.html':'dist'+decodeURIComponent(url.pathname);
        const expected=builtByName.get(file);
        assert(expected&&response.status()===200,'exact physical first-party body '+file);
        const body=await response.body(),actual=tuple(file,body);
        equal(actual,expected);
        row.firstParty.push({url:url.href,status:response.status(),type:request.resourceType(),body:actual});
      }else if(url.origin===backend&&url.pathname===poolPath&&request.method()==='GET'){
        const spec=findSpec(url);
        assert(spec&&response.status()===200);
        const bytes=await response.body();
        assert(bytes.equals(read(out,spec.body.file)));
        row.responses.push({at:Date.now(),role:spec.role,url:url.href,status:200,body:tuple(spec.body.file,bytes)});
      }
    })()));
    await page.addInitScript(()=>{
      const tape=[];
      Object.defineProperty(window,'__whoAmINativeEvents',{value:tape,writable:false});
      for(const type of ['pointerdown','pointerup','click','wheel','keydown','keyup','input'])document.addEventListener(type,event=>{
        const target=event.target?.closest?.('button,input')??event.target;
        tape.push({type,at:Date.now(),trusted:event.isTrusted,pointerType:event.pointerType??null,key:event.key??null,data:event.data??null,
          tag:target?.tagName??null,role:target?.getAttribute?.('role')??null,text:target?.textContent?.replace(/\s+/g,' ').trim().slice(0,240)??null,
          value:target instanceof HTMLInputElement?target.value:null,x:event.clientX??null,y:event.clientY??null,deltaY:event.deltaY??null,deltaMode:event.deltaMode??null});
      },{capture:true,passive:true});
    });
    const response=await page.goto(base+ROUTE,{waitUntil:'domcontentloaded'});
    assert.equal(response?.status(),200);
    const main=page.locator('main#dukb-main');
    const dialog=page.getByRole('dialog',{name:'How to Play Who Am I?',exact:true});
    const reject=page.getByRole('region',{name:'Cookie choices',exact:true}).getByRole('button',{name:'Reject all',exact:true});
    const casual=main.locator('button').filter({has:page.getByText('Casual',{exact:true})});
    const combo=main.getByRole('combobox',{name:"Type any player's name (2+ letters)",exact:true});
    const giveUp=main.getByRole('button',{name:'Give up',exact:true});
    const confirm=main.getByRole('button',{name:'Yes, reveal it',exact:true});
    const replay=main.getByRole('button',{name:'Play again',exact:true});
    const loss=main.getByRole('heading',{name:'Out of guesses',exact:true});
    const pending=main.getByText('Checking his season...',{exact:true});
    const last=main.getByText('Last guess',{exact:true});
    await wait(async()=>await dialog.count()===1&&await dialog.isVisible()&&await reject.count()===1&&await reject.isVisible(),'fresh public rules and consent');
    const bootFrame=await frame('startup');
    equal(bootFrame.dialog?.title,'How to Play Who Am I?');
    assert(bootFrame.cookie,'observed actual consent');
    await click(reject,'reject-cookies');
    await wait(async()=>await reject.count()===0,'consent dismissed');
    await key('Escape','close-rules');
    await wait(async()=>await dialog.count()===0&&await casual.count()===1&&await casual.isVisible(),'public Casual after dismissing real rules');
    await wait(()=>['boot-current','boot-carried','boot-history'].every(role=>row.responses.some(item=>item.role===role)),'all three browser boot bodies');
    const ready=await frame('mode-ready');
    equal([ready.phase,ready.heading,ready.dialog,ready.cookie],['mode','WHO AM I?',null,null]);
    const consent=JSON.parse(ready.storage.local['cookie-consent-v2']);
    equal([consent.version,consent.advertising,consent.analytics],[2,false,false]);
    await click(casual,'start-casual');
    await wait(async()=>await combo.count()===1&&await combo.evaluate(node=>node===document.activeElement),'native combo focused by Page');
    const caseA=await frame('case-a-playing');
    game(caseA);
    async function submit(index){
      const letter=index?'b':'a',name=outside[index].player_name,role='lookup-'+letter;
      await type(combo,name,'type-'+letter);
      const options=main.getByRole('option');
      await wait(async()=>await options.count()===1&&await options.first().evaluate(node=>node.firstElementChild?.textContent?.trim())===name,'actual unique '+letter+' option');
      const selected=await frame('case-'+letter+'-option');
      equal(selected.combo.options.map(option=>option.name),[name]);
      await key('Enter','select-'+letter,combo);
      await wait(()=>gates.has(role)&&!row.responses.some(item=>item.role===role),role+' actual request pending');
      await wait(async()=>await pending.count()===1&&await pending.isVisible(),'real lookup checking indicator');
      const held=await frame('case-'+letter+'-held');
      game(held,{checking:true});
      assert.equal(held.combo?.value,'');
      return held;
    }
    const aHeld=await submit(0);
    await click(giveUp,'open-give-up');
    assert.equal(await confirm.count(),1);
    await click(confirm,'confirm-give-up');
    await wait(async()=>await loss.count()===1&&await loss.isVisible()&&row.completion.length===1,'legitimate result and actual completion attempt');
    const abandoned=await frame('case-a-abandoned');
    equal([abandoned.phase,abandoned.result?.title,abandoned.combo,abandoned.last],['lost','Out of guesses',null,null]);
    assert(pool.some(player=>player.player_name===abandoned.result.answer),'old revealed answer belongs to held boot pool');
    assert(!row.responses.some(item=>item.role==='lookup-a'));
    assert.notDeepEqual(abandoned.storage.local,aHeld.storage.local,'actual local completion writes');
    await photo(loss,'case-a-reveal',abandoned);
    await click(replay,'play-again');
    await wait(async()=>await combo.count()===1&&await combo.evaluate(node=>node===document.activeElement),'replay on same route with focused combo');
    const caseB=await frame('case-b-playing');
    game(caseB);
    equal(caseB.storage,abandoned.storage);
    const bHeld=await submit(1);
    equal(bHeld.storage,abandoned.storage);
    equal(row.responses.filter(item=>item.role.startsWith('lookup-')),[]);
    await release('lookup-a');
    const overlap=await frame('case-b-held-after-a');
    game(overlap,{checking:true});
    equal(overlap.storage,abandoned.storage);
    assert(!row.responses.some(item=>item.role==='lookup-b'));
    assert.equal(row.completion.length,1);
    await photo(pending,'case-b-still-pending',overlap);
    await release('lookup-b');
    await wait(async()=>await last.count()===1&&await pending.count()===0,'legitimate current B guess rendered');
    const accepted=await frame('case-b-accepted');
    game(accepted,{guess:2,left:24,last:outside[1].player_name});
    assert(Number.isInteger(accepted.last.score)&&accepted.last.score>=0&&accepted.last.score<100);
    equal(accepted.storage,abandoned.storage);
    assert(!accepted.html.includes(outside[0].player_name),'old A absent from current rendered history');
    await photo(last,'case-b-scored',accepted);
    row.checkpoints={ready:ready.name,aPlaying:caseA.name,aHeld:aHeld.name,aAbandoned:abandoned.name,bPlaying:caseB.name,bHeld:bHeld.name,
      bStillHeldAfterA:overlap.name,bAccepted:accepted.name};
    await wait(()=>tasks.size===0,'all request/response bodies settled');
    equal(row.responses.map(item=>item.role).sort(),['boot-current','boot-carried','boot-history','search-a','search-b','search-prominence','search-prominence','lookup-a','lookup-b'].sort());
    equal(row.deliveries.map(item=>item.role),['lookup-a','lookup-b']);
    equal([row.actions.length,row.screenshots.length,row.completion.length],[10,3,1]);
    assert(row.firstParty.some(item=>item.url===base+ROUTE&&item.type==='document'&&item.body.file===docPath));
    assert(row.firstParty.some(item=>item.url===base+'/prerender-boot.js'&&item.type==='script'&&item.body.file==='dist/prerender-boot.js'));
    assert(row.firstParty.some(item=>item.url===base+entryPath&&item.type==='script'&&item.body.file==='dist'+entryPath));
    assert(row.firstParty.some(item=>item.type==='script'&&/^dist\/assets\/WhoAmI-[^/]+\.js$/.test(item.body.file)));
    assert(row.navigations.length>0&&row.navigations.every(item=>item.url===base+ROUTE));
    equal(row.errors,[]);
    row.status='passed';
  }catch(error){
    row.status='failed';row.error=String(error.stack||error);
    if(page)try{await frame('failure');}catch(capture){row.errors.push(String(capture.stack||capture));}
    throw error;
  }finally{
    for(const value of gates.values())if(!value.releasedAt)value.finish(false);
    if(page)try{row.events=await events();}catch(error){row.errors.push(String(error.stack||error));}
    await Promise.allSettled([...tasks]);
    await context.close();
  }
}

let host,browser;
try{
  const port=await reservePort(),base='http://127.0.0.1:'+port;
  report.base=base;
  host=spawn(process.execPath,['scripts/lib/hostLikeServer.mjs','dist',String(port)],{cwd:ROOT,stdio:['ignore','pipe','pipe']});
  let stdout='',stderr='';
  host.stdout.on('data',bytes=>{stdout+=String(bytes);});host.stderr.on('data',bytes=>{stderr+=String(bytes);});
  host.on('error',error=>{report.hostError=String(error.stack||error);});
  await wait(()=>stdout.includes('host-like server:')||report.hostError,'physical dist loopback startup');
  assert(!report.hostError);
  report.host={stdout,stderr};
  browser=await pw.chromium.launch({headless:true});
  report.chromium=browser.version();
  const outcomes=await Promise.allSettled(widths.map(([width,height])=>journey(browser,base,width,height)));
  const failed=outcomes.find(outcome=>outcome.status==='rejected');
  if(failed)throw failed.reason;
  equal(report.journeys.map(row=>[row.width,row.height]),widths);
  assert(report.journeys.every(row=>row.status==='passed'&&row.errors.length===0));
  const sum=get=>report.journeys.reduce((n,row)=>n+get(row),0);
  report.census={journeys:3,contexts:3,viewportPNGs:sum(row=>row.screenshots.length),abandonResults:sum(row=>Number(!!row.checkpoints.aAbandoned)),
    replays:sum(row=>Number(!!row.checkpoints.bPlaying)),overlapSettlements:sum(row=>Number(!!row.checkpoints.bStillHeldAfterA)),
    acceptedCurrentGuesses:sum(row=>Number(!!row.checkpoints.bAccepted)),lookupReads:sum(row=>row.responses.filter(item=>item.role.startsWith('lookup-')).length),
    completionAttempts:sum(row=>row.completion.length),frames:sum(row=>row.frames.length),actions:sum(row=>row.actions.length),
    mouseActions:sum(row=>row.actions.filter(action=>action.method==='mouse').length),keyboardActions:sum(row=>row.actions.filter(action=>action.method==='keyboard').length),
    typingActions:sum(row=>row.actions.filter(action=>action.method==='typing').length),wheels:sum(row=>row.wheels.length),navigations:sum(row=>row.navigations.length),
    firstPartyResponses:sum(row=>row.firstParty.length),searchReads:sum(row=>row.responses.filter(item=>item.role.startsWith('search-')).length),
    bootReads:sum(row=>row.responses.filter(item=>item.role.startsWith('boot-')).length),corsPreflights:sum(row=>row.requests.filter(item=>item.outcome==='local-cors').length)};
  report.status='passed';
}catch(error){
  report.status='failed';report.error=String(error.stack||error);
  throw error;
}finally{
  if(browser)try{await browser.close();}catch(error){report.status='failed';report.closeError=String(error.stack||error);}
  if(host)host.kill();
  try{
    report.after={source:tracked(),dist:built(),locks:locks(),installed:installed(),offline:offline()};
    equal(report.after,before);
    report.indexAfter=save('index-after.bin',index());
    assert(read(out,report.indexBefore.file).equals(read(out,report.indexAfter.file)));
    assert(read(full,'case-fixed','raw.json').equals(fixedUnit));
    git('diff','--exit-code','HEAD','--','.');
    report.holds={source:true,dist:true,locks:true,installed521:true,offline:true,index:true,fullUnitLiteral:true};
  }catch(error){report.status='failed';report.holdError=String(error.stack||error);}
  report.raw=write('raw.json',{version:1,route:ROUTE,page:PAGE,helper,binding,fixture:fixtureBody,wire:specs,
    journeys:report.journeys.map(row=>({...row,frames:row.frames.map(ref=>json(out,ref.file))}))});
  write('report.json',report);
  const bodies=walk(out).map(file=>tuple(file,read(out,file)));
  write('body-manifest.json',{version:1,files:bodies,filesCount:bodies.length,bodyBytes:bodies.reduce((n,row)=>n+row.bytes,0)});
}
assert.equal(report.status,'passed',report.holdError??report.closeError??'native evidence and final holds');
