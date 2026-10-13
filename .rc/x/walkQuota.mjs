/* QA hunt: what a front office does when the browser's storage is nearly full (other games' saves on the same site).
   node .rc/x/walkQuota.mjs nfl|nba  [headroom chars, default 900000] */
import { chromium, BASE, makeLog, shot, newPage, firstVisit, buttons, clickRule, mainText } from './gmlib.mjs';

const CFG = {
  nfl: { route: '/front-office', key: 'front-office-save-v1', play: /^Play Week \d+$/i, tile: /^this week/i },
  nba: { route: '/nba-front-office', key: 'nba-front-office-save-v1', play: /^Play Round \d+$/i, tile: /^play\b/i },
};
const sport = process.argv[2];
const cfg = CFG[sport];
const headroom = Number(process.argv[3] || 900000);
const size = { tag: 'q', width: 390, height: 844 };
const G = `${sport}-quota`;
const log = makeLog(G);
const browser = await chromium.launch();
const { ctx, page } = await newPage(browser, size, log);

const tileClick = async re => page.evaluate(src => {
  const re = new RegExp(src, 'i');
  const t = [...document.querySelectorAll('#dukb-main button')].find(b => b.querySelector('div.uppercase') && re.test(b.innerText.replace(/\s+/g, ' ').trim().replace(/^[^A-Za-z#]+/, '')));
  if (t) { t.click(); return true; }
  return false;
}, re.source);

try {
  await page.goto(`${BASE}${cfg.route}`, { waitUntil: 'domcontentloaded' });
  await firstVisit(page, sport, size, log);
  const quota = await page.evaluate(() => {
    let lo = 0; let hi = 20_000_000;
    while (hi - lo > 20000) {
      const mid = Math.floor((lo + hi) / 2);
      try { localStorage.setItem('qa-probe', 'x'.repeat(mid)); lo = mid; } catch { hi = mid; }
      localStorage.removeItem('qa-probe');
    }
    let used = 0;
    for (let i = 0; i < localStorage.length; i += 1) { const k = localStorage.key(i); used += k.length + (localStorage.getItem(k) || '').length; }
    return { freeChars: lo, usedChars: used };
  });
  log('quota', quota);
  const filler = Math.max(0, quota.freeChars - headroom);
  await page.evaluate(n => localStorage.setItem('qa-other-games', 'y'.repeat(n)), filler);
  log('filled', { filler, headroom });
  await page.locator('#dukb-main .grid button').first().click();
  await page.waitForTimeout(1500);
  await clickRule(page, [['press', /.+/, '[data-gm-press]']], log);
  const len0 = await page.evaluate(k => (localStorage.getItem(k) || '').length, cfg.key);
  log('started', { saveChars: len0, text: await mainText(page, 250) });
  await tileClick(cfg.tile);
  await page.waitForTimeout(600);
  let lastPressed = null;
  for (let w = 0; w < 9; w += 1) {
    await clickRule(page, [['press', /.+/, '[data-gm-press]']], log);
    const r = await clickRule(page, [['play', cfg.play]], log);
    if (!r) { log('noplay', { w, buttons: (await buttons(page)).map(b => b.t.slice(0, 30)).slice(0, 12) }); break; }
    lastPressed = r.text;
    await page.waitForTimeout(800);
    const len = await page.evaluate(k => (localStorage.getItem(k) || '').length, cfg.key);
    const warn = /storage|could not save|couldn't save|not saved|save failed|space/i.test(await mainText(page, 4000));
    log('press', { pressed: r.text, saveChars: len, warningOnScreen: warn });
  }
  const before = await mainText(page, 260);
  await shot(page, `${G}-before-reload`, { force: true });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  const after = await mainText(page, 260);
  await shot(page, `${G}-after-reload`, { force: true });
  log('reload', { lastPressed, before, after });
} catch (e) {
  log('EXCEPTION', { msg: String(e).slice(0, 300) });
}
await ctx.close();
await browser.close();
console.log('WALK FINISHED quota', sport);
