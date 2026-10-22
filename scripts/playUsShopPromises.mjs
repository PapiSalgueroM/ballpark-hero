/* Round 1534: the US My Career shop keeps its promises, walked in a real browser on a served build.
 *
 * /nba-my-career at 320 by 640 and 390 by 844 (touch) and 1280 by 900:
 *   (a) a first visit: the "How to play" dialog holds the shop rule with its worked example (the index fund's 7
 *       percent of 2M, 0.14M, and the family office's 2 percent), read off the card words, not the module.
 *   (b) the board's own mid career save (2026 money, season phase) holding two index funds and the family office:
 *       Bank, Shop, the Family aisle: the office card prints its 2 percent; back, Play the season: the season's
 *       feed holds the returns line (earned, banked, waiting) and the saved Cash moved by exactly the pay less the
 *       upkeep plus the banked amount, worked out here from the printed rates.
 *   (d) after every step: no sideways scroll, no page error, the office's effect line no smaller than its
 *       description line (both 11 px on the base, critic advice 20) and not cut, the returns line not cut.
 * A screenshot after every step goes to $RC_OUT (or .tmp-fx/play-us-shop): LOOK at them.
 *
 * The live database host is aborted; anything else off the served origin gets an empty answer.
 * Control PLAY_SHOP_CONTROL=nocall runs against a second build (PLAY_SHOP_DIST) made from a copy of the tree with
 * the four settle calls removed: (b) must turn red, exit 1 with "CONTROL nocall FIRED", else 3.
 * Needs dist/ (a plain vite build is enough). Run: node scripts/playUsShopPromises.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from './lib/playwrightLoader.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.PLAY_SHOP_CONTROL || '';
if (CONTROL && CONTROL !== 'nocall') { console.log(`playUsShopPromises: could not run, unknown control ${CONTROL}`); process.exit(2); }
const DIST = process.env.PLAY_SHOP_DIST || 'dist';
const OUT = path.resolve(process.env.RC_OUT || path.join(ROOT, '.tmp-fx/play-us-shop'));
fs.mkdirSync(OUT, { recursive: true });
if (!fs.existsSync(path.join(ROOT, DIST, 'index.html'))) { console.log(`playUsShopPromises: could not run, build ${DIST} first`); process.exit(2); }
const fixture = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/usBoardFixture.json'), 'utf8'));
const keyLine = fs.readFileSync(path.join(ROOT, 'src/lib/nbaCareerSport.ts'), 'utf8').match(/const SAVE_KEY = '([^']+)';/);
if (!keyLine) { console.log('playUsShopPromises: could not run, the NBA binding no longer names its SAVE_KEY'); process.exit(2); }
const SAVE_KEY = keyLine[1];

let failures = 0;
const red = new Set();
const fail = (walk, what) => { failures += 1; red.add(walk); console.log(`  FAIL ${walk}: ${what}`); };
const notes = [];

const port = await new Promise((resolve, reject) => {
  const probe = createServer(); probe.once('error', reject);
  probe.listen(0, '127.0.0.1', () => { const chosen = probe.address().port; probe.close(error => (error ? reject(error) : resolve(chosen))); });
});
const BASE = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', DIST, String(port)], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
let serverLog = '';
server.stderr.on('data', data => { serverLog += data; });
await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error(`the server did not start within 20 seconds: ${serverLog}`)), 20000);
  server.once('exit', code => { clearTimeout(timer); reject(new Error(`the server exited ${code}: ${serverLog}`)); });
  server.stdout.on('data', data => { serverLog += data; if (String(data).includes('host-like server:')) { clearTimeout(timer); resolve(); } });
});

const SIZES = [{ width: 320, height: 640, touch: true }, { width: 390, height: 844, touch: true }, { width: 1280, height: 900, touch: false }];
async function open(browser, size, storage) {
  const context = await browser.newContext({
    viewport: { width: size.width, height: size.height }, isMobile: size.touch, hasTouch: size.touch, deviceScaleFactor: 1, serviceWorkers: 'block',
    storageState: { cookies: [], origins: [{ origin: BASE, localStorage: [{ name: 'cookie-consent', value: 'essential' }, ...storage] }] },
  });
  await context.route('**/*', r => {
    const url = r.request().url();
    if (/supabase\.co/.test(url)) return r.abort();
    if (new URL(url).origin === BASE) return r.continue();
    const type = r.request().resourceType();
    return r.fulfill({ status: 200, contentType: type === 'stylesheet' ? 'text/css' : 'application/json', body: type === 'stylesheet' ? '' : '[]' });
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(`${BASE}/nba-my-career`, { waitUntil: 'domcontentloaded' });
  return { context, page, errors };
}
function kit(walk, size, page, errors) {
  let n = 0;
  const tap = async locator => { if (size.touch) await locator.tap(); else await locator.click(); };
  const check = async name => {
    await page.waitForTimeout(400);
    const m = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth }));
    if (m.sw > m.iw) fail(walk, `${name}: sideways scroll (${m.sw} wide on ${m.iw})`);
    if (errors.length) fail(walk, `${name}: page error ${errors.join(' | ').slice(0, 200)}`);
    await page.screenshot({ path: path.join(OUT, `${walk}-${size.width}-${String(++n).padStart(2, '0')}-${name}.png`) });
  };
  return { tap, check };
}

