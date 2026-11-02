import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { chromium } from '../lib/playwrightLoader.mjs';

assert.equal(process.env.CI, '1'); assert.equal(process.env.SIM_NETWORK, 'offline');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const artifact = path.resolve(process.env.WORLD_XI_ROUTE_OUT || path.join(root, 'world-xi-route-artifacts'));
const out = fs.mkdtempSync(path.join(artifact, 'fictional-recovery-'));
const origin = 'http://127.0.0.1:4174', sha = bytes => createHash('sha256').update(bytes).digest('hex');
const fixture = 'scripts/qa/fixtures/worldXiRecovery938.ts', boundary = 'scripts/qa/fixtures/worldXiRecoveryBoundary.ts';
const entry = 'scripts/qa/fixtures/worldXiRecovery.entry.tsx';
const sourcePaths = ['src/pages/WorldXi.tsx', 'src/lib/worldXi.ts', 'src/lib/worldXiNationPools.ts', 'src/lib/squadShape.ts', 'src/lib/positionFit.ts',
  'src/components/FlagImg.tsx', 'src/components/world-xi/SlotReel.tsx', 'src/components/game/GameHelp.tsx', 'src/components/game/HowToPlayPopover.tsx',
  'src/components/ui/dialog.tsx', 'src/data/gameContent/soccer1.ts', 'src/integrations/supabase/client.ts', fixture, boundary, entry, 'index.html', 'package.json', 'package-lock.json'];
const held = new Map(sourcePaths.map(file => [file, fs.readFileSync(path.join(root, file))]));
const sourceReceipts = () => [...held].map(([file, bytes]) => ({ file, bytes: bytes.length, sha256: sha(bytes) }));
fs.writeFileSync(path.join(out, 'source-before.json'), JSON.stringify(sourceReceipts(), null, 2));
const nodeFile = path.join(out, 'fixture-and-position-rules.mjs');
const nodeBundle = await build({ absWorkingDir: root, stdin: { contents: `export * from ${JSON.stringify(path.join(root, fixture))}; export { FORMATIONS } from ${JSON.stringify(path.join(root, 'src/lib/squadShape.ts'))}; export { fitsAllowed, slotAllowedPositions } from ${JSON.stringify(path.join(root, 'src/lib/positionFit.ts'))};`, resolveDir: root, sourcefile: 'fictional-recovery-rules.mjs' },
  outfile: nodeFile, bundle: true, platform: 'node', format: 'esm', metafile: true, alias: { '@': path.join(root, 'src') }, logLevel: 'silent' });
const rules = await import(pathToFileURL(nodeFile).href), pool = rules.createWorldXiRecovery938(), market = rules.createWorldXiRecoveryMarketRows();
assert.equal(pool.players.length, 938); assert.equal(pool.byCountry.size, 14); assert.equal(pool.countries.length, 12); assert.equal(market.length, 938);
const formation = rules.FORMATIONS[0], fits = (player, slot) => rules.fitsAllowed(player.position, rules.slotAllowedPositions(slot.label, slot.allowed));
const expectedDraw = [rules.KEEPER, ...rules.CLASSIC.slice(0, 8), rules.STRIKER, rules.CLASSIC[8]];
const mocks = new Map();
for (const [file, contents] of [
  ['src/components/game/GameNavbar.tsx', 'export const GameNavbar=()=>null;'], ['src/components/game/GameNav.tsx', 'export const GameNav=()=>null;'],
  ['src/components/game/ShareButtons.tsx', 'export default ()=>null;'], ['src/components/game/ReportQuestion.tsx', 'export default ()=>null;'],
  ['src/components/ads/AdBanner.tsx', 'export default ()=>null;'], ['src/components/seo/PageSeo.tsx', 'export default ()=>null;'],
  ['src/components/seo/GameSeoContent.tsx', 'export default ()=>null;'],
  ['src/integrations/supabase/client.ts', `export {supabase,SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY} from ${JSON.stringify(path.join(root, boundary))};`],
  ['src/lib/completions.ts', `export {recordCompletion,getCurrentPlayerName} from ${JSON.stringify(path.join(root, boundary))};`],
]) mocks.set(path.join(root, file), { file, contents });
const browserFile = path.join(out, 'world-xi-recovery.js');
const compiled = await build({ absWorkingDir: root, entryPoints: [path.join(root, entry)], outfile: browserFile, bundle: true, write: false,
  platform: 'browser', format: 'iife', target: 'es2020', jsx: 'automatic', metafile: true, alias: { '@': path.join(root, 'src') },
  define: { 'process.env.NODE_ENV': '"production"' }, logLevel: 'silent', plugins: [{ name: 'declared-fictional-boundaries', setup(builder) {
    builder.onLoad({ filter: /\.[jt]sx?$/ }, args => { const mock = mocks.get(path.resolve(args.path)); return mock ? { contents: mock.contents, loader: 'tsx', resolveDir: root } : null; });
  } }] });
