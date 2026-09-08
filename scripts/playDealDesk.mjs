/**
 * Round 506 harness: the deal desk is a real desk, and the meter reads the
 * number you typed.
 *
 * Round 506 put a genuinely new rendering surface inside Club Manager's
 * transfers tab: a typed bid box with a live closeness meter above it, and a
 * personal terms table that opens once the clubs shake hands and has to be
 * cleared before anybody signs. The engine half of that is fenced by the sim
 * harnesses, which is the half a pure function can prove; nothing at all
 * walked the screen, and the screen is where the meter, the disabled send
 * button and the two phase panel live. This walks it, at a 390 wide phone,
 * through the game's own buttons.
 *
 * The save is doctored exactly once, from a page where the app does not run,
 * to put a large budget behind the open summer window a new career starts in
 * (the Round 196 rule: edit from outside, then open the game fresh, so the
 * load path is on trial too). That is the only shortcut taken. Every figure
 * below is typed into the real input and every deal is struck by clicking.
 *
 * Sections:
 *   1. A market row prints your recruitment desk's read, "worth Nm" or
 *      "worth Nm to Mm", and never an empty value.
 *   2. Talk opens the desk: the data-deal-desk box is on screen with the bid
 *      input, and Offer it refuses while the box is empty.
 *   3. The meter reads what you type, off the panel's own "Their ask" line.
 *      About 30 percent of the ask has to say they will end the talks, and
 *      the full ask has to say they will take this.
 *   4. Offering the ask reaches personal terms and signs nobody: the panel
 *      header says Personal terms, his agent is asking for something, and the
 *      saved squad has not grown by a man.
 *   5. Give him what he wants, then put it to him, and the header says DEAL
 *      DONE and the player is in the saved squad.
 *   6. Nothing scrolls sideways at 390 while the terms panel is open (the
 *      measurement is taken in section 4, while the panel is still up, and
 *      reported here), and no console errors at any point in the run.
 *
 * Negative control, required by this repo and judged on its own:
 *   DEAL_DESK_CONTROL=nometer
 * rewrites the served ClubManager chunk so the meter's two verdict lines,
 * "They will take this" and "They will end the talks", both read as something
 * neutral. Both strings are asserted present in the SERVED asset before a
 * browser is launched and the run refuses to start if either is missing,
 * because a control that replaces nothing is green for the wrong reason.
 * Measured with the control on: 2 findings, both of them section 3's meter
 * reads, every other section still green, and the run exits non zero.
 *
 * Run: ENGINES=chromium node scripts/playDealDesk.mjs
 * (dist must already be built. DEAL_DESK_PORT moves the server, VERBOSE=1
 * narrates every press.)
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import pw from './lib/playwrightLoader.mjs';

const { chromium } = pw;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const PORT = Number(process.env.DEAL_DESK_PORT || 4494);
const BASE = `http://127.0.0.1:${PORT}`;
const CONTROL = process.env.DEAL_DESK_CONTROL || '';
const V = !!process.env.VERBOSE;

/* The save key is hyphenated. A naive search for "clubmanager" misses it,
   which is how the Round 201 walk first failed. */
const SAVE_KEY = 'dukb-club-manager-save';

/* The two lines the control breaks, and what it puts there instead. */
const METER_AGREE = 'They will take this';
const METER_WALKOUT = 'They will end the talks';
const CONTROL_TEXT = 'They are still thinking';

/* The two named checks the control is supposed to turn red, and nothing
   else. Named here so the control can be judged rather than eyeballed. */
const CONTROL_TARGETS = [
  '3. a lowball reads as ending the talks',
  '3. the full ask reads as agreed',
];

const failed = [];
let checksRun = 0;
const say = m => { if (V) console.log('      ' + m); };

