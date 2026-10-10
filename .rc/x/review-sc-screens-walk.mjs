// Reviewer (sc-screens, Release AU): play Soccer Career's new screens on a served build and photograph them.
// env: BASE (served dist), RC_OUT (where shots and the report go), NEW_SAVES, OLD_SAVES (files the maker wrote),
//      ONLY (optional comma list of journey names), WIDTHS (optional comma list)
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const { chromium } = (await import(pathToFileURL(path.resolve('scripts/lib/playwrightLoader.mjs')).href)).default;

const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || path.resolve('.tmp-fx/review-sc-out');
fs.mkdirSync(OUT, { recursive: true });
const NEW = JSON.parse(fs.readFileSync(process.env.NEW_SAVES || '/tmp/rev-new.json', 'utf8'));
const OLD = fs.existsSync(process.env.OLD_SAVES || '/tmp/rev-old.json') ? JSON.parse(fs.readFileSync(process.env.OLD_SAVES || '/tmp/rev-old.json', 'utf8')) : { saves: {}, notes: {} };
const ONLY = (process.env.ONLY || '').split(',').filter(Boolean);
const SIZES = { 320: [320, 568], 375: [375, 667], 391: [390, 664], 390: [390, 844], 430: [430, 932], 1280: [1280, 900] };
const QUALITY = Number(process.env.QUALITY || 62);
const WIDTHS = (process.env.WIDTHS || '320,390,1280').split(',').map(Number);
const KEY = 'soccerCareerSave';
const report = { base: BASE, notes: { new: NEW.notes, old: OLD.notes }, journeys: [] };
const say = line => console.log(line);

const browser = await chromium.launch({ headless: true });

/** One visit: a fresh context at one size with one save planted once (a reload keeps what the page wrote). */
async function visit(name, width, save, opts, body) {
  if (ONLY.length && !ONLY.includes(name)) return;
  if (!save) { report.journeys.push({ id: `${width}-${name}`, skipped: 'no save' }); say(`SKIP ${width}-${name}: no save`); return; }
  const [w, h] = SIZES[width];
  const id = `${process.env.PREFIX || ''}${width}-${name}`;
  const row = { id, facts: [], problems: [], errors: [], shots: [] };
  report.journeys.push(row);
  const context = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: w < 1000, isMobile: w < 1000, reducedMotion: opts.reduced ? 'reduce' : 'no-preference' });
  await context.addInitScript(([key, value, extra]) => {
    if (!sessionStorage.getItem('rev-seeded')) {
      localStorage.setItem('cookie-consent', 'essential');
      localStorage.setItem(key, value);
      for (const [k, v] of extra) localStorage.setItem(k, v);
      sessionStorage.setItem('rev-seeded', '1');
    }
  }, [KEY, JSON.stringify(save), opts.extra || []]);
  await context.route(/supabase\.co/, r => r.abort());
  const page = await context.newPage();
  page.on('pageerror', e => row.errors.push('pageerror: ' + String(e).slice(0, 300)));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_CONNECTION|ERR_FAILED|net::|Failed to load resource/.test(m.text())) row.errors.push('console: ' + m.text().slice(0, 300)); });
  const T = {
    page, row, width: w, height: h, id,
    fact: (label, value) => { row.facts.push({ label, value }); say(`  ${id} ${label}: ${typeof value === 'string' ? value : JSON.stringify(value)}`); },
    problem: (label, value) => { row.problems.push({ label, value }); say(`  PROBLEM ${id} ${label}: ${typeof value === 'string' ? value : JSON.stringify(value)}`); },
    shot: async (step, full = false) => { const file = `${id}-${step}.jpg`; await page.screenshot({ path: path.join(OUT, file), fullPage: full, type: 'jpeg', quality: QUALITY }).catch(e => row.errors.push('shot ' + step + ': ' + String(e).slice(0, 120))); row.shots.push(file); },
    saved: () => page.evaluate(k => JSON.parse(localStorage.getItem(k) || 'null'), KEY),
    raw: () => page.evaluate(k => localStorage.getItem(k), KEY),
    where: () => page.evaluate(() => { const a = document.activeElement; return { y: Math.round(scrollY), overflow: document.body.style.overflow, locked: document.body.getAttribute('data-scroll-locked'), active: !a ? 'none' : a.hasAttribute('data-soccer-programme-open') ? 'programme-open' : a.hasAttribute('data-squad-tile') ? 'squad-tile' : a.tagName + ':' + (a.textContent || '').trim().slice(0, 40) }; }),
    settle: (ms = 350) => page.waitForTimeout(ms),
    /* the page position at the moment of the press itself (Playwright may scroll a target clear of the pinned bar first) */
    press: async locator => { await locator.evaluate(e => { window.__revPress = null; e.addEventListener('click', () => { window.__revPress = { y: Math.round(scrollY), locked: document.body.getAttribute('data-scroll-locked') }; }, { capture: true, once: true }); }); await locator.click(); return page.evaluate(() => window.__revPress); },
  };
  try {
    await page.goto(BASE + '/soccer-career', { waitUntil: 'networkidle' });
    await page.evaluate(async () => { await document.fonts.ready; });
    if (!report.fonts) { report.fonts = await page.evaluate(() => ({ status: document.fonts.status, loaded: [...new Set([...document.fonts].filter(f => f.status === 'loaded').map(f => f.family))], body: getComputedStyle(document.body).fontFamily.slice(0, 80) })); say('fonts: ' + JSON.stringify(report.fonts)); }
    await body(T);
  } catch (e) {
    row.failed = String(e?.stack || e).split('\n').slice(0, 3).join(' | ').slice(0, 500);
    say(`FAIL ${id}: ${row.failed}`);
    await T.shot('FAILURE');
  } finally {
    if (row.errors.length) say(`  ${id} errors: ${JSON.stringify(row.errors).slice(0, 600)}`);
    await context.close();
  }
}

