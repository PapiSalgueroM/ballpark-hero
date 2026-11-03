/* Focused remote QA. Actual App and native timers; the report-date Date offset is a separate declared lab. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import pw from '../lib/playwrightLoader.mjs';

const ROOT = fs.realpathSync(process.cwd()), OUT = process.env.CONQUEST_FIRST_MATCH_OUT;
assert.equal(process.env.CI, '1'); assert.equal(process.env.SIM_NETWORK, 'offline');
assert.equal(process.env.CONQUEST_FIRST_MATCH_EXPECTED_PARENT, 'aa3331cf33486f474af367824300384b4ef6f391');
assert.equal(path.resolve(process.argv[1]), path.join(ROOT, 'scripts/qa/probeSoccerConquestFirstMatch.mjs'));
assert(OUT && path.isAbsolute(OUT) && !fs.existsSync(OUT));
const TEMP = fs.realpathSync(process.env.RUNNER_TEMP), parent = fs.realpathSync(path.dirname(OUT));
assert((parent === TEMP || parent.startsWith(TEMP + path.sep)) && parent !== ROOT && !parent.startsWith(ROOT + path.sep));
fs.mkdirSync(OUT);
const sha = body => createHash('sha256').update(body).digest('hex');
const blob = body => createHash('sha1').update('blob ' + body.length + '\0').update(body).digest('hex');
const write = (name, value) => fs.writeFileSync(path.join(OUT, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const clone = value => structuredClone(value), ROUTE = '/soccer-conquest';
const specs = [{ id: 'native-current', offset: 0 }, { id: 'report-date', epoch: Date.parse('2026-10-31T10:10:33.131Z') }];
const held = new Map(), assets = new Map(), fonts = new Map(), graphHolds = new Map(), references = new Map(), records = [], attempted = [], secondary = [];
const sourcePins = {
  'src/pages/SoccerConquest.tsx': 'ceec9a65d3fb5f229d890e8d438ac1af8e2abc7366b2faf7b04a0be785e32198',
  'src/components/conquest/ImperialismBoardShared.tsx': '18c44f4ce1221c1a2212aeb8c796d0598dd4aab80f245438cb47f5dd881a73c0',
  'src/components/conquest/ConquestScenePlayer.tsx': '80473d3f54c23d8269c9bf720e225e24bebbcd22651641b1686b348dbe2a91cd',
  'src/lib/conquestDaily.ts': '8fd54969daf5c7fb09b7cf12c138aa628cd2e1681afdeb57e64dceb0738d289d',
  'src/lib/conquestRun.ts': 'b4a470f70ddaf4bb6d4e2c03b285c945f03d764f8e749fc5bbadc651544dea79',
  'src/lib/imperialismEngine.ts': 'eeeed35346ac95e40c83e3807fb12e1835d009c33449ab8846ca4525fd6ccc69',
  'src/lib/conquestScenes.ts': '8d30ce6a1e516dc37694c9e64df2a8f68f0da75a7ef32d1db6b079f2e7a9f4d7',
  'src/lib/dateUtils.ts': '90cc431b127059c58d3a64c98508e97ed96620dee44c4bd8b6e5a4abd0d30966',
  'src/lib/dailyRecord.ts': 'df88b09c447e35badfef99b458764cb55ed82c23fa5e48d8b9570977ea35b780',
  'src/hooks/useRevealScroll.ts': '42ee464df372437ff934b2f6a2b4acafc25493eb4062e0602166bfdd2e7479cd',
  'scripts/lib/playwrightLoader.mjs': '94a07179be7ca6b9562d118b52c2d5d0dff0b6b2e29e49e4fea16fa2defb5a93',
  'scripts/qa/fixtures/siteFonts.captured.json': 'a6c24e3ec7711d400f53a1baf10a3a6a3925d1f269e48ee0cd14bdca5b749938',
};
let api, arrowMs, browser = null, server = null, BASE = null, primary = null, summary = null;
const mime = file => ({ '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.txt': 'text/plain' })[path.extname(file)] || 'application/octet-stream';
function tree(dir, map) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    assert(!entry.isSymbolicLink(), 'No mutable asset symlink'); const file = path.join(dir, entry.name);
    if (entry.isDirectory()) tree(file, map); else map.set(file, fs.readFileSync(file));
  }
}
async function prepare() {
  for (const file of [...Object.keys(sourcePins), 'src/data/soccerConquest.ts', 'src/components/conquest/ConquestWheel.tsx', 'scripts/qa/probeSoccerConquestFirstMatch.mjs', 'package.json', 'package-lock.json']) held.set(file, fs.readFileSync(path.join(ROOT, file)));
  write('source-before.json', [...held].map(([file, body]) => ({ file, bytes: body.length, sha256: sha(body), gitBlob: blob(body) })));
  for (const [file, pin] of Object.entries(sourcePins)) assert.equal(sha(held.get(file)), pin, 'Exact source: ' + file);
  assert.equal(blob(held.get('src/data/soccerConquest.ts')), '370baf910baca2181b6d5dbe7f50b2722dcdbc27');
  assert.equal(blob(held.get('src/components/conquest/ConquestWheel.tsx')), '6761d8b54e670252f4ee752e1c603964282a844c');
  const code = held.get('src/components/conquest/ConquestWheel.tsx').toString('utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\n)\s*\/\/[^\n]*/g, '$1');
  const arrow = [...code.matchAll(/export\s+const\s+ARROW_SPIN_MS\s*=\s*(\d+)\s*;/g)]; assert.equal(arrow.length, 1); arrowMs = Number(arrow[0][1]);
  const payload = JSON.parse(held.get('scripts/qa/fixtures/siteFonts.captured.json')); assert.equal(payload.entries.length, 9);
  for (const row of payload.entries) {
    assert.equal(row.encoding, 'gzip+hex'); assert(['https://fonts.googleapis.com', 'https://fonts.gstatic.com'].includes(new URL(row.url).origin));
    const body = gunzipSync(Buffer.from(row.body, 'hex')); assert.equal(body.length, row.bytes); assert.equal(sha(body), row.sha256);
    assert(!fonts.has(row.url)); fonts.set(row.url, { body, sha256: row.sha256, contentType: row.contentType });
  }
  write('font-inputs.json', { fixtureSha256: sha(held.get('scripts/qa/fixtures/siteFonts.captured.json')), archiveReacquisitions: 0, fontDownloads: 0, entries: [...fonts].map(([url, row]) => ({ url, bytes: row.body.length, sha256: row.sha256 })) });
  const dist = path.join(ROOT, 'dist'), bodies = new Map(); tree(dist, bodies);
  for (const [file, body] of bodies) assets.set('/' + path.relative(dist, file).replaceAll('\\', '/'), { body: Buffer.from(body), sha256: sha(body), contentType: mime(file) });
  assert(assets.has('/index.html') && assets.has(ROUTE + '/index.html'));
  write('dist-before.json', [...assets].map(([file, row]) => ({ file, bytes: row.body.length, sha256: row.sha256 })));
  const entry = path.join(OUT, 'actual-oracle-entry.ts');
  const entryBody = [
    `export { SOCCER_IMPERIALISM as sport } from ${JSON.stringify(path.join(ROOT, 'src/data/soccerConquest.ts'))};`,
    `export { dailyConquestRng } from ${JSON.stringify(path.join(ROOT, 'src/lib/conquestDaily.ts'))};`,
    `export { startRun, playRound, continueRun, replayRun, featuredPairing, dailyRunRecord } from ${JSON.stringify(path.join(ROOT, 'src/lib/conquestRun.ts'))};`,
    `export { buildScenes, SCENE_TIMINGS, WHEEL_SPIN_MS } from ${JSON.stringify(path.join(ROOT, 'src/lib/conquestScenes.ts'))};`,
    `export { teamLabel, regionNoun } from ${JSON.stringify(path.join(ROOT, 'src/lib/imperialismEngine.ts'))};`,
  ].join('\n') + '\n';
  fs.writeFileSync(entry, entryBody, { flag: 'wx' }); graphHolds.set(entry, fs.readFileSync(entry));
  const result = await build({ entryPoints: [entry], bundle: true, write: false, format: 'cjs', platform: 'node', outfile: path.join(OUT, 'actual-oracle.cjs'), tsconfig: path.join(ROOT, 'tsconfig.app.json'), metafile: true });
  write('oracle-metafile.json', result.metafile);
  for (const input of Object.keys(result.metafile.inputs)) {
    const file = path.resolve(ROOT, input); assert(file === entry || file.startsWith(ROOT + path.sep), 'Owned actual import: ' + input);
    assert(fs.existsSync(file)); graphHolds.set(file, fs.readFileSync(file));
  }
  write('oracle-inputs.json', [...graphHolds].map(([file, body]) => ({ file, bytes: body.length, sha256: sha(body) })));
  const output = result.outputFiles.filter(row => row.path.endsWith('/actual-oracle.cjs')); assert.equal(output.length, 1);
  const bundle = Buffer.from(output[0].contents), file = path.join(OUT, 'actual-oracle.cjs'); fs.writeFileSync(file, bundle, { flag: 'wx' }); graphHolds.set(file, bundle);
  write('oracle-bundle.json', { bytes: bundle.length, sha256: sha(bundle), browserRngIntercepted: false, scope: 'Companion uses the actual pinned pure APIs and wraps only its own RNG return values' });
  api = createRequire(import.meta.url)(file);
  assert.deepEqual(api.SCENE_TIMINGS, { card: 700, fight: 900, score: 600, takeover: 900 }); assert.equal(api.WHEEL_SPIN_MS, 1600); assert.equal(arrowMs, 700);
}
function oracle(date, firstPick, secondPick = null) {
  const draws = [], rng0 = api.dailyConquestRng('soccer', date), rng = () => { const value = rng0(); draws.push(value); return value; };
  const start = api.startRun(api.sport, 'ARS', rng), startCount = draws.length;
  const first = api.playRound(api.sport, start, firstPick, rng), firstCount = draws.length;
  const replayDraws = [], rng1 = api.dailyConquestRng('soccer', date), replayRng = () => { const value = rng1(); replayDraws.push(value); return value; };
  const restored = api.replayRun(api.sport, 'ARS', [firstPick], replayRng), replayCount = replayDraws.length;
  let next = null, second = null, continueCount = null;
  if (secondPick !== null) { next = api.continueRun(api.sport, restored, replayRng); continueCount = replayDraws.length; second = api.playRound(api.sport, next, secondPick, replayRng); }
  return { date, firstPick, secondPick, start, first, restored, next, second, draws, replayDraws, counts: { start: startCount, first: firstCount, restored: replayCount, continued: continueCount, second: second ? replayDraws.length : null }, firstScenes: api.buildScenes(first, 0, api.featuredPairing(api.sport, start), firstPick), scope: 'Companion draw tapes only, not intercepted private browser RNG calls' };
}
function recapLines(run) {
  return run.lastRound.games.map(game => {
    const loser = game.winner === game.home ? game.away : game.home, a = game.winner === game.home ? game.homeScore : game.awayScore, b = game.winner === game.home ? game.awayScore : game.homeScore;
    return `${api.teamLabel(api.sport, game.winner)} ${a} to ${b} ${api.teamLabel(api.sport, loser)}${game.overtime ? ` (${api.sport.score.tieBreakLabel})` : ''}${game.swing > 0 ? `, +${game.swing} ${api.regionNoun(api.sport, game.swing)}` : ''}`;
  });
}
function installObservation(config) {
  const NativeDate = Date, nativeNow = NativeDate.now.bind(NativeDate), offset = config.offset;
  if (config.id === 'report-date') {
    const shiftedNow = () => nativeNow() + offset;
    window.Date = new Proxy(NativeDate, {
      apply() { return new NativeDate(shiftedNow()).toString(); },
      construct(target, args, newTarget) { return Reflect.construct(target, args.length ? args : [shiftedNow()], newTarget); },
      get(target, key, receiver) { return key === 'now' ? shiftedNow : Reflect.get(target, key, receiver); },
    });
  }
  const native = value => /\[native code\]/.test(Function.prototype.toString.call(value));
  const clock = () => {
    const nativeBefore = nativeNow(), exposed = Date.now(), nativeAfter = nativeNow();
    const constructorBefore = nativeNow(), constructorNow = new Date().valueOf(), constructorAfter = nativeNow();
    return { mode: config.id, offset, nativeBefore, exposed, nativeAfter, constructorBefore, constructorNow, constructorAfter,
      dateConstructorNative: Date === NativeDate, nativeFlags: { random: native(Math.random), performance: native(performance.now), timers: native(setTimeout) && native(clearTimeout), raf: native(requestAnimationFrame), crypto: native(crypto.getRandomValues) } };
  };
  window.__conquestObservationClock = { nativeAtDocumentStart: nativeNow(), dateAndTimersUnmodified: config.id === 'native-current', mode: config.id, offset };
  window.__conquestObservationTrace = [];
  const beats = [], operations = [], get = Storage.prototype.getItem, set = Storage.prototype.setItem, remove = Storage.prototype.removeItem;
  let dropped = false, previous = null;
  Storage.prototype.setItem = function (key, value) { if (this === localStorage) operations.push({ kind: 'setItem', key: String(key), value: String(value), at: performance.now() }); return set.call(this, key, value); };
  Storage.prototype.removeItem = function (key) { if (this === localStorage) operations.push({ kind: 'removeItem', key: String(key), at: performance.now() }); return remove.call(this, key); };
  const text = node => node?.textContent.replace(/\s+/g, ' ').trim() ?? null;
  const identity = node => {
    if (!node) return null;
    if (node.hasAttribute('data-conquest-pick')) return 'winner:' + node.getAttribute('data-conquest-pick');
    if (node.hasAttribute('data-conquest-play')) return 'play';
    if (node.hasAttribute('data-conquest-continue')) return 'continue';
    if (node.hasAttribute('data-scene-skip')) return 'scene-skip';
    const value = text(node);
    if (value === "Got it, let's play Soccer Conquest") return 'help';
    if (value === 'Reject all') return 'decline';
    if (/^Daily Challenge/.test(value)) return 'daily';
    return 'text:' + value;
  };
  for (const type of ['pointerdown', 'pointerup', 'touchstart', 'touchmove', 'touchend', 'click', 'scroll', 'keydown', 'keyup']) document.addEventListener(type, event => {
    if (window.__conquestObservationTrace.length >= 4000) { dropped = true; return; }
    const node = event.target instanceof Element ? event.target.closest('button,a,input,[role="button"]') : null;
    window.__conquestObservationTrace.push({ seq: window.__conquestObservationTrace.length, type, trusted: event.isTrusted, at: performance.now(), key: identity(node), keyValue: event.key || null,
      pointerType: event.pointerType || null, scrollY, targetTag: event.target instanceof Element ? event.target.tagName : null,
      touches: [...(event.touches || [])].map(t => ({ id: t.identifier, x: t.clientX, y: t.clientY })), changedTouches: [...(event.changedTouches || [])].map(t => ({ id: t.identifier, x: t.clientX, y: t.clientY })) });
  }, { capture: true, passive: true });
  const observe = () => {
    const scene = document.querySelector('[data-scene-player]'), card = document.querySelector('[data-scene-card]');
    const value = { scene: !!scene, recap: !!document.querySelector('[data-conquest-recap]'), continued: !!document.querySelector('[data-conquest-continue]'), total: scene ? Number(scene.getAttribute('data-scene-total')) : null,
      index: card ? Number(card.getAttribute('data-scene-index')) : null, beat: scene?.getAttribute('data-scene-beat') ?? null, featured: card?.getAttribute('data-scene-featured') ?? null,
      home: card?.querySelector('[data-scene-side="attacker"]')?.getAttribute('data-team') ?? null, away: card?.querySelector('[data-scene-side="defender"]')?.getAttribute('data-team') ?? null, score: text(card?.querySelector('[data-scene-score]')) };
    const signature = JSON.stringify(value); if (signature === previous) return; previous = signature;
    if (beats.length >= 2000) { dropped = true; return; }
    const rect = card?.getBoundingClientRect(); beats.push({ ...value, at: performance.now(), dateNow: Date.now(), documentWidth: document.documentElement.scrollWidth, viewportWidth: innerWidth,
      rect: rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null });
  };
  const start = () => { new MutationObserver(observe).observe(document.documentElement, { childList: true, subtree: true, attributes: true, characterData: true }); observe(); };
  if (document.documentElement) start(); else document.addEventListener('DOMContentLoaded', start, { once: true });
  window.__conquestFollowup = { sample: () => ({ clock: clock(), documentId: performance.timeOrigin, navigationType: performance.getEntriesByType('navigation')[0]?.type ?? null }), read: () => ({ clock: clock(), documentId: performance.timeOrigin, navigationType: performance.getEntriesByType('navigation')[0]?.type ?? null, beats: beats.slice(), operations: operations.slice(), events: window.__conquestObservationTrace.slice(), dropped }) };
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
      const targetMidpointY = (lo + hi) / 2, targetOffsetY = y - targetMidpointY, intendedDistanceCSS = Math.min(240, hi - lo, Math.max(40, Math.abs(targetOffsetY)));
      const upwards = targetOffsetY >= 0, startY = upwards ? hi : lo, endY = startY + (upwards ? -intendedDistanceCSS : intendedDistanceCSS);
      const points = Array.from({ length: 9 }, (_, index) => ({ x: sx, y: startY + (endY - startY) * index / 8 }));
      const probes = points.map(point => { const hit = document.elementFromPoint(point.x, point.y); return { ...point, hit: brief(hit), insideExpectedHost: !!hit && (host ? host === hit || host.contains(hit) : !hit.closest('[role="dialog"],[role="region"][aria-label="Cookie choices"]')) }; });
      const swipe = { points, probes, targetMidpointY, intendedDistanceCSS, hostExpected: !!host, usable: hi - lo >= 80 && probes.every(probe => probe.insideExpectedHost), direction: upwards ? 'finger-up' : 'finger-down' };
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
      clock: window.__conquestObservationClock, followup: window.__conquestFollowup.sample(), ownHelpState: document.querySelector('[data-imperialism-help]')?.getAttribute('data-state') ?? null,
      browser: { locale: navigator.language, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, touchPoints: navigator.maxTouchPoints, dpr: devicePixelRatio },
      viewport: { width: innerWidth, height: innerHeight, scrollX, scrollY, visual: window.visualViewport ? { width: visualViewport.width, height: visualViewport.height, offsetTop: visualViewport.offsetTop, scale: visualViewport.scale } : null, documentHeight: document.documentElement.scrollHeight, documentWidth: document.documentElement.scrollWidth },
      documentCharacterSet: document.characterSet, heading: document.querySelector('h1')?.textContent.trim() || null, statusText: document.querySelector('[data-conquest-status]')?.textContent.replace(/\s+/g, ' ').trim() || null,
      callText: document.querySelector('[data-conquest-call]')?.textContent.replace(/\s+/g, ' ').trim() || null,
      scene: !!document.querySelector('[data-scene-player]'), recap: !!document.querySelector('[data-conquest-recap]'), complete: !!document.querySelector('[data-conquest-complete]'), stage: rect(document.querySelector('[data-conquest-stage]')),
      actions: { help: describe(find(/^Got it, let's play Soccer Conquest$/), 'help'), helpClose: describe([...document.querySelectorAll('[data-imperialism-help] button')].find(node => text(node) === 'Close'), 'help-close'), decline: describe(consent ? [...consent.querySelectorAll('button')].find(node => text(node) === 'Reject all') : null, 'decline'), daily: describe(find(/^Daily Challenge/), 'daily'), free: describe(find(/^Free Play$/), 'free'),
        club: describe(club, club ? 'text:' + text(club) : 'club'), winners: [...document.querySelectorAll('[data-conquest-pick]')].map(node => describe(node, 'winner:' + node.getAttribute('data-conquest-pick'))), play: describe(document.querySelector('[data-conquest-play]'), 'play'), continue: describe(document.querySelector('[data-conquest-continue]'), 'continue') },
      layers: { dialogs: [...document.querySelectorAll('[role="dialog"],[role="alertdialog"]')].map(brief), consent: brief(consent), header: brief(document.querySelector('header[data-site-chrome]')), menu: brief(document.querySelector('[aria-label="Open site menu"]')), consentPending: document.body.dataset.consentPending || null },
      fonts: { status: document.fonts.status, inter: document.fonts.check('16px Inter'), display: document.fonts.check('16px "Space Grotesk"'), faces: [...document.fonts].map(face => ({ family: face.family, status: face.status })) },
      dailyLog: { key, raw, parsed, parseError }, storage, trace: [...window.__conquestObservationTrace] };
  }, label);
  row.states.push(value); return value;
}

