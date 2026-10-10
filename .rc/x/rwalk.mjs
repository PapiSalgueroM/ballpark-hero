/* Reviewer's walk of Round 1220 (draft night). Not committed. Sent as .rc/x/rwalk.mjs.
   It observes and records; it never asserts. Reads BASE, writes into RC_OUT. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

const ROOT = process.cwd();
const BASE = new URL(process.env.BASE || 'http://localhost:4173').origin;
const OUT = path.resolve(process.env.RC_OUT || path.join(ROOT, '.tmp-fx/rwalk-out'));
fs.mkdirSync(OUT, { recursive: true });
const ONLY = process.env.RWALK_ONLY || '';

const bundle = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'rwalk-')), 'engine.cjs');
await build({
  stdin: { contents: `
    import { NFL_CAREER_SPORT } from '@/lib/nflCareerSport';
    import { NBA_CAREER_SPORT } from '@/lib/nbaCareerSport';
    import { MLB_CAREER_SPORT } from '@/lib/mlbCareerSport';
    import { NHL_CAREER_SPORT } from '@/lib/nhlCareerSport';
    export const sports = { nfl: NFL_CAREER_SPORT, nba: NBA_CAREER_SPORT, mlb: MLB_CAREER_SPORT, nhl: NHL_CAREER_SPORT };
    export * from '@/lib/careerPreDraft';
    export * from '@/lib/careerDraftNight';
    export { createUsCareerProspect } from '@/lib/usCareerProspect';
    export { defaultAppearance } from '@/lib/soccerCareerAppearance';
  `, resolveDir: ROOT, sourcefile: 'rwalk-engine.ts', loader: 'ts' },
  outfile: bundle, bundle: true, platform: 'node', format: 'cjs', logLevel: 'silent', alias: { '@': path.join(ROOT, 'src') },
});
const M = createRequire(import.meta.url)(bundle);

const oldEra = sport => sport.create.eras.map(e => e.id).find(id => id !== 'now');
function fresh(sport, eraId, pos, seed, rating) {
  const made = M.createUsCareerProspect(sport, { name: 'Rev Walker', pos, archetypeId: sport.create.archetypes[pos][0].id, eraId, appearance: M.defaultAppearance(), seed });
  return rating ? { ...made, rating, pot: Math.max(made.pot, rating) } : made;
}
function advance(sport, p, phase) {
  const desc = sport.preDraft(p.eraId);
  let state = M.preDraftStart(desc, { ...p, routeId: desc.routes[0].id });
  for (let n = 0; n < 14 && state.phase !== 'showcase'; n += 1) state = state.phase === 'season' ? M.preDraftPlaySeason(desc, state) : M.preDraftChoose(desc, state, 0);
  return { ...p, state: phase === 'showcase' ? state : M.preDraftShowcase(desc, state, 'steady') };
}
/* The first seed whose draft ends the way the case wants. Returns the prospect at `phase`. */
function find(slug, { era = 'now', pos, want, ratings = [undefined], phase = 'draft', tag = 'rv' }) {
  const sport = M.sports[slug];
  const eraId = era === 'old' ? oldEra(sport) : era;
  const position = pos || sport.create.defaultPos;
  const desc = sport.preDraft(eraId);
  const teams = desc.teamIds().length, total = teams * desc.rounds;
  for (const rating of ratings) for (let n = 0; n < 400; n += 1) {
    const p = fresh(sport, eraId, position, `${slug}:${tag}-${era}-${n}`, rating);
    const at = advance(sport, p, 'draft');
    const done = M.preDraftRunDraft(desc, at.state);
    if (want(done.draft, { teams, total, desc })) return { sport, desc, eraId, p: phase === 'draft' ? at : phase === 'showcase' ? advance(sport, p, 'showcase') : p, done, total, teams };
  }
  throw new Error(`no prospect found for ${slug} ${era}`);
}

