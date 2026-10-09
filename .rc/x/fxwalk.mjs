// Reviewer's browser walk for Round 1146 (never committed). Runs on the remote check runner from the repo root:
//   node .rc/x/rvwalk.mjs      BASE = the served build, RC_OUT = where screenshots and walk.json go.
// It builds saves with the engine (the branch's, and the BASE tree's for the old save case), puts them into the
// browser's storage, and plays the real page: Play Live and Quick Sim, at 390x844 and 1280x900, reduced motion on
// and off. The match a click plays is seeded at the click, so the node oracle knows which goal is an own goal.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const ROOT = process.cwd();
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || path.join(ROOT, '.tmp-fx', 'rvwalk-out');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'rvwalk-'));
const KEY = 'dukb-club-manager-save';
const NOW = Date.parse('2026-10-06T16:00:00Z');
const BASE_SHA = process.env.RV_BASE_SHA || 'cbff760c';
const ONLY = (process.env.RV_ONLY || '').split(',').filter(Boolean);
fs.mkdirSync(OUT, { recursive: true });
const result = { base: BASE, cases: [], notes: [], errors: [] };
const flush = () => fs.writeFileSync(path.join(OUT, 'walk.json'), JSON.stringify(result, null, 1));
const note = (...a) => { const line = a.join(' '); console.log(line); result.notes.push(line); flush(); };

await import(pathToFileURL(path.join(ROOT, 'scripts/lib/offlineTransport.cjs')).href).catch(() => {});
const pw = (await import(pathToFileURL(path.join(ROOT, 'scripts/lib/playwrightLoader.mjs')).href)).default;

const memory = new Map();
globalThis.localStorage = { getItem: k => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, String(v)), removeItem: k => memory.delete(k) };

async function bundleEngine(label, root) {
  const out = path.join(TMP, `${label}.mjs`);
  await build({
    entryPoints: [path.join(root, 'src/lib/clubManager.ts')], bundle: true, platform: 'node', format: 'esm', outfile: out,
    alias: { '@': path.join(root, 'src') }, nodePaths: [path.join(ROOT, 'node_modules')], logLevel: 'error',
    loader: { '.css': 'empty', '.png': 'empty', '.svg': 'empty', '.jpg': 'empty', '.webp': 'empty' },
  });
  return pathToFileURL(out).href;
}

function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
/** Run fn on a seeded stream with the clock held, the way the page is held at the click. */
function seeded(seed, fn) {
  const real = Math.random; const RealDate = Date;
  Math.random = rng(seed);
  globalThis.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [NOW])); } static now() { return NOW; } };
  try { return fn(); } finally { Math.random = real; globalThis.Date = RealDate; }
}
const clone = v => JSON.parse(JSON.stringify(v));

/** A career with `matches` matches played by quick sim, stopped where the next entry is a match. */
function careerAfter(cm, club, seed, matches) {
  return seeded(seed, () => {
    let s = cm.startCareer(club); let played = 0; let guard = 0;
    while (played < matches && guard++ < 160) {
      const r = cm.playNextEntry(s, { skipHalftime: true });
      s = r.state;
      if (r.kind === 'match') played += 1;
      if (r.kind === 'seasonOver') break;
    }
    return s;
  });
}
function savedBytes(cm, s) {
  memory.delete(KEY);
  if (!cm.saveCareer(s)) throw new Error('saveCareer refused');
  return memory.get(KEY);
}
const lineText = l => `${l.name} ${l.minute}${l.plus ? `+${l.plus}` : ''}'${l.og ? ' (O.G)' : l.penalty ? ' (P)' : ''}`;

/* ---------- engines and saves ---------- */
const branchUrl = await bundleEngine('branch', ROOT);
const baseRoot = path.join(TMP, 'base');
fs.mkdirSync(baseRoot, { recursive: true });
execSync(`git archive ${BASE_SHA} src | tar -x -C "${baseRoot}"`, { cwd: ROOT, stdio: 'inherit', shell: '/bin/bash' });
const baseUrl = await bundleEngine('base', baseRoot);
const cmBranch = await import(`${branchUrl}?fixture=1`);
const cmBase = await import(`${baseUrl}?fixture=1`);
note('engines bundled: branch has tag', typeof cmBranch.CM_OWN_GOAL_ONE_IN, 'base has tag', typeof cmBase.CM_OWN_GOAL_ONE_IN);

