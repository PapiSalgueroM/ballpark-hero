// Review walk (r1572, reviewer "run"): the built site at 390x844 and 1280x900, reduced motion off and on.
// New career: rules, menu (all bands), pick Fremantle, prepare, play the whole match, ladder, club panel.
// Old careers built by the BASE engine (65b3e291a at /tmp/base), planted before the first navigation:
// round 4 report and season over; Club panel offer, ask, keep, ask, confirm, header, ladder, reload, home Continue strip.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const ROOT = process.cwd();
const pw = (await import(pathToFileURL(path.join(ROOT, 'scripts/lib/playwrightLoader.mjs')).href)).default;
const { answerConsent } = await import(pathToFileURL(path.join(ROOT, 'scripts/lib/answerConsent.mjs')).href);
const BASE_URL = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || fs.mkdtempSync(path.join(os.tmpdir(), 'walk-'));
const esbuild = await import('esbuild');
async function load(dir) {
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'rw-')), 'b.mjs');
  await esbuild.build({ stdin: { contents: "export * from './src/lib/aussieRulesLeague.ts';", resolveDir: dir, loader: 'ts' },
    bundle: true, format: 'esm', platform: 'node', outfile: out, logLevel: 'error', absWorkingDir: dir, nodePaths: [path.join(ROOT, 'node_modules')] });
  return import(pathToFileURL(out).href);
}
const B = await load(process.env.REVIEW_BASE || '/tmp/base'), N = await load(ROOT);
if (typeof B.switchClubSet === 'function') { console.error('the base bundle has the switch: not the base'); process.exit(2); }
function bot(L, s) {
  if (s.phase === 'prepare') return s.match ? { type: 'prepare', choice: 'train' } : { type: 'simWeek' };
  if (s.phase === 'quarter') return { type: 'play', tactic: 'pressure' };
  if (s.phase === 'draft' && s.draft && s.draft.at < s.draft.order.length) return { type: 'draftAuto' };
  return { type: 'next' };
}
function until(L, s, stop) { let x = s; for (let i = 0; i < 3000 && !stop(x); i += 1) { const n = L.reduceLeague(x, bot(L, x)); if (n === x) throw new Error(`stuck ${x.phase}`); x = n; } return x; }
const old4 = until(B, B.createLeague(5, 'club-00'), s => s.round === 3 && s.phase === 'report');
const oldOver = until(B, B.createLeague(9, 'club-06'), s => s.phase === 'seasonOver');
const REAL = N.clubIdentities('afl2026'); const REAL_FULL = new Set(REAL.map(x => x.full)), REAL_SHORT = new Set(REAL.map(x => x.short));
const FAKE_SHORT = N.CLUBS.map(c => c.place);
let checks = 0, fails = 0;
const say = (ok, m) => { checks += 1; if (!ok) fails += 1; console.log(`  ${ok ? 'PASS' : 'FAIL'} ${m}`); };
const browser = await pw.chromium.launch();
async function open(viewport, motion, plant, route = '/aussie-rules-manager') {
  const context = await browser.newContext({ viewport, reducedMotion: motion });
  await context.route(/supabase\.co/, r => r.abort());
  if (plant) await context.addInitScript(([key, raw]) => { if (!sessionStorage.getItem('rv-planted')) { localStorage.setItem(key, raw); sessionStorage.setItem('rv-planted', '1'); } }, [N.SAVE_KEY, plant]);
  const page = await context.newPage(); const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded' });
  await answerConsent(page);
  await page.waitForFunction(() => document.querySelector('[role="dialog"]') || document.querySelector('section[data-arl-phase]'), null, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(500);
  if (plant) { const lp = page.getByRole('button', { name: "Let's Play!" }); if (await lp.count()) { await lp.first().click(); await page.waitForTimeout(300); } }
  return { context, page, errors };
}
const tag = (w, m) => `${w}-${m === 'reduce' ? 'rm' : 'mo'}`;
const shot = (page, name, full = false) => page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: full });
const text = (page, sel) => page.$$eval(sel, els => els.map(el => (el.textContent || '').replace(/\s+/g, ' ').trim()));
const tile = async (page, title) => { await page.locator('button', { has: page.locator(`div:text-is("${title}")`) }).first().click(); await page.waitForTimeout(300); };
const hub = async page => { await page.getByRole('button', { name: /Hub/ }).first().click(); await page.waitForTimeout(300); };
const sideways = page => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
const clipped = page => page.$$eval('section[data-arl-phase] strong, section[data-arl-phase] h3, section[data-arl-phase] button, section[data-arl-phase] th', els => els.filter(el => el.scrollWidth > el.clientWidth + 1).map(el => (el.textContent || '').trim().slice(0, 40)));
const anims = page => page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running').length);
for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 900 }]) for (const motion of ['no-preference', 'reduce']) {
  const t = tag(viewport.width, motion); console.log(`\n== ${t}`);
  { // a new career
    const { context, page, errors } = await open(viewport, motion, null);
    const rules = page.getByRole('dialog');
    if (await rules.count()) { await shot(page, `rules-${t}`); const body = (await rules.first().textContent()) || ''; say(body.includes('Caldermere Comets') && body.includes('Fremantle finished 1st'), `${t} rules carry the club example`); await page.getByRole('button', { name: "Let's Play!" }).first().click(); await page.waitForTimeout(300); }
    const drawn = await page.waitForFunction(n => [...document.querySelectorAll('[data-arl-club] strong')].filter(s => n.includes((s.textContent || '').trim())).length === 18, [...REAL_FULL], { timeout: 20000 }).then(() => true, () => false);
    say(drawn, `${t} menu drew 18 real names`);
    const heads = await text(page, '[data-arl-phase="menu"] h3');
    say(heads.length === 5 && heads[0] === 'Finished 1st to 3rd in 2026' && heads[4] === 'Finished 16th to 18th in 2026', `${t} band headings: ${heads.join(' | ')}`);
    say(await sideways(page), `${t} menu: no sideways scroll`); const c0 = await clipped(page); say(c0.length === 0, `${t} menu: nothing clipped ${c0.join(', ')}`);
    await shot(page, `menu-${t}`); if (motion === 'no-preference') await shot(page, `menu-full-${t}`, true);
    await page.locator('[data-arl-club="club-00"]').click(); await page.waitForTimeout(400);
    const header = await text(page, 'section[data-arl-phase] header p'); say(header[0] === 'Fremantle · Season 1', `${t} header after pick: ${header[0]}`);
    await shot(page, `picked-${t}`);
    await tile(page, 'Next match'); await page.locator('[data-arl-prepare="train"]').click(); await page.waitForTimeout(300);
    await page.locator('[data-arl-playmatch]').click(); await page.waitForTimeout(1500);
    const score = await text(page, '[data-arl-score] strong'); say(score.length === 2 && score.every(s => REAL_FULL.has(s)), `${t} score card: ${score.join(' v ')}`);
    say(await sideways(page), `${t} match: no sideways scroll`); const c1 = await clipped(page); say(c1.length === 0, `${t} match: nothing clipped ${c1.join(', ')}`);
    console.log(`  info ${t} running animations after the match: ${await anims(page)}`);
    await shot(page, `match-${t}`);
    await hub(page); await tile(page, 'Ladder');
    const lad = (await text(page, '[data-arl-ladder] th')).map(s => s.replace(/^\d+\. /, '')); say(lad.length === 18 && lad.every(s => REAL_SHORT.has(s)), `${t} ladder: 18 real short names`);
    await shot(page, `ladder-${t}`);
    await hub(page); await tile(page, 'Club');
    say((await page.locator('[data-arl-switch]').count()) === 0, `${t} a real career is not offered the switch`);
    await shot(page, `club-new-${t}`);
    say(errors.length === 0, `${t} new career: no page errors ${errors.join(' | ').slice(0, 300)}`);
    await context.close();
  }
  for (const [name, old] of [['r4', old4], ['over', oldOver]]) { // an old career written by the base engine
    const raw = JSON.stringify(old);
    const { context, page, errors } = await open(viewport, motion, raw);
    await page.waitForSelector('section[data-arl-phase] header p', { timeout: 20000 }).catch(() => {});
    const h0 = await text(page, 'section[data-arl-phase] header p');
    say((h0[0] || '').startsWith(`${old.clubName} · Season`), `${t} ${name} old career opens under its own name: ${h0[0]}`);
    const body0 = (await page.textContent('main')) || '';
    const realSeen = [...REAL_SHORT].filter(n => new RegExp(`(^|[^A-Za-z])${n}([^A-Za-z]|$)`).test(body0));
    say(realSeen.length === 0, `${t} ${name} hub shows no real name before the switch (${realSeen.join(', ')})`);
    await shot(page, `old-${name}-hub-${t}`);
    if (name === 'over') { const prem = await text(page, '[data-arl-premier], [data-arl-premiers]'); console.log(`  info ${t} premiers line: ${prem.join(' | ')}`); }
    let order = [], nums = [];
    if (name === 'r4') { await tile(page, 'Ladder'); order = await page.$$eval('[data-arl-ladder]', els => els.map(e => e.getAttribute('data-arl-ladder'))); nums = await text(page, '[data-arl-ladder] td'); await hub(page); }
    await tile(page, 'Club');
    const offer = await text(page, '[data-arl-switch] p');
    const realName = N.clubFull({ clubSet: 'afl2026' }, old.myClub);
    say(offer.length === 1 && offer[0].includes(`${old.clubName} become ${realName}`), `${t} ${name} offer: ${offer[0]}`);
    say(await sideways(page), `${t} ${name} club panel: no sideways scroll`);
    await shot(page, `old-${name}-club-${t}`);
    const y0 = await page.evaluate(() => window.scrollY);
    await page.locator('[data-arl-switchask]').click(); await page.waitForTimeout(250);
    await shot(page, `old-${name}-ask-${t}`);
    await page.locator('[data-arl-switchkeep]').click(); await page.waitForTimeout(250);
    say((await page.evaluate(k => localStorage.getItem(k), N.SAVE_KEY)) === raw, `${t} ${name} keep leaves the save as the base wrote it`);
    await page.locator('[data-arl-switchask]').click(); await page.waitForTimeout(250);
    await page.locator('[data-arl-switchconfirm]').click(); await page.waitForTimeout(500);
    const y1 = await page.evaluate(() => window.scrollY);
    console.log(`  info ${t} ${name} scrollY before ask ${y0}, after confirm ${y1}`);
    const saved = await page.evaluate(k => localStorage.getItem(k), N.SAVE_KEY);
    say(saved === JSON.stringify(N.switchClubSet(old)) && !!N.readLeagueSave(saved), `${t} ${name} the stored save is switchClubSet of the base save and loads`);
    const h1 = await text(page, 'section[data-arl-phase] header p');
    say((h1[0] || '').startsWith(`${realName} · Season`), `${t} ${name} header after switch: ${h1[0]}`);
    await shot(page, `old-${name}-switched-${t}`);
    const body1 = (await page.textContent('main')) || '';
    const fakeSeen = FAKE_SHORT.filter(n => new RegExp(`(^|[^A-Za-z])${n}([^A-Za-z]|$)`).test(body1));
    say(fakeSeen.length === 0, `${t} ${name} club panel after switch shows no invented place (${fakeSeen.join(', ')})`);
    if (name === 'r4') { await hub(page); await tile(page, 'Ladder');
      say(JSON.stringify(await page.$$eval('[data-arl-ladder]', els => els.map(e => e.getAttribute('data-arl-ladder')))) === JSON.stringify(order) && JSON.stringify(await text(page, '[data-arl-ladder] td')) === JSON.stringify(nums), `${t} ${name} ladder order and numbers unchanged by the switch`);
      await shot(page, `old-${name}-ladder-${t}`); }
    await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForTimeout(1200);
    const h2 = await text(page, 'section[data-arl-phase] header p');
    say((h2[0] || '').startsWith(`${realName} · Season`), `${t} ${name} after reload: ${h2[0]}`);
    if (name === 'over') { const prem = await text(page, '[data-arl-premier], [data-arl-premiers]'); console.log(`  info ${t} premiers line after switch: ${prem.join(' | ')}`); await shot(page, `old-${name}-reload-${t}`); }
    if (motion === 'no-preference') { await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(2500);
      const strip = await page.$$eval('a[href="/aussie-rules-manager"]', els => els.map(e => (e.textContent || '').replace(/\s+/g, ' ').trim()).filter(s => /season/i.test(s)));
      console.log(`  info ${t} ${name} home Continue strip: ${strip.join(' | ')}`); await shot(page, `old-${name}-home-${t}`); }
    say(errors.length === 0, `${t} ${name} no page errors ${errors.join(' | ').slice(0, 300)}`);
    await context.close();
  }
}
await browser.close();
console.log(`\nreview-walk: ${checks} checks, ${fails} failures, shots in ${OUT}`);
process.exit(fails ? 1 : 0);
