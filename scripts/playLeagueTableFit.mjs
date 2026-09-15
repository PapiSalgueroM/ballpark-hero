/*
 * The actual league card, server-rendered against the shipped stylesheet.
 * Every current and era club name, and every tycoon league name, is measured
 * both normally and as your bold club at 320, 390, 430 and 1440 pixels.
 * GameShell and Stadium Tycoon both give their content 16px horizontal padding.
 *
 * TABLE_FIT_CONTROL=nowrap restores truncation in a temporary component copy.
 * It must exit nonzero with measured clipping, and refuses a no-op mutation.
 * TABLE_FIT_CSS=/path/to/compiled.css permits a pre-build check; the default
 * always reads dist/assets. A preview stylesheet does not verify shipped CSS.
 * Run: node scripts/playLeagueTableFit.mjs
 */
import { chromium } from './lib/playwrightLoader.mjs';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CARD = path.join(ROOT, 'src/components/club-manager/LeagueTableCard.tsx');
const CONTROL = process.env.TABLE_FIT_CONTROL || '';
if (CONTROL && CONTROL !== 'nowrap') throw new Error(`Unknown TABLE_FIT_CONTROL: ${CONTROL}`);
let cardSource = fs.readFileSync(CARD, 'utf8');
if (CONTROL) {
  const needle = "'min-w-0 break-words leading-tight'";
  if (cardSource.split(needle).length !== 2) throw new Error('Control must match exactly one club-name class');
  const changed = cardSource.replace(needle, "'min-w-0 truncate leading-tight'");
  if (changed === cardSource) throw new Error('Control did not change the component');
  cardSource = changed;
  console.log('NEGATIVE CONTROL nowrap: restored truncation in the rendered temporary component');
}

const cssFiles = process.env.TABLE_FIT_CSS ? [process.env.TABLE_FIT_CSS]
  : fs.readdirSync(path.join(ROOT, 'dist/assets')).filter(f => f.endsWith('.css')).sort()
    .map(f => path.join(ROOT, 'dist/assets', f));
