/* playNbaNumbers.mjs (Round 1103). NBA My Career's new numbers in a real browser.

   ENGINES=chromium, the build served the way the live host serves it (scripts/lib/hostLikeServer.mjs dist 4173),
   the live database blocked before the first navigation. Three stretches, STRETCH=old|new|case (all three when
   unset), each at 390 by 844 and 1280 by 900, one with reduced motion and one without.

     old   A save recorded before the round (src/test/fixtures/nbaOldSaves1103.json, key board:mid) is written
           into the page's storage. The Career Log tile prints its last line exactly as the fixture recorded it
           ("23 ppg, 4.4 rpg, 5.3 apg", whole number points). One season is played: every old season object in the save is
           unchanged, and the new one holds minutes, steals, blocks and the club's record.
     new   A fresh career, three seasons. Every season's card and the hub's "Last season" line print the three
           averages to one decimal, the card says the minutes, steals and blocks in its own note, the Career Log
           tile's second line is not cut off, and nothing scrolls sideways.
     case  The Trophy Case holds 23 badges with "All-Star" and "Ten time All-Star" among them, and the "?" opens
           with the games rule and the worked MVP example in it.
   Everywhere: no page error, and no request to the live database finished.

   CONTROLS, PLAY_NBA_NUMBERS_CONTROL=<name>. Each exits 1 when its check went red as designed and 3 when not.
     oldrow  stretch old does not play the season, so the newest row is an old line and the new shape check is
             pointed at it: the check must go red (it reads the row, not the page).
     wide    the Career Log tile's second line is handed the six part line the round first drew, which does not
             fit: the cut off check must go red (it measures the tile).
     rivalflip  (Round 1112) the rival's note is judged with the two printed lines the wrong way round: the
             check that the note agrees with the lines must go red on a card where one of them clearly won.

   Round 1112 added the rival's note to every season card the walk plays: his line is in the player's own shape
   and what the note says about the year is what the two printed lines say.

   Measured 2026-10-08 on the build of 94286364: 68 checks, 0 failed. The Career Log tile's second line has 149
   pixels at 390 wide and 182 at 1280, and the three part line needs exactly that or less; the six part line the
   wide control hands it does not fit, and both controls fired.

   Run: npm run build && node scripts/lib/hostLikeServer.mjs dist 4173, then
        ENGINES=chromium node scripts/playNbaNumbers.mjs */
import { readFileSync } from 'node:fs';
import pw from './lib/playwrightLoader.mjs';

const { chromium } = pw;
const BASE = process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173';
const ROUTE = '/nba-my-career';
const KEY = 'nba-my-career-save-v1';
const CONTROL = process.env.PLAY_NBA_NUMBERS_CONTROL || '';
/* The oldrow control is about stretch old alone, so it runs that one. */
const STRETCH = CONTROL === 'oldrow' ? 'old' : process.env.STRETCH || 'all';
if (CONTROL && !['oldrow', 'wide', 'rivalflip'].includes(CONTROL)) { console.error(`PLAY_NBA_NUMBERS_CONTROL=${CONTROL} is not a control this walk knows`); process.exit(2); }
const NEW_LINE = /^\d+\.\d ppg, \d+\.\d rpg, \d+\.\d apg$/;
const NOTE = /\d+\.\d mpg, \d+\.\d spg, \d+\.\d bpg/;
const RIVAL_LINE = /went (\d+\.\d) ppg, (\d+\.\d) rpg, (\d+\.\d) apg/;
const WIDE = '17.0 ppg, 5.1 rpg, 3.2 apg, 1.1 spg, 0.6 bpg, 31.4 mpg';
const fixture = JSON.parse(readFileSync(new URL('../src/test/fixtures/nbaOldSaves1103.json', import.meta.url), 'utf8'));
const old = fixture.entries.find(e => e.key === 'board:mid');

let checks = 0; let failed = 0; const controlRed = [];
/* Eight seasons are played over the two stretches and a rival is 20 or so when the walk meets him, so every
   card should carry his note; six leaves room for a save whose rival has retired. */
const RIVAL_NOTES_FLOOR = 6;
function say(ok, msg, tag = '') {
  checks++;
  if (ok) console.log(`  ok   ${msg}`);
  else { failed++; if (tag) controlRed.push(tag); console.log(`  FAIL ${msg}`); }
}