function check(name, ok, detail) {
  checksRun += 1;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `: ${detail}` : ''}`);
  if (!ok) failed.push(name);
}

/* Copy that should never reach a player, the same list the Club Manager
   walk uses. Read off the transfers tab at every stop below. */
const LEAKS = [
  [/\bundefined\b/, 'renders the word undefined'],
  [/\bNaN\b/, 'renders NaN'],
  [/\[object Object\]/, 'renders [object Object]'],
  [/\bInfinity\b/, 'renders Infinity'],
];

/** "£1.2bn", "£12.5m", "£800k" into millions. */
function parseMoney(s) {
  const m = String(s).match(/£\s*([\d.]+)\s*(bn|m|k)/i);
  if (!m) return null;
  const n = parseFloat(m[1]);
  const unit = m[2].toLowerCase();
  return unit === 'bn' ? n * 1000 : unit === 'k' ? n / 1000 : n;
}

/* ---------------------------------------------------------------- */
/* The server, and the control's own assertion before anything runs  */
/* ---------------------------------------------------------------- */

if (!fs.existsSync(path.join(DIST, 'index.html'))) {
  console.error('playDealDesk: dist/ is not built, so there is nothing to serve. Run npm run build first.');
  process.exit(1);
}

const server = spawn(process.execPath, [path.join(ROOT, 'scripts/lib/hostLikeServer.mjs'), DIST, String(PORT)], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 1200));

function stop(code) {
  server.kill();
  process.exit(code);
}

/** Every built asset that carries this string, by filename. */
function assetsCarrying(needle) {
  const dir = path.join(DIST, 'assets');
  const hits = [];
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.js')) continue;
    let src = '';
    try { src = fs.readFileSync(path.join(dir, f), 'utf8'); } catch { continue; }
    if (src.includes(needle)) hits.push(f);
  }
  return hits;
}

let controlSwaps = 0;
if (CONTROL === 'nometer') {
  /* Assert old in src before the edit, or refuse to run. The check is made
     against what the SERVER hands back rather than against the file on disk,
     because the served bytes are the ones the page will execute. */
  for (const needle of [METER_AGREE, METER_WALKOUT]) {
    const files = assetsCarrying(needle);
    if (files.length === 0) {
      console.error(`playDealDesk control: RED before it started. No built asset contains "${needle}", so the swap would change nothing and a green run would prove nothing. Rebuild dist, or the meter's wording moved and this control needs updating.`);
      stop(1);
    }
    let served = '';
    try {
      const res = await fetch(`${BASE}/assets/${files[0]}`);
      served = await res.text();
    } catch (e) {
      console.error(`playDealDesk control: could not fetch /assets/${files[0]} to confirm the string is served (${String(e).slice(0, 120)})`);
      stop(1);
    }
    if (!served.includes(needle)) {
      console.error(`playDealDesk control: RED before it started. /assets/${files[0]} is on disk with "${needle}" but the server did not hand it back, so the swap would change nothing.`);
      stop(1);
    }
    console.log(`  control  "${needle}" confirmed in the served /assets/${files[0]}`);
  }
}

/* ---------------------------------------------------------------- */
/* The browser                                                       */
/* ---------------------------------------------------------------- */

const browser = await chromium.launch({ args: ['--no-sandbox', '--no-proxy-server'] });
/* 390 wide on purpose: section 6 measures the transfers tab at a real phone
   width, and a desk that only fits on a desktop is a desk half the players
   cannot use. */
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, ignoreHTTPSErrors: true });

if (CONTROL === 'nometer') {
  await ctx.route('**/*.js', async route => {
    const res = await route.fetch();
    let body = await res.text();
    if (body.includes(METER_AGREE) || body.includes(METER_WALKOUT)) {
      body = body.split(METER_AGREE).join(CONTROL_TEXT).split(METER_WALKOUT).join(CONTROL_TEXT);
      controlSwaps += 1;
    }
    await route.fulfill({ response: res, body });
  });
}

const errors = [];
const watch = p => {
  p.on('pageerror', e => errors.push(String(e).split('\n')[0].slice(0, 160)));
  p.on('console', m => {
    const t = m.text();
    if (m.type() === 'error' && !/ERR_CERT|ERR_QUIC|ERR_NAME|Failed to load resource|blocked by CORS policy|Access-Control-Allow-Origin|net::ERR_FAILED/i.test(t)) {
      errors.push(t.slice(0, 160));
    }
  });
};

let page = await ctx.newPage();
watch(page);

const body = async () => (await page.locator('body').innerText().catch(() => '')) || '';

async function tap(rx, label) {
  const b = page.getByRole('button', { name: rx }).first();
  if (await b.count().catch(() => 0) === 0) return false;
  if (await b.isDisabled().catch(() => false)) return false;
  const ok = await b.click({ timeout: 5000 }).then(() => true).catch(() => false);
  if (ok) { say(`pressed ${label}`); await page.waitForTimeout(450); }
  return ok;
}

