/* Reviewer walk 2, Round 1553: an old save (base wording) for a board this round rewrote, loaded on the branch.
   The base and the branch write the same save shape (useDailyPuzzle is untouched), so a base save is the
   branch's own save with the base's category text in its 'ok' action. The day is 2026-12-31, which the
   fallback pool deals puzzle-151 on, at base and at head (0 of 800 days differ). supabase.co is aborted. */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || '/tmp/walk-out';
fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const OLD_CAT = 'Current Bayern Munich stars 2025-26';
const NEW_CAT = 'Played for Bayern Munich in 2025-26';
const BAYERN = ['Harry Kane', 'Michael Olise', 'Luis Díaz', 'Dayot Upamecano'];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
await ctx.route(/supabase\.co/, r => r.abort());
await ctx.route(u => !u.href.startsWith(BASE), r => r.abort());
await ctx.addInitScript(() => { try { localStorage.setItem('connections-rules-seen', '1'); } catch {} });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e).slice(0, 200)));
await page.clock.setFixedTime(new Date('2026-12-31T17:00:00Z'));
const out = { notes: [] };
const click = n => page.getByRole('button', { name: n, exact: true }).first().click();
const submit = async () => { await page.getByRole('button', { name: 'Submit', exact: true }).click(); await sleep(900); };
try {
  await page.goto(`${BASE}/connections`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Harry Kane', exact: true }).waitFor({ timeout: 20000 });
  const rej = page.getByRole('button', { name: 'Reject all', exact: true });
  if (await rej.count()) await rej.first().click().catch(() => {});
  for (const n of BAYERN) await click(n);
  await submit();
  const key = await page.evaluate(() => Object.keys(localStorage).find(k => k.startsWith('connections-daily-')));
  const saved = await page.evaluate(k => localStorage.getItem(k), key);
  out.key = key;
  out.headSave = saved;
  if (!saved || !saved.includes(NEW_CAT)) throw new Error(`the head save does not carry "${NEW_CAT}": ${saved}`);
  /* the base would have written the same bytes with its own category text */
  const baseSave = saved.replace(NEW_CAT, OLD_CAT);
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [key, baseSave]);
  out.baseSave = baseSave;
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Ryan Giggs', exact: true }).waitFor({ timeout: 20000 });
  await sleep(800);
  await page.screenshot({ path: path.join(OUT, 'oldsave-1loaded.png') });
  out.bayernTilesBack = (await Promise.all(BAYERN.map(n => page.getByRole('button', { name: n, exact: true }).count()))).every(c => c > 0);
  out.solvedShownAfterLoad = await page.locator('p.uppercase').allTextContents();
  /* the player solves Bayern again, then Manchester City and the Ballon d'Or: what does the game say? */
  for (const g of [BAYERN, ['Antoine Semenyo', 'Jérémy Doku', 'Tijjani Reijnders', "Nico O'Reilly"], ['Lionel Messi', 'Kaká', 'Ousmane Dembélé', 'Luka Modrić']]) {
    for (const n of g) await click(n);
    await submit();
  }
  await sleep(1000);
  await page.screenshot({ path: path.join(OUT, 'oldsave-2after3.png'), fullPage: false });
  out.solvedShownAfter3 = await page.locator('p.uppercase').allTextContents();
  out.wonText = (await page.locator('body').innerText()).match(/You found all connections!|Solved with [0-9] lives? remaining/g);
  out.finalSave = await page.evaluate(k => localStorage.getItem(k), key);
} catch (e) {
  out.notes.push(`walk error: ${String(e).slice(0, 300)}`);
  await page.screenshot({ path: path.join(OUT, 'oldsave-error.png') }).catch(() => {});
}
out.pageErrors = errors;
fs.writeFileSync(path.join(OUT, 'oldsave.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out));
await browser.close();
console.log(out.notes.length ? 'walkSave1553: error' : 'walkSave1553: played');
process.exit(out.notes.length ? 1 : 0);
