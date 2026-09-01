/**
 * Round 373: one page, one FAQPage, and it never gets rewritten.
 *
 * WHAT WAS WRONG. Four shipped documents carried TWO FAQPage blocks each:
 * /front-office, /nhl-front-office, /gauntlet-draft and /nhl-connect-4 all
 * declared the real per game question set AND a generic three question set
 * ("What is X? / How do you play X? / Is X free to play?"). One URL telling
 * Google two different stories about its own FAQ, on a site sitting under a low
 * value content rejection.
 *
 * WHY IT HAPPENED, because the mechanism decides what is worth fencing.
 * GameSeoContent used to emit the generic set for as long as the guide file was
 * in flight and swap in the real one when it landed. react-helmet-async 3 on
 * React 19 does not touch the DOM at all: it renders head tags as React
 * elements and lets React 19 hoist them into the head. A hoisted inline
 * <script> whose CONTENT changes after mount is not reliably replaced, so the
 * real block was sometimes appended with the generic one left behind, for good.
 * Measured with a MutationObserver installed before boot: every page passed
 * through the generic block, and the doubling was intermittent, which is why
 * rebuilding an unchanged page moved the schema and why it looked like flapping.
 *
 * The generic set was also never visible: the FAQ list on the page renders
 * inside {content && ...}, so those questions appeared nowhere a visitor could
 * read them, which is its own structured data problem regardless of the double.
 *
 * WHAT THIS HOLDS:
 *   1. THE OUTPUT. No shipped snapshot carries two ld+json blocks of the same
 *      @type, and no FAQPage anywhere carries the generic placeholder shape.
 *      This is the check that would have caught the bug, and it reads the files
 *      a crawler is served rather than the source that generates them.
 *   2. THE CAUSE. On the bare shell the prerenderer serves, watched from before
 *      the app boots, no JSON-LD block is ever inserted and then replaced by a
 *      different block of the same @type. That is the property that makes a head
 *      safe to photograph at any moment, and it is stronger than "the head
 *      settles correctly": a head that settles correctly can still be captured
 *      mid swap, which is exactly what happened in Round 369.
 *
 * NEGATIVE CONTROLS, one per section, because each section can fail for its own
 * reason:
 *   FAQSCHEMA_CONTROL=dupe   plants a second FAQPage into an in memory copy of
 *                            every snapshot, reproducing the shipped bug, and
 *                            section 1 must go red.
 *   FAQSCHEMA_CONTROL=swap   injects a page script that appends a second
 *                            FAQPage a beat after boot, reproducing the runtime
 *                            failure, and section 2 must go red.
 * Both refuse to run if the thing they plant was not actually planted.
 *
 * Run: node scripts/simFaqSchema.mjs   (needs dist, no database)
 */
