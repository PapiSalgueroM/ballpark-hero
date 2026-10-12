// Reviewer cm-world (Release AZ), never committed. PLAY: a seeded career (this build's engine) and an old save
// (the engine of b6eb78e7, Release AX) taken through a mid season job move in the browser, at 390 (reduced motion on
// and off) and 1280; then Everton's club screen after the move (the man I bought there must stay, the man I sold
// must not be back); and a deep seeded save at season 8 against the same save stripped, Quick Sim timed at 390 with
// the CPU slowed four times. Saves are made on the runner by the two engines. Run on a served build:
// BASE=http://localhost:4173 node .rc/x/rvcmw-walk.mjs
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import { chromium } from 'playwright';
const ROOT = process.cwd();
const URLBASE = (process.env.BASE || process.env.SWEEP_BASE || 'http://localhost:4173').replace(/\/$/, '');
const OUT = path.resolve(process.env.RC_OUT || '.tmp-fx/rv-walk'); fs.mkdirSync(OUT, { recursive: true });
const BASECOMMIT = 'b6eb78e799b12c851e4e8e583e9e926aed117f1c';
const SAVE = 'dukb-club-manager-save', NOW = 1791547200000;
const lf = s => s.split('\r\n').join('\n');
async function engine(base) {
  const plugin = { name: 'src', setup(b) { b.onLoad({ filter: /\.(ts|tsx|json)$/ }, args => {
    const rel = path.relative(ROOT, args.path).split(path.sep).join('/');
    if (!rel.startsWith('src/')) return null;
    const text = base ? execFileSync('git', ['show', `${BASECOMMIT}:${rel}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 }) : fs.readFileSync(args.path, 'utf8');
    return { contents: lf(text), loader: path.extname(args.path).slice(1), resolveDir: path.dirname(args.path) };
  }); } };
  const out = await build({ stdin: { contents: "export * as cm from './src/lib/clubManager';\nexport * as eras from './src/lib/clubManagerEras';\n", resolveDir: ROOT, sourcefile: `w-${base}.ts`, loader: 'ts' },
    bundle: true, write: false, format: 'cjs', platform: 'node', target: 'node20', plugins: [plugin], logLevel: 'silent' });
  const module = { exports: {} }; const store = new Map();
  class D extends Date { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } }
  const ctx = vm.createContext({ module, exports: module.exports, require: createRequire(path.join(ROOT, 'package.json')), console, process, Buffer, Math, Date: D,
    URL, URLSearchParams, TextEncoder, TextDecoder, structuredClone, setTimeout, clearTimeout, setInterval, clearInterval, fetch: () => Promise.reject(new Error('offline')),
    localStorage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() } });
  new vm.Script(out.outputFiles[0].text).runInContext(ctx); await module.exports.eras.ensureAllEraRosters();
  return { ...module.exports, store };
}
function tape(seed, action, forced) {
  let st = seed >>> 0; const original = Math.random;
  Math.random = () => { if (forced !== undefined) return forced; st = (st + 0x6d2b79f5) >>> 0; let v = st;
    v = Math.imul(v ^ v >>> 15, v | 1); v ^= v + Math.imul(v ^ v >>> 7, v | 61); return ((v ^ v >>> 14) >>> 0) / 4294967296; };
  try { return action(); } finally { Math.random = original; }
}
const play = (M, s, seed) => tape(seed, () => M.cm.playNextEntry(s, { skipHalftime: true, noCoach: true }).state);
function deepSave(M) {
  let s = tape(7, () => M.cm.startCareer('Everton'));
  for (let season = 1; season < 8; season += 1) {
    for (let i = 0; i < 240; i += 1) { const r = tape(1000 * season + i, () => M.cm.playNextEntry(s, { skipHalftime: true, noCoach: true })); s = r.state; if (r.kind === 'seasonOver') break; }
    s = tape(5000 + season, () => M.cm.finishSeason(s).state); s = tape(6000 + season, () => M.cm.startNextSeason(s));
  }
  for (let i = 0; i < 3; i += 1) s = play(M, s, 9000 + i);
  const bare = JSON.parse(JSON.stringify(s)); delete bare.worldSeed; delete bare.worldRoster;
  const save = (st) => { M.store.clear(); M.cm.saveCareer(st); return [...M.store.entries()]; };
  return { seeded: save(s), stripped: save(bare), season: s.season, ledger: s.worldRoster ? (s.worldRoster.records.length || 'packed') : 0 };
}
const head = await engine(false);
const deep = deepSave(head);
console.log(`deep save: season ${deep.season}, ledger ${deep.ledger}`);
const failures = [], notes = [];
const browser = await chromium.launch();
async function open(profile, entries) {
  const context = await browser.newContext({ viewport: { width: profile.w, height: profile.h }, hasTouch: profile.touch, isMobile: profile.touch, reducedMotion: profile.rm });
  await context.route(/supabase\.co/, r => r.abort());
  await context.addInitScript(({ now, entries }) => {
    const Real = Date;
    window.Date = class extends Real { constructor(...a) { super(...(a.length ? a : [now])); } static now() { return now; } };
    localStorage.setItem('cookie-consent', 'essential');
    if (!sessionStorage.getItem('rv-injected')) { for (const [k, v] of entries) localStorage.setItem(k, v); sessionStorage.setItem('rv-injected', '1'); }
  }, { now: NOW, entries });
  const page = await context.newPage(); page.setDefaultTimeout(30000);
  const errors = []; page.on('pageerror', e => errors.push(String(e)));
  const tap = async loc => { if (profile.touch) await loc.tap(); else await loc.click(); };
  return { context, page, errors, tap };
}
async function resume(s) {
  await s.page.goto(`${URLBASE}/club-manager`, { waitUntil: 'networkidle' });
  const r = s.page.getByRole('button', { name: 'Resume Career', exact: true });
  if (await r.count()) await s.tap(r.first());
  await s.page.locator('[data-cm-way="quick"]').first().waitFor();
  await s.page.evaluate(() => document.fonts.ready);
}
const wide = page => page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
/* A tap that only changes the formation: no match is played, nothing is bought. The main thread's long tasks for
   two such taps, seeded against stripped, at 390 with the CPU slowed four times and at 1280 unslowed. */
const PROFILES = [
  { name: '390-cpu4', w: 390, h: 844, touch: true, rm: 'reduce', cpu: 4 },
  { name: '1280-cpu1', w: 1280, h: 900, touch: false, rm: 'no-preference', cpu: 1 },
];
for (const profile of PROFILES) for (const [kind, entries] of [['seeded', deep.seeded], ['stripped', deep.stripped]]) {
  const s = await open(profile, entries); const tag = `${profile.name}-${kind}`;
  try {
    await resume(s);
    await s.tap(s.page.getByRole('tab', { name: 'Tactics' }));
    let btns = s.page.locator('[data-cm-formation-btn]');
    if (!(await btns.first().isVisible().catch(() => false))) {
      const tile = s.page.getByRole('button').filter({ hasText: /Formation/ }).first();
      if (await tile.count()) await s.tap(tile);
      btns = s.page.locator('[data-cm-formation-btn]');
    }
    await btns.first().waitFor();
    const names = await btns.evaluateAll(els => els.map(e => e.getAttribute('data-cm-formation-btn')));
    if (profile.cpu > 1) { const cdp = await s.context.newCDPSession(s.page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: profile.cpu }); }
    await s.page.evaluate(() => { window.__lt = []; new PerformanceObserver(l => { for (const e of l.getEntries()) window.__lt.push(e.duration); }).observe({ type: 'longtask', buffered: false }); });
    const taps = [];
    for (const name of [names[1], names[2]]) {
      const before = await s.page.evaluate(() => window.__lt.length);
      const t0 = Date.now();
      await s.tap(s.page.locator(`[data-cm-formation-btn="${name}"]`));
      await s.page.locator(`[data-cm-formation-btn="${name}"].bg-primary`).waitFor({ timeout: 20000 });
      const shown = Date.now() - t0;
      await s.page.waitForTimeout(2500);
      const lt = await s.page.evaluate(b => window.__lt.slice(b), before);
      taps.push(`${name}: shown after ${shown} ms, ${lt.length} long tasks, ${Math.round(lt.reduce((a, b) => a + b, 0))} ms blocked`);
    }
    notes.push(`${tag} (season ${deep.season}, ledger ${deep.ledger}): ${taps.join('; ')}`);
    await s.page.screenshot({ path: path.join(OUT, `formation-${tag}.png`) });
    if (s.errors.length) failures.push(`${tag}: page errors ${s.errors.join(' | ').slice(0, 300)}`);
  } catch (e) { failures.push(`${tag}: ${String(e).slice(0, 300)}`); await s.page.screenshot({ path: path.join(OUT, `formation-${tag}-error.png`) }).catch(() => {}); }
  finally { await s.context.close(); }
}
await browser.close();
for (const n of notes) console.log(n);
if (failures.length) { for (const f of failures) console.log(`  FAIL: ${f}`); console.log(`rvcmw-walk2: ${failures.length} failures`); process.exit(1); }
console.log('rvcmw-walk2: measured');
