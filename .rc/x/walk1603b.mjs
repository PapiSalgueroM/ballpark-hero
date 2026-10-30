/* Reviewer walk for Round 1603 (runner only, never committed). A served dist (BASE) plays a real deciding second
   leg of a seeded career, the first leg planted (a fictional fixture), on Quick Sim and on the watched match, at
   390x844 and 1280x900 with reduced motion on and off, and photographs the card, the card in full and the hub after
   Continue. Cases: through (first leg planted 4-0, want THROUGH over a night lost or drawn), out (0-4, want OUT
   over a night won or drawn), pens (1-0, want a (PENS) headline). Exit 0 green, 1 red, 2 could not run. */
import '../../scripts/lib/offlineTransport.cjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import pw from '../../scripts/lib/playwrightLoader.mjs';
import { answerConsent } from '../../scripts/lib/answerConsent.mjs';

const ROOT = process.cwd();
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || path.join(ROOT, '.tmp-fx', 'walk1603');
fs.mkdirSync(OUT, { recursive: true });
const KEY = 'dukb-club-manager-save';
const cannot = why => { console.log(`walk1603 could not run: ${why}`); process.exit(2); };
function withSeed(seed, fn) {
  const previous = Math.random; let a = seed >>> 0;
  Math.random = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  try { return fn(); } finally { Math.random = previous; }
}
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'walk1603-'));
fs.writeFileSync(path.join(work, 'entry.ts'), "export * as cm from '@/lib/clubManager';\n");
await build({ entryPoints: [path.join(work, 'entry.ts')], bundle: true, platform: 'node', format: 'cjs', outfile: path.join(work, 'e.cjs'), logLevel: 'silent', alias: { '@': path.join(ROOT, 'src') } });
const memory = new Map();
globalThis.localStorage = { getItem: k => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, String(v)), removeItem: k => memory.delete(k), clear: () => memory.clear() };
const { cm } = createRequire(import.meta.url)(path.join(work, 'e.cjs'));
await cm.ensureAllEraRosters();
let pre = null;
for (const [club, era, seed] of [['Liverpool', 'now', 7001], ['Manchester City', 'now', 7002], ['Chelsea', 'era2010', 7003], ['Real Madrid', 'now', 7004], ['Bayern Munich', 'era2015', 7005], ['Barcelona', 'era2015', 16040]]) {
  let s = withSeed(seed, () => cm.startCareer(club, era));
  for (let i = 0; i < 160; i++) {
    const e = s.calendar[s.week];
    if (e && e.type === 'uclKo' && e.uclLeg === 2 && s.uclKoRound === e.uclRound) { pre = s; break; }
    const r = withSeed(seed + 1 + i, () => cm.playNextEntry(s, { skipHalftime: true }));
    s = r.state;
    if (r.kind === 'seasonOver' || s.sacked || s.uclKoRound === 'out') break;
  }
  console.log(`${club} ${era}: ${pre ? `deciding leg at week ${pre.week}` : 'none'}`);
  if (pre) break;
}
if (!pre) cannot('no deciding leg');
const round = pre.calendar[pre.week].uclRound;
function plant(mine, theirs) {
  const s = structuredClone(pre);
  const tie = s.uclBracket.find(t => t.round === round && t.mine);
  if (!tie || !tie.leg1) cannot('no first leg in the bracket');
  tie.leg1 = tie.home === s.clubName ? { homeGoals: mine, awayGoals: theirs } : { homeGoals: theirs, awayGoals: mine };
  return s;
}
const CASES = [
  { kind: 'through', save: plant(4, 0), ok: g => g.head?.startsWith('THROUGH') && /^(Lost|Drew) /.test(g.night ?? '') },
  { kind: 'out', save: plant(0, 4), ok: g => g.head?.startsWith('OUT') && /^(Won|Drew) /.test(g.night ?? '') },
  { kind: 'pens', save: plant(1, 1), ok: g => /\(PENS\)$/.test(g.head ?? '') && !!g.night },
  { kind: 'pensLost', save: plant(2, 0), ok: g => /\(PENS\)$/.test(g.head ?? '') && /^Lost /.test(g.night ?? '') },
];
console.log(`save: ${pre.clubName} ${pre.eraId} week ${pre.week}, ${round} second leg`);
const results = [];
const check = (name, ok, detail = '') => { results.push(!!ok); console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ` [${detail}]` : ''}`); };
const browser = await pw.chromium.launch({ headless: true });
async function attempt({ width, height, reduced, way }, save, seed) {
  const touch = width < 1000;
  const context = await browser.newContext({ viewport: { width, height }, isMobile: touch, hasTouch: touch, reducedMotion: reduced ? 'reduce' : 'no-preference', serviceWorkers: 'block',
    storageState: { cookies: [], origins: [{ origin: new URL(BASE).origin, localStorage: [{ name: KEY, value: JSON.stringify(save) }, { name: 'cookie-consent', value: 'essential' }] }] } });
  await context.addInitScript(sd => { let a = sd >>> 0; Math.random = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }, seed);
  const page = await context.newPage();
  await page.route(/supabase\.co/, r => r.abort());
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on('pageerror', e => errors.push(String(e?.message ?? e)));
  await page.goto(`${BASE}/club-manager`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  await answerConsent(page, { wait: 1200 });
  const btn = page.locator(`button:visible[data-cm-way="${way}"]`).first();
  for (let i = 0; i < 12 && !(await btn.count().catch(() => 0)); i++) {
    const resume = page.getByRole('button', { name: /Resume Career|Continue career|Resume/i }).first();
    if (await resume.count().catch(() => 0)) await resume.click({ timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(800);
  }
  if (!(await btn.count().catch(() => 0))) { await context.close(); return { error: `no ${way} button` }; }
  await btn.click();
  if (way === 'live') {
    const vis = name => page.locator('button:visible').filter({ hasText: new RegExp(`^\\s*${name}\\s*$`) }).first();
    const deadline = Date.now() + 120000;
    while (Date.now() < deadline) {
      if (await page.locator('[data-cm-timeline]').count()) break;
      for (const n of ['Full report', 'Second half', 'Skip']) {
        const b = vis(n);
        if (await b.count()) { await b.click({ timeout: 4000 }).catch(() => {}); await page.waitForTimeout(700); break; }
      }
      await page.waitForTimeout(500);
    }
  }
  const h2 = page.locator('h2', { hasText: /^(THROUGH|OUT|VICTORY|DEFEAT|DRAW)/ }).first();
  await h2.waitFor({ state: 'attached', timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(reduced ? 800 : 2500);
  const got = await page.evaluate(() => {
    const h = [...document.querySelectorAll('h2')].find(x => /^(THROUGH|OUT|VICTORY|DEFEAT|DRAW)/.test(x.textContent ?? ''));
    const card = h?.parentElement;
    const lines = card ? [...card.children].map(c => (c.textContent ?? '').trim()).filter(Boolean).slice(0, 12) : [];
    const night = document.querySelector('[data-cm-night-line]');
    const box = el => { if (!el) return null; const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height, right: b.right }; };
    const over = [];
    if (card) { const kids = [...card.children].filter(k => k.getBoundingClientRect().height > 0); for (let i = 1; i < kids.length; i++) { const a = kids[i - 1].getBoundingClientRect(), b = kids[i].getBoundingClientRect(); if (b.top < a.bottom - 1 && getComputedStyle(kids[i]).position !== 'absolute' && getComputedStyle(kids[i - 1]).position !== 'absolute') over.push(`${i - 1}/${i}`); } }
    return { head: h?.textContent ?? null, tone: h?.className ?? '', cardClass: card?.className ?? '', night: night?.textContent ?? null, lines, over,
      card: box(card), nightBox: box(night), wide: document.documentElement.scrollWidth > window.innerWidth,
      cardAnim: card ? getComputedStyle(card).animationName : null };
  });
  return { ...got, errors, page, context };
}

const PROFILES = [
  { width: 390, height: 844, reduced: false, way: 'quick', hub: true, tries: 30 }, { width: 390, height: 844, reduced: true, way: 'quick', only: ['through', 'out', 'pens'], tries: 8 },
  { width: 1280, height: 900, reduced: false, way: 'quick', hub: true, tries: 30 }, { width: 1280, height: 900, reduced: true, way: 'quick', only: ['through', 'out'], tries: 8 },
  { width: 390, height: 844, reduced: false, way: 'live', only: ['through', 'out'], tries: 6 },
  { width: 1280, height: 900, reduced: true, way: 'live', only: ['out'], tries: 4 },
];
const known = {};
const summary = [];
for (const p of PROFILES) {
  const id0 = `${p.way}-${p.width}${p.reduced ? '-rm' : ''}`;
  for (const c of CASES) {
    if (p.only && !p.only.includes(c.kind)) continue;
    const id = `${c.kind}-${id0}`;
    const seeds = [...(known[`${c.kind}-${p.way}`] ? [known[`${c.kind}-${p.way}`]] : []), ...Array.from({ length: p.tries ?? 16 }, (_, k) => 1603100 + k * 131)];
    let found = null, tried = 0, lastHead = '';
    for (const seed of seeds) {
      tried += 1;
      const a = await attempt(p, c.save, seed);
      if (a.error) { check(`${id}: the page plays the leg`, false, a.error); break; }
      lastHead = `${a.head} / ${a.night}`;
      if (c.ok(a)) { found = a; known[`${c.kind}-${p.way}`] = seed; break; }
      if (!a.head) await a.page.screenshot({ path: path.join(OUT, `${id}-nohead-${tried}.jpg`), type: "jpeg", quality: 50 }).catch(() => {});
      await a.context.close();
    }
    if (!found) { check(`${id}: a card for the case`, false, `${tried} tries, last ${lastHead}`); continue; }
    const f = found;
    await f.page.screenshot({ path: path.join(OUT, `${id}.jpg`), type: "jpeg", quality: 60 }).catch(() => {});
    await f.page.screenshot({ path: path.join(OUT, `${id}-full.jpg`), type: "jpeg", quality: 55, fullPage: !p.reduced }).catch(() => {});
    const through = f.head.startsWith('THROUGH');
    summary.push(`${id}: "${f.head}" | ${f.lines.slice(0, 7).join(' | ')}`);
    console.log(`   ${id}: seed try ${tried}: "${f.head}" lines: ${f.lines.slice(0, 8).join(' | ')}`);
    check(`${id}: headline tone`, f.tone.includes(through ? 'text-correct' : 'text-destructive'), f.tone.split(' ').filter(x => x.startsWith('text-')).join(' '));
    check(`${id}: night line inside the card`, !!f.nightBox && f.nightBox.h > 0 && f.nightBox.x >= f.card.x - 1 && f.nightBox.right <= f.card.right + 1);
    check(`${id}: no sideways scroll`, !f.wide);
    check(`${id}: no overlapping rows in the card`, f.over.length === 0, f.over.join(','));
    check(`${id}: no page error`, f.errors.length === 0, f.errors.slice(0, 2).join(' | '));
    if (p.reduced) check(`${id}: reduced motion, the card does not pulse or shake`, f.cardAnim === 'none', f.cardAnim);
    else check(`${id}: the card ${through ? 'pulses' : 'shakes'}`, f.cardAnim === (through ? 'cmWinPulse' : 'cmLossShake'), f.cardAnim);
    if (p.hub) {
      const cont = f.page.locator('button:visible').filter({ hasText: /^\s*Continue/ }).first();
      if (await cont.count()) {
        await cont.click().catch(() => {});
        await f.page.waitForTimeout(2500);
        const meters = await f.page.evaluate(() => [...document.querySelectorAll('[data-cm-meter]')].map(m => `${m.getAttribute('data-cm-meter')}=${m.getAttribute('data-cm-value')} ${m.textContent.trim().slice(0, 40)}`));
        console.log(`   ${id} hub meters: ${meters.join(' ; ')}`);
        await f.page.screenshot({ path: path.join(OUT, `${id}-hub.jpg`), type: "jpeg", quality: 60 }).catch(() => {});
        await f.page.screenshot({ path: path.join(OUT, `${id}-hub-full.jpg`), type: "jpeg", quality: 50, fullPage: true }).catch(() => {});
      } else check(`${id}: a Continue button`, false);
    }
    await f.context.close();
  }
}
await browser.close();
fs.writeFileSync(path.join(OUT, 'summary.txt'), summary.join('\n') + '\n');
const red = results.filter(r => !r).length;
console.log(`walk1603 ${red ? 'RED' : 'GREEN'}: ${results.length - red} of ${results.length} checks green`);
process.exit(red ? 1 : 0);
