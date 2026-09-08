/**
 * Round 518: exercise the real ticker with synthetic scores and real CSS.
 * The animation clock advances in 100 ms frames; production speed and holds
 * are unchanged. CSS transitions settle separately before handoff geometry.
 * Run with CHROME_PATH set when the project loader needs a system browser.
 * TICKER_CSS may point at a preceding build for the initial regression RED.
 * TICKER_HANDOFF_CONTROL selects an assertion-specific mutation from
 * CONTROL_TESTS below. Source copies live only in memory, never on disk.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import pw from './lib/playwrightLoader.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = fs.mkdtempSync(path.join(os.tmpdir(), 'ticker-handoffs-'));
const SOURCE = path.join(ROOT, 'src/components/layout/TopTicker.tsx');
const BAR = '[aria-label="Live scores ticker"]';
const SPORTS = ['soccer', 'mlb', 'nfl', 'cfb', 'nba', 'cbb', 'nhl', 'wnba', 'tennis'];
const CONTROL_TESTS = {
  starts: { case: 'first', failure: 'FIRST_CARD_START' },
  cap: { case: 'long', failure: 'ALL_CARDS_REACHABLE' },
  handoff: { case: 'first', failure: 'FINAL_CARD_HOLD' },
  focus: { case: 'reduced', failure: 'REDUCED_FOCUS_REACH', width: 390 },
  pausehold: { case: 'holdpause', failure: 'HOLD_REMAINING' },
  singlepause: { case: 'single', failure: 'SINGLE_PAUSE_CONTROL' },
  refresh: { case: 'refresh', failure: 'FEED_REMOVAL_RESUME' },
  reducedrefresh: { case: 'reducedrefresh', failure: 'FEED_REDUCED_POSITION' },
  focusreturn: { case: 'focusreturn', failure: 'FIRST_CARD_VISIBLE' },
  focusend: { case: 'focusend', failure: 'FINAL_FOCUS_HOLD' },
  touch: { case: 'pause', failure: 'TOUCH_CRAWL' },
};
const CONTROL = process.env.TICKER_HANDOFF_CONTROL || '';
const controlTest = CONTROL_TESTS[CONTROL];
assert.ok(!CONTROL || controlTest, `Unknown TICKER_HANDOFF_CONTROL=${CONTROL}`);
const WIDTHS = process.env.TICKER_WIDTHS ? process.env.TICKER_WIDTHS.split(',').map(Number) : CONTROL ? [controlTest.width || 320] : [320, 390, 430, 1440];
const CSS = process.env.TICKER_CSS || path.join(ROOT, 'dist/assets', fs.readdirSync(path.join(ROOT, 'dist/assets')).find(n => /^index-.*\.css$/.test(n)) || 'missing.css');
const CASE = process.env.TICKER_CASE || controlTest?.case || 'all';
assert.ok(['all', 'first', 'long', 'single', 'reduced', 'pause', 'holdpause', 'refresh', 'reducedrefresh', 'focusreturn', 'focusend', 'hidden'].includes(CASE), `Unknown TICKER_CASE=${CASE}`);
const EXPECTED_CONTROL = controlTest?.failure;
const BROWSER_ERRORS = [];
let tickerSource = fs.readFileSync(SOURCE, 'utf8').replaceAll('\r\n', '\n');
function mutateOnce(before, after) {
  if (tickerSource.split(before).length - 1 !== 1 || before === after) {
    console.error(`CONTROL_INVALID ${CONTROL}: expected one mutation target and an actual change`);
    process.exit(2);
  }
  const changed = tickerSource.replace(before, after);
  assert.notEqual(changed, tickerSource, `CONTROL_CHANGED ${CONTROL}: mutation changed nothing`);
  tickerSource = changed;
  console.log(`CONTROL_CHANGED ${CONTROL}: restored old behavior in memory; must fail ${EXPECTED_CONTROL}`);
}
if (CONTROL === 'starts') mutateOnce(
  'const start = Math.min(physicalMax, Math.max(0, box.getBoundingClientRect().left - left + vp.scrollLeft));',
  'const start = 0;',
);
if (CONTROL === 'cap') mutateOnce(
  'className="inline-flex items-center h-full"\n        aria-hidden={!open}',
  'className="inline-flex items-center h-full overflow-hidden"\n        style={{ maxWidth: open ? "4000px" : "0px" }}\n        aria-hidden={!open}',
);
if (CONTROL === 'handoff') mutateOnce(
  'if (cycle.position >= end - 1) {\n          cycle.atEnd = true;\n          cycle.holdLeft = 1500;',
  'if (cycle.position >= end - 1) {\n          cycle.atEnd = true;\n          cycle.holdLeft = 0;',
);
if (CONTROL === 'focus') mutateOnce(
  `onFocus={(e) => {
            if (!reducedMotion) return;
            const vp = e.currentTarget;
            const target = e.target.getBoundingClientRect();
            const left = vp.getBoundingClientRect().left + vp.clientLeft;
            if (target.left < left || target.width > vp.clientWidth) {
              vp.scrollLeft += target.left - left;
            } else if (target.right > left + vp.clientWidth) {
              vp.scrollLeft += target.right - left - vp.clientWidth;
            }
          }}`,
  'onFocus={() => {}}',
);
if (CONTROL === 'pausehold') mutateOnce(
  'cycle.position = vp.scrollLeft;\n    /* Round 336',
  'cycle.position = vp.scrollLeft;\n    cycle.holdLeft = 350;\n    /* Round 336',
);
if (CONTROL === 'singlepause') mutateOnce(
  '(groups.length > 1 || overflows) && !reducedMotion',
  'groups.length > 1 && !reducedMotion',
);
if (CONTROL === 'refresh') mutateOnce('setFocused(visible && section!.contains(document.activeElement));', '');
if (CONTROL === 'reducedrefresh') mutateOnce('if (!reducedMotion) vp.scrollLeft = 0;', 'vp.scrollLeft = 0;');
if (CONTROL === 'focusreturn') mutateOnce(
  'vp.scrollLeft = cycle.atEnd ? boundsRef.current.end : Math.min(boundsRef.current.end, Math.max(boundsRef.current.start, vp.scrollLeft));',
  '',
);
if (CONTROL === 'focusend') mutateOnce(
  'vp.scrollLeft = cycle.atEnd ? boundsRef.current.end : Math.min(boundsRef.current.end, Math.max(boundsRef.current.start, vp.scrollLeft));',
  'vp.scrollLeft = Math.min(boundsRef.current.end, Math.max(boundsRef.current.start, vp.scrollLeft));',
);
if (CONTROL === 'touch') mutateOnce(
  'onPointerEnter={(e) => { if (e.pointerType === \'mouse\') setHovered(true); }}',
  'onPointerEnter={() => setHovered(true)}',
);
const makeRows = (sports = SPORTS, count = 2) => sports.flatMap((sport, s) => Array.from({ length: typeof count === 'number' ? count : count[sport] || 2 }, (_, i) => ({
  id: `synthetic-${sport}-${i}`, sport, league: 'Synthetic fixture',
  home: `H${s}${i}`, away: `A${s}${i}`, home_score: 2, away_score: 1,
  status_short: 'FT', status_long: 'Final', live: false, finished: true,
  start_at: new Date(Date.UTC(2026, 8, 8, 12, -i)).toISOString(),
  updated_at: '2026-09-08T14:00:00Z',
})));

const bundle = await build({
  stdin: {
    contents: `import React from 'react'; import {createRoot} from 'react-dom/client';
      import {MemoryRouter, useNavigate} from 'react-router-dom';
      import {TopTicker} from ${JSON.stringify(SOURCE.replaceAll('\\', '/'))};
      const root = createRoot(document.getElementById('root'));
      function Fixture() { const navigate = useNavigate(); window.__tickerHome = () => navigate('/'); return <TopTicker scores={window.__tickerRows} />; }
      window.__tickerRender = rows => { window.__tickerRows = rows; root.render(<MemoryRouter><Fixture /></MemoryRouter>); };
      window.__tickerRender(window.__tickerRows);`,
    resolveDir: ROOT, loader: 'tsx', sourcefile: 'ticker-handoff-fixture.tsx',
  },
  bundle: true, write: false, format: 'iife', platform: 'browser', jsx: 'automatic',
  define: { 'process.env.NODE_ENV': '"production"' }, logLevel: 'silent',
  tsconfig: path.join(ROOT, 'tsconfig.app.json'),
  plugins: [{ name: 'ticker-control', setup(plugin) {
    plugin.onLoad({ filter: /[\\/]TopTicker\.tsx$/ }, () => ({ contents: tickerSource, loader: 'tsx', resolveDir: path.dirname(SOURCE) }));
  } }],
});
const assets = {
  '/': ['text/html', '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><button id="outside" style="margin-top:150px">Outside ticker</button><script src="/fixture.js"></script></body></html>'],
  '/fixture.js': ['text/javascript', bundle.outputFiles[0].contents],
  '/style.css': ['text/css', fs.readFileSync(CSS)],
};
const server = http.createServer((req, res) => {
  const asset = assets[new URL(req.url, 'http://localhost').pathname];
  res.writeHead(asset ? 200 : 404, { 'Content-Type': asset?.[0] || 'text/plain' });
  res.end(asset?.[1] || 'Not found');
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const BASE = `http://127.0.0.1:${server.address().port}`;
const browser = await pw.chromium.launch({ headless: true });

async function open(width, { reducedMotion = false, rows = makeRows() } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height: 300 }, reducedMotion: reducedMotion ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', error => { errors.push(error.message); BROWSER_ERRORS.push(error.message); });
  await page.route('**/*', route => new URL(route.request().url()).origin === BASE ? route.continue() : route.abort());
  await page.addInitScript(fixtureRows => {
    window.__tickerRows = fixtureRows;
    let time = 0;
    let sequence = 0;
    const frames = new Map();
    window.requestAnimationFrame = callback => { frames.set(++sequence, callback); return sequence; };
    window.cancelAnimationFrame = id => frames.delete(id);
    window.__tickerFrame = async () => {
      time += 100;
      const current = [...frames.values()];
      frames.clear();
      current.forEach(callback => callback(time));
      await new Promise(resolve => {
        const channel = new MessageChannel();
        channel.port1.onmessage = () => { channel.port1.close(); channel.port2.close(); resolve(); };
        channel.port2.postMessage(null);
      });
    };
    window.__tickerState = (withText = false) => {
      const bar = document.querySelector('[aria-label="Live scores ticker"]');
      const vp = bar.querySelector('[aria-live="off"]');
      const cards = [...bar.querySelectorAll('[data-score-card]')];
      const first = cards[0];
      const label = first?.parentElement.previousElementSibling;
      const rect = el => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, width: r.width, top: r.top, bottom: r.bottom, height: r.height }; };
      const clipped = el => {
        let left = el.getBoundingClientRect().left;
        let right = el.getBoundingClientRect().right;
        for (let ancestor = el.parentElement; ancestor; ancestor = ancestor.parentElement) {
          if (/hidden|clip|auto|scroll/.test(getComputedStyle(ancestor).overflowX)) {
            const box = ancestor.getBoundingClientRect();
            left = Math.max(left, box.left + ancestor.clientLeft); right = Math.min(right, box.left + ancestor.clientLeft + ancestor.clientWidth);
          }
        }
        const own = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        // A readable score needs its content, not the last fractional pixel of padding.
        const contentLeft = own.left + parseFloat(style.paddingLeft);
        const contentRight = own.right - parseFloat(style.paddingRight);
        return { visible: Math.max(0, right - left), leftEdge: left <= contentLeft + 0.5 && right > contentLeft, rightEdge: right >= contentRight - 0.5 && left < contentRight };
      };
      const textBounds = el => {
        let top = 0;
        let bottom = innerHeight;
        for (let ancestor = el.parentElement; ancestor; ancestor = ancestor.parentElement) {
          if (/hidden|clip|auto|scroll/.test(getComputedStyle(ancestor).overflowY)) {
            const box = ancestor.getBoundingClientRect();
            top = Math.max(top, box.top + ancestor.clientTop);
            bottom = Math.min(bottom, box.top + ancestor.clientTop + ancestor.clientHeight);
          }
        }
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        const runs = [];
        while (walker.nextNode()) {
          if (!walker.currentNode.textContent.trim()) continue;
          const range = document.createRange();
          range.selectNodeContents(walker.currentNode);
          const box = range.getBoundingClientRect();
          runs.push({ text: walker.currentNode.textContent, top: box.top, bottom: box.bottom, clipTop: top, clipBottom: bottom });
        }
        return runs;
      };
      return { time, sport: label?.textContent.trim(), scroll: vp.scrollLeft,
        viewport: { ...rect(vp), clientHeight: vp.clientHeight, clientWidth: vp.clientWidth }, label: label && rect(label),
        cards: cards.map(card => ({ ...rect(card), ...clipped(card), text: card.textContent.trim(), ...(withText ? { textBounds: textBounds(card) } : {}) })),
        pageWidth: document.documentElement.scrollWidth, windowWidth: innerWidth, pageY: scrollY };
    };
  }, rows);
  await page.mouse.move(width / 2, 250);
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForSelector(`${BAR} [data-score-card]`);
  await page.waitForTimeout(550);
  assert.deepEqual(errors, [], 'fixture must load without browser errors');
  return { ctx, page, errors };
}

