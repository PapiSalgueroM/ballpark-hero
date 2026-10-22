/* Round 1524 run reviewer's probe (sent as .rc/x/probeInvisibleBuy.mjs on a served build, never committed).
   Question: can a player buy a club whose tile has not appeared yet? The clubs for sale rise in with cm-rise
   (opacity 0 through a delay of 0.6 s plus 0.22 s a tile), not cm-rise-gated (hidden, so unclickable, through
   its delay). Motion on, 390 by 844 (touch) and 1280 by 900: open the list, and at once read every tile's
   opacity and what sits under its centre, shoot the screen, then tap the centre of the last tile. */
import { build } from 'esbuild';
import { chromium } from 'playwright';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || path.join(ROOT, '.tmp-fx', `probebuy-${Date.now()}`);
fs.mkdirSync(OUT, { recursive: true });
const BLOCK = /supabase\.co|googlesyndication|doubleclick|google-analytics|googletagmanager|adservice|fundingchoices/;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'probebuy-'));
const R = p => path.join(ROOT, p).replaceAll('\\', '/');
fs.writeFileSync(path.join(tmp, 'e.mjs'), `globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
export * as E from '${R('src/lib/soccerCareerEngine.ts')}';
export * as S from '${R('src/lib/soccerCareerSave.ts')}';
`);
await build({ entryPoints: [path.join(tmp, 'e.mjs')], outfile: path.join(tmp, 'b.mjs'), bundle: true, format: 'esm', platform: 'node', logLevel: 'error', alias: { '@': path.join(ROOT, 'src') },
  loader: { '.css': 'empty', '.png': 'empty', '.svg': 'empty', '.jpg': 'empty', '.webp': 'empty' } });
const { E, S } = await import(pathToFileURL(path.join(tmp, 'b.mjs')).href);
const mulberry32 = a => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const REAL = Math.random;
Math.random = mulberry32(2401);
const flat = o => ({ pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o });
let c = E.initCareer('Run Owner', 'Spain', 'CM', '2020s', flat(70), 70, 2020, E.FALLBACK_CLUBS, null, 90);
for (let i = 0; i < 16 && !c.retired; i += 1) {
  c = c.phase === 'youth' ? E.advanceYouthYear(c, E.FALLBACK_CLUBS) : c.phase === 'retirement_suggestion' ? E.acceptRetirementSuggestion(c) : E.advanceProSeason(c, E.FALLBACK_CLUBS);
  if (c.transferSituation) c = { ...c, transferSituation: null };
}
if (!c.retired) c = E.manualRetire(c);
Math.random = REAL;
const RAW = S.serializeSoccerCareerSave({ ...c, netWorth: 320 });

