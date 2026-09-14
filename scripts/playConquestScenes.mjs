/**
 * Round 529 harness: a Conquest round plays out on the map, in a real browser,
 * at phone widths.
 *
 * scripts/simConquestScenes.mjs proves the scene list, the scores, the
 * takeovers and the record book against the engine, and renders every new
 * component through react-dom/server. What no server render can prove is the
 * SCREEN: that the map is the stage on a phone, that pressing Play starts the
 * scenes and the score lands only after its card, that Skip ends the round,
 * that the timeline scrubs the map back to Start and returns on release, that
 * the page never moves while a scene plays (the no scroll rule), that every
 * button clears the sweep's 30px floor, and that the season ends on the
 * Conquest Complete banner with the crown. This walks it, on /conquest and
 * /soccer-conquest, at 390 and 430 wide, through the game's own buttons, in
 * Free Play so no daily record is touched.
 *
 * Sections, per route and width:
 *   1. The imperialism help opens before the first run and closes on its
 *      button; Free Play and a team tile reach the stage.
 *   2. The stage: the map svg is at least 60 percent of the viewport width
 *      tall and runs edge to edge; the standings strip and the timeline are
 *      under it; every visible button in main is 30px or taller.
 *   3. Play starts the scenes: a matchup card mounts with no score element,
 *      the score element mounts only later (never before a card), and the
 *      step holds its place on the page from the first scene to the recap.
 *   4. Skip ends the round: the recap card replaces the player, at the same
 *      place in the document the player held, so nothing grew or vanished
 *      above the step.
 *   5. The timeline: dragging the thumb to the left end shows Start (the
 *      label, and one empire per home ring on the map); releasing returns
 *      the map to now and the label goes. The input is scrolled under the
 *      mouse and proved reachable first, because page.mouse works in
 *      viewport coordinates.
 *   6. The season ends on the banner: rounds are played through Skip and
 *      Continue until data-conquest-complete mounts, with the crown, four
 *      record rows, and the map under one ruler. No console errors.
 *
 * Negative control, judged on its own:
 *   CONQUEST_SCENES_CONTROL=noscore
 * rewrites the served JS so the score element's attribute is renamed. The
 * needle is asserted present in a built asset AND in the served bytes before
 * a browser is launched, and the run refuses to start otherwise. With the
 * control on, "a score landed during the round" must go red on every run and
 * nothing else may, and the harness exits 0 only in that shape.
 *
 * Data attributes this reads (all in src/components/conquest):
 *   data-imperialism-help, data-conquest-stage, svg[data-map],
 *   data-conquest-status, data-standings, input[data-timeline],
 *   data-conquest-scrub-label,
 *   [data-layer="home"], path[data-layer="fill"][data-owner],
 *   data-conquest-pick, data-conquest-play, data-scene-player,
 *   data-scene-card, data-scene-score, data-scene-skip, data-conquest-recap,
 *   data-conquest-continue, data-conquest-complete, data-crown, data-record.
 *
 * Run: ENGINES=chromium node scripts/playConquestScenes.mjs
 * (dist must already be built unless SWEEP_BASE points at a served build.
 * CONQUEST_SCENES_PORT moves the server, ROUTES=/conquest narrows the walk,
 * WIDTHS=390 narrows the widths, VERBOSE=1 narrates every press.)
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import pw from './lib/playwrightLoader.mjs';

const { chromium } = pw;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const PORT = Number(process.env.CONQUEST_SCENES_PORT || 4496);
const SUPPLIED_BASE = process.env.SWEEP_BASE || '';
const BASE = SUPPLIED_BASE || `http://127.0.0.1:${PORT}`;
const CONTROL = process.env.CONQUEST_SCENES_CONTROL || '';
const V = !!process.env.VERBOSE;
const ROUTES = (process.env.ROUTES || '/conquest,/soccer-conquest').split(',').map(s => s.trim()).filter(Boolean);
const WIDTHS = (process.env.WIDTHS || '390,430').split(',').map(Number).filter(Boolean);
/* A season is regularRounds + 3. Measured on the built site in Round 564:
   /conquest takes 21 rounds and /soccer-conquest takes 13, so 40 is roughly
   double the longest season here and nothing in section 6 is budget bound. */