async function advance(page, count) {
  return page.evaluate(async frames => {
    for (let i = 0; i < frames; i++) await window.__tickerFrame();
    return window.__tickerState();
  }, count);
}

async function traceCycle(page, wrap = false) {
  return page.evaluate(async expectWrap => {
    const start = window.__tickerState();
    const seen = new Map(start.cards.map(card => [card.text, { left: card.leftEdge, right: card.rightEdge }]));
    let previous = start;
    let finalSince = null;
    for (let frame = 0; frame < 2500; frame++) {
      await window.__tickerFrame();
      const current = window.__tickerState();
      const changed = current.sport !== start.sport;
      const wrapped = expectWrap && current.scroll < previous.scroll - 10;
      if (changed || wrapped) return { start, previous, current, seen: [...seen], held: finalSince === null ? 0 : current.time - finalSince, wrapped };
      for (const card of current.cards) {
        const edges = seen.get(card.text) || { left: false, right: false };
        edges.left ||= card.leftEdge; edges.right ||= card.rightEdge;
        seen.set(card.text, edges);
      }
      const last = current.cards.at(-1);
      const readable = last.rightEdge && (last.width > current.viewport.width || last.leftEdge);
      finalSince = readable ? finalSince ?? current.time : null;
      previous = current;
    }
    return { timeout: true, start, previous, seen: [...seen], held: 0 };
  }, wrap);
}

