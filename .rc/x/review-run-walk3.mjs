/* Reviewer's walk for Round 1221 (runner only, sent as an extra file).
   BASE      the head build, served by the remote check (#!serve)
   BASE_OLD  a build of the base commit, served by the request line on another port
   BASE_ROOT the base commit's worktree: the saves are made by ITS code (an old save)
   Plays the NFL My Career Season Center the way a player does, at 390x844 and 1280x900, with reduced motion
   on and off, on both builds from the same save, and holds what the two builds show to each other. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const HEAD = process.env.BASE ?? 'http://localhost:4173';
const OLD = process.env.BASE_OLD ?? '';
const BASE_ROOT = path.resolve(process.env.BASE_ROOT ?? '.');
const SHOTS = process.env.RC_OUT ?? path.join(os.tmpdir(), 'rr-shots');
fs.mkdirSync(SHOTS, { recursive: true });

let checks = 0;
let failed = 0;
const check = (ok, label) => { checks += 1; if (!ok) failed += 1; console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}`); };

/* ─── saves made by the BASE commit's own binding, in node ─── */
const OUT = path.join(os.tmpdir(), `rr-walk-${process.pid}.mjs`);
await build({
  stdin: { contents: "export { NFL_CAREER_SPORT } from './src/lib/nflCareerSport.ts';", resolveDir: BASE_ROOT, loader: 'ts' },
  bundle: true, format: 'esm', platform: 'node', outfile: OUT, absWorkingDir: BASE_ROOT, logLevel: 'error', alias: { '@': './src' }, jsx: 'automatic',
  banner: { js: "import { createRequire as __rr } from 'node:module'; const require = __rr(import.meta.url);" },
});
const mem = new Map();
globalThis.localStorage ??= { getItem: k => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => { mem.set(k, String(v)); }, removeItem: k => { mem.delete(k); }, clear: () => mem.clear() };
const M = await import(pathToFileURL(OUT).href);
function mulberry32(a) {
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
/** A save on the hub after `seasons` seasons, the way scripts/playUsSeasonCentre.mjs makes one. */
function makeSave(pos, seasons = 0, eraId = 'now') {
  const SB = M.NFL_CAREER_SPORT;
  const real = Math.random;
  for (let n = 0; n < 40; n += 1) {
    const rng = mulberry32(1221 + seasons * 7 + (eraId === 'now' ? 0 : 91) + n * 1009 + pos.length * 13 + pos.charCodeAt(0));
    Math.random = rng;
    try {
      const c = SB.startCareer('Old Save', pos, SB.create.archetypes[pos][0], rng, null, eraId);
      let tq = SB.rollTeamQuality(null, rng);
      SB.assignRole(c, tq, rng);
      if (c.role === 'backup' && n < 39) continue;
      for (let i = 0; i < seasons; i += 1) { SB.campBattle(c, tq, rng); SB.simSeason(c, tq, rng); SB.progress(c, rng); tq = SB.rollTeamQuality(tq, rng); }
      c.contractYears = Math.max(3, c.contractYears);
      /* a save whose LAST season can be watched again: a year the ledger holds, and a season he mostly played */
      const last = seasons ? c.seasons[c.seasons.length - 1] : null;
      if (last && n < 39 && (SB.seasonCentreHeld?.(last.year, c.eraId) || !(last.games >= 12))) continue;
      return { key: SB.saveKey, value: JSON.stringify({ c, phase: 'season', teamQuality: tq }) };
    } finally { Math.random = real; }
  }
  throw new Error(`no save for ${pos}`);
}

const browser = await pw.chromium.launch({ args: ['--no-sandbox', '--no-proxy-server'] });
let blocked = 0;

/** A context on a build with a storage image (every key), Math.random seeded, the live database unreachable. */
async function open(url, storage, { width, height, reduced }, seed = 1221) {
  const ctx = await browser.newContext({ viewport: { width, height }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  await ctx.addInitScript(([image, s]) => {
    let t = s >>> 0;
    Math.random = () => { t = (t + 0x6D2B79F5) >>> 0; let x = Math.imul(t ^ (t >>> 15), 1 | t); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
    try {
      if (!sessionStorage.getItem('rr-walk')) {
        sessionStorage.setItem('rr-walk', '1');
        for (const [k, v] of Object.entries(image)) localStorage.setItem(k, v);
      }
    } catch { /* private mode */ }
  }, [storage, seed]);
  await ctx.route(/supabase\.co/, r => { blocked += 1; return r.abort(); });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(`pageerror: ${String(e).slice(0, 200)}`));
  page.on('console', m => { if (m.type() === 'error' && !/supabase|Failed to load resource|ERR_FAILED/.test(m.text())) errors.push(`console: ${m.text().slice(0, 200)}`); });
  await page.goto(`${url}/nfl-my-career`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => /Play the \d+ season|^Continue$/.test((b.textContent ?? '').trim())), { timeout: 40000 }).catch(() => {});
  await page.waitForTimeout(800);
  for (let i = 0; i < 3; i += 1) {
    const had = await page.evaluate(() => { const b = [...document.querySelectorAll('[role="dialog"] button')].find(x => /Let's Play/.test(x.textContent ?? '')); if (b) b.click(); return !!b; });
    if (!had) break;
    await page.waitForTimeout(350);
  }
  /* an old save can open on a card that waits for an answer (a rivalry beat after the last season): the
     walk presses Continue the way a player does, until the hub is there */
  let cards = 0;
  for (let i = 0; i < 8; i += 1) {
    const state = await page.evaluate(() => {
      const bs = [...document.querySelectorAll('button')];
      if (bs.some(b => /Play the \d+ season/.test(b.textContent ?? ''))) return 'hub';
      const c = bs.find(b => (b.textContent ?? '').trim() === 'Continue' && !b.disabled);
      if (c) { c.click(); return 'card'; }
      return 'other';
    });
    if (state === 'hub') break;
    if (state === 'card') cards += 1;
    await page.waitForTimeout(600);
  }
  await page.waitForTimeout(400);
  return { ctx, page, errors, cards };
}
const imageOf = save => ({ 'cookie-consent': 'essential', [save.key]: save.value, 'seasonCentre:help:nfl': '1', 'seasonCentre:help:nba': '1' });
const clickText = (page, text) => page.evaluate(t => {
  const b = [...document.querySelectorAll('button')].find(x => !x.disabled && (x.textContent ?? '').includes(t));
  if (!b) return false;
  b.click();
  return true;
}, text);
const shot = async (page, name) => { try { await page.screenshot({ path: path.join(SHOTS, `${name}.png`) }); } catch (e) { console.log(`     no screenshot ${name}: ${String(e).slice(0, 80)}`); } };

/** What the viewer shows for the game on screen: the bug, every feed line (label and words), his line. */
const readGame = page => page.evaluate(() => {
  const c = document.querySelector('[data-match-clock]');
  if (!c) return null;
  const lis = [...c.querySelectorAll('[data-clock-events] li')];
  return {
    score: c.dataset.score ?? '', full: !!document.querySelector('[data-full-time]'),
    names: [...c.querySelectorAll('.truncate')].map(el => el.textContent ?? ''),
    feed: lis.map(li => [...li.children].map(ch => (ch.textContent ?? '').trim())),
    line: document.querySelector('[data-his-line]')?.textContent ?? '',
    cut: lis.filter(li => li.children.length === 2 && (li.children[0].scrollWidth > li.children[0].clientWidth || li.children[0].getBoundingClientRect().right > li.children[1].getBoundingClientRect().left + 0.5)).length,
  };
});
const readLog = async (page, phone) => {
  if (phone) await page.evaluate(() => document.querySelector('[data-game-log-open]')?.click());
  await page.waitForTimeout(200);
  const out = await page.evaluate(() => {
    const panel = [...document.querySelectorAll('[data-record-panel]')].find(el => el.offsetParent !== null);
    const rows = panel ? [...panel.querySelectorAll('[data-game-log] li[data-log-row]')] : [];
    return { record: panel?.dataset.record ?? '', rows: rows.map(li => [...li.children].map(ch => (ch.textContent ?? '').trim()).join(' | ')), wrapped: rows.filter(li => li.getBoundingClientRect().height > 24).length };
  });
  return out;
};
const layout = page => page.evaluate(() => ({
  sideways: document.documentElement.scrollWidth > innerWidth + 1,
  offRight: [...document.querySelectorAll('[data-season-centre] button, [data-season-centre] li, [data-season-centre] h2, [data-season-centre] p')].filter(el => { const r = el.getBoundingClientRect(); return r.width > 0 && (r.right > innerWidth + 1 || r.left < -1); }).length,
  anims: document.getAnimations().filter(a => a.playState === 'running').length,
}));

/** One walk of a season: the hub, the entry, the first game watched (or painted at once under reduced
 *  motion), then every game at Results, the review and the whole log. `from`: resume, nothing is kicked off. */
async function walkSeason(tag, url, storage, vp, { shots = false, stopAfter = 20, entry = '[data-week-by-week]' } = {}) {
  const phone = vp.width < 700;
  const W = await open(url, storage, vp);
  const p = W.page;
  const out = { tag, games: [], errors: W.errors, notes: { cards: W.cards } };
  /* the save as the hub holds it, before anything of the Season Center is pressed */
  out.hubStorage = await p.evaluate(() => Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)])));
  out.notes.entry = await p.evaluate(sel => { const b = document.querySelector(sel); if (!b) return null; b.scrollIntoView({ block: 'center' }); return (b.textContent ?? '').trim().slice(0, 80); }, entry);
  await p.waitForTimeout(200);
  if (shots) await shot(p, `${tag}-1-hub`);
  out.notes.entryBox = await p.evaluate(sel => { const b = document.querySelector(sel); if (!b) return null; const r = b.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), inside: r.left >= 0 && r.right <= innerWidth + 0.5 }; }, entry);
  await p.evaluate(sel => document.querySelector(sel)?.click(), entry);
  await p.waitForSelector('[data-season-centre] [data-kickoff], [data-season-centre] [data-match-clock]', { timeout: 30000 }).catch(() => {});
  await p.waitForTimeout(500);
  out.notes.card = await p.evaluate(() => (document.querySelector('[data-kickoff]')?.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 160));
  out.notes.us = await p.evaluate(() => document.querySelector('[data-kickoff] .text-lg')?.textContent ?? '');
  if (shots) await shot(p, `${tag}-2-kickoff`);
  out.notes.layKick = await layout(p);
  const started = await clickText(p, 'Kick off');
  out.notes.started = started;
  await p.waitForTimeout(350);
  /* reduced motion paints the final at once; otherwise the clock is running and is not at the final yet */
  const early = await p.evaluate(() => ({ full: !!document.querySelector('[data-full-time]'), minute: document.querySelector('[data-match-clock]')?.dataset.minute ?? null, anims: document.getAnimations().filter(a => a.playState === 'running').length }));
  out.notes.early = early;
  if (!vp.reduced) {
    await p.waitForTimeout(2600);
    out.notes.mid = await p.evaluate(() => ({ full: !!document.querySelector('[data-full-time]'), minute: document.querySelector('[data-match-clock]')?.dataset.minute ?? null, score: document.querySelector('[data-match-clock]')?.dataset.score ?? null }));
    if (shots) await shot(p, `${tag}-3-live`);
  }
  await clickText(p, 'Results');
  await p.waitForSelector('[data-full-time]', { timeout: 15000 }).catch(() => {});
  await p.waitForTimeout(250);
  if (shots) await shot(p, `${tag}-4-final`);
  out.notes.layFinal = await layout(p);
  out.notes.posters = [];
  for (let i = 0; i < stopAfter; i += 1) {
    if (i > 0) {
      const next = await clickText(p, '▶ Game');
      if (!next) break;
      await p.waitForTimeout(160);
      /* a big game opens on a poster first (halfway, the last game): the same button plays it */
      if (!(await p.evaluate(() => !!document.querySelector('[data-match-clock]')))) {
        out.notes.posters.push(await p.evaluate(() => (document.querySelector('[data-centre-stage]')?.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 140)));
        if (shots && out.notes.posters.length === 1) await shot(p, `${tag}-7-poster`);
        out.notes.layPoster = await layout(p);
        if (!(await clickText(p, '▶ Game'))) break;
      }
      await p.waitForSelector('[data-full-time]', { timeout: 8000 }).catch(() => {});
      await p.waitForTimeout(140);
    }
    const g = await readGame(p);
    if (!g) break;
    out.games.push(g);
  }
  out.notes.simmed = (await clickText(p, 'Season review')) || (await clickText(p, 'Sim the rest'));
  await p.waitForSelector('[data-review]', { timeout: 8000 }).catch(() => {});
  await p.waitForTimeout(1500);
  out.review = await p.evaluate(() => [...document.querySelectorAll('[data-review-tile]')].map(el => [el.dataset.reviewTile, el.firstElementChild?.textContent ?? '']));
  out.reviewText = await p.evaluate(() => (document.querySelector('[data-review]')?.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 600));
  if (shots) await shot(p, `${tag}-5-review`);
  out.notes.layReview = await layout(p);
  /* the whole season in the game log */
  out.log = await readLog(p, phone);
  if (shots) await shot(p, `${tag}-6-log`);
  if (phone) { await clickText(p, '← Back'); await p.waitForTimeout(150); }
  await p.evaluate(() => document.querySelector('[data-centre-exit]')?.click());
  await p.waitForTimeout(400);
  out.storage = await p.evaluate(() => Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)])));
  await W.ctx.close();
  return out;
}
/** Held by a reader of this file's own (not the page's, not the law's): the feed adds up to the bug, the
 *  labels are a football clock's and run forward, a kicker's team kicks only his own field goals. */
