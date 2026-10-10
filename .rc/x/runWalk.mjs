/* Round 1216 review (lens RUN): a reviewer's own walk of an own goal in Club Manager's live match, never committed.
   Sent as .rc/x/runWalk.mjs to a #!serve #!playwright request. It finds its saves in node with the engine of
   ENGINE_ROOT (the BASE's tree when the request line says so: a save made by the release before this round),
   on a seed and with cases the builder's section 9 does not use (a back for me, a back against me, a keeper, a
   second half), and watches each the way a player does: phone, wide, the phone on its side, reduced motion.
   The live database is refused on every page. Screenshots and a summary go to RC_OUT. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import pw from '../../scripts/lib/playwrightLoader.mjs';

const { chromium } = pw;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const BASE = (process.env.BASE || 'http://localhost:4173').replace(/\/$/, '');
const OUT = process.env.RC_OUT || path.join(ROOT, '.tmp-fx');
const ENGINE_ROOT = process.env.ENGINE_ROOT || ROOT;
const SEED = Number(process.env.WALK_SEED || 20261010);
const KEY = 'dukb-club-manager-save';
let failures = 0;
const lines = [];
const say = m => { console.log(m); lines.push(m); };
const fail = m => { failures++; say('  FAIL: ' + m); };
const ok = m => say('  ok    ' + m);
const info = m => say('  info  ' + m);

/* ---- the saves, found by the engine ---- */
async function findSaves() {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'run-walk-'));
  const bundle = path.join(out, 'engine.mjs');
  const { build } = await import('esbuild');
  await build({ entryPoints: [path.join(ENGINE_ROOT, 'src/lib/clubManager.ts')], bundle: true, platform: 'node', format: 'esm', outfile: bundle, alias: { '@': path.join(ENGINE_ROOT, 'src') }, nodePaths: [path.join(ROOT, 'node_modules')], logLevel: 'error' });
  const memory = new Map();
  if (!globalThis.localStorage) globalThis.localStorage = { getItem: k => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, String(v)), removeItem: k => memory.delete(k) };
  const cm = await import(pathToFileURL(bundle).href);
  const ambient = Math.random;
  let a = SEED;
  Math.random = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const found = {};
  let matches = 0, ownSeen = 0;
  const want = ['meBack', 'oppBack', 'keeper', 'h2', 'plain'];
  const take = (career, live, feed, half) => {
    for (const goal of feed) {
      if (goal.kind !== 'goal' || goal.plus) continue;
      const lo = half === 1 ? 6 : 52, hi = half === 1 ? 38 : 83;
      if (goal.minute < lo || goal.minute > hi) continue;
      if (!goal.og) {
        /* One ordinary goal of mine, as the baseline for how far figures move when an action ends. */
        if (found.plain || half !== 1 || goal.side !== 'me' || goal.penalty || goal.freeKick) continue;
        if (feed.some(e => e !== goal && ['goal', 'var', 'red', 'injury', 'sub'].includes(e.kind) && Math.abs(e.minute - goal.minute) < 4)) continue;
        const plain = structuredClone(career);
        plain.live.minute = goal.minute - 3;
        found.plain = { slot: 'plain', own: false, raw: JSON.stringify(cm.trimCareer(plain)), who: null, keeper: false, half, club: career.clubName, opponent: live.opponent, match: matches, target: { minute: goal.minute, side: goal.side, name: goal.text } };
        continue;
      }
      ownSeen++;
      if (feed.some(e => e !== goal && ((e.kind === 'goal' && Math.abs(e.minute + (e.plus ?? 0) - goal.minute) < 4) || (e.kind === 'var' && Math.abs(e.minute - goal.minute) < 2)))) continue;
      /* Nothing else that changes the cast in his minute: this walk wants the plain picture. */
      if (feed.some(e => ['red', 'injury', 'sub'].includes(e.kind) && Math.abs(e.minute - goal.minute) < 2)) continue;
      let who, keeper;
      if (goal.side === 'opp') {
        const p = career.squad.find(q => q.name === goal.text);
        if (!p) continue;
        who = { mine: true, id: String(p.id) }; keeper = (p.position ?? p.pos) === 'GK';
      } else {
        const started = (live.oppXi ?? []).findIndex(p => p.n === goal.text);
        const bench = (live.oppBench ?? []).findIndex(p => p.n === goal.text);
        if (started < 0 && bench < 0) continue;
        who = { mine: false, id: String(started >= 0 ? started + 1 : 12 + bench) };
        keeper = (started >= 0 ? live.oppXi[started] : live.oppBench[bench]).p === 'GK';
      }
      const slot = half === 2 ? 'h2' : keeper ? 'keeper' : goal.side === 'me' ? 'meBack' : 'oppBack';
      if (found[slot]) continue;
      const copy = structuredClone(career);
      copy.live.minute = goal.minute - 3;
      found[slot] = {
        slot, own: true, raw: JSON.stringify(cm.trimCareer(copy)), who, keeper, half, club: career.clubName, opponent: live.opponent, match: matches,
        target: { minute: goal.minute, side: goal.side, name: goal.text },
      };
    }
  };
  try {
    const began = Date.now();
    for (let season = 0; season < 60 && !want.every(k => found[k]) && Date.now() - began < 170000; season++) {
      let career = cm.startCareer(['Everton', 'Barcelona', 'Arsenal', 'Ajax', 'Newcastle United'][season % 5]);
      for (let guard = 0; guard < 400 && !want.every(k => found[k]); guard++) {
        const next = cm.playNextEntry(career);
        career = next.state;
        if (next.kind === 'seasonOver' || career.sacked) break;
        if (!career.live) continue;
        matches++;
        take(career, career.live, cm.liveFeed(career.live), 1);
        if (!found.h2 && next.kind === 'halftime') {
          const second = cm.startSecondHalf(career);
          if (second && second.live) take(second, second.live, cm.liveFeed(second.live), 2);
        }
        career = cm.resumeMatch(career).state;
      }
    }
  } finally { Math.random = ambient; }
  say(`Saves found by the engine of ${ENGINE_ROOT === ROOT ? 'this tree' : ENGINE_ROOT} on seed ${SEED}: ${matches} matches searched, ${ownSeen} own goals seen in the minutes wanted; ${want.map(k => `${k} ${found[k] ? `match ${found[k].match}` : 'NOT FOUND'}`).join(', ')}`);
  return found;
}

