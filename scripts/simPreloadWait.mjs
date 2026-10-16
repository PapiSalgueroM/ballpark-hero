/* Round 1338: a chunk that fails to download waits for the site's one reload
   instead of answering empty (scripts/lib/vitePreloadWait.mjs).

   Before this round, when src/lib/freshBuild.ts cancelled vite:preloadError to
   reload once for a stale chunk, Vite's wrapper resolved the failed import to
   undefined, and React threw "reading 'default'" in the instant before the
   reload landed (the Release BF gate saw it in the Soccer Career editor walk).

   1. THE REAL WRAPPER, BOTH WAYS. A tiny Vite build in a fresh temp folder
      records the preload helper's text as Vite emitted it (stock) and as the
      plugin patched it, then runs each in node with a stand in window:
      (a) the import rejects and a listener cancels: stock resolves undefined
          (the bug, reproduced so we know we test the right thing), patched is
          still pending after 50 ms;
      (b) it rejects and nobody cancels: both reject with the same error;
      (c) it resolves: both give the same module object;
      (d) two imports reject and both are cancelled: both pending.
   2. THE PATCH IS EXACT AND FAILS CLOSED. The patch is the stock text plus
      the wait at one place; it throws on a text without the branch and on one
      holding it twice; a tiny build fed a mutated helper fails with the
      plugin's message; a build whose wrapper loses the wait after the patch
      fails at the bundle check; a build with no dynamic import passes and
      says it has no wrapper.
   3. DIST. Exactly one dist/assets/*.js dispatches vite:preloadError, and the
      wait follows its rethrow in the minified form. With no dist it says it
      did not run (runAllSims on a clean clone) and does not fail.
   4. HEAD AGAINST STOCK (PRELOAD_WAIT_STOCK_DIST set): hashed names
      normalised, exactly one chunk differs, by exactly the minified wait.
   6. SOURCE FENCE, comments stripped. vite.config.ts imports preloadWait from
      ./scripts/lib/vitePreloadWait.mjs and lists preloadWait() as a plugins
      entry of its own, never behind a mode test (the fix rests on that one
      line, and outside editors have rewritten that file before). And every
      runtime import( in src has a plain string specifier, because Vite wraps
      only those.

   The stock control dist: node scripts/simPreloadWait.mjs --build-stock
   <outDir> builds the site through vite.config.ts with this plugin taken out
   (a real stock Vite build; the plugin itself would refuse to emit an
   unpatched wrapper), into its own folder, never dist.

   Negative controls (PRELOAD_WAIT_CONTROL): stock runs the stock text in the
   patched arm (section 1 red); stockdist points section 3 at the stock
   control dist (section 3 red); extra changes one byte of one other chunk on
   the stock side in memory (section 4 red); noplugin takes preloadWait() out
   of the plugins array in memory (section 6 red); gated puts it behind a
   mode test in memory (section 6 red); dynamicspec adds an
   import(name) to src in memory (section 6 red). Each asserts its anchor
   first. Exit 0 green, 1 red or a control that fired, 2 could not run. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, loadConfigFromFile, version as viteVersion } from 'vite';
import { preloadWait, patchPreloadHelper, wrapperState, PRELOAD_HELPER_ID, WAIT_STATEMENT, DISPATCH_RE } from './lib/vitePreloadWait.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.PRELOAD_WAIT_CONTROL || '';
const EXPECT = { stock: [1], stockdist: [3], extra: [4], noplugin: [6], gated: [6], dynamicspec: [6] };
if (CONTROL && !(CONTROL in EXPECT)) { console.error('unknown control ' + CONTROL); process.exit(2); }
const code = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
function rewrite(src, anchor, replacement, why) {
  const n = src.split(anchor).length - 1;
  if (n !== 1) { console.error(`${why}: anchor appears ${n} times, refusing to run a dead control`); process.exit(2); }
  return src.replace(anchor, replacement);
}

/* ---------- the stock control dist ---------- */
if (process.argv[2] === '--build-stock') {
  const out = path.resolve(ROOT, process.argv[3] || 'dist-stock');
  if (path.resolve(out) === path.resolve(ROOT, 'dist')) { console.error('refusing to build the stock control into dist'); process.exit(2); }
  const loaded = await loadConfigFromFile({ command: 'build', mode: 'production' }, path.join(ROOT, 'vite.config.ts'), ROOT);
  const flat = (loaded?.config.plugins ?? []).flat(Infinity).filter(Boolean);
  const ours = flat.filter(p => p.name === 'dukb-preload-wait').length;
  if (ours !== 1) { console.error(`vite.config.ts lists dukb-preload-wait ${ours} times, expected once: no stock control built`); process.exit(2); }
  await build({ ...loaded.config, configFile: false, root: ROOT, plugins: flat.filter(p => p.name !== 'dukb-preload-wait'), build: { ...(loaded.config.build ?? {}), outDir: out, emptyOutDir: true } });
  const holders = fs.readdirSync(path.join(out, 'assets')).filter(f => f.endsWith('.js')).map(f => wrapperState(fs.readFileSync(path.join(out, 'assets', f), 'utf8'))).filter(s => s.dispatches);
  if (holders.length !== 1 || holders[0].waits !== 0) { console.error(`stock control: ${holders.length} chunk(s) dispatch vite:preloadError, ${holders.map(s => s.waits).join(',')} wait(s); expected one chunk with none`); process.exit(2); }
  console.log(`stock control dist written to ${out}: one chunk dispatches vite:preloadError and it does not wait (vite ${viteVersion})`);
  process.exit(0);
}

