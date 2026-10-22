/* Round 1540: lottery night and draft night on the NBA Front Office, in a real browser (playNbaLotteryNight).
 *
 * Chromium on a served build (scripts/lib/hostLikeServer.mjs, BASE or SWEEP_BASE, http://localhost:4173 by default),
 * Supabase aborted, the cookie banner answered by scripts/lib/answerConsent.mjs, saves built by construction in node
 * (the engine bundled with esbuild: records set, a real postseason, the champion pushed) and planted from /robots.txt.
 * A screenshot at every step goes to $RC_OUT (or .tmp-fx/lottery-walk).
 *
 * SECTIONS (A, H and J at 320 by 640, 390 by 844 and 1280 by 900; the rest at 390)
 *   A  a lottery club from the recap: Go to the draft, the card and the chances, the closing line hidden until the
 *      last tile, the heading free of where his picks landed, Continue, the run's last row one before his slot, his
 *      two picks, the summer, the way to the hub
 *   B  the club with the best record holding its own first: 29 picks in before his first
 *   C  he holds pick 1: no run card, on the clock at 1
 *   D  he holds no pick: Continue runs the night and the summer
 *   E  reloads at the card (settled, Continue live) and on the clock (the same slot)
 *   F  reduced motion: every tile on its last frame at frame one
 *   G  Continue pressed on frame one
 *   H  the heading "?" opened and closed on the clock: scrollY, the stage's top and its height unchanged
 *   I  a desk off save keeps the old draft: no card
 *   J  the lazy box: the card's chunk held until the box is measured, then the card's first frame against it
 *   N  no jump (critic 1540 correction 4): after Go to the draft, Continue, each pick and the staff press, the
 *      heading tile's top and the first line of the stage are in the viewport
 *   At every step of A: no two tiles overlap; at 390 and 1280 no tile label is cut; at 320 the slot number and the
 *   "you" mark sit inside the tile; every button of the screen at least 44 px tall; no text of the screen's own under
 *   12 px (the run card, the lottery card and the lazy box keep their own small print, counted and skipped).
 *
 * CONTROLS (PLAY_NBA_LOTTERY_CONTROL; each runs the sections it targets and must turn exactly those red)
 *   nocard  the card's lazy chunk aborted: A red
 *   spoil   his landed slot written into the heading before Continue: A red
 *   jump    the lazy box's height overridden: J red
 *   fold    the stage pushed below the fold: N red
 * Exit 0 green, 1 red (or a control that fired, read its last line), 2 could not run, 3 a control that did not fire.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { answerConsent } from './lib/answerConsent.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173';
const CONTROL = process.env.PLAY_NBA_LOTTERY_CONTROL || '';
const OUT = process.env.RC_OUT || path.join(ROOT, '.tmp-fx', 'lottery-walk');
const KEY = 'nba-front-office-save-v1';
const SIZES = [{ w: 320, h: 640 }, { w: 390, h: 844 }, { w: 1280, h: 900 }];
const AT390 = SIZES[1];
const CONTROLS = { nocard: ['A'], spoil: ['A'], jump: ['J'], fold: ['N'] };
if (CONTROL && !CONTROLS[CONTROL]) { console.error(`playNbaLotteryNight: no control ${CONTROL}`); process.exit(2); }
const RUN = CONTROL ? new Set(CONTROLS[CONTROL]) : new Set(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'N']);
const runs = s => RUN.has(s) || (s === 'A' && RUN.has('N'));
fs.mkdirSync(OUT, { recursive: true });

const results = new Map();
function say(section, ok, msg) {
  if (!results.has(section)) results.set(section, { pass: 0, fail: 0 });
  results.get(section)[ok ? 'pass' : 'fail'] += 1;
  if (!ok) console.log(`  FAIL ${section}: ${msg}`);
  else if (process.env.PLAY_NBA_LOTTERY_VERBOSE) console.log(`  ok ${section}: ${msg}`);
}
const ordinal = n => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
const spoils = (text, n) => new RegExp(`\\b${ordinal(n)}\\b|\\bat ${n}\\b|\\bpick ${n}\\b`, 'i').test(text);

/* ---- the engine in node, to build saves ---- */
const { build } = await import('esbuild');
fs.mkdirSync(path.join(ROOT, '.sim-control'), { recursive: true });
const work = fs.mkdtempSync(path.join(ROOT, '.sim-control', 'nba-lottery-walk-'));
process.on('exit', () => { try { fs.rmSync(work, { recursive: true, force: true }); } catch { /* the lead cleans .sim-control */ } });
fs.writeFileSync(path.join(work, 'entry.ts'), [
  "export { initNbaLeague, runNbaPlayoffs, NBA_ROUNDS } from '@/lib/nbaFrontOffice';",
  "export { openNbaDesk, syncNbaPicks, nbaPicksOf } from '@/lib/nbaGmDesk';",
  "export { openNbaDraftNight } from '@/lib/nbaEarnedDraft';",
  "export { movePicks, pickKey } from '@/lib/gmEarnedDraft';",
  "export { withGmBlock } from '@/lib/gmDesk';",
].join('\n'));
await build({ entryPoints: [path.join(work, 'entry.ts')], outfile: path.join(work, 'engine.mjs'), bundle: true, platform: 'node', format: 'esm', logLevel: 'error', alias: { '@': path.join(ROOT, 'src') } });
const N = await import(pathToFileURL(path.join(work, 'engine.mjs')).href);
const clone = v => JSON.parse(JSON.stringify(v));
const lehmer = seed => { let s = seed % 2147483647; if (s <= 0) s += 2147483646; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; };

