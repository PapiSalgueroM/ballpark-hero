/* Round BHG served walk (runner only, never committed): the 2023 Premier League Season Centre after PR278.
   A fictional saved boundary (the PR proof's own "table" and "severe" fixtures: an invented player at Arsenal in
   2023), opened from the season summary at 390x844 and 1280x900. Checks the fixture list, the kickoff table, the
   first Luton meeting's score bug, the final table and the review note, save bytes, page errors and overflow.
   The table checks run at 1280 only: the phone draws a five row window around his club, not the whole table.
   BASE is the served build (default http://localhost:4173). SHOTS is where screenshots go.
   LUTON_WALK_CONTROL=main points the same Luton checks at a build of main (BASE of the base server): every Luton
   check must go red while every base check stays green, then the run exits 1 with CONTROL FIRED. */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const { default: pw } = await import(pathToFileURL(path.join(ROOT, 'scripts/lib/playwrightLoader.mjs')).href);
const { bundleAwardsNight } = await import(pathToFileURL(path.join(ROOT, 'scripts/lib/careerAwardsNightBundle.mjs')).href);
const BASE = (process.env.BASE || 'http://localhost:4173').replace(/\/$/, '');
const SHOTS = path.resolve(process.env.SHOTS || path.join(ROOT, '.tmp-fx/luton-shots'));
const CONTROL = process.env.LUTON_WALK_CONTROL || '';
if (CONTROL && CONTROL !== 'main') { console.log(`lutonWalk: CONTROL ABORTED unknown control ${CONTROL}`); process.exit(3); }
fs.mkdirSync(SHOTS, { recursive: true });
const tally = { luton: [0, 0], base: [0, 0] };
const check = (ok, kind, label) => { tally[kind][0] += 1; if (!ok) tally[kind][1] += 1; console.log(`${ok ? 'ok  ' : 'FAIL'} [${kind}] ${label}`); return ok; };

const { soccer, season: S, core: C } = await bundleAwardsNight(ROOT, { extra: { season: 'src/lib/season/soccer.ts', core: 'src/lib/season/core.ts' } });
const clubs = soccer.FALLBACK_CLUBS;
const arsenal = clubs.find(c => c.name === 'Arsenal');
if (!arsenal) { console.log('lutonWalk: CONTROL ABORTED fixture refused, no Arsenal'); process.exit(3); }
const recorded = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/careerLeagueWorldSaves1100.json'), 'utf8'));
const original = recorded.saves.find(s => s.id === 'ere' && s.kind === 'player')?.state;
if (!original) { console.log('lutonWalk: CONTROL ABORTED fixture refused, no ere save'); process.exit(3); }
function fixture(severe) {
  const save = structuredClone(original);
  const row = { year: 2023, age: 26, club: 'Arsenal', clubCountry: 'England', clubTier: arsenal.tier,
    apps: severe ? 14 : 32, leagueApps: severe ? 14 : 30, goals: severe ? 4 : 10, assists: severe ? 3 : 6, cleanSheets: 0,
    yellowCards: 2, redCards: 0, rating: 7.2, injury: severe ? 'ACL' : null, injuryWeeks: severe ? 28 : 0, injurySevere: severe,
    leagueTitle: !severe, leagueFinish: severe ? undefined : 1, leagueSize: severe ? undefined : 20,
    domesticCup: false, championsLeague: false, worldCup: false, ballonDor: false, ballonDorRank: null,
    type: 'playing', intApps: 0, intGoals: 0, intAssists: 0, intRating: 0, tournament: null, tournamentResult: null };
  Object.assign(save, { playerName: 'Display fixture', position: 'ST', seasons: [row], awards: [], phase: 'season_summary', pendingSummary: row,
    currentClub: arsenal.name, currentClubCountry: arsenal.country, currentClubTier: arsenal.tier, currentClubColor: arsenal.color, currentLeague: arsenal.league,
    phone: { ...save.phone, world: { year: 2023, leagues: {}, ucl: '' } } });
  delete save.seasonMoments;
  const derived = C.deriveSeason(S.SOCCER, row, S.buildSoccerSeasonCtx(save, clubs, row));
  const slot = derived.labels.findIndex(l => !l.named);
  const first = derived.games.find(g => g.opp === slot);
  return { save, derived, slot, first };
}
const table = fixture(false), severe = fixture(true);
console.log(`fixture: table mode ${table.derived.mode}, unnamed slot ${table.slot}, first meeting md ${table.first?.md}; severe mode ${severe.derived.mode}`);
if (table.derived.mode !== 'table' || severe.derived.mode !== 'results' || table.slot < 1 || !table.first) { console.log('lutonWalk: CONTROL ABORTED fixture refused'); process.exit(3); }

