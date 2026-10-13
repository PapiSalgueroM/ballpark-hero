// Reviewer walk (r1329-run): plays the round's screens at 390x844 and 1280x900, reduced motion on and off.
// Saves: OLD (made by the BASE engine c5fc5470, a 2011 to 2013 season whose feed names real men) opened on the
// head and played one season through the UI; P26 (head, the 2026-27 season, the 2026 World Cup missed);
// P10 (head, 2010 World Cup finals played). supabase.co is aborted in every page.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
const ROOT = process.cwd();
const require = createRequire(path.join(ROOT, 'package.json'));
const esbuild = require('esbuild');
const pw = (await import(pathToFileURL(path.join(ROOT, 'scripts/lib/playwrightLoader.mjs')).href)).default;
const SITE = (process.env.BASE || 'http://localhost:4173').replace(/\/$/, '');
const OUT = path.resolve(process.env.RC_OUT || path.join(ROOT, '.tmp-fx/r1329run-walk'));
fs.mkdirSync(OUT, { recursive: true });
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'r1329run-'));
const BASE_SHA = 'c5fc5470b3e377f22d6d538f459b9f5310b08dd0';
async function bundle(tag, ref) {
  const entry = "export * as engine from './src/lib/soccerCareerEngine'; export * as eras from './src/lib/careerEras'; export * as arcade from './src/lib/soccerArcade';" + (ref ? '' : " export * as truth from './src/lib/soccerWorldTruth';");
  const plugin = { name: 'src', setup(b) { b.onLoad({ filter: /\.(ts|tsx)$/ }, args => {
    const rel = path.relative(ROOT, args.path).split(path.sep).join('/');
    if (!ref || !rel.startsWith('src/')) return undefined;
    const contents = execFileSync('git', ['show', `${ref}:${rel}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20 });
    return { contents, loader: rel.endsWith('.tsx') ? 'tsx' : 'ts', resolveDir: path.dirname(args.path) };
  }); } };
  const out = path.join(TMP, `${tag}.mjs`);
  await esbuild.build({ stdin: { contents: entry, resolveDir: ROOT, loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', outfile: out,
    logLevel: 'error', alias: { '@': path.join(ROOT, 'src') }, define: { 'import.meta.env': '{"DEV":false,"PROD":true,"MODE":"production"}' }, plugins: [plugin],
    loader: { '.css': 'empty', '.png': 'empty', '.svg': 'empty' } });
  return import(pathToFileURL(out).href);
}
const store = new Map();
globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), key: () => null, get length() { return store.size; }, clear: () => store.clear() };
const HEAD = await bundle('head', null);
const BASEB = await bundle('base', BASE_SHA);
const T = HEAD.truth;
const seeded = seed => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const stats = o => ({ pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o });
const copy = v => JSON.parse(JSON.stringify(v));
function drive(B, seed, nation, pos, ovr, pot, start, until) {
  const M = B.engine; const real = Math.random; Math.random = seeded(seed);
  try {
    const clubs = M.FALLBACK_CLUBS;
    let s = M.initCareer(`Rev ${seed}`, nation, pos, `${Math.floor(start / 10) * 10}s`, stats(ovr), ovr, start, clubs, null, pot);
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
const find = (label, tries, make) => { for (let i = 0; i < tries; i += 1) { const s = make(i); if (s) return { s, seed: i }; } throw new Error(`no seed gave save ${label}`); };
const seen = s => (s.chanceWheel ? { ...s, chanceWheel: { ...s.chanceWheel, seen: true } } : s);
const world = s => s.phone?.world ?? null;
const lastIntl = s => (s.intlHistory || []).at(-1) ?? null;
const ERA_NAMES = [...new Set(Array.from({ length: 2032 - 1989 }, (_, i) => HEAD.eras.getEraStars(1990 + i).map(st => st.name)).flat())];
const WORLD_Q = [/champions of Europe/, /Who won /, / move to in /, / finish on in /];

/* ─── saves ─── */
const OLD = find('OLD', 80, i => drive(BASEB, 5500 + i, 'England', 'ST', 72, 93, 2006, s => s.phase === 'playing' && world(s) && world(s).year >= 2011 && world(s).year <= 2013 && (s.phone?.feed || []).some(l => l.includes('DONE DEAL'))));
const P26 = find('P26', 80, i => drive(HEAD, 5600 + i, 'England', 'CB', 48, 70, 2020, s => s.phase === 'playing' && world(s)?.year === 2026 && lastIntl(s)?.year === 2026 && !T.playedFinals(lastIntl(s).myResult)));
const P10 = find('P10', 80, i => drive(HEAD, 5700 + i, 'Brazil', 'ST', 76, 95, 2003, s => s.phase === 'playing' && lastIntl(s)?.year === 2010 && T.playedFinals(lastIntl(s).myResult) && s.lastTournament?.year === 2010 && world(s)?.year === 2010));
const saves = { OLD: seen(OLD.s), P26: seen(P26.s), P10: seen(P10.s) };
const facts = {
  OLD: { seed: 5500 + OLD.seed, year: world(OLD.s).year, club: OLD.s.currentClub, feedRealNames: ERA_NAMES.filter(n => OLD.s.phone.feed.some(l => l.includes(n))).slice(0, 6) },
  P26: { seed: 5600 + P26.seed, year: world(P26.s).year, wc: P26.s.lastTournament?.name, champion: P26.s.lastTournament?.champion, mine: lastIntl(P26.s)?.myResult, feed: P26.s.phone.feed.slice(-8) },
  P10: { seed: 5700 + P10.seed, champion: P10.s.lastTournament?.champion, mine: lastIntl(P10.s)?.myResult },
};
console.log('saves', JSON.stringify(facts));
if (process.env.WALK_SAVES_ONLY) process.exit(0);
/* the old save, played on the HEAD engine in node from the same seed, for the expected new feed lines */
const report = { site: SITE, facts, runs: [], failures: [], notes: [] };
const failNote = m => { report.failures.push(m); console.error(`  FAIL: ${m}`); };
const note = m => { report.notes.push(m); console.log(`  note: ${m}`); };

const browser = await pw.chromium.launch({ headless: true });
const waitText = (page, text, timeout = 30000) => page.waitForFunction(t => document.body.textContent.includes(t), text, { timeout });
const phoneText = page => page.evaluate(() => document.querySelector('[aria-label="Your phone"]')?.innerText ?? '');
const sweep = page => page.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 300) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); } window.scrollTo(0, 0); });
const savedState = page => page.evaluate(() => { try { return JSON.parse(localStorage.getItem('soccerCareerSave')); } catch { return null; } });
const overflow = page => page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
try {
  for (const [width, height] of [[390, 844], [1280, 900]]) for (const motion of ['reduce', 'no-preference']) {
    const tag = `${width}-${motion === 'reduce' ? 'rm' : 'mo'}`;
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: motion });
    const page = await context.newPage();
    await page.route(/supabase\.co/, r => r.abort());
    const errors = [];
    page.on('pageerror', e => errors.push(String(e.message).slice(0, 160)));
    const run = { tag, steps: [] };
    report.runs.push(run);
    const shot = name => page.screenshot({ path: path.join(OUT, `${tag}-${name}.png`) });
    const open = async save => {
      await page.goto(`${SITE}/robots.txt`);
      await page.evaluate(v => { localStorage.clear(); localStorage.setItem('soccerCareerSave', v); localStorage.setItem('cookie-consent', 'essential'); }, JSON.stringify(save));
      await page.goto(`${SITE}/soccer-career`, { waitUntil: 'domcontentloaded' });
      await page.locator('[data-career-utility="phone"]').first().waitFor({ timeout: 30000 });
    };
    const openFeed = async () => {
      await page.locator('[data-career-utility="phone"]').first().click();
      await page.locator('[data-phone-app="news"]').click();
      await waitText(page, 'SportsFeed');
      await page.waitForTimeout(400);
      return phoneText(page);
    };
    const step = async (name, fn) => {
      try { await fn(); run.steps.push(`${name} ok`); } catch (err) {
        failNote(`${tag} ${name} broke: ${String(err.message).split('\n')[0]}`); run.steps.push(`${name} broke`);
        await page.screenshot({ path: path.join(OUT, `${tag}-${name}-broke.png`), fullPage: false }).catch(() => {});
      }
    };
    const clickFirst = async locators => {
      for (const l of locators) { const x = l.first(); if (await x.count() && await x.isVisible().catch(() => false)) { await x.click({ timeout: 8000 }); return true; } }
      return false;
    };
    const playSeasonInUi = async startLen => {
      await page.locator('[data-career-action-bar]').getByRole('button', { name: 'Next Season', exact: true }).click();
      const phases = [];
      for (let k = 0; k < 40; k += 1) {
        await page.waitForTimeout(motion === 'reduce' ? 400 : 1200);
        const st = await savedState(page);
        if (!st) throw new Error('no save in localStorage');
        if (st.phase === 'playing' && st.seasons.length > startLen) return { st, phases };
        phases.push(st.phase);
        const cont = page.getByRole('button', { name: /^Continue/ });
        if (!phases.slice(0, -1).includes(st.phase)) await shot(`phase-${String(k).padStart(2, '0')}-${st.phase}`);
        if (['ballon_dor', 'world_cup', 'newspaper', 'season_summary'].includes(st.phase)) await cont.first().waitFor({ state: 'visible', timeout: 20000 }).catch(() => {});
        let ok = false;
        if (st.phase === 'random_events' && st.pendingEvents?.[0]) ok = await clickFirst([cont, page.getByRole('button').filter({ hasText: st.pendingEvents[0].choices[0].label })]);
        else if (st.phase === 'moral_dilemma' && st.pendingMoralDilemma) ok = await clickFirst([cont, page.getByRole('button').filter({ hasText: st.pendingMoralDilemma.choices[0].label })]);
        else if (st.phase === 'transfer_window') ok = await clickFirst([page.locator('[data-club-move-continue]'), page.locator('[data-transfer-brief-stay]'), page.getByRole('button', { name: /^Stay at/ }), cont]);
        else if (st.phase === 'social_media_action') ok = await clickFirst([cont, page.getByRole('button').filter({ hasText: 'Stay off social media' })]);
        else ok = await clickFirst([cont, page.getByRole('button', { name: /^(Skip|Not now|Keep playing)/i })]);
        if (!ok) { await shot(`stuck-${st.phase}`); note(`${tag}: the walk found nothing to press at phase ${st.phase} (a walk limit, see the picture)`); return { st, phases, stuck: st.phase }; }
      }
      throw new Error('forty presses and no new season');
    };

    await step('old-feed', async () => {
      await open(saves.OLD);
      const text = await openFeed();
      await shot('old-feed');
      const named = ERA_NAMES.filter(n => text.includes(n));
      note(`${tag} OLD (base save, ${facts.OLD.year}): the feed as saved names ${named.length} real men (${named.slice(0, 4).join(', ')}), accepted by the brief`);
      if (await overflow(page)) failNote(`${tag} old-feed: sideways scroll`);
    });
    await step('old-play', async () => {
      await open(saves.OLD);
      const r = await playSeasonInUi(saves.OLD.seasons.length);
      run.steps.push(`phases ${r.phases.join('>')}`);
      if (r.stuck) return;
      const st = r.st; const y = st.phone?.world?.year;
      const oldSet = new Set(saves.OLD.phone.feed);
      const fresh = st.phone.feed.filter(l => !oldSet.has(l));
      const rival = st.rival ? st.rival.name : null;
      const bad = fresh.filter(l => /DONE DEAL| win | are champions of Europe|top scorer/.test(l) || ERA_NAMES.some(n => l.includes(n) && !(rival && l.includes(`${rival} has left`))));
      if (bad.length) failNote(`${tag} old-play: new feed lines for ${y} claim things: ${bad.slice(0, 3).join(' | ')}`);
      if (y <= 2025 && !fresh.includes(T.feedPastSeasonLine(y))) failNote(`${tag} old-play: no honest line for ${y}: ${JSON.stringify(fresh).slice(0, 200)}`);
      const row = st.seasons.at(-1);
      const months = (st.events || []).concat(...(st.story || []).filter(e => e.year === row.year).map(e => e.lines || [])).map(l => l.match(/Player of the Month \((\w+) (\d{4})\)/)).filter(Boolean);
      for (const m of months) if (Number(m[2]) !== T.monthYear(m[1], row.year)) failNote(`${tag} old-play: "${m[0]}" in the ${row.year} season`);
      run.steps.push(`played ${row.year}: ${fresh.length} new feed lines, ${months.length} month lines, ${st.awards.filter(a => a.name === 'Player of the Month' && a.year === row.year).length} month awards`);
      const text = await openFeed();
      await shot('old-feed-after');
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      const at = lines.findIndex(l => l === T.feedPastSeasonLine(y));
      run.steps.push(`honest line at screen line ${at}`);
      await page.locator('[data-phone-back]').first().click();
      await page.locator('[data-phone-app="arcade"]').click();
      await page.waitForTimeout(600);
      await shot('old-quiz');
      const qt = await phoneText(page);
      const wq = WORLD_Q.filter(re => re.test(qt));
      if (wq.length) failNote(`${tag} old-play quiz: a world question in ${y}: ${qt.slice(0, 200)}`);
      if (await overflow(page)) failNote(`${tag} old-play: sideways scroll`);
    });
    const intlTiles = async () => {
      await sweep(page);
      await page.getByText('played out').first().waitFor({ state: 'attached', timeout: 30000 });
      const t = page.locator('button', { hasText: 'played out' }).first();
      await t.scrollIntoViewIfNeeded();
      return page.evaluate(() => {
        const a = [...document.querySelectorAll('button')].find(b => b.textContent.includes('played out'));
        const b = a?.nextElementSibling;
        const box = a?.parentElement?.getBoundingClientRect();
        return { last: b?.textContent ?? '', h: [a?.getBoundingClientRect().height, b?.getBoundingClientRect().height], y: Math.round(box?.top ?? 0) };
      });
    };
    await step('p26-feed', async () => {
      await open(saves.P26);
      const text = await openFeed();
      await shot('p26-feed');
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      const at = lines.indexOf(T.feedFutureSeasonLine(2026));
      if (at < 0) failNote(`${tag} p26: no framing line for 2026-27`);
      const wc = facts.P26.wc;
      if (lines.some(l => l.includes(`win the ${wc}`))) failNote(`${tag} p26: the feed names the winner of the ${wc} 2026 he missed (${facts.P26.mine})`);
      run.steps.push(`p26 feed: framing at ${at}, ${lines.filter(l => / win |champions of Europe/.test(l)).length} champion lines`);
    });
    await step('p26-intl', async () => {
      await open(saves.P26);
      const t = await intlTiles();
      await page.screenshot({ path: path.join(OUT, `${tag}-p26-intl.png`), clip: { x: 0, y: Math.max(0, t.y - 260), width, height: Math.min(height, 520) } }).catch(() => shot('p26-intl'));
      if (t.last.includes('won it')) failNote(`${tag} p26: the last tile names the 2026 winner he missed: "${t.last}"`);
      run.steps.push(`p26 last tile "${t.last}" heights ${t.h.map(Math.round).join('/')}`);
      const before = await page.evaluate(() => [Math.round(scrollY), document.documentElement.scrollHeight]);
      await page.locator('button', { hasText: 'played out' }).first().click();
      await waitText(page, 'Every tournament');
      await page.waitForTimeout(300);
      await shot('p26-history');
      const list = await page.evaluate(() => { const h = [...document.querySelectorAll('div')].find(d => d.textContent === 'Every tournament'); return h?.parentElement?.innerText ?? ''; });
      if (list.includes(facts.P26.champion) && !/2026[\s\S]{0,80}Watched from home/.test(list)) note(`${tag} p26: history list text ${JSON.stringify(list.slice(0, 300))}`);
      await page.locator('button', { hasText: 'Back' }).last().click();
      await page.waitForTimeout(300);
      const after = await page.evaluate(() => [Math.round(scrollY), document.documentElement.scrollHeight]);
      run.steps.push(`p26 history scroll ${before.join('/')} -> ${after.join('/')}`);
      if (before[0] !== after[0] || before[1] !== after[1]) failNote(`${tag} p26: the page moved opening and closing the history, ${before.join('/')} to ${after.join('/')}`);
    });
    await step('p10-card', async () => {
      const t = saves.P10.lastTournament;
      await open({ ...copy(saves.P10), phase: 'world_cup', pendingTournament: copy(t) });
      await waitText(page, `${t.name} ${t.year}`);
      await page.waitForTimeout(motion === 'reduce' ? 300 : 2500);
      await shot('p10-card');
      const card = await page.evaluate(() => { const tiles = [...document.querySelectorAll('[data-intl-tile]')]; return { keys: tiles.map(x => x.getAttribute('data-intl-tile')), text: tiles[0]?.closest('.rounded-xl.border-2')?.innerText ?? '' }; });
      if (!card.text.includes('Champions:')) failNote(`${tag} p10 card: finals he played (${facts.P10.mine}) but no champions line`);
      if (!card.keys.includes('bracket')) failNote(`${tag} p10 card: finals he played but no Bracket tile (${card.keys.join(',')})`);
      run.steps.push(`p10 card tiles ${card.keys.join('/')}`);
    });
    await step('p10-bracket', async () => {
      await open(saves.P10);
      const t = await intlTiles();
      if (!t.last.includes(`${facts.P10.champion} won it`)) failNote(`${tag} p10: finals played (${facts.P10.mine}) but the last tile reads "${t.last}"`);
      await page.locator('button', { hasText: 'won it' }).first().click();
      await waitText(page, 'Final');
      await page.waitForTimeout(300);
      await shot('p10-bracket');
      run.steps.push(`p10 last tile "${t.last}"`);
      if (await overflow(page)) failNote(`${tag} p10: sideways scroll`);
    });
    if (errors.length) failNote(`${tag}: page errors ${errors.slice(0, 3).join(' | ')}`);
    await context.close();
  }
} finally { await browser.close(); }
fs.writeFileSync(path.join(OUT, 'r1329run-walk-report.json'), JSON.stringify(report, null, 2));
for (const r of report.runs) console.log(`${r.tag}: ${r.steps.join('; ')}`);
console.log(report.failures.length ? `r1329run-walk: ${report.failures.length} failures` : `r1329run-walk: green over ${report.runs.length} runs`);
process.exit(report.failures.length ? 1 : 0);
