/* Round 1101 REVIEW walk (runner lens). Not committed. Sent as .rc/x/rv-walk.mjs.
   Plays Club Manager's live match on the built site at several sizes, with and without reduced motion,
   blocks the live database, and saves screenshots and a JSON of measurements into RC_OUT. */
import fs from 'node:fs';
import path from 'node:path';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const { chromium } = pw;
const BASE = process.env.BASE || 'http://localhost:4173';
const OUT = process.env.RC_OUT || path.resolve('.tmp-fx/rv-shots');
fs.mkdirSync(OUT, { recursive: true });
const KEY = 'dukb-club-manager-save';
const ONLY = process.env.RV_ONLY || '';
const report = { base: BASE, runs: {} };
const log = (...a) => console.log(...a);

async function openPage(context) {
  const page = await context.newPage();
  await page.route(/supabase\.co/, route => route.abort());
  page.errors = [];
  page.on('pageerror', e => page.errors.push(String(e && e.message ? e.message : e)));
  page.on('console', m => { if (m.type() === 'error') page.errors.push('console: ' + m.text().slice(0, 200)); });
  return page;
}
const tap = async (page, rx) => {
  const b = page.getByRole('button', { name: rx }).first();
  if (await b.count().catch(() => 0) === 0) return false;
  return b.click({ timeout: 4000 }).then(() => true).catch(() => false);
};
const tapText = async (page, rx) => {
  const b = page.locator('button:visible').filter({ hasText: rx }).first();
  if (await b.count().catch(() => 0) === 0) return false;
  return b.click({ timeout: 4000 }).then(() => true).catch(() => false);
};
async function clearRoom(page) {
  await page.getByRole('button', { name: /^essential only$/i }).first().click({ timeout: 1200 }).catch(() => {});
  for (let i = 0; i < 3; i++) {
    if (await page.locator('[role="dialog"][data-state="open"]').count().catch(() => 0) === 0) break;
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(250);
  }
}
const saved = page => page.evaluate(k => { const raw = localStorage.getItem(k); return raw ? JSON.parse(raw) : null; }, KEY);
const liveRoot = page => page.locator('[data-cm-live-stage]').first();
const minuteOf = async page => Number(await liveRoot(page).getAttribute('data-cm-live-minute').catch(() => 'NaN'));
const stageOf = page => liveRoot(page).getAttribute('data-cm-live-stage').catch(() => null);
const shot = async (page, name) => { await page.screenshot({ path: path.join(OUT, name + '.png') }).catch(e => log('shot failed', name, String(e).slice(0, 80))); };

