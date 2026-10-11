// Release AX review (engine-saves): can a saved contract talk in the US careers be rerolled? A real browser on the
// served build, Math.random NOT seeded (the builder's walk reseeds it identically on every load, which would hide a
// redraw). Journeys: R reload/Back/Spin/Skip on an extension talk; T a second tab; F a free agency window;
// M stale and malformed talks dropped alone with the season still playing.
// usage on a runner (#!serve #!playwright): node .rc/x/walkUsTalk.mjs     (BASE from the environment)
import fs from 'node:fs';
import path from 'node:path';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || path.join(process.cwd(), '.tmp-fx', 'review-engine-saves', 'shots');
fs.mkdirSync(OUT, { recursive: true });
const SPORTS = { nfl: ['/nfl-my-career', 'nfl-my-career-save-v1'], nba: ['/nba-my-career', 'nba-my-career-save-v1'], mlb: ['/mlb-my-career', 'mlb-my-career-save-v1'], nhl: ['/nhl-my-career', 'nhl-my-career-save-v1'] };
const fixture = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'scripts/data/usBoardFixture.json'), 'utf8'));
let checks = 0, failed = 0;
const notes = [];
const check = (name, cond, line) => { checks += 1; if (!cond) failed += 1; console.log(`${cond ? 'ok  ' : 'FAIL'} ${name}: ${line}`); };
const note = line => { notes.push(line); console.log(`NOTE ${line}`); };
const browser = await pw.chromium.launch({ args: ['--no-sandbox'] });
const errors = [];

