/**
 * Soccer Career: old-save opponent names and the Trophy Cabinet in Chromium.
 * The fixture starts with the engine-recorded ere save in scripts/data/
 * careerLeagueWorldSaves1100.json. Its last club is changed to the game's
 * existing Anderlecht entry, with the old save's missing finish and size.
 * A second copy has explicitly fictional winning flags on the two recorded
 * playing rows. These are simulation saves, never historical sports results.
 *
 * Checks the complete Belgian fixture list, the score and goal feed, recorded
 * totals, read-only save bytes after watching and reloading, every trophy
 * category, saved winning seasons and detail totals, keyboard navigation,
 * focus, page scroll and horizontal overflow at 390x844 and 1280x900.
 *
 * Run after a completed build:
 *   node scripts/playSoccerCareerOpponents.mjs
 * BASE uses an already running host; SHOTS sets the screenshot directory.
 * PLAY_CAREER_OPPONENTS_CONTROL=unnamed patches the served name projection,
 * with an exact single-match guard, without writing built files. Naming
 * checks must fail and the run exits 1. A missing control needle is an error.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import pw from './lib/playwrightLoader.mjs';
import { bundleAwardsNight } from './lib/careerAwardsNightBundle.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const PORT = Number(process.env.PORT || 4573);
const BASE = process.env.BASE || `http://127.0.0.1:${PORT}`;
const SHOTS = path.resolve(ROOT, process.env.SHOTS || '.tmp-fx/shots');
const CONTROL = process.env.PLAY_CAREER_OPPONENTS_CONTROL || '';
if (CONTROL && CONTROL !== 'unnamed') throw new Error(`unknown PLAY_CAREER_OPPONENTS_CONTROL ${CONTROL}`);
let checks = 0, failed = 0, controlRequests = 0;
const check = (ok, label) => {
  checks += 1;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}`);
  if (!ok) failed += 1;
  return ok;
};

const { soccer, season: S, core: C } = await bundleAwardsNight(ROOT, { extra: { season: 'src/lib/season/soccer.ts', core: 'src/lib/season/core.ts' } });
const clubs = soccer.FALLBACK_CLUBS;
const own = clubs.find(c => c.name === 'Anderlecht');
if (!own) throw new Error('fixture refused: FALLBACK_CLUBS has no Anderlecht');
const allowed = clubs.filter(c => c.league === own.league && c.name !== own.name).map(c => c.name);
if (allowed.length !== 17 || new Set(allowed).size !== 17) throw new Error('fixture refused: Belgian pool is not 17 distinct opponents');
const recorded = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/careerLeagueWorldSaves1100.json'), 'utf8'));
const original = recorded.saves.find(s => s.id === 'ere' && s.kind === 'player')?.state;
if (!original) throw new Error('fixture refused: recorded ere player save is absent');
const old = structuredClone(original);
const last = old.seasons.findLast(r => r.type === 'playing' && r.apps > 0);
if (!last || last.year < 2026) throw new Error('fixture refused: no current playing row');
Object.assign(last, { club: own.name, clubCountry: own.country, clubTier: own.tier });
delete last.leagueFinish;
delete last.leagueSize;
Object.assign(old, { currentClub: own.name, currentClubCountry: own.country, currentClubTier: own.tier, currentClubColor: own.color, currentLeague: own.league, phase: 'season_summary', pendingSummary: last });
const derived = C.deriveSeason(S.SOCCER, last, S.buildSoccerSeasonCtx(old, clubs, last));
const goalGame = derived?.games.find(g => g.events.some(e => e.kind === 'goal' && e.side === 'them'));
if (!goalGame) throw new Error('fixture refused: recorded season has no opposition goal to witness');
const goalOpponent = derived.labels[goalGame.opp].name;
if (!allowed.includes(goalOpponent)) throw new Error('fixture refused: selected goal has no named league opponent');
const winning = structuredClone(old);
Object.assign(winning, { phase: 'playing', pendingSummary: null });
const rows = winning.seasons.filter(r => r.type === 'playing' && r.apps > 0);
if (rows.length !== 2) throw new Error('fixture refused: expected two recorded playing seasons');
Object.assign(rows[0], { leagueTitle: true, domesticCup: true, worldCup: true });
Object.assign(rows[1], { leagueTitle: true, championsLeague: true, clubCupTitle: 'Saved club cup', continentalCup: true, ballonDor: true });
const categories = {
  league: r => !!r.leagueTitle,
  domestic: r => !!r.domesticCup,
  ucl: r => !!r.championsLeague,
  club: r => !!r.clubCupTitle,
  world: r => !!r.worldCup,
  continental: r => !!r.continentalCup,
  ballon: r => !!r.ballonDor,
};

let patch = null;
if (CONTROL) {
  const assets = path.join(DIST, 'assets');
  const projection = /names:([$\w]+)\.labels\.map\(([$\w]+)=>\2\.named\?\2\.name:([$\w]+)\.words\.unnamed\)/g;
  const matches = fs.readdirSync(assets).filter(f => f.endsWith('.js')).flatMap(file => {
    const text = fs.readFileSync(path.join(assets, file), 'utf8');
    return [...text.matchAll(projection)].map(hit => ({ file, text, hit }));
  });
  if (matches.length !== 1) {
    const candidates = fs.readdirSync(assets).filter(f => f.endsWith('.js')).flatMap(file => {
      const text = fs.readFileSync(path.join(assets, file), 'utf8');
      return [...text.matchAll(/names:[^,}]{0,180}labels\.map[^}]{0,180}/g)].map(hit => `${file}: ${hit[0]}`);
    });
    throw new Error(`control refused: expected one names projection, found ${matches.length}. ${candidates.join('\n')}`);
  }
  const m = matches[0];
  const changed = m.text.replace(m.hit[0], `names:${m.hit[1]}.labels.map((label,at)=>at?"another club":label.name)`);
  if (changed === m.text || changed.includes(m.hit[0])) throw new Error('control refused: served projection did not change');
  patch = { file: m.file, text: changed };
  console.log(`CONTROL unnamed: serving changed name projection in ${m.file}`);
}

let server = null, browser = null;
async function open(save, width, height) {
  const ctx = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
  await ctx.addInitScript(serialized => {
    try {
      if (!sessionStorage.getItem('career-opponents-harness')) {
        sessionStorage.setItem('career-opponents-harness', '1');
        localStorage.setItem('cookie-consent', 'essential');
        localStorage.setItem('soccerCareerSave', serialized);
        localStorage.setItem('seasonCentre:help', '1');
      }
    } catch { /* private mode */ }
  }, JSON.stringify(save));
  await ctx.route(/supabase\.co/, route => route.abort());
  if (patch) await ctx.route(`**/assets/${patch.file}`, route => {
    controlRequests += 1;
    return route.fulfill({ status: 200, contentType: 'application/javascript', body: patch.text });
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 180)));
  await page.goto(`${BASE}/soccer-career`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('[data-career-recorded-stats]', { timeout: 45000 });
  await page.waitForTimeout(600);
  return { ctx, page, errors };
}
const saved = page => page.evaluate(() => localStorage.getItem('soccerCareerSave'));
const totals = page => page.locator('[data-career-recorded-stats]').innerText();
const scroll = page => page.evaluate(() => window.scrollY);
const focusIn = (page, selector) => page.evaluate(sel => document.querySelector(sel)?.contains(document.activeElement) ?? false, selector);
async function keyOpen(page, selector) {
  const button = page.locator(selector);
  await button.evaluate(el => el.focus({ preventScroll: true }));
  const y = await scroll(page);
  await page.keyboard.press('Enter');
  return y;
}
async function snapshot(page, name) {
  await page.screenshot({ path: path.join(SHOTS, name), fullPage: false });
}
async function withinViewport(page, selector) {
  return page.evaluate(sel => {
    const el = document.querySelector(sel);
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return r.left >= -1 && r.top >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1;
  }, selector);
}
async function preserved(page, bytes, card, label) {
  check(await saved(page) === bytes && await totals(page) === card, `${label}: career save bytes and recorded totals unchanged`);
}
async function recordedNumbers(section) {
  return section.locator('dl > div').evaluateAll(els => Object.fromEntries(els.map(el => [el.querySelector('dt')?.textContent.trim(), el.querySelector('dd')?.textContent.trim()])));
}
async function watchThrough(page, md) {
  for (let game = 1; game <= md; game += 1) {
    await page.waitForSelector('[data-matchday], [data-poster]', { timeout: 10000 });
    if (await page.locator('[data-poster]').count()) await page.locator('[data-centre-bar]').getByRole('button').filter({ hasText: /^▶/ }).first().click();
    await page.waitForSelector(`[data-matchday="${game}"]`, { timeout: 10000 });
    for (let offers = 0; offers < 4; offers += 1) {
      await page.waitForSelector('[data-full-time], [data-moment-offer]', { timeout: 10000 });
      if (await page.locator('[data-full-time]').count()) break;
      await page.locator('[data-moment-pass]').click();
      await page.waitForTimeout(50);
    }
    await page.waitForSelector('[data-full-time]', { timeout: 10000 });
    if (game < md) await page.locator('[data-centre-bar]').getByRole('button', { name: `▶ League game ${game + 1}`, exact: true }).click();
  }
}

