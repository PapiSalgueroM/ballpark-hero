/* Reviewer's walk (Round 1219, the run lens). A real Chromium on the served branch build (process.env.BASE).
   Nothing leaves the machine: every request that is not the served build is aborted, the database host included.
   It asserts nothing. It presses the card the way a player would (a real pointer click), reads the browser's own
   storage after every load, measures the card's box and whether its buttons can be hit, and saves screenshots
   into $RC_OUT. Journeys:
     T  the toggle: put back A, OK, put the other one back (the undo), OK, and a third press if one is offered
     N  a put back with no save at the key
     S  a journal that waited ten minutes
     Q  storage with no room for the copy aside
     C  the cookie banner left unanswered over the card
     D  the default path on pages that mount no game: 21 real saves byte for byte */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import pw from '../../scripts/lib/playwrightLoader.mjs';
import { buildRealSaves } from '../../scripts/lib/realSaves.mjs';

const { chromium } = pw;
const ROOT = process.cwd();
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || path.join(os.tmpdir(), 'rrun-walk-out');
fs.mkdirSync(OUT, { recursive: true });
const MARK = '.broken-';
const PENDING = 'dukb-save-pending';
const BROKE = 'This page broke';
const results = { T: [], N: [], S: [], Q: [], C: [], D: [] };
const say = (...a) => console.log(...a);
const slug = p => p.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');
const sumOf = t => { let h = 0x811c9dc5; for (let i = 0; i < t.length; i += 1) { h ^= t.charCodeAt(i); h = Math.imul(h, 0x01000193); } return h >>> 0; };

const listSrc = fs.readFileSync(path.join(ROOT, 'src/data/continueSaves.ts'), 'utf8');
const ENTRIES = [];
for (const line of listSrc.split('\n')) {
  const m = /^\s*\{ path: '([^']+)', saveKey: '([^']+)'/.exec(line);
  if (m) ENTRIES.push({ path: m[1], saveKey: m[2] });
}
say(`walk: ${ENTRIES.length} long games read from continueSaves.ts; base ${BASE}`);
const entryOf = p => ENTRIES.find(e => e.path === p);

say('walk: building real saves with each game\'s own engine...');
const real = await buildRealSaves({ root: ROOT, tmpDir: fs.mkdtempSync(path.join(os.tmpdir(), 'rrun-walk-real-')), seeds: [0, 1] });

async function settle(page) {
  await page.waitForFunction(broke => {
    const t = document.body?.innerText ?? '';
    return t.includes(broke) || (document.querySelectorAll('#root button').length > 0 && t.trim().length > 80);
  }, BROKE, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(1500);
}

async function open(browser, width, { reduced = false, consent = true } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height: width < 700 ? 844 : 900 }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  await ctx.route('**/*', route => {
    const u = route.request().url();
    if (u.startsWith(BASE) || u.startsWith('data:') || u.startsWith('blob:')) return route.continue();
    return route.abort();
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e.message).slice(0, 160)));
  await page.goto(`${BASE}/robots.txt`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  if (consent) await page.evaluate(() => localStorage.setItem('cookie-consent', 'essential'));
  return { ctx, page, errors };
}

const plant = (page, pairs) => page.evaluate(ps => {
  for (const [k, v] of ps) { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); }
  return ps.every(([k, v]) => localStorage.getItem(k) === v);
}, pairs);

/* The storage and the card, read inside the page. T names the texts the walk knows (A, B). */
const readState = (page, e, T) => page.evaluate(([key, mark, texts, pending, broke]) => {
  const nameOf = v => { if (v === null) return 'EMPTY'; for (const [n, t] of Object.entries(texts)) if (t === v) return n; return `other(${v.length})`; };
  const keys = [];
  for (let i = 0; i < localStorage.length; i += 1) keys.push(localStorage.key(i));
  const prefix = key + mark;
  const card = document.querySelector('[data-dukb-set-aside]');
  let box = null;
  if (card) {
    const r = card.getBoundingClientRect();
    const btns = [...card.querySelectorAll('button')].map(b => {
      const q = b.getBoundingClientRect();
      const el = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2);
      const hit = !!el && (el === b || b.contains(el));
      return { label: b.innerText.trim(), w: Math.round(q.width), h: Math.round(q.height), hit, by: hit || !el ? null : `${el.tagName}.${String(el.className).slice(0, 50)}` };
    });
    box = { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), inside: r.left >= 0 && r.top >= 0 && r.right <= window.innerWidth && r.bottom <= window.innerHeight, btns };
  }
  return {
    key: nameOf(localStorage.getItem(key)),
    backups: keys.filter(k => k.startsWith(prefix)).sort().map(k => `${k.slice(prefix.length)}=${nameOf(localStorage.getItem(k))}`),
    aHeld: keys.some(k => localStorage.getItem(k) === texts.A),
    journal: localStorage.getItem(pending) !== null,
    card: card ? card.innerText.replace(/\s+/g, ' ').trim() : null,
    putBack: card ? card.getAttribute('data-dukb-put-back') : null,
    box,
    broke: (document.body?.innerText ?? '').includes(broke),
    sideways: document.documentElement.scrollWidth > window.innerWidth,
    scrollY: Math.round(window.scrollY),
    history: window.history.length,
  };
}, [e.saveKey, MARK, T, PENDING, BROKE]);