/* In the page: a frame by frame record, started before the press. */
const RECORD = () => {
  const t0 = performance.now(); window.__rv = [];
  const op = el => (el ? Number(getComputedStyle(el).opacity) : null);
  const tick = () => {
    const j = document.querySelector('[data-prospect-journey]');
    const card = document.querySelector('[data-testid="draft-showcase"]');
    const night = document.querySelector('[data-career-night]');
    const closing = night && night.querySelector("[data-night-row='you'], [data-night-row='unpicked']");
    const r = closing && closing.getBoundingClientRect();
    const acts = night && night.querySelector('[data-night-actions]');
    const ar = acts && acts.getBoundingClientRect();
    window.__rv.push({ t: Math.round(performance.now() - t0), y: Math.round(window.scrollY), card: card ? Math.round(card.getBoundingClientRect().height) : null,
      journey: j ? Math.round(j.getBoundingClientRect().height) : null, stage: night ? night.dataset.nightStage : null,
      h2: op(j && j.querySelector('h2')), club: op(j && j.querySelector('h2 + p')), result: op(document.querySelector('[data-testid="draft-result"]')),
      held: night ? [...document.querySelectorAll('[data-night-held]')].map(op) : [], closing: op(closing), top: r ? Math.round(r.top) : null, bottom: r ? Math.round(r.bottom) : null,
      actsBottom: ar ? Math.round(ar.bottom) : null,
      rows: night ? [...night.querySelectorAll('[data-night-row]')].map(op) : [], faces: night ? [...night.querySelectorAll('[data-lottery-face]')].map(op) : [],
      conf: night ? night.querySelectorAll('[data-night-board] > :not(.relative)').length : 0,
      vh: window.innerHeight, sw: document.documentElement.scrollWidth, vw: document.documentElement.clientWidth });
    if (performance.now() - t0 < 9000) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};
/* In the page: boil the frames down to what a reviewer reads. */
const SUMMARY = () => {
  const all = window.__rv || [];
  const f = all.filter(s => s.stage !== null);
  if (!f.length) {
    const cards = all.map(s => s.card).filter(x => x !== null), ys = all.map(s => s.y);
    return { frames: 0, total: all.length, card: cards.length ? [Math.min(...cards), Math.max(...cards)] : null, y: ys.length ? [Math.min(...ys), Math.max(...ys)] : null };
  }
  const t0 = f[0].t, last = f[f.length - 1];
  const span = k => { const v = f.map(s => s[k]).filter(x => x !== null); return [Math.min(...v), Math.max(...v)]; };
  const scrolls = []; for (const s of all) if (!scrolls.length || scrolls[scrolls.length - 1][1] !== s.y) scrolls.push([s.t - t0, s.y]);
  const arrive = (key, n) => Array.from({ length: n }, (_, i) => { const hit = f.find(s => s[key][i] > 0.9); return hit ? hit.t - t0 : null; });
  const landing = f.find(s => s.closing > 0.9);
  const firstShown = k => { const hit = f.find(s => s[k] > 0.05); return hit ? hit.t - t0 : null; };
  const heldShown = (() => { const hit = f.find(s => s.held.some(o => o > 0.05)); return hit ? hit.t - t0 : null; })();
  const confAt = (() => { const hit = f.find(s => s.conf > 0); return hit ? hit.t - t0 : null; })();
  return { frames: f.length, firstStage: f[0].stage, lastStage: last.stage, card: span('card'), journey: span('journey'), scrolls: scrolls.slice(0, 12),
    rowsAt: arrive('rows', f[0].rows.length), facesAt: arrive('faces', f[0].faces.length),
    landing: landing ? { ms: landing.t - t0, top: landing.top, bottom: landing.bottom, vh: landing.vh, actsBottom: landing.actsBottom, y: landing.y } : null,
    h2At: firstShown('h2'), clubAt: firstShown('club'), resultAt: firstShown('result'), closingAt: firstShown('closing'), heldAt: heldShown, confettiAt: confAt,
    first: { h2: f[0].h2, club: f[0].club, result: f[0].result, closing: f[0].closing, rowsMin: Math.min(...f[0].rows), held: f[0].held },
    end: { h2: last.h2, club: last.club, result: last.result, closing: last.closing, rowsMin: Math.min(...last.rows), top: last.top, bottom: last.bottom, y: last.y },
    wide: f.some(s => s.sw > s.vw + 1) };
};

/* In the page: what is on screen now, in words and boxes. */
const AUDIT = () => {
  const j = document.querySelector('[data-prospect-journey]');
  const night = document.querySelector('[data-career-night]');
  const clean = s => (s || '').replace(/\s+/g, ' ').trim();
  const box = el => { const r = el.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)]; };
  const parse = c => { const m = (c || '').match(/[\d.]+/g); if (!m || m.length < 3 || !/^rgb/.test(c)) return null; const n = m.map(Number); return { r: n[0], g: n[1], b: n[2], a: n.length > 3 ? n[3] : 1 }; };
  const over = (top, base) => ({ r: top.r * top.a + base.r * (1 - top.a), g: top.g * top.a + base.g * (1 - top.a), b: top.b * top.a + base.b * (1 - top.a), a: 1 });
  const bgOf = el => { const layers = []; for (let n = el; n; n = n.parentElement) { const c = parse(getComputedStyle(n).backgroundColor); if (c && c.a > 0) { layers.push(c); if (c.a >= 1) break; } } let base = { r: 255, g: 255, b: 255, a: 1 }; for (const l of layers.reverse()) base = over(l, base); return base; };
  const lum = c => { const f = v => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const out = { phase: j ? j.dataset.prospectPhase : null, hasNight: !!night, vh: innerHeight, vw: document.documentElement.clientWidth, sw: document.documentElement.scrollWidth, y: Math.round(scrollY), docH: document.documentElement.scrollHeight };
  if (!j) return out;
  out.title = clean(j.querySelector('h2') && j.querySelector('h2').innerText);
  out.club = clean(j.querySelector('h2 + p') && j.querySelector('h2 + p').innerText);
  out.srTitle = clean(j.querySelector('h3.sr-only') && j.querySelector('h3.sr-only').textContent);
  out.hold = j.style.getPropertyValue('--night-hold');
  out.range = clean((document.querySelector('[data-testid="draft-range"]') || {}).innerText);
  const res = document.querySelector('[data-testid="draft-result"]');
  out.result = res ? { text: clean(res.innerText), box: box(res), op: getComputedStyle(res).opacity } : null;
  out.buttons = [...j.querySelectorAll('button')].map(b => ({ text: clean(b.textContent || b.getAttribute('aria-label')).slice(0, 40), box: box(b), disabled: b.disabled }));
  out.starts = out.buttons.filter(b => b.text === 'Start your career').length;
  const a = document.activeElement;
  out.active = a ? `${a.tagName}:${clean(a.textContent).slice(0, 50)}` : null;
  out.status = clean([...j.querySelectorAll('[role="status"]')].map(x => x.textContent).join(' | '));
  if (night) {
    out.stage = night.dataset.nightStage;
    out.rows = [...night.querySelectorAll('[data-night-row]')].map(li => ({ kind: li.dataset.nightRow, text: clean(li.innerText), box: box(li), op: getComputedStyle(li).opacity }));
    out.tiles = [...night.querySelectorAll('[data-lottery-slot]')].map(li => ({ slot: li.dataset.lotterySlot, text: clean(li.querySelector('[data-lottery-face]').innerText), box: box(li) }));
    const t = sel => clean((night.querySelector(sel) || {}).innerText);
    out.rule = t('[data-lottery-rule]'); out.note = t('[data-lottery-note]'); out.headline = t('[data-lottery-headline]'); out.nightRange = t('[data-night-range]');
    out.nightBox = box(night); out.boardBox = box(night.querySelector('[data-night-board]')); out.actionsBox = box(night.querySelector('[data-night-actions]'));
    out.cut = [...night.querySelectorAll('*')].filter(el => el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX !== 'visible' && clean(el.innerText)).map(el => `${clean(el.innerText).slice(0, 60)} [${el.clientWidth} of ${el.scrollWidth}]`);
    out.confetti = night.querySelectorAll('.cm-confetti').length;
    const low = [];
    for (const el of night.querySelectorAll('*')) {
      const own = [...el.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim()).map(n => n.textContent.trim()).join(' ');
      if (!own) continue;
      const cs = getComputedStyle(el); const fg = parse(cs.color); if (!fg) { low.push(`UNPARSED ${cs.color} :: ${own.slice(0, 30)}`); continue; }
      const bg = bgOf(el); const k = ratio(over(fg, bg), bg);
      if (k < 4.5) low.push(`${k.toFixed(2)} ${cs.color} on rgb(${Math.round(bg.r)},${Math.round(bg.g)},${Math.round(bg.b)}) ${cs.fontSize} hidden=${el.closest('[aria-hidden]') ? 1 : 0} :: ${own.slice(0, 40)}`);
    }
    out.lowContrast = [...new Set(low)].slice(0, 14);
  }
  return out;
};

