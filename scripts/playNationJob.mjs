/**
 * Round 202 browser harness: taking the national team job.
 *
 * simNationJob proves the engine. This proves the screen: a save doctored
 * to a decorated record (the same state a long successful career produces,
 * reached in one step) has the country calling on the Manager tile, the
 * offer names the right nation, taking it replaces the offer with the job
 * card, and it survives a reload because it is part of the save.
 *
 * Run: npm run build, serve dist with scripts/lib/hostLikeServer.mjs on 4173, then
 *      ENGINES=chromium node scripts/playNationJob.mjs
 *
 * Round 1314: red on main since Round 1052 for two stale presses, the game
 * itself unchanged (simNationJob green throughout). 'text=Premier League'
 * pressed the sentence under the page title, which since Round 1052 names the
 * Russian Premier League, so the league step never moved on; it is the league
 * TILE now, as in the sibling walks (Round 1304). And the Manager tile was
 * found as the first button whose text holds "MANAGER" in any case, which
 * since Round 928 is the "Managers" slot switcher in the header; it is now the
 * one hub tile whose title element reads exactly Manager, asserted to be one.
 * The walk also blocks the database host, as every walk must.
 *
 * Control: NATION_JOB_CONTROL=nooffer turns the served offer into null (the
 * return of nationOfferFor, anchored on its blurb literal, which minifying
 * keeps; a function name it does not). The anchor must match exactly once in
 * the built chunks or the run refuses to start. The tile and offer checks
 * must fail and nothing else; the verdict exits 0 on "all N guarded checks
 * fired" and 1 otherwise (scripts/lib/servedCodeControl.mjs).
 * Control (fix review of Round 1314): NATION_JOB_CONTROL=twotiles serves the
 * Rival watch hub tile with the title Manager (its title literal, matched
 * exactly once in the built chunks or refused), so two tiles carry the title.
 * The two "exactly once" tile checks must fail and nothing before them; the
 * walk stops after the second, because the tile locator then holds two
 * buttons. Same verdict and exit codes as nooffer.
 * (runAllSims files it as a browser harness automatically, it imports
 * playwright, and runs it only with --browser.)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pw from './lib/playwrightLoader.mjs';
import { installServedCodeControl, controlledChecks } from './lib/servedCodeControl.mjs';
import { answerConsent } from './lib/answerConsent.mjs';

const { chromium } = pw;
const BASE = process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173';

const CONTROL = process.env.NATION_JOB_CONTROL || '';
/* The offer's return, as the minified chunk writes it: {nation:t,blurb:`${t} want you ...`.
   Property names and string literals survive minifying; nationOfferFor's name does not. */
