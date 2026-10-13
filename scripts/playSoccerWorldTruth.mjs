/**
 * Round 1329 walk: Soccer Career's world tells the truth, on a phone and a desktop.
 *
 * Saves are driven on this tree's engine in node (Math.random pinned per seed), then planted from a page where the
 * app does not run (robots.txt on the same origin) and the game is opened:
 *   A  a career in the early 2010s, mid way, with a Player of the Month won: the phone's SportsFeed shows the
 *      honest line, no real name and no winner of a summer that happened (finals he played included), the Ball
 *      Quiz asks three questions and none about the world, and the Career
 *      Story prints every month with its own year.
 *   B  a career that missed the 2006 World Cup: the International card's history tile names no winner, the list
 *      prints "Watched from home" on that row, and the tournament card for a 2006 summer he missed (planted on
 *      screen) shows his own line, no champions line and no Bracket tile, its three tiles in a tidy grid.
 *   C  a career that missed the 2030 World Cup: the feed's framing line sits on top of its season, champion lines
 *      under it, the last tile names the winner and opens the bracket.
 * At 320 by 640, 390 by 844 and 1280 by 900: a picture of every case, and measured: window.scrollY and the
 * document height either side of opening and closing the history list, the size of the text this round wrote,
 * the height of every press it shows (the history list's Back button, h-8, is a known small press, owed).
 *
 * Control: WALK_CONTROL=pastfeed plants an old feed line naming a real man in save A: case A must go red.
 * The live database is blocked in every page (supabase.co aborted).
 * Run (a served build): BASE=http://localhost:4173 node scripts/playSoccerWorldTruth.mjs
 * Pictures and measurements go to $RC_OUT (or .tmp-fx/world-truth-walk).
 */
import './lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as esbuild from 'esbuild';
import pw from './lib/playwrightLoader.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = (process.env.BASE || 'http://localhost:4173').replace(/\/$/, '');
const OUT = path.resolve(process.env.RC_OUT || path.join(ROOT, '.tmp-fx/world-truth-walk'));
const CONTROL = process.env.WALK_CONTROL || '';
if (CONTROL && CONTROL !== 'pastfeed') { console.error(`WALK_CONTROL=${CONTROL} is not a control this walk knows`); process.exit(1); }
fs.mkdirSync(OUT, { recursive: true });
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'r1329-walk-'));

const out = path.join(TMP, 'head.mjs');
await esbuild.build({
  stdin: { contents: "export * as engine from './src/lib/soccerCareerEngine'; export * as truth from './src/lib/soccerWorldTruth'; export * as eras from './src/lib/careerEras'; export * as arcade from './src/lib/soccerArcade';", resolveDir: ROOT, loader: 'ts' },
  bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error', alias: { '@': path.join(ROOT, 'src') },
  define: { 'import.meta.env': '{"DEV":false,"PROD":true,"MODE":"production"}' },
});
const store = new Map();
globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), key: () => null, get length() { return store.size; }, clear: () => store.clear() };
const { engine: M, truth: T, eras: E, arcade: A } = await import(pathToFileURL(out).href);

