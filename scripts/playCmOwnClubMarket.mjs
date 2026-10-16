/* Round 1339, the walk: a Club Manager career from before Release AZ, resumed on the built site, lists nobody at
 * your own club in the transfer market, the same as your club's page.
 *
 * WHAT IT DOES. Plants the raw saves A (Real Madrid, season 1, the bake's extras) and B (Real Madrid, season 3, two
 * stars sold and deals run out) of scripts/data/cmPreAzMarketFixture.json the way a returning player's browser holds
 * them, presses Resume Career, and then:
 *   (a) the Market tab: types the club's name into "Search player or club" and counts the rows whose second line
 *       starts with "<club> ·". This build: zero. A picture of the list.
 *   (b) the club's own page (Table, the club's row): the "Squad (N on the books)" card names none of the men the old
 *       engine had on the market at my club (the fixture's expect lists), and names the save's squad. A picture.
 *   (c) the page does not jump: scrollY is the same before and after the search is typed; no page error.
 * A and B at 390 by 844, B also at 1280 by 900. Every request off the served origin is aborted (Supabase among them).
 *
 * CONTROL PLAY_OWNCLUB_CONTROL=base runs (a) against CONTROL_URL, a build of this tree with main's old line put back
 * (scripts/lib/cmOwnClubMarket1339.mjs withLegacyToday, built on the runner), and must count at least the fixture's
 * rows for A and B: exit 1 and FIRED. It is built from this tree's own text, so it fires on any later tree.
 * Exit 0 green, 1 red or the control fired, 2 could not run, 3 the control did not fire.
 *
 *   BASE=http://localhost:4173 node scripts/playCmOwnClubMarket.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import pw from './lib/playwrightLoader.mjs';

const { chromium } = pw;
const HEAD = (process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173').replace(/\/$/, '');
const CONTROL = process.env.PLAY_OWNCLUB_CONTROL ?? '';
const CONTROL_URL = (process.env.CONTROL_URL ?? '').replace(/\/$/, '');
const OUT = process.env.RC_OUT ? path.join(process.env.RC_OUT, '1339') : path.join('.tmp-fx', '1339');
const SAVE_KEY = 'dukb-club-manager-save';
const NOW = Date.UTC(2026, 9, 16, 16, 0, 0);
const cannot = why => { console.log(`playCmOwnClubMarket: cannot run: ${why}`); process.exit(2); };
if (CONTROL && CONTROL !== 'base') cannot(`unknown control ${CONTROL}`);
if (CONTROL && !CONTROL_URL) cannot('the base control needs CONTROL_URL, a served build of this tree with the old line');
fs.mkdirSync(OUT, { recursive: true });
const FX = JSON.parse(fs.readFileSync(path.join('scripts', 'data', 'cmPreAzMarketFixture.json'), 'utf8'));
const fails = [];
const fail = msg => { fails.push(msg); console.log(`  FAIL  ${msg}`); };
const pass = msg => console.log(`  PASS  ${msg}`);
const check = (ok, msg) => (ok ? pass(msg) : fail(msg));

const browser = await chromium.launch();
async function resume(url, key, size) {
  const origin = new URL(url).origin;
  const ctx = await browser.newContext({ viewport: size, deviceScaleFactor: 1, reducedMotion: 'reduce', serviceWorkers: 'block' });
  await ctx.route(/supabase\.co/, r => r.abort());
  await ctx.route('**/*', r => (new URL(r.request().url()).origin === origin ? r.continue() : r.abort()));
  await ctx.addInitScript(([k, v, now]) => {
    try { localStorage.setItem('cookie-consent', 'essential'); if (!localStorage.getItem(k)) localStorage.setItem(k, v); } catch { /* storage blocked */ }
    Date.now = () => now;
  }, [SAVE_KEY, FX.saves[key], NOW]);
  const page = await ctx.newPage();
  page.setDefaultTimeout(30000);
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(`${url}/club-manager`, { waitUntil: 'domcontentloaded' });
  const slot = page.locator('[data-testid="cm-slot-1"]').getByRole('button', { name: 'Resume Career', exact: true });
  const any = page.locator('button', { hasText: 'Resume Career' }).first();
  await (await slot.count() ? slot : any).waitFor({ timeout: 45000 }).catch(() => {});
  await ((await slot.count()) ? slot : any).click({ timeout: 45000 });
  await page.locator('[data-cm-hub]').waitFor({ timeout: 60000 });
  await page.waitForTimeout(500);
  return { ctx, page, errors };
}
/* (a): the market searched for my own club; the rows whose second line is at my club. */
async function marketRows(page, club, shot) {
  await page.getByRole('tab', { name: 'Market', exact: true }).click();
  const box = page.locator('input[aria-label="Search player or club"]');
  await box.waitFor({ timeout: 30000 });
  await box.scrollIntoViewIfNeeded();
  const before = await page.evaluate(() => window.scrollY);
  await box.fill(club);
  await page.waitForTimeout(600);
  const after = await page.evaluate(() => window.scrollY);
  const rows = await box.locator('xpath=following-sibling::div[1]').evaluate((list, c) => [...list.children]
    .map(row => row.querySelector('.text-muted-foreground.truncate')?.textContent?.trim() ?? '')
    .filter(line => line.startsWith(`${c} ·`)).length, club);
  if (shot) await page.screenshot({ path: path.join(OUT, shot), fullPage: false });
  return { rows, jump: after - before };
}
/* (b): the club's own page, the Squad card's text. */
async function clubPage(page, club, shot) {
  await page.getByRole('tab', { name: 'Table', exact: true }).click();
  const button = page.locator('[data-world-tables] button[data-club]').filter({ has: page.getByText(club, { exact: true }) });
  await button.first().waitFor({ timeout: 45000 });
  await button.first().click();
  const card = page.locator('div.bg-card').filter({ has: page.getByText(/^Squad \(\d+ on the books\)$/) });
  await card.first().waitFor({ timeout: 45000 });
  await card.first().scrollIntoViewIfNeeded();
  if (shot) await page.screenshot({ path: path.join(OUT, shot), fullPage: false });
  return card.first().innerText();
}

