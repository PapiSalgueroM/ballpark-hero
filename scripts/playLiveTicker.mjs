/**
 * Round 298 browser harness: the cable-style wire, driven like a viewer.
 *
 * The sandbox has no route to the database, so this harness answers the
 * scores request itself with a fixture of real row shapes (a live soccer
 * game, an MLB final, fixtures across three sports, and a live row with no
 * score that the fetch hook must drop) and then watches the strip behave:
 *
 *   1. THE CHIP AND THE BOXES: the strip leads with the LIVE chip and its
 *      red dot, one sport box per sport with games, soccer's box open first,
 *      its games in fan order (live first, then kickoffs), soccer reading
 *      home v away, and every card linking to its sport's hub with a
 *      sentence for a screen reader.
 *   2. THE LOOP ACTUALLY LOOPS: within one dwell the open box hands off to
 *      the next sport, whose cards then read away at home with the fixture
 *      time in the visitor's own zone and the final marked Final.
 *   3. EVERY WORD CLEARS THE CONTRAST BAR, alpha composited, 4.5 to 1.
 *   4. THE CARDS NEVER REACH A SNAPSHOT: data-no-prerender on every card.
 *   5. A DEAD FEED DEGRADES HONESTLY: chip still up, no cards, the quiet
 *      no-games line, and nothing about the site fills the gap.
 *   6. REDUCED MOTION GETS EVERYTHING AT ONCE: no cycling, every box open.
 *
 * NEGATIVE CONTROL: TICKER_CONTROL=dim fades the card text to half alpha in
 * the browser; section 3 must go red.
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

const BAR = '[aria-label="Live scores ticker"]';
const today = new Date();
const at = (h, m = 0) => { const d = new Date(today); d.setHours(h, m, 0, 0); return d.toISOString(); };
const ROWS = [
  { id: 'mlb:final', sport: 'mlb', league: 'MLB', home: 'Pittsburgh Pirates', away: 'Chicago Cubs', home_score: 3, away_score: 6, status_short: 'FT', status_long: 'Finished', start_at: at(today.getHours() - 3), live: false, finished: true, updated_at: at(today.getHours()) },
  { id: 'soccer:live', sport: 'soccer', league: 'La Liga', home: 'Valencia', away: 'Real Betis', home_score: 1, away_score: 2, status_short: '2H', status_long: 'Second Half', start_at: at(today.getHours() - 1), live: true, finished: false, updated_at: at(today.getHours()) },
  { id: 'mlb:next', sport: 'mlb', league: 'MLB', home: 'New York Yankees', away: 'Houston Astros', home_score: null, away_score: null, status_short: 'NS', status_long: 'Not Started', start_at: at(today.getHours() + 2, 5), live: false, finished: false, updated_at: at(today.getHours()) },
  { id: 'nfl:next', sport: 'nfl', league: 'NFL', home: 'Buffalo Bills', away: 'Kansas City Chiefs', home_score: null, away_score: null, status_short: 'NS', status_long: 'Not Started', start_at: at(today.getHours() + 4), live: false, finished: false, updated_at: at(today.getHours()) },
  { id: 'soccer:next', sport: 'soccer', league: 'Bundesliga', home: 'Borussia Monchengladbach', away: 'Bayern Munich', home_score: null, away_score: null, status_short: 'NS', status_long: 'Not Started', start_at: at(today.getHours() + 3), live: false, finished: false, updated_at: at(today.getHours()) },
  /* a row that must not be shown: live with no score, dropped by the hook */
  { id: 'nhl:broken', sport: 'nhl', league: 'NHL', home: 'Boston Bruins', away: 'Toronto Maple Leafs', home_score: null, away_score: null, status_short: 'P1', status_long: '1st Period', start_at: at(today.getHours()), live: true, finished: false, updated_at: at(today.getHours()) },
];

const browser = await pw.chromium.launch();

