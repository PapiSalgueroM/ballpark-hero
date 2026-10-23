/**
 * Round 204 browser walk: the tile hub, in all four front offices.
 *
 * simFoHub proves the engine says the right words. This proves the words
 * reach the screen, that every box opens the thing it names, that the way
 * back exists, and that the four games really do behave the same, which is
 * the whole point of the sitewide reformat.
 *
 * The parts that only a browser can answer:
 *  - the grid replaces itself on open rather than unrolling, so the hub
 *    stays one screen tall on a phone;
 *  - the box the walk taps is the panel that appears;
 *  - the boxes carry live state, checked by doctoring a save and watching
 *    the roster box change what it says;
 *  - nothing hangs off the side at 390px, the Round 203 rule.
 *
 * Run: npm run build && npx serve -s dist -l 4173, then
 *      ENGINES=chromium node scripts/playFoHub.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pw from './lib/playwrightLoader.mjs';
import { answerConsent } from './lib/answerConsent.mjs';

const { chromium } = pw;
const BASE = process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/* Round 1537: the NBA desk's tip off floor (Round 722), read from the game's own constant so the walk
   cannot drift from it. See the live check below for why the walk needs it. */
const NBA_FLOOR = Number(fs.readFileSync(path.join(ROOT, 'src/lib/nbaLuxuryTax.ts'), 'utf8')
  .match(/export const NBA_TIPOFF_MIN = (\d+);/)?.[1]);
if (!Number.isInteger(NBA_FLOOR) || NBA_FLOOR < 1) {
  console.error('playFoHub: could not read NBA_TIPOFF_MIN from src/lib/nbaLuxuryTax.ts');
  process.exit(2);
}
/* PLAY_FO_HUB_CONTROL=nofloor skips the top up, which is the walk as it stood before Round 1537: the NBA
   lines "the roster box names" and "a fit squad puts the dot out" must then go red. */
const CONTROL = process.env.PLAY_FO_HUB_CONTROL ?? '';
if (CONTROL && CONTROL !== 'nofloor') {
  console.error(`PLAY_FO_HUB_CONTROL=${CONTROL} is not a control this walk knows (nofloor)`);
  process.exit(2);
}
if (CONTROL) console.log('CONTROL nofloor is on: the NBA roster stays short of its floor, so the walk is SUPPOSED to fail.');

let failures = 0;
const say = (ok, what) => {
  console.log((ok ? '  PASS  ' : '  FAIL  ') + what);
  if (!ok) failures += 1;
};

const DESKS = [
  { route: '/front-office', key: 'front-office-save-v1', name: 'NFL', play: 'This week', panel: /Play Week|Play the final week|Bye week/ },
  { route: '/mlb-front-office', key: 'mlb-front-office-save-v1', name: 'MLB', play: 'Play', panel: /Play Round|Final stretch/ },
  { route: '/nba-front-office', key: 'nba-front-office-save-v1', name: 'NBA', play: 'Play', panel: /Play Round|Final stretch/, floor: NBA_FLOOR },
  { route: '/nhl-front-office', key: 'nhl-front-office-save-v1', name: 'NHL', play: 'Play', panel: /Play Round|Final stretch/ },
];

/* Each box, and a string that only appears once that box is open. */
const BOXES = [
  /* Each sport's own word for letting a man go: cut, waive, DFA. */
  ['Roster', /Cut|Waive|Release|DFA/],
  ['Free agency', /Free agents/],
  ['Trades', /build your own deal|Shop him|trade/i],
  ['Standings', /-\d/],
];

/* Round 1535: since the GM desks every hub has nine boxes, the five the walk opens below and the desk's own
   four (the board's Release AX note, "playFoHub nine boxes"). Each is named, so a missing or extra box fails. */
const DESK_BOXES = ['Staff', 'Re-sign desk', 'Draft picks', 'Trade desk'];
const hubBoxes = desk => [...BOXES.map(([word]) => word), desk.play, ...DESK_BOXES];

/** One box on the hub, by the word on it. Boxes only: see the note below. */
const tile = (page, word) =>
  page.locator('button:has(div.uppercase)').filter({ hasText: new RegExp(word, 'i') }).first();

/* Round 1537: a doctored save, not a signing. It moves the save's own free agents onto the roster, lowest
   rated first (the order nbaTipOff fills the manager's club in), until it holds `to` men. Each man keeps his
   asking salary and no cap room is checked, so this is neither nbaSign (which refuses without room) nor
   nbaTipOff (which signs each man on the minimum for one year): no player could make exactly this save.
   Nothing the walk asserts reads salary or room, and a fresh save has no rotation preference or cut ledger
   to reconcile, so the box it reads is the box that roster size and those injuries draw. */
