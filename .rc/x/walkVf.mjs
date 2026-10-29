/* Skeptic walk for BS-cm416-2 (PR 420 Save button in Buy rows). Independent of the reviewer's walk.
   Two real builds: HEAD (served by run.sh on BASE, 4173) and the PR's base 14ec28b1c (built into
   /tmp/base/dist, served here on 4174). Same old save planted in both, same clock, off origin blocked.
   Per width it measures EVERY Buy row (not a sample): list window height, row count, mean and median
   row height, rows fully inside the window at scrollTop 0, and the list's total scroll height. On HEAD it
   also hides the Save buttons in place and measures again (the in-page counterfactual), so the two
   ways of removing Save can be compared against each other.
   Control: on HEAD the Save count must equal the row count and hiding Save must change the scroll height;
   on BASE the Save count must be 0. If a control does not hold, the walk prints CONTROL FAIL and exits 3.
   Exit 2 if it could not run. */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const HEAD = (process.env.BASE ?? 'http://localhost:4173').replace(/\/$/, '');
const OLD_DIR = process.env.OLD_DIR ?? '/tmp/base/dist';
const OLD = 'http://localhost:4174';
const OUT = process.env.RC_OUT ? path.join(process.env.RC_OUT, 'vf') : '.tmp-fx/vf';
fs.mkdirSync(OUT, { recursive: true });
const FX = JSON.parse(fs.readFileSync('scripts/data/cmPreAzMarketFixture.json', 'utf8'));
const SAVE_KEY = 'dukb-club-manager-save', NOW = Date.UTC(2026, 9, 28, 16, 0, 0);
const say = (...a) => console.log('VF', ...a);
let controlFail = 0;

const server = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', OLD_DIR, '4174'], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 2500));
const browser = await pw.chromium.launch();

async function resume(base, size) {
  const origin = new URL(base).origin;
  const ctx = await browser.newContext({ viewport: size, deviceScaleFactor: 1, reducedMotion: 'reduce', serviceWorkers: 'block' });
  await ctx.route(/supabase\.co/, r => r.abort());
  await ctx.route('**/*', r => (new URL(r.request().url()).origin === origin ? r.continue() : r.abort()));
  await ctx.addInitScript(([k, v, now]) => {
    try { localStorage.setItem('cookie-consent', 'essential'); if (!localStorage.getItem(k)) localStorage.setItem(k, v); } catch { /* blocked */ }
    Date.now = () => now;
  }, [SAVE_KEY, FX.saves.A, NOW]);
  const page = await ctx.newPage(); page.setDefaultTimeout(30000);
  const errors = []; page.on('pageerror', e => errors.push(String(e)));
  await page.goto(`${base}/club-manager`, { waitUntil: 'domcontentloaded' });
  const any = page.locator('button', { hasText: 'Resume Career' }).first();
  await any.waitFor({ timeout: 60000 });
  const slot = page.locator('[data-testid="cm-slot-1"]').getByRole('button', { name: 'Resume Career', exact: true });
  await ((await slot.count()) ? slot : any).click();
  await page.locator('[data-cm-hub]').waitFor({ timeout: 60000 });
  await page.getByRole('tab', { name: 'Market', exact: true }).click();
  await page.locator('input[aria-label="Search player or club"]').waitFor();
  await page.waitForTimeout(500);
  return { ctx, page, errors };
}

/* Runs in the page: every child of the list that is a player row (has a Talk or Cold button). */
function measure(list) {
  const rows = [...list.children].filter(r => [...r.querySelectorAll('button')].some(b => /^(Talk|Cold)/.test(b.textContent.trim())));
  list.scrollTop = 0;
  const top = list.getBoundingClientRect().top + list.clientTop;
  const hs = rows.map(r => r.getBoundingClientRect().height);
  const sorted = [...hs].sort((a, b) => a - b);
  const fully = rows.filter(r => r.getBoundingClientRect().bottom - top <= list.clientHeight + 0.5).length;
  return {
    window: list.clientHeight, rows: rows.length,
    saves: rows.filter(r => r.querySelector('button[aria-label^="Save "]')).length,
    meanRow: +(hs.reduce((a, b) => a + b, 0) / hs.length).toFixed(2),
    medianRow: sorted[Math.floor(sorted.length / 2)], minRow: sorted[0],
    fullyVisibleAtTop: fully, scrollHeight: list.scrollHeight,
    first3: rows.slice(0, 3).map(r => r.querySelector('span.truncate')?.textContent ?? '?'),
  };
}
const listOf = page => page.locator('input[aria-label="Search player or club"]').locator('xpath=following-sibling::div[1]');

for (const size of [{ width: 320, height: 640 }, { width: 390, height: 844 }, { width: 1280, height: 900 }]) {
  const tag = size.width;
  for (const [label, base] of [['HEAD', HEAD], ['BASE', OLD]]) {
    let run;
    try { run = await resume(base, size); } catch (e) { say(`cannot run ${label} at ${tag}: ${String(e).slice(0, 200)}`); process.exit(2); }
    const { page, errors } = run;
    const m = await listOf(page).evaluate(measure);
    say(tag, label, JSON.stringify(m));
    await listOf(page).screenshot({ path: path.join(OUT, `list-${label}-${tag}.png`) });
    if (label === 'HEAD') {
      if (m.saves !== m.rows || m.rows === 0) { say('CONTROL FAIL: HEAD saves', m.saves, 'rows', m.rows); controlFail++; }
      await listOf(page).evaluate(list => list.querySelectorAll('button[aria-label^="Save "]').forEach(b => { b.style.display = 'none'; }));
      const hidden = await listOf(page).evaluate(measure);
      say(tag, 'HEAD-saveHidden', JSON.stringify(hidden));
      if (hidden.scrollHeight === m.scrollHeight) { say('CONTROL FAIL: hiding Save changed nothing'); controlFail++; }
    } else if (m.saves !== 0) { say('CONTROL FAIL: BASE has Save buttons', m.saves); controlFail++; }
    say(tag, label, 'page errors', errors.length);
    await run.ctx.close();
  }
}
await browser.close();
server.kill();
if (controlFail) { console.log(`vf: CONTROL FAIL x${controlFail}`); process.exit(3); }
console.log('vf: done');