/** What a rule of the site can measure inside one element: small text, small targets, cut text, sideways overflow. */
async function audit(T, selector, label) {
  const found = await T.page.evaluate(sel => {
    const root = document.querySelector(sel);
    if (!root) return { missing: true };
    const vw = document.documentElement.clientWidth, vh = innerHeight;
    const seen = el => { const r = el.getBoundingClientRect(), s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && Number(s.opacity) > 0; };
    const small = [], targets = [], cut = [], wide = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const text = n.textContent.trim(); const el = n.parentElement;
      if (!text || !el || !seen(el)) continue;
      const size = parseFloat(getComputedStyle(el).fontSize);
      if (size < 11.9) small.push({ text: text.slice(0, 50), size });
    }
    for (const b of root.querySelectorAll('button, a[href], [role="button"], input, select')) {
      if (!seen(b)) continue;
      const r = b.getBoundingClientRect();
      if (r.height < 43.5 || r.width < 43.5) targets.push({ text: (b.getAttribute('aria-label') || b.textContent || '').trim().slice(0, 40), w: Math.round(r.width), h: Math.round(r.height), disabled: !!b.disabled });
    }
    for (const el of root.querySelectorAll('*')) {
      if (!seen(el)) continue;
      const s = getComputedStyle(el), r = el.getBoundingClientRect();
      if ((s.textOverflow === 'ellipsis' || s.overflowX === 'hidden') && el.scrollWidth > el.clientWidth + 1 && el.children.length === 0 && el.textContent.trim()) cut.push({ text: el.textContent.trim().slice(0, 50), has: el.clientWidth, needs: el.scrollWidth });
      if (r.right > vw + 1 || r.left < -1) wide.push({ tag: el.tagName, text: (el.textContent || '').trim().slice(0, 40), left: Math.round(r.left), right: Math.round(r.right) });
    }
    const r = root.getBoundingClientRect();
    return { rect: { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right) }, vw, vh, pageWide: document.documentElement.scrollWidth > vw + 1, small: small.slice(0, 12), targets: targets.slice(0, 12), cut: cut.slice(0, 12), wide: wide.slice(0, 8) };
  }, selector);
  if (found.missing) { T.problem(label + ': audit', 'element missing ' + selector); return found; }
  if (found.small.length) T.problem(label + ': text under 12px', found.small);
  if (found.targets.length) T.problem(label + ': tap targets under 44px', found.targets);
  if (found.cut.length) T.problem(label + ': cut text', found.cut);
  if (found.wide.length || found.pageWide) T.problem(label + ': sideways overflow', { pageWide: found.pageWide, wide: found.wide });
  if (found.rect.bottom > found.vh + 1 || found.rect.top < -1 || found.rect.right > found.vw + 1) T.problem(label + ': not inside the screen', found.rect);
  return found;
}

const ctx = { visit, audit, NEW: NEW.saves, OLD: OLD.saves, notes: NEW.notes, WIDTHS, KEY, say };
for (const file of (process.env.FILES || 'j1,j2,j3,j4').split(',')) {
  const mod = path.join(path.dirname(new URL(import.meta.url).pathname), `review-sc-screens-${file}.mjs`);
  if (!fs.existsSync(mod)) { say(`no journey file ${file}`); continue; }
  try { await (await import(new URL(`./review-sc-screens-${file}.mjs`, import.meta.url).href)).default(ctx); }
  catch (e) { say(`JOURNEY FILE ${file} THREW: ${String(e?.stack || e).slice(0, 600)}`); report.journeys.push({ id: file, failed: String(e).slice(0, 300) }); }
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));
}
await browser.close();
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));
const problems = report.journeys.reduce((n, j) => n + (j.problems?.length || 0), 0), failed = report.journeys.filter(j => j.failed).length;
say(`review-sc-screens walk: ${report.journeys.length} journeys, ${failed} stopped early, ${problems} measured problems, ${report.journeys.reduce((n, j) => n + (j.shots?.length || 0), 0)} shots`);