const CLUB = process.env.RV_CLUB || 'Liverpool';
const saves = {};
saves.fresh = savedBytes(cmBranch, careerAfter(cmBranch, CLUB, 4101, 5));
/* the old saves: written by the BASE engine. One before a match, one stopped at the break. */
{
  const pre = careerAfter(cmBase, CLUB, 4101, 9);
  saves.oldPre = savedBytes(cmBase, pre);
  let paused = null;
  for (let seed = 7000; seed < 7200 && !paused; seed++) {
    const stop = seeded(seed, () => cmBase.playNextEntry(clone(pre)));
    if (stop.kind === 'halftime' && (stop.state.live.h1My ?? []).length + (stop.state.live.h1Opp ?? []).length >= 2) paused = stop.state;
  }
  if (paused) saves.oldPaused = savedBytes(cmBase, paused);
  result.oldPausedFirstHalf = paused ? { mine: paused.live.h1My.map(lineText), theirs: paused.live.h1Opp.map(lineText) } : null;
}
note('saves built:', Object.entries(saves).map(([k, v]) => `${k} ${(v.length / 1024).toFixed(0)}K`).join(', '));
flush();

/* ---------- the browser ---------- */
const browser = await pw.chromium.launch({ headless: true });

async function openCase(id, { width, height, reduced, save }) {
  const row = { id, width, height, reduced, errors: [], shots: [], facts: {} };
  result.cases.push(row);
  const touch = width < 700;
  const context = await browser.newContext({
    viewport: { width, height }, isMobile: touch, hasTouch: touch, reducedMotion: reduced ? 'reduce' : 'no-preference',
    colorScheme: 'dark', serviceWorkers: 'block',
    storageState: { cookies: [], origins: [{ origin: BASE, localStorage: [{ name: KEY, value: save }, { name: 'cookie-consent', value: 'essential' }, { name: 'dukb-theme', value: 'dark' }] }] },
  });
  await context.route(/googletagmanager|googlesyndication|google-analytics|doubleclick/, r => r.abort());
  await context.route(/supabase\.co/, r => r.abort());
  const page = await context.newPage();
  page.setDefaultTimeout(25000);
  await page.addInitScript(({ now }) => {
    const OldDate = Date;
    window.Date = class extends OldDate { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } };
    document.addEventListener('click', event => {
      if (!event.target.closest?.('[data-cm-way]') || typeof window.__rvSeed !== 'number') return;
      let a = window.__rvSeed >>> 0;
      Math.random = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
      window.__rvSeeded = (window.__rvSeeded || 0) + 1;
    }, true);
  }, { now: NOW });
  page.on('pageerror', e => row.errors.push(`pageerror: ${String(e).slice(0, 400)}`));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_FAILED|ERR_ABORTED/.test(m.text())) row.errors.push(`console: ${m.text().slice(0, 400)}`); });
  const shot = async (name, opts = {}) => {
    const file = `${id}-${name}.jpg`;
    try { await page.screenshot({ path: path.join(OUT, file), type: 'jpeg', quality: 62, ...opts }); row.shots.push(file); } catch (e) { row.errors.push(`shot ${name}: ${String(e).slice(0, 200)}`); }
  };
  return { id, row, context, page, shot };
}

async function resume(page) {
  await page.goto(`${BASE}/club-manager`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-testid="cm-slot-1"]').getByRole('button', { name: 'Resume Career', exact: true }).click();
  await page.locator('[data-cm-way="quick"]').waitFor();
  await page.evaluate(() => document.fonts.ready);
  return page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
}

let engineNo = 0;
const freshEngine = () => { engineNo += 1; return import(`${branchUrl}?case=${engineNo}`); };
const playArgs = mode => (mode === 'quick' ? { skipHalftime: true } : undefined);

