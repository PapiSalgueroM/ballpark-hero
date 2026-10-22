// Review of Round 1538 (run lens): play the round's cards the way a player would, on a served build of the head.
// Saves are the board fixture's mid saves with the summer standing on one card. 390x844 (touch) and 1280x900, each
// with reduced motion on and off. Screens go to $RC_OUT. The live database host is aborted.
//   s1 NBA at his ceiling: the training card's buttons, then Skill grind; the line says the rating stays, it stays.
//   s2 NBA Build the brand from Cash 10.37: Career earnings +$5M and Cash +$5M, saved Cash 15.37.
//   s3 NHL at 31: Skills coach says "Health +4" and gives health +4, rating unchanged.
//   s4 NBA ncorr_sportsbook's clean answer: Cash +$2.5M, the line prints 2.5M.
//   s5 NHL throwback (y2006): The content summer lands 0.8M (2M at 0.42) and the Cash row says +$0.8M.
// Exit 0 when every check holds, 1 when one does not.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const { chromium } = await import(pathToFileURL(path.join(ROOT, 'scripts/lib/playwrightLoader.mjs')).href);
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = path.resolve(process.env.RC_OUT || path.join(ROOT, '.tmp-fx/walk1538'));
fs.mkdirSync(OUT, { recursive: true });
const fixture = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/usBoardFixture.json'), 'utf8'));
const KEYS = { nba: 'nba-my-career-save-v1', nhl: 'nhl-my-career-save-v1' };
for (const [sport, key] of Object.entries(KEYS)) {
  const src = fs.readFileSync(path.join(ROOT, `src/lib/${sport}CareerSport.ts`), 'utf8');
  if (!src.includes(`const SAVE_KEY = '${key}';`)) { console.log(`walk1538: could not run, ${sport} save key moved`); process.exit(2); }
}
let failures = 0;
const fail = (who, what) => { failures += 1; console.log(`  FAIL ${who}: ${what}`); };
const log = (who, what) => console.log(`  ${who}: ${what}`);

const SIZES = [{ width: 390, height: 844, touch: true }, { width: 1280, height: 900, touch: false }];
async function open(browser, size, motion, sport, save) {
  const context = await browser.newContext({
    viewport: { width: size.width, height: size.height }, isMobile: size.touch, hasTouch: size.touch, deviceScaleFactor: 1,
    reducedMotion: motion, serviceWorkers: 'block',
    storageState: { cookies: [], origins: [{ origin: new URL(BASE).origin, localStorage: [
      { name: 'cookie-consent', value: 'essential' }, { name: KEYS[sport], value: JSON.stringify(save) },
      { name: `rules-gate-seen:/${sport}-my-career`, value: '1' }] }] },
  });
  await context.route(/supabase\.co/, r => r.abort());
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(`${BASE}/${sport}-my-career`, { waitUntil: 'domcontentloaded' });
  return { context, page, errors };
}
const seeded = (sport, ids, edit) => {
  const save = JSON.parse(fixture.sports[sport].saves.mid);
  Object.assign(save.c, { netWorth: 10.37 }, edit);
  save.c.summer = { year: save.c.seasons.at(-1).year, ids, at: 0 };
  return save;
};
async function shot(page, name) { await page.screenshot({ path: path.join(OUT, `${name}.png`) }); }
async function sideways(page, who) {
  const m = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth }));
  if (m.sw > m.iw) fail(who, `sideways scroll ${m.sw} on ${m.iw}`);
}
async function answer(page, size, label) {
  const opt = page.locator('[data-career-decision-option]').filter({ hasText: label }).first();
  await opt.waitFor();
  if (size.touch) await opt.tap(); else await opt.click();
  const outcome = page.locator('[data-career-decision-outcome]');
  await outcome.waitFor();
  await page.waitForTimeout(500);
  return outcome;
}
const delta = async (outcome, key) => { const row = outcome.locator(`[data-decision-change="${key}"] [data-change-delta]`); return (await row.count()) ? (await row.first().innerText()).trim() : null; };
const saved = async (page, sport) => JSON.parse(await page.evaluate(k => localStorage.getItem(k), KEYS[sport])).c;

