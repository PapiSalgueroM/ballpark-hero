/* Reviewer probe, Round 1550: saves MADE by the base's served build (ff089e55, Round 1533 merged with main, on
 * BASE_OLD) loaded on the head's served build (BASE), each drawn on both, at 390x844, reduced motion on.
 * What a player sees (the career tiles, the out of work card, the headings, the week chip, the button labels) and the
 * save the page writes back after the load must be the same on both, once the head's kit has landed. */
import pw from '../../scripts/lib/playwrightLoader.mjs';
import { answerConsent } from '../../scripts/lib/answerConsent.mjs';

const { chromium } = pw;
const HEAD = process.env.BASE ?? 'http://localhost:4173';
const OLD = process.env.BASE_OLD ?? 'http://localhost:4174';
const KEY = 'front-office-save-v1';
const ROUTE = '/front-office';
const ASK = 'Win the Super Bowl. Anything less is a failed season upstairs.';
const wait = ms => new Promise(r => setTimeout(r, ms));
let checks = 0, failed = 0;
const say = (cond, msg) => { checks++; if (!cond) failed++; console.log(`${cond ? 'ok  ' : 'FAIL'} ${msg}`); return cond; };
const browser = await chromium.launch();
async function openPage() {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.route(/supabase\.co/, r => r.abort());
  const errors = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 200)));
  return { ctx, page, errors };
}
const readSave = page => page.evaluate(k => JSON.parse(localStorage.getItem(k) || 'null'), KEY);
const writeSave = (page, s) => page.evaluate(([k, v]) => localStorage.setItem(k, JSON.stringify(v)), [KEY, s]);
const careerBox = (page, title) => page.locator(`[data-gm-desk="tiles"] button:has(div.uppercase:text-is("${title}"))`).first();
const waitPhase = (page, phase) => page.waitForFunction(([k, p]) => JSON.parse(localStorage.getItem(k) || '{}').phase === p, [KEY, phase], { timeout: 30000 });
const clone = o => JSON.parse(JSON.stringify(o));

/* 1. the saves, made by the base's build */
const saves = {};
{
  const { ctx, page } = await openPage();
  await page.goto(`${OLD}${ROUTE}`, { waitUntil: 'networkidle' });
  await wait(900);
  await answerConsent(page);
  await page.locator('.grid button').first().click();
  await waitPhase(page, 'hub');
  await wait(600);
  const start = await readSave(page);
  saves.midseason = Object.assign(clone(start), { league: Object.assign(clone(start.league), { week: 9 }) });
  const pre = clone(saves.midseason);
  pre.seasonsPlayed = 3; pre.titles = 1;
  if (pre.gm?.blocks) { delete pre.gm.blocks.seat; delete pre.gm.blocks.xp; }
  saves.pre1533mid = pre;
  const doomed = clone(start);
  doomed.trust = 5;
  doomed.mandate = { tier: 'title', text: ASK, winFloor: 0, reqLevel: 4, season: doomed.league.season };
  for (const p of doomed.league.teams[doomed.myTeam].players) p.ovr = 60;
  doomed.league.week = 17;
  saves.week17 = doomed;
  await writeSave(page, doomed);
  await page.reload({ waitUntil: 'networkidle' });
  await wait(900);
  await answerConsent(page);
  await page.locator('button:has(div.uppercase)').filter({ hasText: /This week/i }).first().click();
  await wait(500);
  await page.locator('button:has-text("Play the final week")').last().click();
  await page.waitForFunction(k => JSON.parse(localStorage.getItem(k) || '{}').fired === true, KEY, { timeout: 60000 });
  await wait(1500);
  saves.recapFired = await readSave(page);
  await page.locator('button:has-text("See who is calling")').first().click();
  await wait(900);
  saves.fired = await readSave(page);
  const pf = clone(saves.fired);
  if (pf.gm?.blocks) { delete pf.gm.blocks.seat; delete pf.gm.blocks.xp; }
  saves.pre1533fired = pf;
  await careerBox(page, 'Job market').click();
  await page.locator('[data-gm-market]').first().waitFor({ timeout: 30000 });
  const ids = await page.locator('[data-gm-offer]').evaluateAll(bs => bs.map(b => b.getAttribute('data-gm-offer')));
  if (ids.length) {
    await page.locator(`[data-gm-offer="${ids[0]}"]`).click(); await wait(300);
    await page.locator('[data-gm-take]').click(); await wait(300);
    await page.locator('[data-gm-take]').click(); await wait(1500);
    saves.arrival = await readSave(page);
    const press = page.locator('[data-gm-press] button').first();
    if (await press.count()) { await press.click(); await wait(500); }
    await page.locator('button:has-text("Go to the draft")').first().click();
    await wait(700);
    saves.draft = await readSave(page);
  }
  console.log(`made on the base: ${Object.entries(saves).map(([k, s]) => `${k} (${s.phase}, week ${s.league.week}, fired ${s.fired})`).join('; ')}`);
  await ctx.close();
}

