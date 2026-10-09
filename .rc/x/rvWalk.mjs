/* Reviewer's walk, never committed. Runs on a runner against a served build (BASE). It PLAYS real careers with the
   branch's own engine (bundled the way the train's drivers bundle it) until it holds a save on every screen the
   ten rounds add or change, then opens each one in Chromium at 390x844 and 1280x900, with and without reduced
   motion, presses the real buttons, measures and takes screenshots into RC_OUT. The database host is blocked. */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || path.join(ROOT, '.tmp-fx/rvshots');
fs.mkdirSync(OUT, { recursive: true });
const { default: pw } = await import(pathToFileURL(path.join(ROOT, 'scripts/lib/playwrightLoader.mjs')).href);
const { bundleAwardsNight } = await import(pathToFileURL(path.join(ROOT, 'scripts/lib/careerAwardsNightBundle.mjs')).href);
const B = await bundleAwardsNight(ROOT, { extra: { world: 'src/lib/soccerCareerLeagueWorld.ts' } });
const E = B.soccer; const clubs = E.FALLBACK_CLUBS;
const log = [];
const say = (...a) => { const line = a.join(' '); console.log(line); log.push(line); };

function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function step(s, n) {
  switch (s.phase) {
    case 'youth': return E.advanceYouthYear(s, clubs);
    case 'playing': return E.advanceProSeason(s, clubs);
    case 'contract_offer': { const o = s.pendingOffers || []; return o.length ? E.acceptOffer(s, o[n % o.length]) : { ...s, phase: 'playing' }; }
    case 'rehab_choice': return E.applyRehabChoice(s, 1);
    case 'newspaper': return E.dismissNewspaper(s);
    case 'season_summary': return E.dismissSummary(s, clubs);
    case 'random_events': { const ev = s.pendingEvents?.[0]; if (!ev) return { ...s, pendingEvents: [], phase: 'playing' }; return E.applyEventChoice(s, ev.id === 9 ? n % 2 : 0, clubs); }
    case 'moral_dilemma': return s.pendingMoralDilemma ? E.applyMoralDilemmaChoice(s, 1) : E.dismissMoralDilemma(s, clubs);
    case 'social_media_action': return E.dismissSocialMediaPhase(s, clubs);
    case 'red_card_appeal_result': return E.dismissAppealResult(s, clubs);
    case 'international_debut': return E.dismissDebut(s, clubs);
    case 'world_cup': return E.dismissWorldCup(s, clubs);
    case 'rivalry_event': return E.dismissRivalryEvent(s, clubs);
    case 'ballon_dor': return E.dismissBallonDor(s, clubs);
    case 'transfer_window': return s.transferSituation?.type === 'contract_expiry' ? E.signExtension(s) : E.stayAtClub(s);
    case 'retirement_suggestion': return E.declineRetirementSuggestion(s, clubs);
    default: throw new Error(`no move for ${s.phase}`);
  }
}
const LOWER = ['Championship', '2. Bundesliga', 'Ligue 2', 'Serie B', 'Segunda Division'];
const WANT = {
  relegated: s => s.phase === 'season_summary' && s.pendingSummary?.leagueWorld?.movement?.kind === 'relegated',
  promoted: s => s.phase === 'season_summary' && s.pendingSummary?.leagueWorld?.movement?.kind === 'promoted',
  bdor: s => s.phase === 'ballon_dor' && !!s.pendingBallonDor && s.pendingBallonDor.playerRank != null && s.pendingBallonDor.playerRank > 1,
  bdorwin: s => s.phase === 'ballon_dor' && s.pendingBallonDor?.playerRank === 1,
  movesale: s => s.phase === 'transfer_window' && s.transferSituation?.type === 'club_move' && s.transferSituation.mode === 'sale',
  moveloan: s => s.phase === 'transfer_window' && s.transferSituation?.type === 'club_move' && s.transferSituation.mode === 'loan',
  expiryvet: s => s.phase === 'transfer_window' && s.transferSituation?.type === 'contract_expiry' && s.age >= 34,
  expiry30: s => s.phase === 'transfer_window' && s.transferSituation?.type === 'contract_expiry' && s.age >= 30 && s.age < 34,
  banned: s => s.phase === 'season_summary' && (s.pendingSummary?.suspensionMatches ?? 0) > 0,
  appeal: s => s.phase === 'red_card_appeal_result',
  cabinet: s => s.phase === 'playing' && (s.seasons.at(-1)?.year ?? 0) >= 2030 && s.seasons.filter(r => r.clubCupRun).length >= 2 && s.seasons.some(r => r.leagueTitle) && s.seasons.some(r => r.domesticCup),
  lower: s => s.phase === 'season_summary' && LOWER.includes(s.pendingSummary?.leagueWorld?.league) && !s.pendingSummary?.leagueWorld?.movement,
  segunda: s => s.phase === 'season_summary' && s.pendingSummary?.leagueWorld?.league === 'Segunda Division',
};
const found = {};
const realRandom = Math.random;
const POS = ['ST', 'CM', 'CB', 'GK', 'LW', 'RB'];
const NAT = ['England', 'Spain', 'Italy', 'Germany', 'France', 'Spain'];
const facts = { careers: 0, worldRows: 0, moved: 0, relegated: 0, promoted: 0, clubMoves: 0, bans: 0 };
for (let n = 0; n < 400 && Object.keys(found).length < Object.keys(WANT).length; n += 1) {
  const seed = 31000 + n;
  const ovr = [60, 66, 72, 80, 86][n % 5];
  Math.random = seeded(seed);
  const st = { pace: ovr, shooting: ovr, passing: ovr, dribbling: ovr, defending: ovr, physical: ovr, reflexes: ovr };
  let s = E.initCareer(`Walk ${seed}`, NAT[n % 6], POS[n % 6], '2020s', st, ovr, 2020, clubs, null, 88);
  facts.careers += 1;
  try {
    for (let guard = 0; guard < 1500 && !s.retired; guard += 1) {
      for (const [key, test] of Object.entries(WANT)) if (!found[key] && test(s)) { found[key] = JSON.parse(JSON.stringify(s)); say(`[search] ${key}: seed ${seed}, ${s.currentClub}, year ${s.seasons.at(-1)?.year}, age ${s.age}`); }
      if (s.phase === 'season_summary' && s.pendingSummary?.leagueWorld) { facts.worldRows += 1; const m = s.pendingSummary.leagueWorld.movement; if (m) { facts.moved += 1; facts[m.kind] += 1; } }
      if (s.phase === 'transfer_window' && s.transferSituation?.type === 'club_move') facts.clubMoves += 1;
      if (s.phase === 'season_summary' && s.pendingSummary?.suspensionMatches) facts.bans += 1;
      s = step(s, n);
    }
  } catch (e) { say(`[search] seed ${seed} THREW in the engine: ${String(e.stack || e).slice(0, 400)}`); }
}
Math.random = realRandom;
say(`[search] ${facts.careers} careers, ${facts.worldRows} league world seasons, his club moved in ${facts.moved} (${facts.relegated} down, ${facts.promoted} up), ${facts.clubMoves} club arranged moves, ${facts.bans} seasons with a served ban`);
say(`[search] found: ${Object.keys(found).join(', ')}; missing: ${Object.keys(WANT).filter(k => !found[k]).join(', ') || 'none'}`);
fs.writeFileSync(path.join(OUT, 'rv-walk-saves.json'), JSON.stringify(found));

