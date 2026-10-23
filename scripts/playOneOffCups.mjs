/* Round 1510: the super cup on the page. The built dist served like the host (BASE, or SWEEP_BASE, from the
 * runner's #!serve), Supabase and the ad hosts aborted, saves made by the engine and planted from /robots.txt, at
 * 320 by 640, 390 by 844 and 1280 by 900:
 *   (a) a 2026-27 Chelsea career in season one at week 0: Cups shows the Super cup tile, and its card names the
 *       FA Community Shield, Arsenal and Manchester City with why each is in, the ground of the verified edition,
 *       the game's date of the night (the Wednesday before the first league game) and the score and winner the
 *       engine's own evaluation gives, word for word.
 *   (b) a 2026-27 Arsenal career in season one: the tile and the card say the club's place was settled before the
 *       manager arrived, and show no score.
 *   (c) a 2005-06 era career (its row not confirmed) and a 2026-27 Liga MX career (no row looked at): the tile says
 *       Not confirmed, never that there is none, and the card is titled, says why, and shows no match and no
 *       promise of a cup the game never plays.
 *   (d) a 2026-27 Arsenal career rolled into season two with the cup final handed to Arsenal (crafted, so the
 *       Shield is certain): the hub names the FA Community Shield and the other club as the next match and still
 *       says the season has not started; the Super cup tile says the club is in it.
 *   (e) the same save after the Shield, on the first stream of twelve where Arsenal won it: the hub's Cabinet
 *       names it, the hub still says the season has not started and the League tile reads Not started (no league
 *       entry is played yet), and (f) the stats centre has its Super cups view.
 *   (e) on every view: scrollY and the document height the same before a tile and after its back button, every
 *       control at least 44 px tall, no text under 12 px, no sideways scroll, nothing cut or overlapping.
 * Round 1514, at 390 by 844 and 1280 by 900: (g) a 2026-27 Marseille career in season one: the Super cup tile and
 *       card name the Trophée des Champions, PSG and Lens with why each is in, Lens's ground (the dated edition),
 *       straight to penalties and the row's mark; the UEFA Super Cup tile and card say season one's is not played.
 *       Round 1516: season one's UEFA Super Cup is played (PSG against Aston Villa): the save is played on until its
 *       night has passed, and the tile and card give the engine's winner and score, both clubs and why each is in,
 *       Stadion Salzburg and straight to penalties.
 *   (h) a crafted 2026-27 Chelsea season two in the UEFA Super Cup (an engine with one edit reads Chelsea as last
 *       season's Champions League winners at the rollover; the dist is the real one): the tile says the club is in
 *       it against the Europa League winners, and the card names both, why, the neutral ground and the night.
 *   Control nousctile (the UEFA Super Cup tile taken out: (g) and (h) red).
 * Pictures of every view go into $RC_OUT/shots (dsc-<case>-<width>.png, usc-<case>-<width>.png) to be looked at.
 * CONTROLS (PLAY_ONEOFF_CONTROL; each builds its own dist from a patched copy of one line, put back after): notile
 * (the Super cup tile taken out: (a) red), swap (the card shows the score the wrong way round: (a) red), norowline
 * (the no-row card's reason taken out: (c) red), hubweek and tileweek (the hub's header line and the League tile
 * back on the week 0 rule: (e) red). Each runs only the case it targets. Not a
 * control here, with the reason: `ahead` (a result shown a week early) needs a night after the season's first entry,
 * and the only verified row is played before it on every calendar, so there is no earlier week to show it in.
 * Exit 0 green, 1 a finding (or a control that fired), 2 could not run. */
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
const CONTROL = process.env.PLAY_ONEOFF_CONTROL || '';
const SIZES = [[320, 640], [390, 844], [1280, 900]];
const TEMP = fs.mkdtempSync(path.join(os.tmpdir(), 'dukb-one-off-walk-'));
const SHOTS = path.join(process.env.RC_OUT || TEMP, CONTROL ? `shots-${CONTROL}` : 'shots');
fs.mkdirSync(SHOTS, { recursive: true });
const cannot = why => { console.log(`playOneOffCups: could not run. ${why}`); process.exit(2); };
if (!process.env.CI) cannot('it builds and serves the site, so it runs on a runner only (CI is not set)');
const CONTROLS = {
  notile: { file: 'src/components/club-manager/WorldCompScreen.tsx', cases: ['a'],
    from: `<Tile icon="🛡️" title="Super cup" value={dscStatus.value} sub={dscStatus.sub} testId="dsc" onClick={() => go({ ...HOME, at: 'dsc' })} />`,
    to: '', finding: 'no Super cup tile' },
  swap: { file: 'src/lib/clubManagerWorldView.ts', cases: ['a'],
    from: '        homeGoals: got?.hg ?? null, awayGoals: got?.ag ?? null,',
    to: '        homeGoals: got?.ag ?? null, awayGoals: got?.hg ?? null,', finding: 'the card shows' },
  /* Round 1514: the UEFA Super Cup tile taken out: (g) and (h) red. */
  nousctile: { file: 'src/components/club-manager/WorldCompScreen.tsx', cases: ['g', 'h'],
    from: `{uscStatus && <Tile icon="🏆" title="UEFA Super Cup" value={uscStatus.value} sub={uscStatus.sub} testId="usc" onClick={() => go({ ...HOME, at: 'usc' })} />}`,
    to: '', finding: 'UEFA Super Cup tile' },
  /* Fix-1510: the no-row card's reason taken out (it was an empty box). */
  norowline: { file: 'src/lib/clubManagerWorldView.ts', cases: ['c'],
    from: "    return { ...base, name: null, partial, format: '', ground: '', stub };",
    to: "    return { ...base, name: null, partial, format: '', ground: '' };", finding: 'the no-row card does not say why' },
  /* Fix-1510: the hub's header back on the week 0 rule (a night starts the season). */
  hubweek: { file: 'src/pages/ClubManager.tsx', cases: ['e'],
    from: "          <span>{!leagueStarted(c) ? 'Season not started' : `#${g.myPosition || '-'} in league`}</span>",
    to: "          <span>{c.week === 0 ? 'Season not started' : `#${g.myPosition || '-'} in league`}</span>", finding: 'the hub says it has after the Shield' },
  /* Fix-1510: the League tile back on the week 0 rule. */
  tileweek: { file: 'src/pages/ClubManager.tsx', cases: ['e'],
    from: '                value={leagueTileValue(leagueStarted(c) ? c.week : 0, g.myPosition)}',
    to: '                value={leagueTileValue(c.week, g.myPosition)}', finding: 'the League tile reads' },
};
if (CONTROL && !CONTROLS[CONTROL]) cannot(`unknown control ${CONTROL}`);

