/* Reviewer (run lens), Round 1319: PLAY IT. This round has no screen, but two of its lines run in the product:
   the loader's settle and the guard. Walk the four US careers at the showcase, served build, live host blocked:
     plain   an ordinary showcase: the card, "Go all out", the save equals the engine's scouts' button.
     opened  a save carrying an opened attempt (what Round B's run button writes first): the page must land on
             the scouts' line for that approach, write nothing on load or reload, and "Draft day" must save
             preDraftRunDraft of the settled state.
     played  a save Round B's resolve would write (played scores, drill "Burst test and Agility run"): the card
             must render it and "Draft day" must keep it.
   At 390x844 touch (motion on, and reduced) and 1280x900. Pictures into RC_OUT. No page error, no failed local
   request. Usage (runner, #!serve): node .rc/x/rvwalk.mjs */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
const ROOT = process.cwd();
const { chromium } = await import(pathToFileURL(path.join(ROOT, 'scripts/lib/playwrightLoader.mjs')).href);
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || path.join(os.tmpdir(), 'rvwalk');
fs.mkdirSync(OUT, { recursive: true });
const bundle = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'rvwalk-')), 'engine.cjs');
await build({
  stdin: { contents: `
    import { NFL_CAREER_SPORT } from '@/lib/nflCareerSport';
    import { NBA_CAREER_SPORT } from '@/lib/nbaCareerSport';
    import { MLB_CAREER_SPORT } from '@/lib/mlbCareerSport';
    import { NHL_CAREER_SPORT } from '@/lib/nhlCareerSport';
    export const sports = [NFL_CAREER_SPORT, NBA_CAREER_SPORT, MLB_CAREER_SPORT, NHL_CAREER_SPORT];
    export * from '@/lib/careerPreDraft';
    export { createUsCareerProspect } from '@/lib/usCareerProspect';
    export { defaultAppearance } from '@/lib/soccerCareerAppearance';
  `, resolveDir: ROOT, sourcefile: 'rvwalk-engine.ts', loader: 'ts' },
  outfile: bundle, bundle: true, platform: 'node', format: 'cjs', logLevel: 'silent', alias: { '@': path.join(ROOT, 'src') },
});
if (/supabase\.co/.test(fs.readFileSync(bundle, 'utf-8'))) { console.error('engine bundle reaches the live host, refusing'); process.exit(2); }
const M = createRequire(import.meta.url)(bundle);
const J = x => JSON.stringify(x);
const sign = n => (n > 0 ? `+${n}` : `${n}`);
const failures = [];
const fail = (id, m) => { failures.push(`${id}: ${m}`); console.error(`  FAIL ${id}: ${m}`); };

function atShowcase(sport) {
  const pos = sport.create.defaultPos;
  const made = M.createUsCareerProspect(sport, { name: 'Walk Prospect', pos, archetypeId: sport.create.archetypes[pos][0].id, eraId: 'now', appearance: M.defaultAppearance(), seed: `${sport.slug}:rvwalk` });
  const desc = sport.preDraft(made.eraId);
  let state = M.preDraftStart(desc, { ...made, routeId: desc.routes[0].id });
  for (let n = 0; n < 12 && state.phase !== 'showcase'; n += 1) state = state.phase === 'season' ? M.preDraftPlaySeason(desc, state) : M.preDraftChoose(desc, state, 0);
  if (state.phase !== 'showcase') throw new Error(`${sport.slug}: never reached the showcase`);
  return { made, desc, state };
}
const lineOf = s => `${s.showcase.drill}: grade ${s.showcase.grade}. Draft stock ${sign(s.showcase.stockDelta)}, now ${s.stock}.`;

const browser = await chromium.launch();
async function open(sport, size, reduced, prospect) {
  const route = `/${sport.gameSlug}`;
  const context = await browser.newContext({
    viewport: { width: size.width, height: size.height }, isMobile: !!size.touch, hasTouch: !!size.touch, deviceScaleFactor: 1,
    reducedMotion: reduced ? 'reduce' : 'no-preference', serviceWorkers: 'block',
    storageState: { cookies: [], origins: [{ origin: BASE, localStorage: [
      { name: sport.saveKey, value: J({ c: null, phase: 'prospect', teamQuality: null, coach: null, prospect }) },
      { name: `rules-gate-seen:${route}`, value: '1' }, { name: 'cookie-consent', value: 'essential' },
    ] }] },
  });
  const errors = [];
  await context.route('**/*', r => {
    const url = r.request().url();
    if (/supabase\.co/.test(url)) return r.abort();
    if (new URL(url).origin === BASE) return r.continue();
    if (/^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(url)) return r.continue();
    const type = r.request().resourceType();
    return r.fulfill({ status: 200, contentType: type === 'stylesheet' ? 'text/css' : 'application/json', body: type === 'stylesheet' ? '' : '[]' });
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on('pageerror', e => errors.push(`pageerror ${e.message}`));
  page.on('requestfailed', q => { if (q.url().startsWith(BASE)) errors.push(`requestfailed ${q.url()} ${q.failure()?.errorText}`); });
  await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
  return { context, page, errors, route };
}
const saved = (page, sport) => page.evaluate(k => localStorage.getItem(k), sport.saveKey);
const shot = async (page, name) => { await page.waitForTimeout(400); await page.locator('[data-prospect-journey]').scrollIntoViewIfNeeded(); await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: false }); };
const cardOverflow = page => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);

