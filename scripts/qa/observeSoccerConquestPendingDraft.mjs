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
assert(process.env.EXPECTED_PARENT === '7a30fe9fccf5fc3879c6faba94247f022193ad7e' && process.env.EXPECTED_MAIN === '19911f815ac713e8d3718cd0ee8592942a18fd00' && /^[a-f0-9]{40}$/.test(process.env.GITHUB_SHA || ''), 'CONQUEST_PR447_DIAGNOSTIC_SOURCE');
assert(path.resolve(process.argv[1]) === path.join(ROOT, 'scripts/qa/observeSoccerConquestPendingDraft.mjs'), 'CONQUEST_CANONICAL_DIAGNOSTIC_PATH');
assert(path.isAbsolute(process.env.CONQUEST_REPORT_OUT) && !fs.existsSync(OUT), 'CONQUEST_FRESH_ABSOLUTE_OUT');
const parentReal = fs.realpathSync(path.dirname(OUT)); assert(parentReal !== ROOT && !parentReal.startsWith(ROOT + path.sep), 'CONQUEST_CANONICAL_OUTSIDE_CHECKOUT');
assert(fs.realpathSync(path.dirname(OUT)).startsWith(fs.realpathSync(process.env.RUNNER_TEMP) + path.sep) || fs.realpathSync(path.dirname(OUT)) === fs.realpathSync(process.env.RUNNER_TEMP), 'CONQUEST_RUNNER_TEMP_PARENT');
fs.mkdirSync(OUT);
const write = (file, value) => fs.writeFileSync(path.join(OUT, file), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const held = {
  'src/pages/SoccerConquest.tsx': 'ceec9a65d3fb5f229d890e8d438ac1af8e2abc7366b2faf7b04a0be785e32198',
  'src/components/conquest/ImperialismBoardShared.tsx': '18c44f4ce1221c1a2212aeb8c796d0598dd4aab80f245438cb47f5dd881a73c0',
  'src/lib/conquestRun.ts': 'b4a470f70ddaf4bb6d4e2c03b285c945f03d764f8e749fc5bbadc651544dea79',
  'src/lib/conquestDaily.ts': '8fd54969daf5c7fb09b7cf12c138aa628cd2e1681afdeb57e64dceb0738d289d',
  'src/lib/imperialismEngine.ts': 'eeeed35346ac95e40c83e3807fb12e1835d009c33449ab8846ca4525fd6ccc69',
  'src/components/conquest/ImperialismHowToPlay.tsx': 'c436372315300436e7b83e9af34c5c42e04009b900768b24ea0cacda7ff5e12c',
  'src/hooks/useRevealScroll.ts': '42ee464df372437ff934b2f6a2b4acafc25493eb4062e0602166bfdd2e7479cd',
  'src/components/ui/dialog.tsx': 'db1fe38239f922d395d41471d8e9a996b9e8f6d87afddf9edbe3988f15a21fe8',
  'src/index.css': 'ada9cc819db63d0e2eb013bd3c29eec16877e2a30166c390b81901142369fef3',
  'src/lib/dateUtils.ts': '90cc431b127059c58d3a64c98508e97ed96620dee44c4bd8b6e5a4abd0d30966',
  'src/lib/dailyRecord.ts': 'df88b09c447e35badfef99b458764cb55ed82c23fa5e48d8b9570977ea35b780',
  'src/components/conquest/ConquestScenePlayer.tsx': 'ac1fc4ff34cf837ef42f9d7106b3aebbdd7329be0c4e3a77ac048e27ff5206a8',
  'src/lib/conquestScenes.ts': '8d30ce6a1e516dc37694c9e64df2a8f68f0da75a7ef32d1db6b079f2e7a9f4d7',
  'scripts/lib/hostLikeServer.mjs': '3958c9a3b4d9e49bb60a3b7dd72d81a997bd1caed56e82e4c3bae07e1a918ef0',
  'scripts/lib/playwrightLoader.mjs': '94a07179be7ca6b9562d118b52c2d5d0dff0b6b2e29e49e4fea16fa2defb5a93',
  'scripts/qa/siteMenuNavigationSupport.mjs': 'c70e3ecc412f16d3322047b13205716c644495f8c74b76eed83852c87f35d303',
};
const verifySource = () => Object.entries(held).map(([file, pin]) => { const body = fs.readFileSync(file); assert.equal(sha(body), pin, 'CONQUEST_SOURCE_HELD:' + file); return { file, bytes: body.length, sha256: pin }; });
const sources = verifySource();
const fonts = loadFonts(process.env.FREE_KICK_FONT_CACHE, process.env.FONT_CACHE_MANIFEST_SHA256);
const manifestBytes = fs.readFileSync(path.join(DIST, '.vite/manifest.json')), manifest = JSON.parse(manifestBytes);
assert(manifest['index.html']?.isEntry && manifest['src/pages/SoccerConquest.tsx']?.isDynamicEntry, 'CONQUEST_BUILT_MANIFEST');
const savedHTML = fs.readFileSync(path.join(DIST, 'soccer-conquest/index.html'));
const report = { status: 'PENDING', source: process.env.GITHUB_SHA, expectedMain: process.env.EXPECTED_MAIN, expectedParent: process.env.EXPECTED_PARENT,
  observationOnly: true, featureQualified: false, originalReportDate: '2026-10-31', nativeExecutionStarted: new Date().toISOString(), dateRngPerformanceTimersAndMotionUnmodified: true,
  servedRoute: 'ACTUAL_HOST_LIKE_SAVED_ROUTE_NO_HTML_OVERRIDE', sourcePins: sources, fontManifestSHA256: process.env.FONT_CACHE_MANIFEST_SHA256,
  built: { manifestSHA256: sha(manifestBytes), routeHTML: { file: 'soccer-conquest/index.html', bytes: savedHTML.length, sha256: sha(savedHTML) },
    entries: ['index.html', 'src/pages/SoccerConquest.tsx'].map(key => ({ key, file: manifest[key].file, sha256: sha(fs.readFileSync(path.join(DIST, manifest[key].file))) })) }, profiles: [] };
const serverOut = fs.openSync(path.join(OUT, 'server.stdout'), 'wx'), serverErr = fs.openSync(path.join(OUT, 'server.stderr'), 'wx');
let browser, server, fatal = null;
const specs = [{ id: 'daily-pending-draft-reload', decline: true, mode: 'daily' }];

function installObservation() {
  window.__conquestObservationClock = { nativeAtDocumentStart: Date.now(), dateAndTimersUnmodified: true };
  window.__conquestObservationTrace = [];
  const owner = node => node instanceof Element ? node.closest('button,a,input,[role="button"]') : null;
  const identity = node => {
    if (!node) return null;
    if (node.hasAttribute('data-conquest-pick')) return 'winner:' + node.getAttribute('data-conquest-pick');
    if (node.hasAttribute('data-conquest-play')) return 'play';
    const text = node.textContent.replace(/\s+/g, ' ').trim();
    if (/^Got it, let's play Soccer Conquest$/.test(text)) return 'help';
    if (text === 'Close' && node.closest('[data-imperialism-help]')) return 'help-close';
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
      scrollY, targetTag: event.target instanceof Element ? event.target.tagName : null,
      inImperialismHelp: event.target instanceof Element && !!event.target.closest('[data-imperialism-help]'),
      touches: [...(event.touches || [])].map(t => ({ id: t.identifier, x: t.clientX, y: t.clientY })),
      changedTouches: [...(event.changedTouches || [])].map(t => ({ id: t.identifier, x: t.clientX, y: t.clientY })) });
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
      const consent = document.querySelector('[role="region"][aria-label="Cookie choices"]'), banner = rect(consent), header = rect(document.querySelector('header[data-site-chrome]'));
      const hr = rect(host), lo = host ? Math.max(16, hr.y + host.clientTop + 16) : Math.max(16, (header?.bottom || 0) + 16);
      const hi = Math.min(innerHeight - 16, banner?.y !== undefined ? banner.y - 16 : innerHeight - 16, host ? hr.y + host.clientTop + host.clientHeight - 16 : innerHeight - 16);
      const sx = host ? Math.max(16, Math.min(innerWidth - 16, hr.x + host.clientLeft + host.clientWidth / 2)) : innerWidth / 2;
      const upwards = r.y >= 0, startY = upwards ? hi : lo, endY = upwards ? lo : hi;
      const points = Array.from({ length: 9 }, (_, index) => ({ x: sx, y: startY + (endY - startY) * index / 8 }));
      const probes = points.map(point => { const hit = document.elementFromPoint(point.x, point.y); return { ...point, hit: brief(hit), insideExpectedHost: !!hit && (host ? host === hit || host.contains(hit) : !hit.closest('[role="dialog"],[role="region"][aria-label="Cookie choices"]')) }; });
      const swipe = { points, probes, hostExpected: !!host, usable: hi - lo >= 80 && probes.every(probe => probe.insideExpectedHost), direction: upwards ? 'finger-up' : 'finger-down' };
      return { key, ...brief(node), className: typeof node.className === 'string' ? node.className : null, ariaPressed: node.getAttribute('aria-pressed'), center: { x, y }, inViewport, wholeInViewport: r.x >= 0 && r.y >= 0 && r.right <= innerWidth && r.bottom <= innerHeight, swipe,
        disabled: Boolean(node.disabled), ariaDisabled: node.getAttribute('aria-disabled'), hidden: cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0 || !!node.closest('[hidden],[inert],[aria-hidden="true"]'),
        unobstructed: !!hit && (node === hit || node.contains(hit)), hit: brief(hit), scrollHost: host ? { ...brief(host), scrollTop: host.scrollTop, scrollHeight: host.scrollHeight, clientHeight: host.clientHeight, clientWidth: host.clientWidth, clientTop: host.clientTop, clientLeft: host.clientLeft, touchAction: getComputedStyle(host).touchAction } : null };
    };
    const buttons = [...document.querySelectorAll('button')], text = node => node.textContent.replace(/\s+/g, ' ').trim();
    const find = re => buttons.find(node => re.test(text(node)));
    const club = document.querySelector('[data-conquest-stage]') ? null : document.querySelector('div.grid.grid-cols-2 > button');
    const consent = document.querySelector('[role="region"][aria-label="Cookie choices"]');
    const storage = { keys: [], records: [], consentRecord: null, error: null };
    try { storage.consentRecord = localStorage.getItem('cookie-consent-v2'); storage.keys = Object.keys(localStorage).sort(); storage.records = storage.keys.filter(key => /^conquest-|rules-gate-seen:/.test(key)).map(key => ({ key, raw: localStorage.getItem(key) })); } catch (error) { storage.error = String(error); }
    const effectiveET = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date());
    const key = 'conquest-soccer-daily-' + effectiveET, raw = storage.records.find(row => row.key === key)?.raw ?? null;
    let parsed = null, parseError = null; try { parsed = raw === null ? null : JSON.parse(raw); } catch (error) { parseError = String(error); }
    return { label, href: location.href, dateNow: Date.now(), dateISO: new Date().toISOString(), effectiveET, performanceNow: performance.now(),
      clock: window.__conquestObservationClock,
      browser: { locale: navigator.language, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, touchPoints: navigator.maxTouchPoints, dpr: devicePixelRatio },
      viewport: { width: innerWidth, height: innerHeight, scrollX, scrollY, visual: window.visualViewport ? { width: visualViewport.width, height: visualViewport.height, offsetTop: visualViewport.offsetTop, scale: visualViewport.scale } : null, documentHeight: document.documentElement.scrollHeight, documentWidth: document.documentElement.scrollWidth },
      heading: document.querySelector('h1')?.textContent.trim() || null, statusText: document.querySelector('[data-conquest-status]')?.textContent.replace(/\s+/g, ' ').trim() || null,
      callText: document.querySelector('[data-conquest-call]')?.textContent.replace(/\s+/g, ' ').trim() || null,
      scene: !!document.querySelector('[data-scene-player]'), recap: !!document.querySelector('[data-conquest-recap]'), stage: rect(document.querySelector('[data-conquest-stage]')),
      actions: { help: describe(find(/^Got it, let's play Soccer Conquest$/), 'help'), helpClose: describe([...document.querySelectorAll('[data-imperialism-help] button')].find(node => text(node) === 'Close'), 'help-close'), decline: describe(consent ? [...consent.querySelectorAll('button')].find(node => text(node) === 'Reject all') : null, 'decline'), daily: describe(find(/^Daily Challenge/), 'daily'), free: describe(find(/^Free Play$/), 'free'),
        club: describe(club, club ? 'text:' + text(club) : 'club'), winners: [...document.querySelectorAll('[data-conquest-pick]')].map(node => describe(node, 'winner:' + node.getAttribute('data-conquest-pick'))), play: describe(document.querySelector('[data-conquest-play]'), 'play') },
      layers: { dialogs: [...document.querySelectorAll('[role="dialog"],[role="alertdialog"]')].map(brief), consent: brief(consent), header: brief(document.querySelector('header[data-site-chrome]')), menu: brief(document.querySelector('[aria-label="Open site menu"]')), consentPending: document.body.dataset.consentPending || null },
      fonts: { status: document.fonts.status, inter: document.fonts.check('16px Inter'), display: document.fonts.check('16px "Space Grotesk"'), faces: [...document.fonts].map(face => ({ family: face.family, status: face.status })) },
      dailyLog: { key, raw, parsed, parseError }, storage, trace: [...window.__conquestObservationTrace] };
  }, label);
  row.states.push(value); return value;
}