/* ---------- the saves, made by the engine ---------- */
const E = await engineOf(ROOT, 'walk', {}, cannot);
function saved(M, s) {
  M.store.clear();
  if (!M.cm.saveCareer(s)) cannot('the engine refused to save a walk career');
  return [...M.store.entries()];
}
const saves = {};
{
  /* The first stream whose Shield is not level, so the swap control has a score the wrong way round to show. */
  let M = null, a = null, r = null, fx = null;
  for (let k = 0; k < 20 && !(fx && fx.hg !== fx.ag); k += 1) {
    M = await E.fresh();
    a = tape(0x1510a + k, () => M.cm.startCareer('Chelsea')).value;
    const dsc = a.worldComps?.dsc;
    if (!dsc || dsc.skip || dsc.row !== 'eng-2026') cannot(`Chelsea's season one holds no followed Community Shield (${JSON.stringify(dsc)})`);
    r = M.cm.evalOneOff(a);
    fx = r?.fixtures?.[0];
    if (!r?.done || !fx) cannot('the season one Shield is not played at week 0');
  }
  if (fx.hg === fx.ag) cannot('twenty streams gave a level season one Shield');
  const dates = M.cal.entryDatesOf(a);
  const night = M.cal.shortDate(M.cal.addDays(dates[0], -3));
  saves.a = { items: saved(M, a), home: fx.home, away: fx.away, score: `${fx.hg}-${fx.ag}`, winner: r.winner, pens: !!fx.pens, night };
  console.log(`(a) Chelsea season one: ${fx.home} ${fx.hg}-${fx.ag} ${fx.away}${fx.pens ? ' (penalties)' : ''}, won by ${r.winner}, night ${night}`);
  const M2 = await E.fresh();
  const b = tape(0x1510b, () => M2.cm.startCareer('Arsenal')).value;
  if (b.worldComps?.dsc?.skip !== 'seasonOne') cannot(`Arsenal's season one is not the seasonOne stub (${JSON.stringify(b.worldComps?.dsc)})`);
  saves.b = { items: saved(M2, b) };
  console.log('(b) Arsenal season one: the seasonOne stub');
  const M3 = await E.fresh();
  const club = M3.cm.ERA_LEAGUES.era2005?.find(l => /premier/.test(l.id))?.clubs.find(c => c === 'Everton') ?? 'Everton';
  const c = tape(0x1510c, () => M3.cm.startCareer(club, 'era2005')).value;
  if (c.worldComps?.dsc) cannot('the 2005 era save holds a super cup, its row is not confirmed');
  saves.c = { items: saved(M3, c), club, key: 'era', label: '2005' };
  console.log(`(c) ${club} 2005: no super cup (the era's row is partial)`);
  /* Fix-1510 (read lens, major B): a country of today's world the round did not look at (Mexico), whose card was an
     empty box with the season one line. */
  const M4 = await E.fresh();
  const mx = M4.cm.REAL_LEAGUES.find(l => /mx/i.test(l.id));
  if (!mx) cannot('no Liga MX league in REAL_LEAGUES');
  const c2 = tape(0x1510c2, () => M4.cm.startCareer(mx.clubs[0])).value;
  if (c2.worldComps?.dsc) cannot(`${mx.clubs[0]} holds a super cup, Mexico has no row`);
  saves.c2 = { items: saved(M4, c2), club: mx.clubs[0], key: 'now', label: '2026-27' };
  console.log(`(c) ${mx.clubs[0]} 2026-27: no super cup (no row for Mexico)`);
}

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
  const lock = path.join(process.platform === 'win32' ? os.tmpdir() : '/tmp', `dukb-play-one-off-cups-${ROOT.replace(/[^A-Za-z0-9]/g, '_').slice(-80)}.lock`);
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
/** Press the Super cup tile, read the card, come back with its back button: the page stands where it stood. */
async function roundTrip(page, where, inside, tile = 'dsc') {
  const loc = page.locator(`[data-cm-world-tile="${tile}"]`);
  if (!(await count(page, `[data-cm-world-tile="${tile}"]`))) { finding(where, tile === 'dsc' ? 'no Super cup tile' : 'no UEFA Super Cup tile'); return; }
  await loc.first().scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(250);
  const before = await page.evaluate(() => [Math.round(window.scrollY), document.scrollingElement.scrollHeight]);
  if (!(await press(page, loc))) { finding(where, `the ${tile} tile could not be pressed`); return; }
  await page.waitForTimeout(300);
  await inside();
  await measure(page, `${where} card`);
  if (!(await press(page, page.locator('[data-cm-world-back]')))) { finding(where, 'no back button'); return; }
  await page.waitForTimeout(600);
  const after = await page.evaluate(() => [Math.round(window.scrollY), document.scrollingElement.scrollHeight]);
  if (Math.abs(after[0] - before[0]) > 1 || Math.abs(after[1] - before[1]) > 1) finding(where, `back did not put the page where it was: scrollY ${before[0]} then ${after[0]}, height ${before[1]} then ${after[1]}`);
}

