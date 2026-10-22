/* Private source candidate. Future location: scripts/qa/measureHomeDiscovery1449.mjs.
   Measurements only. No product qualification, CSS repair or real account access. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { chromium } from '../lib/playwrightLoader.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DIST = path.join(ROOT, 'dist'), BASE = process.env.BASE || 'http://127.0.0.1:4173';
const SOURCE = process.env.SOURCE_SHA || process.env.GITHUB_SHA;
const OUT = path.resolve(process.env.MEASUREMENT1449_OUT || path.join(ROOT, 'home-hub1449-measurement'));
const BACKEND = 'https://flawuiqbvjobmkfkauhw.supabase.co', KEY = 'cookie-consent-v2';
const USER = '00000000-0000-4000-8000-000000000129', HEADING = 'Free sports games';
const ADAPTER_SHA = '4991cda9d702e461051857df7ab2b3cbf9544c059b9a412455fc41db53645519';
const sha = value => createHash('sha256').update(value).digest('hex');
const failure = error => ({ name: error.name, message: error.message, stack: error.stack });
const write = (name, value) => fs.writeFileSync(path.join(OUT, name), typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value, null, 2) + '\n');
const widths = [{ width: 320, height: 780 }, { width: 328, height: 780 }, { width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1280, height: 900 }];
const planned = [
  ...widths.flatMap(size => ['dark', 'light'].flatMap(theme => [false, true].map(auth => ({ ...size, route: '/', h1: HEADING, theme, auth })))),
  ...['/soccer', '/pro-basketball'].flatMap(route => widths.filter(size => size.width !== 768).flatMap(size => ['dark', 'light'].map(theme => ({ ...size, route, h1: route === '/soccer' ? 'Soccer Games' : 'NBA Basketball Games', theme, auth: false })))),
].map(spec => ({ ...spec, id: (spec.route === '/' ? 'home' : spec.route.slice(1)) + '-' + (spec.auth ? 'auth' : 'guest') + '-' + spec.theme + '-' + spec.width }));
const sourceFiles = ['src/pages/Index.tsx', 'src/data/homeCopy.ts', 'src/index.css', 'src/App.tsx', 'src/lib/sportHub.ts', 'src/pages/SportHub.tsx',
  'src/components/hub/HubExperience.tsx', 'src/components/hub/HubExperience.module.css', 'src/lib/theme.ts', 'src/components/CookieConsent.tsx',
  'src/lib/consentPreferences.ts', 'src/contexts/AuthContext.tsx', 'src/hooks/useStreaks.ts', 'src/lib/completions.ts', 'src/integrations/supabase/client.ts',
  'src/components/home/PollOfTheDay.tsx', 'src/lib/dateUtils.ts',
  'scripts/lib/offlineTransport.cjs', 'scripts/lib/hostLikeServer.mjs', 'scripts/lib/playwrightLoader.mjs', 'scripts/playHomeFold.mjs', 'package.json', 'package-lock.json', 'index.html'];
const report = { v: 1, source: SOURCE, status: 'RUNNING', applicationQualified: false, complete: false,
  planned: { contexts: 36, normalSnapshots: 56, headingExtraSnapshots: 12, snapshots: 68 }, cases: [], errors: [],
  transportPredicateControls: [], fixturePredicateControls: [], fontControls: [], recordControls: [], holds: {},
  scope: 'Three routes, explicit initial viewports and two presets. Every main control retains its source index and client rects; detailed control and hit measurements cover every positive-area owner intersecting the viewport, not offscreen controls. Synthetic account and flagless poll only. Unsupported paint stays unresolved. Hit samples do not prove navigation.' };
let browser, staticFiles, fonts, cacheBefore, adapter, before, deadline, firstControls = false;
assert.equal(path.dirname(OUT), ROOT, 'MEASURE1449_SETUP: direct-root artifact directory');
assert.match(path.basename(OUT), /^home-hub1449-[a-z0-9-]+$/);
fs.mkdirSync(OUT, { recursive: true });
assert.equal(fs.readdirSync(OUT).length, 0, 'MEASURE1449_SETUP: fresh output, preserve any existing evidence');
const bounded = () => { const left = deadline - Date.now(); assert(left > 0, 'MEASURE1449_BUDGET: eight minute deadline'); return left; };
async function limit(label, action, ceiling = 5000, cleanup = false) {
  let timer; const ms = cleanup ? ceiling : Math.max(1, Math.min(ceiling, bounded()));
  try { return await Promise.race([action(), new Promise((resolve, reject) => { timer = setTimeout(() => reject(new Error('MEASURE1449_TIMEOUT: ' + label)), ms); })]); }
  finally { clearTimeout(timer); }
}
const sourceHold = () => sourceFiles.map(file => ({ file, bytes: fs.statSync(path.join(ROOT, file)).size, sha256: sha(fs.readFileSync(path.join(ROOT, file))) }))
  .concat([{ file: 'probe', sha256: sha(fs.readFileSync(fileURLToPath(import.meta.url))) }, { file: 'font-preload', sha256: sha(fs.readFileSync(adapter)) }]);
const etDay = value => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
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
  assert(['/', '/soccer', '/pro-basketball'].includes(url.pathname) || staticFiles.has(url.pathname), 'COOKIE_TRANSPORT: fixed page or exact completed-dist file');
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
const POLL_SELECT = 'poll_key,question,option_a,option_a_emoji,option_a_flag,option_b,option_b_emoji,option_b_flag,option_c,option_c_emoji,option_c_flag,option_d,option_d_emoji,option_d_flag,sort_order';
const POLL_BODY = JSON.stringify([{ poll_key: 'measurement1449-local-only', question: 'Local browser fixture only',
  option_a: 'Choice A', option_a_emoji: '', option_a_flag: '', option_b: 'Choice B', option_b_emoji: '', option_b_flag: '',
  option_c: null, option_c_emoji: '', option_c_flag: '', option_d: null, option_d_emoji: '', option_d_flag: '', sort_order: 1 }]);
function pollFixture(request, url, spec) {
  if (spec.route !== '/' || url.origin !== BACKEND || url.username || url.password || url.hash || request.method() !== 'GET' || request.postData() !== null || url.pathname !== '/rest/v1/daily_polls') return null;
  const q = url.searchParams;
  if ([...q.keys()].sort().join('|') !== 'order|poll_date|select' || q.get('select') !== POLL_SELECT || q.get('poll_date') !== 'eq.' + spec.pollDay || q.get('order') !== 'sort_order.asc') return null;
  return { id: 'source-home-daily-poll', body: POLL_BODY, pollDay: spec.pollDay };
}
function pollFixtureControls() {
  const spec = { route: '/', pollDay: '2026-10-21' }, q = new URLSearchParams({ select: POLL_SELECT, poll_date: 'eq.' + spec.pollDay, order: 'sort_order.asc' }), href = BACKEND + '/rest/v1/daily_polls?' + q;
  const request = (method = 'GET', body = null) => ({ method: () => method, postData: () => body });
  assert.equal(pollFixture(request(), new URL(href), spec)?.id, 'source-home-daily-poll');
  for (const [name, changed] of [
    ['poll-select', { href: href.replace(encodeURIComponent(POLL_SELECT), '*') }],
    ['poll-extra-query', { href: href + '&limit=1' }],
    ['poll-order', { href: href.replace('sort_order.asc', 'sort_order.desc') }],
    ['poll-duplicate-query', { href: href + '&order=sort_order.asc' }],
    ['poll-day', { href: href.replace('eq.2026-10-21', 'eq.2026-10-20') }],
    ['poll-path', { href: href.replace('/daily_polls?', '/poll_votes?') }],
    ['poll-route', { route: '/soccer' }],
    ['poll-method', { method: 'POST' }],
    ['poll-body', { body: '{}' }],
  ]) {
    const baseline = { href, method: 'GET', body: null, route: spec.route }, mutant = { ...baseline, ...changed };
    const beforeSha256 = sha(JSON.stringify(baseline)), afterSha256 = sha(JSON.stringify(mutant)); assert.notEqual(beforeSha256, afterSha256);
    assert.equal(pollFixture(request(mutant.method, mutant.body), new URL(mutant.href), { ...spec, route: mutant.route }), null, 'MEASURE1449_POLL_FIXTURE: refuse changed ' + name);
    report.fixturePredicateControls.push({ name, beforeSha256, afterSha256, refused: true, networkAttempted: false });
  }
}
function personalFixture(request, url, spec) {
  if (!spec.auth || url.origin !== BACKEND || url.username || url.password || url.hash) return null;
  const method = request.method(), body = request.postData(), q = url.searchParams;
  if (method === 'POST' && url.pathname === '/rest/v1/rpc/global_rank' && !url.search) {
    const parsed = JSON.parse(body || 'null');
    if (parsed && Object.keys(parsed).sort().join('|') === 'p_games|p_period|p_player' && parsed.p_player === 'Harness' && parsed.p_period === 'alltime' && parsed.p_games === null)
      return { id: 'local-rank', body: '[{"total_points":98765,"rank":12345}]', requestBodySha256: sha(body) };
  }
  if (method !== 'GET' || body !== null) return null;
  const keys = [...q.keys()].sort().join('|');
  if (url.pathname === '/rest/v1/profiles' && keys === 'select|user_id' && q.get('select') === '*' && q.get('user_id') === 'eq.' + USER)
    return { id: 'local-profile', body: JSON.stringify([{ id: '00000000-0000-4000-8000-000000000672', user_id: USER, username: 'harness', display_name: 'Harness', avatar_url: null, streak_state: null, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' }]) };
  if (url.pathname === '/rest/v1/game_completions' && keys === 'completed_on|player_name|select' && q.get('select') === 'game' && q.get('player_name') === 'eq.Harness' && q.get('completed_on') === 'eq.' + spec.utcDay)
    return { id: 'local-completions', body: '[]' };
  if (url.pathname === '/rest/v1/user_best_scores' && keys === 'select|user_id' && q.get('select') === 'game_type,best_score' && q.get('user_id') === 'eq.' + USER)
    return { id: 'local-best-scores', body: '[]' };
  return null;
}
function fixtureControls() {
  const spec = { auth: true, utcDay: '2026-10-22' }, href = BACKEND + '/rest/v1/user_best_scores?select=game_type%2Cbest_score&user_id=eq.' + USER;
  const request = (method = 'GET', body = null) => ({ method: () => method, postData: () => body });
  assert.equal(personalFixture(request(), new URL(href), spec)?.id, 'local-best-scores');
  for (const [name, url, method, body] of [
    ['foreign-user', href.replace(USER, '00000000-0000-4000-8000-000000000130'), 'GET', null], ['extra-query', href + '&limit=1', 'GET', null],
    ['wrong-select', href.replace('game_type%2Cbest_score', '*'), 'GET', null], ['write', href, 'POST', '{}'], ['body', href, 'GET', '{}'],
    ['auth-endpoint', BACKEND + '/auth/v1/user', 'GET', null],
  ]) {
    const before = { href, method: 'GET', body: null }, changed = { href: url, method, body };
    assert.notEqual(sha(JSON.stringify(before)), sha(JSON.stringify(changed)));
    assert.equal(personalFixture(request(method, body), new URL(url), spec), null, 'MEASURE1449_FIXTURE: refuse changed personal read');
    report.fixturePredicateControls.push({ name, beforeSha256: sha(JSON.stringify(before)), afterSha256: sha(JSON.stringify(changed)), refused: true, networkAttempted: false });
  }
  for (const [name, url, method, body, changedUrl, changedBody, id] of [
    ['profile-identity', BACKEND + '/rest/v1/profiles?select=*&user_id=eq.' + USER, 'GET', null, BACKEND + '/rest/v1/profiles?select=*&user_id=eq.other', null, 'local-profile'],
    ['rank-identity', BACKEND + '/rest/v1/rpc/global_rank', 'POST', '{"p_player":"Harness","p_period":"alltime","p_games":null}', BACKEND + '/rest/v1/rpc/global_rank', '{"p_player":"Other","p_period":"alltime","p_games":null}', 'local-rank'],
    ['completion-day', BACKEND + '/rest/v1/game_completions?select=game&player_name=eq.Harness&completed_on=eq.2026-10-22', 'GET', null, BACKEND + '/rest/v1/game_completions?select=game&player_name=eq.Harness&completed_on=eq.2026-10-21', null, 'local-completions'],
  ]) {
    const before = { url, method, body }, changed = { url: changedUrl, method, body: changedBody };
    assert.equal(personalFixture(request(method, body), new URL(url), spec)?.id, id);
    assert.notEqual(sha(JSON.stringify(before)), sha(JSON.stringify(changed)));
    assert.equal(personalFixture(request(method, changedBody), new URL(changedUrl), spec), null, 'MEASURE1449_FIXTURE: exact source identity/date');
    report.fixturePredicateControls.push({ name, beforeSha256: sha(JSON.stringify(before)), afterSha256: sha(JSON.stringify(changed)), refused: true, networkAttempted: false });
  }
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
function solidContrast(paint) {
  const reasons = [], effect = style => {
    for (const key of ['backgroundImage', 'filter', 'backdropFilter']) if (style[key] && style[key] !== 'none') reasons.push(key);
    if (Number(style.opacity) !== 1 || style.mixBlendMode !== 'normal' || style.backgroundBlendMode !== 'normal') reasons.push('opacity-or-blend');
    if (style.boxShadow !== 'none') reasons.push('ancestor-box-shadow');
    if (!['auto', 'none'].includes(style.clip) || style.clipPath !== 'none') reasons.push('ancestor-clip-shape');
  };
  let background = [0, 0, 0, 0];
  try {
    for (const layer of paint.layers) {
      effect(layer.style); background = over(rgba(layer.style.backgroundColor), background);
      if (paint.rects.some(box => ['hidden', 'clip', 'auto', 'scroll'].includes(layer.style.overflowX) && (box.x < layer.client.x || box.right > layer.client.right) || ['hidden', 'clip', 'auto', 'scroll'].includes(layer.style.overflowY) && (box.y < layer.client.y || box.bottom > layer.client.bottom))) reasons.push('actual-ancestor-clipping');
      for (const pseudo of layer.pseudos) if (!['none', 'normal'].includes(pseudo.content)) {
        const color = rgba(pseudo.backgroundColor), borders = ['Top', 'Right', 'Bottom', 'Left'].some(side => parseFloat(pseudo['border' + side + 'Width']) > 0 && rgba(pseudo['border' + side + 'Color'])[3] > 0);
        if (!['""', "''"].includes(pseudo.content) || color[3] > 0 || borders || pseudo.backgroundImage !== 'none' || pseudo.boxShadow !== 'none' || pseudo.filter !== 'none') reasons.push('painted-pseudo');
      }
    }
    if (paint.overlaps.length) reasons.push('intersecting-image-or-svg');
    if (paint.occluders.some(cover => paint.rects.some(box => box.x < cover.right && box.right > cover.x && box.y < cover.bottom && box.bottom > cover.y))) reasons.push('pending-consent-occlusion');
    if (background[3] !== 1) reasons.push('no-observed-opaque-base');
    const style = paint.style; effect(style);
    if (style.textShadow !== 'none' || parseFloat(style.webkitTextStrokeWidth || '0') !== 0 || (style.webkitTextFillColor && style.webkitTextFillColor !== style.color)) reasons.push('text-paint');
    if (reasons.length) return { status: 'unresolved', ratio: null, reasons: [...new Set(reasons)] };
    const foreground = rgba(style.color), effectiveForeground = over(foreground, background), foregroundLuminance = luminance(effectiveForeground), backgroundLuminance = luminance(background);
    const ratio = (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) / (Math.min(foregroundLuminance, backgroundLuminance) + 0.05);
    const large = parseFloat(style.fontSize) >= 24 || (parseFloat(style.fontSize) >= 18.6666666667 && Number(style.fontWeight) >= 700), threshold = large ? 3 : 4.5;
    return { status: 'resolved-solid', ratio, foreground, background, effectiveForeground, foregroundLuminance, backgroundLuminance, large, threshold, belowThreshold: ratio < threshold };
  } catch (error) { return { status: 'unresolved', ratio: null, reasons: ['unsupported-color-or-paint'], detail: error.message }; }
}
function wholeControl(record, nodes) {
  assert(record.measureKind === 'element-control' && record.rectSource === 'control.getClientRects' && record.boxOwnerMatchesControl, 'MEASURE1449_CONTROL: control element owns bounds, not label range');
  const owner = nodes.find(node => node.id === record.node);
  assert(owner && ['A', 'BUTTON'].includes(owner.tag), 'MEASURE1449_CONTROL: independently captured control node');
  assert.deepEqual(record.rects, owner.rects, 'MEASURE1449_CONTROL: measured bounds equal independent owner-node client rects');
}
function completeViewportControls(sample) {
  const scope = sample.controlScope, screen = { x: 0, y: 0, right: sample.viewport.innerWidth, bottom: sample.viewport.innerHeight };
  const intersects = box => box.width > 0 && box.height > 0 && box.x < screen.right && box.right > screen.x && box.y < screen.bottom && box.bottom > screen.y;
  assert(scope?.kind === 'all-positive-area-viewport-owner-client-rects' && scope.matchedCount === scope.sources.length && scope.sources.every((owner, index) => owner.sourceIndex === index), 'MEASURE1449_CONTROL_COVERAGE: complete indexed source geometry');
  const expected = scope.sources.filter(owner => owner.rects.some(intersects)).map(owner => owner.sourceIndex), actual = sample.controls.map(control => control.sourceIndex);
  assert.deepEqual(actual, expected, 'MEASURE1449_CONTROL_COVERAGE: every viewport-intersecting owner exactly once');
  assert(scope.selectedCount === expected.length && scope.offscreenCount === scope.matchedCount - expected.length && expected.length <= 400, 'MEASURE1449_CONTROL_COVERAGE: exact counts, selected ceiling and no truncation');
  for (const control of sample.controls) assert.deepEqual(control.rects, scope.sources[control.sourceIndex].rects, 'MEASURE1449_CONTROL_COVERAGE: selected owner keeps original source client rects');
}
function foundation(sample, spec, expectedText) {
  assert.equal(sample.viewport.innerWidth, spec.width, 'MEASURE1449_SETUP: actual viewport width');
  assert.equal(sample.viewport.innerHeight, spec.height, 'MEASURE1449_SETUP: actual viewport height');
  assert.equal(sample.theme.light, spec.theme === 'light', 'MEASURE1449_SETUP: actual root theme');
  assert.equal(sample.theme.stored, spec.theme === 'light' ? 'light' : null, 'MEASURE1449_SETUP: preset theme storage');
  assert.equal(sample.theme.tokens.background.trim(), spec.theme === 'light' ? '210 20% 98%' : '225 25% 6%', 'MEASURE1449_SETUP: computed theme background');
  assert.equal(sample.h1Count, 1, 'MEASURE1449_SETUP: unique app H1');
  assert.equal(sample.heading.text.trim(), expectedText, 'MEASURE1449_SETUP: full actual H1 text');
  assert.equal(sample.heading.sameNode, true, 'MEASURE1449_SETUP: same actual app H1');
  assert(sample.firstPlayable?.href?.startsWith('/'), 'MEASURE1449_SETUP: actual playable link');
  if (spec.auth) { assert.equal(sample.seededLocalUserId, USER, 'MEASURE1449_SETUP: same seeded local account'); assert.equal(sample.stats.length, 3, 'MEASURE1449_SETUP: exactly three synthetic chips'); assert.deepEqual(Object.fromEntries(sample.stats.map(chip => [chip.label, chip.value])), { 'Days in a row:': '365', 'Played today:': '106', 'World rank:': '#12,345' }, 'MEASURE1449_SETUP: all three real displayed synthetic chips'); for (const chip of sample.stats) { const value = sample.nodes.find(node => node.id === chip.valueNode); assert(value.rect.width > 0 && value.rect.height > 0 && value.style.display !== 'none' && value.style.visibility === 'visible' && Number(value.style.opacity) > 0, 'MEASURE1449_SETUP: displayed chip value, units may be hidden'); } }
  else { assert.equal(sample.seededLocalUserId, null, 'MEASURE1449_SETUP: actual guest local session'); assert.equal(sample.stats.length, 0, 'MEASURE1449_SETUP: guest has no signed-in chips'); }
  verifyFontFaces(sample.fonts); completeViewportControls(sample); sample.controls.forEach(control => wholeControl(control, sample.nodes));
}
function recordControls(sample, spec) {
  const save = (name, before, changed, evaluator, check) => {
    const beforeSha256 = sha(JSON.stringify(before)), afterSha256 = sha(JSON.stringify(changed)); assert.notEqual(beforeSha256, afterSha256);
    const outcome = evaluator(changed); assert(check(outcome), 'MEASURE1449_CONTROL: effective changed-record ' + name);
    report.recordControls.push({ name, caseId: spec.id, beforeSha256, afterSha256, outcome, networkAttempted: false });
  };
  const reject = changed => { try { foundation(changed, spec, spec.h1); } catch (error) { return failure(error); } return null; };
  save('wrong-viewport', sample, { ...sample, viewport: { ...sample.viewport, innerWidth: spec.width + 1 } }, reject, result => result?.name === 'AssertionError' && result.message.startsWith('MEASURE1449_SETUP: actual viewport width'));
  save('wrong-theme', sample, { ...sample, theme: { ...sample.theme, light: !sample.theme.light } }, reject, result => result?.name === 'AssertionError' && result.message.startsWith('MEASURE1449_SETUP: actual root theme'));
  const control = sample.controls.find(item => item.labelRects.length && JSON.stringify(item.labelRects) !== JSON.stringify(item.rects)); assert(control, 'MEASURE1449_CONTROL: actual padded control has different label bounds');
  save('label-is-not-whole-control', control, { ...control, rects: control.labelRects }, changed => { try { wholeControl(changed, sample.nodes); } catch (error) { return failure(error); } return null; }, result => result?.name === 'AssertionError' && result.message.startsWith('MEASURE1449_CONTROL: measured bounds equal independent owner-node client rects'));
  assert(sample.controls.length > 0, 'MEASURE1449_CONTROL: actual viewport owner for omission control');
  const omitted = { ...sample, controls: sample.controls.slice(1) };
  assert.equal(sha(JSON.stringify(omitted.controlScope)), sha(JSON.stringify(sample.controlScope)), 'MEASURE1449_CONTROL: omission keeps all source geometry and counts');
  save('missing-viewport-owner', sample, omitted, changed => { try { completeViewportControls(changed); } catch (error) { return failure(error); } return null; }, result => result?.name === 'AssertionError' && result.message.startsWith('MEASURE1449_CONTROL_COVERAGE: every viewport-intersecting owner exactly once'));
  const paint = sample.textPaint.find(item => item.contrast.status === 'resolved-solid'); assert(paint, 'MEASURE1449_CONTROL: one actual resolvable solid text record');
  const beforePaint = paint.input, opaque = 'rgba(' + paint.contrast.background.join(', ') + ')';
  save('equal-solid-ink', beforePaint, { ...beforePaint, style: { ...beforePaint.style, color: opaque, webkitTextFillColor: opaque } }, solidContrast, result => result.status === 'resolved-solid' && result.ratio === 1 && result.belowThreshold);
  for (const [name, mutate] of [
    ['gradient', value => { value.layers[0].style.backgroundImage = 'linear-gradient(rgb(0, 0, 0), rgb(255, 255, 255))'; }],
    ['image', value => { value.overlaps.push({ kind: 'changed-record-image' }); }],
    ['opacity', value => { value.layers[0].style.opacity = '0.5'; }],
    ['missing-opaque-base', value => { for (const layer of value.layers) layer.style.backgroundColor = 'rgba(0, 0, 0, 0)'; }],
    ['clip-shape', value => { value.layers[0].style.clip = 'rect(0px, 0px, 0px, 0px)'; }],
    ['clip-path', value => { value.layers[0].style.clipPath = 'inset(50%)'; }],
    ['actual-clipping', value => { const layer = value.layers.at(-1); layer.style.overflowX = 'hidden'; layer.client.x = value.rects[0].right + 1; layer.client.right = layer.client.x + 1; }],
    ['pending-consent-cover', value => { value.occluders.push({ ...value.rects[0] }); }],
    ['ancestor-shadow', value => { value.layers[0].style.boxShadow = 'rgb(0, 0, 0) 0px 0px 2px 2px inset'; }],
  ]) { const changed = structuredClone(beforePaint); mutate(changed); save('unresolved-' + name, beforePaint, changed, solidContrast, result => result.status === 'unresolved' && result.ratio === null); }
}
function seed(spec) {
  if (spec.theme === 'light') localStorage.setItem('dukb-theme', 'light');
  if (spec.auth) {
    localStorage.setItem('sb-flawuiqbvjobmkfkauhw-auth-token', JSON.stringify({ access_token: 'harness.not.a.real.token', token_type: 'bearer', expires_in: 999999, expires_at: Math.floor(spec.clock / 1000) + 999999, refresh_token: 'harness-refresh',
      user: { id: spec.user, aud: 'authenticated', role: 'authenticated', email: 'harness@example.com', app_metadata: {}, user_metadata: {}, identities: [], created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' } }));
    localStorage.setItem('dukb-streaks-v1', JSON.stringify({ version: 1, global: { current: 365, longest: 365, lastDate: spec.etDay }, perGame: {}, loginDates: [], totalPlays: 0, totalPoints: 0 }));
    localStorage.setItem('dukb-local-completions', JSON.stringify({ date: spec.etDay, slugs: Array.from({ length: 106 }, (_, index) => 'g' + index) }));
  }
  window.__measure1449Reject = [];
  document.addEventListener('click', event => { const button = event.target instanceof Element ? event.target.closest('button') : null; if (button?.textContent.trim() === 'Reject all' && window.__measure1449Reject.length < 16) window.__measure1449Reject.push({ type: event.type, trusted: event.isTrusted, label: button.textContent, at: performance.now() }); }, true);
}
function collect({ expectedNode }) {
  const rect = box => box && ({ x: box.x, y: box.y, width: box.width, height: box.height, right: box.right, bottom: box.bottom });
  const intersects = (a, b) => a && b && a.x < b.right && a.right > b.x && a.y < b.bottom && a.bottom > b.y;
  const union = boxes => boxes.length ? { x: Math.min(...boxes.map(box => box.x)), y: Math.min(...boxes.map(box => box.y)), right: Math.max(...boxes.map(box => box.right)), bottom: Math.max(...boxes.map(box => box.bottom)), width: Math.max(...boxes.map(box => box.right)) - Math.min(...boxes.map(box => box.x)), height: Math.max(...boxes.map(box => box.bottom)) - Math.min(...boxes.map(box => box.y)) } : null;
  const properties = ['display', 'visibility', 'opacity', 'position', 'overflow', 'overflowX', 'overflowY', 'clip', 'clipPath', 'transform', 'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'whiteSpace', 'color', 'backgroundColor', 'backgroundImage', 'backgroundBlendMode', 'mixBlendMode', 'filter', 'backdropFilter', 'textShadow', 'webkitTextStrokeWidth', 'webkitTextFillColor', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'boxShadow'];
  const pseudoProperties = ['content', 'position', 'inset', 'top', 'right', 'bottom', 'left', 'width', 'height', 'zIndex', 'backgroundColor', 'backgroundImage', 'boxShadow', 'filter', 'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor'];
  const nodes = [], known = new Map(), styleRecord = (style, keys) => Object.fromEntries(keys.map(key => [key, style[key]]));
  const nodeRecord = node => {
    if (!node) return null; if (known.has(node)) return known.get(node);
    const id = 'n' + nodes.length; known.set(node, id); const box = node.getBoundingClientRect();
    nodes.push({ id, tag: node.tagName, domId: node.id, classes: node.className?.baseVal ?? node.className, rect: rect(box), rects: [...node.getClientRects()].map(rect), image: node.tagName === 'IMG' ? { currentSrc: node.currentSrc, complete: node.complete, naturalWidth: node.naturalWidth, naturalHeight: node.naturalHeight } : null, client: { x: box.x + node.clientLeft, y: box.y + node.clientTop, width: node.clientWidth, height: node.clientHeight, right: box.x + node.clientLeft + node.clientWidth, bottom: box.y + node.clientTop + node.clientHeight }, style: styleRecord(getComputedStyle(node), properties), pseudos: ['::before', '::after'].map(kind => ({ kind, ...styleRecord(getComputedStyle(node, kind), pseudoProperties) })) }); return id;
  };
  const ranges = node => { const values = [], walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT); let text; while ((text = walker.nextNode())) { const raw = text.textContent, start = raw.search(/\S/); if (start < 0) continue; const range = document.createRange(); range.setStart(text, start); range.setEnd(text, raw.trimEnd().length); values.push(...[...range.getClientRects()].map(rect)); } return values; };
  const main = document.getElementById('dukb-main'), headings = main ? [...main.querySelectorAll('h1')] : [], h1 = headings[0];
  if (!main || !h1) throw new Error('MEASURE1449_SETUP: actual main and H1');
  const headingRects = ranges(h1), row = h1.parentElement, stats = [...row.querySelectorAll('span')].filter(node => node.querySelector(':scope > strong')).map(node => ({ node: nodeRecord(node), label: node.querySelector('.sr-only')?.textContent.trim() || '', value: node.querySelector(':scope > strong').textContent, valueNode: nodeRecord(node.querySelector(':scope > strong')), unit: [...node.children].filter(child => child.tagName === 'SPAN' && !child.classList.contains('sr-only')).map(child => ({ text: child.textContent, node: nodeRecord(child) })) }));
  const first = main.querySelector('a.home-tile') || main.querySelector('[data-hub-game] h3 a'), firstCard = first?.closest('[data-home-game-card], [data-hub-game]');
  const viewport = { innerWidth, innerHeight, clientWidth: document.documentElement.clientWidth, clientHeight: document.documentElement.clientHeight, scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight, scrollX, scrollY, dpr: devicePixelRatio, visual: visualViewport ? { width: visualViewport.width, height: visualViewport.height, scale: visualViewport.scale, offsetLeft: visualViewport.offsetLeft, offsetTop: visualViewport.offsetTop } : null };
  const screen = { x: 0, y: 0, right: innerWidth, bottom: innerHeight };
  const hit = (x, y, owner) => { const visible = x >= 0 && y >= 0 && x < innerWidth && y < innerHeight; if (!visible) return { x, y, tested: false, reason: 'offscreen' }; const actual = document.elementFromPoint(x, y); return { x, y, tested: true, ownerHit: !!actual && (actual === owner || owner.contains(actual)), actual: nodeRecord(actual), clickable: nodeRecord(actual?.closest('a,button')) }; };
  const sourceControls = [...main.querySelectorAll('a,button')], sources = sourceControls.map((control, sourceIndex) => ({ sourceIndex, tag: control.tagName, rects: [...control.getClientRects()].map(rect) }));
  const selected = sources.filter(owner => owner.rects.some(box => box.width > 0 && box.height > 0 && intersects(box, screen)));
  const controlScope = { kind: 'all-positive-area-viewport-owner-client-rects', matchedCount: sources.length, selectedCount: selected.length, offscreenCount: sources.length - selected.length, sources };
  if (selected.length > 400) throw new Error('MEASURE1449_SETUP: viewport control ceiling, no truncation; matched=' + sources.length + ', selected=' + selected.length);
  const controls = selected.map(owner => {
    const control = sourceControls[owner.sourceIndex], box = control.getBoundingClientRect(), card = control.closest('[data-hub-game], [data-home-game-card]'), cardBox = card?.getBoundingClientRect(), labelRects = ranges(control), after = getComputedStyle(control, '::after');
    return { sourceIndex: owner.sourceIndex, measureKind: 'element-control', rectSource: 'control.getClientRects', boxOwnerMatchesControl: control === control.closest('a,button'), node: nodeRecord(control), tag: control.tagName, role: control.getAttribute('role'), href: control.getAttribute('href'), text: control.textContent, ariaLabel: control.getAttribute('aria-label'), disabled: control.matches(':disabled,[aria-disabled="true"]'), inline: getComputedStyle(control).display.startsWith('inline'), rects: owner.rects, labelRects, clickableAncestor: nodeRecord(control.closest('a,button')), card: nodeRecord(card), onScreen: true, center: hit(box.x + box.width / 2, box.y + box.height / 2, control), stretchedPseudo: after.position === 'absolute' && after.top === '0px' && after.right === '0px' && after.bottom === '0px' && after.left === '0px' ? { after: styleRecord(after, pseudoProperties), containingCard: nodeRecord(card), sampledOwnershipOnly: true, samples: cardBox ? [0.1, 0.5, 0.9].flatMap(x => [0.1, 0.5, 0.9].map(y => hit(cardBox.x + cardBox.width * x, cardBox.y + cardBox.height * y, control))) : [] } : null };
  });
  const painted = [...main.querySelectorAll('img,svg,video,canvas')].map(node => ({ node: nodeRecord(node), kind: node.tagName, rect: rect(node.getBoundingClientRect()) })).filter(item => item.rect.width && item.rect.height);
  const texts = [], walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT); let text;
  while ((text = walker.nextNode())) {
    if (!text.textContent.trim() || text.parentElement.closest('script,style,noscript')) continue;
    const target = text.parentElement, style = getComputedStyle(target), range = document.createRange(), raw = text.textContent;
    range.setStart(text, raw.search(/\S/)); range.setEnd(text, raw.trimEnd().length); const boxes = [...range.getClientRects()].map(rect);
    if (style.display === 'none' || style.visibility !== 'visible' || Number(style.opacity) === 0 || !boxes.some(box => box.width && box.height && intersects(box, screen))) continue;
    const ancestors = []; for (let node = target; node; node = node.parentElement) ancestors.unshift(nodeRecord(node));
    texts.push({ text: raw, target: nodeRecord(target), rects: boxes, layers: ancestors, overlaps: painted.filter(item => boxes.some(box => intersects(box, item.rect))).map(item => item.node) });
    if (texts.length > 600) throw new Error('MEASURE1449_SETUP: text ceiling, no truncation');
  }
  const ancestry = []; for (let node = h1; node; node = node.parentElement) ancestry.push(nodeRecord(node));
  const consent = [...document.querySelectorAll('[role="region"][aria-label="Cookie choices"]')];
  return { at: performance.now(), url: location.href, viewport, theme: { light: document.documentElement.classList.contains('light'), stored: localStorage.getItem('dukb-theme'), tokens: Object.fromEntries(['background', 'foreground', 'primary', 'muted-foreground'].map(key => [key, getComputedStyle(document.documentElement).getPropertyValue('--' + key)])), bodyBackground: getComputedStyle(document.body).backgroundColor, bodyForeground: getComputedStyle(document.body).color },
    fonts: { status: document.fonts.status, inter: document.fonts.check('16px Inter'), display: document.fonts.check('16px "Space Grotesk"'), faces: [...document.fonts].map(face => ({ family: face.family, status: face.status, weight: face.weight })) }, h1Count: headings.length,
    heading: { node: nodeRecord(h1), sameNode: h1 === expectedNode, text: h1.textContent, shown: h1.innerText, rects: headingRects, union: union(headingRects), ancestry, row: nodeRecord(row), parent: nodeRecord(row.parentElement), outer: nodeRecord(row.parentElement.parentElement), intro: nodeRecord(row.nextElementSibling?.tagName === 'P' ? row.nextElementSibling : null), search: nodeRecord(main.querySelector('[aria-label="Search games"]')) }, stats,
    firstPlayable: first ? { node: nodeRecord(first), href: first.getAttribute('href'), text: first.textContent, card: nodeRecord(firstCard), documentTop: first.getBoundingClientRect().top + scrollY } : null, controlScope, controls, texts, nodes,
    seededLocalUserId: JSON.parse(localStorage.getItem('sb-flawuiqbvjobmkfkauhw-auth-token') || 'null')?.user?.id ?? null,
    storesRaw: { local: Object.fromEntries(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])), session: Object.fromEntries(Object.keys(sessionStorage).sort().map(key => [key, sessionStorage.getItem(key)])) },
    consent: { count: consent.length, region: nodeRecord(consent[0]), pending: document.body.dataset.consentPending ?? null, height: document.body.style.getPropertyValue('--dukb-consent-height'), choice: localStorage.getItem('cookie-consent-v2'), rejectEvents: window.__measure1449Reject }, utcDay: new Date().toISOString().slice(0, 10), etDay: new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()), pollDay: new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date(Date.now() - 12 * 60 * 60 * 1000)) };
}
function enrich(sample) {
  const nodes = new Map(sample.nodes.map(node => [node.id, node])), byId = id => nodes.get(id), heading = sample.heading, box = heading.union;
  sample.stores = Object.fromEntries(Object.entries(sample.storesRaw).map(([kind, values]) => [kind, Object.entries(values).map(([key, value]) => ({ key, bytes: Buffer.byteLength(value), sha256: sha(value) }))])); delete sample.storesRaw;
  sample.textPaint = sample.texts.map(text => { const node = byId(text.target), input = { style: node.style, rects: text.rects, layers: text.layers.map(id => ({ node: id, style: byId(id).style, client: byId(id).client, pseudos: byId(id).pseudos })), overlaps: text.overlaps, occluders: sample.consent.region ? [byId(sample.consent.region).rect] : [] }; return { text: text.text, target: text.target, rects: text.rects, input, contrast: solidContrast(input) }; });
  const intersection = (a, b) => { const width = Math.max(0, Math.min(a.right, b.right) - Math.max(a.x, b.x)), height = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y)); return { width, height, area: width * height }; };
  sample.findings = [];
  if (heading.text.trim() !== heading.shown.trim()) sample.findings.push({ kind: 'h1-text-not-fully-shown', text: heading.text, shown: heading.shown });
  if (!box || !box.width || !box.height) sample.findings.push({ kind: 'h1-zero-range' });
  for (const id of heading.ancestry) { const node = byId(id); if (node.style.display === 'none' || node.style.visibility !== 'visible' || Number(node.style.opacity) === 0 || parseFloat(node.style.fontSize) === 0) sample.findings.push({ kind: 'h1-hidden-style-candidate', node: id, style: node.style }); }
  if (box) {
    sample.fit = { row: byId(heading.row).rect, range: box, signedRowGaps: { left: box.x - byId(heading.row).rect.x, right: byId(heading.row).rect.right - box.right, top: box.y - byId(heading.row).rect.y, bottom: byId(heading.row).rect.bottom - box.bottom }, adjacent: [...sample.stats.map(chip => chip.node), heading.search, heading.intro].filter(Boolean).map(id => ({ node: id, intersection: intersection(box, byId(id).rect) })) };
    if (Object.values(sample.fit.signedRowGaps).some(value => value < 0)) sample.findings.push({ kind: 'h1-outside-title-row', gaps: sample.fit.signedRowGaps });
    for (const adjacent of sample.fit.adjacent) if (adjacent.intersection.area > 0) sample.findings.push({ kind: 'h1-adjacent-overlap', ...adjacent });
    for (const id of heading.ancestry) { const node = byId(id); if (['hidden', 'clip', 'auto', 'scroll'].includes(node.style.overflowX) && (box.x < node.client.x || box.right > node.client.right) || ['hidden', 'clip', 'auto', 'scroll'].includes(node.style.overflowY) && (box.y < node.client.y || box.bottom > node.client.bottom)) sample.findings.push({ kind: 'h1-ancestor-clip-candidate', node: id, client: node.client, style: node.style }); }
    if (box.x < 0 || box.right > sample.viewport.innerWidth) sample.findings.push({ kind: 'h1-outside-viewport', box });
  }
  if (sample.viewport.scrollWidth > sample.viewport.clientWidth) sample.findings.push({ kind: 'document-horizontal-overflow', scrollWidth: sample.viewport.scrollWidth, clientWidth: sample.viewport.clientWidth });
  for (const paint of sample.textPaint) if (paint.contrast.belowThreshold) sample.findings.push({ kind: 'resolved-solid-contrast-below-threshold', target: paint.target, text: paint.text, ratio: paint.contrast.ratio, threshold: paint.contrast.threshold });
  return sample;
}
const stable = sample => JSON.stringify({ heading: sample.heading, stats: sample.stats.map(chip => ({ ...chip, rect: sample.nodes.find(node => node.id === chip.node)?.rect })), first: sample.firstPlayable && sample.nodes.find(node => node.id === sample.firstPlayable.node)?.rect, theme: sample.theme, fonts: sample.fonts, viewport: sample.viewport, consent: { ...sample.consent, rejectEvents: undefined } });
async function snapshot(page, handle, spec, row, state, text = spec.h1) {
  let one, two; const end = Date.now() + Math.min(3000, bounded());
  do { one = await limit('first geometry sample', () => page.evaluate(collect, { expectedNode: handle })); await limit('two actual paint frames', () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(first => requestAnimationFrame(second => resolve([first, second])))))); two = await limit('second geometry sample', () => page.evaluate(collect, { expectedNode: handle })); if (stable(one) === stable(two)) break; } while (Date.now() < end);
  assert.equal(stable(one), stable(two), 'MEASURE1449_SETUP: settled actual title, fonts, state and first tile');
  foundation(two, spec, text); assert.equal(two.utcDay, spec.utcDay, 'MEASURE1449_SETUP: no UTC crossover'); assert.equal(two.etDay, spec.etDay, 'MEASURE1449_SETUP: no ET crossover'); assert.equal(two.pollDay, spec.pollDay, 'MEASURE1449_SETUP: no noon ET poll crossover');
  if (state === 'pending') assert(two.consent.count === 1 && two.consent.pending === '1' && two.consent.height, 'MEASURE1449_SETUP: actual pending consent shell');
  else { const choice = JSON.parse(two.consent.choice || 'null'); assert(two.consent.count === 0 && two.consent.pending === null && two.consent.height === '' && choice?.version === 2 && choice.advertising === false && choice.analytics === false && two.consent.rejectEvents.some(event => event.trusted && event.label.trim() === 'Reject all'), 'MEASURE1449_SETUP: actual trusted Reject all and current stored denial'); }
  const firstSignature = sha(stable(one)), secondSignature = sha(stable(two));
  const sample = enrich(two); sample.caseId = spec.id; sample.state = state; sample.heading.textSha256 = sha(sample.heading.text); sample.settledBefore = { at: one.at, signatureSha256: firstSignature }; sample.settledAfterSha256 = secondSignature;
  const name = spec.id + '-' + state, png = await limit('unmasked screenshot', () => page.screenshot({ path: path.join(OUT, name + '.png'), fullPage: false })); sample.screenshot = { file: name + '.png', sha256: sha(png) };
  write(name + '.json', sample); row.snapshots.push({ state, file: name + '.json', sha256: sha(fs.readFileSync(path.join(OUT, name + '.json'))), screenshot: sample.screenshot, headingText: sample.heading.text, headingTextSha256: sample.heading.textSha256, findings: sample.findings, resolvedText: sample.textPaint.filter(item => item.contrast.status === 'resolved-solid').length, unresolvedText: sample.textPaint.filter(item => item.contrast.status === 'unresolved').length });
  if (!firstControls && state === 'pending') { fontFaceControls(sample.fonts, spec.id); recordControls(sample, spec); firstControls = true; }
  return sample;
}
async function walk(input, index) {
  const clock = Date.now(), spec = { ...input, clock, utcDay: new Date(clock).toISOString().slice(0, 10), etDay: etDay(clock), pollDay: etDay(clock - 12 * 60 * 60 * 1000), user: USER };
  const row = { id: spec.id, spec, expectedFontContextId: index + 1, contextCreated: false, complete: false, snapshots: [], allowedRequests: [], delegatedFonts: [], fixtures: [], blocked: [], http: [], css: [], responseErrors: [], pageErrors: [], consoleErrors: [] };
  report.cases.push(row); let context, page; const reads = [];
  try {
    bounded(); context = await limit('fresh context', () => browser.newContext({ viewport: { width: spec.width, height: spec.height }, deviceScaleFactor: 1, isMobile: false, hasTouch: spec.width < 600, locale: 'en-US', timezoneId: 'America/New_York', serviceWorkers: 'block' })); row.contextCreated = true;
    await context.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url());
      try {
        row.attemptedRequests = (row.attemptedRequests || 0) + 1; assert(row.attemptedRequests <= 2048, 'MEASURE1449_SETUP: bounded requests');
        if (url.origin === BASE) { staticRequest(url, request.method()); row.allowedRequests.push({ method: request.method(), path: url.pathname, type: request.resourceType() }); return await route.continue(); }
        if (request.method() === 'GET' && fonts.has(url.href) && ['font', 'stylesheet'].includes(request.resourceType())) { row.delegatedFonts.push({ url: url.href, type: request.resourceType(), sha256: fonts.get(url.href).sha256 }); return await route.fallback(); }
        const fixture = shellFixture(request, url) || personalFixture(request, url, spec) || pollFixture(request, url, spec);
        if (fixture) { row.fixtures.push({ id: fixture.id, method: request.method(), path: url.pathname, query: url.search, requestBodySha256: fixture.requestBodySha256 ?? null, responseSha256: sha(fixture.body), ...(fixture.pollDay ? { pollDay: fixture.pollDay, observedPollDay: url.searchParams.get('poll_date')?.slice(3), expectedQuery: new URLSearchParams({ select: POLL_SELECT, poll_date: 'eq.' + spec.pollDay, order: 'sort_order.asc' }).toString() } : {}), forwarded: false }); return await route.fulfill({ status: 200, contentType: 'application/json', body: fixture.body, headers: { 'access-control-allow-origin': '*', ...(fixture.date ? { date: fixture.date } : {}) } }); }
        throw new Error('MEASURE1449_TRANSPORT: not exact static/cache/source-owned read fixture');
      } catch (error) { row.blocked.push({ method: request.method(), origin: url.origin, path: url.pathname, query: url.search, error: failure(error) }); await route.abort('blockedbyclient'); }
    });
    await context.routeWebSocket('**/*', async socket => { row.blocked.push({ transport: 'websocket' }); try { await socket.close(); } catch (error) { row.blocked.push({ error: failure(error) }); } });
    await context.addInitScript(seed, spec); page = await context.newPage(); page.setDefaultTimeout(4500); page.on('pageerror', error => row.pageErrors.push(failure(error))); page.on('console', message => { if (message.type() === 'error') row.consoleErrors.push(message.text()); });
    page.on('response', response => { const url = new URL(response.url()); if (url.origin !== BASE) return; row.http.push({ method: response.request().method(), path: url.pathname, status: response.status() }); if (url.pathname.endsWith('.css')) reads.push((async () => { const body = await limit('actual CSS body', () => response.body(), 5000, true); assert.equal(sha(body), staticFiles.get(url.pathname)?.sha256, 'MEASURE1449_SETUP: actual served CSS is completed dist'); row.css.push({ path: url.pathname, bytes: body.length, sha256: sha(body) }); })().catch(error => { row.responseErrors.push(failure(error)); })); });
    await page.goto(BASE + spec.route, { waitUntil: 'load', timeout: Math.min(7000, bounded()) }); await page.locator('#dukb-main h1').waitFor({ state: 'attached', timeout: Math.min(5000, bounded()) }); await limit('font readiness', () => page.evaluate(() => document.fonts.ready.then(() => true)));
    if (spec.auth) await page.locator('#dukb-main h1').locator('..').getByText('#12,345', { exact: true }).waitFor({ state: 'attached', timeout: Math.min(5000, bounded()) });
    const handle = await page.locator('#dukb-main h1').elementHandle(); assert(handle, 'MEASURE1449_SETUP: actual heading handle');
    if (spec.route === '/') await snapshot(page, handle, spec, row, 'pending');
    await page.getByRole('button', { name: 'Reject all', exact: true }).click({ timeout: Math.min(4000, bounded()) }); await page.getByRole('region', { name: 'Cookie choices', exact: true }).waitFor({ state: 'hidden', timeout: Math.min(3000, bounded()) });
    const normal = await snapshot(page, handle, spec, row, 'rejected');
    if (spec.route === '/' && spec.auth && spec.theme === 'dark' && [320, 768, 1280].includes(spec.width)) {
      const fixed = sample => JSON.stringify({ class: sample.nodes.find(node => node.id === sample.heading.node)?.classes, style: sample.nodes.find(node => node.id === sample.heading.node)?.style, theme: sample.theme, fonts: sample.fonts, stats: sample.stats.map(chip => ({ label: chip.label, value: chip.value })), consent: sample.consent });
      row.headingArms = [];
      for (const [name, text] of [['old-text', 'DoUKnowBall'], ['candidate-text', HEADING], ['long-text', 'Free sports games '.repeat(30).trim()], ['candidate-restored', HEADING]]) {
        await handle.evaluate((node, value) => { if (node !== document.querySelector('#dukb-main h1')) throw new Error('MEASURE1449_SETUP: heading node replaced'); node.textContent = value; }, text);
        const sample = await snapshot(page, handle, spec, row, name, text); assert.equal(fixed(sample), fixed(normal), 'MEASURE1449_SETUP: heading arms preserve actual CSS, theme, fonts, chips and denial');
        const geometryChanged = sha(JSON.stringify(sample.fit?.range ?? null)) !== sha(JSON.stringify(normal.fit?.range ?? null)); if (name === 'long-text') assert(geometryChanged, 'MEASURE1449_CONTROL: long text changes actual numeric Range bounds');
        row.headingArms.push({ name, textSha256: sha(sample.heading.text), changedFromCandidate: sample.heading.text !== HEADING, geometryChanged, fit: sample.fit, findings: sample.findings });
      }
      assert.equal(await handle.textContent(), HEADING, 'MEASURE1449_SETUP: exact candidate heading restored'); row.wholeHeadingRestored = true;
    }
    if (spec.auth) for (const id of ['local-profile', 'local-rank', 'local-completions', 'local-best-scores']) assert(row.fixtures.some(fixture => fixture.id === id), 'MEASURE1449_SETUP: actual source-owned synthetic read ' + id);
    else assert(!row.fixtures.some(fixture => fixture.id.startsWith('local-')), 'MEASURE1449_SETUP: guest never uses signed-in fixture');
    assert(row.css.length > 0 || reads.length > 0, 'MEASURE1449_SETUP: actual CSS response'); row.complete = true;
  } catch (error) { row.error = failure(error); }
  finally {
    try { if (context) await limit('context close', () => context.close(), 5000, true); } catch (error) { row.closeError = failure(error); row.complete = false; }
    const results = await Promise.allSettled(reads); if (results.some(result => result.status === 'rejected')) { row.responseErrors = results.filter(result => result.status === 'rejected').map(result => failure(result.reason)); row.complete = false; }
    if (row.blocked.length || row.pageErrors.length || row.consoleErrors.length || row.responseErrors.length || row.http.some(item => item.status >= 400)) row.complete = false;
    row.status = row.complete ? 'MEASURED' : 'SETUP_OR_INCOMPLETE'; write('report.json', report);
  }
}
try {
  deadline = Date.now() + 480000; assert.equal(path.basename(fileURLToPath(import.meta.url)), 'measureHomeDiscovery1449.mjs', 'MEASURE1449_SETUP: actual reviewed probe basename'); assert.equal(BASE, 'http://127.0.0.1:4173'); assert.match(SOURCE || '', /^[a-f0-9]{40}$/); if (process.env.GITHUB_SHA) assert.equal(SOURCE, process.env.GITHUB_SHA);
  adapter = path.resolve(process.env.MEASUREMENT1449_FONT_PRELOAD || ''); assert.equal(sha(fs.readFileSync(adapter)), ADAPTER_SHA, 'MEASURE1449_SETUP: exact one-basename ac09 adapter');
  assert.deepEqual((process.env.NODE_OPTIONS || '').trim().split(/\s+/), ['--require=' + path.join(ROOT, 'scripts/lib/offlineTransport.cjs'), '--require=' + adapter], 'MEASURE1449_SETUP: offline guard first, exact reviewed font adapter second');
  for (const receipt of ['SIM_OFFLINE_RECEIPT', 'FONT_CACHE_USE_RECEIPT']) assert(process.env[receipt] && fs.statSync(process.env[receipt]).isFile() && fs.statSync(process.env[receipt]).size === 0, 'MEASURE1449_SETUP: fresh existing ' + receipt);
  assert.equal(sha(fs.readFileSync(path.join(ROOT, 'src/pages/Index.tsx'))), 'a77bdd7d1c4a9dffedc01d3046702b61249aa945c4fe9c17a8fc9a0584ac4112', 'MEASURE1449_SETUP: reviewed candidate Index');
  assert.equal(sha(fs.readFileSync(path.join(ROOT, 'src/data/homeCopy.ts'))), 'eacf353622e5e6591c9f57dffdf40ae69ac12fe1e7a4843115cf0ae837595ba4', 'MEASURE1449_SETUP: reviewed candidate home copy');
  for (const [file, expected] of [['src/components/home/PollOfTheDay.tsx', '61763f32d48db1687eb3f3144738330c3df1c24850e6a4f4ae1c83f4de837454'], ['src/lib/dateUtils.ts', 'b580faa88089a5d6a15aef0a1fc08f0f1444b38c273d458e3c74a43a7f72781e']]) assert.equal(sha(fs.readFileSync(path.join(ROOT, file))), expected, 'MEASURE1449_SETUP: exact source-owned poll reader and clock ' + file);
  report.pollFixture = { path: '/rest/v1/daily_polls', select: POLL_SELECT, order: 'sort_order.asc', responseSha256: sha(POLL_BODY), dayRule: 'America/New_York date at context clock minus twelve hours', synthetic: true, flagless: true, votingAttempted: false };
  const template = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'), blocks = template.split('<div id="dukb-home-copy">'); assert.equal(blocks.length, 2);
  const actualTemplateH1 = (blocks[1].replace(/<!--[\s\S]*?-->/g, ' ').match(/<h1>([^<]{1,200})<\/h1>/) || [])[1]; assert.equal(actualTemplateH1, HEADING, 'MEASURE1449_SETUP: actual generated template candidate H1'); report.homeFoldOwnedText = HEADING + ' Home';
  report.holds.sourceBefore = sourceHold(); before = inventory(DIST); assert(before.length > 100); staticFiles = new Map(before.map(item => ['/' + item.file, item])); write('source-before.json', report.holds.sourceBefore); write('dist-before.sha256', before.map(item => item.sha256 + '  ' + item.file).join('\n') + '\n');
  const fontManifest = fs.readFileSync(path.join(process.env.FREE_KICK_FONT_CACHE, 'manifest.json')); assert.equal(sha(fontManifest), process.env.FONT_CACHE_MANIFEST_SHA256); report.fontManifestSha256 = sha(fontManifest); cacheBefore = inventory(process.env.FREE_KICK_FONT_CACHE); fonts = new Map(JSON.parse(fontManifest).map(item => [item.url, item])); assert.equal(fonts.size, JSON.parse(fontManifest).length);
  predicateControls(); fixtureControls(); pollFixtureControls(); browser = await chromium.launch({ headless: true, timeout: 10000 }); report.browserVersion = browser.version(); for (const [index, spec] of planned.entries()) await walk(spec, index);
} catch (error) { report.errors.push(failure(error)); }
finally {
  try { if (browser) await limit('browser close', () => browser.close(), 5000, true); } catch (error) { report.errors.push(failure(error)); }
  try {
    report.holds.sourceAfter = sourceHold(); assert.deepEqual(report.holds.sourceAfter, report.holds.sourceBefore, 'MEASURE1449_HOLD: source/helper/dependencies unchanged'); write('source-after.json', report.holds.sourceAfter);
    const after = inventory(DIST); assert.deepEqual(after, before, 'MEASURE1449_HOLD: complete dist unchanged'); write('dist-after.sha256', after.map(item => item.sha256 + '  ' + item.file).join('\n') + '\n');
    assert.deepEqual(inventory(process.env.FREE_KICK_FONT_CACHE), cacheBefore, 'MEASURE1449_HOLD: complete font cache unchanged'); assert.equal(fs.statSync(process.env.SIM_OFFLINE_RECEIPT).size, 0, 'MEASURE1449_HOLD: zero actual transport attempts');
    const receipt = fs.readFileSync(process.env.FONT_CACHE_USE_RECEIPT, 'utf8'); write('font-cache-use.jsonl', receipt); const uses = receipt.trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
    for (const row of report.cases) { const actual = uses.filter(item => item.contextId === row.expectedFontContextId); assert(actual.some(item => item.resourceType === 'stylesheet') && actual.some(item => item.resourceType === 'font'), 'MEASURE1449_HOLD: actual cached sheet and fonts each context'); assert.deepEqual(actual.map(item => [item.url, item.resourceType, item.sha256]).sort(), row.delegatedFonts.map(item => [item.url, item.type, item.sha256]).sort(), 'MEASURE1449_HOLD: every delegated font has actual adapter receipt'); for (const item of actual) assert(item.manifestSha256 === report.fontManifestSha256 && item.sha256 === fonts.get(item.url)?.sha256, 'MEASURE1449_HOLD: actual font receipt pin'); row.actualCachedFonts = actual.length; }
    assert.equal(new Set(uses.map(item => item.contextId)).size, 36, 'MEASURE1449_HOLD: no extra or missing cache context'); report.holds.unchanged = true;
  } catch (error) { report.errors.push(failure(error)); }
  report.actual = { contexts: report.cases.filter(row => row.contextCreated).length, completeContexts: report.cases.filter(row => row.complete).length, snapshots: report.cases.reduce((sum, row) => sum + row.snapshots.length, 0), headingArms: report.cases.reduce((sum, row) => sum + (row.headingArms?.length || 0), 0), findings: report.cases.flatMap(row => row.snapshots).reduce((sum, sample) => sum + sample.findings.length, 0) };
  report.complete = report.errors.length === 0 && report.holds.unchanged === true && report.cases.length === 36 && report.actual.contexts === 36 && report.actual.completeContexts === 36 && report.actual.snapshots === 68 && report.actual.headingArms === 12 && report.transportPredicateControls.length === 6 && report.fixturePredicateControls.length === 18 && report.fontControls.length === 2 && report.recordControls.length === 14;
  report.status = report.complete ? 'MEASUREMENTS_COMPLETE' : 'INCOMPLETE_OR_SETUP_FAILURE'; report.exit = report.complete ? 0 : 1; write('report.json', report);
  const files = fs.readdirSync(OUT).filter(name => name !== 'evidence.sha256').sort(); assert(files.every(name => fs.lstatSync(path.join(OUT, name)).isFile() && !fs.lstatSync(path.join(OUT, name)).isSymbolicLink()), 'MEASURE1449_EVIDENCE: flat regular files'); write('evidence.sha256', files.map(name => sha(fs.readFileSync(path.join(OUT, name))) + '  ' + name).join('\n') + '\n');
}
console.log('HOME_HUB1449_MEASUREMENTS ' + JSON.stringify({ status: report.status, complete: report.complete, applicationQualified: false, planned: report.planned, actual: report.actual, errors: report.errors.length, holds: report.holds.unchanged === true }));
process.exitCode = report.exit;
