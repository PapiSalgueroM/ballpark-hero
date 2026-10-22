/* Round 1520, the walk: made up men show a country on the built site, beside their MADE UP mark, and the transfer
 * screen's nationality filter finds them under it.
 *
 * WHAT IT DOES. Builds a save with the engine itself (Everton, one season played on a fixed stream, the summer rolled,
 * then one made up man from abroad bought off the market), plants it the way a returning player's browser holds it,
 * presses Resume Career, and then at 390 by 844 and at 1280 by 900:
 *   (a) Squad: every row carrying the MADE UP mark shows a flag, the bought man's is his country's, and a youth kid
 *       (no mark, the italic name) shows one too. A picture.
 *   (b) Market: picks a made up man on the market, sets Nationality to his country and types his name: his row is
 *       there, with the MADE UP mark and his country's flag. The page does not jump while typing. A picture.
 *   (c) no page error. Every request off the served origin is aborted (Supabase among them).
 * CONTROL: point BASE at a build whose shownNation reads the verified map only (a made up man shows nothing): the
 * walk must go red (exit 1). Exit 0 green, 1 red, 2 could not run.
 *
 *   BASE=http://localhost:4173 node scripts/playCmMadeUpNations.mjs
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import pw from './lib/playwrightLoader.mjs';

const { chromium } = pw;
const ROOT = process.cwd();
const URL_BASE = (process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173').replace(/\/$/, '');
const OUT = process.env.RC_OUT ? path.join(process.env.RC_OUT, '1520') : path.join('.tmp-fx', '1520');
const SAVE_KEY = 'dukb-club-manager-save';
const NOW = Date.UTC(2026, 9, 21, 16, 0, 0);
const cannot = why => { console.log(`playCmMadeUpNations: cannot run: ${why}`); process.exit(2); };
fs.mkdirSync(OUT, { recursive: true });
const fails = [];
const fail = msg => { fails.push(msg); console.log(`  FAIL  ${msg}`); };
const pass = msg => console.log(`  PASS  ${msg}`);
const check = (ok, msg) => (ok ? pass(msg) : fail(msg));

/* ---- the save, from the engine ---- */
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'cmnat-walk-'));
fs.writeFileSync(path.join(work, 'entry.ts'), `export * as cm from ${JSON.stringify(path.join(ROOT, 'src/lib/clubManager.ts').split(path.sep).join('/'))};\n`);
await build({ entryPoints: [path.join(work, 'entry.ts')], bundle: true, platform: 'node', format: 'cjs', outfile: path.join(work, 'bundle.cjs'),
  logLevel: 'silent', alias: { '@': path.join(ROOT, 'src') }, nodePaths: [path.join(ROOT, 'node_modules')] });
const store = new Map();
globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() };
Date.now = () => NOW;
let a = 1520;
Math.random = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const { cm } = createRequire(import.meta.url)(path.join(work, 'bundle.cjs'));
let s = cm.startCareer('Everton');
for (let g = 0; g < 160; g += 1) { const r = cm.playNextEntry(s, { skipHalftime: true }); s = r.state; if (r.kind === 'seasonOver' || s.sacked) break; }
s = cm.startNextSeason(cm.finishSeason(s).state);
s = { ...s, budget: Math.max(s.budget, 300) };
const home = cm.careerPlace(s).home;
const made = cm.buildMarket(s).filter(l => l.generated && l.nation).sort((x, y) => x.price - y.price);
const abroad = made.find(l => l.nation !== home);
if (!abroad) cannot('no made up man from abroad on the market a year on');
s = cm.buyPlayer(s, abroad) ?? cannot(`the engine would not sell ${abroad.name}`);
const target = cm.buildMarket(s).filter(l => l.generated && l.nation && l.name !== abroad.name).sort((x, y) => x.price - y.price)[0];
if (!target) cannot('no made up man left on the market to look for');
cm.saveCareer(s);
const RAW = store.get(SAVE_KEY) ?? JSON.stringify(s);
const youth = s.squad.find(p => p.isYouth && p.nation);
console.log(`save: ${s.clubName} season ${s.season}; bought ${abroad.name} (${abroad.nation}); looking for ${target.name} (${target.nation}) at ${target.club}; youth ${youth?.name} (${youth?.nation})`);

