/* Review walk (Round 1520, run lens). A player's view of the served branch build (BASE), Supabase blocked, only the
   origin and flagcdn.com reachable, at 390x844 and 1280x900, reduced motion on and off:
   OLD: a save written by the BASE engine (BASE_ROOT, the round's base) opened on the branch: the board panel and the
        squad. NEW: a branch save with a made up man bought from abroad: the market filtered to a made up man's country.
   Screenshots into RC_OUT/rv. Prints what it read; exit 0 always unless it could not run (2). */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const ROOT = process.cwd();
const URL_BASE = (process.env.BASE ?? 'http://localhost:4173').replace(/\/$/, '');
const OUT = path.join(process.env.RC_OUT ?? '.tmp-fx', 'rv');
fs.mkdirSync(OUT, { recursive: true });
const SAVE_KEY = 'dukb-club-manager-save';
const NOW = Date.UTC(2026, 9, 21, 16, 0, 0);
const cannot = why => { console.log(`review-walk: cannot run: ${why}`); process.exit(2); };
if (!process.env.BASE_ROOT) cannot('BASE_ROOT');
async function bundle(root, name) {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), `rvw-${name}-`));
  fs.writeFileSync(path.join(work, 'e.ts'), ['clubManager', 'clubManagerBoardAsks'].map((f, i) => `export * as ${i ? 'asks' : 'cm'} from ${JSON.stringify(path.join(root, `src/lib/${f}.ts`))};`).join('\n'));
  await build({ entryPoints: [path.join(work, 'e.ts')], bundle: true, platform: 'node', format: 'cjs', outfile: path.join(work, 'b.cjs'),
    logLevel: 'silent', alias: { '@': path.join(root, 'src') }, nodePaths: [path.join(ROOT, 'node_modules')] });
  return createRequire(import.meta.url)(path.join(work, 'b.cjs'));
}
const store = new Map();
globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() };
Date.now = () => NOW;
let a = 1520;
Math.random = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const B = await bundle(process.env.BASE_ROOT, 'base');
const H = await bundle(ROOT, 'head');
const rawOf = (mod, s) => { store.delete(SAVE_KEY); mod.cm.saveCareer(s); return store.get(SAVE_KEY); };
const openIn = (mod, raw) => { store.set(SAVE_KEY, raw); return mod.cm.loadCareer(); };

/* OLD: the first club whose day one country ask the branch grades differently from the base. */
let OLD = null, oldNote = 'no club flipped';
for (const lg of H.cm.REAL_LEAGUES.slice(0, 6)) {
  for (const club of H.cm.playableClubs(lg.id).map(c => c.name)) {
    if (OLD) break;
    const s = B.cm.startCareer(club);
    const raw = rawOf(B, s);
    const bL = openIn(B, raw), hL = openIn(H, raw);
    const ask = (bL.boardObjectives ?? []).find(o => o.id === 'natQuota');
    if (!ask) continue;
    const sb = B.asks.askStatus(bL, ask), sh = H.asks.askStatus(hL, ask);
    if (sb !== sh) { OLD = raw; oldNote = `${club}: "${ask.label}", base grades ${sb}, branch grades ${sh}`; }
  }
}
console.log(`OLD save: ${oldNote}`);
if (!OLD) { const s = B.cm.startCareer('Everton'); OLD = rawOf(B, s); }

/* NEW: the builder's shape, one season, the summer, a made up man bought from abroad. */
let s = H.cm.startCareer('Everton');
for (let g = 0; g < 160; g += 1) { const r = H.cm.playNextEntry(s, { skipHalftime: true }); s = r.state; if (r.kind === 'seasonOver' || s.sacked) break; }
s = H.cm.startNextSeason(H.cm.finishSeason(s).state);
s = { ...s, budget: Math.max(s.budget, 300) };
const home = H.cm.careerPlace(s).home;
const made = H.cm.buildMarket(s).filter(l => l.generated && l.nation).sort((x, y) => x.price - y.price);
const abroad = made.find(l => l.nation !== home) ?? cannot('no made up man from abroad');
s = H.cm.buyPlayer(s, abroad) ?? cannot('buy refused');
const target = H.cm.buildMarket(s).filter(l => l.generated && l.nation && l.nation !== home).sort((x, y) => x.price - y.price)[0];
const NEW = rawOf(H, s);
console.log(`NEW save: bought ${abroad.name} (${abroad.nation}); market target ${target?.name} (${target?.nation}) at ${target?.club}`);

