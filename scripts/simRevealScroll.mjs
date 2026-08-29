/**
 * Round 128 harness: clicking something must not drag the page down.
 *
 * The owner's report, word for word: "I don't like every time u click something
 * on my career on the soccer one on a mobile phone, after clicking something it
 * drags u to lower on the screen." The thing doing the dragging was the hook
 * that exists to stop exactly that, src/hooks/useRevealScroll.ts, which is used
 * on 21 screens. It shipped in Round 61 and nothing in this repo has ever
 * checked it, which is how it survived sixty seven rounds.
 *
 * So this is the permanent check. It is a measurement, not a smoke test: it
 * drives five real games in a real Chromium at 390x844, records window.scrollY
 * either side of every single press, and prints every number it saw whether the
 * run is green or red.
 *
 * How it watches, and why it watches this way. It does not read the hook's
 * source, does not need a data attribute planted in the DOM, and does not care
 * how the hook is written. It monkey patches Element.prototype.scrollIntoView
 * before any page script runs, so every scroll the site asks for is recorded
 * with the element's rectangle at the moment of asking, plus the arguments. The
 * element itself is kept, so after the scroll has settled the SAME element can
 * be measured again. That is the whole trick and it means this file keeps
 * working no matter how the hook is rewritten later, including by somebody who
 * decides to use window.scrollTo instead, which is also patched and logged.
 *
 * Three things it decides.
 *
 *   YANK   the page went down while the top of the new content was already
 *          sitting comfortably on screen. This is the bug he reported.
 *   LOSTTOP the top of the new content ended up above the top of the viewport
 *          after a scroll, which is "you lost the top of the card".
 *   PROOF  at least one press where the new content could not be read where it
 *          was and got put back under the top of the screen, PROOF++ when it
 *          was completely off screen beforehand. Without this a future round
 *          could make the file green by deleting the feature, and a guard that
 *          can be satisfied by switching off the thing it guards is worthless.
 *
 * Serve the production build first, because Playwright cannot reach the live
 * domain from a sandbox:
 *   npm run build && npx serve -s dist -l 4173
 * Then: node scripts/simRevealScroll.mjs
 *
 * And restart serve after every rebuild. It answers index.html out of a cache
 * it fills when it starts, so a rebuilt bundle sitting on disk is not the
 * bundle it hands out, and an afternoon can go into wondering why a fix has no
 * effect. runAllSims.mjs starts its own server per run so it never sees this.
 *
 * VERBOSE=1 prints every press including the quiet ones.
 */
import pw from './lib/playwrightLoader.mjs';
const { chromium } = pw;
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.SWEEP_BASE || process.env.BASE || 'http://127.0.0.1:4173';
const VERBOSE = process.env.VERBOSE === '1';

/* His phone. Everything here is judged at this size and nothing else. */
const VW = 390;
const VH = 844;

/* How comfortable "already comfortably on screen" has to be before a downward
   scroll counts as a yank.
 *
 * This number is deliberately STRICTER than the hook's own idea of comfortable,
 * and that asymmetry is the point. The hook leaves the page alone once 160px of
 * the new thing is showing under its top edge. This file only complains once
 * 190px is showing, which is a quarter of the readable strip on this phone. So
 * every case it calls a yank is a case the hook itself already agreed was fine
 * to leave alone, and it can never fail a borderline judgement call that the
 * hook is entitled to make differently. It still catches the real bug by a
 * mile: the Soccer Career panel had 348px showing when the old hook dragged the
 * page 669px. */
const COMFY = 190;

/* Subpixel layout means a card can land at 0.4px or at -0.6px. Neither is
   anybody losing the top of anything. */
const SLACK = 4;

const games = [];
const failures = [];
const rows = [];
let proofs = 0;
let fullyHidden = 0;

/* Recorded before any page script runs, so nothing on the site can be missed.
   Keeping the element (not a copy of its rect) is what lets the same node be
   re-measured after the smooth scroll has finished. */
const PATCH = `
window.__rs = { calls: [], scrollTos: [], el: null };
const origSIV = Element.prototype.scrollIntoView;
Element.prototype.scrollIntoView = function (arg) {
  const r = this.getBoundingClientRect();
  window.__rs.el = this;
  window.__rs.calls.push({
    top: Math.round(r.top), h: Math.round(r.height),
    y: Math.round(window.scrollY),
    arg: typeof arg === 'object' && arg ? JSON.stringify(arg) : String(arg),
  });
  return origSIV.apply(this, arguments);
};
const origTo = window.scrollTo.bind(window);
window.scrollTo = function () {
  window.__rs.scrollTos.push({ y: Math.round(window.scrollY), args: JSON.stringify([...arguments]) });
  return origTo.apply(window, arguments);
};
`;

