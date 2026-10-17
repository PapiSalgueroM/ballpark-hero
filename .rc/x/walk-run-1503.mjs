// Reviewer (run lens) walk of Round 1503 on a GitHub runner (#!serve #!playwright), from the repo root:
//   walk: node .rc/x/walk-run-1503.mjs
// Saves are made by the engine (head, base b5aed9d4 and main 1ec77177, bundled by scripts/lib/worldUclFleet.mjs),
// planted from /robots.txt, and the page is pressed like a player would. supabase.co and ad hosts are aborted.
// It checks what the builder's walk does not: a watcher's knockout ties against the engine (legs, orientation,
// aggregate, words), the season review's line in its order, a participant's knockout nights, the club page round
// trip, the era groups' Russia and Ukraine separation, and old saves (base and main) loading onto the branch.
// Last line: GREEN or FINDINGS n; exit 0 green, 1 findings, 2 could not run.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { engineOf, tape } from '../../scripts/lib/worldUclFleet.mjs';
import { chromium } from '../../scripts/lib/playwrightLoader.mjs';

const ROOT = process.cwd();
const SHOTS = path.join(process.env.RC_OUT || fs.mkdtempSync(path.join(os.tmpdir(), 'rv1503-')), 'shots');
fs.mkdirSync(SHOTS, { recursive: true });
const URL0 = process.env.BASE || process.env.SWEEP_BASE || 'http://localhost:4173';
const cannot = why => { console.log(`walk-run-1503: COULD NOT RUN. ${why}`); process.exit(2); };
const findings = [];
const fail = (w, s) => { findings.push(`${w}: ${s}`); console.log(`   FAIL ${w}: ${s}`); };
const info = s => console.log(`   ${s}`);

const H = await engineOf(ROOT, 'head', {}, cannot);
const B = await engineOf(ROOT, 'base', { base: 'b5aed9d4' }, cannot);
const MAIN = await engineOf(ROOT, 'main', { base: '1ec77177' }, cannot);
const opts = { skipHalftime: true, noCoach: true };
async function play(E, club, era, seed, until, from = null) {
  const M = from ? from.M : await E.fresh();
  let s = from ? from.s : tape(seed, () => (era ? M.cm.startCareer(club, era) : M.cm.startCareer(club))).value;
  let i = 0;
  while (!until(M, s) && s.week < s.calendar.length && i < 400) {
    s = tape(seed + 1 + i, () => M.cm.playNextEntry(s, opts)).value.state;
    i += 1;
  }
  return { M, s, entries: i };
}
function saved(M, s) {
  M.store.clear();
  if (!M.cm.saveCareer(s)) cannot('the engine refused to save a career');
  return [...M.store.entries()];
}
async function loadOnHead(items) {
  const M = await H.fresh();
  for (const [k, v] of items) M.store.set(k, v);
  return { M, s: M.cm.loadCareer() };
}
const done = (M, s) => M.cm.worldUclNightsDone(s);
const S = {};