const MAX_ROUNDS = 40;

/* The attribute the control renames, and what it becomes. */
const SCORE_ATTR = 'data-scene-score';
const CONTROL_ATTR = 'data-scene-nope';
/* The only checks the control may turn red. */
const CONTROL_TARGETS = ['3. a score landed during the round'];

if (CONTROL && CONTROL !== 'noscore') {
  console.error(`CONQUEST_SCENES_CONTROL=${CONTROL} is not a control this harness knows (noscore)`);
  process.exit(1);
}

const failed = [];
let checksRun = 0;
const say = m => { if (V) console.log('      ' + m); };
function check(name, ok, detail) {
  checksRun += 1;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `: ${detail}` : ''}`);
  if (!ok) failed.push(name);
}

/* ---------------------------------------------------------------- */
/* The server, and the control's own assertion before anything runs  */
/* ---------------------------------------------------------------- */

let server = null;
if (!SUPPLIED_BASE) {
  if (!fs.existsSync(path.join(DIST, 'index.html'))) {
    console.error('playConquestScenes: dist/ is not built, so there is nothing to serve. Run npm run build first, or point SWEEP_BASE at a served build.');
    process.exit(1);
  }
  server = spawn(process.execPath, [path.join(ROOT, 'scripts/lib/hostLikeServer.mjs'), DIST, String(PORT)], { stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 1200));
}
function stop(code) {
  if (server) server.kill();
  process.exit(code);
}

let controlSwaps = 0;
if (CONTROL === 'noscore') {
  /* Assert old in src before the edit, or refuse to run: against the built
     asset on disk when dist is here, and against the served bytes either way. */
  let candidate = null;
  if (fs.existsSync(path.join(DIST, 'assets'))) {
    for (const f of fs.readdirSync(path.join(DIST, 'assets'))) {
      if (!f.endsWith('.js')) continue;
      let src = '';
      try { src = fs.readFileSync(path.join(DIST, 'assets', f), 'utf8'); } catch { continue; }
      if (src.includes(SCORE_ATTR)) { candidate = f; break; }
    }
    if (!candidate) {
      console.error(`playConquestScenes control: RED before it started. No built asset contains "${SCORE_ATTR}", so the swap would change nothing and a green run would prove nothing.`);
      stop(1);
    }
    let served = '';
    try { served = await (await fetch(`${BASE}/assets/${candidate}`)).text(); } catch (e) {
      console.error(`playConquestScenes control: could not fetch /assets/${candidate} (${String(e).slice(0, 120)})`);
      stop(1);
    }
    if (!served.includes(SCORE_ATTR)) {
      console.error(`playConquestScenes control: RED before it started. /assets/${candidate} carries "${SCORE_ATTR}" on disk but the server did not hand it back.`);
      stop(1);
    }
    console.log(`  control  "${SCORE_ATTR}" confirmed in the served /assets/${candidate}`);
  } else {
    console.log(`  control  no dist here; the swap is confirmed on the served bytes as they pass`);
  }
}

/* ---------------------------------------------------------------- */
/* The browser                                                       */
/* ---------------------------------------------------------------- */

const browser = await chromium.launch({ args: ['--no-sandbox', '--no-proxy-server'] });
const errors = [];
const watch = p => {
  p.on('pageerror', e => errors.push(String(e).split('\n')[0].slice(0, 160)));
  p.on('console', m => {
    const t = m.text();
    if (m.type() === 'error' && !/ERR_CERT|ERR_QUIC|ERR_NAME|Failed to load resource|blocked by CORS policy|Access-Control-Allow-Origin|net::ERR_FAILED/i.test(t)) {
      errors.push(t.slice(0, 160));
    }
  });
};

const HOME_CIRCLE = 'circle[data-layer="home"]';
const FILL = 'path[data-layer="fill"]';

/** Distinct owners painted on the map right now. */
const paintedOwners = page => page.evaluate(sel => {
  const set = new Set();
  for (const p of document.querySelectorAll(sel)) { const o = p.getAttribute('data-owner'); if (o) set.add(o); }
  return set.size;
}, FILL);

/** Every empire painted on the map right now, biggest first. */
const empires = page => page.evaluate(sel => {
  const n = {};
  for (const p of document.querySelectorAll(sel)) { const o = p.getAttribute('data-owner'); if (o) n[o] = (n[o] || 0) + 1; }
  return Object.entries(n).map(([id, count]) => ({ id, count })).sort((a, b) => b.count - a.count);
}, FILL);

/** The round line, and whether it still reads "<noun> N of M" rather than a playoff label. */
const roundLine = page => page.evaluate(() => {
  const el = document.querySelector('[data-conquest-status]');
  const text = el ? (el.textContent || '').replace(/\s+/g, ' ').trim() : '';
  return { text, regular: /\bof\s+\d+$/.test((text.split('\u00b7')[0] || '').trim()) };
});

/** Every visible button inside main shorter than 30px, by its text. */
const shortButtons = page => page.evaluate(() => {
  const out = [];
  for (const b of document.querySelectorAll('main button')) {
    const r = b.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (r.height < 30) out.push(`${(b.textContent || b.getAttribute('aria-label') || '?').replace(/\s+/g, ' ').trim().slice(0, 30)} ${Math.round(r.height)}px`);
  }
  return out;
});

/**
 * Put a control under the mouse and report whether it is really there.
 *
 * Round 564: page.mouse works in VIEWPORT coordinates and boundingBox() hands
 * back a viewport rectangle that is happily negative for anything above the
 * fold, so a box read without scrolling first can send every press to nothing
 * at all. Playwright's own click() scrolls for you, but it does it INSIDE the
 * press, which is worse here: it moves the page in the middle of a window this
 * harness is measuring for movement. Measured on /soccer-conquest at 390, three
 * runs in eight: one scroll event, window.scrollY 938 to 276, recorded with the
 * scene player still mounted and no recap in the document, so the page had not
 * changed and the press had not landed. So: scroll on purpose, out in the open,
 * then assert the control is reachable, then drive the mouse ourselves.
 */
async function bringIntoReach(page, locator) {
  await locator.scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(200);
  const box = await locator.boundingBox().catch(() => null);
  if (!box) return { box: null, ok: false, why: 'no box at all' };
  const seen = await locator.evaluate(el => {
    const r = el.getBoundingClientRect();
    const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return {
      inView: r.top >= 0 && r.bottom <= window.innerHeight,
      onTop: !!hit && (el === hit || el.contains(hit)),
      top: Math.round(r.top), bottom: Math.round(r.bottom), vh: window.innerHeight,
    };
  });
  return {
    box,
    ok: seen.inView && seen.onTop,
    why: `y ${seen.top} to ${seen.bottom} in a ${seen.vh} tall viewport, ${seen.onTop ? 'it answers elementFromPoint' : 'SOMETHING ELSE answers elementFromPoint'}`,
  };
}

async function clearRoom(page) {
  await page.getByRole('button', { name: /^essential only$/i }).first().click({ timeout: 1500 }).catch(() => {});
}

async function walk(route, width) {
  const tag = `${route} @${width}`;
  console.log(`\n=== ${tag} ===`);
  const ctx = await browser.newContext({ viewport: { width, height: 844 }, ignoreHTTPSErrors: true });
  if (CONTROL === 'noscore') {
    await ctx.route('**/*.js', async r => {
      const res = await r.fetch();
      let body = await res.text();
      if (body.includes(SCORE_ATTR)) { body = body.split(SCORE_ATTR).join(CONTROL_ATTR); controlSwaps += 1; }
      await r.fulfill({ response: res, body });
    });
  }
  const page = await ctx.newPage();
  watch(page);
  const bail = why => { console.log(`  BLOCKED  ${why}`); failed.push(`${tag}: blocked, ${why}`); };

  /* ---- 1) the help, Free Play, a team ---- */
  console.log('1) The help opens before the first run, then Free Play and a team reach the stage');
  await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForLoadState('networkidle', { timeout: 9000 }).catch(() => {});
  await clearRoom(page);
  if (route === '/conquest' || route === '/conquest-nba') {
    const mode = page.locator('button').filter({ hasText: /The format the internet knows/ }).first();
    await mode.waitFor({ timeout: 9000 }).catch(() => {});
    await mode.click({ timeout: 5000 }).catch(() => {});
    say('chose Imperialism');
  }
  const help = page.locator('[data-imperialism-help]').first();
  const helpOpened = await help.waitFor({ timeout: 6000 }).then(() => true).catch(() => false);
  check(`1. the imperialism help opened before the first run (${tag})`, helpOpened);
  if (helpOpened) {
    await page.getByRole('button', { name: /^Got it/ }).first().click({ timeout: 4000 }).catch(() => page.keyboard.press('Escape'));
    await page.waitForTimeout(400);
    const stillOpen = await help.count().catch(() => 0);
    check(`1. the help closes on its button (${tag})`, stillOpen === 0);
  }
  const free = page.getByRole('button', { name: /^Free Play$/ }).first();
  await free.waitFor({ timeout: 6000 }).catch(() => {});
  await free.click({ timeout: 4000 }).catch(() => {});
  say('chose Free Play');
  const tile = page.locator('div.grid > button').first();
  await tile.waitFor({ timeout: 6000 }).catch(() => {});
  await tile.click({ timeout: 4000 }).catch(() => {});
  const stage = page.locator('[data-conquest-stage]').first();
  const staged = await stage.waitFor({ timeout: 8000 }).then(() => true).catch(() => false);
  check(`1. a team tile reaches the stage (${tag})`, staged);
  if (!staged) { bail('the stage never mounted'); await ctx.close(); return; }

  /* ---- 2) the stage ---- */
  console.log('2) The map is the stage, the strip and the timeline sit under it, every button clears 30px');
  await page.waitForTimeout(500);
  const svg = page.locator('svg[data-map="conquest-region-map"]').first();
  const box = await svg.boundingBox();
  const stageBox = await stage.boundingBox();
  check(`2. the map is at least 60 percent of the viewport width tall (${tag})`, !!box && box.height >= width * 0.6, box ? `${Math.round(box.height)}px of ${width}` : 'no map');
  check(`2. the stage runs edge to edge (${tag})`, !!stageBox && stageBox.width >= width - 2, stageBox ? `${Math.round(stageBox.width)}px wide` : 'no stage');
  const stripBox = await page.locator('[data-standings]').first().boundingBox();
  const lineBox = await page.locator('input[data-timeline]').first().boundingBox();
  check(`2. the standings strip and the timeline sit under the map (${tag})`, !!box && !!stripBox && !!lineBox && stripBox.y >= box.y + box.height - 1 && lineBox.y >= stripBox.y + stripBox.height - 1);
  const homes = await page.locator(HOME_CIRCLE).count();
  check(`2. the home rings are on the map (${tag})`, homes > 0, `${homes} rings`);
  const shortAtStart = await shortButtons(page);
  check(`2. every visible button is 30px or taller on the pick and call screen (${tag})`, shortAtStart.length === 0, shortAtStart.slice(0, 4).join(', ') || 'none short');

  /* ---- 3 and 4) Play starts the scenes, Skip ends the round ---- */
  console.log('3) Play starts the scenes: the card first, the score only after it, and the page does not move');
  const pick = page.locator('[data-conquest-pick]').first();
  await pick.click({ timeout: 4000 }).catch(() => {});
  const playBtn = page.locator('[data-conquest-play]').first();
  await playBtn.click({ timeout: 4000 }).catch(() => {});
  say('pressed Play');
  /* The reveal ref may move the page once, at Play. From here on it must not. */
  await page.waitForTimeout(700);
  /* Round 564: where the step sits in the DOCUMENT is the signal, not
     window.scrollY. The two come apart the moment the game inserts anything
     above the step: the browser then moves scrollY on purpose to hold the step
     still, and a scrollY check reads that compensation as a jump. Document
     coordinates say the thing the rule is actually about, that nothing grew or
     vanished above the step, and they have the second virtue of being immune
     to anything the harness's own presses do to the scroll position. See
     section 4. */
  const boxOf = sel => page.evaluate(s => {
    const el = document.querySelector(s);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { vp: Math.round(r.top), doc: Math.round(r.top + window.scrollY) };
  }, sel);
  const scrollAtStart = await page.evaluate(() => window.scrollY);
  const stepAtStart = await boxOf('[data-scene-player]');
  let firstCardAt = -1, firstScoreAt = -1, scoreBeforeCard = false, scrollMoves = 0, stepMoves = 0, wheelSeen = false, samples = 0;
  const t0 = Date.now();
  while (Date.now() - t0 < 14000) {
    samples += 1;
    const s = await page.evaluate(() => {
      const el = document.querySelector('[data-scene-player]');
      return {
        card: !!document.querySelector('[data-scene-card]'),
        score: !!document.querySelector('[data-scene-score]'),
        wheel: !!document.querySelector('[data-wheel]'),
        recap: !!document.querySelector('[data-conquest-recap]'),
        y: window.scrollY,
        step: el ? Math.round(el.getBoundingClientRect().top + window.scrollY) : null,
      };
    });
    if (s.y !== scrollAtStart) scrollMoves += 1;
    if (s.step !== null && stepAtStart && Math.abs(s.step - stepAtStart.doc) > 2) stepMoves += 1;
    if (s.wheel) wheelSeen = true;
    if (s.card && firstCardAt < 0) firstCardAt = Date.now() - t0;
    if (s.score && firstScoreAt < 0) { firstScoreAt = Date.now() - t0; if (!s.card || firstCardAt < 0) scoreBeforeCard = true; }
    if (s.recap) break;
    if (firstScoreAt >= 0 && Date.now() - t0 - firstScoreAt > 1200) break;
    await page.waitForTimeout(120);
  }
  check(`3. Play mounted a matchup card (${tag})`, firstCardAt >= 0, firstCardAt >= 0 ? `after ${firstCardAt}ms` : 'never');
  check(`3. a score landed during the round`, firstScoreAt >= 0, firstScoreAt >= 0 ? `after ${firstScoreAt}ms (${tag})` : `never (${tag})`);
  check(`3. no score before its card (${tag})`, !scoreBeforeCard && (firstScoreAt < 0 || firstScoreAt > firstCardAt), `card ${firstCardAt}ms, score ${firstScoreAt}ms`);
  check(`3. the page did not move during the scenes (${tag})`, scrollMoves === 0, `${samples} samples, ${scrollMoves} moved from y=${scrollAtStart}${wheelSeen ? ', the wheel was seen' : ''}`);
  check(`3. the scene player held its place on the page (${tag})`, stepMoves === 0 && !!stepAtStart, `${samples} samples, ${stepMoves} moved from document y=${stepAtStart ? stepAtStart.doc : 'no player'}`);
  const shortInScene = await shortButtons(page);
  check(`3. every visible button is 30px or taller while a scene plays (${tag})`, shortInScene.length === 0, shortInScene.slice(0, 4).join(', ') || 'none short');

  console.log('4) Skip ends the round');
  const skip = page.locator('[data-scene-skip]').first();
  const hadSkip = await skip.count().catch(() => 0) > 0;
  /* Scroll Skip under the mouse OUT IN THE OPEN and take the baseline after
     that, so the only thing that can move the page between here and the recap
     is the page itself. */
  const skipReach = hadSkip ? await bringIntoReach(page, skip) : { box: null, ok: false, why: 'no Skip button' };
  check(`4. the Skip button is in the viewport and under the mouse (${tag})`, skipReach.ok, skipReach.why);
  const stepBeforeSkip = await boxOf('[data-scene-player]');
  const scrollBeforeSkip = await page.evaluate(() => window.scrollY);
  /* Playwright's click, not a raw mouse press: the Skip button is inside the
     card and the card resizes between beats, so the button really does move.
     Measured over six seconds of scenes on /soccer-conquest at 430 it sat at
     three different heights, 353, 409 and 443, and moved six times. A raw press
     at a box read a moment earlier misses it. Its actionability scroll cannot
     spoil the measurement any more, because the measurement is in document
     coordinates. */
  if (hadSkip) await skip.click({ timeout: 4000 }).catch(() => {});
  const recap = page.locator('[data-conquest-recap]').first();
  const recapUp = await recap.waitFor({ timeout: 6000 }).then(() => true).catch(() => false);
  const playerGone = await page.locator('[data-scene-player]').count().catch(() => 1) === 0;
  await page.waitForTimeout(300);
  const stepAtRecap = await boxOf('[data-conquest-recap]');
  const scrollAtRecap = await page.evaluate(() => window.scrollY);
  check(`4. Skip ends the round on the recap card with the player gone (${tag})`, hadSkip && recapUp && playerGone, `${hadSkip ? 'skip pressed' : 'NO SKIP BUTTON'}, recap ${recapUp ? 'up' : 'missing'}, player ${playerGone ? 'gone' : 'still up'}`);
  /* Round 564: this used to compare window.scrollY, and that was the wrong
     instrument in both directions. It called a jump on a transition where
     nothing on screen moved: the wiped-out line used to be inserted above the
     step the moment the scenes ended, and the browser moved scrollY by exactly
     that much to hold the step still. Measured on the built site at 430: the
     player sat at viewport y=12, the recap mounted at viewport y=12, every box
     above kept its document position (status 197, stage 226, standings 513,
     timeline 750), and scrollY went 838 to 916, which is the 66px line plus
     the 12px gap. And at 390 it passed a transition where the step really did
     drop 95px down the screen, because there the browser did not compensate
     and scrollY never moved at all. Same bug, opposite reading. The line moved
     below the step in this round so neither happens now, and what is measured
     is where the step sits in the DOCUMENT, with the 2px of subpixel slack
     useRevealScroll allows itself. Document coordinates also settle the other
     half of it: the harness's own press machinery scrolls, and three runs in
     eight recorded one scroll event with the scene player still mounted and no
     recap in the document, so the page had moved before the press had landed.
     Nothing a press does to the scroll position can move a document
     coordinate. */
  check(`4. the recap did not move the page (${tag})`, !!stepBeforeSkip && !!stepAtRecap && Math.abs(stepAtRecap.doc - stepBeforeSkip.doc) <= 2, stepBeforeSkip && stepAtRecap
    ? `the step sat at document y=${stepBeforeSkip.doc} and the recap mounted at y=${stepAtRecap.doc}; on screen ${stepBeforeSkip.vp} then ${stepAtRecap.vp}, window.scrollY ${scrollBeforeSkip} then ${scrollAtRecap}`
    : `${stepBeforeSkip ? '' : 'no scene player before the press; '}${stepAtRecap ? '' : 'no recap after it'}`);
  const lines = await page.locator('[data-recap-line]').count();
  check(`4. the recap lists the round's games (${tag})`, lines > 0, `${lines} lines`);

  /* Round 564: the map at the recap the playoff was seeded from. The engine
     seeds the bracket with the eight biggest empires the moment the last
     regular round settles, so the first recap whose round line is a playoff
     label rather than "<noun> N of M" is the one holding those eight. */
  let seedStand = null;
  const noteSeeding = async () => {
    if (seedStand) return;
    const line = await roundLine(page);
    if (line.regular) return;
    seedStand = { counts: await empires(page), label: (line.text.split('\u00b7')[0] || '').trim() };
  };
  await noteSeeding();

  /* ---- 5) the timeline ---- */
  console.log('5) The timeline scrubs the map back to Start and returns on release');
  const slider = page.locator('input[data-timeline]').first();
  /* Round 564: the very first run of this harness measured this input at y=-75
     in an 844 tall viewport, because section 4 leaves the page down at the
     recap, so document.elementFromPoint at its centre was null and every press
     and move landed on nothing at all. The three checks under it then read a
     live map that had never been touched, and two of them went red for a
     reason that was not the site. bringIntoReach is the guard, and it is
     asserted rather than assumed: a harness that measures nothing has to go
     red, not green. */
  const reach = await bringIntoReach(page, slider);
  const sb = reach.box;
  const reachable = reach.ok;
  check(`5. the timeline is in the viewport and under the mouse before the drag (${tag})`, reachable, reach.why);
  const liveOwners = await paintedOwners(page);
  let scrubbedLabel = '', scrubbedOwners = -1, labelGone = false, backOwners = -1, valueBack = false;
  let endValue = '', heldValue = '';
  if (reachable) {
    endValue = await slider.evaluate(el => String(el.value));
    const y = sb.y + sb.height / 2;
    await page.mouse.move(sb.x + sb.width - 8, y);
    await page.mouse.down();
    for (let i = 1; i <= 8; i++) {
      await page.mouse.move(sb.x + sb.width - 8 - ((sb.width - 16) * i) / 8, y);
      await page.waitForTimeout(40);
    }
    await page.mouse.move(sb.x + 2, y);
    await page.waitForTimeout(250);
    heldValue = await slider.evaluate(el => String(el.value));
    scrubbedLabel = (await page.locator('[data-conquest-scrub-label]').first().textContent().catch(() => '')) || '';
    scrubbedOwners = await paintedOwners(page);
    await page.mouse.up();
    await page.waitForTimeout(300);
    labelGone = await page.locator('[data-conquest-scrub-label]').count() === 0;
    backOwners = await paintedOwners(page);
    valueBack = await slider.evaluate(el => el.value === el.max);
  }
  /* If a real drag on a reachable input still does not move the value, the
     control is broken and the two checks under this are worthless, so say so
     on its own line rather than letting it read as a map problem. */
  check(`5. the drag moved the thumb off the end (${tag})`, reachable && heldValue === '0', `held at "${heldValue}", the end was "${endValue}"`);
  check(`5. dragging the thumb to the left end shows Start (${tag})`, scrubbedLabel.trim() === 'Start', `label "${scrubbedLabel.trim()}"`);
  check(`5. the Start map paints one empire per home ring (${tag})`, scrubbedOwners === homes && scrubbedOwners >= liveOwners, `${scrubbedOwners} owners at Start, ${homes} rings, ${liveOwners} live`);
  check(`5. release returns the map to now (${tag})`, labelGone && backOwners === liveOwners && valueBack, `label ${labelGone ? 'gone' : 'still up'}, ${backOwners} owners against ${liveOwners} live, thumb ${valueBack ? 'back at the end' : 'NOT back'}`);

  /* ---- 6) to the banner ---- */
  console.log('6) The season ends on the Conquest Complete banner');
  let rounds = 1, banner = false;
  for (let i = 0; i < MAX_ROUNDS && !banner; i++) {
    const cont = page.locator('[data-conquest-continue]').first();
    if (await cont.count().catch(() => 0) > 0) {
      await cont.click({ timeout: 4000 }).catch(() => {});
      await page.waitForTimeout(250);
    }
    if (await page.locator('[data-conquest-complete]').count().catch(() => 0) > 0) { banner = true; break; }
    const p = page.locator('[data-conquest-pick]').first();
    if (await p.count().catch(() => 0) === 0) break;
    await p.click({ timeout: 4000 }).catch(() => {});
    await page.locator('[data-conquest-play]').first().click({ timeout: 4000 }).catch(() => {});
    rounds += 1;
    await page.locator('[data-scene-card]').first().waitFor({ timeout: 5000 }).catch(() => {});
    await page.locator('[data-scene-skip]').first().click({ timeout: 4000 }).catch(() => {});
    await page.locator('[data-conquest-recap]').first().waitFor({ timeout: 6000 }).catch(() => {});
    await page.waitForTimeout(120);
    await noteSeeding();
    say(`round ${rounds} skipped to its recap`);
  }
  const crown = await page.locator('[data-conquest-complete] [data-crown] svg').count().catch(() => 0);
  const recordRows = await page.locator('[data-conquest-complete] [data-record]').count().catch(() => 0);
  const finalEmpires = await empires(page);
  const finalOwners = finalEmpires.length;
  const totalRegions = finalEmpires.reduce((t, e) => t + e.count, 0);
  const stripHolding = Number(await page.locator('[data-standings]').first().getAttribute('data-holding').catch(() => null));
  check(`6. the season reached the Conquest Complete banner (${tag})`, banner, `${rounds} rounds played`);
  check(`6. the banner carries the crown and the four season records (${tag})`, crown === 1 && recordRows === 4, `crown ${crown}, records ${recordRows}`);
  check(`6. the map and the standings agree on who holds land (${tag})`, finalOwners === stripHolding, `${finalOwners} colours painted, the strip says ${stripHolding}`);
  /* Round 564: this asked for one colour, which is an NFL number, not the rule.
     The rule is that the eight biggest empires enter a knockout and one club
     comes out of it holding all eight, so the map ends with the champion plus
     whoever the bracket never reached. On /conquest only two to four clubs
     still hold land by week 18, all of them seeded, so one colour is what that
     rule produces and the old check was right about the map by accident. On
     /soccer-conquest twelve to fourteen clubs hold land after ten matchdays,
     so the bracket cannot reach them all and the map ends on three to seven
     colours. It is not a budget: the season is over at 13 rounds of 40, and
     simSoccerConquest measures 0 of 300 seeded seasons ending by total
     conquest. Both halves below are exact equalities, not ranges, and they
     held on 8 of 8 measured seasons across the two routes. */
  const seeded = seedStand ? seedStand.counts.length : 0;
  const wantColours = seedStand ? Math.max(1, seeded - 7) : 1;
  const wantCrownLand = seedStand ? seedStand.counts.slice(0, 8).reduce((t, c) => t + c.count, 0) : totalRegions;
  const crownLand = finalEmpires[0] ? finalEmpires[0].count : 0;
  check(`6. the map ends under one ruler: the eight biggest empires became the champion's (${tag})`,
    finalOwners === wantColours && crownLand === wantCrownLand,
    seedStand
      ? `${seeded} clubs held land at the ${seedStand.label}, so ${wantColours} colour(s) should be left and ${finalOwners} are; the crown holds ${crownLand} of ${totalRegions} regions against the ${wantCrownLand} those eight held`
      : `no playoff was dealt, so the season ended on total conquest: ${finalOwners} colour(s), the crown holds ${crownLand} of ${totalRegions}`);
  const shortAtEnd = await shortButtons(page);
  check(`6. every visible button is 30px or taller on the banner (${tag})`, shortAtEnd.length === 0, shortAtEnd.slice(0, 4).join(', ') || 'none short');

  await ctx.close();
}

