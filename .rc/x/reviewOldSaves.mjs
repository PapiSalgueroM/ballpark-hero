// Round 1210 reviewer, old saves: a save made by the BASE build (origin/main, served on OLD) is loaded by the branch build (BASE).
// Runner only, an extra file. The database host is blocked on every context.
import fs from 'node:fs';
import path from 'node:path';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const { chromium } = pw;
const NEW = process.env.BASE ?? 'http://localhost:4173';
const OLD = process.env.OLD_BASE ?? 'http://localhost:4174';
const OUT = process.env.RC_OUT || '.';
let bad = 0;
const say = (ok, what) => { console.log((ok ? '  PASS  ' : '  FAIL  ') + what); if (!ok) bad += 1; };
const browser = await chromium.launch();
const dump = page => page.evaluate(() => Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)])));

async function open(base, route, entries) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  await ctx.route(/supabase\.co/, r => r.abort());
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 200)));
  if (entries) await page.addInitScript(e => { if (sessionStorage.getItem('__seeded')) return; for (const [k, v] of Object.entries(e)) localStorage.setItem(k, v); sessionStorage.setItem('__seeded', '1'); }, entries);
  await page.goto(base + route, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: /^essential only$/i }).first().click({ timeout: 1500 }).catch(() => {});
  await page.waitForTimeout(300);
  return { ctx, page, errors };
}
const giveUp = async page => {
  await page.getByRole('button', { name: /^give up$/i }).first().click({ timeout: 6000 });
  await page.getByRole('button', { name: /yes, reveal it/i }).first().click({ timeout: 6000 });
  await page.locator('[data-testid="practice-feedback"]').waitFor({ timeout: 6000 });
};
const feedback = page => page.locator('[data-testid="practice-feedback"]').evaluate(el => { const p = el.querySelectorAll('p')[1]; return { name: el.querySelector('p').textContent, line: p.textContent, flag: !!p.querySelector('img,svg') }; });

/* ── Footle: a five-puzzle run begun on the base build ── */
console.log('1) Footle practice run, made on the base build');
let saved;
{
  const { ctx, page } = await open(OLD, '/footle');
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(300);
  await page.locator('[data-footle-mode="practice"]').click({ timeout: 5000 });
  await page.waitForFunction(() => { const b = document.querySelector('[data-testid="practice-start"]'); return !!b && !b.disabled; }, null, { timeout: 15000 });
  await page.locator('[data-testid="practice-start"]').click();
  await giveUp(page);
  const fb = await feedback(page);
  console.log('   base build, puzzle 1: ' + JSON.stringify(fb));
  say(!fb.flag, `the base build prints the feedback line bare ("${fb.line}"): this is the page the round changed`);
  await page.locator('[data-testid="practice-next"]').click();
  await page.waitForTimeout(500);
  saved = await dump(page);
  await ctx.close();
}
const practiceKey = Object.keys(saved).find(k => /practice/i.test(k) && /footle/i.test(k));
say(!!practiceKey, `the base build wrote a practice save (${practiceKey}); ${Object.keys(saved).length} keys copied`);
{
  const { ctx, page, errors } = await open(NEW, '/footle', saved);
  const progress = await page.locator('[data-testid="practice-progress"]').first().textContent({ timeout: 8000 }).catch(() => null);
  say(progress === 'Puzzle 2 of 5', `the branch build opens the base save on its run, at "${progress}"`);
  const now = await dump(page);
  say(practiceKey && now[practiceKey] === saved[practiceKey], 'loading left the saved run byte for byte as the base wrote it');
  const run = practiceKey ? JSON.parse(saved[practiceKey]) : null;
  await giveUp(page).catch(e => say(false, 'could not give up on puzzle 2: ' + e.message.slice(0, 80)));
  const fb = await feedback(page).catch(() => null);
  console.log('   branch build, puzzle 2: ' + JSON.stringify(fb));
  say(!!fb && fb.flag, 'puzzle 2 of the old run shows its feedback line with a flag on the branch');
  say(!!fb && !!run && fb.name.includes(run.targets[1]), `the answer is the one the base save dealt (${run?.targets?.[1]})`);
  await page.screenshot({ path: path.join(OUT, 'oldsave-footle-390.png') });
  say(errors.length === 0, `no page error (${errors.join(' | ')})`);
  await ctx.close();
}

