/* Round 1568 probe (never committed): Club Manager's live match under the site bar, measured.
   For each size: the bar's rect, Back, help, the score and each control: rect, elementFromPoint at the centre,
   and the stacking chain of Back up to the body. Then Back is tapped and the boxes are counted.
   Run from the repo root on a #!serve runner: node .rc/x/probeCm.mjs   (BASE is the served build) */
import fs from 'node:fs';
import path from 'node:path';
import pw from '../../scripts/lib/playwrightLoader.mjs';
import { answerConsent } from '../../scripts/lib/answerConsent.mjs';

const { chromium } = pw;
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || '.tmp-fx/probe-out';
fs.mkdirSync(OUT, { recursive: true });
const KEY = 'dukb-club-manager-save';
const SIZES = [[320, 568], [390, 844], [768, 1024], [1280, 900], [844, 390]];

const tap = async (page, rx) => {
  const b = page.getByRole('button', { name: rx }).first();
  if (await b.count().catch(() => 0) === 0) return false;
  return b.click({ timeout: 4000 }).then(() => true).catch(() => false);
};
const tapText = async (page, rx) => {
  const b = page.locator('button:visible').filter({ hasText: rx }).first();
  if (await b.count().catch(() => 0) === 0) return false;
  return b.click({ timeout: 4000 }).then(() => true).catch(() => false);
};

async function toLive(page) {
  await page.goto(BASE + '/club-manager', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1000);
  await answerConsent(page, { wait: 1200 });
  for (let i = 0; i < 3; i++) {
    if (await page.locator('[role="dialog"][data-state="open"]').count().catch(() => 0) === 0) break;
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(250);
  }
  await tap(page, /2026-27/i);
  await page.getByRole('button', { name: /England/i }).first().waitFor({ timeout: 8000 }).catch(() => {});
  await tap(page, /England/i);
  await page.getByRole('button', { name: /Premier League/i }).first().waitFor({ timeout: 8000 }).catch(() => {});
  await tap(page, /Premier League/i);
  const club = page.locator('button').filter({ hasText: /Everton|Fulham|Brentford|Crystal Palace|Wolves|Brighton/ }).first();
  await club.waitFor({ timeout: 8000 }).catch(() => {});
  await club.click({ timeout: 5000 }).catch(() => {});
  await tap(page, /take the job|confirm|start/i);
  await page.getByText(/who is in the dugout/i).first().waitFor({ timeout: 8000 }).catch(() => {});
  await tap(page, /skip: just manage/i);
  await page.waitForTimeout(800);
  await page.getByRole('tab', { name: /^Home$/i }).first().click({ timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(400);
  for (let i = 0; i < 8; i++) {
    if (await page.locator('[data-cm-live-stage]').count().catch(() => 0)) return true;
    const way = page.locator('button:visible[data-cm-way="live"]').first();
    if (await way.count().catch(() => 0)) await way.click({ timeout: 4000 }).catch(() => {});
    else await tapText(page, /Play Live|Resume match/i);
    await page.waitForTimeout(900);
  }
  return (await page.locator('[data-cm-live-stage]').count().catch(() => 0)) > 0;
}

const measure = page => page.evaluate(() => {
  const r4 = el => { if (!el) return null; const r = el.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)]; };
  const who = el => { if (!el) return 'null'; const a = el.getAttribute && (el.getAttribute('aria-label') || ''); const chrome = el.closest && el.closest('[data-site-chrome]') ? ' IN[data-site-chrome]' : ''; return `${el.tagName.toLowerCase()}${a ? `[${a.slice(0, 30)}]` : ''}${chrome}`; };
  const hit = el => { if (!el) return null; const r = el.getBoundingClientRect(); const at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { self: !!at && (at === el || el.contains(at)), at: who(at) }; };
  const chain = el => { const out = []; for (let n = el; n && n !== document.documentElement; n = n.parentElement) { const cs = getComputedStyle(n); const bits = []; if (cs.position !== 'static') bits.push(cs.position); if (cs.zIndex !== 'auto') bits.push('z' + cs.zIndex); if (cs.transform !== 'none') bits.push('transform'); if (cs.opacity !== '1') bits.push('op' + cs.opacity); if (cs.isolation === 'isolate') bits.push('isolate'); if (cs.filter !== 'none') bits.push('filter'); if (cs.willChange !== 'auto') bits.push('wc:' + cs.willChange); if (cs.contain !== 'none') bits.push('contain:' + cs.contain); if (bits.length) out.push(`${n.tagName.toLowerCase()}.${String(n.className || '').split(' ').slice(0, 2).join('.')}(${bits.join(',')})`); } return out; };
  const bar = document.querySelector('[data-site-chrome]');
  const stage = document.querySelector('[data-cm-live-stagebox]');
  const back = document.querySelector('button[aria-label="Back to the club page"]');
  const help = document.querySelector('button[aria-label="How watching a match works"]');
  const score = document.querySelector('[data-cm-live-score]');
  const root = document.querySelector('[data-cm-live-stage]');
  const pause = root ? root.querySelector('button[aria-label="Pause"], button[aria-label="Resume"]') : null;
  const ctl = document.querySelector('[data-cm-live-controls]') || (pause ? pause.parentElement : null);
  const controls = ctl ? [...ctl.querySelectorAll('button')].map(b => ({ n: (b.getAttribute('aria-label') || b.textContent || '').trim().slice(0, 16), r: r4(b), hit: hit(b) })) : [];
  const barCs = bar ? getComputedStyle(bar) : null;
  return {
    win: [innerWidth, innerHeight], bar: r4(bar), barZ: barCs ? `${barCs.position} z${barCs.zIndex}` : null, barChain: bar ? chain(bar) : [],
    stage: r4(stage), stageZ: stage ? getComputedStyle(stage).zIndex : null,
    back: { r: r4(back), hit: hit(back) }, help: { r: r4(help), hit: hit(help) }, score: { r: r4(score), hit: hit(score) },
    controls, backChain: back ? chain(back) : [],
    cookie: (() => { const c = [...document.querySelectorAll('[class*="z-[60]"]')]; return c.map(r4); })(),
  };
});

