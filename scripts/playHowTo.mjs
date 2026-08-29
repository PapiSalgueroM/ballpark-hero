/**
 * ROUND 321 BROWSER HARNESS: every game offers its rules from the screen the
 * player actually sees.
 *
 * The house rule, held since the early rounds and re-asked in the owner's
 * 2026-08-28 review ("the how-to-play popup audit across every game"): every
 * game shows instructions, rules and a worked example before play,
 * re-openable from a "?" button. Round 321 mounted a standard GameHelp "?"
 * in GameShell, but a third of the site draws its own layout, and a source
 * grep cannot judge what a visitor can actually see: four different rounds
 * of this repo's history say a check that reads code finds the shape it was
 * told about and nothing else. So this one asks the rendered page.
 *
 * WHAT COUNTS as a rules affordance, most specific first:
 *   1. a visible control whose aria-label or text names the rules ("How to
 *      play", "Rules", "Instructions");
 *   2. a visible button whose entire text is a question mark;
 *   3. a lucide help-circle icon inside a visible button;
 *   4. a visible heading or section that already SHOWS the rules pre-play
 *      (a "How to play" heading on a setup screen counts, the point is the
 *      player can read the rules before their first move).
 *
 * The database is aborted (no egress in the sandbox), which is fine on
 * purpose: the affordance must live at the shell or setup layer, not behind
 * a data load. A page that only explains itself after the data arrives has
 * the bug this harness exists to catch.
 *
 * NEGATIVE CONTROL: HOWTO_CONTROL=blind swaps the matcher for one that can
 * match nothing and every route must then flag, proving the matcher is what
 * passes pages rather than the harness structure.
 *
 * Run: BASE=http://127.0.0.1:4173 node scripts/playHowTo.mjs
 *      ONLY=/footle,/world-xi scopes it while iterating.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pw from './lib/playwrightLoader.mjs';

const { chromium } = pw;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173';
const CONTROL = process.env.HOWTO_CONTROL || '';
if (CONTROL && CONTROL !== 'blind') { console.error(`HOWTO_CONTROL=${CONTROL} is not a control this harness knows`); process.exit(1); }

/* The game list comes from the registry file itself, uncommented rows only,
   so a retired game cannot keep a dead entry alive here. */
const reg = fs.readFileSync(path.join(ROOT, 'src/data/gameRegistry.ts'), 'utf8');
const ALL_ROUTES = [...reg.matchAll(/^\s*\{ path:\s*'([^']+)'/gm)].map(m => m[1]);
const ONLY = process.env.ONLY ? process.env.ONLY.split(',').map(s => s.trim()) : null;
const routes = ONLY ? ALL_ROUTES.filter(r => ONLY.includes(r)) : ALL_ROUTES;
if (routes.length === 0) { console.error('no routes matched'); process.exit(1); }

let failures = 0;
const misses = [];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
await page.route('**://*.supabase.co/**', r => r.abort());

for (const route of routes) {
  let verdict = null;
  try {
    await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => (document.body?.innerText ?? '').trim().length > 80, { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1200);
    verdict = await page.evaluate((control) => {
      const visible = (el) => {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return false;
        const s = getComputedStyle(el);
        return s.display !== 'none' && s.visibility !== 'hidden';
      };
      if (control === 'blind') return null;
      const controls = [...document.querySelectorAll('button, a, [role="button"]')].filter(visible);
      for (const el of controls) {
        const label = (el.getAttribute('aria-label') || '').toLowerCase();
        const text = (el.textContent || '').trim().toLowerCase();
        if (/how to play|rules|instructions/.test(label) || /^(how to play|rules|instructions)\b/.test(text)) return 'labelled control';
        if (text === '?') return 'question mark button';
        if (el.querySelector('svg.lucide-help-circle, svg.lucide-circle-help')) return 'help icon button';
      }
      for (const el of [...document.querySelectorAll('h1,h2,h3,h4,p,li,span,div')]) {
        if (!visible(el)) continue;
        const t = (el.textContent || '').trim().toLowerCase();
        if (t.length < 120 && /^(how to play|how it works|the rules)\b/.test(t)) return 'rules shown pre-play';
      }
      return null;
    }, CONTROL);
  } catch (e) {
    verdict = null;
  }
  if (verdict) {
    console.log(`  PASS  ${route} (${verdict})`);
  } else {
    failures += 1;
    misses.push(route);
    console.log(`  FAIL  ${route}: no rules affordance a visitor can see`);
  }
}

await browser.close();

console.log('');
console.log(`${routes.length} game routes checked, ${routes.length - failures} carry a visible rules affordance`);
if (CONTROL === 'blind') {
  if (failures === routes.length) { console.log('playHowTo control: green. Blinded, every route flags, so the matcher is what passes pages.'); process.exit(0); }
  console.error(`playHowTo control: RED. ${routes.length - failures} route(s) still passed with the matcher blinded.`);
  process.exit(1);
}
if (failures > 0) {
  console.error(`playHowTo: ${failures} game(s) offer no visible way to learn the rules: ${misses.join(', ')}`);
  process.exit(1);
}
console.log('playHowTo: green. Every game can teach a stranger before it tests them.');
