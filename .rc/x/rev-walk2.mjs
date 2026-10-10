// Reviewer's second walk (Round 1149): PLAY ON in the browser from saves built by the base code and by HEAD.
// Runs on the runner as .rc/x/rev-walk2.mjs beside .rc/x/rev-saves.json.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || '.tmp-fx/rev-walk2-out';
fs.mkdirSync(OUT, { recursive: true });
const HERE = path.dirname(fileURLToPath(import.meta.url));
const saves = JSON.parse(fs.readFileSync(path.join(HERE, 'rev-saves.json'), 'utf8'));
const ROUTE = { nfl: '/nfl-my-career', mlb: '/mlb-my-career', nhl: '/nhl-my-career' };
const KEY = { nfl: 'nfl-my-career-save-v1', mlb: 'mlb-my-career-save-v1', nhl: 'nhl-my-career-save-v1' };
const AWARD_NOTE = { nfl: 'First-team All-Pro', mlb: 'All-Star.', nhl: 'All-Star.' };
const RUNS = ['nfl_old', 'mlb_old', 'nhl_old', 'nfl_219old', 'nfl_made', 'mlb_made', 'nhl_dropped', 'mlb_lesser'].filter(k => saves[k]);
const SEASONS = Number(process.env.WALK_SEASONS || 8);
const results = [];
const browser = await chromium.launch();
const sleep = ms => new Promise(r => setTimeout(r, ms));

