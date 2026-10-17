/* Reviewer's walk for Round 1504 (the summer cards live). Runs on a runner against the served build (BASE), Chromium.
   Every context aborts supabase.co and every host but BASE. Saves come from the real engine (head bundle with the deck
   loaded), and one fixture per profile from the BASE tree's engine (process.env.BASE_TREE, 8293c758) as an old save.
   Cases at 390x844 and 1280x900, reduced motion on and off: deal and answer for ST, GK, CB, CM (layout measured),
   a second press on a DIFFERENT option while the chunk is held (the first press must win), the help line, and an
   old save from the base's engine dealt the live deck. Exit 0 green, 1 a check failed. Screenshots into RC_OUT. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = process.cwd();
const require = createRequire(path.join(ROOT, 'package.json'));
require(path.join(ROOT, 'scripts/lib/offlineTransport.cjs'));
const { build } = await import(pathToFileURL(require.resolve('esbuild')).href);
const pw = (await import(pathToFileURL(path.join(ROOT, 'scripts/lib/playwrightLoader.mjs')).href)).default;
const BASE = (process.env.BASE || 'http://localhost:4173').replace(/\/$/, '');
const OUT = process.env.RC_OUT || path.join(ROOT, '.tmp-fx/walk1504');
fs.mkdirSync(OUT, { recursive: true });
const KEY = 'soccerCareerSave';
const DECK_CHUNK = /\/assets\/soccerDeck-[\w-]+\.js$/;
let failures = 0;
const notes = [];
const check = (ok, label) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}`); if (!ok) failures += 1; return ok; };
const note = s => { console.log(`   ${s}`); notes.push(s); };

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'walk1504-'));
async function bundleFrom(tree, tag, withGate) {
  const out = path.join(TMP, `${tag}.mjs`);
  const entry = ["export * as engine from './src/lib/soccerCareerEngine';", "export * as save from './src/lib/soccerCareerSave';"];
  if (withGate) entry.push("export * as gate from './src/lib/soccerDeckGate';", "export { momentsRoom } from './src/lib/season/soccerMoments';");
  await build({
    stdin: { contents: entry.join('\n'), resolveDir: tree, loader: 'ts' },
    bundle: true, platform: 'node', format: 'esm', outfile: out, jsx: 'automatic', alias: { '@': path.join(tree, 'src') },
    nodePaths: [path.join(ROOT, 'node_modules')],
    define: { 'import.meta.env': '{"DEV":false,"PROD":true,"MODE":"production"}' },
    loader: { '.css': 'empty', '.png': 'empty', '.svg': 'empty', '.jpg': 'empty', '.webp': 'empty' }, logLevel: 'error',
  });
  return import(pathToFileURL(out).href);
}
const H = await bundleFrom(ROOT, 'head', true);
await H.gate.loadSoccerDeck();
const B = process.env.BASE_TREE ? await bundleFrom(process.env.BASE_TREE, 'base', false) : null;
check(!!B, `the base tree's engine bundled (${process.env.BASE_TREE || 'BASE_TREE not set'})`);

const copy = v => JSON.parse(JSON.stringify(v));
const seeded = seed => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const isDeck = id => typeof id === 'number' && id >= 700 && id <= 999;
function step(M, s, clubs) {
  switch (s.phase) {
    case 'youth': return M.advanceYouthYear(s, clubs);
    case 'contract_offer': { const o = (s.pendingOffers || []).find(x => x.isHomegrown) || (s.pendingOffers || [])[0]; return o ? M.acceptOffer(s, o) : { ...s, phase: 'playing' }; }
    case 'playing': return M.advanceProSeason(s, clubs);
    case 'newspaper': return M.dismissNewspaper(s);
    case 'season_summary': return M.dismissSummary(s, clubs);
    case 'rehab_choice': return M.applyRehabChoice(s, 0);
    case 'random_events': return s.pendingEvents?.[0] ? M.applyEventChoice(s, 0, clubs) : { ...s, pendingEvents: [], phase: 'playing' };
    case 'moral_dilemma': return M.dismissMoralDilemma(s, clubs);
    case 'social_media_action': { let t = M.dismissSocialMediaPhase(s, clubs); if (t.phase === 'social_media_action') t = M.dismissSocialMediaPhase(t, clubs); return t; }
    case 'red_card_appeal_result': return M.dismissAppealResult(s, clubs);
    case 'international_debut': return M.dismissDebut(s, clubs);
    case 'world_cup': return M.dismissWorldCup(s, clubs);
    case 'rivalry_event': return M.dismissRivalryEvent(s, clubs);
    case 'ballon_dor': return M.dismissBallonDor(s, clubs);
    case 'transfer_window': return M.stayAtClub(s);
    case 'retirement_suggestion': return M.acceptRetirementSuggestion(s);
    default: return null;
  }
}
/* A social media screen at 19 or younger whose Continue (after one post) deals a deck card first, the career built by
   engine M (the head, or the base for the old save), the deal read from the head engine with the deck loaded. */
