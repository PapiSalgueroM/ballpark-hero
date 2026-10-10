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
 * Release AT: the same coin toss, one card on. Round 796 gave the rival a
 * second card, a choice (two or three options, then the same card says what
 * happened and offers Continue). A season with no beat rolls for one at 0.45,
 * so about 23 in 100 rookie seasons end on it (measured on 400
 * seeded rookie seasons, 91 of them, the same count on Release AS and on this
 * train). The walk knew only the beat, so on those runs nothing it looked for
 * was on screen, its "hub came back" check passed on an empty loop, and the
 * next click timed out. The choice card is a real screen now and the walk
 * answers it the way a player does. The hub check is no longer empty either:
 * after the summer the Play button has to be on screen, and when it is not
 * the walk prints what is and stops, so a red names its screen.
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
  met.beats += 1;
  await rivalry.click();
  await page.waitForTimeout(700);
  return true;
}
/* Release AT: the rival's other card (Round 796), a choice. Tap the first
   option, read what happened on the same card, press its Continue. Returns
   whether one was up; what it found on the way is said out loud, so a card
   that takes the tap and shows nothing is a FAIL and not a timeout. */
const met = { beats: 0, choices: 0 };
async function passRivalChoice(page) {
  const card = page.locator('[data-rivalry-choice]');
  if (!(await card.count())) return false;
  met.choices += 1;
  const options = card.locator('[data-rivalry-option]');
  const asked = await options.count();
  if (asked) {
    await options.first().click();
    await page.waitForTimeout(600);
  }
  const outcome = await page.locator('[data-rivalry-choice] [data-rivalry-outcome]').count();
  const cont = page.locator('[data-rivalry-choice] button:has-text("Continue")');
  say(asked >= 2 && outcome === 1 && await cont.count() === 1,
    `a rival choice card came up: ${asked} options, and after the tap the card says what happened and offers Continue`);
  if (await cont.count()) {
    await cont.click();
    await page.waitForTimeout(700);
  }
  say(await page.locator('[data-rivalry-choice]').count() === 0, 'the rival choice card closed on its Continue');
  return true;
}
const hubIsUp = async page => await page.locator('button:has-text("Play the")').count() > 0;
const onRealScreen = async page =>
  /Play the \d{4} season/.test(await page.locator('body').innerText())
  || await page.locator('div.grid.gap-1\\.5 > button').count() > 0
  || await page.locator('[data-career-decision-option]').count() > 0
  || await page.locator('[data-decision-continue]').count() > 0
  || await page.locator('[data-rivalry-event]').count() > 0
  || await page.locator('[data-rivalry-choice]').count() > 0;

/* Round 1038: an offseason is a summer of up to three cards, each answered
   and then closed with its receipt's Continue, and a reload mid-summer opens
   on the card it left. One answer no longer brings the hub back, so answer
   whatever is up until it does. Returns the screens passed, or -1 when the
   hub never came back.
   Release AT: "came back" is read off the page. With nothing left to answer
   the Play button has to be there; a screen this walk does not know used to
   return 0 here and pass. */
async function finishOffseason(page) {
  for (let i = 0; i < 12; i += 1) {
    const cont = page.locator('[data-decision-continue]');
    if (await cont.count()) { await cont.first().click(); await page.waitForTimeout(500); continue; }
    const opt = page.locator('[data-career-decision-option]');
    if (await opt.count()) { await opt.first().click(); await page.waitForTimeout(500); continue; }
    if (await passRivalry(page)) continue;
    if (await passRivalChoice(page)) continue;
    return await hubIsUp(page) ? i : -1;
  }
  return -1;
}

/* Release AT: the walk needs the hub to go on. When it is not there, say what
   is on screen (the markers and the first words) and stop with a verdict,
   never with a 30 second timeout on a button that is not coming. */
async function needHub(page, where) {
  if (await hubIsUp(page)) return;
  const seen = await page.evaluate(() => ({
    marks: [...new Set([...document.querySelectorAll('main *')].flatMap(el => el.getAttributeNames().filter(n => n.startsWith('data-'))))].slice(0, 30).join(' '),
    words: (document.querySelector('main')?.innerText ?? document.body.innerText).replace(/\s+/g, ' ').slice(0, 400),
  }));
  console.log(`  STOPPED ${where}: the hub's Play button is not on screen. Markers: ${seen.marks || 'none'}. Words: ${seen.words}`);
  await browser.close();
  verdict('playSeasonReveal', CONTROL ? proof : null, { minGuarded: 1 });
  process.exit(1);
}

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
  await page.addInitScript(() => localStorage.setItem('rules-gate-seen:/nfl-my-career', '1'));
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
  } else if (await passRivalChoice(page)) {
    console.log('  (the draw raised a rival choice card; answered it)');
    say(/Play the \d{4} season/.test(await page.locator('body').innerText()) || await page.locator('div.grid.gap-1\\.5 > button').count() > 0,
      'the crossroads or the hub is behind the rival choice card');
  }
  say(await finishOffseason(page) >= 0, 'every card of the summer answered, and the hub came back');
  await needHub(page, 'after the first summer');
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
  if (await passRivalry(page)) console.log('  (the second season\'s rivalry card was back after the reload; clicked through it)');
  /* The reload mid-summer reopened on the card it left (Round 1038). */
  say(await finishOffseason(page) >= 0, 'the summer left open by the reload answered, and the hub came back');
  await needHub(page, 'after the reload');
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
  await page.addInitScript(() => localStorage.setItem('rules-gate-seen:/nba-my-career', '1'));
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
console.log(`\nRival cards met on this run: ${met.beats} beat, ${met.choices} choice (the draw decides; both are walked when they come).`);
const code = verdict('playSeasonReveal', CONTROL ? proof : null, { minGuarded: 1 });
if (code || CONTROL) process.exit(code);
console.log('\nALL SEASON REVEAL WALK CHECKS PASSED');
