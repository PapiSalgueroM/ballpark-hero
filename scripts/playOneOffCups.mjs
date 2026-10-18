/* Round 1510: the super cup on the page. The built dist served like the host (BASE, or SWEEP_BASE, from the
 * runner's #!serve), Supabase and the ad hosts aborted, saves made by the engine and planted from /robots.txt, at
 * 320 by 640, 390 by 844 and 1280 by 900:
 *   (a) a 2026-27 Chelsea career in season one at week 0: Cups shows the Super cup tile, and its card names the
 *       FA Community Shield, Arsenal and Manchester City with why each is in, the ground of the verified edition,
 *       the game's date of the night (the Wednesday before the first league game) and the score and winner the
 *       engine's own evaluation gives, word for word.
 *   (b) a 2026-27 Arsenal career in season one: the tile and the card say the club's place was settled before the
 *       manager arrived, and show no score.
 *   (c) a 2005-06 era career (its row not confirmed): the tile says so.
 *   (d) a 2026-27 Arsenal career rolled into season two with the cup final handed to Arsenal (crafted, so the
 *       Shield is certain): the hub names the FA Community Shield and the other club as the next match and still
 *       says the season has not started; the Super cup tile says the club is in it.
 *   (e) the same save after the Shield, on the first stream of twelve where Arsenal won it: the hub's Cabinet
 *       names it, and (f) the stats centre has its Super cups view.
 *   (e) on every view: scrollY and the document height the same before a tile and after its back button, every
 *       control at least 44 px tall, no text under 12 px, no sideways scroll, nothing cut or overlapping.
 * Pictures of every view go into $RC_OUT/shots (dsc-<case>-<width>.png) to be looked at.
 * CONTROLS (PLAY_ONEOFF_CONTROL; each builds its own dist from a patched copy of one line, put back after): notile
 * (the Super cup tile taken out: (a) red), swap (the card shows the score the wrong way round: (a) red). Not a
 * control here, with the reason: `ahead` (a result shown a week early) needs a night after the season's first entry,
 * and the only verified row is played before it on every calendar, so there is no earlier week to show it in.
 * Exit 0 green, 1 a finding (or a control that fired), 2 could not run. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { engineOf, tape } from './lib/worldUclFleet.mjs';
import { chromium } from './lib/playwrightLoader.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.PLAY_ONEOFF_CONTROL || '';
const SIZES = [[320, 640], [390, 844], [1280, 900]];
const TEMP = fs.mkdtempSync(path.join(os.tmpdir(), 'dukb-one-off-walk-'));
const SHOTS = path.join(process.env.RC_OUT || TEMP, 'shots');
fs.mkdirSync(SHOTS, { recursive: true });
const cannot = why => { console.log(`playOneOffCups: could not run. ${why}`); process.exit(2); };
if (!process.env.CI) cannot('it builds and serves the site, so it runs on a runner only (CI is not set)');
const CONTROLS = {
  notile: { file: 'src/components/club-manager/WorldCompScreen.tsx',
    from: `<Tile icon="🛡️" title="Super cup" value={dscStatus.value} sub={dscStatus.sub} testId="dsc" onClick={() => go({ ...HOME, at: 'dsc' })} />`,
    to: '', finding: 'no Super cup tile' },
  swap: { file: 'src/lib/clubManagerWorldView.ts',
    from: '        homeGoals: got?.hg ?? null, awayGoals: got?.ag ?? null,',
    to: '        homeGoals: got?.ag ?? null, awayGoals: got?.hg ?? null,', finding: 'the card shows' },
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
  saves.c = { items: saved(M3, c), club };
  console.log(`(c) ${club} 2005: no super cup (the era's row is partial)`);
}

/* ---------- the build: the served one, or a control's own ---------- */
let url = process.env.BASE || process.env.SWEEP_BASE || 'http://localhost:4173';
let server = null;
if (CONTROL) {
  const c = CONTROLS[CONTROL];
  const file = path.join(ROOT, c.file);
  const original = fs.readFileSync(file);
  const text = original.toString('utf8').replaceAll('\r\n', '\n');
  const n = text.split(c.from).length - 1;
  if (n !== 1) cannot(`control ${CONTROL}: its line stands in ${c.file} ${n} times, it must be exactly once`);
  const out = path.join(TEMP, `dist-${CONTROL}`);
  try {
    fs.writeFileSync(file, text.replace(c.from, c.to));
    execFileSync(path.join(ROOT, 'node_modules', '.bin', 'vite'), ['build', '--outDir', out, '--emptyOutDir'], { cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'], timeout: 25 * 60000 });
  } finally {
    fs.writeFileSync(file, original);
  }
  if (!fs.readFileSync(file).equals(original)) cannot(`control ${CONTROL}: ${c.file} was not put back`);
  server = spawn(process.execPath, [path.join(ROOT, 'scripts', 'lib', 'hostLikeServer.mjs'), out, '4192'], { stdio: 'ignore' });
  url = 'http://localhost:4192';
  console.log(`control ${CONTROL}: built ${c.file} with its line patched into ${out}; the file is back as it was`);
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
  await press(page, page.getByRole('button', { name: /^Essential only$/i }), 1500);
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
async function roundTrip(page, where, inside) {
  const loc = page.locator('[data-cm-world-tile="dsc"]');
  if (!(await count(page, '[data-cm-world-tile="dsc"]'))) { finding(where, 'no Super cup tile'); return; }
  await loc.first().scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(250);
  const before = await page.evaluate(() => [Math.round(window.scrollY), document.scrollingElement.scrollHeight]);
  if (!(await press(page, loc))) { finding(where, 'the Super cup tile could not be pressed'); return; }
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
  const where = `(c) ${saves.c.club} 2005 ${tag}`;
  const { ctx, page, errors } = await open(browser, saves.c.items, size);
  try {
    if (!(await toCups(page, where))) return;
    const tile = await textOf(page, '[data-cm-world-tile="dsc"]');
    if (!tile.includes('Not confirmed')) finding(where, `the tile reads "${tile.slice(0, 160)}"`);
    await shot(page, `dsc-c-tiles-${tag}`);
    if (errors.length) finding(where, `page errors: ${errors.slice(0, 2).join(' | ')}`);
  } finally { await ctx.close(); }
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
const browser = await chromium.launch();
try {
  for (const size of SIZES) {
    const tag = String(size[0]);
    await caseA(browser, size, tag);
    if (!CONTROL) { await caseB(browser, size, tag); await caseC(browser, size, tag); await caseD(browser, size, tag); await caseE(browser, size, tag); }
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
console.log(findings.length ? `playOneOffCups: ${findings.length} FINDINGS` : `playOneOffCups: green, five cases at three sizes, pictures in ${SHOTS}`);
process.exit(findings.length ? 1 : 0);
