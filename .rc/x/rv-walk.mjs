// Reviewer (runner lens) walk, Round 1104. Runs on the GitHub runner: node .rc/x/rv-walk.mjs
// Reads BASE, blocks supabase.co, walks NFL My Career at 390x844 and 1280x900, reduced motion on and off,
// saves screenshots and a JSON of what it measured into RC_OUT. It asserts nothing: the reviewer reads it.
import fs from 'node:fs';
import path from 'node:path';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const { chromium } = pw;
const BASE = process.env.BASE ?? 'http://localhost:4173';
const OUT = process.env.RC_OUT ?? '.';
const KEY = 'nfl-my-career-save-v1';
const ONLY = process.env.RV_ONLY || '';
const report = { base: BASE, runs: [], errors: [] };
const browser = await chromium.launch();

const shot = async (page, name, full = false) => {
  try { await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: full }); } catch (e) { report.errors.push(`shot ${name}: ${e}`); }
};
const text = async page => (await page.locator('body').innerText()).replace(/[ \t]+/g, ' ');
const readSave = page => page.evaluate(k => JSON.parse(localStorage.getItem(k) || 'null'), KEY);
const sideScroll = page => page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));

async function open(w, h, reduced, seenGate = true) {
  const context = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  await context.route(/supabase\.co/, r => r.abort());
  const page = await context.newPage();
  page.on('pageerror', e => report.errors.push(`pageerror ${w} ${reduced}: ${String(e).slice(0, 300)}`));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_FAILED|supabase/i.test(m.text())) report.errors.push(`console ${w}: ${m.text().slice(0, 200)}`); });
  if (seenGate) await page.addInitScript(() => localStorage.setItem('rules-gate-seen:/nfl-my-career', '1'));
  return { context, page };
}

