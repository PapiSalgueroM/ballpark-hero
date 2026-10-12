/**
 * Round 1311: Club Manager's league leaders, walked on the built site.
 *
 * The saves are built here by the engine bundle (the way scripts/playCmQuickSubs.mjs builds its fixtures),
 * on a seeded stream, and put under the save key before the page loads:
 *   S1 an Everton career twenty entries into its season: a whole league (every club fields an eleven);
 *   S2 a Hertha BSC career twenty entries in: the 2. Bundesliga, where much of the league is not on record;
 *   S3 S1 with its book taken off (a save from before the book), then one league match played ON THE PAGE;
 *   S4 an Arsenal season played to its end and closed: the season review with the league's awards;
 *   S5 an Arsenal career in its seventh season: six past seasons of winners, the oldest without its team.
 * (S4 and S5 take the first of six seeds on which the manager keeps his job.)
 * At 320 by 568, 390 by 844 and 1280 by 900, Chromium, the database host blocked and every other host too.
 *
 * What it holds, each read from what the page draws:
 *   1 THE PAGE SHOWS WHAT THE READER SAYS: every row of every board (name, club, number, my men marked, made
 *     up men tagged) is leaders() of the same save, computed here from the same bundle.
 *   2 THE FIT: nothing runs sideways (scrollWidth is not over innerWidth); every tile, step button, back
 *     button and "?" is at least 44 px both ways and a hit test at its middle lands on it; at 390 and 1280 a
 *     board's card is no taller than the window; at 320 no name inside a tile is cut, and on a board row the
 *     name and the number are never cut (the club may be): measured on the rectangles, not on textContent.
 *   3 NOTHING STACKS AND NOTHING JUMPS: with a board open the Stats screen holds no player table and no team
 *     record; the back button is inside the window after the tap; after Back, window.scrollY is what it was
 *     before the tap, give or take a pixel.
 *   4 THE LINES, word for word, each on the save that earns it and on no other: S1 no thin data line and no
 *     late line; S2 the thin data line with the share the reader gives; S3 the empty state before its match
 *     and, after it, "Counting from round N" with NO thin data line (a young book in a whole league is not
 *     thin, the critic's correction 2); S4 the review's two new award lines and its team of the season tile
 *     (eleven men, a back button); S5 Past winners, newest first, the fifth newest season with its team and
 *     the sixth saying its team was let go.
 *   5 A MATCH WITH THE BOARDS OPEN IS THE MATCH WITHOUT THEM: two fresh contexts open S1 on one page seed
 *     (scripts/lib/pageSeed.mjs) and one clock; one opens all three boards and comes back, the other does
 *     not; both press Quick Sim once. The page has drawn the same count before the press, and the two saves
 *     are equal. KEYS LEFT OUT OF THAT COMPARISON: none. The page's clock is fixed in both contexts, so the
 *     save holds no key that differs by the clock.
 *
 * Controls (each must turn its own section red and no other: exit 1 and "FIRED" when it does, 3 when not):
 *   LEADERS_CONTROL=swap       the page's first row number is rewritten as it is drawn   -> 1
 *   LEADERS_CONTROL=wide       a board row is forced 480 px wide                          -> 2
 *   LEADERS_CONTROL=stack      a player table is left mounted under an open board         -> 3
 *   LEADERS_CONTROL=thin       the thin data line is forced onto S1's whole league        -> 4
 *   LEADERS_CONTROL=younglate  the thin data line is forced onto the young late book (S3) -> 4
 *   LEADERS_CONTROL=write      opening a board writes a key into the save                 -> 5
 * LEADERS_REPORT=1 is a measuring pass: it prints the rectangles and judges nothing of section 2.
 *
 * Run on a served build (a remote check with #!serve and #!playwright): node scripts/playCmLeagueLeaders.mjs
 * Pictures of every state go into $RC_OUT (or cm-league-leaders-artifacts/ when it is not set).
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
const OUT = process.env.RC_OUT || path.join(ROOT, 'cm-league-leaders-artifacts');
const KEY = 'dukb-club-manager-save';
const NOW = Date.parse('2026-10-12T16:00:00Z');
const CONTROL = process.env.LEADERS_CONTROL || '';
const REPORT = process.env.LEADERS_REPORT === '1';
const CONTROLS = { swap: '1', wide: '2', stack: '3', thin: '4', younglate: '4', write: '5' };
const SECTIONS = ['1', '2', '3', '4', '5'];
const SIZES = [[320, 568], [390, 844], [1280, 900]];
const cannot = why => { console.log(`playCmLeagueLeaders: COULD NOT RUN: ${why}`); process.exit(2); };
if (!BASE) cannot('no served build: set BASE (a remote check with #!serve sets it)');
if (CONTROL && !CONTROLS[CONTROL]) cannot(`unknown control ${CONTROL}`);
fs.mkdirSync(OUT, { recursive: true });

const red = new Map(SECTIONS.map(s => [s, []]));
const checked = new Map(SECTIONS.map(s => [s, 0]));
const fail = (s, m) => { red.get(s).push(m); console.log(`  FAIL ${s}: ${m}`); };
const tick = (s, n = 1) => checked.set(s, checked.get(s) + n);
const DASHES = [String.fromCharCode(0x2013), String.fromCharCode(0x2014)];

/* ---------- the engine, and the saves ---------- */
const memory = new Map();
globalThis.localStorage = { getItem: k => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, String(v)), removeItem: k => memory.delete(k) };
/* The bundle goes to a temp folder of its own, never into OUT (OUT comes back with the pictures). */
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'cm-leaders-'));
process.on('exit', () => { try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* nothing to undo */ } });
const ENTRY = path.join(TMP, 'leaders-entry.mjs');
const BUNDLE = path.join(TMP, 'leaders-engine.mjs');
const P = f => JSON.stringify(path.join(ROOT, f).replaceAll('\\', '/'));
fs.writeFileSync(ENTRY, `export * as cm from ${P('src/lib/clubManager.ts')};\nexport * as boards from ${P('src/lib/clubManagerLeagueBoards.ts')};\n`);
try {
  await build({ entryPoints: [ENTRY], bundle: true, platform: 'node', format: 'esm', outfile: BUNDLE, alias: { '@': path.join(ROOT, 'src') }, logLevel: 'error',
    loader: { '.css': 'empty', '.png': 'empty', '.svg': 'empty', '.jpg': 'empty', '.webp': 'empty' } });
} catch (e) { cannot(`the engine did not bundle: ${String(e?.message ?? e).slice(0, 200)}`); }
const { cm, boards } = await import(pathToFileURL(BUNDLE).href);
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