/** The seed in [from, to) whose match scores highest, and what a freshly booted engine makes of it (the oracle). */
async function findSeed(before, mode, score, from, to) {
  const cm = await freshEngine();
  const ranked = [];
  for (let seed = from; seed < to; seed++) {
    let r;
    try { r = seeded(seed, () => cm.playNextEntry(clone(before), playArgs(mode))); } catch { continue; }
    const s = score(r);
    if (s > 0) ranked.push({ seed, score: s });
  }
  ranked.sort((a, b) => b.score - a.score);
  for (const cand of ranked.slice(0, 6)) {
    const oracleCm = await freshEngine();
    const oracle = seeded(cand.seed, () => oracleCm.playNextEntry(clone(before), playArgs(mode)));
    if (score(oracle) > 0) return { ...cand, found: ranked.length, oracle };
  }
  return null;
}
const firstHalf = r => (r.kind === 'halftime' ? { mine: r.state.live.h1My ?? [], theirs: r.state.live.h1Opp ?? [] } : null);
const scoreLive = want => r => {
  const h = firstHalf(r);
  if (!h) return 0;
  const ogFor = h.mine.filter(g => g.og);
  const ogAgainst = h.theirs.filter(g => g.og);
  const pens = [...h.mine, ...h.theirs].filter(g => g.penalty);
  const main = want === 'for' ? ogFor : ogAgainst;
  if (!main.length) return 0;
  const name = want === 'for' ? main[0].og.n : main[0].name;
  return 100 + name.length * 3 + (pens.length ? 40 + pens[0].name.length : 0) + (45 - main[0].minute) / 10;
};
const scoreQuick = r => {
  if (r.kind !== 'match' || !r.report?.detail) return 0;
  const ogFor = r.report.myScorers.filter(g => g.og).length;
  const ogAgainst = r.report.oppScorers.filter(g => g.og).length;
  const pens = [...r.report.myScorers, ...r.report.oppScorers].filter(g => g.penalty).length;
  const subs = r.report.detail.subs ?? [];
  const legs = subs.filter(s => s.minute >= 58 && s.minute <= 82).length;
  if (!ogFor && !ogAgainst) return 0;
  return (ogFor ? 100 : 0) + (ogAgainst ? 100 : 0) + (pens ? 60 : 0) + Math.min(legs, 2) * 60 + subs.length * 5;
};

/* ---------- what is on screen ---------- */
const liveState = page => page.evaluate(() => {
  const q = s => document.querySelector(s);
  const measure = el => (el ? { text: el.textContent, sw: el.scrollWidth, cw: el.clientWidth, cut: el.scrollWidth > el.clientWidth + 1 } : null);
  const card = q('[data-cm-goal-card]');
  const pill = [...document.querySelectorAll('[data-cm-live-stagebox] .rounded-full > .truncate')].find(el => /GOAL!/.test(el.textContent));
  const stage = q('[data-cm-live-stage]');
  return {
    stage: stage?.getAttribute('data-cm-live-stage') ?? null, minute: stage?.getAttribute('data-cm-live-minute') ?? null,
    card: card ? { ...measure(card.firstElementChild), pieces: (() => { const line = card.firstElementChild; const box = line.getBoundingClientRect(); const cardBox = card.getBoundingClientRect(); return [...line.children].map(k => { const r = k.getBoundingClientRect(); return { t: k.textContent, w: Math.round(r.width * 10) / 10, shown: r.left >= cardBox.left - 0.5 && r.right <= cardBox.right + 0.5 && r.left >= box.left - 0.5 && r.right <= box.right + 0.5, clipped: k.scrollWidth > k.clientWidth + 1 }; }); })(), cardW: Math.round(card.getBoundingClientRect().width) } : null, cardSub: card ? measure(card.children[1]) : null, cardSide: card?.getAttribute('data-cm-goal-card') ?? null,
    pill: measure(pill ?? null), pillClub: pill ? pill.nextElementSibling?.textContent ?? null : null,
    event: q('[data-cm-live-event]')?.textContent ?? '', log: q('[data-cm-live-log]')?.innerText ?? '',
    score: q('[data-cm-live-score]')?.textContent ?? '',
  };
});
const reportFacts = page => page.evaluate(() => {
  const measure = el => ({ text: el.textContent.trim(), title: el.getAttribute('title'), sw: el.scrollWidth, cw: el.clientWidth, cut: el.scrollWidth > el.clientWidth + 1 });
  const goals = [...document.querySelectorAll('[data-cm-tl="goal"]')].map(li => {
    const e = li.querySelector('[data-cm-tl-entry] .truncate');
    const mk = li.querySelector('[data-cm-tl-mark]');
    const col = li.querySelector('[data-cm-tl-entry]')?.parentElement ?? null;
    const inCol = el => { const r = el.getBoundingClientRect(); const c = col.getBoundingClientRect(); return r.left >= c.left - 0.5 && r.right <= c.right + 0.5 && r.width > 0; };
    return e ? { clock: li.getAttribute('data-cm-tl-clock'), side: li.getAttribute('data-cm-tl-side'), ...measure(e), colW: col ? Math.round(col.getBoundingClientRect().width) : null, mark: mk ? { t: mk.textContent, shown: inCol(mk), w: Math.round(mk.getBoundingClientRect().width * 10) / 10 } : null } : null;
  }).filter(Boolean);
  const subs = [...document.querySelectorAll('[data-cm-tl="sub"]')].map(li => {
    const e = li.querySelector('[data-cm-tl-entry] .truncate');
    return e ? { clock: li.getAttribute('data-cm-tl-clock'), side: li.getAttribute('data-cm-tl-side'), ...measure(e) } : null;
  }).filter(Boolean);
  const lines = document.body.innerText.split('\n').map(l => l.trim()).filter(Boolean);
  return {
    timelineGoals: goals, timelineSubs: subs, timelineMode: document.querySelector('[data-cm-timeline]')?.getAttribute('data-cm-timeline') ?? null,
    scorerLines: lines.filter(l => l.includes('⚽')), subLines: lines.filter(l => l.includes('▲')),
    overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  };
});