async function clearRoom() {
  await page.getByRole('button', { name: /^essential only$/i }).first().click({ timeout: 1500 }).catch(() => {});
  for (let i = 0; i < 3; i++) {
    const d = page.locator('[role="dialog"][data-state="open"]');
    if (await d.count().catch(() => 0) === 0) break;
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(250);
  }
}

function bail(why) {
  console.log(`  BLOCKED  ${why}`);
  console.log(`\nplayDealDesk: blocked before the deal desk, so nothing below it was tested.`);
  browser.close().catch(() => {});
  stop(1);
}

/* ---------------------------------------------------------------- */
/* 0) Take a job, then hand the desk a budget                        */
/* ---------------------------------------------------------------- */
console.log('0) Taking a job and opening the window');
await page.goto(`${BASE}/club-manager`, { waitUntil: 'domcontentloaded', timeout: 25000 });
await page.waitForLoadState('networkidle', { timeout: 9000 }).catch(() => {});
await page.waitForTimeout(1200);
await clearRoom();

/* The picker asks WHEN before it asks where, and every step waits for the
   next screen's own content rather than sleeping, because each list mounts a
   beat after the press. */
await tap(/2026-27/i, 'the 2026-27 era');
await page.getByRole('button', { name: /England/i }).first().waitFor({ timeout: 9000 }).catch(() => {});
await tap(/England/i, 'England');
await page.getByRole('button', { name: /Premier League/i }).first().waitFor({ timeout: 9000 }).catch(() => {});
await tap(/Premier League/i, 'Premier League');
const clubBtn = page.locator('button').filter({ hasText: /Everton|Fulham|Brentford|Crystal Palace|Wolves|Brighton/ }).first();
await clubBtn.waitFor({ timeout: 9000 }).catch(() => {});
await clubBtn.click({ timeout: 6000 }).then(() => say('pressed a Premier League club')).catch(() => {});
await tap(/take the job|confirm|start/i, 'the pinned confirm bar');
await page.getByText(/who is in the dugout/i).first().waitFor({ timeout: 9000 }).catch(() => {});
await tap(/skip: just manage/i, 'skip the dugout form');
await page.getByRole('tab', { name: /^Market$/ }).first().waitFor({ timeout: 15000 }).catch(() => {});

if (!/Season 1/i.test(await body())) bail('could not get past the club picker');

/* One doctored save, written from a page where the app does not run so the
   career's own save effect cannot overwrite it, then the game is opened
   fresh so loadCareer is on trial too. A new career already starts in an
   open summer window; what it does not start with is enough money for the
   ask on any player worth talking to, and a bid over the budget disables
   the send button, which would make section 3 untestable for the wrong
   reason. */
const helper = await ctx.newPage();
await helper.goto(`${BASE}/robots.txt`, { waitUntil: 'domcontentloaded' });
const doctored = await helper.evaluate(key => {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  const c = JSON.parse(raw);
  c.budget = 900;
  c.transferWindow = 'summer';
  c.windowWeeksLeft = 8;
  c.negotiation = null;
  c.coldNames = [];
  localStorage.setItem(key, JSON.stringify(c));
  return { club: c.clubName, squad: c.squad.length };
}, SAVE_KEY);
await helper.close();
if (!doctored) bail('the career never wrote a save, so there was nothing to doctor');
console.log(`   in the job at ${doctored.club}, ${doctored.squad} in the squad, £900m to spend`);

await page.close();
page = await ctx.newPage();
watch(page);
await page.goto(`${BASE}/club-manager`, { waitUntil: 'domcontentloaded', timeout: 25000 });
await page.waitForLoadState('networkidle', { timeout: 9000 }).catch(() => {});
await clearRoom();

/* Every step from here WAITS for the next screen's own control rather than
   sleeping. A fixed sleep raced the reload on one run in four: the resume
   button had not mounted yet, tap found nothing and said nothing, and the
   walk then reported that the hub has no Market tab, which was a lie about
   the game caused by the harness being early. */
const resume = page.getByRole('button', { name: /^resume career$/i }).first();
await resume.waitFor({ timeout: 15000 }).catch(() => {});
if (await resume.count().catch(() => 0) === 0) bail('the doctored save did not offer to resume, so it was never loaded back');
await resume.click({ timeout: 8000 }).catch(() => {});
say('resumed the career');

