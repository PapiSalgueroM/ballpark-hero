/* Browser verifier support only. Existing shell/poll predicates are source-reused,
   not a backend emulator. No remote request is forwarded. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
export const sha = value => createHash('sha256').update(value).digest('hex');
export const BACKEND = 'https://flawuiqbvjobmkfkauhw.supabase.co';
export const LINKS = [['/', 'Home'], ['/search', 'Search Games'], ['/records', 'Record Books'],
  ['/leaderboard', 'Leaderboard'], ['/whats-new', "What's New"], ['/soccer', 'Soccer'],
  ['/pro-basketball', 'NBA'], ['/hockey', 'NHL'], ['/pro-football', 'NFL'], ['/baseball', 'MLB'],
  ['/college', 'College'], ['/about', 'About'], ['/contact', 'Contact'], ['/privacy', 'Privacy Policy'],
  ['/cookie-policy', 'Cookie Policy'], ['/terms', 'Terms of Service'], ['/accessibility', 'Accessibility']];
export function inventory(directory, relative = '') {
  const rows = [];
  for (const name of fs.readdirSync(path.join(directory, relative)).sort()) {
    const child = relative ? relative + '/' + name : name;
    const stat = fs.lstatSync(path.join(directory, child));
    assert(!stat.isSymbolicLink(), 'MENU_SETUP: no symbolic inventory node');
    if (stat.isDirectory()) rows.push(...inventory(directory, child));
    else { assert(stat.isFile(), 'MENU_SETUP: regular inventory file'); rows.push({ file: child, bytes: stat.size, sha256: sha(fs.readFileSync(path.join(directory, child))) }); }
  }
  return rows;
}
export function staticRequest(url, method, base, files) {
  assert.equal(url.origin, base, 'MENU_TRANSPORT: exact loopback origin');
  assert(!url.username && !url.password && !url.hash, 'MENU_TRANSPORT: no credentials or fragment');
  assert(['GET', 'HEAD'].includes(method), 'MENU_TRANSPORT: static GET/HEAD only');
  const freshness = url.pathname === '/' && [...url.searchParams.keys()].join('|') === 'fresh' && /^\d+$/.test(url.searchParams.get('fresh'));
  assert(!url.search || freshness, 'MENU_TRANSPORT: only source-owned freshness query');
  assert(['/', '/accessibility', '/soccer', '/search'].includes(url.pathname) || files.has(url.pathname), 'MENU_TRANSPORT: selected route or completed-dist file');
}
export function shellFixture(request, url) {
  if (url.origin !== BACKEND || url.username || url.password || url.hash) return null;
  if (request.method() === 'POST' && url.pathname === '/rest/v1/rpc/most_played_today' && !url.search) {
    const body = request.postData(), parsed = JSON.parse(body || 'null');
    if (parsed && Object.keys(parsed).sort().join('|') === 'p_limit|p_min' && parsed.p_min === 3 && parsed.p_limit === 3)
      return { id: 'source-most-played-today-3-3', body: '[]', requestBodySha256: sha(body) };
  }
  if (request.method() === 'GET' && request.postData() === null && url.pathname === '/rest/v1/live_scores') {
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
const POLL_BODY = JSON.stringify([{ poll_key: 'site-menu-local-only', question: 'Local browser fixture only',
  option_a: 'Choice A', option_a_emoji: '', option_a_flag: '', option_b: 'Choice B', option_b_emoji: '', option_b_flag: '',
  option_c: null, option_c_emoji: '', option_c_flag: '', option_d: null, option_d_emoji: '', option_d_flag: '', sort_order: 1 }]);
export const pollDay = clock => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date(clock - 12 * 3600 * 1000));
export function pollFixture(request, url, day) {
  if (url.origin !== BACKEND || url.username || url.password || url.hash || request.method() !== 'GET' || request.postData() !== null || url.pathname !== '/rest/v1/daily_polls') return null;
  const q = url.searchParams;
  if ([...q.keys()].sort().join('|') !== 'order|poll_date|select' || q.get('select') !== POLL_SELECT || q.get('poll_date') !== 'eq.' + day || q.get('order') !== 'sort_order.asc') return null;
  return { id: 'source-home-daily-poll', body: POLL_BODY, pollDay: day };
}
export function loadFonts(directory, pin) {
  assert.match(pin || '', /^[a-f0-9]{64}$/, 'MENU_SETUP: font manifest SHA required');
  const manifest = fs.readFileSync(path.join(directory, 'manifest.json'));
  assert.equal(sha(manifest), pin, 'MENU_SETUP: actual font manifest');
  const rows = JSON.parse(manifest), fonts = new Map();
  for (const row of rows) {
    const url = new URL(row.url), file = path.resolve(directory, row.file);
    assert(url.protocol === 'https:' && ['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname) && !url.username && !url.password, 'MENU_SETUP: exact cached font provider');
    assert(file.startsWith(path.resolve(directory) + path.sep), 'MENU_SETUP: cached body stays inside cache');
    const body = fs.readFileSync(file); assert.equal(sha(body), row.sha256, 'MENU_SETUP: cached font body');
    assert(!fonts.has(row.url), 'MENU_SETUP: unique font URL');
    fonts.set(row.url, { ...row, body });
  }
  assert(fonts.size > 0, 'MENU_SETUP: nonempty font cache');
  return fonts;
}
export function seed(spec) {
  localStorage.setItem('dukb-theme', spec.theme);
  localStorage.removeItem('sb-flawuiqbvjobmkfkauhw-auth-token');
  if (!spec.pending) localStorage.setItem('cookie-consent-v2', JSON.stringify({ version: 2, advertising: false, analytics: false, updatedAt: Date.now() }));
  window.__siteMenuTrusted = [];
  document.addEventListener('click', event => {
    const owner = event.target instanceof Element ? event.target.closest('button,a') : null;
    if (owner && window.__siteMenuTrusted.length < 128) window.__siteMenuTrusted.push({ trusted: event.isTrusted, text: owner.textContent.trim(), href: owner.getAttribute('href') });
  }, true);
}
/* This function executes only in the future browser, against actual nodes. */
export function collect() {
  const rect = node => { if (!node) return null; const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; };
  const visible = node => { const s = getComputedStyle(node); return s.display !== 'none' && s.visibility !== 'hidden' && node.getClientRects().length > 0; };
  const dialog = [...document.querySelectorAll('[role="dialog"]')].find(node => node.getAttribute('data-state') === 'open');
  const trigger = document.querySelector('button[aria-label="Open site menu"]');
  const bar = trigger?.parentElement, ticker = document.querySelector('section[aria-label="Live scores ticker"]');
  const consent = document.querySelector('[role="region"][aria-label="Cookie choices"]');
  const describe = node => ({ tag: node.tagName, text: node.textContent.trim().replace(/\s+/g, ' '), href: node.getAttribute('href'), rect: rect(node), current: node.getAttribute('aria-current') });
  const root = getComputedStyle(document.documentElement), faces = [...document.fonts].map(face => ({ family: face.family, status: face.status }));
  const games = [...document.querySelectorAll('#dukb-main a[href^="/"]')]
    .filter(node => !node.closest('[data-site-chrome]') && visible(node))
    .map(node => ({ href: node.getAttribute('href'), rect: rect(node) }))
    .filter(item => item.href !== '/' && !/^\/(?:search|login|signup|auth|privacy|cookie-policy|terms|accessibility|about|contact|leaderboard|records|whats-new|profile|reset-password|soccer|pro-football|pro-basketball|baseball|hockey|college)(?:\/|$)/.test(item.href) && item.rect.y >= 0)
    .sort((a, b) => a.rect.y - b.rect.y);
  const scroller = dialog?.querySelector('nav')?.parentElement;
  return { href: location.href, viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio, scrollX, scrollY, documentWidth: document.documentElement.scrollWidth },
    theme: { light: document.documentElement.classList.contains('light'), background: root.getPropertyValue('--background'), foreground: root.getPropertyValue('--foreground') },
    fonts: { status: document.fonts.status, inter: document.fonts.check('16px Inter'), display: document.fonts.check('16px "Space Grotesk"'), faces },
    trigger: trigger ? { ...describe(trigger), expanded: trigger.getAttribute('aria-expanded') } : null,
    bar: rect(bar), header: rect(document.querySelector('header[data-site-chrome]')),
    ticker: ticker ? { rect: rect(ticker), visible: visible(ticker), text: ticker.textContent.trim(), liveChip: !!ticker.querySelector('[data-live-chip]') } : null,
    firstGame: games[0] || null, active: document.activeElement ? describe(document.activeElement) : null,
    menu: dialog ? { rect: rect(dialog), animation: getComputedStyle(dialog).animationName, transition: getComputedStyle(dialog).transitionDuration,
      links: [...dialog.querySelectorAll('nav a[href]')].map(describe), close: [...dialog.querySelectorAll('button')].filter(node => node.textContent.trim() === 'Close').map(describe),
      scroller: scroller ? { rect: rect(scroller), height: scroller.clientHeight, scrollHeight: scroller.scrollHeight, overflow: getComputedStyle(scroller).overflowY } : null } : null,
    consent: { count: document.querySelectorAll('[role="region"][aria-label="Cookie choices"]').length, inside: !!(dialog && consent && dialog.contains(consent)),
      host: !!consent?.closest('[data-dukb-help-cookie-choices]'), hidden: consent?.closest('[aria-hidden="true"],[inert]')?.tagName || null, rect: rect(consent),
      pending: document.body.dataset.consentPending || null, stored: localStorage.getItem('cookie-consent-v2') },
    trusted: window.__siteMenuTrusted || [] };
}
export function checkFonts(value) {
  const loaded = new Set(value.faces.filter(face => face.status === 'loaded').map(face => face.family.replace(/['"]/g, '')));
  assert(value.status === 'loaded' && value.inter && value.display && loaded.has('Inter') && loaded.has('Space Grotesk'), 'MENU_FONTS: actual loaded Inter and Space Grotesk');
}
export function checkMenu(sample) {
  assert(sample.menu, 'MENU_OPEN: actual open dialog');
  assert.deepEqual(sample.menu.links.map(row => [row.href, row.text]), LINKS, 'MENU_LINKS: exact seventeen actual destinations');
  const targets = [...sample.menu.links, ...sample.menu.close, sample.trigger];
  assert.equal(sample.menu.close.length, 1, 'MENU_TARGETS: one actual Close');
  assert(targets.every(row => row.rect.width >= 44 && row.rect.height >= 44), 'MENU_TARGETS: whole owner hitboxes at least44');
  assert(sample.menu.rect.x >= 0 && sample.menu.rect.y >= 0 && sample.menu.rect.right <= sample.viewport.width && sample.menu.rect.bottom <= sample.viewport.height + 1, 'MENU_BOUNDS: panel inside actual viewport');
  assert(sample.menu.scroller && sample.menu.scroller.height > 0 && sample.menu.scroller.overflow === 'auto', 'MENU_SCROLL: actual usable scroll body');
}