/* ---- the page ---- */
let browser;
const liveRoot = page => page.locator('[data-cm-live-stage]').first();
const minuteOf = async page => Number(await liveRoot(page).getAttribute('data-cm-live-minute').catch(() => 'NaN'));
const stageOf = page => liveRoot(page).getAttribute('data-cm-live-stage').catch(() => null);
const tap = async (page, rx) => {
  const b = page.getByRole('button', { name: rx }).first();
  if (await b.count().catch(() => 0) === 0) return false;
  return b.click({ timeout: 4000 }).then(() => true).catch(() => false);
};
/* WALK_ZOOM=1: a second pass at three device pixels to a CSS pixel, each shot cut to the end of the pitch the
   own goal goes into, so the figures can be read by eye. */
const ZOOM = process.env.WALK_ZOOM === '1';
const shoot = async (page, name) => {
  if (!ZOOM || !page.zoomEnd) { await page.screenshot({ path: path.join(OUT, name + '.png') }).catch(() => {}); return; }
  const box = await page.locator('[data-cm-live-pitch]').first().boundingBox().catch(() => null);
  if (!box) return;
  const tall = box.height * .4;
  await page.screenshot({ path: path.join(OUT, name + '-zoom.png'), clip: { x: box.x, y: page.zoomEnd === 'top' ? box.y : box.y + box.height - tall, width: box.width, height: tall } }).catch(() => {});
};
async function openFrom(save, options) {
  const context = await browser.newContext({ ...options, storageState: { cookies: [], origins: [{ origin: BASE, localStorage: [{ name: KEY, value: save.raw }] }] } });
  const page = await context.newPage();
  await page.route(/supabase\.co/, route => route.abort());
  page.errors = [];
  page.on('pageerror', e => page.errors.push(String(e && e.message ? e.message : e)));
  await page.goto(BASE + '/club-manager', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1000);
  await page.getByRole('button', { name: /^essential only$/i }).first().click({ timeout: 1200 }).catch(() => {});
  const resume = page.getByRole('button', { name: /Resume Career/i }).first();
  if (await resume.count().catch(() => 0)) { await resume.click({ timeout: 4000 }).catch(() => {}); await page.waitForTimeout(700); }
  for (let i = 0; i < 8 && !(await page.locator('[data-cm-live-stage]').count().catch(() => 0)); i++) {
    const way = page.locator('button:visible[data-cm-way="live"]').first();
    if (await way.count().catch(() => 0)) await way.click({ timeout: 4000 }).catch(() => {});
    else await page.locator('button:visible').filter({ hasText: /Play Live|Resume match/i }).first().click({ timeout: 4000 }).catch(() => {});
    await page.waitForTimeout(900);
  }
  return { context, page };
}
async function startSampler(page) {
  await page.evaluate(() => {
    const out = [];
    window.__run = { out, on: true };
    const read = () => {
      if (!window.__run.on) return;
      const pitch = document.querySelector('[data-cm-live-pitch]');
      const score = document.querySelector('[data-cm-live-score]');
      const card = document.querySelector('[data-cm-goal-card]');
      const root = document.querySelector('[data-cm-live-stage]');
      const log = document.querySelector('[data-cm-live-log]');
      const land = pitch && pitch.getAttribute('data-pm-orient') === 'landscape';
      const at = el => { const l = parseFloat(el.style.left), t = parseFloat(el.style.top); return land ? [t, 100 - l] : [l, t]; };
      const ball = pitch ? pitch.querySelector('[data-cm-ball]') : null;
      const cardLine = card ? card.querySelector('[data-cm-goal-card-line]') : null;
      out.push({
        t: performance.now(),
        minute: root ? Number(root.getAttribute('data-cm-live-minute')) : null,
        score: score ? score.textContent.replace(/\s+/g, ' ').trim() : null,
        motion: pitch ? pitch.getAttribute('data-cm-motion') : null,
        phase: pitch ? pitch.getAttribute('data-cm-motion-phase') : null,
        orient: pitch ? pitch.getAttribute('data-pm-orient') : null,
        own: pitch ? pitch.getAttribute('data-pm-own-goal') : null,
        net: pitch ? pitch.querySelectorAll('[data-cm-net="goal"]').length : 0,
        ball: ball ? at(ball) : null,
        dots: pitch ? [...pitch.querySelectorAll('[data-cm-dot], [data-cm-dot-opp]')].map(el => ({
          mine: el.hasAttribute('data-cm-dot'), id: el.getAttribute('data-cm-dot') ?? el.getAttribute('data-cm-dot-opp'), at: at(el),
          rue: !!el.querySelector('[data-pm-rue]'), pose: (el.querySelector('[data-cm-actor-pose]') || { getAttribute: () => null }).getAttribute('data-cm-actor-pose'),
          label: el.textContent.replace(/\s+/g, ' ').trim(),
        })) : [],
        cardLine: cardLine ? cardLine.textContent.replace(/\s+/g, ' ').trim() : null,
        cardBox: card ? (() => { const r = card.getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom]; })() : null,
        cardClip: cardLine ? [...cardLine.children].some(c => !c.classList.contains('truncate') && c.scrollWidth > c.clientWidth + 1) : false,
        goals: log && log.getBoundingClientRect().height > 0 ? [...log.querySelectorAll('li')].filter(li => li.textContent.includes('GOAL!')).map(li => li.textContent.replace(/\s+/g, ' ').trim()) : null,
        vw: window.innerWidth, vh: window.innerHeight, sx: document.documentElement.scrollWidth,
      });
      requestAnimationFrame(read);
    };
    requestAnimationFrame(read);
  });
}
const takeSamples = page => page.evaluate(() => (window.__run ? window.__run.out.splice(0) : []));

