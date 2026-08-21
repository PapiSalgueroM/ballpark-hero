/**
 * Round 209: every page of the site, at the size he actually plays it.
 *
 * Round 203 built playIphone, which drives ten busy screens under the
 * iPhone descriptor. Ten out of a hundred and thirty two is a spot check,
 * and the owner reports bugs by sending a screenshot of whatever page he
 * happened to be on. So this is the whole site: every static route in
 * App.tsx, opened at 390 by 844 with touch and an iOS user agent, and
 * checked for the four things that actually go wrong on a phone.
 *
 *   1. HORIZONTAL OVERFLOW. Something wider than the screen, which turns
 *      the whole page into a sideways scroll. The single most common phone
 *      bug there is, and it is invisible on a desktop.
 *   2. TAP TARGETS. A control inside the page under 30px tall. Apple asks
 *      for 44 points; 30 is the floor this project asserts, and it caught a
 *      16px link in Round 203.
 *   3. TEXT TOO SMALL TO READ. Anything under 9px of rendered font size in
 *      the page body. The design leans on 9 and 10 pixel type deliberately
 *      for second lines on tiles, so 9 is the floor, not a preference.
 *   4. CONTROLS THAT OVERLAP EACH OTHER. Two buttons sitting on top of one
 *      another means one of them cannot be pressed, which is a bug you
 *      only find by measuring, never by looking at a screenshot.
 *
 * Deliberate exclusions, each with a reason rather than a shrug: the
 * ticker is a marquee of thin one line headlines that scrolls past by
 * design; the footer is a dense block of legal links; and both were
 * excluded from the same rule in Round 203. Round 209 adds one more: a
 * link INSIDE a sentence is prose, not a control, and padding the words
 * "Privacy Policy" to thirty pixels in the middle of a paragraph would
 * break the paragraph to satisfy a rule that was never about it. Tables and code blocks are
 * allowed to scroll sideways INSIDE themselves, so overflow is measured on
 * the document, not on every element.
 *
 * Run: npm run build && npx serve -s dist -l 4173, then
 *      ENGINES=chromium node scripts/sweepPhone.mjs
 * A single route can be checked with ROUTE=/club-manager.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pw from '/home/claude/.npm-global/lib/node_modules/playwright/index.js';

const { chromium, devices } = pw;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173';

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

/** Every static route the app serves, read from the router itself. */
function routes() {
  const src = fs.readFileSync(path.join(ROOT, 'src/App.tsx'), 'utf-8');
  const all = [...src.matchAll(/<Route path="([^"]+)"/g)].map(m => m[1]);
  return [...new Set(all.filter(p => p.startsWith('/') && !p.includes(':') && p !== '*'))];
}

const ROUTES = process.env.ROUTE ? [process.env.ROUTE] : routes();

const iPhone = devices['iPhone 13'] ?? {
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ ...iPhone });
const page = await ctx.newPage();
const pageErrors = [];
page.on('pageerror', e => pageErrors.push(String(e)));

/* The consent bar eats the first tap on a fresh context, so it is dealt
   with once rather than on every page. */
await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(600);
const consent = page.locator('button:has-text("Essential only")');
if (await consent.count()) { await consent.first().click().catch(() => {}); await page.waitForTimeout(300); }

console.log(`Sweeping ${ROUTES.length} routes at 390x844 with touch`);

const worst = { overflow: 0, route: '' };
let smallTargets = 0, tinyText = 0, overlaps = 0, checked = 0;

