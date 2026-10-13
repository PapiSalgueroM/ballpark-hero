// Review (run lens) probe for Round 1330: can the stale tab's Reload be pressed while one of the page's
// Radix dialogs (the "?" help) is open behind the notice? Arm "plain" (no dialog) is the control that
// proves a press on Reload is seen as a reload by this probe. Runs as node .rc/x/probe.mjs, BASE = head.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const { chromium } = await import(pathToFileURL(path.join(ROOT, 'scripts/lib/playwrightLoader.mjs')).href);
const { seedPages } = await import(pathToFileURL(path.join(ROOT, 'scripts/lib/pageSeed.mjs')).href);
const OUT = process.env.RC_OUT || path.join(ROOT, 'probe-out');
fs.mkdirSync(OUT, { recursive: true });
const HEAD = (process.env.SWEEP_BASE || process.env.BASE || '').replace(/\/$/, '');
const BLOCK = /supabase\.co|googlesyndication|doubleclick|google-analytics|googletagmanager|adservice|fundingchoices/;
const browser = await chromium.launch();
const results = [];
async function pick(p, trig, want) {
  await p.locator('[role="combobox"]', { hasText: trig }).first().click({ timeout: 5000 });
  await p.waitForSelector('[role="option"]', { timeout: 8000 });
  await p.evaluate(w => { const o = [...document.querySelectorAll('[role="option"]')]; (o.find(x => x.textContent.includes(w)) || o[0]).click(); }, want);
  await p.waitForTimeout(400);
}
for (const [w, h] of [[390, 844], [1280, 900]]) for (const arm of ['plain', 'help-dialog']) {
  const tag = `${w}x${h}-${arm}`;
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: w < 768, hasTouch: w < 768 });
  await ctx.route(BLOCK, r => r.abort());
  await seedPages(ctx, 99);
  const p = await ctx.newPage();
  await p.goto(HEAD + '/robots.txt');
  await p.evaluate(() => localStorage.clear());
  await p.goto(HEAD + '/soccer-career', { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('input[placeholder*="player name"]', { timeout: 20000 });
  await p.getByRole('button', { name: /^essential only$/i }).first().click({ timeout: 1500 }).catch(() => {});
  await p.fill('input[placeholder*="player name"]', 'Probe Player');
  await pick(p, 'Choose nationality', 'England');
  await pick(p, 'Choose position', 'Striker');
  await pick(p, 'Choose era', 'Current era');
  await p.getByRole('button', { name: /Generate Starting Potential/ }).click();
  await p.waitForTimeout(3500);
  await p.getByRole('button', { name: /Begin Career/ }).click();
  await p.waitForTimeout(1500);
  for (let i = 0; i < 3; i++) { if (await p.locator('[role="dialog"]:visible').count() === 0) break; await p.keyboard.press('Escape'); await p.waitForTimeout(300); }
  let dialogOpen = false;
  if (arm === 'help-dialog') {
    const trig = p.locator('button[aria-label*="ow to play" i], button[aria-label*="help" i]').first();
    await trig.click({ timeout: 4000 }).catch(e => console.log(`  ${tag}: no help trigger (${String(e.message).slice(0, 60)})`));
    await p.waitForTimeout(700);
    dialogOpen = await p.locator('[role="dialog"]:visible').count() > 0;
  }
  const p2 = await ctx.newPage();
  await p2.goto(HEAD + '/soccer-career', { waitUntil: 'domcontentloaded' });
  await p2.waitForTimeout(2000);
  await p.bringToFront();
  await p.waitForTimeout(1500);
  const m = await p.evaluate(() => {
    window.__probeMark = 1;
    const d = document.querySelector('[role="alertdialog"]');
    const b = d ? [...d.querySelectorAll('button')].find(x => /Reload/.test(x.textContent || '')) : null;
    const r = b?.getBoundingClientRect();
    const hit = r ? document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) : null;
    const ae = document.activeElement;
    return {
      notice: !!d, bodyPE: document.body.style.pointerEvents || '(unset)', reloadPE: b ? getComputedStyle(b).pointerEvents : null,
      hit: hit ? `${hit.tagName.toLowerCase()} "${(hit.textContent || '').trim().slice(0, 30)}"` : 'nothing', hitIsReload: !!(hit && b && (hit === b || b.contains(hit))),
      focus: ae ? `${ae.tagName.toLowerCase()} "${(ae.textContent || ae.getAttribute('aria-label') || '').trim().slice(0, 30)}"` : 'none',
      center: r ? [Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2)] : null,
    };
  });
  await p.screenshot({ path: path.join(OUT, `${tag}-notice.jpg`), type: 'jpeg', quality: 60 });
  let how = 'not reloaded';
  if (m.center) {
    await p.mouse.click(m.center[0], m.center[1]);
    await p.waitForTimeout(2500);
    const still = await p.evaluate(() => window.__probeMark === 1).catch(() => false);
    if (!still) how = 'reloaded by one press';
    else {
      await p.mouse.click(m.center[0], m.center[1]);
      await p.waitForTimeout(2500);
      const still2 = await p.evaluate(() => window.__probeMark === 1).catch(() => false);
      if (!still2) how = 'reloaded by the SECOND press';
      else {
        await p.keyboard.press('Enter');
        await p.waitForTimeout(2500);
        const still3 = await p.evaluate(() => window.__probeMark === 1).catch(() => false);
        how = still3 ? 'not reloaded by two presses and Enter' : 'reloaded by Enter after two dead presses';
      }
    }
  }
  await p.screenshot({ path: path.join(OUT, `${tag}-after.jpg`), type: 'jpeg', quality: 60 });
  const line = `${tag}: dialog open ${dialogOpen}; ${JSON.stringify(m)}; ${how}`;
  console.log(line);
  results.push({ arm, how });
  await ctx.close();
}
await browser.close();
const plainOk = results.filter(r => r.arm === 'plain').every(r => r.how === 'reloaded by one press');
console.log(plainOk ? 'CONTROL OK: the plain arm reloads on one press at both sizes' : 'PROBE BLIND: the plain arm did not reload on one press');
const bad = results.filter(r => r.arm !== 'plain' && r.how !== 'reloaded by one press');
console.log(bad.length ? `PROBE FOUND: Reload does not work on one press with a dialog open (${bad.map(b => b.how).join('; ')})` : 'PROBE CLEAN: Reload works on one press with a dialog open');
process.exit(!plainOk ? 2 : bad.length ? 1 : 0);