/** A closed season: ids[0] the worst record, ids[29] the best; `moves` [round, first owner, new holder] before the night. */
function recap(seed, pickMe, moves = () => [], desk = true) {
  const rng = lehmer(seed);
  const league = N.initNbaLeague(rng);
  const ids = Object.keys(league.teams).sort();
  ids.forEach((id, i) => { league.teams[id].wins = 26 + i; league.teams[id].losses = 56 - i; });
  league.round = N.NBA_ROUNDS;
  const { series, champion } = N.runNbaPlayoffs(league, rng);
  league.champions.push({ season: league.season, team: champion });
  const me = pickMe(ids);
  const night = N.openNbaDraftNight(N.openNbaDesk(clone(league), me), clone(league), series, me).night;
  let gm = N.openNbaDesk(league, me);
  let ledger = N.nbaPicksOf(gm, league);
  for (const [round, orig, to] of moves({ me, ids, order: night.order })) ledger = N.movePicks(ledger, [N.pickKey({ year: league.season, round, orig })], to);
  N.syncNbaPicks(league, ledger);
  gm = N.withGmBlock(gm, 'picks', ledger);
  const save = { league, myTeam: me, phase: 'recap', titles: 0, seasonsPlayed: 1, draftClass: null, picksLeft: 0, postseason: { series, champion, gradeLine: null }, ...(desk ? { gm } : {}) };
  const slots = N.openNbaDraftNight(clone(gm), clone(league), series, me).night.slots;
  return { save, me, ids, mine: slots.filter(s => s.holder === me).map(s => s.overall) };
}