/* ---- one watch ---- */
async function watch(save, label, options, { reduced = false, speed = '1x', tapCard = false } = {}) {
  say(`${label}: ${save.club} v ${save.opponent}, ${save.target.name} ${save.target.minute}' ${save.own ? '(O.G) ' : ''}${save.target.side === 'me' ? 'for me' : 'against me'}${save.keeper ? ', off the keeper' : ''}${save.half === 2 ? ', second half' : ''}; ${options.viewport.width} by ${options.viewport.height}, ${reduced ? 'reduced motion' : 'motion on'}, speed ${speed}`);
  const { context, page } = await openFrom(save, { ...options, ...(reduced ? { reducedMotion: 'reduce' } : {}), ...(ZOOM ? { deviceScaleFactor: 3 } : {}) });
  page.zoomEnd = save.target.side === 'me' ? 'top' : 'bottom';
  try {
    if (!(await page.locator('[data-cm-live-stage]').count().catch(() => 0))) { fail(`${label}: the live viewer never opened from the save`); await shoot(page, label + '-noviewer'); return; }
    const stage = await stageOf(page), m0 = await minuteOf(page);
    if (save.half === 2 && stage !== 'second') { info(`${label}: the save opened at stage ${stage}, minute ${m0}: this walk cannot watch a second half goal that way (not a finding by itself)`); await shoot(page, label + '-stage'); return; }
    await startSampler(page);
    await page.getByRole('button', { name: speed, exact: true }).first().click({ timeout: 3000 }).catch(() => {});
    await tap(page, /^Resume$/i);
    const samples = [], shots = new Map();
    const until = Date.now() + 30000;
    while (Date.now() < until) {
      await page.waitForTimeout(40);
      const fresh = await takeSamples(page);
      samples.push(...fresh);
      const last = fresh[fresh.length - 1];
      if (!last) continue;
      const goal = last.motion === 'goal';
      if (goal && last.phase === 'plant' && !shots.has('plant')) { shots.set('plant', 1); await shoot(page, label + '-1plant'); }
      else if (goal && last.phase === 'flight' && !shots.has('flight')) { shots.set('flight', 1); await shoot(page, label + '-2flight'); }
      else if (goal && last.phase === 'flight' && !shots.has('flight2')) { shots.set('flight2', 1); await shoot(page, label + '-3flight'); }
      else if (ZOOM && goal && last.phase === 'flight' && (shots.get('more') ?? 0) < 6) { shots.set('more', (shots.get('more') ?? 0) + 1); await shoot(page, `${label}-3flight${shots.get('more')}`); }
      else if (ZOOM && goal && last.phase === 'net' && !shots.has('net')) { shots.set('net', 1); await shoot(page, label + '-3net'); }
      else if (last.cardLine && !shots.has('seen')) shots.set('seen', last.t);
      else if (last.cardLine && !shots.has('card') && last.t - shots.get('seen') >= 600) {
        shots.set('card', 1); await shoot(page, label + '-4card');
        if (tapCard) { await page.locator('[data-cm-goal-card]').first().click({ timeout: 2000 }).catch(() => {}); samples.push({ tapped: true, t: last.t }); }
      } else if (shots.has('card') && !last.cardLine && !shots.has('gone')) shots.set('gone', last.t);
      else if (shots.has('gone') && !shots.has('after') && last.t - shots.get('gone') >= 1200) { shots.set('after', 1); await shoot(page, label + '-5after'); }
      if (last.minute !== null && last.minute >= save.target.minute + 2 && shots.has('after')) break;
      if (last.minute !== null && last.minute >= save.target.minute + 5) break;
    }
    await page.evaluate(() => { if (window.__run) window.__run.on = false; });
    judge(save, label, samples.filter(s => !s.tapped), { reduced, tapped: samples.some(s => s.tapped) });
    if (page.errors.length) fail(`${label}: the page threw: ${page.errors.slice(0, 3).join(' | ')}`);
  } finally { await context.close(); }
}

