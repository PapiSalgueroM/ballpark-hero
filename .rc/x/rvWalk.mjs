// Reviewer walk (rBVG-cm-bv), Release BV on the served dist (BASE from #!serve), supabase.co and every other host
// aborted. Saves are made by the head engine (scripts/lib/worldUclFleet.mjs) and planted in localStorage.
//  (u) Everton season two in the Europa League by its cup (playCmEuroPlay's crafted streams), played by the engine
//      to its first knockout SECOND leg; the first leg is planted 1-0 to Everton (fictional), so a one goal defeat
//      on the night levels the tie. Quick Sim on seeded pages until the card reads THROUGH (PENS) with "Lost x-y on
//      the night": at 390x844, 1280x900 and 390 with reduced motion. Checks: headline, tone, night line, pens
//      line, the card's motion (cmWinPulse, none under reduced motion), no sideways scroll, card inside the view.
//  (m) a new 2026-27 Everton career: the Market searched for Messi, Ronaldo and Modric at 390 and 1280; the rows'
//      ratings read against What's New (86, 86, 80).
// Screenshots to $RC_OUT/rv-*.png. Exit 0 green, 1 a finding, 2 could not run.
import fs from 'node:fs';
import path from 'node:path';
import { engineOf, tape } from '../../scripts/lib/worldUclFleet.mjs';
import { chromium } from '../../scripts/lib/playwrightLoader.mjs';
import { answerConsent } from '../../scripts/lib/answerConsent.mjs';

const ROOT = process.cwd();
const OUT = process.env.RC_OUT || path.join(ROOT, '.tmp-fx', 'rv');
fs.mkdirSync(OUT, { recursive: true });
const URL0 = process.env.BASE || process.env.SWEEP_BASE || 'http://localhost:4173';
const ATTEMPTS = Number(process.env.RV_ATTEMPTS || 45);
const cannot = why => { console.log(`rvWalk could not run: ${why}`); process.exit(2); };
let bad = 0;
const check = (c, msg) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${msg}`); if (!c) bad += 1; };
const EXPORT = { file: 'src/lib/clubManager.ts', from: 'function uelLegTonight(state: CareerState, entry: CalendarEntry): 0 | 1 | 2 {',
  to: 'export function uelLegTonight(state: CareerState, entry: CalendarEntry): 0 | 1 | 2 {' };
const E = await engineOf(ROOT, 'rv', { edits: [EXPORT] }, cannot);
const opts = { skipHalftime: true, noCoach: true };
const saved = (M, s) => { M.store.clear(); if (!M.cm.saveCareer(s)) cannot('the engine refused to save'); return [...M.store.entries()]; };

/* ---------- (u) the Europa League second leg ---------- */
const M = await E.fresh();
let s = tape(0x1509a, () => M.cm.startCareer('Everton')).value;
for (let i = 0; i < 400 && s.week < s.calendar.length; i += 1) s = tape(0x1509a + 1 + i, () => M.cm.playNextEntry(s, opts)).value.state;
const fin = tape(0x1509b, () => M.cm.finishSeason(s)).value.state;
const final = (fin.cupBracket ?? []).find(t => t.round === 'F');
if (!final) cannot('no cup final to hand to Everton');
final.winner = 'Everton';
const two = tape(0x1509c, () => M.cm.startNextSeason(fin)).value;
if (!M.cm.uelParticipant(two)) cannot('the crafted Everton season two does not play the Europa League');
let pre = null; let tries = [];
for (let k = 0; k < 10 && !pre; k += 1) {
  let p = JSON.parse(JSON.stringify(two));
  let why = 'season over';
  for (let i = 0; i < 260; i += 1) {
    const at = p.calendar.findIndex((e, w) => w >= p.week && M.cm.fixtureFor(p, e));
    const e = p.calendar[at];
    if (at >= 0 && e?.type === 'uel' && M.cm.uelLegTonight(p, e) === 2 && M.cm.nextFixture(p)?.competition === 'uel') { pre = { p, at, e }; why = `found at week ${at}`; break; }
    const r = tape(0x7a00 + k * 1000 + i, () => M.cm.playNextEntry(p, opts)).value;
    p = r.state;
    if (r.kind === 'seasonOver' || p.sacked) { why = r.kind === 'seasonOver' ? 'season over' : 'sacked'; break; }
  }
  tries.push(`stream ${k}: ${why}`);
}
console.log(`(u) looking for a Europa League second leg: ${tries.join('; ')}`);
if (!pre) cannot('Everton never reached a Europa League second leg in ten streams');
const fx = M.cm.fixtureFor(pre.p, pre.e);
const n = pre.e.night.n;
const slice = pre.p.worldComps.uel;
if (!slice.mine?.[n - 1]) cannot(`no first leg recorded at night ${n - 1}`);
const was = slice.mine[n - 1];
const planted = JSON.parse(JSON.stringify(pre.p));
const nf = M.cm.nextFixture(planted);
check(nf?.competition === 'uel', `(u) the hub's next match is the second leg (${nf?.competition ?? 'none'} ${nf?.opponent ?? ''})`);
planted.worldComps.uel = { ...slice, mine: { ...slice.mine, [n - 1]: fx.home ? { h: 0, a: 1 } : { h: 1, a: 0 } } };
console.log(`(u) ${fx.compLabel} ${fx.home ? 'v' : 'at'} ${fx.opponent}, night ${n}, first leg was ${JSON.stringify(was)}, planted 1-0 to Everton`);
/* the plant read back by the engine, and how often the case comes up on its own dice (information) */
let cases = 0; let legOk = 0;
for (let k = 0; k < 60; k += 1) {
  const r = tape(0x9900 + k, () => M.cm.playNextEntry(JSON.parse(JSON.stringify(planted)), opts)).value;
  const t = r.report?.tie;
  if (t?.leg1Mine === 1 && t?.leg1Theirs === 0) legOk += 1;
  if (t?.leg === 2 && t.through === true && r.report.decidedBy === 'pens' && r.report.homeGoals !== r.report.awayGoals) cases += 1;
}
check(legOk === 60, `(u) the engine reads the planted first leg as 1-0 on ${legOk} of 60 replays`);
console.log(`(u) lost on the night and through on penalties in ${cases} of 60 engine replays`);
const uSave = saved(M, planted);
const mSave = saved(M, tape(0x1601, () => M.cm.startCareer('Everton')).value);

