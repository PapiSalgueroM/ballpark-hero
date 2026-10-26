import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '../lib/playwrightLoader.mjs';
import { BACKEND, inventory, loadFonts, seed, sha, checkFonts } from './siteMenuNavigationSupport.mjs';

async function main() {
const out = process.env.WORLD_XI_OUT;
assert(out && fs.statSync(out).isDirectory(), 'WORLD_XI_BROWSER_SETUP: existing evidence directory');
const base = 'http://127.0.0.1:4173';
const files = new Set(inventory('dist').map(row => '/' + row.file));
const fonts = loadFonts(process.env.FREE_KICK_FONT_CACHE, process.env.FONT_CACHE_MANIFEST_SHA256);
const nations = ['Argentina', 'Brazil', 'France', 'Germany', 'Spain', 'England', 'Portugal', 'Netherlands', 'Belgium', 'Croatia', 'Morocco', 'Japan'];
const sparse = 'AAA Fixture Keeper';
const positions = ['GK', 'GK', 'CB', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'RW', 'LW', 'ST', 'CF'];
const rows = [];
for (const country of [sparse, ...nations]) {
  const roles = country === sparse ? ['GK'] : Array.from({ length: 6 }, () => positions).flat();
  for (const [i, position] of roles.entries()) rows.push({
    player_name: 'Fixture ' + country + ' ' + position + ' Player ' + (i + 1),
    nationality: country, position, club: 'Fixture Club ' + country + ' ' + (i + 1),
    market_value_usd: 20000000 - i * 1000, year: 2026, age: 25,
  });
}
assert.equal(rows.length, 937, 'WORLD_XI_BROWSER_SETUP: fictional pool exceeds unchanged800 floor');
const columns = 'player_name,nationality,position,club,market_value_usd,year,age';
function fixture(req, url) {
  if (url.origin !== BACKEND || req.method() !== 'GET' || req.postData() !== null || url.username || url.password || url.hash) return null;
  const q = url.searchParams, keys = [...q.keys()].sort().join('|');
  if (url.pathname === '/rest/v1/player_verified_positions') {
    assert.equal(keys, 'limit|select');
    assert.equal(q.get('select'), 'player_name,secondary_positions,primary_position');
    assert.equal(q.get('limit'), '1000');
    return { id: 'fictional-empty-position-history', body: '[]' };
  }
  if (url.pathname !== '/rest/v1/player_market_values') return null;
  assert.equal(q.get('select').replaceAll(' ', ''), columns);
  assert.equal(q.get('market_value_usd'), 'gt.0');
  assert.equal(q.get('limit'), '1000');
  if (q.get('year') === 'eq.2025') {
    assert.equal(keys, 'limit|market_value_usd|order|select|year');
    assert.equal(q.get('order'), 'market_value_usd.desc');
    return { id: 'fictional-empty-prior-year', body: '[]' };
  }
  assert.equal(q.get('year'), 'eq.2026');
  assert.equal(keys, 'limit|market_value_usd|offset|order|select|year');
  assert.equal(q.get('order'), 'id.asc');
  const offset = Number(q.get('offset'));
  assert(Number.isInteger(offset) && offset >= 0 && offset < 8000 && offset % 1000 === 0, 'WORLD_XI_BROWSER_TRANSPORT: exact source page offset');
  return { id: 'fictional-current-page-' + offset, body: JSON.stringify(rows.slice(offset, offset + 1000)) };
}
function sample() {
  const rect = node => { const r = node.getBoundingClientRect(); return { x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom }; };
  const group = document.querySelector('[role="group"][aria-labelledby="world-xi-nation-pool"]');
  const modes = group ? [...group.querySelectorAll('button')].map(node => ({
    text:node.textContent.trim(), pressed:node.getAttribute('aria-pressed'), ...rect(node),
    textWidth:node.scrollWidth, clientWidth:node.clientWidth, focused:document.activeElement === node,
    centerHit:node.contains(document.elementFromPoint(node.getBoundingClientRect().x+node.getBoundingClientRect().width/2,node.getBoundingClientRect().y+node.getBoundingClientRect().height/2)),
  })) : [];
  return { viewport:{width:innerWidth,height:innerHeight,scrollX,scrollY,documentWidth:document.documentElement.scrollWidth},
    modes, heading:document.querySelector('h1')?.textContent, active:document.activeElement?.textContent?.trim(),
    prompt:[...document.querySelectorAll('p')].find(node => node.textContent.startsWith('Name a player from '))?.textContent || null,
    labels:[...document.querySelectorAll('p')].map(node=>node.textContent.trim()).filter(text=>/^(Expanded|Classic|2026 Nations) pool$/.test(text)),
    fonts:{status:document.fonts.status,inter:document.fonts.check('16px Inter'),display:document.fonts.check('16px "Space Grotesk"'),
      faces:[...document.fonts].map(face=>({family:face.family,status:face.status}))},
    trusted:window.__siteMenuTrusted || [] };
}
function checkGeometry(value, setup = false) {
  assert(value.viewport.documentWidth <= value.viewport.width + 1, 'WORLD_XI_BROWSER_OVERFLOW: no document sideways bleed');
  checkFonts(value.fonts);
  if (!setup) return;
  assert.deepEqual(value.modes.map(row=>row.text), ['Expanded','Classic','2026 Nations']);
  for (const row of value.modes) {
    assert(row.width >= 44 && row.height >= 44, 'WORLD_XI_BROWSER_TARGET: actual mode owner at least44');
    assert(row.textWidth <= row.clientWidth + 1, 'WORLD_XI_BROWSER_LABEL: complete mode label fits');
    assert(row.x >= 0 && row.right <= value.viewport.width + 1, 'WORLD_XI_BROWSER_BOUNDS: modes inside viewport');
    assert(row.centerHit, 'WORLD_XI_BROWSER_HIT: actual mode center unobscured');
  }
  for (let i=1;i<value.modes.length;i++) assert(value.modes[i-1].right <= value.modes[i].x + 0.5, 'WORLD_XI_BROWSER_OVERLAP: distinct mode boxes');
}
function geometryControls(actual) {
  const beforeBody = JSON.stringify(actual,null,2)+'\n';
  const specs = [
    {id:'overflow',field:['viewport','documentWidth'],value:actual.viewport.width+8,marker:'WORLD_XI_BROWSER_OVERFLOW'},
    {id:'target',field:['modes',0,'height'],value:43,marker:'WORLD_XI_BROWSER_TARGET'},
    {id:'label',field:['modes',0,'textWidth'],value:actual.modes[0].clientWidth+8,marker:'WORLD_XI_BROWSER_LABEL'},
    {id:'bounds',field:['modes',0,'x'],value:-2,marker:'WORLD_XI_BROWSER_BOUNDS'},
    {id:'hit',field:['modes',0,'centerHit'],value:false,marker:'WORLD_XI_BROWSER_HIT'},
    {id:'overlap',field:['modes',1,'x'],value:actual.modes[0].right-2,marker:'WORLD_XI_BROWSER_OVERLAP'},
  ];
  const records=[];
  for(const spec of specs) {
    const changed=JSON.parse(beforeBody);
    const owner=spec.field.slice(0,-1).reduce((node,key)=>node[key],changed),key=spec.field.at(-1),before=owner[key];
    assert.notDeepEqual(before,spec.value,'WORLD_XI_BROWSER_CONTROL: effective field mutation');
    owner[key]=spec.value;
    const changedBody=JSON.stringify(changed,null,2)+'\n';
    assert.notEqual(sha(changedBody),sha(beforeBody));
    let failure=null;
    try { checkGeometry(changed,true); } catch(error) { failure={name:error.name,message:error.message,stack:error.stack}; }
    assert(failure && failure.name==='AssertionError' && failure.message.includes(spec.marker),'WORLD_XI_BROWSER_CONTROL: actual copied-record owned failure');
    owner[key]=before;
    const restoredBody=JSON.stringify(changed,null,2)+'\n';
    assert.equal(restoredBody,beforeBody,'WORLD_XI_BROWSER_CONTROL: full observation restoration');
    checkGeometry(changed,true);
    for(const [name,body] of [['before',beforeBody],['changed',changedBody],['restored',restoredBody]]) {
      fs.writeFileSync(path.join(out,'geometry-control-'+spec.id+'-'+name+'.json'),body,{flag:'wx'});
    }
    records.push({id:spec.id,scope:'copied actual320 normal setup observation only',field:spec.field,before,after:spec.value,
      beforeSha256:sha(beforeBody),changedSha256:sha(changedBody),restoredSha256:sha(restoredBody),ownedMarker:spec.marker,failure,restored:true});
  }
  return records;
}
async function prompt(page) {
  const input = page.getByRole('textbox', { name:'Name a player for this slot', exact:true });
  await input.waitFor({ state:'visible' });
  await page.waitForFunction(()=>{const el=document.querySelector('input[aria-label="Name a player for this slot"]');return el && !el.disabled;});
  const text = await page.getByText(/^Name a player from /).textContent();
  const match = text.match(/^Name a player from (.+) who can play (\w+)\./);
  assert(match, 'WORLD_XI_BROWSER_PROMPT: actual settled prompt');
  return { country:match[1], label:match[2], input };
}
function playerFor(current, wrong = false) {
  // Every fictional strict bucket includes exact primary witnesses. The wrong
  // witness crosses the held goalkeeper boundary, avoiding family assumptions.
  return rows.find(row=>row.nationality === current.country && (wrong
    ? (current.label === 'GK' ? row.position === 'ST' : row.position === 'GK')
    : row.position === current.label));
}
async function pick(page, row) {
  assert(row, 'WORLD_XI_BROWSER_WITNESS: fictional primary-position witness');
  await page.getByRole('textbox',{name:'Name a player for this slot',exact:true}).fill(row.player_name);
  const label = page.getByText(row.player_name,{exact:true});
  assert.equal(await label.count(),1,'WORLD_XI_BROWSER_SUGGESTION: exact named suggestion');
  await label.locator('..').click();
}
async function capture(page, name) {
  await page.screenshot({ path:path.join(out,name+'.png') });
}
const cases = [], browser = await chromium.launch();
try {
  for (const width of [320,390,430,640,768,1440]) for (const motion of ['no-preference','reduce']) {
    const id = width+'-'+motion, ctx = await browser.newContext({viewport:{width,height:900},reducedMotion:motion,serviceWorkers:'block'});
    const record = {id,width,motion,fixture:'937 fictional players,12 existing field nation labels and one fictional keeper-only nation',io:[],observations:[],errors:[],transportErrors:[],console:[],requestFailures:[],picks:[]};
    await ctx.routeWebSocket('**/*',async socket=>{
      const url=new URL(socket.url());
      record.io.push({kind:'websocket-refusal',origin:url.origin,path:url.pathname});
      try { await socket.close({code:1008,reason:'Offline verifier'}); }
      catch(error) { record.transportErrors.push({name:error.name,message:error.message,channel:'websocket'}); }
    });
    const page = await ctx.newPage();
    page.on('console',message=>record.console.push({type:message.type(),text:message.text()}));
    page.on('requestfailed',request=>record.requestFailures.push({url:request.url(),method:request.method(),resourceType:request.resourceType(),failure:request.failure()}));
    page.on('pageerror',error=>record.errors.push({name:error.name,message:error.message,stack:error.stack}));
    await ctx.addInitScript(seed,{theme:'dark',pending:false});
    await ctx.addInitScript(()=>{Math.random=()=>0.999999;});
    await ctx.route('**/*',async route=>{
      const req=route.request(),url=new URL(req.url()),font=fonts.get(req.url());
      try {
        if(font && req.method()==='GET' && ['stylesheet','font'].includes(req.resourceType())) {
          record.io.push({kind:'prepared-font',url:req.url(),sha256:font.sha256});
          return route.fulfill({status:200,contentType:font.contentType,body:font.body});
        }
        if(url.origin===base) {
          assert(!url.username && !url.password && !url.hash && !url.search);
          assert(['GET','HEAD'].includes(req.method()));
          assert(url.pathname==='/world-xi' || files.has(url.pathname),'WORLD_XI_BROWSER_TRANSPORT: actual route or completed-dist static file');
          return route.continue();
        }
        const data=fixture(req,url);
        if(data) {
          record.io.push({kind:'fictional-database-read',url:req.url(),id:data.id,bodySha256:sha(data.body)});
          return route.fulfill({status:200,contentType:'application/json',body:data.body});
        }
        record.io.push({kind:url.hostname==='flagcdn.com'?'flag-abort':'external-abort',url:req.url(),method:req.method(),resourceType:req.resourceType()});
        return route.abort();
      } catch(error) {
        record.transportErrors.push({name:error.name,message:error.message,url:req.url()});
        return route.abort();
      }
    });
    const observe = async(name,setup=false)=>{
      const value=await page.evaluate(sample);record.observations.push({name,value});checkGeometry(value,setup);return value;
    };
    try {
      await page.goto(base+'/world-xi',{waitUntil:'domcontentloaded'});
      const draw=page.getByRole('button',{name:'Draw my 11 nations',exact:true});
      await draw.waitFor();await page.evaluate(()=>document.fonts.ready);
      const group=page.getByRole('group',{name:'Nation pool',exact:true});
      await group.scrollIntoViewIfNeeded();
      const initialSample=await observe('expanded-default',true);
      if(width===320 && motion==='no-preference') record.geometryControls=geometryControls(initialSample);
      assert.equal(await page.getByText(/^13 nations are in the draw\./).count(),1);
      await capture(page,id+'-setup');
      const classic=page.getByRole('button',{name:'Classic',exact:true});
      await classic.focus();await page.keyboard.press('Enter');
      assert.equal(await classic.getAttribute('aria-pressed'),'true');
      assert.equal(await page.getByText(/^12 nations are in the draw\./).count(),1);
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(()=>document.activeElement?.textContent.trim()),'2026 Nations');
      await page.keyboard.press('Space');
      assert.equal(await page.getByRole('button',{name:'2026 Nations',exact:true}).getAttribute('aria-pressed'),'true');
      assert.equal(await page.getByText(/^12 nations are in the draw\./).count(),1);
      await observe('keyboard-2026',true);
      await page.getByRole('button',{name:'How to play',exact:true}).click();
      const dialog=page.getByRole('dialog');
      await dialog.waitFor();
      assert((await dialog.textContent()).includes('2026 Nations'),'WORLD_XI_BROWSER_HELP: real reopened help has new modes');
      assert((await dialog.textContent()).includes('Classic keeps the original depth rule'),'WORLD_XI_BROWSER_HELP: actual Classic rule');
      await page.getByRole('button',{name:"Let's Play!",exact:true}).click();
      await dialog.waitFor({state:'hidden'});
      await page.getByRole('button',{name:'Expanded',exact:true}).click();
      await draw.click();
      const first=await prompt(page);
      assert.deepEqual({country:first.country,label:first.label},{country:sparse,label:'GK'});
      await observe('expanded-real-keeper-draw');
      await pick(page,playerFor(first));
      await prompt(page);
      await page.getByRole('button',{name:'Give up',exact:true}).click();
      await page.getByRole('button',{name:'Play again',exact:true}).click();
      await page.getByRole('button',{name:'2026 Nations',exact:true}).click();
      await draw.click();
      const before=await prompt(page);
      assert(nations.includes(before.country));
      await page.getByRole('button',{name:'Respin nation (3 left)',exact:true}).click();
      const after=await prompt(page);
      assert(nations.includes(after.country) && after.country!==before.country && after.label===before.label);
      await page.getByRole('button',{name:'Respin nation (2 left)',exact:true}).waitFor();
      const wrong=playerFor(after,true);
      await pick(page,wrong);
      await page.getByText(wrong.player_name+' plays '+wrong.position+'.', {exact:false}).waitFor();
      const rejected=await prompt(page);
      assert.equal(rejected.country,after.country);assert.equal(rejected.label,after.label);
      await observe('2026-wrong-position-retained');
      for(let i=0;i<11;i++){
        const current=await prompt(page);
        assert(nations.includes(current.country),'WORLD_XI_BROWSER_FIELD: real draw and respin stay in field');
        const row=playerFor(current);await pick(page,row);
        record.picks.push({country:current.country,slot:current.label,name:row.player_name});
      }
      await page.getByRole('heading',{name:'World XI complete!',exact:true}).waitFor();
      assert.equal(new Set(record.picks.map(row=>row.country)).size,11);
      await observe('2026-complete');
      if([390,1440].includes(width)) await capture(page,id+'-result');
      await page.getByRole('button',{name:'Play again',exact:true}).click();
      assert.equal(await page.getByRole('button',{name:'2026 Nations',exact:true}).getAttribute('aria-pressed'),'true');
      assert.equal(await page.getByText(/^12 nations are in the draw\./).count(),1);
      await group.scrollIntoViewIfNeeded();await observe('2026-replay',true);
      assert.equal(record.errors.length,0,'WORLD_XI_BROWSER_RUNTIME: no page errors');
      assert.equal(record.transportErrors.length,0,'WORLD_XI_BROWSER_TRANSPORT: all accepted fixtures have exact source shape');
      const reads=record.io.filter(row=>row.kind==='fictional-database-read');
      assert.deepEqual(reads.map(row=>row.id).sort(),[
        ...Array.from({length:8},(_,i)=>'fictional-current-page-'+i*1000),
        'fictional-empty-prior-year','fictional-empty-position-history',
      ].sort(),'WORLD_XI_BROWSER_FETCH: exact eight distinct current pages,previous and verified history');
      record.complete=true;
    } catch(error) {
      record.failure={name:error.name,message:error.message,stack:error.stack};
      try { record.observations.push({name:'failure-state',value:await page.evaluate(sample)}); }
      catch(sampleError) { record.failureSampleError={name:sampleError.name,message:sampleError.message}; }
      await capture(page,id+'-failure').catch(()=>{});
      throw error;
    } finally {
      cases.push(record);
      fs.writeFileSync(path.join(out,id+'.json'),JSON.stringify(record,null,2)+'\n',{flag:'wx'});
      await ctx.close();
    }
  }
} finally {
  await browser.close();
  fs.writeFileSync(path.join(out,'browser-observations.json'),JSON.stringify({source:process.env.GITHUB_SHA,run:process.env.GITHUB_RUN_ID,attempt:process.env.GITHUB_RUN_ATTEMPT,pixelsReviewed:false,syntheticTransport:true,liveRosterCoverage:false,cases},null,2)+'\n',{flag:'wx'});
}
assert.equal(cases.length,12);
console.log('World XI: 12 actual-page contexts passed with fictional transport. Original pixels await review.');
}
main().catch(error=>{console.error(error.stack || error);process.exitCode=1;});
