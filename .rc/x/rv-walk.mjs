/* Reviewer walk, Round 1607 run lens (never committed). Plays Club Manager the way a player does at 390x844 and
   1280x900, reduced motion on and off: a new career in each of four big five leagues, three rival club pages,
   the Match Centre preview, the ? help's dugout section; one 2010-11 career (no rows, every chair MADE UP);
   and the What's New line. The database host is blocked. Run in a #!serve #!playwright request. */
import fs from 'node:fs';
import path from 'node:path';
import pw from '../../scripts/lib/playwrightLoader.mjs';
import { answerConsent } from '../../scripts/lib/answerConsent.mjs';

const BASE = process.env.SWEEP_BASE || process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || path.resolve('.rc-out');
fs.mkdirSync(OUT, { recursive: true });
const RUNS = [
  { tag: 'pl-390-rm', w: 390, h: 844, mobile: true, rm: 'reduce', era: /2026-27/i, country: /England/i, league: /Premier League/i, club: 'Everton',
    rivals: [['Liverpool', 'Andoni Iraola', null], ['Manchester United', 'Michael Carrick', 'since Jan 2026'], ['Newcastle', 'Matthias Jaissle', 'since Aug 2026']] },
  { tag: 'es-1280', w: 1280, h: 900, mobile: false, rm: 'no-preference', era: /2026-27/i, country: /Spain/i, league: /La Liga/i, club: 'Real Madrid',
    rivals: [['Barcelona', 'Hansi Flick', null], ['Real Sociedad', 'Pellegrino Matarazzo', 'since Dec 2025'], ['Atlético Madrid', 'Diego Simeone', null]] },
  { tag: 'fr-390', w: 390, h: 844, mobile: true, rm: 'no-preference', era: /2026-27/i, country: /France/i, league: /Ligue 1/i, club: 'Marseille',
    rivals: [['Toulouse', 'Jens Berthel Askou', 'since May 2026'], ['Lorient', 'Alexandre Dujeux', 'since Jun 2026'], ['Auxerre', 'Will Still', null]] },
  { tag: 'de-1280-rm', w: 1280, h: 900, mobile: false, rm: 'reduce', era: /2026-27/i, country: /Germany/i, league: /Bundesliga/i, club: 'Bayern Munich',
    rivals: [['Borussia Dortmund', 'Niko Kovač', 'since Feb 2025'], ['Gladbach', 'Eugen Polanski', null], ['Bayer Leverkusen', 'Carles Martínez', null]] },
  { tag: 'era2010-390', w: 390, h: 844, mobile: true, rm: 'reduce', era: /2010-11/i, country: /England/i, league: /Premier League/i, club: 'Everton',
    rivals: [['Liverpool', null, null], ['Chelsea', null, null]] },
];
let failures = 0;
const fail = (t, m) => { failures += 1; console.log(`  FAIL [${t}]: ${m}`); };
const ok = (t, m) => console.log(`  ok   [${t}] ${m}`);
const browser = await pw.chromium.launch();