async function opponents(width, height) {
  const tag = `${width}x${height} opponents`;
  const { ctx, page, errors } = await open(old, width, height);
  try {
    const bytes = await saved(page), card = await totals(page);
    const y = await keyOpen(page, '[data-watch-week-by-week]');
    await page.waitForSelector('[data-kickoff]', { timeout: 30000 });
    const why = await page.locator('[data-results-why]').innerText();
    check(why.startsWith('Results only:') && await page.locator('[data-centre-table]').count() === 0, `${tag}: old save stays results only with no invented table`);
    check(await scroll(page) === y && await withinViewport(page, '[data-season-centre] [role="dialog"]'), `${tag}: overlay fits and page scroll stays fixed`);
    await snapshot(page, `soccer-career-opponents-${width}-kickoff.png`);
    if (width < 768) await page.locator('[data-centre-fixtures]').click();
    const fixtureList = page.locator(width < 768 ? '[data-centre-stage] [data-fixtures]' : '[data-season-centre] aside[aria-label="Fixtures"] [data-fixtures]');
    const fixtures = await fixtureList.locator('[data-fixture-name]').allTextContents();
    const counts = new Map();
    for (const name of fixtures) counts.set(name.trim(), (counts.get(name.trim()) || 0) + 1);
    check(fixtures.length === 34 && counts.size === 17 && allowed.every(name => counts.get(name) === 2), `${tag}: 34 fixtures name each of the 17 real league opponents twice`);
    check(fixtures.every(name => allowed.includes(name.trim())) && !fixtures.includes('another club') && !fixtures.includes('Anderlecht'), `${tag}: no placeholder or own club among opponents`);
    await snapshot(page, `soccer-career-opponents-${width}-fixtures.png`);
    if (width < 768) await page.getByRole('button', { name: '← Back', exact: true }).click();
    await page.locator('[data-kickoff]').getByRole('button').filter({ hasText: /^▶/ }).first().click();
    await watchThrough(page, goalGame.md);
    const names = await page.locator('[data-score-bug]').evaluate(el => [el.parentElement.firstElementChild.textContent.trim(), el.parentElement.lastElementChild.textContent.trim()]);
    check(names.includes('Anderlecht') && names.some(name => allowed.includes(name)) && !names.includes('another club'), `${tag}: match score names Anderlecht and a real opponent (${names.join(' v ')})`);
    const feed = await page.locator('[data-clock-events]').innerText();
    check(feed.includes(`Goal, ${goalOpponent}`) && !feed.includes('another club'), `${tag}: opposition goal names ${goalOpponent} in league game ${goalGame.md}`);
    const score = await page.locator('[data-score-bug]').innerText();
    const expectedScore = goalGame.home ? `${goalGame.us}-${goalGame.them}` : `${goalGame.them}-${goalGame.us}`;
    check(score === expectedScore, `${tag}: named match keeps the derived score ${expectedScore}`);
    await snapshot(page, `soccer-career-opponents-${width}-match.png`);
    await page.locator('[data-centre-exit]').click();
    await page.waitForSelector('[data-season-centre]', { state: 'detached' });
    check(await scroll(page) === y, `${tag}: closing returns to the same page position`);
    await preserved(page, bytes, card, tag);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-watch-week-by-week]', { timeout: 45000 });
    await preserved(page, bytes, card, `${tag} reload`);
    const emptyY = await keyOpen(page, '[data-trophy-category="world"]');
    await page.waitForSelector('[data-trophy-cabinet]');
    check(await page.locator('[data-trophy-win]').count() === 0 && /win|won|yet/i.test(await page.locator('[data-trophy-cabinet]').innerText()), `${tag}: a zero World Cup tile opens an honest empty cabinet`);
    await page.keyboard.press('Escape');
    await page.waitForSelector('[data-trophy-cabinet]', { state: 'detached' });
    check(await scroll(page) === emptyY, `${tag}: Escape leaves the empty cabinet without moving the page`);
    await preserved(page, bytes, card, `${tag} empty cabinet`);
    check(errors.length === 0, `${tag}: no page errors${errors.length ? ` (${errors.join('; ')})` : ''}`);
  } finally { await ctx.close(); }
}

