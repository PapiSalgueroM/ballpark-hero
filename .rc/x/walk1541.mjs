/* Reviewer walk for Round 1541 Part A (dark). Not committed.
   Plays /nba-my-career the way a player would at 390x844 and 1280x900, reduced
   motion on and off, and plants a save that Part B would call up (a season
   rated 95 whose summer has an edition: 2026 -> wc-2027, 2027 -> oly-2028).
   Part A must show nothing of it: no beat, no curtain line, no help rule, and
   no `intl` key ever written to the save. Screenshots go to RC_OUT. */
import fs from 'node:fs';
import path from 'node:path';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const { chromium } = pw;
const BASE = process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173';
const OUT = process.env.RC_OUT || '/tmp/rc-out';
fs.mkdirSync(OUT, { recursive: true });
const ROUTE = '/nba-my-career';
const KEY = 'nba-my-career-save-v1';
const INTL_WORDS = /national team|World Cup|Olympic|International summers|called up/i;
let checks = 0; let failed = 0;
const say = (ok, msg) => { checks += 1; if (!ok) failed += 1; console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${msg}`); };

const browser = await chromium.launch();
async function open(width, height, reduced) {
  const ctx = await browser.newContext({ viewport: { width, height }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  const seen = { errors: [], reached: 0 };
  page.on('pageerror', e => seen.errors.push(String(e)));
  page.on('requestfinished', r => { if (/supabase\.co/.test(r.url())) seen.reached += 1; });
  await page.route(/supabase\.co/, r => r.abort());
  await page.addInitScript(route => localStorage.setItem(`rules-gate-seen:${route}`, '1'), ROUTE);
  await page.goto(`${BASE}${ROUTE}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  const consent = page.locator('button:has-text("Essential only")');
  if (await consent.count()) { await consent.first().click().catch(() => {}); await page.waitForTimeout(300); }
  await page.locator('input[placeholder*="name"]').first().fill('Probe Player');
  await page.locator('button:has-text("Enter the draft")').click();
  await page.waitForTimeout(900);
  return { ctx, page, seen, tag: `${width}${reduced ? '-rm' : ''}` };
}
const playButton = page => page.locator('button', { hasText: /^\s*Play the \d+ season\s*$/ });
async function step(page) {
  const lastIn = async sel => { const b = page.locator(`${sel} button:not([disabled])`); const n = await b.count(); if (!n) return false; await b.nth(n - 1).click(); return true; };
  const firstIn = async sel => { const b = page.locator(`${sel} button:not([disabled])`); if (!(await b.count())) return false; await b.first().click(); return true; };
  if (await page.locator('[role="alertdialog"]').count()) return lastIn('[role="alertdialog"]');
  if (await page.locator('[data-season-reveal]').count()) return lastIn('[data-season-reveal]');
  if (await page.locator('[data-decision-continue]').count()) { await page.locator('[data-decision-continue]').first().click(); return true; }
  if (await page.locator('[data-rivalry-event]').count()) return lastIn('[data-rivalry-event]');
  if (await page.locator('[data-rivalry-choice]').count()) return (await page.locator('[data-rivalry-choice] [data-rivalry-outcome]').count()) ? lastIn('[data-rivalry-choice]') : firstIn('[data-rivalry-choice]');
  if (await page.locator('[data-extension-talk]').count()) return firstIn('[data-extension-talk]');
  if (await page.locator('[data-fa-window]').count()) return firstIn('[data-fa-window]');
  const hubBack = page.locator('button', { hasText: /^\s*Hub\s*$/ });
  if (await hubBack.count()) { await hubBack.first().click(); return true; }
  const options = page.locator('button[class*="bg-background px-3 py-2 text-left"]:not([disabled])');
  if (await options.count()) { await options.first().click(); return true; }
  return false;
}
async function toHub(page, what, texts) {
  for (let i = 0; i < 40; i += 1) {
    if (await playButton(page).count() && !(await page.locator('[data-season-reveal]').count())) return true;
    texts.push((await page.locator('main').innerText().catch(() => '')).replace(/\s+/g, ' '));
    if (!(await step(page))) await page.waitForTimeout(500); else await page.waitForTimeout(450);
  }
  say(false, `${what}: got back to the hub`);
  return false;
}
const saveOf = page => page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? 'null'), KEY);
const rawSave = page => page.evaluate(key => localStorage.getItem(key) ?? '', KEY);
const sideways = page => page.evaluate(() => document.scrollingElement.scrollWidth - window.innerWidth);
const shot = (page, name) => page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: false });