const SIZES = [{ id: '390', width: 390, height: 844, touch: true, reduced: false }, { id: '390rm', width: 390, height: 844, touch: true, reduced: true }, { id: '1280', width: 1280, height: 900, touch: false, reduced: false }];
const results = [];
for (const sport of M.sports) for (const size of SIZES) {
  const { made, desc, state } = atShowcase(sport);
  /* plain: the scouts' button, as today */
  {
    const id = `plain-${sport.slug}-${size.id}`;
    const { context, page, errors } = await open(sport, size, size.reduced, { ...made, state });
    try {
      await page.locator('[data-prospect-phase="showcase"]').waitFor();
      await shot(page, `${id}-before`);
      await page.getByRole('button', { name: /^Go all out/ }).click();
      await page.locator('[data-prospect-phase="draft"]').waitFor();
      const want = M.preDraftShowcase(desc, state, 'allout');
      const got = JSON.parse(await saved(page, sport)).prospect.state;
      if (J(got) !== J(want)) fail(id, 'the save after "Go all out" is not the engine\'s scouts button');
      if ('combine' in got || 'played' in (got.showcase || {})) fail(id, 'a new key on a scouts save');
      const line = (await page.locator('[data-testid="showcase-result"]').innerText()).trim();
      if (line !== lineOf(want)) fail(id, `card says "${line}", engine "${lineOf(want)}"`);
      if (await cardOverflow(page)) fail(id, 'page wider than the viewport');
      await shot(page, `${id}-after`);
      results.push(`${id}: ok "${line}"`);
    } catch (e) { fail(id, `threw ${e.message.split('\n')[0]}`); }
    for (const e of errors) fail(id, e);
    await context.close();
  }
  /* opened: an attempt on the save, never resolved; the loader settles it to the scouts' button */
  for (const approach of ['steady', 'allout']) {
    if (size.id === '1280' && approach === 'steady') continue;
    const id = `opened-${approach}-${sport.slug}-${size.id}`;
    const opened = M.preDraftCombineOpen(desc, state, approach);
    if (!opened.combine) { fail(id, 'the engine would not open an attempt'); continue; }
    const want = M.preDraftShowcase(desc, state, approach);
    const { context, page, errors } = await open(sport, size, size.reduced, { ...made, state: opened });
    try {
      const seeded = await saved(page, sport);
      await page.locator('[data-prospect-phase="draft"]').waitFor();
      const line = (await page.locator('[data-testid="showcase-result"]').innerText()).trim();
      if (line !== lineOf(want)) fail(id, `card says "${line}", the scouts' button "${lineOf(want)}"`);
      const buttons = await page.getByRole('button', { name: /^(Go all out|Play it safe|Skip it)/ }).count();
      if (buttons) fail(id, `${buttons} approach buttons still on screen`);
      await page.waitForTimeout(600);
      if (await saved(page, sport) !== seeded) fail(id, 'the load wrote the save');
      await shot(page, `${id}-loaded`);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.locator('[data-prospect-phase="draft"]').waitFor();
      const line2 = (await page.locator('[data-testid="showcase-result"]').innerText()).trim();
      if (line2 !== line) fail(id, `a reload moved the line to "${line2}"`);
      if (await saved(page, sport) !== seeded) fail(id, 'the reload wrote the save');
      await page.getByRole('button', { name: /^Draft day/ }).click();
      await page.waitForFunction(([k, s]) => localStorage.getItem(k) !== s, [sport.saveKey, seeded]);
      const after = JSON.parse(await saved(page, sport)).prospect.state;
      const draft = M.preDraftRunDraft(desc, want);
      if (J(after) !== J(draft)) fail(id, `"Draft day" saved ${after.phase} ${J(after.draft?.pick)} ${'combine' in after ? 'WITH combine' : ''}, engine ${draft.phase} ${J(draft.draft?.pick)}`);
      await page.locator('[data-prospect-phase="done"]').waitFor({ timeout: 30000 });
      if (await cardOverflow(page)) fail(id, 'page wider than the viewport');
      await shot(page, `${id}-done`);
      results.push(`${id}: ok "${line}", draft ${J(after.draft?.pick)}`);
    } catch (e) { fail(id, `threw ${e.message.split('\n')[0]}`); }
    for (const e of errors) fail(id, e);
    await context.close();
  }
  /* played: what Round B's resolve writes; this round's card must render it and keep it through the draft */
  if (size.id !== '390rm') {
    const id = `played-${sport.slug}-${size.id}`;
    const n = M.preDraftStations(desc, state).length;
    const played = M.preDraftCombineResolve(desc, M.preDraftCombineOpen(desc, state, 'allout'), n === 2 ? [70, 40] : [70]);
    const { context, page, errors } = await open(sport, size, size.reduced, { ...made, state: played });
    try {
      await page.locator('[data-prospect-phase="draft"]').waitFor();
      const line = (await page.locator('[data-testid="showcase-result"]').innerText()).trim();
      if (line !== lineOf(played)) fail(id, `card says "${line}", engine "${lineOf(played)}"`);
      await shot(page, `${id}-loaded`);
      const seeded = await saved(page, sport);
      await page.getByRole('button', { name: /^Draft day/ }).click();
      await page.waitForFunction(([k, s]) => localStorage.getItem(k) !== s, [sport.saveKey, seeded]);
      const after = JSON.parse(await saved(page, sport)).prospect.state;
      if (J(after) !== J(M.preDraftRunDraft(desc, played))) fail(id, 'the draft after a played showcase is not the engine\'s');
      if (J(after.showcase.played) !== J(played.showcase.played)) fail(id, 'the played scores were lost');
      results.push(`${id}: ok "${line}"`);
    } catch (e) { fail(id, `threw ${e.message.split('\n')[0]}`); }
    for (const e of errors) fail(id, e);
    await context.close();
  }
}
await browser.close();
for (const r of results) console.log('  ' + r);
console.log(`RVWALK ${failures.length ? 'RED' : 'GREEN'}: ${results.length} cases passed, ${failures.length} failures`);
process.exit(failures.length ? 1 : 0);