function save(name, state) {
  fs.writeFileSync(path.join(OUT, `${name}.json`), JSON.stringify(state, null, 2));
}

function firstVisible(state, width, sport) {
  assert.ok(state.cards[0].visible >= Math.min(96, state.cards[0].width) - 1,
    `FIRST_CARD_VISIBLE ${width} ${sport}: only ${state.cards[0].visible.toFixed(1)} px visible after handoff; first card at ${state.cards[0].left.toFixed(1)}, viewport ${state.viewport.left.toFixed(1)}..${state.viewport.right.toFixed(1)}`);
  const allVisible = state.cards.every(card => card.leftEdge && card.rightEdge);
  assert.ok(allVisible || state.cards[0].left <= state.viewport.left + state.label.width + 1,
    `FIRST_CARD_START ${width} ${sport}: collapsed labels delayed the new sport by ${(state.cards[0].left - state.viewport.left - state.label.width).toFixed(1)} px`);
  assert.ok(state.pageWidth <= state.windowWidth + 1, `PAGE_OVERFLOW ${width} ${sport}`);
}

function endReadable(trace, name, checkReachability = true) {
  assert.ok(!trace.timeout, `CYCLE_TIMEOUT ${name}: did not complete in 250 simulated seconds`);
  const missing = trace.seen.filter(([, edges]) => !edges.left || !edges.right).map(([text]) => text);
  if (checkReachability) assert.deepEqual(missing, [], `ALL_CARDS_REACHABLE ${name}: cards did not expose both edges`);
  assert.ok(trace.held >= 900, `FINAL_CARD_HOLD ${name}: final content readable for only ${trace.held} ms before handoff or wrap`);
}

