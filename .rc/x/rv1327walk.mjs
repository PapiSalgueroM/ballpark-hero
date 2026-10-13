// Reviewer walk, Round 1327 (runner only, sent as .rc/x/rv1327walk.mjs). Database blocked in every page.
// A: base-written saves with the narrating cards 11, 12, 17 and 19 pending (old text), loaded on this build and answered.
// B: this engine's own pending cards 11, 12 and 15 built from rows that hold their facts: text on screen vs the row.
// C: natural play: a mid career save in the playing phase, Next Season pressed by hand, every paper and card shown,
//    each card the page itself deals checked against the row it narrates, for several seasons.
// At 390x844 and 1280x900, reduced motion on and off. Shots and report.json go to $RC_OUT.
import '../../scripts/lib/offlineTransport.cjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import * as esbuild from 'esbuild';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const ROOT = process.cwd();
const BASE_SHA = 'c9c77ebab727b9bd624459388e33b6579538e4ca';
const SITE = (process.env.BASE || 'http://localhost:4173').replace(/\/$/, '');
const OUT = path.resolve(process.env.RC_OUT || path.join(ROOT, '.tmp-fx/rv-walk'));
fs.mkdirSync(OUT, { recursive: true });
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'rv1327-'));
async function bundle(tag, ref) {
  const plugin = { name: 'rv-src', setup(b) {
    b.onLoad({ filter: /\.(ts|tsx)$/ }, args => {
      const rel = path.relative(ROOT, args.path).split(path.sep).join('/');
      if (!rel.startsWith('src/')) return undefined;
      const source = ref ? execFileSync('git', ['show', `${ref}:${rel}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20 }) : fs.readFileSync(args.path, 'utf8');
      return { contents: source.replace(/\r\n/g, '\n'), loader: rel.endsWith('.tsx') ? 'tsx' : 'ts', resolveDir: path.dirname(args.path) };
    });
  } };
  const out = path.join(TMP, `${tag}.mjs`);
  await esbuild.build({ stdin: { contents: "export * as engine from './src/lib/soccerCareerEngine';", resolveDir: ROOT, loader: 'ts' },
    bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error', alias: { '@': path.join(ROOT, 'src') }, plugins: [plugin],
    define: { 'import.meta.env': '{"DEV":false,"PROD":true,"MODE":"production"}' } });
  return (await import(pathToFileURL(out).href)).engine;
}
const store = new Map();
globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), key: () => null, get length() { return store.size; }, clear: () => store.clear() };
const seeded = seed => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const withSeed = (seed, fn) => { const r = Math.random; Math.random = seeded(seed); try { return fn(); } finally { Math.random = r; } };
const stats = o => ({ pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o });
const copy = v => JSON.parse(JSON.stringify(v));
const seen = s => (s && s.chanceWheel ? { ...s, chanceWheel: { ...s.chanceWheel, seen: true } } : s);
function step(M, s, seed) {
  const clubs = M.FALLBACK_CLUBS;
  switch (s.phase) {
    case 'youth': return M.advanceYouthYear(s, clubs);
    case 'contract_offer': return s.pendingOffers?.length ? M.acceptOffer(s, s.pendingOffers.find(o => !o.isLoan) || s.pendingOffers[0]) : { ...s, phase: 'playing' };
    case 'playing': return M.advanceProSeason(s, clubs);
    case 'newspaper': return M.dismissNewspaper(s);
    case 'season_summary': return M.dismissSummary(s, clubs);
    case 'rehab_choice': return M.applyRehabChoice(s, 0);
    case 'random_events': return s.pendingEvents?.length ? M.applyEventChoice(s, (seed + s.pendingEvents[0].id) % s.pendingEvents[0].choices.length, clubs) : { ...s, phase: 'playing' };
    case 'moral_dilemma': return M.dismissMoralDilemma(s, clubs);
    case 'social_media_action': { const t = M.dismissSocialMediaPhase(s, clubs); return t.phase === 'social_media_action' ? M.dismissSocialMediaPhase(t, clubs) : t; }
    case 'red_card_appeal_result': return M.dismissAppealResult(s, clubs);
    case 'international_debut': return M.dismissDebut(s, clubs);
    case 'world_cup': return M.dismissWorldCup(s, clubs);
    case 'rivalry_event': return M.dismissRivalryEvent(s, clubs);
    case 'ballon_dor': return M.dismissBallonDor(s, clubs);
    case 'transfer_window': { const sit = s.transferSituation; if (sit?.type === 'contract_expiry') return M.signExtension(s); return M.stayAtClub(s); }
    case 'retirement_suggestion': return M.acceptRetirementSuggestion(s);
    default: return null;
  }
}
/** Plays a career with a seeded stream, calling visit(state) at every step; stops when visit returns true. */
function play(M, name, nat, pos, seed, visit, ovr = 70) {
  return withSeed(seed, () => {
    let s = M.initCareer(name, nat, pos, '2020s', stats(ovr), ovr, 2020, M.FALLBACK_CLUBS, null);
    for (let g = 0; g < 500 && s && !s.retired; g += 1) { if (visit(s)) return s; s = step(M, s, seed); }
    return null;
  });
}
const B = await bundle('base', BASE_SHA);
const E = await bundle('head', null);
const report = { site: SITE, notes: [], failures: [], runs: [] };
const note = m => { report.notes.push(m); console.log(`  NOTE: ${m}`); };
const failNote = m => { report.failures.push(m); console.error(`  FAIL: ${m}`); };

/* A: base saves with old narrating cards on screen */
const baseState = play(B, 'Old Save', 'England', 'ST', 1327, s => s.phase === 'random_events' && s.seasons.length >= 6);
const baseCat = B.getAllEvents(copy(baseState));
const OLD_IDS = [11, 12, 17, 19];
const oldSave = seen(copy({ ...baseState, internationalCareer: false, intStats: { ...baseState.intStats, isRetired: false }, pendingEvents: OLD_IDS.map(id => baseCat.find(e => e.id === id)) }));
note(`A: base save, titles ${oldSave.pendingEvents.map(e => e.title).join(' | ')}; last row ${JSON.stringify({ y: oldSave.seasons.at(-1).year, inj: oldSave.seasons.at(-1).injury ?? null, fin: oldSave.seasons.at(-1).leagueFinish ?? null })}`);

/* B: this engine's cards built from rows that hold their facts */
const found = {};
for (let seed = 1; seed < 300 && Object.keys(found).length < 3; seed += 1) {
  play(E, `Row ${seed}`, ['England', 'Brazil', 'France', 'Japan'][seed % 4], ['ST', 'CM', 'CB', 'GK'][seed % 4], 70000 + seed, s => {
    if (s.phase !== 'random_events') return false;
    for (const id of [11, 12, 15]) if (!found[id] && E.cardFitsSeason(id, s)) found[id] = copy(s);
    return Object.keys(found).length >= 3;
  }, 55 + (seed % 25));
}
const headCards = Object.entries(found).map(([id, st]) => ({ id: Number(id), st, card: E.getAllEvents(copy(st)).find(e => e.id === Number(id)) }));
note(`B: head cards found ${headCards.map(c => `${c.id} "${c.card.description}" row ${JSON.stringify({ inj: c.st.seasons.at(-1).injury ?? null, fin: c.st.seasons.at(-1).leagueFinish, size: c.st.seasons.at(-1).leagueSize, lapps: c.st.seasons.at(-1).leagueApps, club: c.st.seasons.at(-1).club, cur: c.st.currentClub })}`).join(' || ')}`);

/* C: a mid career save in the playing phase, made by this engine */
const liveSave = seen(copy(play(E, 'Walk Player', 'Brazil', 'ST', 4242, s => s.phase === 'playing' && s.seasons.filter(r => r.type === 'playing').length >= 3, 72)));
note(`C: live save ${liveSave.playerName}, age ${liveSave.age}, ${liveSave.seasons.length} rows, club ${liveSave.currentClub}`);

/* ─── the browser ─── */
const readCard = page => page.evaluate(() => {
  const h = [...document.querySelectorAll('h3')].find(x => x.closest('.rounded-xl.border-2'));
  const card = h?.closest('.rounded-xl.border-2');
  if (!card) return null;
  const vw = document.documentElement.clientWidth;
  const buttons = [...card.querySelectorAll('button')].map(b => { const r = b.getBoundingClientRect(); return { label: b.textContent.trim().slice(0, 70), height: Math.round(r.height), left: r.left, right: r.right }; });
  const small = [];
  const w = document.createTreeWalker(card, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) { if (!n.textContent.trim()) continue; const size = parseFloat(getComputedStyle(n.parentElement).fontSize); if (size < 12) small.push(`${size}px ${n.textContent.trim().slice(0, 50)}`); }
  const r = card.getBoundingClientRect();
  return { title: h.textContent, text: card.innerText.replace(/\s+/g, ' ').slice(0, 600), buttons, small, overflow: document.documentElement.scrollWidth > vw + 1, top: Math.round(r.top), bottom: Math.round(r.bottom), vh: innerHeight, vw, scrollY: Math.round(scrollY) };
});
const saveOf = page => page.evaluate(() => JSON.parse(localStorage.getItem('soccerCareerSave') || 'null'));
const rawOf = page => page.evaluate(() => localStorage.getItem('soccerCareerSave'));
const waitChange = (page, before, ms = 20000) => page.waitForFunction(b => localStorage.getItem('soccerCareerSave') !== b, before, { timeout: ms });
async function open(page, save) {
  await page.goto(`${SITE}/robots.txt`);
  await page.evaluate(v => { localStorage.setItem('soccerCareerSave', v); localStorage.setItem('cookie-consent', 'essential'); }, JSON.stringify(save));
  await page.goto(`${SITE}/soccer-career`, { waitUntil: 'domcontentloaded' });
}
async function wheel(page) {
  for (let i = 0; i < 3; i += 1) {
    const skip = page.locator('[data-wheel-skip]:visible'), cont = page.locator('[data-wheel-continue]:visible');
    if (await skip.count()) { await skip.first().click(); await page.waitForTimeout(300); }
    if (await cont.count()) { await cont.first().click(); await page.waitForTimeout(300); return true; }
    await page.waitForTimeout(400);
  }
  return false;
}
function judgeCard(tag, m, where) {
  for (const b of m.buttons) { if (b.height < 44) failNote(`${tag} ${where}: "${b.label}" is ${b.height}px tall`); if (b.left < -0.5 || b.right > m.vw + 0.5) failNote(`${tag} ${where}: "${b.label}" cut off`); }
  if (m.overflow) failNote(`${tag} ${where}: page scrolls sideways`);
  if (m.top < -1 || m.top > m.vh - 40) failNote(`${tag} ${where}: card starts at ${m.top}px`);
}
async function answer(page, tag, where, shots) {
  const m = await readCard(page);
  if (!m) { failNote(`${tag} ${where}: no card on screen`); return null; }
  judgeCard(tag, m, where);
  if (shots) await page.screenshot({ path: path.join(OUT, `${tag}-${where}.png`) });
  const before = await rawOf(page);
  const y0 = await page.evaluate(() => scrollY);
  await page.evaluate(() => [...document.querySelectorAll('h3')].find(x => x.closest('.rounded-xl.border-2')).closest('.rounded-xl.border-2').querySelector('button').click());
  await waitChange(page, before).catch(() => failNote(`${tag} ${where}: answering wrote nothing`));
  await page.waitForTimeout(700);
  await wheel(page);
  const y1 = await page.evaluate(() => scrollY);
  if (shots) await page.screenshot({ path: path.join(OUT, `${tag}-${where}-after.png`) });
  return { ...m, scroll: `${y0}->${y1}` };
}
const GATED = new Set([1, 4, 7, 9, 11, 12, 15, 17, 18, 19]);
const browser = await pw.chromium.launch({ headless: true });
try {
  for (const [width, height] of [[390, 844], [1280, 900]]) for (const motion of ['reduce', 'no-preference']) {
    const tag = `${width}-${motion === 'reduce' ? 'still' : 'motion'}`;
    const shots = tag === '390-still' || tag === '1280-motion' || tag === '390-motion';
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: motion });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(String(e.message).slice(0, 160)));
    await page.route(/supabase\.co/, r => r.abort());
    const run = { tag, A: [], B: [], C: [], errors };
    report.runs.push(run);
    try {
      /* A: base save, old cards */
      await open(page, oldSave);
      for (let i = 0; i < oldSave.pendingEvents.length; i += 1) {
        const t = oldSave.pendingEvents[i].title;
        await page.waitForFunction(x => document.body.innerText.includes(x), t, { timeout: 30000 });
        await page.waitForTimeout(motion === 'reduce' ? 200 : 900);
        run.A.push(await answer(page, tag, `A-old${oldSave.pendingEvents[i].id}`, shots));
      }
      const afterA = await saveOf(page);
      run.A.push({ phase: afterA.phase, debut: afterA.intStats?.debutYear ?? null, debutAge: afterA.intStats?.debutAge ?? null, intl: afterA.internationalCareer, lastEvents: afterA.events.slice(-5) });
      if (shots) await page.screenshot({ path: path.join(OUT, `${tag}-A-done-full.png`), fullPage: true });
      /* B: this engine's narrating cards on rows that hold their facts */
      for (const c of headCards) {
        await open(page, seen(copy({ ...c.st, phase: 'random_events', pendingEvents: [c.card] })));
        await page.waitForFunction(x => document.body.innerText.includes(x), c.card.title, { timeout: 30000 });
        await page.waitForTimeout(motion === 'reduce' ? 200 : 900);
        const m = await answer(page, tag, `B-card${c.id}`, shots);
        const after = await saveOf(page);
        const row = c.st.seasons.at(-1);
        const res = { id: c.id, screen: m?.text, row: { injury: row.injury ?? null, finish: row.leagueFinish ?? null, size: row.leagueSize ?? null, leagueApps: row.leagueApps ?? null }, logged: after.events.slice(-2), scroll: m?.scroll, small: m?.small };
        run.B.push(res);
        if (c.id === 11 && row.injury && m && !m.text.toLowerCase().includes(String(row.injury).toLowerCase())) failNote(`${tag} B-card11: screen does not name the row's injury ${row.injury}`);
        if (c.id === 11 && row.injury && after.events.slice(-2).some(e => /hamstring/i.test(e)) && !/hamstring/i.test(row.injury)) note(`${tag} B-card11: the event log says hamstring for a row injury "${row.injury}": ${after.events.slice(-2).join(' / ')}`);
      }
      /* C: natural play from the playing phase */
      await open(page, liveSave);
      await page.getByRole('button', { name: 'Next Season', exact: true }).waitFor({ timeout: 45000 });
      let seasonsPlayed = 0, paperShots = 0, cardN = 0;
      for (let g = 0; g < 70 && seasonsPlayed < 4; g += 1) {
        const raw = await rawOf(page);
        const st = JSON.parse(raw);
        if (st.phase === 'playing') {
          await page.getByRole('button', { name: 'Next Season', exact: true }).click();
          seasonsPlayed += 1;
        } else if (st.phase === 'newspaper') {
          await page.waitForTimeout(motion === 'reduce' ? 200 : 900);
          if (shots && paperShots < 3) await page.screenshot({ path: path.join(OUT, `${tag}-C-paper${++paperShots}.png`) });
          run.C.push({ paper: (st.pendingNews || []).map(a => a.headline) });
          await page.getByRole('button', { name: /Continue to Season Summary/ }).click();
        } else if (st.phase === 'season_summary') {
          await page.getByRole('button', { name: 'Continue →', exact: true }).first().click();
        } else if (st.phase === 'random_events' && st.pendingEvents?.length) {
          const ev = st.pendingEvents[0];
          await page.waitForFunction(x => document.body.innerText.includes(x), ev.title, { timeout: 30000 });
          await page.waitForTimeout(motion === 'reduce' ? 200 : 900);
          const row = st.seasons.at(-1);
          const fits = GATED.has(ev.id) ? E.cardFitsSeason(ev.id, st) : null;
          if (GATED.has(ev.id) && !fits) failNote(`${tag} C: the page dealt card ${ev.id} "${ev.title}" on a row without its fact`);
          const m = await answer(page, tag, `C-card${++cardN}-id${ev.id}`, shots && cardN <= 8);
          run.C.push({ card: ev.id, title: ev.title, desc: ev.description, row: { year: row.year, goals: row.goals, injury: row.injury ?? null, finish: row.leagueFinish ?? null }, scroll: m?.scroll, small: m?.small, buttons: m?.buttons.map(b => b.height) });
          continue;
        } else {
          const next = withSeed(900 + g, () => step(E, st, 77));
          if (!next) { failNote(`${tag} C: no move for ${st.phase}`); break; }
          run.C.push({ nodeStep: st.phase });
          await open(page, seen(copy(next)));
          await page.waitForTimeout(1500);
          continue;
        }
        await waitChange(page, raw).catch(() => failNote(`${tag} C: ${st.phase} step wrote nothing in 20 s`));
        await page.waitForTimeout(motion === 'reduce' ? 300 : 1000);
        await wheel(page);
      }
      if (errors.length) failNote(`${tag}: page errors ${errors.join(' | ')}`);
    } catch (err) { failNote(`${tag}: ${String(err.message).split('\n')[0]}`); await page.screenshot({ path: path.join(OUT, `${tag}-crash.png`) }).catch(() => {}); }
    await context.close();
  }
} finally { await browser.close(); }
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
for (const r of report.runs) console.log(`${r.tag}: A ${r.A.length} B ${r.B.length} C ${r.C.length} errors ${r.errors.length}`);
console.log(report.failures.length ? `rv1327walk: ${report.failures.length} failures` : 'rv1327walk: green');
process.exit(report.failures.length ? 1 : 0);