const SIZES = { p: { width: 390, height: 844, touch: true }, d: { width: 1280, height: 900, touch: false }, s: { width: 320, height: 640, touch: true }, l: { width: 844, height: 390, touch: true }, t: { width: 768, height: 1024, touch: true } };
const report = [];
const errors = [];
let shotBytes = 0;
const phaseOf = page => page.locator('[data-prospect-journey]').getAttribute('data-prospect-phase');

async function openPage(browser, c) {
  const size = SIZES[c.size];
  const route = `/${c.f.sport.gameSlug}`;
  const save = c.rawSave !== undefined ? c.rawSave : { c: null, phase: 'prospect', teamQuality: null, coach: null, prospect: c.f.p };
  const context = await browser.newContext({
    viewport: { width: size.width, height: size.height }, isMobile: size.touch, hasTouch: size.touch, deviceScaleFactor: 1,
    reducedMotion: c.reduced ? 'reduce' : 'no-preference', serviceWorkers: 'block',
    storageState: { cookies: [], origins: [{ origin: BASE, localStorage: [
      { name: c.f.sport.saveKey, value: JSON.stringify(save) },
      { name: `rules-gate-seen:${route}`, value: '1' }, { name: 'cookie-consent', value: 'essential' },
    ] }] },
  });
  await context.route('**/*', async r => {
    const url = r.request().url();
    if (/supabase\.co/.test(url)) return r.abort();
    if (/DraftNightSequence/.test(url)) {
      if (c.blockChunk) return r.abort();
      if (c.delayChunk) await new Promise(done => setTimeout(done, c.delayChunk));
    }
    if (new URL(url).origin === BASE) return r.continue();
    const type = r.request().resourceType();
    return r.fulfill({ status: 200, contentType: type === 'stylesheet' ? 'text/css' : 'application/json', body: type === 'stylesheet' ? '' : '[]' });
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  return { context, page, route };
}

async function runCase(browser, c) {
  const { sport, desc, done } = c.f;
  const size = SIZES[c.size];
  const row = { id: c.id, wantPick: done.draft.pick };
  report.push(row);
  const { context, page, route } = await openPage(browser, c);
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(String(e).slice(0, 200)));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) pageErrors.push(`console: ${m.text().slice(0, 200)}`); });
  /* `full` is the whole journey as one picture (never the whole page: that is megabytes). A byte budget keeps the folder under the kit's limit. */
  const shot = async (name, full) => {
    if (shotBytes > 19e6) { row.shotsSkipped = (row.shotsSkipped || 0) + 1; return; }
    const opts = { type: 'jpeg', quality: 60 };
    const buf = full ? await page.locator('[data-prospect-journey]').screenshot(opts) : await page.screenshot(opts);
    shotBytes += buf.length;
    fs.writeFileSync(path.join(OUT, `${c.id}-${name}.jpg`), buf);
  };
  const press = loc => (size.touch ? loc.tap() : loc.click());
  const savedState = async () => JSON.parse(await page.evaluate(k => localStorage.getItem(k), sport.saveKey));
  try {
    await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-prospect-journey]').waitFor();
    await page.evaluate(() => document.fonts.ready);
    /* Walk the road by hand when the save is earlier than the draft step. */
    for (let guard = 0; guard < 40; guard += 1) {
      const ph = await phaseOf(page);
      if (ph === 'draft' || ph === 'done') break;
      if (c.shootRoad && guard < 3) { await page.waitForTimeout(250); await shot(`0-road-${guard}`); }
      if (ph === 'showcase') await press(page.getByRole('button', { name: /Play it safe/ }));
      else await press(page.locator('[data-prospect-journey] [class*="playArea"] button:not([disabled])').first());
      if (c.quick) await page.locator('[data-prospect-phase="draft"]').waitFor(); else await page.waitForTimeout(220);
    }
    if ((await phaseOf(page)) === 'draft') {
      if (!c.quick) {
        await page.waitForFunction(() => performance.getEntriesByType('resource').some(e => /DraftNightSequence/.test(e.name)), null, { timeout: 6000 }).catch(() => { row.chunk = 'not loaded'; });
        await page.waitForTimeout(300);
        await shot('1-draft');
      }
      if (c.help) {
        await press(page.getByRole('button', { name: 'Road to the draft help' }));
        await page.waitForTimeout(250);
        row.helpText = await page.locator('#prospect-help').innerText();
        await shot('1b-help', true);
      }
      const st0 = (await savedState()).prospect.state;
      row.before = await page.evaluate(AUDIT);
      row.rangeWant = M.preDraftProjectionLine(M.preDraftProjection(desc, st0), 'have');
      row.stock = st0.stock;
      await page.evaluate(RECORD);
      const dd = page.getByRole('button', { name: 'Draft day', exact: true });
      if (c.keyboard) { await dd.focus(); await page.keyboard.press('Enter'); } else await press(dd);
      await page.locator('[data-prospect-phase="done"]').waitFor();
      await page.waitForTimeout(100);
      row.first = await page.evaluate(AUDIT);
      const hold = parseFloat(row.first.hold || '0') || 0;
      if (c.keyboard) { await page.keyboard.press('Tab'); row.afterTab = await page.evaluate(() => { const a = document.activeElement; return a ? `${a.tagName}:${(a.textContent || '').trim().slice(0, 40)}` : null; }); }
      if (c.skipAt) {
        await page.waitForTimeout(c.skipAt); await shot('2-before-skip');
        await press(page.getByRole('button', { name: 'Skip to my pick', exact: true }));
        await page.waitForTimeout(250); await shot('3-after-skip');
      } else if (c.startAt) {
        await page.waitForTimeout(c.startAt); await shot('2-before-start');
        await press(page.getByRole('button', { name: 'Start your career', exact: true }));
        await page.waitForTimeout(1500); await shot('3-career');
        const s = await savedState();
        row.career = { team: s.c && s.c.team, draftPick: s.c && s.c.draftPick, phase: s.phase, wantTeam: done.draft.team };
      } else if (row.first.hasNight && row.first.stage === 'live') {
        const mid = Math.min(hold * 500, 1700);
        await page.waitForTimeout(Math.max(0, mid - 100)); await shot('2-live');
        await page.waitForTimeout(Math.max(0, hold * 1000 - mid + 550)); await shot('3-landed');
      } else { await page.waitForTimeout(500); await shot('2-first'); }
      if (!c.startAt) {
        await page.waitForTimeout(c.delayChunk ? c.delayChunk + 800 : 1500);
        row.frames = await page.evaluate(SUMMARY);
      }
    }
    if (!c.startAt) {
      row.end = await page.evaluate(AUDIT);
      if (!(row.first && row.first.hasNight && row.first.stage === 'live' && !c.skipAt)) await shot('4-end');
      if (c.full) await shot('5-full', true);
      const st = ((await savedState()).prospect || {}).state;
      if (st && st.phase === 'done') {
        const night = M.buildCareerDraftNight(desc, st);
        row.saved = { pick: st.draft.pick, round: st.draft.round, pickInRound: st.draft.pickInRound, team: desc.teamLabel(st.draft.team), sameAsEngine: JSON.stringify(st) === JSON.stringify(done) };
        if (night && row.end.hasNight) {
          const want = night.board.map(r => (r.kind === 'pick' ? `${r.pick} ${desc.teamLabel(r.team)} Round ${r.round}` : r.kind === 'gap' ? M.careerNightGapLine(r)
            : r.kind === 'you' ? `Pick ${r.pick}: ${desc.teamLabel(r.team)} Your name is called. Round ${r.round}, pick ${r.pickInRound}.` : `The last pick is in. Your name was not called. Your first club: ${desc.teamLabel(r.team)}.`));
          row.rowsMatch = JSON.stringify(want) === JSON.stringify(row.end.rows.map(r => r.text));
          if (!row.rowsMatch) row.rowsWant = want;
          row.tilesWant = night.lottery.map(r => `slot ${r.slot} ${desc.teamLabel(r.team)} seed ${r.seed} moved ${r.seed - r.slot}`);
          row.hadWant = M.preDraftProjectionLine(night.projection, 'had');
        }
      }
      if (c.thenReload) {
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.locator('[data-prospect-journey]').waitFor(); await page.waitForTimeout(700);
        row.reload = await page.evaluate(AUDIT); await shot('6-reload');
      }
      if (c.thenStart) {
        await press(page.getByRole('button', { name: 'Start your career', exact: true }));
        await page.getByRole('button', { name: /^Play the \d+ season$/ }).waitFor({ timeout: 8000 }).catch(() => { row.careerButton = 'not found'; });
        await page.waitForTimeout(500);
        const s = await savedState();
        row.career = { team: s.c && s.c.team, draftPick: s.c && s.c.draftPick, phase: s.phase, wantTeam: done.draft.team };
        await shot('6-career');
      }
    }
  } catch (error) {
    row.crash = String(error.message).split('\n')[0].slice(0, 300);
    errors.push(`${c.id}: ${row.crash}`);
    await shot('crash').catch(() => {});
  } finally {
    if (pageErrors.length) row.pageErrors = pageErrors.slice(0, 6);
    await context.close();
  }
  console.log(`walked ${c.id}: pick ${row.saved ? row.saved.pick : '?'} stage ${row.end ? row.end.stage : '-'} rowsMatch ${row.rowsMatch} ${row.crash ? `CRASH ${row.crash}` : ''} ${row.pageErrors ? `ERRORS ${row.pageErrors.length}` : ''}`);
}

