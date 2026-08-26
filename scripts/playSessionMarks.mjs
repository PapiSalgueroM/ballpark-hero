/**
 * Round 195 browser harness: the per-session marks, counted on the wire.
 *
 * simSessionMarks pins the source; this proves what a real browser
 * actually SENDS. Every game_completions request is intercepted, so the
 * count of POST bodies is the count of marks, exactly:
 *
 *   1. loading a page is never playing it: zero marks after load, zero
 *      after picking a franchise, zero after creating a career;
 *   2. a Front Office week marks unscored on every play (two weeks, two
 *      marks), the Club Manager rule from Round 157;
 *   3. Stadium Tycoon marks once per session however many taps land,
 *      and a fresh session (reload) marks once again;
 *   4. a My Career season marks unscored, the Round 159 soccer rule;
 *   5. no mark anywhere carries a score, every mark carries a handle.
 *
 * The interception also answers for supabase, so the walk needs no
 * network route to it: POSTs get a 201, reads get an empty list, and the
 * app's fire-and-forget insert path runs to completion either way.
 *
 * Run: npm run build && npx serve -s dist -l 4173, then
 *      ENGINES=chromium node scripts/playSessionMarks.mjs
 * (runAllSims files it as a browser harness automatically, it imports
 * playwright, and runs it only with --browser.)
 */
import pw from './lib/playwrightLoader.mjs';

const { chromium } = pw;
const BASE = process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173';

let failures = 0;
const say = (ok, what) => {
  console.log((ok ? '  PASS  ' : '  FAIL  ') + what);
  if (!ok) failures += 1;
};

const browser = await chromium.launch();

/* Every mark the page sends lands here as a parsed row. */
async function markCounter(page) {
  const marks = [];
  await page.route('**/rest/v1/game_completions*', async route => {
    const req = route.request();
    if (req.method() === 'POST') {
      let body = null;
      try { body = req.postDataJSON(); } catch { /* keep null */ }
      for (const row of Array.isArray(body) ? body : [body]) marks.push(row);
      await route.fulfill({ status: 201, contentType: 'application/json', body: '[]' });
    } else {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }
  });
  return marks;
}

const unscored = (m, game) =>
  m && m.game === game && !('score' in m) && typeof m.player_name === 'string' && m.player_name.length > 0;

/* ---------- Walk one: a Front Office week marks, every week ---------- */
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  const marks = await markCounter(page);

  console.log('1) Loading the front office is not playing it');
  await page.goto(`${BASE}/front-office`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  say(marks.length === 0, `no mark on page load (${marks.length} sent)`);
  await page.locator('.grid button').first().click();
  await page.waitForTimeout(900);
  say(marks.length === 0, `no mark for picking a franchise (${marks.length} sent)`);

  console.log('2) A played week marks unscored, and every week counts');
  /* Round 204: the hub opens on boxes now, and the play button lives
     behind the This week box. */
  await page.locator('button:has-text("This week")').click();
  await page.waitForTimeout(400);
  say(marks.length === 0, `no mark for looking at the fixture (${marks.length} sent)`);
  await page.locator('button:has-text("Play Week")').first().click();
  await page.waitForTimeout(900);
  say(marks.length === 1, `exactly one mark after one week (${marks.length} sent)`);
  say(unscored(marks[0], 'front-office'), `the mark is front-office, unscored, with a handle (${JSON.stringify(marks[0])})`);
  await page.locator('button:has-text("Play Week")').first().click();
  await page.waitForTimeout(900);
  say(marks.length === 2, `a second week is a second mark (${marks.length} sent)`);
  say(unscored(marks[1], 'front-office'), 'the second mark is unscored too');

  const pageErrors = errors.filter(e => !/supabase|Failed to fetch|CORS/i.test(e));
  say(pageErrors.length === 0, `no real page errors on the FO walk (${pageErrors.length ? pageErrors[0] : 'clean'})`);
  await page.close();
}

/* ---------- Walk two: the tycoon marks once per session ---------- */
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  const marks = await markCounter(page);

  console.log('3) The idle game: many taps, one mark');
  await page.goto(`${BASE}/stadium-tycoon`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1400);
  say(marks.length === 0, `no mark on tycoon load (${marks.length} sent)`);
  const pitch = page.locator('div.cursor-pointer.select-none.group').first();
  await pitch.click();
  await page.waitForTimeout(800);
  say(marks.length === 1, `the first tap marks the session (${marks.length} sent)`);
  say(unscored(marks[0], 'stadium-tycoon'), `the mark is stadium-tycoon, unscored (${JSON.stringify(marks[0])})`);
  await pitch.click();
  await pitch.click();
  await page.waitForTimeout(800);
  say(marks.length === 1, `two more taps add no mark, the ref holds (${marks.length} sent)`);

  console.log('4) A fresh session is a fresh mark');
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1400);
  say(marks.length === 1, `reloading alone adds nothing (${marks.length} sent)`);
  await page.locator('div.cursor-pointer.select-none.group').first().click();
  await page.waitForTimeout(800);
  say(marks.length === 2, `the new session's first tap marks again (${marks.length} sent)`);

  const pageErrors = errors.filter(e => !/supabase|Failed to fetch|CORS/i.test(e));
  say(pageErrors.length === 0, `no real page errors on the tycoon walk (${pageErrors.length ? pageErrors[0] : 'clean'})`);
  await page.close();
}

/* ---------- Walk three: a My Career season marks unscored ---------- */
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  const marks = await markCounter(page);

  console.log('5) Creating a career is not playing one');
  await page.goto(`${BASE}/nfl-my-career`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.locator('input[placeholder*="name"]').first().fill('Probe Player');
  await page.locator('button:has-text("Enter the draft")').click();
  await page.waitForTimeout(1000);
  say(marks.length === 0, `no mark for entering the draft (${marks.length} sent)`);

  console.log('6) A played season marks unscored, the Round 159 rule');
  await page.locator('button:has-text("Play the")').first().click();
  await page.waitForTimeout(1000);
  say(marks.length === 1, `exactly one mark for one season (${marks.length} sent)`);
  say(unscored(marks[0], 'nfl-my-career'), `the mark is nfl-my-career, unscored, with a handle (${JSON.stringify(marks[0])})`);

  const pageErrors = errors.filter(e => !/supabase|Failed to fetch|CORS/i.test(e));
  say(pageErrors.length === 0, `no real page errors on the career walk (${pageErrors.length ? pageErrors[0] : 'clean'})`);
  await page.close();
}

await browser.close();
console.log('');
if (failures > 0) {
  console.error(`playSessionMarks: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('playSessionMarks: green. Playing counts, loading does not, and nothing invented a score.');