async function plant(page, what) {
  const s = await saveOf(page);
  const last = s?.c?.seasons?.[s.c.seasons.length - 1];
  if (!last) { say(false, `${what}: a save with a season to plant`); return null; }
  last.ovr = 95; s.c.health = Math.max(80, s.c.health ?? 0); s.c.retired = false; s.phase = 'season';
  await page.evaluate(([key, v]) => localStorage.setItem(key, JSON.stringify(v)), [KEY, s]);
  console.log(`  note ${what}: planted the ${last.year} season at 95, age ${s.c.age}, health ${s.c.health}: Part B would call him for the ${last.year + 1} summer`);
  return JSON.stringify(s);
}
async function playSeason(page, what, name) {
  const texts = [];
  await playButton(page).first().click();
  await page.waitForSelector('[data-season-reveal]', { timeout: 15000 });
  await page.waitForTimeout(2600);
  const card = await page.locator('[data-season-reveal]').innerText();
  await shot(page, `${name}-reveal`);
  say(!INTL_WORDS.test(card), `${what}: the season curtain carries no international line ("${(card.match(INTL_WORDS) ?? ['none'])[0]}")`);
  await toHub(page, what, texts);
  const hit = texts.find(t => INTL_WORDS.test(t));
  say(!hit, `${what}: no screen between the curtain and the hub speaks of the national team (${hit ? hit.slice(0, 120) : 'none'})`);
}

for (const [wd, ht, reduced] of [[390, 844, false], [390, 844, true], [1280, 900, false], [1280, 900, true]]) {
  const w = await open(wd, ht, reduced); const { page } = w; const what = w.tag;
  console.log(`walk ${what}`);
  await toHub(page, what, []);
  await shot(page, `${what}-hub-new`);
  await playSeason(page, `${what} first season`, `${what}-s1`);
  const s1 = await saveOf(page);
  say(!!s1?.c && !('intl' in s1.c), `${what}: after the first season the save has no intl key`);
  const planted = await plant(page, `${what} plant 1`);
  await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(1500);
  const after = await rawSave(page);
  say(planted !== null && after === planted, `${what}: loading the planted save writes nothing (byte identical: ${after === planted})`);
  const hubText = (await page.locator('main').innerText()).replace(/\s+/g, ' ');
  say(!INTL_WORDS.test(hubText), `${what}: the hub of a save Part B would call shows no beat`);
  await shot(page, `${what}-planted-hub`);
  const help = page.getByRole('button', { name: 'How to play' }).first();
  if (await help.count()) {
    await help.click(); await page.waitForTimeout(700);
    const htxt = await page.locator('[role="dialog"]').first().innerText().catch(() => '');
    say(htxt.length > 50 && !INTL_WORDS.test(htxt), `${what}: the help has no international rule yet (${htxt.length} chars)`);
    await shot(page, `${what}-help`);
    await page.keyboard.press('Escape'); await page.waitForTimeout(400);
  } else say(false, `${what}: found the How to play button`);
  await playSeason(page, `${what} planted season`, `${what}-s2`);
  const s2 = await saveOf(page);
  say(!!s2?.c && !('intl' in s2.c), `${what}: after the planted season the save has no intl key`);
  await plant(page, `${what} plant 2`);
  await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(1500);
  await toHub(page, what, []);
  await playSeason(page, `${what} second planted season`, `${what}-s3`);
  const s3 = await saveOf(page);
  say(!!s3?.c && !('intl' in s3.c), `${what}: after the second planted season the save has no intl key (seasons ${s3?.c?.seasons?.map(x => x.year).join(',')})`);
  await shot(page, `${what}-hub-end`);
  say((await sideways(page)) <= 0, `${what}: no sideways scroll (${await sideways(page)})`);
  const real = w.seen.errors.filter(e => !/supabase|Failed to fetch|CORS/i.test(e));
  say(real.length === 0, `${what}: no page errors (${real[0] ?? 'clean'})`);
  say(w.seen.reached === 0, `${what}: no request to the live database finished (${w.seen.reached})`);
  await w.ctx.close();
}
await browser.close();
console.log(`walk1541: ${failed ? 'RED' : 'GREEN'}, ${checks} checks, ${failed} failed`);
process.exit(failed ? 1 : 0);
