/* Round 1307 review (lens RUN): my own walk of the NFL front office's Game Day tile and Watch, as a player.
   Observational: it prints what it measured ("ok" or "BAD" a line), saves pictures into $RC_OUT and exits 0. */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173';
const OUT = process.env.RC_OUT || '.';
fs.mkdirSync(OUT, { recursive: true });
const SAVE_KEY = 'front-office-save-v1';
let bad = 0;
const flag = (ok, what) => { console.log(`${ok ? 'ok  ' : 'BAD '} ${what}`); if (!ok) bad += 1; };
const note = what => console.log(`....  ${what}`);
const wait = (page, ms) => page.waitForTimeout(ms);

const stateOf = () => {
  const one = s => document.querySelector(s);
  const txt = s => (one(s)?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const rect = el => { if (!el) return null; const r = el.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height), w: Math.round(r.width) }; };
  const btn = label => [...document.querySelectorAll('[data-week-box] button')].find(b => (b.textContent ?? '').trim().startsWith(label));
  const play = btn('Play'), watch = btn('Watch Week');
  const owner = txt('[data-owner-mandate]');
  const pace = owner.match(/\d+ wins (keeps the mandate on pace|is behind the \d+-win ask)\.|In the postseason picture\. Hold it\.|Outside the line right now\. Upstairs is watching\./);
  const story = one('[data-gameday-scroll]');
  const box = one('[data-gameday-box]');
  const over = [];
  if (box) {
    const b = box.getBoundingClientRect();
    for (const el of [box, ...box.querySelectorAll('*')]) {
      if (el.closest('.sr-only') || el.closest('[data-season-help]')) continue;
      const name = `${el.tagName.toLowerCase()}${[...el.attributes].filter(a => a.name.startsWith('data-')).map(a => `[${a.name}]`).join('')}`;
      if (el.clientHeight > 0 && !el.matches('[data-gameday-scroll], [data-clock-events]') && el.scrollHeight > el.clientHeight + 1) over.push(`${name} ${el.scrollHeight} tall in ${el.clientHeight}`);
      if (el.clientWidth > 0 && !el.matches('[data-gameday-chips]') && el.scrollWidth > el.clientWidth + 1) over.push(`${name} ${el.scrollWidth} wide in ${el.clientWidth}`);
      if (!el.parentElement?.closest('[data-gameday-scroll], [data-clock-events], [data-gameday-chips]')) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0 && (r.right > b.right + 1 || r.left < b.left - 1 || r.bottom > b.bottom + 1 || r.top < b.top - 1)) over.push(`${name} leaves the box`);
      }
    }
  }
  return {
    scrollY: Math.round(window.scrollY), vh: window.innerHeight, vw: window.innerWidth, docW: document.documentElement.scrollWidth,
    box: rect(box), weekBox: rect(one('[data-week-box]')), face: one('[data-gameday]')?.getAttribute('data-gameday-face') ?? null,
    week: txt('[data-week-chip]'), record: txt('[data-record-chip]'), matchup: txt('[data-week-matchup]'), owner, pace: pace ? pace[0] : '',
    play: play ? { text: (play.textContent ?? '').trim(), disabled: play.disabled, ...rect(play) } : null,
    watch: watch ? { text: (watch.textContent ?? '').trim(), disabled: watch.disabled, ...rect(watch) } : null,
    grid: document.querySelectorAll('div.grid.max-h-56 > div').length, gridTop: rect(one('div.grid.max-h-56 > div'))?.top ?? null,
    final: txt('[data-gameday-final]'), where: txt('[data-gameday-where]'), standing: txt('[data-gameday-standing]'), next: txt('[data-gameday-next]'),
    shape: txt('[data-gameday-shape]'), plays: [...document.querySelectorAll('[data-deciding] li')].map(li => (li.textContent ?? '').replace(/\s+/g, ' ').trim()),
    line: [...document.querySelectorAll('[data-line-score] tr')].map(tr => (tr.textContent ?? '').replace(/\s+/g, ' ').trim()),
    chips: [...document.querySelectorAll('[data-gameday-chip]')].map(c => (c.textContent ?? '').replace(/\s+/g, ' ').trim()),
    clock: !!one('[data-match-clock]'), bug: txt('[data-score-bug]'), help: !!one('[data-season-help]'),
    story: story ? { content: story.scrollHeight, frame: story.clientHeight } : null, over,
    anims: document.getAnimations ? document.getAnimations().filter(a => a.playState === 'running').length : -1,
    lines: document.body.innerText.split('\n').map(l => l.trim()).filter(Boolean),
  };
};
const saveOf = key => {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  const s = JSON.parse(raw);
  const games = s.gameLog && Array.isArray(s.gameLog.games) ? s.gameLog.games : [];
  const t = s.league.teams[s.myTeam];
  return { raw, my: s.myTeam, week: s.league.week, season: s.league.season, phase: s.phase, wins: t.wins, losses: t.losses, record: `${t.wins}-${t.losses}`, n: games.length, last: games.length ? games[games.length - 1] : null };
};
const state = page => page.evaluate(stateOf);
const saved = page => page.evaluate(saveOf, SAVE_KEY);
const shot = async (page, name, full = false) => { await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: full }); };
const brief = st => `scrollY ${st.scrollY}, tile top ${st.box?.top} (h ${st.box?.h}), Play top ${st.play?.top}, Watch top ${st.watch?.top ?? 'none'}, grid first row ${st.gridTop}, vh ${st.vh}`;

