/**
 * Round 836: EVERY PAGE IN THE SITEMAP, AT BOTH ADDRESSES, THE WAY A RENDERING
 * CRAWLER SEES IT.
 *
 * WHY THIS EXISTS. scripts/auditLive.mjs (Round 279, strengthened in Round 741)
 * asks the live site what the SERVER sends: status, canonical, robots, the
 * saved copy's readable length. It runs no JavaScript, on purpose. Google's
 * indexer does run it: it renders the page, and what it indexes is the DOM
 * after the app has mounted. Until 2026-09-30 the trailing slash form of every
 * game page served its whole guide in the raw HTML and then deleted it the
 * moment React mounted (Round 745 fixed the lookup). Nothing measured that,
 * because nothing looked at the page AFTER mount, at BOTH addresses, across the
 * whole sitemap. This does.
 *
 * WHAT IT RECORDS, per URL (every sitemap route, plain and with a trailing
 * slash), in a fresh browser context with JavaScript on:
 *   - the raw response: status, redirect target, X-Robots-Tag, title,
 *     description, canonical, robots meta, h1, JSON-LD types, internal links,
 *     and the readable blocks of the saved copy (#dukb-snapshot, or the home
 *     template's #dukb-home-copy) split into page and chrome by the same
 *     data-site-chrome mark scripts/prerender.mjs writes;
 *   - the settled DOM after mount: the same fields again, the visible readable
 *     blocks outside the chrome, the guide's word count
 *     (section[data-seo-content] article), internal links, JSON-LD types,
 *     console errors, page errors, failed requests and 4xx or 5xx responses,
 *     visible loading, error, placeholder and account-wall wording, spinners,
 *     and ad slots;
 *   - LOST ON MOUNT: every page block of the saved copy (20 characters or
 *     more) whose text appears nowhere in the settled document. That is the
 *     defect class: a crawler that renders sees a page without the words the
 *     raw HTML promised. Matched on letters and digits only, lowercased, as a
 *     substring of the whole settled text, so spacing, punctuation, case
 *     transforms and links rebuilt inline cannot fake a loss.
 *
 * HOW IT SETTLES. Mounted means #dukb-boot is gone (React clears #root on its
 * first commit, and both the snapshot and the home template carry that
 * element). Then it waits until the non chrome text has not changed for two
 * seconds with no request in flight (or four seconds of no change while
 * something long lived stays open; or eight seconds while a spinner outside
 * the chrome is still showing), capped at fifteen seconds. Then, the way
 * Google's renderer does, it stretches the viewport to the page's full height
 * so anything waiting to scroll into view renders, waits again, and measures.
 *
 * WHAT IT WILL NOT DO. It is read only. Every request that is not a GET (or a
 * POST to a Supabase /rest/v1/rpc/ read function) is aborted and listed, so
 * nothing on the live site is written. Ad and analytics hosts are aborted so a
 * headless visit can never register as ad traffic on the owner's account. No
 * consent banner is clicked, no form is touched, no account is used. The user
 * agent is Googlebot's (desktop, or smartphone for the phone pass) with an
 * audit token appended, which also keeps these visits out of visitor counts.
 *
 * RUN IT IN CHUNKS. A full pass is 339 desktop loads plus a phone sample, far
 * too long for one command, so a run takes at most 25 URLs and merges them
 * into OUT:
 *   OFFSET=0 LIMIT=25 node scripts/playLiveRenderedAudit.mjs
 *   OFFSET=25 LIMIT=25 node scripts/playLiveRenderedAudit.mjs      and so on
 *   VIEWPORT=phone SAMPLE=30 FORMS=plain OFFSET=0 LIMIT=15 node ...
 *   ONLY=/soccer-career,/club-manager node ...
 *   MODE=report node scripts/playLiveRenderedAudit.mjs
 *       reads OUT, prints every finding table the written audit uses, and
 *       writes the compact copy to COMPACT (default
 *       docs/audits/data/live-rendered-2026-10-01.json).
 *
 * NEGATIVE CONTROL, required by this repo:
 *   SERVE=<built dir> CONTROL=guidegone ONLY=/soccer-career,/club-manager \
 *     node scripts/playLiveRenderedAudit.mjs
 * starts scripts/lib/hostLikeServer.mjs on the built directory (and stops it
 * before exiting), then deletes the guide article from CONTROL_ROUTE (default
 * /soccer-career) as soon as the app draws it. The run passes only if the
 * article really existed and was removed (asserted, so a control that changed
 * nothing cannot pass), the loss rule reports that route, and it does NOT
 * report any other route in the same run. The same command without CONTROL is
 * the baseline and must report nothing.
 *
 * It talks to the internet and drives a browser, so runAllSims never runs it.
 * It is a tool for answering a question about the live site, not a guard on
 * the repo.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import pw from './lib/playwrightLoader.mjs';
import { liveIndexabilityFindings } from './lib/liveIndexability.mjs';

const { chromium } = pw;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MODE = process.env.MODE || 'crawl';
const OUT = path.resolve(process.env.OUT || path.join(ROOT, '.tmp-fx/live-rendered/results.json'));
const COMPACT = path.resolve(process.env.COMPACT || path.join(ROOT, 'docs/audits/data/live-rendered-2026-10-01.json'));
const VIEWPORT = process.env.VIEWPORT || 'desktop';
const FORMS = process.env.FORMS || 'both';
const CONCURRENCY = Math.max(1, Number(process.env.CONCURRENCY || 3));
const MAX_CHUNK = 25;
const CONTROL = process.env.CONTROL || '';
const CONTROL_ROUTE = process.env.CONTROL_ROUTE || '/soccer-career';
const PORT = Number(process.env.PORT || 4836);
const SETTLE_MAX_MS = 15000;
const QUIET_MS = 2000;
const QUIET_BUSY_MS = 4000;
const SPINNER_QUIET_MS = 8000;
const URL_BUDGET_MS = 90000;
const AD_HOSTS = /(^|\.)(googlesyndication\.com|doubleclick\.net|googletagmanager\.com|google-analytics\.com|googleadservices\.com|adservice\.google\.com|adtrafficquality\.google)$/i;

if (!['crawl', 'report'].includes(MODE)) { console.error(`MODE=${MODE} is not crawl or report`); process.exit(1); }
if (!['desktop', 'phone'].includes(VIEWPORT)) { console.error(`VIEWPORT=${VIEWPORT} is not desktop or phone`); process.exit(1); }
if (!['both', 'plain', 'slash'].includes(FORMS)) { console.error(`FORMS=${FORMS} is not both, plain or slash`); process.exit(1); }
if (CONTROL && CONTROL !== 'guidegone') { console.error(`CONTROL=${CONTROL} is not a control this harness knows`); process.exit(1); }
if (CONTROL && !process.env.SERVE) { console.error('CONTROL runs against a local build only: give SERVE=<built dir>'); process.exit(1); }

/* ---------- shared helpers (both modes) ---------- */