/* ---- the browser ---- */
let chromium;
try { ({ chromium } = await import('playwright')); } catch { console.error('playNbaLotteryNight: playwright is not installed'); process.exit(2); }
const browser = await chromium.launch();
process.on('exit', () => { browser.close().catch(() => {}); });
const realErrors = errors => errors.filter(e => !/supabase|Failed to fetch|CORS|ERR_FAILED|NetworkError/i.test(e));
let shots = 0;
async function shot(page, name) {
  shots += 1;
  await page.screenshot({ path: path.join(OUT, `${CONTROL ? `${CONTROL}-` : ''}${name}.jpg`), type: 'jpeg', quality: 45 });
}
async function open(size, save, { reduced = false, holdCard = null, style = '' } = {}) {
  const ctx = await browser.newContext({ viewport: { width: size.w, height: size.h }, ...(reduced ? { reducedMotion: 'reduce' } : {}) });
  await ctx.addInitScript(s0 => { let s = s0; Math.random = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }, 15400);
  const page = await ctx.newPage();
  await page.route(/supabase\.co/, r => r.abort());
  if (CONTROL === 'nocard') await page.route(/GmLotteryCard[^/]*\.js/, r => r.abort());
  if (holdCard) await page.route(/GmLotteryCard[^/]*\.js/, async r => { await holdCard.promise; await r.continue(); });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(`${BASE}/robots.txt`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.evaluate(([k, v]) => { localStorage.clear(); localStorage.setItem(k, v); }, [KEY, JSON.stringify(save)]);
  await page.goto(`${BASE}/nba-front-office`, { waitUntil: 'networkidle', timeout: 60000 });
  await answerConsent(page);
  if (style) await page.addStyleTag({ content: style });
  await page.waitForTimeout(300);
  return { ctx, page, errors };
}
const saved = page => page.evaluate(k => JSON.parse(localStorage.getItem(k)), KEY);
const stage = page => page.evaluate(() => document.querySelector('[data-gm-earned-draft]')?.getAttribute('data-gm-earned-draft') ?? null);
async function press(page, sel) {
  const el = page.locator(sel).first();
  await el.waitFor({ state: 'attached', timeout: 15000 });
  /* No scroll first (Playwright's click scrolls, which would hide a jump): a DOM click, as the house walks do. */
  await el.evaluate(n => n.click());
  await page.waitForTimeout(350);
}
async function goToDraft(page) {
  await page.getByRole('button', { name: /Go to the draft/ }).first().evaluate(n => n.click());
  await page.waitForTimeout(150);
}

/** Layout of the screen as it stands; every number read in the page. */
function layoutOf(w) {
  const out = { overlaps: 0, cut: [], escaped: [], low: [], small: [], skipped: 0, tiles: 0, buttons: 0 };
  const tiles = [...document.querySelectorAll('[data-lottery-slot]')].map(t => t.getBoundingClientRect());
  out.tiles = tiles.length;
  for (let i = 0; i < tiles.length; i += 1) for (let j = i + 1; j < tiles.length; j += 1) {
    const a = tiles[i]; const b = tiles[j];
    if (a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5) out.overlaps += 1;
  }
  for (const t of document.querySelectorAll('[data-lottery-slot]')) {
    const box = t.getBoundingClientRect();
    if (w >= 390) {
      for (const s of t.querySelectorAll('.truncate')) if (s.scrollWidth > s.clientWidth + 0.5) out.cut.push(`${t.getAttribute('data-lottery-slot')}: ${s.textContent}`);
    } else {
      for (const s of [t.querySelector('[data-lottery-face] > span.relative.w-5'), t.querySelector('[data-lottery-mark]')].filter(Boolean)) {
        const r = s.getBoundingClientRect();
        if (r.left < box.left - 0.5 || r.right > box.right + 0.5 || r.top < box.top - 0.5 || r.bottom > box.bottom + 0.5) out.escaped.push(`${t.getAttribute('data-lottery-slot')}: ${s.textContent}`);
      }
    }
  }
  const screen = document.querySelector('[data-gm-earned-draft]');
  if (!screen) return out;
  for (const b of screen.querySelectorAll('button')) {
    const r = b.getBoundingClientRect();
    if (r.width === 0 || getComputedStyle(b).visibility === 'hidden') continue;
    out.buttons += 1;
    if (r.height < 43.5) out.low.push(`${b.textContent.trim().slice(0, 30)} ${r.height.toFixed(1)}`);
  }
  const shared = '[data-draft-night], [data-gm-lottery], [data-gm-panel-loading]';
  const walker = document.createTreeWalker(screen, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.textContent.trim()) continue;
    const el = n.parentElement;
    if (el.closest(shared)) { out.skipped += 1; continue; }
    if (el.closest('style')) continue;
    if (parseFloat(getComputedStyle(el).fontSize) < 12) out.small.push(n.textContent.trim().slice(0, 30));
  }
  return out;
}
async function layout(page, size, where) {
  const l = await page.evaluate(layoutOf, size.w);
  say('A', l.overlaps === 0, `${where} at ${size.w}: ${l.overlaps} tiles overlap`);
  if (size.w >= 390) say('A', l.cut.length === 0, `${where} at ${size.w}: tile labels cut: ${l.cut.slice(0, 3).join('; ')}`);
  else say('A', l.escaped.length === 0, `${where} at ${size.w}: a slot number or the mark leaves its tile: ${l.escaped.slice(0, 3).join('; ')}`);
  say('A', l.low.length === 0, `${where} at ${size.w}: buttons under 44 px: ${l.low.slice(0, 3).join('; ')}`);
  say('A', l.small.length === 0, `${where} at ${size.w}: the screen's own text under 12 px: ${l.small.slice(0, 3).join('; ')} (${l.skipped} shared nodes skipped)`);
  return l;
}
/** Critic 1540 correction 4 (a): after a press the heading tile's top and the stage's first line are in view. */
async function inView(page, size, where) {
  const v = await page.evaluate(() => {
    const h = document.querySelector('[data-gm-draft-heading]');
    const s = document.querySelector('[data-gm-draft-stage] > div > *');
    const H = window.innerHeight;
    const r = h?.getBoundingClientRect(); const q = s?.getBoundingClientRect();
    return { heading: r ? r.top >= -1 && r.top < H : false, stage: q ? q.top < H && q.bottom > 0 : false, headTop: r?.top ?? null, stageTop: q?.top ?? null, H };
  });
  say('N', v.heading && v.stage, `${where} at ${size.w}: heading top ${v.headTop?.toFixed?.(0)} and stage top ${v.stageTop?.toFixed?.(0)} in a viewport of ${v.H}`);
}
const headingLines = page => page.$$eval('[data-gm-draft-lines] p', ps => ps.map(p => p.textContent));
const stageBox = page => page.evaluate(() => { const s = document.querySelector('[data-gm-draft-stage]').getBoundingClientRect(); return { y: Math.round(scrollY), top: Math.round(s.top), h: Math.round(s.height) }; });
const sameBox = (a, b) => a.y === b.y && Math.abs(a.top - b.top) <= 1 && Math.abs(a.h - b.h) <= 1;

