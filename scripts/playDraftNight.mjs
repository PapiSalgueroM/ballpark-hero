/* Round 1220: draft night in the four US My Careers, walked in a real browser.
 *
 * WHAT THIS HOLDS, measured and never eyeballed, at 390 by 844 (touch) and
 * 1280 by 800, on /nfl-my-career, /nba-my-career, /mlb-my-career and
 * /nhl-my-career, for three prospects the bundled engine built for each sport
 * (a first round pick, which for the NBA is a lottery pick; a late pick; an
 * undrafted one), watched, skipped and with less motion:
 *   1. The range the card prints before the press is the engine's own line.
 *   2. NOTHING JUMPS. From the frame the night is on screen to the last one,
 *      the card and the journey keep their height, and once the press's own
 *      reveal has settled the page does not scroll again. No frame overflows
 *      sideways.                                            Control `late`.
 *   3. NO SPOILER. Until the closing row starts to land, the title, the club
 *      line, the result block and the closing row itself are at opacity 0.
 *      The opacity is read on the elements that carry the hold (it is not
 *      inherited, so a child of a held parent reports 1).   Control `spoiler`.
 *   4. YOU SEE YOUR NAME CALLED. At the frame the closing row lands it is
 *      wholly inside the viewport, with no scroll from the driver, and
 *      nothing is drawn over it.                              Control `fold`.
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
 *   9. THE WORDS ON A LOTTERY TILE FIT THE TILE. Both lines of every tile on
 *      screen, and then every other club of the era in the first tile's own
 *      label box, measured in the site's own typeface (it is let through
 *      from Google Fonts; if it does not load the check fails rather than
 *      measure a fallback).                                  Control `cut`.
 * The live database host is aborted in every context. No page error.
 *
 * Needs dist/ (npm run build). It serves it itself through
 * scripts/lib/hostLikeServer.mjs. ENGINES=chromium is the only engine.
 *
 * Run:      node scripts/playDraftNight.mjs
 * Control:  PLAY_DRAFT_NIGHT_CONTROL=<late|spoiler|fold|hidden|cut> node scripts/playDraftNight.mjs
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
const CONTROLS = { late: 'height', spoiler: 'spoiler', fold: 'fold', hidden: 'reduced', cut: 'cut' };
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
function atDraft(sport, seedId, rating) {
  const pos = sport.create.defaultPos;
  const made = M.createUsCareerProspect(sport, { name: 'Night Prospect', pos, archetypeId: sport.create.archetypes[pos][0].id, eraId: 'now', appearance: M.defaultAppearance(), seed: `${sport.slug}:${seedId}` });
  const p = rating ? { ...made, rating, pot: Math.max(made.pot, rating) } : made;
  const desc = sport.preDraft(p.eraId);
  let state = M.preDraftStart(desc, { ...p, routeId: desc.routes[0].id });
  for (let n = 0; n < 12 && state.phase !== 'showcase'; n += 1) state = state.phase === 'season' ? M.preDraftPlaySeason(desc, state) : M.preDraftChoose(desc, state, 0);
  return { ...p, state: M.preDraftShowcase(desc, state, 'steady') };
}
/** The first seed whose real draft ends the way this case needs. */
function find(sport, kind) {
  const desc = sport.preDraft('now');
  const teams = desc.teamIds().length, total = teams * desc.rounds;
  const wants = {
    first: out => out.pick !== null && out.pick <= (desc.lottery ? desc.lottery.drawn : teams),
    late: out => out.pick !== null && out.pick > total / 2,
    undrafted: out => out.pick === null,
  }[kind];
  const ratings = { first: [96, 92, 88], late: [undefined, 62, 58, 66], undrafted: [40, 45] }[kind];
  for (const rating of ratings) for (let n = 0; n < 300; n += 1) {
    const p = atDraft(sport, `${kind}-${n}`, rating);
    const done = M.preDraftRunDraft(desc, p.state);
    if (wants(done.draft)) return { p, done, desc, kind };
  }
  throw new Error(`no ${kind} prospect found for ${sport.slug}`);
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

const SIZES = [{ width: 390, height: 844, touch: true }, { width: 1280, height: 800, touch: false }];const results = [];
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
  spoiler: '[data-night-hold] h2, [data-night-hold] p, [data-night-held], [data-testid="draft-result"] { animation: none !important; opacity: 1 !important; }',
  /* A row left invisible for somebody who asked for less motion. */
  hidden: '[data-night-row] { opacity: 0 !important; }',
  /* A lottery tile with less room for its words than the words need. */
  cut: '[data-lottery-face] > span:last-child { max-width: 44px; }',
};
const CONTROL_INIT = {
  /* The press reveals nothing: the board stays wherever the page happened to be. */
  fold: () => { Element.prototype.scrollIntoView = function () {}; },
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
      vh: window.innerHeight, sw: document.documentElement.scrollWidth, vw: document.documentElement.clientWidth });
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
   screen, then every other club of this era in the first tile's own label box and typeface. */
