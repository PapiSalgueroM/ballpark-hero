/**
 * Round 180 browser harness: the owner upstairs, walked like a person.
 *
 * simOwnerMandate proves the engine; this walks the UI: taking a job shows
 * the mandate card and Trust 60, low trust shows the hot seat warning, a
 * doomed season ends in the ownership verdict and the fired block instead
 * of a draft, a reload after the firing lands on the fired screen (not
 * back in the job), and taking another front office returns to the picker.
 *
 * The doomed season is manufactured honestly: take a job through the real
 * UI, then patch the save to a title-or-bust mandate, trust 5, and a
 * gutted 60-rated roster, which is exactly the state of a GM three bad
 * years deep whose owner has lost patience. The only escape the engine
 * allows from there is actually winning the Super Bowl, which a 60-rated
 * roster does about one time in a thousand; if this walk ever fails on
 * "still employed", check whether the miracle happened before assuming a
 * bug.
 *
 * Run: npm run build && npx serve -s dist -l 4173, then
 *      ENGINES=chromium node scripts/playOwnerMandate.mjs
 * (runAllSims files it as a browser harness automatically, it imports
 * playwright, and runs it only with --browser.)
 */
import pw from './lib/pwLoader.mjs';

const { chromium } = pw;
const BASE = process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173';

let failures = 0;
const say = (ok, what) => {
  console.log((ok ? '  PASS  ' : '  FAIL  ') + what);
  if (!ok) failures += 1;
};

const browser = await chromium.launch();

/* ---------- Walk one: the NFL owner, hired, warned, and fired ---------- */
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  /* Round 274: Supabase is unreachable outside a browser with egress, and its
     requests then HANG rather than fail, so waitUntil networkidle can never be
     reached and this harness timed out at 30 seconds before asserting anything.
     Measured: / had 6 requests still open, /records 10, all of them Supabase.
     It is not only a sandbox problem: the daily legend hook opens a realtime
     websocket, and an open socket means a page that mounts it can never be
     network idle anywhere. Aborting is closer to what an offline visitor gets
     than hanging is, and it makes this harness deterministic. */
  await page.route('**://*.supabase.co/**', r => r.abort());
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));

  console.log('1) Taking the job comes with an ask');
  await page.goto(`${BASE}/front-office`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.locator('button:has-text("Take over a front office")').count(); /* settle */
  /* Pick the first franchise tile (the grid under the intro card). */
  await page.locator('.grid button').first().click();
  await page.waitForTimeout(900);
  const card = page.locator('[data-owner-mandate]');
  say(await card.count() === 1, 'the ownership card is on the hub');
  const cardText = await card.innerText();
  say(cardText.includes('Trust 60'), `a fresh job starts at Trust 60 (card says: ${cardText.split('\n')[0]}...)`);
  const bodyText = await page.locator('body').innerText();
  say(bodyText.includes('The ownership mandate:'), 'the feed announces the mandate');

  console.log('2) Low trust reads as a hot seat');
  await page.evaluate(() => {
    const raw = localStorage.getItem('front-office-save-v1');
    if (!raw) return;
    const s = JSON.parse(raw);
    s.trust = 5;
    s.mandate = { tier: 'title', text: 'Win the Super Bowl. Anything less is a failed season upstairs.', winFloor: 0, reqLevel: 4, season: s.league.season };
    /* Gut the roster so the miracle escape is a one-in-a-thousand. */
    for (const p of s.league.teams[s.myTeam].players) p.ovr = 60;
    s.league.teams[s.myTeam].defense = 60;
    localStorage.setItem('front-office-save-v1', JSON.stringify(s));
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const hotCard = page.locator('[data-owner-mandate]');
  say(await hotCard.count() === 1, 'the card survives a reload');
  const hotText = await hotCard.innerText();
  say(hotText.includes('Trust 5'), 'the patched trust renders');
  say(hotText.includes('The seat is hot'), 'trust at 5 shows the hot seat warning');
  say(hotText.includes('Win the Super Bowl'), 'the title-or-bust mandate renders');

  console.log('3) The doomed season ends in a firing, not a draft');
  await page.locator('button:has-text("This week")').click();
  await page.waitForTimeout(400);
  for (let w = 0; w < 18; w++) {
    const btn = page.locator('button:has-text("Play Week"), button:has-text("Play the final week")');
    if (await btn.count() === 0) break; /* recap reached */
    await btn.first().click();
    await page.waitForTimeout(350);
  }
  const recapText = await page.locator('body').innerText();
  say(/Nowhere near the ask|Short of the ask/.test(recapText), 'the ownership verdict is on the recap');
  say(recapText.includes('Ownership made the call'), 'the firing block replaced the draft path');
  say(await page.locator('button:has-text("Go to the draft")').count() === 0, 'a fired GM gets no draft button');
  say(await page.locator('button:has-text("Take another front office")').count() >= 1, 'the way out is another job');
  /* Round 187: the recap is the staged verdict card now, and its confetti
     rule is the harness's business: a fired GM whose team did not win the
     title gets ZERO confetti pieces, whatever else animates. */
  say(await page.locator('[data-verdict-reveal]').count() === 1, 'the recap is the staged verdict card');
  say(await page.locator('[data-verdict-reveal] .cm-confetti').count() === 0, 'a firing gets no confetti, the rule holds in the DOM');

  console.log('4) A reload after the firing stays fired');
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const firedText = await page.locator('body').innerText();
  say(firedText.includes('Fired by'), 'the fired screen renders from the save');
  say(await page.locator('button:has-text("Play Week")').count() === 0, 'no way to keep playing a job you lost');
  await page.locator('button:has-text("Take another front office")').first().click();
  await page.waitForTimeout(900);
  say((await page.locator('body').innerText()).includes('Take over a front office'), 'taking another job returns to the picker');
  say(errors.length === 0, `no page errors on the NFL walk (${errors.length ? errors[0] : 'clean'})`);
  await page.close();
}

/* ---------- Walk two: the other three hubs carry the card too ---------- */
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.route('**://*.supabase.co/**', r => r.abort());
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  console.log('5) The NBA, NHL and MLB owners exist too');
  for (const [path, word] of [['/nba-front-office', 'Finals'], ['/nhl-front-office', 'Stanley Cup'], ['/mlb-front-office', 'World Series']]) {
    await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    await page.locator('.grid button').first().click();
    await page.waitForTimeout(900);
    const card = page.locator('[data-owner-mandate]');
    say(await card.count() === 1, `${path}: the ownership card is on the hub`);
    const text = await card.innerText();
    say(text.includes('Trust 60'), `${path}: fresh trust renders`);
    /* The first tile is not guaranteed a title mandate, so assert the card
       speaks this sport's language only when the tier calls for it. */
    if (text.includes('Win the')) {
      say(text.includes(word) || /Win \d+ games|Rebuild honestly|Make|Defend/.test(text), `${path}: the mandate speaks ${word}'s language`);
    }
  }
  say(errors.length === 0, `no page errors on the tri-sport walk (${errors.length ? errors[0] : 'clean'})`);
  await page.close();
}

await browser.close();
if (failures > 0) {
  console.error(`\n${failures} OWNER MANDATE WALK CHECK${failures === 1 ? '' : 'S'} FAILED`);
  process.exit(1);
}
console.log('\nALL OWNER MANDATE WALK CHECKS PASSED');