/* ---------- the cases ---------- */
async function caseA(browser, size, tag) {
  const where = `(a) Chelsea season one ${tag}`;
  const { ctx, page, errors } = await open(browser, saves.a.items, size);
  try {
    if (!(await toCups(page, where))) return;
    await measure(page, `${where} tiles`);
    await shot(page, `dsc-a-tiles-${tag}`);
    await roundTrip(page, where, async () => {
      await shot(page, `dsc-a-card-${tag}`);
      const card = await textOf(page, '[data-cm-super-cup]');
      for (const want of ['FA Community Shield', 'Arsenal', 'Manchester City', 'Premier League champions', 'FA Cup winners', 'Principality Stadium', saves.a.night, 'straight to penalties']) {
        if (!card.includes(want)) finding(where, `the card does not say "${want}" (it reads: ${card.slice(0, 220)})`);
      }
      const shown = await page.locator('[data-cm-super-cup-match="played"]').first().innerText().catch(() => '');
      const flat = shown.replace(/\s+/g, ' ');
      if (!flat.includes(saves.a.score) || !flat.includes(saves.a.home)) finding(where, `the card shows "${flat.slice(0, 120)}", the engine played ${saves.a.home} ${saves.a.score} ${saves.a.away}`);
      if (!card.includes(`${saves.a.winner} won${saves.a.pens ? ' on penalties' : ''}`)) finding(where, `the card does not name ${saves.a.winner} as the winner`);
    });
    if (errors.length) finding(where, `page errors: ${errors.slice(0, 2).join(' | ')}`);
  } finally { await ctx.close(); }
}
async function caseB(browser, size, tag) {
  const where = `(b) Arsenal season one ${tag}`;
  const { ctx, page, errors } = await open(browser, saves.b.items, size);
  try {
    if (!(await toCups(page, where))) return;
    const tile = await textOf(page, '[data-cm-world-tile="dsc"]');
    if (!tile.includes('settled before you arrived')) finding(where, `the tile reads "${tile.slice(0, 160)}"`);
    await roundTrip(page, where, async () => {
      await shot(page, `dsc-b-card-${tag}`);
      if (!(await count(page, '[data-cm-super-cup="stub"]'))) finding(where, 'the card is not the stub');
      if (await count(page, '[data-cm-super-cup-match]')) finding(where, 'the stub shows a match');
    });
    if (errors.length) finding(where, `page errors: ${errors.slice(0, 2).join(' | ')}`);
  } finally { await ctx.close(); }
}
async function caseC(browser, size, tag) {
  for (const sv of [saves.c, saves.c2]) {
    const where = `(c) ${sv.club} ${sv.label} ${tag}`;
    const { ctx, page, errors } = await open(browser, sv.items, size);
    try {
      if (!(await toCups(page, where))) continue;
      const tile = await textOf(page, '[data-cm-world-tile="dsc"]');
      if (!tile.includes('Not confirmed') || /none here/i.test(tile)) finding(where, `the tile reads "${tile.slice(0, 160)}"`);
      await shot(page, `dsc-c-tiles-${sv.key}-${tag}`);
      /* The card: titled, the reason given, no match and no promise of a cup the game never plays. */
      await roundTrip(page, where, async () => {
        await shot(page, `dsc-c-card-${sv.key}-${tag}`);
        const card = await textOf(page, '[data-cm-super-cup]');
        if (!card.includes('none is followed or played here')) finding(where, `the no-row card does not say why (it reads: ${card.slice(0, 200)})`);
        if (!card.startsWith('Not confirmed')) finding(where, `the no-row card has no title (it reads: ${card.slice(0, 120)})`);
        if (card.includes('The game plays this one')) finding(where, 'the no-row card says the game plays a cup it never plays');
        if (await count(page, '[data-cm-super-cup-match]')) finding(where, 'the no-row card shows a match');
      });
      if (errors.length) finding(where, `page errors: ${errors.slice(0, 2).join(' | ')}`);
    } finally { await ctx.close(); }
  }
}


