/**
 * Round 1601: Club Manager's player card, walked on the built site.
 *
 * The saves are built here by the engine bundle on a seeded stream and put under the save key before the page loads:
 *   S1 an Arsenal career twenty entries into its third season: two seasons of rows, a whole league book on full
 *      record (the first of six seeds that keeps the manager and its league whole);
 *   S2 a Hertha BSC career twenty entries in: the 2. Bundesliga, where much of the league is not on record;
 *   S3 S1 with its rows taken off and pastFrom set to 3: the kept from line.
 * At 320 by 568, 390 by 844 and 1280 by 900, Chromium, the database host blocked and every other host too.
 *
 * What it holds, each read from what the page draws:
 *   1 THE PAGE SHOWS WHAT THE READER SAYS: for three of my men (opened from the Squad row's Seasons button: the top
 *     scorer, the keeper and a man with no game when there is one) and three rivals (opened from the boards: the top
 *     scorer, the top keeper, the last man on the assists board), every number drawn is playerCardOf of the same save
 *     from the same bundle.
 *   2 THE FIT: nothing runs sideways; Back, the "?", the Seasons button and every board row link are at least 44 px
 *     both ways and a hit test at the middle lands on each; at 390 and 1280 the card is no taller than the window.
 *   3 NOTHING STACKS AND NOTHING JUMPS: with a card open the document holds no hub, no squad list and no board;
 *     after Back, window.scrollY (sampled until it has held still for a second) is what it was before the tap, give
 *     or take a pixel, and the host is as it was: the Squad row open again, the board open again.
 *   4 THE LINES word for word, each on the save that earns it and on no other: S2 a rival's thin data line with the
 *     reader's share, S1 none; S3 the kept from line naming season 3, S1 none.
 *   5 A MATCH WITH CARDS OPENED IS THE MATCH WITHOUT: two contexts open S1 on one page seed and one clock; one opens
 *     and closes six cards, the other none; both press Quick Sim once; the page drew the same count before the press
 *     and the two saves are equal, no key left out.
 *
 * Controls (each must turn its own section red and no other: exit 1 and "FIRED" when it does, 3 when not):
 *   PLAY_CARDS_CONTROL=swap    a card's first number is rewritten as it is drawn                     -> 1
 *   PLAY_CARDS_CONTROL=wide    the card is forced 480 px wide                                         -> 2
 *   PLAY_CARDS_CONTROL=stack   a squad list is left in the document under an open card                -> 3
 *   PLAY_CARDS_CONTROL=nohold  the host comes back without its state (the row or board shut again)    -> 3
 *   PLAY_CARDS_CONTROL=thin    the thin data line is forced onto S1's cards                          -> 4
 *   PLAY_CARDS_CONTROL=write   opening a card writes a key into the save                              -> 5
 *
 * Run on a served build (a remote check with #!serve and #!playwright): node scripts/playCmPlayerCard.mjs
 * Pictures of every card go into $RC_OUT (or cm-player-card-artifacts/ when it is not set).
 * Exit: 0 green, 1 red or a control that FIRED, 2 could not run, 3 a control that did not fire.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import pw from './lib/playwrightLoader.mjs';
import { pageSeedOf, seedPages, pageDraws } from './lib/pageSeed.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.BASE || process.env.SWEEP_BASE || '';
const OUT = process.env.RC_OUT || path.join(ROOT, 'cm-player-card-artifacts');
const KEY = 'dukb-club-manager-save';
const NOW = Date.parse('2026-10-12T16:00:00Z');
const CONTROL = process.env.PLAY_CARDS_CONTROL || '';
const CONTROLS = { swap: '1', wide: '2', stack: '3', nohold: '3', thin: '4', write: '5' };
const SECTIONS = ['1', '2', '3', '4', '5'];
const SIZES = [[320, 568], [390, 844], [1280, 900]];
const cannot = why => { console.log(`playCmPlayerCard: COULD NOT RUN: ${why}`); process.exit(2); };
if (!BASE) cannot('no served build: set BASE (a remote check with #!serve sets it)');
if (CONTROL && !CONTROLS[CONTROL]) cannot(`unknown control ${CONTROL}`);
fs.mkdirSync(OUT, { recursive: true });

const red = new Map(SECTIONS.map(s => [s, []]));
const checked = new Map(SECTIONS.map(s => [s, 0]));
const fail = (s, m) => { red.get(s).push(m); if (red.get(s).length <= 12) console.log(`  FAIL ${s}: ${m}`); };
const tick = (s, n = 1) => checked.set(s, checked.get(s) + n);

/* ---------- the engine, and the saves ---------- */
const memory = new Map();
globalThis.localStorage = { getItem: k => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, String(v)), removeItem: k => memory.delete(k) };
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'cm-card-walk-'));
process.on('exit', () => { try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* nothing to undo */ } });
const ENTRY = path.join(TMP, 'card-entry.mjs');
const BUNDLE = path.join(TMP, 'card-engine.mjs');
const P = f => JSON.stringify(path.join(ROOT, f).replaceAll('\\', '/'));
fs.writeFileSync(ENTRY, [
  `export * as cm from ${P('src/lib/clubManager.ts')};`,
  `export * as boards from ${P('src/lib/clubManagerLeagueBoards.ts')};`,
  `export * as cards from ${P('src/lib/clubManagerCards.ts')};`,
].join('\n') + '\n');
try {
  await build({ entryPoints: [ENTRY], bundle: true, platform: 'node', format: 'esm', outfile: BUNDLE, alias: { '@': path.join(ROOT, 'src') }, logLevel: 'error',
    loader: { '.css': 'empty', '.png': 'empty', '.svg': 'empty', '.jpg': 'empty', '.webp': 'empty' } });
} catch (e) { cannot(`the engine did not bundle: ${String(e?.message ?? e).slice(0, 200)}`); }
const { cm, boards, cards } = await import(pathToFileURL(BUNDLE).href);
await cm.ensureAllEraRosters?.();

