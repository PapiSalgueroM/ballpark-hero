/* Reviewer walk (round 1321): the NBA Front Office played like a person to its draft and through it, at 390x844 and
   1280x900, reduced motion on and off. Round 1321 changes nothing a player sees, so this walk proves the old draft
   still plays end to end on this head (the default path) and looks right. Supabase is blocked. Screenshots go to
   RC_OUT. Exit 1 when a check fails; the last line says WALK GREEN or WALK RED. */
import pw from '../../scripts/lib/playwrightLoader.mjs';

const { chromium } = pw;
const BASE = process.env.BASE ?? 'http://localhost:4173';
const OUT = process.env.RC_OUT ?? '.';
let failures = 0;
const say = (ok, what) => { console.log(`${ok ? '  PASS' : '  FAIL'}  ${what}`); if (!ok) failures += 1; };
const browser = await chromium.launch();

async function overflow(page) {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}
async function clickIf(page, selector) {
  const l = page.locator(selector);
  if (await l.count() === 0) return false;
  try { await l.first().click({ timeout: 4000 }); return true; } catch { return false; }
}

for (const [w, h, motion] of [[390, 844, 'reduce'], [1280, 900, 'no-preference'], [390, 844, 'no-preference'], [1280, 900, 'reduce']]) {
  const tag = `${w}-${motion === 'reduce' ? 'rm' : 'mo'}`;
  console.log(`== ${tag}`);
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: motion });
  const page = await ctx.newPage();
  await page.route(/supabase\.co/, r => r.abort());
  const errors = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 200)));
  await page.goto(`${BASE}/nba-front-office`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  await clickIf(page, 'button:has-text("Decline"), button:has-text("Reject")');
  await page.screenshot({ path: `${OUT}/${tag}-1-picker.png` });
  say(await overflow(page) <= 0, `${tag}: the picker has no sideways scroll`);
  /* Take the first franchise. */
  const tile = page.locator('.grid button').first();
  await tile.click({ timeout: 8000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/${tag}-2-hub.png` });
  say(await overflow(page) <= 0, `${tag}: the hub has no sideways scroll`);
  /* Play the season the way a person does: answer any presser, open Play, press the round button. */
  let rounds = 0;
  for (let i = 0; i < 80; i += 1) {
    if (await page.locator('button:has-text("Go to the draft")').count()) break;
    if (await clickIf(page, '[data-gm-press] button')) { await page.waitForTimeout(500); continue; }
    if (await clickIf(page, 'button:has-text("Play Round"), button:has-text("Final stretch + playoffs")')) { rounds += 1; await page.waitForTimeout(motion === 'reduce' ? 250 : 600); continue; }
    if (await clickIf(page, 'button:has-text("🏟️")')) { await page.waitForTimeout(500); continue; }
    await page.waitForTimeout(800);
  }
  say(rounds >= 10, `${tag}: played ${rounds} round presses to the recap`);
  await page.waitForTimeout(motion === 'reduce' ? 500 : 2500);
  await page.screenshot({ path: `${OUT}/${tag}-3-recap.png`, fullPage: true });
  say(await page.locator('button:has-text("Go to the draft")').count() === 1, `${tag}: the recap offers Go to the draft`);
  await clickIf(page, 'button:has-text("Go to the draft")');
  await page.waitForTimeout(1200);
  const draftText = await page.locator('body').innerText();
  say(/The \d{4} Draft/.test(draftText), `${tag}: the draft screen is up (${(draftText.match(/The \d{4} Draft/) ?? ['none'])[0]})`);
  say(/You hold \d+ pick/.test(draftText), `${tag}: the old heading line is there (${(draftText.match(/You hold \d+ picks?/) ?? ['none'])[0]})`);
  await page.screenshot({ path: `${OUT}/${tag}-4-draft.png`, fullPage: true });
  say(await overflow(page) <= 0, `${tag}: the draft screen has no sideways scroll`);
  /* His picks: take the top of his scout's board until the draft is over. */
  let picks = 0;
  for (let i = 0; i < 6; i += 1) {
    const board = page.locator('div.grid.max-h-96 button');
    if (await board.count() === 0) break;
    await board.first().click({ timeout: 5000 });
    picks += 1;
    await page.waitForTimeout(motion === 'reduce' ? 800 : 4500);
    await page.screenshot({ path: `${OUT}/${tag}-5-pick${picks}.png`, fullPage: true });
  }
  say(picks >= 1, `${tag}: made ${picks} picks on the old draft`);
  const after = await page.locator('body').innerText();
  say(/That is your draft done|Continue to the hub|Finish draft and offseason/.test(after), `${tag}: the draft reaches its end screen`);
  for (let i = 0; i < 3; i += 1) {
    if (!(await clickIf(page, 'button:has-text("Continue to the hub"), button:has-text("Finish draft and offseason")'))) break;
    await page.waitForTimeout(1500);
  }
  await page.screenshot({ path: `${OUT}/${tag}-6-next-season.png` });
  const hub = await page.locator('body').innerText();
  say(!/The \d{4} Draft/.test(hub) || /That is your draft done/.test(hub), `${tag}: back on the hub after the draft`);
  say(errors.length === 0, `${tag}: no page errors (${errors[0] ?? 'clean'})`);
  await ctx.close();
}
await browser.close();
console.log(failures ? `WALK RED: ${failures} checks failed` : 'WALK GREEN');
process.exit(failures ? 1 : 0);
