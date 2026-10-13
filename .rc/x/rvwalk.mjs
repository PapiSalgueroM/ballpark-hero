// Round 1318 runner review walk (never committed; sent as .rc/x/rvwalk.mjs, run under #!serve and #!playwright).
// A Soccer Career save made by this head's own engine (2024 start, two pooled nights behind it) is put in
// localStorage three ways: as made (a pool), as an old save (no pool) and with an unreadable pool (version 99).
// The walk plays it the way a player does (the most advancing button) through two Ballon d'Or nights at 390x844
// and 1280x900 with reduced motion on and off, shoots each revealed night, and checks: no broken save card, no page
// error, no sideways scroll, the card shows the saved names, and a made up rival nominated on both nights keeps his
// name. Then /whats-new at both widths. BASE and RC_OUT come from the runner; supabase.co is blocked.
import fs from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';
import { pathToFileURL } from 'node:url';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const ROOT = process.cwd(), BASE = process.env.BASE || 'http://localhost:4173', OUT = process.env.RC_OUT || '/tmp/rvwalk';
fs.mkdirSync(OUT, { recursive: true });
const outfile = '/tmp/rvwalk-engine.mjs';
await build({ stdin: { contents: "export * from './src/lib/soccerCareerEngine';", resolveDir: ROOT, loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', outfile, logLevel: 'error', alias: { '@': path.join(ROOT, 'src') }, define: { 'process.env.NODE_ENV': '"production"' }, banner: { js: 'globalThis.localStorage ??= { getItem: () => null, setItem() {}, removeItem() {}, clear() {}, key: () => null, length: 0 };' } });
const E = await import(pathToFileURL(outfile).href);
const { careerStep, seedRandom } = await import(pathToFileURL(path.join(ROOT, 'scripts/lib/careerStep.mjs')).href);
let save = null;
for (let attempt = 0; attempt < 30 && !save; attempt++) {
  seedRandom(1318 + attempt);
  const flat = o => ({ pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o });
  let c = E.initCareer('Walk Fixture', 'Portugal', 'ST', 'modern', flat(62), 62, 2024, E.FALLBACK_CLUBS, null, 92), nights = 0;
  for (let g = 0; g < 2500 && !c.retired; g++) {
    if (c.phase === 'ballon_dor' && c.generatedBallonPool) nights++;
    if (c.phase === 'playing' && nights >= 2 && c.seasons.at(-1).year >= 2030 && c.age <= 31) { save = c; break; }
    c = careerStep(E, c, E.FALLBACK_CLUBS);
  }
}
if (!save) { console.log('WALK ABORTED: no fixture career'); process.exit(2); }
const variants = { pool: save, old: (() => { const s = structuredClone(save); delete s.generatedBallonPool; return s; })(), bad: { ...structuredClone(save), generatedBallonPool: { version: 99, junk: true } } };
console.log(`fixture: ${save.playerName} age ${save.age}, last season ${save.seasons.at(-1).year}, pool entries ${save.generatedBallonPool.entries.length}`);
let checks = 0, failed = 0;
const check = (ok, label) => { checks++; if (!ok) failed++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}`); };
const ACTIONS = ['Sign contract', 'Review contract', 'Leave on free transfer', 'Join Club', 'Request transfer', '💪 Not Done Yet', '😭 Cry through', 'Next Year', 'Next Season', 'Continue', 'Sign Contract', 'Accept', 'Confirm', 'Proceed', 'Next', 'Done', 'Close'];
const SKIP = /Retire|New Career|Report a bug|Light mode|Sound: |Cookie|Sign up|^Back$|Full attributes|Essential only|^Accept$|^⏸$|^🏋️$|^📱|^🏋️Training|^👥 Squad|^🎯 Season target|^🏃 Preseason|^📖 Record book|^Your next season|^🎙️ Press room|^Review your agent|^Open your phone|Derby history|^🏆|^⭐|^🌍|^🌐|^🏅|^🗂️|^\?$/;
const readSave = page => page.evaluate(() => JSON.parse(localStorage.getItem('soccerCareerSave') || 'null'));
async function stepOnce(page) {
  return page.evaluate(async ([actions, skipSrc]) => {
    const skip = new RegExp(skipSrc);
    const usable = [...document.querySelectorAll('button')].filter(b => !b.disabled && b.textContent.trim() && !skip.test(b.textContent.trim()) && b.getClientRects().length > 0);
    let pick = null;
    for (const a of actions) { pick = usable.find(b => b.textContent.trim().startsWith(a)); if (pick) break; }
    if (!pick) pick = usable[0];
    if (!pick) return 'STUCK';
    pick.click(); await new Promise(r => setTimeout(r, 650)); return pick.textContent.trim().slice(0, 30);
  }, [ACTIONS, SKIP.source]);
}
const browser = await pw.chromium.launch({ args: ['--no-sandbox'] });
const plan = [['pool', 390, 844, 'reduce'], ['pool', 390, 844, 'no-preference'], ['pool', 1280, 900, 'reduce'], ['pool', 1280, 900, 'no-preference'], ['old', 390, 844, 'reduce'], ['old', 1280, 900, 'no-preference'], ['bad', 390, 844, 'no-preference'], ['bad', 1280, 900, 'reduce']];
const seen = {};
for (const [v, w, h, motion] of plan) {
  const tag = `${v}-${w}-${motion === 'reduce' ? 'rm' : 'full'}`;
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: motion });
  await ctx.route(/supabase\.co/, r => r.abort());
  await ctx.addInitScript(raw => { if (!sessionStorage.getItem('rvwalk')) { sessionStorage.setItem('rvwalk', '1'); localStorage.setItem('cookie-consent', 'essential'); localStorage.setItem('soccerCareerSave', raw); } }, JSON.stringify(variants[v]));
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 160)));
  try {
    await page.goto(`${BASE}/soccer-career`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => document.querySelectorAll('button').length > 4, null, { timeout: 45000 });
    await page.waitForTimeout(4000);
    await page.screenshot({ path: path.join(OUT, `start-${tag}.png`) });
    const labels = await page.evaluate(() => [...document.querySelectorAll('button')].filter(b => b.getClientRects().length > 0).map(b => b.textContent.trim().slice(0, 24)).filter(Boolean));
    console.log(`${tag} start: phase ${(await readSave(page))?.phase}; buttons: ${labels.slice(0, 30).join(' | ')}`);
    const dialogs = await page.locator('[role="dialog"]:visible').count();
    if (dialogs) { console.log(`${tag}: ${dialogs} dialog(s) open at start, pressing Escape`); await page.keyboard.press('Escape'); await page.waitForTimeout(800); }
    check(!(await page.getByText("We couldn't open this save").count()), `${tag}: the career opens, no broken save card`);
    const nights = [];
    for (let s = 0; s < 120 && nights.length < 2; s++) {
      const st = await readSave(page);
      if (st?.phase === 'ballon_dor' && st.pendingBallonDor && !nights.some(n => n.year === st.pendingBallonDor.year)) {
        const card = page.locator('[data-award-night="ballon_dor"]');
        await card.waitFor({ timeout: 15000 });
        await page.waitForSelector('[data-award-night="ballon_dor"][data-award-result="revealed"]', { timeout: 30000 }).catch(() => {});
        await card.scrollIntoViewIfNeeded();
        const shot = `night-${tag}-${nights.length + 1}.png`;
        await page.screenshot({ path: path.join(OUT, shot) });
        await card.screenshot({ path: path.join(OUT, 'card-' + shot) }).catch(() => {});
        const rows = await card.locator('[data-award-rank]').allTextContents();
        const nom = st.pendingBallonDor.nominees;
        check(rows.length === nom.length && rows.every((t, i) => t.includes(nom[i].name)), `${tag} night ${st.pendingBallonDor.year}: the card lists the ${nom.length} saved names in order`);
        check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${tag} night ${st.pendingBallonDor.year}: no sideways scroll`);
        nights.push({ year: st.pendingBallonDor.year, gen: nom.filter(n => n.generatedId !== undefined).map(n => [n.generatedId, n.name, n.generatedAge]), pool: st.generatedBallonPool?.entries?.length ?? null, poolOk: E.isGeneratedBallonPool(st.generatedBallonPool, st.seasons.at(-1).year), shot });
      }
      const r = await stepOnce(page);
      if (r === 'STUCK') {
        await page.screenshot({ path: path.join(OUT, `stuck-${tag}.png`) });
        const ls = await page.evaluate(() => [...document.querySelectorAll('button')].map(b => (b.getClientRects().length ? '' : '(hidden)') + b.textContent.trim().slice(0, 24)).filter(Boolean));
        check(false, `${tag}: stuck in phase ${st?.phase}; buttons: ${ls.slice(0, 30).join(' | ')}`); break;
      }
      if ((await readSave(page))?.retired) break;
    }
    check(nights.length === 2, `${tag}: reached two Ballon d'Or nights (${nights.map(n => n.year).join(', ')})`);
    if (nights.length === 2) {
      check(nights.every(n => n.poolOk), `${tag}: each night saved a pool the reader accepts`);
      const [a, b] = nights, again = a.gen.filter(([id]) => b.gen.some(([j]) => j === id));
      check(again.every(([id, name, age]) => b.gen.some(([j, n2, a2]) => j === id && n2 === name && a2 === age + (b.year - a.year))), `${tag}: ${again.length} made up rivals on both nights keep their names and age a year`);
    }
    check(errors.length === 0, `${tag}: no page errors ${errors.join(' | ')}`);
    seen[tag] = nights;
  } catch (e) { check(false, `${tag} threw: ${String(e).slice(0, 300)}`); }
  await ctx.close();
}
const names = t => (seen[t] || []).map(n => n.gen.map(g => g[1]).join('/')).join(' || ');
console.log('NIGHTS ' + JSON.stringify(Object.fromEntries(Object.entries(seen).map(([k, v]) => [k, v.map(n => ({ year: n.year, gen: n.gen.length, pool: n.pool, shot: n.shot }))]))));
for (const w of [390, 1280]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: w === 390 ? 844 : 900 } });
  await ctx.route(/supabase\.co/, r => r.abort());
  const page = await ctx.newPage();
  try {
    await page.goto(`${BASE}/whats-new`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    const entry = page.getByText(/made up Ballon d'Or rivals stick around/).first();
    await entry.waitFor({ timeout: 30000 }); await entry.scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(OUT, `whatsnew-${w}.png`) });
    check(true, `whats-new ${w}: entry shown`);
  } catch (e) { check(false, `whats-new ${w}: ${String(e).slice(0, 200)}`); }
  await ctx.close();
}
await browser.close();
console.log(`rvwalk: ${checks} checks, ${failed} failed`);
process.exit(failed ? 1 : 0);