const shot = async (page, name) => { try { await page.screenshot({ path: path.join(OUT, name) }); } catch { /* a missed picture fails nothing */ } };

/* A real pointer click on the card's button, then the load it asks for. Falls back to a DOM click and says so. */
async function press(page, label) {
  const btn = page.locator('[data-dukb-set-aside] button', { hasText: label });
  if (!(await btn.isVisible().catch(() => false))) return { pressed: false, why: `no "${label}" button on screen` };
  const doc0 = await page.evaluate(() => performance.timeOrigin);
  let realClick = true;
  let nav = page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => null);
  try { await btn.click({ timeout: 8000 }); } catch (err) {
    realClick = false;
    await btn.evaluate(b => b.click()).catch(() => {});
  }
  await nav;
  await settle(page);
  const doc1 = await page.evaluate(() => performance.timeOrigin);
  return { pressed: true, realClick, newDocument: doc1 !== doc0 };
}
async function ok(page) {
  const btn = page.locator('[data-dukb-set-aside] button', { hasText: /^OK$/ });
  if (!(await btn.isVisible().catch(() => false))) return false;
  try { await btn.click({ timeout: 8000 }); } catch { await btn.evaluate(b => b.click()).catch(() => {}); }
  await page.waitForTimeout(400);
  return true;
}
const line = s => `key=${s.key} backups=[${(s.backups || []).join(', ')}]${s.journal ? ' JOURNAL' : ''}${s.broke ? ' BROKE' : ''} card=${s.card ? `"${s.card.slice(0, 110)}"` : 'none'}${s.box ? ` box=${s.box.x},${s.box.y} ${s.box.w}x${s.box.h}${s.box.inside ? '' : ' OUTSIDE'} hit=${s.box.btns.map(b => (b.hit ? 'y' : `n(${b.by})`)).join('')}` : ''}${s.sideways ? ' SIDEWAYS' : ''} hist=${s.history}`;

/* T: the toggle. B at the key, A kept aside. */
async function toggle(browser, route, width, reduced = false) {
  const e = entryOf(route);
  const [A, B] = real.fleet[route];
  const T = { A, B };
  const tag = `${slug(route)}-${width}${reduced ? '-rm' : ''}`;
  const r = { route, width, reduced, lenA: A.length, lenB: B.length, steps: [] };
  const { ctx, page, errors } = await open(browser, width, { reduced });
  const keep = name => width < 700 || /1-offer|2-press1|5-ok2/.test(name);
  try {
    r.planted = await plant(page, [[e.saveKey, B], [`${e.saveKey}${MARK}2026-10-04T09-00-00`, A]]);
    await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await settle(page);
    const push = async (step, extra = {}) => { const s = await readState(page, e, T); r.steps.push({ step, ...extra, ...s }); say(`   ${step.padEnd(14)} ${line(s)}`); return s; };
    say(`T ${route} ${width}${reduced ? ' reduced motion' : ''} (A ${A.length} chars, B ${B.length} chars)`);
    await push('opened');
    if (keep('1-offer')) await shot(page, `T-${tag}-1-offer.png`);
    for (let n = 1; n <= 3; n += 1) {
      const p = await press(page, 'Put that save back');
      if (!p.pressed) { r.steps.push({ step: `press ${n}`, ...p }); say(`   press ${n}: ${p.why}`); break; }
      await push(`after press ${n}`, p);
      if (keep(`${n * 2}-press${n}`)) await shot(page, `T-${tag}-${n * 2}-press${n}.png`);
      const pressedOk = await ok(page);
      await push(`after OK ${n}`, { pressedOk });
      if (keep(`${n * 2 + 1}-ok${n}`)) await shot(page, `T-${tag}-${n * 2 + 1}-ok${n}.png`);
    }
    r.errors = errors.slice(0, 5);
  } catch (err) { r.threw = String(err?.message || err).split('\n')[0]; say(`   THREW ${r.threw}`); } finally { await ctx.close().catch(() => {}); }
  results.T.push(r);
}