for (const route of ROUTES) {
  for (const width of WIDTHS) {
    try {
      await walk(route, width);
    } catch (e) {
      failed.push(`${route} @${width}: threw ${String(e).split('\n')[0].slice(0, 140)}`);
      console.log(`  FAIL  ${route} @${width} threw: ${String(e).split('\n')[0].slice(0, 140)}`);
    }
  }
}

console.log('\nConsole and page errors');
check('no console or page errors across the runs', errors.length === 0, errors.slice(0, 3).join(' | ') || 'none');

await browser.close().catch(() => {});

console.log(`\n${checksRun} checks, ${failed.length} failed`);
if (CONTROL === 'noscore') {
  const targeted = failed.filter(f => CONTROL_TARGETS.some(t => f.startsWith(t)));
  const stray = failed.filter(f => !CONTROL_TARGETS.some(t => f.startsWith(t)));
  console.log(`control "noscore": ${controlSwaps} served chunk(s) rewritten, ${targeted.length} targeted check(s) red, ${stray.length} other check(s) red`);
  if (controlSwaps === 0) { console.error('control "noscore": no served chunk carried the attribute, the swap changed nothing'); stop(1); }
  if (targeted.length === 0) { console.error('control "noscore": the score check stayed green, the check is dead'); stop(1); }
  if (stray.length > 0) { console.error(`control "noscore": other checks went red too: ${stray.join('; ')}`); stop(1); }
  console.log('control "noscore": exactly the score check went red, the check works');
  stop(0);
}
if (failed.length) {
  console.log(failed.map(f => `  - ${f}`).join('\n'));
  stop(1);
}
console.log('ALL CONQUEST SCENE SCREEN CHECKS PASSED');
stop(0);
