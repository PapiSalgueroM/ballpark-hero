// Bounded Actions-only evidence for the built CFB Dynasty route.
import '../lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { build } from 'esbuild';
import { chromium } from 'playwright';

const env = process.env;
const prefix = 'CFB_DYNASTY_LOW_SCORE_';
const route = '/cfb-dynasty';
const saveKey = 'cfb-dynasty-save-v1';
const product = 'src/lib/cfbDynasty.ts';
const helper = 'scripts/qa/playCfbDynastyLowScore.mjs';
const productBlob = env[prefix + 'PRODUCT_BLOB'];
const helperBlob = env[prefix + 'HELPER_BLOB'];
const full = path.resolve(env[prefix + 'FULL_UNIT']);
const out = path.resolve(env[prefix + 'BROWSER_OUT']);
const widths = [[320,568],[390,844],[1280,900]];
const seed = 539004;
const cutoff = 0.0175;
const scenarios = [
  { key:'ordinary', loserDraw:0.03, expectedScore:2 },
  { key:'below-cutoff', loserDraw:cutoff - 2 ** -58, expectedScore:0 },
];
const equal = (actual, expected, label) => assert.deepEqual(actual, expected, label);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const blob = bytes => createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex');
const read = (dir, file) => fs.readFileSync(path.join(dir,file));
const json = (dir, file) => JSON.parse(read(dir,file));
const tuple = (file, bytes) => ({ file, bytes:bytes.length, sha256:sha(bytes) });
const write = (file, body) => {
  const bytes = Buffer.isBuffer(body) ? body : Buffer.from(JSON.stringify(body,null,2) + '\n');
  const where = path.join(out,file);
  fs.mkdirSync(path.dirname(where), { recursive:true });
  fs.writeFileSync(where,bytes,{ flag:'wx' });
  return tuple(file,bytes);
};
const nap = ms => new Promise(resolve => setTimeout(resolve,ms));
async function waitFor(test,label,limit=15000) {
  const end = Date.now() + limit;
  while (Date.now() < end) {
    if (await test()) return;
    await nap(40);
  }
  assert.fail(label);
}

assert.equal(out,path.join(full,'browser'));
assert([productBlob,helperBlob].every(value=>/^[a-f0-9]{40}$/.test(value)));
const productPins = {
  [product]:productBlob,
  [helper]:helperBlob,
  'src/pages/CfbDynasty.tsx':'c0335415465e24e9b067611580aaf985f86681cd',
  'src/components/cfb-dynasty/CfbDynastyBoard.tsx':'85786118b430b07ab9a56d69bf7dfa326d4acde5',
  'src/components/college-dynasty/CollegeDynastyBoard.tsx':'91ee2a06e96f8352384a8587e37aba9a8db48f94',
  'src/lib/cfbSeatBind.ts':'bbea4d0863097b80cd7cfd6ea1ce6da765cfd84b',
  'src/lib/collegeSeatBind.ts':'a97d6f349f5a1a575940412a1cbd472af89ff68e',
  'src/lib/collegeProgram.ts':'12688e52d0745701a59d61c37879a23146be9d78',
  'scripts/lib/hostLikeServer.mjs':'21059d5e8114669df61106c125d5272d357b6236',
};
for (const [file, want] of Object.entries(productPins)) equal(blob(read('.',file)),want,file);
const source = json(full,'source-join.json');
const unit = json(full,'unit-admission.json');
const dist = json(full,'dist-before.json');
equal([source.status,source.head,source.pins[product],source.helperBlob,unit.status,unit.actualCases,unit.actualPasses,unit.actualFailures],
  ['passed',env.GITHUB_SHA,productBlob,helperBlob,'passed',13,13,0]);
assert.equal(dist.length,850);
assert.equal(json(full,'installed-before.json').length,521);
assert.equal(read(full,'offline.log').length,0);
const built = new Map(dist.map(row=>[row.file,row]));
assert.equal(built.size,dist.length);
const sourceRefs = ['source-join.json','unit-admission.json','dist-before.json','installed-before.json']
  .map(file=>tuple(file,read(full,file)));

function drawsFor(loserDraw) {
  return [0,0.01,loserDraw,...Array.from({length:21},()=>[0,0.625,0.32]).flat()];
}

