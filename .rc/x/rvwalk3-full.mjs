/* Reviewer's walk for Round 1107 (never committed). Runs from the repo root on
   the GitHub runner: node .rc/x/rvwalk.mjs. Reads the built site at
   process.env.BASE, blocks supabase.co, and saves screenshots plus
   results.json into process.env.RC_OUT. RV_BASE names a folder holding the
   BASE branch's tree (origin/release-al-int): its engine makes the saves, so
   every walk here is also "a save written by the base's code, loaded on the
   branch". */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const imp = rel => import(pathToFileURL(path.join(ROOT, rel)).href);
const pw = (await imp('scripts/lib/playwrightLoader.mjs')).default;
const { loadEngine, signingSave, wonTournamentSave } = await imp('scripts/lib/careerMomentSaves.mjs');
const { mulberry32 } = await imp('scripts/lib/careerAwardsNightProbe.mjs');
const OUT = process.env.RC_OUT || path.join(ROOT, '.tmp-fx', 'rvshots');
const BASE = process.env.BASE || 'http://localhost:4173';
const BASE_TREE = process.env.RV_BASE ? path.resolve(process.env.RV_BASE) : null;
const ONLY = (process.env.RV_ONLY || '').split(',').filter(Boolean);
fs.mkdirSync(OUT, { recursive: true });
const SAVE_KEY = 'soccerCareerSave';
const results = [];
const notes = [];
const say = s => { console.log(s); notes.push(s); };

/* ---------- saves ---------- */
const SBhead = await loadEngine(ROOT);
const SBbase = BASE_TREE ? await loadEngine(BASE_TREE) : SBhead;
say(`engine for saves: ${BASE_TREE ? `the BASE tree at ${BASE_TREE}` : 'the head (no RV_BASE given)'}`);
const sc = SBbase.soccer;
const clubs = sc.FALLBACK_CLUBS;
const clone = v => JSON.parse(JSON.stringify(v));
const sH = signingSave(SBhead);
const sB = signingSave(SBbase);
const wH = wonTournamentSave(SBhead);
const wB = wonTournamentSave(SBbase);
say(`byte equal, base engine against head engine: signing save ${sH.save === sB.save} (${sB.save.length} chars), won save ${wH.save === wB.save} (${wB.save ? wB.save.length : 0} chars, seed ${wB.seed})`);

const step = (st) => {
  const ph = st.phase;
  return ph === 'youth' ? sc.advanceYouthYear(st, clubs)
    : ph === 'contract_offer' ? ((st.pendingOffers || []).length ? sc.acceptOffer(st, st.pendingOffers[0]) : { ...st, phase: 'playing' })
    : ph === 'playing' ? sc.advanceProSeason(st, clubs)
    : ph === 'newspaper' ? sc.dismissNewspaper(st)
    : ph === 'season_summary' ? sc.dismissSummary(st, clubs)
    : ph === 'ballon_dor' ? sc.dismissBallonDor(st, clubs)
    : ph === 'international_debut' ? sc.dismissDebut(st, clubs)
    : ph === 'world_cup' ? sc.dismissWorldCup(st, clubs)
    : ph === 'rivalry_event' ? sc.dismissRivalryEvent(st, clubs)
    : ph === 'social_media_action' ? sc.dismissSocialMediaPhase(st, clubs)
    : ph === 'random_events' ? ((st.pendingEvents || [])[0]?.choices?.length ? sc.applyEventChoice(st, 0, clubs) : { ...st, phase: 'playing', pendingEvents: [] })
    : ph === 'moral_dilemma' ? sc.dismissMoralDilemma(sc.applyMoralDilemmaChoice(st, 0), clubs)
    : ph === 'red_card_appeal_result' ? sc.dismissAppealResult(st, clubs)
    : ph === 'rehab_choice' ? sc.applyRehabChoice(st, 0)
    : ph === 'transfer_window' ? sc.stayAtClub(st)
    : ph === 'retirement_suggestion' ? sc.declineRetirementSuggestion(st, clubs)
    : null;
};
const flat = o => ({ pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o });
const withSeed = (seed, fn) => { const real = Math.random; Math.random = mulberry32(seed); try { return fn(); } finally { Math.random = real; } };