let browser = null;
async function open(save, width, height) {
  const ctx = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
  await ctx.addInitScript(serialized => {
    try {
      if (!sessionStorage.getItem('luton-walk')) {
        sessionStorage.setItem('luton-walk', '1');
        localStorage.setItem('cookie-consent', 'essential');
        localStorage.setItem('soccerCareerSave', serialized);
        localStorage.setItem('seasonCentre:help', '1');
      }
    } catch { /* private mode */ }
  }, JSON.stringify(save));
  await ctx.route(/supabase\.co/, route => route.abort());
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 180)));
  await page.goto(`${BASE}/soccer-career`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('[data-watch-week-by-week]', { timeout: 45000 });
  await page.waitForTimeout(500);
  await page.locator('[data-watch-week-by-week]').click();
  await page.waitForSelector('[data-kickoff]', { timeout: 30000 });
  return { ctx, page, errors };
}
const saved = page => page.evaluate(() => localStorage.getItem('soccerCareerSave'));
const shot = (page, name) => page.screenshot({ path: path.join(SHOTS, name), fullPage: false });
const count = (text, needle) => text.split(needle).length - 1;
const overflow = page => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
async function fixtureNames(page, width) {
  if (width < 768) await page.locator('[data-centre-fixtures]').click();
  const list = page.locator(width < 768 ? '[data-centre-stage] [data-fixtures]' : '[data-season-centre] aside[aria-label="Fixtures"] [data-fixtures]');
  const names = (await list.locator('[data-fixture-name]').allTextContents()).map(n => n.trim());
  return names;
}
async function closeFixtures(page, width) {
  if (width < 768) await page.getByRole('button', { name: '← Back', exact: true }).click();
}
async function tableText(page) {
  const t = page.locator('[data-centre-table]');
  return (await t.count()) ? await t.first().innerText() : '';
}
async function watchThrough(page, md, word) {
  for (let game = 1; game <= md; game += 1) {
    await page.waitForSelector('[data-matchday], [data-poster]', { timeout: 10000 });
    if (await page.locator('[data-poster]').count()) await page.locator('[data-centre-bar]').getByRole('button').filter({ hasText: /^▶/ }).first().click();
    await page.waitForSelector(`[data-matchday="${game}"]`, { timeout: 10000 });
    for (let offers = 0; offers < 4; offers += 1) {
      await page.waitForSelector('[data-full-time], [data-moment-offer]', { timeout: 15000 });
      if (await page.locator('[data-full-time]').count()) break;
      await page.locator('[data-moment-pass]').click();
      await page.waitForTimeout(50);
    }
    await page.waitForSelector('[data-full-time]', { timeout: 15000 });
    if (game < md) await page.locator('[data-centre-bar]').getByRole('button', { name: `▶ ${word} ${game + 1}`, exact: true }).click();
  }
}

