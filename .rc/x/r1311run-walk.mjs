// Review of Round 1311 (run lens): play the league leaders as a player would, on a served build.
// BASE (served build), RC_OUT (pictures). 390 by 844 and 1280 by 900, reduced motion on and off.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const ROOT = process.cwd();
const BASE = process.env.BASE || process.env.SWEEP_BASE;
const OUT = process.env.RC_OUT || path.join(ROOT, 'walk-out');
const KEY = 'dukb-club-manager-save';
const NOW = Date.parse('2026-10-12T16:00:00Z');
if (!BASE) { console.log('walk: no BASE'); process.exit(2); }
fs.mkdirSync(OUT, { recursive: true });
const notes = [];
const note = m => { notes.push(m); console.log(m); };
let fails = 0; const fail = m => { fails += 1; note(`FAIL ${m}`); };

const mem = new Map();
globalThis.localStorage = { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)), removeItem: k => mem.delete(k) };
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'r1311-walk-'));
const ENTRY = path.join(TMP, 'e.mjs'); const BUNDLE = path.join(TMP, 'b.mjs');
const P = f => JSON.stringify(path.join(ROOT, f).replaceAll('\\', '/'));
fs.writeFileSync(ENTRY, `export * as cm from ${P('src/lib/clubManager.ts')};\nexport * as boards from ${P('src/lib/clubManagerLeagueBoards.ts')};\n`);
await build({ entryPoints: [ENTRY], bundle: true, platform: 'node', format: 'esm', outfile: BUNDLE, alias: { '@': path.join(ROOT, 'src') }, logLevel: 'error',
  loader: { '.css': 'empty', '.png': 'empty', '.svg': 'empty', '.jpg': 'empty', '.webp': 'empty' } });
const { cm, boards } = await import(pathToFileURL(BUNDLE).href);
await cm.ensureAllEraRosters?.();
function seeded(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function onStream(seed, fn) { const r = Math.random; const n = Date.now; Math.random = seeded(seed); Date.now = () => NOW; try { return fn(); } finally { Math.random = r; Date.now = n; } }
const clubOf = (id, i) => { const l = cm.REAL_LEAGUES.find(x => x.id === id); return l.clubs[i] ?? l.clubs[0]; };
function play(s, n) { for (let k = 0; k < n && s.week < s.calendar.length; k += 1) { const r = cm.playNextEntry(s, { skipHalftime: true }); s = r.state; if (r.kind === 'seasonOver') break; } return s; }
const toEnd = s => play(s, 240);
function kept(make, seed) { for (let k = 0; k < 6; k += 1) { const s = onStream(seed + k * 7919, make); if (s && !s.sacked) return s; } return null; }
const S = {
  mid: onStream(0xa1, () => play(cm.startCareer(clubOf('premier', 2)), 22)),
  champ: onStream(0xa2, () => play(cm.startCareer(clubOf('championship', 3)), 22)),
  thin: onStream(0xa3, () => play(cm.startCareer(clubOf('scottish', 1)), 22)),
  review: kept(() => cm.finishSeason(toEnd(cm.startCareer(clubOf('premier', 4)))).state, 0xa4),
  thinreview: kept(() => cm.finishSeason(toEnd(cm.startCareer(clubOf('scottish', 2)))).state, 0xa5),
  past: kept(() => { let s = cm.startCareer(clubOf('laliga', 3)); for (let k = 0; k < 7 && !s.sacked; k += 1) s = cm.startNextSeason(cm.finishSeason(toEnd(s)).state); return play(s, 4); }, 0xa6),
};
for (const [k, s] of Object.entries(S)) {
  if (!s) { fail(`${k}: save could not be built`); continue; }
  const lb = cm.leagueBoardsOf(s);
  note(`save ${k}: ${s.clubName} season ${s.season} week ${s.week}; share ${lb?.share ?? 'none'} from ${lb?.from ?? '-'} by ${cm.bookAwardsState(s).by}; summary awards ${s.pendingSummary ? Boolean(s.pendingSummary.awards) : '-'}; records with awards ${s.history.filter(h => h.awards).length}, with a team ${s.history.filter(h => h.awards?.xi).length}`);
}

const browser = await pw.chromium.launch({ headless: true });
const origin = new URL(BASE).origin;
async function openPage(save, [w, h], motion) {
  const context = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: 'dark', serviceWorkers: 'block', reducedMotion: motion,
    storageState: { cookies: [], origins: [{ origin, localStorage: [{ name: KEY, value: JSON.stringify(save) }, { name: 'cookie-consent', value: 'essential' }, { name: 'dukb-theme', value: 'dark' }] }] } });
  await context.route(/supabase\.co/, r => r.abort());
  await context.route('**/*', r => (new URL(r.request().url()).origin === origin ? r.continue() : r.abort()));
  await context.addInitScript(now => { const Old = Date; window.Date = class extends Old { constructor(...a) { super(...(a.length ? a : [now])); } static now() { return now; } }; }, NOW);
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(`${BASE}/club-manager`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-testid="cm-slot-1"]').getByRole('button', { name: 'Resume Career', exact: true }).click();
  return { context, page, errors };
}
/* JPEG and fewer pictures with motion on (the first run wrote over 25 MB and the runner dropped them all). */
const shot = (page, name, full = false) => {
  if (name.includes('-mo') && !/^(review|thinreview|mid-.*-tiles$)/.test(name)) return Promise.resolve();
  return page.screenshot({ path: path.join(OUT, `${name}.jpg`), fullPage: full, type: 'jpeg', quality: 55 }).catch(e => note(`shot ${name} failed ${String(e).slice(0, 80)}`));
};
async function toStats(page) {
  const tile = page.locator('button:visible').filter({ has: page.locator('div', { hasText: /^Stats$/ }) }).first();
  await tile.waitFor(); await tile.click();
  await page.locator('[data-cm-leaders]').first().waitFor();
  await page.waitForTimeout(600);
}
const sideways = page => page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
const text = (page, sel) => page.evaluate(s => [...document.querySelectorAll(s)].map(e => e.textContent), sel);