/** The full time report: shots, facts, and the oracle's scorer lines and changes looked for on the page. */
async function readReport(c, oracle, tag) {
  const { page, row, shot } = c;
  await page.getByRole('heading', { name: 'FULL TIME', exact: true }).waitFor();
  await page.locator('[data-cm-timeline]').waitFor();
  await page.waitForTimeout(3200);
  await shot(`${tag}-report-top`);
  await shot(`${tag}-report-full`, { fullPage: true });
  const facts = await reportFacts(page);
  const body = await page.evaluate(() => document.body.innerText);
  const out = { ...facts };
  if (oracle?.report) {
    const want = [...oracle.report.myScorers, ...oracle.report.oppScorers].map(lineText);
    out.oracleScorers = want;
    out.scorersMissing = want.filter(t => !body.includes(t));
    const subs = oracle.report.detail?.subs ?? [];
    out.oracleSubs = subs.map(s => `${s.on} for ${s.off} ${s.minute}${s.plus ? `+${s.plus}` : ''}'`);
    out.subsMissing = subs.filter(s => !body.includes(`▲ ${s.on}`)).map(s => s.on);
    out.oracleScore = `${oracle.report.myGoals ?? '?'}-${oracle.report.oppGoals ?? '?'}`;
  }
  row.facts[`${tag}Report`] = out;
  const tl = page.locator('[data-cm-timeline]');
  await tl.scrollIntoViewIfNeeded().catch(() => {});
  await shot(`${tag}-report-timeline`);
  const firstScorer = page.getByText('⚽').first();
  if (await firstScorer.count().catch(() => 0)) { await firstScorer.scrollIntoViewIfNeeded().catch(() => {}); await shot(`${tag}-report-scorers`); }
  flush();
  return out;
}

