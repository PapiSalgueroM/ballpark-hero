// Playwright smoke test for MLB + NHL Front Office boards (2026-08-05)
import { chromium } from './lib/playwrightLoader.mjs';

const BASE = 'http://127.0.0.1:4173';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage();
page.setDefaultTimeout(15000);
const esc = async () => { await page.keyboard.press('Escape'); };

async function clickTab(name) {
  await esc();
  await page.getByRole('button', { name, exact: false }).first().click();
}

// ---------- MLB ----------
await page.goto(`${BASE}/mlb-front-office`, { waitUntil: 'domcontentloaded' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'domcontentloaded' });
if (!(await page.getByText('Take over a baseball front office').isVisible())) throw new Error('MLB pick screen missing');
await page.getByRole('button', { name: /New York Yankees/ }).click();
await page.getByText(/Opening Day of the 2026 season/).waitFor();

// roster tab shows 13 real players incl Judge
if (!(await page.getByText('Aaron Judge').first().isVisible())) throw new Error('Judge missing from NYY roster');
const payroll = await page.getByText(/Payroll \$/).textContent();
console.log('MLB payroll line:', payroll.trim());

// play 3 rounds
await clickTab('Play');
for (let i = 1; i <= 3; i++) {
  await esc();
  await page.getByRole('button', { name: new RegExp(`Play Round ${i}$`) }).click();
  await page.getByText(new RegExp(`Round ${i}: you went \\d+-\\d+`)).waitFor();
}
const rec = await page.getByText(/^Record/).textContent();
if (!/Record \d+-\d+/.test(rec)) throw new Error(`MLB record chip broken: ${rec}`);
console.log('MLB after 3 rounds:', rec.trim());

// standings: 6 divisions x 5 rows
await clickTab('Standings');
for (const d of ['AL East', 'AL Central', 'AL West', 'NL East', 'NL Central', 'NL West']) {
  if (!(await page.getByText(d, { exact: true }).isVisible())) throw new Error(`missing division ${d}`);
}
const mlbRows = await page.locator('div.flex.items-center.justify-between.rounded.px-2').count();
if (mlbRows !== 30) throw new Error(`MLB standings rows ${mlbRows}`);

// free agency renders
await clickTab('Free agency');
await page.getByText(/Free agents \(tax room/).waitFor();
console.log('MLB FRONT OFFICE UI OK');

// ---------- NHL ----------
await page.goto(`${BASE}/nhl-front-office`, { waitUntil: 'domcontentloaded' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'domcontentloaded' });
if (!(await page.getByText('Take over an NHL front office').isVisible())) throw new Error('NHL pick screen missing');
await page.getByRole('button', { name: /Toronto Maple Leafs/ }).click();
await page.getByText(/season drops the puck now/).waitFor();
if (!(await page.getByText('Auston Matthews').first().isVisible())) throw new Error('Matthews missing from TOR roster');
const capline = await page.getByText(/Cap hit \$/).textContent();
console.log('NHL cap line:', capline.trim());

await clickTab('Play');
for (let i = 1; i <= 3; i++) {
  await esc();
  await page.getByRole('button', { name: new RegExp(`Play Round ${i}$`) }).click();
  await page.getByText(new RegExp(`Round ${i}: you went \\d+-\\d+-\\d+`)).waitFor();
}
const nrec = await page.getByText(/^Record/).textContent();
if (!/Record \d+-\d+-\d+/.test(nrec) || !/pts/.test(nrec)) throw new Error(`NHL record chip broken: ${nrec}`);
console.log('NHL after 3 rounds:', nrec.trim());

await clickTab('Standings');
for (const d of ['Atlantic', 'Metropolitan', 'Central', 'Pacific']) {
  if (!(await page.getByText(d, { exact: true }).isVisible())) throw new Error(`missing division ${d}`);
}
const nhlRows = await page.locator('div.flex.items-center.justify-between.rounded.px-2').count();
if (nhlRows !== 32) throw new Error(`NHL standings rows ${nhlRows}`);
// points column shows W-L-OTL · PTS
const firstRow = await page.locator('div.flex.items-center.justify-between.rounded.px-2 span').nth(1).textContent();
if (!/\d+-\d+-\d+ · \d+/.test(firstRow)) throw new Error(`NHL standings row format: ${firstRow}`);

await clickTab('Free agency');
await page.getByText(/Free agents \(cap space/).waitFor();
console.log('NHL FRONT OFFICE UI OK');

await browser.close();
console.log('SMOKE OK');