function findFixture(M, position, startSeed) {
  const real = Math.random;
  try {
    for (let seed = startSeed; seed < startSeed + 400; seed += 1) {
      Math.random = seeded(seed * 7919);
      const clubs = M.FALLBACK_CLUBS;
      const st = { pace: 62, shooting: 62, passing: 62, dribbling: 62, defending: 62, physical: 62, reflexes: 62 };
      let s = M.initCareer(`Review Walk ${seed}`, 'England', position, '2010-14', st, 62, 2010, clubs, null);
      for (let guard = 0; guard < 400 && s && !s.retired && s.age <= 20; guard += 1) {
        if (s.phase === 'social_media_action' && s.age <= 19 && !s.socialMediaActionUsedThisSeason) {
          const acted = H.engine.applySocialMediaAction(copy(s), 'personal_life');
          const dealt = acted.phase === 'social_media_action' ? H.engine.dismissSocialMediaPhase(acted, H.engine.FALLBACK_CLUBS) : null;
          const first = dealt?.phase === 'random_events' ? dealt.pendingEvents?.[0] : null;
          if (first && isDeck(first.id) && / next season -1/.test(first.choices[0].consequence) && H.momentsRoom(dealt) >= 1) {
            const neutral = first.choices.findIndex(c => c.consequence === 'Nothing changes');
            return { seed, summary: copy(s), pending: copy(dealt), card: { id: first.id, title: first.title, labels: first.choices.map(c => c.label), consequences: first.choices.map(c => c.consequence), neutral } };
          }
        }
        const next = step(M, s, clubs);
        if (!next) break;
        s = next;
      }
    }
    return null;
  } finally { Math.random = real; }
}

const FIX = {};
for (const [i, code] of ['ST', 'GK', 'CB', 'CM'].entries()) {
  FIX[code] = findFixture(H.engine, code, 1000 + i * 500);
  if (!check(!!FIX[code], `${code}: a social media screen whose deal is a deck training card`)) process.exit(1);
  const f = FIX[code];
  note(`${code} seed ${f.seed}: card ${f.card.id} "${f.card.title}", options ${f.card.labels.map((l, j) => `"${l}" = ${f.card.consequences[j]}`).join(' | ')}`);
}
const OLD = B ? findFixture(B.engine, 'ST', 3000) : null;
if (B) check(!!OLD, 'an old save from the base engine whose next deal on the head is a deck card');
if (OLD) note(`old save (base engine) seed ${OLD.seed}: the head deals ${OLD.card.id} "${OLD.card.title}"`);
const clubs = H.engine.FALLBACK_CLUBS;
const oracle = (pending, i = 0) => {
  const after = H.engine.applyEventChoice(copy(pending), i, clubs);
  const card = pending.pendingEvents[0], head = `${card.emoji} ${card.title}: `;
  const line = after.events.slice(pending.events.length).find(l => l.startsWith(head));
  return { boost: after.statBoostNextSeason, toast: line ? line.slice(head.length) : card.choices[i].consequence };
};

