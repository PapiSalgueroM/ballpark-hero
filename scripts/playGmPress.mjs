/**
 * Round 192 browser harness: the GM press room, walked like a person.
 *
 * simGmPress proves the engine; this walks the UI across the boards: a
 * fresh hire faces the introduction on the hub and the measured answer
 * moves trust by exactly its flat effect (60 to 63, no gamble on the
 * safe register), a doomed season ends in the accountability scrum ON the
 * recap where the draft button waits until the room is answered, the
 * patience answer's tilt line surfaces in the feed after the draft, a
 * reload never resurrects a presser (transient, same rule as trade
 * talks), and the other three hubs speak their own sport's language.
 *
 * The doomed season reuses the playOwnerMandate recipe at trust 50: a
 * title-or-bust mandate over a 60-rated roster grades missed or badly
 * (-16 or -28), never a firing from 50, so the scrum is guaranteed and
 * the save survives to show it.
 *
 * Run: npm run build && npx serve -s dist -l 4173, then
 *      ENGINES=chromium node scripts/playGmPress.mjs
 * (runAllSims files it as a browser harness automatically, it imports
 * playwright, and runs it only with --browser.)
 */
import pw from './lib/playwrightLoader.mjs';

const { chromium } = pw;
const BASE = process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173';

let failures = 0;
const say = (ok, what) => {
  console.log((ok ? '  PASS  ' : '  FAIL  ') + what);
  if (!ok) failures += 1;
};

/* Round 1309: print the visible feed rows on the draft screen and, after Continue, on the hub. A row is one
   of the feed's ticking lines (cm-tick-in, or cm-slam for the newest deal). Nothing here is a check. */
async function printFeedAfterDraft(page, board) {
  const rows = async () => page.locator('p.cm-tick-in:visible, p.cm-slam:visible').allInnerTexts();
  let picks = 0;
  for (; picks < 16; picks++) {
    if (await page.locator('button:has-text("Continue to the hub")').count() > 0) break;
    const pick = page.locator('.grid button').first();
    if (await pick.count() === 0) break;
    await pick.click();
    await page.waitForTimeout(500);
  }
  await page.waitForTimeout(4000);
  const done = await page.locator('button:has-text("Continue to the hub")').count() > 0;
  console.log(`FEED|${board}|the draft finished: ${done ? 'yes' : 'no'} (${picks} more picks pressed after the walk's own)`);
  for (const r of await rows()) console.log(`FEED|${board}|draft screen row|${r}`);
  if (!done) return;
  await page.locator('button:has-text("Continue to the hub")').first().click();
  await page.waitForTimeout(1500);
  const hub = await rows();
  for (const r of hub) console.log(`FEED|${board}|hub row|${r}`);
  console.log(`FEED|${board}|on the hub: the new mandate line ${hub.some(r => r.includes('The new mandate:')) ? 'IS' : 'is NOT'} visible; the patience line ${hub.some(r => r.includes('Your ask for patience was heard')) ? 'IS' : 'is NOT'} visible`);
}

const browser = await chromium.launch();

