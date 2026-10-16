/* Round 1338: a page that loses one of its files waits for its one reload
   instead of flashing "This page broke" first. The browser half of the proof
   (scripts/simPreloadWait.mjs is the node half).

   dist is served by scripts/lib/hostLikeServer.mjs; every other host is
   aborted (fonts included: the page draws with fallback fonts). Two sizes,
   390 by 844 (touch) and 1280 by 900, cookie consent "essential". Rows:
   A  /soccer-career loaded cold, its route chunk (SoccerCareer-*.js) fails: a
      plain route lazy, the flagship. Waits on the route spinner.
   B  / , the About chunk (HomeAbout-*.js) fails: a mapped lazy mounted on
      every visit. The home page stays, without its About block.
   C  /club-manager, its search title part fails at once and its guide
      (clubManagement-*.js) 500 ms later, so the guide fails second, in a page
      that has already asked for its reload: the page flag end to end.
   D  / , then the Soccer Career tile is TAPPED with its route chunk failing.
      A client side link (asserted: no document request before the failure),
      so React Router keeps the home page drawn while the route loads.
   Each fault row has a null arm first (same route, nothing failed): its
   console errors and page errors are the environment's baseline, and the
   fault arm is compared with it by message and URL.
   The failed file answers 404 to every request until the reload's document
   request arrives; that request is HELD 2.5 s, so the old page stays alive
   and both arms are deterministic. During the hold, sampled at about 0.8, 1.5
   and 2.2 s: no "This page broke", no page error, no console error past the
   baseline but the browser's own line for each failed file, the once flag
   '1', the row's waiting state, scrollY unmoved. After it: two document
   loads in all, the page whole, no error. The wait (first failed request to
   the fresh document's response) is printed, never asserted. Pictures during
   the hold and after, per row and size, go to RC_OUT (or .tmp-fx).

   Control PLAY_RELOAD_WAIT_CONTROL=stock walks the stock control dist
   (node scripts/simPreloadWait.mjs --build-stock dist-stock): during the
   hold A and D must show "This page broke" with "reading 'default'", B with
   "reading 'HomeAbout'", C a page error "Cannot convert undefined or null to
   object". Every row must fire: exit 1 when all fired, 3 when one did not.
   Head: exit 0 green, 1 red. 2: could not run. */
import fs from 'node:fs';
import path from 'node:path';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import pw from './lib/playwrightLoader.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.PLAY_RELOAD_WAIT_CONTROL || '';
if (CONTROL && CONTROL !== 'stock') { console.error('unknown control ' + CONTROL); process.exit(2); }
const STOCK = CONTROL === 'stock';
const DIST = path.resolve(ROOT, STOCK ? (process.env.PRELOAD_WAIT_STOCK_DIST || 'dist-stock') : (process.env.PLAY_RELOAD_WAIT_DIST || 'dist'));
const OUT = path.resolve(ROOT, process.env.RC_OUT || '.tmp-fx/reload-wait', STOCK ? 'stock' : 'head');
const HOLD_MS = 2500;
const SAMPLES = [800, 1500, 2200];
const SIZES = [{ width: 390, height: 844 }, { width: 1280, height: 900 }];
const KEY = 'dukb-reloaded-stale-chunk';
const sleep = ms => new Promise(r => setTimeout(r, ms));
if (!fs.existsSync(path.join(DIST, 'assets'))) { console.error(`no ${DIST}/assets: build first`); process.exit(2); }
fs.mkdirSync(OUT, { recursive: true });

const assets = fs.readdirSync(path.join(DIST, 'assets'));
function one(re, what) {
  const m = assets.filter(f => re.test(f));
  if (m.length !== 1) { console.error(`${m.length} files in ${DIST}/assets match ${what}, expected one`); process.exit(2); }
  return '/assets/' + m[0];
}
/* the part rule of src/data/seoMetaParts/index.ts: FNV-1a over the path, modulo 32 */
function seoMetaPart(p) {
  let h = 0x811c9dc5;
  for (let i = 0; i < p.length; i += 1) { h ^= p.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0) % 32;
}
const NN = String(seoMetaPart('/club-manager')).padStart(2, '0');
const FILES = {
  career: one(/^SoccerCareer-[\w-]{8}\.js$/, 'SoccerCareer-*.js'),
  about: one(/^HomeAbout-[\w-]{8}\.js$/, 'HomeAbout-*.js'),
  part: one(new RegExp('^seoMetaPart' + NN + '-[\\w-]{8}\\.js$'), 'seoMetaPart' + NN + '-*.js'),
  guide: one(/^clubManagement-[\w-]{8}\.js$/, 'clubManagement-*.js'),
};
console.log(`files: ${Object.entries(FILES).map(([k, v]) => k + ' ' + v).join(', ')}`);

