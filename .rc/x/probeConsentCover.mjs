// Release BO triage probe, runner only. A first visit with the cookie banner unanswered: does the banner sit over
// the Stadium Tycoon rules dialog's own "Let's go" button on a phone? Measures, asserts nothing.
//   node .rc/x/probeConsentCover.mjs <label>=<base url> [...]
import { chromium } from 'playwright';
const targets = process.argv.slice(2).map((a) => a.split('='));
const browser = await chromium.launch();
const r = (b) => (b ? `${Math.round(b.y)} to ${Math.round(b.y + b.height)}` : 'none');
for (const [label, base] of targets) {
  for (const [w, h] of [[320, 640], [390, 844], [1280, 900]]) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    try {
      await page.goto(base + '/stadium-tycoon', { waitUntil: 'networkidle', timeout: 45000 });
      await page.waitForTimeout(1500);
      const m = await page.evaluate(() => {
        const box = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, width: b.width, height: b.height }; };
        const banner = document.querySelector('[role="region"][aria-label="Cookie choices"]');
        const dialog = document.querySelector('[role="dialog"][aria-label="How Stadium Tycoon works"]');
        const go = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === "Let's go");
        if (go) go.scrollIntoView({ block: 'nearest' });
        const g = box(go);
        let hit = null;
        if (g) { const el = document.elementFromPoint(g.x + g.width / 2, g.y + g.height / 2); hit = el ? (banner && banner.contains(el) ? 'the banner' : go.contains(el) ? "Let's go" : el.tagName + ' ' + (el.textContent || '').trim().slice(0, 30)) : 'nothing'; }
        return { banner: box(banner), dialog: box(dialog), go: g, hit, labels: banner ? [...banner.querySelectorAll('button')].map((b) => b.textContent.trim()) : [],
          pending: document.body.dataset.consentPending || null, height: document.body.style.getPropertyValue('--dukb-consent-height') || null,
          dialogTop: dialog ? getComputedStyle(dialog).top : null, dialogMax: dialog ? getComputedStyle(dialog).maxHeight : null, dialogPos: dialog ? getComputedStyle(dialog).position : null };
      });
      console.log(`${label} ${w}x${h}: banner ${r(m.banner)} [${m.labels.join(' / ')}], dialog ${r(m.dialog)} (${m.dialogPos}, top ${m.dialogTop}, max ${m.dialogMax}), "Let's go" ${r(m.go)}, at its centre: ${m.hit}; pending ${m.pending}, --dukb-consent-height ${m.height}`);
    } catch (e) { console.log(`${label} ${w}x${h}: probe error ${String(e.message || e).split('\n')[0]}`); }
    await page.close();
  }
}
await browser.close();
