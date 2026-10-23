/**
 * Round 1548 harness: Hall of Champions keeps a deep museum and pays a hidden
 * tab. Offline on purpose: it never reaches the database (the client module is
 * replaced by a stub that throws on any use), so it runs anywhere, the runner
 * included. simHallOfChampions is the harness that checks the exhibits against
 * the live tables; this one checks what long play does to the save and the
 * clock, on a fixture catalog with the real wing sizes and made up names.
 *
 *   1. A DEEP MUSEUM LOADS. A greedy player (the one simHallOfChampions plays,
 *      deciding once a minute, buying upgrades too) runs until it owns an
 *      exhibit priced over 1e15. Every save it writes while holding more than
 *      1e15 (the saves the old loader refused, so the hook wrote a fresh museum
 *      over them) must round trip serialize and loadSave with every field
 *      intact, and so must the final one.
 *   2. A HIDDEN TAB PAYS THE NIGHT. 600 clock callbacks 60 s apart on a hidden
 *      page (a throttled background tab, ten hours) must earn at least the away
 *      rate times eight hours of income, and the absence meter must stop at the
 *      eight hour cap. Before this round the hook paid a fixed quarter second
 *      per callback: 150 seconds of income for the whole night. The absence's
 *      takings (what the note on the door reads) must equal its pay, zero with
 *      the meter when watching starts, and travel in the save.
 *   3. PRICES PAST T READ AS NUMBERS. fmt names Qa and Qi.
 *   4. THE REAL HOOK. src/test/hallOfChampionsLongPlay.test.tsx mounts
 *      useHallOfChampions on fake timers and jsdom's localStorage: a deep save
 *      loads and is written back, a hidden tab is paid by the away rule with
 *      the welcome on return, one absence meets one cap across a reload, the
 *      note on the next visit tells the whole absence when a hidden tab was
 *      closed (the hidden part included), and a refused save is kept aside
 *      before the fresh museum.
 *
 * NEGATIVE CONTROLS (SIM_HALL_CONTROL=<name>; each must turn its section red):
 *   ceiling     the loader's old num(o.funds, 0, 1e15) and 1e18      section 1
 *   fixedstep   advanceClock pays a fixed quarter second             section 2
 *   fmtstop     fmt stops at T again                                 section 3
 *   hookfixed   the hook ticks a fixed quarter second per callback   section 4
 *   hooknocopy  the hook no longer keeps a refused save aside        section 4
 *   hooknote     the load's note tells only the closed part again    section 4
 *   novisible    advanceClock ignores visibility, only gaps count    section 2
 *   hookvisible  the hook calls advanceClock as if always visible    section 4
 *   awayafter    AWAY_AFTER_MS an hour, not five seconds             section 2
 *   hookstampnow a save stamps Date.now(), not the paid through time section 4
 *   hookcrash    a hook that does not compile: CRASHED, exit 2       section 4
 * A control rewrites a copy of the file, never the file, and aborts if the text
 * it rewrites is not in the shipped file exactly once. A hook control whose
 * suite crashes (no report, a load error, a wrong test count, or a targeted
 * test the suite does not have) prints CRASHED and exits 2, never FIRED; the
 * hookcrash control (a hook that does not compile) must end exactly that way.
 *
 * MEASURED (GitHub runner, remote check r1548-s2 on 16ef6107, and the same
 * numbers on Windows; the fixes after review: r1548-fix-a and r1548-fix-b on
 * 99079914): the run is deterministic, so these are exact, not bands.
 *   1. 60 simulated days: 859 of 909 exhibits, peak funds 1.45e17, career
 *      2.49e18; the first save over 1e15 funds on day 3.66 and over 1e18 career
 *      on day 36.01; 86 exhibits bought at over 1e15 (the first, AFL number 83,
 *      at 1.037e15); 75,646 saves past an old ceiling, 0 refused or changed.
 *      Control ceiling: all 75,647 checked saves refused, from day 3.66.
 *   2. income 3317.25/s; ten hidden hours paid exactly x1.000000 of eight
 *      hours at the away rate (4.7768e7), meter 28,800,000 ms. Control
 *      fixedstep: six failures. The hook suite under hookfixed (the pre round
 *      hook) measured ten hidden hours at 497,588, about one percent of the
 *      47,768,430 a closed tab is paid. Thirty hidden wakes a second apart:
 *      30 of 30 away, x1.000000 of the away rule, meter 30,000 ms; a 5 s
 *      visible gap watched, a 10 s one away. After the fixes fixedstep makes
 *      14 failures, novisible 3 (x2.0000 of the away rule, meter 0), awayafter
 *      1 (the 10 s gap paid as watched).
 *   3. 8 of 8 labels exact, the longest under 1e21 five characters ("1.6Qa").
 *      Control fmtstop: "90000000T" for the last AFL exhibit, five failures.
 *   4. 8 of 8 hook tests green: the glance paid x0.500000 of thirty watched
 *      seconds with the meter at 30,000 ms, both notes x1.000000 of what the
 *      absence paid, the stamp 0 ms from the paid through time. hookfixed
 *      turns tests 2, 3, 6, 7 and 8 red; hooknocopy test 4; hooknote tests 3
 *      (x0.6250, the run review's x0.626) and 7 (no note); hookvisible test 6
 *      (x1.0000 of thirty watched seconds: full rate); hookstampnow test 8
 *      (40,000 ms late); every other test stays green under each. hookcrash
 *      ends "CRASHED, the hook suite ran 0 tests, not 8", exit 2.
 * The 0.999 floor in section 2 is not a band on noise: the pay is exact, and
 * the floor only forgives floating point. The cap side is held at 1.001.
 *
 * Run: node scripts/simHallLongPlay.mjs
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LIB = path.join(ROOT, 'src/lib/hallOfChampions.ts');
const HOOK = path.join(ROOT, 'src/hooks/useHallOfChampions.ts');
const TEST = 'src/test/hallOfChampionsLongPlay.test.tsx';
const CONTROL = process.env.SIM_HALL_CONTROL || '';
const ONLY = process.env.SIM_HALL_ONLY || '';

let failures = 0, section = 0, dead = 0, collateral = 0;
const bySection = {};
const fail = m => { failures += 1; bySection[section] = (bySection[section] || 0) + 1; console.error('  FAIL: ' + m); };
/* the section each control must turn red */
const CONTROL_SECTION = { ceiling: 1, fixedstep: 2, fmtstop: 3, hookfixed: 4, hooknocopy: 4, hooknote: 4, novisible: 2, hookvisible: 4, awayafter: 2, hookstampnow: 4, hookcrash: 4 };
const abort = m => { console.error(m); process.exit(1); };
const read = f => fs.readFileSync(f, 'utf8').split('\r\n').join('\n');

