// Review of Round 1579 (runner lens): the daily caption across midnight ET, never committed. Mount at 23:59:50 ET
// on 2026-11-01 (04:59:50 UTC on 2026-11-02, EST), let the boot ladder load, then move the clock to 00:00:10 ET on
// 2026-11-02 and press Unlimited then Daily (startRun re-deals the daily through buildFreshLadder, which reads the
// clock itself). Prints the caption's date and whether the board is the boot ladder or a new one, for BASE.
// supabase.co is answered in the browser from committed fixture files; every other foreign host is aborted.
// Exit 0 always when it ran (it reports, it does not judge), 2 when it could not run.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const HEAD = (process.env.BASE || 'http://localhost:4173').replace(/\/$/, '');
const WHO = process.env.WHO || 'head';
const OUT = process.env.RC_OUT || path.resolve('walk-out');
const J = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const fnv = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; };
const POS = ['Goalkeeper', 'Centre-Back', 'Left-Back', 'Right-Back', 'Defensive Midfield', 'Central Midfield', 'Attacking Midfield', 'Left Winger', 'Right Winger', 'Centre-Forward'];
const market = J('scripts/data/alphabetSprintPool.json').rows.filter(r => r.player_name && r.market_value_usd)
  .map(r => ({ player_name: r.player_name, nationality: r.nationality, club: r.club, market_value_usd: Number(r.market_value_usd), position: POS[fnv(r.player_name) % POS.length] }))
  .sort((a, b) => b.market_value_usd - a.market_value_usd || (a.player_name < b.player_name ? -1 : a.player_name > b.player_name ? 1 : 0));
const ballon = J('scripts/data/ballonDorVerified2026-09.json').rows.map(r => ({ year: r.year, rank: r.rank, player_name: r.player_name, nationality: r.nationality, club: r.club, award_type: r.award_type }));
async function serve(route) {
  const req = route.request();
  const url = new URL(req.url());
  const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-expose-headers': 'content-range' };
  if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
  const table = url.pathname.split('/').pop();
  if (req.method() === 'GET' && url.pathname.includes('/rest/v1/')) {
    if (table === 'player_market_values_dedup') { const off = Number(url.searchParams.get('offset') || 0), lim = Number(url.searchParams.get('limit') || 1000); return route.fulfill({ status: 200, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify(market.slice(off, off + lim)) }); }
    if (table === 'ballon_dor') return route.fulfill({ status: 200, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify(ballon) });
    if (table === 'shirt_number_puzzles') return route.fulfill({ status: 500, headers: { ...cors, 'content-type': 'application/json' }, body: '{"message":"fails on purpose"}' });
  }
  return route.abort();
}
const READ = () => {
  const label = [...document.querySelectorAll('span')].find(s => /^Question \d+ of \d+/.test((s.textContent || '').trim()));
  const cap = [...document.querySelectorAll('p')].find(p => /^Today's ladder, /.test((p.textContent || '').trim()));
  let ladder = null;
  if (label) {
    const key = Object.keys(label).find(k => k.startsWith('__reactFiber$'));
    for (let f = key ? label[key] : null; f && !ladder; f = f.return) {
      for (let h = f.memoizedState; h && typeof h === 'object' && 'next' in h; h = h.next) {
        const v = h.memoizedState;
        if (Array.isArray(v) && v.length === 15 && v.every(q => q && typeof q.question === 'string')) { ladder = v.map(q => q.question); break; }
      }
    }
  }
  return { caption: cap ? cap.textContent.trim() : null, first: ladder ? ladder[0] : null, ladder };
};
const browser = await chromium.launch();
try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  await ctx.route('**/*', route => { const u = route.request().url(); if (u.startsWith(HEAD)) return route.continue(); if (/supabase\.co/.test(u)) return serve(route); return route.abort(); });
  await ctx.addInitScript(() => { try { localStorage.setItem('cookie-consent-v2', JSON.stringify({ version: 2, advertising: false, analytics: false, updatedAt: Date.now() })); localStorage.setItem('dukb-rules-seen-sports-millionaire', '1'); } catch {} });
  const page = await ctx.newPage();
  await page.clock.setFixedTime(new Date('2026-11-02T04:59:50Z'));
  await page.goto(`${HEAD}/sports-millionaire`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: "Let's Play!" }).click({ timeout: 15000 }).catch(() => {});
  const okBoot = await page.waitForFunction(() => [...document.querySelectorAll('span')].some(s => /^Question 1 of 15/.test((s.textContent || '').trim())), null, { timeout: 30000 }).then(() => true).catch(() => false);
  if (!okBoot) { console.log('midnight: could not run: no question 1'); process.exit(2); }
  const boot = await page.evaluate(READ);
  console.log(`${WHO} at 23:59:50 ET 2026-11-01: caption "${boot.caption}", board "${boot.first}"`);
  await page.clock.setFixedTime(new Date('2026-11-02T05:00:10Z'));
  const click = re => page.evaluate(src => { const b = [...document.querySelectorAll('button')].find(x => new RegExp(src).test((x.textContent || '').trim()) && !x.disabled); if (b) b.click(); return !!b; }, re);
  await click('Unlimited$'); await page.waitForTimeout(400); await click('Daily$'); await page.waitForTimeout(600);
  const after = await page.evaluate(READ);
  const same = JSON.stringify(after.ladder) === JSON.stringify(boot.ladder);
  console.log(`${WHO} at 00:00:10 ET 2026-11-02 after Unlimited then Daily: caption "${after.caption}", board "${after.first}", the board is ${same ? 'the boot ladder (2026-11-01)' : 'a NEW ladder (2026-11-02)'}`);
  await page.screenshot({ path: path.join(OUT, `midnight-${WHO}.png`) });
  await ctx.close();
} finally { await browser.close(); }
console.log('midnight: reported');
