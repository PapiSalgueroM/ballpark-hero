// Reviewer walk (us-careers lens, Release AV). Never committed; sent to a runner as .rc/x/uscWalk.mjs.
//   node uscWalk.mjs makesaves <out.json>     cwd = the tree whose code makes the saves (origin/main for the old saves)
//   node uscWalk.mjs walk <oldsaves.json>     cwd = the head; BASE = the served build; screenshots into $RC_OUT
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const [mode, file] = process.argv.slice(2);
const root = process.cwd();
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'usc-walk-'));
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} };
const require = createRequire(import.meta.url);
const P = rel => path.join(root, rel).split(path.sep).join('/');
const entry = path.join(work, 'entry.ts'), outfile = path.join(work, 'bundle.cjs');
fs.writeFileSync(entry, [['nfl', 'src/lib/nflCareerSport.ts'], ['nba', 'src/lib/nbaCareerSport.ts'], ['mlb', 'src/lib/mlbCareerSport.ts'], ['nhl', 'src/lib/nhlCareerSport.ts']]
  .map(([as, rel]) => `export * as ${as} from '${P(rel)}';`).join('\n'));
await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'cjs', outfile, logLevel: 'silent', jsx: 'automatic', alias: { '@': path.join(root, 'src') },
  define: { 'import.meta.env': '{"PROD":true,"DEV":false}' }, loader: { '.css': 'empty', '.svg': 'empty', '.png': 'empty', '.jpg': 'empty', '.webp': 'empty' } });
const B = require(outfile);
const SPORTS = { nfl: B.nfl.NFL_CAREER_SPORT, nba: B.nba.NBA_CAREER_SPORT, mlb: B.mlb.MLB_CAREER_SPORT, nhl: B.nhl.NHL_CAREER_SPORT };
const ROUTES = { nfl: '/nfl-my-career', nba: '/nba-my-career', mlb: '/mlb-my-career', nhl: '/nhl-my-career' };
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const realRandom = Math.random;
const NL = String.fromCharCode(10);

/** A career of this tree's code: `seasons` seasons played, on the hub. `pick(c)` may refuse a draft (another seed is tried). */
function makeSave(slug, pos, era, seasons, opts = {}) {
  const S = SPORTS[slug];
  for (let n = 0; n < 400; n += 1) {
    const rng = mulberry32(4242 + n * 1013 + slug.charCodeAt(1) * 7 + pos.charCodeAt(0));
    Math.random = rng;
    try {
      const c = S.startCareer(opts.name ?? 'Review Walker', pos, S.create.archetypes[pos][0], rng, null, era);
      if (opts.year) c.year = opts.year;
      let tq = S.rollTeamQuality(null, rng);
      S.assignRole(c, tq, rng);
      if (opts.pick && !opts.pick(c)) continue;
      if (opts.starter && c.role === 'backup') continue;
      for (let i = 0; i < seasons && !c.retired; i += 1) { S.campBattle(c, tq, rng); S.simSeason(c, tq, rng); S.progress(c, rng); c.pendingRivalryEvent = null; c.pendingRivalryChoice = null; tq = S.rollTeamQuality(tq, rng); }
      if (c.retired || (c.suspendedSeasons ?? 0) > 0) continue;
      if (opts.after && !opts.after(c)) continue;
      c.contractYears = Math.max(4, c.contractYears);
      return { slug, key: S.saveKey, c, tq: opts.tq ?? tq, value: JSON.stringify({ c, phase: 'season', teamQuality: opts.tq ?? tq, coach: null }) };
    } finally { Math.random = realRandom; }
  }
  throw new Error(`no save for ${slug} ${pos} ${era}`);
}

