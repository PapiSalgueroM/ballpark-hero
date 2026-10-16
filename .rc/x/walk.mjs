/* Reviewer walk, Round 1346 (run lens). Plays the coach retirement, the showcase undo and the night replay on a
   served build, NBA and NFL, at 390x844 (touch) and 1280x900, reduced motion off and on. Supabase is aborted.
   BASE (from #!serve) or DIST (a dist folder this script serves itself). WALK_ONLY=replay runs the replay probe only.
   Screenshots go to RC_OUT. Prints FAIL lines and measured numbers; exits 1 on any FAIL. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import { chromium } from '../../scripts/lib/playwrightLoader.mjs';

const ROOT = process.cwd();
const OUT = path.resolve(process.env.RC_OUT || path.join(ROOT, '.tmp-fx/review-walk-out'));
fs.mkdirSync(OUT, { recursive: true });
const ONLY = process.env.WALK_ONLY || '';
const TAG = process.env.WALK_TAG || 'head';
let BASE = process.env.BASE || '';
let server = null;
if (process.env.DIST) {
  const port = await new Promise((res, rej) => { const p = createServer(); p.once('error', rej); p.listen(0, '127.0.0.1', () => { const n = p.address().port; p.close(() => res(n)); }); });
  BASE = `http://127.0.0.1:${port}`;
  server = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', process.env.DIST, String(port)], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((res, rej) => { const t = setTimeout(() => rej(new Error('server did not start')), 20000); server.stdout.on('data', d => { if (String(d).includes('host-like server:')) { clearTimeout(t); res(); } }); });
}
if (!BASE) { console.log('No BASE and no DIST. Refusing.'); process.exit(2); }

const bundleFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'rev1346-')), 'engine.cjs');
await build({
  stdin: { contents: `
    import { NFL_CAREER_SPORT } from '@/lib/nflCareerSport';
    import { NBA_CAREER_SPORT } from '@/lib/nbaCareerSport';
    export const sports = [NBA_CAREER_SPORT, NFL_CAREER_SPORT];
    export * from '@/lib/careerPreDraft';
    export { startCoachCareer } from '@/lib/usCoachCareer';
    export { createUsCareerProspect } from '@/lib/usCareerProspect';
    export { defaultAppearance } from '@/lib/soccerCareerAppearance';
  `, resolveDir: ROOT, sourcefile: 'rev1346.ts', loader: 'ts' },
  outfile: bundleFile, bundle: true, platform: 'node', format: 'cjs', logLevel: 'silent', alias: { '@': path.join(ROOT, 'src') },
});
if (/supabase\.co/.test(fs.readFileSync(bundleFile, 'utf8'))) { console.log('engine bundle reaches the database host. Refusing.'); process.exit(2); }
const M = createRequire(import.meta.url)(bundleFile);
const fixture = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/usBoardFixture.json'), 'utf8'));

let fails = 0;
const fail = (id, m) => { fails += 1; console.log(`  FAIL ${id}: ${m}`); };
const note = (id, m) => console.log(`  ${id}: ${m}`);
const SIZES = [{ width: 390, height: 844, touch: true }, { width: 1280, height: 900, touch: false }];

function atShowcase(sport) {
  const pos = sport.create.defaultPos;
  const p = M.createUsCareerProspect(sport, { name: 'Review Prospect', pos, archetypeId: sport.create.archetypes[pos][0].id, eraId: 'now', appearance: M.defaultAppearance(), seed: `${sport.slug}:review1346` });
  const desc = sport.preDraft(p.eraId);
  let state = M.preDraftStart(desc, { ...p, routeId: desc.routes[0].id });
  for (let n = 0; n < 12 && state.phase !== 'showcase'; n++) state = state.phase === 'season' ? M.preDraftPlaySeason(desc, state) : M.preDraftChoose(desc, state, 0);
  if (state.phase !== 'showcase') throw new Error(`${sport.slug}: road never reached the showcase`);
  return { ...p, state };
}
const prospectSave = sport => JSON.stringify({ c: null, phase: 'prospect', teamQuality: null, coach: null, prospect: atShowcase(sport) });

async function open(browser, sport, size, saveValue, reduced) {
  const route = `/${sport.gameSlug}`;
  const ctx = await browser.newContext({
    viewport: { width: size.width, height: size.height }, isMobile: size.touch, hasTouch: size.touch, deviceScaleFactor: 1,
    reducedMotion: reduced ? 'reduce' : 'no-preference', serviceWorkers: 'block',
    storageState: { cookies: [], origins: [{ origin: new URL(BASE).origin, localStorage: [
      { name: sport.saveKey, value: saveValue }, { name: `rules-gate-seen:${route}`, value: '1' }, { name: 'cookie-consent', value: 'essential' },
    ] }] },
  });
  await ctx.route('**/*', r => {
    const url = r.request().url();
    if (/supabase\.co/.test(url)) return r.abort();
    if (new URL(url).origin === new URL(BASE).origin) return r.continue();
    const type = r.request().resourceType();
    return r.fulfill({ status: 200, contentType: type === 'stylesheet' ? 'text/css' : 'application/json', body: type === 'stylesheet' ? '' : '[]' });
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 160)));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_FAILED|net::/.test(m.text())) errors.push(m.text().slice(0, 160)); });
  await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
  const shot = async name => page.screenshot({ path: path.join(OUT, `${TAG}-${sport.slug}-${size.width}${reduced ? '-rm' : ''}-${name}.png`) });
  const tap = async loc => (size.touch ? loc.tap() : loc.click());
  const bytes = () => page.evaluate(k => localStorage.getItem(k), sport.saveKey);
  const sideways = async id => { const m = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]); if (m[0] > m[1]) fail(id, `sideways scroll ${m[0]} on ${m[1]}`); };
  const rect = sel => page.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, top: r.top, bottom: r.bottom, ih: innerHeight }; }, sel);
  return { ctx, page, errors, shot, tap, bytes, sideways, rect };
}

