/*
 * Round 983 harness: the bracket moment.
 *
 * The cup and Champions League cards used to redraw as a finished table, so a
 * round settling showed nobody who went through. Now the round that settled
 * since the card last looked plays once (winners pulse, their scores land, the
 * next round ticks in, a final the club won glows), and a reload or a reopened
 * tab plays nothing. The danger is a moment that names the wrong ties: one a
 * round late, one that replays an old result, or one that moves the page.
 *
 * Sections:
 *  1. The real engine, played through whole seasons with Math.random seeded
 *     per run. The BASELINE is the bracket itself: after every calendar step
 *     the ties whose winner appeared since the step before, and the ties that
 *     were drawn in it. The moment (bracketMoment, the pure function both
 *     cards call) must name exactly those, on every step that settled a round,
 *     and nothing on every step that did not. Then every rung of the ladder:
 *     for each pair of round boundaries i < j in a season, a card that last
 *     looked at boundary i and opens at j must name only round j's ties as
 *     through and round j plus 1's as drawn. The reload rule (no earlier count
 *     plays nothing) is checked on every snapshot, and the marker key must
 *     change with the season and the competition.
 *  2. Behaviour in a DOM: spawns src/test/clubManagerBracketMoment.test.tsx
 *     (round N then N plus 1, classes only on the new ties, a remount plays
 *     nothing, both cards; since the review also a round settled while the
 *     card is open and then reopened, both cards mounted together as the Cups
 *     tab does, two manager slots holding the same club, one pace for the
 *     whole moment and a glow that stops). Green only on the vitest summary,
 *     the exit code and at least 9 tests passed.
 *  3. The page must not jump: both cards drawn in chromium with the site's
 *     own Tailwind build, at 390 and 1440 wide. A card that moves from round N
 *     to N plus 1 (the moment plays) is measured against a card mounted on
 *     N plus 1 directly (first sight, no moment) at several points through the
 *     animation: a sentinel under the card, the card's height and every tie's
 *     layout box must agree within half a pixel, the window must not scroll
 *     and the page must not bleed sideways. It also proves the moment really
 *     ran: the pulse element's computed animation is the kit's cmWinPulse.
 *
 *  4. Coverage floors, so section 1 cannot pass on a walk that skipped a rung.
 *
 * Measured headroom (Round 983, seeds 1 to 3, Real Madrid and Manchester
 * City today plus Real Madrid in 2010-11, two seasons each, 18 seasons, 895
 * steps, about 3 minutes 40): the numbers are in section 4's comment. The
 * agreement checks are exact because the moment is a rule, not a statistic.
 *
 * Controls, each refusing to run if its rewrite changed nothing (section 2
 * reads the real tree, so it is skipped while a control is on). Measured at
 * seed 1:
 *   BRACKET_MOMENT_CONTROL=reload     first sight counts from zero in a copy of
 *                                     the card, so a reload replays the season;
 *                                     sections 1 and 3 go red (331 and 4: both
 *                                     hold the reload rule, 3 on the plain
 *                                     table it measures against).
 *   BRACKET_MOMENT_CONTROL=allrounds  a missed round is played as well as the
 *                                     latest one in a copy; section 1 red (57).
 *   BRACKET_MOMENT_CONTROL=layout     the kit's style tag goes first in the
 *                                     card in a copy, so the card's space-y
 *                                     gap lands on the header and everything
 *                                     under it moves 12px; section 3 red (60).
 *   BRACKET_MOMENT_CONTROL=layoutucl  the same in a copy of the Champions League
 *                                     card, which places the tag itself; section
 *                                     3 red on the ucl cases only.
 * Copies go to the gitignored .sim-control/bracketmoment/, never into src.
 * The vitest file's own checks were proved against hand mutations in the
 * review: the mark written on [key] only, the Champions League card reading
 * the cup's mark, the slot left out of the key, the draw at the kit's step
 * and an endless glow each turn their test red.
 *
 * Nothing here reads dist, the network or the clock. Run:
 *   node scripts/simBracketMoment.mjs
 */
import { execSync, spawnSync } from 'node:child_process';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fwd = p => p.replaceAll('\\', '/');
const CONTROL = process.env.BRACKET_MOMENT_CONTROL || '';
const SEEDS = (process.env.BRACKET_MOMENT_SEEDS || '1,2,3').split(',').map(Number);
/* The 2010 era opens the Champions League at a two legged round of 16, so that rung is walked too. */
const CLUBS = [['Real Madrid', 'now'], ['Manchester City', 'now'], ['Real Madrid', 'era2010']];
const SEASONS = 2;