async function tableSeason(width, height) {
  const tag = `${width}x${height} table`;
  let { ctx, page, errors } = await open(table.save, width, height);
  try {
    const bytes = await saved(page);
    const header = await page.locator('[data-centre-header]').innerText();
    check(header.includes('Arsenal'), 'base', `${tag}: Season Centre opens on Arsenal (${header})`);
    const kickTable = await tableText(page);
    if (width >= 768) check(count(kickTable, 'Luton Town') === 1 && count(kickTable, 'another club') === 0, 'luton', `${tag}: kickoff table names Luton Town once and no placeholder`);
    check(kickTable.includes('Arsenal'), 'base', `${tag}: kickoff table is shown with Arsenal in it`);
    await shot(page, `luton-${width}-kickoff.png`);
    const names = await fixtureNames(page, width);
    const counts = new Map();
    for (const n of names) counts.set(n, (counts.get(n) || 0) + 1);
    check(names.length === 38 && counts.size === 19 && [...counts.values()].every(v => v === 2) && !names.includes('Arsenal'), 'base', `${tag}: 38 fixtures, 19 opponents twice each, own club never an opponent`);
    check(counts.get('Luton Town') === 2 && !counts.has('another club'), 'luton', `${tag}: Luton Town twice in the fixture list, no placeholder (${[...counts.keys()].filter(n => /Luton|another/.test(n)).join(', ') || 'none'})`);
    await shot(page, `luton-${width}-fixtures.png`);
    await closeFixtures(page, width);
    await page.getByRole('button', { name: '⏭ Straight to the final table', exact: true }).click();
    await page.waitForSelector('[data-review]', { timeout: 30000 });
    await page.waitForTimeout(400);
    const review = await page.locator('[data-review]').innerText();
    check(review.includes('2023/24 club membership is verified. Match order and results are simulated.'), 'luton', `${tag}: review carries the membership note`);
    const finalTable = await tableText(page);
    if (width >= 768) check(count(finalTable, 'Luton Town') === 1 && count(finalTable, 'another club') === 0, 'luton', `${tag}: final table names Luton Town once and no placeholder`);
    await shot(page, `luton-${width}-review.png`);
    check(await saved(page) === bytes, 'base', `${tag}: save bytes unchanged`);
    check(await overflow(page) <= 0, 'base', `${tag}: no horizontal overflow`);
    check(errors.length === 0, 'base', `${tag}: no page errors${errors.length ? ` (${errors.join('; ')})` : ''}`);
  } finally { await ctx.close(); }
  ({ ctx, page, errors } = await open(table.save, width, height));
  try {
    await page.locator('[data-kickoff]').getByRole('button').filter({ hasText: /^▶/ }).first().click();
    await watchThrough(page, table.first.md, 'Matchday');
    const names = await page.locator('[data-score-bug]').evaluate(el => [el.parentElement.firstElementChild.textContent.trim(), el.parentElement.lastElementChild.textContent.trim()]);
    check(names.includes('Arsenal'), 'base', `${tag}: league game ${table.first.md} score bug names Arsenal (${names.join(' v ')})`);
    check(names.includes('Luton Town') && !names.includes('another club'), 'luton', `${tag}: league game ${table.first.md} is Arsenal v Luton Town`);
    const score = await page.locator('[data-score-bug]').innerText();
    const g = table.first, expected = g.home ? `${g.us}-${g.them}` : `${g.them}-${g.us}`;
    check(score === expected, 'base', `${tag}: the meeting keeps the derived score ${expected}`);
    await shot(page, `luton-${width}-match.png`);
    check(errors.length === 0, 'base', `${tag} match: no page errors${errors.length ? ` (${errors.join('; ')})` : ''}`);
  } finally { await ctx.close(); }
}

async function severeSeason(width, height) {
  const tag = `${width}x${height} severe`;
  const { ctx, page, errors } = await open(severe.save, width, height);
  try {
    check((await page.locator('[data-results-why]').innerText()).startsWith('Results only:') && await page.locator('[data-centre-table]').count() === 0, 'base', `${tag}: severe season stays results only with no table`);
    const names = await fixtureNames(page, width);
    console.log(`${tag}: ${names.length} fixtures, Luton ${names.filter(n => n === 'Luton Town').length}, placeholder ${names.filter(n => n === 'another club').length}`);
    check(names.filter(n => n === 'Luton Town').length === 2 && !names.includes('another club'), 'luton', `${tag}: results season names Luton Town twice (the PR's severe arm)`);
    await shot(page, `luton-${width}-severe-fixtures.png`);
    check(errors.length === 0, 'base', `${tag}: no page errors${errors.length ? ` (${errors.join('; ')})` : ''}`);
  } finally { await ctx.close(); }
}

browser = await pw.chromium.launch();
try {
  for (const [w, h] of [[390, 844], [1280, 900]]) { await tableSeason(w, h); await severeSeason(w, h); }
} finally { await browser.close(); }
const [lt, lf] = tally.luton, [bt, bf] = tally.base;
console.log(`lutonWalk: luton checks ${lt - lf}/${lt}, base checks ${bt - bf}/${bt}`);
if (CONTROL) {
  if (bf === 0 && lf === lt && lt > 0) { console.log(`lutonWalk: CONTROL FIRED: main turned all ${lt} Luton checks red, ${bt} base checks green`); process.exit(1); }
  console.log(`lutonWalk: CONTROL ABORTED luton red ${lf}/${lt}, base red ${bf}/${bt}`); process.exit(3);
}
console.log(lf + bf === 0 ? `lutonWalk: PASS ${lt + bt} checks` : `lutonWalk: FAIL ${lf + bf} of ${lt + bt} checks`);
process.exit(lf + bf === 0 ? 0 : 1);
