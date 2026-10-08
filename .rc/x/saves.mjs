// Reviewer check for Round 1142: with ORDINARY storage, does the branch write what the base writes,
// and does a browser full of saves made by the base's build load on the branch? OLD = base build, NEW = branch build.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const OLD = process.env.OLD;
const NEW = process.env.NEW;
const OUT = process.env.RC_OUT ?? '.';
const log = (...a) => console.log(...a);
const registry = new Set([...fs.readFileSync('src/data/gameRegistry.ts', 'utf8').matchAll(/path:\s*['"](\/[a-z0-9\/-]+)['"]/g)].map(m => m[1]));
const WANT = ['/soccer-career', '/club-manager', '/nba-my-career', '/nfl-my-career', '/stadium-tycoon', '/college-grid', '/front-office',
  '/build-your-xi', '/footle', '/free-kick', '/connections', '/ufc', '/football-grid', '/baseball-career', '/baseball-connections',
  '/hockey-career', '/hockey-higher-lower', '/soccer-grid', '/conquest', '/conquest-nba', '/world-cup-bracket', '/nfl-connections',
  '/nba-career', '/hof-or-bust', '/score-predictor', '/football-draft', '/football-timeline', '/world-cup', '/world-cup-predictor', '/lineup-builder'];
const ROUTES = WANT.filter(r => registry.has(r));
log(`routes: ${ROUTES.length} of ${WANT.length} are in the registry; skipped ${WANT.filter(r => !registry.has(r)).join(' ') || 'none'}`);

/* The same dice on both builds, so the two walks press the same things. */
function seedRandom() {
  let s = 1234567;
  Math.random = () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
}
function pressNext(n) {
  const visible = el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const label = el => ((el.innerText || el.getAttribute('aria-label') || el.title || '').replace(/\s+/g, ' ').trim()).slice(0, 40);
  const CHROME = '[data-site-chrome], header, nav, footer, [role="region"][aria-label="Cookie choices"], section[aria-label="Live scores ticker"]';
  const AVOID = /sign ?(in|up)|log ?(in|out)|share|report|delete|reset|clear|erase|theme|install|export|import|leaderboard|copy|sound|mute|feedback|account|light mode|dark mode|how to|rules|help|give up|abandon|quit|skip|hint|reveal|settings|^back|^home|menu|pause/i;
  const GO = /play|start|begin|got it|let'?s|continue|new |create|next|kick|sim|roll|deal|spin|pick|choose|select|confirm|advance|ready|go\b|ok\b|done/i;
  const dialogs = [...document.querySelectorAll('[role="dialog"], [role="alertdialog"]')].filter(visible);
  const scope = dialogs.length ? dialogs[dialogs.length - 1] : document.getElementById('root');
  if (!scope) return null;
  const pool = [...scope.querySelectorAll('button:not([disabled])')]
    .filter(el => visible(el) && !el.closest(CHROME) && !el.hasAttribute('data-harness-pressed') && !AVOID.test(label(el)));
  if (!pool.length) return null;
  const pickd = pool.find(el => GO.test(label(el))) || pool[0];
  pickd.setAttribute('data-harness-pressed', String(n));
  const what = label(pickd) || '(no label)';
  pickd.click();
  return what;
}
async function settle(page, capMs = 8000) {
  const started = Date.now();
  let last = ''; let same = 0;
  while (Date.now() - started < capMs) {
    const sig = await page.evaluate(() => {
      const root = document.getElementById('root');
      if (!root) return 'noroot';
      return `${root.querySelectorAll('button').length}/${root.querySelectorAll('a[href]').length}/${!!root.querySelector('[aria-label="Loading"]')}/${!!document.getElementById('dukb-boot')}`;
    }).catch(() => 'gone');
    if (sig === last && !/true/.test(sig)) same += 1; else same = 0;
    if (same >= 3) return;
    last = sig;
    await page.waitForTimeout(250);
  }
}
const dump = page => page.evaluate(() => {
  const o = { local: {}, session: {} };
  for (let i = 0; i < localStorage.length; i += 1) { const k = localStorage.key(i); o.local[k] = localStorage.getItem(k); }
  for (let i = 0; i < sessionStorage.length; i += 1) { const k = sessionStorage.key(i); o.session[k] = sessionStorage.getItem(k); }
  return o;
});
const state = page => page.evaluate(() => {
  const root = document.getElementById('root');
  return {
    buttons: root ? root.querySelectorAll('button').length : 0,
    dialogs: document.querySelectorAll('[role="dialog"], [role="alertdialog"]').length,
    boundary: [...document.querySelectorAll('h1, h2')].some(h => /This page broke/i.test(h.textContent || '')),
    notice: !!document.querySelector('[data-dukb-storage-notice]'),
    banner: !!document.querySelector('[role="region"][aria-label="Cookie choices"]'),
  };
});
/* clock stamps and ids differ run to run on one build too: compare the shape around them */
const norm = v => String(v).replace(/\d{10,}/g, 'T').replace(/\d{4}-\d{2}-\d{2}T[\d:.]+Z/g, 'ISO').replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, 'UUID');

async function open(browser, base) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(seedRandom);
  const page = await ctx.newPage();
  const errors = [];
  const origin = new URL(base).origin;
  await page.route('**/*', r => { let same = true; try { same = new URL(r.request().url()).origin === origin; } catch { same = true; } return same ? r.continue() : r.abort(); });
  page.on('pageerror', e => errors.push(String(e && e.message ? e.message : e).split('\n')[0].slice(0, 140)));
  return { ctx, page, errors };
}

/* Phase 1: play each route a little on a build, from an empty browser. */
async function play(browser, base, tagName) {
  const { ctx, page, errors } = await open(browser, base);
  const perRoute = {};
  await page.goto(base + '/', { waitUntil: 'load' });
  await settle(page);
  const banner = page.locator('[role="region"][aria-label="Cookie choices"]');
  if (await banner.count()) await banner.getByRole('button', { name: 'Essential only', exact: true }).click().catch(() => {});
  for (const route of ROUTES) {
    const presses = [];
    try {
      await page.goto(base + route, { waitUntil: 'load', timeout: 45000 });
      await settle(page);
      for (let n = 0; n < 4; n += 1) {
        const what = await page.evaluate(pressNext, n).catch(() => null);
        if (!what) break;
        presses.push(what);
        await page.waitForTimeout(500);
        await settle(page, 3000);
      }
    } catch (e) { presses.push('CRASH ' + String(e).slice(0, 60)); }
    perRoute[route] = { presses, ...(await state(page).catch(() => ({}))) };
  }
  const stored = await dump(page);
  log(`${tagName}: played ${ROUTES.length} routes, ${Object.keys(stored.local).length} localStorage keys, ${Object.keys(stored.session).length} sessionStorage keys, ${errors.length} uncaught errors`);
  return { ctx, page, errors, perRoute, stored };
}

/* Phase 2: a browser holding `stored`, on a build: revisit every route and say what is there. */
async function revisit(browser, base, stored, tagName) {
  const { ctx, page, errors } = await open(browser, base);
  await page.goto(base + '/about', { waitUntil: 'load' });
  await page.evaluate(s => {
    localStorage.clear();
    for (const [k, v] of Object.entries(s.local)) localStorage.setItem(k, v);
  }, stored);
  const perRoute = {};
  for (const route of ROUTES) {
    const before = errors.length;
    try {
      await page.goto(base + route, { waitUntil: 'load', timeout: 45000 });
      await settle(page);
      perRoute[route] = { ...(await state(page)), errors: errors.slice(before) };
    } catch (e) { perRoute[route] = { crash: String(e).slice(0, 80) }; }
  }
  const after = await dump(page);
  log(`${tagName}: revisited ${ROUTES.length} routes with the stored saves, ${Object.keys(after.local).length} keys after, ${errors.length} uncaught errors`);
  await ctx.close();
  return { perRoute, after };
}

function compareStores(a, b, what) {
  const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();
  const onlyA = keys.filter(k => !(k in b));
  const onlyB = keys.filter(k => !(k in a));
  const differ = keys.filter(k => k in a && k in b && norm(a[k]) !== norm(b[k]));
  const exact = keys.filter(k => k in a && k in b && a[k] === b[k]).length;
  log(`${what}: ${keys.length} keys in all, ${exact} byte identical, only in base ${onlyA.length}, only in branch ${onlyB.length}, differing after normalising clock stamps ${differ.length}`);
  for (const k of onlyA.slice(0, 12)) log(`   only base:   ${k} = ${String(a[k]).slice(0, 70)}`);
  for (const k of onlyB.slice(0, 12)) log(`   only branch: ${k} = ${String(b[k]).slice(0, 70)}`);
  for (const k of differ.slice(0, 12)) {
    const x = norm(a[k]); const y = norm(b[k]);
    let i = 0; while (i < x.length && x[i] === y[i]) i += 1;
    log(`   differs:     ${k} (lengths ${a[k].length} and ${b[k].length}) at ${i}: base "${x.slice(Math.max(0, i - 20), i + 40)}" branch "${y.slice(Math.max(0, i - 20), i + 40)}"`);
  }
  return { keys: keys.length, exact, onlyA, onlyB, differ };
}

const browser = await chromium.launch();
/* the base twice first: how much do two walks of ONE build differ? That is the noise floor. */
const base1 = await play(browser, OLD, 'base walk 1');
const base2 = await play(browser, OLD, 'base walk 2');
const branch = await play(browser, NEW, 'branch walk');
log('\nNOISE FLOOR (base against base)');
const noise = compareStores(base1.stored.local, base2.stored.local, 'localStorage base vs base');
log('\nBASE AGAINST BRANCH, ordinary storage, same presses');
const cmp = compareStores(base1.stored.local, branch.stored.local, 'localStorage base vs branch');
compareStores(base1.stored.session, branch.stored.session, 'sessionStorage base vs branch');
const probe = Object.keys(branch.stored.local).concat(Object.keys(branch.stored.session)).filter(k => /probe/i.test(k));
log(`probe key left behind on the branch: ${probe.length ? probe.join(' ') : 'none'}`);
let pressDiff = 0;
for (const r of ROUTES) {
  const a = base1.perRoute[r]; const b = branch.perRoute[r];
  if (JSON.stringify(a.presses) !== JSON.stringify(b.presses) || a.boundary !== b.boundary || b.notice) {
    pressDiff += 1;
    log(`   ${r}: base pressed ${JSON.stringify(a.presses)} branch ${JSON.stringify(b.presses)} boundary ${a.boundary}/${b.boundary} notice on branch ${b.notice}`);
  }
}
log(`routes where the two builds were pressed differently, broke, or the branch showed the notice: ${pressDiff}`);
log(`uncaught errors: base ${base1.errors.length}, branch ${branch.errors.length}${branch.errors.length ? ' first: ' + branch.errors[0] : ''}`);

log('\nOLD SAVES: the browser the base filled, opened on the base again and on the branch');
const onOld = await revisit(browser, OLD, base1.stored, 'base saves on base');
const onNew = await revisit(browser, NEW, base1.stored, 'base saves on branch');
let loadDiff = 0;
for (const r of ROUTES) {
  const a = onOld.perRoute[r]; const b = onNew.perRoute[r];
  const off = !a || !b || a.crash || b.crash || a.boundary !== b.boundary || a.dialogs !== b.dialogs || Math.abs(a.buttons - b.buttons) > 2 || (b.errors || []).length > (a.errors || []).length || b.notice;
  if (off) { loadDiff += 1; log(`   ${r}: base ${JSON.stringify(a)} branch ${JSON.stringify(b)}`); }
}
log(`routes that came back differently on the branch: ${loadDiff} of ${ROUTES.length}`);
const kept = compareStores(onOld.after.local, onNew.after.local, 'storage after the revisit, base vs branch');
const lost = Object.keys(base1.stored.local).filter(k => !(k in onNew.after.local));
log(`keys the base wrote that are gone after loading on the branch: ${lost.length} ${lost.slice(0, 8).join(' ')}`);
const changed = Object.keys(base1.stored.local).filter(k => k in onNew.after.local && onNew.after.local[k] !== base1.stored.local[k]);
const changedOld = Object.keys(base1.stored.local).filter(k => k in onOld.after.local && onOld.after.local[k] !== base1.stored.local[k]);
log(`keys whose bytes changed just by loading: on the branch ${changed.length}, on the base ${changedOld.length}; branch only: ${changed.filter(k => !changedOld.includes(k)).join(' ') || 'none'}`);
fs.writeFileSync(path.join(OUT, 'saves-report.json'), JSON.stringify({ noise, cmp, kept, lost, changed, changedOld, base: base1.perRoute, branch: branch.perRoute, onOld: onOld.perRoute, onNew: onNew.perRoute }, null, 1));
await browser.close();
log(`saves: base vs branch only-in-one ${cmp.onlyA.length + cmp.onlyB.length} (noise ${noise.onlyA.length + noise.onlyB.length}), differing ${cmp.differ.length} (noise ${noise.differ.length}), came back differently ${loadDiff}, lost ${lost.length}`);
