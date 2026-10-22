/* Review run 1525 (runner only, #!serve #!playwright): play Soccer Career's season awards the way a player would.
   A strong striker save is made with this branch's engine (2010s, a top club), seeded into localStorage, and played
   for several seasons through the real page at 390x844 and 1280x900, reduced motion on and off. The recorded Round
   1100 save (an old save) is played too. The What's New entry is read at both widths. Supabase is blocked. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const ROOT = process.cwd();
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || path.join(ROOT, '.tmp-fx/walk1525');
fs.mkdirSync(OUT, { recursive: true });
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'walk1525-'));
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const DASH = new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`);
let checks = 0, failed = 0;
const notes = [];
const check = (ok, label) => { checks += 1; console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}`); if (!ok) failed += 1; };

/* 1. The strong striker save, made by this branch's engine. */
const entry = path.join(TMP, 'entry.ts');
fs.writeFileSync(entry, `export * as E from '${path.join(ROOT, 'src/lib/soccerCareerEngine').split(path.sep).join('/')}';\nexport * as A from '${path.join(ROOT, 'src/lib/soccerCareerAttributes').split(path.sep).join('/')}';\n`);
await build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: path.join(TMP, 'eng.mjs'), logLevel: 'error', alias: { '@': path.join(ROOT, 'src') }, absWorkingDir: ROOT });
const S = await import(pathToFileURL(path.join(TMP, 'eng.mjs')).href);
const { careerStep } = await import(pathToFileURL(path.join(ROOT, 'scripts/lib/careerStep.mjs')).href);
const mulberry = seed => { let s = seed | 0; return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
function makeSave(pos, era, start, ovr, name, seed, wantYear) {
  Math.random = mulberry(seed);
  const off = S.A.POSITION_OFFSETS[pos];
  const stats = Object.fromEntries(['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical', 'reflexes'].map((k, j) => [k, Math.max(25, Math.min(99, ovr + off[j]))]));
  let c = S.E.initCareer(name, 'England', pos, era, stats, ovr, start, S.E.FALLBACK_CLUBS, null, 94);
  for (let k = 0; k < 600; k += 1) {
    const yr = c.seasons.at(-1)?.year ?? 0;
    if (c.phase === 'playing' && c.currentClubTier <= 2 && yr >= wantYear) break;
    c = c.phase === 'retirement_suggestion' ? S.E.declineRetirementSuggestion(c, S.E.FALLBACK_CLUBS) : careerStep(S.E, c, S.E.FALLBACK_CLUBS);
  }
  return JSON.parse(JSON.stringify(c));
}
const striker = makeSave('ST', '2010-14', 2010, 80, 'Walk Striker', 1525, 2012);
const keeper = makeSave('GK', '2000-04', 2000, 78, 'Walk Keeper', 2004, 2001);
notes.push(`striker save: phase ${striker.phase}, ${striker.currentClub} tier ${striker.currentClubTier}, overall ${striker.overall}, last season ${striker.seasons.at(-1)?.year}, awards ${striker.awards.length}`);
notes.push(`keeper save: phase ${keeper.phase}, ${keeper.currentClub} tier ${keeper.currentClubTier}, overall ${keeper.overall}, last season ${keeper.seasons.at(-1)?.year}`);
const recorded = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/careerLeagueWorldSaves1100.json'), 'utf8')).saves.find(s => s.id === 'ere').state;

const ACTIONS = ['Sign contract', 'Review contract', 'Leave on free transfer', 'Join Club', 'Request transfer', '💪 Not Done Yet', '😭 Cry through', 'Next Year', 'Next Season', 'Continue', 'Sign Contract', 'Accept', 'Confirm', 'Proceed', 'Next', 'Done', 'Close'];
const SKIP = /Retire|New Career|Report a problem|Light mode|Sound: |Cookie|Sign up|^Back$|Full attributes|Essential only|^Accept$|^⏸$|^🏋️$|^📱|Week by week/;
async function stepOnce(page) {
  return page.evaluate(async ([actions, skipSrc]) => {
    const skip = new RegExp(skipSrc);
    const save = () => { try { return JSON.parse(localStorage.getItem('soccerCareerSave') || '{}'); } catch { return {}; } };
    const before = save();
    const usable = [...document.querySelectorAll('button')].filter(b => !b.disabled && b.textContent.trim() && !skip.test(b.textContent.trim()) && b.getAttribute('aria-label') !== 'Week by week: watch your season match by match');
    let pick = null;
    for (const a of actions) { pick = usable.find(b => b.textContent.trim().startsWith(a)); if (pick) break; }
    if (!pick) pick = usable[0];
    if (!pick) return { phase: before.phase, action: 'STUCK' };
    const label = pick.textContent.trim().slice(0, 34);
    pick.click();
    await new Promise(r => setTimeout(r, 650));
    return { phase: before.phase, action: label };
  }, [ACTIONS, SKIP.source]);
}
const readSave = page => page.evaluate(() => { try { return JSON.parse(localStorage.getItem('soccerCareerSave') || 'null'); } catch { return null; } });
const overflow = page => page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);

