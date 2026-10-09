// Release AQ probe, never committed: what makes /soccer-career wider than a 390 px window on the award night.
// Runs against the served build (http://localhost:4173). usage: node .rc/x/probeWide.mjs
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const ROOT = process.cwd();
const pw = (await import(pathToFileURL(path.join(ROOT, 'scripts/lib/playwrightLoader.mjs')).href)).default;
const { loadEngine, wonTournamentSave } = await import(pathToFileURL(path.join(ROOT, 'scripts/lib/careerMomentSaves.mjs')).href);
const SB = await loadEngine(ROOT);
const won = wonTournamentSave(SB);
const BASE = process.env.BASE || 'http://localhost:4173';
const browser = await pw.chromium.launch();
for (const motion of ['no-preference', 'reduce']) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: motion });
  await ctx.route(/supabase\.co/, r => r.abort());
  await ctx.addInitScript(([key, save]) => {
    try { localStorage.setItem(key, save); localStorage.setItem('cookie-consent', 'essential'); } catch { /* blocked */ }
    window.__wide = { worst: 0, at: 0, who: [], frames: 0, phase: '' };
    const t0 = performance.now();
    const frame = () => {
      const de = document.documentElement;
      if (de) {
        const over = de.scrollWidth - window.innerWidth;
        window.__wide.frames += 1;
        if (over > window.__wide.worst) {
          const who = [];
          for (const el of document.querySelectorAll('#root *')) {
            const r = el.getBoundingClientRect();
            if (r.width > 0 && r.right > window.innerWidth + 0.5) {
              const cs = getComputedStyle(el);
              who.push(`${el.tagName.toLowerCase()}${el.getAttribute('data-award-rank') ? '[rank ' + el.getAttribute('data-award-rank') + ']' : ''}.${String(el.className).slice(0, 70)} right=${Math.round(r.right)} w=${Math.round(r.width)} anim=${cs.animationName} tf=${cs.transform.slice(0, 40)} "${(el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40)}"`);
            }
          }
          window.__wide.worst = over;
          window.__wide.at = Math.round(performance.now() - t0);
          window.__wide.who = who.slice(-8);
          window.__wide.waiting = !!document.querySelector('[data-award-result="waiting"]');
          window.__wide.night = document.querySelector('[data-award-night]') ? 'night card' : 'no night card';
        }
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }, ['soccerCareerSave', won.save]);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/soccer-career`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(6000);
  const before = await page.evaluate(() => window.__wide);
  console.log(`[wide] motion ${motion}: on the award night for 6 s: worst ${before.worst} px at ${before.at} ms over ${before.frames} frames (${before.night}, waiting ${before.waiting})`);
  for (const w of before.who) console.log(`[wide]   ${w}`);
  const next = page.getByRole('button', { name: 'Continue →', exact: true });
  const n = await next.count();
  console.log(`[wide] motion ${motion}: Continue buttons on the night after 6 s: ${n}`);
  if (n === 1) {
    await page.evaluate(() => { window.__wide.worst = 0; window.__wide.who = []; });
    await next.click();
    await page.waitForTimeout(5000);
    const after = await page.evaluate(() => window.__wide);
    console.log(`[wide] motion ${motion}: after Continue for 5 s: worst ${after.worst} px at ${after.at} ms (${after.night})`);
    for (const w of after.who) console.log(`[wide]   ${w}`);
  }
  await ctx.close();
}
await browser.close();
console.log('[wide] done');