/* What a player can actually read: under anything pinned across the top of the
   screen, above anything pinned across the bottom. Measured by looking at what
   is painted at those two edges rather than by trusting a class name, because
   the class names lie: the site header wraps a div with h-14 on it and measures
   106px at this width, and it is not mounted on game routes at all. */
const INSETS = `(() => {
  const vh = window.innerHeight, vw = window.innerWidth;
  const scan = (y, isTop) => {
    let best = 0;
    for (const x of [vw * 0.5, 6, vw - 6]) {
      for (const el of document.elementsFromPoint(x, y)) {
        const pos = getComputedStyle(el).position;
        if (pos !== 'fixed' && pos !== 'sticky') continue;
        const r = el.getBoundingClientRect();
        if (r.height === 0 || r.height > vh * 0.4) continue;
        if (isTop) { if (r.top > 2 || r.bottom <= 0) continue; if (r.bottom > best) best = r.bottom; }
        else { if (r.bottom < vh - 2 || r.top >= vh) continue; if (vh - r.top > best) best = vh - r.top; }
      }
    }
    return Math.round(best);
  };
  return { top: scan(1, true), bottom: scan(vh - 2, false), vh };
})()`;

/* Soccer Career is the one he reported and by a distance the most played game
   on the site, so a harness that cannot reach its mid career screen is not
   worth running. Getting past the creation screen by clicking is genuinely
   awkward: nationality, position and era are shadcn Selects rendered as
   buttons, and open-the-trigger-then-click-[role=option] does not work in this
   sandbox. So the save is built with the real engine, in node, and dropped into
   localStorage under the key the page reads. Same code path the game uses, so
   this is a real career and not a mock, and the page boots straight into the
   screen the complaint is about. */