const OFFER = /\{nation:[\w$]+,blurb:`\$\{[\w$]+\} want you for the national team alongside the /g;
/* Fix review of Round 1314: the control of the two "exactly once" tile checks. The Rival watch
   hub tile, always on the hub, is served with the title Manager, so a second tile carries the
   title the walk looks for (the failure Round 928's "Managers" switcher caused through a
   substring). The title is a string literal, which minifying keeps. */
const RIVAL_TILE = /title:"Rival watch"/g;
const MUTATIONS = {
  nooffer: { label: 'nationOffer', find: OFFER, replace: 'null&&$&', what: "the offer's return" },
  twotiles: { label: 'secondManagerTile', find: RIVAL_TILE, replace: 'title:"Manager"', what: 'the Rival watch tile title' },
};
if (CONTROL && !MUTATIONS[CONTROL]) {
  console.error(`NATION_JOB_CONTROL=${CONTROL} is not a control this harness knows (${Object.keys(MUTATIONS).join(', ')})`);
  process.exit(1);
}
const { say, verdict } = controlledChecks(CONTROL);
const proof = {};
if (CONTROL) {
  const m = MUTATIONS[CONTROL];
  const dir = path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), 'dist', 'assets');
  const hits = fs.readdirSync(dir).filter(f => f.endsWith('.js'))
    .map(f => ({ f, n: (fs.readFileSync(path.join(dir, f), 'utf8').match(m.find) || []).length }))
    .filter(h => h.n > 0);
  const total = hits.reduce((n, h) => n + h.n, 0);
  console.log(`  control  ${m.what} matched ${total} time(s) in the built chunks (${hits.map(h => h.f).join(', ') || 'none'})`);
  if (total !== 1) {
    console.error(`playNationJob control ${CONTROL}: refused, the anchor must match exactly once in dist/assets and matched ${total} time(s)`);
    process.exit(1);
  }
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
/* Round 1314: no walk reaches the live database. */
await ctx.route(/supabase\.co/, r => r.abort());
if (CONTROL) {
  const m = MUTATIONS[CONTROL];
  await installServedCodeControl(ctx, [{ label: m.label, find: m.find, replace: m.replace }], proof);
}
/* Round 1314: the hub tile whose TITLE reads exactly Manager. A hub tile's
   accessible name is its whole text (icon, title, value, sub line), and a case
   blind substring also takes the header's "Managers" slot switcher. */
const managerTile = p => p.locator('button').filter({ has: p.locator('div.uppercase', { hasText: /^\s*Manager\s*$/ }) });
let page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));

console.log('1) Take a job and build a record worth a country');
await page.goto(`${BASE}/club-manager`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
const fresh = page.locator('text=Start Fresh');
if (await fresh.count()) { await fresh.click(); await page.waitForTimeout(800); }
await page.locator('button:has-text("2026-27")').first().click();
await page.waitForTimeout(700);
await page.locator('text=England').first().click();
await page.waitForTimeout(700);
/* Round 1314: the league TILE (see the header). */
await page.locator('button:has-text("Premier League")').first().click();
await page.waitForTimeout(700);
await page.locator('button:has-text("Manchester City")').first().click();
await page.waitForTimeout(500);
await answerConsent(page); await page.waitForTimeout(400);
await page.locator('text=Take the job').click();
await page.getByRole('button', { name: 'Skip: just manage', exact: true }).click();
await managerTile(page).first().waitFor({ state: 'visible' });
say(await managerTile(page).count() === 1, 'exactly one hub tile is titled Manager', CONTROL === 'twotiles');
say(await page.locator('button:has-text("Manager")').count() > 0, 'the career is running');

/* A record a federation would call about, written the way a long career
   would leave it: trophies in the cabinet, seasons behind him, a win rate. */
await page.close();
const helper = await ctx.newPage();
await helper.goto(`${BASE}/robots.txt`, { waitUntil: 'domcontentloaded' });
const patched = await helper.evaluate(() => {
  const raw = localStorage.getItem('dukb-club-manager-save');
  if (!raw) return false;
  const c = JSON.parse(raw);
  c.trophies = [1, 2, 3].map(i => ({ season: 2026 + i, name: 'Premier League', emoji: '🏆' }));
  c.history = [1, 2, 3, 4, 5].map(i => ({ season: 2026 + i, club: c.clubName, position: 1, points: 90, trophies: ['Premier League'] }));
  c.careerStats = { ...(c.careerStats ?? {}), played: 200, wins: 130, draws: 30, losses: 40 };
  localStorage.setItem('dukb-club-manager-save', JSON.stringify(c));
  return true;
});
await helper.close();
say(patched, 'the save was given a record worth an international job');

page = await ctx.newPage();
page.on('pageerror', e => errors.push(String(e)));
await page.goto(`${BASE}/club-manager`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1600);
const resume = page.locator('button:has-text("Resume Career")');
if (await resume.count()) { await resume.first().click(); await page.waitForTimeout(1200); }

console.log('2) The country calls on the Manager tile');
const tile = managerTile(page);
say(await tile.count() === 1, 'the manager tile is on the hub, exactly once', CONTROL === 'twotiles');
if (CONTROL === 'twotiles') {
  /* Two tiles answer to the locator now, so the walk stops here: the two count checks above are the
     ones this control is aimed at, and everything before them must have stayed green. */
  const controlErrors = errors.filter(e => !/supabase|Failed to fetch|CORS/i.test(e));
  say(controlErrors.length === 0, `no real page errors on the walk (${controlErrors.length ? controlErrors[0] : 'clean'})`);
  await browser.close();
  process.exit(verdict('playNationJob', proof, { minGuarded: 2 }));
}
const tileText = await tile.innerText();
say(/country is calling/i.test(tileText), `the tile says the country is calling (${tileText.replace(/\n/g, ' ').slice(0, 60)})`, true);
await tile.click();
const offer = page.locator('[data-nation-offer]');
if (CONTROL === 'nooffer') {
  /* Under the control there is no offer to wait for: wait on the manager panel
     itself (a Skip career's "Name your manager" button), then judge the card. */
  await page.locator('[data-name-manager]').first().waitFor({ state: 'visible' });
  say(await offer.count() === 1, 'the offer card is on the manager panel', true);
  const controlErrors = errors.filter(e => !/supabase|Failed to fetch|CORS/i.test(e));
  say(controlErrors.length === 0, `no real page errors on the walk (${controlErrors.length ? controlErrors[0] : 'clean'})`);
  await browser.close();
  process.exit(verdict('playNationJob', proof, { minGuarded: 2 }));
}
await offer.waitFor({ state: 'visible' });
say(await offer.count() === 1, 'the offer card is on the manager panel', true);

const offerText = await offer.innerText();
say(/England/.test(offerText), `an English club's manager is offered England (${offerText.split('\n')[1] ?? ''})`);
say(/summer/i.test(offerText), 'the offer is honest that it is a summer job');

console.log('3) Taking it holds both jobs');
await offer.locator('button').click();
await page.waitForTimeout(900);
say(await page.locator('[data-nation-offer]').count() === 0, 'the offer is gone once accepted');
const job = page.locator('[data-nation-job]');
say(await job.count() === 1, 'the job card replaced it');
const jobText = await job.innerText();
say(/England manager/i.test(jobText), 'the card names the country');
say(/tournament/i.test(jobText), 'the card explains when the country actually plays');
const body = await page.locator('body').innerText();
say(/Manchester City/.test(body), 'the club job is still his');

console.log('4) It is part of the save');
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1600);
const resume2 = page.locator('button:has-text("Resume Career")');
if (await resume2.count()) { await resume2.first().click(); await page.waitForTimeout(1200); }
await managerTile(page).click();
await page.locator('[data-nation-job]').waitFor({ state: 'visible' });
say(await page.locator('[data-nation-job]').count() === 1, 'the international job survived a reload');
/* Round 1314: the job card after the reload, at 390, for whoever reads the run. */
if (process.env.RC_OUT) await page.locator('[data-nation-job]').screenshot({ path: path.join(process.env.RC_OUT, 'nation-job-390.png') }).catch(() => {});

const pageErrors = errors.filter(e => !/supabase|Failed to fetch|CORS/i.test(e));
say(pageErrors.length === 0, `no real page errors on the walk (${pageErrors.length ? pageErrors[0] : 'clean'})`);
await page.close();
await browser.close();
const exitCode = verdict('playNationJob', proof, { minGuarded: 2 });
if (exitCode === 0) console.log('playNationJob: green. Win enough and your country calls, and the club job carries on underneath it.');
process.exit(exitCode);
