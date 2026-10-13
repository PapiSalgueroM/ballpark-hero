/**
 * Round 1327 walk: the event cards and the paper on a phone and a desktop.
 *
 * Two saves, doctored from a page where the app does not run (robots.txt on the
 * same origin), then the game is opened:
 *   cards  written by the BASE engine (8fea14e2) with cards 1, 7 and 18 on
 *          screen, the way an older save holds them; each card's title must be
 *          on screen before the first tap, each is answered by its first choice.
 *   paper  written by this engine, in the newspaper phase, holding a story
 *          under weight 1 (one the old ranking almost never printed).
 * At 320, 390 and 1280 wide, reduced motion on and off: a picture of each card
 * with its consequence lines, of the answer, of the next card and of the paper.
 * Measured: every choice at least 44 px tall, no horizontal overflow, nothing
 * cut off at the sides, window.scrollY either side of an answer, and no text
 * under 12 px inside the card but the two known small lines of the card (the
 * category line at 10 px and the consequence line at 11 px, SoccerCareer.tsx,
 * F11's page), which are reported as the exceptions they are.
 *
 * The live database is blocked in every page (supabase.co aborted).
 * Run (a served build): BASE=http://localhost:4173 node scripts/playSoccerEventCards.mjs
 * Pictures and measurements go to $RC_OUT (or .tmp-fx/event-cards).
 */
import './lib/offlineTransport.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as esbuild from 'esbuild';
import pw from './lib/playwrightLoader.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE_SHA = '8fea14e216fb550b4676ac29f06867234594df21';
const SITE = (process.env.BASE || 'http://localhost:4173').replace(/\/$/, '');
const OUT = path.resolve(process.env.RC_OUT || path.join(ROOT, '.tmp-fx/event-cards'));
fs.mkdirSync(OUT, { recursive: true });
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'r1327-walk-'));

