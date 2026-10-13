// Round 1320 run-lens review: saves both ways across a revert. Seat saves written by the branch (served on
// BASE, the #!serve build) are loaded by the base build (48cb9d4b, served on OLD), played on, and carried back.
// Both hosts block the database. Pictures into RC_OUT as rb-*.png. Exit 1 on any finding.
import fs from 'node:fs';
import path from 'node:path';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const { chromium } = pw;
const NEW = process.env.BASE ?? 'http://localhost:4173';
const OLD = process.env.OLD ?? 'http://localhost:4174';
const OUT = process.env.RC_OUT || path.resolve('.tmp-fx/review-rb');
fs.mkdirSync(OUT, { recursive: true });
const ROUTES = [
  { route: '/cfb-dynasty', key: 'cfb-dynasty-save-v1', school: 'Alabama', last: 12 },
  { route: '/cbb-dynasty', key: 'cbb-dynasty-save-v1', school: 'Kentucky', last: 10 },
];
const PLAY = /^(Play (Week|Round) \d+|Final week \+ the Playoff|Final round \+ March)$/;
let fails = 0;
const say = (ok, what) => { if (!ok) { fails += 1; console.log(`  FAIL ${what}`); } return ok; };
/* the base build's server, a child of this script, so the request line needs no background job */
let server = null;
if (process.env.OLD_DIST) {
  const { spawn } = await import('node:child_process');
  server = spawn(process.execPath, ['scripts/lib/hostLikeServer.mjs', process.env.OLD_DIST, '4174'], { stdio: 'ignore' });
  process.on('exit', () => { try { server.kill(); } catch { /* gone */ } });
  for (let i = 0; i < 40; i += 1) {
    const up = await fetch(`${OLD}/`).then(r => r.ok).catch(() => false);
    if (up) break;
    await new Promise(r => setTimeout(r, 250));
  }
}
const browser = await chromium.launch();
const open = async (host, route) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.route(/supabase\.co/, r => r.abort());
  await ctx.addInitScript(r => { try { localStorage.setItem(`rules-gate-seen:${r}`, '1'); localStorage.setItem('cookie-consent', 'essential'); } catch { /* none */ } }, route);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 200)));
  await page.goto(`${host}${route}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  return { ctx, page, errors };
};
const clickText = async (page, re) => {
  const ok = await page.evaluate(src => {
    const b = [...document.querySelectorAll('button')].find(x => new RegExp(src).test(x.textContent.trim()));
    if (b) b.click();
    return !!b;
  }, re.source);
  await page.waitForTimeout(400);
  return ok;
};
const getSave = async (page, key) => JSON.parse(await page.evaluate(k => localStorage.getItem(k), key) ?? 'null');
const putSave = async (page, key, s) => {
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [key, JSON.stringify(s)]);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
};
const buttons = async page => page.evaluate(() => [...document.querySelectorAll('button')].map(b => b.textContent.trim()).filter(t => t && t.length < 40).slice(0, 40).join(' | '));
const screen = async page => (await page.locator('main').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 260);

for (const { route, key, school, last } of ROUTES) {
  const tag = route.slice(1);
  console.log(`== ${tag}`);
  /* 1. the branch writes three seat saves: mid-season holding the seat, fired on the recap, and moved on the trail */
  const n = await open(NEW, route);
  await clickText(n.page, new RegExp(`^${school}Prestige`));
  const start = await getSave(n.page, key);
  const mid = JSON.parse(JSON.stringify(start));
  mid.st.round = 4;
  const fire = JSON.parse(JSON.stringify(start));
  fire.st.round = last;
  for (const p of fire.st.teams[fire.st.myTeam].players) p.ovr = 40;
  fire.st.seat.trust = 1;
  fire.st.seat.mandate = { ...fire.st.seat.mandate, tier: 'title', reqLevel: 4, winFloor: 0 };
  fire.st.seat.career.stints[0] = { ...fire.st.seat.career.stints[0], from: fire.st.season - 6, grades: Array(6).fill('title') };
  await putSave(n.page, key, fire);
  await clickText(n.page, /^Play$/);
  await clickText(n.page, PLAY);
  await n.page.waitForTimeout(1500);
  const firedSave = await getSave(n.page, key);
  say(firedSave?.phase === 'recap' && firedSave.st.seat?.career?.stints?.[0]?.ended === 'fired', `${tag}: the branch wrote a fired recap save (phase ${firedSave?.phase})`);
  await clickText(n.page, /^See who calls$/);
  await n.page.waitForTimeout(1200);
  let movedSave = null;
  if (await clickText(n.page, /^Take the job$/)) { await n.page.waitForTimeout(1200); movedSave = await getSave(n.page, key); }
  console.log(`   branch saves: mid round ${mid.st.round}; fired phase ${firedSave?.phase}; moved ${movedSave ? `${movedSave.phase} at ${movedSave.st.myTeam}` : 'none (no offer)'}`);
  await n.ctx.close();

  /* 2. the base build loads each, plays on, and writes its own save; 3. the branch loads that back */
  for (const [name, save] of [['mid', { st: mid.st, phase: 'season', recruits: null, portal: null }], ['fired', firedSave], ['moved', movedSave]]) {
    if (!save) continue;
    const o = await open(OLD, route);
    await putSave(o.page, key, save);
    const seen = await screen(o.page);
    const btn = await buttons(o.page);
    console.log(`   base loads ${name}: buttons [${btn.slice(0, 200)}]`);
    await o.page.screenshot({ path: path.join(OUT, `rb-${tag}-${name}-base.png`) });
    say(o.errors.length === 0, `${tag} ${name}: the base build threw on a seat save: ${o.errors.join(' | ')}`);
    /* play on in the base: the trail if offered, close the class, then one press */
    if (await clickText(o.page, /^Hit the recruiting trail$/)) await o.page.waitForTimeout(800);
    if (await clickText(o.page, /^Close the class, run it back$/)) await o.page.waitForTimeout(800);
    await clickText(o.page, /^Play$/);
    const pressed = await clickText(o.page, PLAY);
    const baseSave = await getSave(o.page, key);
    console.log(`   base plays on from ${name}: pressed ${pressed}, phase ${baseSave?.phase}, season ${baseSave?.st?.season} round ${baseSave?.st?.round} at ${baseSave?.st?.myTeam}, seat kept ${!!baseSave?.st?.seat}`);
    say(pressed, `${tag} ${name}: the base build could not play on from a seat save (screen: ${seen.slice(0, 120)})`);
    await o.ctx.close();
    const back = await open(NEW, route);
    await putSave(back.page, key, baseSave);
    const slot = await back.page.evaluate(() => [...document.querySelectorAll('[data-college-seat]')].map(e => e.getAttribute('data-college-seat')).join(','));
    const backSave = await getSave(back.page, key);
    console.log(`   branch loads it back: seat nodes [${slot}], buttons [${(await buttons(back.page)).slice(0, 160)}]`);
    await back.page.screenshot({ path: path.join(OUT, `rb-${tag}-${name}-back.png`) });
    say(back.errors.length === 0, `${tag} ${name}: the branch threw on the save the base wrote: ${back.errors.join(' | ')}`);
    await clickText(back.page, /^Play$/);
    const again = await clickText(back.page, PLAY) || await clickText(back.page, /^Hit the recruiting trail$/) || await clickText(back.page, /^Close the class, run it back$/);
    say(again, `${tag} ${name}: the branch cannot play on from the save the base wrote`);
    void backSave;
    await back.ctx.close();
  }
}
await browser.close();
console.log(fails ? `rb1320: ${fails} findings` : 'rb1320: clean');
process.exit(fails ? 1 : 0);