/** Play a fresh career until `entries` entries are played and the next one is a league match of mine. */
function careerAt(club, seed, entries) {
  return onStream(seed, () => {
    let s = cm.startCareer(club);
    let n = 0;
    while (s.week < s.calendar.length && (n < entries || s.calendar[s.week]?.type !== 'league') && n < entries + 12) {
      s = cm.playNextEntry(s, { skipHalftime: true }).state;
      n += 1;
    }
    return s;
  });
}
/** Play a career to the end of its season. */
function toSeasonEnd(s) {
  for (let guard = 0; guard < 220 && s.week < s.calendar.length; guard += 1) {
    const r = cm.playNextEntry(s, { skipHalftime: true });
    s = r.state;
    if (r.kind === 'seasonOver') break;
  }
  return s;
}
const S = {};
S.S1 = careerAt('Everton', 0x131101, 20);
S.S2 = careerAt('Hertha BSC', 0x131102, 20);
S.S3 = JSON.parse(JSON.stringify(S.S1));
delete S.S3.leagueBook;
/* A club that is not sacked on the seed it is played on: the first seed of a few that keeps the job. */
function kept(make, seed) {
  for (let k = 0; k < 6; k += 1) {
    const s = onStream(seed + k * 7919, make);
    if (s && !s.sacked) return s;
  }
  return null;
}
S.S4 = kept(() => cm.finishSeason(toSeasonEnd(cm.startCareer('Arsenal'))).state, 0x131104);
S.S5 = kept(() => {
  let s = cm.startCareer('Arsenal');
  for (let season = 0; season < 6 && !s.sacked; season += 1) s = cm.startNextSeason(cm.finishSeason(toSeasonEnd(s)).state);
  for (let k = 0; k < 6 && !s.sacked; k += 1) s = cm.playNextEntry(s, { skipHalftime: true }).state;
  return s;
}, 0x131105);
for (const [name, s] of Object.entries(S)) {
  if (!s || s.sacked) cannot(`${name} could not be built (sacked or empty)`);
  fs.writeFileSync(path.join(OUT, `save-${name}.json`), JSON.stringify(s));
}
if (!S.S4.pendingSummary?.awards) cannot('S4 closed its season with no awards (the book did not decide a Premier League season)');
const pastSeasons = S.S5.history.filter(h => h.awards).length;
if (pastSeasons < 2) cannot(`S5 holds ${pastSeasons} seasons with awards: Past winners cannot be stepped`);
console.log(`playCmLeagueLeaders: saves built: S1 week ${S.S1.week}, S2 week ${S.S2.week}, S3 week ${S.S3.week} (no book), S4 season ${S.S4.season} closed, S5 season ${S.S5.season} with ${pastSeasons} past seasons of winners${CONTROL ? `; CONTROL ${CONTROL}` : ''}`);

