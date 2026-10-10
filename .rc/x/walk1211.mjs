/* Reviewer's walk for Round 1211 (never committed). The round adds two data
   ledgers nothing imports, so the walk proves the two hubs they are FOR still
   behave as on the base: MLB My Career and NHL My Career open, draft a
   player, play a season in one press, keep the save through a reload, show no
   week by week entry (neither sport is bound yet), and load no chunk that
   holds a sentence of either ledger. 390x844 and 1280x900, reduced motion on
   and off. Screenshots go to $RC_OUT. The live database is blocked. */
import fs from 'node:fs';
import path from 'node:path';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const { chromium } = pw;
const BASE = process.env.BASE ?? 'http://localhost:4173';
const OUT = process.env.RC_OUT ?? '.';
fs.mkdirSync(OUT, { recursive: true });

const GAMES = [
  { slug: 'mlb', path: '/mlb-my-career', key: 'mlb-my-career-save-v1' },
  { slug: 'nhl', path: '/nhl-my-career', key: 'nhl-my-career-save-v1' },
];
const SIZES = [{ w: 390, h: 844 }, { w: 1280, h: 900 }];
/* Sentences only the two ledgers hold. */
const MARKS = ['one short of the 162 on the schedule', 'clubs finished on 68 to 71 games', 'played a 163rd game', 'has no single length'];

let bad = 0; let good = 0;
const say = (ok, what) => { if (ok) good++; else bad++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); };

const browser = await chromium.launch();
for (const game of GAMES) for (const size of SIZES) for (const rm of [false, true]) {
  const tag = `${game.slug}-${size.w}-rm${rm ? 1 : 0}`;
  const ctx = await browser.newContext({ viewport: { width: size.w, height: size.h }, reducedMotion: rm ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  await page.route(/supabase\.co/, r => r.abort());
  const errors = []; const scripts = []; let blocked = 0;
  page.on('pageerror', e => errors.push(String(e)));
  page.on('requestfailed', r => { if (/supabase\.co/.test(r.url())) blocked++; });
  page.on('response', async res => {
    const url = res.url();
    if (!/\.js(\?|$)/.test(url)) return;
    try { scripts.push({ url, text: await res.text() }); } catch { /* a body that could not be read */ }
  });
  await page.addInitScript(route => { localStorage.setItem(`rules-gate-seen:${route}`, '1'); localStorage.setItem('cookie-consent', 'essential'); }, game.path);
  await page.goto(`${BASE}${game.path}`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1100);
  const consent = page.locator('button:has-text("Essential only")');
  if (await consent.count()) { await consent.first().click().catch(() => {}); await page.waitForTimeout(300); }
  await page.locator('input[placeholder*="name"]').first().fill('Probe Player');
  await page.locator('button:has-text("Enter the draft")').click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(OUT, `${tag}-hub.png`) });

  const play = page.locator('button', { hasText: /Play the \d{4} season/ });
  say(await play.count() === 1, `${tag}: the hub shows one "Play the season" button (saw ${await play.count()})`);
  say(await page.locator('[data-week-by-week]').count() === 0 && await page.locator('[data-season-centre-entry]').count() === 0, `${tag}: no week by week entry on a sport that is not bound`);
  const hubText = await page.locator('body').innerText();
  say(!/week by week/i.test(hubText), `${tag}: the hub does not say "week by week"`);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  say(overflow <= 2, `${tag}: the hub fits the width (${overflow}px of overflow)`);

  /* One press plays the season. An event card may sit in front: answer its first option and go on. */
  let seasons = 0;
  for (let i = 0; i < 6 && seasons === 0; i++) {
    if (await play.count() && await play.first().isVisible().catch(() => false)) await play.first().click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(1500);
    seasons = await page.evaluate(k => { try { return JSON.parse(localStorage.getItem(k) ?? '{}').c?.seasons?.length ?? 0; } catch { return -1; } }, game.key);
  }
  say(seasons >= 1, `${tag}: one press put a season on the save (${seasons} season(s))`);
  await page.screenshot({ path: path.join(OUT, `${tag}-season.png`) });
  const line = await page.evaluate(k => { try { const c = JSON.parse(localStorage.getItem(k)).c; const s = c.seasons[c.seasons.length - 1]; return { year: s.year, team: s.team, games: s.games, result: s.teamResult ?? s.result, pos: c.pos }; } catch { return null; } }, game.key);
  console.log(`     ${tag}: the season line reads ${JSON.stringify(line)}`);

  /* The save is the same string after a reload, and the hub comes back. */
  const before = await page.evaluate(k => localStorage.getItem(k), game.key);
  await page.reload({ waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1300);
  const after = await page.evaluate(k => localStorage.getItem(k), game.key);
  say(typeof before === 'string' && before === after, `${tag}: the save is byte equal after a reload (${before ? before.length : 0} characters)`);
  say(await page.locator('button', { hasText: /Play the \d{4} season/ }).count() === 1, `${tag}: the hub is back after the reload`);

  const hit = scripts.filter(s => MARKS.some(m => s.text.includes(m))).map(s => s.url.split('/').pop());
  say(scripts.length > 3 && hit.length === 0, `${tag}: none of the ${scripts.length} scripts the page loaded holds a ledger sentence${hit.length ? ` (found in ${hit.join(', ')})` : ''}`);
  const real = errors.filter(e => !/supabase|Failed to fetch|CORS/i.test(e));
  say(real.length === 0, `${tag}: no page error${real.length ? `: ${real[0].slice(0, 200)}` : ''}`);
  console.log(`     ${tag}: ${blocked} request(s) to the live database were refused by the walk`);
  await ctx.close();
}
await browser.close();
console.log(bad ? `walk1211: RED. ${bad} failed, ${good} passed.` : `walk1211: green. ${good} checks passed on 2 hubs at 2 widths with reduced motion on and off.`);
process.exit(bad ? 1 : 0);
