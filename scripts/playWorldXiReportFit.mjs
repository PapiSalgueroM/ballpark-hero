/* Round 726: the season report's two panels (SeasonReportTabs) at phone
   widths, in real Chromium, inside the same nesting the two pages give it.
   This is a component fixture, not a page navigation: the real component
   and a real season from the real engine, drawn into copies of World XI's
   two padded cards and Build Your XI's one, with CSS generated from the
   project's own Tailwind config and index.css. All generated files stay in a
   temp folder outside the source tree.

   Why it exists: the first build of these panels used a seven column player
   grid (13.2rem of fixed columns plus gaps). Inside World XI's two cards that
   left the name column 0px wide at 320 to 375 (every name invisible) and 13px
   at 390, and the months panel scrolled the page sideways by 48px at 320.
   No harness looked; a reviewer asked and a probe measured it.

   HOLDS, at 320, 360, 375, 390, 414, 640, 768 and 1024 wide, in both nestings:
     fit     the player name column is at least NAME_FLOOR px wide, no name is
             cut off, no cell runs past its row, no month's standout is cut
             off, and the page never scrolls sideways with either panel open;
     still   opening a panel, and switching from one to the other, moves
             neither toggle and does not change the scroll position (the page
             must not jump).
   Measured 2026-10-01 after the fix: the narrowest name column was 94px
   (320 wide, World XI, where the longest name wraps to two lines), every
   other case 134px or more; 0 names or standouts cut, 0px sideways scroll,
   0px toggle movement everywhere. NAME_FLOOR is 60, well under the 94.
   Before the fix the same fixture read 0px, 11 of 11 names cut and 10 of 10
   standouts cut at 375 on World XI.

   Negative control (WORLD_XI_FIT_CONTROL=oneline) puts back the one line
   seven column rows and the one line month rows the round first shipped,
   asserting each string it replaces exists exactly once, and exits 0 only if
   the fit check fails.

   Run: node scripts/playWorldXiReportFit.mjs */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from './lib/playwrightLoader.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const require = createRequire(import.meta.url);
const WIDTHS = [320, 360, 375, 390, 414, 640, 768, 1024];
const NAME_FLOOR = 60;
const CONTROL = process.env.WORLD_XI_FIT_CONTROL || '';
if (CONTROL && CONTROL !== 'oneline') { console.error(`WORLD_XI_FIT_CONTROL=${CONTROL} is not a control this harness knows (oneline)`); process.exit(1); }
const abort = m => { console.error(`playWorldXiReportFit: cannot run: ${m}`); process.exit(2); };
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8').replace(/\r\n/g, '\n');

/* The fixture copies the pages' nesting, so it must still be the pages'. */
const NESTING = [
  ['src/components/game/GameShell.tsx', "'relative mx-auto px-4 py-6 md:py-10'"],
  ['src/pages/WorldXi.tsx', 'className="bg-card border border-border rounded-2xl p-5 md:p-6"'],
  ['src/pages/WorldXi.tsx', 'className="mt-5 rounded-2xl border border-primary/30 bg-surface-1 p-5"'],
  ['src/pages/LineupBuilder.tsx', 'className="max-w-xl mx-auto"'],
  ['src/pages/LineupBuilder.tsx', 'className="rounded-2xl border border-primary/30 bg-surface-1 p-4 mb-2 text-left"'],
];
for (const [file, needle] of NESTING) if (!read(file).includes(needle)) abort(`${file} no longer carries ${needle}, so this fixture no longer matches the page; update the fixture below`);

let esbuild;
try { esbuild = require('esbuild'); } catch { abort('esbuild not found in any node_modules above the repo'); }
const REACT = (() => { try { return require.resolve('react/package.json'); } catch { return null; } })();
if (!REACT) abort('react not found in any node_modules above the repo');
const MODULES = path.dirname(path.dirname(REACT));
const TW_CLI = path.join(path.dirname(require.resolve('tailwindcss/package.json')), 'lib/cli.js');
if (!fs.existsSync(TW_CLI)) abort('the tailwindcss CLI was not found');

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), `dukb-wxfit-${process.pid}-`));
const cleanup = () => fs.rmSync(TMP, { recursive: true, force: true });