async function scenario(browser, size, motion, name, sport, save, run) {
  const who = `${name}-${size.width}-${motion === 'reduce' ? 'rm' : 'mo'}`;
  const { context, page, errors } = await open(browser, size, motion, sport, save);
  try {
    await page.locator('[data-career-decision-option]').first().waitFor();
    await page.waitForTimeout(400);
    await shot(page, `${who}-1-card`);
    const buttons = await page.locator('[data-career-decision-option]').allInnerTexts();
    log(who, `buttons ${JSON.stringify(buttons.map(b => b.replace(/\s+/g, ' ').trim()))}`);
    await run(page, who, buttons);
    await sideways(page, who);
    if (errors.length) fail(who, `page error ${errors.join(' | ').slice(0, 200)}`);
  } catch (e) { fail(who, `crash ${String(e.message || e).split('\n')[0]}`); await shot(page, `${who}-crash`).catch(() => {}); } finally { await context.close(); }
}
const browser = await chromium.launch();
try {
  for (const size of SIZES) for (const motion of ['reduce', 'no-preference']) {
    // s1: NBA at his ceiling (84 of 84), age 26
    const s1 = seeded('nba', ['training'], { ovr: 84, pot: 84 });
    await scenario(browser, size, motion, 's1', 'nba', s1, async (page, who, buttons) => {
      if (!buttons[0]?.includes('Rating +1 or +2, up to your ceiling')) fail(who, `Skill grind's button is "${buttons[0]}"`);
      if (buttons.some(b => /Push the ceiling/.test(b))) fail(who, 'a button still says Push the ceiling');
      const outcome = await answer(page, size, 'Skill grind');
      const text = (await outcome.innerText()).replace(/\s+/g, ' ');
      log(who, `outcome "${text.slice(0, 260)}"`);
      await outcome.screenshot({ path: path.join(OUT, `${who}-2-outcome.png`) });
      const c = await saved(page, 'nba');
      if (c.ovr !== 84) fail(who, `the rating went 84 to ${c.ovr}`);
      if (!text.includes('already at your ceiling')) fail(who, 'the outcome does not say the rating stays at the ceiling');
    });
    // s2: NBA Build the brand from Cash 10.37
    const s2 = seeded('nba', ['training'], {});
    await scenario(browser, size, motion, 's2', 'nba', s2, async (page, who) => {
      const outcome = await answer(page, size, 'Build the brand');
      const text = (await outcome.innerText()).replace(/\s+/g, ' ');
      const e = await delta(outcome, 'earnings'), n = await delta(outcome, 'netWorth');
      log(who, `earnings ${e}, Cash ${n}; outcome "${text.slice(0, 260)}"`);
      await outcome.screenshot({ path: path.join(OUT, `${who}-2-outcome.png`) });
      if (e !== '+$5M' || n !== '+$5M') fail(who, `rows earnings ${e} Cash ${n}, want +$5M both`);
      const c = await saved(page, 'nba');
      if (c.netWorth !== 15.37) fail(who, `saved Cash ${c.netWorth}, want 15.37`);
    });
    // s3: NHL at 31, the maintenance age
    const s3 = seeded('nhl', ['training'], { age: 31 });
    await scenario(browser, size, motion, 's3', 'nhl', s3, async (page, who, buttons) => {
      if (!/Skills coach/.test(buttons[0] ?? '') || !buttons[0].includes('Health +4')) fail(who, `Skills coach's button is "${buttons[0]}" at 31`);
      const before = s3.c;
      const outcome = await answer(page, size, 'Skills coach');
      const text = (await outcome.innerText()).replace(/\s+/g, ' ');
      log(who, `outcome "${text.slice(0, 260)}"`);
      await outcome.screenshot({ path: path.join(OUT, `${who}-2-outcome.png`) });
      const c = await saved(page, 'nhl');
      if (c.ovr !== before.ovr || c.health !== Math.min(100, before.health + 4)) fail(who, `rating ${before.ovr} to ${c.ovr}, health ${before.health} to ${c.health}`);
    });
    // s4: NBA sportsbook's clean answer
    const s4 = seeded('nba', ['ncorr_sportsbook'], { fanbase: 80, heat: 0, dirtyMoney: 0 });
    await scenario(browser, size, motion, 's4', 'nba', s4, async (page, who) => {
      const outcome = await answer(page, size, 'Sign the cleaned up version');
      const text = (await outcome.innerText()).replace(/\s+/g, ' ');
      const n = await delta(outcome, 'netWorth');
      log(who, `Cash ${n}; outcome "${text.slice(0, 260)}"`);
      await outcome.screenshot({ path: path.join(OUT, `${who}-2-outcome.png`) });
      if (n !== '+$2.5M') fail(who, `Cash row ${n}, want +$2.5M`);
    });
    // s5: NHL throwback, The content summer lands 2M at 0.42
    const s5 = seeded('nhl', ['training'], { eraId: 'y2006' });
    await scenario(browser, size, motion, 's5', 'nhl', s5, async (page, who) => {
      const outcome = await answer(page, size, 'The content summer');
      const text = (await outcome.innerText()).replace(/\s+/g, ' ');
      const n = await delta(outcome, 'netWorth');
      log(who, `Cash ${n}; outcome "${text.slice(0, 260)}"`);
      await outcome.screenshot({ path: path.join(OUT, `${who}-2-outcome.png`) });
      if (n !== '+$0.8M') fail(who, `Cash row ${n}, want +$0.8M`);
    });
  }
} finally { await browser.close(); }
console.log(`  screenshots: ${fs.readdirSync(OUT).filter(f => f.endsWith('.png')).length} in ${OUT}`);
console.log(failures === 0 ? 'walk1538: green' : `walk1538: red, ${failures} failures`);
process.exit(failures === 0 ? 0 : 1);