const topUp = (page, key, to) => page.evaluate(([key, to]) => {
  const s = JSON.parse(localStorage.getItem(key));
  const squad = s.league.teams[s.myTeam].players;
  const pool = [...s.league.freeAgents].sort((a, b) => a.ovr - b.ovr);
  while (squad.length < to && pool.length > 0) {
    const p = pool.shift();
    s.league.freeAgents.splice(s.league.freeAgents.indexOf(p), 1);
    squad.push(p);
  }
  localStorage.setItem(key, JSON.stringify(s));
  return { size: squad.length };
}, [key, to]);

/* Round 1537: the save's round and roster size, for the walk past tip off. */
const saveState = (page, key) => page.evaluate(key => {
  const s = JSON.parse(localStorage.getItem(key));
  return { round: s.league.round, size: s.league.teams[s.myTeam].players.length };
}, key);

const browser = await chromium.launch();

for (const desk of DESKS) {
  console.log(`${desk.name} front office`);
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  /* Round 1537: the walk never reaches the live database (the standing rule since 2026-10-02). */
  await ctx.route(/supabase\.co/, r => r.abort());
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));

  await page.goto(`${BASE}${desk.route}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1100);
  await answerConsent(page); await page.waitForTimeout(300);
  /* Take the first franchise on the pick screen. */
  await page.locator('.grid button').first().click();
  await page.waitForTimeout(900);

  /* ---- the hub is boxes, and the pills are gone ---- */
  const tiles = page.locator('button:has(div.uppercase)');
  const nTiles = await tiles.count();
  const want = hubBoxes(desk);
  say(nTiles === want.length, `${desk.name}: the hub opens on ${want.length} boxes (saw ${nTiles})`);
  /* The box captions are uppercased by CSS, and CSS uppercase changes what
     innerText returns, so every read of them here is caseless on purpose. */
  const hubText = (await page.locator('body').innerText()).toLowerCase();
  for (const [word] of BOXES) {
    say(hubText.includes(word.toLowerCase()), `${desk.name}: the hub names "${word}"`);
  }
  say(hubText.includes(desk.play.toLowerCase()), `${desk.name}: the hub names "${desk.play}"`);
  /* Every box carries a headline AND a second line, not just a word. */
  const filled = await page.evaluate(() => {
    const out = [];
    for (const b of Array.from(document.querySelectorAll('button'))) {
      const cap = b.querySelector('div.uppercase');
      if (!cap) continue;
      const lines = Array.from(b.querySelectorAll('div')).map(d => (d.textContent ?? '').trim()).filter(Boolean);
      out.push({ title: (cap.textContent ?? '').trim(), lines: lines.length });
    }
    return out;
  });
  say(filled.length === want.length && want.every(w => filled.some(f => f.title.toLowerCase() === w.toLowerCase())) && filled.every(f => f.lines >= 3),
    `${desk.name}: every box carries a fact, not just a label (${filled.map(f => `${f.title}:${f.lines}`).join(' ')})`);

  /* ---- nothing hangs off the side at phone width (Round 203's rule) ---- */
  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  say(overflow <= 2, `${desk.name}: the hub fits the phone (${overflow}px of horizontal overflow)`);

  /* ---- each box opens its own screen, and the way back works ---- */
  for (const [word, marker] of BOXES) {
    /* Scoped to the boxes themselves. The owner card and the presser sit
       above the grid and their answer buttons quote words like "roster",
       so a bare text locator picks the wrong control. */
    await tile(page, word).click();
    await page.waitForTimeout(500);
    const openText = await page.locator('body').innerText();
    say(marker.test(openText), `${desk.name}: "${word}" opened the screen it names`);
    /* The grid is replaced, not unrolled: this is the no scroll rule. */
    const stillTiles = await page.locator('button:has(div.uppercase)').count();
    say(stillTiles === 0, `${desk.name}: opening "${word}" replaced the grid (${stillTiles} boxes still up)`);
    const back = page.locator('button:has-text("Hub")');
    say(await back.count() === 1, `${desk.name}: "${word}" has a way back`);
    /* Round 203: a thumb needs 30px. The back control is the one new
       control this round adds, so it is measured rather than assumed. */
    const box = await back.first().boundingBox();
    say(!!box && box.height >= 30, `${desk.name}: the back control is thumb sized (${Math.round(box?.height ?? 0)}px)`);
    await back.first().click();
    await page.waitForTimeout(400);
    say(await page.locator('button:has(div.uppercase)').count() === want.length, `${desk.name}: back returned to all ${want.length} boxes`);
  }

  /* ---- the play box reaches the button you came for ---- */
  await tile(page, desk.play).click();
  await page.waitForTimeout(500);
  say(desk.panel.test(await page.locator('body').innerText()), `${desk.name}: the play box reaches the play button`);
  await page.locator('button:has-text("Hub")').first().click();
  await page.waitForTimeout(400);

  /* ---- the boxes are live, not decoration ---- */
  {
    /* Round 1537: a desk with a tip off floor (the NBA since Round 722, 5ef33f71, 2026-10-01) opens a
       fresh franchise short of it, and a short roster outranks a hurt star on the box's second line and
       keeps the dot lit, by design (simNbaLuxuryTax section 6). The walk went on doctoring its injury onto
       that short roster, so the box rightly read "4 short of the 14 man floor" instead of the star's name.
       It now reads that floor line first, then tops the roster up to the floor from the save's own free
       agents (see topUp for how far that save is from a real signing) and plays the injury checks below on
       a roster the season can start with. Every check below is unchanged. On the way up it stops one man
       short and reads that too: a rule that warned only at two or more short passed every check before
       (the Round 1537 review's "thirteen" mutation). */
    if (desk.floor && CONTROL !== 'nofloor') {
      const count = await page.evaluate(key => {
        const s = JSON.parse(localStorage.getItem(key) ?? 'null');
        return s ? s.league.teams[s.myTeam].players.length : null;
      }, desk.key);
      if (count !== null && count < desk.floor) {
        const shortBox = tile(page, 'Roster');
        const st = await shortBox.innerText();
        say(st.includes(`${desk.floor - count} short of the ${desk.floor} man floor`), `${desk.name}: a short roster says so on the box (reads "${st.replace(/\n/g, ' / ')}")`);
        say(await shortBox.locator('span.animate-pulse').count() === 1, `${desk.name}: a short roster lights the box`);
        if (count < desk.floor - 1) {
          const one = await topUp(page, desk.key, desk.floor - 1);
          await page.reload({ waitUntil: 'networkidle' });
          await page.waitForTimeout(1200);
          const oneBox = tile(page, 'Roster');
          const ot = await oneBox.innerText();
          say(one.size === desk.floor - 1 && ot.includes(`1 short of the ${desk.floor} man floor`), `${desk.name}: a roster one short of the floor says so (${one.size} men, reads "${ot.replace(/\n/g, ' / ')}")`);
          say(await oneBox.locator('span.animate-pulse').count() === 1, `${desk.name}: a roster one short of the floor lights the box`);
        }
        const moved = await topUp(page, desk.key, desk.floor);
        say(moved.size === desk.floor, `${desk.name}: the roster is topped up to the ${desk.floor} man floor (${moved.size - count} free agents moved, ${count} before)`);
        await page.reload({ waitUntil: 'networkidle' });
        await page.waitForTimeout(1200);
      } else {
        console.log(`  NOTE  ${desk.name}: the roster opens at ${count ?? 'no save'}, not short of the ${desk.floor} man floor`);
      }
    }
    /* Injure the best man on the roster and the roster box must change
       what it says, name him, and light up. */
    const hurtName = await page.evaluate(key => {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const s = JSON.parse(raw);
      const squad = s.league.teams[s.myTeam].players;
      for (const p of squad) p.out = 0;
      const star = [...squad].sort((a, b) => b.ovr - a.ovr)[0];
      star.out = 3;
      localStorage.setItem(key, JSON.stringify(s));
      return star.name;
    }, desk.key);
    if (!hurtName) {
      say(false, `${desk.name}: no save to doctor, the live check could not run`);
    } else {
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(1200);
      const rosterBox = tile(page, 'Roster');
      const t = await rosterBox.innerText();
      say(/1 unavailable/.test(t), `${desk.name}: the roster box counted the injury (reads "${t.replace(/\n/g, ' / ')}")`);
      say(t.includes(hurtName), `${desk.name}: the roster box names ${hurtName}`);
      const lit = await rosterBox.locator('span.animate-pulse').count();
      say(lit === 1, `${desk.name}: an injury lights the box (${lit} dots)`);
      /* And a fit squad puts the dot out again. */
      await page.evaluate(key => {
        const s = JSON.parse(localStorage.getItem(key));
        for (const p of s.league.teams[s.myTeam].players) p.out = 0;
        localStorage.setItem(key, JSON.stringify(s));
      }, desk.key);
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(1200);
      const fitBox = tile(page, 'Roster');
      say(await fitBox.locator('span.animate-pulse').count() === 0, `${desk.name}: a fit squad puts the dot out`);
      say(/under contract/.test(await fitBox.innerText()), `${desk.name}: a fit squad counts the contracts instead`);

      /* Round 1537 (review): past tip off. The league fills a short roster once, before round 1, and Waive
         stays open down to the cut floor all season. The board used to pass the tip off floor in every
         round, so one man waived after round 1 left the box reading "1 short of the 14 man floor. Filled on
         minimum deals at tip off." for the rest of the season, lit, with a hurt star never named. So: play
         round 1 through the play box, waive one man through the Roster box, and read the box hurt and fit. */
      if (desk.floor && CONTROL !== 'nofloor') {
        const press = async () => {
          if (await page.locator('[data-gm-press]').count() > 0) {
            await page.locator('[data-gm-press] button').first().click();
            await page.waitForTimeout(500);
          }
        };
        const toHub = async () => {
          const back = page.locator('button:has-text("Hub")');
          if (await back.count() > 0) { await back.first().click(); await page.waitForTimeout(400); }
        };
        await press();
        await tile(page, desk.play).click();
        await page.waitForTimeout(500);
        await page.locator('button:has-text("Play Round")').first().click();
        await page.waitForTimeout(1500);
        await press();
        await toHub();
        const played = await saveState(page, desk.key);
        say(played.round === 2 && played.size === desk.floor, `${desk.name}: round 1 is played at the floor (round ${played.round}, ${played.size} men)`);
        await tile(page, 'Roster').click();
        await page.waitForTimeout(500);
        const waives = page.locator('button:has-text("Waive, $"):not([disabled])');
        const nWaive = await waives.count();
        if (nWaive > 0) {
          await waives.nth(nWaive - 1).click();
          await page.waitForTimeout(300);
          await page.locator('[data-cut-confirm] button:has-text("Waive him")').first().click();
          await page.waitForTimeout(500);
        }
        await toHub();
        const cut = await saveState(page, desk.key);
        say(cut.round === 2 && cut.size === desk.floor - 1, `${desk.name}: one man waived after tip off (${nWaive} Waive buttons, ${cut.size} men at round ${cut.round})`);
        const hurt2 = await page.evaluate(key => {
          const s = JSON.parse(localStorage.getItem(key));
          const squad = s.league.teams[s.myTeam].players;
          for (const p of squad) p.out = 0;
          const star = [...squad].sort((a, b) => b.ovr - a.ovr)[0];
          star.out = 3;
          localStorage.setItem(key, JSON.stringify(s));
          return star.name;
        }, desk.key);
        await page.reload({ waitUntil: 'networkidle' });
        await page.waitForTimeout(1200);
        const lateBox = tile(page, 'Roster');
        const lt = await lateBox.innerText();
        say(/1 unavailable/.test(lt) && lt.includes(hurt2) && !/short of/.test(lt), `${desk.name}: after tip off a roster under the floor names ${hurt2} (reads "${lt.replace(/\n/g, ' / ')}")`);
        say(await lateBox.locator('span.animate-pulse').count() === 1, `${desk.name}: after tip off that injury lights the box`);
        await page.evaluate(key => {
          const s = JSON.parse(localStorage.getItem(key));
          for (const p of s.league.teams[s.myTeam].players) p.out = 0;
          localStorage.setItem(key, JSON.stringify(s));
        }, desk.key);
        await page.reload({ waitUntil: 'networkidle' });
        await page.waitForTimeout(1200);
        const lateFit = tile(page, 'Roster');
        const lf = await lateFit.innerText();
        say(await lateFit.locator('span.animate-pulse').count() === 0 && /under contract/.test(lf) && !/short of/.test(lf), `${desk.name}: after tip off a fit roster under the floor puts the dot out (reads "${lf.replace(/\n/g, ' / ')}")`);
      }
    }
  }

  const real = errors.filter(e => !/supabase|Failed to fetch|CORS/i.test(e));
  say(real.length === 0, `${desk.name}: no page errors on the walk (${real.length ? real[0] : 'clean'})`);
  await ctx.close();
}

await browser.close();
console.log('');
if (failures > 0) {
  console.error(`playFoHub: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('playFoHub: green. Four front offices, nine live boxes each, and the five the walk opens open what they name.');
