/* Reviewer walk (Round 1046): play the Season Centre's new parts on the BUILT site and look at them.
   BASE is the served dist; supabase.co is blocked before anything loads; screenshots and a log go to RC_OUT. */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || path.join(ROOT, '.tmp-fx/rv-shots');
fs.mkdirSync(OUT, { recursive: true });
const imp = rel => import(pathToFileURL(path.join(ROOT, rel)).href);
const pw = (await imp('scripts/lib/playwrightLoader.mjs')).default;
const { bundleAwardsNight } = await imp('scripts/lib/careerAwardsNightBundle.mjs');
const { mulberry32 } = await imp('scripts/lib/careerAwardsNightProbe.mjs');
const B = await bundleAwardsNight(ROOT, { extra: { season: 'src/lib/season/soccer.ts', core: 'src/lib/season/core.ts' } });
const { soccer, season: S, core: C } = B;
const CLUBS = soccer.FALLBACK_CLUBS;
const LOG = [];
const log = (...a) => { const line = a.map(x => (typeof x === 'string' ? x : JSON.stringify(x))).join(' '); LOG.push(line); console.log(line); };

/* ---- saves the engine itself writes ---- */
const abil = o => ({ pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o });
const stepOf = s => {
  switch (s.phase) {
    case 'youth': return soccer.advanceYouthYear(s, CLUBS);
    case 'contract_offer': { const o = s.pendingOffers || []; return o.length ? soccer.acceptOffer(s, o[0]) : { ...s, phase: 'playing' }; }
    case 'playing': return soccer.advanceProSeason(s, CLUBS);
    case 'newspaper': return soccer.dismissNewspaper(s);
    case 'season_summary': return soccer.dismissSummary(s, CLUBS);
    case 'ballon_dor': return soccer.dismissBallonDor(s, CLUBS);
    case 'international_debut': return soccer.dismissDebut(s, CLUBS);
    case 'world_cup': return soccer.dismissWorldCup(s, CLUBS);
    case 'rivalry_event': return soccer.dismissRivalryEvent(s, CLUBS);
    case 'social_media_action': return soccer.dismissSocialMediaPhase(s, CLUBS);
    case 'moral_dilemma': { const n = soccer.applyMoralDilemmaChoice(s, 0); return n.phase === 'moral_dilemma' ? soccer.dismissMoralDilemma(n, CLUBS) : n; }
    case 'random_events': { const ev = (s.pendingEvents || [])[0]; return ev && ev.choices && ev.choices.length ? soccer.applyEventChoice(s, 0, CLUBS) : { ...s, phase: 'playing', pendingEvents: [] }; }
    case 'red_card_appeal_result': return soccer.dismissAppealResult(s, CLUBS);
    case 'rehab_choice': return soccer.applyRehabChoice(s, 0);
    case 'transfer_window': return soccer.stayAtClub(s);
    case 'retirement_suggestion': return s.age >= 34 ? soccer.acceptRetirementSuggestion(s) : soccer.declineRetirementSuggestion(s, CLUBS);
    default: return null;
  }
};
const playedRow = r => r.type === 'playing' && r.apps > 0;
const facts = save => save.seasons.map((row, at) => {
  if (!playedRow(row)) return null;
  const ctx = S.buildSoccerSeasonCtx(save, CLUBS, row);
  const stable = ctx.mode !== 'table' || (ctx.finish && ctx.finish.finish === 1);
  return { at, row, ctx, stable: !!stable, open: !!stable || (save.phone && save.phone.world && save.phone.world.year === row.year) };
}).filter(Boolean);