/* A worktree has no node_modules of its own: walk up to the first that does. */
function findBin(name) {
  for (let d = ROOT; ; d = path.dirname(d)) {
    const p = path.join(d, 'node_modules', '.bin', name);
    if (fs.existsSync(p)) return p;
    if (path.dirname(d) === d) throw new Error(`no ${name} above ${ROOT}`);
  }
}

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'bracketMoment-'));
let failures = 0;
const sectionFails = {};
let section = '';
const fail = m => { failures++; sectionFails[section] = (sectionFails[section] || 0) + 1; console.error('  FAIL: ' + m); };

/* ---------- the cards under test, or a control's copy of one ---------- */
const CARD = path.join(ROOT, 'src', 'components', 'club-manager', 'CupBracketCard.tsx');
const UCL_CARD = path.join(ROOT, 'src', 'components', 'club-manager', 'UclBracketCard.tsx');
let cardPath = CARD;
let uclPath = UCL_CARD;
if (CONTROL) {
  /* Review: the layout control rewrites either card, since each places the
     kit's style tag itself. */
  const target = CONTROL === 'layoutucl' ? UCL_CARD : CARD;
  let src = fs.readFileSync(target, 'utf8');
  const swap = (from, to) => {
    if (!src.includes(from)) { console.error(`control cannot run: the card no longer contains ${JSON.stringify(from)}`); process.exit(2); }
    src = src.replace(from, to);
  };
  if (CONTROL === 'reload') {
    swap('if (prev === undefined) return null;', 'if (prev === undefined) prev = 0;');
  } else if (CONTROL === 'allrounds') {
    swap('settled.slice(prev).filter(t => t.round === round).map(tieKey)', 'settled.slice(prev).map(tieKey)');
  } else if (CONTROL === 'layout' || CONTROL === 'layoutucl') {
    swap('{moment && <CelebrationStyles />}', '');
    swap('<div className="bg-card border border-border rounded-2xl p-3 md:p-4 space-y-3">',
      '<div className="bg-card border border-border rounded-2xl p-3 md:p-4 space-y-3">{moment && <CelebrationStyles />}');
  } else {
    console.error(`unknown BRACKET_MOMENT_CONTROL=${CONTROL}`); process.exit(2);
  }
  /* Review: the copy lives in the gitignored .sim-control/ (as simExtraTime's
     do), never in src, where a killed run would leave a stray card inside the
     type gate's scope. Its '@/' imports resolve from the root tsconfig. */
  const dir = path.join(ROOT, '.sim-control', 'bracketmoment');
  fs.mkdirSync(dir, { recursive: true });
  const copy = path.join(dir, `${path.basename(target, '.tsx')}-${CONTROL}-${process.pid}.tsx`);
  fs.writeFileSync(copy, src);
  process.on('exit', () => { try { fs.unlinkSync(copy); } catch { /* already gone */ } });
  if (target === UCL_CARD) uclPath = copy; else cardPath = copy;
  console.log(`NEGATIVE CONTROL ON: ${CONTROL}`);
}