async function firstCards(width) {
  const { ctx, page } = await open(width);
  try {
    for (const sport of SPORTS) {
      const state = await page.evaluate(() => window.__tickerState());
      assert.equal(state.sport, sport.toUpperCase(), 'sports must hand off in their expected order');
      await page.screenshot({ path: path.join(OUT, `first-${width}-${sport}.png`) });
      save(`first-${width}-${sport}`, state);
      firstVisible(state, width, sport);
      const trace = await traceCycle(page);
      save(`cycle-${width}-${sport}`, trace);
      endReadable(trace, `${width} ${sport}`);
      console.log(`  PASS ${width} ${sport}: first ${state.cards[0].visible.toFixed(1)} px, end hold ${trace.held} ms`);
      await page.waitForTimeout(550);
    }
    assert.equal((await page.evaluate(() => window.__tickerState())).sport, 'SOCCER', 'ninth sport must wrap to soccer');
  } finally { await ctx.close(); }
}

async function longSlate(width, oneSport = false) {
  const rows = makeRows(oneSport ? ['soccer'] : SPORTS, { soccer: 40 });
  rows[0] = { ...rows[0], home: 'SyntheticHomeNameXX', away: 'SyntheticAwayNameXX', live: true, finished: false, status_long: 'Synthetic extra period' };
  const { ctx, page } = await open(width, { rows });
  try {
    const state = await page.evaluate(() => window.__tickerState());
    const span = state.cards.at(-1).right - state.cards[0].left;
    assert.ok(span > 4000, `long fixture must exceed old 4000 px cap, measured ${span}`);
    if (width <= 430) assert.ok(state.cards[0].width > state.viewport.width, 'long fixture must include a phone card wider than the viewport');
    if (oneSport) {
      const pause = page.getByRole('button', { name: 'Pause the scores ticker' });
      assert.equal(await pause.count(), 1, `SINGLE_PAUSE_CONTROL ${width}: one overflowing sport has no pause button`);
      await pause.click();
      await page.mouse.move(width / 2, 250);
      const paused = await advance(page, 50);
      assert.equal(paused.scroll, state.scroll, `SINGLE_PAUSE ${width}: the single-sport crawl ignored pause`);
      await page.getByRole('button', { name: 'Resume the scores ticker' }).click();
      await page.mouse.move(width / 2, 250);
    }
    const trace = await traceCycle(page, oneSport);
    save(`long-${width}-${oneSport ? 'single' : 'nine'}`, trace);
    await page.screenshot({ path: path.join(OUT, `long-${width}-${oneSport ? 'single' : 'nine'}.png`) });
    endReadable(trace, `${width} ${oneSport ? 'single' : 'nine'} sport long slate`);
    assert.equal(trace.seen.length, 40, 'all forty synthetic cards must be tracked');
    if (oneSport) {
      assert.ok(trace.wrapped, 'one sport must restart after its end hold');
      firstVisible(trace.current, width, 'soccer restart');
    } else {
      assert.equal(trace.current.sport, 'MLB', 'long soccer slate must eventually hand off');
    }
    console.log(`  PASS long ${width} ${oneSport ? 'single' : 'nine'}: ${span.toFixed(1)} px, forty cards reached, end hold ${trace.held} ms`);
  } finally { await ctx.close(); }
}