function seeded(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function onStream(seed, fn) {
  const realRandom = Math.random;
  const realNow = Date.now;
  Math.random = seeded(seed);
  Date.now = () => NOW;
  try { return fn(); } finally { Math.random = realRandom; Date.now = realNow; }
}
/** Play on until `entries` entries are played and the next one is a league match of mine. */
function playTo(s, entries) {
  let n = 0;
  while (s.week < s.calendar.length && (n < entries || s.calendar[s.week]?.type !== 'league') && n < entries + 12) {
    s = cm.playNextEntry(s, { skipHalftime: true }).state;
    n += 1;
  }
  return s;
}
function toSeasonEnd(s) {
  for (let guard = 0; guard < 220 && s.week < s.calendar.length; guard += 1) {
    if (s.boardConfidence < 35) s = { ...s, boardConfidence: 55 };
    const r = cm.playNextEntry(s, { skipHalftime: true });
    s = r.state;
    if (r.kind === 'seasonOver') break;
  }
  return s;
}
const S = {};
/* A club that keeps its manager on the seed it is played on: the first seed of a few that does. */
function kept(make, seed, good = () => true) {
  for (let k = 0; k < 6; k += 1) {
    const s = onStream(seed + k * 7919, make);
    if (s && !s.sacked && good(s)) return s;
  }
  return null;
}
S.S1 = kept(() => {
  let s = cm.startCareer('Arsenal');
  for (let season = 0; season < 2 && !s.sacked; season += 1) s = cm.startNextSeason(cm.finishSeason(toSeasonEnd(s)).state);
  return s.sacked ? s : playTo(s, 20);
}, 0x160101, s => s.season === 3);
S.S2 = onStream(0x160102, () => playTo(cm.startCareer('Hertha BSC'), 20));
/* S4: a first season, where the Premier League is on full record (a third season's world may not be: S1 read 92). */
S.S4 = onStream(0x160104, () => playTo(cm.startCareer('Everton'), 20));
S.S3 = JSON.parse(JSON.stringify(S.S1));
delete S.S3.pastLines;
S.S3.pastFrom = 3;
for (const [name, s] of Object.entries(S)) {
  if (!s || s.sacked) cannot(`${name} could not be built (${s ? `sacked in season ${s.season}` : 'no seed of six kept the job'})`);
  fs.writeFileSync(path.join(OUT, `save-${name}.json`), JSON.stringify(s));
}
const wake = s => { cm.registerCustomClub?.(s.customClub ?? null, s.eraId); cm.registerLeagueOverrides?.(s.leagueOverrides ?? null); return s; };
const lb1 = cm.leagueBoardsOf(wake(S.S1));
const lb2 = cm.leagueBoardsOf(wake(S.S2));
const lb4 = cm.leagueBoardsOf(wake(S.S4));
if (S.S1.season !== 3 || !(S.S1.pastLines ?? []).some(e => e[1].length === 2)) cannot('S1 is not in its third season with men holding two kept seasons');
if (!lb1 || lb1.from !== null) cannot(`S1 holds no whole league book (${lb1 ? `from ${lb1.from}, share ${lb1.share}` : `no readable book: ${S.S1.leagueBook ? 'a book the reader refuses or that does not add up' : 'no book key'}`}; season ${S.S1.season} week ${S.S1.week})`);
if (!lb4 || lb4.from !== null || lb4.share < boards.BOOK_FULL_SHARE) cannot(`S4 reads ${lb4 ? `from ${lb4.from}, share ${lb4.share}` : 'no book'}: no save shows a rival card with no thin line`);
if (!lb2 || lb2.share >= boards.BOOK_FULL_SHARE) cannot(`S2 reads ${lb2?.share ?? 'no book'}: the thin line has no save to earn it`);
console.log(`playCmPlayerCard: saves built: S1 season ${S.S1.season} week ${S.S1.week}, ${S.S1.pastLines.length} men with kept seasons, share ${lb1.share}; S4 share ${lb4.share}; S2 week ${S.S2.week}, share ${lb2.share}; S3 kept from 3`);

/** What the card must print, from the reader, in the words and number formats of the screen. */
function expected(save, ref) {
  const c = cards.playerCardOf(wake(save), ref);
  if (!c) return null;
  const line = l => [l.apps === null ? null : `${l.apps} apps`, `${l.goals} goals`, `${l.assists} assists`, c.back && l.cleanSheets !== null ? `${l.cleanSheets} clean sheets` : null].filter(Boolean).join(', ');
  const avg = v => (v === null ? 'no rating' : v.toFixed(1));
  return {
    kind: c.mine ? 'mine' : 'man', name: c.name,
    lines: [c.now ? line(c.now) : null, c.league ? line(c.league) : null].filter(Boolean),
    seasons: c.past.map(l => { const m = k => l.metrics.find(x => x.key === k)?.value; return [`${l.label}${l.club ?? 'Club not on record'}`, m('apps'), m('goals'), m('assists'), ...(c.back ? [m('cleanSheets')] : []), avg(m('rating') ?? null)].map(String); }),
    notes: c.notes.map(n => n.k),
    share: c.notes.find(n => n.k === 'thin')?.share ?? null,
  };
}
/** What the page draws, in the same shape. */
const drawn = page => page.evaluate(() => {
  const card = document.querySelector('[data-cm-card]');
  if (!card) return null;
  return {
    kind: card.getAttribute('data-cm-card'), name: card.querySelector('[data-cm-card-name]')?.textContent ?? '',
    lines: [...card.querySelectorAll('[data-cm-card-line]')].map(el => el.querySelector('.font-bold')?.textContent ?? ''),
    seasons: [...card.querySelectorAll('[data-cm-card-season]')].map(tr => [...tr.querySelectorAll('td')].map(td => td.textContent ?? '')),
    notes: [...card.querySelectorAll('[data-cm-card-note]')].map(el => el.getAttribute('data-cm-card-note')),
    texts: [...card.querySelectorAll('[data-cm-card-note]')].map(el => el.textContent ?? ''),
  };
});

/* ---------- the page ---------- */
const SEED = pageSeedOf(import.meta.url, process.env.PLAY_CARDS_SEED);
console.log(`playCmPlayerCard: page seed ${SEED}`);
let browser;
try { browser = await pw.chromium.launch({ headless: true }); } catch (e) { cannot(`the browser did not start: ${String(e?.message ?? e).slice(0, 160)}`); }
const base = new URL(BASE);

/** The control, as a script that runs in the page before anything else. */
function controlScript({ control, key }) {
  const watch = fn => new MutationObserver(fn).observe(document, { subtree: true, childList: true, characterData: true });
  if (control === 'swap') watch(() => { const el = document.querySelector('[data-cm-card-line] .font-bold'); if (el && !el.dataset.swapped) { el.dataset.swapped = '1'; el.textContent = el.textContent.replace(/[0-9]+/, d => String(Number(d) + 1)); } });
  if (control === 'wide') document.addEventListener('DOMContentLoaded', () => { const st = document.createElement('style'); st.textContent = '[data-cm-card]{min-width:480px}'; document.head.appendChild(st); });
  /* A squad list left in the document while a card is open, and only then (it goes when the card goes). */
  if (control === 'stack') watch(() => {
    const open = !!document.querySelector('[data-cm-card]');
    const fake = document.querySelector('[data-stacked]');
    if (open && !fake) { const d = document.createElement('div'); d.setAttribute('data-stacked', ''); d.setAttribute('data-cm-squad-list', ''); document.body.appendChild(d); }
    if (!open && fake) fake.remove();
  });
  if (control === 'nohold') {
    let carded = false;
    watch(() => {
      if (document.querySelector('[data-cm-card]')) { carded = true; return; }
      if (!carded) return;
      carded = false;
      setTimeout(() => {
        const open = document.querySelector('[data-cm-squad-detail]');
        if (open) document.querySelector(`[data-cm-squad-row="${open.getAttribute('data-cm-squad-detail')}"] > button`)?.click();
        document.querySelector('[data-cm-stats-board] [data-cm-leaders-back]')?.click();
      }, 50);
    });
  }
  if (control === 'thin') watch(() => { const card = document.querySelector('[data-cm-card="man"]'); if (card && !card.querySelector('[data-cm-card-note="thin"]')) { const p = document.createElement('p'); p.setAttribute('data-cm-card-note', 'thin'); p.textContent = 'The data covers only part of this league: 50 in 100 of the other clubs\' goals have a name.'; card.appendChild(p); } });
  if (control === 'write') {
    let opened = false;
    document.addEventListener('click', e => { if (e.target.closest?.('[data-cm-card-link]')) opened = true; }, true);
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (name, value) {
      if (this === localStorage && name === key && opened) { const o = JSON.parse(value); o.cardOpened = true; value = JSON.stringify(o); }
      return setItem.call(this, name, value);
    };
  }
}

async function openPage(save, [width, height]) {
  const context = await browser.newContext({ viewport: { width, height }, colorScheme: 'dark', serviceWorkers: 'block', reducedMotion: 'reduce',
    storageState: { cookies: [], origins: [{ origin: base.origin, localStorage: [{ name: KEY, value: JSON.stringify(save) }, { name: 'cookie-consent', value: 'essential' }, { name: 'dukb-theme', value: 'dark' }] }] } });
  /* Nothing leaves the served build: the database host above all. */
  await context.route(/supabase\.co/, r => r.abort());
  await context.route('**/*', r => (new URL(r.request().url()).origin === base.origin ? r.continue() : r.abort()));
  await seedPages(context, SEED);
  await context.addInitScript(now => {
    const Old = Date;
    window.Date = class extends Old { constructor(...a) { super(...(a.length ? a : [now])); } static now() { return now; } };
  }, NOW);
  if (CONTROL) await context.addInitScript(controlScript, { control: CONTROL, key: KEY });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(`${BASE}/club-manager`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-testid="cm-slot-1"]').getByRole('button', { name: 'Resume Career', exact: true }).click();
  return { context, page, errors };
}
const shot = async (page, name) => { try { await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: false }); } catch { /* a picture is a help, never a gate */ } };
const saved = page => page.evaluate(k => JSON.parse(localStorage.getItem(k)), KEY);
async function toHub(page) {
  const home = page.locator('button:visible').filter({ hasText: /Club home/ }).first();
  if (await home.count()) await home.click().catch(() => {});
}
async function toStats(page) {
  await toHub(page);
  const tile = page.locator('button:visible').filter({ has: page.locator('div', { hasText: /^Stats$/ }) }).first();
  await tile.waitFor();
  await tile.click();
  await page.locator('[data-cm-leaders]').first().waitFor();
}
async function toSquad(page) {
  await page.getByRole('tab', { name: 'Squad', exact: true }).click();
  await page.locator('[data-cm-squad-list]').waitFor();
}
/** window.scrollY once it has held still for a second (a smooth glide can start late). */
async function settled(page) {
  let last = await page.evaluate(() => scrollY);
  let still = 0;
  for (let k = 0; k < 40 && still < 1000; k += 1) {
    await page.waitForTimeout(100);
    const y = await page.evaluate(() => scrollY);
    still = Math.abs(y - last) < 0.5 ? still + 100 : 0;
    last = y;
  }
  return last;
}
/** Rectangles of the things a finger must hit, and whether a hit test at the middle lands on each. */
const targets = (page, sel) => page.evaluate(s => [...document.querySelectorAll(s)].map(el => {
  const r = el.getBoundingClientRect();
  /* Judged only where a finger can reach it now: its middle inside the window and not under a bar pinned to the
     screen (a row the sticky bar covers is scrolled to, not tapped through). */
  const mid = [r.left + r.width / 2, r.top + r.height / 2];
  const at = mid[1] > 0 && mid[1] < innerHeight ? document.elementFromPoint(mid[0], mid[1]) : null;
  let pinned = false;
  for (let n = at; n && n !== document.body; n = n.parentElement) if (!el.contains(n) && ['fixed', 'sticky'].includes(getComputedStyle(n).position)) pinned = true;
  const visible = !!at && !pinned && r.width > 0;
  const hit = visible ? el.contains(at) : true;
  return { what: el.getAttribute('data-cm-card-link') ?? [...el.attributes].map(a => a.name).find(n => n.startsWith('data-cm')) ?? el.tagName, w: r.width, h: r.height, hit, visible };
}), sel);

