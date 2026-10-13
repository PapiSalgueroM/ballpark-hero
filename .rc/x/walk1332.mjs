// Round 1332 walk (a one off proof of no change, never committed): the US careers' inbox on served
// builds of FENCE_BASE (port 4174) and of the head (port 4173), at 320, 390 and 1280. A save holding
// one open and one answered text is written before load; the Inbox tile is opened and pictured: the
// list, the answered text ("You replied") and the open one (its buttons). Boxes and text must match
// head against base within 1 px; font sizes and sideways scroll are recorded.
import fs from 'node:fs';
import path from 'node:path';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const { chromium } = pw;
const OUT = process.env.RC_OUT || '/tmp/walk1332';
fs.mkdirSync(OUT, { recursive: true });
const SITES = { base: 'http://localhost:4174', head: 'http://localhost:4173' };
const GAMES = [
  { path: '/nfl-my-career', key: 'nfl-my-career-save-v1' },
  { path: '/nhl-my-career', key: 'nhl-my-career-save-v1' },
];
const WIDTHS = [320, 390, 1280];
const choices = [{ label: 'Take the call', reply: 'On it.', karma: 1 }, { label: 'Let it ring', reply: 'Later.', karma: 0 }];
const MSGS = [
  { id: 'walk-done', defId: 'walk_done', from: 'Your agent', emoji: '📱', text: 'The walk wrote this one already answered.', year: 2026, choices, answered: 0 },
  { id: 'walk-open', defId: 'walk_open', from: 'Your agent', emoji: '📱', text: 'The walk wrote this one still waiting on you.', year: 2026, choices },
];
const browser = await chromium.launch();
const results = {};
const problems = [];

async function measure(page, sel) {
  return page.evaluate(s => [...document.querySelectorAll(s)].map(el => {
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), text: el.textContent.trim().slice(0, 80), fs: parseFloat(getComputedStyle(el).fontSize) };
  }), sel);
}
async function smallest(page) {
  return page.evaluate(() => {
    let min = 99;
    for (const el of document.querySelectorAll('main *, #root *')) {
      if (!el.childNodes.length || ![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      min = Math.min(min, parseFloat(getComputedStyle(el).fontSize));
    }
    return min;
  });
}

for (const [site, base] of Object.entries(SITES)) {
  for (const game of GAMES) {
    for (const width of WIDTHS) {
      const tag = `${site}${game.path.replace(/\//g, '-')}-${width}`;
      const ctx = await browser.newContext({ viewport: { width, height: width >= 1280 ? 900 : 844 }, reducedMotion: 'reduce' });
      await ctx.route(/supabase\.co/, r => r.abort());
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(String(e)));
      await page.addInitScript(route => localStorage.setItem(`rules-gate-seen:${route}`, '1'), game.path);
      await page.goto(`${base}${game.path}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);
      const consent = page.locator('button:has-text("Essential only")');
      if (await consent.count()) { await consent.first().click().catch(() => {}); await page.waitForTimeout(300); }
      await page.locator('input[placeholder*="name"]').first().fill('Walk Player');
      await page.locator('button:has-text("Enter the draft")').click();
      await page.waitForTimeout(1000);
      const wrote = await page.evaluate(([key, msgs]) => {
        const raw = localStorage.getItem(key);
        if (!raw) return false;
        const s = JSON.parse(raw);
        s.c.phoneInbox = msgs;
        localStorage.setItem(key, JSON.stringify(s));
        return true;
      }, [game.key, MSGS]);
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(1200);
      const r = { wrote, errors };
      const tile = page.locator('button:has(div.uppercase)').filter({ hasText: /Inbox/i }).first();
      if (!(await tile.count())) { problems.push(`${tag}: no Inbox tile`); results[tag] = r; await ctx.close(); continue; }
      await tile.click();
      await page.waitForTimeout(700);
      r.rows = await measure(page, '[data-inbox-row]');
      r.overflowList = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      await page.screenshot({ path: path.join(OUT, `${tag}-list.png`) });
      await page.locator('[data-inbox-row="walk-done"]').click();
      await page.waitForTimeout(400);
      r.replied = await measure(page, 'p.rounded-xl');
      r.card = await measure(page, 'div.rounded-2xl');
      r.settled = await measure(page, '[data-inbox-settled]');
      r.minFontAnswered = await smallest(page);
      await page.screenshot({ path: path.join(OUT, `${tag}-answered.png`) });
      await page.getByText('Back to inbox').click();
      await page.waitForTimeout(400);
      await page.locator('[data-inbox-row="walk-open"]').click();
      await page.waitForTimeout(400);
      r.buttons = await measure(page, 'div.space-y-1\\.5 > button');
      r.overflowOpen = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      r.minFontOpen = await smallest(page);
      await page.screenshot({ path: path.join(OUT, `${tag}-open.png`) });
      results[tag] = r;
      if (!wrote) problems.push(`${tag}: the save was not written`);
      if (r.rows.length !== 2) problems.push(`${tag}: ${r.rows.length} rows, not 2`);
      if (r.settled.length) problems.push(`${tag}: a settled box appeared`);
      if (!r.replied.some(x => /You replied: Take the call/.test(x.text))) problems.push(`${tag}: no "You replied" box`);
      if (r.buttons.length !== 2) problems.push(`${tag}: ${r.buttons.length} answer buttons, not 2`);
      if (r.overflowList > 1 || r.overflowOpen > 1) problems.push(`${tag}: sideways scroll ${r.overflowList}/${r.overflowOpen}`);
      if (errors.length) problems.push(`${tag}: page errors ${errors.slice(0, 2).join(' | ')}`);
      await ctx.close();
    }
  }
}
await browser.close();
/* Head against base, within 1 px, box by box and text by text. */
const keys = ['rows', 'replied', 'card', 'buttons'];
let compared = 0;
for (const game of GAMES) for (const width of WIDTHS) {
  const t = `${game.path.replace(/\//g, '-')}-${width}`;
  const b = results[`base${t}`];
  const h = results[`head${t}`];
  if (!b || !h) { problems.push(`${t}: missing a side`); continue; }
  for (const k of keys) {
    const bl = b[k] ?? [];
    const hl = h[k] ?? [];
    if (bl.length !== hl.length) { problems.push(`${t} ${k}: base ${bl.length} boxes, head ${hl.length}`); continue; }
    bl.forEach((x, i) => {
      compared++;
      const y = hl[i];
      for (const f of ['x', 'y', 'w', 'h']) if (Math.abs(x[f] - y[f]) > 1) problems.push(`${t} ${k}[${i}].${f}: base ${x[f]}, head ${y[f]}`);
      if (x.text !== y.text) problems.push(`${t} ${k}[${i}] text: base "${x.text}", head "${y.text}"`);
      if (x.fs !== y.fs) problems.push(`${t} ${k}[${i}] font: base ${x.fs}, head ${y.fs}`);
    });
  }
  console.log(`${t}: smallest text base ${b.minFontAnswered}/${b.minFontOpen} px, head ${h.minFontAnswered}/${h.minFontOpen} px; overflow head ${h.overflowList}/${h.overflowOpen}`);
}
fs.writeFileSync(path.join(OUT, 'walk1332.json'), JSON.stringify(results, null, 1));
for (const p of problems.slice(0, 30)) console.log(`PROBLEM ${p}`);
console.log(`walk1332: ${compared} boxes compared head against base over ${GAMES.length} routes at ${WIDTHS.join(', ')}; ${problems.length ? `${problems.length} problems` : 'all within 1 px, same text, same fonts, no sideways scroll'}`);
process.exit(problems.length ? 1 : 0);
