/* Review walk B for Round 1546 (never committed): does an armed "Yes, hang them up" (or the Start again
   confirm) survive a whole fight? At 390x844 with reduced motion: a 10 fight career with nothing waiting,
   tap Retire (confirm opens), then pick a fight instead, finish camp, fight, Next, answer whatever the
   gap shows, and look at the hub. Supabase is blocked. Screenshots go to RC_OUT. */
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
const tmp = path.join(OUT, 'walkb-bundle.mjs');
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

const browser = await pw.chromium.launch({ args: ['--no-sandbox'] });
const out = {};
for (const which of ['retire', 'reset']) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  await ctx.route(/supabase\.co/, r => r.abort());
  const page = await ctx.newPage();
  await page.goto(`${BASE}/fight-career`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(s => { localStorage.setItem('fight-career-save-v1', s); }, JSON.stringify({ st, phase: 'hub' }));
  await page.reload({ waitUntil: 'networkidle' });
  try { const b = page.getByRole('button', { name: 'Reject all' }); if (await b.isVisible({ timeout: 3000 })) await b.click(); } catch { /* none */ }
  await page.getByText('Armed Andy Walker').first().waitFor({ timeout: 20000 });
  const arm = which === 'retire' ? page.getByRole('button', { name: 'Retire', exact: true }) : page.getByRole('button', { name: 'Start again', exact: true });
  await arm.scrollIntoViewIfNeeded();
  await arm.click();
  const yesName = which === 'retire' ? 'Yes, hang them up' : 'Yes, start again';
  await page.getByRole('button', { name: yesName }).waitFor({ timeout: 5000 });
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
  const yes = page.getByRole('button', { name: yesName });
  const still = await yes.count();
  if (still) await yes.scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(OUT, `armed-${which}-after-fight.png`) });
  const body = await page.locator('body').innerText();
  const fightsLine = (body.match(/\d+-\d+(-\d+)?/) || [''])[0];
  out[which] = { stillArmed: still, record: fightsLine, onHub: (await page.getByRole('button', { name: 'Retire', exact: true }).count()) > 0 };
  console.log(`   ${which}: back on the hub ${out[which].onHub}, the "${yesName}" confirm still open after a whole fight: ${still}`);
  await ctx.close();
}
await browser.close();
fs.writeFileSync(path.join(OUT, 'walkb-1546.json'), JSON.stringify(out, null, 2));
console.log(`walk1546b: retire confirm survived a fight ${out.retire?.stillArmed ? 'YES' : 'no'}, start again confirm survived ${out.reset?.stillArmed ? 'YES' : 'no'}`);