const ROWS = [
  { id: 'A', route: '/soccer-career', fail: [{ file: FILES.career, delay: 0 }],
    waiting: s => s.loading, whole: s => s.path === '/soccer-career' && !s.loading && s.mainText > 80,
    stock: { text: true, error: "reading 'default'" } },
  { id: 'B', route: '/', fail: [{ file: FILES.about, delay: 0 }],
    waiting: s => s.tiles > 0 && !s.about, whole: s => s.about,
    stock: { text: true, error: "reading 'HomeAbout'" } },
  { id: 'C', route: '/club-manager', fail: [{ file: FILES.part, delay: 0 }, { file: FILES.guide, delay: 500 }],
    waiting: s => s.h1.length > 0 && s.seo === 'loading', whole: s => s.seo === 'ready',
    stock: { pageerror: 'Cannot convert undefined or null to object' } },
  { id: 'D', route: '/', tap: '/soccer-career', fail: [{ file: FILES.career, delay: 0 }],
    waiting: s => s.tiles > 0, whole: s => s.path === '/soccer-career' && !s.loading && s.tiles === 0 && s.mainText > 80,
    stock: { text: true, error: "reading 'default'" } },
];
const ONLY = (process.env.ONLY_ROWS || '').split(',').filter(Boolean);

async function serve() {
  const port = await new Promise((resolve, reject) => {
    const probe = createServer(); probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => { const p = probe.address().port; probe.close(e => e ? reject(e) : resolve(p)); });
  });
  const server = spawn(process.execPath, [path.join(ROOT, 'scripts/lib/hostLikeServer.mjs'), DIST, String(port)], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((resolve, reject) => {
    let log = '';
    const t = setTimeout(() => reject(new Error('host did not start: ' + log)), 15000);
    server.stdout.on('data', d => { log += d; if (String(d).includes('host-like server:')) { clearTimeout(t); resolve(); } });
    server.stderr.on('data', d => { log += d; });
    server.once('exit', code => { clearTimeout(t); reject(new Error(`host exited ${code}: ${log}`)); });
  });
  return { server, base: `http://127.0.0.1:${port}` };
}

/* what the page shows, read in the page */
const SNAP = () => {
  const q = s => document.querySelector(s);
  let flag = null;
  try { flag = sessionStorage.getItem('dukb-reloaded-stale-chunk'); } catch { flag = 'blocked'; }
  return {
    path: location.pathname, broke: document.body.innerText.includes('This page broke'), loading: !!q('[aria-label="Loading"]'),
    tiles: document.querySelectorAll('section[data-sport]').length, about: !!q('[data-home-about]'),
    seo: q('[data-seo-content]')?.getAttribute('data-seo-content') ?? null, h1: (q('h1')?.textContent ?? '').trim().slice(0, 60),
    mainText: (q('#dukb-main') ?? document.body).innerText.length, flag, scrollY: Math.round(window.scrollY),
  };
};

