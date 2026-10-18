/* Review of Round 1510 (lens: runs things): the super cup PLAYED the way a player would, on the served dist (BASE,
 * from the runner's #!serve), the database host and the ad hosts aborted, at 390 by 844 and 1280 by 900, with
 * reduced motion on and off. Saves made by the engine and planted in localStorage, as playOneOffCups does:
 *   W  a 2026-27 Chelsea career in season one (a watcher): Cups, the Super cup tile, its card, back; the ? and its
 *      super cup block.
 *   P  a 2026-27 Arsenal career rolled into season two with the season's cup final handed to Arsenal (a
 *      participant whose first entry is the Shield): the hub, the Calendar, then the Shield PLAYED (live on two
 *      contexts, quick sim on two), the report (with reduced motion: no animation running on it), Continue, the hub
 *      after it (it must still say the season has not started), the Cups card with the result, the Stats centre's
 *      Super cups view.
 * Every view is pictured into $RC_OUT/rv/<case>-<width>[-rm]-<view>.jpg. Findings print as FIND lines.
 * Exit 0 no findings, 1 findings, 2 could not run. */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const { engineOf, tape } = await import(pathToFileURL(path.join(ROOT, 'scripts/lib/worldUclFleet.mjs')).href);
const { chromium } = await import(pathToFileURL(path.join(ROOT, 'scripts/lib/playwrightLoader.mjs')).href);
const URL0 = process.env.BASE || process.env.SWEEP_BASE || 'http://localhost:4173';
const OUT = path.join(process.env.RC_OUT || '/tmp', 'rv');
fs.mkdirSync(OUT, { recursive: true });
const cannot = why => { console.log(`rvwalk1510: could not run: ${why}`); process.exit(2); };
const finds = [];
const find = (where, what) => { finds.push(`${where}: ${what}`); console.log(`  FIND ${where}: ${what}`); };
const BLOCK = /supabase\.co|googlesyndication|doubleclick|google-analytics|googletagmanager|adservice|fundingchoices/;

/* ---------- the saves ---------- */
const E = await engineOf(ROOT, 'rvwalk', {}, cannot);
const saved = (M, s) => { M.store.clear(); if (!M.cm.saveCareer(s)) cannot('a save was refused'); return [...M.store.entries()]; };
const saves = {};
{
  const M = await E.fresh();
  const a = tape(0x1510aa, () => M.cm.startCareer('Chelsea')).value;
  const r = M.cm.evalOneOff(a);
  const fx = r?.fixtures?.[0];
  const dates = M.cal.entryDatesOf(a);
  saves.W = { items: saved(M, a), fx, winner: r?.winner, night: M.cal.shortDate(M.cal.addDays(dates[0], -3)), firstLeague: M.cal.shortDate(dates[0]) };
  console.log(`W Chelsea season one: ${fx?.home} ${fx?.hg}-${fx?.ag} ${fx?.away}${fx?.pens ? ' (pens)' : ''} won by ${r?.winner}; night ${saves.W.night}, first league game ${saves.W.firstLeague}`);
  const M2 = await E.fresh();
  let s = tape(0x1510bb, () => M2.cm.startCareer('Arsenal')).value;
  for (let i = 0; i < 300 && s.week < s.calendar.length; i += 1) s = tape(0x1510bc + i, () => M2.cm.playNextEntry(s, { skipHalftime: true, noCoach: true })).value.state;
  const fin = tape(0x1510cc, () => M2.cm.finishSeason(s)).value.state;
  const final = (fin.cupBracket ?? []).find(t => t.round === 'F');
  if (!final) cannot('no cup final to hand to Arsenal');
  final.winner = 'Arsenal';
  const d = tape(0x1510dd, () => M2.cm.startNextSeason(fin)).value;
  const dsc = d.worldComps?.dsc;
  if (!dsc || dsc.skip || d.calendar[0]?.type !== 'oneOff') cannot(`Arsenal season two is not a participant (${JSON.stringify(dsc)})`);
  const dd = M2.cal.entryDatesOf(d);
  saves.P = { items: saved(M2, d), opp: dsc.clubs.find(c => c !== 'Arsenal'), night: M2.cal.shortDate(dd[0]), firstLeague: M2.cal.shortDate(dd[1]), clubs: dsc.clubs };
  console.log(`P Arsenal season two: ${dsc.clubs.join(' v ')}, the night ${saves.P.night}, the league opener ${saves.P.firstLeague}`);
}