/* The exact text each control rewrites, verbatim from the shipped files. */
const LIB_CONTROLS = {
  ceiling: {
    from: 'const funds = num(o.funds, 0, Infinity);\n    const careerEarned = num(o.careerEarned, 0, Infinity);',
    to: 'const funds = num(o.funds, 0, 1e15);\n    const careerEarned = num(o.careerEarned, 0, 1e18);',
  },
  fixedstep: {
    from: '  if (!visible || gapMs > AWAY_AFTER_MS) return { away: true, earned: applyAway(wings, s, gapMs) };',
    to: '  { const b0 = s.funds; tick(wings, s, 0.25); return { away: false, earned: s.funds - b0 }; }',
  },
  /* advanceClock forgets the page's visibility: only the gap decides */
  novisible: {
    from: '  if (!visible || gapMs > AWAY_AFTER_MS) return { away: true, earned: applyAway(wings, s, gapMs) };',
    to: '  if (gapMs > AWAY_AFTER_MS) return { away: true, earned: applyAway(wings, s, gapMs) };',
  },
  /* a stale bound: an hour without a callback still counts as watching */
  awayafter: {
    from: 'export const AWAY_AFTER_MS = 5000;',
    to: 'export const AWAY_AFTER_MS = 3_600_000;',
  },
  fmtstop: {
    from: "  [1e33, 'Dc'], [1e30, 'No'], [1e27, 'Oc'], [1e24, 'Sp'], [1e21, 'Sx'], [1e18, 'Qi'], [1e15, 'Qa'],\n",
    to: '',
  },
};
const HOOK_CONTROLS = {
  hookfixed: {
    from: "const step = advanceClock(wings, s, gap, document.visibilityState !== 'hidden');",
    to: 'const step = advanceClock(wings, s, 250, true);',
  },
  /* the hook forgets the page's visibility (the lib's default is visible) */
  hookvisible: {
    from: "const step = advanceClock(wings, s, gap, document.visibilityState !== 'hidden');",
    to: 'const step = advanceClock(wings, s, gap, true);',
  },
  /* every save stamps the time it is written, not the time the museum was paid through */
  hookstampnow: {
    from: '      try { localStorage.setItem(SAVE_KEY, serialize(s, lastTickRef.current)); } catch { /* storage full or blocked */ }',
    to: '      try { localStorage.setItem(SAVE_KEY, serialize(s, Date.now())); } catch { /* storage full or blocked */ }',
  },
  /* the crash path's own control: a hook that does not compile must read CRASHED, exit 2 */
  hookcrash: {
    from: 'export function useHallOfChampions() {',
    to: 'export function useHallOfChampions() { const broken = ;',
  },
  hooknocopy: {
    from: '          keepRefusedSave();\n',
    to: '',
  },
  /* the load's note back to the closed part alone, the pre fix hook */
  hooknote: {
    from: '        if (away > 60) offlineReport(cat, s, away);\n        const took = awayPaidSoFar(s);\n        if ((s.awayMs ?? 0) > WELCOME_AFTER_MS && took > 1) setOfflineEarned(took);\n',
    to: '        if (away > 60) { const rep = offlineReport(cat, s, away); if (rep.earned > 1) setOfflineEarned(rep.earned); }\n',
  },
};
if (CONTROL && !LIB_CONTROLS[CONTROL] && !HOOK_CONTROLS[CONTROL]) abort(`simHallLongPlay: unknown SIM_HALL_CONTROL ${JSON.stringify(CONTROL)}`);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hall-longplay-'));
process.on('exit', () => { try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* best effort */ } });

