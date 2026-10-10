// Reviewer's browser walk (Round 1149). Runs on the runner as .rc/x/rev-walk.mjs beside .rc/x/rev-saves.json.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || '.tmp-fx/rev-walk-out';
fs.mkdirSync(OUT, { recursive: true });
const HERE = path.dirname(fileURLToPath(import.meta.url));
const saves = JSON.parse(fs.readFileSync(path.join(HERE, 'rev-saves.json'), 'utf8'));
const ROUTE = { nfl: '/nfl-my-career', mlb: '/mlb-my-career', nhl: '/nhl-my-career' };
const KEY = { nfl: 'nfl-my-career-save-v1', mlb: 'mlb-my-career-save-v1', nhl: 'nhl-my-career-save-v1' };
const ALL = Object.keys(saves);
const FEW = ['nfl_made', 'mlb_dropped', 'nhl_old', 'nfl_219new', 'mlb_rich', 'nhl_lesser'].filter(k => saves[k]);
const CONFIGS = [
  { tag: 'p390', w: 390, h: 844, rm: 'no-preference', keys: ALL },
  { tag: 'd1280', w: 1280, h: 900, rm: 'no-preference', keys: ALL },
  { tag: 'p390rm', w: 390, h: 844, rm: 'reduce', keys: FEW },
  { tag: 'd1280rm', w: 1280, h: 900, rm: 'reduce', keys: FEW },
];
const results = [];
const browser = await chromium.launch();
const sleep = ms => new Promise(r => setTimeout(r, ms));
// the fleet that built these saves never answers a rival CHOICE, so one from an older season lingers: the board never leaves one unanswered
const clean = s => { const x = JSON.parse(JSON.stringify(s)); delete x.c.pendingRivalryChoice; return x; };
const readSave = (page, key) => page.evaluate(k => { const s = JSON.parse(localStorage.getItem(k) || 'null'); const c = s?.c; return c ? { morale: c.morale, fanbase: c.fanbase, heat: c.rivalryIntensity ?? 0, ovr: c.ovr, netWorth: c.netWorth ?? null, pending: c.pendingRivalryEvent ?? null, last: c.lastRivalryEventId ?? null, phase: s.phase } : null; }, key);
const overflow = page => page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));