/* The printed words, as literals: the index fund is "Steady 7 percent" at 2M, the office "Adds 2 percent to your
   cash every season" at 180k a year, and the season's pay banks 45 percent (TAKE_HOME). */
const INDEX_RATE = 0.07, INDEX_COST = 2, OFFICE_RATE = 0.02, OFFICE_UPKEEP = 0.18, TAKE_HOME = 0.45;
const r1 = v => Math.round(v * 10) / 10;

async function walkA(browser, size) {
  const walk = 'a';
  const { context, page, errors } = await open(browser, size, []);
  const { check } = kit(walk, size, page, errors);
  try {
    const dialog = page.getByRole('dialog');
    await dialog.waitFor();
    const text = await dialog.innerText();
    for (const want of ['Put 2M in the Boring Index Fund and it pays 7 percent, 0.14M, every season.', 'so 0.1M lands this season and the 0.04M waits for the next one',
      'Family Office adds 2 percent of your cash every season', 'the lawyer makes a clean season cool your heat twice as fast']) {
      if (!text.includes(want)) fail(walk, `${size.width}: the How to play dialog does not say "${want}"`);
    }
    await check('first-visit');
  } catch (error) { fail(walk, `${size.width}: ${String(error.message || error).split('\n')[0]}`); } finally { await context.close(); }
}