function seedSoccerSave() {
  const entry = '/tmp/revealScrollSeed.mjs';
  const bundle = '/tmp/revealScrollSeed.bundle.mjs';
  fs.writeFileSync(entry, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const engine = await import('${ROOT}/src/lib/soccerCareerEngine.ts');
export { engine };
`);
  execSync(`${ROOT}/node_modules/.bin/esbuild ${entry} --bundle --format=esm --platform=node --outfile=${bundle} --log-level=error`);
  return bundle;
}

const { engine } = await import(seedSoccerSave());
const { initCareer, advanceYouthYear, FALLBACK_CLUBS } = engine;
let soccerSave = initCareer(
  'Playtest', 'England', 'ST', '2020s',
  { pace: 74, shooting: 76, passing: 72, dribbling: 75, defending: 45, physical: 68, reflexes: 30 },
  72, 2020, FALLBACK_CLUBS, null, 88,
);
/* One year on, so the career already has a season behind it and the overlays
   are the full sized ones a real player sees rather than a day one stub. */
soccerSave = advanceYouthYear(soccerSave, FALLBACK_CLUBS);
if (!soccerSave || !soccerSave.playerName) {
  console.error('FAIL: could not build a Soccer Career save, so the game he reported is not being measured');
  process.exit(1);
}

/* Buttons that move a game forward. */
const WANT = /^(?!how to\b)(next year|next season|continue|next|start|begin|play|confirm|submit|advance|sim|accept|take the job|choose|select|pick|draft|throw|deal|bid|buy|sign|keep|flip|lock|reveal next)/i;
/* Site chrome and escape hatches. Pressing any of these is the harness walking
   out of the room rather than playing: Back and Track stats leave the game,
   Report opens a form over it, and quitting or restarting is not progress, it
   is the opposite. Track stats and Report a bug sit on every single game page,
   and leaving them off this list is what had the harness pressing Track stats
   ten times in a row on Dart Draft and calling it a clean run. */
const AVOID = /^(back|home|track stats|douknowball|how to play|report|share|copy|privacy|terms|about|contact|log ?in|sign ?up|essential only|accept all|give up|quit|forfeit|restart|new game|play again|start over|new career|reset|fire yourself|retire|walk away|sell club|end |menu)/i;

async function clearOverlays(page) {
  await page.getByRole('button', { name: /^essential only$/i }).first().click({ timeout: 1200 }).catch(() => {});
  for (let i = 0; i < 3; i++) {
    const open = page.locator('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]');
    if (await open.count().catch(() => 0) === 0) break;
    const closer = open.first().getByRole('button', { name: /^(close|got it|start|play|ok|done|let's go)/i });
    if (await closer.count().catch(() => 0) > 0) await closer.first().click({ timeout: 1200 }).catch(() => {});
    else await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(250);
  }
  await page.getByRole('button', { name: /^essential only$/i }).first().click({ timeout: 1200 }).catch(() => {});
}

/* A smooth scroll is an animation, so scrollY has to be watched until it stops
   rather than waited on for a guessed number of milliseconds. Three identical
   readings in a row is the finish line. */
async function settle(page) {
  let last = null, same = 0;
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(110);
    const y = await page.evaluate(() => Math.round(window.scrollY)).catch(() => last);
    if (y === last) { same += 1; if (same >= 3) break; } else { same = 0; last = y; }
  }
  return last ?? 0;
}

/* Picking what to press.
 *
 * Two rules borrowed straight from playGames.mjs, both of which it paid for.
 * A control that hands back a byte for byte identical screen is a dud and never
 * gets pressed again in this run. A control that hands back a screen already
 * seen this run is a door backwards, and Club Manager proved why that matters:
 * without it this file bounced between the league list and the league detail
 * six times and reported twelve clean presses having never picked a club.
 *
 * One rule of its own. On a long list of tiles, deliberately take one from the
 * BOTTOM of the list rather than the top. Rebuild's club picker is 6251px of
 * document on a 844px phone, and a player choosing Everton off the bottom of it
 * is standing 3000px down the page when the next screen renders at the top.
 * That is the exact situation the reveal scroll exists for, and always pressing
 * the first tile would mean never once testing it.
 */
/* Buttons on this site open with an emoji more often than not, and an anchored
   regex does not see past one. "🚪 Retire" sailed straight through the AVOID
   list and ended a Soccer Career run at step 7 by retiring the player, which
   then made "🔄 New Career" the obvious next press. Strip the decoration before
   judging the label. */
const key = (label) => label.replace(/^[^\p{L}\p{N}]+/u, '').trim();

async function press(page, duds, used, step) {
  const all = page.locator('button:visible');
  const total = Math.min(await all.count().catch(() => 0), 45);
  const cands = [];
  for (let i = 0; i < total; i++) {
    const b = all.nth(i);
    const label = ((await b.innerText().catch(() => '')) || '').trim().replace(/\s+/g, ' ').slice(0, 34);
    if (!label) continue;
    /* Some controls are ONLY an emoji, and Rebuild's face down fortune cards
       are the ones that mattered: they are labelled "❓", key() strips them to
       nothing, and treating an empty key as an unusable button ended that
       game's run two presses in. An emoji is a label. */
    const k = key(label) || label;
    if (AVOID.test(k) || duds.has(label)) continue;
    /* A control that is not a step forward gets ONE press per run. Club Manager
       is why: "All nations" and "England 2 leagues" each genuinely change the
       screen, so neither is ever a dud, and the harness spent twelve presses
       walking in and back out of England without ever picking a club. Repeatable
       controls are the ones that read like a step, Continue and THROW and Next
       Season, and those keep their allowance. */
    const cap = WANT.test(k) ? 8 : 2;
    if ((used.get(label) || 0) >= cap) continue;
    if (await b.isDisabled().catch(() => false)) continue;
    cands.push({ b, label });
  }
  /* Running out of controls has to say WHAT it was looking at. "ran out after
     two presses" on its own is indistinguishable from a game that broke, and
     the harness would be handing over a mystery instead of a measurement. */
  if (!cands.length) {
    const saw = [];
    for (let i = 0; i < total; i++) {
      const t = ((await all.nth(i).innerText().catch(() => '')) || '').trim().replace(/\s+/g, ' ').slice(0, 24);
      if (t) saw.push(t);
    }
    return { label: null, saw };
  }

  const wanted = cands.filter((c) => WANT.test(key(c.label) || c.label));
  const rest = cands.filter((c) => !wanted.includes(c));
  /* Drop the back links, without needing to know what a back link looks like.
     Club Manager's picker walks nation, then league, then club, and every step
     of it carries a small chevron button back to the step before. Its label is
     the league name, "Premier League", and the tile that goes FORWARD is
     "Premier League 20 clubs · domestic cup: FA Cup". One is a strict prefix of
     the other, and it sits earlier in the DOM, so a harness taking the first
     usable control walks in and straight back out, six times, and reports
     twelve clean presses having never picked a club. A label that another
     label on the same screen starts with is the short way back, so leave it.
     Same for the very short ones, "All nations", when longer ones exist. */
  const meaty = rest.filter((c) => !rest.some((o) => o !== c && o.label !== c.label && o.label.startsWith(c.label)));
  const longEnough = meaty.filter((c) => c.label.length >= 12);
  const pool = longEnough.length ? longEnough : (meaty.length ? meaty : rest);
  /* And take from the BOTTOM of what is left. Choosing off the end of a long
     list is what puts a player 590px down the page when the next screen renders
     at the top of it, which is the exact situation the reveal scroll exists to
     handle. Always pressing the first tile would mean never testing it. */
  const order = wanted.concat(pool.slice().reverse());

  for (const { b, label } of order) {
    if (!(await b.isVisible().catch(() => false))) continue;
    /* Put the control on screen OURSELVES and let the page settle before the
       stopwatch starts. Playwright scrolls a target into view as part of
       click(), and that scroll would otherwise land inside the before/after
       window and get blamed on the site. A player scrolls to a button and then
       taps it; this is the same two steps in the same order. */
    await b.scrollIntoViewIfNeeded({ timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(220);
    /* The stopwatch starts here, with the control on screen and the page still,
       and the recorder is wiped in the same breath so nothing from getting here
       is counted against the press itself. */
    const yBefore = await page.evaluate(() => {
      window.__rs.calls = []; window.__rs.scrollTos = []; window.__rs.el = null;
      return Math.round(window.scrollY);
    });
    if (await b.click({ timeout: 2500 }).then(() => true).catch(() => false)) {
      used.set(label, (used.get(label) || 0) + 1);
      return { label, yBefore };
    }
  }
  return { label: null, saw: cands.map((c) => c.label.slice(0, 24)) };
}

async function playGame(browser, { route, steps, seed, deep }) {
  const ctx = await browser.newContext({ viewport: { width: VW, height: VH }, ignoreHTTPSErrors: true });
  if (seed) await ctx.addInitScript(seed);
  await ctx.addInitScript(PATCH);
  const page = await ctx.newPage();
  const rec = { route, presses: 0, scrolls: 0, quiet: 0, yanks: [], lostTops: [], proofs: [], reachedGame: false, note: '', insets: new Set() };

  try {
    await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.waitForTimeout(1400);
    await clearOverlays(page);
    await page.waitForTimeout(400);

    const body = (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ');
    if (body.length < 60) { rec.note = 'screen never rendered'; return rec; }
    /* Soccer Career specifically: say out loud whether the seeded save actually
       took. A harness measuring the creation screen measures nothing, and it
       has to admit that rather than passing quietly. */
    if (route === '/soccer-career') {
      rec.reachedGame = /OVR/.test(body) && /Next (Year|Season)/i.test(body);
      if (!rec.reachedGame) { rec.note = 'never got past the creation screen, so nothing here was measured'; return rec; }
    } else {
      rec.reachedGame = true;
    }

    const duds = new Set();
    const used = new Map();
    for (let s = 0; s < steps; s++) {
      await clearOverlays(page);
      /* Round 86 gave Soccer Career an action bar welded to the bottom of the
         phone, which means Next Season can be pressed from ANY scroll position,
         including from the bottom of a 7000px page where the panel that is
         about to change is thousands of pixels above the screen. That is the
         original Round 61 scenario in its purest form and it is the one case
         where the sticky bar and the reveal scroll have to agree with each
         other, so it is walked into deliberately rather than hoped for. It is
         also the second independent source of PROOF, so this file does not
         depend on one lucky press to know the feature still works. */
      if (deep && s > 0 && s % 3 === 0) {
        await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
        await page.waitForTimeout(400);
      }
      const shot = (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
      const hit = await press(page, duds, used, s);
      if (!hit.label) {
        rec.note = rec.note || `ran out of controls after ${s} presses, screen was offering: ${hit.saw.slice(0, 8).join(' | ') || 'nothing'}`;
        break;
      }
      const { label, yBefore } = hit;
      rec.presses += 1;
      const yAfter = await settle(page);
      const probe = await page.evaluate(`(() => {
        const ins = ${INSETS};
        const el = window.__rs.el;
        const r = el ? el.getBoundingClientRect() : null;
        return { calls: window.__rs.calls, tos: window.__rs.scrollTos.length,
                 after: r ? Math.round(r.top) : null, afterH: r ? Math.round(r.height) : null, ins };
      })()`);

      const now = (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
      if (now === shot) duds.add(label);          // pressed it, nothing happened

      const ins = probe.ins;
      const readTop = ins.top;
      const readBottom = ins.vh - ins.bottom;
      const call = probe.calls[0] || null;
      const moved = yAfter - yBefore;
      rec.insets.add(`${ins.top}/${ins.bottom}`);
      const row = { route, step: s, label, yBefore, yAfter, moved, readTop, readBottom, call, after: probe.after };
      rows.push(row);

      if (!call) { rec.quiet += 1; if (VERBOSE) printRow(row, 'quiet'); continue; }
      rec.scrolls += 1;

      const lead = Math.max(0, Math.min(call.top + call.h, readBottom) - Math.max(call.top, readTop));
      const wasComfy = call.top >= readTop - SLACK && lead >= COMFY;
      const wasHidden = call.top >= readBottom || call.top + call.h <= readTop;
      /* Did this scroll actually leave the player able to read the new thing?
         Top edge inside the readable strip and enough of it under that edge.
         This is what turns a scroll into evidence rather than just motion. */
      const leadAfter = probe.after === null ? 0
        : Math.max(0, Math.min(probe.after + probe.afterH, readBottom) - Math.max(probe.after, readTop));
      const nowReadable = probe.after !== null
        && probe.after >= readTop - SLACK && probe.after < readBottom
        && leadAfter >= Math.min(probe.afterH, COMFY);

      if (moved > SLACK && wasComfy) {
        rec.yanks.push(row);
        failures.push(`${route} step ${s} "${label}": page dragged down ${moved}px while the new panel's top was already ${call.top}px down a ${ins.vh}px screen with ${lead}px of it showing`);
        printRow(row, 'YANK');
      } else if (probe.after !== null && probe.afterH > 0 && probe.after < readTop - SLACK) {
        rec.lostTops.push(row);
        failures.push(`${route} step ${s} "${label}": after the scroll the new panel's top sits at ${probe.after}px, which is ${readTop - probe.after}px above the top of the screen`);
        printRow(row, 'LOSTTOP');
      } else if (!wasComfy && nowReadable) {
        /* The feature doing its job: the new thing was not readable where it
           was, and after the scroll it is. wasHidden marks the strongest kind,
           where it was completely off the screen rather than half of it. */
        rec.proofs.push(row);
        proofs += 1;
        if (wasHidden) fullyHidden += 1;
        printRow(row, wasHidden ? 'PROOF++' : 'PROOF');
      } else if (VERBOSE) {
        printRow(row, 'ok');
      }
    }
  } catch (e) {
    rec.note = 'threw: ' + String(e).split('\n')[0].slice(0, 120);
  } finally {
    await ctx.close().catch(() => {});
  }
  return rec;
}

