/* Round 1500: the dirty money desk, walked in a real browser on a served build (the brief's W4).
 *
 * /nba-my-career and /nfl-my-career (the two most played US careers), at 390 by 844 (touch) and 1280 by 800: a
 * player holding 9.5M of dirty money at heat 55 with all three washers of his own shop owned reads the honest
 * sentence, opens Deal with it, previews Wash it (its whole percent on the card), backs out (nothing saved), picks
 * Come clean and taps Do it 150 ms later (the settle second holds it: nothing saved), taps Do it again after the
 * second (saved: dirty money 0, heat 50, the 1.0M fine), reads the result, goes back to a hub with no desk, and a
 * reload stays clean.
 * After every press: no sideways scroll, every new button at least 44 px tall, the card the press was about inside
 * the viewport, no page error, and a screenshot in $RC_OUT (or .tmp-fx/play-us-dirty-money) to LOOK at.
 *
 * Saves: the board's own `dirty` save of scripts/data/usBoardFixture.json with the money, the heat and the washers
 * set in Node. The live database host is aborted; anything else off the served origin gets an empty answer.
 *
 * Control (PLAY_US_DIRTY_CONTROL=nodesk) removes [data-dirty-money-desk] right before Deal with it is pressed,
 * after asserting it was there; the walk must turn red: exit 1 with "CONTROL nodesk FIRED", else 2.
 *
 * Needs dist/ (a plain vite build is enough). Run: ENGINES=chromium node scripts/playUsDirtyMoney.mjs
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { chromium } from './lib/playwrightLoader.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.PLAY_US_DIRTY_CONTROL || '';
if (CONTROL && CONTROL !== 'nodesk') { console.error(`Unknown control ${CONTROL}`); process.exit(2); }
const OUT = path.resolve(process.env.RC_OUT || path.join(ROOT, '.tmp-fx/play-us-dirty-money'));
fs.mkdirSync(OUT, { recursive: true });
if (!fs.existsSync(path.join(ROOT, 'dist/index.html'))) { console.error('Build dist before this walk. Refusing to run.'); process.exit(2); }

const bundle = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'us-dirty-walk-')), 'engine.cjs');
await build({
  stdin: { contents: `
    import { NFL_CAREER_SPORT } from '@/lib/nflCareerSport';
    import { NBA_CAREER_SPORT } from '@/lib/nbaCareerSport';
    export const sports = [NBA_CAREER_SPORT, NFL_CAREER_SPORT];
    export * from '@/lib/careerDirtyMoney';
  `, resolveDir: ROOT, sourcefile: 'play-us-dirty-engine.ts', loader: 'ts' },
  outfile: bundle, bundle: true, platform: 'node', format: 'cjs', logLevel: 'silent', alias: { '@': path.join(ROOT, 'src') },
});
if (/supabase\.co/.test(fs.readFileSync(bundle, 'utf-8'))) { console.error('The engine bundle reaches the live database host. Refusing to run.'); process.exit(2); }
const M = createRequire(import.meta.url)(bundle);
const fixture = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/usBoardFixture.json'), 'utf8'));

let failures = 0;
const redWalks = new Set();
const fail = (id, what) => { failures += 1; redWalks.add(id.split(':')[0]); console.error(`  FAIL ${id}: ${what}`); };
const notes = [];

/** The board's own dirty save, holding 9.5M at heat 55 with every washer of the sport's shop owned. */
function dirtySave(sport) {
  const save = JSON.parse(fixture.sports[sport.slug].saves.dirty);
  if (save.phase !== 'season') throw new Error(`${sport.slug}: the fixture's dirty save is not in a season`);
  save.c.dirtyMoney = 9.5;
  save.c.heat = 55;
  save.c.purchased = [...(save.c.purchased ?? []), ...M.washerIds(sport.shopItems)];
  return save;
}