async function reducedManual(width) {
  const rows = makeRows(SPORTS, { soccer: 40 });
  const { ctx, page } = await open(width, { reducedMotion: true, rows });
  try {
    const state = await page.evaluate(() => window.__tickerState(true));
    assert.equal(state.cards.length, 56, 'reduced motion must retain all nine sports and forty soccer cards');
    save(`reduced-vertical-${width}`, state);
    await page.screenshot({ path: path.join(OUT, `reduced-start-${width}.png`) });
    const clippedText = state.cards.flatMap(card => card.textBounds).filter(run => run.top < run.clipTop - 0.5 || run.bottom > run.clipBottom + 0.5);
    assert.deepEqual(clippedText, [], `REDUCED_VERTICAL_TEXT ${width}: text falls outside the actual client-height clip`);
    const still = await advance(page, 200);
    assert.equal(still.scroll, state.scroll, `REDUCED_STILL ${width}: reduced motion moved on its own`);
    const vp = page.locator(`${BAR} [aria-live="off"]`);
    const overflow = await vp.evaluate(el => getComputedStyle(el).overflowX);
    assert.ok(['auto', 'scroll'].includes(overflow), `REDUCED_MANUAL_SCROLL ${width}: overflow-x=${overflow} prevents manual scrolling`);
    await vp.hover();
    await page.mouse.wheel(100000, 0);
    await page.waitForTimeout(250);
    const end = await page.evaluate(() => window.__tickerState());
    assert.ok(end.scroll > state.scroll + 100, `REDUCED_WHEEL ${width}: horizontal wheel did not move scores`);
    assert.ok(end.cards.at(-1).rightEdge, `REDUCED_LAST_CARD ${width}: final tennis score is unreachable`);
    const cards = page.locator(`${BAR} [data-score-card]`);
    for (const index of [0, 39, 40, 55]) {
      await cards.nth(index).focus();
      const focused = await page.evaluate(() => window.__tickerState());
      const card = focused.cards[index];
      assert.equal(focused.pageY, state.pageY, `REDUCED_PAGE_POSITION ${width}: reading score ${index} moved the page`);
      if (card.visible < Math.min(card.width, focused.viewport.width) - 1) {
        save(`reduced-focus-${width}-${index}`, focused);
        await page.screenshot({ path: path.join(OUT, `reduced-focus-${width}-${index}.png`) });
      }
      assert.ok(card.visible >= Math.min(card.width, focused.viewport.width) - 1, `REDUCED_FOCUS_REACH ${width}: card ${index} exposes ${card.visible.toFixed(1)} of ${card.width.toFixed(1)} px after keyboard focus`);
    }
    await page.screenshot({ path: path.join(OUT, `reduced-${width}.png`) });
    console.log(`  PASS reduced motion ${width}: wheel and focused score links reach all sports`);
  } finally { await ctx.close(); }
}

