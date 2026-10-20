import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import esbuild from 'esbuild';
import pw from './lib/playwrightLoader.mjs';
import { SAMPLE_DAYS, clockScript } from './lib/prerenderClock.mjs';
import { NATIVE_DIAGNOSTICS } from './qa/reportSubmitPendingNamesNative1433.mjs';

// Actual generator proof, remote only. Fixed admission is deliberately not available yet.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SELF = fileURLToPath(import.meta.url), require = createRequire(import.meta.url);
const BASE = 'e5596fb2f44c3a7e0304af79bbb6568763aea9fc';
const ORIGINAL = '9eb04f0d5fa75aa2f073475f4b5e3c8243326bd148bc7cc5049a7ba5c1ddc80f';
const hash = body => createHash('sha256').update(body).digest('hex');
const lf = text => text.replaceAll('\r\n', '\n');
const write = (file, value) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n'); };
const pin = file => { const body = fs.readFileSync(file); return { file, bytes: body.length, sha256: hash(body) }; };
const TITLES = [
  'Player Bingo retains its actual guide list groups',
  'Soccer Career retains its actual guide list groups',
  'Flat unordered items retain their owner and long text',
  'Ordered start remains the source start',
  'Explicit item values reset source numbering',
  'Reversed explicit start keeps descending values',
  'Reversed default start uses the original item count',
  'Adjacent distinct list owners stay distinct',
  'Duplicate list occurrences keep clock-common multiplicity',
  'A dated child does not erase static numbered siblings',
  'Marked middle removal keeps original numbered gaps',
  'Changing parent attributes do not freeze first-sample metadata',
  'An unrelated preceding list does not erase the target',
  'Legacy fallback links tables and chrome remain unchanged',
  'Attributed list clock output is effectively rejected',
];
const FIXTURE_ROUTE = '/saved-list-semantics-fixture';
const STAGES = ['<gracefully close start>', '<process did exit: exitCode=0, signal=null>', 'starting temporary directories cleanup', 'finished temporary directories cleanup', '<gracefully close end>'];
assert(require.cache[require.resolve('./lib/offlineTransport.cjs')], 'Ordinary offline preload required');
assert.equal(process.env.SIM_NETWORK, 'offline');
assert.deepEqual(SAMPLE_DAYS, [0, 5, 11]);

