/* Reviewer walk, Round 1553 (runner lens): play soccer /connections the way a player does.
   Reads BASE (the served dist) and writes screenshots plus walk.json into RC_OUT. Every request off
   localhost is aborted (supabase.co included), so the game deals from the shipped file, which is the
   fallback pool. The page clock is fixed to a day the fallback deals the board under test (computed
   by the reviewer from dailyIndex over the 250 valid boards). */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || '/tmp/walk-out';
fs.mkdirSync(OUT, { recursive: true });

const BOARDS = {
  'puzzle-151': { day: '2026-12-31', groups: [
    ['Played for Bayern Munich in 2025-26', ['Joshua Kimmich', 'Jamal Musiala', 'Alphonso Davies', 'Jonathan Tah']],
    ['Played for Manchester City in 2025-26', ['Antoine Semenyo', 'Jérémy Doku', 'Tijjani Reijnders', "Nico O'Reilly"]],
    ["Won the Ballon d'Or", ['Lionel Messi', 'Kaká', 'Ousmane Dembélé', 'Luka Modrić']],
    ['Over 100 Premier League assists', ['Ryan Giggs', 'Kevin De Bruyne', 'Wayne Rooney', 'Frank Lampard']],
  ] },
  'puzzle-1': { day: '2027-04-22', groups: [
    ["Won the Ballon d'Or", ['Kaká', 'Cristiano Ronaldo', 'Luka Modrić', 'Karim Benzema']],
    ['Played for Chelsea in 2025-26', ['Cole Palmer', 'Reece James', 'Moisés Caicedo', 'Enzo Fernández']],
    ['Won the Premier League with Leicester City 2015-16', ['Jamie Vardy', 'Wes Morgan', 'Danny Drinkwater', 'Shinji Okazaki']],
    ['Over 100 Premier League assists', ['Cesc Fàbregas', 'Ryan Giggs', 'Wayne Rooney', 'Frank Lampard']],
  ] },
  'puzzle-136': { day: '2027-06-20', groups: [
    ['Played for Barcelona in 2025-26', ['Lamine Yamal', 'Pedri', 'Raphinha', 'Robert Lewandowski']],
    ['From Ukraine', ['Oleksandr Zinchenko', 'Mykhailo Mudryk', 'Andriy Shevchenko', 'Viktor Tsygankov']],
    ['Played for Napoli in 2025-26', ['Scott McTominay', 'Kevin De Bruyne', 'Stanislav Lobotka', 'Giovanni Di Lorenzo']],
    ['Won the Puskas Award', ['Cristiano Ronaldo', 'Neymar Jr', 'Zlatan Ibrahimović', 'Wendell Lira']],
  ] },
};

const CASES = [
  { board: 'puzzle-151', w: 390, h: 844, motion: 'reduce', wrong: true, rules: true },
  { board: 'puzzle-151', w: 1280, h: 900, motion: 'no-preference', wrong: false, rules: true },
  { board: 'puzzle-1', w: 390, h: 844, motion: 'no-preference', wrong: true, rules: false },
  { board: 'puzzle-1', w: 1280, h: 900, motion: 'reduce', wrong: false, rules: false },
  { board: 'puzzle-136', w: 390, h: 844, motion: 'reduce', wrong: false, rules: false, only: 3 },
  { board: 'puzzle-151', w: 360, h: 780, motion: 'reduce', wrong: false, rules: false },
];

const results = [];
const browser = await chromium.launch();
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function newPage(c) {
  const ctx = await browser.newContext({ viewport: { width: c.w, height: c.h }, reducedMotion: c.motion, deviceScaleFactor: 1 });
  await ctx.route(/supabase\.co/, r => r.abort());
  await ctx.route(u => !u.href.startsWith(BASE), r => r.abort());
  if (!c.rules) await ctx.addInitScript(() => { try { localStorage.setItem('connections-rules-seen', '1'); } catch {} });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 200)));
  return { ctx, page, errors };
}

async function dismissConsent(page) {
  const b = page.getByRole('button', { name: 'Reject all', exact: true });
  if (await b.count()) { try { await b.first().click({ timeout: 2000 }); await sleep(300); } catch {} }
}

