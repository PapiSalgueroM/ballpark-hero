// Isolated Actions Chromium proof for Transfer Path's paired fallback.
import '../lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { chromium } from 'playwright';

const env = process.env;
const prefix = 'TRANSFER_PATH_PAIRED_POOLS_';
const route = '/transfer-path';
const backend = 'https://flawuiqbvjobmkfkauhw.supabase.co';
const fixedDate = '2026-11-21T02:30:00.000Z';
const day = '2026-11-20';
const saveKey = 'transfer-path-daily-' + day;
const helperFile = 'scripts/qa/playTransferPathPairedPools.mjs';
const pageFile = 'src/pages/TransferPath.tsx';
const hookFile = 'src/hooks/useTransferPath.ts';
const full = path.resolve(env[prefix + 'FULL_UNIT']);
const out = path.resolve(env[prefix + 'BROWSER_OUT']);
const fixed = path.resolve(env[prefix + 'FIXED_REFERENCE']);
const controls = path.resolve(env[prefix + 'CONTROLS_REFERENCE']);
const widths = [[320,568],[390,844],[1280,900]];
const cases = ['puzzles-only','careers-only'];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const blob = bytes => createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex');
const bytes = (dir,file) => fs.readFileSync(path.join(dir,file));
const json = (dir,file) => JSON.parse(bytes(dir,file));
const tuple = (file,body) => ({file,bytes:body.length,sha256:sha(body)});
const ref = (dir,file) => tuple(file,bytes(dir,file));
const write = (file,body) => {
  const data = Buffer.isBuffer(body) ? body : Buffer.from(JSON.stringify(body,null,2) + '\n');
  const where = path.join(out,file);
  fs.mkdirSync(path.dirname(where),{recursive:true});
  fs.writeFileSync(where,data,{flag:'wx'});
  return tuple(file,data);
};
const eq = (actual,expected,label) => assert.deepEqual(actual,expected,label);
const sleep = ms => new Promise(resolve => setTimeout(resolve,ms));
async function waitFor(probe,label,limit=15000) {
  const end = Date.now() + limit;
  while (Date.now() < end) {
    if (await probe()) return;
    await sleep(40);
  }
  assert.fail(label);
}
function checkSource() {
  const source = json(full,'source-join.json'), unit = json(full,'unit-admission.json');
  const raw = json(full,'fixed-raw-join.json'), custody = json(full,'packet-custody.json');
  eq([out,fixed,controls],[path.join(full,'browser'),path.join(full,'fixed-reference'),path.join(full,'controls-reference')]);
  eq([source.status,source.head,source.trackedRows,source.sourceRows,source.heldFixedRows,source.rootConfigurations.length],
    ['passed',env.GITHUB_SHA,5797,4667,5795,11]);
  eq([source.pins[pageFile],source.pins[hookFile],source.helperBlob],
    [env[prefix+'PAGE_BLOB'],env[prefix+'HOOK_BLOB'],env[prefix+'HELPER']]);
  for (const [file,expect] of Object.entries({
    [pageFile]:env[prefix+'PAGE_BLOB'],[hookFile]:env[prefix+'HOOK_BLOB'],[helperFile]:env[prefix+'HELPER'],
    'src/data/transferPathPuzzles.ts':'de47215436238890cc573ed9080fcb176b89a3eb',
    'src/components/transfer-path/TransferPathBoard.tsx':'d5993545f48a198bf9e4a32ad181bad339ef366e',
    'src/lib/fetchTransferPathPuzzles.ts':'5cb9e10959b935207eec2e10880a87cf3abe4deb',
    'src/lib/fetchCareerPlayers.ts':'05ba3b3e7893599e3566f00e75ca05e80ab6e872',
  })) eq(blob(bytes('.',file)),expect,file);
  eq([unit.status,unit.actualCases,unit.actualPasses,unit.actualFailures,unit.wholeQualifiedFixedRAWBytesHeld,custody.status,raw.status,raw.freshUnitRAWByteEqual],
    ['passed',14,14,0,true,'passed','passed',true]);
  assert(bytes(full,'public-cases.raw.json').equals(bytes(fixed,'packet/fixed/public-cases.raw.json')));
  const built = json(full,'dist-before.json');
  eq([built.length,json(full,'tracked-before.json').length,json(full,'installed-before.json').length,bytes(full,'offline.log').length],[850,5797,521,0]);
  return {
    source:{head:source.head,tree:source.tree,trackedBodies:source.trackedRows,sourceRows:source.sourceRows,rootConfigurations:source.rootConfigurations.length,
      distBodies:built.length,installedVersions:521},
    inputs:{
      full:['source-join.json','unit-admission.json','fixed-raw-join.json','packet-custody.json','tracked-before.json','dist-before.json',
        'installed-before.json','public-cases.raw.json'].map(file=>ref(full,file)),
      fixed:['packet/admission.json','packet/fixed/public-cases.raw.json'].map(file=>ref(fixed,file)),
      controls:['packet/admission.json'].map(file=>ref(controls,file)),
    },
    built:new Map(built.map(row=>[row.file,row])),
  };
}
const input = checkSource();
const proof = {
  schema:1,status:'running',route,page:env[prefix+'PAGE_BLOB'],hook:env[prefix+'HOOK_BLOB'],helper:env[prefix+'HELPER'],
  fixedDate,day,source:input.source,inputs:input.inputs,fixtureBodies:{},journeys:widths.map(([width,height])=>({width,height,contexts:[]})),
};

