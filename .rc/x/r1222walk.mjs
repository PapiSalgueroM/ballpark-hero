/* Reviewer's walk (run lens) of Round 1222's lottery card. Runs on the runner from the repo root, after #!serve.
   Nothing mounts the card on this branch, so the walk bundles a small page (.rc/x/r1222page.tsx) that mounts the REAL
   component on orders built by the REAL modules, drops it into dist/__r1222/ beside the site's own built CSS, and
   walks it at 390x844 and 1280x900 with reduced motion off and on. Screenshots and walk.json go to $RC_OUT.
   It never reaches the database: the page imports no client, and the host is blocked anyway. */
import fs from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || path.resolve('.tmp-fx/walk-out');
fs.mkdirSync(OUT, { recursive: true });
const ROOT = process.cwd();
const SRC = path.join(ROOT, 'src');
const PAGE_DIR = path.join(ROOT, 'dist', '__r1222');
fs.mkdirSync(PAGE_DIR, { recursive: true });

const withExt = p => [p, `${p}.ts`, `${p}.tsx`, path.join(p, 'index.ts'), path.join(p, 'index.tsx')].find(c => fs.existsSync(c) && fs.statSync(c).isFile());
await build({
  entryPoints: [path.join(ROOT, '.rc', 'x', 'r1222page.tsx')],
  bundle: true, format: 'iife', platform: 'browser', jsx: 'automatic', outfile: path.join(PAGE_DIR, 'app.js'),
  define: { 'process.env.NODE_ENV': '"production"' }, logLevel: 'warning',
  plugins: [{
    name: 'at-alias',
    setup(b) {
      b.onResolve({ filter: /^@\// }, args => {
        const file = withExt(path.join(SRC, args.path.slice(2)));
        return file ? { path: file } : { errors: [{ text: `cannot resolve ${args.path}` }] };
      });
    },
  }],
});
const css = fs.readdirSync(path.join(ROOT, 'dist', 'assets')).filter(f => f.endsWith('.css'));
fs.writeFileSync(path.join(PAGE_DIR, 'index.html'), [
  '<!doctype html><html lang="en"><head><meta charset="utf-8">',
  '<meta name="viewport" content="width=device-width, initial-scale=1">',
  ...css.map(f => `<link rel="stylesheet" href="/assets/${f}">`),
  '<title>r1222 reviewer page</title></head><body><div id="root"></div><script src="/__r1222/app.js"></script></body></html>',
].join('\n'));
console.log(`page built: ${fs.statSync(path.join(PAGE_DIR, 'app.js')).size} bytes of script, css files: ${css.join(', ')}`);

/* Does the site's own build carry the lift anywhere? Nothing mounts it, so no chunk should. */
const assets = fs.readdirSync(path.join(ROOT, 'dist', 'assets')).filter(f => f.endsWith('.js'));
const carrying = assets.filter(f => { const t = fs.readFileSync(path.join(ROOT, 'dist', 'assets', f), 'utf8'); return t.includes('data-lottery-reveal') || t.includes('lrTurn') || t.includes('data-gm-lottery'); });
console.log(`site chunks that carry the lottery card: ${carrying.length}${carrying.length ? ` (${carrying.join(', ')})` : ''} of ${assets.length}`);

const results = [];
const problems = [];
const shots = [];
const VIEWPORTS = [{ w: 390, h: 844 }, { w: 1280, h: 900 }];

/* Everything a look at the card can be measured by, read in the page. */
const MEASURE = () => {
  const card = document.querySelector('[data-lottery-reveal]');
  if (!card) return null;
  const r = card.getBoundingClientRect();
  const faces = [...card.querySelectorAll('[data-lottery-face]')];
  const op = el => Number(getComputedStyle(el).opacity);
  const head = card.querySelector('[data-lottery-headline]');
  const below = document.getElementById('below').getBoundingClientRect();
  const cut = [...card.querySelectorAll('[data-lottery-face] .truncate')].filter(e => e.scrollWidth > e.clientWidth + 1).map(e => e.textContent);
  const anims = document.getAnimations().map(a => a.effect.getComputedTiming().endTime);
  const panel = card.querySelector('[data-lottery-help-panel]');
  const stage = card.querySelector('[data-lottery-stage]').getBoundingClientRect();
  return {
    card: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
    stageH: Math.round(stage.height),
    belowTop: Math.round(below.top),
    tiles: faces.length,
    facesShown: faces.filter(f => op(f) > 0.99).length,
    headline: head ? { text: head.textContent, opacity: op(head) } : null,
    rule: card.querySelector('[data-lottery-rule]')?.textContent ?? null,
    cut,
    animEndMs: anims.length ? Math.round(Math.max(...anims)) : 0,
    overflowX: document.documentElement.scrollWidth - window.innerWidth,
    docH: document.documentElement.scrollHeight,
    panel: panel ? { scrollH: panel.scrollHeight, clientH: panel.clientHeight, text: panel.textContent.length } : null,
    continues: window.__continues,
    mineText: card.querySelector('[data-lottery-mine]')?.textContent ?? null,
    grid: [...card.querySelectorAll('[data-lottery-slot]')].map(li => li.querySelector('[data-lottery-face]').textContent),
  };
};