class ObservedStop extends Error { constructor(stage, detail) { super(stage); this.stage = stage; this.detail = detail; } }
class DriverLimitation extends Error { constructor(stage, detail) { super(stage); this.stage = stage; this.detail = detail; } }
const action = (s, kind) => kind.startsWith('winner:') ? s.actions.winners.find(value => value.key === kind) : s.actions[kind];
const ready = target => target && !target.disabled && target.ariaDisabled !== 'true' && !target.hidden && target.inViewport && target.unobstructed;
function geometryProbe(kind) {
  const text = node => node.textContent.replace(/\s+/g, ' ').trim(), buttons = [...document.querySelectorAll('button')];
  const node = kind.startsWith('winner:') ? [...document.querySelectorAll('[data-conquest-pick]')].find(node => 'winner:' + node.getAttribute('data-conquest-pick') === kind) : kind === 'play' ? document.querySelector('[data-conquest-play]') : kind === 'continue' ? document.querySelector('[data-conquest-continue]')
    : kind === 'club' ? document.querySelector('div.grid.grid-cols-2 > button') : kind === 'helpClose' ? [...document.querySelectorAll('[data-imperialism-help] button')].find(node => text(node) === 'Close')
    : kind === 'decline' ? [...document.querySelectorAll('[role="region"][aria-label="Cookie choices"] button')].find(node => text(node) === 'Reject all')
    : buttons.find(node => kind === 'help' ? /^Got it, let's play Soccer Conquest$/.test(text(node)) : kind === 'daily' ? /^Daily Challenge/.test(text(node)) : text(node) === 'Free Play');
  if (!node) return { at: performance.now(), missing: true };
  const key = kind.startsWith('winner:') ? 'winner:' + node.getAttribute('data-conquest-pick') : kind === 'club' ? 'text:' + text(node) : kind === 'helpClose' ? 'help-close' : kind;
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
    try { for (const point of points.slice(1)) { await page.waitForTimeout(40); await send('touchMove', point); } await page.waitForTimeout(200); }
    finally { await send('touchEnd', null); }
    await page.waitForTimeout(350);
    await snapshot(page, row, stage + '-explicit-dispatched-touch-recovery-' + (attempt + 1));
    const after = await stableTarget(page, row, kind, stage + '-post-recovery-stability-' + (attempt + 1)), next = action(after, kind), events = after.trace.slice(mark);
    const starts = events.filter(event => event.type === 'touchstart' && event.trusted && event.touches.length === 1), moves = events.filter(event => event.type === 'touchmove' && event.trusted && event.touches.length === 1);
    const movedTouch = starts.length > 0 && moves.some(event => Math.abs(event.touches[0].y - starts[0].touches[0].y) > 8);
    const scrollChanged = before.scrollY !== after.viewport.scrollY || before.hostTop !== (next?.scrollHost?.scrollTop ?? null);
    row.recovery.push({ stage, attempt: attempt + 1, method: 'CDP_DISPATCH_TOUCH_TARGET_AWARE_EIGHT_MOVES_HOLD_END_RECOVERY_ONLY', commands, pointIntervalMS: 40, terminalFingerHoldMS: 200, surface: target.swipe, before,
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
const publicOrigin = 'https://flawuiqbvjobmkfkauhw.supabase.co';
const pollSelect = 'poll_key,question,option_a,option_a_emoji,option_a_flag,option_b,option_b_emoji,option_b_flag,option_c,option_c_emoji,option_c_flag,option_d,option_d_emoji,option_d_flag,sort_order';
function publicRead(request) {
  const url = new URL(request.url()), method = request.method();
  if (url.origin === 'https://flagcdn.com' && method === 'GET' && !url.search && /^\/w(?:20|40|80|160|320)\/[a-z]{2}\.png$/.test(url.pathname)) return 'flag-image';
  if (url.origin !== publicOrigin || !['GET', 'POST', 'OPTIONS'].includes(method)) return null;
  const effective = method === 'OPTIONS' ? request.headers()['access-control-request-method']?.toUpperCase() : method;
  const p = url.searchParams;
  if (url.pathname === '/rest/v1/live_scores' && effective === 'GET' && p.get('select') === '*' && p.get('order') === 'start_at.asc' && p.get('limit') === '150'
    && [...p.keys()].length === 5 && p.getAll('start_at').length === 2 && p.getAll('start_at').map(value => value.slice(0, 4)).sort().join(',') === 'gte.,lte.' && p.getAll('start_at').every(value => Number.isFinite(Date.parse(value.slice(4))))) return 'live-scores';
  if (url.pathname === '/rest/v1/daily_polls' && effective === 'GET' && [...p.keys()].length === 3 && p.get('select') === pollSelect && /^eq\.\d{4}-\d{2}-\d{2}$/.test(p.get('poll_date') || '') && p.get('order') === 'sort_order.asc') return 'daily-polls';
  if (url.pathname === '/rest/v1/rpc/most_played_today' && effective === 'POST' && !url.search) {
    if (method === 'OPTIONS') return 'catalog-read-preflight';
    try { const value = JSON.parse(request.postData()); if (Object.keys(value).sort().join(',') === 'p_limit,p_min' && value.p_min === 3 && value.p_limit === 3) return 'catalog-read-rpc'; } catch {}
  }
  return null;
}

async function screenshot(page, row, stage) {
  const before = await page.evaluate(() => ({ x: scrollX, y: scrollY, width: innerWidth, height: innerHeight, key: 'conquest-soccer-daily-' + new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date()), records: Object.keys(localStorage).filter(key => key.startsWith('conquest-')).sort().map(key => [key, localStorage.getItem(key)]) }));
  const file = row.id + '-' + stage + '.png'; await page.screenshot({ path: path.join(OUT, file), fullPage: false, animations: 'allow' });
  const after = await page.evaluate(() => ({ x: scrollX, y: scrollY, width: innerWidth, height: innerHeight, key: 'conquest-soccer-daily-' + new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date()), records: Object.keys(localStorage).filter(key => key.startsWith('conquest-')).sort().map(key => [key, localStorage.getItem(key)]) }));
  row.images.push({ file, bytes: fs.statSync(path.join(OUT, file)).size, sha256: sha(fs.readFileSync(path.join(OUT, file))), before, after });
  assert.deepEqual(after, before, 'Screenshot holds scroll, viewport and actual daily save');
}
async function fullDocument(page, row, label) {
  const doc = await page.evaluate(() => window.__conquestFollowup.read());
  row.documents.push({ label, ...doc }); write(row.id + '-' + label + '.json', doc); return doc;
}
async function collect(spec) {
  const row = { id: spec.id, mode: spec.id, states: [], actions: [], recovery: [], stability: [], images: [], documents: [], assets: [], responses: [], blocked: [], unexpected: [], pageErrors: [], consoleErrors: [], responseErrors: [], failedRequests: [], routeErrors: [], sockets: [], cleanupErrors: [] };
  attempted.push(spec.id); let context = null, page = null, localPrimary = null;
  const tasks = new Set(), blockedUrls = new Set();
  const drain = async () => { while (tasks.size) await Promise.all([...tasks]); };
  try {
    row.clockConfig = { id: spec.id, nativeAnchor: Date.now(), reportEpoch: spec.epoch ?? null };
    row.clockConfig.offset = spec.id === 'report-date' ? spec.epoch - row.clockConfig.nativeAnchor : 0;
    context = await browser.newContext({ viewport: { width: 360, height: 664 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'sr-RS', timezoneId: 'Europe/Belgrade', reducedMotion: 'no-preference', colorScheme: 'dark', serviceWorkers: 'block' });
    await context.addInitScript(installObservation, { id: spec.id, offset: row.clockConfig.offset });
    await context.route('**/*', route => {
      const task = (async () => {
        const request = route.request(), url = new URL(request.url()), method = request.method(); assert(!url.username && !url.password && !url.hash);
        if (url.origin === BASE && method === 'GET' && !url.search && request.postData() === null) {
          const name = url.pathname === ROUTE || url.pathname === ROUTE + '/' ? ROUTE + '/index.html' : url.pathname === '/' ? '/index.html' : url.pathname;
          const asset = assets.get(name);
          if (asset) { assert(Buffer.isBuffer(asset.body)); assert.equal(sha(asset.body), asset.sha256); row.assets.push({ url: url.href, kind: 'local', name, bytes: asset.body.length, sha256: asset.sha256 }); return await route.fulfill({ status: 200, body: asset.body, contentType: asset.contentType }); }
        }
        if (method === 'GET' && request.postData() === null && fonts.has(url.href)) {
          const font = fonts.get(url.href); assert(Buffer.isBuffer(font.body)); assert.equal(sha(font.body), font.sha256); row.assets.push({ url: url.href, kind: 'font', name: url.href, bytes: font.body.length, sha256: font.sha256 });
          return await route.fulfill({ status: 200, body: font.body, contentType: font.contentType, headers: { 'access-control-allow-origin': '*' } });
        }
        const known = publicRead(request);
        if (known) { blockedUrls.add(url.href); row.blocked.push({ url: url.href, method, kind: known, bodySha256: request.postData() ? sha(request.postData()) : null }); return await route.abort('failed'); }
        row.unexpected.push({ url: url.href, method, bodySha256: request.postData() ? sha(request.postData()) : null }); return await route.abort('blockedbyclient');
      })().catch(error => { row.routeErrors.push({ name: error.name, message: error.message, stack: error.stack }); }).finally(() => tasks.delete(task));
      tasks.add(task); return task;
    });
    await context.routeWebSocket('**/*', socket => {
      row.sockets.push(socket.url()); const task = (async () => { await socket.close({ code: 1008, reason: 'Focused QA refuses sockets' }); })().catch(error => { row.routeErrors.push({ name: error.name, message: error.message }); }).finally(() => tasks.delete(task));
      tasks.add(task); return task;
    });
    page = await context.newPage(); const cdp = await context.newCDPSession(page);
    page.on('pageerror', error => row.pageErrors.push({ name: error.name, message: error.message, stack: error.stack }));
    page.on('console', message => { if (message.type() === 'error') row.consoleErrors.push({ text: message.text(), url: message.location().url }); });
    page.on('requestfailed', request => row.failedRequests.push({ url: request.url(), reason: request.failure()?.errorText ?? null }));
    page.on('response', response => {
      const task = (async () => {
        const url = new URL(response.url()); if (url.origin !== BASE && !fonts.has(url.href)) return;
        const name = url.pathname === ROUTE || url.pathname === ROUTE + '/' ? ROUTE + '/index.html' : url.pathname === '/' ? '/index.html' : url.pathname;
        const expected = url.origin === BASE ? assets.get(name) : fonts.get(url.href); assert(expected);
        const bytes = await response.body(); row.responses.push({ url: url.href, status: response.status(), bytes: bytes.length, sha256: sha(bytes), expectedSha256: expected.sha256, contentType: response.headers()['content-type'] ?? null, fulfilledContentType: expected.contentType });
        assert.equal(response.status(), 200); assert.equal(bytes.length, expected.body.length); assert.equal(sha(bytes), expected.sha256);
      })().catch(error => { row.responseErrors.push({ name: error.name, message: error.message, stack: error.stack }); }).finally(() => tasks.delete(task));
      tasks.add(task);
    });
    const nav = await page.goto(BASE + ROUTE, { waitUntil: 'domcontentloaded', timeout: 30000 }); row.navigation = { status: nav?.status(), url: nav?.url() };
    await page.waitForFunction(() => document.querySelector('h1')?.textContent.trim() === 'Soccer Conquest' && document.querySelector('[data-imperialism-help]') && document.querySelector('[role="region"][aria-label="Cookie choices"]'), null, { timeout: 20000 });
    await page.evaluate(() => document.fonts.ready); await drain(); const boot = await snapshot(page, row, 'boot-untouched'); row.day = boot.effectiveET;
    const rejected = await touch(page, cdp, row, 'decline', 'REAL_CONSENT_DECLINE');
    row.helpTransition = { before: rejected.label, observedState: rejected.ownHelpState, waitedForNativeDetachment: false };
    if (rejected.ownHelpState === 'closed') {
      assert.equal(rejected.layers.consent, null); assert.equal(rejected.layers.consentPending, null);
      row.helpTransition.waitedForNativeDetachment = true;
      await page.locator('[data-imperialism-help]').waitFor({ state: 'detached', timeout: 5000 });
    }
    const preplay = await snapshot(page, row, 'preplay-after-consent'); row.helpTransition.after = preplay.label;
    if (preplay.actions.help) await touch(page, cdp, row, 'help', 'REAL_FIRST_HELP_CTA');
    else assert.equal(preplay.layers.dialogs.length, 0, 'Help naturally closes after the real consent action');
    await touch(page, cdp, row, 'daily', 'DAILY_MODE');
    const preview = await touch(page, cdp, row, 'club', 'REAL_ARSENAL_SELECTION'); row.zero = preview.dailyLog;
    assert.match(row.actions.at(-1).intended, /^text:Arsenal/); assert.equal(preview.dailyLog.parsed?.team, 'ARS'); assert.equal(preview.dailyLog.parsed?.picks.length, 0);
    row.firstPick = preview.actions.winners.some(value => value.key === 'winner:ARS') ? 'ARS' : preview.actions.winners[0].key.slice(7);
    await touch(page, cdp, row, 'winner:' + row.firstPick, 'FIRST_NATIVE_PREDICTION');
    const firstPlayed = await touch(page, cdp, row, 'play', 'FIRST_NATIVE_PLAY'); row.one = firstPlayed.dailyLog;
    const expectedFirst = oracle(row.day, row.firstPick); write(row.id + '-oracle-first.json', expectedFirst);
    const active = await fullDocument(page, row, 'first-scene-start'); const firstScene = active.beats.find(value => value.scene);
    assert(firstScene && Number.isInteger(firstScene.total) && firstScene.total > 0, 'Actual scene count before the natural wait');
    const times = api.SCENE_TIMINGS, nominalMaximumMs = firstScene.total * (times.card + times.fight + times.score + times.takeover) + api.WHEEL_SPIN_MS + arrowMs;
    row.naturalBudget = { actualSceneCount: firstScene.total, nominalMaximumMs, stopAfterMs: nominalMaximumMs * 2 + 10000, scope: 'Finite diagnostic stop only, not a performance threshold' };
    await screenshot(page, row, 'first-scene');
    await page.waitForFunction(() => !document.querySelector('[data-scene-player]') && document.querySelector('[data-conquest-recap] [data-conquest-continue]'), null, { timeout: row.naturalBudget.stopAfterMs, polling: 'raf' });
    row.natural = await snapshot(page, row, 'natural-first-recap'); row.naturalLines = await page.locator('[data-conquest-recap] [data-recap-line]').allTextContents(); row.naturalLines = row.naturalLines.map(value => value.replace(/\s+/g, ' ').trim());
    const beforeReload = await fullDocument(page, row, 'first-natural-end'); await screenshot(page, row, 'natural-recap');
    const reloaded = await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 }); row.reloadNavigation = { status: reloaded?.status(), url: reloaded?.url() };
    await page.locator('[data-conquest-recap] [data-conquest-continue]').waitFor(); await page.evaluate(() => document.fonts.ready); await drain();
    row.reloaded = await snapshot(page, row, 'one-pick-recap-reload'); row.reloadedLines = (await page.locator('[data-conquest-recap] [data-recap-line]').allTextContents()).map(value => value.replace(/\s+/g, ' ').trim());
    await screenshot(page, row, 'recap-reload');
    row.continued = await touch(page, cdp, row, 'continue', 'REAL_CONTINUE_AFTER_RELOAD');
    await stableTarget(page, row, row.continued.actions.winners[0].key, 'NEXT_PREVIEW_PASSIVE_CAPTURE_STABILITY');
    await screenshot(page, row, 'next-preview');
    row.secondPick = row.continued.actions.winners[0].key.slice(7);
    await touch(page, cdp, row, 'winner:' + row.secondPick, 'SECOND_NATIVE_PREDICTION');
    row.second = await touch(page, cdp, row, 'play', 'SECOND_NATIVE_PLAY');
    const expected = oracle(row.day, row.firstPick, row.secondPick); write(row.id + '-oracle-second.json', expected); references.set(row.id, clone(expected));
    await screenshot(page, row, 'second-scene'); row.afterSecond = await fullDocument(page, row, 'second-settlement');
    row.oracle = expected; row.firstDocument = beforeReload; row.final = await snapshot(page, row, 'final-second-settlement');
  } catch (error) {
    localPrimary = error; row.failure = { name: error.name, message: error.message, stack: error.stack };
    if (page && !page.isClosed()) { try { await snapshot(page, row, 'failure-state'); await fullDocument(page, row, 'failure-document'); await screenshot(page, row, 'failure'); } catch (error) { row.cleanupErrors.push({ step: 'failure-capture', name: error.name, message: error.message }); } }
    write(row.id + '.partial.json', row);
  } finally {
    try { await drain(); } catch (error) { row.cleanupErrors.push({ step: 'handler-drain', name: error.name, message: error.message }); }
    try { if (context) await context.close(); } catch (error) { row.cleanupErrors.push({ step: 'context-close', name: error.name, message: error.message }); }
    await drain();
    row.consoleUnexpected = row.consoleErrors.filter(error => {
      if (blockedUrls.has(error.url) && /^Failed to load resource: net::ERR_FAILED/.test(error.text)) return false;
      const cors = error.text.match(/^Access to fetch at '([^']+)' from origin '([^']+)' has been blocked by CORS policy:/);
      return !(cors && blockedUrls.has(cors[1]) && cors[2] === BASE && /preflight|access control|Access-Control-Allow-Origin/i.test(error.text));
    });
    row.failedUnexpected = row.failedRequests.filter(error => !blockedUrls.has(error.url) || error.reason !== 'net::ERR_FAILED');
    row.completed = !localPrimary && row.cleanupErrors.length === 0; write(row.id + '.json', row); records.push(row);
  }
}
function evidence(row) {
  const initial = row.states[0], input = row.actions.map(value => {
    const state = row.states.find(state => state.label === value.before), target = action(state, value.kind);
    return { stage: value.stage, kind: value.kind, intended: value.intended, trustedPointerDownWitness: value.trustedPointerDownWitness, trustedPointerUpWitness: value.trustedPointerUpWitness, trustedClickWitness: value.trustedClickWitness,
      target: { rect: target.rect, disabled: target.disabled, hidden: target.hidden, inViewport: target.inViewport, unobstructed: target.unobstructed } };
  });
  return { id: row.id, completed: row.completed, day: row.day, mode: row.mode, offset: row.clockConfig.offset, viewport: initial.viewport, browser: initial.browser,
    clocks: row.states.map(state => ({ label: state.label, effectiveET: state.effectiveET, clock: state.followup.clock })), input, zero: row.zero,
    one: row.one, firstPick: row.firstPick, secondPick: row.secondPick,
    natural: { scene: row.natural.scene, recap: row.natural.recap, dailyLog: row.natural.dailyLog, lines: row.naturalLines, document: row.firstDocument, budget: row.naturalBudget },
    reload: { scene: row.reloaded.scene, recap: row.reloaded.recap, dailyLog: row.reloaded.dailyLog, lines: row.reloadedLines, documentBefore: row.natural.followup.documentId, documentAfter: row.reloaded.followup.documentId, navigationType: row.reloaded.followup.navigationType },
    continued: { scene: row.continued.scene, recap: row.continued.recap, dailyLog: row.continued.dailyLog, status: row.continued.statusText, options: row.continued.actions.winners.map(value => value.key.slice(7)) },
    second: { scene: row.second.scene, dailyLog: row.second.dailyLog, status: row.second.statusText, document: row.afterSecond },
    companion: { draws: row.oracle.draws, replayDraws: row.oracle.replayDraws, counts: row.oracle.counts, scope: row.oracle.scope },
    assets: row.assets, responses: row.responses, images: row.images,
    boundary: Object.fromEntries(['unexpected', 'pageErrors', 'consoleUnexpected', 'failedUnexpected', 'routeErrors', 'responseErrors', 'sockets', 'cleanupErrors'].map(name => [name, row[name]])) };
}
const checks = [
  ['CQ_CONTEXT', rows => {
    assert.deepEqual(rows.map(row => row.id), specs.map(row => row.id));
    for (const row of rows) { assert.equal(row.completed, true); assert.equal(row.viewport.width, 360); assert.equal(row.viewport.height, 664); assert.equal(row.viewport.visual.scale, 1); assert.equal(row.browser.dpr, 2); assert.equal(row.browser.locale, 'sr-RS'); assert.equal(row.browser.timezone, 'Europe/Belgrade'); assert(row.browser.touchPoints > 0); }
  }],
  ['CQ_CLOCK', rows => { for (const row of rows) {
    assert.equal(row.mode, row.id); if (row.mode === 'report-date') { assert.equal(row.day, '2026-10-31'); assert.notEqual(row.offset, 0); } else assert.equal(row.offset, 0);
    for (const value of row.clocks) {
      const c = value.clock; assert.equal(value.effectiveET, row.day); assert.equal(c.mode, row.mode); assert.equal(c.offset, row.offset); assert.equal(c.dateConstructorNative, row.mode === 'native-current');
      assert(c.exposed >= c.nativeBefore + row.offset && c.exposed <= c.nativeAfter + row.offset);
      assert(c.constructorNow >= c.constructorBefore + row.offset && c.constructorNow <= c.constructorAfter + row.offset);
      for (const flag of Object.values(c.nativeFlags)) assert.equal(flag, true);
    }
    for (let i = 1; i < row.clocks.length; i++) assert(row.clocks[i].clock.exposed >= row.clocks[i - 1].clock.exposed);
  } }],
  ['CQ_NATURAL_RECAP', rows => { for (const row of rows) {
    const reference = references.get(row.id); assert.equal(row.natural.scene, false); assert.equal(row.natural.recap, true); assert.equal(row.natural.document.dropped, false);
    const stream = row.natural.document.beats; assert.equal(row.natural.budget.actualSceneCount, reference.firstScenes.length);
    assert.equal(row.natural.document.events.filter(event => event.key === 'scene-skip' && event.trusted && ['click', 'keydown'].includes(event.type)).length, 0);
    for (const scene of reference.firstScenes) {
      const values = stream.filter(value => value.scene && value.index === scene.index); assert(values.length > 0);
      for (const beat of ['card', 'fight', 'score', ...(scene.flipped.length ? ['takeover'] : [])]) assert(values.some(value => value.beat === beat), 'Actual natural beat: ' + scene.index + '/' + beat);
      const score = values.find(value => value.beat === 'score'); assert.equal(score.home, scene.game.home); assert.equal(score.away, scene.game.away);
      assert.equal(score.score, `${scene.game.homeScore} to ${scene.game.awayScore}, FINAL${scene.game.overtime ? ` (${api.sport.score.tieBreakLabel})` : ''}`);
      for (const value of values) assert.equal(value.total, reference.firstScenes.length);
    }
    for (let i = 1; i < stream.length; i++) assert(stream[i].at >= stream[i - 1].at);
    assert.deepEqual(row.natural.lines, recapLines(reference.first)); assert.equal(row.natural.dailyLog.raw, row.one.raw);
  } }],
  ['CQ_RECAP_RELOAD', rows => { for (const row of rows) {
    assert.notEqual(row.reload.documentBefore, row.reload.documentAfter); assert.equal(row.reload.navigationType, 'reload'); assert.equal(row.reload.scene, false); assert.equal(row.reload.recap, true);
    assert.equal(row.reload.dailyLog.raw, row.one.raw); assert.deepEqual(row.reload.lines, row.natural.lines);
    assert.equal(row.reload.dailyLog.key, 'conquest-soccer-daily-' + row.day); assert.equal(row.reload.dailyLog.parsed.picks.length, 1);
  } }],
  ['CQ_NATIVE_CONTINUE', rows => { for (const row of rows) {
    const reference = references.get(row.id), calls = row.input.filter(value => value.kind === 'continue'); assert.equal(calls.length, 1);
    const value = calls[0]; assert(value.trustedPointerDownWitness && value.trustedPointerUpWitness && value.trustedClickWitness);
    assert.equal(value.target.disabled, false); assert.equal(value.target.hidden, false); assert.equal(value.target.inViewport, true); assert.equal(value.target.unobstructed, true); assert(value.target.rect.height >= 44);
    assert.equal(row.continued.scene, false); assert.equal(row.continued.recap, false); assert.equal(row.continued.dailyLog.raw, row.one.raw);
    assert.deepEqual(row.continued.options, api.featuredPairing(api.sport, reference.next)); assert.match(row.continued.status, /Matchday\s+2\s+of\s+10/); assert.match(row.continued.status, /Calls\s+\d+\/1\b/);
  } }],
  ['CQ_SECOND_MATCH', rows => { for (const row of rows) {
    const reference = references.get(row.id); assert.equal(row.second.scene, true); assert.match(row.second.status, /Calls\s+\d+\/2\b/);
    assert.deepEqual(row.second.dailyLog.parsed, { ...api.dailyRunRecord(reference.second), v: 1, date: row.day });
    assert.deepEqual(row.second.dailyLog.parsed.picks, [row.firstPick, row.secondPick]); assert.equal(row.second.dailyLog.key, 'conquest-soccer-daily-' + row.day);
    const first = row.second.document.beats.find(value => value.scene && Number.isInteger(value.index)); assert(first); const game = reference.second.lastRound.games[first.index]; assert(game); assert.equal(first.home, game.home); assert.equal(first.away, game.away);
    assert.equal(row.input.filter(value => value.kind === 'play').length, 2); assert.equal(row.second.document.dropped, false);
  } }],
  ['CQ_SHARED_DRAWS', rows => { for (const row of rows) {
    const r = references.get(row.id); assert.deepEqual(r.first, r.restored); assert.equal(r.counts.first, r.counts.restored); assert.deepEqual(r.draws, r.replayDraws.slice(0, r.counts.restored));
    assert(r.counts.start > 0 && r.counts.first > r.counts.start && r.counts.continued > r.counts.restored && r.counts.second > r.counts.continued);
    assert.deepEqual(row.companion.draws, r.draws); assert.deepEqual(row.companion.replayDraws, r.replayDraws); assert.deepEqual(row.companion.counts, r.counts);
    assert.equal(row.zero.parsed.team, 'ARS'); assert.deepEqual(row.zero.parsed.picks, []); assert.deepEqual(row.one.parsed, { ...api.dailyRunRecord(r.first), v: 1, date: row.day });
    assert.equal(row.companion.scope, 'Companion draw tapes only, not intercepted private browser RNG calls');
  } }],
  ['CQ_BOUNDARY', rows => { for (const row of rows) {
    for (const values of Object.values(row.boundary)) assert.deepEqual(values, []);
    for (const value of row.input.filter(value => value.kind !== 'continue')) assert(value.trustedPointerDownWitness && value.trustedPointerUpWitness && value.trustedClickWitness);
    assert(row.assets.some(value => value.kind === 'font')); assert(row.responses.some(value => value.url === BASE + ROUTE));
    for (const value of row.responses) { assert.equal(value.status, 200); assert.equal(value.sha256, value.expectedSha256); }
    assert.equal(row.images.length, 5); for (const image of row.images) assert.deepEqual(image.after, image.before);
  } }],
];
function validate(rows, selected = null) {
  for (const [marker, check] of checks) if (!selected || marker === selected) {
    try { check(rows); } catch (error) { if (!(error instanceof assert.AssertionError)) throw error; assert.fail(marker + ': ' + error.message); }
  }
}
function controls(rows) {
  const definitions = [
    ['viewport', 'CQ_CONTEXT', copy => { copy[0].viewport.width += 1; }],
    ['clock-mode', 'CQ_CLOCK', copy => { copy[1].clocks[0].clock.mode = 'wrong-mode'; }],
    ['skip', 'CQ_NATURAL_RECAP', copy => { copy[0].natural.document.events.push({ type: 'click', key: 'scene-skip', trusted: true }); }],
    ['reload-bytes', 'CQ_RECAP_RELOAD', copy => { copy[0].reload.dailyLog.raw += ' '; }],
    ['continue-input', 'CQ_NATIVE_CONTINUE', copy => { copy[0].input.find(value => value.kind === 'continue').trustedClickWitness = false; }],
    ['second-pick', 'CQ_SECOND_MATCH', copy => { copy[0].second.dailyLog.parsed.picks.pop(); }],
    ['draw', 'CQ_SHARED_DRAWS', copy => { copy[0].companion.draws[0] += .01; }],
    ['write', 'CQ_BOUNDARY', copy => { copy[0].boundary.unexpected.push({ method: 'POST', url: publicOrigin + '/rest/v1/game_completions' }); }],
  ];
  const results = [];
  for (const [id, marker, mutate] of definitions) {
    const changed = clone(rows); mutate(changed); assert.notDeepEqual(changed, rows); write('control-' + id + '-changed.json', changed);
    let refusal = null; try { validate(changed, marker); } catch (error) { refusal = error; }
    assert(refusal instanceof assert.AssertionError && refusal.message.startsWith(marker + ':'), 'Owned observation fault: ' + id);
    const restored = clone(rows); validate(restored); assert.deepEqual(restored, rows); write('control-' + id + '-restored.json', restored);
    const result = { id, marker, changed: true, ownedRefusal: true, restoredHealthy: true, originalSha256: sha(Buffer.from(JSON.stringify(rows))), changedSha256: sha(Buffer.from(JSON.stringify(changed))), restoredSha256: sha(Buffer.from(JSON.stringify(restored))), refusal: { name: refusal.name, message: refusal.message } };
    write('control-' + id + '.json', result); results.push(result);
  }
  assert.equal(results.length, 8); return results;
}
try {
  await prepare();
  server = http.createServer((_request, response) => { response.writeHead(410); response.end('Only held intercepted assets are served'); });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); }); BASE = 'http://127.0.0.1:' + server.address().port;
  browser = await pw.chromium.launch({ headless: true }); write('browser.json', { version: browser.version(), sourceCommit: process.env.GITHUB_SHA });
  for (const spec of specs) await collect(spec);
  write('observations.json', records);
  const failure = records.find(row => row.failure)?.failure; if (failure) throw Object.assign(new Error(failure.message), failure);
  const rows = records.map(evidence); write('guard-observations.json', rows); validate(rows); const controlled = controls(rows);
  summary = { schema: 1, sourceCommit: process.env.GITHUB_SHA, contextsAttempted: attempted.length, contextsCompleted: records.filter(row => row.completed).length, healthyContexts: records.length,
    modes: records.map(row => row.mode), controls: controlled.length, restored: controlled.filter(row => row.restoredHealthy).length, originalPngs: records.reduce((n, row) => n + row.images.length, 0), nativeReloads: records.filter(row => row.reloaded).length, nativeActions: records.reduce((n, row) => n + row.actions.length, 0),
    scope: 'Actual PR449 App, first natural scene completion, recap reload, native Continue and second Play. Current native clock and separate advancing Date-only report-date lab. No physical Android, original unknown save, full run, calibration, private browser draw interception, integration or publication claim.', runtimeCounters: null, runtimeCounterCompleteness: 'UNKNOWN' };
} catch (error) { primary = error; }
finally {
  try { if (browser) await browser.close(); } catch (error) { secondary.push({ step: 'browser-close', name: error.name, message: error.message }); }
  try { if (server?.listening) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())); } catch (error) { secondary.push({ step: 'server-close', name: error.name, message: error.message }); }
  try {
    for (const [file, body] of held) assert.deepEqual(fs.readFileSync(path.join(ROOT, file)), body, 'Source held: ' + file);
    for (const [file, body] of graphHolds) assert.deepEqual(fs.readFileSync(file), body, 'Actual oracle input/bundle held: ' + file);
    const current = new Map(); tree(path.join(ROOT, 'dist'), current); assert.equal(current.size, assets.size);
    for (const [file, body] of current) assert.deepEqual(body, assets.get('/' + path.relative(path.join(ROOT, 'dist'), file).replaceAll('\\', '/'))?.body, 'Completed dist held: ' + file);
    write('source-after.json', [...held].map(([file, body]) => ({ file, bytes: body.length, sha256: sha(body), gitBlob: blob(body) })));
    write('oracle-held.json', [...graphHolds].map(([file, body]) => ({ file, bytes: body.length, sha256: sha(body) })));
    write('dist-after.json', [...assets].map(([file, row]) => ({ file, bytes: row.body.length, sha256: row.sha256 })));
  } catch (error) { secondary.push({ step: 'held-inputs', name: error.name, message: error.message, stack: error.stack }); }
  write('receipt.json', { schema: 1, completed: !primary && secondary.length === 0, attempted, contextsCompleted: records.filter(row => row.completed).length, healthyContexts: summary?.healthyContexts ?? 0, primary: primary ? { name: primary.name, message: primary.message, stack: primary.stack } : null, secondary, runtimeCounters: null, runtimeCounterCompleteness: 'UNKNOWN' });
  if (summary) write('summary.json', { ...summary, completed: !primary && secondary.length === 0 });
}
if (primary) console.error(primary.stack || primary.message);
for (const error of secondary) console.error(JSON.stringify(error));
if (primary || secondary.length) process.exitCode = 1;
else console.log(JSON.stringify(summary));