const norm = s => String(s || '').replace(/\s+/g, ' ').trim();
const key = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
const words = s => (String(s || '').match(/[A-Za-z0-9][A-Za-z0-9'’.-]*/g) || []).length;
const routeOf = p => (p.length > 1 && p.endsWith('/') ? p.slice(0, -1) : p) || '/';

/* The loss rule, used by the crawl summary, the control and the report alike,
   so the control proves the exact rule the audit applies. A page loses content
   on mount when the saved copy's page blocks that are nowhere in the settled
   document add up to at least 300 characters AND at least a quarter of the
   saved page text. Both halves matter: a seeded random board or a dated line
   redrawn live can leave a few hundred characters behind on a long page
   without anything being wrong, and a short page losing 300 characters has
   lost most of itself. */
const LOSS_MIN_CHARS = 300;
const LOSS_MIN_SHARE = 0.25;
const losesContent = r => !!r && !r.error && r.rawMainChars > 0
  && r.lostDomChars >= LOSS_MIN_CHARS && r.lostDomChars >= LOSS_MIN_SHARE * r.rawMainChars;

const jsonLdTypes = texts => {
  const types = new Set();
  const walk = v => {
    if (Array.isArray(v)) { v.forEach(walk); return; }
    if (!v || typeof v !== 'object') return;
    const t = v['@type'];
    if (Array.isArray(t)) t.forEach(x => types.add(String(x))); else if (t) types.add(String(t));
    for (const k of Object.keys(v)) if (k !== '@type' && typeof v[k] === 'object') walk(v[k]);
  };
  let bad = 0;
  for (const s of texts) { try { walk(JSON.parse(s)); } catch { bad += 1; } }
  return { types: [...types].sort(), unparsable: bad };
};

const readJson = f => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return {}; } };

if (MODE === 'report') {
  await report();
  process.exit(0);
}

/* ---------- crawl mode ---------- */

let server = null;
let BASE = process.env.BASE || 'https://douknowball.com';
if (process.env.SERVE) {
  const dir = path.resolve(process.env.SERVE);
  if (!fs.existsSync(path.join(dir, 'index.html'))) { console.error(`SERVE=${dir} has no index.html`); process.exit(1); }
  server = spawn(process.execPath, [path.join(ROOT, 'scripts/lib/hostLikeServer.mjs'), dir, String(PORT)], { stdio: 'ignore' });
  BASE = `http://127.0.0.1:${PORT}`;
  await new Promise(r => setTimeout(r, 1200));
}
const ORIGIN = new URL(BASE).origin;
const stopServer = () => { if (server) { server.kill(); server = null; } };
process.on('exit', stopServer);

const toRoute = href => {
  try {
    const u = new URL(href, ORIGIN);
    if (u.origin !== ORIGIN) return null;
    return routeOf(decodeURI(u.pathname));
  } catch { return null; }
};

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const ver = browser.version();
const UA = {
  desktop: `Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Googlebot/2.1; +http://www.google.com/bot.html) Chrome/${ver} Safari/537.36 DUKB-LiveRenderedAudit/836`,
  phone: `Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${ver} Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html) DUKB-LiveRenderedAudit/836`,
};
const CTX_OPTS = {
  desktop: { viewport: { width: 1366, height: 900 }, userAgent: UA.desktop },
  phone: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: UA.phone },
};

/* The sitemap the site serves, not the committed one: the question is what the
   live site asks Google to index today. */
/* Retried, because one stalled connection on 2026-10-01 timed out a request
   that curl answered in 0.2 seconds a moment later. */
const getWithRetry = async (req, url, opts, tries = 3) => {
  let last;
  for (let i = 0; i < tries; i++) {
    try { return await req.get(url, opts); } catch (e) { last = e; }
  }
  throw last;
};
let sitemapXml;
try {
  const ctx = await browser.newContext({ userAgent: UA.desktop });
  const res = await getWithRetry(ctx.request, `${BASE}/sitemap.xml`, { timeout: 20000 });
  sitemapXml = await res.text();
  await ctx.close();
} catch (e) {
  console.error(`could not read ${BASE}/sitemap.xml: ${e.message}`);
  await browser.close(); stopServer(); process.exit(1);
}
let routes = [...new Set([...sitemapXml.matchAll(/<loc>\s*https?:\/\/[^/<]+([^<]*?)\s*<\/loc>/g)].map(m => routeOf(m[1] || '/')))];
const sitemapCount = routes.length;
if (!sitemapCount) { console.error('the sitemap listed no URLs'); await browser.close(); stopServer(); process.exit(1); }
if (process.env.SAMPLE) {
  const n = Math.min(Number(process.env.SAMPLE), routes.length);
  const all = routes;
  routes = [...new Set(Array.from({ length: n }, (_, i) => all[Math.floor(i * all.length / n)]))];
}
if (process.env.ONLY) {
  const want = process.env.ONLY.split(',').map(x => routeOf(x.trim()));
  const missing = want.filter(w => !routes.includes(w));
  if (missing.length) { console.error(`ONLY names routes the sitemap does not list: ${missing.join(', ')}`); await browser.close(); stopServer(); process.exit(1); }
  routes = want;
}
const urls = [];
for (const r of routes) {
  if (FORMS !== 'slash') urls.push({ route: r, form: 'plain', path: r });
  if (FORMS !== 'plain' && r !== '/') urls.push({ route: r, form: 'slash', path: `${r}/` });
}
const OFFSET = Number(process.env.OFFSET || 0);
let LIMIT = Number(process.env.LIMIT || MAX_CHUNK);
if (LIMIT > MAX_CHUNK) { console.log(`LIMIT ${LIMIT} lowered to ${MAX_CHUNK}: one command stays short.`); LIMIT = MAX_CHUNK; }
const chunk = urls.slice(OFFSET, OFFSET + LIMIT);
console.log(`${BASE}: sitemap lists ${sitemapCount} routes; ${urls.length} URLs in this selection (${VIEWPORT}, forms ${FORMS}); auditing ${OFFSET} to ${OFFSET + chunk.length - 1}${CONTROL ? `, CONTROL=${CONTROL} on ${CONTROL_ROUTE}` : ''}.`);

