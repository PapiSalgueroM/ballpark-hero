/**
 * Round 954 harness: the Perfect Season verdict, one card for all four sports.
 *
 * WHY. The four Perfect Season pages each ended on a copied card (a static
 * emoji, a headline, a paragraph), so a 17-0 season and a 4-13 one arrived
 * the same way. src/components/perfect-season/SeasonVerdict.tsx is the one
 * card now: the shared result moment with the record as its score, the win
 * state and confetti only for an unbeaten season, and "New personal best."
 * slamming in (cm-slam) only when the run set it. src/test/
 * perfectSeasonVerdict.test.tsx checks those states in jsdom for four sports
 * by four fixtures. This harness holds the two things jsdom cannot:
 *
 * 1) wiring  each page hands the card the sim's own record (wins={sim.wins},
 *            losses={sim.losses}, perfect={sim.perfect}) and its own route, so
 *            the printed record is exactly the sim's, never a recount.
 * 2) layout  in Chromium, nothing moves while it plays: layout boxes
 *            (offsetTop and offsetHeight, which ignore transforms) of the card,
 *            the moment, the line under it, the best line and the last button
 *            are identical with every animation held at 0 ms and at 5000 ms, at
 *            390 and 1440 wide; the page never scrolls sideways.
 * 3) reduced under prefers-reduced-motion the slammed line is fully visible
 *            on the first frame; otherwise it starts hidden and settles at 1.
 *
 * MEASURED (2026-10-03, base 64d5be42, four fixtures: NFL 17-0 new best, NBA
 * 80-2, MLB 61-101, NHL 62-20 new best). It is deterministic (no seeds, no
 * clock: the confetti positions come from a fixed hash), so the bands are
 * exact: card height at 390 is 733 px for the perfect fixture and 791 px for
 * the other three, at 1440 581 and 577; moved boxes 0 in all 16 renders;
 * sideways bleed 0; slam opacity 0 then 1 with motion, 1 at once under reduce.
 * Heights are printed, not asserted (they follow the theme's type scale).
 *
 * Nothing leaves the page: every request is answered in it, so the supabase
 * client a shared import pulls in never reaches the network.
 *
 * NEGATIVE CONTROLS (SIM_SEASON_VERDICT_CONTROL=<name>; a control exits 0 only when it
 *   turned its own check red and nothing else):
 *   wiring  the NFL page passes losses={0} instead of the sim's (wiring)
 *   shift   the slam keyframe animates margin-top, which pushes the page (layout)
 *   motion  every prefers-reduced-motion rule (the kit's and the blanket in
 *           src/index.css) is renamed away, so the slam plays under reduce (reduced)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import postcss from 'postcss';
import tailwind from 'tailwindcss';
import { chromium } from './lib/playwrightLoader.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const control = process.env.SIM_SEASON_VERDICT_CONTROL || '';
const CONTROLS = { wiring: 'wiring', shift: 'layout', motion: 'reduced' };
if (control && !CONTROLS[control]) { console.error(`unknown control ${control}; known: ${Object.keys(CONTROLS).join(', ')}`); process.exit(2); }
const checks = { wiring: [], layout: [], reduced: [] };
const fail = (check, msg) => { checks[check].push(msg); console.error(`  FAIL [${check}] ${msg}`); };
/** A control that cannot find its string changes nothing; refuse rather than pass. */
function mutateOnce(rawText, before, after, what) {
  const text = rawText.replace(/\r\n/g, '\n');
  if (!text.includes(before)) { console.error(`control ${control} refused: ${what} no longer contains ${JSON.stringify(before)}`); process.exit(2); }
  return text.replace(before, after);
}

