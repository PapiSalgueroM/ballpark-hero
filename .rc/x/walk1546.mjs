/* Review walk for Round 1546 (never committed). Run on the runner as: node .rc/x/walk1546.mjs
   with BASE set by #!serve. Supabase is blocked in every context. Four combos: 390x844 and
   1280x900, reduced motion on and off. Fight Career: the shut door at 3 fights, Start again
   behind its confirm, a life layer career of 10 fights retired through the UI, the verdict,
   a reload (no second completion), the past list, and a long past list at setup. Fight Gym
   and Fight Promoter: an old shape save holding two men under one id, loaded in the browser,
   and one release letting exactly one man go. Screenshots and walk-1546r.json go to RC_OUT. */
import fs from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const ROOT = process.cwd();
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || path.join(ROOT, '.tmp-fx');
const fails = [];
const notes = [];
const check = (cond, msg) => { if (!cond) fails.push(msg); console.log(`   ${cond ? 'ok  ' : 'FAIL'} ${msg}`); };
const note = (m) => { notes.push(m); console.log(`   note ${m}`); };

const bundled = await build({
  stdin: { contents: "export * as fc from './src/lib/fightCareer';\nexport * as ff from './src/lib/fightCareerLifeFlow';\nexport * as fl from './src/lib/fightCareerLife';\nexport * as fr from './src/lib/fightCareerRivalry';\nexport * as fi from './src/lib/fightCareerInbox';\nexport * as gym from './src/lib/fightGym';\nexport * as pro from './src/lib/fightPromoter';\n", resolveDir: ROOT, loader: 'ts' },
  bundle: true, write: false, format: 'esm', platform: 'node', tsconfig: path.join(ROOT, 'tsconfig.app.json'),
});
const tmp = path.join(OUT, 'walk-bundle.mjs');
fs.writeFileSync(tmp, bundled.outputFiles[0].text);
const { fc, ff, fl, fr, fi, gym, pro } = await import(`file://${tmp}`);
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
const PLAN = { conditioning: 2, power: 2, defence: 1, speed: 1 };
const TAC = ['box', 'press', 'counter'];

function lifeCareer(name, n) {
  let st = ff.lifeNewCareer(name, 'welter', 'outboxer', 'allround', 'family', `walk-${name}`);
  for (let i = 0; i < n && !st.retired; i += 1) {
    const r = ff.lifeTakeFight(ff.lifeRunCamp(st, PLAN), st.offers[0].id, TAC);
    st = r.state;
  }
  return st;
}
const early = JSON.stringify({ st: lifeCareer('Early Eddie Walker', 3), phase: 'hub' });
const ten = lifeCareer('Walk Away Joe', fc.RETIRE_MIN_FIGHTS);
note(`ten fight save: fightNo ${ten.fightNo}, retired ${ten.retired}, pending cards ${ten.life.pending.length}, rivalry choice ${!!ten.life.pendingRivalryChoice}, beat ${!!ten.life.pendingRivalryEvent}`);
const tenSave = JSON.stringify({ st: ten, phase: 'hub' });

/* An old shape gym: "f" ids, no counter, and a man signed after a reload wearing the first man's id. */
const og = gym.newGym('Old Shape Gym', 'walk-old-gym');
og.roster.forEach((f, i) => { f.id = `f${i + 1}`; });
og.prospects.forEach((p, i) => { p.fighter.id = `f${i + 3}`; });
const dupe = og.prospects.shift().fighter;
dupe.id = 'f1';
og.roster.push(dupe);
delete og.nextFighterNo;
const gymSave = JSON.stringify({ g: og });
const op = pro.newPromoter('Old Shape Promotions', 'walk-old-promo');
op.pool.forEach((f, i) => { f.id = `f${i + 1}`; });
op.pool[op.pool.length - 1].id = 'f2';
delete op.nextFighterNo;
const proSave = JSON.stringify({ st: op });