const seeded = seed => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const stats = o => ({ pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o });
const copy = v => JSON.parse(JSON.stringify(v));
function drive(seed, nation, pos, ovr, pot, start, until) {
  const real = Math.random; Math.random = seeded(seed);
  try {
    const clubs = M.FALLBACK_CLUBS;
    let s = M.initCareer(`Walk ${seed}`, nation, pos, `${Math.floor(start / 10) * 10}s`, stats(ovr), ovr, start, clubs, null, pot);
    for (let g = 0; g < 500 && !s.retired; g += 1) {
      if (until(s)) return copy(s);
      const p = s.phase;
      s = p === 'youth' ? M.advanceYouthYear(s, clubs) : p === 'contract_offer' ? (s.pendingOffers?.length ? M.acceptOffer(s, s.pendingOffers[0]) : { ...s, phase: 'playing' })
        : p === 'playing' ? M.advanceProSeason(s, clubs) : p === 'newspaper' ? M.dismissNewspaper(s) : p === 'season_summary' ? M.dismissSummary(s, clubs)
        : p === 'rehab_choice' ? M.applyRehabChoice(s, 0) : p === 'random_events' ? M.applyEventChoice(s, 0, clubs) : p === 'moral_dilemma' ? M.dismissMoralDilemma(s, clubs)
        : p === 'social_media_action' ? M.dismissSocialMediaPhase(s, clubs) : p === 'red_card_appeal_result' ? M.dismissAppealResult(s, clubs)
        : p === 'international_debut' ? M.dismissDebut(s, clubs) : p === 'world_cup' ? M.dismissWorldCup(s, clubs) : p === 'rivalry_event' ? M.dismissRivalryEvent(s, clubs)
        : p === 'ballon_dor' ? M.dismissBallonDor(s, clubs) : p === 'transfer_window' ? M.stayAtClub(s) : p === 'retirement_suggestion' ? M.acceptRetirementSuggestion(s) : null;
      if (!s) return null;
    }
    return null;
  } finally { Math.random = real; }
}
const find = (label, tries, make) => { for (let i = 0; i < tries; i += 1) { const s = make(i); if (s) return s; } throw new Error(`no seed gave save ${label}`); };
const seen = s => (s.chanceWheel ? { ...s, chanceWheel: { ...s.chanceWheel, seen: true } } : s);
const world = s => s.phone?.world ?? null;
const springMonth = s => (s.awards || []).some(a => a.name === 'Player of the Month') && (s.story || []).concat([{ lines: s.events || [] }]).some(e => (e.lines || []).some(l => /Player of the Month \((January|February|March|April|May) /.test(l)));
const lastIntl = s => (s.intlHistory || []).at(-1) ?? null;
const ERA_NAMES = [...new Set(Array.from({ length: T.LAST_REAL_YEAR - 1989 }, (_, i) => E.getEraStars(1990 + i).map(st => st.name)).flat())];
const WORLD_Q = [/champions of Europe/, /^Who won /, / move to in /, / finish on in /];
const MONTH_LINE = /Player of the Month \((\w+) (\d{4})\)/g;

/* ─── the saves ─────────────────────────────────────────────────────────── */

const saveA = seen(find('A', 60, i => drive(1329000 + i, 'England', 'ST', 72, 93, 2006, s => s.phase === 'playing' && world(s) && world(s).year >= 2011 && world(s).year <= 2014 && springMonth(s))));
if (CONTROL === 'pastfeed') saveA.phone.feed = [...saveA.phone.feed, '🔄 DONE DEAL. Wayne Rooney joins Jeonbuk Motors from Man United. Fee around 100m.'];
const quizA = A.arcadeQuestions(copy(saveA)).map(q => q.q);
assert.equal(quizA.length, 3, 'save A has its three questions');
/* every month line the save holds, with the season it was written in */
const monthLinesA = [];
for (const e of saveA.story || []) for (const l of e.lines || []) for (const m of l.matchAll(MONTH_LINE)) monthLinesA.push({ line: m[0], month: m[1], year: Number(m[2]), season: e.year });
for (const l of saveA.events || []) for (const m of l.matchAll(MONTH_LINE)) monthLinesA.push({ line: m[0], month: m[1], year: Number(m[2]), season: saveA.seasons.at(-1).year });
const saveB = seen(find('B', 60, i => drive(1329100 + i, 'England', 'CB', 48, 70, 2000, s => s.phase === 'playing' && lastIntl(s)?.year === 2006 && s.lastTournament?.year === 2006 && !T.playedFinals(lastIntl(s).myResult))));
const cardB = { ...copy(saveB), phase: 'world_cup', pendingTournament: copy(saveB.lastTournament) };
assert.ok(['Did Not Qualify', 'Not Selected'].includes(cardB.pendingTournament.myResult), 'save B watched the 2006 summer from home');
const saveC = seen(find('C', 60, i => drive(1329200 + i, 'England', 'CB', 48, 70, 2024, s => s.phase === 'playing' && lastIntl(s)?.year === 2030 && world(s)?.year === 2030)));
console.log(`saves: A ${saveA.playerName} at ${saveA.currentClub}, world ${world(saveA).year}, ${monthLinesA.length} month lines; B ${saveB.playerName}, the ${saveB.lastTournament.name} ${saveB.lastTournament.year} won by ${saveB.lastTournament.champion} (his result "${lastIntl(saveB).myResult}"); C ${saveC.playerName}, the ${saveC.lastTournament.name} 2030 won by ${saveC.lastTournament.champion}`);

/* ─── the browser ───────────────────────────────────────────────────────── */

const report = { site: SITE, control: CONTROL || null, runs: [], failures: [], knownSmall: [] };
const failNote = m => { report.failures.push(m); console.error(`  FAIL: ${m}`); };
const browser = await pw.chromium.launch({ headless: true });
/* textContent, not innerText: a heading in uppercase reads EVERY TOURNAMENT in innerText */
const waitText = (page, text) => page.waitForFunction(t => document.body.textContent.includes(t), text, { timeout: 30000 });
const phoneText = page => page.evaluate(() => document.querySelector('[aria-label="Your phone"]')?.innerText ?? '');
const sweep = page => page.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 300) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); } });
const measure = page => page.evaluate(() => ({ scrollY: Math.round(window.scrollY), height: document.documentElement.scrollHeight, overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 }));
try {
  for (const [width, height] of [[320, 640], [390, 844], [1280, 900]]) {
    const tag = String(width);
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.route(/supabase\.co/, r => r.abort());
    const run = { tag, steps: [] };
    report.runs.push(run);
    const open = async save => {
      await page.goto(`${SITE}/robots.txt`);
      await page.evaluate(v => { localStorage.setItem('soccerCareerSave', v); localStorage.setItem('cookie-consent', 'essential'); }, JSON.stringify(save));
      await page.goto(`${SITE}/soccer-career`, { waitUntil: 'domcontentloaded' });
    };
    const step = async (name, fn) => {
      try { await fn(); run.steps.push(`${name} ok`); } catch (err) {
        failNote(`${tag} ${name}: ${err.message.split('\n')[0]}`); run.steps.push(`${name} broke`);
        await page.screenshot({ path: path.join(OUT, `${tag}-${name.replace(/ /g, '-')}-broke.png`), fullPage: true }).catch(() => {});
        const said = await page.evaluate(() => { const t = document.body.textContent.replace(/\s+/g, ' '); const i = t.indexOf('International Career'); return `${t.slice(0, 300)} ... [International Career at ${i}] ${i >= 0 ? t.slice(i, i + 500) : ''}`; }).catch(() => '');
        console.error(`    the page said: ${said}`);
      }
    };
    await step('A feed', async () => {
      await open(saveA);
      await page.locator('[data-career-utility="phone"]').first().click();
      await page.locator('[data-phone-app="news"]').click();
      await waitText(page, 'SportsFeed');
      await page.waitForTimeout(250);
      const text = await phoneText(page);
      await page.screenshot({ path: path.join(OUT, `${tag}-A-feed.png`) });
      if (!text.includes(T.feedPastSeasonLine(world(saveA).year))) failNote(`${tag} A: the feed does not show "${T.feedPastSeasonLine(world(saveA).year)}"`);
      const lines = text.split('\n').filter(l => !(saveA.rival && l.includes(`${saveA.rival.name} has left`)));
      const named = ERA_NAMES.filter(n => lines.some(l => l.includes(n)));
      if (named.length) failNote(`${tag} A: the feed of a season that happened names ${named.slice(0, 3).join(', ')}`);
      if (/Quiet window/.test(text)) failNote(`${tag} A: the feed shows the empty state`);
      /* The feed is world news: a summer that happened names no winner there, even finals he played (the
         review's finding 6). Save A played at least one such summer, so this check has something to hold. */
      const played = (saveA.intlHistory || []).filter(h => T.summerHappened(h.year) && T.playedFinals(h.myResult));
      if (!played.length) failNote(`${tag} A: save A played no finals in a summer that happened, so the feed's winner rule is not tested`);
      const winners = text.split('\n').map(l => l.trim()).filter(l => /^🌍 .+ win the .+\.$/u.test(l));
      if (winners.length) failNote(`${tag} A: the feed names the winner of a summer that happened: ${winners.slice(0, 2).join(' | ')}`);
      run.steps.push(`A feed: ${played.length} played summers (${played.map(h => `${h.year} ${h.myResult}`).join(', ')}), ${winners.length} winner lines`);
    });
    await step('A quiz', async () => {
      await page.locator('[data-phone-back]').first().click();
      await page.locator('[data-phone-app="arcade"]').click();
      await waitText(page, 'Question 1 of');
      await page.screenshot({ path: path.join(OUT, `${tag}-A-quiz.png`) });
      const asked = [];
      for (let i = 0; i < 3; i += 1) {
        await waitText(page, `Question ${i + 1} of 3`);
        const q = await page.evaluate(() => document.querySelector('[aria-label="Your phone"] p.text-\\[13px\\]')?.textContent ?? '');
        asked.push(q);
        await page.evaluate(() => { const p = document.querySelector('[aria-label="Your phone"] p.text-\\[13px\\]'); const b = p?.parentElement?.nextElementSibling?.querySelector('button'); b?.click(); });
        await page.getByRole('button', { name: i < 2 ? 'Next one' : 'See how you did' }).click();
      }
      if (asked.join('|') !== quizA.join('|')) failNote(`${tag} A: the quiz asked ${JSON.stringify(asked)}, the save gives ${JSON.stringify(quizA)}`);
      const world_ = asked.filter(q => WORLD_Q.some(re => re.test(q)));
      if (world_.length) failNote(`${tag} A: the quiz asked about the world of a season that happened: ${world_.join(' | ')}`);
    });
    await step('A story', async () => {
      await open(saveA);
      await page.locator('[data-open-career-story]').first().click();
      await page.waitForSelector('[data-story-tile]', { timeout: 30000 });
      const season = monthLinesA[0].season;
      await page.evaluate(year => { const t = [...document.querySelectorAll('[data-story-tile]')].find(b => b.querySelector('span span')?.textContent?.trim() === String(year)); t?.click(); }, season);
      await waitText(page, 'Player of the Month (');
      await page.screenshot({ path: path.join(OUT, `${tag}-A-story.png`) });
      const text = await page.evaluate(() => document.body.innerText);
      const shown = [...text.matchAll(MONTH_LINE)].map(m => ({ line: m[0], month: m[1], year: Number(m[2]) }));
      if (!shown.length) failNote(`${tag} A: the career story shows no month line`);
      for (const s of shown) {
        const saved = monthLinesA.find(x => x.line === s.line);
        if (!saved) { failNote(`${tag} A: "${s.line}" is not a line of the save`); continue; }
        if (s.year !== T.monthYear(s.month, saved.season)) failNote(`${tag} A: "${s.line}" in the ${saved.season} season is not the month's own year`);
      }
      run.steps.push(`A story: ${shown.length} month lines`);
    });
    await step('B history', async () => {
      await open(saveB);
      await sweep(page);
      await page.getByText('played out').first().waitFor({ state: 'attached', timeout: 30000 });
      const tiles = page.locator('button', { hasText: 'Tournaments' }).first();
      await tiles.scrollIntoViewIfNeeded();
      const lastTile = await page.evaluate(() => {
        const t = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Tournaments') && b.textContent.includes('played out'));
        const last = t?.nextElementSibling;
        const r1 = t?.getBoundingClientRect(), r2 = last?.getBoundingClientRect();
        return { text: last?.textContent ?? '', heights: [r1?.height ?? 0, r2?.height ?? 0] };
      });
      if (lastTile.text.includes('won it')) failNote(`${tag} B: the last tile names who won a 2006 he missed: "${lastTile.text}"`);
      if (!/Did not qualify|Left out|Watched from home/.test(lastTile.text)) failNote(`${tag} B: the last tile shows "${lastTile.text}", not his own line`);
      for (const h of lastTile.heights) if (h < 44) failNote(`${tag} B: a history tile is ${h} px tall`);
      const before = await measure(page);
      await tiles.click();
      await waitText(page, 'Every tournament');
      await page.waitForTimeout(200);
      await page.screenshot({ path: path.join(OUT, `${tag}-B-history.png`) });
      const list = await page.evaluate(champion => {
        const head = [...document.querySelectorAll('div')].find(d => d.textContent === 'Every tournament');
        const box = head?.parentElement;
        const home = [...(box?.querySelectorAll('span') ?? [])].filter(s => s.textContent === 'Watched from home').map(s => parseFloat(getComputedStyle(s).fontSize));
        const back = [...(box?.querySelectorAll('button') ?? [])].map(b => b.getBoundingClientRect().height);
        return { text: box?.innerText ?? '', named: (box?.innerText ?? '').includes(champion), home, back };
      }, saveB.lastTournament.champion);
      if (list.named) failNote(`${tag} B: the history list names ${saveB.lastTournament.champion} for a summer he missed`);
      if (!list.home.length) failNote(`${tag} B: the history list has no "Watched from home" row`);
      for (const size of list.home) if (size < 12) failNote(`${tag} B: "Watched from home" is ${size} px`);
      for (const h of list.back) if (h < 44) report.knownSmall.push(`${tag}: the history list's Back is ${Math.round(h)} px (h-8, owed)`);
      const opened = await measure(page);
      await page.locator('button', { hasText: 'Back' }).last().click();
      await page.getByText('played out').first().waitFor({ state: 'attached', timeout: 30000 });
      await page.waitForTimeout(200);
      const after = await measure(page);
      run.steps.push(`B scroll ${before.scrollY}/${before.height} -> open ${opened.scrollY}/${opened.height} -> closed ${after.scrollY}/${after.height}`);
      if (after.scrollY !== before.scrollY || after.height !== before.height) failNote(`${tag} B: the page moved, scrollY ${before.scrollY} to ${after.scrollY}, height ${before.height} to ${after.height}`);
      if (before.overflow || opened.overflow) failNote(`${tag} B: the page scrolls sideways`);
    });
    await step('B card', async () => {
      await open(cardB);
      const t = cardB.pendingTournament;
      await waitText(page, `${t.name} ${t.year}`);
      await page.waitForTimeout(250);
      await page.screenshot({ path: path.join(OUT, `${tag}-B-card.png`) });
      const card = await page.evaluate(() => {
        const tiles = [...document.querySelectorAll('[data-intl-tile]')];
        const grid = tiles[0]?.parentElement?.getBoundingClientRect();
        return { text: tiles[0]?.closest('.rounded-xl.border-2')?.innerText ?? '', keys: tiles.map(x => x.getAttribute('data-intl-tile')),
          widths: tiles.map(x => Math.round(x.getBoundingClientRect().width)), grid: Math.round(grid?.width ?? 0), heights: tiles.map(x => Math.round(x.getBoundingClientRect().height)) };
      });
      if (card.text.includes('Champions:') || card.text.includes('in the final')) failNote(`${tag} B card: a 2006 he did not qualify for names its champion`);
      if (card.keys.includes('bracket')) failNote(`${tag} B card: the Bracket tile is offered for a 2006 he missed`);
      if (card.keys.length !== 3) failNote(`${tag} B card: ${card.keys.length} tiles (${card.keys.join(', ')}), three expected`);
      else if (Math.abs(card.widths[2] - card.grid) > 2) failNote(`${tag} B card: the third tile is ${card.widths[2]} px in a ${card.grid} px grid, a hole beside it`);
      for (const h of card.heights) if (h < 44) failNote(`${tag} B card: a tile is ${h} px tall`);
      run.steps.push(`B card tiles ${card.keys.join('/')} widths ${card.widths.join('/')} of ${card.grid}`);
    });
    await step('C feed and bracket', async () => {
      await open(saveC);
      await page.locator('[data-career-utility="phone"]').first().click();
      await page.locator('[data-phone-app="news"]').click();
      await waitText(page, 'SportsFeed');
      await page.waitForTimeout(250);
      await page.screenshot({ path: path.join(OUT, `${tag}-C-feed.png`) });
      const text = await phoneText(page);
      const framing = T.feedFutureSeasonLine(2030);
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      const at = lines.indexOf(framing);
      if (at < 0) failNote(`${tag} C: the feed has no "${framing}"`);
      else if (!lines.slice(at + 1).some(l => / win | are champions of Europe/.test(l))) failNote(`${tag} C: no champion line sits under the framing line`);
      else if (lines.slice(0, at).some(l => / win | are champions of Europe|DONE DEAL/.test(l))) failNote(`${tag} C: a line of the season sits above its framing line`);
      await open(saveC);
      await sweep(page);
      await page.getByText('played out').first().waitFor({ state: 'attached', timeout: 30000 });
      const lastTile = page.locator('button', { hasText: 'won it' }).first();
      const label = await lastTile.textContent();
      if (!label.includes(`${saveC.lastTournament.champion} won it`)) failNote(`${tag} C: the last tile reads "${label}"`);
      await lastTile.scrollIntoViewIfNeeded();
      await lastTile.click();
      await waitText(page, `${saveC.lastTournament.name} 2030`);
      await page.screenshot({ path: path.join(OUT, `${tag}-C-bracket.png`) });
      const bracket = await page.evaluate(() => document.body.textContent.includes('Final'));
      if (!bracket) failNote(`${tag} C: the 2030 bracket does not open`);
    });
    await context.close();
  }
} finally { await browser.close(); }
fs.writeFileSync(path.join(OUT, 'world-truth-walk-report.json'), JSON.stringify(report, null, 2));
for (const r of report.runs) console.log(`${r.tag}: ${r.steps.join('; ')}`);
for (const k of [...new Set(report.knownSmall)]) console.log(`known small: ${k}`);
if (CONTROL) {
  const fired = report.failures.some(f => / A: /.test(f));
  console.log(`${fired ? 'FIRED' : 'DID NOT FIRE'}: WALK_CONTROL=${CONTROL} (${report.failures.length} failures)`);
  process.exit(1);
}
console.log(report.failures.length ? `playSoccerWorldTruth: ${report.failures.length} failures` : `playSoccerWorldTruth: green over ${report.runs.length} sizes`);
process.exit(report.failures.length ? 1 : 0);