let HUB = null, SUMMARY = null;
for (let c = 0; c < 160 && !(HUB && SUMMARY); c += 1) {
  const real = Math.random;
  Math.random = mulberry32(c * 7919 + 1046);
  try {
    let s = soccer.initCareer(`Walker ${c}`, 'England', 'ST', '2010-14', abil(72 + (c % 10)), 72 + (c % 10), 2010, CLUBS, null, 92);
    for (let g = 0; g < 900 && s && !s.retired; g += 1) {
      const n = s.seasons.filter(playedRow).length;
      if (!SUMMARY && s.phase === 'season_summary' && n >= 3) {
        const f = facts(s); const last = f[f.length - 1];
        if (last && last.at === s.seasons.length - 1 && last.ctx.mode === 'table' && !last.stable) {
          const d = C.deriveSeason(S.SOCCER, last.row, last.ctx);
          if (d && d.mode === 'table') SUMMARY = { save: JSON.stringify(s), state: s, last, d, key: S.soccerSeasonKey(s.playerName, last.row) };
        }
      }
      if (!HUB && s.phase === 'playing' && n >= 12) {
        const f = facts(s); const last = f[f.length - 1];
        if (last && last.at === s.seasons.length - 1 && last.ctx.mode === 'table' && !last.stable && last.open && f.some(x => x.open && x !== last) && f.some(x => !x.open)) {
          const d = C.deriveSeason(S.SOCCER, last.row, last.ctx);
          const md = d ? d.games.findIndex((x, i) => i >= 1 && i < 14 && x.events.some(e => e.kind === 'goal' && e.mine) && x.events.some(e => e.kind === 'goal' && e.side === 'them')) + 1 : 0;
          if (d && d.mode === 'table' && md > 0) HUB = { save: JSON.stringify(s), state: s, facts: f, last, d, goalMd: md, key: S.soccerSeasonKey(s.playerName, last.row) };
        }
      }
      if (HUB && SUMMARY) break;
      s = stepOf(s);
    }
  } finally { Math.random = real; }
}
if (!HUB) throw new Error('no hub save');
const D = HUB.d, M = D.games.length;
const keyOfSlot = slot => D.labels[slot]?.key ?? `u${slot}`;
const ORDER = Array.from({ length: M + 1 }, (_, k) => C.tableAt(D, k).map(r => keyOfSlot(r.slot)));
log(`save HUB: ${HUB.state.playerName}, ${HUB.facts.length} played seasons, open ${HUB.facts.filter(x => x.open).length}, locked ${HUB.facts.filter(x => !x.open).length}, last ${HUB.last.row.year} ${HUB.last.row.club}, ${M} matchdays, goal md ${HUB.goalMd}, titles ${HUB.state.seasons.filter(r => r.leagueTitle).length}`);
log(`save SUMMARY: ${SUMMARY ? `${SUMMARY.state.playerName} ${SUMMARY.last.row.year} ${SUMMARY.last.row.club} phase ${SUMMARY.state.phase}` : 'none found'}`);

