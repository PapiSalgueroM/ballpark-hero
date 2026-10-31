// Reviewer walk 2 (rBVG-cm-bv) on the served dist (#!serve), every host but the page's own aborted.
//  (n) a new 2026-27 Everton career: the Market searched for Messi, Ronaldo and Modric, each row scrolled into view
//      and photographed at 390x844 and 1280x900 (walk 1 read the rows but its pictures stopped above them).
//  (o) an OLD save: an AC Milan career started and played 18 entries by the BASE engine (19911f815, before Rounds
//      1603, 1593 and 1600), opened in the head's page: the Squad tab's Modric row (the save's own 72) and the
//      Market's Messi row (the new 86, the round's stated design), at 390.
// Screenshots to $RC_OUT/rv2-*.png. Exit 0 green, 1 a finding, 2 could not run.
import fs from 'node:fs';
import path from 'node:path';
import { engineOf, tape } from '../../scripts/lib/worldUclFleet.mjs';
import { chromium } from '../../scripts/lib/playwrightLoader.mjs';
import { answerConsent } from '../../scripts/lib/answerConsent.mjs';

const ROOT = process.cwd();
const OUT = process.env.RC_OUT || path.join(ROOT, '.tmp-fx', 'rv2');
fs.mkdirSync(OUT, { recursive: true });
const URL0 = process.env.BASE || process.env.SWEEP_BASE || 'http://localhost:4173';
const ORIGIN = new URL(URL0).origin;
const cannot = why => { console.log(`rvWalk2 could not run: ${why}`); process.exit(2); };
let bad = 0;
const check = (c, msg) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${msg}`); if (!c) bad += 1; };
const opts = { skipHalftime: true, noCoach: true };
const saved = (M, s) => { M.store.clear(); if (!M.cm.saveCareer(s)) cannot('the engine refused to save'); return [...M.store.entries()]; };

const H = await (await engineOf(ROOT, 'head', {}, cannot)).fresh();
const nSave = saved(H, tape(0x1601, () => H.cm.startCareer('Everton')).value);
const B = await (await engineOf(ROOT, 'base', { base: '19911f815' }, cannot)).fresh();
let o = tape(0x1604, () => B.cm.startCareer('AC Milan')).value;
for (let i = 0; i < 18; i += 1) o = tape(0x16e0 + i, () => B.cm.playNextEntry(o, opts)).value.state;
const baseModric = o.squad.find(p => p.name.startsWith('Luka Modri'));
if (!baseModric) cannot('no Modric in the base AC Milan squad');
console.log(`(o) base AC Milan save at week ${o.week}: Modric ${baseModric.rating}, ${baseModric.age}y`);
const oSave = saved(B, o);

const browser = await chromium.launch({ headless: true });
async function open(pr, items) {
  const context = await browser.newContext({ viewport: { width: pr.width, height: pr.height }, isMobile: !!pr.touch, hasTouch: !!pr.touch, serviceWorkers: 'block',
    storageState: { cookies: [], origins: [{ origin: ORIGIN, localStorage: [...items.map(([name, value]) => ({ name, value })), { name: 'cookie-consent', value: 'essential' }] }] } });
  await context.route('**/*', route => (new URL(route.request().url()).origin === ORIGIN ? route.continue() : route.abort()));
  await context.routeWebSocket('**/*', socket => socket.close());
  const page = await context.newPage();
  await page.route(/supabase\.co/, r => r.abort());
  page.setDefaultTimeout(15000);
  page.errs = [];
  page.on('pageerror', e => page.errs.push(String(e?.message ?? e)));
  await page.goto(`${URL0}/club-manager`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await answerConsent(page, { wait: 600 }).catch(() => {});
  const tab = page.getByRole('tab', { name: /^Market$/ }).first();
  for (let i = 0; i < 14 && !(await tab.count().catch(() => 0)); i += 1) {
    const resume = page.getByRole('button', { name: /Resume Career|Continue career|Resume/i }).first();
    if (await resume.count().catch(() => 0)) await resume.click({ timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(700);
  }
  return { context, page, ok: (await tab.count().catch(() => 0)) > 0 };
}
const shot = (page, name) => page.screenshot({ path: path.join(OUT, `rv2-${name}.png`), fullPage: false }).catch(() => {});
async function marketRow(page, q, full) {
  await page.getByRole('tab', { name: /^Market$/ }).first().click();
  const box = page.getByPlaceholder('Search player or club…').first();
  await box.waitFor({ timeout: 20000 }).catch(() => {});
  if (!(await box.count().catch(() => 0))) return null;
  await box.fill(q);
  await page.waitForTimeout(600);
  return page.evaluate(nm => {
    for (const b of document.querySelectorAll('button')) {
      if (!/^(Talk ·|Cold)/.test((b.textContent || '').trim())) continue;
      const r = b.closest('div')?.parentElement;
      const text = ((r && r.innerText) || '').replace(/\s+/g, ' ');
      if (text.includes(nm)) { r.scrollIntoView({ block: 'center' }); const bx = r.getBoundingClientRect(); return { text, right: bx.right, h: bx.height }; }
    }
    return null;
  }, full);
}
const VETS = [['Messi', 'Lionel Messi', 86], ['Ronaldo', 'Cristiano Ronaldo', 86], ['Modri', 'Luka Modri', 80]];
for (const pr of [{ width: 390, height: 844, touch: true, tag: '390' }, { width: 1280, height: 900, tag: '1280' }]) {
  const { context, page, ok } = await open(pr, nSave);
  if (!ok) { await shot(page, `n-notab-${pr.tag}`); check(false, `(n) ${pr.tag}: the Market tab`); await context.close(); continue; }
  for (const [q, full, want] of VETS) {
    const row = await marketRow(page, q, full);
    await page.waitForTimeout(300);
    await shot(page, `n-${q.toLowerCase()}-${pr.tag}`);
    check(!!row && new RegExp(`\\b${want}\\b`).test(row.text) && row.right <= pr.width + 1, `(n) ${pr.tag}: ${full} row ${row ? row.text.slice(0, 120) : 'none'}`);
  }
  check(page.errs.length === 0, `(n) ${pr.tag}: no page error ${page.errs.slice(0, 2).join(' | ')}`);
  await context.close();
}

/* ---------- (o) the old save in the head's page ---------- */
{
  const pr = { width: 390, height: 844, touch: true, tag: '390' };
  const { context, page, ok } = await open(pr, oSave);
  if (!ok) { await shot(page, 'o-notab'); check(false, '(o) the old save opens to its hub'); }
  else {
    await shot(page, 'o-hub-390');
    await page.getByRole('tab', { name: /^Squad$/ }).first().click();
    await page.waitForTimeout(900);
    const row = await page.evaluate(() => {
      const hits = [...document.querySelectorAll('body *')].filter(el => el.children.length === 0 && /Luka Modri/.test(el.textContent || ''));
      for (const h of hits) {
        let el = h;
        for (let i = 0; i < 6 && el; i += 1) {
          const b = el.getBoundingClientRect();
          if (b.height >= 30 && b.width >= 200) { el.scrollIntoView({ block: 'center' }); return { text: (el.innerText || '').replace(/\s+/g, ' ').slice(0, 200), h: b.height }; }
          el = el.parentElement;
        }
      }
      return null;
    });
    await page.waitForTimeout(300);
    await shot(page, 'o-squad-modric-390');
    console.log(`(o) Squad row: ${row ? row.text : 'no row'}`);
    check(!!row && new RegExp(`\\b${baseModric.rating}\\b`).test(row.text) && !/\b80\b/.test(row.text), `(o) the old save's Squad shows Modric at the save's own ${baseModric.rating}`);
    const m = await marketRow(page, 'Messi', 'Lionel Messi');
    await page.waitForTimeout(300);
    await shot(page, 'o-market-messi-390');
    console.log(`(o) Market row: ${m ? m.text : 'no row'}`);
    check(!!m && /\b86\b/.test(m.text), '(o) the old save\'s market shows Messi at the new 86 (the stated design)');
    check(page.errs.length === 0, `(o) no page error ${page.errs.slice(0, 2).join(' | ')}`);
  }
  await context.close();
}
await browser.close();
console.log(`rvWalk2 ${bad ? 'RED' : 'GREEN'}: ${bad} findings`);
process.exit(bad ? 1 : 0);