/* ---------- Walk one: the NFL GM, introduced, scrummed, tilted ---------- */
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));

  console.log('1) A fresh hire faces the room');
  await page.goto(`${BASE}/front-office`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.locator('.grid button').first().click();
  await page.waitForTimeout(900);
  const intro = page.locator('[data-gm-press]');
  say(await intro.count() === 1, 'the introduction presser is on the hub');
  const introText = await intro.innerText();
  say(introText.includes('The introduction'), 'it is the introduction, by name');
  /* The register chips are CSS-uppercased, and innerText reports the
     TRANSFORMED text (the playSeasonReveal catch), so match caseless. */
  say(/measured/i.test(introText) && /candid/i.test(introText) && /bold/i.test(introText), 'all three registers are on the card');
  say(introText.includes('Super Bowl'), 'the bold answer talks Super Bowl in the NFL room');
  say(await page.locator('[data-owner-mandate]').count() === 1, 'the owner card shares the hub with the presser');

  console.log('2) The measured answer moves trust by exactly its flat effect');
  await page.locator('[data-gm-press] button').first().click();
  await page.waitForTimeout(600);
  say(await page.locator('[data-gm-press]').count() === 0, 'an answered presser leaves the hub');
  const ownerText = await page.locator('[data-owner-mandate]').innerText();
  say(ownerText.includes('Trust 63'), `trust reads 63 after the +3 measured answer (card says: ${ownerText.split('\n')[0]})`);
  say((await page.locator('body').innerText()).includes('Nobody clips it'), 'the answer landed in the feed');
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  say(await page.locator('[data-gm-press]').count() === 0, 'a reload never resurrects an answered presser');
  const ownerAfter = await page.locator('[data-owner-mandate]').innerText();
  say(ownerAfter.includes('Trust 63'), 'the answered trust survived the reload');

  console.log('3) A doomed season ends in the scrum, and the draft waits');
  await page.evaluate(() => {
    const raw = localStorage.getItem('front-office-save-v1');
    if (!raw) return;
    const s = JSON.parse(raw);
    s.trust = 50;
    s.mandate = { tier: 'title', text: 'Win the Super Bowl. Anything less is a failed season upstairs.', winFloor: 0, reqLevel: 4, season: s.league.season };
    for (const p of s.league.teams[s.myTeam].players) p.ovr = 60;
    s.league.teams[s.myTeam].defense = 60;
    localStorage.setItem('front-office-save-v1', JSON.stringify(s));
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.locator('button:has-text("This week")').click();
  await page.waitForTimeout(400);
  for (let w = 0; w < 18; w++) {
    const btn = page.locator('button:has-text("Play Week"), button:has-text("Play the final week")');
    if (await btn.count() === 0) break;
    /* Round 1309: on Week 17 "Play Week 17" (it opens the bracket) comes first and the one press button last */
    await btn.last().click();
    await page.waitForTimeout(350);
  }
  const scrum = page.locator('[data-gm-press]');
  say(await scrum.count() === 1, 'the recap carries a presser');
  const scrumText = await scrum.innerText();
  say(scrumText.includes('The accountability scrum'), 'a missed title ask produces the scrum');
  say(scrumText.includes('next ask softens'), 'the patience answer discloses its tilt');
  say(await page.locator('button:has-text("Go to the draft")').count() === 0, 'the draft button waits while the room does');

  console.log('4) Patience answered: the tilt survives to the next mandate');
  await page.locator('[data-gm-press] button:has-text("Ask the room for patience")').click();
  await page.waitForTimeout(600);
  say(await page.locator('[data-gm-press]').count() === 0, 'the scrum ends when answered');
  say(await page.locator('button:has-text("Go to the draft")').count() === 1, 'the draft button returns');
  await page.locator('button:has-text("Go to the draft")').click();
  await page.waitForTimeout(700);
  for (let k = 0; k < 3; k++) {
    const pick = page.locator('.grid button').first();
    if (await pick.count() === 0) break;
    await pick.click();
    await page.waitForTimeout(500);
  }
  await page.waitForTimeout(900);
  const hubText = await page.locator('body').innerText();
  say(hubText.includes('The new mandate:'), 'the offseason set a new mandate');
  say(hubText.includes('Your ask for patience was heard'), 'the feed credits the press answer for the softer bar');
  /* Round 1309, printed and not asserted (its brief, decision 2o): the feed rows a person can see once the draft
     has truly finished and Continue is pressed, so a run tells a stale walk (the draft not finished after three
     picks) from a feed whose two lines sit below the rows the screen draws. */
  await printFeedAfterDraft(page, 'NFL');
  say(errors.length === 0, `no page errors on the NFL walk (${errors.length ? errors[0] : 'clean'})`);
  await page.close();
}

/* ---------- Walk two: the other three rooms speak their language ---------- */
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  console.log('5) The NBA, NHL and MLB rooms exist and know their sport');
  for (const [path, word] of [['/nba-front-office', 'Finals'], ['/nhl-front-office', 'Stanley Cup'], ['/mlb-front-office', 'World Series']]) {
    await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    await page.locator('.grid button').first().click();
    await page.waitForTimeout(900);
    const card = page.locator('[data-gm-press]');
    say(await card.count() === 1, `${path}: the introduction presser is on the hub`);
    const text = await card.innerText();
    say(text.includes(word), `${path}: the bold answer talks ${word}`);
    await card.locator('button').first().click();
    await page.waitForTimeout(500);
    say(await page.locator('[data-gm-press]').count() === 0, `${path}: the answer ends the presser`);
  }
  say(errors.length === 0, `no page errors on the tri-sport walk (${errors.length ? errors[0] : 'clean'})`);
  await page.close();
}

/* ---------- Round 1309, printed only: the other three boards' feed after their draft ---------- */
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  console.log('6) Printed, not checked: the feed rows after the draft on the NBA, NHL and MLB boards');
  for (const path of ['/nba-front-office', '/nhl-front-office', '/mlb-front-office']) {
    try {
      await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1200);
      await page.locator('.grid button').first().click();
      await page.waitForTimeout(900);
      if (await page.locator('[data-gm-press]').count() > 0) { await page.locator('[data-gm-press] button').first().click(); await page.waitForTimeout(500); }
      await page.getByText('Play', { exact: true }).first().click();
      await page.waitForTimeout(400);
      for (let r = 0; r < 120; r++) {
        const btn = page.locator('button:has-text("Play Round"), button:has-text("Final stretch")');
        if (await btn.count() === 0) break;
        await btn.first().click();
        await page.waitForTimeout(150);
      }
      if (await page.locator('[data-gm-press]').count() > 0) { await page.locator('[data-gm-press] button').first().click(); await page.waitForTimeout(500); }
      if (await page.locator('button:has-text("Go to the draft")').count() === 0) { console.log(`FEED|${path}|no draft button reached; nothing to print`); continue; }
      await page.locator('button:has-text("Go to the draft")').first().click();
      await page.waitForTimeout(700);
      await printFeedAfterDraft(page, path);
    } catch (e) {
      console.log(`FEED|${path}|the print stopped: ${String(e).split('\n')[0]}`);
    }
  }
  await page.close();
}

await browser.close();
console.log('');
if (failures > 0) {
  console.error(`playGmPress: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('playGmPress: green. The GM press room plays like a person would find it.');
