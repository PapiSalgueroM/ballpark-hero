// Release AM reviewer (us-careers), never committed. The legend flows and the runner of walk 2.
import { open, toHub, check, note, report, save, keyOf, chromium } from './walk.mjs';
import { measure, hubLine, retry, PHONE, DESK } from './walkMain.mjs';
import { landing, oldSave, homeAndBack, bodyText, hallText, scored, create, playOne } from './walk2.mjs';

/* an NBA veteran with a Hall of Fame record: twelve seasons, rating 72 at 35, so the retirement talk is owed on load */
const seedLegend = (page, key) => page.evaluate(k => {
  const raw = JSON.parse(localStorage.getItem(k));
  const c = raw.c, s0 = c.seasons[0], rows = [];
  for (let i = 11; i >= 0; i -= 1) rows.push({ ...s0, year: s0.year - i, age: 34 - i, ovr: i === 0 ? 72 : 90, ppg: 27.4, games: 78 });
  c.seasons = rows; c.age = 35; c.ovr = 72; c.rings = 4; c.mvps = 3; c.finalsMvps = 2; c.allNbas = 9; c.contractYears = 3;
  delete c.summer; delete c.pendingRivalryEvent; delete c.pendingRivalryChoice;
  const out = JSON.stringify(raw);
  localStorage.setItem(k, out);
  return out;
}, key);

/* W3. the retirement talk, a farewell season and the Hall, with the writes refused at each step. */
async function legend(browser, vp, tag, recover) {
  const slug = 'nba';
  const s = await open(browser, vp, slug, tag);
  const { page } = s;
  const key = keyOf(slug);
  await create(s, 'Legend Probe');
  await playOne(s);
  const seeded = await seedLegend(page, key);
  await s.goto();
  const talkUp = await page.locator('button:has-text("Announce a farewell season")').count();
  check(talkUp === 1, `${tag} legend: the seeded veteran opens on the retirement talk`, (await bodyText(page)).slice(0, 200));
  await s.shot('retirement-talk');
  await s.block(true);
  await page.locator('button:has-text("Announce a farewell season")').click();
  await page.waitForTimeout(900);
  const m1 = await measure(page);
  check(m1 && m1.op === 'write' && (await s.stored()) === seeded, `${tag} legend: a refused farewell answer shows the notice and leaves the disk alone`, JSON.stringify(m1));
  check(/Farewell season/.test(await bodyText(page)), `${tag} legend: the hub carries the farewell banner while unsaved`);
  await s.shot('farewell-announced-refused');
  const want1 = await s.lastAttempt();
  await retry(s);
  check((await s.stored()) === want1.v && !(await measure(page)), `${tag} legend: Retry writes the farewell answer byte for byte`);
  await s.goto();
  check(/Farewell season/.test(await bodyText(page)) && !(await page.locator('button:has-text("Announce a farewell season")').count()), `${tag} legend: a reload keeps the farewell and does not ask the talk again`);
  const beforeLast = await s.stored();
  /* the farewell season, every write refused */
  await s.block(true);
  const trail = await playOne(s);
  note(`${tag} legend farewell season trail`, trail);
  check(trail[trail.length - 1] === 'retired', `${tag} legend: the farewell season ends the career`, trail.join(','));
  await page.waitForTimeout(9000);
  const h1 = await hallText(page);
  note(`${tag} legend hall card while the retirement is unsaved`, h1);
  check(!!h1 && /Hall/.test(h1), `${tag} legend: the Hall card is on the retirement screen`, String(h1).slice(0, 200));
  check((await s.stored()) === beforeLast && !!(await measure(page)), `${tag} legend: the disk still holds the farewell hub while the retirement is refused, and the notice says so`);
  await s.shot('retired-hall-refused');
  await s.shot('retired-hall-refused-full', true);
  note(`${tag} legend completions after retiring`, scored(s));
  /* the induction speech, still refused */
  const speech = page.locator('div.rounded-xl.border-2.bg-gradient-to-b button').filter({ hasNotText: 'Continue' }).first();
  const asked = await speech.count();
  note(`${tag} legend speech asked`, asked);
  if (asked) { await speech.click(); await page.waitForTimeout(1200); }
  const h1b = await hallText(page);
  await s.shot('speech-given-refused');
  const want2 = await s.lastAttempt();
  const postedAtRetire = s.completions.length;
  if (recover) {
    await retry(s);
    const got = await s.stored();
    const p = got ? JSON.parse(got) : null;
    check(got === want2.v && p?.c?.retired === true && p.phase === 'retired' && !(await measure(page)), `${tag} legend: Retry writes the retired save byte for byte the latest refused write`);
    note(`${tag} legend recovered save`, { seasons: p?.c?.seasons?.length, retirement: p?.c?.retirement, hallSpeech: p?.c?.hallSpeech, numberRetiredBy: p?.c?.numberRetiredBy });
    await s.goto();
    await page.waitForTimeout(9000);
    const h2 = await hallText(page);
    check(h2 === h1b, `${tag} legend: after the reload the Hall card reads the same (same ballots, same speech, not asked again)`, `${h1b} || ${h2}`);
    check(s.completions.length === postedAtRetire, `${tag} legend: the reload posts no completion`, `${postedAtRetire} then ${s.completions.length}`);
    check((await s.stored()) === got, `${tag} legend: opening the recovered retired save writes nothing`);
    await s.shot('retired-hall-reloaded', true);
  } else {
    /* the tab is reloaded without Retry: what does he find, and what does finishing again cost */
    await s.block(false);
    await s.goto();
    const txt = await bodyText(page);
    note(`${tag} legend reload WITHOUT retry`, { hub: /Play the \d{4} season/.test(txt), farewell: /Farewell season/.test(txt), retiredScreen: /retires/.test(txt), notice: !!(await measure(page)), diskIsFarewellHub: (await s.stored()) === beforeLast });
    await s.shot('reloaded-without-retry');
    const again = await playOne(s);
    await page.waitForTimeout(2500);
    note(`${tag} legend second finish after an unrecovered retirement`, { trail: again, posts: scored(s), postsAtFirstRetire: postedAtRetire, postsNow: s.completions.length });
    await s.shot('second-finish');
  }
  await s.context.close();
}

