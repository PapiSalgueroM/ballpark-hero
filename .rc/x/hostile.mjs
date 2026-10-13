/* qa-us hunt: hostile and damaged saves on the four US careers. A quick start makes a real save, the walk damages
   one field the way an old version, a full disk or a curious player could, reloads, and records what the page does.
   Env: SPORTS (comma list) W H */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const pw = (await import(pathToFileURL(path.resolve('scripts/lib/playwrightLoader.mjs')).href)).default;
const { chromium } = pw;
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || '.tmp-fx/out';
fs.mkdirSync(OUT, { recursive: true });
const W = Number(process.env.W || 390), H = Number(process.env.H || 844);
const SPORTS = (process.env.SPORTS || 'nba,nfl,mlb,nhl').split(',');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = [];
const MUTATIONS = [
  ['name-number', s => { s.c.name = 5; }],
  ['seasons-string', s => { s.c.seasons = 'x'; }],
  ['year-text', s => { s.c.year = 'soon'; }],
  ['salary-missing', s => { delete s.c.salary; }],
  ['networth-huge', s => { s.c.netWorth = 1e15; s.c.salary = -3; }],
  ['phase-event-nosummer', s => { s.phase = 'event'; delete s.c.summer; }],
  ['appearance-null', s => { s.c.appearance = null; }],
  ['team-unknown', s => { s.c.team = 'ZZZ'; }],
];
const browser = await chromium.launch({ args: ['--no-sandbox'] });
for (const sport of SPORTS) {
  const KEY = `${sport}-my-career-save-v1`;
  /* one real quick start save per sport */
  let good = null;
  {
    const ctx = await browser.newContext({ viewport: { width: W, height: H } });
    await ctx.addInitScript(r => { try { localStorage.setItem('cookie-consent', 'essential'); localStorage.setItem('rules-gate-seen:' + r, '1'); } catch { /* none */ } }, `/${sport}-my-career`);
    const page = await ctx.newPage();
    await page.route(/supabase\.co/, r => r.abort());
    await page.goto(`${BASE}/${sport}-my-career`, { waitUntil: 'domcontentloaded' });
    await sleep(3000);
    await page.fill('input[aria-label="Your player name"]', 'Hostile Test');
    await page.locator('#dukb-main button').filter({ hasText: /^Enter the draft$/ }).first().click();
    await sleep(1500);
    good = await page.evaluate(k => localStorage.getItem(k), KEY);
    await ctx.close();
  }
  if (!good) { log.push({ sport, error: 'no save made' }); continue; }
  for (const [name, mutate] of MUTATIONS) {
    const s = JSON.parse(good);
    mutate(s);
    const ctx = await browser.newContext({ viewport: { width: W, height: H } });
    await ctx.addInitScript(([k, v, r]) => { try { if (!sessionStorage.getItem('qa-set')) { localStorage.setItem(k, v); sessionStorage.setItem('qa-set', '1'); } localStorage.setItem('cookie-consent', 'essential'); localStorage.setItem('rules-gate-seen:' + r, '1'); } catch { /* none */ } }, [KEY, JSON.stringify(s), `/${sport}-my-career`]);
    const page = await ctx.newPage();
    await page.route(/supabase\.co/, r => r.abort());
    const errs = [];
    page.on('pageerror', e => errs.push(`pageerror ${String(e).slice(0, 160)}`));
    page.on('console', m => { if (m.type() === 'error' && !/supabase|net::/.test(m.text())) errs.push(m.text().split('\n')[0].slice(0, 160)); });
    await page.goto(`${BASE}/${sport}-my-career`, { waitUntil: 'domcontentloaded' });
    await sleep(3500);
    const seen = await page.evaluate(() => {
      const main = document.querySelector('#dukb-main');
      const body = document.body.innerText;
      return {
        h1: [...document.querySelectorAll('h1,h2')].map(h => h.innerText).slice(0, 3),
        buttons: [...document.querySelectorAll('button')].filter(b => b.offsetParent).map(b => b.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 12),
        hasMain: !!main,
        text: body.slice(0, 600),
        bad: (body.match(/.{0,40}(undefined|NaN|\[object|Infinity|e\+\d).{0,40}/) || [null])[0],
      };
    });
    const f = `hostile-${sport}-${W}-${name}.jpg`;
    await page.screenshot({ path: path.join(OUT, f), type: 'jpeg', quality: 55 });
    /* can the player get out? */
    const recover = page.locator('button').filter({ hasText: /New career|Start over|Reset|Try again|Reload|Create/i }).first();
    const canRecover = await recover.isVisible().catch(() => false);
    log.push({ sport, name, errs: errs.slice(0, 4), seen, shot: f, canRecover, after: (await page.evaluate(k => localStorage.getItem(k), KEY))?.slice(0, 80) });
    console.log(`${sport} ${name}: errors ${errs.length}${errs[0] ? ` (${errs[0].slice(0, 110)})` : ''}; heading ${JSON.stringify(seen.h1)}; buttons ${seen.buttons.slice(0, 4).join(' | ').slice(0, 120)}; bad ${seen.bad ?? '-'}; recover ${canRecover}`);
    await ctx.close();
  }
}
fs.writeFileSync(path.join(OUT, `hostile-${W}-log.json`), JSON.stringify(log, null, 1));
await browser.close();
