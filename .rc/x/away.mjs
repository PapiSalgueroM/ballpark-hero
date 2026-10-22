// Round 1536 fixer probe: Stadium Tycoon's "While you were away" box for a returning player who never answered the
// cookie banner, at 320x640, 390x844 and 1280x900, and once at 390 with the banner answered. Built on the run review's
// S3 scene. The database is aborted. Exit 1 when, with the box scrolled to its end, "Back to work" is not the element
// at its centre, any part of it sits under a pending banner, or the box runs under the banner or above the screen.
import fs from 'node:fs';
import path from 'node:path';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const { chromium } = pw;
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || '/tmp/away-out';
const TAG = process.env.AWAY_TAG || 'head';
fs.mkdirSync(OUT, { recursive: true });
const BANNER = '[role="region"][aria-label="Cookie choices"], [role="dialog"][aria-label="Cookie choices"]';
const NAME = 'While you were away';

async function settle(page) {
  await page.waitForFunction(() => (document.body?.innerText ?? '').trim().length > 80, null, { timeout: 15000 }).catch(() => {});
  await page.waitForSelector(BANNER, { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(1500);
}

function measure({ BANNER, NAME }) {
  const d = document.querySelector(`[aria-label="${NAME}"]`);
  const banner = [...document.querySelectorAll(BANNER)].find(b => b.getBoundingClientRect().height > 2) || null;
  const bb = banner && getComputedStyle(banner).position === 'fixed' ? banner.getBoundingClientRect() : null;
  if (!d) return { open: false, banner: bb ? Math.round(bb.top) : null };
  const top = Math.round(d.getBoundingClientRect().top);
  d.scrollTop = d.scrollHeight;
  const btn = [...d.querySelectorAll('button')].find(b => (b.textContent || '').trim() === 'Back to work');
  const b = btn.getBoundingClientRect();
  const hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
  const box = d.getBoundingClientRect();
  return { open: true, top, boxBottom: Math.round(box.bottom), scroll: `${d.clientHeight}/${d.scrollHeight}`,
    btn: [Math.round(b.top), Math.round(b.bottom)], at: !hit ? 'nothing' : btn.contains(hit) ? 'button' : banner && banner.contains(hit) ? 'BANNER' : hit.tagName,
    banner: bb ? Math.round(bb.top) : null, pending: !!document.body.dataset.consentPending, cx: Math.round(b.left + b.width / 2), cy: Math.round(b.top + b.height / 2) };
}

const browser = await chromium.launch();
const bad = [];
let seen = 0;
const scenes = [[320, 640, false], [390, 844, false], [1280, 900, false], [390, 844, true]];
for (const [w, h, answer] of scenes) {
  const k = `${TAG}-away-${w}${answer ? '-answered' : ''}`;
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  await page.route(/supabase\.co/, r => r.abort());
  try {
    await page.goto(`${BASE}/stadium-tycoon`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await settle(page);
    if (answer) { await page.locator(BANNER).locator('button', { hasText: 'Reject all' }).first().click({ timeout: 5000, force: true }); await page.waitForTimeout(800); }
    /* setup only: start the game from its rules the way a first visit does, so a save exists to age */
    await page.evaluate(() => { const d = document.querySelector('[aria-label="How Stadium Tycoon works"]'); const b = d && [...d.querySelectorAll('button')].find(x => (x.textContent || '').trim() === "Let's go"); if (b) b.click(); });
    await page.waitForTimeout(1500);
    await page.goto(`${BASE}/robots.txt`);
    const aged = await page.evaluate(() => {
      const raw = localStorage.getItem('stadiumTycoonSaveV1');
      if (!raw) return false;
      const s = JSON.parse(raw); s.savedAt = Date.now() - 3 * 3600 * 1000;
      localStorage.setItem('stadiumTycoonSaveV1', JSON.stringify(s));
      return true;
    });
    await page.goto(`${BASE}/stadium-tycoon`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await settle(page);
    const m = await page.evaluate(measure, { BANNER, NAME });
    await page.screenshot({ path: path.join(OUT, `${k}.jpg`), type: 'jpeg', quality: 60 });
    const line = `${k}: save aged ${aged}, ${m.open ? `box top ${m.top}, scrolled to its end: box bottom ${m.boxBottom} (scroll ${m.scroll}), "Back to work" ${m.btn[0]} to ${m.btn[1]} at its centre ${m.at}` : 'NO away box'}, banner top ${m.banner ?? 'none'} pending ${m.pending}`;
    const wrong = [];
    if (!aged) wrong.push('no save to age');
    if (!m.open) wrong.push('the away box did not open');
    else {
      seen += 1;
      if (m.at !== 'button') wrong.push(`at the button's centre ${m.at}`);
      if (m.banner !== null && m.btn[1] > m.banner) wrong.push(`${m.btn[1] - Math.max(m.btn[0], m.banner)} px of the button under the banner`);
      if (m.banner !== null && m.boxBottom > m.banner + 1) wrong.push(`the box runs ${m.boxBottom - m.banner} px under the banner`);
      if (m.top < 0) wrong.push('the box top is above the screen');
      if (!answer && !m.pending) wrong.push('the banner was not pending');
    }
    console.log(`  ${wrong.length ? 'FAIL' : 'PASS'} ${line}${wrong.length ? `: ${wrong.join('; ')}` : ''}`);
    if (wrong.length) bad.push(k);
    if (m.open && m.at === 'button') {
      await page.mouse.click(m.cx, m.cy);
      await page.waitForTimeout(600);
      const closed = await page.evaluate(n => !document.querySelector(`[aria-label="${n}"]`), NAME);
      console.log(`       tapping "Back to work" closes it: ${closed}`);
      if (!closed) bad.push(`${k} close`);
    }
  } catch (e) { console.log(`  FAIL ${k}: ERROR ${String(e.message).split('\n')[0]}`); bad.push(k); }
  await ctx.close();
}
await browser.close();
if (bad.length) { console.log(`away probe (${TAG}): RED. ${bad.join(', ')}`); process.exit(1); }
console.log(`away probe (${TAG}): green. ${seen} of ${scenes.length} away boxes measured, "Back to work" whole, tappable and above the banner`);