/* ─── the browser ─── */
const browser = await pw.chromium.launch({ args: ['--no-sandbox', '--no-proxy-server'] });
const measures = [];
const wide = page => page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - innerWidth));
const text = async (page, sel) => (await page.locator(sel).allTextContents()).map(t => t.replace(/\s+/g, ' ').trim()).join(' | ');
async function open(key, width, height, motion) {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion: motion });
  await context.addInitScript(bytes => {
    if (!sessionStorage.getItem('rv-walk')) {
      sessionStorage.setItem('rv-walk', '1');
      localStorage.setItem('soccerCareerSave', bytes);
      localStorage.setItem('cookie-consent', 'essential');
      localStorage.setItem('seasonCentre:help', '1');
    }
  }, JSON.stringify(found[key]));
  await context.route(/supabase\.co/, route => route.abort());
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 200)));
  return { context, page, errors };
}
const tagOf = (key, width, motion) => `${key}-${width}-${motion === 'reduce' ? 'still' : 'motion'}`;
const shot = (page, name) => page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: false });
async function visit(key, width, height, motion, extra) {
  if (!found[key]) return;
  const tag = tagOf(key, width, motion);
  const { context, page, errors } = await open(key, width, height, motion);
  const m = { tag, maxWide: 0, notes: [] };
  try {
    await page.goto(`${BASE}/soccer-career`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => (document.querySelector('#root')?.textContent?.length ?? 0) > 400, null, { timeout: 45000 });
    if (key.startsWith('bdor')) {
      /* the award night: early, middle and settled frames, and how wide the page gets on the way */
      for (const [at, label] of [[350, 'a'], [1800, 'b'], [4200, 'c'], [8000, 'd']]) {
        await page.waitForTimeout(at - (m.t ?? 0)); m.t = at;
        m.maxWide = Math.max(m.maxWide, await wide(page));
        const buttons = await text(page, 'button:visible');
        m.notes.push(`${at} ms: Continue ${/Continue/.test(buttons) ? 'shown' : 'not shown'}; winner line ${JSON.stringify((await text(page, '[data-awards-winner], [data-bdor-winner], .cm-slam')).slice(0, 120))}`);
        if (label !== 'b' || motion !== 'reduce') await shot(page, `${tag}-${label}`);
      }
    } else {
      await page.waitForTimeout(motion === 'reduce' ? 900 : 2600);
      m.maxWide = Math.max(m.maxWide, await wide(page));
      await shot(page, tag);
    }
    if (extra) await extra(page, m, tag);
    m.maxWide = Math.max(m.maxWide, await wide(page));
  } catch (e) { m.notes.push(`WALK ERROR ${String(e.message || e).slice(0, 300)}`); try { await shot(page, `${tag}-error`); } catch { /* closed */ } }
  m.errors = errors;
  measures.push(m);
  say(`[walk] ${tag}: page at most ${m.maxWide} px wider than the window; ${errors.length} page errors${errors.length ? ` (${errors.join('; ')})` : ''}`);
  for (const n of m.notes) say(`[walk]   ${n}`);
  await context.close();
}
async function centre(page, m, tag) {
  m.notes.push(`summary world line: ${await text(page, '[data-summary-league-world]')}`);
  m.notes.push(`summary movement line: ${await text(page, '[data-summary-club-movement]')}`);
  const watch = page.locator('[data-watch-week-by-week]:visible');
  if (!(await watch.count())) { m.notes.push('no Watch week by week button on this summary'); return; }
  await watch.first().click();
  await page.locator('[data-season-centre]:visible').first().waitFor({ timeout: 30000 });
  await page.waitForTimeout(700);
  await shot(page, `${tag}-kickoff`);
  const straight = page.getByRole('button', { name: /Straight to the final table/ });
  if (await straight.count()) {
    await straight.first().click();
    await page.locator('[data-review]:visible').waitFor({ timeout: 30000 });
    await page.waitForTimeout(500);
    await shot(page, `${tag}-final`);
    m.notes.push(`review text: ${(await text(page, '[data-review]')).slice(0, 420)}`);
    m.notes.push(`table rows shown: ${await page.locator('[data-centre-table]:visible [data-club]').count()}`);
  } else m.notes.push(`no final table button; the centre says: ${(await text(page, '[data-season-centre]')).slice(0, 300)}`);
  const tabs = await page.locator('[data-centre-competition]:visible').evaluateAll(els => els.map(el => el.getAttribute('data-centre-competition')));
  m.notes.push(`competition tabs: ${tabs.join(', ') || 'none'}`);
  for (const id of tabs.filter(t => t !== 'league')) {
    await page.locator(`[data-centre-competition="${id}"]:visible`).first().click();
    await page.waitForTimeout(500);
    await shot(page, `${tag}-tab-${id}`);
    const first = page.locator('[data-centre-cup-open="0"]:visible');
    if (await first.count()) { await first.click(); await page.waitForTimeout(300); await shot(page, `${tag}-tab-${id}-game`); m.notes.push(`${id} game: ${(await text(page, '[data-centre-cup-game]')).slice(0, 200)}`); }
  }
  m.maxWide = Math.max(m.maxWide, await wide(page));
}
async function cabinet(page, m, tag) {
  const tiles = await page.locator('[data-trophy-category]').evaluateAll(els => els.map(el => `${el.getAttribute('data-trophy-category')}=${el.textContent.replace(/\s+/g, ' ').trim()}`));
  m.notes.push(`trophy tiles: ${tiles.join('; ')}`);
  for (const cat of ['league', 'domestic', 'ucl']) {
    const tile = page.locator(`[data-trophy-category="${cat}"]`).first();
    if (!(await tile.count())) continue;
    await tile.scrollIntoViewIfNeeded();
    await tile.click();
    await page.locator('[data-trophy-cabinet]').waitFor({ timeout: 20000 });
    await page.waitForTimeout(500);
    await shot(page, `${tag}-cab-${cat}`);
    m.notes.push(`cabinet ${cat}: ${(await text(page, '[data-trophy-cabinet]')).slice(0, 260)}`);
    const win = page.locator('[data-trophy-win]:visible').first();
    if (await win.count()) { await win.click(); await page.waitForTimeout(400); await shot(page, `${tag}-cab-${cat}-win`); m.notes.push(`cabinet ${cat} win: ${(await text(page, '[data-trophy-detail]')).slice(0, 300)}`); }
    if (cat === 'league') { const help = page.locator('[data-trophy-cabinet] button[aria-label*="How"], [data-trophy-cabinet] button:has-text("?")').first(); if (await help.count()) { await help.click(); await page.waitForTimeout(300); await shot(page, `${tag}-cab-help`); m.notes.push(`cabinet help: ${(await text(page, '[data-trophy-help]')).slice(0, 300)}`); } }
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    if (await page.locator('[data-trophy-cabinet]').count()) { await page.keyboard.press('Escape'); await page.waitForTimeout(300); }
    if (await page.locator('[data-trophy-cabinet]').count()) { m.notes.push(`cabinet ${cat}: Escape did not close it`); const back = page.locator('[data-trophy-back]:visible').first(); if (await back.count()) await back.click(); }
  }
  const replays = page.locator('[data-open-season-replays]').first();
  if (await replays.count()) {
    await replays.scrollIntoViewIfNeeded(); await replays.click();
    await page.locator('[data-season-picker]').waitFor({ timeout: 20000 });
    await page.waitForTimeout(400);
    await shot(page, `${tag}-picker`);
    m.notes.push(`picker: ${await page.locator('[data-replay-row]').count()} rows, ${await page.locator('[data-replay-locked]').count()} locked`);
  }
}
async function move(page, m, tag) {
  m.notes.push(`card: ${(await text(page, '[data-club-move]')).slice(0, 400)}`);
  const go = page.locator('[data-club-move-continue]:visible');
  if (!(await go.count())) { m.notes.push('NO continue button on the club move card'); return; }
  await go.click();
  await page.waitForTimeout(900);
  await shot(page, `${tag}-after`);
  const saved = JSON.parse(await page.evaluate(() => localStorage.getItem('soccerCareerSave')));
  m.notes.push(`after Continue: phase ${saved.phase}, club ${saved.currentClub}, league ${saved.currentLeague}, tier ${saved.currentClubTier}, loan ${saved.loan ? `from ${saved.loan.parentClub}` : 'none'}, contract ${saved.contractYearsLeft}y`);
}
const expiry = async (page, m) => { m.notes.push(`extension line: ${await text(page, '[data-contract-extension-wage]')}; age ${found.expiryvet?.age ?? ''}`); };
const plain = async (page, m) => { m.notes.push(`screen text: ${(await page.evaluate(() => document.querySelector('main, #root').innerText.replace(/\s+/g, ' ').slice(0, 500)))}`); };