/** What the reader says of a save as the page holds it. */
function readerOf(save) {
  cm.registerCustomClub?.(save.customClub ?? null, save.eraId);
  cm.registerLeagueOverrides?.(save.leagueOverrides ?? null);
  const lb = cm.leagueBoardsOf(save);
  if (!lb) return null;
  const out = { share: lb.share, from: lb.from, keepers: lb.keepers };
  for (const kind of ['goals', 'assists', 'sheets']) out[kind] = boards.leaders(lb.input, kind).map(m => ({ name: m.name, club: m.club, n: String(m.n), mine: m.mine === true, gen: m.gen === true }));
  return out;
}

/* ---------- the page ---------- */
const SEED = pageSeedOf(import.meta.url, process.env.LEADERS_SEED);
console.log(`playCmLeagueLeaders: page seed ${SEED}`);
let browser;
try { browser = await pw.chromium.launch({ headless: true }); } catch (e) { cannot(`the browser did not start: ${String(e?.message ?? e).slice(0, 160)}`); }
const base = new URL(BASE);

/** The control, as a script that runs in the page before anything else. */
function controlScript({ control, key }) {
  const watch = fn => new MutationObserver(fn).observe(document, { subtree: true, childList: true, characterData: true });
  if (control === 'swap') watch(() => { const el = document.querySelector('[data-cm-board-n]'); if (el && !el.dataset.swapped) { el.dataset.swapped = '1'; el.textContent = String(Number(el.textContent) + 1); } });
  if (control === 'wide') document.addEventListener('DOMContentLoaded', () => { const st = document.createElement('style'); st.textContent = '[data-cm-board-row]{min-width:480px}'; document.head.appendChild(st); });
  if (control === 'stack') watch(() => { const host = document.querySelector('[data-cm-stats-board]'); if (host && !host.querySelector('[data-stacked]')) { const d = document.createElement('div'); d.dataset.stacked = '1'; d.textContent = 'Every player · tap a column to sort'; host.appendChild(d); } });
  const forceThin = when => watch(() => { const card = document.querySelector('[data-cm-leaders]'); if (card && when(card) && !card.querySelector('[data-forced]')) { const p = document.createElement('p'); p.dataset.forced = '1'; p.setAttribute('data-cm-leaders-thin', ''); p.textContent = 'The data covers only part of this league.'; card.appendChild(p); } });
  if (control === 'thin') forceThin(() => !document.querySelector('[data-cm-leaders-thin]:not([data-forced])'));
  if (control === 'younglate') forceThin(card => Boolean(card.querySelector('[data-cm-leaders-late]')));
  if (control === 'write') {
    let opened = false;
    document.addEventListener('click', e => { if (e.target.closest?.('[data-cm-leaders-tile]')) opened = true; }, true);
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (name, value) {
      if (this === localStorage && name === key && opened) { const o = JSON.parse(value); o.boardOpened = true; value = JSON.stringify(o); }
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
async function toStats(page) {
  const tile = page.locator('button:visible').filter({ has: page.locator('div', { hasText: /^Stats$/ }) }).first();
  /* After a match the report stands over the hub: the way back is one of these. */
  for (let k = 0; k < 4 && !(await tile.isVisible().catch(() => false)); k += 1) {
    const away = page.locator('button:visible').filter({ hasText: /^(Continue|Club home|Back to the club|Done)/ }).first();
    if (await away.count()) await away.click().catch(() => {});
    await page.waitForTimeout(800);
  }
  await tile.waitFor();
  await tile.click();
  await page.locator('[data-cm-leaders]').first().waitFor();
}
/** Rectangles of the things a finger must hit, and whether a hit test at the middle lands on each. */
const targets = page => page.evaluate(() => [...document.querySelectorAll('[data-cm-leaders-tile],[data-cm-leaders-back],[data-cm-leaders-help],[data-cm-past-step]')].map(el => {
  const r = el.getBoundingClientRect();
  const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
  return { what: el.getAttribute('data-cm-leaders-tile') ?? el.getAttribute('data-cm-past-step') ?? (el.hasAttribute('data-cm-leaders-back') ? 'back' : 'help'), w: r.width, h: r.height, top: r.top, bottom: r.bottom, hit: Boolean(hit && (hit === el || el.contains(hit))), visible: r.bottom > 0 && r.top < innerHeight };
}));

/** The tiles view of one save at one size: every board opened, read, measured, and closed again. */
async function walkBoards(name, save, size) {
  const tag = `${name}-${size[0]}`;
  const { context, page, errors } = await openPage(save, size);
  try {
    await toStats(page);
    const held = await saved(page);
    const want = readerOf(held);
    await shot(page, `${tag}-tiles`);
    const view = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth, ih: innerHeight }));
    tick('2');
    if (view.sw > view.iw) fail('2', `${tag}: the page runs sideways on the tiles (${view.sw} wide in ${view.iw})`);
    /* At 320 no leader's name is cut inside a tile. */
    const cut = await page.evaluate(() => [...document.querySelectorAll('[data-cm-leaders-tile]')].flatMap(tile => {
      const name = tile.querySelector('span.font-bold');
      if (!name) return [];
      const t = tile.getBoundingClientRect(); const r = name.getBoundingClientRect();
      return name.scrollWidth > name.clientWidth + 1 || r.right > t.right + 0.5 || r.left < t.left - 0.5 ? [name.textContent] : [];
    }));
    tick('2');
    if (cut.length && !REPORT) fail('2', `${tag}: a leader's name is cut inside its tile: ${cut.join(', ')}`);
    for (const t of await targets(page)) {
      tick('2');
      if (REPORT) console.log(`  report ${tag} ${t.what} ${t.w.toFixed(1)} x ${t.h.toFixed(1)} hit ${t.hit}`);
      else if (t.w < 44 || t.h < 44 || (t.visible && !t.hit)) fail('2', `${tag}: ${t.what} is ${t.w.toFixed(1)} by ${t.h.toFixed(1)}${t.visible && !t.hit ? ' and a tap at its middle lands on something else' : ''}`);
    }
    /* Section 4 on the tiles: the lines this save earns, word for word, and no other. */
    const lines = await page.evaluate(() => ({ thin: document.querySelector('[data-cm-leaders-thin]')?.textContent ?? null, late: document.querySelector('[data-cm-leaders-late]')?.textContent ?? null }));
    tick('4', 2);
    const wantThin = want && want.share < boards.BOOK_FULL_SHARE ? `The data covers only part of this league: ${want.share} in 100 of the other clubs' goals have a name on them. The rest count for the club and nobody else.` : null;
    const wantLate = want && want.from !== null ? `Counting from round ${want.from + 1}. Everything before that is off these boards, your players too.` : null;
    if (lines.thin !== wantThin) fail('4', `${tag}: the thin data line reads ${JSON.stringify(lines.thin)}, the save earns ${JSON.stringify(wantThin)}`);
    if (lines.late !== wantLate) fail('4', `${tag}: the late line reads ${JSON.stringify(lines.late)}, the save earns ${JSON.stringify(wantLate)}`);
    if (!want) return { context, page, errors, want };
    for (const kind of ['goals', 'assists', 'sheets']) {
      await page.evaluate(() => window.scrollTo(0, Math.min(120, document.documentElement.scrollHeight)));
      const before = await page.evaluate(() => scrollY);
      await page.locator(`[data-cm-leaders-tile="${kind}"]`).click();
      await page.locator(`[data-cm-board="${kind}"]`).waitFor();
      await page.waitForTimeout(400);
      await shot(page, `${tag}-${kind}`);
      /* 1: the rows are the reader's. */
      const rows = await page.evaluate(() => [...document.querySelectorAll('[data-cm-board-row]')].map(r => ({
        name: r.querySelector('[data-cm-board-name]')?.textContent ?? '', club: r.querySelector('[data-cm-board-club]')?.textContent ?? '',
        n: r.querySelector('[data-cm-board-n]')?.textContent ?? '', mine: r.hasAttribute('data-mine'), gen: (r.textContent ?? '').includes('MADE UP'),
      })));
      tick('1');
      if (JSON.stringify(rows) !== JSON.stringify(want[kind])) fail('1', `${tag}: the ${kind} board on the page is not the reader's (first row ${JSON.stringify(rows[0] ?? null)} against ${JSON.stringify(want[kind][0] ?? null)}, ${rows.length} rows against ${want[kind].length})`);
      /* 2: fit on the board. */
      const fit = await page.evaluate(() => {
        const card = document.querySelector('[data-cm-board]').getBoundingClientRect();
        const rowsCut = [...document.querySelectorAll('[data-cm-board-row]')].flatMap(r => {
          const rr = r.getBoundingClientRect();
          return ['[data-cm-board-name]', '[data-cm-board-n]'].flatMap(sel => { const el = r.querySelector(sel); if (!el) return []; const e = el.getBoundingClientRect(); return el.scrollWidth > el.clientWidth + 1 || e.right > rr.right + 0.5 || e.left < rr.left - 0.5 ? [el.textContent] : []; });
        });
        return { sw: document.documentElement.scrollWidth, iw: innerWidth, ih: innerHeight, cardH: card.height, rowsCut };
      });
      tick('2', 3);
      if (REPORT) console.log(`  report ${tag} ${kind}: card ${fit.cardH.toFixed(0)} tall in ${fit.ih}, page ${fit.sw} wide in ${fit.iw}`);
      else {
        if (fit.sw > fit.iw) fail('2', `${tag}: the ${kind} board runs sideways (${fit.sw} wide in ${fit.iw})`);
        if (size[0] >= 390 && fit.cardH > fit.ih) fail('2', `${tag}: the ${kind} board is ${fit.cardH.toFixed(0)} tall in a window of ${fit.ih}`);
        if (fit.rowsCut.length) fail('2', `${tag}: on the ${kind} board a name or a number is cut: ${fit.rowsCut.slice(0, 3).join(', ')}`);
        for (const t of await targets(page)) { tick('2'); if (t.w < 44 || t.h < 44 || (t.visible && !t.hit)) fail('2', `${tag}: on the ${kind} board ${t.what} is ${t.w.toFixed(1)} by ${t.h.toFixed(1)}${t.visible && !t.hit ? ' and a tap at its middle lands on something else' : ''}`); }
      }
      /* 3: nothing stacked under it; the back button in the window; Back puts the page where it was. */
      const stack = await page.evaluate(() => ({ text: document.body.innerText, back: document.querySelector('[data-cm-leaders-back]')?.getBoundingClientRect().toJSON() ?? null, ih: innerHeight }));
      tick('3', 3);
      if (/Every player/.test(stack.text) || /all competitions/i.test(stack.text)) fail('3', `${tag}: with the ${kind} board open the Stats screen still holds the player table or the team record`);
      if (!stack.back || stack.back.top < 0 || stack.back.bottom > stack.ih) fail('3', `${tag}: after the tap the ${kind} board's back button is not inside the window`);
      await page.locator('[data-cm-leaders-back]').click();
      await page.locator('[data-cm-leaders-tile="goals"]').waitFor();
      await page.waitForTimeout(300);
      const after = await page.evaluate(() => scrollY);
      if (Math.abs(after - before) > 1) fail('3', `${tag}: Back from the ${kind} board left the page at ${after}, it stood at ${before}`);
    }
    if (errors.length) { tick('1'); fail('1', `${tag}: the page threw: ${errors[0].slice(0, 160)}`); }
    return { context, page, errors, want };
  } catch (e) {
    fail('1', `${tag}: the walk could not go on: ${String(e?.message ?? e).split('\n')[0].slice(0, 200)}`);
    await shot(page, `${tag}-stuck`);
    return { context, page, errors, want: null };
  }
}

