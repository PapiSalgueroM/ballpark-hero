/**
 * Round 287 browser harness: the score cards on the strip, which no other
 * check can see.
 *
 * The sandbox has no route to the database, so every other browser harness
 * aborts the Supabase host and the ticker they measure carries the site's own
 * lines and nothing else. sweepContrast therefore never measured a score card.
 * This harness answers the scores request itself with a fixture of real row
 * shapes (a live game, a final, four fixtures across soccer, MLB and the NFL)
 * and then measures what the strip does with them:
 *
 *   1. THE CARDS ARE THERE AND IN THE RIGHT ORDER: live first, then the
 *      fixtures by kickoff, then the final; the brand block says LIVE; every
 *      card is a link to its sport's hub with an aria-label that reads as a
 *      sentence; American sports read away at home and soccer home v away.
 *   2. EVERY WORD ON EVERY CARD CLEARS 4.5 TO 1 against the bar, alpha
 *      composited, the same bar sweepContrast holds the rest of the site to.
 *   3. THE CARDS NEVER REACH A SNAPSHOT: every card carries data-no-prerender.
 *   4. THE STRIP SURVIVES A DEAD FEED: with the request failing, the bar is
 *      still there with the site's own lines and no card.
 *
 * NEGATIVE CONTROL: TICKER_CONTROL=dim injects a stylesheet that fades the
 * sport tag to half alpha; section 2 must go red.
 *
 * Run: node scripts/lib/hostLikeServer.mjs dist 4173 &
 *      node scripts/playLiveTicker.mjs
 */
import pw from './lib/playwrightLoader.mjs';

const BASE = process.env.SWEEP_BASE || 'http://127.0.0.1:4173';
const CONTROL = process.env.TICKER_CONTROL || '';
if (CONTROL && CONTROL !== 'dim') { console.error(`TICKER_CONTROL=${CONTROL} is not a control this harness knows`); process.exit(1); }
let failures = 0;
const say = (ok, what) => { console.log(`  ${ok ? 'PASS ' : 'FAIL '} ${what}`); if (!ok) failures += 1; };

const today = new Date();
const at = (h, m = 0) => { const d = new Date(today); d.setHours(h, m, 0, 0); return d.toISOString(); };
const ROWS = [
  { id: 'mlb:final', sport: 'mlb', league: 'MLB', home: 'Pittsburgh Pirates', away: 'Chicago Cubs', home_score: 3, away_score: 6, status_short: 'FT', status_long: 'Finished', start_at: at(today.getHours() - 3), live: false, finished: true, updated_at: at(today.getHours()) },
  { id: 'soccer:live', sport: 'soccer', league: 'La Liga', home: 'Valencia', away: 'Real Betis', home_score: 1, away_score: 2, status_short: '2H', status_long: 'Second Half', start_at: at(today.getHours() - 1), live: true, finished: false, updated_at: at(today.getHours()) },
  { id: 'mlb:next', sport: 'mlb', league: 'MLB', home: 'New York Yankees', away: 'Houston Astros', home_score: null, away_score: null, status_short: 'NS', status_long: 'Not Started', start_at: at(today.getHours() + 2, 5), live: false, finished: false, updated_at: at(today.getHours()) },
  { id: 'nfl:next', sport: 'nfl', league: 'NFL', home: 'Buffalo Bills', away: 'Kansas City Chiefs', home_score: null, away_score: null, status_short: 'NS', status_long: 'Not Started', start_at: at(today.getHours() + 4), live: false, finished: false, updated_at: at(today.getHours()) },
  { id: 'soccer:next', sport: 'soccer', league: 'Bundesliga', home: 'Borussia Monchengladbach', away: 'Bayern Munich', home_score: null, away_score: null, status_short: 'NS', status_long: 'Not Started', start_at: at(today.getHours() + 3), live: false, finished: false, updated_at: at(today.getHours()) },
  /* a row that must not be shown: live with no score */
  { id: 'nhl:broken', sport: 'nhl', league: 'NHL', home: 'Boston Bruins', away: 'Toronto Maple Leafs', home_score: null, away_score: null, status_short: 'P1', status_long: '1st Period', start_at: at(today.getHours()), live: true, finished: false, updated_at: at(today.getHours()) },
];

const browser = await pw.chromium.launch();

async function open(withScores) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, timezoneId: 'America/New_York' });
  const page = await ctx.newPage();
  await page.route('**://*.supabase.co/**', r => r.abort());
  if (withScores) {
    await page.route('**/rest/v1/live_scores*', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ROWS) }));
  }
  await page.addInitScript(() => { try { localStorage.setItem('cookie-consent', 'essential'); } catch { /* fine */ } });
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => !!document.querySelector('[aria-label="Scores and site ticker"]'), { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(1500);
  if (CONTROL === 'dim' && withScores) {
    await page.addStyleTag({ content: '[aria-label="Scores and site ticker"] a[data-score-card] > span:first-child { color: rgba(132,145,164,0.5) !important; }' });
    const dimmed = await page.evaluate(() => getComputedStyle(document.querySelector('[aria-label="Scores and site ticker"] a[data-score-card] > span')).color);
    if (!/0\.5\)$/.test(dimmed)) { console.error(`control changed nothing: tag color is ${dimmed}`); process.exit(1); }
    console.log('   NEGATIVE CONTROL ON: sport tags faded to half alpha in the browser, section 2 must go red');
  }
  return { ctx, page };
}

console.log('playLiveTicker: the score cards on the strip');

