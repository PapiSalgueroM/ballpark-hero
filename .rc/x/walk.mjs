// Round 1308 review (run lens): walk the NFL bracket card on every face at 320, 390 and 1280, reduced motion on and off.
// The card is mounted by nothing on the site yet, so the walk bundles it (esbuild) into a page of its own with the built
// site's CSS, inside the board's own box class (GM_GAME_DAY_BOX). supabase.co is blocked. Screenshots into RC_OUT.
import fs from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';
import { chromium } from 'playwright';

const ROOT = process.cwd();
const OUT = process.env.RC_OUT || path.join(ROOT, '.tmp-walk');
fs.mkdirSync(OUT, { recursive: true });
const assets = path.join(ROOT, 'dist', 'assets');
const css = fs.readdirSync(assets).filter(f => f.endsWith('.css')).map(f => fs.readFileSync(path.join(assets, f), 'utf8')).join('\n');
const built = await build({
  entryPoints: [path.join(ROOT, '.rc', 'x', 'walk-entry.tsx')], bundle: true, write: false, format: 'iife', platform: 'browser',
  jsx: 'automatic', alias: { '@': './src' }, absWorkingDir: ROOT, define: { 'process.env.NODE_ENV': '"production"' }, logLevel: 'error',
});
const js = built.outputFiles[0].text;
console.log(`bundled ${Math.round(js.length / 1024)}K, css ${Math.round(css.length / 1024)}K`);

const MEASURE = () => {
  const root = document.querySelector('[data-bracket]');
  const box = root.closest('[data-gameday-box]');
  const rr = root.getBoundingClientRect();
  const cs = getComputedStyle(box);
  const innerH = box.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  const scroller = root.querySelector('[data-bracket-scroll]');
  const weeksRow = root.querySelector('[data-bracket-weeks]');
  const sr = scroller.getBoundingClientRect();
  const problems = [];
  if (Math.abs(rr.height - innerH) > 1) problems.push(`card height ${rr.height.toFixed(1)} against the box's inner ${innerH.toFixed(1)}`);
  for (const el of root.querySelectorAll('*')) {
    if ((scroller.contains(el) && el !== scroller) || (weeksRow.contains(el) && el !== weeksRow)) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    if (r.right > rr.right + 0.5 || r.bottom > rr.bottom + 0.5 || r.left < rr.left - 0.5 || r.top < rr.top - 0.5) problems.push(`outside the card: ${el.tagName} ${String(el.className).slice(0, 50)}`);
  }
  if (scroller.scrollWidth > scroller.clientWidth + 1) problems.push(`the tie list scrolls sideways (${scroller.scrollWidth} > ${scroller.clientWidth})`);
  for (const el of root.querySelectorAll('*')) {
    if (el === scroller || el === weeksRow) continue;
    const s = getComputedStyle(el);
    if (s.textOverflow === 'ellipsis') continue;
    if (s.overflowX !== 'visible' && el.scrollWidth > el.clientWidth + 1) problems.push(`scrolls inside: ${el.tagName} ${String(el.className).slice(0, 40)}`);
  }
  const small = [];
  for (const b of root.querySelectorAll('button')) {
    const r = b.getBoundingClientRect();
    if (r.height < 43.5 || r.width < 43.5) small.push(`${b.textContent} ${r.width.toFixed(0)}x${r.height.toFixed(0)}`);
  }
  if (small.length) problems.push(`controls under 44 px: ${small.join('; ')}`);
  const tiny = [];
  for (const el of root.querySelectorAll('*')) {
    const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    if (own && parseFloat(getComputedStyle(el).fontSize) < 12) tiny.push(`${el.textContent.trim().slice(0, 20)} ${getComputedStyle(el).fontSize}`);
  }
  if (tiny.length) problems.push(`text under 12 px: ${tiny.join('; ')}`);
  if (document.documentElement.scrollWidth > window.innerWidth) problems.push(`the page scrolls sideways (${document.documentElement.scrollWidth} > ${window.innerWidth})`);
  const truncated = [...root.querySelectorAll('span')].filter(s => getComputedStyle(s).textOverflow === 'ellipsis' && s.scrollWidth > s.clientWidth + 1).map(s => s.textContent);
  const lis = [...scroller.querySelectorAll('li')];
  const inView = el => { const r = el.getBoundingClientRect(); return r.top >= sr.top - 0.5 && r.bottom <= sr.bottom + 0.5; };
  const mine = root.querySelector('[data-bracket-mine]');
  const chips = [...weeksRow.querySelectorAll('button')];
  const chipsFit = weeksRow.scrollWidth <= weeksRow.clientWidth + 1;
  /* the fixer's two points (the review's W1 and W2): his tie in the list's view, the shown week's chip in the row's */
  if (mine && !inView(mine)) problems.push(`his tie (row ${lis.indexOf(mine) + 1} of ${lis.length}) is outside the list's view`);
  const pressed = chips.find(c => c.getAttribute('aria-pressed') === 'true');
  const wr = weeksRow.getBoundingClientRect();
  const pr = pressed ? pressed.getBoundingClientRect() : null;
  if (!pr || pr.left < wr.left - 0.5 || pr.right > wr.right + 0.5) problems.push(`the shown week's chip (${pressed ? pressed.textContent : 'none'}) is outside the chip row's view`);
  return {
    face: root.getAttribute('data-bracket-face'), place: root.querySelector('[data-bracket-place]').textContent,
    box: Math.round(box.getBoundingClientRect().height), scroller: [Math.round(scroller.clientHeight), Math.round(scroller.scrollHeight)],
    rows: lis.length, rowsInView: lis.filter(inView).length, mineInView: mine ? inView(mine) : null, mineIndex: mine ? lis.indexOf(mine) : null,
    chips: chips.map(c => `${c.textContent}${c.getAttribute('aria-pressed') === 'true' ? '*' : ''}`), chipsFit,
    lines: lis.map(li => [...li.querySelectorAll('[data-bracket-side]')].map(s => s.textContent.trim().replace(/\s+/g, ' ')).join(' | ')),
    truncated, problems,
  };
};