/* How far any dot moves between two frames running, inside the action and across its end. */
function continuity(label, frames, playing) {
  const step = (a, b) => { let most = { d: 0, who: '' }; for (const d of b.dots) { const was = a.dots.find(o => o.mine === d.mine && o.id === d.id); if (!was) continue; const moved = Math.hypot(d.at[0] - was.at[0], d.at[1] - was.at[1]); if (moved > most.d) most = { d: moved, who: `${d.mine ? 'mine' : 'theirs'} ${d.id}` }; } return most; };
  let inside = { d: 0, who: '', dt: 0, phase: '' }, ballMost = 0;
  for (let i = 1; i < playing.length; i++) {
    const s = step(playing[i - 1], playing[i]);
    if (s.d > inside.d) inside = { ...s, dt: playing[i].t - playing[i - 1].t, phase: playing[i].phase };
    ballMost = Math.max(ballMost, Math.hypot(playing[i].ball[0] - playing[i - 1].ball[0], playing[i].ball[1] - playing[i - 1].ball[1]));
  }
  const endAt = frames.indexOf(playing[playing.length - 1]);
  let across = { d: 0, who: '' }, after = { d: 0, who: '' };
  if (endAt >= 0 && endAt + 1 < frames.length) across = step(frames[endAt], frames[endAt + 1]);
  for (let i = endAt + 2; i < Math.min(frames.length, endAt + 40); i++) { const s = step(frames[i - 1], frames[i]); if (s.d > after.d) after = s; }
  info(`${label}: the biggest move of a figure between two frames: inside the action ${inside.d.toFixed(2)} (${inside.who}, ${inside.phase}, ${inside.dt.toFixed(0)} ms apart), across its end ${across.d.toFixed(2)} (${across.who}), in the 40 frames after ${after.d.toFixed(2)}; the ball's biggest step inside the action ${ballMost.toFixed(2)}`);
  if (inside.d > 10 && inside.dt < 120) fail(`${label}: a figure jumps ${inside.d.toFixed(1)} in one frame inside the action (${inside.who})`);
  return { inside, across, after };
}