/* A lottery club whose first lands after pick 4, so a run card is drawn before his clock. */
function lotteryClub() {
  for (let seed = 11; seed < 90; seed += 1) {
    const b = recap(seed, ids => ids[2]);
    if (b.mine.length === 2 && b.mine[0] > 4) return b;
  }
  throw new Error('no seed gives a lottery club a first after pick 4');
}

/* ================================================================== A, H and N */
if (runs('A') || runs('H')) {
  const A = lotteryClub();
  for (const size of SIZES) {
    const { ctx, page, errors } = await open(size, A.save, { style: CONTROL === 'fold' ? '[data-gm-draft-stage] { margin-top: 3000px !important; }' : '' });
    const season = A.save.league.season;
    await shot(page, `A-${size.w}-1-recap`);
    await goToDraft(page);
    const appeared = await page.waitForSelector('[data-gm-lottery]', { timeout: 15000 }).then(() => true, () => false);
    say('A', appeared, `${size.w}: the lottery card drew after Go to the draft`);
    if (!appeared) { await shot(page, `A-${size.w}-nocard`); await ctx.close(); continue; }
    const opacity = () => page.evaluate(() => { const h = document.querySelector('[data-lottery-headline]'); return h ? parseFloat(getComputedStyle(h).opacity) : null; });
    const first = await opacity();
    say('A', first !== null && first < 0.1, `${size.w}: the closing line waits for the last tile (opacity ${first} at the first frame)`);
    say('A', await page.locator('[data-gm-draft-chances] p').count() >= 1, `${size.w}: the chances are on the heading before the draw`);
    say('A', await page.locator('[data-gm-draft-help]').count() === 0, `${size.w}: no heading "?" while the card is up`);
    if (CONTROL === 'spoil') await page.evaluate(t => { const p = document.createElement('p'); p.textContent = `Your first landed ${t}.`; document.querySelector('[data-gm-draft-heading]').appendChild(p); }, ordinal(A.mine[0]));
    const head = await page.evaluate(() => { const c = document.querySelector('[data-gm-draft-heading]').cloneNode(true); c.querySelector('[data-gm-draft-chances]')?.remove(); return c.textContent; });
    for (const o of A.mine) say('A', !spoils(head, o), `${size.w}: the heading gives away his pick ${o} before Continue: "${head.slice(0, 120)}"`);
    await inView(page, size, 'Go to the draft');
    const bytes = () => page.evaluate(k => localStorage.getItem(k)?.length ?? 0, KEY);
    if (size.w === 390) console.log(`   save bytes at the lottery card: ${await bytes()}`);
    await layout(page, size, 'the card');
    await shot(page, `A-${size.w}-2-card`);
    await page.waitForFunction(() => parseFloat(getComputedStyle(document.querySelector('[data-lottery-headline]')).opacity) > 0.99, null, { timeout: 20000 }).catch(() => {});
    say('A', (await opacity()) > 0.99, `${size.w}: the closing line arrives once the tiles have turned`);
    await shot(page, `A-${size.w}-3-card-settled`);
    await press(page, '[data-lottery-continue]');
    say('A', await stage(page) === 'clock', `${size.w}: Continue puts him on the clock`);
    await inView(page, size, 'Continue');
    const rows = await page.$$eval('[data-draft-night] li', ls => ls.map(l => parseInt(l.textContent, 10)));
    say('A', rows.length > 0 && rows[rows.length - 1] === A.mine[0] - 1, `${size.w}: the run's last row is pick ${rows[rows.length - 1]}, one before his ${A.mine[0]}`);
    say('A', (await headingLines(page)).includes(`You are on the clock at ${A.mine[0]}.`), `${size.w}: the heading says he is on the clock at ${A.mine[0]}`);
    await layout(page, size, 'the clock');
    if (size.w === 390) console.log(`   save bytes on the clock at ${A.mine[0]}: ${await bytes()}`);
    await shot(page, `A-${size.w}-4-clock`);
    if (runs('H')) {
      const before = await stageBox(page);
      await press(page, '[data-gm-draft-help]');
      const opened = { ...(await stageBox(page)), panel: await page.locator('[data-gm-draft-help-panel]').count() };
      await shot(page, `H-${size.w}-help-open`);
      await press(page, '[data-gm-draft-help-close]');
      const after = await stageBox(page);
      say('H', opened.panel === 1 && sameBox(before, opened) && sameBox(before, after), `${size.w}: the "?" opens over the stage and closes with scrollY, the stage top and height unchanged (${JSON.stringify([before, opened, after])})`);
    }
    await press(page, '[data-gm-draft-choice]');
    await inView(page, size, 'his first pick');
    say('A', (await headingLines(page)).includes(`You are on the clock at ${A.mine[1]}.`), `${size.w}: after his first pick, on the clock at ${A.mine[1]}`);
    await shot(page, `A-${size.w}-5-second-clock`);
    await press(page, '[data-gm-draft-choice]');
    await inView(page, size, 'his last pick');
    const end = await saved(page);
    say('A', (await stage(page)) === 'over' && end.phase === 'hub' && end.league.season === season + 1, `${size.w}: after his last pick the summer has run (stage ${await stage(page)}, save ${end.phase}, season ${end.league.season})`);
    await layout(page, size, 'the closing screen');
    await shot(page, `A-${size.w}-6-over`);
    await press(page, (await page.locator('[data-draft-continue]').count()) ? '[data-draft-continue]' : '[data-gm-draft-leave]');
    say('A', (await stage(page)) === null && !(await page.locator('[data-gm-lottery]').count()), `${size.w}: Continue to the hub leaves the draft`);
    await shot(page, `A-${size.w}-7-hub`);
    say('A', realErrors(errors).length === 0, `${size.w}: page errors: ${realErrors(errors).slice(0, 2).join(' | ')}`);
    await ctx.close();
  }
}