async function pauseAndResize(width) {
  const { ctx, page } = await open(width, { rows: makeRows(SPORTS, { soccer: 12 }) });
  try {
    let state = await advance(page, 35);
    assert.ok(state.scroll > 20, 'pause fixture must already be crawling');
    await page.locator(BAR).dispatchEvent('pointerover', { pointerType: 'touch', bubbles: true });
    const touched = await advance(page, 20);
    assert.ok(touched.scroll > state.scroll + 20, `TOUCH_CRAWL ${width}: touch pointer parked automatic scores`);
    await page.locator(BAR).dispatchEvent('pointerout', { pointerType: 'touch', bubbles: true });
    state = touched;
    const pause = page.getByRole('button', { name: 'Pause the scores ticker' });
    await pause.click();
    await page.mouse.move(width / 2, 250);
    const held = await advance(page, 100);
    assert.equal(held.scroll, state.scroll, `EXPLICIT_PAUSE ${width}: pointer leaving resumed explicit pause`);
    await page.getByRole('button', { name: 'Resume the scores ticker' }).click();
    await page.mouse.move(width / 2, 250);
    state = await advance(page, 20);
    assert.ok(state.scroll > held.scroll + 20, `EXPLICIT_RESUME ${width}: resume did not restart crawl`);
    await page.locator(`${BAR} [data-score-card]`).first().focus();
    const focused = await page.evaluate(() => window.__tickerState());
    await page.locator(BAR).hover();
    await page.mouse.move(width / 2, 250);
    const focusHeld = await advance(page, 100);
    assert.equal(focusHeld.scroll, focused.scroll, `FOCUS_PAUSE ${width}: mouse leave resumed while keyboard focus stayed inside`);
    await page.locator(BAR).hover();
    await page.locator('#outside').focus();
    const hoverHeld = await advance(page, 100);
    assert.equal(hoverHeld.scroll, focusHeld.scroll, `HOVER_PAUSE ${width}: focus leaving resumed while mouse stayed inside`);
    await page.mouse.move(width / 2, 250);
    state = await advance(page, 20);
    assert.ok(state.scroll > hoverHeld.scroll + 20, `PAUSE_RELEASE ${width}: crawl stayed stopped after both pauses cleared`);
    await page.setViewportSize({ width: width === 320 ? 1440 : 320, height: 300 });
    await page.waitForTimeout(100);
    const resized = await advance(page, 3);
    assert.ok(resized.cards.some(card => card.visible > 50), `RESIZE_CONTENT ${width}: resizing lost every active card`);
    assert.ok(resized.pageWidth <= resized.windowWidth + 1, `RESIZE_OVERFLOW ${width}: page bleeds sideways`);
    const trace = await traceCycle(page);
    endReadable(trace, `${width} after resize`, false);
    await page.screenshot({ path: path.join(OUT, `resized-${width}.png`) });
    console.log(`  PASS pause and resize ${width}: explicit, mouse, and focus holds remain independent`);
  } finally { await ctx.close(); }
}