async function newPage(browser, size, reduced, seed) {
  const ctx = await browser.newContext({ viewport: { width: size.w, height: size.h }, ...(reduced ? { reducedMotion: 'reduce' } : {}) });
  await ctx.addInitScript(s0 => { let s = s0; Math.random = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }, seed);
  const page = await ctx.newPage();
  await page.route(/supabase\.co/, r => r.abort());
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  return { ctx, page, errors };
}
async function start(page, want) {
  await page.goto(`${BASE}/front-office`, { waitUntil: 'networkidle' });
  await wait(page, 1000);
  const essential = page.locator('button:has-text("Essential only")');
  if (await essential.count() > 0) { await essential.first().click(); await wait(page, 300); }
  const named = want ? page.locator('.grid button', { hasText: want }) : null;
  if (named && await named.count() > 0) await named.first().click(); else await page.locator('.grid button').first().click();
  await wait(page, 900);
}
async function openWeek(page) {
  await page.locator('button:has-text("This week")').click();
  await page.waitForSelector('[data-gameday]', { timeout: 20000 });
  await wait(page, 500);
}
const pressPlay = async page => { await page.locator('[data-week-box] button', { hasText: /^\s*Play / }).first().click(); await wait(page, 350); };

/* One watched week. Samples the whole page until full time. `speed`: the chip pressed after `after` samples. */
async function watchWeek(page, tag, { speed = null, after = 2, shotAt = 3 } = {}) {
  const wb = page.locator('[data-watch-week]');
  await wb.scrollIntoViewIfNeeded();
  const b = await state(page);
  await wb.click();
  const svP = await saved(page);
  const g = svP.last, home = g.home === svP.my;
  const us = home ? g.homeScore : g.awayScore, them = home ? g.awayScore : g.homeScore, opp = home ? g.away : g.home;
  const forbidden = [`Record ${svP.record}`, `Week ${svP.week}/17`, `Play Week ${svP.week}`, `${svP.my} ${us}, ${opp} ${them}`, `${svP.wins} wins keeps`, `${svP.wins} wins is behind`];
  const spoiled = new Set();
  let samples = 0, first = null, newLines = [];
  const t0 = Date.now();
  for (;;) {
    const st = await state(page);
    if (st.face === 'result') break;
    if (Date.now() - t0 > 60000) { spoiled.add('no full time in 60 s'); break; }
    if (st.face === 'watch') {
      samples += 1;
      if (!first) { first = st; newLines = st.lines.filter(l => !b.lines.includes(l)); }
      if (st.week !== b.week) spoiled.add(`week chip "${st.week}"`);
      if (st.record !== b.record) spoiled.add(`record chip "${st.record}"`);
      if (st.matchup !== b.matchup) spoiled.add(`matchup "${st.matchup}"`);
      if (st.pace !== b.pace) spoiled.add(`pace "${st.pace}" (was "${b.pace}")`);
      if (st.owner !== b.owner) spoiled.add(`owner card "${st.owner}" (was "${b.owner}")`);
      if (!st.play?.disabled || st.play.text !== b.play.text) spoiled.add(`Play open or relabelled "${st.play?.text}"`);
      if (!st.watch?.disabled) spoiled.add('Watch open');
      if (st.grid !== 0 || st.final !== '' || st.standing !== '' || st.chips.length > 0) spoiled.add('a part of the result is drawn');
      const outside = st.lines.join('\n');
      for (const f of forbidden) if (outside.includes(f) && !b.lines.join('\n').includes(f)) spoiled.add(`the page holds "${f}"`);
      if (samples === shotAt) await shot(page, `${tag}-watching`);
      if (speed && samples === after) await page.locator(`[data-gameday-speed="${speed}"]`).click();
    }
    await wait(page, 250);
  }
  await wait(page, 900);
  const a = await state(page);
  const svA = await saved(page);
  flag(samples >= 1 && spoiled.size === 0, `${tag}: watched ${svP.my} week ${svP.week - 1} (${samples} samples, ${((Date.now() - t0) / 1000).toFixed(1)} s): nothing of the result on the page until full time${spoiled.size ? `: ${[...spoiled].slice(0, 4).join('; ')}` : ''}`);
  note(`${tag}: lines new on the page at the press (the feed): ${JSON.stringify(newLines.slice(0, 8))}`);
  note(`${tag}: pace before "${b.pace}", during "${first?.pace}", after "${a.pace}"; record before "${b.record}", after "${a.record}"; first watch face over: ${JSON.stringify(first?.over ?? [])}`);
  flag(a.face === 'result' && svA.raw === svP.raw && a.record === `Record ${svP.record}` && a.play && !a.play.disabled, `${tag}: at full time the result is shown, the page moved on (${a.week}, ${a.record}, "${a.final}") and the watch saved nothing`);
  note(`${tag}: before the press ${brief(b)}; at full time ${brief(a)}`);
  return { b, a, first };
}

