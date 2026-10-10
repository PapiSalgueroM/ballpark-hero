/**
 * Round 208 browser walk: the career hub boxes and the trophy case.
 *
 * simCareerHub proves the engine says the right words. This proves they
 * reach the screen in all four games, that every box opens the thing it
 * names and comes back, and that the trophy case shows what actually
 * happened rather than a counter: the walk writes a known career history
 * into the save and then reads the case back off the screen.
 *
 * It also pins the bug this round nearly shipped, which was caught by
 * looking at a screenshot rather than by a test: the career log box read
 * its last season off transient React state, so after a reload a five
 * season career said "play one and it goes on the books". The walk always
 * reloads before reading, so that regression cannot come back quietly.
 *
 * Round 672: the walk had been red since Round 469, and it was the walk that
 * was out of date, not the game. Round 469 turned the Bank box into the money
 * app, whose headline is "Everything you have" (the old panel said "Net
 * worth"), and Rounds 521 and 525 gave all four hubs a sixth box, the Inbox,
 * appended beside the five shared ones. The walk now expects six boxes, reads
 * the money app's headline, and walks the Inbox like the other five.
 *
 * Round 1210: red again since Round 1008 (2026-10-05), and again it was the
 * walk. Round 1008 made the Career Log open the season review instead of a hub
 * panel, and the review's one way back reads "Back to career", where the other
 * five boxes still sit under the hub panel bar and its "Hub" button. The walk
 * looked for "Hub" on every box, so in the first game it waited thirty seconds
 * for a button that was not there and died before the other three. Each box now
 * names its OWN way back, by the button's exact name, a box whose way back is
 * missing fails that one check and the walk reloads to get back to the hub
 * (which the old comment promised and the old code did not do), and the Career
 * Log earns a check for what it is now: the three seasons the walk wrote show
 * as three season tiles, and coming back puts focus on the log's own box.
 *
 * NEGATIVE CONTROL: CAREER_HUB_CONTROL=revert rewrites the served chunks so
 * the hubs lose the Inbox box and the money app loses its headline, which is
 * the game as it stood before those rounds. Every check aimed at them must
 * fail, and the run refuses to count if either rewrite matched nothing.
 * NEGATIVE CONTROL: CAREER_HUB_CONTROL=logback (Round 1210) rewrites the served
 * words "Back to career" to something else. The Career Log's way back check
 * must fail in all four games and every other check stay green; the run
 * refuses to count if the rewrite matched nothing.
 *
 * Review of Round 1210 (2026-10-10): "one missing button costs one check and
 * not the run" held for a button that is MISSING and not for one that is there
 * and does nothing. With the season review's back button given an empty
 * handler and the site rebuilt, the walk failed one check in the NFL game,
 * could not find the next three boxes, threw on the Trophy Case click and
 * never reached the other three games. Three changes: when the way back is
 * clicked and the opened screen is still up, the walk reloads exactly as it
 * does for a missing button; the Trophy Case click is guarded like the box
 * loop's; and a game that throws anyway fails by name and the walk goes on to
 * the next game.
 * NEGATIVE CONTROL: CAREER_HUB_CONTROL=deadback makes the Career Log's way back
 * do nothing, in the page (a listener on the button itself stops the click
 * before React hears it at the root; no served code is rewritten). "Back from
 * Career Log returned to all 6 boxes" must fail in all four games, every other
 * check stay green and all four games finish; the run refuses to count if the
 * listener was not put on in every game.
 *
 * Run: npm run build && node scripts/lib/hostLikeServer.mjs dist 4173, then
 *      ENGINES=chromium node scripts/playCareerHub.mjs
 */
import pw from './lib/playwrightLoader.mjs';
import { installServedCodeControl, controlledChecks } from './lib/servedCodeControl.mjs';

const { chromium } = pw;
const BASE = process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173';

