// Reviewer facts-screens-weight, Release AZ. Never committed. Needs a served build (BASE) and the two saves that
// .rc/x/mkSaveCD.mjs wrote into $RC_OUT. At 320 (reduced motion), 390 and 1280: resume the save, open Rival watch
// (the rival's ClubDetailScreen), measure the Best XI card and the squad list, find the two men sold there, time
// the taps, and take pictures. Then the What's New entry and the help paragraph at 390 and 1280.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
const BASE = (process.env.BASE || 'http://localhost:4173').replace(/\/$/, '');
const OUT = process.env.RC_OUT || '.tmp-fx';
const SAVE_KEY = 'dukb-club-manager-save', NOW = 1791633600000;
const SAVES = { seeded: fs.readFileSync(path.join(OUT, 'cd-save-seeded.json'), 'utf8'), old: fs.readFileSync(path.join(OUT, 'cd-save-old.json'), 'utf8') };
const SOLD = JSON.parse(fs.readFileSync(path.join(OUT, 'cd-sold.json'), 'utf8'));
const PROFILES = [
  { name: '320', width: 320, height: 640, touch: true, reduce: true },
  { name: '390', width: 390, height: 844, touch: true, reduce: false },
  { name: '1280', width: 1280, height: 900, touch: false, reduce: false },
];
const notes = [];
const browser = await chromium.launch();
async function open(profile, save) {
  const context = await browser.newContext({ viewport: { width: profile.width, height: profile.height }, hasTouch: profile.touch, isMobile: profile.touch, reducedMotion: profile.reduce ? 'reduce' : 'no-preference' });
  await context.route(/supabase\.co/, r => r.abort());
  await context.addInitScript(({ now, key, save }) => {
    const Real = Date;
    window.Date = class extends Real { constructor(...a) { super(...(a.length ? a : [now])); } static now() { return now; } };
    localStorage.setItem('cookie-consent', 'essential');
    if (save && !sessionStorage.getItem('cd-seeded')) { localStorage.setItem(key, save); sessionStorage.setItem('cd-seeded', '1'); }
  }, { now: NOW, key: SAVE_KEY, save });
  const page = await context.newPage(); page.setDefaultTimeout(30000);
  const errors = []; page.on('pageerror', e => errors.push(String(e).slice(0, 200)));
  const activate = async loc => { if (profile.touch) await loc.tap(); else await loc.click(); };
  return { context, page, errors, activate };
}
const measure = (page, sold) => page.evaluate(sold => {
  const label = [...document.querySelectorAll('div')].find(d => d.textContent === 'Best XI' && d.children.length === 0);
  const grid = label.parentElement.parentElement, num = label.previousElementSibling;
  const cells = [...grid.children].map(c => c.getBoundingClientRect());
  let overlap = 0;
  for (let i = 0; i < cells.length; i++) for (let j = i + 1; j < cells.length; j++) { const a = cells[i], b = cells[j]; if (a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5) overlap++; }
  const clipped = [...document.querySelectorAll('span,div,p,h1,h2,h3')].filter(e => { const st = getComputedStyle(e); return e.children.length === 0 && e.textContent.trim() && st.textOverflow !== 'ellipsis' && e.scrollWidth > e.clientWidth + 1 && st.overflow !== 'visible'; }).map(e => e.textContent.trim().slice(0, 30));
  const rows = sold.map(n => { const span = [...document.querySelectorAll('span')].find(s => s.textContent === n); if (!span) return { n, listed: false };
    const row = span.closest('.flex.items-center.gap-2'); return { n, listed: true, text: row.innerText.replace(/\s+/g, ' ').slice(0, 80), madeUpTag: /made up/i.test(row.innerText) }; });
  const caption = [...document.querySelectorAll('p')].find(p => /aged forward/.test(p.textContent))?.textContent.trim() ?? null;
  return { club: document.querySelector('.text-xl.font-bold')?.textContent ?? null, xi: num.textContent, numFont: getComputedStyle(num).fontSize,
    overlap, wide: document.documentElement.scrollWidth > innerWidth + 1, clipped: clipped.slice(0, 6), rows, caption, scrollY: Math.round(scrollY) };
}, sold);
for (const profile of PROFILES) for (const [tag, save] of Object.entries(SAVES)) {
  const s = await open(profile, save);
  try {
    const t0 = Date.now();
    await s.page.goto(`${BASE}/club-manager`, { waitUntil: 'domcontentloaded' });
    const resume = s.page.getByRole('button', { name: 'Resume Career', exact: true });
    const tile = s.page.getByRole('button').filter({ hasText: 'Rival watch' }).first();
    await Promise.race([resume.waitFor(), tile.waitFor()]);
    if (await resume.count()) await s.activate(resume.first());
    await tile.waitFor();
    const tHub = Date.now() - t0;
    const stored = await s.page.evaluate(k => { const o = JSON.parse(localStorage.getItem(k) || 'null'); return o ? { seed: o.worldSeed !== undefined, ledger: o.worldRoster !== undefined, season: o.season } : null; }, SAVE_KEY);
    await s.page.evaluate(() => window.scrollTo(0, 0));
    await s.activate(s.page.getByRole('tab', { name: 'Table', exact: true }));
    const target = s.page.getByRole('button').filter({ has: s.page.getByText('Liverpool', { exact: true }) }).first();
    await target.waitFor();
    await target.scrollIntoViewIfNeeded();
    const t1 = Date.now();
    await s.activate(target);
    await s.page.getByText('Best XI', { exact: true }).waitFor();
    const tOpen = Date.now() - t1;
    await s.page.evaluate(() => document.fonts.ready);
    const m1 = await measure(s.page, SOLD);
    await s.page.waitForTimeout(800);
    const m2 = await measure(s.page, SOLD);
    await s.page.screenshot({ path: path.join(OUT, `cd-${profile.name}-${tag}-top.png`) });
    const hit = SOLD.find(n => m1.rows.find(r => r.n === n && r.listed));
    if (hit) { await s.page.getByText(hit, { exact: true }).first().scrollIntoViewIfNeeded(); await s.page.screenshot({ path: path.join(OUT, `cd-${profile.name}-${tag}-sold.png`) }); }
    notes.push({ profile: profile.name, tag, stored, tHub, tOpen, ...m1, jumped: m1.scrollY !== m2.scrollY, errors: s.errors });
    console.log(`${profile.name} ${tag}: season ${stored?.season} seed ${stored?.seed} ledger ${stored?.ledger}; hub ${tHub} ms; open ${tOpen} ms; ${m1.club} Best XI ${m1.xi} (${m1.numFont}); overlap ${m1.overlap}; wide ${m1.wide}; jumped ${m1.scrollY !== m2.scrollY}; clipped ${JSON.stringify(m1.clipped)}; errors ${s.errors.length}`);
    for (const r of m1.rows) console.log(`   ${tag} ${profile.name} sold man ${r.n}: ${r.listed ? `listed "${r.text}" made up tag ${r.madeUpTag}` : 'not listed'}`);
    if (profile.name === '390') console.log(`   caption: ${m1.caption}`);
  } catch (e) {
    console.log(`${profile.name} ${tag}: ERROR ${String(e).slice(0, 300)}`);
    await s.page.screenshot({ path: path.join(OUT, `cd-${profile.name}-${tag}-error.png`) }).catch(() => {});
  } finally { await s.context.close(); }
}
for (const profile of PROFILES.slice(1)) {
  const s = await open(profile, null);
  try {
    await s.page.goto(`${BASE}/whats-new`, { waitUntil: 'networkidle' });
    const li = s.page.locator('li').filter({ hasText: 'the world remembers your deals' }).first();
    await li.scrollIntoViewIfNeeded(); await li.screenshot({ path: path.join(OUT, `wn-${profile.name}.png`) });
    console.log(`whats-new ${profile.name}: "${(await li.innerText()).slice(0, 400)}"`);
    await s.page.goto(`${BASE}/club-manager`, { waitUntil: 'networkidle' });
    await s.activate(s.page.getByRole('button', { name: 'How to play', exact: true }).first());
    const para = s.page.locator('[data-cm-help="world-memory"]');
    await para.waitFor(); await para.scrollIntoViewIfNeeded(); await para.screenshot({ path: path.join(OUT, `help-${profile.name}.png`) });
    const box = await para.boundingBox();
    console.log(`help ${profile.name}: ${Math.round(box.width)} by ${Math.round(box.height)}; font ${await para.evaluate(e => getComputedStyle(e).fontSize)}; wide ${await s.page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)}; errors ${s.errors.length}`);
  } catch (e) { console.log(`pages ${profile.name}: ERROR ${String(e).slice(0, 300)}`); await s.page.screenshot({ path: path.join(OUT, `pages-${profile.name}-error.png`) }).catch(() => {}); }
  finally { await s.context.close(); }
}
await browser.close();
fs.writeFileSync(path.join(OUT, 'cd-walk.json'), JSON.stringify(notes, null, 2));
console.log('walkCD: done');