async function trophies(width, height) {
  const tag = `${width}x${height} trophies`;
  const { ctx, page, errors } = await open(winning, width, height);
  try {
    const bytes = await saved(page), card = await totals(page);
    for (const [category, flag] of Object.entries(categories)) {
      const expected = rows.filter(flag).slice().sort((a, b) => b.year - a.year);
      const selector = `[data-trophy-category="${category}"]`;
      const y = await keyOpen(page, selector);
      await page.waitForSelector('[data-trophy-cabinet]');
      check(await focusIn(page, '[data-trophy-cabinet]') && await withinViewport(page, '[data-trophy-cabinet] [role="dialog"]'), `${tag} ${category}: keyboard opens a focused dialog inside the viewport`);
      const buttons = page.locator('[data-trophy-win]');
      const years = await buttons.evaluateAll(els => els.map(el => Number(el.getAttribute('data-trophy-win'))));
      const labels = await buttons.allTextContents();
      check(JSON.stringify(years) === JSON.stringify(expected.map(r => r.year)) && labels.every((text, i) => text.includes(expected[i].club) && text.includes(`${expected[i].year}/${String(expected[i].year + 1).slice(-2)}`)), `${tag} ${category}: only saved winning seasons appear, newest first, with their clubs`);
      await page.keyboard.press('Tab');
      check(await focusIn(page, '[data-trophy-cabinet]'), `${tag} ${category}: Tab keeps focus in the cabinet`);
      if (category === 'league') {
        await page.getByRole('button', { name: 'Trophy cabinet help', exact: true }).click();
        await page.waitForSelector('[data-trophy-help]');
        check((await page.locator('[data-trophy-help]').innerText()).includes('Example:'), `${tag}: ? opens rules with a worked example`);
        await page.locator('[data-trophy-help-back]').click();
        await page.waitForSelector('[data-trophy-wins]');
      }
      await buttons.first().evaluate(el => el.focus({ preventScroll: true }));
      await page.keyboard.press('Enter');
      const row = expected[0];
      await page.waitForSelector(`[data-trophy-detail="${row.year}"]`);
      const detail = page.locator('[data-trophy-detail]');
      const text = await detail.innerText();
      const clubLine = await recordedNumbers(detail.locator('[aria-label="Club season totals"]'));
      check(text.includes(row.club) && text.includes(`${row.year}/${String(row.year + 1).slice(-2)}`) && clubLine.Apps === String(row.apps) && clubLine.Goals === String(row.goals) && clubLine.Assists === String(row.assists), `${tag} ${category}: detail shows that winning season's club, year and recorded totals`);
      if (['world', 'continental'].includes(category)) {
        const international = await recordedNumbers(detail.locator('[aria-label="International season totals"]'));
        check(international.Apps === String(row.intApps) && international.Goals === String(row.intGoals) && international.Assists === String(row.intAssists), `${tag} ${category}: international totals come from the saved season`);
      }
      const headingFocused = await detail.locator('h3').evaluate(el => el === document.activeElement);
      await page.keyboard.press('Tab');
      check(headingFocused && await focusIn(page, '[data-trophy-cabinet]'), `${tag} ${category}: Tab from the detail heading stays inside the cabinet`);
      const focusables = page.locator('[data-trophy-cabinet] [role="dialog"]').locator('button:not(:disabled), a[href]');
      await focusables.first().evaluate(el => el.focus({ preventScroll: true }));
      await page.keyboard.press('Shift+Tab');
      const wrapsBack = await focusables.last().evaluate(el => el === document.activeElement);
      await page.keyboard.press('Tab');
      const wrapsForward = await focusables.first().evaluate(el => el === document.activeElement);
      check(wrapsBack && wrapsForward && await scroll(page) === y, `${tag} ${category}: Shift+Tab and Tab wrap inside the dialog without moving the page`);
      if (category === 'league') await snapshot(page, `soccer-career-trophies-${width}-league-detail.png`);
      await page.locator('[data-trophy-back="wins"]').click();
      await page.waitForSelector('[data-trophy-wins]');
      check(await page.locator('[data-trophy-detail]').count() === 0 && await scroll(page) === y, `${tag} ${category}: All wins returns inside the cabinet without scrolling the page`);
      if (category === 'league') await snapshot(page, `soccer-career-trophies-${width}-league-wins.png`);
      if (category === 'league') await page.keyboard.press('Escape');
      else await page.locator('[data-trophy-back="career"]').click();
      await page.waitForSelector('[data-trophy-cabinet]', { state: 'detached' });
      const focused = await page.locator(selector).evaluate(el => el === document.activeElement);
      check(await scroll(page) === y && focused, `${tag} ${category}: Back or Escape restores the tile focus and page position`);
      await preserved(page, bytes, card, `${tag} ${category}`);
    }
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-trophy-category="league"]', { timeout: 45000 });
    await preserved(page, bytes, card, `${tag} reload`);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    check(!overflow && errors.length === 0, `${tag}: no sideways scroll or page errors${errors.length ? ` (${errors.join('; ')})` : ''}`);
  } finally { await ctx.close(); }
}

