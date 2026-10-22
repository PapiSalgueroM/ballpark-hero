/* Round 1537 probe (not committed): the five Connections games at 320x640, 375x812 and 390x844.
   For each: raw box overlaps (the old sweep rule), reachable box overlaps (the new rule), and for every
   raw pair how much of each control a finger can reach and what a tap at its centre hits once it is in view.
   Screens at 390 for /nba-connections and /nhl-connections: the bench as played, and the inner box
   scrolled to the name the old sweep blamed. Writes conn.json and PNGs into $RC_OUT. */
import fs from 'node:fs';
import path from 'node:path';
import pw from '../../scripts/lib/playwrightLoader.mjs';
import { answerConsent } from '../../scripts/lib/answerConsent.mjs';

const { chromium, devices } = pw;
const BASE = process.env.BASE ?? 'http://localhost:4173';
const OUT = process.env.RC_OUT ?? '.tmp-probe';
fs.mkdirSync(OUT, { recursive: true });
const ROUTES = ['/connections', '/baseball-connections', '/nba-connections', '/nfl-connections', '/nhl-connections'];
const SIZES = [[320, 640], [375, 812], [390, 844]];
const phone = devices['iPhone 13'];
const results = [];
let bad = 0;

const measure = () => {
  const doc = document.documentElement;
  const main = document.querySelector('main') ?? document.body;
  const reachable = (el, r) => {
    let left = r.left, top = r.top, right = r.right, bottom = r.bottom;
    let pos = getComputedStyle(el).position;
    for (let a = el.parentElement; a && a !== document.body && a !== doc; a = a.parentElement) {
      if (pos === 'fixed') break;
      const cs = getComputedStyle(a);
      if (pos === 'absolute' && cs.position === 'static') continue;
      if (cs.display !== 'inline' && cs.display !== 'contents') {
        const b = a.getBoundingClientRect();
        const cl = b.left + a.clientLeft, ct = b.top + a.clientTop;
        if (cs.overflowX !== 'visible') { left = Math.max(left, cl); right = Math.min(right, cl + a.clientWidth); }
        if (cs.overflowY !== 'visible') { top = Math.max(top, ct); bottom = Math.min(bottom, ct + a.clientHeight); }
      }
      pos = cs.position;
    }
    return right > left && bottom > top ? { x: left, y: top, w: right - left, h: bottom - top } : null;
  };
  const els = Array.from(main.querySelectorAll('a, button, [role="button"]'))
    .filter(el => !el.closest('.dukb-ticker-track') && !el.closest('footer') && !el.closest('nav'));
  const raw = [], reach = [];
  els.forEach((el, i) => {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const label = (el.textContent ?? '').trim().slice(0, 22);
    raw.push({ i, label, x: r.x, y: r.y, w: r.width, h: r.height });
    const v = reachable(el, r);
    if (v) reach.push({ i, label, ...v });
  });
  const pairs = boxes => {
    const hits = [];
    for (let a = 0; a < boxes.length; a++) for (let b = a + 1; b < boxes.length; b++) {
      const p = boxes[a], q = boxes[b];
      const ox = Math.min(p.x + p.w, q.x + q.w) - Math.max(p.x, q.x);
      const oy = Math.min(p.y + p.h, q.y + q.h) - Math.max(p.y, q.y);
      if (ox > 0 && oy > 0 && ox * oy > 0.7 * p.w * p.h && ox * oy > 0.7 * q.w * q.h) hits.push([p.i, q.i, `${p.label} over ${q.label}`]);
    }
    return hits;
  };
  const rawHits = pairs(raw), reachHits = pairs(reach);
  const detail = rawHits.map(([a, b, text]) => {
    const one = i => {
      const el = els[i], r = el.getBoundingClientRect(), v = reachable(el, r);
      return { label: (el.textContent ?? '').trim().slice(0, 22), reachablePct: v ? Math.round(100 * v.w * v.h / (r.width * r.height)) : 0 };
    };
    return { text, a: one(a), b: one(b) };
  });
  return { controls: raw.length, rawHits: rawHits.map(h => h[2]), reachHits: reachHits.map(h => h[2]), detail };
};

/* What a tap at the centre of the named control hits once it is scrolled into view. */
const tapHits = async (page, name) => {
  const btn = page.getByRole('button', { name, exact: true }).first();
  if (await btn.count() === 0) return null;
  await btn.evaluate(el => el.scrollIntoView({ block: 'center', inline: 'nearest' }));
  await page.waitForTimeout(150);
  return btn.evaluate(el => {
    const r = el.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    const owner = hit?.closest('button, a, [role="button"]');
    return { hitsItself: !!owner && owner === el, hit: (owner?.textContent ?? hit?.tagName ?? 'nothing').trim().slice(0, 30) };
  });
};

const browser = await chromium.launch();
for (const [width, height] of SIZES) {
  for (const route of ROUTES) {
    const ctx = await browser.newContext({ ...phone, viewport: { width, height } });
    const page = await ctx.newPage();
    await page.route(/supabase\.co/, r => r.abort());
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(600);
    await answerConsent(page); await page.waitForTimeout(300);
    await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(800);
    const first = await page.evaluate(measure);
    await page.keyboard.press('Escape'); await page.waitForTimeout(400);
    const closed = await page.evaluate(measure);
    /* The two action buttons first, with the inner box still at its top (the state the old sweep blamed),
       then each blamed control, which scrolls it into view. */
    const taps = {};
    for (const name of ['Clear draft', 'Submit five']) taps[name] = await tapHits(page, name);
    for (const d of closed.detail) for (const name of [d.a.label, d.b.label]) if (!(name in taps)) taps[name] = await tapHits(page, name);
    const row = { route, width, height, first, closed, taps };
    results.push(row);
    const tapLine = Object.entries(taps).filter(([, t]) => t).map(([n, t]) => `${n}->${t.hitsItself ? 'itself' : t.hit}`).join('; ');
    console.log(`${width}x${height} ${route}: raw ${first.rawHits.length}/${closed.rawHits.length} [${closed.rawHits.join(' | ')}], reachable ${first.reachHits.length}/${closed.reachHits.length}, clipped share ${closed.detail.map(d => `${d.a.label} ${d.a.reachablePct}%`).join(', ')}; taps ${tapLine}`);
    if (first.reachHits.length || closed.reachHits.length) bad += 1;
    if (Object.values(taps).some(t => t && !t.hitsItself)) bad += 1;
    if (width === 390 && (route === '/nba-connections' || route === '/nhl-connections')) {
      const tag = route.slice(1, 4);
      await page.getByRole('group', { name: 'Available players' }).evaluate(el => { el.scrollTop = 0; });
      await page.locator('section[aria-label="Planning bench"]').evaluate(el => el.scrollIntoView({ block: 'start' }));
      await page.evaluate(() => window.scrollBy(0, -8)); await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(OUT, `${tag}-390-bench.png`) });
      const blamed = closed.detail[0]?.a.label;
      if (blamed) {
        await page.getByRole('group', { name: 'Available players' }).getByRole('button', { name: blamed, exact: true })
          .evaluate(el => el.scrollIntoView({ block: 'nearest' }));
        await page.waitForTimeout(300);
        await page.screenshot({ path: path.join(OUT, `${tag}-390-scrolled.png`) });
      }
    }
    await ctx.close();
  }
}
await browser.close();
fs.writeFileSync(path.join(OUT, 'conn.json'), JSON.stringify(results, null, 1));
console.log(bad ? `connProbe: ${bad} problem rows` : 'connProbe: no reachable overlap anywhere, and every tap lands on the control it aims at');
process.exit(bad ? 1 : 0);