async function open(withScores, reducedMotion = false) {
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    timezoneId: 'America/New_York',
    reducedMotion: reducedMotion ? 'reduce' : 'no-preference',
  });
  const page = await ctx.newPage();
  await page.route('**://*.supabase.co/**', r => r.abort());
  if (withScores) {
    await page.route('**/rest/v1/live_scores*', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ROWS) }));
  }
  await page.addInitScript(() => { try { localStorage.setItem('cookie-consent', 'essential'); } catch { /* fine */ } });
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(sel => !!document.querySelector(sel), BAR, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(1500);
  if (CONTROL === 'dim' && withScores) {
    await page.addStyleTag({ content: `${BAR} a[data-score-card] span { color: rgba(132,145,164,0.5) !important; }` });
    const dimmed = await page.evaluate(sel => getComputedStyle(document.querySelector(`${sel} a[data-score-card] span`)).color, BAR);
    if (!/0\.5\)$/.test(dimmed)) { console.error(`control changed nothing: card color is ${dimmed}`); process.exit(1); }
    console.log('   NEGATIVE CONTROL ON: card text faded to half alpha in the browser, section 3 must go red');
  }
  return { ctx, page };
}

console.log('playLiveTicker: the cable wire, driven like a viewer');

console.log('1) the chip leads, the boxes group by sport, soccer opens first in fan order');
const { ctx, page } = await open(true);
{
  const state = await page.evaluate(sel => {
    const bar = document.querySelector(sel);
    if (!bar) return null;
    const chip = bar.querySelector('[data-live-chip]');
    const boxes = [...bar.querySelectorAll('a[data-sport-box]')].map(b => b.innerText.trim());
    const cards = [...bar.querySelectorAll('a[data-score-card]')].map(a => ({ href: a.getAttribute('href'), label: a.getAttribute('aria-label'), text: a.innerText.replace(/\s+/g, ' ').trim(), live: !!a.querySelector('.animate-pulse') }));
    return {
      chipText: chip ? chip.innerText.trim() : '',
      chipDot: !!chip?.querySelector('.bg-red-500'),
      chipPulsing: !!chip?.querySelector('.animate-pulse'),
      boxes, cards,
    };
  }, BAR);
  say(!!state, 'the strip is on the page');
  if (state) {
    say(/^Live$/i.test(state.chipText), `the chip says Live and nothing else ("${state.chipText}")`);
    say(state.chipDot, 'the chip carries the little red circle');
    say(state.chipPulsing, 'the circle pulses while a game is genuinely live');
    say(state.boxes.join(',') === 'SOCCER,MLB,NFL', `one box per sport with games, soccer first: ${state.boxes.join(',')}`);
    say(state.cards.length === 2, `${state.cards.length} cards visible: only the open sport's games are on the wire`);
    say(state.cards[0]?.live && /Valencia 1 v Real Betis 2/.test(state.cards[0]?.text || ''), `the live game leads its sport, home v away with scores: ${state.cards[0]?.text}`);
    say(/Monchengl/.test(state.cards[1]?.text || ''), `the kickoff follows: ${state.cards[1]?.text}`);
    say(state.cards.every(c => c.href === '/soccer'), 'every open card links to its sport hub');
    say(state.cards.every(c => /, .+$/.test(c.label || '')), `every card has a sentence for a screen reader: "${state.cards[0]?.label}"`);
  }
}

console.log('2) the loop hands the wire to the next sport on its own');
{
  const handed = await page.waitForFunction(sel => {
    const cards = [...document.querySelectorAll(`${sel} a[data-score-card]`)];
    return cards.some(a => /Astros|Pirates|Cubs/.test(a.innerText)) ? cards.map(a => a.innerText.replace(/\s+/g, ' ').trim()) : false;
  }, BAR, { timeout: 20000 }).then(h => h.jsonValue()).catch(() => null);
  say(!!handed, 'the mlb box opened by itself within one dwell');
  if (handed) {
    say(/Astros @ Yankees/.test(handed[0] || ''), `American sports read away at home: ${handed[0]}`);
    say(/\d{1,2}:\d{2} [AP]M/.test(handed[0] || ''), `a fixture shows its start time in the visitor's own zone: ${handed[0]}`);
    say(/Final/i.test(handed[1] || '') && /Cubs 6 @ Pirates 3/.test(handed[1] || ''), `the final closes the box with its score: ${handed[1]}`);
  }
}