import { createServer } from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from './lib/playwrightLoader.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const CONTROL = process.env.FAQSCHEMA_CONTROL || '';
if (CONTROL && CONTROL !== 'dupe' && CONTROL !== 'swap') {
  console.error(`FAQSCHEMA_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(1);
}

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

const LD = /<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g;
function blocksIn(html) {
  const head = html.split('</head>')[0];
  const out = [];
  for (const m of head.matchAll(LD)) {
    let j;
    try { j = JSON.parse(m[1]); } catch { out.push({ '@type': 'UNPARSEABLE' }); continue; }
    for (const it of (Array.isArray(j) ? j : [j])) out.push(it);
  }
  return out;
}

/* The placeholder shape, matched by SHAPE rather than by the exact sentences,
   so a reworded placeholder is still caught. Three questions, the first asking
   what the game is and the second how to play it, is the fallback and nothing
   a human wrote by hand looks like that. */
function isPlaceholder(faq) {
  const qs = (faq.mainEntity || []).map(q => String(q.name || ''));
  return qs.length === 3 && /^What is /.test(qs[0]) && /^How do you play /.test(qs[1]);
}

console.log('1) no shipped document carries two blocks of the same @type');
{
  const files = [];
  const walk = d => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const f = path.join(d, e.name);
      if (e.isDirectory()) walk(f);
      else if (e.name === 'index.html') files.push(f);
    }
  };
  walk(path.join(ROOT, 'public'));

  let planted = 0;
  let doubled = 0, placeholders = 0, checked = 0, withFaq = 0;
  for (const f of files) {
    let html = fs.readFileSync(f, 'utf8');
    if (CONTROL === 'dupe') {
      /* Plant the shipped bug: a second FAQPage beside the real one. Only into
         documents that already have one, so the plant is the double and not the
         schema's arrival. */
      const m = /<script type="application\/ld\+json"[^>]*>[^<]*"@type":"FAQPage"[\s\S]*?<\/script>/.exec(html.split('</head>')[0]);
      if (m) {
        const dupe = '<script type="application/ld+json" data-rh="true">' + JSON.stringify({
          '@context': 'https://schema.org', '@type': 'FAQPage',
          mainEntity: [
            { '@type': 'Question', name: 'What is this game?', acceptedAnswer: { '@type': 'Answer', text: 'A game.' } },
            { '@type': 'Question', name: 'How do you play this game?', acceptedAnswer: { '@type': 'Answer', text: 'You play it.' } },
            { '@type': 'Question', name: 'Is this game free to play?', acceptedAnswer: { '@type': 'Answer', text: 'Yes.' } },
          ],
        }) + '</script>';
        html = html.replace(m[0], m[0] + dupe);
        planted += 1;
      }
    }
    const blocks = blocksIn(html);
    if (blocks.length === 0) continue;
    checked += 1;
    const route = '/' + path.relative(path.join(ROOT, 'public'), path.dirname(f)).replaceAll(path.sep, '/');
    const counts = new Map();
    for (const b of blocks) counts.set(b['@type'], (counts.get(b['@type']) || 0) + 1);
    for (const [type, n] of counts) {
      if (n > 1) {
        doubled += 1;
        if (doubled <= 6) fail(`${route} ships ${n} ${type} blocks, so one URL declares ${n} of the same entity and they do not agree`);
      }
    }
    for (const b of blocks) {
      if (b['@type'] !== 'FAQPage') continue;
      withFaq += 1;
      if (isPlaceholder(b)) {
        placeholders += 1;
        if (placeholders <= 4) fail(`${route} ships the placeholder FAQ ("${(b.mainEntity[0] || {}).name}"), whose questions are on no visible part of the page`);
      }
    }
  }
  if (CONTROL === 'dupe') {
    if (planted === 0) { console.error('control cannot run: no snapshot had a FAQPage to duplicate'); process.exit(1); }
    console.log(`   NEGATIVE CONTROL ON: a second FAQPage planted into ${planted} in memory copies, section 1 must go red`);
  }
  console.log(`   ${checked} documents with structured data, ${withFaq} FAQPage blocks, ${doubled} duplicated types, ${placeholders} placeholders`);
  if (withFaq < 50) fail(`only ${withFaq} FAQPage blocks were found across the whole site, so this section is not really testing anything`);
}

console.log('2) no JSON-LD block is inserted and then replaced');
if (!fs.existsSync(path.join(DIST, 'index.html'))) {
  fail('there is no dist to serve, so the runtime half of this harness could not run');
} else {
  /* SERVED THE WAY THE PRERENDERER SERVES IT: the bare vite shell for every
     route, so React draws the head from scratch. Serving dist normally would
     hand back the finished snapshots and measure the bug's output instead of
     its cause, which the first attempt at this did. */
  const SHELL = fs.readFileSync(path.join(DIST, 'index.html'));
  const MIME = { '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.txt': 'text/plain', '.xml': 'application/xml' };
  const isFile = f => { try { return fs.statSync(f).isFile(); } catch { return false; } };
  const server = createServer((req, res) => {
    const p = decodeURIComponent(req.url.split('?')[0]);
    const f = path.join(DIST, p);
    if (p !== '/' && !p.endsWith('.html') && isFile(f)) {
      res.writeHead(200, { 'content-type': MIME[path.extname(f)] ?? 'application/octet-stream' });
      res.end(fs.readFileSync(f));
      return;
    }
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(SHELL);
  });
  const PORT = 4187;
  await new Promise(r => server.listen(PORT, r));

  /* Routes chosen for a reason rather than sampled. The first four actually
     shipped the double, so they are the regression. The next three are game
     pages that did not, so the section still measures something if the first
     four are ever retired. The last three are the other page SHAPES that carry
     structured data at all, because the invariant here is about any JSON-LD
     block and not only the FAQ: a hub, an archive, and a plain content page.
     Section 1 is the one that covers all 156 documents; this one covers the
     cause on a spread of shapes. */
  const ROUTES = [
    '/front-office', '/nhl-front-office', '/gauntlet-draft', '/nhl-connect-4',
    '/ufc', '/footle', '/soccer-career',
    '/soccer', '/nba-grid/archive', '/records',
  ];
  /* Only the game pages carry a FAQ, so the "no FAQPage ever appeared" check
     below applies to those and not to the shape sample. */
  const FAQ_EXPECTED = new Set(['/front-office', '/nhl-front-office', '/gauntlet-draft', '/nhl-connect-4', '/ufc', '/footle', '/soccer-career']);
  const browser = await chromium.launch();
  let controlFired = 0;
  for (const route of ROUTES) {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      /* Installed BEFORE any page code runs, so the very first head state is
         recorded. A poll cannot do this: the swap this exists to catch lasted
         less than one 100ms tick when it was measured by polling. */
      window.__dukbLd = [];
      const read = () => {
        const out = [];
        for (const s of document.querySelectorAll('script[type="application/ld+json"]')) {
          let j;
          try { j = JSON.parse(s.textContent); } catch { continue; }
          for (const it of (Array.isArray(j) ? j : [j])) {
            out.push({ type: it['@type'], first: ((it.mainEntity || [])[0] || {}).name || (it.name || '') });
          }
        }
        return out;
      };
      const record = () => {
        const now = read();
        const key = JSON.stringify(now);
        if (window.__dukbLdKey !== key) { window.__dukbLdKey = key; window.__dukbLd.push(now); }
      };
      /* An init script runs BEFORE parsing, so document.head is still null here
         and observing it throws, which kills the whole script silently and
         leaves this section reporting one empty state for every route. That is
         how the first run of this harness looked, and it looked like a passing
         shape rather than a broken instrument, which is the reason the "no
         FAQPage ever appeared" failure below exists. */
      const boot = () => {
        record();
        new MutationObserver(record).observe(document.head, { childList: true, subtree: true, characterData: true });
      };
      if (document.head) boot();
      else document.addEventListener('readystatechange', boot, { once: true });
    });
    if (CONTROL === 'swap') {
      await page.addInitScript(() => {
        /* Reproduce the observed failure exactly: a second FAQPage appended a
           beat after the real one, left in the head for good. */
        window.__dukbControlPlanted = false;
        setTimeout(() => {
          const s = document.createElement('script');
          s.type = 'application/ld+json';
          s.setAttribute('data-rh', 'true');
          s.textContent = JSON.stringify({
            '@context': 'https://schema.org', '@type': 'FAQPage',
            mainEntity: [{ '@type': 'Question', name: 'What is this game?', acceptedAnswer: { '@type': 'Answer', text: 'A game.' } }],
          });
          document.head.appendChild(s);
          window.__dukbControlPlanted = true;
        }, 1500);
      });
    }
    await page.goto(`http://127.0.0.1:${PORT}${route}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);
    const states = await page.evaluate(() => window.__dukbLd);
    if (CONTROL === 'swap' && await page.evaluate(() => window.__dukbControlPlanted)) controlFired += 1;

    /* THE INVARIANT: once a @type appears in the head with some content, that
       content never changes and it never gains a sibling of the same @type.
       Both halves matter. A replacement is what leaves the stale block behind;
       a second block is what a crawler then reads. */
    const firstSeen = new Map();
    let replaced = 0, doubled = 0;
    for (const state of states) {
      const counts = new Map();
      for (const b of state) counts.set(b.type, (counts.get(b.type) || 0) + 1);
      for (const [type, n] of counts) {
        if (n > 1 && doubled === 0) {
          doubled += 1;
          fail(`${route}: the head held ${n} ${type} blocks at once, so a snapshot taken at that moment ships both`);
        }
      }
      for (const b of state) {
        if (!firstSeen.has(b.type)) { firstSeen.set(b.type, b.first); continue; }
        if (firstSeen.get(b.type) !== b.first && replaced === 0) {
          replaced += 1;
          fail(`${route}: the ${b.type} block was rewritten after it was inserted, from "${firstSeen.get(b.type)}" to "${b.first}". React 19 hoists these and does not reliably remove the old one.`);
        }
      }
    }
    const types = [...firstSeen.keys()].sort().join(', ');
    console.log(`   ${route.padEnd(20)} ${states.length} head states, settled on: ${types}`);
    if (FAQ_EXPECTED.has(route) && !firstSeen.has('FAQPage')) fail(`${route}: no FAQPage ever appeared, so this route proves nothing about the block this harness is about`);
    if (firstSeen.size === 0) fail(`${route}: no structured data appeared at all, so the observer or the app is broken rather than the page being clean`);
    await page.close();
  }
  await browser.close();
  server.close();
  if (CONTROL === 'swap') {
    if (controlFired !== ROUTES.length) { console.error(`control cannot run: the extra block was planted on only ${controlFired} of ${ROUTES.length} routes`); process.exit(1); }
    console.log(`   NEGATIVE CONTROL ON: a second FAQPage appended after boot on all ${controlFired} routes, section 2 must go red`);
  }
}

console.log('');
if (CONTROL) {
  if (failures > 0) { console.log(`simFaqSchema control (${CONTROL}): green. The planted duplicate was caught (${failures} finding${failures === 1 ? '' : 's'}).`); process.exit(0); }
  console.error(`simFaqSchema control (${CONTROL}): RED. A duplicate FAQPage was planted and nothing noticed.`);
  process.exit(1);
}
if (failures > 0) { console.error(`simFaqSchema: ${failures} failure${failures === 1 ? '' : 's'}`); process.exit(1); }
console.log('simFaqSchema: green. One block per type per page, written once and never rewritten.');