function git(args) { const r = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }); assert.ifError(r.error); assert.equal(r.status, 0, r.stderr); return r.stdout; }
function manifest(root) {
  const rows = [];
  function visit(dir) { for (const name of fs.readdirSync(dir).sort()) { const file = path.join(dir, name), s = fs.lstatSync(file); assert(!s.isSymbolicLink(), 'Physical held tree has no symlink'); if (s.isDirectory()) visit(file); else { assert(s.isFile()); rows.push({ file: path.relative(root, file).split(path.sep).join('/'), bytes: s.size, sha256: hash(fs.readFileSync(file)) }); } } }
  visit(root); return rows;
}
function sourceState() { const names = git(['ls-files', '-z', '--cached', '--others', '--exclude-standard']).split('\0').filter(Boolean).sort(); assert.equal(new Set(names).size, names.length); return { files: names.map(file => ({ file, ...pin(path.join(ROOT, file)) })), status: git(['status', '--porcelain=v1', '--untracked-files=all']) }; }
function native(stderr) {
  const commands = [], launches = [], lifetimes = [], diagnostics = [];
  for (const line of stderr.split(/\r?\n/).filter(Boolean)) {
    const frame = line.match(/^\d{4}-\d{2}-\d{2}T[0-9:.]+Z pw:browser (.+)$/); assert(frame, 'Unknown native stderr: ' + line);
    const text = frame[1]; let m;
    if ((m = text.match(/^<launching> (\S+) (.+)$/))) { commands.push({ executable: m[1], arguments: m[2], rawLine: line }); continue; }
    if ((m = text.match(/^<launched> pid=(\d+)$/))) { launches.push(Number(m[1])); continue; }
    if ((m = text.match(/^\[pid=(\d+)\]\[err\] \[[0-9]{4}\/[0-9]{6}\.[0-9]{6}:(.+)$/))) { const known = NATIVE_DIAGNOSTICS.filter(d => d.signature === m[2]); assert.equal(known.length, 1, 'Unknown native diagnostic'); diagnostics.push({ pid: Number(m[1]), id: known[0].id, rawLine: line }); continue; }
    m = text.match(/^\[pid=(\d+)\] (.+)$/); assert(m && STAGES.includes(m[2]), 'Unknown native lifecycle'); lifetimes.push({ pid: Number(m[1]), stage: m[2], rawLine: line });
  }
  assert.equal(launches.length, 1, 'One actual sequential native browser process per operation'); assert.equal(commands.length, 1);
  const pid = launches[0]; assert(lifetimes.every(r => r.pid === pid)); assert(diagnostics.every(r => r.pid === pid)); assert.deepEqual(lifetimes.map(r => r.stage), STAGES);
  for (const d of NATIVE_DIAGNOSTICS) assert.equal(diagnostics.filter(r => r.id === d.id).length, d.perProcess, 'Exact retained platform diagnostic count');
  const profile = commands[0].arguments.split(' ').filter(s => s.startsWith('--user-data-dir=')); assert.equal(profile.length, 1); const profilePath = profile[0].slice('--user-data-dir='.length);
  assert.equal(path.dirname(profilePath), os.tmpdir()); assert(!fs.existsSync(profilePath), 'Actual native profile removed'); assert(commands[0].arguments.includes('--remote-debugging-pipe'));
  return { status: 'passed', rawBytes: Buffer.byteLength(stderr), rawSha256: hash(stderr), pid, command: commands[0], executable: pin(fs.realpathSync(commands[0].executable)), diagnostics, lifetimes, profilePath, profileRemoved: true, nativeWarningFree: false };
}
function run(dir, name, args, cwd, env) {
  const started = new Date().toISOString(), r = spawnSync(process.execPath, args, { cwd, env, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024, timeout: 20 * 60 * 1000 });
  fs.writeFileSync(path.join(dir, name + '.stdout.log'), r.stdout || ''); fs.writeFileSync(path.join(dir, name + '.stderr.log'), r.stderr || '');
  const receipt = { command: [process.execPath, ...args], cwd, started, finished: new Date().toISOString(), status: r.status, signal: r.signal, error: r.error ? String(r.error) : null, stdout: pin(path.join(dir, name + '.stdout.log')), stderr: pin(path.join(dir, name + '.stderr.log')) };
  write(path.join(dir, name + '.process.json'), receipt); assert.ifError(r.error); assert.equal(r.status, 0, 'Setup/process failure: ' + name + '\n' + r.stderr); assert.equal(r.signal, null);
  const validated = native(r.stderr); write(path.join(dir, name + '.native.json'), validated); return { receipt: pin(path.join(dir, name + '.process.json')), native: pin(path.join(dir, name + '.native.json')), result: r };
}
function assetPreloadSource() {
  return "import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import pw from " + JSON.stringify(pathToFileURL(path.join(ROOT, 'scripts/lib/playwrightLoader.mjs')).href) + ";" +
    "const cache=process.env.FREE_KICK_FONT_CACHE,receipt=process.env.SAVED_LIST_ASSET_RECEIPT;assert(path.isAbsolute(cache));assert(path.isAbsolute(receipt));const hash=b=>createHash('sha256').update(b).digest('hex');const entries=JSON.parse(fs.readFileSync(path.join(cache,'manifest.json'),'utf8'));const fonts=new Map(entries.map(e=>{assert(['https://fonts.googleapis.com','https://fonts.gstatic.com'].includes(new URL(e.url).origin));assert(/^[a-f0-9]{64}$/.test(e.file));const body=fs.readFileSync(path.join(cache,e.file));assert.equal(hash(body),e.sha256);return[e.url,{body,contentType:e.contentType,file:path.join(cache,e.file),sha256:e.sha256}]}));" +
    "pw.chromium._playwright._instrumentation.addListener({async runAfterCreateBrowserContext(context){await context.route('**/*',async route=>{const r=route.request(),url=r.url();if(r.method()==='GET'&&fonts.has(url)){const entry=fonts.get(url);fs.appendFileSync(receipt,JSON.stringify({url,method:r.method(),resourceType:r.resourceType(),action:'held-font',file:entry.file,bytes:entry.body.length,sha256:entry.sha256})+'\\n');return route.fulfill({status:200,body:entry.body,contentType:entry.contentType});}const u=new URL(url),segments=u.pathname.split('/');if(r.method()==='GET'&&r.resourceType()==='image'&&u.origin==='https://flagcdn.com'&&!u.search&&!u.hash&&segments.length===3&&['w40','w80','w160'].includes(segments[1])&&/^[a-z]{2}(?:-(?:eng|sct|wls|nir))?[.]png$/.test(segments[2])){fs.appendFileSync(receipt,JSON.stringify({url,method:r.method(),resourceType:r.resourceType(),action:'declared-flag-abort'})+'\\n');return route.abort('blockedbyclient');}return route.fallback();});}});";
}
function fixtureSource() {
  return 'const day=new Date().getUTCDate();const section=(id,body)=>"<h2>"+id+"</h2>"+body;const li=t=>"<li>"+t+"</li>";let html="<h1>Fictional saved list proof</h1><p>These invented instructions exist only to exercise the actual saved-page generator. No sports facts or real service are used.</p>";' +
    'html+=section("flat-ul","<ul>"+Array.from({length:7},(_,i)=>li("Long item "+i+" "+"readable instruction ".repeat(22))).join("")+"</ul>");' +
    'html+=section("start","<ol start=4 type=A>"+li("Start four")+li("Start five")+"</ol><ol start=0 type=1>"+li("Zero start")+"</ol><ol start=-2 type=a>"+li("Negative start")+"</ol><ol start=3 type=i>"+li("Roman type")+"</ol><ol start=9 type=I>"+li("Upper Roman type")+"</ol>");' +
    'html+=section("value","<ol start=2 type=a><li>Value two</li><li value=9>Value nine</li><li>Value ten</li><li value=0>Value zero</li><li>Value one</li><li value=-2>Value minus two</li><li>Value minus one</li></ol>");' +
    'html+=section("reversed-explicit","<ol reversed start=7 type=i>"+li("Reverse seven")+li("Reverse six")+"</ol>");' +
    'html+=section("reversed-default","<ol reversed type=I>"+li("Default three")+li("Default two")+li("Default one")+"</ol>");' +
    'html+=section("adjacent","<ul>"+li("Adjacent first")+"</ul><ul>"+li("Adjacent second")+"</ul>");' +
    'html+=section("duplicates","<ul>"+li("Repeated owned item")+li("Repeated owned item")+(day===24?li("Repeated owned item"):"")+"</ul>");' +
    'html+=section("dated","<ol start=4>"+li("Static first")+li("Dated "+day)+li("Static last")+"</ol>");' +
    'html+=section("marked","<ol reversed><li>Marked three</li><li data-no-prerender>Visible marked two</li><li>Marked one</li></ol>");' +
    'html+=section("variance","<ol start="+day+">"+li("Unstable parent metadata")+"</ol>");' +
    'html+=section("preceding",day===24?"<ul>"+li("Preceding conditional")+"</ul>":"");html+=section("unrelated","<ul>"+li("Unrelated stable target")+"</ul>");' +
    'html+=section("legacy","<ul><li>Nested parent <ul><li>Nested child</li></ul></li></ul><ul><li>Shown fallback</li><li style=display:none>Hidden fallback</li></ul><div style=display:none><ul><li>Hidden ancestor old path</li></ul></div><ul><li><p>Compound paragraph</p></li></ul><blockquote><ul><li>Quoted list item</li></ul></blockquote><ol start=invalid type=bad><li>Invalid parent old path</li></ol><ol><li value=invalid>Invalid item old path</li></ol><ol start=999999999999999999><li>Overflow parent old path</li></ol><li>Orphan fallback</li><p>Inline <a href=/fictional-help>fictional help</a> once</p><table><tr><th>Fixture column</th><td>Same cell</td></tr><tr><th>Fixture column</th><td>Same cell</td></tr></table><table><tr><th>List cell</th><td><ul><li>Cell owned list</li></ul></td></tr></table><div data-site-chrome><p>Fixture chrome</p></div>");document.getElementById("root").innerHTML=html;';
}
function htmlShell(entry) { return '<!doctype html><html lang="en"><head><title>Fictional saved list proof</title><link rel="canonical" href="https://douknowball.com' + FIXTURE_ROUTE + '"><script type="module" src="/assets/' + entry + '"></script></head><body><div id="root"></div></body></html>'; }
async function serve(root, shellOnly) {
  const shell = fs.readFileSync(path.join(root, 'index.html'));
  const server = http.createServer((req, res) => { const url = new URL(req.url, 'http://127.0.0.1'), rel = decodeURIComponent(url.pathname).replace(/^\//, ''), target = path.resolve(root, rel); if (!target.startsWith(root + path.sep) && target !== root) { res.writeHead(403); res.end(); return; } let file = target; if (!shellOnly && fs.existsSync(target) && fs.statSync(target).isDirectory()) file = path.join(target, 'index.html'); if (url.pathname !== '/' && fs.existsSync(file) && fs.statSync(file).isFile()) { res.setHeader('content-type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : file.endsWith('.png') ? 'image/png' : file.endsWith('.svg') ? 'image/svg+xml' : 'text/html'); res.end(fs.readFileSync(file)); } else { res.setHeader('content-type', 'text/html'); res.end(shell); } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); return { server, base: 'http://127.0.0.1:' + server.address().port };
}
async function observe(job) {
  assert.equal(process.env.DEBUG, 'pw:browser'); assert.equal(process.env.DEBUG_COLORS, '0');
  assert.equal(job.version, 1); assert.equal(job.producerSha256, hash(fs.readFileSync(SELF))); assert(path.isAbsolute(job.root) && !job.root.startsWith(ROOT + path.sep));
  const hosted = await serve(job.root, job.reference), browser = await pw.chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ['--no-sandbox'] }); const records = [];
  try {
    for (const days of job.reference ? SAMPLE_DAYS : [null]) {
      const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, timezoneId: 'America/New_York', javaScriptEnabled: job.reference });
      if (job.reference) { await context.addInitScript(clockScript(days)); await context.route('**://*.supabase.co/**', () => {}); await context.route('**://*.googletagmanager.com/**', r => r.abort()); await context.route('**://pagead2.googlesyndication.com/**', r => r.abort()); }
      try {
        for (const route of job.routes) {
          const page = await context.newPage(), errors = []; page.on('pageerror', e => errors.push(String(e))); const requests = [];
          page.on('request', r => requests.push({ url: r.url(), method: r.method(), type: r.resourceType() }));
          await page.goto(hosted.base + route, { waitUntil: 'domcontentloaded', timeout: 25000 });
          if (job.reference && route !== FIXTURE_ROUTE) await page.waitForSelector('section[data-seo-content="ready"] article', { timeout: 20000 });
          if (job.reference) await page.waitForTimeout(3500);
          assert.deepEqual(errors, [], 'Observer setup/page errors');
          const dom = await page.evaluate(() => {
            const norm = text => text.trim().replace(/\s+/g, ' ');
            function describe(owner) { const tag = owner.tagName.toLowerCase(), items = [...owner.children].filter(e => e.tagName === 'LI'); let n = owner.hasAttribute('start') ? owner.start : owner.reversed ? items.length : 1; return { tag, start: n, reversed: !!owner.reversed, type: owner.getAttribute('type') || '1', items: items.map(li => { if (li.hasAttribute('value')) n = li.value; const row = { text: norm(li.textContent), ordinal: tag === 'ol' ? n : null, links: [...li.querySelectorAll('a')].map(a => ({ href: a.getAttribute('href'), text: norm(a.textContent) })) }; n += owner.reversed ? -1 : 1; return row; }) }; }
            const root = document.getElementById('dukb-snapshot') || document.body, article = document.querySelector('section[data-seo-content] article');
            const groups = [...root.querySelectorAll('ol,ul')].filter(e => !e.parentElement.closest('ol,ul')).map(describe), sections = {};
            for (const h of root.querySelectorAll('h2')) { const key = norm(h.textContent); if (!['flat-ul','start','value','reversed-explicit','reversed-default','adjacent','duplicates','dated','marked','variance','preceding','unrelated','legacy'].includes(key)) continue; const nodes = []; for (let e = h.nextElementSibling; e && e.tagName !== 'H2'; e = e.nextElementSibling) nodes.push(e); const box = document.createElement('div'); nodes.forEach(e => box.append(e.cloneNode(true))); sections[key] = { html: box.innerHTML, text: norm(box.textContent), groups: [...box.querySelectorAll('ol,ul')].filter(e => !e.parentElement.closest('ol,ul')).map(describe), li: [...box.querySelectorAll('li')].map(e => norm(e.textContent)), links: [...box.querySelectorAll('a')].map(e => ({ href: e.getAttribute('href'), text: norm(e.textContent) })), tables: [...box.querySelectorAll('table')].map(t => [...t.rows].map(r => [...r.cells].map(c => norm(c.textContent)))), chrome: [...box.querySelectorAll('[data-site-chrome]')].map(e => norm(e.textContent)) }; }
            return { title: document.title, canonical: document.querySelector('link[rel=canonical]')?.getAttribute('href'), html: root.innerHTML, text: norm(root.textContent), groups, guide: article ? [...article.querySelectorAll('ol,ul')].map(describe) : [], sections, clockLines: [...root.querySelectorAll('p,li,td,h1,h2,h3,h4')].filter(e => /\b\d{1,2}:\d{2}:\d{2}\b/.test(e.textContent)).map(e => ({ tag: e.tagName, html: e.outerHTML })) };
          });
          const key = (days === null ? 'saved' : 'day-' + days) + '-' + route.replaceAll('/', '_'); const file = path.join(job.out, key + '.json'); write(file, { route, days, dom, errors, requests });
          const cdp = await context.newCDPSession(page); write(path.join(job.out, key + '.ax.json'), await cdp.send('Accessibility.getFullAXTree')); await cdp.detach();
          await page.screenshot({ path: path.join(job.out, key + '.png'), fullPage: false }); records.push({ route, days, record: pin(file), screenshot: pin(path.join(job.out, key + '.png')), ax: pin(path.join(job.out, key + '.ax.json')) }); await page.close();
        }
      } finally { await context.close(); }
    }
  } finally { await browser.close(); await new Promise(resolve => hosted.server.close(resolve)); }
  write(job.result, { version: 1, status: 'passed', records, cleanup: { serversClosed: true, browsersClosed: true } }); console.log('SAVED_LIST_OBSERVER_COMPLETE');
}