for (const file of ['src/pages/WorldXi.tsx', 'src/lib/worldXi.ts', 'src/lib/worldXiNationPools.ts', 'src/lib/positionFit.ts', 'src/components/game/GameHelp.tsx', entry, boundary, fixture]) {
  assert(Object.keys(compiled.metafile.inputs).some(input => path.resolve(root, input) === path.join(root, file)), 'Actual fixture render input: ' + file);
}
fs.writeFileSync(path.join(out, 'browser-inputs.json'), JSON.stringify({ metafile: compiled.metafile, mockedModules: [...mocks.values()].map(mock => ({ file: mock.file, bodySha256: sha(Buffer.from(mock.contents)) })) }, null, 2));
fs.writeFileSync(path.join(out, 'node-inputs.json'), JSON.stringify(nodeBundle.metafile, null, 2));
const assets = new Map(), payloads = [], assetHolds = new Map();
fs.mkdirSync(path.join(out, 'assets'));
function asset(url, body, contentType) {
  const payload = Buffer.from(body); assert.equal(payload.length, body.length); assert.equal(sha(payload), sha(body));
  assert(!assets.has(url)); assets.set(url, { body: payload, contentType });
  const file = path.join(out, 'assets', url === '/world-xi-recovery' ? 'fixture.html' : path.basename(url));
  fs.writeFileSync(file, payload); assetHolds.set(file, sha(payload));
  payloads.push({ url, sourceType: body.constructor.name, fulfilledType: payload.constructor.name, bytes: payload.length, sourceSha256: sha(body), fulfilledSha256: sha(payload) });
}
const js = compiled.outputFiles.filter(file => file.path === browserFile); assert.equal(js.length, 1);
const css = compiled.outputFiles.filter(file => file.path.endsWith('.css')); assert(css.length <= 1); assert.equal(compiled.outputFiles.length, 1 + css.length);
asset('/fixture.js', js[0].contents, 'application/javascript; charset=utf-8'); fs.writeFileSync(browserFile, js[0].contents);
if (css.length) { asset('/fixture.css', css[0].contents, 'text/css; charset=utf-8'); fs.writeFileSync(path.join(out, 'fixture.css'), css[0].contents); }
const links = html => [...html.replace(/<!--[\s\S]*?-->/g, '').matchAll(/<link\b[^>]*>/gi)].map(match => match[0]);
const href = tag => tag.match(/href=["']([^"']+)["']/i)?.[1];
const cssUrls = links(fs.readFileSync(path.join(root, 'dist/index.html'), 'utf8')).filter(tag => /rel=["']stylesheet["']/i.test(tag) && href(tag)?.startsWith('/assets/')).map(href);
const fontTags = links(held.get('index.html').toString('utf8')).filter(tag => /rel=["']stylesheet["']/i.test(tag) && href(tag)?.startsWith('https://fonts.googleapis.com/'));
assert.equal(fontTags.length, 1, 'One actual declared font stylesheet');
assert(cssUrls.length > 0 && cssUrls.every(url => /^\/assets\/[^/?]+\.css$/.test(url)), 'Actual ordinary build CSS');
const styleLinks = [];
for (const [at, url] of cssUrls.entries()) { const name = '/production-' + at + '.css'; asset(name, fs.readFileSync(path.join(root, 'dist', url.slice(1))), 'text/css; charset=utf-8'); styleLinks.push(`<link rel="stylesheet" href="${name}">`); }
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">${fontTags[0]}${styleLinks.join('')}${css.length ? '<link rel="stylesheet" href="/fixture.css">' : ''}</head><body><p data-fictional-scope="" style="padding:8px;font:12px sans-serif">Fictional 938-row component fixture. No real roster or site-route claim.</p><div id="root"></div><script src="/fixture.js"></script></body></html>`;
asset('/world-xi-recovery', Buffer.from(html), 'text/html; charset=utf-8');
fs.writeFileSync(path.join(out, 'payloads.json'), JSON.stringify(payloads, null, 2));
const fontRoot = path.resolve(process.env.FREE_KICK_FONT_CACHE || path.join(artifact, 'font-cache'));
const fonts = new Map(JSON.parse(fs.readFileSync(path.join(fontRoot, 'manifest.json'))).map(record => {
  assert(['https://fonts.googleapis.com', 'https://fonts.gstatic.com'].includes(new URL(record.url).origin));
  assert(/^[a-f0-9]{64}$/.test(record.file));
  const body = fs.readFileSync(path.join(fontRoot, record.file)); assert.equal(sha(body), record.sha256); return [record.url, { body, contentType: record.contentType }];
}));
assert(fonts.has(href(fontTags[0])), 'The actual font stylesheet is held');
const row = { scope: 'Compiled actual-page fictional938 component proof only. Exact unit RNG tape is confined here; no real roster, SDK, site-route or global chrome claim.',
  reads: [], completions: [], picks: [], widths: [], screenshots: [], routeErrors: [], pageErrors: [], consoleErrors: [], unexpected: [], writes: [], served: [], recovery: null };
const browser = await chromium.launch({ args: ['--no-sandbox'] }); let context, primary = null;
const cleanupErrors = [];
function validate(value) {
  assert.equal(value.reads.length, 17, 'Actual loader consumed seventeen fictional read shapes'); const seen = new Set();
  for (const read of value.reads) {
    const key = JSON.stringify([read.table, Object.entries(read.params).sort(([a], [b]) => a.localeCompare(b))]); assert(!seen.has(key), 'Fictional loader read is unique'); seen.add(key);
    const current = read.table === 'player_market_values' && read.params.year === 'eq.2026' && read.params.offset === '0';
    assert.equal(read.count, current ? 938 : 0, 'Declared fictional read count');
    assert.equal(read.body, JSON.stringify(current ? market : []), 'Declared fictional body remains exact');
  }
  assert.equal(value.originalRows, JSON.stringify(market)); assert.equal(value.currentRows, value.originalRows, 'Fictional raw DTOs remain held');
  assert.equal(value.picks.length, 11, 'Eleven actual native selections');
  for (const [at, pick] of value.picks.entries()) {
    assert.equal(pick.beforeFilled, at); assert.equal(pick.afterFilled, at + 1, 'Native selection advances once');
    assert(pool.byCountry.get(pick.country)?.some(player => player.name === pick.name && player.club === pick.club && fits(player, formation.slots[at])), 'Declared fitting fictional player is actually selected');
  }
  const recovery = value.recovery;
  assert.equal(recovery.before.filled, 9, 'Nine picks form the empty-slot foundation'); assert.equal(recovery.after.filled, 9, 'Free recovery holds filled count');
  assert.equal(recovery.before.slot, 'ST'); assert.equal(recovery.after.slot, 'ST', 'Free recovery holds active slot');
  assert.equal(recovery.before.country, rules.STRIKER); assert(rules.CLASSIC.slice(9).includes(recovery.after.country), 'Only an unused fitting nation replaces the empty slot');
  assert.equal(recovery.before.paid, 'Respin nation (0 left)'); assert.equal(recovery.after.paid, recovery.before.paid, 'Free recovery holds paid0');
  assert(recovery.before.timer <= 87 && recovery.before.timer > 0, 'Real countdown ran before recovery');
  assert(recovery.after.timer <= recovery.before.timer && recovery.after.timer >= recovery.before.timer - Math.ceil(recovery.elapsedMs / 1000) - 1, 'Free recovery does not reset or spend the real timer');
  for (const snapshot of [recovery.before, recovery.after]) {
    assert.equal(snapshot.slots.length, 11);
    assert(snapshot.slots.every((slot, at) => slot.left === formation.slots[at].x + '%' && slot.top === formation.slots[at].y + '%'), 'Actual fictional pitch coordinates');
  }
  assert.deepEqual(recovery.after.slots.filter((_, at) => at !== 9), recovery.before.slots.filter((_, at) => at !== 9), 'Other rendered pitch slots stay held');
  assert(recovery.button.height >= 44 && recovery.button.hit, 'Free recovery has a reachable44px control');
  assert(value.native.date && value.native.performance && value.native.reducedMotion && value.native.tape, 'Declared fixture tape and native clocks');
  assert.equal(value.initialInputFocus, true, 'Actual draw focuses the input'); assert.equal(value.afterRecoveredPickInputFocus, true, 'Actual next pick focuses the input');
  for (const snapshot of [recovery.before, recovery.after]) assert(Number.isFinite(snapshot.scrollY) && typeof snapshot.focus.tag === 'string', 'Native focus and scroll are observed');
  assert.deepEqual(value.completions, [['/world-xi', 11, 'Fixture Recovery Tester']], 'Actual completion is observed exactly once');
  assert.equal(value.resultRows.length, 11, 'Eleven actual result rows');
  const expected = [...expectedDraw]; expected[9] = recovery.after.country;
  for (const [at, result] of value.resultRows.entries()) { assert.equal(result.slot, formation.slots[at].label); assert.equal(result.country, expected[at], 'All other assigned countries stay held'); assert.equal(result.name, value.picks[at].name); assert.equal(result.club, value.picks[at].club, 'Saved selected clubs stay held'); }
  assert(value.widths.every(width => width.scrollWidth <= width.clientWidth), 'No fixture horizontal overflow');
  assert.deepEqual(value.routeErrors, [], 'No fixture handler error'); assert.deepEqual(value.pageErrors, [], 'No fixture page error'); assert.deepEqual(value.consoleErrors, [], 'No fixture console error');
  assert.deepEqual(value.unexpected, [], 'No unexpected fixture transport'); assert.deepEqual(value.writes, [], 'No fixture production writes');
  assert.equal(value.screenshots.length, 4, 'Four original fictional state images');
  for (const shot of value.screenshots) { const bytes = fs.readFileSync(path.join(out, shot.file)); assert.equal(sha(bytes), shot.sha256, 'Original fictional screenshot hash'); assert.equal(bytes.readUInt32BE(16), 640); assert.equal(bytes.readUInt32BE(20), 1328); }
}
const tasks = new Set();
try {
  context = await browser.newContext({ viewport: { width: 320, height: 664 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, reducedMotion: 'reduce', locale: 'en-US', timezoneId: 'Europe/Belgrade' });
  await context.addInitScript(() => { Math.random = function worldXiFixtureTape() { return .999999; }; });
  await context.route('**/*', route => {
    const task = (async () => {
      const request = route.request(), url = new URL(request.url());
      if (request.method() !== 'GET') { row.writes.push({ origin: url.origin, pathname: url.pathname, method: request.method() }); return route.abort(); }
      if (url.origin === origin && !url.search && assets.has(url.pathname)) { const asset = assets.get(url.pathname); row.served.push({ path: url.pathname, sha256: sha(asset.body) }); return route.fulfill({ status: 200, body: asset.body, contentType: asset.contentType }); }
      if (url.origin === origin && url.pathname === '/favicon.ico' && !url.search) return route.fulfill({ status: 204 });
      if (fonts.has(url.href)) { const font = fonts.get(url.href); return route.fulfill({ status: 200, body: font.body, contentType: font.contentType }); }
      row.unexpected.push({ origin: url.origin, pathname: url.pathname }); return route.abort();
    })().catch(async error => { row.routeErrors.push({ name: error.name, message: error.message }); try { await route.abort(); } catch (abort) { row.routeErrors.push({ name: abort.name, message: abort.message }); } });
    tasks.add(task); task.then(() => tasks.delete(task), () => tasks.delete(task)); return task;
  });
  const page = await context.newPage(); page.on('pageerror', error => row.pageErrors.push(error.message)); page.on('console', message => { if (message.type() === 'error') row.consoleErrors.push(message.text()); });
  const width = async stage => row.widths.push({ stage, ...await page.evaluate(() => ({ clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth })) });
  const shot = async stage => { const file = stage + '.png', bytes = await page.screenshot({ path: path.join(out, file) }); row.screenshots.push({ file, sha256: sha(bytes) }); };
  const click = async locator => { await locator.scrollIntoViewIfNeeded(); await locator.click({ timeout: 5000 }); await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))); };
  const input = page.getByRole('textbox', { name: 'Name a player for this slot', exact: true });
  const prompt = async () => { const text = (await page.getByText(/^Name a player from /).innerText()).replace(/\s+/g, ' '), match = text.match(/^Name a player from (.+) who can play ([A-Z]+)\./); assert(match); return { country: match[1], slot: match[2] }; };
  const filled = async () => Number((await page.getByText(/^Filled \d+\/11$/).innerText()).match(/\d+/)[0]);
  const board = async () => ({ ...await prompt(), filled: await filled(), paid: await page.getByRole('button', { name: 'Respin nation (0 left)', exact: true }).innerText(),
    timer: Number((await page.getByText(/^\d+s$/).innerText()).match(/\d+/)[0]), ...await page.evaluate(() => {
      const pitches = [...document.querySelectorAll('div')].filter(node => [...node.children].filter(child => child instanceof HTMLElement && child.style.left && child.style.top).length === 11);
      if (pitches.length !== 1) throw new Error('One actual eleven-slot fixture pitch');
      return { slots: [...pitches[0].children].filter(child => child instanceof HTMLElement && child.style.left && child.style.top).map(child => ({ left: child.style.left, top: child.style.top, html: child.innerHTML })), scrollY: window.scrollY,
        focus: { tag: document.activeElement?.tagName ?? '', label: document.activeElement?.getAttribute('aria-label') ?? '', text: document.activeElement?.textContent?.trim() ?? '' } };
    }) });
  const pick = async player => { const beforeFilled = await filled(); await input.fill(player.name); const name = `${player.position} ${player.name} ${player.club}`.replace(/\s+/g, ' ').trim(); await click(page.getByRole('button', { name, exact: true })); await page.waitForFunction(count => [...document.querySelectorAll('span')].some(node => node.textContent?.replace(/\s+/g, ' ').trim() === `Filled ${count}/11`) || !![...document.querySelectorAll('h2')].find(node => node.textContent === 'World XI complete!'), beforeFilled + 1); const completed = await page.getByText('World XI complete!', { exact: true }).isVisible(); row.picks.push({ name: player.name, club: player.club, country: player.country, beforeFilled, afterFilled: completed ? null : await filled(), completed }); };
  await page.goto(origin + '/world-xi-recovery', { waitUntil: 'domcontentloaded' }); await page.getByRole('button', { name: 'Draw my 11 nations', exact: true }).waitFor();
  await page.evaluate(() => document.fonts.ready); await width('setup'); await shot('setup');
  await click(page.getByRole('button', { name: 'How to play', exact: true })); const dialog = page.getByRole('dialog', { name: 'How to play', exact: true }); await dialog.waitFor(); assert((await dialog.innerText()).includes('Replace empty nation (free)')); await click(dialog.getByRole('button', { name: "Let's Play!", exact: true })); await dialog.waitFor({ state: 'hidden' });
  await click(page.getByRole('button', { name: 'Expanded', exact: true })); await click(page.getByRole('button', { name: formation.name, exact: true })); await click(page.getByRole('button', { name: 'None', exact: true })); await click(page.getByRole('button', { name: /^90 seconds/ }));
  await click(page.getByRole('button', { name: 'Draw my 11 nations', exact: true })); await input.waitFor();
  row.native = await page.evaluate(() => ({ date: /\[native code\]/.test(Date.now.toString()), performance: /\[native code\]/.test(performance.now.toString()), reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches, tape: Math.random.name === 'worldXiFixtureTape' && Math.random() === .999999 }));
  row.initialInputFocus = await input.evaluate(element => document.activeElement === element);
  for (let at = 0; at < 9; at++) { const current = await prompt(); assert.equal(current.country, expectedDraw[at]); assert.equal(current.slot, formation.slots[at].label); const player = pool.byCountry.get(current.country).find(player => fits(player, formation.slots[at]) && !row.picks.some(old => old.name === player.name)); assert(player); await pick(player); }
  await input.fill(rules.SHARED); await page.waitForFunction(() => [...document.querySelectorAll('span')].some(node => /^([1-8]?\d)s$/.test(node.textContent?.trim() ?? '') && Number(node.textContent.trim().slice(0, -1)) <= 87));
  const free = page.getByRole('button', { name: 'Replace empty nation (free)', exact: true }); await free.scrollIntoViewIfNeeded();
  const button = await free.evaluate(element => { const box = element.getBoundingClientRect(), hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2); return { height: box.height, width: box.width, hit: !!hit && (hit === element || element.contains(hit)) }; });
  await width('foundation'); await shot('foundation');
  const before = await board(), started = await page.evaluate(() => performance.now()); await free.click(); const after = await board(), ended = await page.evaluate(() => performance.now());
  row.recovery = { before, after, elapsedMs: ended - started, button }; await width('recovered'); await shot('recovered');
  const recovered = pool.byCountry.get(after.country).find(player => fits(player, formation.slots[9]) && !row.picks.some(old => old.name === player.name)); assert(recovered); await pick(recovered);
  row.afterRecoveredPickInputFocus = await input.evaluate(element => document.activeElement === element);
  const current = await prompt(); assert.equal(current.country, rules.CLASSIC[8]); const last = pool.byCountry.get(current.country).find(player => fits(player, formation.slots[10]) && !row.picks.some(old => old.name === player.name)); assert(last); await pick(last);
  await page.getByText('World XI complete!', { exact: true }).waitFor(); await page.waitForFunction(() => window.__WORLD_XI_FICTIONAL_OBSERVATIONS__().completions.length === 1);
  row.resultRows = [];
  for (const picked of row.picks) row.resultRows.push(await page.getByText(picked.name, { exact: true }).evaluate(element => { const row = element.parentElement.parentElement; return { slot: row.children[0].textContent, country: row.children[1].textContent, name: row.children[2].children[0].textContent, club: row.children[2].children[1].textContent }; }));
  row.picks[row.picks.length - 1].afterFilled = row.resultRows.length;
  const observed = await page.evaluate(() => window.__WORLD_XI_FICTIONAL_OBSERVATIONS__());
  for (const key of ['reads', 'completions', 'originalRows', 'currentRows']) row[key] = observed[key]; await width('complete'); await shot('complete');
  await context.close(); context = null; await Promise.all([...tasks]); validate(row);
  const controls = [
    ['reads', 'Actual loader consumed seventeen fictional read shapes', value => value.reads.pop()], ['body', 'Declared fictional body remains exact', value => { value.reads.find(read => read.count === 938).body = '[]'; }],
    ['duplicate-read', 'Fictional loader read is unique', value => { value.reads[1] = structuredClone(value.reads[0]); }],
    ['pick-advance', 'Native selection advances once', value => { value.picks[0].afterFilled = 0; }],
    ['legal-player', 'Declared fitting fictional player is actually selected', value => { value.picks[0].country = 'changed'; }],
    ['raw', 'Fictional raw DTOs remain held', value => { value.currentRows = '[]'; }], ['filled', 'Free recovery holds filled count', value => { value.recovery.after.filled = 8; }],
    ['country', 'Only an unused fitting nation replaces the empty slot', value => { value.recovery.after.country = rules.STRIKER; }], ['paid', 'Free recovery holds paid0', value => { value.recovery.after.paid = 'Respin nation (-1 left)'; }],
    ['timer', 'Free recovery does not reset or spend the real timer', value => { value.recovery.after.timer = 90; }], ['other-slot', 'Other rendered pitch slots stay held', value => { value.recovery.after.slots[0].html = 'changed'; }],
    ['pitch-coordinates', 'Actual fictional pitch coordinates', value => { value.recovery.after.slots[0].left = '0%'; }],
    ['target', 'Free recovery has a reachable44px control', value => { value.recovery.button.height = 43; }], ['clock', 'Declared fixture tape and native clocks', value => { value.native.date = false; }],
    ['draw-focus', 'Actual draw focuses the input', value => { value.initialInputFocus = false; }], ['pick-focus', 'Actual next pick focuses the input', value => { value.afterRecoveredPickInputFocus = false; }],
    ['completion', 'Actual completion is observed exactly once', value => value.completions.pop()], ['assigned', 'All other assigned countries stay held', value => { value.resultRows[0].country = 'changed'; }],
    ['club', 'Saved selected clubs stay held', value => { value.resultRows[0].club = 'changed'; }], ['width', 'No fixture horizontal overflow', value => { value.widths[0].scrollWidth = value.widths[0].clientWidth + 1; }],
    ['handler', 'No fixture handler error', value => value.routeErrors.push('changed')], ['runtime', 'No fixture page error', value => value.pageErrors.push('changed')],
    ['transport', 'No unexpected fixture transport', value => value.unexpected.push('changed')], ['write', 'No fixture production writes', value => value.writes.push('changed')],
    ['image', 'Original fictional screenshot hash', value => { value.screenshots[0].sha256 = 'changed'; }],
  ];
  row.controls = [];
  for (const [name, marker, change] of controls) { const copied = structuredClone(row), before = JSON.stringify(copied); change(copied); assert.notEqual(JSON.stringify(copied), before); assert.throws(() => validate(copied), error => error.name === 'AssertionError' && error.message.includes(marker)); validate(row); row.controls.push({ name, ownedAssertion: marker, changed: true, rejected: true, restored: true }); }
  assert.equal(row.controls.length, 25);
  fs.writeFileSync(path.join(out, 'observations.json'), JSON.stringify(row, null, 2));
} catch (error) {
  primary = error;
  fs.writeFileSync(path.join(out, 'partial.json'), JSON.stringify(row, null, 2)); fs.writeFileSync(path.join(out, 'failure.json'), JSON.stringify({ name: error.name, message: error.message, stack: error.stack }, null, 2));
} finally {
  if (context) { try { await context.close(); } catch (error) { cleanupErrors.push({ step: 'context', name: error.name, message: error.message }); } }
  try { await Promise.all([...tasks]); } catch (error) { cleanupErrors.push({ step: 'handlers', name: error.name, message: error.message }); }
  try { await browser.close(); } catch (error) { cleanupErrors.push({ step: 'browser', name: error.name, message: error.message }); }
  const after = [];
  for (const [file, bytes] of held) {
    try { const actual = fs.readFileSync(path.join(root, file)); after.push({ file, bytes: actual.length, sha256: sha(actual) }); assert.equal(sha(actual), sha(bytes), 'Actual fixture source held: ' + file); }
    catch (error) { cleanupErrors.push({ step: 'source', file, name: error.name, message: error.message }); }
  }
  for (const [file, expectedSha] of assetHolds) {
    try { assert.equal(sha(fs.readFileSync(file)), expectedSha, 'Served fixture asset held'); }
    catch (error) { cleanupErrors.push({ step: 'asset', file, name: error.name, message: error.message }); }
  }
  fs.writeFileSync(path.join(out, 'source-after.json'), JSON.stringify(after, null, 2));
  fs.writeFileSync(path.join(out, 'cleanup.json'), JSON.stringify(cleanupErrors, null, 2));
  if (primary || cleanupErrors.length) fs.writeFileSync(path.join(out, 'partial.json'), JSON.stringify(row, null, 2));
  console.log('World XI fictional recovery evidence: ' + out);
}
if (primary) throw primary;
assert.deepEqual(cleanupErrors, [], 'Fictional browser cleanup and source holds');
fs.writeFileSync(path.join(out, 'summary.json'), JSON.stringify({ scope: row.scope, contexts: 1, fictionalRows: 938, actualLoaderReads: row.reads.length, nativeSelections: row.picks.length, freeRecoveries: 1, completionCalls: row.completions.length, copiedObservationControls: row.controls.length, screenshots: row.screenshots.length,
  postFreeFocus: row.recovery.after.focus, postFreeScrollDelta: row.recovery.after.scrollY - row.recovery.before.scrollY }, null, 2));
console.log('World XI fictional recovery: one actual-page context,17 fictional reads,11 native picks,one free recovery,one recorded completion call,25 copied-observation controls and four original images. Post-free focus is an observation.');
