/* Canonical creator contrast: computed solid colors, native theme and selections. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { chromium } from '../lib/playwrightLoader.mjs';

const ROOT = process.cwd(), originalHead = '62d7c8b3338809a1aec3d0aaa6b5c373ac9f581a';
const mode = process.env.APPEARANCE_CONTRAST_MODE, arm = process.env.APPEARANCE_CONTRAST_ARM || 'normal';
const evidenceRoot = process.env.APPEARANCE_CONTRAST_OUT, base = process.env.BASE_URL || 'http://127.0.0.1:4173';
const baseUrl = new URL(base), require = createRequire(import.meta.url);
assert(['baseline', 'fixed'].includes(mode), 'Explicit original or fixed proof mode');
assert(['normal', 'chip-old', 'category-old', 'gear-old', 'celebration-old', 'whole-original', 'restored'].includes(arm), 'Exact source arm');
assert(mode !== 'baseline' || arm === 'normal', 'Original mode has only the untouched normal arm');
assert(['1', 'true'].includes(process.env.CI) && process.env.SIM_NETWORK === 'offline', 'Remote offline CI only');
assert(process.env.NODE_OPTIONS?.includes('offlineTransport.cjs') && require.cache[require.resolve('../lib/offlineTransport.cjs')], 'Ordinary offline preload is actually installed');
assert(baseUrl.protocol === 'http:' && baseUrl.hostname === '127.0.0.1' && baseUrl.port && baseUrl.pathname === '/' && !baseUrl.search && !baseUrl.hash && base === baseUrl.origin, 'One explicit loopback server origin');
assert(evidenceRoot && path.isAbsolute(evidenceRoot) && path.relative(ROOT, evidenceRoot).split(path.sep).includes('..'), 'External evidence root');
const out = path.join(evidenceRoot, 'browser', arm); assert(!fs.existsSync(out), 'Fresh arm output'); fs.mkdirSync(out, { recursive: true });
const hash = body => createHash('sha256').update(body).digest('hex');
const git = args => execFileSync('git', args, { cwd: ROOT, maxBuffer: 64 * 1024 * 1024 });
const lf = body => body.toString('utf8').replace(/\r\n/g, '\n');
const originalInk = 'border-emerald-500 bg-emerald-500/15 text-emerald-300';
const fixedInk = originalInk + ' [.light_&]:text-foreground';
const hunk = (group, prefix) => ({ group, old: prefix + '"' + originalInk + '"', fixed: prefix + '"' + fixedInk + '"' });
const hunks = [hunk('chip', '      active\n        ? '), hunk('category', '              tab === t.key\n                ? '),
  hunk('gear', '                  appearance.boots === b.id\n                    ? '), hunk('celebration', '                  appearance.celebration === c.id\n                    ? ')];
const builderPath = 'src/components/soccer-career/AppearanceBuilder.tsx';
const originalBuilder = lf(git(['show', originalHead + ':' + builderPath]));
let expectedBuilder = originalBuilder;
const oldGroups = mode === 'baseline' || arm === 'whole-original' ? hunks.map(item => item.group) : arm.endsWith('-old') ? [arm.slice(0, -4)] : [];
for (const item of hunks) {
  assert.equal(originalBuilder.split(item.old).length - 1, 1, item.group + ' unique executable original ink hunk');
  assert.equal(originalBuilder.split(item.fixed).length - 1, 0);
  if (!oldGroups.includes(item.group)) expectedBuilder = expectedBuilder.replace(item.old, item.fixed);
}
assert.equal(lf(fs.readFileSync(builderPath)), expectedBuilder, 'Actual source is precisely its declared rebuilt ink arm');
let recovered = expectedBuilder;
for (const item of hunks) if (!oldGroups.includes(item.group)) {
  assert.equal(recovered.split(item.fixed).length - 1, 1); recovered = recovered.replace(item.fixed, item.old);
}
assert.equal(recovered, originalBuilder, 'Whole Builder inverse recovers the admitted PR341 source');
const files = [builderPath, 'src/components/soccer-career/PlayerAvatar.tsx', 'src/lib/soccerCareerAppearance.ts', 'src/lib/careerAppearanceCopy.ts',
  'src/lib/soccerBoots.ts', 'src/pages/SoccerCareer.tsx', 'src/lib/soccerCareerEngine.ts', 'src/lib/soccerCareerSave.ts',
  'src/components/us-career/UsCareerBoard.tsx', 'src/components/layout/ThemeToggle.tsx', 'src/lib/theme.ts', 'src/index.css',
  'src/App.tsx', 'src/components/game/Footer.tsx', 'scripts/lib/playwrightLoader.mjs', 'scripts/lib/offlineTransport.cjs'];
const source = files.map(file => {
  const original = git(['show', originalHead + ':' + file]), actual = fs.readFileSync(file);
  if (file !== builderPath) assert(original.equals(actual), file + ' remains exact PR341 source');
  return { file, originalSha256: hash(original), actualSha256: hash(actual) };
});
const sourceStatus = git(['status', '--porcelain=v1', '--untracked-files=all']);
const inventory = directory => {
  const rows = [];
  const visit = folder => { for (const entry of fs.readdirSync(folder, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const filename = path.join(folder, entry.name); assert(!entry.isSymbolicLink(), 'Dist contains no symlink');
    if (entry.isDirectory()) visit(filename); else { assert(entry.isFile()); const body = fs.readFileSync(filename); rows.push({ file: path.relative(directory, filename).split(path.sep).join('/'), bytes: body.length, sha256: hash(body), modifiedTimeUtc: fs.statSync(filename).mtime.toISOString() }); }
  } };
  visit(directory); return rows;
};
const distBefore = inventory(path.resolve('dist'));
const cacheRoot = process.env.FREE_KICK_FONT_CACHE;
assert(cacheRoot && path.isAbsolute(cacheRoot), 'Verified font cache required');
const fontManifest = JSON.parse(fs.readFileSync(path.join(cacheRoot, 'manifest.json')));
const fonts = new Map(fontManifest.map(row => {
  const body = fs.readFileSync(path.join(cacheRoot, row.file)); assert.equal(hash(body), row.sha256, row.url);
  return [row.url, { body, contentType: row.contentType }];
}));
const cors = { 'access-control-allow-origin': base, 'access-control-allow-headers': 'authorization, apikey, content-type, x-client-info', 'access-control-allow-methods': 'GET, POST, OPTIONS' };
const emptyImage = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aV0sAAAAASUVORK5CYII=', 'base64');
const supabaseOrigin = 'https://flawuiqbvjobmkfkauhw.supabase.co';
const sports = [{ sport: 'soccer', route: '/soccer-career', gear: 'Boots' }, { sport: 'nfl', route: '/nfl-my-career', gear: 'Cleats' },
  { sport: 'nba', route: '/nba-my-career', gear: 'Sneakers' }, { sport: 'mlb', route: '/mlb-my-career', gear: 'Cleats' }, { sport: 'nhl', route: '/nhl-my-career', gear: 'Skates' }];
const specs = (arm === 'normal' || arm === 'restored') ? sports.flatMap(spec => [320, 390, 430, 1440].map(width => ({ ...spec, width }))) : [{ ...sports[0], width: 390 }];
const sampleCounts = { category: 6, chip: 6, gear: 2, celebration: 2, unselected: 5 };
const expectedFaults = specs.length * oldGroups.reduce((count, group) => count + sampleCounts[group], 0);
const report = { version: 1, mode, arm, originalHead, base, startedAtUtc: new Date().toISOString(), source, sourceBuilderSha256: source[0].actualSha256, builderInverseSha256: hash(recovered), sourceStatusSha256: hash(sourceStatus),
  distBefore, fontManifestSha256: hash(fs.readFileSync(path.join(cacheRoot, 'manifest.json'))), status: 'failed', productQualified: false,
  scope: 'Canonical five-sport creator routes and native Light mode. Computed solid RGBA alpha composition, including selected tint. No CSS, appearance prop, app state or DOM style injection. Native return-to-control scrolling is explicit; no global no-scroll claim.',
  authority: { url: 'https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html', technique: 'https://www.w3.org/WAI/WCAG22/Techniques/general/G18', minimum: 4.5, rounding: 'none', sRGBLinearCutoff: 0.04045, limit: 'Selected creator normal text only, no whole-site WCAG conformance claim' },
  expected: { contexts: specs.length, themesPerContext: 2, samplesPerTheme: 21, groupsPerTheme: sampleCounts, totalSamples: specs.length * 42, contrastFaults: expectedFaults, nativeProcesses: specs.length, selectionsPerContext: 10, nativeActionsPerContext: 23 },
  census: specs.map(spec => ({ ...spec, id: spec.sport + '-' + spec.width })), cases: [], waits: [] };
const save = () => fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
const wall = ms => new Promise(resolve => setTimeout(resolve, ms));
const bounded = async (row, label, operation, milliseconds = 20000) => {
  const receipt = { label, limitMs: milliseconds, status: 'pending' }; (row?.waits || report.waits).push(receipt); let timer;
  try { const value = await Promise.race([Promise.resolve().then(operation), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Bounded setup/completion timed out: ' + label + '; no contrast credit')), milliseconds); })]); receipt.status = 'fulfilled'; return value; }
  catch (error) { receipt.status = 'rejected'; receipt.error = String(error?.stack ?? error); throw error; }
  finally { clearTimeout(timer); }
};
const groupsForTheme = samples => Object.fromEntries(Object.keys(sampleCounts).map(group => [group, samples.filter(item => item.group === group).length]));

try {
  for (const [launchIndex, spec] of specs.entries()) {
    const id = spec.sport + '-' + spec.width, touch = spec.width < 600;
    const row = { ...spec, id, touch, nativeLaunchOrdinal: launchIndex + 1, status: 'failed', errors: [], unexpectedWrites: [], requests: [], responses: [], assets: [], readFixtures: [], externalFixtures: [],
      actions: [], settles: [], observations: [], measurements: [], selections: [], screenshots: [], waits: [], lifecycle: { launched: false, contextCreated: false, contextClosed: false, browserClosed: false } };
    report.cases.push(row); save();
    let browser, context, page; const observers = [], pendingRoutes = new Set(), requests = new Map(); let nextRequest = 0;
    const requestRecord = request => {
      if (!requests.has(request)) { const value = { id: ++nextRequest, url: request.url(), method: request.method(), resourceType: request.resourceType(), terminal: 'pending', classified: false }; requests.set(request, value); row.requests.push(value); }
      return requests.get(request);
    };
    try {
      browser = await bounded(row, 'launch fresh Chromium process', () => chromium.launch({ headless: true }), 45000); row.lifecycle.launched = true; row.lifecycle.launchedAtUtc = new Date().toISOString();
      row.browserVersion = browser.version(); row.executablePath = chromium.executablePath();
      context = await bounded(row, 'create fresh context', () => browser.newContext({ viewport: { width: spec.width, height: 844 }, deviceScaleFactor: 1, isMobile: touch, hasTouch: touch,
        locale: 'en-US', timezoneId: 'UTC', reducedMotion: 'reduce', serviceWorkers: 'block', storageState: { cookies: [], origins: [{ origin: base, localStorage: [
          { name: 'cookie-consent', value: 'essential' }, { name: 'rules-gate-seen:' + spec.route, value: '1' }, { name: 'appearance-contrast-held-save', value: '{"held":true}' },
        ] }] } })); row.lifecycle.contextCreated = true;
      await bounded(row, 'install ordinary routed fixtures', () => context.route('**/*', async route => {
        const request = route.request(), record = requestRecord(request), url = new URL(request.url()); pendingRoutes.add(record.id);
        try {
          if (url.origin === base) { assert.equal(request.method(), 'GET', 'Only local document/asset reads'); record.classification = 'physical-dist'; record.classified = true; return await route.continue(); }
          if (request.method() === 'OPTIONS') { assert.equal(url.origin, supabaseOrigin, 'Only existing Supabase read preflight'); record.classification = 'read-preflight'; record.classified = true; return await route.fulfill({ status: 204, headers: cors, body: '' }); }
          if (url.href === supabaseOrigin + '/rest/v1/rpc/most_played_today' && request.method() === 'POST') {
            assert.equal(request.postData(), '{"p_min":3,"p_limit":3}', 'Exact existing read-only RPC');
            const fixture = { requestId: record.id, url: url.href, method: 'POST', rawBody: request.postData(), classification: 'read-only-most-played', intercepted: true, fulfilled: false };
            row.readFixtures.push(fixture); record.classification = fixture.classification; record.classified = true;
            await route.fulfill({ status: 200, headers: cors, contentType: 'application/json', body: '[]' }); fixture.fulfilled = true; return;
          }
          if (fonts.has(url.href)) {
            assert.equal(request.method(), 'GET'); const cached = fonts.get(url.href); record.classification = 'checked-font-cache'; record.classified = true;
            row.externalFixtures.push({ requestId: record.id, url: url.href, classification: record.classification, bytes: cached.body.length, sha256: hash(cached.body) });
            return await route.fulfill({ status: 200, headers: cors, ...cached });
          }
          assert.notEqual(request.resourceType(), 'font', 'All requested font bodies are in the checked cache');
          if (request.method() !== 'GET') row.unexpectedWrites.push({ url: url.href, method: request.method(), body: request.postData() });
          assert.equal(request.method(), 'GET', 'No external application writes or unknown HEAD');
          const kind = request.resourceType(); let contentType = 'application/json', body = '[]';
          if (kind === 'image') { contentType = 'image/png'; body = emptyImage; record.classification = 'external-image-placeholder'; }
          else if (kind === 'script') { contentType = 'application/javascript'; body = ''; record.classification = 'external-script-empty'; }
          else if (kind === 'stylesheet') { contentType = 'text/css'; body = ''; record.classification = 'external-stylesheet-empty'; }
          else { assert.equal(url.origin, supabaseOrigin, 'Only declared Supabase read facade'); assert(url.pathname.startsWith('/rest/v1/') || url.pathname.startsWith('/auth/v1/'), 'Only existing read paths'); body = url.pathname.startsWith('/auth/v1/') ? '{}' : '[]'; record.classification = 'supabase-read-empty'; }
          record.classified = true; const bytes = Buffer.isBuffer(body) ? body : Buffer.from(body);
          row.externalFixtures.push({ requestId: record.id, url: url.href, classification: record.classification, contentType, bytes: bytes.length, sha256: hash(bytes) });
          await route.fulfill({ status: 200, headers: cors, contentType, body });
        } catch (error) { row.errors.push('Route: ' + String(error?.stack ?? error)); try { await route.abort('failed'); } catch {} }
        finally { pendingRoutes.delete(record.id); }
      }));
      await bounded(row, 'block WebSockets', () => context.routeWebSocket('**/*', socket => { row.errors.push('Unexpected WebSocket: ' + socket.url()); socket.close(); }));
      await bounded(row, 'install passive native telemetry', () => context.addInitScript(() => {
        window.__appearanceContrast = { randomCalls: 0, events: [], rejections: [] };
        const originalRandom = Math.random;
        Math.random = function (...args) { window.__appearanceContrast.randomCalls++; return Reflect.apply(originalRandom, this, args); };
        window.addEventListener('unhandledrejection', event => window.__appearanceContrast.rejections.push(String(event.reason?.stack ?? event.reason)));
        for (const type of ['click', 'keydown', 'touchstart']) window.addEventListener(type, event => {
          const target = event.target instanceof Element ? event.target.closest('button') : null;
          if (target) window.__appearanceContrast.events.push({ type, trusted: event.isTrusted, label: target.textContent.trim(), key: event.key || null, time: performance.now() });
        }, { capture: true, passive: true });
      }));
      page = await bounded(row, 'create real page', () => context.newPage()); page.setDefaultTimeout(15000);
      page.on('request', requestRecord);
      page.on('requestfinished', request => { requestRecord(request).terminal = 'finished'; });
      page.on('requestfailed', request => { const record = requestRecord(request); record.terminal = 'failed'; record.failure = request.failure(); row.errors.push('Request failed: ' + request.url() + ' ' + JSON.stringify(request.failure())); });
      page.on('pageerror', error => row.errors.push('Page: ' + error.message));
      page.on('console', message => { if (message.type() === 'error') row.errors.push('Console: ' + message.text()); });
      page.on('response', response => {
        const record = requestRecord(response.request());
        observers.push(bounded(row, 'actual response ' + record.id, async () => {
          const received = { requestId: record.id, url: response.url(), status: response.status(), headers: await response.allHeaders(), finished: false }; row.responses.push(received);
          if (new URL(response.url()).origin === base) {
            assert.equal(response.status(), 200, response.url()); const body = await response.body();
            const pathname = new URL(response.url()).pathname, relative = pathname.endsWith('/') ? pathname + 'index.html' : path.extname(pathname) ? pathname : pathname + '/index.html';
            const physical = path.resolve('dist', '.' + decodeURIComponent(relative));
            assert(physical.startsWith(path.resolve('dist') + path.sep), 'Response resolves inside actual dist');
            const actual = fs.readFileSync(physical); assert.equal(hash(body), hash(actual), 'Every local response matches its physical completed dist bytes');
            row.assets.push({ requestId: record.id, path: pathname, physical: path.relative(ROOT, physical).split(path.sep).join('/'), bytes: body.length, sha256: hash(body), physicalSha256: hash(actual) });
          }
          assert.equal(await response.finished(), null, 'Every actual response has a clean finished terminal'); received.finished = true;
        }, 30000).catch(error => row.errors.push('Response: ' + String(error?.stack ?? error))));
      });
      const editor = page.getByRole('heading', { name: 'Create Your Look', exact: true }).locator('xpath=../..');
      const panel = editor.locator(':scope > div.overflow-y-auto');
      const tabs = editor.locator(':scope > div').nth(2);
      const stores = () => page.evaluate(() => ({ local: Object.fromEntries(Object.entries(localStorage).sort()), session: Object.fromEntries(Object.entries(sessionStorage).sort()) }));
      const snapshot = () => editor.evaluate(element => {
        const options = element.querySelector(':scope > div.overflow-y-auto'), categories = element.children[2];
        const rect = node => { const box = node.getBoundingClientRect(); return { x: box.x, y: box.y, width: box.width, height: box.height, right: box.right, bottom: box.bottom }; };
        const button = node => ({ label: node.textContent.trim(), selected: node.classList.contains('border-emerald-500'), rect: rect(node) });
        return { x: scrollX, y: scrollY, viewport: { width: innerWidth, height: innerHeight }, documentWidth: document.documentElement.scrollWidth,
          editor: rect(element), panel: { ...rect(options), scrollTop: options.scrollTop, scrollHeight: options.scrollHeight, clientHeight: options.clientHeight },
          categories: [...categories.querySelectorAll('button')].map(button), options: [...options.querySelectorAll('button')].map(button),
          previewText: element.children[1].textContent, avatarSvg: element.querySelector('[role="img"]').outerHTML, randomCalls: window.__appearanceContrast.randomCalls };
      });
      const settle = label => bounded(row, 'settle ' + label, async () => {
        const frameTimes = await page.evaluate(() => new Promise(resolve => requestAnimationFrame(first => requestAnimationFrame(second => resolve([first, second])))));
        assert(frameTimes[1] > frameTimes[0], 'Two advancing native animation frames'); await wall(300); row.settles.push({ label, nativeFrameTimes: frameTimes, wallMs: 300 });
      });
      const position = async (locator, label) => {
        const before = await page.evaluate(() => ({ x: scrollX, y: scrollY }));
        await bounded(row, 'native scroll ' + label, () => locator.evaluate(element => element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' })));
        await settle('position ' + label); const bounds = await locator.boundingBox();
        assert(bounds && bounds.x >= -0.5 && bounds.y >= 64 && bounds.x + bounds.width <= spec.width + 0.5 && bounds.y + bounds.height <= 844, label + ' is inside the real viewport');
        return { before, after: await page.evaluate(() => ({ x: scrollX, y: scrollY })), bounds };
      };
      const activate = async (locator, label) => {
        assert.equal(await locator.count(), 1, label + ' one actual control'); const positioned = await position(locator, label);
        const beforeEventCount = await page.evaluate(() => window.__appearanceContrast.events.length);
        if (touch) await bounded(row, 'touch ' + label, () => page.touchscreen.tap(positioned.bounds.x + positioned.bounds.width / 2, positioned.bounds.y + positioned.bounds.height / 2));
        else { await bounded(row, 'focus ' + label, () => locator.focus()); assert(await locator.evaluate(element => document.activeElement === element)); await bounded(row, 'Enter ' + label, () => page.keyboard.press('Enter')); }
        await settle('activate ' + label); const events = await page.evaluate(start => window.__appearanceContrast.events.slice(start), beforeEventCount);
        assert(events.some(event => event.type === 'click' && event.trusted), label + ' has a trusted actual click');
        if (touch) assert(events.some(event => event.type === 'touchstart' && event.trusted), label + ' has trusted touch');
        else assert(events.some(event => event.type === 'keydown' && event.key === 'Enter' && event.trusted), label + ' has trusted Enter');
        row.actions.push({ label, input: touch ? 'native touch' : 'native keyboard Enter', ...positioned, events });
      };
      const measure = async (locator, group, sample, theme, selected) => {
        await position(locator, 'measure ' + sample);
        const labelGroup = group === 'unselected' ? sample.split(':')[0] : group;
        const observed = await bounded(row, 'computed contrast ' + sample, () => locator.evaluate((button, args) => {
          const target = button.lastElementChild?.tagName === 'SPAN' && ['gear', 'celebration'].includes(args.labelGroup) ? button.lastElementChild : button;
          const textNode = [...target.childNodes].find(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
          if (!textNode) throw new Error('Measured target must contain literal visible label text');
          const raw = textNode.textContent, start = raw.search(/\S/), end = raw.trimEnd().length;
          const range = document.createRange(); range.setStart(textNode, start); range.setEnd(textNode, end); const box = range.getBoundingClientRect();
          const rgba = value => {
            const match = /^rgba?\(\s*([\d.]+)[, ]+([\d.]+)[, ]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)$/.exec(value);
            if (!match) throw new Error('Unsupported computed solid color: ' + value);
            const result = [Number(match[1]), Number(match[2]), Number(match[3]), match[4] === undefined ? 1 : Number(match[4])];
            if (!result.every(Number.isFinite) || result.slice(0, 3).some(value => value < 0 || value > 255) || result[3] < 0 || result[3] > 1) throw new Error('Invalid RGBA'); return result;
          };
          const over = (front, back) => {
            const alpha = front[3] + back[3] * (1 - front[3]);
            return alpha ? [...front.slice(0, 3).map((channel, index) => (channel * front[3] + back[index] * back[3] * (1 - front[3])) / alpha), alpha] : [0, 0, 0, 0];
          };
          const luminance = color => color.slice(0, 3).map(channel => channel / 255).map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
          const ancestors = []; for (let node = target; node; node = node.parentElement) ancestors.unshift(node);
          let background = [0, 0, 0, 0]; const layers = [];
          for (const node of ancestors) {
            const style = getComputedStyle(node);
            for (const property of ['backgroundImage', 'filter', 'backdropFilter']) if (style[property] && style[property] !== 'none') throw new Error('Unsupported painted effect ' + property + ': ' + style[property]);
            if (Number(style.opacity) !== 1 || style.mixBlendMode !== 'normal' || style.backgroundBlendMode !== 'normal') throw new Error('Unsupported opacity or blend');
            for (const pseudo of ['::before', '::after']) { const value = getComputedStyle(node, pseudo); if (!['none', 'normal', '""'].includes(value.content)) throw new Error('Unsupported generated overlay'); }
            const color = rgba(style.backgroundColor); background = over(color, background);
            layers.push({ tag: node.tagName, id: node.id, classes: node.className?.baseVal ?? node.className, rawBackground: style.backgroundColor, rgba: color, composited: [...background] });
          }
          if (background[3] !== 1) throw new Error('No observed opaque background, no assumed canvas color');
          const style = getComputedStyle(target), foreground = rgba(style.color);
          if (style.textShadow !== 'none' || parseFloat(style.webkitTextStrokeWidth || '0') !== 0 || (style.webkitTextFillColor && style.webkitTextFillColor !== style.color)) throw new Error('Unsupported text paint');
          const effectiveForeground = over(foreground, background), foregroundLuminance = luminance(effectiveForeground), backgroundLuminance = luminance(background);
          const ratio = (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) / (Math.min(foregroundLuminance, backgroundLuminance) + 0.05);
          return { label: raw.trim(), buttonLabel: button.textContent.trim(), selected: button.classList.contains('border-emerald-500'), hovered: button.matches(':hover'), focused: document.activeElement === button,
            bounds: { x: box.x, y: box.y, width: box.width, height: box.height, right: box.right, bottom: box.bottom },
            font: { size: parseFloat(style.fontSize), rawSize: style.fontSize, weight: style.fontWeight, family: style.fontFamily, ready: document.fonts.check(style.fontWeight + ' ' + style.fontSize + ' ' + style.fontFamily) },
            rawForeground: style.color, foreground, layers, effectiveBackground: background, effectiveForeground, foregroundLuminance, backgroundLuminance, ratio,
            rootForeground: getComputedStyle(document.body).color, rootLight: document.documentElement.classList.contains('light'), storedTheme: localStorage.getItem('dukb-theme') };
        }, { labelGroup }));
        observed.paintHold = await bounded(row, 'two-frame paint stability ' + sample, () => locator.evaluate(async (button, args) => {
          const frameTimes = await new Promise(resolve => requestAnimationFrame(first => requestAnimationFrame(second => resolve([first, second]))));
          const target = button.lastElementChild?.tagName === 'SPAN' && ['gear', 'celebration'].includes(args.labelGroup) ? button.lastElementChild : button;
          const backgrounds = []; for (let node = target; node; node = node.parentElement) backgrounds.unshift(getComputedStyle(node).backgroundColor);
          const style = getComputedStyle(target);
          return { frameTimes, rawForeground: style.color, rawSize: style.fontSize, weight: style.fontWeight, family: style.fontFamily, backgrounds, hovered: button.matches(':hover') };
        }, { labelGroup }));
        assert(observed.paintHold.frameTimes[1] > observed.paintHold.frameTimes[0], 'Two actual advancing paint frames');
        assert.equal(observed.paintHold.rawForeground, observed.rawForeground, 'Actual foreground is settled across frames');
        assert.deepEqual(observed.paintHold.backgrounds, observed.layers.map(item => item.rawBackground), 'All actual background layers are settled across frames');
        assert.deepEqual([observed.paintHold.rawSize, observed.paintHold.weight, observed.paintHold.family], [observed.font.rawSize, observed.font.weight, observed.font.family], 'Actual font remains settled');
        assert.equal(observed.selected, selected, 'Actual selection owner'); assert.equal(observed.rootLight, theme === 'light'); assert.equal(observed.storedTheme, theme === 'light' ? 'light' : null);
        assert.equal(observed.font.size, labelGroup === 'chip' ? 12 : 11, 'Own label size excludes category emoji and gear swatch'); assert(observed.font.ready, 'Actual label font is loaded');
        if (!selected) assert(!observed.hovered && !observed.paintHold.hovered, 'Known healthy unselected label is not pointer-hovered');
        assert(observed.bounds.width > 0 && observed.bounds.height > 0 && observed.bounds.x >= -0.5 && observed.bounds.right <= spec.width + 0.5 && observed.bounds.y >= 64 && observed.bounds.bottom <= 844, 'Literal label is readable inside viewport');
        const expectedFailure = theme === 'light' && selected && oldGroups.includes(group), failed = observed.ratio < 4.5;
        if (selected && (theme === 'dark' || oldGroups.includes(group))) assert.deepEqual(observed.foreground, [110, 231, 183, 1], 'Original dark ink remains exact, including control/original Light');
        if (selected && theme === 'light' && !oldGroups.includes(group)) assert.equal(observed.rawForeground, observed.rootForeground, 'Fixed Light uses the actual existing foreground token');
        assert.equal(failed, expectedFailure, 'Only the exact intended rendered contrast failure is accepted: ' + sample + ' ' + theme + ' ratio=' + observed.ratio);
        row.measurements.push({ group, sample, theme, selected, threshold: 4.5, contrastFault: failed, expectedFailure, ...observed });
      };
      const capture = async label => {
        const filename = id + '-' + label + '.png'; await bounded(row, 'viewport capture ' + label, () => page.screenshot({ path: path.join(out, filename), animations: 'disabled' }));
        const body = fs.readFileSync(path.join(out, filename)); row.screenshots.push({ file: filename, bytes: body.length, sha256: hash(body), width: body.readUInt32BE(16), height: body.readUInt32BE(20) });
      };
      const themes = ['dark', 'light'], chosen = {};
      await bounded(row, 'hydrate canonical creator route', () => page.goto(base + spec.route, { waitUntil: 'networkidle' }), 45000);
      await bounded(row, 'actual creator heading', () => editor.waitFor()); assert.equal(await editor.count(), 1); assert.equal(await panel.count(), 1);
      await bounded(row, 'actual fonts ready', () => page.evaluate(() => document.fonts.ready)); await settle('hydration');
      row.storesBefore = await stores(); row.cookiesBefore = await context.cookies(); assert.deepEqual(row.cookiesBefore, []);
      assert(!Object.hasOwn(row.storesBefore.local, 'dukb-theme') && !await page.evaluate(() => document.documentElement.classList.contains('light')), 'Fresh route uses actual default dark');
      row.initial = await snapshot(); row.randomBefore = row.initial.randomCalls; const avatarHandle = await editor.locator('[role="img"]').elementHandle();
      for (const theme of themes) {
        if (theme === 'light') {
          const before = await snapshot(); const lightToggle = page.locator('footer').getByRole('button', { name: 'Light mode', exact: true });
          await activate(lightToggle, 'actual footer Light mode');
          assert(await page.evaluate(() => document.documentElement.classList.contains('light'))); assert.equal(await lightToggle.count(), 0, 'The real footer control changed to Dark mode');
          const after = await snapshot(); assert.equal(after.avatarSvg, before.avatarSvg, 'Native theme choice preserves exact appearance SVG'); assert.equal(after.previewText, before.previewText, 'Native theme choice preserves actual preview state');
          row.themeTransition = { before: { avatarSvg: before.avatarSvg, previewText: before.previewText }, after: { avatarSvg: after.avatarSvg, previewText: after.previewText } };
          const expectedStores = structuredClone(row.storesBefore); expectedStores.local['dukb-theme'] = 'light'; row.storesAfterThemeToggle = await stores(); assert.deepEqual(row.storesAfterThemeToggle, expectedStores, 'Only the native theme preference is stored');
        }
        for (const category of ['Skin', 'Hair', 'Beard', spec.gear, 'Extras', 'Celebration']) {
          const tab = tabs.getByRole('button', { name: new RegExp(category + '$') }), before = await snapshot(), tabHandle = await tab.elementHandle();
          await activate(tab, theme + ' category ' + category);
          assert(await tab.evaluate((element, previous) => element === previous, tabHandle), 'Category DOM identity survives native activation'); await tabHandle.dispose();
          const after = await snapshot(); assert.equal(after.avatarSvg, before.avatarSvg, 'Category navigation preserves actual SVG'); assert.equal(after.previewText, before.previewText, 'Category navigation preserves look');
          assert.equal(after.categories.filter(item => item.selected).length, 1); assert.equal(after.options.filter(item => item.selected).length, category === 'Skin' ? 0 : 1);
          assert(after.documentWidth <= spec.width + 2, 'No sideways creator overflow'); row.observations.push({ theme, category, before, after });
          await measure(tab, 'category', category, theme, true);
          if (category === 'Skin') continue;
          const group = ['Hair', 'Beard', 'Extras'].includes(category) ? 'chip' : category === spec.gear ? 'gear' : 'celebration';
          const optionButtons = panel.getByRole('button'), selectedIndex = after.options.findIndex(item => item.selected), alternativeIndex = after.options.findIndex(item => !item.selected);
          assert(selectedIndex >= 0 && alternativeIndex >= 0, 'Real selected and alternative options');
          const selectedButton = optionButtons.nth(selectedIndex), alternative = optionButtons.nth(alternativeIndex), alternativeHandle = await alternative.elementHandle();
          const currentLabel = after.options[selectedIndex].label, nextLabel = after.options[alternativeIndex].label;
          assert.notEqual(nextLabel, currentLabel, 'A distinct real alternative is selected');
          if (theme === 'light') assert.equal(currentLabel, chosen[category], 'Every existing manual appearance choice survived actual theme transition');
          await measure(selectedButton, group, category + ':current', theme, true);
          await measure(alternative, 'unselected', group + ':' + category + ':alternative', theme, false);
          const beforeChoice = await snapshot(); await activate(alternative, theme + ' choose ' + nextLabel);
          assert(await alternative.evaluate((element, previous) => element === previous, alternativeHandle), 'Actual option node survives parent-controlled selection'); await alternativeHandle.dispose();
          assert(await editor.locator('[role="img"]').evaluate((element, previous) => element === previous, avatarHandle), 'Actual avatar root keeps DOM identity');
          const afterChoice = await snapshot(); assert.equal(afterChoice.options.filter(item => item.selected).length, 1); assert(afterChoice.options[alternativeIndex].selected && !afterChoice.options[selectedIndex].selected, 'Actual callback changed exactly the selected option');
          if (group === 'gear' || group === 'celebration') { assert.notEqual(afterChoice.previewText, beforeChoice.previewText, 'Actual parent-controlled preview reflects the changed choice'); assert.equal(afterChoice.avatarSvg, beforeChoice.avatarSvg, 'Gear and celebration preserve existing avatar drawings'); }
          else assert.notEqual(afterChoice.avatarSvg, beforeChoice.avatarSvg, 'Real hair, beard or accessory choice changes actual SVG');
          row.selections.push({ theme, category, group, previous: currentLabel, selected: nextLabel, before: beforeChoice, after: afterChoice }); chosen[category] = nextLabel;
          await measure(alternative, group, category + ':changed', theme, true); if (['Hair', spec.gear, 'Celebration'].includes(category)) await capture(theme + '-' + category.toLowerCase());
        }
        const actualSamples = row.measurements.filter(item => item.theme === theme); assert.equal(actualSamples.length, 21); assert.deepEqual(groupsForTheme(actualSamples), sampleCounts);
        const expectedStores = structuredClone(row.storesBefore); if (theme === 'light') expectedStores.local['dukb-theme'] = 'light'; assert.deepEqual(await stores(), expectedStores, 'Manual appearance actions do not write any store');
      }
      await avatarHandle.dispose(); row.storesAfter = await stores(); row.cookiesAfter = await context.cookies(); assert.deepEqual(row.cookiesAfter, row.cookiesBefore, 'All-origin cookies held');
      row.randomAfter = await page.evaluate(() => window.__appearanceContrast.randomCalls); assert.equal(row.randomAfter, row.randomBefore, 'No new random draws from manual appearance or theme actions');
      row.events = await page.evaluate(() => window.__appearanceContrast.events); row.unhandledRejections = await page.evaluate(() => window.__appearanceContrast.rejections); assert.deepEqual(row.unhandledRejections, []);
      assert.equal(row.actions.length, 23); assert.equal(row.selections.length, 10); assert.equal(row.measurements.length, 42);
      assert.equal(row.measurements.filter(item => item.contrastFault).length, oldGroups.reduce((count, group) => count + sampleCounts[group], 0));
      await bounded(row, 'drain all response observers before close', () => Promise.all(observers), 45000);
      assert.equal(pendingRoutes.size, 0); assert(row.requests.length > 0 && row.requests.every(item => item.classified && item.terminal === 'finished'), 'Every actual request is classified and finished before close');
      assert.equal(row.responses.length, row.requests.length); assert(row.responses.every(item => item.finished), 'Every actual response observer finished before close');
      assert(row.assets.some(item => item.path === spec.route) && row.assets.some(item => item.path.endsWith('.js')) && row.assets.some(item => item.path.endsWith('.css')), 'Canonical document and actual built JS/CSS physically observed');
      assert(row.readFixtures.every(item => item.intercepted && item.fulfilled)); assert.deepEqual(row.unexpectedWrites, []); assert.deepEqual(row.errors, []);
      row.pendingBeforeClose = { requests: row.requests.filter(item => item.terminal === 'pending').length, routes: pendingRoutes.size, responseObservers: row.responses.filter(item => !item.finished).length };
      row.status = 'passed'; console.log(id + ': ' + row.measurements.length + ' computed text pairs, ' + row.measurements.filter(item => item.contrastFault).length + ' declared original-ink contrast faults.');
    } catch (error) {
      row.error = String(error?.stack ?? error);
      if (page) { const filename = id + '-failure.png'; try { await bounded(row, 'failure viewport capture', () => page.screenshot({ path: path.join(out, filename), animations: 'disabled' }), 10000); const body = fs.readFileSync(path.join(out, filename)); row.screenshots.push({ file: filename, bytes: body.length, sha256: hash(body), width: body.readUInt32BE(16), height: body.readUInt32BE(20) }); } catch (captureError) { row.errors.push('Capture: ' + String(captureError)); } }
    } finally {
      if (context) try { await bounded(row, 'close actual context', () => context.close(), 20000); row.lifecycle.contextClosed = true; row.lifecycle.contextClosedAtUtc = new Date().toISOString(); } catch (error) { row.errors.push('Context close: ' + String(error)); }
      await bounded(row, 'drain final response observers', () => Promise.all(observers), 45000).catch(error => row.errors.push('Final observers: ' + String(error)));
      if (browser) try { await bounded(row, 'close actual Chromium process', () => browser.close(), 20000); row.lifecycle.browserClosed = true; row.lifecycle.browserClosedAtUtc = new Date().toISOString(); } catch (error) { row.errors.push('Browser close: ' + String(error)); }
      row.pendingAfterClose = { requests: row.requests.filter(item => item.terminal === 'pending').length, routes: pendingRoutes.size, responseObservers: row.responses.filter(item => !item.finished).length };
      if (row.errors.length || row.unexpectedWrites.length || !row.lifecycle.browserClosed || !row.lifecycle.contextClosed || Object.values(row.pendingAfterClose).some(Boolean)) { row.status = 'failed'; row.error ||= 'Late request/response/cleanup failure'; }
      save();
    }
  }
} finally {
  report.sourceAfter = Object.fromEntries(source.map(item => [item.file, hash(fs.readFileSync(item.file))]));
  for (const item of source) assert.equal(report.sourceAfter[item.file], item.actualSha256, item.file + ' remains held');
  report.distAfter = inventory(path.resolve('dist')); assert.deepEqual(report.distAfter, distBefore, 'Every completed physical dist file and membership held');
  assert.deepEqual(git(['status', '--porcelain=v1', '--untracked-files=all']), sourceStatus, 'Tracked and untracked membership/status held'); report.sourceHeld = true; report.distHeld = true; save();
}
assert.equal(report.cases.length, report.expected.contexts); assert(report.cases.every(row => row.status === 'passed'), 'Every actual native context completed, setup/timeouts are not contrast faults');
assert.equal(report.cases.reduce((count, row) => count + row.measurements.length, 0), report.expected.totalSamples);
assert.equal(report.cases.reduce((count, row) => count + row.measurements.filter(item => item.contrastFault).length, 0), expectedFaults);
report.status = 'passed'; report.completedAtUtc = new Date().toISOString(); report.fixedContrastProofPassed = mode === 'fixed' && ['normal', 'restored'].includes(arm); save();
console.log(JSON.stringify({ mode, arm, contexts: report.cases.length, samples: report.expected.totalSamples, contrastFaults: expectedFaults, sourceHeld: true, distHeld: true, productQualified: false, reportSha256: hash(fs.readFileSync(path.join(out, 'report.json'))) }));
