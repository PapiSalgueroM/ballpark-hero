/* Reviewer walk rBUG-cm-sc (Release BU, area cm-sc). Never committed; run on a runner from the repo root against
   the served build (#!serve #!playwright): node .rc/x/walkcmsc.mjs
   THE COOKIE BANNER IS NEVER ANSWERED. supabase.co and ad hosts aborted. Sizes 390x844 and 1280x900, reduced motion
   on and off (pictures only with it on). Sections:
     A  a fresh visit: 2026-27, England, Premier League, Everton, Take the job, Skip: just manage; the hub; the next
        fixture's dugout line; a rival club page from the Table (its real manager line); a player card from the Squad.
     B  a planted Everton career four league weeks from the end of season 1: a player card from the league leaders,
        then the rest of the season, the review's contracts checkpoint answered, Continue to Season 2.
     C  Hot Seat: a kept job carried into the free slot 2 (slot 1 holds a career).
     D  Soccer Career: create a player, roll, read the academy shown, Begin Career, the save starts there.
   Every key button is scrolled to the middle and must sit wholly above a pending banner with its centre hit. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = process.cwd();
const imp = rel => import(pathToFileURL(path.join(ROOT, rel)).href);
const pw = (await imp('scripts/lib/playwrightLoader.mjs')).default;
const BASE = process.env.SWEEP_BASE || process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || path.join(ROOT, '.tmp-fx', 'walkcmsc');
fs.mkdirSync(OUT, { recursive: true });
const KEY = 'dukb-club-manager-save';
const FREE = 'manager-hot-seat-free';
const CONSENT = '[role="region"][aria-label="Cookie choices"], [role="dialog"][aria-label="Cookie choices"]';
const ONLY = (process.env.WALK_ONLY || 'ABCD').split('');
let fails = 0;
const fail = m => { fails += 1; console.log(`  FAIL: ${m}`); };
const ok = m => console.log(`  ok    ${m}`);
const info = m => console.log(`  info  ${m}`);

/* ---------- fixtures, built by the head's own engine ---------- */
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'walkcmsc-'));
const stub = new Map();
globalThis.localStorage = { getItem: k => stub.get(k) ?? null, setItem: (k, v) => { stub.set(k, String(v)); }, removeItem: k => { stub.delete(k); }, clear: () => stub.clear() };
const P = rel => JSON.stringify(path.join(ROOT, rel).split(path.sep).join('/'));
fs.writeFileSync(path.join(TMP, 'entry.mjs'), `export * as cm from ${P('src/lib/clubManager.ts')};\nexport * as eras from ${P('src/lib/clubManagerEras.ts')};\nexport * as hs from ${P('src/lib/managerHotSeat.ts')};\n`);
await build({
  entryPoints: [path.join(TMP, 'entry.mjs')], outfile: path.join(TMP, 'bundle.mjs'), bundle: true, format: 'esm', platform: 'node',
  logLevel: 'error', absWorkingDir: ROOT, alias: { '@': path.join(ROOT, 'src') },
  loader: { '.css': 'empty', '.png': 'empty', '.svg': 'empty', '.jpg': 'empty', '.webp': 'empty' },
});
const { cm, eras, hs } = await import(pathToFileURL(path.join(TMP, 'bundle.mjs')).href);
await eras.ensureAllEraRosters?.();
const realRand = Math.random;
let seed = 0x1597f; Math.random = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
let s = cm.startCareer('Everton', 'now');
const left = st => (st.calendar ?? []).slice(Math.max(0, st.week)).filter(e => e.type === 'league').length;
for (let i = 0; i < 400 && left(s) > 4; i += 1) {
  if (s.boardConfidence < 35) s = { ...s, boardConfidence: 55 };
  const r = cm.playNextEntry(s, { skipHalftime: true, noCoach: true }); s = r.state;
  if (r.kind === 'seasonOver' || s.sacked) break;
}
stub.clear(); cm.saveCareer(s); const NEAR = stub.get(KEY);
info(`fixture NEAR: Everton season ${s.season} week ${s.week}, league weeks left ${left(s)}, expiring ${cm.expiringPlayers(s).length}, managers ${Object.values(s.managers ?? {}).filter(m => m.real === 1).length} real`);
for (let i = 0; i < 400; i += 1) {
  if (s.boardConfidence < 35) s = { ...s, boardConfidence: 55 };
  const r = cm.playNextEntry(s, { skipHalftime: true, noCoach: true }); s = r.state;
  if (r.kind === 'seasonOver' || s.sacked) break;
}
s = cm.finishSeason(s).state;
stub.clear(); cm.saveCareer(s); const END = stub.get(KEY);
info(`fixture END: review pending ${!!s.pendingSummary}, expiring ${cm.expiringPlayers(s).length}`);
let HOT = null;
const pool = hs.hotSeatPool();
for (let k = 0; k < 60 && !HOT; k++) {
  const setup = { club: pool[(k * 11 + 3) % pool.length].club, seed: (2000 + k) >>> 0 };
  let r = hs.startHotSeat(setup);
  for (let g = 0; !r.verdict && g < 40; g++) r = hs.pendingPress(r) ? hs.answerHotSeatPress(r, 0) : hs.playHotSeatMatch(r, 'balanced', null);
  if (hs.canCarryOn(r)) HOT = { v: 1, club: setup.club, seed: setup.seed, actions: r.actions, done: true, kind: r.verdict.kind };
}
const slotClub = ['Aston Villa', 'Fulham', 'Brighton'].find(c => c !== HOT?.club);
stub.clear(); cm.saveCareer(cm.startCareer(slotClub, 'now')); const SLOT1 = stub.get(KEY);
Math.random = realRand;
fs.rmSync(TMP, { recursive: true, force: true });
if (!NEAR || !END || !HOT || !SLOT1) { console.log('walkcmsc: ABORT, no fixtures'); process.exit(2); }
info(`fixture HOT: ${HOT.club} (${HOT.kind}); slot 1 holds ${slotClub}`);
const clubOf = v => { try { return JSON.parse(v).clubName; } catch { return null; } };

