// Fixer walk for Round 1551, from the run reviewer's walk (never committed). Served build at BASE; every non-local host is aborted, and the
// Supabase REST host is answered from a stub (never reached). Screenshots and walk.txt go to RC_OUT.
import pw from 'playwright';
import path from 'node:path';
import { readFileSync, writeFileSync } from 'node:fs';
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || '.';
const lines = [];
let bad = 0;
const log = s => { lines.push(s); console.log(s); };
const flag = s => { bad += 1; log('PROBLEM ' + s); };

/* stub database: the real AFL and NRL rolls from the create migrations, every other table empty */
const roll = f => [...readFileSync(path.join('supabase/migrations', f), 'utf8').matchAll(/\((\d{4}),\s*'((?:[^']|'')*)'/g)].map(m => [Number(m[1]), m[2].replace(/''/g, "'")]);
const AFL = roll('20260820_create_afl_premiers.sql').map(([year, premier], i) => ({ id: i + 1, year, premier }));
const NRL = roll('20260820_create_nrl_premiers.sql').map(([year, premier], i) => ({ id: i + 1, year, premier }));
const db = with2026 => ({
  afl_premiers: with2026 ? [...AFL, { id: AFL.length + 1, year: 2026, premier: 'Brisbane Lions' }] : AFL,
  nrl_premiers: with2026 ? [...NRL, { id: NRL.length + 1, year: 2026, premier: 'Sydney Roosters' }] : NRL,
});

const browser = await pw.chromium.launch();
async function open({ w, h, motion = 'reduce', day, route, stub }) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: motion });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e.message || e).slice(0, 160)));
  await page.route('**/*', r => {
    const url = r.request().url();
    if (url.startsWith(BASE)) return r.continue();
    const m = url.match(/supabase\.co\/rest\/v1\/(\w+)/);
    if (stub && m) return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(stub[m[1]] ?? []) });
    return r.abort();
  });
  await page.clock.install({ time: new Date(`${day}T16:00:00Z`) });
  await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
  return { ctx, page, errors };
}
const shot = (page, name, full = false) => page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: full });
const sideways = async (page, w, tag) => { const sw = await page.evaluate(() => document.documentElement.scrollWidth); if (sw > w) flag(`${tag}: page scrollWidth ${sw} > ${w}`); return sw; };

/* A. Rank 'Em, played to the end, both sizes, reduced motion on and off */
const ROUNDS = {
  '2026-10-25': { label: 'career three-pointers made through 2025-26', order: ['Stephen Curry', 'James Harden', 'Ray Allen', 'Klay Thompson', 'Reggie Miller'], values: ['4,248', '3,390', '2,973', '2,899', '2,560'] },
  '2026-10-27': { label: 'career goals through 2025-26', order: ['Wayne Gretzky', 'Alex Ovechkin', 'Jaromír Jágr', 'Brett Hull', 'Steve Yzerman'], values: ['894', '929', '766', '741', '692'] },
};
const RUNS = [[390, 844, 'reduce', '2026-10-25'], [390, 844, 'no-preference', '2026-10-25'], [1280, 900, 'reduce', '2026-10-25'], [1280, 900, 'no-preference', '2026-10-25'], [390, 844, 'no-preference', '2026-10-27'], [1280, 900, 'reduce', '2026-10-27']];
for (const [w, h, motion, day] of RUNS) {
  const R = ROUNDS[day];
  const tag = `rankem ${day} ${w} ${motion}`;
  const { ctx, page, errors } = await open({ w, h, motion, day, route: '/rank-em' });
  try {
    await page.locator('[data-rank-player]').first().waitFor({ timeout: 25000 });
    const body0 = await page.locator('body').innerText();
    if (!body0.includes(R.label)) flag(`${tag}: label "${R.label}" not on the page`);
    await shot(page, `rankem-${day}-${w}-${motion}-start`);
    for (const name of R.order) { await page.locator(`[data-rank-player="${name}"]`).click(); await page.waitForTimeout(150); }
    await page.getByRole('button', { name: 'Lock order' }).click();
    const region = page.getByRole('region', { name: 'Rank result' });
    await region.waitFor({ timeout: 15000 });
    await page.waitForTimeout(motion === 'reduce' ? 600 : 3500);
    const body = await page.locator('body').innerText();
    const want = day === '2026-10-25' ? '5 / 5 correct' : '3 / 5 correct';
    if (!body.includes(want)) flag(`${tag}: result does not say "${want}"`);
    for (const v of R.values) if (!body.includes(v)) flag(`${tag}: value ${v} not shown after the lock`);
    if (!body.includes(R.label)) flag(`${tag}: label missing on the result`);
    const sw = await sideways(page, w, tag);
    /* Fix 4: every drawn "2025-26" sits on one line. Fix 1: the guide lead no longer says "from the database". */
    const stamps = await page.evaluate(() => [...document.querySelectorAll('span.whitespace-nowrap')]
      .filter(s => s.textContent === '2025-26').map(s => s.getClientRects().length));
    if (stamps.length < 2) flag(`${tag}: ${stamps.length} nowrap season stamps drawn, expected the heading and the result card`);
    if (stamps.some(n => n !== 1)) flag(`${tag}: a season stamp breaks across lines (${stamps.join(',')} line boxes)`);
    if (/from the database/i.test(body)) flag(`${tag}: the page still says "from the database"`);
    if (!body.includes('Every ranking is verified career totals')) flag(`${tag}: the guide lead does not say "Every ranking is verified career totals"`);
    log(`${tag}: stamps ${stamps.length} with line boxes [${stamps.join(',')}]`);
    await page.getByRole('region', { name: 'Rank result' }).screenshot({ path: path.join(OUT, `rankem-${day}-${w}-${motion}-card.png`) }).catch(() => {});
    await shot(page, `rankem-${day}-${w}-${motion}-result`, true);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByRole('region', { name: 'Rank result' }).waitFor({ timeout: 20000 }).catch(() => flag(`${tag}: result not restored after reload`));
    const body2 = await page.locator('body').innerText();
    if (!body2.includes(want)) flag(`${tag}: restored result does not say "${want}"`);
    log(`${tag}: played, "${want}" ${body.includes(want)}, restored ${body2.includes(want)}, scrollWidth ${sw}, page errors ${errors.length}${errors.length ? ' ' + errors[0] : ''}`);
  } catch (e) { flag(`${tag}: ${String(e.message).split('\n')[0]}`); await shot(page, `rankem-${day}-${w}-${motion}-error`, true); }
  await ctx.close();
}