/* K: a today's world watcher with the play-offs settled and the round of 16 first legs played. */
{
  const k = await play(H, 'Chelsea', undefined, 0x2e01, (M, s) => done(M, s) >= 11);
  const dk = done(k.M, k.s);
  if (k.s.uclGroup || dk < 11 || dk > 12) cannot(`K: Chelsea did not reach night 11 or 12 as a watcher (${dk})`);
  const r = k.M.cm.evalWorldUcl(k.s);
  const po = r.ties.filter(t => t.round === 'PO');
  const r16 = r.ties.filter(t => t.round === 'R16');
  if (!po.length || !po[0].leg2) cannot('K: no settled play-off after night 11');
  const tieLines = t => ({
    first: t.leg1 ? `First leg: ${t.home} ${t.leg1[0]}-${t.leg1[1]} ${t.away}` : null,
    second: t.leg2 ? `Second leg: ${t.away} ${t.leg2[1]}-${t.leg2[0]} ${t.home}` : null,
    agg: t.agg && t.winner ? `${t.agg[0]}-${t.agg[1]} on aggregate` : 'To be played',
  });
  S.Kr16 = r16.map(tieLines);
  S.Kdone = dk;
  S.KbackToPo2 = (dk - 1) - r.nights.findIndex(n => n.id === 'PO2');
  for (const t of po) {
    if (!t.leg1 || !t.leg2 || !t.agg || !t.winner) fail('K engine', `play-off ${t.home} v ${t.away} is not settled after night 11`);
    else if (t.agg[0] !== t.leg1[0] + t.leg2[0] || t.agg[1] !== t.leg1[1] + t.leg2[1]) fail('K engine', `play-off ${t.home} v ${t.away}: aggregate ${t.agg} is not leg1 ${t.leg1} plus leg2 ${t.leg2}`);
  }
  const lines = po.filter(t => t.leg1 && t.leg2).map(t => ({
    first: `First leg: ${t.home} ${t.leg1[0]}-${t.leg1[1]} ${t.away}`,
    second: `Second leg: ${t.away} ${t.leg2[1]}-${t.leg2[0]} ${t.home}`,
    agg: `${t.agg[0]}-${t.agg[1]} on aggregate`,
  }));
  const po2 = r.nights.find(n => n.id === 'PO2' || (n.stage === 'PO' && n.leg === 2));
  const t0 = po[0];
  S.K = { items: saved(k.M, k.s), po: po.length, r16: r16.length, lines, club: t0.home,
    po2: po2 ? po2.fixtures.map(f => `${f.home}|${f.hg}-${f.ag}|${f.away}`) : [],
    runLast: `${t0.away} ${t0.leg2[1]}-${t0.leg2[0]} ${t0.home}` };
  info(`K: Chelsea week ${k.s.week} of ${k.s.calendar.length}, ${po.length} play-offs settled, ${r16.length} round of 16 ties, follow ${t0.home}`);
  const kb = await play(B, 'Chelsea', undefined, 0x2e01, (M, s) => done(M, s) >= 11);
  const same = JSON.stringify(saved(kb.M, kb.s)) === JSON.stringify(S.K.items);
  info(`K on the base engine b5aed9d4: save ${same ? 'byte equal' : 'DIFFERENT'} to the head's`);
  if (!same) fail('K base', 'the base engine and the head engine write different saves for one career and stream');
  S.KB = saved(kb.M, kb.s);
}

/* The eras' group draws: Russian and Ukrainian clubs kept apart in 2015 and 2020 (the screen's ? says so). */
for (const era of ['era2015', 'era2020']) {
  const country = new Map((H && (await H.fresh()).cm.ERA_UCL_FIELDS[era] || []).map(e => [e.name, e.country]));
  let checked = 0; let together = 0;
  for (const club of ['Everton', 'Tottenham', 'Southampton', 'West Ham', 'Aston Villa', 'Newcastle']) {
    const M = await H.fresh();
    const s = tape(0x2e15 + checked, () => M.cm.startCareer(club, era)).value;
    if (s.uclGroup) continue;
    const r = M.cm.evalWorldUcl(s, 0);
    if (!r?.groups) continue;
    for (const g of r.groups) {
      const cs = g.rows.map(x => country.get(x.club) ?? M.cm.uclClubCountry(s, x.club));
      if (cs.includes('Russia') && cs.includes('Ukraine')) { together += 1; fail(`${era} ${club}`, `group ${g.letter} holds a Russian and a Ukrainian club: ${g.rows.map(x => x.club).join(', ')}`); }
    }
    checked += 1;
    if (checked >= 3) break;
  }
  info(`${era}: ${checked} watched draws read, ${together} groups with Russia and Ukraine together`);
  if (!checked) fail(era, 'no watcher found to read a draw from');
}