/* ---------- the page ---------- */
const browser = await chromium.launch({ headless: true });
async function open(profile, items, seed) {
  const context = await browser.newContext({ viewport: { width: profile.width, height: profile.height }, isMobile: !!profile.touch, hasTouch: !!profile.touch,
    serviceWorkers: 'block', reducedMotion: profile.reduced ? 'reduce' : 'no-preference',
    storageState: { cookies: [], origins: [{ origin: new URL(URL0).origin, localStorage: [...items.map(([name, value]) => ({ name, value })), { name: 'cookie-consent', value: 'essential' }] }] } });
  const origin = new URL(URL0).origin;
  await context.route('**/*', route => (new URL(route.request().url()).origin === origin ? route.continue() : route.abort()));
  await context.routeWebSocket('**/*', socket => socket.close());
  if (seed !== undefined) await context.addInitScript(sd => {
    let a = sd >>> 0;
    Math.random = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }, seed);
  const page = await context.newPage();
  await page.route(/supabase\.co/, r => r.abort());
  page.setDefaultTimeout(15000);
  page.errs = [];
  page.on('pageerror', e => page.errs.push(String(e?.message ?? e)));
  await page.goto(`${URL0}/club-manager`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await answerConsent(page, { wait: 600 }).catch(() => {});
  return { context, page };
}
async function resumeTo(page, locator) {
  for (let i = 0; i < 14 && !(await locator.count().catch(() => 0)); i += 1) {
    const resume = page.getByRole('button', { name: /Resume Career|Continue career|Resume/i }).first();
    if (await resume.count().catch(() => 0)) await resume.click({ timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(700);
  }
  return (await locator.count().catch(() => 0)) > 0;
}
const shot = (page, name) => page.screenshot({ path: path.join(OUT, `rv-${name}.png`), fullPage: false }).catch(() => {});
const PROFILES = [{ width: 390, height: 844, touch: true, tag: '390' }, { width: 1280, height: 900, tag: '1280' }, { width: 390, height: 844, touch: true, reduced: true, tag: '390-rm' }];
let goodSeed = null;
for (const pr of PROFILES) {
  let found = null; let tried = 0; const seen = {};
  const order = goodSeed ? [goodSeed, ...Array.from({ length: ATTEMPTS }, (_, i) => i + 1).filter(x => x !== goodSeed)] : Array.from({ length: ATTEMPTS }, (_, i) => i + 1);
  for (const sd of order) {
    if (tried >= ATTEMPTS) break;
    tried += 1;
    const { context, page } = await open(pr, uSave, 1593000 + sd * 101);
    const quick = page.locator('[data-cm-way="quick"]').first();
    if (!(await resumeTo(page, quick))) { await shot(page, `u-noquick-${pr.tag}`); check(false, `(u) ${pr.tag}: the hub offers Quick Sim`); await context.close(); break; }
    if (tried === 1) { const hub = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ')); check(/Europa League/.test(hub) && /second leg/i.test(hub), `(u) ${pr.tag}: the hub names the Europa League second leg`); await shot(page, `u-hub-${pr.tag}`); }
    await quick.click();
    const h2 = page.locator('h2', { hasText: /^(THROUGH|OUT|VICTORY|DEFEAT|DRAW)/ }).first();
    await h2.waitFor({ state: 'attached', timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(1300);
    const got = await page.evaluate(() => {
      const h = [...document.querySelectorAll('h2')].find(x => /^(THROUGH|OUT|VICTORY|DEFEAT|DRAW)/.test(x.textContent ?? ''));
      const card = h?.parentElement;
      const box = el => { if (!el) return null; const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height, right: b.right, bottom: b.bottom }; };
      const night = document.querySelector('[data-cm-night-line]');
      const moving = document.querySelector('.cm-win-pulse, .cm-loss-shake');
      const lines = card ? [...card.querySelectorAll('div')].map(d => (d.textContent ?? '').trim()).filter(t => /penalt|aggregate|shootout/i.test(t) && t.length < 140) : [];
      return { head: h?.textContent ?? null, tone: h?.className ?? '', night: night?.textContent ?? null, label: card?.querySelector('div')?.textContent ?? null,
        motion: moving ? { cls: moving.className.includes('cm-win-pulse') ? 'pulse' : 'shake', anim: getComputedStyle(moving).animationName } : null,
        card: box(card), nightBox: box(night), lines: [...new Set(lines)].slice(0, 4), wide: document.documentElement.scrollWidth > window.innerWidth };
    });
    const key = `${got.head} | ${got.night}`; seen[key] = (seen[key] ?? 0) + 1;
    if (got.head?.startsWith('THROUGH (PENS)') && /^Lost \d+-\d+ on the night$/.test(got.night ?? '')) { found = { ...got, sd, page, context }; break; }
    await context.close();
  }
  console.log(`(u) ${pr.tag}: ${tried} seeds tried; cards seen ${JSON.stringify(seen)}`);
  if (!found) { check(false, `(u) ${pr.tag}: a THROUGH (PENS) card after a lost second leg within ${ATTEMPTS} seeds`); continue; }
  goodSeed = found.sd;
  const { page, context } = found;
  await shot(page, `u-card-${pr.tag}`);
  await page.locator('h2', { hasText: /^THROUGH/ }).first().evaluate(el => el.parentElement.scrollIntoView({ block: 'start' })).catch(() => {});
  await page.waitForTimeout(300);
  await shot(page, `u-card-top-${pr.tag}`);
  console.log(`(u) ${pr.tag}: seed ${found.sd}: "${found.head}", "${found.night}", label "${found.label}", lines ${JSON.stringify(found.lines)}, motion ${JSON.stringify(found.motion)}`);
  check(found.tone.includes('text-correct'), `(u) ${pr.tag}: THROUGH in the winning tone`);
  check(/Europa League/.test(found.label ?? ''), `(u) ${pr.tag}: the card is labelled a Europa League night (${found.label})`);
  check(found.lines.some(t => /penalt/i.test(t)), `(u) ${pr.tag}: a penalties line on the card`);
  check(!found.wide, `(u) ${pr.tag}: no sideways scroll`);
  check(found.card && found.card.x >= 0 && found.card.right <= pr.width + 1, `(u) ${pr.tag}: the card sits inside the view ${JSON.stringify(found.card)}`);
  check(found.nightBox && found.card && found.nightBox.x >= found.card.x - 1 && found.nightBox.right <= found.card.right + 1, `(u) ${pr.tag}: the night line inside the card`);
  check(pr.reduced ? found.motion?.cls === 'pulse' && found.motion.anim === 'none' : found.motion?.cls === 'pulse' && found.motion.anim === 'cmWinPulse',
    `(u) ${pr.tag}: ${pr.reduced ? 'still under reduced motion' : 'the card pulses'} (${JSON.stringify(found.motion)})`);
  check(page.errs.length === 0, `(u) ${pr.tag}: no page error ${page.errs.slice(0, 2).join(' | ')}`);
  await context.close();
}

/* ---------- (m) the market's veterans ---------- */
const VETS = [['Messi', 'Lionel Messi', 86], ['Ronaldo', 'Cristiano Ronaldo', 86], ['Modri', 'Luka Modri', 80]];
for (const pr of PROFILES.slice(0, 2)) {
  const { context, page } = await open(pr, mSave);
  const tab = page.getByRole('tab', { name: /^Market$/ }).first();
  if (!(await resumeTo(page, tab))) { await shot(page, `m-notab-${pr.tag}`); check(false, `(m) ${pr.tag}: the Market tab`); await context.close(); continue; }
  await tab.click();
  const box = page.getByPlaceholder('Search player or club…').first();
  await box.waitFor({ timeout: 20000 }).catch(() => {});
  if (!(await box.count().catch(() => 0))) { await shot(page, `m-nobox-${pr.tag}`); check(false, `(m) ${pr.tag}: the market search box`); await context.close(); continue; }
  for (const [q, full, want] of VETS) {
    await box.fill(q);
    await page.waitForTimeout(600);
    const row = await page.evaluate(nm => {
      for (const b of document.querySelectorAll('button')) {
        if (!/^(Talk ·|Cold)/.test((b.textContent || '').trim())) continue;
        const r = b.closest('div')?.parentElement;
        const text = ((r && r.innerText) || '').replace(/\s+/g, ' ');
        if (text.includes(nm)) { const bx = r.getBoundingClientRect(); return { text, right: bx.right, w: bx.width }; }
      }
      return null;
    }, full);
    await shot(page, `m-${q.toLowerCase()}-${pr.tag}`);
    const nums = row ? [...row.text.matchAll(/\b(\d{2})\b/g)].map(m => Number(m[1])) : [];
    console.log(`(m) ${pr.tag} ${q}: ${row ? row.text.slice(0, 160) : 'no row'}`);
    check(!!row && nums.includes(want), `(m) ${pr.tag}: ${full} on the market at ${want} (row numbers ${nums.join(',') || 'none'})`);
    check(!row || row.right <= pr.width + 1, `(m) ${pr.tag}: ${q}'s row inside the view`);
  }
  check(page.errs.length === 0, `(m) ${pr.tag}: no page error ${page.errs.slice(0, 2).join(' | ')}`);
  await context.close();
}
await browser.close();
console.log(`rvWalk ${bad ? 'RED' : 'GREEN'}: ${bad} findings`);
process.exit(bad ? 1 : 0);