/* More states, all from the base engine. */
const saves = { signing: sB.save, won: wB.save };
const facts = { signingClub: sB.club, won: wB };
withSeed(wB.seed, () => {
  /* The same career as the won save, replayed: the earliest state that holds
     that same tournament pending (the newspaper or the season summary). */
  let st = sc.initCareer('Scene', 'Brazil', 'ST', '2010-14', flat(90), 90, 2010, clubs, SBbase.appearance.defaultAppearance(), 95);
  for (let g = 0; g < 400 && st && !st.retired; g += 1) {
    const t = st.pendingTournament;
    if (t && t.name === wB.name && t.year === wB.year && st.phase !== 'ballon_dor' && st.phase !== 'world_cup' && !saves.wonEarly) {
      saves.wonEarly = JSON.stringify(st); facts.wonEarlyPhase = st.phase;
    }
    if (t && t.name === wB.name && t.year === wB.year && st.phase === 'world_cup' && !saves.wonOnCard) saves.wonOnCard = JSON.stringify(st);
    if (saves.wonOnCard) break;
    st = step(st);
  }
});
for (let seed = 1; seed <= 60 && !(saves.quiet && saves.extension && saves.loan); seed += 1) {
  withSeed(seed, () => {
    let st = sc.initCareer('Scene', seed % 2 ? 'England' : 'Brazil', 'ST', '2010-14', flat(seed % 3 === 0 ? 70 : 84), seed % 3 === 0 ? 70 : 84, 2010, clubs, SBbase.appearance.defaultAppearance(), 92);
    for (let g = 0; g < 400 && st && !st.retired; g += 1) {
      const t = st.pendingTournament;
      if (!saves.quiet && st.phase === 'ballon_dor' && t && t.myResult !== 'Winner' && t.playerApps > 0 && st.pendingBallonDor && st.pendingBallonDor.playerRank !== 1) {
        const next = withSeed(99991, () => sc.dismissBallonDor(clone(st), clubs).phase);
        if (next === 'world_cup') { saves.quiet = JSON.stringify(st); facts.quiet = `${t.name} ${t.year}, ${t.myResult}, seed ${seed}`; }
      }
      if (!saves.extension && st.phase === 'transfer_window' && st.transferSituation && st.transferSituation.type === 'contract_expiry') {
        saves.extension = JSON.stringify(st); facts.extension = `seed ${seed}, ${st.currentClub}, wage ${st.weeklyWage}`;
      }
      if (!saves.loan && st.phase === 'transfer_window' && (st.pendingLoanOffers || []).length > 0 && !st.loan) {
        saves.loan = JSON.stringify(st); facts.loan = `seed ${seed}, ${st.currentClub}, to ${st.pendingLoanOffers[0].club.name}`;
      }
      st = step(st);
    }
  });
}
{
  /* The signing save again, with the first offer's club swapped for the
     longest named club the game holds (a real row of its own data). */
  const st = JSON.parse(sB.save);
  const longest = clubs.reduce((a, b) => (b.name.length > a.name.length ? b : a));
  st.pendingOffers[0] = { ...st.pendingOffers[0], club: clone(longest) };
  saves.signingLong = JSON.stringify(st); facts.longClub = longest.name;
}
say(`saves made: ${Object.keys(saves).filter(k => saves[k]).join(', ')}; missing: ${['wonEarly', 'wonOnCard', 'quiet', 'extension', 'loan'].filter(k => !saves[k]).join(', ') || 'none'}`);
say(`facts: ${JSON.stringify({ ...facts, won: { seed: wB.seed, name: wB.name, year: wB.year, nation: wB.nation, rank: wB.rank } })}`);