/* E: an era 2015 watcher still in the job when the final is played. */
const EPOOL = [];
for (const era of ['era2015', 'era2010', 'era2020']) for (const c of ['Swansea', 'Crystal Palace', 'Watford', 'Leicester', 'West Brom', 'Newcastle', 'Aston Villa', 'Fulham', 'Sunderland', 'Wolves', 'Stoke', 'West Ham']) EPOOL.push([c, era]);
/* EP: an era save whose club is in it (the screen's lines for the club in it in an old season). */
{
  const ep = await play(H, 'Everton', 'era2015', 0x2e60, (M, s) => (s.uclGroup?.matchday ?? 0) >= 3);
  if (ep.s.uclGroup) {
    const real = (ep.M.cm.ERA_UCL_FIELDS.era2015 || []).map(e => e.name);
    S.EP = { items: saved(ep.M, ep.s), inReal: real.includes('Everton') };
    const field = [...ep.s.uclGroup.table.map(r => r.club), ...(ep.s.uclWorld ?? []).flatMap(g => g.table.map(r => r.club))];
    const outside = field.filter(c => !real.includes(c));
    const missing = real.filter(c => !field.includes(c));
    info(`EP: Everton 2015 in it at group matchday ${ep.s.uclGroup.matchday}; Everton among the real 32 of 2015-16: ${S.EP.inReal}; the field has ${field.length} clubs, outside the real 32: ${outside.join(', ') || 'none'}; real clubs missing: ${missing.join(', ') || 'none'}`);
  }
}
for (const [club, era] of EPOOL) {
  let e;
  try { e = await play(H, club, era, 0x2e20, (M, s) => !!s.sacked || (() => { const p = M.cm.worldUclNights(s); return !!p && done(M, s) >= p.length; })()); }
  catch (err) { info(`E: ${club} ${era} could not start: ${String(err).slice(0, 80)}`); continue; }
  if (false) e = await play(H, club, era, 0x2e20,(M, s) => !!s.sacked || (() => { const p = M.cm.worldUclNights(s); return !!p && done(M, s) >= p.length; })());
  const r = e.M.cm.evalWorldUcl(e.s);
  const p = e.M.cm.worldUclNights(e.s);
  if (e.s.uclGroup || e.s.sacked || !r?.winner || e.s.week >= e.s.calendar.length) { info(`E: ${club} ${era} cannot serve: ${e.s.uclGroup ? 'in it' : e.s.sacked ? 'sacked' : !p ? 'no slice' : `week ${e.s.week} of ${e.s.calendar.length}, done ${done(e.M, e.s)} of ${p.length}, winner ${r?.winner ?? 'none'}`}`); continue; }
  const ag = r.ties.filter(t => t.round === 'R16' && t.byAwayGoals && t.winner).map(t => `${t.winner} through on away goals`);
  S.E = { club, era, items: saved(e.M, e.s), winner: r.winner, runnerUp: r.runnerUp, groups: r.groups.length, ag,
    r16: r.ties.filter(t => t.round === 'R16').map(t => `${t.agg[0]}-${t.agg[1]} on aggregate`) };
  info(`E: ${club} ${era}, week ${e.s.week} of ${e.s.calendar.length}, the final won by ${r.winner} over ${r.runnerUp}, ${ag.length} ties on away goals`);
  break;
}
if (!S.E) cannot('E: no era 2015 watcher reached its final in the job');

/* P: a participant with its quarter-final first leg played and the second still to come. */
{
  const qf = (s, leg) => s.calendar.findIndex(x => x.type === 'uclKo' && x.uclRound === 'QF' && (x.uclLeg ?? 1) === leg);
  const p = await play(H, 'Real Madrid', undefined, 0x2e30, (M, s) => qf(s, 1) >= 0 && s.week > qf(s, 1));
  if (!p.s.uclGroup) cannot('P: Real Madrid are not in it');
  const q1 = qf(p.s, 1); const q2 = qf(p.s, 2);
  const open = (p.s.uclBracket ?? []).filter(t => t.round === 'QF' && t.winner === null);
  S.P = { items: saved(p.M, p.s), q1, q2, week: p.s.week, ko: p.s.uclKoRound, open: open.length, bracket: (p.s.uclBracket ?? []).length };
  info(`P: Real Madrid week ${p.s.week}, QF legs at ${q1} and ${q2}, uclKoRound ${p.s.uclKoRound}, ${open.length} quarter-finals unsettled, bracket ${S.P.bracket}`);
}

/* R: a today's world season over (another stream than the builder's): the review's line in its order. */
{
  const r0 = await play(H, 'Chelsea', undefined, 0x2e40, () => false);
  const end = r0.M.cm.evalWorldUcl(r0.s);
  if (!end?.winner) cannot('R: no watched winner at the season end');
  const fin = tape(0x2e41, () => r0.M.cm.finishSeason(r0.s)).value.state;
  S.R = { items: saved(r0.M, fin), line: `Champions League: ${end.winner} beat ${end.runnerUp} in the final.` };
  info(`R: ${S.R.line}`);
}

