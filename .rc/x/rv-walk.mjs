/* Reviewer's exploratory walk of Round 1052 (Russia in Club Manager). Never committed.
   Reads BASE, writes screenshots (jpeg) and one JSON log into RC_OUT. Blocks supabase.co. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pw from '../../scripts/lib/playwrightLoader.mjs';
const { chromium } = pw;

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || path.join(HERE, 'out');
fs.mkdirSync(OUT, { recursive: true });
const SAVE_KEY = 'dukb-club-manager-save';
const CLUB = process.env.RV_CLUB || 'Zenit';
const log = { base: BASE, runs: [] };
const PART = process.env.RV_PART || 'all';
const flush = () => fs.writeFileSync(path.join(OUT, 'walk-log-' + PART + '.json'), JSON.stringify(log, null, 1));

const browser = await chromium.launch();
const ALL = [[390, 844, false], [1280, 900, false], [390, 844, true], [1280, 900, true]];
const COMBOS = PART === 'a' ? ALL.slice(0, 2) : PART === 'b' ? ALL.slice(2) : PART === 'old' ? [] : ALL;
const OLD = PART === 'a' || PART === 'b' ? [] : ALL.slice(0, 2);

async function mk(w, h, reduced, tag, init) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  if (init) await ctx.addInitScript(init.fn, init.arg);
  const page = await ctx.newPage();
  page.setDefaultTimeout(4000);
  const run = { tag, errors: [], aborted: 0, steps: [] };
  log.runs.push(run);
  await page.route(/supabase\.co/, r => { run.aborted += 1; return r.abort(); });
  page.on('console', m => { if (m.type() === 'error' && !/supabase|Failed to load resource|net::ERR_FAILED/i.test(m.text())) run.errors.push('console: ' + m.text().slice(0, 300)); });
  page.on('pageerror', e => run.errors.push('pageerror: ' + String(e).slice(0, 300)));
  const text = async () => (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
  const shot = async (name, full = false) => { await page.screenshot({ path: path.join(OUT, `${tag}-${name}.jpg`), type: 'jpeg', quality: 72, fullPage: full }).catch(e => run.errors.push('shot ' + name + ': ' + String(e).slice(0, 120))); };
  const geo = async () => page.evaluate(() => ({ sx: document.documentElement.scrollWidth - document.documentElement.clientWidth, y: Math.round(window.scrollY), h: document.documentElement.scrollHeight }));
  const buttons = async (n = 40) => page.evaluate(k => [...document.querySelectorAll('button')].filter(b => b.offsetParent !== null).map(b => (b.innerText || b.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().slice(0, 60)).filter(Boolean).slice(0, k), n);
  const t0 = Date.now();
  const step = async (name, extra = {}) => { const s = { name, ms: Date.now() - t0, ...(await geo()), ...extra }; run.steps.push(s); flush(); return s; };
  const tap = async (rx, timeout = 5000) => page.locator('button:visible').filter({ hasText: rx }).first().click({ timeout }).then(() => true).catch(() => false);
  const tapRole = async (role, rx, timeout = 4000) => page.getByRole(role, { name: rx }).first().click({ timeout }).then(() => true).catch(() => false);
  return { ctx, page, run, text, shot, geo, buttons, step, tap, tapRole };
}

/* animations really running under the live pitch */
const pitchMotion = page => page.evaluate(() => {
  const pitches = [...document.querySelectorAll('[data-cm-live-pitch]')];
  if (!pitches.length) return { pitch: 0 };
  const inPitch = el => pitches.some(p => p.contains(el));
  const anims = document.getAnimations().filter(a => a.effect && a.effect.target && inPitch(a.effect.target));
  let cssAnimated = 0; let cssTransitioned = 0;
  for (const p of pitches) for (const el of p.querySelectorAll('*')) {
    const cs = getComputedStyle(el);
    if (cs.animationName && cs.animationName !== 'none' && parseFloat(cs.animationDuration) > 0.001) cssAnimated += 1;
    if (parseFloat(cs.transitionDuration) > 0.001) cssTransitioned += 1;
  }
  return { pitch: pitches.length, anims: anims.length, running: anims.filter(a => a.playState === 'running').length, cssAnimated, cssTransitioned, nodes: pitches[0].querySelectorAll('*').length };
});
const tableRows = page => page.evaluate(() => {
  const root = document.querySelector('[data-world-tables]');
  if (!root) return { root: false };
  const trs = root.querySelectorAll('tbody tr').length;
  const title = (root.querySelector('h3')?.innerText || '').trim();
  return { root: true, trs, title, text: root.innerText.replace(/\s+/g, ' ').slice(0, 900) };
});