const { chromium } = pw;
const browser = await chromium.launch({ headless: true });
const PROFILES = [{ w: 390, h: 844, mobile: true }, { w: 1280, h: 900, mobile: false }];
const MOTIONS = ['reduce', 'no-preference'];
const toasts = page => page.locator('[data-sonner-toast]').allInnerTexts().then(t => t.map(x => x.replace(/\s+/g, ' ').trim()));
const waitToast = async (page, test, ms) => {
  const end = Date.now() + ms;
  while (Date.now() < end) { const t = await toasts(page); const hit = t.find(test); if (hit) return hit; await page.waitForTimeout(100); }
  return null;
};
const savedOf = page => page.evaluate(k => JSON.parse(localStorage.getItem(k) || 'null'), KEY);
const shot = (page, name) => page.screenshot({ path: path.join(OUT, `${name}.png`) }).catch(() => undefined);
const cardTitle = (page, title) => page.locator('h3', { hasText: title }).first();
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const optionOf = (page, label) => page.getByRole('button', { name: new RegExp(`^\\S*\\s*${esc(label)}`) }).first();

async function open(profile, motion, saveText, { holdDeck = 0 } = {}) {
  const ctx = await browser.newContext({ viewport: { width: profile.w, height: profile.h }, isMobile: profile.mobile, hasTouch: profile.mobile,
    serviceWorkers: 'block', reducedMotion: motion,
    storageState: { cookies: [], origins: [{ origin: BASE, localStorage: [{ name: KEY, value: saveText }, { name: 'cookie-consent', value: 'essential' }] }] } });
  await ctx.route(/supabase\.co/, r => r.abort());
  await ctx.route(url => !String(url).startsWith(BASE), r => r.abort());
  if (holdDeck) await ctx.route(DECK_CHUNK, async r => { await new Promise(res => setTimeout(res, holdDeck)); await r.continue().catch(() => undefined); });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  const deckResponse = page.waitForResponse(r => DECK_CHUNK.test(r.url()), { timeout: 90000 }).catch(() => null);
  await page.goto(`${BASE}/soccer-career`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  return { ctx, page, errors, deckResponse };
}
/* Layout of the card on screen: every option button inside the viewport, no text clipped in it, no sideways scroll. */
async function layoutOf(page, title) {
  return page.evaluate(t => {
    const h3 = [...document.querySelectorAll('h3')].find(e => e.textContent.includes(t));
    let card = h3; for (let i = 0; i < 6 && card && card.querySelectorAll('button').length < 2; i += 1) card = card.parentElement;
    const btns = card ? [...card.querySelectorAll('button')] : [];
    const W = window.innerWidth;
    return {
      pageScroll: document.documentElement.scrollWidth - W,
      buttons: btns.map(b => { const r = b.getBoundingClientRect(); return { text: b.innerText.replace(/\s+/g, ' ').trim(), left: Math.round(r.left), right: Math.round(r.right), h: Math.round(r.height), clipped: b.scrollWidth > b.clientWidth + 1 }; }),
      W,
    };
  }, title);
}

/* deal then answer, as a player: Post, Continue, the deck card first, the training option, the toast. */
async function dealAndAnswer(profile, motion, code, saveText, card, id) {
  const { ctx, page, errors, deckResponse } = await open(profile, motion, saveText);
  const res = await deckResponse;
  check(!!res && res.ok(), `${id}: the deck chunk was fetched with the career on screen`);
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: /Post about personal life/ }).first().click();
  await page.getByRole('button', { name: /^Continue/ }).first().click();
  await cardTitle(page, card.title).waitFor({ timeout: 10000 }).catch(() => undefined);
  if (!check(await cardTitle(page, card.title).isVisible(), `${id}: the first card is the deck card, "${card.title}"`)) { await shot(page, `${id}-nocard`); await ctx.close(); return; }
  await page.waitForTimeout(motion === 'reduce' ? 200 : 900);
  const lay = await layoutOf(page, card.title);
  note(`${id} layout: width ${lay.W}, sideways scroll ${lay.pageScroll}, buttons ${JSON.stringify(lay.buttons)}`);
  check(lay.pageScroll <= 0, `${id}: no sideways scroll (${lay.pageScroll})`);
  check(lay.buttons.length >= 2 && lay.buttons.every(b => b.left >= 0 && b.right <= lay.W && !b.clipped), `${id}: every option button inside the viewport and unclipped`);
  const btn = await optionOf(page, card.labels[0]).innerText().catch(() => '');
  check(btn.replace(/\s+/g, ' ').includes(card.consequences[0]), `${id}: the training button prints "${card.consequences[0]}"`);
  await shot(page, `${id}-card`);
  const dealt = await savedOf(page);
  const want = oracle(dealt, 0);
  await optionOf(page, card.labels[0]).click();
  const t = await waitToast(page, x => x.includes(want.toast), 6000);
  check(!!t, `${id}: the toast prints what landed, "${want.toast}"`);
  await page.waitForTimeout(250);
  await shot(page, `${id}-toast`);
  const saved = await savedOf(page);
  check(JSON.stringify(saved?.statBoostNextSeason) === JSON.stringify(want.boost), `${id}: the save queued what node queued (${JSON.stringify(want.boost)} vs ${JSON.stringify(saved?.statBoostNextSeason)})`);
  check(errors.length === 0, `${id}: no page error${errors.length ? ` (${errors[0]})` : ''}`);
  await ctx.close();
}

