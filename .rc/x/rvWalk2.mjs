/* Release AO review walk 2 (runner lens): the Resume chip (Round 1046), the NBA Season Center on a base save
   (Round 1046's layout around Round 1048's record panel), the header's sound switch on the home page.
   Base saves come from Release AN's engines (git archive of origin/release-an2-int). supabase.co is aborted. */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = process.cwd();
const pw = (await import(pathToFileURL(path.join(ROOT, 'scripts/lib/playwrightLoader.mjs')).href)).default;
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || path.join(ROOT, '.tmp-fx', 'rv-out');
fs.mkdirSync(OUT, { recursive: true });
const BASEROOT = path.join(ROOT, '.rc', 'base2');
let checks = 0, failed = 0;
const check = (ok, label) => { checks += 1; if (!ok) failed += 1; console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}`); return ok; };
const info = label => console.log(`info ${label}`);

fs.mkdirSync(BASEROOT, { recursive: true });
let baseRef = 'origin/release-an2-int';
try { execSync(`git rev-parse --verify ${baseRef}`, { stdio: 'pipe' }); }
catch { execSync('git fetch -q origin release-an2-int', { stdio: 'inherit' }); baseRef = 'FETCH_HEAD'; }
execSync(`git archive ${baseRef} src | tar -x -C "${BASEROOT}"`, { stdio: 'inherit', shell: '/bin/bash' });

const mem = new Map();
globalThis.localStorage = { getItem: k => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => { mem.set(k, String(v)); }, removeItem: k => { mem.delete(k); }, clear: () => mem.clear() };
const outfile = path.join(process.env.TMPDIR || '/tmp', `rv2-bundle-${process.pid}.mjs`);
await build({
  stdin: { contents: ["export * as soccer from './src/lib/soccerCareerEngine.ts';", "export { NBA_CAREER_SPORT } from './src/lib/nbaCareerSport.ts';"].join('\n'), resolveDir: BASEROOT, loader: 'ts' },
  bundle: true, format: 'esm', platform: 'node', outfile, absWorkingDir: BASEROOT, logLevel: 'error', jsx: 'automatic',
  alias: { '@': path.join(BASEROOT, 'src') }, loader: { '.css': 'empty', '.png': 'empty', '.svg': 'empty' },
  banner: { js: "import { createRequire as __rvRequire } from 'node:module'; const require = __rvRequire(import.meta.url);" },
});
const OLD = await import(pathToFileURL(outfile).href);
function mulberry32(a) {
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function withSeed(seed, fn) { const r = Math.random; Math.random = mulberry32(seed >>> 0); try { return fn(); } finally { Math.random = r; } }
const abil = o => ({ pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o });
const SOCCER = withSeed(4242, () => {
  const S0 = OLD.soccer, CL = S0.FALLBACK_CLUBS;
  let s = S0.initCareer('Old Save 0', 'England', 'ST', '2010-14', abil(72), 72, 2010, CL, null, 92);
  for (let g = 0; g < 200 && s; g += 1) {
    if (s.phase === 'playing' && s.seasons.length >= 2) return JSON.stringify(s);
    s = s.phase === 'youth' ? S0.advanceYouthYear(s, CL) : s.phase === 'contract_offer' ? ((s.pendingOffers || []).length ? S0.acceptOffer(s, s.pendingOffers[0]) : { ...s, phase: 'playing' }) : null;
  }
  return null;
});
const NBA = withSeed(1048 + 21, () => {
  const SB = OLD.NBA_CAREER_SPORT, rng = Math.random;
  const c = SB.startCareer('Old Baller', 'SG', SB.create.archetypes.SG[0], rng, null, 'now');
  let tq = SB.rollTeamQuality(null, rng);
  SB.assignRole(c, tq, rng);
  for (let i = 0; i < 3; i += 1) { SB.campBattle(c, tq, rng); SB.simSeason(c, tq, rng); SB.progress(c, rng); tq = SB.rollTeamQuality(tq, rng); }
  c.contractYears = Math.max(3, c.contractYears);
  return { key: SB.saveKey, value: JSON.stringify({ c, phase: 'season', teamQuality: tq }) };
});
info(`base saves: soccer ${SOCCER ? SOCCER.length : 'NONE'} chars, nba ${NBA.value.length} chars`);

const browser = await pw.chromium.launch();
const clickText = (page, text) => page.evaluate(t => {
  const b = [...document.querySelectorAll('button')].find(x => !x.disabled && (x.textContent ?? '').includes(t));
  if (!b) return false; b.click(); return true;
}, text);
const shot = async (page, name) => { await page.waitForTimeout(700); await page.screenshot({ path: path.join(OUT, `${name}.png`) }); };
const sideways = page => page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
async function open(vp, reduced, saves, route) {
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  await ctx.addInitScript(pairs => {
    try { localStorage.setItem('cookie-consent', 'essential'); for (const [k, v] of pairs) if (localStorage.getItem(k) === null) localStorage.setItem(k, v); } catch (e) { /* blocked */ }
    window.__ac = 0;
    const A = window.AudioContext || window.webkitAudioContext;
    if (A) window.AudioContext = class extends A { constructor(...a) { super(...a); window.__ac += 1; } };
  }, saves);
  const page = await ctx.newPage();
  const errors = [];
  await page.route(/supabase\.co/, r => r.abort());
  page.on('pageerror', e => errors.push(`pageerror: ${String(e.message).slice(0, 200)}`));
  page.on('console', m => { if (m.type() === 'error' && !/supabase|Failed to load resource|ERR_FAILED|net::|Failed to fetch/i.test(m.text())) errors.push(`console: ${m.text().slice(0, 200)}`); });
  await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => document.querySelectorAll('#root [class]').length > 60, { timeout: 40000 }).catch(() => {});
  await page.waitForTimeout(1500);
  for (let i = 0; i < 3; i += 1) {
    const had = await page.evaluate(() => { const b = [...document.querySelectorAll('[role="dialog"] button')].find(x => /Let's Play|Start playing/.test(x.textContent ?? '')); if (b) b.click(); return !!b; });
    if (!had) break;
    await page.waitForTimeout(350);
  }
  return { ctx, page, errors };
}
const SIZES = [{ w: 390, h: 844, tag: 'phone' }, { w: 1280, h: 900, tag: 'desk' }];
const stageLine = page => page.evaluate(() => ((document.querySelector('[data-centre-stage]')?.innerText || '').match(/(Matchday|League game|Game|Week) (\d+) of (\d+)/) || [null])[0]);
const nextInBar = page => page.evaluate(() => {
  const b = [...document.querySelectorAll('[data-season-centre] button, [data-us-season-centre] button')].find(x => !x.disabled && /^(▶|📋)/.test((x.textContent ?? '').trim()));
  if (!b) return null; const t = b.textContent.trim(); b.click(); return t;
});
/* ─── A. the Resume chip ─── */
if (SOCCER) for (const vp of SIZES) {
  const tag = vp.tag;
  const X = await open(vp, false, [['soccerCareerSave', SOCCER], ['seasonCentre:help', '1']], '/soccer-career');
  try {
    await X.page.click('[data-week-by-week]');
    await X.page.waitForSelector('[data-season-centre]', { timeout: 25000 });
    await clickText(X.page, 'Kick off');
    for (let i = 0; i < 3; i += 1) {
      await clickText(X.page, 'Results');
      await X.page.waitForTimeout(1100);
      if (await X.page.$('[data-moment-offer]')) { await clickText(X.page, '▶ Let it play'); await X.page.waitForTimeout(900); }
      if (i < 2) { await nextInBar(X.page); await X.page.waitForTimeout(500); }
    }
    const at = await stageLine(X.page);
    await shot(X.page, `resume-before-close-${tag}`);
    await X.page.click('[data-centre-exit]');
    await X.page.waitForTimeout(1200);
    let where = 'the first screen after closing';
    let chip = await X.page.evaluate(() => document.querySelector('[data-season-resume]')?.textContent.trim() ?? null);
    await shot(X.page, `resume-after-close-${tag}`);
    for (let i = 0; i < 6 && !chip; i += 1) {
      const pressed = await X.page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => !x.disabled && /^(Continue|Back to career|Next|Close|Dismiss|OK)/.test((x.textContent ?? '').trim())); if (!b) return null; const t = b.textContent.trim(); b.click(); return t; });
      if (!pressed) break;
      await X.page.waitForTimeout(900);
      where = `after pressing "${pressed}" (${i + 1} presses)`;
      chip = await X.page.evaluate(() => document.querySelector('[data-season-resume]')?.textContent.trim() ?? null);
    }
    check(!!chip, `[${tag}] A. closed at "${at}": a Resume chip shows on ${where}: "${chip}"`);
    if (chip) {
      const seen = await X.page.evaluate(() => {
        const b = document.querySelector('[data-season-resume]'); b.scrollIntoView({ block: 'center' });
        const r = b.getBoundingClientRect();
        const hit = [[r.left + 12, r.top + r.height / 2], [r.left + r.width / 2, r.top + r.height / 2], [r.right - 12, r.top + r.height / 2]].map(([x, y]) => { const e = document.elementFromPoint(x, y); return !!e && (e === b || b.contains(e)); });
        return { hit, w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top) };
      });
      await shot(X.page, `resume-chip-${tag}`);
      check(seen.hit.every(Boolean) && seen.h >= 44, `[${tag}] A. the chip is a ${seen.w} by ${seen.h} target and nothing covers it (hit test ${seen.hit.join(',')})`);
      await X.page.click('[data-season-resume]');
      const again = await X.page.waitForSelector('[data-season-centre]', { timeout: 25000 }).then(() => true).catch(() => false);
      const resumed = again ? await X.page.evaluate(() => ({ line: document.querySelector('[data-kickoff-resumed]')?.textContent ?? null, button: [...document.querySelectorAll('[data-kickoff] button')].map(b => b.textContent.trim()) })) : null;
      await shot(X.page, `resume-card-${tag}`);
      const n = at ? Number(at.split(' ')[1] === 'game' ? at.split(' ')[2] : at.split(' ')[1]) : NaN;
      check(!!resumed && !!resumed.line && resumed.line.startsWith(`${n} of`), `[${tag}] A. the chip reopens the centre on a card that says "${resumed && resumed.line}" (closed at "${at}"), buttons: ${resumed ? resumed.button.join(' | ') : '?'}`);
      if (resumed && resumed.button.length) {
        await X.page.evaluate(() => document.querySelector('[data-kickoff] button').click());
        await X.page.waitForTimeout(1500);
        const now = await stageLine(X.page);
        await shot(X.page, `resume-playing-${tag}`);
        check(!!now && Number(now.split(' ').slice(-3)[0]) === n + 1, `[${tag}] A. the resume button plays the next one: "${now}"`);
      }
    }
  } catch (e) { check(false, `[${tag}] A. the Resume walk threw: ${String(e && e.message).slice(0, 200)}`); await shot(X.page, `resume-threw-${tag}`); }
  check(X.errors.length === 0, `[${tag}] A. no page or console errors (${X.errors.slice(0, 3).join(' || ') || 'none'})`);
  await X.ctx.close();
}
/* ─── B. the NBA Season Center on a base save ─── */
for (const [vp, reduced] of [[SIZES[0], false], [SIZES[1], false], [SIZES[0], true]]) {
  const tag = `${vp.tag}-${reduced ? 'rm' : 'mo'}`;
  const X = await open(vp, reduced, reduced ? [[NBA.key, NBA.value], ['seasonCentre:help:nba', '1']] : [[NBA.key, NBA.value]], '/nba-my-career');
  try {
    for (let i = 0; i < 8; i += 1) { if (await X.page.$('[data-week-by-week]')) break; if (!(await clickText(X.page, 'Continue'))) break; await X.page.waitForTimeout(700); }
    await shot(X.page, `nba-hub-${tag}`);
    const has = !!(await X.page.$('[data-week-by-week]'));
    const held = await X.page.evaluate(() => document.querySelector('[data-season-centre-held]')?.textContent ?? null);
    check(has, `[${tag}] B. the hub has a Week by week button${held ? ` (held line: ${held})` : ''}`);
    if (has) {
      await X.page.click('[data-week-by-week]');
      const opened = await X.page.waitForSelector('[data-us-season-centre]', { timeout: 30000 }).then(() => true).catch(() => false);
      check(opened, `[${tag}] B. the Season Center opens on the base save`);
      if (opened) {
        await shot(X.page, `nba-first-${tag}`);
        if (await clickText(X.page, 'Got it')) await X.page.waitForTimeout(400);
        await shot(X.page, `nba-kick-${tag}`);
        check(await clickText(X.page, 'Tip off'), `[${tag}] B. the start button reads Tip off`);
        await X.page.waitForTimeout(reduced ? 700 : 2600);
        await shot(X.page, `nba-mid-${tag}`);
        await clickText(X.page, 'Results');
        await X.page.waitForTimeout(1500);
        await shot(X.page, `nba-ft-${tag}`);
        check(!(await sideways(X.page)), `[${tag}] B. game one: no sideways scroll`);
        if (vp.w < 700) {
          const order = await X.page.evaluate(() => {
            const st = document.querySelector('[data-centre-stage]');
            const top = q => { const e = document.querySelector(q); return e ? Math.round(e.getBoundingClientRect().top + (st ? st.scrollTop : 0)) : null; };
            return { record: top('[data-record-panel]'), list: top('[data-centre-fixtures]'), listText: document.querySelector('[data-centre-fixtures]')?.textContent ?? null, soFar: top('[data-so-far]') };
          });
          info(`[${tag}] B. phone order: record panel ${order.record}, list button ${order.list} ("${order.listText}"), so far tiles ${order.soFar}`);
          check(order.record !== null && order.list !== null && order.record < order.list, `[${tag}] B. on a phone the record panel sits above the list button`);
          await X.page.evaluate(() => { const st = document.querySelector('[data-centre-stage]'); if (st) st.scrollTop = st.scrollHeight; });
          await shot(X.page, `nba-ft-bottom-${tag}`);
          if (await X.page.$('[data-centre-fixtures]')) { await X.page.evaluate(() => document.querySelector('[data-centre-fixtures]').click()); await shot(X.page, `nba-list-${tag}`); check(!(await sideways(X.page)), `[${tag}] B. phone list: no sideways scroll`); await clickText(X.page, '← Back'); }
        }
        let review = false, label = null;
        for (let i = 0; i < 140 && !review; i += 1) {
          if (await X.page.$('[data-review]')) { review = true; break; }
          await clickText(X.page, 'Results');
          const t = await nextInBar(X.page);
          if (i === 2) label = t;
          if (i === 80) await shot(X.page, `nba-late-${tag}`);
          await X.page.waitForTimeout(reduced ? 100 : 200);
        }
        info(`[${tag}] B. the bar's next button read "${label}"`);
        check(review, `[${tag}] B. walked every game to the review`);
        await shot(X.page, `nba-review-${tag}`);
        const txt = await X.page.evaluate(() => (document.querySelector('[data-review]')?.innerText || ''));
        check(!/undefined|NaN|\[object Object\]/.test(txt), `[${tag}] B. the review prints no undefined or NaN`);
        await X.page.evaluate(() => { const st = document.querySelector('[data-centre-stage]'); if (st) st.scrollTop = st.scrollHeight; });
        await shot(X.page, `nba-review-bottom-${tag}`);
      }
    }
  } catch (e) { check(false, `[${tag}] B. the NBA walk threw: ${String(e && e.message).slice(0, 200)}`); await shot(X.page, `nba-threw-${tag}`); }
  check(X.errors.length === 0, `[${tag}] B. no page or console errors (${X.errors.slice(0, 3).join(' || ') || 'none'})`);
  await X.ctx.close();
}
/* ─── C. the header's sound switch on the home page ─── */
for (const vp of SIZES) {
  const X = await open(vp, false, [], '/');
  const box = sel => X.page.evaluate(q => { const e = document.querySelector(q); if (!e) return null; const r = e.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top), left: Math.round(r.left), shown: getComputedStyle(e).display !== 'none' && r.width > 0, pressed: e.getAttribute('aria-pressed') }; }, sel);
  const icon = await box('[data-sound-toggle="icon"]');
  const text = await box('[data-sound-toggle="text"]');
  await X.page.mouse.click(vp.w / 2, 200);
  await X.page.waitForTimeout(500);
  const ac = await X.page.evaluate(() => window.__ac);
  await X.page.screenshot({ path: path.join(OUT, `home-header-${vp.tag}.png`), clip: { x: 0, y: 0, width: vp.w, height: 140 } });
  info(`[${vp.tag}] C. home: header icon ${JSON.stringify(icon)}, footer text ${JSON.stringify(text)}, AudioContext made before the switch: ${ac}`);
  check(ac === 0, `[${vp.tag}] C. home: nothing made before he switches it on`);
  if (vp.w >= 640) check(!!icon && icon.shown && icon.w >= 44 && icon.h >= 44, `[${vp.tag}] C. home: the header switch is shown and at least 44 by 44`);
  else info(`[${vp.tag}] C. home at 390: header switch shown: ${icon ? icon.shown : 'not in the page'}; the footer's is ${text ? `${text.w} by ${text.h}` : 'missing'}`);
  await X.ctx.close();
}
await browser.close();
console.log(`rvWalk2: ${checks} checks, ${failed} failed`);
process.exit(failed ? 1 : 0);
