/* Round 1314 step 1 probe for the playGmPress row (critic's correction 1), never committed.
   Walks playGmPress's NFL steps 1 to 4 exactly as the walk does, then says what the screen shows:
   after the walk's three presses, the visible buttons and the draft header; then it drafts until the
   draft is done (bounded by the pick count the screen prints, plus one), presses the draft card's
   Continue, and prints the VISIBLE feed rows of the hub, row by row. If the two step 4 lines are absent
   from the visible rows while the draft has truly finished, that is the slice cause (a DEFECT); if the
   draft never finished in three presses, that is the stale walk cause. */
import pw from './lib/playwrightLoader.mjs';
import path from 'node:path';

const { chromium } = pw;
const BASE = process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173';
const OUT = process.env.RC_OUT || '';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
await ctx.route(/supabase\.co/, r => r.abort());
const page = await ctx.newPage();
const shot = async name => { if (OUT) await page.screenshot({ path: path.join(OUT, name), fullPage: true }).catch(() => {}); };
const buttons = async () => (await page.locator('button:visible').allInnerTexts()).map(t => t.replace(/\s+/g, ' ').trim()).filter(Boolean);
const feedRows = async () => {
  /* The feed card: the bordered card whose children are the feed's <p> rows (feedRows in FrontOfficeBoard.tsx). */
  const cards = page.locator('div.rounded-2xl.border.bg-card.p-3.text-xs');
  const n = await cards.count();
  const out = [];
  for (let i = 0; i < n; i++) {
    const rows = await cards.nth(i).locator(':scope > p').allInnerTexts();
    if (rows.length) out.push(rows);
  }
  return out;
};

await page.goto(`${BASE}/front-office`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await page.locator('.grid button').first().click();
await page.waitForTimeout(900);
await page.locator('[data-gm-press] button').first().click();
await page.waitForTimeout(600);
await page.evaluate(() => {
  const raw = localStorage.getItem('front-office-save-v1');
  if (!raw) return;
  const s = JSON.parse(raw);
  s.trust = 50;
  s.mandate = { tier: 'title', text: 'Win the Super Bowl. Anything less is a failed season upstairs.', winFloor: 0, reqLevel: 4, season: s.league.season };
  for (const p of s.league.teams[s.myTeam].players) p.ovr = 60;
  s.league.teams[s.myTeam].defense = 60;
  localStorage.setItem('front-office-save-v1', JSON.stringify(s));
});
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await page.locator('button:has-text("This week")').click();
await page.waitForTimeout(400);
for (let w = 0; w < 18; w++) {
  const btn = page.locator('button:has-text("Play Week"), button:has-text("Play the final week")');
  if (await btn.count() === 0) break;
  await btn.first().click();
  await page.waitForTimeout(350);
}
console.log(`scrum on the recap: ${await page.locator('[data-gm-press]').count()}`);
await page.locator('[data-gm-press] button:has-text("Ask the room for patience")').click();
await page.waitForTimeout(600);
await page.locator('button:has-text("Go to the draft")').click();
await page.waitForTimeout(700);
const header = async () => (await page.locator('body').innerText()).match(/You hold \d+ picks?|That is your draft done[^.]*\./)?.[0] ?? 'no draft header';
console.log(`A) on the draft screen before any press: ${await header()}`);
for (let k = 0; k < 3; k++) {
  const pick = page.locator('.grid button').first();
  if (await pick.count() === 0) break;
  const label = (await pick.innerText()).replace(/\s+/g, ' ').trim();
  await pick.click();
  await page.waitForTimeout(500);
  console.log(`   press ${k + 1} (the walk's) hit "${label}": ${await header()}`);
}
await page.waitForTimeout(900);
await shot('gmpress-after-three-presses-390.png');
console.log(`B) after the walk's three presses: ${await header()}`);
console.log(`   visible buttons: ${(await buttons()).slice(0, 25).join(' | ')}`);
console.log(`   visible feed rows: ${JSON.stringify(await feedRows())}`);
const body3 = await page.locator('body').innerText();
console.log(`   body holds "The new mandate:" ${body3.includes('The new mandate:')}, "Your ask for patience was heard" ${body3.includes('Your ask for patience was heard')}`);

/* Now draft until the screen says it is done. */
const held = Number((await header()).match(/You hold (\d+)/)?.[1] ?? 0);
for (let k = 0; k <= held && /You hold/.test(await header()); k++) {
  const pick = page.locator('.grid button').first();
  if (await pick.count() === 0) break;
  await pick.click();
  await page.waitForTimeout(500);
}
await page.waitForTimeout(900);
console.log(`C) after drafting on (${held} held at B): ${await header()}`);
console.log(`   visible feed rows on the draft screen: ${JSON.stringify(await feedRows())}`);
const cont = page.locator('[data-draft-continue], button:has-text("Continue to the")');
console.log(`   continue buttons: ${await cont.count()}`);
if (await cont.count()) { await cont.first().click(); await page.waitForTimeout(1500); }
await shot('gmpress-hub-after-continue-390.png');
const body4 = await page.locator('body').innerText();
console.log(`D) after Continue: "You hold" on screen ${/You hold/.test(body4)}, hub tiles ${await page.locator('button:has-text("This week")').count()}`);
const rows = await feedRows();
console.log(`   visible feed rows on the hub (${rows.map(r => r.length).join(', ')} rows):`);
for (const r of rows) for (const [i, t] of r.entries()) console.log(`     ${i}: ${t}`);
console.log(`   body holds "The new mandate:" ${body4.includes('The new mandate:')}, "Your ask for patience was heard" ${body4.includes('Your ask for patience was heard')}`);
await browser.close();
console.log('gmPressProbe: done');
