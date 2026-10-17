// Round 1500 reviewer walk (run lens). Served build at process.env.BASE; supabase.co aborted; screenshots to RC_OUT.
// Three players on three sports, 390x844 touch and 1280x900, reduced motion on and off:
//  A wash89: 6.0M dirty at heat 89, all washers owned (NBA 390 reduce, MLB 1280 motion): read every tile, wash it.
//  B sliver: 0.05M dirty at heat 0, one washer unowned (NHL 390 motion): old sentence, read tiles, give it away.
//  C top: 20M dirty at heat 100, washers owned (NHL 1280 reduce, NBA 390 motion): keep it quiet, then come clean.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const { chromium } = await import(pathToFileURL(path.join(ROOT, 'scripts/lib/playwrightLoader.mjs')).href);
const BASE = (process.env.BASE || 'http://localhost:4173').replace(/\/$/, '');
const OUT = process.env.RC_OUT || path.join(ROOT, '.tmp-fx/rvwalk');
fs.mkdirSync(OUT, { recursive: true });
const bundle = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'rvwalk-')), 'e.cjs');
await build({
  stdin: { contents: `
    import { NBA_CAREER_SPORT } from '@/lib/nbaCareerSport';
    import { MLB_CAREER_SPORT } from '@/lib/mlbCareerSport';
    import { NHL_CAREER_SPORT } from '@/lib/nhlCareerSport';
    export const S = { nba: NBA_CAREER_SPORT, mlb: MLB_CAREER_SPORT, nhl: NHL_CAREER_SPORT };
    export * from '@/lib/careerDirtyMoney';
  `, resolveDir: ROOT, sourcefile: 'rv.ts', loader: 'ts' },
  outfile: bundle, bundle: true, platform: 'node', format: 'cjs', logLevel: 'silent', alias: { '@': path.join(ROOT, 'src') },
});
const M = createRequire(import.meta.url)(bundle);
const fixture = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/usBoardFixture.json'), 'utf8'));
let failures = 0;
const fail = (id, w) => { failures++; console.log(`  FAIL ${id}: ${w}`); };
const notes = [];

function save(slug, dirty, heat, washersOwned) {
  const s = JSON.parse(fixture.sports[slug].saves.dirty);
  const ids = M.washerIds(M.S[slug].shopItems);
  const base = (s.c.purchased ?? []).filter(x => !ids.includes(x));
  s.c.dirtyMoney = dirty; s.c.heat = heat; s.c.purchased = [...base, ...ids.slice(0, washersOwned)];
  return s;
}

async function open(browser, slug, size, reduce, value) {
  const sport = M.S[slug];
  const route = `/${sport.gameSlug}`;
  const context = await browser.newContext({
    viewport: { width: size.w, height: size.h }, isMobile: size.touch, hasTouch: size.touch, deviceScaleFactor: 1,
    reducedMotion: reduce ? 'reduce' : 'no-preference', serviceWorkers: 'block',
    storageState: { cookies: [], origins: [{ origin: BASE, localStorage: [
      { name: sport.saveKey, value }, { name: `rules-gate-seen:${route}`, value: '1' }, { name: 'cookie-consent', value: 'essential' }] }] },
  });
  await context.route(/supabase\.co/, r => r.abort());
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) errors.push(`console: ${m.text()}`); });
  await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
  return { context, page, errors, sport };
}

function kit(id, size, page, errors) {
  let n = 0;
  const tap = async l => { if (size.touch) await l.tap(); else await l.click(); };
  const check = async (name, card) => {
    await page.waitForTimeout(700);
    const m = await page.evaluate(sel => {
      const r = sel ? document.querySelector(sel)?.getBoundingClientRect() : null;
      const small = [...document.querySelectorAll('[data-dirty-way], [data-dirty-do], [data-dirty-money-result] button, [data-dirty-money-desk] button')]
        .map(b => b.getBoundingClientRect().height).filter(h => h > 0 && h < 44);
      const rise = [...document.querySelectorAll('.cm-rise')].map(e => { const cs = getComputedStyle(e); return `${cs.animationName}/${cs.opacity}`; });
      return { sw: document.documentElement.scrollWidth, iw: innerWidth, ih: innerHeight, top: r ? r.top : null, bottom: r ? r.bottom : null, small, rise };
    }, card);
    if (m.sw > m.iw) fail(id, `${name}: sideways scroll ${m.sw} on ${m.iw}`);
    if (card && m.top === null) fail(id, `${name}: ${card} missing`);
    else if (card && (m.bottom < 1 || m.top > m.ih - 40)) fail(id, `${name}: ${card} at ${Math.round(m.top)}..${Math.round(m.bottom)} off a ${m.ih} screen`);
    if (m.small.length) fail(id, `${name}: buttons under 44 px: ${m.small.map(Math.round).join(',')}`);
    if (errors.length) fail(id, `${name}: ${errors.join(' | ').slice(0, 240)}`);
    if (m.rise.length) notes.push(`${id} ${name}: cm-rise ${m.rise.join(' ')}`);
    await page.screenshot({ path: path.join(OUT, `${id}-${String(++n).padStart(2, '0')}-${name}.png`), fullPage: false });
  };
  return { tap, check };
}
const bytes = (page, sport) => page.evaluate(k => localStorage.getItem(k), sport.saveKey);
const bodyText = page => page.evaluate(() => document.body.innerText);
const tileText = (page, way) => page.locator(`[data-dirty-way="${way}"]`).innerText();