if (process.argv[2] === '--observe') {
  assert.equal(process.argv.length, 4); const job = JSON.parse(fs.readFileSync(process.argv[3], 'utf8')); await observe(job);
} else {
  const noArguments = process.argv.length === 2, modeAbsent = !Object.hasOwn(process.env, 'SAVED_GUIDE_LISTS_MODE'), outAbsent = !Object.hasOwn(process.env, 'SAVED_GUIDE_LISTS_OUT');
  const args = new Map(); if (!noArguments) { assert.equal(process.argv.length, 8); for (let i = 2; i < process.argv.length; i += 2) { assert(['--root','--mode','--out'].includes(process.argv[i])); assert(!args.has(process.argv[i])); args.set(process.argv[i], process.argv[i + 1]); } }
  assert(noArguments || path.resolve(args.get('--root')) === ROOT);
  const mode = noArguments ? (modeAbsent ? 'baseline' : process.env.SAVED_GUIDE_LISTS_MODE) : args.get('--mode');
  assert.equal(mode, 'baseline', 'Fixed source is refused until authenticated original admission and reviewed fixed source extension');
  if (!modeAbsent) assert.equal(process.env.SAVED_GUIDE_LISTS_MODE, mode);
  const out = noArguments ? (outAbsent ? fs.mkdtempSync(path.join(os.tmpdir(), 'saved-guide-lists-evidence-')) : process.env.SAVED_GUIDE_LISTS_OUT) : args.get('--out');
  assert(path.isAbsolute(out)); assert(!path.resolve(out).startsWith(ROOT + path.sep)); if (!outAbsent) assert.equal(path.resolve(process.env.SAVED_GUIDE_LISTS_OUT), path.resolve(out));
  if (!noArguments || !outAbsent) { assert(!fs.existsSync(out), 'Fresh evidence root'); fs.mkdirSync(out, { recursive: true }); }
  const product = fs.readFileSync(path.join(ROOT, 'scripts/prerender.mjs')), canonical = lf(product.toString('utf8')); assert.equal(hash(canonical), ORIGINAL);
  const original = git(['show', BASE + ':scripts/prerender.mjs']); assert.equal(hash(lf(original)), ORIGINAL); fs.writeFileSync(path.join(out, 'original-prerender.mjs.txt'), original);
  const fontCache = path.resolve(process.env.FREE_KICK_FONT_CACHE || path.join(ROOT, 'free-kick-lab-artifacts/font-cache')); assert(fs.existsSync(path.join(fontCache, 'manifest.json')), 'Prepare authenticated held fonts remotely before guarded execution; this producer never downloads them'); const fontBefore = manifest(fontCache); write(path.join(out, 'font-cache-before.json'), fontBefore);
  const assetFile = path.join(out, 'held-assets.mjs'); fs.writeFileSync(assetFile, assetPreloadSource());
  const before = sourceState(), distBefore = manifest(path.join(ROOT, 'dist')); write(path.join(out, 'source-before.json'), before); write(path.join(out, 'dist-before.json'), distBefore);
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'saved-guide-lists-child-')), armDir = path.join(out, 'normal'); fs.mkdirSync(armDir);
  const report = { version: 1, status: 'running', scope: 'saved-guide-lists', mode, productQualified: false, evidenceRoot: out, sourceSha256: hash(canonical), physicalSourceSha256: hash(product), originalSha256: ORIGINAL, producerSha256: hash(fs.readFileSync(SELF)), defaultInvocation: { modeAbsent, outAbsent, noArguments }, arms: [], caseCount: 15, passedCount: 0, expectedFaultCount: 0, holds: {}, cleanup: {} };
  const processes = [], natives = [], outputRows = []; let failure = null;
  function operation(name, command, cwd, extra = {}) { const transport = path.join(armDir, name + '.transport'), assets = path.join(armDir, name + '.assets.jsonl'); fs.writeFileSync(transport, ''); fs.writeFileSync(assets, ''); const r = run(armDir, name, ['--import', assetFile, ...command], cwd, { ...process.env, ...extra, DEBUG: 'pw:browser', DEBUG_COLORS: '0', FREE_KICK_FONT_CACHE: fontCache, SIM_OFFLINE_RECEIPT: transport, SAVED_LIST_ASSET_RECEIPT: assets }); assert.equal(fs.readFileSync(transport, 'utf8'), '', 'Ordinary transport receipt empty'); for (const line of fs.readFileSync(assets, 'utf8').split('\n').filter(Boolean)) { const entry = JSON.parse(line); assert(['held-font','declared-flag-abort'].includes(entry.action)); assert.equal(entry.method, 'GET'); } if (name.endsWith('-generator')) { const count = extra.PRERENDER_ONLY.split(',').length; assert(r.result.stdout.includes('prerendered ' + count + ' routes, 0 failed')); assert(r.result.stdout.includes('clock samples at 0, 5, 11 days:')); } else assert.equal(r.result.stdout.trim(), 'SAVED_LIST_OBSERVER_COMPLETE'); processes.push(r.receipt); natives.push(r.native); return r; }
  function observer(name, root, routes, reference) { const dir = path.join(armDir, name); fs.mkdirSync(dir); const job = { version: 1, producerSha256: report.producerSha256, root, routes, reference, out: dir, result: path.join(dir, 'result.json') }; const file = path.join(dir, 'job.json'); write(file, job); operation(name, [SELF, '--observe', file], ROOT); const result = JSON.parse(fs.readFileSync(job.result, 'utf8')); assert.equal(result.status, 'passed'); return result.records.map(r => ({ ...r, data: JSON.parse(fs.readFileSync(r.record.file, 'utf8')) })); }
  try {
    for (const name of git(['ls-files', '-z']).split('\0').filter(Boolean)) { const dest = path.join(temp, name); fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.copyFileSync(path.join(ROOT, name), dest); }
    fs.symlinkSync(path.join(ROOT, 'node_modules'), path.join(temp, 'node_modules'), 'dir'); fs.cpSync(path.join(ROOT, 'dist'), path.join(temp, 'dist'), { recursive: true });
    const realRoutes = ['/player-bingo','/soccer-career']; const references = observer('real-reference', path.join(temp, 'dist'), realRoutes, true);
    operation('real-generator', ['scripts/prerender.mjs'], temp, { PRERENDER_ONLY: realRoutes.join(','), PRERENDER_SETTLE: '3500', PRERENDER_PORT: '4310', PRERENDER_CONTROL: '' });
    const saved = path.join(armDir, 'saved'); fs.mkdirSync(saved); fs.writeFileSync(path.join(saved, 'index.html'), '<!doctype html><title>Saved proof files</title>');
    for (const route of realRoutes) { const file = path.join(temp, 'dist', route.slice(1), 'index.html'), dest = path.join(saved, route.slice(1), 'index.html'); fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.copyFileSync(file, dest); outputRows.push(pin(dest)); assert.equal(hash(fs.readFileSync(file)), hash(fs.readFileSync(path.join(temp, 'public', route.slice(1), 'index.html')))); }
    const dist = path.join(temp, 'dist'); fs.rmSync(dist, { recursive: true }); fs.mkdirSync(dist); const entry = path.join(temp, 'fixture-entry.js'); fs.writeFileSync(entry, fixtureSource());
    await esbuild.build({ entryPoints: [entry], outdir: path.join(dist, 'assets'), entryNames: 'fixture-[hash]', bundle: true, format: 'esm', logLevel: 'silent' });
    const assets = fs.readdirSync(path.join(dist, 'assets')); assert.equal(assets.length, 1); fs.writeFileSync(path.join(dist, 'index.html'), htmlShell(assets[0])); fs.writeFileSync(path.join(dist, 'sitemap.xml'), '<urlset><url><loc>https://douknowball.com' + FIXTURE_ROUTE + '</loc></url></urlset>');
    const fixtureInputs = manifest(dist), retainedFixture = path.join(armDir, 'compiled-fixture'); fs.cpSync(dist, retainedFixture, { recursive: true }); assert.deepEqual(manifest(retainedFixture), fixtureInputs, 'Whole compiled fictional input bodies retained'); fs.copyFileSync(entry, path.join(armDir, 'fixture-entry.js.txt')); write(path.join(armDir, 'fixture-build.json'), fixtureInputs); const fixtureReferences = observer('fixture-reference', dist, [FIXTURE_ROUTE], true);
    operation('fixture-generator', ['scripts/prerender.mjs'], temp, { PRERENDER_ONLY: FIXTURE_ROUTE, PRERENDER_SETTLE: '3500', PRERENDER_PORT: '4310', PRERENDER_CONTROL: '' });
    for (const row of fixtureInputs) { const body = fs.readFileSync(path.join(dist, row.file)); assert.equal(body.length, row.bytes); assert.equal(hash(body), row.sha256, 'Actual served compiled fixture input held'); } assert.deepEqual(manifest(retainedFixture), fixtureInputs); write(path.join(armDir, 'fixture-input-hold.json'), { status: 'passed', before: fixtureInputs, retained: manifest(retainedFixture), afterActualGeneratorInputsEqual: true });
    const fixture = fs.readFileSync(path.join(dist, FIXTURE_ROUTE.slice(1), 'index.html'), 'utf8'); const dest = path.join(saved, FIXTURE_ROUTE.slice(1), 'index.html'); fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.writeFileSync(dest, fixture); outputRows.push(pin(dest));
    assert(fixture.includes('<div id="dukb-snapshot">')); const changed = fixture.replace('<div id="dukb-snapshot">', '<div id="dukb-snapshot"><li value="19">12:34:56</li>'); assert.notEqual(changed, fixture); const bad = path.join(saved, 'clock-control', 'index.html'); fs.mkdirSync(path.dirname(bad), { recursive: true }); fs.writeFileSync(bad, changed); write(path.join(armDir, 'attributed-clock-control.json'), { original: pin(dest), changed: pin(bad), effective: true });
    const observations = observer('saved-inspection', saved, [...realRoutes, FIXTURE_ROUTE, '/clock-control'], false); const get = route => observations.find(r => r.route === route).data.dom;
    const f = get(FIXTURE_ROUTE); for (const key of ['flat-ul','start','value','reversed-explicit','reversed-default','adjacent','duplicates','dated','marked','variance','unrelated','legacy']) assert(f.sections[key], 'Healthy fixture heading ' + key);
    assert.equal(references.length, 6); assert.equal(fixtureReferences.length, 3); for (const r of references) assert(r.data.dom.guide.length > 5, 'Actual full guide loaded');
    const cases = [];
    function check(index, actual, predicate) { let error = null; try { predicate(); } catch (e) { if (!(e instanceof assert.AssertionError)) throw e; error = 'SAVED_LIST_PURPOSE ' + (index + 1) + ': ' + e.message; } const expected = index < 13; assert.equal(!!error, expected, 'Exact declared baseline purpose result ' + TITLES[index]); cases.push({ id: String(index + 1).padStart(2, '0'), title: TITLES[index], status: error ? 'expected-fault' : 'passed', error, actual }); }
    for (const [i, route] of realRoutes.entries()) { const ref = references.find(r => r.route === route && r.days === 0).data.dom.guide, texts = new Set(ref.flatMap(g => g.items.map(x => x.text))); const got = get(route).groups.filter(g => g.items.some(x => texts.has(x.text))); check(i, { expected: ref, saved: got }, () => assert.deepEqual(got, ref)); }
    const group = key => f.sections[key].groups, ord = key => group(key).flatMap(g => g.items.map(x => x.ordinal));
    check(2, f.sections['flat-ul'], () => { assert.equal(group('flat-ul').length, 1); assert.equal(group('flat-ul')[0].tag, 'ul'); assert.equal(group('flat-ul')[0].items.length, 7); assert(group('flat-ul')[0].items.every(r => r.text.length > 400)); });
    check(3, f.sections.start, () => { assert.deepEqual(group('start').map(g => g.start), [4, 0, -2, 3, 9]); assert.deepEqual(group('start').map(g => g.type), ['A', '1', 'a', 'i', 'I']); assert.deepEqual(ord('start'), [4, 5, 0, -2, 3, 9]); });
    check(4, f.sections.value, () => { assert.equal(group('value')[0]?.type, 'a'); assert.deepEqual(ord('value'), [2, 9, 10, 0, 1, -2, -1]); });
    check(5, f.sections['reversed-explicit'], () => { assert.equal(group('reversed-explicit')[0]?.reversed, true); assert.equal(group('reversed-explicit')[0]?.type, 'i'); assert.deepEqual(ord('reversed-explicit'), [7, 6]); });
    check(6, f.sections['reversed-default'], () => { assert.equal(group('reversed-default')[0]?.start, 3); assert.equal(group('reversed-default')[0]?.type, 'I'); assert.deepEqual(ord('reversed-default'), [3, 2, 1]); });
    check(7, f.sections.adjacent, () => { assert.equal(group('adjacent').length, 2); assert.deepEqual(group('adjacent').map(g => g.items.length), [1, 1]); });
    check(8, f.sections.duplicates, () => { assert.equal(group('duplicates').length, 1); assert.equal(group('duplicates')[0].items.length, 2); });
    check(9, f.sections.dated, () => { assert.deepEqual(group('dated').flatMap(g => g.items.map(x => x.text)), ['Static first', 'Static last']); assert.deepEqual(ord('dated'), [4, 6]); });
    check(10, f.sections.marked, () => { assert.deepEqual(ord('marked'), [3, 1]); assert(!f.sections.marked.text.includes('Visible marked two')); });
    check(11, f.sections.variance, () => assert(!f.sections.variance.text.includes('Unstable parent metadata')));
    check(12, f.sections.unrelated, () => { assert.equal(group('unrelated').length, 1); assert.deepEqual(group('unrelated')[0].items.map(x => x.text), ['Unrelated stable target']); });
    const legacy = f.sections.legacy; write(path.join(armDir, 'whole-original-legacy-boundary.json'), { sourceSha256: ORIGINAL, fullSerializedBoundary: legacy.html, bytes: Buffer.byteLength(legacy.html), sha256: hash(legacy.html), meaning: 'Complete actual original serialization, retained for exact future fixed/whole-original boundary comparison, not merely the preservation assertions below.' }); check(13, legacy, () => { assert.deepEqual(legacy.links, [{ href: '/fictional-help', text: 'fictional help' }]); assert.deepEqual(legacy.tables, [[['Fixture column', 'Same cell'], ['Fixture column', 'Same cell']], [['List cell', 'Cell owned list']]]); assert.deepEqual(legacy.chrome, ['Fixture chrome']); assert.equal(legacy.groups.length, 0); assert(legacy.li.includes('Nested parent Nested child') && legacy.li.includes('Nested child') && legacy.li.includes('Orphan fallback')); assert(!legacy.text.includes('Hidden fallback')); });
    const badDom = get('/clock-control'); check(14, { normalClockLines: f.clockLines, changedClockLines: badDom.clockLines }, () => { assert.deepEqual(f.clockLines, []); assert.equal(badDom.clockLines.length, 1); assert.match(badDom.clockLines[0].html, /^<li value="19">12:34:56<\/li>$/); assert.throws(() => assert.equal(badDom.clockLines.length, 0, 'SAVED_LIST_ATTRIBUTED_CLOCK'), /SAVED_LIST_ATTRIBUTED_CLOCK/); });
    write(path.join(armDir, 'cases.json'), cases); write(path.join(armDir, 'source-module.json'), { sourceSha256: report.sourceSha256, originalSha256: ORIGINAL, exactWholeOriginal: true, productSource: pin(path.join(ROOT, 'scripts/prerender.mjs')), childSource: pin(path.join(temp, 'scripts/prerender.mjs')) });
    report.assets = { adapter: pin(assetFile), fontCache: pin(path.join(fontCache, 'manifest.json')), boundary: 'Exact held Google stylesheet/font bytes; bounded flagcdn image GET aborts recorded. No external fetch, real flag pixels, or full app visual qualification.' }; report.arms.push({ arm: 'normal', sourceSha256: report.sourceSha256, cases, caseCount: 15, passedCount: 2, expectedFaultCount: 13, faultTitles: TITLES.slice(0, 13), processes, native: natives, outputs: outputRows }); report.passedCount = 2; report.expectedFaultCount = 13;
  } catch (error) { failure = error; write(path.join(out, 'failure.json'), { status: 'failed', setupOrProtocolFailure: true, noPurposeCredit: true, name: error.name, message: error.message, stack: error.stack });
  } finally {
    fs.rmSync(temp, { recursive: true, force: true }); report.cleanup = { childrenRemoved: !fs.existsSync(temp), serversClosed: failure ? null : true, browsersClosed: failure ? null : true };
    const after = sourceState(), distAfter = manifest(path.join(ROOT, 'dist')), fontAfter = manifest(fontCache); write(path.join(out, 'source-after.json'), after); write(path.join(out, 'dist-after.json'), distAfter); write(path.join(out, 'font-cache-after.json'), fontAfter); assert.deepEqual(after, before, 'Complete original checkout source held'); assert.deepEqual(distAfter, distBefore, 'Complete serial build dist held'); assert.deepEqual(fontAfter, fontBefore, 'Complete held font cache unchanged'); report.holds = { sourceHeld: true, distHeld: true, transportEmpty: true };
    if (failure) { report.status = 'failed'; write(path.join(out, 'report.json'), report); }
  }
  if (failure) throw failure;
  assert.equal(report.arms.length, 1); assert(report.cleanup.childrenRemoved); report.status = 'passed'; write(path.join(out, 'report.json'), report);
  console.log('simPrerenderLists: actual whole original generator completed both real routes and the compiled fictional fixture.');
  console.log('simPrerenderLists: 15 cases, 13 exact expected semantic faults and 2 healthy controls. Product remains unqualified.');
  console.log('simPrerenderLists: complete source, dist and held-font input guards passed; disposable children removed.');
  console.log('SAVED_GUIDE_LISTS_COMPLETE ' + JSON.stringify({ mode, status: 'passed', productQualified: false, evidenceRoot: out, reportSha256: hash(fs.readFileSync(path.join(out, 'report.json'))), caseCount: 15, passedCount: 2, expectedFaultCount: 13 }));
}