for (const c of CASES) {
  const tag = `${c.board}-${c.w}-${c.motion}`;
  const r = { tag, ok: true, notes: [] };
  const { ctx, page, errors } = await newPage(c);
  try {
    const B = BOARDS[c.board];
    await page.clock.setFixedTime(new Date(`${B.day}T17:00:00Z`));
    await page.goto(`${BASE}/connections`, { waitUntil: 'domcontentloaded' });
    const first = B.groups[0][1][0];
    await page.getByRole('button', { name: first, exact: true }).first().waitFor({ timeout: 20000 });
    await sleep(800);
    if (c.rules) {
      await page.screenshot({ path: path.join(OUT, `${tag}-0rules.png`) });
      const dlg = await page.getByRole('dialog').count();
      r.notes.push(`rules dialog shown on first visit: ${dlg > 0}`);
      await page.keyboard.press('Escape');
      await sleep(400);
    }
    await dismissConsent(page);
    /* the dealt board is the board under test: every one of its 16 names is a tile */
    const missing = [];
    for (const [, names] of B.groups) for (const n of names) if (!(await page.getByRole('button', { name: n, exact: true }).count())) missing.push(n);
    r.dealt = missing.length === 0;
    if (missing.length) { r.ok = false; r.notes.push(`tiles missing: ${missing.join(', ')}`); }
    r.overflowX = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (r.overflowX > 0) { r.ok = false; r.notes.push(`horizontal overflow ${r.overflowX}px`); }
    await page.screenshot({ path: path.join(OUT, `${tag}-1board.png`), fullPage: true });
    /* tiles whose text is cut or overflows its button */
    r.tileOverflow = await page.evaluate(() => [...document.querySelectorAll('.grid.grid-cols-4 button')].filter(b => b.scrollWidth > b.clientWidth + 1 || b.scrollHeight > b.clientHeight + 1).map(b => b.textContent));
    const click = async n => page.getByRole('button', { name: n, exact: true }).first().click();
    const submit = async () => { await page.getByRole('button', { name: 'Submit', exact: true }).click(); await sleep(c.motion === 'reduce' ? 900 : 1600); };
    if (c.wrong) {
      const [a, b] = B.groups;
      for (const n of [...a[1].slice(0, 3), b[1][0]]) await click(n);
      await submit();
      await page.screenshot({ path: path.join(OUT, `${tag}-2wrong.png`) });
      r.afterWrong = (await page.locator('body').innerText()).match(/one away|lives?|mistakes?/gi)?.slice(0, 4) ?? [];
      /* clear the selection the wrong guess may have left */
      const desel = page.getByRole('button', { name: /deselect/i });
      if (await desel.count()) await desel.first().click().catch(() => {});
      await sleep(300);
      const sel = await page.evaluate(() => [...document.querySelectorAll('.grid.grid-cols-4 button')].filter(b => b.className.includes('bg-primary')).map(b => b.textContent));
      for (const n of sel) await click(n);
    }
    const n = c.only ?? 4;
    for (const [cat, names] of B.groups.slice(0, n)) {
      for (const p of names) await click(p);
      await submit();
      const shown = await page.getByText(cat, { exact: false }).count();
      if (!shown) { r.ok = false; r.notes.push(`group "${cat}" not revealed after a right guess`); }
    }
    await sleep(1200);
    await page.screenshot({ path: path.join(OUT, `${tag}-3solved.png`), fullPage: true });
    r.labelOverflow = await page.evaluate(() => [...document.querySelectorAll('p.uppercase')].filter(p => p.scrollWidth > p.clientWidth + 1).map(p => p.textContent));
    /* the season in a label stays on one line: a span broken across lines has two client rects */
    const seasons = await page.evaluate(() => [...document.querySelectorAll('p.uppercase span.whitespace-nowrap')].map(s => ({ text: s.textContent, label: s.parentElement.textContent, rects: s.getClientRects().length, lines: Math.round(s.parentElement.getBoundingClientRect().height / parseFloat(getComputedStyle(s.parentElement).lineHeight)) })));
    r.seasons = seasons;
    const broken = seasons.filter(s => s.rects !== 1);
    if (broken.length) { r.ok = false; r.notes.push(`season broken across lines: ${broken.map(s => s.label).join('; ')}`); }
    if (B.groups.slice(0, c.only ?? 4).some(([cat]) => /20[0-9]{2}-[0-9]{2}/.test(cat)) && !seasons.length) { r.ok = false; r.notes.push('a solved season label rendered no nowrap span'); }
    r.endText = (await page.locator('main').innerText().catch(() => '')).split('\n').filter(s => /solved|won|got|streak|puzzle|great|next/i.test(s)).slice(0, 6);
  } catch (e) {
    r.ok = false;
    r.notes.push(`walk error: ${String(e).slice(0, 300)}`);
    await page.screenshot({ path: path.join(OUT, `${tag}-error.png`) }).catch(() => {});
  }
  r.pageErrors = errors;
  if (errors.length) r.ok = false;
  results.push(r);
  console.log(JSON.stringify(r));
  await ctx.close();
}

/* What's New: the round's line at a phone width */
{
  const c = { w: 390, h: 844, motion: 'reduce', rules: false };
  const { ctx, page, errors } = await newPage(c);
  const r = { tag: 'whatsnew-390', ok: true, notes: [] };
  try {
    await page.goto(`${BASE}/whats-new`, { waitUntil: 'domcontentloaded' });
    const line = page.getByText('Soccer Connections: every group we rebuilt is checked against two sources, and the rebuilt boards have one right answer each.', { exact: false }).first();
    await line.waitFor({ timeout: 20000 });
    await dismissConsent(page);
    await line.scrollIntoViewIfNeeded();
    await sleep(500);
    await page.screenshot({ path: path.join(OUT, 'whatsnew-390.png') });
    r.overflowX = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    r.firstUnderOctober = await page.evaluate(() => {
      const li = [...document.querySelectorAll('li')].find(x => x.textContent.includes('every group we rebuilt is checked'));
      return li ? li.parentElement.firstElementChild === li : null;
    });
  } catch (e) { r.ok = false; r.notes.push(String(e).slice(0, 300)); }
  r.pageErrors = errors;
  results.push(r);
  console.log(JSON.stringify(r));
  await ctx.close();
}

await browser.close();
fs.writeFileSync(path.join(OUT, 'walk.json'), JSON.stringify(results, null, 1));
const bad = results.filter(r => !r.ok);
console.log(bad.length ? `walk1553: ${bad.length} case(s) not ok: ${bad.map(b => b.tag).join(', ')}` : `walk1553: all ${results.length} cases played`);
process.exit(bad.length ? 1 : 0);
