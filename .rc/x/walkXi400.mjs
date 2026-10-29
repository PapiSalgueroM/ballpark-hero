// Reviewer xi400 walk: Build Your XI 3-5-2 with a left back at LWB and a right back at RWB, as a player
// picks them, at 390 (motion on and reduced) and 1280. Every request that is not the served build is
// aborted; the few database answers the page needs are local stubs (fixture names nobody real can match).
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const { chromium } = await import(pathToFileURL(path.join(ROOT, 'scripts/lib/playwrightLoader.mjs')).href);
const BASE = (process.env.BASE || 'http://localhost:4173').replace(/\/$/, '');
const OUT = process.env.RC_OUT || path.join(ROOT, '.tmp-walk-out');
fs.mkdirSync(OUT, { recursive: true });
const SUPA = 'flawuiqbvjobmkfkauhw.supabase.co';
const BOX = 'input[role="combobox"]';
let failures = 0;
const check = (ok, msg) => { console.log(`${ok ? '  PASS  ' : '  FAIL  '}${msg}`); if (!ok) failures += 1; return ok; };

const RUNS = [
  { tag: '390', ctx: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'no-preference' } },
  { tag: '390rm', ctx: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' } },
  { tag: '1280', ctx: { viewport: { width: 1280, height: 900 }, reducedMotion: 'no-preference' } },
];
const REST = [
  ['GK', 'qzxkeeper', 'Qzxkeeper Fixture', 'Goalkeeper'],
  ['CB', 'qzxcbone', 'Qzxcbone Fixture', 'Centre-Back'],
  ['CB', 'qzxcbtwo', 'Qzxcbtwo Fixture', 'Centre-Back'],
  ['CB', 'qzxcbthree', 'Qzxcbthree Fixture', 'Centre-Back'],
  ['CM', 'qzxcmone', 'Qzxcmone Fixture', 'Central Midfield'],
  ['CM', 'qzxcmtwo', 'Qzxcmtwo Fixture', 'Central Midfield'],
  ['ST', 'qzxstone', 'Qzxstone Fixture', 'Centre-Forward'],
  ['ST', 'qzxsttwo', 'Qzxsttwo Fixture', 'Centre-Forward'],
];

async function open(browser, run, errors) {
  const stub = { row: null, validator: 0 };
  const context = await browser.newContext(run.ctx);
  await context.addInitScript(() => {
    try { localStorage.setItem('cookie-consent', 'essential'); localStorage.setItem('lineup-rules-seen', '1'); } catch { /* ignored */ }
  });
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(`${run.tag}: ${e.message}`));
  await page.route('**/*', r => (r.request().url().startsWith(BASE) ? r.continue() : r.abort()));
  await page.route(/supabase\.co/, r => r.abort());
  await page.route(`**${SUPA}/rest/v1/national_team_squads**`, r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }).catch(() => {}));
  await page.route(`**${SUPA}/rest/v1/player_verified_positions**`, r => r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }).catch(() => {}));
  await page.route(`**${SUPA}/rest/v1/player_market_values**`, async r => {
    const url = new URL(r.request().url());
    const clubRaw = url.searchParams.get('club');
    const inside = clubRaw && clubRaw.match(/^in\.\((.*)\)$/);
    const club = inside ? inside[1].split(',')[0].trim().replace(/^"|"$/g, '') : 'Fixture Rovers';
    const row = stub.row ? {
      player_name: stub.row.stored, name_folded: stub.row.stored.toLowerCase(), market_value_usd: 30000000, year: 2026,
      club, nationality: 'Fixtureland', position: stub.row.raw, age: 26,
    } : null;
    await r.fulfill({ status: 200, contentType: 'application/json', headers: { 'content-range': row ? '0-0/1' : '*/0' }, body: JSON.stringify(row ? [row] : []) }).catch(() => {});
  });
  await page.route(`**${SUPA}/functions/v1/validate-player`, r => {
    if (r.request().method() !== 'POST') return r.fulfill({ status: 204, body: '' }).catch(() => {});
    stub.validator += 1;
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ valid: true }) }).catch(() => {});
  });
  await page.route(`**${SUPA}/functions/v1/evaluate-lineup`, r => {
    if (r.request().method() !== 'POST') return r.fulfill({ status: 204, body: '' }).catch(() => {});
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ rating: 'Top Four', headline: 'Fixture verdict', analysis: 'Fixture analysis for the walk.' }) }).catch(() => {});
  });
  await page.goto(`${BASE}/build-your-xi`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.getByRole('button', { name: /^3-5-2/ }).first().click({ timeout: 30000 });
  return { context, page, stub };
}