/* ---- what the frames say ---- */
function judge(save, label, samples, { reduced }) {
  const frames = samples.filter(s => s.score !== null && s.dots && s.dots.length && s.ball);
  const playing = frames.filter(f => f.motion === 'goal');
  if (playing.length < 5) { fail(`${label}: only ${playing.length} frames of a goal's action were sampled (of ${frames.length})`); return; }
  const isMan = d => !!save.who && d.mine === save.who.mine && String(d.id) === String(save.who.id);
  const gap = (f, d) => Math.hypot(d.at[0] - f.ball[0], d.at[1] - f.ball[1]);
  const scoringSide = d => (save.target.side === 'me') === d.mine;
  info(`${label}: ${frames.length} frames, ${playing.length} of the goal (${['plant', 'flight', 'net'].map(p => `${p} ${playing.filter(f => f.phase === p).length}`).join(', ')}), the pitch is ${playing[0].orient}`);
  /* The card. */
  const cards = [...new Set(frames.map(f => f.cardLine).filter(Boolean))];
  const wanted = `${save.target.minute}'${save.own ? ' (O.G)' : ''}`;
  if (cards.length !== 1 || !cards[0].startsWith('GOAL!') || !cards[0].includes(save.target.name) || !cards[0].endsWith(wanted)) fail(`${label}: the card read ${JSON.stringify(cards)}, wanted GOAL!, ${save.target.name}, ${wanted}`);
  else ok(`${label}: the card reads "${cards[0]}"`);
  const carded = frames.filter(f => f.cardBox);
  const off = carded.filter(f => f.cardBox[0] < -0.5 || f.cardBox[2] > f.vw + 0.5 || f.cardBox[1] < -0.5 || f.cardBox[3] > f.vh + 0.5).length;
  const clipped = carded.filter(f => f.cardClip).length;
  if (off || clipped) fail(`${label}: the card is off the screen on ${off} frames and a fixed part of its line is clipped on ${clipped} of ${carded.length}`);
  const scrolls = frames.filter(f => f.sx > f.vw + 1);
  if (scrolls.length) fail(`${label}: the page is wider than the screen on ${scrolls.length} frames (scrollWidth ${scrolls[0].sx}, screen ${scrolls[0].vw})`);
  /* The mark on the surface. */
  const unmarked = playing.filter(f => f.own === null || f.own === '').length;
  const stray = frames.filter(f => f.motion !== 'goal' && f.own !== null).length;
  if (save.own) { if (unmarked || stray) fail(`${label}: the surface does not name the man on ${unmarked} of ${playing.length} frames of the own goal, and carries the mark on ${stray} frames outside it`); else ok(`${label}: the surface marks all ${playing.length} frames of the own goal and none outside it`); }
  else if (frames.some(f => f.own !== null)) fail(`${label}: a goal that is not an own goal carries the own goal mark`);
  /* The score waits for the ball. */
  const before = frames[0].score, after = frames[frames.length - 1].score;
  const early = playing.filter(f => f.phase !== 'net' && f.score !== before).length;
  if (before === after) fail(`${label}: the score never changed (${before})`);
  else if (early) fail(`${label}: the score read ${after} on ${early} frames before the ball was in the net`);
  else ok(`${label}: the score goes ${before} to ${after}, never before the net`);
  const net = playing.filter(f => f.phase === 'net');
  if (net.some(f => f.net !== 1)) fail(`${label}: ${net.filter(f => f.net !== 1).length} frames of the net phase show no net (or two) as hit`);
  if (!save.own) { continuity(label, frames, playing); return; }
  if (reduced) {
    if (playing[0].phase !== 'net') fail(`${label}: under reduced motion the first frame of the goal is phase ${playing[0].phase}, not the last frame`);
    const places = new Set(playing.map(f => JSON.stringify([f.ball, f.dots.map(d => d.at)])));
    if (places.size !== 1) fail(`${label}: under reduced motion the picture took ${places.size} different shapes while the action held`);
    else ok(`${label}: reduced motion shows one still picture for all ${playing.length} frames of the action, in the net at once`);
  } else {
    const flight = playing.filter(f => f.phase === 'flight');
    const withMan = flight.filter(f => f.dots.some(isMan));
    if (flight.length < 5 || !withMan.length) { fail(`${label}: ${flight.length} frames of the flight, ${withMan.length} with the man the card names on the grass`); return; }
    const touch = withMan.reduce((x, y) => (gap(x, x.dots.find(isMan)) <= gap(y, y.dots.find(isMan)) ? x : y));
    const nearest = touch.dots.reduce((x, y) => (gap(touch, x) <= gap(touch, y) ? x : y));
    const man = touch.dots.find(isMan), reach = gap(touch, man);
    if (!isMan(nearest) || reach > 3) fail(`${label}: the ball never comes to the man the card names (nearest ${reach.toFixed(1)}; the dot nearest it then is ${nearest.mine ? 'mine' : 'theirs'} ${nearest.id} "${nearest.label}")`);
    else ok(`${label}: the ball comes within ${reach.toFixed(1)} of the man the card names (dot "${man.label}", pose ${man.pose}) and nobody is nearer`);
    const surname = save.target.name.split(' ').pop();
    info(`${label}: at the touch his dot reads "${man.label}" (${man.label.includes(surname) ? 'his name is on it' : 'HIS NAME IS NOT ON IT'}); he stands ${man.at.map(v => v.toFixed(1)).join(', ')}`);
    const crowd = flight.filter(f => f.t > touch.t && f.dots.some(d => scoringSide(d) && gap(f, d) < 2)).length;
    if (crowd) fail(`${label}: after the touch a man of the side that got it is within 2 of the ball on ${crowd} frames`);
    continuity(label, frames, playing);
  }
  const settled = net.slice(3);
  const rued = settled.filter(f => f.dots.filter(d => d.rue).length === 1 && f.dots.some(d => d.rue && isMan(d))).length;
  const cheer = net.filter(f => f.dots.some(d => !scoringSide(d) && d.pose === 'celebrate')).length;
  const arms = Math.max(0, ...net.map(f => f.dots.filter(d => scoringSide(d) && d.pose === 'celebrate').length));
  const manPose = [...new Set(settled.map(f => (f.dots.find(isMan) || {}).pose))].join('/');
  if (rued !== settled.length || cheer || !arms || arms > 3) fail(`${label}: in the net he alone holds his head on ${rued} of ${settled.length} frames, a man of his side has arms up on ${cheer}, the side that got it raises ${arms} pairs of arms`);
  else ok(`${label}: in the net he alone carries the head in hands mark (${rued} frames; his figure's pose attribute reads ${manPose}), nobody of his side cheers, ${arms} of the other side raise their arms`);
  const told = [...new Set(frames.flatMap(f => f.goals || []))].filter(g => g.includes(surnameOf(save)));
  info(`${label}: the list beside the pitch says ${told.length ? JSON.stringify(told) : '(no line with his name on screen at this size)'}`);
  if (told.length && !told.every(g => g.includes('(O.G)'))) fail(`${label}: the list names him without (O.G)`);
}
const surnameOf = save => save.target.name.split(' ').pop();