async function holdPause(width) {
  const { ctx, page } = await open(width, { rows: makeRows(SPORTS, { soccer: 12 }) });
  try {
    const final = await page.evaluate(async () => {
      for (let i = 0; i < 1000; i++) {
        await window.__tickerFrame();
        const state = window.__tickerState();
        if (state.cards.at(-1).leftEdge && state.cards.at(-1).rightEdge) return state;
      }
      return null;
    });
    assert.ok(final && final.sport === 'SOCCER', `HOLD_FINAL_REACHED ${width}: final card never became readable`);
    await page.screenshot({ path: path.join(OUT, `final-hold-${width}.png`) });
    save(`final-hold-${width}`, final);
    await advance(page, 3);
    await page.getByRole('button', { name: 'Pause the scores ticker' }).click();
    await page.mouse.move(width / 2, 250);
    const paused = await advance(page, 100);
    assert.equal(paused.sport, 'SOCCER', `HOLD_PAUSED ${width}: end hold expired while paused`);
    assert.ok(paused.cards.at(-1).leftEdge && paused.cards.at(-1).rightEdge, `HOLD_PAUSED_VISIBLE ${width}: pause hid final score`);
    await page.getByRole('button', { name: 'Resume the scores ticker' }).click();
    await page.mouse.move(width / 2, 250);
    const resumed = await advance(page, 8);
    assert.equal(resumed.sport, 'SOCCER', `HOLD_REMAINING ${width}: resume discarded the unread end hold`);
    const handed = await advance(page, 12);
    assert.equal(handed.sport, 'MLB', `HOLD_FINISHES ${width}: resume restarted or stalled the end hold`);
    console.log(`  PASS remaining hold ${width}: pause preserves final-card reading time`);
  } finally { await ctx.close(); }
}

async function refreshFocus(width) {
  const { ctx, page } = await open(width, { rows: makeRows(SPORTS, { soccer: 12 }) });
  try {
    await advance(page, 35);
    await page.locator(`${BAR} [data-score-card]`).first().focus();
    await page.evaluate(() => window.__tickerRender(window.__tickerRows.slice(1)));
    await page.waitForTimeout(50);
    const before = await page.evaluate(() => window.__tickerState());
    const after = await advance(page, 35);
    save(`refresh-removed-${width}`, { before, after });
    assert.ok(after.scroll > before.scroll + 20 || after.sport !== before.sport,
      `FEED_REMOVAL_RESUME ${width}: removing the focused score left the ticker paused at ${after.scroll}`);
    console.log(`  PASS removed focused score ${width}: automatic crawl resumes`);
  } finally { await ctx.close(); }
}

async function reducedRefresh(width) {
  const reduced = await open(width, { reducedMotion: true, rows: makeRows(SPORTS, { soccer: 40 }) });
  try {
    await reduced.page.locator(`${BAR} [data-score-card]`).last().focus();
    const before = await reduced.page.evaluate(() => window.__tickerState());
    await reduced.page.evaluate(() => window.__tickerRender(window.__tickerRows.map(row => ({ ...row }))));
    await reduced.page.waitForTimeout(50);
    const after = await reduced.page.evaluate(() => window.__tickerState());
    save(`refresh-reduced-${width}`, { before, after });
    await reduced.page.screenshot({ path: path.join(OUT, `refresh-reduced-${width}.png`) });
    assert.ok(after.cards.at(-1).rightEdge && after.cards.at(-1).leftEdge,
      `FEED_REDUCED_POSITION ${width}: equivalent feed refresh hid the focused final card, scroll ${before.scroll} to ${after.scroll}`);
    console.log(`  PASS reduced refresh ${width}: focused final score remains readable`);
  } finally { await reduced.ctx.close(); }
}

async function focusReturn(width) {
  const { ctx, page } = await open(width);
  try {
    for (let i = 0; i < 8; i++) await traceCycle(page);
    await page.waitForTimeout(50);
    const before = await page.evaluate(() => window.__tickerState());
    assert.equal(before.sport, 'TENNIS');
    await page.locator(`${BAR} [data-sport-box]`).first().focus();
    await page.locator('#outside').focus();
    const after = await advance(page, 8);
    save(`focus-return-${width}`, { before, after });
    firstVisible(after, width, 'tennis after collapsed-label focus');
    console.log(`  PASS focus return ${width}: active score remains visible after reading another label`);
  } finally { await ctx.close(); }
}

async function focusAtEnd(width) {
  const { ctx, page } = await open(width);
  try {
    for (let i = 0; i < 8; i++) await traceCycle(page);
    await page.waitForTimeout(50);
    await page.evaluate(async () => {
      for (let i = 0; i < 200; i++) {
        await window.__tickerFrame();
        if (window.__tickerState().cards.at(-1).rightEdge) return;
      }
    });
    const final = await advance(page, 3);
    assert.equal(final.sport, 'TENNIS');
    assert.ok(final.cards.at(-1).rightEdge, 'focus end fixture must reach the final score');
    await page.locator(`${BAR} [data-sport-box]`).first().focus();
    await page.locator('#outside').focus();
    const after = await advance(page, 1);
    save(`focus-at-end-${width}`, { final, after });
    await page.screenshot({ path: path.join(OUT, `focus-at-end-${width}.png`) });
    assert.ok(after.cards.at(-1).leftEdge && after.cards.at(-1).rightEdge,
      `FINAL_FOCUS_HOLD ${width}: returning from another sport label hid the final score during its remaining hold`);
    console.log(`  PASS focus at end ${width}: final score remains readable after label focus`);
  } finally { await ctx.close(); }
}

