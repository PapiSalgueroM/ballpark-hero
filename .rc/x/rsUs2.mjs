/* Reviewer walk 2 (screens, Release AX): where the screen is after "Push for more", offer by offer, with the least scroll a
   player needs to reach the button ("edge": the button 24 px above the bottom of the window) and with the button centred,
   on the HEAD build (BASE) and on a build of origin/release-aw-int (BASE2DIST, served here on 4174) for comparison.
   Also: the comparison with a one year offer (the NFL faTalk save) and the extension push at the least scroll.
   Sent as .rc/x/rsUs2.mjs. Blocks supabase.co. Presses are DOM clicks after a focus: nothing here scrolls but the walk says so. */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const HEAD = process.env.BASE || 'http://localhost:4173';
const SPORT = process.env.SPORT || 'nfl';
const OUT = process.env.RC_OUT || '.tmp-fx/rs-out';
fs.mkdirSync(OUT, { recursive: true });
const ROUTE = `/${SPORT}-my-career`, KEY = `${SPORT}-my-career-save-v1`;
const fixture = JSON.parse(fs.readFileSync('scripts/data/usBoardFixture.json', 'utf8')).sports[SPORT].saves;
let server = null; const BUILDS = [['head', HEAD]];
if (process.env.BASE2DIST && fs.existsSync(path.join(process.env.BASE2DIST, 'index.html'))) {
  server = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', process.env.BASE2DIST, String(process.env.BASE2PORT || 4174)], { stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 2500)); BUILDS.push(['base', 'http://localhost:' + (process.env.BASE2PORT || 4174)]);
} else console.log('NO BASE BUILD at ' + process.env.BASE2DIST + ': head only');
const log = [];
const say = (tag, obj) => { console.log(`${tag} ${JSON.stringify(obj)}`.slice(0, 1500)); log.push({ tag, obj }); };
const browser = await pw.chromium.launch({ args: ['--no-sandbox', '--no-proxy-server'] });