try {
  if (!process.env.BASE) {
    if (!fs.existsSync(path.join(DIST, 'index.html'))) throw new Error('dist/index.html is missing; run npm run build first');
    server = spawn(process.execPath, [path.join(ROOT, 'scripts/lib/hostLikeServer.mjs'), DIST, String(PORT)], { stdio: 'ignore' });
    await new Promise(resolve => setTimeout(resolve, 1200));
  }
  fs.mkdirSync(SHOTS, { recursive: true });
  browser = await pw.chromium.launch({ args: ['--no-sandbox', '--no-proxy-server'] });
  for (const [width, height] of [[390, 844], [1280, 900]]) {
    try { await opponents(width, height); } catch (e) { check(false, `${width}x${height} opponents walk threw: ${String(e.stack || e).slice(0, 400)}`); }
    try { await trophies(width, height); } catch (e) { check(false, `${width}x${height} trophies walk threw: ${String(e.stack || e).slice(0, 400)}`); }
  }
  if (CONTROL) check(controlRequests === 2, `control changed the served Season Centre for both viewports (${controlRequests} requests)`);
} catch (e) {
  check(false, String(e.stack || e).slice(0, 400));
} finally {
  await browser?.close();
  server?.kill();
}
console.log(`playSoccerCareerOpponents: ${checks} checks, ${failed} failed${CONTROL ? ' (CONTROL unnamed)' : ''}`);
process.exit(failed ? 1 : 0);