const rolePaths = {puzzles:'/rest/v1/transfer_path_puzzles',players:'/rest/v1/career_players',seasons:'/rest/v1/career_seasons'};
const roles = Object.keys(rolePaths);
const completion = '/rest/v1/game_completions';
const query = {
  puzzles:{select:'puzzle_id,player_a,player_b,min_steps,hint,sort_order,active_min_steps,active_hint,europe_min_steps,europe_hint',
    order:'sort_order.asc',offset:'0',limit:'1000'},
  players:{select:'id,player_name,nationality,position',order:'player_name.asc'},
  seasons:{select:'player_id,season,club,goals,assists,appearances,market_value,sort_order',order:'player_id.asc,sort_order.asc',offset:'0',limit:'1000'},
};
const synthetic = {
  puzzles:[{puzzle_id:'fixture-provider-puzzle',player_a:'Fixture Provider First',player_b:'Fixture Provider Second',min_steps:1,
    hint:'Fixture provider route',sort_order:1,active_min_steps:null,active_hint:null,europe_min_steps:null,europe_hint:null}],
  players:[
    {id:'00000000-0000-4000-8000-000000000001',player_name:'Fixture Provider First',nationality:'Fixture Nation',position:'CM'},
    {id:'00000000-0000-4000-8000-000000000002',player_name:'Fixture Provider Second',nationality:'Fixture Nation',position:'CM'},
  ],
  seasons:['00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002'].map(player_id=>({
    player_id,season:'2020-2021',club:'Fixture Provider Club',goals:0,assists:0,appearances:1,market_value:1,sort_order:1,
  })),
};
const useRows = (scenario,role) => (scenario==='puzzles-only') === (role==='puzzles') ? synthetic[role] : [];
const expectedSave = JSON.stringify({v:1,date:day,puzzleIndex:0,puzzleId:'tp-1',guesses:[{t:'give'}],gameStatus:'lost'});
const dailyPath = ['Zlatan Ibrahimović','Wayne Rooney'];
const unlimitedPath = ['Lionel Messi','Neymar'];
const nextPath = ['Andrea Pirlo','Cristiano Ronaldo'];
const mainSelector = '#root main#dukb-main';
const revealTitle = "Here's a path that works";
const noRoute = 'No connecting path exists in the current player pool.';
const copy = row => ({
  id:row.id,case:row.case,status:row.status,frames:row.frames.map(frame=>frame.label),actions:row.actions.length,
  providerResponses:row.wire.filter(item=>item.outcome==='local-provider').length,
  completionAttempts:row.wire.filter(item=>item.outcome==='aborted-completion').length,
  localResponses:row.local.length,navigations:row.navigations.length,screenshots:row.screenshots,errors:row.errors,
});