/* ---------- Round 1514's saves: (g) a 2026-27 Marseille career in season one, (h) a crafted Chelsea season two in
   the UEFA Super Cup (an engine with one edit makes the save: the rollover reads my club as last season's
   Champions League winners; the dist that plays it is the real one) ---------- */
{
  const M = await E.fresh();
  const g = tape(0x1514a, () => M.cm.startCareer('Marseille')).value;
  const dsc = g.worldComps?.dsc;
  if (!dsc || dsc.skip || dsc.row !== 'fra-2026' || dsc.clubs.join() !== 'PSG,Lens') cannot(`Marseille's season one holds no followed Trophée des Champions of PSG and Lens (${JSON.stringify(dsc)})`);
  /* Round 1516: season one's UEFA Super Cup, PSG against Aston Villa (the 2025-26 winners), followed from outside.
     The save is played on until its night has passed (none when the placer puts it before the first entry), so the
     walk reads the played result the engine gives. */
  let gs = g;
  for (let i = 0; i < 12 && M.cm.oneOffNightsDone(gs, 'usc') < 1 && gs.week < gs.calendar.length; i += 1) gs = tape(0x1516a + i, () => M.cm.playNextEntry(gs, { skipHalftime: true, noCoach: true })).value.state;
  const gu = gs.worldComps?.usc;
  const gr = M.cm.evalOneOff(gs, undefined, 'usc');
  const gf = gr?.fixtures?.[0];
  if (!gu || gu.skip || gu.clubs.join() !== 'PSG,Aston Villa' || !gr?.done || !gr.winner || !gf) cannot(`Marseille's season one holds no played UEFA Super Cup of PSG and Aston Villa (${JSON.stringify(gu)}, ${gr?.nightsDone ?? 0} nights done)`);
  saves.g = { items: saved(M, gs), usc: { winner: gr.winner, sub: `${gf.home} ${gf.hg}-${gf.ag} ${gf.away}`, score: `${gf.hg}-${gf.ag}`, pens: !!gf.pens } };
  console.log(`(g) Marseille season one: the Trophée des Champions, PSG v Lens, and the UEFA Super Cup ${saves.g.usc.sub}${gf.pens ? ' (penalties)' : ''}, won by ${gr.winner}, read after ${gs.week} entries`);
  const USC_OPEN = "    openOneOff(state, { tables: { table: null, cupWinner: null, cupRunnerUp: null, uclWinner: exit(watchHolder), uelWinner: exit(watchUelHolder) }, seasonOne: false }, 'usc');";
  const EU = await engineOf(ROOT, 'walk-usc', { edits: [{ file: 'src/lib/clubManager.ts', from: USC_OPEN, to: USC_OPEN.replace('uclWinner: exit(watchHolder)', 'uclWinner: career.clubName') }] }, cannot);
  const MU = await EU.fresh();
  let s = tape(0x1514b, () => MU.cm.startCareer('Chelsea')).value;
  for (let i = 0; i < 300 && s.week < s.calendar.length; i += 1) s = tape(0x1514b + 1 + i, () => MU.cm.playNextEntry(s, { skipHalftime: true, noCoach: true })).value.state;
  const fin = tape(0x1514c, () => MU.cm.finishSeason(s)).value.state;
  const h = tape(0x1514d, () => MU.cm.startNextSeason(fin)).value;
  const usc = h.worldComps?.usc;
  const at = (h.calendar ?? []).findIndex(e => e.night?.k === 'usc');
  if (!usc || usc.skip || usc.clubs[0] !== 'Chelsea' || at < 0) cannot(`the crafted Chelsea season two is not in the UEFA Super Cup with its night on the calendar (${JSON.stringify(usc)})`);
  saves.h = { items: saved(MU, h), opp: usc.clubs[1], night: MU.cal.shortDate(MU.cal.entryDatesOf(h)[at]) };
  console.log(`(h) Chelsea season two: the UEFA Super Cup against ${usc.clubs[1]} on ${saves.h.night}, entry ${at}`);
}