async function context(slug, raw, size = { width: 390, height: 844 }) {
  const [route, key] = SPORTS[slug];
  const ctx = await browser.newContext({ viewport: size });
  await ctx.addInitScript(([k, v, r]) => {
    if (!localStorage.getItem('review-seeded')) {
      localStorage.setItem('review-seeded', '1');
      localStorage.setItem('cookie-consent', 'essential');
      localStorage.setItem(k, v);
      localStorage.setItem('rules-gate-seen:' + r, '1');
      for (const s of ['nba', 'nfl', 'mlb', 'nhl']) localStorage.setItem(`seasonCentre:help:${s}`, '1');
    }
  }, [key, raw, route]);
  await ctx.route(/supabase\.co/, r => r.abort());
  return ctx;
}
async function open(ctx, slug) {
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(`${slug}: ${String(e).slice(0, 200)}`));
  await page.goto(`${BASE}${SPORTS[slug][0]}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  return page;
}
const saveOf = async (page, slug) => JSON.parse((await page.evaluate(k => localStorage.getItem(k), SPORTS[slug][1])) || 'null');
const bytesOf = (page, slug) => page.evaluate(k => localStorage.getItem(k), SPORTS[slug][1]);
const press = async (page, sel) => { await page.locator(sel).first().waitFor({ state: 'attached', timeout: 20000 }); return page.evaluate(q => { const el = document.querySelector(q); if (!el || el.disabled) return false; el.click(); return true; }, sel); };
const has = (page, sel) => page.locator(sel).count().then(n => n > 0);
const pressPlay = page => page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /^Play the [0-9]+ season$/.test((x.textContent || '').trim())); if (!b) return false; b.click(); return true; });
const hub = page => page.getByRole('button', { name: /^Play the [0-9]+ season$/ }).waitFor({ state: 'visible', timeout: 30000 }).then(() => true, () => false);
const seen = (page, sel, ms = 20000) => page.locator(sel).first().waitFor({ state: 'visible', timeout: ms }).then(() => true, () => false);
const shot = (page, name) => page.screenshot({ path: path.join(OUT, name + '.png'), fullPage: false }).catch(() => undefined);
const offer = s => s?.contractTalk?.talk?.offer ? `${s.contractTalk.talk.offer.salary}x${s.contractTalk.talk.offer.years}` : s?.contractTalk?.talk ? 'no offer' : 'no talk';
const windowOf = s => (s?.contractTalk?.window?.offers ?? []).map(o => `${o.team}:${o.salary}x${o.years}${o.pushed ? 'p' : ''}${o.gone ? 'g' : ''}`).join(' ');
const wheelOf = s => s?.contractTalk?.wheel ? `${s.contractTalk.wheel.result}[${s.contractTalk.wheel.draws.map(n => n.toFixed(6)).join(',')}]seen=${s.contractTalk.wheel.seen}` : 'no wheel';

try {
  /* ---------- R: an extension talk against reload, Back, Spin, Skip ---------- */
  for (const slug of ['nfl', 'nba']) {
    const ctx = await context(slug, fixture.sports[slug].saves.ext);
    const page = await open(ctx, slug);
    check('R open', await hub(page) && await pressPlay(page) && await seen(page, '[data-extension-talk]'), `${slug}: Play on a save in the last year of its deal opens the talk`);
    const first = await saveOf(page, slug), firstBytes = await bytesOf(page, slug);
    check('R saved', first.phase === 'extension' && first.contractTalk?.kind === 'extension', `${slug}: the talk is on the save (phase ${first.phase}, offer ${offer(first)})`);
    await shot(page, `R-${slug}-390-talk`);
    let same = true;
    for (let i = 0; i < 3; i += 1) { await page.reload({ waitUntil: 'domcontentloaded' }); same = same && await seen(page, '[data-extension-talk]') && (await bytesOf(page, slug)) === firstBytes; }
    check('R reload', same, `${slug}: three reloads (Math.random not seeded) land on the same talk and the same save bytes, offer ${offer(await saveOf(page, slug))}`);
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    await page.goBack({ waitUntil: 'domcontentloaded' });
    const backOk = await seen(page, '[data-extension-talk]') && (await bytesOf(page, slug)) === firstBytes;
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    await page.goto(`${BASE}${SPORTS[slug][0]}`, { waitUntil: 'domcontentloaded' });
    check('R back', backOk && await seen(page, '[data-extension-talk]') && (await bytesOf(page, slug)) === firstBytes, `${slug}: leaving for the home page and coming back (history Back, then a fresh visit) lands on the same talk and bytes`);
    if (first.contractTalk.talk.offer) {
      const pushed = await press(page, '[data-ext-push]');
      const wheelUp = await seen(page, '[data-market-wheel]');
      const afterPush = await saveOf(page, slug);
      check('R push', pushed && wheelUp && afterPush.contractTalk?.wheel?.seen === false && afterPush.contractTalk.talk.pushed === true, `${slug}: the push is saved before the wheel is spun (${wheelOf(afterPush)}; offer now ${offer(afterPush)})`);
      await shot(page, `R-${slug}-390-wheel-ready`);
      const pushBytes = await bytesOf(page, slug);
      await page.reload({ waitUntil: 'domcontentloaded' });
      check('R wheel reload', await seen(page, '[data-market-wheel]') && (await bytesOf(page, slug)) === pushBytes, `${slug}: a reload at the unspun wheel shows the wheel again on the same saved result`);
      const blocked = await page.evaluate(() => ['[data-ext-sign]', '[data-ext-decline]', '[data-ext-push]'].filter(q => document.querySelector(q)).join(' '));
      check('R wheel gate', blocked === '', `${slug}: with the wheel unseen no Sign, Decline or Push is on screen (${blocked || 'none'})`);
      await press(page, '[data-market-spin]');
      await page.waitForTimeout(400);
      await shot(page, `R-${slug}-390-wheel-spinning`);
      await page.reload({ waitUntil: 'domcontentloaded' });
      check('R spin reload', await seen(page, '[data-market-wheel]') && (await bytesOf(page, slug)) === pushBytes, `${slug}: a reload in the middle of a spin changes nothing on the save`);
      await press(page, '[data-market-skip]');
      const shown = await page.locator('[data-market-wheel]').getAttribute('data-market-result');
      await shot(page, `R-${slug}-390-wheel-revealed`);
      check('R skip', shown === afterPush.contractTalk.wheel.result, `${slug}: Skip reveals the saved result (${shown} against saved ${afterPush.contractTalk.wheel.result})`);
      await press(page, '[data-market-continue]');
      await seen(page, '[data-extension-talk]');
      const ack = await saveOf(page, slug);
      check('R continue', ack.contractTalk?.wheel?.seen === true && offer(ack) === offer(afterPush), `${slug}: Continue marks the wheel seen and the offer is the saved one (${offer(ack)})`);
      const again = await page.evaluate(() => { const b = document.querySelector('[data-ext-push]'); if (!b) return 'no push button'; const was = b.disabled; b.disabled = false; b.click(); return was ? 'disabled, forced' : 'enabled'; });
      await page.waitForTimeout(300);
      const afterAgain = await saveOf(page, slug);
      check('R one push', offer(afterAgain) === offer(ack) && wheelOf(afterAgain) === wheelOf(ack) && !(await has(page, '[data-market-wheel]')), `${slug}: a second push changes nothing (${again})`);
      await shot(page, `R-${slug}-390-after-push`);
    } else note(`${slug}: the club made no offer on the ext save, so the push was not walked`);
    await ctx.close();
  }
} catch (e) { failed += 1; console.log(`FAIL journey R stopped: ${String(e?.stack ?? e).split('\n').slice(0, 6).join(' | ')}`); }

/* ---------- T: a second tab ---------- */
try {
  for (const [slug, size, tag] of [['nfl', { width: 1280, height: 900 }, '1280'], ['nba', { width: 390, height: 844 }, '390']]) {
    const ctx = await context(slug, fixture.sports[slug].saves.ext, size);
    const a = await open(ctx, slug);
    await hub(a); await pressPlay(a); await seen(a, '[data-extension-talk]');
    const opened = await saveOf(a, slug);
    if (!opened.contractTalk?.talk?.offer) { note(`${slug}: no offer on the table, the second tab journey was not walked`); await ctx.close(); continue; }
    const b = await open(ctx, slug);
    check('T same talk', await seen(b, '[data-extension-talk]') && offer(await saveOf(b, slug)) === offer(opened), `${slug} ${tag}: a second tab opens on the same saved talk (${offer(opened)})`);
    await shot(b, `T-${slug}-${tag}-second-tab`);
    /* tab A spends the one push; tab B never reloads and still shows the talk as it was before the push */
    await press(a, '[data-ext-push]'); await seen(a, '[data-market-wheel]');
    const afterA = await saveOf(a, slug);
    const bPushed = await has(b, '[data-ext-push]') && await press(b, '[data-ext-push]');
    await b.waitForTimeout(500);
    const afterB = await saveOf(b, slug);
    const rerolled = wheelOf(afterB) !== wheelOf(afterA);
    note(`T ${slug} ${tag}: tab A pushed and saved ${wheelOf(afterA)} (offer ${offer(afterA)}); tab B, loaded before that push, ${bPushed ? 'pushed again' : 'could not push'} and the save now holds ${wheelOf(afterB)} (offer ${offer(afterB)}). A SECOND PUSH WAS DRAWN IN THE OTHER TAB: ${rerolled}`);
    check('T second tab cannot push again', !rerolled, `${slug} ${tag}: the one push stays spent across tabs (save after A ${wheelOf(afterA)}, after B ${wheelOf(afterB)})`);
    await shot(b, `T-${slug}-${tag}-tab-b-after-its-own-push`);
    await ctx.close();
    /* again from the start: A pushes and sees the result, then the stale tab B presses Sign on the offer as it was */
    const ctx2 = await context(slug, fixture.sports[slug].saves.ext, size);
    const a2 = await open(ctx2, slug);
    await hub(a2); await pressPlay(a2); await seen(a2, '[data-extension-talk]');
    const opened2 = await saveOf(a2, slug);
    const b2 = await open(ctx2, slug);
    await seen(b2, '[data-extension-talk]');
    await press(a2, '[data-ext-push]'); await seen(a2, '[data-market-wheel]');
    await press(a2, '[data-market-skip]'); await press(a2, '[data-market-continue]'); await seen(a2, '[data-extension-talk]');
    const pushed2 = await saveOf(a2, slug);
    const signedInB = await has(b2, '[data-ext-sign]') && await press(b2, '[data-ext-sign]');
    await b2.waitForTimeout(500);
    const final2 = await saveOf(b2, slug);
    const undone = signedInB && final2.c.salary === opened2.contractTalk.talk.offer.salary && final2.c.contractYears === 1 + opened2.contractTalk.talk.offer.years && offer(pushed2) !== offer(opened2);
    note(`T2 ${slug} ${tag}: opening offer ${offer(opened2)}; tab A pushed, saved result ${pushed2.contractTalk?.wheel?.result}, offer after the push ${offer(pushed2)}; the stale tab B then pressed Sign: ${signedInB}; the save now holds salary ${final2.c.salary} with ${final2.c.contractYears} contract years, talk ${final2.contractTalk ? 'still on the save' : 'gone'}. THE PUSH WAS UNDONE BY THE STALE TAB: ${undone}`);
    check('T stale tab cannot sign the offer as it was before the push', !undone, `${slug} ${tag}: after a push in tab A, tab B signed ${final2.c.salary} with ${final2.c.contractYears} years (the offer before the push was ${offer(opened2)}, after it ${offer(pushed2)})`);
    await ctx2.close();
  }
} catch (e) { failed += 1; console.log(`FAIL journey T stopped: ${String(e?.stack ?? e).split('\n').slice(0, 6).join(' | ')}`); }

/* ---------- F: a free agency window ---------- */
try {
  for (const [slug, size, tag] of [['nhl', { width: 390, height: 844 }, '390'], ['mlb', { width: 1280, height: 900 }, '1280']]) {
    const ctx = await context(slug, fixture.sports[slug].saves.fa, size);
    const page = await open(ctx, slug);
    check('F open', await hub(page) && await pressPlay(page) && await seen(page, '[data-fa-window]'), `${slug} ${tag}: Play with no contract opens the market`);
    const first = await saveOf(page, slug), firstBytes = await bytesOf(page, slug);
    check('F saved', first.phase === 'freeagency' && first.contractTalk?.kind === 'freeagency', `${slug} ${tag}: the window is on the save (${windowOf(first)})`);
    await shot(page, `F-${slug}-${tag}-window`);
    let same = true;
    for (let i = 0; i < 2; i += 1) { await page.reload({ waitUntil: 'domcontentloaded' }); same = same && await seen(page, '[data-fa-window]') && (await bytesOf(page, slug)) === firstBytes; }
    check('F reload', same, `${slug} ${tag}: two reloads land on the same window and the same bytes`);
    if (await has(page, '[data-market-compare-open]')) {
      await press(page, '[data-market-compare-open]');
      const up = await seen(page, '[data-market-compare]');
      for (const q of ['[data-market-priority="total"]', '[data-market-priority="years"]', '[data-market-priority="roster"]']) if (await has(page, q)) await press(page, q);
      await shot(page, `F-${slug}-${tag}-compare`);
      const cmpBytes = await bytesOf(page, slug);
      await press(page, '[data-market-compare-back]');
      check('F compare', up && cmpBytes === firstBytes && await seen(page, '[data-fa-window]'), `${slug} ${tag}: Compare opens, sorts and closes and writes nothing`);
    } else note(`${slug} ${tag}: no Compare button on this window`);
    const idx = first.contractTalk.window.offers.length - 1;
    await press(page, `[data-fa-push="${idx}"]`);
    const wheelUp = await seen(page, '[data-market-wheel]');
    const pushed = await saveOf(page, slug), pushBytes = await bytesOf(page, slug);
    check('F push', wheelUp && pushed.contractTalk?.wheel?.seen === false && pushed.contractTalk.window.offers[idx].pushed === true, `${slug} ${tag}: the push on offer ${idx} is saved before the wheel is spun (${wheelOf(pushed)}; ${windowOf(pushed)})`);
    await shot(page, `F-${slug}-${tag}-wheel`);
    await page.reload({ waitUntil: 'domcontentloaded' });
    check('F wheel reload', await seen(page, '[data-market-wheel]') && (await bytesOf(page, slug)) === pushBytes && !(await has(page, '[data-fa-sign]')), `${slug} ${tag}: a reload at the wheel shows the wheel on the same bytes and no Sign button`);
    await press(page, '[data-market-skip]'); await press(page, '[data-market-continue]'); await seen(page, '[data-fa-window]');
    await shot(page, `F-${slug}-${tag}-after-push`);
    const ack = await saveOf(page, slug);
    const forced = await page.evaluate(i => { const b = document.querySelector(`[data-fa-push="${i}"]`); if (!b) return 'no push button'; const was = b.disabled; b.disabled = false; b.click(); return was ? 'disabled, forced' : 'enabled'; }, idx);
    await page.waitForTimeout(300);
    check('F one push an offer', windowOf(await saveOf(page, slug)) === windowOf(ack) && !(await has(page, '[data-market-wheel]')), `${slug} ${tag}: a second push on the same offer changes nothing (${forced})`);
    const live = ack.contractTalk.window.offers.findIndex(o => !o.gone);
    await press(page, `[data-fa-sign="${live}"]`);
    const home = await hub(page);
    const signed = await saveOf(page, slug);
    check('F sign', home && signed.contractTalk === undefined && signed.phase === 'season' && signed.c.team === ack.contractTalk.window.offers[live].team && signed.c.contractYears === ack.contractTalk.window.offers[live].years && signed.c.seasons.length === first.c.seasons.length,
      `${slug} ${tag}: Sign puts the offer on the career (${signed.c.team}, ${signed.c.salary} for ${signed.c.contractYears} years), takes the talk off the save and plays nothing`);
    await ctx.close();
  }
} catch (e) { failed += 1; console.log(`FAIL journey F stopped: ${String(e?.stack ?? e).split('\n').slice(0, 6).join(' | ')}`); }

/* ---------- M: stale and malformed talks are dropped alone, and the season still plays ---------- */
try {
  for (const slug of ['nfl', 'nba', 'mlb', 'nhl']) {
    /* a real talk of this build first, to damage */
    const seedCtx = await context(slug, fixture.sports[slug].saves.ext);
    const seedPage = await open(seedCtx, slug);
    await hub(seedPage); await pressPlay(seedPage); await seen(seedPage, '[data-extension-talk]');
    const real = await saveOf(seedPage, slug);
    await seedCtx.close();
    const t = real.contractTalk;
    const damages = {
      stub: { kind: 'extension' }, string: 'garbage', nullTalk: null, number: 7, array: [1, 2],
      staleYear: { ...t, context: { ...t.context, year: t.context.year - 1 } },
      otherTeam: { ...t, context: { ...t.context, team: 'ZZZ' } },
      otherSalary: { ...t, context: { ...t.context, salary: t.context.salary + 1 } },
      otherSport: { ...t, context: { ...t.context, sport: slug === 'nfl' ? 'nba' : 'nfl' } },
      wrongKind: { ...t, kind: 'freeagency', window: { offers: 'x', note: 'n' } },
      badWheel: { ...t, wheel: { probabilities: { raised: 1, held: 0, withdrawn: 0 }, result: 'raised', draws: [], label: t.talk.label, offerIndex: null, seen: false } },
      wheelNoPush: { ...t, wheel: { probabilities: { raised: 1, held: 0, withdrawn: 0 }, result: 'raised', draws: [0.5], label: t.talk.label, offerIndex: null, seen: false } },
      talkNull: { ...t, talk: null }, offerString: { ...t, talk: { ...t.talk, offer: 'big' } }, declinedString: { ...t, declined: 'yes' },
    };
    let ok = 0; const bad = [];
    for (const [name, talk] of Object.entries(damages)) {
      const raw = JSON.stringify({ ...real, contractTalk: talk });
      const ctx = await context(slug, raw);
      const before = errors.length;
      const page = await open(ctx, slug);
      const onHub = await hub(page);
      const broke = await page.evaluate(() => /This page broke|Something went wrong/i.test(document.body.innerText));
      const played = onHub && await pressPlay(page) && await seen(page, '[data-extension-talk]', 15000);
      const fresh = played ? await saveOf(page, slug) : null;
      const declined = played && await press(page, '[data-ext-decline]') && await seen(page, '[data-season-reveal]', 60000);
      const end = await saveOf(page, slug);
      const fine = onHub && !broke && played && fresh.contractTalk?.kind === 'extension' && fresh.c.seasons.length === real.c.seasons.length && declined && end.c.seasons.length === real.c.seasons.length + 1 && end.contractTalk === undefined && errors.length === before;
      if (fine) ok += 1; else bad.push(`${name} (hub ${onHub}, broke ${broke}, fresh talk ${played}, season played ${declined}, talk left on the save ${end?.contractTalk !== undefined}, page errors ${errors.length - before})`);
      if (name === 'stub' && slug === 'nfl') await shot(page, 'M-nfl-390-after-a-damaged-talk-season-played');
      await ctx.close();
    }
    check('M damaged talk', bad.length === 0, `${slug}: ${ok} of ${Object.keys(damages).length} damaged or stale talks opened on the hub, Play opened a fresh talk, and Decline played the season with nothing stale left on the save${bad.length ? '; NOT: ' + bad.join('; ') : ''}`);
  }
} catch (e) { failed += 1; console.log(`FAIL journey M stopped: ${String(e?.stack ?? e).split('\n').slice(0, 6).join(' | ')}`); }

await browser.close();
check('page errors', errors.length === 0, `${errors.length} uncaught page error(s) across the walk${errors.length ? ': ' + errors.slice(0, 4).join(' | ') : ''}`);
console.log(`walkUsTalk: ${checks} checks, ${failed} failed, ${notes.length} notes. ${failed ? 'RED' : 'GREEN'}`);
process.exit(failed ? 1 : 0);
