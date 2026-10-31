/* Round 1593: your own club's Europa League on the page. The built dist served like the host (BASE, or SWEEP_BASE,
 * from the runner's #!serve), Supabase and the ad hosts aborted, saves made by the engine (scripts/lib/worldUclFleet.mjs,
 * the critic's advice 19: built here from startCareer and a crafted cup final, never a committed save file) and
 * planted from /robots.txt, at 320 by 640, 390 by 844 and 1280 by 900:
 *   (a) an Everton season one played out with its cup final handed to Everton (the same streams as playWorldUcl's
 *       case v, so the place is route C), rolled over, and played on to the week its first Europa League night is
 *       next: the hub names that night (its matchday words and the opponent); the Cups tile says the club is in it;
 *       the Europa League screen's first line says Everton are in it by the cup; its ? holds the participant's lines;
 *       back puts the page where it stood; the calendar's month grid holds the night on a Thursday, its opponent named.
 *   (b) the same save after that night, played by the engine on its own stream: the club's run on the screen shows the
 *       played night with the score the evaluation gives, one played and seven to come, and the stats centre has its
 *       Europa League view.
 *   On every Cups view: every control at least 44 px tall, no text under 12 px, no sideways scroll, nothing cut or
 *   overlapping. Pictures of every view go into $RC_OUT/shots (uel-<case>-<view>-<width>.png).
 * CONTROLS (PLAY_EURO_CONTROL; each builds its own dist from a patched copy of one line, put back after): notile (the
 * tile's 'in' line taken out, so it reads like a watcher's: (a) red), nofixture (fixtureFor's Europa League branch
 * answers null: the hub and the month grid name no night: (a) red). Each runs only the case it targets.
 * Not done here, with the reason: the night is played by the engine, not by pressing through the match screens (the
 * match day walks own those screens; the hub's next match card reads the same fixtureFor), and the season review's
 * Europa League line is held by scripts/simCmEuroPlay.mjs (it needs a season played to its end).
 * Exit 0 green, 1 a finding (or a control that fired), 2 could not run, 3 a control that did not fire. */
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { engineOf, tape } from './lib/worldUclFleet.mjs';
import { chromium } from './lib/playwrightLoader.mjs';
import { answerConsent } from './lib/answerConsent.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.PLAY_EURO_CONTROL || '';
const SIZES = [[320, 640], [390, 844], [1280, 900]];
const TEMP = fs.mkdtempSync(path.join(os.tmpdir(), 'dukb-euro-play-walk-'));
const SHOTS = path.join(process.env.RC_OUT || TEMP, CONTROL ? `shots-${CONTROL}` : 'shots');
fs.mkdirSync(SHOTS, { recursive: true });
const cannot = why => { console.log(`playCmEuroPlay: could not run. ${why}`); process.exit(2); };
if (!process.env.CI) cannot('it builds and serves the site, so it runs on a runner only (CI is not set)');
const CONTROLS = {
  notile: { file: 'src/lib/clubManagerWorldView.ts', cases: ['a'],
    from: `    return { mode: 'in', value: at, sub: "You're in it: your nights are on your calendar, on Thursdays" };`,
    to: `    return { mode: 'watching', value: at, sub: 'You are following it from outside' };`, finding: 'the Europa League tile' },
  /* Release BV join: re-anchored. Round 1593's fixer split this return over lines (the notneutral and noet
     controls of simCmEuroPlay read its lines one by one), so the old one line anchor stood 0 times on 1593's own
     head fa479238a and the control could not run (rBVg-w, exit 2). The anchor is the one line above that return,
     standing once in the file, and the branch still returns null under it (its own if (!my) return null). A
     multi line anchor read raw here would match nothing on a CRLF checkout (simHarnessAnchors, rBVg-w2b). */
  nofixture: { file: 'src/lib/clubManager.ts', cases: ['a', 'c'],
    from: '    const my = uelMyNight(state, entry);',
    to: '    const my = null;', finding: 'names no Europa League night' },
};
if (CONTROL && !CONTROLS[CONTROL]) cannot(`unknown control ${CONTROL}`);