function printRow(r, tag) {
  const c = r.call;
  const where = c
    ? `panel top ${String(c.top).padStart(5)} h ${String(c.h).padStart(5)} -> top ${String(r.after).padStart(5)}  block=${(c.arg.match(/"block":"(\w+)"/) || [, '?'])[1]}`
    : 'no scroll asked for';
  console.log(
    `  ${tag.padEnd(7)} ${r.route.padEnd(16)} step ${String(r.step).padStart(2)}  ` +
    `scrollY ${String(r.yBefore).padStart(5)} -> ${String(r.yAfter).padStart(5)} (${r.moved >= 0 ? '+' : ''}${r.moved})  ` +
    `${where}  [${r.label}]`,
  );
}

/* Five games off the list of 21, chosen so the shapes differ rather than to pad
   a number. Soccer Career is the reported one, its overlay panel is the tall
   one, and it is the only one with a bottom pinned action bar. Club Manager
   holds three separate reveal refs on one page behind a picker you have to
   scroll down to use. Dart Draft renders the players you can draft below the
   board. CFB Dynasty swaps its whole screen on every phase. Clue Auction
   changes one card at a time in a list.

   Rebuild was in this list and was taken back out, which is worth writing down
   because the reason is a bug and not a preference. RebuildBoard.tsx declares
   a revealRef on line 41 and never attaches it to anything, so the hook has run
   on a null node on that game since Round 61 and can never scroll it. Ten
   presses through it measured exactly nothing. It is the only one of the 21
   call sites like that. Left alone deliberately rather than quietly wired up:
   attaching it would newly add scrolling to a game nobody has complained about,
   in a round whose whole subject is scrolling people did not ask for. */
