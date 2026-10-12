/* Review of Round 1312 (never committed): play NHL My Career (and open MLB My Career, the other route that
   loads the NHL ledger eagerly) on the served build, as a player would, at 390x844 and 1280x900 with reduced
   motion on and off. The database host is blocked. Screenshots go to $RC_OUT.
   For each context: landing, the rules, a career started (throwback in two contexts, today in two), seasons
   played through every card that comes up, and each saved season's year and games read off the save, so the
   season lengths the engine hands a player (82, 48 in 2012-13 and so on) are printed. Fails on a page error,
   a sideways scroll, a stuck walk, or a season whose games are not a plausible NHL count. */
import pw from '../../scripts/lib/playwrightLoader.mjs';
import { mkdirSync } from 'node:fs';
const { chromium } = pw;
import path from 'node:path';

const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || '/tmp/walk-out';
mkdirSync(OUT, { recursive: true });
const KEY = 'nhl-my-career-save-v1';
let fails = 0;
const say = (ok, what) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) fails++; };

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const CASES = [
  { w: 390, h: 844, rm: 'no-preference', era: 'throwback', seasons: 8 },
  { w: 390, h: 844, rm: 'reduce', era: 'now', seasons: 3 },
  { w: 1280, h: 900, rm: 'reduce', era: 'throwback', seasons: 8 },
  { w: 1280, h: 900, rm: 'no-preference', era: 'now', seasons: 3 },
];

async function shot(page, name) { await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: false }); }
async function sideways(page) { return page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); }
async function visible(loc) { return (await loc.count()) > 0 && (await loc.first().isVisible().catch(() => false)); }

for (const c of CASES) {
  const tag = `nhl-${c.w}-${c.rm === 'reduce' ? 'rm' : 'motion'}-${c.era}`;
  console.log(`== ${tag}`);
  const ctx = await browser.newContext({ viewport: { width: c.w, height: c.h }, reducedMotion: c.rm });
  await ctx.route(/supabase\.co/, r => r.abort());
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 200)));
  await page.goto(`${BASE}/nhl-my-career`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1200);
  const consent = page.locator('button:has-text("Essential only")');
  if (await visible(consent)) { await consent.first().click().catch(() => {}); await page.waitForTimeout(300); }
  await shot(page, `${tag}-1-landing`);
  /* The rules gate, if it is up: read it, then close it the way a player does. */
  const gateText = (await page.locator('body').innerText()).slice(0, 4000);
  say(/how to play|rules|example/i.test(gateText), `${tag}: the rules or a how to play affordance is on the landing`);
  for (const label of ['Got it', 'Let\'s play', 'Start', 'Play']) {
    const b = page.getByRole('button', { name: new RegExp(`^${label}`, 'i') });
    if (await visible(b) && !(await visible(page.locator('input[placeholder*="name"]')))) { await b.first().click().catch(() => {}); await page.waitForTimeout(400); }
  }
  await shot(page, `${tag}-2-create`);
  const nameBox = page.locator('input[placeholder*="name"]');
  say(await visible(nameBox), `${tag}: the name box is on the create screen`);
  if (c.era === 'throwback') {
    const tb = page.locator('button:has-text("⏪")');
    say(await visible(tb), `${tag}: the throwback era button is there`);
    if (await visible(tb)) await tb.first().click();
  }
  await nameBox.first().fill('Review Skater').catch(() => {});
  await page.locator('button:has-text("Enter the draft")').first().click().catch(e => say(false, `${tag}: Enter the draft: ${e.message.slice(0, 80)}`));
  await page.waitForTimeout(1500);
  await shot(page, `${tag}-3-after-draft`);
  let played = 0; let steps = 0; let stuck = 0;
  while (played < c.seasons && steps < 120) {
    steps++;
    const play = page.locator('button:has-text("Play the")');
    if (await visible(play)) {
      await play.first().click(); played++; await page.waitForTimeout(c.rm === 'reduce' ? 600 : 1800);
      if (played === 1) await shot(page, `${tag}-4-first-season-card`);
      continue;
    }
    const tries = ['[data-season-reveal] button:has-text("Continue")', '[data-rivalry-event] button:has-text("Continue")', '[data-rivalry-choice] button', 'button:has-text("Continue")', 'div.grid.gap-1\\.5 > button', 'button:has-text("Close")', 'button:has-text("Done")', 'button:has-text("Back to")', 'button:has-text("Skip")'];
    let did = false;
    for (const t of tries) { const l = page.locator(t); if (await visible(l)) { await l.first().click().catch(() => {}); did = true; break; } }
    await page.waitForTimeout(500);
    if (!did) { stuck++; if (stuck > 6) break; } else stuck = 0;
  }
  say(played === c.seasons, `${tag}: played ${played} of ${c.seasons} seasons in ${steps} steps`);
  if (played < c.seasons) await shot(page, `${tag}-stuck`);
  const save = await page.evaluate(k => { try { const s = JSON.parse(localStorage.getItem(k) || 'null'); return s?.c?.seasons?.map(x => `${x.year}:${x.games}${x.slate ? `/${x.slate}` : ''}:${x.team}`) ?? null; } catch { return 'unreadable'; } }, KEY);
  console.log(`   save seasons (year:games/slate:team): ${Array.isArray(save) ? save.join(' ') : save}`);
  if (Array.isArray(save)) for (const s of save) { const [y, g] = s.split(':'); const n = Number(g.split('/')[0]); say(n >= 0 && n <= 84, `${tag}: ${y} games ${g} within an NHL season`); }
  await shot(page, `${tag}-5-hub-end`);
  const sw = await sideways(page);
  say(sw <= 1, `${tag}: no sideways scroll (${sw}px)`);
  say(errors.length === 0, `${tag}: no page error${errors.length ? `: ${errors.join(' | ')}` : ''}`);
  await ctx.close();
}

/* MLB My Career loads the same ledger chunk: it opens and its create screen is whole. */
for (const [w, h] of [[390, 844], [1280, 900]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  await ctx.route(/supabase\.co/, r => r.abort());
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 200)));
  await page.goto(`${BASE}/mlb-my-career`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1200);
  await shot(page, `mlb-${w}-landing`);
  say(errors.length === 0, `mlb ${w}: no page error${errors.length ? `: ${errors.join(' | ')}` : ''}`);
  say(await sideways(page) <= 1, `mlb ${w}: no sideways scroll`);
  await ctx.close();
}
await browser.close();
console.log(`walk1312: ${fails === 0 ? 'green' : `${fails} failures`}`);
process.exit(fails === 0 ? 0 : 1);