const CONTROL = process.env.CAREER_HUB_CONTROL || '';
const CONTROLS = ['revert', 'logback', 'deadback'];
if (CONTROL && !CONTROLS.includes(CONTROL)) {
  console.error(`CAREER_HUB_CONTROL=${CONTROL} is not a control this harness knows (${CONTROLS.join(', ')})`);
  process.exit(1);
}
const { say, verdict } = controlledChecks(CONTROL);
/* Which checks a control is aimed at depends on the control that is on. */
const on = name => CONTROL === name;
const LOG_BACK = 'Back to career';
const MUTATIONS = {
  revert: [
    /* The board's own appended sixth box, [...shared, {key:"inbox",...}],
       back to just the shared five. */
    { label: 'inboxBox', find: /\[\.\.\.([\w$]+),\{key:"inbox",[^\]]*?\}\]/g, replace: '[...$1]' },
    { label: 'moneyHeadline', find: 'Everything you have', replace: 'Probe control' },
  ],
  /* The season review's way back, as the board hands it over (once in source,
     UsCareerBoard.tsx, outside the tests). */
  logback: [{ label: 'logBack', find: LOG_BACK, replace: 'Probe way back' }],
};
const proof = {};

const GAMES = [
  { path: '/nfl-my-career', key: 'nfl-my-career-save-v1', name: 'NFL', ring: 'ring' },
  { path: '/nba-my-career', key: 'nba-my-career-save-v1', name: 'NBA', ring: 'ring' },
  { path: '/mlb-my-career', key: 'mlb-my-career-save-v1', name: 'MLB', ring: 'ring' },
  { path: '/nhl-my-career', key: 'nhl-my-career-save-v1', name: 'NHL', ring: 'Cup' },
];

/* Each box: the word on it, something that only appears once that box is
   open, a row selector that also counts as open, and the exact name of its
   own way back. The Inbox is empty on a fresh draft ("No texts yet"), and a
   row carries data-inbox-row if a sport ever sends one on draft night. The
   Career Log is the season review since Round 1008: its heading, the line
   under it, and one way back that reads "Back to career". The other five
   open under the hub panel bar, whose button reads "Hub". */
const BOXES = [
  ['My Player', /overall/i, null, 'Hub'],
  ['The Bank', /Everything you have/i, null, 'Hub'],
  ['Career Log', /Career Log\s+Pick a year to review/, null, LOG_BACK],
  ['Trophy Case', /individual|Nothing on the shelf/i, null, 'Hub'],
  ['News', /Quiet week|headline|·/i, null, 'Hub'],
  ['Inbox', /No texts yet/i, '[data-inbox-row]', 'Hub'],
];
const N = BOXES.length;
/* The three seasons the walk writes onto the save, further down. */
const SEASONS_WRITTEN = 3;

const tile = (page, word) =>
  page.locator('button:has(div.uppercase)').filter({ hasText: new RegExp(word, 'i') }).first();

const browser = await chromium.launch();
/* deadback rewrites nothing that is served: its proof is the count of games in
   which the walk put its listener on the way back. */
if (on('deadback')) proof.deadBack = 0;