/** Quick Sim once from the hub; resolves on the save that week wrote. */
async function quickSim(page) {
  const before = (await saved(page)).week;
  const home = page.locator('button:visible').filter({ hasText: /Club home/ }).first();
  if (await home.count()) await home.click();
  const quick = page.locator('[data-cm-way="quick"]').first();
  await quick.waitFor();
  await quick.click();
  await page.waitForFunction(({ key, week }) => JSON.parse(localStorage.getItem(key)).week > week, { key: KEY, week: before });
  return saved(page);
}

for (const size of SIZES) {
  /* S1 and S2: every board. */
  for (const name of ['S1', 'S2']) {
    const { context } = await walkBoards(name, S[name], size);
    await context.close();
  }
  /* S3: the empty state before its first match, then a late book from the match played on the page. */
  {
    const tag = `S3-${size[0]}`;
    const { context, page } = await openPage(S.S3, size);
    try {
      await toStats(page);
      await shot(page, `${tag}-before`);
      const empty = await page.locator('[data-cm-leaders-empty="nobook"]').textContent().catch(() => null);
      tick('4');
      if (!empty || !empty.includes('No league book for this season yet. It starts with your next league match and counts from there.')) fail('4', `${tag}: before its match the save with no book reads ${JSON.stringify(empty)}`);
      const after = await quickSim(page);
      if (!after.leagueBook || after.leagueBook.r0 === undefined) fail('4', `${tag}: the match played on the page did not open a late book`);
      await page.locator('button:visible').filter({ hasText: /Club home/ }).first().click().catch(() => {});
      await toStats(page);
      await shot(page, `${tag}-after`);
      const want = readerOf(after);
      const lines = await page.evaluate(() => ({ thin: document.querySelector('[data-cm-leaders-thin]')?.textContent ?? null, late: document.querySelector('[data-cm-leaders-late]')?.textContent ?? null }));
      tick('4', 2);
      if (!want || lines.late !== `Counting from round ${want.from + 1}. Everything before that is off these boards, your players too.`) fail('4', `${tag}: after its match the late line reads ${JSON.stringify(lines.late)} (the reader: from ${want?.from})`);
      if (lines.thin !== null) fail('4', `${tag}: a young late book in a whole league draws the thin data line: ${JSON.stringify(lines.thin)}`);
    } catch (e) { fail('4', `${tag}: the walk could not go on: ${String(e?.message ?? e).split('\n')[0].slice(0, 200)}`); await shot(page, `${tag}-stuck`); }
    await context.close();
  }
  /* S4: the season review names the league's two new awards. */
  {
    const tag = `S4-${size[0]}`;
    const { context, page } = await openPage(S.S4, size);
    try {
      const aw = S.S4.pendingSummary.awards;
      await page.locator('[data-cm-award="ast"]').first().waitFor();
      await shot(page, `${tag}-review`);
      const got = await page.evaluate(() => ({ ast: document.querySelector('[data-cm-award="ast"]')?.textContent ?? null, glove: document.querySelector('[data-cm-award="glove"]')?.textContent ?? null, withheld: document.querySelector('[data-cm-award-withheld]')?.textContent ?? null }));
      tick('4', 3);
      if (!aw.ast || !got.ast?.includes(`${aw.ast[0]}`) || !got.ast.includes(`(${aw.ast[1]}, ${aw.ast[2]})`)) fail('4', `${tag}: the review's most assists line reads ${JSON.stringify(got.ast)}, the save holds ${JSON.stringify(aw.ast)}`);
      if (!aw.glove || !got.glove?.includes(`${aw.glove[0]}`) || !got.glove.includes(`(${aw.glove[1]}, ${aw.glove[2]})`)) fail('4', `${tag}: the review's most clean sheets line reads ${JSON.stringify(got.glove)}, the save holds ${JSON.stringify(aw.glove)}`);
      if (got.withheld !== null) fail('4', `${tag}: a season the book decided says its awards were withheld`);
      /* Step 5: the team of the season, one tile, opened in place and closed again. */
      if (aw.xi) {
        const tile = page.locator('[data-cm-team-tile]').first();
        tick('4', 2);
        await tile.click();
        await page.locator('[data-cm-team-open]').waitFor();
        await shot(page, `${tag}-team`);
        const men = await page.locator('[data-cm-team-man]').count();
        if (men !== 11) fail('4', `${tag}: the team of the season shows ${men} men`);
        const back = await page.locator('[data-cm-team-back]').boundingBox();
        tick('2');
        if (!REPORT && (!back || back.width < 44 || back.height < 44)) fail('2', `${tag}: the team's back button is ${back ? `${back.width.toFixed(1)} by ${back.height.toFixed(1)}` : 'missing'}`);
        await page.locator('[data-cm-team-back]').click();
        if (!(await page.locator('[data-cm-team-tile]').count())) fail('4', `${tag}: Back from the team did not bring its tile back`);
      }
    } catch (e) { fail('4', `${tag}: the walk could not go on: ${String(e?.message ?? e).split('\n')[0].slice(0, 200)}`); await shot(page, `${tag}-stuck`); }
    await context.close();
  }
  /* S5: Past winners, newest first, one season at a time. */
  {
    const tag = `S5-${size[0]}`;
    const { context, page } = await openPage(S.S5, size);
    try {
      await toStats(page);
      await page.locator('[data-cm-leaders-tile="past"]').click();
      await page.locator('[data-cm-board="past"]').waitFor();
      await shot(page, `${tag}-past`);
      const seasons = S.S5.history.filter(h => h.awards).map(h => h.season).sort((a, b) => b - a);
      const first = await page.locator('[data-cm-past-season]').getAttribute('data-cm-past-season');
      tick('4', 2);
      if (Number(first) !== seasons[0]) fail('4', `${tag}: Past winners opens on season ${first}, the newest is ${seasons[0]}`);
      await page.locator('[data-cm-past-step="older"]').click();
      const second = await page.locator('[data-cm-past-season]').getAttribute('data-cm-past-season');
      if (Number(second) !== seasons[1]) fail('4', `${tag}: one step older shows season ${second}, not ${seasons[1]}`);
      for (const t of await targets(page)) { tick('2'); if (!REPORT && (t.w < 44 || t.h < 44 || (t.visible && !t.hit))) fail('2', `${tag}: on Past winners ${t.what} is ${t.w.toFixed(1)} by ${t.h.toFixed(1)}`); }
      /* Step 5: the newest five seasons keep their team; the season before them says it was let go. */
      if (seasons.length > 5) {
        for (let k = 2; k < 5; k += 1) await page.locator('[data-cm-past-step="older"]').click();
        tick('4', 2);
        if (!(await page.locator('[data-cm-team]').count())) fail('4', `${tag}: the fifth newest season shows no team of the season`);
        await page.locator('[data-cm-past-step="older"]').click();
        await shot(page, `${tag}-past-sixth`);
        const gone = await page.locator('[data-cm-team-gone]').textContent().catch(() => null);
        if (gone !== 'The team of the season is kept for the last five seasons.') fail('4', `${tag}: the sixth newest season reads ${JSON.stringify(gone)} where its team was let go`);
      }
      const sw = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      tick('2');
      if (!REPORT && sw > 0) fail('2', `${tag}: Past winners runs ${sw} px sideways`);
      const text = await page.evaluate(() => document.body.innerText);
      tick('3');
      if (/Every player/.test(text)) fail('3', `${tag}: Past winners is drawn over the player table`);
      await page.locator('[data-cm-leaders-back]').click();
      await page.locator('[data-cm-leaders-tile="goals"]').waitFor();
    } catch (e) { fail('4', `${tag}: the walk could not go on: ${String(e?.message ?? e).split('\n')[0].slice(0, 200)}`); await shot(page, `${tag}-stuck`); }
    await context.close();
  }
}

