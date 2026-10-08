// Phase 0 audit, trust area, items 4b and 4c (browser half).
// A real browser against the build that is live (served at localhost:4190),
// with every request that is not the local server ABORTED and counted, so
// nothing reaches the database, the analytics host or the ad host.
// It samples the DOM on every mutation from before the first script runs, so
// a doubled footer that existed for one frame would still be on the record.
// Reads only. Merges its rows into trust-browser-walk.json beside itself.
// Run from the worktree root, a few routes at a time:
//   node docs/audits/ad-readiness-2026-10-08/trust-browser-walk.mjs / /about /contact
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import pw from '../../../scripts/lib/playwrightLoader.mjs';

const { chromium } = pw;
const BASE = process.env.BASE || 'http://localhost:4190';
const OUT = path.join(process.cwd(), 'docs/audits/ad-readiness-2026-10-08/trust-browser-walk.json');
const routes = process.argv.slice(2);
const ESSENTIAL_TOO = new Set((process.env.ESSENTIAL || '').split(',').filter(Boolean));
if (!routes.length) { console.error('name at least one route'); process.exit(1); }

const klass = host => {
  if (/(^|\.)googletagmanager\.com$|(^|\.)google-analytics\.com$|(^|\.)analytics\.google\.com$/.test(host)) return 'analytics';
  if (/(^|\.)googlesyndication\.com$|(^|\.)doubleclick\.net$|(^|\.)googleadservices\.com$|(^|\.)adservice\.google\.[a-z.]+$|(^|\.)googletagservices\.com$/.test(host)) return 'ads';
  if (/(^|\.)supabase\.co$/.test(host)) return 'database';
  if (/(^|\.)lovable\.(dev|app)$|gpteng/.test(host)) return 'host badge';
  return 'other:' + host;
};

// Runs in the page before any of its own scripts.
const SAMPLER = () => {
  const log = [];
  const t0 = performance.now();
  let last = '';
  const n = (s, re) => (s.match(re) || []).length;
  const sample = () => {
    const body = document.body;
    if (!body) return;
    const root = document.getElementById('root');
    const rootText = root ? root.textContent || '' : '';
    const s = {
      snapshot: !!document.getElementById('dukb-snapshot'),
      footers: document.querySelectorAll('footer').length,
      ownerDisclaimers: n(rootText, /property of their respective owners/g),
      fanProject: n(rootText, /independent fan project/g),
      bannerSentences: n(body.textContent || '', /Ads and analytics only run if you press Accept/g),
      bannerRegions: document.querySelectorAll('[role="region"][aria-label="Cookie choices"]').length,
      h1: document.querySelectorAll('h1').length,
    };
    const key = JSON.stringify(s);
    if (key !== last) { last = key; log.push({ ms: Math.round(performance.now() - t0), ...s }); }
  };
  new MutationObserver(sample).observe(document, { childList: true, subtree: true, characterData: true });
  const tick = () => { sample(); requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  window.__trustLog = log;
};

const FINAL = () => {
  const n = (s, re) => (s.match(re) || []).length;
  const text = document.body.innerText || '';
  const region = document.querySelector('[role="region"][aria-label="Cookie choices"]');
  return {
    title: document.title,
    footers: document.querySelectorAll('footer').length,
    ownerDisclaimersVisible: n(text, /property of their respective owners/g),
    fanProjectVisible: n(text, /independent fan project/g),
    notAffiliatedVisible: n(text, /not affiliated with/g),
    copyrightLines: n(text, /© 2026 DoUKnowBall/g),
    bannerRegions: document.querySelectorAll('[role="region"][aria-label="Cookie choices"]').length,
    bannerInsideDialog: region ? !!region.closest('[role="dialog"]') : null,
    bannerText: region ? (region.innerText || '').replace(/\s+/g, ' ').trim() : null,
    otherCookieWords: n(text.replace(/Cookie choices/g, ''), /cookies?/gi),
    openDialogs: document.querySelectorAll('[role="dialog"]').length,
    h1: document.querySelectorAll('h1').length,
    gtagScript: document.querySelectorAll('script[src*="googletagmanager.com/gtag/js"]').length,
    adScript: document.querySelectorAll('script[src*="adsbygoogle.js"]').length,
    adSlots: document.querySelectorAll('ins.adsbygoogle').length,
    robots: (document.querySelector('meta[name="robots"]') || {}).content || null,
    storedConsent: (() => { try { return localStorage.getItem('cookie-consent'); } catch { return 'blocked'; } })(),
    gameCountPhrases: [...new Set((text.match(/\b(?:all |over |more than )?\d{2,3}\+? (?:free |sports |trivia )*(?:games|of them)\b/gi) || []))].slice(0, 12),
  };
};

const existing = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : { base: BASE, rows: {} };
// Port 4190 is on the list of ports both node's fetch and Chromium refuse by
// default, so the raw read goes through node:http and the browser is told
// the port is allowed. Neither changes what the server sends.
const port = new URL(BASE).port;
const browser = await chromium.launch({ args: port ? [`--explicitly-allowed-ports=${port}`] : [] });
const rawGet = url => new Promise((resolve, reject) => {
  http.get(url, res => {
    let s = '';
    res.setEncoding('utf8');
    res.on('data', c => { s += c; });
    res.on('end', () => resolve(s));
  }).on('error', reject);
});

async function open(route) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const hits = [];
  let phase = 'before any choice';
  await context.route('**/*', r => {
    const u = new URL(r.request().url());
    if (u.origin === new URL(BASE).origin) return r.continue();
    hits.push({ phase, klass: klass(u.hostname), host: u.hostname });
    return r.abort();
  });
  await context.addInitScript(SAMPLER);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 160)));
  return { context, page, hits, errors, setPhase: p => { phase = p; } };
}

