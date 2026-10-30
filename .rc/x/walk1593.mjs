// Reviewer walk for Round 1593 (a runner only, sent as .rc/x/walk1593.mjs, #!serve #!playwright). Plays the Europa
// League the way a player does, at 390x844 and 1280x900, reduced motion on and off, every host but the served one
// and the font hosts aborted (supabase.co with them). Saves are built by the engine here, never committed.
//   A  Everton before matchday 1: hub card, Play Live through to the report, back to the hub, Cups, the screen,
//      the table, the ?, the calendar, the stats centre.
//   K  the same career on to a knockout second leg: hub card, the shootout order link, Quick Sim, the result.
//   R  the same career on to its last match: Quick Sim, See Season Review, the Europa League line.
// Prints NOTE lines (facts read) and FIND lines (things that look wrong); exit 0 always unless it could not run (2).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const { engineOf, tape } = await import(path.join(ROOT, 'scripts/lib/worldUclFleet.mjs'));
const { chromium } = await import(path.join(ROOT, 'scripts/lib/playwrightLoader.mjs'));
const OUT = path.join(process.env.RC_OUT || path.join(ROOT, '.tmp-walk'), 'shots');
fs.mkdirSync(OUT, { recursive: true });
const BASE = process.env.BASE || process.env.SWEEP_BASE || 'http://localhost:4173';
const cannot = why => { console.log(`walk1593: could not run. ${why}`); process.exit(2); };
const note = s => console.log(`NOTE ${s}`);
const finds = [];
const find = s => { finds.push(s); console.log(`FIND ${s}`); };
const opts = { skipHalftime: true, noCoach: true };

/* ---------- saves ---------- */
const E = await engineOf(ROOT, 'walk1593', {}, cannot);
const M = await E.fresh();
const clone = s => JSON.parse(JSON.stringify(s));
const itemsOf = s => { M.store.clear(); if (!M.cm.saveCareer(s)) cannot('saveCareer refused'); return [...M.store.entries()]; };
let s = tape(0x1509a, () => M.cm.startCareer('Everton')).value;
for (let i = 0; i < 400 && s.week < s.calendar.length; i += 1) s = tape(0x1509a + 1 + i, () => M.cm.playNextEntry(s, opts)).value.state;
const fin = tape(0x1509b, () => M.cm.finishSeason(s)).value.state;
const final = (fin.cupBracket ?? []).find(t => t.round === 'F');
if (!final) cannot('no cup final');
final.winner = 'Everton';
let p = tape(0x1509c, () => M.cm.startNextSeason(fin)).value;
note(`season two: me ${p.worldComps?.uel?.me} earned ${p.worldComps?.uel?.earned} nights ${p.calendar.filter(e => e.type === 'uel').length} league ${M.cm.careerLeagueOf(p).id} calendar ${p.calendar.length}`);
for (let i = 0; i < 80 && M.cm.nextFixture(p)?.competition !== 'uel'; i += 1) p = tape(0x1593a + i, () => M.cm.playNextEntry(p, opts)).value.state;
const fxA = M.cm.nextFixture(p);
note(`A next: ${JSON.stringify({ c: fxA?.competition, l: fxA?.compLabel, o: fxA?.opponent, h: fxA?.home })} week ${p.week}`);
const saves = { A: { items: itemsOf(p), fx: fxA } };
/* K and R: a participant season two (a club handed its cup in season one), on a stream where the manager is never
   sacked (a sacked save shows the out of work screen, not the hub), to a knockout second leg (K) and on to the
   season's last entry (R). Clubs tried in order; the first that reaches both wins. */