async function open(browser, vp, reduce, query) {
  const context = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, deviceScaleFactor: 2, reducedMotion: reduce ? 'reduce' : 'no-preference' });
  const page = await context.newPage();
  await page.route(/supabase\.co/, r => r.abort());
  const errors = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 300)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 300)); });
  await page.goto(`${BASE}/__r1222/?${query}`, { waitUntil: 'domcontentloaded' });
  return { context, page, errors };
}
const tag = (vp, reduce) => `${vp.w}-${reduce ? 'reduced' : 'motion'}`;
async function shot(page, name, full = false) {
  const file = `${name}.png`;
  await page.screenshot({ path: path.join(OUT, file), fullPage: full });
  shots.push(file);
}
const note = (where, what) => { problems.push(`${where}: ${what}`); console.log(`  PROBLEM ${where}: ${what}`); };

const browser = await chromium.launch();

/* WALK 1: the full night as a player meets it, his club drawn up the order. First frame, middle, end, the "?", back, on. */
for (const vp of VIEWPORTS) {
  for (const reduce of [false, true]) {
    const where = `up-${tag(vp, reduce)}`;
    const { context, page, errors } = await open(browser, vp, reduce, 's=up&label=full');
    await page.waitForSelector('[data-lottery-reveal]', { timeout: 20000 });
    const first = await page.evaluate(MEASURE);
    await shot(page, `${where}-1-first`);
    const info = await page.evaluate(() => window.__info);
    await page.waitForTimeout(1500);
    const mid = await page.evaluate(MEASURE);
    await shot(page, `${where}-2-mid`);
    /* wait for the true end: every face and the closing line fully in */
    const started = Date.now();
    let end = mid;
    while (Date.now() - started < 8000) {
      end = await page.evaluate(MEASURE);
      if (end.facesShown === end.tiles && (!end.headline || end.headline.opacity > 0.99)) break;
      await page.waitForTimeout(50);
    }
    await page.waitForTimeout(250);
    await shot(page, `${where}-3-end`);
    await page.locator('[data-lottery-mine]').screenshot({ path: path.join(OUT, `${where}-3-mine.png`) });
    shots.push(`${where}-3-mine.png`);
    await page.click('[data-lottery-help]');
    const help = await page.evaluate(MEASURE);
    await shot(page, `${where}-4-help`);
    const helpText = await page.evaluate(() => [...document.querySelectorAll('[data-lottery-help-panel] p')].map(p => p.textContent));
    await page.evaluate(() => { const p = document.querySelector('[data-lottery-help-panel]'); p.scrollTop = p.scrollHeight; });
    await shot(page, `${where}-5-help-bottom`);
    await page.click('[data-lottery-help-close]');
    const back = await page.evaluate(MEASURE);
    await page.click('[data-lottery-continue]');
    const after = await page.evaluate(MEASURE);
    results.push({ where, info, first, mid, end, help, back, after, helpText, errors });
    for (const [k, m] of Object.entries({ mid, end, help, back, after })) {
      if (m.card.h !== first.card.h || m.card.w !== first.card.w) note(where, `the card is ${m.card.w}x${m.card.h} at ${k}, ${first.card.w}x${first.card.h} on the first frame`);
      if (m.belowTop !== first.belowTop) note(where, `the line under the card moved from ${first.belowTop} to ${m.belowTop} at ${k}`);
      if (m.overflowX > 0) note(where, `the page is ${m.overflowX}px wider than the screen at ${k}`);
    }
    if (reduce && first.facesShown !== first.tiles) note(where, `reduced motion: ${first.facesShown} of ${first.tiles} tiles shown on the first frame`);
    if (reduce && first.headline && first.headline.opacity < 0.99) note(where, 'reduced motion: the closing line is not shown on the first frame');
    if (!reduce && first.facesShown === first.tiles) note(where, 'motion on: every tile is already shown on the first frame, so there is no reveal');
    if (end.facesShown !== end.tiles) note(where, `only ${end.facesShown} of ${end.tiles} tiles ever turned`);
    if (first.animEndMs > 5000) note(where, `the reveal's own animations end at ${first.animEndMs} ms, over the house ceiling of 5000`);
    if (after.continues !== 1) note(where, `continue was pressed once and counted ${after.continues}`);
    if (errors.length) note(where, `console: ${errors.join(' | ')}`);
    console.log(`${where}: card ${first.card.w}x${first.card.h} at y ${first.card.y}, tiles ${first.tiles}, shown first/mid/end ${first.facesShown}/${mid.facesShown}/${end.facesShown}, animations end ${first.animEndMs} ms, cut labels ${end.cut.length}, help panel ${help.panel ? `${help.panel.scrollH} in ${help.panel.clientH}` : 'none'}, page height ${first.docH}`);
    await context.close();
  }
}

