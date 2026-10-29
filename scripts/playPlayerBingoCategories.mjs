/* Actual built page, fictional REST rows and a reversible native hidden-label control. */
import './lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pw from './lib/playwrightLoader.mjs';
import { answerConsent } from './lib/answerConsent.mjs';

assert.equal(process.env.CI, '1', 'Remote CI only');
assert.equal(process.env.SIM_NETWORK, 'offline', 'Offline transport required');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const build = path.resolve(root, process.env.PLAYER_BINGO_BUILD || 'dist');
assert.match(readFileSync(path.join(build, 'index.html'), 'utf8'), /<html/i, 'A real build is required');
const port = Number(process.env.PLAYER_BINGO_PORT || 4197);
const base = 'http://127.0.0.1:' + port;
const out = path.resolve(root, process.env.PLAYER_BINGO_BROWSER_OUT || '.sim-artifacts/player-bingo-categories-browser');
assert.ok(out.startsWith(root + path.sep), 'Evidence stays in this checkout');
mkdirSync(out, { recursive: true });
const cors = { 'access-control-allow-origin': base, 'access-control-allow-headers': 'authorization,apikey,content-type,x-client-info,range,range-unit,prefer,accept-profile,x-supabase-api-version,*', 'access-control-allow-methods': 'GET,OPTIONS', 'content-type': 'application/json' };
const added = new Map([
  ['Full-back', p => ['Left-Back', 'Right-Back'].includes(p.position)],
  ['Winger', p => ['Left Winger', 'Right Winger'].includes(p.position)],
  ['Valued $30M to under $50M', p => p.market_value_usd >= 30_000_000 && p.market_value_usd < 50_000_000],
  ['Valued $50M to under $100M', p => p.market_value_usd >= 50_000_000 && p.market_value_usd < 100_000_000],
  ['Born 2000 to 2003', p => p.year - p.age - 1 >= 2000 && p.year - p.age - 1 <= 2003],
  ['Born 1997 to 1999', p => p.year - p.age - 1 >= 1997 && p.year - p.age - 1 <= 1999],
  ['10+ goals and 10+ assists in a season', p => p.goals >= 10 && p.assists >= 10],
  ['30+ goals + assists in a season', p => (p.goals ?? 0) + (p.assists ?? 0) >= 30],
  ['50+ matches in a season', p => p.matches >= 50],
  ['10+ goals in under 30 season matches', p => p.goals >= 10 && p.matches > 0 && p.matches < 30],
  ['40+ matches, no reds in a season', p => p.matches >= 40 && p.red_cards === 0],
  ['10+ yellows and a red in a season', p => p.yellow_cards >= 10 && p.red_cards >= 1],
]);
const positions = ['Goalkeeper', 'Centre-Back', 'Right-Back', 'Left-Back', 'Central Midfield', 'Defensive Midfield',
  'Attacking Midfield', 'Left Midfield', 'Right Midfield', 'Left Winger', 'Right Winger', 'Centre-Forward', 'Second Striker'];
const nations = ['Spain', 'France', 'Brazil', 'England', 'Germany', 'Portugal', 'Argentina', 'Italy'];
const clubs = ['Real Madrid', 'FC Barcelona', 'Manchester United', 'Manchester City', 'Liverpool FC',
  'Chelsea FC', 'Arsenal FC', 'Tottenham Hotspur', 'Paris Saint-Germain', 'Bayern Munich',
  'Borussia Dortmund', 'Juventus FC', 'AC Milan', 'Inter Milan', 'Atletico de Madrid'];
const stats = [[10, 10, 40, 10, 1], [25, 5, 50, 0, 0], [10, 0, 29, 2, 0], [0, 15, 45, 8, 0],
  [20, 10, 55, 10, 1], [5, 2, 30, 2, 0], [null, null, null, null, null]];
