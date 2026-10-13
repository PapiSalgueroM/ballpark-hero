// Round 1320 run-lens review walk: the athletic director played the way a player would, both college routes,
// at 390x844 and 1280x900, reduced motion on and off, the database host blocked. Pictures into RC_OUT.
// Probes what the builder's walk does not: an old save mid-season, the gate on "See who calls", a year out
// pressed twice, Take the job pressed twice, a reload on the new program's trail, the first season there graded.
import fs from 'node:fs';
import path from 'node:path';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const { chromium } = pw;
const BASE = process.env.BASE ?? process.env.SWEEP_BASE ?? 'http://localhost:4173';
const OUT = process.env.RC_OUT || path.resolve('.tmp-fx/review-walk');
fs.mkdirSync(OUT, { recursive: true });
const ROUTES = [
  { route: '/cfb-dynasty', key: 'cfb-dynasty-save-v1', school: 'Alabama', last: 12, champs: 'natties' },
  { route: '/cbb-dynasty', key: 'cbb-dynasty-save-v1', school: 'Kentucky', last: 10, champs: 'titles' },
];
const COMBOS = [[390, 844, false], [390, 844, true], [1280, 900, false], [1280, 900, true]];
const PLAY = /^(Play (Week|Round) \d+|Final week \+ the Playoff|Final round \+ March)$/;

let fails = 0;
const notes = [];
const say = (ok, what) => { if (!ok) { fails += 1; console.log(`  FAIL ${what}`); } return ok; };
const log = s => { console.log(`  ${s}`); notes.push(s); };

const browser = await chromium.launch();
const fresh = async (vw, vh, route, rm) => {
  const ctx = await browser.newContext({ viewport: { width: vw, height: vh }, reducedMotion: rm ? 'reduce' : 'no-preference' });
  await ctx.route(/supabase\.co/, r => r.abort());
  await ctx.addInitScript(r => { try { localStorage.setItem(`rules-gate-seen:${r}`, '1'); localStorage.setItem('cookie-consent', 'essential'); } catch { /* none */ } }, route);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 200)));
  return { ctx, page, errors };
};
const clickText = async (page, re, times = 1) => {
  const ok = await page.evaluate(([src, n]) => {
    const b = [...document.querySelectorAll('button')].find(x => new RegExp(src).test(x.textContent.trim()));
    if (!b) return false;
    for (let i = 0; i < n; i += 1) b.click();
    return true;
  }, [re.source, times]);
  await page.waitForTimeout(250);
  return ok;
};
const getSave = async (page, key) => JSON.parse(await page.evaluate(k => localStorage.getItem(k), key) ?? 'null');
const putSave = async (page, key, s) => {
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [key, JSON.stringify(s)]);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
};
const shot = async (page, name, sel) => {
  if (sel) await page.locator(sel).first().scrollIntoViewIfNeeded().catch(() => {});
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: false });
};
const text = async (page, sel) => page.locator(sel).first().innerText().catch(() => '');
const count = async (page, sel) => page.locator(sel).count();
const has = async (page, re) => page.evaluate(src => [...document.querySelectorAll('button')].some(x => new RegExp(src).test(x.textContent.trim())), re.source);
/** Press Play until the recap shows (or nothing to press). */
const playOut = async page => {
  await clickText(page, /^Play$/);
  for (let i = 0; i < 40; i += 1) {
    if (await count(page, '[data-college-seat="recap"], [data-college-seat="fired"]') > 0) break;
    if (!await clickText(page, PLAY)) break;
    await page.waitForTimeout(120);
  }
  await page.waitForTimeout(1800);
};