if (!cssFiles.length) throw new Error('DIST NOT BUILT. NOTHING WAS CHECKED.');
const css = cssFiles.map(f => fs.readFileSync(f, 'utf8')).join('\n');
console.log(`Stylesheet: ${process.env.TABLE_FIT_CSS ? 'PRE-BUILD PREVIEW' : 'shipped dist/assets'} (${cssFiles.length} file(s))`);

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'dukb-table-fit-'));
const bundle = path.join(temp, 'render.cjs');
await build({
  stdin: { contents: `
    import React from 'react';
    import { renderToStaticMarkup } from 'react-dom/server';
    import { LeagueTableCard } from './src/components/club-manager/LeagueTableCard';
    export { REAL_LEAGUES, ERA_LEAGUES } from './src/lib/clubManager';
    export { leagueNameBank, YOUR_CLUB } from './src/lib/stadiumTycoon';
    export const render = props => renderToStaticMarkup(React.createElement(LeagueTableCard, props));
  `, resolveDir: ROOT, loader: 'tsx' },
  bundle: true, format: 'cjs', platform: 'node', jsx: 'automatic', outfile: bundle,
  alias: { '@': path.join(ROOT, 'src') }, logLevel: 'error',
  plugins: [{ name: 'actual-table-card', setup(b) {
    b.onLoad({ filter: /LeagueTableCard\.tsx$/ }, () => ({ contents: cardSource, loader: 'tsx', resolveDir: path.dirname(CARD) }));
  } }],
});
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const { render, REAL_LEAGUES, ERA_LEAGUES, leagueNameBank, YOUR_CLUB } = createRequire(import.meta.url)(bundle);
const groups = [
  { label: 'Club Manager', names: [...new Set([...REAL_LEAGUES, ...Object.values(ERA_LEAGUES).flat()].flatMap(l => l.clubs))], clickable: true },
  { label: 'Stadium Tycoon', names: [...leagueNameBank(), YOUR_CLUB], clickable: false },
];
if (groups[0].names.length < 20 || groups[1].names.length < 150) throw new Error('League data missing. NOTHING WAS CHECKED.');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const browser = await chromium.launch();
const page = await browser.newPage();
let findings = 0;
let measured = 0;
try {
  for (const group of groups) {
    // Longest names lead the screenshot; every name still gets both weights.
    const names = group.names.slice().sort((a, b) => b.length - a.length || a.localeCompare(b));
    const cards = names.flatMap(club => [false, true].map(mine => {
      const rows = [{ club, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }];
      return `<section data-fit-case data-club="${esc(club)}" data-mine="${mine}">${render({ rows,
        myClub: mine ? club : '', preseason: true, onClubClick: group.clickable ? () => {} : undefined,
      })}</section>`;
    })).join('');
    for (const width of [320, 390, 430, 1440]) {
      await page.setViewportSize({ width, height: 844 });
      await page.setContent(`<!doctype html><html><head><meta name="viewport" content="width=device-width"><style>${css}</style></head>
        <body class="dark"><main class="max-w-2xl mx-auto px-4">${cards}</main></body></html>`, { waitUntil: 'load' });
      const result = await page.evaluate(() => {
        const bad = [];
        let cells = 0;
        let own = 0;
        const root = document.documentElement;
        if (root.scrollWidth > root.clientWidth + 1) bad.push(`page overflow ${root.scrollWidth - root.clientWidth}px`);
        for (const item of document.querySelectorAll('[data-fit-case]')) {
          const row = item.querySelector('[data-goals]')?.parentElement;
          if (!row || row.children.length !== 8) { bad.push('Actual component row is missing'); continue; }
          const name = row.children[1];
          const mine = item.getAttribute('data-mine') === 'true';
          const label = `${item.getAttribute('data-club')}${mine ? ' (your bold club)' : ''}`;
          cells++;
          if (mine) own++;
          if (name.textContent !== item.getAttribute('data-club')) bad.push(`${label}: wrong name text`);
          if (mine && Number.parseInt(getComputedStyle(name).fontWeight, 10) < 700) bad.push(`${label}: own club was not bold`);
          for (const cell of row.children) {
            const box = cell.getBoundingClientRect();
            const range = document.createRange();
            range.selectNodeContents(cell);
            if (cell.scrollWidth > cell.clientWidth + 1 || cell.scrollHeight > cell.clientHeight + 1
              || [...range.getClientRects()].some(r => r.left < box.left - 1 || r.right > box.right + 1)) {
              bad.push(`${label}: clipped cell "${cell.textContent}" (${cell.scrollWidth}px in ${cell.clientWidth}px)`);
            }
          }
          const box = row.getBoundingClientRect();
          if (row.scrollWidth > row.clientWidth + 1 || box.left < -1 || box.right > root.clientWidth + 1) bad.push(`${label}: row overflow`);
        }
        return { bad, cells, own, font: getComputedStyle(document.body).fontFamily };
      });
      measured += result.cells;
      if (result.cells !== names.length * 2 || result.own !== names.length) result.bad.push('Not every name and weight was measured');
      findings += result.bad.length;
      console.log(`${group.label} ${width}px: ${result.cells} name cells, ${result.own} bold own rows, ${result.bad.length} findings; font ${result.font}`);
      for (const bad of result.bad.slice(0, 5)) console.error('  FAIL: ' + bad);
      if (result.bad.length > 5) console.error(`  FAIL: ${result.bad.length - 5} further findings`);
      if (width === 320 || width === 390) await page.screenshot({ path: path.join(temp, `${group.clickable ? 'manager' : 'tycoon'}-${width}.png`) });
    }
  }
} finally {
  await browser.close();
}
console.log(`Screenshots: ${temp}`);
if (CONTROL && !findings) throw new Error('NEGATIVE CONTROL nowrap escaped: no clipping was measured');
if (findings) {
  console.error(`playLeagueTableFit: ${findings} FAILURES across ${measured} name cells${CONTROL ? ' (intentional nowrap control)' : ''}`);
  process.exitCode = 1;
} else {
  console.log(`playLeagueTableFit: green. ${measured} name cells fit at all four widths using the actual component.`);
}
