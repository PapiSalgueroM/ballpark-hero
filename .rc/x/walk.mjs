// Review walk for Round 1522 (run lens). Sent as .rc/x/walk.mjs, run from the repo root on a #!serve runner.
// Plays the instructions the way a player would at 390x844 and 1280x900, reduced motion on and off.
import path from 'node:path';
import fs from 'node:fs';
import pw from '../../scripts/lib/playwrightLoader.mjs';
import { seedPages } from '../../scripts/lib/pageSeed.mjs';

const { chromium } = pw;
const BASE = process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173';
const OUT = process.env.RC_OUT || '/tmp/rv-out';
fs.mkdirSync(OUT, { recursive: true });
const KEY = 'dukb-club-manager-save';
let failures = 0, passes = 0;
const say = (ok, what) => { if (ok) { passes += 1; console.log(`  ok: ${what}`); } else { failures += 1; console.log(`  FAIL: ${what}`); } };
const note = what => console.log(`  note: ${what}`);
const pause = (page, ms) => page.waitForTimeout(ms);
const shot = async (page, name, full = false) => { await page.screenshot({ path: path.join(OUT, name), fullPage: full }).catch(e => note(`shot ${name}: ${e.message}`)); };
const visible = async loc => (await loc.count()) > 0 && await loc.first().isVisible().catch(() => false);
const fits = page => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
const button = (page, name) => page.locator('button:visible').filter({ hasText: new RegExp(`^\\s*${name}\\s*$`) }).first();
const stageIs = (page, v, timeout = 45000) => page.waitForFunction(x => [...document.querySelectorAll('[data-cm-live-stage]')].some(el => el.getAttribute('data-cm-live-stage') === x), v, { timeout });
const save = page => page.evaluate(k => { const r = localStorage.getItem(k); return r ? JSON.parse(r) : null; }, KEY).catch(() => null);
const DASH = new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`);
const truncated = (page, sel) => page.locator(sel).evaluateAll(els => els.filter(e => e.scrollWidth > e.clientWidth + 1).map(e => e.textContent.trim()));
const running = page => page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running').length).catch(() => -1);

async function dismissConsent(page) {
  for (const name of [/^\s*Essential only\s*$/, /^\s*(Reject|Decline)( all)?\s*$/i, /^\s*Save choices\s*$/]) {
    const b = page.locator('button:visible').filter({ hasText: name });
    if (await visible(b)) { await b.first().click({ timeout: 4000 }).catch(() => {}); await pause(page, 400); return; }
  }
}
async function toHub(ctx, club, errors) {
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(String(e).split('\n')[0]));
  await page.goto(`${BASE}/club-manager`, { waitUntil: 'networkidle' });
  await pause(page, 1500);
  await dismissConsent(page);
  const fresh = page.locator('text=Start Fresh');
  if (await fresh.count()) { await fresh.click(); await pause(page, 800); }
  await page.locator('button:has-text("2026-27")').first().click();
  await pause(page, 700);
  await page.locator('text=England').first().click();
  await pause(page, 700);
  await page.locator('button:has-text("Premier League")').first().click();
  await pause(page, 700);
  await dismissConsent(page);
  await page.locator(`button:has-text("${club}")`).first().click();
  await pause(page, 500);
  await dismissConsent(page);
  await page.locator('text=Take the job').click();
  await page.locator('button:has-text("Skip: just manage")').first().click({ timeout: 15000 }).catch(() => {});
  await page.locator('[data-cm-meters]').waitFor({ timeout: 30000 }).catch(() => {});
  return page;
}

const browser = await chromium.launch();
const combos = (process.env.COMBOS || '390:reduce,390:no-preference,1280:no-preference,1280:reduce').split(',').map(c => c.split(':'));
const MOTION = {};
for (const [w, motion] of combos) {
  const W = Number(w);
  const tag = `${W}-${motion === 'reduce' ? 'rm' : 'mo'}`;
  console.log(`\n== ${W} reduced motion ${motion}`);
  const errors = [];
  const ctx = await browser.newContext({ viewport: { width: W, height: W === 390 ? 844 : 900 }, reducedMotion: motion });
  await ctx.route(/supabase\.co/, r => r.abort());
  await seedPages(ctx, 1522);
  let page = null;
  try {
    page = await toHub(ctx, 'Arsenal', errors);
    // (a) the help block
    const q = page.locator('button[aria-label*="How to play" i], button[aria-label*="how to play" i], button:has-text("?")').first();
    await q.click({ timeout: 10000 }).catch(e => note(`help button: ${e.message.split('\n')[0]}`));
    await page.locator('[data-cm-help="instructions"]').first().waitFor({ timeout: 15000 }).catch(() => {});
    const help = ((await page.locator('[data-cm-help="instructions"]').first().innerText().catch(() => '')) || '').replace(/\s+/g, ' ');
    say(help.length > 200 && !DASH.test(help), `${tag}: the help's instructions block reads (${help.length} chars, no dash)`);
    console.log(`    help: ${help.slice(0, 900)}`);
    await page.locator('[data-cm-help="instructions"]').first().scrollIntoViewIfNeeded().catch(() => {});
    await shot(page, `help-${tag}.png`);
    await page.keyboard.press('Escape').catch(() => {});
    await pause(page, 500);
    // (b) the Tactics tab
    await page.getByRole('tab', { name: /Tactics/ }).first().click({ timeout: 10000 });
    await page.locator('[data-cm-instr-open="tab"]').waitFor({ timeout: 15000 });
    await page.locator('[data-cm-instr-open="tab"]').scrollIntoViewIfNeeded();
    await shot(page, `tab-folded-${tag}.png`);
    await page.locator('[data-cm-instr-open="tab"]').click();
    await page.locator('[data-cm-instructions="tab"]').waitFor({ timeout: 15000 });
    for (const sel of ['tab:press:1', 'tab:tempo:-1', 'tab:width:1', 'tab:line:1']) { await page.locator(`[data-cm-instr-btn="${sel}"]`).click(); await pause(page, 300); }
    const s1 = await save(page);
    say(JSON.stringify(s1?.instructions) === JSON.stringify({ press: 1, tempo: -1, width: 1, line: 1 }), `${tag}: the save holds the four taps (${JSON.stringify(s1?.instructions)})`);
    const cut = await truncated(page, '[data-cm-instr-btn], [data-cm-instr-line]');
    say(cut.length === 0, `${tag}: no instruction tile or line is cut off (${cut.join(' | ')})`);
    say(await fits(page), `${tag}: the Tactics tab is no wider than the screen`);
    await page.locator('[data-cm-instructions="tab"]').scrollIntoViewIfNeeded();
    await shot(page, `tab-open-${tag}.png`);
    const tabText = ((await page.locator('[data-cm-instructions="tab"]').innerText()) || '');
    say(!DASH.test(tabText), `${tag}: no dash in the picker`);
    console.log(`    picker: ${tabText.replace(/\s+/g, ' ').slice(0, 700)}`);
    // (c) the Match Centre
    await page.getByRole('tab', { name: 'Home', exact: true }).first().click({ timeout: 8000 }).catch(() => {});
    await pause(page, 600);
    await page.locator('button:visible').filter({ hasText: 'Match Centre: form' }).first().click({ timeout: 20000 });
    await page.locator('[data-cm-mc-style]').waitFor({ timeout: 20000 }).catch(() => {});
    const mcStyle = await page.locator('[data-cm-mc-style]').getAttribute('data-cm-mc-style').catch(() => null);
    const mcText = ((await page.locator('[data-cm-mc-style]').innerText().catch(() => '')) || '').trim();
    say(!!mcStyle && /They play /.test(mcText), `${tag}: the Match Centre names their style (${mcStyle}: "${mcText}")`);
    await page.locator('[data-cm-mc-style]').scrollIntoViewIfNeeded().catch(() => {});
    await shot(page, `centre-${tag}.png`);
    globalThis.__mc = mcStyle;
    // (d) live, first half: a change in play from the sheet
    await page.locator('button:visible[data-cm-way="live"]').first().click({ timeout: 20000 });
    await stageIs(page, 'first');
    await pause(page, 2500);
    MOTION[`${tag}-first`] = await running(page);
    await page.locator('[data-cm-dot]:not([data-cm-dot=""])').nth(3).click({ timeout: 10000 });
    await page.locator('[data-cm-live-sheet]').waitFor({ timeout: 10000 });
    await page.locator('[data-cm-live-tactics-toggle]').first().click();
    await pause(page, 400);
    await page.locator('[data-cm-instr-btn="sheet:line:-1"]').click();
    await pause(page, 500);
    const s2 = await save(page);
    const l2 = s2?.live?.instrLog ?? [];
    const last2 = l2[l2.length - 1];
    say(!!last2 && last2.minute < 45 && last2.instructions.line === -1, `${tag}: a deep line taken in the first half is logged in play (${JSON.stringify(last2)})`);
    say(await fits(page), `${tag}: the live sheet fits the screen`);
    await shot(page, `sheet-first-${tag}.png`);
    await page.locator('[data-cm-live-sheet] button[aria-label="Close"]').first().click().catch(() => {});
    // (e) the interval: the dressing room's Tactics
    await button(page, 'Skip').click({ timeout: 20000 });
    await stageIs(page, 'interval');
    await pause(page, 800);
    await shot(page, `interval-${tag}.png`);
    await page.locator('[data-cm-ht-tactics-open]').click({ timeout: 10000 });
    await page.locator('[data-cm-ht-tactics]').waitFor({ timeout: 10000 });
    const htOn = await page.evaluate(() => [...document.querySelectorAll('[data-cm-instr-btn][aria-pressed="true"]')].map(e => e.getAttribute('data-cm-instr-btn')));
    say(htOn.includes('ht:line:-1') && htOn.includes('ht:press:1'), `${tag}: the dressing room opens on what is in force now (${htOn.join(' ')})`);
    await page.locator('[data-cm-instr-btn="ht:width:-1"]').click();
    await pause(page, 400);
    const cut2 = await truncated(page, '[data-cm-ht-tactics] [data-cm-instr-btn], [data-cm-ht-tactics] [data-cm-instr-line]');
    say(cut2.length === 0 && await fits(page), `${tag}: the dressing room's tactics fit, nothing cut off (${cut2.join(' | ')})`);
    await shot(page, `ht-tactics-${tag}.png`);
    await shot(page, `ht-tactics-full-${tag}.png`, true);
    await page.locator('button:visible').filter({ hasText: 'Back to the dressing room' }).first().click({ timeout: 8000 });
    await button(page, 'Second half').click({ timeout: 30000 });
    await stageIs(page, 'second');
    await pause(page, 2500);
    MOTION[`${tag}-second`] = await running(page);
    await shot(page, `second-${tag}.png`);
    // (f) the whistle and the report
    for (let i = 0; i < 8; i++) {
      const full = button(page, 'Full report');
      if (await visible(full)) { await full.click(); break; }
      const skip = button(page, 'Skip');
      if (await visible(skip)) await skip.click().catch(() => {});
      await pause(page, 2500);
    }
    await page.locator('[data-cm-report-tactics]').waitFor({ timeout: 30000 }).catch(() => {});
    const block = ((await page.locator('[data-cm-report-tactics]').innerText().catch(() => '')) || '').replace(/\s+/g, ' ');
    const theirs = await page.locator('[data-cm-report-tactics]').getAttribute('data-cm-report-tactics').catch(() => null);
    console.log(`    report block: ${block}`);
    say(theirs === globalThis.__mc, `${tag}: the report's style is the Match Centre's (${theirs} and ${globalThis.__mc})`);
    const ofs = [...block.matchAll(/(\d+) of (\d+)/g)].map(m => [Number(m[1]), Number(m[2])]);
    say(ofs.length === 2 && ofs.every(([a, b]) => a <= b), `${tag}: the "x of y" lines hold x at most y (${JSON.stringify(ofs)})`);
    say(!DASH.test(block), `${tag}: no dash in the report block`);
    await page.locator('[data-cm-report-tactics]').scrollIntoViewIfNeeded().catch(() => {});
    await shot(page, `report-${tag}.png`);
    const rep = await page.evaluate(() => [...document.querySelectorAll('*')].filter(e => /^\s*(Goals|Timeline|Penalty|pen)\b/i.test(e.textContent || '') && e.children.length === 0).length).catch(() => 0);
    note(`${tag}: report leaf labels ${rep}`);
    // (g) after the match, the standing plan is the one set on the tab
    const s3 = await save(page);
    say(JSON.stringify(s3?.instructions) === JSON.stringify({ press: 1, tempo: -1, width: 1, line: 1 }), `${tag}: after the match the standing plan is unmoved (${JSON.stringify(s3?.instructions)})`);
    const det = s3?.lastReport?.detail?.tactics ?? null;
    if (det) note(`${tag}: saved report tactics ${JSON.stringify(det).slice(0, 300)}`);
  } catch (e) {
    say(false, `${tag}: the walk stopped: ${String(e).split('\n')[0]}`);
    if (page) await shot(page, `stopped-${tag}.png`);
  }
  say(errors.length === 0, `${tag}: no page errors (${errors.slice(0, 3).join(' | ')})`);
  await ctx.close();
}
await browser.close();
console.log(`    motion (running animations): ${JSON.stringify(MOTION)}`);
console.log(failures ? `reviewWalk: RED (${failures} failures, ${passes} passed)` : `reviewWalk: all green (${passes} checks)`);
process.exit(failures ? 1 : 0);