/** Play Live from the hub on a seeded first half: the banner, the goal card, the list, the help, then on to the report. */
async function liveWalk(c, before, pick) {
  const { page, row, shot } = c;
  const h = firstHalf(pick.oracle);
  row.facts.liveSeed = pick.seed;
  row.facts.liveOracle = { mine: h.mine.map(g => (g.og ? `${g.og.n} ${g.minute}' (O.G) [drawn for ${g.name}]` : lineText(g))), theirs: h.theirs.map(g => (g.og ? `${g.name} ${g.minute}' (O.G) [drawn for ${g.drawn}]` : lineText(g))) };
  await page.evaluate(seed => { window.__rvSeed = seed; }, pick.seed);
  await page.locator('[data-cm-way="live"]').click();
  await page.locator('[data-cm-live-stagebox]').waitFor();
  await shot('live-kickoff');
  const fourX = page.locator('[data-cm-live-controls] button').filter({ hasText: /^4x$/ });
  await fourX.click();
  const seen = {};
  const started = performance.now();
  let helpDone = false;
  while (performance.now() - started < 170000) {
    const st = await liveState(page);
    if (st.stage === 'interval' || st.stage === null) break;
    for (const [mark, tag] of [['(O.G)', 'og'], ['(P)', 'pen']]) {
      if (!seen[`card-${tag}`] && st.card?.text.includes(mark)) { seen[`card-${tag}`] = { ...st.card, sub: st.cardSub?.text, side: st.cardSide, minute: st.minute }; await shot(`live-card-${tag}`); }
      if (!seen[`pill-${tag}`] && st.pill?.text.includes(mark)) { seen[`pill-${tag}`] = { ...st.pill, club: st.pillClub, minute: st.minute }; await shot(`live-pill-${tag}`); }
    }
    if (!seen.firstGoal && (st.card || st.pill)) { seen.firstGoal = { card: st.card, pill: st.pill, minute: st.minute }; await shot('live-first-goal'); }
    if (!helpDone && Number(st.minute) >= 4) {
      helpDone = true;
      try {
        await page.getByRole('button', { name: 'How watching a match works' }).click();
        await page.locator('[data-cm-live-help]').waitFor({ timeout: 5000 });
        row.facts.liveHelp = await page.locator('[data-cm-live-help]').innerText();
        await shot('live-help');
        await page.getByRole('button', { name: 'How watching a match works' }).click();
      } catch (e) { row.errors.push(`live help: ${String(e).slice(0, 200)}`); }
    }
    await page.waitForTimeout(90);
  }
  const end = await liveState(page);
  seen.logAtBreak = end.log; seen.scoreAtBreak = end.score; seen.stageAtEnd = end.stage;
  row.facts.live = seen;
  await shot('live-end-of-half');
  flush();
  /* on to the whistle: the break, the second half skipped, the report */
  try {
    if (end.stage !== 'interval') { await page.locator('[data-cm-live-controls] button').filter({ hasText: /Skip/ }).click(); }
    await page.getByRole('button', { name: /Second half/ }).waitFor({ timeout: 60000 });
    await shot('live-interval');
    await page.getByRole('button', { name: /Second half/ }).click();
    await page.locator('[data-cm-live-stagebox]').waitFor();
    for (let i = 0; i < 40; i++) {
      if (await page.getByRole('button', { name: 'Full report' }).count()) break;
      const skip = page.locator('[data-cm-live-controls] button').filter({ hasText: /Skip/ });
      if (await skip.count()) await skip.first().click().catch(() => {});
      const card = page.locator('[data-cm-goal-card]');
      if (await card.count()) await card.first().click().catch(() => {});
      await page.waitForTimeout(700);
    }
    await shot('live-fulltime');
    row.facts.liveLogAtWhistle = (await liveState(page)).log;
    await page.getByRole('button', { name: 'Full report' }).click();
    const rep = await readReport(c, null, 'live');
    const wantFirstHalf = [...h.mine.map(g => (g.og ? `${g.og.n} ${g.minute}${g.plus ? `+${g.plus}` : ''}' (O.G)` : lineText(g))), ...h.theirs.map(lineText)];
    const body = await page.evaluate(() => document.body.innerText);
    row.facts.liveReportFirstHalfMissing = wantFirstHalf.filter(t => !body.includes(t));
    row.facts.liveReportFirstHalfWanted = wantFirstHalf;
    void rep;
  } catch (e) { row.errors.push(`live to the whistle: ${String(e).slice(0, 300)}`); await shot('live-stuck'); }
  flush();
}

