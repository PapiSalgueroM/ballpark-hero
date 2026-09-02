/**
 * Round 418 browser harness: crawler copy never paints for a JavaScript visitor.
 *
 * The home template and every saved route carry readable HTML so crawlers and
 * browsers without JavaScript get a complete document. That same copy used to
 * paint as a wall of plain text before React replaced #root. This harness uses
 * the real home template and a real committed game snapshot, then runs the
 * build plugin against a temporary fixture so both front doors are exercised.
 *
 * It proves four outcomes on the home page, a saved game and an account-only
 * stub:
 *   1. With the app bundle blocked, the copy stays in the DOM but is hidden and
 *      reserves exactly one viewport during the app handoff.
 *   2. If the app never boots, the full fallback becomes visible after a short
 *      recovery timeout instead of leaving a blank page.
 *   3. With JavaScript disabled, the full copy is visible and unclipped.
 *   4. With the bundle available, the app replaces the copy normally.
 *
 * NEGATIVE CONTROL: FIRST_PAINT_CONTROL=nomarker removes the early capability
 * marker from all fixture documents after the real plugin runs. Every immediate
 * handoff checks must catch the raw copy becoming visible.
 *
 * NEGATIVE CONTROL: FIRST_PAINT_CONTROL=norecovery disables the timeout action
 * in all fixture documents. Every failed-boot check must catch the fallback
 * remaining hidden.
 *
 * Run: node scripts/playFirstPaint.mjs
 */