async function mainWalk(browser, size, team, seed) {
  const T = `${size.w}`;
  console.log(`\n=== ${size.w} by ${size.h}, motion on, club wanted ${team} ===`);
  const { ctx, page, errors } = await newPage(browser, size, false, seed);
  await start(page, team);
  await openWeek(page);
  let st = await state(page);
  flag(st.face === 'next' && st.play && st.watch && st.docW <= st.vw, `${T}: the week box opens on the next face ("${st.next}"), Play "${st.play?.text}" and Watch "${st.watch?.text}" drawn, no sideways scroll (${st.docW} of ${st.vw})`);
  note(`${T}: next face: ${brief(st)}; over: ${JSON.stringify(st.over)}`);
  await shot(page, `${T}-1-next`);
  /* the first press of a visit */
  const pb = page.locator('[data-week-box] button', { hasText: /^\s*Play / }).first();
  await pb.scrollIntoViewIfNeeded();
  const b = await state(page);
  await pb.click();
  await wait(page, 1300);
  st = await state(page);
  flag(st.face === 'result' && st.final !== '' && st.grid === 16, `${T}: Play Week 1 shows the result ("${st.final}", ${st.where}; ${st.standing}) and the grid of ${st.grid}`);
  note(`${T}: before Play ${brief(b)}; after ${brief(st)}`);
  flag(st.play.top >= 0 && st.play.bottom <= st.vh, `${T}: after the first press the Play button is still on screen (its top at ${st.play.top}, bottom ${st.play.bottom} of ${st.vh})`);
  flag(st.box.top >= 0 && st.box.bottom <= st.vh, `${T}: after the first press the whole tile is on screen (top ${st.box.top}, bottom ${st.box.bottom} of ${st.vh})`);
  note(`${T}: line score ${JSON.stringify(st.line)}; shape "${st.shape}"; plays ${JSON.stringify(st.plays)}; chips ${JSON.stringify(st.chips)}; story ${JSON.stringify(st.story)}; over ${JSON.stringify(st.over)}`);
  await shot(page, `${T}-2-played`);
  await shot(page, `${T}-2-played-full`, true);
  /* the "?" */
  await page.locator('[data-gameday-help]').click();
  await wait(page, 500);
  st = await state(page);
  flag(st.help, `${T}: the "?" opens (${brief(st)})`);
  await shot(page, `${T}-3-help`);
  await page.keyboard.press('Escape');
  await wait(page, 300);
  st = await state(page);
  if (st.help) { await page.locator('[data-season-help] button').last().click(); await wait(page, 300); st = await state(page); }
  flag(!st.help, `${T}: the "?" closes`);
  /* Watch week 2 at 1x for a while, then 3x */
  await watchWeek(page, `${T}-4-watch2`, { speed: '3x', after: 16, shotAt: 12 });
  await shot(page, `${T}-4-watch2-fulltime`);
  /* Watch week 3 and Results at once */
  await watchWeek(page, `${T}-5-watch3-results`, { speed: 'Results', after: 1, shotAt: 1 });
  /* a reload in the middle of a watch */
  await page.locator('[data-watch-week]').click();
  await wait(page, 1500);
  const mid = await saved(page);
  await page.reload({ waitUntil: 'networkidle' });
  await wait(page, 800);
  await openWeek(page);
  st = await state(page);
  const after = await saved(page);
  flag(st.face === 'result' && !st.clock && after.raw === mid.raw && st.week.includes(`Week ${mid.week}/17`), `${T}: a reload in the middle of a watch shows the result (${st.final}; ${st.week}), no clock, and the save is the press's own (${after.n} games logged)`);
  /* leave the week box in the middle of a watch */
  await page.locator('[data-watch-week]').click();
  await wait(page, 1200);
  await page.locator('button', { hasText: /^\s*Hub\s*$/ }).first().click();
  await wait(page, 500);
  await openWeek(page);
  st = await state(page);
  flag(st.face === 'result' && !st.clock && !st.play.disabled && st.watch && !st.watch.disabled, `${T}: leaving for the hub in the middle of a watch ends it: back in the box the result (${st.final}), Play "${st.play.text}" open`);
  return { ctx, page, errors, T };
}