const marketTab = page.getByRole('tab', { name: /^Market$/ }).first();
await marketTab.waitFor({ timeout: 15000 }).catch(() => {});
if (await marketTab.count().catch(() => 0) === 0) bail('the hub never came up, so there was no Market tab to open');
await marketTab.click({ timeout: 8000 }).catch(() => {});
await page.getByRole('button', { name: /^Talk ·/ }).first().waitFor({ timeout: 15000 }).catch(() => {});

const readSave = async () => page.evaluate(key => {
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : null;
}, SAVE_KEY);

/* ---------------------------------------------------------------- */
/* 1) The market prints a valuation read                             */
/* ---------------------------------------------------------------- */
console.log('1) The market row shows what your recruitment desk thinks he is worth');

/* Every row that offers a Talk button, read as the player sees it. The row is
   the Talk button's grandparent: the button sits in a shrink-0 column beside
   the name block. */
const rows = await page.evaluate(() => {
  const out = [];
  for (const b of Array.from(document.querySelectorAll('button'))) {
    const label = (b.textContent || '').replace(/\s+/g, ' ').trim();
    if (!/^Talk ·/.test(label)) continue;
    const row = b.parentElement && b.parentElement.parentElement;
    if (!row) continue;
    out.push({ label, text: (row.innerText || '').replace(/\s+/g, ' ').trim() });
  }
  return out;
});

/*
 * Round 507: the read is printed through money(), so it carries a currency
 * symbol and a unit that changes with the size (£450k, £45m, £1.2bn). These
 * patterns were written against the first version of valuationLine, which
 * emitted a bare "45m to 58m" with no symbol at all, sitting on the same card
 * as a "Their ask" that had one. The adversarial review called that out, the
 * line was fixed, and this harness had to be told: it was matching the defect.
 * BROKEN_READ deliberately no longer treats a currency symbol as broken, and
 * instead catches the empty and non numeric shapes it was really for.
 */
const MONEY = String.raw`£\d+(?:\.\d+)?(?:k|m|bn)`;
const READ = new RegExp(`worth ${MONEY}(?: to ${MONEY})?`);
const BROKEN_READ = /worth\s*(?:$|m\b|to\b|undefined|NaN|£\s|£(?:k|m|bn))/;
const withRead = rows.filter(r => READ.test(r.text));
const brokenRead = rows.filter(r => BROKEN_READ.test(r.text));
check('1. the market offered rows to talk to', rows.length > 0, `${rows.length} rows`);
check('1. every market row carried a valuation read', rows.length > 0 && withRead.length === rows.length,
  `${withRead.length} of ${rows.length} rows`);
check('1. no market row showed an empty valuation', brokenRead.length === 0,
  brokenRead.length ? brokenRead[0].text.slice(0, 90) : 'none');

const marketText = await body();
for (const [rx, why] of LEAKS) {
  const m = marketText.match(rx);
  if (m) check('1. the market copy is clean', false, `${why}: "${marketText.slice(Math.max(0, m.index - 40), m.index + 50).replace(/\s+/g, ' ').trim()}"`);
}

/* The man to do business with: the cheapest row asking at least 2m, so 30
   percent of his ask cannot round down into "Name your price" and so the
   whole deal fits inside the doctored budget with room to spare. */
const priced = rows
  .map(r => ({ ...r, price: parseMoney(r.label) }))
  .filter(r => r.price !== null && r.price >= 2)
  .sort((a, b) => a.price - b.price);
if (priced.length === 0) bail('no market row was priced in a way this walk could read');
const target = priced[0];
console.log(`   talking to the cheapest man over £2m, listed at ${target.label.replace('Talk · ', '')}`);

/* ---------------------------------------------------------------- */
/* 2) Talk opens the desk                                            */
/* ---------------------------------------------------------------- */
console.log('2) Talk opens the deal desk');
const talkBtn = page.getByRole('button', { name: target.label, exact: true }).first();
await talkBtn.click({ timeout: 6000 }).catch(() => {});
await page.waitForTimeout(900);

const desk = page.locator('[data-deal-desk]').first();
const deskThere = await desk.count().catch(() => 0) > 0;
check('2. the data-deal-desk box opened', deskThere);