/* ---------- the browser ---------- */
const instrument = ({ save, saveKey }) => {
  try {
    if (!sessionStorage.getItem('rv-walk')) {
      sessionStorage.setItem('rv-walk', '1');
      localStorage.setItem('cookie-consent', 'essential');
      localStorage.setItem(saveKey, save);
    }
  } catch { /* the walk reports no scene */ }
  const log = { states: [], firstSeen: null, widest: 0, firstFrame: null };
  window.__rv = log;
  const frame = () => {
    const el = document.querySelector('[data-career-moment]');
    if (document.documentElement) log.widest = Math.max(log.widest, document.documentElement.scrollWidth - window.innerWidth);
    if (el) {
      const st = el.getAttribute('data-cmo-state');
      const now = performance.now();
      if (log.firstSeen === null) {
        log.firstSeen = now;
        const h3 = el.querySelector('h3');
        const art = el.querySelector('[data-cmo-beat="art"]') || el.querySelector('.victory-cup');
        const r = el.getBoundingClientRect();
        log.firstFrame = { state: st, titleOpacity: h3 ? getComputedStyle(h3).opacity : null, artOpacity: art ? getComputedStyle(art).opacity : null, top: Math.round(r.top), bottom: Math.round(r.bottom), vh: window.innerHeight };
      }
      if (!log.states.length || log.states[log.states.length - 1].s !== st) log.states.push({ s: st, t: Math.round(now - log.firstSeen) });
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
};
const browser = await pw.chromium.launch({ args: ['--no-sandbox', '--no-proxy-server'] });
let blocked = 0;
async function open(save, view) {
  const ctx = await browser.newContext({ viewport: { width: view.width, height: view.height }, hasTouch: view.hasTouch, reducedMotion: view.reduce ? 'reduce' : 'no-preference' });
  await ctx.addInitScript(instrument, { save, saveKey: SAVE_KEY });
  await ctx.route(/supabase\.co/, r => { blocked += 1; return r.abort(); });
  const page = await ctx.newPage();
  page.setDefaultTimeout(20000);
  const trouble = [];
  page.on('pageerror', e => trouble.push(`page error: ${String(e).slice(0, 200)}`));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) trouble.push(`console error: ${m.text().slice(0, 200)}`); });
  await page.goto(`${BASE}/soccer-career`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  return { ctx, page, trouble };
}
const measure = (page, selector) => page.evaluate(sel => {
  const el = document.querySelector(sel);
  if (!el) return null;
  const copy = el.cloneNode(true);
  copy.querySelectorAll('style, svg, [data-cmo-number-old]').forEach(n => n.remove());
  const R = el.getBoundingClientRect();
  const box = n => { if (!n) return null; const b = n.getBoundingClientRect(); return [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)]; };
  const name = n => `${n.tagName.toLowerCase()}.${String(n.getAttribute('class') || '').split(' ').slice(0, 2).join('.')}`;
  const spill = [];
  const clipped = [];
  for (const n of el.querySelectorAll('*')) {
    if (n.closest('svg') && n.tagName.toLowerCase() !== 'svg') continue;
    if (n.tagName === 'STYLE' || n.closest('[data-cmo-number-old]') || n.closest('.animate-confetti-fall') || n.classList.contains('animate-confetti-fall')) continue;
    const cs = getComputedStyle(n);
    if (cs.display === 'none' || cs.position === 'absolute' || cs.position === 'fixed') continue;
    const b = n.getBoundingClientRect();
    if (b.width === 0 || b.height === 0) continue;
    if (b.left < R.left - 1 || b.right > R.right + 1 || b.top < R.top - 1 || b.bottom > R.bottom + 1) spill.push(`${name(n)} ${Math.round(b.left - R.left)},${Math.round(b.top - R.top)},${Math.round(b.right - R.right)},${Math.round(b.bottom - R.bottom)}`);
    if (['H3', 'P', 'SPAN', 'BUTTON'].includes(n.tagName) && n.scrollWidth > n.clientWidth + 1 && n.clientWidth > 0 && cs.display !== 'inline') clipped.push(`${name(n)} ${n.scrollWidth}>${n.clientWidth} "${(n.textContent || '').slice(0, 40)}"`);
  }
  const parts = { art: el.querySelector('[data-cmo-beat="art"]') || el.querySelector('.victory-art'), copy: el.querySelector('.cmo-copy'), count: el.querySelector('.cmo-count'), ink: el.querySelector('[data-cmo-beat="ink"]') };
  const overlaps = [];
  const keys = Object.keys(parts).filter(k => parts[k]);
  for (let i = 0; i < keys.length; i += 1) for (let j = i + 1; j < keys.length; j += 1) {
    const a = parts[keys[i]].getBoundingClientRect(); const b = parts[keys[j]].getBoundingClientRect();
    const w = Math.min(a.right, b.right) - Math.max(a.left, b.left); const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    if (w > 1 && h > 1) overlaps.push(`${keys[i]} over ${keys[j]} by ${Math.round(w)}x${Math.round(h)}`);
  }
  const old = el.querySelector('[data-cmo-number-old]');
  const fin = el.querySelector('[data-cmo-number-final]');
  const cup = el.querySelector('.victory-cup');
  return {
    state: el.getAttribute('data-cmo-state'), tone: el.getAttribute('data-cmo-tone'),
    text: (copy.textContent || '').replace(/\s+/g, ' ').trim(),
    title: el.querySelector('h3')?.textContent ?? '',
    lines: [...el.querySelectorAll('[data-cmo-beat="line"]')].map(n => n.textContent),
    number: fin ? fin.textContent : null,
    card: box(el), art: box(parts.art), pill: box(el.querySelector('[data-cmo-number]')), titleBox: box(el.querySelector('h3')),
    vw: window.innerWidth, vh: window.innerHeight, scrollY: Math.round(window.scrollY),
    pageWider: document.documentElement.scrollWidth - window.innerWidth,
    running: el.getAnimations({ subtree: true }).filter(a => a.playState === 'running').length,
    paused: el.getAnimations({ subtree: true }).filter(a => a.playState === 'paused').length,
    beatOpacity: [...el.querySelectorAll('[data-cmo-beat]')].map(n => `${n.getAttribute('data-cmo-beat')}=${getComputedStyle(n).opacity}`),
    finalOpacity: fin ? getComputedStyle(fin).opacity : null,
    oldShown: old ? `${getComputedStyle(old).display}/${getComputedStyle(old).opacity}` : 'none in DOM',
    cups: el.querySelectorAll('.victory-cup').length,
    cupDuration: cup ? getComputedStyle(cup).animationDuration : null,
    avatars: el.querySelectorAll('svg[aria-label="Player avatar"]').length,
    shirt: el.querySelector('svg[aria-label="Player avatar"] path')?.getAttribute('fill') ?? '',
    ink: el.style.getPropertyValue('--cmo-ink'),
    confetti: document.querySelectorAll('.animate-confetti-fall').length,
    spill, clipped, overlaps,
  };
}, selector);
async function shot(page, name, selector) {
  await page.screenshot({ path: path.join(OUT, `${name}.png`) }).catch(e => say(`shot ${name} failed: ${String(e).slice(0, 80)}`));
  if (!selector) return;
  const r = await page.evaluate(sel => { const el = document.querySelector(sel); if (!el) return null; const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height, vw: window.innerWidth, vh: window.innerHeight }; }, selector);
  if (!r) return;
  const x = Math.max(0, r.x - 10); const y = Math.max(0, r.y - 10);
  const w = Math.min(r.vw - x, r.w + 20); const h = Math.min(r.vh - y, r.h + 20);
  if (w > 4 && h > 4) await page.screenshot({ path: path.join(OUT, `${name}-card.png`), clip: { x, y, width: w, height: h } }).catch(e => say(`clip ${name} failed: ${String(e).slice(0, 80)}`));
}

