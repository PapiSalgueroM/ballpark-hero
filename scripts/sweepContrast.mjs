/**
 * Round 215: can you read this site, and can you use it without a mouse.
 * Harness 83. Nobody had ever measured either thing on any page.
 *
 * What the first measurement found, all of it shipped for months: the muted
 * grey half the site is written in at 4.13 to 1 on a card (4.5 is the bar for
 * normal text); the primary button printing white on the brand green at 2.93;
 * white on the success green at 2.30, the worst pair on the site; the World
 * Cup predictor deriving group heading colours by subtracting lightness with
 * no floor, so Group H titled itself at 1.83 and its Predict Scores line at
 * 1.24, a hue with no word inside it; not one page drawing a focus ring; not
 * one page with a skip link; 42 connect 4 squares and 288 score inputs that a
 * screen reader announced as nothing at all.
 *
 * Four sections.
 *
 *   1. CONTRAST, every route, real rendering. The one method detail that
 *      makes the numbers honest is ALPHA COMPOSITING up the ancestor tree:
 *      half the site's fills are rgba() tints over darker cards, and a naive
 *      check that reads one backgroundColor calls rgba(green, 0.15) opaque
 *      green and reports a nonsense 1 to 1. Gradients are checked against
 *      EVERY colour stop, worst stop wins, because a heading that dies at one
 *      end of a gradient is unreadable at that end no matter how the other
 *      end looks. Bars per WCAG: 4.5 normal text, 3.0 large (24px, or 18.66px
 *      bold). The page is scrolled to the bottom first so reveal-on-scroll
 *      sections actually exist when they are measured.
 *
 *   2. KEYBOARD, the home page. Presses Tab like a person. :focus-visible
 *      deliberately does NOT match a programmatic .focus(), so a loop that
 *      calls focus() on things measures nothing at all: the ring only draws
 *      for a real key press. Asserts the skip link is tab stop one, points at
 *      #dukb-main, sits off screen until focused, and that every stop walked
 *      draws a visible ring. 140ms settle after each press because the ring
 *      paints after the focus event, not during it.
 *
 *   3. SCREEN READER BASICS, every route. Every control (button, link,
 *      input) must have an accessible name: its own text, an aria-label, a
 *      resolved aria-labelledby, a title, or for inputs a wired <label>. An
 *      icon button without one reads as just "button", which is a door with
 *      no sign on it.
 *
 *   4. SOURCE SCAN, no browser. Catches the three shapes that caused most of
 *      the damage before anything renders: white ink on a fill too light to
 *      carry it, the dark grey tailwind inks (500 to 800) on this dark site,
 *      and literal text-[hsl(...)] colours in the murky middle. Plus bare
 *      outline-none with no focus ring replacement outside components/ui
 *      (the ui folder manages its own focus styles). The scan carries its own
 *      CONTROL examples and fails if it stops recognising any of them, so a
 *      refactor cannot quietly blind it.
 *
 * Run: npm run build && npx serve -s dist -l 4173, then
 *      node scripts/sweepContrast.mjs
 * ROUTE=/club-manager sweeps one route. SKIP_BROWSER=1 runs only the source
 * scan, which is what you want while fixing findings.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pw from '/home/claude/.npm-global/lib/node_modules/playwright/index.js';

const { chromium } = pw;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173';

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

/* ---------------------------------------------------------------- section 4
   The source scan runs first because it needs no server and finishing fast
   matters while iterating. All colour math is duplicated tiny here rather
   than imported from src, because a harness that imports the thing it is
   guarding can be blinded by the same bug it is hunting. */

