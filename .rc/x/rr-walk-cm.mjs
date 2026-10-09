/* Reviewer walk (never committed): Club Manager rows that became buttons (Rounds 1159, 1161) and the named buttons
   (1158, 1164, 1165, 1166), on the real built page at a phone and a desktop width. supabase is blocked. */
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

/* every row button of a league table on screen, measured against the card it sits in */
const tableFacts = page => page.evaluate(() => {
  const btn = [...document.querySelectorAll('button[data-club]')];
  const one = b => {
    const r = b.getBoundingClientRect();
    const card = b.parentElement.getBoundingClientRect();
    const last = b.lastElementChild.getBoundingClientRect();
    const head = [...b.parentElement.children].find(c => c.tagName === 'DIV' && getComputedStyle(c).display === 'grid');
    const headLast = head ? head.lastElementChild.getBoundingClientRect() : null;
    return { club: b.getAttribute('data-club'), left: +(r.left - card.left).toFixed(1), right: +(card.right - r.right).toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1),
      ptsRight: +last.right.toFixed(1), headPtsRight: headLast ? +headLast.right.toFixed(1) : null, clipped: b.scrollWidth > b.clientWidth + 1, display: getComputedStyle(b).display, font: getComputedStyle(b).fontSize };
  };
  return { buttons: btn.length, divRows: document.querySelectorAll('div[data-club]').length, sideways: document.documentElement.scrollWidth - innerWidth, rows: btn.slice(0, 60).map(one) };
});
/* every bracket line that is a button (Round 1159): does it fill its tie box and stay inside it */
const bracketFacts = page => page.evaluate(() => {
  const btn = [...document.querySelectorAll('button.cursor-pointer.text-left')].filter(b => !b.hasAttribute('data-club'));
  return { buttons: btn.length, rows: btn.slice(0, 40).map(b => { const r = b.getBoundingClientRect(); const p = b.parentElement.getBoundingClientRect(); return { t: b.textContent.trim().slice(0, 40), w: +r.width.toFixed(1), parentW: +p.width.toFixed(1), out: +(r.right - p.right).toFixed(1), clipped: b.scrollWidth > b.clientWidth + 1 }; }) };
});