for (const key of RUNS) {
  const sport = key.split('_')[0];
  const rec = { key, seasons: 0, steps: 0, cards: [], reveals: 0, errors: [], coin: 0, contradictions: [], stalledOn: null, ended: '' };
  results.push(rec);
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  await context.route(/supabase\.co/, r => r.abort());
  const page = await context.newPage(); page.setDefaultTimeout(15000);
  page.on('pageerror', e => rec.errors.push(`pageerror: ${String(e.message).slice(0, 240)}`));
  await page.addInitScript(([k, v]) => {
    if (!sessionStorage.getItem('rev')) { localStorage.clear(); localStorage.setItem('cookie-consent', 'essential'); localStorage.setItem('rules-gate-seen:' + location.pathname, '1'); localStorage.setItem(k, v); sessionStorage.setItem('rev', '1'); }
  }, [KEY[sport], JSON.stringify(saves[key].save)]);
  const has = async sel => (await page.locator(sel).count()) > 0;
  const clickFirst = async (sel, opts) => { const l = page.locator(sel, opts).first(); if (await l.count() && await l.isVisible() && await l.isEnabled()) { await l.click({ timeout: 5000 }); return true; } return false; };
  let lastReveal = ''; let same = 0; let prev = '';
  try {
    await page.goto(BASE + ROUTE[sport], { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('[data-rivalry-event], [data-career-hub-buttons]', { timeout: 45000 });
    while (rec.steps < 220 && rec.seasons <= SEASONS) {
      rec.steps += 1;
      await sleep(260);
      const body = await page.evaluate(() => document.body.innerText.slice(0, 6000));
      if (body === prev) { same += 1; if (same >= 5) { rec.stalledOn = body.replace(/\n+/g, ' | ').slice(0, 500); break; } } else same = 0;
      prev = body;
      if (await has('[data-rivalry-event]')) {
        const card = await page.evaluate(() => [...document.querySelectorAll('[data-rivalry-event] p')].map(p => p.innerText.trim()));
        const text = card.join(' / ');
        const mine = /you are on one|you are on the first team/.test(text) ? 'made' : /you are not on/.test(text) ? 'dropped' : '';
        rec.cards.push({ season: rec.seasons, text: text.slice(0, 330), mine, revealHadAward: lastReveal.includes(AWARD_NOTE[sport]) });
        if (/50\/50/.test(text) && rec.seasons > 0) rec.coin += 1;
        if (rec.seasons > 0 && mine === 'made' && !lastReveal.includes(AWARD_NOTE[sport])) rec.contradictions.push(`season ${rec.seasons}: made card, the season card has no "${AWARD_NOTE[sport]}": ${lastReveal.slice(0, 200)}`);
        if (rec.seasons > 0 && mine === 'dropped' && lastReveal.includes(AWARD_NOTE[sport])) rec.contradictions.push(`season ${rec.seasons}: dropped card, the season card holds "${AWARD_NOTE[sport]}"`);
        if (rec.cards.length <= 3) await page.screenshot({ path: path.join(OUT, `play-${key}-card${rec.cards.length}.jpg`), type: 'jpeg', quality: 65 });
        await clickFirst('[data-rivalry-event] button', { hasText: 'Continue' });
      } else if (await has('[data-rivalry-choice]')) {
        if (!(await clickFirst('[data-rivalry-option="0"]'))) await clickFirst('[data-rivalry-choice] button', { hasText: 'Continue' });
      } else if (await has('[data-career-decision-outcome]')) {
        await clickFirst('[data-decision-continue]');
      } else if (await has('[data-season-reveal]')) {
        lastReveal = await page.evaluate(() => document.querySelector('[data-season-reveal]').innerText.replace(/\n+/g, ' | '));
        rec.reveals += 1;
        if (rec.reveals === 1) await page.screenshot({ path: path.join(OUT, `play-${key}-reveal1.jpg`), type: 'jpeg', quality: 65 });
        await clickFirst('[data-season-reveal] button', { hasText: 'Continue' });
      } else if (await has('[data-career-event]')) {
        await clickFirst('[data-career-decision-option]');
      } else if (await has('[data-fa-offer]')) {
        if (!(await clickFirst('[data-fa-offer] button', { hasText: 'Sign' }))) await clickFirst('main button', { hasText: /continue|confirm|done|play/i });
      } else if (await clickFirst('button', { hasText: 'Sign it' })) { /* the extension, signed */
      } else if (await clickFirst('button', { hasText: 'Play the year out' })) { /* the extension, declined */
      } else if (await has('[data-career-hub-buttons]') && await clickFirst('button', { hasText: /^\s*Play the \d{4}/ })) {
        rec.seasons += 1;
      } else if (/retire|Hall of Fame|legacy/i.test(body) && !(await has('[data-career-hub-buttons]'))) {
        if (!(await clickFirst('main button', { hasText: /continue|confirm|yes|keep playing|one more|not yet/i }))) { rec.ended = 'a retirement screen'; break; }
      } else if (!(await clickFirst('main button', { hasText: /continue|confirm|yes|done|next|ok\b|got it|close/i }))) {
        rec.stalledOn = `no handler: ${body.replace(/\n+/g, ' | ').slice(0, 400)}`; break;
      }
    }
    if (!rec.ended) rec.ended = rec.stalledOn ? 'stalled' : `stopped after ${rec.seasons} Play presses`;
  } catch (e) { rec.failed = String(e.message).split('\n')[0].slice(0, 300); }
  try { await page.screenshot({ path: path.join(OUT, `play-${key}-end.jpg`), type: 'jpeg', quality: 65, fullPage: true }); } catch { /* nothing to show */ }
  rec.endSave = await page.evaluate(k => { const s = JSON.parse(localStorage.getItem(k) || 'null'); const c = s?.c; return c ? { seasons: c.seasons.length, retired: c.retired, morale: c.morale, pending: c.pendingRivalryEvent?.id ?? null, awards: c.seasons.flatMap(x => x.awards ?? []).length } : null; }, KEY[sport]).catch(() => null);
  await context.close();
}
await browser.close();
fs.writeFileSync(path.join(OUT, 'walk2.json'), JSON.stringify(results, null, 1));
for (const r of results) console.log(`${r.key}: ${r.ended}; ${r.steps} steps, ${r.reveals} season cards, ${r.cards.length} rivalry cards (${r.cards.filter(c => c.mine).length} roster), coin ${r.coin}, contradictions ${r.contradictions.length}, errors ${r.errors.length}${r.failed ? `, FAILED ${r.failed}` : ''}`);
const bad = results.filter(r => r.failed || r.errors.length || r.coin || r.contradictions.length);
process.exit(bad.length ? 1 : 0);
