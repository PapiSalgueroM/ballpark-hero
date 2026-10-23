// Round 1542 fix 2 probe (sent to a runner as .rc/x/helpWalk.mjs): the /front-office "?" panel still lists the
// season numbers' rules now that the page fetches their words (src/lib/nflSeasonRules.ts). The database and ad
// hosts are blocked. Usage: BASE=http://localhost:4173 node .rc/x/helpWalk.mjs   (exit 0 green, 1 red)
import pw from '../../scripts/lib/playwrightLoader.mjs';
const { chromium } = pw;
const BASE = process.env.BASE || 'http://localhost:4173';
const WANT = [
  'Who scored: every touchdown of a game goes to one of',
  'Sacks come from the pass rush',
  'For example: a quarterback rated 85 throws',
  'Getting fired does not end the save.',
];
const browser = await chromium.launch();
let bad = 0;
for (const vp of [{ width: 390, height: 844 }, { width: 1280, height: 900 }]) {
  const ctx = await browser.newContext({ viewport: vp });
  const page = await ctx.newPage();
  await page.route(/supabase\.co/, r => r.abort());
  await page.route(/googlesyndication|doubleclick|googletagmanager|google-analytics|adservice/, r => r.abort());
  const rulesChunk = [];
  page.on('response', r => { if (/nflSeasonRules/.test(r.url())) rulesChunk.push(r.url().split('/').pop()); });
  await page.goto(`${BASE}/front-office`, { waitUntil: 'networkidle' });
  const consent = page.locator('button:has-text("Reject"), button:has-text("Decline"), button:has-text("Only necessary")');
  if (await consent.count()) { await consent.first().click().catch(() => {}); await page.waitForTimeout(300); }
  const trigger = page.locator('div.max-w-4xl.z-10 button[aria-label="How to play"]').first();
  await trigger.waitFor({ state: 'visible', timeout: 20000 });
  await trigger.click();
  await page.waitForTimeout(600);
  const text = await page.locator('body').innerText();
  const missing = WANT.filter(w => !text.includes(w));
  const line = `${vp.width}: the rules chunk fetched ${rulesChunk.length ? rulesChunk.join(', ') : 'none named so (it may share a chunk)'}; ${WANT.length - missing.length} of ${WANT.length} rule lines in the open panel${missing.length ? `; missing: ${missing.join(' | ')}` : ''}`;
  console.log(line);
  if (missing.length) bad += 1;
  await ctx.close();
}
await browser.close();
console.log(bad ? `helpWalk: RED, ${bad} of 2 sizes` : 'helpWalk: green, 2 of 2 sizes');
process.exit(bad ? 1 : 0);