import { createServer } from 'node:http';
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfigFromFile } from 'vite';
import pw from './lib/playwrightLoader.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.FIRST_PAINT_CONTROL || '';
if (CONTROL && !['nomarker', 'norecovery'].includes(CONTROL)) {
  console.error(`FIRST_PAINT_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(1);
}

const REQUESTED_PORT = process.env.FIRST_PAINT_PORT
  ? Number(process.env.FIRST_PAINT_PORT)
  : 0;
const TEMP = mkdtempSync(path.join(os.tmpdir(), 'dukb-first-paint-'));
const GAME_ROUTE = '/soccer-grid';
const STUB_ROUTE = '/profile';
const FIXTURES = [
  { route: '/', copyId: 'dukb-home-copy', minText: 400 },
  { route: GAME_ROUTE, copyId: 'dukb-snapshot', minText: 400 },
  { route: STUB_ROUTE, copyId: 'dukb-snapshot', minText: 80 },
];

let failures = 0;
let flashFindings = 0;
let recoveryFindings = 0;
const fail = (message, cause = '') => {
  failures += 1;
  if (cause === 'flash') flashFindings += 1;
  if (cause === 'recovery') recoveryFindings += 1;
  console.error('  FAIL: ' + message);
};

const isFile = file => {
  try { return statSync(file).isFile(); } catch { return false; }
};

let server;
let browser;
try {
  mkdirSync(path.join(TEMP, 'assets'), { recursive: true });
  for (const fixture of FIXTURES) {
    if (fixture.route !== '/') mkdirSync(path.join(TEMP, fixture.route.slice(1)), { recursive: true });
  }

  const sourceHome = readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const entryTag = '<script type="module" src="/src/main.tsx"></script>';
  if (!sourceHome.includes(entryTag)) throw new Error('index.html lost its source entry tag, fixture cannot be armed');
  const builtHome = sourceHome
    .replace(entryTag, '<script type="module" crossorigin src="/assets/app.js"></script>')
    .replace('</head>', '  <link rel="stylesheet" href="/assets/app.css">\n</head>');
  writeFileSync(path.join(TEMP, 'index.html'), builtHome);

  const gameSource = path.join(ROOT, 'public', GAME_ROUTE.slice(1), 'index.html');
  if (!isFile(gameSource)) throw new Error(`${GAME_ROUTE} has no committed snapshot fixture`);
  const staleMarker = `<script data-dukb-js-capability>document.documentElement.classList.add('stale-js')</script>`;
  const stalePaint = '<style data-dukb-first-paint>.stale-js #dukb-snapshot{display:block}</style>';
  const staleNoJs = '<noscript><style data-dukb-no-js-copy>#dukb-snapshot{display:none}</style></noscript>';
  const legacyPaint = '<style>#dukb-snapshot{max-height:100vh;overflow:hidden;opacity:.45}</style>';
  const legacyNoJs = '<noscript><style>#dukb-snapshot{max-height:none;overflow:visible;opacity:1}</style></noscript>';
  const seedTwice = (html, pattern, stale, label) => {
    const matches = html.match(pattern) || [];
    if (matches.length !== 1) throw new Error(`${GAME_ROUTE} has ${matches.length} ${label} tags before the stale fixture is planted, expected one`);
    return html.replace(pattern, `${stale}\n${stale}`);
  };
  let gameFixture = readFileSync(gameSource, 'utf8');
  gameFixture = seedTwice(gameFixture, /<script\b[^>]*data-dukb-js-capability[^>]*>[\s\S]*?<\/script>/g, staleMarker, 'capability');
  gameFixture = seedTwice(gameFixture, /<style\b[^>]*data-dukb-first-paint[^>]*>[\s\S]*?<\/style>/g, stalePaint, 'first-paint');
  gameFixture = seedTwice(gameFixture, /<noscript>\s*<style\b[^>]*data-dukb-no-js-copy[^>]*>[\s\S]*?<\/style>\s*<\/noscript>/g, staleNoJs, 'no-JavaScript');
  gameFixture = gameFixture.replace('</head>', `${legacyPaint}\n${legacyNoJs}\n</head>`);
  writeFileSync(path.join(TEMP, GAME_ROUTE.slice(1), 'index.html'), gameFixture);

  const stubSource = path.join(ROOT, 'public', STUB_ROUTE.slice(1), 'index.html');
  if (!isFile(stubSource)) throw new Error(`${STUB_ROUTE} has no committed hidden-page fixture`);
  copyFileSync(stubSource, path.join(TEMP, STUB_ROUTE.slice(1), 'index.html'));
  copyFileSync(path.join(ROOT, 'public', 'prerender-boot.js'), path.join(TEMP, 'prerender-boot.js'));
  writeFileSync(
    path.join(TEMP, 'assets', 'app.js'),
    "document.getElementById('root').innerHTML='<main class=\"app-ready\" data-app-ready>App ready</main>';",
  );
  writeFileSync(path.join(TEMP, 'assets', 'app.css'), 'html,body{margin:0}.app-ready{min-height:100vh}');

  /* Invoke the real build plugin. This keeps the game fixture honest: the
     harness observes the HTML the plugin emits instead of copying its rules. */
  const loaded = await loadConfigFromFile(
    { command: 'build', mode: 'production' },
    path.join(ROOT, 'vite.config.ts'),
    ROOT,
    'silent',
  );
  const plugin = loaded?.config?.plugins?.find(item => item?.name === 'dukb-inline-snapshot-assets');
  if (!plugin?.configResolved || !plugin?.closeBundle) throw new Error('snapshot asset plugin could not be loaded');
  plugin.configResolved({ build: { outDir: TEMP } });
  await plugin.closeBundle.call({});

  const fixtureFiles = [path.join(TEMP, 'index.html'), path.join(TEMP, GAME_ROUTE.slice(1), 'index.html')];
  const upgradedGame = readFileSync(path.join(TEMP, GAME_ROUTE.slice(1), 'index.html'), 'utf8');
  const upgradedTags = [
    ['capability', /data-dukb-js-capability/g, /<script data-dukb-js-capability>document\.documentElement\.classList\.add\('dukb-js'\);setTimeout/],
    ['first-paint', /data-dukb-first-paint/g, /<style data-dukb-first-paint>\.dukb-js #dukb-snapshot\{visibility:hidden;height:100vh/],
    ['no-JavaScript', /data-dukb-no-js-copy/g, /<noscript><style data-dukb-no-js-copy>#dukb-snapshot\{visibility:visible;height:auto/],
  ];
  for (const [label, countPattern, currentPattern] of upgradedTags) {
    const count = (upgradedGame.match(countPattern) || []).length;
    if (count !== 1 || !currentPattern.test(upgradedGame)) {
      throw new Error(`snapshot plugin left ${count} ${label} tags or did not replace stale content with the current tag`);
    }
  }
  if (upgradedGame.includes('stale-js') || upgradedGame.includes('display:none')
      || upgradedGame.includes(legacyPaint) || upgradedGame.includes(legacyNoJs)) {
    throw new Error('snapshot plugin left stale or legacy first-paint content in the upgraded game fixture');
  }

  fixtureFiles.push(path.join(TEMP, STUB_ROUTE.slice(1), 'index.html'));
  let timeoutShortened = 0;
  for (const file of fixtureFiles) {
    const before = readFileSync(file, 'utf8');
    const after = before.replace(',8000)</script>', ',1000)</script>');
    if (after === before) throw new Error(`fixture found no 8000ms recovery timeout in ${path.relative(TEMP, file)}`);
    writeFileSync(file, after);
    timeoutShortened += 1;
  }
  if (timeoutShortened !== FIXTURES.length) throw new Error('fixture did not shorten both recovery timeouts');

  let controlMutated = 0;
  if (CONTROL === 'nomarker') {
    const marker = /<script\s+data-dukb-js-capability(?:="")?>[\s\S]*?<\/script>/;
    for (const file of fixtureFiles) {
      const before = readFileSync(file, 'utf8');
      if (!marker.test(before)) throw new Error(`control found no capability marker in ${path.relative(TEMP, file)}`);
      const after = before.replace(marker, '');
      if (after === before) throw new Error(`control changed nothing in ${path.relative(TEMP, file)}`);
      writeFileSync(file, after);
      controlMutated += 1;
    }
    console.log('NEGATIVE CONTROL ON: removed the early capability marker from home, one game route and one hidden stub');
  } else if (CONTROL === 'norecovery') {
    const from = "document.documentElement.classList.remove('dukb-js')";
    const to = "document.documentElement.classList.contains('dukb-js')";
    for (const file of fixtureFiles) {
      const before = readFileSync(file, 'utf8');
      if (!before.includes(from)) throw new Error(`control found no recovery action in ${path.relative(TEMP, file)}`);
      const after = before.replace(from, to);
      if (after === before) throw new Error(`control changed nothing in ${path.relative(TEMP, file)}`);
      writeFileSync(file, after);
      controlMutated += 1;
    }
    console.log('NEGATIVE CONTROL ON: disabled failed-boot recovery on home, one game route and one hidden stub');
  }

  server = createServer((req, res) => {
    const pathname = decodeURIComponent((req.url || '/').split('?')[0]);
    const rel = pathname.replace(/^\/+/, '');
    const candidates = pathname === '/'
      ? [path.join(TEMP, 'index.html')]
      : [path.join(TEMP, rel), path.join(TEMP, rel, 'index.html')];
    const file = candidates.find(isFile);
    if (!file) { res.writeHead(404); res.end('missing'); return; }
    const ext = path.extname(file);
    const mime = ext === '.html' ? 'text/html; charset=utf-8'
      : ext === '.js' ? 'text/javascript'
        : ext === '.css' ? 'text/css' : 'application/octet-stream';
    res.writeHead(200, { 'content-type': mime, 'cache-control': 'no-store' });
    res.end(readFileSync(file));
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(REQUESTED_PORT, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('first-paint server did not expose a TCP port');
  const port = address.port;

  browser = await pw.chromium.launch();
  const measureCopy = async (page, copyId) => page.evaluate(id => {
    const copy = document.getElementById(id);
    if (!copy) return null;
    const style = getComputedStyle(copy);
    const rect = copy.getBoundingClientRect();
    return {
      visibility: style.visibility,
      opacity: Number(style.opacity),
      height: rect.height,
      viewport: window.innerHeight,
      clientHeight: copy.clientHeight,
      scrollHeight: copy.scrollHeight,
      textLength: (copy.textContent || '').trim().length,
    };
  }, copyId);

  console.log('1) blocked bundles hide the crawler copy during the immediate handoff');
  for (const fixture of FIXTURES) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await page.route('**/assets/app.js', route => route.abort());
    await page.route('https://fonts.googleapis.com/**', route => route.abort());
    await page.route('https://fonts.gstatic.com/**', route => route.abort());
    await page.goto(`http://127.0.0.1:${port}${fixture.route}`, { waitUntil: 'domcontentloaded' });
    const state = await measureCopy(page, fixture.copyId);
    if (!state || state.textLength < fixture.minText) {
      fail(`${fixture.route} has no complete crawler copy in the DOM while the bundle is blocked`);
    } else {
      const hidden = state.visibility === 'hidden' && state.opacity === 0;
      const oneViewport = Math.abs(state.height - state.viewport) <= 2;
      if (!hidden || !oneViewport) {
        fail(`${fixture.route} exposes or mis-sizes the pre-boot copy (visibility ${state.visibility}, opacity ${state.opacity}, ${state.height}px reserved for ${state.viewport}px)`, 'flash');
      }
      console.log(`   ${fixture.route.padEnd(14)} ${state.textLength} chars kept, visibility ${state.visibility}, reserved ${state.height}px`);
    }
    await page.waitForTimeout(1250);
    const recovered = await measureCopy(page, fixture.copyId);
    if (!recovered) {
      fail(`${fixture.route} lost its crawler copy before failed-boot recovery`);
    } else {
      const visible = recovered.visibility === 'visible' && recovered.opacity >= 0.99;
      const complete = recovered.scrollHeight <= recovered.clientHeight + 2;
      if (!visible || !complete) {
        fail(`${fixture.route} did not reveal its complete fallback after app boot failed (visibility ${recovered.visibility}, opacity ${recovered.opacity}, ${recovered.clientHeight}px of ${recovered.scrollHeight}px shown)`, 'recovery');
      }
      console.log(`   ${fixture.route.padEnd(14)} failed-boot fallback visibility ${recovered.visibility}, ${recovered.clientHeight}px of ${recovered.scrollHeight}px shown`);
    }
    await context.close();
  }

  console.log('2) no-JavaScript readers get the complete visible document');
  for (const fixture of FIXTURES) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false });
    const page = await context.newPage();
    await page.route('https://fonts.googleapis.com/**', route => route.abort());
    await page.route('https://fonts.gstatic.com/**', route => route.abort());
    await page.goto(`http://127.0.0.1:${port}${fixture.route}`, { waitUntil: 'domcontentloaded' });
    const state = await measureCopy(page, fixture.copyId);
    if (!state || state.textLength < fixture.minText) {
      fail(`${fixture.route} has no complete copy with JavaScript disabled`);
    } else {
      if (state.visibility !== 'visible' || state.opacity < 0.99) {
        fail(`${fixture.route} hides its copy from a no-JavaScript reader`);
      }
      if (state.scrollHeight > state.clientHeight + 2) {
        fail(`${fixture.route} clips ${state.scrollHeight - state.clientHeight}px of its no-JavaScript copy`);
      }
      console.log(`   ${fixture.route.padEnd(14)} ${state.textLength} chars visible, ${state.clientHeight}px of ${state.scrollHeight}px shown`);
    }
    await context.close();
  }

  console.log('3) an available bundle replaces the reserved copy');
  for (const fixture of FIXTURES) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await page.route('https://fonts.googleapis.com/**', route => route.abort());
    await page.route('https://fonts.gstatic.com/**', route => route.abort());
    await page.goto(`http://127.0.0.1:${port}${fixture.route}`, { waitUntil: 'domcontentloaded' });
    const booted = await page.waitForSelector('#root [data-app-ready]', { state: 'visible', timeout: 5000 })
      .then(() => true).catch(() => false);
    const copyLeft = await page.locator(`#${fixture.copyId}`).count();
    if (!booted || copyLeft !== 0) fail(`${fixture.route} did not replace its reserved copy when the bundle loaded`);
    console.log(`   ${fixture.route.padEnd(14)} app ready ${booted ? 'yes' : 'NO'}, old copy nodes ${copyLeft}`);
    await context.close();
  }

  console.log('');
  if (CONTROL === 'nomarker') {
    if (controlMutated === FIXTURES.length && flashFindings === FIXTURES.length && recoveryFindings === 0 && failures === FIXTURES.length) {
      console.log('playFirstPaint control: green. All three marker removals exposed the raw copy and all three were caught.');
    } else {
      console.error(`playFirstPaint control: RED. Mutated ${controlMutated}, caught ${flashFindings} flashes and ${recoveryFindings} recovery failures, saw ${failures} total findings.`);
      process.exitCode = 1;
    }
  } else if (CONTROL === 'norecovery') {
    if (controlMutated === FIXTURES.length && recoveryFindings === FIXTURES.length && flashFindings === 0 && failures === FIXTURES.length) {
      console.log('playFirstPaint control: green. All three disabled recovery actions left a blank fallback and all three were caught.');
    } else {
      console.error(`playFirstPaint control: RED. Mutated ${controlMutated}, caught ${recoveryFindings} recovery failures and ${flashFindings} flashes, saw ${failures} total findings.`);
      process.exitCode = 1;
    }
  } else if (failures > 0) {
    console.error(`playFirstPaint: ${failures} failure${failures === 1 ? '' : 's'}`);
    process.exitCode = 1;
  } else {
    console.log('playFirstPaint: green. The raw handoff stays hidden, failed boots recover, and crawlers keep the words.');
  }
} catch (error) {
  console.error('playFirstPaint setup failed: ' + String(error).split('\n')[0]);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close().catch(() => {});
  if (server) await new Promise(resolve => server.close(resolve));
  rmSync(TEMP, { recursive: true, force: true });
}