async function hideAndReturn() {
  const { ctx, page } = await open(320, { rows: makeRows(SPORTS, { soccer: 12 }) });
  try {
    await advance(page, 35);
    await page.locator(`${BAR} [data-score-card]`).first().click();
    await page.waitForTimeout(50);
    assert.equal(await page.locator(BAR).isVisible(), false, 'score hub should hide mobile ticker');
    await page.mouse.move(200, 250);
    await page.evaluate(() => window.__tickerHome());
    await page.waitForTimeout(50);
    const back = await page.evaluate(() => window.__tickerState());
    const moving = await advance(page, 35);
    assert.ok(moving.scroll > back.scroll + 20 || moving.sport !== back.sport, 'HIDDEN_ROUTE_RESUME: returning home left ticker parked');
    await page.setViewportSize({ width: 1440, height: 300 });
    await page.waitForTimeout(50);
    await page.locator(`${BAR} [data-score-card]`).first().click();
    await page.mouse.move(1400, 250);
    await page.locator(`${BAR} [data-score-card]`).first().focus();
    await page.setViewportSize({ width: 320, height: 300 });
    await page.waitForTimeout(50);
    assert.equal(await page.locator(BAR).isVisible(), false, 'narrow hub viewport should hide ticker');
    await page.setViewportSize({ width: 1440, height: 300 });
    await page.waitForTimeout(50);
    const shown = await page.evaluate(() => window.__tickerState());
    const resumed = await advance(page, 35);
    save('hidden-return', { back, moving, shown, resumed });
    assert.ok(resumed.scroll > shown.scroll + 20 || resumed.sport !== shown.sport, 'HIDDEN_VIEWPORT_RESUME: widening the hidden ticker left it parked');
    console.log('  PASS hidden ticker: home navigation and viewport return resume the crawl');
  } finally { await ctx.close(); }
}

try {
  console.log(`playTickerHandoffs: real component, synthetic nine-sport scores, CSS ${CSS}`);
  console.log(`Artifacts: ${OUT}`);
  for (const width of WIDTHS) {
    const run = async (test, ...args) => {
      await test(width, ...args);
      assert.deepEqual(BROWSER_ERRORS, [], `BROWSER_RUNTIME_ERRORS after ${test.name} at ${width}`);
    };
    if (CASE === 'all' || CASE === 'first') await run(firstCards);
    if (CASE === 'all' || CASE === 'long') await run(longSlate);
    if (CASE === 'all' || CASE === 'single') await run(longSlate, true);
    if (CASE === 'all' || CASE === 'reduced') await run(reducedManual);
    if (CASE === 'all' || CASE === 'pause') await run(pauseAndResize);
    if (CASE === 'all' || CASE === 'holdpause') await run(holdPause);
    if (CASE === 'all' || CASE === 'refresh') await run(refreshFocus);
    if (CASE === 'all' || CASE === 'reducedrefresh') await run(reducedRefresh);
    if (CASE === 'all' || CASE === 'focusreturn') await run(focusReturn);
    if (CASE === 'all' || CASE === 'focusend') await run(focusAtEnd);
    if ((CASE === 'all' && width === WIDTHS[0]) || CASE === 'hidden') await run(hideAndReturn);
  }
  assert.deepEqual(BROWSER_ERRORS, [], 'BROWSER_RUNTIME_ERRORS: fixture raised asynchronous browser errors');
  assert.ok(!CONTROL, `CONTROL_INVALID ${CONTROL}: expected ${EXPECTED_CONTROL}, but the behavioral checks passed`);
  console.log('playTickerHandoffs: PASS');
} catch (error) {
  if (CONTROL && BROWSER_ERRORS.length === 0 && error instanceof assert.AssertionError && error.message.startsWith(EXPECTED_CONTROL)) {
    console.error(`EXPECTED_CONTROL_FAILURE ${CONTROL}: ${error.message}`);
    process.exitCode = 1;
  } else {
    console.error(error.stack || error);
    if (CONTROL) console.error(`CONTROL_INVALID ${CONTROL}: expected ${EXPECTED_CONTROL}, got a different failure`);
    process.exitCode = CONTROL ? 2 : 1;
  }
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