const bidBox = page.getByLabel('Your bid in millions').first();
const bidThere = await bidBox.count().catch(() => 0) > 0;
check('2. the bid box is on the desk', bidThere);

const offerBtn = page.getByRole('button', { name: 'Offer it', exact: true }).first();
const offerThere = await offerBtn.count().catch(() => 0) > 0;
const offerOffAtStart = offerThere ? await offerBtn.isDisabled().catch(() => false) : false;
check('2. Offer it refuses while the box is empty', offerThere && offerOffAtStart,
  offerThere ? (offerOffAtStart ? 'disabled' : 'ENABLED with nothing typed') : 'no Offer it button');

if (!deskThere || !bidThere || !offerThere) bail('the deal desk never opened, so sections 3 to 6 could not run');

/* ---------------------------------------------------------------- */
/* 3) The meter reads the typed number                               */
/* ---------------------------------------------------------------- */
console.log('3) The meter reads what you type');

const panelText = await body();
const ask = parseMoney((panelText.match(/Their ask:\s*(£[\d.]+\s*(?:bn|m|k))/i) || [])[1] || '');
check('3. the panel printed their ask', ask !== null && ask > 0, ask === null ? 'no "Their ask" line' : `£${ask}m`);
if (ask === null) bail('their ask could not be read, so there was no number to type against');

/** Whatever the meter says right now, read out of its own verdict slot.
    The two captions around it are set in small caps by CSS, so innerText
    hands them back shouting and the match has to ignore case. */