/* ---------- third pass: is the loan window itself wider than a phone? (before any scene exists) ---------- */
for (let seed = 1; seed <= 300 && !saves.loan; seed += 1) {
  withSeed(seed, () => {
    const o = 60 + (seed % 4) * 3;
    let st = sc.initCareer('Scene', 'England', 'ST', '2010-14', flat(o), o, 2010, clubs, SBbase.appearance.defaultAppearance(), 93);
    for (let g = 0; g < 120 && st && !st.retired && !saves.loan; g += 1) {
      if (st.phase === 'transfer_window' && (st.pendingLoanOffers || []).length > 0 && !st.loan) { saves.loan = JSON.stringify(st); break; }
      if (st.phase === 'contract_offer' && (st.pendingOffers || []).length) {
        const best = st.pendingOffers.reduce((a, b) => ((b.club.tier ?? 9) < (a.club.tier ?? 9) ? b : a));
        st = sc.acceptOffer(st, best);
      } else st = step(st);
    }
  });
}
{
  const view = { id: '390', width: 390, height: 844, hasTouch: true, reduce: false };
  const { ctx, page } = await open(saves.loan, view);
  await page.waitForTimeout(1500);
  const wide = await page.evaluate(() => {
    const vw = window.innerWidth;
    const over = [];
    for (const n of document.querySelectorAll('body *')) {
      const b = n.getBoundingClientRect();
      if (b.width > 0 && b.right > vw + 1) over.push(`${n.tagName.toLowerCase()}.${String(n.getAttribute('class') || '').split(' ').slice(0, 3).join('.')} right ${Math.round(b.right)} "${(n.textContent || '').trim().slice(0, 30)}"`);
    }
    return { wider: document.documentElement.scrollWidth - vw, scenes: document.querySelectorAll('[data-career-moment]').length, widest: window.__rv.widest, over: over.slice(0, 12), count: over.length };
  });
  say(`loan window at 390, before any press: page ${wide.wider} px wider than its window (widest so far ${wide.widest}), ${wide.scenes} scene(s) on the page, ${wide.count} element(s) past the right edge: ${JSON.stringify(wide.over)}`);
  await page.screenshot({ path: path.join(OUT, 'loanwindow-390-before.png'), fullPage: true }).catch(() => undefined);
  await ctx.close();
}
await browser.close();
fs.writeFileSync(path.join(OUT, 'results3.json'), JSON.stringify({ notes }, null, 1));
process.exit(0);