/* Old saves written by main 1ec77177 (before the binding), loaded on the branch. */
{
  const a = await play(MAIN, 'Chelsea', undefined, 0x2e50, (M, s) => s.week >= 20);
  S.OA = { items: saved(a.M, a.s) };
  const la = await loadOnHead(S.OA.items);
  S.OA.done = la.s ? la.M.cm.worldUclNightsDone(la.s) : -1;
  S.OA.slice = !!la.s?.worldComps?.ucl;
  info(`OA: main's Chelsea save at week ${a.s.week} loads on head with a slice ${S.OA.slice}, ${S.OA.done} nights done`);
  const p = await play(MAIN, 'Real Madrid', undefined, 0x2e51, (M, s) => (s.uclGroup?.matchday ?? 0) >= 3);
  S.OP = { items: saved(p.M, p.s) };
  const e = await play(MAIN, 'Everton', 'era2005', 0x2e52, (M, s) => s.week >= 25);
  S.OE = { items: saved(e.M, e.s), inIt: !!e.s.uclGroup };
  /* A today's world save in its second season: nothing to follow until the next rollover, which must open one. */
  try { await secondSeason(); } catch (err) { fail('O2', `could not be built: ${String(err).slice(0, 160)}`); }
}
async function secondSeason() {
  const full =await play(MAIN, 'Everton', undefined, 0x2e53, () => false);
  const f = tape(0x2e54, () => full.M.cm.finishSeason(full.s)).value.state;
  const n2 = tape(0x2e55, () => full.M.cm.startNextSeason(f)).value;
  const s2 = await play(MAIN, 'Chelsea', undefined, 0x2e56, (M, s) => s.week >= 5, { M: full.M, s: n2 });
  S.O2 = { items: saved(s2.M, s2.s) };
  const l2 = await loadOnHead(S.O2.items);
  if (!l2.s) cannot('O2: the head engine could not load main\'s season two save');
  S.O2.slice = !!l2.s.worldComps?.ucl;
  const rest = await play(H, 'Chelsea', undefined, 0x2e57, () => false, l2);
  const f2 = tape(0x2e58, () => rest.M.cm.finishSeason(rest.s)).value.state;
  const n3 = tape(0x2e59, () => rest.M.cm.startNextSeason(f2)).value;
  S.O2.next = n3.worldComps?.ucl ? `season ${n3.worldComps.ucl.s} (${n3.uclGroup ? 'in it' : 'watching'})` : (n3.uclGroup ? 'in it, no slice' : 'NONE');
  info(`O2: main's season ${s2.s.season} save loads on head with a slice ${S.O2.slice}; after its rollover on head: ${S.O2.next}`);
  if (!n3.uclGroup && !n3.worldComps?.ucl) fail('O2', 'the screen promises the Champions League from next season, but the rollover opened nothing');
}