const browser = await chromium.launch();
const rows = [];
for (const [w, h] of SIZES) {
  const context = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await context.newPage();
  await page.route(/supabase\.co/, r => r.abort());
  const ok = await toLive(page).catch(e => { console.log(`${w}x${h}: toLive threw ${e.message}`); return false; });
  await page.waitForTimeout(1200);
  const m = ok ? await measure(page) : null;
  if (w === 390 || w === 1280) await page.screenshot({ path: path.join(OUT, `cm-${w}.png`) }).catch(() => {});
  let after = null;
  if (ok) {
    const clicked = await page.getByRole('button', { name: 'Back to the club page' }).first().click({ timeout: 3000 }).then(() => 'clicked').catch(e => 'click failed: ' + String(e.message).split('\n').find(l => /intercepts|Timeout/.test(l))?.trim().slice(0, 160));
    await page.waitForTimeout(400);
    after = { clicked, ...(await page.evaluate(() => ({ stage: document.querySelectorAll('[data-cm-live-stagebox]').length, card: document.querySelectorAll('[data-cm-live-compact]').length, lock: document.body.style.overflow, menuOpen: !!document.querySelector('[data-site-menu-panel], [aria-label*="Site menu" i][role="dialog"]') }))) };
  }
  rows.push({ size: `${w}x${h}`, live: ok, m, after });
  console.log(`== ${w}x${h} live=${ok}`);
  if (m) {
    console.log(`  bar ${JSON.stringify(m.bar)} ${m.barZ} | stage ${JSON.stringify(m.stage)} z${m.stageZ} | cookie ${JSON.stringify(m.cookie)}`);
    for (const k of ['back', 'help', 'score']) console.log(`  ${k} ${JSON.stringify(m[k].r)} self=${m[k].hit && m[k].hit.self} at=${m[k].hit && m[k].hit.at}`);
    console.log(`  controls: ${m.controls.map(c => `${c.n}:${c.hit && c.hit.self ? 'ok' : 'COVERED by ' + (c.hit && c.hit.at)}`).join(' | ')}`);
    console.log(`  back chain: ${m.backChain.join(' > ')}`);
    console.log(`  bar chain: ${m.barChain.join(' > ')}`);
  }
  if (after) console.log(`  after Back: ${JSON.stringify(after)}`);
  await context.close();
}
fs.writeFileSync(path.join(OUT, 'cm-measure.json'), JSON.stringify(rows, null, 1));
await browser.close();
console.log(`probeCm: done, ${rows.filter(r => r.live).length} of ${rows.length} sizes reached the stage`);
