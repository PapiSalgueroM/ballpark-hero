/* Round 1346: the player reports of 2026-10-16, walked in a real browser on a served build.
 *
 * /nba-my-career and /nfl-my-career (the two most played US careers), at 390 by 844 (touch) and 1280 by 800:
 *   W1 a finished coaching career reloads on its done screen, and the retirement screen's card reviews it.
 *   W2 an active coach leaves for the retirement screen and comes back (the action card is on screen), opens
 *      Retire from coaching, keeps coaching (nothing saved, focus back on the opener), then retires with a double
 *      press on the confirm (the second one must open no tile, review F3): the done
 *      screen is on screen, done is saved, and a reload lands on it again.
 *   W3 a prospect skips the showcase, undoes it (the saved road state is the one before the skip), skips again,
 *      presses Draft day, skips draft night and watches it again; the night's button row keeps its height.
 *   W4 the same night under reduced motion: it starts on its last frame and there is nothing to watch again.
 *   W5 the double taps of the review (r1346-run-d), at 150 and 700 ms between taps: a double tap on Undo skip ends on
 *      the road from before the skip (the second tap lands on a graded approach, which waits out the settle second of
 *      useTapSettle), and Go all out works once that second has passed; then on draft night a double tap on Skip to
 *      the end leaves the night skipped (not started over) and one on Watch it again leaves it playing.
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
 * ([data-night-replay], W3). nosettle (W5) instead swaps the page's performance.now for a clock that jumps two seconds
 * a reading right before the double tap, so the settle second never lasts. A control that turns its walk red exits 1
 * with "CONTROL <name> FIRED"; else 2.
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
const CONTROLS = { noretire: ['W2', '[data-coach-retire]'], noundo: ['W3', '[data-showcase-undo]'], noreplay: ['W3', '[data-night-replay]'], nosettle: ['W5', 'the page clock'] };
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
    /* Review F8: this round's button, so it answers to the 44 px rule like every other new one. */
    const reviewBox = await review.boundingBox();
    if (!reviewBox || reviewBox.height < 44) fail(id, `Review coaching career is ${reviewBox ? `${Math.round(reviewBox.height)} px` : 'missing'} tall`);
    notes.push(`${id}: Review coaching career is ${reviewBox ? Math.round(reviewBox.height) : 'no'} px tall`);
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
    /* The way back in from the bottom of the retirement screen lands on the action card, not above the screen. */
    await tap(page.getByRole('button', { name: /Back to the playing career/ }));
    await tap(page.getByRole('button', { name: 'Back to the sideline', exact: true }));
    await opener.waitFor();
    await check('back-in', '[data-coach-retire]');
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
    /* Review F3: the second click of a double click on the confirm opened the tile that slid under the pointer. */
    const [cx, cy] = await centreOf(dialog.getByRole('button', { name: 'Retire from coaching', exact: true }));
    await tapTwice(page, size, cx, cy, 150);
    const doneHeading = page.getByRole('heading', { name: 'Coaching career complete' });
    await doneHeading.waitFor();
    await page.waitForTimeout(300);
    if (!(await doneHeading.isVisible())) fail(id, 'the second click of a double click on the confirm opened a tile');
    notes.push(`${id}: a double ${size.touch ? 'tap' : 'click'} on the confirm leaves the done hub open; under that spot now: ${await buttonAt(page, cx, cy)}`);
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
    const undoButton = page.getByRole('button', { name: 'Undo skip', exact: true });
    await undoButton.scrollIntoViewIfNeeded();
    const scrollBeforeUndo = await page.evaluate(() => scrollY);
    await tap(undoButton);
    await page.locator('[data-prospect-phase="showcase"]').waitFor();
    if (JSON.stringify(JSON.parse(await bytes()).prospect.state) !== stateBefore) fail(id, 'the undo did not put back the road state from before the skip');
    await check('undone', '[data-testid="draft-showcase"]');
    /* Brief 3.4.3: the undo must not jump the page. The review's 507 to 0 was read across a reload. */
    const scrollAfterUndo = await page.evaluate(() => scrollY);
    notes.push(`${id}: scrollY ${scrollBeforeUndo} before Undo skip, ${scrollAfterUndo} after`);
    if (Math.abs(scrollAfterUndo - scrollBeforeUndo) > 2) fail(id, `Undo skip moved the page from scrollY ${scrollBeforeUndo} to ${scrollAfterUndo}`);
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
    await page.waitForTimeout(1000);
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

/* W5, the double taps the review found (r1346-run-d): a second tap on the spot where Undo skip was lands on Go all
   out, which takes its place. Taps go to the button's centre by coordinate (no scroll into view), the second one
   `gap` ms after the first; the line refuses to count unless a graded approach really sits under that spot. */
