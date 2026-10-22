// Round 1547 walk: NFL and NBA Conquest arcade on a served build, a phone, the database host blocked.
// Opens Arcade, reads the first visit help (the power up line), closes it, opens Free Agency, picks a team
// and reads the market's empty state. Never committed. Prints FIRED style lines only for a red.
import fs from 'node:fs';
import path from 'node:path';
import pw from '../../scripts/lib/playwrightLoader.mjs';
const { chromium, devices } = pw;
const BASE = process.env.BASE ?? 'http://localhost:4173';
const OUT = process.env.RC_OUT ?? path.join(process.cwd(), '.tmp-fx');
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
let red = 0;
const bad = m => { red++; console.log(`RED ${m}`); };
for (const route of ['/conquest', '/conquest-nba']) {
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  await ctx.route(/supabase\.co/, r => r.abort());
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 160)));
  await page.goto(`${BASE}${route}`, { waitUntil: 'load', timeout: 45000 });
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: /Arcade/ }).first().click();
  await page.waitForTimeout(800);
  const help = await page.locator('[role="dialog"]').first().innerText().catch(() => '');
  if (!/Sign a Player: Take someone a fallen team left behind, or call a retired great back/.test(help)) bad(`${route}: the first visit help has no Sign a Player line`);
  if (/Free Agent: Sign a top available player/.test(help)) bad(`${route}: the help still sells a top free agent`);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  await page.locator('summary', { hasText: 'Free Agency' }).first().click();
  await page.waitForTimeout(300);
  await page.locator('select[aria-label="Pick your team"]').selectOption({ index: 1 });
  await page.waitForTimeout(500);
  const panel = await page.locator('details', { hasText: 'Free Agency' }).first().innerText();
  if (!/Nobody's on the market yet\. When a team falls, its players land here\./.test(panel)) bad(`${route}: the market's empty state is missing`);
  for (const name of ['LeBron James', 'Justin Simmons', 'Demaryius Thomas', 'Stefon Diggs']) if (panel.includes(name)) bad(`${route}: the Free Agency panel deals ${name}`);
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  if (width > 390) bad(`${route}: the page scrolls sideways (${width}px)`);
  if (errors.length) bad(`${route}: ${errors.length} page errors, first: ${errors[0]}`);
  await page.screenshot({ path: path.join(OUT, `walk${route.replace(/\//g, '-')}.png`), fullPage: false });
  console.log(`${route}: help ok=${/Sign a Player/.test(help)}, panel ${panel.replace(/\s+/g, ' ').slice(0, 140)}`);
  await ctx.close();
}
await browser.close();
console.log(red ? `walk1547: ${red} red` : 'walk1547: green, both routes');
process.exit(red ? 1 : 0);
