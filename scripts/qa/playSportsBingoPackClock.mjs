// Remote Chromium evidence for the public Sports Bingo solo pack clock.
import '../lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync,spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {fileURLToPath} from 'node:url';
import pw from '../lib/playwrightLoader.mjs';

const PAGE='b34c07f28a8d4005e68c307631c2c146aca3a9fc';
const FIXED={"run":42356583184,"artifact":13568250895,"head":"4e5772bfc3b5896b94f7e2d53165174cac1d8c79","tree":"f7b72519d8c59f1f7686aa6d98cd3c5f5b33161e","zipBytes":3652108,"zipSHA256":"637f6075ae1aaec89dab3e037fc261def7cdee31cd3922dd888c9885f6052947","rawBytes":433600,"rawSHA256":"ca469ab3572fe40d781d74a620bfe9a19dc859d6caec16e976f2b848915c691b"};
const CONTROLS={"run":42356912987,"artifact":13568346154,"head":"c4756dd922820dcd108466067d444e7dd625e913","tree":"1d0b0d31da18aa996bcce3056d4d4378373fe341","zipBytes":7332227,"zipSHA256":"4f4ddc32cbd2e504f195fe4d2afe7c1abc4ff45ae8c6e205d8c77980be6a9681","admissionFile":"admission.json","admissionBytes":12197,"admissionSHA256":"d383cc5af653d31482bd21c0708f9e028f205ec4e101a0a52bc18ab10c3a44b9"};
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const ROUTE='/sports-bingo',pageFile='src/pages/SportsBingo.tsx';
const helperFile='scripts/qa/playSportsBingoPackClock.mjs';
const workflowFile='.github/workflows/sports-bingo-pack-clock-20261107.yml';
const widths=[[320,568],[390,844],[1280,900]];
const pageStart=Date.parse('2026-11-07T17:00:00Z');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const blob=bytes=>createHash('sha1').update(Buffer.from('blob '+bytes.length+'\0')).update(bytes).digest('hex');
const read=(...parts)=>fs.readFileSync(path.join(...parts));
const json=(...parts)=>JSON.parse(read(...parts));
const tuple=(file,bytes)=>({file,bytes:bytes.length,sha256:sha(bytes)});
const equal=assert.deepEqual;
const env=process.env;
assert(env.CI&&env.SIM_NETWORK==='offline'&&process.versions.node==='24.22.1');
assert.equal(env.SPORTS_BINGO_PACK_CLOCK_PAGE_BLOB,PAGE);
function absoluteOutput(key){
  const value=env[key];
  assert(value&&path.isAbsolute(value)&&path.resolve(value).startsWith(ROOT+path.sep),key+' absolute path inside checkout');
  return path.resolve(value);
}
const out=absoluteOutput('SPORTS_BINGO_PACK_CLOCK_BROWSER_OUT');
const full=absoluteOutput('SPORTS_BINGO_PACK_CLOCK_FULL_UNIT');
const fixed=absoluteOutput('SPORTS_BINGO_PACK_CLOCK_FIXED_REFERENCE');
const controls=absoluteOutput('SPORTS_BINGO_PACK_CLOCK_CONTROLS_REFERENCE');
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
const fixture=JSON.parse(fixedUnit).fixture;
assert(Array.isArray(fixture.rows)&&fixture.rows.length===120);
const names=new Set(fixture.rows.map(row=>row.player_name));
assert.equal(names.size,120);
assert([...names].every(name=>typeof name==='string'&&name.length>0));
const poolBody=save('wire-pool.json',Buffer.from(JSON.stringify(fixture.rows)));

