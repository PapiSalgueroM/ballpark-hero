// REVIEWER'S WALK (Round 1138, runner lens). Never committed. Runs on the GitHub runner as .rc/x/rv-walk.mjs
// against the served build at $BASE, with the database host blocked and a handful of stubs. It plays Build Your XI
// and Missing XI the way a player would at 390x844 and 1280x900, with reduced motion on and off, saves screenshots
// into $RC_OUT and writes every measurement into $RC_OUT/walk.json. It asserts little: the reviewer reads the shots.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const { chromium } = await import(pathToFileURL(path.join(ROOT, 'scripts/lib/playwrightLoader.mjs')).href);
const BASE = (process.env.BASE || 'http://localhost:4173').replace(/\/$/, '');
const OUT = process.env.RC_OUT || path.join(ROOT, '.tmp-fx', 'rv-shots');
fs.mkdirSync(OUT, { recursive: true });
const clientTs = fs.readFileSync(path.join(ROOT, 'src/integrations/supabase/client.ts'), 'utf8');
const SUPA_HOST = new URL(clientTs.match(/SUPABASE_URL\s*=\s*["']([^"']+)["']/)[1]).host;
const BOX = 'input[role="combobox"]';
const VALIDATOR_PATH = '/functions/v1/validate-player';

const ALPHA = 'Qzxalpha Fixture';
const ALPINE = 'Qzxalpine de Sample';
const BRAVO = 'Qzxbravo van Fixture';
const row = (name, club) => ({
  player_name: name, name_folded: name.toLowerCase(), market_value_usd: 1000000, year: 2026,
  club, nationality: 'Fixtureland', position: 'Centre-Back', age: 27,
});

const REPLIES = {
  exhausted: { status: 200, contentType: 'application/json', body: JSON.stringify({ valid: false, unverified: true, exhausted: true, reason: 'Answer checking has used up its free allowance for today.' }) },
  valid: { status: 200, contentType: 'application/json', body: JSON.stringify({ valid: true }) },
  validFull: { status: 200, contentType: 'application/json', body: JSON.stringify({ valid: true, fullName: BRAVO }) },
  refused: { status: 200, contentType: 'application/json', body: JSON.stringify({ valid: false, reason: 'Qzxalpha Fixture never played there.' }) },
  http500: { status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'boom', valid: true }) },
  stringtrue: { status: 200, contentType: 'application/json', body: '{"valid":"true"}' },
};

const results = [];
let fails = 0;
function note(kind, where, message, extra) {
  if (kind === 'FAIL') fails += 1;
  results.push({ kind, where, message, ...(extra ? { extra } : {}) });
  console.log(`${kind.padEnd(5)} ${where}: ${message}${extra ? ' ' + JSON.stringify(extra) : ''}`);
}
const check = (ok, where, message, extra) => note(ok ? 'PASS' : 'FAIL', where, message, extra);

function clubFilter(url) {
  const raw = new URL(url).searchParams.get('club');
  const inside = raw && raw.match(/^in\.\((.*)\)$/);
  if (!inside) return null;
  return inside[1].split(',').map(name => name.trim().replace(/^"|"$/g, '')).filter(Boolean);
}