const errors = [];
const results = [];
const browser = await chromium.launch();
for (const [w, h] of [[320, 640], [390, 844], [1280, 900]]) {
  for (const rm of ['reduce', 'no-preference']) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: rm });
    const page = await ctx.newPage();
    await page.route(/supabase\.co/, r => r.abort());
    page.on('pageerror', e => errors.push(`${w} ${rm} pageerror ${e.message}`));
    page.on('console', m => { if (m.type() === 'error') errors.push(`${w} ${rm} console ${m.text().slice(0, 200)}`); });
    await page.setContent(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}</style></head><body class="bg-background text-foreground"><div id="root"></div></body></html>`);
    await page.addScriptTag({ content: js });
    const faces = await page.evaluate(() => window.__faces);
    const expect = await page.evaluate(() => window.__expect);
    if (w === 320 && rm === 'reduce') console.log(`season ${await page.evaluate(() => window.__season)}; seeds ${(await page.evaluate(() => window.__seeds)).join(', ')}; told ${await page.evaluate(() => window.__told)}`);
    for (const face of faces) {
      await page.evaluate(f => window.__mount(f, false), face);
      await page.waitForSelector('[data-bracket]');
      const m = await page.evaluate(MEASURE);
      if (m.place !== expect[face]) m.problems.push(`place line "${m.place}" where the bracket says "${expect[face]}"`);
      results.push({ w, rm, face, ...m });
      if (rm === 'reduce') await page.locator('[data-week-panel]').screenshot({ path: path.join(OUT, `${w}-${face}.png`) });
    }
    /* the champion's card: tap the Wild Card chip, then "Your game", then the "?" twice, in a box with a help host */
    await page.evaluate(() => window.__mount('champion', true));
    await page.waitForSelector('[data-bracket]');
    const y0 = await page.evaluate(() => window.scrollY);
    await page.click('[data-bracket-week="1"]');
    const wc = await page.evaluate(MEASURE);
    results.push({ w, rm, face: 'champion+wildcard-chip', ...wc });
    if (rm === 'reduce') await page.locator('[data-week-panel]').screenshot({ path: path.join(OUT, `${w}-champion-wildcard.png`) });
    await page.click('[data-bracket-week="4"]');
    const sb = await page.evaluate(MEASURE);
    results.push({ w, rm, face: 'champion+superbowl-chip', ...sb });
    const opens = await page.locator('[data-bracket-open]').count();
    if (opens) await page.click('[data-bracket-open]');
    const opened = await page.evaluate(() => window.__opened.slice());
    await page.click('[data-bracket-help]');
    const sheet1 = await page.evaluate(() => { const d = document.querySelector('[role="dialog"]'); if (!d) return null; const r = d.getBoundingClientRect(); const b = document.querySelector('[data-week-panel]').getBoundingClientRect(); return { top: Math.round(r.top - b.top), h: Math.round(r.height), boxH: Math.round(b.height), inHost: !!d.closest('[data-help-host]'), text: d.textContent.slice(0, 80) }; });
    if (rm === 'reduce') await page.screenshot({ path: path.join(OUT, `${w}-help-open.png`) });
    await page.getByRole('button', { name: 'Got it' }).click();
    const closed = await page.evaluate(() => ({ dialog: !!document.querySelector('[role="dialog"]'), focus: document.activeElement && document.activeElement.hasAttribute('data-bracket-help') }));
    await page.click('[data-bracket-help]');
    const again = await page.evaluate(() => !!document.querySelector('[role="dialog"]'));
    await page.getByRole('button', { name: 'Got it' }).click();
    const y1 = await page.evaluate(() => window.scrollY);
    results.push({ w, rm, face: 'controls', opens, opened, sheet1, closed, again, scrollMoved: y1 !== y0, problems: [] });
    if (w === 390 && rm === 'reduce') {
      await page.evaluate(() => document.documentElement.classList.add('dark'));
      await page.evaluate(() => window.__mount('div-next', false));
      await page.locator('[data-week-panel]').screenshot({ path: path.join(OUT, `390-div-next-dark.png`) });
    }
    await ctx.close();
  }
}
await browser.close();
fs.writeFileSync(path.join(OUT, 'walk.json'), JSON.stringify({ errors, results }, null, 1));
for (const r of results) {
  if (r.face === 'controls') { console.log(`${r.w} ${r.rm} controls: Your game buttons ${r.opens}, opened ${JSON.stringify(r.opened)}, sheet ${JSON.stringify(r.sheet1)}, closed ${JSON.stringify(r.closed)}, reopened ${r.again}, page moved ${r.scrollMoved}`); continue; }
  console.log(`${r.w} ${r.rm} ${r.face}: "${r.place}" box ${r.box} list ${r.scroller.join('/')} rows ${r.rowsInView}/${r.rows} mine ${r.mineIndex}${r.mineInView === false ? ' HIDDEN' : ''} chips ${r.chips.join(',')}${r.chipsFit ? '' : ' (scroll)'} cut ${r.truncated.length}${r.problems.length ? ` PROBLEMS ${r.problems.join(' || ')}` : ''}`);
}
for (const r of results.filter(x => x.w === 390 && x.rm === 'reduce' && x.lines)) console.log(`390 lines ${r.face}: ${r.lines.join(' ;; ')}`);
const bad = results.reduce((n, r) => n + r.problems.length, 0);
console.log(`errors: ${errors.length ? errors.join(' || ') : 'none'}`);
console.log(`walk: ${results.length} measures over 6 contexts, ${bad} problems, ${errors.length} page errors`);
process.exit(bad || errors.length ? 1 : 0);