/* ---------- the page ---------- */
const browser = await chromium.launch();
async function open(items, [w, h], reduced) {
  const touch = w < 1000;
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: touch, hasTouch: touch, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  page.setDefaultTimeout(20000);
  const errors = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 200)));
  await page.route(BLOCK, r => r.abort());
  await page.goto(`${URL0}/robots.txt`);
  await page.evaluate(entries => { localStorage.clear(); localStorage.setItem('cookie-consent', 'essential'); for (const [k, v] of entries) localStorage.setItem(k, v); }, items);
  await page.goto(`${URL0}/club-manager`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await click(page, page.getByRole('button', { name: 'Resume Career', exact: true }), 8000);
  await page.waitForTimeout(1200);
  return { ctx, page, errors };
}
async function click(page, loc, ms = 6000) {
  try { await loc.first().waitFor({ state: 'visible', timeout: ms }); await loc.first().evaluate(el => el.click()); await page.waitForTimeout(500); return true; } catch { return false; }
}
const btn = (page, re) => page.locator('button:visible').filter({ hasText: re });
const textOf = async page => ((await page.locator('#root').innerText().catch(() => '')) || '').replace(/\s+/g, ' ');
let shotN = 0;
const shot = async (page, name) => { shotN += 1; await page.screenshot({ path: path.join(OUT, `${name}.jpg`), type: 'jpeg', quality: 55 }).catch(() => {}); };
async function layout(page, where) {
  const m = await page.evaluate(() => {
    const vw = window.innerWidth;
    const out = { sideways: document.scrollingElement.scrollWidth > vw + 1, cut: [] };
    for (const el of document.querySelectorAll('#root *')) {
      const r = el.getBoundingClientRect();
      if (!r.width || ![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue;
      if (r.right > vw + 1 || r.left < -1) out.cut.push((el.textContent || '').trim().slice(0, 40));
    }
    return out;
  });
  if (m.sideways) find(where, 'the page scrolls sideways');
  for (const c of m.cut.slice(0, 3)) find(where, `"${c}" runs off the screen`);
}

/* ---------- W: the watcher ---------- */
async function caseW(size, reduced) {
  const id = `W-${size[0]}${reduced ? '-rm' : ''}`;
  const { ctx, page, errors } = await open(saves.W.items, size, reduced);
  try {
    await shot(page, `${id}-hub`);
    if (!(await click(page, page.getByRole('button').filter({ has: page.getByText('Cups', { exact: true }) }), 20000))) { find(id, 'no Cups tile on the hub'); return; }
    await page.locator('[data-cm-cups-view="tiles"]').waitFor({ timeout: 15000 }).catch(() => find(id, 'the Cups tiles did not open'));
    await shot(page, `${id}-tiles`);
    await layout(page, `${id} tiles`);
    const tile = ((await page.locator('[data-cm-world-tile="dsc"]').first().innerText().catch(() => '')) || '').replace(/\s+/g, ' ');
    console.log(`  ${id} tile: ${tile}`);
    if (!(await click(page, page.locator('[data-cm-world-tile="dsc"]')))) { find(id, 'the Super cup tile could not be pressed'); return; }
    await page.waitForTimeout(400);
    await shot(page, `${id}-card`);
    await layout(page, `${id} card`);
    const card = ((await page.locator('[data-cm-super-cup]').first().innerText().catch(() => '')) || '').replace(/\s+/g, ' ');
    console.log(`  ${id} card: ${card.slice(0, 400)}`);
    for (const want of ['FA Community Shield', saves.W.night, 'Principality Stadium', `${saves.W.fx.hg}-${saves.W.fx.ag}`]) if (!card.includes(want)) find(id, `the card does not say "${want}"`);
    if (/before you took charge/i.test(card)) find(id, 'the card says "before you took charge"');
    await click(page, page.locator('[data-cm-world-back]'));
    /* The ? and its super cup block. */
    if (await click(page, page.getByRole('button', { name: 'How to play' }))) {
      await page.waitForTimeout(800);
      const block = page.locator('[data-cm-help="super-cup"]');
      if (!(await block.count())) find(id, 'the ? has no super cup block');
      else { await block.first().scrollIntoViewIfNeeded().catch(() => {}); await page.waitForTimeout(300); await shot(page, `${id}-help`); }
    } else find(id, 'the ? could not be opened');
    if (errors.length) find(id, `page errors: ${errors.slice(0, 2).join(' | ')}`);
  } finally { await ctx.close(); }
}

/* ---------- P: the participant plays it ---------- */
const lower = s => s.toLowerCase();
async function caseP(size, reduced, way) {
  const id = `P-${size[0]}${reduced ? '-rm' : ''}-${way}`;
  let { ctx, page, errors } = await open(saves.P.items, size, reduced);
  try {
    await page.locator('[data-cm-next-match]').waitFor({ timeout: 45000 }).catch(() => find(id, 'no next match card on the hub'));
    await shot(page, `${id}-hub0`);
    await layout(page, `${id} hub0`);
    const t0 = lower(await textOf(page));
    for (const want of ['fa community shield', lower(saves.P.opp), 'season not started', 'neutral venue']) if (!t0.includes(want)) find(id, `the hub before the Shield does not say "${want}"`);
    /* The calendar names the night first, on its date. */
    if (await click(page, page.getByRole('button').filter({ has: page.getByText('Calendar', { exact: true }) }))) {
      await page.waitForTimeout(800);
      await shot(page, `${id}-calendar`);
      await layout(page, `${id} calendar`);
      const cal = await textOf(page);
      const at = cal.indexOf('FA Community Shield');
      console.log(`  ${id} calendar: ${at < 0 ? 'NO SHIELD' : cal.slice(Math.max(0, at - 80), at + 140)}`);
      if (at < 0) find(id, 'the calendar does not name the FA Community Shield');
      await page.goto(`${URL0}/club-manager`, { waitUntil: 'domcontentloaded' });
      await click(page, page.getByRole('button', { name: 'Resume Career', exact: true }), 8000);
      await page.locator('[data-cm-next-match]').waitFor({ timeout: 45000 }).catch(() => {});
    } else find(id, 'no Calendar tile');
    /* Play it. */
    if (!(await click(page, page.locator(`button:visible[data-cm-way="${way}"]`), 15000))) { find(id, `no ${way} button`); return; }
    const deadline = Date.now() + 150000;
    let seenLive = false;
    while (Date.now() < deadline) {
      if (await page.locator('[data-cm-timeline]').count()) break;
      if (!seenLive && await page.locator('[data-cm-live-stage]').count()) { seenLive = true; await page.waitForTimeout(1500); await shot(page, `${id}-live`); await layout(page, `${id} live`); }
      let hit = false;
      for (const re of [/^\s*Full report\s*$/, /^\s*Second half\s*$/, /^\s*Skip\s*$/]) {
        const b = btn(page, re);
        if (await b.count()) { await click(page, b, 2000); hit = true; break; }
      }
      await page.waitForTimeout(hit ? 900 : 700);
    }
    if (!(await page.locator('[data-cm-timeline]').count())) { await shot(page, `${id}-stuck`); find(id, 'the report never came'); return; }
    await page.waitForTimeout(4500);
    await shot(page, `${id}-report`);
    await layout(page, `${id} report`);
    const rep = await textOf(page);
    const m = rep.match(/(\d+)\s*[-:]\s*(\d+)/);
    console.log(`  ${id} report: ${rep.slice(0, 260)}`);
    if (!/community shield/i.test(rep)) find(id, 'the report does not name the FA Community Shield');
    if (reduced) {
      const running = await page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running').map(a => `${a.effect?.target?.tagName?.toLowerCase()}.${String(a.effect?.target?.className ?? '').split(' ').slice(0, 2).join('.')} ${a.animationName ?? a.transitionProperty ?? ''}`));
      if (running.length) find(id, `with reduced motion ${running.length} animations run on the report: ${running.slice(0, 3).join('; ')}`);
    }
    if (!(await click(page, btn(page, /Continue/), 10000))) find(id, 'no Continue on the report');
    await page.waitForTimeout(1500);
    for (let i = 0; i < 3 && await page.locator('[role="dialog"][data-state="open"]').count(); i += 1) { await page.keyboard.press('Escape'); await page.waitForTimeout(300); }
    await shot(page, `${id}-hub1`);
    await layout(page, `${id} hub1`);
    const t1 = lower(await textOf(page));
    if (!t1.includes('season not started')) find(id, 'after the Shield and before any league game the hub no longer says the season has not started');
    const won = /community shield is yours|cabinet/.test(t1) && t1.includes('fa community shield');
    console.log(`  ${id} hub after: ${t1.slice(0, 300)}`);
    /* The Cups card holds the result the report showed. */
    if (await click(page, page.getByRole('button').filter({ has: page.getByText('Cups', { exact: true }) }), 20000)) {
      await page.locator('[data-cm-cups-view="tiles"]').waitFor({ timeout: 15000 }).catch(() => {});
      await shot(page, `${id}-tiles`);
      if (await click(page, page.locator('[data-cm-world-tile="dsc"]'))) {
        await page.waitForTimeout(400);
        await shot(page, `${id}-card`);
        await layout(page, `${id} card`);
        const card = ((await page.locator('[data-cm-super-cup]').first().innerText().catch(() => '')) || '').replace(/\s+/g, ' ');
        console.log(`  ${id} card after: ${card.slice(0, 300)}`);
        if (m && !card.includes(`${m[1]}-${m[2]}`) && !card.includes(`${m[2]}-${m[1]}`)) find(id, `the card's score is not the report's ${m[1]}-${m[2]}: ${card.slice(0, 200)}`);
        if (!/ won/.test(card)) find(id, 'the card names no winner after the Shield was played');
        await click(page, page.locator('[data-cm-world-back]'));
      } else find(id, 'no Super cup tile after the Shield');
    }
    console.log(`  ${id}: ${won ? 'won (the cabinet names it)' : 'not won'}`);
    /* The stats centre's Super cups view. */
    await page.goto(`${URL0}/club-manager`, { waitUntil: 'domcontentloaded' });
    await click(page, page.getByRole('button', { name: 'Resume Career', exact: true }), 8000);
    await page.waitForTimeout(1000);
    if (await click(page, page.getByRole('button').filter({ has: page.getByText('Stats', { exact: true }) }), 15000)) {
      await page.waitForTimeout(1500);
      if (await click(page, page.getByRole('button', { name: 'Super cups', exact: true }))) {
        await page.waitForTimeout(600);
        await shot(page, `${id}-stats`);
        await layout(page, `${id} stats`);
        const st = await textOf(page);
        const at = st.toLowerCase().indexOf('super cups');
        console.log(`  ${id} stats: ${st.slice(Math.max(0, at - 40), at + 220)}`);
      } else find(id, 'no Super cups pill in the stats centre after the Shield');
    } else find(id, 'no Stats tile');
    if (errors.length) find(id, `page errors: ${errors.slice(0, 2).join(' | ')}`);
  } finally { await ctx.close(); }
}

/* ---------- run ---------- */
try {
  for (const size of [[390, 844], [1280, 900]]) {
    for (const reduced of [true, false]) {
      await caseW(size, reduced);
      await caseP(size, reduced, (size[0] === 390) === reduced ? 'live' : 'quick');
    }
  }
} catch (e) {
  console.log(`rvwalk1510: could not run: ${String(e?.stack ?? e).split('\n').slice(0, 3).join(' | ')}`);
  await browser.close();
  process.exit(2);
}
await browser.close();
console.log(`rvwalk1510: ${shotN} pictures in ${OUT}`);
console.log(finds.length ? `rvwalk1510: ${finds.length} FINDINGS` : 'rvwalk1510: no findings');
process.exit(finds.length ? 1 : 0);