let failures = 0; const red = new Set(); let section = 0;
const fail = m => { failures++; red.add(section); console.log('   FAIL ' + m); };
const ok = m => console.log('   ok   ' + m);

/* A tiny build in its own temp folder. capture plugins sit either side of ours. */
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'dukb-preload-wait-'));
function tinyApp(name, mainJs) {
  const dir = path.join(TMP, name);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), '<!doctype html><html><body><script type="module" src="/main.js"></script></body></html>');
  fs.writeFileSync(path.join(dir, 'main.js'), mainJs);
  fs.writeFileSync(path.join(dir, 'second.js'), 'export const two = 2;\n');
  return dir;
}
const DYNAMIC = 'export const go = () => import("./second.js");\ngo();\n';
const capture = (into, key) => ({ name: 'capture-' + key, apply: 'build', enforce: 'post', transform(c, id) { if (id === PRELOAD_HELPER_ID) into[key] = c; return null; } });
async function tinyBuild(name, mainJs, plugins, minify = true) {
  const out = await build({ root: tinyApp(name, mainJs), configFile: false, logLevel: 'silent', build: { write: false, minify }, plugins });
  return (Array.isArray(out) ? out : [out]).flatMap(o => o.output);
}
let armNo = 0;
async function loadWrapper(text, arm) {
  const src = 'const __VITE_IS_MODERN__ = false;\n' + text + '\n// arm ' + arm + ' ' + (armNo++) + '\n';
  const mod = await import('data:text/javascript;base64,' + Buffer.from(src).toString('base64'));
  if (typeof mod.__vitePreload !== 'function') throw new Error('the ' + arm + ' wrapper does not export __vitePreload');
  return mod.__vitePreload;
}
const settle = (p, ms = 50) => new Promise(res => {
  const t = setTimeout(() => res({ state: 'pending' }), ms);
  p.then(v => { clearTimeout(t); res({ state: 'resolved', v }); }, e => { clearTimeout(t); res({ state: 'rejected', e }); });
});
async function withLog(fn) {
  const lines = []; const was = console.log;
  console.log = (...a) => { lines.push(a.join(' ')); };
  try { return { value: await fn(), lines }; } catch (e) { return { error: e, lines }; } finally { console.log = was; }
}

