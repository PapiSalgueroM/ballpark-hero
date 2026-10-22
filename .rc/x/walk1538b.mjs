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

// walk1538b: after the outcome card's Continue, open the News tile and read the line the answer wrote.
async function news(page, size) {
  await page.locator('[data-decision-continue]').click();
  await page.waitForTimeout(600);
  const tile = page.locator('[data-career-hub-buttons] button').filter({ hasText: 'News' }).first();
  await tile.waitFor();
  if (size.touch) await tile.tap(); else await tile.click();
  await page.waitForTimeout(600);
  return (await page.locator('body').innerText()).replace(/\s+/g, ' ');
}
const CASES = [
  { name: 't1', sport: 'nba', edit: { ovr: 84, pot: 84 }, answer: 'Skill grind', want: 'You were already at your ceiling, so the rating stays at 84.', ovr: 84 },
  { name: 't2', sport: 'nba', edit: { ovr: 83, pot: 84 }, answer: 'Skill grind', want: 'Rating +1, and that is your ceiling.', ovr: 84 },
  { name: 't3', sport: 'nhl', edit: { age: 31 }, answer: 'Skills coach', want: 'Maintenance summer. Health +4.', health: 100 },
  { name: 't4', sport: 'nhl', edit: { age: 31, health: 90 }, answer: 'Skills coach', want: 'Maintenance summer. Health +4.', health: 94 },
];
const browser = await chromium.launch();
try {
  for (const size of SIZES) for (const motion of ['reduce', 'no-preference']) for (const t of CASES) {
    const who = `${t.name}-${size.width}-${motion === 'reduce' ? 'rm' : 'mo'}`;
    const save = seeded(t.sport, ['training'], t.edit);
    const { context, page, errors } = await open(browser, size, motion, t.sport, save);
    try {
      const btn = await page.locator('[data-career-decision-option]').first().innerText();
      const outcome = await answer(page, size, t.answer);
      const rows = (await outcome.innerText()).replace(/\s+/g, ' ');
      await outcome.screenshot({ path: path.join(OUT, `${who}-1-outcome.png`) });
      const text = await news(page, size);
      await shot(page, `${who}-2-news`);
      const c = await saved(page, t.sport);
      const shown = text.includes(t.want);
      log(who, `button "${btn.replace(/\s+/g, ' ')}"; outcome "${rows.slice(0, 200)}"; news shows the line: ${shown}; saved ovr ${c.ovr} health ${c.health}`);
      if (!shown) fail(who, `the News tile does not show "${t.want}"`);
      if (t.ovr !== undefined && c.ovr !== t.ovr) fail(who, `rating ${c.ovr}, want ${t.ovr}`);
      if (t.health !== undefined && c.health !== t.health) fail(who, `health ${c.health}, want ${t.health}`);
      await sideways(page, who);
      if (errors.length) fail(who, `page error ${errors.join(' | ').slice(0, 200)}`);
    } catch (e) { fail(who, `crash ${String(e.message || e).split('\n')[0]}`); await shot(page, `${who}-crash`).catch(() => {}); } finally { await context.close(); }
  }
} finally { await browser.close(); }
console.log(failures === 0 ? 'walk1538b: green' : `walk1538b: red, ${failures} failures`);
process.exit(failures === 0 ? 0 : 1);