/**
 * One card: tap the link, hold what is drawn against the reader (1), measure the fit (2), check nothing stacks,
 * then Back, and check the page stands where it stood and the host is as it was (3).
 */
async function oneCard(page, tag, save, ref, link, hostBack) {
  const want = expected(save, ref);
  await link.scrollIntoViewIfNeeded();
  const before = await settled(page);
  await link.click();
  await page.locator('[data-cm-card]').waitFor();
  await page.waitForTimeout(200);
  const got = await drawn(page);
  await shot(page, `${tag}-card`);
  tick('1');
  /* The notes are section 4's: here the numbers only. */
  const strip = d => d && { kind: d.kind, name: d.name, lines: d.lines, seasons: d.seasons };
  if (JSON.stringify(strip(got)) !== JSON.stringify(strip(want))) fail('1', `${tag}: the card on the page ${JSON.stringify(strip(got)).slice(0, 220)} is not the reader's ${JSON.stringify(strip(want)).slice(0, 220)}`);
  const fit = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth, ih: innerHeight, h: document.querySelector('[data-cm-card]').getBoundingClientRect().height,
    stacked: ['[data-cm-hub]', '[data-cm-squad-list]', '[data-cm-leaders]'].filter(s => document.querySelector(s)) }));
  tick('2', 2);
  if (fit.sw > fit.iw) fail('2', `${tag}: the card runs sideways (${fit.sw} wide in ${fit.iw})`);
  if (fit.iw >= 390 && fit.h > fit.ih) fail('2', `${tag}: the card is ${fit.h.toFixed(0)} tall in a window of ${fit.ih}`);
  for (const t of await targets(page, '[data-cm-card-back],[data-cm-card-help]')) { tick('2'); if (t.w < 44 || t.h < 44 || !t.hit) fail('2', `${tag}: ${t.what} is ${t.w.toFixed(1)} by ${t.h.toFixed(1)}${t.hit ? '' : ' and a tap at its middle lands elsewhere'}`); }
  tick('3');
  if (fit.stacked.length) fail('3', `${tag}: with the card open the document still holds ${fit.stacked.join(', ')}`);
  await page.locator('[data-cm-card-back]').click();
  await hostBack();
  const after = await settled(page);
  tick('3');
  if (Math.abs(after - before) > 1) fail('3', `${tag}: Back left the page at ${after.toFixed(0)}, it stood at ${before.toFixed(0)}`);
  return got;
}