function truth(run, pos) {
  const us = run.notes.us;
  const bad = [];
  let lines = 0;
  const shapes = new Set();
  for (const [i, g] of run.games.entries()) {
    let a = 0; let b = 0; let last = -1; const mins = [];
    for (const row of g.feed) {
      if (row.length !== 2) continue;
      const [label, text] = row;
      lines += 1;
      const m = /^Q([1-4]) (\d{1,2}):00$/.exec(label);
      if (!m) { shapes.add(label); continue; }
      const minute = (Number(m[1]) - 1) * 15 + (15 - Number(m[2]));
      if (minute < last) bad.push(`game ${i + 1}: the feed runs backwards at "${label}"`);
      last = minute;
      const pts = text.includes('Touchdown') ? (text.includes('no good') ? 6 : text.includes('two point') ? 8 : 7) : text.includes('Field goal') ? 3 : text.includes('Safety') ? 2 : 0;
      if (!pts) continue;
      const mine = text.includes('! You ') || text.includes(`, ${us}.`);
      if (mine) a += pts; else b += pts;
      if (mins.includes(label)) bad.push(`game ${i + 1}: two scoring lines on "${label}"`);
      mins.push(label);
      if (pos === 'K' && text.includes(`Field goal, ${us}.`)) bad.push(`game ${i + 1}: his team kicks a field goal that is not his`);
      if (pos === 'K' && mine && text.includes('The kick after is no good')) bad.push(`game ${i + 1}: a kicker is told his kick after missed`);
      if (/undefined|NaN|\[object/.test(text)) bad.push(`game ${i + 1}: a broken word in "${text}"`);
    }
    if (g.score !== `${a}-${b}`) bad.push(`game ${i + 1}: the bug says ${g.score}, the feed adds up to ${a}-${b}`);
    if (!g.full) bad.push(`game ${i + 1}: not at the final when read`);
    if (g.cut) bad.push(`game ${i + 1}: ${g.cut} time labels cut off or over their words`);
  }
  return { bad, lines, shapes: [...shapes] };
}
const told = run => JSON.stringify({ games: run.games.map(g => [g.score, g.names, g.feed, g.line]), log: run.log, review: run.review ?? null });

const VP = { p0: { width: 390, height: 844, reduced: false }, p1: { width: 390, height: 844, reduced: true }, d0: { width: 1280, height: 900, reduced: false }, d1: { width: 1280, height: 900, reduced: true } };
/* QB0: a rookie about to play (the season is played in the page by the press). The others hold seasons the
   BASE commit's engine already played: the last one is watched again, which draws nothing in the page. */
const SAVES = { QB0: makeSave('QB'), QB1: makeSave('QB', 1), K3: makeSave('K', 3), LB1: makeSave('LB', 1), QB17: makeSave('QB', 17, 'y2005'), WR2: makeSave('WR', 2) };
for (const [name, s] of Object.entries(SAVES)) { const c = JSON.parse(s.value).c; const last = c.seasons?.[c.seasons.length - 1]; console.log(`     save ${name}: made by the base commit's binding, ${s.value.length} bytes, era ${c.eraId}, year ${c.year}, role ${c.role}, seasons ${c.seasons?.length ?? 0}${last ? `, last ${last.year} with ${last.games} games` : ''}`); }
const posOf = name => name.replace(/\d+$/, '');
const AGAIN = '[data-watch-last]';

const head = {};
const plan = [
  ['QB0', 'p0', true, undefined], ['QB0', 'p1', true, undefined], ['QB0', 'd0', true, undefined], ['QB0', 'd1', true, undefined],
  ['QB1', 'p0', false, AGAIN], ['QB1', 'd0', false, AGAIN], ['K3', 'p0', true, AGAIN], ['LB1', 'd0', true, AGAIN], ['QB17', 'p0', true, AGAIN], ['WR2', 'd1', false, AGAIN],
];
for (const [name, v, shots, entry] of plan) {
  const tag = `head-${name}-${v}`;
  let run;
  try { run = await walkSeason(tag, HEAD, imageOf(SAVES[name]), VP[v], { shots, ...(entry ? { entry } : {}) }); } catch (e) { check(false, `${tag}: the walk threw: ${String(e).slice(0, 200)}`); continue; }
  head[`${name}-${v}`] = run;
  const t = truth(run, posOf(name));
  console.log(`     ${tag}: entry "${run.notes.entry}" ${JSON.stringify(run.notes.entryBox)}, us "${run.notes.us}", ${run.games.length} games, ${t.lines} feed lines, record ${run.log?.record}, log rows ${run.log?.rows.length}, other labels ${JSON.stringify(t.shapes)}, early ${JSON.stringify(run.notes.early)}, mid ${JSON.stringify(run.notes.mid ?? null)}`);
  console.log(`     ${tag}: game 1 ${run.games[0]?.score} "${run.games[0]?.line}" ${JSON.stringify(run.games[0]?.feed.slice(0, 4))}`);
  console.log(`     ${tag}: review ${JSON.stringify(run.review)}; log row 1 "${run.log?.rows[0]}"; cards answered before the hub ${run.notes.cards}; posters ${JSON.stringify(run.notes.posters)}; scores ${run.games.map(g => g.score).join(' ')}`);
  {
    /* the walk read 17 different games, and the record is the games' own */
    const won = run.games.filter(g => { const [a, b] = g.score.split('-').map(Number); return a > b; }).length;
    const lost = run.games.filter(g => { const [a, b] = g.score.split('-').map(Number); return a < b; }).length;
    const tied = run.games.length - won - lost;
    check(run.log?.record === (tied ? `${won}-${lost}-${tied}` : `${won}-${lost}`), `${tag}: the record on the panel (${run.log?.record}) is the 17 score bugs the walk read (${won} won, ${lost} lost, ${tied} level)`);
  }
  check(run.notes.entry !== null && run.games.length === 17, `${tag}: the entry is on the hub and the season is walked (${run.games.length} games read, log ${run.log?.rows.length} rows, review ${run.review?.length} tiles)`);
  check(t.bad.length === 0 && t.lines >= 20, `${tag}: every game's feed adds up to its score bug, the clock labels run forward, no time label is cut off (${t.lines} lines)${t.bad.length ? `: ${t.bad.slice(0, 3).join(' | ')}` : ''}`);
  check(t.shapes.every(sx => ['Kickoff.', 'Final', 'FINAL', 'Q1 15:00', ''].includes(sx) || /^(Q[1-4] \d{1,2}:00)$/.test(sx)), `${tag}: every time label is a quarter and minutes (others: ${JSON.stringify(t.shapes)})`);
  const lays = [run.notes.layKick, run.notes.layFinal, run.notes.layReview].filter(Boolean);
  check(lays.length === 3 && lays.every(l => !l.sideways && l.offRight === 0), `${tag}: nothing runs off the side of the screen on the first card, a final or the review (${JSON.stringify(lays)})`);
  check((run.log?.wrapped ?? 1) === 0 && (run.log?.rows.length ?? 0) >= 15, `${tag}: the whole season is in the game log and no row wraps (${run.log?.rows.length} rows, ${run.log?.wrapped} wrapped)`);
  if (VP[v].reduced) check(run.notes.early.full === true, `${tag}: reduced motion paints the final at once after Kick off (full time ${run.notes.early.full}, minute ${run.notes.early.minute}, running animations ${run.notes.early.anims})`);
  else check(run.notes.early.full === false && !!run.notes.mid && run.notes.mid.minute !== run.notes.early.minute, `${tag}: with motion on the clock runs after Kick off (minute ${run.notes.early.minute} then ${run.notes.mid?.minute}, score then ${run.notes.mid?.score})`);
  check(run.errors.length === 0, `${tag}: no page error and no console error${run.errors.length ? `: ${run.errors.slice(0, 2).join(' | ')}` : ''}`);
  if (entry) check(run.storage?.[SAVES[name].key] === run.hubStorage?.[SAVES[name].key], `${tag}: watching a season again leaves the old save's bytes as they were`);
}
/* a played season is one season, whatever the screen */
check(!!head['QB1-p0'] && !!head['QB1-d0'] && told(head['QB1-p0']) === told(head['QB1-d0']), 'the season on the old save reads the same on a phone and on a desktop (every score, feed line, label, his line, the log, the review)');
{
  const qs = ['QB0-p0', 'QB0-p1', 'QB0-d0', 'QB0-d1'].map(k => head[k]).filter(Boolean);
  const all = qs.length === 4 && qs.every(r => told(r) === told(qs[0]));
  console.log(`     NOTE (not a check: the press plays the season with the page's own generator): the rookie's season reads the same in all four walks: ${all}`);
}

/* ─── the same saves on a build of the base commit: an old build and the new one tell one season ─── */
if (!OLD) check(false, 'no build of the base commit was served (BASE_OLD): the old build was not walked');
else {
  for (const [name, v, entry] of [['QB1', 'p0', AGAIN], ['QB1', 'd0', AGAIN], ['K3', 'p0', AGAIN], ['LB1', 'd0', AGAIN], ['QB17', 'p0', AGAIN], ['WR2', 'd1', AGAIN], ['QB0', 'p0', undefined]]) {
    const tag = `base-${name}-${v}`;
    let run;
    try { run = await walkSeason(tag, OLD, imageOf(SAVES[name]), VP[v], { shots: name === 'K3', ...(entry ? { entry } : {}) }); } catch (e) { check(false, `${tag}: the walk threw: ${String(e).slice(0, 200)}`); continue; }
    const h = head[`${name}-${v}`];
    const same = !!h && told(run) === told(h);
    const firstOff = h ? run.games.findIndex((g, i) => JSON.stringify(g) !== JSON.stringify(h.games[i])) : -2;
    const feedLines = run.games.reduce((a, g) => a + g.feed.length, 0);
    const savedSame = !!h && run.storage?.[SAVES[name].key] === h.storage?.[SAVES[name].key];
    if (entry) {
      check(same && run.games.length === 17, `${name} ${v}: a season the base commit's engine played is told the same by the base build and by the head build: every score, feed line, time label, his line, the log and the review (${run.games.length} and ${h?.games.length} games, ${feedLines} feed lines, ${run.log?.rows.length} log rows${same ? '' : `; first game that differs ${firstOff + 1}`})`);
      check(savedSame, `${name} ${v}: both builds leave the same bytes on the save`);
    } else if (savedSame) {
      check(same, `${name} ${v}: pressed on both builds, the engine played the same season (same saved bytes) and both builds tell it the same (${run.games.length} games, ${feedLines} feed lines${same ? '' : `; first game that differs ${firstOff + 1}`})`);
    } else {
      console.log(`     NOTE ${name} ${v}: the two builds' presses did not play the same season (the page's generator was at a different draw), so this pair says nothing about the law; told the same: ${same}`);
    }
  }
}
await browser.close();
try { fs.writeFileSync(path.join(SHOTS, 'walk-told.json'), JSON.stringify(Object.fromEntries(Object.entries(head).map(([k, r]) => [k, { notes: r.notes, log: r.log, review: r.review, reviewText: r.reviewText, games: r.games.slice(0, 3) }])), null, 1)); } catch { /* a note only */ }
console.log(`     requests to the live database blocked: ${blocked}`);
console.log(`review-run-walk: ${checks} checks, ${failed} failed`);
process.exit(failed ? 1 : 0);