async function open(browser, width, motion, route, pageErrors) {
  const stub = { held: false, waiting: [], searches: 0, validator: 0, validatorGivenUp: 0, mode: 'valid', atSlotClub: false, lastClubFilter: null, lastWasNation: false, blocked: 0 };
  stub.hold = () => { stub.held = true; };
  stub.release = () => { stub.held = false; for (const go of stub.waiting.splice(0)) go(); };
  const viewport = width === 390 ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : { viewport: { width: 1280, height: 900 } };
  const context = await browser.newContext({ ...viewport, reducedMotion: motion });
  await context.addInitScript(() => {
    try {
      localStorage.setItem('cookie-consent', 'essential');
      localStorage.setItem('lineup-rules-seen', '1');
      localStorage.setItem(`rules-gate-seen:${location.pathname}`, '1');
    } catch { /* ignored */ }
  });
  const page = await context.newPage();
  page.on('pageerror', error => pageErrors.push(`${route} at ${width} ${motion}: ${error.message}`));
  page.on('requestfailed', request => { if (request.url().includes(VALIDATOR_PATH) && request.method() === 'POST') stub.validatorGivenUp += 1; });
  // The offline fence first (Playwright tries the newest route first, so the stubs below win).
  await page.route('**/*', r => { if (r.request().url().startsWith(BASE)) return r.continue(); stub.blocked += 1; return r.abort(); });
  await page.route(/supabase\.co/, r => { stub.blocked += 1; return r.abort(); });
  const json = body => r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) }).catch(() => {});
  await page.route(`**${SUPA_HOST}/rest/v1/national_team_squads**`, json([]));
  await page.route(`**${SUPA_HOST}/rest/v1/player_verified_positions**`, json([]));
  await page.route(`**${SUPA_HOST}/rest/v1/player_market_values**`, async r => {
    stub.searches += 1;
    const url = r.request().url();
    const clubs = clubFilter(url);
    stub.lastClubFilter = clubs;
    stub.lastWasNation = new URL(url).searchParams.has('nationality');
    if (stub.held) await new Promise(resolve => stub.waiting.push(resolve));
    const club = stub.atSlotClub && clubs ? clubs[0] : 'Fixture Rovers';
    await r.fulfill({ status: 200, contentType: 'application/json', headers: { 'content-range': '0-2/3' }, body: JSON.stringify([row(ALPHA, club), row(ALPINE, club), row(BRAVO, club)]) }).catch(() => {});
  });
  await page.route(`**${SUPA_HOST}${VALIDATOR_PATH}`, async r => {
    if (r.request().method() !== 'POST') return r.fulfill({ status: 204, body: '' }).catch(() => {});
    stub.validator += 1;
    if (stub.mode === 'hang') return undefined;
    return r.fulfill(REPLIES[stub.mode]).catch(() => {});
  });
  await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 45000 }));
  return { context, page, stub };
}

/** Everything the reviewer wants to know about the box and the strip under it, read in one go. */
function look(page) {
  return page.evaluate(sel => {
    const rect = el => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), bottom: Math.round(r.bottom), right: Math.round(r.right) }; };
    const box = document.querySelector(sel);
    const listbox = document.querySelector('[role="listbox"]');
    const strip = document.querySelector('.text-destructive.bg-destructive\\/10, div.text-destructive');
    const spin = document.querySelector('[role="listbox"] .animate-spin') || document.querySelector('.animate-spin');
    const spinStyle = spin ? getComputedStyle(spin) : null;
    const filled = Array.from(document.querySelectorAll('span')).map(s => s.textContent || '').find(t => /^\d+\/11$/.test(t)) || null;
    return {
      boxThere: !!box, boxEnabled: !!box && !box.disabled, boxValue: box ? box.value : null, boxFocused: !!box && document.activeElement === box, boxRect: rect(box),
      options: Array.from(document.querySelectorAll('[role="option"]')).map(o => (o.textContent || '').trim()),
      listboxText: listbox ? (listbox.textContent || '').trim().slice(0, 160) : null, listboxRect: rect(listbox),
      strip: strip ? (strip.textContent || '').trim() : null, stripRect: rect(strip),
      filled, scrollY: Math.round(window.scrollY), innerW: window.innerWidth, innerH: window.innerHeight, docW: document.documentElement.scrollWidth,
      spin: spinStyle ? { name: spinStyle.animationName, duration: spinStyle.animationDuration, count: spinStyle.animationIterationCount } : null,
      bodyHasSaved: /lineup is saved/i.test(document.body.innerText), bodyHasntPlayed: /hasn't played/.test(document.body.innerText),
    };
  }, BOX);
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const tag = (width, motion) => `${width}-${motion === 'reduce' ? 'rm' : 'mo'}`;
async function shot(page, name) {
  await page.screenshot({ path: path.join(OUT, `${name}.png`) }).catch(error => note('INFO', name, `screenshot failed: ${error.message}`));
}
async function tapOrClick(locator, width) { if (width === 390) await locator.tap(); else await locator.click(); }
async function openSlot(page, label) {
  await page.getByText('Select a position on the pitch').waitFor({ timeout: 40000 });
  await page.locator('button:not([disabled])', { hasText: new RegExp(`^${label}$`) }).first().click();
  await page.locator(BOX).first().waitFor({ timeout: 30000 });
}
const optionNamed = (page, name) => page.locator('[role="option"]', { hasText: new RegExp(name.replace(/ (de|van) /i, ' $1 '), 'i') }).first();
async function typeAndPick(page, width, text, name) {
  const box = page.locator(BOX).first();
  await box.fill(text);
  const option = optionNamed(page, name);
  await option.waitFor({ timeout: 15000 });
  await tapOrClick(option, width);
}
const filledOf = async page => (await look(page)).filled;