function hslToRgb(h, s, l) {
  s /= 100; l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = ((h % 360) + 360) % 360 / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r1 = 0, g1 = 0, b1 = 0;
  if (hp < 1) { r1 = c; g1 = x; } else if (hp < 2) { r1 = x; g1 = c; }
  else if (hp < 3) { g1 = c; b1 = x; } else if (hp < 4) { g1 = x; b1 = c; }
  else if (hp < 5) { r1 = x; b1 = c; } else { r1 = c; b1 = x; }
  const m = l - c / 2;
  return [Math.round((r1 + m) * 255), Math.round((g1 + m) * 255), Math.round((b1 + m) * 255)];
}
function lum([r, g, b]) {
  const f = v => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function contrast(a, b) {
  const la = lum(a), lb = lum(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
const hex = h => [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
const WHITE = [255, 255, 255];
const CARD = hslToRgb(225, 20, 11);

/* Tailwind default fills that appear in this repo. A fill is "too light for
   white" when white on it measures under 4.5. Computed, not guessed. */
const TW_FILLS = {
  'emerald-500': '10b981', 'emerald-600': '059669', 'emerald-700': '047857',
  'red-500': 'ef4444', 'red-600': 'dc2626', 'red-700': 'b91c1c',
  'amber-500': 'f59e0b', 'amber-600': 'd97706', 'amber-700': 'b45309',
  'orange-500': 'f97316', 'orange-600': 'ea580c',
  'green-500': '22c55e', 'green-600': '16a34a',
  'blue-500': '3b82f6', 'blue-600': '2563eb',
  'sky-500': '0ea5e9', 'sky-600': '0284c7',
  'teal-500': '14b8a6', 'teal-600': '0d9488',
  'lime-500': '84cc16', 'yellow-500': 'eab308',
  'rose-500': 'f43f5e', 'cyan-500': '06b6d4', 'cyan-600': '0891b2',
  'indigo-500': '6366f1', 'violet-500': '8b5cf6', 'pink-500': 'ec4899',
};
const LIGHT_FILLS = new Set(
  Object.entries(TW_FILLS).filter(([, h]) => contrast(WHITE, hex(h)) < 4.5).map(([k]) => k),
);

const detectors = {
  /* white words on a fill computed too light to carry them, both named in
     the same class string. text-white/25 is a deliberate dim tint, not white
     ink, and bg-emerald-500/15 is a whisper of tint over a dark card, not a
     light fill, so alpha suffixes are excluded on BOTH sides. */
  whiteOnLight(s) {
    if (!/(?:^|[\s"'`:])text-white(?![\w/-])/.test(s)) return false;
    for (const m of s.matchAll(/(?:hover:|focus:|active:)?bg-([a-z]+-\d+)(?![\w/-])/g)) {
      if (LIGHT_FILLS.has(m[1])) return true;
    }
    /* the site's own token fills carry near black foregrounds since Round
       215 because white measures under the bar on every one of them */
    if (/bg-(primary|correct|destructive|warn|gold|close)(?![\w/-])/.test(s)) return true;
    return false;
  },
  /* dark tailwind greys used as ink. This site is dark everywhere, so grey
     ink under 400 is unreadable unless it sits on a light chip, and a light
     chip in the same string excuses it. */
  greyInk(s) {
    if (/bg-(white|[a-z]+-(?:50|100|200|300))\b/.test(s)) return false;
    return /(?:^|[\s"'`:])text-(neutral|slate|gray|zinc|stone)-(500|600|700|800)\b/.test(s)
      || /(?:^|[\s"'`:])text-(green|red)-(700|800|900)\b/.test(s);
  },
  /* literal hsl ink measured against the surface the same string declares.
     A string that names its own fill (bg-[hsl(...)], or a gradient's from/to
     stops) is judged against that fill, worst stop winning, which is how a
     near black label on a gold button passes and a grey placeholder on a
     dark input fails. A string with no fill of its own is judged against the
     card, the surface it realistically sits on. */
  murkyHsl(s) {
    const surfaces = [];
    for (const m of s.matchAll(/(?:bg|from|to|via)-\[hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)\]/g)) {
      surfaces.push(hslToRgb(+m[1], +m[2], +m[3]));
    }
    if (!surfaces.length) surfaces.push(CARD);
    for (const m of s.matchAll(/text-\[hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)\]/g)) {
      const ink = hslToRgb(+m[1], +m[2], +m[3]);
      if (surfaces.some(sur => contrast(ink, sur) < 4.5)) return true;
    }
    return false;
  },
  /* a control that kills the browser outline and replaces it with nothing.
     focus-visible: or focus:ring in the same string counts as a
     replacement. */
  bareOutline(s) {
    if (!/(?:^|\s)(?:focus:)?outline-none\b/.test(s)) return false;
    return !/focus-visible:|focus:ring/.test(s);
  },
};

/* The scan's own controls. If a detector stops recognising its own example,
   the scan is blind and must say so rather than passing quietly. */
const CONTROLS = {
  whiteOnLight: 'rounded bg-emerald-500 text-white px-2',
  greyInk: 'text-sm text-neutral-600 mt-1',
  murkyHsl: 'text-[hsl(150,15%,40%)] uppercase',
  bareOutline: 'w-full rounded outline-none px-2',
};

console.log('Section 4: source scan');
for (const [name, example] of Object.entries(CONTROLS)) {
  if (!detectors[name](example)) fail(`source scan control broke: ${name} no longer recognises its own example`);
}
/* second control for the token fill arm of whiteOnLight */
if (!detectors.whiteOnLight('rounded bg-correct text-white px-2')) {
  fail('source scan control broke: whiteOnLight no longer recognises a token fill');
}

function* tsxFiles(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* tsxFiles(p);
    else if (e.name.endsWith('.tsx')) yield p;
  }
}

/* A template literal is not one string. `a ${cond ? "b" : "c"} d` holds two
   static parts and two nested strings, and treating the whole thing as one
   string pairs a fill from one branch with ink from the other and reports a
   combination no player ever sees. So template bodies are split on their
   expressions and the expressions are scanned recursively for the strings
   inside them. */
function* stringsIn(text, depth = 0) {
  if (depth > 4) return;
  for (const m of text.matchAll(/(["'`])((?:(?!\1)[^\\]|\\.)*)\1/g)) {
    const q = m[1], body = m[2];
    if (q === '`' && body.includes('${')) {
      let i = 0;
      while (i < body.length) {
        const open = body.indexOf('${', i);
        if (open === -1) { yield body.slice(i); break; }
        yield body.slice(i, open);
        let d = 1, j = open + 2;
        while (j < body.length && d > 0) {
          if (body[j] === '{') d += 1;
          else if (body[j] === '}') d -= 1;
          j += 1;
        }
        yield* stringsIn(body.slice(open + 2, j - 1), depth + 1);
        i = j;
      }
    } else {
      yield body;
    }
  }
}

let sourceFindings = 0;
for (const file of tsxFiles(path.join(ROOT, 'src'))) {
  const rel = path.relative(ROOT, file);
  const inUi = rel.includes(`components${path.sep}ui${path.sep}`);
  const text = fs.readFileSync(file, 'utf8');
  for (const s of stringsIn(text)) {
    if (!s.includes('text-') && !s.includes('outline-none')) continue;
    /* a class list never contains markup; a captured chunk that does is the
       scanner desyncing on backticks inside JSX, not a style string */
    if (s.includes('<') || s.includes('>')) continue;
    for (const [name, det] of Object.entries(detectors)) {
      if (name === 'bareOutline' && inUi) continue;
      if (det(s)) {
        sourceFindings += 1;
        if (sourceFindings <= 12) fail(`${rel}: ${name}: "${s.trim().slice(0, 80)}"`);
      }
    }
  }
}
if (sourceFindings > 12) fail(`...and ${sourceFindings - 12} more source findings`);
console.log(`   source scan: ${sourceFindings} finding${sourceFindings === 1 ? '' : 's'}`);

if (process.env.SKIP_BROWSER === '1') {
  console.log(failures ? `sweepContrast (source only): ${failures} failures` : 'sweepContrast (source only): green.');
  process.exit(failures ? 1 : 0);
}

/* ------------------------------------------------------------ browser prep */

function routes() {
  const src = fs.readFileSync(path.join(ROOT, 'src/App.tsx'), 'utf-8');
  const all = [...src.matchAll(/<Route path="([^"]+)"/g)].map(m => m[1]);
  return [...new Set(all.filter(p => p.startsWith('/') && !p.includes(':') && p !== '*'))];
}
const ROUTES = process.env.ROUTE ? [process.env.ROUTE] : routes();

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();

await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(600);
const consent = page.locator('button:has-text("Essential only")');
if (await consent.count()) { await consent.first().click().catch(() => {}); await page.waitForTimeout(300); }

/* ------------------------------------------------------------- section 1+3
   One pass per route measures both contrast and names, because the walk over
   the DOM is the expensive part and it is the same walk. */

console.log(`\nSections 1 and 3: contrast and names across ${ROUTES.length} routes`);

let unreadable = 0, unnamed = 0, unlabelled = 0, gradSkips = 0, routesChecked = 0;

for (const route of ROUTES) {
  let r;
  try {
    await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(400);
    /* reveal-on-scroll sections are opacity zero until seen, so walk the
       page bottomwards first and let the transitions finish. */
    await page.evaluate(async () => {
      const h = document.documentElement.scrollHeight;
      for (let y = 0; y <= h; y += 600) { window.scrollTo(0, y); await new Promise(r2 => setTimeout(r2, 40)); }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(650);
    /* rules dialogs fade in on mount and reveal cards slide up on entry, and
       an element measured MID animation reads at a fraction of its real
       opacity: the first full sweep reported rules text at 3.60 that a solo
       visit measured at 5.49. So every FINITE animation is waited out before
       anything is read. Infinite ones (pulses, marquees) do not settle by
       definition and are left to run. */
    await page.evaluate(async () => {
      const finite = document.getAnimations().filter(a => {
        const t = a.effect && a.effect.getTiming ? a.effect.getTiming() : null;
        return t && t.iterations !== Infinity;
      });
      await Promise.race([
        Promise.all(finite.map(a => a.finished.catch(() => {}))),
        new Promise(r2 => setTimeout(r2, 2500)),
      ]);
    });
    await page.waitForTimeout(120);
    r = await page.evaluate(() => {
      /* the whole measurement bails out with what it has rather than spin:
         a runaway page must cost seconds, not the harness */
      const deadline = Date.now() + 15000;
      const cnv = document.createElement('canvas').getContext('2d');
      const parse = str => {
        cnv.fillStyle = '#000'; cnv.fillStyle = str;
        const v = cnv.fillStyle;
        if (v.startsWith('#')) return [parseInt(v.slice(1, 3), 16), parseInt(v.slice(3, 5), 16), parseInt(v.slice(5, 7), 16), 1];
        const m = v.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
        return m ? [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]] : [0, 0, 0, 1];
      };
      const lum = ([r2, g, b]) => {
        const f = v => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
        return 0.2126 * f(r2) + 0.7152 * f(g) + 0.0722 * f(b);
      };
      const ratio = (a, b) => { const la = lum(a), lb = lum(b); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05); };
      const over = (top, under) => {
        const a = top[3];
        return [top[0] * a + under[0] * (1 - a), top[1] * a + under[1] * (1 - a), top[2] * a + under[2] * (1 - a), 1];
      };
      const gradientStops = img => {
        const out = [];
        for (const m of img.matchAll(/(rgba?\([^)]*\)|#[0-9a-fA-F]{3,8}|hsla?\([^)]*\))/g)) out.push(parse(m[1]));
        return out;
      };

      /* the surface behind a text run: composite fills upward until one is
         opaque, STARTING WITH THE ELEMENT ITSELF, because a button's own
         bg-primary sits under its own words. Missing that one step made the
         first run of this harness report the primary button as near black
         on near black, which is the ink measured against the wrong wall. A
         gradient forks the stack into one branch per stop; worst branch
         wins later. Returns null when a photo or an unparsable background
         makes the answer unknowable. */
      const surfacesBehind = el => {
        let stacks = [[]];
        let node = el;
        let steps = 0;
        while (node && steps < 60) {
          steps += 1;
          const cs = getComputedStyle(node);
          const bi = cs.backgroundImage;
          if (bi && bi !== 'none') {
            if (bi.includes('url(')) return null;
            const stops = gradientStops(bi);
            if (!stops.length) return null;
            stacks = stacks.flatMap(st => stops.map(s => [...st, s]));
            /* two stacked gradients square the branch count and a page that
               layers several froze the first full run of this harness for
               eleven minutes. Twelve branches keep the worst-stop property
               on any sane page without letting the walk go combinatorial. */
            if (stacks.length > 12) stacks = stacks.slice(0, 12);
            if (stops.every(s => s[3] >= 1)) break;
          }
          const bc = parse(cs.backgroundColor);
          if (bc[3] > 0) {
            for (const st of stacks) st.push(bc);
            if (bc[3] >= 1) break;
          }
          node = node.parentElement;
        }
        const base = parse(getComputedStyle(document.body).backgroundColor);
        const solidBase = base[3] >= 1 ? base : [10, 12, 20, 1];
        return stacks.map(st => {
          let acc = solidBase;
          for (let i = st.length - 1; i >= 0; i--) acc = over(st[i], acc);
          return acc;
        });
      };

      const bad = [];
      const noName = [];
      const noLabel = [];
      let gradSkipped = 0;

      const skipEl = el => {
        if (el.closest('[aria-hidden="true"]')) return true;
        if (el.closest('.dukb-skip-link')) return true;
        if (el.closest('[disabled]')) return true;
        return false;
      };

      /* every element that directly holds a text node */
      let timedOut = false;
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const seen = new Set();
      while (walker.nextNode()) {
        if (Date.now() > deadline) { timedOut = true; break; }
        const t = walker.currentNode;
        const el = t.parentElement;
        if (!el || seen.has(el)) continue;
        seen.add(el);
        const txt = (t.textContent || '').trim();
        if (txt.length < 2) continue;
        if (skipEl(el)) continue;
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') continue;
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        /* cumulative opacity: a wrapper at opacity .5 halves the ink */
        let op = 1, n = el, hops = 0;
        while (n && hops < 60) { op *= parseFloat(getComputedStyle(n).opacity || '1'); n = n.parentElement; hops += 1; }
        if (op < 0.1) continue;

        const surfaces = surfacesBehind(el);
        if (!surfaces) { gradSkipped += 1; continue; }

        const size = parseFloat(cs.fontSize);
        const weight = parseInt(cs.fontWeight, 10) || 400;
        const bar = size >= 24 || (size >= 18.66 && weight >= 700) ? 3.0 : 4.5;

        /* gradient ink (bg-clip-text) reads its own stops as the ink */
        let inks;
        const fill = cs.webkitTextFillColor ? parse(cs.webkitTextFillColor) : parse(cs.color);
        if (fill[3] === 0 && (cs.webkitBackgroundClip === 'text' || cs.backgroundClip === 'text')) {
          const stops = cs.backgroundImage && cs.backgroundImage !== 'none' ? gradientStops(cs.backgroundImage) : [];
          if (!stops.length) { gradSkipped += 1; continue; }
          inks = stops;
        } else {
          inks = [fill];
        }

        let worst = Infinity, worstPair = '';
        for (const surface of surfaces) {
          for (const inkRaw of inks) {
            const ink = over([inkRaw[0], inkRaw[1], inkRaw[2], (inkRaw[3] ?? 1) * op], surface);
            const c = ratio(ink, surface);
            if (c < worst) { worst = c; worstPair = `${Math.round(ink[0])},${Math.round(ink[1])},${Math.round(ink[2])} on ${Math.round(surface[0])},${Math.round(surface[1])},${Math.round(surface[2])}`; }
          }
        }
        if (worst < bar) {
          bad.push(`"${txt.slice(0, 26)}" ${worst.toFixed(2)} (needs ${bar}) [${worstPair}]`);
        }
      }

      /* section 3 in the same pass: names on controls, labels on fields */
      const nameOf = el => {
        if ((el.getAttribute('aria-label') || '').trim()) return true;
        const lb = el.getAttribute('aria-labelledby');
        if (lb && lb.split(/\s+/).some(id => (document.getElementById(id)?.textContent || '').trim())) return true;
        if ((el.getAttribute('title') || '').trim()) return true;
        if ((el.textContent || '').trim()) return true;
        if (el.querySelector('img[alt]:not([alt=""])')) return true;
        return false;
      };
      for (const el of document.querySelectorAll('button, a[href], [role="button"]')) {
        if (skipEl(el)) continue;
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') continue;
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        if (!nameOf(el)) noName.push(`${el.tagName.toLowerCase()}.${(el.className || '').toString().split(' ').slice(0, 2).join('.')}`);
      }
      for (const el of document.querySelectorAll('input:not([type="hidden"]), select, textarea')) {
        if (skipEl(el)) continue;
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') continue;
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        const wired = el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
        if (!wired && !nameOf(el) && !el.closest('label')) noLabel.push(`${el.tagName.toLowerCase()}[type=${el.getAttribute('type') || 'text'}]`);
      }
      return { bad, noName, noLabel, gradSkipped, timedOut };
    });
  } catch (e) {
    fail(`${route}: would not load (${String(e).split('\n')[0].slice(0, 90)})`);
    continue;
  }
  routesChecked += 1;
  gradSkips += r.gradSkipped;
  if (r.timedOut) fail(`${route}: measurement hit its 15s deadline and bailed with partial coverage`);
  if (process.env.VERBOSE === '1') console.log(`   . ${route}`);
  if (r.bad.length) {
    unreadable += r.bad.length;
    fail(`${route}: ${r.bad.length} unreadable run${r.bad.length === 1 ? '' : 's'}: ${r.bad.slice(0, 3).join(' | ')}`);
  }
  if (r.noName.length) {
    unnamed += r.noName.length;
    fail(`${route}: ${r.noName.length} control${r.noName.length === 1 ? '' : 's'} with no accessible name: ${r.noName.slice(0, 3).join(', ')}`);
  }
  if (r.noLabel.length) {
    unlabelled += r.noLabel.length;
    fail(`${route}: ${r.noLabel.length} field${r.noLabel.length === 1 ? '' : 's'} with nothing naming them: ${r.noLabel.slice(0, 3).join(', ')}`);
  }
}

console.log(`   ${routesChecked} routes measured: ${unreadable} unreadable runs, ${unnamed} unnamed controls, ${unlabelled} unlabelled fields`);
if (gradSkips) console.log(`   ${gradSkips} runs skipped as unknowable (photo or unparsable background), said out loud rather than counted as covered`);

/* --------------------------------------------------------------- section 2 */

console.log('\nSection 2: keyboard walk on the home page');
const MIN_STOPS = 15;
try {
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(600);

  /* the skip link must exist, be first, sit off screen, and point somewhere
     real */
  const skipInfo = await page.evaluate(() => {
    const a = document.querySelector('.dukb-skip-link');
    if (!a) return null;
    const r = a.getBoundingClientRect();
    return { href: a.getAttribute('href'), offY: r.top, targetExists: !!document.querySelector('#dukb-main') };
  });
  if (!skipInfo) fail('home: no skip link in the tree');
  else {
    if (skipInfo.href !== '#dukb-main') fail(`home: skip link points at ${skipInfo.href}, not #dukb-main`);
    if (!skipInfo.targetExists) fail('home: #dukb-main does not exist on the home page');
    if (skipInfo.offY >= 0) fail(`home: skip link is visible before focus (top ${Math.round(skipInfo.offY)}px)`);
  }

  let ringless = 0, stops = 0, firstIsSkip = false;
  const seenStops = new Set();
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Tab');
    /* the ring paints after the focus event settles, and cards here carry
       transitions; 140ms is measured slack, not a guess */
    await page.waitForTimeout(140);
    const info = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const cs = getComputedStyle(el);
      const ring = (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 1)
        || (cs.boxShadow && cs.boxShadow !== 'none' && /(\d+(\.\d+)?px\s+){2,}/.test(cs.boxShadow));
      const key = el.tagName + '|' + (el.textContent || '').slice(0, 30) + '|' + (el.getAttribute('href') || '');
      return { ring, key, isSkip: el.classList.contains('dukb-skip-link'), tag: el.tagName.toLowerCase(), label: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 30) };
    });
    if (!info) break;
    if (seenStops.has(info.key)) break;
    seenStops.add(info.key);
    stops += 1;
    if (stops === 1) firstIsSkip = info.isSkip;
    if (!info.ring) {
      ringless += 1;
      if (ringless <= 5) fail(`home: tab stop ${stops} (${info.tag} "${info.label}") draws no focus ring`);
    }
  }
  if (!firstIsSkip) fail('home: the first tab stop is not the skip link');
  if (stops < MIN_STOPS) fail(`home: only ${stops} tab stops walked, expected at least ${MIN_STOPS}; the walk broke, not the page`);
  console.log(`   ${stops} tab stops walked, ${ringless} without a ring, skip link ${firstIsSkip ? 'first' : 'NOT first'}`);
} catch (e) {
  fail(`keyboard walk: ${String(e).split('\n')[0].slice(0, 120)}`);
}

await ctx.close();
await browser.close();

console.log('');
if (failures > 0) {
  console.error(`sweepContrast: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('sweepContrast: green. Every word on the site clears its contrast bar, the keyboard works, and every control has a name.');