/* ---------- the browser ---------- */
const browser = await pw.chromium.launch();
const BLOCK = /supabase\.co|googlesyndication|doubleclick|google-analytics|googletagmanager|adservice|fundingchoices/;
let errors = [];
async function newPage(w, h, motion) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: w < 768, hasTouch: w < 768, reducedMotion: motion });
  await ctx.route(BLOCK, r => r.abort());
  const p = await ctx.newPage();
  p.setDefaultTimeout(20000);
  p.on('pageerror', e => errors.push(String(e?.message ?? e).slice(0, 200)));
  return p;
}
async function plant(p, kv) {
  await p.goto(BASE + '/robots.txt', { waitUntil: 'domcontentloaded' });
  await p.evaluate(entries => { localStorage.clear(); for (const [k, v] of Object.entries(entries)) localStorage.setItem(k, v); }, kv);
}
let SHOTS = true;
const shot = async (p, name, full = false) => { if (SHOTS) await p.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: full }).catch(() => {}); };
const vis = async loc => (await loc.count().catch(() => 0)) > 0 && await loc.first().isVisible().catch(() => false);
const sideways = p => p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
const bannerUp = p => vis(p.locator(CONSENT));
/* Scroll a button to the middle; it must sit wholly on screen, wholly above a pending banner, its centre hit. */
async function reach(p, loc, tag, label) {
  const el = loc.first();
  if (!(await el.count().catch(() => 0))) { fail(`${tag}: ${label} is not on the page`); return null; }
  await el.evaluate(e => e.scrollIntoView({ block: 'center' })).catch(() => {});
  await p.waitForTimeout(400);
  const m = await el.evaluate((e, sel) => {
    const r = e.getBoundingClientRect();
    const b = document.querySelector(sel);
    const br = b && b.getClientRects().length ? b.getBoundingClientRect() : null;
    const hitEl = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right), w: Math.round(r.width), h: Math.round(r.height),
      bannerTop: br ? Math.round(br.top) : null, hit: !!hitEl && (hitEl === e || e.contains(hitEl)), hitWhat: hitEl ? (hitEl.getAttribute('aria-label') || hitEl.tagName + '.' + String(hitEl.className).slice(0, 40)) : 'nothing', vh: innerHeight, vw: innerWidth };
  }, CONSENT);
  const under = m.bannerTop !== null && m.bottom > m.bannerTop;
  const off = m.top < 0 || m.bottom > m.vh || m.left < 0 || m.right > m.vw + 1;
  const words = `${label} ${m.w}x${m.h} at ${m.top} to ${m.bottom}, banner top ${m.bannerTop ?? 'none'}, hit ${m.hit ? 'itself' : m.hitWhat}`;
  if (!m.hit || under || off) fail(`${tag}: ${words}${under ? ' (UNDER THE BANNER)' : ''}${off ? ' (OFF SCREEN)' : ''}`);
  else ok(`${tag}: ${words}`);
  return m;
}
async function escapeDialogs(p) {
  for (let i = 0; i < 3; i++) {
    /* A rules dialog may hold the pending cookie region inside it (CookieConsent keeps one region in an open
       dialog's focus scope), so count dialogs that are not themselves the cookie dialog. */
    const open = await p.locator('[role="dialog"]:not([aria-label="Cookie choices"]):visible, [role="alertdialog"]:visible').count().catch(() => 0);
    if (open <= 0) return;
    await p.keyboard.press('Escape').catch(() => {});
    await p.waitForTimeout(300);
  }
}
const clickTile = (p, t) => p.evaluate(t => { const b = [...document.querySelectorAll('button')].find(x => x.querySelector(':scope > div.uppercase')?.textContent.trim() === t); if (b) b.click(); return !!b; }, t);