function rewrite(file, ctl, what) {
  const text = read(file);
  if (text.split(ctl.from).length - 1 !== 1) abort(`  control ${CONTROL}: ${what} does not carry exactly one ${JSON.stringify(ctl.from.slice(0, 70))}, so this control would prove nothing. ABORTED`);
  const out = text.replace(ctl.from, ctl.to);
  if (out === text) abort(`  control ${CONTROL}: the rewrite changed nothing. ABORTED`);
  return out;
}

/* The lib, bundled from the shipped file or from a control's copy. */
let libFile = LIB;
if (LIB_CONTROLS[CONTROL]) {
  libFile = path.join(tmp, 'hallOfChampions.ts');
  fs.writeFileSync(libFile, rewrite(LIB, LIB_CONTROLS[CONTROL], 'src/lib/hallOfChampions.ts'));
  console.log(`control ${CONTROL}: the lib is a copy with one rewrite`);
}
const entry = path.join(tmp, 'entry.mjs');
const bundled = path.join(tmp, 'hall.mjs');
fs.writeFileSync(entry, `export * from '${libFile.replaceAll('\\', '/')}';\n`);
const noDatabase = {
  name: 'no-database',
  setup(b) {
    b.onResolve({ filter: /integrations\/supabase\/client$/ }, () => ({ path: 'stub', namespace: 'no-db' }));
    b.onLoad({ filter: /.*/, namespace: 'no-db' }, () => ({
      contents: "export const SUPABASE_URL = ''; export const SUPABASE_PUBLISHABLE_KEY = '';\n"
        + "export const supabase = new Proxy({}, { get() { throw new Error('simHallLongPlay never reaches the database'); } });\n",
      loader: 'js',
    }));
  },
};
await build({
  entryPoints: [entry], bundle: true, format: 'esm', platform: 'node', outfile: bundled, logLevel: 'error',
  alias: { '@': path.join(ROOT, 'src') }, plugins: [noDatabase],
});
const lib = await import(pathToFileURL(bundled).href);