/* ---------- bundle the engine and the moment for node ---------- */
const ENTRY = path.join(TMP, 'entry.mjs');
const BUNDLE = path.join(TMP, 'bundle.cjs');
fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
export * as cm from '${fwd(ROOT)}/src/lib/clubManager.ts';
export { bracketMoment, bracketMarkKey, tieKey } from '${fwd(cardPath)}';
`);
execSync(`"${findBin('esbuild')}" "${ENTRY}" --bundle --format=cjs --platform=node --jsx=automatic --outfile="${BUNDLE}" --log-level=error`, { stdio: 'inherit', cwd: ROOT });
/* The engine's import graph carries the site's database client. Nothing here
   calls it, and fetch throws so that an accidental call fails loudly here
   rather than reaching the live project. */
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
globalThis.fetch = () => { throw new Error('simBracketMoment never touches the network'); };
const { cm, bracketMoment, bracketMarkKey, tieKey } = createRequire(import.meta.url)(BUNDLE);
const { startCareer, playNextEntry, startNextSeason, finishSeason, ensureEraRosters } = cm;
/* An era's squads come from its bake in the bundle (a local data chunk). */
for (const era of new Set(CLUBS.map(c => c[1]))) await ensureEraRosters(era);

/* Seeded Math.random, so a run can be repeated exactly. */
function seedRandom(seed) {
  let a = seed >>> 0;
  Math.random = () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ORDER = ['R16', 'QF', 'SF', 'F'];
const COMPS = [['cup', 'cupBracket'], ['ucl', 'uclBracket']];
const clone = x => (x ? JSON.parse(JSON.stringify(x)) : []);
const settledOf = ties => ties.filter(t => t.winner !== null).length;
const sameList = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
const bySlot = (a, b) => ORDER.indexOf(a.round) - ORDER.indexOf(b.round) || a.slot - b.slot;

/* ---------- 1. The real engine against the bracket's own diff ---------- */
section = '1';
console.log('1) The moment names exactly the ties the engine settled and drew');
const seen = { steps: 0, still: 0, moments: { cup: {}, ucl: {} }, multiRound: 0, rungs: 0, wonFinals: 0, keysChecked: 0 };
/* Real fixtures for section 3: the step that settled a quarter final, before and after. */
const fixtures = { cup: null, ucl: null };
for (const seed of SEEDS) {
  for (const [club, era] of CLUBS) {
    seedRandom(seed * 1000 + club.length + era.length);
    let s = startCareer(club, era);
    let lastKeys = null;
    for (let season = 0; season < SEASONS; season++) {
      const keys = { cup: bracketMarkKey(s, 'cup'), ucl: bracketMarkKey(s, 'ucl') };
      seen.keysChecked++;
      if (keys.cup === keys.ucl) fail(`${club} season ${s.season}: the cup and the Champions League share a marker key`);
      if (lastKeys && (lastKeys.cup === keys.cup || lastKeys.ucl === keys.ucl)) fail(`${club}: the marker key did not change with the season, so last season's count would gag this one`);
      lastKeys = keys;
      /* Each competition's bracket after every step, and its round boundaries. */
      const prev = { cup: clone(s.cupBracket), ucl: clone(s.uclBracket) };
      const bounds = { cup: [clone(s.cupBracket)], ucl: [clone(s.uclBracket)] };
      let guard = 0;
      while (s.week < s.calendar.length && guard++ < 200) {
        const before = s;
        const r = playNextEntry(s, { skipHalftime: true });
        s = r.state;
        seen.steps++;
        for (const [comp, field] of COMPS) {
          const now = clone(s[field]);
          const was = prev[comp];
          if (bracketMoment(undefined, now, ORDER, s.clubName) !== null) fail(`${comp}: a first sight (a reload) played a moment`);
          const m = bracketMoment(settledOf(was), now, ORDER, s.clubName);
          const wasSettled = new Set(was.filter(t => t.winner !== null).map(tieKey));
          const wasThere = new Set(was.map(tieKey));
          const newlySettled = now.filter(t => t.winner !== null && !wasSettled.has(tieKey(t))).sort(bySlot);
          if (newlySettled.length === 0) {
            seen.still++;
            if (m !== null) fail(`${comp} ${club} week ${s.week}: nothing settled but a moment played (${JSON.stringify(m)})`);
          } else {
            const rounds = [...new Set(newlySettled.map(t => t.round))];
            if (rounds.length > 1) seen.multiRound++;
            const latest = rounds[rounds.length - 1];
            const wantThrough = newlySettled.filter(t => t.round === latest).map(tieKey);
            const nextRound = ORDER[ORDER.indexOf(latest) + 1];
            const wantDrawn = now.filter(t => !wasThere.has(tieKey(t)) && t.round === nextRound).sort(bySlot).map(tieKey);
            const wantWon = latest === 'F' && now.some(t => t.round === 'F' && t.winner === s.clubName);
            if (!m) { fail(`${comp} ${club} week ${s.week}: ${latest} settled and no moment played`); continue; }
            if (m.round !== latest) fail(`${comp}: the moment is about ${m.round}, the engine settled ${latest}`);
            if (!sameList(m.through, wantThrough)) fail(`${comp} ${latest}: through ${m.through} but the engine settled ${wantThrough}`);
            if (!sameList(m.drawn, wantDrawn)) fail(`${comp} ${latest}: drawn ${m.drawn} but the engine drew ${wantDrawn}`);
            if (m.wonFinal !== wantWon) fail(`${comp}: wonFinal ${m.wonFinal} but the final went to ${now.find(t => t.round === 'F')?.winner}`);
            if (wantWon) seen.wonFinals++;
            seen.moments[comp][latest] = (seen.moments[comp][latest] || 0) + 1;
            bounds[comp].push(now);
            if (latest === 'QF' && !fixtures[comp]) fixtures[comp] = { before: JSON.parse(JSON.stringify(before)), after: JSON.parse(JSON.stringify(s)) };
            if (latest === 'F' && !fixtures[`${comp}Final`]) fixtures[`${comp}Final`] = { before: JSON.parse(JSON.stringify(before)), after: JSON.parse(JSON.stringify(s)) };
          }
          prev[comp] = now;
        }
        if (r.kind === 'seasonOver') break;
      }
      /* Every rung: a card that last looked at boundary i and opens at boundary j. */
      for (const [comp] of COMPS) {
        const b = bounds[comp];
        for (let i = 0; i < b.length; i++) {
          for (let j = i + 1; j < b.length; j++) {
            seen.rungs++;
            const m = bracketMoment(settledOf(b[i]), b[j], ORDER, s.clubName);
            const settledJ = b[j].filter(t => t.winner !== null).sort(bySlot);
            const latest = settledJ[settledJ.length - 1].round;
            const want = settledJ.filter(t => t.round === latest).map(tieKey);
            if (!m || !sameList(m.through, want)) fail(`${comp} rung ${i} to ${j}: through ${m && m.through} but only ${latest} (${want}) is the latest round`);
          }
        }
      }
      if (season < SEASONS - 1) s = startNextSeason(finishSeason(s).state);
    }
  }
}
console.log(`   ${seen.steps} steps, ${seen.still} steps per competition with nothing settled (all silent), ${seen.rungs} ladder rungs, ${seen.keysChecked} season keys`);
console.log(`   moments by round: cup ${JSON.stringify(seen.moments.cup)}, Champions League ${JSON.stringify(seen.moments.ucl)}; finals the club won: ${seen.wonFinals}; steps that settled two rounds: ${seen.multiRound}`);