/* ---------- A: a fresh visit, Take the job, the hub, a rival club page, a squad card ---------- */
const RIVALS = [['Liverpool', 'Andoni Iraola', null], ['Newcastle', 'Matthias Jaissle', 'since Aug 2026'], ['Chelsea', 'Xabi Alonso', null]];
async function toHubTab(p, name) {
  const home = p.locator('button:visible').filter({ hasText: /Club home/ }).first();
  if (await vis(home)) await home.click().catch(() => {});
  const tab = p.getByRole('tab', { name, exact: true }).first();
  if (await vis(tab)) await tab.click().catch(() => {});
  await p.waitForTimeout(500);
}
async function sectionA(w, h, motion, tag) {
  const p = await newPage(w, h, motion);
  const tap = async rx => { const b = p.getByRole('button', { name: rx }).first(); if (!(await b.count().catch(() => 0))) return false; return b.click({ timeout: 8000 }).then(() => true).catch(() => false); };
  await p.goto(BASE + '/club-manager', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1500);
  await escapeDialogs(p);
  if (!(await bannerUp(p))) fail(`${tag} A: the cookie banner is not pending on a first visit (nothing below measures it)`);
  await tap(/2026-27/);
  await p.getByRole('button', { name: /England/ }).first().waitFor({ timeout: 10000 }).catch(() => {});
  await tap(/England/);
  await p.getByRole('button', { name: /Premier League/ }).first().waitFor({ timeout: 10000 }).catch(() => {});
  await tap(/Premier League/);
  const club = p.locator('button').filter({ hasText: /Everton/ }).first();
  await club.waitFor({ timeout: 10000 }).catch(() => {});
  await club.click().catch(() => {});
  await p.waitForTimeout(700);
  await shot(p, `${tag}-A1-takejob`);
  await reach(p, p.getByRole('button', { name: /Take the job/ }), `${tag} A`, 'Take the job (confirm bar)');
  await tap(/Take the job/);
  await p.getByText(/who is in the dugout/i).first().waitFor({ timeout: 10000 }).catch(() => fail(`${tag} A: no manager step after Take the job`));
  await reach(p, p.getByRole('button', { name: /Skip: just manage/ }), `${tag} A`, 'Skip: just manage');
  await shot(p, `${tag}-A2-managerform`);
  await tap(/Skip: just manage/);
  await p.waitForTimeout(1500);
  await escapeDialogs(p);
  const body = (await p.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ');
  if (!/Season 1/.test(body)) { fail(`${tag} A: never reached the hub (${body.slice(0, 160)})`); await shot(p, `${tag}-A-stuck`, true); await p.context().close(); return; }
  ok(`${tag} A: in the job at Everton, season 1`);
  const sw = await sideways(p); if (sw > 1) fail(`${tag} A: the hub scrolls sideways by ${sw}px`);
  await shot(p, `${tag}-A3-hub`);
  const mc = p.locator('[data-cm-mc-dugout]').first();
  if (await vis(mc)) { await mc.evaluate(e => e.scrollIntoView({ block: 'center' })); info(`${tag} A: next fixture dugout "${(await mc.innerText()).replace(/\s+/g, ' ')}" (${await mc.getAttribute('data-cm-mc-dugout')})`); await shot(p, `${tag}-A4-fixture-dugout`); }
  else info(`${tag} A: no fixture dugout line on the hub`);
  for (const [rival, man, since] of RIVALS) {
    await toHubTab(p, 'Table');
    const row2 = p.locator('button:visible').filter({ hasText: new RegExp(rival) }).first();
    if (!(await row2.count())) { fail(`${tag} A: no Table row for ${rival}`); continue; }
    await row2.click().catch(() => {});
    await p.waitForTimeout(1000);
    const slot = p.locator('[data-cm-dugout]').first();
    const line = (await slot.innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
    const kind = await slot.getAttribute('data-cm-dugout').catch(() => null);
    if (kind !== 'real' || !line.includes(man) || (since ? !line.includes(since) : /since/.test(line)) || /MADE UP/i.test(line)) fail(`${tag} A: ${rival}'s club page dugout "${line}" (${kind}), expected real ${man}${since ? ' ' + since : ''}`);
    else ok(`${tag} A: ${rival}'s club page reads "${line}" (real)`);
    if (rival === 'Newcastle') { await slot.evaluate(e => e.scrollIntoView({ block: 'center' })).catch(() => {}); await shot(p, `${tag}-A5-club-${rival}`); }
    const back = p.getByRole('button', { name: /^Back/ }).first();
    await reach(p, back, `${tag} A`, `${rival} page Back`);
    await back.click().catch(() => {});
    await p.waitForTimeout(600);
  }
  await toHubTab(p, 'Squad');
  const rowBtn = p.locator('[data-cm-squad-row] > button').first();
  if (await rowBtn.count()) {
    await rowBtn.scrollIntoViewIfNeeded().catch(() => {}); await rowBtn.click().catch(() => {});
    const link = p.locator('[data-cm-squad-detail] [data-cm-card-link]').first();
    await link.waitFor({ timeout: 8000 }).catch(() => {});
    await reach(p, link, `${tag} A`, 'squad row Seasons button');
    await link.click().catch(() => {});
    await p.locator('[data-cm-card]').waitFor({ timeout: 8000 }).catch(() => fail(`${tag} A: no player card from the squad`));
    await shot(p, `${tag}-A6-card-squad`);
    await reach(p, p.locator('[data-cm-card-back]'), `${tag} A`, 'player card Back');
    const sw2 = await sideways(p); if (sw2 > 1) fail(`${tag} A: the player card scrolls sideways by ${sw2}px`);
    await p.locator('[data-cm-card-back]').click().catch(() => {});
  } else fail(`${tag} A: no squad rows`);
  await p.context().close();
}

/* ---------- B: the planted near end career: a leaders card, the season end, the contracts checkpoint ---------- */
async function resume(p, raw) {
  await plant(p, { [KEY]: raw });
  await p.goto(BASE + '/club-manager', { waitUntil: 'domcontentloaded' });
  await p.locator('button', { hasText: 'Resume Career' }).first().click({ timeout: 30000 });
  await p.waitForTimeout(1500);
  await escapeDialogs(p);
}
async function sectionB(w, h, motion, tag) {
  let p = await newPage(w, h, motion);
  await resume(p, NEAR);
  if (!(await bannerUp(p))) fail(`${tag} B: the cookie banner is not pending on the planted career`);
  /* a player card from the league leaders: the goals board, its first rival row */
  const home = p.locator('button:visible').filter({ hasText: /Club home/ }).first();
  if (await vis(home)) await home.click().catch(() => {});
  const statsTile = p.locator('button:visible').filter({ has: p.locator('div', { hasText: /^Stats$/ }) }).first();
  if (await statsTile.count()) {
    await statsTile.click().catch(() => {});
    await p.locator('[data-cm-leaders]').first().waitFor({ timeout: 10000 }).catch(() => fail(`${tag} B: no league leaders after the Stats tile`));
    await p.locator('[data-cm-leaders-tile="goals"]').click().catch(() => {});
    await p.locator('[data-cm-board="goals"]').waitFor({ timeout: 8000 }).catch(() => fail(`${tag} B: no goals board`));
    const link = p.locator('[data-cm-board-row]:not([data-mine]) [data-cm-card-link]').first();
    if (await link.count()) {
      await reach(p, link, `${tag} B`, 'leaders board rival row');
      await link.click().catch(() => {});
      await p.locator('[data-cm-card]').waitFor({ timeout: 8000 }).catch(() => fail(`${tag} B: no player card from the leaders`));
      await shot(p, `${tag}-B1-card-leaders`);
      const card = await p.locator('[data-cm-card]').innerText().catch(() => '');
      info(`${tag} B: leaders card starts "${card.replace(/\s+/g, ' ').slice(0, 140)}"`);
      await reach(p, p.locator('[data-cm-card-back]'), `${tag} B`, 'leaders card Back');
      await p.locator('[data-cm-card-back]').click().catch(() => {});
      await p.waitForTimeout(500);
      if (!(await vis(p.locator('[data-cm-board="goals"]')))) fail(`${tag} B: after Back the goals board is not open as it was`);
    } else fail(`${tag} B: no rival row on the goals board`);
    const lb = p.locator('[data-cm-leaders-back]').first(); if (await vis(lb)) await lb.click().catch(() => {});
  } else fail(`${tag} B: no Stats tile on the hub`);
  /* the rest of the season, the way w1597 drove it */
  const steps = [];
  for (let i = 0; i < 40 && !(await vis(p.locator('[data-cm-deals]'))); i += 1) {
    if (await vis(p.locator('button', { hasText: 'See Season Review' }))) { await p.locator('button', { hasText: 'See Season Review' }).first().click(); steps.push('review'); }
    else if (await vis(p.getByRole('button', { name: 'Continue', exact: true }))) { await p.getByRole('button', { name: 'Continue', exact: true }).first().click(); steps.push('continue'); }
    else if (await vis(p.locator('button', { hasText: 'Rest of season' }))) { await p.locator('button', { hasText: 'Rest of season' }).first().click(); steps.push('rest'); }
    else if (await vis(p.locator('button', { hasText: 'Club home' }))) { await p.locator('button', { hasText: 'Club home' }).first().click(); steps.push('home'); }
    else if (await clickTile(p, 'Calendar')) steps.push('calendar');
    else if (await vis(p.locator('button', { hasText: 'Quick Sim' }))) { await p.locator('button', { hasText: 'Quick Sim' }).first().click(); steps.push('quick'); }
    else { steps.push('nothing'); if (steps.filter(x => x === 'nothing').length > 4) break; }
    await p.waitForTimeout(1500);
  }
  info(`${tag} B: driver steps ${steps.join(',')}`);
  if (!(await vis(p.locator('[data-cm-deals]')))) {
    info(`${tag} B: the driver did not reach the review; resuming the end of season save`);
    await p.context().close();
    p = await newPage(w, h, motion);
    await resume(p, END);
    await p.locator('[data-cm-deals]').waitFor({ timeout: 60000 }).catch(() => {});
  }
  const tile = p.locator('[data-cm-deals]');
  if (!(await vis(tile))) { fail(`${tag} B: no contracts checkpoint at the season review`); await shot(p, `${tag}-B-noreview`, true); await p.context().close(); return; }
  if (!(await bannerUp(p))) fail(`${tag} B: the banner is not pending at the review`);
  await p.waitForTimeout(800);
  await shot(p, `${tag}-B2-review`);
  const contRx = /^(Answer \d+ deals? first|Continue to Season \d+)$/;
  const cont = p.locator('button', { hasText: contRx }).first();
  const firstRenew = p.locator('[data-cm-deal="open"] [data-cm-deal-renew]:not([disabled])').first();
  if (await firstRenew.count()) await reach(p, firstRenew, `${tag} B`, 'a deal Renew button');
  await reach(p, p.locator('[data-cm-deal="open"] [data-cm-deal-letgo]').first(), `${tag} B`, 'a deal Let go button');
  const renewed = await p.evaluate(() => { const row = [...document.querySelectorAll('[data-cm-deal="open"]')].find(r => !r.querySelector('[data-cm-deal-renew]').disabled); if (!row) return null; row.querySelector('[data-cm-deal-renew]').click(); return row.querySelector('.truncate').textContent.trim(); });
  await p.waitForTimeout(400);
  const letOne = await p.evaluate(() => { const row = document.querySelector('[data-cm-deal="open"]'); if (!row) return null; row.querySelector('[data-cm-deal-letgo]').click(); return row.querySelector('.truncate').textContent.trim(); });
  await p.waitForTimeout(400);
  const rest = p.locator('[data-cm-deals-rest]:not([disabled])');
  if (await vis(rest)) { await reach(p, rest, `${tag} B`, 'Let the rest go'); await rest.click().catch(() => {}); }
  await p.waitForTimeout(500);
  await shot(p, `${tag}-B3-deals-answered`);
  const label = ((await cont.textContent().catch(() => '')) || '').trim();
  if ((await cont.isDisabled().catch(() => true)) || !/^Continue to Season 2$/.test(label)) fail(`${tag} B: every answer in but Continue reads "${label}" (renewed ${renewed}, let go ${letOne})`);
  else ok(`${tag} B: every deal answered (renewed ${renewed}, let go ${letOne}), "${label}" opens`);
  await reach(p, cont, `${tag} B`, 'Continue to Season 2');
  await cont.click().catch(() => {});
  await p.waitForTimeout(2500);
  await escapeDialogs(p);
  await shot(p, `${tag}-B4-season2`);
  const save = await p.evaluate(k => JSON.parse(localStorage.getItem(k) || '{}'), KEY);
  if (save.season !== 2) fail(`${tag} B: after Continue the save is in season ${save.season}`);
  else ok(`${tag} B: season 2 begun, ${save.freeAgents?.length ?? 0} on the free agent list`);
  const sw = await sideways(p); if (sw > 1) fail(`${tag} B: season 2's first screen scrolls sideways by ${sw}px`);
  await p.context().close();
}

/* ---------- C: a Hot Seat job carried into the free slot 2 ---------- */
async function sectionC(w, h, motion, tag) {
  const p = await newPage(w, h, motion);
  await plant(p, { [KEY]: SLOT1, [FREE]: JSON.stringify(HOT) });
  await p.goto(BASE + '/manager-hot-seat', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1500);
  await escapeDialogs(p);
  if (!(await bannerUp(p))) fail(`${tag} C: the banner is not pending on Hot Seat`);
  const offer = p.getByRole('button', { name: `See the Club Manager offer for ${HOT.club}` }).first();
  await reach(p, offer, `${tag} C`, 'See the Club Manager offer');
  await offer.click().catch(() => {});
  await p.getByTestId('hot-seat-carry-on').waitFor({ timeout: 15000 }).catch(() => fail(`${tag} C: no carry on card`));
  const where = (await p.getByTestId('hot-seat-carry-on-slot').innerText().catch(() => '')).replace(/\s+/g, ' ');
  if (!where.includes('slot 2') || !where.includes(slotClub)) fail(`${tag} C: the card says "${where}", expected slot 2 and ${slotClub} kept`);
  else ok(`${tag} C: the card says "${where}"`);
  const go = p.getByRole('button', { name: 'Carry on in Club Manager' });
  await reach(p, go, `${tag} C`, 'Carry on in Club Manager');
  await shot(p, `${tag}-C1-carry-card`);
  await go.click().catch(() => {});
  await p.waitForURL(/\/club-manager/, { timeout: 20000 }).catch(() => fail(`${tag} C: never reached Club Manager`));
  await p.locator('[data-testid="cm-show-slots"]').first().waitFor({ timeout: 30000 }).catch(() => fail(`${tag} C: Club Manager did not open on the hub`));
  await p.waitForTimeout(800);
  await escapeDialogs(p);
  const st = await p.evaluate(() => Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)])));
  let active = null; try { active = JSON.parse(st['dukb-cm-slots']).active; } catch { active = null; }
  if (active !== 2 || clubOf(st[KEY]) !== HOT.club || clubOf(st['dukb-cm-slot-1']) !== slotClub) fail(`${tag} C: storage active ${active}, live ${clubOf(st[KEY])}, slot 1 ${clubOf(st['dukb-cm-slot-1'])}`);
  else ok(`${tag} C: the job is in slot 2 (${HOT.club}), slot 1 kept ${slotClub}`);
  await shot(p, `${tag}-C2-hub`);
  const sw = await sideways(p); if (sw > 1) fail(`${tag} C: the carried hub scrolls sideways by ${sw}px`);
  await p.context().close();
}

