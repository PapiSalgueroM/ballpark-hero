/**
 * Round 175 browser harness: the 2015-16 era picker, played like a person.
 *
 * simEra2015 proves the engine and the bake; this walks the actual UI
 * branch the way playEra2010 walks 2010's: the third era tile, nations
 * shrinking to England and Spain, the era club tiles with their honest
 * board demands (August 2015 Leicester is NOT told to win anything, and
 * that is the whole joke of offering this season), the thin-squad marker
 * on Las Palmas, and a real 2015 dressing room with Vardy in it.
 *
 * Run: npm run build && npx serve -s dist -l 4173, then
 *      ENGINES=chromium node scripts/playEra2015.mjs
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

/* ---------- Walk one: Spain, the giants and the thin squad ---------- */
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(`${BASE}/club-manager`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const fresh = await page.locator('text=Start Fresh').count();
  if (fresh) { await page.locator('text=Start Fresh').click(); await page.waitForTimeout(800); }

  console.log('1) The era step now holds three real seasons');
  say(await page.locator('button:has-text("2015-16")').count() >= 1, 'the 2015-16 era tile is on the menu');
  say(await page.locator('button:has-text("2010-11")').count() >= 1, 'the 2010-11 tile survived the addition');
  say((await page.locator('text=REAL DATA').count()) >= 3, 'all three eras carry the REAL DATA badge');
  const tile = await page.locator('button:has-text("2015-16")').first().textContent();
  say(/Leicester/i.test(tile ?? ''), 'the 2015-16 tile sells the Leicester season');
  await page.locator('button:has-text("2015-16")').first().click();
  await page.waitForTimeout(700);

  console.log('2) Spain in 2015');
  say(await page.locator('text=England').count() >= 1 && await page.locator('text=Spain').count() >= 1, 'England and Spain offered in 2015');
  say(await page.locator('text=Germany').count() === 0, 'Germany correctly absent from 2015');
  await page.locator('text=Spain').first().click();
  await page.waitForTimeout(700);
  say(await page.locator('text=La Liga').count() >= 1, 'the 2015 La Liga is offered');
  await page.locator('text=La Liga').first().click();
  await page.waitForTimeout(700);
  say(await page.locator('button:has-text("Eibar")').count() === 1, '2015 Eibar is a pickable club');
  say(await page.locator('button:has-text("Girona")').count() === 0, 'Girona correctly absent from 2015 La Liga');
  say(await page.locator('text=partial data').count() >= 1, 'the thin-squad marker shows for Las Palmas');
  // The engine's standing phrase is "Win the <league name>" (playEra2010
  // matches "Win the Premier League"), so Spain reads "Win the La Liga".
  const barca = await page.locator('button:has-text("Barcelona")').first().textContent();
  say(/Win the La Liga/i.test(barca ?? ''), 'the Barcelona tile demands the title');
  const pageErrors = errors.filter(e => !/supabase|Failed to fetch|CORS/i.test(e));
  say(pageErrors.length === 0, `no real page errors on the Spain walk (${pageErrors.length ? pageErrors[0] : 'clean'})`);
  await page.close();
}

/* ---------- Walk two: England, and the champions nobody rated ---------- */
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(`${BASE}/club-manager`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const fresh = await page.locator('text=Start Fresh').count();
  if (fresh) { await page.locator('text=Start Fresh').click(); await page.waitForTimeout(800); }
  await page.locator('button:has-text("2015-16")').first().click();
  await page.waitForTimeout(700);
  await page.locator('text=England').first().click();
  await page.waitForTimeout(700);

  console.log('3) The 2015 Premier League');
  say(await page.locator('text=Premier League').count() >= 1, 'the 2015 Premier League is offered');
  await page.locator('text=Premier League').first().click();
  await page.waitForTimeout(700);
  say(await page.locator('button:has-text("Leicester City")').count() === 1, '2015 Leicester are a pickable club');
  say(await page.locator('button:has-text("Norwich City")').count() === 1, '2015 Norwich are a pickable club');
  say(await page.locator('button:has-text("Barcelona")').count() === 0, 'Barcelona is not in the English league');
  const lei = await page.locator('button:has-text("Leicester City")').first().textContent();
  say(!/Win the Premier League/i.test(lei ?? ''), 'August 2015 Leicester are NOT told to win the league');
  say(!/Top \d+/i.test(lei ?? ''), 'no Top N phrasing on the Leicester tile');

  console.log('4) Into the 2015 dressing room');
  await page.locator('button:has-text("Leicester City")').first().click();
  await page.waitForTimeout(500);
  const essential = page.locator('button:has-text("Essential only")');
  if (await essential.count()) { await essential.click(); await page.waitForTimeout(400); }
  await page.locator('text=Take the job').click();
  await page.waitForTimeout(2000);
  const body = await page.locator('body').textContent();
  say(/2015-16/.test(body ?? ''), 'the career header says 2015-16');
  const squadTab = page.locator('text=Squad').first();
  if (await squadTab.count()) { await squadTab.click(); await page.waitForTimeout(900); }
  const body2 = await page.locator('body').textContent();
  say(/Vardy/.test(body2 ?? ''), 'Jamie Vardy is in the 2015 Leicester squad');
  say(/Schmeichel/.test(body2 ?? ''), 'Kasper Schmeichel is in goal');
  say(!/Haaland/.test(body2 ?? ''), 'no 2026 player leaked into 2015');
  const pageErrors = errors.filter(e => !/supabase|Failed to fetch|CORS/i.test(e));
  say(pageErrors.length === 0, `no real page errors on the England walk (${pageErrors.length ? pageErrors[0] : 'clean'})`);
  await page.close();
}

await browser.close();
console.log('');
if (failures > 0) {
  console.error(`playEra2015: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('playEra2015: green. The 2015-16 branch plays like a person would find it.');
