/* Round 1523: the line under the Morale bar on the Soccer Career hub, in a real browser, against a served build.
 *
 * Run beside a served dist (BASE, default http://localhost:4173; scripts/lib/hostLikeServer.mjs or the runner's
 * #!serve). Supabase is blocked. A seeded career is played to a playing hub after two pro seasons, then saved at
 * several morales and opened at 390x844 (touch) and 1280x900:
 *   A) exactly one line under the Morale bar, its text the helper's for the save's own morale
 *      (careerForm.ts soccerMoraleLine), inside the viewport, no sideways scroll; and NO line on a hub whose next
 *      season a match fixing ban (two seasons left) or a prison term will skip.
 *   B) played like a player: the same save at morale 95, 81 and 40 with the page's Math.random seeded alike, Next
 *      Season pressed, the saved season row read back. The league games 95 and 40 played against 81 must fit what
 *      their lines said ("up to" the step, in its direction: the dressing room shares the three game cap).
 * Control PLAY_MORALE_LINE_CONTROL=gate opens the ban save as a plain one and expects a line there: it must fail.
 * Screenshots and a JSON of every check go to $RC_OUT (or a temp folder). Exit 1 on any failure; the last line says
 * green or red. Written after the review of 2026-10-21, which found the line's wiring guarded by nothing committed. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import pw from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || fs.mkdtempSync(path.join(os.tmpdir(), 'play-morale-out-'));
const CONTROL = process.env.PLAY_MORALE_LINE_CONTROL || '';
if (CONTROL && CONTROL !== 'gate') { console.log(`ABORT: unknown PLAY_MORALE_LINE_CONTROL ${CONTROL}`); process.exit(1); }
const KEY = 'soccerCareerSave';
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'play-morale-'));
const slash = p => p.split(path.sep).join('/');
fs.writeFileSync(path.join(TMP, 'entry.mjs'), `globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
export * from '${slash(path.join(ROOT, 'src/lib/soccerCareerEngine.ts'))}';
export { soccerMoraleLine, soccerMoraleStep } from '${slash(path.join(ROOT, 'src/lib/careerForm.ts'))}';
`);
await build({ entryPoints: [path.join(TMP, 'entry.mjs')], bundle: true, format: 'esm', platform: 'node', outfile: path.join(TMP, 'e.mjs'), logLevel: 'error', alias: { '@': path.join(ROOT, 'src') } });
const E = await import(pathToFileURL(path.join(TMP, 'e.mjs')).href);
let failures = 0;
const results = [], notes = [], errors = [];
const check = (ok, label) => { results.push({ ok: !!ok, label }); if (!ok) { failures += 1; console.log(`  FAIL ${label}`); } };
const mulberry = seed => () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
Math.random = mulberry(15231523);
const o = 72, stats = { pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o };
let c = E.initCareer('Morale Walk', 'England', 'CM', '2020-24', stats, o, 2020, E.FALLBACK_CLUBS, null);
for (let k = 0; k < 400 && !(c.phase === 'playing' && c.seasons.filter(r => r.type === 'playing').length >= 2); k += 1) {
  if (c.phase === 'youth') c = E.advanceYouthYear(c, E.FALLBACK_CLUBS);
  else if (c.phase === 'contract_offer') c = (c.pendingOffers || []).length ? E.acceptOffer(c, c.pendingOffers[0]) : { ...c, phase: 'playing' };
  else if (c.phase === 'random_events') c = c.pendingEvents?.[0] ? E.applyEventChoice(c, 0, E.FALLBACK_CLUBS) : { ...c, pendingEvents: [], phase: 'playing' };
  else if (c.phase === 'season_summary') c = E.dismissSummary(c, E.FALLBACK_CLUBS);
  else if (c.phase === 'newspaper') c = E.dismissNewspaper(c);
  else if (c.phase === 'playing') c = E.advanceProSeason(c, E.FALLBACK_CLUBS);
  else if (c.phase === 'transfer_window') c = E.stayAtClub(c, E.FALLBACK_CLUBS);
  else c = { ...c, phase: 'playing', pendingEvents: [] };
}
check(c.phase === 'playing', `the fixture reached a playing hub (phase ${c.phase})`);
const fixture = (m, extra = {}) => { const f = JSON.parse(JSON.stringify({ ...c, morale: m, ...extra })); delete f.chanceWheel; return f; };
const SEED_JS = `(() => { let s = 777; Math.random = () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();`;
const browser = await pw.chromium.launch({ headless: true });
const viewport = width => ({ viewport: { width, height: width < 1000 ? 844 : 900 }, hasTouch: width < 1000, isMobile: width < 1000, reducedMotion: 'reduce' });
async function open(ctx, save) {
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(String(e).slice(0, 200)));
  await page.goto(BASE + '/soccer-career', { waitUntil: 'domcontentloaded' });
  await page.evaluate(([k, v]) => { localStorage.clear(); localStorage.setItem('cookie-consent', 'essential'); localStorage.setItem('rules-gate-seen:/soccer-career', '1'); localStorage.setItem(k, v); }, [KEY, JSON.stringify(save)]);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('[data-career-action-bar]', { timeout: 20000 }).catch(() => {});
  return page;
}
try {
  for (const width of [390, 1280]) {
    const ctx = await browser.newContext(viewport(width));
    await ctx.route(/supabase\.co/, r => r.abort());
    for (const m of [100, 95, 89, 88, 81, 74, 73, 58, 40]) {
      const page = await open(ctx, fixture(m));
      const line = page.locator('[data-morale-line]'), n = await line.count();
      check(n === 1, `${width} morale ${m}: one morale line on the hub (found ${n})`);
      if (n === 1) {
        await line.scrollIntoViewIfNeeded();
        const text = (await line.innerText()).trim(), want = E.soccerMoraleLine(m), box = await line.boundingBox();
        const wide = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        check(text === want, `${width} morale ${m}: the line reads "${text}", the helper says "${want}"`);
        check(wide <= 0, `${width} morale ${m}: no sideways scroll (${wide}px)`);
        check(box && box.x >= 0 && box.x + box.width <= width + 1, `${width} morale ${m}: the line sits inside the viewport`);
        if (m === 95 || m === 40) await page.screenshot({ path: path.join(OUT, `hub-${width}-${m}.png`) });
      }
      await page.close();
    }
    /* seasons the press skips: two ban seasons left (one is served by this press, one is still to come), prison */
    for (const [tag, extra] of [['ban', { matchFixBanned: CONTROL === 'gate' ? 0 : 2 }], ['prison', { prisonSeasons: 1 }]]) {
      const page = await open(ctx, fixture(95, extra));
      const n = await page.locator('[data-morale-line]').count(), bar = await page.locator('text=Morale').count();
      check(bar > 0 && n === 0, `${width} ${tag}: no morale line before a season that is not played (found ${n}, Morale bar ${bar})`);
      await page.close();
    }
    await ctx.close();
    if (CONTROL) continue;
    const played = {};
    for (const m of [95, 81, 40]) {
      const pctx = await browser.newContext(viewport(width));
      await pctx.route(/supabase\.co/, r => r.abort());
      await pctx.addInitScript(SEED_JS);
      const save = fixture(m), page = await open(pctx, save), btn = page.getByRole('button', { name: /^Next Season/ }).first();
      check(await btn.count() > 0, `${width} play ${m}: a Next Season button`);
      if (await btn.count() > 0) {
        await btn.click();
        let row = null;
        for (let t = 0; t < 40 && !row; t += 1) {
          await page.waitForTimeout(500);
          row = await page.evaluate(([k, n]) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); if (!v || !Array.isArray(v.seasons) || v.seasons.length <= n) return null; const r = v.seasons[v.seasons.length - 1]; return { leagueApps: r.leagueApps ?? r.apps, rating: r.rating, type: r.type }; } catch (e) { return { err: String(e) }; } }, [KEY, save.seasons.length]);
        }
        check(row && !row.err && row.type === 'playing', `${width} play ${m}: the season was played and saved (${JSON.stringify(row)})`);
        played[m] = row;
      }
      await page.close(); await pctx.close();
    }
    if (played[95] && played[81] && played[40]) {
      for (const m of [95, 40]) {
        const moved = played[m].leagueApps - played[81].leagueApps, s = E.soccerMoraleStep(m);
        notes.push(`${width}: morale ${m} played ${played[m].leagueApps} league games against ${played[81].leagueApps} at 81, its line "${E.soccerMoraleLine(m)}"`);
        check(moved * s >= 0 && Math.abs(moved) <= Math.abs(s), `${width}: morale ${m} played ${moved} league games against 81, the line said up to ${s}`);
      }
    }
  }
} finally { await browser.close(); }
check(errors.length === 0, `no page errors (${errors.slice(0, 3).join(' | ')})`);
fs.writeFileSync(path.join(OUT, 'playSoccerMoraleLine.json'), JSON.stringify({ results, notes }, null, 1));
for (const nn of notes) console.log(`  ${nn}`);
console.log(`${results.length} checks${CONTROL ? ` (CONTROL ${CONTROL}: the ban save opened as a plain one)` : ''}`);
console.log(failures ? `playSoccerMoraleLine: RED, ${failures} failed` : 'playSoccerMoraleLine: green');
process.exit(failures ? 1 : 0);
