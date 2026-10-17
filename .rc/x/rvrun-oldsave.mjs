// Reviewer probe (round 1340, runner lens): a save the BASE build wrote in the middle of a live away match, loaded
// on the HEAD build. The base build (d8aaa4cb) is served at OLD_BASE, the head at BASE. A Liverpool 2026-27 career is
// started on the base, kicked off live away at Newcastle and skipped to the interval; the save is copied out of the
// base's storage into a fresh head context, Resume Career, and the match is played on to its report.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const HEAD = process.env.BASE || 'http://localhost:4173';
const OLD = process.env.OLD_BASE || 'http://127.0.0.1:4180';
const OUT = path.join(process.env.RC_OUT || '/tmp/rvrun', 'rvold');
fs.mkdirSync(OUT, { recursive: true });
const KEY = 'dukb-club-manager-save';
const findings = [];
const flag = w => { findings.push(w); console.log(`  FINDING: ${w}`); };
const browser = await chromium.launch();
const ctx = async (origin, save) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, colorScheme: 'dark', serviceWorkers: 'block',
    storageState: { cookies: [], origins: [{ origin, localStorage: [{ name: 'cookie-consent', value: 'essential' }, ...(save ? [{ name: KEY, value: save }] : [])] }] },
  });
  await context.route(/supabase\.co/, r => r.abort());
  await context.route('**/*', r => {
    const u = new URL(r.request().url());
    if (u.origin === origin || ['fonts.googleapis.com', 'fonts.gstatic.com'].includes(u.hostname)) return r.continue();
    return r.abort('blockedbyclient');
  });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  const errors = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 200)));
  return { context, page, errors };
};
const tap = async (page, loc) => { await loc.waitFor({ timeout: 30000 }); await loc.tap(); await page.waitForTimeout(400); };
const btn = (page, rx) => page.locator('button:visible').filter({ hasText: rx }).first();
const stage = (page, v) => page.waitForFunction(x => [...document.querySelectorAll('[data-cm-live-stage]')].some(e => e.getAttribute('data-cm-live-stage') === x), v, { timeout: 45000 });

let saved = null;
{
  const { context, page, errors } = await ctx(OLD);
  try {
    await page.goto(`${OLD}/club-manager`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
    await tap(page, page.getByRole('button', { name: /2026-27/ }).first());
    await tap(page, page.getByRole('button', { name: /^England/ }).first());
    await tap(page, page.getByRole('button').filter({ hasText: 'Strongest sides:' }).filter({ has: page.getByText('Premier League', { exact: true }) }).first());
    await tap(page, page.getByRole('button').filter({ has: page.getByText('Liverpool', { exact: true }) }).first());
    await tap(page, page.getByRole('button', { name: 'Take the job', exact: true }));
    await tap(page, page.getByRole('button', { name: 'Skip: just manage', exact: true }));
    await page.locator('[data-cm-way="live"]').first().waitFor({ timeout: 45000 });
    await page.screenshot({ path: path.join(OUT, 'base-hub.png') });
    await tap(page, page.locator('button:visible[data-cm-way="live"]').first());
    await stage(page, 'first');
    await page.waitForTimeout(1500);
    await tap(page, btn(page, /^\s*Skip\s*$/));
    await stage(page, 'interval');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(OUT, 'base-interval.png'), fullPage: true });
    saved = await page.evaluate(k => localStorage.getItem(k), KEY);
    const c = JSON.parse(saved);
    console.log(`base save: ${saved.length} bytes, club ${c.clubName}, live ${c.live ? `minute ${c.live.minute ?? '?'} home ${c.live.home} ${c.live.myGoals}-${c.live.oppGoals} vs ${c.live.opponent}` : 'none'}`);
    if (errors.length) flag(`base page errors: ${errors.join(' | ')}`);
  } catch (e) {
    flag(`the base half stopped: ${String(e.message).split('\n')[0]}`);
    await page.screenshot({ path: path.join(OUT, 'base-stuck.png'), fullPage: true }).catch(() => {});
  } finally { await context.close(); }
}
if (saved) {
  const { context, page, errors } = await ctx(HEAD, saved);
  try {
    await page.goto(`${HEAD}/club-manager`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
    await tap(page, page.locator('[data-testid="cm-slot-1"]').getByRole('button', { name: 'Resume Career', exact: true }));
    await page.waitForTimeout(2500);
    const where = await page.evaluate(() => ({
      stages: [...document.querySelectorAll('[data-cm-live-stage]')].map(e => e.getAttribute('data-cm-live-stage')),
      h1: document.querySelector('h1')?.textContent.trim(), card: document.querySelector('[data-cm-next-match]')?.textContent.replace(/\s+/g, ' ').trim() ?? null,
    }));
    console.log(`head after Resume: h1 "${where.h1}", stages ${where.stages.join(' ')}, hub card ${where.card}`);
    await page.screenshot({ path: path.join(OUT, 'head-resumed.png'), fullPage: true });
    /* On to the report however the head resumes it: the dressing room, the live viewer or the hub's live button. */
    const deadline = Date.now() + 100000;
    while (Date.now() < deadline) {
      if (await page.locator('[data-cm-timeline]').count()) break;
      for (const rx of [/Second half/, /^\s*Full report\s*$/, /^\s*Skip\s*$/, /Resume|Back to the match|Carry on/]) {
        const b = btn(page, rx);
        if (await b.count()) { await b.tap().catch(() => {}); await page.waitForTimeout(800); break; }
      }
      await page.waitForTimeout(500);
    }
    if (!(await page.locator('[data-cm-timeline]').count())) throw new Error('the report never came on the head');
    await page.waitForTimeout(4000);
    const rep = await page.evaluate(() => {
      const box = [...document.querySelectorAll('div')].find(d => d.className.includes('font-display') && d.className.includes('text-2xl') && /^\d+ - \d+$/.test(d.textContent.trim()));
      return { line: box ? `${box.previousElementSibling?.textContent.trim()} ${box.textContent.trim()} ${box.nextElementSibling?.textContent.trim()}` : null, bars: [...document.querySelectorAll('[data-cm-stat]')].map(b => b.querySelector('[data-cm-stat-n]')?.getAttribute('data-cm-stat-n')) };
    });
    console.log(`head report from the base's mid match save: "${rep.line}", first numbers ${[...new Set(rep.bars)].join(' ')}`);
    if (!rep.line || !rep.line.startsWith('Newcastle')) flag(`the head report from the base save reads "${rep.line}"`);
    await page.screenshot({ path: path.join(OUT, 'head-report.png'), fullPage: true });
    const after = await page.evaluate(k => localStorage.getItem(k), KEY);
    try { JSON.parse(after); console.log(`head save after the report: ${after.length} bytes, parses`); } catch { flag('the head left a save that does not parse'); }
    if (errors.length) flag(`head page errors: ${errors.join(' | ')}`);
  } catch (e) {
    flag(`the head half stopped: ${String(e.message).split('\n')[0]}`);
    await page.screenshot({ path: path.join(OUT, 'head-stuck.png'), fullPage: true }).catch(() => {});
  } finally { await context.close(); }
}
await browser.close();
console.log(`rvrun-oldsave: ${findings.length} findings${saved ? '' : ' (no base save was made)'}`);
process.exit(findings.length || !saved ? 1 : 0);