/** My men from the Squad screen: the top scorer, the keeper, and a man with no game when there is one. */
async function squadCards(name, save, size) {
  const tag = `${name}-${size[0]}`;
  const { context, page, errors } = await openPage(save, size);
  const seen = [];
  try {
    await toSquad(page);
    const sq = save.squad;
    const top = [...sq].sort((a, b) => b.seasonGoals - a.seasonGoals || (a.id < b.id ? -1 : 1))[0];
    const keeper = sq.find(p => p.position === 'GK' && (p.apps ?? 0) > 0) ?? sq.find(p => p.position === 'GK');
    const idle = sq.find(p => (p.apps ?? 0) === 0);
    for (const [who, p] of [['top', top], ['keeper', keeper], ['idle', idle]]) {
      if (!p) { console.log(`  ${tag}: no ${who} man on this save, skipped`); continue; }
      const row = page.locator(`[data-cm-squad-row="${p.id}"] > button`);
      await row.scrollIntoViewIfNeeded();
      await row.click();
      const link = page.locator(`[data-cm-squad-detail="${p.id}"] [data-cm-card-link]`);
      await link.waitFor();
      for (const t of await targets(page, `[data-cm-squad-detail="${p.id}"] [data-cm-card-link]`)) { tick('2'); if (t.w < 44 || t.h < 44 || !t.hit) fail('2', `${tag}: the Seasons button is ${t.w.toFixed(1)} by ${t.h.toFixed(1)}`); }
      seen.push(await oneCard(page, `${tag}-${who}`, save, { k: 'mine', id: p.id }, link, () => page.locator('[data-cm-squad-list]').waitFor()));
      tick('3');
      if (!(await page.locator(`[data-cm-squad-detail="${p.id}"]`).count())) fail('3', `${tag}-${who}: after Back his row is not open as it was`);
      else await row.click();
    }
    if (errors.length) { tick('1'); fail('1', `${tag}: the page threw: ${errors[0].slice(0, 160)}`); }
  } catch (e) {
    fail('1', `${tag}: the squad walk could not go on: ${String(e?.message ?? e).split('\n')[0].slice(0, 200)}`);
    await shot(page, `${tag}-squad-stuck`);
  }
  await context.close();
  return seen;
}
/** Rivals from the boards: the top scorer, the top keeper, the last man on the assists board. */
async function boardCards(name, save, size) {
  const tag = `${name}-${size[0]}`;
  const { context, page, errors } = await openPage(save, size);
  const seen = [];
  try {
    await toStats(page);
    for (const [kind, pick] of [['goals', 'first'], ['sheets', 'first'], ['assists', 'last']]) {
      await page.locator(`[data-cm-leaders-tile="${kind}"]`).click();
      await page.locator(`[data-cm-board="${kind}"]`).waitFor();
      for (const t of await targets(page, '[data-cm-board-row] [data-cm-card-link]')) { tick('2'); if (t.visible && (t.w < 44 || t.h < 44 || !t.hit)) fail('2', `${tag}: a ${kind} board row link is ${t.w.toFixed(1)} by ${t.h.toFixed(1)}`); }
      const rows = page.locator('[data-cm-board-row]:not([data-mine]) [data-cm-card-link]');
      const n = await rows.count();
      if (!n) { console.log(`  ${tag}: no rival on the ${kind} board, skipped`); await page.locator('[data-cm-leaders-back]').first().click(); continue; }
      const link = pick === 'first' ? rows.first() : rows.nth(n - 1);
      const man = await link.evaluate(el => ({ name: el.querySelector('[data-cm-board-name]')?.textContent ?? '', club: el.querySelector('[data-cm-board-club]')?.textContent ?? '', key: el.getAttribute('data-cm-card-link') }));
      const pos = man.key.slice(man.key.lastIndexOf('|') + 1);
      seen.push(await oneCard(page, `${tag}-${kind}`, save, { k: 'man', name: man.name, pos, club: man.club }, link, () => page.locator('[data-cm-leaders]').first().waitFor()));
      tick('3');
      if (!(await page.locator(`[data-cm-board="${kind}"]`).count())) fail('3', `${tag}-${kind}: after Back the ${kind} board is not open as it was`);
      else await page.locator('[data-cm-leaders-back]').first().click();
      await page.locator('[data-cm-leaders-tile="goals"]').waitFor();
    }
    if (errors.length) { tick('1'); fail('1', `${tag}: the page threw: ${errors[0].slice(0, 160)}`); }
  } catch (e) {
    fail('1', `${tag}: the board walk could not go on: ${String(e?.message ?? e).split('\n')[0].slice(0, 200)}`);
    await shot(page, `${tag}-board-stuck`);
  }
  await context.close();
  return seen;
}

