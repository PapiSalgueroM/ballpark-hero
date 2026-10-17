/* Round 1504: Soccer Career's summer cards in a real browser, at 390 (a throttled phone) and 1280.

   Runs against a served build (BASE, default http://localhost:4173: the remote check's #!serve), Chromium only,
   with supabase.co aborted in every context (by page.route; the one throttled context instead sends every host but
   localhost to a closed port at the resolver, see slowBrowser). The saves are made in node from the real engine with the deck loaded
   (an esbuild bundle of the engine, the gate and the save module), so every case starts from a state the game
   itself reached, and the walk knows which card the page must show.

   Cases, each at both sizes:
     deal       a save at the between seasons social media screen whose Continue deals a deck card: the page fetches the deck as soon as
                the career is on screen, the walk waits for the chunk's response (so nothing here hangs on timing),
                presses Continue, and the first card is the deck card node dealt, its training button printing the
                gain and the time cost (correction 16(b): nothing waited at the season end).
     fasttap    the same save with the chunk held 4 s and Continue pressed at once: that summer has no deck card and
                nothing waits (critic 16(b): the race can only leave the card out, never deal a different one).
     answer     a save with that deck card pending: the training option lands the gain and the cost in the save, and
                the toast prints the season log line of what landed, never the button's promise.
     delayed    the deck chunk held 1.5 s: the press shows that it is working, a second press does nothing, and the
                answer lands once (correction 3).
     noreload   the tab has used its one stale chunk reload (sessionStorage dukb-reloaded-stale-chunk) and the deck
                chunk is aborted: the press says the card could not load and the card stays (correction 4(c)).
     reload     the deck chunk aborted on a fresh tab: freshBuild's stale chunk rule reloads it once and the career
                comes back on its phase with its card and its save (correction 4(c)).
     ceiling    the card dealt with room to train, then a session banked before the answer (the training ground
                opens with the card on screen, correction 6(b)): the answer lands nothing past the ceiling, pays no
                cost, and the toast says so.
     help       the How to play sheet carries the summer cards line.
     late       the deck chunk held past DECK_WAIT_MS (read from the page's source): the press says it is still loading,
                the card stays, and once the chunk has landed the next press answers it (correction 3's bound).
   At 390 the first case also records how long the deck's chunks take on a throttled phone (each script held 150 ms
   plus its bytes at 1.6 Mbps, see LATENCY_MS), the reading DECK_WAIT_MS in src/pages/SoccerCareer.tsx is set from.

   Exit 0 green, 1 a check failed. Screenshots and walk.json go to RC_OUT (or .tmp-fx/play-soccer-deck). */
