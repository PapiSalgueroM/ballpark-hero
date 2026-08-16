/**
 * Round 114 guard: the Club Manager tactics pitch, driven for real.
 *
 * The owner asked for two things twice: "you can't drag the players on the
 * tactics side" and "I would love to see an animation or something for when u
 * click defensive or balanced or attacking". A harness that only proves the
 * page still loads proves nothing about either, so this one performs actual
 * gestures and reads actual rendered values back out of the browser.
 *
 * What it proves, per engine:
 *   1. a real mouse drag from one spot to another swaps the two players
 *   2. the dragged token follows the pointer while the drag is happening
 *   3. a TOUCH pointer sequence does the same thing, because the phone is
 *      most of the traffic and mouse only handlers would be useless there
 *   4. the swap lands in career state, not just in the pixels
 *   5. switching mentality MOVES the shape: every token's rendered transform
 *      changes, the back line climbs on attacking and drops on defensive
 *   6. the movement rides a CSS transition on transform, nothing else
 *   7. prefers-reduced-motion turns the slide into a jump
 *   8. tapping without moving still opens the old picker, so the non drag
 *      fallback is intact
 *
 * Serve the production build first:
 *   npm run build && npx serve -s dist -l 4173
 * Then: node scripts/simTactics.mjs
 * ENGINES=chromium narrows it while iterating.
 */
import pw from '/home/claude/.npm-global/lib/node_modules/playwright/index.js';
const { chromium, webkit } = pw;

const BASE = process.env.SWEEP_BASE || 'http://127.0.0.1:4173';
const ENGINES = { chromium, webkit };
const wantEngines = (process.env.ENGINES || 'chromium,webkit').split(',').map(s => s.trim()).filter(e => ENGINES[e]);

const fails = [];
const check = (ok, label, detail) => {
  if (ok) console.log(`   ok   ${label}${detail ? `  ${detail}` : ''}`);
  else { fails.push(`${label} :: ${detail}`); console.log(`   FAIL ${label}  ${detail}`); }
};

const launch = (name) => name === 'chromium'
  ? chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--no-proxy-server'] })
  : webkit.launch();

/** Walk a fresh save all the way to the tactics pitch. */
async function openTactics(ctx) {
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).split('\n')[0].slice(0, 160)));
  await page.goto(`${BASE}/club-manager`, { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForTimeout(1400);
  await page.getByRole('button', { name: /essential only|accept/i }).first().click({ timeout: 2000 }).catch(() => {});
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: /Start Fresh/i }).first().click({ timeout: 1500 }).catch(() => {});
  /* Round 132: the picker asks WHEN before it asks where. This wants the real
     current squads, so it takes the 2026-27 tile. */
  await page.getByRole('button', { name: /2026-27/ }).first().click({ timeout: 6000 }).catch(() => {});
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: /Spain/ }).first().click({ timeout: 6000 });
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: /La Liga/ }).first().click({ timeout: 6000 });
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: /Real Madrid/ }).first().click({ timeout: 6000 });
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: /Take the job/i }).first().click({ timeout: 6000 });
  await page.waitForTimeout(1100);
  await page.getByRole('tab', { name: /Tactics/i }).click({ timeout: 6000 });
  await page.waitForTimeout(800);
  await page.locator('[data-cm-pitch]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  return { page, errs };
}

const readTokens = (page) => page.$$eval('[data-cm-slot]', els => els.map(e => ({
  slot: Number(e.dataset.cmSlot),
  name: e.dataset.cmName,
  pid: e.dataset.cmPid,
  shift: e.dataset.cmShift,
  transform: getComputedStyle(e).transform,
  duration: getComputedStyle(e).transitionDuration,
  property: getComputedStyle(e).transitionProperty,
  touchAction: getComputedStyle(e).touchAction,
})));

const readDefLine = (page) => page.$eval('[data-cm-defline]', e => Number(e.dataset.cmDefline));
const readMentality = (page) => page.$eval('[data-cm-pitch]', e => e.dataset.cmMentality);
/** The y translate out of a matrix, which is where the token actually sits. */
const ty = (m) => { const p = m.replace(/matrix\(|\)/g, '').split(','); return Number(p[5]); };
const tx = (m) => { const p = m.replace(/matrix\(|\)/g, '').split(','); return Number(p[4]); };