const PLAN = [
  { route: '/soccer-career', steps: 12, deep: true, seed: `localStorage.setItem('soccerCareerSave', ${JSON.stringify(JSON.stringify(soccerSave))});` },
  { route: '/club-manager', steps: 16 },
  { route: '/dart-draft', steps: 10 },
  { route: '/cfb-dynasty', steps: 12 },
  { route: '/clue-auction', steps: 10 },
];

console.log(`Reveal scroll, ${VW}x${VH}, ${PLAN.length} games, base ${BASE}`);
console.log('A press is a YANK if the page went down while the new panel was already readable,');
console.log(`LOSTTOP if the panel's top ended up above the screen, PROOF if something hidden was brought into view.\n`);

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || undefined,
  args: ['--no-sandbox', '--no-proxy-server'],
});

for (const plan of PLAN) {
  const rec = await playGame(browser, plan);
  games.push(rec);
}
await browser.close();

console.log('\nWhat each game did');
for (const g of games) {
  console.log(
    `  ${g.route.padEnd(16)} ${String(g.presses).padStart(2)} presses, ` +
    `${String(g.scrolls).padStart(2)} of them scrolled, ${String(g.quiet).padStart(2)} left the page alone, ` +
    `${g.yanks.length} yanks, ${g.lostTops.length} lost tops, ${g.proofs.length} rescued` +
    (g.note ? `  (${g.note})` : ''),
  );
  /* The measured header and action bar heights, printed rather than assumed.
     Nothing pinned to the top of a game page today, which is the answer for all
     five of these, and 85px of Round 86 action bar across the bottom of Soccer
     Career. If the header ever moves onto game routes these numbers change on
     their own and so does where the hook aims. */
  if (g.insets.size) console.log(`                   measured insets (top/bottom px): ${[...g.insets].join(', ')}`);
}