function localFile(url) {
  const pathname = decodeURIComponent(url.pathname);
  if (pathname==='/' || pathname==='/index.html') return 'dist/index.html';
  if (pathname===route || pathname===route+'/' || pathname===route+'/index.html') return 'dist/transfer-path/index.html';
  assert(pathname.startsWith('/') && !pathname.includes('\\') && path.posix.normalize(pathname)===pathname,'Safe static path');
  return 'dist' + pathname;
}
function checkProviderQuery(url,role) {
  eq([...url.searchParams].sort(),Object.entries(query[role]).sort(),role+' exact SDK query');
}
function webRead(url,method,forMethod) {
  const read = ['GET','HEAD'].includes(method) || method==='OPTIONS' && ['GET','HEAD'].includes(forMethod);
  return read && ['https:','http:'].includes(url.protocol);
}
async function play(browser,base,journey,scenario) {
  const {width,height}=journey;
  const id=width+'-'+scenario;
  const row={id,case:scenario,status:'running',frames:[],actions:[],wire:[],local:[],navigations:[],screenshots:[],errors:[]};
  journey.contexts.push(row);
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,timezoneId:'UTC',serviceWorkers:'block'});
  const jobs=new Set();
  const error=e=>row.errors.push(String(e.stack||e));
  const track=p=>{
    jobs.add(p);
    p.catch(error).finally(()=>jobs.delete(p));
  };
  let page;
  try {
    await context.routeWebSocket('**/*',socket=>{ error(new Error('Unexpected WebSocket')); socket.close(); });
    await context.route('**/*',routeHandler=>{
      const handling=(async()=>{
      try {
        const request=routeHandler.request(), url=new URL(request.url()), method=request.method();
        const headers=request.headers(), forMethod=headers['access-control-request-method']??null;
        const body=request.postDataBuffer()?.toString('utf8')??null;
        if (url.origin===base) {
          assert(['GET','HEAD'].includes(method)&&body===null&&input.built.has(localFile(url)),'Local static-only transport');
          await routeHandler.continue();
          return;
        }
        const record={url:url.href,method,forMethod,body,outcome:'blocked-read'};
        row.wire.push(record);
        const role=url.origin===backend ? roles.find(role=>rolePaths[role]===url.pathname) : undefined;
        const complete=url.origin===backend&&url.pathname===completion&&!url.search&&(method==='POST'||forMethod==='POST');
        if (role) {
          checkProviderQuery(url,role);
          assert(method==='GET'||method==='OPTIONS'&&forMethod==='GET');
          eq(body,null);
        }
        if ((role||complete) && method==='OPTIONS') {
          record.outcome='local-cors'; record.role=role??'completion';
          await routeHandler.fulfill({status:204,headers:{'access-control-allow-origin':base,
            'access-control-allow-methods':forMethod+',OPTIONS','access-control-allow-headers':headers['access-control-request-headers']??''}});
          return;
        }
        if (role) {
          assert.equal(row.wire.filter(item=>item.role===role&&item.outcome==='local-provider').length,0);
          const fixture=proof.fixtureBodies[scenario][role];
          record.outcome='local-provider'; record.role=role; record.response=fixture;
          await routeHandler.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':base},body:bytes(out,fixture.file)});
          return;
        }
        if (complete) {
          const payload=JSON.parse(body);
          eq(Object.keys(payload).sort(),['game','player_name','score']);
          eq([payload.game,payload.score],['transfer-path',0]);
          assert(typeof payload.player_name==='string'&&payload.player_name.length>0);
          record.outcome='aborted-completion'; record.role='completion';
          await routeHandler.abort();
          return;
        }
        await routeHandler.abort();
        assert(webRead(url,method,forMethod)&&body===null,'Unexpected blocked external method '+method+' '+url.origin+url.pathname);
      } catch (e) {
        error(e);
        await routeHandler.abort().catch(()=>{});
      }
      })();
      track(handling);
      return handling;
    });
    page=await context.newPage();
    page.on('pageerror',error);
    page.on('framenavigated',frame=>{
      if(frame===page.mainFrame()) row.navigations.push({url:frame.url(),at:Date.now()});
    });
    page.on('response',response=>{
      const url=new URL(response.url());
      if(url.origin!==base||response.request().method()!=='GET')return;
      track((async()=>{
        const file=localFile(url);
        assert.equal(response.status(),200);
        const received=tuple(file,await response.body());
        eq(received,input.built.get(file),response.url()+' built body');
        row.local.push({url:url.href,...received});
      })());
    });
    await page.clock.setFixedTime(new Date(fixedDate));
    await page.addInitScript(()=>{
      window.__transferPathQAEvents=[];
      document.addEventListener('click',e=>{
        const target=e.target instanceof Element ? e.target.closest('button') : null;
        window.__transferPathQAEvents.push({trusted:e.isTrusted,button:target!==null,
          name:target?.getAttribute('aria-label')??target?.textContent?.replace(/\s+/g,' ').trim()??null,
          x:e.clientX,y:e.clientY,url:location.href});
      },true);
    });
    const click=async(locator,label,name)=>{
      const before=await page.evaluate(()=>window.__transferPathQAEvents.length);
      await locator.click({timeout:15000});
      const events=await page.evaluate(from=>window.__transferPathQAEvents.slice(from),before);
      eq(events.length,1,label);
      const event=events[0];
      eq([event.trusted,event.button,event.name,event.url],[true,true,name,base+route],label);
      assert(event.x>=0&&event.x<width&&event.y>=0&&event.y<height,label+' viewport click');
      row.actions.push({label,name,event});
    };
    const main=page.locator(mainSelector);
    const button=(name,scope=main)=>scope.getByRole('button',{name,exact:true});
    const capture=async label=>{
      const state=await page.evaluate(({mainSelector,revealTitle,noRoute})=>{
        const main=document.querySelector(mainSelector);
        if(!main) throw Error('Missing real game main');
        const ps=[...main.querySelectorAll('p')];
        const txt=node=>node?.textContent?.replace(/\s+/g,' ').trim()??null;
        const target=ps.find(p=>txt(p)==='Connect')?.parentElement;
        const reveal=ps.find(p=>txt(p)===revealTitle)?.parentElement;
        const mode=ps.map(txt).find(value=>value?.includes('Daily Challenge')||value?.includes('Unlimited #'))??null;
        const local=Object.fromEntries(Object.keys(localStorage).sort().map(key=>[key,localStorage.getItem(key)]));
        return {
          url:location.href,date:Date.now(),et:new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York'}).format(new Date()),
          mode,endpoints:[...(target?.querySelectorAll('p.font-bold')??[])].map(txt),
          optimal:txt([...target?.querySelectorAll('p')??[]].find(p=>txt(p)?.startsWith('Optimal:'))),
          selected:[...main.querySelectorAll('[aria-label="Special rules"] button[aria-pressed="true"]')].map(txt),
          blocked:ps.some(p=>txt(p)?.includes("Today's pair has no route under Active players only")),
          reveal:reveal?[...reveal.querySelectorAll('span.truncate')].map(txt):null,
          clubs:reveal?[...reveal.querySelectorAll('span.italic')].map(txt):null,
          noRoute:reveal?.textContent?.includes(noRoute)??false,storage:local,html:main.outerHTML,
        };
      },{mainSelector,revealTitle,noRoute});
      eq([state.url,state.date,state.et],[base+route,Date.parse(fixedDate),day],label);
      row.frames.push({label,...state});
      return state;
    };
    const give=async phase=>{
      await click(button('Give up and see a path'),'open-'+phase+'-confirm','Give up and see a path');
      await click(button('Yes, reveal it'),'confirm-'+phase,'Yes, reveal it');
      await main.getByText(revealTitle,{exact:true}).waitFor({state:'visible'});
    };
    const photo=async phase=>{
      await main.getByText(revealTitle,{exact:true}).scrollIntoViewIfNeeded();
      const image=await page.screenshot({caret:'initial',fullPage:false});
      row.screenshots.push({phase,...write('png/'+id+'-'+phase+'.png',image)});
    };
    const board=(state,mode,endpoints,selected,optimal,reveal,clubs,save)=>{
      assert(state.mode?.includes(mode));
      eq([state.endpoints,state.selected,state.optimal,state.reveal,state.clubs,state.noRoute,state.storage[saveKey]??null],
        [endpoints,[selected],optimal,reveal,clubs,false,save]);
    };
    await page.goto(base+route,{waitUntil:'domcontentloaded',timeout:25000});
    await click(button('Reject all',page.getByRole('region',{name:'Cookie choices',exact:true})),'reject-cookies','Reject all');
    await button('Give up and see a path').waitFor({state:'visible',timeout:20000});
    await click(button('How to play',main.locator('header')),'open-help','How to play');
    const dialog=page.getByRole('dialog',{name:'How to Play Transfer Path',exact:true});
    await dialog.waitFor({state:'visible'});
    await click(button("Let's Play!",dialog),'close-help',"Let's Play!");
    await dialog.waitFor({state:'hidden'});
    board(await capture('daily-ready'),'Daily Challenge',dailyPath,'Everyday','Optimal: 1 step',null,null,null);
    await click(button('Active players only'),'pick-active','Active players only');
    await button('Play unlimited under Active players only').waitFor({state:'visible'});
    const blocked=await capture('daily-active-blocked');
    board(blocked,'Daily Challenge',dailyPath,'Active players only','Optimal: 1 step',null,null,null);
    assert(blocked.blocked);
    await give('daily');
    board(await capture('daily-reveal'),'Daily Challenge',dailyPath,'Active players only','Optimal: 1 step',dailyPath,['Manchester United'],expectedSave);
    await photo('daily');
    await click(button('Play unlimited under Active players only'),'open-unlimited','Play unlimited under Active players only');
    board(await capture('unlimited-active'),'Unlimited #1',unlimitedPath,'Active players only','Optimal: 1 step under Active players only',null,null,expectedSave);
    await click(button('Everyday'),'pick-everyday','Everyday');
    board(await capture('unlimited-ready'),'Unlimited #1',unlimitedPath,'Everyday','Optimal: 1 step',null,null,expectedSave);
    await give('unlimited');
    board(await capture('unlimited-reveal'),'Unlimited #1',unlimitedPath,'Everyday','Optimal: 1 step',unlimitedPath,['Barcelona'],expectedSave);
    await photo('unlimited');
    await click(button('Next Puzzle'),'next-unlimited','Next Puzzle');
    board(await capture('unlimited-next'),'Unlimited #2',nextPath,'Everyday','Optimal: 2 steps',null,null,expectedSave);
    await waitFor(()=>row.wire.filter(item=>item.outcome==='aborted-completion').length===1&&jobs.size===0,'Closed completion and local response receipts');
    eq(row.wire.filter(item=>item.outcome==='local-provider').map(item=>item.role).sort(),[...roles].sort());
    assert(row.local.some(item=>item.url===base+route&&item.file==='dist/transfer-path/index.html'));
    assert(row.local.some(item=>/^dist\/assets\/TransferPath-.*\.js$/.test(item.file)),'Actual lazy Transfer Path chunk');
    assert(row.navigations.length>0&&row.navigations.every(item=>item.url===base+route),'Actual route navigation');
    eq(row.errors,[]);
    row.status='passed';
  } catch(e) {
    error(e);row.status='failed';throw e;
  } finally {
    await context.close();
    await Promise.allSettled([...jobs]);
    if(row.errors.length) row.status='failed';
  }
}

