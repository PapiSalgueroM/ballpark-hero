/* Reviewer walk 2 (never committed): the Club Manager rooms behind the hub tiles, on the real built page.
   Cups (groups and brackets as buttons), Facilities, Options, Finances, Skills, Academy, Training (retrain), Dressing room. */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const pw = (await import(pathToFileURL(path.join(ROOT, 'scripts/lib/playwrightLoader.mjs')).href)).default;
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || path.join(ROOT, '.tmp-fx/rr-shots');
fs.mkdirSync(OUT, { recursive: true });
const report = { cases: [] };
const browser = await pw.chromium.launch({ args: ['--no-sandbox', '--no-proxy-server'] });

const roomFacts = page => page.evaluate(() => {
  const vis = b => !!b.offsetParent;
  const tableBtn = [...document.querySelectorAll('button[data-club]')].filter(vis);
  const geo = b => { const r = b.getBoundingClientRect(); const c = b.parentElement.getBoundingClientRect(); return [+(r.left - c.left).toFixed(1), +(c.right - r.right).toFixed(1), +r.width.toFixed(1), +r.height.toFixed(1), b.scrollWidth > b.clientWidth + 1].join('|'); };
  const lines = [...document.querySelectorAll('button.cursor-pointer.text-left')].filter(b => vis(b) && !b.hasAttribute('data-club'));
  return {
    sideways: document.documentElement.scrollWidth - innerWidth,
    tableButtons: tableBtn.length,
    tableGeometries: [...new Set(tableBtn.map(geo))].slice(0, 8),
    tableClubs: tableBtn.slice(0, 5).map(b => b.getAttribute('data-club')),
    bracketButtons: lines.length,
    bracketGeometries: [...new Set(lines.map(b => { const r = b.getBoundingClientRect(); const p = b.parentElement.getBoundingClientRect(); return [+r.width.toFixed(1), +p.width.toFixed(1), +(r.right - p.right).toFixed(1), b.scrollWidth > b.clientWidth + 1].join('|'); }))].slice(0, 8),
    bracketSample: lines.slice(0, 4).map(b => b.textContent.trim().slice(0, 40)),
    labelled: [...document.querySelectorAll('main button[aria-label], [data-facilities-desk] button[aria-label]')].filter(vis).map(b => [b.getAttribute('aria-label'), b.textContent.trim().replace(/\s+/g, ' ').slice(0, 40), b.disabled]).slice(0, 40),
    pressed: [...document.querySelectorAll('button[aria-pressed]')].filter(vis).map(b => [b.textContent.trim().replace(/\s+/g, ' ').slice(0, 30), b.getAttribute('aria-pressed')]).slice(0, 40),
    text: (document.querySelector('main') || document.body).innerText.replace(/\s+/g, ' ').slice(0, 260),
  };
});