/* Runs inside the page. Self contained on purpose: page.evaluate serialises it. */
function measureSettled() {
  const n = s => String(s || '').replace(/\s+/g, ' ').trim();
  const BLOCK = 'h1, h2, h3, h4, p, li, td, th, blockquote';
  const visible = el => (typeof el.checkVisibility === 'function'
    ? el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })
    : getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden');
  const isChrome = el => !!el.closest('[data-site-chrome]');
  const blocks = [];
  for (const el of document.querySelectorAll(BLOCK)) {
    if (el.querySelector(BLOCK)) continue;
    if (!visible(el)) continue;
    const t = n(el.innerText);
    if (t) blocks.push({ t, chrome: isChrome(el) });
  }
  const chromeTops = [...document.querySelectorAll('[data-site-chrome]')].filter(el => !el.parentElement || !el.parentElement.closest('[data-site-chrome]'));
  const bodyInner = n(document.body ? document.body.innerText : '');
  const chromeInner = chromeTops.reduce((s, el) => s + n(el.innerText).length, 0);
  const clone = document.body ? document.body.cloneNode(true) : null;
  if (clone) for (const el of clone.querySelectorAll('script, style, noscript, template')) el.remove();
  const domText = n(clone ? clone.textContent : '');

  const sec = document.querySelector('section[data-seo-content]');
  const article = sec ? sec.querySelector('article') : null;

  const links = [];
  for (const a of document.querySelectorAll('a[href]')) {
    links.push({ href: a.href, chrome: isChrome(a), vis: visible(a) });
  }

  /* wording a reviewer would read as unfinished or broken, from visible text
     nodes only, short ones only (a guide sentence that mentions an error is
     not an error message) */
  const RE = {
    loading: /^(loading|fetching|please wait)\b|\bloading(\.{2,3}|…)?$/i,
    error: /\b(something went wrong|failed to (load|fetch)|error loading|could ?n[o']t (load|fetch|reach)|unable to (load|fetch|connect)|try again later|network error|page not found|404)\b/i,
    placeholder: /\b(lorem ipsum|placeholder|coming soon|under construction|tbd|todo|not available yet)\b/i,
    account: /\b(sign in|log in|login|sign up|create (a|an|your) (free )?account)\b[^.]{0,40}\b(to play|to start|to continue|required|to unlock|to access)\b|\bmust be (signed|logged) in\b/i,
  };
  const found = { loading: [], error: [], placeholder: [], account: [] };
  const walker = document.createTreeWalker(document.body || document, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const t = n(node.nodeValue);
    if (t.length < 3 || t.length > 160) continue;
    const el = node.parentElement;
    if (!el || el.closest('script, style, noscript, template')) continue;
    if (!visible(el)) continue;
    for (const k of Object.keys(RE)) {
      if (RE[k].test(t) && found[k].length < 8 && !found[k].includes(t)) found[k].push(isChrome(el) ? `[chrome] ${t}` : t);
    }
  }
  const spinners = [...document.querySelectorAll('.animate-spin, .animate-pulse, [aria-busy="true"], [role="progressbar"]')]
    .filter(el => visible(el) && !isChrome(el)).length;
  const adSlots = [...document.querySelectorAll('ins.adsbygoogle, [data-ad-slot], [data-ad-client]')];

  return {
    title: document.title,
    descriptions: [...document.querySelectorAll('meta[name="description"]')].map(m => m.getAttribute('content') || ''),
    canonicals: [...document.querySelectorAll('link[rel="canonical"]')].map(l => l.getAttribute('href') || ''),
    robots: [...document.querySelectorAll('meta[name="robots"], meta[name="googlebot"]')].map(m => `${m.getAttribute('name')}=${m.getAttribute('content')}`),
    h1: [...document.querySelectorAll('h1')].filter(visible).map(h => n(h.innerText)),
    h1InDom: document.querySelectorAll('h1').length,
    jsonld: [...document.querySelectorAll('script[type="application/ld+json"]')].map(s => s.textContent || ''),
    blocks,
    bodyInnerChars: bodyInner.length,
    mainInnerChars: Math.max(0, bodyInner.length - chromeInner),
    mainInnerText: bodyInner,
    domText,
    seoState: sec ? sec.getAttribute('data-seo-content') : null,
    guideText: article ? n(article.innerText) : '',
    seoSectionText: sec ? n(sec.innerText) : '',
    links,
    found,
    spinners,
    adSlots: adSlots.length,
    adSlotsVisible: adSlots.filter(visible).length,
    buttons: [...document.querySelectorAll('button, [role="button"]')].filter(el => visible(el) && !isChrome(el)).length,
    inputs: [...document.querySelectorAll('input, select, textarea')].filter(el => visible(el) && !isChrome(el)).length,
    scrollHeight: document.documentElement.scrollHeight,
    snapshotLeft: !!document.getElementById('dukb-snapshot'),
  };
}

function parseRaw(html) {
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  try {
    const BLOCK = 'h1, h2, h3, h4, p, li, td, th, blockquote';
    const rootEl = doc.getElementById('dukb-snapshot') || doc.getElementById('dukb-home-copy') || doc.getElementById('root');
    const blocks = [];
    if (rootEl) {
      for (const el of rootEl.querySelectorAll(BLOCK)) {
        if (el.querySelector(BLOCK)) continue;
        const t = norm(el.textContent);
        if (t) blocks.push({ t, chrome: !!el.closest('[data-site-chrome]') });
      }
    }
    return {
      title: norm(doc.title),
      descriptions: [...doc.querySelectorAll('meta[name="description"]')].map(m => m.getAttribute('content') || ''),
      canonicals: [...doc.querySelectorAll('link[rel="canonical"]')].map(l => l.getAttribute('href') || ''),
      robots: [...doc.querySelectorAll('meta[name="robots"], meta[name="googlebot"]')].map(m => `${m.getAttribute('name')}=${m.getAttribute('content')}`),
      h1: [...doc.querySelectorAll('h1')].map(h => norm(h.textContent)),
      jsonld: [...doc.querySelectorAll('script[type="application/ld+json"]')].map(s => s.textContent || ''),
      links: [...doc.querySelectorAll('a[href]')].map(a => a.getAttribute('href') || ''),
      blocks,
      snapshot: !!doc.getElementById('dukb-snapshot'),
      homeCopy: !!doc.getElementById('dukb-home-copy'),
    };
  } finally {
    dom.window.close();
  }
}

const controlScript = () => {
  window.__dukbControl = { removedChars: 0, removals: 0 };
  const zap = () => {
    for (const a of document.querySelectorAll('section[data-seo-content] article')) {
      window.__dukbControl.removedChars += (a.textContent || '').length;
      window.__dukbControl.removals += 1;
      a.remove();
    }
  };
  new MutationObserver(zap).observe(document, { childList: true, subtree: true });
};

async function auditOne(u) {
  const url = `${BASE}${u.path}`;
  const ctx = await browser.newContext(CTX_OPTS[VIEWPORT]);
  const rec = { route: u.route, form: u.form, path: u.path, vp: VIEWPORT, base: BASE, at: new Date().toISOString() };
  const aborted = new Set();
  const blockedWrites = [];
  const rpcPosts = [];
  try {
    /* raw first, with no JavaScript and no redirect following */
    const res = await getWithRetry(ctx.request, url, { maxRedirects: 0, timeout: 20000 }, 2);
    const rawHtml = await res.text();
    const headers = res.headersArray();
    rec.rawStatus = res.status();
    rec.rawLocation = headers.find(h => h.name.toLowerCase() === 'location')?.value || null;
    rec.xRobots = headers.filter(h => h.name.toLowerCase() === 'x-robots-tag').map(h => h.value);
    rec.rawIndexability = liveIndexabilityFindings(rawHtml, headers);
    rec.rawBytes = rawHtml.length;
    const raw = parseRaw(rawHtml);
    rec.raw = {
      title: raw.title, descriptions: raw.descriptions, canonicals: raw.canonicals, robots: raw.robots, h1: raw.h1,
      jsonld: jsonLdTypes(raw.jsonld), snapshot: raw.snapshot, homeCopy: raw.homeCopy,
    };
    rec.rawLinks = [...new Set(raw.links.map(toRoute).filter(Boolean))].sort();
    const rawMain = raw.blocks.filter(b => !b.chrome);
    rec.rawMainBlocks = rawMain.map(b => b.t);
    rec.rawMainChars = rawMain.reduce((s, b) => s + b.t.length, 0);
    rec.rawMainWords = rawMain.reduce((s, b) => s + words(b.t), 0);
    rec.rawChromeChars = raw.blocks.filter(b => b.chrome).reduce((s, b) => s + b.t.length, 0);

    /* then the render */
    await ctx.route('**/*', route => {
      const req = route.request();
      let host = '';
      try { host = new URL(req.url()).hostname; } catch { /* data: and the like */ }
      if (host && AD_HOSTS.test(host)) { aborted.add(req); return route.abort(); }
      const m = req.method();
      if (m !== 'GET' && m !== 'HEAD') {
        if (/\.supabase\.co\/rest\/v1\/rpc\//.test(req.url()) && m === 'POST') {
          rpcPosts.push(req.url().replace(/\?.*$/, '').replace(/^.*\/rpc\//, 'rpc/'));
          return route.continue();
        }
        blockedWrites.push(`${m} ${req.url().replace(/\?.*$/, '').slice(0, 140)}`);
        aborted.add(req);
        return route.abort();
      }
      return route.continue();
    });
    if (CONTROL === 'guidegone' && u.route === CONTROL_ROUTE) await ctx.addInitScript(controlScript);
    const page = await ctx.newPage();
    const consoleErrors = [];
    const pageErrors = [];
    const failed = [];
    const bad = [];
    let inflight = 0;
    page.on('console', m => { if (m.type() === 'error' && consoleErrors.length < 20) consoleErrors.push(norm(m.text()).slice(0, 300)); });
    page.on('pageerror', e => { if (pageErrors.length < 20) pageErrors.push(norm(e && e.message ? e.message : e).slice(0, 300)); });
    page.on('request', () => { inflight += 1; });
    page.on('requestfinished', () => { inflight = Math.max(0, inflight - 1); });
    page.on('requestfailed', r => {
      inflight = Math.max(0, inflight - 1);
      if (aborted.has(r)) return;
      if (failed.length < 20) failed.push(`${r.method()} ${r.url().replace(/\?.*$/, '').slice(0, 160)} ${r.failure()?.errorText || ''}`.trim());
    });
    page.on('response', r => { if (r.status() >= 400 && bad.length < 20) bad.push(`${r.status()} ${r.url().replace(/\?.*$/, '').slice(0, 160)}`); });

    const t0 = Date.now();
    /* Three tries with a pause: on 2026-10-01 two navigations in the first
       chunk landed on Chromium's network error page and a single retry fired
       straight into the same stall. A URL that fails three times is recorded
       as an error, never as a page. */
    let resp;
    rec.navAttempts = 0;
    for (;;) {
      rec.navAttempts += 1;
      try {
        resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        if (page.url().startsWith('chrome-error:')) throw new Error('landed on the browser network error page');
        break;
      } catch (e) {
        if (rec.navAttempts >= 3) throw e;
        await page.waitForTimeout(2000);
      }
    }
    rec.status = resp ? resp.status() : null;
    rec.redirects = [];
    for (let q = resp ? resp.request().redirectedFrom() : null; q; q = q.redirectedFrom()) rec.redirects.push(q.url());
    let mounted = true;
    try {
      await page.waitForFunction(() => !document.getElementById('dukb-boot'), null, { timeout: 25000, polling: 200 });
    } catch { mounted = false; }
    rec.mounted = mounted;
    rec.mountMs = Date.now() - t0;

    /* A visible spinner outside the chrome holds the settle open: on
       2026-10-01 /connections sat on a bare spinner with nothing in flight and
       was measured as a settled empty page after six seconds. Now a spinner
       has to stay put for SPINNER_QUIET_MS before the page is taken as it is. */
    const sig = () => page.evaluate(() => {
      const b = document.body ? document.body.innerText.length : 0;
      const c = [...document.querySelectorAll('[data-site-chrome]')].reduce((s, el) => s + (el.innerText || '').length, 0);
      const spin = [...document.querySelectorAll('.animate-spin, [aria-busy="true"], [role="progressbar"]')]
        .filter(el => !el.closest('[data-site-chrome]') && (typeof el.checkVisibility !== 'function' || el.checkVisibility())).length;
      return { s: `${b - c}:${document.querySelectorAll('[data-seo-content="loading"]').length}:${document.querySelectorAll('a[href]').length}:${spin}`, spin };
    });
    const settle = async (maxMs) => {
      const start = Date.now();
      let last = null;
      let since = Date.now();
      while (Date.now() - start < maxMs) {
        await page.waitForTimeout(500);
        const { s, spin } = await sig();
        if (s !== last) { last = s; since = Date.now(); continue; }
        const quiet = Date.now() - since;
        if (spin > 0) { if (quiet >= SPINNER_QUIET_MS) return true; continue; }
        if ((quiet >= QUIET_MS && inflight === 0) || quiet >= QUIET_BUSY_MS) return true;
      }
      return false;
    };
    rec.settled = await settle(SETTLE_MAX_MS);
    /* Google renders with a viewport stretched to the page height, so anything
       waiting to scroll into view gets drawn. Do the same before measuring. */
    const vp = CTX_OPTS[VIEWPORT].viewport;
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    if (h > vp.height) {
      await page.setViewportSize({ width: vp.width, height: Math.min(h, 16000) });
      await settle(5000);
    }
    rec.settleMs = Date.now() - t0;
    rec.finalUrl = page.url();
    const m = await page.evaluate(measureSettled);
    if (CONTROL === 'guidegone' && u.route === CONTROL_ROUTE) {
      rec.control = await page.evaluate(() => window.__dukbControl || null);
    }

    rec.title = m.title;
    rec.descriptions = m.descriptions;
    rec.canonicals = m.canonicals;
    rec.robots = m.robots;
    rec.h1 = m.h1;
    rec.h1InDom = m.h1InDom;
    rec.jsonld = jsonLdTypes(m.jsonld);
    const main = m.blocks.filter(b => !b.chrome);
    rec.mainBlocks = main.map(b => b.t);
    rec.mainChars = main.reduce((s, b) => s + b.t.length, 0);
    rec.mainWords = main.reduce((s, b) => s + words(b.t), 0);
    rec.mainInnerChars = m.mainInnerChars;
    rec.bodyInnerChars = m.bodyInnerChars;
    rec.seoState = m.seoState;
    rec.guideWords = words(m.guideText);
    rec.seoSectionWords = words(m.seoSectionText);
    const linkRoutes = m.links.map(l => ({ r: toRoute(l.href), chrome: l.chrome })).filter(l => l.r);
    rec.links = [...new Set(linkRoutes.map(l => l.r))].sort();
    rec.mainLinks = [...new Set(linkRoutes.filter(l => !l.chrome).map(l => l.r))].sort();
    rec.externalLinks = [...new Set(m.links.map(l => { try { const x = new URL(l.href); return x.origin === ORIGIN || !/^https?:$/.test(x.protocol) ? null : x.hostname; } catch { return null; } }).filter(Boolean))].sort();
    rec.found = m.found;
    rec.spinners = m.spinners;
    rec.adSlots = m.adSlots;
    rec.adSlotsVisible = m.adSlotsVisible;
    rec.buttons = m.buttons;
    rec.inputs = m.inputs;
    rec.scrollHeight = m.scrollHeight;
    rec.snapshotLeft = m.snapshotLeft;
    rec.consoleErrors = consoleErrors;
    rec.pageErrors = pageErrors;
    rec.failedRequests = failed;
    rec.badResponses = bad;
    rec.blockedWrites = blockedWrites;
    rec.rpcPosts = [...new Set(rpcPosts)];

    /* LOST ON MOUNT. See the header for why letters and digits only. */
    const visKey = key(m.mainInnerText);
    const domKey = key(m.domText);
    const lostDom = [];
    const lostVis = [];
    for (const t of rec.rawMainBlocks) {
      if (t.length < 20) continue;
      const k = key(t);
      if (!k) continue;
      if (!domKey.includes(k)) lostDom.push(t);
      else if (!visKey.includes(k)) lostVis.push(t);
    }
    rec.lostDomChars = lostDom.reduce((s, t) => s + t.length, 0);
    rec.lostDomBlocks = lostDom.length;
    rec.lostHiddenChars = lostVis.reduce((s, t) => s + t.length, 0);
    rec.lostSamples = lostDom.slice(0, 6).map(t => t.slice(0, 90));
    rec.lostHiddenSamples = lostVis.slice(0, 4).map(t => t.slice(0, 90));
  } catch (e) {
    rec.error = norm(e && e.message ? e.message : e).slice(0, 300);
  } finally {
    await ctx.close().catch(() => {});
  }
  return rec;
}

const results = [];
let next = 0;
async function worker() {
  while (next < chunk.length) {
    const i = next++;
    const u = chunk[i];
    const rec = await Promise.race([
      auditOne(u),
      new Promise(r => setTimeout(() => r({ route: u.route, form: u.form, path: u.path, vp: VIEWPORT, base: BASE, error: `URL budget of ${URL_BUDGET_MS}ms exceeded` }), URL_BUDGET_MS)),
    ]);
    results.push(rec);
    const flag = losesContent(rec) ? '  LOSES CONTENT ON MOUNT' : '';
    if (rec.error) console.log(`  [${OFFSET + i}] ${u.path.padEnd(42)} ERROR ${rec.error}`);
    else {
      console.log(`  [${OFFSET + i}] ${u.path.padEnd(42)} ${rec.status} ${rec.mounted ? 'mounted' : 'NOT MOUNTED'} ${String(rec.settleMs).padStart(5)}ms  saved ${String(rec.rawMainChars).padStart(6)} -> settled ${String(rec.mainChars).padStart(6)} chars, lost ${rec.lostDomChars}, guide ${rec.guideWords}w, links ${rec.links.length}, errors ${rec.consoleErrors.length + rec.pageErrors.length}${flag}`);
    }
  }
}
await Promise.all(Array.from({ length: Math.min(CONCURRENCY, chunk.length) }, worker));
await browser.close();
stopServer();

/* merge into OUT, keyed by base, viewport and path, so chunks add up and a
   rerun of a chunk replaces rather than duplicates */
if (!CONTROL) {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const all = readJson(OUT);
  all.__meta = { ...(all.__meta || {}), [`sitemap ${BASE}`]: sitemapCount, [`ua ${VIEWPORT}`]: UA[VIEWPORT] };
  for (const r of results) all[`${r.base}|${r.vp}|${r.path}`] = r;
  fs.writeFileSync(OUT, JSON.stringify(all));
  console.log(`${results.length} URL(s) merged into ${path.relative(ROOT, OUT)} (${Object.keys(all).length - 1} records in it).`);
}

const lossy = results.filter(losesContent);
const errored = results.filter(r => r.error);
console.log(`${results.length} audited: ${lossy.length} lose content on mount${lossy.length ? ` (${lossy.map(r => r.path).join(', ')})` : ''}, ${errored.length} could not be audited.`);

if (CONTROL === 'guidegone') {
  const target = results.find(r => r.route === CONTROL_ROUTE);
  const others = results.filter(r => r.route !== CONTROL_ROUTE);
  let ok = true;
  if (!target || target.error) { console.error(`control: ${CONTROL_ROUTE} was not audited, so the control proves nothing`); ok = false; }
  else if (!target.control || !(target.control.removedChars > 0)) { console.error(`control: the guide article never existed on ${CONTROL_ROUTE}, so removing it changed nothing and proves nothing`); ok = false; }
  else console.log(`control: removed ${target.control.removedChars} characters of guide from ${CONTROL_ROUTE} after mount (${target.control.removals} removal${target.control.removals === 1 ? '' : 's'}).`);
  if (ok && !losesContent(target)) { console.error(`control: RED. ${CONTROL_ROUTE} lost its guide after mount and the loss rule did not report it (lost ${target.lostDomChars} of ${target.rawMainChars}).`); ok = false; }
  if (ok && !others.length) { console.error('control: no second route ran, so nothing shows the rule stays quiet on a healthy page'); ok = false; }
  const noisy = others.filter(losesContent);
  if (ok && noisy.length) { console.error(`control: RED. The rule also reported untouched routes: ${noisy.map(r => r.path).join(', ')}`); ok = false; }
  if (!ok) process.exit(1);
  console.log(`playLiveRenderedAudit control: green. ${CONTROL_ROUTE} reported (lost ${target.lostDomChars} of ${target.rawMainChars} saved characters), ${others.length} untouched URL(s) not reported.`);
}
process.exit(errored.length ? 1 : 0);

/* ---------- report mode ---------- */

async function report() {
  const all = readJson(OUT);
  const meta = all.__meta || {};
  const recs = Object.entries(all).filter(([k]) => k !== '__meta').map(([, v]) => v);
  if (!recs.length) { console.error(`no records in ${OUT}`); process.exit(1); }
  const base = process.env.BASE || 'https://douknowball.com';
  const mine = recs.filter(r => r.base === base);
  const desk = mine.filter(r => r.vp === 'desktop');
  const phone = mine.filter(r => r.vp === 'phone');
  const plain = new Map(desk.filter(r => r.form === 'plain').map(r => [r.route, r]));
  const slash = new Map(desk.filter(r => r.form === 'slash').map(r => [r.route, r]));
  const sitemapCount = meta[`sitemap ${base}`] || plain.size;
  const out = [];
  const say = s => { out.push(s); console.log(s); };
  const pct = (a, b) => (b ? Math.round(100 * a / b) : 0);

  say(`# ${base}: ${desk.length} desktop URLs (${plain.size} plain, ${slash.size} slash), ${phone.length} phone URLs, sitemap ${sitemapCount}`);
  const errs = mine.filter(r => r.error);
  say(`errors: ${errs.length}${errs.length ? ' ' + errs.map(r => `${r.vp} ${r.path}: ${r.error}`).join(' | ') : ''}`);
  const notMounted = mine.filter(r => !r.error && !r.mounted);
  say(`not mounted within 25s: ${notMounted.length} ${notMounted.map(r => `${r.vp} ${r.path}`).join(', ')}`);
  const unsettled = mine.filter(r => !r.error && !r.settled);
  say(`hit the 15s settle cap: ${unsettled.length} ${unsettled.map(r => `${r.vp} ${r.path}`).join(', ')}`);

  /* (a) loss on mount and slash versus plain */
  say('\n## (a) lost on mount');
  const lossy = mine.filter(losesContent);
  say(`pages that lose content on mount (rule: lost >= ${LOSS_MIN_CHARS} chars and >= ${LOSS_MIN_SHARE * 100}% of saved page text): ${lossy.length}`);
  for (const r of lossy) say(`  ${r.vp} ${r.path}: saved ${r.rawMainChars}, settled ${r.mainChars}, lost ${r.lostDomChars} in ${r.lostDomBlocks} blocks; e.g. ${JSON.stringify(r.lostSamples.slice(0, 2))}`);
  const someLoss = mine.filter(r => !r.error && !losesContent(r) && r.lostDomChars > 0).sort((a, b) => b.lostDomChars - a.lostDomChars);
  say(`pages with SOME saved text missing after mount, under the rule: ${someLoss.length}`);
  for (const r of someLoss.slice(0, 40)) say(`  ${r.vp} ${r.path}: lost ${r.lostDomChars} of ${r.rawMainChars} (${pct(r.lostDomChars, r.rawMainChars)}%) in ${r.lostDomBlocks} blocks; e.g. ${JSON.stringify(r.lostSamples.slice(0, 2))}`);
  const hidden = mine.filter(r => !r.error && r.lostHiddenChars > 0).sort((a, b) => b.lostHiddenChars - a.lostHiddenChars);
  say(`pages where saved text is still in the DOM but not visible: ${hidden.length}`);
  for (const r of hidden.slice(0, 20)) say(`  ${r.vp} ${r.path}: ${r.lostHiddenChars} chars hidden; e.g. ${JSON.stringify(r.lostHiddenSamples.slice(0, 2))}`);
  const grew = [...plain.values()].filter(r => !r.error && r.mainChars < 0.75 * r.rawMainChars);
  say(`plain pages whose settled visible page text is under 75% of the saved copy: ${grew.length}`);
  for (const r of grew) say(`  ${r.path}: saved ${r.rawMainChars}, settled ${r.mainChars}, inner ${r.mainInnerChars}`);

  say('\n## (a2) slash versus plain (desktop)');
  let diffs = 0;
  for (const [route, p] of plain) {
    const s = slash.get(route);
    if (!s || p.error || s.error) continue;
    const d = [];
    if (p.status !== s.status) d.push(`status ${p.status} vs ${s.status}`);
    if (p.title !== s.title) d.push(`title differs`);
    if (JSON.stringify(p.canonicals) !== JSON.stringify(s.canonicals)) d.push(`canonical ${JSON.stringify(p.canonicals)} vs ${JSON.stringify(s.canonicals)}`);
    if (JSON.stringify(p.descriptions) !== JSON.stringify(s.descriptions)) d.push('description differs');
    if (JSON.stringify(p.h1) !== JSON.stringify(s.h1)) d.push(`h1 ${JSON.stringify(p.h1)} vs ${JSON.stringify(s.h1)}`);
    if (JSON.stringify(p.robots) !== JSON.stringify(s.robots)) d.push(`robots ${JSON.stringify(p.robots)} vs ${JSON.stringify(s.robots)}`);
    if (p.seoState !== s.seoState) d.push(`guide state ${p.seoState} vs ${s.seoState}`);
    if (Math.abs(p.guideWords - s.guideWords) > Math.max(20, 0.1 * p.guideWords)) d.push(`guide words ${p.guideWords} vs ${s.guideWords}`);
    if (Math.abs(p.mainChars - s.mainChars) > Math.max(300, 0.1 * p.mainChars)) d.push(`page text ${p.mainChars} vs ${s.mainChars}`);
    if (Math.abs(p.links.length - s.links.length) > 3) d.push(`internal links ${p.links.length} vs ${s.links.length}`);
    if (JSON.stringify(p.jsonld.types) !== JSON.stringify(s.jsonld.types)) d.push(`JSON-LD ${p.jsonld.types.join('+')} vs ${s.jsonld.types.join('+')}`);
    if (d.length) { diffs += 1; say(`  ${route}: ${d.join('; ')}`); }
  }
  say(`routes whose slash form differs from the plain form: ${diffs} of ${[...plain.keys()].filter(k => slash.has(k)).length}`);
  const finalMoved = desk.filter(r => !r.error && r.finalUrl && routeOf(new URL(r.finalUrl).pathname) !== r.route);
  say(`URLs whose final address is another route: ${finalMoved.length} ${finalMoved.map(r => `${r.path} -> ${r.finalUrl}`).join(', ')}`);
  const redirected = desk.filter(r => r.redirects && r.redirects.length);
  say(`URLs that redirected: ${redirected.length} ${redirected.map(r => r.path).join(', ')}`);
  const raw3xx = desk.filter(r => r.rawStatus && r.rawStatus !== 200);
  say(`raw status not 200: ${raw3xx.length} ${raw3xx.map(r => `${r.path} ${r.rawStatus}`).join(', ')}`);
  const canonBad = [...plain.values()].filter(r => !r.error && (r.canonicals.length !== 1 || routeOf(new URL(r.canonicals[0], base).pathname) !== r.route));
  say(`plain pages with no single self canonical after mount: ${canonBad.length} ${canonBad.map(r => `${r.path} ${JSON.stringify(r.canonicals)}`).join(', ')}`);
  const robotsBad = mine.filter(r => !r.error && (r.robots.some(x => /noindex|none/i.test(x)) || (r.rawIndexability || []).length));
  say(`URLs with a blocking robots directive raw or settled: ${robotsBad.length} ${robotsBad.map(r => `${r.vp} ${r.path} ${JSON.stringify(r.robots)}`).join(', ')}`);
  const titleChanged = [...plain.values()].filter(r => !r.error && r.raw && r.raw.title !== r.title);
  say(`plain pages whose title changes on mount: ${titleChanged.length}`);
  for (const r of titleChanged.slice(0, 20)) say(`  ${r.path}: ${JSON.stringify(r.raw.title)} -> ${JSON.stringify(r.title)}`);
  const h1Bad = [...plain.values()].filter(r => !r.error && r.h1.length !== 1);
  say(`plain pages without exactly one visible h1 after mount: ${h1Bad.length}`);
  for (const r of h1Bad) say(`  ${r.path}: ${r.h1.length} visible (${r.h1InDom} in DOM) ${JSON.stringify(r.h1.slice(0, 3))}`);

  say('\n## phone sample versus desktop plain');
  for (const ph of phone.sort((a, b) => a.route.localeCompare(b.route))) {
    const d = plain.get(ph.route);
    if (!d || ph.error || d.error) { say(`  ${ph.path}: ${ph.error || 'no desktop record'}`); continue; }
    const notes = [];
    if (Math.abs(ph.mainChars - d.mainChars) > Math.max(300, 0.15 * d.mainChars)) notes.push(`page text ${d.mainChars} desktop vs ${ph.mainChars} phone`);
    if (Math.abs(ph.guideWords - d.guideWords) > Math.max(20, 0.1 * d.guideWords)) notes.push(`guide ${d.guideWords} vs ${ph.guideWords}`);
    if (JSON.stringify(ph.h1) !== JSON.stringify(d.h1)) notes.push(`h1 ${JSON.stringify(d.h1)} vs ${JSON.stringify(ph.h1)}`);
    if (Math.abs(ph.links.length - d.links.length) > 5) notes.push(`links ${d.links.length} vs ${ph.links.length}`);
    if (losesContent(ph)) notes.push('LOSES CONTENT');
    if (ph.consoleErrors.length + ph.pageErrors.length) notes.push(`errors ${ph.consoleErrors.length + ph.pageErrors.length}`);
    say(`  ${ph.path}: ${notes.length ? notes.join('; ') : 'same as desktop'}`);
  }

  /* (b) thinnest */
  say('\n## (b) thinnest 25 by settled page words (desktop plain)');
  const ranked = [...plain.values()].filter(r => !r.error).sort((a, b) => a.mainWords - b.mainWords);
  const median = arr => { const s = [...arr].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : 0; };
  say(`median settled page words ${median(ranked.map(r => r.mainWords))}, median guide words ${median(ranked.filter(r => r.seoState).map(r => r.guideWords))}`);
  for (const r of ranked.slice(0, 25)) say(`  ${r.path.padEnd(40)} page ${String(r.mainWords).padStart(5)}w  guide ${String(r.guideWords).padStart(5)}w  saved ${String(r.rawMainWords).padStart(5)}w  ${r.seoState ? 'game guide' : 'no guide section'}  ${JSON.stringify(r.title).slice(0, 70)}`);
  const noGuide = ranked.filter(r => !r.seoState);
  say(`plain pages with no guide section at all: ${noGuide.length} ${noGuide.map(r => `${r.path} (${r.mainWords}w)`).join(', ')}`);
  const shortGuide = ranked.filter(r => r.seoState && r.guideWords < 600);
  say(`game pages whose guide article is under 600 words: ${shortGuide.length} ${shortGuide.map(r => `${r.path} (${r.guideWords}w)`).join(', ')}`);

  /* (c) duplicates */
  say('\n## (c) duplicate and near duplicate titles, descriptions, h1s');
  const P = [...plain.values()].filter(r => !r.error);
  const dupes = (label, get) => {
    const m = new Map();
    for (const r of P) { const v = norm(get(r)).toLowerCase(); if (!v) continue; if (!m.has(v)) m.set(v, []); m.get(v).push(r.path); }
    const d = [...m.entries()].filter(([, v]) => v.length > 1);
    say(`exact duplicate ${label}: ${d.length}${d.length ? ' ' + d.map(([k, v]) => `${JSON.stringify(k)} on ${v.join(', ')}`).join(' | ') : ''}`);
  };
  dupes('titles', r => r.title);
  dupes('descriptions', r => r.descriptions[0] || '');
  dupes('h1s', r => r.h1[0] || '');
  const wset = s => new Set(norm(s).toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(' ').filter(w => w.length > 2));
  const jac = (a, b) => { let i = 0; for (const x of a) if (b.has(x)) i += 1; const u = a.size + b.size - i; return u ? i / u : 0; };
  const near = (label, get, thr) => {
    const sets = P.map(r => [r.path, wset(get(r))]);
    const pairs = [];
    for (let i = 0; i < sets.length; i++) for (let j = i + 1; j < sets.length; j++) {
      const s = jac(sets[i][1], sets[j][1]);
      if (s >= thr) pairs.push([s, sets[i][0], sets[j][0]]);
    }
    pairs.sort((a, b) => b[0] - a[0]);
    say(`near duplicate ${label} (word set Jaccard >= ${thr}): ${pairs.length} pairs`);
    for (const [s, a, b] of pairs.slice(0, 25)) say(`  ${s.toFixed(2)} ${a} ~ ${b}: ${JSON.stringify(get(plain.get(a)))} / ${JSON.stringify(get(plain.get(b)))}`);
  };
  const stripBrand = s => String(s || '').replace(/\s*[|:]\s*DoUKnowBall.*$/i, '');
  near('titles (brand suffix removed)', r => stripBrand(r.title), 0.6);
  near('descriptions', r => r.descriptions[0] || '', 0.5);
  near('h1s', r => r.h1[0] || '', 0.7);

  /* (d) template clusters */
  say('\n## (d) template similarity (settled page text, outside the chrome)');
  const shingles = r => {
    const toks = r.mainBlocks.join(' ').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(' ').filter(Boolean);
    const s = new Set();
    for (let i = 0; i + 5 <= toks.length; i++) s.add(toks.slice(i, i + 5).join(' '));
    return s;
  };
  const sh = P.map(r => [r.path, shingles(r)]);
  const pairs = [];
  for (let i = 0; i < sh.length; i++) for (let j = i + 1; j < sh.length; j++) {
    const a = sh[i][1]; const b = sh[j][1];
    if (!a.size || !b.size) continue;
    let inter = 0;
    const [small, big] = a.size < b.size ? [a, b] : [b, a];
    for (const x of small) if (big.has(x)) inter += 1;
    const jv = inter / (a.size + b.size - inter);
    const contain = inter / small.size;
    pairs.push({ a: sh[i][0], b: sh[j][0], j: jv, c: contain });
  }
  const hist = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7].map(t => `>=${t}: ${pairs.filter(p => p.j >= t).length}`);
  say(`5 word shingle Jaccard across ${pairs.length} page pairs: ${hist.join(', ')}`);
  pairs.sort((x, y) => y.j - x.j);
  for (const p of pairs.slice(0, 30)) say(`  J ${p.j.toFixed(2)} containment ${p.c.toFixed(2)} ${p.a} ~ ${p.b}`);
  const CLUSTER_J = Number(process.env.CLUSTER_J || 0.3);
  const parent = new Map(P.map(r => [r.path, r.path]));
  const find = x => { while (parent.get(x) !== x) { parent.set(x, parent.get(parent.get(x))); x = parent.get(x); } return x; };
  for (const p of pairs) if (p.j >= CLUSTER_J) parent.set(find(p.a), find(p.b));
  const groups = new Map();
  for (const r of P) { const g = find(r.path); if (!groups.has(g)) groups.set(g, []); groups.get(g).push(r.path); }
  const clusters = [...groups.values()].filter(g => g.length > 1).sort((a, b) => b.length - a.length);
  say(`clusters at Jaccard >= ${CLUSTER_J}: ${clusters.length}`);
  for (const g of clusters) say(`  (${g.length}) ${g.join(', ')}`);
  /* boilerplate share: how much of each page's text is blocks that also
     appear word for word on five or more other pages */
  const blockPages = new Map();
  for (const r of P) for (const b of new Set(r.mainBlocks.map(key))) { if (b.length < 20) continue; blockPages.set(b, (blockPages.get(b) || 0) + 1); }
  const shared = P.map(r => {
    let tot = 0; let sh5 = 0;
    for (const b of r.mainBlocks) { const k = key(b); tot += b.length; if (k.length >= 20 && (blockPages.get(k) || 0) >= 6) sh5 += b.length; }
    return { path: r.path, share: tot ? sh5 / tot : 0, tot };
  }).sort((a, b) => b.share - a.share);
  say(`median share of page text in blocks repeated on 6 or more pages: ${pct(median(shared.map(s => s.share)) * 1000, 1000) / 10}%`);
  for (const s of shared.slice(0, 20)) say(`  ${s.path}: ${Math.round(s.share * 100)}% of ${s.tot} chars`);
  const topBlocks = [...blockPages.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);
  const sample = new Map();
  for (const r of P) for (const b of r.mainBlocks) { const k = key(b); if (!sample.has(k)) sample.set(k, b); }
  say('most repeated page blocks (outside the chrome):');
  for (const [k, c] of topBlocks) say(`  on ${c} pages: ${JSON.stringify(sample.get(k).slice(0, 100))}`);

  /* (e) inlinks and depth */
  say('\n## (e) internal link graph (desktop plain, distinct source pages)');
  const routesSet = new Set(plain.keys());
  const graph = (getLinks) => {
    const inl = new Map([...routesSet].map(r => [r, new Set()]));
    const offSitemap = new Map();
    for (const r of P) for (const t of getLinks(r)) {
      if (t === r.route) continue;
      if (inl.has(t)) inl.get(t).add(r.route);
      else offSitemap.set(t, (offSitemap.get(t) || 0) + 1);
    }
    const depth = new Map([['/', 0]]);
    const q = ['/'];
    while (q.length) {
      const cur = q.shift();
      const rec = plain.get(cur);
      if (!rec || rec.error) continue;
      for (const t of getLinks(rec)) if (routesSet.has(t) && !depth.has(t)) { depth.set(t, depth.get(cur) + 1); q.push(t); }
    }
    return { inl, depth, offSitemap };
  };
  for (const [label, get] of [['settled DOM', r => r.links], ['raw HTML', r => r.rawLinks], ['settled DOM, page body only (chrome links removed)', r => r.mainLinks]]) {
    const g = graph(get);
    const few = [...g.inl.entries()].filter(([r, s]) => r !== '/' && s.size < 3).sort((a, b) => a[1].size - b[1].size);
    say(`${label}: pages with fewer than 3 inlinking pages: ${few.length}${few.length ? ' ' + few.map(([r, s]) => `${r} (${s.size})`).join(', ') : ''}`);
    const deep = [...routesSet].filter(r => !g.depth.has(r) || g.depth.get(r) > 3);
    say(`${label}: pages more than 3 clicks from home or unreachable: ${deep.length}${deep.length ? ' ' + deep.map(r => `${r} (${g.depth.has(r) ? g.depth.get(r) : 'unreachable'})`).join(', ') : ''}`);
    const dist = {};
    for (const r of routesSet) { const d = g.depth.has(r) ? g.depth.get(r) : 'x'; dist[d] = (dist[d] || 0) + 1; }
    say(`${label}: click depth distribution ${JSON.stringify(dist)}`);
    const inCounts = [...g.inl.values()].map(s => s.size);
    say(`${label}: inlinking pages per page, median ${median(inCounts)}, min ${Math.min(...inCounts)}`);
    const off = [...g.offSitemap.entries()].sort((a, b) => b[1] - a[1]);
    say(`${label}: internal link targets not in the sitemap: ${off.length} ${off.slice(0, 30).map(([t, c]) => `${t} (${c})`).join(', ')}`);
  }
  const fewMain = graph(r => r.mainLinks);
  const lowMain = [...fewMain.inl.entries()].filter(([r]) => r !== '/').sort((a, b) => a[1].size - b[1].size).slice(0, 25);
  say('fewest inlinks from page bodies (contextual links, chrome excluded):');
  for (const [r, s] of lowMain) say(`  ${r}: ${s.size} ${[...s].slice(0, 6).join(', ')}`);

  /* (f) console errors and failed requests */
  say('\n## (f) console errors, page errors, failed requests, 4xx and 5xx');
  const withErr = mine.filter(r => !r.error && (r.consoleErrors.length || r.pageErrors.length || r.failedRequests.length || r.badResponses.length));
  say(`URLs with any: ${withErr.length} of ${mine.filter(r => !r.error).length}`);
  const tally = new Map();
  for (const r of withErr) for (const e of [...r.consoleErrors.map(x => `console: ${x}`), ...r.pageErrors.map(x => `pageerror: ${x}`), ...r.failedRequests.map(x => `failed: ${x}`), ...r.badResponses.map(x => `http: ${x}`)]) {
    const k = e.replace(/[?#].*$/, '').replace(/\d{4,}/g, 'N').slice(0, 200);
    if (!tally.has(k)) tally.set(k, new Set());
    tally.get(k).add(`${r.vp === 'phone' ? 'phone ' : ''}${r.path}`);
  }
  for (const [k, s] of [...tally.entries()].sort((a, b) => b[1].size - a[1].size)) say(`  ${s.size} URL(s): ${k} [${[...s].slice(0, 8).join(', ')}${s.size > 8 ? ', ...' : ''}]`);
  const writes = mine.filter(r => r.blockedWrites && r.blockedWrites.length);
  say(`URLs where the audit blocked a write request: ${writes.length} ${[...new Set(writes.flatMap(r => r.blockedWrites))].slice(0, 10).join(' | ')}`);
  const rpcs = [...new Set(mine.flatMap(r => r.rpcPosts || []))];
  say(`read RPCs allowed through: ${rpcs.length} ${rpcs.join(', ')}`);

  /* (g) quality flags */
  say('\n## (g) loading, error, placeholder and account wording, spinners, ad slots');
  for (const k of ['loading', 'error', 'placeholder', 'account']) {
    const hits = mine.filter(r => !r.error && r.found && r.found[k].length);
    say(`${k}: ${hits.length} URL(s)`);
    for (const r of hits.slice(0, 40)) say(`  ${r.vp === 'phone' ? 'phone ' : ''}${r.path}: ${JSON.stringify(r.found[k].slice(0, 4))}`);
  }
  const spin = mine.filter(r => !r.error && r.spinners > 0);
  say(`spinners or skeletons still visible after settle: ${spin.length} ${spin.map(r => `${r.vp === 'phone' ? 'phone ' : ''}${r.path} (${r.spinners})`).join(', ')}`);
  const stillLoading = mine.filter(r => !r.error && r.seoState === 'loading');
  say(`guide section still loading after settle: ${stillLoading.length} ${stillLoading.map(r => r.path).join(', ')}`);
  const ads = mine.filter(r => !r.error && r.adSlots > 0);
  say(`ad slots in the DOM before consent: ${ads.length} URL(s)${ads.length ? ' ' + ads.map(r => `${r.path} (${r.adSlots}, ${r.adSlotsVisible} visible)`).join(', ') : ''}`);
  const noControls = [...plain.values()].filter(r => !r.error && r.seoState && r.buttons === 0 && r.inputs === 0);
  say(`game pages with no visible button or input outside the chrome after settle: ${noControls.length} ${noControls.map(r => r.path).join(', ')}`);
  const ext = new Map();
  for (const r of P) for (const h of r.externalLinks || []) ext.set(h, (ext.get(h) || 0) + 1);
  say(`external link hosts on plain pages: ${[...ext.entries()].sort((a, b) => b[1] - a[1]).map(([h, c]) => `${h} (${c})`).join(', ')}`);
  const ldMissing = P.filter(r => !r.jsonld.types.length);
  say(`plain pages with no JSON-LD after mount: ${ldMissing.length} ${ldMissing.map(r => r.path).join(', ')}`);
  const ldBad = mine.filter(r => !r.error && r.jsonld.unparsable);
  say(`URLs with unparsable JSON-LD: ${ldBad.length}`);
  const ldTypes = new Map();
  for (const r of P) for (const t of r.jsonld.types) ldTypes.set(t, (ldTypes.get(t) || 0) + 1);
  say(`JSON-LD types on plain pages: ${[...ldTypes.entries()].sort((a, b) => b[1] - a[1]).map(([t, c]) => `${t} ${c}`).join(', ')}`);

  /* compact copy for the repo: every measured number, none of the page text */
  const compactRec = r => ({
    route: r.route, form: r.form, vp: r.vp,
    error: r.error || undefined,
    rawStatus: r.rawStatus, status: r.status, redirects: r.redirects && r.redirects.length ? r.redirects : undefined,
    finalUrl: r.finalUrl, mounted: r.mounted, settled: r.settled, settleMs: r.settleMs,
    title: r.title, rawTitle: r.raw && r.raw.title !== r.title ? r.raw.title : undefined,
    description: r.descriptions ? r.descriptions[0] : undefined, descriptions: r.descriptions && r.descriptions.length > 1 ? r.descriptions.length : undefined,
    canonicals: r.canonicals, robots: r.robots && r.robots.length ? r.robots : undefined, xRobots: r.xRobots && r.xRobots.length ? r.xRobots : undefined,
    rawIndexability: r.rawIndexability && r.rawIndexability.length ? r.rawIndexability : undefined,
    h1: r.h1, h1InDom: r.h1InDom,
    savedPageChars: r.rawMainChars, savedPageWords: r.rawMainWords,
    settledPageChars: r.mainChars, settledPageWords: r.mainWords, settledInnerChars: r.mainInnerChars,
    guideState: r.seoState, guideWords: r.guideWords,
    lostOnMountChars: r.lostDomChars, lostOnMountBlocks: r.lostDomBlocks, lostSamples: r.lostSamples && r.lostSamples.length ? r.lostSamples : undefined,
    hiddenAfterMountChars: r.lostHiddenChars || undefined,
    losesContentOnMount: losesContent(r) || undefined,
    internalLinks: r.links ? r.links.length : undefined, bodyLinks: r.mainLinks ? r.mainLinks.length : undefined, rawInternalLinks: r.rawLinks ? r.rawLinks.length : undefined,
    jsonld: r.jsonld ? r.jsonld.types : undefined, rawJsonld: r.raw ? r.raw.jsonld.types : undefined,
    consoleErrors: r.consoleErrors && r.consoleErrors.length ? r.consoleErrors.slice(0, 3) : undefined,
    pageErrors: r.pageErrors && r.pageErrors.length ? r.pageErrors.slice(0, 3) : undefined,
    failedRequests: r.failedRequests && r.failedRequests.length ? r.failedRequests.slice(0, 3) : undefined,
    badResponses: r.badResponses && r.badResponses.length ? r.badResponses.slice(0, 3) : undefined,
    flags: r.found ? Object.fromEntries(Object.entries(r.found).filter(([, v]) => v.length)) : undefined,
    spinners: r.spinners || undefined, adSlots: r.adSlots || undefined,
  });
  const inl = graph(r => r.links);
  const inlRaw = graph(r => r.rawLinks);
  const inlBody = graph(r => r.mainLinks);
  const compact = {
    about: 'Round 836 live rendered audit of every sitemap URL at both addresses, plus a phone sample. Produced by scripts/playLiveRenderedAudit.mjs MODE=report. Page text is left out on purpose; every number is kept.',
    base, measured: [...new Set(mine.map(r => (r.at || '').slice(0, 10)).filter(Boolean))].sort(),
    sitemapRoutes: sitemapCount,
    userAgents: Object.fromEntries(Object.entries(meta).filter(([k]) => k.startsWith('ua '))),
    rules: { lossOnMount: `lost >= ${LOSS_MIN_CHARS} saved page characters and >= ${LOSS_MIN_SHARE * 100}% of the saved page text`, clusterJaccard: CLUSTER_J },
    linkGraph: Object.fromEntries([...routesSet].sort().map(r => [r, {
      inlinks: inl.inl.get(r).size, rawInlinks: inlRaw.inl.get(r).size, bodyInlinks: inlBody.inl.get(r).size,
      depth: inl.depth.has(r) ? inl.depth.get(r) : null, rawDepth: inlRaw.depth.has(r) ? inlRaw.depth.get(r) : null,
    }])),
    templateClusters: clusters,
    pages: mine.sort((a, b) => (a.vp + a.route + a.form).localeCompare(b.vp + b.route + b.form)).map(compactRec),
  };
  fs.mkdirSync(path.dirname(COMPACT), { recursive: true });
  fs.writeFileSync(COMPACT, JSON.stringify(compact, null, 1) + '\n');
  fs.writeFileSync(path.join(path.dirname(OUT), 'report.txt'), out.join('\n') + '\n');
  console.log(`\ncompact copy written to ${path.relative(ROOT, COMPACT)} (${compact.pages.length} records); this report saved beside ${path.relative(ROOT, OUT)}`);
}