async function seedFixture() {
  const result = await build({
    stdin:{
      contents:[
        "export { CFB_SCHOOL_MAP, initCfb, simCfbRound, ensureCfbIds, ensureCfbSlate } from './src/lib/cfbDynasty.ts';",
        "export { cfbSeatBinding } from './src/lib/cfbSeatBind.ts';",
        "export { startCollegeSeat, collegeSeatFirstPress, collegeSeatOnLoad } from './src/lib/collegeSeatBind.ts';",
      ].join('\n'),
      resolveDir:process.cwd(), sourcefile:'cfb-native-fixture.ts', loader:'ts',
    },
    bundle:true, platform:'node', format:'esm', write:false, tsconfig:'tsconfig.app.json',
  });
  assert.equal(result.outputFiles.length,1);
  const bundle = result.outputFiles[0].contents;
  const api = await import('data:text/javascript;base64,' + Buffer.from(bundle).toString('base64'));
  let state = seed, kickoffDraws = 0;
  const st = api.initCfb('ND',()=>{
    state = (Math.imul(state,1664525) + 1013904223) >>> 0;
    kickoffDraws++;
    return state / 4294967296;
  },{depth:true});
  equal([st.myTeam,st.season,st.round,st.depth,st.format,kickoffDraws],['ND',2026,1,1,1,3432]);
  assert.equal(st.slate.rounds.length,12);
  assert.equal(st.slate.rounds[0].length,22);
  equal(st.slate.rounds[0][0],['ND','VT']);
  for (const team of Object.values(st.teams)) {
    assert(team.staff?.OC && team.staff?.DC);
    team.staff.OC.rating = team.id === 'VT' ? 60 : 70;
    team.staff.DC.rating = 70;
  }
  api.startCollegeSeat(st,api.cfbSeatBinding);
  const encode = state => JSON.stringify({st:state,phase:'season',recruits:null,portal:null,postseason:null});
  const save = encode(st);
  const expectations = {};
  const label = id => api.CFB_SCHOOL_MAP.get(id).name;
  for (const scenario of scenarios) {
    const restored = JSON.parse(save).st;
    api.ensureCfbIds(restored,null,null);
    api.ensureCfbSlate(restored);
    assert([null,'season'].includes(api.collegeSeatOnLoad(restored,'season',api.cfbSeatBinding)));
    api.collegeSeatFirstPress(restored,api.cfbSeatBinding);
    const planned = drawsFor(scenario.loserDraw);
    let draws = 0;
    const { games, myGame } = api.simCfbRound(restored,()=>planned[draws++]);
    equal([games.length,draws,myGame.home,myGame.away,myGame.winner,myGame.hs,myGame.as],
      [22,66,'ND','VT','ND',24,scenario.expectedScore]);
    equal(restored.mySlate,[{round:1,opp:'VT',home:true,us:24,them:scenario.expectedScore,won:true,conference:false,rivalry:false}]);
    restored.round++;
    expectations[scenario.key] = {
      games,
      feed:'✅ Week 1: beat Virginia Tech 24-' + scenario.expectedScore + '.',
      around:games.map(game=>label(game.winner)+' beat '+label(game.winner===game.home?game.away:game.home)+' '+Math.max(game.hs,game.as)+'-'+Math.min(game.hs,game.as)),
      save:encode(restored),
    };
  }
  return {save,expectations,kickoffDraws,bundleSHA256:sha(bundle)};
}

function localFile(url) {
  const name = decodeURIComponent(url.pathname);
  if (name === '/' || name === '/index.html') return 'dist/index.html';
  if (name === route || name === route + '/' || name === route + '/index.html') return 'dist/cfb-dynasty/index.html';
  assert(name.startsWith('/') && !name.includes('\\') && path.posix.normalize(name) === name,'Exact safe built path');
  return 'dist' + name;
}

async function serve() {
  const reserve = createServer();
  await new Promise((resolve,reject)=>{reserve.once('error',reject);reserve.listen(0,'127.0.0.1',resolve);});
  const port = reserve.address().port;
  await new Promise((resolve,reject)=>reserve.close(error=>error?reject(error):resolve()));
  const host = spawn(process.execPath,['scripts/lib/hostLikeServer.mjs','dist',String(port)],{stdio:['ignore','pipe','pipe']});
  let ready = false, errors = '';
  host.stdout.on('data',body=>{if(String(body).includes('host-like server:'))ready=true;});
  host.stderr.on('data',body=>{errors+=String(body);});
  host.on('error',error=>{errors+=String(error);});
  return {
    host, base:'http://127.0.0.1:'+port,
    wait:async()=>{
      await waitFor(()=>ready||host.exitCode!==null||errors,'Physical dist host startup');
      assert(ready&&host.exitCode===null,errors);
    },
  };
}

