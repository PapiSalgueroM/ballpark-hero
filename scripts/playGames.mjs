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
 * Serve the production build first:
 *   npm run build && npx serve -s dist -l 4173
 * Then: node scripts/playGames.mjs
 */
import pw from '/home/claude/.npm-global/lib/node_modules/playwright/index.js';
const { chromium } = pw;
import fs from 'node:fs';

const BASE = process.env.SWEEP_BASE || 'http://127.0.0.1:4173';
const STEPS = Number(process.env.STEPS || 14);

/* Games that are fully client side, so they play through with no network.
   Data driven games are left to sweepGames.mjs, because in a sandbox with no
   Supabase they would stall on loading and every finding would be noise. */
const GAMES = (process.env.ONLY ? [process.env.ONLY] : [
  '/club-manager', '/soccer-career', '/nfl-my-career', '/nba-my-career',
  '/mlb-my-career', '/nhl-my-career', '/conquest', '/conquest-nba',
  '/conquest-mlb', '/conquest-nhl', '/front-office', '/nba-front-office',
  '/mlb-front-office', '/nhl-front-office', '/cfb-dynasty', '/cbb-dynasty',
]);

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox', '--no-proxy-server'],
});
const ctx = await browser.newContext({ viewport: { width: 430, height: 900 } });

const findings = [];
const note = (game, kind, detail) => { findings.push({ game, kind, detail }); console.log(`  ${kind}  ${game}  ${detail}`); };

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

for (const game of GAMES) {
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).split('\n')[0].slice(0, 150)));
  page.on('console', m => {
    const t = m.text();
    if (m.type() === 'error' && !/ERR_CERT|ERR_QUIC|ERR_NAME|Failed to load resource/.test(t)) errs.push(t.slice(0, 150));
  });

  try {
    await page.goto(BASE + game, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(1200);
    // Cookie banner blocks taps on some layouts.
    await page.getByRole('button', { name: /essential only|accept/i }).first().click({ timeout: 1500 }).catch(() => {});

    const seen = new Set();
    let stalled = 0, acted = 0;
    for (let s = 0; s < STEPS; s++) {
      const before = (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
      if (before.length < 60) { note(game, 'BLANK  ', `screen went empty at step ${s}`); break; }
      for (const [rx, why] of LEAKS) {
        const m = before.replace(/DOUKNOWBALL|Track stats/g, '').match(rx);
        if (m) { note(game, 'COPY   ', `${why} at step ${s}: "${before.slice(Math.max(0, m.index - 40), m.index + 50).trim()}"`); break; }
      }
      // Press the most game-like control available, in priority order.
      const buttons = page.locator('button:visible');
      const n = await buttons.count();
      if (n === 0) { note(game, 'DEAD   ', `no clickable control at step ${s}`); break; }
      // Never press the site chrome: Back and Home leave the game, which is
      // not a bug, it is the harness walking out of the room.
      const CHROME = /^(back|home|track stats|douknowball|menu|accept|essential only|share|copy)$/i;
      let clicked = false, pressed = '';
      const WANT = /play|start|continue|next|confirm|take the job|sim|advance|begin|new career|pick|choose|select|draft|accept offer|roll|attack|invade/i;
      const tryClick = async (loc, label) => {
        try { await loc.click({ timeout: 3000 }); clicked = true; pressed = label; acted += 1; return true; } catch { return false; }
      };
      // Creation screens gate the primary button behind a required name, so
      // fill any empty text box before deciding nothing is clickable.
      const inputs = page.locator('input[type="text"]:visible, input:not([type]):visible');
      for (let i = 0; i < Math.min(await inputs.count(), 3); i++) {
        const inp = inputs.nth(i);
        if (((await inp.inputValue().catch(() => 'x')) || '').trim() === '') {
          await inp.fill('Playtest', { timeout: 2500 }).catch(() => {});
        }
      }
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
            const opt = page.getByRole('option').first();
            if (await page.getByRole('option').count() > 0) await opt.click({ timeout: 2500 }).catch(() => {});
            await page.waitForTimeout(300);
            break;
          }
        }
      }
      const wanted = page.getByRole('button', { name: WANT });
      if (!clicked && await wanted.count() > 0) await tryClick(wanted.first(), 'wanted');
      if (!clicked) {
        for (let i = 0; i < Math.min(n, 12); i++) {
          const b = buttons.nth(i);
          const label = ((await b.innerText().catch(() => '')) || '').trim();
          if (!label || CHROME.test(label)) continue;
          // An already answered select still renders as a button showing its
          // value. Pressing it opens a dropdown that covers the whole screen
          // and the run dies there, so leave comboboxes to the block above.
          if ((await b.getAttribute('role').catch(() => null)) === 'combobox') continue;
          if (await tryClick(b, label)) break;
        }
      }
      if (!clicked) { note(game, 'DEAD   ', `nothing clickable succeeded at step ${s}`); break; }
      if (process.env.VERBOSE) console.log(`      ${game} step ${s}: pressed "${pressed}"`);
      await page.waitForTimeout(650);
      const after = (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
      // Compare the WHOLE screen: the first few hundred characters are the
      // shared header on every game, so a prefix comparison calls everything
      // a stall. A real stall is the identical screen coming back three
      // presses running, which means nothing is advancing.
      if (after === before) stalled += 1; else stalled = 0;
      seen.add(after);
      if (stalled >= 3) { note(game, 'STALL  ', `identical screen three presses running from step ${s}`); break; }
      if (errs.length) { note(game, 'THROWS ', `${errs[0]} (step ${s})`); break; }
    }
    if (errs.length && !findings.some(f => f.game === game && f.kind === 'THROWS ')) note(game, 'THROWS ', errs[0]);
    if (!findings.some(f => f.game === game)) console.log(`  ok      ${game}  ${acted} interactions clean`);
  } catch (e) {
    note(game, 'FAILED ', String(e).split('\n')[0].slice(0, 120));
  }
  await page.close();
}

await browser.close();
console.log(`\nPlayed ${GAMES.length} games. ${findings.length} findings.`);
fs.writeFileSync('/tmp/play.json', JSON.stringify(findings, null, 1));
process.exit(findings.length === 0 ? 0 : 1);