/* The real wing sizes, from docs/DATA-VERIFICATION-MAP-2026-09-19.md (the
   tables simListQuizSources ratchets): 909 exhibits. Names are made up and
   never shown anywhere; only the counts move the economy. */
const WING_SIZES = { sb: 60, wnba: 29, cfb: 49, nba: 80, cbb: 87, cup: 110, ws: 121, epl: 127, nrl: 117, afl: 129 };
const rows = new Map(Object.entries(WING_SIZES).map(([k, n]) => [k, Array.from({ length: n }, (_, i) => ({ year: 1890 + i, team: `Fixture ${k} ${i + 1}` }))]));
const wings = lib.buildCatalog(rows);
const exhibits = wings.reduce((a, w) => a + w.artifacts.length, 0);
if (wings.length !== 10 || exhibits !== 909) abort(`the fixture catalog built ${wings.length} wings and ${exhibits} exhibits, not 10 and 909. ABORTED`);
/* a control runs only the section it targets */
const run = n => (CONTROL ? CONTROL_SECTION[CONTROL] === n : !ONLY || ONLY.split(',').includes(String(n)));

/* ------------------------------------------------ 1: a deep museum loads */
if (run(1)) {
  section = 1;
  console.log('1) a greedy museum played past 1e15 saves and loads intact');
  const t0 = Date.now();
  const s = lib.freshState(0x1548);
  const STEP = 60;
  const LIMIT_DAYS = Number(process.env.SIM_HALL_DAYS || 60);
  let wall = 1_800_000_000_000;
  let deepSaves = 0, deepBad = 0, firstDeepDay = null, firstCareerDay = null, ownedOver = null, overBought = 0, peakFunds = 0;
  const roundTrip = (label) => {
    const text = lib.serialize(s, wall);
    const back = lib.loadSave(text);
    const want = JSON.stringify({ state: s, lastSeen: wall });
    if (!back || JSON.stringify(back) !== want) { deepBad += 1; if (deepBad <= 3) fail(`${label}: a save holding ${s.funds.toExponential(3)} did not load intact (${back ? 'fields changed' : 'refused'})`); }
  };
  for (let t = 0; t < LIMIT_DAYS * 86400 && lib.totalArtifacts(s) < exhibits; t += STEP) {
    lib.tick(wings, s, STEP);
    wall += STEP * 1000;
    lib.startRush(s);
    for (let guard = 0; guard < 2000; guard++) {
      const shut = wings.find(w => !s.openWings.includes(w.key));
      if (shut && lib.canOpenWing(shut, s)) { lib.openWing(shut, s); continue; }
      let best = null, bestCost = Infinity;
      for (const w of wings) {
        if (!s.openWings.includes(w.key)) continue;
        const n = s.owned[w.key] ?? 0;
        if (n >= w.artifacts.length) continue;
        const c = lib.artifactCost(w, n, s);
        if (c < bestCost) { best = w; bestCost = c; }
      }
      if (best && lib.canBuyArtifact(best, s)) {
        lib.buyArtifact(best, s);
        if (bestCost > 1e15) {
          overBought += 1;
          if (!ownedOver) ownedOver = { wing: best.key, n: s.owned[best.key], cost: bestCost, day: t / 86400 };
        }
        continue;
      }
      const up = lib.UPGRADES.filter(u => lib.canBuyUpgrade(u.id, s)).sort((a, b) => lib.upgradeCost(a, s.levels[a.id]) - lib.upgradeCost(b, s.levels[b.id]))[0];
      if (up && (!best || lib.upgradeCost(up, s.levels[up.id]) < bestCost / 10)) { lib.buyUpgrade(up.id, s); continue; }
      break;
    }
    peakFunds = Math.max(peakFunds, s.funds);
    /* the hook saves every five seconds; one save a simulated minute is the same bytes' shape */
    if (s.funds > 1e15 || s.careerEarned > 1e18) {
      if (firstDeepDay === null) firstDeepDay = t / 86400;
      if (s.careerEarned > 1e18 && firstCareerDay === null) firstCareerDay = t / 86400;
      deepSaves += 1;
      roundTrip(`day ${(t / 86400).toFixed(2)}`);
    }
  }
  roundTrip('the final museum');
  const total = lib.totalArtifacts(s);
  console.log(`   ${total} of ${exhibits} exhibits in ${LIMIT_DAYS} days, peak funds ${peakFunds.toExponential(2)}, career ${s.careerEarned.toExponential(2)} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  console.log(`   first save over 1e15 funds on day ${firstDeepDay?.toFixed(2)}, over 1e18 career on day ${firstCareerDay?.toFixed(2)}; ${deepSaves} saves past an old ceiling, ${deepBad} refused or changed`);
  if (!ownedOver) fail(`the greedy museum never bought an exhibit priced over 1e15 in ${LIMIT_DAYS} days, so the deep save was never exercised`);
  else console.log(`   ${overBought} exhibits bought at over 1e15, the first ${ownedOver.wing} number ${ownedOver.n} for ${ownedOver.cost.toExponential(3)} on day ${ownedOver.day.toFixed(2)}`);
  if (firstCareerDay === null) fail('career admissions never passed 1e18, so the second old ceiling was never exercised');
  if (deepSaves < 1000) fail(`only ${deepSaves} saves held past an old ceiling, too few to call the deep path exercised`);
  if (deepBad === 0 && ownedOver && firstCareerDay !== null) console.log('   every save past both old ceilings loaded with every field intact');
}

/* ------------------------------------------ 2: a hidden tab pays the night */
const HOUR_MS = 3600 * 1000;
const CAP_MS = 8 * HOUR_MS;
function midMuseum() {
  const s = lib.freshState(7);
  s.owned = { sb: 60, wnba: 29, cfb: 20 };
  s.openWings = ['sb', 'wnba', 'cfb'];
  s.funds = 1000;
  s.clock = 5000;
  s.rushUntil = 0;
  s.rushReadyAt = 1e9;
  return s;
}
if (run(2)) {
  section = 2;
  console.log('2) a hidden tab: 600 callbacks a minute apart');
  const s = midMuseum();
  const income = lib.totalIncome(wings, s, s.clock);
  const awayRate = 0.5;
  const owed = income * awayRate * (CAP_MS / 1000);
  let paid = 0;
  for (let i = 0; i < 600; i += 1) paid += lib.advanceClock(wings, s, 60_000, false).earned;
  const ratio = paid / owed;
  console.log(`   income ${income.toFixed(2)}/s; ten hidden hours paid ${paid.toExponential(4)}, the away rate times eight hours is ${owed.toExponential(4)} (x${ratio.toFixed(6)}); meter ${s.awayMs} ms`);
  if (!(paid >= owed * 0.999)) fail(`a hidden tab left open ten hours earned x${ratio.toFixed(4)} of eight hours at the away rate`);
  if (!(paid <= owed * 1.001)) fail(`a hidden tab earned x${ratio.toFixed(4)} of the eight hour cap, so the cap leaks`);
  if (s.awayMs !== CAP_MS) fail(`the absence meter stopped at ${s.awayMs} ms, the cap is ${CAP_MS}`);
  /* the note on the door reads the absence's takings, so they must be the pay */
  if (!(Math.abs(lib.awayPaidSoFar(s) / paid - 1) < 1e-9)) fail(`the absence's takings read ${lib.awayPaidSoFar(s)}, the hidden tab was paid ${paid}`);

  /* a watched minute: full rate, and watching closes the absence */
  const w = midMuseum();
  w.awayMs = 3 * HOUR_MS;
  w.awayPaid = 1.25e7;
  let seen = 0;
  for (let i = 0; i < 240; i += 1) seen += lib.advanceClock(wings, w, 250, true).earned;
  if (Math.abs(seen / (income * 60) - 1) > 1e-9) fail(`a watched minute paid x${(seen / (income * 60)).toFixed(6)} of a minute at full rate`);
  if (w.awayMs !== 0) fail(`watching left the absence meter at ${w.awayMs} ms`);
  if (w.awayPaid !== 0) fail(`watching left the absence's takings at ${w.awayPaid}`);

  /* one absence, one cap: three hidden hours, then the tab closed for seven */
  const a = midMuseum();
  let both = 0;
  for (let i = 0; i < 180; i += 1) both += lib.advanceClock(wings, a, 60_000, false).earned;
  const rep = lib.offlineReport(wings, a, 7 * 3600);
  both += rep.earned;
  if (Math.abs(both / owed - 1) > 1e-6) fail(`three hidden hours and seven closed paid x${(both / owed).toFixed(4)} of one eight hour absence`);
  if (!rep.capped) fail('seven closed hours after three hidden ones were not reported as capped');
  if (!(Math.abs(lib.awayPaidSoFar(a) / both - 1) < 1e-9)) fail(`after three hidden hours and seven closed the takings read ${lib.awayPaidSoFar(a)}, the absence paid ${both}`);

  /* the open absence travels in the save, and junk in it loads as 0 */
  const open = midMuseum();
  open.awayMs = 3 * HOUR_MS;
  open.awayPaid = 1.25e7;
  const back = lib.loadSave(lib.serialize(open, 1_800_000_000_000));
  if (!back || back.state.awayMs !== open.awayMs || back.state.awayPaid !== open.awayPaid) fail(`a save holding an open absence came back as ${back ? `${back.state.awayMs} ms and ${back.state.awayPaid}` : 'refused'}`);
  for (const junk of ['"x"', '-5', 'null', '1e400']) {
    const j = lib.loadSave(lib.serialize(midMuseum(), 1_800_000_000_000).replace(/}$/, `,"awayPaid":${junk}}`));
    if (!j || j.state.awayPaid !== 0) fail(`a save with awayPaid ${junk} ${j ? `loaded it as ${j.state.awayPaid}` : 'was refused'}, it must load as 0`);
  }

  /* a hidden page woken once a second (a browser's first minutes of throttling):
     the gap is far under AWAY_AFTER_MS, so only visibility makes it away */
  const g = midMuseum();
  const gOracle = midMuseum();
  let gAway = 0, gPaid = 0, gOwed = 0;
  for (let i = 0; i < 30; i += 1) {
    const step = lib.advanceClock(wings, g, 1_000, false);
    if (step.away) gAway += 1;
    gPaid += step.earned;
    gOwed += lib.applyAway(wings, gOracle, 1_000);
  }
  if (gAway !== 30) fail(`only ${gAway} of 30 one second wakes on a hidden page were paid as away time`);
  if (g.funds !== gOracle.funds) fail(`30 hidden seconds paid x${(gPaid / gOwed).toFixed(4)} of the away rule`);
  if (g.awayMs !== 30_000) fail(`30 hidden seconds left the absence meter at ${g.awayMs} ms, not 30000`);

  /* the AWAY_AFTER_MS bound on a visible page: five seconds is still somebody
     watching (full rate), ten seconds without a callback is time away */
  const v5 = midMuseum();
  const five = lib.advanceClock(wings, v5, 5_000, true);
  if (five.away || Math.abs(five.earned / (income * 5) - 1) > 1e-9) fail(`a 5 s gap on a visible page was ${five.away ? 'paid as away' : `paid x${(five.earned / (income * 5)).toFixed(4)} of 5 watched seconds`}`);
  const v10 = midMuseum();
  const ten = lib.advanceClock(wings, v10, 10_000, true);
  if (!ten.away || Math.abs(ten.earned / (income * awayRate * 10) - 1) > 1e-9 || v10.awayMs !== 10_000) fail(`a 10 s gap on a visible page was ${ten.away ? `paid x${(ten.earned / (income * awayRate * 10)).toFixed(4)} of 10 away seconds, meter ${v10.awayMs} ms` : 'paid as watched'}`);

  /* a visible page that did not run (a laptop asleep two hours) is away time too */
  const z = midMuseum();
  const slept = lib.advanceClock(wings, z, 2 * HOUR_MS, true);
  if (!slept.away || Math.abs(slept.earned / (income * awayRate * 7200) - 1) > 1e-6) fail(`two asleep hours on a visible page paid x${(slept.earned / (income * awayRate * 7200)).toFixed(4)} of two away hours`);
  console.log(`   watched minute x${(seen / (income * 60)).toFixed(6)} of full rate; 3 h hidden then 7 h closed x${(both / owed).toFixed(6)} of one capped absence; 2 h asleep paid as away: ${slept.away}`);
  console.log(`   30 hidden wakes a second apart: ${gAway} paid as away, x${(gPaid / gOwed).toFixed(6)} of the away rule, meter ${g.awayMs} ms`);
  console.log(`   visible gaps: 5 s ${five.away ? 'away' : 'watched'}, 10 s ${ten.away ? 'away' : 'watched'} (AWAY_AFTER_MS ${lib.AWAY_AFTER_MS})`);
}

