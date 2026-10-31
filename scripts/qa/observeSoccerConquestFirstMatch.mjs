/* Observation only. No application repair or feature qualification. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import pw from '../lib/playwrightLoader.mjs';
import { loadFonts, sha, shellFixture as knownShellRequest } from './siteMenuNavigationSupport.mjs';

const ROOT = fs.realpathSync(process.cwd()), DIST = fs.realpathSync('dist');
const BASE = 'http://127.0.0.1:4177', ROUTE = '/soccer-conquest';
const OUT = path.resolve(process.env.CONQUEST_REPORT_OUT || '');
assert(process.env.CI === 'true' && process.env.SIM_NETWORK === 'offline' && process.env.CONQUEST_REPORT_OUT, 'CONQUEST_REMOTE_OBSERVATION_ONLY');
assert(path.isAbsolute(process.env.CONQUEST_REPORT_OUT) && !fs.existsSync(OUT), 'CONQUEST_FRESH_ABSOLUTE_OUT');
const parentReal = fs.realpathSync(path.dirname(OUT)); assert(parentReal !== ROOT && !parentReal.startsWith(ROOT + path.sep), 'CONQUEST_CANONICAL_OUTSIDE_CHECKOUT');
assert(fs.realpathSync(path.dirname(OUT)).startsWith(fs.realpathSync(process.env.RUNNER_TEMP) + path.sep) || fs.realpathSync(path.dirname(OUT)) === fs.realpathSync(process.env.RUNNER_TEMP), 'CONQUEST_RUNNER_TEMP_PARENT');
fs.mkdirSync(OUT);
const write = (file, value) => fs.writeFileSync(path.join(OUT, file), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const held = {
  'src/pages/SoccerConquest.tsx': 'ceec9a65d3fb5f229d890e8d438ac1af8e2abc7366b2faf7b04a0be785e32198',
  'src/components/conquest/ImperialismBoardShared.tsx': 'c5e417230071ad41bf09df02b19f1de8861996b807229c5a65d2b248eeeb7678',
  'src/lib/conquestRun.ts': 'b4a470f70ddaf4bb6d4e2c03b285c945f03d764f8e749fc5bbadc651544dea79',
  'src/lib/conquestDaily.ts': '8fd54969daf5c7fb09b7cf12c138aa628cd2e1681afdeb57e64dceb0738d289d',
  'src/lib/imperialismEngine.ts': 'eeeed35346ac95e40c83e3807fb12e1835d009c33449ab8846ca4525fd6ccc69',
  'src/components/conquest/ImperialismHowToPlay.tsx': 'c436372315300436e7b83e9af34c5c42e04009b900768b24ea0cacda7ff5e12c',
  'src/hooks/useRevealScroll.ts': '42ee464df372437ff934b2f6a2b4acafc25493eb4062e0602166bfdd2e7479cd',
  'src/components/ui/dialog.tsx': 'db1fe38239f922d395d41471d8e9a996b9e8f6d87afddf9edbe3988f15a21fe8',
  'src/index.css': 'ada9cc819db63d0e2eb013bd3c29eec16877e2a30166c390b81901142369fef3',
  'src/lib/dateUtils.ts': '90cc431b127059c58d3a64c98508e97ed96620dee44c4bd8b6e5a4abd0d30966',
  'src/lib/dailyRecord.ts': 'df88b09c447e35badfef99b458764cb55ed82c23fa5e48d8b9570977ea35b780',
};
const verifySource = () => Object.entries(held).map(([file, pin]) => { const body = fs.readFileSync(file); assert.equal(sha(body), pin, 'CONQUEST_SOURCE_HELD:' + file); return { file, bytes: body.length, sha256: pin }; });
const sources = verifySource();
const fonts = loadFonts(process.env.FREE_KICK_FONT_CACHE, process.env.FONT_CACHE_MANIFEST_SHA256);
const manifestBytes = fs.readFileSync(path.join(DIST, '.vite/manifest.json')), manifest = JSON.parse(manifestBytes);
assert(manifest['index.html']?.isEntry && manifest['src/pages/SoccerConquest.tsx']?.isDynamicEntry, 'CONQUEST_BUILT_MANIFEST');
const savedHTML = fs.readFileSync(path.join(DIST, 'soccer-conquest/index.html'));
const report = { status: 'PENDING', source: process.env.GITHUB_SHA, expectedMain: process.env.EXPECTED_MAIN, expectedParent: process.env.EXPECTED_PARENT,
  observationOnly: true, featureQualified: false, reportClock: '2026-10-31T10:10:33Z', performanceAndTimersUnmodified: true,
  servedRoute: 'ACTUAL_HOST_LIKE_SAVED_ROUTE_NO_HTML_OVERRIDE', sourcePins: sources, fontManifestSHA256: process.env.FONT_CACHE_MANIFEST_SHA256,
  built: { manifestSHA256: sha(manifestBytes), routeHTML: { file: 'soccer-conquest/index.html', bytes: savedHTML.length, sha256: sha(savedHTML) },
    entries: ['index.html', 'src/pages/SoccerConquest.tsx'].map(key => ({ key, file: manifest[key].file, sha256: sha(fs.readFileSync(path.join(DIST, manifest[key].file))) })) }, profiles: [] };
const serverOut = fs.openSync(path.join(OUT, 'server.stdout'), 'wx'), serverErr = fs.openSync(path.join(OUT, 'server.stderr'), 'wx');
let browser, server, fatal = null;
const specs = [{ id: 'daily-pending', decline: false, mode: 'daily' }, { id: 'daily-real-decline', decline: true, mode: 'daily' },
  { id: 'daily-zero-pick-reload', decline: true, mode: 'daily', reloadPreview: true }, { id: 'free-play-control', decline: true, mode: 'free' }];

function installObservation() {
  const NativeDate = Date, started = NativeDate.now(), epoch = NativeDate.parse('2026-10-31T10:10:33Z');
  class ReportDate extends NativeDate { constructor(...args) { if (args.length) super(...args); else super(epoch + NativeDate.now() - started); } static now() { return epoch + NativeDate.now() - started; } }
  window.Date = ReportDate;
  window.__conquestObservationTrace = [];
  const owner = node => node instanceof Element ? node.closest('button,a,input,[role="button"]') : null;
  const identity = node => {
    if (!node) return null;
    if (node.hasAttribute('data-conquest-pick')) return 'winner:' + node.getAttribute('data-conquest-pick');
    if (node.hasAttribute('data-conquest-play')) return 'play';
    const text = node.textContent.replace(/\s+/g, ' ').trim();
    if (/^Got it, let's play Soccer Conquest$/.test(text)) return 'help';
    if (text === 'Reject all') return 'decline';
    if (/^Daily Challenge/.test(text)) return 'daily';
    if (text === 'Free Play') return 'free';
    return 'text:' + text;
  };
  for (const type of ['pointerdown', 'pointerup', 'touchstart', 'touchmove', 'touchend', 'click', 'scroll']) document.addEventListener(type, event => {
    if (window.__conquestObservationTrace.length >= 1400) return;
    const node = owner(event.target);
    window.__conquestObservationTrace.push({ seq: window.__conquestObservationTrace.length, type, trusted: event.isTrusted, at: performance.now(),
      key: identity(node), text: node?.textContent.replace(/\s+/g, ' ').trim().slice(0, 180) || null, pointerType: event.pointerType || null,
      scrollY, targetTag: event.target instanceof Element ? event.target.tagName : null });
  }, { capture: true, passive: true });
}

async function snapshot(page, row, label) {
  const value = await page.evaluate(label => {
    const rect = node => { if (!node) return null; const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; };
    const brief = node => node ? { tag: node.tagName, role: node.getAttribute('role'), aria: node.getAttribute('aria-label'), text: node.textContent.replace(/\s+/g, ' ').trim().slice(0, 200), rect: rect(node), pointerEvents: getComputedStyle(node).pointerEvents, zIndex: getComputedStyle(node).zIndex } : null;
    const describe = (node, key) => {
      if (!node) return null;
      const r = rect(node), x = r.x + r.width / 2, y = r.y + r.height / 2, inViewport = r.width > 0 && r.height > 0 && x >= 0 && x < innerWidth && y >= 0 && y < innerHeight;
      const hit = inViewport ? document.elementFromPoint(x, y) : null, cs = getComputedStyle(node);
      let host = node.parentElement;
      while (host && !(['auto', 'scroll'].includes(getComputedStyle(host).overflowY) && host.scrollHeight > host.clientHeight + 1)) host = host.parentElement;
      return { key, ...brief(node), center: { x, y }, inViewport, wholeInViewport: r.x >= 0 && r.y >= 0 && r.right <= innerWidth && r.bottom <= innerHeight,
        disabled: Boolean(node.disabled), ariaDisabled: node.getAttribute('aria-disabled'), hidden: cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0 || !!node.closest('[hidden],[inert],[aria-hidden="true"]'),
        unobstructed: !!hit && (node === hit || node.contains(hit)), hit: brief(hit), scrollHost: host ? { ...brief(host), scrollTop: host.scrollTop, scrollHeight: host.scrollHeight, clientHeight: host.clientHeight } : null };
    };
    const buttons = [...document.querySelectorAll('button')], text = node => node.textContent.replace(/\s+/g, ' ').trim();
    const find = re => buttons.find(node => re.test(text(node)));
    const club = document.querySelector('[data-conquest-stage]') ? null : document.querySelector('div.grid.grid-cols-2 > button');
    const consent = document.querySelector('[role="region"][aria-label="Cookie choices"]');
    const storage = { keys: [], records: [], consentRecord: null, error: null };
    try { storage.consentRecord = localStorage.getItem('cookie-consent-v2'); storage.keys = Object.keys(localStorage).sort(); storage.records = storage.keys.filter(key => /^conquest-|rules-gate-seen:/.test(key)).map(key => ({ key, raw: localStorage.getItem(key) })); } catch (error) { storage.error = String(error); }
    const key = 'conquest-soccer-daily-2026-10-31', raw = storage.records.find(row => row.key === key)?.raw ?? null;
    let parsed = null, parseError = null; try { parsed = raw === null ? null : JSON.parse(raw); } catch (error) { parseError = String(error); }
    return { label, href: location.href, dateNow: Date.now(), dateISO: new Date().toISOString(), effectiveET: new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date()), performanceNow: performance.now(),
      browser: { locale: navigator.language, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, touchPoints: navigator.maxTouchPoints, dpr: devicePixelRatio },
      viewport: { width: innerWidth, height: innerHeight, scrollX, scrollY, visual: window.visualViewport ? { width: visualViewport.width, height: visualViewport.height, offsetTop: visualViewport.offsetTop, scale: visualViewport.scale } : null, documentHeight: document.documentElement.scrollHeight, documentWidth: document.documentElement.scrollWidth },
      heading: document.querySelector('h1')?.textContent.trim() || null, statusText: document.querySelector('[data-conquest-status]')?.textContent.replace(/\s+/g, ' ').trim() || null,
      callText: document.querySelector('[data-conquest-call]')?.textContent.replace(/\s+/g, ' ').trim() || null,
      scene: !!document.querySelector('[data-scene-player]'), recap: !!document.querySelector('[data-conquest-recap]'), stage: rect(document.querySelector('[data-conquest-stage]')),
      actions: { help: describe(find(/^Got it, let's play Soccer Conquest$/), 'help'), decline: describe(consent ? [...consent.querySelectorAll('button')].find(node => text(node) === 'Reject all') : null, 'decline'), daily: describe(find(/^Daily Challenge/), 'daily'), free: describe(find(/^Free Play$/), 'free'),
        club: describe(club, club ? 'text:' + text(club) : 'club'), winners: [...document.querySelectorAll('[data-conquest-pick]')].map(node => describe(node, 'winner:' + node.getAttribute('data-conquest-pick'))), play: describe(document.querySelector('[data-conquest-play]'), 'play') },
      layers: { dialogs: [...document.querySelectorAll('[role="dialog"],[role="alertdialog"]')].map(brief), consent: brief(consent), header: brief(document.querySelector('header[data-site-chrome]')), menu: brief(document.querySelector('[aria-label="Open site menu"]')), consentPending: document.body.dataset.consentPending || null },
      fonts: { status: document.fonts.status, inter: document.fonts.check('16px Inter'), display: document.fonts.check('16px "Space Grotesk"'), faces: [...document.fonts].map(face => ({ family: face.family, status: face.status })) },
      dailyLog: { key, raw, parsed, parseError }, storage, trace: [...window.__conquestObservationTrace] };
  }, label);
  row.states.push(value); return value;
}

class ObservedStop extends Error { constructor(stage, detail) { super(stage); this.stage = stage; this.detail = detail; } }
const action = (s, kind) => kind === 'winner' ? s.actions.winners[0] : s.actions[kind];
const ready = target => target && !target.disabled && target.ariaDisabled !== 'true' && !target.hidden && target.inViewport && target.unobstructed;
async function touch(page, cdp, row, kind, stage, recover = true) {
  let s = await snapshot(page, row, stage + '-before-any-driver-scroll'), target = action(s, kind);
  if (!target) throw new ObservedStop(stage + '_MISSING', { sample: s.label });
  for (let attempt = 0; !ready(target) && recover && attempt < 10; attempt++) {
    if (target.disabled || target.ariaDisabled === 'true' || target.hidden) break;
    const host = target.scrollHost?.rect, freeBottom = Math.min(620, s.layers.consent?.rect?.y !== undefined ? s.layers.consent.rect.y - 20 : 620);
    const origin = host ? { x: Math.max(8, Math.min(352, host.x + host.width / 2)), y: Math.max(20, Math.min(freeBottom, host.y + host.height * 0.7)) } : { x: 345, y: Math.max(20, Math.min(360, freeBottom)) };
    const up = target.rect.y < 0, parameters = { ...origin, yDistance: up ? 360 : -360, speed: 600, preventFling: true, gestureSourceType: 'touch' };
    const before = { scrollY: s.viewport.scrollY, hostTop: target.scrollHost?.scrollTop ?? null };
    await cdp.send('Input.synthesizeScrollGesture', parameters);
    await page.waitForTimeout(240);
    const after = await snapshot(page, row, stage + '-explicit-touch-scroll-recovery-' + (attempt + 1));
    row.recovery.push({ stage, attempt: attempt + 1, method: 'CDP_NATIVE_TOUCH_SCROLL_RECOVERY_NOT_INITIAL_REACHABILITY', parameters, before, after: { scrollY: after.viewport.scrollY, hostTop: action(after, kind)?.scrollHost?.scrollTop ?? null }, beforeState: s.label, afterState: after.label });
    s = after; target = action(s, kind); if (!target) break;
    if (attempt >= 1 && before.scrollY === after.viewport.scrollY && before.hostTop === (target.scrollHost?.scrollTop ?? null)) break;
  }
  if (!ready(target)) throw new ObservedStop(stage + '_NOT_REACHABLE', { target, sample: s.label, driverScrollRecovery: recover });
  const mark = s.trace.length, intended = target.key;
  await page.touchscreen.tap(target.center.x, target.center.y);
  await page.waitForTimeout(120);
  const after = await snapshot(page, row, stage + '-after-native-touch');
  const events = after.trace.slice(mark), witnessed = events.some(event => event.type === 'click' && event.trusted && event.key === intended);
  row.actions.push({ stage, kind, intended, center: target.center, before: s.label, after: after.label, trustedClickWitness: witnessed, events });
  if (!witnessed) throw new ObservedStop(stage + '_NATIVE_TAP_NO_OWNED_CLICK', { sample: after.label, events });
  return after;
}
async function image(page, row, name) {
  if (row.images.length >= 4) return;
  const file = row.id + '-' + name + '.png'; await page.screenshot({ path: path.join(OUT, file), fullPage: false });
  const b = fs.readFileSync(path.join(OUT, file)); row.images.push({ file, bytes: b.length, sha256: sha(b), original: true, viewportOnly: true });
}
async function observeBoundary(context, row) {
  await context.route('**/*', async route => {
    const request = route.request(), item = { url: request.url(), method: request.method(), type: request.resourceType(), externalForwarded: false };
    try {
      const url = new URL(item.url); assert(!url.username && !url.password && !url.hash);
      if (url.origin === BASE) {
        assert(['GET', 'HEAD'].includes(item.method) && request.postData() === null && !url.search, 'CONQUEST_LOCAL_REQUEST_SHAPE');
        const decoded = decodeURIComponent(url.pathname), file = path.resolve(DIST, '.' + decoded);
        const candidate = url.pathname === ROUTE ? path.join(DIST, 'soccer-conquest/index.html') : file;
        assert(candidate.startsWith(DIST + path.sep) && fs.statSync(candidate).isFile() && fs.realpathSync(candidate).startsWith(DIST + path.sep), 'CONQUEST_DIST_MEMBER');
        row.io.push({ ...item, kind: 'actual-host-like-dist', file: path.relative(DIST, candidate), sha256: sha(fs.readFileSync(candidate)) });
        return route.continue();
      }
      if (item.method === 'GET' && request.postData() === null && fonts.has(url.href) && ['font', 'stylesheet'].includes(item.type)) {
        const font = fonts.get(url.href); row.io.push({ ...item, kind: 'prepared-font', sha256: font.sha256 });
        return route.fulfill({ status: 200, contentType: font.contentType, body: font.body, headers: { 'access-control-allow-origin': '*' } });
      }
      const known = knownShellRequest(request, url);
      if (known) { row.io.push({ ...item, kind: 'exact-source-shell-request-aborted', classifier: known.id, requestBodySHA256: request.postData() === null ? null : sha(request.postData()) }); return route.abort('blockedbyclient'); }
      throw new Error('CONQUEST_UNKNOWN_REQUEST');
    } catch (error) { row.io.push({ ...item, kind: 'unknown-refused', error: String(error) }); return route.abort('blockedbyclient'); }
  });
  await context.routeWebSocket('**/*', socket => { row.sockets.push(socket.url()); socket.close({ code: 1008, reason: 'Observation refuses external sockets' }); });
}