/* B. the rules before play, re-opened from the ? button, at 390 */
{
  const { ctx, page } = await open({ w: 390, h: 844, day: '2026-10-25', route: '/rank-em' });
  try {
    await page.locator('[data-rank-player]').first().waitFor({ timeout: 25000 });
    await page.getByRole('button', { name: 'How to play' }).first().click();
    await page.waitForTimeout(500);
    await shot(page, 'rankem-howto-390');
    const t = await page.locator('body').innerText();
    log(`rankem how to play: opened, mentions "from the database": ${/from the database/i.test(t)}`);
  } catch (e) { flag(`rankem how to play: ${String(e.message).split('\n')[0]}`); }
  await ctx.close();
}

/* C. What's New, the new line, both sizes */
for (const [w, h] of [[390, 844], [1280, 900]]) {
  const { ctx, page } = await open({ w, h, day: '2026-10-25', route: '/whats-new' });
  try {
    const li = page.getByText('The 2026 grand finals reach the champion games on November 1.').first();
    await li.waitFor({ timeout: 20000 });
    await li.scrollIntoViewIfNeeded();
    await shot(page, `whatsnew-${w}`);
    await sideways(page, w, `whats-new ${w}`);
    log(`whats-new ${w}: line found`);
  } catch (e) { flag(`whats-new ${w}: ${String(e.message).split('\n')[0]}`); }
  await ctx.close();
}

/* D. Champ or Not and Silverware Sort in the built app: with the 2026 rows in the table, the board on 2026-10-31
   must read exactly as without them; on 2026-11-01 the rows count. */
for (const route of ['/champ-or-not', '/silverware-sort']) {
  const text = {};
  for (const day of ['2026-10-31', '2026-11-01']) {
    for (const with2026 of [false, true]) {
      const { ctx, page, errors } = await open({ w: 390, h: 844, day, route, stub: db(with2026) });
      await page.waitForTimeout(6000);
      const main = await page.locator('main').first().innerText().catch(() => page.locator('body').innerText());
      text[`${day}:${with2026}`] = main.replace(/\d{1,2}:\d{2}(:\d{2})?/g, 'T');
      writeFileSync(path.join(OUT, `${route.slice(1)}-${day}-${with2026}.txt`), main);
      if (day === '2026-11-01' && with2026) await shot(page, `${route.slice(1)}-${day}-with2026`);
      if (day === '2026-10-31' && with2026) await shot(page, `${route.slice(1)}-${day}-with2026`);
      log(`${route} ${day} rows2026=${with2026}: ${main.length} chars, Brisbane ${main.includes('Brisbane')}, couldn't load ${/couldn.t load|try again/i.test(main)}, errors ${errors.length}`);
      await ctx.close();
    }
  }
  const same31 = text['2026-10-31:false'] === text['2026-10-31:true'];
  const same01 = text['2026-11-01:false'] === text['2026-11-01:true'];
  if (!same31) flag(`${route}: the 2026-10-31 board changes when the 2026 rows are in the table`);
  log(`${route}: 2026-10-31 identical with and without the rows: ${same31}; 2026-11-01 identical: ${same01}`);
}

await browser.close();
writeFileSync(path.join(OUT, 'walk.txt'), lines.join('\n') + '\n');
console.log(bad ? `walkFix1551: ${bad} problem(s)` : 'walkFix1551: all checks passed');
process.exit(bad ? 1 : 0);