/* N: a put back with no save at the key. */
async function noSave(browser, route, width) {
  const e = entryOf(route);
  const [A] = real.fleet[route];
  const r = { route, width, steps: [] };
  const { ctx, page } = await open(browser, width);
  try {
    await plant(page, [[e.saveKey, null], [`${e.saveKey}${MARK}2026-10-04T09-00-00`, A]]);
    await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await settle(page);
    say(`N ${route} ${width}`);
    const push = async step => { const s = await readState(page, e, { A }); r.steps.push({ step, ...s }); say(`   ${step.padEnd(14)} ${line(s)}`); };
    await push('opened');
    await shot(page, `N-${slug(route)}-${width}-1-offer.png`);
    const p = await press(page, 'Put that save back');
    r.press = p;
    await push('after press');
    await shot(page, `N-${slug(route)}-${width}-2-press.png`);
    await ok(page);
    await push('after OK');
  } catch (err) { r.threw = String(err?.message || err).split('\n')[0]; say(`   THREW ${r.threw}`); } finally { await ctx.close().catch(() => {}); }
  results.N.push(r);
}

/* S: a journal that waited (ten minutes old), and one stamped ten minutes ahead. */
async function stale(browser, route, width, minutes) {
  const e = entryOf(route);
  const [A, B] = real.fleet[route];
  const r = { route, width, minutes, steps: [] };
  const { ctx, page } = await open(browser, width);
  try {
    const src = `${e.saveKey}${MARK}2026-10-04T09-00-00`;
    const rec = { v: 1, path: route, backupKey: src, at: Date.now() - minutes * 60 * 1000, len: A.length, sum: sumOf(A) };
    await plant(page, [[e.saveKey, B], [src, A], [PENDING, JSON.stringify(rec)]]);
    await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await settle(page);
    say(`S ${route} ${width}, a journal staged ${minutes} minutes ago`);
    const push = async step => { const s = await readState(page, e, { A, B }); r.steps.push({ step, ...s }); say(`   ${step.padEnd(14)} ${line(s)}`); };
    await push('opened');
    await shot(page, `S-${slug(route)}-${width}-${minutes < 0 ? 'ahead' : `old${minutes}`}.png`);
    await ok(page);
    await push('after OK');
  } catch (err) { r.threw = String(err?.message || err).split('\n')[0]; say(`   THREW ${r.threw}`); } finally { await ctx.close().catch(() => {}); }
  results.S.push(r);
}

/* Q: no room for the copy aside. The store is filled, then about `room` characters are freed. */
async function noRoom(browser, route, width, room) {
  const e = entryOf(route);
  const [A, B] = real.fleet[route];
  const r = { route, width, room, steps: [] };
  const { ctx, page } = await open(browser, width);
  try {
    await plant(page, [[e.saveKey, B], [`${e.saveKey}${MARK}2026-10-04T09-00-00`, A]]);
    r.fill = await page.evaluate(free => {
      let n = 0; let total = 0;
      for (const size of [1000000, 100000, 10000, 1000, 100, 10]) {
        for (;;) {
          const k = `zz-fill-${size}-${n}`;
          try { localStorage.setItem(k, 'x'.repeat(size)); n += 1; total += size; } catch { break; }
          if (n > 400) break;
        }
      }
      /* Free about `free` characters: one filler goes, and a pad takes back what is over. */
      const pick = size => { for (let i = 0; i < localStorage.length; i += 1) { const k = localStorage.key(i); if (k && k.startsWith(`zz-fill-${size}-`)) return k; } return null; };
      let size = 1000;
      let gone = pick(1000);
      if (!gone) { gone = pick(10000); size = 10000; }
      let freed = 0;
      if (gone) {
        localStorage.removeItem(gone);
        freed = size;
        if (size > free) { try { localStorage.setItem('zz-pad', 'x'.repeat(size - free)); freed = free; } catch { /* left as it is */ } }
      }
      return { fillerKeys: n, filled: total, freed };
    }, room);
    await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await settle(page);
    say(`Q ${route} ${width}, the store filled and about ${room} characters freed (${JSON.stringify(r.fill)})`);
    const push = async (step, extra = {}) => { const s = await readState(page, e, { A, B }); r.steps.push({ step, ...extra, ...s }); say(`   ${step.padEnd(14)} ${line(s)}`); return s; };
    await push('opened');
    const p = await press(page, 'Put that save back');
    const s = await push('after press', p);
    r.notice = await page.evaluate(() => (document.body?.innerText ?? '').includes('Storage is full'));
    r.alert = await page.evaluate(() => document.querySelector('[data-dukb-set-aside] [role="alert"]')?.textContent ?? null);
    say(`   the card's alert: ${r.alert ?? 'none'}; the site's "Storage is full" line on screen: ${r.notice}; A still held: ${s.aHeld}`);
    await shot(page, `Q-${slug(route)}-${width}-room${room}.png`);
  } catch (err) { r.threw = String(err?.message || err).split('\n')[0]; say(`   THREW ${r.threw}`); } finally { await ctx.close().catch(() => {}); }
  results.Q.push(r);
}