async function walkGame(game) {
  console.log(`${game.name} My Career`);
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  /* The walk never talks to the live database: a career is local storage. */
  await ctx.route(/supabase\.co/, r => r.abort());
  if (MUTATIONS[CONTROL]) await installServedCodeControl(ctx, MUTATIONS[CONTROL], proof);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));

  await page.addInitScript(route => localStorage.setItem(`rules-gate-seen:${route}`, '1'), game.path);
  await page.goto(`${BASE}${game.path}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1100);
  const consent = page.locator('button:has-text("Essential only")');
  if (await consent.count()) { await consent.first().click().catch(() => {}); await page.waitForTimeout(300); }
  await page.locator('input[placeholder*="name"]').first().fill('Probe Player');
  await page.locator('button:has-text("Enter the draft")').click();
  await page.waitForTimeout(1000);

  /* A known history, written straight onto the save. Three seasons, five
     awards, two of them the same award in different years, so the case has
     something real to group and date. */
  const wrote = await page.evaluate(key => {
    const raw = localStorage.getItem(key);
    if (!raw) return false;
    const s = JSON.parse(raw);
    const base = { team: s.c.team, age: 24, ovr: 88, games: 20, teamResult: 'Made the playoffs', salary: 8 };
    s.c.seasons = [
      { ...base, year: 2026, awards: [] },
      { ...base, year: 2027, awards: ['Probe Award'] },
      { ...base, year: 2028, awards: ['Probe Award', 'Second Probe Award'] },
    ];
    s.c.morale = 20;
    localStorage.setItem(key, JSON.stringify(s));
    return true;
  }, game.key);
  say(wrote, `${game.name}: wrote a known three season history onto the save`);

  /* Always through a reload: this is the state the shipped bug hid in. */
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1300);

  const boxes = page.locator('button:has(div.uppercase)');
  say(await boxes.count() === N, `${game.name}: the hub opens on ${N} boxes (saw ${await boxes.count()})`, on('revert'));
  const hubText = (await page.locator('body').innerText()).toLowerCase();
  for (const [word] of BOXES) {
    say(hubText.includes(word.toLowerCase()), `${game.name}: the hub names "${word}"`, on('revert') && word === 'Inbox');
  }

  /* The reload regression, stated as its own check: three seasons on the
     books must show as three seasons, not as "play one". */
  const logBox = await tile(page, 'Career Log').innerText();
  say(/3 seasons/i.test(logBox), `${game.name}: the log box survived the reload (reads "${logBox.replace(/\n/g, ' / ')}")`);
  say(!/Play one and it goes/i.test(logBox), `${game.name}: the log box is not pretending the career is empty`);

  /* Low morale lights the player box and names the meter. */
  const playerBox = await tile(page, 'My Player').innerText();
  say(/morale down at 20/i.test(playerBox), `${game.name}: the player box names the meter that is down`);
  say(await tile(page, 'My Player').locator('span.animate-pulse').count() === 1, `${game.name}: low morale lights the box`);

  /* Nothing hangs off the side at phone width. */
  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  say(overflow <= 2, `${game.name}: the hub fits the phone (${overflow}px of overflow)`);

  /* Every box opens what it names and its own way back works. A box that is
     not on the hub fails its check here rather than timing out the click, and
     so does a box whose way back is not there: the walk reloads to reach the
     hub again (an opened box is page state, a reload closes it) and goes on to
     the next box, so one missing button costs one check and not the run. */
  for (const [word, marker, rowSel, wayBack] of BOXES) {
    if (!(await tile(page, word).count())) {
      say(false, `${game.name}: "${word}" opened the screen it names (no such box on the hub)`, on('revert') && word === 'Inbox');
      continue;
    }
    await tile(page, word).click();
    await page.waitForTimeout(450);
    if (word === 'Career Log') await page.locator('[data-career-season-review]').first().waitFor({ timeout: 10000 }).catch(() => {});
    const open = await page.locator('body').innerText();
    const opened = marker.test(open) || (rowSel ? (await page.locator(rowSel).count()) > 0 : false);
    say(opened, `${game.name}: "${word}" opened the screen it names`, on('revert') && word === 'The Bank');
    say(await page.locator('button:has(div.uppercase)').count() === 0, `${game.name}: opening "${word}" replaced the grid`);
    if (word === 'Career Log') {
      /* The log is the season review now: one tile a saved season, newest first. */
      const tiles = await page.locator('[data-career-season-review] button[data-season-tile]').count();
      say(tiles === SEASONS_WRITTEN, `${game.name}: the Career Log shows the ${SEASONS_WRITTEN} seasons on the save as ${SEASONS_WRITTEN} season tiles (saw ${tiles})`);
    }
    const back = page.getByRole('button', { name: wayBack, exact: true });
    const ways = await back.count();
    say(ways === 1, `${game.name}: "${word}" has its way back, one button named "${wayBack}" (saw ${ways})`, on('logback') && word === 'Career Log');
    if (ways !== 1) {
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(1300);
      say(await page.locator('button:has(div.uppercase)').count() === N, `${game.name}: a reload reached the hub again after "${word}" had no way back`, on('revert'));
      continue;
    }
    if (on('deadback') && word === 'Career Log') {
      proof.deadBack += await back.evaluate(el => { el.addEventListener('click', e => e.stopPropagation()); return 1; });
    }
    await back.click();
    await page.waitForTimeout(400);
    const boxesBack = await page.locator('button:has(div.uppercase)').count();
    say(boxesBack === N, `${game.name}: back from "${word}" returned to all ${N} boxes`, on('revert') || (on('deadback') && word === 'Career Log'));
    if (boxesBack === 0) {
      /* The way back is there and did nothing: the opened screen is still up.
         The same cure as a missing button, so the next box is not looked for
         on a screen that is not the hub. */
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(1300);
      say(await page.locator('button:has(div.uppercase)').count() === N, `${game.name}: a reload reached the hub again after the way back from "${word}" did nothing`, on('revert'));
      continue;
    }
    if (word === 'Career Log') {
      const focused = await page.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement.innerText : ''));
      say(/Career Log/i.test(focused), `${game.name}: coming back from the Career Log put focus on its own box (focus is on "${focused.replace(/\n/g, ' / ').slice(0, 60)}")`);
    }
  }

  /* The trophy case, read off the screen against the history written above.
     Guarded like the box loop: with no such box on screen the check fails by
     name and the case is read as empty, where the click used to wait thirty
     seconds and throw. */
  const caseBox = await tile(page, 'Trophy Case').count();
  if (caseBox) {
    await tile(page, 'Trophy Case').click();
    await page.waitForTimeout(500);
  }
  const case_ = page.locator('[data-trophy-case]');
  say(await case_.count() === 1, `${game.name}: the trophy case is its own screen${caseBox ? '' : ' (no Trophy Case box on screen to open it from)'}`);
  const caseText = await case_.count() === 1 ? await case_.innerText() : '';
  say(/Probe Award/.test(caseText), `${game.name}: the case names the award that was won`);
  say(/x2/.test(caseText), `${game.name}: the case counted the award won twice`);
  say(/2027, 2028/.test(caseText), `${game.name}: the case dated both wins`);
  say(/Second Probe Award/.test(caseText), `${game.name}: the case lists the second award too`);
  say(/3 individual honours/.test(caseText), `${game.name}: the case totalled the honours (reads "${caseText.split('\n')[1] ?? ''}")`);
  say(new RegExp(game.ring, 'i').test(caseText), `${game.name}: the case uses the sport's own word for a title`);

  const real = errors.filter(e => !/supabase|Failed to fetch|CORS/i.test(e));
  say(real.length === 0, `${game.name}: no page errors (${real.length ? real[0] : 'clean'})`);
  await ctx.close();
}