/** Quick Sim once from the hub; resolves on the save that week wrote. */
async function quickSim(page) {
  const before = (await saved(page)).week;
  await toHub(page);
  const quick = page.locator('[data-cm-way="quick"]').first();
  await quick.waitFor();
  await quick.click();
  await page.waitForFunction(({ key, week }) => JSON.parse(localStorage.getItem(key)).week > week, { key: KEY, week: before });
  return saved(page);
}
/** Six cards opened and closed on one page: three of my men, three rivals. */
async function lookAround(page) {
  await toStats(page);
  await page.locator('[data-cm-leaders-tile="goals"]').click();
  for (let k = 0; k < 3; k += 1) {
    await page.locator('[data-cm-board-row] [data-cm-card-link]').nth(k).click();
    await page.locator('[data-cm-card]').waitFor();
    await page.locator('[data-cm-card-back]').click();
    await page.locator('[data-cm-board="goals"]').waitFor();
  }
  await page.locator('[data-cm-leaders-back]').first().click();
  await toSquad(page);
  for (const p of S.S1.squad.slice(0, 3)) {
    const row = page.locator(`[data-cm-squad-row="${p.id}"] > button`);
    await row.click();
    await page.locator(`[data-cm-squad-detail="${p.id}"] [data-cm-card-link]`).click();
    await page.locator('[data-cm-card]').waitFor();
    await page.locator('[data-cm-card-back]').click();
    await page.locator('[data-cm-squad-list]').waitFor();
    await row.click();
  }
  await page.getByRole('tab', { name: 'Home', exact: true }).click();
}