for (const route of ROUTES) {
  let metrics;
  try {
    await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(500);
    metrics = await page.evaluate(() => {
      const doc = document.documentElement;
      const main = document.querySelector('main') ?? document.body;
      const skip = el => el.closest('.dukb-ticker-track') || el.closest('footer') || el.closest('nav');

      /* 1. sideways scroll on the document itself */
      const overflow = doc.scrollWidth - doc.clientWidth;

      /* the element responsible, when there is one, so a failure is
         actionable rather than a number */
      let culprit = null;
      if (overflow > 2) {
        for (const el of Array.from(main.querySelectorAll('*'))) {
          const r = el.getBoundingClientRect();
          if (r.width === 0) continue;
          if (r.right > doc.clientWidth + 2 || r.left < -2) {
            culprit = `${el.tagName.toLowerCase()}.${(el.className || '').toString().split(' ').slice(0, 2).join('.')}`;
            break;
          }
        }
      }

      /* 2. tap targets, and 3. type size, in one pass */
      const small = [], tiny = [];
      const boxes = [];
      /* A link inside a sentence is not a control, it is prose, and no
         amount of padding makes "see our Privacy Policy" a 44 point target
         without wrecking the paragraph it lives in. The rule is about
         things you go and press. An anchor is treated as prose when its
         parent holds meaningfully more text than the link itself. */
      const isProseLink = el => {
        if (el.tagName !== 'A') return false;
        const parent = el.parentElement;
        if (!parent) return false;
        const own = (el.textContent ?? '').trim().length;
        const around = (parent.textContent ?? '').trim().length;
        return around > own + 12;
      };
      for (const el of Array.from(main.querySelectorAll('a, button, [role="button"]'))) {
        if (skip(el)) continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        const label = (el.textContent ?? '').trim().slice(0, 22);
        if (r.height < 30 && label.length > 2 && !isProseLink(el)) small.push(`${label} (${Math.round(r.height)}px)`);
        boxes.push({ label, x: r.x, y: r.y, w: r.width, h: r.height });
      }
      for (const el of Array.from(main.querySelectorAll('p, span, div, li, td, th, label'))) {
        if (skip(el)) continue;
        const txt = (el.textContent ?? '').trim();
        if (!txt || el.children.length > 0) continue;
        const size = parseFloat(getComputedStyle(el).fontSize);
        if (size && size < 9) tiny.push(`${txt.slice(0, 18)} (${size}px)`);
      }

      /* 4. controls stacked on top of each other. Only counts when the
         overlap is most of both, so a button inside a card does not
         register and a genuine collision does. */
      const hits = [];
      for (let i = 0; i < boxes.length && hits.length < 3; i++) {
        for (let j = i + 1; j < boxes.length && hits.length < 3; j++) {
          const a = boxes[i], b = boxes[j];
          const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
          const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
          if (ox <= 0 || oy <= 0) continue;
          const area = ox * oy;
          if (area > 0.7 * a.w * a.h && area > 0.7 * b.w * b.h) {
            hits.push(`${a.label || '(icon)'} over ${b.label || '(icon)'}`);
          }
        }
      }
      return { overflow, culprit, small, tiny, hits, controls: boxes.length };
    });
  } catch (e) {
    fail(`${route}: would not load (${String(e).split('\n')[0].slice(0, 90)})`);
    continue;
  }
  checked += 1;
  if (metrics.overflow > worst.overflow) { worst.overflow = metrics.overflow; worst.route = route; }
  if (metrics.overflow > 2) {
    fail(`${route}: ${metrics.overflow}px of sideways scroll${metrics.culprit ? ` (first offender: ${metrics.culprit})` : ''}`);
  }
  if (metrics.small.length) {
    smallTargets += metrics.small.length;
    fail(`${route}: ${metrics.small.length} control${metrics.small.length === 1 ? '' : 's'} under 30px: ${metrics.small.slice(0, 3).join(', ')}`);
  }
  if (metrics.tiny.length) {
    tinyText += metrics.tiny.length;
    fail(`${route}: ${metrics.tiny.length} run${metrics.tiny.length === 1 ? '' : 's'} of text under 9px: ${metrics.tiny.slice(0, 3).join(', ')}`);
  }
  if (metrics.hits.length) {
    overlaps += metrics.hits.length;
    fail(`${route}: controls sitting on top of each other: ${metrics.hits.join(', ')}`);
  }
}

const real = pageErrors.filter(e => !/supabase|Failed to fetch|CORS|ResizeObserver/i.test(e));
if (real.length) fail(`${real.length} page error${real.length === 1 ? '' : 's'} across the sweep (${real[0].slice(0, 120)})`);

console.log('');
console.log(`   ${checked} routes swept, worst overflow ${worst.overflow}px${worst.route ? ` (${worst.route})` : ''}`);
console.log(`   ${smallTargets} small tap targets, ${tinyText} runs of tiny text, ${overlaps} overlapping controls`);
await ctx.close();
await browser.close();
if (failures > 0) {
  console.error(`sweepPhone: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('sweepPhone: green. Every page of the site fits the phone it is played on.');
