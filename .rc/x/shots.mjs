// Review of Round 1536: what a player sees once the first visit dialog's own button is scrolled into reach, banner unanswered.
// env: ONLY=/a,/b  SIZES=320x640,390x844  TAG=name. Screens (jpeg) to $RC_OUT. Exit 0 always.
import fs from 'node:fs';
import path from 'node:path';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const { chromium } = pw;
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || '/tmp/rv-out';
const TAG = process.env.TAG || 'shot';
fs.mkdirSync(OUT, { recursive: true });
const BANNER = '[role="region"][aria-label="Cookie choices"], [role="dialog"][aria-label="Cookie choices"]';
const routes = (process.env.ONLY || '/idle-arena').split(',');
const sizes = (process.env.SIZES || '320x640,390x844').split(',').map(s => s.split('x').map(Number));
const browser = await chromium.launch();
for (const route of routes) {
  for (const [w, h] of sizes) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    const page = await ctx.newPage();
    await page.route(/supabase\.co/, r => r.abort());
    const k = `${TAG}-${route.replace(/\//g, '')}-${w}x${h}`;
    try {
      await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForFunction(() => (document.body?.innerText ?? '').trim().length > 80, null, { timeout: 15000 }).catch(() => {});
      await page.waitForSelector(BANNER, { timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(1500);
      const m = await page.evaluate(B => {
        const banner = document.querySelector(B);
        const ds = [...document.querySelectorAll('[role="dialog"],[aria-modal="true"]')].filter(d => !(banner && banner.contains(d)) && d.getBoundingClientRect().height > 2);
        const d = ds[ds.length - 1];
        if (!d) return { dialog: 'none' };
        const btns = [...d.querySelectorAll('button')].filter(b => b.getBoundingClientRect().width > 2);
        const GO = /^(let'?s (go|play)|play|start|got it|open the doors|continue)/i;
        const b = btns.find(x => GO.test((x.textContent || '').trim())) || btns.find(x => /bg-primary/.test(String(x.className))) || btns[btns.length - 1];
        b.scrollIntoView({ block: 'nearest' });
        const r = b.getBoundingClientRect(), dr = d.getBoundingClientRect(), br = banner ? banner.getBoundingClientRect() : null;
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return { dialog: (d.getAttribute('aria-label') || '').slice(0, 30), box: [Math.round(dr.top), Math.round(dr.bottom)], boxH: Math.round(dr.height), contentH: d.scrollHeight,
          button: (b.textContent || '').trim().slice(0, 24), btn: [Math.round(r.top), Math.round(r.bottom)], banner: br ? [Math.round(br.top), Math.round(br.bottom)] : null,
          at: !hit ? 'nothing' : b.contains(hit) ? 'button' : banner && banner.contains(hit) ? 'BANNER' : hit.tagName };
      }, BANNER);
      await page.screenshot({ path: path.join(OUT, `${k}.jpg`), type: 'jpeg', quality: 60 });
      console.log(`${k}: ${JSON.stringify(m)}`);
    } catch (e) { console.log(`${k}: ERROR ${String(e.message).split('\n')[0]}`); }
    await ctx.close();
  }
}
await browser.close();
console.log('shots done');