let K = null;
let R = null;
function seasonTwo(club, salt) {
  let t = tape(0x2a000 + salt, () => M.cm.startCareer(club)).value;
  for (let i = 0; i < 400 && t.week < t.calendar.length; i += 1) t = tape(0x2a100 + salt * 512 + i, () => M.cm.playNextEntry(t, opts)).value.state;
  const f = tape(0x2a200 + salt, () => M.cm.finishSeason(t)).value.state;
  const cf = (f.cupBracket ?? []).find(x => x.round === 'F');
  if (cf) cf.winner = club;
  const n = tape(0x2a300 + salt, () => M.cm.startNextSeason(f)).value;
  return n.worldComps?.uel?.me === club ? n : null;
}
const KCLUBS = ['Everton', 'Crystal Palace', 'Brentford', 'Fulham', 'Nottingham Forest', 'Bournemouth'];
for (let c = 0; c < KCLUBS.length && !R; c += 1) {
  const start = KCLUBS[c] === 'Everton' ? p : seasonTwo(KCLUBS[c], c);
  if (!start) { note(`K: ${KCLUBS[c]} does not play season two's Europa League on its crafted cup`); continue; }
  for (let a = 0; a < 10 && !R; a += 1) {
    let q = clone(start);
    let k = null;
    let sackedAt = null;
    for (let i = 0; i < 260; i += 1) {
      if (q.sacked) { sackedAt = q.week; break; }
      if (q.week >= q.calendar.length - 1) break;
      const fx = M.cm.nextFixture(q);
      if (!k && fx?.competition === 'uel' && /second leg/.test(fx.compLabel ?? '')) k = { q: clone(q), fx };
      q = tape(0x7000 + c * 65536 + a * 4096 + i, () => M.cm.playNextEntry(q, opts)).value.state;
    }
    if (q.sacked) sackedAt = q.week;
    note(`K try ${KCLUBS[c]} ${a}: ${k ? 'second leg found' : 'no second leg'}, ${sackedAt !== null ? `SACKED at week ${sackedAt}` : `reached week ${q.week} of ${q.calendar.length}`}`);
    if (k && sackedAt === null && q.week === q.calendar.length - 1) { K = { ...k, a, club: KCLUBS[c] }; R = q; }
  }
}
if (K) {
  note(`K: ${K.club} attempt ${K.a}: ${K.fx.compLabel} ${K.fx.home ? 'v' : 'at'} ${K.fx.opponent} week ${K.q.week}`);
  saves.K = { items: itemsOf(K.q), fx: K.fx, club: K.club };
  note(`R: week ${R.week} of ${R.calendar.length}, last entry ${JSON.stringify(R.calendar[R.week]).slice(0, 80)}, uel ${M.cm.uelRunWords(R)}, board ${Math.round(R.boardConfidence)}`);
  saves.R = { items: itemsOf(R), club: K.club };
} else note('K: no club and stream reached a knockout second leg and the season end unsacked');

/* ---------- the page ---------- */
for (let i = 0; i < 60; i += 1) {
  if (await fetch(`${BASE}/robots.txt`).then(r => r.ok).catch(() => false)) break;
  if (i === 59) cannot(`nothing served at ${BASE}`);
  await new Promise(r => setTimeout(r, 500));
}
const browser = await chromium.launch();
const squash = t => (t || '').replace(/\s+/g, ' ').trim();
async function open(items, [w, h], reduced, tag) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: reduced ? 'reduce' : 'no-preference',
    isMobile: w < 500, hasTouch: w < 500, serviceWorkers: 'block' });
  await ctx.route('**/*', route => {
    const u = new URL(route.request().url());
    if (u.origin === new URL(BASE).origin || ['fonts.googleapis.com', 'fonts.gstatic.com'].includes(u.hostname)) return route.continue();
    return route.abort('blockedbyclient');
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 200)));
  await page.goto(`${BASE}/robots.txt`);
  await page.evaluate(entries => { localStorage.clear(); localStorage.setItem('cookie-consent', 'essential'); for (const [k, v] of entries) localStorage.setItem(k, v); }, items);
  await page.goto(`${BASE}/club-manager`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(1500);
  for (let i = 0; i < 3 && await page.locator('[role="dialog"][data-state="open"]').count(); i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(250); }
  await press(page, page.getByRole('button', { name: 'Resume Career', exact: true }), 8000);
  await page.waitForTimeout(1200);
  const shot = async (name, full = false) => page.screenshot({ path: path.join(OUT, `${tag}-${name}.png`), fullPage: full }).catch(() => {});
  return { ctx, page, errors, shot };
}
async function press(page, loc, ms = 4000) {
  try { await loc.first().waitFor({ state: 'visible', timeout: ms }); await loc.first().scrollIntoViewIfNeeded().catch(() => {}); await loc.first().click({ timeout: ms }); await page.waitForTimeout(500); return true; } catch { return false; }
}
const textOf = async (page, sel) => squash(await page.locator(sel).first().innerText({ timeout: 3000 }).catch(() => ''));
async function sideways(page, where) {
  const m = await page.evaluate(() => {
    const vw = window.innerWidth;
    const off = [...document.querySelectorAll('body *')].filter(el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.right > vw + 2 && getComputedStyle(el).position !== 'fixed'; }).slice(0, 4).map(el => `${el.tagName}.${String(el.className).slice(0, 30)} "${(el.textContent || '').trim().slice(0, 30)}"`);
    return { sw: document.scrollingElement.scrollWidth, vw, off };
  });
  if (m.sw > m.vw + 1) find(`${where}: the page scrolls sideways (${m.sw} > ${m.vw}): ${m.off.join(' | ')}`);
}
async function anims(page, where, reduced) {
  const a = await page.evaluate(() => document.getAnimations().filter(x => x.playState === 'running').map(x => `${x.animationName || x.constructor.name}:${x.effect?.getTiming?.().iterations}`));
  if (reduced && a.some(x => /Infinity/.test(x))) find(`${where}: with reduced motion ${a.length} animations run, infinite ones: ${a.filter(x => /Infinity/.test(x)).slice(0, 4).join(', ')}`);
  note(`${where}: running animations ${a.length} (${a.slice(0, 5).join(', ')})`);
}
async function back(page) {
  for (const loc of [page.getByRole('button', { name: 'Back to the club page' }), page.locator('button:visible').filter({ hasText: /^\s*(Continue|Back to the hub|Done|Close)\b/ })]) {
    if (await press(page, loc, 1500)) return true;
  }
  return false;
}

