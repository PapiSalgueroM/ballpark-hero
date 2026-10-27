/* Remote-only component pixels. Actual LoanPlanCard, engine actions, adapter and saveCareer. */
import '../lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { build } from 'esbuild';
import pw from '../lib/playwrightLoader.mjs';

assert(process.env.CI, 'Remote CI only');
const ROOT = process.cwd(), OUT = path.resolve(process.env.CM_LOAN_PLAN_ARTIFACTS || '');
assert(process.env.CM_LOAN_PLAN_ARTIFACTS);
const folder = path.join(OUT, 'card-browser'); fs.mkdirSync(folder, { recursive: true });
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const meta = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/qa/cmLoanPlanSource.json'), 'utf8'));
const held = () => Object.fromEntries(meta.fixed.map(file => [file.path, hash(fs.readFileSync(path.join(ROOT, file.path)))]));
const report = { coverage: 'Actual LoanPlanCard in an isolated component frame, real loan/recall/calendar adapter and saveCareer. Production CSS/fonts. No full route, TransferScreen, hook phase/slot gates, complete suite or cold-download acceptance.',
  sourceBefore: held(), profiles: [], controls: [], controlAttempts: [], forwardedExternalRequests: 0 };
for (const file of meta.fixed) assert.equal(report.sourceBefore[file.path], file.sha256, 'Selected source body');
const save = () => fs.writeFileSync(path.join(folder, 'report.json'), JSON.stringify(report, null, 2));
save();
const client = [
  "import React, { useState } from 'react';",
  "import { createRoot } from 'react-dom/client';",
  "import { LoanPlanCard } from '@/components/club-manager/LoanPlanCard';",
  "import { SAVE_KEY, startCareer, loadCareer, saveCareer, loanOutFee, loanOutRefusal, playNextEntry } from '@/lib/clubManager';",
  "import { loanPlanHosts, loanPlanPreview } from '@/lib/clubManagerLoanPlan';",
  "let live = loadCareer();",
  "if (!live) { live = startCareer('Everton'); if (!saveCareer(live)) throw Error('Actual fixture save failed'); }",
  "let adopt;",
  "function commit(next) { if (!next || !saveCareer(next)) return false; live = next; adopt(next); return true; }",
  "window.__loanPlanProof = {",
  "  state: () => JSON.parse(JSON.stringify(live)),",
  "  disk: () => JSON.parse(localStorage.getItem(SAVE_KEY)),",
  "  rawDisk: () => localStorage.getItem(SAVE_KEY),",
  "  candidate: () => {",
  "    const hosts = loanPlanHosts(live), ordered = ['Ajax', ...hosts.filter(host => host !== 'Ajax')];",
  "    for (const player of live.squad) if (player.position !== 'GK' && loanOutRefusal(live, player.id) === null)",
  "      for (const host of ordered) if (hosts.includes(host) && loanPlanPreview(live, player.id, host, 'standard'))",
  "        return { id: player.id, name: player.name, host, rating: player.rating, fee: loanOutFee(player) };",
  "    throw Error('No actual eligible covered host/player fixture');",
  "  },",
  "  advance: () => { const result = playNextEntry(live, { skipHalftime: true });",
  "    if (!['match', 'window'].includes(result.kind)) throw Error('Unexpected actual calendar endpoint: ' + result.kind);",
  "    if (!commit(result.state)) throw Error('Actual calendar save failed'); return result.kind; },",
  "};",
  "function Frame() { const [career, setCareer] = useState(live); adopt = setCareer;",
  "  return <LoanPlanCard career={career} onCommit={make => commit(make(live))} />; }",
  "createRoot(document.getElementById('loan-plan-root')).render(<Frame />);",
].join('\n');
fs.writeFileSync(path.join(folder, 'client.tsx'), client);
const built = await build({ stdin: { contents: client, resolveDir: ROOT, sourcefile: 'loan-plan-card-client.tsx', loader: 'tsx' },
  bundle: true, write: false, platform: 'browser', format: 'esm', jsx: 'automatic', alias: { '@': path.join(ROOT, 'src') },
  define: { 'process.env.NODE_ENV': '"production"', 'import.meta.env': '{}' }, logLevel: 'error' });
