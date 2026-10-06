/* Round 993: play the built prospect journey with native touch and keyboard.
   Expected transitions come from the pure engine before each click, never
   from a copy of the candidate's resulting save. All transport is loopback. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { chromium } from '../lib/playwrightLoader.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CONTROL = process.env.CAREER993_CONTROL || '';
assert(!CONTROL || ['reveal', 'choice'].includes(CONTROL), 'Unknown native prospect control');
const OUT = path.resolve(process.env.CAREER993_ARTIFACTS || path.join(ROOT, 'prospect-journey-artifacts/native'));
fs.mkdirSync(OUT, { recursive: true });
assert(fs.existsSync(path.join(ROOT, 'dist/index.html')), 'Build dist before the native prospect walk');
const bundle = path.join(OUT, 'expected.cjs');
await build({
  stdin: { contents: `
    import { NFL_CAREER_SPORT } from '@/lib/nflCareerSport';
    import { NBA_CAREER_SPORT } from '@/lib/nbaCareerSport';
    import { MLB_CAREER_SPORT } from '@/lib/mlbCareerSport';
    import { NHL_CAREER_SPORT } from '@/lib/nhlCareerSport';
    export const sports = [NFL_CAREER_SPORT, NBA_CAREER_SPORT, MLB_CAREER_SPORT, NHL_CAREER_SPORT];
    export * from '@/lib/careerPreDraft';
    export { createUsCareerProspect } from '@/lib/usCareerProspect';
    export { keyedRng } from '@/lib/keyedRng';
    export { defaultAppearance } from '@/lib/soccerCareerAppearance';
    export { pushHeadlines } from '@/lib/careerSocial';
  `, resolveDir: ROOT, sourcefile: 'career993-expected.ts', loader: 'ts' },
  outfile: bundle, bundle: true, platform: 'node', format: 'cjs', logLevel: 'silent', alias: { '@': path.join(ROOT, 'src') },
});
const M = createRequire(import.meta.url)(bundle);
const fixtures = M.sports.map(sport => {
  const pos = sport.create.defaultPos;
  const c = sport.startCareer(`Saved ${sport.label} Player`, pos, sport.create.archetypes[pos][0], () => .4, M.defaultAppearance(), 'now');
  sport.assignRole(c, 75, () => .4);
  return { key: sport.saveKey, value: JSON.stringify({ c, phase: 'season', teamQuality: 75, coach: null }) };
});
const profiles = [
  ...M.sports.map(sport => ({ sport, width: 390, height: 844, touch: true, reduced: false })),
  { sport: M.sports[1], width: 320, height: 740, touch: true, reduced: true },
  { sport: M.sports[1], width: 1440, height: 1000, touch: false, reduced: false },
].filter((_, i) => !CONTROL || i === 0);
const report = { started: new Date().toISOString(), cases: [] };
const saveReport = () => fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
const port = await new Promise((resolve, reject) => {
  const probe = createServer(); probe.once('error', reject);
  probe.listen(0, '127.0.0.1', () => { const chosen = probe.address().port; probe.close(error => error ? reject(error) : resolve(chosen)); });
});
const BASE = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', 'dist', String(port)], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
let serverLog = '', browser;
server.stdout.on('data', data => { serverLog += data; });
server.stderr.on('data', data => { serverLog += data; });
const ready = new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('Owned server did not start within 15 seconds')), 15000);
  server.once('error', error => { clearTimeout(timer); reject(error); });
  server.once('exit', code => { clearTimeout(timer); reject(new Error(`Owned server exited ${code}: ${serverLog}`)); });
  server.stdout.on('data', data => { if (String(data).includes('host-like server:')) { clearTimeout(timer); resolve(); } });
});
const readSave = (page, key) => page.evaluate(k => localStorage.getItem(k), key);
async function activate(button, touch) {
  const box = await button.boundingBox();
  assert(box && box.width >= 44 && box.height >= 44, `Small new control: ${JSON.stringify(box)}`);
  if (touch) await button.tap(); else { await button.focus(); await button.press('Enter'); }
}
async function frames(page) { await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))); }
async function layout(page) {
  return page.evaluate(() => ({
    width: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth, scrollY,
    headings: [...document.querySelectorAll('[data-prospect-journey] h2, #prospect-help h3, [data-testid="pre-draft-choice"]')].map(el => { const r = el.getBoundingClientRect(); return { text: el.textContent?.slice(0, 80), top: r.top, bottom: r.bottom, height: r.height }; }),
    overflow: [...document.querySelectorAll('[data-prospect-journey] *')].filter(el => el.clientWidth && el.scrollWidth > el.clientWidth + 2).map(el => ({ tag: el.tagName, className: String(el.className).slice(0, 140), text: el.textContent?.slice(0, 100), width: el.clientWidth, scrollWidth: el.scrollWidth })),
    controls: [...document.querySelectorAll('[data-prospect-journey] button')].map(el => { const b = el.getBoundingClientRect(); return { text: el.textContent || el.getAttribute('aria-label'), width: b.width, height: b.height }; }),
  }));
}
function expectedArrival(sport, prospect) {
  const state = prospect.state, out = state.draft, rng = M.keyedRng(`${prospect.seed}|career`);
  const arch = sport.create.archetypes[prospect.pos].find(a => a.id === prospect.archetypeId);
  const c = sport.startCareer(prospect.name, prospect.pos, arch, rng, prospect.appearance, prospect.eraId,
    { ...out, pot: state.pot, health: out.devSeasons.length ? 100 : state.health, prospect: state });
  const teamQuality = sport.rollTeamQuality(null, rng);
  sport.assignRole(c, teamQuality, rng);
  if (c.draftPick > 0 && out.devSeasons.length === 0) sport.draftNightInbox(c);
  return { c, phase: 'season', teamQuality, coach: null };
}

try {
  await ready;
  browser = await chromium.launch({ headless: true });
  for (const profile of profiles) {
    const { sport, width, height, touch, reduced } = profile;
    const id = `${sport.slug}-${width}-${touch ? 'touch' : 'keyboard'}${reduced ? '-reduced' : ''}`;
    const result = { id, route: `/${sport.gameSlug}`, viewport: { width, height }, touch, reduced, screenshots: [], steps: [], pageErrors: [], localFailures: [] };
    report.cases.push(result);
    const context = await browser.newContext({ viewport: { width, height }, isMobile: touch, hasTouch: touch, deviceScaleFactor: 1,
      reducedMotion: reduced ? 'reduce' : 'no-preference', serviceWorkers: 'block',
      storageState: { cookies: [], origins: [{ origin: BASE, localStorage: [
        ...fixtures.filter(f => f.key !== sport.saveKey).map(f => ({ name: f.key, value: f.value })),
        { name: `rules-gate-seen:${result.route}`, value: '1' },
        { name: 'cookie-consent', value: 'essential' }, { name: 'unrelated-prospect-save', value: 'keep this save' },
      ] }] },
    });
    await context.addInitScript(control => {
      Math.random = () => .4;
      if (control === 'reveal') Element.prototype.scrollIntoView = function () {};
      if (control === 'choice') {
        const reveal = Element.prototype.scrollIntoView;
        Element.prototype.scrollIntoView = function (...args) {
          if (!document.querySelector('[data-prospect-phase="choice"]')) reveal.apply(this, args);
        };
      }
    }, CONTROL);
    await context.route('**/*', route => {
      if (new URL(route.request().url()).origin === BASE) return route.continue();
      const type = route.request().resourceType();
      return route.fulfill({ status: 200, contentType: type === 'stylesheet' ? 'text/css' : 'application/json', body: type === 'stylesheet' ? '' : '[]' });
    });
    const page = await context.newPage(); page.setDefaultTimeout(10000);
    page.on('pageerror', error => result.pageErrors.push(String(error)));
    page.on('requestfailed', request => { if (request.url().startsWith(BASE)) result.localFailures.push(`${request.url()}: ${request.failure()?.errorText}`); });
    const shot = async stage => { const file = `${id}-${stage}.png`; await page.screenshot({ path: path.join(OUT, file), animations: 'disabled' }); result.screenshots.push(file); };
    const inspect = async stage => {
      await frames(page); await shot(stage);
      const measure = await layout(page); result.steps.push({ stage, ...measure });
      fs.writeFileSync(path.join(OUT, `${id}-${stage}-layout.json`), JSON.stringify(measure, null, 2));
      assert(measure.scrollWidth <= measure.width + 2, `${stage}: horizontal overflow ${measure.scrollWidth - measure.width}px`);
      for (const control of measure.controls) assert(control.width >= 44 && control.height >= 44, `${stage}: small control ${JSON.stringify(control)}`);
    };
    const readable = async (selector, label) => {
      const visible = await page.waitForFunction(sel => {
        const el = document.querySelector(sel); if (!el) return false;
        const r = el.getBoundingClientRect();
        return r.top >= -2 && Math.min(r.bottom, innerHeight) - r.top >= Math.min(r.height, 160);
      }, selector, { timeout: 2000 }).then(() => true, () => false);
      const rectangle = await page.locator(selector).evaluate(el => {
        const r = el.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, height: r.height, viewportHeight: innerHeight, scrollY };
      });
      (result.visibility ??= []).push({ label, ...rectangle, visible });
      assert(visible, `${label} must appear without driver scrolling: ${JSON.stringify(rectangle)}`);
    };
    let expected;
    const expectSave = async () => assert.deepEqual(JSON.parse(await readSave(page, sport.saveKey)), expected, 'Whole save differs from the expected transition');
    const reload = async phase => {
      const bytes = await readSave(page, sport.saveKey);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.locator(`[data-prospect-phase="${phase}"]`).waitFor();
      await page.evaluate(() => document.fonts.ready);
      assert.equal(await readSave(page, sport.saveKey), bytes, `Reload wrote the ${phase} save`);
      await expectSave();
      if (phase === 'choice') {
        await readable('[data-testid="pre-draft-choice"]', 'Restored choice');
        await inspect(`restored-choice-${expected.prospect.state.seasonsDone}`);
      }
    };
    try {
      await page.goto(`${BASE}${result.route}`, { waitUntil: 'domcontentloaded' });
      const begin = page.getByRole('button', { name: 'Play your road to the draft', exact: true });
      await begin.waitFor(); await page.evaluate(() => document.fonts.ready);
      await page.getByRole('textbox', { name: 'Your player name', exact: true }).fill('Native Prospect');
      await activate(begin, touch);
      await page.locator('[data-prospect-phase="routes"]').waitFor();
      const initial = JSON.parse(await readSave(page, sport.saveKey));
      const seed = `${sport.slug}:${Math.floor(.4 * 0x100000000).toString(36)}`;
      assert.equal(initial.prospect.seed, seed, 'Creation did not retain its generated seed');
      const prospect = M.createUsCareerProspect(sport, { name: 'Native Prospect', pos: sport.create.defaultPos,
        archetypeId: sport.create.archetypes[sport.create.defaultPos][0].id, eraId: 'now', appearance: M.defaultAppearance(), seed });
      expected = { c: null, phase: 'prospect', teamQuality: null, coach: null, prospect };
      await expectSave(); await inspect('rules');
      await readable('[data-prospect-journey] h2', 'Entry title');
      await readable('#prospect-help h3', 'Entry instructions');
      await inspect('entry-visible');
      assert.match(await page.locator('#prospect-help').innerText(), /For example:.*knock/s, 'Worked example is missing before play');
      await activate(page.getByRole('button', { name: 'Got it', exact: true }), touch);
      await reload('routes');
      await activate(page.getByRole('button', { name: 'Got it', exact: true }), touch);
      await inspect('routes');
      const desc = sport.preDraft('now'), route = desc.routes[0];
      expected.prospect = { ...prospect, state: M.preDraftStart(desc, { seed: prospect.seed, routeId: route.id, rating: prospect.rating, pot: prospect.pot, pos: prospect.pos }) };
      await activate(page.getByRole('button', { name: new RegExp(route.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) }), touch);
      await expectSave(); await reload('season');
      for (let n = 0; n < 12 && !['showcase', 'draft', 'done'].includes(expected.prospect.state.phase); n++) {
        const state = expected.prospect.state;
        if (state.phase === 'season') {
          expected.prospect = { ...expected.prospect, state: M.preDraftPlaySeason(desc, state) };
          await activate(page.getByRole('button', { name: state.seasonsDone === 0 ? 'Play your first season' : 'Play the next season', exact: true }), touch);
        } else {
          const choice = M.preDraftChoicePool(desc).find(c => c.id === state.pendingChoice);
          const option = page.getByTestId('pre-draft-choice').getByRole('button').first();
          if (!touch) { await page.keyboard.press('Tab'); assert(await option.evaluate(el => document.activeElement === el), 'Keyboard continuation missed the first scout choice'); }
          expected.prospect = { ...expected.prospect, state: M.preDraftChoose(desc, state, 0) };
          await activate(option, touch);
          assert(choice, 'The visible decision must exist in the engine');
        }
        await expectSave();
        if (expected.prospect.state.phase === 'choice') {
          await readable('[data-testid="pre-draft-choice"]', 'New choice');
          await inspect(`choice-${expected.prospect.state.seasonsDone}`); await reload('choice');
        }
      }
      assert.equal(expected.prospect.state.phase, 'showcase', 'The season route did not reach its showcase');
      await reload('showcase'); await inspect('showcase');
      expected.prospect = { ...expected.prospect, state: M.preDraftShowcase(desc, expected.prospect.state, 'steady') };
      await activate(page.getByRole('button', { name: /Play it safe/ }), touch);
      await expectSave(); await reload('draft');
      expected.prospect = { ...expected.prospect, state: M.preDraftRunDraft(desc, expected.prospect.state) };
      await activate(page.getByRole('button', { name: 'Draft day', exact: true }), touch);
      await expectSave(); await inspect('draft-result'); await reload('done');
      const outcome = expected.prospect.state.draft;
      const text = await page.getByTestId('draft-result').innerText();
      assert(text.includes(desc.teamLabel(outcome.team)), 'Reveal names another team');
      assert(outcome.pick === null ? text.includes('Undrafted') : text.includes(`${outcome.pick} overall`), 'Reveal prints another draft outcome');
      if (reduced) {
        assert(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches));
        const motion = await page.locator('[data-arrival] h2').evaluate(el => ({ animation: getComputedStyle(el.parentElement).animationName, opacity: getComputedStyle(el.parentElement).opacity }));
        assert.equal(motion.animation, 'none'); assert.equal(motion.opacity, '1');
      }
      result.outcome = outcome;
      expected = expectedArrival(sport, expected.prospect);
      await activate(page.getByRole('button', { name: 'Start your career', exact: true }), touch);
      const play = page.getByRole('button', { name: `Play the ${expected.c.year} season`, exact: true });
      await play.waitFor(); await expectSave(); await inspect('joined');
      assert(await play.evaluate(el => document.activeElement === el), 'Joining did not focus the first pro-season button');
      assert.equal(expected.c.team, outcome.team); assert.equal(expected.c.draftPick, outcome.pick ?? 0);
      assert.equal(expected.c.ovr, outcome.ratingAfter); assert.equal(expected.c.age, outcome.ageAfter);
      assert.equal(expected.c.rival.team, outcome.team); assert.equal(expected.c.rival.age, outcome.ageAfter);
      const before = await readSave(page, sport.saveKey);
      await activate(page.getByRole('button', { name: /My Player/ }), touch);
      const archive = page.locator('[data-prospect-record]');
      await activate(archive.locator('summary'), touch);
      assert((await archive.innerText()).includes(desc.teamLabel(outcome.team)), 'The saved scout file lost the original team');
      assert((await archive.innerText()).includes(`rated ${outcome.ratingAfter}`), 'The archive lost the earned entry rating');
      await inspect('scout-archive');
      assert.equal(await readSave(page, sport.saveKey), before, 'Viewing the scout archive changed the career save');
      await page.reload({ waitUntil: 'domcontentloaded' }); await play.waitFor();
      assert.equal(await readSave(page, sport.saveKey), before, 'Pro-career reload changed its save');
      const firstYear = expected.c.year, entryRating = expected.c.ovr;
      const advanced = structuredClone(expected.c);
      sport.campBattle(advanced, expected.teamQuality, () => .4);
      const { line } = sport.simSeason(advanced, expected.teamQuality, () => .4);
      sport.progress(advanced, () => .4);
      advanced.headlines = M.pushHeadlines(advanced.headlines, sport.headlinesFor(advanced, line));
      assert(!sport.shouldRetire(advanced), 'Fresh native prospect unexpectedly retired');
      sport.drawEvent(advanced, () => .4);
      expected = { ...expected, c: advanced, phase: 'event' };
      await activate(play, touch); await expectSave(); await inspect('first-pro-season');
      assert.equal(expected.c.seasons.length, 1); assert.equal(expected.c.seasons[0].year, firstYear);
      assert.equal(expected.c.seasons[0].ovr, entryRating); assert.equal(expected.c.year, firstYear + 1);
      assert.deepEqual(expected.c.prospect.draft, outcome, 'Playing a pro season changed the scout archive');
      for (const other of fixtures.filter(f => f.key !== sport.saveKey)) assert.equal(await readSave(page, other.key), other.value, 'Another sport save changed');
      assert.equal(await readSave(page, 'unrelated-prospect-save'), 'keep this save');
      assert.deepEqual(result.pageErrors, []); assert.deepEqual(result.localFailures, []);
      fs.writeFileSync(path.join(OUT, `${id}-expected-final.json`), JSON.stringify(expected, null, 2));
      result.passed = true; console.log(`${id}: full road, all phase reloads, earned draft handoff and first pro season passed`);
    } catch (error) {
      result.passed = false; result.error = error.stack || String(error); console.error(`${id}: ${result.error}`);
      await shot('failure').catch(() => {});
      fs.writeFileSync(path.join(OUT, `${id}-failure.html`), await page.content().catch(() => 'Page unavailable'));
    } finally { saveReport(); await context.close(); }
  }
  if (CONTROL) {
    assert.equal(report.cases.length, 1);
    const label = CONTROL === 'reveal' ? 'Entry title' : 'New choice';
    assert(!report.cases[0].passed && report.cases[0].error.includes(`${label} must appear without driver scrolling`), 'Disabled reveal must fail its own visibility assertion');
    console.log(`Native ${CONTROL} control: disabling scrollIntoView fails its own visibility assertion`);
  } else assert.equal(report.cases.filter(c => c.passed).length, profiles.length, 'All six native journeys must pass');
} finally {
  await browser?.close(); if (server.exitCode === null && !server.killed) server.kill();
  fs.writeFileSync(path.join(OUT, 'server.log'), serverLog);
  report.finished = new Date().toISOString(); saveReport(); console.log(`Native prospect evidence: ${OUT}`);
}