async function toCups(page) {
  return (await press(page, page.getByRole('button').filter({ has: page.getByText('Cups', { exact: true }) }), 15000))
    && await page.locator('[data-cm-cups-view="tiles"]').waitFor({ timeout: 15000 }).then(() => true).catch(() => false);
}
async function untilReport(page, ms = 150000) {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline && !(await page.locator('[data-cm-timeline]').count())) {
    for (const name of ['Full report', 'Second half', 'Extra time', 'Penalties', 'Skip']) {
      const b = page.locator('button:visible').filter({ hasText: new RegExp(`^\\s*${name}\\s*$`) });
      if (await b.count()) { await b.first().click().catch(() => {}); await page.waitForTimeout(700); break; }
    }
    await page.waitForTimeout(500);
  }
  return page.locator('[data-cm-timeline]').count();
}

async function caseA(size, reduced) {
  const tag = `A-${size[0]}-${reduced ? 'rm' : 'mo'}`;
  const { ctx, page, errors, shot } = await open(saves.A.items, size, reduced, tag);
  try {
    await shot('1hub');
    note(`${tag} hub card: ${await textOf(page, '[data-cm-next-match]')} | ${(await textOf(page, '#root')).match(/Europa League[^|]{0,90}/)?.[0] ?? 'NO Europa League words on the hub'}`);
    await anims(page, `${tag} hub`, reduced);
    await sideways(page, `${tag} hub`);
    if (await page.locator('[data-cm-shootout-link]').count()) find(`${tag}: the shootout order link shows on a league phase night`);
    if (!(await press(page, page.locator('button:visible[data-cm-way="live"]')))) { find(`${tag}: no Play Live button`); await shot('x-nolive'); return; }
    await page.waitForTimeout(2500);
    await shot('2live');
    note(`${tag} live strip: ${await textOf(page, '[data-cm-live-strip]')}`);
    await sideways(page, `${tag} live`);
    await anims(page, `${tag} live`, reduced);
    if (!(await untilReport(page))) { find(`${tag}: the match report never came`); await shot('x-stuck'); return; }
    await page.waitForTimeout(3000);
    await shot('3report');
    const rep = await textOf(page, '#root');
    note(`${tag} report: ${(rep.match(/FULL TIME.{0,200}|Full time.{0,200}/i) ?? [rep.slice(0, 200)])[0]}`);
    if (!/Europa League/i.test(rep)) find(`${tag}: the match report never says Europa League`);
    await anims(page, `${tag} report`, reduced);
    if (!(await back(page))) find(`${tag}: no way back from the report`);
    await page.waitForTimeout(1500);
    await shot('4hub-after');
    note(`${tag} hub after: ${await textOf(page, '[data-cm-next-match]')}`);
    if (!(await toCups(page))) { find(`${tag}: Cups did not open`); return; }
    await shot('5cups');
    note(`${tag} uel tile: ${await textOf(page, '[data-cm-world-tile="uel"]')}`);
    await sideways(page, `${tag} cups`);
    if (!(await press(page, page.locator('[data-cm-world-tile="uel"]')))) { find(`${tag}: the Europa League tile cannot be pressed`); return; }
    await shot('6screen');
    note(`${tag} screen: ${(await textOf(page, '[data-cm-cups-view="uel"]')).slice(0, 300)}`);
    await page.locator('[data-cm-cups-view="uel"]').first().screenshot({ path: path.join(OUT, `${tag}-6screen-el.png`) }).catch(() => {});
    if (await press(page, page.locator('[data-cm-world-help-toggle]'))) {
      await page.locator('[data-cm-world-help="uel"]').first().screenshot({ path: path.join(OUT, `${tag}-7help-el.png`) }).catch(() => {});
      note(`${tag} help: ${(await textOf(page, '[data-cm-world-help="uel"]')).slice(0, 500)}`);
      await press(page, page.locator('[data-cm-world-help-toggle]'));
    }
    if (await press(page, page.locator('[data-cm-world-tile="table"]'))) {
      await shot('8table');
      if (await press(page, page.locator('[data-cm-world-table] [data-club="Everton"]'))) {
        await shot('9run');
        const rec = await page.locator('[data-cm-world-run-row="recorded"]').count();
        const up = await page.locator('[data-cm-world-run-row="upcoming"]').count();
        note(`${tag} run: ${rec} played, ${up} to come; played row "${await textOf(page, '[data-cm-world-run-row="recorded"]')}"`);
        if (rec !== 1 || up !== 7) find(`${tag}: Everton's run shows ${rec} played and ${up} to come after matchday 1 played through the page`);
      } else find(`${tag}: Everton cannot be pressed in the table`);
    } else find(`${tag}: no table tile`);
    if (errors.length) find(`${tag}: page errors ${errors.slice(0, 2).join(' | ')}`);
  } finally { await ctx.close(); }
}

