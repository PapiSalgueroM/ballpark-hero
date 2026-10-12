// Round 1304 fix pass walk (extra file, never committed; runs on a runner as .rc/x/walkEraWild.mjs).
// The out of work screen of a PAST SEASON career, through the real screens: who rings, what the card says,
// does taking the job move the manager, and what does a save from before the fix (a stale offer) do.
// The sack itself is doctored (sacked: true written into the game's own save from a page where the app does
// not run, the Round 196 rule): what is on trial is the screen after it, not the board's patience.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const { chromium } = pw;
const BASE = process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173';
const OUT = process.env.RC_OUT ?? os.tmpdir();
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const R = ROOT.replaceAll('\\', '/');
const KEY = 'dukb-club-manager-save';

/* The era's own leagues, read off the engine of this tree. */
const TAG = `${process.pid}-${Date.now()}`;
const ENTRY = path.join(os.tmpdir(), `wewEntry-${TAG}.mjs`);
const BUNDLE = path.join(os.tmpdir(), `wew-${TAG}.bundle.mjs`);
fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const engine = await import('${R}/src/lib/clubManager.ts');
export { engine };
`);
const { build } = await import('esbuild');
await build({ entryPoints: [ENTRY], bundle: true, format: 'esm', platform: 'node', outfile: BUNDLE, logLevel: 'error' });
const { engine: cm } = await import(pathToFileURL(BUNDLE).href);
fs.rmSync(ENTRY, { force: true });
fs.rmSync(BUNDLE, { force: true });
const TODAY = cm.REAL_LEAGUES.flatMap(l => l.clubs);

let failures = 0;
const say = (ok, what) => { console.log((ok ? '  PASS  ' : '  FAIL  ') + what); if (!ok) failures += 1; };
const readSave = page => page.evaluate(k => { try { return JSON.parse(localStorage.getItem(k) ?? 'null'); } catch { return null; } }, KEY);
const sideways = page => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
const report = [];
const browser = await chromium.launch();

const WALKS = [
  { eraId: 'era2010', tile: '2010-11', nation: 'England', league: 'Premier League', club: 'Blackpool', vw: 390, vh: 844, motion: 'reduce' },
  { eraId: 'era2005', tile: '2005-06', nation: 'Italy', league: 'Serie A', club: 'Juventus', vw: 1280, vh: 900, motion: 'no-preference' },
  { eraId: 'era2020', tile: '2020-21', nation: 'Spain', league: 'La Liga', club: 'Sevilla', vw: 390, vh: 844, motion: 'no-preference' },
];

/* Writes the sack into the game's own save from a page where the app does not run. `held`, when given, is the
   out of work screen of an old save: the offers it holds, two weeks in. */
async function doctor(ctx, held) {
  const helper = await ctx.newPage();
  await helper.goto(`${BASE}/robots.txt`, { waitUntil: 'domcontentloaded' });
  const ok = await helper.evaluate(([k, offers]) => {
    const raw = localStorage.getItem(k);
    if (!raw) return false;
    const c = JSON.parse(raw);
    c.sacked = true;
    if (offers) c.wilderness = { weeksOut: 2, formerClub: c.clubName, offers, seen: offers.map(o => o.club) };
    localStorage.setItem(k, JSON.stringify(c));
    return true;
  }, [KEY, held ?? null]);
  await helper.close();
  return ok;
}
async function open(ctx, errors) {
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(`${BASE}/club-manager`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1800);
  const resume = page.locator('button:has-text("Resume Career")');
  if (await resume.count()) { await resume.first().click(); await page.waitForTimeout(1500); }
  return page;
}
const offersOnScreen = page => page.evaluate(() => [...document.querySelectorAll('[data-wilderness-offer]')].map(el => ({
  club: el.getAttribute('data-wilderness-offer'),
  league: el.querySelector('span.shrink-0')?.textContent ?? '',
  text: el.textContent ?? '',
})));

for (const w of WALKS) {
  const label = `${w.tile} ${w.club} at ${w.vw}${w.motion === 'reduce' ? ' (reduced motion)' : ''}`;
  console.log(`== ${label}`);
  const leagues = cm.ERA_LEAGUES[w.eraId];
  const leagueOfClub = new Map(leagues.flatMap(l => l.clubs.map(c => [c, l.name])));
  const row = { label };
  const ctx = await browser.newContext({ viewport: { width: w.vw, height: w.vh }, reducedMotion: w.motion });
  await ctx.route(/supabase\.co/, r => r.abort());
  const errors = [];
  const shot = n => path.join(OUT, `wild-${w.eraId}-${w.vw}-${n}.png`);
  try {
    /* 1. a past season career through the real screens */
    let page = await ctx.newPage();
    page.on('pageerror', e => errors.push(String(e)));
    await page.goto(`${BASE}/club-manager`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(1500);
    const fresh = page.locator('text=Start Fresh');
    if (await fresh.count()) { await fresh.first().click(); await page.waitForTimeout(800); }
    await page.locator(`button:has-text("${w.tile}")`).first().click();
    await page.waitForTimeout(700);
    const nationTile = page.locator(`button:has-text("${w.nation}")`);
    if (await nationTile.count()) await nationTile.first().click(); else await page.locator(`text=${w.nation}`).first().click();
    await page.waitForTimeout(700);
    await page.locator(`button:has-text("${w.league}")`).first().click();
    await page.waitForTimeout(700);
    await page.locator(`button:has-text("${w.club}")`).first().click();
    await page.waitForTimeout(500);
    const essential = page.locator('button:has-text("Essential only")');
    if (await essential.count()) { await essential.first().click(); await page.waitForTimeout(400); }
    await page.locator('text=Take the job').first().click();
    const skip = page.locator('button:has-text("Skip: just manage")').first();
    await skip.waitFor({ timeout: 15000 }).then(() => skip.click()).catch(() => {});
    await page.waitForTimeout(2000);
    const started = await readSave(page);
    say(!!started && started.clubName === w.club && started.eraId === w.eraId, `${label}: the career is running (${started?.clubName}, ${started?.eraId})`);
    await page.close();

    /* 2. the sack, doctored */
    say(await doctor(ctx), `${label}: the save was doctored to a sacked manager`);
    page = await open(ctx, errors);
    say(await page.locator('[data-wilderness]').count() === 1, `${label}: the out of work panel is on the screen`);
    say(/Out of work/i.test(await page.locator('[data-wilderness]').innerText()), `${label}: it says he is out of work`);

    /* 3. wait for the phone: up to 20 weeks, stop at three offers */
    let waits = 0;
    let seen = [];
    while (waits < 20 && seen.length < 3) {
      await page.locator('[data-wait-week]').click();
      await page.waitForTimeout(350);
      waits += 1;
      seen = await offersOnScreen(page);
    }
    row.waits = waits; row.offers = seen;
    console.log(`   after ${waits} weeks: ${seen.map(o => `${o.club} (${o.league})`).join(', ') || 'nobody rang'}`);
    say(seen.length > 0, `${label}: a club rang (${seen.length} on the table)`);
    const strangers = seen.filter(o => !leagueOfClub.has(o.club));
    say(strangers.length === 0, `${label}: every club that rang is a club of ${w.tile} (${strangers.map(o => `${o.club} of ${o.league}`).join(', ') || 'none of today'})`);
    const wrongLeague = seen.filter(o => leagueOfClub.has(o.club) && o.league !== leagueOfClub.get(o.club));
    say(wrongLeague.length === 0, `${label}: every card prints that season's league (${wrongLeague.map(o => `${o.club} as ${o.league}`).join(', ') || 'all of them'})`);
    say(!seen.some(o => o.club === w.club), `${label}: the club that sacked him did not ring`);
    const panel = page.locator('[data-wilderness]');
    await panel.evaluate(el => el.scrollIntoView({ block: 'start' }));
    await page.waitForTimeout(400);
    await page.screenshot({ path: shot('1-offers') });
    say((await sideways(page)) <= 0, `${label}: the out of work screen does not scroll sideways`);
    const cut = await page.evaluate(() => [...document.querySelectorAll('[data-wilderness-offer] button')].filter(b => b.scrollWidth > b.clientWidth + 1).map(b => b.textContent));
    say(cut.length === 0, `${label}: no "Take the job" button is cut short (${cut.join(' | ') || 'none'})`);

    /* 4. take the newest job */
    if (seen.length) {
      const target = seen[seen.length - 1].club;
      await page.locator(`[data-wilderness-offer="${target}"] button`).click();
      await page.waitForTimeout(2200);
      const after = await readSave(page);
      row.took = target; row.now = after?.clubName;
      say(!!after && after.clubName === target && !after.sacked && !after.wilderness, `${label}: "Take the ${target} job" put him at ${target} (the save reads ${after?.clubName}, sacked ${after?.sacked}, season ${after?.season})`);
      say(!!after && !!leagueOfClub.get(after.clubName), `${label}: his new club is a club of ${w.tile}`);
      const body = await page.locator('body').innerText();
      say(body.includes(target) && !/You've been sacked/.test(body), `${label}: the hub shows ${target} and the sacked screen is gone`);
      await page.screenshot({ path: shot('2-newclub') });
    }
    await page.close();

    /* 5. a save from before the fix: one offer from a club of today, one from a club of that season */
    const stale = TODAY.find(c => !leagueOfClub.has(c));
    const former = row.now ?? w.club;
    const kept = leagues[1].clubs.find(c => c !== w.club && c !== former);
    const card = (club, league) => ({ club, country: '', tier: 3, league, brief: 'Stay up. That is the whole brief.', reason: 'Nobody else was interested at the money they are offering.', budget: 10, keenness: 40 });
    say(await doctor(ctx, [card(stale, cm.leagueOf(stale).name), card(kept, leagues[1].name)]), `${label}: an old save's out of work screen was written, holding ${stale} (today) and ${kept} (that season)`);
    page = await open(ctx, errors);
    const held = await offersOnScreen(page);
    say(held.some(o => o.club === stale) && held.some(o => o.club === kept), `${label}: the old save opens showing both offers (${held.map(o => o.club).join(', ')})`);
    await page.locator('[data-wilderness]').evaluate(el => el.scrollIntoView({ block: 'start' }));
    await page.screenshot({ path: shot('3-oldsave') });
    await page.locator(`[data-wilderness-offer="${stale}"] button`).click();
    await page.waitForTimeout(1500);
    const still = await readSave(page);
    say(await page.locator('[data-wilderness]').count() === 1 && !!still && still.clubName === former && still.sacked === true, `${label}: taking the ${stale} job did nothing (still out of work, the save reads ${still?.clubName}, sacked ${still?.sacked})`);
    await page.locator('[data-wait-week]').click();
    await page.waitForTimeout(500);
    const later = await offersOnScreen(page);
    row.oldSave = { stale, kept, afterAWeek: later.map(o => o.club) };
    say(!later.some(o => o.club === stale), `${label}: a week later the ${stale} offer is gone (${later.map(o => o.club).join(', ') || 'none left'})`);
    say(later.some(o => o.club === kept), `${label}: and the ${kept} offer is still there`);
    say(later.every(o => leagueOfClub.has(o.club)), `${label}: everything on the table is a club of ${w.tile}`);
    await page.locator('[data-wilderness]').evaluate(el => el.scrollIntoView({ block: 'start' }));
    await page.screenshot({ path: shot('4-oldsave-week') });
    const real = errors.filter(e => !/supabase|Failed to fetch|CORS/i.test(e));
    say(real.length === 0, `${label}: no page error (${real[0] ?? 'clean'})`);
  } catch (e) {
    say(false, `${label}: the walk threw: ${String(e).slice(0, 300)}`);
    for (const p of ctx.pages()) await p.screenshot({ path: shot('error') }).catch(() => {});
  }
  report.push(row);
  await ctx.close();
}
await browser.close();
fs.writeFileSync(path.join(OUT, 'walkEraWild-report.json'), JSON.stringify(report, null, 2));
console.log(failures ? `walkEraWild: ${failures} failure(s).` : 'walkEraWild: green. A manager sacked in a past season is rung by that season, and the job he takes is the job he gets.');
process.exit(failures ? 1 : 0);