const all = { S1: [], S2: [], S3: [], S4: [] };
for (const size of SIZES) {
  all.S1.push(...await squadCards('S1', S.S1, size), ...await boardCards('S1', S.S1, size));
  all.S2.push(...await boardCards('S2', S.S2, size));
  all.S4.push(...await boardCards('S4', S.S4, size));
  all.S3.push(...await squadCards('S3', S.S3, size));
}

/* 4: the lines, each on the save that earns it and on no other. */
{
  const rivals1 = all.S1.filter(c => c?.kind === 'man');
  const rivals4 = all.S4.filter(c => c?.kind === 'man');
  const mine1 = all.S1.filter(c => c?.kind === 'mine');
  const rivals2 = all.S2.filter(c => c?.kind === 'man');
  const mine3 = all.S3.filter(c => c?.kind === 'mine');
  const label3 = cards.seasonLabelOf(S.S3, 3);
  const thinText = c => c.texts[c.notes.indexOf('thin')] ?? '';
  tick('4', rivals1.length + rivals4.length + mine1.length + rivals2.length + mine3.length);
  if (!rivals1.length || !rivals4.length || !rivals2.length || !mine1.length || !mine3.length) fail('4', `a save drew no card to read: S1 ${rivals1.length} rivals and ${mine1.length} of mine, S2 ${rivals2.length} rivals, S3 ${mine3.length} of mine`);
  /* The thin line follows the reader's share on every save: S4 is on full record, S2 is not, S1 says what it reads. */
  for (const [nm, cs, lb] of [['S1', rivals1, lb1], ['S4', rivals4, lb4], ['S2', rivals2, lb2]]) {
    for (const c of cs) {
      const thin = lb.share < boards.BOOK_FULL_SHARE;
      if (thin && !thinText(c).includes(`: ${lb.share} in 100 of the other clubs' goals have a name.`)) fail('4', `${nm} ${c.name}: the thin data line reads "${thinText(c)}", the reader's share is ${lb.share}`);
      if (!thin && c.notes.includes('thin')) fail('4', `${nm} ${c.name}: the thin data line on a league on full record (share ${lb.share})`);
    }
  }
  for (const c of mine1) if (c.notes.includes('keptfrom')) fail('4', `S1 ${c.name}: the kept from line on a save that kept every season`);
  for (const c of mine3) {
    const t = c.texts[c.notes.indexOf('keptfrom')] ?? '';
    if (t !== `Seasons before ${label3} were played before the game kept them.`) fail('4', `S3 ${c.name}: the kept from line reads "${t}"`);
  }
  console.log(`4       lines read on ${rivals1.length} S1 rival cards (share ${lb1.share}), ${rivals4.length} S4 rival cards (share ${lb4.share}), ${mine1.length} S1 cards of mine, ${rivals2.length} S2 rival cards (share ${lb2.share}), ${mine3.length} S3 cards of mine (kept from ${label3})`);
}