/** The calendar's month grid and the stats centre, on the save before matchday 1. */
async function caseC(size, reduced) {
  const tag = `C-${size[0]}-${reduced ? 'rm' : 'mo'}`;
  const { ctx, page, errors, shot } = await open(saves.A.items, size, reduced, tag);
  try {
    if (await press(page, page.getByRole('button').filter({ has: page.getByText('Calendar', { exact: true }) }), 15000)) {
      await page.waitForTimeout(1200);
      await shot('1calendar');
      const labels = await page.locator('[data-testid="cm-calendar-grid"] button').evaluateAll(els => els.map(e => e.getAttribute('aria-label') || '').filter(l => /Europa League/.test(l)));
      note(`${tag} calendar Europa League days this month: ${labels.join(' / ') || 'none'}`);
      for (const l of labels) if (!/^Thu /.test(l)) find(`${tag}: a Europa League day not on a Thursday: ${l}`);
      await press(page, page.getByRole('button', { name: 'Next month', exact: true }));
      await shot('2calendar-next');
      const labels2 = await page.locator('[data-testid="cm-calendar-grid"] button').evaluateAll(els => els.map(e => e.getAttribute('aria-label') || '').filter(l => /Europa League/.test(l)));
      note(`${tag} next month: ${labels2.join(' / ') || 'none'}`);
      await sideways(page, `${tag} calendar`);
    } else find(`${tag}: the calendar did not open`);
    if (errors.length) find(`${tag}: page errors ${errors.slice(0, 2).join(' | ')}`);
  } finally { await ctx.close(); }
}

