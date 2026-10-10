/* Reviewer's browser walk for Round 1223 (runner only). Nothing mounts the three career boxes yet, so the walk bundles
 * .rc/x/stage-entry.tsx (the real GmDeskMount + GM_CAREER_PANELS + the real NHL engine and adapter, handlers that call
 * the host), serves it on the built site's own stylesheet, and plays it at 390x844 and 1280x900, reduced motion on and off.
 * Screenshots and walk.json go to $RC_OUT. Supabase is blocked. */
import fs from 'node:fs';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const ROOT = process.cwd().replaceAll('\\', '/');
const BASE = process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173';
const OUT = process.env.RC_OUT ?? '/tmp/rc-out';
fs.mkdirSync(OUT, { recursive: true });

const esbuild = createRequire(`${ROOT}/`)('esbuild');
await esbuild.build({
  entryPoints: [`${ROOT}/.rc/x/stage-entry.tsx`], bundle: true, format: 'iife', platform: 'browser', jsx: 'automatic',
  alias: { '@': `${ROOT}/src` }, outfile: '/tmp/stage.js', logLevel: 'error',
  define: { 'process.env.NODE_ENV': '"production"', 'import.meta.env.DEV': 'false', 'import.meta.env.PROD': 'true', 'import.meta.env.MODE': '"production"', 'import.meta.env.BASE_URL': '"/"' },
  loader: { '.png': 'dataurl', '.svg': 'dataurl', '.css': 'empty' },
});
const JS = fs.readFileSync('/tmp/stage.js', 'utf8');
const namesDb = JS.includes('supabase.co');
const index = fs.readFileSync(`${ROOT}/dist/index.html`, 'utf8');
const links = index.match(/<link[^>]+rel="stylesheet"[^>]*>/g) ?? [];
const HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">${links.join('')}</head><body><div id="stage"></div><script src="/__stage.js"></script></body></html>`;

const R = { base: BASE, bundleBytes: JS.length, bundleNamesDatabase: namesDb, stylesheets: links.length, runs: [], errors: [], shots: {} };
const sha = b => crypto.createHash('sha1').update(b).digest('hex').slice(0, 12);

/* What a screen measures: sideways overflow, text cut off by an ellipsis, small tap targets, running animations. */
const MEASURE = () => {
  const cut = [...document.querySelectorAll('.truncate')].filter(e => e.scrollWidth > e.clientWidth + 1).map(e => `${e.textContent} [${e.clientWidth}/${e.scrollWidth}]`);
  const small = [...document.querySelectorAll('#stage button')].map(b => { const r = b.getBoundingClientRect(); return { t: (b.textContent || '').trim().slice(0, 30), h: Math.round(r.height), w: Math.round(r.width) }; }).filter(b => b.h > 0 && (b.h < 44 || b.w < 44));
  const sizes = [...document.querySelectorAll('#stage *')].filter(e => e.children.length === 0 && (e.textContent || '').trim()).map(e => parseFloat(getComputedStyle(e).fontSize));
  const anims = document.getAnimations().filter(a => a.playState === 'running').map(a => (a.animationName || a.transitionProperty || 'anim'));
  return { overflowX: document.documentElement.scrollWidth - window.innerWidth, cut, small, minFont: sizes.length ? Math.min(...sizes) : null, under10: sizes.filter(s => s < 10).length, texts: sizes.length, anims, reduce: matchMedia('(prefers-reduced-motion: reduce)').matches };
};

const browser = await pw.chromium.launch();
const VIEWS = [{ w: 390, h: 844 }, { w: 1280, h: 900 }];
const MOTIONS = ['reduce', 'no-preference'];