/* The component, rewritten in memory for the control. */
let tabs = read('src/components/world-xi/SeasonReportTabs.tsx');
const rewrite = (needle, replacement) => {
  const count = tabs.split(needle).length - 1;
  if (count !== 1) { cleanup(); abort(`SeasonReportTabs.tsx carries "${needle.slice(0, 70)}" ${count} times, not once`); }
  tabs = tabs.replace(needle, () => replacement);
};
if (CONTROL === 'oneline') {
  rewrite('grid grid-cols-[2.4rem_minmax(0,1fr)_auto] sm:grid-cols-[2.4rem_1fr_2.2rem_2rem_2rem_2rem_2.6rem] gap-x-1 gap-y-0.5', 'grid grid-cols-[2.4rem_1fr_2.2rem_2rem_2rem_2rem_2.6rem] gap-1');
  rewrite('font-semibold text-foreground min-w-0 break-words sm:truncate', 'font-semibold text-foreground truncate min-w-0');
  rewrite('col-start-2 col-span-2 row-start-2 flex flex-wrap gap-x-2 text-muted-foreground sm:contents', 'contents');
  rewrite('mt-3 grid grid-cols-1 gap-1.5 text-left', 'mt-3 grid gap-1.5 text-left');
  rewrite('flex flex-wrap items-baseline gap-x-2 text-sm', 'flex items-baseline gap-2 text-sm');
  rewrite('w-full sm:w-auto sm:ml-auto text-xs text-muted-foreground min-w-0 sm:truncate', 'ml-auto text-xs text-muted-foreground truncate min-w-0');
  console.log('NEGATIVE CONTROL ON: the one line seven column player rows and one line month rows are back');
}
const TABS = path.join(TMP, 'SeasonReportTabs.tsx');
fs.writeFileSync(TABS, tabs);

/* A real season from the real engine. */
esbuild.buildSync({
  entryPoints: [path.join(ROOT, 'src/lib/worldXi.ts')], bundle: true, format: 'esm', platform: 'node',
  alias: { '@': `${ROOT_URL}/src` }, nodePaths: [MODULES], outfile: path.join(TMP, 'worldXi.mjs'), logLevel: 'error',
});
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { store.set(k, String(v)); },
    removeItem: k => { store.delete(k); }, clear: () => store.clear(), key: i => [...store.keys()][i] ?? null,
    get length() { return store.size; },
  };
}
const { simulateWorldXiSeason } = await import(pathToFileURL(path.join(TMP, 'worldXi.mjs')).href);
/* Eleven real names, the longest of them as long as names in the pool get. */
const NAMES = [
  ['Thibaut Courtois', 'GK'], ['Trent Alexander-Arnold', 'RB'], ['Virgil van Dijk', 'CB'], ['Ruben Dias', 'CB'],
  ['Theo Hernandez', 'LB'], ['Rodri', 'CDM'], ['Jude Bellingham', 'CAM'], ['Pedri', 'CM'],
  ['Bukayo Saka', 'RW'], ['Vinicius Junior', 'LW'], ['Erling Haaland', 'ST'],
];
const squad = NAMES.map(([name, position], i) => ({ name, country: 'x', position, club: 'x', value: 120_000_000 + i * 3_000_000, age: 20 + i }));
const report = simulateWorldXiSeason(squad, '4-3-3');
if (!report.months?.length || !report.playerStats?.length) { cleanup(); abort('the engine returned a report without months or player stats'); }

/* The client bundle: the component, mounted twice. */
fs.writeFileSync(path.join(TMP, 'client.tsx'), `
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { SeasonReportTabs } from '${TABS.replaceAll('\\', '/')}';
const report = (window as any).__REPORT__;
for (const el of Array.from(document.querySelectorAll('[data-mount]'))) createRoot(el).render(<SeasonReportTabs report={report} />);
`);
esbuild.buildSync({
  entryPoints: [path.join(TMP, 'client.tsx')], bundle: true, format: 'iife', platform: 'browser', jsx: 'automatic',
  alias: { '@': `${ROOT_URL}/src` }, nodePaths: [MODULES],
  define: { 'process.env.NODE_ENV': '"production"', 'import.meta.env': '{"DEV":false,"PROD":true,"MODE":"production"}' },
  outfile: path.join(TMP, 'client.js'), logLevel: 'error',
});