/* A game that throws fails by name and the walk goes on: a stack in the first
   game is how this walk stayed unread for five days. */
let finished = 0;
for (const game of GAMES) {
  try {
    await walkGame(game);
    finished += 1;
  } catch (e) {
    say(false, `${game.name}: the walk got through this game (it threw: ${String(e).split('\n')[0].slice(0, 200)})`);
  }
}
say(finished === GAMES.length, `the walk finished all ${GAMES.length} games (finished ${finished})`);

await browser.close();
/* Per game under revert: the box count, the hub naming the Inbox, the Inbox
   box itself, the Bank's headline, and the way back from the five boxes that
   are still there (nine). Per game under logback: the Career Log's way back
   (one). Per game under deadback: coming back from the Career Log (one). */
const MIN_GUARDED = { revert: GAMES.length * 9, logback: GAMES.length, deadback: GAMES.length };
if (on('deadback') && proof.deadBack !== GAMES.length) {
  console.error(`playCareerHub control deadback: REFUSING TO COUNT. The listener went on in ${proof.deadBack} of ${GAMES.length} games.`);
  process.exit(1);
}
const code = verdict('playCareerHub', CONTROL ? proof : null, { minGuarded: MIN_GUARDED[CONTROL] ?? 1 });
if (code || CONTROL) process.exit(code);
console.log('playCareerHub: green. Four career games on live boxes, and every award on the screen has a year on it.');