/* ---------- 1. wiring ---------- */
const PAGES = { nfl: 'PerfectSeasonNfl', nba: 'PerfectSeasonNba', mlb: 'PerfectSeasonMlb', nhl: 'PerfectSeasonNhl' };
console.log('1) wiring: each page hands the card the sim\'s own record and its own route');
for (const [sport, name] of Object.entries(PAGES)) {
  let src = read(`src/pages/${name}.tsx`).replace(/\r\n/g, '\n');
  if (control === 'wiring' && sport === 'nfl') src = mutateOnce(src, 'losses={sim.losses}', 'losses={0}', `${name}.tsx`);
  // read the code, not the comments that explain it
  src = src.replace(/\/\*[\s\S]*?\*\//g, '');
  const start = src.indexOf('<SeasonVerdict');
  const end = start < 0 ? -1 : src.indexOf('/>\n', start);
  if (start < 0 || end < 0) { fail('wiring', `${name} no longer renders <SeasonVerdict>`); continue; }
  const tag = src.slice(start, end);
  if ((src.match(/<SeasonVerdict\b/g) || []).length !== 1) fail('wiring', `${name} renders <SeasonVerdict> more than once`);
  for (const want of ['wins={sim.wins}', 'losses={sim.losses}', 'perfect={sim.perfect}', `gamePath="/perfect-season-${sport}"`, 'odds={<SeasonOddsLines sport={SPORT_KEY}']) {
    if (!tag.includes(want)) fail('wiring', `${name}'s <SeasonVerdict> does not pass ${want}`);
  }
  const closeAt = (tag.match(/closeAt=\{(\d+)\}/) || [])[1];
  if (!closeAt) fail('wiring', `${name} passes no numeric closeAt`);
  console.log(`   ${sport}: record from the sim, route /perfect-season-${sport}, close tier from ${closeAt} wins`);
}

/* ---------- 2 and 3. the rendered card, in Chromium ---------- */
const stylesFile = path.join(root, 'src/components/club-manager/CelebrationStyles.tsx');
let stylesSrc = fs.readFileSync(stylesFile, 'utf8');
if (control === 'shift') stylesSrc = mutateOnce(stylesSrc, '@keyframes cmSlam { 0% { opacity: 0; transform: scale(1.6); }', '@keyframes cmSlam { 0% { opacity: 0; transform: scale(1.6); margin-top: 40px; }', 'CelebrationStyles.tsx');
if (control === 'motion') stylesSrc = mutateOnce(stylesSrc, 'prefers-reduced-motion: reduce', 'prefers-reduced-motion: no-such-preference', 'CelebrationStyles.tsx');

const bundle = await build({
  stdin: {
    contents: `import React from 'react'; import {createRoot} from 'react-dom/client'; import {MemoryRouter} from 'react-router-dom';
      import {SeasonVerdict} from './src/components/perfect-season/SeasonVerdict';
      import {SeasonOddsLines} from './src/components/perfect-season/SeasonOdds';
      const root = createRoot(document.getElementById('root'));
      window.verdict = p => {
        const odds = React.createElement(SeasonOddsLines, { sport: p.sport, overall: p.overall, perfect: p.perfect, best: p.best, newBest: p.newBest });
        const card = React.createElement(SeasonVerdict, { ...p, odds, onRestart: () => {} });
        root.render(React.createElement(MemoryRouter, null, React.createElement('main', {style: {padding: '16px'}}, React.createElement('div', {className: 'max-w-2xl mx-auto'}, card))));
      };`,
    resolveDir: root, loader: 'jsx',
  },
  bundle: true, write: false, format: 'iife', platform: 'browser', jsx: 'automatic', logLevel: 'silent',
  alias: { '@': path.join(root, 'src') },
  define: { 'import.meta.env.DEV': 'false', 'import.meta.env.PROD': 'true', 'import.meta.env.MODE': '"production"' },
  plugins: [{ name: 'styles-under-test', setup(b) {
    b.onLoad({ filter: /CelebrationStyles\.tsx$/ }, () => ({ contents: stylesSrc, loader: 'tsx', resolveDir: path.dirname(stylesFile) }));
  } }],
});
const configOutput = await build({ entryPoints: [path.join(root, 'tailwind.config.ts')], write: false, format: 'cjs', platform: 'node', logLevel: 'silent' });
const configModule = { exports: {} };
new Function('module', 'exports', 'require', configOutput.outputFiles[0].text)(configModule, configModule.exports, createRequire(import.meta.url));
const content = ['src/components/perfect-season/SeasonVerdict.tsx', 'src/components/perfect-season/SeasonOdds.tsx', 'src/components/game/ResultMoment.tsx', 'src/components/game/ShareButtons.tsx', 'src/components/home/SportGlyph.tsx'].map(read).join('\n');
/* The site has two layers of reduced motion: the kit's own rule and the
   blanket in src/index.css that shortens every animation to 0.001ms. The
   motion control removes both, or it could never turn the check red. */
let indexCss = read('src/index.css');
if (control === 'motion') {
  if (!indexCss.includes('prefers-reduced-motion: reduce')) { console.error('control motion refused: src/index.css has no reduced motion rule'); process.exit(2); }
  indexCss = indexCss.split('prefers-reduced-motion: reduce').join('prefers-reduced-motion: no-such-preference');
}
const css = await postcss([tailwind({ ...configModule.exports.default, content: [{ raw: content, extension: 'tsx' }] })]).process(indexCss, { from: path.join(root, 'src/index.css') });

const FIXTURES = [
  { name: 'nfl 17-0 best', gamePath: '/perfect-season-nfl', sport: 'nfl', wins: 17, losses: 0, perfect: true, closeAt: 12, newBest: true },
  { name: 'nba 80-2', gamePath: '/perfect-season-nba', sport: 'nba', wins: 80, losses: 2, perfect: false, closeAt: 60, newBest: false },
  { name: 'mlb 61-101', gamePath: '/perfect-season-mlb', sport: 'mlb', wins: 61, losses: 101, perfect: false, closeAt: 110, newBest: false },
  { name: 'nhl 62-20 best', gamePath: '/perfect-season-nhl', sport: 'nhl', wins: 62, losses: 20, perfect: false, closeAt: 55, newBest: true },
];
const html = `<!doctype html><html><head><meta charset="utf-8"><style>${css.css}</style></head><body class="bg-background text-foreground"><div id="root"></div></body></html>`;
let renders = 0;
const browser = await chromium.launch({ args: ['--no-sandbox'] });
try {
  console.log('2) layout: nothing moves while it plays, no sideways bleed   3) reduced: the slam is visible at once under reduce');
  for (const [width, height] of [[390, 844], [1440, 900]]) {
    for (const reducedMotion of ['no-preference', 'reduce']) {
      const page = await browser.newPage({ viewport: { width, height }, reducedMotion });
      page.on('pageerror', e => fail('layout', `page error: ${e.message}`));
      await page.route('**/*', route => route.fulfill({ status: 200, contentType: 'text/html', body: html }));
      await page.goto('http://127.0.0.1:4173/season-verdict-fixture');
      await page.addScriptTag({ content: bundle.outputFiles[0].text });
      for (const f of FIXTURES) {
        const best = { v: 1, wins: f.newBest ? f.wins : f.wins + 1, losses: f.newBest ? f.losses : f.losses - 1, overall: 88, date: '2026-10-01', mode: 'classic' };
        await page.evaluate(p => window.verdict(p), { ...f, best, badge: f.perfect ? '\u{1F3C6}' : '\u{1F4C9}', headline: f.perfect ? 'PERFECT SEASON!' : 'The wheel giveth, the wheel taketh.', overallLabel: 88, overall: 87.6, spins: 9, shareName: 'Perfect Season', emojiGrid: '\u{1F7E9}\u{1F7E5}' });
        await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
        const box = () => page.evaluate(() => {
          const card = document.querySelector('[data-season-verdict]');
          const r = el => { if (!el) return null; let top = 0; for (let n = el; n && n !== document.body; n = n.offsetParent) top += n.offsetTop; return [top, el.offsetHeight]; };
          const m = card.querySelector('[data-result-moment]');
          const nb = card.querySelector('[data-new-best]');
          const buttons = card.querySelectorAll('button');
          return { card: r(card), moment: r(m), meta: r(m.nextElementSibling), best: r(card.querySelector('[data-best-record]')), button: r(buttons[buttons.length - 1]), slam: nb ? getComputedStyle(nb).opacity : null, score: m.querySelector('[data-result-score]')?.textContent, bleed: document.documentElement.scrollWidth - document.documentElement.clientWidth };
        });
        const holdAt = t => page.evaluate(t => { for (const a of document.getAnimations()) { a.pause(); a.currentTime = t; } }, t);
        await holdAt(0); const first = await box();
        await holdAt(5000); const last = await box();
        renders += 1;
        const tag = `${width} ${reducedMotion} ${f.name}`;
        const moved = ['card', 'moment', 'meta', 'best', 'button'].filter(k => JSON.stringify(first[k]) !== JSON.stringify(last[k]));
        console.log(`   ${tag.padEnd(34)} card ${last.card[1]}px, moved [${moved.join(',')}], bleed ${last.bleed}, slam ${first.slam} then ${last.slam}`);
        for (const k of moved) fail('layout', `${tag}: ${k} moved while it played, ${JSON.stringify(first[k])} to ${JSON.stringify(last[k])}`);
        if (last.bleed > 2) fail('layout', `${tag}: the page scrolls sideways by ${last.bleed}px`);
        if (last.score !== `${f.wins}-${f.losses}`) fail('layout', `${tag}: the moment shows "${last.score}", not ${f.wins}-${f.losses}`);
        if (f.newBest !== (last.slam !== null)) fail('reduced', `${tag}: the slammed best line is ${last.slam === null ? 'missing' : 'present'} on a ${f.newBest ? 'new' : 'standing'} best`);
        if (last.slam !== null && last.slam !== '1') fail('reduced', `${tag}: the slammed line settles at opacity ${last.slam}`);
        if (last.slam !== null && reducedMotion === 'reduce' && first.slam !== '1') fail('reduced', `${tag}: under reduce the slammed line starts at opacity ${first.slam}, not 1`);
        if (last.slam !== null && reducedMotion === 'no-preference' && first.slam === '1') fail('reduced', `${tag}: with motion the slam does not play (opacity 1 on the first frame)`);
      }
      await page.close();
    }
  }
} finally {
  await browser.close();
}
if (renders !== 16) fail('layout', `only ${renders} of 16 renders ran`);

const failed = Object.entries(checks).filter(([, v]) => v.length);
if (control) {
  // A control is green only when it turned its own check red and nothing else.
  const want = CONTROLS[control];
  const red = failed.map(([k]) => k);
  if (red.length === 1 && red[0] === want) {
    console.log(`\nsimSeasonVerdict control ${control}: green. It turned ${want} red (${checks[want].length} finding(s)) and nothing else.`);
    process.exit(0);
  }
  console.error(`\nsimSeasonVerdict control ${control}: RED. Expected only ${want} to go red, got ${red.length ? red.join(', ') : 'nothing'}.`);
  process.exit(1);
}
console.log(failed.length ? `\nsimSeasonVerdict: ${failed.map(([k, v]) => `${k} ${v.length} problem(s)`).join(', ')}` : `\nsimSeasonVerdict: green. Four pages hand the card the sim's record, ${renders} renders moved nothing, and the slam lands under either motion setting.`);
process.exit(failed.length ? 1 : 0);
