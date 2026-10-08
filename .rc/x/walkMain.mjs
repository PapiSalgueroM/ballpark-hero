// Release AM reviewer (us-careers), never committed. The flows; helpers live in walk.mjs beside this file.
import { open, toHub, check, note, report, save, keyOf, chromium } from './walk.mjs';

const PHONE = { width: 390, height: 844 };
const DESK = { width: 1280, height: 900 };
const NOTICE = '[data-us-career-save-error]';

const measure = page => page.evaluate(() => {
  const n = document.querySelector('[data-us-career-save-error]');
  if (!n) return null;
  const box = el => { const r = el.getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom].map(Math.round); };
  const b = n.querySelector('button'), p = n.querySelector('p');
  const h = document.querySelector('header[data-site-chrome]');
  const at = (x, y) => { const e = document.elementFromPoint(x, y); return !e ? 'none' : n.contains(e) ? 'notice' : e.closest('header') ? 'header' : e.tagName.toLowerCase(); };
  const bb = b.getBoundingClientRect(), pb = p.getBoundingClientRect();
  return {
    op: n.getAttribute('data-save-operation'), text: p.textContent, notice: box(n), button: box(b), para: box(p), header: h ? box(h) : null,
    hitButton: at(bb.left + bb.width / 2, bb.top + bb.height / 2), hitParaTop: at(pb.left + 24, pb.top + 6), hitParaBottom: at(pb.left + 24, pb.bottom - 6),
    scrollY: Math.round(window.scrollY), docWidth: document.documentElement.scrollWidth, vw: window.innerWidth,
  };
});
const toasts = page => page.evaluate(() => [...document.querySelectorAll('[data-sonner-toast]')].map(t => t.textContent));
const hubLine = page => page.evaluate(() => [...document.querySelectorAll('span.rounded-full')].slice(0, 7).map(s => s.textContent).join(' / '));
const startBlocked = async (s, name) => {
  await s.goto();
  await s.page.locator('input[aria-label="Your player name"]').fill(name);
  await s.block(true);
  await s.page.locator('button:has-text("Enter the draft")').click();
  await s.page.waitForTimeout(900);
};
const retry = async s => { await s.block(false); await s.page.locator(`${NOTICE} button`).click(); await s.page.waitForTimeout(500); };

/* A. the write notice on a fresh career, a season played while refused, Retry, and a reload. */
async function flowWrite(browser, vp, slug, tag, deep) {
  const s = await open(browser, vp, slug, tag);
  const { page } = s;
  await s.goto();
  if (deep) await s.shot('create');
  await startBlocked(s, 'Review Probe');
  const m1 = await measure(page);
  check(m1 && m1.op === 'write', `${tag} ${slug}: a refused first save shows the write notice`, JSON.stringify(m1));
  check((await s.stored()) === null, `${tag} ${slug}: nothing is on disk while the write is refused`);
  note(`${tag} ${slug} toast`, await toasts(page));
  await s.shot('write-refused-hub');
  if (m1) check(m1.hitButton === 'notice' && m1.docWidth <= m1.vw, `${tag} ${slug}: Retry save is reachable and the page does not scroll sideways`, JSON.stringify(m1));
  /* the sticky notice against the sticky site header, after a scroll */
  await page.mouse.wheel(0, 500);
  await page.waitForTimeout(500);
  const m2 = await measure(page);
  note(`${tag} ${slug} notice after scroll`, m2);
  await s.shot('write-refused-scrolled');
  if (m2) check(m2.hitButton === 'notice' && m2.hitParaTop === 'notice', `${tag} ${slug}: after a scroll the notice words and its button are still on top`, JSON.stringify(m2));
  await page.evaluate(() => window.scrollTo(0, 0));
  /* a whole season and its offseason while every write is refused */
  await page.locator('button:has-text("Play the")').first().click();
  await page.waitForTimeout(700);
  await s.shot('reveal-while-refused');
  const trail = await toHub(page);
  note(`${tag} ${slug} season trail`, trail);
  check(trail[trail.length - 1] === 'hub', `${tag} ${slug}: the season and its offseason play to the hub while unsaved`, trail.join(','));
  check((await s.stored()) === null && !!(await measure(page)), `${tag} ${slug}: still unsaved and still saying so after the season`);
  const want = await s.lastAttempt();
  const line1 = await hubLine(page);
  await retry(s);
  const got = await s.stored();
  check(!(await measure(page)), `${tag} ${slug}: Retry save clears the notice once storage takes the write`);
  check(want && want.m === 'setItem' && got === want.v, `${tag} ${slug}: the recovered save is byte for byte the latest refused write`, `len want ${want?.v?.length} got ${got?.length}`);
  const parsed = got ? JSON.parse(got) : null;
  check(parsed?.c?.seasons?.length === 1, `${tag} ${slug}: the recovered save holds exactly one season`, parsed?.c?.seasons?.length);
  await s.shot('after-retry');
  await s.goto();
  const line2 = await hubLine(page);
  check(line1 === line2, `${tag} ${slug}: a reload opens on the same player, year and rating`, `${line1} || ${line2}`);
  const again = await s.stored();
  const p2 = again ? JSON.parse(again) : null;
  check(p2?.c?.seasons?.length === 1 && JSON.stringify(p2.c.seasons) === JSON.stringify(parsed.c.seasons), `${tag} ${slug}: the reload replays nothing (same one season, same line)`);
  if (deep) {
    await s.shot('hub-reloaded', true);
    for (const tile of ['Bank', 'My Player', 'Trophy']) {
      const t = page.locator('[data-career-hub-buttons] button', { hasText: tile }).first();
      if (await t.count()) {
        await t.click(); await page.waitForTimeout(700); await s.shot(`panel-${tile.replace(/\s+/g, '').toLowerCase()}`, true);
        const back = page.locator('button.rounded-full', { hasText: /^\s*Hub\s*$/ }).first();
        if (await back.count()) { await back.click(); await page.waitForTimeout(400); }
      }
    }
  }
  return s;
}

export { flowWrite, measure, toasts, hubLine, startBlocked, retry, PHONE, DESK, NOTICE };
