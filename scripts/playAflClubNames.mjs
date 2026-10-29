/**
 * Round 1572 browser walk: Aussie Rules Manager on the BUILT site at 390 by 844 and 1280 by 800.
 *
 * (a) Empty storage: the menu's 18 names are the two sourced 2026 list (scripts/data/aflClubNames2026.json),
 *     the page never scrolls sideways, and no tile name is clipped.
 * (b) Pick club-17, play one match in two taps (prepare, then the whole match), open the ladder and the hub:
 *     every club name on them is on the list, and the opened panel sits in view.
 * (c) A career started on the invented clubs (built in Node from the esbuild bundle of the engine, critic advice
 *     15, and planted before the first navigation) opens under its invented name, its Club panel offers the
 *     switch, and after the switch the header shows the real name while the ladder's order and numbers do not
 *     move; a reload keeps it.
 * Control PLAY_AFL_NAMES_CONTROL=bundlename rewrites "Collingwood" to "Collingwod" in the served scripts (it
 * refuses to run unless a served script holds the name) and (a) must fail.
 *
 * The live database is blocked for the whole walk. Screenshots go to $RC_OUT when it is set.
 * Run on a served build: BASE=http://localhost:4173 node scripts/playAflClubNames.mjs (a remote check's #!serve).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pw from './lib/playwrightLoader.mjs';
import { answerConsent } from './lib/answerConsent.mjs';
import { bundle, play } from './lib/aflClubNames1572.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173';
const CONTROL = process.env.PLAY_AFL_NAMES_CONTROL || '';
if (CONTROL && CONTROL !== 'bundlename') { console.error(`unknown control ${CONTROL}`); process.exit(2); }
const OUT = process.env.RC_OUT || '';
const ROUTE = '/aussie-rules-manager';
const LEDGER = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/aflClubNames2026.json'), 'utf8'));
const FULL = LEDGER.clubs.map(c => c.full), SHORT = new Set(LEDGER.clubs.map(c => c.short));
const started = Date.now();

const failures = { a: 0, b: 0, c: 0 };
let checks = 0, part = 'a', routes = 0, rewritten = 0;
const say = (ok, what) => { checks += 1; console.log(`  ${ok ? 'PASS' : 'FAIL'} (${part}) ${what}`); if (!ok) failures[part] += 1; };

/* The invented league career of (c), from the engine itself: seed 5, club-00, played to the report of round 4. */
const { L } = await bundle(ROOT);
let invented = L.createLeague(5, 'club-00');
invented = play(L, invented, 40);
const INVENTED_RAW = JSON.stringify(invented);
const INVENTED_NAME = invented.clubName, REAL_NAME = L.clubFull({ clubSet: 'afl2026' }, invented.myClub);
if (invented.clubSet || !L.readLeagueSave(INVENTED_RAW)) { console.error('the planted save is not an invented league save'); process.exit(2); }

const { chromium } = pw;
const browser = await chromium.launch();
async function freshPage(viewport, plant) {
  const context = await browser.newContext({ viewport });
  await context.route(/supabase\.co/, r => r.abort());
  if (CONTROL === 'bundlename') {
    await context.route('**/assets/*.js', async route => {
      const response = await route.fetch();
      const body = await response.text();
      const next = body.split('Collingwood').join('Collingwod');
      if (next !== body) rewritten += 1;
      await route.fulfill({ response, body: next });
    });
  }
  if (plant) await context.addInitScript(([key, raw]) => { if (!sessionStorage.getItem('afl-planted')) { localStorage.setItem(key, raw); sessionStorage.setItem('afl-planted', '1'); } }, [L.SAVE_KEY, plant]);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(`${BASE}${ROUTE}`, { waitUntil: 'domcontentloaded' });
  routes += 1;
  await answerConsent(page);
  const rules = page.getByRole('button', { name: "Let's Play!" });
  if (await rules.count()) { await rules.first().click(); await page.waitForTimeout(300); }
  return { context, page, errors };
}
/* A control run names its shots apart, so a plain run beside it on the same runner keeps its own. */
const shot = async (page, name) => { if (OUT) await page.screenshot({ path: path.join(OUT, `${CONTROL ? `${CONTROL}-` : ""}${name}.png`), fullPage: false }); };
const texts = (page, selector) => page.$$eval(selector, els => els.map(el => (el.textContent || '').replace(/\s+/g, ' ').trim()));
const tile = async (page, title) => { await page.locator('button', { has: page.locator(`div:text-is("${title}")`) }).first().click(); await page.waitForTimeout(250); };
const hub = async page => { await page.getByRole('button', { name: /Hub/ }).first().click(); await page.waitForTimeout(250); };

