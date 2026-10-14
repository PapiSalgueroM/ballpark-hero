// Round 1332 review walk (run lens, never committed). On the served head build (BASE), with the database host
// blocked, at 390x844 and 1280x900, reduced motion on and off:
//  (1) GmInboxPanel on a harness page (the served CSS, the app's own JS blocked, the panel bundled from src by
//      esbuild over a desk the real engine dealt): the list, the card the staff settled, the card the manager
//      answered, an open card; the full desk sentence.
//  (2) The US careers' inbox (/nfl-my-career) with a save holding one open and one answered text.
// Screenshots and walk.json go to RC_OUT. Exit 1 on a broken expectation.
import fs from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const { chromium } = pw;
const ROOT = process.cwd();
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || '/tmp/walk1332r';
fs.mkdirSync(OUT, { recursive: true });
const js = (await build({
  entryPoints: [path.join(ROOT, '.rc/x/gmpanel-entry.tsx')], bundle: true, write: false, format: 'iife', platform: 'browser',
  jsx: 'automatic', alias: { '@': path.join(ROOT, 'src') }, define: { 'process.env.NODE_ENV': '"production"' }, absWorkingDir: ROOT, logLevel: 'error',
})).outputFiles[0].text;
const problems = [];
const results = {};
const browser = await chromium.launch();
const VIEWS = [[390, 844], [1280, 900]];
const MOTION = ['reduce', 'no-preference'];
const box = (page, sel) => page.evaluate(q => [...document.querySelectorAll(q)].map(el => {
  const r = el.getBoundingClientRect();
  const cs = getComputedStyle(el);
  return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), right: Math.round(r.right), fs: parseFloat(cs.fontSize),
    text: el.textContent.trim().slice(0, 160), cls: el.className, anim: cs.animationName, dur: cs.animationDuration };
}), sel);
const overflow = page => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const cutOff = page => page.evaluate(() => [...document.querySelectorAll('#harness *, main *')].filter(el => {
  const r = el.getBoundingClientRect();
  return r.width > 0 && (r.right > window.innerWidth + 1 || r.x < -1);
}).length);