const escapeHtml = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const narrative = report.narrative.map(l => `<p class="bg-background/60 border border-border/50 rounded-lg px-3 py-2 text-foreground/90">${escapeHtml(l)}</p>`).join('');
fs.writeFileSync(path.join(TMP, 'page.html'), `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="out.css"></head>
<body class="bg-background text-foreground"><main class="min-h-screen bg-background">
<div class="relative mx-auto px-4 py-6 md:py-10 max-w-2xl" id="wx">
  <div class="bg-card border border-border rounded-2xl p-5 md:p-6">
    <div class="mt-5 rounded-2xl border border-primary/30 bg-surface-1 p-5">
      <div class="grid gap-1.5 text-sm">${narrative}</div>
      <div data-mount="wx"></div>
    </div>
  </div>
</div>
<div class="relative mx-auto px-4 py-6 md:py-10 max-w-2xl" id="lb">
  <div class="max-w-xl mx-auto">
    <div class="rounded-2xl border border-primary/30 bg-surface-1 p-4 mb-2 text-left">
      <div class="grid gap-1.5 text-sm">${narrative}</div>
      <div data-mount="lb"></div>
    </div>
  </div>
</div>
</main>
<script>window.__REPORT__ = ${JSON.stringify(report).replace(/</g, '\\u003c')};</script>
<script src="client.js"></script></body></html>`);
const tw = spawnSync(process.execPath, [TW_CLI, '-c', path.join(ROOT, 'tailwind.config.ts'), '-i', path.join(ROOT, 'src/index.css'),
  '--content', `${TMP.replaceAll('\\', '/')}/page.html,${TABS.replaceAll('\\', '/')}`, '-o', path.join(TMP, 'out.css')], { cwd: ROOT, encoding: 'utf8' });
if (tw.status !== 0) { console.error(tw.stderr); cleanup(); abort('the Tailwind CLI failed'); }
const css = fs.readFileSync(path.join(TMP, 'out.css'), 'utf8');
if (!css.includes('.bg-surface-1') || !css.includes('--primary')) { cleanup(); abort('the generated CSS lacks the project tokens'); }

let failures = 0;
const failuresBy = {};
const fail = (m, key) => { failures += 1; failuresBy[key] = (failuresBy[key] ?? 0) + 1; if (failuresBy[key] <= 12) console.error(`  FAIL [${key}]: ${m}`); };