const filledCount = async page => {
  const t = await page.locator('span', { hasText: /^\d+\/11$/ }).first().innerText().catch(() => '');
  return Number(t.split('/')[0] || -1);
};
async function waitCount(page, n) {
  await page.locator('span', { hasText: new RegExp(`^${n}/11$`) }).first().waitFor({ timeout: 20000 }).catch(() => {});
  return filledCount(page);
}
async function tapSlot(page, label) {
  await page.getByText('Select a position on the pitch').first().waitFor({ timeout: 30000 });
  await page.locator('button:not([disabled])', { hasText: new RegExp(`^${label}$`) }).first().click();
  await page.locator(BOX).first().waitFor({ timeout: 30000 });
}
async function choose(page, run, stub, typed, stored, raw) {
  stub.row = { stored, raw };
  const box = page.locator(BOX).first();
  await box.fill('');
  await box.fill(typed);
  const opt = page.locator('[role="option"]', { hasText: stored }).first();
  await opt.waitFor({ timeout: 15000 });
  if (run.tag.startsWith('390')) await opt.tap(); else await opt.click();
}
const shot = async (page, run, name) => page.screenshot({ path: path.join(OUT, `xi400-${run.tag}-${name}.png`) });
const roleTile = async page => (await page.locator('button', { hasText: 'Role fit' }).first().innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
const overflow = page => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

const browser = await chromium.launch();
const errors = [];
for (const run of RUNS) {
  console.log(`--- ${run.tag}`);
  let ctx;
  try {
    ctx = await open(browser, run, errors);
    const { page, stub } = ctx;
    // 1. wrong side: a right back at LWB is still refused, nothing filled
    await tapSlot(page, 'LWB');
    await choose(page, run, stub, 'qzxwrong', 'Qzxwrong Fixture', 'Right-Back');
    await page.waitForTimeout(1500);
    const body1 = await page.locator('body').innerText();
    check(/Qzxwrong Fixture plays RB/.test(body1), `${run.tag}: a right back at LWB is refused with its reason`);
    check(await filledCount(page) === 0, `${run.tag}: the refused pick filled nothing (${await filledCount(page)}/11)`);
    await shot(page, run, '1-wrongside-refused');
    // 2. the same slot, a left back: filled, role fit stays 0 and all in place
    await choose(page, run, stub, 'qzxleft', 'Qzxleft Fixture', 'Left-Back');
    check(await waitCount(page, 1) === 1, `${run.tag}: the left back fills LWB (1/11)`);
    await tapSlot(page, 'RWB');
    await choose(page, run, stub, 'qzxright', 'Qzxright Fixture', 'Right-Back');
    check(await waitCount(page, 2) === 2, `${run.tag}: the right back fills RWB (2/11)`);
    const t2 = await roleTile(page);
    console.log(`  role tile with LB at LWB and RB at RWB: "${t2}"`);
    check(/Role fit 0 all in place/i.test(t2), `${run.tag}: role fit tile reads 0, all in place, with both full backs at wing back`);
    await page.locator('button', { hasText: 'Role fit' }).first().scrollIntoViewIfNeeded();
    await shot(page, run, '2-fullbacks-at-wingback');
    // 3. a CAM at CDM for contrast: next door, -0.2, one out of place, and the detail names only him
    await tapSlot(page, 'CDM');
    await choose(page, run, stub, 'qzxcam', 'Qzxcam Fixture', 'Attacking Midfield');
    check(await waitCount(page, 3) === 3, `${run.tag}: the CAM fills CDM (3/11)`);
    const t3 = await roleTile(page);
    console.log(`  role tile with a CAM at CDM too: "${t3}"`);
    check(/Role fit -0\.2 1 out of place/i.test(t3), `${run.tag}: role fit tile reads -0.2, 1 out of place`);
    await page.locator('button', { hasText: 'Role fit' }).first().click();
    const card = page.locator('p', { hasText: 'Before kick off' }).first().locator('xpath=..');
    const detail = (await card.innerText().catch(() => '')).replace(/\s+/g, ' ');
    console.log(`  role detail: "${detail.slice(0, 400)}"`);
    check(/Qzxcam Fixture, a CAM, next door to this slot\. 2 off him\./.test(detail), `${run.tag}: the detail names the CAM at CDM, 2 off him`);
    check(!/Qzxleft|Qzxright/.test(detail), `${run.tag}: the detail does not list either full back`);
    await shot(page, run, '3-rolefit-detail');
    await card.getByRole('button', { name: /Back/ }).first().click();
    check(await overflow(page) <= 1, `${run.tag}: no sideways scroll on the pitch screen (${await overflow(page)}px)`);
    // 4. the rest of the eleven, then review and submit
    let n = 3;
    for (const [label, typed, stored, raw] of REST) {
      await tapSlot(page, label);
      await choose(page, run, stub, typed, stored, raw);
      n += 1;
      if (!check(await waitCount(page, n) === n, `${run.tag}: ${stored} fills ${label} (${n}/11)`)) break;
    }
    await page.getByText('Submit Team').first().waitFor({ timeout: 20000 });
    const t4 = await roleTile(page);
    console.log(`  review role tile: "${t4}"`);
    check(/Role fit -0\.2 1 out of place/i.test(t4), `${run.tag}: the review card reads -0.2, 1 out of place`);
    await shot(page, run, '4-review');
    await page.getByText('Submit Team').first().click();
    await page.locator('h3', { hasText: 'Season Report' }).first().waitFor({ timeout: 30000 });
    const report = (await page.locator('h3', { hasText: 'Season Report' }).first().locator('xpath=ancestor::div[2]').innerText()).replace(/\s+/g, ' ');
    console.log(`  season report: "${report.slice(0, 700)}"`);
    check(/Role fit/i.test(report), `${run.tag}: the season report shows what role fit was worth`);
    await page.locator('h3', { hasText: 'Season Report' }).first().scrollIntoViewIfNeeded();
    await shot(page, run, '5-season-report');
    check(await overflow(page) <= 1, `${run.tag}: no sideways scroll on the result (${await overflow(page)}px)`);
    console.log(`  validator calls: ${stub.validator}`);
  } catch (e) {
    check(false, `${run.tag}: walk stopped: ${String(e.message).split('\n')[0]}`);
    if (ctx) await shot(ctx.page, run, '9-stopped').catch(() => {});
  }
  if (ctx) await ctx.context.close();
}
await browser.close();
check(errors.length === 0, `no page errors (${errors.length})${errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''}`);
console.log(failures ? `walkXi400 FAIL: ${failures} problems` : 'walkXi400 DONE: 0 problems');
process.exit(failures ? 1 : 0);