/* the rest of the season by Play: the tile on every week's result, then an old chip and Watch again */
async function lateSeason({ ctx, page, errors, T }) {
  let st, worst = null, weeks = 0, longest = '';
  const overSeen = [];
  for (let i = 0; i < 20; i += 1) {
    st = await state(page);
    if (!st.play || st.play.disabled || !/^Play Week/.test(st.play.text)) break;
    await pressPlay(page);
    st = await state(page);
    weeks += 1;
    if (st.story && (!worst || st.story.content - st.story.frame > worst.content - worst.frame)) worst = { ...st.story, where: st.where, plays: st.plays.length };
    if (st.over.length) overSeen.push(`${st.where}: ${st.over.slice(0, 2).join('; ')}`);
    if (st.shape.length > longest.length) longest = st.shape;
    if (st.docW > st.vw) overSeen.push(`${st.where}: the page scrolls sideways (${st.docW} of ${st.vw})`);
  }
  st = await state(page);
  flag(overSeen.length === 0 && weeks >= 8, `${T}: ${weeks} more weeks played: on every result nothing in the tile is taller or wider than its frame${overSeen.length ? `: ${overSeen.slice(0, 4).join(' | ')}` : ''}`);
  note(`${T}: the tallest story: ${JSON.stringify(worst)}; the longest shape sentence (${longest.length} chars): "${longest}"`);
  note(`${T}: late season: ${st.week}, ${st.record}, Play "${st.play?.text}", Watch ${st.watch ? `"${st.watch.text}"` : 'none'}, ${st.chips.length} chips, final "${st.final}", standing "${st.standing}", pace "${st.pace}"`);
  note(`${T}: late line score ${JSON.stringify(st.line)}; plays ${JSON.stringify(st.plays)}`);
  await page.locator('[data-gameday-box]').evaluate(el => el.scrollIntoView({ block: 'center' }));
  await wait(page, 300);
  await shot(page, `${T}-6-late`);
  flag(/final week/.test(st.play?.text ?? '') && !st.watch, `${T}: on the final week there is ${st.watch ? 'a' : 'no'} Watch button (Play reads "${st.play?.text}")`);
  if (st.chips.length > 2) {
    await page.locator('[data-gameday-chip]').first().evaluate(el => el.scrollIntoView({ block: 'nearest', inline: 'start' }));
    await page.locator('[data-gameday-chip]').first().click();
    await wait(page, 400);
    st = await state(page);
    note(`${T}: the first chip opened: where "${st.where}", final "${st.final}", standing "${st.standing}", over ${JSON.stringify(st.over)}`);
    await shot(page, `${T}-7-chip`);
    const again = page.locator('[data-gameday-again]');
    if (await again.count() > 0) {
      await again.click();
      await wait(page, 2500);
      st = await state(page);
      flag(st.face === 'watch' && st.clock && !st.play.disabled, `${T}: Watch again runs the clock on the old game (bug ${st.bug}); Play stays open ("${st.play.text}"); record chip "${st.record}"`);
      await shot(page, `${T}-8-again`);
      await page.locator('[data-gameday-speed="Results"]').click();
      await wait(page, 900);
      st = await state(page);
      flag(st.face === 'result', `${T}: Results ends Watch again on the result face (where "${st.where}", final "${st.final}")`);
    }
  }
  flag(errors.length === 0, `${T}: no page error${errors.length ? `: ${errors.slice(0, 2).join(' | ')}` : ''}`);
  await ctx.close();
}