/* 5: a match with cards opened is the match without them. */
{
  const arms = [];
  for (const look of [true, false]) {
    const { context, page } = await openPage(S.S1, [390, 844]);
    try {
      if (look) await lookAround(page);
      await toHub(page);
      const draws = await pageDraws(page);
      const after = await quickSim(page);
      arms.push({ look, draws, save: JSON.stringify(after) });
    } catch (e) { fail('5', `the ${look ? 'looking' : 'plain'} arm could not go on: ${String(e?.message ?? e).split('\n')[0].slice(0, 200)}`); }
    await context.close();
  }
  tick('5', 2);
  if (arms.length === 2) {
    const [a, b] = arms;
    if (a.draws !== b.draws) fail('5', `the page drew ${a.draws} times before the match with cards opened and ${b.draws} without`);
    if (a.save !== b.save) {
      const ka = JSON.parse(a.save); const kb = JSON.parse(b.save);
      const keys = [...new Set([...Object.keys(ka), ...Object.keys(kb)])].filter(k => JSON.stringify(ka[k]) !== JSON.stringify(kb[k]));
      fail('5', `the save after one Quick Sim differs with cards opened before it, in ${keys.join(', ')}`);
    }
    console.log(`5       the page drew ${a.draws} and ${b.draws} times before the match; the two saves are ${a.save === b.save ? 'equal' : 'NOT equal'} (${a.save.length} characters)`);
  }
}
await browser.close();

