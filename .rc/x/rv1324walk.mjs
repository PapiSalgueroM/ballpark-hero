// Reviewer walk for Round 1324 (runs on the runner under #!serve and #!playwright; BASE from the env).
// No screen changed this round and no route imports the deck engine, so the walk proves what a player meets is
// intact: two GM desks (the seats W1b would bind first) at 390x844 and 1280x900, reduced motion on and off, pick a
// franchise, open the play box, play one week; every JS file the page loads is scanned for the engine's own strings.
import fs from 'node:fs';
import path from 'node:path';
import pw from '../../scripts/lib/playwrightLoader.mjs';
const { chromium } = pw;
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || '/tmp/rvwalk';
fs.mkdirSync(OUT, { recursive: true });
const ENGINE_STRINGS = ['dealt with it', 'pack moves', 'is not a declared fact', 'expires with no option'];
const DESKS = [
  { route: '/front-office', tag: 'nfl', play: 'This week', btn: /Play Week|Play the final week|Bye week/ },
  { route: '/nba-front-office', tag: 'nba', play: 'Play', btn: /Play Round|Final stretch/ },
];
let fails = 0;
const say = (ok, what) => { console.log(`${ok ? '  PASS' : '  FAIL'}  ${what}`); if (!ok) fails++; };
const browser = await chromium.launch();
const engineHits = new Set();
let scanned = 0;
let known = 0;
for (const desk of DESKS) for (const [vw, vh] of [[390, 844], [1280, 900]]) for (const motion of ['reduce', 'no-preference']) {
  const tag = `${desk.tag}-${vw}-${motion === 'reduce' ? 'rm' : 'mo'}`;
  const ctx = await browser.newContext({ viewport: { width: vw, height: vh }, reducedMotion: motion });
  const page = await ctx.newPage();
  await page.route(/supabase\.co/, r => r.abort());
  const errors = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 160)));
  page.on('response', async res => {
    const u = res.url();
    if (!u.endsWith('.js')) return;
    try { const t = await res.text(); scanned++; if (t.includes('Essential only')) known++; for (const s of ENGINE_STRINGS) if (t.includes(s)) engineHits.add(`${path.basename(u)}: ${s}`); } catch { /* gone */ }
  });
  await page.goto(`${BASE}${desk.route}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const consent = page.locator('button:has-text("Essential only")');
  if (await consent.count()) { await consent.first().click().catch(() => {}); await page.waitForTimeout(300); }
  await page.screenshot({ path: path.join(OUT, `${tag}-0-pick.png`) });
  await page.locator('.grid button').first().click().catch(() => {});
  await page.waitForTimeout(900);
  const tiles = await page.locator('button:has(div.uppercase)').count();
  say(tiles >= 4, `${tag}: the hub shows its boxes (${tiles})`);
  await page.screenshot({ path: path.join(OUT, `${tag}-1-hub.png`) });
  const playTile = page.locator('button:has(div.uppercase)').filter({ hasText: new RegExp(desk.play, 'i') }).first();
  if (await playTile.count()) { await playTile.click(); await page.waitForTimeout(500); }
  const btn = page.locator('button').filter({ hasText: desk.btn }).first();
  const hasBtn = (await btn.count()) > 0;
  say(hasBtn, `${tag}: the play box reaches its play button`);
  if (hasBtn) { await btn.click().catch(() => {}); await page.waitForTimeout(1500); }
  await page.screenshot({ path: path.join(OUT, `${tag}-2-played.png`) });
  const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  say(over <= 2, `${tag}: no horizontal overflow (${over}px)`);
  say(errors.length === 0, `${tag}: no page errors${errors.length ? `: ${errors.join(' | ')}` : ''}`);
  await ctx.close();
}
await browser.close();
say(scanned > 10 && known > 0, `the scan read ${scanned} JS responses and found the consent banner's own string in ${known} (the scan works)`);
say(engineHits.size === 0, `no JS file any walked page loaded carries the deck engine's strings${engineHits.size ? `: ${[...engineHits].join(', ')}` : ''}`);
console.log(fails ? `rv1324walk: ${fails} failure(s)` : 'rv1324walk: green');
process.exit(fails ? 1 : 0);