/* ── Club Manager: a career begun on the base build ── */
console.log('2) Club Manager career, made on the base build');
const tap = async (page, rx) => { const b = page.getByRole('button', { name: rx }).first(); if (await b.count().catch(() => 0) === 0) return false; return b.click({ timeout: 4000 }).then(() => true).catch(() => false); };
const groupsOf = page => page.evaluate(() => { const s = document.querySelector('[data-nat-filter]'); return s ? [...s.querySelectorAll('optgroup')].map(g => ({ label: g.label, nations: [...g.querySelectorAll('option')].map(o => o.value) })) : null; });
let cmSaved; let club;
{
  const { ctx, page } = await open(OLD, '/club-manager', { 'rules-gate-seen:/club-manager': '1' });
  for (let i = 0; i < 3; i++) { if (await page.locator('[role="dialog"][data-state="open"]').count().catch(() => 0) === 0) break; await page.keyboard.press('Escape').catch(() => {}); await page.waitForTimeout(250); }
  await tap(page, /2026-27/i);
  await page.getByRole('button', { name: /England/i }).first().waitFor({ timeout: 15000 }).catch(() => {});
  await tap(page, /England/i);
  await page.getByRole('button', { name: /Premier League/i }).first().waitFor({ timeout: 8000 }).catch(() => {});
  await tap(page, /Premier League/i);
  const c = page.locator('button').filter({ hasText: /Everton|Fulham|Brentford|Crystal Palace|Wolves|Brighton|Newcastle/ }).first();
  await c.waitFor({ timeout: 8000 }).catch(() => {});
  await c.click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(500);
  await tap(page, /take the job|confirm|start/i);
  await page.getByText(/who is in the dugout/i).first().waitFor({ timeout: 8000 }).catch(() => {});
  await tap(page, /skip: just manage/i);
  await page.waitForTimeout(1500);
  await page.getByRole('tab', { name: 'Market', exact: true }).click({ timeout: 8000 });
  await page.locator('[data-nat-filter]').first().waitFor({ timeout: 20000 });
  const g = await groupsOf(page);
  const else_ = g.find(x => /elsewhere/i.test(x.label));
  console.log('   base build groups: ' + g.map(x => `${x.label} ${x.nations.length}`).join(' | '));
  say(!!else_, `the base build draws an Elsewhere group (${else_ ? else_.nations.join(', ') : 'none'}): this is what the round removes`);
  club = await page.locator('h1, h2').first().textContent().catch(() => '');
  await page.waitForTimeout(800);
  cmSaved = await dump(page);
  await ctx.close();
}
{
  const { ctx, page, errors } = await open(NEW, '/club-manager', cmSaved);
  const tab = page.getByRole('tab', { name: 'Market', exact: true });
  await tab.waitFor({ timeout: 15000 }).catch(() => {});
  say(await tab.count() === 1, `the branch build opens the base career straight on its hub (${Object.keys(cmSaved).length} keys copied)`);
  if (await tab.count() === 1) {
    await tab.click();
    await page.locator('[data-nat-filter]').first().waitFor({ timeout: 20000 }).catch(() => {});
    const g = await groupsOf(page);
    console.log('   branch build groups: ' + (g ?? []).map(x => `${x.label} ${x.nations.length}`).join(' | '));
    say(!!g && !g.some(x => /elsewhere/i.test(x.label)), 'the old career has no Elsewhere group on the branch');
    const total = (g ?? []).reduce((s, x) => s + x.nations.length, 0);
    say(total >= 100, `the old career's market still lists its nations (${total})`);
    await page.screenshot({ path: path.join(OUT, 'oldsave-cm-390.png') });
  }
  say(errors.length === 0, `no page error (${errors.join(' | ')})`);
  await ctx.close();
}
await browser.close();
console.log(`reviewOldSaves: ${bad} problem${bad === 1 ? '' : 's'}`);
process.exit(bad ? 1 : 0);
