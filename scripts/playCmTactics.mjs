/**
 * Club Manager team instructions on the screens (Round 1522), at 390 by 844 and 1280 by 900.
 *
 *   (t) The Tactics tab draws four instruction rows (pressing, tempo, width, line) of three tiles each, Balanced
 *       pressed on a new career. A high press and a deep line are tapped: the save holds exactly those two, the
 *       page neither jumps (scrollY the same after each tap) nor runs wider than the screen, every tile is at
 *       least 24 px tall, and each row's line says what the setting does and, off balanced, what it costs.
 *   (r) A reload keeps the two settings on the save and on the tab.
 *   (p) The Match Centre names the other side's style.
 *   (h) Play Live, Skip to the interval: the dressing room's Tactics tile opens tonight's panel; a direct tempo and
 *       a new formation are taken at 46 (the save's instruction log and shape change say so), the tab's standing
 *       plan does not move, and the panel fits the screen.
 *   (l) Second half: a tap on one of my men opens the change sheet, its Tactics from here opens the panel, wide
 *       play and a duty are taken at the minute on the clock (after 46); a reload lands back in the viewer with
 *       the log and the shape changes intact.
 *   (f) Skip to the whistle and the full report: the instructions block names the day and prints the six numbers.
 *
 * The database host is blocked; the page plays on a seeded stream (TACTICS_SEED, scripts/lib/pageSeed.mjs).
 * Pictures of each step go to $RC_OUT when it is set.
 *
 *   #!serve #!playwright then: node scripts/playCmTactics.mjs        (WIDTHS=390)
 * Exit 0 green, 1 red, 2 could not run.
 */
import path from 'node:path';
import pw from './lib/playwrightLoader.mjs';
import { pageSeedOf, seedPages } from './lib/pageSeed.mjs';

const { chromium } = pw;
const BASE = process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173';
const OUT = process.env.RC_OUT || '';
let SEED = 0;
try { SEED = pageSeedOf(import.meta.url, process.env.TACTICS_SEED); } catch (e) { console.error(`TACTICS_SEED: ${e.message}`); process.exit(2); }
const HEIGHTS = { 390: 844, 1280: 900 };
const WIDTHS = (process.env.WIDTHS || '390,1280').split(',').map(Number);
console.log(`playCmTactics: seed ${SEED} (replay with TACTICS_SEED=${SEED}), widths ${WIDTHS.join(', ')}`);
const KEY = 'dukb-club-manager-save';
let failures = 0, passes = 0;
const say = (ok, what) => { if (ok) { passes += 1; console.log(`  ok: ${what}`); } else { failures += 1; console.log(`  FAIL: ${what}`); } };
const errors = [];
const pause = (page, ms) => page.waitForTimeout(ms);
const shot = async (page, name) => { if (OUT) await page.screenshot({ path: path.join(OUT, name) }).catch(() => {}); };
const readSave = page => page.evaluate(key => {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  const c = JSON.parse(raw);
  return {
    instructions: c.instructions ?? null, formationIndex: c.formationIndex,
    live: c.live ? { instrLog: c.live.instrLog ?? null, formChanges: c.live.formChanges ?? null, formationIndex: c.live.formationIndex, duties: c.live.duties ?? null, minute: c.live.minute ?? null } : null,
    played: c.careerStats?.played ?? null,
  };
}, KEY).catch(() => null);
const fits = page => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
const visible = async loc => (await loc.count()) > 0 && await loc.first().isVisible().catch(() => false);
const pressed = page => page.evaluate(() => [...document.querySelectorAll('[data-cm-instr-btn][aria-pressed="true"]')].map(e => e.getAttribute('data-cm-instr-btn')));