const market = Array.from({ length: 500 }, (_, i) => {
  const [goals, assists, matches, yellow_cards, red_cards] = stats[i % stats.length];
  return { id: i + 1, player_name: 'FixturePlayer' + String(i).padStart(3, '0'),
    nationality: nations[Math.floor(i / positions.length) % nations.length], position: positions[i % positions.length],
    club: clubs[Math.floor(i / 7) % clubs.length], market_value_usd: [25_000_000, 40_000_000, 75_000_000, 120_000_000][Math.floor(i / 104) % 4],
    age: 18 + i % 18, year: 2026, goals, assists, matches, yellow_cards, red_cards };
});
const byName = new Map(market.map(p => [p.player_name, p]));
function marketRead(url) {
  const q = url.searchParams;
  for (const key of q.keys()) assert.ok(['select', 'year', 'market_value_usd', 'age', 'order', 'limit', 'offset', 'player_name'].includes(key), 'Known market query field: ' + key);
  let rows = [...market];
  if (q.has('player_name')) {
    const match = /^in\.\((.*)\)$/.exec(q.get('player_name'));
    assert.ok(match, 'Actual loader uses a bounded name filter');
    const names = new Set(match[1].split(',').map(name => name.replace(/^"|"$/g, '')));
    rows = rows.filter(p => names.has(p.player_name));
  }
  if (q.has('year')) { assert.equal(q.get('year'), 'gte.2024'); rows = rows.filter(p => p.year >= 2024); }
  if (q.has('market_value_usd')) { assert.equal(q.get('market_value_usd'), 'gt.0'); rows = rows.filter(p => p.market_value_usd > 0); }
  if (q.has('age')) { assert.equal(q.get('age'), 'not.is.null'); rows = rows.filter(p => p.age !== null); }
  for (const order of (q.get('order') || '').split(',').reverse().filter(Boolean)) {
    const [field, direction] = order.split('.');
    assert.ok(['id', 'year', 'market_value_usd'].includes(field));
    rows.sort((a, b) => (direction === 'desc' ? -1 : 1) * (a[field] - b[field]));
  }
  const offset = Number(q.get('offset') || 0);
  rows = rows.slice(offset, offset + Number(q.get('limit') || 1000));
  const columns = (q.get('select') || '').split(',');
  assert.ok(columns.length && columns.every(key => key in market[0]), 'Existing loader selects actual fixture fields');
  return rows.map(p => Object.fromEntries(columns.map(key => [key, p[key]])));
}
const report = { scope: 'Actual built Player Bingo with 500 fictional metadata rows; no production data or backend writes.', viewports: [] };
const save = () => writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
const server = spawn(process.execPath, [path.join(root, 'scripts/lib/hostLikeServer.mjs'), build, String(port)], { cwd: root, windowsHide: true });
let serverLog = '';
server.stdout.on('data', bytes => { serverLog += bytes; });
server.stderr.on('data', bytes => { serverLog += bytes; });
let browser;
try {
  let ready = false;
  for (let attempt = 0; attempt < 50 && !ready; attempt++) {
    ready = serverLog.includes('host-like server: ' + build + ' on ' + base) && server.exitCode === null && await fetch(base + '/', { signal: AbortSignal.timeout(1000) }).then(r => r.ok, () => false);
    if (!ready) await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.ok(ready, 'hostLikeServer serves the actual build');
  browser = await pw.chromium.launch();
  for (const [width, height] of [[320, 780], [390, 844], [1280, 900]]) {
    const row = { width, height, errors: [], requests: [], boards: [], covered: [], placement: null, control: null, wrapControl: null, status: 'running' };
    report.viewports.push(row); save();
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
    let page;
    try {
      await context.addInitScript(() => {
        window.__bingoSeed = seed => { let state = seed >>> 0; Math.random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; }; };
        window.__bingoSeed(1);
      });
      await context.route('**/*', async route => {
        const request = route.request();
        const url = new URL(request.url());
        if (url.origin === base) return route.fallback();
        const table = url.pathname.match(/^\/rest\/v1\/(player_market_values|world_cup_players|ballon_dor)$/)?.[1];
        if (url.hostname === 'flawuiqbvjobmkfkauhw.supabase.co' && table && ['GET', 'OPTIONS'].includes(request.method())) {
          const rows = request.method() === 'OPTIONS' ? null : table === 'player_market_values' ? marketRead(url) : [];
          row.requests.push({ table, method: request.method(), rows: rows?.length ?? 0, select: url.searchParams.get('select') });
          return route.fulfill({ status: rows === null ? 204 : 200, headers: cors, body: rows === null ? '' : JSON.stringify(rows) });
        }
        row.requests.push({ aborted: url.origin + url.pathname, method: request.method() });
        return route.abort();
      });
      page = await context.newPage();
      page.on('pageerror', error => row.errors.push(error.message));
      await page.goto(base + '/player-bingo', { waitUntil: 'domcontentloaded' });
      await answerConsent(page);
      await page.getByRole('button', { name: "Let's Play!", exact: true }).click();
      const grid = page.locator('div.grid-cols-5').filter({ has: page.locator('button[title]') });
      const tiles = grid.locator(':scope > button[title]');
      const inspect = () => grid.evaluate(element => {
        const issues = [];
        const cells = [...element.querySelectorAll(':scope > button[title]')].map(button => {
          const label = button.querySelector(':scope > span:nth-of-type(2)');
          const title = button.getAttribute('title');
          const b = button.getBoundingClientRect(), l = label?.getBoundingClientRect();
          const style = label && getComputedStyle(label);
          const visible = l && l.width > 0 && l.height > 0 && style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0;
          if (!label || label.textContent.trim() !== title) issues.push({ kind: 'label-text', title });
          if (!visible) issues.push({ kind: 'label-hidden', title });
          else if (l.left < b.left - 1 || l.right > b.right + 1 || l.top < b.top - 1 || l.bottom > b.bottom + 1 || label.scrollWidth > label.clientWidth + 1) issues.push({ kind: 'label-overflow', title });
          return { title, visible: Boolean(visible), button: { x: b.x, y: b.y, width: b.width, height: b.height }, label: l && { x: l.x, y: l.y, width: l.width, height: l.height } };
        });
        const overflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
        if (overflow > 1) issues.push({ kind: 'page-overflow', pixels: overflow });
        return { cells, issues, overflow };
      });
      const seen = new Set();
      for (let seed = 1; seed <= 128; seed++) {
        await tiles.first().waitFor({ state: 'visible', timeout: 30000 });
        assert.equal(await tiles.count(), 24, 'The actual board has 24 category buttons');
        assert.equal(await grid.locator(':scope > *').count(), 25, 'The actual grid has 25 cells');
        assert.equal(await grid.locator(':scope > *').nth(12).getByText('FREE', { exact: true }).count(), 1, 'The actual free cell is in the center');
        assert.equal(await grid.getByText('FREE', { exact: true }).count(), 1, 'One actual free center');
        const measured = await inspect();
        row.boards.push({ seed, ...measured }); save();
        assert.deepEqual(measured.issues, [], 'Every actual label is visible, complete and contained');
        const labels = measured.cells.map(cell => cell.title);
        const discovered = labels.filter(label => added.has(label) && !seen.has(label));
        discovered.forEach(label => seen.add(label));
        if (discovered.length) await grid.screenshot({ path: path.join(out, 'categories-' + width + '-' + seed + '.png') });
        row.covered = [...seen]; save();
        if (seed === 1) {
          await grid.screenshot({ path: path.join(out, 'board-' + width + '.png') });
          if (width === 320) {
            const originalClass = 'text-[9px] md:text-[10px] font-semibold leading-tight text-foreground';
            const fixedClass = 'w-full min-w-0 break-words ' + originalClass;
            const heldClasses = await tiles.evaluateAll(buttons => buttons.map(button => button.querySelector(':scope > span:nth-of-type(2)').className));
            assert.equal(heldClasses.length, 24);
            assert.ok(heldClasses.every(value => value === fixedClass), 'All actual labels carry the responsive width and word wrapping');
            const changed = await tiles.evaluateAll((buttons, value) => buttons.reduce((count, button) => {
              const label = button.querySelector(':scope > span:nth-of-type(2)'), before = label.className;
              label.className = value; return count + Number(before !== label.className);
            }, 0), originalClass);
            row.wrapControl = { changed, originalClass, heldClasses, raw: null, restored: null };
            assert.equal(changed, 24, 'The complete original class replaces exactly 24 actual label classes');
            try {
              row.wrapControl.raw = await inspect();
              await grid.screenshot({ path: path.join(out, 'original-class-control-320.png') });
            } finally {
              await tiles.evaluateAll((buttons, classes) => buttons.forEach((button, index) => { button.querySelector(':scope > span:nth-of-type(2)').className = classes[index]; }), heldClasses);
              row.wrapControl.restored = await inspect(); save();
            }
            assert.deepEqual(row.wrapControl.raw.issues, [
              { kind: 'label-overflow', title: 'Played for Manchester United' },
              { kind: 'label-overflow', title: 'Champions League winner' },
              { kind: 'label-overflow', title: 'Goalkeeper' },
            ], 'The complete old class reproduces the three retained 320px overflow defects');
            assert.deepEqual(row.wrapControl.restored.issues, [], 'Restoring the complete responsive class restores clean label geometry');
            row.wrapControl.passed = true; save();
          }
          const victim = tiles.first().locator(':scope > span:nth-of-type(2)');
          const target = await tiles.first().getAttribute('title');
          const changed = await victim.evaluate(label => { const before = label.hidden; label.hidden = true; return !before && label.hidden; });
          assert.ok(changed, 'The native hidden control actually changes a rendered label');
          const broken = await inspect();
          row.control = { target, changed, raw: broken };
          assert.deepEqual(broken.issues, [{ kind: 'label-hidden', title: target }], 'Only the planted visibility defect is detected');
          await grid.screenshot({ path: path.join(out, 'hidden-control-' + width + '.png') });
          await victim.evaluate(label => { label.hidden = false; });
          row.control.restored = await inspect();
          assert.deepEqual(row.control.restored.issues, [], 'Restoring the label restores the healthy board');
          row.control.passed = true;
          save();
        }
        if (!row.placement && labels.some(label => added.has(label))) {
          for (let reveal = 0; reveal < 60 && !row.placement; reveal++) {
            const name = await page.locator('div.font-bold.text-foreground.text-2xl.leading-tight').innerText();
            const p = byName.get(name); assert.ok(p, 'The actual drawn card comes from the fictional REST pool');
            const label = labels.find(value => added.has(value) && added.get(value)(p));
            if (label) {
              const tile = tiles.filter({ has: page.getByText(label, { exact: true }) });
              const strikes = await page.locator('[aria-label$="strikes used"]').getAttribute('aria-label');
              await tile.click();
              assert.ok(await tile.isDisabled(), 'A valid new-category placement locks the actual square');
              assert.ok((await tile.innerText()).includes(name), 'The locked square shows the drawn fixture name');
              assert.equal(await page.locator('[aria-label$="strikes used"]').getAttribute('aria-label'), strikes, 'A valid placement costs no strike');
              row.placement = { seed, name, label, strikes };
              assert.deepEqual((await inspect()).issues, [], 'Labels remain contained after a real placement');
              await grid.screenshot({ path: path.join(out, 'placement-' + width + '.png') });
            } else await page.getByRole('button', { name: 'Skip player', exact: true }).click();
          }
          assert.ok(row.placement, 'A newly added category accepts a real revealed fixture player');
        }
        if (seen.size === added.size && row.placement) break;
        await page.getByRole('button', { name: 'Give up', exact: true }).click();
        await page.getByRole('button', { name: 'Yes, reveal it', exact: true }).click();
        await page.evaluate(next => window.__bingoSeed(next), seed + 1);
        await page.getByRole('button', { name: 'Try a new board', exact: true }).click();
      }
      assert.deepEqual([...added.keys()].filter(label => !seen.has(label)), [], 'All twelve additions appear on actual generated boards');
      assert.deepEqual(row.errors, [], 'No browser page errors');
      assert.ok(row.requests.some(q => q.table === 'player_market_values' && q.select === 'player_name' && q.rows === 500), 'The real loader starts with all 500 fictional names');
      row.status = 'passed'; save();
      console.log('Player Bingo ' + width + 'x' + height + ': 24 squares, all12 labels, actual placement and hidden-label control passed across ' + row.boards.length + ' seeded boards.');
    } catch (error) {
      report.status = 'failed'; row.status = 'failed'; row.failure = { message: error.message, stack: error.stack };
      if (page) await page.screenshot({ path: path.join(out, 'failure-' + width + '.png'), fullPage: true }).catch(() => {});
      save(); throw error;
    } finally { await context.close(); }
  }
  report.status = 'passed';
} finally {
  save();
  if (browser) await browser.close();
  server.kill();
  writeFileSync(path.join(out, 'server.log'), serverLog);
}
console.log('playPlayerBingoCategories: actual offline built-page proof passed; raw geometry, requests and screenshots retained.');
