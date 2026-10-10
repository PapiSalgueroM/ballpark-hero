// Round 1210 reviewer walk (the one who RUNS things). Sent to a runner as an extra file, never committed.
// Footle with the database host blocked (the pool falls back to the committed file), Club Manager's Market
// nationality filter in today's world and two past worlds, the What's New entry, one opened Career Log.
// 390x844 and 1280x900, reduced motion on and off. Screenshots and measurements go to $RC_OUT.
import fs from 'node:fs';
import path from 'node:path';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const { chromium } = pw;
const BASE = process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173';
const OUT = process.env.RC_OUT || '.';
const ONLY = process.env.WALK_ONLY || '';
let bad = 0;
const measures = [];
const say = (ok, what) => { console.log((ok ? '  PASS  ' : '  FAIL  ') + what); if (!ok) bad += 1; };
const browser = await chromium.launch();
const VIEWS = [[390, 844], [1280, 900]];
const MOTION = ['reduce', 'no-preference'];
const tag = (w, m) => `${w}-${m === 'reduce' ? 'rm' : 'mo'}`;
const shot = (page, name) => page.screenshot({ path: path.join(OUT, name + '.png') }).catch(e => console.log('   screenshot failed: ' + e.message));
const overflow = page => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

async function open(w, h, m, route, seed) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: m });
  const st = { blocked: 0, errors: [] };
  await ctx.route(/supabase\.co/, r => { st.blocked += 1; return r.abort(); });
  const page = await ctx.newPage();
  page.on('pageerror', e => st.errors.push(String(e).slice(0, 200)));
  if (seed) await page.addInitScript(seed.fn, seed.arg);
  await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: /^essential only$/i }).first().click({ timeout: 1500 }).catch(() => {});
  await page.waitForTimeout(300);
  return { ctx, page, st };
}

