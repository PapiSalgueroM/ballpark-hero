/* Round 1229 review (lens RUN): play Club Manager the way a player would, on a served build, and read the
 * league book out of the save the page itself wrote. The round changes no screen, so what is judged is:
 * the game still plays at 390 and 1280 with reduced motion off and on, the Stats screen is still the old
 * board, the save in localStorage carries a book that obeys the first law after matches played through the
 * INTERFACE (quick sim and one live match with its half time), the book survives a page reload, an old
 * save with no book still loads and plays and gains none, and the two dailies never store one.
 * BASE comes from the environment; supabase.co is blocked; screenshots and report.json go to RC_OUT. */
import fs from 'node:fs';
import path from 'node:path';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const { chromium } = pw;
const BASE = process.env.BASE || process.env.SWEEP_BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || path.resolve('.tmp-fx/walk-out');
fs.mkdirSync(OUT, { recursive: true });
const KEY = 'dukb-club-manager-save';
const report = { base: BASE, parts: {}, findings: [], pageErrors: [] };
const say = m => console.log(`   ${m}`);
const bad = m => { report.findings.push(m); console.log(`   FINDING ${m}`); };
const browser = await chromium.launch({ args: ['--no-sandbox', '--no-proxy-server'] });

async function open(viewport, reduced, seedRaw) {
  const ctx = await browser.newContext({
    viewport, reducedMotion: reduced ? 'reduce' : 'no-preference',
    ...(seedRaw ? { storageState: { cookies: [], origins: [{ origin: BASE, localStorage: [{ name: KEY, value: seedRaw }] }] } } : {}),
  });
  await ctx.route(/supabase\.co/, r => r.abort());
  const page = await ctx.newPage();
  page.on('pageerror', e => { const m = String(e).split('\n')[0].slice(0, 200); report.pageErrors.push(m); console.log(`   PAGE ERROR ${m}`); });
  return { ctx, page };
}
const text = async page => (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
const heading = async page => ((await page.locator('h1').first().innerText().catch(() => '')) || '').trim().toUpperCase();
async function tap(page, rx) {
  const b = page.getByRole('button', { name: rx }).first();
  if (!(await b.count().catch(() => 0))) return false;
  if (await b.isDisabled().catch(() => false)) return false;
  return b.click({ timeout: 4000 }).then(() => true).catch(() => false);
}
async function clearRoom(page) {
  await page.getByRole('button', { name: /^essential only$/i }).first().click({ timeout: 1200 }).catch(() => {});
  for (let i = 0; i < 3; i++) {
    if (!(await page.locator('[role="dialog"][data-state="open"]').count().catch(() => 0))) break;
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(250);
  }
}
const shot = async (page, name) => { await page.screenshot({ path: path.join(OUT, `${name}.png`) }).catch(e => say(`no shot ${name}: ${e.message}`)); };

/** The first law, read by the page from the save it wrote: rows + own goals + unnamed = goals for, every rival. */
const lawInPage = () => {
  const raw = localStorage.getItem('dukb-club-manager-save');
  if (!raw) return { save: false };
  const s = JSON.parse(raw);
  const book = s.leagueBook;
  const out = {
    save: true, club: s.clubName, season: s.season, week: s.week, hasBook: !!book, bytes: raw.length,
    bookBytes: book ? JSON.stringify(book).length : 0, stamp: book ? book.s : null, nullInBook: book ? JSON.stringify(book).includes('null') : false,
    bad: [], clubsWithEntry: 0, rows: 0, goalsFor: 0, onRows: 0, og: 0, u: 0, assists: 0, sheets: 0, my: book && Array.isArray(book.my) ? book.my.length : 0,
    race: Array.isArray(s.scorerRace) ? s.scorerRace.length : -1, played: 0,
  };
  if (!book) return out;
  for (const r of s.table) {
    if (r.club === s.clubName) { out.played = r.w + r.d + r.l; if (book.c[r.club]) out.bad.push('my own club has an entry in the book'); continue; }
    const e = book.c[r.club] || { m: {}, og: 0, u: 0 };
    const rows = Object.values(e.m);
    const goals = rows.reduce((n, row) => n + row[0], 0);
    if (book.c[r.club]) out.clubsWithEntry += 1;
    out.rows += rows.length; out.goalsFor += r.gf; out.onRows += goals; out.og += e.og; out.u += e.u;
    out.assists += rows.reduce((n, row) => n + row[1], 0); out.sheets += rows.reduce((n, row) => n + row[2], 0);
    if (goals + e.og + e.u !== r.gf) out.bad.push(`${r.club}: ${goals} on rows + ${e.og} og + ${e.u} unnamed, table says ${r.gf}`);
    if (rows.some(row => !Array.isArray(row) || row.length !== 4 || row.some(v => !Number.isInteger(v) || v < 0))) out.bad.push(`${r.club}: a row is not four counts`);
  }
  return out;
};
async function law(page, label, wantBook) {
  const got = await page.evaluate(lawInPage).catch(e => ({ error: String(e) }));
  const line = got.save ? `${got.club} season ${got.season} week ${got.week}: book ${got.hasBook ? `${got.bookBytes} bytes, ${got.clubsWithEntry} clubs, ${got.rows} rows, ${got.onRows}+${got.og}+${got.u} of ${got.goalsFor} goals, ${got.assists} assists, ${got.sheets} sheets, mine ${got.my}` : 'none'}; save ${got.bytes} bytes` : 'no save';
  say(`${label}: ${line}`);
  if (!got.save) bad(`${label}: no save in localStorage`);
  else if (wantBook && !got.hasBook) bad(`${label}: the save carries no league book`);
  else if (!wantBook && got.hasBook) bad(`${label}: the save carries a league book and must not`);
  if (got.bad && got.bad.length) bad(`${label}: ${got.bad.slice(0, 4).join(' | ')}`);
  if (got.nullInBook) bad(`${label}: the stored book holds a null`);
  return got;
}

/** Play `want` fixtures through the interface. `live` plays the first of them in the live viewer (skip, half time, skip). */
async function playEntries(page, want, live) {
  let done = 0;
  let usedLive = false;
  let halftimes = 0;
  for (let step = 0; step < want * 16 && done < want; step++) {
    const t = await text(page);
    const h = await heading(page);
    if (/SEASON \d+ COMPLETE/i.test(t) || /SACKED!/.test(t)) break;
    if (/This page broke/i.test(t)) { bad('the error boundary is on screen'); break; }
    if (h === 'HALF TIME' || (h === 'MATCH LIVE' && /Second half/i.test(t))) { halftimes += 1; await tap(page, /Second half/i); await page.waitForTimeout(800); continue; }
    if (h === 'MATCH LIVE') {
      if (await tap(page, /full report/i)) { await page.waitForTimeout(700); continue; }
      if (await tap(page, /skip/i)) { await page.waitForTimeout(900); continue; }
      await page.waitForTimeout(1500); continue;
    }
    if (h === 'FULL TIME') { done += 1; await tap(page, /continue|next|carry on|ok/i); await page.waitForTimeout(700); continue; }
    if (/Open the Window/i.test(t) && await tap(page, /Open the Window/i)) {
      await page.waitForTimeout(600);
      await page.locator('button:visible').filter({ hasText: /^Home$/ }).first().click({ timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(500); continue;
    }
    const way = page.locator(`[data-cm-way="${live && !usedLive ? 'live' : 'quick'}"]`).first();
    if (await way.count().catch(() => 0)) { if (live) usedLive = true; await way.click({ timeout: 4000 }).catch(() => {}); await page.waitForTimeout(1000); continue; }
    if (!(await tap(page, /Club home|back to club|continue|next/i))) { await page.keyboard.press('Escape').catch(() => {}); await page.waitForTimeout(500); }
  }
  return { done, halftimes };
}

const bookOf = page => page.evaluate(k => { try { return JSON.stringify(JSON.parse(localStorage.getItem(k)).leagueBook ?? null); } catch { return 'unreadable'; } }, KEY);
async function gotoGame(page) {
  await page.goto(`${BASE}/club-manager`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1500);
  await clearRoom(page);
}
/** Open the Stats screen from the hub, shoot it, read what the award races card says, and come back. */
async function statsScreen(page, name) {
  const tile = page.locator('button:visible').filter({ hasText: /Stats\s*\d+ goals/ }).first();
  if (!(await tile.count().catch(() => 0))) { bad(`${name}: no Stats tile on the hub`); return null; }
  await tile.click({ timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(900);
  await shot(page, `${name}-stats-top`);
  const races = page.getByText(/Award races/i).first();
  let card = '';
  if (await races.count().catch(() => 0)) {
    await races.scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(300);
    card = await races.locator('xpath=ancestor::div[2]').innerText().catch(() => '');
  }
  await shot(page, `${name}-stats-races`);
  const t = await text(page);
  const wide = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (wide > 1) bad(`${name}: the Stats screen scrolls sideways by ${wide}px`);
  if (/League leaders|league book/i.test(t)) bad(`${name}: the Stats screen shows league book copy, and this round ships no screen`);
  if (/This page broke/i.test(t)) bad(`${name}: the Stats screen broke`);
  if (!(await tap(page, /Club home/i))) bad(`${name}: no way back from the Stats screen`);
  await page.waitForTimeout(500);
  return card.replace(/\s+/g, ' ').slice(0, 600);
}

/* ---------- part 1: a new career through the picker, 390 x 844, motion on ---------- */
let carried = null;
{
  console.log('1) a new career at 390 x 844, motion on');
  const { ctx, page } = await open({ width: 390, height: 844 }, false, null);
  await gotoGame(page);
  await shot(page, 'p1-390-picker');
  await tap(page, /2026-27/i);
  await page.getByRole('button', { name: /England/i }).first().waitFor({ timeout: 8000 }).catch(() => {});
  await tap(page, /England/i);
  await page.getByRole('button', { name: /Premier League/i }).first().waitFor({ timeout: 8000 }).catch(() => {});
  await tap(page, /Premier League/i);
  const club = page.locator('button').filter({ hasText: /Everton|Fulham|Brentford|Crystal Palace|Wolves|Brighton/ }).first();
  await club.waitFor({ timeout: 8000 }).catch(() => {});
  await club.click({ timeout: 5000 }).catch(() => {});
  await tap(page, /take the job|confirm|start/i);
  await page.getByText(/who is in the dugout/i).first().waitFor({ timeout: 8000 }).catch(() => {});
  await tap(page, /skip: just manage/i);
  await page.waitForTimeout(1500);
  if (!/Season 1/i.test(await text(page))) bad('part 1: could not get past the club picker');
  await shot(page, 'p1-390-hub-day-one');
  const day1 = await law(page, 'part 1, day one', true);
  const live = await playEntries(page, 1, true);
  say(`part 1: fixtures played live ${live.done}, half times seen ${live.halftimes}`);
  if (live.done !== 1 || live.halftimes < 1) bad(`part 1: the live match did not go through its half time (${live.done} played, ${live.halftimes} half times)`);
  const afterLive = await law(page, 'part 1, after one live match', true);
  const quick = await playEntries(page, 5, false);
  if (quick.done !== 5) bad(`part 1: only ${quick.done} of 5 quick sims were played`);
  await shot(page, 'p1-390-hub-after-six');
  const afterSix = await law(page, 'part 1, after five quick sims more', true);
  if (afterSix.hasBook && afterSix.clubsWithEntry < 10) bad(`part 1: after six fixtures only ${afterSix.clubsWithEntry} rival clubs have an entry`);
  const card = await statsScreen(page, 'p1-390');
  const before = await bookOf(page);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1800);
  await clearRoom(page);
  const after = await bookOf(page);
  if (before !== after) bad('part 1: the stored book changed across a page reload with nothing played');
  await shot(page, 'p1-390-hub-after-reload');
  const more = await playEntries(page, 2, false);
  if (more.done !== 2) bad(`part 1: only ${more.done} of 2 fixtures were played after the reload`);
  const afterReload = await law(page, 'part 1, two fixtures after a page reload', true);
  if (afterReload.hasBook && afterSix.hasBook && afterReload.goalsFor <= afterSix.goalsFor) bad('part 1: the league did not move after the reload');
  carried = await page.evaluate(k => localStorage.getItem(k), KEY);
  report.parts.p1 = { day1, afterLive, afterSix, afterReload, card };
  await ctx.close();
}

/* ---------- part 2: the same career at 1280 x 900 with reduced motion ---------- */
if (carried) {
  console.log('2) the same career at 1280 x 900, reduced motion');
  const { ctx, page } = await open({ width: 1280, height: 900 }, true, carried);
  await gotoGame(page);
  await shot(page, 'p2-1280-hub');
  const opened = await law(page, 'part 2, opened', true);
  const card = await statsScreen(page, 'p2-1280');
  const live = await playEntries(page, 1, true);
  if (live.done !== 1) bad('part 2: the live match under reduced motion did not finish');
  await shot(page, 'p2-1280-after-live');
  const quick = await playEntries(page, 3, false);
  const end = await law(page, 'part 2, after one live and three quick', true);
  report.parts.p2 = { opened, end, card, live, quick };
  await ctx.close();
}

/* ---------- parts 3 and 4: the two committed old saves (no book), 390 reduced and 1280 motion on ---------- */
for (const [n, file, viewport, reduced] of [
  [3, 'scripts/data/cmOldSave1052Fixture.json', { width: 390, height: 844 }, true],
  [4, 'scripts/data/cmSecondTierOldSaveFixture.json', { width: 1280, height: 900 }, false],
]) {
  console.log(`${n}) an old save with no book: ${file}, ${viewport.width} wide, reduced motion ${reduced}`);
  const raw = fs.readFileSync(file, 'utf8');
  if (JSON.parse(raw).leagueBook !== undefined) { bad(`part ${n}: the fixture carries a book, it is not an old save`); continue; }
  const { ctx, page } = await open(viewport, reduced, raw);
  await gotoGame(page);
  await shot(page, `p${n}-${viewport.width}-old-hub`);
  const opened = await law(page, `part ${n}, old save opened`, false);
  const played = await playEntries(page, 3, false);
  if (played.done < 1) bad(`part ${n}: the old save played no fixture`);
  const end = await law(page, `part ${n}, old save after ${played.done} fixtures`, false);
  const card = await statsScreen(page, `p${n}-${viewport.width}-old`);
  report.parts[`p${n}`] = { opened, end, card, played };
  await ctx.close();
}

/* ---------- part 5: the two dailies never store a book ---------- */
for (const route of ['/manager-hot-seat', '/deadline-day']) {
  console.log(`5) ${route} at 390 x 844`);
  const slug = route.replace(/\//g, '-');
  const { ctx, page } = await open({ width: 390, height: 844 }, false, null);
  await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1500);
  await clearRoom(page);
  await shot(page, `p5${slug}-open`);
  const pressed = [];
  for (let i = 0; i < 10; i++) {
    const b = page.locator('button:visible').filter({ hasText: /start|play|take the|begin|kick off|balanced|next match|continue|sign|bid|today/i }).first();
    if (!(await b.count().catch(() => 0))) break;
    const label = ((await b.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').slice(0, 30);
    if (!(await b.click({ timeout: 3000 }).then(() => true).catch(() => false))) break;
    pressed.push(label);
    await page.waitForTimeout(700);
  }
  await shot(page, `p5${slug}-played`);
  const store = await page.evaluate(() => Object.keys(localStorage).map(k => ({ k, bytes: (localStorage.getItem(k) || '').length, book: (localStorage.getItem(k) || '').includes('leagueBook') })));
  const withBook = store.filter(x => x.book).map(x => x.k);
  if (withBook.length) bad(`${route}: these stored keys carry a league book: ${withBook.join(', ')}`);
  if (/This page broke/i.test(await text(page))) bad(`${route}: the error boundary is on screen`);
  say(`${route}: pressed [${pressed.join(' | ')}], stored keys ${store.map(x => `${x.k}:${x.bytes}`).join(', ')}`);
  report.parts[`p5${route}`] = { pressed, store };
  await ctx.close();
}

await browser.close();
fs.writeFileSync(path.join(OUT, 'walk-report.json'), JSON.stringify(report, null, 2));
const total = report.findings.length + report.pageErrors.length;
console.log(total ? `walk1229: ${report.findings.length} FINDING(S), ${report.pageErrors.length} page error(s)` : 'walk1229: green, nothing found');
process.exit(total ? 1 : 0);