async function bundle(tag, ref) {
  const plugin = { name: 'walk-source', setup(b) {
    b.onLoad({ filter: /\.(ts|tsx)$/ }, args => {
      const rel = path.relative(ROOT, args.path).split(path.sep).join('/');
      if (!rel.startsWith('src/')) return undefined;
      const source = ref ? execFileSync('git', ['show', `${ref}:${rel}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }) : fs.readFileSync(args.path, 'utf8');
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
const stats = o => ({ pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o });
function drive(M, seed, until) {
  const real = Math.random; Math.random = seeded(seed);
  try {
    const clubs = M.FALLBACK_CLUBS;
    let s = M.initCareer(`Walk ${seed}`, 'England', 'ST', '2020s', stats(70), 70, 2020, clubs, null);
    for (let g = 0, played = 0; g < 500 && !s.retired; g += 1) {
      if (until(s, played)) return s;
      const p = s.phase;
      if (p === 'playing') played += 1;
      s = p === 'youth' ? M.advanceYouthYear(s, clubs) : p === 'contract_offer' ? (s.pendingOffers?.length ? M.acceptOffer(s, s.pendingOffers[0]) : { ...s, phase: 'playing' })
        : p === 'playing' ? M.advanceProSeason(s, clubs) : p === 'newspaper' ? M.dismissNewspaper(s) : p === 'season_summary' ? M.dismissSummary(s, clubs)
        : p === 'rehab_choice' ? M.applyRehabChoice(s, 0) : p === 'random_events' ? M.applyEventChoice(s, 0, clubs) : p === 'moral_dilemma' ? M.dismissMoralDilemma(s, clubs)
        : p === 'social_media_action' ? M.dismissSocialMediaPhase(s, clubs) : p === 'red_card_appeal_result' ? M.dismissAppealResult(s, clubs)
        : p === 'international_debut' ? M.dismissDebut(s, clubs) : p === 'world_cup' ? M.dismissWorldCup(s, clubs) : p === 'rivalry_event' ? M.dismissRivalryEvent(s, clubs)
        : p === 'ballon_dor' ? M.dismissBallonDor(s, clubs) : p === 'transfer_window' ? M.stayAtClub(s) : p === 'retirement_suggestion' ? M.acceptRetirementSuggestion(s) : null;
      if (!s) throw new Error(`walk drive: no move for ${p}`);
    }
    return null;
  } finally { Math.random = real; }
}

const B = await bundle('base', BASE_SHA);
const E = await bundle('head', null);
const CARD_IDS = [1, 7, 18];
const baseState = drive(B, 1327, (s, played) => s.phase === 'random_events' && played >= 4);
assert.ok(baseState, 'the base drive reached a card batch');
const catalog = B.getAllEvents(JSON.parse(JSON.stringify(baseState)));
const cardsSave = JSON.parse(JSON.stringify({ ...baseState, phase: 'random_events', pendingEvents: CARD_IDS.map(id => catalog.find(e => e.id === id)) }));
const CARD_TITLES = cardsSave.pendingEvents.map(e => e.title);
const WOKEN = ['Reveals Secret To Success', 'Booed By Own Fans', 'Wants Out As Contract Talks', 'Out For Weeks With', 'Hits Out At Manager', 'M Bid For',
  'Available On Free Transfer', 'HAPPIEST MAN', 'Match Is A Show Now', 'Followers After Viral Moment', 'LEADER OF THE NATION', 'Works Harder Than'];
let paperSave = null, wokenHeadline = null;
for (let seed = 1; seed < 400 && !paperSave; seed += 1) {
  const s = drive(E, 50000 + seed, st => st.phase === 'newspaper' && (st.pendingNews || []).some(a => WOKEN.some(w => a.headline.includes(w))));
  if (s) { paperSave = JSON.parse(JSON.stringify(s)); wokenHeadline = s.pendingNews.find(a => WOKEN.some(w => a.headline.includes(w))).headline; }
}
assert.ok(paperSave, 'some career printed a story under weight 1');
console.log(`saves: cards ${CARD_TITLES.join(', ')} (base engine); paper "${wokenHeadline}" (this engine)`);

/* ─── the browser ───────────────────────────────────────────────────────── */

const KNOWN_SMALL = ['text-[10px]', 'text-[11px]'];
const report = { site: SITE, cards: CARD_TITLES, paper: wokenHeadline, runs: [], failures: [] };
const failNote = m => { report.failures.push(m); console.error(`  FAIL: ${m}`); };
const readCard = page => page.evaluate(() => {
  const h = [...document.querySelectorAll('h3')].find(x => x.closest('.rounded-xl.border-2'));
  const card = h?.closest('.rounded-xl.border-2');
  if (!card) return null;
  const vw = document.documentElement.clientWidth;
  const buttons = [...card.querySelectorAll('button')].map(b => { const r = b.getBoundingClientRect(); return { label: b.textContent.trim().slice(0, 60), height: r.height, left: r.left, right: r.right }; });
  const small = [];
  const walker = document.createTreeWalker(card, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.textContent.trim()) continue;
    const el = n.parentElement, size = parseFloat(getComputedStyle(el).fontSize);
    if (size < 12) small.push({ text: n.textContent.trim().slice(0, 60), size, cls: String(el.className) });
  }
  const r = card.getBoundingClientRect();
  return { title: h.textContent, buttons, small, overflow: document.documentElement.scrollWidth > vw + 1, left: r.left, right: r.right, vw, scrollY: window.scrollY };
});
const waitText = (page, text) => page.waitForFunction(t => document.body.innerText.includes(t), text, { timeout: 30000 });
const browser = await pw.chromium.launch({ headless: true });
try {
  for (const width of [320, 390, 1280]) for (const motion of ['reduce', 'no-preference']) {
    const tag = `${width}-${motion === 'reduce' ? 'still' : 'motion'}`;
    const context = await browser.newContext({ viewport: { width, height: width === 1280 ? 900 : width === 320 ? 568 : 844 }, reducedMotion: motion });
    const page = await context.newPage();
    await page.route(/supabase\.co/, r => r.abort());
    const run = { tag, steps: [] };
    report.runs.push(run);
    try {
      const open = async save => {
        await page.goto(`${SITE}/robots.txt`);
        await page.evaluate(v => localStorage.setItem('soccerCareerSave', v), JSON.stringify(save));
        await page.goto(`${SITE}/soccer-career`, { waitUntil: 'domcontentloaded' });
      };
      await open(cardsSave);
      for (let i = 0; i < CARD_TITLES.length; i += 1) {
        await waitText(page, CARD_TITLES[i]);
        await page.waitForTimeout(motion === 'reduce' ? 150 : 900);
        const m = await readCard(page);
        if (!m) { failNote(`${tag}: card ${CARD_TITLES[i]} is not drawn as a card`); break; }
        await page.screenshot({ path: path.join(OUT, `${tag}-card${i + 1}.png`), fullPage: false });
        if (m.title !== CARD_TITLES[i]) failNote(`${tag}: the card on screen is "${m.title}", the save holds "${CARD_TITLES[i]}"`);
        for (const b of m.buttons) {
          if (b.height < 44) failNote(`${tag}: "${b.label}" is ${b.height} px tall`);
          if (b.left < -0.5 || b.right > m.vw + 0.5) failNote(`${tag}: "${b.label}" is cut off at the side`);
        }
        if (m.overflow) failNote(`${tag}: the page scrolls sideways on "${m.title}"`);
        const unknown = m.small.filter(x => !KNOWN_SMALL.some(k => x.cls.includes(k)));
        for (const x of unknown) failNote(`${tag}: "${x.text}" is ${x.size} px on "${m.title}"`);
        const before = m.scrollY;
        await page.evaluate(() => [...document.querySelectorAll('h3')].find(x => x.closest('.rounded-xl.border-2')).closest('.rounded-xl.border-2').querySelector('button').click());
        if (i + 1 < CARD_TITLES.length) await waitText(page, CARD_TITLES[i + 1]); else await page.waitForTimeout(1200);
        const after = await page.evaluate(() => window.scrollY);
        await page.screenshot({ path: path.join(OUT, `${tag}-answer${i + 1}.png`), fullPage: false });
        run.steps.push({ card: m.title, buttons: m.buttons.map(b => Math.round(b.height)), small: m.small.map(x => `${x.size}px ${x.text}`), scrollBefore: before, scrollAfter: after });
      }
      await open(paperSave);
      await waitText(page, wokenHeadline);
      await page.waitForTimeout(motion === 'reduce' ? 150 : 900);
      await page.screenshot({ path: path.join(OUT, `${tag}-paper.png`), fullPage: false });
      const paper = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1, scrollY: window.scrollY }));
      if (paper.overflow) failNote(`${tag}: the paper scrolls sideways`);
      run.steps.push({ paper: true, ...paper });
    } catch (err) { failNote(`${tag}: ${err.message.split('\n')[0]}`); }
    await context.close();
  }
} finally { await browser.close(); }
fs.writeFileSync(path.join(OUT, 'event-cards-report.json'), JSON.stringify(report, null, 2));
for (const r of report.runs) console.log(`${r.tag}: ${r.steps.map(s => s.paper ? `paper ok` : `${s.card} [${s.buttons.join('/')}px, scroll ${s.scrollBefore}->${s.scrollAfter}, small: ${s.small.length}]`).join('; ')}`);
console.log(report.failures.length ? `playSoccerEventCards: ${report.failures.length} failures` : `playSoccerEventCards: green over ${report.runs.length} runs (known small lines: ${KNOWN_SMALL.join(', ')})`);
process.exit(report.failures.length ? 1 : 0);
