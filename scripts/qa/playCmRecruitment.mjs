import '../lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { build } from 'esbuild';
import pw from '../lib/playwrightLoader.mjs';
assert.equal(process.env.CI, '1', 'Remote browser only');
const ROOT = process.cwd(), OUT = path.join(path.resolve(process.env.CM_RECRUITMENT_OUT || 'cm-recruitment-browser-artifacts'), 'browser');
fs.mkdirSync(OUT, { recursive: true });
const sha = body => createHash('sha256').update(body).digest('hex');
const selector = fs.readFileSync('qa/cm-recruitment-shortlist-v1/SOURCE-READY.json');
assert.equal(sha(selector), '0a5d3d71315f35ab3426a60e1460cc42b21a5523ef97626e7640b0b9c1605ed0');
const meta = JSON.parse(selector), authority = { engine:'src/lib/clubManager.ts', deals:'src/lib/clubManagerDeals.ts', loanDevelopment:'src/lib/clubManagerLoanDevelopment.ts', loanPlan:'src/lib/clubManagerLoanPlan.ts', loanCard:'src/components/club-manager/LoanPlanCard.tsx' };
const gitBlob = body => createHash('sha1').update(Buffer.concat([Buffer.from('blob '+body.length+'\0'),body])).digest('hex');
const paths = [...meta.files.map(f => f.path),...Object.values(authority)], held = () => Object.fromEntries(paths.map(file => [file,sha(fs.readFileSync(file))]));
for (const [key,file] of Object.entries(authority)) assert.equal(gitBlob(fs.readFileSync(file)),meta.physicallyHeld[key],file);
const report = { status: 'RUNNING', scope: 'Actual TransferScreen and lazy RecruitmentBoard in a component frame, production CSS/fonts and real save/load/market/calendar. Parent owns a synchronous save-before-adopt adapter. Actual hook phase/slot/fence/quota is separate38-case scope; three held single-target and three filled-list navigation journeys are component-frame only, no full route/site chrome or production lazy-download claim.', profiles: [], controls: [], forwardedExternal: 0, sourceBefore: held() };
for (const f of meta.files) assert.equal(report.sourceBefore[f.path], f.sha256);
const save = () => fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
save();
const client = [
  "import React, { useState } from 'react'; import { createRoot } from 'react-dom/client';",
  "import { TransferScreen } from '@/components/club-manager/TransferScreen'; import { FLAG_CODES } from '@/components/FlagImg';",
  "import * as E from '@/lib/clubManager'; import * as R from '@/lib/clubManagerRecruitment';",
  "let live = E.loadCareer(); const bootstrap = {};",
  "if (!live) { live = E.startCareer('Brentford'); if (!E.saveCareer(live)) throw Error('Fixture save refused'); bootstrap.before = localStorage.getItem(E.SAVE_KEY); live = E.loadCareer(); if (!live || !E.saveCareer(live)) throw Error('Fixture normalized save refused'); bootstrap.normalized = localStorage.getItem(E.SAVE_KEY); }",
  "if (new URLSearchParams(location.search).get('filled') === '12') {",
  "  if (R.recruitmentOf(live)?.targets.length) throw Error('Filled fixture requires the fresh isolated context'); const market = E.marketForScreen(live), players = market.slice(0,12); if(players.length!==12)throw Error('Twelve actual current market records required');",
  "  const before = JSON.stringify(live), drawsBefore = window.__recruitmentDraws.length; for(const player of players){const next=R.addRecruitment(live,player);if(!next||next===live)throw Error('Actual Add metadata fixture refused');live=next;} if(R.recruitmentOf(live)?.targets.length!==12)throw Error('Actual fixture must retain twelve distinct targets'); if(window.__recruitmentDraws.length!==drawsBefore)throw Error('Add metadata fixture drew global randomness');",
  "  if(!E.saveCareer(live))throw Error('Filled fixture save refused'); const prepared=localStorage.getItem(E.SAVE_KEY);live=E.loadCareer();if(!live||!E.saveCareer(live))throw Error('Filled fixture normalized save refused');bootstrap.filled={setupOnly:true,metadataAdds:12,saveCalls:2,before,prepared,normalized:localStorage.getItem(E.SAVE_KEY),drawsBefore,drawsAfter:window.__recruitmentDraws.length};",
  "}",

  "let adopt; const writes = [], financial = []; const noop = () => {};",
  "function commit(make) { const next = make(live); if (!next) return false; if (next === live) return true; if (!E.saveCareer(next)) return false; writes.push({ before: JSON.stringify(live), after: JSON.stringify(next) }); live = next; adopt(next); return true; }",
  "window.__recruitmentQA = { bootstrap, flags: [...new Set(Object.values(FLAG_CODES))].map(code => 'https://flagcdn.com/w40/' + code + '.png'),",
  "peek: () => ({ state: JSON.parse(JSON.stringify(live)), raw: localStorage.getItem(E.SAVE_KEY), draws: window.__recruitmentDraws.length, writes: writes.length, financial: [...financial] }),",
  "filledTargets: () => { const market=E.marketForScreen(live);return(R.recruitmentOf(live)?.targets??[]).map(target=>{const player=R.resolveRecruitmentTarget(live,target,market);if(!player)throw Error('Unresolved actual fixture target');return{...player,asking:E.moneyIn(live)(player.price)};}); },",

  "candidate: () => E.marketForScreen(live)[0], target: () => { const t = R.recruitmentOf(live)?.targets[0], p = t ? R.resolveRecruitmentTarget(live, t, E.marketForScreen(live)) : null; return p ? { ...p, asking: E.moneyIn(live)(p.price) } : null; },",
  "closeWindow: () => { let count = 0; while (live.transferWindow !== null && count++ < 20) { const result = E.playNextEntry(live, { skipHalftime: true }); if (!['match','window'].includes(result.kind)) throw Error('Unexpected calendar endpoint ' + result.kind); if (!commit(() => result.state)) throw Error('Calendar save refused'); } if (live.transferWindow !== null) throw Error('Actual calendar did not close the window'); return JSON.parse(JSON.stringify(live)); } };",
  "function Frame() { const [career, setCareer] = useState(live); adopt = setCareer; return <TransferScreen career={career} market={E.marketForScreen(career)} onCommitRecruitment={commit}",
  "onNegotiate={p => { financial.push('talk'); commit(c => E.startNegotiation(c,p)); }} onClause={p => { financial.push('clause'); commit(c => E.payClause(c,p)); }} onLoan={p => { financial.push('loan'); commit(c => E.loanIn(c,p)); }}",
  "onOffer={noop} onWalk={noop} onDismissNegotiation={noop} onAcceptBid={noop} onRejectBid={noop} onSetStatus={noop} onLoanOut={noop} onProposeTerms={noop} onBuyLoanee={noop} onEndLoanEarly={noop} onRecallLoanee={noop} />; }",
  "createRoot(document.getElementById('recruitment-root')).render(<Frame />);",
].join('\n');
fs.writeFileSync(path.join(OUT, 'client.tsx'), client);
const built = await build({ stdin: { contents: client, sourcefile: 'recruitment-frame.tsx', resolveDir: ROOT, loader: 'tsx' }, bundle: true, write: false, platform: 'browser', format: 'esm', jsx: 'automatic', alias: { '@': path.join(ROOT, 'src') }, metafile: true, define: { 'process.env.NODE_ENV': '"production"', 'import.meta.env': '{}' }, logLevel: 'error' });
const bundle = Buffer.from(built.outputFiles[0].contents); fs.writeFileSync(path.join(OUT, 'client.js'), bundle);
fs.writeFileSync(path.join(OUT, 'client.metafile.json'), JSON.stringify(built.metafile, null, 2));
report.clientSha256 = sha(bundle);
const engineInputs = Object.keys(built.metafile.inputs).filter(input => /(^|\/)clubManager\.ts$/.test(input.replaceAll('\\','/')));
assert.deepEqual(engineInputs,['src/lib/clubManager.ts'],'One actual canonical engine input'); report.engineInputs = engineInputs;
const head = fs.readFileSync('dist/index.html', 'utf8').match(/<head[^>]*>([\s\S]*?)<\/head>/i)?.[1]; assert(head);
const styles = head.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<link\b[^>]*rel=["']modulepreload["'][^>]*>/gi, '');
const html = '<!doctype html><html class="dark"><head>' + styles + '</head><body class="bg-background text-foreground"><main id="recruitment-frame" class="mx-auto max-w-4xl p-3"><div id="recruitment-root"></div></main><script type="module" src="/__recruitment/client.js"></script></body></html>';
fs.writeFileSync(path.join(OUT, 'frame.html'), html);
const cache = path.resolve(process.env.FREE_KICK_FONT_CACHE || ''); assert(process.env.FREE_KICK_FONT_CACHE);
const fonts = new Map(JSON.parse(fs.readFileSync(path.join(cache, 'manifest.json'), 'utf8')).map(entry => {
  assert(['https://fonts.googleapis.com', 'https://fonts.gstatic.com'].includes(new URL(entry.url).origin));
  assert(/^[a-f0-9]{64}$/.test(entry.file)); const body = fs.readFileSync(path.join(cache, entry.file)); assert.equal(sha(body), entry.sha256);
  return [entry.url, { body, contentType: entry.contentType, headers: { 'access-control-allow-origin': '*' } }];
}));
const port = await new Promise((resolve, reject) => { const socket = createServer(); socket.once('error', reject); socket.listen(0, '127.0.0.1', () => { const port = socket.address().port; socket.close(error => error ? reject(error) : resolve(port)); }); });
const BASE = 'http://127.0.0.1:' + port, server = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', 'dist', String(port)], { cwd: ROOT, stdio: ['ignore','pipe','pipe'], windowsHide: true });
let browser, serverLog = '';
const ready = new Promise((resolve, reject) => { const timer = setTimeout(() => reject(Error(serverLog)), 15000); server.once('error', reject); server.once('exit', code => reject(Error('Server exited ' + code))); server.stdout.on('data', data => { serverLog += data; if (String(data).includes('host-like server:')) { clearTimeout(timer); resolve(); } }); server.stderr.on('data', data => { serverLog += data; }); });
async function settle(page) {
  return page.evaluate(async () => {
    await document.fonts.ready; await Promise.all(['Inter','Space Grotesk'].map(font => document.fonts.load('400 16px "' + font + '"')));
    let same = 0, previous = '', last; const until = performance.now() + 8000;
    do { await new Promise(resolve => requestAnimationFrame(resolve)); const root = document.querySelector('#recruitment-root'), rect = root.getBoundingClientRect();
      const finite = document.getAnimations().filter(a => a.playState === 'running' && a.effect && Number.isFinite(a.effect.getComputedTiming().endTime)).length;
      last = { rect: [rect.x,rect.y,rect.width,rect.height], scrollY, finite, fonts: document.fonts.status };
      const signature = JSON.stringify(last); same = signature === previous ? same + 1 : 0; previous = signature;
      if (same >= 4 && !finite && document.fonts.status === 'loaded') return last;
    } while (performance.now() < until);
    throw Error('Actual fonts/finite-animation/geometry did not settle: ' + JSON.stringify(last));
  });
}
async function measure(page) {
  const requested = page.viewportSize();
  return page.locator('#recruitment-root').evaluate((root, requested) => {
    const frame = root.closest('main').getBoundingClientRect(), board = root.querySelector('section[aria-labelledby="cm-recruitment-title"]');
    const h = board?.querySelector('h3')?.getBoundingClientRect();
    const controls = [...root.querySelectorAll(board ? 'section[aria-labelledby="cm-recruitment-title"] button' : '[data-cm-shortlist-open],button[aria-label^="Save "]')].filter(e => e.getClientRects().length).map(e => { const r = e.getBoundingClientRect(); return { label: e.getAttribute('aria-label') || e.textContent, width: r.width, height: r.height, x: r.x, right: r.right }; });
    const texts = [...(board ? board.querySelectorAll('h3,h4,dd,p,button') : root.querySelectorAll('[data-cm-shortlist-open],button[aria-label^="Save "]'))].filter(e => e.getClientRects().length).map(e => ({ label: e.textContent, scroll: e.scrollWidth, client: e.clientWidth }));
    const loaded = [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family.replaceAll('"',''));
    return { requested: requested.width, requestedHeight: requested.height, heading: h ? { top:h.top, bottom:h.bottom } : null, inner: innerWidth, scroll: document.documentElement.scrollWidth, frame: { x: frame.x, right: frame.right }, controls, texts, loaded };
  }, requested);
}
function geometry(m) {
  assert(!m.heading || m.heading.top >= -0.75 && m.heading.bottom <= m.requestedHeight + 0.75, 'BOARD_HEADING_IN_VIEW');
  assert(m.inner <= m.requested + 1 && m.scroll <= m.requested + 1 && m.frame.x >= -0.75 && m.frame.right <= m.requested + 0.75, 'REQUESTED_VIEWPORT_FIT');
  assert(m.controls.length > 0 && m.controls.every(c => c.height >= 43.5 && c.width >= 43.5 && c.x >= -0.75 && c.right <= m.requested + 0.75), 'NEW_CONTROL44_FIT');
  assert(m.texts.every(t => t.scroll <= t.client + 1), 'NEW_LABELS_FIT');
  assert(['Inter','Space Grotesk'].every(font => m.loaded.includes(font)), 'ACTUAL_FONTS_LOADED');
}
const peek = page => page.evaluate(() => window.__recruitmentQA.peek());
const core = value => { const next = structuredClone(value); delete next.recruitment; return next; };
function quiet(a, b) { assert.deepEqual(b.state, a.state); assert.equal(b.raw, a.raw); assert.equal(b.draws, a.draws); assert.equal(b.writes, a.writes); assert.deepEqual(b.financial, []); }
async function listSnapshot(page) {
  return page.locator('section[aria-labelledby="cm-recruitment-title"]').evaluate(board => ({
    tileCount: [...board.querySelectorAll('button')].filter(button => (button.getAttribute('aria-label') || button.textContent.trim()).startsWith('View ')).length,
    articleNames: [...board.querySelectorAll('article')].map(article => article.getAttribute('aria-label')),
    askingLabels: [...board.querySelectorAll('dt')].filter(label => label.textContent.trim() === 'Asking price').length,
  }));
}
function tilesOnly(value) {
  assert.equal(value.tileCount,12,'TWELVE_VIEW_TILES');
  assert.deepEqual(value.articleNames,[],'NO_COMPARISON_PILE');
  assert.equal(value.askingLabels,0,'NO_LIST_PRICE_FACTS');
}
function oneDetail(value,name) {
  assert.equal(value.tileCount,0,'DETAIL_REPLACES_TILES');
  assert.deepEqual(value.articleNames,[name],'ONE_CURRENT_DETAIL');
  assert.equal(value.askingLabels,1,'ONE_CURRENT_PRICE');
}

try {
  await ready; browser = await pw.chromium.launch({ headless: true });
  for (const viewport of [{ width:320,height:780 }, { width:390,height:844 }, { width:1280,height:900 }]) for (const scenario of ['single','filled']) {
    const row = { viewport, scenario, status:'STARTED', errors:[], unknown:[], requests:[], cosmetic:[], states:{}, geometry:{}, snapshots:[] }; report.profiles.push(row); save();
    const context = await browser.newContext({ viewport, isMobile:viewport.width < 600, hasTouch:viewport.width < 600, colorScheme:'dark', reducedMotion:'no-preference', serviceWorkers:'block' });
    await context.addInitScript(() => { let n = 1079; window.__recruitmentDraws = []; Math.random = () => { n = (Math.imul(n,1664525)+1013904223)>>>0; const v=n/4294967296; window.__recruitmentDraws.push(v); return v; }; Date.now = () => 1793145600000; });
    let page;
    await context.route('**/*', async route => {
      const req = route.request(), url = new URL(req.url()); row.requests.push({ method:req.method(), url:url.href });
      if (!['GET','HEAD'].includes(req.method())) { row.unknown.push(url.href); return route.fulfill({ status:405,body:'' }); }
      if (url.origin === BASE) {
        if (url.pathname === '/__recruitment/frame') return route.fulfill({ contentType:'text/html',body:html });
        if (url.pathname === '/__recruitment/client.js') return route.fulfill({ contentType:'text/javascript',body:bundle });
        if (url.pathname === '/favicon.ico') return route.fulfill({ status:204,body:'' });
        return route.continue();
      }
      if (fonts.has(url.href)) return route.fulfill({ status:200,...fonts.get(url.href) });
      if (url.origin === 'https://flagcdn.com' && req.resourceType() === 'image' && await page.evaluate(url => window.__recruitmentQA?.flags.includes(url) === true, url.href)) {
        row.cosmetic.push(url.href); return route.fulfill({ contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="40" height="30"><rect width="40" height="30" fill="#334155"/></svg>' });
      }
      row.unknown.push(url.href); return route.fulfill({ status:204,body:'' });
    });
    page = await context.newPage(); page.on('pageerror', e => row.errors.push(String(e))); page.on('console', m => { if (m.type() === 'error') row.errors.push(m.text()); });
    page.on('requestfailed', r => row.errors.push(r.url()+':'+r.failure()?.errorText)); page.on('response', r => { if (r.url().startsWith(BASE) && r.status() >= 400) row.errors.push(r.status()+' '+r.url()); });
    const capture = async (label, image = false) => { await settle(page); const state = await peek(page); row.states[label] = state;
      assert.deepEqual(JSON.parse(state.raw), state.state, 'Actual official disk equals rendered state');
      row.geometry[label] = await measure(page); geometry(row.geometry[label]); fs.writeFileSync(path.join(OUT,viewport.width+'-'+label+'.state.json'),JSON.stringify(state,null,2));
      fs.writeFileSync(path.join(OUT,viewport.width+'-'+label+'.html'),await page.content());
      if (image) { const file=viewport.width+'-'+label+'.png'; await page.screenshot({ path:path.join(OUT,file),fullPage:true }); row.snapshots.push(file); } save(); return state; };
    try {
      if (scenario === 'filled') {
        await page.goto(BASE+'/__recruitment/frame?filled=12',{waitUntil:'domcontentloaded'});
        await page.getByRole('button',{name:'Shortlist',exact:true}).waitFor();
        row.bootstrap = await page.evaluate(() => window.__recruitmentQA.bootstrap); save();
        assert(row.bootstrap.filled?.setupOnly&&row.bootstrap.filled.metadataAdds===12,'Explicit actual Add metadata fixture');
        const fixture = await peek(page), players = await page.evaluate(() => window.__recruitmentQA.filledTargets());
        assert.equal(players.length,12); assert.equal(fixture.state.recruitment.targets.length,12);
        row.filledFixture = {players,scope:'First twelve actual current canonical market records, saved through actual Add metadata and official save/load before measured UI actions.'}; save();
        await page.getByRole('button',{name:'Shortlist',exact:true}).click();
        const list = await capture('filled-tiles',true); quiet(fixture,list);
        row.filledList = await listSnapshot(page); tilesOnly(row.filledList);
        for(const player of players) {
          const tile=page.getByRole('button',{name:'View '+player.name,exact:true});
          assert.equal(await tile.count(),1,'Actual real target View label');
          assert.deepEqual(await tile.locator('span').allTextContents(),[player.name,player.club+' · '+player.position],'Actual current tile name, club and primary position');
        }
        const selected=players[7],viewLabel='View '+selected.name;
        row.filledSelected=selected; save();
        await page.getByRole('button',{name:viewLabel,exact:true}).click();
        const article=page.getByRole('article',{name:selected.name,exact:true});await article.waitFor();
        const heading=article.getByRole('heading',{name:selected.name,exact:true});await heading.waitFor();
        await settle(page);
        const firstHeading=await heading.evaluate(element=>{const r=element.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return{top:r.top,bottom:r.bottom,left:r.left,right:r.right,innerWidth,innerHeight,scrollY,painted:!!hit&&(hit===element||element.contains(hit))};});
        row.firstFilledDetailHeading=firstHeading;save();
        assert(firstHeading.top>=-.75&&firstHeading.bottom<=viewport.height+.75&&firstHeading.left>=-.75&&firstHeading.right<=viewport.width+.75&&firstHeading.painted,'DETAIL_FIRST_VIEW_WITHOUT_OBSERVER_SCROLL');
        const detail=await capture('filled-detail',true);quiet(fixture,detail);
        row.filledDetail=await listSnapshot(page);oneDetail(row.filledDetail,selected.name);
        assert.deepEqual(await article.locator('dd').allTextContents(),[selected.asking,String(selected.age)+'y',String(selected.rating),selected.position],'Actual selected current comparison facts');
        assert.equal(await article.getByRole('button',{name:'Find '+selected.name+' in Buy',exact:true}).count(),1);
        assert.equal(await article.getByRole('button',{name:'Remove '+selected.name,exact:true}).count(),1);
        row.filledBackScrollBefore=await page.evaluate(()=>scrollY);
        await page.getByRole('button',{name:'Back',exact:true}).click();
        row.filledBackImmediateFocus=await page.evaluate(()=>document.activeElement?.getAttribute('aria-label'));save();
        await page.waitForFunction(label=>document.activeElement?.getAttribute('aria-label')===label,viewLabel,{timeout:2000});
        row.filledBackEventualFocus=await page.evaluate(()=>document.activeElement?.getAttribute('aria-label'));
        row.filledBackScrollAfter=await page.evaluate(()=>scrollY);
        const back=await capture('filled-back');quiet(fixture,back);
        row.filledBackSettledFocus=await page.evaluate(()=>document.activeElement?.getAttribute('aria-label'));row.filledBackSettledScrollY=await page.evaluate(()=>scrollY);
        assert.equal(row.filledBackSettledFocus,viewLabel,'Back focus remains on the actual eighth View tile after settling');
        row.filledReturnedList=await listSnapshot(page);tilesOnly(row.filledReturnedList);
        for(const player of players) assert.equal(await page.getByRole('button',{name:'View '+player.name,exact:true}).count(),1);
        assert.equal(row.filledBackEventualFocus,viewLabel,'Back restores actual eighth View tile focus');save();
      } else {
      await page.goto(BASE+'/__recruitment/frame',{waitUntil:'domcontentloaded'}); await page.getByRole('button',{name:'Shortlist',exact:true}).waitFor();
      row.bootstrap = await page.evaluate(() => window.__recruitmentQA.bootstrap); save();
      const first = await capture('initial'), target = await page.evaluate(() => window.__recruitmentQA.candidate()); row.target = target; save();
      await page.getByRole('textbox',{name:'Search player or club',exact:true}).fill(target.name); await page.getByRole('button',{name:'Save '+target.name,exact:true}).click(); await page.getByText('Target saved.',{exact:true}).waitFor();
      const saved = await capture('saved',true); assert.deepEqual(core(saved.state),core(first.state)); assert.equal(saved.state.recruitment.targets.length,1); assert.equal(saved.draws,first.draws); assert.equal(saved.writes,first.writes+1); assert.deepEqual(saved.financial,[]);
      const article = page.getByRole('article',{name:target.name,exact:true}); await article.waitFor();
      const current = await page.evaluate(() => window.__recruitmentQA.target()); assert(current); assert.deepEqual(await article.locator('dd').allTextContents(),[current.asking, String(current.age)+'y',String(current.rating),current.position]);
      await page.getByRole('button',{name:'Back',exact:true}).click(); await page.waitForFunction(() => document.activeElement?.hasAttribute('data-cm-shortlist-open')); await page.getByRole('button',{name:'Shortlist',exact:true}).click(); quiet(saved,await capture('reopened'));
      await page.getByRole('button',{name:'Recruitment shortlist help',exact:true}).click(); quiet(saved,await capture('help',true));
      await page.getByRole('button',{name:'Back',exact:true}).click(); await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'Recruitment shortlist help');
      await page.getByRole('button',{name:'Find '+target.name+' in Buy',exact:true}).click(); const found = await capture('found'); quiet(saved,found);
      assert.equal(await page.getByRole('textbox',{name:'Search player or club',exact:true}).inputValue(),target.name);
      await page.reload({waitUntil:'domcontentloaded'}); await page.getByRole('button',{name:'Shortlist',exact:true}).waitFor(); const reloaded = await capture('reloaded'); assert.equal(reloaded.raw,saved.raw); assert.equal(reloaded.state.recruitment.targets.length,1);
      await page.evaluate(() => window.__recruitmentQA.closeWindow()); await page.getByRole('button',{name:'Shortlist',exact:true}).click(); const closed = await capture('closed',true);
      assert.equal(closed.state.transferWindow,null); assert.equal(await page.getByRole('button',{name:'Find '+target.name+' in Buy',exact:true}).isDisabled(),true);
      await page.getByRole('button',{name:'Remove '+target.name,exact:true}).click(); const removed = await capture('removed',true);
      assert.equal(Object.hasOwn(removed.state,'recruitment'),false); assert.deepEqual(core(removed.state),core(closed.state)); assert.equal(removed.draws,closed.draws); assert.deepEqual(removed.financial,[]);
      }
      assert.deepEqual(row.errors,[]); assert.deepEqual(row.unknown,[]); row.status='PASSED'; save();
    } catch(error) { row.status='FAILED'; row.failure={name:error.name,message:error.message,stack:error.stack}; row.failedURL=page.url(); row.failedState=await peek(page).catch(()=>null); fs.writeFileSync(path.join(OUT,viewport.width+'-failure.html'),await page.content().catch(()=>'')); await page.screenshot({path:path.join(OUT,viewport.width+'-failure.png'),fullPage:true}).catch(()=>{}); save(); throw error; }
    finally { await context.close(); }
  }
  const original = report.profiles[0].geometry.saved;
  for (const kind of ['viewport','touch','touch-width','text','fonts','heading']) {
    const copy = structuredClone(original), raw = JSON.stringify(copy); const guard = {viewport:'REQUESTED_VIEWPORT_FIT',touch:'NEW_CONTROL44_FIT','touch-width':'NEW_CONTROL44_FIT',text:'NEW_LABELS_FIT',fonts:'ACTUAL_FONTS_LOADED',heading:'BOARD_HEADING_IN_VIEW'}[kind];
    if(kind==='viewport')copy.frame.right=copy.requested+60;if(kind==='touch')copy.controls[0].height=20;if(kind==='touch-width'){assert(copy.controls[0].height>=43.5);copy.controls[0].width=20;}if(kind==='text')copy.texts[0].scroll=copy.texts[0].client+20;if(kind==='fonts')copy.loaded=[];if(kind==='heading')copy.heading.top=-20;
    assert.notEqual(JSON.stringify(copy),raw); assert.throws(()=>geometry(copy),e=>e.name==='AssertionError'&&e.message.includes(guard));
    Object.keys(copy).forEach(key=>delete copy[key]); Object.assign(copy,JSON.parse(raw)); assert.equal(JSON.stringify(copy),raw); geometry(copy);
    report.controls.push({kind,copiedObservationOnly:true,changed:true,rejected:guard,sameCopyRestored:true});
  }
  const filledOriginal=report.profiles.find(row=>row.scenario==='filled');
  for(const kind of ['filled-tile-pile','filled-detail-pile']){
    const original=kind==='filled-tile-pile'?filledOriginal.filledList:filledOriginal.filledDetail;
    const changed=structuredClone(original),raw=JSON.stringify(changed);
    if(kind==='filled-tile-pile'){changed.tileCount=0;changed.articleNames=filledOriginal.filledFixture.players.map(player=>player.name);}
    else changed.articleNames=[...changed.articleNames,...changed.articleNames];
    const guard=kind==='filled-tile-pile'?'TWELVE_VIEW_TILES':'ONE_CURRENT_DETAIL';
    assert.notEqual(JSON.stringify(changed),raw,'Actual copied layout observation changes');
    assert.throws(()=>kind==='filled-tile-pile'?tilesOnly(changed):oneDetail(changed,filledOriginal.filledSelected.name),error=>error.name==='AssertionError'&&error.message.includes(guard));
    Object.keys(changed).forEach(key=>delete changed[key]);Object.assign(changed,JSON.parse(raw));assert.equal(JSON.stringify(changed),raw);
    if(kind==='filled-tile-pile')tilesOnly(changed);else oneDetail(changed,filledOriginal.filledSelected.name);
    report.controls.push({kind,copiedObservationOnly:true,changed:true,rejected:guard,sameCopyRestored:true});
  }
  assert.equal(report.profiles.length,6);assert.equal(report.profiles.filter(row=>row.scenario==='single').length,3);assert.equal(report.profiles.filter(row=>row.scenario==='filled').length,3);
  assert(report.profiles.every(row=>row.status==='PASSED'));
  assert.equal(report.profiles.reduce((sum,row)=>sum+row.snapshots.length,0),18);
  assert.equal(report.controls.length,8);
  report.sourceAfter=held();assert.deepEqual(report.sourceAfter,report.sourceBefore);report.status='PASSED';save();
  console.log('Recruitment component browser:6 actual viewport journeys (3 single-target + 3 filled-list);18 normal captures;8 changed COPIED geometry/font/layout controls with same-copy restores.');
} finally { if(browser)await browser.close();server.kill();fs.writeFileSync(path.join(OUT,'server.log'),serverLog); }