/* ---------- the played half's saves: (d) a season two Arsenal entrant at week 0, (e) after it won the Shield ---------- */
{
  const M = await E.fresh();
  let s = tape(0x1510d, () => M.cm.startCareer('Arsenal')).value;
  for (let i = 0; i < 300 && s.week < s.calendar.length; i += 1) s = tape(0x1510d + 1 + i, () => M.cm.playNextEntry(s, { skipHalftime: true, noCoach: true })).value.state;
  const fin = tape(0x1510e, () => M.cm.finishSeason(s)).value.state;
  /* Crafted, so a season two Shield is certain: the season's cup final handed to Arsenal (the walk's only edit). */
  const final = (fin.cupBracket ?? []).find(t => t.round === 'F');
  if (!final) cannot('the Arsenal season has no cup final to set');
  final.winner = 'Arsenal';
  const d = tape(0x1510f, () => M.cm.startNextSeason(fin)).value;
  const dsc = d.worldComps?.dsc;
  if (!dsc || dsc.skip || !dsc.clubs.includes('Arsenal') || d.calendar[0]?.type !== 'oneOff') cannot(`the crafted Arsenal season two is not a participant with its night first (${JSON.stringify(dsc)})`);
  const night = M.cal.shortDate(M.cal.entryDatesOf(d)[0]);
  const opp = dsc.clubs.find(c => c !== 'Arsenal');
  saves.d = { items: saved(M, d), night, opp };
  console.log(`(d) Arsenal season two: the Shield against ${opp} on ${night}, the first entry of the calendar`);
  let e = null;
  for (let k = 0; k < 12 && !e; k += 1) {
    const M2 = await E.fresh();
    const st = JSON.parse(JSON.stringify(d));
    const after = tape(0x1510f0 + k, () => M2.cm.playNextEntry(st, { skipHalftime: true, noCoach: true })).value.state;
    if (after.trophies.some(t => t.minor && t.season === after.season)) e = { M: M2, s: after };
  }
  if (!e) cannot('Arsenal did not win the season two Shield on twelve streams');
  saves.e = { items: saved(e.M, e.s) };
  console.log(`(e) Arsenal season two after the Shield, won: the cabinet holds ${e.s.trophies.filter(t => t.minor).map(t => t.name).join(', ')}`);
}