section = 1;
console.log(`1) Vite's real wrapper (vite ${viteVersion}), stock and patched`);
const texts = {};
{
  const run = await withLog(() => tinyBuild('both', DYNAMIC, [capture(texts, 'stock'), preloadWait(), capture(texts, 'patched')]));
  if (run.error) fail('the tiny build failed: ' + run.error.message);
  else if (!run.lines.some(l => l.includes('[dukb] preload wrapper: a cancelled chunk error waits for the reload'))) fail('the tiny build did not print the plugin line, so the plugin did not run');
  if (!texts.stock || !texts.patched) fail('the capture plugins never saw ' + JSON.stringify(PRELOAD_HELPER_ID) + ', so no wrapper text to run');
  else if (texts.patched.split(WAIT_STATEMENT).length !== 2 || texts.stock.includes(WAIT_STATEMENT)) fail('the patched text does not hold the wait exactly once, or the stock text already holds it');
  else if (texts.patched.replace(WAIT_STATEMENT, '') !== texts.stock) fail('the patched text is not the stock text plus the wait');
  else {
    const stockFn = await loadWrapper(texts.stock, 'stock');
    const patchedFn = await loadWrapper(CONTROL === 'stock' ? texts.stock : texts.patched, 'patched');
    globalThis.window = new EventTarget();
    let fired = 0;
    const cancel = ev => { fired++; ev.preventDefault(); };
    const err = new Error('Failed to fetch dynamically imported module (simulated)');
    const mod = { default: 'a module' };
    window.addEventListener('vite:preloadError', cancel);
    const a1 = await settle(stockFn(() => Promise.reject(err)));
    const a2 = await settle(patchedFn(() => Promise.reject(err)));
    if (fired !== 2) fail(`(a) the listener ran ${fired} time(s), expected 2: the wrappers did not dispatch vite:preloadError`);
    if (!(a1.state === 'resolved' && a1.v === undefined)) fail(`(a) the stock wrapper ${a1.state} on a cancelled failure instead of resolving undefined: this harness is not reproducing the bug`);
    if (a2.state !== 'pending') fail(`(a) the patched wrapper ${a2.state}${a2.state === 'resolved' ? ' to ' + String(a2.v) : ''} on a cancelled failure; it must wait for the reload`);
    if (fired === 2 && a1.state === 'resolved' && a1.v === undefined && a2.state === 'pending') ok('(a) a cancelled failure: stock resolves undefined (the bug), patched still waiting after 50 ms');
    const d = await Promise.all([settle(patchedFn(() => Promise.reject(err))), settle(patchedFn(() => Promise.reject(new Error('a second file'))))]);
    if (d.some(r => r.state !== 'pending')) fail(`(d) two cancelled failures in the patched wrapper: ${d.map(r => r.state).join(', ')}, expected both pending`);
    else ok('(d) two cancelled failures: both still waiting');
    window.removeEventListener('vite:preloadError', cancel);
    const b = [await settle(stockFn(() => Promise.reject(err))), await settle(patchedFn(() => Promise.reject(err)))];
    if (b.some(r => r.state !== 'rejected' || r.e !== err)) fail(`(b) a failure nobody cancels: ${b.map(r => r.state).join(', ')}, expected both to reject with the same error`);
    else ok('(b) a failure nobody cancels: both reject with the same error object');
    const c = [await settle(stockFn(() => Promise.resolve(mod))), await settle(patchedFn(() => Promise.resolve(mod)))];
    if (c.some(r => r.state !== 'resolved' || r.v !== mod)) fail(`(c) a healthy import: ${c.map(r => r.state).join(', ')}, expected both to give the same module`);
    else ok('(c) a healthy import: both give the same module object');
  }
}