/** Quick Sim from the hub on a seeded match. */
async function quickWalk(c, pick, tag = 'quick') {
  const { page, row } = c;
  row.facts[`${tag}Seed`] = pick.seed;
  await page.evaluate(seed => { window.__rvSeed = seed; }, pick.seed);
  await page.locator('[data-cm-way="quick"]').click();
  return readReport(c, pick.oracle, tag);
}

/* ---------- the cases ---------- */
const { createHash } = await import('node:crypto');
const sha = v => createHash('sha256').update(JSON.stringify(v)).digest('hex').slice(0, 12);
const picks = new Map();
async function pickFor(before, id, mode, score, from, to) {
  if (!picks.has(id)) {
    const t = performance.now();
    const p = await findSeed(before, mode, score, from, to);
    picks.set(id, p);
    note(`seed search ${id}: ${p ? `seed ${p.seed}, score ${p.score.toFixed(1)}, ${p.found} candidates` : 'NONE'} in ${((performance.now() - t) / 1000).toFixed(0)}s`);
  }
  return picks.get(id);
}
const VIEWS = [
  { id: 'p390r', width: 390, height: 844, reduced: true, live: 'for' },
  { id: 'p390m', width: 390, height: 844, reduced: false, live: 'against' },
  { id: 'd1280m', width: 1280, height: 900, reduced: false, live: 'for' },
  { id: 'd1280r', width: 1280, height: 900, reduced: true, live: 'against' },
];
const wanted = id => !ONLY.length || ONLY.includes(id);
const guarded = async (c, fn) => {
  try { await fn(); } catch (e) { c.row.errors.push(`case: ${String(e).slice(0, 500)}`); await c.shot('failed'); }
  await c.context.close().catch(() => {});
  flush();
  console.log(`case ${c.id}: ${c.row.errors.length} errors, ${c.row.shots.length} shots`);
};