async function caseD(browser, size, tag) {
  const where = `(d) Arsenal season two ${tag}`;
  const { ctx, page, errors } = await open(browser, saves.d.items, size);
  try {
    await page.waitForTimeout(800);
    await shot(page, `dsc-d-hub-${tag}`);
    /* innerText carries the CSS case (the hub's small headings are upper case), so the words are read lower case. */
    const text = ((await page.locator('#root').innerText().catch(() => '')) || '').replace(/\s+/g, ' ').toLowerCase();
    if (!text.includes('fa community shield')) finding(where, 'the hub does not name the FA Community Shield as the next match');
    if (!text.includes(saves.d.opp.toLowerCase())) finding(where, `the hub does not name ${saves.d.opp}`);
    if (!text.includes('season not started')) finding(where, 'the hub does not say the season has not started before the Shield');
    if (!(await toCups(page, where))) return;
    const tile = await textOf(page, '[data-cm-world-tile="dsc"]');
    if (!tile.includes('Your club is in it')) finding(where, `the Super cup tile reads "${tile.slice(0, 160)}"`);
    if (errors.length) finding(where, `page errors: ${errors.slice(0, 2).join(' | ')}`);
  } finally { await ctx.close(); }
}
async function caseE(browser, size, tag) {
  const where = `(e) Arsenal after the Shield ${tag}`;
  const { ctx, page, errors } = await open(browser, saves.e.items, size);
  try {
    await page.waitForTimeout(800);
    /* innerText carries the CSS case (the hub's small headings are upper case), so the words are read lower case. */
    const text = ((await page.locator('#root').innerText().catch(() => '')) || '').replace(/\s+/g, ' ').toLowerCase();
    if (!text.includes('cabinet') || !text.includes('fa community shield')) finding(where, 'the hub does not show the Shield in the cabinet');
    /* Fix-1510 (run lens, major 2; the critic's correction 13): after the Shield and before the league opener the
       season has not started, so the hub reads no league position off an unplayed table. */
    if (!text.includes('season not started')) finding(where, 'the season has not started, and the hub says it has after the Shield');
    const league = ((await page.getByRole('button').filter({ has: page.getByText('League', { exact: true }) }).first().innerText().catch(() => '')) || '').replace(/\s+/g, ' ');
    if (!/not started/i.test(league) || /#\s*\d/.test(league)) finding(where, `the League tile reads "${league.slice(0, 80)}" after the Shield, before the league opener`);
    await shot(page, `dsc-e-hub-${tag}`);
    /* (f) the stats centre's Super cups view, once one is played. */
    const ok = await press(page, page.getByRole('button').filter({ has: page.getByText('Stats', { exact: true }) }), 15000);
    if (!ok) { finding(where, 'the Stats tile could not be pressed'); return; }
    await page.waitForTimeout(1500);
    const pill = page.getByRole('button', { name: 'Super cups', exact: true });
    if (!(await pill.count())) finding(where, 'the stats centre shows no Super cups view after a super cup was played');
    await shot(page, `dsc-f-stats-${tag}`);
    if (errors.length) finding(where, `page errors: ${errors.slice(0, 2).join(' | ')}`);
  } finally { await ctx.close(); }
}
/* Round 1514: (g) the French row's card and the UEFA Super Cup's season one tile; (h) my club's UEFA Super Cup. */
async function caseG(browser, size, tag) {
  const where = `(g) Marseille season one ${tag}`;
  const { ctx, page, errors } = await open(browser, saves.g.items, size);
  try {
    if (!(await toCups(page, where))) return;
    await measure(page, `${where} tiles`);
    await shot(page, `usc-g-tiles-${tag}`);
    const tile = await textOf(page, '[data-cm-world-tile="dsc"]');
    /* Season one's night is the opening slot, so at week 0 the tile already gives the result (Round 1510's rule):
       the two clubs, never another cup. */
    if (!tile.includes('PSG') || !tile.includes('Lens') || /Not confirmed/.test(tile)) finding(where, `the Super cup tile reads "${tile.slice(0, 160)}"`);
    /* Round 1516: season one's UEFA Super Cup, played: the tile gives the engine's winner and score. */
    const utile = await textOf(page, '[data-cm-world-tile="usc"]');
    const u = saves.g.usc;
    if (!utile.includes(`Won by ${u.winner}`) || !utile.includes(u.sub)) finding(where, `the UEFA Super Cup tile reads "${utile.slice(0, 160)}", not won by ${u.winner} (${u.sub})`);
    await roundTrip(page, where, async () => {
      await shot(page, `usc-g-card-${tag}`);
      const card = await textOf(page, '[data-cm-super-cup]');
      for (const want of ['Trophée des Champions', 'PSG', 'Lens', 'champions', 'winners', 'Stade Bollaert-Delelis', 'straight to penalties', 'rarer exceptions']) {
        if (!card.includes(want)) finding(where, `the card does not say "${want}" (it reads: ${card.slice(0, 220)})`);
      }
    });
    await roundTrip(page, `${where} uefa`, async () => {
      await shot(page, `usc-g-ucard-${tag}`);
      if (await count(page, '[data-cm-super-cup="stub"]')) finding(where, 'the UEFA Super Cup card is a stub, not season one\'s played edition');
      if ((await count(page, '[data-cm-super-cup-match="played"]')) !== 1) finding(where, 'the UEFA Super Cup card does not show its one played match');
      const card = await textOf(page, '[data-cm-super-cup]');
      for (const want of ['UEFA Super Cup', 'PSG', 'Aston Villa', 'Champions League winners last season', 'Europa League winners last season', 'Stadion Salzburg', 'straight to penalties', saves.g.usc.score, `${saves.g.usc.winner} won`]) {
        if (!card.includes(want)) finding(where, `the UEFA Super Cup card does not say "${want}" (it reads: ${card.slice(0, 220)})`);
      }
    }, 'usc');
    if (errors.length) finding(where, `page errors: ${errors.slice(0, 2).join(' | ')}`);
  } finally { await ctx.close(); }
}
async function caseH(browser, size, tag) {
  const where = `(h) Chelsea season two, UEFA Super Cup ${tag}`;
  const { ctx, page, errors } = await open(browser, saves.h.items, size);
  try {
    if (!(await toCups(page, where))) return;
    await shot(page, `usc-h-tiles-${tag}`);
    const utile = await textOf(page, '[data-cm-world-tile="usc"]');
    if (!utile.includes('Your club is in it') || !utile.includes(saves.h.opp)) finding(where, `the UEFA Super Cup tile reads "${utile.slice(0, 160)}"`);
    await roundTrip(page, where, async () => {
      await shot(page, `usc-h-card-${tag}`);
      const card = await textOf(page, '[data-cm-super-cup]');
      for (const want of ['UEFA Super Cup', 'Chelsea', saves.h.opp, 'Champions League winners last season', 'Europa League winners last season', 'neutral ground', 'straight to penalties', saves.h.night]) {
        if (!card.includes(want)) finding(where, `the card does not say "${want}" (it reads: ${card.slice(0, 220)})`);
      }
    }, 'usc');
    if (errors.length) finding(where, `page errors: ${errors.slice(0, 2).join(' | ')}`);
  } finally { await ctx.close(); }
}
const browser = await chromium.launch();
try {
  const CASES = { a: caseA, b: caseB, c: caseC, d: caseD, e: caseE, g: caseG, h: caseH };
  for (const size of SIZES) {
    const tag = String(size[0]);
    /* Round 1514's cases at 390 and 1280. */
    for (const k of CONTROL ? CONTROLS[CONTROL].cases : Object.keys(CASES)) if (size[0] !== 320 || !'gh'.includes(k)) await CASES[k](browser, size, tag);
  }
} finally {
  await browser.close();
  server?.kill();
}
if (CONTROL) {
  const c = CONTROLS[CONTROL];
  const own = findings.filter(f => f.includes(c.finding));
  if (own.length) { console.log(`playOneOffCups: control ${CONTROL} FIRED (${own.length} findings of "${c.finding}", ${findings.length} in all)`); process.exit(1); }
  console.log(`playOneOffCups: control ${CONTROL} DID NOT FIRE (${findings.length} findings: ${findings.slice(0, 2).join(' / ')})`);
  process.exit(3);
}
console.log(findings.length ? `playOneOffCups: ${findings.length} FINDINGS` : `playOneOffCups: green, five cases at three sizes and two more at two, pictures in ${SHOTS}`);
process.exit(findings.length ? 1 : 0);