const buttonAt = (page, x, y) => page.evaluate(([px, py]) => {
  const el = document.elementFromPoint(px, py)?.closest('button');
  return el ? (el.textContent ?? '').trim().slice(0, 40) : 'no button';
}, [x, y]);
async function tapTwice(page, size, x, y, gap) {
  if (size.touch) { await page.touchscreen.tap(x, y); await page.waitForTimeout(gap); await page.touchscreen.tap(x, y); }
  else { await page.mouse.click(x, y); await page.waitForTimeout(gap); await page.mouse.click(x, y); }
}
const centreOf = async locator => { const b = await locator.boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2]; };
/** The nosettle control: a page clock that jumps two seconds a reading, so useTapSettle's second never lasts. */
const defeatSettle = page => page.evaluate(() => {
  const real = performance.now.bind(performance);
  let skew = 0;
  performance.now = () => real() + (skew += 2000);
});

async function walkW5(browser, sport, size, gap) {
  const id = `W5:${sport.slug}-${size.width}-${gap}ms`;
  const value = prospectSave(sport);
  const { context, page, errors } = await open(browser, sport, size, value);
  const { tap, bytes, check } = kit(id, size, sport, page, errors);
  try {
    await page.locator('[data-prospect-phase="showcase"]').waitFor();
    const stateBefore = JSON.stringify(JSON.parse(value).prospect.state);
    await tap(page.getByRole('button', { name: /^Skip it/ }));
    await page.locator('[data-prospect-phase="draft"]').waitFor();
    await page.waitForTimeout(500);
    const undo = page.getByRole('button', { name: 'Undo skip', exact: true });
    await undo.scrollIntoViewIfNeeded();
    const [x, y] = await centreOf(undo);
    const y0 = await page.evaluate(() => scrollY);
    if (CONTROL === 'nosettle') await defeatSettle(page);
    await tapTwice(page, size, x, y, gap);
    await page.waitForTimeout(800);
    const s = JSON.parse(await bytes()).prospect.state;
    const under = await buttonAt(page, x, y);
    notes.push(`${id}: a double tap on Undo skip ${gap} ms apart ends at phase ${s.phase} (showcase ${s.showcase?.approach ?? 'none'}); under that spot now: ${under}; scrollY ${y0} before, ${await page.evaluate(() => scrollY)} after`);
    if (s.phase !== 'showcase' || JSON.stringify(s) !== stateBefore) fail(id, `a double tap on Undo skip ${gap} ms apart ended at phase ${s.phase}, showcase ${s.showcase?.approach ?? 'none'}, not the road before the skip`);
    else if (!/^(Go all out|Play it safe)/.test(under)) fail(id, `no graded approach sits where Undo skip was (${under}), so this double tap proves nothing`);
    await check('undo-double-tap', '[data-testid="draft-showcase"]');
    await page.waitForTimeout(1100);
    await tap(page.getByRole('button', { name: /^Go all out/ }));
    await page.locator('[data-prospect-phase="draft"]').waitFor();
    if (JSON.parse(await bytes()).prospect.state.showcase?.approach !== 'allout') fail(id, 'Go all out did not work once the second had passed');
    /* Draft night's one cell: Skip to the end, then Watch it again in its place, and back. */
    await nightChunk(page);
    await page.waitForTimeout(250);
    await tap(page.getByRole('button', { name: 'Draft day', exact: true }));
    await page.locator('[data-night-stage="live"]').waitFor();
    const skipEnd = page.getByRole('button', { name: 'Skip to the end', exact: true });
    await skipEnd.scrollIntoViewIfNeeded();
    const [sx, sy] = await centreOf(skipEnd);
    if (CONTROL === 'nosettle') await defeatSettle(page);
    await tapTwice(page, size, sx, sy, gap);
    await page.waitForTimeout(300);
    const afterSkip = await page.locator('[data-career-night]').getAttribute('data-night-stage');
    if (afterSkip !== 'skipped') fail(id, `a double tap on Skip to the end ${gap} ms apart left the night ${afterSkip}, not skipped`);
    await page.waitForTimeout(1100);
    const [rx, ry] = await centreOf(page.getByRole('button', { name: 'Watch it again', exact: true }));
    await tapTwice(page, size, rx, ry, gap);
    await page.waitForTimeout(300);
    const afterReplay = await page.locator('[data-career-night]').getAttribute('data-night-stage');
    if (afterReplay !== 'live') fail(id, `a double tap on Watch it again ${gap} ms apart left the night ${afterReplay}, not playing`);
    notes.push(`${id}: a double tap on Skip to the end leaves the night ${afterSkip}; one on Watch it again leaves it ${afterReplay}`);
    await check('night-double-taps', '[data-night-actions]');
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
      for (const gap of [150, 700]) { await walkW5(browser, sport, size, gap); walks += 1; }
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