import './lib/offlineTransport.cjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import pw from './lib/playwrightLoader.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = (process.env.BASE || 'http://localhost:4173').replace(/\/$/, '');
const OUT = process.env.RC_OUT || path.join(ROOT, '.tmp-fx/play-soccer-deck');
fs.mkdirSync(OUT, { recursive: true });
const KEY = 'soccerCareerSave';
const WAIT_MS = Number(/const DECK_WAIT_MS = (\d+);/.exec(fs.readFileSync(path.join(ROOT, 'src/pages/SoccerCareer.tsx'), 'utf8'))?.[1]);
if (!(WAIT_MS > 0)) { console.error('playSoccerDeck: DECK_WAIT_MS is not in src/pages/SoccerCareer.tsx, refusing to run'); process.exit(2); }
const DECK_CHUNK = /\/assets\/soccerDeck-[\w-]+\.js$/;
let failures = 0;
const report = { cases: [], timing: null };
const check = (ok, label) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}`); if (!ok) failures += 1; return ok; };

/* ─── the saves, from the real engine ─── */
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'play-soccer-deck-'));
const bundled = path.join(TMP, 'oracle.mjs');
await build({
  stdin: { contents: "export * as engine from './src/lib/soccerCareerEngine'; export * as gate from './src/lib/soccerDeckGate'; export * as save from './src/lib/soccerCareerSave'; export { momentsRoom } from './src/lib/season/soccerMoments';", resolveDir: ROOT, loader: 'ts' },
  bundle: true, platform: 'node', format: 'esm', outfile: bundled, jsx: 'automatic', alias: { '@': path.join(ROOT, 'src') },
  define: { 'import.meta.env': '{"DEV":false,"PROD":true,"MODE":"production"}' },
  loader: { '.css': 'empty', '.png': 'empty', '.svg': 'empty', '.jpg': 'empty', '.webp': 'empty' }, logLevel: 'error',
});
const O = await import(pathToFileURL(bundled).href);
await O.gate.loadSoccerDeck();
const copy = v => JSON.parse(JSON.stringify(v));
const seeded = seed => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const isDeck = id => typeof id === 'number' && id >= 700 && id <= 999;
const trains = card => / next season \+1/.test(card.choices[0].consequence) && / next season -1/.test(card.choices[0].consequence);
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
/** The between seasons social media screen at 19 or younger (no moral dilemma can come before 20,
 *  tryTriggerMoralDilemma), whose Continue deals a deck training card first; and that card pending. (The season
 *  summary is followed by the awards night before this screen, so the walk starts at the last screen before the deal.) */
const CONTINUE_PATH = new Set(['social_media_action']);
function findFixture(position) {
  const real = Math.random;
  try {
    for (let seed = 1; seed < 400; seed += 1) {
      Math.random = seeded(seed * 7919);
      const M = O.engine, clubs = M.FALLBACK_CLUBS;
      const st = { pace: 62, shooting: 62, passing: 62, dribbling: 62, defending: 62, physical: 62, reflexes: 62 };
      let s = M.initCareer(`Deck Walk ${seed}`, 'England', position, '2010-14', st, 62, 2010, clubs, null);
      for (let guard = 0; guard < 400 && s && !s.retired && s.age <= 20; guard += 1) {
        /* the screen asks for one action before its Continue: the walk posts about his personal life (a fixed
           follower gain, nothing that moves a stat or the room), then continues, as the page will */
        if (CONTINUE_PATH.has(s.phase) && s.age <= 19 && !s.socialMediaActionUsedThisSeason) {
          const acted = M.applySocialMediaAction(copy(s), 'personal_life');
          const dealt = acted.phase === 'social_media_action' ? M.dismissSocialMediaPhase(acted, clubs) : null;
          const first = dealt?.phase === 'random_events' ? dealt.pendingEvents?.[0] : null;
          if (first && isDeck(first.id) && trains(first) && O.momentsRoom(dealt) >= 1) {
            return { seed, summary: copy(s), pending: copy(dealt), card: { id: first.id, title: first.title, labels: first.choices.map(c => c.label), consequence: first.choices[0].consequence } };
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

const FIX = { ST: findFixture('ST'), GK: findFixture('GK') };
for (const [code, f] of Object.entries(FIX)) {
  if (!check(!!f, `${code}: the engine dealt a deck training card from the social media screen within 400 seeds`)) process.exit(1);
  console.log(`   ${code} seed ${f.seed}: ${f.card.id} "${f.card.title}", "${f.card.labels[0]}" prints "${f.card.consequence}"`);
}
const clubs = O.engine.FALLBACK_CLUBS;
/** What node says the answer does: the saved boosts and the toast (the season log line of what landed). */
const oracle = (pending, i = 0) => {
  const after = O.engine.applyEventChoice(copy(pending), i, clubs);
  const card = pending.pendingEvents[0], head = `${card.emoji} ${card.title}: `;
  const line = after.events.slice(pending.events.length).find(l => l.startsWith(head));
  return { boost: after.statBoostNextSeason, toast: line ? line.slice(head.length) : card.choices[i].consequence };
};
/** The card dealt with room, then a training session banked before the answer: momentsRoom 0 at the answer. */
const ceilingOf = pending => {
  const s = copy(pending);
  const room = O.momentsRoom(s);
  const touched = new Set(Object.keys(oracle(pending).boost));
  const spare = ['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical', 'reflexes'].find(k => !touched.has(k));
  s.statBoostNextSeason = { ...s.statBoostNextSeason, [spare]: (s.statBoostNextSeason[spare] ?? 0) + room };
  s.trainingSeasonYear = s.seasons.at(-1).year;
  return s;
};

const { chromium } = pw;
const browser = await chromium.launch({ headless: true });
/* The throttled phone. Chromium's own network emulation does not apply to intercepted requests, and every request is
   intercepted here (the walk's routes and scripts/lib/offlineTransport.cjs): two runs read 12 to 32 ms a chunk at
   "1.6 Mbps". So the walk throttles each script itself: the response is held 150 ms of latency plus its own bytes at
   1.6 Mbps, as on a slow phone line with no other request sharing it (an optimistic model, said so in the reading). */
const LATENCY_MS = 150, BITS_PER_S = 1.6e6;
const SLOW_SCRIPT = /\/assets\/[\w-]+\.js$/;
const PROFILES = [{ w: 390, h: 844, mobile: true }, { w: 1280, h: 900, mobile: false }];
const toasts = page => page.locator('[data-sonner-toast]').allInnerTexts().then(t => t.map(x => x.replace(/\s+/g, ' ').trim()));
const waitToast = async (page, test, ms) => {
  const end = Date.now() + ms;
  while (Date.now() < end) { const t = await toasts(page); const hit = t.find(test); if (hit) return hit; await page.waitForTimeout(100); }
  return null;
};
const savedOf = page => page.evaluate(k => JSON.parse(localStorage.getItem(k) || 'null'), KEY);

async function open(profile, save, { deck = 'allow', staleUsed = false, throttle = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: profile.w, height: profile.h }, isMobile: profile.mobile, hasTouch: profile.mobile,
    serviceWorkers: 'block', reducedMotion: 'reduce',
    storageState: { cookies: [], origins: [{ origin: BASE, localStorage: [{ name: KEY, value: O.save.serializeSoccerCareerSave(save) }, { name: 'cookie-consent', value: 'essential' }] }] } });
  await ctx.route(/supabase\.co/, r => r.abort());
  await ctx.route(url => !String(url).startsWith(BASE), r => r.abort());
  const hold = ms => new Promise(res => setTimeout(res, ms));
  if (throttle) await ctx.route(SLOW_SCRIPT, async r => {
    try {
      await hold(LATENCY_MS);
      const res = await r.fetch();
      const body = await res.body();
      await hold(Math.round(body.length * 8 / BITS_PER_S * 1000));
      await r.fulfill({ response: res, body });
    } catch { /* the context closed with this response still held */ }
  });
  if (deck === 'abort') await ctx.route(DECK_CHUNK, r => r.abort());
  if (typeof deck === 'number') await ctx.route(DECK_CHUNK, async r => { await hold(deck); await r.continue().catch(() => undefined); });
  if (staleUsed) await ctx.addInitScript(() => { try { sessionStorage.setItem('dukb-reloaded-stale-chunk', '1'); } catch { /* the walk's own key */ } });
  const page = await ctx.newPage();
  const errors = [];
  let loads = 0;
  page.on('pageerror', e => errors.push(String(e)));
  page.on('load', () => { loads += 1; });
  const deckResponse = deck === 'abort' ? null : page.waitForResponse(r => DECK_CHUNK.test(r.url()), { timeout: 90000 }).catch(() => null);
  await page.goto(`${BASE}/soccer-career`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  return { ctx, page, errors, loads: () => loads, deckResponse };
}
const cardTitle = (page, title) => page.locator('h3', { hasText: title }).first();
const optionOf = (page, label) => page.getByRole('button', { name: new RegExp(`^\\S*\\s*${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`) }).first();
const shot = (page, name) => page.screenshot({ path: path.join(OUT, `${name}.png`) }).catch(() => undefined);

try {
  for (const profile of PROFILES) {
    for (const [code, f] of Object.entries(FIX)) {
      const id = `${profile.w}-${code}`;
      const want = oracle(f.pending);
      /* deal: Continue on the summary deals the deck card first, once the chunk has landed */
      {
        const throttle = profile.mobile && code === 'ST';
        const { ctx, page, errors, deckResponse } = await open(profile, f.summary, { throttle });
        const t0 = await page.evaluate(() => performance.now());
        const res = await deckResponse;
        check(!!res && res.ok(), `${id} deal: the deck chunk was fetched with the career on screen (${res ? res.url().split('/').pop() : 'never'})`);
        if (throttle && res) {
          await page.waitForTimeout(500);
          /* the deck chunk and the chunks it imports that this page had not fetched before the career was on screen */
          const deckFile = res.url().split('/').pop();
          const deps = [...new Set([...(await res.text()).matchAll(/from\s*"\.\/([^"]+\.js)"|import\s*"\.\/([^"]+\.js)"/g)].map(m => m[1] || m[2]))];
          const rows = await page.evaluate(t => performance.getEntriesByType('resource').filter(e => e.name.endsWith('.js'))
            .map(e => ({ file: e.name.split('/').pop(), start: Math.round(e.startTime), end: Math.round(e.responseEnd), before: e.startTime < t })), t0);
          const mine = rows.filter(r => (r.file === deckFile || deps.includes(r.file)) && !r.before);
          const from = Math.min(...mine.map(r => r.start)), to = Math.max(...mine.map(r => r.end));
          report.timing = { profile: '390, 150 ms latency, 1.6 Mbps down', deckFile, deps, fetched: mine, ms: to - from };
          console.log(`   timing at 390, throttled: the deck's first load fetched ${mine.map(r => `${r.file} (${r.end - r.start} ms)`).join(', ')}; ${to - from} ms from its first request to its last byte; already in memory: ${deps.filter(d => !mine.some(r => r.file === d)).join(', ') || 'none'}`);
        }
        await page.waitForTimeout(400);
        await page.getByRole('button', { name: /Post about personal life/ }).first().click();
        await page.getByRole('button', { name: /^Continue/ }).first().click();
        await cardTitle(page, f.card.title).waitFor({ timeout: 10000 }).catch(() => undefined);
        check(await cardTitle(page, f.card.title).isVisible(), `${id} deal: the first card is the deck card node dealt, "${f.card.title}"`);
        const btn = await optionOf(page, f.card.labels[0]).innerText().catch(() => '');
        check(btn.replace(/\s+/g, ' ').includes(f.card.consequence), `${id} deal: its training button prints the gain and the time cost ("${f.card.consequence}")`);
        await shot(page, `${id}-deal`);
        check(errors.length === 0, `${id} deal: no page error${errors.length ? ` (${errors[0]})` : ''}`);
        await ctx.close();
      }
      /* fasttap: Continue pressed while the chunk is still held: that summer simply has no deck card (critic 16(b): a
         deal never waits, and the race can only leave the card out, never deal a different one) */
      {
        const { ctx, page, errors } = await open(profile, f.summary, { deck: 4000 });
        const post = page.getByRole('button', { name: /Post about personal life/ }).first();
        await post.waitFor({ timeout: 60000 });
        await post.click();
        await page.getByRole('button', { name: /^Continue/ }).first().click();
        await page.waitForTimeout(800);
        const saved = await savedOf(page);
        const first = saved?.phase === 'random_events' ? saved.pendingEvents?.[0] : null;
        check(saved?.phase !== 'social_media_action' && !(first && first.id >= 700 && first.id <= 999), `${id} fasttap: the deal went on without the deck card (phase ${saved?.phase}, first card ${first?.id ?? 'none'})`);
        check(errors.length === 0, `${id} fasttap: no page error${errors.length ? ` (${errors[0]})` : ''}`);
        await ctx.close();
      }
      /* answer: the training option lands the gain and the cost, the toast says what landed */
      {
        const { ctx, page, errors, deckResponse } = await open(profile, f.pending);
        await deckResponse;
        await cardTitle(page, f.card.title).waitFor({ timeout: 60000 });
        await page.waitForTimeout(300);
        await optionOf(page, f.card.labels[0]).click();
        const t = await waitToast(page, x => x.includes(want.toast), 5000);
        check(!!t, `${id} answer: the toast prints what landed, "${want.toast}"`);
        const saved = await savedOf(page);
        check(JSON.stringify(saved?.statBoostNextSeason) === JSON.stringify(want.boost), `${id} answer: the save queued what node queued (${JSON.stringify(want.boost)})`);
        check(saved?.pendingEvents?.[0]?.id !== f.card.id, `${id} answer: the deck card left the batch`);
        await shot(page, `${id}-answer`);
        check(errors.length === 0, `${id} answer: no page error${errors.length ? ` (${errors[0]})` : ''}`);
        await ctx.close();
      }
      /* delayed: the press waits for the held chunk, a second press does nothing, the answer lands once */
      {
        const { ctx, page, errors } = await open(profile, f.pending, { deck: 4000 });
        await cardTitle(page, f.card.title).waitFor({ timeout: 60000 });
        await optionOf(page, f.card.labels[0]).click();
        const busy = await waitToast(page, x => x.includes('Loading this card'), 1500);
        check(!!busy, `${id} delayed: the press says it is working while the chunk is held`);
        await optionOf(page, f.card.labels[0]).click().catch(() => undefined);
        const t = await waitToast(page, x => x.includes(want.toast), 12000);
        check(!!t, `${id} delayed: the answer lands once the chunk does, and the toast says what landed`);
        const saved = await savedOf(page);
        const head = `${f.pending.pendingEvents[0].emoji} ${f.card.title}: `;
        check((saved?.events ?? []).filter(l => l.startsWith(head)).length === 1, `${id} delayed: the second press did nothing (one season log line)`);
        check(JSON.stringify(saved?.statBoostNextSeason) === JSON.stringify(want.boost), `${id} delayed: the save queued what node queued`);
        check(errors.length === 0, `${id} delayed: no page error${errors.length ? ` (${errors[0]})` : ''}`);
        await ctx.close();
      }
      /* late: the chunk held past DECK_WAIT_MS: the press says so and the card stays; once it lands, a press answers */
      {
        const { ctx, page, errors, deckResponse } = await open(profile, f.pending, { deck: WAIT_MS + 2500 });
        await cardTitle(page, f.card.title).waitFor({ timeout: 60000 });
        await optionOf(page, f.card.labels[0]).click();
        const late = await waitToast(page, x => x.includes('Still loading'), WAIT_MS + 2000);
        check(!!late, `${id} late: past ${WAIT_MS} ms the press says the card is still loading`);
        check(await cardTitle(page, f.card.title).isVisible(), `${id} late: the card stays`);
        await deckResponse;
        await page.waitForTimeout(600);
        await optionOf(page, f.card.labels[0]).click();
        check(!!(await waitToast(page, x => x.includes(want.toast), 5000)), `${id} late: once the chunk lands the next press answers it`);
        const saved = await savedOf(page);
        check(JSON.stringify(saved?.statBoostNextSeason) === JSON.stringify(want.boost), `${id} late: the save queued what node queued`);
        check(errors.length === 0, `${id} late: no page error${errors.length ? ` (${errors[0]})` : ''}`);
        await ctx.close();
      }
      /* noreload: the one stale chunk reload is used, the chunk fails: the card stays and says so */
      {
        const { ctx, page, errors, loads } = await open(profile, f.pending, { deck: 'abort', staleUsed: true });
        await cardTitle(page, f.card.title).waitFor({ timeout: 60000 });
        await page.waitForTimeout(500);
        await optionOf(page, f.card.labels[0]).click();
        const t = await waitToast(page, x => x.includes('This card could not load'), 12000);
        check(!!t, `${id} noreload: the press says the card could not load`);
        check(await cardTitle(page, f.card.title).isVisible(), `${id} noreload: the card stays on screen`);
        const saved = await savedOf(page);
        check(saved?.pendingEvents?.[0]?.id === f.card.id && JSON.stringify(saved?.statBoostNextSeason) === JSON.stringify(f.pending.statBoostNextSeason), `${id} noreload: the save still holds the card and nothing landed`);
        check(loads() === 1, `${id} noreload: no reload happened (${loads()} loads)`);
        await shot(page, `${id}-noreload`);
        const unexpected = errors.filter(e => !/soccerDeck|dynamically imported module|Failed to fetch/i.test(e));
        check(unexpected.length === 0, `${id} noreload: no page error but the failed chunk${unexpected.length ? ` (${unexpected[0]})` : ''}`);
        await ctx.close();
      }
      /* reload: a fresh tab whose deck chunk fails reloads once and comes back on its card with its save */
      {
        const { ctx, page, loads } = await open(profile, f.pending, { deck: 'abort' });
        const end = Date.now() + 20000;
        while (Date.now() < end && loads() < 2) await page.waitForTimeout(200);
        await cardTitle(page, f.card.title).waitFor({ timeout: 60000 }).catch(() => undefined);
        await page.waitForTimeout(2000);
        check(loads() === 2, `${id} reload: freshBuild reloaded the tab once (${loads()} loads)`);
        check(await cardTitle(page, f.card.title).isVisible(), `${id} reload: the career came back on its card`);
        const saved = await savedOf(page);
        check(saved?.phase === 'random_events' && saved?.pendingEvents?.[0]?.id === f.card.id, `${id} reload: the save is on its phase with its card`);
        await ctx.close();
      }
      /* ceiling: a session banked between the deal and the answer; the ground opens with the card on screen */
      {
        const s = ceilingOf(f.pending);
        const ceil = oracle(s);
        const { ctx, page, errors, deckResponse } = await open(profile, s);
        await deckResponse;
        await cardTitle(page, f.card.title).waitFor({ timeout: 60000 });
        await page.locator('[data-career-utility="training"]').first().click();
        const ground = page.getByRole('dialog', { name: 'Training ground' });
        check(await ground.waitFor({ timeout: 15000 }).then(() => true, () => false), `${id} ceiling: the training ground opens with the deck card on screen`);
        await page.keyboard.press('Escape');
        await ground.waitFor({ state: 'detached', timeout: 10000 }).catch(() => undefined);
        await optionOf(page, f.card.labels[0]).click();
        const t = await waitToast(page, x => x.includes(ceil.toast), 5000);
        check(!!t && ceil.toast.includes('you are at your ceiling') && ceil.toast.includes('you only pay for training that landed'), `${id} ceiling: the toast says nothing landed and nothing was paid ("${ceil.toast}")`);
        const saved = await savedOf(page);
        check(JSON.stringify(saved?.statBoostNextSeason) === JSON.stringify(s.statBoostNextSeason), `${id} ceiling: nothing queued past the ceiling`);
        check(errors.length === 0, `${id} ceiling: no page error${errors.length ? ` (${errors[0]})` : ''}`);
        await ctx.close();
      }
    }
    /* help: the How to play sheet carries the summer cards line */
    {
      const { ctx, page } = await open(profile, FIX.ST.pending);
      await page.getByRole('button', { name: 'How to play', exact: true }).first().click();
      check(await page.getByText('Summer cards:', { exact: false }).first().waitFor({ timeout: 10000 }).then(() => true, () => false), `${profile.w} help: How to play carries the summer cards line`);
      await shot(page, `${profile.w}-help`);
      await ctx.close();
    }
  }
} finally {
  await browser.close();
  fs.writeFileSync(path.join(OUT, 'walk.json'), JSON.stringify({ ...report, failures }, null, 2));
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* best effort */ }
}
if (failures) { console.error(`playSoccerDeck: ${failures} failure${failures === 1 ? '' : 's'}`); process.exit(1); }
console.log('playSoccerDeck: green, every case at 390 and 1280.');