/* ---------------------------------------- 3: prices past T read as numbers */
if (run(3)) {
  section = 3;
  console.log('3) fmt past T');
  const want = [[999, '999'], [1500, '1.5K'], [2.5e12, '2.5T'], [9.99e14, '999T'], [1e15, '1.0Qa'], [1.45e17, '145Qa'], [2.49e18, '2.5Qi'], [9e19, '90Qi']];
  for (const [n, s] of want) if (lib.fmt(n) !== s) fail(`fmt(${n}) printed ${JSON.stringify(lib.fmt(n))}, want ${s}`);
  let longest = '';
  for (let n = 1; n < 1e21; n *= 1.7) if (lib.fmt(n).length > longest.length) longest = lib.fmt(n);
  if (longest.length > 5) fail(`fmt printed ${JSON.stringify(longest)} for a price under 1e21`);
  console.log(`   ${want.filter(([n, s]) => lib.fmt(n) === s).length} of ${want.length} values exact; the longest label under 1e21 is ${JSON.stringify(longest)}; the last AFL exhibit reads ${lib.fmt(9e19)}`);
}

/* ------------------------------------------------------ 4: the real hook */
/* Which tests each hook control must turn red; every other test must stay green. */
const HOOK_RED = { hookfixed: [2, 3, 6, 7, 8], hooknocopy: [4], hooknote: [3, 7], hookvisible: [6], hookstampnow: [8] };
const HOOK_TESTS = 8;
function findUp(rel) {
  for (let dir = ROOT; ; dir = path.dirname(dir)) {
    const p = path.join(dir, rel);
    if (fs.existsSync(p)) return p;
    if (path.dirname(dir) === dir) return null;
  }
}
function runHookSuite(env, label) {
  const vitest = findUp('node_modules/vitest/vitest.mjs');
  if (!vitest) abort('vitest is not installed here, so section 4 cannot run. ABORTED');
  const out = path.join(tmp, `report-${label}.json`);
  const r = spawnSync(process.execPath, [vitest, 'run', TEST, '--reporter=json', `--outputFile.json=${out}`, '--reporter=default', '--testTimeout=300000'], {
    cwd: ROOT, encoding: 'utf8', env: { ...process.env, ...env, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1' }, maxBuffer: 64 * 1024 * 1024,
  });
  const text = (r.stdout || '') + (r.stderr || '');
  for (const m of text.matchAll(/HALL\| (.+)/g)) console.log(`   ${label}: ${m[1].trim()}`);
  if (!fs.existsSync(out)) { console.error(text.slice(-3000)); return null; }
  const report = JSON.parse(fs.readFileSync(out, 'utf8'));
  const rows = [];
  rows.loadError = /Failed to load|Cannot find module|Failed to resolve import|SyntaxError|Transform failed/.test(text) ? text.slice(-1500) : null;
  for (const file of report.testResults || []) {
    for (const a of file.assertionResults || []) rows.push({ n: Number((a.title.match(/^(\d+)/) || [])[1] || 0), title: a.title, status: a.status, msg: (a.failureMessages || []).join('\n').split('\n')[0].slice(0, 240) });
  }
  return rows;
}
if (run(4) && !LIB_CONTROLS[CONTROL]) {
  section = 4;
  console.log('4) the real hook on fake timers');
  let env = {};
  if (HOOK_CONTROLS[CONTROL]) {
    /* The copy sits inside the checkout so its own imports resolve from here,
       in a folder made for this run alone (not dist, which a build empties),
       and the whole folder goes on exit, so nothing is left behind. */
    const dir = fs.mkdtempSync(path.join(ROOT, '.hall-longplay-'));
    process.on('exit', () => { try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* best effort */ } });
    const copy = path.join(dir, 'useHallOfChampions.ts');
    fs.writeFileSync(copy, rewrite(HOOK, HOOK_CONTROLS[CONTROL], 'src/hooks/useHallOfChampions.ts'));
    /* vitest.config.ts's generic one module alias (Round 900), off in every ordinary run */
    env = { US_BOARD_CONTROL_ALIAS: '@/hooks/useHallOfChampions', US_BOARD_CONTROL_FILE: copy };
    console.log(`control ${CONTROL}: the hook is a copy with one rewrite`);
  }
  const rows = runHookSuite(env, CONTROL || 'shipped');
  const missing = rows && !rows.loadError ? (HOOK_RED[CONTROL] || []).filter(n => !rows.some(r => r.n === n)) : [];
  const crash = !rows ? 'the hook suite wrote no report'
    : rows.loadError ? `the hook suite did not load, so every red is a crash:\n${rows.loadError}`
    : rows.length !== HOOK_TESTS ? `the hook suite ran ${rows.length} tests, not ${HOOK_TESTS}`
    : missing.length ? `the control targets test ${missing.join(', ')}, which the suite does not have`
    : null;
  if (crash && CONTROL) {
    /* A control that crashed proves nothing, so it never reads as FIRED: its
       own last line and its own exit code (2, where a fire is 1). */
    console.error(crash);
    console.log(`simHallLongPlay control ${CONTROL}: CRASHED, ${crash.split('\n')[0]}; a crash is not a fire, so this control proves nothing`);
    process.exit(2);
  }
  if (crash) fail(crash);
  else {
    const red = HOOK_RED[CONTROL] || [];
    for (const row of rows) {
      if (red.includes(row.n)) {
        if (row.status !== 'failed') { dead += 1; console.error(`  DEAD: "${row.title}" stayed green with the hook control on`); }
        else fail(`"${row.title}" (red under the control, as it must be): ${row.msg}`);
      } else if (row.status !== 'passed') {
        if (CONTROL) collateral += 1;
        fail(`"${row.title}": ${row.status} ${row.msg}`);
      }
    }
    console.log(`   ${rows.filter(r => r.status === 'passed').length} of ${rows.length} hook tests green`);
  }
}

/* ------------------------------------------------------------- summary */
if (CONTROL) {
  const target = CONTROL_SECTION[CONTROL];
  const hits = bySection[target] || 0;
  if (collateral > 0) { console.log(`simHallLongPlay control ${CONTROL}: MISFIRED, it also turned ${collateral} test${collateral === 1 ? '' : 's'} red that it does not target`); process.exit(1); }
  if (hits > 0 && dead === 0) { console.log(`simHallLongPlay control ${CONTROL}: FIRED, ${hits} failure${hits === 1 ? '' : 's'} in section ${target} (red is the right answer)`); process.exit(1); }
  console.log(`simHallLongPlay control ${CONTROL}: DID NOT FIRE (section ${target}: ${hits} failures, ${dead} targeted tests stayed green), so the checks it targets are dead`);
  process.exit(0);
}
if (failures > 0) { console.log(`simHallLongPlay: RED, ${failures} failure${failures === 1 ? '' : 's'}`); process.exit(1); }
console.log(`simHallLongPlay: green${ONLY ? ` (sections ${ONLY} only)` : ''}`);