for (const cfg of CONFIGS) {
  for (const key of cfg.keys) {
    const sport = key.split('_')[0];
    const rec = { cfg: cfg.tag, key, note: saves[key].note, errors: [], blocked: 0 };
    results.push(rec);
    const context = await browser.newContext({ viewport: { width: cfg.w, height: cfg.h }, reducedMotion: cfg.rm });
    await context.route(/supabase\.co/, r => { rec.blocked += 1; return r.abort(); });
    const page = await context.newPage(); page.setDefaultTimeout(15000); page.setDefaultTimeout(15000);
    page.on('pageerror', e => rec.errors.push(`pageerror: ${String(e.message).slice(0, 200)}`));
    page.on('console', m => { if (m.type() === 'error' && !/supabase|net::ERR_FAILED|Failed to load resource/.test(m.text())) rec.errors.push(`console: ${m.text().slice(0, 200)}`); });
    await page.addInitScript(([k, v]) => {
      if (!sessionStorage.getItem('rev')) { localStorage.clear(); localStorage.setItem('cookie-consent', 'essential'); localStorage.setItem('rules-gate-seen:' + location.pathname, '1'); localStorage.setItem(k, v); sessionStorage.setItem('rev', '1'); }
    }, [KEY[sport], JSON.stringify(clean(saves[key].save))]);
    try {
      await page.goto(BASE + ROUTE[sport], { waitUntil: 'domcontentloaded', timeout: 60000 });
      const hasCard = !!saves[key].save.c.pendingRivalryEvent;
      if (hasCard) {
        await page.waitForSelector('[data-rivalry-event]', { timeout: 45000 });
        rec.atMount = await page.evaluate(() => { const t = document.querySelector('[data-rivalry-event] .cm-slam'); const cs = t ? getComputedStyle(t) : null; return cs ? { anim: cs.animationName, dur: cs.animationDuration, opacity: cs.opacity } : null; });
        await sleep(1900);
        rec.card = await page.evaluate(() => {
          const root = document.querySelector('[data-rivalry-event]');
          const ps = [...root.querySelectorAll('p')].map(p => p.innerText.trim());
          const btn = [...root.querySelectorAll('button')].find(b => /Continue/.test(b.innerText));
          const r = btn.getBoundingClientRect(); const rr = root.getBoundingClientRect();
          const cut = [...root.querySelectorAll('p, span')].filter(e => e.scrollWidth > e.clientWidth + 1).map(e => e.innerText.slice(0, 60));
          const t = root.querySelector('.cm-slam'); const cs = getComputedStyle(t);
          return { ps, btn: { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right) }, root: { left: Math.round(rr.left), right: Math.round(rr.right), bottom: Math.round(rr.bottom) }, cut, settled: { opacity: cs.opacity, transform: cs.transform }, vh: window.innerHeight, scrollY: window.scrollY };
        });
        rec.cardOverflow = await overflow(page);
        await page.screenshot({ path: path.join(OUT, `${cfg.tag}-${key}-card.jpg`), type: 'jpeg', quality: 72 });
        rec.before = await readSave(page, KEY[sport]);
        await page.locator('[data-rivalry-event] button', { hasText: 'Continue' }).click();
      }
      /* Round 1039's retirement talk comes after the rivalry card on a save inside its rule: answer One more year. */
      await page.waitForFunction(() => !!document.querySelector('[data-career-hub-buttons]') || /Is it time\?/.test(document.body.innerText), null, { timeout: 30000 });
      if (!(await page.locator('[data-career-hub-buttons]').count())) {
        rec.talk = true;
        rec.savedBeforeTalk = await readSave(page, KEY[sport]);
        await page.screenshot({ path: path.join(OUT, `${cfg.tag}-${key}-talk.jpg`), type: 'jpeg', quality: 60 });
        await page.locator('button', { hasText: 'One more year' }).click();
      }
      await page.waitForSelector('[data-career-hub-buttons]', { timeout: 30000 });
      await sleep(900);
      rec.after = await readSave(page, KEY[sport]);
      rec.feed = await page.evaluate(() => document.body.innerText.split('\n').map(x => x.trim()).filter(x => /🗳️|🥊/.test(x)).slice(0, 6));
      rec.tile = await page.evaluate(() => {
        const b = [...document.querySelectorAll('[data-career-hub-buttons] button')].find(x => /trophy case/i.test(x.innerText));
        if (!b) return null;
        const r = b.getBoundingClientRect();
        const cut = [...b.querySelectorAll('*')].filter(e => e.children.length === 0 && e.scrollWidth > e.clientWidth + 1).map(e => e.innerText);
        return { text: b.innerText.replace(/\n+/g, ' | '), w: Math.round(r.width), h: Math.round(r.height), cut };
      });
      rec.hubOverflow = await overflow(page);
      rec.scrollAfterTap = await page.evaluate(() => window.scrollY);
      await page.screenshot({ path: path.join(OUT, `${cfg.tag}-${key}-hub.jpg`), type: 'jpeg', quality: 62 });
      await page.evaluate(() => { const b = [...document.querySelectorAll('[data-career-hub-buttons] button')].find(x => /trophy case/i.test(x.innerText)); b?.scrollIntoView({ block: 'center' }); });
      await sleep(250);
      await page.screenshot({ path: path.join(OUT, `${cfg.tag}-${key}-tile.jpg`), type: 'jpeg', quality: 62 });
      if (/lesser|rich|made/.test(key)) {
        await page.locator('[data-career-hub-buttons] button', { hasText: 'Trophy Case' }).click();
        await page.waitForSelector('[data-trophy-case]', { timeout: 20000 });
        rec.caseAtMount = await page.evaluate(() => { const t = document.querySelector('[data-trophy-case] .cm-tick-in'); const cs = t ? getComputedStyle(t) : null; return cs ? { anim: cs.animationName, dur: cs.animationDuration } : null; });
        await sleep(1500);
        rec.case = await page.evaluate(() => document.querySelector('[data-trophy-case]').innerText.replace(/\n+/g, ' | '));
        rec.caseOverflow = await overflow(page);
        rec.caseTop = await page.evaluate(() => Math.round(document.querySelector('[data-trophy-case]').getBoundingClientRect().top));
        await page.screenshot({ path: path.join(OUT, `${cfg.tag}-${key}-case.jpg`), type: 'jpeg', quality: 62 });
      }
    } catch (e) {
      rec.failed = String(e.message).split('\n')[0].slice(0, 300);
      try { await page.screenshot({ path: path.join(OUT, `${cfg.tag}-${key}-FAILED.jpg`), type: 'jpeg', quality: 60 }); } catch { /* nothing to show */ }
    }
    await context.close();
  }
}
await browser.close();
fs.writeFileSync(path.join(OUT, 'walk.json'), JSON.stringify(results, null, 1));
for (const r of results) console.log(`REC ${JSON.stringify({ cfg: r.cfg, key: r.key, atMount: r.atMount, card: r.card && { ps: r.card.ps, btn: r.card.btn, cut: r.card.cut, settled: r.card.settled, vh: r.card.vh }, cardOverflow: r.cardOverflow, talk: r.talk, beforeTalk: r.savedBeforeTalk && { morale: r.savedBeforeTalk.morale, fanbase: r.savedBeforeTalk.fanbase, heat: r.savedBeforeTalk.heat, pending: r.savedBeforeTalk.pending?.id ?? null, last: r.savedBeforeTalk.last }, before: r.before && { morale: r.before.morale, fanbase: r.before.fanbase, heat: r.before.heat }, after: r.after && { morale: r.after.morale, fanbase: r.after.fanbase, heat: r.after.heat, pending: r.after.pending?.id ?? null, last: r.after.last }, feed: r.feed, tile: r.tile, hubOverflow: r.hubOverflow, scrollAfterTap: r.scrollAfterTap, caseAtMount: r.caseAtMount, case: r.case, caseOverflow: r.caseOverflow, caseTop: r.caseTop, blocked: r.blocked, errors: r.errors, failed: r.failed })}`);
const failed = results.filter(r => r.failed || r.errors.length);
console.log(`walk: ${results.length} loads, ${failed.length} with a failure or a page error`);
for (const r of failed) console.log(`  ${r.cfg} ${r.key}: ${r.failed ?? ''} ${r.errors.join(' ; ')}`.slice(0, 400));
process.exit(failed.length ? 1 : 0);
