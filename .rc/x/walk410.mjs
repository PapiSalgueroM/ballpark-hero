/* Reviewer walk for PR 410 on the tree the runner holds (meant: 1568 merged onto 410, then vite build into dist).
   Plays real cup matches in node until default shootouts come out, then mounts the real LiveSimScreen at the
   whistle (live null, report set: what the page passes after resumeMatch) in a frame with the build's CSS, at
   320x568, 390x844 and 1280x800, and measures the stage and the kicks panel. Host blocked except localhost. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { pathToFileURL } from 'node:url';
import { build, buildSync } from 'esbuild';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const ROOT = process.cwd();
const OUT = process.env.RC_OUT || fs.mkdtempSync(path.join(os.tmpdir(), 'w410-'));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'w410b-'));
const realRandom = Math.random;
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {}, key: () => null, length: 0, clear: () => {} };
const eng = path.join(tmp, 'eng.mjs');
buildSync({ stdin: { contents: 'export * from ' + JSON.stringify(path.join(ROOT, 'src/lib/clubManager.ts')) + ';', resolveDir: ROOT, loader: 'js' },
  bundle: true, format: 'esm', platform: 'node', outfile: eng, logLevel: 'error', alias: { '@': path.join(ROOT, 'src') } });
const cm = await import(pathToFileURL(eng).href);
function seeded(seed, fn) {
  let a = seed | 0;
  Math.random = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  try { return fn(); } finally { Math.random = realRandom; }
}
const cup = seeded(782002, () => {
  let s = cm.startCareer('Real Madrid');
  const target = s.calendar.findIndex(e => e.type === 'cup');
  for (let g = 0; s.week < target && g < 60; g++) { const o = cm.playNextEntry(s, { skipHalftime: true, untilWeek: target }); s = o.state; if (o.kind === 'reached') break; }
  return s;
});
const found = [];
for (let seed = 1; seed <= 600 && found.length < 60; seed++) {
  const o = seeded(seed, () => cm.playNextEntry(JSON.parse(JSON.stringify(cup)), { skipHalftime: true }));
  if (o.report && o.report.decidedBy === 'pens') found.push({ seed, career: o.state, report: o.report });
}
const withKicks = found.filter(f => f.report.shootout);
console.log('pens ' + found.length + ', with kicks ' + withKicks.length);
if (!withKicks.length) { console.log('WALK410 ABORT: no default shootout with kicks'); process.exit(2); }
withKicks.sort((x, y) => y.report.shootout.kicks.length - x.report.shootout.kicks.length);
const picks = { longest: withKicks[0], shortest: withKicks[withKicks.length - 1] };
for (const [k, f] of Object.entries(picks)) console.log(k + ': seed ' + f.seed + ', ' + f.report.shootout.kicks.length + ' kicks, ' + f.report.shootout.mine + '-' + f.report.shootout.theirs + ', won ' + f.report.shootoutWon);

const client = [
  "import React from 'react';", "import { createRoot } from 'react-dom/client';",
  "import { LiveSimScreen } from '@/components/club-manager/LiveSimScreen';",
  "const which = new URLSearchParams(location.search).get('f');",
  "const props = await fetch('/fx-' + which + '.json').then(r => r.json());",
  "const noop = () => {};",
  "createRoot(document.getElementById('root')).render(React.createElement(LiveSimScreen, { career: props.career, live: null, report: props.report, clubColor: '#ffffff',",
  "  onSub: noop, onShape: noop, onTalk: noop, onSecondHalf: noop, onExit: noop, onStartSecondHalf: noop, onStartExtraTime: noop, onChange: noop, onMark: noop }));",
].join('\n');
const built = await build({ stdin: { contents: client, resolveDir: ROOT, sourcefile: 'c.jsx', loader: 'jsx' }, bundle: true, write: false,
  outdir: path.join(tmp, 'c'), platform: 'browser', format: 'esm', jsx: 'automatic', alias: { '@': path.join(ROOT, 'src') },
  define: { 'process.env.NODE_ENV': '"production"', 'import.meta.env': '{}' }, logLevel: 'error' });
const js = built.outputFiles.find(f => f.path.endsWith('.js')).contents, css = built.outputFiles.find(f => f.path.endsWith('.css'))?.contents ?? '';
const head = fs.readFileSync(path.join(ROOT, 'dist/index.html'), 'utf8').match(/<head[^>]*>([\s\S]*?)<\/head>/i)[1]
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<link\b[^>]*rel=["']modulepreload["'][^>]*>/gi, '');
const html = '<!doctype html><html class="dark"><head>' + head + '<link rel="stylesheet" href="/c.css"></head><body class="bg-background"><div id="root"></div><script type="module" src="/c.js"></script></body></html>';
const files = { '/frame.html': [html, 'text/html'], '/c.js': [js, 'text/javascript'], '/c.css': [css, 'text/css'] };
for (const k of Object.keys(picks)) files['/fx-' + k + '.json'] = [JSON.stringify({ career: picks[k].career, report: picks[k].report }), 'application/json'];
const server = http.createServer((req, res) => {
  const u = req.url.split('?')[0];
  if (files[u]) { res.writeHead(200, { 'content-type': files[u][1] }); return res.end(files[u][0]); }
  const f = path.join(ROOT, 'dist', u);
  if (u.startsWith('/assets/') && fs.existsSync(f)) { res.writeHead(200, { 'content-type': u.endsWith('.css') ? 'text/css' : u.endsWith('.js') ? 'text/javascript' : 'application/octet-stream' }); return res.end(fs.readFileSync(f)); }
  res.writeHead(404); res.end();
});
await new Promise(r => server.listen(4191, '127.0.0.1', r));
const browser = await pw.chromium.launch({ headless: true });
const problems = [];
for (const vp of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 1280, height: 800 }]) {
  for (const k of Object.keys(picks)) {
    const ctx = await browser.newContext({ viewport: vp, isMobile: vp.width < 600, hasTouch: vp.width < 600, colorScheme: 'dark' });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(String(e.message).slice(0, 200)));
    await page.route(/supabase\.co/, r => r.abort());
    await page.route(u => !String(u).startsWith('http://127.0.0.1:4191'), r => r.abort());
    await page.goto('http://127.0.0.1:4191/frame.html?f=' + k);
    let m;
    try {
      await page.waitForSelector('[data-cm-live-side="kicks"] [data-cm-shootout]', { timeout: 20000 });
      await page.waitForTimeout(600);
      m = await page.evaluate(() => {
        const r = el => { const b = el.getBoundingClientRect(); return { top: Math.round(b.top), bottom: Math.round(b.bottom), left: Math.round(b.left), right: Math.round(b.right) }; };
        const stage = document.querySelector('[data-cm-live-stagebox]'), side = document.querySelector('[data-cm-live-side="kicks"]');
        const list = side.querySelector('[data-cm-shootout]'), rows = [...list.querySelectorAll('[data-cm-pen-kick]')];
        const ft = [...document.querySelectorAll('div')].find(d => d.textContent.startsWith('Decided on penalties') && d.children.length === 0);
        return { iw: innerWidth, ih: innerHeight, docScrollW: document.documentElement.scrollWidth, docScrollH: document.documentElement.scrollHeight,
          stage: r(stage), side: r(side), sideScroll: { sh: side.scrollHeight, ch: side.clientHeight, overflowY: getComputedStyle(side).overflowY },
          rows: rows.length, rowsOverflowX: rows.filter(x => x.scrollWidth > x.clientWidth + 1).length, listOverflowX: list.scrollWidth > list.clientWidth + 1,
          rowOutside: rows.filter(x => { const b = x.getBoundingClientRect(); return b.left < side.getBoundingClientRect().left - 1 || b.right > side.getBoundingClientRect().right + 1; }).length,
          header: list.querySelector('span:nth-child(2)')?.textContent, ft: ft ? ft.textContent : null, ftBox: ft ? r(ft) : null,
          close: (() => { const b = side.querySelector('button[aria-label="Close the panel"]'); return b ? r(b) : null; })() };
      });
    } catch (e) { problems.push(vp.width + '/' + k + ': ' + String(e.message).slice(0, 160)); }
    await page.screenshot({ path: path.join(OUT, (process.env.PFX || '') + 'live-' + vp.width + '-' + k + '.png') });
    if (m) {
      m.errors = errors;
      console.log(vp.width + 'x' + vp.height + ' ' + k + ' ' + JSON.stringify(m));
      if (m.docScrollW > m.iw) problems.push(vp.width + '/' + k + ': page scrolls sideways ' + m.docScrollW);
      if (m.stage.top !== 0 || m.stage.bottom !== m.ih) problems.push(vp.width + '/' + k + ': stage is not the window');
      if (m.side.top < 0 || m.side.bottom > m.ih || m.side.left < 0 || m.side.right > m.iw) problems.push(vp.width + '/' + k + ': kicks panel leaves the window');
      if (m.sideScroll.sh > m.sideScroll.ch + 1 && !['auto', 'scroll'].includes(m.sideScroll.overflowY)) problems.push(vp.width + '/' + k + ': list cut off with no scroll');
      if (m.rowsOverflowX || m.listOverflowX || m.rowOutside) problems.push(vp.width + '/' + k + ': rows overflow sideways');
      if (errors.length) problems.push(vp.width + '/' + k + ': page errors ' + errors[0]);
    }
    await ctx.close();
  }
}
await browser.close(); server.close();
console.log(problems.length ? 'WALK410 RED ' + problems.length + ': ' + problems.join(' | ') : 'WALK410 GREEN: 6 frames measured');
process.exitCode = problems.length ? 1 : 0;