console.log('1) the cards are there, in order, and read like a broadcast');
const { ctx, page } = await open(true);
{
  const cards = await page.evaluate(() => {
    const bar = document.querySelector('[aria-label="Scores and site ticker"]');
    if (!bar) return null;
    const links = [...bar.querySelectorAll('a[data-score-card]')];
    return {
      brand: (bar.querySelector('.bg-primary')?.innerText || '').trim(),
      cards: links.map(a => ({ href: a.getAttribute('href'), label: a.getAttribute('aria-label'), text: a.innerText.replace(/\s+/g, ' ').trim(), live: !!a.querySelector('.animate-pulse') })),
      ghosts: bar.querySelectorAll('span[data-score-card][aria-hidden="true"]').length,
    };
  });
  say(!!cards, 'the strip is on the page');
  if (cards) {
    say(cards.cards.length === 5, `${cards.cards.length} score cards drawn from 6 rows (the live game with no score must be dropped)`);
    say(/LIVE/i.test(cards.brand), `the brand block says LIVE while a game is on ("${cards.brand}")`);
    const order = cards.cards.map(c => c.href);
    say(order[0] === '/soccer' && cards.cards[0].live, `the live game leads: ${cards.cards[0]?.text}`);
    say(order[order.length - 1] === '/baseball' && /Final/i.test(cards.cards[4]?.text || ''), `the final comes last: ${cards.cards[4]?.text}`);
    const mid = cards.cards.slice(1, 4).map(c => c.text);
    say(/Astros/.test(mid[0]) && /Monchengl/.test(mid[1]) && /Chiefs/.test(mid[2]), `the fixtures sit between them in kickoff order: ${mid.join(' | ')}`);
    say(/Astros @ Yankees/.test(mid[0]), `American sports read away at home: ${mid[0]}`);
    say(/Valencia 1 v Real Betis 2/.test(cards.cards[0]?.text || ''), `soccer reads home v away with the scores beside the names: ${cards.cards[0]?.text}`);
    say(cards.cards.every(c => /^[A-Z]+: .+, .+$/.test(c.label || '')), `every card has a sentence for a screen reader: "${cards.cards[0]?.label}"`);
    say(cards.cards.every(c => ['/soccer', '/baseball', '/pro-football', '/hockey', '/pro-basketball'].includes(c.href)), 'every card links to a sport hub');
    say(/\d{1,2}:\d{2} [AP]M/.test(mid[0]), `a fixture shows its start time in the visitor's own zone: ${mid[0]}`);
    say(cards.ghosts >= 5, `${cards.ghosts} hidden duplicates keep the loop seamless without a second tab stop`);
  }
}

console.log('2) every word on every card clears the contrast bar');
{
  const runs = await page.evaluate(() => {
    const lum = (r, g, b) => { const f = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
    const parse = s => { const m = s.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/); return m ? [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]] : null; };
    const bar = document.querySelector('[aria-label="Scores and site ticker"]');
    const bg = parse(getComputedStyle(bar).backgroundColor);
    const out = [];
    for (const el of bar.querySelectorAll('a[data-score-card] span')) {
      const own = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join('');
      if (!own) continue;
      const fg = parse(getComputedStyle(el).color);
      const a = fg[3];
      const c = [0, 1, 2].map(i => fg[i] * a + bg[i] * (1 - a));
      const L1 = lum(...c), L2 = lum(bg[0], bg[1], bg[2]);
      out.push({ text: own.slice(0, 24), ratio: (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05) });
    }
    return out;
  });
  const bad = runs.filter(r => r.ratio < 4.5);
  say(runs.length >= 20, `${runs.length} text runs measured on the cards`);
  say(bad.length === 0, bad.length ? `${bad.length} run(s) under 4.5 to 1: ${bad.slice(0, 4).map(b => `"${b.text}" ${b.ratio.toFixed(2)}`).join(', ')}` : `lowest ratio ${Math.min(...runs.map(r => r.ratio)).toFixed(2)} to 1`);
}

console.log('3) the cards never reach a snapshot');
{
  const n = await page.evaluate(() => {
    const bar = document.querySelector('[aria-label="Scores and site ticker"]');
    const links = [...bar.querySelectorAll('a')].filter(a => /\d/.test(a.innerText) && /@| v /.test(a.innerText));
    return { cards: links.length, marked: links.filter(a => a.getAttribute('data-no-prerender') === 'true').length };
  });
  say(n.cards > 0 && n.marked === n.cards, `${n.marked} of ${n.cards} score cards carry data-no-prerender`);
}
await ctx.close();

console.log('4) the strip survives a dead feed');
{
  const { ctx: c2, page: p2 } = await open(false);
  const r = await p2.evaluate(() => {
    const bar = document.querySelector('[aria-label="Scores and site ticker"]');
    return bar ? { cards: bar.querySelectorAll('a[data-score-card]').length, lines: bar.querySelectorAll('a').length, brand: (bar.querySelector('.bg-primary')?.innerText || '').trim() } : null;
  });
  say(!!r, 'the strip is still on the page with the feed dead');
  if (r) {
    say(r.cards === 0, `${r.cards} score cards (none, the request failed)`);
    say(r.lines >= 5, `${r.lines} of the site's own lines still scroll`);
    say(/TICKER/i.test(r.brand), `the brand block falls back to the plain label ("${r.brand}")`);
  }
  await c2.close();
}

await browser.close();
console.log('');
if (CONTROL === 'dim') {
  if (failures > 0) { console.log(`playLiveTicker control: green. The faded tag was reported (${failures} finding).`); process.exit(0); }
  console.error('playLiveTicker control: RED. Half alpha text on the cards went unreported.'); process.exit(1);
}
if (failures > 0) { console.error(`playLiveTicker: ${failures} failure${failures === 1 ? '' : 's'}`); process.exit(1); }
console.log('playLiveTicker: green. Real scores lead the strip, read like a broadcast, clear the contrast bar, and never touch a snapshot.');