async function quickStart(page, { throwback, pos, name }) {
  await page.goto(`${BASE}/nfl-my-career`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.locator('input[placeholder*="name"]').first().fill(name);
  if (throwback) await page.locator('button:has-text("2005 throwback")').first().click();
  await page.locator('button', { hasText: new RegExp(`^${pos}$`) }).first().click();
  await page.locator('button:has-text("Enter the draft")').click();
  await page.waitForTimeout(1200);
}

const BETWEEN = [
  '[data-season-reveal] button:has-text("Continue")',
  '[data-rivalry-event] button:has-text("Continue")',
  '[data-rivalry-choice] button:has-text("Continue")',
  '[data-rivalry-option]',
  '[data-decision-continue]',
  '[data-extension-talk] button:has-text("year out")',
  'button:has-text("One more year")',
  '[data-career-decision-option]',
];

/** Play one season; calls onReveal once when the season reveal is on screen. Returns true when a season was pressed. */
async function playOne(page, onReveal) {
  let pressed = false; let revealed = false;
  for (let step = 0; step < 60; step += 1) {
    if (pressed && !revealed && await page.locator('[data-season-reveal]').count()) { revealed = true; if (onReveal) await onReveal(); }
    let clicked = false;
    for (const sel of BETWEEN) {
      const el = page.locator(sel);
      if (await el.count()) { await el.first().click(); await page.waitForTimeout(500); clicked = true; break; }
    }
    if (clicked) continue;
    const play = page.locator('button', { hasText: /Play the \d{4} season/ });
    if (await play.count()) {
      if (pressed) return true;
      pressed = true;
      await play.first().click();
      await page.waitForTimeout(1100);
      continue;
    }
    const opt = page.locator('div.grid.gap-1\\.5 > button').first();
    if (await opt.count()) await opt.click();
    await page.waitForTimeout(500);
  }
  return pressed;
}

const brief = c => c && ({ pos: c.pos, era: c.eraId, year: c.year, team: c.team, pick: c.draftPick, salary: c.salary, years: c.contractYears, role: c.role, ovr: c.ovr, net: c.netWorth, vault: c.money?.vault, seasons: (c.seasons || []).map(s => ({ y: s.year, g: s.games, sk: s.sacks, fg: s.fgMade, team: s.team })) });

for (const [w, h] of [[390, 844], [1280, 900]]) for (const reduced of [false, true]) {
  const tag = `${w}${reduced ? 'r' : ''}`;
  if (ONLY && !ONLY.split(',').includes(tag)) continue;
  const run = { tag, steps: {} };
  report.runs.push(run);

  /* A. the first visit: the rules gate and the how to play, as a new visitor meets them */
  if (!reduced) {
    const { context, page } = await open(w, h, reduced, false);
    await page.goto(`${BASE}/nfl-my-career`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await shot(page, `${tag}-a1-first-visit`);
    run.steps.firstVisitText = (await text(page)).slice(0, 2500);
    run.steps.firstVisitScroll = await sideScroll(page);
    await shot(page, `${tag}-a2-first-visit-full`, true);
    await context.close();
  }

  /* B. a 2005 throwback kicker: hub, a season, the reveal, the log */
  {
    const { context, page } = await open(w, h, reduced);
    await quickStart(page, { throwback: true, pos: 'K', name: 'Toe Review' });
    run.steps.kickerStart = brief((await readSave(page))?.c);
    await shot(page, `${tag}-b1-kicker-hub`);
    run.steps.kickerHubText = (await text(page)).slice(0, 1800);
    run.steps.kickerHubScroll = await sideScroll(page);
    await playOne(page, async () => {
      await page.waitForTimeout(900);
      await shot(page, `${tag}-b2-kicker-reveal`);
      run.steps.kickerRevealText = (await text(page)).slice(0, 1500);
      run.steps.kickerRevealScroll = await sideScroll(page);
    });
    run.steps.kickerAfter1 = brief((await readSave(page))?.c);
    await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(1200);
    await shot(page, `${tag}-b3-kicker-hub-after`);
    const logTile = page.locator('[data-career-hub-buttons] button', { hasText: /Career Log/i });
    if (await logTile.count()) {
      await logTile.first().click(); await page.waitForTimeout(900);
      await shot(page, `${tag}-b4-kicker-log`);
      run.steps.logText = (await text(page)).slice(0, 1500);
      run.steps.logScroll = await sideScroll(page);
    } else run.steps.logText = 'NO Career Log tile found';
    await context.close();
  }

  /* C. the bank on load: a debt with a marker and 5M in savings; a debt with a marker and nothing; no marker */
  if (!reduced) {
    const { context, page } = await open(w, h, reduced);
    await quickStart(page, { throwback: false, pos: 'QB', name: 'Bank Review' });
    const doctor = (marker, vault, net) => page.evaluate(([k, withMarker, v, n]) => {
      const s = JSON.parse(localStorage.getItem(k));
      s.c.netWorth = n; s.c.earnings = 9.4; s.c.purchased = []; s.c.yearlyCosts = 0;
      delete s.c.eventLastFired; delete s.c.summerSalt; delete s.c.summer;
      if (v === null) delete s.c.money; else if (s.c.money) s.c.money.vault = v;
      if (withMarker) s.c.eventLastFired = { walk_card: s.c.year };
      localStorage.setItem(k, JSON.stringify(s));
      return { hadMoney: !!s.c.money };
    }, [KEY, marker, vault, net]);
    const reopen = async () => { await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(1300); };
    const hubBank = async () => { const hub = page.locator('[data-career-hub-buttons]'); return (await hub.count()) ? ((await hub.first().innerText()).match(/the bank\s*(-?\$[0-9.]+M?)/i) || [null, null])[1] : null; };
    run.steps.bank = {};
    run.steps.bank.before = brief((await readSave(page))?.c);
    run.steps.bank.doctor1 = await doctor(true, 5, -2.4);
    await reopen();
    run.steps.bank.markerSavings = { tile: await hubBank(), save: brief((await readSave(page))?.c) };
    await shot(page, `${tag}-c1-bank-marker-savings-hub`);
    const bankTileBtn = page.locator('[data-career-hub-buttons] button', { hasText: /The Bank/i });
    if (await bankTileBtn.count()) { await bankTileBtn.first().click(); await page.waitForTimeout(900); await shot(page, `${tag}-c2-bank-screen`); run.steps.bank.screenText = (await text(page)).slice(0, 1800); run.steps.bank.screenScroll = await sideScroll(page); }
    await doctor(true, 0, -0.4); await reopen();
    run.steps.bank.markerEmpty = { tile: await hubBank(), save: brief((await readSave(page))?.c) };
    await doctor(false, 0, -0.4); await reopen();
    run.steps.bank.noMarker = { tile: await hubBank(), save: brief((await readSave(page))?.c) };
    await shot(page, `${tag}-c3-bank-nomarker-hub`);
    await context.close();
  }

  /* D. an edge rusher today: does steady() stick, what role plays, how many games */
  {
    const tries = reduced ? 1 : 4;
    run.steps.edge = [];
    for (let i = 0; i < tries; i += 1) {
      const { context, page } = await open(w, h, reduced);
      await quickStart(page, { throwback: false, pos: 'EDGE', name: 'Edge Review' });
      const drafted = brief((await readSave(page))?.c);
      await page.evaluate(k => { const s = JSON.parse(localStorage.getItem(k)); s.c.ovr = 80; s.c.pot = 88; s.c.role = 'starter'; s.c.health = 100; s.c.contractYears = 9; localStorage.setItem(k, JSON.stringify(s)); }, KEY);
      await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(1200);
      const steadied = brief((await readSave(page))?.c);
      const per = [];
      for (let n = 0; n < 3; n += 1) {
        await playOne(page, (i === 0 && n === 0) ? async () => { await page.waitForTimeout(900); await shot(page, `${tag}-d1-edge-reveal`); run.steps.edgeRevealText = (await text(page)).slice(0, 1500); } : null);
        const c = (await readSave(page))?.c;
        per.push({ role: c?.role, ovr: c?.ovr, year: c?.year, n: c?.seasons?.length, last: c?.seasons?.at(-1) && { g: c.seasons.at(-1).games, sk: c.seasons.at(-1).sacks } });
      }
      run.steps.edge.push({ drafted: { pick: drafted?.pick, role: drafted?.role, ovr: drafted?.ovr, team: drafted?.team }, steadied: { role: steadied?.role, ovr: steadied?.ovr }, per, final: brief((await readSave(page))?.c)?.seasons });
      await context.close();
    }
  }

  /* E. What's New, top of the page */
  if (!reduced) {
    const { context, page } = await open(w, h, reduced);
    await page.goto(`${BASE}/whats-new`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1000);
    await shot(page, `${tag}-e1-whatsnew`);
    run.steps.whatsNewScroll = await sideScroll(page);
    await context.close();
  }
}

await browser.close();
fs.writeFileSync(path.join(OUT, 'rv-walk.json'), JSON.stringify(report, null, 1));
console.log(`rv-walk: ${report.runs.length} runs, ${report.errors.length} page errors`);
for (const r of report.runs) console.log(`${r.tag} edge: ${JSON.stringify((r.steps.edge || []).map(e => [e.drafted.role, e.steadied.role, ...e.per.map(p => `${p.role}:${p.last?.g}`)]))}`);