for (const size of [[390, 844], [1280, 900]]) {
  for (const motion of ['reduce', 'no-preference']) {
    const tag = `${size[0]}-${motion === 'reduce' ? 'rm' : 'mo'}`;
    for (const k of ['mid', 'champ', 'thin']) {
      if (!S[k]) continue;
      const { context, page, errors } = await openPage(S[k], size, motion);
      try {
        await toStats(page);
        await shot(page, `${k}-${tag}-tiles`);
        if (k === 'mid' || size[0] === 390) await shot(page, `${k}-${tag}-tiles-full`, true);
        note(`${k} ${tag}: thin line ${JSON.stringify(await text(page, '[data-cm-leaders-thin]'))}; late ${JSON.stringify(await text(page, '[data-cm-leaders-late]'))}; sideways ${await sideways(page)}`);
        note(`${k} ${tag}: tiles ${JSON.stringify((await text(page, '[data-cm-leaders-tile]')).map(t => t.replace(/\s+/g, ' ').slice(0, 70)))}`);
        if (k === 'mid' && motion === 'reduce') {
          await page.locator('[data-cm-leaders-help]').first().click();
          await page.waitForTimeout(400);
          await shot(page, `${k}-${tag}-help`, true);
          const help = await page.evaluate(() => document.querySelector('[data-cm-leaders]')?.innerText ?? '');
          fs.writeFileSync(path.join(OUT, `help-${tag}.txt`), help);
          await page.locator('[data-cm-leaders-help]').first().click();
        }
        for (const kind of ['goals', 'sheets']) {
          await page.locator(`[data-cm-leaders-tile="${kind}"]`).click();
          await page.locator(`[data-cm-board="${kind}"]`).waitFor();
          await page.waitForTimeout(500);
          await shot(page, `${k}-${tag}-${kind}`);
          const sw = await sideways(page);
          if (sw > 0) fail(`${k} ${tag} ${kind}: the page runs ${sw} px sideways`);
          if (kind === 'sheets') note(`${k} ${tag}: keepers line ${JSON.stringify(await text(page, '[data-cm-leaders-keepers]'))}`);
          await page.locator('[data-cm-leaders-back]').click();
          await page.locator('[data-cm-leaders-tile="goals"]').waitFor();
        }
        const races = await page.evaluate(() => document.body.innerText.match(/[^\n]*(golden boot|Golden boot|scorers' race)[^\n]*/g) ?? []);
        note(`${k} ${tag}: race lines ${JSON.stringify(races.slice(0, 4))}`);
      } catch (e) { fail(`${k} ${tag}: ${String(e?.message ?? e).split('\n')[0].slice(0, 200)}`); await shot(page, `${k}-${tag}-stuck`); }
      if (errors.length) fail(`${k} ${tag}: page error ${errors[0].slice(0, 160)}`);
      await context.close();
    }
    for (const k of ['review', 'thinreview']) {
      if (!S[k]) continue;
      const { context, page, errors } = await openPage(S[k], size, motion);
      try {
        await page.locator('[data-cm-award],[data-cm-award-withheld]').first().waitFor().catch(() => note(`${k} ${tag}: no award line and no withheld line appeared`));
        await page.waitForTimeout(motion === 'reduce' ? 800 : 4500);
        await shot(page, `${k}-${tag}-review`);
        await shot(page, `${k}-${tag}-review-full`, true);
        const op = await page.evaluate(() => [...document.querySelectorAll('[data-cm-award],[data-cm-award-withheld],[data-cm-award-thin]')].map(e => `${e.getAttribute('data-cm-award') ?? 'line'}:${getComputedStyle(e).opacity}`));
        note(`${k} ${tag}: award lines and opacity ${JSON.stringify(op)}; withheld ${JSON.stringify(await text(page, '[data-cm-award-withheld]'))}; sideways ${await sideways(page)}`);
        if (await page.locator('[data-cm-team-tile]').count()) {
          await page.locator('[data-cm-team-tile]').first().click();
          await page.locator('[data-cm-team-open]').waitFor();
          await page.waitForTimeout(400);
          await shot(page, `${k}-${tag}-team`);
          await page.locator('[data-cm-team-open]').screenshot({ path: path.join(OUT, `${k}-${tag}-team-el.jpg`), type: 'jpeg', quality: 60 }).catch(() => {});
          await page.locator('[data-cm-team-back]').click();
        }
      } catch (e) { fail(`${k} ${tag}: ${String(e?.message ?? e).split('\n')[0].slice(0, 200)}`); await shot(page, `${k}-${tag}-stuck`); }
      if (errors.length) fail(`${k} ${tag}: page error ${errors[0].slice(0, 160)}`);
      await context.close();
    }
    if (S.past) {
      const { context, page, errors } = await openPage(S.past, size, motion);
      try {
        await toStats(page);
        await page.locator('[data-cm-leaders-tile="past"]').click();
        await page.locator('[data-cm-board="past"]').waitFor();
        await page.waitForTimeout(400);
        await shot(page, `past-${tag}-1`);
        for (let i = 2; i <= 7; i += 1) {
          const older = page.locator('[data-cm-past-step="older"]');
          if (await older.isDisabled()) break;
          await older.click(); await page.waitForTimeout(250);
          if (i === 5 || i === 6 || i === 7) await shot(page, `past-${tag}-${i}`);
        }
        note(`past ${tag}: count ${JSON.stringify(await text(page, '[data-cm-past-count]'))}; gone ${JSON.stringify(await text(page, '[data-cm-team-gone]'))}; sideways ${await sideways(page)}`);
      } catch (e) { fail(`past ${tag}: ${String(e?.message ?? e).split('\n')[0].slice(0, 200)}`); await shot(page, `past-${tag}-stuck`); }
      if (errors.length) fail(`past ${tag}: page error ${errors[0].slice(0, 160)}`);
      await context.close();
    }
  }
}
await browser.close();
fs.writeFileSync(path.join(OUT, 'walk-notes.txt'), notes.join('\n'));
console.log(fails ? `walk: RED, ${fails} failures` : 'walk: green (pictures in RC_OUT for looking)');
process.exit(fails ? 1 : 0);