let bought = 0, runs = 0;
const browser = await chromium.launch();
for (const [w, h] of [[390, 844], [1280, 900]]) {
  runs += 1;
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: w < 768, hasTouch: w < 768, reducedMotion: 'no-preference' });
  await ctx.route(BLOCK, r => r.abort());
  const p = await ctx.newPage();
  await p.goto(BASE + '/robots.txt', { waitUntil: 'domcontentloaded' });
  await p.evaluate(r => { localStorage.clear(); localStorage.setItem('soccerCareerSave', r); }, RAW);
  await p.goto(BASE + '/soccer-career', { waitUntil: 'domcontentloaded' });
  await p.getByRole('button', { name: /^reject all$/i }).first().click({ timeout: 2500 }).catch(() => {});
  for (let i = 0; i < 4; i += 1) { if (await p.locator('[role="dialog"]:visible').count() === 0) break; await p.keyboard.press('Escape'); await p.waitForTimeout(300); }
  const buy = p.getByRole('button', { name: /Buy a Football Club/ });
  await buy.waitFor({ timeout: 30000 });
  await buy.evaluate(e => e.scrollIntoView({ block: 'center' }));
  await p.waitForTimeout(3000);
  const bb = await buy.boundingBox();
  const bx = bb.x + bb.width / 2, by = bb.y + bb.height / 2;
  const tapBuy = async () => { if (w < 768) await p.touchscreen.tap(bx, by); else await p.mouse.click(bx, by); };
  const d0 = Date.now();
  await tapBuy();
  const sale = p.locator('[data-testid="owner-club-sale"]');
  await sale.waitFor({ timeout: 20000 });
  const under = await p.evaluate(([x, y]) => { const el = document.elementFromPoint(x, y); const t = el && el.closest('[data-testid="owner-club-for-sale"]'); return t ? { name: (t.querySelector('div')?.textContent || '').trim(), op: Number(getComputedStyle(t).opacity) } : null; }, [bx, by]);
  console.log(`  ${w}x${h}: where "Buy a Football Club" was tapped there is now ${under ? `the tile of ${under.name}, opacity ${under.op.toFixed(2)}` : 'no tile'}`);
  await p.waitForTimeout(120);
  await p.screenshot({ path: path.join(OUT, `doubletap-${w}-before-second-tap.png`) });
  await tapBuy();
  const gap = Date.now() - d0;
  const ok2 = await p.locator('[data-testid="owner-panel"]').waitFor({ timeout: 8000 }).then(() => true).catch(() => false);
  const s2 = await p.evaluate(() => JSON.parse(localStorage.getItem('soccerCareerSave') || 'null'));
  console.log(`  ${w}x${h}: a second tap on the same spot ${gap}ms after the first: ${ok2 && s2?.ownerState ? `BOUGHT ${s2.ownerState.club} (Tier ${s2.ownerState.clubTier}) for €${320 - s2.netWorth}M without ever seeing it` : 'nothing bought'}`);
  if (ok2 && s2?.ownerState && under && under.op < 0.2) bought += 1;
  await p.screenshot({ path: path.join(OUT, `doubletap-${w}-after.png`) });
  await ctx.close();
  continue;
  const t0 = Date.now();
  const tiles = await sale.locator('[data-testid="owner-club-for-sale"]').evaluateAll(els => els.map(e => {
    const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const hit = document.elementFromPoint(x, y);
    return { name: (e.querySelector('div')?.textContent || '').trim(), op: Number(cs.opacity), vis: cs.visibility, pe: cs.pointerEvents, delay: cs.animationDelay, x, y, hitsTile: !!hit && e.contains(hit) };
  }));
  for (const t of tiles) console.log(`  ${w}x${h} +${Date.now() - t0}ms ${t.name}: opacity ${t.op.toFixed(2)}, visibility ${t.vis}, delay ${t.delay}, a tap at its centre lands on it: ${t.hitsTile}`);
  await p.screenshot({ path: path.join(OUT, `invisible-${w}-before-tap.png`) });
  const last = tiles[tiles.length - 1];
  const opNow = await sale.locator('[data-testid="owner-club-for-sale"]').last().evaluate(e => Number(getComputedStyle(e).opacity));
  if (w < 768) await p.touchscreen.tap(last.x, last.y); else await p.mouse.click(last.x, last.y);
  const tapAt = Date.now() - t0;
  const ok = await p.locator('[data-testid="owner-panel"]').waitFor({ timeout: 8000 }).then(() => true).catch(() => false);
  const s = await p.evaluate(() => JSON.parse(localStorage.getItem('soccerCareerSave') || 'null'));
  const club = s?.ownerState?.club;
  console.log(`  ${w}x${h}: tapped the last tile (${last.name}) at +${tapAt}ms while its opacity was ${opNow.toFixed(2)}: ${ok && club === last.name ? `BOUGHT ${club} for €${320 - s.netWorth}M, net worth now ${s.netWorth}` : `nothing bought (${club})`}`);
  if (ok && club === last.name && opNow < 0.2) bought += 1;
  await p.screenshot({ path: path.join(OUT, `invisible-${w}-after-tap.png`) });
  await ctx.close();
}
await browser.close();
console.log(`probeDoubleTap: ${bought} of ${runs} sizes bought an unseen club on a double tap of Buy a Football Club`);
process.exit(bought ? 1 : 0);
