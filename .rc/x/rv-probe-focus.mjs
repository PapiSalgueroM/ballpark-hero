/* Review of Round 1533 (run lens): where focus and the viewport land after a TAP on a button that unmounts itself,
 * on a touch phone (390 by 844, hasTouch, isMobile). Compares this round's "See who is calling" and take with the
 * recap's existing "Go to the draft". Viewport pictures (what the player sees) to $RC_OUT/fp. Supabase aborted. */
import fs from 'node:fs';
import path from 'node:path';
import pw from '../../scripts/lib/playwrightLoader.mjs';
import { answerConsent } from '../../scripts/lib/answerConsent.mjs';

const HEAD = process.env.BASE || 'http://localhost:4173';
const OUT = path.join(process.env.RC_OUT || '.tmp-rv', 'fp');
fs.mkdirSync(OUT, { recursive: true });
const KEY = 'front-office-save-v1';
const wait = ms => new Promise(r => setTimeout(r, ms));
const browser = await pw.chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.route(/supabase\.co/, r => r.abort());
await page.route(/googlesyndication|doubleclick|googletagmanager|google-analytics|adservice/, r => r.abort());
const readSave = () => page.evaluate(k => JSON.parse(localStorage.getItem(k) || 'null'), KEY);
async function state(tag) {
  const r = await page.evaluate(() => {
    const a = document.activeElement;
    const skip = document.querySelector('.dukb-skip-link');
    const sb = skip ? skip.getBoundingClientRect() : null;
    return {
      active: a ? `${a.tagName.toLowerCase()}${a.className ? '.' + String(a.className).split(' ')[0] : ''} "${(a.textContent || '').trim().slice(0, 30)}"` : 'none',
      focusVisible: a ? a.matches(':focus-visible') : false,
      skipShown: sb ? sb.top >= 0 && sb.bottom > 0 : false,
      scrollY: Math.round(window.scrollY), height: document.documentElement.scrollHeight,
    };
  });
  console.log(`STATE ${tag}: ${JSON.stringify(r)}`);
  await page.screenshot({ path: path.join(OUT, `${tag}.png`) });
  return r;
}
async function tapText(text) {
  const b = page.locator(`button:has-text("${text}")`).last();
  await b.scrollIntoViewIfNeeded();
  await b.tap();
}
await page.goto(`${HEAD}/front-office`, { waitUntil: 'networkidle' });
await wait(900);
await answerConsent(page);
await page.locator('.grid button').first().tap();
await page.waitForFunction(k => JSON.parse(localStorage.getItem(k) || '{}').phase === 'hub', KEY, { timeout: 30000 });
await wait(600);
/* A normal season first: the recap's existing "Go to the draft" (the base's own self-unmounting button). */
let s = await readSave();
s.league.week = 17;
await page.evaluate(([k, v]) => localStorage.setItem(k, JSON.stringify(v)), [KEY, s]);
await page.reload({ waitUntil: 'networkidle' });
await wait(900);
await answerConsent(page);
await page.locator('button:has(div.uppercase)').filter({ hasText: /This week/i }).first().tap();
await wait(400);
await tapText('Play the final week');
await page.waitForFunction(k => ['recap', 'fired'].includes(JSON.parse(localStorage.getItem(k) || '{}').phase), KEY, { timeout: 30000 });
await wait(2500);
const press = page.locator('[data-gm-press] button').first();
if (await press.count()) { await press.scrollIntoViewIfNeeded(); await press.tap(); await wait(800); }
await state('a1-recap-before-draft');
if (await page.locator('button:has-text("Go to the draft")').count()) { await tapText('Go to the draft'); await wait(1200); await state('a2-after-go-to-draft'); }
/* Now a doomed season on a fresh club. */
await page.evaluate(k => localStorage.removeItem(k), KEY);
await page.goto(`${HEAD}/front-office`, { waitUntil: 'networkidle' });
await wait(900);
await page.locator('.grid button').first().tap();
await page.waitForFunction(k => JSON.parse(localStorage.getItem(k) || '{}').phase === 'hub', KEY, { timeout: 30000 });
await wait(600);
s = await readSave();
s.trust = 5;
s.mandate = { tier: 'title', text: 'Win the Super Bowl. Anything less is a failed season upstairs.', winFloor: 0, reqLevel: 4, season: s.league.season };
for (const p of s.league.teams[s.myTeam].players) p.ovr = 60;
s.league.week = 17;
await page.evaluate(([k, v]) => localStorage.setItem(k, JSON.stringify(v)), [KEY, s]);
await page.reload({ waitUntil: 'networkidle' });
await wait(900);
await page.locator('button:has(div.uppercase)').filter({ hasText: /This week/i }).first().tap();
await wait(400);
await tapText('Play the final week');
await page.waitForFunction(k => JSON.parse(localStorage.getItem(k) || '{}').fired === true, KEY, { timeout: 30000 });
await wait(2500);
await state('b1-fired-recap');
await tapText('See who is calling');
await wait(1200);
await state('b2-after-see-who-is-calling');
await page.locator('[data-gm-desk="tiles"] button:has(div.uppercase:text-is("Job market"))').first().tap();
await page.locator('[data-gm-offer]').first().waitFor({ timeout: 20000 });
await wait(600);
await state('b3-job-market');
await page.locator('[data-gm-offer]').first().tap();
await wait(500);
await state('b4-offer-open');
await page.locator('[data-gm-take]').first().tap();
await wait(400);
await page.locator('[data-gm-take]').first().tap();
await page.waitForFunction(k => JSON.parse(localStorage.getItem(k) || '{}').phase === 'recap', KEY, { timeout: 20000 });
await wait(2500);
await state('b5-arrival');
await browser.close();
console.log('focus probe: done');
