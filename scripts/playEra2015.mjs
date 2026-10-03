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
   checks must go red (see scripts/lib/eraDressingRoom.mjs). Vardy and Dybala
   are the two that used to pass off the guide copy with no squad on screen. */
const CLAIMS = {
  'Jamie Vardy': 'Jamie Vardy is in the 2015 Leicester squad',
  'Kasper Schmeichel': 'Kasper Schmeichel is in goal',
  'Paulo Dybala': 'Dybala arrived from Palermo, the window correction landed',
  'Gianluigi Buffon': 'Buffon is in goal',
  'Paul Pogba': 'Pogba stayed for 2015-16, exactly as in real life',
};
const DROP = Object.keys(CLAIMS);
const tally = { swaps: 0 };
const stillNamed = new Set();
if (ERA_CONTROL === 'drop') {
  const why = await assertDropControl(BASE, DROP);
  if (why) { console.error(`playEra2015 control: RED before it started. ${why}.`); process.exit(1); }
}
const noteNamed = body => { for (const n of DROP) if ((body ?? '').includes(n.split(' ').pop())) stillNamed.add(n); };

const browser = await chromium.launch();

/* ---------- Walk one: Spain, the giants and the thin squad ---------- */
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  if (ERA_CONTROL === 'drop') await installDropControl(page, DROP, tally);
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
  /* Round 899 made 2015-16 a full big five: Germany and France are offered now, and a nation that had no league in
     this world (the Netherlands) still is not. */
  say(await page.locator('text=Germany').count() >= 1 && await page.locator('text=France').count() >= 1, 'Germany and France offered in 2015 (Round 899)');
  say(await page.locator('text=Netherlands').count() === 0, 'the Netherlands correctly absent from 2015');
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
  if (ERA_CONTROL === 'drop') await installDropControl(page, DROP, tally);
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
  /* Round 672: through the dugout step (Round 303) to the Squad tab, and the
     squad claims read off that tab's own panel rather than the whole page,
     whose guide copy names Vardy by itself. See scripts/lib/eraDressingRoom. */
  const room = await enterSquad(page);
  say(/2015-16 · Season 1/.test(room.hub), 'the career header says 2015-16');
  say(room.listed, 'the Squad tab listed the Leicester squad');
  say(/Jamie Vardy/.test(room.squad), CLAIMS['Jamie Vardy']);
  say(/Kasper Schmeichel/.test(room.squad), CLAIMS['Kasper Schmeichel']);
  const body2 = await page.locator('body').textContent();
  noteNamed(body2);
  say(!/Haaland/.test(body2 ?? ''), 'no 2026 player leaked into 2015');
  const pageErrors = errors.filter(e => !/supabase|Failed to fetch|CORS/i.test(e));
  say(pageErrors.length === 0, `no real page errors on the England walk (${pageErrors.length ? pageErrors[0] : 'clean'})`);
  await page.close();
}

/* ---------- Walk three: Round 191, Italy and the five-straight champions ---------- */
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  if (ERA_CONTROL === 'drop') await installDropControl(page, DROP, tally);
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(`${BASE}/club-manager`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const fresh = await page.locator('text=Start Fresh').count();
  if (fresh) { await page.locator('text=Start Fresh').click(); await page.waitForTimeout(800); }
  await page.locator('button:has-text("2015-16")').first().click();
  await page.waitForTimeout(700);

  console.log('5) Italy in 2015');
  say(await page.locator('text=Italy').count() >= 1, 'Italy joined the 2015 nations');
  await page.locator('text=Italy').first().click();
  await page.waitForTimeout(700);
  say(await page.locator('text=Serie A').count() >= 1, 'the 2015 Serie A is offered');
  await page.locator('text=Serie A').first().click();
  await page.waitForTimeout(700);
  say(await page.locator('button:has-text("Juventus")').count() === 1, '2015 Juventus are a pickable club');
  say(await page.locator('button:has-text("Carpi")').count() === 1, '2015 Carpi are a pickable club (their one top flight season)');
  say(await page.locator('button:has-text("Chievo Verona")').count() === 1, '2015 Chievo are a pickable club');
  say(await page.locator('button:has-text("Como")').count() === 0, '2026 Como correctly absent from 2015 Serie A');
  const frosi = await page.locator('button:has-text("Frosinone")').first().textContent();
  say(/partial data/i.test(frosi ?? ''), 'the thin-squad marker shows for Frosinone');
  const juve = await page.locator('button:has-text("Juventus")').first().textContent();
  say(/Win the Serie A/i.test(juve ?? ''), 'the Juventus tile demands the title');

  console.log('6) Into the 2015 Turin dressing room');
  await page.locator('button:has-text("Juventus")').first().click();
  await page.waitForTimeout(500);
  const essential = page.locator('button:has-text("Essential only")');
  if (await essential.count()) { await essential.click(); await page.waitForTimeout(400); }
  /* Round 672: the same way in as walk two, and the same panel read. */
  const room = await enterSquad(page);
  say(/2015-16 · Season 1/.test(room.hub), 'the career header says 2015-16');
  say(room.listed, 'the Squad tab listed the Juventus squad');
  say(/Paulo Dybala/.test(room.squad), CLAIMS['Paulo Dybala']);
  say(/Gianluigi Buffon/.test(room.squad), CLAIMS['Gianluigi Buffon']);
  say(/Paul Pogba/.test(room.squad), CLAIMS['Paul Pogba']);
  const body2 = await page.locator('body').textContent();
  noteNamed(body2);
  say(!/Vidal/.test(body2 ?? ''), 'Vidal is gone to a league outside this world');
  const pageErrors = errors.filter(e => !/supabase|Failed to fetch|CORS/i.test(e));
  say(pageErrors.length === 0, `no real page errors on the Italy walk (${pageErrors.length ? pageErrors[0] : 'clean'})`);
  await page.close();
}

await browser.close();
console.log('');
if (ERA_CONTROL === 'drop') process.exit(judgeDropControl('playEra2015', failed, Object.values(CLAIMS), tally, [...stillNamed]));
if (failures > 0) {
  console.error(`playEra2015: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('playEra2015: green. The 2015-16 branch plays like a person would find it.');