/** Build Your XI, the way a player meets it. `full` adds the slow legs (the 15 second wait, the reroll during a check). */
async function buildYourXi(browser, width, motion, full, pageErrors) {
  const T = `byx-${tag(width, motion)}`;
  const { context, page, stub } = await open(browser, width, motion, '/build-your-xi', pageErrors);
  const box = page.locator(BOX).first();
  try {
    await page.getByRole('button', { name: /^4-3-3/ }).first().click({ timeout: 40000 });
    await openSlot(page, 'CB');
    await shot(page, `${T}-00-slot-open`);

    // 1. Typing: the panel opens on Finding players, then two names. Enter with two names does nothing.
    stub.hold();
    await box.pressSequentially('qzxalp', { delay: 40 });
    await sleep(450);
    let s = await look(page);
    check(/Finding players/.test(s.listboxText || ''), T, 'typing opens the panel on Finding players while the search is out', { listbox: s.listboxText, spin: s.spin });
    await shot(page, `${T}-01-finding`);
    stub.release();
    await page.locator('[role="option"]').nth(1).waitFor({ timeout: 15000 });
    s = await look(page);
    check(s.options.length === 2, T, 'two names show for "qzxalp"', { options: s.options, listboxRect: s.listboxRect, innerH: s.innerH });
    check(s.docW <= s.innerW, T, 'no sideways scroll with the list open', { docW: s.docW, innerW: s.innerW });
    await shot(page, `${T}-02-two-names`);
    const before = stub.validator;
    await box.press('Enter');
    await sleep(300);
    s = await look(page);
    check(s.boxValue === 'qzxalp' && s.filled === '0/11' && stub.validator === before, T, 'Enter with two names showing picks nothing', { value: s.boxValue, filled: s.filled });

    // 2. New text under an open list: the old names go in the same instant.
    stub.hold();
    await box.fill('qzxbravo');
    s = await look(page);
    check(s.options.length === 0, T, 'the old names are gone the instant the text changes', { options: s.options, listbox: s.listboxText });
    await sleep(350);
    s = await look(page);
    check(s.options.length === 0 && /Finding players/.test(s.listboxText || ''), T, 'still no old name 350 ms later, the panel says Finding players', { options: s.options, listbox: s.listboxText });
    await shot(page, `${T}-03-new-text`);
    stub.release();
    await optionNamed(page, BRAVO).waitFor({ timeout: 15000 });

    // 3. One name and Enter: picked. The validator says its allowance is spent: only this pick is skipped.
    await box.fill('qzxalpha');
    await optionNamed(page, ALPHA).waitFor({ timeout: 15000 });
    await page.waitForFunction(() => document.querySelectorAll('[role="option"]').length === 1, null, { timeout: 15000 });
    await shot(page, `${T}-04-one-name`);
    stub.mode = 'exhausted';
    const topLook = await look(page);
    const top = topLook.boxRect;
    await box.press('Enter');
    const said = await page.getByText(/allowance for today/).first().waitFor({ timeout: 15000 }).then(() => true).catch(() => false);
    await sleep(250);
    s = await look(page);
    check(said, T, 'Enter picked the only name and the page names the allowance', { strip: s.strip });
    check(stub.validator === before + 1, T, 'one request went to the validator', { requests: stub.validator - before });
    check(s.boxThere && s.boxEnabled && s.filled === '0/11', T, 'the box is still there and enabled, nothing filled', { enabled: s.boxEnabled, filled: s.filled, focused: s.boxFocused, value: s.boxValue });
    check(!s.bodyHasSaved && !s.bodyHasntPlayed, T, 'nothing says saved, nothing calls it a refusal');
    check(s.boxRect && top && s.boxRect.y === top.y && s.scrollY === topLook.scrollY, T, 'the box did not move when the line appeared', { before: top, after: s.boxRect, scrollBefore: topLook.scrollY, scrollAfter: s.scrollY });
    check(s.stripRect && s.stripRect.right <= s.innerW && s.stripRect.x >= 0, T, 'the line fits the screen', { strip: s.stripRect, innerW: s.innerW });
    await shot(page, `${T}-05-allowance`);

    // 4. A body that is not a verdict, an error status, and a real refusal.
    stub.mode = 'stringtrue';
    await typeAndPick(page, width, 'qzxalpha', ALPHA);
    await page.getByText(/Couldn't verify that answer/).first().waitFor({ timeout: 15000 }).catch(() => {});
    s = await look(page);
    check(/Couldn't verify/.test(s.strip || '') && s.filled === '0/11' && s.boxEnabled, T, 'valid as a string is not counted', { strip: s.strip });
    await shot(page, `${T}-06-not-a-verdict`);
    stub.mode = 'http500';
    await typeAndPick(page, width, 'qzxalpha', ALPHA);
    await sleep(600);
    s = await look(page);
    check(/Couldn't verify/.test(s.strip || '') && s.filled === '0/11' && s.boxEnabled, T, 'a 500 that claims valid is not counted', { strip: s.strip });
    stub.mode = 'refused';
    await typeAndPick(page, width, 'qzxalpha', ALPHA);
    await page.getByText(/never played there/).first().waitFor({ timeout: 15000 }).catch(() => {});
    s = await look(page);
    check(/never played there/.test(s.strip || '') && s.filled === '0/11', T, 'a real refusal reads as the refusal it is', { strip: s.strip });
    await shot(page, `${T}-07-refusal`);

    if (full) {
      // 5. A validator that never answers: busy, then given up after the wait, with the box back.
      stub.mode = 'hang';
      const givenUpBefore = stub.validatorGivenUp;
      const started = Date.now();
      await typeAndPick(page, width, 'qzxalpha', ALPHA);
      await sleep(1500);
      s = await look(page);
      check(!s.boxEnabled && s.strip === null, T, 'while the check is out the box is busy and no line shows', { enabled: s.boxEnabled, strip: s.strip, value: s.boxValue, spin: s.spin });
      await shot(page, `${T}-08-checking`);
      const slow = await page.getByText(/took too long/).first().waitFor({ timeout: 25000 }).then(() => true).catch(() => false);
      const waited = Date.now() - started;
      await sleep(250);
      s = await look(page);
      check(slow && waited > 14000 && waited < 19000, T, 'the page gives up on the check after about 15 seconds', { waitedMs: waited, strip: s.strip });
      check(s.boxEnabled && s.filled === '0/11' && stub.validatorGivenUp === givenUpBefore + 1, T, 'the box is back, nothing filled, the request was cancelled', { enabled: s.boxEnabled, filled: s.filled, cancelled: stub.validatorGivenUp - givenUpBefore });
      await shot(page, `${T}-09-too-long`);

      // 6. Reroll while a check is out: the pick is dropped and never prints a line later.
      const picked = Date.now();
      await typeAndPick(page, width, 'qzxalpha', ALPHA);
      await sleep(1000);
      await page.locator('button[title="Reroll: get a different team"]').click();
      await page.getByText('Select a position on the pitch').waitFor({ timeout: 40000 });
      s = await look(page);
      check(s.filled === '0/11' && !/took too long|Couldn't verify/.test(await page.locator('body').innerText()), T, 'after the reroll nothing is filled and no line shows', { filled: s.filled });
      await openSlot(page, 'CB');
      await sleep(Math.max(0, 17000 - (Date.now() - picked)));
      s = await look(page);
      check(s.strip === null && s.boxEnabled && s.filled === '0/11', T, 'seventeen seconds on, the pick that was given up has printed nothing and the box is live', { strip: s.strip, enabled: s.boxEnabled });
      await shot(page, `${T}-10-after-reroll`);
    }

    // 7. A valid answer is accepted, under the validator's stored name.
    stub.mode = 'validFull';
    stub.atSlotClub = false;
    let asked = stub.validator;
    await typeAndPick(page, width, 'qzxbravo', BRAVO);
    await page.locator('span', { hasText: /^1\/11$/ }).first().waitFor({ timeout: 15000 }).catch(() => {});
    s = await look(page);
    let body = await page.locator('body').innerText();
    check(s.filled === '1/11' && stub.validator === asked + 1 && body.includes(BRAVO), T, 'a valid answer fills the slot under the stored name', { filled: s.filled, printsStored: body.includes(BRAVO) });
    await shot(page, `${T}-11-filled`);

    // 8. Our own record: on a club slot a row at that club lands with no request at all.
    stub.atSlotClub = true;
    let club = null;
    for (let tries = 0; tries < 14 && !club; tries++) {
      await openSlot(page, 'CB');
      const seen = stub.searches;
      await box.fill('qzxal');
      await page.waitForFunction(() => document.querySelectorAll('[role="option"]').length > 0, null, { timeout: 15000 }).catch(() => {});
      if (stub.searches > seen && stub.lastClubFilter) { club = stub.lastClubFilter; break; }
      await box.fill('');
      await page.locator('button[title="Reroll: get a different team"]').click();
    }
    if (!club) {
      note('INFO', T, 'fourteen rerolls never dealt a club: the own record leg did not run');
    } else {
      asked = stub.validator;
      const t0 = Date.now();
      await typeAndPick(page, width, 'qzxalpine', ALPINE);
      await page.locator('span', { hasText: /^2\/11$/ }).first().waitFor({ timeout: 15000 }).catch(() => {});
      const took = Date.now() - t0;
      s = await look(page);
      body = await page.locator('body').innerText();
      check(s.filled === '2/11' && stub.validator === asked, T, 'a club pick on file at the club lands with no request to the validator', { filled: s.filled, requests: stub.validator - asked, club: club[0], tookMs: took });
      check(body.includes(ALPINE), T, 'the pitch prints the stored spelling (a lower case particle)', { printsStored: body.includes(ALPINE), printsListed: /Qzxalpine De Sample/.test(body) });
      await shot(page, `${T}-12-own-record`);
    }

    // 9. Leaving the box drops the list; coming back searches again.
    await openSlot(page, 'CM').catch(() => openSlot(page, 'CDM'));
    await box.fill('qzxalp');
    await page.locator('[role="option"]').nth(1).waitFor({ timeout: 15000 });
    const searched = stub.searches;
    await tapOrClick(page.getByText(/^Filling:/).first(), width);
    await sleep(150);
    s = await look(page);
    check(s.options.length === 0 && s.listboxText === null && s.boxValue === 'qzxalp', T, 'a tap outside closes the panel and keeps the text', { options: s.options, listbox: s.listboxText, value: s.boxValue });
    await shot(page, `${T}-13-left`);
    stub.hold();
    await tapOrClick(box, width);
    await sleep(350);
    s = await look(page);
    check(s.options.length === 0 && /Finding players/.test(s.listboxText || ''), T, 'coming back shows Finding players, not the names from before', { options: s.options, listbox: s.listboxText });
    stub.release();
    await page.locator('[role="option"]').nth(1).waitFor({ timeout: 15000 });
    check(stub.searches > searched, T, 'coming back searched again', { extraRequests: stub.searches - searched });
    await shot(page, `${T}-14-returned`);
    if (width === 1280) {
      await box.press('Escape');
      await sleep(150);
      s = await look(page);
      check(s.options.length === 0 && s.listboxText === null, T, 'Escape closes the panel', { listbox: s.listboxText });
      await box.pressSequentially('h', { delay: 30 });
      await optionNamed(page, ALPHA).waitFor({ timeout: 15000 });
      s = await look(page);
      check(s.options.length === 1, T, 'typing on after Escape brings the list for the new text', { options: s.options });
    }
  } catch (error) {
    note('FAIL', T, `the walk stopped: ${String(error.message || error).split('\n')[0]}`);
    await shot(page, `${T}-99-stopped`);
  } finally {
    note('INFO', T, 'requests', { searches: stub.searches, validator: stub.validator, blocked: stub.blocked });
    await context.close();
  }
}

/** Missing XI keeps the picked name in the box until "Lock in guess". The critic's hang lived here. */
async function missingXi(browser, width, motion, pageErrors) {
  const T = `mxi-${tag(width, motion)}`;
  const { context, page, stub } = await open(browser, width, motion, '/missing-xi', pageErrors);
  const box = page.locator(BOX).first();
  try {
    await box.waitFor({ timeout: 40000 });
    await shot(page, `${T}-00-open`);
    await box.fill('qzxalpha');
    await optionNamed(page, ALPHA).waitFor({ timeout: 15000 });
    await shot(page, `${T}-01-list`);
    await tapOrClick(optionNamed(page, ALPHA), width);
    await sleep(1200);
    let s = await look(page);
    note('INFO', T, 'right after a pick (the name stays in the box)', { value: s.boxValue, options: s.options, listbox: s.listboxText });
    check(!/Finding players/.test(s.listboxText || ''), T, 'a second after the pick the panel is not on Finding players', { listbox: s.listboxText });
    await shot(page, `${T}-02-picked`);
    // Leave, come back: the text is the picked name, nothing in flight. It must search and settle, never hang.
    await tapOrClick(page.locator('h1').first(), width);
    await sleep(200);
    await tapOrClick(box, width);
    await sleep(1500);
    s = await look(page);
    check(!/Finding players/.test(s.listboxText || ''), T, 'back in the box with the picked name: the panel settled, it does not hang on Finding players', { listbox: s.listboxText, options: s.options });
    await shot(page, `${T}-03-back-in-box`);
    const lock = page.getByRole('button', { name: /Lock in guess/ }).first();
    note('INFO', T, 'Lock in guess button', { there: await lock.count(), enabled: await lock.isEnabled().catch(() => null) });
  } catch (error) {
    note('FAIL', T, `the walk stopped: ${String(error.message || error).split('\n')[0]}`);
    await shot(page, `${T}-99-stopped`);
  } finally {
    note('INFO', T, 'requests', { searches: stub.searches, blocked: stub.blocked });
    await context.close();
  }
}

const browser = await chromium.launch();
const pageErrors = [];
const only = (process.env.WALK_ONLY || '').split(',').filter(Boolean);
const want = name => only.length === 0 || only.includes(name);
try {
  if (want('byx-390-mo')) await buildYourXi(browser, 390, 'no-preference', true, pageErrors);
  if (want('byx-1280-rm')) await buildYourXi(browser, 1280, 'reduce', true, pageErrors);
  if (want('byx-390-rm')) await buildYourXi(browser, 390, 'reduce', false, pageErrors);
  if (want('byx-1280-mo')) await buildYourXi(browser, 1280, 'no-preference', false, pageErrors);
  if (want('mxi-390-mo')) await missingXi(browser, 390, 'no-preference', pageErrors);
  if (want('mxi-1280-rm')) await missingXi(browser, 1280, 'reduce', pageErrors);
} finally {
  await browser.close();
}
for (const error of pageErrors) note('FAIL', 'pageerror', error);
fs.writeFileSync(path.join(OUT, 'walk.json'), JSON.stringify(results, null, 1));
const passed = results.filter(r => r.kind === 'PASS').length;
console.log(`rv-walk: ${passed} PASS, ${fails} FAIL, ${pageErrors.length} page errors, shots in ${OUT}`);
process.exit(0);