/* ---- the help panel and What's New, as a player reads them ---- */
async function readHelp(save) {
  const { context, page } = await openFrom(save, PHONE);
  try {
    await tap(page, /^Pause$/i);
    await tap(page, /How watching a match works/i);
    await page.waitForTimeout(500);
    const help = page.locator('[data-cm-live-help]').first();
    if (!(await help.count().catch(() => 0))) { fail('help: the ? panel did not open'); await shoot(page, 'help-390-missing'); return; }
    const read = await help.evaluate(el => {
      const li = [...el.querySelectorAll('li')].find(x => x.textContent.includes('(O.G)'));
      const r = el.getBoundingClientRect();
      return { text: li ? li.textContent : null, box: [r.left, r.top, r.right, r.bottom], vw: window.innerWidth, vh: window.innerHeight, wide: li ? li.scrollWidth > li.clientWidth + 1 : false, inner: el.scrollHeight, shown: el.clientHeight };
    });
    await shoot(page, 'help-390');
    if (!read.text || !read.text.includes('On the pitch the ball goes in off him and he holds his head.')) fail(`help: the (O.G) bullet reads ${JSON.stringify(read.text)}`);
    else ok(`help: the (O.G) bullet reads "${read.text}"`);
    if (read.box[0] < -0.5 || read.box[2] > read.vw + 0.5 || read.wide) fail(`help: the panel runs off the screen sideways (${read.box.map(v => v.toFixed(0)).join(', ')} on ${read.vw})`);
    info(`help: the panel is ${read.box.map(v => v.toFixed(0)).join(', ')} on a ${read.vw} by ${read.vh} screen, content ${read.inner} tall in ${read.shown}`);
    const dash = [String.fromCharCode(0x2013), String.fromCharCode(0x2014)];
    if (read.text && dash.some(d => read.text.includes(d))) fail('help: a dash in the bullet');
    const li = help.locator('li').filter({ hasText: '(O.G)' }).first();
    await li.scrollIntoViewIfNeeded().catch(() => {});
    await shoot(page, 'help-390-bullet');
  } finally { await context.close(); }
}
async function readWhatsNew() {
  const context = await browser.newContext(PHONE);
  const page = await context.newPage();
  await page.route(/supabase\.co/, route => route.abort());
  try {
    await page.goto(BASE + '/whats-new', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1500);
    await page.getByRole('button', { name: /^essential only$/i }).first().click({ timeout: 1200 }).catch(() => {});
    const entry = page.locator('li').filter({ hasText: 'an own goal looks like one on the pitch' }).first();
    if (!(await entry.count().catch(() => 0))) { fail("What's New: the entry is not on the page"); await shoot(page, 'whatsnew-390-missing'); return; }
    const text = await entry.textContent();
    const first = await page.locator('main li, li').first().textContent().catch(() => '');
    await entry.scrollIntoViewIfNeeded().catch(() => {});
    await shoot(page, 'whatsnew-390');
    say(`  info  What's New entry (${text.length} characters): ${text}`);
    const dash = [String.fromCharCode(0x2013), String.fromCharCode(0x2014)];
    if (dash.some(d => text.includes(d))) fail("What's New: a dash in the entry"); else ok("What's New: the entry is there, with no dash in it");
    info(`What's New: the first list item on the page starts "${String(first).slice(0, 60)}"`);
    const wide = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    if (wide) fail("What's New: the page is wider than the phone");
  } finally { await context.close(); }
}