/* ---------- 2. Behaviour in a DOM, both cards ---------- */
section = '2';
console.log('2) The cards in a DOM: classes only on the new ties, a remount plays nothing');
if (CONTROL) {
  console.log('   skipped: a control rewrites a copy, and this section reads the real tree');
} else if (process.env.BRACKET_MOMENT_SKIP_VITEST === '1') {
  console.log('   skipped by BRACKET_MOMENT_SKIP_VITEST=1 (run the vitest file on its own)');
} else {
  const vitest = path.join(path.dirname(path.dirname(findBin('vitest'))), 'vitest', 'vitest.mjs');
  const res = spawnSync(process.execPath, [vitest, 'run', 'src/test/clubManagerBracketMoment.test.tsx'],
    { cwd: ROOT, encoding: 'utf8', env: { ...process.env, CI: '1' } });
  const out = (res.stdout || '') + (res.stderr || '');
  const plain = out.replace(/\u001b\[[0-9;]*m/g, '');
  const passed = plain.match(/Tests\s+(\d+) passed/);
  const failedTests = plain.match(/(\d+) failed/);
  console.log(`   vitest exit ${res.status}, ${passed ? passed[1] : 0} passed${failedTests ? `, ${failedTests[1]} failed` : ''}`);
  if (res.status !== 0 || !passed || failedTests) {
    fail('the bracket moment vitest is not green');
    console.error(plain.split('\n').slice(-30).join('\n'));
  } else if (Number(passed[1]) < 9) {
    fail(`only ${passed[1]} bracket moment tests ran, 9 were written`);
  }
}

/* ---------- 3. The page must not jump ---------- */
section = '3';
console.log('3) The page must not jump while the moment plays (chromium, the site\'s Tailwind)');
{
  if (!fixtures.cup || !fixtures.ucl) fail(`the walk never settled a quarter final in both competitions (cup ${!!fixtures.cup}, ucl ${!!fixtures.ucl})`);
  /* A won final, so the trophy line's glow is measured too: the walk's own
     final with the club written in as its winner. A layout fixture only. */
  const finals = [];
  for (const comp of ['cup', 'ucl']) {
    const f = fixtures[`${comp}Final`];
    if (!f) continue;
    const field = comp === 'cup' ? 'cupBracket' : 'uclBracket';
    for (const st of [f.before, f.after]) {
      const fin = st[field].find(t => t.round === 'F');
      if (fin.home !== st.clubName && fin.away !== st.clubName) fin.home = st.clubName;
      if (st === f.after) { fin.winner = st.clubName; const mineHome = fin.home === st.clubName; fin.homeGoals = mineHome ? 2 : 1; fin.awayGoals = mineHome ? 1 : 2; fin.pens = undefined; }
    }
    finals.push([`${comp}Final`, comp, f]);
  }
  const cases = [['cup', 'cup', fixtures.cup], ['ucl', 'ucl', fixtures.ucl], ...finals].filter(c => c[2]);

  /* The site's own Tailwind over the two cards (the control's copy when one runs). */
  const CSS = path.join(TMP, 'site.css');
  execSync(`"${findBin('tailwindcss')}" -c tailwind.config.ts -i src/index.css --content "${fwd(cardPath)},${fwd(uclPath)}" -o "${CSS}"`, { cwd: ROOT, stdio: 'pipe' });
  const css = fs.readFileSync(CSS, 'utf8');
  if (!css.includes('.space-y-3')) fail('the Tailwind build carries no space-y-3, so the layout check would be blind');

  const BENTRY = path.join(TMP, 'browser.jsx');
  const BJS = path.join(TMP, 'browser.js');
  fs.writeFileSync(BENTRY, `
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { CupBracketCard } from '${fwd(cardPath)}';
import { UclBracketCard } from '${fwd(uclPath)}';
const CARDS = { cup: CupBracketCard, ucl: UclBracketCard };
const roots = {};
window.__draw = (comp, career) => {
  const el = document.getElementById('card');
  const root = roots.card || (roots.card = createRoot(el));
  flushSync(() => root.render(createElement(CARDS[comp], { career })));
};
`);
  execSync(`"${findBin('esbuild')}" "${BENTRY}" --bundle --format=iife --platform=browser --jsx=automatic --define:process.env.NODE_ENV=\\"production\\" --outfile="${BJS}" --log-level=error`, { stdio: 'inherit', cwd: ROOT });
  const js = fs.readFileSync(BJS, 'utf8');
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head>`
    + '<body class="bg-background text-foreground"><div style="padding:16px"><div id="card"></div><div id="sentinel" style="height:8px"></div></div></body></html>';

  const { chromium } = await import('./lib/playwrightLoader.mjs');
  const browser = await chromium.launch();
  const measure = () => {
    const card = document.querySelector('#card > div');
    const r = document.getElementById('sentinel').getBoundingClientRect();
    const pulse = card.querySelector('.cm-win-pulse');
    return {
      sentinel: r.top,
      height: card.offsetHeight,
      ties: Array.from(card.querySelectorAll('.rounded-lg.border')).map(el => [el.offsetTop, el.offsetHeight, el.offsetWidth]),
      scrollY: window.scrollY,
      bleed: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      pulses: card.querySelectorAll('.cm-win-pulse').length,
      ticks: card.querySelectorAll('.cm-tick-in').length,
      glows: card.querySelectorAll('.cm-gold-glow').length,
      anim: pulse ? getComputedStyle(pulse).animationName : null,
    };
  };
  const SAMPLES = [0, 200, 500, 1000, 2500];
  let compared = 0;
  for (const width of [390, 1440]) {
    for (const [label, comp, f] of cases) {
      const open = async () => {
        const page = await browser.newPage({ viewport: { width, height: 900 } });
        const errors = [];
        page.on('pageerror', e => errors.push(e.message));
        /* A made up origin (the bundle needs a real one for its storage);
           every other request is refused, so nothing can leave the machine. */
        await page.route('**/*', r => (r.request().url() === 'http://bracket.test/'
          ? r.fulfill({ status: 200, contentType: 'text/html', body: html })
          : r.abort()));
        await page.goto('http://bracket.test/');
        await page.addScriptTag({ content: js });
        if (!(await page.evaluate(() => typeof window.__draw === 'function'))) {
          throw new Error(`the card bundle did not load in the page: ${errors.join(' | ').slice(0, 600)}`);
        }
        return page;
      };
      /* The plain table: the after state seen first (another season's key), so no moment. */
      const plainPage = await open();
      await plainPage.evaluate(([c, st]) => window.__draw(c, { ...st, season: st.season + 1000 }), [comp, f.after]);
      await plainPage.waitForTimeout(100);
      const plain = await plainPage.evaluate(measure);
      await plainPage.close();
      if (plain.pulses + plain.ticks + plain.glows !== 0) fail(`${label} ${width}: a first sight played a moment`);
      /* The moment: the before state, then the after state in the same card. */
      const page = await open();
      await page.evaluate(([c, st]) => window.__draw(c, st), [comp, f.before]);
      await page.waitForTimeout(50);
      await page.evaluate(([c, st]) => window.__draw(c, st), [comp, f.after]);
      let t0 = 0;
      for (const at of SAMPLES) {
        if (at > t0) await page.waitForTimeout(at - t0);
        t0 = at;
        const m = await page.evaluate(measure);
        compared++;
        const tag = `${label} ${width}px at ${at}ms`;
        if (at === 0) {
          if (m.pulses === 0) fail(`${tag}: the moment did not play (no pulse)`);
          if (m.anim !== 'cmWinPulse') fail(`${tag}: the pulse runs ${m.anim}, not the kit's cmWinPulse (styles not mounted?)`);
          if (label.endsWith('Final') && m.glows !== 1) fail(`${tag}: a final the club won did not glow`);
        }
        if (Math.abs(m.sentinel - plain.sentinel) > 0.5) fail(`${tag}: the line under the card moved ${(m.sentinel - plain.sentinel).toFixed(1)}px`);
        if (Math.abs(m.height - plain.height) > 0.5) fail(`${tag}: the card is ${m.height - plain.height}px taller than the plain table`);
        const tieShift = m.ties.findIndex((b, i) => !plain.ties[i] || b.some((v, k) => Math.abs(v - plain.ties[i][k]) > 0.5));
        if (m.ties.length !== plain.ties.length || tieShift >= 0) fail(`${tag}: tie ${tieShift} is not where the plain table has it`);
        if (m.scrollY !== 0) fail(`${tag}: the window scrolled to ${m.scrollY}`);
        if (m.bleed > 1) fail(`${tag}: the page bleeds ${m.bleed}px sideways`);
      }
      await page.close();
    }
  }
  await browser.close();
  console.log(`   ${cases.length} moments (${cases.map(c => c[0]).join(', ')}) at 390 and 1440, ${compared} samples against the plain table`);
}