/* 5: a match with the boards open is the match without them. Two fresh contexts on one seed and one clock. */
{
  const size = [390, 844];
  const arms = [];
  for (const look of [true, false]) {
    const { context, page } = await openPage(S.S1, size);
    try {
      await toStats(page);
      if (look) {
        for (const kind of ['goals', 'assists', 'sheets']) {
          await page.locator(`[data-cm-leaders-tile="${kind}"]`).click();
          await page.locator(`[data-cm-board="${kind}"]`).waitFor();
          await page.locator('[data-cm-leaders-back]').click();
          await page.locator('[data-cm-leaders-tile="goals"]').waitFor();
        }
      }
      await page.locator('button:visible').filter({ hasText: /Club home/ }).first().click();
      const draws = await pageDraws(page);
      const after = await quickSim(page);
      arms.push({ look, draws, save: JSON.stringify(after) });
    } catch (e) { fail('5', `the ${look ? 'looking' : 'plain'} arm could not go on: ${String(e?.message ?? e).split('\n')[0].slice(0, 200)}`); }
    await context.close();
  }
  tick('5', 2);
  if (arms.length === 2) {
    const [a, b] = arms;
    if (a.draws !== b.draws) fail('5', `the page drew ${a.draws} times before the match with the boards opened and ${b.draws} without`);
    if (a.save !== b.save) {
      const ka = JSON.parse(a.save); const kb = JSON.parse(b.save);
      const keys = [...new Set([...Object.keys(ka), ...Object.keys(kb)])].filter(k => JSON.stringify(ka[k]) !== JSON.stringify(kb[k]));
      fail('5', `the save after one Quick Sim differs with the boards opened before it, in ${keys.join(', ')}`);
    }
    console.log(`5       the page drew ${a.draws} and ${b.draws} times before the match; the two saves are ${a.save === b.save ? 'equal' : 'NOT equal'} (${a.save.length} characters)`);
  }
}
await browser.close();

/* ---------- the verdict ---------- */
let total = 0;
const NAMES = { 1: 'the page is the reader', 2: 'the fit', 3: 'nothing stacks or jumps', 4: 'the lines', 5: 'a match with the boards open' };
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
    ? `playCmLeagueLeaders: CONTROL ${CONTROL} FIRED: section ${want} went red (${red.get(want).length} failures) and no other did`
    : `playCmLeagueLeaders: CONTROL ${CONTROL} DID NOT FIRE as it must: section ${want} has ${red.get(want).length} failures, other red sections [${others.join(', ')}]`);
  process.exit(fired ? 1 : 3);
}
console.log(total === 0 ? 'playCmLeagueLeaders: green, 5 sections at 320, 390 and 1280' : `playCmLeagueLeaders: ${total} FAILURE(S)`);
process.exit(total === 0 ? 0 : 1);