const browser = await pw.chromium.launch();
const errorsAll = [];
async function openSite(save, { width, height, reduced = false, storage = {}, wait = '[data-open-season-ratings]' }) {
  const ctx = await browser.newContext({ viewport: { width, height }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  await ctx.addInitScript(([v, extra]) => {
    try {
      if (!sessionStorage.getItem('rv-walk')) {
        sessionStorage.setItem('rv-walk', '1');
        localStorage.setItem('cookie-consent', 'essential');
        localStorage.setItem('soccerCareerSave', v);
        localStorage.setItem('seasonCentre:help', '1');
        for (const [k, val] of Object.entries(extra)) localStorage.setItem(k, val);
      }
    } catch { /* private mode */ }
  }, [save, storage]);
  await ctx.route(/supabase\.co/, r => r.abort());
  const page = await ctx.newPage();
  page.on('pageerror', e => { errorsAll.push(String(e).slice(0, 200)); });
  await page.goto(`${BASE}/soccer-career`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector(wait, { timeout: 60000 });
  await page.waitForTimeout(700);
  return { ctx, page };
}
const shot = async (page, name) => { await page.screenshot({ path: path.join(OUT, `${name}.png`) }); };
const press = async (page, text, scope = '[data-season-centre] button') => {
  const ok = await page.evaluate(([t, sc]) => { const b = [...document.querySelectorAll(sc)].find(x => !x.disabled && x.textContent.trim().startsWith(t)); if (!b) return false; b.click(); return true; }, [text, scope]);
  await page.waitForTimeout(150);
  return ok;
};
const textOf = (page, sel) => page.evaluate(s => { const e = document.querySelector(s); return e ? e.textContent.trim().replace(/\s+/g, ' ') : null; }, sel);
const RES = 'seasonCentre:v1:soccer';
const stored = page => page.evaluate(k => localStorage.getItem(k), RES);
const saved = page => page.evaluate(() => localStorage.getItem('soccerCareerSave'));
const fullTime = page => page.waitForFunction(() => {
  const bar = [...document.querySelectorAll('[data-centre-bar] button')].map(b => b.textContent.trim());
  return !!document.querySelector('[data-matchday]') && !bar.some(t => /^(⏸ Pause|▶ Resume)/.test(t)) && bar.some(t => /^(▶ (Matchday|League game) \d+|📋)/.test(t));
}, null, { timeout: 120000 });
/* the next matchday: a big game shows its poster first, which the same button then leaves */
const next = async page => {
  const ok = await press(page, '▶ Matchday', '[data-centre-bar] button');
  if (await page.$('[data-poster]')) await press(page, '▶ Matchday', '[data-centre-bar] button');
  return ok;
};
const mdNow = async page => Number((await textOf(page, '[data-matchday]'))?.match(/(\d+) of/)?.[1] ?? 0);
const tableOrder = page => page.evaluate(() => [...document.querySelectorAll('[data-rank-shift] [data-club]')].filter(r => r.offsetParent !== null).map(r => r.dataset.club));
const leftovers = page => page.evaluate(() => ({ shifting: document.querySelectorAll('[data-rank-shifting]').length, inline: [...document.querySelectorAll('[data-rank-shift] [data-club]')].filter(r => r.style.transform || r.style.opacity || r.style.transition).length }));

const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const compactOf = k => { const at = ORDER[k].indexOf(keyOfSlot(0)); const lo = Math.max(0, Math.min(at - 2, ORDER[k].length - 5)); return ORDER[k].slice(lo, lo + 5); };
const want = (k, phone) => (phone ? compactOf(k) : ORDER[k]);
const rectOf = (page, sel) => page.evaluate(s => { const b = document.querySelector(s)?.getBoundingClientRect(); return b ? `${Math.round(b.left)},${Math.round(b.top)} ${Math.round(b.width)}x${Math.round(b.height)}` : 'none'; }, sel);

async function pass(tag, { width, height, reduced }) {
  const phone = width < 768;
  const { ctx, page } = await openSite(HUB.save, { width, height, reduced });
  const note = (k, v) => log(`[${tag}] ${k}:`, v);
  try {
    await page.evaluate(() => document.querySelector('[data-open-season-replays]')?.scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(200);
    await shot(page, `${tag}-01-hub`);
    note('hub buttons', [await rectOf(page, '[data-open-season-ratings]'), await rectOf(page, '[data-open-career-story]'), await rectOf(page, '[data-open-season-replays]')]);
    note('hub chip before', await textOf(page, '[data-season-resume]'));
    await page.click('[data-open-season-replays]');
    await page.waitForSelector('[data-season-picker]', { timeout: 30000 });
    await page.waitForTimeout(500);
    await shot(page, `${tag}-02-picker`);
    note('picker', await page.evaluate(() => ({ open: document.querySelectorAll('[data-replay-row]').length, locked: document.querySelectorAll('[data-replay-locked]').length, first: [...document.querySelectorAll('[data-picker-list] li')].slice(0, 3).map(l => l.textContent.trim().slice(0, 150)) })));
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    note('escape closes picker', (await page.$('[data-season-picker]')) === null);
    await page.click('[data-open-season-replays]');
    await page.waitForSelector('[data-replay-row]', { timeout: 30000 });
    await page.click(`[data-replay-row="${HUB.last.at}"]`);
    await page.waitForSelector('[data-kickoff]', { timeout: 30000 });
    await page.waitForTimeout(400);
    await shot(page, `${tag}-03-kickoff`);
    note('kickoff', (await textOf(page, '[data-kickoff]')).slice(0, 300));
    note('order at open equals node table 0', eq(await tableOrder(page), want(0, phone)));
    await press(page, '▶ Kick off');
    await press(page, '3x');
    await page.waitForSelector('[data-mini-pitch]', { timeout: 30000 });
    await page.waitForTimeout(900);
    await shot(page, `${tag}-04-match`);
    await fullTime(page);
    await page.waitForTimeout(900);
    await shot(page, `${tag}-05-fulltime`);
    note('md1 order', eq(await tableOrder(page), want(1, phone)));
    await press(page, 'Results');
    let k = 1;
    while (k < HUB.goalMd - 1) { k += 1; await next(page); await fullTime(page); await page.waitForTimeout(reduced ? 150 : 750); const o = await tableOrder(page); if (!eq(o, want(k, phone))) note(`ORDER WRONG after md ${k}`, o); }
    note('leftovers after results steps', await leftovers(page));
    /* the goal matchday at 3x: his goal on the pitch */
    await press(page, '3x');
    k += 1;
    await next(page);
    try {
      await page.waitForFunction(() => /Yours/.test(document.querySelector('[data-pitch-yours]')?.textContent ?? ''), null, { timeout: 90000 });
      await page.waitForTimeout(reduced ? 100 : 500);
      await shot(page, `${tag}-06-goal-mine`);
      note('pitch at his goal', await page.evaluate(() => { const p = document.querySelector('[data-mini-pitch]'); return { phase: p.dataset.pitchPhase, side: p.dataset.pitchSide, rings: p.querySelectorAll('[data-pitch-ring]').length, yours: document.querySelector('[data-pitch-yours]').textContent }; }));
    } catch { note('his goal never showed Yours', await textOf(page, '[data-pitch-yours]')); }
    await fullTime(page);
    await page.waitForTimeout(900);
    await shot(page, `${tag}-07-ft-goal`);
    note(`md ${k} order (page says md ${await mdNow(page)})`, eq(await tableOrder(page), want(k, phone)));
    /* a slide caught in the air */
    await press(page, 'Results');
    await next(page);
    await page.waitForTimeout(60);
    await shot(page, `${tag}-08-midslide`);
    await fullTime(page);
    /* six presses as fast as the bar allows */
    for (let i = 0; i < 6; i += 1) { await next(page); await page.waitForTimeout(30); }
    await page.waitForTimeout(1200);
    k = await mdNow(page);
    note(`after fast presses at md ${k}: order ok, leftovers`, [eq(await tableOrder(page), want(k, phone)), await leftovers(page)]);
    if (phone) {
      await next(page);
      await page.waitForTimeout(80);
      k = await mdNow(page);
      await page.click('[data-centre-fixtures]');
      await page.waitForTimeout(300);
      await shot(page, `${tag}-09-fixtures`);
      await press(page, '← Back');
      await page.waitForTimeout(900);
      note(`after fixtures in mid flight at md ${k}: order ok, leftovers`, [eq(await tableOrder(page), want(k, phone)), await leftovers(page)]);
    }
    await page.click('[data-season-centre] button[aria-label="How the Season Centre works"]');
    await page.waitForTimeout(400);
    await shot(page, `${tag}-10-help`);
    await press(page, 'Got it');
    await page.click('[data-centre-exit]');
    await page.waitForTimeout(900);
    await page.evaluate(() => document.querySelector('[data-open-season-replays]')?.scrollIntoView({ block: 'center' }));
    await shot(page, `${tag}-11-hub-chip`);
    note('chip', [await textOf(page, '[data-season-resume]'), await stored(page), `watched ${k}`, await rectOf(page, '[data-season-resume]')]);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-season-resume]', { timeout: 60000 });
    await page.click('[data-season-resume]');
    await page.waitForSelector('[data-kickoff-resumed]', { timeout: 30000 });
    await page.waitForTimeout(500);
    await shot(page, `${tag}-12-resumed`);
    note('resumed card', (await textOf(page, '[data-kickoff]')).slice(0, 360));
    note('resumed table', [eq(await tableOrder(page), want(k, phone)), await leftovers(page)]);
    await page.click('[data-kickoff-restart]');
    await page.waitForTimeout(300);
    note('after From the start', [(await textOf(page, '[data-kickoff]')).slice(0, 120), await stored(page), eq(await tableOrder(page), want(0, phone))]);
    await shot(page, `${tag}-12b-restarted`);
    await press(page, '⏭ Straight to the final table');
    await page.waitForSelector('[data-review-form]', { timeout: 30000 });
    await page.waitForTimeout(1200);
    await shot(page, `${tag}-13-review`);
    await page.evaluate(() => document.querySelector('[data-review-form]')?.scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(300);
    await shot(page, `${tag}-14-review-strip`);
    note('form strip', await page.evaluate(() => { const s = document.querySelector('[data-review-form]'); const b = s.getBoundingClientRect(); const bars = [...s.querySelectorAll('[data-form-bar]')]; return { box: `${Math.round(b.width)}x${Math.round(b.height)}`, bars: bars.length, missed: bars.filter(x => x.hasAttribute('data-form-missed')).length, narrowest: Math.min(...bars.map(x => x.getBoundingClientRect().width)).toFixed(1) }; }));
    note('final order', eq(await tableOrder(page), want(M, phone)));
    await page.click('[data-centre-exit]');
    await page.waitForTimeout(800);
    note('after review: chip, record, save same', [await textOf(page, '[data-season-resume]'), await stored(page), (await saved(page)) === HUB.save]);
    /* the oldest season that opens */
    await page.click('[data-open-season-replays]');
    await page.waitForSelector('[data-replay-row]', { timeout: 30000 });
    const oldest = await page.evaluate(() => [...document.querySelectorAll('[data-replay-row]')].pop().dataset.replayRow);
    await page.click(`[data-replay-row="${oldest}"]`);
    await page.waitForSelector('[data-kickoff]', { timeout: 30000 });
    await page.waitForTimeout(400);
    await shot(page, `${tag}-15-old-kickoff`);
    note('oldest open season', [oldest, (await textOf(page, '[data-kickoff]')).slice(0, 260)]);
    await press(page, '▶ Kick off'); await press(page, 'Results');
    await fullTime(page); await page.waitForTimeout(500);
    await shot(page, `${tag}-16-old-ft`);
    /* an old replay finished must not wipe a place kept in ANOTHER season */
    const other = JSON.stringify({ key: HUB.key, year: HUB.last.row.year, md: 5, speed: 1, stable: false });
    await page.evaluate(([slot, v]) => localStorage.setItem(slot, v), [RES, other]);
    await press(page, '⏭ Sim the rest');
    await page.waitForTimeout(800);
    note('a place in another season after this replay reached its review (same as written?)', (await stored(page)) === other);
    await page.click('[data-centre-exit]');
    await page.waitForTimeout(600);
    note('after old replay: save same', (await saved(page)) === HUB.save);
    await page.evaluate(slot => localStorage.removeItem(slot), RES);
  } catch (e) { note('WALK STOPPED', String(e).slice(0, 300)); try { await shot(page, `${tag}-99-stopped`); } catch { /* nothing */ } }
  await ctx.close();
}

/* the summary card's way in, with a place kept past a moment (critic C2.5): what does the resumed card say? */
async function summaryPass(tag, { width, height }) {
  if (!SUMMARY) { log(`[${tag}] no summary save`); return; }
  const Ms = SUMMARY.d.games.length;
  const rec = JSON.stringify({ key: SUMMARY.key, year: SUMMARY.last.row.year, md: Ms - 6, speed: 'results', stable: false });
  const { ctx, page } = await openSite(SUMMARY.save, { width, height, storage: { [RES]: rec }, wait: '[data-watch-week-by-week]' });
  const note = (k, v) => log(`[${tag}] ${k}:`, v);
  try {
    await page.evaluate(() => document.querySelector('[data-watch-week-by-week]')?.scrollIntoView({ block: 'center' }));
    await shot(page, `${tag}-01-summary`);
    await page.click('[data-watch-week-by-week]');
    await page.waitForSelector('[data-kickoff]', { timeout: 30000 });
    await page.waitForTimeout(500);
    await shot(page, `${tag}-02-resumed`);
    note('card', (await textOf(page, '[data-kickoff]')).slice(0, 420));
    note('moments line, behind line', [await textOf(page, '[data-kickoff-moments]'), await textOf(page, '[data-kickoff-behind]')]);
    const before = await saved(page);
    /* carry on from the kept place to the review: does the save change when no moment was taken? */
    await press(page, `▶ Matchday ${Ms - 5}`);
    for (let i = 0; i < 12; i += 1) {
      if (await page.$('[data-review-form]')) break;
      if (await press(page, '▶ Let it play')) { note('a moment was offered after the resume at', await mdNow(page)); continue; }
      if (!(await next(page))) await press(page, '📋 Season review', '[data-centre-bar] button');
      await page.waitForTimeout(250);
    }
    await page.waitForTimeout(600);
    await shot(page, `${tag}-03-after`);
    note('reached the review', (await page.$('[data-review-form]')) !== null);
    note('save unchanged after a resumed watch to the review', (await saved(page)) === before);
    note('record after', await stored(page));
  } catch (e) { note('WALK STOPPED', String(e).slice(0, 300)); try { await shot(page, `${tag}-99-stopped`); } catch { /* nothing */ } }
  await ctx.close();
}

/* a save from before the phone's league world and before moments: does the list open, and what does it offer? */
async function oldSavePass(tag, { width, height }) {
  const old = JSON.parse(HUB.save);
  delete old.phone; delete old.seasonMoments;
  const text = JSON.stringify(old);
  const { ctx, page } = await openSite(text, { width, height });
  const note = (k, v) => log(`[${tag}] ${k}:`, v);
  try {
    await page.evaluate(() => document.querySelector('[data-open-season-replays]')?.scrollIntoView({ block: 'center' }));
    await page.click('[data-open-season-replays]');
    await page.waitForSelector('[data-season-picker]', { timeout: 30000 });
    await page.waitForTimeout(500);
    await shot(page, `${tag}-01-picker`);
    note('picker', await page.evaluate(() => ({ open: document.querySelectorAll('[data-replay-row]').length, locked: document.querySelectorAll('[data-replay-locked]').length })));
    const first = await page.evaluate(() => document.querySelector('[data-replay-row]')?.dataset.replayRow ?? null);
    if (first !== null) {
      await page.click(`[data-replay-row="${first}"]`);
      await page.waitForSelector('[data-kickoff], [data-centre-tile]', { timeout: 30000 });
      await page.waitForTimeout(400);
      await shot(page, `${tag}-02-open`);
      note('opened', (await textOf(page, '[data-season-centre]')).slice(0, 200));
    }
  } catch (e) { note('WALK STOPPED', String(e).slice(0, 300)); try { await shot(page, `${tag}-99-stopped`); } catch { /* nothing */ } }
  await ctx.close();
}

const PASSES = (process.env.PASSES || 'p390,p390r,d1280,d1280r,p320,sum,old').split(',');
if (PASSES.includes('p390')) await pass('p390', { width: 390, height: 844, reduced: false });
if (PASSES.includes('d1280')) await pass('d1280', { width: 1280, height: 900, reduced: false });
if (PASSES.includes('p390r')) await pass('p390r', { width: 390, height: 844, reduced: true });
if (PASSES.includes('d1280r')) await pass('d1280r', { width: 1280, height: 900, reduced: true });
if (PASSES.includes('p320')) await pass('p320', { width: 320, height: 700, reduced: false });
if (PASSES.includes('sum')) await summaryPass('sum390', { width: 390, height: 844 });
if (PASSES.includes('old')) await oldSavePass('old390', { width: 390, height: 844 });
await browser.close();
log('page errors:', errorsAll);
fs.writeFileSync(path.join(OUT, 'rvWalk-' + PASSES.join('_') + '.log'), LOG.join('\n'));
console.log(`rvWalk: done, ${errorsAll.length} page errors, ${LOG.filter(l => l.includes('WALK STOPPED')).length} passes stopped early`);
process.exit(0);