const any = () => true;
const lateOf = share => (o, x) => o.pick !== null && o.pick > x.total * share;
const HI = [96, 99, 92, 88], LO = [40, 45, 50], MID = [undefined, 62, 58, 66, 54];
const cases = [];
const add = (id, slug, opts, c = {}) => cases.push({ id, slug, opts, full: true, ...c });
for (const slug of ['nfl', 'nba', 'mlb', 'nhl']) add(`road-${slug}-p`, slug, { want: any, phase: 'routes', tag: 'road' }, { size: 'p', shootRoad: slug === 'nba', thenStart: true });
add('nba-first-p', 'nba', { want: o => o.pick !== null && o.pick <= 4, ratings: HI }, { size: 'p' });
add('nba-first-d', 'nba', { want: o => o.pick !== null && o.pick <= 4, ratings: HI }, { size: 'd', thenStart: true });
add('nba-p7-p', 'nba', { want: o => o.pick !== null && o.pick >= 5 && o.pick <= 9, ratings: [90, 86, 94, 82, 96] }, { size: 'p' });
add('nba-late-d', 'nba', { want: lateOf(0.6), ratings: MID }, { size: 'd' });
add('nba-late-s', 'nba', { want: lateOf(0.6), ratings: MID }, { size: 's' });
add('nba-late-l', 'nba', { want: lateOf(0.6), ratings: MID }, { size: 'l' });
add('nba-undrafted-p', 'nba', { want: o => o.pick === null, ratings: LO }, { size: 'p', thenReload: true });
add('nbaold-late-p', 'nba', { era: 'old', want: lateOf(0.5), ratings: MID }, { size: 'p' });
add('mlbold-late-p', 'mlb', { era: 'old', want: lateOf(0.45), ratings: MID }, { size: 'p' });
add('mlbold-undrafted-d', 'mlb', { era: 'old', want: o => o.pick === null, ratings: LO }, { size: 'd' });
add('mlb-late-p', 'mlb', { want: lateOf(0.5), ratings: MID }, { size: 'p', thenStart: true });
add('nfl-k-p', 'nfl', { pos: 'K', want: o => o.pick !== null, ratings: MID }, { size: 'p' });
add('nfl-first-p', 'nfl', { want: o => o.pick !== null && o.pick <= 3, ratings: HI }, { size: 'p' });
add('nhlold-late-p', 'nhl', { era: 'old', want: lateOf(0.5), ratings: MID }, { size: 'p' });
add('nhl-first-d', 'nhl', { want: o => o.pick !== null && o.pick <= 6, ratings: HI }, { size: 'd', thenStart: true });
add('nba-first-p-reduced', 'nba', { want: o => o.pick !== null && o.pick <= 4, ratings: HI }, { size: 'p', reduced: true });
add('mlb-late-d-reduced', 'mlb', { want: lateOf(0.5), ratings: MID }, { size: 'd', reduced: true });
add('nba-late-p-skip', 'nba', { want: lateOf(0.6), ratings: MID }, { size: 'p', skipAt: 900 });
add('mlb-late-p-earlystart', 'mlb', { want: lateOf(0.5), ratings: MID }, { size: 'p', startAt: 700 });
add('nfl-late-p-nochunk', 'nfl', { want: lateOf(0.5), ratings: MID }, { size: 'p', blockChunk: true });
add('nhl-late-d-keyboard', 'nhl', { want: lateOf(0.5), ratings: MID }, { size: 'd', keyboard: true });
add('nba-quick-p', 'nba', { want: lateOf(0.3), ratings: MID, phase: 'showcase' }, { size: 'p', quick: true, delayChunk: 1500 });
add('nfl-olddone-p', 'nfl', { want: lateOf(0.3), ratings: MID }, { size: 'p', olddone: true });
add('nba-help-p', 'nba', { want: lateOf(0.6), ratings: MID }, { size: 'p', help: true });
add('nba-late-t', 'nba', { want: lateOf(0.6), ratings: MID }, { size: 't' });
add('mlbold-help-p', 'mlb', { era: 'old', want: lateOf(0.45), ratings: MID }, { size: 'p', help: true });