try {
  for (const profile of PROFILES) for (const motion of MOTIONS) {
    const tag = `${profile.w}-${motion === 'reduce' ? 'rm' : 'anim'}`;
    for (const code of ['ST', 'GK', 'CB', 'CM']) await dealAndAnswer(profile, motion, code, H.save.serializeSoccerCareerSave(FIX[code].summary), FIX[code].card, `${tag}-${code}`);
    if (OLD) await dealAndAnswer(profile, motion, 'ST', B.save.serializeSoccerCareerSave(OLD.summary), OLD.card, `${tag}-oldsave`);
    /* second press on a different option while the chunk is held: the first press wins, one line, one result toast */
    {
      const f = FIX.ST, id = `${tag}-secondpress`;
      const want = oracle(f.pending, 0);
      const { ctx, page, errors } = await open(profile, motion, H.save.serializeSoccerCareerSave(f.pending), { holdDeck: 2500 });
      await cardTitle(page, f.card.title).waitFor({ timeout: 60000 });
      await optionOf(page, f.card.labels[0]).click();
      await page.waitForTimeout(300);
      const busy = await toasts(page);
      await shot(page, `${id}-waiting`);
      await optionOf(page, f.card.labels[f.card.neutral]).click().catch(() => undefined);
      check(!!(await waitToast(page, x => x.includes(want.toast), 12000)), `${id}: the first press's answer lands ("${want.toast}"), waiting toast was ${JSON.stringify(busy)}`);
      await page.waitForTimeout(1200);
      const all = await toasts(page);
      const saved = await savedOf(page);
      const head = `${f.pending.pendingEvents[0].emoji} ${f.card.title}: `;
      check((saved?.events ?? []).filter(l => l.startsWith(head)).length === 1, `${id}: one season log line for the card`);
      check(JSON.stringify(saved?.statBoostNextSeason) === JSON.stringify(want.boost), `${id}: the save holds the FIRST press's answer`);
      check(all.filter(x => x.includes(want.toast)).length === 1 && !all.some(x => x.includes('Nothing changes')), `${id}: one result toast, none for the second press (${JSON.stringify(all)})`);
      check(errors.length === 0, `${id}: no page error${errors.length ? ` (${errors[0]})` : ''}`);
      await ctx.close();
    }
    /* the help line */
    {
      const id = `${tag}-help`;
      const { ctx, page } = await open(profile, motion, H.save.serializeSoccerCareerSave(FIX.ST.pending));
      await page.getByRole('button', { name: 'How to play', exact: true }).first().click();
      const line = page.getByText('Summer cards:', { exact: false }).first();
      const seen = await line.waitFor({ timeout: 10000 }).then(() => true, () => false);
      if (check(seen, `${id}: How to play carries the summer cards line`)) {
        await line.scrollIntoViewIfNeeded().catch(() => undefined);
        const r = await line.evaluate(e => { const b = e.getBoundingClientRect(); return { left: b.left, right: b.right, top: b.top, bottom: b.bottom, W: innerWidth, H: innerHeight, text: e.textContent }; });
        note(`${id}: ${JSON.stringify(r)}`);
        check(r.left >= 0 && r.right <= r.W, `${id}: the line sits inside the viewport`);
      }
      await shot(page, id);
      await ctx.close();
    }
  }
} finally {
  await browser.close();
  fs.writeFileSync(path.join(OUT, 'walk1504.json'), JSON.stringify({ notes, failures }, null, 2));
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* best effort */ }
}
if (failures) { console.error(`walk1504: ${failures} failure(s)`); process.exit(1); }
console.log('walk1504: green');