async function walkB(browser, size) {
  const walk = 'b';
  const save = JSON.parse(fixture.sports.nba.saves.mid);
  if (save.phase !== 'season' || save.c.eraId) { fail(walk, 'the fixture\'s mid save is no longer a 2026 season'); return; }
  save.c.purchased = [...(save.c.purchased ?? []), 'index_nba', 'index_nba', 'family_office_nba'];
  save.c.yearlyCosts = Math.round(((save.c.yearlyCosts ?? 0) + OFFICE_UPKEEP) * 100) / 100;
  const { context, page, errors } = await open(browser, size, [{ name: SAVE_KEY, value: JSON.stringify(save) }, { name: 'rules-gate-seen:/nba-my-career', value: '1' }]);
  const { tap, check } = kit(walk, size, page, errors);
  try {
    const play = page.getByRole('button', { name: /^Play the \d{4} season$/ });
    await play.waitFor();
    await check('hub');
    await tap(page.locator('[data-career-hub-buttons] button', { hasText: 'Bank' }).first());
    await tap(page.getByRole('button', { name: '🛒 Shop', exact: true }));
    await tap(page.getByRole('button', { name: '❤️ Family', exact: true }));
    const card = page.locator('div.rounded-lg.border', { hasText: 'Family Office' }).first();
    await card.waitFor();
    const m = await card.evaluate(el => {
      const ps = [...el.querySelectorAll('p')];
      const effect = ps.find(p => p.textContent.startsWith('⚡')), desc = ps.find(p => p.textContent.startsWith('Professionals'));
      const px = p => parseFloat(getComputedStyle(p).fontSize);
      return effect && desc ? { effect: effect.textContent, ef: px(effect), df: px(desc), cut: effect.scrollWidth > effect.clientWidth + 1, right: effect.getBoundingClientRect().right, iw: innerWidth } : null;
    });
    if (!m) fail(walk, `${size.width}: the office card has no effect line`);
    else {
      if (m.effect !== '⚡ Adds 2 percent to your cash every season') fail(walk, `${size.width}: the office card says "${m.effect}"`);
      if (m.ef < m.df) fail(walk, `${size.width}: the office's effect line is ${m.ef}px, under its description's ${m.df}px`);
      if (m.cut || m.right > m.iw) fail(walk, `${size.width}: the office's effect line is cut`);
    }
    await check('family-aisle');
    await tap(page.getByRole('button', { name: /back/i }).first());
    await play.waitFor();
    const before = save.c;
    await tap(play);
    const line = page.getByText(/^💵 This season /).first();
    try { await line.waitFor({ timeout: 10000 }); } catch { fail(walk, `${size.width}: the season's feed has no returns line`); }
    const after = JSON.parse(await page.evaluate(k => localStorage.getItem(k), SAVE_KEY)).c;
    const pay = r1(before.netWorth + before.salary * TAKE_HOME - before.yearlyCosts);
    const steady = INDEX_RATE * INDEX_COST * 2;
    const exact = Math.round((steady + (pay + steady) * OFFICE_RATE) * 10000), tenths = Math.floor(exact / 1000);
    const want = r1(pay + tenths / 10), carry = (exact - tenths * 1000) / 10000;
    notes.push(`b ${size.width}: Cash ${before.netWorth} to ${after.netWorth} (pay less upkeep ${pay}, banked ${tenths / 10}, waiting ${after.shopCarry}); wanted ${want} and ${carry}`);
    if (after.netWorth !== want || after.shopCarry !== carry) fail(walk, `${size.width}: Cash ${after.netWorth} with ${after.shopCarry} waiting, the cards print ${want} with ${carry} waiting`);
    if (await line.count()) {
      const said = await line.innerText();
      if (!said.includes(`$${tenths / 10}M went into the Bank`)) fail(walk, `${size.width}: the returns line says "${said}"`);
      const cut = await line.evaluate(el => el.scrollWidth > el.clientWidth + 1 || el.getBoundingClientRect().right > innerWidth);
      if (cut) fail(walk, `${size.width}: the returns line is cut`);
    }
    await check('season-played');
  } catch (error) { fail(walk, `${size.width}: ${String(error.message || error).split('\n')[0]}`); } finally { await context.close(); }
}

const browser = await chromium.launch();
let walks = 0;
try {
  for (const size of SIZES) {
    if (!CONTROL) { await walkA(browser, size); walks += 1; }
    await walkB(browser, size); walks += 1;
  }
} finally {
  await browser.close();
  server.kill();
}
for (const line of notes) console.log(`  ${line}`);
console.log(`  screenshots: ${fs.readdirSync(OUT).filter(f => f.endsWith('.png')).length} in ${OUT}`);
if (CONTROL) {
  const fired = red.has('b');
  console.log(fired ? `playUsShopPromises: CONTROL ${CONTROL} FIRED, (b) red` : `playUsShopPromises: CONTROL ${CONTROL} DID NOT FIRE, (b) stayed green`);
  process.exit(fired ? 1 : 3);
}
console.log(failures === 0 ? `playUsShopPromises: green, ${walks} walks` : `playUsShopPromises: red, ${failures} failures`);
process.exit(failures === 0 ? 0 : 1);
