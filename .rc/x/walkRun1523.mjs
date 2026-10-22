/* Reviewer walk for Round 1523 (run lens), not committed. Against the served build at BASE, Supabase blocked.
   A: the hub line under the Morale bar for eight saves (morale 100, 95, 89, 88, 81, 74, 73, 58, 40, a warm phone with
      95 and a cold one with 40) at 390x844 (touch) and 1280x900, reduced motion on and off for two of them: the text
      against the helper, the place, no sideways scroll, a viewport screenshot (not a strip) of each.
   B: PLAY it: one save at morale 95 and the same save at 81, Math.random seeded identically in the page, press Next
      Season like a player, read the season row the app saved: the league games must differ by what the line said.
   Screenshots and walk.json go to $RC_OUT. Last line: walkRun1523: green|RED. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import pw from 'playwright';

const ROOT = process.cwd();
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || fs.mkdtempSync(path.join(os.tmpdir(), 'walkrun-out-'));
const KEY = 'soccerCareerSave';
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'walkrun-'));
const slash = p => p.split(path.sep).join('/');
fs.writeFileSync(path.join(TMP, 'entry.mjs'), `globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
export * from '${slash(path.join(ROOT, 'src/lib/soccerCareerEngine.ts'))}';
export { soccerMoraleLine, dressingRoomApps, soccerMoraleStep } from '${slash(path.join(ROOT, 'src/lib/careerForm.ts'))}';
export { phoneAppsSwing } from '${slash(path.join(ROOT, 'src/lib/soccerPhone.ts'))}';
`);
await build({ entryPoints: [path.join(TMP, 'entry.mjs')], bundle: true, format: 'esm', platform: 'node', outfile: path.join(TMP, 'e.mjs'), logLevel: 'error', alias: { '@': path.join(ROOT, 'src') } });
const E = await import(pathToFileURL(path.join(TMP, 'e.mjs')).href);
let failures = 0;
const results = [], notes = [];
const check = (ok, label) => { results.push({ ok: !!ok, label }); if (!ok) { failures += 1; console.log(`  FAIL ${label}`); } };
let s = 15231523;
Math.random = () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const o = 72, stats = { pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o };
let c = E.initCareer('Walk Tester', 'England', 'CM', '2020-24', stats, o, 2020, E.FALLBACK_CLUBS, null);
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
const withPhone = (f, rel) => { if (f.phone && Array.isArray(f.phone.threads) && f.phone.threads.length) f.phone.threads = f.phone.threads.map(t => ({ ...t, rel })); return f; };
const fixture = (m, rel = null) => { const f = JSON.parse(JSON.stringify({ ...c, morale: m })); delete f.chanceWheel; return rel === null ? f : withPhone(f, rel); };
const SEED_JS = `(() => { let s = 777; Math.random = () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();`;
const browser = await pw.chromium.launch({ headless: true });
const errors = [], rows = [];
async function open(ctx, save) {
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(String(e).slice(0, 200)));
  await page.goto(BASE + '/soccer-career', { waitUntil: 'domcontentloaded' });
  await page.evaluate(([k, v]) => { localStorage.clear(); localStorage.setItem('cookie-consent', 'essential'); localStorage.setItem('rules-gate-seen:/soccer-career', '1'); localStorage.setItem(k, v); }, [KEY, JSON.stringify(save)]);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('[data-career-action-bar]', { timeout: 20000 }).catch(() => {});
  return page;
}
const VARIANTS = [[100], [95], [89], [88], [81], [74], [73], [58], [40], [95, 90], [40, 15]];
try {
  /* A: the line, everywhere */
  for (const width of [390, 1280]) {
    for (const motion of ['reduce', 'no-preference']) {
      const touch = width < 1000;
      const ctx = await browser.newContext({ viewport: { width, height: touch ? 844 : 900 }, hasTouch: touch, isMobile: touch, reducedMotion: motion });
      await ctx.route(/supabase\.co/, r => r.abort());
      const list = motion === 'reduce' ? VARIANTS : [[95], [40, 15]];
      for (const [m, rel] of list) {
        const save = fixture(m, rel ?? null);
        const page = await open(ctx, save);
        const tag = `${width}-${motion === 'reduce' ? 'rm' : 'mo'}-${m}${rel ? `-p${rel}` : ''}`;
        const line = page.locator('[data-morale-line]');
        const n = await line.count();
        check(n === 1, `${tag}: one morale line (found ${n})`);
        if (n === 1) {
          await line.scrollIntoViewIfNeeded();
          const text = (await line.innerText()).trim();
          const want = E.soccerMoraleLine(m, E.phoneAppsSwing(save));
          check(text === want, `${tag}: the line reads "${text}", the helper "${want}"`);
          const box = await line.boundingBox();
          const wide = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
          const style = await line.evaluate(el => { const cs = getComputedStyle(el); return { fontSize: cs.fontSize, color: cs.color, lines: Math.round(el.getBoundingClientRect().height / parseFloat(cs.lineHeight || '15')) }; });
          check(wide <= 0, `${tag}: no sideways scroll (${wide}px)`);
          check(box && box.x >= 0 && box.x + box.width <= width + 1, `${tag}: inside the viewport`);
          rows.push({ tag, text, want, box, wide, style, phone: E.phoneAppsSwing(save) });
          await page.screenshot({ path: path.join(OUT, `hub-${tag}.png`) });
        }
        await page.close();
      }
      await ctx.close();
    }
  }
  /* B: play it */
  for (const width of [390, 1280]) {
    const touch = width < 1000;
    const played = {};
    for (const m of [95, 81, 40]) {
      const ctx = await browser.newContext({ viewport: { width, height: touch ? 844 : 900 }, hasTouch: touch, isMobile: touch, reducedMotion: 'reduce' });
      await ctx.route(/supabase\.co/, r => r.abort());
      await ctx.addInitScript(SEED_JS);
      const save = fixture(m);
      const page = await open(ctx, save);
      const before = save.seasons.length;
      const btn = page.getByRole('button', { name: /^Next Season/ }).first();
      const okBtn = await btn.count();
      check(okBtn > 0, `${width} play ${m}: a Next Season button`);
      if (okBtn) {
        await btn.click();
        let row = null;
        for (let t = 0; t < 40 && !row; t += 1) {
          await page.waitForTimeout(500);
          row = await page.evaluate(([k, n]) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); if (!v || !Array.isArray(v.seasons) || v.seasons.length <= n) return null; const r = v.seasons[v.seasons.length - 1]; return { leagueApps: r.leagueApps ?? r.apps, apps: r.apps, rating: r.rating, year: r.year, morale: v.morale, phase: v.phase }; } catch (e) { return { err: String(e) }; } }, [KEY, before]);
        }
        check(row && !row.err, `${width} play ${m}: the season was played and saved (${JSON.stringify(row)})`);
        played[m] = row;
        await page.waitForTimeout(800);
        await page.screenshot({ path: path.join(OUT, `played-${width}-${m}.png`) });
      }
      await page.close(); await ctx.close();
    }
    if (played[95] && played[81] && played[40]) {
      const up = played[95].leagueApps - played[81].leagueApps, down = played[40].leagueApps - played[81].leagueApps;
      const wantUp = E.dressingRoomApps(E.phoneAppsSwing(fixture(95)), 95) - E.phoneAppsSwing(fixture(95));
      const wantDown = E.dressingRoomApps(E.phoneAppsSwing(fixture(40)), 40) - E.phoneAppsSwing(fixture(40));
      notes.push(`${width}: league games 95 ${played[95].leagueApps}, 81 ${played[81].leagueApps}, 40 ${played[40].leagueApps}; ratings ${played[95].rating}, ${played[81].rating}, ${played[40].rating}; hub said ${wantUp} and ${wantDown} (phone on the hub ${E.phoneAppsSwing(fixture(81))})`);
      check(up === wantUp, `${width}: morale 95 played ${up} league games over 81, the line said ${wantUp}`);
      check(down === wantDown, `${width}: morale 40 played ${down} league games against 81, the line said ${wantDown}`);
    }
  }
} finally { await browser.close(); }
check(errors.length === 0, `no page errors (${errors.slice(0, 3).join(' | ')})`);
fs.writeFileSync(path.join(OUT, 'walk.json'), JSON.stringify({ rows, results, notes }, null, 1));
for (const r of rows) console.log(`  ${r.tag}: "${r.text}" phone ${r.phone} box ${r.box ? `${Math.round(r.box.x)},${Math.round(r.box.y)} ${Math.round(r.box.width)}x${Math.round(r.box.height)}` : '-'} font ${r.style.fontSize}`);
for (const nn of notes) console.log(`  ${nn}`);
console.log(`${results.length} checks`);
console.log(failures ? `walkRun1523: RED, ${failures} failed` : 'walkRun1523: green');
process.exit(failures ? 1 : 0);