try {
  server = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', DIST, '4177'], { cwd: ROOT, stdio: ['ignore', serverOut, serverErr] });
  let spawnError = null; server.once('error', error => { spawnError = String(error); });
  const serverDeadline = Date.now() + 10000, startupLine = `host-like server: ${DIST} on ${BASE}`; let baseReady = false;
  while (Date.now() < serverDeadline) {
    if (spawnError || server.exitCode !== null) throw new Error('CONQUEST_OWN_SERVER_EXIT:' + (spawnError || server.exitCode));
    if (fs.readFileSync(path.join(OUT, 'server.stdout'), 'utf8').trim() === startupLine) {
      const response = await fetch(BASE + ROUTE, { signal: AbortSignal.timeout(1500) }), bytes = Buffer.from(await response.arrayBuffer());
      if (response.status === 200 && sha(bytes) === sha(savedHTML)) { baseReady = true; break; }
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert(baseReady && Number.isInteger(server.pid) && server.exitCode === null, 'CONQUEST_OWN_SERVER_READY_AND_ROUTE_BODY');
  report.server = { pid: server.pid, port: 4177, ownStartupLine: startupLine, routeBodySHA256: sha(savedHTML) };
  browser = await pw.chromium.launch({ headless: true }); report.browserVersion = browser.version();
  for (const spec of specs) {
    const row = { ...spec, status: 'PENDING', states: [], actions: [], recovery: [], images: [], io: [], responses: [], console: [], failedRequests: [], pageErrors: [], sockets: [], error: null };
    report.profiles.push(row);
    const context = await browser.newContext({ viewport: { width: 360, height: 664 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'sr-RS', timezoneId: 'Europe/Belgrade', colorScheme: 'dark', reducedMotion: 'no-preference', serviceWorkers: 'block' });
    const pending = []; let page;
    try {
      await context.addInitScript(installObservation); await observeBoundary(context, row);
      page = await context.newPage(); const cdp = await context.newCDPSession(page);
      page.on('console', message => row.console.push({ type: message.type(), text: message.text(), location: message.location() }));
      page.on('pageerror', error => row.pageErrors.push({ name: error.name, message: error.message, stack: error.stack }));
      page.on('requestfailed', request => row.failedRequests.push({ url: request.url(), method: request.method(), type: request.resourceType(), error: request.failure()?.errorText || null }));
      page.on('response', response => { if (['document', 'script', 'stylesheet', 'font'].includes(response.request().resourceType())) pending.push((async () => { try { const b = await response.body(); row.responses.push({ url: response.url(), type: response.request().resourceType(), status: response.status(), bytes: b.length, sha256: sha(b) }); } catch (error) { row.responses.push({ url: response.url(), status: response.status(), bodyError: String(error) }); } })()); });
      const nav = await page.goto(BASE + ROUTE, { waitUntil: 'domcontentloaded', timeout: 30000 }); row.navigation = { status: nav?.status(), url: nav?.url() };
      try { await page.waitForFunction(() => document.querySelector('h1')?.textContent.trim() === 'Soccer Conquest', null, { timeout: 20000 }); } catch (error) { throw new ObservedStop('BOOT', { error: String(error), savedRouteNavigation: row.navigation }); }
      await page.evaluate(() => Promise.race([document.fonts.ready, new Promise(resolve => setTimeout(resolve, 10000))]));
      await page.waitForTimeout(500); await snapshot(page, row, 'boot-untouched'); await image(page, row, 'boot');
      if (spec.decline) { const declined = await touch(page, cdp, row, 'decline', 'REAL_CONSENT_DECLINE'); if (declined.layers.consent || !declined.storage.consentRecord) throw new ObservedStop('REAL_CONSENT_DECLINE_DID_NOT_DISMISS', { sample: declined.label }); await page.waitForTimeout(160); }
      try { await page.waitForFunction(() => !!document.querySelector('[data-imperialism-help]'), null, { timeout: 5000 }); } catch (error) { throw new ObservedStop('FIRST_VISIT_HELP', { error: String(error) }); }
      await touch(page, cdp, row, 'help', 'FIRST_VISIT_HELP_CTA');
      await page.waitForTimeout(250);
      if (spec.mode === 'free') await touch(page, cdp, row, 'free', 'FREE_PLAY_MODE');
      else await touch(page, cdp, row, 'daily', 'DAILY_MODE');
      let preview = await touch(page, cdp, row, 'club', 'REAL_CLUB_SELECTION');
      if (!preview.actions.play || preview.actions.winners.length !== 2 || !/Matchday\s+1\s+of\s+10/.test(preview.statusText || '')) throw new ObservedStop('FIRST_PREVIEW', { sample: preview.label });
      row.firstPreview = preview.label;
      if (spec.reloadPreview) {
        const log = preview.dailyLog.parsed;
        if (!log || log.date !== '2026-10-31' || !Array.isArray(log.picks) || log.picks.length !== 0 || log.done !== false) throw new ObservedStop('ZERO_PICK_SAVE_BEFORE_RELOAD', { actual: preview.dailyLog });
        row.actualZeroPickReloadSource = preview.dailyLog;
        await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
        try { await page.waitForFunction(() => !!document.querySelector('[data-conquest-call]'), null, { timeout: 20000 }); } catch (error) { throw new ObservedStop('RESTORED_FIRST_PREVIEW_BOOT', { error: String(error) }); }
        await page.waitForTimeout(350); preview = await snapshot(page, row, 'restored-preview-before-any-driver-scroll');
      }
      await image(page, row, 'preview-untouched');
      row.beforeWinner = preview.label; row.playDisabledBeforeWinner = preview.actions.play?.disabled ?? null;
      const predicted = await touch(page, cdp, row, 'winner', 'FIRST_WINNER_PREDICTION');
      row.predictionTeam = row.actions.at(-1).intended.replace(/^winner:/, '');
      row.beforePlay = predicted.label; await image(page, row, 'predicted-before-play');
      await touch(page, cdp, row, 'play', 'FIRST_MATCH_PLAY');
      try { await page.waitForFunction(() => /Calls\s+\d+\/1\b/.test(document.querySelector('[data-conquest-status]')?.textContent || '') && !!document.querySelector('[data-scene-player],[data-conquest-recap]'), null, { timeout: 15000 }); } catch (error) { throw new ObservedStop('FIRST_ROUND_SETTLEMENT', { error: String(error) }); }
      const settled = await snapshot(page, row, 'settled-first-round');
      if (spec.mode === 'daily' && (!Array.isArray(settled.dailyLog.parsed?.picks) || settled.dailyLog.parsed.picks.length !== 1 || settled.dailyLog.parsed.picks[0] !== row.predictionTeam)) throw new ObservedStop('FIRST_ROUND_DAILY_SAVE', { actual: settled.dailyLog, predictionTeam: row.predictionTeam });
      row.settled = settled.label; await image(page, row, 'settled');
      if (spec.mode === 'daily') {
        row.actualOnePickReloadSource = settled.dailyLog;
        await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
        try { await page.waitForFunction(() => !!document.querySelector('[data-conquest-recap]'), null, { timeout: 20000 }); } catch (error) { throw new ObservedStop('ACTUAL_RECAP_RELOAD', { error: String(error) }); }
        row.afterRecapReload = (await snapshot(page, row, 'actual-one-pick-recap-reload')).label;
      } else row.reloadScope = 'FREE_PLAY_IS_NOT_A_SAVED_DAILY_RECAP';
      row.status = 'OBSERVED_REACHED_FIRST_ROUND';
    } catch (error) {
      row.status = error instanceof ObservedStop ? 'BLOCKED_AT_' + error.stage : 'OBSERVATION_DRIVER_LIMITATION';
      row.error = { name: error.name, message: error.message, stack: error.stack, detail: error.detail || null };
      if (page && !page.isClosed()) { try { await snapshot(page, row, 'stopped-final-state'); await image(page, row, 'stopped'); } catch (captureError) { row.captureError = String(captureError); } }
    } finally {
      await context.close(); await Promise.allSettled(pending);
      if (row.io.some(item => item.kind === 'unknown-refused') || row.sockets.length) { row.previousObservedStatus = row.status; row.status = 'OBSERVATION_DRIVER_LIMITATION'; row.boundaryLimitation = 'UNKNOWN_TRAFFIC_REFUSED_NO_EXTERNAL_FORWARDING'; }
      write(row.id + '.json', row);
    }
  }
} catch (error) { fatal = { name: error.name, message: error.message, stack: error.stack }; }
finally {
  if (browser) await browser.close();
  if (server && server.exitCode === null) { server.kill('SIGTERM'); await Promise.race([new Promise(resolve => server.once('close', resolve)), new Promise(resolve => setTimeout(resolve, 3000))]); }
  if (report.server) report.server.final = { exitCode: server.exitCode, signalCode: server.signalCode, killed: server.killed, error: fatal };
  fs.closeSync(serverOut); fs.closeSync(serverErr);
  try { assert.deepEqual(verifySource(), sources, 'CONQUEST_FINAL_SOURCE_HELD'); report.sourceHeld = true; } catch (error) { fatal = { name: error.name, message: error.message, stack: error.stack }; report.sourceHeld = false; }
  report.fatal = fatal; report.status = fatal || report.profiles.some(row => row.status === 'OBSERVATION_DRIVER_LIMITATION') ? 'OBSERVATION_DRIVER_LIMITATION' : 'OBSERVATION_COMPLETE';
  report.counts = { profiles: report.profiles.length, reachedFirstRound: report.profiles.filter(row => row.status === 'OBSERVED_REACHED_FIRST_ROUND').length, blocked: report.profiles.filter(row => row.status.startsWith('BLOCKED_AT_')).length, driverLimitations: report.profiles.filter(row => row.status === 'OBSERVATION_DRIVER_LIMITATION').length, screenshots: report.profiles.reduce((n, row) => n + row.images.length, 0) };
  report.limits = ['Observation only, no product fix or feature-pass credit.', 'Actual saved route is served without an HTML override. Strict external requests are refused.', 'Touch Chromium emulation is not an actual Android Chrome156 device.', 'Date-only relative report clock; performance.now, animation and timers are not mocked.', 'Initial reachability and explicit native-touch-scroll recovery remain separate.', 'No score/RNG/data/provider changes or fabricated game states.'];
  write('OBSERVATION.json', report);
}
console.log('OBSERVATION_COMPLETE: ' + JSON.stringify(report.counts) + '; status=' + report.status + '; no feature qualification.');
if (report.status !== 'OBSERVATION_COMPLETE' || report.profiles.length !== 4) process.exitCode = 2;