try {
  for (const v of VIEWS) {
    if (!wanted(v.id)) continue;
    const live = await openCase(`${v.id}-live`, { ...v, save: saves.fresh });
    await guarded(live, async () => {
      const before = await resume(live.page);
      live.row.facts.beforeHash = sha(before);
      await live.shot('hub');
      try {
        await live.page.getByRole('button', { name: 'How to play' }).first().click();
        await live.page.waitForTimeout(900);
        const text = await live.page.evaluate(() => document.body.innerText);
        live.row.facts.howToPlay = { saysP: text.includes('(P)'), saysOG: text.includes('(O.G)'), quickLine: (text.split('\n').find(l => /Quick Sim/.test(l) && /bench|change|sub/i.test(l)) ?? '').slice(0, 900) };
        await live.shot('howtoplay');
        await live.page.keyboard.press('Escape');
        await live.page.waitForTimeout(300);
      } catch (e) { live.row.errors.push(`how to play: ${String(e).slice(0, 200)}`); }
      const pick = await pickFor(before, `live-${v.live}`, 'live', scoreLive(v.live), 1, 3001);
      if (!pick) { live.row.errors.push(`no seed in 3000 with a first half own goal ${v.live}`); return; }
      await live.page.locator('[data-cm-way="live"]').waitFor();
      await liveWalk(live, before, pick);
    });
    const quick = await openCase(`${v.id}-quick`, { ...v, save: saves.fresh });
    await guarded(quick, async () => {
      const before = await resume(quick.page);
      quick.row.facts.beforeHash = sha(before);
      const pick = await pickFor(before, 'quick', 'quick', scoreQuick, 1, 2501);
      if (!pick) { quick.row.errors.push('no seed in 2500 with an own goal in a quick sim'); return; }
      await quickWalk(quick, pick);
      /* and on: the report closes and the hub comes back */
      await quick.page.getByRole('button', { name: /^Continue/ }).first().click();
      await quick.page.locator('[data-cm-way="quick"]').waitFor({ timeout: 15000 }).catch(() => quick.row.errors.push('no hub after Continue'));
      await quick.shot('hub-after');
    });
  }
  /* the old saves, written by the base engine, opened and played on by the branch's page */
  for (const [name, v] of [['oldPaused', VIEWS[1]], ['oldPre', VIEWS[2]]]) {
    if (!wanted(name)) continue;
    const save = saves[name];
    if (!save) { note(`${name}: no such save was built`); continue; }
    memory.set(KEY, save);
    result[`${name}OpensInNode`] = !!cmBranch.loadCareer();
    const c = await openCase(name, { ...v, save });
    await guarded(c, async () => {
      const before = await resume(c.page);
      c.row.facts.liveButton = await c.page.locator('[data-cm-way="live"]').innerText();
      await c.shot('hub');
      const cm = await freshEngine();
      const oracle = seeded(31337, () => cm.playNextEntry(clone(before), { skipHalftime: true }));
      c.row.facts.oracleKind = oracle.kind;
      await quickWalk(c, { seed: 31337, oracle }, 'old');
      if (name === 'oldPaused' && result.oldPausedFirstHalf) {
        const body = await c.page.evaluate(() => document.body.innerText);
        const had = [...result.oldPausedFirstHalf.mine, ...result.oldPausedFirstHalf.theirs];
        c.row.facts.firstHalfLinesLost = had.filter(t => !body.includes(t));
        c.row.facts.firstHalfLinesMarkedOwn = had.filter(t => body.includes(`${t} (O.G)`));
      }
    });
  }
  for (const v of [VIEWS[0], VIEWS[2]]) {
    if (!wanted(`${v.id}-whatsnew`) && ONLY.length) continue;
    const c = await openCase(`${v.id}-whatsnew`, { ...v, save: saves.fresh });
    await guarded(c, async () => {
      await c.page.goto(`${BASE}/whats-new`, { waitUntil: 'domcontentloaded' });
      const entry = c.page.locator('li', { hasText: 'Club Manager: (P) and (O.G) beside a goal' }).first();
      await entry.waitFor();
      c.row.facts.entry = await entry.innerText();
      await c.shot('whatsnew');
    });
  }
} finally {
  await browser.close().catch(() => {});
  flush();
}
const errors = result.cases.reduce((n, c) => n + c.errors.length, 0);
for (const c of result.cases) console.log(`FACTS ${c.id} ${JSON.stringify({ errors: c.errors, facts: c.facts }).slice(0, 6000)}`);
console.log(`RESULT ${JSON.stringify({ notes: result.notes, oldPausedFirstHalf: result.oldPausedFirstHalf, oldPausedOpensInNode: result.oldPausedOpensInNode, oldPreOpensInNode: result.oldPreOpensInNode })}`);
/* the fix pass: every mark that was met must be whole on screen, on the card and on the timeline */
let cardMarks = 0, cardHidden = 0, tlMarks = 0, tlHidden = 0, cardNameClipped = 0;
const walkFacts = (v, visit) => { if (!v || typeof v !== 'object') return; visit(v); for (const k of Object.keys(v)) walkFacts(v[k], visit); };
for (const c of result.cases) walkFacts(c.facts, v => {
  if (Array.isArray(v.pieces) && v.pieces.length > 3) { cardMarks += 1; if (v.pieces.slice(2).some(p => !p.shown) || !v.pieces[0].shown) { cardHidden += 1; console.log(`HIDDEN card ${c.id}: ${JSON.stringify(v.pieces)}`); } if (v.pieces[1].clipped) cardNameClipped += 1; console.log(`CARD ${c.id} w=${v.cardW} ${JSON.stringify(v.pieces)}`); }
  if (v.mark && typeof v.mark === 'object' && 'shown' in v.mark) { tlMarks += 1; if (!v.mark.shown) { tlHidden += 1; console.log(`HIDDEN timeline ${c.id}: ${JSON.stringify(v)}`); } console.log(`TL ${c.id} col=${v.colW} name="${v.text}" nameCut=${v.cut} mark=${JSON.stringify(v.mark)}`); }
});
console.log(`MARKS card: ${cardMarks} met, ${cardHidden} not whole on screen, the name clipped in ${cardNameClipped}; timeline: ${tlMarks} met, ${tlHidden} not whole on screen`);
console.log(`fxwalk: ${result.cases.length} cases, ${errors} errors, ${result.cases.reduce((n, c) => n + c.shots.length, 0)} shots`);
process.exit(errors || cardHidden || tlHidden || !cardMarks || !tlMarks ? 1 : 0);