const browser = await pw.chromium.launch();
async function resume(raw, size, motion) {
  const origin = new URL(URL_BASE).origin;
  const ctx = await browser.newContext({ viewport: size, deviceScaleFactor: 1, reducedMotion: motion, serviceWorkers: 'block' });
  await ctx.route(/supabase\.co/, r => r.abort());
  await ctx.route('**/*', r => { const u = new URL(r.request().url()); return u.origin === origin || u.hostname === 'flagcdn.com' ? r.continue() : r.abort(); });
  await ctx.addInitScript(([k, v, now]) => { try { localStorage.setItem('cookie-consent', 'essential'); if (!localStorage.getItem(k)) localStorage.setItem(k, v); } catch { /* blocked */ } Date.now = () => now; }, [SAVE_KEY, raw, NOW]);
  const page = await ctx.newPage();
  page.setDefaultTimeout(30000);
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(`${URL_BASE}/club-manager`, { waitUntil: 'domcontentloaded' });
  const btn = page.locator('button', { hasText: 'Resume Career' }).first();
  await btn.waitFor({ timeout: 45000 });
  await btn.click();
  await page.locator('[data-cm-hub]').waitFor({ timeout: 60000 });
  await page.waitForTimeout(700);
  return { ctx, page, errors };
}
const overflow = page => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
for (const [label, size] of [['390', { width: 390, height: 844 }], ['1280', { width: 1280, height: 900 }]]) {
  for (const motion of ['reduce', 'no-preference']) {
    const tag = `${label}-${motion === 'reduce' ? 'rm' : 'anim'}`;
    { /* OLD save: the board, then the squad. */
      const { ctx, page, errors } = await resume(OLD, size, motion);
      const tile = page.locator('button', { hasText: 'patience' }).first();
      const tileText = await tile.textContent().catch(() => null);
      await tile.click().catch(() => {});
      await page.waitForTimeout(900);
      const asks = await page.locator('text=/players? from/').evaluateAll(els => els.map(e => (e.closest('div')?.parentElement?.textContent ?? e.textContent ?? '').replace(/\s+/g, ' ').slice(0, 200)));
      console.log(`${tag} OLD board tile "${tileText?.replace(/\s+/g, ' ')}"; country ask rows: ${JSON.stringify(asks)}`);
      await page.locator("text=/players? from/").first().evaluate(e => e.scrollIntoView({ block: "center" })).catch(() => {}); await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(OUT, `old-board-${tag}.png`), fullPage: false });
      await page.getByRole('tab', { name: 'Squad', exact: true }).click();
      await page.locator('[data-cm-squad-row]').first().waitFor({ timeout: 30000 });
      await page.waitForTimeout(600);
      const rows = await page.locator('[data-cm-squad-row]').evaluateAll(list => list.map(r => ({ t: (r.textContent ?? '').replace(/\s+/g, ' ').slice(0, 60), f: r.querySelector('img[alt]')?.getAttribute('alt') ?? null, made: (r.textContent ?? '').includes('MADE UP'), italic: !!r.querySelector('.italic') })));
      const flagged = rows.filter(r => r.f).length, made = rows.filter(r => r.made), madeFlag = made.filter(r => r.f).length, italic = rows.filter(r => r.italic);
      console.log(`${tag} OLD squad: ${rows.length} rows, ${flagged} with a flag; MADE UP ${madeFlag}/${made.length} flagged; italic (youth) ${italic.filter(r => r.f).length}/${italic.length} flagged; no flag: ${JSON.stringify(rows.filter(r => !r.f).map(r => r.t).slice(0, 6))}; x overflow ${await overflow(page)}`);
      console.log(`${tag} OLD squad italic rows: ${JSON.stringify(italic)}`);
      await page.locator("[data-cm-squad-row]").first().evaluate(e => e.scrollIntoView({ block: "start" })); await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(OUT, `old-squad-${tag}.png`), fullPage: false });
      await page.locator("[data-cm-squad-row]").nth(12).evaluate(e => e.scrollIntoView({ block: "start" })).catch(() => {}); await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(OUT, `old-squad2-${tag}.png`), fullPage: false });
      console.log(`${tag} OLD page errors: ${errors.length}${errors.length ? ` ${errors[0].slice(0, 160)}` : ''}`);
      await ctx.close();
    }
    { /* NEW save: the market filtered to the target's country. */
      const { ctx, page, errors } = await resume(NEW, size, motion);
      await page.getByRole('tab', { name: 'Squad', exact: true }).click();
      await page.locator('[data-cm-squad-row]').first().waitFor({ timeout: 30000 });
      const boughtRow = page.locator('[data-cm-squad-row]', { hasText: abroad.name }).first();
      const br = await boughtRow.evaluate(r => ({ t: (r.textContent ?? '').replace(/\s+/g, ' ').slice(0, 80), f: r.querySelector('img[alt]')?.getAttribute('alt') ?? null, w: r.scrollWidth - r.clientWidth })).catch(() => null);
      console.log(`${tag} NEW squad bought row: ${JSON.stringify(br)}`);
      await boughtRow.evaluate(e => e.scrollIntoView({ block: 'center' })).catch(() => {}); await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(OUT, `new-squad-${tag}.png`), fullPage: false });
      await page.getByRole('tab', { name: 'Market', exact: true }).click();
      const nat = page.locator('select[aria-label="Nationality"]');
      await nat.waitFor({ timeout: 30000 });
      if (target) await nat.selectOption(target.nation).catch(e => console.log(`${tag} select failed ${String(e).slice(0, 80)}`));
      await page.waitForTimeout(800);
      const listed = await page.locator('text=MADE UP').count();
      console.log(`${tag} NEW market filtered to ${target?.nation}: MADE UP marks on screen ${listed}; x overflow ${await overflow(page)}; page errors ${errors.length}`);
      await page.locator("text=MADE UP").first().evaluate(e => e.scrollIntoView({ block: "center" })).catch(() => {}); await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(OUT, `new-market-${tag}.png`), fullPage: false });
      await ctx.close();
    }
  }
}
await browser.close();
console.log('review-walk: done');