const browser = await chromium.launch();
async function newCtx(vp) {
  const ctx = await browser.newContext({ viewport: vp });
  await ctx.route(/supabase\.co/, r => r.abort());
  await seedPages(ctx, SEED);
  return ctx;
}
/** A fresh start: 2026-27, England, the Premier League, Brentford, Skip the Dugout step, to the hub. */
async function toHub(ctx) {
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(`${BASE}/club-manager`, { waitUntil: 'networkidle' });
  await pause(page, 1500);
  const fresh = page.locator('text=Start Fresh');
  if (await fresh.count()) { await fresh.click(); await pause(page, 800); }
  await page.locator('button:has-text("2026-27")').first().click();
  await pause(page, 700);
  await page.locator('text=England').first().click();
  await pause(page, 700);
  await page.locator('button:has-text("Premier League")').first().click();
  await pause(page, 700);
  const essential = page.locator('button:has-text("Essential only")');
  if (await essential.count()) { await essential.click(); await pause(page, 400); }
  await page.locator('button:has-text("Brentford")').first().click();
  await pause(page, 500);
  await page.locator('text=Take the job').click();
  await page.locator('button:has-text("Skip: just manage")').first().click({ timeout: 15000 }).catch(() => {});
  await page.locator('[data-cm-meters]').waitFor({ timeout: 30000 }).catch(() => {});
  return page;
}
/** Back into the career after a reload. */
async function resume(page) {
  await page.reload({ waitUntil: 'networkidle' });
  await pause(page, 1500);
  const again = page.locator('button:visible').filter({ hasText: /^(Resume|Continue)/ });
  if (await visible(again)) { await again.first().click({ timeout: 5000 }).catch(() => {}); await pause(page, 1500); }
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const tap = async (page, sel) => { await page.locator(sel).first().click({ timeout: 8000 }); await pause(page, 350); };
const button = (page, name) => page.locator('button:visible').filter({ hasText: new RegExp(`^\\s*${name}\\s*$`) }).first();
const stageIs = (page, value, timeout = 45000) => page.waitForFunction(v => [...document.querySelectorAll('[data-cm-live-stage]')]
  .some(el => el.getAttribute('data-cm-live-stage') === v), value, { timeout });

for (const W of WIDTHS) {
  const vp = { width: W, height: HEIGHTS[W] ?? 900 };
  console.log(`\n== ${vp.width} by ${vp.height}`);
  const ctx = await newCtx(vp);
  const page = await toHub(ctx);
  try {
    /* (t) the Tactics tab */
    await page.getByRole('tab', { name: /Tactics/ }).first().click({ timeout: 10000 });
    await page.locator('[data-cm-instructions="tab"]').waitFor({ timeout: 15000 });
    const rows = await page.locator('[data-cm-instructions="tab"] [data-cm-instr-row]').count();
    const start = await pressed(page);
    say(rows === 4 && same(start, ['tab:press:0', 'tab:tempo:0', 'tab:width:0', 'tab:line:0']), `${W}: the tab draws four instruction rows, balanced pressed (${start.join(' ')})`);
    await page.locator('[data-cm-instructions="tab"]').scrollIntoViewIfNeeded();
    const y0 = await page.evaluate(() => window.scrollY);
    await tap(page, '[data-cm-instr-btn="tab:press:1"]');
    const y1 = await page.evaluate(() => window.scrollY);
    await tap(page, '[data-cm-instr-btn="tab:line:-1"]');
    const y2 = await page.evaluate(() => window.scrollY);
    const s1 = await readSave(page);
    say(same(s1?.instructions, { press: 1, tempo: 0, width: 0, line: -1 }), `${W}: the save holds a high press and a deep line (${JSON.stringify(s1?.instructions)})`);
    say(y0 === y1 && y1 === y2, `${W}: the page does not jump on a tap (scrollY ${y0}, ${y1}, ${y2})`);
    say(await fits(page), `${W}: the tactics tab is no wider than the screen`);
    const tile = await page.locator('[data-cm-instr-btn]').evaluateAll(els => Math.min(...els.map(e => e.getBoundingClientRect().height)));
    say(tile >= 24, `${W}: every instruction tile is at least 24 px tall (${tile.toFixed(1)})`);
    const line = ((await page.locator('[data-cm-instructions="tab"] [data-cm-instr-line="press"]').innerText()) || '').trim();
    say(/Cost:/.test(line) && line.length > 40, `${W}: the press row says what it does and what it costs ("${line.slice(0, 70)}...")`);
    await shot(page, `tactics-${W}.png`);

    /* (r) a reload keeps them */
    await resume(page);
    await page.getByRole('tab', { name: /Tactics/ }).first().click({ timeout: 10000 }).catch(() => {});
    await page.locator('[data-cm-instructions="tab"]').waitFor({ timeout: 15000 }).catch(() => {});
    const after = await pressed(page);
    const s2 = await readSave(page);
    say(same(s2?.instructions, { press: 1, tempo: 0, width: 0, line: -1 }) && after.includes('tab:press:1') && after.includes('tab:line:-1'), `${W}: a reload keeps both on the save and the tab (${after.join(' ')})`);

    /* (p) the Match Centre names their style */
    await page.getByRole('tab', { name: 'Home', exact: true }).first().click({ timeout: 8000 }).catch(() => {});
    await pause(page, 600);
    await page.locator('button:visible').filter({ hasText: 'Match Centre: form' }).first().click({ timeout: 20000 });
    await page.locator('[data-cm-mc-style]').waitFor({ timeout: 20000 }).catch(() => {});
    const style = ((await page.locator('[data-cm-mc-style]').innerText().catch(() => '')) || '').trim();
    say(/They play /.test(style), `${W}: the Match Centre names their style ("${style.slice(0, 60)}")`);
    await shot(page, `centre-${W}.png`);

    /* (h) Play Live, Skip to the interval, the dressing room's Tactics */
    await page.locator('button:visible[data-cm-way="live"]').first().click({ timeout: 20000 });
    await stageIs(page, 'first');
    await button(page, 'Skip').click({ timeout: 20000 });
    await stageIs(page, 'interval');
    await tap(page, '[data-cm-ht-tactics-open]');
    await page.locator('[data-cm-ht-tactics]').waitFor({ timeout: 10000 });
    const htStart = await pressed(page);
    say(same(htStart, ['ht:press:1', 'ht:tempo:0', 'ht:width:0', 'ht:line:-1']), `${W}: tonight's panel opens on the standing plan (${htStart.join(' ')})`);
    await tap(page, '[data-cm-instr-btn="ht:tempo:1"]');
    const sel = page.locator('[data-cm-live-formation="ht"]');
    const now = Number(await sel.inputValue());
    await sel.selectOption(String(now === 1 ? 2 : 1));
    await pause(page, 500);
    const s3 = await readSave(page);
    const last = s3?.live?.instrLog?.[s3.live.instrLog.length - 1];
    say(!!last && last.minute === 46 && last.instructions.tempo === 1 && last.instructions.press === 1, `${W}: a direct tempo is logged at 46 on top of the plan (${JSON.stringify(last)})`);
    say((s3?.live?.formChanges?.length ?? 0) === 1 && s3.live.formationIndex === (now === 1 ? 2 : 1) && s3.formationIndex === now, `${W}: the formation changes for tonight only (live ${s3?.live?.formationIndex}, tab ${s3?.formationIndex})`);
    say(same(s3?.instructions, { press: 1, tempo: 0, width: 0, line: -1 }), `${W}: the standing plan does not move`);
    say(await fits(page), `${W}: the dressing room's tactics fit the screen`);
    await shot(page, `halftime-${W}.png`);
    await page.locator('button:visible').filter({ hasText: 'Back to the dressing room' }).first().click({ timeout: 8000 });

    /* (l) second half: a man's sheet, Tactics from here */
    await button(page, 'Second half').click({ timeout: 30000 });
    await stageIs(page, 'second');
    await pause(page, 2500);
    await page.locator('[data-cm-dot]:not([data-cm-dot=""])').nth(4).click({ timeout: 10000 });
    await page.locator('[data-cm-live-sheet]').waitFor({ timeout: 10000 });
    await tap(page, '[data-cm-live-tactics-toggle]');
    await tap(page, '[data-cm-instr-btn="sheet:width:1"]');
    await tap(page, '[data-cm-live-duties-toggle="sheet"]');
    const dutySel = page.locator('[data-cm-live-duty="sheet:1"]');
    const options = await dutySel.locator('option').evaluateAll(els => els.map(e => e.value));
    const current = await dutySel.inputValue();
    const pick = options.find(o => o && o !== current);
    if (pick) await dutySel.selectOption(pick);
    await pause(page, 500);
    const s5 = await readSave(page);
    const wide = s5?.live?.instrLog?.[s5.live.instrLog.length - 1];
    say(!!wide && wide.minute > 46 && wide.instructions.width === 1 && wide.instructions.tempo === 1, `${W}: wide play is logged in play (${JSON.stringify(wide)})`);
    say(!!pick && s5?.live?.duties?.[1] === pick && (s5?.live?.formChanges?.length ?? 0) === 2, `${W}: a duty changes in play (${pick} at slot 1)`);
    say(await fits(page), `${W}: the change sheet fits the screen`);
    await shot(page, `sheet-${W}.png`);
    await page.locator('[data-cm-live-sheet] button[aria-label="Close"]').first().click().catch(() => {});

    /* a reload mid second half lands back in the viewer with tonight's log intact */
    await resume(page);
    await page.locator('[data-cm-live-stage]').first().waitFor({ timeout: 30000 }).catch(() => {});
    const s6 = await readSave(page);
    say(same(s6?.live?.instrLog, s5?.live?.instrLog) && (s6?.live?.formChanges?.length ?? 0) === 2 && (await page.locator('[data-cm-live-stage]').count()) > 0, `${W}: a reload in the second half keeps tonight's changes and the viewer`);

    /* (f) the whistle and the full report */
    for (let i = 0; i < 6; i++) {
      const fullReport = button(page, 'Full report');
      if (await visible(fullReport)) { await fullReport.click(); break; }
      const skip = button(page, 'Skip');
      if (await visible(skip)) await skip.click().catch(() => {});
      await pause(page, 2500);
    }
    await page.locator('[data-cm-report-tactics]').waitFor({ timeout: 30000 }).catch(() => {});
    const block = ((await page.locator('[data-cm-report-tactics]').innerText().catch(() => '')) || '').replace(/\s+/g, ' ');
    const tacRows = await page.locator('[data-cm-report-tac]').count();
    say(tacRows === 6 && /They played/.test(block) && /High press/.test(block), `${W}: the report's instructions block names the day and prints six numbers ("${block.slice(0, 90)}")`);
    await shot(page, `report-${W}.png`);
  } catch (e) {
    say(false, `${W}: the walk stopped: ${String(e).split('\n')[0]}`);
    await shot(page, `stopped-${W}.png`);
  }
  await ctx.close();
}
await browser.close();
say(errors.length === 0, `no page errors (${errors.slice(0, 2).join(' | ')})`);
console.log(failures ? `playCmTactics: RED (${failures} failures, ${passes} passed)` : `playCmTactics: all green (${passes} checks)`);
process.exit(failures ? 1 : 0);