async function play(browser, base, fixture, journey, scenario) {
  const { width,height } = journey;
  const id = width + '-' + scenario.key;
  const expected = fixture.expectations[scenario.key];
  const row = {id,scenario,status:'running',frames:[],actions:[],navigations:[],local:[],blocked:[],errors:[],screenshot:null};
  journey.contexts.push(row);
  const context = await browser.newContext({
    viewport:{width,height},deviceScaleFactor:1,timezoneId:'UTC',serviceWorkers:'block',
    storageState:{cookies:[],origins:[{origin:base,localStorage:[{name:saveKey,value:fixture.save}]}]},
  });
  const pending = new Set();
  const recordError = error=>row.errors.push(String(error?.stack??error));
  const track = task=>{
    pending.add(task);
    task.catch(recordError).finally(()=>pending.delete(task));
    return task;
  };
  try {
    await context.routeWebSocket('**/*',socket=>{recordError('Unexpected WebSocket');socket.close();});
    await context.route('**/*',handler=>track((async()=>{
      const req = handler.request();
      const url = new URL(req.url());
      const method = req.method();
      const forMethod = req.headers()['access-control-request-method'] ?? null;
      if (url.origin === base) {
        assert(['GET','HEAD'].includes(method) && req.postData() === null && built.has(localFile(url)),'Local built read only');
        return handler.continue();
      }
      const isRead = ['GET','HEAD'].includes(method) || method === 'OPTIONS' && ['GET','HEAD'].includes(forMethod);
      row.blocked.push({url:url.href,method,forMethod,outcome:isRead?'external-read-aborted':'external-nonread-aborted'});
      await handler.abort();
      assert(isRead && req.postData() === null,'Unexpected external nonread attempt '+method+' '+url.origin+url.pathname);
    })().catch(async error=>{
      recordError(error);
      await handler.abort().catch(()=>{});
    })));
    const page = await context.newPage();
    page.on('pageerror',recordError);
    page.on('framenavigated',frame=>{
      if(frame===page.mainFrame())row.navigations.push(frame.url());
    });
    page.on('response',response=>{
      const req = response.request(), url = new URL(response.url());
      if (url.origin !== base || req.method() !== 'GET') return;
      track((async()=>{
        const file = localFile(url);
        assert.equal(response.status(),200);
        const received = tuple(file,await response.body());
        equal(received,built.get(file),response.url()+' exact built bytes');
        row.local.push({url:url.href,type:req.resourceType(),...received});
      })());
    });
    await page.addInitScript(({origin,route,planned})=>{
      if(location.origin!==origin||location.pathname!==route)return;
      const qa = window.__cfbLowScoreQA = {clicks:[],rng:null,issues:[]};
      document.addEventListener('click',event=>{
        const target = event.target instanceof Element ? event.target.closest('button') : null;
        const name = target?.getAttribute('aria-label') ?? target?.textContent?.replace(/\s+/g,' ').trim() ?? null;
        qa.clicks.push({name,trusted:event.isTrusted,x:event.clientX,y:event.clientY});
        if(!event.isTrusted || name!=='Play Week 1' || !target?.closest('main#dukb-main')) return;
        if(qa.rng!==null){qa.issues.push('Second trusted Week 1 press');return;}
        const prior = Math.random;
        const state = qa.rng = {draws:[],restored:false,restoredBy:null};
        const scoped = ()=>{
          const value = planned[state.draws.length] ?? prior();
          state.draws.push(value);
          return value;
        };
        const restore = reason=>{
          window.removeEventListener('click',bubble);
          clearTimeout(failsafe);
          if(Math.random!==scoped)qa.issues.push('Unexpected RNG owner within trusted action');
          Math.random = prior;
          state.restored = Math.random===prior;
          state.restoredBy = reason;
        };
        const bubble = next=>{if(next===event)restore('window-bubble');};
        window.addEventListener('click',bubble);
        // A stopped click must still give the browser its RNG back.
        const failsafe = setTimeout(()=>restore('timeout'),0);
        Math.random = scoped;
      },true);
    },{origin:base,route,planned:drawsFor(scenario.loserDraw)});

    const main = page.locator('main#dukb-main');
    const button = (name, scope=main)=>scope.getByRole('button',{name,exact:true});
    const routeURL = base + route;
    const go = async(name,locator=button(name))=>{
      const before = await page.evaluate(()=>window.__cfbLowScoreQA.clicks.length);
      await locator.click({timeout:15000});
      const taps = await page.evaluate(n=>window.__cfbLowScoreQA.clicks.slice(n),before);
      equal(taps.length,1,name+' exact native click');
      const [click] = taps;
      equal([click.name,click.trusted],[name,true]);
      assert(click.x>=0&&click.x<width&&click.y>=0&&click.y<height,name+' click inside viewport');
      row.actions.push({name,click});
    };
    const capture = async label=>{
      const body = await page.evaluate(({saveKey})=>{
        const main=document.querySelector('main#dukb-main');
        const norm=node=>node?.textContent?.replace(/\s+/g,' ').trim()??null;
        const heading=[...main.querySelectorAll('p')].find(p=>norm(p)==='Around the country');
        const list=heading?.nextElementSibling;
        const schedule=[...main.querySelectorAll('span')].find(s=>norm(s)==='W1 vs Virginia Tech (non-conf)');
        return {
          url:location.href,html:main.outerHTML,save:localStorage.getItem(saveKey),
          feed:[...main.querySelectorAll('p')].map(norm).filter(line=>line?.startsWith('✅ Week 1:')),
          around:list?[...list.querySelectorAll(':scope > p')].map(norm):[],
          schedule:schedule?norm(schedule.parentElement.lastElementChild):null,
          rng:window.__cfbLowScoreQA.rng,issues:window.__cfbLowScoreQA.issues,
        };
      },{saveKey});
      equal([body.url,body.issues],[routeURL,[]]);
      row.frames.push({label,...body});
      return body;
    };

    await page.goto(routeURL,{waitUntil:'domcontentloaded',timeout:25000});
    await button('Play').waitFor({state:'visible',timeout:20000});
    const reject = button('Reject all',page.getByRole('region',{name:'Cookie choices',exact:true}));
    row.consent = await reject.isVisible() ? 'rejected' : 'absent at board ready';
    if(row.consent==='rejected') {
      await go('Reject all',reject);
      await reject.waitFor({state:'hidden'});
    }
    const first = await capture('ready');
    equal([first.save,first.rng],[fixture.save,null]);
    await go('Play');
    await button('Play Week 1').waitFor({state:'visible'});
    await go('Play Week 1');
    await button('Play Week 2').waitFor({state:'visible'});
    await main.getByText(expected.feed,{exact:true}).waitFor({state:'visible'});
    const played = await capture('played');
    equal([played.feed,played.around,played.save,played.rng],
      [[expected.feed],expected.around,expected.save,{draws:drawsFor(scenario.loserDraw),restored:true,restoredBy:'window-bubble'}]);
    const persisted = JSON.parse(played.save);
    equal([persisted.phase,persisted.st.round,persisted.st.mySlate.length,persisted.st.mySlate[0].us,persisted.st.mySlate[0].them],
      ['season',2,1,24,scenario.expectedScore]);
    const score = 'W 24-' + scenario.expectedScore;
    await go('Schedule');
    const result = main.getByText(score,{exact:true});
    await result.waitFor({state:'visible'});
    const schedule = await capture('scheduled');
    equal([schedule.schedule,schedule.save,schedule.rng],[score,played.save,played.rng]);
    await result.scrollIntoViewIfNeeded();
    const box = await result.boundingBox();
    assert(box && box.x>=0 && box.y>=0 && box.x+box.width<=width && box.y+box.height<=height,'Score fully inside screenshot viewport');
    row.screenshot = write('png/'+id+'.png',await page.screenshot({caret:'initial',fullPage:false}));
    await page.reload({waitUntil:'domcontentloaded',timeout:25000});
    await button('Schedule').waitFor({state:'visible',timeout:20000});
    await go('Schedule');
    await result.waitFor({state:'visible'});
    await main.getByText('2026 · Week 2/12',{exact:true}).waitFor({state:'visible'});
    const reloaded = await capture('reloaded');
    equal([reloaded.schedule,reloaded.save,reloaded.rng,reloaded.feed,reloaded.around],[score,played.save,null,[],[]]);
    row.saved = write('saves/'+id+'.json',Buffer.from(played.save));
    await waitFor(()=>pending.size===0,'Closed native request and built body evidence');
    equal(row.local.filter(req=>req.type==='document').map(req=>[req.url,req.file]),
      [[routeURL,'dist/cfb-dynasty/index.html'],[routeURL,'dist/cfb-dynasty/index.html']]);
    assert(row.local.some(req=>/^dist\/assets\/CfbDynasty-.*\.js$/.test(req.file)),'Actual lazy CfbDynasty module response');
    assert(row.navigations.length>=2&&row.navigations.every(url=>url===routeURL),'Actual route and reload notifications');
    equal(row.blocked.filter(req=>req.outcome==='external-nonread-aborted'),[]);
    equal(row.errors,[]);
    row.status='passed';
  } catch(error) {
    recordError(error);
    row.status='failed';
    throw error;
  } finally {
    await context.close();
    await Promise.allSettled([...pending]);
    if(row.errors.length)row.status='failed';
  }
}