async function takeJob(page) {
  await page.goto(BASE + '/club-manager', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1000);
  await clearRoom(page);
  await tap(page, /2026-27/i);
  await page.getByRole('button', { name: /England/i }).first().waitFor({ timeout: 8000 }).catch(() => {});
  await tap(page, /England/i);
  await page.getByRole('button', { name: /Premier League/i }).first().waitFor({ timeout: 8000 }).catch(() => {});
  await tap(page, /Premier League/i);
  const club = page.locator('button').filter({ hasText: /Everton|Fulham|Brentford|Crystal Palace|Wolves|Brighton/ }).first();
  await club.waitFor({ timeout: 8000 }).catch(() => {});
  await club.click({ timeout: 5000 }).catch(() => {});
  await tap(page, /take the job|confirm|start/i);
  await page.getByText(/who is in the dugout/i).first().waitFor({ timeout: 8000 }).catch(() => {});
  await tap(page, /skip: just manage/i);
  await page.waitForTimeout(800);
  return saved(page);
}
async function startLive(page) {
  const resume = page.getByRole('button', { name: /Resume Career/i }).first();
  if (await resume.count().catch(() => 0)) { await resume.click({ timeout: 4000 }).catch(() => {}); await page.waitForTimeout(700); }
  if (await page.locator('[data-cm-live-stage]').count().catch(() => 0)) return true;
  await page.getByRole('tab', { name: /^Home$/i }).first().click({ timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(400);
  for (let i = 0; i < 8; i++) {
    if (await page.locator('[data-cm-live-stage]').count().catch(() => 0)) return true;
    const way = page.locator('button:visible[data-cm-way="live"]').first();
    if (await way.count().catch(() => 0)) await way.click({ timeout: 4000 }).catch(() => {});
    else await tapText(page, /Play Live|Resume match/i);
    await page.waitForTimeout(900);
  }
  return (await page.locator('[data-cm-live-stage]').count().catch(() => 0)) > 0;
}
const speedTo = (page, label) => page.getByRole('button', { name: label, exact: true }).first().click({ timeout: 3000 }).catch(() => {});
const pauseBtn = page => page.locator('[data-cm-live-controls] button[aria-label="Pause"], [data-cm-live-controls] button[aria-label="Resume"]').first();

async function goalsOfHalf(page) {
  const save = await saved(page);
  const live = save?.live;
  if (!live) return { goals: [], board: 0, second: false, cap: 45 };
  const second = !!live.h2Drawn && (live.minute ?? 0) >= 46;
  const board = (second ? live.added?.h2 : live.added?.h1) ?? 0;
  const cap = second ? 90 : 45;
  const lines = second ? [...(live.h2My ?? []).map(g => ({ ...g, side: 'me' })), ...(live.h2Opp ?? []).map(g => ({ ...g, side: 'opp' }))]
    : [...(live.h1My ?? []).map(g => ({ ...g, side: 'me' })), ...(live.h1Opp ?? []).map(g => ({ ...g, side: 'opp' }))];
  const goals = lines.map(g => ({ minute: g.minute, plus: g.plus ?? 0, place: g.minute + (g.plus ?? 0), name: g.name, side: g.side }))
    .filter(g => g.place < cap + board).sort((a, b) => a.place - b.place);
  return { goals, board, second, cap };
}

/* Everything the page draws, every frame. */
async function startSampler(page) {
  await page.evaluate(() => {
    const out = [];
    window.__rv = { out, on: true };
    const read = () => {
      if (!window.__rv.on) return;
      const pitch = document.querySelector('[data-cm-live-pitch]');
      const score = document.querySelector('[data-cm-live-score]');
      const card = document.querySelector('[data-cm-goal-card]');
      const root = document.querySelector('[data-cm-live-stage]');
      const ball = document.querySelector('[data-cm-ball]');
      out.push({
        t: Math.round(performance.now()),
        score: score ? score.textContent.replace(/\s+/g, ' ').trim() : null,
        motion: pitch ? pitch.getAttribute('data-cm-motion') : null,
        phase: pitch ? pitch.getAttribute('data-cm-motion-phase') : null,
        net: pitch ? pitch.querySelectorAll('[data-cm-net="goal"]').length : 0,
        card: card ? card.textContent.replace(/\s+/g, ' ').trim().slice(0, 90) : null,
        ball: ball ? [ball.style.left, ball.style.top] : null,
        minute: root ? Number(root.getAttribute('data-cm-live-minute')) : null,
        y: window.scrollY,
      });
      requestAnimationFrame(read);
    };
    requestAnimationFrame(read);
  });
}
const takeSamples = page => page.evaluate(() => (window.__rv ? window.__rv.out.splice(0) : []));
const stopSampler = page => page.evaluate(() => { if (window.__rv) window.__rv.on = false; });

/* Runs of frames that read the same: "motion/phase score card xN". */
function timeline(samples) {
  const runs = [];
  for (const s of samples) {
    const k = `${s.motion}/${s.phase} [${s.score}] ${s.card ? 'CARD' : '-'} net${s.net}`;
    const last = runs[runs.length - 1];
    if (last && last.k === k) { last.n += 1; last.t1 = s.t; } else runs.push({ k, n: 1, t0: s.t, t1: s.t, minute: s.minute });
  }
  return runs.map(r => `${r.k} x${r.n} (${r.t1 - r.t0}ms, min ${r.minute})`);
}

/* Gets the match to a goal that is not the last kick, watches it at `watchSpeed`, takes a screenshot in
   each phase, and returns what every frame read. */
async function watchGoal(page, tag, watchSpeed, extra = {}) {
  for (let half = 0; half < 10; half++) {
    const stage = await stageOf(page);
    if (stage === 'interval') { await tap(page, /^Second half$/i); await page.waitForTimeout(600); continue; }
    if (stage === 'done') {
      await tap(page, /full report/i); await page.waitForTimeout(700);
      await tap(page, /continue|next|carry on|ok/i); await page.waitForTimeout(700);
      if (!(await startLive(page))) return { error: 'could not start the next match' };
      continue;
    }
    if (stage === null) { if (!(await startLive(page))) return { error: 'no live stage' }; continue; }
    const now = await minuteOf(page);
    const { goals } = await goalsOfHalf(page);
    const target = goals.find(g => g.place >= now + 2 && !goals.some(o => o !== g && Math.abs(o.place - g.place) < 4));
    if (!target) { await tap(page, /skip/i); await page.waitForTimeout(700); continue; }
    await speedTo(page, '4x');
    for (let i = 0; i < 600 && (await minuteOf(page)) < target.place - 2; i++) await page.waitForTimeout(80);
    await speedTo(page, watchSpeed);
    await startSampler(page);
    const samples = [];
    const seen = {};
    const t0 = Date.now();
    let cardSeenAt = 0;
    let cardGoneAt = 0;
    while (Date.now() - t0 < 26000) {
      await page.waitForTimeout(25);
      const st = await page.evaluate(() => {
        const pitch = document.querySelector('[data-cm-live-pitch]');
        return { phase: pitch ? pitch.getAttribute('data-cm-motion-phase') : null, motion: pitch ? pitch.getAttribute('data-cm-motion') : null, card: !!document.querySelector('[data-cm-goal-card]') };
      }).catch(() => ({}));
      if (st.motion === 'goal') {
        const k = st.card ? 'card' : st.phase;
        if (k && !seen[k]) { seen[k] = true; await shot(page, `${tag}-goal-${k}`); }
        if (st.card && !cardSeenAt) {
          cardSeenAt = Date.now();
          if (extra.onCard) await extra.onCard(page);
        }
      }
      if (cardSeenAt && !st.card && !cardGoneAt) { cardGoneAt = Date.now(); await page.waitForTimeout(450); await shot(page, `${tag}-goal-after`); }
      samples.push(...await takeSamples(page));
      const last = samples[samples.length - 1];
      if (last && last.minute !== null && last.minute >= target.place + 2) break;
    }
    await stopSampler(page);
    samples.push(...await takeSamples(page));
    /* What a player must never see: the score moving while the ball is still on its way, or moving twice. */
    const scores = [];
    for (const s of samples) if (s.score && scores[scores.length - 1] !== s.score) scores.push(s.score);
    const early = samples.filter(s => s.motion === 'goal' && (s.phase === 'plant' || s.phase === 'flight') && s.score !== samples[0].score).length;
    return {
      target, watchSpeed, frames: samples.length, scoreSequence: scores, earlyScoreFrames: early,
      cardText: (samples.find(s => s.card) || {}).card || null,
      cardFrames: samples.filter(s => s.card).length,
      holdMs: cardSeenAt && cardGoneAt ? cardGoneAt - cardSeenAt : null,
      phasesShot: Object.keys(seen), scrollYs: [...new Set(samples.map(s => s.y))],
      timeline: timeline(samples).slice(0, 40),
    };
  }
  return { error: 'ten halves without a goal to watch' };
}

/* Boxes and small text inside the stage. */
async function measure(page) {
  return page.evaluate(() => {
    const box = sel => { const el = document.querySelector(sel); if (!el) return null; const r = el.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)]; };
    const stage = document.querySelector('[data-cm-live-stagebox]');
    const small = [];
    const clipped = [];
    if (stage) {
      const walker = document.createTreeWalker(stage, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const text = n.textContent.trim();
        if (!text) continue;
        const el = n.parentElement;
        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden' || cs.display === 'none') continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        const size = parseFloat(cs.fontSize);
        const inPitch = !!el.closest('[data-cm-live-pitch]');
        if (size < 11 && !el.closest('.sr-only')) small.push(`${size}px${inPitch ? ' (pitch)' : ''}: ${text.slice(0, 24)}`);
        if (el.scrollWidth > el.clientWidth + 1 && cs.overflow !== 'visible' && !inPitch) clipped.push(`${text.slice(0, 40)} (${el.clientWidth}/${el.scrollWidth})`);
      }
    }
    const controls = [...document.querySelectorAll('[data-cm-live-controls] button')].map(b => { const r = b.getBoundingClientRect(); return `${b.textContent.trim().slice(0, 12) || b.getAttribute('aria-label')}:${Math.round(r.width)}x${Math.round(r.height)}`; });
    return {
      window: [innerWidth, innerHeight], docWidth: document.documentElement.scrollWidth, docHeight: document.documentElement.scrollHeight,
      bodyOverflow: document.body.style.overflow, scrollY,
      stage: box('[data-cm-live-stagebox]'), strip: box('[data-cm-live-strip]'), pitch: box('[data-cm-live-pitch]'),
      statline: box('[data-cm-live-statline]'), eventline: box('[data-cm-live-event]'), controls: box('[data-cm-live-controls]'), side: box('[data-cm-live-side]'),
      controlSizes: controls,
      smallOutsidePitch: small.filter(s => !s.includes('(pitch)')).slice(0, 20), smallInPitch: small.filter(s => s.includes('(pitch)')).length,
      clipped: clipped.slice(0, 20),
    };
  }).catch(e => ({ error: String(e).slice(0, 120) }));
}