/* ---------- the page ---------- */
const BLOCK = /supabase\.co|googlesyndication|doubleclick|google-analytics|googletagmanager|adservice|fundingchoices/;
let blocked = 0;
let measured = 0;
const squash = s => (s || '').replace(/\s+/g, ' ').trim();
async function press(page, loc, ms = 4000) {
  try {
    await loc.first().waitFor({ state: 'visible', timeout: ms });
    await loc.first().evaluate(el => el.click());
    await page.waitForTimeout(400);
    return true;
  } catch { return false; }
}
async function open(browser, items, [w, h], reduced) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 200)));
  await page.route(BLOCK, r => { blocked += 1; return r.abort(); });
  await page.goto(`${URL0}/robots.txt`);
  await page.evaluate(entries => { localStorage.clear(); for (const [k, v] of entries) localStorage.setItem(k, v); }, items);
  await page.goto(`${URL0}/club-manager`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await press(page, page.getByRole('button', { name: /^Essential only$/i }), 1500);
  await press(page, page.getByRole('button', { name: 'Resume Career', exact: true }), 6000);
  return { ctx, page, errors };
}
const shot = (page, name) => page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: false }).catch(() => {});
async function toUcl(page, where) {
  const cups = await press(page, page.getByRole('button').filter({ has: page.getByText('Cups', { exact: true }) }), 20000);
  const tiles = await page.locator('[data-cm-cups-view="tiles"]').waitFor({ timeout: 15000 }).then(() => true).catch(() => false);
  if (!cups || !tiles) { fail(where, `no Cups panel (${squash(await page.locator('#root').innerText().catch(() => '')).slice(0, 200)})`); return null; }
  const tile = squash(await page.locator('[data-cm-world-tile="ucl"]').first().innerText().catch(() => ''));
  if (!(await press(page, page.locator('[data-cm-world-tile="ucl"]')))) { fail(where, 'no Champions League tile'); return null; }
  await page.locator('[data-cm-world-mode], [data-cm-world-none]').first().waitFor({ timeout: 10000 }).catch(() => {});
  const mode = await page.locator('[data-cm-world-mode]').first().getAttribute('data-cm-world-mode').catch(() => null);
  const format = await page.locator('[data-cm-world-format]').first().getAttribute('data-cm-world-format').catch(() => null);
  const none = await page.locator('[data-cm-world-none]').count();
  return { tile, mode, format, none };
}
async function measure(page, where, { skipSmall = false } = {}) {
  const m = await page.evaluate(() => {
    const root = document.querySelector('[data-cm-cups-view]') || document.body;
    const vw = window.innerWidth;
    const shown = el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; };
    const words = el => (el.textContent || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 40);
    const out = { short: [], small: [], off: [], sideways: document.scrollingElement.scrollWidth > vw + 1 };
    for (const el of [...root.querySelectorAll('button, a')].filter(shown)) { const h = el.getBoundingClientRect().height; if (h < 43.5) out.short.push(`"${words(el)}" ${h.toFixed(1)}px`); }
    for (const el of root.querySelectorAll('*')) {
      if (!shown(el) || ![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue;
      const r = el.getBoundingClientRect();
      if (parseFloat(getComputedStyle(el).fontSize) < 11.95) out.small.push(`"${words(el)}" ${getComputedStyle(el).fontSize}`);
      if (r.right > vw + 1 || r.left < -1) out.off.push(`"${words(el)}"`);
    }
    return out;
  });
  measured += 1;
  for (const s of m.short) fail(where, `control under 44 px: ${s}`);
  if (!skipSmall) for (const s of m.small) fail(where, `text under 12 px: ${s}`);
  for (const s of m.off) fail(where, `runs off the screen: ${s}`);
  if (m.sideways) fail(where, 'the page scrolls sideways');
}
const back = page => press(page, page.locator('[data-cm-world-back]'));
const cardTexts = async (page, prefix) => page.locator(`[data-cm-world-tie^="${prefix}-"]`).evaluateAll(els => els.map(e => e.innerText.replace(/\s+/g, ' ').trim()));
const tag = (size, reduced) => `${size[0]}${reduced ? '-rm' : ''}`;

/* K: the watcher's knockouts, matchday pager across a second leg, a club's run and the club page round trip. */
async function caseK(browser, size, reduced) {
  const t = tag(size, reduced); const where = `K Chelsea ${t}`;
  const { ctx, page, errors } = await open(browser, S.K.items, size, reduced);
  try {
    const u = await toUcl(page, where);
    if (!u) return;
    if (u.mode !== 'watching' || u.format !== 'l36') fail(where, `screen is ${u.mode} ${u.format}`);
    info(`${where}: tile "${u.tile}"`);
    await shot(page, `k-screen-${t}`);
    await measure(page, `${where} screen`);
    if (reduced) {
      const running = await page.evaluate(() => { const root = document.querySelector('[data-cm-cups-view]'); return document.getAnimations().filter(a => a.playState === 'running' && root && a.effect?.target && root.contains(a.effect.target)).length; });
      if (running) fail(where, `${running} animations run inside the panel under reduced motion`);
    }
    /* Knockouts: the round of 16 first legs, then the settled play-offs, against the engine. */
    await press(page, page.locator('[data-cm-world-tile="knockouts"]'));
    info(`${where}: Knockouts opens on the pill "${squash(await page.locator('[data-cm-world-view="knockouts"] button.bg-primary').first().innerText().catch(() => ''))}"`);
    await press(page, page.getByRole('button', { name: 'Last 16', exact: true }));
    const r16 = await cardTexts(page, 'R16');
    if (r16.length !== S.K.r16) fail(where, `${r16.length} round of 16 cards, the engine drew ${S.K.r16}`);
    for (const l of S.Kr16) {
      const card = r16.find(x => l.first && x.includes(l.first));
      if (!card || (l.second && !card.includes(l.second)) || (!l.second && card.includes('Second leg:')) || !card.includes(l.agg)) fail(where, `round of 16 card not as the engine played it: want ${JSON.stringify(l)}; got "${card ?? 'no card'}"`);
    }
    await shot(page, `k-ko-r16-${t}`);
    await press(page, page.getByRole('button', { name: 'Play-offs', exact: true }));
    const po = await cardTexts(page, 'PO');
    if (po.length !== S.K.po) fail(where, `${po.length} play-off cards, the engine settled ${S.K.po}`);
    let bad = 0;
    for (const l of S.K.lines) {
      const card = po.find(x => x.includes(l.first));
      if (!card || !card.includes(l.second) || !card.includes(l.agg)) { bad += 1; if (bad <= 3) fail(where, `play-off card not as the engine played it: want "${l.first}", "${l.second}", "${l.agg}"; got "${card ?? 'no card'}"`); }
    }
    info(`${where}: ${S.K.lines.length - bad} of ${S.K.lines.length} play-off cards read as the engine played them; first: ${po[0]}`);
    await shot(page, `k-ko-po-${t}`);
    await measure(page, `${where} knockouts`);
    await back(page);
    /* Matchdays: opens on the last night played (night 11, a round of 16 first leg), then back to the play-off second legs. */
    await press(page, page.locator('[data-cm-world-tile="matchdays"]'));
    const head11 = squash(await page.locator('[data-cm-world-night]').first().innerText().catch(() => ''));
    const wantHead = S.Kdone === 11 ? 'Round of 16, first leg' : 'Round of 16, second leg';
    if (!head11.includes(wantHead)) fail(where, `Matchdays opens on "${head11.slice(0, 80)}", not the last night played (${wantHead})`);
    for (let i = 0; i < S.KbackToPo2; i += 1) await press(page, page.getByRole('button', { name: 'Night before' }));
    const headPo2 = squash(await page.locator('[data-cm-world-night]').first().innerText().catch(() => ''));
    if (!headPo2.includes('Play-off, second leg')) fail(where, `paging back reached "${headPo2.slice(0, 60)}", not the play-off second legs`);
    const rows = await page.locator('[data-cm-world-fixtures] > div').evaluateAll(els => els.map(e => [...e.children].map(c => c.innerText.trim()).join('|')));
    const want = S.K.po2.map(x => x.replace(/\|(\d+)-(\d+)\|/, '|$1-$2|'));
    const miss = want.filter(x => !rows.includes(x));
    if (!rows.length || miss.length) fail(where, `the play-off second legs read ${rows.slice(0, 2).join(' / ')}; the engine's ${want.slice(0, 2).join(' / ')} (${miss.length} missing)`);
    info(`${where}: play-off second legs ${rows.length} rows, ${want.length - miss.length} as the engine played them`);
    await shot(page, `k-md-po2-${t}`);
    /* A club's run from this night, its club page, and back to the run. */
    await press(page, page.locator(`[data-cm-world-fixtures] [data-cm-world-club="${S.K.club}"]`));
    const run = squash(await page.locator(`[data-cm-world-run="${S.K.club}"]`).first().innerText().catch(() => ''));
    if (!run.includes(S.K.runLast)) fail(where, `${S.K.club}'s run does not hold its play-off second leg "${S.K.runLast}" (${run.slice(0, 160)})`);
    info(`${where}: run of ${S.K.club}: ${run.slice(0, 220)}`);
    await shot(page, `k-run-${t}`);
    await measure(page, `${where} run`);
    if (await press(page, page.locator('[data-cm-world-club-page]'))) {
      await page.waitForTimeout(800);
      await shot(page, `k-clubpage-${t}`);
      if (!(await press(page, page.locator('button.mb-3', { hasText: 'Back' }), 8000))) fail(where, 'the club page has no back button of its own');
      await page.waitForTimeout(800);
      const again = await page.locator(`[data-cm-world-run="${S.K.club}"]`).count();
      if (!again) fail(where, `back from ${S.K.club}'s club page does not land on its run again (${squash(await page.locator('#root').innerText().catch(() => '')).slice(0, 120)})`);
      await shot(page, `k-clubpage-back-${t}`);
    } else fail(where, 'no club page link on the run');
    if (errors.length) fail(where, `page errors: ${errors.join(' | ')}`);
  } finally { await ctx.close(); }
}

/* E: an era 2015 watcher after its final: the round of 16 on aggregate and away goals, the final, the ?. */
async function caseE(browser, size, reduced) {
  const t = tag(size, reduced); const where = `E ${S.E.club} ${S.E.era} ${t}`;
  const { ctx, page, errors } = await open(browser, S.E.items, size, reduced);
  try {
    const u = await toUcl(page, where);
    if (!u) return;
    if (u.mode !== 'watching' || u.format !== 'g8') fail(where, `screen is ${u.mode} ${u.format}`);
    info(`${where}: tile "${u.tile}"`);
    await shot(page, `e-screen-${t}`);
    await press(page, page.locator('[data-cm-world-help-toggle]'));
    const help = squash(await page.locator('[data-cm-world-help]').first().innerText().catch(() => ''));
    info(`${where}: ? reads: ${help.slice(0, 400)}`);
    await shot(page, `e-help-${t}`);
    await press(page, page.locator('[data-cm-world-help-toggle]'));
    await press(page, page.locator('[data-cm-world-tile="knockouts"]'));
    await press(page, page.getByRole('button', { name: 'Last 16', exact: true }));
    const r16 = (await cardTexts(page, 'R16')).join(' || ');
    const missAgg = S.E.r16.filter(x => !r16.includes(x));
    const missAg = S.E.ag.filter(x => !r16.includes(x));
    if (missAgg.length) fail(where, `round of 16 aggregates missing from the cards: ${missAgg.slice(0, 3).join(', ')}`);
    if (missAg.length) fail(where, `away goals ties not worded as such: ${missAg.slice(0, 3).join(', ')}`);
    info(`${where}: round of 16 cards: ${r16.slice(0, 300)}`);
    await shot(page, `e-ko-r16-${t}`);
    await measure(page, `${where} knockouts`);
    await back(page);
    await press(page, page.locator('[data-cm-world-tile="final"]'));
    const fin = squash(await page.locator('[data-cm-world-final]').first().innerText().catch(() => ''));
    if (!fin.includes(S.E.winner) || !fin.includes(`Runners-up: ${S.E.runnerUp}`)) fail(where, `the final reads "${fin}", the engine: ${S.E.winner} over ${S.E.runnerUp}`);
    info(`${where}: final reads: ${fin}`);
    await shot(page, `e-final-${t}`);
    await measure(page, `${where} final`);
    if (errors.length) fail(where, `page errors: ${errors.join(' | ')}`);
  } finally { await ctx.close(); }
}

/* P: the club in it, between its quarter-final legs: the tile, Matchdays on the first leg, Knockouts. */
async function caseP(browser, size, reduced) {
  const t = tag(size, reduced); const where = `P Real Madrid ${t}`;
  const { ctx, page, errors } = await open(browser, S.P.items, size, reduced);
  try {
    const u = await toUcl(page, where);
    if (!u) return;
    if (u.mode !== 'in') fail(where, `screen is ${u.mode}`);
    info(`${where}: tile "${u.tile}"; status "${squash(await page.locator('[data-cm-world-status]').first().innerText().catch(() => ''))}"`);
    await shot(page, `p-screen-${t}`);
    await press(page, page.locator('[data-cm-world-tile="matchdays"]'));
    const night = squash(await page.locator('[data-cm-world-night]').first().innerText().catch(() => ''));
    info(`${where}: Matchdays opens on: ${night.slice(0, 300)}`);
    await shot(page, `p-md-${t}`);
    await measure(page, `${where} matchdays`);
    await back(page);
    await press(page, page.locator('[data-cm-world-tile="knockouts"]'));
    await page.waitForTimeout(800);
    await shot(page, `p-ko-${t}`);
    await measure(page, `${where} knockouts (old bracket card, sizes not held)`, { skipSmall: true });
    if (errors.length) fail(where, `page errors: ${errors.join(' | ')}`);
  } finally { await ctx.close(); }
}

/* R: the season review's line, word for word in its order. */
async function caseR(browser, size, reduced) {
  const t = tag(size, reduced); const where = `R review ${t}`;
  const { ctx, page, errors } = await open(browser, S.R.items, size, reduced);
  try {
    const line = page.locator('[data-cm-world-final-line]');
    const got = await line.first().waitFor({ timeout: 20000 }).then(() => true).catch(() => false);
    const text = got ? squash(await line.first().innerText()) : '';
    if (!text.endsWith(S.R.line)) fail(where, `the review reads "${text}", the engine: "${S.R.line}"`);
    if (got) {
      await line.first().scrollIntoViewIfNeeded().catch(() => {});
      const op = reduced ? await line.first().evaluate(el => getComputedStyle(el).opacity) : '1';
      if (reduced && op !== '1') fail(where, `under reduced motion the line starts at opacity ${op}`);
      await page.waitForTimeout(2500);
      await line.first().screenshot({ path: path.join(SHOTS, `r-line-${t}.png`) }).catch(() => {});
    }
    await shot(page, `r-review-${t}`);
    if (errors.length) fail(where, `page errors: ${errors.join(' | ')}`);
  } finally { await ctx.close(); }
}

/* Old saves: what the branch shows for a save written before the round (base) or before the binding (main). */
async function caseOld(browser, name, items, size, reduced, expect) {
  const t = tag(size, reduced); const where = `${name} ${t}`;
  const { ctx, page, errors } = await open(browser, items, size, reduced);
  try {
    const u = await toUcl(page, where);
    if (!u) { await shot(page, `${name.toLowerCase()}-fail-${t}`); return; }
    const head = squash(await page.locator('[data-cm-cups-view="ucl"]').first().innerText().catch(() => ''));
    info(`${where}: tile "${u.tile}"; screen ${u.none ? 'NONE' : `${u.mode} ${u.format}`}: ${head.slice(0, 260)}`);
    const msg = expect(u, head);
    if (msg) fail(where, msg);
    await shot(page, `${name.toLowerCase()}-${t}`);
    if (!u.none) await measure(page, `${where} screen`);
    if (errors.length) fail(where, `page errors: ${errors.join(' | ')}`);
  } finally { await ctx.close(); }
}

const browser = await chromium.launch();
try {
  for (const [size, rm] of [[[390, 844], false], [[390, 844], true], [[1280, 900], false], [[1280, 900], true]]) await caseK(browser, size, rm);
  await caseE(browser, [390, 844], false); await caseE(browser, [1280, 900], true);
  await caseP(browser, [390, 844], false); await caseP(browser, [1280, 900], true);
  await caseR(browser, [390, 844], true); await caseR(browser, [1280, 900], false);
  if (S.EP) await caseOld(browser, 'EP', S.EP.items, [390, 844], false, u => (u.mode !== 'in' ? `Everton 2015 in it shows ${u.mode}` : null));
  await caseOld(browser, 'KB', S.KB, [390, 844], false, u => (u.mode === 'watching' && /next|Won by/.test(u.tile) ? null : `base save shows ${u.mode} "${u.tile}"`));
  await caseOld(browser, 'OA', S.OA.items, [390, 844], false, (u, h) => (S.OA.slice && u.mode !== 'watching' ? `main's Chelsea save shows ${u.mode}, the head engine loads a slice` : null));
  await caseOld(browser, 'OP', S.OP.items, [390, 844], false, u => (u.mode !== 'in' ? `main's Real Madrid save shows ${u.mode}` : null));
  await caseOld(browser, 'OE', S.OE.items, [390, 844], false, u => (u.none ? 'main\'s 2005 Everton save shows nothing to follow' : null));
  if (S.O2?.items) {
    for (const [size, rm] of [[[390, 844], false], [[1280, 900], true]]) {
      await caseOld(browser, 'O2', S.O2.items, size, rm, (u, h) => (S.O2.slice ? null : (u.none || u.mode === 'in') ? null : `main's season two save shows ${u.mode} without a slice`));
    }
  }
} finally { await browser.close(); }
console.log(`walk-run-1503: ${measured} views measured, ${blocked} network requests to blocked hosts aborted`);
if (measured < 10) cannot(`only ${measured} views measured`);
if (findings.length) { console.log(`walk-run-1503: FINDINGS ${findings.length}`); process.exit(1); }
console.log('walk-run-1503: GREEN');