/* 2. each save drawn on the base and on the head */
async function view(origin, save, tag) {
  const { ctx, page, errors } = await openPage();
  await page.goto(`${origin}${ROUTE}`, { waitUntil: 'networkidle' });
  await wait(700);
  await answerConsent(page);
  await writeSave(page, save);
  await page.reload({ waitUntil: 'networkidle' });
  await wait(1200);
  await answerConsent(page);
  const settled = await page.waitForFunction(() => !document.querySelector('[data-gm-panel-loading]') && !document.querySelector('[data-career-kit-failed]'), null, { timeout: 30000 }).then(() => true, () => false);
  await wait(600);
  const v = await page.evaluate(() => {
    const t = s => [...document.querySelectorAll(s)].map(e => e.innerText.split('\n').map(x => x.trim()).filter(Boolean).join(' ')).join(' | ');
    const board = document.querySelector('[data-week-chip]')?.closest('.space-y-4') ?? document.querySelector('main');
    return {
      tiles: t('[data-gm-desk="tiles"]'), out: t('[data-gm-out-of-work]'), heads: t('main h2, main h3').slice(0, 400), chip: t('[data-week-chip]'),
      buttons: [...(board ?? document).querySelectorAll('button')].map(b => `${b.innerText.trim().split('\n')[0]}${b.disabled ? '(off)' : ''}`).filter(x => x.length > 1).slice(0, 40).join(' / '),
    };
  });
  const after = await readSave(page);
  await ctx.close();
  return { v, after, errors, settled };
}
for (const [name, save] of Object.entries(saves)) {
  const b = await view(OLD, save, `${name} base`);
  const h = await view(HEAD, save, `${name} head`);
  say(h.settled, `${name}: the head settles (no holding box, no retry card) within 30 s`);
  for (const k of Object.keys(b.v)) {
    if (!say(b.v[k] === h.v[k], `${name}: ${k} the same on the base and the head`)) {
      console.log(`   base: ${b.v[k].slice(0, 300)}`);
      console.log(`   head: ${h.v[k].slice(0, 300)}`);
    }
  }
  if (name === 'midseason' || name === 'pre1533mid' || name === 'fired' || name === 'pre1533fired') console.log(`   ${name} tiles: ${h.v.tiles.slice(0, 260)}`);
  const ba = JSON.stringify(b.after), ha = JSON.stringify(h.after);
  say(ba === ha, `${name}: the save written back after the load is the same on both (${ba === ha ? 'identical' : `base ${ba.length} chars, head ${ha.length}`})`);
  say(h.errors.length === 0, `${name}: no page error on the head (${h.errors[0] ?? 'clean'})`);
  if (b.errors.length) console.log(`   base page errors: ${b.errors[0]}`);
}
await browser.close();
console.log(`oldSaves: ${checks} checks, ${failed} failed`);
process.exit(failed ? 1 : 0);
