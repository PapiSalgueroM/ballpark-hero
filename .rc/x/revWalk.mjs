// Reviewer walk for Round 1214 (the run lens). The round says nothing a player sees moves, so this
// walks Club Manager the way a player would and reads the numbers off the Squad tab: a 2026 Liverpool
// career and a 2010-11 Barcelona career, at 390x844 and 1280x900, reduced motion on and off.
// The database host is aborted. Screenshots go to $RC_OUT.
import fs from 'node:fs';
import path from 'node:path';
import pw from '../../scripts/lib/playwrightLoader.mjs';
import { enterSquad } from '../../scripts/lib/eraDressingRoom.mjs';

const { chromium } = pw;
const BASE = process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173';
const OUT = process.env.RC_OUT ?? '.';
fs.mkdirSync(OUT, { recursive: true });

let failures = 0;
const say = (ok, what) => { console.log((ok ? '  PASS  ' : '  FAIL  ') + what); if (!ok) failures += 1; };
const info = what => console.log('  INFO  ' + what);

const WALKS = [
  { id: 'liverpool2026', era: /2026-27/, nation: 'England', league: 'Premier League', club: 'Liverpool', header: /2026-27/, men: ['Virgil van Dijk', 'Mohamed Salah'] },
  { id: 'barcelona2010', era: /2010-11/, nation: 'Spain', league: 'La Liga', club: 'Barcelona', header: /2010-11/, men: ['Lionel Messi', 'Xavi'] },
];
const VIEWS = [
  { id: '390', viewport: { width: 390, height: 844 } },
  { id: '1280', viewport: { width: 1280, height: 900 } },
];

const browser = await chromium.launch();
for (const view of VIEWS) {
  for (const motion of ['reduce', 'no-preference']) {
    for (const walk of WALKS) {
      const tag = `${walk.id}-${view.id}-${motion === 'reduce' ? 'reduced' : 'motion'}`;
      console.log(`== ${tag}`);
      const ctx = await browser.newContext({ viewport: view.viewport, reducedMotion: motion });
      await ctx.route(/supabase\.co/, r => r.abort());
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(String(e)));
      const tap = async rx => {
        const b = page.locator('button:visible').filter({ hasText: rx }).first();
        await b.waitFor({ timeout: 9000 }).catch(() => {});
        return b.click({ timeout: 5000 }).then(() => true).catch(() => false);
      };
      await page.goto(`${BASE}/club-manager`, { waitUntil: 'networkidle' }).catch(() => {});
      await page.waitForTimeout(1500);
      await page.getByRole('button', { name: /^essential only$/i }).first().click({ timeout: 1500 }).catch(() => {});
      if (await page.locator('text=Start Fresh').count()) { await page.locator('text=Start Fresh').click(); await page.waitForTimeout(800); }
      await page.screenshot({ path: path.join(OUT, `${tag}-1-menu.png`) });
      say(await tap(walk.era), `${tag}: the season tile pressed`);
      say(await tap(new RegExp(`^\\s*${walk.nation}`)) || await tap(new RegExp(walk.nation)), `${tag}: ${walk.nation} pressed`);
      say(await tap(new RegExp(walk.league)), `${tag}: ${walk.league} pressed`);
      const clubBtn = page.locator(`button:has-text("${walk.club}")`).first();
      await clubBtn.waitFor({ timeout: 9000 }).catch(() => {});
      info(`${tag}: club tile says: ${((await clubBtn.textContent().catch(() => '')) || '').replace(/\s+/g, ' ').slice(0, 160)}`);
      await clubBtn.click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(500);
      await page.getByRole('button', { name: /^essential only$/i }).first().click({ timeout: 1200 }).catch(() => {});
      const room = await enterSquad(page);
      say(walk.header.test(room.hub) && /Season 1/.test(room.hub), `${tag}: the career header says the season and Season 1`);
      say(room.listed, `${tag}: the Squad tab listed the squad`);
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(OUT, `${tag}-2-squad.png`) });
      const flat = room.squad.replace(/\s*\n\s*/g, ' | ');
      for (const man of walk.men) {
        const at = flat.indexOf(man);
        say(at >= 0, `${tag}: ${man} is in the squad list`);
        if (at >= 0) info(`${tag}: row text: ${flat.slice(Math.max(0, at - 30), at + 110)}`);
      }
      const first = page.getByText(walk.men[0], { exact: true }).first();
      await first.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(OUT, `${tag}-3-${walk.men[0].split(' ').pop().toLowerCase()}.png`) });
      const wide = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      say(wide <= 1, `${tag}: no sideways scroll (the page is ${wide} px wider than the screen)`);
      const real = errors.filter(e => !/supabase|Failed to fetch|CORS|NetworkError/i.test(e));
      say(real.length === 0, `${tag}: no page error (${real.length ? real[0].slice(0, 200) : 'clean'})`);
      await ctx.close();
    }
  }
}
await browser.close();
console.log('');
console.log(failures ? `revWalk: ${failures} failure(s)` : 'revWalk: green. Club Manager opens, picks, and lists the squad in both seasons at both sizes, with and without motion.');
process.exit(failures ? 1 : 0);