const FIT = names => {
  const lines = [...document.querySelectorAll('[data-lottery-face] > span:last-child > span')];
  const need = el => { const r = document.createRange(); r.selectNodeContents(el); return Math.round(r.getBoundingClientRect().width * 10) / 10; };
  const cut = lines.filter(el => el.scrollWidth > el.clientWidth).map(el => ({ text: el.textContent, need: need(el), room: el.clientWidth }));
  const el = lines[0], keep = el.textContent, clubs = [];
  let widest = { text: '', need: 0 };
  for (const text of names) {
    el.textContent = text;
    const w = need(el);
    if (w > widest.need) widest = { text, need: w };
    if (el.scrollWidth > el.clientWidth) clubs.push({ text, need: w, room: el.clientWidth });
  }
  el.textContent = keep;
  return { cut, clubs, room: el.clientWidth, widest, font: getComputedStyle(el).fontFamily.split(',')[0] };
};
const CARD = () => ({ y: window.scrollY, card: document.querySelector('[data-testid="draft-showcase"]').getBoundingClientRect().height, stage: document.querySelector('[data-career-night]').dataset.nightStage });
const END = () => {
  const night = document.querySelector('[data-career-night]');
  const closing = night.querySelector("[data-night-row='you'], [data-night-row='unpicked']");
  const r = closing.getBoundingClientRect();
  const at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
  return { text: closing.innerText, top: r.top, bottom: r.bottom, vh: window.innerHeight, covered: !(at && closing.contains(at)),
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
  const { p, done, desc, kind } = found;
  const id = `${sport.slug}-${size.width}-${kind}-${mode}`;
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
    await page.evaluate(RECORD);
    await press('Draft day');
    await page.locator('[data-prospect-phase="done"]').waitFor();
    await page.locator('[data-career-night]').waitFor({ timeout: 3000 });
    const hold = mode === 'reduced' ? 0 : parseFloat(await page.locator('[data-prospect-journey]').evaluate(el => el.style.getPropertyValue('--night-hold')) || '0');
    row.closeAtS = hold;
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
      await press('Skip to my pick');
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
    const ys = samples.filter(s => s.t - t0 > 1500).map(s => s.y);
    if (ys.length && Math.max(...ys) - Math.min(...ys) > 1) fail(id, 'scroll', `the page scrolled from ${Math.min(...ys)} to ${Math.max(...ys)} after the reveal had settled`);
    const wide = samples.find(s => s.sw > s.vw + 1);
    if (wide) fail(id, 'overflow', `a frame is ${wide.sw} wide in a ${wide.vw} viewport`);
    if (mode === 'watch') {
      /* 3. No spoiler before the closing row starts to land. */
      const early = samples.filter(s => s.stage === 'live' && s.t - t0 < hold * 1000 - 200);
      row.heldFrames = early.length;
      const leak = early.find(s => s.h2 > 0.05 || s.club > 0.05 || s.result > 0.05 || s.closing > 0.05);
      if (!early.length) fail(id, 'spoiler', 'no frame was recorded while the hold was on');
      else if (leak) fail(id, 'spoiler', `at ${Math.round(leak.t - t0)} ms of ${Math.round(hold * 1000)} the title is at ${leak.h2}, the club at ${leak.club}, the result at ${leak.result}, the closing row at ${leak.closing}`);
      /* 4. The closing row is on screen at the frame it lands. */
      const landing = samples.find(s => s.closing > 0.9);
      if (!landing) fail(id, 'fold', 'the closing row never landed');
      else {
        row.landing = { ms: Math.round(landing.t - t0), top: Math.round(landing.top), bottom: Math.round(landing.bottom), vh: landing.vh };
        if (landing.top < -1 || landing.bottom > landing.vh + 1) fail(id, 'fold', `the closing row landed at ${Math.round(landing.top)} to ${Math.round(landing.bottom)} in a ${landing.vh} high viewport`);
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
      const fit = await page.evaluate(FIT, desc.teamIds().map(team => (desc.teamShort ?? desc.teamLabel)(team)));
      row.tileFit = { room: fit.room, widest: fit.widest, font: fit.font, inter, cut: fit.cut, clubs: fit.clubs };
      if (!inter) fail(id, 'cut', `the site's typeface did not load (the tile is in ${fit.font}), so the fit of its words was not measured`);
      for (const c of fit.cut) fail(id, 'cut', `a lottery tile cuts "${c.text}": ${c.need} px of words in ${c.room} px`);
      for (const c of fit.clubs) fail(id, 'cut', `"${c.text}" would be cut on a lottery tile: ${c.need} px of words in ${c.room} px`);
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
       the NBA's is the one with a lottery tile. */
    const c = cases[CONTROL === 'hidden' || CONTROL === 'cut' ? 1 : 2];
    await run(browser, c.sport, SIZES[0], c.late, CONTROL === 'hidden' ? 'reduced' : 'watch');
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