/* ---------- 4. Coverage floors, from measured headroom ----------
   So the agreement checks in section 1 cannot pass on a walk that never
   reached a rung. Measured in Round 983, seed 1 alone and then seeds 1 to 3:
   the Champions League QF, SF and F each settled 5 times, then 16 (16 of the
   18 career seasons qualified); the 2010 round of 16 twice, then 6; the
   ladder had 98 rungs, then 300; silent steps 545, then 1664. The floors are
   per seed and sit under seed 1's numbers: 4 for each of QF, SF and F, 1 for
   the round of 16, 80 rungs, 400 silent steps. The cup is a rule, not a
   sample: every round settles once a season. */
section = '4';
console.log('4) Coverage floors');
{
  const seeds = SEEDS.length;
  const seasonsWalked = seeds * CLUBS.length * SEASONS;
  for (const r of ORDER) {
    const n = seen.moments.cup[r] || 0;
    if (n !== seasonsWalked) fail(`cup ${r}: ${n} moments over ${seasonsWalked} seasons, and every cup round settles once a season`);
  }
  for (const [r, floor] of [['R16', 1], ['QF', 4], ['SF', 4], ['F', 4]]) {
    const n = seen.moments.ucl[r] || 0;
    if (n < floor * seeds) fail(`Champions League ${r}: ${n} moments, the floor is ${floor * seeds}`);
  }
  if (seen.rungs < 80 * seeds) fail(`only ${seen.rungs} ladder rungs walked, the floor is ${80 * seeds}`);
  if (seen.still < 400 * seeds) fail(`only ${seen.still} silent steps checked, the floor is ${400 * seeds}`);
  console.log(`   cup ${seasonsWalked} a round, Champions League ${JSON.stringify(seen.moments.ucl)}, ${seen.rungs} rungs, ${seen.still} silent steps over ${seeds} seed(s)`);
}

console.log(failures === 0 ? '\nALL BRACKET MOMENT CHECKS PASSED' : `\n${failures} FAILURES (by section ${JSON.stringify(sectionFails)})`);
process.exit(failures === 0 ? 0 : 1);
