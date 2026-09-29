/**
 * Round 176 browser harness: the 2005-06 era picker, played like a person.
 *
 * simEra2005 proves the engine and the bake; this walks the UI branch the
 * way playEra2010 and playEra2015 walk theirs: the fourth era tile, the
 * nations, the era club tiles with 2005 vocabulary (somebody's board says
 * UEFA Cup and nobody's says Europa or Conference), the thin Cadiz marker,
 * and a real 2005 dressing room at Newcastle with the summer's headline
 * signing in it.
 *
 * Run: npm run build && npx serve -s dist -l 4173, then
 *      ENGINES=chromium node scripts/playEra2005.mjs
 * (runAllSims files it as a browser harness automatically, it imports
 * playwright, and runs it only with --browser.)
 */
import pw from './lib/playwrightLoader.mjs';
import { ERA_CONTROL, assertDropControl, installDropControl, enterSquad, judgeDropControl } from './lib/eraDressingRoom.mjs';

const { chromium } = pw;
const BASE = process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173';

let failures = 0;
const failed = [];
const say = (ok, what) => {
  console.log((ok ? '  PASS  ' : '  FAIL  ') + what);
  if (!ok) { failures += 1; failed.push(what); }
};

/* Round 672: the men this walk claims, and the checks that claim them.
   ERA_CONTROL=drop takes them out of the served era data and exactly these
   checks must go red (see scripts/lib/eraDressingRoom.mjs). */
const OWEN_CHECK = 'Michael Owen is at 2005 Newcastle (the window correction, visible in the UI)';
const SHEARER_CHECK = 'Alan Shearer is in the squad';
const DROP = ['Michael Owen', 'Alan Shearer'];
const tally = { swaps: 0 };
const stillNamed = new Set();
if (ERA_CONTROL === 'drop') {
  const why = await assertDropControl(BASE, DROP);
  if (why) { console.error(`playEra2005 control: RED before it started. ${why}.`); process.exit(1); }
}

const browser = await chromium.launch();

/* ---------- Walk one: Spain, the giants and the thinnest squad ---------- */
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(`${BASE}/club-manager`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const fresh = await page.locator('text=Start Fresh').count();
  if (fresh) { await page.locator('text=Start Fresh').click(); await page.waitForTimeout(800); }

  console.log('1) The era step now holds four real starts');
  say(await page.locator('button:has-text("2005-06")').count() >= 1, 'the 2005-06 era tile is on the menu');
  say(await page.locator('button:has-text("2015-16")').count() >= 1, 'the 2015-16 tile survived');
  say(await page.locator('button:has-text("2010-11")').count() >= 1, 'the 2010-11 tile survived');
  say((await page.locator('text=REAL DATA').count()) >= 4, 'all four eras carry the REAL DATA badge');
  const tile = await page.locator('button:has-text("2005-06")').first().textContent();
  say(/Ronaldinho/i.test(tile ?? ''), 'the 2005-06 tile sells the Ronaldinho season');
  await page.locator('button:has-text("2005-06")').first().click();
  await page.waitForTimeout(700);

  console.log('2) Spain in 2005');
  say(await page.locator('text=England').count() >= 1 && await page.locator('text=Spain').count() >= 1, 'England and Spain offered in 2005');
  say(await page.locator('text=Germany').count() === 0, 'Germany correctly absent from 2005');
  await page.locator('text=Spain').first().click();
  await page.waitForTimeout(700);
  await page.locator('text=La Liga').first().click();
  await page.waitForTimeout(700);
  say(await page.locator('button:has-text("Cádiz")').count() === 1, '2005 Cadiz are a pickable club');
  say(await page.locator('button:has-text("Eibar")').count() === 0, 'Eibar correctly absent from 2005 La Liga');
  say(await page.locator('text=partial data').count() >= 2, 'the thin-squad marker shows for Cadiz AND Alaves');
  const barca = await page.locator('button:has-text("Barcelona")').first().textContent();
  say(/Win the La Liga/i.test(barca ?? ''), 'the Barcelona tile demands the title');
  const pageErrors = errors.filter(e => !/supabase|Failed to fetch|CORS/i.test(e));
  say(pageErrors.length === 0, `no real page errors on the Spain walk (${pageErrors.length ? pageErrors[0] : 'clean'})`);
  await page.close();
}