const withScroll = rows.filter((r) => r.call);
if (withScroll.length) {
  const moves = withScroll.map((r) => r.moved);
  const down = moves.filter((m) => m > SLACK);
  console.log(
    `\nOf ${rows.length} presses across ${games.length} games, ${withScroll.length} asked for a scroll and ` +
    `${rows.length - withScroll.length} did not. ${down.length} moved the page down` +
    (down.length ? `, by ${Math.min(...down)} to ${Math.max(...down)}px.` : '.'),
  );
  const tops = withScroll.map((r) => r.after).filter((t) => t !== null);
  if (tops.length) console.log(`Panel tops after a scroll ran from ${Math.min(...tops)}px to ${Math.max(...tops)}px down the screen.`);
}

/* A game the harness could not get into is not evidence of anything, and the
   most important one of the four is the one that is fiddly to reach. Say so
   loudly instead of counting it as a clean sheet. */
const dead = games.filter((g) => !g.reachedGame || g.presses < 3);
for (const g of dead) {
  failures.push(`${g.route}: only ${g.presses} presses landed${g.note ? ' (' + g.note + ')' : ''}, so this game was not really measured`);
}

if (proofs === 0) {
  failures.push(
    'not one press brought unreadable content into view, so this run cannot tell the difference ' +
    'between a fixed hook and a deleted one',
  );
} else {
  console.log(
    `\nThe feature still works: ${proofs} press${proofs === 1 ? '' : 'es'} took content that could not be read ` +
    `where it was and put it back under the top of the screen, ${fullyHidden} of them from completely off screen.`,
  );
}

console.log('');
if (!failures.length) {
  console.log(`Green. ${rows.length} presses measured, nothing dragged the page down on content that was already readable, no panel lost its top, and ${proofs} press${proofs === 1 ? '' : 'es'} proved the feature still does its job.`);
  process.exit(0);
}
console.log(`${failures.length} problem${failures.length === 1 ? '' : 's'}:`);
for (const f of failures) console.log('  FAIL: ' + f);
process.exit(1);