const browser = await chromium.launch();
async function open(width, height, reduced) {
  const ctx = await browser.newContext({ viewport: { width, height }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  const seen = { errors: [], reached: 0 };
  page.on('pageerror', e => seen.errors.push(String(e)));
  page.on('requestfinished', r => { if (/supabase\.co/.test(r.url())) seen.reached++; });
  await page.route(/supabase\.co/, r => r.abort());
  await page.addInitScript(route => localStorage.setItem(`rules-gate-seen:${route}`, '1'), ROUTE);
  await page.goto(`${BASE}${ROUTE}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  const consent = page.locator('button:has-text("Essential only")');
  if (await consent.count()) { await consent.first().click().catch(() => {}); await page.waitForTimeout(300); }
  await page.locator('input[placeholder*="name"]').first().fill('Probe Player');
  await page.locator('button:has-text("Enter the draft")').click();
  await page.waitForTimeout(900);
  return { ctx, page, seen, label: `${width} wide${reduced ? ', reduced motion' : ''}` };
}
const playButton = page => page.locator('button', { hasText: /^\s*Play the \d+ season\s*$/ });
/* One move the way a player would make it, by what is on the screen (the board fixture's walker, shortened). */
async function step(page) {
  const lastIn = async sel => { const b = page.locator(`${sel} button:not([disabled])`); const n = await b.count(); if (!n) return false; await b.nth(n - 1).click(); return true; };
  const firstIn = async sel => { const b = page.locator(`${sel} button:not([disabled])`); if (!(await b.count())) return false; await b.first().click(); return true; };
  if (await page.locator('[role="alertdialog"]').count()) return lastIn('[role="alertdialog"]');
  if (await page.locator('[data-season-reveal]').count()) return lastIn('[data-season-reveal]');
  if (await page.locator('[data-decision-continue]').count()) { await page.locator('[data-decision-continue]').first().click(); return true; }
  if (await page.locator('[data-rivalry-event]').count()) return lastIn('[data-rivalry-event]');
  if (await page.locator('[data-rivalry-choice]').count()) return (await page.locator('[data-rivalry-choice] [data-rivalry-outcome]').count()) ? lastIn('[data-rivalry-choice]') : firstIn('[data-rivalry-choice]');
  if (await page.locator('[data-extension-talk]').count()) return firstIn('[data-extension-talk]');
  if (await page.locator('[data-fa-window]').count()) return firstIn('[data-fa-window]');
  const hubBack = page.locator('button', { hasText: /^\s*Hub\s*$/ });
  if (await hubBack.count()) { await hubBack.first().click(); return true; }
  const options = page.locator('button[class*="bg-background px-3 py-2 text-left"]:not([disabled])');
  if (await options.count()) { await options.first().click(); return true; }
  return false;
}
async function toHub(page, what) {
  for (let i = 0; i < 40; i++) {
    if (await playButton(page).count() && !(await page.locator('[data-season-reveal]').count())) return true;
    if (!(await step(page))) await page.waitForTimeout(500); else await page.waitForTimeout(450);
  }
  say(false, `${what}: the walk got back to the hub (it is lost on "${(await page.locator('main').innerText()).replace(/\s+/g, ' ').slice(0, 140)}")`);
  return false;
}
const lastSeasonLine = async page => { const m = (await page.locator('main').innerText()).match(/Last season: ([^·\n]+) ·/); return m ? m[1].trim() : null; };
const logTile = page => page.locator('button:has(div.uppercase)').filter({ hasText: /Career Log/i }).first();
const tileSub = async page => ((await logTile(page).count()) ? (await logTile(page).locator('div.truncate').last().innerText()).trim() : null);
async function tileFits(page) {
  if (!(await logTile(page).count())) return { text: 'no Career Log tile on the screen', cut: true, need: 0, room: 0 };
  const sub = logTile(page).locator('div.truncate').last();
  if (CONTROL === 'wide') await sub.evaluate((el, text) => { el.textContent = text; }, WIDE);
  return sub.evaluate(el => ({ text: el.textContent, cut: el.scrollWidth > el.clientWidth, need: el.scrollWidth, room: el.clientWidth }));
}
const sideways = page => page.evaluate(() => document.scrollingElement.scrollWidth - window.innerWidth);
const saveOf = page => page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? 'null'), KEY);
async function playOne(page, what) {
  await playButton(page).first().click();
  await page.waitForSelector('[data-season-reveal]', { timeout: 15000 });
  await page.waitForTimeout(2600);
  const card = await page.locator('[data-season-reveal]').innerText();
  const lines = card.split('\n').map(s => s.trim()).filter(Boolean);
  say(lines.some(l => NEW_LINE.test(l)), `${what}: the season card prints three averages to one decimal (${lines.find(l => / ppg/.test(l)) ?? 'no line'})`);
  say(NOTE.test(card), `${what}: the season card says the minutes, steals and blocks (${(card.match(NOTE) ?? ['no note'])[0]})`);
  rivalOnCard(lines, what);
}
/* Round 1112: the rival's note on the same card. His line is in the player's own shape, and what the note says
   about the year is what the two printed lines say, scored the way the game scores a season (points 1.6,
   rebounds 1.4, assists 1.7). A near tie is inside six percent of his score and names the leader its own
   tally gives. The rivalflip control reads the two lines the wrong way round. */
let rivalNotes = 0;
function rivalOnCard(lines, what) {
  const mineText = lines.find(l => NEW_LINE.test(l));
  const note = lines.find(l => / went .* ppg/.test(l));
  if (!note) { console.log(`  note ${what}: no rival note on this card (he has retired, or the save has none)`); return; }
  rivalNotes++;
  const his = RIVAL_LINE.exec(note);
  say(!!his, `${what}: the rival's line is in the player's own shape, three averages to one decimal ("${note.slice(0, 110)}")`);
  const mine = RIVAL_LINE.exec(`went ${mineText ?? ''}`);
  if (!his || !mine) return;
  const score = x => Number(x[1]) * 1.6 + Number(x[2]) * 1.4 + Number(x[3]) * 1.7;
  const [a, b] = CONTROL === 'rivalflip' ? [score(his), score(mine)] : [score(mine), score(his)];
  const tie = /Nothing in it again[.] (?:You lead the head to head (\d+)-(\d+)|He leads the head to head (\d+)-(\d+)|The head to head is level at (\d+)-(\d+))[.]/.exec(note);
  let ok; let says;
  if (/Nothing in it/.test(note)) { says = 'a near tie'; ok = !!tie && Math.abs(a - b) < b * 0.06 && (tie[1] ? Number(tie[1]) > Number(tie[2]) : tie[3] ? Number(tie[3]) > Number(tie[4]) : tie[5] === tie[6]); }
  else if (/You had the better year/.test(note)) { says = 'the player had the better year'; ok = a > b; }
  else if (/had the better year of the two of you/.test(note)) { says = 'the rival had the better year'; ok = !(a > b); }
  else { says = 'nothing this walk can read'; ok = false; }
  say(ok, `${what}: the note says ${says}, and the two printed lines agree (mine ${mineText}, his ${his[0].slice(5)})`, 'rivalflip');
}
async function close(w, what) {
  const real = w.seen.errors.filter(e => !/supabase|Failed to fetch|CORS/i.test(e));
  say(real.length === 0, `${what}: no page errors (${real[0] ?? 'clean'})`);
  say(w.seen.reached === 0, `${what}: no request to the live database finished (${w.seen.reached})`);
  await w.ctx.close();
}

const SIZES = [[390, 844, false], [1280, 900, true]];
if (STRETCH === 'all' || STRETCH === 'old') {
  for (const [wd, ht, reduced] of SIZES) {
    const w = await open(wd, ht, reduced); const { page } = w; const what = `old, ${w.label}`;
    console.log(what);
    const wrote = await page.evaluate(([key, c]) => { const s = JSON.parse(localStorage.getItem(key) ?? 'null'); if (!s) return false; s.c = c; s.phase = 'season'; localStorage.setItem(key, JSON.stringify(s)); return true; }, [KEY, old.save]);
    say(wrote, `${what}: wrote the recorded save (${old.save.seasons.length} seasons, all saved before the round)`);
    await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(1200);
    await toHub(page, what);
    const want = old.read.lines[old.read.lines.length - 1];
    say((await tileSub(page)) === want, `${what}: the Career Log tile prints the last line as it was saved, "${want}" (reads "${await tileSub(page)}")`);
    if (CONTROL !== 'oldrow') { await playOne(page, what); await toHub(page, what); }
    const s = await saveOf(page);
    const kept = old.save.seasons.every((x, i) => JSON.stringify(s.c.seasons[i]) === JSON.stringify(x));
    say(kept, `${what}: every season saved before the round is unchanged in the save`);
    const last = s.c.seasons[s.c.seasons.length - 1];
    say(NEW_LINE.test((await tileSub(page)) ?? ''), `${what}: the newest row is on the new line (the tile reads "${await tileSub(page)}")`, 'oldrow');
    if (CONTROL !== 'oldrow') say(['mpg', 'spg', 'bpg', 'clubWins', 'clubLosses'].every(k => typeof last[k] === 'number') && s.c.seasons.length === old.save.seasons.length + 1, `${what}: the new season holds minutes, steals, blocks and the club's record (${last.mpg} mpg, ${last.clubWins}-${last.clubLosses})`);
    const fit = await tileFits(page);
    say(!fit.cut, `${what}: the Career Log tile's second line is not cut off ("${fit.text}", needs ${fit.need} of ${fit.room} pixels)`, 'wide');
    await close(w, what);
  }
}
if (STRETCH === 'all' || STRETCH === 'new' || STRETCH === 'case') {
  for (const [wd, ht, reduced] of [[390, 844, true], [1280, 900, false]]) {
    const w = await open(wd, ht, reduced); const { page } = w; const what = `new, ${w.label}`;
    console.log(what);
    await toHub(page, what);
    if (STRETCH !== 'case') {
      for (let n = 1; n <= 3; n++) {
        await playOne(page, `${what}, season ${n}`);
        if (!(await toHub(page, `${what}, season ${n}`))) break;
        const line = await lastSeasonLine(page);
        say(NEW_LINE.test(line ?? ''), `${what}, season ${n}: the hub's last season line has the new shape ("${line}")`);
        const fit = await tileFits(page);
        say(!fit.cut, `${what}, season ${n}: the Career Log tile's second line is not cut off ("${fit.text}", needs ${fit.need} of ${fit.room} pixels)`, 'wide');
        say((await sideways(page)) <= 1, `${what}, season ${n}: nothing scrolls sideways (${await sideways(page)} pixels over)`);
        const edge = await page.evaluate(() => { const el = [...document.querySelectorAll('main *')].find(e => e.children.length === 0 && /^\s*Last season:/.test(e.textContent ?? '')) ?? [...document.querySelectorAll('main p, main div')].filter(e => /Last season:/.test(e.textContent ?? '')).pop(); if (!el) return null; const card = el.closest('[class*="rounded"]') ?? el.parentElement; return { text: el.getBoundingClientRect().right, card: card.getBoundingClientRect().right }; });
        say(!!edge && edge.text <= edge.card + 0.5, `${what}, season ${n}: the last season line ends inside its card (${edge ? `${Math.round(edge.text)} against ${Math.round(edge.card)}` : 'not found'})`);
      }
    }
    if (STRETCH !== 'new') {
      const tile = page.locator('button:has(div.uppercase)').filter({ hasText: /Trophy Case/i }).first();
      await tile.click(); await page.waitForTimeout(600);
      const badges = page.locator('[data-career-badge]');
      const labels = await badges.evaluateAll(els => els.map(e => e.textContent ?? ''));
      say(labels.length === 23, `${what}: the Trophy Case holds 23 badges (${labels.length} drawn)`);
      say(labels.some(t => /Ten time All-Star/.test(t)) && labels.filter(t => /All-Star/.test(t)).length === 2, `${what}: "All-Star" and "Ten time All-Star" are among them`);
      await page.locator('button', { hasText: /^\s*Hub\s*$/ }).first().click(); await page.waitForTimeout(400);
      await page.locator('button[aria-label="How to play"]').first().click(); await page.waitForTimeout(700);
      const help = await page.locator('body').innerText();
      say(/65 games/.test(help) && /An MVP case by the numbers/.test(help), `${what}: the "?" opens with the games rule and the worked MVP example`);
      say((await sideways(page)) <= 1, `${what}: nothing scrolls sideways with the "?" open (${await sideways(page)} pixels over)`);
    }
    await close(w, what);
  }
}
await browser.close();
/* Round 1112: the rival check means something only when the walk met rival notes (8 seasons are played). */
if (CONTROL !== 'oldrow' && STRETCH !== 'case') say(rivalNotes >= RIVAL_NOTES_FLOOR, `the walk read the rival's note on ${rivalNotes} season cards (floor ${RIVAL_NOTES_FLOOR})`);

if (CONTROL) {
  const fired = failed > 0 && controlRed.length === failed && controlRed.every(t => t === CONTROL);
  console.log(`\ncontrol ${CONTROL}: ${fired ? 'FIRED, its own check went red and no other' : `DID NOT FIRE AS DESIGNED (${failed} failed, of them tagged ${controlRed.join(', ') || 'none'})`}`);
  console.log(`playNbaNumbers: ${checks} checks, ${failed} failed (control ${CONTROL})`);
  process.exit(fired ? 1 : 3);
}
console.log(`\nplayNbaNumbers: ${checks} checks, ${failed} failed`);
process.exit(failed ? 1 : 0);