/* ---- the browser ---- */
const browser = await chromium.launch();
async function resume(size) {
  const origin = new URL(URL_BASE).origin;
  const ctx = await browser.newContext({ viewport: size, deviceScaleFactor: 1, reducedMotion: 'reduce', serviceWorkers: 'block' });
  await ctx.route(/supabase\.co/, r => r.abort());
  await ctx.route('**/*', r => (new URL(r.request().url()).origin === origin ? r.continue() : r.abort()));
  await ctx.addInitScript(([k, v, now]) => {
    try { localStorage.setItem('cookie-consent', 'essential'); if (!localStorage.getItem(k)) localStorage.setItem(k, v); } catch { /* storage blocked */ }
    Date.now = () => now;
  }, [SAVE_KEY, RAW, NOW]);
  const page = await ctx.newPage();
  page.setDefaultTimeout(30000);
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(`${URL_BASE}/club-manager`, { waitUntil: 'domcontentloaded' });
  const slot = page.locator('[data-testid="cm-slot-1"]').getByRole('button', { name: 'Resume Career', exact: true });
  const any = page.locator('button', { hasText: 'Resume Career' }).first();
  await (await slot.count() ? slot : any).waitFor({ timeout: 45000 }).catch(() => {});
  await ((await slot.count()) ? slot : any).click({ timeout: 45000 });
  await page.locator('[data-cm-hub]').waitFor({ timeout: 60000 });
  await page.waitForTimeout(500);
  return { ctx, page, errors };
}

for (const [label, size] of [['390', { width: 390, height: 844 }], ['1280', { width: 1280, height: 900 }]]) {
  console.log(`${label}: ${size.width} by ${size.height}`);
  const { ctx, page, errors } = await resume(size);
  /* (a) Squad. */
  await page.getByRole('tab', { name: 'Squad', exact: true }).click();
  await page.locator('[data-cm-squad-row]').first().waitFor({ timeout: 30000 });
  const rows = await page.locator('[data-cm-squad-row]').evaluateAll(list => list.map(r => ({
    /* England is drawn inline (FlagImg's INLINE_FLAGS: flagcdn's copy was blank), an svg with no alt, so it is read
       by its drawing; since the review's fix a youth pad at an English club is English. */
    text: r.textContent ?? '', flag: r.querySelector('img[alt]')?.getAttribute('alt')
      ?? (r.querySelector('svg[viewBox="0 0 60 36"] rect[fill="#CE1124"]') ? 'England' : null),
    italic: !!r.querySelector('.italic'),
  })));
  const marked = rows.filter(r => r.text.includes('MADE UP'));
  check(marked.length >= 1 && marked.every(r => r.flag), `${label} squad: ${marked.filter(r => r.flag).length} of ${marked.length} MADE UP rows show a flag`);
  const mine = rows.find(r => r.text.includes(abroad.name));
  check(mine?.flag === abroad.nation, `${label} squad: ${abroad.name} shows ${mine?.flag ?? 'no flag'} (bought as ${abroad.nation})`);
  const kid = youth && rows.find(r => r.text.includes(youth.name));
  check(!!kid && kid.flag === youth.nation, `${label} squad: youth kid ${youth?.name} shows ${kid?.flag ?? 'no flag'} (${youth?.nation})`);
  await page.screenshot({ path: path.join(OUT, `squad-${label}.png`), fullPage: false });
  /* (b) Market. */
  await page.getByRole('tab', { name: 'Market', exact: true }).click();
  const nat = page.locator('select[aria-label="Nationality"]');
  await nat.waitFor({ timeout: 30000 });
  const offered = await nat.locator('option').evaluateAll(os => os.map(o => o.value));
  check(offered.includes(target.nation), `${label} market: the nationality filter offers ${target.nation}`);
  if (offered.includes(target.nation)) await nat.selectOption(target.nation);
  const box = page.locator('input[aria-label="Search player or club"]');
  await box.scrollIntoViewIfNeeded();
  const before = await page.evaluate(() => window.scrollY);
  await box.fill(target.name);
  await page.waitForTimeout(600);
  const after = await page.evaluate(() => window.scrollY);
  check(after === before, `${label} market: the page held still while typing (${before} then ${after})`);
  const hit = await page.locator('span', { hasText: target.name }).first().evaluate(el => {
    const row = el.closest('div.flex.items-center.gap-2') ?? el.parentElement;
    return { text: row?.textContent ?? '', flag: row?.querySelector('img[alt]')?.getAttribute('alt')
      ?? (row?.querySelector('svg[viewBox="0 0 60 36"] rect[fill="#CE1124"]') ? 'England' : null) };
  }).catch(() => null);
  check(!!hit && hit.text.includes('MADE UP') && hit.flag === target.nation,
    `${label} market: filtered to ${target.nation}, ${target.name} is listed${hit ? ` with ${hit.flag ?? 'no flag'}${hit.text.includes('MADE UP') ? ' and the MADE UP mark' : ', no MADE UP mark'}` : ': not found'}`);
  await page.screenshot({ path: path.join(OUT, `market-${label}.png`), fullPage: false });
  check(!errors.length, `${label}: no page error${errors.length ? ` (${errors[0].slice(0, 120)})` : ''}`);
  await ctx.close();
}
await browser.close();
console.log(fails.length ? `playCmMadeUpNations: RED, ${fails.length} failure(s)` : 'playCmMadeUpNations: green. Made up men wear their country on the squad and the market.');
process.exit(fails.length ? 1 : 0);
