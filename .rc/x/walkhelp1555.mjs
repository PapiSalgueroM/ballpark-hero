/* Round 1555 review: screenshot BOTH help surfaces of /nba-starting-5 (the page's own How to play button, which
 * opens NbaHowToPlay with the worked example, and the shell's ? icon) at 390x844 and 1280x900, reduced motion on.
 * Database host aborted. Run: BASE=http://localhost:4173 RC_OUT=out node .rc/x/walkhelp1555.mjs */
import pw from '../../scripts/lib/playwrightLoader.mjs';

const { chromium } = pw;
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || '.';
let fails = 0;
const fail = m => { fails += 1; console.error(`  FAIL: ${m}`); };
const browser = await chromium.launch();
for (const [w, h] of [[390, 844], [1280, 900]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: 'reduce', isMobile: w < 500, hasTouch: w < 500 });
  await ctx.route(/supabase\.co/, r => r.abort());
  const page = await ctx.newPage();
  await page.goto(`${BASE}/nba-starting-5`, { waitUntil: 'load' });
  for (const name of [/reject/i, /decline/i, /necessary only/i]) {
    const b = page.getByRole('button', { name }).first();
    if (await b.isVisible().catch(() => false)) { await b.click().catch(() => {}); break; }
  }
  const btns = page.getByRole('button', { name: 'How to play' });
  console.log(`   w${w}: ${await btns.count()} buttons named How to play`);
  await page.locator('button:has-text("How to play")').first().click({ timeout: 15000 });
  await page.waitForTimeout(800);
  const dlg = page.getByRole('dialog').first();
  const text = ((await dlg.innerText().catch(() => '')) || '').replace(/\s+/g, ' ');
  console.log(`   w${w}: text button dialog says: ${text.slice(0, 160)} ...`);
  if (!/Worked Example/i.test(text)) fail(`w${w}: the How to play text button dialog has no worked example`);
  if (!/82 out of 100/.test(text)) fail(`w${w}: the worked example's 82 out of 100 is missing`);
  if (!/1973-74/.test(text) || !/1965-66/.test(text)) fail(`w${w}: the 1965-66 or 1973-74 limit is missing`);
  await page.screenshot({ path: `${OUT}/help-w${w}-text-top.png` });
  await dlg.evaluate(el => { const all = [el, ...el.querySelectorAll('*')]; for (const n of all) if (n.scrollHeight > n.clientHeight + 4) n.scrollTop = n.scrollHeight; }).catch(() => {});
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/help-w${w}-text-end.png` });
  const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (over > 1) fail(`w${w}: sideways scroll ${over}px with the dialog open`);
  await page.keyboard.press('Escape');
  await ctx.close();
}
await browser.close();
if (fails) { console.error(`walkhelp1555: RED, ${fails} failure(s)`); process.exit(1); }
console.log('walkhelp1555: green.');