console.log('3) every word on every visible card clears the contrast bar');
{
  const runs = await page.evaluate(sel => {
    const lum = (r, g, b) => { const f = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
    const parse = s => { const m = s.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/); return m ? [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]] : null; };
    const bar = document.querySelector(sel);
    const bg = parse(getComputedStyle(bar).backgroundColor);
    const out = [];
    for (const el of bar.querySelectorAll('a[data-score-card] span, a[data-sport-box]')) {
      const own = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join('');
      if (!own) continue;
      const fg = parse(getComputedStyle(el).color);
      const a = fg[3];
      const c = [0, 1, 2].map(i => fg[i] * a + bg[i] * (1 - a));
      const L1 = lum(...c), L2 = lum(bg[0], bg[1], bg[2]);
      out.push({ text: own.slice(0, 24), ratio: (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05) });
    }
    return out;
  }, BAR);
  const bad = runs.filter(r => r.ratio < 4.5);
  say(runs.length >= 8, `${runs.length} text runs measured on the open box`);
  say(bad.length === 0, bad.length ? `${bad.length} run(s) under 4.5 to 1: ${bad.slice(0, 4).map(b => `"${b.text}" ${b.ratio.toFixed(2)}`).join(', ')}` : `lowest ratio ${Math.min(...runs.map(r => r.ratio)).toFixed(2)} to 1`);
}

console.log('4) the cards never reach a snapshot');
{
  const n = await page.evaluate(sel => {
    const links = [...document.querySelectorAll(`${sel} a[data-score-card]`)];
    return { cards: links.length, marked: links.filter(a => a.getAttribute('data-no-prerender') === 'true').length };
  }, BAR);
  say(n.cards > 0 && n.marked === n.cards, `${n.marked} of ${n.cards} score cards carry data-no-prerender`);
}
await ctx.close();

console.log('5) a dead feed degrades honestly: chip, quiet line, and nothing about the site');
{
  const { ctx: c2, page: p2 } = await open(false);
  const r = await p2.evaluate(sel => {
    const bar = document.querySelector(sel);
    return bar ? {
      cards: bar.querySelectorAll('a[data-score-card]').length,
      chip: (bar.querySelector('[data-live-chip]')?.innerText || '').trim(),
      text: bar.innerText.replace(/\s+/g, ' ').trim(),
    } : null;
  }, BAR);
  say(!!r, 'the strip is still on the page with the feed dead');
  if (r) {
    say(r.cards === 0, `${r.cards} score cards (none, the request failed)`);
    say(/No games on the board right now/.test(r.text), `the quiet line shows: "${r.text.slice(0, 60)}"`);
    say(!/free games|Fresh daily|New stuff/.test(r.text), 'no site promo fills the gap');
  }
  await c2.close();
}

console.log('6) reduced motion gets every box open at once, no cycling');
{
  const { ctx: c3, page: p3 } = await open(true, true);
  const r = await p3.evaluate(sel => {
    const bar = document.querySelector(sel);
    return bar ? {
      cards: bar.querySelectorAll('a[data-score-card]').length,
      boxes: bar.querySelectorAll('a[data-sport-box]').length,
    } : null;
  }, BAR);
  say(!!r && r.boxes === 3 && r.cards === 5, r ? `${r.boxes} boxes and all ${r.cards} cards mounted at once` : 'the strip is missing under reduced motion');
  await c3.close();
}

