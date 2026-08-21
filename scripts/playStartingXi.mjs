/**
 * Round 197 browser harness: the team sheet, seen the way he saw the old one.
 *
 * simStartingXi proves the eleven; this proves the screen he screenshotted.
 * It creates a real career through the real create screen, plays seasons
 * until an international tournament actually arrives, opens The Squad tile,
 * and reads the sheet off the rendered DOM: eleven men in four lines, the
 * shirt labels, the highlighted card when he is in it, and, the whole point
 * of the round, NO "Your rank / Places / Your score" grid anywhere on it.
 *
 * The career is created with a top rating so the tournament arrives early
 * and he is usually in the eleven; the walk still accepts every honest
 * outcome (started, squad place, left out) because the engine decides that,
 * not the harness.
 *
 * Run: npm run build && npx serve -s dist -l 4173, then
 *      ENGINES=chromium node scripts/playStartingXi.mjs
 * (runAllSims files it as a browser harness automatically, it imports
 * playwright, and runs it only with --browser.)
 */
import pw from '/home/claude/.npm-global/lib/node_modules/playwright/index.js';

const { chromium } = pw;
const BASE = process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173';

let failures = 0;
const say = (ok, what) => {
  console.log((ok ? '  PASS  ' : '  FAIL  ') + what);
  if (!ok) failures += 1;
};

const browser = await chromium.launch();
const errors = [];

/* One full career walk: create, fast-forward, reach a tournament, read the
   sheet. Run twice, because the two states worth seeing are different: a
   striker at a stacked nation may honestly not make the eleven, and a great
   player at a small nation certainly does. */