/* ---------- Walk two: England, 2005 vocabulary, and Owen's Newcastle ---------- */
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  if (ERA_CONTROL === 'drop') await installDropControl(page, DROP, tally);
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(`${BASE}/club-manager`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const fresh = await page.locator('text=Start Fresh').count();
  if (fresh) { await page.locator('text=Start Fresh').click(); await page.waitForTimeout(800); }
  await page.locator('button:has-text("2005-06")').first().click();
  await page.waitForTimeout(700);
  await page.locator('text=England').first().click();
  await page.waitForTimeout(700);
  await page.locator('text=Premier League').first().click();
  await page.waitForTimeout(900);

  console.log('3) The 2005 Premier League speaks 2005');
  say(await page.locator('button:has-text("Wigan Athletic")').count() === 1, '2005 Wigan are a pickable club');
  say(await page.locator('button:has-text("Leicester City")').count() === 0, 'Leicester correctly absent from the 2005 top flight');
  const che = await page.locator('button:has-text("Chelsea")').first().textContent();
  say(/Win the Premier League/i.test(che ?? ''), 'the Chelsea tile demands the title');
  /* The vocabulary check reads the CLUB TILES only. The page body also holds
     the SEO block, which legitimately describes the modern game's Europa
     and Conference League, so the first draft of this check failed itself
     by reading the whole page. */
  const tileTexts = await page.locator('button:has-text("Board wants")').allTextContents();
  say(tileTexts.length >= 15, `the club grid renders board demands (${tileTexts.length} tiles)`);
  say(tileTexts.some(t => /UEFA Cup/.test(t)), 'somebody\'s board names the UEFA Cup');
  say(!tileTexts.some(t => /Europa League/.test(t)), 'no 2005 board says Europa League (that name arrived in 2009)');
  say(!tileTexts.some(t => /Conference League/.test(t)), 'no 2005 board says Conference League');

  console.log('4) Into the 2005 dressing room');
  await page.locator('button:has-text("Newcastle")').first().click();
  await page.waitForTimeout(500);
  const essential = page.locator('button:has-text("Essential only")');
  if (await essential.count()) { await essential.click(); await page.waitForTimeout(400); }
  /* Round 672: through the dugout step (Round 303) to the Squad tab, and the
     squad claims read off that tab's own panel rather than the whole page,
     whose guide copy names players of its own. See scripts/lib/eraDressingRoom. */
  const room = await enterSquad(page);
  say(/2005-06 · Season 1/.test(room.hub), 'the career header says 2005-06');
  say(room.listed, 'the Squad tab listed the squad');
  say(/Michael Owen/.test(room.squad), OWEN_CHECK);
  say(/Alan Shearer/.test(room.squad), SHEARER_CHECK);
  const body2 = await page.locator('body').textContent();
  for (const n of DROP) if ((body2 ?? '').includes(n)) stillNamed.add(n);
  say(!/Haaland/.test(body2 ?? ''), 'no 2026 player leaked into 2005');
  const pageErrors = errors.filter(e => !/supabase|Failed to fetch|CORS/i.test(e));
  say(pageErrors.length === 0, `no real page errors on the England walk (${pageErrors.length ? pageErrors[0] : 'clean'})`);
  await page.close();
}

await browser.close();
console.log('');
if (ERA_CONTROL === 'drop') process.exit(judgeDropControl('playEra2005', failed, [OWEN_CHECK, SHEARER_CHECK], tally, [...stillNamed]));
if (failures > 0) {
  console.error(`playEra2005: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('playEra2005: green. The 2005-06 branch plays like a person would find it.');