/* ================================================================== B, C, D at 390 */
async function toClock(label, b) {
  const { ctx, page, errors } = await open(AT390, b.save);
  await goToDraft(page);
  await page.waitForSelector('[data-lottery-continue]', { timeout: 15000 }).catch(() => {});
  await press(page, '[data-lottery-continue]');
  await shot(page, `${label}-390-after-continue`);
  return { ctx, page, errors };
}
if (runs('B')) {
  const b = recap(19, ids => ids[29]);
  const { ctx, page, errors } = await toClock('B', b);
  const head = await page.locator('[data-draft-night] .fo-draft-head').first().textContent().catch(() => '');
  say('B', b.mine[0] === 30 && (await headingLines(page)).includes('You are on the clock at 30.'), `the best record's own first is pick ${b.mine[0]}, and the heading says the clock is at 30`);
  say('B', /Picks 1 to 29 are in\./.test(head ?? ''), `29 picks in before his first: "${head}"`);
  say('B', realErrors(errors).length === 0, `page errors: ${realErrors(errors).slice(0, 2).join(' | ')}`);
  await ctx.close();
}
if (runs('C')) {
  const b = recap(13, ids => ids[20], ({ me, order }) => [[1, order.first[0], me]]);
  const { ctx, page } = await toClock('C', b);
  say('C', b.mine[0] === 1 && (await page.locator('[data-draft-night]').count()) === 0, 'he holds pick 1: no run card before his clock');
  say('C', (await headingLines(page)).includes('You are on the clock at 1.'), 'the heading says the clock is at 1');
  await ctx.close();
}
if (runs('D')) {
  const b = recap(15, ids => ids[6], ({ me, ids }) => { const o = ids.find(c => c !== me); return [[1, me, o], [2, me, o]]; });
  const { ctx, page } = await toClock('D', b);
  const end = await saved(page);
  say('D', b.mine.length === 0 && (await stage(page)) === 'over' && end.phase === 'hub', `no pick: Continue ran the night and the summer (stage ${await stage(page)}, save ${end.phase})`);
  await press(page, (await page.locator('[data-draft-continue]').count()) ? '[data-draft-continue]' : '[data-gm-draft-leave]');
  say('D', (await stage(page)) === null, 'and the way out reaches the hub');
  await ctx.close();
}

