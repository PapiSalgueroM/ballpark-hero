/**
 * Round 120: a harness that actually plays Club Manager, through its own UI.
 *
 * This exists because the generic deep harness reports /club-manager as clean
 * and has never once reached a match. playGames.mjs presses the most game-like
 * button it can find, and on the club picker that is a nation filter, so it
 * spent twenty presses toggling England and All nations and called that twenty
 * clean interactions. A green light on the deepest game on the site, for a run
 * that never left the first screen. Club Manager is roughly 4,400 lines of
 * engine and thirteen screens; the sim harnesses cover the engine well and
 * nothing at all covered the thing a player actually touches.
 *
 * So this one knows the game. It takes a job, plays fixtures, works the half
 * time break that Round 119 added, handles the transfer window, and reaches
 * the end of a season, asserting the things that have to be true along the
 * way. Anything it cannot do is reported out loud rather than passed over.
 *
 * Serve the production build first:
 *   npm run build && npx serve -s dist -l 4173
 * Then: node scripts/playClubManager.mjs
 * MAX_STEPS caps the run, VERBOSE=1 narrates every press.
 *
 * A run ends one of three ways and only one of them is a problem: the season
 * plays out, the board sacks you, or it runs out of steps. Being sacked is a
 * real ending, not a failure. This harness plays badly on purpose, because it
 * never sets a tactic, never signs anyone and chases every game it is losing,
 * so a mid-table club losing patience is the game working as designed.
 */
import pw from '/home/claude/.npm-global/lib/node_modules/playwright/index.js';
const { chromium } = pw;

const BASE = process.env.SWEEP_BASE || 'http://127.0.0.1:4173';
const MAX_STEPS = Number(process.env.MAX_STEPS || 260);
const V = !!process.env.VERBOSE;

const findings = [];
const note = (kind, detail) => { findings.push({ kind, detail }); console.log(`  ${kind}  ${detail}`); };
const say = m => { if (V) console.log('      ' + m); };

/* Copy that should never reach a player, same list the site-wide harness uses. */
const LEAKS = [
  [/\bundefined\b/, 'renders the word undefined'],
  [/\bNaN\b/, 'renders NaN'],
  [/\[object Object\]/, 'renders [object Object]'],
  [/\{\{|\}\}/, 'unsubstituted template braces'],
  [/\bInfinity\b/, 'renders Infinity'],
  [/[–—]/, 'em or en dash'],
];

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox', '--no-proxy-server'],
});
const ctx = await browser.newContext({ viewport: { width: 430, height: 900 }, ignoreHTTPSErrors: true });
const page = await ctx.newPage();

const errs = [];
page.on('pageerror', e => errs.push(String(e).split('\n')[0].slice(0, 160)));
page.on('console', m => {
  const t = m.text();
  if (m.type() === 'error' && !/ERR_CERT|ERR_QUIC|ERR_NAME|Failed to load resource|blocked by CORS policy|Access-Control-Allow-Origin|net::ERR_FAILED/i.test(t)) {
    errs.push(t.slice(0, 160));
  }
});

