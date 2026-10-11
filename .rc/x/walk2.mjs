/* Review of Round 1301 (runner only, never committed), second walk: what the board writes when it opens a
   retired save the old code stamped 2 (key by key), the top of the retired screen, and the "?" help.
   BASE=http://localhost:4173 RC_OUT=<dir> node .rc/x/walk2.mjs */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const pw = (await import(pathToFileURL(path.join(ROOT, 'scripts/lib/playwrightLoader.mjs')).href)).default;
const { chromium } = pw;
const BASE = process.env.BASE ?? 'http://localhost:4173';
const SHOTS = process.env.RC_OUT ?? path.join(ROOT, '.tmp-fx', 'review-shots');
fs.mkdirSync(SHOTS, { recursive: true });
const SIZES = { 390: { width: 390, height: 844 }, 1280: { width: 1280, height: 900 } };
const FX = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/test/fixtures/careerHallSaves1301.json'), 'utf8'));
const V1 = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/test/fixtures/careerHallV1.json'), 'utf8'));
const KEY = 'nhl-my-career-save-v1';
let fails = 0;
const say = (ok, what) => { if (!ok) fails += 1; console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${what}`); };

const browser = await chromium.launch();
async function open(vp, reduce, save) {
  const ctx = await browser.newContext({ viewport: SIZES[vp], reducedMotion: reduce ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  await page.route(/supabase\.co/, r => r.abort());
  await page.route(/googlesyndication|googletagmanager|google-analytics|doubleclick|adservice/, r => r.abort());
  const errors = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 200)));
  await page.addInitScript(([key, value]) => {
    try {
      if (sessionStorage.getItem('review-seeded')) return;
      localStorage.setItem('rules-gate-seen:/nhl-my-career', '1');
      localStorage.setItem('cookie-consent', 'essential');
      localStorage.setItem(key, value);
      sessionStorage.setItem('review-seeded', '1');
    } catch { /* the checks will say so */ }
  }, [KEY, save]);
  await page.goto(`${BASE}/nhl-my-career`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.locator('main button').first().waitFor({ state: 'visible', timeout: 30000 });
  return { ctx, page, errors };
}
async function passBeats(page, done) {
  for (let i = 0; i < 16; i += 1) {
    if (await done().catch(() => false)) return i;
    const opt = page.locator('[data-rivalry-option="0"]').first();
    const go = page.locator('main').getByRole('button', { name: 'Continue', exact: true }).first();
    if (await opt.isVisible().catch(() => false)) await opt.click().catch(() => {});
    else if (await go.isVisible().catch(() => false)) await go.click().catch(() => {});
    await page.waitForTimeout(600);
  }
  return -1;
}
/* Every path where two JSON values differ, at most `cap` of them. */
function diff(a, b, at = '', out = [], cap = 14) {
  if (out.length >= cap) return out;
  if (JSON.stringify(a) === JSON.stringify(b)) return out;
  const obj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
  if (obj(a) && obj(b)) { for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) diff(a[k], b[k], `${at}.${k}`, out, cap); return out; }
  out.push(`${at}: ${JSON.stringify(a)?.slice(0, 60)} -> ${JSON.stringify(b)?.slice(0, 60)}`);
  return out;
}

const e = FX.recordings[0].sports.nhl.find(x => x.kind === 'byPush');
const old = V1.sports.nhl.find(x => x.hall.outcome === 'inducted') ?? V1.sports.nhl[0];
console.log(`walk2: the stamped save is ${e.id} (told ${e.legacy.score}); the unstamped one is ${old.id} of the version 1 fixture`);
for (const [name, c] of [['stamped 2 by old code (engine loop save)', e.save], ['unstamped (version 1 fixture, board save)', old.save]]) {
  const seeded = JSON.stringify({ c, phase: 'retired', teamQuality: null, coach: null });
  const { ctx, page, errors } = await open(390, true, seeded);
  const again = page.getByRole('button', { name: 'New career' }).first();
  const beats = await passBeats(page, () => again.isVisible());
  await page.waitForTimeout(2500);
  const raw = await page.evaluate(k => localStorage.getItem(k), KEY);
  const d = diff(JSON.parse(seeded), JSON.parse(raw));
  console.log(`  ${name}: beats pressed ${beats}; the save was ${raw === seeded ? 'NOT rewritten' : 'rewritten'}; ${d.length} paths differ: ${d.join(' | ')}`);
  say(JSON.parse(raw).c.hallCal === c.hallCal, `${name}: the stamp is what it was (${JSON.stringify(c.hallCal)} then, ${JSON.stringify(JSON.parse(raw).c.hallCal)} now)`);
  say(errors.length === 0, `${name}: no page error ${errors.join(' ; ')}`);
  await ctx.close();
}

for (const vp of [390, 1280]) {
  const { ctx, page, errors } = await open(vp, true, JSON.stringify({ c: e.save, phase: 'retired', teamQuality: null, coach: null }));
  const again = page.getByRole('button', { name: 'New career' }).first();
  await passBeats(page, () => again.isVisible());
  await page.waitForTimeout(2500);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: path.join(SHOTS, `E-top-${vp}.png`) });
  const pillBox = await page.locator('span:has-text("Legacy") b').first().boundingBox().catch(() => null);
  await page.locator('span:has-text("Legacy") b').first().scrollIntoViewIfNeeded().catch(() => {});
  await page.screenshot({ path: path.join(SHOTS, `E-pill-${vp}.png`) });
  say(!!pillBox, `retired screen ${vp}: the legacy pill is on the page`);
  const trigger = page.getByRole('button', { name: /how to play/i }).first();
  const seen = await trigger.isVisible().catch(() => false);
  say(seen, `help ${vp}: the "?" is on the page`);
  if (seen) {
    await trigger.scrollIntoViewIfNeeded().catch(() => {});
    await trigger.click({ timeout: 8000 }).catch(err => say(false, `help ${vp}: the click threw ${String(err).slice(0, 120)}`));
    await page.waitForTimeout(900);
    const body = await page.evaluate(() => document.body.innerText);
    const rule = 'Hall of Fame voters weigh the hardware first';
    say(body.includes(rule), `help ${vp}: the Hall rule is printed`);
    say(body.includes('A career you already retired keeps the ballot it was told.'), `help ${vp}: the example says a retired career keeps its ballot`);
    const rules = body.split('The rules')[1]?.split('A worked example')[0] ?? '';
    console.log(`  help ${vp}: the rules block is ${rules.length} characters; season lengths named in it: ${(rules.match(/8[24][ -]game/g) ?? []).join(', ') || 'none'}`);
    await page.screenshot({ path: path.join(SHOTS, `D-help-${vp}.png`) });
    const el = page.getByText(rule, { exact: false }).first();
    await el.scrollIntoViewIfNeeded().catch(() => {});
    await page.screenshot({ path: path.join(SHOTS, `D-help-rule-${vp}.png`) });
  }
  say(errors.length === 0, `help ${vp}: no page error ${errors.join(' ; ')}`);
  await ctx.close();
}
await browser.close();
console.log(`walk2: ${fails ? `${fails} FAILED` : 'all passed'}`);
process.exit(fails ? 1 : 0);
