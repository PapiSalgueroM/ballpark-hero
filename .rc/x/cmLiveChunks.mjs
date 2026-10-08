/* Round 1046 probe (never committed): the little pitch binds Club Manager's figure file, so that file is now shared by
   two lazy chunks (the little pitch and Club Manager's match viewer). This prints where it lives in the build, who asks
   for it, and checks Club Manager's live match still gets everything it needs. Run from the repo root with dist built
   and served on BASE. */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const BASE = process.env.BASE ?? 'http://localhost:4173';
const dir = path.join(ROOT, 'dist/assets');
const names = fs.readdirSync(dir);
const js = names.filter(n => n.endsWith('.js'));
const text = Object.fromEntries(js.map(n => [n, fs.readFileSync(path.join(dir, n), 'utf8')]));
const gz = n => zlib.gzipSync(fs.readFileSync(path.join(dir, n))).length;
const holders = needle => js.filter(n => text[n].includes(needle));
let bad = 0;
const check = (ok, msg) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${msg}`); if (!ok) bad += 1; };

const figure = holders('cm-pitch-player');
const viewer = holders('data-cm-dot-opp');
const mini = holders('data-mini-pitch');
const css = names.filter(n => n.endsWith('.css') && fs.readFileSync(path.join(dir, n), 'utf8').includes('.cm-live-net'));
console.log(`figure file in: ${figure.map(n => `${n} (${gz(n)} gz)`).join(', ')}`);
console.log(`match viewer in: ${viewer.map(n => `${n} (${gz(n)} gz)`).join(', ')}`);
console.log(`little pitch in: ${mini.map(n => `${n} (${gz(n)} gz)`).join(', ') || 'no chunk (this build has no little pitch)'}`);
console.log(`pitch css in: ${css.map(n => `${n} (${gz(n)} gz)`).join(', ')}`);
check(figure.length === 1 && viewer.length === 1 && css.length === 1, 'one chunk holds the figure, one the match viewer, one stylesheet holds the pitch rules');

const staticImports = n => [...text[n].matchAll(/(?:from|import)\s*"\.\/([^"]+\.js)"/g)].map(m => m[1]);
const ENGINE = ['Sit deep, frustrate them, protect the point', 'oppositionShape'];
if (figure.length === 1 && viewer.length === 1) {
  const F = figure[0], V = viewer[0];
  console.log(`the match viewer's static imports: ${staticImports(V).join(' ')}`);
  check(F === V || staticImports(V).includes(F), 'the match viewer imports the chunk that holds the figure (or holds it itself)');
  if (mini.length === 1) {
    console.log(`the little pitch's static imports: ${staticImports(mini[0]).join(' ')}`);
    check(staticImports(mini[0]).includes(F), 'the little pitch imports the chunk that holds the figure');
    check(F !== V, 'the figure is not inside the match viewer chunk (the little pitch would pull the whole viewer)');
    check(ENGINE.every(m => !text[F].includes(m) && !text[mini[0]].includes(m)), 'neither the figure chunk nor the little pitch holds a line of Club Manager\'s engine');
  }
  const askers = js.filter(n => n !== V && text[n].includes(V));
  console.log(`asks for the match viewer: ${askers.join(' ')}`);
  check(askers.length >= 1, 'something asks for the match viewer');
  for (const a of askers) check(text[a].includes(F) && css.every(c => text[a].includes(c)), `${a} lists the figure chunk and the pitch stylesheet with the viewer, so a live match gets both`);

  const pw = (await import(pathToFileURL(path.join(ROOT, 'scripts/lib/playwrightLoader.mjs')).href)).default;
  const browser = await pw.chromium.launch();
  const page = await (await browser.newContext()).newPage();
  await page.route(/supabase\.co/, r => r.abort());
  const seen = [];
  page.on('response', r => { const m = r.url().match(/\/assets\/([^?]+)$/); if (m) seen.push(`${m[1]} ${r.status()}`); });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(`${BASE}/club-manager`, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(1500);
  check(!seen.some(s => s.startsWith(F) || s.startsWith(V)), 'Club Manager\'s first screen asks for neither the viewer nor the figure');
  const kinds = await page.evaluate(async f => { const m = await import(`/assets/${f}`); return Object.values(m).map(v => typeof v); }, V);
  await page.waitForTimeout(500);
  console.log(`the viewer chunk, imported in the page, exports: ${kinds.join(' ')}`);
  check(kinds.length >= 1 && seen.includes(`${V} 200`) && seen.includes(`${F} 200`), 'the viewer chunk loads in a browser and brings the figure chunk, both answered 200');
  check(errors.length === 0, `no page error (${errors.slice(0, 2).join(' | ')})`);
  console.log(`a live match asks for: ${seen.filter(s => s.startsWith(V) || s.startsWith(F)).join(', ')} and the stylesheet ${css.join(' ')}`);
  await browser.close();
}
console.log(`cmLiveChunks: ${bad} failed`);
process.exit(bad ? 1 : 0);
