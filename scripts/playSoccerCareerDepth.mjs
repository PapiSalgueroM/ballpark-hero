// Actual career route, saved target outcome and record book loading/failure at phone/desktop widths.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import pw from './lib/playwrightLoader.mjs';
import { bundleAwardsNight } from './lib/careerAwardsNightBundle.mjs';
import { mulberry32 } from './lib/careerAwardsNightProbe.mjs';
if (!process.env.CI) throw new Error('This site browser proof runs remotely in CI.');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT || 4591);
const BASE = process.env.BASE || `http://127.0.0.1:${PORT}`;
const SHOTS = path.resolve(ROOT, process.env.SHOTS || '.tmp-fx/career-depth-shots');
const NOW = 1791547200000;
const B = await bundleAwardsNight(ROOT, { extra: { records: 'src/lib/soccerCareerRecords.ts', ambitions: 'src/lib/soccerCareerAmbitions.ts' } });
const oracleBundle = await build({
  stdin: { contents: "export { advanceProSeason, FALLBACK_CLUBS } from './src/lib/soccerCareerEngine';", resolveDir: ROOT, loader: 'ts' },
  bundle: true, platform: 'browser', format: 'iife', globalName: '__careerDepthEngine', write: false,
  alias: { '@': path.join(ROOT, 'src') }, define: { 'import.meta.env': '{"DEV":false,"PROD":true,"MODE":"production"}' },
  loader: { '.css': 'empty', '.png': 'empty', '.svg': 'empty', '.jpg': 'empty', '.webp': 'empty' }, logLevel: 'error',
});
if (!/^\s+setClubs\(FALLBACK_CLUBS\);$/m.test(fs.readFileSync(path.join(ROOT, 'src/pages/SoccerCareer.tsx'), 'utf8'))) {
  throw new Error('fixture refused: the actual career route no longer uses the expected static club pool');
}
const captured = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/careerLeagueWorldSaves1100.json'), 'utf8')).saves.find(s => s.kind === 'player')?.state;
if (!captured) throw new Error('fixture refused: recorded save missing');
const fixture = B.soccer.repairCareer(structuredClone(captured));
const last = fixture.seasons.at(-1);
if (!last || last.type !== 'playing') throw new Error('fixture refused: senior row missing');
fixture.playerName = 'Career Depth Fixture';
fixture.phase = 'playing'; fixture.retired = false; fixture.isFinalSeason = false;
fixture.pendingSummary = null; fixture.pendingBallonDor = null; fixture.pendingNews = []; fixture.pendingEvents = [];
fixture.pendingAppealResult = null; fixture.pendingMoralDilemma = null; fixture.pendingRehab = null;
fixture.transferSituation = null; fixture.frozenOut = 0; fixture.badSeasonStreak = 0;
fixture.loan = null; fixture.contractYearsLeft = 4;
delete fixture.seasonAmbition; delete fixture.seasonMoments;
const book = B.records.careerRecordBook(fixture);
const options = B.ambitions.ambitionOptions(fixture);
const choice = options.find(o => o.id === 'goals') || options[0];
if (!choice || !book.bests.length) throw new Error('fixture refused: no real choice or saved record');
let checks = 0, failed = 0, browser, server, oracleContext, oraclePage;
const check = (ok, label) => { checks++; if (!ok) failed++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}`); };
const state = page => page.evaluate(() => JSON.parse(localStorage.getItem('soccerCareerSave')));
const savedBytes = page => page.evaluate(() => localStorage.getItem('soccerCareerSave'));
const bodyState = page => page.evaluate(() => ({ inline: document.body.style.overflow, computed: getComputedStyle(document.body).overflow, y: scrollY }));
const sheetChunk = /\/assets\/CareerRecordsSheet-[^/?]+\.js(?:\?|$)/;
function fieldDifferences(expected, actual, at = '$', rows = []) {
  if (Object.is(expected, actual)) return rows;
  if (!expected || !actual || typeof expected !== 'object' || typeof actual !== 'object' || Array.isArray(expected) !== Array.isArray(actual)) {
    rows.push({ at, expected, actual }); return rows;
  }
  const left = Object.keys(expected), right = Object.keys(actual);
  if (JSON.stringify(left) !== JSON.stringify(right)) rows.push({ at: `${at}.[keys]`, expected: left, actual: right });
  for (const key of new Set([...left, ...right])) {
    if (!Object.hasOwn(expected, key) || !Object.hasOwn(actual, key)) rows.push({ at: `${at}.${key}`,
      expected: Object.hasOwn(expected, key) ? expected[key] : '<absent>', actual: Object.hasOwn(actual, key) ? actual[key] : '<absent>' });
    else fieldDifferences(expected[key], actual[key], `${at}.${key}`, rows);
  }
  return rows;
}
function compareSave(expected, actual, name) {
  const normalized = JSON.parse(JSON.stringify(expected)), diff = fieldDifferences(normalized, actual);
  for (const [suffix, value] of [['expected', normalized], ['actual', actual], ['diff', diff]]) {
    fs.writeFileSync(path.join(SHOTS, `${name}-${suffix}.json`), JSON.stringify(value, null, 2));
  }
  const same = JSON.stringify(actual) === JSON.stringify(expected);
  if (!same) console.log(`${name}: full save mismatch, ${diff.length} recursive differences\n${JSON.stringify(diff, null, 2)}`);
  return same;
}
function normalSeason(career) {
  const real = Math.random, OriginalDate = Date;
  globalThis.Date = class extends OriginalDate { constructor(...args) { super(...(args.length ? args : [NOW])); } static now() { return NOW; } };
  try {
    for (let seed = 118400; seed < 118464; seed++) {
      const rng = mulberry32(seed), draws = [], sortDraws = [];
      Math.random = () => { const value = rng(); if (new Error().stack.includes('Array.sort')) sortDraws.push(draws.length); draws.push(value); return value; };
      const next = B.soccer.advanceProSeason(structuredClone(career), B.soccer.FALLBACK_CLUBS);
      const row = next.seasons.at(-1);
      if (['newspaper', 'season_summary'].includes(next.phase) && next.pendingSummary?.year === row?.year && row?.apps > 0 && !row.injurySevere && row.ambition) return { seed, next, draws, sortDraws };
    }
    throw new Error('fixture refused: real engine produced no normal summary season in 64 seeds');
  } finally { Math.random = real; globalThis.Date = OriginalDate; }
}
async function chromiumSeason(career, seed) {
  return oraclePage.evaluate(({ career, seed, now }) => {
    const originalRandom = Math.random, OriginalDate = Date, draws = [], sortDraws = []; let t = seed >>> 0;
    window.Date = class extends OriginalDate { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } };
    Math.random = () => { t = (t + 0x6D2B79F5) >>> 0; let x = Math.imul(t ^ (t >>> 15), 1 | t); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
      const value = ((x ^ (x >>> 14)) >>> 0) / 4294967296;
      if (new Error().stack.includes('Array.sort')) sortDraws.push(draws.length); draws.push(value); return value; };
    try {
      const engine = window.__careerDepthEngine, next = engine.advanceProSeason(structuredClone(career), engine.FALLBACK_CLUBS);
      const row = next.seasons.at(-1);
      if (!['newspaper', 'season_summary'].includes(next.phase) || next.pendingSummary?.year !== row?.year || !(row?.apps > 0) || row.injurySevere || !row.ambition) {
        throw new Error('same seeded Chromium engine did not produce the selected normal summary');
      }
      return { seed, next, draws, sortDraws };
    } finally { Math.random = originalRandom; window.Date = OriginalDate; }
  }, { career, seed, now: NOW });
}
async function seedSeasonClick(page, seed) {
  await page.getByRole('button', { name: 'Next Season', exact: true }).evaluate((button, initial) => {
    button.addEventListener('click', () => {
      window.__careerDepthRealRandom = Math.random; window.__careerDepthDraws = []; window.__careerDepthSortDraws = []; let t = initial >>> 0;
      Math.random = () => { t = (t + 0x6D2B79F5) >>> 0; let x = Math.imul(t ^ (t >>> 15), 1 | t); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
        const value = ((x ^ (x >>> 14)) >>> 0) / 4294967296;
        if (new Error().stack.includes('Array.sort')) window.__careerDepthSortDraws.push(window.__careerDepthDraws.length);
        window.__careerDepthDraws.push(value); return value; };
    }, { capture: true, once: true });
  }, seed);
}
async function trapped(page, dialog) {
  for (const key of ['Tab', 'Tab', 'Tab', 'Shift+Tab', 'Shift+Tab', 'Shift+Tab']) {
    await page.keyboard.press(key);
    if (!await dialog.evaluate(panel => panel.contains(document.activeElement))) return false;
  }
  return true;
}
async function restored(page, expected, name) {
  const ok = await page.waitForFunction(body => document.activeElement?.hasAttribute('data-career-records-tile')
    && document.body.style.overflow === body.inline && getComputedStyle(document.body).overflow === body.computed
    && scrollY === body.y, expected, { timeout: 2000 }).then(() => true, () => false);
  const actual = await page.evaluate(() => ({ inline: document.body.style.overflow, computed: getComputedStyle(document.body).overflow,
    y: scrollY, active: document.activeElement?.outerHTML ?? null }));
  fs.writeFileSync(path.join(SHOTS, `${name}-restoration.json`), JSON.stringify({ expected, actual, ok }, null, 2));
  if (!ok) console.log(`${name}: exact focus/body restoration failed\n${JSON.stringify({ expected, actual }, null, 2)}`);
  return ok;
}
async function prepare(context) {
  await context.addInitScript(now => {
    const OriginalDate = Date;
    window.Date = class extends OriginalDate { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } };
  }, NOW);
  await context.addInitScript(save => {
    if (!sessionStorage.getItem('career-depth-started')) {
      sessionStorage.setItem('career-depth-started', '1');
      localStorage.setItem('cookie-consent', 'essential');
      localStorage.setItem('soccerCareerSave', save);
    }
  }, JSON.stringify(fixture));
  await context.route(/supabase\.co/, route => route.abort());
}
async function walk(width, height) {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
  let releaseSheet;
  const sheetGate = new Promise(resolve => { releaseSheet = resolve; });
  let sheetRequests = 0;
  try {
    await prepare(context);
    await context.route(sheetChunk, async route => { sheetRequests++; await sheetGate; await route.continue(); });
    const page = await context.newPage(); const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    await page.goto(`${BASE}/soccer-career`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    const target = page.locator('[data-season-ambition]:visible');
    await target.waitFor({ timeout: 45000 });
    const label = `${width}x${height}`;
    const before = await state(page);
    await target.click();
    const dialog = page.getByRole('dialog', { name: 'Your season target' });
    await dialog.waitFor();
    check(await dialog.getByText(/Example: your best is 12 goals/).isVisible(), `${label}: target instructions and worked example precede the choice`);
    await dialog.screenshot({ path: path.join(SHOTS, `career-target-${width}.png`) });
    await dialog.locator(`[data-ambition-option="${choice.id}"]`).click();
    await page.waitForFunction(() => !!JSON.parse(localStorage.getItem('soccerCareerSave')).seasonAmbition);
    const chosen = await state(page);
    check(JSON.stringify(chosen) === JSON.stringify(B.ambitions.pickCareerAmbition(before, choice.id)), `${label}: choice writes exactly the engine target, without changing this season's stats`);
    await page.reload({ waitUntil: 'domcontentloaded' }); await target.waitFor({ timeout: 45000 });
    check(JSON.stringify((await state(page)).seasonAmbition) === JSON.stringify(chosen.seasonAmbition), `${label}: target survives reload with its exact year and club`);
    await target.click();
    await dialog.getByRole('button', { name: 'Clear this target' }).click();
    await page.waitForFunction(() => !JSON.parse(localStorage.getItem('soccerCareerSave')).seasonAmbition);
    await dialog.waitFor({ state: 'hidden' });
    await page.waitForFunction(() => !document.querySelector('[data-scroll-locked]'));
    check(JSON.stringify(await state(page)) === JSON.stringify(B.ambitions.pickCareerAmbition(chosen, null)), `${label}: cancelling only removes the target`);
    const tile = page.locator('[data-career-records-tile]:visible');
    await tile.scrollIntoViewIfNeeded(); await tile.focus();
    const beforeBookBody = await bodyState(page);
    const requested = page.waitForRequest(sheetChunk, { timeout: 45000 });
    await tile.click(); await requested;
    const loading = page.getByRole('dialog', { name: 'Opening your record book' }); await loading.waitFor();
    check(await loading.getByText('Your saved seasons are loading.').isVisible() && sheetRequests > 0, `${label}: actual lazy chunk shows an accessible loading dialog`);
    check(await loading.evaluate(panel => panel.contains(document.activeElement)) && (await bodyState(page)).computed === 'hidden', `${label}: loading contains focus and locks body scrolling`);
    releaseSheet();
    const records = page.getByRole('dialog', { name: 'Your career record book' }); await records.waitFor();
    await page.waitForFunction(() => !document.querySelector('[data-scroll-locked]'));
    check(await records.evaluate(panel => panel.contains(document.activeElement)) && (await bodyState(page)).computed === 'hidden', `${label}: loaded record sheet retains focus and body lock after fallback unmounts`);
    const saved = await savedBytes(page);
    check((await records.locator('[data-record-totals]').innerText()).includes(String(book.totals.apps)), `${label}: record totals agree with saved senior rows`);
    const best = book.bests[0];
    await records.locator(`[data-career-best="${best.label}"]`).click();
    check(await records.locator(`[data-record-season="${best.season.year}"]`).isVisible(), `${label}: best opens the actual winning record's season`);
    await records.getByRole('button', { name: 'Back', exact: false }).click();
    await records.getByRole('button', { name: 'Club history' }).click();
    check(await records.locator('[data-record-stint]').count() === book.stints.length, `${label}: every saved club spell appears`);
    await records.screenshot({ path: path.join(SHOTS, `career-club-history-${width}.png`) });
    await records.locator('[data-record-stint="0"]').click();
    check(await records.locator('[data-record-season]').count() === book.stints[0].rows.length, `${label}: club detail contains only that spell's seasons`);
    await page.keyboard.press('Escape');
    await records.getByRole('button', { name: 'Record book help' }).click();
    check(await records.getByText(/Example: 12 goals/).isVisible(), `${label}: record help and worked example can reopen`);
    check(await trapped(page, records), `${label}: forward and reverse keyboard navigation stay in the record dialog`);
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${label}: no horizontal overflow`);
    await page.keyboard.press('Escape'); await records.waitFor({ state: 'hidden' });
    check(await page.evaluate(() => document.activeElement?.hasAttribute('data-career-records-tile')), `${label}: Escape closes and restores the record tile focus`);
    check(JSON.stringify(await bodyState(page)) === JSON.stringify(beforeBookBody), `${label}: closing the record sheet restores body scrolling without moving the page`);
    check(await savedBytes(page) === saved, `${label}: all record tabs and details preserve the whole save`);
    await page.reload({ waitUntil: 'domcontentloaded' }); await tile.waitFor({ timeout: 45000 });
    check(await savedBytes(page) === saved, `${label}: reload preserves the cancelled target and career history`);
    await target.click(); await dialog.locator(`[data-ambition-option="${choice.id}"]`).click();
    await page.waitForFunction(() => !!JSON.parse(localStorage.getItem('soccerCareerSave')).seasonAmbition);
    const beforeSeason = await state(page);
    fs.writeFileSync(path.join(SHOTS, `career-season-${width}-input.json`), JSON.stringify({ save: beforeSeason, clubs: B.soccer.FALLBACK_CLUBS, now: NOW }, null, 2));
    const nodeProof = normalSeason(beforeSeason), proof = await chromiumSeason(beforeSeason, nodeProof.seed);
    fs.writeFileSync(path.join(SHOTS, `career-season-${width}-node-expected.json`), JSON.stringify(nodeProof.next, null, 2));
    const runtimeDiff = fieldDifferences(JSON.parse(JSON.stringify(nodeProof.next)), proof.next);
    fs.writeFileSync(path.join(SHOTS, `career-season-${width}-node-chromium-diff.json`), JSON.stringify(runtimeDiff, null, 2));
    console.log(`${label}: normal engine seed ${proof.seed}, phase ${proof.next.phase}, apps ${proof.next.seasons.at(-1).apps}, target ${proof.next.seasons.at(-1).ambition.outcome}`);
    await seedSeasonClick(page, proof.seed);
    await page.getByRole('button', { name: 'Next Season', exact: true }).click();
    await page.waitForFunction(count => JSON.parse(localStorage.getItem('soccerCareerSave')).seasons.length > count, beforeSeason.seasons.length, { timeout: 45000 });
    const observed = await page.evaluate(() => {
      if (typeof window.__careerDepthRealRandom !== 'function') throw new Error('seed listener did not run on the actual Next Season click');
      Math.random = window.__careerDepthRealRandom; delete window.__careerDepthRealRandom;
      const draws = window.__careerDepthDraws, sortDraws = window.__careerDepthSortDraws;
      delete window.__careerDepthDraws; delete window.__careerDepthSortDraws; return { draws, sortDraws };
    });
    fs.writeFileSync(path.join(SHOTS, `career-season-${width}-rng.json`), JSON.stringify({ seed: proof.seed, node: nodeProof, chromium: proof, observed }, null, 2));
    console.log(`${label}: Node/Chromium/actual RNG calls ${nodeProof.draws.length}/${proof.draws.length}/${observed.draws.length}, sort draws ${nodeProof.sortDraws.length}/${proof.sortDraws.length}/${observed.sortDraws.length}, full runtime differences ${runtimeDiff.length}`);
    const finished = await state(page), row = finished.seasons.at(-1), result = row.ambition;
    check(result && result.actual === row[choice.stat] && result.target === beforeSeason.seasonAmbition.target && !finished.seasonAmbition, `${label}: playing a real season seals target against its actual stats and consumes the choice`);
    check(compareSave(proof.next, finished, `career-season-${width}`), `${label}: actual Next Season writes the unchanged real engine's complete seeded save`);
    if (!result || !['newspaper', 'season_summary'].includes(finished.phase)) throw new Error(`normal summary fixture did not reach its expected phase: ${finished.phase}`);
    const finishedBytes = await savedBytes(page);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(year => JSON.parse(localStorage.getItem('soccerCareerSave')).seasons.at(-1)?.year === year, row.year);
    check(await savedBytes(page) === finishedBytes, `${label}: completed target and queued reward survive reload without another payout`);
    if (finished.phase === 'newspaper') {
      await page.getByRole('button', { name: 'Continue to Season Summary', exact: false }).click();
      await page.waitForFunction(() => JSON.parse(localStorage.getItem('soccerCareerSave')).phase === 'season_summary');
      check(JSON.stringify(await state(page)) === JSON.stringify(B.soccer.dismissNewspaper(finished)), `${label}: actual newspaper Continue changes only the normal summary transition`);
    }
    const resultPanel = page.locator('[data-season-ambition-result]:visible');
    await resultPanel.waitFor({ timeout: 45000 });
    check((await state(page)).phase === 'season_summary' && await resultPanel.getAttribute('data-season-ambition-result') === result.outcome, `${label}: actual season summary shows the sealed target outcome`);
    check((await resultPanel.innerText()).includes(`${result.label}. Finished on ${result.actual}.`), `${label}: summary shows the exact saved target and final statistic`);
    await resultPanel.screenshot({ path: path.join(SHOTS, `career-target-result-${width}.png`) });
    const summaryBytes = await savedBytes(page);
    await page.reload({ waitUntil: 'domcontentloaded' }); await resultPanel.waitFor({ timeout: 45000 });
    check(await savedBytes(page) === summaryBytes && await resultPanel.getAttribute('data-season-ambition-result') === result.outcome, `${label}: summary reload preserves the result and whole save without repeating the reward`);
    check(errors.length === 0, `${label}: complete target and record journey has no page errors`);
  } finally { releaseSheet(); await context.close(); }
}
async function failedChunk(width, height) {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
  let aborted = 0, rejectSheet = true;
  try {
    await prepare(context);
    await context.route(sheetChunk, route => { if (!rejectSheet) return route.continue(); aborted++; return route.abort('failed'); });
    const page = await context.newPage(); const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    let navigations = 0;
    page.on('framenavigated', frame => { if (frame === page.mainFrame()) navigations++; });
    await page.goto(`${BASE}/soccer-career`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    const tile = page.locator('[data-career-records-tile]:visible'); await tile.waitFor({ timeout: 45000 });
    await tile.scrollIntoViewIfNeeded(); await tile.focus();
    const before = await savedBytes(page), label = `${width}x${height} failed chunk`, opened = navigations;
    const recovered = page.waitForEvent('framenavigated', { predicate: frame => frame === page.mainFrame(), timeout: 15000 });
    await tile.click(); await recovered;
    await tile.waitFor({ timeout: 45000 });
    check(aborted > 0 && navigations === opened + 1 && await page.evaluate(() => sessionStorage.getItem('dukb-reloaded-stale-chunk')) === '1', `${label}: the first real chunk failure performs exactly one global stale-chunk reload`);
    check(await savedBytes(page) === before && new URL(page.url()).pathname === '/soccer-career', `${label}: automatic recovery returns to the actual career with every saved byte intact`);
    await tile.scrollIntoViewIfNeeded(); await tile.focus();
    const body = await bodyState(page), afterRecovery = navigations;
    await tile.click();
    const dialog = page.getByRole('dialog', { name: 'Record book unavailable' }); await dialog.waitFor({ timeout: 15000 });
    check(aborted >= 2 && navigations === afterRecovery && await dialog.getByText('The record book could not open. Your career is safe.').isVisible(), `${label}: a second real failed import reaches the accessible error without a reload loop`);
    check(await dialog.evaluate(panel => panel.contains(document.activeElement)) && await trapped(page, dialog), `${label}: error dialog contains focus through forward and reverse Tab`);
    check((await bodyState(page)).computed === 'hidden' && (await bodyState(page)).y === body.y, `${label}: error locks body scrolling without moving the page`);
    check(await savedBytes(page) === before && await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${label}: failure preserves every saved byte and fits the viewport`);
    await dialog.screenshot({ path: path.join(SHOTS, `career-records-failure-${width}.png`) });
    await page.keyboard.press('Escape'); await dialog.waitFor({ state: 'hidden' });
    await page.waitForFunction(() => !document.querySelector('[data-scroll-locked]'));
    check(await restored(page, body, `career-records-failure-${width}-escape`), `${label}: Escape restores the tile focus and original body scrolling`);
    check(await savedBytes(page) === before, `${label}: Escape preserves the whole save`);
    await tile.click(); await dialog.waitFor();
    await dialog.getByRole('button', { name: 'Back to your career', exact: true }).focus(); await page.keyboard.press('Enter');
    await dialog.waitFor({ state: 'hidden' }); await page.waitForFunction(() => !document.querySelector('[data-scroll-locked]'));
    check(await restored(page, body, `career-records-failure-${width}-back`), `${label}: keyboard Back restores tile focus and body scrolling after reopening`);
    check(await savedBytes(page) === before, `${label}: keyboard Back preserves the whole save`);
    check(errors.length === 0, `${label}: caught lazy failure causes no uncaught page error (${errors.join('; ')})`);
    rejectSheet = false;
    await page.reload({ waitUntil: 'domcontentloaded' }); await tile.waitFor({ timeout: 45000 });
    check(await savedBytes(page) === before, `${label}: failure and close survive reload without changing the career`);
    await tile.click();
    const records = page.getByRole('dialog', { name: 'Your career record book' }); await records.waitFor({ timeout: 15000 });
    check(await savedBytes(page) === before && await records.locator('[data-record-totals]').isVisible(), `${label}: restoring the real chunk after a reload opens the saved record book`);
    await page.keyboard.press('Escape'); await records.waitFor({ state: 'hidden' });
    check(await savedBytes(page) === before, `${label}: closing the recovered book preserves the complete career`);
  } catch (error) {
    for (const page of context.pages()) {
      if (page.isClosed()) continue;
      fs.writeFileSync(path.join(SHOTS, `career-records-failure-${width}-diagnostic.json`), JSON.stringify({ aborted,
        url: page.url(), body: await bodyState(page), save: await state(page), text: await page.locator('body').innerText() }, null, 2));
      await page.screenshot({ path: path.join(SHOTS, `career-records-failure-${width}-diagnostic.png`), fullPage: true });
    }
    throw error;
  } finally { await context.close(); }
}
try {
  fs.mkdirSync(SHOTS, { recursive: true });
  if (!process.env.BASE) {
    server = spawn(process.execPath, [path.join(ROOT, 'scripts/lib/hostLikeServer.mjs'), path.join(ROOT, 'dist'), String(PORT)], { stdio: 'ignore' });
    await new Promise(r => setTimeout(r, 1200));
  }
  browser = await pw.chromium.launch({ args: ['--no-sandbox', '--no-proxy-server'] });
  oracleContext = await browser.newContext(); oraclePage = await oracleContext.newPage();
  const oracleUrl = `${BASE}/__career-depth-oracle`;
  await oraclePage.route(oracleUrl, route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><body></body></html>' }));
  await oraclePage.goto(oracleUrl); await oraclePage.addScriptTag({ content: oracleBundle.outputFiles[0].text });
  for (const [w, h] of [[390, 844], [1280, 900]]) {
    try { await walk(w, h); } catch (e) { check(false, `${w}x${h} journey threw: ${String(e.stack || e).slice(0, 700)}`); }
    try { await failedChunk(w, h); } catch (e) { check(false, `${w}x${h} failed chunk journey threw: ${String(e.stack || e).slice(0, 700)}`); }
  }
} finally { await oracleContext?.close(); await browser?.close(); server?.kill(); }
console.log(`playSoccerCareerDepth: ${checks} checks, ${failed} failed`);
process.exit(failed ? 1 : 0);