async function serve() {
  const reserve=createServer();
  await new Promise((resolve,reject)=>{reserve.once('error',reject);reserve.listen(0,'127.0.0.1',resolve);});
  const port=reserve.address().port;
  await new Promise((resolve,reject)=>reserve.close(e=>e?reject(e):resolve()));
  const host=spawn(process.execPath,['scripts/lib/hostLikeServer.mjs','dist',String(port)],{stdio:['ignore','pipe','pipe']});
  let stdout='',stderr='';
  host.stdout.on('data',data=>{stdout+=String(data);});
  host.stderr.on('data',data=>{stderr+=String(data);});
  host.on('error',e=>{stderr+=String(e);});
  return {host,base:'http://127.0.0.1:'+port,ready:()=>waitFor(()=>stdout.includes('host-like server:')||host.exitCode!==null,
    'Physical dist host did not start').then(()=>assert(host.exitCode===null,'Physical dist host exited: '+stderr))};
}

let host,browser;
try {
  fs.mkdirSync(out,{recursive:false});
  for(const scenario of cases) {
    proof.fixtureBodies[scenario]=Object.fromEntries(roles.map(role=>[role,write('fixtures/'+scenario+'-'+role+'.json',useRows(scenario,role))]));
  }
  const server=await serve();
  host=server.host;proof.base=server.base;
  await server.ready();
  browser=await chromium.launch({headless:true});
  proof.chromium=browser.version();
  const results=await Promise.allSettled(proof.journeys.flatMap(journey=>cases.map(scenario=>play(browser,proof.base,journey,scenario))));
  const failed=results.find(result=>result.status==='rejected');
  if(failed)throw failed.reason;
  assert(proof.journeys.every(journey=>journey.contexts.length===2&&journey.contexts.every(row=>row.status==='passed')));
  eq(bytes(full,'offline.log').length,0);
  proof.status='passed';
} catch(e) {
  proof.status='failed';proof.error=String(e.stack||e);
} finally {
  if(browser)await browser.close();
  if(host)host.kill();
  const contexts=proof.journeys.flatMap(journey=>journey.contexts);
  const count=f=>contexts.reduce((sum,row)=>sum+f(row),0);
  proof.census={
    journeys:proof.journeys.length,contexts:contexts.length,viewportPNGs:count(row=>row.screenshots.length),
    frames:count(row=>row.frames.length),trustedClicks:count(row=>row.actions.length),
    providerResponses:count(row=>row.wire.filter(item=>item.outcome==='local-provider').length),
    completionAttempts:count(row=>row.wire.filter(item=>item.outcome==='aborted-completion').length),
    navigations:count(row=>row.navigations.length),localResponses:count(row=>row.local.length),
    corsPreflights:count(row=>row.wire.filter(item=>item.outcome==='local-cors').length),
    blockedReads:count(row=>row.wire.filter(item=>item.outcome==='blocked-read').length),
  };
  const raw=write('raw.json',proof);
  const report=write('report.json',{...proof,raw,journeys:proof.journeys.map(journey=>({...journey,contexts:journey.contexts.map(copy)}))});
  const evidence=[raw,report,...Object.values(proof.fixtureBodies).flatMap(Object.values),
    ...contexts.flatMap(row=>row.screenshots.map(({phase,...row})=>row))].sort((a,b)=>a.file.localeCompare(b.file));
  write('body-manifest.json',evidence);
}
assert.equal(proof.status,'passed',proof.error);
console.log('TRANSFER_PATH_PAIRED_POOLS_NATIVE',JSON.stringify(proof.census));