const PLAN = CONTROL
  ? [['A', { width: 390, height: 844 }], ['B', { width: 390, height: 844 }]]
  : [['A', { width: 390, height: 844 }], ['B', { width: 390, height: 844 }], ['B', { width: 1280, height: 900 }]];
const counted = {};
for (const [key, size] of PLAN) {
  const url = CONTROL ? CONTROL_URL : HEAD;
  const save = JSON.parse(FX.saves[key]);
  const club = save.clubName, tag = `${key}-${size.width}${CONTROL ? '-control' : ''}`;
  console.log(`${CONTROL ? 'control ' : ''}save ${key} (${club}, season ${save.season}) at ${size.width} by ${size.height}`);
  let walk;
  try { walk = await resume(url, key, size); } catch (e) { cannot(`save ${key} did not resume on ${url}: ${e.message.split('\n')[0]}`); }
  const { page, errors, ctx } = walk;
  const market = await marketRows(page, club, `market-${tag}.png`);
  counted[key] = market.rows;
  if (CONTROL) { console.log(`  the old line's market lists ${market.rows} rows at ${club} (the fixture recorded ${FX.expect[key].names.length})`); await ctx.close(); continue; }
  check(market.rows === 0, `(a) ${key} ${size.width}: the market searched for ${club} lists ${market.rows} rows at ${club}`);
  check(market.jump === 0, `(c) ${key} ${size.width}: typing the search moved the page by ${market.jump}px`);
  const text = await clubPage(page, club, `club-${tag}.png`);
  const listedOld = FX.expect[key].names.filter(n => text.includes(n));
  check(listedOld.length === 0, `(b) ${key} ${size.width}: the club's page names ${listedOld.length} of the old market's men at ${club}${listedOld.length ? ` (${listedOld.slice(0, 3).join(', ')})` : ''}`);
  const squad = save.squad.filter(p => !p.onLoan).map(p => p.name);
  const shown = squad.filter(n => text.includes(n)).length;
  check(shown >= Math.min(10, squad.length), `(b) ${key} ${size.width}: the club's page names ${shown} of the save's ${squad.length} men`);
  check(errors.length === 0, `(c) ${key} ${size.width}: ${errors.length} page errors${errors.length ? `, first ${errors[0].slice(0, 120)}` : ''}`);
  await ctx.close();
}
await browser.close();
if (CONTROL) {
  const fired = ['A', 'B'].every(k => counted[k] >= FX.expect[k].names.length);
  console.log(fired
    ? `playCmOwnClubMarket: CONTROL base FIRED: with the old line the market lists ${counted.A} and ${counted.B} men at the club for saves A and B`
    : `playCmOwnClubMarket: CONTROL base DID NOT FIRE as it must: ${counted.A} and ${counted.B} rows (the fixture recorded ${FX.expect.A.names.length} and ${FX.expect.B.names.length})`);
  process.exit(fired ? 1 : 3);
}
console.log(fails.length === 0
  ? `playCmOwnClubMarket: green. Saves A and B from before Release AZ list nobody at their own club on the market, the club's page names its squad and none of those men, and the page holds still (pictures in ${OUT})`
  : `playCmOwnClubMarket: ${fails.length} FAILURE(S)`);
process.exit(fails.length === 0 ? 0 : 1);