async function deskWalk(browser, id, slug, size, reduce, s, ways) {
  const value = JSON.stringify(s);
  const { context, page, errors, sport } = await open(browser, slug, size, reduce, value);
  const { tap, check } = kit(id, size, page, errors);
  try {
    const opener = page.locator('[data-dirty-money-desk] button');
    await opener.waitFor();
    const owned = M.washersLeft(sport.shopItems, s.c.purchased) === 0;
    const t = await bodyText(page);
    const want = owned ? M.DIRTY_SENTENCE_NO_WASHERS : 'Wash it in the Shady aisle or it keeps burning.';
    if (!t.includes(want)) fail(id, `hub sentence missing: ${want}`);
    if (await bytes(page, sport) !== value) fail(id, 'save written on load');
    await opener.scrollIntoViewIfNeeded();
    await check('hub', '[data-dirty-money-desk]');
    await page.screenshot({ path: path.join(OUT, `${id}-00-hub-full.png`), fullPage: true });
    let cur = s.c;
    for (const way of ways) {
      if (!(await page.locator('[data-dirty-way="clean"]').count())) { await tap(page.locator('[data-dirty-money-desk] button')); }
      await page.locator('[data-dirty-way="clean"]').waitFor();
      await check(`desk-before-${way}`, '[data-dirty-way="clean"]');
      for (const w of M.DIRTY_WAYS) {
        const tt = await tileText(page, w);
        const lines = M.previewDirty(cur, w).lines;
        const missing = lines.filter(l => !tt.includes(l));
        if (missing.length) fail(id, `tile ${w} lacks: ${missing.join(' / ')}`);
        notes.push(`${id} tile ${w}: ${tt.replace(/\s+/g, ' ').slice(0, 260)}`);
      }
      await tap(page.locator(`[data-dirty-way="${way}"]`));
      await page.locator(`[data-dirty-do="${way}"]`).waitFor();
      await page.waitForTimeout(1200);
      await check(`picked-${way}`, `[data-dirty-do="${way}"]`);
      const before = await bytes(page, sport);
      await tap(page.locator(`[data-dirty-do="${way}"]`));
      if (way === 'quiet') {
        await page.waitForTimeout(600);
        if (await bytes(page, sport) !== before) fail(id, 'Keep it saved something');
        if (await page.locator('[data-dirty-way]').count()) fail(id, 'Keep it did not close the desk');
        await check('after-quiet', '[data-dirty-money-desk]');
        continue;
      }
      await page.locator('[data-dirty-money-result]').waitFor();
      const after = JSON.parse(await bytes(page, sport));
      const exp = M.dealWithDirtyMoney(cur, way);
      if (JSON.stringify(after.c) !== JSON.stringify(exp.state)) fail(id, `saved career differs from the rule: dirty ${after.c.dirtyMoney} heat ${after.c.heat} net ${after.c.netWorth} karma ${after.c.karma} susp ${after.c.suspendedSeasons}`);
      notes.push(`${id} ${way}: ${exp.line} | saved dirty ${after.c.dirtyMoney} heat ${after.c.heat} net ${cur.netWorth} to ${after.c.netWorth} karma ${cur.karma} to ${after.c.karma} susp ${after.c.suspendedSeasons ?? 0} caught ${exp.caught}`);
      await check(`result-${way}`, '[data-dirty-money-result]');
      await tap(page.getByRole('button', { name: 'Back to your career', exact: true }));
      await page.waitForTimeout(500);
      if (await page.locator('[data-dirty-money-desk]').count()) fail(id, 'desk still offered after dealing');
      await check(`hub-after-${way}`, null);
      await page.screenshot({ path: path.join(OUT, `${id}-99-hub-after-full.png`), fullPage: true });
      cur = after.c;
    }
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1800);
    await check('reload', null);
  } catch (e) { fail(id, String(e.message || e).split('\n')[0]); } finally { await context.close(); }
}

const P390 = { w: 390, h: 844, touch: true };
const P1280 = { w: 1280, h: 900, touch: false };
const browser = await chromium.launch();
try {
  await deskWalk(browser, 'A-nba-390-reduce', 'nba', P390, true, save('nba', 6, 89, 3), ['wash']);
  await deskWalk(browser, 'A-mlb-1280-motion', 'mlb', P1280, false, save('mlb', 6, 89, 3), ['wash']);
  await deskWalk(browser, 'B-nhl-390-motion', 'nhl', P390, false, save('nhl', 0.05, 0, 2), ['give']);
  await deskWalk(browser, 'C-nhl-1280-reduce', 'nhl', P1280, true, save('nhl', 20, 100, 3), ['quiet', 'clean']);
  await deskWalk(browser, 'C-nba-390-motion', 'nba', P390, false, save('nba', 20, 100, 3), ['quiet', 'give']);
} finally { await browser.close(); }
for (const n of notes) console.log(`  ${n}`);
console.log(failures ? `rvwalk1500: ${failures} FAILURES` : 'rvwalk1500: ALL GREEN, 5 walks');
process.exit(failures ? 1 : 0);