const runningAnimations = page => page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running').map(a => {
  const el = a.effect && a.effect.target;
  return el ? `${el.tagName}.${String(el.className).slice(0, 40)}${el.closest('[data-cm-live-pitch]') ? ' IN-PITCH' : ''}${el.closest('[data-cm-goal-card]') ? ' IN-CARD' : ''}${el.closest('[data-cm-live-stagebox]') ? ' in-stage' : ''}` : 'no target';
})).catch(() => ['error']);

async function walk(browser, tag, viewport, reduced, deep) {
  const out = { viewport, reduced, steps: {} };
  report.runs[tag] = out;
  const context = await browser.newContext({ viewport, reducedMotion: reduced ? 'reduce' : 'no-preference', deviceScaleFactor: 1 });
  const page = await openPage(context);
  try {
    const start = await takeJob(page);
    out.club = start?.clubName ?? null;
    if (!(await startLive(page))) { out.error = 'never reached the live match'; await shot(page, `${tag}-00-stuck`); return; }
    await page.waitForTimeout(700);
    await shot(page, `${tag}-01-kickoff`);
    out.steps.kickoff = await measure(page);
    await page.waitForTimeout(3200);
    await shot(page, `${tag}-02-open-play`);

    if (deep) {
      /* panels, one at a time */
      await tapText(page, /^Stats$/); await page.waitForTimeout(350);
      out.steps.statsPanel = await page.locator('[data-cm-live-side]').first().getAttribute('data-cm-live-side').catch(() => null);
      await shot(page, `${tag}-03-stats-panel`);
      await page.locator('button[aria-label="How watching a match works"]').first().click({ timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(350);
      out.steps.helpPanel = await page.locator('[data-cm-live-side]').first().getAttribute('data-cm-live-side').catch(() => null);
      out.steps.helpText = await page.locator('[data-cm-live-side]').first().innerText().then(t => t.replace(/\s+/g, ' ').slice(0, 900)).catch(() => null);
      await shot(page, `${tag}-04-help-panel`);
      await page.locator('button[aria-label="Squad and stamina"]').first().click({ timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(350);
      out.steps.squadPanel = await page.locator('[data-cm-live-side]').first().getAttribute('data-cm-live-side').catch(() => null);
      await shot(page, `${tag}-05-squad-panel`);
      await page.keyboard.press('Escape'); await page.waitForTimeout(250);
      out.steps.afterEscapePanel = await page.locator('[data-cm-live-side]').first().getAttribute('data-cm-live-side').catch(() => null);

      /* the change sheet, a sub, a shape */
      const dots = page.locator('[data-cm-dot]');
      const nDots = await dots.count().catch(() => 0);
      out.steps.myDots = nDots;
      if (nDots > 3) {
        await dots.nth(nDots - 2).click({ timeout: 3000, force: true }).catch(e => { out.steps.dotClick = String(e).slice(0, 100); });
        await page.waitForTimeout(450);
        out.steps.sheetOpen = await page.locator('[data-cm-live-sheet]').count().catch(() => 0);
        await shot(page, `${tag}-06-change-sheet`);
        out.steps.sheet = await measure(page);
        const bench = page.locator('[data-cm-live-bench]').first();
        if (await bench.count().catch(() => 0)) {
          const before = (await saved(page))?.live?.subsUsed ?? null;
          await bench.click({ timeout: 3000 }).catch(e => { out.steps.benchClick = String(e).slice(0, 100); });
          await page.waitForTimeout(900);
          out.steps.subsUsed = [before, (await saved(page))?.live?.subsUsed ?? null];
          await shot(page, `${tag}-07-after-sub`);
        }
        const dots2 = page.locator('[data-cm-dot]');
        await dots2.nth(1).click({ timeout: 3000, force: true }).catch(() => {});
        await page.waitForTimeout(350);
        const shapes = page.locator('[data-cm-live-shape]');
        out.steps.shapeButtons = await shapes.count().catch(() => 0);
        if (out.steps.shapeButtons > 1) { await shapes.last().click({ timeout: 3000 }).catch(() => {}); await page.waitForTimeout(700); }
        await shot(page, `${tag}-08-after-shape`);
        await page.keyboard.press('Escape'); await page.waitForTimeout(300);
        out.steps.sheetAfterEscape = await page.locator('[data-cm-live-sheet]').count().catch(() => 0);
      }

      /* other sizes of the same paused match */
      await pauseBtn(page).click({ timeout: 3000 }).catch(() => {});
      for (const [name, vp] of [['320x568', { width: 320, height: 568 }], ['768x1024', { width: 768, height: 1024 }], ['844x390-landscape', { width: 844, height: 390 }], ['1024x600-short', { width: 1024, height: 600 }]]) {
        await page.setViewportSize(vp); await page.waitForTimeout(400);
        await shot(page, `${tag}-09-size-${name}`);
        out.steps[`size-${name}`] = await measure(page);
      }
      await page.setViewportSize(viewport); await page.waitForTimeout(400);
      await pauseBtn(page).click({ timeout: 3000 }).catch(() => {});
    }

    /* a goal, watched */
    out.steps.goal1 = await watchGoal(page, `${tag}-g1`, deep ? '1x' : '2x', {
      onCard: async p => {
        if (reduced) out.steps.animationsAtCard = await runningAnimations(p);
        if (!deep) return;
        /* Pause with the card up: it must stay, and the clock must stand. */
        const m0 = await minuteOf(p);
        await pauseBtn(p).click({ timeout: 2000 }).catch(() => {});
        await p.waitForTimeout(1600);
        out.steps.pauseAtCard = { cardStill: await p.locator('[data-cm-goal-card]').count().catch(() => 0), minutes: [m0, await minuteOf(p)] };
        await shot(p, `${tag}-g1-paused-card`);
        await pauseBtn(p).click({ timeout: 2000 }).catch(() => {});
      },
    });
    if (reduced) out.steps.animationsAfterGoal = await runningAnimations(page);

    if (deep) {
      /* Back, the small card, Escape */
      const mBack = await minuteOf(page);
      await page.locator('button[aria-label="Back to the club page"]').first().click({ timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(500);
      await shot(page, `${tag}-10-collapsed`);
      await page.evaluate(() => window.scrollTo(0, 400)); await page.waitForTimeout(200);
      const collapsed = await measure(page);
      await page.waitForTimeout(2200);
      out.steps.collapsed = { compact: await page.locator('[data-cm-live-compact]').count().catch(() => 0), bodyOverflow: collapsed.bodyOverflow, scrollYAfterScrollTo400: collapsed.scrollY, docHeight: collapsed.docHeight, minutes: [mBack, await minuteOf(page)], text: await page.locator('[data-cm-live-compact]').first().innerText().then(t => t.replace(/\s+/g, ' ')).catch(() => null) };
      await page.evaluate(() => window.scrollTo(0, 0));
      await tapText(page, /Back to the match/); await page.waitForTimeout(500);
      out.steps.afterBackToMatch = { stage: await page.locator('[data-cm-live-stagebox]').count().catch(() => 0), bodyOverflow: (await measure(page)).bodyOverflow };
      await page.keyboard.press('Escape'); await page.waitForTimeout(400);
      out.steps.escapeIsBack = await page.locator('[data-cm-live-compact]').count().catch(() => 0);
      await tapText(page, /Back to the match/); await page.waitForTimeout(400);

      /* Skip to the interval, the second half, a goal with a tap on the card, full time */
      if ((await stageOf(page)) === 'first') {
        await tap(page, /skip/i); await page.waitForTimeout(900);
        await shot(page, `${tag}-11-interval`);
        const iv = await measure(page);
        out.steps.interval = { stage: await stageOf(page), stagebox: iv.stage, bodyOverflow: iv.bodyOverflow, docHeight: iv.docHeight, score: await page.locator('[data-cm-live-score]').first().innerText().catch(() => null) };
        await tap(page, /^Second half$/i); await page.waitForTimeout(1300);
        await shot(page, `${tag}-12-second-half-start`);
        out.steps.secondHalfStart = { motion: await page.locator('[data-cm-live-pitch]').first().getAttribute('data-cm-motion').catch(() => null), card: await page.locator('[data-cm-goal-card]').count().catch(() => 0), score: await page.locator('[data-cm-live-score]').first().innerText().catch(() => null) };
      }
      out.steps.goal2 = await watchGoal(page, `${tag}-g2`, '2x', { onCard: async p => { await p.waitForTimeout(300); await p.locator('[data-cm-goal-card]').first().click({ timeout: 2000 }).catch(() => {}); } });
    }
    /* on to the whistle */
    for (let i = 0; i < 6; i++) {
      const st = await stageOf(page);
      if (st === 'done' || st === null) break;
      if (st === 'interval') await tap(page, /^Second half$/i); else await tap(page, /skip/i);
      await page.waitForTimeout(1200);
    }
    await page.waitForTimeout(800);
    await shot(page, `${tag}-13-full-time`);
    out.steps.fullTime = await measure(page);
    out.steps.fullTime.stageAttr = await stageOf(page);
    out.steps.fullTime.score = await page.locator('[data-cm-live-score]').first().innerText().catch(() => null);
    const finalSave = await saved(page);
    out.steps.fullTime.saveLive = !!finalSave?.live;
    if (deep) {
      await tap(page, /full report/i); await page.waitForTimeout(900);
      await shot(page, `${tag}-14-report`);
      const rep = await measure(page);
      out.steps.report = { stagebox: rep.stage, bodyOverflow: rep.bodyOverflow, docHeight: rep.docHeight, liveStage: await page.locator('[data-cm-live-stage]').count().catch(() => 0) };
    }
  } catch (e) {
    out.error = String(e && e.stack ? e.stack : e).slice(0, 600);
    await shot(page, `${tag}-99-error`);
  } finally {
    out.pageErrors = page.errors.slice(0, 12);
    await context.close().catch(() => {});
  }
}

const browser = await chromium.launch();
const plans = [
  ['A390', { width: 390, height: 844 }, false, true],
  ['B1280', { width: 1280, height: 900 }, false, true],
  ['C390r', { width: 390, height: 844 }, true, false],
  ['D1280r', { width: 1280, height: 900 }, true, false],
];
for (const [tag, vp, reduced, deep] of plans) {
  if (ONLY && !ONLY.split(',').includes(tag)) continue;
  const t = Date.now();
  await walk(browser, tag, vp, reduced, deep);
  log(`${tag}: ${Math.round((Date.now() - t) / 1000)}s${report.runs[tag].error ? ' ERROR ' + report.runs[tag].error.slice(0, 200) : ''}`);
  fs.writeFileSync(path.join(OUT, 'rv-walk.json'), JSON.stringify(report, null, 1));
}
await browser.close();
fs.writeFileSync(path.join(OUT, 'rv-walk.json'), JSON.stringify(report, null, 1));
log('rv-walk: done, ' + Object.keys(report.runs).length + ' runs, ' + fs.readdirSync(OUT).filter(f => f.endsWith('.png')).length + ' screenshots');