async function walk(width, height) {
  const tag = String(width);
  const row = { tag, notes: [] };
  report.cases.push(row);
  const ctx = await browser.newContext({ viewport: { width, height } });
  await ctx.addInitScript(() => { try { localStorage.setItem('cookie-consent', 'essential'); } catch { /* private mode */ } });
  await ctx.route(/supabase\.co/, r => r.abort());
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 200)));
  const shot = async (name, full = false) => { await page.waitForTimeout(500); await page.screenshot({ path: path.join(OUT, `cm-${tag}-${name}.png`), fullPage: full }); };
  const tap = async rx => { const b = page.getByRole('button', { name: rx }).first(); if (await b.count().catch(() => 0) === 0) return false; return b.click({ timeout: 5000 }).then(() => true).catch(() => false); };
  const tile = async rx => { const b = page.locator('button:visible').filter({ hasText: rx }).first(); if (await b.count().catch(() => 0) === 0) return false; return b.click({ timeout: 5000 }).then(() => true).catch(() => false); };
  try {
    await page.goto(`${BASE}/club-manager`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1500);
    await tap(/2026-27/i);
    await page.getByRole('button', { name: /England/i }).first().waitFor({ timeout: 10000 }).catch(() => {});
    await tap(/England/i);
    await page.getByRole('button', { name: /Premier League/i }).first().waitFor({ timeout: 10000 }).catch(() => {});
    await tap(/Premier League/i);
    const club = page.locator('button').filter({ hasText: /Arsenal|Liverpool|Manchester City/ }).first();
    await club.waitFor({ timeout: 10000 }).catch(() => {});
    row.club = (await club.textContent().catch(() => '') || '').trim().slice(0, 40);
    await club.click({ timeout: 5000 }).catch(() => {});
    await tap(/take the job|confirm|start/i);
    await page.getByText(/who is in the dugout/i).first().waitFor({ timeout: 10000 }).catch(() => {});
    await tap(/skip: just manage/i);
    await page.waitForTimeout(1500);
    const tabs = await page.getByRole('tab').allTextContents().catch(() => []);
    row.tabs = tabs;
    if (!tabs.some(t => /Table/.test(t))) { row.blocked = 'never reached the hub'; await shot('BLOCKED', true); return; }
    await shot('0-hub');
    await page.getByRole('tab', { name: /^Table$/ }).click({ timeout: 5000 });
    await page.waitForSelector('[data-club]', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(800);
    row.table = await tableFacts(page);
    await shot('1-table');
    /* the keyboard: Tab to the first row, show the ring, Enter opens the club */
    let reached = false;
    for (let i = 0; i < 80 && !reached; i += 1) { await page.keyboard.press('Tab'); reached = await page.evaluate(() => !!document.activeElement && document.activeElement.matches('button[data-club]')); }
    row.keyboardReached = reached;
    if (reached) {
      row.focused = await page.evaluate(() => { const b = document.activeElement; const cs = getComputedStyle(b); return { club: b.getAttribute('data-club'), ring: cs.boxShadow.slice(0, 80), outline: cs.outlineStyle }; });
      await shot('2-table-focus');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1200);
      row.afterEnter = await page.evaluate(() => ({ h1: document.querySelector('h1')?.textContent.trim() ?? null, dialogs: [...document.querySelectorAll('[role="dialog"]')].map(d => (d.getAttribute('aria-label') || '').slice(0, 50)), text: document.body.innerText.replace(/\s+/g, ' ').slice(0, 200) }));
      await shot('3-after-enter');
    }
    /* the Cups room: the cup bracket, every Champions League group, the knockout bracket */
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
    row.cupsOpened = await tile(/Cups/);
    await page.waitForTimeout(1500);
    row.cupsTables = await tableFacts(page);
    row.brackets = await bracketFacts(page);
    await shot('4-cups', true);
    for (const [name, rx] of [['facilities', /Facilities/], ['options', /Options|Settings/], ['finance', /Finance/], ['academy', /Academy/], ['training', /Training/]]) {
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2500);
      const ok = await tile(rx);
      await page.waitForTimeout(1200);
      row[name] = { opened: ok, labelled: await page.evaluate(() => [...document.querySelectorAll('button[aria-label]')].filter(b => b.offsetParent).map(b => [b.getAttribute('aria-label'), b.textContent.trim().slice(0, 40)]).slice(0, 30)), pressed: await page.evaluate(() => [...document.querySelectorAll('button[aria-pressed]')].filter(b => b.offsetParent).map(b => [b.textContent.trim().slice(0, 30), b.getAttribute('aria-pressed')]).slice(0, 30)), sideways: await page.evaluate(() => document.documentElement.scrollWidth - innerWidth) };
      if (width < 500 || name === 'options') await shot(`5-${name}`, true);
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
  fs.writeFileSync(path.join(OUT, 'cm-report.json'), JSON.stringify(report, null, 1));
  await browser.close();
}
for (const c of report.cases) console.log(`cm ${c.tag}: club=${c.club} tabs=${JSON.stringify(c.tabs)} tableButtons=${c.table ? c.table.buttons : '?'} sideways=${c.table ? c.table.sideways : '?'} keyboard=${c.keyboardReached} cups=${c.cupsOpened} cupButtons=${c.cupsTables ? c.cupsTables.buttons : '?'} bracketButtons=${c.brackets ? c.brackets.buttons : '?'} error=${c.error ?? 'none'} blocked=${c.blocked ?? 'no'} pageErrors=${JSON.stringify(c.pageErrors)}`);
console.log(`rr-walk-cm: ${report.cases.length} walks done`);
process.exit(0);
