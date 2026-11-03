import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import pw from '../lib/playwrightLoader.mjs';
import { answerConsent } from '../lib/answerConsent.mjs';

const BASE = process.env.BASE || 'http://127.0.0.1:4173';
const OUT = path.join(process.env.QA_OUT, 'browser');
const criteria = 'Bargain Hunt: Every player must cost £60M or less';
const poolBytes = await fs.readFile('scripts/data/fantasyDraftPool.json');
assert.equal(crypto.createHash('sha1').update(Buffer.from('blob ' + poolBytes.length + '\0')).update(poolBytes).digest('hex'), 'e5a83f3e5d498b3c37b54373101df41e2f0496f6');
const players = JSON.parse(poolBytes.toString('utf8'));
const byName = new Map(players.map(p => [p.name, p]));
const formation = { GK: 1, DEF: 4, MID: 3, FWD: 3 };
assert.equal(byName.size, players.length);
for (const [position, count] of Object.entries(formation)) assert.ok(players.filter(p => p.position === position && p.market_value_millions <= 60).length >= count * 2);
await fs.mkdir(OUT, { recursive: true });
const report = { status: 'incomplete', fixture: { source: 'scripts/data/fantasyDraftPool.json', sha256: crypto.createHash('sha256').update(poolBytes).digest('hex'), players: players.length, criteria }, fontRendering: 'Fallback fonts; no actual-font pixel claim', contexts: [] };
const browser = await pw.chromium.launch({ headless: true });
try {
  for (const viewport of [{ width: 320, height: 800 }, { width: 1280, height: 900 }]) {
    const result = { viewport, status: 'incomplete', fixtures: [], aborted: [], consoleErrors: [], pageErrors: [], humanClicks: [], captures: [] };
    report.contexts.push(result);
    const context = await browser.newContext({ viewport, serviceWorkers: 'block' });
    await context.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url()), method = request.method();
      if (/^https?:$/.test(url.protocol) && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) return route.continue();
      const host = url.origin === 'https://flawuiqbvjobmkfkauhw.supabase.co';
      const daily = host && url.pathname === '/functions/v1/fantasy-draft-daily' && url.search === '';
      const pool = host && url.pathname === '/rest/v1/fantasy_draft_players'
        && url.searchParams.get('select') === 'id,name,position,nationality,market_value_millions,dominant_foot,age'
        && url.searchParams.get('order') === 'name.asc' && [...url.searchParams.keys()].length === 2;
      if ((daily || pool) && (method === 'OPTIONS' || daily && method === 'POST' || pool && method === 'GET')) {
        result.fixtures.push({ path: url.pathname, method });
        return route.fulfill({ status: method === 'OPTIONS' ? 204 : 200, headers: {
          'content-type': 'application/json', 'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': 'authorization, apikey, content-type, x-client-info, x-supabase-api-version',
        }, body: method === 'OPTIONS' ? '' : daily ? JSON.stringify({ criteria }) : poolBytes.toString('utf8') });
      }
      result.aborted.push({ origin: url.origin, method, resourceType: request.resourceType() });
      await route.abort('blockedbyclient');
    });
    const page = await context.newPage();
    page.setDefaultTimeout(30000);
    page.on('pageerror', error => result.pageErrors.push(String(error)));
    page.on('console', message => {
      if (message.type() !== 'error') return;
      let origin = null;
      try { origin = new URL(message.location().url).origin; } catch { /* Missing location stays unknown. */ }
      result.consoleErrors.push({ text: message.text(), origin });
    });
    // Observe rendered picks with native time. No game state, timer or RNG is replaced.
    await page.addInitScript(() => {
      window.__fdQaPicks = [];
      const seen = new Set();
      const scan = () => {
        for (const [side, label] of [['user', 'Your XI'], ['ai', 'AI XI']]) {
          const heading = [...document.querySelectorAll('span')].find(el => el.textContent === label);
          for (const name of [...(heading?.parentElement?.parentElement?.querySelectorAll('[data-draft-slot] [title]') || [])].map(el => el.getAttribute('title'))) {
            const key = side + ':' + name;
            if (!seen.has(key)) { seen.add(key); window.__fdQaPicks.push({ side, name, at: performance.now() }); }
          }
        }
      };
      new MutationObserver(scan).observe(document, { childList: true, subtree: true, attributes: true, attributeFilter: ['title'] });
      document.addEventListener('DOMContentLoaded', scan);
    });
    const snapshot = () => page.evaluate(() => {
      const read = label => {
        const heading = [...document.querySelectorAll('span')].find(el => el.textContent === label);
        return [...(heading?.parentElement?.parentElement?.querySelectorAll('[data-draft-slot] [title]') || [])].map(el => el.getAttribute('title'));
      };
      return { user: read('Your XI'), ai: read('AI XI'),
        userStatus: document.querySelector('[role="status"][aria-label="Your formation"]')?.textContent,
        aiStatus: document.querySelector('[role="status"][aria-label="AI formation"]')?.textContent };
    });
    const check = data => {
      for (const side of ['user', 'ai']) for (const [position, limit] of Object.entries(formation)) {
        const count = data[side].filter(name => { assert.ok(byName.has(name)); return byName.get(name).position === position; }).length;
        assert.ok(count <= limit);
        assert.ok(data[side + 'Status']?.includes(position + ' ' + count + '/' + limit), 'Visible formation count must match actual rendered players');
      }
    };
    const capture = async (name, target = page) => {
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, 'Horizontal overflow');
      const file = viewport.width + '-' + name + '.png';
      await target.screenshot({ path: path.join(OUT, file) }); result.captures.push(file);
    };
    try {
      await page.goto(BASE + '/fantasy-draft', { waitUntil: 'domcontentloaded' });
      result.consent = await answerConsent(page);
      for (let n = 0; n < 3 && await page.locator('[role="dialog"]:visible').count(); n++) {
        const dialog = page.locator('[role="dialog"]:visible').first();
        await page.keyboard.press('Escape'); await dialog.waitFor({ state: 'hidden' });
      }
      await page.getByText(criteria, { exact: true }).waitFor();
      await page.getByRole('button', { name: 'Start Draft', exact: true }).click();
      const pool = page.getByRole('heading', { name: 'Player Pool', exact: true }).locator('..').locator('..');
      await pool.waitFor();
      const order = ['GK', 'DEF', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'FWD', 'FWD', 'FWD'];
      for (const [index, position] of order.entries()) {
        await page.locator('div.inline-flex').filter({ hasText: /^Your Pick\s*Round \d+.*Pick \d+\/22$/ }).waitFor();
        const before = await snapshot(); check(before); assert.equal(before.user.length, index);
        const taken = new Set([...before.user, ...before.ai]);
        const candidate = players.filter(p => p.position === position && p.market_value_millions <= 60 && !taken.has(p.name))
          .sort((a, b) => a.market_value_millions - b.market_value_millions || a.name.localeCompare(b.name))[0];
        assert.ok(candidate);
        await page.getByRole('textbox', { name: 'Search players', exact: true }).fill(candidate.name);
        const button = pool.getByText(candidate.name, { exact: true }).locator('..').locator('..');
        assert.equal(await button.evaluate(el => el.tagName), 'BUTTON'); assert.equal(await button.isEnabled(), true);
        await button.click();
        await page.waitForFunction(n => {
          const heading = [...document.querySelectorAll('span')].find(el => el.textContent === 'Your XI');
          return heading?.parentElement?.parentElement?.querySelectorAll('[data-draft-slot] [title]').length === n;
        }, index + 1);
        const after = await snapshot(); check(after);
        assert.ok(after.user.includes(candidate.name)); result.humanClicks.push({ name: candidate.name, position, before, after });
        if (index === 4) { await pool.scrollIntoViewIfNeeded(); await capture('mid-draft'); }
      }
      await page.getByText('Draft Complete!', { exact: true }).waitFor();
      const final = await snapshot(); check(final);
      assert.equal(final.user.length, 11); assert.equal(final.ai.length, 11);
      assert.equal(new Set([...final.user, ...final.ai]).size, 22);
      for (const side of ['user', 'ai']) for (const [position, count] of Object.entries(formation)) assert.equal(final[side].filter(name => byName.get(name).position === position).length, count);
      result.final = final; result.timedPicks = await page.evaluate(() => window.__fdQaPicks);
      for (const side of ['user', 'ai']) assert.deepEqual(result.timedPicks.filter(p => p.side === side).map(p => p.name), final[side]);
      assert.equal(result.humanClicks.length, 11);
      const counts = page.getByRole('status', { name: 'Your formation', exact: true }).locator('..');
      await counts.scrollIntoViewIfNeeded(); await capture('complete-counts', counts);
      const roster = page.getByText('Your XI', { exact: true }).locator('..').locator('..').locator('..').locator('..');
      await roster.scrollIntoViewIfNeeded(); await capture('complete-xis', roster);
      const score = page.getByText(/^Season score: \d+\/100$/);
      await score.waitFor(); result.verdict = await score.locator('..').innerText();
      assert.match(result.verdict, /You \d+ pts .* AI \d+ pts/);
      await score.scrollIntoViewIfNeeded(); await capture('real-verdict', score.locator('..'));
      assert.ok(result.fixtures.some(r => r.path.endsWith('fantasy-draft-daily') && r.method === 'POST'));
      assert.ok(result.fixtures.some(r => r.path.endsWith('fantasy_draft_players') && r.method === 'GET'));
      const abortedOrigins = new Set(result.aborted.map(r => r.origin));
      result.unexpectedConsoleErrors = result.consoleErrors.filter(e => !(/^Failed to load resource: net::ERR_(BLOCKED_BY_CLIENT|FAILED)$/.test(e.text) && abortedOrigins.has(e.origin)));
      assert.deepEqual(result.unexpectedConsoleErrors, []); assert.deepEqual(result.pageErrors, []);
      result.status = 'passed';
    } catch (error) {
      result.status = 'failed'; result.error = String(error.stack || error); process.exitCode = 1;
      const file = viewport.width + '-failure.png';
      try { await page.screenshot({ path: path.join(OUT, file) }); result.failureCapture = file; }
      catch (captureError) { result.failureCaptureError = String(captureError); }
    }
    finally { await context.close(); }
  }
  report.status = report.contexts.length === 2 && report.contexts.every(r => r.status === 'passed') ? 'passed' : 'incomplete';
} finally {
  await browser.close(); await fs.writeFile(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
}
assert.equal(report.status, 'passed', 'Both real drafts must complete with valid human and timed AI XIs');
