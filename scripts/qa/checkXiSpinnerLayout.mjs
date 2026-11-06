// Standalone actual-component lab, not an App journey or a roster check.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import pw from '../lib/playwrightLoader.mjs';

assert(process.env.CI, 'Remote CI only');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ARM = process.env.XI_SPINNER_LAYOUT_ARM || 'fixed';
assert(['fixed', 'original'].includes(ARM), 'XI_SPINNER_LAYOUT_ARM is fixed or original');
const OUT = path.resolve(ROOT, process.env.XI_SPINNER_LAYOUT_OUT || 'xi-unrated-artifacts/spinner-layout-' + ARM);
assert(!fs.existsSync(OUT), 'Fresh lab evidence directory required'); fs.mkdirSync(OUT, { recursive: true });
const sha = b => createHash('sha256').update(b).digest('hex');
const blob = b => createHash('sha1').update(Buffer.concat([Buffer.from('blob ' + b.length + '\0'), b])).digest('hex');
const put = (name, value) => { const bytes = Buffer.from(JSON.stringify(value, null, 2)), file = name + '.json'; fs.writeFileSync(path.join(OUT, file), bytes); return { file, bytes: bytes.length, sha256: sha(bytes) }; };
const receipt = file => { const bytes = fs.readFileSync(path.join(ROOT, file)); return { file, bytes: bytes.length, sha256: sha(bytes), blob: blob(bytes) }; };
const inventory = dir => fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).sort((a,b) => a.name.localeCompare(b.name)).flatMap(e => e.isDirectory() ? inventory(dir + '/' + e.name) : e.isFile() ? [receipt(dir + '/' + e.name)] : []);
const COMPONENT = 'src/components/lineup/TeamSpinner.tsx';
const component = receipt(COMPONENT);
assert.equal(component.blob, ARM === 'fixed' ? '2c230efb93f28330d1d26b91cb9f3b78d3700b1d' : '7c49f86a41927dee736614cb859d461f620ca6bc', 'Exact physical component arm');
const index = fs.readFileSync(path.join(ROOT, 'dist/index.html'), 'utf8');
const css = [...index.matchAll(/<link\b[^>]*>/gi)].map(m => m[0]).filter(t => /\brel=["']stylesheet["']/i.test(t)).map(t => /\bhref=["']([^"']+)["']/i.exec(t)?.[1]).filter(Boolean).filter(href => href.startsWith('/assets/') && href.split('?')[0].endsWith('.css'));
assert(css.length > 0, 'Actual built local CSS links required');
const entry = String.raw`
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import TeamSpinner from './src/components/lineup/TeamSpinner';
import { clubYearClubs } from './src/data/lineupTeams';
const events = [];
window.__XI_SPINNER_LAB = { clubs: [...clubYearClubs], events, startedAt: performance.now() };
function Sample({ name }) {
  const [spinning, setSpinning] = useState(true);
  return <section data-xi-lab-club={name} data-phase={spinning ? 'spinning' : 'settled'} className="mb-4">
    <TeamSpinner teams={[{ name, isNation: false }]} targetIndex={0} recordedYear={2010}
      isSpinning={spinning} onFinish={() => { events.push({ name, at: performance.now() }); setSpinning(false); }} />
  </section>;
}
createRoot(document.getElementById('root')).render(
  <main className="mx-auto w-full max-w-4xl px-4 py-6">
    <h1 className="mb-4 text-sm">Standalone TeamSpinner component lab</h1>
    <div className="mx-auto w-full max-w-lg">{clubYearClubs.map(name => <Sample key={name} name={name} />)}</div>
  </main>
);
`;
const compiled = await build({ stdin: { contents: entry, resolveDir: ROOT, sourcefile: 'xi-spinner-layout-lab.tsx', loader: 'tsx' }, bundle: true, platform: 'browser', format: 'iife', jsx: 'automatic', target: 'es2022', write: false, metafile: true, define: { 'process.env.NODE_ENV': '"production"' }, alias: { '@': path.join(ROOT, 'src') }, logLevel: 'error' });
const js = compiled.outputFiles[0].contents;
fs.writeFileSync(path.join(OUT, 'lab.js'), js);
const html = '<!doctype html><html lang="en" class="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>XI spinner component lab</title><link rel="icon" href="data:,">' + css.map(href => '<link rel="stylesheet" href="' + href + '">').join('') + '</head><body><div id="root"></div><script src="/lab.js"></script></body></html>';
fs.writeFileSync(path.join(OUT, 'lab.html'), html);
const sources = [...new Set([COMPONENT, 'src/data/lineupTeams.ts', 'package.json', 'package-lock.json', 'scripts/lib/playwrightLoader.mjs', 'scripts/qa/checkXiSpinnerLayout.mjs', ...Object.keys(compiled.metafile.inputs).filter(f => f.startsWith('src/'))])].sort();
const report = { status: 'running', arm: ARM, scope: 'Separate lab HTML and fresh browser contexts, rendering the actual React TeamSpinner and actual 29 clubYearClubs with recordedYear2010. Actual built CSS, native component timers/onFinish, fallback-font scope. Not the built App, a native draft, real roster verification or a replacement for App scroll evidence.',
  limits: ['No App source, DOM, RNG or clock override; the lab owns ordinary isSpinning props and updates them only from real onFinish.', 'All nonlocal browser traffic is aborted; provider fonts are unavailable as in offline App proof.', 'The same club stays on each instance across phases. This measures spinner-to-settled layout, not transitions between two different club names or Mixed behavior.'],
  component, css: css.map(h => receipt('dist' + h.split('?')[0])), bundle: { file: 'lab.js', bytes: js.length, sha256: sha(js) }, sourceBefore: sources.map(receipt), distBefore: inventory('dist'), checks: 0, journeys: [] };
const check = (ok, label) => { assert(ok, label); report.checks++; };
const equal = (a,b,label) => { assert.deepEqual(a,b,label); report.checks++; };
const MIME = { '.css':'text/css', '.js':'application/javascript', '.woff2':'font/woff2', '.woff':'font/woff', '.svg':'image/svg+xml', '.png':'image/png' };
let server, browser;
try {
  const DIST = path.resolve(ROOT, 'dist');
  server = createServer((request, response) => {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    if (pathname === '/lab' || pathname === '/lab.html') { response.writeHead(200, { 'content-type':'text/html', 'cache-control':'no-store' }); response.end(html); return; }
    if (pathname === '/lab.js') { response.writeHead(200, { 'content-type':'application/javascript', 'cache-control':'no-store' }); response.end(js); return; }
    if (pathname === '/favicon.ico') { response.writeHead(204); response.end(); return; }
    const file = path.resolve(DIST, '.' + decodeURIComponent(pathname));
    if (file.startsWith(DIST + path.sep) && fs.existsSync(file) && fs.statSync(file).isFile()) { response.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream', 'cache-control':'no-store' }); response.end(fs.readFileSync(file)); return; }
    response.writeHead(404); response.end('Lab asset not found');
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const BASE = 'http://127.0.0.1:' + server.address().port; report.base = BASE;
  browser = await pw.chromium.launch({ headless: true });
  const jobs = [[320,568,288],[390,844,358],[1280,900,512]].map(async ([width,height,cardWidth]) => {
    const row = { width, height, expectedCardWidth: cardWidth, status: 'running', external: [], errors: [], assetErrors: [] };
    report.journeys.push(row);
    const context = await browser.newContext({ viewport:{width,height}, hasTouch:width<1000, isMobile:width<1000, serviceWorkers:'block' });
    const page = await context.newPage();
    try {
      await context.route('**/*', route => { const request = route.request(); if (new URL(request.url()).origin === BASE) return route.continue(); row.external.push({ url:request.url(), method:request.method(), outcome:'aborted' }); return route.abort('blockedbyclient'); });
      page.on('pageerror', error => row.errors.push(String(error)));
      page.on('response', response => { if (new URL(response.url()).origin === BASE && response.status() >= 400) row.assetErrors.push({url:response.url(),status:response.status()}); });
      const sample = phase => page.evaluate(phase => {
        const rect = e => { const r=e.getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}; };
        const cases = [...document.querySelectorAll('[data-xi-lab-club]')].map(wrapper => {
          const card=wrapper.firstElementChild, hint=[...card.querySelectorAll('p')].find(p => p.textContent.startsWith('Matching ')), title=card.querySelector('.font-display');
          const ranges=[]; if(hint){const range=document.createRange();range.selectNodeContents(hint);for(const r of range.getClientRects())ranges.push({x:r.x,y:r.y,right:r.right,bottom:r.bottom});}
          return { club:wrapper.getAttribute('data-xi-lab-club'), phase:wrapper.getAttribute('data-phase'), card:rect(card), cardClass:card.className, text:card.innerText,
            font:{family:getComputedStyle(card).fontFamily,titleSize:getComputedStyle(title).fontSize,titleFamily:getComputedStyle(title).fontFamily},
            hint:hint?{rect:rect(hint),text:hint.textContent,visibility:getComputedStyle(hint).visibility,ariaHidden:hint.getAttribute('aria-hidden'),clientWidth:hint.clientWidth,scrollWidth:hint.scrollWidth,clientHeight:hint.clientHeight,scrollHeight:hint.scrollHeight,ranges}:null };
        });
        return {phase,at:performance.now(),viewport:{width:innerWidth,height:innerHeight},visibility:document.visibilityState,fontsReady:document.fonts.status,clubs:window.__XI_SPINNER_LAB.clubs,events:[...window.__XI_SPINNER_LAB.events],cases};
      },phase);
      await page.goto(BASE + '/lab', { waitUntil:'domcontentloaded' });
      await page.waitForFunction(() => document.querySelectorAll('[data-xi-lab-club][data-phase="spinning"]').length === 29, null, {polling:20,timeout:15000});
      await page.evaluate(() => document.fonts.ready);
      const spinning = await sample('spinning'); row.spinning=put(width+'-spinning',spinning);
      equal(spinning.viewport,{width,height},width+': actual responsive viewport');
      check(spinning.clubs.length===29 && new Set(spinning.clubs).size===29 && spinning.cases.length===29,width+': actual29club census');
      check(spinning.events.length===0 && spinning.cases.every(c => c.phase==='spinning' && /spinning\.\.\./i.test(c.text)),width+': first displayed spin captured before native completion');
      await page.waitForFunction(() => document.querySelectorAll('[data-xi-lab-club][data-phase="settled"]').length === 29, null, {polling:50,timeout:30000});
      await page.waitForFunction(() => !document.getAnimations().some(a => a.playState==='running' && Number.isFinite(a.effect?.getComputedTiming().endTime)),null,{polling:50,timeout:5000});
      const settled=await sample('settled');row.settled=put(width+'-settled',settled);
      equal(settled.clubs,spinning.clubs,width+': exact source club order held');
      equal(settled.events.map(e=>e.name).sort(),[...settled.clubs].sort(),width+': one native onFinish per real component');
      const vectors=settled.cases.map((after,index)=>{
        const before=spinning.cases[index]; equal(after.club,before.club,width+': same component identity');
        check(before.card.width===cardWidth && after.card.width===cardWidth,width+': actual App card width');
        const h=after.hint;check(after.phase==='settled' && h && h.text==='Matching '+after.club+' records from 2010' && h.visibility==='visible' && h.ariaHidden===null,width+': original subtitle visible after native settlement');
        check(h.scrollWidth<=h.clientWidth && h.scrollHeight<=h.clientHeight && h.ranges.every(r=>r.x>=h.rect.x-0.5 && r.right<=h.rect.right+0.5 && r.y>=h.rect.y-0.5 && r.bottom<=h.rect.bottom+0.5),width+': settled subtitle is not clipped');
        return {club:after.club,spinningHeight:before.card.height,settledHeight:after.card.height,settledMinusSpinning:after.card.height-before.card.height,elapsedMs:settled.at-spinning.at,subtitleHeight:h.rect.height};
      });
      row.vectors=put(width+'-vectors',vectors);row.changed=vectors.filter(v=>v.settledMinusSpinning!==0).length;
      if(ARM==='fixed')check(row.changed===0,width+': all29 actual Club year component heights held exactly');
      else check(row.changed>0 && vectors.every(v=>v.settledMinusSpinning>=0),width+': physical original produces nonzero missing-hint-space phase deltas');
      check(row.errors.length===0 && row.assetErrors.length===0,width+': no React or local asset errors');
      row.status='passed';
    }catch(error){row.status='failed';row.error=String(error.stack||error);throw error;}
    finally{await context.close();}
  });
  const results=await Promise.allSettled(jobs);const failures=results.filter(r=>r.status==='rejected');
  check(failures.length===0,'All three actual responsive component contexts passed');
  check(report.journeys.length===3,'All87 club/viewport pairs measured');report.status='passed';
} catch(error){report.status='failed';report.error=String(error.stack||error);throw error;}
finally{
  if(browser)await browser.close();if(server)await new Promise(resolve=>server.close(resolve));
  report.sourceAfter=sources.map(receipt);report.distAfter=inventory('dist');report.sourceHeld=JSON.stringify(report.sourceBefore)===JSON.stringify(report.sourceAfter);report.distHeld=JSON.stringify(report.distBefore)===JSON.stringify(report.distAfter);
  put('report',report);assert(report.sourceHeld&&report.distHeld,'Lab must hold every source and built byte');
}
