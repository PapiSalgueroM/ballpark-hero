// Release AM reviewer (us-careers), never committed. Walks the four US My Careers on the merged build the way a
// player would, with a storage fault a test can switch on, and writes screenshots plus a JSON report.
// usage: node walk.mjs <shotsDir> <reportFile>      BASE defaults to http://127.0.0.1:4382
import fs from 'node:fs';
import path from 'node:path';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const { chromium } = pw;
const BASE = process.env.BASE || 'http://127.0.0.1:4382';
const SHOTS = process.argv[2];
const REPORT = process.argv[3];
fs.mkdirSync(SHOTS, { recursive: true });
const report = { base: BASE, checks: [], notes: [], errors: [], shots: [] };
const save = () => fs.writeFileSync(REPORT, JSON.stringify(report, null, 2));
const check = (ok, name, detail = '') => { report.checks.push({ ok: !!ok, name, detail: String(detail).slice(0, 600) }); console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ' | ' + String(detail).slice(0, 300) : ''}`); save(); };
const note = (name, detail) => { report.notes.push({ name, detail }); console.log(`note ${name} | ${JSON.stringify(detail).slice(0, 400)}`); save(); };
const keyOf = slug => `${slug}-my-career-save-v1`;
const ALLOW = /^https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com|flagcdn\.com)\//;

async function open(browser, vp, slug, tag) {
  const context = await browser.newContext({ viewport: vp, deviceScaleFactor: 1 });
  const completions = [];
  // Production is off limits: the database host is aborted first, then every other host that is not the local build.
  await context.route(/supabase\.co/, route => {
    const req = route.request();
    if (req.method() === 'POST' && /game_completions/.test(req.url())) completions.push(req.postData() || '');
    return route.abort();
  });
  await context.route(url => !url.href.startsWith(BASE) && !/supabase\.co/.test(url.href) && !ALLOW.test(url.href), route => route.abort());
  await context.addInitScript(({ slugs }) => {
    try {
      for (const s of slugs) localStorage.setItem(`rules-gate-seen:/${s}-my-career`, '1');
      localStorage.setItem('cookie-consent', 'essential');
    } catch { /* storage blocked */ }
    const fault = { block: sessionStorage.getItem('__review_block') === '1', log: [] };
    window.__fault = fault;
    const KEY = /-my-career-save-v1$/;
    for (const m of ['setItem', 'removeItem']) {
      const orig = Storage.prototype[m];
      Storage.prototype[m] = function patched(k, v) {
        if (this === window.localStorage && KEY.test(String(k))) {
          const refused = fault.block;
          fault.log.push({ m, k: String(k), v: m === 'setItem' ? String(v) : null, refused });
          if (refused) throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
        }
        return orig.apply(this, arguments);
      };
    }
  }, { slugs: ['nfl', 'nba', 'mlb', 'nhl'] });
  const page = await context.newPage();
  page.on('pageerror', e => report.errors.push({ tag, slug, kind: 'pageerror', text: String(e).slice(0, 400) }));
  page.on('console', m => {
    if (m.type() !== 'error') return;
    const t = m.text();
    if (/ERR_FAILED|ERR_ABORTED|Failed to load resource|net::|supabase|Failed to fetch|AuthRetryableFetchError/i.test(t)) return;
    report.errors.push({ tag, slug, kind: 'console', text: t.slice(0, 400) });
  });
  let n = 0;
  const shot = async (name, full = false) => {
    n += 1;
    const file = path.join(SHOTS, `${tag}-${slug}-${String(n).padStart(2, '0')}-${name}.png`);
    await page.screenshot({ path: file, fullPage: full });
    report.shots.push(file);
    return file;
  };
  const block = on => page.evaluate(v => { window.__fault.block = v; sessionStorage.setItem('__review_block', v ? '1' : '0'); }, on);
  const stored = () => page.evaluate(k => localStorage.getItem(k), keyOf(slug));
  const lastAttempt = () => page.evaluate(() => window.__fault.log[window.__fault.log.length - 1] || null);
  const goto = async () => { await page.goto(`${BASE}/${slug}-my-career`, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(1800); };
  return { context, page, shot, block, stored, lastAttempt, goto, completions, slug, tag, vp };
}

/* One step of a season or an offseason: clicks whatever card is up. Returns what it did, or 'hub' or 'retired'. */
async function advance(page) {
  const tryClick = async (sel, what) => {
    const loc = page.locator(sel).first();
    if (await loc.count() && await loc.isVisible()) { await loc.click(); await page.waitForTimeout(450); return what; }
    return null;
  };
  return await tryClick('[data-season-reveal] button:has-text("Continue")', 'reveal')
    || await tryClick('[data-rivalry-event] button:has-text("Continue")', 'rivalry-event')
    || await tryClick('[data-rivalry-choice] button:has-text("Continue")', 'rivalry-outcome')
    || await tryClick('[data-rivalry-option]', 'rivalry-option')
    || await tryClick('[data-decision-continue]', 'decision-continue')
    || await tryClick('[data-career-decision-option]', 'decision-option')
    || await tryClick('button:has-text("One more year")', 'talk-one-more')
    || await tryClick('[data-extension-talk] button:has-text("Play it out")', 'extension-decline')
    || ((await page.locator('button:has-text("Play the")').count()) ? 'hub' : null)
    || ((await page.getByText('retires', { exact: false }).count()) ? 'retired' : null)
    || 'unknown';
}

async function toHub(page, max = 30) {
  const trail = [];
  for (let i = 0; i < max; i += 1) {
    const did = await advance(page);
    trail.push(did);
    if (did === 'hub' || did === 'retired') return trail;
    if (did === 'unknown') { await page.waitForTimeout(700); }
  }
  return trail;
}

export { open, advance, toHub, check, note, report, save, keyOf, BASE, chromium };
