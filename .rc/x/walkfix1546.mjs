/* Round 1546 fix walk (never committed). Built from the run reviewer's walk B.
   At 390x844 with reduced motion and Supabase blocked:
   1 an armed Retire or Start again does not survive picking a fight, a camp,
     the fight and the gap (exit 1 if either is still open back on the hub);
   2 the Retire button and its confirm buttons are at least 44 px tall;
   3 the past fighters list with long names, Light Heavyweight and long tiers
     shows "walked away" in full on every row (no clipped line, no sideways
     page scroll).
   Screenshots go to RC_OUT. */
import fs from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const ROOT = process.cwd();
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || path.join(ROOT, '.tmp-fx');
const bundled = await build({
  stdin: { contents: "export * as ff from './src/lib/fightCareerLifeFlow';\nexport * as fl from './src/lib/fightCareerLife';\nexport * as fr from './src/lib/fightCareerRivalry';\n", resolveDir: ROOT, loader: 'ts' },
  bundle: true, write: false, format: 'esm', platform: 'node', tsconfig: path.join(ROOT, 'tsconfig.app.json'),
});
const tmp = path.join(OUT, 'walkfix-bundle.mjs');
fs.writeFileSync(tmp, bundled.outputFiles[0].text);
const { ff, fl, fr } = await import(`file://${tmp}`);
function clearGap(st0) {
  let st = st0;
  for (let g = 0; g < 24; g += 1) {
    const step = ff.nextLifeStep(st);
    if (!step) break;
    if (step.kind === 'beat') st = fr.dismissFightRivalryEvent(st) ?? st;
    else if (step.kind === 'choice') st = fr.answerFightRivalryChoice(st, fr.neutralRivalryChoice(step.card.id))?.state ?? st;
    else st = fl.answerLifeCard(st, step.card.options.findIndex(o => o.neutral))?.state ?? st;
  }
  return st;
}
let st = ff.lifeNewCareer('Armed Andy Walker', 'welter', 'outboxer', 'allround', 'family', 'walkb-1546');
for (let i = 0; i < 10; i += 1) st = clearGap(ff.lifeTakeFight(ff.lifeRunCamp(clearGap(st), { conditioning: 2, power: 2, defence: 1, speed: 1 }), clearGap(st).offers[0].id, ['box', 'press', 'counter']).state);
st = clearGap(st);

let failures = 0;
const fail = (m) => { failures += 1; console.log(`   FAIL ${m}`); };
const ok = (m) => console.log(`   ok   ${m}`);
const errors = [];
const browser = await pw.chromium.launch({ args: ['--no-sandbox'] });
async function open(seed) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  await ctx.route(/supabase\.co/, r => r.abort());
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(`${BASE}/fight-career`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(seed, null);
  await page.reload({ waitUntil: 'networkidle' });
  try { const b = page.getByRole('button', { name: 'Reject all' }); if (await b.isVisible({ timeout: 3000 })) await b.click(); } catch { /* none */ }
  return { ctx, page };
}
const height = async (loc) => (await loc.boundingBox())?.height ?? 0;