/* ---------- C1: an active coach retires (double tap on the confirm), the done hub and its tiles, the retirement screen ---------- */
async function coachRetire(browser, sport, size, reduced) {
  const id = `C1:${sport.slug}-${size.width}${reduced ? '-rm' : ''}`;
  const o = await open(browser, sport, size, fixture.sports[sport.slug].saves.coach, reduced);
  const { page, tap, shot, bytes, sideways, rect } = o;
  try {
    const opener = page.getByRole('button', { name: 'Retire from coaching', exact: true });
    await opener.waitFor();
    const y0 = await page.evaluate(() => scrollY);
    await page.waitForTimeout(1500);
    const y1 = await page.evaluate(() => scrollY);
    note(id, `scrollY on load ${y0} then ${y1} after 1.5 s; opener ${JSON.stringify(await rect('[data-coach-retire] button'))}`);
    if (y1 !== y0) fail(id, `the page moved by itself after load (${y0} to ${y1})`);
    await sideways(id); await shot('c1-hub');
    await tap(opener);
    const dialog = page.getByRole('alertdialog', { name: 'Retire from coaching?' });
    await dialog.waitFor(); await page.waitForTimeout(300);
    const d = await rect('[role="alertdialog"]');
    if (!d || d.top < 0 || d.bottom > d.ih) fail(id, `dialog not inside the screen ${JSON.stringify(d)}`);
    await shot('c1-dialog');
    const confirm = dialog.getByRole('button', { name: 'Retire from coaching', exact: true });
    const cb = await confirm.boundingBox();
    if (cb.height < 44) fail(id, `confirm ${cb.height} px tall`);
    await page.mouse.dblclick(cb.x + cb.width / 2, cb.y + cb.height / 2);
    await page.getByRole('heading', { name: 'Coaching career complete' }).waitFor();
    await page.waitForTimeout(600);
    const notes = await page.evaluate(() => (document.body.innerText.match(/You stepped away from coaching/g) || []).length);
    if (notes !== 1) fail(id, `the retirement note shows ${notes} times after a double tap`);
    const saved = JSON.parse(await bytes());
    if (saved.coach?.done !== true) fail(id, 'done not saved');
    const done = await rect('[data-coach-done]');
    note(id, `done card ${JSON.stringify(done)}; focus on ${await page.evaluate(() => document.activeElement?.tagName + ' ' + (document.activeElement?.textContent || '').trim().slice(0, 30))}`);
    if (!done || done.bottom < 1 || done.top > done.ih - 40) fail(id, 'done card off screen');
    if (/NaN|undefined/.test(await page.evaluate(() => document.body.innerText))) fail(id, 'NaN or undefined on the page');
    await sideways(id); await shot('c1-done');
    for (const [tile, name] of [[/The Market/, 'market'], [/The Job|Out Of Work|Out of work/, 'job'], [/Coaching Log/, 'log']]) {
      await tap(page.getByRole('button', { name: tile }).first());
      await page.waitForTimeout(400);
      const takes = await page.getByRole('button', { name: /^Take the / }).count();
      if (takes) fail(id, `${name} drill in offers ${takes} Take buttons on a finished career`);
      await sideways(id); await shot(`c1-${name}`);
      await tap(page.getByRole('button', { name: /Back$/ }).first());
      await page.getByRole('heading', { name: 'Coaching career complete' }).waitFor();
    }
    await tap(page.getByRole('button', { name: /Back to the playing career/ }));
    const review = page.getByRole('button', { name: 'Review coaching career', exact: true });
    await review.waitFor(); await review.scrollIntoViewIfNeeded(); await page.waitForTimeout(300);
    for (const bad of ['Back to the sideline', 'Start coaching']) if (await page.getByRole('button', { name: bad }).count()) fail(id, `retirement screen offers ${bad}`);
    await sideways(id); await shot('c1-retired-screen');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    note(id, `after reload: phase ${JSON.parse(await bytes()).phase}, review button ${await page.getByRole('button', { name: 'Review coaching career', exact: true }).count()}`);
    await shot('c1-reload');
    if (o.errors.length) fail(id, `page errors: ${o.errors.join(' | ')}`);
  } catch (e) { fail(id, String(e.message || e).split('\n')[0]); await shot('c1-error').catch(() => {}); } finally { await o.ctx.close(); }
}

/* ---------- C2: a coach who retires before a first season, out of work with offers on the table ---------- */
async function coachZero(browser, sport, size) {
  const id = `C2:${sport.slug}-${size.width}`;
  const saved = JSON.parse(fixture.sports[sport.slug].saves.coach);
  let seed = 7; const rng = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const co = M.startCoachCareer(sport.slug, saved.c, saved.c.year, rng);
  saved.coach = { ...co, done: true };
  const o = await open(browser, sport, size, JSON.stringify(saved), false);
  const { page, tap, shot, sideways } = o;
  try {
    await page.getByRole('heading', { name: 'Coaching career complete' }).waitFor();
    await page.waitForTimeout(800);
    const text = await page.evaluate(() => document.body.innerText);
    if (/NaN|undefined/.test(text)) fail(id, 'NaN or undefined on the page');
    note(id, `offers in the save ${co.offers.length}; done card text: ${JSON.stringify((await page.locator('[data-coach-done]').innerText()).replace(/\s+/g, ' ').slice(0, 220))}`);
    await sideways(id); await shot('c2-done-zero');
    await tap(page.getByRole('button', { name: /The Market/ }).first());
    await page.waitForTimeout(400);
    const takes = await page.getByRole('button', { name: /^Take the / }).count();
    if (takes) fail(id, `The Market offers ${takes} Take buttons on a finished career`);
    await shot('c2-market');
    const hubTakes = 0;
    void hubTakes;
    if (o.errors.length) fail(id, `page errors: ${o.errors.join(' | ')}`);
  } catch (e) { fail(id, String(e.message || e).split('\n')[0]); await shot('c2-error').catch(() => {}); } finally { await o.ctx.close(); }
}

/* ---------- P1: showcase skip, reload, undo, the double taps, and draft night with its replay ---------- */
const box = async loc => { const b = await loc.boundingBox(); return b ? { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) } : null; };
const center = b => [b.x + b.w / 2, b.y + b.h / 2];
const under = (page, b) => page.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); const btn = e?.closest('button'); return btn ? `button "${btn.textContent.trim().slice(0, 40)}"` : (e ? e.tagName : 'nothing'); }, center(b));
const prospectOf = async bytesFn => JSON.parse(await bytesFn()).prospect.state;

async function prospect(browser, sport, size, reduced) {
  const id = `P1:${sport.slug}-${size.width}${reduced ? '-rm' : ''}`;
  const value = prospectSave(sport);
  const before = JSON.stringify(JSON.parse(value).prospect.state);
  const o = await open(browser, sport, size, value, reduced);
  const { page, tap, shot, bytes, sideways } = o;
  try {
    await page.locator('[data-prospect-phase="showcase"]').waitFor();
    await page.waitForTimeout(500);
    await sideways(id); await shot('p1-showcase');
    const skip = page.getByRole('button', { name: /^Skip it/ });
    const skipBox = await box(skip);
    await tap(skip);
    await page.locator('[data-prospect-phase="draft"]').waitFor();
    await page.waitForTimeout(500);
    const undo = page.getByRole('button', { name: 'Undo skip', exact: true });
    const undoBox = await box(undo), dayBox = await box(page.getByRole('button', { name: 'Draft day', exact: true }));
    note(id, `Skip it ${JSON.stringify(skipBox)}; after the skip, under that point: ${await under(page, skipBox)}; Undo skip ${JSON.stringify(undoBox)}; Draft day ${JSON.stringify(dayBox)}; scrollY ${await page.evaluate(() => scrollY)}`);
    if (!undoBox || undoBox.h < 44) fail(id, `Undo skip ${undoBox ? undoBox.h + ' px' : 'missing'}`);
    await sideways(id); await shot('p1-skipped');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('[data-prospect-phase="draft"]').waitFor();
    if (!(await undo.count())) fail(id, 'Undo skip gone after a reload');
    await page.waitForTimeout(400);
    const undoBox2 = await box(undo);
    await tap(undo);
    await page.locator('[data-prospect-phase="showcase"]').waitFor();
    await page.waitForTimeout(400);
    if (JSON.stringify(await prospectOf(bytes)) !== before) fail(id, 'undo did not restore the road state to the byte');
    note(id, `after Undo, under the Undo point: ${await under(page, undoBox2)}; scrollY ${await page.evaluate(() => scrollY)}`);
    await sideways(id); await shot('p1-undone');
    if (o.errors.length) fail(id, `page errors: ${o.errors.join(' | ')}`);
  } catch (e) { fail(id, String(e.message || e).split('\n')[0]); await shot('p1-error').catch(() => {}); } finally { await o.ctx.close(); }
}

/* ---------- P2: the double taps a player makes by accident ---------- */
async function doubleTaps(browser, sport, size) {
  for (const which of ['skip', 'undo']) {
    const id = `P2-${which}:${sport.slug}-${size.width}`;
    const o = await open(browser, sport, size, prospectSave(sport), false);
    const { page, tap, shot, bytes } = o;
    try {
      await page.locator('[data-prospect-phase="showcase"]').waitFor();
      await page.waitForTimeout(500);
      let target = page.getByRole('button', { name: /^Skip it/ });
      if (which === 'undo') {
        await tap(target);
        await page.locator('[data-prospect-phase="draft"]').waitFor();
        await page.waitForTimeout(500);
        target = page.getByRole('button', { name: 'Undo skip', exact: true });
      }
      const b = await box(target);
      const [x, y] = center(b);
      if (size.touch) { await page.touchscreen.tap(x, y); await page.waitForTimeout(120); await page.touchscreen.tap(x, y); }
      else await page.mouse.dblclick(x, y);
      await page.waitForTimeout(800);
      const s = await prospectOf(bytes);
      const outcome = `phase ${s.phase}, showcase ${s.showcase ? s.showcase.approach : 'none'}, drafted ${s.draft ? 'yes' : 'no'}`;
      note(id, `double tap on ${which === 'skip' ? 'Skip it' : 'Undo skip'} at ${Math.round(x)},${Math.round(y)}: ${outcome}`);
      if (s.draft) fail(id, `a double tap on ${which} pressed Draft day: ${outcome}`);
      if (which === 'undo' && s.showcase && s.showcase.approach !== 'skip') fail(id, `a double tap on Undo skip picked a graded approach, which has no undo: ${outcome}`);
      await shot(`p2-${which}`);
    } catch (e) { fail(id, String(e.message || e).split('\n')[0]); } finally { await o.ctx.close(); }
  }
}

/* ---------- N1: draft night, live, skipped, watched again; is the pick hidden while the rows replay? ---------- */
const resultSeen = page => page.evaluate(() => {
  const el = document.querySelector('[data-testid="draft-result"]');
  if (!el) return null;
  const cs = getComputedStyle(el), r = el.getBoundingClientRect();
  return { opacity: Number(cs.opacity), visibility: cs.visibility, ariaHidden: el.getAttribute('aria-hidden'), top: Math.round(r.top), h: Math.round(r.height), text: el.textContent.trim().slice(0, 60) };
});
async function night(browser, sport, size, reduced) {
  const id = `N1:${sport.slug}-${size.width}${reduced ? '-rm' : ''}`;
  const o = await open(browser, sport, size, prospectSave(sport), reduced);
  const { page, tap, shot, bytes, sideways } = o;
  try {
    await page.locator('[data-prospect-phase="showcase"]').waitFor();
    await tap(page.getByRole('button', { name: /^Skip it/ }));
    await page.locator('[data-prospect-phase="draft"]').waitFor();
    await page.waitForFunction(() => performance.getEntriesByType('resource').some(e => /DraftNightSequence/.test(e.name)), null, { timeout: 15000 });
    await page.waitForTimeout(300);
    await tap(page.getByRole('button', { name: 'Draft day', exact: true }));
    if (reduced) {
      await page.locator('[data-night-stage="skipped"]').waitFor();
      await page.waitForTimeout(400);
      const again = await page.getByRole('button', { name: 'Watch it again', exact: true }).count();
      const cols = await page.evaluate(() => document.querySelector('[data-night-actions]')?.className.includes('grid-cols-2'));
      note(id, `reduced motion: Watch it again ${again}, two columns ${cols}, result ${JSON.stringify(await resultSeen(page))}`);
      if (again) fail(id, 'Watch it again under reduced motion');
      await sideways(id); await shot('n1-reduced-over');
    } else {
      await page.locator('[data-night-stage="live"]').waitFor();
      await page.waitForTimeout(150);
      const firstLive = await resultSeen(page);
      await shot('n1-live');
      await tap(page.getByRole('button', { name: 'Skip to the end', exact: true }));
      await page.locator('[data-night-stage="skipped"]').waitFor();
      await page.waitForTimeout(300);
      await sideways(id); await shot('n1-skipped');
      const saved = await bytes();
      const replay = page.getByRole('button', { name: 'Watch it again', exact: true });
      const rb = await box(replay);
      await tap(replay);
      await page.locator('[data-night-stage="live"]').waitFor();
      await page.waitForTimeout(150);
      const early = await resultSeen(page);
      await shot('n1-replay-early');
      await page.locator('[data-night-stage="landed"]').waitFor({ timeout: 30000 });
      await page.waitForTimeout(1500);
      const landed = await resultSeen(page);
      await sideways(id); await shot('n1-replay-landed');
      note(id, `Watch it again ${JSON.stringify(rb)}; result on the first live night ${JSON.stringify(firstLive)}; 150 ms into the replay ${JSON.stringify(early)}; landed ${JSON.stringify(landed)}; scrollY ${await page.evaluate(() => scrollY)}`);
      if (early && early.opacity > 0.1 && early.visibility !== 'hidden') fail(id, `the pick shows while the replay plays (opacity ${early.opacity})`);
      if (!landed || landed.opacity < 0.9) fail(id, `the result did not come back after the replay (${JSON.stringify(landed)})`);
      if (await bytes() !== saved) fail(id, 'the replay changed the save');
    }
    if (o.errors.length) fail(id, `page errors: ${o.errors.join(' | ')}`);
  } catch (e) { fail(id, String(e.message || e).split('\n')[0]); await shot('n1-error').catch(() => {}); } finally { await o.ctx.close(); }
}

/* ---------- H: the new help line on the page's "?" and in the road's own help ---------- */
async function help(browser, sport, size) {
  const id = `H:${sport.slug}-${size.width}`;
  const o = await open(browser, sport, size, fixture.sports[sport.slug].saves.coach, false);
  const { page, tap, shot } = o;
  try {
    await page.getByRole('button', { name: 'Retire from coaching', exact: true }).waitFor();
    await tap(page.getByRole('button', { name: 'How to play' }).first());
    const line = page.getByText(/Retire from coaching sits under the action card/);
    await line.waitFor();
    await line.scrollIntoViewIfNeeded(); await page.waitForTimeout(300);
    note(id, `help line shown ${await line.count()} time(s)`);
    await shot('h-help');
  } catch (e) { fail(id, String(e.message || e).split('\n')[0]); await shot('h-error').catch(() => {}); } finally { await o.ctx.close(); }
  const id2 = `H2:${sport.slug}-${size.width}`;
  const p = await open(browser, sport, size, prospectSave(sport), false);
  try {
    await p.page.locator('[data-prospect-phase="showcase"]').waitFor();
    await p.tap(p.page.getByRole('button', { name: 'Road to the draft help' }));
    const l2 = p.page.getByText(/Pressed Skip it by mistake/);
    await l2.waitFor(); await l2.scrollIntoViewIfNeeded(); await p.page.waitForTimeout(300);
    await p.shot('h2-road-help');
  } catch (e) { fail(id2, String(e.message || e).split('\n')[0]); } finally { await p.ctx.close(); }
}

/* ---------- T: how long the double tap window on Undo skip stays open, and the night's two shared cells ---------- */
async function twoTaps(page, size, x, y, gap) {
  if (size.touch) { await page.touchscreen.tap(x, y); await page.waitForTimeout(gap); await page.touchscreen.tap(x, y); }
  else { await page.mouse.click(x, y); await page.waitForTimeout(gap); await page.mouse.click(x, y); }
}
async function tapWindows(browser, sport, size) {
  for (const gap of [80, 150, 250, 400, 700]) {
    const id = `T-undo-${gap}:${sport.slug}-${size.width}`;
    const o = await open(browser, sport, size, prospectSave(sport), false);
    try {
      await o.page.locator('[data-prospect-phase="showcase"]').waitFor(); await o.page.waitForTimeout(400);
      await o.tap(o.page.getByRole('button', { name: /^Skip it/ }));
      await o.page.locator('[data-prospect-phase="draft"]').waitFor(); await o.page.waitForTimeout(700);
      const [x, y] = center(await box(o.page.getByRole('button', { name: 'Undo skip', exact: true })));
      await twoTaps(o.page, size, x, y, gap);
      await o.page.waitForTimeout(900);
      const s = await prospectOf(o.bytes);
      note(id, `two taps ${gap} ms apart on Undo skip: phase ${s.phase}, showcase ${s.showcase ? s.showcase.approach : 'none'}, stock ${s.stock}`);
    } catch (e) { fail(id, String(e.message || e).split('\n')[0]); } finally { await o.ctx.close(); }
  }
  for (const which of ['Skip to the end', 'Watch it again']) {
    const id = `T-night-${which.split(' ')[0]}:${sport.slug}-${size.width}`;
    const o = await open(browser, sport, size, prospectSave(sport), false);
    try {
      await o.page.locator('[data-prospect-phase="showcase"]').waitFor();
      await o.tap(o.page.getByRole('button', { name: /^Skip it/ }));
      await o.page.locator('[data-prospect-phase="draft"]').waitFor();
      await o.page.waitForFunction(() => performance.getEntriesByType('resource').some(e => /DraftNightSequence/.test(e.name)), null, { timeout: 15000 });
      await o.page.waitForTimeout(300);
      await o.tap(o.page.getByRole('button', { name: 'Draft day', exact: true }));
      await o.page.locator('[data-night-stage="live"]').waitFor(); await o.page.waitForTimeout(400);
      if (which === 'Watch it again') { await o.tap(o.page.getByRole('button', { name: 'Skip to the end', exact: true })); await o.page.locator('[data-night-stage="skipped"]').waitFor(); await o.page.waitForTimeout(400); }
      const [x, y] = center(await box(o.page.getByRole('button', { name: which, exact: true })));
      await twoTaps(o.page, size, x, y, 150);
      await o.page.waitForTimeout(600);
      const stage = await o.page.evaluate(() => document.querySelector('[data-night-stage]')?.getAttribute('data-night-stage'));
      const phase = await o.page.evaluate(() => document.querySelector('[data-prospect-journey]')?.getAttribute('data-prospect-phase') ?? 'journey gone');
      note(id, `two taps 150 ms apart on ${which}: night stage ${stage}, journey ${phase}`);
      await o.shot(`t-night-${which.split(' ')[0].toLowerCase()}`);
    } catch (e) { fail(id, String(e.message || e).split('\n')[0]); } finally { await o.ctx.close(); }
  }
}

const browser = await chromium.launch();
try {
  for (const sport of M.sports) {
    if (ONLY === 'taps') { for (const size of SIZES) await tapWindows(browser, sport, size); continue; }
    if (ONLY === 'replay') { await night(browser, sport, SIZES[1], false); continue; }
    for (const size of SIZES) {
      await coachRetire(browser, sport, size, false);
      await coachZero(browser, sport, size);
      await prospect(browser, sport, size, false);
      await prospect(browser, sport, size, true);
      await doubleTaps(browser, sport, size);
      await night(browser, sport, size, false);
      await night(browser, sport, size, true);
      await help(browser, sport, size);
    }
    await coachRetire(browser, sport, SIZES[0], true);
  }
} finally {
  await browser.close();
  if (server) server.kill();
}
console.log(`  screenshots: ${fs.readdirSync(OUT).filter(f => f.endsWith('.png')).length} in ${OUT}`);
console.log(fails === 0 ? `REVIEW WALK (${TAG}): ALL GREEN` : `REVIEW WALK (${TAG}): ${fails} FAILURES`);
process.exit(fails === 0 ? 0 : 1);
