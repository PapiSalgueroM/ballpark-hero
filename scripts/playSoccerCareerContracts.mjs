/** Actual Soccer Career route with recorded save structure and explicit simulated
 * contract terms. Verified club names come from the existing game pool.
 * Run after a completed build. BASE reuses a host; SHOTS receives evidence.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import pw from './lib/playwrightLoader.mjs';
import { bundleAwardsNight } from './lib/careerAwardsNightBundle.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const PORT = Number(process.env.PORT || 4584);
const BASE = process.env.BASE || `http://127.0.0.1:${PORT}`;
const SHOTS = path.resolve(ROOT, process.env.SHOTS || '.tmp-fx/shots');
const B = await bundleAwardsNight(ROOT, { extra: { contracts: 'src/lib/soccerCareerContracts.ts' } });
const captured = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/careerLeagueWorldSaves1100.json'), 'utf8')).saves.find(s => s.id === 'ere' && s.kind === 'player')?.state;
if (!captured) throw new Error('fixture refused: recorded player save absent');
const parent = B.soccer.FALLBACK_CLUBS.find(club => club.name === 'Real Madrid');
const destination = B.soccer.FALLBACK_CLUBS.find(club => club.name === 'Twente');
if (!parent || !destination) throw new Error('fixture refused: verified clubs absent from the game pool');
function fixture(label, age, overall, rating) {
  const career = structuredClone(captured);
  const row = career.seasons[career.seasons.length - 1];
  if (row.type !== 'playing') throw new Error('fixture refused: last recorded row is not playing');
  Object.assign(row, { club: parent.name, clubCountry: parent.country, clubTier: parent.tier,
    age: age - 1, apps: 32, leagueApps: 30, rating });
  Object.assign(career, { playerName: `Contract Fixture ${label}`, age, overall,
    pace: overall, shooting: overall, passing: overall, dribbling: overall, defending: overall,
    physical: overall, reflexes: overall, currentClub: parent.name, currentClubCountry: parent.country,
    currentClubTier: parent.tier, currentClubColor: parent.color, currentLeague: parent.league,
    weeklyWage: 100000, contractYearsLeft: 1, agentId: null, agentFeesPaid: 2,
    phase: 'transfer_window', pendingOffers: [], pendingLoanOffers: null, loan: null,
    pendingSummary: null, pendingBallonDor: null, pendingNews: [], pendingEvents: [],
    pendingAppealResult: null, transferSituation: { type: 'contract_expiry', offers: [] },
    isClubCaptain: false, captainClub: null, frozenOut: 0, badSeasonStreak: 0 });
  delete career.seasonMoments;
  B.soccer.repairCareer(career);
  if (JSON.stringify(B.soccer.repairCareer(structuredClone(career))) !== JSON.stringify(career)) throw new Error('fixture refused: repeated repair changes the save');
  return career;
}
const decline = fixture('Declining Veteran', 38, 76, 6.4);
const elite = fixture('Elite Veteran', 38, 90, 8.2);
const lowQuote = B.contracts.soccerExtensionQuote(decline);
const highQuote = B.contracts.soccerExtensionQuote(elite);
function clubMove(mode) {
  const career = fixture(mode === 'loan' ? 'Loan' : 'Sale', mode === 'loan' ? 21 : 26, 66, 5.9);
  career.contractYearsLeft = 4;
  const offer = { club: destination, contractYears: mode === 'loan' ? 1 : 3,
    wage: mode === 'loan' ? career.weeklyWage : 70000, transferFee: mode === 'loan' ? 0 : 8,
    isLoan: mode === 'loan' };
  career.transferSituation = { type: 'frozen_out', mode: mode === 'loan' ? 'loan_listed' : 'transfer_listed',
    reasons: ['Low minutes', 'Poor form', 'Below the club level'], offers: [offer] };
  const input = JSON.stringify(career);
  const moved = B.soccer.completeClubVerdictMove(career);
  if (moved.currentClub !== destination.name || moved.transferSituation?.type !== 'club_move'
    || JSON.stringify(career) !== input || B.soccer.completeClubVerdictMove(moved) !== moved) throw new Error('fixture refused: move is not complete, immutable and consumed once');
  return { before: career, moved, offer };
}
const moves = ['sale', 'loan'].map(clubMove);
let checks = 0, failed = 0, server = null, browser = null;
const check = (ok, label) => { checks += 1; console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}`); if (!ok) failed += 1; };
const bytes = page => page.evaluate(() => localStorage.getItem('soccerCareerSave'));
const terms = career => JSON.stringify({ club: career.currentClub, country: career.currentClubCountry,
  tier: career.currentClubTier, league: career.currentLeague, wage: career.weeklyWage,
  years: career.contractYearsLeft, fees: career.agentFeesPaid, netWorth: career.netWorth,
  earnings: career.totalEarnings, loan: career.loan, events: career.events, seasons: career.seasons });
check(lowQuote.weeklyWage === 80000 && highQuote.weeklyWage === 105000
  && lowQuote.contractYears === 1 && highQuote.contractYears === 1,
  'age 38: declining form quotes a pay cut while sustained elite form earns a smaller raise, both for one year');
async function open(career, width, height, selector) {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
  try {
    await context.addInitScript(serialized => {
      if (!sessionStorage.getItem('career-contract-harness')) {
        sessionStorage.setItem('career-contract-harness', '1');
        localStorage.setItem('cookie-consent', 'essential');
        localStorage.setItem('dukb-soccer-currency', 'EUR');
        localStorage.setItem('soccerCareerSave', serialized);
      }
    }, JSON.stringify(career));
    await context.route(/supabase\.co/, route => route.abort());
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(String(error).slice(0, 180)));
    await page.goto(`${BASE}/soccer-career`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.locator(`${selector}:visible`).waitFor({ timeout: 45000 });
    return { context, page, errors };
  } catch (error) { await context.close(); throw error; }
}
async function healthy(page, errors, label) {
  check(errors.length === 0 && await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${label}: no page errors or horizontal overflow`);
  const layout = await page.evaluate(() => {
    const terms = [...document.querySelectorAll('[data-contract-extension-wage], [data-club-move] p')];
    const buttons = [...document.querySelectorAll('[data-club-move] button')];
    return terms.every(el => el.scrollWidth <= el.clientWidth + 1)
      && buttons.every(el => el.getBoundingClientRect().height >= 30);
  });
  check(layout, `${label}: contract terms fit their boxes and move buttons meet the tap target floor`);
}
async function extension(career, width, height, label) {
  const { context, page, errors } = await open(career, width, height, '[data-contract-extension-wage]');
  const tag = `${width}x${height} ${label}`;
  try {
    const before = JSON.stringify(career), quote = B.contracts.soccerExtensionQuote(career);
    const wage = page.locator('[data-contract-extension-wage]:visible');
    check(await wage.innerText() === `Your club offers ${B.soccer.formatWage(quote.weeklyWage)} for ${quote.contractYears} year${quote.contractYears === 1 ? '' : 's'}.`
      && (await wage.locator('..').innerText()).includes(quote.rationale), `${tag}: actual screen prints the exact wage, term and reason`);
    check(await bytes(page) === before, `${tag}: displaying the quote preserves the complete save`);
    await healthy(page, errors, `${tag} quote`);
    await wage.locator('..').screenshot({ path: path.join(SHOTS, `soccer-career-contract-${width}-${label}-quote.png`) });
    const expected = JSON.stringify(B.soccer.signExtension(structuredClone(career)));
    await page.getByRole('button', { name: `Sign Extension with ${parent.name} 📝`, exact: true }).click();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('soccerCareerSave')).phase === 'playing');
    await page.locator('[data-signed-slip]:visible').waitFor();
    const signedBytes = await bytes(page), signed = JSON.parse(signedBytes);
    const newLines = signed.events.slice(career.events.length);
    check(signedBytes === expected && newLines.length === 1 && newLines[0].startsWith('📝 Signed 1-year extension'), `${tag}: one click saves the quoted deal and exactly one signing event`);
    check((await page.locator('[data-signed-slip]:visible').innerText()).includes(B.soccer.formatWage(quote.weeklyWage)), `${tag}: signed slip uses the saved wage`);
    await page.locator('[data-signed-slip]:visible').screenshot({ path: path.join(SHOTS, `soccer-career-contract-${width}-${label}-signed.png`) });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('[data-week-by-week]:visible').waitFor({ timeout: 45000 });
    check(await bytes(page) === signedBytes && await page.locator('[data-contract-extension-wage]').count() === 0, `${tag}: reload retains the exact terms and one event without opening another negotiation`);
    await healthy(page, errors, `${tag} signed reload`);
  } finally { await context.close(); }
}
async function renewal(career, width, height, label) {
  const expired = { ...structuredClone(career), contractYearsLeft: 0, transferSituation: { type: 'no_interest' } };
  const { context, page, errors } = await open(expired, width, height, 'button:has-text("Stay and fight for place 💪")');
  const tag = `${width}x${height} ${label} expired renewal`;
  try {
    const stay = page.getByRole('button', { name: 'Stay and fight for place 💪', exact: true });
    await stay.waitFor({ timeout: 45000 });
    check(await bytes(page) === JSON.stringify(expired), `${tag}: an expired deal is preserved until the stay action`);
    const expected = JSON.stringify(B.soccer.stayAtClub(structuredClone(expired)));
    await stay.click();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('soccerCareerSave')).phase === 'playing');
    await page.locator('[data-week-by-week]:visible').waitFor({ timeout: 45000 });
    const renewedBytes = await bytes(page), renewed = JSON.parse(renewedBytes);
    const lines = renewed.events.slice(expired.events.length);
    const quote = B.contracts.soccerExtensionQuote(expired, 'renewal');
    check(renewedBytes === expected && renewed.weeklyWage === quote.weeklyWage && renewed.contractYearsLeft === 1
      && lines.length === 1 && lines[0].startsWith('📝 Renewed contract'), `${tag}: actual stay action renews at the veteran wage for one year and logs once`);
    await page.screenshot({ path: path.join(SHOTS, `soccer-career-contract-${width}-${label}-renewed.png`), fullPage: false });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('[data-week-by-week]:visible').waitFor({ timeout: 45000 });
    check(await bytes(page) === renewedBytes, `${tag}: reload never repeats the renewal or changes its terms`);
    await healthy(page, errors, tag);
  } finally { await context.close(); }
}
async function acknowledge(move, width, height) {
  const mode = move.moved.transferSituation.mode;
  const { context, page, errors } = await open(move.moved, width, height, '[data-club-move]');
  const tag = `${width}x${height} ${mode}`;
  try {
    const before = JSON.stringify(move.moved);
    const panel = page.locator('[data-club-move]:visible');
    const text = await panel.innerText();
    check(await panel.getAttribute('data-club-move-mode') === mode && text.includes(`${parent.name} → ${destination.name}`)
      && text.includes(B.soccer.formatWage(move.moved.weeklyWage)) && move.moved.currentClub === destination.name,
      `${tag}: screen describes the already completed source and destination with actual saved terms`);
    check(await panel.getByRole('button').count() === 1 && await panel.locator('[data-club-move-continue]').count() === 1
      && !/Reject|Stay at|Choose a club/i.test(text), `${tag}: the club decision has one acknowledgement and no refusal or destination chooser`);
    check(mode === 'loan' ? move.moved.loan?.parentClub === parent.name
      && move.moved.weeklyWage === move.before.weeklyWage && move.moved.contractYearsLeft === move.before.contractYearsLeft
      && move.moved.agentFeesPaid === move.before.agentFeesPaid
      : move.moved.loan === null && move.moved.agentFeesPaid > move.before.agentFeesPaid
      && text.includes(`Transfer fee: €${move.offer.transferFee.toFixed(1)}M`), `${tag}: saved loan parent terms or paid sale fee match the actual move`);
    check(await bytes(page) === before, `${tag}: displaying the completed move does not apply it again`);
    await healthy(page, errors, `${tag} notification`);
    await panel.screenshot({ path: path.join(SHOTS, `soccer-career-contract-${width}-${mode}-move.png`) });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await panel.waitFor({ timeout: 45000 });
    check(await bytes(page) === before, `${tag}: reload preserves every byte of the completed move`);
    const expected = JSON.stringify(B.soccer.stayAtClub(structuredClone(move.moved)));
    await panel.locator('[data-club-move-continue]').click();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('soccerCareerSave')).phase === 'playing');
    await page.locator('[data-week-by-week]:visible').waitFor({ timeout: 45000 });
    const continuedBytes = await bytes(page), continued = JSON.parse(continuedBytes);
    check(continuedBytes === expected && terms(continued) === terms(move.moved)
      && continued.transferSituation === null && await page.locator('[data-club-move]').count() === 0,
      `${tag}: Continue clears the notice with no second fee, signing, contract change or loan change`);
    await page.screenshot({ path: path.join(SHOTS, `soccer-career-contract-${width}-${mode}-playing.png`), fullPage: false });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('[data-week-by-week]:visible').waitFor({ timeout: 45000 });
    check(await bytes(page) === continuedBytes && await page.locator('[data-club-move]').count() === 0, `${tag}: acknowledged move stays consumed after reload`);
    await healthy(page, errors, `${tag} playing reload`);
  } finally { await context.close(); }
}
try {
  if (!process.env.BASE) {
    if (!fs.existsSync(path.join(DIST, 'index.html'))) throw new Error('dist/index.html is missing; finish the build first');
    server = spawn(process.execPath, [path.join(ROOT, 'scripts/lib/hostLikeServer.mjs'), DIST, String(PORT)], { stdio: 'ignore' });
    await new Promise(resolve => setTimeout(resolve, 1200));
  }
  fs.mkdirSync(SHOTS, { recursive: true });
  browser = await pw.chromium.launch({ args: ['--no-sandbox', '--no-proxy-server'] });
  for (const [width, height] of [[320, 844], [390, 844], [430, 900], [1440, 900]]) {
    for (const [career, label] of [[decline, 'declining'], [elite, 'elite']]) {
      try { await extension(career, width, height, label); } catch (error) { check(false, `${width}x${height} ${label} journey threw: ${String(error.stack || error).slice(0, 400)}`); }
      try { await renewal(career, width, height, label); } catch (error) { check(false, `${width}x${height} ${label} renewal threw: ${String(error.stack || error).slice(0, 400)}`); }
    }
    for (const move of moves) {
      try { await acknowledge(move, width, height); } catch (error) { check(false, `${width}x${height} ${move.moved.transferSituation.mode} journey threw: ${String(error.stack || error).slice(0, 400)}`); }
    }
  }
} catch (error) { check(false, String(error.stack || error).slice(0, 400)); }
finally { await browser?.close(); server?.kill(); }
console.log(`playSoccerCareerContracts: ${checks} checks, ${failed} failed`);
process.exit(failed ? 1 : 0);