const COMBOS = [
  { w: 390, h: 844, rm: 'reduce', tag: 'phone-rm' },
  { w: 390, h: 844, rm: 'no-preference', tag: 'phone' },
  { w: 1280, h: 900, rm: 'reduce', tag: 'desk-rm' },
  { w: 1280, h: 900, rm: 'no-preference', tag: 'desk' },
];
const browser = await pw.chromium.launch({ args: ['--no-sandbox'] });
const shot = (page, name, full = false) => page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: full });
const sideways = (page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
const comps = (page) => page.evaluate(() => (localStorage.getItem('dukb-local-completions') || '').split('fight-career').length - 1);
async function rejectCookies(page) {
  try { const b = page.getByRole('button', { name: 'Reject all' }); if (await b.isVisible({ timeout: 3000 })) await b.click(); } catch { /* no banner */ }
}
async function open(page, route, key, value) {
  await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(([k, v]) => { for (const x of Object.keys(localStorage)) if (!x.startsWith('dukb-cookie') && !x.includes('consent')) localStorage.removeItem(x); if (k) localStorage.setItem(k, v); }, [key, value]);
  await page.reload({ waitUntil: 'networkidle' });
}

const measures = {};
for (const c of COMBOS) {
  console.log(`\n${c.tag}`);
  const ctx = await browser.newContext({ viewport: { width: c.w, height: c.h }, reducedMotion: c.rm });
  await ctx.route(/supabase\.co/, r => r.abort());
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const m = {};

  /* 1. The shut door at 3 fights, and Start again behind its confirm. */
  await open(page, '/fight-career', 'fight-career-save-v1', early);
  await page.getByText('Early Eddie Walker').first().waitFor({ timeout: 20000 });
  if (c.tag === 'phone') await shot(page, `fc-banner-${c.tag}`);
  await rejectCookies(page);
  const retire = page.getByRole('button', { name: 'Retire', exact: true });
  await retire.scrollIntoViewIfNeeded();
  check(await retire.isDisabled(), `${c.tag}: Retire is shut at 3 fights`);
  const body1 = await page.locator('body').innerText();
  check(body1.includes(`after ${fc.RETIRE_MIN_FIGHTS} fights, ${fc.RETIRE_MIN_FIGHTS - 3} to go`), `${c.tag}: the shut card says how many to go`);
  await shot(page, `fc-early-${c.tag}`);
  await page.getByRole('button', { name: 'Start again', exact: true }).click();
  const keep = page.getByRole('button', { name: 'Keep this career' });
  await keep.waitFor({ timeout: 5000 });
  const kb = await keep.boundingBox();
  m.keepY = kb && Math.round(kb.y);
  check(!!kb && kb.y >= 0 && kb.y + kb.height <= c.h + 1, `${c.tag}: the Start again confirm is on screen (y ${m.keepY})`);
  await shot(page, `fc-startagain-${c.tag}`);
  await keep.click();
  check((await page.locator('body').innerText()).includes('Early Eddie Walker'), `${c.tag}: Keep this career keeps it`);

  /* 2. A life layer career at the gate: what the hub shows, then retire through the UI. */
  await open(page, '/fight-career', 'fight-career-save-v1', tenSave);
  await rejectCookies(page);
  await page.getByText('Walk Away Joe').first().waitFor({ timeout: 20000 });
  await shot(page, `fc-gate-hub-${c.tag}`, true);
  const r2 = page.getByRole('button', { name: 'Retire', exact: true });
  m.retireVisible = await r2.count();
  note(`${c.tag}: Retire buttons on the hub with the life layer as saved: ${m.retireVisible}`);
  /* A gap step shows alone, as it always has; the player answers it first. The engine answers it neutrally here. */
  if (m.retireVisible === 0) {
    await open(page, '/fight-career', 'fight-career-save-v1', JSON.stringify({ st: clearGap(ten), phase: 'hub' }));
    await rejectCookies(page);
    await page.getByText('Walk Away Joe').first().waitFor({ timeout: 20000 });
    await shot(page, `fc-gate-hub-clear-${c.tag}`, true);
  }
  await r2.scrollIntoViewIfNeeded();
  check(await r2.isEnabled(), `${c.tag}: Retire is open at ${fc.RETIRE_MIN_FIGHTS} fights`);
  const before = await comps(page);
  await r2.click();
  const yes = page.getByRole('button', { name: 'Yes, hang them up' });
  await yes.waitFor({ timeout: 5000 });
  const yb = await yes.boundingBox();
  m.yesY = yb && Math.round(yb.y);
  check(!!yb && yb.y >= 0 && yb.y + yb.height <= c.h + 1, `${c.tag}: the retire confirm is on screen (y ${m.yesY})`);
  await shot(page, `fc-confirm-${c.tag}`);
  await yes.click();
  await page.getByText('Final verdict', { exact: true }).waitFor({ timeout: 10000 });
  const verdict = await page.locator('body').innerText();
  check(verdict.includes(`He called time himself after ${fc.RETIRE_MIN_FIGHTS} fights.`), `${c.tag}: the verdict says he called it`);
  await page.waitForTimeout(800);
  await shot(page, `fc-verdict-${c.tag}`);
  await shot(page, `fc-verdict-full-${c.tag}`, true);
  m.sideVerdict = await sideways(page);
  check(m.sideVerdict <= 0, `${c.tag}: no sideways scroll on the verdict (${m.sideVerdict})`);
  const after = await comps(page);
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByText('Final verdict', { exact: true }).waitFor({ timeout: 20000 });
  await page.waitForTimeout(800);
  const afterReload = await comps(page);
  m.completions = [before, after, afterReload];
  note(`${c.tag}: local completion mentions before, after retire, after reload: ${m.completions.join(', ')}`);
  check(afterReload === after, `${c.tag}: a reload of the verdict pays nothing again`);
  await page.getByRole('button', { name: /Start a new fighter/ }).click();
  await page.getByText('Your past fighters', { exact: true }).waitFor({ timeout: 10000 });
  await page.getByText('Your past fighters', { exact: true }).scrollIntoViewIfNeeded();
  await shot(page, `fc-past1-${c.tag}`);
  check((await page.locator('body').innerText()).includes('walked away'), `${c.tag}: the past list says he walked away`);

  /* 3. A full past list of long names at setup. */
  const sample = fc.pastFighterOf(fc.retireByChoice(ten) ?? ten);
  const long = Array.from({ length: 8 }, (_, k) => ({ ...sample, key: `walk-${k}`, name: `Maximiliano Alessandro Vandenberghe-Okonkwo ${k}`, weight: fc.WEIGHT_CLASSES[k].id, titles: k % 3, chose: k % 2 === 0, tier: ['Footnote', 'Hall of Famer', 'All Time Great', 'Journeyman'][k % 4] }));
  await open(page, '/fight-career', 'fight-career-past-v1', JSON.stringify(long));
  await rejectCookies(page);
  await page.getByText('Your past fighters', { exact: true }).waitFor({ timeout: 20000 });
  await page.getByText('Your past fighters', { exact: true }).scrollIntoViewIfNeeded();
  await shot(page, `fc-past8-${c.tag}`);
  await shot(page, `fc-past8-full-${c.tag}`, true);
  m.sideSetup = await sideways(page);
  check(m.sideSetup <= 0, `${c.tag}: no sideways scroll with eight long past names (${m.sideSetup})`);
  m.setupHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  const tp = await page.getByRole('button', { name: 'Turn professional' }).boundingBox();
  m.turnProY = tp && Math.round(tp.y);
  note(`${c.tag}: setup page height ${m.setupHeight}, Turn professional at y ${m.turnProY}`);

  /* 4. Old shape gym and promotion saves, loaded in the browser. */
  if (c.tag === 'phone-rm' || c.tag === 'desk') {
    await open(page, '/fight-gym', 'fight-gym-save-v1', gymSave);
    await rejectCookies(page);
    const letGo = page.getByRole('button', { name: 'Let go', exact: true });
    await letGo.first().waitFor({ timeout: 20000 });
    const n0 = await letGo.count();
    const labels = await page.locator('p', { hasText: ' · age ' }).allInnerTexts();
    const wantClass = fc.weightById(gym.guessWeight({ ...og.roster[0] })).label;
    check(labels.length >= 3 && labels[2].startsWith(wantClass), `${c.tag}: the repaired man still shows the division he showed before the fix (${wantClass}; "${labels[2]}")`);
    note(`${c.tag}: gym roster cards ${n0}; first card line "${labels[0]}", third "${labels[2]}"`);
    check(n0 === 3, `${c.tag}: the old gym shows its three men (${n0})`);
    await shot(page, `gym-old-${c.tag}`, true);
    await letGo.nth(2).click();
    await page.getByRole('button', { name: 'Yes, let him go' }).click();
    await page.waitForTimeout(500);
    const n1 = await letGo.count();
    check(n1 === 2, `${c.tag}: letting the man who shared an id go lets exactly one man go (${n0} to ${n1})`);
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('fight-gym-save-v1') || '{}'));
    const ids = (saved.g?.roster || []).map(f => f.id);
    check(ids.length === 2 && ids[0] === 'f1' && new Set(ids).size === 2, `${c.tag}: the first holder kept f1 and the save is unique (${ids.join(',')})`);
    await shot(page, `gym-old-after-${c.tag}`, true);
    await open(page, '/fight-promoter', 'fight-promoter-save-v1', proSave);
    await rejectCookies(page);
    await page.waitForTimeout(1500);
    await shot(page, `promo-old-${c.tag}`, true);
  }
  m.errors = errors.slice(0, 3);
  check(errors.length === 0, `${c.tag}: no page errors (${errors.slice(0, 2).join(' | ')})`);
  measures[c.tag] = m;
  await ctx.close();
}
await browser.close();
fs.writeFileSync(path.join(OUT, 'walk-1546r.json'), JSON.stringify({ measures, notes, fails }, null, 2));
try { fs.rmSync(tmp); } catch { /* best effort */ }
console.log(fails.length ? `walk1546: ${fails.length} failure(s)` : 'walk1546: all checks passed');
process.exit(fails.length ? 1 : 0);