if (mode === 'makesaves') {
  const out = { madeBy: root, saves: [] };
  for (const [slug, pos] of [['nfl', 'QB'], ['nfl', 'K'], ['nba', 'PG'], ['mlb', 'CF'], ['mlb', 'SP'], ['nhl', 'C'], ['nhl', 'G']]) {
    const s = makeSave(slug, pos, 'now', 3, { name: 'Old Save' });
    out.saves.push({ slug, pos, key: s.key, value: s.value, seasons: s.c.seasons.length, rival: s.c.rival ?? null });
    console.log(`makesaves ${slug} ${pos}: ${s.c.seasons.length} seasons, year ${s.c.year}, team ${s.c.team}, rival ${s.c.rival ? `${s.c.rival.name} (${s.c.rival.pos}) last "${s.c.rival.lastLine}" lastYear ${s.c.rival.lastYear ?? 'none'}` : 'none'}`);
  }
  fs.writeFileSync(file, JSON.stringify(out));
  console.log(`uscWalk makesaves: ${out.saves.length} saves by ${root}`);
  process.exit(0);
}
if (mode !== 'walk') { console.error('usage: uscWalk.mjs makesaves <out.json> | walk <oldsaves.json>'); process.exit(2); }

const { chromium } = await import('playwright');
const BASE = process.env.BASE || process.env.SWEEP_BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || path.join(root, '.tmp-fx', 'walk-out');
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ args: ['--no-sandbox'] });
let fails = 0, notes = 0;
const say = (ok, msg) => { if (!ok) fails += 1; console.log(`${ok ? 'ok  ' : 'FAIL'} ${msg}`); };
const note = msg => { notes += 1; console.log(`note ${msg}`); };