/* ---------- the verdict ---------- */
let total = 0;
const NAMES = { 1: 'the page is the reader', 2: 'the fit', 3: 'nothing stacks or jumps', 4: 'the lines', 5: 'a match with cards opened' };
for (const s of SECTIONS) {
  const xs = red.get(s);
  total += xs.length;
  console.log(`${xs.length ? 'RED  ' : 'green'} ${s} ${NAMES[s]}: ${checked.get(s)} checks${xs.length ? `, ${xs.length} failed` : ''}`);
}
if (CONTROL) {
  const want = CONTROLS[CONTROL];
  const others = SECTIONS.filter(s => s !== want && red.get(s).length);
  const fired = red.get(want).length > 0 && !others.length;
  console.log(fired
    ? `playCmPlayerCard: CONTROL ${CONTROL} FIRED: section ${want} went red (${red.get(want).length} failures) and no other did`
    : `playCmPlayerCard: CONTROL ${CONTROL} DID NOT FIRE as it must: section ${want} has ${red.get(want).length} failures, other red sections [${others.join(', ')}]`);
  process.exit(fired ? 1 : 3);
}
console.log(total === 0 ? 'playCmPlayerCard: green, 5 sections at 320, 390 and 1280' : `playCmPlayerCard: ${total} FAILURE(S)`);
process.exit(total === 0 ? 0 : 1);