/* ================================================================== E, F, G at 390 */
if (runs('E') || runs('F') || runs('G')) {
  const A = lotteryClub();
  if (runs('E')) {
    const { ctx, page } = await open(AT390, A.save);
    await goToDraft(page);
    await page.waitForSelector('[data-gm-lottery]', { timeout: 15000 }).catch(() => {});
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('[data-gm-lottery]', { timeout: 15000 }).catch(() => {});
    const settled = await page.evaluate(() => ({
      settled: !!document.querySelector('[data-lottery-settled]'),
      faces: [...document.querySelectorAll('[data-lottery-face]')].map(f => parseFloat(getComputedStyle(f).opacity)),
      cont: !!document.querySelector('[data-lottery-continue]'),
    }));
    await shot(page, 'E-390-reload-card');
    say('E', settled.settled && settled.cont && settled.faces.length === 14 && settled.faces.every(o => o > 0.99), `a reload at the card draws its last frame with Continue live (${JSON.stringify({ ...settled, faces: settled.faces.length })})`);
    await press(page, '[data-lottery-continue]');
    const line = (await headingLines(page)).find(l => l.startsWith('You are on the clock'));
    const cls = (await saved(page)).draftClass.length;
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    await shot(page, 'E-390-reload-clock');
    say('E', !!line && (await headingLines(page)).includes(line) && (await saved(page)).draftClass.length === cls && (await page.locator('[data-gm-lottery]').count()) === 0, `a reload on the clock keeps "${line}" and the class of ${cls}, with no card`);
    await ctx.close();
  }
  if (runs('F')) {
    const { ctx, page } = await open(AT390, A.save, { reduced: true });
    await goToDraft(page);
    await page.waitForSelector('[data-lottery-face]', { timeout: 15000 }).catch(() => {});
    const faces = await page.$$eval('[data-lottery-face]', fs2 => fs2.map(f => parseFloat(getComputedStyle(f).opacity)));
    await shot(page, 'F-390-reduced');
    say('F', faces.length === 14 && faces.every(o => o > 0.99), `reduced motion: every tile on its last frame at frame one (${faces.filter(o => o > 0.99).length} of ${faces.length})`);
    await ctx.close();
  }
  if (runs('G')) {
    const { ctx, page } = await open(AT390, A.save);
    await goToDraft(page);
    await page.waitForSelector('[data-lottery-continue]', { timeout: 15000 }).catch(() => {});
    await page.locator('[data-lottery-continue]').evaluate(n => n.click());
    await page.waitForTimeout(400);
    say('G', (await stage(page)) === 'clock' && (await headingLines(page)).includes(`You are on the clock at ${A.mine[0]}.`), 'Continue on the first frame puts him on the clock');
    await ctx.close();
  }
}