for (const R of RUNS) {
  const context = await browser.newContext({ viewport: { width: R.w, height: R.h }, isMobile: R.mobile, hasTouch: R.mobile, reducedMotion: R.rm });
  const page = await context.newPage();
  await page.route(/supabase\.co/, r => r.abort());
  const errors = [];
  page.on('pageerror', e => errors.push(String(e?.message ?? e)));
  const text = async () => (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
  const shot = async name => page.screenshot({ path: path.join(OUT, `${R.tag}-${name}.png`), fullPage: false }).catch(() => {});
  const tap = async rx => { const b = page.getByRole('button', { name: rx }).first(); if (await b.count().catch(() => 0) === 0) return false; return b.click({ timeout: 5000 }).then(() => true).catch(() => false); };
  const clearRoom = async () => {
    await answerConsent(page, { wait: 1200 }).catch(() => {});
    for (let i = 0; i < 3; i++) { if (await page.locator('[role="dialog"][data-state="open"]').count().catch(() => 0) === 0) break; await page.keyboard.press('Escape').catch(() => {}); await page.waitForTimeout(250); }
  };
  const overflow = async () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth).catch(() => -1);
  try {
    await page.goto(BASE + '/club-manager', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1000);
    await clearRoom();
    await tap(R.era);
    await page.getByRole('button', { name: R.country }).first().waitFor({ timeout: 15000 }).catch(() => {});
    await tap(R.country);
    await page.getByRole('button', { name: R.league }).first().waitFor({ timeout: 10000 }).catch(() => {});
    await tap(R.league);
    const club = page.locator('button').filter({ hasText: new RegExp(R.club) }).first();
    await club.waitFor({ timeout: 10000 }).catch(() => {});
    await club.click({ timeout: 5000 }).catch(() => {});
    await tap(/take the job|confirm|start/i);
    await page.getByText(/who is in the dugout/i).first().waitFor({ timeout: 10000 }).catch(() => {});
    await shot('0-dugout-intro');
    await tap(/skip: just manage/i);
    await page.waitForTimeout(1000);
    await clearRoom();
    if (!/Season 1/i.test(await text())) throw new Error('could not get past the club picker');
    ok(R.tag, `in the job at ${R.club}, season 1`);
    for (const [rival, man, since] of R.rivals) {
      const tab = page.getByRole('tab', { name: /^Table$/i }).first();
      if (await tab.count().catch(() => 0)) await tab.click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(600);
      const row = page.locator('button:visible').filter({ hasText: new RegExp(rival) }).first();
      if (await row.count().catch(() => 0) === 0) { fail(R.tag, `no table row for ${rival}`); continue; }
      await row.click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(1200);
      const slug = rival.toLowerCase().normalize('NFD').replace(/[^a-z]+/g, '-');
      await shot(`club-${slug}`);
      const slot = page.locator('[data-cm-dugout]').first();
      const kind = await slot.getAttribute('data-cm-dugout').catch(() => null);
      const line = (await slot.innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
      const box = await slot.boundingBox().catch(() => null);
      const ov = await overflow();
      if (ov > 0) fail(R.tag, `${rival}: the page scrolls sideways by ${ov}px`);
      if (box && box.x + box.width > R.w + 0.5) fail(R.tag, `${rival}: the dugout line runs off the screen (${Math.round(box.x + box.width)} of ${R.w})`);
      if (man) {
        if (kind !== 'real') fail(R.tag, `${rival}: slot ${kind}, not real (line "${line}")`);
        if (!line.includes(man)) fail(R.tag, `${rival}: line "${line}" lacks ${man}`);
        if (since && !line.includes(since)) fail(R.tag, `${rival}: line "${line}" lacks ${since}`);
        if (!since && /since/.test(line)) fail(R.tag, `${rival}: line "${line}" shows a month the table does not store`);
        if (/MADE UP/i.test(line)) fail(R.tag, `${rival}: a real chair wears MADE UP`);
      } else if (kind !== 'made-up' || !/MADE UP/i.test(line)) fail(R.tag, `${rival}: expected a MADE UP chair, got ${kind} "${line}"`);
      ok(R.tag, `${rival}: ${kind} "${line}" box ${box ? `${Math.round(box.x)}+${Math.round(box.width)}x${Math.round(box.height)}` : 'none'}`);
      (await tap(/^back/i)) || (await page.goBack().catch(() => {}));
      await page.waitForTimeout(600);
    }
    const home = page.getByRole('tab', { name: /^Home$/i }).first();
    if (await home.count().catch(() => 0)) await home.click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(600);
    if (await tap(/Match Centre/i)) {
      await page.locator('[data-cm-mc-dugout]').first().waitFor({ timeout: 8000 }).catch(() => {});
      const mc = page.locator('[data-cm-mc-dugout]').first();
      await mc.scrollIntoViewIfNeeded().catch(() => {});
      await page.waitForTimeout(400);
      await shot('match-centre');
      const kind = await mc.getAttribute('data-cm-mc-dugout').catch(() => null);
      const line = (await mc.innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
      const box = await mc.boundingBox().catch(() => null);
      ok(R.tag, `Match Centre dugout: ${kind} "${line}" box ${box ? `${Math.round(box.x)}+${Math.round(box.width)}` : 'none'}; page around it: ${(await text()).match(/.{0,80}Manager:.{0,60}/)?.[0] ?? 'no Manager: text'}`);
      if (!kind) fail(R.tag, 'the Match Centre shows no dugout slot');
      if (box && box.x + box.width > R.w + 0.5) fail(R.tag, 'the Match Centre dugout line runs off the screen');
    } else fail(R.tag, 'no Match Centre button on Home');
    await page.keyboard.press('Escape').catch(() => {});
    if (await page.getByRole('button', { name: /How to play/i }).first().click({ timeout: 5000 }).then(() => true).catch(() => false)) {
      const help = page.locator('[data-cm-help="real-dugouts"]').first();
      await help.waitFor({ timeout: 8000 }).catch(() => {});
      await help.scrollIntoViewIfNeeded().catch(() => {});
      await page.waitForTimeout(500);
      await shot('help-dugouts');
      ok(R.tag, `help: ${(await help.innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 400)}`);
    } else fail(R.tag, 'no How to play button');
  } catch (e) {
    fail(R.tag, String(e?.message ?? e));
    await shot('blocked');
  }
  if (errors.length) fail(R.tag, `page errors: ${errors.slice(0, 3).join(' | ')}`);
  if (R.tag === 'pl-390-rm') {
    await page.goto(BASE + '/whats-new', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(1500);
    await clearRoom();
    const li = page.locator('li').filter({ hasText: /the real managers on day one/i }).first();
    await li.scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(400);
    await shot('whats-new');
    ok(R.tag, `whats-new: ${(await li.innerText().catch(() => 'NOT FOUND')).replace(/\s+/g, ' ').slice(0, 200)}`);
  }
  await context.close();
}
await browser.close();
console.log(failures ? `rv-walk: ${failures} failure(s)` : 'rv-walk: green');
process.exit(failures ? 1 : 0);
