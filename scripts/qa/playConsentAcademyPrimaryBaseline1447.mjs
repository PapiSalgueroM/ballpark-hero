/* Private1447 Academy-primary baseline. Adopt at scripts/qa/ only after source review.
   Observes actual first-visit dialogs and trusted actions. No application CSS edits. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { chromium } from '../lib/playwrightLoader.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DIST = path.join(ROOT, 'dist'), BASE = process.env.BASE || 'http://127.0.0.1:4173';
const SOURCE = process.env.SOURCE_SHA || process.env.GITHUB_SHA;
const OUT = path.resolve(process.env.CONSENT_DIALOG_OUT || path.join(ROOT, 'consent-dialog1447-academy-browser'));
const BACKEND = 'https://flawuiqbvjobmkfkauhw.supabase.co', KEY = 'cookie-consent-v2';
const sha = value => createHash('sha256').update(value).digest('hex');
const failure = error => ({ name: error.name, message: error.message, stack: error.stack });
const write = (name, value) => fs.writeFileSync(path.join(OUT, name), typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value, null, 2) + '\n');
const surfaces = [
  { id: 'academy', route: '/stadium-tycoon', h1: 'STADIUM TYCOON', dialog: 'How Wonderkid Factory works', kind: 'academy-static', primary: "Let's go", reopen: 'How it works' },
];
const profiles = [{ width: 320, height: 640 }, { width: 390, height: 844 }, { width: 1280, height: 900 }];
const planned = surfaces.flatMap(surface => profiles.map(profile => ({ ...surface, ...profile, caseId: surface.id + '-' + profile.width })));
const sourceFiles = ['src/App.tsx', 'src/index.css', 'src/components/CookieConsent.tsx', 'src/lib/consentPreferences.ts',
  'src/pages/StadiumTycoon.tsx', 'src/components/tycoon/AcademyPanel.tsx', 'src/hooks/useStadiumTycoon.ts', 'src/hooks/useWonderkidFactory.ts',
  'src/lib/stadiumTycoon.ts', 'src/lib/wonderkidFactory.ts', 'src/lib/tycoonRewards.ts', 'src/hooks/useTycoonRewards.ts', 'src/lib/tycoonRooms.ts', 'src/hooks/useRevealScroll.ts',
  'scripts/lib/offlineTransport.cjs', 'scripts/lib/hostLikeServer.mjs', 'scripts/lib/playwrightLoader.mjs', 'package.json', 'package-lock.json'];
const report = { v: 1, source: SOURCE, phase: 'academy-baseline', status: 'RUNNING', complete: false, healthy: false, plannedCases: planned.length,
  cases: [], errors: [], transportPredicateControls: [], classificationControls: [], primaryGeometryControls: [], fontControls: [], holds: {},
  scope: 'Three fresh-context Academy help journeys only, reached through actual Stadium close and Academy tab. Unexpected failures remain failures. No CSS/DOM repair, save fixture, purchase, progress or gameplay.' };
let browser, fonts, fontManifest, staticFiles, deadline;
fs.mkdirSync(OUT, { recursive: true });
const bounded = (limit = 3000) => { const left = deadline - Date.now(); assert(left > 0, 'DIALOG1447_BUDGET: overall driver deadline'); return Math.max(1, Math.min(limit, left)); };
const sourceHold = () => sourceFiles.map(file => ({ file, bytes: fs.statSync(path.join(ROOT, file)).size, sha256: sha(fs.readFileSync(path.join(ROOT, file))) }))
  .concat([{ file: 'driver', bytes: fs.statSync(fileURLToPath(import.meta.url)).size, sha256: sha(fs.readFileSync(fileURLToPath(import.meta.url))) }]);
const dialog = (page, spec) => page.getByRole('dialog', { name: spec.dialog, exact: true });
const region = page => page.getByRole('region', { name: 'Cookie choices', exact: true });
const frames = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
function inventory(directory, relative = '') {
  const rows = [];
  for (const name of fs.readdirSync(path.join(directory, relative)).sort()) {
    const child = relative ? relative + '/' + name : name;
    const stat = fs.lstatSync(path.join(directory, child));
    assert(!stat.isSymbolicLink(), 'COOKIE_SETUP: no symbolic node in completed dist');
    if (stat.isDirectory()) rows.push(...inventory(directory, child));
    else { assert(stat.isFile(), 'COOKIE_SETUP: regular completed dist files only'); rows.push({ file: child, bytes: stat.size, sha256: sha(fs.readFileSync(path.join(directory, child))) }); }
  }
  return rows;
}
function staticRequest(url, method) {
  assert.equal(url.origin, BASE, 'COOKIE_TRANSPORT: exact loopback origin');
  assert(!url.username && !url.password && !url.search && !url.hash, 'COOKIE_TRANSPORT: no credentials/query/fragment');
  assert(['GET', 'HEAD'].includes(method), 'COOKIE_TRANSPORT: static GET/HEAD only');
  assert(!/^\/(?:rest|auth|functions|storage)\//.test(url.pathname), 'COOKIE_TRANSPORT: no backend path');
  assert(['/', '/stadium-tycoon'].includes(url.pathname) || staticFiles.has(url.pathname), 'COOKIE_TRANSPORT: fixed page or exact completed-dist file');
}
function predicateControls() {
  staticRequest(new URL(BASE + '/'), 'GET');
  for (const [name, href, method] of [
    ['foreign-origin', 'https://example.com/', 'GET'], ['credential', BASE.replace('://', '://fixture:fixture@') + '/', 'GET'],
    ['query', BASE + '/?private=fixture', 'GET'], ['write-method', BASE + '/', 'POST'],
    ['backend-path', BASE + '/rest/v1/profiles', 'GET'], ['unknown-file', BASE + '/assets/nonexistent-cookie1446.js', 'GET'],
  ]) {
    const before = JSON.stringify({ href: BASE + '/', method: 'GET' }), after = JSON.stringify({ href, method });
    assert.notEqual(before, after);
    let caught;
    try { staticRequest(new URL(href), method); } catch (error) { caught = error; }
    assert(caught?.name === 'AssertionError' && caught.message.startsWith('COOKIE_TRANSPORT:'), 'COOKIE_SETUP: ineffective/wrong transport predicate control');
    report.transportPredicateControls.push({ name, beforeSha256: sha(before), afterSha256: sha(after), error: failure(caught), networkAttempted: false });
  }
}
function shellFixture(request, url) {
  if (url.origin !== BACKEND || url.username || url.password || url.hash) return null;
  if (request.method() === 'POST' && url.pathname === '/rest/v1/rpc/most_played_today' && !url.search) {
    const body = request.postData(), parsed = JSON.parse(body || 'null');
    if (parsed && Object.keys(parsed).sort().join('|') === 'p_limit|p_min' && parsed.p_min === 3 && parsed.p_limit === 3)
      return { id: 'source-most-played-today-3-3', body: '[]', requestBodySha256: sha(body) };
  }
  if (request.method() === 'GET' && url.pathname === '/rest/v1/live_scores') {
    const q = url.searchParams, times = q.getAll('start_at');
    if ([...q.keys()].sort().join('|') === 'limit|order|select|start_at|start_at' && q.get('select') === '*'
      && q.get('order') === 'start_at.asc' && q.get('limit') === '150' && times.length === 2
      && /^gte\.\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(times[0])
      && /^lte\.\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(times[1])
      && Date.parse(times[1].slice(4)) - Date.parse(times[0].slice(4)) === 32 * 3600 * 1000)
      return { id: 'source-live-scores-12h-20h-limit150', body: '[]', date: new Date(Date.parse(times[0].slice(4)) + 12 * 3600 * 1000).toUTCString() };
  }
  return null;
}
function observe(spec) {
  if (location.origin !== spec.base) return;
  const name = node => node?.getAttribute('aria-label') || (node?.getAttribute('aria-labelledby') || '').split(/\s+/).filter(Boolean).map(id => document.getElementById(id)?.textContent || '').join(' ').trim() || node?.textContent?.replace(/\s+/g, ' ').trim() || '';
  const describe = node => node ? { tag: node.tagName, role: node.getAttribute('role'), label: name(node).slice(0, 120), id: node.id, class: typeof node.className === 'string' ? node.className.slice(0, 400) : null } : null;
  const rect = node => { if (!node) return null; const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, top: r.top, right: r.right, bottom: r.bottom, left: r.left, width: r.width, height: r.height }; };
  const css = node => { if (!node) return null; const s = getComputedStyle(node); return { position: s.position, top: s.top, bottom: s.bottom, transform: s.transform, maxHeight: s.maxHeight, overflowX: s.overflowX, overflowY: s.overflowY, fontFamily: s.fontFamily, pointerEvents: s.pointerEvents, display: s.display, visibility: s.visibility }; };
  const nodeIds = new WeakMap(); let nextNodeId = 0;
  const identity = node => { if (!nodeIds.has(node)) nodeIds.set(node, ++nextNodeId); return nodeIds.get(node); };
  const liveDialog = () => [...document.querySelectorAll('[role="dialog"]')].find(node => name(node) === spec.dialog) || null;
  const liveRegion = () => [...document.querySelectorAll('[role="region"]')].find(node => node.getAttribute('aria-label') === 'Cookie choices') || null;
  const button = (root, label) => root ? [...root.querySelectorAll('button')].find(node => name(node) === label) || null : null;
  const ancestors = node => { const rows = []; for (let at = node?.parentElement; at && rows.length < 10; at = at.parentElement) rows.push({ ...describe(at), rect: rect(at), css: css(at), clientHeight: at.clientHeight, scrollHeight: at.scrollHeight, scrollTop: at.scrollTop }); return rows; };
  const state = { initialStorage: null, initialStorageError: null, rows: [], events: [], overflow: false, stable: 0, stopped: false, last: '' };
  try { state.initialStorage = Object.keys(localStorage).sort(); } catch (error) { state.initialStorageError = { name: error.name, message: error.message }; }
  function snapshot(detailed = false) {
    const d = liveDialog(), b = liveRegion(), card = spec.kind === 'idle' ? d?.firstElementChild : d;
    const target = label => {
      const node = button(label === 'Reject all' ? b : d, label), r = rect(node);
      if (!r) return { exists: false };
      const x = r.x + r.width / 2, y = r.y + r.height / 2, hit = x >= 0 && y >= 0 && x < innerWidth && y < innerHeight ? document.elementFromPoint(x, y) : null;
      const br = rect(b), overlap = br ? Math.max(0, Math.min(r.right, br.right) - Math.max(r.left, br.left)) * Math.max(0, Math.min(r.bottom, br.bottom) - Math.max(r.top, br.top)) : 0;
      return { exists: true, nodeId: identity(node), rect: r, center: { x, y }, centerInViewport: x >= 0 && y >= 0 && x < innerWidth && y < innerHeight,
        hit: describe(hit), hitIsTarget: !!hit && node.contains(hit), hitIsCookieRegion: !!hit && !!b?.contains(hit), overlapArea: overlap,
        ...(detailed ? { css: css(node), ancestors: ancestors(node) } : {}) };
    };
    const help = document.querySelector('[data-dukb-help-cookie-choices]');
    const result = { ms: performance.now(), pending: document.body?.getAttribute('data-consent-pending') ?? null,
      consentHeight: document.body?.style.getPropertyValue('--dukb-consent-height') || '', embedded: !!b && !!help?.isConnected && help.contains(b),
      regionParent: describe(b?.parentElement), dialog: rect(d), card: rect(card), banner: rect(b), bannerPosition: b ? getComputedStyle(b).position : null,
      targets: Object.fromEntries([spec.primary, 'Reject all'].map(label => [label, target(label)])),
      scroll: { x: scrollX, y: scrollY, dialog: d?.scrollTop ?? null, card: card?.scrollTop ?? null }, focus: describe(document.activeElement) };
    if (detailed) Object.assign(result, { actualViewport: { innerWidth, innerHeight, devicePixelRatio, visual: visualViewport ? { width: visualViewport.width, height: visualViewport.height, offsetTop: visualViewport.offsetTop, offsetLeft: visualViewport.offsetLeft, scale: visualViewport.scale } : null },
      documentWidth: document.documentElement.scrollWidth, bodyWidth: document.body?.scrollWidth, computedConsentHeight: document.body ? getComputedStyle(document.body).getPropertyValue('--dukb-consent-height') : '',
      dialogCSS: css(d), cardCSS: css(card), bannerCSS: css(b), dialogAncestors: ancestors(d),
      cardScroll: card ? { top: card.scrollTop, height: card.scrollHeight, clientHeight: card.clientHeight } : null,
      fonts: { status: document.fonts.status, inter: document.fonts.check('16px Inter'), display: document.fonts.check('16px "Space Grotesk"'), faces: [...document.fonts].map(face => ({ family: face.family, status: face.status })) } });
    return result;
  }
  function tick() {
    if (state.stopped) return;
    if (state.rows.length >= 3000) { state.overflow = true; return; }
    const row = snapshot(), signature = JSON.stringify({ dialog: row.dialog, card: row.card, banner: row.banner, pending: row.pending, height: row.consentHeight, embedded: row.embedded, scroll: row.scroll });
    state.stable = signature === state.last ? state.stable + 1 : 0; state.last = signature; state.rows.push(row); requestAnimationFrame(tick);
  }
  for (const event of ['pointerdown', 'pointerup', 'click', 'wheel', 'scroll', 'focusin']) addEventListener(event, value => {
    if (state.events.length >= 2048) { state.overflow = true; return; }
    const target = value.target instanceof Element ? value.target.closest('button') || value.target : null;
    state.events.push({ ms: performance.now(), type: event, isTrusted: value.isTrusted, target: describe(target), dataRoom: target?.getAttribute('data-room') || null,
      ...(event === 'click' && target instanceof HTMLButtonElement && name(target) === spec.primary ? { primaryNodeId: identity(target), primarySnapshot: snapshot(true) } : {}) });
  }, true);
  window.__consentDialog1447 = { state, snapshot, cardHit: (x, y) => { const d = liveDialog(), card = spec.kind === 'idle' ? d?.firstElementChild : d, at = document.elementFromPoint(x, y); return !!card && !!at && card.contains(at); } }; requestAnimationFrame(tick);
}
function ownedInterception(proof) {
  const blocked = frame => frame?.pending === '1' && !frame.embedded && frame.bannerPosition === 'fixed'
    && frame.target?.exists && frame.target.nodeId === proof.targetId && frame.target.hitIsCookieRegion === true && frame.target.overlapArea > 0;
  return proof.foundationPassed === true && proof.clickAttempted === true && proof.dialogRemains === true
    && Number.isSafeInteger(proof.targetId) && proof.targetId > 0
    && proof.error?.name === 'TimeoutError' && /intercepts pointer events/i.test(proof.error.message)
    && blocked(proof.after) && proof.frames.some(blocked);
}
function classificationControls(proof, caseId, action) {
  assert(ownedInterception(proof), 'DIALOG1447_CONTROL: actual owned failure required');
  const alternatives = [
    ['missing-banner-hit', { ...proof, frames: proof.frames.map(frame => ({ ...frame, target: { ...frame.target, hitIsCookieRegion: false } })) }],
    ['missing-final-banner-hit', { ...proof, after: { ...proof.after, target: { ...proof.after.target, hitIsCookieRegion: false } } }],
    ['different-final-button', { ...proof, after: { ...proof.after, target: { ...proof.after.target, nodeId: proof.targetId + 1 } } }],
    ['wrong-error', { ...proof, error: { name: 'Error', message: 'CONTROL_UNRELATED_ERROR' } }],
    ['dialog-already-closed', { ...proof, dialogRemains: false }],
  ];
  for (const [name, changed] of alternatives) {
    const beforeSha256 = sha(JSON.stringify(proof)), afterSha256 = sha(JSON.stringify(changed)); assert.notEqual(beforeSha256, afterSha256);
    assert.equal(ownedInterception(changed), false, 'DIALOG1447_CONTROL: unrelated evidence refused');
    report.classificationControls.push({ caseId, action, name, beforeSha256, afterSha256, classificationRefused: true, networkAttempted: false });
  }
}
function verifyPrimaryGeometry(proof) {
  const { target, card, viewport } = proof;
  assert(target?.exists && Number.isSafeInteger(proof.targetId) && proof.targetId > 0 && target.nodeId === proof.targetId, 'RADIX1447_PRIMARY_TARGET: same actual primary node');
  assert.equal(target.centerInViewport, true, 'RADIX1447_PRIMARY_VIEWPORT: actual primary center is in viewport');
  assert.equal(target.hitIsTarget, true, 'RADIX1447_PRIMARY_HIT: actual primary receives center hit');
  assert(target.hitIsCookieRegion === false && target.overlapArea === 0, 'RADIX1447_PRIMARY_COOKIE: primary is clear of cookie region');
  assert(card && target.rect.top >= Math.max(0, card.top) && target.rect.bottom <= Math.min(viewport.height, card.bottom)
    && target.rect.left >= Math.max(0, card.left) && target.rect.right <= Math.min(viewport.width, card.right), 'RADIX1447_PRIMARY_CLIP: full primary is inside visible dialog and viewport');
}
function primaryGeometryControls(proof, caseId, phase) {
  verifyPrimaryGeometry(proof);
  const target = change => ({ ...proof, target: { ...proof.target, ...change } });
  const alternatives = [
    ['different-primary', target({ nodeId: proof.targetId + 1 })],
    ['center-outside-viewport', target({ centerInViewport: false })],
    ['center-blocked', target({ hitIsTarget: false })],
    ['cookie-hit', target({ hitIsCookieRegion: true })],
    ['cookie-overlap', target({ overlapArea: 1 })],
    ['above-dialog', target({ rect: { ...proof.target.rect, top: Math.max(0, proof.card.top) - 1 } })],
    ['below-dialog', target({ rect: { ...proof.target.rect, bottom: Math.min(proof.viewport.height, proof.card.bottom) + 1 } })],
    ['left-of-dialog', target({ rect: { ...proof.target.rect, left: Math.max(0, proof.card.left) - 1 } })],
    ['right-of-dialog', target({ rect: { ...proof.target.rect, right: Math.min(proof.viewport.width, proof.card.right) + 1 } })],
    ['missing-dialog', { ...proof, card: null }],
  ];
  for (const [name, changed] of alternatives) {
    const beforeSha256 = sha(JSON.stringify(proof)), afterSha256 = sha(JSON.stringify(changed)); assert.notEqual(beforeSha256, afterSha256);
    let caught; try { verifyPrimaryGeometry(changed); } catch (error) { caught = error; }
    assert(caught?.name === 'AssertionError' && caught.message.startsWith('RADIX1447_PRIMARY_'), 'RADIX1447_CONTROL: effective owned geometry refusal');
    report.primaryGeometryControls.push({ caseId, phase, name, beforeSha256, afterSha256, error: failure(caught), geometryRefused: true, networkAttempted: false });
  }
}
async function snapshot(page) { return page.evaluate(() => window.__consentDialog1447.snapshot(true)); }
async function mark(view, phase) {
  const detail = await snapshot(view.page); view.row.snapshots.push({ phase, detail });
  write(view.row.id + '-' + phase + '.html', await view.page.content());
  await view.page.screenshot({ path: path.join(OUT, view.row.id + '-' + phase + '.png'), fullPage: false, animations: 'allow', timeout: bounded(5000) });
  return detail;
}
function clean(row) {
  assert.deepEqual(row.blocked, [], 'DIALOG1447_SETUP: unknown or denied requests');
  assert.deepEqual(row.pageErrors, [], 'DIALOG1447_SETUP: page errors');
  assert.deepEqual(row.consoleErrors, [], 'DIALOG1447_SETUP: console errors');
  assert(row.http.every(value => value.status < 400), 'DIALOG1447_SETUP: HTTP error');
}
function verifyFontFaces(fonts) {
  const loaded = new Set(fonts.faces.filter(face => face.status === 'loaded').map(face => face.family.replace(/['"]/g, '')));
  assert(fonts.status === 'loaded' && fonts.inter && fonts.display && loaded.has('Inter') && loaded.has('Space Grotesk'), 'DIALOG1447_SETUP: actual loaded Inter and Space Grotesk faces');
}
function fontFaceControls(fonts, caseId) {
  verifyFontFaces(fonts);
  for (const family of ['Inter', 'Space Grotesk']) {
    const changed = { ...fonts, faces: fonts.faces.map(face => face.family.replace(/['"]/g, '') === family ? { ...face, status: 'unloaded' } : face) };
    const beforeSha256 = sha(JSON.stringify(fonts)), afterSha256 = sha(JSON.stringify(changed)); assert.notEqual(beforeSha256, afterSha256);
    assert.throws(() => verifyFontFaces(changed), error => error.name === 'AssertionError' && error.message.startsWith('DIALOG1447_SETUP: actual loaded Inter and Space Grotesk faces'));
    report.fontControls.push({ caseId, family, beforeSha256, afterSha256, absenceRejectedDespiteCheckTrue: true, networkAttempted: false });
  }
}
async function settled(view) {
  const { page, spec } = view;
  await dialog(page, spec).waitFor({ state: 'visible', timeout: bounded(4500) });
  assert.equal(await dialog(page, spec).count(), 1, 'DIALOG1447_SETUP: unique named help dialog');
  await page.waitForFunction(() => document.fonts.status === 'loaded' && window.__consentDialog1447?.state.stable >= 6, null, { timeout: bounded(4500) });
  const detail = await snapshot(page);
  verifyFontFaces(detail.fonts);
    assert.equal(await region(page).count(), 1, 'DIALOG1447_SETUP: single visible cookie region');
    assert(await region(page).isVisible(), 'DIALOG1447_SETUP: cookie region visible');
    if (spec.kind === 'radix') {
      assert.equal(detail.embedded, true, 'DIALOG1447_SETUP: Front Office consent portal settled inside help');
      assert.equal(detail.pending, null, 'DIALOG1447_SETUP: embedded consent removes pending flag');
      assert.equal(detail.consentHeight, '', 'DIALOG1447_SETUP: embedded consent removes body height property');
    } else {
      assert.equal(detail.pending, '1', 'DIALOG1447_SETUP: real pending attribute active');
      assert(detail.consentHeight, 'DIALOG1447_SETUP: actual measured banner height');
      assert.equal(detail.embedded, false, 'DIALOG1447_SETUP: fixed region is not embedded');
      assert.equal(detail.bannerPosition, 'fixed', 'DIALOG1447_SETUP: actual fixed cookie region');
    }
  clean(view.row); return detail;
}
async function reopen(view) {
  const target = view.page.locator('[data-academy-panel]').getByRole('button', { name: view.spec.reopen, exact: true });
  assert.equal(await target.count(), 1, 'DIALOG1447_SETUP: unique real reopen control');
  await target.click({ timeout: bounded() }); return settled(view);
}
async function wheelToTarget(view, label) {
  const before = await snapshot(view.page), target = before.targets[label], card = before.card;
  if (!target?.exists || !card || (target.rect.top >= card.top && target.rect.bottom <= card.bottom)) return;
  const top = Math.max(0, card.top), bottom = Math.min(view.spec.height, card.bottom, before.embedded ? view.spec.height : before.banner?.top ?? view.spec.height);
  if (bottom <= top || card.width <= 0) { view.row.wheels.push({ label, attempted: false, reason: 'no visible card interval above fixed region', before }); return; }
  const x = Math.max(1, Math.min(view.spec.width - 1, card.x + card.width / 2)), y = top + (bottom - top) / 2;
  const hit = await view.page.evaluate(({ x, y }) => window.__consentDialog1447.cardHit(x, y), { x, y });
  if (!hit) { view.row.wheels.push({ label, attempted: false, reason: 'actual scroll point does not hit card', before }); return; }
  await view.page.mouse.move(x, y); await view.page.mouse.wheel(0, (target.rect.top < card.top ? -1 : 1) * Math.max(card.height, before.cardScroll?.height || 0)); await frames(view.page);
  view.row.wheels.push({ label, attempted: true, x, y, before, after: await snapshot(view.page) });
}
async function dismiss(view, label, phase) {
  const { page, spec, row } = view, action = { label, phase, attempted: false, status: 'UNCLASSIFIED' };
  row.actions.push(action); await wheelToTarget(view, label); action.before = await snapshot(page);
  const target = dialog(page, spec).getByRole('button', { name: label, exact: true });
  assert.equal(await target.count(), 1, 'RADIX1447_SETUP: unique real primary');
  action.startMs = await page.evaluate(() => performance.now()); action.attempted = true;
  try { await target.click({ timeout: bounded() }); }
  catch (error) { action.error = failure(error); }
  action.endMs = await page.evaluate(() => performance.now());
  if (!action.error) {
    try { await dialog(page, spec).waitFor({ state: 'hidden', timeout: bounded(2000) }); }
    catch (error) { action.error = failure(error); }
  }
  await frames(page); action.after = await snapshot(page); action.dialogRemains = await dialog(page, spec).count() === 1 && await dialog(page, spec).isVisible();
  const observation = await page.evaluate(() => window.__consentDialog1447.state);
  const targetId = action.before.targets[label]?.nodeId;
  action.attemptFrames = observation.rows.filter(frame => frame.ms >= action.startMs && frame.ms <= action.endMs).map(frame => ({ ms: frame.ms, pending: frame.pending, embedded: frame.embedded, bannerPosition: frame.bannerPosition, target: frame.targets[label] }));
  if (action.error || action.dialogRemains) {
    action.status = 'FAILED_ACTION';
    action.interceptionProof = { foundationPassed: row.foundation.status === 'PASS', clickAttempted: action.attempted, dialogRemains: action.dialogRemains, error: action.error, targetId,
      after: { ms: action.after.ms, pending: action.after.pending, embedded: action.after.embedded, bannerPosition: action.after.bannerPosition, target: action.after.targets[label] }, frames: action.attemptFrames };
    if (phase.startsWith('pending') && ownedInterception(action.interceptionProof)) {
      try { assert.fail('ACADEMY1447_FIXED_BANNER_INTERCEPTION: ' + row.id + ': ' + label); } catch (error) { action.ownedAssertion = failure(error); }
      classificationControls(action.interceptionProof, row.id, label);
    }
    return action;
  }
  try {
    const delivered = observation.events.find(event => event.type === 'click' && event.isTrusted === true && event.target?.label === label
      && event.primaryNodeId === targetId && event.ms >= action.startMs && event.ms <= action.endMs);
    assert(delivered?.primarySnapshot, 'RADIX1447_OUTCOME: delivered trusted same-node primary click');
    action.trustedClick = true; action.deliveredClick = delivered;
    action.geometryProof = { targetId, target: delivered.primarySnapshot.targets[label], card: delivered.primarySnapshot.card, viewport: { width: spec.width, height: spec.height } };
    verifyPrimaryGeometry(action.geometryProof); primaryGeometryControls(action.geometryProof, row.id, phase);
    if (phase.startsWith('pending')) assert(await region(page).isVisible(), 'RADIX1447_OUTCOME: primary keeps unanswered cookie region');
    action.status = 'PASS';
  } catch (error) { action.outcomeError = failure(error); action.status = 'FAILED_ACTION'; }
  return action;
}
async function walk(spec) {
  const row = { id: spec.caseId, route: spec.route, configuredViewport: { width: spec.width, height: spec.height }, contextCreated: false, complete: false,
    foundation: { status: 'FAIL' }, actions: [], wheels: [], snapshots: [], allowedRequests: [], cachedFonts: [], knownFixtures: [], blocked: [], http: [], cssResponses: [], pageErrors: [], consoleErrors: [] };
  report.cases.push(row); let context, view, page; const responseReads = [];
  try {
    bounded(); context = await browser.newContext({ viewport: { width: spec.width, height: spec.height }, deviceScaleFactor: 1,
      isMobile: spec.width < 600, hasTouch: spec.width < 600, reducedMotion: 'no-preference', serviceWorkers: 'block' }); row.contextCreated = true;
    await context.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url());
      row.attemptedRequests = (row.attemptedRequests || 0) + 1;
      try {
        assert(row.attemptedRequests <= 2048, 'DIALOG1447_SETUP: bounded2048requests per context');
        if (url.origin === BASE) {
          staticRequest(url, request.method()); row.allowedRequests.push({ method: request.method(), path: url.pathname, resourceType: request.resourceType() }); return await route.continue();
        }
        if (request.method() === 'GET' && fonts.has(url.href)) {
          const font = fonts.get(url.href); row.cachedFonts.push({ url: url.href, resourceType: request.resourceType(), sha256: font.sha256, manifestSha256: sha(fontManifest) });
          return await route.fulfill({ status: 200, contentType: font.contentType, body: font.body });
        }
        const fixture = shellFixture(request, url);
        if (fixture) {
          row.knownFixtures.push({ id: fixture.id, method: request.method(), origin: url.origin, path: url.pathname, query: url.search,
            requestBodySha256: fixture.requestBodySha256, responseSha256: sha(fixture.body), forwarded: false });
          return await route.fulfill({ status: 200, contentType: 'application/json', body: fixture.body, headers: { 'access-control-allow-origin': '*', ...(fixture.date ? { date: fixture.date } : {}) } });
        }
        row.blocked.push({ method: request.method(), origin: url.origin, path: url.pathname, reason: 'not exact static/font/source shell fixture' }); await route.abort('blockedbyclient');
      } catch (error) { row.blocked.push({ method: request.method(), origin: url.origin, path: url.pathname, error: failure(error) }); await route.abort('blockedbyclient'); }
    });
    await context.routeWebSocket('**/*', async socket => { row.blocked.push({ transport: 'websocket', reason: 'Original proof has no socket fixture' }); try { await socket.close(); } catch (error) { row.blocked.push({ transport: 'websocket', error: failure(error) }); } });
    await context.addInitScript(observe, { ...spec, base: BASE });
    page = await context.newPage(); page.setDefaultTimeout(4500); view = { row, page, spec };
    page.on('pageerror', error => row.pageErrors.push(failure(error)));
    page.on('console', message => { if (message.type() === 'error') row.consoleErrors.push(message.text()); });
    page.on('response', response => {
      const url = new URL(response.url()); if (url.origin !== BASE) return;
      row.http.push({ method: response.request().method(), path: url.pathname, status: response.status() });
      if (url.pathname.endsWith('.css') && response.request().method() === 'GET') responseReads.push((async () => {
        const body = await response.body(), expected = staticFiles.get(url.pathname); assert(expected && sha(body) === expected.sha256, 'DIALOG1447_SETUP: actual served CSS equals completed dist');
        const file = 'served-css-' + sha(body) + '.css'; write(file, body); row.cssResponses.push({ path: url.pathname, status: response.status(), bytes: body.length, sha256: sha(body), file });
      })().catch(error => { row.responseError = failure(error); }));
    });
    await page.goto(BASE + spec.route, { waitUntil: 'domcontentloaded', timeout: bounded(20000) });
    await page.getByRole('heading', { name: spec.h1, exact: true }).waitFor({ timeout: bounded(5000) });
    assert.equal(new URL(page.url()).pathname, spec.route, 'DIALOG1447_SETUP: exact route');
    assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), 'https://douknowball.com' + spec.route, 'DIALOG1447_SETUP: own route canonical');
    const initial = await page.evaluate(() => ({ keys: window.__consentDialog1447?.state.initialStorage, error: window.__consentDialog1447?.state.initialStorageError }));
    assert.deepEqual(initial, { keys: [], error: null }, 'DIALOG1447_SETUP: genuine fresh storage before application boot'); row.initialStorage = initial;
    await region(page).waitFor({ state: 'visible', timeout: bounded(5000) });
    const stadiumHelp = page.getByRole('dialog', { name: 'How Stadium Tycoon works', exact: true });
    await stadiumHelp.waitFor({ state: 'visible', timeout: bounded(4500) }); assert.equal(await stadiumHelp.count(), 1, 'ACADEMY1447_ENTRY: actual fresh Stadium rules');
    const initialClose = stadiumHelp.getByRole('button', { name: 'Close the rules', exact: true }); assert.equal(await initialClose.count(), 1, 'ACADEMY1447_ENTRY: unique real initial close');
    row.entryNavigation = { status: 'RUNNING', initialDialog: 'How Stadium Tycoon works', initialClose: 'Close the rules', initialCloseRect: await initialClose.boundingBox(), cookieChoiceBefore: await page.evaluate(key => localStorage.getItem(key), KEY) };
    assert.equal(row.entryNavigation.cookieChoiceBefore, null, 'ACADEMY1447_ENTRY: cookie choice stays unanswered'); await mark(view, 'entry-stadium-help');
    row.entryNavigation.closeStartedMs = await page.evaluate(() => performance.now()); await initialClose.click({ timeout: bounded() }); await stadiumHelp.waitFor({ state: 'hidden', timeout: bounded() });
    row.entryNavigation.closeEndedMs = await page.evaluate(() => performance.now());
    const tab = page.locator('button[data-room="academy"]'); assert.equal(await tab.count(), 1, 'ACADEMY1447_ENTRY: source-bound unique Academy tab');assert(await tab.isEnabled(), 'ACADEMY1447_ENTRY: Academy tab has no progress lock');
    row.entryNavigation.tabStartedMs = await page.evaluate(() => performance.now()); await tab.click({ timeout: bounded() });
    await page.waitForFunction(() => document.querySelector('button[data-room="academy"]')?.getAttribute('aria-pressed') === 'true', null, { timeout: bounded() });
    await page.locator('[data-academy-panel]').waitFor({ state: 'visible', timeout: bounded(4500) }); await dialog(page, spec).waitFor({ state: 'visible', timeout: bounded(4500) });
    row.entryNavigation.tabEndedMs = await page.evaluate(() => performance.now());const entryEvents = await page.evaluate(() => window.__consentDialog1447.state.events);
    row.entryNavigation.trustedInitialClose = entryEvents.some(event => event.type === 'click' && event.isTrusted === true && event.target?.label === 'Close the rules' && event.ms >= row.entryNavigation.closeStartedMs && event.ms <= row.entryNavigation.closeEndedMs);
    row.entryNavigation.trustedAcademyTab = entryEvents.some(event => event.type === 'click' && event.isTrusted === true && event.dataRoom === 'academy' && event.ms >= row.entryNavigation.tabStartedMs && event.ms <= row.entryNavigation.tabEndedMs);
    row.entryNavigation.room = await tab.getAttribute('data-room');row.entryNavigation.pressed = await tab.getAttribute('aria-pressed');row.entryNavigation.cookieChoiceAfter = await page.evaluate(key => localStorage.getItem(key), KEY);
    assert.equal(row.entryNavigation.trustedInitialClose, true, 'ACADEMY1447_ENTRY: delivered trusted Stadium close');assert.equal(row.entryNavigation.trustedAcademyTab, true, 'ACADEMY1447_ENTRY: delivered trusted Academy tab');assert.equal(row.entryNavigation.cookieChoiceAfter, null, 'ACADEMY1447_ENTRY: no fabricated consent answer');
    row.entryNavigation.status = 'PASS'; await mark(view, 'opening');
    const detail = await settled(view); await Promise.allSettled(responseReads); if (row.responseError) throw new Error('DIALOG1447_SETUP: actual CSS response capture failed: ' + row.responseError.message);
    assert.equal(page.viewportSize().width, spec.width); assert.equal(page.viewportSize().height, spec.height);
    assert(Math.abs(detail.actualViewport.innerWidth - spec.width) <= 2 && detail.documentWidth <= spec.width + 2 && detail.bodyWidth <= spec.width + 2,
      'DIALOG1447_SETUP: viewport identity and no unrelated sideways overflow');
    assert(row.cachedFonts.some(font => font.resourceType === 'stylesheet') && row.cachedFonts.some(font => font.resourceType === 'font'), 'DIALOG1447_SETUP: actual cached stylesheet and font used');
    assert(row.cssResponses.length > 0, 'DIALOG1447_SETUP: actual completed stylesheet response retained');
    fontFaceControls(detail.fonts, row.id); row.foundation = { status: 'PASS', detail, initialStorage: initial }; await mark(view, 'settled');
    const primary = await dismiss(view, spec.primary, 'pending-first');
    if (primary.status === 'PASS') {
      await reopen(view); const repeated = await dismiss(view, spec.primary, 'pending-reopened');
      if (repeated.status === 'PASS') await reopen(view);
    } else row.actions.push({ phase: 'pending-reopened', label: spec.primary, attempted: false, status: 'NOT_ATTEMPTED', reason: 'first primary did not pass; retain actual failure for independent rejection leg' });
    if (!await dialog(page, spec).isVisible()) await reopen(view);
    const reject = region(page).getByRole('button', { name: 'Reject all', exact: true }); assert.equal(await reject.count(), 1, 'DIALOG1447_BANNER: real unique Reject all');
    row.bannerLeg = { status: 'UNCLASSIFIED', before: await snapshot(page), startedMs: await page.evaluate(() => performance.now()) };
    await reject.click({ timeout: bounded() }); await region(page).waitFor({ state: 'hidden', timeout: bounded() });
    await page.waitForFunction(() => !document.body.hasAttribute('data-consent-pending') && !document.body.style.getPropertyValue('--dukb-consent-height'), null, { timeout: bounded() });
    const choice = await page.evaluate(key => JSON.parse(localStorage.getItem(key) || 'null'), KEY);
    assert(choice?.version === 2 && choice.advertising === false && choice.analytics === false, 'DIALOG1447_BANNER: actual saved rejection');
    assert(await dialog(page, spec).isVisible(), 'DIALOG1447_BANNER: rejection keeps the same game help open');
    const bannerEnd = await page.evaluate(() => performance.now()), bannerEvents = await page.evaluate(() => window.__consentDialog1447.state.events);
    const trustedReject = bannerEvents.some(event => event.type === 'click' && event.isTrusted === true && event.target?.label === 'Reject all' && event.ms >= row.bannerLeg.startedMs && event.ms <= bannerEnd);
    assert.equal(trustedReject, true, 'DIALOG1447_BANNER: delivered trusted rejection');
    row.bannerLeg = { ...row.bannerLeg, status: 'PASS', choice, endedMs: bannerEnd, trustedReject, after: await mark(view, 'answered') };
    await dismiss(view, spec.primary, 'answered'); await mark(view, 'completed');
    row.complete = row.actions.every(action => ['PASS', 'FAILED_ACTION', 'NOT_ATTEMPTED'].includes(action.status)) && row.bannerLeg.status === 'PASS';
  } catch (error) { row.error = failure(error); }
  finally {
    if (page) {
      try { const observed = await page.evaluate(() => { const observer = window.__consentDialog1447; if (!observer) return null; observer.state.stopped = true; return observer.state; });
        row.observerOverflow = observed?.overflow ?? true; write(row.id + '-observations.json', observed); if (row.observerOverflow) row.complete = false;
      } catch (error) { row.collectionError = failure(error); row.complete = false; }
    }
    const reads = await Promise.allSettled(responseReads); if (reads.some(result => result.status === 'rejected') || row.responseError) row.complete = false;
    try { clean(row); } catch (error) { row.finalError = failure(error); row.complete = false; }
    try { if (context) await context.close(); } catch (error) { row.closeError = failure(error); row.complete = false; }
    row.status = !row.complete ? 'UNCLASSIFIED' : row.actions.some(action => action.status === 'FAILED_ACTION') ? 'OBSERVED_FAILURE' : 'PASS';
    write('report.json', report);
  }
}
try {
  assert.equal(BASE, 'http://127.0.0.1:4173', 'DIALOG1447_SETUP: exact loopback server'); assert.match(SOURCE || '', /^[a-f0-9]{40}$/, 'DIALOG1447_SETUP: source pin required');
  assert.equal(fs.readdirSync(OUT).length, 0, 'DIALOG1447_SETUP: fresh output directory'); deadline = Date.now() + 5 * 60000;
  const preload = path.join(ROOT, 'scripts/lib/offlineTransport.cjs');
  assert.equal((process.env.NODE_OPTIONS || '').trim().split(/\s+/)[0], '--require=' + preload, 'DIALOG1447_SETUP: offline preload must be first');
  assert(process.env.SIM_OFFLINE_RECEIPT && fs.existsSync(process.env.SIM_OFFLINE_RECEIPT), 'DIALOG1447_SETUP: existing offline receipt');
  assert.equal(fs.statSync(process.env.SIM_OFFLINE_RECEIPT).size, 0, 'DIALOG1447_SETUP: no previous transport refusal');
  report.holds.before = sourceHold(); const before = inventory(DIST); assert(before.length > 100, 'DIALOG1447_SETUP: completed production dist');
  staticFiles = new Map(before.map(row => ['/' + row.file, row])); report.holds.distBefore = { files: before.length, sha256: sha(JSON.stringify(before)) };
  write('dist-before.sha256', before.map(row => row.sha256 + '  ' + row.file).join('\n') + '\n');
  assert(process.env.FREE_KICK_FONT_CACHE, 'DIALOG1447_SETUP: exact prefetched font cache');
  fontManifest = fs.readFileSync(path.join(process.env.FREE_KICK_FONT_CACHE, 'manifest.json'));
  assert.match(process.env.FONT_CACHE_MANIFEST_SHA256 || '', /^[a-f0-9]{64}$/, 'DIALOG1447_SETUP: font manifest pin required');
  assert.equal(sha(fontManifest), process.env.FONT_CACHE_MANIFEST_SHA256, 'DIALOG1447_SETUP: expected font manifest');
  fonts = new Map(JSON.parse(fontManifest).map(row => {
    const url = new URL(row.url);
    assert(url.protocol === 'https:' && ['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname) && !url.username && !url.password, 'COOKIE_SETUP: exact font provider fixture');
    const file = path.resolve(process.env.FREE_KICK_FONT_CACHE, row.file);
    assert(file.startsWith(path.resolve(process.env.FREE_KICK_FONT_CACHE) + path.sep), 'COOKIE_SETUP: body stays in font cache');
    const body = fs.readFileSync(file); assert.equal(sha(body), row.sha256, 'COOKIE_SETUP: cached font body SHA');
    return [row.url, { ...row, file, body }];
  }));
  assert.equal(fonts.size, JSON.parse(fontManifest).length, 'DIALOG1447_SETUP: no duplicate font fixture URL'); assert(fonts.size > 0);
  predicateControls(); browser = await chromium.launch({ headless: true });
  for (const spec of planned) await walk(spec);
} catch (error) { report.errors.push(failure(error)); }
finally {
  try { if (browser) await browser.close(); } catch (error) { report.errors.push(failure(error)); }
  try {
    report.holds.after = sourceHold(); assert.deepEqual(report.holds.after, report.holds.before, 'DIALOG1447_HOLD: source unchanged');
    const after = inventory(DIST); write('dist-after.sha256', after.map(row => row.sha256 + '  ' + row.file).join('\n') + '\n');
    report.holds.distAfter = { files: after.length, sha256: sha(JSON.stringify(after)) }; assert.deepEqual(report.holds.distAfter, report.holds.distBefore, 'DIALOG1447_HOLD: complete dist unchanged');
    for (const font of fonts?.values() || []) assert.equal(sha(fs.readFileSync(font.file)), font.sha256, 'DIALOG1447_HOLD: cached font unchanged');
    assert.equal(sha(fs.readFileSync(path.join(process.env.FREE_KICK_FONT_CACHE, 'manifest.json'))), sha(fontManifest), 'DIALOG1447_HOLD: font manifest unchanged');
    assert.equal(fs.statSync(process.env.SIM_OFFLINE_RECEIPT).size, 0, 'DIALOG1447_HOLD: no actual offline transport attempts'); report.holds.unchanged = true;
  } catch (error) { report.errors.push(failure(error)); }
  report.actualContexts = report.cases.filter(row => row.contextCreated).length; report.actualCompleteCases = report.cases.filter(row => row.complete).length;
  report.actualFailures = report.cases.flatMap(row => row.actions.filter(action => action.status === 'FAILED_ACTION').map(action => ({ caseId: row.id, label: action.label, phase: action.phase, actualError: action.error, outcomeError: action.outcomeError, ownedAssertion: action.ownedAssertion, dialogRemains: action.dialogRemains })));
  report.unclassifiedCases = report.cases.filter(row => !row.complete).map(row => row.id);
  report.actualPassedCases = report.cases.filter(row => row.status === 'PASS').length; report.actualFailedCases = report.cases.filter(row => row.status === 'OBSERVED_FAILURE').length;
  report.complete = report.errors.length === 0 && report.holds.unchanged === true && report.cases.length === planned.length && report.actualContexts === planned.length && report.actualCompleteCases === planned.length;
  report.healthy = report.complete && report.actualPassedCases === planned.length && report.actualFailures.length === 0;
  report.status = !report.complete ? 'INCOMPLETE_OR_UNCLASSIFIED' : report.healthy ? 'PASS' : 'BASELINE_FAILURES_OBSERVED';
  report.exit = report.status === 'PASS' ? 0 : report.status === 'BASELINE_FAILURES_OBSERVED' ? 1 : 3;
  write('report.json', report);
  const files = fs.readdirSync(OUT).filter(name => name !== 'evidence.sha256').sort();
  assert(files.every(name => fs.lstatSync(path.join(OUT, name)).isFile() && !fs.lstatSync(path.join(OUT, name)).isSymbolicLink()), 'DIALOG1447_EVIDENCE: flat regular files only');
  write('evidence.sha256', files.map(name => sha(fs.readFileSync(path.join(OUT, name))) + '  ' + name).join('\n') + '\n');
}
console.log('CONSENT_DIALOG1447_ACADEMY_BASELINE ' + JSON.stringify({ status: report.status, complete: report.complete, healthy: report.healthy, planned: planned.length, actualContexts: report.actualContexts,
  completeCases: report.actualCompleteCases, passedCases: report.actualPassedCases, failedCases: report.actualFailedCases, failedActions: report.actualFailures.length, unclassified: report.unclassifiedCases, errors: report.errors.length, holds: report.holds.unchanged }));
process.exitCode = report.exit;