async function open(url, w, h, raw) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: 'no-preference', deviceScaleFactor: 1 });
  await ctx.addInitScript(([k, v, route]) => {
    let a = 20261011;
    Math.random = () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    if (!sessionStorage.getItem('rs-seeded')) { sessionStorage.setItem('rs-seeded', '1'); localStorage.setItem('cookie-consent', 'essential'); localStorage.setItem(k, v); localStorage.setItem('rules-gate-seen:' + route, '1'); for (const s of ['nba', 'nfl', 'mlb', 'nhl']) localStorage.setItem(`seasonCentre:help:${s}`, '1'); }
  }, [KEY, raw, ROUTE]);
  await ctx.route(/supabase\.co/, r => r.abort());
  const page = await ctx.newPage();
  await page.goto(`${url}${ROUTE}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  return { ctx, page };
}
const shot = async (page, name) => { try { await page.screenshot({ path: path.join(OUT, name + '.jpg'), type: 'jpeg', quality: 55 }); } catch { /* a picture less */ } };
const pressPlay = page => page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /^Play the [0-9]+ season$/.test((x.textContent || '').trim())); if (!b) return false; b.focus({ preventScroll: true }); b.click(); return true; });
/* how much of an element is inside the window, and where */
const seen = (page, sel) => page.evaluate(q => { const e = document.querySelector(q); if (!e) return null; const b = e.getBoundingClientRect(); const vis = Math.max(0, Math.min(b.bottom, innerHeight) - Math.max(b.top, 0)); return { top: Math.round(b.top), h: Math.round(b.height), shown: b.height ? Math.round(100 * vis / b.height) : 0 }; }, sel);

async function pushFrom(build, url, w, h, i, place, pictures) {
  const tag = `${SPORT} ${build} ${w}x${h} offer ${i} ${place}:`; const id = `us2-${SPORT}-${w}-${build}-${place}-o${i}`;
  const { ctx, page } = await open(url, w, h, fixture.fa);
  try {
    await page.getByRole('button', { name: /^Play the [0-9]+ season$/ }).waitFor({ state: 'visible', timeout: 30000 }); await page.waitForTimeout(500);
    await pressPlay(page); await page.locator('[data-fa-window]').waitFor({ state: 'visible', timeout: 20000 }); await page.waitForTimeout(1600);
    const placed = await page.evaluate(([n, how]) => {
      const card = document.querySelector(`[data-fa-offer="${n}"]`); if (!card) return null;
      const b = [...card.querySelectorAll('button')].find(x => /Push for more/.test(x.textContent || '')); if (!b || b.disabled) return null;
      b.setAttribute('data-rs-push', '1');
      const r = b.getBoundingClientRect();
      if (how === 'centre') window.scrollTo(0, Math.max(0, scrollY + r.top + r.height / 2 - innerHeight / 2));
      else if (r.bottom > innerHeight - 24) window.scrollTo(0, scrollY + r.bottom - (innerHeight - 24));
      return true;
    }, [i, place]);
    if (!placed) { say(tag, 'no push button on this offer'); await ctx.close(); return; }
    await page.waitForTimeout(250);
    const y1 = await page.evaluate(() => Math.round(scrollY)); const btn = await seen(page, '[data-rs-push]'); const cardBefore = await seen(page, `[data-fa-offer="${i}"]`);
    await page.evaluate(() => { const b = document.querySelector('[data-rs-push]'); b.focus({ preventScroll: true }); b.click(); });
    await page.waitForTimeout(700);
    const wheel = await seen(page, '[data-market-wheel]');
    const row = { y1, buttonAt: btn, cardBefore, yAfterPush: await page.evaluate(() => Math.round(scrollY)) };
    if (wheel) {
      row.wheel = wheel; row.wheelHeading = await seen(page, '[data-market-wheel] h2'); row.spin = await seen(page, '[data-market-spin]');
      if (pictures) await shot(page, id + '-after-push');
      await page.evaluate(() => document.querySelector('[data-market-skip]').click()); await page.waitForTimeout(300);
      row.resultLine = await seen(page, '[data-market-wheel-outcome]'); row.continue = await seen(page, '[data-market-continue]');
      await page.evaluate(() => document.querySelector('[data-market-continue]').click()); await page.waitForTimeout(900);
    } else if (pictures) await shot(page, id + '-after-push');
    row.yEnd = await page.evaluate(() => Math.round(scrollY)); row.cardAfter = await seen(page, `[data-fa-offer="${i}"]`); row.receipt = await seen(page, '[data-fa-result]');
    row.receiptWords = await page.evaluate(() => (document.querySelector('[data-fa-result]') || {}).textContent || null);
    if (pictures) await shot(page, id + '-end');
    say(tag, row);
  } catch (e) { say(tag, 'CRASH ' + String(e.stack || e).slice(0, 300)); }
  await ctx.close();
}

const offers = JSON.parse(fixture.faTalk || fixture.fa);
for (const [build, url] of BUILDS) for (const [w, h] of [[320, 568], [390, 844], [1280, 900]]) for (const i of [0, 1, 2, 3]) for (const place of ['edge', 'centre']) await pushFrom(build, url, w, h, i, place, w !== 1280 && i >= 2);

/* the comparison with a one year offer: the saved window of the recording, its last offer cut to one year when none is */
{
  const s = JSON.parse(fixture.faTalk); const list = s.contractTalk.window.offers;
  if (!list.some(o => o.years === 1)) list[list.length - 1].years = 1;
  for (const [w, h] of [[320, 568], [390, 844]]) {
    const { ctx, page } = await open(HEAD, w, h, JSON.stringify(s));
    try {
      await page.locator('[data-fa-window]').waitFor({ state: 'visible', timeout: 30000 }); await page.waitForTimeout(1500);
      const panel = await page.evaluate(() => [...document.querySelectorAll('[data-fa-offer]')].map(e => (e.textContent || '').replace(/\s+/g, ' ').slice(0, 70)));
      await page.evaluate(() => document.querySelector('[data-market-compare-open]').click()); await page.locator('[data-market-compare]').waitFor({ state: 'visible', timeout: 10000 }); await page.waitForTimeout(300);
      say(`${SPORT} head ${w}x${h} compare, a one year offer:`, { edited: !JSON.parse(fixture.faTalk).contractTalk.window.offers.some(o => o.years === 1), panel, rows: await page.evaluate(() => [...document.querySelectorAll('[data-market-compared-offer]')].map(e => (e.textContent || '').replace(/\s+/g, ' '))) });
      await shot(page, `us2-${SPORT}-${w}-compare-one-year`);
    } catch (e) { say(`${SPORT} compare one year`, 'CRASH ' + String(e).slice(0, 200)); }
    await ctx.close();
  }
}
await browser.close(); if (server) server.kill();
fs.writeFileSync(path.join(OUT, `us2-${SPORT}-log.json`), JSON.stringify(log));
console.log(`rsUs2 ${SPORT}: done, ${log.length} lines`);