/** A knockout second leg: the hub card, the shootout link, Quick Sim, the result, the hub and Cups after. */
async function caseK(size, reduced) {
  const tag = `K-${size[0]}-${reduced ? 'rm' : 'mo'}`;
  const { ctx, page, errors, shot } = await open(saves.K.items, size, reduced, tag);
  try {
    await shot('1hub');
    note(`${tag} hub card: ${await textOf(page, 'xpath=//*[@data-cm-next-match]/..')}`);
    await page.locator('xpath=//*[@data-cm-next-match]/..').first().screenshot({ path: path.join(OUT, `${tag}-1card-el.png`) }).catch(() => {});
    if (await press(page, page.locator('button:visible').filter({ hasText: 'Match Centre: form' }))) {
      await page.waitForTimeout(1200);
      await shot('1c-centre');
      note(`${tag} match centre: ${(await textOf(page, '#root')).match(/.{0,60}(leg|aggregate|Aggregate).{0,140}/)?.[0] ?? 'no leg or aggregate words'}`);
      await page.keyboard.press('Escape');
      await press(page, page.locator('button:visible').filter({ hasText: /^\s*(Back|Close|Club home)\s*$/ }), 1500);
      await page.waitForTimeout(600);
    }
    const link = await page.locator('[data-cm-shootout-link]').count();
    if (!link) find(`${tag}: no shootout order link on a Europa League knockout second leg`);
    else note(`${tag} shootout link: ${await textOf(page, '[data-cm-shootout-link]')}`);
    await sideways(page, `${tag} hub`);
    if (!(await press(page, page.locator('button:visible[data-cm-way="quick"]')))) { find(`${tag}: no Quick Sim`); return; }
    await page.waitForTimeout(3500);
    await shot('2quick');
    if (await page.locator('[data-cm-live-stagebox]').count()) await untilReport(page, 60000);
    await page.waitForTimeout(1500);
    await shot('3result');
    const body = await textOf(page, '#root');
    note(`${tag} after quick sim: ${(body.match(/.{0,80}(aggregate|through|Through|out of the Europa|Out of the Europa|penalties).{0,120}/) ?? [body.slice(0, 200)])[0]}`);
    await back(page);
    await page.waitForTimeout(1200);
    await shot('4hub-after');
    note(`${tag} hub after: ${await textOf(page, '[data-cm-next-match]')}`);
    if (await toCups(page)) { await shot('5cups'); note(`${tag} uel tile after: ${await textOf(page, '[data-cm-world-tile="uel"]')}`); }
    if (errors.length) find(`${tag}: page errors ${errors.slice(0, 2).join(' | ')}`);
  } finally { await ctx.close(); }
}

/** The last match of the season: Quick Sim, See Season Review, the Europa League line. */
async function caseR(size, reduced) {
  const tag = `R-${size[0]}-${reduced ? 'rm' : 'mo'}`;
  const { ctx, page, errors, shot } = await open(saves.R.items, size, reduced, tag);
  try {
    await shot('1hub');
    if (await press(page, page.locator('button:visible[data-cm-way="quick"]'))) {
      await page.waitForTimeout(3500);
      if (await page.locator('[data-cm-live-stagebox]').count()) { await untilReport(page, 60000); await back(page); }
    }
    await page.waitForTimeout(1200);
    await shot('2hub-over');
    if (!(await press(page, page.locator('button:visible').filter({ hasText: 'See Season Review' }), 10000))) { find(`${tag}: no See Season Review`); return; }
    await page.waitForTimeout(3000);
    await shot('3review');
    await shot('3review-full', true);
    const body = await textOf(page, '#root');
    const line = body.match(/Europa League:[^|]{0,60}/)?.[0];
    note(`${tag} review: ${line ?? 'NO Europa League line'} | ${(body.match(/Champions League[^|]{0,80}/) ?? [''])[0]}`);
    if (!line) find(`${tag}: the season review has no Europa League line for a club that played it`);
    await sideways(page, `${tag} review`);
    if (errors.length) find(`${tag}: page errors ${errors.slice(0, 2).join(' | ')}`);
  } finally { await ctx.close(); }
}

const SIZES = [[390, 844], [1280, 900]];
try {
  for (const size of SIZES) for (const reduced of [true, false]) {
    for (const [k, f] of [['A', caseA], ['C', caseC], ['K', caseK], ['R', caseR]]) {
      if (!saves[k === 'C' ? 'A' : k]) continue;
      if (process.env.WALK_CASES && !process.env.WALK_CASES.split(',').includes(k)) continue;
      try { await f(size, reduced); } catch (e) { find(`${k} ${size[0]} ${reduced}: threw ${String(e).slice(0, 200)}`); }
    }
  }
} finally { await browser.close(); }
console.log(`walk1593: done, ${finds.length} FIND lines, pictures in ${OUT}`);
process.exit(0);
