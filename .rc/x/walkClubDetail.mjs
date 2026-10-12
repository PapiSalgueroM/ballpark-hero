// Release AZ, decision 11: ClubDetailScreen's Best XI number on a seeded save (a career started now) and on an
// old one (the same save with worldSeed and worldRoster taken off), at 320, 390 and 1280. Never committed.
// Run on a served build: BASE=http://localhost:4173 node .rc/x/walkClubDetail.mjs
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const BASE = (process.env.BASE || process.env.SWEEP_BASE || 'http://localhost:4173').replace(/\/$/, '');
const OUT = path.resolve(process.env.RC_OUT || '.tmp-fx/walk-club-detail');
fs.mkdirSync(OUT, { recursive: true });
const SAVE = 'dukb-club-manager-save', NOW = 1791547200000;
const PROFILES = [
  { name: '320', width: 320, height: 640, touch: true },
  { name: '390', width: 390, height: 844, touch: true },
  { name: '1280', width: 1280, height: 800, touch: false },
];
const WALK = { nation: 'England', league: 'Premier League', club: 'Everton' };
const esc = t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const failures = [], report = [];
const browser = await chromium.launch();

async function open(profile) {
  const context = await browser.newContext({ viewport: { width: profile.width, height: profile.height }, hasTouch: profile.touch, isMobile: profile.touch });
  await context.route(/supabase\.co/, r => r.abort());
  await context.addInitScript(({ now }) => {
    const Real = Date;
    window.Date = class extends Real { constructor(...a) { super(...(a.length ? a : [now])); } static now() { return now; } };
    localStorage.setItem('cookie-consent', 'essential');
  }, { now: NOW });
  const page = await context.newPage();
  page.setDefaultTimeout(25000);
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  const activate = async b => { if (profile.touch) await b.tap(); else { await b.focus(); await b.press('Enter'); } };
  return { context, page, errors, activate };
}
const hubReady = async s => { await s.page.locator('[data-cm-way="quick"]').waitFor(); await s.page.evaluate(() => document.fonts.ready); };
async function pick(s) {
  await s.activate(s.page.getByRole('button', { name: /2026-27/ }));
  await s.activate(s.page.getByRole('button', { name: new RegExp(`^${esc(WALK.nation)}`) }));
  await s.activate(s.page.getByRole('button').filter({ hasText: 'Strongest sides:' }).filter({ has: s.page.getByText(WALK.league, { exact: true }) }).first());
  await s.activate(s.page.getByRole('button').filter({ has: s.page.getByText(WALK.club, { exact: true }) }));
  await s.activate(s.page.getByRole('button', { name: 'Take the job', exact: true }));
  await s.activate(s.page.getByRole('button', { name: 'Skip: just manage', exact: true }));
  await hubReady(s);
}
async function openRival(s) {
  await s.page.evaluate(() => window.scrollTo(0, 0));
  const tile = s.page.getByRole('button').filter({ hasText: 'Rival watch' }).first();
  await s.activate(tile);
  await s.page.getByText('Best XI', { exact: true }).waitFor();
  await s.page.evaluate(() => document.fonts.ready);
}
/* The four stat cells of the card that holds "Best XI": rects, sizes, clipping; and every text node under 12px on screen. */
const measure = page => page.evaluate(() => {
  const label = [...document.querySelectorAll('div')].find(d => d.textContent === 'Best XI' && d.children.length === 0);
  const grid = label.parentElement.parentElement;
  const cells = [...grid.children].map(c => { const r = c.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom }; });
  const num = label.previousElementSibling, nr = num.getBoundingClientRect();
  const overlap = [];
  for (let i = 0; i < cells.length; i++) for (let j = i + 1; j < cells.length; j++) {
    const a = cells[i], b = cells[j];
    if (a.l < b.r - 0.5 && b.l < a.r - 0.5 && a.t < b.b - 0.5 && b.t < a.b - 0.5) overlap.push(`${i}x${j}`);
  }
  const small = new Set();
  for (const el of document.querySelectorAll('body *')) {
    if (!el.childNodes.length || ![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue;
    const st = getComputedStyle(el), r = el.getBoundingClientRect();
    if (r.width === 0 || st.visibility === 'hidden' || st.display === 'none') continue;
    if (parseFloat(st.fontSize) < 12) small.add(`${st.fontSize} ${el.textContent.trim().slice(0, 24)}`);
  }
  const heading = document.querySelector('.text-xl.font-bold');
  return {
    club: heading?.textContent, xi: num.textContent, numFont: getComputedStyle(num).fontSize, labelFont: getComputedStyle(label).fontSize,
    numClipped: num.scrollWidth > num.clientWidth + 1, numInCell: nr.left >= cells[0].l - 0.5 && nr.right <= cells[0].r + 0.5,
    overlap, pageWide: document.documentElement.scrollWidth > innerWidth + 1, headingClipped: heading ? heading.scrollWidth > heading.clientWidth + 1 : null,
    small: [...small].sort(),
  };
});
for (const profile of PROFILES) {
  const s = await open(profile);
  try {
    await s.page.goto(`${BASE}/club-manager`, { waitUntil: 'networkidle' });
    await pick(s);
    const seeded = await s.page.evaluate(k => { const o = JSON.parse(localStorage.getItem(k)); return { seed: o.worldSeed !== undefined, ledger: o.worldRoster !== undefined }; }, SAVE);
    await openRival(s);
    const a = await measure(s.page);
    await s.page.screenshot({ path: path.join(OUT, `club-detail-${profile.name}-seeded.png`), fullPage: true });
    await s.page.evaluate(k => { const o = JSON.parse(localStorage.getItem(k)); delete o.worldSeed; delete o.worldRoster; localStorage.setItem(k, JSON.stringify(o)); }, SAVE);
    await s.page.reload({ waitUntil: 'networkidle' });
    await hubReady(s);
    const old = await s.page.evaluate(k => { const o = JSON.parse(localStorage.getItem(k)); return { seed: o.worldSeed !== undefined, ledger: o.worldRoster !== undefined }; }, SAVE);
    await openRival(s);
    const b = await measure(s.page);
    await s.page.screenshot({ path: path.join(OUT, `club-detail-${profile.name}-old.png`), fullPage: true });
    for (const [tag, m, saveKeys] of [['seeded', a, seeded], ['old', b, old]]) {
      report.push({ profile: profile.name, tag, saveKeys, ...m });
      const bad = [];
      if (tag === 'seeded' && !saveKeys.seed) bad.push('the new career carries no worldSeed');
      if (tag === 'old' && (saveKeys.seed || saveKeys.ledger)) bad.push('the old save still carries a seed or a ledger');
      if (!/^\d+$/.test(m.xi)) bad.push(`Best XI reads "${m.xi}"`);
      if (parseFloat(m.numFont) < 12) bad.push(`the number is ${m.numFont}`);
      if (m.numClipped || !m.numInCell) bad.push('the number is cut or leaves its cell');
      if (m.overlap.length) bad.push(`cells overlap ${m.overlap.join(',')}`);
      if (m.pageWide) bad.push('the page is wider than the screen');
      for (const x of bad) failures.push(`${profile.name} ${tag}: ${x}`);
      console.log(`${profile.name} ${tag}: ${m.club} Best XI ${m.xi} (${m.numFont}, label ${m.labelFont}); overlap ${m.overlap.length}; cut ${m.numClipped}; wide ${m.pageWide}; under 12px ${m.small.length}`);
    }
    if (a.xi !== b.xi) console.log(`${profile.name}: seeded ${a.xi} and old ${b.xi} differ`);
    if (JSON.stringify(a.small) !== JSON.stringify(b.small)) console.log(`${profile.name}: the small text differs between the two saves`);
    if (s.errors.length) failures.push(`${profile.name}: page errors ${s.errors.join(' | ').slice(0, 300)}`);
  } catch (e) {
    failures.push(`${profile.name}: ${String(e).slice(0, 300)}`);
    await s.page.screenshot({ path: path.join(OUT, `club-detail-${profile.name}-error.png`) }).catch(() => {});
  } finally { await s.context.close(); }
}
await browser.close();
fs.writeFileSync(path.join(OUT, 'club-detail.json'), JSON.stringify(report, null, 2));
console.log('under 12px on the screen (all three widths, seeded):', JSON.stringify([...new Set(report.filter(r => r.tag === 'seeded').flatMap(r => r.small))]).slice(0, 900));
if (failures.length) { for (const f of failures) console.log(`  FAIL: ${f}`); console.log(`walkClubDetail: ${failures.length} failures`); process.exit(1); }
console.log('walkClubDetail: green. Best XI on a seeded save and an old one at 320, 390 and 1280: a whole number, 12px or more, inside its cell, no overlap, no sideways scroll.');