/* ---------- D: Soccer Career, the academy shown is the academy joined ---------- */
async function pickCombo(p, triggerText, wanted) {
  const trigger = p.locator('[role="combobox"]', { hasText: triggerText }).first();
  await trigger.click();
  await p.waitForSelector('[role="option"]', { timeout: 8000 });
  const chosen = await p.evaluate(w => { const opts = [...document.querySelectorAll('[role="option"]')]; const hit = opts.find(o => o.textContent.includes(w)) || opts[0]; const label = hit.textContent.trim(); hit.scrollIntoView(); hit.click(); return label; }, wanted);
  await p.waitForTimeout(400);
  return chosen;
}
async function sectionD(w, h, motion, tag, nat) {
  const p = await newPage(w, h, motion);
  await p.goto(BASE + '/soccer-career', { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('input[placeholder*="player name"]', { timeout: 20000 });
  await escapeDialogs(p);
  if (!(await bannerUp(p))) fail(`${tag} D: the banner is not pending on Soccer Career`);
  await p.fill('input[placeholder*="player name"]', 'Walk Reviewer');
  const n = await pickCombo(p, 'Choose nationality', nat);
  const pos = await pickCombo(p, 'Choose position', 'Midfielder');
  const era = await pickCombo(p, 'Choose era', '20');
  const roll = p.getByRole('button', { name: /Generate Starting Potential/ });
  await reach(p, roll, `${tag} D`, 'Generate Starting Potential');
  await roll.click().catch(() => {});
  await p.waitForTimeout(3200);
  const shown = await p.evaluate(() => { const el = [...document.querySelectorAll('div.font-bold')].find(d => / Youth$/.test(d.textContent.trim())); return el ? el.textContent.trim() : null; });
  await shot(p, `${tag}-D1-academy`);
  const begin = p.getByRole('button', { name: /Begin Career/ });
  await reach(p, begin, `${tag} D`, 'Begin Career');
  await begin.click().catch(() => {});
  await p.waitForTimeout(2500);
  await escapeDialogs(p);
  const save = await p.evaluate(() => { try { return JSON.parse(localStorage.getItem('soccerCareerSave') || 'null'); } catch { return null; } });
  const joined = save?.currentClub ?? null;
  /* the shown line carries the nation's flag emoji in front of the club; compare the club text only */
  const shownClub = shown ? shown.slice(shown.search(/[A-Za-z]/)) : null;
  if (!shownClub || !joined || shownClub !== joined) fail(`${tag} D: ${n}, ${pos}, ${era}: shown "${shown}", joined "${joined}"`);
  else ok(`${tag} D: ${n}, ${pos}, ${era}: shown and joined "${joined}"`);
  await shot(p, `${tag}-D2-started`);
  if (w >= 768) for (const u of ['phone']) { const b = p.locator(`[data-career-utility="${u}"]`).first(); if (await vis(b)) await reach(p, b, `${tag} D`, `the ${u} button`); }
  const tr = p.getByRole('button', { name: 'Open the training ground' }).first(); if (await vis(tr)) await reach(p, tr, `${tag} D`, 'the Training button');
  const sw = await sideways(p); if (sw > 1) fail(`${tag} D: the new career scrolls sideways by ${sw}px`);
  await p.context().close();
}

/* ---------- the runs ---------- */
const CONFIGS = [[390, 844, 'reduce'], [1280, 900, 'reduce'], [390, 844, 'no-preference'], [1280, 900, 'no-preference']];
const NATS = ['England', 'Brazil', 'Spain', 'Nigeria'];
let k = 0;
for (const [w, h, motion] of CONFIGS) {
  const tag = `${w}${motion === 'reduce' ? 'rm' : 'mo'}`;
  SHOTS = motion === 'reduce';
  for (const [sec, fn] of [['A', sectionA], ['B', sectionB], ['C', sectionC], ['D', (a, b, c, d) => sectionD(a, b, c, d, NATS[k % NATS.length])]]) {
    if (!ONLY.includes(sec)) continue;
    errors = [];
    console.log(`-- ${tag} section ${sec}`);
    try { await fn(w, h, motion, tag); } catch (e) { fail(`${tag} ${sec}: threw ${String(e?.message ?? e).slice(0, 200)}`); }
    if (errors.length) fail(`${tag} ${sec}: page errors ${errors.slice(0, 2).join(' | ')}`);
  }
  k += 1;
}
await browser.close();
console.log(fails ? `walkcmsc: RED, ${fails} failures` : 'walkcmsc: green');
process.exit(fails ? 1 : 0);