const raw = {
  schema:1,status:'running',route,head:source.head,tree:source.tree,product:productBlob,helper:helperBlob,productPins,sourceRefs,
  seed,cutoff,journeys:widths.map(([width,height])=>({width,height,contexts:[]})),
};
let host,browser;
try {
  fs.mkdirSync(out,{recursive:false});
  const fixture = await seedFixture();
  raw.seedSave=write('saves/seed.json',Buffer.from(fixture.save));
  raw.kickoffDraws=fixture.kickoffDraws;
  raw.bundleSHA256=fixture.bundleSHA256;
  raw.engineExpectations=Object.fromEntries(scenarios.map(row=>[row.key,{games:fixture.expectations[row.key].games,saveSHA256:sha(fixture.expectations[row.key].save)}]));
  const server = await serve();
  host=server.host;
  raw.base=server.base;
  await server.wait();
  browser=await chromium.launch({headless:true});
  raw.chromium=browser.version();
  const results=await Promise.allSettled(raw.journeys.flatMap(journey=>scenarios.map(scenario=>play(browser,server.base,fixture,journey,scenario))));
  const failed=results.find(result=>result.status==='rejected');
  if(failed)throw failed.reason;
  assert(raw.journeys.every(journey=>journey.contexts.length===2&&journey.contexts.every(row=>row.status==='passed')));
  equal(read(full,'offline.log').length,0);
  raw.status='passed';
} catch(error) {
  raw.status='failed';
  raw.error=String(error?.stack??error);
} finally {
  if(browser)await browser.close();
  if(host)host.kill();
  const contexts=raw.journeys.flatMap(journey=>journey.contexts);
  const count=pick=>contexts.reduce((sum,row)=>sum+pick(row),0);
  raw.census={
    journeys:raw.journeys.length,contexts:contexts.length,frames:count(row=>row.frames.length),
    trustedClicks:count(row=>row.actions.length),roundDraws:count(row=>row.frames.find(frame=>frame.label==='played')?.rng?.draws.length??0),
    documents:count(row=>row.local.filter(req=>req.type==='document').length),viewportPNGs:count(row=>Number(Boolean(row.screenshot))),
    navigations:count(row=>row.navigations.length),localResponses:count(row=>row.local.length),blockedReads:count(row=>row.blocked.length),
  };
  const rawRef=write('raw.json',raw);
  const reportRef=write('report.json',{
    status:raw.status,route,head:raw.head,tree:raw.tree,product:productBlob,helper:helperBlob,census:raw.census,raw:rawRef,
    contexts:contexts.map(row=>({id:row.id,case:row.scenario.key,status:row.status,consent:row.consent,
      frames:row.frames.map(frame=>frame.label),clicks:row.actions.length,score:row.scenario.expectedScore,
      screenshot:row.screenshot,saved:row.saved,errors:row.errors})),
  });
  const bodies=[rawRef,reportRef,raw.seedSave,...contexts.flatMap(row=>[row.screenshot,row.saved])].filter(Boolean);
  write('body-manifest.json',bodies.sort((a,b)=>a.file.localeCompare(b.file)));
}
assert.equal(raw.status,'passed',raw.error);
console.log('CFB_DYNASTY_LOW_SCORE_NATIVE',JSON.stringify(raw.census));