/* ---------- the saves, made by the engine ---------- */
const E = await engineOf(ROOT, 'walk', {}, cannot);
const opts = { skipHalftime: true, noCoach: true };
function saved(M, s) {
  M.store.clear();
  if (!M.cm.saveCareer(s)) cannot('the engine refused to save a walk career');
  return [...M.store.entries()];
}
const saves = {};
{
  const M = await E.fresh();
  /* playWorldUcl's case v streams: Everton's season one, its cup final handed to Everton, then the rollover. */
  let s = tape(0x1509a, () => M.cm.startCareer('Everton')).value;
  for (let i = 0; i < 400 && s.week < s.calendar.length; i += 1) s = tape(0x1509a + 1 + i, () => M.cm.playNextEntry(s, opts)).value.state;
  const fin = tape(0x1509b, () => M.cm.finishSeason(s)).value.state;
  const final = (fin.cupBracket ?? []).find(t => t.round === 'F');
  if (!final) cannot('the Everton season has no cup final to set');
  final.winner = 'Everton';
  let p = tape(0x1509c, () => M.cm.startNextSeason(fin)).value;
  const slice = p.worldComps?.uel;
  const nights = (p.calendar ?? []).filter(e => e.type === 'uel').length;
  if (p.uclGroup || !slice || slice.me !== 'Everton' || slice.earned !== 'C' || nights !== 17) {
    cannot(`the crafted Everton season two does not play the Europa League by its cup (me ${slice?.me ?? 'none'}, route ${slice?.earned ?? 'none'}, ${nights} nights)`);
  }
  /* On until my next match is the first night (the hub's own nextFixture: a Champions League night before it is not
     mine and is passed over by the same playNextEntry call that plays the night). */
  for (let i = 0; i < 80 && M.cm.nextFixture(p)?.competition !== 'uel'; i += 1) p = tape(0x1593a + i, () => M.cm.playNextEntry(p, opts)).value.state;
  const at = p.calendar.findIndex((e, w) => w >= p.week && M.cm.fixtureFor(p, e));
  const entry = p.calendar[at];
  if (entry?.type !== 'uel' || entry.night?.n !== 0) cannot(`the save never reached its first Europa League night (week ${p.week}, entry ${at}, ${JSON.stringify(entry)})`);
  const fx = M.cm.fixtureFor(p, entry);
  if (!fx || fx.competition !== 'uel') cannot(`the engine gives no fixture for the first night (${JSON.stringify(fx)})`);
  const dateLabel = M.cal.shortDate(M.cal.entryDatesOf(p)[at]);
  saves.a = { items: saved(M, p), opp: fx.opponent, label: fx.compLabel, home: fx.home, dateLabel };
  console.log(`(a) Everton season ${p.season}, week ${p.week}: next "${fx.compLabel}" ${fx.home ? 'v' : 'at'} ${fx.opponent} on ${dateLabel}`);
  const after = tape(0x1593b, () => M.cm.playNextEntry(JSON.parse(JSON.stringify(p)), opts)).value.state;
  if (!after.worldComps?.uel?.mine?.[0]) cannot('the first night was played and nothing was recorded in the slice');
  const res = M.cm.evalWorldComp(after, 'uel');
  const mineFx = res?.nights?.[0]?.fixtures?.find(f => f.home === 'Everton' || f.away === 'Everton');
  if (!mineFx || mineFx.hg === undefined) cannot('the evaluation after the night shows no score for Everton');
  saves.b = { items: saved(M, after), line: `${mineFx.home} ${mineFx.hg}-${mineFx.ag} ${mineFx.away}` };
  console.log(`(b) after the night: ${saves.b.line}`);
}