for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 800 }]) {
  const w = viewport.width;
  console.log(`\n${w} by ${viewport.height}`);

  part = 'a';
  {
    const { context, page, errors } = await freshPage(viewport, null);
    /* The served document is the old snapshot until React draws: wait for 18 tiles with a real name in them. */
    const drawn = await page.waitForFunction(names => {
      const tiles = [...document.querySelectorAll('[data-arl-club] strong')];
      return tiles.length === 18 && tiles.every(t => names.includes((t.textContent || '').trim()));
    }, FULL, { timeout: 20000 }).then(() => true, () => false);
    const names = await texts(page, '[data-arl-club] strong');
    say(drawn && names.length === 18, `the menu drew 18 club tiles with a name on the list (${names.length}: ${names.join(', ')})`);
    say(JSON.stringify([...names].sort()) === JSON.stringify([...FULL].sort()), 'the 18 names are exactly the two sourced 2026 full forms');
    const sideways = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    say(sideways[0] <= sideways[1], `no sideways scroll (scrollWidth ${sideways[0]}, innerWidth ${sideways[1]})`);
    const clipped = await page.$$eval('[data-arl-club] strong', els => els.filter(el => el.scrollWidth > el.clientWidth).map(el => el.textContent));
    say(clipped.length === 0, `no tile name is clipped (${clipped.length}${clipped.length ? `: ${clipped.join(', ')}` : ''})`);
    say(errors.length === 0, `no page errors (${errors.length})`);
    await shot(page, `afl-menu-${w}`);

    part = 'b';
    if (!CONTROL) {
      await page.locator('[data-arl-club="club-17"]').click();
      await page.waitForTimeout(400);
      const header = await texts(page, 'section[data-arl-phase] header p');
      say(header[0] === 'Essendon · Season 1', `the header names the club picked (${header[0]})`);
      await tile(page, 'Next match');
      await page.locator('[data-arl-prepare="train"]').click(); await page.waitForTimeout(250);
      await page.locator('[data-arl-playmatch]').click(); await page.waitForTimeout(400);
      const scored = await texts(page, '[data-arl-score] strong');
      say(scored.length === 2 && scored.every(n => FULL.includes(n)), `two taps play the match, and the score card names two listed clubs (${scored.join(' v ')})`);
      await hub(page);
      const before = await page.evaluate(() => window.scrollY);
      await tile(page, 'Ladder');
      const after = await page.evaluate(() => window.scrollY);
      const seen = await page.evaluate(() => { const h = [...document.querySelectorAll('h3')].find(x => x.textContent === 'Ladder'); const r = h && h.getBoundingClientRect(); return r ? [r.top, window.innerHeight] : null; });
      say(!!seen && seen[0] >= 0 && seen[0] < seen[1], `the opened ladder sits in view (heading at ${seen && Math.round(seen[0])} of ${seen && seen[1]}, scrollY ${before} to ${after})`);
      const ladder = (await texts(page, '[data-arl-ladder] th')).map(t => t.replace(/^\d+\. /, ''));
      say(ladder.length === 18 && ladder.every(n => SHORT.has(n)), `the ladder's 18 names are on the list (${ladder.filter(n => !SHORT.has(n)).join(', ') || 'none off it'})`);
      await shot(page, `afl-ladder-${w}`);
      await hub(page);
      const subs = await page.$$eval('button div', els => els.map(el => (el.textContent || '').trim()).filter(t => t.startsWith('v ')));
      say(subs.length >= 1 && subs.every(t => SHORT.has(t.slice(2))), `the hub's Next match names a listed club (${subs.join(', ')})`);
      say(errors.length === 0, `no page errors (${errors.length})`);
    }
    await context.close();
  }

  part = 'c';
  if (!CONTROL) {
    const { context, page, errors } = await freshPage(viewport, INVENTED_RAW);
    await page.waitForSelector('section[data-arl-phase] header p', { timeout: 20000 });
    const header = await texts(page, 'section[data-arl-phase] header p');
    say(header[0].startsWith(`${INVENTED_NAME} · Season`), `an invented league career opens under its own name (${header[0]})`);
    await tile(page, 'Ladder');
    const order = await page.$$eval('[data-arl-ladder]', els => els.map(el => el.getAttribute('data-arl-ladder')));
    const numbers = await texts(page, '[data-arl-ladder] td');
    await hub(page);
    await tile(page, 'Club');
    const offer = await texts(page, '[data-arl-switch] p');
    say(offer.length === 1 && offer[0].includes(`${INVENTED_NAME} become ${REAL_NAME}`), `the Club panel offers the switch (${offer[0]})`);
    await shot(page, `afl-switch-${w}`);
    await page.locator('[data-arl-switchask]').click(); await page.waitForTimeout(200);
    await page.locator('[data-arl-switchconfirm]').click(); await page.waitForTimeout(400);
    const now = await texts(page, 'section[data-arl-phase] header p');
    say(now[0].startsWith(`${REAL_NAME} · Season`) && (await page.locator('[data-arl-switch]').count()) === 0, `after the switch the header reads ${now[0]} and the offer is gone`);
    await hub(page);
    await tile(page, 'Ladder');
    const order2 = await page.$$eval('[data-arl-ladder]', els => els.map(el => el.getAttribute('data-arl-ladder')));
    const numbers2 = await texts(page, '[data-arl-ladder] td');
    const names2 = (await texts(page, '[data-arl-ladder] th')).map(t => t.replace(/^\d+\. /, ''));
    say(JSON.stringify(order2) === JSON.stringify(order) && JSON.stringify(numbers2) === JSON.stringify(numbers) && order.length === 18, `the ladder's order and ${numbers.length} numbers did not move`);
    say(names2.every(n => SHORT.has(n)), `the ladder now prints the listed names (${names2.slice(0, 3).join(', ')}...)`);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('section[data-arl-phase] header p', { timeout: 20000 });
    const kept = await texts(page, 'section[data-arl-phase] header p');
    say(kept[0].startsWith(`${REAL_NAME} · Season`), `a reload keeps the switch (${kept[0]})`);
    say(errors.length === 0, `no page errors (${errors.length})`);
    await context.close();
  }
}
await browser.close();

const secs = ((Date.now() - started) / 1000).toFixed(1);
if (CONTROL) {
  if (!rewritten) { console.error('control bundlename cannot run: no served script holds "Collingwood"'); process.exit(2); }
  const fired = failures.a > 0;
  console.log(`\nplayAflClubNames control bundlename: ${rewritten} scripts rewritten, (a) ${fired ? 'RED' : 'green'}, ${routes} routes walked, ${secs} s. ${fired ? 'RED as intended' : 'DID NOT FIRE'}`);
  process.exit(fired ? 1 : 3);
}
const total = failures.a + failures.b + failures.c;
console.log(`\nplayAflClubNames: ${checks} checks, ${total} failures (a ${failures.a}, b ${failures.b}, c ${failures.c}), 2 viewports, ${routes} routes walked, ${secs} s`);
process.exit(total ? 1 : 0);
