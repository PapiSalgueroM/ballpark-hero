/* Reviewer (run lens), runner only, never committed: play Round 1335 the way a player meets it, on the served
   build (BASE, from #!serve), every host but the page's own aborted (supabase.co included), at 390 by 844 and
   1280 by 900, with reduced motion on and off. Saves are built in node by the real engine and planted.
   Cases: offers (tap, the question, focus, Back, focus back, no jump, no sideways scroll), up, down, escape
   (the fate line and the verdict), record (the sacked screen's season list with the fate word), help (the
   board's verdict block), news (What's New). Pictures to RC_OUT as rv-<case>-<width>-<rm|mo>.png.
   Prints measurements and FAIL lines; exit 0 when it ran, 1 when a FAIL was printed. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
const ROOT = process.cwd();
const require = createRequire(path.join(ROOT, 'package.json'));
const { chromium } = (await import(pathToFileURL(path.join(ROOT, 'scripts/lib/playwrightLoader.mjs')).href)).default;
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || path.join(ROOT, '.tmp-fx', 'rvwalk');
fs.mkdirSync(OUT, { recursive: true });
const KEY = 'dukb-club-manager-save';
function withSeed(seed, fn) {
  const previous = Math.random;
  let a = seed >>> 0;
  Math.random = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  try { return fn(); } finally { Math.random = previous; }
}
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'rv-walk-'));
fs.writeFileSync(path.join(work, 'entry.ts'), "export * as cm from '@/lib/clubManager';\n");
await build({ entryPoints: [path.join(work, 'entry.ts')], bundle: true, platform: 'node', format: 'cjs', outfile: path.join(work, 'engine.cjs'), logLevel: 'silent', alias: { '@': path.join(ROOT, 'src') }, nodePaths: [path.join(ROOT, 'node_modules')] });
const memory = new Map();
globalThis.localStorage = { getItem: k => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, String(v)), removeItem: k => memory.delete(k), clear: () => memory.clear() };
const { cm } = require(path.join(work, 'engine.cjs'));
await cm.ensureAllEraRosters();
const QUICK = { skipHalftime: true };
function seasonEnd(club, seed) {
  cm.registerLeagueOverrides(null);
  let s = withSeed(seed, () => cm.startCareer(club));
  for (let i = 0; i < 160; i++) {
    const r = withSeed(seed * 7919 + i + 1, () => cm.playNextEntry(s, QUICK));
    s = r.state;
    if (s.sacked) return null;
    if (r.kind === 'seasonOver') return withSeed(seed * 31 + 3, () => cm.finishSeason(s));
  }
  return null;
}
const found = {};
const bottom = [...cm.playableClubs('premier')].sort((a, b) => b.expectation - a.expectation).slice(0, 4).map(d => d.name);
for (const want of ['down', 'escape']) {
  for (let seed = 0; seed < 25 && !found[want]; seed++) for (const club of bottom) { if (found[want]) break; const f = seasonEnd(club, 800 + seed); if (f?.summary.fate === want) found[want] = f; }
}
for (let seed = 0; seed < 30 && !found.up; seed++) { const f = seasonEnd('West Ham', 300 + seed); if (f?.summary.fate === 'up') found.up = f; }
console.log(`[saves] premier bottom four ${bottom.join(', ')}; found ${Object.keys(found).map(k => `${k}: ${found[k].state.clubName} #${found[k].summary.position} "${found[k].summary.verdict}" grade ${found[k].summary.verdictGrade}, ${found[k].summary.offers.length} offers`).join('; ')}`);
const offersSave = found.up ? JSON.parse(JSON.stringify(found.up.state)) : null;
if (offersSave && offersSave.pendingSummary.offers.length < 2) {
  const mine = cm.clubDefFor(offersSave.clubName).tier;
  const pool = cm.REAL_LEAGUES.flatMap(l => cm.playableClubs(l.id)).filter(c => c.tier === Math.max(1, mine - 1) && c.name !== offersSave.clubName).slice(0, 2);
  offersSave.pendingSummary.offers = [...offersSave.pendingSummary.offers, ...pool.map(c => ({ club: c.name, blurb: `A club one tier up · ${cm.leagueOf(c.name).name} · the board wants: a strong season` }))].slice(0, 2);
  console.log('[saves] the promotion review had fewer than two offers: filled to two clubs one tier up (the walk tests the screen)');
}
let recordSave = null;
if (found.down) {
  const rolled = withSeed(4242, () => cm.startNextSeason(JSON.parse(JSON.stringify(found.down.state))));
  recordSave = withSeed(4243, () => cm.enterWilderness({ ...rolled, sacked: true }));
  console.log(`[saves] the sacked save: ${recordSave.clubName}, sacked ${recordSave.sacked}, history ${JSON.stringify(recordSave.history.map(h => [h.season, h.club, h.position, h.fate ?? null]))}`);
}
const hubSave = withSeed(77, () => cm.startCareer('Brighton'));
let fails = 0;
const FAIL = (what) => { fails += 1; console.log(`FAIL ${what}`); };
const browser = await chromium.launch({ headless: true });
async function pageWith(w, h, motion, save) {
  const context = await browser.newContext({ viewport: { width: w, height: h }, isMobile: w < 500, hasTouch: w < 500, reducedMotion: motion, serviceWorkers: 'block',
    storageState: { cookies: [], origins: [{ origin: BASE, localStorage: [...(save ? [{ name: KEY, value: JSON.stringify(save) }] : []), { name: 'cookie-consent', value: 'essential' }] }] } });
  await context.route('**/*', route => (new URL(route.request().url()).origin === new URL(BASE).origin ? route.continue() : route.abort()));
  const page = await context.newPage();
  await page.route(/supabase\.co/, r => r.abort());
  page.setDefaultTimeout(12000);
  page.errs = [];
  page.on('pageerror', e => page.errs.push(String(e?.message ?? e).slice(0, 120)));
  return { context, page };
}
async function openCm(page, ready) {
  await page.goto(`${BASE}/club-manager`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  await page.getByRole('button', { name: /^essential only$/i }).first().click({ timeout: 1200 }).catch(() => {});
  for (let i = 0; i < 12; i++) {
    if (await page.locator(ready).count().catch(() => 0)) return true;
    const resume = page.getByRole('button', { name: /Resume Career|Continue career|Resume/i }).first();
    if (await resume.count().catch(() => 0)) await resume.click({ timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(700);
  }
  return (await page.locator(ready).count().catch(() => 0)) > 0;
}
const sideways = page => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
const shot = (page, name, full = false) => page.screenshot({ path: path.join(OUT, `rv-${name}.jpg`), type: 'jpeg', quality: 62, fullPage: full }).catch(() => {});
const saved = page => page.evaluate(k => localStorage.getItem(k), KEY);
const PROFILES = [[390, 844], [1280, 900]];
for (const [w, h] of PROFILES) {
  for (const motion of ['reduce', 'no-preference']) {
    const tag = `${w}-${motion === 'reduce' ? 'rm' : 'mo'}`;
    const settle = motion === 'reduce' ? 600 : 3500;
    /* offers: the confirm */
    if (offersSave) {
      const { context, page } = await pageWith(w, h, motion, offersSave);
      const club = offersSave.pendingSummary.offers[0].club;
      const ok = await openCm(page, `[data-cm-offer="${club}"]`);
      if (!ok) FAIL(`${tag} offers: the review did not show the offer cards`);
      else {
        await page.locator(`[data-cm-offer="${club}"]`).first().scrollIntoViewIfNeeded();
        await page.waitForTimeout(settle);
        if (motion === "reduce") await shot(page, `offers-${tag}`);
        const before = await page.evaluate(() => ({ y: scrollY, top: document.querySelector('[data-cm-offers]').getBoundingClientRect().top }));
        const raw0 = await saved(page);
        await page.locator(`[data-cm-offer="${club}"]`).first().click();
        await page.waitForTimeout(400);
        const m = await page.evaluate(() => {
          const box = document.querySelector('[data-cm-offer-confirm]');
          const panel = document.querySelector('[data-cm-offers]')?.getBoundingClientRect();
          const a = document.activeElement;
          const texts = box ? [...box.querySelectorAll('p,button')].map(n => ({ fs: parseFloat(getComputedStyle(n).fontSize), cut: n.scrollWidth > n.clientWidth + 1, op: getComputedStyle(n).opacity })) : [];
          return { has: !!box, y: scrollY, top: panel?.top, focusTake: !!a?.hasAttribute?.('data-cm-offer-take'), focusTag: a?.tagName + ' ' + (a?.textContent ?? '').slice(0, 30),
            small: texts.filter(t => t.fs < 12).length, cut: texts.filter(t => t.cut).length, btn: box ? [...box.querySelectorAll('button')].map(b => Math.round(b.getBoundingClientRect().height)) : [], text: box?.textContent ?? '' };
        });
        console.log(`[offers ${tag}] confirm ${m.has}; y ${before.y} to ${m.y}; panel top ${Math.round(before.top)} to ${Math.round(m.top)}; focus ${m.focusTag}; buttons ${m.btn.join(',')}; small ${m.small}; cut ${m.cut}; sideways ${await sideways(page)}; text "${m.text.slice(0, 200)}"`);
        if (!m.has) FAIL(`${tag} offers: no confirm`);
        if (Math.abs(m.y - before.y) > 1 || Math.abs(m.top - before.top) > 1) FAIL(`${tag} offers: the page moved on the tap`);
        if (!m.focusTake) FAIL(`${tag} offers: focus is not on Take the job (${m.focusTag})`);
        if ((await saved(page)) !== raw0) FAIL(`${tag} offers: the tap changed the save`);
        await shot(page, `confirm-${tag}`);
        await page.locator('[data-cm-offer-back]').click();
        await page.waitForTimeout(150);
        if (motion !== "reduce") await shot(page, `back150-${tag}`);
        await page.waitForTimeout(settle);
        const back = await page.evaluate(c => ({ focusCard: document.activeElement?.getAttribute?.('data-cm-offer') === c, n: document.querySelectorAll('[data-cm-offer]').length, op: [...document.querySelectorAll('[data-cm-offer]')].map(b => getComputedStyle(b).opacity).join(',') }), club);
        console.log(`[offers ${tag}] after Back: ${back.n} cards (opacity ${back.op}), focus on the tapped card ${back.focusCard}`);
        if (!back.focusCard) FAIL(`${tag} offers: Back did not return focus to the card`);
        if (motion === "reduce") await shot(page, `back-${tag}`);
      }
      if (page.errs.length) FAIL(`${tag} offers: page error ${page.errs[0]}`);
      await context.close();
    }
    /* up, down, escape: the fate line and the verdict */
    for (const fate of ['up', 'down', 'escape']) {
      const f = found[fate];
      if (!f) { console.log(`[${fate}] no season found`); continue; }
      const { context, page } = await pageWith(w, h, motion, f.state);
      const ok = await openCm(page, '[data-season-lines]');
      await page.waitForTimeout(300);
      const early = await page.evaluate(() => { const el = document.querySelector('[data-cm-fate]'); return el ? getComputedStyle(el).opacity : 'none'; });
      await page.waitForTimeout(settle);
      const line = await page.locator('[data-cm-fate]').first().innerText().catch(() => 'none');
      const body = await page.locator('body').innerText().catch(() => '');
      console.log(`[${fate} ${tag}] ${f.state.clubName} #${f.summary.position}: fate line "${line}" (opacity at 300 ms ${early}); verdict on screen ${body.includes(f.summary.verdict)} "${f.summary.verdict}"; grade ${f.summary.verdictGrade}; sideways ${await sideways(page)}`);
      if (!ok || line === 'none') FAIL(`${tag} ${fate}: no fate line`);
      if (motion === 'reduce' && early !== '1') FAIL(`${tag} ${fate}: the fate line is still animating under reduced motion (opacity ${early})`);
      if (motion === "reduce") await shot(page, `${fate}-${tag}`, true);
      if (page.errs.length) FAIL(`${tag} ${fate}: page error ${page.errs[0]}`);
      await context.close();
    }
    /* the sacked screen's season list */
    if (recordSave) {
      const { context, page } = await pageWith(w, h, motion, recordSave);
      const ok = await openCm(page, '[data-wilderness]');
      await page.waitForTimeout(settle);
      const body = await page.locator('body').innerText().catch(() => '');
      const row = body.split('\n').find(l => /^S\d+ /.test(l.trim())) ?? 'none';
      console.log(`[record ${tag}] screen ready ${ok}; season row "${row.trim()}"; errors ${page.errs.join(' | ') || 'none'}; body starts "${body.replace(/\s+/g, ' ').slice(0, 160)}"`);
      if (!/relegated/.test(row)) FAIL(`${tag} record: the season row has no fate word`);
      if (motion === 'reduce') {
        await page.locator('text=Career record').first().scrollIntoViewIfNeeded().catch(() => {});
        await shot(page, `record-${tag}`);
      }
      await context.close();
    }
    /* the help block */
    {
      const { context, page } = await pageWith(w, h, motion, hubSave);
      await openCm(page, '[data-cm-meter="board"]');
      await page.getByRole('button', { name: /how to play/i }).first().click({ timeout: 5000 }).catch(() => FAIL(`${tag} help: no How to play button`));
      await page.waitForTimeout(900);
      const block = page.locator('[data-cm-help="board-verdict"]').first();
      if (await block.count()) {
        await block.scrollIntoViewIfNeeded();
        await page.waitForTimeout(300);
        await block.screenshot({ path: path.join(OUT, `rv-help-${tag}.png`) }).catch(() => {});
        const hm = await block.evaluate(el => { const r = el.getBoundingClientRect(); return { w: Math.round(r.width), right: Math.round(r.right), vw: innerWidth, small: [...el.querySelectorAll('p')].filter(p => parseFloat(getComputedStyle(p).fontSize) < 12).length, text: el.innerText.slice(0, 120) }; });
        console.log(`[help ${tag}] block width ${hm.w}, right ${hm.right} of ${hm.vw}, small paragraphs ${hm.small}: "${hm.text}"`);
        if (hm.right > hm.vw) FAIL(`${tag} help: the block runs off the screen`);
      } else FAIL(`${tag} help: no board verdict block`);
      await context.close();
    }
    /* What's New */
    if (motion === 'reduce') {
      const { context, page } = await pageWith(w, h, motion, null);
      await page.goto(`${BASE}/whats-new`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1500);
      const li = page.locator('li', { hasText: 'the board judges the season you actually had' }).first();
      if (await li.count()) { await li.scrollIntoViewIfNeeded(); await li.screenshot({ path: path.join(OUT, `rv-news-${tag}.png`) }).catch(() => {}); console.log(`[news ${tag}] entry found, sideways ${await sideways(page)}`); }
      else FAIL(`${tag} news: no entry`);
      await context.close();
    }
  }
}
await browser.close();
console.log(fails ? `rvWalk: ${fails} FAIL lines` : 'rvWalk: no FAIL lines');
process.exit(fails ? 1 : 0);
