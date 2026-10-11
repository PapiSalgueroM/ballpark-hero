// Reviewer's probe on the BUILT site (dist), 390 by 844: after a push whose wheel has been seen, does a reload
// keep the push spent? It loads the named saves extTalk and faTalk of the committed board recording, pushes once,
// skips and continues the wheel, reloads, and reads whether the push control is still disabled; if it is not, it
// presses it and reads whether a second push was taken. Supabase is blocked. A probe: it prints, exit 0.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const ROOT = process.cwd();
const PORT = Number(process.env.PORT || 4633);
const BASE = `http://127.0.0.1:${PORT}`;
const SPORTS = { nfl: ['/nfl-my-career', 'nfl-my-career-save-v1'], nba: ['/nba-my-career', 'nba-my-career-save-v1'], mlb: ['/mlb-my-career', 'mlb-my-career-save-v1'], nhl: ['/nhl-my-career', 'nhl-my-career-save-v1'] };
const fixture = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/usBoardFixture.json'), 'utf8'));
const server = spawn(process.execPath, [path.join(ROOT, 'scripts/lib/hostLikeServer.mjs'), path.join(ROOT, 'dist'), String(PORT)], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 1500));
const browser = await pw.chromium.launch({ args: ['--no-sandbox', '--no-proxy-server'] });
const out = [];
let kept = 0, lost = 0, na = 0;
try {
  for (const slug of Object.keys(SPORTS)) for (const kind of ['extension', 'freeagency']) {
    const [route, key] = SPORTS[slug];
    const raw = fixture.sports[slug].saves[kind === 'extension' ? 'extTalk' : 'faTalk'];
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await ctx.addInitScript(([k, v, r]) => {
      let a = 20261011;
      Math.random = () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
      if (!sessionStorage.getItem('probe-seeded')) {
        sessionStorage.setItem('probe-seeded', '1');
        localStorage.setItem('cookie-consent', 'essential');
        localStorage.setItem(k, v);
        localStorage.setItem('rules-gate-seen:' + r, '1');
        for (const s of ['nba', 'nfl', 'mlb', 'nhl']) localStorage.setItem(`seasonCentre:help:${s}`, '1');
      }
    }, [key, raw, route]);
    await ctx.route('**://*.supabase.co/**', r => r.abort());
    const page = await ctx.newPage();
    const tag = `${slug} ${kind}`;
    try {
      await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      const root = kind === 'extension' ? '[data-extension-talk]' : '[data-fa-window]';
      const push = kind === 'extension' ? '[data-ext-push]' : '[data-fa-push="0"]';
      await page.locator(root).waitFor({ state: 'visible', timeout: 30000 });
      const state = sel => page.evaluate(q => { const b = document.querySelector(q); return b ? (b.disabled ? 'disabled' : 'enabled') : 'absent'; }, sel);
      const talkOf = () => page.evaluate(k => JSON.parse(localStorage.getItem(k) || 'null')?.contractTalk ?? null, key);
      const click = sel => page.evaluate(q => { const b = document.querySelector(q); if (!b) return false; b.click(); return true; }, sel);
      const first = await state(push);
      if (first !== 'enabled') { na += 1; out.push(`${tag}: no push to make on this save (push control ${first})`); await ctx.close(); continue; }
      await click(push);
      await page.locator('[data-market-wheel]').waitFor({ state: 'visible', timeout: 15000 });
      const result = (await talkOf())?.wheel?.result;
      await click('[data-market-skip]');
      await page.locator('[data-market-continue]').waitFor({ state: 'visible', timeout: 15000 });
      await click('[data-market-continue]');
      await page.locator('[data-market-wheel]').waitFor({ state: 'hidden', timeout: 15000 });
      const before = await state(push);
      const bytes = await page.evaluate(k => localStorage.getItem(k), key);
      await page.reload({ waitUntil: 'domcontentloaded' });
      const back = await page.locator(root).waitFor({ state: 'visible', timeout: 15000 }).then(() => true, () => false);
      const after = back ? await state(push) : 'no talk on screen';
      let second = 'not tried';
      if (after === 'enabled') {
        await click(push);
        const again = await page.locator('[data-market-wheel]').waitFor({ state: 'visible', timeout: 5000 }).then(() => true, () => false);
        const now = await page.evaluate(k => localStorage.getItem(k), key);
        second = again && now !== bytes ? `TAKEN: a second wheel opened and the save changed (result ${(await talkOf())?.wheel?.result})` : `not taken (wheel ${again}, save changed ${now !== bytes})`;
      }
      if (before === 'absent') { na += 1; }
      else if (after === 'disabled') kept += 1; else lost += 1;
      out.push(`${tag}: first push result ${result}; push control after the wheel ${before}; after a reload ${after}; second push ${second}`);
    } catch (e) { na += 1; out.push(`${tag}: probe error ${String(e).slice(0, 160)}`); }
    await ctx.close();
  }
} finally { await browser.close(); try { server.kill(); } catch { /* gone */ } }
for (const l of out) console.log(l);
console.log(`pushAgain: the push stayed spent across a reload in ${kept} journeys, came back in ${lost}, not applicable in ${na}`);
process.exit(0);
