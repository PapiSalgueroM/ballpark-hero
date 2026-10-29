// Review walk, Round 1565 (run lens). Plays soccer Connections on the served head build at 390x844 and 1280x900, with
// reduced motion on and off. supabase.co never reached: either aborted (the fallback file deals) or answered from a
// local export file (what the live table would deal), never the network. Screenshots go to RC_OUT.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || '/tmp/rcout';
fs.mkdirSync(OUT, { recursive: true });
const X = '.rc/x';
const pre = JSON.parse(fs.readFileSync(path.join(X, 'post-apply.json'), 'utf8')).sort((a, b) => a.sort_order - b.sort_order);
const post = JSON.parse(fs.readFileSync(path.join(X, 'final-export.json'), 'utf8')).sort((a, b) => a.sort_order - b.sort_order);
const groupsOf = r => (typeof r.groups_json === 'string' ? JSON.parse(r.groups_json) : r.groups_json);
const log = (...a) => console.log(...a);
let problems = 0;

async function open(browser, { w, h, motion, day, rows, seed, rulesSeen = true, tag }) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: motion, deviceScaleFactor: 1 });
  await ctx.addInitScript(([s, seen]) => {
    try {
      if (!sessionStorage.getItem('rv-seeded')) {
        if (seen) localStorage.setItem('connections-rules-seen', '1');
        if (s) localStorage.setItem(s.key, s.value);
        sessionStorage.setItem('rv-seeded', '1');
      }
    } catch {}
  }, [seed ?? null, rulesSeen]);
  await ctx.route(/supabase\.co/, route => {
    const u = route.request().url();
    if (rows && u.includes('/rest/v1/connections_puzzles')) {
      const off = Number(new URL(u).searchParams.get('offset') ?? '0');
      const body = off > 0 ? [] : rows.map(r => ({ puzzle_id: r.puzzle_id, groups_json: groupsOf(r) }));
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    }
    return route.abort();
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  if (day) await page.clock.setFixedTime(new Date(`${day}T16:00:00Z`));
  await page.goto(`${BASE}/connections`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  return { ctx, page, errors, tag };
}

async function tiles(page) {
  return page.$$eval('button', bs => bs.map(b => b.textContent.trim()).filter(Boolean));
}
function boardFrom(names, pool) {
  const set = new Set(names);
  return pool.find(r => groupsOf(r).flatMap(g => g.players).every(p => set.has(p)));
}
async function pick(page, names) {
  for (const n of names) await page.getByRole('button', { name: n, exact: true }).first().click();
  await page.getByRole('button', { name: 'Submit' }).click();
  await page.waitForTimeout(900);
}
async function shot(page, name) { await page.screenshot({ path: path.join(OUT, name), fullPage: true }); log('shot', name); }
async function overflow(page) {
  return page.evaluate(() => {
    const w = document.documentElement.clientWidth; const bad = [];
    for (const el of document.querySelectorAll('button, h1, h2, p')) { const r = el.getBoundingClientRect(); if (r.width && (r.right > w + 1 || r.left < -1)) bad.push(`${el.tagName} "${el.textContent.trim().slice(0, 30)}" ${Math.round(r.left)}..${Math.round(r.right)} of ${w}`); }
    for (const b of document.querySelectorAll('button')) if (b.scrollWidth > b.clientWidth + 2) bad.push(`clipped "${b.textContent.trim().slice(0, 30)}" ${b.scrollWidth}>${b.clientWidth}`);
    return { pageScroll: document.documentElement.scrollWidth > w + 1, bad: bad.slice(0, 8) };
  });
}

const browser = await chromium.launch();
try {
  // 1) the fallback (the fetch fails): every viewport and motion setting, play the whole board to the result
  for (const [w, h] of [[390, 844], [1280, 900]]) for (const motion of ['reduce', 'no-preference']) {
    const tag = `fallback-${w}-${motion === 'reduce' ? 'rm' : 'motion'}`;
    const { ctx, page, errors } = await open(browser, { w, h, motion, day: '2026-11-03', rows: null, rulesSeen: !(w === 390 && motion === 'reduce') });
    if (w === 390 && motion === 'reduce') { await shot(page, `${tag}-rules.png`); await page.keyboard.press('Escape'); await page.waitForTimeout(500); }
    const names = await tiles(page);
    const b = boardFrom(names, post);
    log(`${tag}: dealt ${b?.puzzle_id ?? 'NONE FOUND'}`);
    await shot(page, `${tag}-start.png`);
    const o = await overflow(page); log(`${tag}: page scroll sideways ${o.pageScroll}; ${o.bad.join(' | ') || 'nothing cut off'}`);
    if (o.pageScroll) problems += 1;
    if (b) {
      const g = groupsOf(b);
      const others = g.slice(1).flatMap(x => x.players);
      await pick(page, [...g[0].players.slice(0, 3), others[0]]);
      await shot(page, `${tag}-wrong.png`);
      for (const x of g) await pick(page, x.players);
      await page.waitForTimeout(1500);
      await shot(page, `${tag}-end.png`);
      const body = await page.textContent('body');
      log(`${tag}: after all four groups, "Solved" or win text present: ${/solved|you got|well done|nice|perfect|won/i.test(body)}`);
    }
    if (errors.length) { problems += 1; log(`${tag}: page errors ${errors.slice(0, 3).join(' | ')}`); }
    await ctx.close();
  }
  // 2) live as the table will be after the migration: the board with the treble group (cx-20260710-12), dealt 2027-08-04
  {
    const { ctx, page, errors } = await open(browser, { w: 390, h: 844, motion: 'reduce', day: '2027-08-04', rows: post });
    const names = await tiles(page); const b = boardFrom(names, post);
    log(`live-treble: dealt ${b?.puzzle_id}`);
    await shot(page, 'live-treble-start.png');
    if (b?.puzzle_id === 'cx-20260710-12') {
      await pick(page, ['Gary Neville', 'Xavi', 'Franck Ribéry', 'Manuel Neuer']);
      const lives = await page.$$eval('div.w-3.h-3.rounded-full.bg-primary', d => d.length).catch(() => -1);
      log(`live-treble: guessed Neville, Xavi, Ribery, Neuer as "Won a treble", lives left ${lives}`);
      await shot(page, 'live-treble-guess.png');
    }
    if (errors.length) log(`live-treble: page errors ${errors.slice(0, 3).join(' | ')}`);
    await ctx.close();
  }
  // 3) the publish day save: the base bundle saved a LOST daily on 2026-11-01 (crafted-1028, puzzleIndex 0); the head loads it
  for (const idx of [0, 277]) {
    const DAY = '2026-11-01';
    const seed = { key: `connections-daily-${DAY}`, value: JSON.stringify({ v: 1, date: DAY, puzzleIndex: idx, puzzleId: 'crafted-1028', guesses: [{ t: 'give' }], gameStatus: 'lost' }) };
    const { ctx, page, errors } = await open(browser, { w: 390, h: 844, motion: 'reduce', day: DAY, rows: pre, seed });
    const names = await tiles(page); const b = boardFrom(names, pre);
    const hasSubmit = await page.getByRole('button', { name: 'Submit' }).count();
    const saved = await page.evaluate(k => localStorage.getItem(k), seed.key);
    log(`save-${idx}: dealt ${b?.puzzle_id}; Submit button shown (still playing) ${hasSubmit > 0}; stored now ${saved}`);
    await shot(page, `save-index${idx}.png`);
    if (errors.length) log(`save-${idx}: page errors ${errors.slice(0, 3).join(' | ')}`);
    await ctx.close();
  }
} finally {
  await browser.close();
}
log(`walk done, ${problems} problems`);
process.exit(problems ? 1 : 0);
