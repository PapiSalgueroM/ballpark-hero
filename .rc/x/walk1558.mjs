/* Reviewer walk (not committed): play the three corrected Connections boards dealt on 2026-12-15 (bconn-015,
   nflconn-004, nhlconn-004, all rewritten by Round 1558) the way a player would, at 390x844 and 1280x900 with
   reduced motion on and off; then load a save the base's boards would have written that day and see what shows.
   Every request off BASE is aborted (supabase.co included), so the pages deal from the shipped files. */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || '/tmp/walk-out';
fs.mkdirSync(OUT, { recursive: true });
const DATE = '2026-12-15';
const SPORTS = {
  baseball: {
    path: '/baseball-connections', slug: 'baseball-connections', rulesKey: 'bbconn-rules-seen', submit: /^Submit \(\d\/5\)$/,
    groups: [
      ['Bryce Harper', 'Kris Bryant', 'Cody Bellinger', 'Freddie Freeman', 'Shohei Ohtani'],
      ['Miguel Cabrera', 'Justin Verlander', 'Prince Fielder', 'Max Scherzer', 'Curtis Granderson'],
      ['Francisco Lindor', 'Jose Reyes', 'Jimmy Rollins', 'Ozzie Smith', 'Omar Vizquel'],
      ['Mariano Rivera', 'Trevor Hoffman', 'Lee Smith', 'Billy Wagner', 'Rollie Fingers'],
    ],
    old: { t: 'ok', theme: 'Went undrafted then became All-Stars', players: ['Jose Bautista', 'Justin Turner', 'Paul Goldschmidt', 'Max Muncy', 'J.D. Martinez'], diff: 'purple' },
  },
  nfl: {
    path: '/nfl-connections', slug: 'nfl-connections', rulesKey: 'nflconn-rules-seen', submit: /^Submit \(\d\/5\)$/,
    groups: [
      ['T.J. Watt', 'Cam Heyward', 'Ben Roethlisberger', 'Troy Polamalu', 'James Harrison'],
      ['Ray Lewis', 'Ed Reed', 'Lamar Jackson', 'Justin Tucker', 'Terrell Suggs'],
      ['Larry Fitzgerald', 'Andre Johnson', 'Calvin Johnson', 'A.J. Green', 'Mike Evans'],
      ['Trevor Lawrence', 'Deshaun Watson', 'Travis Etienne', 'Tee Higgins', 'Hunter Renfrow'],
    ],
    old: { t: 'ok', theme: 'Played for the Steelers', players: ['T.J. Watt', 'Cam Heyward', "Le'Veon Bell", 'Troy Polamalu', 'James Harrison'], diff: 'yellow' },
  },
  nhl: {
    path: '/nhl-connections', slug: 'nhl-connections', rulesKey: 'nhlconn-planning-rules-seen-v1', submit: /^Submit five$/,
    groups: [
      ['P.K. Subban', 'Shea Weber', 'Brendan Gallagher', 'Nick Suzuki', 'Cole Caufield'],
      ['Matthew Tkachuk', 'Aleksander Barkov', 'Sam Reinhart', 'Carter Verhaeghe', 'Aaron Ekblad'],
      ['Macklin Celebrini', 'Marc-Edouard Vlasic', 'Evander Kane', 'Logan Couture', 'Tomáš Hertl'],
      ['Connor McDavid', 'Leon Draisaitl', 'Nikita Kucherov', 'Nathan MacKinnon', 'Steven Stamkos'],
    ],
    old: { t: 'ok', theme: 'Played for the Sharks', players: ['Brent Burns', 'Erik Karlsson', 'Evander Kane', 'Logan Couture', 'Tomáš Hertl'], diff: 'blue' },
  },
};
const PROFILES = [
  { w: 390, h: 844, touch: true, reduced: false },
  { w: 390, h: 844, touch: true, reduced: true },
  { w: 1280, h: 900, touch: false, reduced: false },
  { w: 1280, h: 900, touch: false, reduced: true },
];
const report = [];
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function newPage(browser, p, seed) {
  const context = await browser.newContext({ viewport: { width: p.w, height: p.h }, isMobile: p.touch, hasTouch: p.touch,
    deviceScaleFactor: 1, reducedMotion: p.reduced ? 'reduce' : 'no-preference', serviceWorkers: 'block' });
  await context.route(/supabase\.co/, r => r.abort());
  await context.route('**/*', r => (new URL(r.request().url()).origin === new URL(BASE).origin ? r.continue() : r.abort()));
  await context.addInitScript(({ date, seed }) => {
    const O = Date, now = new O(date + 'T16:00:00Z').getTime();
    window.Date = class extends O { constructor(...a) { super(...(a.length ? a : [now])); } static now() { return now; } };
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem('cookie-consent', 'essential');
      for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v);
      sessionStorage.setItem('seeded', '1');
    }
  }, { date: DATE, seed });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  return { context, page, errors };
}
const shot = async (page, name, full = false) => { await sleep(500); await page.screenshot({ path: path.join(OUT, name + '.png'), fullPage: full, animations: 'disabled' }); return name; };
const overflow = page => page.evaluate(() => ({ doc: document.documentElement.scrollWidth, vw: innerWidth }));
const found = page => page.evaluate(() => (document.body.innerText.match(/(Groups found:?\s*\d\/4|Found \d\/4[^\n]*)/) || [''])[0]);
const tiles = (page, names) => Promise.all(names.map(n => page.getByRole('button', { name: n, exact: true }).count()));
async function closeRules(page, rec) {
  const dialog = page.getByRole('dialog').first();
  await dialog.waitFor({ timeout: 8000 });
  rec.rulesText = (await dialog.innerText()).slice(0, 600);
  await page.keyboard.press('Escape');
  try { await dialog.waitFor({ state: 'hidden', timeout: 3000 }); } catch {
    const b = page.getByRole('button', { name: /Let's Play|Close|Got it|Start|Play/ }).first();
    await b.click(); await dialog.waitFor({ state: 'hidden', timeout: 4000 });
  }
}
async function solve(page, S, names) {
  for (const n of names) await page.getByRole('button', { name: n, exact: true }).click();
  await page.getByRole('button', { name: S.submit }).click();
  await sleep(800);
}

const browser = await chromium.launch({ headless: true });
for (const [sport, S] of Object.entries(SPORTS)) {
  for (const p of PROFILES) {
    const id = `${sport}-${p.w}${p.reduced ? '-rm' : ''}`;
    const rec = { id, shots: [], notes: [] };
    report.push(rec);
    const { context, page, errors } = await newPage(browser, p, {});
    try {
      await page.goto(BASE + S.path, { waitUntil: 'domcontentloaded' });
      try { await closeRules(page, rec); } catch (e) { rec.notes.push('rules: ' + e.message.split('\n')[0]); }
      await page.getByRole('button', { name: S.groups[0][0], exact: true }).waitFor();
      rec.tilesAtStart = (await tiles(page, S.groups.flat())).reduce((a, b) => a + b, 0);
      rec.shots.push(await shot(page, id + '-board', true));
      for (let i = 0; i < 4; i++) {
        await solve(page, S, S.groups[i]);
        if (i === 0) { rec.save = await page.evaluate(k => localStorage.getItem(k), `${S.slug}-daily-${DATE}`); rec.shots.push(await shot(page, id + '-solved1', true)); }
        rec[`after${i + 1}`] = await found(page);
      }
      rec.shots.push(await shot(page, id + '-final', true));
      rec.overflow = await overflow(page);
      rec.finalText = (await page.evaluate(() => (document.querySelector('main') ?? document.body).innerText)).slice(0, 900);
    } catch (e) { rec.notes.push('FAIL ' + e.message.split('\n')[0]); try { rec.shots.push(await shot(page, id + '-failure', true)); } catch { /* none */ } }
    rec.errors = errors;
    await context.close();
  }
}

/* the save the base's boards wrote earlier the same day, loaded on the corrected board */
for (const [sport, S] of Object.entries(SPORTS)) for (const p of [PROFILES[0], PROFILES[2]]) {
  const id = `${sport}-${p.w}-oldsave`;
  const rec = { id, shots: [], notes: [] };
  report.push(rec);
  const branchSave = report.find(r => r.id === `${sport}-${p.w}`)?.save;
  if (!branchSave) { rec.notes.push('no branch save captured'); continue; }
  const s = JSON.parse(branchSave);
  s.guesses = [S.old]; s.gameStatus = 'playing';
  const seed = { [S.rulesKey]: '1', [`rules-gate-seen:${S.path}`]: '1', [`${S.slug}-daily-${DATE}`]: JSON.stringify(s) };
  const { context, page, errors } = await newPage(browser, p, seed);
  try {
    await page.goto(BASE + S.path, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: S.groups[1][0], exact: true }).waitFor();
    await sleep(800);
    rec.loaded = await found(page);
    rec.tilesPerGroup = await Promise.all(S.groups.map(g => tiles(page, g).then(c => c.reduce((a, b) => a + b, 0))));
    rec.shots.push(await shot(page, id + '-loaded', true));
    for (let i = 0; i < 4; i++) {
      const c = (await tiles(page, S.groups[i])).reduce((a, b) => a + b, 0);
      if (c !== 5) { rec.notes.push(`group ${i + 1}: only ${c} of its 5 tiles on the board, cannot be submitted`); continue; }
      const status = await page.getByRole('button', { name: S.submit }).count();
      if (!status) { rec.notes.push(`group ${i + 1}: no submit button (game over?)`); break; }
      await solve(page, S, S.groups[i]);
      rec.notes.push(`group ${i + 1} submitted: ${await found(page)}`);
    }
    rec.shots.push(await shot(page, id + '-final', true));
    rec.finalText = (await page.evaluate(() => (document.querySelector('main') ?? document.body).innerText)).slice(0, 900);
  } catch (e) { rec.notes.push('FAIL ' + e.message.split('\n')[0]); try { rec.shots.push(await shot(page, id + '-failure', true)); } catch { /* none */ } }
  rec.errors = errors;
  await context.close();
}
await browser.close();
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));
for (const r of report) console.log(`${r.id}: shots ${r.shots.length}; start tiles ${r.tilesAtStart ?? '-'}; ${[r.after1, r.after2, r.after3, r.after4].filter(Boolean).join(' > ')} ${r.loaded ? 'loaded ' + r.loaded + ' tiles ' + JSON.stringify(r.tilesPerGroup) : ''}; overflow ${JSON.stringify(r.overflow ?? null)}; errors ${r.errors?.length ?? 0}; notes ${JSON.stringify(r.notes)}`);
const bad = report.filter(r => r.notes.some(n => n.startsWith('FAIL')) || (r.errors ?? []).length);
console.log(bad.length ? `walk1558: ${bad.length} cases with a failure or page error` : 'walk1558: every case played through');
process.exit(bad.length ? 1 : 0);