async function meterVerdict() {
  const t = (await desk.innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
  const m = t.match(/how close you are\s+(.*?)\s+your bid/i);
  return m ? m[1].trim() : `(unreadable: "${t.slice(0, 80)}")`;
}

async function typeBid(value) {
  await bidBox.fill(String(value));
  await page.waitForTimeout(400);
  return meterVerdict();
}

const lowball = Math.max(0.2, Math.round(ask * 0.3 * 10) / 10);
const lowVerdict = await typeBid(lowball);
check(CONTROL_TARGETS[0], lowVerdict === METER_WALKOUT, `typed ${lowball} against an ask of ${ask}, meter said "${lowVerdict}"`);

const full = Math.round(ask * 10) / 10;
const fullVerdict = await typeBid(full);
check(CONTROL_TARGETS[1], fullVerdict === METER_AGREE, `typed ${full} against an ask of ${ask}, meter said "${fullVerdict}"`);

const offerOnNow = await offerBtn.isEnabled().catch(() => false);
check('3. Offer it woke up once a number was typed', offerOnNow);

/* ---------------------------------------------------------------- */
/* 4) The ask reaches personal terms, and signs nobody               */
/* ---------------------------------------------------------------- */
console.log('4) The ask agrees a fee and opens the second table');

const before = await readSave();
const squadBefore = before ? before.squad.length : -1;
const negName = ((await body()).match(/Negotiating:\s*(.+)/) || [])[1];
const playerName = negName ? negName.trim() : null;

await offerBtn.click({ timeout: 6000 }).catch(() => {});
await page.getByText(/Personal terms/).first().waitFor({ timeout: 8000 }).catch(() => {});
await page.waitForTimeout(700);

const termsText = await body();
check('4. the panel header says Personal terms', /Personal terms/.test(termsText),
  playerName ? `for ${playerName}` : '');
/* Shouted by CSS, like every other caption on this panel. */
check('4. his agent is asking for something', /he is asking/i.test(termsText));
check('4. the terms panel offers the three ways out',
  /Put it to him/.test(termsText) && /Give him what he wants/.test(termsText) && /Walk away/.test(termsText));

const midSave = await readSave();
const squadMid = midSave ? midSave.squad.length : -1;
const signedEarly = !!(midSave && playerName && midSave.squad.some(p => p.name === playerName));
check('4. nobody has signed yet', squadMid === squadBefore && !signedEarly,
  `squad ${squadBefore} before, ${squadMid} with the terms panel open`);
check('4. the save says the negotiation is at the terms table',
  !!midSave && !!midSave.negotiation && midSave.negotiation.phase === 'terms' && midSave.negotiation.status === 'open',
  midSave && midSave.negotiation ? `${midSave.negotiation.status}/${midSave.negotiation.phase}` : 'no negotiation in the save');

/* Section 6's measurement, taken here because it has to be taken while the
   terms panel is up and the panel does not survive section 5. */
const layout = await page.evaluate(() => ({
  scrollWidth: document.documentElement.scrollWidth,
  innerWidth: window.innerWidth,
}));

/* ---------------------------------------------------------------- */
/* 5) Give him what he wants, put it to him, done                    */
/* ---------------------------------------------------------------- */
console.log('5) Meeting his terms closes the deal');

const gaveIn = await tap(/^Give him what he wants$/, 'give him what he wants');
check('5. Give him what he wants is pressable', gaveIn);
const putIt = await tap(/^Put it to him$/, 'put it to him');
check('5. Put it to him is pressable', putIt);
await page.waitForTimeout(1000);

const doneText = await body();
check('5. the panel says DEAL DONE', /DEAL DONE/.test(doneText),
  /DEAL DONE/.test(doneText) ? '' : `header reads "${(doneText.match(/(Negotiating|Personal terms|DEAL [A-Z]+|HIJACKED)[^\n]*/) || ['nothing recognisable'])[0].slice(0, 70)}"`);

const after = await readSave();
const squadAfter = after ? after.squad.length : -1;
const inSquad = !!(after && playerName && after.squad.some(p => p.name === playerName));
check('5. the player is in the saved squad', inSquad && squadAfter === squadBefore + 1,
  `squad ${squadBefore} before, ${squadAfter} after${playerName ? `, looking for ${playerName}` : ''}`);
const signedTerms = after && playerName ? (after.squad.find(p => p.name === playerName) || {}).signedTerms : null;
check('5. he signed on the terms that were agreed', !!signedTerms && signedTerms.wage > 0 && signedTerms.years >= 2,
  signedTerms ? `${signedTerms.years}y at ${signedTerms.wage}k a week as ${signedTerms.role}` : 'no signed terms on the player');

/* ---------------------------------------------------------------- */
/* 6) The phone, and the console                                     */
/* ---------------------------------------------------------------- */
console.log('6) The phone width, and the console');
check('6. nothing scrolls sideways at 390 with the terms panel open',
  layout.scrollWidth <= layout.innerWidth + 1,
  `scrollWidth ${layout.scrollWidth} against innerWidth ${layout.innerWidth}`);
check('6. no console errors anywhere in the run', errors.length === 0,
  errors.length ? errors.slice(0, 2).join(' | ') : 'none');

for (const [rx, why] of LEAKS) {
  const m = doneText.match(rx);
  if (m) check('6. the closed deal copy is clean', false, `${why}: "${doneText.slice(Math.max(0, m.index - 40), m.index + 50).replace(/\s+/g, ' ').trim()}"`);
}

await browser.close();

console.log(`\n   ${checksRun} checks run, ${rows.length} market rows read, ask £${ask}m, lowball ${lowball} read as "${lowVerdict}", full ask read as "${fullVerdict}", squad ${squadBefore} to ${squadAfter}`);
console.log(`Walked Club Manager's deal desk through its own screens. ${failed.length} findings.`);

if (CONTROL === 'nometer') {
  if (controlSwaps === 0) {
    console.error('playDealDesk control: RED. The swap never landed on a served asset, so a red run would be red for some other reason.');
    stop(1);
  }
  const hit = CONTROL_TARGETS.filter(t => failed.includes(t));
  const collateral = failed.filter(t => !CONTROL_TARGETS.includes(t));
  console.log(`   control: ${controlSwaps} served asset(s) rewritten, ${hit.length} of ${CONTROL_TARGETS.length} target checks went red, ${collateral.length} other check(s) red`);
  if (hit.length === CONTROL_TARGETS.length) {
    console.error(`playDealDesk control: green. Breaking the meter's verdict lines was reported by exactly the checks that read them (${hit.join('; ')}), so the check works. Exiting non zero, because a run with findings fails.`);
    stop(1);
  }
  console.error('playDealDesk control: RED. The meter was lying and the harness said nothing, so it proves nothing.');
  stop(1);
}

if (failed.length > 0) {
  console.error(`playDealDesk: ${failed.length} finding${failed.length === 1 ? '' : 's'}: ${failed.join('; ')}`);
  stop(1);
}
console.log('playDealDesk: green. The desk opens, the meter reads the typed number, the fee table hands off to the terms table without signing anybody, and meeting his terms closes it.');
stop(0);