section = 2;
console.log('2) the patch is exact, and the plugin fails the build closed');
{
  if (texts.stock) {
    if (patchPreloadHelper(texts.stock) !== texts.patched) fail('patchPreloadHelper(stock) differs from what the plugin emitted');
    const branch = texts.stock.match(/if\s*\(\s*!\s*[\w$]+\.defaultPrevented\s*\)\s*\{\s*throw\s+[\w$]+\s*;?\s*\}/);
    if (!branch) fail('the rethrow branch is not in the stock text');
    else {
      const message = text => { try { patchPreloadHelper(text); return ''; } catch (e) { return e.message; } };
      const none = message(texts.stock.replace(branch[0], ''));
      const twice = message(texts.stock.replace(branch[0], branch[0] + branch[0]));
      if (!none.includes('found 0 copies') || !none.includes('vite ' + viteVersion)) fail('the patch did not refuse a wrapper without the branch, naming the vite version: ' + (none || 'no error'));
      else if (!twice.includes('found 2 copies')) fail('the patch did not refuse a wrapper holding the branch twice: ' + (twice || 'no error'));
      else ok(`the patch is the stock text plus the wait at one place, and refuses 0 or 2 copies of the branch (vite ${viteVersion} named)`);
    }
  }
  const mutate = { name: 'mutate-helper', apply: 'build', enforce: 'post', transform(c, id) {
    if (id !== PRELOAD_HELPER_ID) return null;
    return { code: rewrite(c, '.defaultPrevented', '["defaultPrevented"]', 'mutate-helper'), map: null };
  } };
  const mutated = await withLog(() => tinyBuild('mutated', DYNAMIC, [mutate, preloadWait()]));
  if (!mutated.error) fail('a build fed a mutated helper passed: the plugin does not fail closed');
  else if (!String(mutated.error.message).includes('[dukb] preload wrapper: found 0 copies')) fail('a build fed a mutated helper failed, but not with the plugin message: ' + mutated.error.message.slice(0, 200));
  else ok('a build fed a mutated helper fails with the plugin message');
  const strip = { name: 'strip-wait', apply: 'build', enforce: 'post', transform(c, id) {
    if (id !== PRELOAD_HELPER_ID) return null;
    return { code: rewrite(c, WAIT_STATEMENT, '', 'strip-wait'), map: null };
  } };
  const stripped = await withLog(() => tinyBuild('stripped', DYNAMIC, [preloadWait(), strip]));
  if (!stripped.error) fail('a build whose wrapper lost the wait after the patch passed: the bundle check does not fail closed');
  else if (!String(stripped.error.message).includes('dispatch vite:preloadError without the wait')) fail('a build whose wrapper lost the wait failed, but not at the bundle check: ' + stripped.error.message.slice(0, 200));
  else ok('a build whose emitted wrapper lost the wait fails at the bundle check');
  /* the side builds of scripts/qa build with minify off, and the bundle check must read that form too */
  const plain = await withLog(() => tinyBuild('plain', DYNAMIC, [preloadWait()], false));
  if (plain.error) fail('a build with minify off failed at the plugin: ' + plain.error.message.slice(0, 200));
  else ok('a build with minify off passes the bundle check (the scripts/qa side builds)');
  const none = await withLog(() => tinyBuild('none','export const one = 1;\nconsole.log(one);\n', [preloadWait()]));
  if (none.error) fail('a build with no dynamic import failed: ' + none.error.message.slice(0, 200));
  else if (!none.lines.some(l => l.includes('no preload wrapper in this build'))) fail('a build with no dynamic import did not say it has no wrapper');
  else ok('a build with no dynamic import passes and says it has no preload wrapper');
}

const jsIn = dir => fs.readdirSync(path.join(dir, 'assets')).filter(f => f.endsWith('.js')).sort();
const STOCK_DIST = process.env.PRELOAD_WAIT_STOCK_DIST ? path.resolve(ROOT, process.env.PRELOAD_WAIT_STOCK_DIST) : '';

section = 3;
console.log('3) the built dist: the one wrapper waits after its rethrow');
{
  const DIST = CONTROL === 'stockdist' ? STOCK_DIST : path.resolve(ROOT, process.env.PRELOAD_WAIT_DIST || 'dist');
  if (CONTROL === 'stockdist' && (!DIST || !fs.existsSync(path.join(DIST, 'assets')))) { console.error('stockdist: set PRELOAD_WAIT_STOCK_DIST to a built stock control dist'); process.exit(2); }
  if (!fs.existsSync(path.join(DIST, 'assets'))) console.log(`   skip ${path.relative(ROOT, DIST) || DIST} has no assets folder, so this section did not run (build first)`);
  else {
    const all = jsIn(DIST).map(f => ({ f, text: fs.readFileSync(path.join(DIST, 'assets', f), 'utf8') }));
    const literal = all.filter(x => x.text.includes('vite:preloadError')).map(x => x.f);
    const holders = all.map(x => ({ f: x.f, s: wrapperState(x.text) })).filter(x => x.s.dispatches);
    console.log(`   info ${all.length} js files; the literal vite:preloadError is in ${literal.join(', ') || 'none'}`);
    if (literal.length !== 1) fail(`${literal.length} files hold the literal vite:preloadError, expected exactly one (the entry, with freshBuild.ts and the wrapper)`);
    if (holders.length !== 1) fail(`${holders.length} files dispatch vite:preloadError, expected exactly one`);
    else if (holders[0].s.dispatches !== 1 || holders[0].s.waits !== 1) fail(`${holders[0].f} dispatches vite:preloadError but the wait does not follow its rethrow: a cancelled chunk error answers empty`);
    else ok(`${holders[0].f}: ...${holders[0].s.snippet.slice(-90)}`);
  }
}