const tally = (hits, phase) => {
  const t = {};
  for (const h of hits) if (h.phase === phase) t[h.klass] = (t[h.klass] || 0) + 1;
  return t;
};

const ACCEPT = '[role="region"][aria-label="Cookie choices"] button:has-text("Accept")';
const ESSENTIAL = '[role="region"][aria-label="Cookie choices"] button:has-text("Essential only")';

for (const route of routes) {
  const row = { route };
  // raw: what a crawler that runs no JavaScript gets from the same server
  const raw = await rawGet(BASE + route);
  const rawBody = (raw.replace(/<!--[\s\S]*?-->/g, ' ').match(/<body[^>]*>([\s\S]*)<\/body>/i) || [, ''])[1]
    .replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ');
  const rawText = rawBody.replace(/<[^>]+>/g, ' ');
  row.raw = {
    footerTags: (rawBody.match(/<footer[\s>]/gi) || []).length,
    ownerDisclaimers: (rawText.match(/property of their respective owners/g) || []).length,
    bannerSentences: (rawText.match(/Ads and analytics only run if you press Accept/g) || []).length,
    snapshot: /id="dukb-snapshot"/.test(rawBody),
    gtagInHtml: /googletagmanager\.com\/gtag\/js[^'"]*['"][^>]*>/.test(raw.replace(/<script>[\s\S]*?<\/script>/g, '')),
    adScriptTag: /<script[^>]+adsbygoogle\.js/.test(raw),
  };

  // A: a first visit, nothing stored, nothing pressed
  const a = await open(route);
  await a.page.goto(BASE + route, { waitUntil: 'load' });
  await a.page.waitForTimeout(4000);
  row.timeline = await a.page.evaluate(() => window.__trustLog);
  row.maxima = {
    footers: Math.max(...row.timeline.map(s => s.footers)),
    ownerDisclaimers: Math.max(...row.timeline.map(s => s.ownerDisclaimers)),
    bannerSentences: Math.max(...row.timeline.map(s => s.bannerSentences)),
    bannerRegions: Math.max(...row.timeline.map(s => s.bannerRegions)),
    snapshotAndFooterTogether: row.timeline.some(s => s.snapshot && s.footers > 0),
    snapshotAndRegionTogether: row.timeline.some(s => s.snapshot && s.bannerRegions > 0),
  };
  row.beforeChoice = { state: await a.page.evaluate(FINAL), requests: tally(a.hits, 'before any choice') };

  // B: press Accept on that same page
  if (await a.page.locator(ACCEPT).count()) {
    a.setPhase('after Accept');
    await a.page.locator(ACCEPT).first().click();
    await a.page.waitForTimeout(2500);
    row.afterAccept = { state: await a.page.evaluate(FINAL), requests: tally(a.hits, 'after Accept') };
    // C: come back later with the answer stored
    a.setPhase('reload, accepted stored');
    await a.page.reload({ waitUntil: 'load' });
    await a.page.waitForTimeout(3000);
    row.reloadAccepted = { state: await a.page.evaluate(FINAL), requests: tally(a.hits, 'reload, accepted stored') };
  } else {
    row.afterAccept = { note: 'no Accept button was on the page' };
  }
  row.pageErrors = a.errors.slice(0, 5);
  await a.context.close();

  // D: the other answer, on the routes named in ESSENTIAL
  if (ESSENTIAL_TOO.has(route)) {
    const d = await open(route);
    await d.page.goto(BASE + route, { waitUntil: 'load' });
    await d.page.waitForTimeout(2500);
    if (await d.page.locator(ESSENTIAL).count()) {
      d.setPhase('after Essential only');
      await d.page.locator(ESSENTIAL).first().click();
      await d.page.waitForTimeout(1500);
      await d.page.reload({ waitUntil: 'load' });
      await d.page.waitForTimeout(3000);
      row.essentialOnly = { state: await d.page.evaluate(FINAL), requests: tally(d.hits, 'after Essential only') };
    }
    await d.context.close();
  }

  existing.rows[route] = row;
  fs.writeFileSync(OUT, JSON.stringify(existing, null, 1));
  const b = row.beforeChoice;
  console.log(`${route}  raw: footers ${row.raw.footerTags} disclaimers ${row.raw.ownerDisclaimers} banner ${row.raw.bannerSentences}`
    + ` | max ever: footers ${row.maxima.footers} disclaimers ${row.maxima.ownerDisclaimers} banners ${row.maxima.bannerRegions} snap+footer ${row.maxima.snapshotAndFooterTogether}`
    + ` | mounted: footers ${b.state.footers} disclaimers ${b.state.ownerDisclaimersVisible} banners ${b.state.bannerRegions} inDialog ${b.state.bannerInsideDialog}`
    + ` | before ${JSON.stringify(b.requests)} | accept ${JSON.stringify(row.afterAccept.requests || row.afterAccept.note)}`
    + ` | reload ${JSON.stringify((row.reloadAccepted || {}).requests || null)}`
    + (row.essentialOnly ? ` | essential ${JSON.stringify(row.essentialOnly.requests)}` : ''));
}
await browser.close();
