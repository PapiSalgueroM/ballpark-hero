/* Reviewer walk (Round 1559, runner lens). The round is dark: the one line a player can see is football.ts's
   /front-office rule ("on the grades alone"). This walk, at 390x844 and 1280x900, reduced motion on and off:
   1. /front-office: open the "?" (How to play), find the trust sentence, screenshot it, measure it is inside the
      dialog's box and the page has no horizontal overflow.
   2. /nhl-front-office: take the first franchise, screenshot the hub, play one round, screenshot; list every JS
      asset fetched and fail if any is an NHL career kit chunk (no route may reach it in 1559).
   3. /front-office: take the first franchise, play to the hub, list assets: the NFL kit must not load on the pick
      screen or the hub of round 1 (Round 1550's lazy rule, held after the lift).
   Database blocked. Exit 0 green, 1 a check red. */
import fs from 'node:fs';
import path from 'node:path';
import pw from '../../scripts/lib/playwrightLoader.mjs';
import { answerConsent } from '../../scripts/lib/answerConsent.mjs';

const { chromium } = pw;
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || '/tmp/rvwalk';
fs.mkdirSync(OUT, { recursive: true });
let red = 0;
const say = (ok, m) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${m}`); if (!ok) red++; };
const wait = ms => new Promise(r => setTimeout(r, ms));
const browser = await chromium.launch();

async function open(w, h, motion, route) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: motion });
  await ctx.route(/supabase\.co/, r => r.abort());
  const page = await ctx.newPage();
  const errors = [], assets = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('request', r => { if (r.url().includes('/assets/')) assets.push(path.basename(new URL(r.url()).pathname)); });
  await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
  await wait(1100);
  await answerConsent(page); await wait(300);
  return { ctx, page, errors, assets };
}
const overflow = page => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

for (const [w, h] of [[390, 844], [1280, 900]]) {
  for (const motion of ['reduce', 'no-preference']) {
    const tag = `${w}-${motion === 'reduce' ? 'rm' : 'm'}`;
    /* 1. the rule behind the NFL page's "?" */
    {
      const { ctx, page, errors } = await open(w, h, motion, '/front-office');
      await page.screenshot({ path: `${OUT}/fo-pick-${tag}.png` });
      const help = page.locator('button[aria-label="How to play"]').first();
      say(await help.count() === 1, `${tag} /front-office: a How to play button`);
      if (await help.count()) {
        await help.click(); await wait(700);
        const dlg = page.locator('[role="dialog"]').first();
        const line = dlg.locator('text=on the grades alone only a full Ownership tree').first();
        const n = await line.count();
        say(n === 1, `${tag} /front-office "?": the trust sentence says "on the grades alone" (${n})`);
        if (n) {
          await line.scrollIntoViewIfNeeded(); await wait(300);
          const lb = await line.boundingBox(), db = await dlg.boundingBox();
          say(!!lb && !!db && lb.x >= db.x - 1 && lb.x + lb.width <= db.x + db.width + 1 && lb.y >= 0 && lb.y + lb.height <= h,
            `${tag} /front-office "?": the sentence sits inside the dialog and the screen (${JSON.stringify(lb)} in ${JSON.stringify(db)})`);
          const fs12 = await line.evaluate(e => parseFloat(getComputedStyle(e).fontSize));
          say(fs12 >= 12, `${tag} /front-office "?": the sentence is ${fs12}px`);
          const dashes = await dlg.evaluate(e => /[–—]/.test(e.innerText));
          say(!dashes, `${tag} /front-office "?": no en or em dash in the dialog`);
          await page.screenshot({ path: `${OUT}/fo-help-${tag}.png` });
        }
        await page.keyboard.press('Escape'); await wait(300);
      }
      say(await overflow(page) <= 1, `${tag} /front-office: no horizontal overflow`);
      say(errors.length === 0, `${tag} /front-office: no page error (${errors.slice(0, 2).join(' | ')})`);
      await ctx.close();
    }
    /* 2. the NHL board, untouched: hub and one round, never the kit */
    {
      const { ctx, page, errors, assets } = await open(w, h, motion, '/nhl-front-office');
      await page.screenshot({ path: `${OUT}/nhl-pick-${tag}.png` });
      await page.locator('.grid button').first().click(); await wait(1000);
      await page.screenshot({ path: `${OUT}/nhl-hub-${tag}.png` });
      const play = page.locator('button:has(div.uppercase)', { hasText: /^Play/i }).first();
      if (await play.count()) { await play.click(); await wait(500); }
      const pr = page.locator('button:has-text("Play Round")').first();
      say(await pr.count() === 1, `${tag} /nhl-front-office: Play Round is reachable`);
      if (await pr.count()) { await pr.click(); await wait(1500); }
      const s = await page.evaluate(() => { const v = JSON.parse(localStorage.getItem('nhl-front-office-save-v1') || 'null'); return v ? { round: v.league.round, phase: v.phase, gm: !!v.gm, keys: v.gm ? Object.keys(v.gm.blocks || {}) : [] } : null; });
      say(!!s && s.round === 2, `${tag} /nhl-front-office: one round played (${JSON.stringify(s)})`);
      say(!s || !s.keys.includes('seat') && !s.keys.includes('xp'), `${tag} /nhl-front-office: the save gains no seat or xp block`);
      await page.screenshot({ path: `${OUT}/nhl-round2-${tag}.png` });
      const kit = assets.filter(a => /CareerKit|GmCareer|gmCareerBind/i.test(a));
      say(kit.length === 0, `${tag} /nhl-front-office: no career kit chunk fetched (${kit.join(', ')})`);
      say(await overflow(page) <= 1, `${tag} /nhl-front-office: no horizontal overflow`);
      say(errors.length === 0, `${tag} /nhl-front-office: no page error (${errors.slice(0, 2).join(' | ')})`);
      if (w === 390 && motion === 'reduce') console.log(`   assets on /nhl-front-office: ${assets.length}`);
      await ctx.close();
    }
    /* 3. the NFL board after the lift: the kit stays lazy on the pick screen and round 1's hub */
    {
      const { ctx, page, errors, assets } = await open(w, h, motion, '/front-office');
      await page.locator('.grid button').first().click(); await wait(1200);
      await page.screenshot({ path: `${OUT}/fo-hub-${tag}.png` });
      const kit = assets.filter(a => /nflCareerKit/i.test(a));
      say(kit.length === 0, `${tag} /front-office: the NFL career kit is not fetched on the pick screen or the first hub (${kit.join(', ')})`);
      say(await overflow(page) <= 1, `${tag} /front-office hub: no horizontal overflow`);
      say(errors.length === 0, `${tag} /front-office hub: no page error (${errors.slice(0, 2).join(' | ')})`);
      await ctx.close();
    }
  }
}
await browser.close();
console.log(red === 0 ? 'rvWalk: all checks green' : `rvWalk: ${red} check(s) red`);
process.exit(red === 0 ? 0 : 1);
