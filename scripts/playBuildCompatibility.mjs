/** Local build smoke, not a factual audit of the committed JSON.
 * BUILD_COMPAT_BASE=http://127.0.0.1:4192 (serve dist with hostLikeServer).
 * BUILD_COMPAT_DEV=1 uses client navigation to avoid public snapshots in Vite.
 * BUILD_COMPAT_CONTROL=boot|records|archive|hover must fail only its named check.
 * DEV=1 against a production server must fail boot: it cannot serve the dev entry.
 * No live data, account actions, reports, source rewrites or screenshot files.
 */
import { strict as assert, AssertionError } from 'node:assert';
import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import pw from './lib/playwrightLoader.mjs';

const BASE = new URL(process.env.BUILD_COMPAT_BASE || 'http://127.0.0.1:4192');
const DEV = process.env.BUILD_COMPAT_DEV === '1';
const CONTROL = process.env.BUILD_COMPAT_CONTROL || '';
const CHECKS = {
  boot: 'boot: React main mounts from the expected module entry, outside the snapshot',
  records: 'records: committed champion rows and disclosure match',
  archive: 'archive: all four routes render committed boards and answers',
  hover: 'hover: home tile changes from emitted foreground to emitted primary',
};
if (!['http:', 'https:'].includes(BASE.protocol) || !['127.0.0.1', 'localhost', '[::1]'].includes(BASE.hostname)
  || BASE.username || BASE.password || BASE.pathname !== '/' || BASE.search || BASE.hash) {
  throw new Error('BUILD_COMPAT_BASE must be a loopback HTTP(S) origin without credentials, path, query or hash');
}
if (CONTROL && !Object.hasOwn(CHECKS, CONTROL)) throw new Error(`Unknown BUILD_COMPAT_CONTROL: ${CONTROL}`);
const records = JSON.parse(readFileSync(new URL('../src/data/recordBooks.json', import.meta.url), 'utf8')).sections;
const archives = JSON.parse(readFileSync(new URL('../src/data/gridArchive.json', import.meta.url), 'utf8')).sports;
const html = readFileSync(new URL(DEV ? '../index.html' : '../dist/index.html', import.meta.url), 'utf8');
const entries = [...html.replace(/<!--[\s\S]*?-->/g, '').matchAll(/<script\b(?=[^>]*\btype=["']module["'])[^>]*\bsrc=["']([^"']+)["'][^>]*>/g)];
if (entries.length !== 1) throw new Error(`Expected one local module entry, found ${entries.length}`);
const entry = new URL(entries[0][1], BASE);
if (entry.origin !== BASE.origin) throw new Error('The module entry must be same-origin');
const fired = Object.fromEntries(Object.keys(CHECKS).map(key => [key, 0]));
const failures = [], runtimeErrors = [];
let blockedHttp = 0, blockedWs = 0;
const browser = await pw.chromium.launch();
const normalize = value => String(value).replace(/\s+/g, ' ').trim();
const pairs = rows => rows.map(row => [String(row.year), row.champion]);

async function mainReady(page) {
  try {
    await page.waitForFunction(() => !!document.querySelector('#root #dukb-main'), null, { timeout: 8000 });
  } catch (error) {
    if (!(error instanceof pw.errors.TimeoutError)) throw error;
  }
  return page.evaluate(() => {
    const main = document.querySelector('#root #dukb-main');
    return !!main && !main.closest('#dukb-snapshot');
  });
}

async function visit(page, route) {
  await page.goto(new URL(DEV ? '/' : route, BASE).href, { waitUntil: 'domcontentloaded', timeout: 20000 });
  if (!await mainReady(page)) throw new Error(`React did not mount while opening ${route}`);
  if (DEV && route !== '/') {
    await page.evaluate(path => {
      history.pushState({}, '', path);
      dispatchEvent(new PopStateEvent('popstate'));
    }, route);
  }
}

async function mutateCell(page, selector, name) {
  fired[name] += await page.locator(selector).evaluateAll(cells => {
    if (cells.length !== 1) throw new Error(`Control needs exactly one cell, found ${cells.length}`);
    const before = cells[0].textContent;
    cells[0].textContent = `${before} CONTROL`;
    if (cells[0].textContent === before) throw new Error('Cell control changed nothing');
    return 1;
  });
}

const cases = {
  async boot(page) {
    let entryLoaded = false;
    page.on('response', response => {
      const url = new URL(response.url());
      if (url.origin === entry.origin && url.pathname === entry.pathname && response.ok()
        && /(?:java|ecma)script/i.test(response.headers()['content-type'] || '')) entryLoaded = true;
    });
    await page.goto(BASE.href, { waitUntil: 'domcontentloaded', timeout: 20000 });
    const ready = await mainReady(page);
    assert.ok(ready && entryLoaded, CHECKS.boot);
  },
  async records(page) {
    await visit(page, '/records');
    await page.locator('#root #sb tbody tr').first().waitFor();
    if (CONTROL === 'records') await mutateCell(page, '#root #sb tbody tr:first-child td:nth-child(2)', 'records');
    const initial = await page.locator('#root #dukb-main section > div[id]').evaluateAll(sections => sections.map(section => [
      section.id, [...section.querySelectorAll('tbody tr')].map(row => [...row.querySelectorAll('td')].slice(0, 2).map(cell => cell.textContent.trim())),
    ]));
    const sb = page.locator('#root #sb');
    const rows = () => sb.locator('tbody tr').evaluateAll(list => list.map(row => [...row.querySelectorAll('td')].slice(0, 2).map(cell => cell.textContent.trim())));
    await sb.getByRole('button', { name: /^Show all / }).click();
    const expanded = await rows();
    await sb.getByRole('button', { name: 'Show fewer', exact: true }).click();
    const collapsed = await rows();
    const expected = {
      initial: Object.entries(records).map(([key, list]) => [key, pairs(list.slice(0, 12))]),
      expanded: pairs(records.sb), collapsed: pairs(records.sb.slice(0, 12)),
    };
    assert.ok(isDeepStrictEqual({ initial, expanded, collapsed }, expected), CHECKS.records);
    console.log(`    ${initial.length} sections, Super Bowl ${collapsed.length}/${expanded.length}/${collapsed.length} rows`);
  },
  async archive(page) {
    const actual = [], expected = [];
    for (const [sport, route] of [['nba', '/nba-grid/archive'], ['mlb', '/mlb-grid/archive'], ['nhl', '/hockey-grid/archive'], ['cbb', '/cbb-grid/archive']]) {
      await visit(page, route);
      await page.locator('#root #dukb-main table tbody tr').first().waitFor();
      if (CONTROL === 'archive' && sport === 'nba') {
        await mutateCell(page, '#root #dukb-main section:first-of-type tbody tr:first-child td:first-of-type', 'archive');
      }
      actual.push(await page.locator('#root #dukb-main table').evaluateAll(tables => tables.map(table => {
        const text = node => node.textContent.replace(/\s+/g, ' ').trim();
        const section = table.closest('section');
        return { title: text(section.querySelector('h2')), axes: text(section.querySelector('p')),
          headers: [...table.querySelectorAll('thead th')].map(text),
          cells: [...table.querySelectorAll('tbody tr')].map(row => [...row.children].map(text)) };
      })));
      const data = archives[sport];
      expected.push(data.boards.map(board => ({
        title: `${data.label} grid for ${board.date}`,
        axes: normalize(`Rows: ${board.rows.join(', ')}. Columns: ${board.cols.join(', ')}.`),
        headers: ['Crossing', 'Valid players', 'Rarest answers'],
        cells: board.cells.map(cell => [normalize(`${cell.row} and ${cell.col}`), String(cell.total), normalize(cell.answers.join(', '))]),
      })));
    }
    assert.ok(isDeepStrictEqual(actual, expected), CHECKS.archive);
    console.log(`    4 routes, ${actual.reduce((sum, boards) => sum + boards.length, 0)} complete board tables`);
  },
  async hover(page) {
    await visit(page, '/');
    const tile = page.locator('#root .home-tile').first();
    const title = tile.locator('span[class~="group-hover:text-primary"]');
    await tile.scrollIntoViewIfNeeded();
    await page.mouse.move(0, 0);
    const colors = await page.evaluate(() => ['text-foreground', 'text-primary'].map(className => {
      const reference = document.createElement('span');
      reference.className = className;
      reference.style.cssText = 'position:fixed;left:-10000px;pointer-events:none';
      document.body.append(reference);
      const color = getComputedStyle(reference).color;
      reference.remove();
      return color;
    }));
    if (CONTROL === 'hover') {
      fired.hover += await page.evaluate(() => {
        let removed = 0;
        const strip = parent => {
          for (let index = parent.cssRules.length - 1; index >= 0; index--) {
            const rule = parent.cssRules[index];
            if (rule.selectorText === '.group:hover .group-hover\\:text-primary') { parent.deleteRule(index); removed++; }
            else if (rule.cssRules) strip(rule);
          }
        };
        for (const sheet of document.styleSheets) {
          if (sheet.href && new URL(sheet.href).origin !== location.origin) continue;
          strip(sheet);
        }
        if (!removed) throw new Error('Hover control found no exact emitted CSS rule');
        return removed;
      });
    }
    const settledColor = () => title.evaluate(async element => {
      const style = getComputedStyle(element);
      const duration = list => Math.max(...list.split(',').map(value => parseFloat(value) * (value.trim().endsWith('ms') ? 1 : 1000)));
      await new Promise(resolve => setTimeout(resolve, duration(style.transitionDuration) + duration(style.transitionDelay) + 50));
      return getComputedStyle(element).color;
    });
    const before = await settledColor();
    await tile.hover();
    const after = await settledColor();
    assert.ok(colors[0] !== colors[1] && before === colors[0] && after === colors[1] && before !== after, CHECKS.hover);
    console.log(`    emitted colors: ${before} to ${after}`);
  },
};

console.log(`playBuildCompatibility: ${DEV ? 'development' : 'production'} at ${BASE.origin}, control=${CONTROL || 'none'}`);
try {
  for (const [name, run] of Object.entries(cases)) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
    try {
      await context.addInitScript(() => {
        if (location.protocol === 'http:' || location.protocol === 'https:') localStorage.setItem('cookie-consent', 'essential');
      });
      await context.route('**/*', async route => {
        const url = new URL(route.request().url());
        if (['http:', 'https:'].includes(url.protocol) && url.origin !== BASE.origin) { blockedHttp++; return route.abort(); }
        if (CONTROL === 'boot' && name === 'boot' && url.origin === entry.origin && url.pathname === entry.pathname) {
          fired.boot++;
          return route.fulfill({ status: 200, contentType: 'application/javascript', body: '' });
        }
        return route.continue();
      });
      await context.routeWebSocket('**/*', socket => {
        const url = new URL(socket.url());
        const origin = url.origin.replace(/^ws/, 'http');
        if (DEV && origin === BASE.origin) socket.connectToServer();
        else { blockedWs++; socket.close(); }
      });
      const page = await context.newPage();
      page.setDefaultTimeout(10000);
      page.on('pageerror', error => runtimeErrors.push(`${name}: ${error.message}`));
      page.on('response', response => {
        if (new URL(response.url()).origin === BASE.origin && response.status() >= 400) runtimeErrors.push(`${name}: HTTP ${response.status()} ${response.url()}`);
      });
      page.on('requestfailed', request => {
        if (new URL(request.url()).origin === BASE.origin) runtimeErrors.push(`${name}: ${request.failure()?.errorText} ${request.url()}`);
      });
      await run(page);
      console.log(`  PASS ${name}`);
    } catch (error) {
      failures.push({ name, error });
      console.log(`  FAIL ${name}: ${error.name}: ${error.message}`);
    } finally { await context.close(); }
  }
} finally { await browser.close(); }
const expectedFailure = CONTROL && failures.length === 1 && failures[0].name === CONTROL
  && failures[0].error instanceof AssertionError && failures[0].error.message === CHECKS[CONTROL];
const ok = runtimeErrors.length === 0 && (CONTROL ? expectedFailure && fired[CONTROL] > 0 : failures.length === 0);
for (const error of runtimeErrors) console.error(`  RUNTIME ${error}`);
console.log(`  Aborted off-origin HTTP(S): ${blockedHttp}; blocked WebSockets: ${blockedWs}`);
console.log(CONTROL ? `  Control mutations: ${fired[CONTROL]}, exact named failure: ${!!expectedFailure}` : `  Normal cases passed: ${4 - failures.length}/4`);
console.log(`playBuildCompatibility: ${ok ? 'PASS' : 'FAIL'}${CONTROL ? ' (negative control)' : ''}. JSON bundling and emitted CSS only; no factual-data or HMR claim.`);
if (!ok) process.exitCode = 1;