const VIEWS = [[390, 844, 'reduce'], [390, 844, 'no-preference'], [1280, 900, 'reduce'], [1280, 900, 'no-preference']];
for (const [w, h, motion] of VIEWS) {
  const lite = w === 1280 && motion === 'no-preference';
  await visit('relegated', w, h, motion, centre);
  await visit('bdor', w, h, motion);
  await visit('bdorwin', w, h, motion);
  await visit('cabinet', w, h, motion, cabinet);
  await visit('movesale', w, h, motion, move);
  if (lite) continue;
  await visit('promoted', w, h, motion, centre);
  await visit('segunda', w, h, motion, centre);
  await visit('lower', w, h, motion, centre);
  await visit('moveloan', w, h, motion, move);
  await visit('expiryvet', w, h, motion, expiry);
  await visit('expiry30', w, h, motion, expiry);
  await visit('banned', w, h, motion, plain);
  await visit('appeal', w, h, motion, plain);
}
await browser.close();
fs.writeFileSync(path.join(OUT, 'rv-walk-log.txt'), log.join('\n'));
fs.writeFileSync(path.join(OUT, 'rv-walk-measures.json'), JSON.stringify(measures, null, 1));
const over = measures.filter(m => m.maxWide > 1 || m.errors.length || m.notes.some(n => n.startsWith('WALK ERROR')));
console.log(`rvWalk: ${measures.length} visits, ${over.length} with overflow, a page error or a walk error`);
process.exit(0);