async function open(slug, save, width, height, reduced = false, seed = 7) {
  const ctx = await browser.newContext({ viewport: { width, height }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  await ctx.addInitScript(([k, v, s, route]) => {
    let t = s >>> 0;
    Math.random = () => { t = (t + 0x6D2B79F5) >>> 0; let x = Math.imul(t ^ (t >>> 15), 1 | t); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
    try {
      if (!sessionStorage.getItem('usc-walk')) {
        sessionStorage.setItem('usc-walk', '1');
        localStorage.setItem('cookie-consent', 'essential');
        localStorage.setItem(`rules-gate-seen:${route}`, '1');
        localStorage.setItem(k, v);
        for (const sp of ['nba', 'nfl', 'mlb', 'nhl']) localStorage.setItem(`seasonCentre:help:${sp}`, '1');
      }
    } catch { /* private mode */ }
  }, [save.key, save.value, seed, ROUTES[slug]]);
  await ctx.route(/supabase\.co/, r => r.abort());
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(`pageerror: ${String(e).slice(0, 200)}`));
  page.on('console', m => { if (m.type() === 'error' && !/supabase|Failed to load resource|ERR_FAILED|ERR_CONNECTION/.test(m.text())) errors.push(`console: ${m.text().slice(0, 200)}`); });
  await page.goto(`${BASE}${ROUTES[slug]}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some(b => /Play the \d+ season/.test(b.textContent ?? '')) || /Hall of Fame|retire/i.test(document.body.innerText), { timeout: 40000 }).catch(() => {});
  await page.waitForTimeout(900);
  for (let i = 0; i < 3; i += 1) {
    const had = await page.evaluate(() => { const b = [...document.querySelectorAll('[role="dialog"] button')].find(x => /Let's Play/.test(x.textContent ?? '')); if (b) b.click(); return !!b; });
    if (!had) break;
    await page.waitForTimeout(350);
  }
  return { ctx, page, errors, tag: `${slug} ${width}${reduced ? ' reduced' : ''}` };
}
const shot = (page, name) => page.screenshot({ path: path.join(OUT, `${name}.png`) }).catch(() => {});
const clickText = (page, text) => page.evaluate(t => { const b = [...document.querySelectorAll('button')].find(x => !x.disabled && (x.textContent ?? '').includes(t)); if (!b) return false; b.click(); return true; }, text);
const playButton = page => page.locator('button', { hasText: /^\s*Play the \d+ season\s*$/ });
const savedC = (page, key) => page.evaluate(k => { try { return JSON.parse(localStorage.getItem(k) ?? 'null')?.c ?? null; } catch { return null; } }, key);
const sideways = page => page.evaluate(() => document.scrollingElement.scrollWidth - window.innerWidth);
async function step(page) {
  const lastIn = async sel => { const b = page.locator(`${sel} button:not([disabled])`); const n = await b.count(); if (!n) return false; await b.nth(n - 1).click(); return true; };
  const firstIn = async sel => { const b = page.locator(`${sel} button:not([disabled])`); if (!(await b.count())) return false; await b.first().click(); return true; };
  if (await page.locator('[role="alertdialog"]').count()) return lastIn('[role="alertdialog"]');
  if (await page.locator('[data-season-reveal]').count()) return lastIn('[data-season-reveal]');
  if (await page.locator('[data-decision-continue]').count()) { await page.locator('[data-decision-continue]').first().click(); return true; }
  if (await page.locator('[data-rivalry-event]').count()) return lastIn('[data-rivalry-event]');
  if (await page.locator('[data-rivalry-choice]').count()) return (await page.locator('[data-rivalry-choice] [data-rivalry-outcome]').count()) ? lastIn('[data-rivalry-choice]') : firstIn('[data-rivalry-choice]');
  if (await page.locator('[data-extension-talk]').count()) return firstIn('[data-extension-talk]');
  if (await page.locator('[data-fa-window]').count()) return firstIn('[data-fa-window]');
  const hub = page.locator('button', { hasText: /^\s*Hub\s*$/ });
  if (await hub.count()) { await hub.first().click(); return true; }
  const options = page.locator('button[class*="bg-background px-3 py-2 text-left"]:not([disabled])');
  if (await options.count()) { await options.first().click(); return true; }
  return false;
}
async function toHub(page) {
  for (let i = 0; i < 50; i += 1) {
    if (await playButton(page).count() && !(await page.locator('[data-season-reveal]').count())) return true;
    await step(page); await page.waitForTimeout(450);
  }
  return false;
}
const heldInfo = page => page.evaluate(() => {
  const el = document.querySelector('[data-season-centre-held]');
  if (!el) return null;
  el.scrollIntoView({ block: 'center' });
  const r = el.getBoundingClientRect(); const lh = parseFloat(getComputedStyle(el).lineHeight) || 15;
  const rects = [...el.getClientRects()];
  return { text: el.textContent, height: Math.round(r.height), lineHeight: lh, lines: Math.max(rects.length, Math.round(r.height / lh)), right: Math.round(r.right), width: innerWidth, button: !!document.querySelector('[data-week-by-week]') };
});

const VP = [[390, 844], [1280, 900]];
const done = async (w, what) => { say(w.errors.length === 0, `${what}: no page errors (${w.errors[0] ?? 'clean'})`); await w.ctx.close(); };

/* ── 1. the held lines of the MLB hub ── */
const OFF = ['PIT', 'MIL', 'TBD', 'TOR'];
const tryMake = fn => { try { return fn(); } catch (e) { console.log('note no save: ' + String(e).slice(0, 120)); return null; } };
const heldSaves = [
  ['pitcher', tryMake(() => makeSave('mlb', 'SP', 'now', 0))],
  ['reliever', tryMake(() => makeSave('mlb', 'RP', 'now', 0))],
  ['y2020', tryMake(() => makeSave('mlb', 'CF', 'y2004', 0, { year: 2020, pick: c => !['STL', 'DET'].includes(c.team) }))],
  ['y2020-58', tryMake(() => makeSave('mlb', 'CF', 'y2004', 0, { year: 2020, pick: c => ['STL', 'DET'].includes(c.team) }))],
  ['off-schedule-2004', tryMake(() => makeSave('mlb', 'CF', 'y2004', 0, { pick: c => OFF.includes(c.team) }))],
  ['now-2026-bal-nyy', tryMake(() => makeSave('mlb', 'CF', 'now', 0, { pick: c => ['BAL', 'NYY'].includes(c.team) }))],
  ['abroad', tryMake(() => { const s = makeSave('mlb', 'CF', 'now', 2); s.c.team = 'Yomiuri Giants'; s.c.contractYears = 2; s.value = JSON.stringify({ c: s.c, phase: 'season', teamQuality: s.tq, coach: null }); return s; })],
];
for (const [name, save] of heldSaves) for (const [wd, ht] of VP) {
  if (!save) continue;
  const w = await open('mlb', save, wd, ht);
  const what = `held ${name} at ${wd}`;
  try {
    const h = await heldInfo(w.page);
    await w.page.waitForTimeout(200);
    await shot(w.page, `held-${name}-${wd}`);
    say(!!h && !h.button, `${what}: the hub shows a held line and no Week by week button (team ${save.c.team}, year ${save.c.year}, pos ${save.c.pos})`);
    if (h) note(`${what}: "${h.text}" is ${h.lines} line(s), ${h.height}px tall at ${h.lineHeight}px a line, ends at ${h.right} of ${h.width}; sideways ${await sideways(w.page)}px`);
  } catch (e) { say(false, `${what}: threw ${String(e).slice(0, 160)}`); await shot(w.page, `held-${name}-${wd}-threw`); }
  await done(w, what);
}

/* ── 2. an MLB season on the Season Center, game by game, to its postseason ── */
for (const [wd, ht, reduced] of [[390, 844, false], [1280, 900, false], [390, 844, true]]) {
  const what = `mlb season centre at ${wd}${reduced ? ' reduced motion' : ''}`;
  const save = makeSave('mlb', 'CF', 'now', 1, { starter: true, tq: 97, pick: c => !['BAL', 'NYY'].includes(c.team) });
  let played = null, w = null;
  for (let seed = 11; seed < 23 && !played; seed += 1) {
    w = await open('mlb', save, wd, ht, reduced, seed);
    await w.page.evaluate(() => document.querySelector('[data-week-by-week]')?.click());
    await w.page.waitForSelector('[data-season-centre] [data-kickoff], [data-centre-tile]', { timeout: 30000 }).catch(() => {});
    const c = await savedC(w.page, save.key);
    const row = c?.seasons?.[c.seasons.length - 1];
    if (row && c.seasons.length === 2 && !/Missed/.test(row.teamResult) && typeof row.poGames === 'number') played = { row, seed };
    else { note(`${what}: seed ${seed} gave "${row?.teamResult ?? 'no season'}", another seed`); await w.ctx.close(); w = null; }
  }
  if (!played || !w) { say(false, `${what}: no seed in 12 reached the postseason`); continue; }
  const p = w.page, tagN = `sc-mlb-${wd}${reduced ? 'r' : ''}`;
  try {
    note(`${what}: seed ${played.seed}, the saved season: ${JSON.stringify(played.row)}`);
    await p.waitForTimeout(600);
    await shot(p, `${tagN}-1-first-card`);
    say(await clickText(p, 'Play ball'), `${what}: the first card offers Play ball`);
    await p.waitForSelector('[data-full-time]', { timeout: 60000 }).catch(() => {});
    await p.waitForTimeout(500);
    await shot(p, `${tagN}-2-game-final`);
    note(`${what}: game one reads "${(await p.evaluate(() => (document.querySelector('[data-season-centre]')?.innerText ?? '').replace(/\s+/g, ' ').slice(0, 420)))}"`);
    await clickText(p, 'Results');
    for (let i = 0; i < 8; i += 1) { await clickText(p, '▶ Game'); await p.waitForTimeout(140); }
    await shot(p, `${tagN}-3-after-nine-games`);
    if (wd < 700) { await p.evaluate(() => document.querySelector('[data-game-log-open]')?.click()); await p.waitForTimeout(250); await shot(p, `${tagN}-4-game-log`); await clickText(p, '← Back'); await p.waitForTimeout(150); }
    await clickText(p, 'Sim the rest');
    await p.waitForSelector('[data-review]', { timeout: 15000 }).catch(() => {});
    await p.waitForFunction(() => document.getAnimations().every(a => a.playState !== 'running'), null, { timeout: 6000 }).catch(() => {});
    await p.waitForTimeout(500);
    await shot(p, `${tagN}-5-review`);
    const review = await p.evaluate(() => (document.querySelector('[data-review]')?.innerText ?? '').replace(/\n+/g, ' | '));
    note(`${what}: the review reads "${review.slice(0, 900)}"`);
    say(/playoff|October|Series|round/i.test(review), `${what}: the review says something of the postseason (${played.row.teamResult}, ${played.row.poGames} playoff games on the card)`);
    await p.evaluate(() => { const s = document.querySelector('[data-centre-stage]'); if (s) s.scrollTop = s.scrollHeight; window.scrollTo(0, document.body.scrollHeight); });
    await p.waitForTimeout(300);
    await shot(p, `${tagN}-6-review-bottom`);
    const path2 = await p.evaluate(() => [...document.querySelectorAll('[data-playoff-path], [data-us-playoff-path], [data-path]')].map(e => e.innerText.replace(/\n+/g, ' | ')).join(' || '));
    note(`${what}: playoff path block: "${path2.slice(0, 500) || 'no element with a path marker'}"`);
    say((await sideways(p)) <= 1, `${what}: nothing scrolls sideways (${await sideways(p)}px)`);
    await p.evaluate(() => document.querySelector('[data-centre-exit]')?.click());
    await p.waitForTimeout(700);
    await shot(p, `${tagN}-7-after-exit`);
  } catch (e) { say(false, `${what}: threw ${String(e).slice(0, 200)}`); await shot(p, `${tagN}-threw`); }
  await done(w, what);
}

/* ── 3. the plan card of an NHL throwback career in 2012-13 (48 games), and of baseball's 2020 ── */
for (const [slug, pos, era, year, name] of [['nhl', 'C', 'y2006', 2012, 'nhl-2012'], ['mlb', 'CF', 'y2004', 2020, 'mlb-2020']]) for (const [wd, ht] of VP) {
  const what = `plan card ${name} at ${wd}`;
  const save = makeSave(slug, pos, era, 2, { year: year - 2, starter: true, after: c => c.year === year && c.seasons.every(s => s.team === c.team) });
  const w = await open(slug, save, wd, ht);
  try {
    const openBtn = w.page.locator('[data-us-programme-open]');
    say((await openBtn.count()) > 0, `${what}: the hub has Plan your season (year ${save.c.year}, team ${save.c.team}, last season ${save.c.seasons[save.c.seasons.length - 1].games} games)`);
    await openBtn.first().scrollIntoViewIfNeeded().catch(() => {});
    await openBtn.first().click();
    await w.page.waitForTimeout(500);
    const start = w.page.locator('[data-us-programme-start]');
    if (await start.count()) { await start.first().click(); await w.page.waitForTimeout(300); }
    for (const tile of ['expectation', 'partnership', 'bonus']) {
      const t = w.page.locator(`[data-us-programme-tile="${tile}"]`);
      if (!(await t.count())) { note(`${what}: no tile ${tile}`); continue; }
      await t.first().click();
      await w.page.waitForTimeout(350);
      const text = await w.page.evaluate(() => (document.querySelector('[data-us-programme="dialog"]')?.innerText ?? '').replace(/\n+/g, ' | '));
      note(`${what}: ${tile} card reads "${text.slice(0, 700)}"`);
      await shot(w.page, `plan-${name}-${tile}-${wd}`);
      const back = w.page.locator('[data-us-programme-back]');
      if (await back.count()) { await back.first().click(); await w.page.waitForTimeout(250); }
    }
  } catch (e) { say(false, `${what}: threw ${String(e).slice(0, 200)}`); await shot(w.page, `plan-${name}-${wd}-threw`); }
  await done(w, what);
}

/* ── 4. saves made by origin/main's code: load, look, play one season through the screen ── */
const old = JSON.parse(fs.readFileSync(file, 'utf8'));
for (const o of old.saves) for (const [wd, ht] of VP) {
  const what = `old ${o.slug} ${o.pos} save at ${wd}`;
  const w = await open(o.slug, o, wd, ht);
  const p = w.page;
  try {
    const before = JSON.parse(o.value).c;
    say((await playButton(p).count()) > 0, `${what}: the save made by ${old.madeBy} opens on the hub`);
    const loaded = await savedC(p, o.key);
    say(JSON.stringify(loaded?.seasons) === JSON.stringify(before.seasons), `${what}: opening it left its ${before.seasons.length} season rows as they were`);
    await shot(p, `old-${o.slug}-${o.pos}-${wd}-1-hub`);
    if (before.rival) {
      await p.locator('button:has(div.uppercase)').filter({ hasText: /News/i }).first().click().catch(() => {});
      await p.waitForTimeout(400);
      await p.locator('button', { hasText: /^\s*\S+ Rival\s*$/ }).first().click().catch(() => {});
      await p.waitForTimeout(400);
      await shot(p, `old-${o.slug}-${o.pos}-${wd}-2-rival`);
      note(`${what}: the Rival screen reads "${(await p.locator('main').innerText()).replace(/\s+/g, ' ').slice(0, 330)}"`);
      await p.locator('button', { hasText: /^\s*Hub\s*$/ }).first().click().catch(() => {});
      await p.waitForTimeout(300);
    }
    await playButton(p).first().click();
    for (let i = 0; i < 30 && !(await p.locator('[data-season-reveal]').count()); i += 1) {
      await p.waitForTimeout(450);
      if (await p.locator('[data-season-reveal]').count()) break;
      if (await p.locator('[role="alertdialog"], [data-extension-talk], [data-fa-window], [data-decision-continue]').count()) { await step(p); continue; }
      if (await playButton(p).count()) await playButton(p).first().click();
    }
    await p.waitForSelector('[data-season-reveal]', { timeout: 15000 }).catch(() => {});
    await p.waitForTimeout(2600);
    await shot(p, `old-${o.slug}-${o.pos}-${wd}-3-season-card`);
    note(`${what}: the season card reads "${(await p.locator('[data-season-reveal]').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 520)}"`);
    say((await sideways(p)) <= 1, `${what}: nothing scrolls sideways on the season card (${await sideways(p)}px)`);
    say(await toHub(p), `${what}: the walk gets back to the hub after the season`);
    const after = await savedC(p, o.key);
    say(!!after && after.seasons.length === before.seasons.length + 1, `${what}: one season was added (${before.seasons.length} to ${after?.seasons?.length})`);
    say(!!after && JSON.stringify(after.seasons.slice(0, before.seasons.length)) === JSON.stringify(before.seasons), `${what}: the rows the save already held are byte for byte the same after playing on`);
    const row = after?.seasons?.[after.seasons.length - 1];
    note(`${what}: the new row ${JSON.stringify(row).slice(0, 330)}; rival now ${after?.rival ? `"${after.rival.lastLine}" lastYear ${after.rival.lastYear ?? 'none'} h2h ${after.rival.myYears}-${after.rival.hisYears}` : 'none'}`);
    await shot(p, `old-${o.slug}-${o.pos}-${wd}-4-hub-after`);
  } catch (e) { say(false, `${what}: threw ${String(e).slice(0, 200)}`); await shot(p, `old-${o.slug}-${o.pos}-${wd}-threw`); }
  await done(w, what);
}

await browser.close();
console.log(`uscWalk: ${fails} failed, ${notes} notes; screenshots in ${OUT}`);
process.exit(fails ? 1 : 0);