const centreOf = (page, slot) => page.$eval(`[data-cm-slot="${slot}"]`, e => {
  const r = e.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
});

for (const engine of wantEngines) {
  console.log(`\n================ ${engine} ================`);
  const browser = await launch(engine);

  /* ---------- 1. real pointer drag with a mouse ---------- */
  console.log('\n1) Dragging a player across the pitch with a real pointer');
  {
    const ctx = await browser.newContext({ viewport: { width: 430, height: 900 }, hasTouch: true });
    const { page, errs } = await openTactics(ctx);
    const before = await readTokens(page);
    check(before.length === 11, 'eleven tokens on the pitch', `${before.length} found`);
    check(before.every(t => t.touchAction === 'none'), 'every token sets touch-action none so the phone does not scroll instead',
      `${before.filter(t => t.touchAction === 'none').length}/11`);

    const FROM = 9, TO = 6;
    const a = await centreOf(page, FROM);
    const b = await centreOf(page, TO);
    const startName = before[FROM].name, targetName = before[TO].name;

    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    let midTransform = '';
    for (let i = 1; i <= 8; i++) {
      await page.mouse.move(a.x + ((b.x - a.x) * i) / 8, a.y + ((b.y - a.y) * i) / 8);
      if (i === 5) {
        midTransform = await page.$eval(`[data-cm-slot="${FROM}"]`, e => getComputedStyle(e).transform);
        const still = await page.$eval(`[data-cm-slot="${FROM}"]`, e => getComputedStyle(e).transitionDuration);
        check(still === '0s', 'the lifted token has no transition so it tracks the finger 1 to 1', `duration ${still}`);
      }
    }
    const travelled = Math.abs(ty(midTransform) - ty(before[FROM].transform));
    check(travelled > 40, 'the token actually moves under the pointer mid drag', `${Math.round(travelled)}px down the pitch`);

    const hint = await page.$eval('[data-cm-hint]', e => e.innerText.trim());
    check(/drop to swap/i.test(hint), 'the pitch tells you what the drop will do', `"${hint}"`);

    await page.mouse.up();
    await page.waitForTimeout(600);
    const after = await readTokens(page);
    check(after[FROM].name === targetName && after[TO].name === startName,
      'mouse drag swapped the two players',
      `slot ${FROM} ${startName} -> ${after[FROM].name}, slot ${TO} ${targetName} -> ${after[TO].name}`);
    check(after[FROM].pid === before[TO].pid && after[TO].pid === before[FROM].pid,
      'the swap moved the real player ids, not just the labels',
      `${after[FROM].pid} / ${after[TO].pid}`);

    // The picker must NOT have opened on the click that ends every drag.
    check((await page.locator('[role="dialog"]:visible').count()) === 0,
      'the drag does not leave the picker dialog open behind it', 'no dialog');

    /* ---------- 2. the swap is in state, not just in the pixels ---------- */
    await page.getByRole('tab', { name: /Squad/i }).click({ timeout: 5000 });
    await page.waitForTimeout(500);
    await page.getByRole('tab', { name: /Tactics/i }).click({ timeout: 5000 });
    await page.waitForTimeout(700);
    const remount = await readTokens(page);
    check(remount[FROM].name === targetName && remount[TO].name === startName,
      'the swap survives leaving the tab and coming back, so it is in career state',
      `slot ${FROM} ${remount[FROM].name}, slot ${TO} ${remount[TO].name}`);

    /* ---------- 3. touch ---------- */
    console.log('\n2) The same drag as a touch gesture, which is what his traffic actually uses');
    const T_FROM = 1, T_TO = 8;
    const t0 = await readTokens(page);
    const ta = await centreOf(page, T_FROM);
    const tb = await centreOf(page, T_TO);
    // One dispatch per round trip on purpose. Firing the whole gesture inside
    // a single evaluate lets React batch every update into one render, so the
    // token never repaints mid drag and the test would be measuring nothing.
    const touch = (type, x, y) => page.evaluate(({ slot, type, x, y }) => {
      const el = document.querySelector(`[data-cm-slot="${slot}"]`);
      el.dispatchEvent(new PointerEvent(type, {
        bubbles: true, cancelable: true, composed: true,
        pointerId: 71, pointerType: 'touch', isPrimary: true,
        clientX: x, clientY: y, buttons: type === 'pointerup' ? 0 : 1,
      }));
    }, { slot: T_FROM, type, x, y });
    await touch('pointerdown', ta.x, ta.y);
    let touchMid = '';
    for (let i = 1; i <= 8; i++) {
      await touch('pointermove', ta.x + ((tb.x - ta.x) * i) / 8, ta.y + ((tb.y - ta.y) * i) / 8);
      await page.waitForTimeout(40);
      if (i === 4) touchMid = await page.$eval(`[data-cm-slot="${T_FROM}"]`, e => getComputedStyle(e).transform);
    }
    check(touchMid !== t0[T_FROM].transform, 'the token tracked the touch point mid gesture',
      `moved ${Math.round(Math.abs(ty(touchMid) - ty(t0[T_FROM].transform)))}px under the finger`);
    await touch('pointerup', tb.x, tb.y);
    await page.waitForTimeout(600);
    const t1 = await readTokens(page);
    check(t1[T_FROM].name === t0[T_TO].name && t1[T_TO].name === t0[T_FROM].name,
      'touch pointer drag swapped the two players',
      `slot ${T_FROM} ${t0[T_FROM].name} -> ${t1[T_FROM].name}, slot ${T_TO} ${t0[T_TO].name} -> ${t1[T_TO].name}`);

    /* ---------- 4. the non drag fallback still works ---------- */
    console.log('\n3) The old tap to pick path, which has to keep working for anyone who cannot drag');
    await page.locator('[data-cm-slot="2"]').click({ timeout: 5000 });
    await page.waitForTimeout(600);
    const dlg = await page.locator('[role="dialog"]').first().innerText().catch(() => '');
    check(/pick your/i.test(dlg), 'a tap with no movement still opens the squad picker', `"${dlg.split('\n')[0]}"`);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);

    check(errs.length === 0, 'no exceptions thrown while dragging', errs[0] || 'clean');
    await ctx.close();
  }

  /* ---------- 5. the mentality animation ---------- */
  console.log('\n4) Switching mentality moves the shape');
  {
    const ctx = await browser.newContext({ viewport: { width: 430, height: 900 }, hasTouch: true });
    const { page, errs } = await openTactics(ctx);

    const balanced = await readTokens(page);
    const balancedLine = await readDefLine(page);
    check((await readMentality(page)) === 'balanced', 'a fresh save opens on balanced', `balanced line at ${balancedLine}%`);
    check(balanced.every(t => t.property === 'transform'), 'the shape is animated on transform and nothing else',
      `transition-property ${balanced[0].property}`);
    check(balanced.every(t => parseFloat(t.duration) > 0.1), 'the transition has a real duration', `${balanced[0].duration}`);

    await page.locator('[data-cm-mentality-btn="attacking"]').click({ timeout: 5000 });
    await page.waitForTimeout(900);
    const attacking = await readTokens(page);
    const attackingLine = await readDefLine(page);
    const moved = attacking.filter((t, i) => t.transform !== balanced[i].transform).length;
    check(moved === 11, 'every one of the eleven moved when attacking was picked', `${moved}/11 transforms changed`);
    check(attackingLine < balancedLine - 5, 'the back line stepped up the pitch', `${balancedLine}% -> ${attackingLine}%`);
    const backUp = [1, 2, 3, 4].every(i => ty(attacking[i].transform) < ty(balanced[i].transform) - 20);
    check(backUp, 'each defender is at least 20px higher than he was',
      `RB moved ${Math.round(ty(balanced[1].transform) - ty(attacking[1].transform))}px up`);
    // The matrix carries a -50% centring offset, so only the DELTA means anything.
    const rwOut = tx(attacking[8].transform) - tx(balanced[8].transform);
    const lwOut = tx(attacking[10].transform) - tx(balanced[10].transform);
    check(rwOut > 8 && lwOut < -8, 'the wide players pushed out toward the touchlines',
      `right winger ${Math.round(rwOut)}px right, left winger ${Math.round(lwOut)}px left`);

    await page.locator('[data-cm-mentality-btn="defensive"]').click({ timeout: 5000 });
    await page.waitForTimeout(900);
    const defensive = await readTokens(page);
    const defensiveLine = await readDefLine(page);
    check(defensiveLine > balancedLine + 2, 'the back line dropped back off balanced', `${balancedLine}% -> ${defensiveLine}%`);
    check(defensiveLine > attackingLine + 10, 'the deep block sits a long way behind the high line', `${attackingLine}% vs ${defensiveLine}%`);
    const frontDropped = ty(defensive[9].transform) - ty(balanced[9].transform);
    check(frontDropped > 40, 'the striker came back to make the block compact', `${Math.round(frontDropped)}px deeper`);
    const rwIn = tx(defensive[8].transform) - tx(balanced[8].transform);
    check(rwIn < -8, 'and the wide men tucked in', `right winger ${Math.round(rwIn)}px narrower`);
    const label = await page.$eval('[data-cm-defline]', e => e.innerText.trim());
    check(/low block/i.test(label), 'the line is labelled in plain football', `"${label}"`);

    await page.locator('[data-cm-mentality-btn="balanced"]').click({ timeout: 5000 });
    await page.waitForTimeout(900);
    const back = await readTokens(page);
    check(back.every((t, i) => t.transform === balanced[i].transform), 'balanced puts everyone exactly back where they started', 'all 11 match');

    check(errs.length === 0, 'no exceptions thrown while switching mentality', errs[0] || 'clean');
    await ctx.close();
  }

  /* ---------- 6. reduced motion ---------- */
  console.log('\n5) prefers-reduced-motion jumps instead of sliding');
  {
    const ctx = await browser.newContext({ viewport: { width: 430, height: 900 }, hasTouch: true, reducedMotion: 'reduce' });
    const { page, errs } = await openTactics(ctx);
    const start = await readTokens(page);
    check(start.every(t => t.duration === '0s'), 'the transition is switched off entirely', `duration ${start[0].duration}`);
    await page.locator('[data-cm-mentality-btn="attacking"]').click({ timeout: 5000 });
    await page.waitForTimeout(60);
    const instant = await readTokens(page);
    await page.waitForTimeout(900);
    const settled = await readTokens(page);
    check(instant.every((t, i) => t.transform === settled[i].transform),
      'the shape is already at its final spot 60ms after the click', 'no slide');
    check(settled.some((t, i) => t.transform !== start[i].transform), 'and it did still move', 'positions changed');
    const fx = await page.locator('.cm-ment-fx').count();
    const fxVisible = fx === 0 ? 0 : await page.$$eval('.cm-ment-fx', els => els.filter(e => getComputedStyle(e).display !== 'none').length);
    check(fxVisible === 0, 'the decorative flourish is hidden under reduced motion', `${fxVisible} visible`);

    // Dragging is direct manipulation, not decoration, so it must still work.
    const b0 = await readTokens(page);
    const a = await centreOf(page, 5);
    const b = await centreOf(page, 7);
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    for (let i = 1; i <= 6; i++) await page.mouse.move(a.x + ((b.x - a.x) * i) / 6, a.y + ((b.y - a.y) * i) / 6);
    await page.mouse.up();
    await page.waitForTimeout(500);
    const b1 = await readTokens(page);
    check(b1[5].name === b0[7].name && b1[7].name === b0[5].name,
      'dragging still works under reduced motion', `${b0[5].name} <-> ${b0[7].name}`);
    check(errs.length === 0, 'no exceptions under reduced motion', errs[0] || 'clean');
    await ctx.close();
  }

  await browser.close();
}

console.log('');
if (fails.length) {
  console.log(`${fails.length} TACTICS CHECKS FAILED`);
  for (const f of fails) console.log(`  - ${f}`);
  process.exit(1);
}
console.log('ALL TACTICS CHECKS PASSED');
