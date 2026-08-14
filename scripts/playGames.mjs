/**
 * Deeper than sweepGames.mjs: this one actually PLAYS.
 *
 * The sweep opens every game and checks the first screen. That caught a game
 * that never rendered at all, but it cannot catch a game that looks fine and
 * then breaks on the third click, which is where most real bugs live. This
 * drives each game through a run of interactions the way a player would:
 * press the obvious button, take the first choice, repeat, and watch for the
 * screen going dead, a thrown exception, or the same screen coming back
 * forever because nothing is actually advancing.
 *
 * Round 117: it now plays EVERY game in the registry, not sixteen of them.
 * It used to carry a hardcoded list of the sixteen fully client side games,
 * because the sandbox it was written in could not reach Supabase and every
 * data driven game would have stalled on a loading screen and produced
 * nothing but noise. Supabase is reachable now, so the other hundred and two
 * games get played too, and the route list comes straight out of the registry
 * exactly like the sweep, so a new game is deep played the day it ships.
 *
 * Serve the production build first:
 *   npm run build && npx serve -s dist -l 4173
 * Then: node scripts/playGames.mjs
 * ONLY=/route chases a single game, VERBOSE=1 prints every press.
 */
import pw from '/home/claude/.npm-global/lib/node_modules/playwright/index.js';
const { chromium } = pw;
import fs from 'node:fs';

const BASE = process.env.SWEEP_BASE || 'http://127.0.0.1:4173';
const STEPS = Number(process.env.STEPS || 14);

/* Routes come straight from the registry so a new game is covered the day it
   ships, with no list to keep in step. Same source as sweepGames.mjs. */
const registry = fs.readFileSync(new URL('../src/data/gameRegistry.ts', import.meta.url), 'utf8');
const ALL = [...new Set([...registry.matchAll(/path: '([^']+)'/g)].map(m => m[1]))].sort();
const GAMES = process.env.ONLY ? [process.env.ONLY] : ALL;

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox', '--no-proxy-server'],
});

const findings = [];
const note = (game, kind, detail) => { findings.push({ game, kind, detail }); console.log(`  ${kind}  ${game}  ${detail}`); };
/* Round 117: a game the harness cannot drive is NOT a game that is broken, and
   conflating the two is how a harness becomes something people ignore. The
   guess-a-player games gate their submit button behind a real answer from an
   autocomplete, and typing "Playtest" will never satisfy that, so the harness
   runs out of controls having barely started. That is a limit of the harness
   and it gets said out loud, in the output, but it does not fail the build and
   it does not go in the findings list. Anything it skips is still covered by
   sweepGames.mjs on the first screen. */
const skipped = [];
const skip = (game, detail) => { skipped.push({ game, detail }); console.log(`  skip    ${game}  ${detail}`); };
const MIN_TRIED = 3;

const LEAKS = [
  [/\bundefined\b/, 'renders the word undefined'],
  [/\bNaN\b/, 'renders NaN'],
  [/\[object Object\]/, 'renders [object Object]'],
  [/\{\{|\}\}/, 'unsubstituted template braces'],
  [/\byou (?:is|has|does|rips|stands|throws|makes|hits|rocks|scans|picks|lies|goes|gets|wins|scores|plays)\b/i, 'second person verb disagreement'],
  [/\bInfinity\b/, 'renders Infinity'],
  [/[–—]/, 'em or en dash'],
  [/\bNULL\b|\bnull\b/, 'renders null'],
];

/* Round 117, and this is the whole reason the other hundred games looked dead.
   Most games pop their How to Play dialog on a first visit. It is a shadcn
   Dialog, so it portals to the END of document.body behind a full screen
   bg-black/80 overlay. Two consequences the old loop had no answer for: every
   click on the game underneath times out, and the dialog's own buttons sit
   past the twelve button cap the fallback loop scanned, so the harness
   concluded "nothing clickable" on a game that was working perfectly.
   Clear the room before judging it, and do it every step, because a dialog
   can open again later in a run. */