/* ================================================================== I at 390 */
if (runs('I')) {
  const b = recap(17, ids => ids[5], undefined, false);
  const { ctx, page } = await open(AT390, b.save);
  await goToDraft(page);
  await page.waitForTimeout(1500);
  const text = await page.evaluate(() => document.body.textContent);
  console.log(`   save bytes on the old draft screen (desk off): ${await page.evaluate(k => localStorage.getItem(k)?.length ?? 0, KEY)}`);
  await shot(page, 'I-390-desk-off');
  say('I', (await page.locator('[data-gm-lottery]').count()) === 0 && (await stage(page)) === null && /You hold/.test(text), 'a desk off save keeps the old draft: no card, the old heading');
  await ctx.close();
}

/* ================================================================== J at every width */
if (runs('J')) {
  const A = lotteryClub();
  for (const size of SIZES) {
    let release;
    const holdCard = { promise: new Promise(r => { release = r; }) };
    const { ctx, page } = await open(size, A.save, { holdCard, style: CONTROL === 'jump' ? '[data-gm-panel-loading] { min-height: 100px !important; }' : '' });
    await goToDraft(page);
    const seen = await page.waitForSelector('[data-gm-panel-loading]', { timeout: 10000 }).then(() => true, () => false);
    const box = seen ? await page.evaluate(() => document.querySelector('[data-gm-panel-loading]').getBoundingClientRect().height) : null;
    await shot(page, `J-${size.w}-lazy-box`);
    release();
    await page.waitForSelector('[data-gm-lottery]', { timeout: 15000 }).catch(() => {});
    const card = await page.evaluate(() => document.querySelector('[data-gm-lottery]')?.getBoundingClientRect().height ?? null);
    console.log(`   J ${size.w}: the lazy box ${box?.toFixed(1)} px, the card's first frame ${card?.toFixed(1)} px, a jump of ${box !== null && card !== null ? (card - box).toFixed(1) : '?'} px`);
    say('J', seen, `${size.w}: the lazy box was on screen while the card's chunk was held (seen ${seen ? 1 : 0})`);
    if (size.w === 390) say('J', box !== null && card !== null && Math.abs(card - box) <= 8, `390: the card's first frame (${card}) is within 8 px of the box it replaces (${box})`);
    await ctx.close();
  }
}

/* ================================================================== */
await browser.close();
const red = [...results].filter(([, r]) => r.fail > 0).map(([s]) => s);
for (const [s, r] of [...results].sort()) console.log(`  section ${s}: ${r.pass} passed, ${r.fail} failed`);
console.log(`  ${shots} screenshots in ${OUT}`);
if (CONTROL) {
  const want = CONTROLS[CONTROL];
  if (!red.length) { console.log(`playNbaLotteryNight control ${CONTROL}: DID NOT FIRE.`); process.exit(3); }
  const exact = red.length === want.length && want.every(s => red.includes(s));
  console.log(exact ? `playNbaLotteryNight control ${CONTROL}: FIRED, section ${red.join(', ')} red, the others green.` : `playNbaLotteryNight control ${CONTROL}: MISFIRED, red ${red.join(', ')}, want ${want.join(', ')}.`);
  process.exit(1);
}
if (results.size < 11) { console.log(`playNbaLotteryNight: only ${results.size} of 11 sections ran.`); process.exit(2); }
if (red.length) { console.log(`playNbaLotteryNight: red in ${red.join(', ')}.`); process.exit(1); }
console.log('playNbaLotteryNight: green.');
process.exit(0);