/* Abandon in the middle of a watch, then a new franchise: nothing of the old one may be left */
async function abandonWalk(browser, size, seed) {
  console.log(`\n=== ${size.w} by ${size.h}: abandon in the middle of a watch ===`);
  const { ctx, page, errors } = await newPage(browser, size, false, seed);
  await start(page, null);
  await openWeek(page);
  await pressPlay(page);
  await page.locator('[data-watch-week]').click();
  await wait(page, 1200);
  const mid = await state(page);
  await page.locator('button', { hasText: 'Abandon franchise and restart' }).click();
  await wait(page, 600);
  await page.locator('.grid button').nth(5).click();
  await wait(page, 900);
  const boxOpen = await page.locator('[data-week-box]').count();
  if (!boxOpen) await openWeek(page); else await wait(page, 800);
  const st = await state(page);
  const sv = await saved(page);
  flag(mid.face === 'watch' && st.face === 'next' && !st.clock && st.week.includes('Week 1/17') && st.record === 'Record 0-0' && st.play && !st.play.disabled && st.watch && !st.watch.disabled && st.grid === 0 && sv.n === 0,
    `${size.w}: after an abandon in the middle of a watch the new franchise (${sv?.my}) opens clean: face ${st.face}, ${st.week}, ${st.record}, Play "${st.play?.text}" ${st.play?.disabled ? 'SHUT' : 'open'}, Watch ${st.watch?.disabled ? 'SHUT' : 'open'}, grid ${st.grid}, ${sv?.n} games logged, week box ${boxOpen ? 'still open' : 'reopened'}`);
  await shot(page, `${size.w}-9-abandon`);
  await pressPlay(page);
  const st2 = await state(page);
  flag(st2.face === 'result' && st2.chips.length === 1, `${size.w}: its first press shows its own game (${st2.final}, ${st2.chips.length} chip)`);
  flag(errors.length === 0, `${size.w}: no page error${errors.length ? `: ${errors.slice(0, 2).join(' | ')}` : ''}`);
  await ctx.close();
}

/* reduced motion: Watch shows the result at once, nothing moves */
async function reducedWalk(browser, size, seed) {
  console.log(`\n=== ${size.w} by ${size.h}, REDUCED MOTION ===`);
  const { ctx, page, errors } = await newPage(browser, size, true, seed);
  await start(page, null);
  await openWeek(page);
  await page.locator('[data-watch-week]').scrollIntoViewIfNeeded();
  const b = await state(page);
  await page.locator('[data-watch-week]').click();
  const seen = [];
  for (let i = 0; i < 12; i += 1) { const s = await state(page); seen.push(`${s.face}${s.clock ? '+clock' : ''}/${s.anims}`); await wait(page, 100); }
  const st = await state(page);
  flag(!seen.some(x => x.includes('clock') || x.startsWith('watch')) && st.face === 'result' && !st.play.disabled, `${size.w} reduced: Watch shows the result at once with no clock (faces and running animations sampled: ${seen.join(' ')}); "${st.final}", ${st.week}, Play "${st.play.text}" open`);
  note(`${size.w} reduced: before ${brief(b)}; after ${brief(st)}; Watch again offered: ${await page.locator('[data-gameday-again]').count()}`);
  await shot(page, `${size.w}-r-watch`);
  await page.locator('[data-gameday-help]').click();
  await wait(page, 400);
  await shot(page, `${size.w}-r-help`);
  flag(errors.length === 0, `${size.w} reduced: no page error${errors.length ? `: ${errors.slice(0, 2).join(' | ')}` : ''}`);
  await ctx.close();
}

const browser = await chromium.launch();
const run = async (name, fn) => { try { await fn(); } catch (e) { bad += 1; console.log(`BAD  ${name} threw: ${String(e).split('\n').slice(0, 3).join(' | ')}`); } };
const P = { w: 390, h: 844 }, D = { w: 1280, h: 900 };
await run('main 390', async () => { await lateSeason(await mainWalk(browser, P, null, 977)); });
await run('main 1280', async () => { await lateSeason(await mainWalk(browser, D, /Buccaneers|Commanders|Tampa|Washington/, 4242)); });
await run('abandon 390', () => abandonWalk(browser, P, 31));
await run('reduced 390', () => reducedWalk(browser, P, 977));
await run('reduced 1280', () => reducedWalk(browser, D, 977));
await browser.close();
console.log(`\nw2: ${bad} BAD line(s)`);
process.exit(0);