for (const v of VIEWS) for (const motion of MOTIONS) {
  const tag = `${v.w}-${motion === 'reduce' ? 'rm' : 'mo'}`;
  const keep = (v.w === 390 && motion === 'reduce') || (v.w === 1280 && motion === 'no-preference');
  const ctx = await browser.newContext({ viewport: { width: v.w, height: v.h }, reducedMotion: motion, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.route(/supabase\.co/, r => r.abort());
  await page.route('**/__stage*', r => (r.request().url().includes('__stage.js')
    ? r.fulfill({ contentType: 'text/javascript', body: JS }) : r.fulfill({ contentType: 'text/html', body: HTML })));
  page.on('pageerror', e => R.errors.push(`${tag}: ${String(e.message).slice(0, 200)}`));
  page.on('console', m => { if (m.type() === 'error') R.errors.push(`${tag} console: ${m.text().slice(0, 200)}`); });
  const run = { tag, steps: [] };
  R.runs.push(run);

  const info = async () => JSON.parse(await page.locator('#stage-info').textContent());
  const snap = async (name, note = {}) => {
    await page.waitForTimeout(250);
    const buf = await page.screenshot({ fullPage: true });
    R.shots[`${name}@${tag}`] = sha(buf);
    if (keep) fs.writeFileSync(`${OUT}/${name}-${v.w}.png`, buf);
    run.steps.push({ name, ...(await page.evaluate(MEASURE)), ...note });
  };
  const open = async s => { await page.goto(`${BASE}/__stage?s=${s}`); await page.waitForSelector('#stage-info', { state: 'attached', timeout: 60000 }); };
  const tile = async title => {
    await page.locator('[data-gm-desk="tiles"] button', { hasText: title }).first().click();
    const sawFallback = await page.locator('[data-gm-panel-loading]').count();
    await page.waitForSelector('[data-gm-desk="panel"]');
    await page.waitForSelector('[data-gm-panel-loading]', { state: 'detached' });
    return sawFallback;
  };
  const tilesText = async () => page.locator('[data-gm-desk="tiles"] button').allInnerTexts();
  const step = async (name, fn) => { try { await fn(); } catch (e) { R.errors.push(`${tag} ${name}: ${String(e && e.message).split('\n')[0].slice(0, 220)}`); run.steps.push({ name, threw: true }); } };

  /* A. Offers on the table: read them, open one, take it on the second tap. */
  await step('A', async () => {
    await open('offers');
    const i0 = await info();
    await snap('A1-tiles', { tiles: await tilesText(), state: i0.state, offers: i0.offers, found: i0.found, census: i0.census });
    const fb = await tile('Job market');
    await snap('A2-market', { sawFallback: fb, line: i0.line });
    await page.locator('button[aria-label="How the job market works"]').click();
    await snap('A3-help', { help: await page.locator('[data-gm-market-help]').innerText() });
    await page.locator('button[aria-label="How the job market works"]').click();
    await page.locator('[data-gm-offer]').first().click();
    await snap('A4-offer', { text: await page.locator('[data-gm-offer-open]').innerText() });
    await page.locator('[data-gm-take]').click();
    const armed = await page.locator('[data-gm-arm="take"]').innerText();
    const afterOne = (await info()).log;
    await snap('A5-armed', { armed, logAfterOneTap: afterOne });
    await page.locator('[data-gm-take]').click();
    await page.waitForSelector('[data-gm-desk="tiles"]');
    const i1 = await info();
    await snap('A6-after-take', { tiles: await tilesText(), log: i1.log, fired: i1.fired, stints: i1.stints, arriving: i1.arriving, team: i1.team, mandateSeason: i1.mandateSeason, season: i1.season });
    await tile('Career');
    await snap('A7-career', { text: await page.locator('[data-gm-career]').innerText() });
  });

  /* B. Nobody called, next year open: stay out on the second tap, the league plays a season, read the market again. */
  await step('B', async () => {
    await open('quiet');
    const i0 = await info();
    await snap('B0-tiles', { tiles: await tilesText(), state: i0.state, nextYear: i0.nextYear, found: i0.found });
    await tile('Job market');
    await snap('B1-quiet', { line: i0.line });
    await page.locator('[data-gm-sit-out]').click();
    const armed = await page.locator('[data-gm-arm="sit"]').innerText();
    await snap('B2-sit-armed', { armed, logAfterOneTap: (await info()).log });
    await page.locator('[data-gm-sit-out]').click();
    await page.waitForSelector('[data-gm-desk="tiles"]', { timeout: 60000 });
    const i1 = await info();
    await snap('B3-after-away', { tiles: await tilesText(), log: i1.log, season: i1.season, seasonWas: i0.season, seasonsOut: i1.seasonsOut, state: i1.state, nextYear: i1.nextYear, line: i1.line, card: await page.locator('[data-stage-card]').innerText() });
  });

  /* C. Nobody called, next year hangs on the old club. D. The phone has stopped: no stay out button. */
  await step('C', async () => {
    await open('climb');
    const i0 = await info();
    await snap('C0-tiles', { tiles: await tilesText(), state: i0.state, nextYear: i0.nextYear, climbTo: i0.climbTo, found: i0.found });
    await tile('Job market');
    await snap('C1-climb', { line: i0.line, sit: await page.locator('[data-gm-sit-out]').count() });
  });
  await step('D', async () => {
    await open('closed');
    const i0 = await info();
    await snap('D0-tiles', { tiles: await tilesText(), state: i0.state, found: i0.found });
    await tile('Job market');
    await snap('D1-closed', { line: i0.line, sit: await page.locator('[data-gm-sit-out]').count(), offers: await page.locator('[data-gm-offer]').count() });
  });

  /* E. Offers today while next year is shut: is the stay out button there, what does it say, and where does it lead. */
  await step('E', async () => {
    await open('shutoffers');
    const i0 = await info();
    if (!i0.found) { run.steps.push({ name: 'E-none', census: i0.census }); return; }
    await tile('Job market');
    const sit = await page.locator('[data-gm-sit-out]').count();
    await snap('E1-shutoffers', { state: i0.state, nextYear: i0.nextYear, offers: i0.offers, found: i0.found, line: i0.line, sit, census: i0.census });
    if (!sit) return;
    await page.locator('[data-gm-sit-out]').click();
    const armed = await page.locator('[data-gm-arm="sit"]').innerText();
    await page.locator('[data-gm-sit-out]').click();
    await page.waitForSelector('[data-gm-desk="tiles"]', { timeout: 60000 });
    const i1 = await info();
    await snap('E2-after-away', { armed, tiles: await tilesText(), log: i1.log, state: i1.state, nextYear: i1.nextYear, line: i1.line });
  });

  /* F. A record built from an old save (nine seasons, two titles, no block). G. The GM level box: help, then a point. */
  await step('F', async () => {
    await open('legacy');
    await snap('F0-tiles', { tiles: await tilesText() });
    await tile('Career');
    await page.locator('button[aria-label="How the career record works"]').click();
    await snap('F1-career-legacy', { text: await page.locator('[data-gm-career]').innerText() });
  });
  await step('G', async () => {
    await open('held&xp=1300');
    await snap('G0-tiles', { tiles: await tilesText() });
    await tile('GM level');
    await snap('G1-xp', { earns: await page.locator('[data-gm-xp-earns]').innerText(), panel: (await page.locator('[data-gm-xp]').innerText()).slice(0, 600) });
    await page.locator('button[aria-label="How GM XP works"]').click();
    await snap('G2-xp-help', { help: await page.locator('[data-gm-xp-help]').innerText() });
    await page.locator('button[aria-label="How GM XP works"]').click();
    const helpOpenBefore = await page.locator('[data-gm-xp-help]').count();
    await page.locator('[data-gm-tree="ownership"] button').click();
    const i1 = await info();
    await snap('G3-after-spend', { log: i1.log, helpOpenBefore, ownership: await page.locator('[data-gm-tree="ownership"]').innerText(), notLive: await page.locator('[data-gm-tree="scouting"] button').isDisabled() });
  });
  await ctx.close();
}
await browser.close();

/* The same screen with motion reduced and not: equal pictures mean nothing on it moves either way. */
const pairs = {};
for (const [k, h] of Object.entries(R.shots)) { const [name, tag] = k.split('@'); const w = tag.split('-')[0]; (pairs[`${name}@${w}`] ??= []).push(h); }
R.motionDiffers = Object.entries(pairs).filter(([, hs]) => hs.length === 2 && hs[0] !== hs[1]).map(([k]) => k);
fs.writeFileSync(`${OUT}/walk.json`, JSON.stringify(R, null, 1));
const steps = R.runs.flatMap(r => r.steps);
for (const r of R.runs) for (const s of r.steps) {
  const flags = [s.threw ? 'THREW' : '', s.overflowX > 0 ? `overflowX ${s.overflowX}` : '', s.cut && s.cut.length ? `cut ${s.cut.length}` : '', s.anims && s.anims.length ? `anims ${s.anims.join(',')}` : ''].filter(Boolean).join('; ');
  console.log(`${r.tag} ${s.name}: ${flags || 'clean'}`);
}
for (const e of R.errors) console.log(`ERROR ${e}`);
console.log(`walk: ${steps.length} steps, ${Object.keys(R.shots).length} shots, ${R.errors.length} errors, ${steps.filter(s => s.overflowX > 0).length} with sideways overflow, ${steps.filter(s => s.cut && s.cut.length).length} with cut off text, motion differs on ${R.motionDiffers.length}, bundle names the database: ${namesDb}`);
process.exit(R.errors.length ? 1 : 0);