const head=git('rev-parse','HEAD').trim(),tree=git('rev-parse','HEAD^{tree}').trim();
assert.equal(head,env.GITHUB_SHA);
equal(git('rev-list','--parents','-n','1','HEAD').trim().split(' '),[head,FIXED.head]);
assert.equal(git('rev-parse',FIXED.head+'^{tree}').trim(),FIXED.tree);
const treeRows=ref=>git('ls-tree','-r','-z',ref).split('\0').filter(Boolean);
const fileOf=row=>row.split('\t')[1];
const beforeTree=treeRows(FIXED.head),afterTree=treeRows('HEAD');
const held=rows=>rows.filter(row=>![helperFile,workflowFile].includes(fileOf(row)));
const scoped=rows=>rows.filter(row=>/^(src|public|scripts)\//.test(fileOf(row))).length;
equal([beforeTree.length,afterTree.length,held(beforeTree).length,scoped(beforeTree),scoped(afterTree)],[5788,5789,5787,4662,4663]);
equal(held(beforeTree),held(afterTree));
equal(git('diff','--name-status',FIXED.head,'HEAD').trim().split('\n').sort(),['A\t'+helperFile,'M\t'+workflowFile].sort());
git('diff','--exit-code','HEAD','--','.');
const pins={
  [pageFile]:PAGE,'src/lib/sportsBingo.ts':'b1f29ad32de3567cad907d35d684a53e59f34616',
  'src/lib/squadDeal.ts':'726c554d99de4c285604e23cbe1d6def78477bcb',
  'src/components/sports-bingo/BingoCardGrid.tsx':'ee97f73aa1daa4ece1b85a08db68ffa32d38cfc3',
  'src/components/sports-bingo/BingoPackList.tsx':'376a1e7da6f43713ec54732a91a34c348afcbec2',
  'src/App.tsx':'8bfedf7aaa1d076e0f0c8e2216c7e46632cd8a33','src/data/gameRegistry.ts':'f560b40a74d1468ac72dfde4ee6fec6635a9a255',
  'public/sports-bingo/index.html':'044451271149c1e08160d70cec2019860e284004',
  'scripts/lib/offlineTransport.cjs':'0fda542a2649fe5da937c6976fd0f5b6073e74b6',
  'scripts/lib/hostLikeServer.mjs':'21059d5e8114669df61106c125d5272d357b6236',
};
for(const [file,oid] of Object.entries(pins))assert.equal(blob(read(ROOT,file)),oid,file);
const helper=git('rev-parse','HEAD:'+helperFile).trim(),workflow=git('rev-parse','HEAD:'+workflowFile).trim();
assert.equal(blob(read(ROOT,helperFile)),helper);
const source={head,tree,workflow,trackedBodies:5789,scopedSourceRows:4663,heldFixedRows:5787,rootConfigurations:11,distBodies:850,installedVersions:521};
const before={source:tracked(),dist:built(),locks:locks(),installed:installed(),offline:offline()};
equal([before.source.length,before.dist.length],[5789,850]);
equal(before.source,json(full,'tracked-before.json'));
equal(before.dist,json(full,'dist-before.json'));
equal(before.installed,json(full,'installed-before.json'));
const builtByName=new Map(before.dist.map(row=>[row.file,row]));
const docPath='dist/sports-bingo/index.html',entryDocPath='dist/index.html';
const indexBefore=save('index-before.bin',index());
const binding=write('qualified-input.json',{fixed:FIXED,controls:CONTROLS,fullUnit:tuple('case-fixed/raw.json',fullUnit),source,page:PAGE,helper});
const report={version:1,status:'running',route:ROUTE,page:PAGE,helper,source,binding,poolBody,indexBefore,before,journeys:[],
  limits:['Public Daily solo in three Chromium viewports with Playwright Clock installed before navigation.',
    'Real trusted browser mouse actions and bounded clock advances. Controlled time, no claim of real-time accuracy.',
    'Fictional local SDK response, no external continuation, completion, scoring, CPU, table or provider claim.']};
const backend='https://flawuiqbvjobmkfkauhw.supabase.co',poolPath='/rest/v1/player_market_values';
const expectedQuery=[['select','player_name,position,age,nationality,club,market_value_usd,goals,assists'],
  ['year','eq.2026'],['order','market_value_usd.desc,player_name.asc'],['limit','1000']];
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
  const id=String(width),row={id,width,height,status:'running',navigations:[],requests:[],responses:[],firstParty:[],errors:[],frames:[],actions:[],wheels:[],clock:[],screenshots:[]};
  report.journeys.push(row);
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,serviceWorkers:'block',reducedMotion:'reduce',timezoneId:'UTC'});
  let page;
  const tasks=new Set();
  const track=promise=>{
    tasks.add(promise);
    promise.then(()=>tasks.delete(promise),error=>{row.errors.push(String(error.stack||error));tasks.delete(promise);});
    return promise;
  };
  const frame=async name=>{
    const state=await page.evaluate(()=>{
      const main=document.querySelector('main#dukb-main');
      const next=[...main?.querySelectorAll('button')??[]].find(button=>button.textContent.trim()==='Done with this pack, open the next');
      const spans=[...main?.querySelectorAll('span')??[]];
      const text=regex=>spans.find(node=>regex.test(node.textContent.trim()))?.textContent.trim()??null;
      const header=text(/^Pack \d+ of 10$/),packMatch=header?.match(/^Pack (\d+) of (10)$/);
      const timer=main?.querySelector('svg.lucide-timer')?.parentElement??null;
      const players=[...next?.previousElementSibling?.querySelectorAll('span.font-semibold')??[]].map(node=>node.textContent.trim());
      const squares=[...main?.querySelectorAll('div.grid.grid-cols-5 > button')??[]].map(button=>({label:button.textContent.trim(),disabled:button.disabled,html:button.outerHTML}));
      const store=area=>Object.fromEntries(Object.keys(area).sort().map(key=>[key,area.getItem(key)]));
      return {url:location.href,at:Date.now(),visible:document.visibilityState,viewport:{width:innerWidth,height:innerHeight},scroll:{x:scrollX,y:scrollY},
        pack:packMatch?Number(packMatch[1]):null,total:packMatch?Number(packMatch[2]):null,header,
        timer:timer?.textContent.trim()??null,seconds:timer?Number(timer.textContent.trim().replace(/s$/,'')):null,
        score:text(/^You \d+$/),players,squares,next:next?.textContent.trim()??null,nextEnabled:next?!next.disabled:null,
        cookie:!!document.querySelector('[role=region][aria-label="Cookie choices"]'),
        help:!!document.querySelector('button[aria-label="How to play"]'),html:main?.outerHTML??null,
        storage:{local:store(localStorage),session:store(sessionStorage)}};
    });
    const value={name,...state};
    equal([value.url,value.visible,value.viewport],[base+ROUTE,'visible',{width,height}]);
    row.frames.push(write(id+'/frames/'+String(row.frames.length).padStart(2,'0')+'-'+name+'.json',value));
    return value;
  };
  const events=()=>page.evaluate(()=>window.__sportsBingoEvidence);
  function geometry(locator){
    return locator.evaluate(el=>{
      const r=el.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2,hit=document.elementFromPoint(x,y);
      const clip={left:0,top:0,right:innerWidth,bottom:innerHeight};
      const ancestors=[];
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
        enabled:!el.matches(':disabled')&&el.getAttribute('aria-disabled')!=='true',tag:el.tagName,text:el.textContent.trim()};
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
      await page.mouse.move(x,y);
      await page.mouse.wheel(0,delta);
      const wheelEvents=await wait(async()=>{
        const found=(await events()).slice(count).filter(event=>event.type==='wheel');
        return found.length?found:null;
      },label+' real wheel event');
      assert(wheelEvents.every(event=>event.trusted&&event.deltaMode===0));
      equal(wheelEvents.reduce((sum,event)=>sum+event.deltaY,0),delta);
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
    },label+' trusted pointer journal');
    equal(observed.map(event=>event.type),['pointerdown','pointerup','click']);
    assert(observed.every(event=>event.trusted&&event.pointerType==='mouse'&&event.tag===layout.tag&&event.text===layout.text));
    assert(Math.abs(observed[2].x-layout.center.x)<=1&&Math.abs(observed[2].y-layout.center.y)<=1);
    const after=await frame(label+'-after');
    row.actions.push({label,before:before.name,after:after.name,layout,events:observed});
    return after;
  }
  async function readClock(){
    return page.evaluate(()=>Date.now());
  }
  async function drainReact(){
    await page.evaluate(async()=>{
      for(let i=0;i<2;i++)await new Promise(resolve=>{
        const channel=new MessageChannel();
        channel.port1.onmessage=()=>{channel.port1.close();channel.port2.close();resolve();};
        channel.port2.postMessage(0);
      });
    });
  }
  async function clock(label,ms,pack,seconds){
    const before=await readClock();
    await page.clock.runFor(ms);
    await drainReact();
    const after=await readClock();
    assert.equal(after-before,ms,label+' actual exact browser clock advance');
    const value=await frame(label);
    equal([value.at,value.pack,value.seconds],[after,pack,seconds],label);
    row.clock.push({label,requestedMs:ms,before,after,pack,seconds});
    return value;
  }
  function game(value,pack,seconds,board,storage){
    equal([value.pack,value.total,value.header,value.seconds,value.timer,value.score,value.next,value.nextEnabled],
      [pack,10,'Pack '+pack+' of 10',seconds,seconds+'s','You 0','Done with this pack, open the next',true]);
    assert.equal(value.players.length,5);
    assert.equal(new Set(value.players).size,5);
    assert(value.players.every(name=>names.has(name)));
    equal(value.squares.map(square=>[square.label,square.disabled]),board);
    equal(value.storage,storage);
  }
  async function photo(label,marker,pack){
    const target=page.locator('main#dukb-main span').and(page.getByText('Pack '+pack+' of 10',{exact:true}));
    const layout=await prepare(target,'photo-'+label);
    const before=await frame(label+'-photo-before');
    const png=await page.screenshot({fullPage:false,animations:'allow',caret:'initial',timeout:10000});
    equal([png.readUInt32BE(16),png.readUInt32BE(20)],[width,height]);
    const after=await frame(label+'-photo-after');
    equal([before.at,before.pack,before.seconds,before.players],[marker.at,pack,15,marker.players]);
    equal([after.at,after.pack,after.seconds,after.players],[before.at,pack,15,before.players]);
    row.screenshots.push({...save(id+'-'+label+'.png',png),label,before:before.name,after:after.name,layout});
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
      if(url.origin===backend&&url.pathname===poolPath){
        equal([...query].sort(),[...expectedQuery].sort());
        assert(!request.postDataBuffer());
        if(method==='OPTIONS'){
          assert.equal(headers['access-control-request-method'],'GET');
          await route.fulfill({status:204,headers:{'access-control-allow-origin':base,'access-control-allow-methods':'GET,OPTIONS','access-control-allow-headers':headers['access-control-request-headers']??''}});
          item.outcome='local-cors';return;
        }
        equal([method,headers.origin],['GET',base]);
        assert.equal(row.requests.filter(candidate=>candidate.outcome==='local-pool').length,0);
        item.outcome='local-pool';item.body=poolBody;
        await route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':base},body:read(out,poolBody.file)});
        return;
      }
      const background=url.origin===backend&&['/rest/v1/live_scores','/rest/v1/game_completions'].includes(url.pathname)&&
        (method==='GET'||method==='OPTIONS'&&headers['access-control-request-method']==='GET');
      const staticRead=method==='GET'&&((url.hostname==='fonts.googleapis.com'&&url.pathname==='/css2')||
        (url.hostname==='fonts.gstatic.com'&&url.pathname.startsWith('/s/'))||(url.hostname==='flagcdn.com'&&/^\/w(?:20|40|80|160|320)\/(?:[a-z]{2}|gb-(?:eng|sct|wls|nir))\.png$/.test(url.pathname)&&!url.search));
      await route.abort();
      assert(background||staticRead,'Undeclared refused transport '+method+' '+url.origin+url.pathname);
    })().catch(async error=>{
      try{await route.abort();}catch{}
      throw error;
    })));
    page=await context.newPage();
    page.on('pageerror',error=>row.errors.push(String(error.stack||error)));
    page.on('framenavigated',frame=>{if(frame===page.mainFrame())row.navigations.push({at:Date.now(),url:frame.url()});});
    page.on('response',response=>track((async()=>{
      const url=new URL(response.url()),request=response.request();
      if(url.origin===base&&request.method()==='GET'){
        const file=url.pathname===ROUTE?docPath:url.pathname==='/'?entryDocPath:'dist'+decodeURIComponent(url.pathname);
        const expected=builtByName.get(file);
        assert(expected&&response.status()===200,'exact physical first-party body '+file);
        const body=await response.body(),actual=tuple(file,body);
        equal(actual,expected);
        row.firstParty.push({url:url.href,status:response.status(),type:request.resourceType(),body:actual});
      }else if(url.origin===backend&&url.pathname===poolPath&&request.method()==='GET'){
        assert.equal(response.status(),200);
        const bytes=await response.body();
        assert(bytes.equals(read(out,poolBody.file)));
        row.responses.push({url:url.href,status:200,body:tuple(poolBody.file,bytes)});
      }
    })()));
    await page.addInitScript(()=>{
      const tape=[];
      Object.defineProperty(window,'__sportsBingoEvidence',{value:tape});
      for(const type of ['pointerdown','pointerup','click','wheel'])document.addEventListener(type,event=>{
        const node=event.target?.closest?.('button')??event.target;
        tape.push({type,at:Date.now(),trusted:event.isTrusted,pointerType:event.pointerType??null,tag:node?.tagName??null,
          text:node?.textContent?.trim().slice(0,240)??null,x:event.clientX,y:event.clientY,deltaY:event.deltaY??null,deltaMode:event.deltaMode??null});
      },{capture:true,passive:true});
    });
    await page.clock.install({time:pageStart});
    const response=await page.goto(base+ROUTE,{waitUntil:'domcontentloaded'});
    assert.equal(response?.status(),200);
    const reject=page.getByRole('region',{name:'Cookie choices',exact:true}).getByRole('button',{name:'Reject all',exact:true});
    const daily=page.locator('main#dukb-main button').filter({has:page.getByText('Daily card',{exact:true})});
    const next=page.getByRole('button',{name:'Done with this pack, open the next',exact:true});
    await wait(async()=>await reject.count()===1&&await reject.isVisible(),'real cookie choice');
    await click(reject,'reject-cookies');
    await wait(async()=>await reject.count()===0&&await daily.count()===1&&await daily.isVisible(),'real Daily card setup');
    await wait(()=>row.responses.length===1,'actual browser consumed fictional pool');
    await wait(async()=>await page.locator('button[aria-label="How to play"]').count()===1,'actual available shared Help');
    const pauseTarget=Math.ceil(await readClock())+2000;
    await page.clock.pauseAt(pauseTarget);
    await page.clock.setSystemTime(pauseTarget);
    assert.equal(await readClock(),pauseTarget);
    const ready=await frame('ready');
    const consent=JSON.parse(ready.storage.local['cookie-consent-v2']);
    equal([ready.cookie,ready.help,ready.pack,consent.version,consent.advertising,consent.analytics],[false,true,null,2,false,false]);
    assert(ready.html.includes('How to play')&&ready.html.includes('15 second timer'));
    const entered=await click(daily,'start-daily');
    await drainReact();
    const start=await frame('pack-1-entry');
    equal([entered.at,start.at],[pauseTarget,pauseTarget]);
    const board=start.squares.map(square=>[square.label,square.disabled]);
    assert.equal(board.length,25);
    assert.equal(new Set(board.map(([label])=>label)).size,25);
    equal(board.flatMap(([label,disabled],i)=>disabled?[i]:[]),[12]);
    game(start,1,15,board,ready.storage);
    game(await clock('pack-1-before-first-second',999,1,15),1,15,board,ready.storage);
    game(await clock('pack-1-first-second',1,1,14),1,14,board,ready.storage);
    game(await clock('pack-1-early-next-ready',650,1,14),1,14,board,ready.storage);
    await click(next,'manual-next');
    await drainReact();
    const manual=await frame('pack-2-manual-reset');
    assert.equal(manual.at-start.at,1650);
    game(manual,2,15,board,ready.storage);
    assert(manual.players.every(name=>!start.players.includes(name)));
    await photo('manual-reset',manual,2);
    game(await clock('pack-2-before-old-boundary',349,2,15),2,15,board,ready.storage);
    const oldBoundary=await clock('pack-2-old-boundary',1,2,15);
    game(oldBoundary,2,15,board,ready.storage);
    const beforeNew=await clock('pack-2-before-new-boundary',649,2,15);
    game(beforeNew,2,15,board,ready.storage);
    const firstNew=await clock('pack-2-first-second',1,2,14);
    game(firstNew,2,14,board,ready.storage);
    for(let second=2;second<=14;second++)game(await clock('pack-2-second-'+second,1000,2,15-second),2,15-second,board,ready.storage);
    const preExpiry=await clock('pack-2-before-expiry',999,2,1);
    game(preExpiry,2,1,board,ready.storage);
    const auto=await clock('pack-3-ordinary-auto',1,3,15);
    game(auto,3,15,board,ready.storage);
    assert(auto.players.every(name=>![...start.players,...manual.players].includes(name)));
    await photo('ordinary-auto',auto,3);
    const autoBefore=await clock('pack-3-before-first-second',999,3,15);
    game(autoBefore,3,15,board,ready.storage);
    const autoFirst=await clock('pack-3-first-second',1,3,14);
    game(autoFirst,3,14,board,ready.storage);
    equal([oldBoundary.at-manual.at,beforeNew.at-manual.at,firstNew.at-manual.at,preExpiry.at-manual.at,auto.at-manual.at,autoFirst.at-auto.at],[350,999,1000,14999,15000,1000]);
    row.timing={startAt:start.at,manualAt:manual.at,oldBoundaryAt:oldBoundary.at,preNewTickAt:beforeNew.at,newTickAt:firstNew.at,
      preExpiryAt:preExpiry.at,automaticAt:auto.at,automaticFirstTickAt:autoFirst.at,pausedBeforeStart:true};
    await wait(()=>tasks.size===0,'all native request and response bodies settled');
    equal([row.requests.filter(item=>item.outcome==='local-pool').length,row.responses.length,row.actions.length,row.screenshots.length],[1,1,3,2]);
    assert(row.firstParty.some(item=>item.body.file===docPath&&item.type==='document'));
    assert(row.firstParty.some(item=>item.type==='script'&&item.body.file==='dist/prerender-boot.js'));
    assert(row.firstParty.some(item=>item.url===base+'/'&&item.type==='fetch'&&item.body.file===entryDocPath));
    assert(row.firstParty.some(item=>item.type==='script'&&/^dist\/assets\/index-[^/]+\.js$/.test(item.body.file)));
    assert(row.firstParty.some(item=>item.type==='script'&&/^dist\/assets\/SportsBingo-[^/]+\.js$/.test(item.body.file)));
    assert(row.navigations.length>0&&row.navigations.every(item=>item.url===base+ROUTE));
    equal(row.errors,[]);
    row.status='passed';
  }catch(error){
    row.status='failed';row.error=String(error.stack||error);
    if(page)try{await frame('failure');}catch(capture){row.errors.push(String(capture.stack||capture));}
    throw error;
  }finally{
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
  report.census={journeys:3,contexts:3,viewportPNGs:sum(row=>row.screenshots.length),manualBoundaries:sum(row=>Number(!!row.timing)),
    ordinaryAutoTransitions:sum(row=>Number(!!row.timing)),poolReads:sum(row=>row.responses.length),completionAttempts:sum(row=>row.requests.filter(item=>item.method==='POST'&&new URL(item.url).pathname==='/rest/v1/game_completions').length),
    frames:sum(row=>row.frames.length),actions:sum(row=>row.actions.length),wheels:sum(row=>row.wheels.length),navigations:sum(row=>row.navigations.length),
    clockAdvances:sum(row=>row.clock.length),firstPartyResponses:sum(row=>row.firstParty.length),corsPreflights:sum(row=>row.requests.filter(item=>item.outcome==='local-cors').length)};
  equal([report.census.viewportPNGs,report.census.manualBoundaries,report.census.ordinaryAutoTransitions,report.census.poolReads,report.census.completionAttempts],[6,3,3,3,0]);
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
  report.raw=write('raw.json',{version:1,route:ROUTE,page:PAGE,helper,binding,poolBody,
    journeys:report.journeys.map(row=>({...row,frames:row.frames.map(ref=>json(out,ref.file))}))});
  write('report.json',report);
  const bodies=walk(out).map(file=>tuple(file,read(out,file)));
  write('body-manifest.json',{version:1,files:bodies,filesCount:bodies.length,bodyBytes:bodies.reduce((n,row)=>n+row.bytes,0)});
  assert.equal(report.status,'passed','native evidence and final holds');
}
