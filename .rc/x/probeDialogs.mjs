// Release BO triage probe, runner only, measures and asserts nothing. A first visit with the cookie banner
// unanswered: for each route, every open [role="dialog"] (its box, its computed position, top and max height) and
// whether each of its buttons can be tapped at its centre or sits under the banner.
//   node .rc/x/probeDialogs.mjs <label>=<base url> [...]      routes: PROBE_ROUTES (comma list)
import { chromium } from 'playwright';
const routes = (process.env.PROBE_ROUTES || '/hall-of-champions,/idle-arena,/stadium-tycoon').split(',');
const targets = process.argv.slice(2).map((a) => a.split('='));
const browser = await chromium.launch();
const span = (b) => `${Math.round(b.y)} to ${Math.round(b.y + b.height)}`;
for (const [label, base] of targets) for (const route of routes) for (const [w, h] of [[320, 640], [390, 844]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  try {
    await page.goto(base + route, { waitUntil: 'networkidle', timeout: 45000 });
    await page.waitForTimeout(1500);
    const m = await page.evaluate(() => {
      const banner = document.querySelector('[role="region"][aria-label="Cookie choices"]');
      const bb = banner ? banner.getBoundingClientRect() : null;
      const dialogs = [...document.querySelectorAll('[role="dialog"]')].filter((d) => d.getBoundingClientRect().height > 0).map((d) => {
        const r = d.getBoundingClientRect(), cs = getComputedStyle(d);
        const buttons = [...d.querySelectorAll('button')].filter((b) => b.getBoundingClientRect().height > 0).map((b) => {
          const x = b.getBoundingClientRect();
          const el = document.elementFromPoint(x.x + x.width / 2, x.y + x.height / 2);
          const where = !el ? 'off screen' : banner && banner.contains(el) ? 'UNDER THE BANNER' : b.contains(el) ? 'tappable' : 'covered by ' + el.tagName;
          return `${(b.textContent || b.getAttribute('aria-label') || '').trim().slice(0, 18)}@${Math.round(x.y)}:${where}`;
        });
        return { name: d.getAttribute('aria-label') || '', y: r.y, height: r.height, pos: cs.position, top: cs.top, max: cs.maxHeight, buttons };
      });
      return { banner: bb ? { y: bb.y, height: bb.height } : null, pending: document.body.dataset.consentPending || null, dialogs };
    });
    const head = `${label} ${route} ${w}x${h}: banner ${m.banner ? span(m.banner) : 'none'} pending ${m.pending}`;
    if (!m.dialogs.length) console.log(`${head}; no open dialog`);
    for (const d of m.dialogs) console.log(`${head}; dialog "${d.name}" ${span(d)} (${d.pos}, top ${d.top}, max ${d.max}); buttons ${d.buttons.join(' | ')}`);
  } catch (e) { console.log(`${label} ${route} ${w}x${h}: probe error ${String(e.message || e).split('\n')[0]}`); }
  await page.close();
}
await browser.close();
