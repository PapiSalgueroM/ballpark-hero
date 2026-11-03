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
const report = { status: 'incomplete', fixture: { source: 'scripts/data/fantasyDraftPool.json', sha256: crypto.createHash('sha256').update(poolBytes).digest('hex'), players: players.length, criteria }, fontRendering: 'Fallback fonts; no actual-font pixel claim', headerScope: 'Fresh guest only; no saved-streak header claim', contexts: [] };
function expectedRefusal(error, abortedOrigins) {
  return /^Failed to load resource: net::ERR_(?:BLOCKED_BY_CLIENT(?:\.Inspector)?|FAILED)$/.test(error.text) && abortedOrigins.has(error.origin);
}
// Copied observed console entry from failed run41571523736, not a new request.
const refusalWitness = { text: 'Failed to load resource: net::ERR_BLOCKED_BY_CLIENT.Inspector', origin: 'https://fonts.googleapis.com' };
const witnessOrigins = new Set([refusalWitness.origin]);
const changedText = { ...refusalWitness, text: refusalWitness.text.replace('.Inspector', '.Unexpected') };
const changedOrigin = { ...refusalWitness, origin: 'https://reservedfixture.invalid' };
assert.notEqual(changedText.text, refusalWitness.text); assert.notEqual(changedOrigin.origin, refusalWitness.origin);
assert.equal(expectedRefusal(refusalWitness, witnessOrigins), true);
assert.equal(expectedRefusal(changedText, witnessOrigins), false);
assert.equal(expectedRefusal(changedOrigin, witnessOrigins), false);
await fs.writeFile(path.join(OUT, 'console-classifier-control.json'), JSON.stringify({
  sourceRun: 41571523736, sourceArtifact: 13201293224, refusalWitness, changedText, changedOrigin,
  witnessedAccepted: true, changedTextRefused: true, changedOriginRefused: true,
}, null, 2) + '\n');
async function measureNames(page) {
  return page.locator('[data-draft-slot] [title]').evaluateAll(elements => elements.map(el => {
    const rect = el.getBoundingClientRect(), row = el.closest('[data-draft-slot]'), rowRect = row.getBoundingClientRect(), style = getComputedStyle(el);
    const clippedBy = [];
    for (let parent = el.parentElement; parent; parent = parent.parentElement) {
      const box = parent.getBoundingClientRect(), css = getComputedStyle(parent);
      if ((/(hidden|clip|auto|scroll)/.test(css.overflowX) && (rect.left < box.left - 1 || rect.right > box.right + 1))
        || (/(hidden|clip)/.test(css.overflowY) && (rect.top < box.top - 1 || rect.bottom > box.bottom + 1))) clippedBy.push(parent.tagName + '.' + parent.className);
    }
    const value = { name: el.getAttribute('title'), text: el.innerText.trim(), left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height,
      clientWidth: el.clientWidth, scrollWidth: el.scrollWidth, clientHeight: el.clientHeight, scrollHeight: el.scrollHeight,
      textOverflow: style.textOverflow, whiteSpace: style.whiteSpace, visibility: style.visibility,
      row: { left: rowRect.left, right: rowRect.right, width: rowRect.width, height: rowRect.height },
      clippedBy, pageScrollY: scrollY };
    value.readable = value.text === value.name && rect.width > 0 && rect.height > 0
      && value.scrollWidth <= value.clientWidth + 1 && value.scrollHeight <= value.clientHeight + 1
      && style.textOverflow !== 'ellipsis' && style.visibility === 'visible' && style.display !== 'none'
      && Number(style.opacity) > 0 && clippedBy.length === 0
      && rect.left >= rowRect.left - 0.5 && rect.right <= rowRect.right + 0.5
      && rect.top >= rowRect.top - 0.5 && rect.bottom <= rowRect.bottom + 0.5
      && rect.left >= -0.5 && rect.right <= innerWidth + 0.5 && rowRect.left >= -1 && rowRect.right <= innerWidth + 1;
    return value;
  }));
}
function assertNames(rows) {
  assert.equal(rows.length, 22, 'Measure every actual human and AI name');
  assert.ok(rows.every(row => row.readable), 'Full names must fit the actual roster and clipping ancestors: ' + JSON.stringify(rows.filter(row => !row.readable)));
}
const browser = await pw.chromium.launch({ headless: true });
try {
  for (const viewport of [{ width: 320, height: 800 }, { width: 390, height: 844 }, { width: 430, height: 932 }, { width: 1440, height: 900 }]) {
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
      const readyCard = pool.getByRole('button').filter({ has: page.locator('p.truncate') }).first();
      await readyCard.waitFor({ state: 'visible' });
      result.initialPoolCard = await readyCard.locator('p.truncate').innerText();
      assert.ok(byName.has(result.initialPoolCard), 'Actual archived player card is loaded before the first turn wait');
      const order = ['GK', 'DEF', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'FWD', 'FWD', 'FWD'];
      for (const [index, position] of order.entries()) {
        await page.locator('div.inline-flex').filter({ hasText: /^Your Pick\s*Round \d+.*Pick \d+\/22$/ }).waitFor();
        const before = await snapshot(); check(before); assert.equal(before.user.length, index);
        const taken = new Set([...before.user, ...before.ai]);
        const candidate = players.filter(p => p.position === position && p.market_value_millions <= 60 && !taken.has(p.name))
          .sort((a, b) => b.name.length - a.name.length || a.market_value_millions - b.market_value_millions || a.name.localeCompare(b.name))[0];
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
      await page.locator('[data-draft-slot]').evaluateAll(async rows => {
        await Promise.all(rows.flatMap(row => row.getAnimations({ subtree: true })).map(animation => animation.finished));
      });
      result.names = await measureNames(page); assertNames(result.names);
      const firstName = page.locator('[data-draft-slot] [title]').first();
      const styleBefore = await firstName.getAttribute('style'), stateBefore = await snapshot();
      await firstName.evaluate(el => Object.assign(el.style, { width: '4px', maxWidth: '4px', minWidth: '0px', flex: '0 0 4px',
        height: '4px', maxHeight: '4px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }));
      const styleFault = await firstName.getAttribute('style'), faultyNames = await measureNames(page);
      assert.notEqual(styleFault, styleBefore, 'Forced clipping must change the actual name span');
      assert.ok(faultyNames[0].clientWidth <= 4 && faultyNames[0].clientWidth < result.names[0].clientWidth, 'Forced width must beat the actual flex basis');
      assert.equal(faultyNames[0].readable, false); assert.ok(faultyNames[0].scrollWidth > faultyNames[0].clientWidth + 1);
      assert.ok(faultyNames[0].scrollHeight > faultyNames[0].clientHeight + 1);
      await firstName.evaluate((el, prior) => prior === null ? el.removeAttribute('style') : el.setAttribute('style', prior), styleBefore);
      assert.equal(await firstName.getAttribute('style'), styleBefore, 'Restore exact original style including absence');
      assert.deepEqual(await snapshot(), stateBefore, 'Clipping control cannot change the real draft');
      const restoredNames = await measureNames(page); assertNames(restoredNames);
      assert.equal(restoredNames[0].clientWidth, result.names[0].clientWidth); assert.equal(restoredNames[0].clientHeight, result.names[0].clientHeight);
      result.clippingControl = { scope: 'Forced CSS clipping of the actual name span, not an old-source rebuild',
        styleBefore, styleFault, fault: faultyNames[0], restored: restoredNames[0], changed: true, rejected: true, restoredExact: true };
      result.countGeometry = await page.locator('[role="status"][aria-label$=" formation"]').evaluateAll(statuses => statuses.map(status => {
        const tokens = [...status.querySelectorAll('span.whitespace-nowrap')].map(token => {
          const range = document.createRange(); range.selectNodeContents(token);
          const rects = [...range.getClientRects()].filter(r => r.width > 0).map(r => ({ left: r.left, right: r.right, top: r.top, bottom: r.bottom }));
          return { text: token.textContent.trim(), rects, clientWidth: token.clientWidth, scrollWidth: token.scrollWidth,
            singleLine: rects.length > 0 && rects.every(r => Math.abs(r.top - rects[0].top) <= 0.5 && Math.abs(r.bottom - rects[0].bottom) <= 0.5) };
        });
        return { label: status.getAttribute('aria-label'), text: status.textContent, tokens };
      }));
      assert.equal(result.countGeometry.length, 2);
      for (const status of result.countGeometry) {
        assert.equal(status.tokens.length, 4); assert.ok(status.tokens.every(token => token.singleLine && token.scrollWidth <= token.clientWidth + 1), 'Each position and count stays on one line');
      }

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
      result.unexpectedConsoleErrors = result.consoleErrors.filter(e => !expectedRefusal(e, abortedOrigins));
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
  report.status = report.contexts.length === 4 && report.contexts.every(r => r.status === 'passed') ? 'passed' : 'incomplete';
} finally {
  await browser.close(); await fs.writeFile(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
}
assert.equal(report.status, 'passed', 'All four real drafts must complete with full readable names and valid human and timed AI XIs');
