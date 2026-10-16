/* Round 1346: the player reports of 2026-10-16, walked in a real browser on a served build.
 *
 * /nba-my-career and /nfl-my-career (the two most played US careers), at 390 by 844 (touch) and 1280 by 800:
 *   W1 a finished coaching career reloads on its done screen, and the retirement screen's card reviews it.
 *   W2 an active coach opens Retire from coaching, keeps coaching (nothing saved, focus back on the opener), then
 *      retires: the done screen is on screen, done is saved, and a reload lands on it again.
 *   W3 a prospect skips the showcase, undoes it (the saved road state is the one before the skip), skips again,
 *      presses Draft day, skips draft night and watches it again; the night's button row keeps its height.
 *   W4 the same night under reduced motion: it starts on its last frame and there is nothing to watch again.
 * After every press: no sideways scroll, every new button at least 44 px tall, the card the press was about inside
 * the viewport, no page error, and a screenshot in $RC_OUT (or .tmp-fx/play-us-reports) to LOOK at.
 * (The brief's W1 was a coach ending at an age; the lead cut the age rule, so W1 is the done screen's reload.)
 *
 * Saves: the coach saves are the board's own bytes from scripts/data/usBoardFixture.json (its `coach` save), the
 * prospect is built in Node with the real engines. The live database host is aborted; anything else off the
 * served origin gets an empty answer.
 *
 * Controls (PLAY_US_REPORTS_CONTROL) remove one tagged element right before the press that needs it, after
 * asserting it was there: noretire ([data-coach-retire], W2), noundo ([data-showcase-undo], W3), noreplay
 * ([data-night-replay], W3). A control that turns its walk red exits 1 with "CONTROL <name> FIRED"; else 2.
 *
 * Needs dist/ (a plain vite build is enough). Run: ENGINES=chromium node scripts/playUsCareerReports.mjs
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
const CONTROL = process.env.PLAY_US_REPORTS_CONTROL || '';
const CONTROLS = { noretire: ['W2', '[data-coach-retire]'], noundo: ['W3', '[data-showcase-undo]'], noreplay: ['W3', '[data-night-replay]'] };
if (CONTROL && !CONTROLS[CONTROL]) { console.error(`Unknown control ${CONTROL}`); process.exit(2); }
const OUT = path.resolve(process.env.RC_OUT || path.join(ROOT, '.tmp-fx/play-us-reports'));
fs.mkdirSync(OUT, { recursive: true });
if (!fs.existsSync(path.join(ROOT, 'dist/index.html'))) { console.error('Build dist before this walk. Refusing to run.'); process.exit(2); }

const bundle = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'us-reports-')), 'engine.cjs');
await build({
  stdin: { contents: `
    import { NFL_CAREER_SPORT } from '@/lib/nflCareerSport';
    import { NBA_CAREER_SPORT } from '@/lib/nbaCareerSport';
    export const sports = [NBA_CAREER_SPORT, NFL_CAREER_SPORT];
    export * from '@/lib/careerPreDraft';
    export { createUsCareerProspect } from '@/lib/usCareerProspect';
    export { defaultAppearance } from '@/lib/soccerCareerAppearance';
  `, resolveDir: ROOT, sourcefile: 'play-us-reports-engine.ts', loader: 'ts' },
  outfile: bundle, bundle: true, platform: 'node', format: 'cjs', logLevel: 'silent', alias: { '@': path.join(ROOT, 'src') },
});
if (/supabase\.co/.test(fs.readFileSync(bundle, 'utf-8'))) { console.error('The engine bundle reaches the live database host. Refusing to run.'); process.exit(2); }
const M = createRequire(import.meta.url)(bundle);
const fixture = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/usBoardFixture.json'), 'utf8'));

let failures = 0;
const redWalks = new Set();
const fail = (id, what) => { failures += 1; redWalks.add(id.split(':')[0]); console.error(`  FAIL ${id}: ${what}`); };
const notes = [];

/** A prospect the real engine walked to the showcase. */
function atShowcase(sport) {
  const pos = sport.create.defaultPos;
  const p = M.createUsCareerProspect(sport, { name: 'Simulated Prospect', pos, archetypeId: sport.create.archetypes[pos][0].id, eraId: 'now', appearance: M.defaultAppearance(), seed: `${sport.slug}:walk1346` });
  const desc = sport.preDraft(p.eraId);
  let state = M.preDraftStart(desc, { ...p, routeId: desc.routes[0].id });
  for (let n = 0; n < 12 && state.phase !== 'showcase'; n++) state = state.phase === 'season' ? M.preDraftPlaySeason(desc, state) : M.preDraftChoose(desc, state, 0);
  if (state.phase !== 'showcase') throw new Error(`${sport.slug}: the road never reached the showcase`);
  return { ...p, state };
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

async function open(browser, sport, size, saveValue, reduced = false) {
  const route = `/${sport.gameSlug}`;
  const context = await browser.newContext({
    viewport: { width: size.width, height: size.height }, isMobile: size.touch, hasTouch: size.touch, deviceScaleFactor: 1,
    reducedMotion: reduced ? 'reduce' : 'no-preference', serviceWorkers: 'block',
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

/** The checks after every press, a screenshot, and the control's knock. */
function kit(id, size, sport, page, errors) {
  let n = 0;
  const tap = async locator => { if (size.touch) await locator.tap(); else await locator.click(); };
  const bytes = () => page.evaluate(k => localStorage.getItem(k), sport.saveKey);
  const rowHeight = () => page.evaluate(() => Math.round(document.querySelector('[data-night-actions]')?.getBoundingClientRect().height ?? -1));
  const check = async (name, card, newButton) => {
    await page.waitForTimeout(450);
    const m = await page.evaluate(([sel, btn]) => {
      const r = sel ? document.querySelector(sel)?.getBoundingClientRect() : null;
      const b = btn ? document.querySelector(btn)?.getBoundingClientRect() : null;
      return { sw: document.documentElement.scrollWidth, iw: innerWidth, ih: innerHeight, top: r ? r.top : null, bottom: r ? r.bottom : null, btn: b ? b.height : null };
    }, [card, newButton]);
    if (m.sw > m.iw) fail(id, `${name}: sideways scroll (${m.sw} wide on ${m.iw})`);
    if (card && m.top === null) fail(id, `${name}: ${card} is not on the page`);
    else if (card && (m.bottom < 1 || m.top > m.ih - 40)) fail(id, `${name}: ${card} sits at ${Math.round(m.top)} to ${Math.round(m.bottom)}, off the ${m.ih} px screen`);
    if (newButton && (m.btn === null || m.btn < 44)) fail(id, `${name}: ${newButton} is ${m.btn === null ? 'missing' : `${m.btn} px tall`}`);
    if (errors.length) fail(id, `${name}: page error ${errors.join(' | ').slice(0, 200)}`);
    await page.screenshot({ path: path.join(OUT, `${id.replace(':', '-')}-${String(++n).padStart(2, '0')}-${name}.png`) });
    return m;
  };
  const knock = async (walk, selector) => {
    if (!CONTROL || CONTROLS[CONTROL][0] !== walk || CONTROLS[CONTROL][1] !== selector) return;
    const removed = await page.evaluate(sel => { const el = document.querySelector(sel); if (!el) return false; el.remove(); return true; }, selector);
    if (!removed) { console.error(`CONTROL ${CONTROL}: ${selector} was not there to remove. Refusing to count it.`); process.exit(2); }
    page.setDefaultTimeout(4000);
  };
  return { tap, bytes, rowHeight, check, knock };
}
const describeFocus = page => page.evaluate(() => {
  const el = document.activeElement;
  return !el || el === document.body ? 'the page body' : `${el.tagName.toLowerCase()} "${(el.textContent ?? '').trim().slice(0, 40)}"`;
});

async function walkW1(browser, sport, size) {
  const id = `W1:${sport.slug}-${size.width}`;
  const save = JSON.parse(fixture.sports[sport.slug].saves.coach);
  save.coach.done = true;
  const { context, page, errors } = await open(browser, sport, size, JSON.stringify(save));
  const { tap, check } = kit(id, size, sport, page, errors);
  try {
    await page.getByRole('heading', { name: 'Coaching career complete' }).waitFor();
    if (await page.getByRole('button', { name: 'Retire from coaching', exact: true }).count()) fail(id, 'a finished career still offers Retire from coaching');
    if (await page.getByRole('button', { name: /^(Coach|Sit out) the \d+ season$/ }).count()) fail(id, 'a finished career still offers a season');
    await check('done', '[data-coach-done]');
    await tap(page.getByRole('button', { name: /Back to the playing career/ }));
    const review = page.getByRole('button', { name: 'Review coaching career', exact: true });
    await review.waitFor();
    if (await page.getByRole('button', { name: 'Back to the sideline', exact: true }).count()) fail(id, 'the retirement screen offers the sideline back');
    await check('retirement-screen', null);
    await tap(review);
    await page.getByRole('heading', { name: 'Coaching career complete' }).waitFor();
    await check('reviewed', '[data-coach-done]');
  } catch (error) { fail(id, String(error.message || error).split('\n')[0]); } finally { await context.close(); }
}

async function walkW2(browser, sport, size) {
  const id = `W2:${sport.slug}-${size.width}`;
  const { context, page, errors } = await open(browser, sport, size, fixture.sports[sport.slug].saves.coach);
  const { tap, bytes, check, knock } = kit(id, size, sport, page, errors);
  try {
    const opener = page.getByRole('button', { name: 'Retire from coaching', exact: true });
    await opener.waitFor();
    await check('hub', '[data-coach-retire]', '[data-coach-retire] button');
    const before = await bytes();
    await knock('W2', '[data-coach-retire]');
    await tap(opener);
    const dialog = page.getByRole('alertdialog', { name: 'Retire from coaching?' });
    await dialog.waitFor();
    await check('dialog', '[role="alertdialog"]', '[role="alertdialog"] button');
    await tap(dialog.getByRole('button', { name: 'Keep coaching', exact: true }));
    await dialog.waitFor({ state: 'hidden' });
    const focusKept = await describeFocus(page);
    if (focusKept !== 'button "Retire from coaching"') fail(id, `focus after Keep coaching is on ${focusKept}`);
    if (await bytes() !== before) fail(id, 'Keep coaching changed the save');
    await check('kept', '[data-coach-retire]');
    await tap(opener);
    await dialog.waitFor();
    await tap(dialog.getByRole('button', { name: 'Retire from coaching', exact: true }));
    await page.getByRole('heading', { name: 'Coaching career complete' }).waitFor();
    notes.push(`${id}: after Keep coaching focus is on ${focusKept}; after the retirement it is on ${await describeFocus(page)}`);
    await check('retired', '[data-coach-done]');
    if (JSON.parse(await bytes()).coach?.done !== true) fail(id, 'the retirement was not saved');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: 'Coaching career complete' }).waitFor();
    await check('reloaded', '[data-coach-done]');
  } catch (error) { fail(id, String(error.message || error).split('\n')[0]); } finally { await context.close(); }
}

const prospectSave = sport => JSON.stringify({ c: null, phase: 'prospect', teamQuality: null, coach: null, prospect: atShowcase(sport) });
const nightChunk = page => page.waitForFunction(() => performance.getEntriesByType('resource').some(e => /DraftNightSequence/.test(e.name)), null, { timeout: 15000 });

async function walkW3(browser, sport, size) {
  const id = `W3:${sport.slug}-${size.width}`;
  const value = prospectSave(sport);
  const { context, page, errors } = await open(browser, sport, size, value);
  const { tap, bytes, rowHeight, check, knock } = kit(id, size, sport, page, errors);
  try {
    await page.locator('[data-prospect-phase="showcase"]').waitFor();
    await check('showcase', '[data-testid="draft-showcase"]');
    const stateBefore = JSON.stringify(JSON.parse(value).prospect.state);
    const skip = page.getByRole('button', { name: /^Skip it/ });
    await tap(skip);
    await page.locator('[data-prospect-phase="draft"]').waitFor();
    await check('skipped', '[data-testid="draft-showcase"]', '[data-showcase-undo]');
    await knock('W3', '[data-showcase-undo]');
    await tap(page.getByRole('button', { name: 'Undo skip', exact: true }));
    await page.locator('[data-prospect-phase="showcase"]').waitFor();
    if (JSON.stringify(JSON.parse(await bytes()).prospect.state) !== stateBefore) fail(id, 'the undo did not put back the road state from before the skip');
    await check('undone', '[data-testid="draft-showcase"]');
    await tap(skip);
    await page.locator('[data-prospect-phase="draft"]').waitFor();
    await nightChunk(page);
    await page.waitForTimeout(250);
    await tap(page.getByRole('button', { name: 'Draft day', exact: true }));
    await page.locator('[data-night-stage="live"]').waitFor();
    const live = await rowHeight();
    await check('night-live', '[data-night-actions]');
    await tap(page.getByRole('button', { name: 'Skip to the end', exact: true }));
    await page.locator('[data-night-stage="skipped"]').waitFor();
    const skipped = await rowHeight();
    if (skipped !== live) fail(id, `the night's button row went from ${live} px to ${skipped} px when the skip went`);
    await check('night-skipped', '[data-night-actions]', '[data-night-replay]');
    const saved = await bytes();
    await knock('W3', '[data-night-replay]');
    await tap(page.getByRole('button', { name: 'Watch it again', exact: true }));
    await page.locator('[data-night-stage="live"]').waitFor();
    const again = await rowHeight();
    await check('night-again', '[data-night-actions]');
    await page.locator('[data-night-stage="landed"]').waitFor();
    const landed = await rowHeight();
    if (again !== live || landed !== live) fail(id, `the night's button row is ${live} px live, ${again} px on the replay and ${landed} px once it landed`);
    await check('night-landed', '[data-night-actions]', '[data-night-replay]');
    if (await bytes() !== saved) fail(id, 'watching the night again changed the save');
    notes.push(`${id}: the night's button row is ${live} px live, ${skipped} skipped, ${again} on the replay, ${landed} landed`);
  } catch (error) { fail(id, String(error.message || error).split('\n')[0]); } finally { await context.close(); }
}

async function walkW4(browser, sport, size) {
  const id = `W4:${sport.slug}-${size.width}-reduced`;
  const { context, page, errors } = await open(browser, sport, size, prospectSave(sport), true);
  const { tap, check } = kit(id, size, sport, page, errors);
  try {
    await page.locator('[data-prospect-phase="showcase"]').waitFor();
    await tap(page.getByRole('button', { name: /^Play it safe/ }));
    await page.locator('[data-prospect-phase="draft"]').waitFor();
    await nightChunk(page);
    await page.waitForTimeout(250);
    await tap(page.getByRole('button', { name: 'Draft day', exact: true }));
    await page.locator('[data-night-stage="skipped"]').waitFor();
    if (await page.getByRole('button', { name: 'Watch it again', exact: true }).count()) fail(id, 'Watch it again is offered under reduced motion');
    await check('night-reduced', '[data-night-actions]');
  } catch (error) { fail(id, String(error.message || error).split('\n')[0]); } finally { await context.close(); }
}

const browser = await chromium.launch();
let walks = 0;
try {
  for (const sport of M.sports) {
    for (const size of SIZES) {
      for (const walk of [walkW1, walkW2, walkW3]) { await walk(browser, sport, size); walks += 1; }
    }
    await walkW4(browser, sport, SIZES[0]); walks += 1;
  }
} finally {
  await browser.close();
  server.kill();
}
for (const line of notes) console.log(`  ${line}`);
console.log(`  screenshots: ${fs.readdirSync(OUT).filter(f => f.endsWith('.png')).length} in ${OUT}`);
if (CONTROL) {
  const [walk] = CONTROLS[CONTROL];
  const fired = redWalks.has(walk);
  console.log(fired ? `CONTROL ${CONTROL} FIRED: ${walk} red` : `CONTROL ${CONTROL} DID NOT FIRE: ${walk} stayed green`);
  process.exit(fired ? 1 : 2);
}
console.log(failures === 0 ? `playUsCareerReports: ALL GREEN, ${walks} walks` : `playUsCareerReports: ${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
