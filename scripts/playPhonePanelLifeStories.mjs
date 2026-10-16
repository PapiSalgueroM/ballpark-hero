/* Remote served-phone presentation, using the normal proof's actual choice outcomes.
 * Queues and hub phase are prepared. This does not claim natural event delivery.
 */
import './lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import pw from './lib/playwrightLoader.mjs';
import { seedPages } from './lib/pageSeed.mjs';

assert(process.env.CI && process.env.SIM_NETWORK === 'offline', 'Browser proof is remote and offline only');
assert.equal(process.env.LIFE_STORIES_PHASE, 'fixed');
assert(process.env.LIFE_STORIES_OUT && path.isAbsolute(process.env.LIFE_STORIES_OUT));
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(process.env.LIFE_STORIES_OUT, 'browser');
const BASE = (process.env.BASE || process.env.SWEEP_BASE || 'http://127.0.0.1:4173').replace(/\/$/, '');
assert(['127.0.0.1', 'localhost', '[::1]'].includes(new URL(BASE).hostname), 'Only a served loopback build is permitted');
const fixturePath = path.join(process.env.LIFE_STORIES_OUT, 'browser-fixtures.json');
const proof = JSON.parse(fs.readFileSync(path.join(process.env.LIFE_STORIES_OUT, 'proof.json'), 'utf8'));
const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const fixtureHash = sha(fs.readFileSync(fixturePath));
const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
assert.equal(proof.status, 'complete'); assert.equal(proof.head, head); assert.equal(fixture.head, head);
assert.equal(proof.fixture.sha256, fixtureHash);
const STORIES = [['Esports team', 'Results not checked'], ['Cursed boots', 'Still wearing them'],
  ['Teammate loan', 'Repayment unresolved'], ['Coaching course', 'Coursework not reviewed'], ['Documentary', 'Footage not reviewed']];
const PROFILES = [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 430, height: 932 },
  { width: 1280, height: 800 }, { width: 1440, height: 900 }];
const legacy = structuredClone(fixture.acquired); delete legacy.lifeFlags;
const states = { acquired: fixture.acquired, resolved: fixture.resolved, legacy };
fs.mkdirSync(OUT, { recursive: true });
const reportPath = path.join(OUT, 'report.json'); assert(!fs.existsSync(reportPath), 'Evidence cannot be overwritten');
const report = { status: 'running', head, fixtureSha256: fixtureHash, cases: [], controls: [],
  limits: ['Prepared saved hub presentation from actual catalog choice outcomes, not natural picker delivery.',
    'Only the phone Life screen and its navigation are covered. External services, flag images and fonts are blocked; screenshots use fallback fonts.',
    'The two controls change rendered DOM only. Original component causality is independently established by the unit proof.'] };