for (const [w, h] of VIEWS) for (const motion of MOTION) {
  const tag = `${w}-${motion === 'reduce' ? 'rm' : 'mo'}`;
  /* (1) the GM desk panel. */
  {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: motion });
    await ctx.route(/supabase\.co/, r => r.abort());
    await ctx.route('**/assets/*.js', r => r.abort());
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    await page.goto(`${BASE}/`, { waitUntil: 'load' });
    await page.evaluate(() => { document.body.innerHTML = '<div id="harness"></div>'; window.scrollTo(0, 0); });
    await page.addScriptTag({ content: js });
    await page.waitForSelector('[data-gm-inbox]', { timeout: 15000 });
    await page.waitForTimeout(800);
    const info = await page.evaluate(() => window.__walk);
    const r = { info, errors };
    r.header = await box(page, '[data-gm-inbox] > p');
    r.rows = await box(page, '[data-inbox-row]');
    r.overflowList = await overflow(page);
    r.cutList = await cutOff(page);
    await page.screenshot({ path: path.join(OUT, `gm-${tag}-list.png`), fullPage: true });
    if (info.settledId) {
      await page.locator(`[data-inbox-row="${info.settledId}"]`).click();
      await page.waitForTimeout(300);
      r.settled = await box(page, '[data-inbox-settled]');
      r.repliedInSettled = await page.locator('text=You replied').count();
      r.overflowSettled = await overflow(page);
      await page.screenshot({ path: path.join(OUT, `gm-${tag}-settled.png`), fullPage: true });
      await page.getByText('Back to inbox').click();
      await page.waitForTimeout(300);
    } else problems.push(`${tag}: the engine settled no card in the harness`);
    if (info.answeredId) {
      await page.locator(`[data-inbox-row="${info.answeredId}"]`).click();
      await page.waitForTimeout(300);
      r.replied = await box(page, 'p.rounded-xl');
      await page.screenshot({ path: path.join(OUT, `gm-${tag}-replied.png`), fullPage: true });
      await page.getByText('Back to inbox').click();
      await page.waitForTimeout(300);
    }
    await page.locator(`[data-inbox-row="${info.openExpId}"]`).click();
    await page.waitForTimeout(300);
    r.buttons = await box(page, 'div.space-y-1\\.5 > button');
    r.overflowOpen = await overflow(page);
    await page.screenshot({ path: path.join(OUT, `gm-${tag}-open.png`), fullPage: true });
    results[`gm-${tag}`] = r;
    if (errors.length) problems.push(`gm-${tag}: page errors ${errors.slice(0, 2).join(' | ')}`);
    if (info.settledId && !(r.settled?.length === 1 && /dealt with it/.test(r.settled[0].text))) problems.push(`gm-${tag}: no settled line`);
    if (r.repliedInSettled) problems.push(`gm-${tag}: "You replied" on a card the staff settled`);
    if (r.overflowList > 1 || r.overflowOpen > 1 || (r.overflowSettled ?? 0) > 1 || r.cutList) problems.push(`gm-${tag}: sideways scroll or cut off ${r.overflowList}/${r.overflowOpen}/${r.overflowSettled}/${r.cutList}`);
    await ctx.close();
  }
}
/* (2) the US careers' inbox, the one route that draws InboxPanel, on the head build. */
const choices = [{ label: 'Take the call', reply: 'On it.', karma: 1 }, { label: 'Let it ring', reply: 'Later.', karma: 0 }];
const MSGS = [
  { id: 'rv-done', defId: 'rv_done', from: 'Your agent', emoji: '📱', text: 'The review wrote this one already answered.', year: 2026, choices, answered: 0 },
  { id: 'rv-open', defId: 'rv_open', from: 'Your agent', emoji: '📱', text: 'The review wrote this one still waiting on you.', year: 2026, choices },
];
for (const [w, h] of VIEWS) for (const motion of MOTION) {
  const tag = `${w}-${motion === 'reduce' ? 'rm' : 'mo'}`;
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: motion });
  await ctx.route(/supabase\.co/, r => r.abort());
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.addInitScript(() => localStorage.setItem('rules-gate-seen:/nfl-my-career', '1'));
  await page.goto(`${BASE}/nfl-my-career`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const consent = page.locator('button:has-text("Essential only")');
  if (await consent.count()) { await consent.first().click().catch(() => {}); await page.waitForTimeout(300); }
  await page.locator('input[placeholder*="name"]').first().fill('Review Player');
  await page.locator('button:has-text("Enter the draft")').click();
  await page.waitForTimeout(1000);
  const wrote = await page.evaluate(msgs => {
    const raw = localStorage.getItem('nfl-my-career-save-v1');
    if (!raw) return false;
    const s = JSON.parse(raw);
    s.c.phoneInbox = msgs;
    localStorage.setItem('nfl-my-career-save-v1', JSON.stringify(s));
    return true;
  }, MSGS);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const r = { wrote, errors };
  const tile = page.locator('button:has(div.uppercase)').filter({ hasText: /Inbox/i }).first();
  if (!(await tile.count())) { problems.push(`us-${tag}: no Inbox tile`); results[`us-${tag}`] = r; await ctx.close(); continue; }
  await tile.click();
  await page.waitForTimeout(700);
  r.rows = await box(page, '[data-inbox-row]');
  await page.screenshot({ path: path.join(OUT, `us-${tag}-list.png`) });
  await page.locator('[data-inbox-row="rv-done"]').click();
  await page.waitForTimeout(400);
  r.replied = await box(page, 'p.rounded-xl');
  r.settled = await box(page, '[data-inbox-settled]');
  await page.screenshot({ path: path.join(OUT, `us-${tag}-answered.png`) });
  await page.getByText('Back to inbox').click();
  await page.waitForTimeout(400);
  await page.locator('[data-inbox-row="rv-open"]').click();
  await page.waitForTimeout(400);
  r.buttons = await box(page, 'div.space-y-1\\.5 > button');
  r.overflow = await overflow(page);
  await page.screenshot({ path: path.join(OUT, `us-${tag}-open.png`) });
  results[`us-${tag}`] = r;
  if (!wrote) problems.push(`us-${tag}: the save was not written`);
  if (r.settled.length) problems.push(`us-${tag}: a settled box on the US board`);
  if (!r.replied.some(x => /You replied: Take the call/.test(x.text))) problems.push(`us-${tag}: no "You replied" box`);
  if (r.buttons.length !== 2) problems.push(`us-${tag}: ${r.buttons.length} answer buttons`);
  if (r.overflow > 1) problems.push(`us-${tag}: sideways scroll ${r.overflow}`);
  if (errors.length) problems.push(`us-${tag}: page errors ${errors.slice(0, 2).join(' | ')}`);
  await ctx.close();
}
await browser.close();
fs.writeFileSync(path.join(OUT, 'walk.json'), JSON.stringify(results, null, 1));
for (const [k, r] of Object.entries(results)) {
  if (k.startsWith('gm-')) console.log(`${k}: ${JSON.stringify(r.info)} header ${r.header?.[0]?.fs}px h${r.header?.[0]?.h} "${r.header?.[0]?.text}" | settled ${r.settled?.[0]?.fs}px "${r.settled?.[0]?.text}" cls "${r.settled?.[0]?.cls}" | rows ${r.rows?.length} anim ${r.rows?.[0]?.anim}/${r.rows?.[0]?.dur} | buttons ${r.buttons?.map(b => b.h).join(',')}`);
  else console.log(`${k}: rows ${r.rows?.length} replied "${r.replied?.[0]?.text}" buttons ${r.buttons?.map(b => b.h).join(',')}`);
}
for (const p of problems) console.error(`   PROBLEM ${p}`);
console.log(problems.length ? `walk1332r: ${problems.length} problems` : 'walk1332r: green');
process.exit(problems.length ? 1 : 0);