const bundle = Buffer.from(built.outputFiles[0].contents);
fs.writeFileSync(path.join(folder, 'client.js'), bundle); report.clientBundleSha256 = hash(bundle);
const template = fs.readFileSync(path.join(ROOT, 'dist/index.html'), 'utf8');
const head = template.match(/<head[^>]*>([\s\S]*?)<\/head>/i)?.[1]; assert(head);
const styles = head.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
  .replace(/<link\b[^>]*rel=["']modulepreload["'][^>]*>/gi, '');
const html = '<!doctype html><html class="dark"><head>' + styles + '</head><body class="bg-background text-foreground"><main id="loan-plan-frame" class="mx-auto max-w-4xl p-3"><div id="loan-plan-root"></div></main><script type="module" src="/__loan-plan/client.js"></script></body></html>';
fs.writeFileSync(path.join(folder, 'frame.html'), html); report.frameSha256 = hash(html);
const cache = path.resolve(process.env.FREE_KICK_FONT_CACHE || path.join(OUT, 'font-cache'));
const fonts = new Map(JSON.parse(fs.readFileSync(path.join(cache, 'manifest.json'), 'utf8')).map(entry => {
  assert(['https://fonts.googleapis.com', 'https://fonts.gstatic.com'].includes(new URL(entry.url).origin));
  assert(/^[a-f0-9]{64}$/.test(entry.file));
  const body = fs.readFileSync(path.join(cache, entry.file)); assert.equal(hash(body), entry.sha256);
  return [entry.url, { body, contentType: entry.contentType, headers: { 'access-control-allow-origin': '*' } }];
}));
const port = await new Promise((resolve, reject) => {
  const probe = createServer(); probe.once('error', reject);
  probe.listen(0, '127.0.0.1', () => { const port = probe.address().port; probe.close(error => error ? reject(error) : resolve(port)); });
});
const BASE = 'http://127.0.0.1:' + port;
const server = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', 'dist', String(port)],
  { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
let browser, serverLog = '';
const ready = new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(Error('Owned server not ready: ' + serverLog)), 15000);
  server.once('error', error => { clearTimeout(timer); reject(error); });
  server.once('exit', code => { clearTimeout(timer); reject(Error('Owned server exited ' + code)); });
  server.stdout.on('data', data => { serverLog += data; if (String(data).includes('host-like server:')) { clearTimeout(timer); resolve(); } });
  server.stderr.on('data', data => { serverLog += data; });
});
async function measure(page) {
  const requested = page.viewportSize();
  assert(requested && requested.width > 0, 'The actual requested Playwright viewport exists');
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const measured = await page.locator('#loan-plan-root').evaluate(root => {
    const frame = root.closest('#loan-plan-frame').getBoundingClientRect();
    return {
      viewport: innerWidth, scrollWidth: document.documentElement.scrollWidth,
      frame: { x: frame.x, right: frame.right, width: frame.width },
      controls: [...root.querySelectorAll('button,select')].filter(el => el.getClientRects().length).map(el => {
        const rect = el.getBoundingClientRect();
        return { text: el.getAttribute('aria-label') || el.textContent, x: rect.x, right: rect.right, height: rect.height };
      }),
    };
  });
  return { ...measured, requestedViewport: requested.width };
}
function geometry(value) {
  assert(value.controls.length > 0, 'Actual card controls are measured');
  assert(value.viewport <= value.requestedViewport + 1 && value.scrollWidth <= value.requestedViewport + 1
    && value.frame.x >= -0.75 && value.frame.right <= value.requestedViewport + 0.75,
    'No horizontal component overflow at the requested viewport');
  assert(value.scrollWidth <= value.viewport + 1, 'No horizontal component overflow');
  assert(value.controls.every(control => control.height >= 43.5 && control.right - control.x >= 43.5), 'Every card control retains a44px touch target');
  assert(value.controls.every(control => control.x >= -0.75 && control.right <= value.viewport + 0.75), 'Every card control fits the viewport');
}
try {
  await ready; browser = await pw.chromium.launch({ headless: true });
  for (const viewport of [{ width: 320, height: 780 }, { width: 390, height: 844 }, { width: 1280, height: 900 }]) {
    const id = String(viewport.width), row = { id, viewport, errors: [], assetErrors: [], blocked: [], requests: [], states: {}, disks: {}, snapshots: [], measurements: {} };
    report.profiles.push(row); save();
    const context = await browser.newContext({ viewport, isMobile: viewport.width < 600, hasTouch: viewport.width < 600,
      colorScheme: 'dark', reducedMotion: 'reduce', serviceWorkers: 'block' });
    await context.addInitScript(() => {
      let seed = 1079;
      Math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
      Date.now = () => 1791360000000;
    });
    await context.route('**/*', route => {
      const request = route.request(), url = new URL(request.url()); row.requests.push({ method: request.method(), url: url.href });
      if (!['GET', 'HEAD'].includes(request.method())) { row.blocked.push(url.href); return route.fulfill({ status: 405, body: '' }); }
      if (url.origin === BASE) {
        if (url.pathname === '/__loan-plan/card') return route.fulfill({ contentType: 'text/html', body: html });
        if (url.pathname === '/__loan-plan/client.js') return route.fulfill({ contentType: 'text/javascript', body: bundle });
        if (url.pathname === '/favicon.ico') return route.fulfill({ status: 204, body: '' });
        return route.continue();
      }
      if (fonts.has(url.href)) return route.fulfill({ status: 200, ...fonts.get(url.href) });
      row.blocked.push(url.href); return route.fulfill({ status: 204, body: '' });
    });
    const page = await context.newPage();
    page.on('pageerror', error => row.errors.push(String(error)));
    page.on('console', message => { if (message.type() === 'error') row.errors.push(message.text()); });
    page.on('requestfailed', request => row.errors.push(request.url() + ': ' + request.failure()?.errorText));
    page.on('response', response => { if (response.url().startsWith(BASE) && response.status() >= 400) row.assetErrors.push(response.status() + ' ' + response.url()); });
    const capture = async label => {
      const state = await page.evaluate(() => window.__loanPlanProof.state());
      row.states[label] = state;
      fs.writeFileSync(path.join(folder, id + '-' + label + '.json'), JSON.stringify(state, null, 2)); save();
      const rawDisk = await page.evaluate(() => window.__loanPlanProof.rawDisk());
      row.disks[label] = rawDisk;
      fs.writeFileSync(path.join(folder, id + '-' + label + '.disk.txt'), rawDisk ?? 'null'); save();
      assert.deepEqual(await page.evaluate(() => window.__loanPlanProof.disk()), state, 'Actual save equals rendered career');
      row.measurements[label] = await measure(page); geometry(row.measurements[label]);
      const image = id + '-' + label + '.png'; await page.screenshot({ path: path.join(folder, image), fullPage: true, animations: 'disabled' });
      row.snapshots.push(image); save(); return state;
    };
    try {
      await page.goto(BASE + '/__loan-plan/card', { waitUntil: 'domcontentloaded' });
      await page.getByRole('button', { name: /^Loan plan/ }).waitFor();
      await page.evaluate(async () => { await document.fonts.ready; await Promise.all(['Inter', 'Space Grotesk'].map(font => document.fonts.load('400 16px "' + font + '"'))); });
      row.fonts = await page.evaluate(() => ['Inter', 'Space Grotesk'].map(name => ({ name,
        checked: document.fonts.check('400 16px "' + name + '"'),
        loaded: [...document.fonts].some(face => face.family.replaceAll('"', '').includes(name) && face.status === 'loaded') })));
      assert(row.fonts.every(font => font.checked && font.loaded), 'Production fonts actually loaded');
      const initial = await capture('closed'), candidate = await page.evaluate(() => window.__loanPlanProof.candidate());
      row.candidate = candidate;
      await page.getByRole('button', { name: /^Loan plan/ }).click();
      assert.equal(await page.getByTestId('loan-plan-rules').isVisible(), true, 'Rules shown before first action');
      assert.equal(await page.getByRole('button', { name: 'Confirm loan plan' }).count(), 0);
      await capture('rules');
      await page.getByLabel('Loan plan player').selectOption(candidate.id);
      await page.getByLabel('Loan plan host').selectOption(candidate.host);
      await page.getByRole('button', { name: 'Preview terms', exact: true }).click();
      const preview = page.getByTestId('loan-plan-preview'); await preview.waitFor();
      assert.equal(await preview.getAttribute('data-player'), candidate.id);
      assert.equal(await preview.getAttribute('data-host'), candidate.host);
      assert((await preview.innerText()).includes('Projected opportunity:'));
      assert.deepEqual(await capture('preview'), initial, 'Preview changes no actual career or save');
      if (viewport.width === 320) {
        for (const control of [
          { name: 'touch', css: '#loan-plan-root button,#loan-plan-root select{min-height:18px!important;height:18px!important;padding-top:0!important;padding-bottom:0!important}', error: /44px touch target/ },
          { name: 'touch-width', css: '#loan-plan-root button[aria-label="Loan plan rules"]{min-width:18px!important;width:18px!important;padding-left:0!important;padding-right:0!important}', error: /44px touch target/ },
          { name: 'overflow', css: '#loan-plan-frame{width:calc(100vw + 90px)!important;max-width:none!important}', error: /horizontal component overflow/ },
        ]) {
          const css = Buffer.from(control.css); fs.writeFileSync(path.join(folder, 'control-' + control.name + '.css'), css);
          const before = await measure(page), observation = { name: control.name, cssSha256: hash(css), before };
          report.controlAttempts.push(observation);
          const retain = () => {
            fs.writeFileSync(path.join(folder, 'control-' + control.name + '.geometry.json'), JSON.stringify(observation, null, 2)); save();
          };
          retain(); geometry(before);
          const style = await page.addStyleTag({ content: control.css });
          let changed, restored;
          try {
            changed = await measure(page); observation.changed = changed;
            observation.appliedCSS = await style.textContent(); retain();
            assert.equal(observation.appliedCSS, control.css, 'The exact copied physical style is applied');
            assert.notDeepEqual(changed, before, 'Copied visual control physically changes measured geometry');
            if (control.name === 'overflow') assert(changed.frame.width > before.frame.width + 1
              && changed.frame.right > changed.requestedViewport + 1, 'The physical copied frame exceeds the requested viewport');
            assert.throws(() => geometry(changed), control.error, 'Intended visual failure');
            await page.screenshot({ path: path.join(folder, 'control-' + control.name + '.png'), fullPage: true });
          } catch (error) {
            observation.failure = String(error.stack || error); retain(); throw error;
          } finally {
            await style.evaluate(el => el.remove()); restored = await measure(page); observation.restored = restored; retain();
            geometry(restored); assert.deepEqual(restored, before, 'Exact geometry restored after copied style removal');
          }
          report.controls.push({ name: control.name, cssSha256: hash(css), classifierStatuses: [0, 1, 0], before, changed, restored }); save();
        }
      }
      await page.getByRole('button', { name: 'Confirm loan plan', exact: true }).click();
      await page.getByTestId('loan-plan-active').waitFor();
      const active = await capture('active'), loan = active.loanedOut.find(value => value.player.id === candidate.id);
      assert(loan?.development); assert.equal(loan.club, candidate.host); assert.equal(loan.fee, candidate.fee);
      assert.equal(active.budget, Math.round((initial.budget + candidate.fee) * 10) / 10);
      assert.equal(loan.player.rating, candidate.rating);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.getByRole('button', { name: /^Loan plan/ }).click();
      assert.deepEqual(await capture('reloaded-active'), active, 'Actual loadCareer preserves the saved plan');
      const week = active.week; row.calendarKind = await page.evaluate(() => window.__loanPlanProof.advance());
      await page.waitForFunction(before => window.__loanPlanProof.state().week > before, week);
      const advanced = await page.evaluate(() => window.__loanPlanProof.state());
      assert(!advanced.wilderness && advanced.transferWindow !== null, 'Actual legal club calendar leaves recall window open');
      await page.getByRole('button', { name: 'Review loan plan', exact: true }).click();
      const reviewed = await capture('reviewed'), reviewedLoan = reviewed.loanedOut.find(value => value.player.id === candidate.id);
      assert.equal(reviewedLoan.development.review.week, reviewed.week);
      assert.equal(reviewedLoan.development.review.ratingChange, reviewedLoan.player.rating - loan.development.ratingAtStart);
      assert.equal(reviewed.loanPlanHistory.length, 1);
      assert.equal(reviewed.loanPlanHistory[0].kind, 'check-in');
      assert.equal(reviewed.loanPlanHistory[0].observedWeek, reviewed.week);
      assert.equal(reviewed.loanPlanHistory[0].rating, reviewedLoan.player.rating);
      const projected = JSON.parse(JSON.stringify(reviewed));
      delete projected.loanedOut.find(value => value.player.id === candidate.id).development.review;
      delete projected.loanPlanHistory;
      assert.deepEqual(projected, advanced, 'Review changes only the actual one-loan review and recorded check-in');
      const recallFee = reviewedLoan.recallFee; assert(Number.isFinite(recallFee));
      await page.getByRole('button', { name: 'Recall planned player', exact: true }).click();
      await page.getByTestId('loan-plan-history').waitFor();
      const recalled = await capture('recalled');
      assert(!recalled.loanedOut.some(value => value.player.id === candidate.id));
      assert(recalled.squad.some(value => value.id === candidate.id));
      assert.equal(recalled.budget, Math.round((reviewed.budget - recallFee) * 10) / 10);
      assert.equal(recalled.loanPlanHistory.length, 2);
      assert.deepEqual(recalled.loanPlanHistory.map(row => row.kind), ['check-in', 'recalled']);
      assert.deepEqual(recalled.loanPlanHistory[0], reviewed.loanPlanHistory[0]);
      await page.reload({ waitUntil: 'domcontentloaded' }); await page.getByRole('button', { name: /^Loan plan/ }).click();
      assert.deepEqual(await capture('reloaded-history'), recalled);
      await page.getByRole('button', { name: 'Loan plan rules', exact: true }).click();
      assert.equal(await page.getByTestId('loan-plan-rules').count(), 0);
      await page.getByRole('button', { name: 'Loan plan rules', exact: true }).click();
      assert.equal(await page.getByTestId('loan-plan-rules').isVisible(), true);
      await page.getByRole('button', { name: 'Back from loan plan', exact: true }).click();
      assert.equal(await page.getByTestId('loan-plan-body').count(), 0);
      assert.equal(await page.getByRole('button', { name: /^Loan plan/ }).evaluate(el => document.activeElement === el), true);
      assert.deepEqual(await capture('closed-after-play'), recalled);
      assert.deepEqual(row.errors, []); assert.deepEqual(row.assetErrors, []); assert.deepEqual(row.blocked, []);
      row.status = 'PASS';
    } catch (error) {
      row.status = 'FAIL'; row.failure = String(error.stack || error);
      row.failureObservation = { url: page.url() };
      try { row.failureObservation.state = await page.evaluate(() => window.__loanPlanProof
        ? window.__loanPlanProof.state() : { unavailable: 'Fixture client has not exposed state' }); }
      catch (readError) { row.failureObservation.stateReadError = String(readError); }
      try { row.failureObservation.disk = await page.evaluate(() => ({
        raw: window.__loanPlanProof?.rawDisk?.() ?? null, storage: Object.fromEntries(Object.entries(localStorage)),
      })); } catch (readError) { row.failureObservation.diskReadError = String(readError); }
      try {
        const actualHTML = await page.content(), file = id + '-failure.html';
        fs.writeFileSync(path.join(folder, file), actualHTML);
        row.failureObservation.html = { file, sha256: hash(actualHTML) };
      } catch (readError) { row.failureObservation.htmlReadError = String(readError); }
      fs.writeFileSync(path.join(folder, id + '-failure.json'), JSON.stringify(row.failureObservation, null, 2)); save();
      await page.screenshot({ path: path.join(folder, id + '-failure.png'), fullPage: true }).catch(() => {});
      throw error;
    } finally { save(); await context.close(); }
  }
  assert.equal(report.profiles.length, 3); assert.equal(report.controls.length, 3);
  assert(report.profiles.every(row => row.status === 'PASS'));
  report.status = 'PASS';
  console.log('Loan plan card:3actual mounted profiles, save/reload/review/recall and3effective visual controls passed.');
} finally {
  await browser?.close(); server.kill(); report.sourceAfter = held();
  fs.writeFileSync(path.join(folder, 'host.log'), serverLog); save();
  assert.deepEqual(report.sourceAfter, report.sourceBefore, 'Every selected source body held across component proof');
}