/* W5. the summer deck: an answer refused, then a reload with and without Retry. */
async function summer(browser, vp, slug, tag, recover) {
  const s = await open(browser, vp, slug, tag);
  const { page } = s;
  await create(s, 'Summer Probe');
  await page.locator('button:has-text("Play the")').first().click();
  await page.waitForTimeout(700);
  const step = () => page.evaluate(() => document.querySelector('[data-career-summer-step]')?.getAttribute('data-career-summer-step') ?? null);
  const eventId = () => page.evaluate(() => document.querySelector('[data-career-decision-event]')?.getAttribute('data-career-decision-event') ?? null);
  for (let i = 0; i < 12 && !(await eventId()); i += 1) {
    for (const sel of ['[data-season-reveal] button:has-text("Continue")', '[data-rivalry-event] button:has-text("Continue")', '[data-rivalry-choice] button:has-text("Continue")', '[data-rivalry-option]']) {
      const loc = page.locator(sel).first();
      if (await loc.count() && await loc.isVisible()) { await loc.click(); break; }
    }
    await page.waitForTimeout(500);
  }
  const first = { step: await step(), id: await eventId() };
  note(`${tag} ${slug} first summer card`, first);
  if (!first.id) { await s.shot('no-summer-card', true); await s.context.close(); return; }
  const diskAtCard = await s.stored();
  await s.block(true);
  await page.locator('[data-career-decision-option]').first().click();
  await page.waitForTimeout(700);
  await s.shot('summer-answer-refused');
  const want = await s.lastAttempt();
  check(!!(await measure(page)) && (await s.stored()) === diskAtCard, `${tag} ${slug}: a refused summer answer shows the notice and leaves the disk on the card`);
  if (recover) await retry(s); else await s.block(false);
  await s.goto();
  const second = { step: await step(), id: await eventId(), hub: /Play the \d{4} season/.test(await bodyText(page)) };
  note(`${tag} ${slug} after reload (${recover ? 'with' : 'without'} Retry)`, second);
  if (recover) check((await s.stored()) !== diskAtCard && second.id !== first.id, `${tag} ${slug}: after Retry and a reload the answered card is not dealt again`, JSON.stringify({ first, second }));
  else check(second.id === first.id && second.step === first.step, `${tag} ${slug}: without Retry the reload opens on the same card, unanswered`, JSON.stringify({ first, second }));
  note(`${tag} ${slug} refused write was the latest`, { len: want?.v?.length });
  await s.shot('summer-after-reload');
  await s.context.close();
}

async function main() {
  const browser = await chromium.launch();
  const run = async (name, fn) => {
    console.log(`--- ${name}`);
    try { await fn(); } catch (e) {
      report.errors.push({ kind: 'walk-crash', flow: name, text: String(e && e.stack ? e.stack : e).slice(0, 900) });
      console.log(`WALK CRASH in ${name}: ` + String(e && e.stack ? e.stack : e).slice(0, 900));
      save();
    }
  };
  await run('legend phone recover', () => legend(browser, PHONE, 'p390leg', true));
  await run('legend desktop no retry', () => legend(browser, DESK, 'd1280leg', false));
  await run('landing nfl phone', () => landing(browser, PHONE, 'nfl', 'p390land'));
  await run('landing nfl desktop', () => landing(browser, DESK, 'nfl', 'd1280land'));
  await run('old nfl phone', () => oldSave(browser, PHONE, 'nfl', 'p390old2'));
  await run('old nfl desktop', () => oldSave(browser, DESK, 'nfl', 'd1280old2'));
  await run('home and back nhl', () => homeAndBack(browser, PHONE, 'nhl', 'p390tab'));
  await run('summer mlb recover', () => summer(browser, PHONE, 'mlb', 'p390sum', true));
  await run('summer nfl no retry', () => summer(browser, DESK, 'nfl', 'd1280sum', false));
  await browser.close();
  const failed = report.checks.filter(c => !c.ok).length;
  console.log(`US careers walk 2: ${report.checks.length - failed} of ${report.checks.length} checks passed, ${report.errors.length} page errors, ${report.shots.length} screenshots.`);
  save();
  process.exit(failed || report.errors.length ? 1 : 0);
}

await main();
