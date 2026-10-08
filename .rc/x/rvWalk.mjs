/* Reviewer's walk of the Squad tile on the REAL /soccer-career page (Round 1115 review, never committed).
   Reads BASE, writes screenshots and measure.json into RC_OUT. Blocks supabase.co. A probe: it reports, it does not gate. */
import { build } from 'esbuild';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const ROOT = process.cwd().replaceAll('\\', '/');
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || path.join(ROOT, '.tmp-fx/rv-out');
fs.mkdirSync(OUT, { recursive: true });
const WORK = fs.mkdtempSync(path.join(os.tmpdir(), 'rvwalk-'));
const entry = path.join(WORK, 'entry.mjs');
fs.writeFileSync(entry, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
export const lib = await import('${ROOT}/src/lib/soccerClubSquad.ts');
export const sheet = await import('${ROOT}/src/lib/soccerClubSquadSheet.ts');
export const engine = await import('${ROOT}/src/lib/soccerCareerEngine.ts');
`);
await build({ entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: path.join(WORK, 'b.mjs'), alias: { '@': `${ROOT}/src` }, logLevel: 'error' });
const { lib, sheet, engine } = await import(pathToFileURL(path.join(WORK, 'b.mjs')).href);
const CLUBS = engine.FALLBACK_CLUBS;
const abil = o => ({ pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o });
const realRandom = Math.random;
function seedRandom(n) {
  let seed = n | 0;
  Math.random = () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function step(s) {
  switch (s.phase) {
    case 'youth': return engine.advanceYouthYear(s, CLUBS);
    case 'contract_offer': { const o = s.pendingOffers || []; return o.length ? engine.acceptOffer(s, o[0]) : { ...s, phase: 'playing' }; }
    case 'playing': return engine.advanceProSeason(s, CLUBS);
    case 'newspaper': return engine.dismissNewspaper(s);
    case 'season_summary': return engine.dismissSummary(s, CLUBS);
    case 'ballon_dor': return engine.dismissBallonDor(s, CLUBS);
    case 'international_debut': return engine.dismissDebut(s, CLUBS);
    case 'world_cup': return engine.dismissWorldCup(s, CLUBS);
    case 'rivalry_event': return engine.dismissRivalryEvent(s, CLUBS);
    case 'social_media_action': return engine.dismissSocialMediaPhase(s, CLUBS);
    case 'moral_dilemma': return engine.dismissMoralDilemma(s, CLUBS);
    case 'random_events': { const ev = (s.pendingEvents || [])[0]; return ev ? engine.applyEventChoice(s, 0, CLUBS) : { ...s, phase: 'playing', pendingEvents: [] }; }
    case 'red_card_appeal_result': return engine.dismissAppealResult(s, CLUBS);
    case 'rehab_choice': return engine.applyRehabChoice(s, 1);
    case 'transfer_window': return engine.stayAtClub(s);
    default: return null;
  }
}
const played = s => s.seasons.filter(r => r.type === 'playing').length;
const V = s => { try { return lib.squadView(s); } catch { return null; } };
const WANTS = {
  A: ['2025', 2025, s => played(s) >= 3 && V(s)?.source === 'invented' && V(s).carried === 0 && sheet.lastSeason(s)?.thin === true],
  M: ['2025', 2025, s => played(s) >= 1 && V(s)?.source === 'invented' && V(s).carried >= 8],
  B: ['2015-19', 2015, s => played(s) >= 2 && V(s)?.source === 'real' && !V(s).inElevenOnRating],
  R1: ['1990-94', 1990, s => played(s) >= 2 && V(s)?.source === 'roles' && V(s).rank === 1],
  R2: ['1990-94', 1990, s => played(s) >= 2 && V(s)?.source === 'roles' && !V(s).inElevenOnRating && sheet.lastSeason(s)?.thin === true],
  S: ['2025', 2025, s => played(s) >= 2 && V(s)?.source === 'invented' && V(s).arrivals.length >= 2 && V(s).trust.swing !== 0],
};
const SAVES = {};
for (const [k, [era, year, want]] of Object.entries(WANTS)) {
  for (let c = 0; c < 500 && !SAVES[k]; c += 1) {
    seedRandom(c * 104729 + 31);
    const ovr = 50 + (c % 24);
    let s = engine.initCareer('Jo Vale', ['England', 'Spain', 'Brazil'][c % 3], ['ST', 'CM', 'CB', 'LW', 'GK', 'RB', 'CAM'][c % 7], era, abil(ovr), ovr, year, CLUBS, null);
    for (let g = 0; s && !s.retired && g < 260; g += 1) {
      if (s.phase === 'playing' && want(s)) { SAVES[k] = JSON.parse(JSON.stringify(s)); break; }
      s = step(s);
    }
  }
  Math.random = realRandom;
  console.log(`save ${k}: ${SAVES[k] ? `${SAVES[k].currentClub} ${V(SAVES[k]).year} ${SAVES[k].position} ovr ${SAVES[k].overall} rank ${V(SAVES[k]).rank}/${V(SAVES[k]).groupSize} src ${V(SAVES[k]).source} carried ${V(SAVES[k]).carried} arrivals ${V(SAVES[k]).arrivals.length}` : 'NOT FOUND'}`);
}
const clone = s => JSON.parse(JSON.stringify(s));
if (SAVES.A) { SAVES.F = clone(SAVES.A); SAVES.F.frozenOut = 1; SAVES.F.isClubCaptain = true; }
if (SAVES.A) {
  /* a long real line, low rated: PSG going into 2022, a 66 rated CM (the "more" line) */
  const d = clone(SAVES.A); const shift = 2021 - d.seasons[d.seasons.length - 1].year;
  for (const row of d.seasons) row.year += shift;
  Object.assign(d, { position: 'CM', currentClub: 'PSG', currentClubCountry: 'France', currentClubTier: 1, overall: 66 });
  SAVES.D = d;
  /* the critic's picture: Real Madrid going into 2023, a centre back */
  const e = clone(SAVES.A); const sh2 = 2022 - e.seasons[e.seasons.length - 1].year;
  for (const row of e.seasons) row.year += sh2;
  Object.assign(e, { position: 'CB', currentClub: 'Real Madrid', currentClubCountry: 'Spain', currentClubTier: 1, overall: 84 });
  SAVES.E = e;
}
seedRandom(77); SAVES.Y = clone(engine.initCareer('Jo Vale', 'England', 'ST', '2025', abil(55), 55, 2025, CLUBS, null)); Math.random = realRandom;
for (const k of Object.keys(SAVES)) if (!SAVES[k]) delete SAVES[k];
const lines = {};
for (const [k, s] of Object.entries(SAVES)) { const v = V(s); lines[k] = v && { club: v.club, year: v.year, source: v.source, rank: v.rank, groupSize: v.groupSize, inXI: v.inElevenOnRating, trust: v.trust, queue: v.queue.map(m => `${m.me ? '*' : ''}${m.name}:${m.pos}:${m.ovr}:${m.age ?? ''}:${m.since ?? ''}`), bench: v.bench.length, carried: v.carried, last: sheet.lastSeason(s) }; }
fs.writeFileSync(path.join(OUT, 'views.json'), JSON.stringify(lines, null, 1));

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const results = [];
const measure = () => {
  const sheetEl = document.querySelector('[data-squad-sheet]');
  const panel = sheetEl?.querySelector('[role="dialog"]');
  if (!panel) return null;
  const pr = panel.getBoundingClientRect(); const vw = innerWidth; const vh = innerHeight;
  const btns = [...sheetEl.querySelectorAll('button')].map(b => { const r = b.getBoundingClientRect(); return { t: (b.textContent.trim() || b.getAttribute('aria-label') || '').slice(0, 28), top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height), off: r.bottom > vh + 0.5 || r.top < -0.5 || r.right > vw + 0.5 || r.left < -0.5, outPanel: r.bottom > pr.bottom + 0.5 }; });
  let maxBottom = 0; let minFont = 99; const cut = [];
  for (const el of panel.querySelectorAll('*')) {
    const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
    if (!el.closest('[data-squad-bench]')) maxBottom = Math.max(maxBottom, r.bottom);
    if ([...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) {
      const st = getComputedStyle(el); const f = parseFloat(st.fontSize); if (f < minFont) minFont = f;
      if (el.scrollWidth > el.clientWidth + 1 && st.overflow !== 'visible') cut.push(el.textContent.trim().slice(0, 40));
    }
  }
  return { screen: sheetEl.querySelector('[data-squad-screen]')?.getAttribute('data-squad-screen') ?? null, panel: [pr.left, pr.top, pr.right, pr.bottom].map(Math.round), vw, vh, overflowPx: Math.round(maxBottom - pr.bottom), panelOff: pr.bottom > vh + 0.5 || pr.top < -0.5, btns, minFont, cut, text: panel.innerText.replace(/\s+/g, ' ').slice(0, 1800), scrollY: Math.round(scrollY), running: document.getAnimations().filter(a => a.playState === 'running' && sheetEl.contains(a.effect?.target)).length };
};
async function session(k, { width, height, reduced, shots, helpSeen = true }) {
  const tag = `${k}-${width}x${height}${reduced ? '-rm' : ''}${helpSeen ? '' : '-first'}`;
  const rec = { tag, screens: {}, errors: [] };
  results.push(rec);
  const ctx = await browser.newContext({ viewport: { width, height }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  await ctx.addInitScript(([value, seen]) => {
    try {
      if (!sessionStorage.getItem('__seeded')) { sessionStorage.setItem('__seeded', '1'); localStorage.setItem('cookie-consent', 'essential'); localStorage.setItem('soccerCareerSave', value); if (seen) localStorage.setItem('soccerSquad:help', '1'); }
    } catch { /* private mode */ }
  }, [JSON.stringify(SAVES[k]), helpSeen]);
  await ctx.route(/supabase\.co/, r => r.abort());
  const page = await ctx.newPage();
  page.on('pageerror', e => rec.errors.push(String(e).slice(0, 200)));
  const snap = async name => { if (shots) await page.screenshot({ path: path.join(OUT, `${tag}-${name}.png`) }); };
  try {
    await page.goto(`${BASE}/soccer-career`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    const tile = await page.waitForSelector('[data-squad-tile]', { timeout: k === 'Y' ? 8000 : 30000 }).catch(() => null);
    if (!tile) { rec.tile = null; rec.bodyText = (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').slice(0, 300); await snap('notile'); return; }
    await tile.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    rec.tile = await page.evaluate(() => { const t = document.querySelector('[data-squad-tile]'); const r = t.getBoundingClientRect(); return { text: t.innerText.replace(/\s+/g, ' '), h: Math.round(r.height), w: Math.round(r.width), top: Math.round(r.top), cut: [...t.querySelectorAll('*')].filter(e => e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflow !== 'visible').map(e => e.textContent.trim().slice(0, 50)), tiles: document.querySelectorAll('[data-squad-tile]').length }; });
    const before = await page.evaluate(() => ({ y: Math.round(scrollY), save: localStorage.getItem('soccerCareerSave'), keys: Object.keys(localStorage).sort().join(',') }));
    await snap('hub');
    await tile.click();
    await page.waitForSelector('[data-squad-sheet] [role="dialog"]', { timeout: 15000 });
    await page.waitForTimeout(100);
    rec.at100 = await page.evaluate(measure);
    await page.waitForTimeout(700);
    const grab = async name => { await page.waitForTimeout(reduced ? 120 : 750); rec.screens[name] = await page.evaluate(measure); await snap(name); };
    if (!helpSeen) { await grab('firstopen'); await page.click('[data-squad-sheet] button:has-text("← Back")'); }
    await grab('home');
    for (const sc of ['eleven', 'bench', 'place', 'last']) {
      const b = await page.$(`[data-squad-open="${sc}"]`);
      if (!b) { rec.screens[sc] = 'no tile for it'; continue; }
      await b.click(); await page.waitForSelector(`[data-squad-screen="${sc}"]`, { timeout: 8000 });
      await grab(sc);
      await page.click('[data-squad-sheet] button:has-text("← Back")', { force: true }).catch(e => rec.errors.push(`back from ${sc}: ${String(e).slice(0, 120)}`));
      await page.waitForSelector('[data-squad-screen="home"]', { timeout: 8000 }).catch(() => rec.errors.push(`no home after ${sc}`));
    }
    await page.click('[data-squad-sheet] button[aria-label="How the squad works"]'); await page.waitForSelector('[data-squad-screen="help"]'); await grab('help');
    await page.click('[data-squad-sheet] button:has-text("Worked examples")', { force: true }); await page.waitForSelector('[data-squad-screen="examples"]'); await grab('examples');
    /* the keyboard: does Tab stay inside the dialog? */
    let escaped = 0;
    for (let i = 0; i < 14; i += 1) { await page.keyboard.press('Tab'); if (await page.evaluate(() => !document.activeElement?.closest('[data-squad-sheet]'))) escaped += 1; }
    rec.tabEscapes = escaped;
    await page.evaluate(() => document.querySelector('[data-squad-sheet] [role="dialog"]').focus());
    await page.keyboard.press('Escape'); await page.waitForTimeout(150);
    rec.afterEsc1 = await page.evaluate(() => document.querySelector('[data-squad-screen]')?.getAttribute('data-squad-screen') ?? 'closed');
    await page.keyboard.press('Escape'); await page.waitForTimeout(200);
    rec.afterEsc2 = await page.evaluate(() => document.querySelector('[data-squad-screen]')?.getAttribute('data-squad-screen') ?? 'closed');
    const after = await page.evaluate(() => ({ y: Math.round(scrollY), save: localStorage.getItem('soccerCareerSave'), keys: Object.keys(localStorage).sort().join(','), focusOnTile: document.activeElement?.hasAttribute('data-squad-tile') ?? false }));
    rec.scrollMoved = after.y - before.y; rec.saveSame = after.save === before.save; rec.newKeys = after.keys.split(',').filter(x => !before.keys.split(',').includes(x)); rec.focusOnTile = after.focusOnTile;
  } catch (e) { rec.errors.push(`walk: ${String(e).slice(0, 300)}`); await snap('crash').catch(() => {}); } finally { await ctx.close(); }
}
const ALL = Object.keys(SAVES);
for (const k of ALL) await session(k, { width: 390, height: 844, reduced: false, shots: true });
for (const k of ALL) await session(k, { width: 1280, height: 900, reduced: true, shots: ['A', 'M', 'B', 'R2', 'D', 'E'].includes(k) });
for (const k of ALL.filter(x => x !== 'Y')) await session(k, { width: 390, height: 664, reduced: true, shots: ['S', 'D', 'R2', 'M'].includes(k) });
for (const k of ['S', 'D', 'M', 'R2', 'F'].filter(x => SAVES[x])) await session(k, { width: 360, height: 640, reduced: false, shots: ['S', 'D'].includes(k) });
if (SAVES.A) await session('A', { width: 390, height: 844, reduced: true, shots: false, helpSeen: false });
if (SAVES.A) await session('A', { width: 390, height: 844, reduced: false, shots: true, helpSeen: false });
await browser.close();
fs.writeFileSync(path.join(OUT, 'measure.json'), JSON.stringify(results));
for (const r of results) {
  const bad = [];
  if (r.errors.length) bad.push(`errors ${JSON.stringify(r.errors)}`);
  if (r.tile === null) bad.push('NO TILE');
  if (r.tile?.cut?.length) bad.push(`tile cut ${JSON.stringify(r.tile.cut)}`);
  for (const [name, m] of Object.entries(r.screens)) {
    if (!m || typeof m === 'string') continue;
    const offs = m.btns.filter(b => b.off || b.outPanel).map(b => `${b.t}@${b.top}-${b.bottom}`);
    const small = m.btns.filter(b => b.h < 44).map(b => `${b.t}:${b.h}`);
    if (m.panelOff || m.overflowPx > 1 || offs.length) bad.push(`${name}: overflow ${m.overflowPx}px panel ${m.panel.join(',')} of ${m.vw}x${m.vh} offscreen [${offs.join('; ')}]`);
    if (small.length) bad.push(`${name}: short buttons ${small.join(', ')}`);
    if (m.minFont < 12) bad.push(`${name}: font ${m.minFont}`);
    if (m.cut.length) bad.push(`${name}: cut ${JSON.stringify(m.cut.slice(0, 8))}`);
    if (r.tag.includes('-rm') && m.running) bad.push(`${name}: ${m.running} animations still running under reduced motion`);
  }
  if (r.tile && (r.scrollMoved !== 0 || !r.saveSame || !r.focusOnTile || r.afterEsc2 !== 'closed' || (r.newKeys || []).length)) bad.push(`after: moved ${r.scrollMoved} saveSame ${r.saveSame} focusOnTile ${r.focusOnTile} esc ${r.afterEsc1}/${r.afterEsc2} newKeys ${r.newKeys}`);
  console.log(`${r.tag} | tile ${r.tile ? `"${r.tile.text}" ${r.tile.w}x${r.tile.h}` : 'none'} | tabEscapes ${r.tabEscapes} | at100 running ${r.at100?.running} | ${bad.length ? `ANOMALIES: ${bad.join(' || ')}` : 'clean'}`);
}
console.log(`RVWALK DONE ${results.length} sessions`);
