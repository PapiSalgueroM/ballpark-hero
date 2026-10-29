import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { build } from 'esbuild';
import { chromium } from '../lib/playwrightLoader.mjs';
const ROOT = process.cwd(), OUT = path.resolve(process.env.SC_LOYALTY_LOADING_OUT || 'loyalty-loading-artifacts');
const SOURCE = path.join(OUT, 'source'), WEB = path.join(OUT, 'web');
fs.mkdirSync(SOURCE, { recursive: true }); fs.mkdirSync(WEB, { recursive: true });
const sha = value => createHash('sha256').update(value).digest('hex');
assert(process.env.SC_LOYALTY_LOADING_MANIFEST, 'Selected immutable product manifest is required');
const selected = JSON.parse(fs.readFileSync(process.env.SC_LOYALTY_LOADING_MANIFEST, 'utf8'));
const held = () => Object.fromEntries(selected.files.map(row => {
  const body = fs.readFileSync(path.join(ROOT, row.path)); assert.equal(sha(body), row.sha256, row.path + ': selected product pin');
  return [row.path, sha(body)];
}));
const report = { scope: 'Actual copied selected SoccerCareer page plus one OfferCard observer export. Real named lazy adapter and local Suspense callsite. No full route, hook or persistence claim.', sourceBefore: held(), rows: [] };
const save = complete => fs.writeFileSync(path.join(OUT, 'outcomes.json'), JSON.stringify({ ...report, complete }, null, 2));
const pagePath = 'src/pages/SoccerCareer.tsx', original = fs.readFileSync(path.join(ROOT, pagePath), 'utf8');
assert.equal(original.split('function OfferCard(').length - 1, 1);
const suffix = '\nexport { OfferCard };\n', observer = path.join(SOURCE, 'observed-page.tsx');
const healthy = original + suffix;
const lazyFrom = 'const SoccerOfferReview = lazy(() => import("@/components/soccer-career/SoccerOfferReview").then(m => ({ default: m.SoccerOfferReview })));';
const eagerTo = 'import { SoccerOfferReview } from "@/components/soccer-career/SoccerOfferReview";';
const fallbackFrom = 'role="status" data-offer-review-loading', fallbackTo = 'data-owned-missing-review-status';
for (const anchor of [lazyFrom, fallbackFrom]) assert.equal(original.split(anchor).length - 1, 1);
report.sourceCopy = { pagePath, originalSha256: sha(original), observerSuffix: suffix, healthyObserverSha256: sha(healthy), copy: observer };
const fixture = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/careerLeagueWorldSaves1100.json'), 'utf8')).saves.find(row => row.id === 'ere')?.state;
assert(fixture);
const entry = path.join(SOURCE, 'app.tsx');
fs.writeFileSync(entry, [
  "import React, {useEffect,useRef,useState} from 'react';",
  "import {createRoot} from 'react-dom/client';",
  'import {OfferCard} from ' + JSON.stringify(observer) + ';',
  "import {acceptOffer} from '@/lib/soccerCareerEngine';",
  "import {chooseProgramme} from '@/lib/soccerCareerProgramme';",
  "import {buildSoccerOfferReview} from '@/lib/soccerOfferReview';",
  "import {readLoyalty} from '@/lib/soccerCareerLoyalty';",
  "import {setCurrency} from '@/lib/soccerCurrency';",
  "setCurrency('EUR');",
  "const offer={club:{id:'loading-fixture',name:'Generated Contract Club',country:'Fixture Country',league:'Fixture League',color:'#123456',tier:3},wage:10000,contractYears:2,transferFee:0};",
  "function initial(){const state=structuredClone(window.__LOYALTY_FIXTURE__);delete state.agentId;delete state.programme;delete state.loyaltyContracts;state.phase='contract_offer';state.retired=false;state.loan=null;state.currentClub='Previous Fixture Club';state.weeklyWage=8000;state.pendingOffers=[structuredClone(offer)];state.transferSituation=null;state.netWorth=2;state.totalEarnings=3;state.events=[];return chooseProgramme(state,'loyalty','loyalty');}",
  "function App(){const [career,change]=useState(initial),[shown,show]=useState(false),accepted=useRef(0);useEffect(()=>{window.__LOADING_STATE__=()=>({career,accepted:accepted.current,ledger:readLoyalty(career),review:buildSoccerOfferReview(career,offer)});},[career]);return <main className='mx-auto max-w-md space-y-3 p-3'><h1 className='text-xl font-bold'>Contract loading qualification</h1><button data-show-actual-offer className='min-h-11 min-w-11 rounded-lg border p-3' onClick={()=>show(true)}>Show actual offer</button>{shown&&<OfferCard offer={offer} career={career} onAccept={()=>{accepted.current++;change(previous=>acceptOffer(previous,offer));}}/>}</main>;}",
  "createRoot(document.getElementById('root')).render(<App/>);",
].join('\n'));
report.entrySha256 = sha(fs.readFileSync(entry));
const fonts = new Map(JSON.parse(fs.readFileSync(process.env.SC_LOYALTY_FONT_MANIFEST, 'utf8')).map(row => {
  const body = Buffer.from(fs.readFileSync(path.join(path.dirname(process.env.SC_LOYALTY_FONT_MANIFEST), row.file)));
  assert.equal(sha(body), row.sha256); return [row.url, { body, contentType: row.contentType, headers: { 'access-control-allow-origin': '*' } }];
}));
const template = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const fontTags = [...template.matchAll(/<link\s+href="https:\/\/fonts\.googleapis\.com\/[^\"]+"\s+rel="stylesheet"[^>]*>/g)].map(row => row[0]).join('');
const files = new Map(), assets = path.join(ROOT, 'dist/assets');
const css = fs.readdirSync(assets).filter(file => file.endsWith('.css'));
assert(css.length > 0);
for (const file of css) files.set('/assets/' + file, { body: Buffer.from(fs.readFileSync(path.join(assets, file))), contentType: 'text/css' });
const server = createServer((request, response) => {
  const file = files.get(new URL(request.url, 'http://localhost').pathname);
  if (!file) { response.writeHead(404); response.end(); return; }
  response.setHeader('Content-Type', file.contentType); response.end(file.body);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = 'http://127.0.0.1:' + server.address().port;
const browser = await chromium.launch({ headless: true });
const snapshot = page => page.evaluate(() => window.__LOADING_STATE__());
const focus = page => page.evaluate(() => ({ tag: document.activeElement?.tagName, label: document.activeElement?.getAttribute('aria-label'), text: document.activeElement?.textContent, scrollY }));
async function settleEntryAnimations(page, label) {
  const result = await page.evaluate(async () => {
    const dialog = document.querySelector('[role="dialog"]');
    if (!dialog) return { status: 'refused', reason: 'No actual dialog mounted', before: null, after: null };
    const active = () => dialog.getAnimations({ subtree: true }).filter(animation => {
      const end = animation.effect?.getComputedTiming().endTime;
      return typeof end === 'number' && Number.isFinite(end) && (animation.playState === 'running' || animation.pending);
    });
    const inspect = () => {
      const rect = dialog.getBoundingClientRect(), style = getComputedStyle(dialog);
      return {
        connected: dialog.isConnected,
        rect: { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height },
        transform: style.transform, width: style.width, height: style.height,
        animationName: style.animationName, animationDuration: style.animationDuration,
        animations: dialog.getAnimations({ subtree: true }).map(animation => {
          const timing = animation.effect?.getComputedTiming();
          return { name: animation.animationName ?? animation.transitionProperty ?? null,
            playState: animation.playState, pending: animation.pending, currentTime: animation.currentTime,
            endTime: typeof timing?.endTime === 'number' && Number.isFinite(timing.endTime) ? timing.endTime : String(timing?.endTime),
            progress: timing?.progress ?? null };
        }),
        targets: [...dialog.querySelectorAll('button')].map(element => {
          const box = element.getBoundingClientRect(), css = getComputedStyle(element);
          return { label: element.getAttribute('aria-label') || element.textContent,
            left: box.left, top: box.top, width: box.width, height: box.height,
            cssWidth: css.width, cssHeight: css.height, transform: css.transform };
        }),
        state: typeof window.__LOADING_STATE__ === 'function' ? window.__LOADING_STATE__() : null,
      };
    };
    const before = inspect(), started = performance.now();
    let timedOut = false, timer;
    const work = async () => {
      let previous, stableFrames = 0;
      while (!timedOut) {
        if (!dialog.isConnected || document.querySelector('[role="dialog"]') !== dialog) throw Error('Actual dialog changed while settling');
        const animations = active();
        if (animations.length) {
          await Promise.all(animations.map(animation => animation.finished.catch(() => undefined)));
          previous = undefined; stableFrames = 0; continue;
        }
        await new Promise(resolve => requestAnimationFrame(resolve));
        if (active().length) { previous = undefined; stableFrames = 0; continue; }
        const observed = inspect(), signature = JSON.stringify({ rect: observed.rect, transform: observed.transform, targets: observed.targets });
        stableFrames = signature === previous ? stableFrames + 1 : 0; previous = signature;
        if (stableFrames >= 2) return observed;
      }
      throw Error('Entry animation deadline elapsed');
    };
    try {
      const after = await Promise.race([work(), new Promise((resolve, reject) => {
        timer = setTimeout(() => {
          timedOut = true;
          const error = Error('Finite entry animations did not settle within2000ms'); error.name = 'TimeoutError'; reject(error);
        }, 2000);
      })]);
      return { status: 'settled', before, after, elapsedMs: performance.now() - started };
    } catch (error) {
      return { status: 'rejected', before, after: inspect(), elapsedMs: performance.now() - started,
        reason: { name: error.name, message: error.message } };
    } finally { timedOut = true; clearTimeout(timer); }
  });
  fs.writeFileSync(path.join(OUT, label + '.entry-animations.json'), JSON.stringify(result, null, 2));
  assert.equal(result.status, 'settled', label + ': actual finite entry animations completed and geometry stabilized');
  assert.deepEqual(result.after.state, result.before.state, label + ': entry observation changes no career state');
  return result;
}
async function retain(row, page, label) {
  row.lastURL = page.url(); row.captureErrors ||= [];
  try { row.lastState = await snapshot(page); } catch (error) { row.captureErrors.push('state: ' + error.message); }
  try { row.lastFocus = await focus(page); } catch (error) { row.captureErrors.push('focus: ' + error.message); }
  try { const body = await page.content(); row.html = label + '.html'; row.htmlSha256 = sha(body); fs.writeFileSync(path.join(OUT, row.html), body); } catch (error) { row.captureErrors.push('html: ' + error.message); }
  save(false);
  try { row.image = label + '.png'; await page.screenshot({ path: path.join(OUT, row.image), fullPage: false }); } catch (error) { row.captureErrors.push('png: ' + error.message); }
  save(false);
}
async function compile(variant, body) {
  fs.writeFileSync(observer, body);
  const directory = path.join(WEB, variant);
  const compiled = await build({ entryPoints: { app: entry }, outdir: directory, bundle: true, splitting: true, format: 'esm', platform: 'browser', target: 'es2022', jsx: 'automatic', nodePaths: [path.join(ROOT, 'node_modules')], alias: { '@': path.join(ROOT, 'src') }, define: { 'import.meta.env': '{}' }, metafile: true, logLevel: 'silent' });
  fs.writeFileSync(path.join(OUT, variant + '.bundle-inputs.json'), JSON.stringify(compiled.metafile, null, 2));
  const outputs = Object.entries(compiled.metafile.outputs), reviewFile = path.join(ROOT, 'src/components/soccer-career/SoccerOfferReview.tsx');
  const reviewOutputs = outputs.filter(([, output]) => Object.keys(output.inputs).some(input => path.resolve(ROOT, input) === reviewFile));
  assert.equal(reviewOutputs.length, 1, 'Actual emitted review module has one owner output');
  let reviewHref;
  const outputHashes = [];
  for (const [file] of outputs) {
    const absolute = path.resolve(ROOT, file), relative = path.relative(directory, absolute).split(path.sep).join('/');
    assert(!relative.startsWith('../'));
    const href = '/' + variant + '/' + relative, bytes = Buffer.from(fs.readFileSync(absolute));
    files.set(href, { body: bytes, contentType: file.endsWith('.css') ? 'text/css' : 'text/javascript' });
    outputHashes.push({ href, bytes: bytes.length, sha256: sha(bytes) });
    if (file === reviewOutputs[0][0]) reviewHref = href;
  }
  const html = '<!doctype html><html class="dark"><head><meta name="viewport" content="width=device-width,initial-scale=1">' + fontTags + css.map(file => '<link rel="stylesheet" href="/assets/' + file + '">').join('') + '</head><body class="bg-background text-foreground"><div id="root"></div><script type="module" src="/' + variant + '/app.js"></script></body></html>';
  files.set('/' + variant + '/', { body: Buffer.from(html), contentType: 'text/html' });
  return { reviewHref, observerSha256: sha(fs.readFileSync(observer)), outputHashes };
}
async function run(variant, width, mutation) {
  const body = mutation ? healthy.replace(mutation.from, mutation.to) : healthy;
  if (mutation) assert.notEqual(sha(body), sha(healthy));
  const row = { variant, width, status: 'STARTED', expectedOwnedFault: !!mutation, mutation, blocked: [], errors: [], requests: [], reviewRequests: [] };
  report.rows.push(row); save(false);
  let context, page, release = () => {}, hold = false;
  try {
    Object.assign(row, await compile(variant, body));
    assert.equal(row.observerSha256, sha(body));
    context = await browser.newContext({ viewport: { width, height: width === 320 ? 780 : 900 }, serviceWorkers: 'block' });
    const gate = new Promise(resolve => { release = resolve; });
    await context.route('**/*', async route => {
      const url = route.request().url(); row.requests.push(url);
      if (url.startsWith(base + '/')) {
        if (url === base + row.reviewHref) { row.reviewRequests.push({ url, held: hold }); if (hold) await gate; }
        return route.continue();
      }
      const cached = fonts.get(url); if (cached) return route.fulfill(cached);
      row.blocked.push(new URL(url).origin); return route.abort();
    });
    await context.addInitScript(value => { window.__LOYALTY_FIXTURE__ = value; let seed = 782611; Math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }; }, fixture);
    page = await context.newPage(); page.on('pageerror', error => row.errors.push(error.message));
    await page.goto(base + '/' + variant + '/'); await page.waitForFunction(() => typeof window.__LOADING_STATE__ === 'function');
    row.initial = await snapshot(page); row.initialReviewRequests = row.reviewRequests.length; save(false);
    assert.equal(row.initial.review.signedWage, 9000); assert.equal(row.initial.ledger.pending.bonusEuros, 156000); assert.equal(row.initial.accepted, 0);
    row.independentQuotePassed = true;
    let absenceFailure;
    try { assert.equal(row.initialReviewRequests, 0, 'Review chunk absent before actual OfferCard mount'); } catch (error) { absenceFailure = error; }
    if (mutation?.name === 'eager-review') {
      assert(absenceFailure && absenceFailure.name === 'AssertionError' && absenceFailure.message.includes('Review chunk absent'));
      row.expectedRejection = { name: absenceFailure.name, message: absenceFailure.message };
    } else assert.equal(absenceFailure, undefined);
    hold = mutation?.name !== 'eager-review';
    await page.locator('[data-show-actual-offer]').click(); await page.locator('[data-loyalty-offer]').first().waitFor();
    row.pending = await snapshot(page); save(false);
    assert.deepEqual(row.pending.career, row.initial.career); assert.equal(row.pending.accepted, 0);
    if (hold) {
      const fallback = page.locator('[data-offer-review-loading][role="status"]');
      let fallbackFailure;
      try { await fallback.waitFor({ timeout: 2000 }); } catch (error) { fallbackFailure = error; }
      row.heldRequestCount = row.reviewRequests.filter(request => request.held).length; save(false);
      assert.equal(row.heldRequestCount, 1, 'Actual named review chunk is physically held');
      if (mutation?.name === 'missing-fallback-status') {
        assert.equal(fallbackFailure?.name, 'TimeoutError');
        row.expectedRejection = { name: fallbackFailure.name, message: fallbackFailure.message };
      } else {
        assert.equal(fallbackFailure, undefined);
        row.fallback = await fallback.evaluate(element => { const box = element.getBoundingClientRect(); return { text: element.textContent, role: element.getAttribute('role'), height: box.height, width: box.width }; }); save(false);
        assert(row.fallback.height >= 43.5); assert.equal(await page.getByRole('button', { name: 'Sign contract', exact: true }).count(), 0);
      }
      await retain(row, page, variant + '-pending');
    }
    release(); hold = false;
    const label = 'Review contract with Generated Contract Club', trigger = page.getByRole('button', { name: label, exact: true });
    await trigger.waitFor(); assert.equal(await page.locator('[data-offer-review-loading]').count(), 0);
    row.independentLoadedReviewPassed = true;
    await trigger.scrollIntoViewIfNeeded(); const windowTop = await page.evaluate(() => scrollY);
    await trigger.click(); await page.locator('[data-soccer-offer-review]').waitFor();
    assert.equal(Number(await page.locator('[data-offer-signed-wage]').getAttribute('data-offer-signed-wage')), 9000);
    row.loadedEntryAnimations = await settleEntryAnimations(page, variant + '-loaded'); save(false);
    await retain(row, page, variant + '-loaded');
    await page.getByRole('button', { name: 'Back', exact: true }).click(); row.immediateCloseFocus = await focus(page); save(false);
    await page.waitForFunction(value => { const button = [...document.querySelectorAll('button')].find(element => element.getAttribute('aria-label') === value); return !!button && document.activeElement === button; }, label, { timeout: 2000 });
    row.eventualCloseFocus = await focus(page); save(false);
    assert(await trigger.evaluate(element => document.activeElement === element)); assert.equal(await page.evaluate(() => scrollY), windowTop);
    assert.deepEqual((await snapshot(page)).career, row.initial.career);
    if (!mutation) {
      await trigger.click(); await page.getByRole('button', { name: 'Sign contract', exact: true }).click();
      await page.waitForFunction(() => window.__LOADING_STATE__().accepted === 1 && window.__LOADING_STATE__().ledger?.deals[0]?.status === 'active');
      row.signed = await snapshot(page); save(false);
      assert.equal(row.signed.career.weeklyWage, 9000); assert.equal(row.signed.career.currentClub, 'Generated Contract Club'); assert.equal(row.signed.accepted, 1);
      await trigger.click(); const stale = page.getByRole('button', { name: 'Sign contract', exact: true }); assert(await stale.isDisabled());
      await stale.evaluate(element => element.click()); assert.deepEqual(await snapshot(page), row.signed);
      row.staleEntryAnimations = await settleEntryAnimations(page, variant + '-signed-once'); save(false);
      await retain(row, page, variant + '-signed-once');
    }
    assert.deepEqual(row.blocked, []); assert.deepEqual(row.errors, []);
    row.status = mutation ? 'EXPECTED_REJECTION' : 'PASSED'; save(false);
  } catch (error) {
    row.status = 'FAILED'; row.failure = { name: error.name, message: error.message, stack: error.stack };
    if (page) await retain(row, page, variant + '-failure'); else row.captureErrors = ['Page was not created']; save(false); throw error;
  } finally { release(); await context?.close(); }
}
try {
  await run('normal320', 320); await run('normal1280', 1280);
  await run('eager-review-fault', 320, { name: 'eager-review', from: lazyFrom, to: eagerTo });
  await run('restored-eager-review', 320); assert.equal(sha(fs.readFileSync(observer)), sha(healthy));
  await run('missing-fallback-status-fault', 320, { name: 'missing-fallback-status', from: fallbackFrom, to: fallbackTo });
  await run('restored-fallback-status', 320); assert.equal(sha(fs.readFileSync(observer)), sha(healthy));
  assert.equal(report.rows.length, 6); assert.equal(report.rows.filter(row => row.status === 'EXPECTED_REJECTION').length, 2); assert.equal(report.rows.filter(row => row.status === 'PASSED').length, 4);
  report.sourceAfter = held(); assert.deepEqual(report.sourceAfter, report.sourceBefore); save(true);
  console.log('Actual OfferCard lazy boundary:2normal widths320/1280,2physical pagecopy faults,2samecopy restorations.');
  console.log('Actual emitted review chunk absent initially, physically held,44px fallback and no acceptance while pending.');
  console.log('Actual chunk released, review opened/closed with exact eventual focus+scroll, restored copies signed once.');
  console.log('Independent quoted pay and loaded review held on both faulty copies; selected sources held.');
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }