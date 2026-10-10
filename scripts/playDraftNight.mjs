/* Round 1220: draft night in the four US My Careers, walked in a real browser.
 *
 * WHAT THIS HOLDS, measured and never eyeballed, at 390 by 844 (touch) and
 * 1280 by 800, on /nfl-my-career, /nba-my-career, /mlb-my-career and
 * /nhl-my-career, for three prospects the bundled engine built for each sport
 * (a first round pick, which for the NBA is a lottery pick; a late pick; an
 * undrafted one), watched, skipped and with less motion. Then a late pick in
 * the OTHER era of each sport at 390 (the 2003 NBA lottery is three tiles,
 * MLB's 2004 draft is 1,500 picks), the NBA's night watched and skipped
 * at 360 by 740 and 320 by 640, and the NBA's night watched on a phone on its
 * side, 844 by 390 (item 4b). 49 nights in all.
 *   1. The range the card prints before the press is the engine's own line.
 *   2. NOTHING JUMPS. From the frame the night is on screen to the last one,
 *      the card and the journey keep their height (down to 320 wide, where
 *      the two buttons once wrapped and the card lost 20 px when the skip
 *      went), and once the page has been SEEN standing still after the
 *      press's own reveal it does not move again. No frame overflows
 *      sideways.                               Controls `late` and `again`.
 *   3. NO SPOILER. Until the closing row starts to land, the title, the club
 *      line, the result block and the closing row itself are at opacity 0,
 *      and the file under the stage (age, rating, health) reads exactly as
 *      it did before the press: the numbers after the minors come with the
 *      ending, and nothing in the file goes blank.
 *      The opacity is read on the elements that carry the hold (it is not
 *      inherited, so a child of a held parent reports 1). The moment is the
 *      closing row's OWN animation delay, never the page's number for the
 *      hold, and each held element's own delay must reach it, so a hold that
 *      ends early is red whatever the frames caught.        Control `spoiler`.
 *   4. YOU SEE YOUR NAME CALLED. At the frame the closing row lands it is
 *      wholly inside the viewport, with no scroll from the driver, and
 *      nothing is drawn over it.                              Control `fold`.
 *  4b. ON A SCREEN SHORTER THAN THE NIGHT (844 by 390) the ending cannot be
 *      on screen from the first frame. There the page stands still while the
 *      picks come in, moves once more when the closing row starts to land and
 *      not a frame before, and a second after the row landed it is wholly
 *      inside the viewport, uncovered, with the page at rest.
 *      Control `ending` (a reveal asked once the closing row has started to
 *      land is dropped: the row stays below the fold).
 *   5. Nothing live is hidden: no enabled button sits inside an element whose
 *      own or inherited opacity is 0, and every button is at least 44 by 44.
 *   6. The last frame is the save: the closing row says, word for word, the
 *      saved pick, club, round and pick in that round (the late pick is past
 *      round one, where the last two differ), the save is byte for byte what
 *      the engine says, at most twelve rows are on screen, and the career
 *      that starts is that club.
 *   7. Less motion: every row and every held word is at opacity 1 in the
 *      first frame.                                         Control `hidden`.
 *   8. Skip: one press lands every row and every held word at once, and the
 *      page does not move for it.
 *   9. THE WORDS ON A LOTTERY TILE FIT THE TILE, AT EVERY WIDTH DOWN TO 320.
 *      Both lines of every tile on screen, then every other club of the era
 *      in the first tile's own label box, then every seed line the era's
 *      lottery can print ("Seed 1 · Down 3") in the box under it, measured
 *      in the site's own typeface (it is let through from Google Fonts; if
 *      it does not load the check fails rather than measure a fallback).
 *      Control `cut`, and at 320 wide control `narrowtile` (the journey's
 *      own narrow rule for the tile taken away: the tile is the shared
 *      presenter's again, 73 px of room for an 83 px name).
 * The live database host is aborted in every context. No page error.
 *
 * Needs dist/ (npm run build). It serves it itself through
 * scripts/lib/hostLikeServer.mjs. ENGINES=chromium is the only engine.
 *
 * Run:      node scripts/playDraftNight.mjs
 * Control:  PLAY_DRAFT_NIGHT_CONTROL=<late|spoiler|fold|hidden|cut|again|narrowtile|ending> node scripts/playDraftNight.mjs
 *           (must exit 1 on its own check, and exits 2 if it changed nothing)
 * Output:   screenshots and measurements in $RC_OUT, or .tmp-fx/play-draft-night.
 */
import assert from 'node:assert/strict';
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
const CONTROL = process.env.PLAY_DRAFT_NIGHT_CONTROL || '';
const CONTROLS = { late: 'height', spoiler: 'spoiler', fold: 'fold', hidden: 'reduced', cut: 'cut', again: 'scroll', narrowtile: 'cut', ending: 'fold' };
if (CONTROL && !CONTROLS[CONTROL]) { console.error(`Unknown control ${CONTROL}`); process.exit(2); }
const OUT = path.resolve(process.env.RC_OUT || path.join(ROOT, '.tmp-fx/play-draft-night'));
fs.mkdirSync(OUT, { recursive: true });
if (!fs.existsSync(path.join(ROOT, 'dist/index.html'))) { console.error('Build dist before the draft night walk. Refusing to run.'); process.exit(2); }

/* The engine bundle is a working file, so it stays out of the folder that is sent back. */
const bundle = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'draft-night-')), 'engine.cjs');
await build({
  stdin: { contents: `
    import { NFL_CAREER_SPORT } from '@/lib/nflCareerSport';
    import { NBA_CAREER_SPORT } from '@/lib/nbaCareerSport';
    import { MLB_CAREER_SPORT } from '@/lib/mlbCareerSport';
    import { NHL_CAREER_SPORT } from '@/lib/nhlCareerSport';
    export const sports = [NFL_CAREER_SPORT, NBA_CAREER_SPORT, MLB_CAREER_SPORT, NHL_CAREER_SPORT];
    export * from '@/lib/careerPreDraft';
    export * from '@/lib/careerDraftNight';
    export { createUsCareerProspect } from '@/lib/usCareerProspect';
    export { defaultAppearance } from '@/lib/soccerCareerAppearance';
  `, resolveDir: ROOT, sourcefile: 'play-draft-night-engine.ts', loader: 'ts' },
  outfile: bundle, bundle: true, platform: 'node', format: 'cjs', logLevel: 'silent', alias: { '@': path.join(ROOT, 'src') },
});
if (/supabase\.co/.test(fs.readFileSync(bundle, 'utf-8'))) { console.error('The engine bundle reaches the live database host. Refusing to run.'); process.exit(2); }
const M = createRequire(import.meta.url)(bundle);

/** A prospect the engine walked to the "Draft day" button. */
function atDraft(sport, seedId, rating, eraId) {
  const pos = sport.create.defaultPos;
  const made = M.createUsCareerProspect(sport, { name: 'Night Prospect', pos, archetypeId: sport.create.archetypes[pos][0].id, eraId, appearance: M.defaultAppearance(), seed: `${sport.slug}:${seedId}` });
  assert.equal(made.eraId, eraId, `${sport.slug}: the prospect was made in ${made.eraId}, not ${eraId}`);
  const p = rating ? { ...made, rating, pot: Math.max(made.pot, rating) } : made;
  const desc = sport.preDraft(p.eraId);
  let state = M.preDraftStart(desc, { ...p, routeId: desc.routes[0].id });
  for (let n = 0; n < 12 && state.phase !== 'showcase'; n += 1) state = state.phase === 'season' ? M.preDraftPlaySeason(desc, state) : M.preDraftChoose(desc, state, 0);
  return { ...p, state: M.preDraftShowcase(desc, state, 'steady') };
}
/** The first seed whose real draft ends the way this case needs. */
function find(sport, kind, eraId = 'now') {
  const desc = sport.preDraft(eraId);
  const teams = desc.teamIds().length, total = teams * desc.rounds;
  const wants = {
    first: out => out.pick !== null && out.pick <= (desc.lottery ? desc.lottery.drawn : teams),
    late: out => out.pick !== null && out.pick > total / 2,
    undrafted: out => out.pick === null,
  }[kind];
  const ratings = { first: [96, 92, 88], late: [undefined, 62, 58, 66], undrafted: [40, 45] }[kind];
  for (const rating of ratings) for (let n = 0; n < 300; n += 1) {
    const p = atDraft(sport, `${kind}-${n}`, rating, eraId);
    const done = M.preDraftRunDraft(desc, p.state);
    if (wants(done.draft)) return { p, done, desc, kind, eraId };
  }
  throw new Error(`no ${kind} prospect found for ${sport.slug} in ${eraId}`);
}

const port = await new Promise((resolve, reject) => {
  const probe = createServer(); probe.once('error', reject);
  probe.listen(0, '127.0.0.1', () => { const chosen = probe.address().port; probe.close(error => (error ? reject(error) : resolve(chosen))); });
});
const BASE = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', 'dist', String(port)], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
let serverLog = '';
server.stdout.on('data', data => { serverLog += data; });
server.stderr.on('data', data => { serverLog += data; });
await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error(`the server did not start within 20 seconds: ${serverLog}`)), 20000);
  server.once('error', error => { clearTimeout(timer); reject(error); });
  server.once('exit', code => { clearTimeout(timer); reject(new Error(`the server exited ${code}: ${serverLog}`)); });
  server.stdout.on('data', data => { if (String(data).includes('host-like server:')) { clearTimeout(timer); resolve(); } });
});

const SIZES = [{ width: 390, height: 844, touch: true }, { width: 1280, height: 800, touch: false }];
/* Two narrower phones, for the NBA's night (the tallest card, and the one with tiles): 360 by 740,
   a common Android size, and 320 by 640, the narrowest the journey lays out for. The fit of the
   lottery tile's words is judged at both (at 320 it was only written down until the journey's
   narrow rule gave the tile the room: the shared presenter alone cuts its longest club there). */
const NARROW = [{ width: 360, height: 740, touch: true }, { width: 320, height: 640, touch: true }];
/* A phone on its side: a screen SHORTER than the night itself (the NBA's card is over 800 px high
   and this viewport is 390). The ending cannot be on screen from the first frame there, so the
   rule is a different one: the page shows the top of the board, stands still while the picks come
   in, and moves once more when the closing row starts to land, to bring the ending in. */
const SHORT = { width: 844, height: 390, touch: true, short: true };
/* The other era of each sport: the 2003 NBA lottery is three tiles in a two column grid, and
   MLB's 2004 draft is 1,500 picks. */
const THROWBACK = { nfl: 'y2005', nba: 'y2004', mlb: 'y2004', nhl: 'y2006' };const results = [];
const failures = [];
const fail = (id, check, message) => { failures.push({ id, check, message }); console.error(`  FAIL [${check}] ${id}: ${message}`); };

/* What a control breaks. A style goes in once the page has loaded, before the
   press (the first run of this walk put it in from an init script, where the
   document has no root element yet, so three controls changed nothing and the
   walk refused them: exit 2, as it must). The one patch goes in before any
   page code runs. */
const CONTROL_STYLE = {
  /* Rows that take their room only when they arrive: the card grows under the player. */
  late: '@keyframes lateMount { from { max-height: 0; padding-top: 0; padding-bottom: 0; border-width: 0; overflow: hidden; opacity: 0; } to { max-height: 160px; opacity: 1; } } [data-night-row] { animation-name: lateMount !important; animation-fill-mode: both !important; }',
  /* The hold taken off the words above the board and off the result block. */
  spoiler: '[data-night-hold] h2, [data-night-hold] p, [data-testid="draft-result"] { animation: none !important; opacity: 1 !important; }',
  /* A row left invisible for somebody who asked for less motion. */
  hidden: '[data-night-row] { opacity: 0 !important; }',
  /* A lottery tile with less room for its words than the words need. */
  cut: '[data-lottery-face] > span:last-child { max-width: 44px; }',
  /* Under 360 wide the tile as the shared presenter draws it, without the journey's narrow rule. */
  narrowtile: '@media (max-width: 359px) { [data-lottery-face] { padding-inline: 6px !important; gap: 6px !important; } [data-lottery-face] > span:first-child { width: 20px !important; } [data-lottery-face] > span:last-child > span:first-child { font-size: 12px !important; } }',
};
const CONTROL_INIT = {
  /* The press reveals nothing: the board stays wherever the page happened to be. */
  fold: () => { Element.prototype.scrollIntoView = function () {}; },
  /* The page moves a second time, two seconds after the reveal, while the picks are coming in. */
  again: () => {
    const real = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function (...args) { real.apply(this, args); setTimeout(() => window.scrollBy(0, -60), 2000); };
  },
  /* The ending is not brought into view: a reveal asked once the closing row has started to land is dropped. */
  ending: () => {
    const real = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function (...args) {
      const closing = document.querySelector("[data-night-row='you'], [data-night-row='unpicked']");
      if (closing && Number(getComputedStyle(closing).opacity) > 0) return;
      real.apply(this, args);
    };
  },
};

/* The frame by frame record, started before the press so the first frame of the night is in it. */
const RECORD = () => {
  const t0 = performance.now(); window.__night = [];
  const op = el => (el ? Number(getComputedStyle(el).opacity) : null);
  const tick = () => {
    const j = document.querySelector('[data-prospect-journey]');
    const card = document.querySelector('[data-testid="draft-showcase"]');
    const night = document.querySelector('[data-career-night]');
    const closing = night && night.querySelector("[data-night-row='you'], [data-night-row='unpicked']");
    const r = closing && closing.getBoundingClientRect();
    const rows = night ? [...night.querySelectorAll('[data-night-row]')].map(op) : [];
    window.__night.push({ t: performance.now() - t0, y: window.scrollY, card: card ? card.getBoundingClientRect().height : null, journey: j ? j.getBoundingClientRect().height : null,
      stage: night ? night.dataset.nightStage : null, h2: op(j && j.querySelector('[data-arrival] h2')), club: op(j && j.querySelector('[data-arrival] h2 + p')),
      result: op(document.querySelector('[data-testid="draft-result"]')), closing: op(closing), top: r ? r.top : null, bottom: r ? r.bottom : null, rowsMin: rows.length ? Math.min(...rows) : null,
      vh: window.innerHeight, sw: document.documentElement.scrollWidth, vw: document.documentElement.clientWidth,
      file: j && j.querySelector('[data-prospect-file]') ? j.querySelector('[data-prospect-file]').textContent : null });
    if (performance.now() - t0 < 9000) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};
const BUTTONS = () => [...document.querySelectorAll('[data-prospect-journey] button')].map(b => {
  let o = 1; for (let el = b; el; el = el.parentElement) o = Math.min(o, Number(getComputedStyle(el).opacity));
  const r = b.getBoundingClientRect();
  return { text: (b.textContent || b.getAttribute('aria-label') || '').trim().slice(0, 40), disabled: b.disabled, opacity: o, w: r.width, h: r.height };
});
/* The words on the lottery tiles, measured in their own boxes: the two lines of every tile on
   screen, then every other club of this era in the first tile's own label box and typeface, then
   every seed line the era's lottery can print in the box under it. */
const FIT = ({ names, seeds }) => {
  const lines = [...document.querySelectorAll('[data-lottery-face] > span:last-child > span')];
  const need = el => { const r = document.createRange(); r.selectNodeContents(el); return Math.round(r.getBoundingClientRect().width * 10) / 10; };
  const cut = lines.filter(el => el.scrollWidth > el.clientWidth).map(el => ({ text: el.textContent, need: need(el), room: el.clientWidth }));
  const sweep = (el, words) => {
    const keep = el.textContent, over = [];
    let widest = { text: '', need: 0 };
    for (const text of words) {
      el.textContent = text;
      const w = need(el);
      if (w > widest.need) widest = { text, need: w };
      if (el.scrollWidth > el.clientWidth) over.push({ text, need: w, room: el.clientWidth });
    }
    /* The box sizes to its words up to the room the tile has, so the room is read with more words than fit. */
    el.textContent = 'W'.repeat(60);
    const room = el.clientWidth;
    el.textContent = keep;
    return { over, widest, room };
  };
  const club = sweep(lines[0], names), seed = sweep(lines[1], seeds);
  return { cut, clubs: club.over, room: club.room, widest: club.widest, seeds: seed.over, seedRoom: seed.room, widestSeed: seed.widest, font: getComputedStyle(lines[0]).fontFamily.split(',')[0] };
};
const CARD = () => ({ y: window.scrollY, card: document.querySelector('[data-testid="draft-showcase"]').getBoundingClientRect().height, stage: document.querySelector('[data-career-night]').dataset.nightStage });
const END = () => {
  const night = document.querySelector('[data-career-night]');
  const closing = night.querySelector("[data-night-row='you'], [data-night-row='unpicked']");
  const r = closing.getBoundingClientRect();
  const at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
  return { text: closing.innerText, top: r.top, bottom: r.bottom, vh: window.innerHeight, covered: !(at && closing.contains(at)), file: document.querySelector('[data-prospect-file]').textContent,
    rows: night.querySelectorAll('[data-night-row]').length, tiles: night.querySelectorAll('[data-lottery-slot]').length, kinds: [...night.querySelectorAll('[data-night-row]')].map(x => x.dataset.nightRow),
    tileWords: [...night.querySelectorAll('[data-lottery-slot]')].map(li => [li.dataset.lotterySlot, ...[...li.querySelectorAll('[data-lottery-face] > span:last-child > span')].map(x => x.textContent)].join(' | ')) };
};

async function open(browser, sport, size, p, mode) {
  const route = `/${sport.gameSlug}`;
  const context = await browser.newContext({
    viewport: { width: size.width, height: size.height }, isMobile: size.touch, hasTouch: size.touch, deviceScaleFactor: 1,
    reducedMotion: mode === 'reduced' ? 'reduce' : 'no-preference', serviceWorkers: 'block',
    storageState: { cookies: [], origins: [{ origin: BASE, localStorage: [
      { name: sport.saveKey, value: JSON.stringify({ c: null, phase: 'prospect', teamQuality: null, coach: null, prospect: p }) },
      { name: `rules-gate-seen:${route}`, value: '1' }, { name: 'cookie-consent', value: 'essential' },
    ] }] },
  });
  if (CONTROL_INIT[CONTROL]) await context.addInitScript(CONTROL_INIT[CONTROL]);
  /* The live database host is aborted; anything else off this origin gets an empty answer. */
  await context.route('**/*', r => {
    const url = r.request().url();
    if (/supabase\.co/.test(url)) return r.abort();
    if (new URL(url).origin === BASE) return r.continue();
    /* The site's own typeface comes from here, and a width measured in a fallback is not the width a player sees. */
    if (/^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(url)) return r.continue();
    const type = r.request().resourceType();
    return r.fulfill({ status: 200, contentType: type === 'stylesheet' ? 'text/css' : 'application/json', body: type === 'stylesheet' ? '' : '[]' });
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-prospect-phase="draft"]').waitFor();
  await page.evaluate(() => document.fonts.ready);
  /* Every weight the night prints in, here before the press, so no face arrives in mid night. */
  const inter = await page.evaluate(async () => {
    const got = await Promise.all(['400', '600', '700'].map(w => document.fonts.load(`${w} 12px Inter`).catch(() => [])));
    await document.fonts.ready;
    return got.every(faces => faces.length > 0);
  });
  if (CONTROL_STYLE[CONTROL]) await page.addStyleTag({ content: CONTROL_STYLE[CONTROL] });
  return { context, page, inter };
}

async function run(browser, sport, size, found, mode, { startCareer = false, shots = false } = {}) {
  const { p, done, desc, kind, eraId } = found;
  const id = `${sport.slug}${eraId === 'now' ? '' : `-${eraId}`}-${size.width}-${kind}-${mode}`;
  const out = done.draft;
  const row = { id, mode, kind, pick: out.pick, team: out.team };
  results.push(row);
  const { context, page, inter } = await open(browser, sport, size, p, mode);
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(String(error)));
  const shot = async name => { if (shots) await page.screenshot({ path: path.join(OUT, `${id}-${name}.png`) }); };
  const press = async name => { const b = page.getByRole('button', { name, exact: true }); if (size.touch) await b.tap(); else await b.click(); };
  try {
    /* 1. The range line is the engine's. */
    const range = (await page.getByTestId('draft-range').innerText()).trim();
    const wantRange = M.preDraftProjectionLine(M.preDraftProjection(desc, p.state), 'have');
    if (range !== wantRange) fail(id, 'range', `the card says "${range}", the engine says "${wantRange}"`);
    /* The night is a lazy chunk asked for at this step: wait for it, as a player reading the range does. */
    await page.waitForFunction(() => performance.getEntriesByType('resource').some(e => /DraftNightSequence/.test(e.name)), null, { timeout: 15000 });
    await page.waitForTimeout(250);
    await shot('1-before');
    const fileBefore = await page.locator('[data-prospect-file]').evaluate(el => el.textContent);
    await page.evaluate(RECORD);
    await press('Draft day');
    await page.locator('[data-prospect-phase="done"]').waitFor();
    await page.locator('[data-career-night]').waitFor({ timeout: 3000 });
    /* When the closing row starts to land, read off THAT ROW's own animation. The words above the
       board are judged against it, never against the journey's --night-hold: that is the page's own
       number for the hold, and a hold that ended early would move the yardstick with it. */
    const clock = mode === 'reduced' ? { close: 0 } : await page.evaluate(() => {
      const delay = el => (el ? parseFloat(getComputedStyle(el).animationDelay) || 0 : null);
      const j = document.querySelector('[data-prospect-journey]');
      return { close: delay(document.querySelector("[data-night-row='you'], [data-night-row='unpicked']")), title: delay(j.querySelector('[data-arrival] h2')), club: delay(j.querySelector('[data-arrival] h2 + p')), result: delay(document.querySelector('[data-testid="draft-result"]')) };
    });
    const hold = clock.close;
    row.closeAtS = hold;
    if (mode !== 'reduced') {
      if (!(hold > 0)) fail(id, 'spoiler', 'the closing row has no delay of its own to judge the hold against');
      for (const what of ['title', 'club', 'result']) if (!(clock[what] >= hold - 0.001)) fail(id, 'spoiler', `the ${what} is held for ${clock[what]} s and the closing row only starts to land at ${hold} s`);
    }
    /* 5. Nothing live is hidden and everything pressable is big enough, in the first frames. */
    const controls = await page.evaluate(BUTTONS);
    for (const c of controls) {
      if (!c.disabled && c.opacity < 0.05) fail(id, 'buttons', `"${c.text}" can be pressed while it is invisible`);
      if (c.w < 44 || c.h < 44) fail(id, 'buttons', `"${c.text}" is ${Math.round(c.w)} by ${Math.round(c.h)}`);
    }
    if (!controls.some(c => c.text === 'Start your career' && !c.disabled)) fail(id, 'buttons', 'Start your career is not live in the first frame');
    if (mode === 'skip') {
      /* 8. One press lands everything and the page does not move for it. */
      await page.waitForTimeout(350); await shot('2-live');
      const before = await page.evaluate(CARD);
      await press('Skip to the end');
      await page.waitForTimeout(150);
      const after = await page.evaluate(CARD);
      if (after.stage !== 'skipped') fail(id, 'skip', `the night is ${after.stage} after Skip`);
      if (Math.abs(after.card - before.card) > 1) fail(id, 'skip', `Skip changed the card height from ${before.card} to ${after.card}`);
    } else if (mode === 'watch') {
      await page.waitForTimeout(Math.min(hold * 500, 1500)); await shot('2-live');
      await page.waitForTimeout(hold * 1000 - Math.min(hold * 500, 1500) + 1300);
    }
    await page.waitForTimeout(700);
    await shot('3-last');
    const samples = (await page.evaluate(() => window.__night)).filter(s => s.stage !== null);
    if (!samples.length) throw new Error('no frame of the night was recorded');
    const t0 = samples[0].t, last = samples[samples.length - 1];
    const span = key => { const v = samples.map(s => s[key]); return [Math.min(...v), Math.max(...v)]; };
    /* 2. Nothing jumps. */
    const [cMin, cMax] = span('card'), [jMin, jMax] = span('journey');
    Object.assign(row, { frames: samples.length, cardHeight: [cMin, cMax], journeyHeight: [jMin, jMax], scroll: [samples[0].y, last.y] });
    if (cMax - cMin > 1 || jMax - jMin > 1) fail(id, 'height', `the card went from ${cMin} to ${cMax} and the journey from ${jMin} to ${jMax} while the night played`);
    /* The page moves once, for the press's own reveal, and never again. "Settled" is seen, not
       assumed (this check used to start a fixed 1,500 ms in, a figure nobody had measured): the
       first stretch of five frames or more, across 300 ms or more, in which the page stood still.
       No frame after it may sit anywhere else. Frames a slow machine never drew are not a
       standstill, so a reveal that ends late cannot turn this red; only a second move can. */
    let still = null;
    for (let i = 1, from = 0; i < samples.length && !still; i += 1) {
      if (Math.abs(samples[i].y - samples[from].y) > 0.5) from = i;
      else if (i - from >= 4 && samples[i].t - samples[from].t >= 300) still = samples[from];
    }
    row.scrollSettledMs = still ? Math.round(still.t - t0) : null;
    /* On a screen shorter than the night the page may move once more, from the moment the closing
       row starts to land and not a frame before, and must be at rest again in the last frames. */
    const until = size.short && mode === 'watch' ? t0 + hold * 1000 - 50 : Infinity;
    if (!still) fail(id, 'scroll', 'the page was never seen standing still');
    else {
      const ys = samples.filter(s => s.t >= still.t && s.t < until).map(s => s.y);
      if (ys.length && Math.max(...ys) - Math.min(...ys) > 1) fail(id, 'scroll', `the page stood still at ${Math.round(still.y)} from ${Math.round(still.t - t0)} ms and then moved between ${Math.round(Math.min(...ys))} and ${Math.round(Math.max(...ys))}${size.short ? ' before the closing row started to land' : ''}`);
      if (size.short) {
        const tail = samples.filter(s => s.t > last.t - 300).map(s => s.y);
        row.endingMovedPx = Math.round(last.y - still.y);
        if (Math.max(...tail) - Math.min(...tail) > 1) fail(id, 'scroll', `the page is still moving in the last 300 ms of the record (between ${Math.round(Math.min(...tail))} and ${Math.round(Math.max(...tail))})`);
      }
    }
    const wide = samples.find(s => s.sw > s.vw + 1);
    if (wide) fail(id, 'overflow', `a frame is ${wide.sw} wide in a ${wide.vw} viewport`);
    if (mode === 'watch') {
      /* 3. No spoiler before the closing row starts to land. */
      const early = samples.filter(s => s.stage === 'live' && s.t - t0 < hold * 1000 - 200);
      row.heldFrames = early.length;
      const leak = early.find(s => s.h2 > 0.05 || s.club > 0.05 || s.result > 0.05 || s.closing > 0.05);
      if (!early.length) fail(id, 'spoiler', 'no frame was recorded while the hold was on');
      else if (leak) fail(id, 'spoiler', `at ${Math.round(leak.t - t0)} ms of ${Math.round(hold * 1000)} the title is at ${leak.h2}, the club at ${leak.club}, the result at ${leak.result}, the closing row at ${leak.closing}`);
      /* The file under the stage reads as it did before the press: the age and rating after the minors are part of the ending. */
      const moved = early.find(s => s.file !== fileBefore);
      if (moved) fail(id, 'spoiler', `at ${Math.round(moved.t - t0)} ms of ${Math.round(hold * 1000)} the file reads "${moved.file}", and before the press it read "${fileBefore}"`);
      /* 4. The closing row is on screen at the frame it lands. */
      const landing = samples.find(s => s.closing > 0.9);
      if (!landing) fail(id, 'fold', 'the closing row never landed');
      else {
        row.landing = { ms: Math.round(landing.t - t0), top: Math.round(landing.top), bottom: Math.round(landing.bottom), vh: landing.vh };
        if (!size.short && (landing.top < -1 || landing.bottom > landing.vh + 1)) fail(id, 'fold', `the closing row landed at ${Math.round(landing.top)} to ${Math.round(landing.bottom)} in a ${landing.vh} high viewport`);
        if (size.short) {
          /* It starts to land below the fold there, and the page brings it in: wholly on screen a second later. */
          const shown = samples.find(s => s.t >= landing.t + 1000);
          row.shown = shown ? { ms: Math.round(shown.t - t0), top: Math.round(shown.top), bottom: Math.round(shown.bottom), vh: shown.vh } : null;
          if (!shown) fail(id, 'fold', 'no frame was recorded a second after the closing row landed');
          else if (shown.top < -1 || shown.bottom > shown.vh + 1) fail(id, 'fold', `a second after it landed the closing row sits at ${Math.round(shown.top)} to ${Math.round(shown.bottom)} in a ${shown.vh} high viewport (it landed at ${Math.round(landing.top)} to ${Math.round(landing.bottom)})`);
        }
      }
      if (last.stage !== 'landed') fail(id, 'last', `the night ended ${last.stage}, not landed`);
    }
    /* 7. Less motion: the first frame is the last frame. */
    const first = samples[0];
    if (mode === 'reduced' && (first.stage !== 'skipped' || first.rowsMin < 0.99 || first.h2 < 0.99 || first.club < 0.99 || first.result < 0.99)) fail(id, 'reduced', `with less motion the first frame is ${first.stage} with a row at ${first.rowsMin}, the title at ${first.h2}, the club at ${first.club}, the result at ${first.result}`);
    if (last.rowsMin < 0.99 || last.h2 < 0.99 || last.club < 0.99 || last.result < 0.99) fail(id, mode === 'reduced' ? 'reduced' : 'last', `the last frame has a row at ${last.rowsMin}, the title at ${last.h2}, the club at ${last.club}, the result at ${last.result}`);
    /* 4 again and 6: the last frame is on screen, uncovered, and it is the save. */
    const end = await page.evaluate(END);
    Object.assign(row, { rows: end.rows, tiles: end.tiles, closing: [Math.round(end.top), Math.round(end.bottom)] });
    if (end.top < -1 || end.bottom > end.vh + 1 || end.covered) fail(id, 'fold', `the closing row sits at ${Math.round(end.top)} to ${Math.round(end.bottom)} in a ${end.vh} high viewport${end.covered ? ', covered' : ''}`);
    /* Once the night is over the file has moved on to the numbers the career starts with. */
    if (!end.file.includes(`Age ${out.ageAfter}`) || !end.file.includes(`Rating${out.ratingAfter}`)) fail(id, 'last', `the file reads "${end.file}" at the end, and the career starts at age ${out.ageAfter}, rated ${out.ratingAfter}`);
    const built = M.buildCareerDraftNight(desc, done);
    if (JSON.stringify(end.kinds) !== JSON.stringify(built.board.map(r => r.kind))) fail(id, 'save', `the rows are ${end.kinds.join(', ')}, the builder made ${built.board.map(r => r.kind).join(', ')}`);
    if (end.rows + end.tiles > 12 || end.tiles !== (desc.lottery ? desc.lottery.drawn : 0)) fail(id, 'save', `${end.rows} rows and ${end.tiles} lottery tiles are on screen`);
    /* The whole row, word for word, from the SAVED outcome: the pick, the club, the round and the
       pick in that round. (Until the fix pass this only looked for "Pick N:" and the club, and a
       row that printed the overall pick as the pick in the round walked 40 nights green.) */
    const club = desc.teamLabel(out.team);
    const said = end.text.replace(/\s+/g, ' ').trim();
    const wantSaid = out.pick === null ? `The last pick is in. Your name was not called. Your first club: ${club}.` : `Pick ${out.pick}: ${club} Your name is called. Round ${out.round}, pick ${out.pickInRound}.`;
    if (said !== wantSaid) fail(id, 'save', `the closing row says "${said}", the save says "${wantSaid}"`);
    /* Each lottery tile is the engine's winner of that pick, with its seed and the way it moved
       worked out here from the order (seed 1 is the worst record, so a club that won a pick
       better than its record moved UP). */
    const order = M.preDraftOrder(desc, done.seed);
    const wantTiles = desc.lottery ? order.lotteryWinners.map((team, i) => {
      const slot = i + 1, seed = order.standings.indexOf(team) + 1;
      return [slot, (desc.teamShort ?? desc.teamLabel)(team), `Seed ${seed} · ${seed > slot ? `Up ${seed - slot}` : seed < slot ? `Down ${slot - seed}` : 'Held'}`].join(' | ');
    }) : [];
    if (JSON.stringify(end.tileWords) !== JSON.stringify(wantTiles)) fail(id, 'save', `the lottery tiles say ${JSON.stringify(end.tileWords)}, the order says ${JSON.stringify(wantTiles)}`);
    /* 9. The words on a lottery tile fit the tile, in the site's own typeface. */
    if (end.tiles) {
      /* Every seed line this era's lottery can print: any of its clubs can win any drawn pick. */
      const seeds = [];
      for (let seed = 1; seed <= desc.lottery.combos.length; seed += 1) for (let slot = 1; slot <= desc.lottery.drawn; slot += 1) seeds.push(`Seed ${seed} · ${seed > slot ? `Up ${seed - slot}` : seed < slot ? `Down ${slot - seed}` : 'Held'}`);
      const fit = await page.evaluate(FIT, { names: desc.teamIds().map(team => (desc.teamShort ?? desc.teamLabel)(team)), seeds });
      row.tileFit = { room: fit.room, widest: fit.widest, seedRoom: fit.seedRoom, widestSeed: fit.widestSeed, font: fit.font, inter, cut: fit.cut, clubs: fit.clubs, seeds: fit.seeds };
      if (!inter) fail(id, 'cut', `the site's typeface did not load (the tile is in ${fit.font}), so the fit of its words was not measured`);
      for (const c of fit.cut) fail(id, 'cut', `a lottery tile cuts "${c.text}": ${c.need} px of words in ${c.room} px`);
      for (const c of fit.clubs) fail(id, 'cut', `"${c.text}" would be cut on a lottery tile: ${c.need} px of words in ${c.room} px`);
      for (const c of fit.seeds) fail(id, 'cut', `"${c.text}" would be cut on a lottery tile: ${c.need} px of words in ${c.room} px`);
      if (size.width < 360) console.log(`  measured ${id}: a tile has ${fit.room} px for a club (widest "${fit.widest.text}", ${fit.widest.need} px) and ${fit.seedRoom} px for a seed line (widest "${fit.widestSeed.text}", ${fit.widestSeed.need} px)`);
    }
    const save = JSON.parse(await page.evaluate(k => localStorage.getItem(k), sport.saveKey));
    try { assert.deepEqual(save, JSON.parse(JSON.stringify({ c: null, phase: 'prospect', teamQuality: null, coach: null, prospect: { ...p, state: done } }))); } catch { fail(id, 'save', 'the save is not the engine state after the draft'); }
    if (startCareer) {
      await press('Start your career');
      await page.getByRole('button', { name: /^Play the \d+ season$/ }).waitFor();
      const c = JSON.parse(await page.evaluate(k => localStorage.getItem(k), sport.saveKey)).c;
      if (!c || c.team !== out.team || c.draftPick !== (out.pick ?? 0)) fail(id, 'save', `the career started at ${c && c.team} with pick ${c && c.draftPick}`);
    }
    if (pageErrors.length) fail(id, 'errors', pageErrors.join(' | '));
    console.log(`  walked ${id}: pick ${out.pick ?? 'none'}, ${end.rows} rows${end.tiles ? ` and ${end.tiles} lottery tiles` : ''}, card ${Math.round(cMax)} high, ${samples.length} frames`);
  } catch (error) {
    fail(id, 'walk', String(error.message).split('\n')[0]);
    await page.screenshot({ path: path.join(OUT, `${id}-failure.png`) }).catch(() => {});
  } finally { await context.close(); }
}

let browser;
let exitCode = 1;
try {
  browser = await chromium.launch({ headless: true });
  const cases = M.sports.map(sport => ({ sport, first: find(sport, 'first'), late: find(sport, 'late'), undrafted: find(sport, 'undrafted') }));
  /* A late pick is past round one, where the overall pick and the pick in the round differ: the
     closing row's check cannot tell them apart otherwise. */
  for (const c of cases) assert.notEqual(c.late.done.draft.pick, c.late.done.draft.pickInRound, `${c.sport.slug}: the late pick must be past round one`);
  if (CONTROL) {
    /* One case, the one the control's check is about. MLB's late pick is the tallest board, and
       the NBA's is the one with a lottery tile; the narrow tile is judged where it is narrow. */
    const [sportAt, sizeAt, modeAt] = { hidden: [1, SIZES[0], 'reduced'], cut: [1, SIZES[0], 'watch'], narrowtile: [1, NARROW[1], 'watch'], ending: [1, SHORT, 'watch'] }[CONTROL] ?? [2, SIZES[0], 'watch'];
    const c = cases[sportAt];
    await run(browser, c.sport, sizeAt, c.late, modeAt);
    const own = failures.filter(f => f.check === CONTROLS[CONTROL]);
    if (!own.length) { console.error(`Control ${CONTROL} changed nothing its check can see (${failures.map(f => f.check).join(', ') || 'no failure at all'}). Refusing to call that a result.`); exitCode = 2; }
    else console.log(`playDraftNight [control ${CONTROL}]: ${own.length} FAILURE(S) of its own check (${CONTROLS[CONTROL]}), as it must`);
  } else {
    for (const size of SIZES) for (const c of cases) {
      const shots = c.sport.slug === 'nba' || c.sport.slug === 'mlb';
      await run(browser, c.sport, size, c.first, 'watch', { startCareer: true, shots });
      await run(browser, c.sport, size, c.late, 'watch', { shots });
      await run(browser, c.sport, size, c.undrafted, 'watch', { shots: c.sport.slug === 'nba' });
      await run(browser, c.sport, size, c.late, 'skip', { shots: c.sport.slug === 'nfl' });
      await run(browser, c.sport, size, c.undrafted, 'reduced', { shots: c.sport.slug === 'nhl' });
    }
    /* The other era of each sport, a late pick on the phone. */
    for (const sport of M.sports) await run(browser, sport, SIZES[0], find(sport, 'late', THROWBACK[sport.slug]), 'watch', { shots: sport.slug === 'nba' });
    /* Narrower phones: the NBA's night, watched and skipped. */
    for (const size of NARROW) {
      await run(browser, cases[1].sport, size, cases[1].late, 'watch', { shots: true });
      await run(browser, cases[1].sport, size, cases[1].late, 'skip');
    }
    /* A phone on its side: the NBA's night, watched. */
    await run(browser, cases[1].sport, SHORT, cases[1].late, 'watch', { shots: true });
    fs.writeFileSync(path.join(OUT, 'play-draft-night.json'), JSON.stringify({ results, failures }, null, 2));
    console.log(`\nplayDraftNight: ${failures.length === 0 ? `ALL GREEN, ${results.length} nights walked` : `${failures.length} FAILURE(S) in ${results.length} nights`}`);
    exitCode = failures.length === 0 ? 0 : 1;
  }
} catch (error) {
  console.error(`playDraftNight could not run: ${error.stack || error}`);
  exitCode = 2;
} finally {
  await browser?.close();
  if (server.exitCode === null && !server.killed) server.kill();
}
process.exit(exitCode);
