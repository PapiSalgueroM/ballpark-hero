/* Round 1546 browser walk: Fight Career's retire flow on the built site at a
   phone and a desktop width. A career of 10 tune ups is made by the engine
   itself and put in storage, the hub is opened, Retire then Yes, the verdict
   is read, the page is reloaded (same verdict, no second completion row
   written locally), then Start a new fighter shows the past fighters list.
   Supabase is blocked. Screenshots and a JSON of measurements go to RC_OUT. */
import fs from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const ROOT = process.cwd();
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || path.join(ROOT, '.tmp-fx');
const fails = [];
const check = (cond, msg) => { if (!cond) fails.push(msg); console.log(`   ${cond ? 'ok  ' : 'FAIL'} ${msg}`); };

const bundled = await build({
  stdin: { contents: "export * from './src/lib/fightCareer';", resolveDir: ROOT, loader: 'ts' },
  bundle: true, write: false, format: 'esm', platform: 'node',
  tsconfig: path.join(ROOT, 'tsconfig.app.json'),
});
const tmp = path.join(OUT, 'fc-bundle.mjs');
fs.writeFileSync(tmp, bundled.outputFiles[0].text);
const fc = await import(`file://${tmp}`);
const PLAN = { conditioning: 2, power: 2, defence: 1, speed: 1 };
let st = fc.newFightCareer('Walk Away Joe', 'welter', 'outboxer', 'walk-1546');
for (let i = 0; i < fc.RETIRE_MIN_FIGHTS; i += 1) st = fc.takeFight(fc.runCamp(st, PLAN), st.offers[0].id, ['box', 'press', 'counter']).state;
const save = JSON.stringify({ st, phase: 'hub' });

const browser = await pw.chromium.launch({ args: ['--no-sandbox'] });
const measures = {};
for (const vp of [{ width: 390, height: 844, tag: 'phone' }, { width: 1280, height: 900, tag: 'desktop' }]) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  await ctx.route(/supabase\.co/, r => r.abort());
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${BASE}/fight-career`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(s => { localStorage.clear(); localStorage.setItem('fight-career-save-v1', s); }, save);
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByText('Walk Away Joe').first().waitFor({ timeout: 20000 });
  const retire = page.getByRole('button', { name: 'Retire', exact: true });
  await retire.scrollIntoViewIfNeeded();
  check(await retire.isEnabled(), `${vp.tag}: Retire is open at ${fc.RETIRE_MIN_FIGHTS} fights`);
  await page.screenshot({ path: path.join(OUT, `retire-hub-${vp.tag}.png`), fullPage: false });
  await retire.click();
  const yes = page.getByRole('button', { name: 'Yes, hang them up' });
  const box = await yes.boundingBox();
  check(!!box && box.y + box.height <= vp.height + 1 && box.y >= 0, `${vp.tag}: the confirm opens inside the screen (y ${box ? Math.round(box.y) : 'none'})`);
  await yes.click();
  await page.getByText('Final verdict').waitFor({ timeout: 10000 });
  const text = await page.locator('body').innerText();
  check(text.includes(`He called time himself after ${fc.RETIRE_MIN_FIGHTS} fights.`), `${vp.tag}: the verdict says he called it`);
  await page.screenshot({ path: path.join(OUT, `retire-verdict-${vp.tag}.png`), fullPage: false });
  const sw = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  check(sw[0] <= sw[1], `${vp.tag}: no sideways scroll on the verdict (${sw[0]} in ${sw[1]})`);
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByText('Final verdict').waitFor({ timeout: 20000 });
  const past1 = await page.evaluate(() => JSON.parse(localStorage.getItem('fight-career-past-v1') || '[]').length);
  check(past1 === 1, `${vp.tag}: one past fighter after a reload (${past1})`);
  await page.getByRole('button', { name: /Start a new fighter/ }).click();
  await page.getByText('Your past fighters').waitFor({ timeout: 10000 });
  const list = page.getByText('Your past fighters');
  await list.scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(OUT, `retire-setup-${vp.tag}.png`), fullPage: false });
  const sw2 = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  check(sw2[0] <= sw2[1], `${vp.tag}: no sideways scroll on setup (${sw2[0]} in ${sw2[1]})`);
  check(errors.length === 0, `${vp.tag}: no page errors (${errors.slice(0, 2).join(' | ')})`);
  measures[vp.tag] = { confirmY: box && Math.round(box.y), past: past1, scroll: [sw, sw2] };
  await ctx.close();
}
await browser.close();
fs.writeFileSync(path.join(OUT, 'walk-1546.json'), JSON.stringify({ measures, fails }, null, 2));
try { fs.rmSync(tmp); } catch { /* best effort */ }
console.log(fails.length ? `walkRetire: ${fails.length} failure(s)` : 'walkRetire: all checks passed');
process.exit(fails.length ? 1 : 0);