const write = () => fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
const distInventory = directory => fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
  const file = path.join(directory, entry.name);
  return entry.isDirectory() ? distInventory(file) : [[path.relative(ROOT, file), sha(fs.readFileSync(file))]];
}).sort((a, b) => a[0].localeCompare(b[0]));
const distBefore = distInventory(path.join(ROOT, 'dist'));
const browser = await pw.chromium.launch();
write();
try {
  for (const profile of PROFILES) for (const [name, state] of Object.entries(states)) {
    const row = { name, profile, status: 'running', errors: [], diagnostics: [], checks: [] }; report.cases.push(row); write();
    const context = await browser.newContext({ viewport: profile, reducedMotion: 'reduce', colorScheme: 'dark', serviceWorkers: 'block',
      storageState: { cookies: [], origins: [{ origin: BASE, localStorage: [{ name: 'soccerCareerSave', value: JSON.stringify(state) },
        { name: 'cookie-consent', value: 'essential' }, { name: 'dukb-theme', value: 'dark' }, { name: 'dukb-guest-handle', value: 'SteadyVolley-18' }] }] } });
    try {
      const aborted = new Set();
      await context.route('**/*', route => {
        const request = route.request(), url = new URL(request.url());
        if (url.origin === BASE && ['GET', 'HEAD'].includes(request.method())) return route.continue();
        aborted.add(request.url()); return route.abort('blockedbyclient');
      });
      await context.routeWebSocket('**/*', socket => socket.close());
      await seedPages(context, 1377);
      const page = await context.newPage(); page.setDefaultTimeout(20000);
      page.on('pageerror', error => row.errors.push(String(error)));
      page.on('console', message => {
        if (message.type() !== 'error') return;
        if (/Failed to load resource.*(?:ERR_FAILED|ERR_BLOCKED_BY_CLIENT)/.test(message.text()) && aborted.has(message.location().url)) row.diagnostics.push(message.text());
        else row.errors.push(message.text());
      });
      page.on('response', response => { if (new URL(response.url()).origin === BASE && response.status() >= 400) row.errors.push('Owned asset ' + response.status() + ': ' + response.url()); });
      const check = (condition, label) => { row.checks.push(label); assert(condition, name + ' ' + profile.width + ': ' + label); };
      await page.goto(BASE + '/soccer-career', { waitUntil: 'networkidle' });
      const opener = page.locator('[data-career-utility="phone"]'); await opener.waitFor({ state: 'visible' });
      const raw = () => page.evaluate(() => localStorage.getItem('soccerCareerSave'));
      const held = await raw(); check(held !== null, 'actual mounted save exists');
      await opener.click();
      const dialog = page.getByRole('dialog', { name: 'Your phone', exact: true }); await dialog.waitFor();
      const originScroll = await page.evaluate(() => [scrollX, scrollY]);
      const lifeTile = dialog.locator('[data-phone-app="life"]'); await lifeTile.click();
      const region = dialog.getByRole('region', { name: 'Ongoing stories', exact: true });
      const back = dialog.locator('[data-phone-back]');
      check(await back.count() === 1, 'one stable Back control');
      const inspect = () => dialog.evaluate(element => {
        const box = element.getBoundingClientRect();
        const region = element.querySelector('[aria-label="Ongoing stories"]');
        const body = region?.parentElement;
        const rows = region ? [...region.querySelectorAll('li')].map(node => {
          const bounds = node.getBoundingClientRect(); return { text: node.textContent, left: bounds.left, right: bounds.right,
            width: node.clientWidth, scrollWidth: node.scrollWidth };
        }) : [];
        return { left: box.left, right: box.right, top: box.top, bottom: box.bottom, viewport: [innerWidth, innerHeight],
          pageWidth: document.documentElement.scrollWidth, pageClient: document.documentElement.clientWidth,
          width: element.clientWidth, scrollWidth: element.scrollWidth,
          visible: !!region && getComputedStyle(region).display !== 'none' && region.getBoundingClientRect().height > 0,
          bodyWidth: body?.clientWidth, bodyScroll: body?.scrollWidth, rows, parentScroll: [scrollX, scrollY] };
      });
      if (name === 'acquired') {
        await region.waitFor({ state: 'visible' });
        check(await region.getByRole('listitem').count() === 5, 'all five actual ongoing stories');
        for (const [title, status] of STORIES) {
          check(await region.getByText(title, { exact: true }).isVisible(), 'title ' + title);
          check(await region.getByText(status, { exact: true }).isVisible(), 'status ' + status);
        }
        row.geometry = await inspect();
        check(row.geometry.visible && row.geometry.rows.length === 5, 'visible nonempty story region');
        check(row.geometry.bodyScroll <= row.geometry.bodyWidth + 1, 'story body has no sideways overflow');
        check(row.geometry.rows.every(box => box.left >= row.geometry.left && box.right <= row.geometry.right), 'story rows stay inside phone');
        check(row.geometry.rows.every(box => box.scrollWidth <= box.width + 1), 'story text is not horizontally clipped');
        await page.screenshot({ path: path.join(OUT, name + '-' + profile.width + '-top.png') });
        const body = region.locator('..');
        await body.evaluate(element => { element.scrollTop = element.scrollHeight; });
        row.innerScroll = await body.evaluate(element => ({ top: element.scrollTop, height: element.clientHeight, content: element.scrollHeight }));
        check(row.innerScroll.content <= row.innerScroll.height + 1 || row.innerScroll.top > 0, 'overflow remains reachable inside phone');
        const reachability = () => body.evaluate(element => {
          const last = element.querySelector('li:last-child').getBoundingClientRect();
          let top = 0, bottom = innerHeight; const clips = [];
          for (let node = element; node; node = node.parentElement) {
            if (!['auto', 'scroll', 'hidden', 'clip'].includes(getComputedStyle(node).overflowY)) continue;
            const box = node.getBoundingClientRect();
            const edge = { top: box.top + node.clientTop, bottom: box.top + node.clientTop + node.clientHeight };
            clips.push(edge); top = Math.max(top, edge.top); bottom = Math.min(bottom, edge.bottom);
          }
          return { last: { top: last.top, bottom: last.bottom, height: last.height }, top, bottom, clips,
            reachable: last.height > 0 && last.top >= top - 0.5 && last.bottom <= bottom + 0.5 };
        });
        row.reachability = await reachability();
        check(row.reachability.reachable, 'last story fits within every clipping ancestor after inner scroll');
        await page.screenshot({ path: path.join(OUT, name + '-' + profile.width + '-bottom.png') });
        if (profile.width === 320) {
          const previous = await region.getAttribute('style');
          const heldRegion = await region.elementHandle();
          await heldRegion.evaluate(element => { element.style.display = 'none'; });
          check((await inspect()).visible === false, 'hidden-region control actually removes visible stories');
          report.controls.push({ kind: 'hidden-region', fired: true });
          await heldRegion.evaluate((element, style) => { if (style === null) element.removeAttribute('style'); else element.setAttribute('style', style); }, previous);
          const first = region.getByRole('listitem').first(), oldStyle = await first.getAttribute('style');
          await first.evaluate(element => { element.style.minWidth = '2000px'; });
          const control = await inspect(); check(control.bodyScroll > control.bodyWidth + 100, 'overflow control changes measured layout');
          report.controls.push({ kind: 'horizontal-overflow', fired: true });
          await first.evaluate((element, style) => { if (style === null) element.removeAttribute('style'); else element.setAttribute('style', style); }, oldStyle);
          check((await inspect()).bodyScroll <= (await inspect()).bodyWidth + 1, 'layout restored after DOM controls');
          const oldBody = await body.getAttribute('style');
          await body.evaluate(element => { element.style.minHeight = '2000px'; element.scrollTop = element.scrollHeight; });
          const clipped = await reachability(); check(!clipped.reachable, 'expanded-body control actually clips the last story');
          report.controls.push({ kind: 'vertical-clipping', fired: true, measured: clipped });
          await body.evaluate((element, style) => { if (style === null) element.removeAttribute('style'); else element.setAttribute('style', style); element.scrollTop = element.scrollHeight; }, oldBody);
          check((await reachability()).reachable, 'last story reachable after clipping control restoration');
        }
      } else {
        check(await region.count() === 0, 'no story section for ' + name + ' flags');
        check(await dialog.getByText(/how the public sees you/).isVisible(), 'existing Life meter remains visible');
        row.geometry = await inspect();
        await page.screenshot({ path: path.join(OUT, name + '-' + profile.width + '.png') });
      }
      const geometry = await inspect();
      check(geometry.left >= 0 && geometry.right <= profile.width + 0.5 && geometry.top >= 0 && geometry.bottom <= profile.height + 0.5, 'phone frame stays in viewport');
      check(geometry.pageWidth <= geometry.pageClient + 1 && geometry.scrollWidth <= geometry.width + 1, 'no page or phone horizontal bleed');
      check(JSON.stringify(geometry.parentScroll) === JSON.stringify(originScroll), 'Life scrolling holds parent page position');
      const backBox = await back.boundingBox(); check(backBox && backBox.width >= 44 && backBox.height >= 44, 'Back meets existing 44px phone target');
      await back.click(); check(await lifeTile.evaluate(element => element === document.activeElement), 'Back returns focus to Life');
      await lifeTile.press('Enter'); await back.waitFor();
      check(await region.count() === (name === 'acquired' ? 1 : 0), 'keyboard reopen reads the same stories');
      await dialog.press('Escape'); await dialog.waitFor({ state: 'hidden' });
      check(await opener.evaluate(element => element === document.activeElement), 'Escape restores exact phone opener');
      check(JSON.stringify(await page.evaluate(() => [scrollX, scrollY])) === JSON.stringify(originScroll), 'closing phone holds parent page position');
      check(await raw() === held, 'all display navigation leaves canonical saved bytes unchanged');
      await page.reload({ waitUntil: 'networkidle' }); await opener.waitFor({ state: 'visible' }); await opener.click();
      await dialog.waitFor(); await dialog.locator('[data-phone-app="life"]').click();
      check(await region.count() === (name === 'acquired' ? 1 : 0), 'literal reload keeps the same story section');
      check(await raw() === held, 'literal reload preserves canonical saved bytes');
      check(row.errors.length === 0, 'no unowned console or page errors');
      row.status = 'complete'; write();
    } finally { await context.close(); }
  }
  assert.equal(report.cases.length, 15); assert(report.cases.every(row => row.status === 'complete'));
  assert.equal(report.controls.length, 3); assert(report.controls.every(row => row.fired));
  assert.equal(sha(fs.readFileSync(fixturePath)), fixtureHash); assert.deepEqual(distInventory(path.join(ROOT, 'dist')), distBefore);
  report.status = 'complete'; report.distHeld = true; report.fixtureHeld = true; write();
  console.log('PASS Life stories browser: fifteen actual served-phone cases, five widths, three changed DOM controls, unchanged saved bytes.');
} catch (error) { report.error = error.stack || String(error); write(); throw error; }
finally { await browser.close(); }