for (const which of ['retire', 'reset']) {
  const save = JSON.stringify({ st, phase: 'hub' });
  const { ctx, page } = await open(new Function(`localStorage.setItem('fight-career-save-v1', ${JSON.stringify(save)});`));
  await page.getByText('Armed Andy Walker').first().waitFor({ timeout: 20000 });
  const arm = which === 'retire' ? page.getByRole('button', { name: 'Retire', exact: true }) : page.getByRole('button', { name: 'Start again', exact: true });
  await arm.scrollIntoViewIfNeeded();
  if (which === 'retire') {
    const h = await height(arm);
    if (h < 44) fail(`the Retire button is ${h} px tall`); else ok(`the Retire button is ${h} px tall`);
  }
  await arm.click();
  const yesName = which === 'retire' ? 'Yes, hang them up' : 'Yes, start again';
  await page.getByRole('button', { name: yesName }).waitFor({ timeout: 5000 });
  if (which === 'retire') {
    const hs = [await height(page.getByRole('button', { name: 'Yes, hang them up' })), await height(page.getByRole('button', { name: 'Not yet' }))];
    if (hs.some(h => h < 44)) fail(`the retire confirm buttons are ${hs.join(' and ')} px tall`); else ok(`the retire confirm buttons are ${hs.join(' and ')} px tall`);
  }
  await page.locator('button', { hasText: ' rounds' }).first().click();
  await page.getByRole('button', { name: 'Finish camp' }).click();
  const box = page.getByRole('checkbox');
  if (await box.count() && await box.first().isChecked()) await box.first().uncheck();
  await page.getByRole('button', { name: 'Fight', exact: true }).click();
  const skip = page.getByRole('button', { name: 'Skip to the decision' });
  if (await skip.isVisible({ timeout: 3000 }).catch(() => false)) await skip.click();
  await page.getByRole('button', { name: /^(Next|See how you are remembered)$/ }).click({ timeout: 20000 });
  for (let k = 0; k < 8; k += 1) {
    await page.waitForTimeout(400);
    if (await page.getByRole('button', { name: 'Retire', exact: true }).count()) break;
    const noted = page.getByRole('button', { name: 'Noted' });
    if (await noted.count()) { await noted.click(); continue; }
    const opt = page.locator('button.min-h-\\[52px\\]');
    if (await opt.count()) { await opt.first().click(); continue; }
  }
  const onHub = (await page.getByRole('button', { name: 'Retire', exact: true }).count()) > 0;
  const still = await page.getByRole('button', { name: yesName }).count();
  await page.screenshot({ path: path.join(OUT, `fix-armed-${which}-after-fight.png`) });
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('fight-career-save-v1') || 'null'));
  console.log(`   ${which}: back on the hub ${onHub}, fights on the save ${saved?.st?.fightNo}, "${yesName}" still open ${still}`);
  if (!onHub || saved?.st?.fightNo !== 11) fail(`${which}: the walk did not get back to the hub after fight 11`);
  else if (still) fail(`${which}: the "${yesName}" confirm survived a whole fight`);
  else ok(`${which}: the confirm was gone when the hub came back`);
  await ctx.close();
}

/* The past fighters list with the longest labels the game can draw. */
const tiers = ['All Time Great', 'Hall of Famer', 'All Time Great', 'Hall of Famer', 'All Time Great', 'Hall of Famer', 'All Time Great', 'Hall of Famer'];
const past = tiers.map((tier, k) => ({
  key: `walk${k}`, name: `Maximiliano Bartholomew ${k}`, weight: k % 2 ? 'lightheavy' : 'feather',
  wins: 30 + k, losses: 2, draws: 1, kos: 20, titles: 2 + k, defences: 4, tier, score: 90 + (k % 9), chose: true,
}));
{
  const { ctx, page } = await open(new Function(`localStorage.removeItem('fight-career-save-v1'); localStorage.setItem('fight-career-past-v1', ${JSON.stringify(JSON.stringify(past))});`));
  await page.getByText('Your past fighters').waitFor({ timeout: 20000 });
  await page.getByText('Your past fighters').scrollIntoViewIfNeeded();
  const rows = await page.evaluate(() => {
    const head = [...document.querySelectorAll('p')].find(p => p.textContent === 'Your past fighters');
    const lines = head ? [...head.parentElement.querySelectorAll('p.text-\\[11px\\]')] : [];
    return { n: lines.length, clipped: lines.filter(p => p.scrollWidth > p.clientWidth + 1).length, full: lines.filter(p => p.innerText.includes('walked away')).length, pageWide: document.documentElement.scrollWidth };
  });
  await page.screenshot({ path: path.join(OUT, 'fix-past8-phone.png'), fullPage: true });
  console.log(`   past list: ${rows.n} rows, ${rows.clipped} clipped, ${rows.full} show "walked away" in full, page ${rows.pageWide} px wide`);
  if (rows.n !== 8 || rows.clipped || rows.full !== 8 || rows.pageWide > 390) fail('the past list clips a line or scrolls sideways on a phone');
  else ok('every past fighter row shows its whole line at 390 px');
  await ctx.close();
}
await browser.close();
if (errors.length) fail(`page errors: ${errors.slice(0, 3).join(' | ')}`);
console.log(failures ? `walkfix1546: ${failures} failure(s)` : 'walkfix1546: all checks passed');
process.exit(failures ? 1 : 0);