/* ---- the walk ---- */
const PHONE = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true };
const WIDE = { viewport: { width: 1280, height: 900 } };
const SIDE = { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true };
const PLAN = ZOOM ? [
  ['meBack', 'z-meBack-390', PHONE, { speed: '0.5x' }],
  ['keeper', 'z-keeper-390', PHONE, { speed: '0.5x' }],
  ['oppBack', 'z-oppBack-390', PHONE, { speed: '0.5x' }],
  ['meBack', 'z-meBack-390-reduced', PHONE, { reduced: true, speed: '2x' }],
  ['keeper', 'z-keeper-390-reduced', PHONE, { reduced: true, speed: '2x' }],
  ['plain', 'z-plain-390', PHONE, { speed: '0.5x' }],
  ['plain', 'z-plain-390-tap', PHONE, { speed: '0.5x', tapCard: true }],
  ['meBack', 'z-meBack-390-tap', PHONE, { speed: '0.5x', tapCard: true }],
] : [
  ['meBack', 'meBack-390', PHONE, { speed: '1x' }],
  ['meBack', 'meBack-1280', WIDE, { speed: '2x' }],
  ['meBack', 'meBack-390-reduced', PHONE, { reduced: true, speed: '2x' }],
  ['meBack', 'meBack-844side', SIDE, { speed: '1x' }],
  ['oppBack', 'oppBack-390', PHONE, { speed: '0.5x', tapCard: true }],
  ['oppBack', 'oppBack-1280-reduced', WIDE, { reduced: true, speed: '2x' }],
  ['keeper', 'keeper-390', PHONE, { speed: '1x' }],
  ['keeper', 'keeper-1280', WIDE, { speed: '1x' }],
  ['h2', 'h2-390', PHONE, { speed: '2x' }],
  ['plain', 'plain-390', PHONE, { speed: '1x' }],
];
const found = await findSaves();
for (const save of Object.values(found)) fs.writeFileSync(path.join(OUT, `save-${save.slot}.json`), JSON.stringify({ slot: save.slot, who: save.who, keeper: save.keeper, half: save.half, club: save.club, opponent: save.opponent, target: save.target, bytes: save.raw.length }));
browser = await chromium.launch();
try {
  for (const [slot, label, options, how] of PLAN) {
    if (!found[slot]) { (slot === 'h2' || slot === 'keeper' ? info : fail)(`${label}: the engine search found no save for ${slot}`); continue; }
    try { await watch(found[slot], label, options, how); } catch (error) { fail(`${label}: the watch threw: ${String(error && error.message ? error.message : error).split('\n')[0]}`); }
  }
  const any = found.meBack || found.oppBack || found.keeper;
  if (any && !ZOOM) await readHelp(any).catch(error => fail(`help: threw ${String(error.message).split('\n')[0]}`));
  if (!ZOOM) await readWhatsNew().catch(error => fail(`What's New: threw ${String(error.message).split('\n')[0]}`));
} finally { await browser.close(); }
say(failures ? `runWalk: RED, ${failures} failed.` : 'runWalk: green. Every watch held what a player is promised.');
fs.writeFileSync(path.join(OUT, ZOOM ? 'runWalk-zoom-summary.txt' : 'runWalk-summary.txt'), lines.join('\n') + '\n');
process.exit(failures ? 1 : 0);