section = 4;
console.log('4) head against the stock control: one chunk differs, by exactly the wait');
{
  const HEAD = path.resolve(ROOT, process.env.PRELOAD_WAIT_DIST || 'dist');
  if (!STOCK_DIST) console.log('   skip PRELOAD_WAIT_STOCK_DIST is not set, so this section did not run');
  else if (!fs.existsSync(path.join(HEAD, 'assets')) || !fs.existsSync(path.join(STOCK_DIST, 'assets'))) { console.error('section 4: both dists must be built'); process.exit(2); }
  else {
    const HASHED = /([\w.$]+)-[A-Za-z0-9_-]{8}\.(js|css)/g;
    const norm = s => s.replace(HASHED, '$1-#.$2');
    const side = dir => {
      const m = new Map();
      for (const f of fs.readdirSync(path.join(dir, 'assets')).filter(f => /\.(js|css)$/.test(f))) {
        const k = norm(f); if (!m.has(k)) m.set(k, []);
        m.get(k).push(norm(fs.readFileSync(path.join(dir, 'assets', f), 'utf8')));
      }
      return m;
    };
    const head = side(HEAD); const stock = side(STOCK_DIST);
    if (CONTROL === 'extra') {
      const key = [...stock.keys()].find(k => k.endsWith('.js') && !stock.get(k).some(t => t.includes('vite:preloadError')));
      const t = stock.get(key)[0];
      stock.get(key)[0] = t.slice(0, 10) + (t[10] === 'x' ? 'y' : 'x') + t.slice(11);
    }
    const diffs = [];
    for (const k of new Set([...head.keys(), ...stock.keys()])) {
      const h = [...(head.get(k) ?? [])].sort(); const s = [...(stock.get(k) ?? [])].sort();
      const left = h.filter(t => !s.includes(t)); const right = s.filter(t => !h.includes(t));
      if (left.length || right.length) diffs.push({ k, left, right });
    }
    console.log(`   info ${head.size} names on head, ${stock.size} on the stock control`);
    if (diffs.length !== 1 || diffs[0].left.length !== 1 || diffs[0].right.length !== 1) fail(`${diffs.length} name(s) differ (${diffs.map(d => d.k).slice(0, 8).join(', ')}), expected exactly one chunk`);
    else {
      const a = diffs[0].left[0]; const b = diffs[0].right[0];
      let p = 0; while (p < a.length && a[p] === b[p]) p++;
      let q = 0; while (q < a.length - p && q < b.length - p && a[a.length - 1 - q] === b[b.length - 1 - q]) q++;
      const added = a.slice(p, a.length - q); const removed = b.slice(p, b.length - q);
      console.log(`   info ${diffs[0].k}: head adds ${JSON.stringify(added)} and drops ${JSON.stringify(removed)} at character ${p}`);
      if (removed !== '' || !/^;?\s*return\s*new\s+Promise\(\s*\(\s*\)\s*=>\s*\{\s*\}\s*\)\s*;?$/.test(added)) fail(`${diffs[0].k} differs by more than the wait`);
      else ok(`${diffs[0].k} is the only chunk that differs, by ${added.length} characters: the wait`);
    }
  }
}

