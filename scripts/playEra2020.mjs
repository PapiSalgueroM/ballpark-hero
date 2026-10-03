/**
 * Round 971 browser harness: the 2020-21 era picker, played like a person.
 *
 * simEra2020 proves the engine and the bake; this walks the UI branch the
 * way playEra2015 walks 2015's: the newest era tile first on the menu, all
 * five nations offered, the era club tiles with their board demands, the
 * thin squad marker on a promoted club, and three real 2020-21 dressing
 * rooms (Dortmund with Haaland and Bellingham, Chelsea with the summer's
 * Havertz and Werner, Juventus with Ronaldo and the summer's Chiesa).
 *
 * Run: npm run build, serve dist with scripts/lib/hostLikeServer.mjs on
 *      4173, then ENGINES=chromium node scripts/playEra2020.mjs
 * (runAllSims files it as a browser harness automatically, it imports
 * playwright, and runs it only with --browser.) The lead runs it at release.
 * Control: ERA_CONTROL=drop takes the claimed men out of the served era
 * data, and exactly the checks that claim them must go red
 * (scripts/lib/eraDressingRoom.mjs).
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

/* The men this walk claims, and the checks that claim them. */
const CLAIMS = {
  'Erling Haaland': 'Haaland is in the 2020 Dortmund squad',
  'Jude Bellingham': 'Bellingham arrived from Birmingham, the window correction landed',
  'Kai Havertz': 'Havertz arrived from Leverkusen, the window correction landed',
  'Timo Werner': 'Werner arrived from Leipzig, the window correction landed',
  'Cristiano Ronaldo': 'Ronaldo is in the 2020 Juventus squad',
  'Federico Chiesa': 'Chiesa arrived on loan from Fiorentina, the window correction landed',
};
const DROP = Object.keys(CLAIMS);
const tally = { swaps: 0 };
const stillNamed = new Set();
if (ERA_CONTROL === 'drop') {
  const why = await assertDropControl(BASE, DROP);
  if (why) { console.error(`playEra2020 control: RED before it started. ${why}.`); process.exit(1); }
}
const noteNamed = body => { for (const n of DROP) if ((body ?? '').includes(n.split(' ').pop())) stillNamed.add(n); };

const browser = await chromium.launch();

async function openEra(page) {
  await page.goto(`${BASE}/club-manager`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const fresh = await page.locator('text=Start Fresh').count();
  if (fresh) { await page.locator('text=Start Fresh').click(); await page.waitForTimeout(800); }
}
async function pick(page, nation, league) {
  await page.locator('button:has-text("2020-21")').first().click();
  await page.waitForTimeout(700);
  await page.locator(`text=${nation}`).first().click();
  await page.waitForTimeout(700);
  await page.locator(`text=${league}`).first().click();
  await page.waitForTimeout(700);
}
async function room(page, club, label) {
  await page.locator(`button:has-text("${club}")`).first().click();
  await page.waitForTimeout(500);
  const essential = page.locator('button:has-text("Essential only")');
  if (await essential.count()) { await essential.click(); await page.waitForTimeout(400); }
  const r = await enterSquad(page);
  say(/2020-21 · Season 1/.test(r.hub), `the ${label} career header says 2020-21`);
  say(r.listed, `the Squad tab listed the ${label} squad`);
  return r;
}
const cleanErrors = errors => errors.filter(e => !/supabase|Failed to fetch|CORS/i.test(e));

/* ---------- Walk one: the menu, then Germany ---------- */
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  if (ERA_CONTROL === 'drop') await installDropControl(page, DROP, tally);
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await openEra(page);

  console.log('1) The era step holds four real past seasons, the newest first');
  say(await page.locator('button:has-text("2020-21")').count() >= 1, 'the 2020-21 era tile is on the menu');
  for (const older of ['2015-16', '2010-11', '2005-06']) say(await page.locator(`button:has-text("${older}")`).count() >= 1, `the ${older} tile survived the addition`);
  say((await page.locator('text=REAL DATA').count()) >= 4, 'all four past eras carry the REAL DATA badge');
  const tile = (await page.locator('button:has-text("2020-21")').first().textContent()) ?? '';
  say(/Haaland/.test(tile) && /big five/i.test(tile), 'the 2020-21 tile sells its squads and the big five');

  console.log('2) Germany in 2020');
  await page.locator('button:has-text("2020-21")').first().click();
  await page.waitForTimeout(700);
  for (const nation of ['England', 'Spain', 'Italy', 'Germany', 'France']) say(await page.locator(`text=${nation}`).count() >= 1, `${nation} offered in 2020`);
  await page.locator('text=Germany').first().click();
  await page.waitForTimeout(700);
  await page.locator('text=Bundesliga').first().click();
  await page.waitForTimeout(700);
  say(await page.locator('button:has-text("Arminia Bielefeld")').count() === 1, '2020 Arminia Bielefeld are a pickable club');
  say(await page.locator('button:has-text("Union Berlin")').count() === 1, '2020 Union Berlin are a pickable club');
  say(await page.locator('button:has-text("Elversberg")').count() === 0, '2026 Elversberg correctly absent from the 2020 Bundesliga');
  const bie = (await page.locator('button:has-text("Arminia Bielefeld")').first().textContent()) ?? '';
  say(/partial data/i.test(bie), 'the thin squad marker shows for Arminia Bielefeld');
  const bayern = (await page.locator('button:has-text("Bayern Munich")').first().textContent()) ?? '';
  say(/Win the Bundesliga/i.test(bayern), 'the Bayern tile demands the title');

  console.log('3) Into the 2020 Dortmund dressing room');
  const r = await room(page, 'Borussia Dortmund', 'Dortmund');
  say(/Erling Haaland/.test(r.squad), CLAIMS['Erling Haaland']);
  say(/Jude Bellingham/.test(r.squad), CLAIMS['Jude Bellingham']);
  say(!/Achraf Hakimi/.test(r.squad), 'Hakimi is gone to Inter, as he was that summer');
  noteNamed(await page.locator('body').textContent());
  const pe = cleanErrors(errors);
  say(pe.length === 0, `no real page errors on the Germany walk (${pe.length ? pe[0] : 'clean'})`);
  await page.close();
}

