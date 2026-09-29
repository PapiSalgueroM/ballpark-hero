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
 * NEGATIVE CONTROL: CAREER_HUB_CONTROL=revert rewrites the served chunks so
 * the hubs lose the Inbox box and the money app loses its headline, which is
 * the game as it stood before those rounds. Every check aimed at them must
 * fail, and the run refuses to count if either rewrite matched nothing.
 *
 * Run: npm run build && node scripts/lib/hostLikeServer.mjs dist 4173, then
 *      ENGINES=chromium node scripts/playCareerHub.mjs
 */
import pw from './lib/playwrightLoader.mjs';
import { installServedCodeControl, controlledChecks } from './lib/servedCodeControl.mjs';

const { chromium } = pw;
const BASE = process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173';

const CONTROL = process.env.CAREER_HUB_CONTROL || '';
if (CONTROL && CONTROL !== 'revert') {
  console.error(`CAREER_HUB_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(1);
}
const { say, verdict } = controlledChecks(CONTROL);
const REVERT = [
  /* The board's own appended sixth box, [...shared, {key:"inbox",...}],
     back to just the shared five. */
  { label: 'inboxBox', find: /\[\.\.\.([\w$]+),\{key:"inbox",[^\]]*?\}\]/g, replace: '[...$1]' },
  { label: 'moneyHeadline', find: 'Everything you have', replace: 'Probe control' },
];
const proof = {};

const GAMES = [
  { path: '/nfl-my-career', key: 'nfl-my-career-save-v1', name: 'NFL', ring: 'ring' },
  { path: '/nba-my-career', key: 'nba-my-career-save-v1', name: 'NBA', ring: 'ring' },
  { path: '/mlb-my-career', key: 'mlb-my-career-save-v1', name: 'MLB', ring: 'ring' },
  { path: '/nhl-my-career', key: 'nhl-my-career-save-v1', name: 'NHL', ring: 'Cup' },
];

/* Each box, and something that only appears once that box is open. The
   Inbox is empty on a fresh draft ("No texts yet"), and a row carries
   data-inbox-row if a sport ever sends one on draft night. */
const BOXES = [
  ['My Player', /overall/i],
  ['The Bank', /Everything you have/i],
  ['Career Log', /No seasons on the books|\d{4}/],
  ['Trophy Case', /individual|Nothing on the shelf/i],
  ['News', /Quiet week|headline|·/i],
  ['Inbox', /No texts yet/i, '[data-inbox-row]'],
];
const N = BOXES.length;

const tile = (page, word) =>
  page.locator('button:has(div.uppercase)').filter({ hasText: new RegExp(word, 'i') }).first();

const browser = await chromium.launch();

for (const game of GAMES) {
  console.log(`${game.name} My Career`);
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  if (CONTROL) await installServedCodeControl(ctx, REVERT, proof);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));

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
  say(await boxes.count() === N, `${game.name}: the hub opens on ${N} boxes (saw ${await boxes.count()})`, true);
  const hubText = (await page.locator('body').innerText()).toLowerCase();
  for (const [word] of BOXES) {
    say(hubText.includes(word.toLowerCase()), `${game.name}: the hub names "${word}"`, word === 'Inbox');
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

  /* Every box opens what it names and the way back works. A box that is
     not on the hub fails its check here rather than timing out the click. */
  for (const [word, marker, rowSel] of BOXES) {
    if (!(await tile(page, word).count())) {
      say(false, `${game.name}: "${word}" opened the screen it names (no such box on the hub)`, word === 'Inbox');
      continue;
    }
    await tile(page, word).click();
    await page.waitForTimeout(450);
    const open = await page.locator('body').innerText();
    const opened = marker.test(open) || (rowSel ? (await page.locator(rowSel).count()) > 0 : false);
    say(opened, `${game.name}: "${word}" opened the screen it names`, word === 'The Bank');
    say(await page.locator('button:has(div.uppercase)').count() === 0, `${game.name}: opening "${word}" replaced the grid`);
    const back = page.locator('button:has-text("Hub")');
    say(await back.count() === 1, `${game.name}: "${word}" has a way back`);
    await back.first().click();
    await page.waitForTimeout(400);
    say(await page.locator('button:has(div.uppercase)').count() === N, `${game.name}: back returned to all ${N} boxes`, true);
  }

  /* The trophy case, read off the screen against the history written above. */
  await tile(page, 'Trophy Case').click();
  await page.waitForTimeout(500);
  const case_ = page.locator('[data-trophy-case]');
  say(await case_.count() === 1, `${game.name}: the trophy case is its own screen`);
  const caseText = await case_.innerText();
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

await browser.close();
/* Per game under the control: the box count, the hub naming the Inbox, the
   Inbox box itself, the Bank's headline, and the way back from the five
   boxes that are still there. */
const code = verdict('playCareerHub', CONTROL ? proof : null, { minGuarded: GAMES.length * 9 });
if (code || CONTROL) process.exit(code);
console.log('playCareerHub: green. Four career games on live boxes, and every award on the screen has a year on it.');