class ObservedStop extends Error { constructor(stage, detail) { super(stage); this.stage = stage; this.detail = detail; } }
class DriverLimitation extends Error { constructor(stage, detail) { super(stage); this.stage = stage; this.detail = detail; } }
const action = (s, kind) => kind === 'winner' ? s.actions.winners[0] : s.actions[kind];
const ready = target => target && !target.disabled && target.ariaDisabled !== 'true' && !target.hidden && target.inViewport && target.unobstructed;
function geometryProbe(kind) {
  const text = node => node.textContent.replace(/\s+/g, ' ').trim(), buttons = [...document.querySelectorAll('button')];
  const node = kind === 'winner' ? document.querySelector('[data-conquest-pick]') : kind === 'play' ? document.querySelector('[data-conquest-play]')
    : kind === 'club' ? document.querySelector('div.grid.grid-cols-2 > button') : kind === 'helpClose' ? [...document.querySelectorAll('[data-imperialism-help] button')].find(node => text(node) === 'Close')
    : kind === 'decline' ? [...document.querySelectorAll('[role="region"][aria-label="Cookie choices"] button')].find(node => text(node) === 'Reject all')
    : buttons.find(node => kind === 'help' ? /^Got it, let's play Soccer Conquest$/.test(text(node)) : kind === 'daily' ? /^Daily Challenge/.test(text(node)) : text(node) === 'Free Play');
  if (!node) return { at: performance.now(), missing: true };
  const key = kind === 'winner' ? 'winner:' + node.getAttribute('data-conquest-pick') : kind === 'club' ? 'text:' + text(node) : kind === 'helpClose' ? 'help-close' : kind;
  let host = node.parentElement; while (host && !(['auto', 'scroll'].includes(getComputedStyle(host).overflowY) && host.scrollHeight > host.clientHeight + 1)) host = host.parentElement;
  const rect = node => { if (!node) return null; const r = node.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; };
  const visual = window.visualViewport ? [visualViewport.width, visualViewport.height, visualViewport.offsetTop, visualViewport.scale] : null;
  const values = [key, scrollX, scrollY, rect(node), rect(host), host?.scrollTop ?? null, visual];
  return { at: performance.now(), key, values, stamp: JSON.stringify(values) };
}
function sampledGeometry(sample, target) {
  if (!target) return null;
  const rect = r => r ? [r.x, r.y, r.width, r.height] : null, v = sample.viewport.visual;
  return JSON.stringify([target.key, sample.viewport.scrollX, sample.viewport.scrollY, rect(target.rect), rect(target.scrollHost?.rect), target.scrollHost?.scrollTop ?? null, v ? [v.width, v.height, v.offsetTop, v.scale] : null]);
}
async function stableTarget(page, row, kind, stage) {
  const deadline = Date.now() + 5000, probes = []; let previous = null, stableSince = null;
  while (Date.now() < deadline) {
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => resolve())));
    const probe = await page.evaluate(geometryProbe, kind); probes.push(probe);
    if (probe.missing) throw new DriverLimitation(stage + '_STABILITY_TARGET_MISSING', { kind, probes });
    if (probe.stamp !== previous) { previous = probe.stamp; stableSince = probe.at; }
    if (probe.at - stableSince >= 220) {
      const fresh = await snapshot(page, row, stage + '-stable-fresh-immediately-before-input');
      if (sampledGeometry(fresh, action(fresh, kind)) === probe.stamp) {
        (row.stability ||= []).push({ stage, kind, requiredStableMS: 220, timeoutMS: 5000, observedStableMS: probe.at - stableSince, probes, freshState: fresh.label, noScrollOrMotionMutation: true });
        return fresh;
      }
      previous = null; stableSince = null;
    }
    await page.waitForTimeout(35);
  }
  (row.stability ||= []).push({ stage, kind, requiredStableMS: 220, timeoutMS: 5000, probes, stable: false, noInputDispatched: true });
  throw new DriverLimitation(stage + '_WINDOW_TARGET_OR_HOST_STILL_MOVING', { kind, probes });
}
async function touch(page, cdp, row, kind, stage, recover = true) {
  await snapshot(page, row, stage + '-before-any-driver-scroll');
  let s = await stableTarget(page, row, kind, stage + '-initial-stability'), target = action(s, kind);
  if (!target) throw new ObservedStop(stage + '_MISSING', { sample: s.label });
  let witnessedStalls = 0;
  for (let attempt = 0; !ready(target) && recover && attempt < 12; attempt++) {
    if (target.disabled || target.ariaDisabled === 'true' || target.hidden) break;
    if (!target.swipe?.usable) throw new DriverLimitation(stage + '_SCROLL_SURFACE_CLIPPED_OR_OBSTRUCTED', { sample: s.label, target });
    const before = { scrollY: s.viewport.scrollY, hostTop: target.scrollHost?.scrollTop ?? null }, mark = s.trace.length, points = target.swipe.points, commands = [];
    const send = async (type, point) => { const parameters = { type, touchPoints: point ? [{ ...point, id: 1, radiusX: 1, radiusY: 1, force: 1 }] : [] }; await cdp.send('Input.dispatchTouchEvent', parameters); commands.push(parameters); };
    await send('touchStart', points[0]);
    try { for (const point of points.slice(1)) { await page.waitForTimeout(24); await send('touchMove', point); } }
    finally { await send('touchEnd', null); }
    await page.waitForTimeout(350);
    await snapshot(page, row, stage + '-explicit-dispatched-touch-recovery-' + (attempt + 1));
    const after = await stableTarget(page, row, kind, stage + '-post-recovery-stability-' + (attempt + 1)), next = action(after, kind), events = after.trace.slice(mark);
    const starts = events.filter(event => event.type === 'touchstart' && event.trusted && event.touches.length === 1), moves = events.filter(event => event.type === 'touchmove' && event.trusted && event.touches.length === 1);
    const movedTouch = starts.length > 0 && moves.some(event => Math.abs(event.touches[0].y - starts[0].touches[0].y) > 8);
    const scrollChanged = before.scrollY !== after.viewport.scrollY || before.hostTop !== (next?.scrollHost?.scrollTop ?? null);
    row.recovery.push({ stage, attempt: attempt + 1, method: 'CDP_DISPATCH_TOUCH_START_EIGHT_MOVES_END_RECOVERY_ONLY', commands, pointIntervalMS: 24, surface: target.swipe, before,
      after: { scrollY: after.viewport.scrollY, hostTop: next?.scrollHost?.scrollTop ?? null }, trustedMovementWitness: movedTouch, observedScrollChanged: scrollChanged, events, beforeState: s.label, afterState: after.label });
    if (!movedTouch) throw new DriverLimitation(stage + '_NO_TRUSTED_TOUCH_MOVEMENT_WITNESS', { sample: after.label, commands, events });
    witnessedStalls = scrollChanged ? 0 : witnessedStalls + 1;
    s = after; target = next; if (!target || witnessedStalls >= 2) break;
  }
  if (!ready(target)) throw new ObservedStop(stage + '_NOT_REACHABLE', { target, sample: s.label, driverScrollRecovery: recover });
  const mark = s.trace.length, intended = target.key;
  await page.touchscreen.tap(target.center.x, target.center.y);
  await page.waitForTimeout(120);
  const after = await snapshot(page, row, stage + '-after-native-touch');
  const events = after.trace.slice(mark), witness = type => events.some(event => event.type === type && event.trusted && event.key === intended && event.pointerType === 'touch');
  const down = witness('pointerdown'), up = witness('pointerup'), witnessed = witness('click');
  row.actions.push({ stage, kind, intended, center: target.center, before: s.label, after: after.label, trustedPointerDownWitness: down, trustedPointerUpWitness: up, trustedClickWitness: witnessed, events });
  if (!down || !up || !witnessed) throw new DriverLimitation(stage + '_NATIVE_TAP_OWNERSHIP_OR_CLICK_INCOMPLETE_NO_RETAP', { sample: after.label, intended, down, up, click: witnessed, events });
  return after;
}
async function image(page, row, name) {
  assert(row.images.length < 2, 'CONQUEST_DIAGNOSTIC_TWO_ORIGINAL_LIMIT');
  const state = () => page.evaluate(() => ({ innerWidth, innerHeight, scrollX, scrollY, visual: visualViewport ? { width: visualViewport.width, height: visualViewport.height, scale: visualViewport.scale } : null, inputCount: window.__conquestObservationTrace.length }));
  const before = await state(), file = row.id + '-' + name + '.png';
  await page.screenshot({ path: path.join(OUT, file), fullPage: false });
  const after = await state(), b = fs.readFileSync(path.join(OUT, file));
  row.images.push({ file, bytes: b.length, sha256: sha(b), original: true, viewportOnly: true, declaredStop: name, before, after });
  assert.deepEqual(after, before, 'CONQUEST_CAPTURE_VIEWPORT_SCROLL_INPUT_HELD');
}
function armFirstSceneObservation() {
  const observation = { armedAt: performance.now(), startedAt: null, complete: false, samples: [], stable220: null,
    atLeast1s: null, dropped: 0, clockAndMotionUnmodified: true };
  window.__conquestFirstSceneObservation = observation;
  const sample = () => {
    const rect = node => { if (!node) return null; const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; };
    const card = document.querySelector('[data-scene-card]'), player = document.querySelector('[data-scene-player]');
    const first = card || player || document.querySelector('[data-conquest-recap],[data-conquest-complete],[data-conquest-stage],main');
    const v = window.visualViewport, visual = v ? { width: v.width, height: v.height, scale: v.scale, offsetLeft: v.offsetLeft, offsetTop: v.offsetTop } : null;
    const ancestors = []; let node = first;
    while (node && ancestors.length < 12) {
      const style = getComputedStyle(node), box = rect(node);
      ancestors.push({ tag: node.tagName, id: node.id, class: typeof node.className === 'string' ? node.className : null,
        sceneCard: node.hasAttribute('data-scene-card'), scenePlayer: node.hasAttribute('data-scene-player'), rect: box,
        clientWidth: node.clientWidth, scrollWidth: node.scrollWidth, minWidth: style.minWidth, width: style.width,
        overflowX: style.overflowX, overflowY: style.overflowY, transform: style.transform,
        animationName: style.animationName, animationDuration: style.animationDuration,
        animations: node.getAnimations().map(a => ({ currentTime: typeof a.currentTime === 'number' ? a.currentTime : null, playState: a.playState })),
        extendsVisualBounds: !!box && (box.x < (visual?.offsetLeft || 0) || box.right > (visual?.offsetLeft || 0) + (visual?.width || innerWidth)) });
      node = node.parentElement;
    }
    const value = { at: performance.now(), elapsedMS: performance.now() - observation.startedAt,
      innerWidth, innerHeight, documentClientWidth: document.documentElement.clientWidth, documentWidth: document.documentElement.scrollWidth,
      scrollX, scrollY, visual, scenePresent: !!player, cardIndex: card?.getAttribute('data-scene-index') ?? null,
      beat: player?.getAttribute('data-scene-beat') ?? null, recap: !!document.querySelector('[data-conquest-recap]'),
      complete: !!document.querySelector('[data-conquest-complete]'), ancestorWalkTruncated: !!node, ancestors };
    value.signature = JSON.stringify([value.innerWidth, value.innerHeight, value.documentClientWidth, value.documentWidth,
      value.scrollX, value.scrollY, visual, value.scenePresent, value.cardIndex, value.beat,
      ancestors.map(a => [a.tag, a.id, a.sceneCard, a.scenePlayer, a.rect, a.clientWidth, a.scrollWidth, a.minWidth, a.overflowX, a.overflowY, a.transform])]);
    return value;
  };
  const activated = event => {
    if (!event.isTrusted || !(event.target instanceof Element) || !event.target.closest('[data-conquest-play]') || observation.startedAt !== null) return;
    document.removeEventListener('click', activated, true);
    observation.startedAt = performance.now(); observation.actualTrustedActivation = true;
    let previous = null, stableSince = null;
    const tick = () => {
      const value = sample();
      if (observation.samples.length >= 400) { observation.dropped += 1; observation.complete = true; observation.reason = 'READ_ONLY_SAMPLE_CAP'; return; }
      observation.samples.push(value);
      if (value.signature !== previous) { previous = value.signature; stableSince = value.at; }
      if (value.at - stableSince >= 220 && !observation.stable220) observation.stable220 = { index: observation.samples.length - 1, observedMS: value.at - stableSince, sample: value };
      if (value.elapsedMS >= 1000 && !observation.atLeast1s) observation.atLeast1s = { index: observation.samples.length - 1, sample: value };
      if (observation.stable220 && observation.atLeast1s && value.at - stableSince >= 220) { observation.finalStableMS = value.at - stableSince; observation.stopSample = value; observation.complete = true; observation.reason = 'STABLE220_AND_NATIVE_AT_LEAST1S'; return; }
      if (value.elapsedMS >= 5000) { observation.complete = true; observation.reason = 'NATIVE5S_GEOMETRY_WINDOW_LIMIT'; return; }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  document.addEventListener('click', activated, { capture: true });
}
async function documentCaptureBarrier(page, row, pending, stage) {
  await page.waitForFunction(() => document.fonts.status === 'loaded' && document.fonts.check('16px Inter') && document.fonts.check('16px "Space Grotesk"'), null, { timeout: 10000 });
  const deadline = Date.now() + 10000; let drained = 0;
  do {
    const through = pending.length; let timer;
    try {
      await Promise.race([Promise.allSettled(pending.slice(drained, through)), new Promise((_, reject) => { timer = setTimeout(() => reject(new DriverLimitation(stage + '_BODY_COLLECTION_TIMEOUT', { pending: pending.length })), Math.max(1, deadline - Date.now())); })]);
    } finally { clearTimeout(timer); }
    drained = through;
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
    if (Date.now() >= deadline && drained !== pending.length) throw new DriverLimitation(stage + '_BODY_COLLECTION_STILL_ACTIVE', { drained, pending: pending.length });
  } while (drained !== pending.length);
  const errors = row.responses.filter(value => value.bodyError);
  (row.captureBarriers ||= []).push({ stage, pendingAtBarrier: pending.length, completedResponses: row.responses.length, bodyErrors: errors });
  if (errors.length) throw new DriverLimitation(stage + '_LITERAL_RESPONSE_BODY_CAPTURE_ERRORS', { errors });
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
      await documentCaptureBarrier(page, row, pending, 'BOOT_BEFORE_UI');
      await page.waitForTimeout(500); const boot = await snapshot(page, row, 'boot-untouched');
      row.startedNaturalET = boot.effectiveET;
      row.helpObservedAtBoot = !!boot.actions.help;
      const declined = await touch(page, cdp, row, 'decline', 'REAL_CONSENT_DECLINE');
      if (declined.layers.consent || !declined.storage.consentRecord) throw new ObservedStop('REAL_CONSENT_DECLINE_DID_NOT_DISMISS', { sample: declined.label });
      await page.waitForTimeout(160);
      let preplay = await snapshot(page, row, 'preplay-after-consent-action');
      if (!row.helpObservedAtBoot) throw new DriverLimitation('FIRST_VISIT_HELP_NOT_OBSERVED_AT_BOOT', { sample: boot.label });
      if (!preplay.actions.help) {
        const consentAction = row.actions.find(item => item.kind === 'decline' && item.trustedClickWitness);
        if (!consentAction || preplay.layers.dialogs.length) throw new DriverLimitation('HELP_DISAPPEARED_WITHOUT_OWNED_CONSENT_DISMISSAL', { sample: preplay.label });
        row.helpDisposition = { type: 'NATURALLY_CLOSED_AFTER_REAL_CONSENT_ACTION', boot: boot.label, after: preplay.label, action: consentAction.stage, helpCTAUsed: false };
      } else {
        try {
          preplay = await touch(page, cdp, row, 'help', 'FIRST_VISIT_HELP_CTA');
          row.helpDisposition = { type: 'GENUINE_HELP_CTA_NATIVE_TOUCH', after: preplay.label, helpCTAUsed: true };
        } catch (error) {
          if (!(error instanceof ObservedStop) && !(error instanceof DriverLimitation)) throw error;
          row.helpCTARecovery = { error: { name: error.name, message: error.message, detail: error.detail }, recovery: 'ACTUAL_VISIBLE_CLOSE_X_NATIVE_TOUCH_NOT_CTA_SUCCESS' };
          (row.diagnosticDriverLimitations ||= []).push(row.helpCTARecovery.error);
          preplay = await touch(page, cdp, row, 'helpClose', 'HELP_CLOSE_X_EXPLICIT_RECOVERY', false);
          row.helpDisposition = { type: 'REAL_CLOSE_X_RECOVERY_AFTER_RECORDED_CTA_FAILURE', after: preplay.label, helpCTAUsed: false };
        }
      }
      await page.waitForTimeout(250);
      preplay = await snapshot(page, row, 'preplay-dismissal-final-state');
      if (preplay.actions.help || preplay.layers.dialogs.length) throw new ObservedStop('HELP_REMAINS_AFTER_NATIVE_DISMISSAL', { sample: preplay.label });
      await touch(page, cdp, row, 'daily', 'DAILY_MODE');
      const preview = await touch(page, cdp, row, 'club', 'REAL_CLUB_SELECTION');
      if (!preview.actions.play || preview.actions.winners.length !== 2 || !/Matchday\s+1\s+of\s+10/.test(preview.statusText || '')) throw new ObservedStop('FIRST_PREVIEW', { sample: preview.label });
      if (preview.storage.error || preview.dailyLog.parseError) throw new DriverLimitation('ACTUAL_STORAGE_READ_LIMITATION', { storage: preview.storage.error, parse: preview.dailyLog.parseError });
      if (preview.effectiveET !== row.startedNaturalET) throw new DriverLimitation('NATURAL_ET_DATE_CHANGED', { before: row.startedNaturalET, after: preview.effectiveET });
      const zero = preview.dailyLog.parsed;
      if (!zero || zero.date !== row.startedNaturalET || zero.picks?.length !== 0 || zero.done !== false) throw new ObservedStop('ACTUAL_ZERO_PICK_SAVE', { actual: preview.dailyLog });
      row.actualZeroPickSave = preview.dailyLog;
      const chosen = await touch(page, cdp, row, 'winner', 'CHOOSE_DRAFT_BEFORE_RELOAD');
      if (chosen.actions.play?.disabled !== false) throw new ObservedStop('TRUSTED_DRAFT_SELECTION_DID_NOT_ENABLE_PLAY', { sample: chosen.label });
      if (chosen.dailyLog.raw !== preview.dailyLog.raw) throw new ObservedStop('UNPLAYED_DRAFT_CHANGED_SETTLED_LOG', { before: preview.dailyLog, after: chosen.dailyLog });
      row.chosenDraft = { sample: chosen.label, actualWinner: row.actions.at(-1).intended, playEnabled: true, actualRawZeroPickHeld: true };
      await documentCaptureBarrier(page, row, pending, 'BEFORE_DRAFT_RELOAD');
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
      try { await page.waitForFunction(() => !!document.querySelector('[data-conquest-call]'), null, { timeout: 20000 }); }
      catch (error) { throw new ObservedStop('RESTORED_DRAFT_PREVIEW_BOOT', { error: String(error) }); }
      await documentCaptureBarrier(page, row, pending, 'RESTORED_DRAFT_DOCUMENT');
      const restored = await stableTarget(page, row, 'winner', 'RESTORED_DRAFT_BEFORE_DRIVER_INPUT');
      if (restored.effectiveET !== row.startedNaturalET) throw new DriverLimitation('NATURAL_ET_DATE_CHANGED', { before: row.startedNaturalET, after: restored.effectiveET });
      if (restored.dailyLog.raw !== row.actualZeroPickSave.raw) throw new ObservedStop('ACTUAL_ZERO_PICK_LOG_NOT_HELD_AFTER_RELOAD', { before: row.actualZeroPickSave, after: restored.dailyLog });
      row.restoredDraft = { sample: restored.label, playDisabled: restored.actions.play?.disabled ?? null,
        winners: restored.actions.winners.map(value => ({ key: value.key, className: value.className, ariaPressed: value.ariaPressed, rect: value.rect, hit: value.unobstructed })),
        helper: restored.callText, sameRawZeroPickSave: true, scope: 'Pending draft is not required to persist; source currently initializes prediction null' };
      await image(page, row, 'draft-reload-before-reselection');
      const predicted = await touch(page, cdp, row, 'winner', 'RESELECT_ACTUAL_WINNER');
      row.predictionTeam = row.actions.at(-1).intended.replace(/^winner:/, '');
      if (predicted.actions.play?.disabled !== false) throw new ObservedStop('TRUSTED_RESELECTION_DID_NOT_ENABLE_PLAY', { sample: predicted.label });
      await page.evaluate(armFirstSceneObservation);
      await touch(page, cdp, row, 'play', 'FIRST_MATCH_PLAY');
      try { await page.waitForFunction(() => /Calls\s+\d+\/1\b/.test(document.querySelector('[data-conquest-status]')?.textContent || '') && !!document.querySelector('[data-scene-player],[data-conquest-recap],[data-conquest-complete]'), null, { timeout: 15000 }); }
      catch (error) { throw new ObservedStop('FIRST_ROUND_SETTLEMENT', { error: String(error) }); }
      await page.waitForFunction(() => window.__conquestFirstSceneObservation?.complete, null, { timeout: 6500 });
      row.earlyAnimation = await page.evaluate(() => window.__conquestFirstSceneObservation);
      const settled = await snapshot(page, row, 'first-round-native-at-least1s-stop');
      if (settled.dailyLog.parsed?.picks?.length !== 1 || settled.dailyLog.parsed.picks[0] !== row.predictionTeam) throw new ObservedStop('FIRST_ROUND_ACTUAL_ONE_PICK_SAVE', { actual: settled.dailyLog, predictionTeam: row.predictionTeam });
      row.firstRoundObserved = true; row.actualOnePickSave = settled.dailyLog;
      await image(page, row, 'first-scene-native-stop');
      if (!row.earlyAnimation.actualTrustedActivation || row.earlyAnimation.reason !== 'STABLE220_AND_NATIVE_AT_LEAST1S' || row.earlyAnimation.dropped) throw new DriverLimitation('EARLY_SCENE_GEOMETRY_OBSERVATION_INCOMPLETE', { actual: row.earlyAnimation });
      await documentCaptureBarrier(page, row, pending, 'BEFORE_ACTUAL_RECAP_RELOAD');
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
      try { await page.waitForFunction(() => !!document.querySelector('[data-conquest-recap],[data-conquest-complete]'), null, { timeout: 20000 }); }
      catch (error) { throw new ObservedStop('ACTUAL_ONE_PICK_RECAP_RELOAD', { error: String(error) }); }
      await documentCaptureBarrier(page, row, pending, 'FINAL_RECAP_DOCUMENT');
      const recap = await snapshot(page, row, 'actual-one-pick-recap-reload');
      if (recap.effectiveET !== row.startedNaturalET) throw new DriverLimitation('NATURAL_ET_DATE_CHANGED', { before: row.startedNaturalET, after: recap.effectiveET });
      if (recap.dailyLog.raw !== row.actualOnePickSave.raw) throw new ObservedStop('ACTUAL_ONE_PICK_SAVE_NOT_HELD_ON_RELOAD', { before: row.actualOnePickSave, after: recap.dailyLog });
      row.actualRecapReload = recap.label;
      row.status = 'OBSERVED_DRAFT_RELOAD_RESELECTION_AND_FIRST_ROUND';
    } catch (error) {
      row.status = error instanceof ObservedStop ? 'BLOCKED_AT_' + error.stage : 'OBSERVATION_DRIVER_LIMITATION';
      row.error = { name: error.name, message: error.message, stack: error.stack, detail: error.detail || null };
      if (page && !page.isClosed()) { try { await snapshot(page, row, 'stopped-final-state'); row.stoppedEarlyAnimation = await page.evaluate(() => window.__conquestFirstSceneObservation || null); } catch (captureError) { row.captureError = String(captureError); } }
    } finally {
      if (page && !page.isClosed()) { try { await documentCaptureBarrier(page, row, pending, 'BEFORE_CONTEXT_CLOSE'); } catch (error) { (row.diagnosticDriverLimitations ||= []).push({ name: error.name, message: error.message, detail: error.detail || null }); } }
      await context.close(); await Promise.allSettled(pending);
      if (row.responses.some(value => value.bodyError) || row.pageErrors.length || row.states.some(value => value.trace.length >= 1400)) (row.diagnosticDriverLimitations ||= []).push({ message: 'LITERAL_CAPTURE_PAGE_ERROR_OR_TRACE_LIMIT', responseBodyErrors: row.responses.filter(value => value.bodyError), pageErrors: row.pageErrors });
      row.observedDateProgress = row.states.map(state => ({ label: state.label, dateNow: state.dateNow, nativeAtDocumentStart: state.clock?.nativeAtDocumentStart }));
      row.wallClockNondecreasing = row.observedDateProgress.every((state, index, all) => index === 0 || state.dateNow >= all[index - 1].dateNow);
      if (!row.wallClockNondecreasing) (row.diagnosticDriverLimitations ||= []).push({ message: 'OBSERVATION_CLOCK_MOVED_BACKWARDS', progress: row.observedDateProgress });
      if (row.diagnosticDriverLimitations?.length) { row.previousObservedStatus = row.status; row.status = 'OBSERVATION_DRIVER_LIMITATION'; }
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
  report.counts = { profiles: report.profiles.length, reachedFirstRound: report.profiles.filter(row => row.status === 'OBSERVED_DRAFT_RELOAD_RESELECTION_AND_FIRST_ROUND').length, blocked: report.profiles.filter(row => row.status.startsWith('BLOCKED_AT_')).length, driverLimitations: report.profiles.filter(row => row.status === 'OBSERVATION_DRIVER_LIMITATION').length, screenshots: report.profiles.reduce((n, row) => n + row.images.length, 0), firstRoundWitnessedIncludingLimitedProfiles: report.profiles.filter(row => row.firstRoundObserved).length };
  report.limits = ['One context diagnostic only, no product bug/fix/feature qualification.', 'Exact PR447 fixed app source, not the family delivery base. Actual saved route is served without HTML override.', '360x664 DPR2 sr-RS Europe/Belgrade touch Chromium emulation is not physical Android proof.', 'Date, RNG, performance, timers and animation are native. Actual ET execution day is recorded; no claim to reproduce the original date if it differs.', 'Pending draft loss after reload is an observation, not an asserted persistence feature. One real reselection and Play must be distinguished from off-fold/covered/moving-input limitations.', 'Early scene RAF samples capture actual viewport/document/visual scale and ancestor rects/transforms through220ms stable andatleast1s; this is not a full scene walk or a performance benchmark.', 'At most two original ordinary viewport PNGs at declared stops. No hidden retap, resize, scripted scroll/focus, score or win forcing, DOM/React/geometry patch, or external forwarding.'];
  write('OBSERVATION.json', report);
}
console.log('CONQUEST_DRAFT_DIAGNOSTIC_COMPLETE: ' + JSON.stringify(report.counts) + '; status=' + report.status + '; no feature qualification.');
if (report.status !== 'OBSERVATION_COMPLETE' || report.profiles.length !== 1) process.exitCode = 2;