async function walk(width, height) {
  const tag = String(width);
  const row = { tag, rooms: {} };
  report.cases.push(row);
  const ctx = await browser.newContext({ viewport: { width, height } });
  await ctx.addInitScript(() => { try { localStorage.setItem('cookie-consent', 'essential'); } catch { /* private mode */ } });
  await ctx.route(/supabase\.co/, r => r.abort());
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 200)));
  const shot = async (name, full = false) => { await page.waitForTimeout(500); await page.screenshot({ path: path.join(OUT, `cm2-${tag}-${name}.png`), fullPage: full }); };
  const tap = async rx => { const b = page.getByRole('button', { name: rx }).first(); if (await b.count().catch(() => 0) === 0) return false; return b.click({ timeout: 5000 }).then(() => true).catch(() => false); };
  /* a hub tile is a button whose text STARTS with its icon and title */
  const tile = async title => page.evaluate(t => { const b = [...document.querySelectorAll('button')].find(x => x.offsetParent && x.className.includes('hover:-translate-y-0.5') && x.textContent.replace(/\s+/g, ' ').includes(t)); if (!b) return false; b.scrollIntoView({ block: 'center' }); b.click(); return true; }, title);
  const home = async () => page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => x.offsetParent && x.textContent.trim() === 'Club home'); if (!b) return false; b.click(); return true; });
  try {
    await page.goto(`${BASE}/club-manager`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1500);
    await tap(/2026-27/i);
    await page.getByRole('button', { name: /England/i }).first().waitFor({ timeout: 10000 }).catch(() => {});
    await tap(/England/i);
    await page.getByRole('button', { name: /Premier League/i }).first().waitFor({ timeout: 10000 }).catch(() => {});
    await tap(/Premier League/i);
    const club = page.locator('button').filter({ hasText: /Arsenal/ }).first();
    await club.waitFor({ timeout: 10000 }).catch(() => {});
    await club.click({ timeout: 5000 }).catch(() => {});
    await tap(/take the job|confirm|start/i);
    await page.getByText(/who is in the dugout/i).first().waitFor({ timeout: 10000 }).catch(() => {});
    await tap(/skip: just manage/i);
    await page.waitForTimeout(1500);
    if (!(await page.getByRole('tab').allTextContents().catch(() => [])).some(t => /Table/.test(t))) { row.blocked = 'never reached the hub'; await shot('BLOCKED', true); return; }
    for (const [name, title] of [['cups', 'Cups'], ['facilities', 'Facilities'], ['options', 'Options'], ['finances', 'Finances'], ['skills', 'Skills'], ['academy', 'Academy'], ['dressing', 'Dressing room'], ['training', 'Training']]) {
      const opened = await tile(title);
      await page.waitForTimeout(1600);
      const facts = opened ? await roomFacts(page) : null;
      row.rooms[name] = { opened, ...(facts ?? {}) };
      if (opened && (width < 500 || name === 'cups' || name === 'options')) await shot(`room-${name}`, true);
      if (opened && name === 'options') {
        row.rooms[name].negotiation = await page.evaluate(() => { const p = [...document.querySelectorAll('p')].find(x => x.textContent.includes('opening price')); return p ? p.textContent.replace(/\s+/g, ' ').trim() : null; });
      }
      if (opened && name === 'training') {
        /* Round 1160: start a retrain, and the picker keeps the focus while the page stays where it was */
        const before = await page.evaluate(() => { const s = document.querySelector('[data-cm-retrain-pick]'); if (!s) return null; s.scrollIntoView({ block: 'center' }); return { options: s.options.length }; });
        if (before && before.options > 1) {
          await page.selectOption('[data-cm-retrain-pick]', { index: 1 });
          await page.waitForSelector('[data-cm-retrain-to]', { timeout: 5000 }).catch(() => {});
          await page.waitForTimeout(700);
          const y0 = await page.evaluate(() => ({ y: scrollY, top: Math.round(document.querySelector('[data-cm-retrain-pick]').getBoundingClientRect().top) }));
          await shot('room-training-targets');
          await page.locator('[data-cm-retrain-to]').first().click({ timeout: 5000 });
          await page.waitForTimeout(900);
          const y1 = await page.evaluate(() => ({ y: scrollY, top: Math.round(document.querySelector('[data-cm-retrain-pick]').getBoundingClientRect().top), focusOnPicker: document.activeElement === document.querySelector('[data-cm-retrain-pick]'), learning: document.querySelectorAll('[data-cm-retraining]').length, refusal: document.querySelector('[data-cm-retrain-refusal]')?.textContent ?? null }));
          row.rooms[name].retrain = { before: y0, after: y1 };
          await shot('room-training-after');
        } else row.rooms[name].retrain = { skipped: 'no picker or nobody to pick' };
      }
      if (opened) row.rooms[name].back = await home();
      await page.waitForTimeout(700);
    }
  } catch (e) {
    row.error = String(e).slice(0, 300);
    await shot('ERROR', true).catch(() => {});
  } finally {
    row.pageErrors = errors;
    await ctx.close();
  }
}
try {
  await walk(390, 844);
  await walk(1280, 900);
} finally {
  fs.writeFileSync(path.join(OUT, 'cm2-report.json'), JSON.stringify(report, null, 1));
  await browser.close();
}
for (const c of report.cases) console.log(`cm2 ${c.tag}: ${Object.entries(c.rooms).map(([k, v]) => `${k}=${v.opened ? 'open' : 'NO'}`).join(' ')} error=${c.error ?? 'none'} blocked=${c.blocked ?? 'no'} pageErrors=${JSON.stringify(c.pageErrors)}`);
console.log(`rr-walk-cm2: ${report.cases.length} walks done`);
process.exit(0);