/* The build, the server and the page's helpers below are playOneOffCups.mjs's (Round 1510), the lock renamed. */
/* ---------- the build: the served one, or a control's own ---------- */
let url = process.env.BASE || process.env.SWEEP_BASE || 'http://localhost:4173';
let server = null;
if (CONTROL) {
  /* Fix-1510: two controls run side by side (a runner's three lines at a time) once patched one shared tree and
     served on one port, so one built the other's patch, read the other's patched file as its "original", and
     walked the other's dist (r1510-fx-d: swap built with notile's tile gone, hubweek's server never came up).
     Now the read, the patch, the build and the putting back hold one lock (a directory beside the system's temp
     files, keyed on this checkout: /tmp on Linux), and each control serves its dist on a port of its own. Other harnesses that
     read these source files (the type gate, simHarnessAnchors) still belong on another request. */
  const c = CONTROLS[CONTROL];
  const file = path.join(ROOT, c.file);
  const out = path.join(TEMP, `dist-${CONTROL}`);
  /* /tmp itself on Linux: a runner gives every request line its own TMPDIR, so os.tmpdir() is no shared place
     there (r1510-fx-e: swap still built notile's patch with the lock under os.tmpdir()). */
  const lock = path.join(process.platform === 'win32' ? os.tmpdir() : '/tmp', `dukb-play-cm-euro-play-${ROOT.replace(/[^A-Za-z0-9]/g, '_').slice(-80)}.lock`);
  for (let i = 0; ; i += 1) {
    try { fs.mkdirSync(lock); break; } catch (e) {
      if (e.code !== 'EEXIST') throw e;
      const age = Date.now() - (fs.statSync(lock, { throwIfNoEntry: false })?.mtimeMs ?? Date.now());
      if (age > 30 * 60000) { try { fs.rmdirSync(lock); } catch { /* another control took it */ } continue; }
      if (i > 3600) cannot(`control ${CONTROL}: waited an hour for another control's build`);
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  /* process.exit skips a finally, so every way out of the locked part lets the lock go first. */
  const unlock = () => { try { fs.rmdirSync(lock); } catch { /* gone already */ } };
  let why = '';
  try {
    const original = fs.readFileSync(file);
    const text = original.toString('utf8').replaceAll('\r\n', '\n');
    const n = text.split(c.from).length - 1;
    if (n !== 1) why = `control ${CONTROL}: its line stands in ${c.file} ${n} times, it must be exactly once`;
    else {
      try {
        fs.writeFileSync(file, text.replace(c.from, c.to));
        execFileSync(path.join(ROOT, 'node_modules', '.bin', 'vite'), ['build', '--outDir', out, '--emptyOutDir'], { cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'], timeout: 25 * 60000 });
      } finally {
        fs.writeFileSync(file, original);
      }
      if (!fs.readFileSync(file).equals(original)) why = `control ${CONTROL}: ${c.file} was not put back`;
    }
  } finally {
    unlock();
  }
  if (why) cannot(why);
  const port = await new Promise((res, rej) => { const s = net.createServer(); s.on('error', rej); s.listen(0, () => { const p = s.address().port; s.close(() => res(p)); }); });
  server = spawn(process.execPath, [path.join(ROOT, 'scripts', 'lib', 'hostLikeServer.mjs'), out, String(port)], { stdio: 'ignore' });
  url = `http://localhost:${port}`;
  console.log(`control ${CONTROL}: built ${c.file} with its line patched into ${out} (served on ${port}); the file is back as it was`);
}
for (let i = 0; i < 60; i += 1) {
  const up = await fetch(`${url}/robots.txt`).then(r => r.ok).catch(() => false);
  if (up) break;
  if (i === 59) cannot(`nothing is served at ${url}`);
  await new Promise(r => setTimeout(r, 500));
}

/* ---------- the page ---------- */
const findings = [];
const finding = (where, what) => { findings.push(`${where}: ${what}`); console.log(`   FAIL ${where}: ${what}`); };
const BLOCK = /supabase\.co|googlesyndication|doubleclick|google-analytics|googletagmanager|adservice|fundingchoices/;
async function press(page, loc, ms = 3000) {
  try {
    await loc.first().waitFor({ state: 'visible', timeout: ms });
    await loc.first().evaluate(el => el.click());
    await page.waitForTimeout(400);
    return true;
  } catch { return false; }
}
async function open(browser, items, [w, h]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 200)));
  await page.route(BLOCK, r => r.abort());
  await page.goto(`${url}/robots.txt`);
  await page.evaluate(entries => { localStorage.clear(); for (const [k, v] of entries) localStorage.setItem(k, v); }, items);
  await page.goto(`${url}/club-manager`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await answerConsent(page, { wait: 1500, press: b => press(page, b, 1500) });
  await press(page, page.getByRole('button', { name: 'Resume Career', exact: true }), 5000);
  return { ctx, page, errors };
}
const shot = async (page, name) => page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: false }).catch(() => {});
const count = async (page, sel) => page.locator(sel).count();
const textOf = async (page, sel) => ((await page.locator(sel).first().innerText().catch(() => '')) || '').replace(/\s+/g, ' ');
async function toCups(page, where) {
  const ok = await press(page, page.getByRole('button').filter({ has: page.getByText('Cups', { exact: true }) }), 20000);
  const tiles = await page.locator('[data-cm-cups-view="tiles"]').waitFor({ timeout: 15000 }).then(() => true).catch(() => false);
  if (!ok || !tiles) finding(where, 'the Cups panel did not open from the hub');
  return ok && tiles;
}
async function measure(page, where) {
  const m = await page.evaluate(() => {
    const root = document.querySelector('[data-cm-cups-view]');
    if (!root) return null;
    const vw = window.innerWidth;
    const words = el => (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40);
    const shown = el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; };
    const out = { short: [], small: [], cut: [], overlap: [], controls: 0, sideways: document.scrollingElement.scrollWidth > vw + 1 };
    const ctl = [...root.querySelectorAll('button, a')].filter(shown);
    out.controls = ctl.length;
    for (const el of ctl) { const h = el.getBoundingClientRect().height; if (h < 43.5) out.short.push(`"${words(el)}" ${h.toFixed(1)} px`); }
    for (let i = 0; i < ctl.length; i += 1) for (let j = i + 1; j < ctl.length; j += 1) {
      if (ctl[i].contains(ctl[j]) || ctl[j].contains(ctl[i])) continue;
      const a = ctl[i].getBoundingClientRect(); const b = ctl[j].getBoundingClientRect();
      if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 2 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 2) out.overlap.push(`"${words(ctl[i])}" on "${words(ctl[j])}"`);
    }
    for (const el of root.querySelectorAll('*')) {
      if (!shown(el) || ![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue;
      const st = getComputedStyle(el); const r = el.getBoundingClientRect();
      if (parseFloat(st.fontSize) < 11.95) out.small.push(`"${words(el)}" ${st.fontSize}`);
      if (r.right > vw + 1 || r.left < -1) out.cut.push(`"${words(el)}" runs off the screen`);
      if ((st.overflowX === 'hidden' || st.textOverflow === 'ellipsis') && el.scrollWidth > el.clientWidth + 1) out.cut.push(`"${words(el)}" is cut by its box`);
    }
    return out;
  });
  if (!m) { finding(where, 'the Cups panel is not on the page'); return; }
  for (const s of m.short) finding(where, `a control under 44 px tall: ${s}`);
  for (const s of m.small) finding(where, `text under 12 px: ${s}`);
  for (const s of m.cut) finding(where, s);
  for (const s of m.overlap) finding(where, `two controls overlap: ${s}`);
  if (m.sideways) finding(where, 'the page scrolls sideways');
  console.log(`   ${where}: ${m.controls} controls measured`);
}
/** Press the Europa League tile, read the screen, come back with its back button: the page stands where it stood. */
async function roundTrip(page, where, inside) {
  const sel = '[data-cm-world-tile="uel"]';
  if (!(await count(page, sel))) { finding(where, 'no Europa League tile'); return; }
  await page.locator(sel).first().scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(250);
  const before = await page.evaluate(() => [Math.round(window.scrollY), document.scrollingElement.scrollHeight]);
  if (!(await press(page, page.locator(sel)))) { finding(where, 'the Europa League tile could not be pressed'); return; }
  await page.waitForTimeout(300);
  await inside();
  await measure(page, `${where} screen`);
  if (!(await press(page, page.locator('[data-cm-world-back]')))) { finding(where, 'no back button'); return; }
  await page.waitForTimeout(600);
  const after = await page.evaluate(() => [Math.round(window.scrollY), document.scrollingElement.scrollHeight]);
  if (Math.abs(after[0] - before[0]) > 1 || Math.abs(after[1] - before[1]) > 1) finding(where, `back did not put the page where it was: scrollY ${before[0]} then ${after[0]}, height ${before[1]} then ${after[1]}`);
}
const squash = s => (s || '').replace(/\s+/g, ' ').trim();

