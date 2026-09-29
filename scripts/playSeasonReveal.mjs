/**
 * Round 186 browser harness: the season curtain, walked like a person.
 *
 * simSeasonReveal proves the engine; this proves the card: clicking Play
 * now opens the staged reveal (year, result, story lines, Continue), the
 * crossroads only shows after Continue, a reload mid-curtain lands on the
 * save's real screen because the reveal is transient by design, and a
 * suspended season gets the muted card through the real UI.
 *
 * Every assertion is scoped to [data-season-reveal], the Round 179
 * lesson: the sitewide ticker legitimately talks about seasons and
 * signings, so whole-body text checks lie.
 *
 * Run: npm run build && npx serve -s dist -l 4173, then
 *      ENGINES=chromium node scripts/playSeasonReveal.mjs
 * (runAllSims files it as a browser harness automatically, it imports
 * playwright, and runs it only with --browser.)
 *
 * Round 672: a coin toss since Rounds 522 to 525. About half of all seasons
 * now raise a rivalry card between the curtain and the crossroads, and it is
 * saved on the career, so it also comes back after a reload. This walk knew
 * neither, so it went red whenever the draw raised one: the screen behind the
 * curtain was the rivalry card, and "Play the" was never on screen to click.
 * The rivalry card now counts as a real screen and the walk clicks through
 * it, the way a player does.
 *
 * NEGATIVE CONTROL: SEASON_REVEAL_CONTROL=muted rewrites the served reveal
 * so the suspended year's card no longer says what the year was. The check
 * at the far end of the walk must fail, which proves the walk still gets
 * there and still reads the card.
 */
import pw from './lib/playwrightLoader.mjs';
import { installServedCodeControl, controlledChecks } from './lib/servedCodeControl.mjs';

const { chromium } = pw;
const BASE = process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173';

const CONTROL = process.env.SEASON_REVEAL_CONTROL || '';
if (CONTROL && CONTROL !== 'muted') {
  console.error(`SEASON_REVEAL_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(1);
}
const { say, verdict } = controlledChecks(CONTROL);
const proof = {};

/* The rivalry card has its own Continue. Returns whether one was up. */
async function passRivalry(page) {
  const rivalry = page.locator('[data-rivalry-event] button:has-text("Continue")');
  if (!(await rivalry.count())) return false;
  await rivalry.click();
  await page.waitForTimeout(700);
  return true;
}
const onRealScreen = async page =>
  /Play the \d{4} season/.test(await page.locator('body').innerText())
  || await page.locator('div.grid.gap-1\\.5 > button').count() > 0
  || await page.locator('[data-rivalry-event]').count() > 0;

const browser = await chromium.launch();

/* ---------- Walk one: the NFL curtain, end to end ---------- */
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  if (CONTROL) {
    await installServedCodeControl(page, [
      { label: 'mutedLine', find: /(result:[\w$]+\?)"Season served on the suspended list"/g, replace: '$1"Season over"' },
    ], proof);
  }
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));

  console.log('1) Play opens the curtain, not the crossroads');
  await page.goto(`${BASE}/nfl-my-career`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.locator('input[placeholder*="name"]').first().fill('Curtain Probe');
  await page.locator('button:has-text("Enter the draft")').click();
  await page.waitForTimeout(900);
  await page.locator('button:has-text("Play the")').first().click();
  await page.waitForTimeout(900);
  const reveal = page.locator('[data-season-reveal]');
  say(await reveal.count() === 1, 'the season reveal card is up');
  const rText = await reveal.innerText();
  say(/The \d{4} season/i.test(rText), 'the header names the year (CSS uppercases it, so match case-blind)');
  say(/age \d+/.test(rText), 'the sub header carries the age line');
  say(/yds|TD|rec/.test(rText), 'the true stat line is on the card from frame one');
  say(await reveal.locator('button:has-text("Continue")').count() === 1, 'the Continue button is on the card');

  console.log('2) Continue hands over to the crossroads');
  await reveal.locator('button:has-text("Continue")').click();
  await page.waitForTimeout(700);
  say(await page.locator('[data-season-reveal]').count() === 0, 'the curtain came down');
  say(await onRealScreen(page), 'the rivalry card, the crossroads or the hub is on screen behind it');

  console.log('3) A reload mid-curtain lands on the real screen');
  /* Past the rivalry card if the draw raised one, answer whatever crossroads
     is up, then play the next season. */
  if (await passRivalry(page)) {
    console.log('  (the draw raised a rivalry card; clicked through it)');
    say(/Play the \d{4} season/.test(await page.locator('body').innerText()) || await page.locator('div.grid.gap-1\\.5 > button').count() > 0,
      'the crossroads or the hub is behind the rivalry card');
  }
  const opt = page.locator('div.grid.gap-1\\.5 > button').first();
  if (await opt.count()) { await opt.click(); await page.waitForTimeout(700); }
  await page.locator('button:has-text("Play the")').first().click();
  await page.waitForTimeout(900);
  say(await page.locator('[data-season-reveal]').count() === 1, 'the second season raised the curtain');
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  say(await page.locator('[data-season-reveal]').count() === 0, 'the reveal did not survive the reload, transient by design');
  say(await onRealScreen(page), 'the save reopened on a real screen');

  console.log('4) A suspended season gets the muted card');
  await page.evaluate(() => {
    const raw = localStorage.getItem('nfl-my-career-save-v1');
    if (!raw) return;
    const s = JSON.parse(raw);
    s.c.suspendedSeasons = 1;
    localStorage.setItem('nfl-my-career-save-v1', JSON.stringify(s));
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  /* A rivalry card from the second season is on the save, so it is back. */
  await passRivalry(page);
  await page.locator('button:has-text("Play the")').first().click();
  await page.waitForTimeout(900);
  const banned = page.locator('[data-season-reveal]');
  say(await banned.count() === 1, 'the banned year still gets its card');
  const bText = await banned.innerText();
  say(/suspended list/i.test(bText), 'the muted card says what the year was', true);
  say(errors.length === 0, `no page errors on the NFL walk (${errors.length ? errors[0] : 'clean'})`);
  await page.close();
}

/* ---------- Walk two: the NBA curtain renders too ---------- */
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));

  console.log('5) The shared card serves the NBA');
  await page.goto(`${BASE}/nba-my-career`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.locator('input[placeholder*="name"]').first().fill('Curtain Probe');
  await page.locator('button:has-text("Enter the draft")').click();
  await page.waitForTimeout(900);
  await page.locator('button:has-text("Play the")').first().click();
  await page.waitForTimeout(900);
  const reveal = page.locator('[data-season-reveal]');
  say(await reveal.count() === 1, 'the NBA season reveal card is up');
  const rText = await reveal.innerText();
  say(/The \d{4} season/i.test(rText) && /ppg/.test(rText), 'the NBA card carries the year and the true stat line');
  await reveal.locator('button:has-text("Continue")').click();
  await page.waitForTimeout(700);
  say(await page.locator('[data-season-reveal]').count() === 0, 'Continue works in the NBA too');
  say(errors.length === 0, `no page errors on the NBA walk (${errors.length ? errors[0] : 'clean'})`);
  await page.close();
}

await browser.close();
const code = verdict('playSeasonReveal', CONTROL ? proof : null, { minGuarded: 1 });
if (code || CONTROL) process.exit(code);
console.log('\nALL SEASON REVEAL WALK CHECKS PASSED');