const browser = await chromium.launch();
let narrowest = Infinity, cases = 0;
try {
  for (const width of WIDTHS) {
    const page = await browser.newPage({ viewport: { width, height: 800 } });
    await page.goto(pathToFileURL(path.join(TMP, 'page.html')).href);
    await page.waitForSelector('[data-mount] button');
    for (const host of ['wx', 'lb']) {
      cases += 1;
      const at = `${width}px ${host === 'wx' ? 'World XI' : 'Build Your XI'}`;
      const box = `#${host} [data-mount]`;
      /* Toggles: 0 is Month by month, 1 is Player stats. */
      const before = await page.evaluate(b => {
        const btn = document.querySelector(b).querySelectorAll('button')[1];
        btn.scrollIntoView({ block: 'center' });
        return { y: btn.getBoundingClientRect().top, sy: window.scrollY };
      }, box);
      const click = i => page.evaluate(([b, n]) => document.querySelector(b).querySelectorAll('button')[n].click(), [box, i]);
      await click(1);
      await page.waitForTimeout(50);
      const players = await page.evaluate(b => {
        const root = document.querySelector(b);
        const btn = root.querySelectorAll('button')[1];
        const panel = root.querySelector('.overflow-hidden');
        const rows = panel ? Array.from(panel.children).slice(1, -1) : [];
        const names = rows.map(r => r.children[1]);
        return {
          y: btn.getBoundingClientRect().top, sy: window.scrollY, rows: rows.length,
          cut: names.filter(n => n.scrollWidth > n.clientWidth + 1).map(n => n.textContent),
          spill: rows.filter(r => Array.from(r.querySelectorAll('span')).some(s => s.getClientRects().length && s.getBoundingClientRect().right > r.getBoundingClientRect().right + 0.5)).length,
          nameW: names.length ? Math.min(...names.map(n => n.getBoundingClientRect().width)) : 0,
          sideways: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        };
      }, box);
      await click(0);
      await page.waitForTimeout(50);
      const months = await page.evaluate(b => {
        const root = document.querySelector(b);
        const btn = root.querySelectorAll('button')[1];
        const standouts = Array.from(root.querySelectorAll('span')).filter(s => s.textContent.startsWith('Standout:'));
        return {
          y: btn.getBoundingClientRect().top, sy: window.scrollY, standouts: standouts.length,
          cut: standouts.filter(s => s.scrollWidth > s.clientWidth + 1).length,
          sideways: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        };
      }, box);
      await click(0);
      narrowest = Math.min(narrowest, players.nameW);
      if (players.rows !== report.playerStats.length) fail(`${at}: ${players.rows} player rows for ${report.playerStats.length} players`, 'fit');
      if (players.nameW < NAME_FLOOR) fail(`${at}: the name column is ${Math.round(players.nameW)}px wide (floor ${NAME_FLOOR})`, 'fit');
      if (players.cut.length) fail(`${at}: ${players.cut.length} names cut off (${players.cut.slice(0, 3).join(', ')})`, 'fit');
      if (players.spill) fail(`${at}: ${players.spill} player rows with a cell past the row's edge`, 'fit');
      if (players.sideways > 0 || months.sideways > 0) fail(`${at}: the page scrolls sideways by ${players.sideways}px (players) and ${months.sideways}px (months)`, 'fit');
      if (months.standouts !== report.months.filter(m => m.standout).length) fail(`${at}: ${months.standouts} standouts drawn`, 'fit');
      if (months.cut) fail(`${at}: ${months.cut} of ${months.standouts} month standouts cut off`, 'fit');
      if (Math.abs(players.y - before.y) > 1 || Math.abs(months.y - before.y) > 1) fail(`${at}: the Player stats toggle moved ${Math.round(players.y - before.y)}px opening it and ${Math.round(months.y - before.y)}px switching to months`, 'still');
      if (players.sy !== before.sy || months.sy !== before.sy) fail(`${at}: the scroll position went ${before.sy} to ${players.sy} to ${months.sy}`, 'still');
      console.log(`   ${at}: name column ${Math.round(players.nameW)}px, ${players.cut.length} names and ${months.cut} standouts cut, sideways ${players.sideways}/${months.sideways}px, toggle moved ${Math.round(players.y - before.y)}/${Math.round(months.y - before.y)}px`);
    }
    await page.close();
  }
} finally {
  await browser.close();
  cleanup();
}
if (cases !== WIDTHS.length * 2) fail(`${cases} cases measured, ${WIDTHS.length * 2} expected`, 'fit');
const tally = Object.entries(failuresBy).map(([k, n]) => `${k} ${n}`).join(', ');
if (CONTROL) {
  if (failuresBy.fit) { console.log(`\ncontrol "${CONTROL}": the fit check fired ${failuresBy.fit} time(s) (all failures: ${tally}), the check works`); process.exit(0); }
  console.error(`\ncontrol "${CONTROL}": the fit check did NOT fire (${tally || 'nothing failed'}), the check is dead`);
  process.exit(1);
}
if (failures) { console.error(`\nplayWorldXiReportFit: ${failures} failure(s) (${tally})`); process.exit(1); }
console.log(`\nplayWorldXiReportFit: green. ${cases} cases, the narrowest name column ${Math.round(narrowest)}px, nothing cut, nothing sideways, nothing jumps.`);