const SEASON_EVENT = /Golden Boot|Golden Glove|Puskás|Player of the Year|Fair Play Award|Comeback Player/;
async function journey(browser, save, tag, width, height, motion, seasonsWanted, shoot) {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion: motion });
  const label = `${tag}-${width}-${motion === 'reduce' ? 'rm' : 'motion'}`;
  try {
    await context.addInitScript(serialized => {
      if (!sessionStorage.getItem('walk1525')) {
        sessionStorage.setItem('walk1525', '1');
        localStorage.setItem('cookie-consent', 'essential');
        localStorage.setItem('soccerCareerSave', serialized);
      }
    }, JSON.stringify(save));
    await context.route(/supabase\.co/, route => route.abort());
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(String(e).slice(0, 200)));
    await page.goto(`${BASE}/soccer-career`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.getByRole('button', { name: /Next Season|Next Year|Continue/ }).first().waitFor({ timeout: 45000 });
    if (shoot) await page.screenshot({ path: path.join(OUT, `${label}-0-start.png`) });
    const start = await readSave(page);
    const startSeasons = start?.seasons?.length ?? 0;
    const startAwards = start?.awards?.length ?? 0;
    let shots = 0, lastPhase = start?.phase, stuck = 0, steps = 0, summaries = 0;
    for (; steps < 140; steps += 1) {
      const sv = await readSave(page);
      if (!sv) break;
      if (sv.seasons.length - startSeasons >= seasonsWanted && sv.phase === 'playing') break;
      if (sv.phase !== lastPhase) {
        lastPhase = sv.phase;
        if (sv.phase === 'season_summary') {
          summaries += 1;
          const text = await page.locator('body').innerText();
          const lines = text.split('\n').filter(l => SEASON_EVENT.test(l)).slice(0, 6);
          notes.push(`${label}: summary ${summaries} (${sv.seasons.at(-1)?.year}, ${sv.seasons.at(-1)?.goals} goals, ${sv.seasons.at(-1)?.cleanSheets} clean sheets, rating ${sv.seasons.at(-1)?.rating}, tier ${sv.seasons.at(-1)?.clubTier}) award lines: ${lines.join(' / ') || 'none'}`);
          if (shoot && shots < 3) { shots += 1; await page.screenshot({ path: path.join(OUT, `${label}-${shots}-summary.png`) }); }
          check(!(await overflow(page)), `${label}: season summary ${summaries} has no horizontal overflow`);
        }
      }
      const r = await stepOnce(page);
      if (r.action === 'STUCK') { stuck += 1; if (stuck > 3) break; }
    }
    const end = await readSave(page);
    const gained = (end?.awards ?? []).slice(startAwards);
    notes.push(`${label}: ${steps} steps, ${(end?.seasons?.length ?? 0) - startSeasons} seasons, phase ${end?.phase}, awards gained: ${gained.map(a => `${a.name} ${a.year}`).join(', ') || 'none'}`);
    const W = { 'Golden Glove': [2004, 9999], 'UEFA Player of the Year': [2010, 2022], 'Puskás Award': [2008, 9999] };
    check(gained.every(a => !W[a.name] || (a.year >= W[a.name][0] && a.year <= W[a.name][1])), `${label}: every named award gained sits inside its years`);
    check((end?.seasons?.length ?? 0) - startSeasons >= 1, `${label}: at least one season was played through the page`);
    /* The cabinet, where the season awards are counted. */
    const cab = page.getByText('Trophy Cabinet', { exact: true }).first();
    if (await cab.count()) {
      await cab.scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);
      if (shoot) await page.screenshot({ path: path.join(OUT, `${label}-9-cabinet.png`) });
    } else notes.push(`${label}: no Trophy Cabinet heading on the final screen (phase ${end?.phase})`);
    check(errors.length === 0, `${label}: no page errors${errors.length ? `: ${errors.slice(0, 3).join(' | ')}` : ''}`);
    check(!(await overflow(page)), `${label}: no horizontal overflow at the end`);
  } catch (e) { check(false, `${label}: journey threw ${String(e.stack || e).slice(0, 300)}`); }
  finally { await context.close(); }
}

const browser = await pw.chromium.launch({ args: ['--no-sandbox', '--no-proxy-server'] });
try {
  for (const [w, h] of [[390, 844], [1280, 900]]) {
    for (const motion of ['reduce', 'no-preference']) await journey(browser, striker, 'striker', w, h, motion, 4, true);
    await journey(browser, keeper, 'keeper', w, h, 'reduce', 4, w === 390);
    await journey(browser, recorded, 'old1100', w, h, 'no-preference', 2, w === 390);
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: 'reduce' });
    await ctx.addInitScript(() => localStorage.setItem('cookie-consent', 'essential'));
    await ctx.route(/supabase\.co/, route => route.abort());
    const page = await ctx.newPage();
    await page.goto(`${BASE}/whats-new`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    const li = page.locator('li', { hasText: 'season awards you have to beat somebody for' }).first();
    await li.waitFor({ timeout: 30000 });
    await li.scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(OUT, `whatsnew-${w}.png`) });
    const text = await li.innerText();
    check(!DASH.test(text), `whats-new ${w}: the new entry holds no em or en dash`);
    check(!(await overflow(page)), `whats-new ${w}: no horizontal overflow`);
    if (w === 390) notes.push(`whats-new entry: ${text}`);
    await ctx.close();
  }
} finally { await browser.close(); }
for (const n of notes) console.log(`NOTE ${n}`);
console.log(`walk1525: ${checks} checks, ${failed} failed`);
process.exit(failed ? 1 : 0);