const port = await new Promise((resolve, reject) => {
  const probe = createServer(); probe.once('error', reject);
  probe.listen(0, '127.0.0.1', () => { const chosen = probe.address().port; probe.close(error => (error ? reject(error) : resolve(chosen))); });
});
const BASE = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', 'dist', String(port)], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
let serverLog = '';
server.stderr.on('data', data => { serverLog += data; });
await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error(`the server did not start within 20 seconds: ${serverLog}`)), 20000);
  server.once('exit', code => { clearTimeout(timer); reject(new Error(`the server exited ${code}: ${serverLog}`)); });
  server.stdout.on('data', data => { serverLog += data; if (String(data).includes('host-like server:')) { clearTimeout(timer); resolve(); } });
});

const SIZES = [{ width: 390, height: 844, touch: true }, { width: 1280, height: 800, touch: false }];

async function open(browser, sport, size, saveValue) {
  const route = `/${sport.gameSlug}`;
  const context = await browser.newContext({
    viewport: { width: size.width, height: size.height }, isMobile: size.touch, hasTouch: size.touch, deviceScaleFactor: 1, serviceWorkers: 'block',
    storageState: { cookies: [], origins: [{ origin: BASE, localStorage: [
      { name: sport.saveKey, value: saveValue },
      { name: `rules-gate-seen:${route}`, value: '1' }, { name: 'cookie-consent', value: 'essential' },
    ] }] },
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
  await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
  return { context, page, errors };
}

/** The checks after every press, and a screenshot. */
function kit(id, size, page, errors) {
  let n = 0;
  const tap = async locator => { if (size.touch) await locator.tap(); else await locator.click(); };
  const check = async (name, card, newButtons) => {
    await page.waitForTimeout(450);
    const m = await page.evaluate(([sel, btn]) => {
      const r = sel ? document.querySelector(sel)?.getBoundingClientRect() : null;
      const heights = btn ? [...document.querySelectorAll(btn)].map(b => b.getBoundingClientRect().height) : [];
      return { sw: document.documentElement.scrollWidth, iw: innerWidth, ih: innerHeight, top: r ? r.top : null, bottom: r ? r.bottom : null, heights };
    }, [card, newButtons]);
    if (m.sw > m.iw) fail(id, `${name}: sideways scroll (${m.sw} wide on ${m.iw})`);
    if (card && m.top === null) fail(id, `${name}: ${card} is not on the page`);
    else if (card && (m.bottom < 1 || m.top > m.ih - 40)) fail(id, `${name}: ${card} sits at ${Math.round(m.top)} to ${Math.round(m.bottom)}, off the ${m.ih} px screen`);
    if (newButtons && (!m.heights.length || m.heights.some(h => h < 44))) fail(id, `${name}: ${newButtons} heights ${m.heights.map(Math.round).join(', ') || 'none'}`);
    if (errors.length) fail(id, `${name}: page error ${errors.join(' | ').slice(0, 200)}`);
    await page.screenshot({ path: path.join(OUT, `${id.replace(':', '-')}-${String(++n).padStart(2, '0')}-${name}.png`) });
    return m;
  };
  return { tap, check };
}
const bytesOf = (page, sport) => page.evaluate(k => localStorage.getItem(k), sport.saveKey);
const text = page => page.evaluate(() => document.body.innerText);

async function walkW4(browser, sport, size) {
  const id = `W4:${sport.slug}-${size.width}`;
  const save = dirtySave(sport);
  const saveValue = JSON.stringify(save);
  const { context, page, errors } = await open(browser, sport, size, saveValue);
  const { tap, check } = kit(id, size, page, errors);
  try {
    const opener = page.locator('[data-dirty-money-desk] button');
    await opener.waitFor();
    if (!(await text(page)).includes(M.DIRTY_SENTENCE_NO_WASHERS)) fail(id, 'the honest sentence is not under the heat meter');
    if (await bytesOf(page, sport) !== saveValue) fail(id, 'the save was written on load');
    await check('hub', '[data-dirty-money-desk]', '[data-dirty-money-desk] button');
    if (CONTROL === 'nodesk') {
      const removed = await page.evaluate(() => { const el = document.querySelector('[data-dirty-money-desk]'); if (!el) return false; el.remove(); return true; });
      if (!removed) { console.error('CONTROL nodesk: [data-dirty-money-desk] was not there to remove. Refusing to count it.'); process.exit(2); }
      page.setDefaultTimeout(4000);
    }
    await tap(opener);
    await page.locator('[data-dirty-way="clean"]').waitFor();
    await check('desk', '[data-dirty-way="clean"]', '[data-dirty-way]');
    await tap(page.locator('[data-dirty-way="wash"]'));
    await page.locator('[data-dirty-do="wash"]').waitFor();
    const pct = M.previewDirty(save.c, 'wash').caughtPct;
    if (!(await text(page)).includes(`${pct} percent chance you are caught`)) fail(id, `the wash card does not print its ${pct} percent`);
    await check('wash-preview', '[data-dirty-do="wash"]', '[data-dirty-do="wash"]');
    await tap(page.getByRole('button', { name: 'Back', exact: true }));
    await page.locator('[data-dirty-way="clean"]').waitFor();
    if (await bytesOf(page, sport) !== saveValue) fail(id, 'Back saved something');
    await check('back', '[data-dirty-way="clean"]', '[data-dirty-way]');
    /* One tap picks; a second 150 ms later on Do it waits out the settle second, then Do it works. */
    await tap(page.locator('[data-dirty-way="clean"]'));
    const doIt = page.locator('[data-dirty-do="clean"]');
    await doIt.waitFor();
    await page.waitForTimeout(150);
    await tap(doIt);
    await page.waitForTimeout(200);
    if (await bytesOf(page, sport) !== saveValue) fail(id, 'a Do it 150 ms after the pick spent the money');
    await check('clean-picked', '[data-dirty-do="clean"]', '[data-dirty-do="clean"]');
    await page.waitForTimeout(1100);
    await tap(doIt);
    await page.locator('[data-dirty-money-result]').waitFor();
    const after = JSON.parse(await bytesOf(page, sport));
    const want = M.dealWithDirtyMoney(save.c, 'clean').state;
    if (JSON.stringify(after.c) !== JSON.stringify(want)) fail(id, `the saved career is not the rule's: dirty ${after.c.dirtyMoney}, heat ${after.c.heat}, net ${after.c.netWorth}`);
    notes.push(`${id}: came clean, saved dirty ${after.c.dirtyMoney}, heat ${after.c.heat}, net worth ${save.c.netWorth} to ${after.c.netWorth}`);
    await check('result', '[data-dirty-money-result]', '[data-dirty-money-result] button');
    await tap(page.getByRole('button', { name: 'Back to your career', exact: true }));
    await page.waitForTimeout(400);
    if (await page.locator('[data-dirty-money-desk]').count()) fail(id, 'the desk is still offered with no dirty money');
    await check('hub-after', null, null);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    if (await page.locator('[data-dirty-money-desk]').count() || (await text(page)).includes('unexplained')) fail(id, 'a reload brings the dirty money back');
    await check('reload', null, null);
  } catch (error) { fail(id, String(error.message || error).split('\n')[0]); } finally { await context.close(); }
}

const browser = await chromium.launch();
let walks = 0;
try {
  for (const sport of M.sports) for (const size of SIZES) { await walkW4(browser, sport, size); walks += 1; }
} finally {
  await browser.close();
  server.kill();
}
for (const line of notes) console.log(`  ${line}`);
console.log(`  screenshots: ${fs.readdirSync(OUT).filter(f => f.endsWith('.png')).length} in ${OUT}`);
if (CONTROL) {
  const fired = redWalks.has('W4');
  console.log(fired ? `CONTROL ${CONTROL} FIRED: W4 red` : `CONTROL ${CONTROL} DID NOT FIRE: W4 stayed green`);
  process.exit(fired ? 1 : 2);
}
console.log(failures === 0 ? `playUsDirtyMoney: ALL GREEN, ${walks} walks` : `playUsDirtyMoney: ${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