/* ---------- Walk two: England and the summer's Chelsea ---------- */
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  if (ERA_CONTROL === 'drop') await installDropControl(page, DROP, tally);
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await openEra(page);
  console.log('4) The 2020-21 Premier League');
  await pick(page, 'England', 'Premier League');
  say(await page.locator('button:has-text("Leeds United")').count() === 1, '2020 Leeds United are a pickable club');
  say(await page.locator('button:has-text("Sheffield United")').count() === 1, '2020 Sheffield United are a pickable club');
  say(await page.locator('button:has-text("Brentford")').count() === 0, 'Brentford correctly absent from the 2020-21 Premier League');
  const city = (await page.locator('button:has-text("Manchester City")').first().textContent()) ?? '';
  say(/Win the Premier League/i.test(city), 'the Manchester City tile demands the title');
  console.log('5) Into the 2020 Chelsea dressing room');
  const r = await room(page, 'Chelsea', 'Chelsea');
  say(/Kai Havertz/.test(r.squad), CLAIMS['Kai Havertz']);
  say(/Timo Werner/.test(r.squad), CLAIMS['Timo Werner']);
  const body = await page.locator('body').textContent();
  noteNamed(body);
  say(!/Lamine Yamal/.test(body ?? ''), 'no 2026 player leaked into 2020');
  const pe = cleanErrors(errors);
  say(pe.length === 0, `no real page errors on the England walk (${pe.length ? pe[0] : 'clean'})`);
  await page.close();
}

/* ---------- Walk three: Italy and Juventus ---------- */
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  if (ERA_CONTROL === 'drop') await installDropControl(page, DROP, tally);
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await openEra(page);
  console.log('6) The 2020-21 Serie A');
  await pick(page, 'Italy', 'Serie A');
  say(await page.locator('button:has-text("Spezia")').count() === 1, '2020 Spezia are a pickable club');
  const crot = (await page.locator('button:has-text("Crotone")').first().textContent()) ?? '';
  say(/partial data/i.test(crot), 'the thin squad marker shows for Crotone');
  console.log('7) Into the 2020 Turin dressing room');
  const r = await room(page, 'Juventus', 'Juventus');
  say(/Cristiano Ronaldo/.test(r.squad), CLAIMS['Cristiano Ronaldo']);
  say(/Federico Chiesa/.test(r.squad), CLAIMS['Federico Chiesa']);
  say(!/Gonzalo Higua/.test(r.squad), 'Higuain is gone to a league outside this world');
  noteNamed(await page.locator('body').textContent());
  const pe = cleanErrors(errors);
  say(pe.length === 0, `no real page errors on the Italy walk (${pe.length ? pe[0] : 'clean'})`);
  await page.close();
}

await browser.close();
console.log('');
if (ERA_CONTROL === 'drop') process.exit(judgeDropControl('playEra2020', failed, Object.values(CLAIMS), tally, [...stillNamed]));
if (failures > 0) {
  console.error(`playEra2020: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('playEra2020: green. The 2020-21 branch plays like a person would find it.');