if (process.env.RWALK_DRY) {
  for (const c of cases) {
    try {
      const sport = M.sports[c.slug];
      if (c.opts.pos && !sport.create.positions.includes(c.opts.pos)) { console.log(`${c.id}: no position ${c.opts.pos}`); delete c.opts.pos; }
      const f = find(c.slug, c.opts);
      const n = M.buildCareerDraftNight(f.desc, f.done);
      console.log(`${c.id}: era ${f.eraId} seed ${f.p.seed} rating ${f.p.rating} pick ${f.done.draft.pick} of ${f.total} team ${f.done.draft.team} phase ${f.p.state ? f.p.state.phase : 'routes'} rows ${n ? n.board.length : 'null'} tiles ${n ? n.lottery.length : '-'} key ${sport.saveKey} route /${sport.gameSlug}`);
    } catch (error) { console.log(`${c.id}: FIND FAILED ${error.message}`); }
  }
  process.exit(0);
}
let browser;
try {
  const { chromium } = await import('../../scripts/lib/playwrightLoader.mjs');
  browser = await chromium.launch({ headless: true });
  for (const c of cases) {
    if (ONLY && !c.id.includes(ONLY)) continue;
    try {
      const sport = M.sports[c.slug];
      if (c.opts.pos && !sport.create.positions.includes(c.opts.pos)) { errors.push(`${c.id}: no position ${c.opts.pos}, default used`); delete c.opts.pos; }
      c.f = find(c.slug, c.opts);
      if (c.olddone) c.rawSave = { c: null, phase: 'prospect', teamQuality: null, coach: null, prospect: { ...c.f.p, state: c.f.done } };
    } catch (error) { errors.push(`${c.id}: ${error.message}`); report.push({ id: c.id, crash: error.message }); continue; }
    await runCase(browser, c);
  }
} catch (error) {
  errors.push(`fatal: ${error.stack || error}`);
} finally {
  if (browser) await browser.close();
}
fs.writeFileSync(path.join(OUT, 'rwalk.json'), JSON.stringify({ base: BASE, errors, report }, null, 1));
console.log(`rwalk: ${report.length} cases, ${errors.length} error(s)${errors.length ? `: ${errors.join(' | ').slice(0, 600)}` : ''}`);
process.exit(0);