for (const { route, key, school, last, champs } of ROUTES) {
  for (const [vw, vh, rm] of COMBOS) {
    const tag = `${route.slice(1)}-${vw}-${rm ? 'rm' : 'anim'}`;
    console.log(`== ${tag}`);
    const { ctx, page, errors } = await fresh(vw, vh, route, rm);
    await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-college-seat="pick"]', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(700);
    if (!rm) await shot(page, `${tag}-a-pick`);
    log(`${tag} pick line: ${await text(page, '[data-college-seat="pick"]')}`);
    say(await clickText(page, new RegExp(`^${school}Prestige`)), `${tag}: picked ${school}`);
    await page.waitForTimeout(600);
    const start = await getSave(page, key);
    say(!!start?.st?.seat, `${tag}: a new dynasty holds st.seat`);
    if (!rm) await shot(page, `${tag}-b-tile`);

    /* the card and its "?", read once a route */
    if (vw === 390 && !rm) {
      await page.locator('[data-college-seat="tile"]').click();
      await page.waitForTimeout(500);
      await shot(page, `${tag}-c-card`, '[data-college-seat="card"]');
      log(`${tag} card: ${(await text(page, '[data-college-seat="card"]')).replace(/\s+/g, ' ').slice(0, 600)}`);
      await page.locator('[aria-label="How the athletic director works"]').click().catch(() => {});
      await page.waitForTimeout(500);
      log(`${tag} rules: ${(await text(page, '[data-college-seat="rules"]')).replace(/\s+/g, ' ')}`);
      await shot(page, `${tag}-d-rules`, '[data-college-seat="rules"]');
      await page.locator('[data-college-seat="rules"] button:has-text("Back")').click().catch(() => {});
      await page.waitForTimeout(300);
      await page.locator('[data-college-seat="card"] button:has-text("Back")').click().catch(() => {});
      await page.waitForTimeout(300);
    }

    /* an older dynasty, never opted in, in the middle of a season */
    {
      const old = JSON.parse(JSON.stringify(start));
      delete old.st.seat;
      old.st.round = 4;
      await putSave(page, key, old);
      await clickText(page, /^Play$/);
      const before = await page.evaluate(k => localStorage.getItem(k), key);
      log(`${tag} old save round 4: slot=${await page.evaluate(() => [...document.querySelectorAll('[data-college-seat]')].map(e => e.getAttribute('data-college-seat')).join(','))} text="${(await text(page, '[data-college-seat="passed"]')).replace(/\s+/g, ' ')}"`);
      say(await count(page, '[data-college-seat="optin"]') === 0, `${tag}: no offer mid-season`);
      if (!rm) await shot(page, `${tag}-e-old-midseason`);
      await clickText(page, PLAY);
      await page.waitForTimeout(400);
      const after = await getSave(page, key);
      say(after && after.st.seat === undefined, `${tag}: an old save gains no seat from a press mid-season`);
      say(before !== JSON.stringify(after), `${tag}: the press did play a round`);
    }

    /* the fired flow: the same start at the last round, a gutted roster, one trust point, a title ask */
    const fire = JSON.parse(JSON.stringify(start));
    fire.st.round = last;
    for (const p of fire.st.teams[fire.st.myTeam].players) p.ovr = 40;
    fire.st.seat.trust = 1;
    fire.st.seat.mandate = { ...fire.st.seat.mandate, tier: 'title', reqLevel: 4, winFloor: 0 };
    await putSave(page, key, fire);
    await clickText(page, /^Play$/);
    await clickText(page, PLAY);
    await page.waitForTimeout(120);
    const gate = await page.evaluate(() => {
      const w = document.querySelector('[data-college-seat="calls"]');
      if (!w) return null;
      const cs = getComputedStyle(w);
      const r = w.getBoundingClientRect();
      return { vis: cs.visibility, op: cs.opacity, x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });
    log(`${tag} See who calls 120 ms after the final press: ${JSON.stringify(gate)}`);
    if (gate && gate.y > 0 && gate.y < vh) {
      await page.mouse.click(gate.x, gate.y);
      await page.waitForTimeout(150);
      const early = await count(page, '[data-college-seat="market"]');
      if (rm) say(gate.vis === 'visible' && Number(gate.op) === 1, `${tag}: under reduced motion See who calls is on its last frame at once`);
      else say(early === 0 && gate.vis === 'hidden', `${tag}: See who calls pressed before it showed (vis ${gate.vis}, market ${early})`);
    }
    await page.waitForTimeout(1800);
    const firedSave = await getSave(page, key);
    say(firedSave?.phase === 'recap' || await count(page, '[data-college-seat="market"]') > 0, `${tag}: fired save stays on phase recap (got ${firedSave?.phase})`);
    if (await count(page, '[data-college-seat="fired"]')) {
      await shot(page, `${tag}-f-fired`, '[data-college-seat="fired"]');
      log(`${tag} fired: ${(await text(page, '[data-college-seat="fired"]')).replace(/\s+/g, ' ')}`);
    }
    say(await count(page, '[data-college-seat="fired"]') === 1 || await count(page, '[data-college-seat="market"]') === 1, `${tag}: trust at zero shows the fired recap`);
    await clickText(page, /^See who calls$/);
    await page.waitForTimeout(1200);
    log(`${tag} market (as fired): ${(await text(page, '[data-college-seat="market"]')).replace(/\s+/g, ' ').slice(0, 500)}`);
    if (vw === 390 || !rm) await shot(page, `${tag}-g-market`);

    /* a year out: the first record whose keyed feed is quiet with next year open, pressed twice at once */
    const base = await getSave(page, key);
    let quiet = null;
    const fills = ['met', 'missed', 'overachieved'];
    for (let t = 0; t <= 9 && !quiet; t += 1) {
      for (const f of fills) {
        const s = JSON.parse(JSON.stringify(base));
        const st0 = s.st.seat.career.stints[0];
        const lastG = st0.grades[st0.grades.length - 1];
        s.st.seat.career.stints[0] = { ...st0, from: s.st.season - t, grades: [...Array(t).fill(f), lastG] };
        await putSave(page, key, s);
        if (await has(page, /^Sit the year out$/) && !await has(page, /^Take the job$/)) { quiet = s; break; }
      }
    }
    if (say(!!quiet, `${tag}: no record drew a quiet market with a year out on offer`)) {
      const b4 = await getSave(page, key);
      await clickText(page, /^Sit the year out$/, 2);
      await page.waitForTimeout(2500);
      const af = await getSave(page, key);
      log(`${tag} year out: season ${b4.st.season} to ${af.st.season}, seasonsOut ${b4.st.seat.career.seasonsOut} to ${af.st.seat.career.seasonsOut}, phase ${af.phase}, titles ${b4.st.myTitles} to ${af.st.myTitles}, played ${b4.st.seasonsPlayed} to ${af.st.seasonsPlayed}`);
      say(af.st.season === b4.st.season + 1 && af.st.seat.career.seasonsOut === b4.st.seat.career.seasonsOut + 1, `${tag}: one press of Sit the year out, pressed twice, is one year`);
      say(af.phase === 'recap' && af.st.myTitles === b4.st.myTitles && af.st.seasonsPlayed === b4.st.seasonsPlayed, `${tag}: the year out keeps the record and saves on recap`);
      const mk = (await text(page, '[data-college-seat="market"]')).replace(/\s+/g, ' ');
      log(`${tag} market after the year out: ${mk.slice(0, 500)}`);
      const champ = (af.st[champs] ?? []).find(c => c.season === af.st.season)?.team;
      log(`${tag} the engine's champion of ${af.st.season}: ${champ}`);
      await shot(page, `${tag}-h-after-yearout`);
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(1200);
      say((await text(page, '[data-college-seat="market"]')).replace(/\s+/g, ' ') === mk, `${tag}: a reload after the year out reads the same market`);
    }

    /* Take the job, pressed twice at once; then a reload on the new trail; then the first season there */
    let offerSave = null;
    const fired0 = await getSave(page, key);
    for (let t = 3; t <= 14 && !offerSave; t += 1) {
      const s = JSON.parse(JSON.stringify(fired0));
      const st0 = s.st.seat.career.stints[0];
      const lastG = st0.grades[st0.grades.length - 1];
      s.st.seat.career.stints[0] = { ...st0, from: s.st.season - t - s.st.seat.career.seasonsOut, grades: [...Array(t).fill('title'), lastG] };
      await putSave(page, key, s);
      if (await has(page, /^Take the job$/)) offerSave = s;
    }
    if (say(!!offerSave, `${tag}: no record drew an offer`)) {
      await page.waitForTimeout(1200);
      const offerAsk = await page.evaluate(() => {
        const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'Take the job');
        const card = b?.closest('.rounded-2xl');
        return card ? [...card.querySelectorAll('p')].map(p => p.textContent.trim()) : [];
      });
      log(`${tag} first offer: ${offerAsk.join(' / ')}`);
      const b4 = await getSave(page, key);
      await clickText(page, /^Take the job$/, 2);
      await page.waitForTimeout(1500);
      const af = await getSave(page, key);
      const stints = af.st.seat?.career?.stints ?? [];
      log(`${tag} took a job: ${b4.st.myTeam} to ${af.st.myTeam}, stints ${b4.st.seat.career.stints.length} to ${stints.length}, phase ${af.phase}, new stint from ${stints.at(-1)?.from}, season ${af.st.season}, mandate ${af.st.seat?.mandate?.season} "${af.st.seat?.mandate?.text}"`);
      say(af.phase === 'recruit' && stints.length === b4.st.seat.career.stints.length + 1 && af.st.myTeam !== b4.st.myTeam, `${tag}: Take the job pressed twice moves him once`);
      if (!rm) await shot(page, `${tag}-i-new-trail`);
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(1200);
      const rl = await getSave(page, key);
      say(await has(page, /^Close the class, run it back$/), `${tag}: a reload on the new trail stays on the trail`);
      await clickText(page, /^Close the class, run it back$/);
      await page.waitForTimeout(900);
      const s2 = await getSave(page, key);
      say(!!s2.st.seat && s2.st.seat.career.stints.length === stints.length, `${tag}: the seat survives the reload and the offseason (stints ${s2.st.seat?.career?.stints?.length})`);
      const tileAsk = (await text(page, '[data-college-seat="tile"]')).replace(/\s+/g, ' ');
      log(`${tag} the new program's tile: ${tileAsk}`);
      say(offerAsk.some(l => tileAsk.includes(l)), `${tag}: the tile carries the ask the offer showed`);
      if (!rm) await shot(page, `${tag}-j-new-tile`);
      await playOut(page);
      const s3 = await getSave(page, key);
      const cur = s3.st.seat?.career?.stints?.at(-1);
      log(`${tag} first season at ${s3.st.myTeam}: grades ${JSON.stringify(cur?.grades)}, trust ${s3.st.seat?.trust}, recap line "${(await text(page, '[data-college-seat="recap"]')).replace(/\s+/g, ' ')}" fired ${await count(page, '[data-college-seat="fired"]')}`);
      say(cur?.grades?.length === 1, `${tag}: the first season at the new program is graded once`);
      say(await count(page, '[data-college-seat="recap"], [data-college-seat="fired"]') === 1, `${tag}: the recap carries the grade at the new program`);
      await shot(page, `${tag}-k-new-recap`, '[data-college-seat="recap"], [data-college-seat="fired"]');
      void rl;
    }
    await ctx.close();
    console.log(`   ${tag}: page errors ${errors.length} ${errors.slice(0, 2).join(' | ')}`);
    say(errors.length === 0, `${tag}: page errors`);
  }
}
await browser.close();
fs.writeFileSync(path.join(OUT, 'walk-notes.txt'), notes.join('\n'));
console.log(fails ? `walk1320: ${fails} findings` : 'walk1320: clean');
process.exit(fails ? 1 : 0);