/* C: the cookie banner left unanswered. */
async function banner(browser, route, width) {
  const e = entryOf(route);
  const [A, B] = real.fleet[route];
  const r = { route, width };
  const { ctx, page } = await open(browser, width, { consent: false });
  try {
    await plant(page, [[e.saveKey, B], [`${e.saveKey}${MARK}2026-10-04T09-00-00`, A]]);
    await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await settle(page);
    r.state = await readState(page, e, { A, B });
    say(`C ${route} ${width}, the cookie banner unanswered\n   opened         ${line(r.state)}`);
    await shot(page, `C-${slug(route)}-${width}-banner.png`);
  } catch (err) { r.threw = String(err?.message || err).split('\n')[0]; say(`   THREW ${r.threw}`); } finally { await ctx.close().catch(() => {}); }
  results.C.push(r);
}

/* D: pages that mount no game. A real save of all 21 games must be byte equal after each, and no backup or journal appears. */
async function defaultPath(browser, width) {
  const r = { width, pages: [] };
  const { ctx, page } = await open(browser, width);
  try {
    const pairs = ENTRIES.map(e => [e.saveKey, real.fleet[e.path][0]]);
    r.planted = await plant(page, pairs);
    say(`D ${width}: ${pairs.length} real saves planted (${r.planted})`);
    for (const p of ['/', '/whats-new', '/leaderboard', '/about', '/privacy']) {
      await page.goto(`${BASE}${p}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await settle(page);
      const got = await page.evaluate(([ps, mark, pending]) => {
        const keys = [];
        for (let i = 0; i < localStorage.length; i += 1) keys.push(localStorage.key(i));
        return { same: ps.filter(([k, v]) => localStorage.getItem(k) === v).length, backups: keys.filter(k => k.includes(mark)).length, journal: keys.includes(pending), keys: keys.length };
      }, [pairs, MARK, PENDING]);
      r.pages.push({ page: p, ...got });
      say(`   ${p.padEnd(14)} ${got.same} of ${pairs.length} saves byte equal, ${got.backups} backups, journal ${got.journal}, ${got.keys} keys in storage`);
    }
    await shot(page, `D-home-${width}.png`);
  } catch (err) { r.threw = String(err?.message || err).split('\n')[0]; say(`   THREW ${r.threw}`); } finally { await ctx.close().catch(() => {}); }
  results.D.push(r);
}

const browser = await chromium.launch();
try {
  await toggle(browser, '/fight-gym', 390);
  await toggle(browser, '/fight-gym', 1280);
  await toggle(browser, '/club-manager', 390);
  await toggle(browser, '/club-manager', 1280);
  await toggle(browser, '/soccer-career', 390);
  await toggle(browser, '/soccer-career', 1280);
  await toggle(browser, '/nfl-my-career', 390);
  await toggle(browser, '/stadium-tycoon', 390);
  await toggle(browser, '/idle-arena', 1280);
  await toggle(browser, '/fight-gym', 390, true);
  await toggle(browser, '/club-manager', 1280, true);
  await noSave(browser, '/nfl-my-career', 390);
  await noSave(browser, '/club-manager', 1280);
  await stale(browser, '/fight-gym', 390, 10);
  await stale(browser, '/fight-gym', 1280, -10);
  await noRoom(browser, '/fight-gym', 390, 900);
  await noRoom(browser, '/club-manager', 1280, 900);
  await banner(browser, '/fight-gym', 390);
  await banner(browser, '/fight-gym', 1280);
  await defaultPath(browser, 390);
  await defaultPath(browser, 1280);
} finally {
  await browser.close().catch(() => {});
  fs.writeFileSync(path.join(OUT, 'walk.json'), JSON.stringify(results, null, 1));
}
say('walk: done (it asserts nothing; read the lines above and look at the pictures).');