/* ── A: Footle, the three flag spots, played the way a player would ── */
async function footle(w, h, m) {
  const t = tag(w, m);
  console.log(`A) Footle at ${t}`);
  const { ctx, page, st } = await open(w, h, m, '/footle');
  let ex = page.locator('p', { hasText: 'From this puzzle pool:' }).first();
  if (await ex.count() === 0) {
    await page.getByRole('button', { name: /how to play/i }).first().click({ timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(600);
    ex = page.locator('p', { hasText: 'From this puzzle pool:' }).first();
  }
  say(await ex.count() > 0, `${t}: How to play carries the "From this puzzle pool" example with the database host blocked (${st.blocked} requests aborted)`);
  if (await ex.count() > 0) {
    await ex.scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(500);
    const info = await ex.evaluate(p => {
      const img = p.querySelector('img'); const f = p.querySelector('img,svg');
      const r = p.getBoundingClientRect(); const fr = f?.getBoundingClientRect();
      return { text: p.textContent, flag: !!f, alt: img?.alt ?? null, loaded: img ? (img.complete && img.naturalWidth > 0) : null, pH: Math.round(r.height), flagW: fr ? Math.round(fr.width) : null, flagH: fr ? Math.round(fr.height) : null };
    });
    measures.push({ where: 'footle-example', t, ...info });
    console.log('   example: ' + JSON.stringify(info));
    say(info.flag, `${t}: the example line holds a flag beside the country`);
    await shot(page, `footle-example-${t}`);
  }
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(400);
  await page.locator('[data-footle-mode="practice"]').click({ timeout: 5000 }).catch(e => say(false, `${t}: the Five-puzzle run tab could not be clicked (${e.message.slice(0, 80)})`));
  const start = page.locator('[data-testid="practice-start"]');
  await start.waitFor({ timeout: 8000 }).catch(() => {});
  await page.waitForFunction(() => { const b = document.querySelector('[data-testid="practice-start"]'); return !!b && !b.disabled; }, null, { timeout: 15000 }).catch(() => {});
  const ready = await start.isEnabled().catch(() => false);
  say(ready, `${t}: Start run is enabled with the host blocked (the pool is the committed file, not empty)`);
  if (!ready) { await shot(page, `footle-notready-${t}`); await ctx.close(); return; }
  await start.click();
  for (let i = 0; i < 5; i++) {
    await page.getByRole('button', { name: /^give up$/i }).first().click({ timeout: 6000 }).catch(e => say(false, `${t}: puzzle ${i + 1} has no Give up (${e.message.slice(0, 60)})`));
    await page.getByRole('button', { name: /yes, reveal it/i }).first().click({ timeout: 6000 }).catch(() => {});
    const fb = page.locator('[data-testid="practice-feedback"]');
    await fb.waitFor({ timeout: 6000 }).catch(() => {});
    if (await fb.count() === 0) { say(false, `${t}: puzzle ${i + 1} showed no feedback after giving up`); break; }
    await fb.locator('summary').first().click({ timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(350);
    const info = await fb.evaluate(el => {
      const p = el.querySelectorAll('p')[1]; const r = p.getBoundingClientRect();
      const img = p.querySelector('img'); const f = p.querySelector('img,svg'); const fr = f?.getBoundingClientRect();
      const box = [...el.querySelectorAll('dl > div')].find(d => d.querySelector('dt')?.textContent === 'Nation');
      const dd = box?.querySelector('dd'); const dimg = dd?.querySelector('img'); const df = dd?.querySelector('img,svg');
      const br = box?.getBoundingClientRect(); const dfr = df?.getBoundingClientRect();
      return {
        line: p.textContent, lineFlag: !!f, lineAlt: img?.alt ?? null, lineLoaded: img ? (img.complete && img.naturalWidth > 0) : null,
        lineH: Math.round(r.height), flagInLine: fr ? (fr.left >= r.left - 1 && fr.right <= r.right + 1 && fr.top >= r.top - 2 && fr.bottom <= r.bottom + 2) : null,
        nation: dd?.textContent ?? null, nationFlag: !!df, nationAlt: dimg?.alt ?? null,
        nationInBox: dfr && br ? (dfr.left >= br.left - 1 && dfr.right <= br.right + 1) : null, nationSpill: dd ? dd.scrollWidth - dd.clientWidth : null,
        boxH: br ? Math.round(br.height) : null,
      };
    });
    measures.push({ where: 'footle-feedback', t, puzzle: i + 1, ...info });
    console.log(`   puzzle ${i + 1}: ` + JSON.stringify(info));
    say(info.lineFlag && info.flagInLine !== false, `${t}: puzzle ${i + 1}, the feedback line "${info.line}" holds its flag inside the line`);
    say(info.nationFlag && info.nationInBox !== false && (info.nationSpill ?? 0) <= 1, `${t}: puzzle ${i + 1}, the Nation box "${info.nation}" holds its flag and does not spill`);
    if (i < 2) { await fb.scrollIntoViewIfNeeded().catch(() => {}); await shot(page, `footle-feedback-${t}-p${i + 1}`); }
    await page.locator('[data-testid="practice-next"]').click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(350);
  }
  const receipt = page.locator('[data-testid="practice-receipt"]');
  await receipt.waitFor({ timeout: 6000 }).catch(() => {});
  say(await receipt.count() === 1, `${t}: the run receipt shows after five puzzles`);
  if (await receipt.count() === 1) {
    await receipt.locator('summary').first().click({ timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(350);
    const flags = await receipt.evaluate(el => [...el.querySelectorAll('dl > div')].filter(d => d.querySelector('dt')?.textContent === 'Nation').map(d => ({ text: d.querySelector('dd').textContent, flag: !!d.querySelector('dd img, dd svg') })));
    say(flags.length >= 1 && flags.every(f => f.flag), `${t}: the receipt's opened player details carry the flag (${JSON.stringify(flags)})`);
    await receipt.scrollIntoViewIfNeeded().catch(() => {});
    await shot(page, `footle-receipt-${t}`);
  }
  const of = await overflow(page);
  say(of <= 2, `${t}: Footle has no sideways scroll (${of}px)`);
  say(st.errors.length === 0, `${t}: Footle threw no page error (${st.errors.join(' | ')})`);
  await ctx.close();
}

/* ── B: Club Manager, the Market's nationality filter ── */
async function tap(page, rx) {
  const b = page.getByRole('button', { name: rx }).first();
  if (await b.count().catch(() => 0) === 0) return false;
  return b.click({ timeout: 4000 }).then(() => true).catch(() => false);
}
async function market(w, h, m, season, wants, pick) {
  const t = `${tag(w, m)}-${season}`;
  console.log(`B) Club Manager Market at ${t}`);
  const { ctx, page, st } = await open(w, h, m, '/club-manager', { fn: () => localStorage.setItem('rules-gate-seen:/club-manager', '1') });
  for (let i = 0; i < 3; i++) {
    if (await page.locator('[role="dialog"][data-state="open"]').count().catch(() => 0) === 0) break;
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(250);
  }
  const picked = await tap(page, new RegExp(season, 'i'));
  say(picked, `${t}: the season ${season} can be picked on the start screen`);
  await page.getByRole('button', { name: /England/i }).first().waitFor({ timeout: 15000 }).catch(() => {});
  await tap(page, /England/i);
  await page.getByRole('button', { name: /Premier League/i }).first().waitFor({ timeout: 8000 }).catch(() => {});
  await tap(page, /Premier League/i);
  const club = page.locator('button').filter({ hasText: /Everton|Fulham|Brentford|Crystal Palace|Wolves|Brighton|Aston Villa|West Ham|Newcastle/ }).first();
  await club.waitFor({ timeout: 8000 }).catch(() => {});
  await club.click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(500);
  await tap(page, /take the job|confirm|start/i);
  await page.getByText(/who is in the dugout/i).first().waitFor({ timeout: 8000 }).catch(() => {});
  await tap(page, /skip: just manage/i);
  await page.waitForTimeout(1500);
  const tab = page.getByRole('tab', { name: 'Market', exact: true });
  const started = await tab.count() === 1;
  say(started, `${t}: the career started and the hub shows a Market tab`);
  if (!started) { await shot(page, `cm-nostart-${t}`); await ctx.close(); return; }
  await tab.click();
  await page.locator('[data-nat-filter]').first().waitFor({ timeout: 20000 }).catch(() => {});
  const groups = await page.evaluate(() => {
    const sel = document.querySelector('[data-nat-filter]');
    if (!sel) return null;
    return [...sel.querySelectorAll('optgroup')].map(g => ({ label: g.label, nations: [...g.querySelectorAll('option')].map(o => o.value) }));
  });
  say(!!groups && groups.length > 0, `${t}: the nationality filter is on the Market screen with ${groups ? groups.length : 0} groups`);
  if (groups) {
    fs.writeFileSync(path.join(OUT, `natfilter-${t}.json`), JSON.stringify(groups, null, 1));
    console.log('   groups: ' + groups.map(g => `${g.label} ${g.nations.length}`).join(' | '));
    say(!groups.some(g => /elsewhere/i.test(g.label)), `${t}: no "Elsewhere" group`);
    const where = n => groups.find(g => g.nations.includes(n))?.label ?? 'NOT IN THIS MARKET';
    for (const [n, want] of wants) say(where(n) === want, `${t}: ${n} sits under ${want} (found under: ${where(n)})`);
    if (pick && groups.some(g => g.nations.includes(pick))) {
      await page.locator('[data-nat-filter]').first().selectOption(pick);
      await page.waitForTimeout(700);
      const rows = await page.evaluate(n => {
        const imgs = [...document.querySelectorAll('img')].filter(i => i.alt === n);
        return { flagsOfPick: imgs.length, loaded: imgs.filter(i => i.complete && i.naturalWidth > 0).length };
      }, pick);
      console.log(`   filtered to ${pick}: ` + JSON.stringify(rows));
      say(rows.flagsOfPick >= 1, `${t}: filtering to ${pick} lists at least one man wearing that flag (${rows.flagsOfPick})`);
    }
  }
  await page.locator('[data-nat-filter]').first().scrollIntoViewIfNeeded().catch(() => {});
  await shot(page, `cm-market-${t}`);
  const of = await overflow(page);
  say(of <= 2, `${t}: the Market screen has no sideways scroll (${of}px)`);
  say(st.errors.length === 0, `${t}: Club Manager threw no page error (${st.errors.join(' | ')})`);
  await ctx.close();
}

/* ── C: the What's New entry ── */
async function whatsNew(w, h, m) {
  const t = tag(w, m);
  console.log(`C) What's New at ${t}`);
  const { ctx, page } = await open(w, h, m, '/whats-new');
  const li = page.locator('li', { hasText: 'Flags in Footle, and six countries find their home.' }).first();
  say(await li.count() === 1, `${t}: the Round 1210 entry is on the page`);
  if (await li.count() === 1) {
    await li.scrollIntoViewIfNeeded().catch(() => {});
    const info = await li.evaluate(el => ({ text: el.textContent, links: [...el.querySelectorAll('a')].map(a => a.getAttribute('href')), first: el === el.parentElement.firstElementChild, top: Math.round(el.getBoundingClientRect().top) }));
    measures.push({ where: 'whats-new', t, ...info });
    say(info.links.includes('/footle') && info.links.includes('/club-manager'), `${t}: the entry links Footle and Club Manager (${info.links.join(', ')})`);
    say(info.first, `${t}: the entry is the first of its list (newest first)`);
    const dash = [String.fromCharCode(0x2013), String.fromCharCode(0x2014)].some(c => info.text.includes(c));
    say(!dash, `${t}: the entry holds no en or em dash`);
    await shot(page, `whatsnew-${t}`);
  }
  const of = await overflow(page);
  say(of <= 2, `${t}: What's New has no sideways scroll (${of}px)`);
  await ctx.close();
}

/* ── D: one opened Career Log (NBA, a sport the builder did not screenshot) ── */
async function careerLog(w, h, m) {
  const t = tag(w, m);
  console.log(`D) NBA My Career, the opened Career Log at ${t}`);
  const { ctx, page, st } = await open(w, h, m, '/nba-my-career', { fn: () => localStorage.setItem('rules-gate-seen:/nba-my-career', '1') });
  await page.locator('input[placeholder*="name"]').first().fill('Probe Player').catch(() => {});
  await page.locator('button:has-text("Enter the draft")').click({ timeout: 6000 }).catch(() => {});
  await page.waitForTimeout(1000);
  const seeded = await page.evaluate(key => {
    const raw = localStorage.getItem(key);
    if (!raw) return false;
    const s = JSON.parse(raw);
    const base = { team: s.c.team, age: 24, ovr: 88, games: 20, teamResult: 'Made the playoffs', salary: 8 };
    s.c.seasons = [{ ...base, year: 2026, awards: [] }, { ...base, year: 2027, awards: ['Probe Award'] }, { ...base, year: 2028, awards: ['Probe Award', 'Second Probe Award'] }];
    localStorage.setItem(key, JSON.stringify(s));
    return true;
  }, 'nba-my-career-save-v1');
  say(seeded, `${t}: a career was started and three seasons written into its save`);
  if (!seeded) { await shot(page, `career-log-nostart-${t}`); await ctx.close(); return; }
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1300);
  await page.locator('button:has(div.uppercase)').filter({ hasText: /Career Log/i }).first().click({ timeout: 6000 }).catch(() => {});
  await page.locator('[data-career-season-review]').first().waitFor({ timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(400);
  const tiles = await page.locator('[data-career-season-review] button[data-season-tile]').count();
  say(tiles === 3, `${t}: the opened Career Log shows three season tiles (saw ${tiles})`);
  const back = page.getByRole('button', { name: 'Back to career', exact: true });
  say(await back.count() === 1, `${t}: exactly one "Back to career" button on the opened log (saw ${await back.count()})`);
  await page.locator('[data-career-season-review]').first().scrollIntoViewIfNeeded().catch(() => {});
  await shot(page, `career-log-nba-${t}`);
  const of = await overflow(page);
  say(of <= 2, `${t}: the opened Career Log has no sideways scroll (${of}px)`);
  if (await back.count() === 1) {
    await back.click();
    await page.waitForTimeout(500);
    const boxes = await page.locator('button:has(div.uppercase)').count();
    say(boxes >= 6, `${t}: after "Back to career" the hub is back with its boxes (${boxes} tiles)`);
  }
  say(st.errors.length === 0, `${t}: the career page threw no page error (${st.errors.join(' | ')})`);
  await ctx.close();
}

const CAF = 'Africa (CAF)';
const run = async (name, fn) => { if (ONLY && ONLY !== name) return; try { await fn(); } catch (e) { say(false, `${name} threw: ${String(e).slice(0, 300)}`); } };
for (const [w, h] of VIEWS) for (const m of MOTION) await run('footle', () => footle(w, h, m));
for (const [w, h] of VIEWS) for (const m of MOTION) {
  await run('market', () => market(w, h, m, '2026-27', [['Niger', CAF], ['Southern Sudan', CAF], ['Turkmenistan', 'Asia (AFC)']], 'Niger'));
}
await run('market', () => market(390, 844, 'reduce', '2005-06', [['Namibia', CAF], ['French Guiana', 'North and Central America, Caribbean (CONCACAF)']], 'French Guiana'));
await run('market', () => market(1280, 900, 'no-preference', '2010-11', [['Niger', CAF], ['French Guiana', 'North and Central America, Caribbean (CONCACAF)']], 'French Guiana'));
await run('market', () => market(390, 844, 'no-preference', '2015-16', [['Mauritius', CAF]], 'Mauritius'));
await run('market', () => market(1280, 900, 'reduce', '2020-21', [], null));
for (const [w, h] of VIEWS) await run('whatsnew', () => whatsNew(w, h, 'reduce'));
for (const [w, h] of VIEWS) await run('careerlog', () => careerLog(w, h, w === 390 ? 'reduce' : 'no-preference'));

await browser.close();
fs.writeFileSync(path.join(OUT, 'walk-measures.json'), JSON.stringify(measures, null, 1));
console.log(`reviewRunWalk: ${bad} problem${bad === 1 ? '' : 's'}`);
process.exit(bad ? 1 : 0);