section = 6;
console.log('6) the vite.config.ts entry, and every runtime import( has a plain string specifier');
{
  let cfg = fs.readFileSync(path.join(ROOT, 'vite.config.ts'), 'utf8').replaceAll('\r\n', '\n');
  if (CONTROL === 'noplugin') cfg = rewrite(cfg, ', preloadWait()]', ']', 'noplugin');
  if (CONTROL === 'gated') cfg = rewrite(cfg, ', preloadWait()]', ', mode === "development" && preloadWait()]', 'gated');
  const c = code(cfg);
  const imports = /import\s*\{\s*preloadWait\s*\}\s*from\s*["']\.\/scripts\/lib\/vitePreloadWait\.mjs["']/.test(c);
  const arrays = [...c.matchAll(/\bplugins\s*:\s*\[/g)];
  let entries = null;
  if (arrays.length === 1) {
    entries = []; let depth = 0; let cur = '';
    for (let i = arrays[0].index + arrays[0][0].length - 1; i < c.length; i++) {
      const ch = c[i];
      if ('([{'.includes(ch)) { depth++; if (depth === 1) continue; }
      else if (')]}'.includes(ch)) { depth--; if (depth === 0) { entries.push(cur.trim()); break; } }
      if (depth === 1 && ch === ',') { entries.push(cur.trim()); cur = ''; continue; }
      cur += ch;
    }
  }
  const own = (entries ?? []).filter(e => e === 'preloadWait()').length;
  const gated = (entries ?? []).filter(e => e !== 'preloadWait()' && e.includes('preloadWait'));
  if (!imports) fail('vite.config.ts does not import preloadWait from "./scripts/lib/vitePreloadWait.mjs"');
  if (arrays.length !== 1) fail(`vite.config.ts has ${arrays.length} plugins arrays in its code, expected one`);
  else if (own !== 1) fail(`the plugins array lists preloadWait() as an entry of its own ${own} time(s), expected once: without it a cancelled chunk error answers empty again`);
  if (gated.length) fail('preloadWait sits behind a condition in the plugins array: ' + gated.join(' | '));
  if (imports && arrays.length === 1 && own === 1 && !gated.length) ok(`vite.config.ts imports preloadWait and lists preloadWait() ungated (${entries.length} entries in the array)`);

  const files = [];
  const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) { if (e.name !== 'test') walk(p); } else if (/\.(ts|tsx)$/.test(e.name) && !/\.test\.tsx?$/.test(e.name)) files.push(p); } };
  walk(path.join(ROOT, 'src'));
  let calls = 0; let lazies = 0; const inFiles = new Set(); const bad = [];
  files.forEach((f, i) => {
    let t = code(fs.readFileSync(f, 'utf8').replaceAll('\r\n', '\n'));
    if (CONTROL === 'dynamicspec' && i === 0) t += '\nconst name = "./x";\nimport(name);\n';
    lazies += (t.match(/(?<![\w$.])lazy\(/g) ?? []).length;
    for (const m of t.matchAll(/(?<![\w$.])import\s*\(/g)) {
      const rest = t.slice(m.index + m[0].length).trimStart();
      const qt = rest[0];
      const plain = qt === '"' || qt === "'" || (qt === '`' && !rest.slice(1, rest.indexOf('`', 1)).includes('${'));
      if (plain && /typeof\s+$/.test(t.slice(Math.max(0, m.index - 10), m.index))) continue;
      calls++; inFiles.add(f);
      if (!plain) bad.push(path.relative(ROOT, f).replaceAll('\\', '/') + ':' + (t.slice(0, m.index).split('\n').length));
    }
  });
  console.log(`   info ${calls} runtime import( calls in ${inFiles.size} files, ${lazies} lazy( calls, across ${files.length} source files (tests left out)`);
  if (!calls) fail('found no runtime import( at all: this check is not reading src');
  else if (bad.length) fail(`import( with a specifier that is not a plain string, which Vite does not wrap: ${bad.slice(0, 6).join(', ')}`);
  else ok('every runtime import( in src has a plain string specifier, so the build wraps every one');
}

console.log('');
if (CONTROL) {
  const want = EXPECT[CONTROL]; const got = [...red].sort();
  const same = got.length === want.length && want.every(w => red.has(w));
  if (same) { console.log(`simPreloadWait: control ${CONTROL} turned section(s) ${want.join(', ')} red and nothing else. The check works.`); process.exit(1); }
  console.log(`simPreloadWait: control ${CONTROL} should have reddened exactly ${want.join(', ')}, got [${got.join(', ') || 'none'}]. The control proves nothing.`); process.exit(2);
}
if (failures) { console.error(`simPreloadWait: ${failures} failure(s) in section(s) ${[...red].sort().join(', ')}`); process.exit(1); }
console.log('simPreloadWait: green. A chunk that fails to download waits for the one reload instead of handing React an empty module.');
process.exit(0);
