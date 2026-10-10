/* Full-motion Chromium journey: newspaper, summary, the bottom-to-top list,
   result, reload and speech. The full career/season comes from an engine
   recording. Its completed winning ballot uses explicitly fictional names,
   saved votes, a matching season win/rank and cabinet award. No real results.
   Run after a completed build. BASE uses a host; SHOTS selects screenshots.
   Copied controls in simSoccerAwardReveal prove outcome assertions go red. */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import pw from './lib/playwrightLoader.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const PORT = Number(process.env.PORT || 4579);
const BASE = process.env.BASE || `http://127.0.0.1:${PORT}`;
const SHOTS = path.resolve(ROOT, process.env.SHOTS || '.tmp-fx/shots');
const recorded = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/careerLeagueWorldSaves1100.json'), 'utf8'));
const original = recorded.saves.find(save => save.id === 'ere' && save.kind === 'player')?.state;
if (!original) throw new Error('fixture refused: recorded ere career is absent');
const save = structuredClone(original);
const row = save.seasons.findLast(season => season.type === 'playing' && season.apps > 0);
if (!row) throw new Error('fixture refused: no recorded playing season');
save.playerName = 'Reveal Fixture';
save.seasons.forEach(season => { season.ballonDor = false; season.ballonDorRank = null; });
Object.assign(row, { ballonDor: true, ballonDorRank: 1, leagueTitle: false, domesticCup: false, championsLeague: false, worldCup: false, continentalCup: false, clubCupTitle: undefined });
const nominees = Array.from({ length: 10 }, (_, index) => ({ name: index === 0 ? save.playerName : `Fixture Candidate ${index + 1}`, points: 300 - index * 20, isPlayer: index === 0, nationality: save.nationality, club: index === 0 ? row.club : `Fixture Club ${index + 1}`, position: save.position, goals: index === 0 ? row.goals : 20 - index, trophies: [] }));
Object.assign(save, { phase: 'newspaper', pendingSummary: row, pendingBallonDor: { year: row.year, nominees, playerRank: 1, playerPoints: 300, playerNominated: true, moved: '' } });
save.awards = save.awards.filter(award => award.name !== "Ballon d'Or").concat({ year: row.year, name: "Ballon d'Or", emoji: '🏅' });
save.events = ["🏅 Won the Ballon d'Or!"];
save.story = [];
save.pendingNews = [
  { newspaper: 'Fixture Football', headline: "BALLON D'OR WINNER!", body: `${save.playerName} won the Ballon d'Or.`, type: 'milestone' },
  { newspaper: 'Fixture Debate', headline: "ROBBED? Ballon d'Or debate begins", body: 'The Ballon d\'Or ballot is settled. The list has not been shown yet.', type: 'negative' },
];
const frozenBallot = JSON.stringify(save.pendingBallonDor);
let checks = 0, failed = 0, server = null, browser = null;
const check = (ok, label) => { checks += 1; console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}`); if (!ok) failed += 1; };
const bytes = page => page.evaluate(() => localStorage.getItem('soccerCareerSave'));
const normalizeReveal = serialized => { const state = JSON.parse(serialized); delete state.pendingBallonDor.revealed; return JSON.stringify(state); };
async function noSpoiler(page, label) {
  const text = await page.locator('body').innerText();
  const ownTimeline = await page.locator(`[data-timeline-season="${row.year}"]`).innerText();
  const count = await page.locator('[data-trophy-category="ballon"]').getAttribute('aria-label');
  check(!/ROBBED|BALLON D'OR WINNER!|Won the Ballon d'Or|The best player in the world!/i.test(text) && !ownTimeline.includes('🏅') && count.startsWith("Ballon d'Or: 0."), `${label}: newspaper, own badge, award and trophy count do not announce the result`);
}
async function journey(width, height) {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'no-preference' });
  const tag = `${width}x${height}`;
  try {
    await context.addInitScript(serialized => {
      if (!sessionStorage.getItem('career-award-harness')) {
        sessionStorage.setItem('career-award-harness', '1');
        localStorage.setItem('cookie-consent', 'essential');
        localStorage.setItem('soccerCareerSave', serialized);
      }
    }, JSON.stringify(save));
    await context.route(/supabase\.co/, route => route.abort());
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(String(error).slice(0, 180)));
    await page.goto(`${BASE}/soccer-career`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.getByRole('button', { name: 'Continue to Season Summary →', exact: true }).waitFor({ timeout: 45000 });
    await noSpoiler(page, `${tag} newspaper`);
    await page.getByRole('button', { name: 'Continue to Season Summary →', exact: true }).click();
    await page.getByRole('heading', { name: 'Season Summary', exact: true }).waitFor();
    await noSpoiler(page, `${tag} summary`);
    await page.evaluate(year => {
      window.__awardFrames = [];
      const sample = () => {
        const card = document.querySelector('[data-award-night="ballon_dor"]');
        if (!card) return;
        const frame = { ranks: [...card.querySelectorAll('[data-award-rank]')].map(element => Number(element.dataset.awardRank)), winner: card.querySelector('[data-award-headline]')?.textContent.includes('WINNER!'), buttons: card.querySelectorAll('button').length, confetti: document.querySelectorAll('.animate-confetti-fall').length, count: document.querySelector('[data-trophy-category="ballon"]')?.getAttribute('aria-label'), medal: document.querySelector(`[data-timeline-season="${year}"]`)?.textContent.includes('🏅') };
        if (JSON.stringify(frame) !== JSON.stringify(window.__awardFrames.at(-1))) window.__awardFrames.push(frame);
      };
      new MutationObserver(sample).observe(document.body, { childList: true, subtree: true, attributes: true });
    }, row.year);
    await page.getByRole('button', { name: 'Continue →', exact: true }).click();
    const card = page.locator('[data-award-night="ballon_dor"]');
    await card.waitFor();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('soccerCareerSave')).phase === 'ballon_dor');
    const before = await bytes(page);
    await page.waitForSelector('[data-award-night="ballon_dor"][data-award-result="revealed"]', { timeout: 15000 });
    const frames = await page.evaluate(() => window.__awardFrames);
    const arrivals = frames.filter(frame => frame.ranks.length > 0);
    check(arrivals[0]?.ranks.join(',') === '10' && frames.some(frame => frame.ranks.length === 0), `${tag}: rank 10 arrives first after a waiting state`);
    check(arrivals.every(frame => frame.ranks.join(',') === Array.from({ length: frame.ranks.length }, (_, index) => 11 - frame.ranks.length + index).join(',')), `${tag}: only bottom ranks exist until higher ranks arrive`);
    const beforeTop = frames.filter(frame => !frame.ranks.includes(1));
    check(beforeTop.length > 0 && beforeTop.every(frame => !frame.winner && frame.buttons === 0 && !frame.medal && frame.count.startsWith("Ballon d'Or: 0.")), `${tag}: no headline, speech button, badge or own win count before top rank arrives`);
    check(frames.every(frame => frame.confetti === 0), `${tag}: no confetti spreads over any part of the screen`);
    const rendered = await card.locator('[data-award-rank]').allTextContents();
    check(rendered.length === 10 && rendered.every((text, index) => text.includes(nominees[index].name) && text.includes(`${nominees[index].points}pts`)), `${tag}: saved vote order and points determine the complete list`);
    check((await card.locator('[data-award-headline]').innerText()) === "BALLON D'OR WINNER!" && await card.getByRole('button', { name: /Cry through the whole thing/ }).count() === 1, `${tag}: correct winning result and speech choices arrive after the list`);
    check(normalizeReveal(await bytes(page)) === normalizeReveal(before), `${tag}: reveal writes only its seen flag, leaving exact career bytes intact`);
    await page.screenshot({ path: path.join(SHOTS, `soccer-career-award-${width}-revealed.png`), fullPage: false });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-award-night="ballon_dor"][data-award-result="revealed"]', { timeout: 45000 });
    check(await card.locator('[data-award-rank]').count() === 10 && await card.locator('[data-award-waiting]').count() === 0 && normalizeReveal(await bytes(page)) === normalizeReveal(before), `${tag}: reload retains the revealed result without rerolling the save`);
    const night = JSON.parse(await bytes(page)).pendingBallonDor;
    delete night.revealed;
    check(JSON.stringify(night) === frozenBallot, `${tag}: rank, nomination, win and every vote remain the completed saved ballot`);
    await card.getByRole('button', { name: /Cry through the whole thing/ }).click();
    await page.waitForSelector('[data-spoken-speech="tears"]');
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('soccerCareerSave')).pendingBallonDor?.speech?.id === 'tears');
    const spoken = JSON.parse(await bytes(page));
    check(spoken.pendingBallonDor.speech?.id === 'tears' && JSON.stringify(spoken.pendingBallonDor.nominees) === JSON.stringify(nominees) && spoken.pendingBallonDor.playerRank === 1 && spoken.seasons.find(season => season.year === row.year)?.ballonDor, `${tag}: actual speech saves once while votes, rank and season win stay frozen`);
    check(await page.locator('.animate-confetti-fall').count() === 0 && errors.length === 0 && await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${tag}: speech screen has no confetti, page errors or horizontal overflow`);
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
  for (const [width, height] of [[390, 844], [1280, 900]]) {
    try { await journey(width, height); } catch (error) { check(false, `${width}x${height} journey threw: ${String(error.stack || error).slice(0, 400)}`); }
  }
} catch (error) { check(false, String(error.stack || error).slice(0, 400)); }
finally { await browser?.close(); server?.kill(); }
console.log(`playSoccerCareerAwardReveal: ${checks} checks, ${failed} failed`);
process.exit(failed ? 1 : 0);