const screen = async () => (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').trim();

async function tap(rx, label) {
  const b = page.getByRole('button', { name: rx }).first();
  if (await b.count().catch(() => 0) === 0) return false;
  if (await b.isDisabled().catch(() => false)) return false;
  const ok = await b.click({ timeout: 4000 }).then(() => true).catch(() => false);
  if (ok) { say(`pressed ${label}`); await page.waitForTimeout(500); }
  return ok;
}

/* getByRole matches an accessible name, and the hub tabs did not answer to it:
   asking for the Home tab by role found nothing while the button was plainly
   on screen and listed by innerText. Filtering on the rendered text finds it.
   Worth keeping both, because role matching is the better tool everywhere it
   works. */
async function tapText(rx, label) {
  const b = page.locator('button:visible').filter({ hasText: rx }).first();
  if (await b.count().catch(() => 0) === 0) return false;
  const ok = await b.click({ timeout: 4000 }).then(() => true).catch(() => false);
  if (ok) { say(`pressed ${label}`); await page.waitForTimeout(500); }
  return ok;
}

async function clearRoom() {
  await page.getByRole('button', { name: /^essential only$/i }).first().click({ timeout: 1200 }).catch(() => {});
  for (let i = 0; i < 3; i++) {
    const d = page.locator('[role="dialog"][data-state="open"]');
    if (await d.count().catch(() => 0) === 0) break;
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(250);
  }
}

/* ---------- take a job ---------- */
console.log('1) Taking a job');
await page.goto(BASE + '/club-manager', { waitUntil: 'domcontentloaded', timeout: 20000 });
await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
await page.waitForTimeout(1200);
await clearRoom();

await tap(/England/i, 'England');
await tap(/Premier League/i, 'Premier League');
await page.waitForTimeout(600);
const clubBtn = page.locator('button').filter({ hasText: /Everton|Fulham|Brentford|Crystal Palace|Wolves|Brighton/ }).first();
if (await clubBtn.count().catch(() => 0) > 0) {
  await clubBtn.click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(600);
}
await tap(/take the job|confirm|start/i, 'confirm the job');
await page.waitForTimeout(1000);

let t = await screen();
let myClub = null;
if (!/Season 1/i.test(t)) {
  note('BLOCKED', 'could not get past the club picker, so nothing below ran');
} else {
  const head = t.replace(/DOUKNOWBALL Track stats Back /, '');
  myClub = (head.match(/^([A-Za-z][A-Za-z .'-]*?)\s+Season \d/) || [])[1] || null;
  console.log(`   in the job at ${myClub ?? '(club name not read)'}: ` + head.slice(0, 80));
  if (!myClub) note('BROKEN ', 'could not read which club I am managing off the hub');
}

/* ---------- play a season ---------- */
console.log('2) Playing a season through the interface');
let halftimes = 0, fullTimes = 0, subsMade = 0, shapeChanges = 0, windows = 0, seasonEnd = false, sacked = false;
let lastHt = null;

for (let step = 0; step < MAX_STEPS; step++) {
  t = await screen();
  say(`step ${step}: ${t.slice(0, 100)}`);

  for (const [rx, why] of LEAKS) {
    const stripped = t.replace(/DOUKNOWBALL|Track stats/g, '');
    const m = stripped.match(rx);
    if (m) {
      note('COPY   ', `${why}: "${stripped.slice(Math.max(0, m.index - 45), m.index + 55).trim()}"`);
      break;
    }
  }
  if (errs.length) { note('THROWS ', errs[0]); break; }
  if (t.length < 60) { note('BLANK  ', `the screen went empty at step ${step}`); break; }

  /* --- half time: this is the Round 119 screen, and the reason this harness
         exists at all. Work it the way a manager would. --- */
  if (/HALF TIME/i.test(t)) {
    halftimes++;
    const score = (t.match(/(\d+)-(\d+)/) || []);
    lastHt = { my: Number(score[1]), opp: Number(score[2]) };
    if (!Number.isFinite(lastHt.my) || !Number.isFinite(lastHt.opp)) {
      note('BROKEN ', 'the half time screen showed no readable score');
    }
    if (!/SIT IN|AS YOU WERE|GO AT THEM/i.test(t)) note('BROKEN ', 'the half time screen offered no way to change shape');
    if (!/CHANGES/i.test(t)) note('BROKEN ', 'the half time screen offered no substitutions');

    if (lastHt.my < lastHt.opp) { if (await tap(/Go at them/i, 'go at them')) shapeChanges++; }
    else if (lastHt.my - lastHt.opp >= 2) { if (await tap(/Sit in/i, 'sit in')) shapeChanges++; }

    // one substitution: open a player on the pitch, take whoever is offered
    const rows = page.locator('button').filter({ hasText: /rated .* fit/ });
    const before = await rows.count().catch(() => 0);
    if (before > 0) {
      await rows.first().click({ timeout: 4000 }).catch(() => {});
      await page.waitForTimeout(500);
      const after = page.locator('button').filter({ hasText: /rated .* fit/ });
      const n2 = await after.count().catch(() => 0);
      if (n2 > before) {
        await after.nth(before).click({ timeout: 4000 }).catch(() => {});
        await page.waitForTimeout(500);
        const t2 = await screen();
        if (/ON AT THE BREAK/i.test(t2)) subsMade++;
        else note('BROKEN ', 'a substitution was made and nobody was marked as having come on');
      } else {
        note('BROKEN ', 'tapping a player on the pitch did not open the bench');
      }
    }
    if (!await tap(/Second half/i, 'second half')) {
      note('BROKEN ', 'there was no way out of the half time screen');
      break;
    }
    continue;
  }

  if (/FULL TIME/i.test(t)) {
    fullTimes++;
    /* The two screens are oriented differently and comparing them naively is
       wrong. The half time screen always puts YOUR club on the left, because
       it is your dressing room. The full time report is a scoreboard, so it
       prints home team first. Away at Old Trafford that reads "Brighton 0-1
       Manchester United" at the break and "Manchester United 2 - 0 Brighton"
       at the end, which is 0-1 becoming 0-2 and not a score going backwards.
       The first version of this check reported exactly that, twice, and it was
       the harness misreading a scoreboard both times. So work out which side
       is mine from the club name rather than from the position. */
    const sc = t.match(/([A-Za-z][A-Za-z .'-]*?)\s+(\d+)\s*-\s*(\d+)\s+([A-Za-z][A-Za-z .'-]*)/);
    if (sc && lastHt && myClub) {
      const homeName = sc[1].trim(), awayName = sc[4].trim();
      const homeGoals = Number(sc[2]), awayGoals = Number(sc[3]);
      const iAmHome = homeName.includes(myClub) || myClub.includes(homeName);
      const iAmAway = awayName.includes(myClub) || myClub.includes(awayName);
      if (!iAmHome && !iAmAway) {
        note('BROKEN ', `the full time report does not name my club: "${sc[0]}"`);
      } else {
        const ft = { my: iAmHome ? homeGoals : awayGoals, opp: iAmHome ? awayGoals : homeGoals };
        if (ft.my < lastHt.my || ft.opp < lastHt.opp) {
          note('BROKEN ', `the score went backwards: half time ${lastHt.my}-${lastHt.opp}, full time ${ft.my}-${ft.opp}`);
        }
      }
      lastHt = null;
    }
    if (!await tap(/continue|next|carry on|ok/i, 'continue from the report')) {
      note('BROKEN ', 'the full time report had no way forward');
      break;
    }
    continue;
  }

  /* The end of season screen, and it has to be matched precisely. The first
     version looked for "season score" too, and the club hub carries a Season
     score tile, so the harness declared the season over on its very first step
     and then reported a clean run. A loose end condition is how a harness ends
     up proving nothing at all. */
  if (/SEASON \d+ COMPLETE/i.test(t)) { seasonEnd = true; break; }
  /* Getting sacked is a real ending, not a stuck screen. Round 111 made the
     board mean it, and this harness plays badly on purpose: it never sets a
     tactic, never signs anyone and chases every game it is losing, so a
     mid-table club running out of patience is the game working. Ending the run
     here rather than calling it a finding is the difference between a harness
     that reports bugs and one that reports football.

     Matched on the exact heading, with the exclamation mark. Both terminal
     checks in this file were written loosely first and both silently ended
     every run on its opening screen: the hub carries a Season score tile and
     board copy about being sacked, so /season score/ and /sacked/ each matched
     the hub. A loose end condition does not fail, it passes, which is the
     worst way for a harness to be wrong. */
  if (/SACKED!/.test(t)) { sacked = true; break; }

  if (/TRANSFER WINDOW|window is open/i.test(t)) windows++;

  /* The January window replaces the play button on the hub with Open the
     Window, and the season does not move until it has been dealt with. Two
     full runs stopped dead here at round 27 with every tile still on screen,
     which is the harness not knowing the game rather than the game being
     stuck, and it is exactly the sort of thing a generic button masher would
     have reported as a clean run. */
  if (/Open the Window/i.test(t)) {
    if (await tap(/Open the Window/i, 'open the transfer window')) {
      windows++;
      await page.waitForTimeout(600);
      /* Opening the window drops you on the Market tab, and the way back to
         the fixture list is the Home tab, not a close button. */
      if (!await tapText(/^Home$/, 'home tab')
        && !await tap(/close the window|shut the window|done|finish|back to club|continue/i, 'close the window')) {
        const bs = page.locator('button:visible');
        const labels = [];
        for (let k = 0; k < Math.min(await bs.count().catch(() => 0), 20); k++) {
          const lb = ((await bs.nth(k).innerText().catch(() => '')) || '').trim().replace(/\s+/g, ' ');
          if (lb) labels.push(lb.slice(0, 24));
        }
        note('STUCK  ', `the transfer window opened and there was no way to close it. Buttons: ${labels.join(' | ')}`);
        break;
      }
      continue;
    }
  }

  // otherwise: get back to the hub and press play
  if (!await tap(/play match|play next|^play$|next fixture/i, 'play')) {
    if (!await tap(/back to club|hub|home/i, 'back to the hub')) {
      if (!await tap(/continue|next/i, 'continue')) {
        /* A stuck report that does not say what was on offer is a report you
           have to reproduce by hand before you can act on it. List the
           controls, so the finding is the whole story. */
        const bs = page.locator('button:visible');
        const labels = [];
        for (let k = 0; k < Math.min(await bs.count().catch(() => 0), 20); k++) {
          const lb = ((await bs.nth(k).innerText().catch(() => '')) || '').trim().replace(/\s+/g, ' ');
          const off = await bs.nth(k).isDisabled().catch(() => false);
          if (lb) labels.push(lb.slice(0, 26) + (off ? ' [off]' : ''));
        }
        note('STUCK  ', `nothing moved the game on at step ${step}. On screen: "${t.slice(0, 120)}". Buttons: ${labels.join(' | ')}`);
        break;
      }
    }
  }
}

const ending = seasonEnd ? 'played the season out' : sacked ? 'was sacked, which is a real ending' : 'ran out of steps';
console.log(`   ${halftimes} half times, ${fullTimes} full times, ${subsMade} subs, ${shapeChanges} shape changes, ${windows} windows`);
console.log(`   ending: ${ending}`);
if (!seasonEnd && !sacked && fullTimes < 5) note('SHALLOW', `only reached ${fullTimes} matches, so most of the season was never exercised`);
if (fullTimes < 5) note('SHALLOW', `only ${fullTimes} matches were played, which is too few to have exercised much`);
if (halftimes === 0) note('BROKEN ', 'never reached a single half time, so Round 119 is not covered by this run');
if (halftimes > 0 && fullTimes === 0) note('BROKEN ', 'reached half time but never a full time, so matches do not finish');
if (halftimes > 0 && subsMade === 0) note('BROKEN ', 'never managed to make a single substitution');

console.log(`\nPlayed Club Manager through its own screens. ${findings.length} findings.`);
await browser.close();
process.exit(findings.length === 0 ? 0 : 1);