for (const [w, h, reduced] of COMBOS) {
  const tag = `${w}${reduced ? 'rm' : ''}`;
  const { ctx, page, run, text, shot, buttons, step, tap, tapRole } = await mk(w, h, reduced, tag);
  try {
    await page.goto(BASE + '/club-manager', { waitUntil: 'domcontentloaded', timeout: 40000 });
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await page.getByRole('button', { name: /^essential only$/i }).first().click({ timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(500);
    await shot('01-landing');
    if (!reduced) await shot('01b-landing-full', true);
    await step('landing', { text: (await text()).slice(0, 700), buttons: await buttons(30) });
    const y0 = (await page.evaluate(() => window.scrollY));
    await tap(/2026-27/);
    await page.waitForTimeout(900);
    await shot('02-nations');
    const russia = page.locator('button:visible').filter({ hasText: /Russia/ }).first();
    const rbox = await russia.boundingBox().catch(() => null);
    await step('nations', { y0, russiaTile: (await russia.innerText().catch(() => 'NONE')).replace(/\s+/g, ' '), russiaBox: rbox, nationTiles: (await buttons(60)).filter(t => /league/.test(t)).length });
    await russia.scrollIntoViewIfNeeded().catch(() => {});
    await shot('02b-nations-russia');
    await russia.click({ timeout: 5000 }).catch(e => run.errors.push('no Russia tile: ' + String(e).slice(0, 100)));
    await page.waitForTimeout(900);
    await shot('03-league');
    await step('league', { buttons: await buttons(20) });
    await tap(/Russian Premier League/);
    await page.waitForTimeout(900);
    await shot('04-clubs');
    if (!reduced) await shot('04b-clubs-full', true);
    await step('clubs', { buttons: await buttons(40), text: (await text()).slice(0, 1600) });
    const clubTile = page.locator('button:visible').filter({ hasText: CLUB }).first();
    await clubTile.click({ timeout: 6000 }).catch(e => run.errors.push('no club tile: ' + String(e).slice(0, 100)));
    await page.waitForTimeout(700);
    await shot('05-confirm');
    await step('confirm', { text: (await text()).slice(0, 2600), buttons: await buttons(60) });
    await tap(/take the job|confirm|start/i);
    await page.getByText(/who is in the dugout/i).first().waitFor({ timeout: 8000 }).catch(() => {});
    await shot('06-dugout');
    await tap(/skip: just manage/i);
    await page.waitForTimeout(1800);
    await shot('07-hub');
    if (!reduced) await shot('07b-hub-full', true);
    await step('hub', { text: (await text()).slice(0, 1800), buttons: await buttons(60) });

    /* table tab */
    await tapRole('tab', /^Table$/);
    await page.waitForTimeout(900);
    await shot('08-table');
    await step('table-preseason', await tableRows(page));
    /* world browser */
    await tap(/Browse leagues/);
    await page.waitForTimeout(600);
    await shot('09-browser');
    const browserText = await page.locator('[data-world-tables]').innerText().catch(() => '');
    await page.locator('[data-world-tables] input[type="search"]').fill('Russia').catch(() => {});
    await page.waitForTimeout(400);
    await shot('09b-browser-search');
    await step('browser', { head: browserText.replace(/\s+/g, ' ').slice(0, 200), afterSearch: (await page.locator('[data-world-tables]').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 400) });
    await page.locator('[data-world-tables] button:visible').filter({ hasText: /^s*Backs*$/ }).first().click({ timeout: 3000 }).catch(e => run.errors.push('browser back: ' + String(e).slice(0, 80)));
    await page.waitForTimeout(400);
    /* squad tab */
    await tapRole('tab', /^Squad$/);
    await page.waitForTimeout(900);
    await shot('10-squad');
    if (!reduced) await shot('10b-squad-full', true);
    await step('squad', { text: (await text()).slice(0, 2400), flags: await page.evaluate(() => [...document.querySelectorAll('img')].filter(i => /flagcdn/.test(i.src)).length), brokenImgs: await page.evaluate(() => [...document.querySelectorAll('img')].filter(i => i.complete && i.naturalWidth === 0).map(i => i.src).slice(0, 8)) });
    /* market tab */
    await tapRole('tab', /^Market$/);
    await page.waitForTimeout(900);
    await shot('11-market');
    await step('market', { text: (await text()).slice(0, 1200) });
    /* help */
    const opener = page.locator('button:visible[aria-label="How to play"]').first();
    if (await opener.count()) { await opener.click({ timeout: 4000 }).catch(() => {}); await page.waitForTimeout(700); await shot('12-help'); await step('help', { text: (await text()).slice(0, 2600) }); await page.keyboard.press('Escape'); await page.waitForTimeout(300); }
    else run.errors.push('no ? button on the hub');

    /* live match */
    await tapRole('tab', /^Home$/);
    await page.waitForTimeout(600);
    let live = await page.locator('button:visible').filter({ hasText: /Play Live/i }).first().click({ timeout: 5000 }).then(() => true).catch(() => false);
    if (!live) { await step('home-before-live', { buttons: await buttons(60), text: (await text()).slice(0, 900) }); live = await tap(/play live|watch|kick off/i); }
    await page.waitForTimeout(2500);
    const m1 = await pitchMotion(page);
    await shot('13-live-a');
    await page.waitForTimeout(1500);
    const m2 = await pitchMotion(page);
    await shot('13-live-b');
    await step('live', { live, m1, m2, heading: (await page.locator('h1').first().innerText({ timeout: 700 }).catch(() => '')).trim(), text: (await text()).slice(0, 700), buttons: await buttons(40) });
    /* drive it to full time */
    let finished = false;
    const liveDeadline = Date.now() + 110000;
    for (let i = 0; i < 40 && !finished && Date.now() < liveDeadline; i++) {
      const t = await text();
      const head = ((await page.locator('h1').first().innerText({ timeout: 700 }).catch(() => '')) || '').trim().toUpperCase();
      if (head === 'FULL TIME' || /full report/i.test(t) && await tap(/full report/i, 1500)) { finished = true; break; }
      if (await tap(/^\s*4x\s*$/, 800)) { /* faster */ }
      if (await tap(/second half/i, 800)) { await page.waitForTimeout(600); continue; }
      if (await tap(/skip/i, 800)) { await page.waitForTimeout(700); continue; }
      if (await tap(/take the pens|penalt|continue|carry on|next/i, 800)) { await page.waitForTimeout(600); continue; }
      await page.waitForTimeout(1500);
    }
    await page.waitForTimeout(1200);
    await shot('14-fulltime');
    await step('fulltime', { finished, heading: (await page.locator('h1').first().innerText({ timeout: 700 }).catch(() => '')).trim(), text: (await text()).slice(0, 900), buttons: await buttons(40) });
    for (let i = 0; i < 6; i++) { if (/Season 1/i.test(await text()) && await page.getByRole('tab', { name: /^Table$/ }).count()) break; if (!(await tap(/continue|next|carry on|club home|back to club|^ok$/i, 1500))) break; await page.waitForTimeout(800); }
    await tapRole('tab', /^Table$/);
    await page.waitForTimeout(900);
    await shot('15-table-after');
    await step('table-after-1', await tableRows(page));
  } catch (e) { run.errors.push('walk threw: ' + String(e).slice(0, 300)); await shot('zz-threw'); }
  flush();
  await ctx.close();
}

/* the old save, written by the base's engine */
const raw = fs.readFileSync(path.join(ROOT, 'scripts', 'data', 'cmOldSave1052Fixture.json'), 'utf8');
for (const [w, h, reduced] of OLD) {
  const tag = `old${w}`;
  const { ctx, page, run, text, shot, buttons, step, tap, tapRole } = await mk(w, h, reduced, tag, { fn: ([k, v]) => { try { if (!localStorage.getItem(k)) localStorage.setItem(k, v); } catch { /* blocked */ } }, arg: [SAVE_KEY, raw] });
  try {
    await page.goto(BASE + '/club-manager', { waitUntil: 'domcontentloaded', timeout: 40000 });
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await page.getByRole('button', { name: /^essential only$/i }).first().click({ timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(1500);
    if (!/Sevilla/.test(await text())) { await tap(/continue|resume|Sevilla/i, 3000); await page.waitForTimeout(1200); }
    await shot('01-hub');
    await step('hub', { text: (await text()).slice(0, 900), buttons: await buttons(40) });
    await tapRole('tab', /^Table$/);
    await page.waitForTimeout(900);
    await shot('02-table');
    await step('table-mine', await tableRows(page));
    await tap(/Browse leagues/);
    await page.waitForTimeout(600);
    await shot('03-browser');
    const head = (await page.locator('[data-world-tables]').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 160);
    const ru = page.locator('[data-world-league="russia"]');
    const ruCount = await ru.count();
    if (ruCount) { await ru.first().scrollIntoViewIfNeeded().catch(() => {}); await shot('03b-browser-russia'); await ru.first().click({ timeout: 4000 }).catch(e => run.errors.push('russia league click: ' + String(e).slice(0, 100))); }
    await page.waitForTimeout(800);
    await shot('04-russia-table');
    await step('russia-in-old-save', { head, ruCount, ...(await tableRows(page)) });
    /* a league the old save does hold, for the baseline */
    await tap(/Browse leagues/); await page.waitForTimeout(400);
    await page.locator('[data-world-league="brasileirao"]').first().click({ timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(600);
    await step('brazil-in-old-save', await tableRows(page));
  } catch (e) { run.errors.push('walk threw: ' + String(e).slice(0, 300)); await shot('zz-threw'); }
  flush();
  await ctx.close();
}
await browser.close();
flush();
const errs = log.runs.flatMap(r => r.errors.map(e => `${r.tag}: ${e}`));
console.log(errs.join('\n'));
console.log(`rv-walk: ${log.runs.length} runs, ${errs.length} errors recorded, shots in ${OUT}`);