const rows = [];
async function walk(browser, base, row, size, arm) {
  const fault = arm === 'fault';
  const rec = { row: row.id, route: row.route, size: `${size.width}x${size.height}`, arm, docs: [], files: [], consoleErrors: [], pageErrors: [], samples: [], issues: [] };
  const context = await browser.newContext({ viewport: size, isMobile: size.width < 1000, hasTouch: size.width < 1000, reducedMotion: 'reduce', serviceWorkers: 'block',
    storageState: { cookies: [], origins: [{ origin: base, localStorage: [{ name: 'cookie-consent', value: 'essential' }] }] } });
  const page = await context.newPage();
  page.setDefaultTimeout(25000);
  const t0 = Date.now();
  let failing = fault && !row.tap; let held = null;
  const failSpec = new Map(row.fail.map(f => [f.file, f]));
  await context.route('**/*', async route => {
    const request = route.request(); const url = new URL(request.url());
    if (url.origin !== base) return route.abort('blockedbyclient');
    if (request.isNavigationRequest() && request.frame() === page.mainFrame()) {
      const doc = { n: rec.docs.length + 1, path: url.pathname, at: Date.now() - t0 };
      rec.docs.push(doc);
      if (fault && doc.n === 2 && !held) {
        failing = false;
        held = { start: Date.now() };
        await sleep(HOLD_MS);
        held.end = Date.now();
        doc.heldMs = held.end - held.start;
      }
      return route.continue();
    }
    const spec = failSpec.get(url.pathname);
    if (fault && spec) {
      const entry = { file: url.pathname, at: Date.now() - t0, action: failing ? '404' : 'served' };
      rec.files.push(entry);
      if (failing) { if (spec.delay) await sleep(spec.delay); return route.fulfill({ status: 404, contentType: 'text/plain', body: 'Not found' }); }
    }
    return route.continue();
  });
  page.on('pageerror', e => rec.pageErrors.push(String(e).slice(0, 300)));
  page.on('console', m => { if (m.type() === 'error') rec.consoleErrors.push({ url: m.location().url ?? '', text: m.text().slice(0, 300), at: Date.now() - t0 }); });
  rec.navigated = [];
  page.on('framenavigated', f => { if (f === page.mainFrame()) rec.navigated.push({ at: Date.now() - t0, path: new URL(f.url()).pathname }); });
  /* The page reports what it shows every 100 ms through a binding, so the hold is read from the page itself:
     an evaluate from outside is refused while a navigation is pending (measured on the runner). */
  const live = [];
  await context.exposeBinding('__dukbSample', (source, s) => { if (source.frame === page.mainFrame()) live.push({ ...s, now: Date.now() }); });
  await context.addInitScript({ content: `setInterval(() => { try { if (document.body) window.__dukbSample((${SNAP.toString()})()); } catch (e) {} }, 100);` });
  const cdp = await context.newCDPSession(page);
  const shot = async tag => {
    const file = `shot-${row.id}-${size.width}-${arm}-${tag}.jpg`;
    try {
      const { data } = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 60 });
      fs.writeFileSync(path.join(OUT, file), Buffer.from(data, 'base64')); rec[tag + 'Shot'] = file;
    } catch (e) { rec.issues.push(`picture ${tag} failed: ${String(e).slice(0, 120)}`); }
  };
  try {
    rec.stage = 'goto';
    await page.goto(base + row.route, { waitUntil: fault && !row.tap ? 'commit' : 'load' });
    if (row.tap) {
      rec.stage = 'tap';
      const tile = page.locator(`section[data-sport] a[href="${row.tap}"]:visible`).first();
      await tile.waitFor({ state: 'visible' });
      await tile.scrollIntoViewIfNeeded();
      await sleep(300);
      rec.before = await page.evaluate(SNAP);
      failing = fault;
      const docsBefore = rec.docs.length;
      if (size.width < 1000) await tile.tap(); else await tile.click();
      rec.tapDocs = rec.docs.length - docsBefore;
    }
    const settle = async (pred, ms) => {
      const until = Date.now() + ms; let s = await page.evaluate(SNAP);
      while (!pred(s) && Date.now() < until) { await sleep(250); s = await page.evaluate(SNAP); }
      return s;
    };
    if (fault) {
      const until = Date.now() + 15000;
      while (!held && Date.now() < until) await sleep(50);
      if (!held) rec.issues.push('no reload document request within 15 s of the fault');
      else {
        rec.stage = 'hold';
        const loaded = page.waitForEvent('load', { timeout: 30000 }).then(() => true, e => { rec.issues.push('no load after the hold: ' + String(e).slice(0, 120)); return false; });
        for (const ms of SAMPLES) {
          const wait = held.start + ms - Date.now();
          if (wait > 0) await sleep(wait);
          if (held.end) { rec.issues.push(`the hold ended before the ${ms} ms sample`); break; }
          if (ms === 1500) await shot('hold');
        }
        await loaded;
        /* the page's own reports, the latest at or before each sample time, from inside the hold */
        for (const ms of SAMPLES) {
          const s = live.filter(x => x.now >= held.start && x.now <= held.start + ms + 50).pop();
          if (s) rec.samples.push({ ...s, t: s.now - held.start });
        }
        const lastOld = live.filter(x => x.now <= held.end).pop();
        rec.oldPageLastReportMs = lastOld ? lastOld.now - held.start : null;
      }
    }
    rec.stage = 'settle';
    rec.final = await settle(row.whole, 20000);
    await sleep(800);
    rec.final = await page.evaluate(SNAP);
    await shot('after');
    rec.held = held ? { ms: held.end - held.start } : null;
    const first = rec.files.find(f => f.action === '404');
    if (first && held?.end) rec.waitMs = held.end - t0 - first.at;
  } catch (e) {
    rec.issues.push('walk stopped at ' + rec.stage + ': ' + String(e).slice(0, 200));
  } finally {
    await context.close();
  }
  return rec;
}