async function clearOverlays(page) {
  // Consent first: the dialog overlay covers the banner, so it has to be
  // answered before anything opens on top of it, and again afterwards in
  // case the dialog won the race.
  await page.getByRole('button', { name: /^essential only$/i }).first()
    .click({ timeout: 1200 }).catch(() => {});
  for (let i = 0; i < 3; i++) {
    const open = page.locator('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]');
    if (await open.count().catch(() => 0) === 0) break;
    const closer = open.first().getByRole('button', { name: /^(close|got it|start|play|ok|done|let's go)/i });
    if (await closer.count().catch(() => 0) > 0) {
      await closer.first().click({ timeout: 1200 }).catch(() => {});
    } else {
      await page.keyboard.press('Escape').catch(() => {});
    }
    await page.waitForTimeout(250);
  }
  await page.getByRole('button', { name: /^essential only$/i }).first()
    .click({ timeout: 1200 }).catch(() => {});
}

/* Data driven games fetch from Supabase, so "the screen is not ready yet" is
   a real state now rather than a permanent one. Give the fetch a chance
   before deciding anything about what is on screen. */
async function settle(page) {
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(600);
}

/* Round 118: how the harness answers a question instead of giving up on it.
 *
 * Round 117 left fifteen games reported as skipped, all the same shape: a text
 * box, a suggestion list, and a Guess button that stays disabled until you pick
 * a real name out of that list. Typing "Playtest" never matches anything, so
 * the harness ran out of controls and stopped, and those fifteen games have
 * only ever been checked on their first screen.
 *
 * Two things make this work. Type a prefix real answers actually start with,
 * one character at a time so a debounced onChange fires the way it does for a
 * player: "mar" turns up Marcus Rashford, Marcelo, Martin Odegaard in the
 * soccer games, Morocco in the nations game, Marquette in the colleges one.
 * And decide what kind of box it is by what typing DOES rather than by reading
 * its placeholder, which is the part Round 117 got wrong: it excluded anything
 * matching /player|type a/ to avoid search boxes, and "Type a player name..."
 * is exactly what the answer boxes say. So snapshot the visible buttons, type,
 * and see what appears. New buttons means a suggestion list, so press one and
 * the game moves on. Nothing new means it was a filter after all, so clear it
 * again, because a filter left applied is what silently emptied the list under
 * /fantasy-draft and made five working controls look like a stall. */
/* Round 118: a CORS failure here is the security working, not a bug, and it
   cost a false finding on /college-grid to be sure of that. The AI backed
   validators are edge functions that answer every preflight with
   access-control-allow-origin: https://douknowball.com no matter who asked,
   which is a deliberate allowlist that stops anyone else's page driving them.
   Confirmed by hand: the same OPTIONS request sent with Origin
   http://127.0.0.1:4174 still comes back allowing only douknowball.com. This
   harness serves a local build, so EVERY validator call it makes is refused by
   the browser, on every grid, connect four and chain game. Reporting that as a
   finding would be reporting the allowlist. Blocked network calls are already
   ignored on purpose in sweepGames.mjs for the same reason. */
const IGNORE_CONSOLE = /ERR_CERT|ERR_QUIC|ERR_NAME|Failed to load resource|blocked by CORS policy|Access-Control-Allow-Origin|net::ERR_FAILED/i;

const PREFIXES = ['mar', 'ro', 'de'];

async function answerInput(page, tryClick, step) {
  const inputs = page.locator('input[type="text"]:visible, input:not([type]):visible');
  const count = Math.min(await inputs.count().catch(() => 0), 3);
  for (let i = 0; i < count; i++) {
    const inp = inputs.nth(i);
    const hint = [
      await inp.getAttribute('placeholder').catch(() => ''),
      await inp.getAttribute('aria-label').catch(() => ''),
    ].join(' ');
    // An explicit search box is never a gate, so leave it alone entirely.
    if (/\bsearch\b|\bfilter\b/i.test(hint)) continue;
    if (((await inp.inputValue().catch(() => 'x')) || '').trim() !== '') continue;
    let unlockedGate = false;

    /* Snapshot both what the buttons SAY and whether they are usable. The
       label diff finds a suggestion list; the disabled diff answers the other
       question, which is whether typing into this box unlocked anything. */
    const snap = async () => {
      const out = [];
      const bs = page.locator('button:visible');
      for (let k = 0; k < Math.min(await bs.count().catch(() => 0), 60); k++) {
        const b = bs.nth(k);
        out.push({
          label: ((await b.innerText().catch(() => '')) || '').trim(),
          off: await b.isDisabled().catch(() => false),
        });
      }
      return out;
    };
    const before = await snap();
    const beforeButtons = before.map(x => x.label);

    for (const prefix of PREFIXES) {
      await inp.fill('', { timeout: 2000 }).catch(() => {});
      await inp.pressSequentially(prefix, { delay: 80, timeout: 4000 }).catch(() => {});
      await page.waitForTimeout(1100);
      const after = await snap();
      const afterButtons = after.map(x => x.label);
      /* Did typing unlock a control that was greyed out before? Then this box
         is a gate and the text belongs in it, even with nothing suggested.
         That is how the free text games are answered: /emoji-guess has no
         autocomplete at all, just a Guess button that stays dead until the
         field has something in it. */
      const unlocked = after.some((x, k) => !x.off && before[k] && before[k].off && before[k].label === x.label);
      if (unlocked) { unlockedGate = true; }
      const freshIndex = afterButtons.findIndex(l => l && !beforeButtons.includes(l));
      if (freshIndex < 0) { if (unlocked) return false; continue; }
      /* Click by POSITION, never by name. A suggestion row is two lines,
         "Marcus Rashford" over "LW · England", so its innerText carries a
         newline while its accessible name has that collapsed to a space, and
         getByRole({name, exact:true}) therefore matches nothing at all. That
         silently cost /transfer-path its whole run. */
      const pick = page.locator('button:visible').nth(freshIndex);
      const label = afterButtons[freshIndex].replace(/\s+/g, ' ');
      if (await tryClick(pick, `answer:${label.slice(0, 28)}`)) return true;
    }
    /* Nothing was suggested. If typing unlocked a button, this is a gate and
       the text stays: the very next thing the loop does is press that button.
       If it unlocked nothing it was a filter, and a filter left applied is
       what emptied the list under /fantasy-draft and made five working
       controls look like a stall, so put it back the way it was found. */
    if (unlockedGate) {
      await inp.fill('', { timeout: 2000 }).catch(() => {});
      await inp.pressSequentially('Playtest', { delay: 25, timeout: 4000 }).catch(() => {});
      return false;
    }
    await inp.fill('', { timeout: 2000 }).catch(() => {});
    if (step === 0) await inp.fill('Playtest', { timeout: 2000 }).catch(() => {});
  }
  return false;
}

// Never press the site chrome: Back and Home leave the game, which is not a
// bug, it is the harness walking out of the room. How to play only reopens
// the dialog we just closed, and Report opens a form over the game.
const CHROME = /^(back|home|track stats|douknowball|menu|accept|essential only|share|copy|how to play|report|report a bug|close|privacy|terms|about|contact|log in|sign up)$/i;
/* Round 118: and never surrender. This is the same rule as never pressing Back
   or Home, one level in. On /transfer-path the harness opened the game and
   immediately pressed "Give up and see a path", then confirmed it with "Yes,
   reveal it", which ended the game at step 1 and left it reported as unplayable
   when it plays perfectly well. Quitting is not a bug and restarting is not
   progress, so both are off the table. Note this deliberately does not blanket
   block "reveal": "Reveal Next Clue" is how you actually play the career path
   games, and only the give-up phrasings are listed. */
const SURRENDER = /^(give up|quit|forfeit|surrender|yes,? reveal|reveal the answer|show (the )?answer|see the answer|play again|new game|restart|start over)/i;
/* "How to play" matches /play/, so the old WANT regex made the how-to-play
   button the single most attractive control on most of the site. Anchor the
   play words so they cannot be reached through it. */
const WANT = /^(?!how to\b).*(play now|start|continue|next|confirm|submit|take the job|sim|advance|begin|new career|pick|choose|select|draft|accept offer|roll|attack|invade|guess|reveal|spin|deal)/i;

/* Round 117, the last rule and the one that stops a flake becoming a bug
   report. Findings are rare enough now to be worth confirming, so a game that
   produces one is replayed from scratch and the finding is only kept if it
   happens twice. /sports-millionaire earned this: it threw a CORS failure on
   rpc/global_rank once under load and came back clean three times out of three
   on its own. A harness that reports weather is a harness people stop reading. */
async function playOnce(game) {
  const out = { findings: [], skipped: null, acted: 0 };
  let acted = 0;
  // A fresh context per game so every run is a true first time visitor and
  // one game's saved state can never mask another game's bug.
  /* ignoreHTTPSErrors is what actually lets the data games play, and it is
     worth understanding rather than copying. A sandbox that inspects outbound
     TLS presents its own certificate, so Chromium rejects every Supabase call
     with ERR_CERT_AUTHORITY_INVALID and each data driven game falls into its
     "couldn't load today's board" state. Without this flag /jeopardy and
     /ball-iq look stone dead and the finding is entirely the harness's fault.
     With it, /jeopardy renders its real board off the live jeopardy_clues
     table. Nothing here bypasses a check the site itself makes: the site's own
     validators still run, this only stops the sandbox's own proxy from
     breaking the connection. */
  const ctx = await browser.newContext({ viewport: { width: 430, height: 900 }, ignoreHTTPSErrors: true });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).split('\n')[0].slice(0, 150)));
  page.on('console', m => {
    const t = m.text();
    if (m.type() === 'error' && !IGNORE_CONSOLE.test(t)) errs.push(t.slice(0, 150));
  });

  const note = (kind, detail) => { out.findings.push({ game, kind, detail }); };
  const skip = (detail) => { out.skipped = { game, detail }; };

  try {
    await page.goto(BASE + game, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await settle(page);
    await clearOverlays(page);

    /* Round 117, the fourth hard-won rule, and it is the one that separates
       this from noise. The old loop re-picked the SAME first matching control
       every step, so a control that does nothing pinned it in a loop of its
       own making and it called that a stall. Measured: /guess-the-nation
       pressed "Try again" three times, which resets the round to the state it
       was already in, and /cfb-higher-lower pressed the "Daily" tab three
       times, which was already the selected mode. Both games are fine. So
       remember every control that produced an identical screen and never
       press it again in this run. A stall now means something much stronger:
       the harness tried every control it could reach and NONE of them moved
       the game on. */
    const duds = new Set();
    let sawDisabled = false;
    for (let s = 0; s < STEPS; s++) {
      await clearOverlays(page);
      const before = (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
      if (before.length < 60) { note('BLANK  ', `screen went empty at step ${s}`); break; }
      for (const [rx, why] of LEAKS) {
        const m = before.replace(/DOUKNOWBALL|Track stats/g, '').match(rx);
        if (m) { note('COPY   ', `${why} at step ${s}: "${before.slice(Math.max(0, m.index - 40), m.index + 50).trim()}"`); break; }
      }
      const buttons = page.locator('button:visible');
      const n = await buttons.count();
      if (n === 0) { note('DEAD   ', `no clickable control at step ${s}`); break; }
      let clicked = false, pressed = '';
      const tryClick = async (loc, label) => {
        try { await loc.click({ timeout: 3000 }); clicked = true; pressed = label; acted += 1; return true; } catch { return false; }
      };
      /* Creation screens gate the primary button behind a required name, so
         fill an empty text box before deciding nothing is clickable. Two
         limits on that, both of which cost a false finding to learn.

         Only on the first step. Typing on every step meant that on any game
         with a live search box the harness re-entered "Playtest" before each
         press, which filters the list to nothing, and then every control it
         pressed afterwards changed nothing because there was nothing left to
         change. /fantasy-draft reported a stall across five position filters
         that way; pressed by hand the same filters take the screen from 15224
         characters to 4131. The game was never the problem.

         And never a search or filter box. Those are not gates, they are the
         opposite: typing in one takes options away. */
      if (!clicked) clicked = await answerInput(page, tryClick, s);
      // A shadcn Select is a combobox, not a button, and several creation
      // screens gate progress behind one. Open it and take the first option.
      const combos = page.getByRole('combobox');
      if (await combos.count() > 0) {
        for (let i = 0; i < await combos.count(); i++) {
          const c = combos.nth(i);
          const val = ((await c.innerText().catch(() => '')) || '').trim();
          if (!/^choose|^select|^pick/i.test(val)) continue;
          if (await tryClick(c, `select:${val}`)) {
            await page.waitForTimeout(350);
            if (await page.getByRole('option').count() > 0) {
              await page.getByRole('option').first().click({ timeout: 2500 }).catch(() => {});
            }
            await page.waitForTimeout(300);
            break;
          }
        }
      }
      const wanted = page.getByRole('button', { name: WANT });
      if (!clicked && await wanted.count() > 0) {
        for (let i = 0; i < Math.min(await wanted.count(), 6); i++) {
          const w = wanted.nth(i);
          const label = ((await w.innerText().catch(() => '')) || '').trim();
          if (duds.has(label) || SURRENDER.test(label)) continue;
          if (await w.isDisabled().catch(() => false)) { sawDisabled = true; continue; }
          if (await tryClick(w, label)) break;
        }
      }
      if (!clicked) {
        // Scan the whole button list, not the first twelve. A portaled dialog
        // or a board rendered after the chrome puts the only live controls at
        // the end of the DOM, which is exactly where the old cap stopped.
        for (let i = 0; i < Math.min(n, 40); i++) {
          const b = buttons.nth(i);
          const label = ((await b.innerText().catch(() => '')) || '').trim();
          if (!label || CHROME.test(label) || SURRENDER.test(label) || duds.has(label)) continue;
          // An already answered select still renders as a button showing its
          // value. Pressing it opens a dropdown that covers the whole screen
          // and the run dies there, so leave comboboxes to the block above.
          if ((await b.getAttribute('role').catch(() => null)) === 'combobox') continue;
          if (await b.isDisabled().catch(() => false)) { sawDisabled = true; continue; }
          if (await tryClick(b, label)) break;
        }
      }
      if (!clicked) {
        // Out of controls. Three different outcomes hide behind that, and
        // calling them all the same thing is what made the first pass useless.
        if (duds.size >= MIN_TRIED) {
          // Genuinely stuck: several distinct controls, none of them moved it.
          note('STALL  ', `tried ${duds.size} different controls by step ${s} and none of them changed the screen`);
        } else if (sawDisabled) {
          /* The only controls that were not chrome were DISABLED. That is a
             screen waiting for input, not a broken one, and calling it dead
             cost two false findings: /score-predictor sits on a greyed out
             "Lock In Prediction" until you enter two scores and /shirt-number
             on a greyed out "Guess" until you enter a number, and both games
             are perfectly healthy. */
          skip(`the only live control is disabled until real input is entered, which the harness cannot supply (${acted} press${acted === 1 ? '' : 'es'} in)`);
        } else if (s === 0 && duds.size === 0) {
          // Never got a single press away, and nothing was merely waiting on
          // input: that is a dead first screen.
          note('DEAD   ', `nothing clickable succeeded at step ${s}`);
        } else {
          skip(`played ${acted} press${acted === 1 ? '' : 'es'} then ran out of controls with only ${duds.size} proved dead, so the way on is something the harness cannot supply, usually a real answer picked from an autocomplete`);
        }
        break;
      }
      if (process.env.VERBOSE) console.log(`      ${game} step ${s}: pressed "${pressed}"`);
      await page.waitForTimeout(650);
      const after = (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
      // Compare the WHOLE screen: the first few hundred characters are the
      // shared header on every game, so a prefix comparison calls everything
      // a stall. A real stall is the identical screen coming back three
      // presses running, which means nothing is advancing.
      if (after === before) duds.add(pressed);
      if (errs.length) { note('THROWS ', `${errs[0]} (step ${s})`); break; }
    }
    if (errs.length && !out.findings.some(f => f.kind === 'THROWS ')) note('THROWS ', errs[0]);

  } catch (e) {
    note('FAILED ', String(e).split('\n')[0].slice(0, 120));
  }
  await ctx.close();
  out.acted = acted;
  return out;
}

for (const game of GAMES) {
  let r = await playOnce(game);
  if (r.findings.length) {
    const first = r.findings[0];
    const again = await playOnce(game);
    if (!again.findings.length) {
      console.log(`  flake   ${game}  ${first.kind.trim()} did not reproduce on a replay, ignoring it`);
      r = again;
    } else {
      r = again;
    }
  }
  for (const f of r.findings) note(f.game, f.kind, f.detail);
  if (r.skipped) skip(r.skipped.game, r.skipped.detail);
  if (!r.findings.length && !r.skipped) console.log(`  ok      ${game}  ${r.acted} interactions clean`);
}

await browser.close();
console.log(`\nPlayed ${GAMES.length} games. ${findings.length} findings, ${skipped.length} the harness could not drive.`);
fs.writeFileSync('/tmp/play.json', JSON.stringify({ findings, skipped }, null, 1));
process.exit(findings.length === 0 ? 0 : 1);