console.log('7) a full slate GLIDES: the wire moves, every card passes, then hands off');
{
  /* Round 317, his report "the ticker isnt moving": with the day-ahead slate
     a sport carries twenty plus cards, the old loop held them perfectly
     still, and everything past the screen edge was unreachable. This section
     is the assertion that would have caught it: feed one sport more cards
     than a 1440 viewport can show and MEASURE the scroll moving. */
  const fat = Array.from({ length: 16 }, (_, i) => ({
    id: `mlb:fat${i}`, sport: 'mlb', league: 'MLB',
    home: `Home Club ${i + 1}`, away: `Away Club ${i + 1}`,
    home_score: null, away_score: null, status_short: 'NS', status_long: 'Not Started',
    start_at: at(today.getHours() + 2, i % 60), live: false, finished: false, updated_at: at(today.getHours()),
  })).concat([{
    id: 'soccer:fat', sport: 'soccer', league: 'La Liga', home: 'Valencia', away: 'Real Betis',
    home_score: 1, away_score: 2, status_short: '2H', status_long: 'Second Half',
    start_at: at(today.getHours() - 1), live: true, finished: false, updated_at: at(today.getHours()),
  }]);
  const c4 = await browser.newContext({ viewport: { width: 1440, height: 900 }, timezoneId: 'America/New_York' });
  const p4 = await c4.newPage();
  await p4.route('**://*.supabase.co/**', r => r.abort());
  await p4.route('**/rest/v1/live_scores*', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fat) }));
  await p4.addInitScript(() => { try { localStorage.setItem('cookie-consent', 'essential'); } catch { /* fine */ } });
  await p4.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await p4.waitForFunction(sel => !!document.querySelector(sel), BAR, { timeout: 20000 }).catch(() => {});
  /* soccer (1 card) opens first and fits; wait for the fat MLB box */
  await p4.waitForFunction(sel => /Home Club/.test(document.querySelector(sel)?.innerText || ''), BAR, { timeout: 25000 }).catch(() => {});
  const glide = await p4.evaluate(async (sel) => {
    const vp = document.querySelector(`${sel} [aria-live="off"]`) || document.querySelector(`${sel} .flex-1.overflow-hidden`);
    if (!vp) return null;
    const s0 = vp.scrollLeft;
    await new Promise(r => setTimeout(r, 4000));
    const s1 = vp.scrollLeft;
    await new Promise(r => setTimeout(r, 4000));
    const s2 = vp.scrollLeft;
    /* measured at the end, because the box opens through a 500ms max-width
       transition and an early read sees no overflow yet */
    const overflow = vp.scrollWidth - vp.clientWidth;
    return { overflow, s0, s1, s2 };
  }, BAR);
  say(!!glide, 'the fat box and its viewport were found');
  if (glide) {
    say(glide.overflow > 200, `the slate genuinely overflows the screen (${glide.overflow}px hidden)`);
    say(glide.s2 > glide.s0 + 100, `the wire is MOVING: scroll ${glide.s0.toFixed(0)} to ${glide.s1.toFixed(0)} to ${glide.s2.toFixed(0)}px across 8s`);
  }

  console.log('8) clicking pause stops the wire, clicking resume RESUMES it');
  {
    /* the second half of his report: focus from the resume click used to
       keep the wire parked, so the button looked broken. */
    /* aria-pressed, not the label: the label flips between Pause and Resume */
    const pauseBtn = p4.locator(`${BAR} button[aria-pressed]`);
    await pauseBtn.click();
    const pausedRead = await p4.evaluate(async (sel) => {
      const vp = document.querySelector(`${sel} [aria-live="off"]`) || document.querySelector(`${sel} .flex-1.overflow-hidden`);
      const s0 = vp.scrollLeft;
      await new Promise(r => setTimeout(r, 2500));
      return { s0, s1: vp.scrollLeft };
    }, BAR);
    say(Math.abs(pausedRead.s1 - pausedRead.s0) < 2, `pause parks the wire (${pausedRead.s0.toFixed(0)} to ${pausedRead.s1.toFixed(0)}px over 2.5s)`);
    await pauseBtn.click();
    /* move the pointer OFF the strip, as a person does, then measure */
    await p4.mouse.move(700, 500);
    const resumed = await p4.evaluate(async (sel) => {
      const vp = document.querySelector(`${sel} [aria-live="off"]`) || document.querySelector(`${sel} .flex-1.overflow-hidden`);
      const s0 = vp.scrollLeft;
      await new Promise(r => setTimeout(r, 3500));
      return { s0, s1: vp.scrollLeft, focusInStrip: document.querySelector(sel).contains(document.activeElement) };
    }, BAR);
    say(!resumed.focusInStrip, 'the resume click left no sticky focus inside the strip');
    say(resumed.s1 > resumed.s0 + 50, `resume actually resumes (${resumed.s0.toFixed(0)} to ${resumed.s1.toFixed(0)}px over 3.5s)`);
  }
  await c4.close();
}

await browser.close();
console.log('');
if (CONTROL === 'dim') {
  if (failures > 0) { console.log(`playLiveTicker control: green. The faded text was reported (${failures} finding).`); process.exit(0); }
  console.error('playLiveTicker control: RED. Half alpha text on the cards went unreported.'); process.exit(1);
}
if (failures > 0) { console.error(`playLiveTicker: ${failures} failure${failures === 1 ? '' : 's'}`); process.exit(1); }
console.log('playLiveTicker: green. The wire is the day\'s games, sport by sport, and nothing else.');