const SHAPES = /This page broke|reading 'default'|reading 'HomeAbout'|Cannot convert undefined or null to object/;
/* a console error's identity: its path and text with hosts and query strings dropped (a live score read carries the clock) */
const keyOf = e => e.url.replace(/^https?:\/\/[^/]+/, '').replace(/\?.*$/, '') + ' ' + e.text.replace(/https?:\/\/[^\s'"]+/g, u => u.replace(/^https?:\/\/[^/]+/, '').replace(/\?.*$/, ''));
function judge(nul, rec, row) {
  const issues = [...rec.issues];
  const base = new Set(nul.consoleErrors.map(keyOf));
  const failed = new Set(row.fail.map(f => f.file));
  const extra = rec.consoleErrors.filter(e => !base.has(keyOf(e)) && !(/Failed to load resource/.test(e.text) && failed.has(e.url.replace(/^https?:\/\/[^/]+/, ''))));
  rec.extraConsole = extra;
  if (STOCK) {
    const all = [...rec.consoleErrors.map(e => e.text), ...rec.pageErrors];
    const broke = rec.samples.some(s => s.broke);
    const fired = row.stock.pageerror ? rec.pageErrors.some(t => t.includes(row.stock.pageerror)) : (broke && all.some(t => t.includes(row.stock.error)));
    rec.fired = fired;
    return [];
  }
  if (rec.docs.length !== 2) issues.push(`${rec.docs.length} document loads, expected 2 (${rec.docs.map(d => d.path).join(', ')})`);
  for (const f of row.fail) if (!rec.files.some(x => x.file === f.file && x.action === '404')) issues.push(`${f.file} was never asked for while failing`);
  if (row.tap) {
    const first = rec.files.find(f => f.action === '404');
    if (rec.tapDocs !== 0) issues.push(`the tap made ${rec.tapDocs} document request(s): not a client side link`);
    if (!first || !rec.docs[1] || first.at > rec.docs[1].at) issues.push('the reload document came before the failed file: not the tapped link path');
    if (rec.docs[1] && rec.docs[1].path !== row.tap) issues.push(`the reload loaded ${rec.docs[1]?.path}, expected ${row.tap}`);
  }
  if (rec.samples.length !== SAMPLES.length) issues.push(`${rec.samples.length} samples during the hold, expected ${SAMPLES.length}`);
  if (!(rec.oldPageLastReportMs >= SAMPLES[SAMPLES.length - 1])) issues.push(`the old page last reported ${rec.oldPageLastReportMs} ms into the hold: the hold did not keep it alive`);
  const ref = row.tap ? rec.before?.scrollY : rec.samples[0]?.scrollY;
  rec.samples.forEach(s => {
    if (s.broke) issues.push(`"This page broke" at ${s.t} ms into the hold`);
    if (s.flag !== '1') issues.push(`once flag ${s.flag} at ${s.t} ms, expected '1'`);
    if (!row.waiting(s)) issues.push(`not in its waiting state at ${s.t} ms: ${JSON.stringify(s)}`);
    if (s.scrollY !== ref) issues.push(`scrollY ${s.scrollY} at ${s.t} ms, was ${ref}`);
  });
  if (rec.pageErrors.length) issues.push('page error: ' + rec.pageErrors[0]);
  if (extra.length) issues.push('console error past the baseline: ' + keyOf(extra[0]));
  if (!rec.final || !row.whole(rec.final) || rec.final.broke) issues.push('not whole after the reload: ' + JSON.stringify(rec.final));
  return issues;
}

const { server, base } = await serve();
const browser = await pw.chromium.launch();
let red = 0; let fired = 0; let rowsRun = 0;
try {
  for (const row of ROWS) {
    if (ONLY.length && !ONLY.includes(row.id)) continue;
    for (const size of SIZES) {
      const nul = await walk(browser, base, row, size, 'null');
      const nulIssues = [...nul.issues];
      if (!nul.final || !row.whole(nul.final) || nul.final.broke) nulIssues.push('the null arm is not whole: ' + JSON.stringify(nul.final));
      if ([...nul.consoleErrors.map(e => e.text), ...nul.pageErrors].some(t => SHAPES.test(t))) nulIssues.push('the null arm already shows a shape of the bug');
      const rec = await walk(browser, base, row, size, 'fault');
      const issues = [...nulIssues.map(i => 'null arm: ' + i), ...judge(nul, rec, row)];
      rowsRun++;
      rows.push({ null: nul, fault: rec, issues });
      const label = `${row.id} ${row.route}${row.tap ? ' tap ' + row.tap : ''} ${size.width}`;
      const reqs = rec.files.map(f => `${f.file.split('/').pop()}:${f.action}@${f.at}`).join(' ');
      if (STOCK) {
        if (rec.fired) fired++;
        console.log(`${rec.fired ? 'fired' : 'DID NOT FIRE'} ${label}: broke=${rec.samples.map(s => s.broke).join('/')} pageErrors=${rec.pageErrors.length} | ${reqs}`);
        if (!rec.fired) console.log('   ' + JSON.stringify({ samples: rec.samples, console: rec.consoleErrors.slice(0, 3), pageErrors: rec.pageErrors.slice(0, 2), issues: rec.issues }).slice(0, 900));
      } else if (issues.length) {
        red++;
        console.log(`FAIL ${label}: ${issues.length} issue(s) | ${reqs}`);
        issues.slice(0, 6).forEach(i => console.log('   ' + i.slice(0, 300)));
        console.log('   trace ' + JSON.stringify({ docs: rec.docs, navigated: rec.navigated, lastReport: rec.oldPageLastReportMs, samples: rec.samples.map(s => ({ t: s.t, broke: s.broke, loading: s.loading, tiles: s.tiles, about: s.about, seo: s.seo, flag: s.flag, scrollY: s.scrollY })) }).slice(0, 900));
      } else {
        console.log(`ok   ${label}: waited ${rec.waitMs} ms, hold ${rec.held?.ms} ms, docs ${rec.docs.map(d => d.path).join(' ')}, scrollY ${rec.samples.map(s => s.scrollY).join('/')} | ${reqs} | ${rec.holdShot}, ${rec.afterShot}`);
      }
    }
  }
} finally {
  await browser.close();
  server.kill();
}
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ dist: DIST, control: CONTROL, files: FILES, rows: rows.map(r => ({ ...r, null: { ...r.null, samples: undefined } })) }, null, 1));
console.log('');
if (!rowsRun) { console.error('playChunkReloadWait: no rows ran'); process.exit(2); }
if (STOCK) {
  if (fired === rowsRun) { console.log(`playChunkReloadWait: control stock fired on all ${rowsRun} rows: the stock wrapper flashes the bug, so the walk can see it.`); process.exit(1); }
  console.log(`playChunkReloadWait: control stock fired on ${fired} of ${rowsRun} rows. The control proves nothing.`); process.exit(3);
}
if (red) { console.error(`playChunkReloadWait: ${red} of ${rowsRun} rows red`); process.exit(1); }
console.log(`playChunkReloadWait: green on ${rowsRun} rows. A page that loses a file waits for its one reload, no broken page, no error, nothing moved.`);
process.exit(0);