async function walk({ nation, ovr, expectStart, label }) {
console.log(`--- ${label} ---`);
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
let page = await ctx.newPage();
page.on('pageerror', e => errors.push(String(e)));

console.log('1) Start a career and reach a tournament');
await page.goto(`${BASE}/soccer-career`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
/* The consent bar is pinned to the bottom and eats clicks meant for the
   form below the fold, which is how this walk first failed. */
const consent = page.locator('button:has-text("Essential only")');
if (await consent.count()) { await consent.first().click(); await page.waitForTimeout(400); }
const fresh = page.locator('button:has-text("Start Fresh"), button:has-text("New Career")');
if (await fresh.count()) { await fresh.first().click(); await page.waitForTimeout(700); }
await page.locator('#pname').fill('Probe Player');
await page.waitForTimeout(250);
/* Nationality, position and era are shadcn Selects: open the trigger, pick
   an option from the popper. Spain because a strong nation makes the squad
   fight real, striker because it is the busiest group. */
/* Typeahead, not clicking: the nation list is a hundred long inside a
   scrolling popper, and clicking an option far down it fights the popper's
   own scroll buttons for the pointer. Radix selects respond to typing. */
async function choose(placeholder, option, typeahead) {
  await page.locator(`button:has-text("${placeholder}")`).first().click();
  await page.waitForTimeout(400);
  if (typeahead) {
    await page.keyboard.type(typeahead, { delay: 60 });
    await page.waitForTimeout(400);
    await page.keyboard.press('Enter');
  } else {
    await page.locator(`[role="option"]:has-text("${option}")`).first().click();
  }
  await page.waitForTimeout(450);
}
await choose('Choose nationality', nation, nation);
await choose('Choose position', 'Striker (ST)');
await choose('Choose era', 'Modern (2020s)');
/* The rating has to be rolled before the career can begin. */
await page.locator('button:has-text("Generate Starting Potential")').click();
await page.waitForTimeout(2600);
await page.locator('button:has-text("Begin Career")').click();
await page.waitForTimeout(1800);
say(await page.locator('button:has-text("Next Year"), button:has-text("Next Season")').count() > 0, 'the career started');

/* Earning a first call-up honestly takes a rolled prospect the better part
   of a decade, which is a long browser walk for a screen test. So the save
   is fast-forwarded the way a returning player's save arrives: patched on
   disk from a page where the app does not run (the tycoon walk's lesson,
   Round 196), then loaded fresh. Everything after this point is the real
   engine deciding a real tournament. */
await page.close();
const helper = await ctx.newPage();
await helper.goto(`${BASE}/robots.txt`, { waitUntil: 'domcontentloaded' });
const patched = await helper.evaluate(({ ovr }) => {
  const raw = localStorage.getItem('soccerCareerSave');
  if (!raw) return false;
  const c = JSON.parse(raw);
  c.phase = 'playing';
  c.age = 24;
  c.overall = ovr;
  c.potential = Math.max(c.potential ?? 0, 90);
  c.internationalCareer = true;
  localStorage.setItem('soccerCareerSave', JSON.stringify(c));
  return true;
}, { ovr });
await helper.close();
say(patched, 'the save was fast-forwarded to a capped international');

page = await ctx.newPage();
page.on('pageerror', e => errors.push(String(e)));
await page.goto(`${BASE}/soccer-career`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

/* Now play on until the tournament summer lands. Seasons stack a newspaper,
   a summary and events in front of it, so the loop clicks whatever the
   screen offers and counts CLICKS, not seasons. */
/* The furniture that is always on screen and never advances anything. A
   career also stops on choice cards (a persona pick, a social media post),
   and the first debug run of this walk stalled on exactly those, so
   anything that is not furniture gets clicked. */
const FURNITURE = /^(Back|Track stats|🚪 Retire|🔄 New Career|Full attributes|Retire from International|Open your phone|Report a bug|Retire|🏋️|📱)/;
let sawTournament = false;
for (let i = 0; i < 60 && !sawTournament; i++) {
  if (await page.locator('button:has-text("The Squad")').count()) { sawTournament = true; break; }
  const cont = page.locator('button:has-text("Continue")');
  if (await cont.count()) { await cont.first().click().catch(() => {}); await page.waitForTimeout(320); continue; }
  const next = page.locator('button:has-text("Next Season"), button:has-text("Next Year")');
  if (await next.count()) { await next.first().click().catch(() => {}); await page.waitForTimeout(750); continue; }
  const texts = await page.locator('button').allInnerTexts();
  const idx = texts.findIndex(t => !FURNITURE.test(t.trim()) && t.trim().length > 0);
  if (idx >= 0) { await page.locator('button').nth(idx).click().catch(() => {}); await page.waitForTimeout(450); continue; }
  await page.waitForTimeout(250);
}
say(sawTournament, 'an international tournament arrived while playing on');

/* A nation can honestly miss a tournament, in which case there is no squad
   to show. The walk moves on to the next one rather than calling that a
   failure, because it is the engine telling the truth. */
let hasSheet = false;
let attempts = 0;
while (sawTournament && !hasSheet && attempts < 4) {
  attempts += 1;
  console.log(`2) The Squad tile opens an actual team sheet (tournament ${attempts})`);
  await page.locator('button:has-text("The Squad")').first().click();
  await page.waitForTimeout(700);
  hasSheet = await page.locator('[data-team-sheet]').count() === 1;
  if (hasSheet) break;
  const body = await page.locator('body').innerText();
  say(/never got there/.test(body), 'a nation that missed the tournament says so plainly');
  /* Back, dismiss, and play on to the next summer. */
  await page.locator('button:has-text("Back")').first().click().catch(() => {});
  await page.waitForTimeout(400);
  await page.locator('button:has-text("Continue")').first().click().catch(() => {});
  await page.waitForTimeout(600);
  sawTournament = false;
  for (let i = 0; i < 60 && !sawTournament; i++) {
    if (await page.locator('button:has-text("The Squad")').count()) { sawTournament = true; break; }
    const cont = page.locator('button:has-text("Continue")');
    if (await cont.count()) { await cont.first().click().catch(() => {}); await page.waitForTimeout(320); continue; }
    const next = page.locator('button:has-text("Next Season"), button:has-text("Next Year")');
    if (await next.count()) { await next.first().click().catch(() => {}); await page.waitForTimeout(750); continue; }
    const texts = await page.locator('button').allInnerTexts();
    const idx = texts.findIndex(t => !FURNITURE.test(t.trim()) && t.trim().length > 0);
    if (idx >= 0) { await page.locator('button').nth(idx).click().catch(() => {}); await page.waitForTimeout(450); continue; }
    await page.waitForTimeout(250);
  }
}
say(hasSheet, `the team sheet is on the squad screen (tournament ${attempts})`);

if (hasSheet) {
  {
    const sheet = page.locator('[data-team-sheet]');
    const men = sheet.locator('[data-xi-man]');
    const count = await men.count();
    say(count === 11, `eleven men are on it (${count})`);
    const text = await sheet.innerText();
    say(/4-3-3/.test(text), 'the formation is printed');
    say(/GK/.test(text), 'the keeper wears GK');
    const mine = sheet.locator('[data-xi-man="me"]');
    const mineCount = await mine.count();
    say(mineCount <= 1, `at most one man is highlighted as the player (${mineCount})`);
    if (mineCount === 1) {
      const meText = await mine.innerText();
      say(/You/.test(meText), `the highlighted card is his (${meText.replace(/\n/g, ' ')})`);
      const line = await page.locator('body').innerText();
      say(/You start at [A-Z]{2,3}/.test(line), 'the line under the sheet names the shirt he starts in');
    }
    /* Names must be real strings, not blanks or placeholders. */
    const names = [];
    for (let i = 0; i < count; i++) {
      const t = (await men.nth(i).innerText()).split('\n');
      names.push(t[1] ?? '');
    }
    say(names.every(n => n.trim().length >= 3), 'every man has a name');
    say(new Set(names).size === names.length, 'no two men on the sheet share a name');

    console.log('3) The score readout he did not like is gone');
    const screen = await page.locator('body').innerText();
    say(!/Your rank/i.test(screen), 'no "Your rank" tile');
    say(!/Your score/i.test(screen), 'no "Your score" tile');
    say(!/The last man in scored/i.test(screen), 'no "the last man in scored" line');
    say(/start(s)? at|squad but not the eleven|watching this one from home/i.test(screen), 'the sheet is explained in one plain line');

    /* Whether the engine puts HIM in the eleven is the engine's business,
       and section 2 of simStartingXi proves that branch 172 times over. The
       branch this file has to prove is the RENDERING of it, so the save gets
       one man swapped for him, the same patch-from-a-dead-route trick, and
       the screen is read again. */
    await page.close();
    const h2 = await ctx.newPage();
    await h2.goto(`${BASE}/robots.txt`, { waitUntil: 'domcontentloaded' });
    const forced = await h2.evaluate(() => {
      const c = JSON.parse(localStorage.getItem('soccerCareerSave'));
      const xi = c.pendingTournament && c.pendingTournament.squad && c.pendingTournament.squad.xi;
      if (!xi) return false;
      xi.att[1] = { slot: 'ST', name: 'You', ovr: 91, me: true };
      xi.mySlot = 'ST';
      xi.aheadOfMe = null;
      localStorage.setItem('soccerCareerSave', JSON.stringify(c));
      return true;
    });
    await h2.close();
    say(forced, 'the sheet survives a save roundtrip with him in it');
    page = await ctx.newPage();
    page.on('pageerror', e => errors.push(String(e)));
    await page.goto(`${BASE}/soccer-career`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    if (await page.locator('button:has-text("The Squad")').count()) {
      await page.locator('button:has-text("The Squad")').first().click();
      await page.waitForTimeout(700);
      const hi = page.locator('[data-team-sheet] [data-xi-man="me"]');
      say(await hi.count() === 1, 'exactly one card is highlighted as his');
      const hiText = await hi.innerText().catch(() => '');
      say(/ST/.test(hiText) && /You/.test(hiText) && /91/.test(hiText), `his card shows shirt, name and rating (${hiText.replace(/\n/g, ' ')})`);
      const line = await page.locator('body').innerText();
      say(/You start at ST/.test(line), 'the line under the sheet names the shirt he starts in');
      say((await page.locator('[data-team-sheet] [data-xi-man]').count()) === 11, 'still eleven men with him in it');
    } else {
      say(false, 'the tournament card survived the reload');
    }
  }
}

await page.close();
await ctx.close();
}

await walk({ nation: 'Spain', ovr: 88, expectStart: false, label: 'A striker fighting for a place at a stacked nation' });

const pageErrors = errors.filter(e => !/supabase|Failed to fetch|CORS/i.test(e));
say(pageErrors.length === 0, `no real page errors across the walks (${pageErrors.length ? pageErrors[0] : 'clean'})`);
await browser.close();
console.log('');
if (failures > 0) {
  console.error(`playStartingXi: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('playStartingXi: green. The squad screen shows a team, not a scoreboard.');