/* WALK 2: he presses the button on the first frame. Every tile must land at once and the caller is told once. */
for (const vp of VIEWPORTS) {
  const where = `early-${tag(vp, false)}`;
  const { context, page, errors } = await open(browser, vp, false, 's=up&label=full');
  await page.waitForSelector('[data-lottery-continue]', { timeout: 20000 });
  const before = await page.evaluate(MEASURE);
  await page.click('[data-lottery-continue]');
  const after = await page.evaluate(MEASURE);
  await shot(page, `${where}-pressed`);
  results.push({ where, before, after, errors });
  if (before.facesShown === before.tiles) note(where, 'the button was not pressed early: every tile was already shown');
  if (after.facesShown !== after.tiles) note(where, `after an early press ${after.facesShown} of ${after.tiles} tiles are shown`);
  if (after.headline && after.headline.opacity < 0.99) note(where, 'after an early press the closing line is not shown');
  if (after.continues !== 1) note(where, `continue counted ${after.continues}`);
  if (after.card.h !== before.card.h) note(where, `the card went from ${before.card.h} to ${after.card.h} high on the press`);
  console.log(`${where}: shown before ${before.facesShown}/${before.tiles}, after ${after.facesShown}/${after.tiles}, continues ${after.continues}`);
  await context.close();
}

/* WALK 3: the other nights, on the last frame. A night already watched (seen) must be still with motion ON. */
const OTHERS = [
  ['down', 's=down&label=full', true], ['notin', 's=notin&label=full', true], ['plain', 's=plain&label=full', true],
  ['level', 's=level&label=full', true], ['abbr', 's=up&label=abbr', true], ['seen', 's=up&label=full&seen=1', false],
  ['norules', 's=up&label=full&norules=1', true],
];
for (const vp of VIEWPORTS) {
  for (const [name, query, reduce] of OTHERS) {
    const where = `${name}-${tag(vp, reduce)}`;
    const { context, page, errors } = await open(browser, vp, reduce, query);
    await page.waitForSelector('[data-lottery-reveal]', { timeout: 20000 });
    const first = await page.evaluate(MEASURE);
    const info = await page.evaluate(() => window.__info);
    await shot(page, `${where}-1`);
    let helpText = null;
    let help = null;
    if (await page.locator('[data-lottery-help]').count()) {
      await page.click('[data-lottery-help]');
      help = await page.evaluate(MEASURE);
      helpText = await page.evaluate(() => [...document.querySelectorAll('[data-lottery-help-panel] p')].map(p => p.textContent));
      if (name === 'plain' || name === 'norules') await shot(page, `${where}-2-help`);
      if (help.card.h !== first.card.h) note(where, `the card went from ${first.card.h} to ${help.card.h} high when the "?" opened`);
      if (help.belowTop !== first.belowTop) note(where, `the line under the card moved when the "?" opened`);
    } else if (name !== 'x') note(where, 'there is no "?" on this card');
    results.push({ where, info, first, help, helpText, errors });
    if (first.facesShown !== first.tiles) note(where, `${first.facesShown} of ${first.tiles} tiles shown on a card that must be still`);
    if (first.overflowX > 0) note(where, `the page is ${first.overflowX}px wider than the screen`);
    if (errors.length) note(where, `console: ${errors.join(' | ')}`);
    console.log(`${where}: card ${first.card.w}x${first.card.h}, tiles ${first.tiles}, cut labels ${first.cut.length}, headline ${JSON.stringify(first.headline?.text ?? null)}`);
    await context.close();
  }
}

/* WALK 4: the run reveal of the lift on the EXISTING draft night card (the bind's Round C adds the headline prop). */
for (const vp of VIEWPORTS) {
  const where = `run-${tag(vp, true)}`;
  const { context, page, errors } = await open(browser, vp, true, 's=run&label=full');
  await page.waitForSelector('[data-draft-night]', { timeout: 20000 });
  const info = await page.evaluate(() => window.__info);
  const rows = await page.evaluate(() => [...document.querySelectorAll('[data-draft-night] li')].map(li => li.textContent));
  const cardHead = await page.evaluate(() => document.querySelector('[data-draft-night] .fo-draft-head')?.textContent ?? null);
  await shot(page, `${where}-1`);
  results.push({ where, info, rows, cardHead, errors });
  console.log(`${where}: lift headline ${JSON.stringify(info.headline)}, the card's own heading ${JSON.stringify(cardHead)}, rows ${rows.length}, hidden ${info.hidden}`);
  await context.close();
}

await browser.close();
fs.writeFileSync(path.join(OUT, 'walk.json'), JSON.stringify({ results, problems, shots }, null, 1));
console.log(`walk: ${shots.length} screenshots, ${problems.length} problems measured.`);
process.exit(0);