/* ---------- the cases ---------- */
async function caseA(browser, size, tag) {
  const where = `(a) Everton before matchday 1 ${tag}`;
  const { ctx, page, errors } = await open(browser, saves.a.items, size);
  try {
    await page.waitForTimeout(800);
    await shot(page, `uel-a-hub-${tag}`);
    /* innerText carries the CSS case (the hub's small headings are upper case), so the words are read lower case. */
    const hub = squash(await page.locator('#root').innerText().catch(() => '')).toLowerCase();
    const words = saves.a.label.replace('Europa League · ', '').toLowerCase();
    if (!hub.includes(words) || !hub.includes(saves.a.opp.toLowerCase())) finding(where, `the hub names no Europa League night: "${words}" against ${saves.a.opp} is not on it`);
    if (!(await toCups(page, where))) return;
    /* Found on this walk's first pictures: the panel's old "no European football" card stood above a club in it. */
    if (squash(await textOf(page, '[data-cm-cups-view="tiles"]')).includes('No European football')) finding(where, 'the Cups panel says there is no European football this season for a club in the Europa League');
    await measure(page, `${where} tiles`);
    const tile = squash(await textOf(page, '[data-cm-world-tile="uel"]'));
    if (!tile.includes("You're in it") || !tile.includes('matchday 1 of 8')) finding(where, `the Europa League tile reads "${tile.slice(0, 160)}", not that the club is in it with matchday 1 next`);
    await shot(page, `uel-a-tiles-${tag}`);
    await roundTrip(page, where, async () => {
      const text = squash(await textOf(page, '[data-cm-world-comp="uel"]'));
      const want = 'Everton are in it this season, by winning its cup: your nights are on your calendar, every one on a Thursday.';
      if (!text.includes(want)) finding(where, `the screen's first line is not "${want.slice(0, 60)}...": "${text.slice(0, 160)}"`);
      await shot(page, `uel-a-screen-${tag}`);
      await press(page, page.locator('[data-cm-world-help-toggle]'));
      const help = squash(await textOf(page, '[data-cm-world-help="uel"]'));
      if (!help.includes('Every one of your nights is a Thursday') || !help.includes('through 3-2 on aggregate')) finding(where, `the ? holds no participant's lines: "${help.slice(0, 120)}"`);
      else await shot(page, `uel-a-help-${tag}`);
      await press(page, page.locator('[data-cm-world-help-toggle]'));
    });
    if (errors.length) finding(where, `page errors: ${errors.slice(0, 2).join(' | ')}`);
  } finally { await ctx.close(); }
}
/** (b) after matchday 1: the club's run shows the played night with the evaluation's score; the stats centre's view. */
async function caseB(browser, size, tag) {
  const where = `(b) Everton after matchday 1 ${tag}`;
  const { ctx, page, errors } = await open(browser, saves.b.items, size);
  try {
    if (!(await toCups(page, where))) return;
    await roundTrip(page, where, async () => {
      /* The screen opens on its tiles: the table first, then my club's row in it, then back twice to the screen. */
      if (!(await press(page, page.locator('[data-cm-world-tile="table"]')))) { finding(where, 'the Europa League screen has no table tile'); return; }
      if (!(await press(page, page.locator('[data-cm-world-table] [data-club="Everton"]')))) { finding(where, 'Everton cannot be pressed in the Europa League table'); await press(page, page.locator('[data-cm-world-back]')); return; }
      await page.waitForTimeout(400);
      await readRun(page, where, tag);
      await measure(page, `${where} run`);
      await press(page, page.locator('[data-cm-world-back]'));
      await press(page, page.locator('[data-cm-world-back]'));
    });
    if (errors.length) finding(where, `page errors: ${errors.slice(0, 2).join(' | ')}`);
  } finally { await ctx.close(); }
  await statsView(browser, size, where, tag);
}
/** My club's run on the Europa League screen: the night played, with the evaluation's score, and seven to come. */
async function readRun(page, where, tag) {
  const rec = await count(page, '[data-cm-world-run-row="recorded"]');
  const up = await count(page, '[data-cm-world-run-row="upcoming"]');
  if (rec !== 1 || up !== 7) finding(where, `Everton's run shows ${rec} played and ${up} to come, not 1 and 7`);
  const row = squash(await textOf(page, '[data-cm-world-run-row="recorded"]'));
  if (!row.includes(saves.b.line)) finding(where, `the played night reads "${row.slice(0, 120)}", the engine played ${saves.b.line}`);
  await shot(page, `uel-b-run-${tag}`);
}
/** The stats centre, on a page of its own (the Cups screen has no way back to the hub's tiles but its own). */
async function statsView(browser, size, where, tag) {
  const second = await open(browser, saves.b.items, size);
  try {
    const ok = await press(second.page, second.page.getByRole('button').filter({ has: second.page.getByText('Stats', { exact: true }) }), 15000);
    if (!ok) { finding(where, 'the Stats tile could not be pressed'); return; }
    await second.page.waitForTimeout(1500);
    if (!(await second.page.getByRole('button', { name: 'Europa League', exact: true }).count())) finding(where, 'the stats centre shows no Europa League view after a night was played');
    await shot(second.page, `uel-b-stats-${tag}`);
  } finally { await second.ctx.close(); }
}
/** (c) the month grid: the night on its Thursday, its opponent and its matchday words named (the next month too). */
async function caseC(browser, size, tag) {
  const where = `(c) Everton's calendar ${tag}`;
  const { ctx, page, errors } = await open(browser, saves.a.items, size);
  try {
    if (!saves.a.dateLabel.startsWith('Thu ')) finding(where, `the engine dates the first night ${saves.a.dateLabel}, not a Thursday`);
    const ok = await press(page, page.getByRole('button').filter({ has: page.getByText('Calendar', { exact: true }) }), 15000);
    const grid = ok && await page.locator('[data-testid="cm-calendar-grid"]').waitFor({ timeout: 15000 }).then(() => true).catch(() => false);
    if (!grid) { finding(where, 'the calendar did not open from the hub'); return; }
    const want = `${saves.a.dateLabel}: ${saves.a.home ? 'vs' : 'at'} ${saves.a.opp} · ${saves.a.label}`;
    let cell = page.getByRole('button', { name: want, exact: true });
    if (!(await cell.count())) {
      await press(page, page.getByRole('button', { name: 'Next month', exact: true }));
      cell = page.getByRole('button', { name: want, exact: true });
    }
    if (!(await cell.count())) {
      const nights = await page.locator('[data-testid="cm-calendar-grid"] button').evaluateAll(els => els.map(e => e.getAttribute('aria-label') || '').filter(l => /Europa League/.test(l)));
      finding(where, `the month grid names no Europa League night "${want}" (its Europa League days: ${nights.slice(0, 3).join(' / ') || 'none'})`);
      return;
    }
    await press(page, cell);
    const strip = squash(await textOf(page, '[data-testid="cm-calendar-day"]'));
    if (!strip.includes(saves.a.opp)) finding(where, `the day's strip reads "${strip.slice(0, 120)}", without ${saves.a.opp}`);
    await shot(page, `uel-c-calendar-${tag}`);
    if (errors.length) finding(where, `page errors: ${errors.slice(0, 2).join(' | ')}`);
  } finally { await ctx.close(); }
}

const browser = await chromium.launch();
try {
  const CASES = { a: caseA, b: caseB, c: caseC };
  for (const size of SIZES) for (const k of CONTROL ? CONTROLS[CONTROL].cases : Object.keys(CASES)) await CASES[k](browser, size, String(size[0]));
} finally {
  await browser.close();
  server?.kill();
}
if (CONTROL) {
  const c = CONTROLS[CONTROL];
  const own = findings.filter(f => f.includes(c.finding));
  if (own.length) { console.log(`playCmEuroPlay: control ${CONTROL} FIRED (${own.length} findings of "${c.finding}", ${findings.length} in all)`); process.exit(1); }
  console.log(`playCmEuroPlay: control ${CONTROL} DID NOT FIRE (${findings.length} findings: ${findings.slice(0, 2).join(' / ')})`);
  process.exit(3);
}
console.log(findings.length ? `playCmEuroPlay: ${findings.length} FINDINGS` : `playCmEuroPlay: green, three cases at three sizes, pictures in ${SHOTS}`);
process.exit(findings.length ? 1 : 0);
