/* Round 1342: Club Manager's No sacking option. The board can warn and moan but never fire you, chosen on the
 * Dugout step or switched on later from Options (one way). Stored as startOptions.noSack, the season it was
 * switched on; absent means off, and a save without it plays today's game to the byte.
 *
 * WHAT IT HOLDS (the brief's sections 2, 5 and 6, renumbered):
 *   1. IDENTITY. A career without the key plays byte for byte as the base tree: the nine clubs, SEEDS seeds,
 *      SEASONS seasons, quick sims with the coach and with noCoach, the whole state at every season end and the
 *      count of Math.random draws equal to BASE_ROOT's (a worktree of the commit the branch started from). Without
 *      BASE_ROOT (the suite) the base is this tree with both No sacking floors taken out of the bundle.
 *   2. THE FLEET. The hoard keeper (signs nobody, renews nobody: simClubManagerBudget's keeper, sacked inside two
 *      or three seasons at every club it tried) at the nine clubs for three seasons, with No sacking on from day
 *      one and without it (its twin, the same seed). The No sacking career is never sacked and never on zero after
 *      a match; the twin is sacked at least SACK_FLOOR times; and every match a twin is sacked on is a match its
 *      No sacking career survives with the No sacking line, the two boards equal on every match before it (the
 *      key draws nothing, so the two are the same career until the floor).
 *   3. THE PLANTED SAVE. A No sacking career planted at confidence 1 before every match, quick simmed to its
 *      first defeat (at most ten matches, none is a failed run): still in the job above zero, the line in the
 *      report, and loadCareer of the saved string opens it at the same confidence, not sacked, still No sacking.
 *   4. THE SWITCH AND THE SCORE. turnOnNoSack refuses a sacked career, one in the wilderness and a second call,
 *      and returns a copy (the original untouched); switched on in season 3 it stores 3; the Managers screen's
 *      card (summarize) carries the mark on a No sacking save and not on any other; the key reads as off for
 *      every odd value; ensureStartOptions
 *      keeps it when it repairs a broken block and changes nothing on a good one; postsScore is false on a No
 *      sacking career and true on every other; every scored ping in useClubManager.ts sits behind postsScore with
 *      an unscored else (three match pings, four completions), and the literals simClubManagerScore,
 *      simSessionMarks and simActivityNotCompletion count are still there.
 *   5. THE GATE. Every `sacked = true` write in clubManager.ts (comments stripped) has the No sacking floor as the
 *      statement right in front of its check (nothing between the floor's block and the check that writes the
 *      sack): two writes and two floors today.
 *   6. THE DAILIES. Three Manager Hot Seat and three Deadline Day dates of simDailyDeals' window, played by its
 *      fixed script on this tree and on the base (as in section 1): the whole state equal, no state carries the key. Deadline
 *      Day plays no match, so the gate cannot reach it whatever its state holds; that is proved from its code
 *      (deadlineDay.ts, comments stripped, calls none of the match or No sacking entry points).
 *
 * CONTROLS (NO_SACK_CONTROL), each patches the bundle or the text read, never src, and must turn its sections red:
 *   sack       boardMaySack answers true for every save                 sections 2 and 3
 *   refuse     turnOnNoSack stops refusing a sacked or wilderness career section 4
 *   ranked     postsScore answers true for every save                   section 4
 *   stale      turnOnNoSack stores season 1 whatever the season          section 4
 *   noslot     summarize forgets the No sacking mark                     section 4
 *   unguarded  one scored ping loses its postsScore guard               section 4
 *   thirdsack  a third, unguarded sacked write                          section 5
 *   farfloor   a statement between the first floor and its check     section 5
 *   leak       defaultStartOptions writes the key into every new block  sections 1 and 6 (every Hot Seat date)
 *   draw       the first floor draws from Math.random on every match    section 1
 *   ddreach    deadlineDay.ts gains a playNextEntry call                 section 6
 * Exit 0 green, 1 red or a control that fired (last line says FIRED), 2 could not run, 3 a control that did not fire.
 *
 *   git worktree add .tmp-base <base sha> && BASE_ROOT=.tmp-base node scripts/simCmNoSack.mjs
 *   SECTION=2 FLEET_SEED=1 node scripts/simCmNoSack.mjs        one section, another stream
 */
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE_ROOT = process.env.BASE_ROOT ? path.resolve(ROOT, process.env.BASE_ROOT) : null;
const CONTROL = process.env.NO_SACK_CONTROL || '';
const SEEDS = Number(process.env.SEEDS || 2);
const SEASONS = Number(process.env.SEASONS || 2);
const FLEET_SEED = Number(process.env.FLEET_SEED || 0);
/* Measured on 2c893d06 (remote check r1342-s2, lines ns2 and ns2-f1 to ns2-f3): the hoard keeper's twin was
   sacked at 8, 7, 7 and 8 of the nine clubs on FLEET_SEED 0 to 3 (Real Madrid's never, in any), and every one of
   those matches was survived by its No sacking career with the line (8, 7, 7, 8 pairs; 159, 100, 119 and 129 lines
   in all). The floor sits two under the lowest. A No sacking board went as low as 0.0x after a match (a cost
   between the floor and the end of the week) and never to zero. Section 1 against d4f2c6f6 with SEEDS=5 SEASONS=3:
   90 careers equal in 178 s; the default 2 and 2 is 36 careers in about 60 s, and the whole run about 130 s. */
const SACK_FLOOR = Number(process.env.SACK_FLOOR || 5);

const cannot = why => { console.log(`simCmNoSack: CANNOT RUN: ${why}`); process.exit(2); };
const read = (root, f) => fs.readFileSync(path.join(root, f), 'utf8').replaceAll('\r\n', '\n');
const strip = t => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/* The bundle patches. `from` must be in its file exactly once (LF), or the control cannot run. */
const PATCHES = {
  sack: { file: 'clubManagerStart.ts', from: 'export function boardMaySack(state: CareerState): boolean {\n  return noSackFrom(state) === null;', to: 'export function boardMaySack(state: CareerState): boolean {\n  return true;' },
  refuse: { file: 'clubManagerStart.ts', from: '  if (state.sacked || state.wilderness || noSackFrom(state) !== null) return null;', to: '  if (noSackFrom(state) !== null) return null;' },
  ranked: { file: 'clubManagerStart.ts', from: 'export function postsScore(state: CareerState): boolean {\n  return noSackFrom(state) === null;', to: 'export function postsScore(state: CareerState): boolean {\n  return true;' },
  leak: { file: 'clubManagerStart.ts', from: '    strictness: STRICTNESS_DEFAULT,\n  };', to: '    strictness: STRICTNESS_DEFAULT,\n    noSack: 1,\n  };' },
  stale: { file: 'clubManagerStart.ts', from: '  const season = Number.isInteger(state.season) && state.season > 0 ? state.season : 1;', to: '  const season = 1;' },
  noslot: { file: 'clubManagerSlots.ts', from: '      ...(noSackFrom(c as CareerState) !== null ? { noSack: true as const } : {}),\n', to: '' },
  draw: { file: 'clubManager.ts', from: '  if (!boardMaySack(state) && state.boardConfidence <= 0) {\n    state.boardConfidence = 1;\n    noSackLine = true;', to: '  if (Math.random() < 2 && !boardMaySack(state) && state.boardConfidence <= 0) {\n    state.boardConfidence = 1;\n    noSackLine = true;' },
};
/* Without BASE_ROOT (the suite), sections 1 and 6 compare with THIS tree with both floors taken out: the same
   claim, a career without the key never meets the floor or a draw of it, held for as long as the floors exist. */
const PLAIN = [
  { file: 'clubManager.ts', from: '  let noSackLine = false;\n  if (!boardMaySack(state) && state.boardConfidence <= 0) {\n    state.boardConfidence = 1;\n    noSackLine = true;\n    events.push(NO_SACK_LINE);\n  }\n', to: '' },
  { file: 'clubManager.ts', from: '  if (!boardMaySack(state) && state.boardConfidence <= 0) {\n    state.boardConfidence = 1;\n    if (!noSackLine) events.push(NO_SACK_LINE);\n  }\n', to: '' },
];
const CONTROL_SECTIONS = { sack: [2, 3], refuse: [4], ranked: [4], stale: [4], noslot: [4], unguarded: [4], thirdsack: [5], farfloor: [5], leak: [1, 6], draw: [1], ddreach: [6] };
if (CONTROL && !CONTROL_SECTIONS[CONTROL]) cannot(`unknown control ${CONTROL}`);
const SECTIONS = CONTROL ? CONTROL_SECTIONS[CONTROL]
  : (process.env.SECTION || '1,2,3,4,5,6').split(',').map(Number);
if (BASE_ROOT && !fs.existsSync(path.join(BASE_ROOT, 'src/lib/clubManager.ts'))) cannot(`BASE_ROOT ${BASE_ROOT} holds no src/lib/clubManager.ts`);

/* Edits to the bundle: each `from` must be in its file exactly once (LF), or the run cannot go on. */
const patchPlugin = (edits, hits) => ({
  name: 'no-sack-edits',
  setup(b) {
    b.onLoad({ filter: /[.]ts$/ }, async args => {
      const mine = edits.filter(e => path.basename(args.path) === e.file);
      if (!mine.length) return undefined;
      let source = (await fs.promises.readFile(args.path, 'utf8')).replaceAll('\r\n', '\n');
      for (const e of mine) {
        const count = source.split(e.from).length - 1;
        if (count !== 1) cannot(`${CONTROL ? `control ${CONTROL}` : 'the plain tree'}: an edit's text is in ${e.file} ${count} times, it must be exactly once (${e.from.slice(0, 50).replaceAll('\n', ' ')}...)`);
        source = source.replace(e.from, e.to);
        hits.n += 1;
      }
      return { contents: source, loader: 'ts' };
    });
  },
});

const P = (root, f) => JSON.stringify(path.join(root, f).split(path.sep).join('/'));
async function bundleOf(root, name, edits) {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), `nosack-${name}-`));
  const entry = path.join(work, 'entry.ts');
  fs.writeFileSync(entry, ['clubManager', 'clubManagerStart', 'managerHotSeat', 'deadlineDay', 'clubManagerSlots']
    .map((f, i) => `export * as ${['cm', 'st', 'hs', 'dd', 'sl'][i]} from ${P(root, `src/lib/${f}.ts`)};`).join('\n') + '\n');
  const out = path.join(work, 'bundle.cjs');
  const hits = { n: 0 };
  await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'cjs', outfile: out, logLevel: 'silent',
    alias: { '@': path.join(root, 'src') }, nodePaths: [path.join(ROOT, 'node_modules')], plugins: edits.length ? [patchPlugin(edits, hits)] : [] });
  if (hits.n !== edits.length) cannot(`${name}: ${hits.n} of ${edits.length} edits reached the bundle`);
  return out;
}

/* ---- the runtime: a fresh module per career, the way a page load deals one; a fixed clock ---- */
const store = new Map();
globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() };
Date.now = () => 1791547200000;
const req = createRequire(import.meta.url);
const fresh = b => { delete req.cache[req.resolve(b)]; store.clear(); return req(b); };

/* simClubManagerBudget's stream, with a draw counter. */
function seeded(seed) {
  let a = seed >>> 0;
  const f = () => {
    f.n += 1;
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  f.n = 0;
  return f;
}
function onStream(seed, fn) {
  const saved = Math.random;
  const r = seeded(seed);
  Math.random = r;
  try { return { value: fn(), draws: r.n }; } finally { Math.random = saved; }
}

const failures = {};
let section = 0;
const fail = m => { failures[section] = (failures[section] || 0) + 1; console.log(`  FAIL (section ${section}): ${m}`); };
const firstDiff = (a, b) => {
  const x = JSON.parse(a), y = JSON.parse(b);
  for (const k of new Set([...Object.keys(x), ...Object.keys(y)])) {
    if (JSON.stringify(x[k]) !== JSON.stringify(y[k])) return k;
  }
  return '(key order)';
};

/** One season of quick sims. onMatch sees every match report with the state after it. */
function playSeason(cm, start, opts, onMatch) {
  let s = start;
  for (let guard = 0; guard < 160; guard += 1) {
    const res = cm.playNextEntry(s, opts);
    s = res.state;
    if (res.kind === 'match' && res.report && onMatch) onMatch(res.report, s);
    if (res.kind === 'seasonOver') return { s, over: true };
    if (s.sacked) return { s, over: false };
  }
  return { s, over: false, stuck: true };
}

/* ---- the bundles ---- */
const HEAD = await bundleOf(ROOT, 'head', PATCHES[CONTROL] ? [PATCHES[CONTROL]] : []);
const needBase = SECTIONS.some(n => n === 1 || n === 6);
const BASE = !needBase ? null : BASE_ROOT ? await bundleOf(BASE_ROOT, 'base', []) : await bundleOf(ROOT, 'plain', PLAIN);
const headMod = fresh(HEAD);
const hasNoSack = typeof headMod.st.turnOnNoSack === 'function' && typeof headMod.st.postsScore === 'function';
console.log(`simCmNoSack: sections ${SECTIONS.join(', ')}${CONTROL ? `, control ${CONTROL}` : ''}${needBase ? `, compared with ${BASE_ROOT ? `the base tree ${BASE_ROOT}` : 'this tree with both floors taken out'}` : ''}`);

/* The nine clubs: the first, the middle and the last of three leagues by the board's expectation. */
const CLUBS = [];
for (const id of ['premier', 'laliga', 'seriea']) {
  const list = headMod.cm.playableClubs(id);
  for (const c of [list[0], list[Math.floor(list.length / 2)], list[list.length - 1]]) CLUBS.push(c.name);
}
console.log(`   clubs: ${CLUBS.join(', ')}`);
const clock = () => performance.now();

/* ---------- 1. a career without the key plays as the base tree ---------- */
function identityCareer(b, club, seed, coach) {
  const { cm } = fresh(b);
  const snaps = [];
  const { draws } = onStream(seed, () => {
    let s = cm.startCareer(club);
    for (let k = 1; k <= SEASONS; k += 1) {
      const p = playSeason(cm, s, { skipHalftime: true, noCoach: !coach });
      s = p.s;
      if (!p.over) { snaps.push(JSON.stringify(s)); return; }
      s = cm.finishSeason(s).state;
      snaps.push(JSON.stringify(s));
      if (k < SEASONS) s = cm.startNextSeason(s);
    }
  });
  return { snaps, draws };
}
if (SECTIONS.includes(1)) {
  section = 1;
  const t = clock();
  console.log(`1) A career without the key plays as the base tree: ${CLUBS.length} clubs, ${SEEDS} seeds, ${SEASONS} seasons, coach and noCoach`);
  let compared = 0, keyed = 0, draws = 0;
  for (const club of CLUBS) for (let seed = 0; seed < SEEDS; seed += 1) for (const coach of [true, false]) {
    const sd = 1000 + seed * 97 + CLUBS.indexOf(club);
    const a = identityCareer(HEAD, club, sd, coach);
    const b = identityCareer(BASE, club, sd, coach);
    compared += 1;
    draws += a.draws;
    const tag = `${club} seed ${seed} ${coach ? 'coach' : 'noCoach'}`;
    if (a.draws !== b.draws) fail(`${tag}: ${a.draws} draws here, ${b.draws} on the base tree`);
    if (a.snaps.length !== b.snaps.length) fail(`${tag}: ${a.snaps.length} season ends here, ${b.snaps.length} on the base tree`);
    for (let i = 0; i < Math.min(a.snaps.length, b.snaps.length); i += 1) {
      if (a.snaps[i] !== b.snaps[i]) { fail(`${tag}: season ${i + 1} differs from the base tree, first at key ${firstDiff(a.snaps[i], b.snaps[i])}`); break; }
    }
    if (a.snaps.some(j => JSON.parse(j).startOptions?.noSack !== undefined)) keyed += 1;
  }
  if (keyed) fail(`${keyed} careers that never asked for it carry the No sacking key`);
  console.log(`   ${compared} careers compared, ${draws} draws here, in ${((clock() - t) / 1000).toFixed(0)} s`);
}

/* ---------- 2. the fleet: the hoard keeper with and without No sacking ---------- */
function fleetCareer(b, club, seed, noSack) {
  const { cm, st } = fresh(b);
  const boards = [], lineAt = [];
  let sackedAt = -1, zero = 0, seasons = 0;
  onStream(seed, () => {
    let s = cm.startCareer(club);
    if (noSack) s = st.turnOnNoSack(s);
    for (let k = 1; k <= 3; k += 1) {
      const p = playSeason(cm, s, { skipHalftime: true }, (report, after) => {
        boards.push(after.boardConfidence);
        if (report.events.includes(st.NO_SACK_LINE)) lineAt.push(boards.length - 1);
        if (!after.sacked && !(after.boardConfidence > 0)) zero += 1;
        if (after.sacked && sackedAt < 0) sackedAt = boards.length - 1;
      });
      s = p.s;
      if (!p.over) return;
      seasons = k;
      s = cm.finishSeason(s).state;
      if (k < 3) s = cm.startNextSeason(s);
    }
  });
  return { boards, lineAt, sackedAt, zero, seasons };
}
if (SECTIONS.includes(2)) {
  section = 2;
  const t = clock();
  console.log(`2) The hoard keeper for three seasons at the nine clubs, with No sacking and without (fleet seed ${FLEET_SEED})`);
  if (!hasNoSack) fail('the engine has no turnOnNoSack or postsScore, so No sacking cannot be switched on');
  else {
    let twinsSacked = 0, lines = 0, pairs = 0;
    for (const club of CLUBS) {
      const seed = 5000 + FLEET_SEED * 101 + CLUBS.indexOf(club);
      let on, twin;
      try { on = fleetCareer(HEAD, club, seed, true); twin = fleetCareer(HEAD, club, seed, false); } catch (e) { fail(`${club}: the career threw: ${e && e.message}`); continue; }
      lines += on.lineAt.length;
      if (on.sackedAt >= 0) fail(`${club}: sacked at match ${on.sackedAt + 1} with No sacking on`);
      if (on.zero) fail(`${club}: ${on.zero} matches ended with the board on zero and No sacking on`);
      if (twin.sackedAt >= 0) {
        twinsSacked += 1;
        const k = twin.sackedAt;
        if (!on.boards.slice(0, k).every((v, i) => v === twin.boards[i])) fail(`${club}: the two boards part before match ${k + 1}, so the key changed the career before the floor`);
        else if (!on.lineAt.includes(k)) fail(`${club}: the twin was sacked at match ${k + 1} and the No sacking career shows no No sacking line there`);
        else pairs += 1;
      }
      console.log(`   ${club.padEnd(22)} No sacking: ${on.seasons} seasons, board low ${Math.min(...on.boards).toFixed(1)}, ${on.lineAt.length} lines; twin ${twin.sackedAt >= 0 ? `sacked at match ${twin.sackedAt + 1}` : `kept the job for ${twin.seasons} seasons`}`);
    }
    console.log(`   twins sacked ${twinsSacked} of ${CLUBS.length} (floor ${SACK_FLOOR}), each survived at that very match by its No sacking career: ${pairs}; No sacking lines ${lines}; ${((clock() - t) / 1000).toFixed(0)} s`);
    if (twinsSacked < SACK_FLOOR) fail(`only ${twinsSacked} twins were sacked (floor ${SACK_FLOOR}), so the fleet does not test the floor`);
    if (lines < 1) fail('the No sacking line never showed over the whole fleet');
  }
}

/* ---------- 3. a save planted on its last point, to its first defeat ---------- */
if (SECTIONS.includes(3)) {
  section = 3;
  const club = CLUBS[CLUBS.length - 1];
  console.log(`3) A No sacking save planted at confidence 1 before every match at ${club}, to its first defeat, three seeds`);
  if (!hasNoSack) fail('the engine has no turnOnNoSack or postsScore, so No sacking cannot be switched on');
  else {
    let checked = 0;
    for (let seed = 0; seed < 3; seed += 1) {
      const { cm, st } = fresh(HEAD);
      onStream(7000 + seed, () => {
        let s = st.turnOnNoSack(cm.startCareer(club));
        let matches = 0;
        for (let guard = 0; guard < 200 && matches < 10; guard += 1) {
          s = { ...s, boardConfidence: 1 };
          const res = cm.playNextEntry(s, { skipHalftime: true });
          s = res.state;
          if (res.kind === 'seasonOver') break;
          if (res.kind !== 'match' || !res.report) continue;
          matches += 1;
          const r = res.report;
          if (r.won || r.drawn) continue;
          checked += 1;
          const tag = `seed ${seed}, defeat in match ${matches} (${r.homeGoals}-${r.awayGoals})`;
          if (s.sacked) fail(`${tag}: sacked with No sacking on`);
          else if (!(s.boardConfidence > 0)) fail(`${tag}: the board ended on ${s.boardConfidence}`);
          if (!r.events.includes(st.NO_SACK_LINE)) fail(`${tag}: no No sacking line in the report`);
          localStorage.setItem(cm.SAVE_KEY, JSON.stringify(s));
          const back = cm.loadCareer();
          if (!back) fail(`${tag}: loadCareer opened nothing`);
          else {
            if (back.boardConfidence !== s.boardConfidence) fail(`${tag}: saved on ${s.boardConfidence}, opened on ${back.boardConfidence}`);
            if (back.sacked) fail(`${tag}: opened sacked`);
            if (st.noSackFrom(back) !== st.noSackFrom(s)) fail(`${tag}: No sacking was ${st.noSackFrom(s)} and opened as ${st.noSackFrom(back)}`);
          }
          console.log(`   ${tag}: board ${s.boardConfidence}, ${s.sacked ? 'SACKED' : 'in the job'}, reopened on ${back ? back.boardConfidence : 'nothing'}`);
          return;
        }
        fail(`seed ${seed}: no defeat in ${matches} matches`);
      });
    }
    if (checked < 3) fail(`only ${checked} of 3 planted saves reached a defeat`);
  }
}

/* ---------- 4. the switch, the key, the repair and the score ---------- */
if (SECTIONS.includes(4)) {
  section = 4;
  console.log('4) turnOnNoSack is one way and refuses a sacked or out of work manager; the key reads strictly; only a career without it posts a score');
  if (!hasNoSack) fail('the engine has no turnOnNoSack or postsScore');
  else {
    const { cm, st, sl } = fresh(HEAD);
    const s = onStream(9001, () => cm.startCareer('Arsenal')).value;
    const before = JSON.stringify(s);
    const on = st.turnOnNoSack(s);
    if (!on || on === s) fail('turnOnNoSack did not return a new career');
    else {
      if (st.noSackFrom(on) !== s.season) fail(`switched on in season ${s.season}, the key reads ${st.noSackFrom(on)}`);
      if (JSON.stringify(s) !== before) fail('turnOnNoSack changed the career it was given');
      if (st.turnOnNoSack(on) !== null) fail('a second turnOnNoSack was not refused');
      if (st.postsScore(on)) fail('a No sacking career still posts a score');
      /* Review of 2026-10-16: the season it went on, read off a career past season 1 (in season 1 a stale
         constant reads the same), and the Managers screen's card, which only the walk had read. */
      const on3 = st.turnOnNoSack({ ...s, season: 3 });
      if (!on3 || st.noSackFrom(on3) !== 3) fail(`switched on in season 3, the key reads ${on3 && st.noSackFrom(on3)}`);
      const card = sl.summarize(JSON.stringify(on)), plainCard = sl.summarize(JSON.stringify(s));
      if (!card || card.noSack !== true) fail(`the Managers card of a No sacking save has no No sacking mark (${card && JSON.stringify(card.noSack)})`);
      if (!plainCard || 'noSack' in plainCard) fail('the Managers card of a save without the key carries a No sacking mark, or no card was made');
      const good = JSON.parse(JSON.stringify(on));
      st.ensureStartOptions(good);
      if (JSON.stringify(good) !== JSON.stringify(on)) fail('ensureStartOptions changed a good block that carries the key');
    }
    if (st.noSackFrom(s) !== null) fail('a career without the key reads as No sacking');
    if (!st.postsScore(s)) fail('a career without the key posts no score');
    const sacked = { ...s, sacked: true };
    if (st.turnOnNoSack(sacked) !== null) fail('turnOnNoSack switched on for a sacked manager');
    if (!st.postsScore(sacked)) fail('a sacked career without the key posts no score');
    const wild = cm.enterWilderness(sacked);
    if (!wild.wilderness) fail('could not put a career in the wilderness');
    else if (st.turnOnNoSack({ ...wild, sacked: false }) !== null) fail('turnOnNoSack switched on for a manager in the wilderness');
    const block = st.startOptionsOf(s);
    for (const v of [undefined, null, 0, -1, 1.5, '3', 'yes', true, NaN, Infinity, [], {}]) {
      if (st.noSackFrom({ ...s, startOptions: { ...block, noSack: v } }) !== null) fail(`a key of ${JSON.stringify(v)} reads as on`);
    }
    for (const v of [1, 2, 9]) if (st.noSackFrom({ ...s, startOptions: { ...block, noSack: v } }) !== v) fail(`a key of ${v} does not read as season ${v}`);
    const broken = { ...s, startOptions: { v: 99, noSack: 4 } };
    st.ensureStartOptions(broken);
    const once = JSON.stringify(broken.startOptions);
    st.ensureStartOptions(broken);
    if (!st.isValidStartOptions(broken.startOptions)) fail('ensureStartOptions left a broken block');
    if (st.noSackFrom(broken) !== 4) fail('ensureStartOptions dropped No sacking when it repaired a broken block');
    if (JSON.stringify(broken.startOptions) !== once) fail('ensureStartOptions is not idempotent on a repaired block');
    const brokenBad = { ...s, startOptions: { v: 99, noSack: 'x' } };
    st.ensureStartOptions(brokenBad);
    if ('noSack' in brokenBad.startOptions) fail('ensureStartOptions carried a bad key into a repaired block');

    /* The pings: every scored one behind postsScore with an unscored else, read as code. */
    let hook = strip(read(ROOT, 'src/hooks/useClubManager.ts'));
    if (CONTROL === 'unguarded') {
      const was = hook;
      hook = hook.replace('if (postsScore(res.state)) recordActivity(', 'recordActivity(');
      if (hook === was) cannot('control unguarded: there is no guarded match ping to take the guard off');
    }
    const guard = /if \(postsScore\([\w.]+\)\) $/;
    let act = 0, comp = 0;
    for (const m of hook.matchAll(/record(Activity|Completion)\('\/club-manager', /g)) {
      if (m[1] === 'Activity') act += 1; else comp += 1;
      const end = hook.indexOf(';', m.index);
      const lead = hook.slice(Math.max(0, m.index - 60), m.index);
      const tail = hook.slice(end + 1, end + 90).trimStart();
      if (!guard.test(lead) || !tail.startsWith(`else record${m[1]}('/club-manager');`)) fail(`a scored ping without the postsScore guard and its unscored else: ${hook.slice(m.index, end + 1)}`);
    }
    const lit = t => hook.split(t).length - 1;
    const pings = lit("recordActivity('/club-manager', currentSeasonScore(");
    const ends = lit("recordCompletion('/club-manager', sm.seasonScore)");
    console.log(`   ${act} scored match pings and ${comp} scored completions, each behind postsScore; literals for the three ping harnesses: ${pings} and ${ends}`);
    if (act < 3 || comp < 4) fail(`expected three scored match pings and four scored completions, found ${act} and ${comp}`);
    if (pings < 3 || ends < 3) fail(`the literals simClubManagerScore, simSessionMarks and simActivityNotCompletion count are down to ${pings} and ${ends} (each needs 3)`);
  }
}

/* ---------- 5. every sacking has the floor in front of it ---------- */
if (SECTIONS.includes(5)) {
  section = 5;
  let code = strip(read(ROOT, 'src/lib/clubManager.ts'));
  if (CONTROL === 'thirdsack') code += '\nfunction thirdSack(state) {\n  if (state.boardConfidence <= 0) {\n    state.sacked = true;\n  }\n}\n';
  if (CONTROL === 'farfloor') {
    /* A statement slipped between the first floor and its check: the floor is still above the write, but no longer
       the thing right in front of it. */
    const from = '    events.push(NO_SACK_LINE);\n  }\n  if (state.boardConfidence <= 0) {';
    if (code.split(from).length - 1 !== 1) cannot('control farfloor: the first floor and its check are not where the control expects them');
    code = code.replace(from, '    events.push(NO_SACK_LINE);\n  }\n  state.boardConfidence -= 1;\n  if (state.boardConfidence <= 0) {');
  }
  const FLOOR = '!boardMaySack(state) && state.boardConfidence <= 0';
  /* Review of 2026-10-16: placement, not just "somewhere before". From the last floor before a write, past the
     floor's own block, the next thing must be the sack check whose block makes that write. */
  const NEXT_CHECK = /^\s*if \((!state\.sacked && )?state\.boardConfidence <= 0\) \{\s*state\.$/;
  const parts = code.split('sacked = true');
  const writes = parts.length - 1;
  const floors = code.split(FLOOR).length - 1;
  console.log(`5) ${writes} sacked writes and ${floors} No sacking floors in clubManager.ts, read as code`);
  if (writes < 2) fail(`only ${writes} sacked writes found; the engine has two`);
  for (let i = 0; i < writes; i += 1) {
    const at = parts[i].lastIndexOf(FLOOR);
    if (at < 0) { fail(`sacked write ${i + 1} has no No sacking floor in front of its check`); continue; }
    const close = parts[i].indexOf('\n  }\n', at);
    const between = close < 0 ? '' : parts[i].slice(close + 5);
    if (close < 0 || !NEXT_CHECK.test(between)) fail(`sacked write ${i + 1}: its floor is not the statement right in front of its check (after the floor: ${JSON.stringify(between.slice(0, 80))})`);
  }
  if (floors !== writes) fail(`${floors} floors for ${writes} sacked writes`);
}

/* ---------- 6. the dailies keep today's rules ---------- */
const HOT = ['2026-10-10', '2026-10-11', '2026-10-27'];
const DEAD = ['2026-10-10', '2026-10-11', '2026-10-18'];
const carriesKey = st => !!(st && st.startOptions && typeof st.startOptions === 'object' && 'noSack' in st.startOptions);
/* simDailyDeals' fixed script: balanced, no talk, the first press answer. */
function hotSeatDay(b, date) {
  const { hs } = fresh(b);
  const setup = hs.dailyHotSeat(date);
  let run = hs.startHotSeat({ club: setup.club, seed: setup.seed, daily: date });
  let guard = 0;
  while (!run.verdict && guard++ < 40) run = hs.pendingPress(run) ? hs.answerHotSeatPress(run, 0) : hs.playHotSeatMatch(run, 'balanced', null);
  const hand = run.verdict ? hs.handoverState(run) : null;
  return { club: setup.club, json: JSON.stringify([run.state, run.log, run.verdict ?? null, hand]), keyed: carriesKey(run.state) || carriesKey(hand) };
}
function deadlineDayRun(b, date) {
  const { dd } = fresh(b);
  const setup = dd.dailyDeadlineDay(date);
  const run = dd.endDay(dd.startDeadlineDay(setup));
  return { club: setup.club, json: JSON.stringify([run.state, run.grade ?? null, run.ticker]), keyed: carriesKey(run.state) };
}
let hotRed = 0;
if (SECTIONS.includes(6)) {
  section = 6;
  const t = clock();
  console.log(`6) Manager Hot Seat (${HOT.join(', ')}) and Deadline Day (${DEAD.join(', ')}) play as on the base tree`);
  let deadRed = 0;
  for (const [kind, dates, day] of [['Hot Seat', HOT, hotSeatDay], ['Deadline Day', DEAD, deadlineDayRun]]) {
    for (const date of dates) {
      const a = day(HEAD, date), b = day(BASE, date);
      const why = [];
      if (a.json !== b.json) why.push('the day differs from the base tree');
      if (a.keyed) why.push('its state carries the No sacking key');
      if (why.length) {
        if (kind === 'Hot Seat') hotRed += 1; else deadRed += 1;
        fail(`${kind} ${date} (${a.club}): ${why.join('; ')}`);
      } else console.log(`   ${kind} ${date} ${a.club}: identical, no key`);
    }
  }
  /* Deadline Day never plays a match, so the floor cannot reach it whatever its state holds. Proved from the code. */
  let ddCode = strip(read(ROOT, 'src/lib/deadlineDay.ts'));
  if (CONTROL === 'ddreach') ddCode += '\nexport function reach(state) { return playNextEntry(state, {}); }\n';
  const ENTRY_POINTS = ['playNextEntry', 'resumeMatch', 'playMyMatch', 'simToWeek', 'startHotSeat', 'playHotSeatMatch',
    'boardMaySack', 'turnOnNoSack', 'applyCareerSetup', 'ensureStartOptions', 'defaultStartOptions'];
  const reached = ENTRY_POINTS.filter(n => new RegExp('(^|[^A-Za-z0-9_$])' + n + '[(]').test(ddCode));
  if (reached.length) fail(`deadlineDay.ts calls ${reached.join(', ')}, so a match or the No sacking key can reach Deadline Day`);
  console.log(`   red per daily: Hot Seat ${hotRed} of ${HOT.length}, Deadline Day ${deadRed} of ${DEAD.length}; deadlineDay.ts calls ${reached.length ? reached.join(', ') : 'none of the match or No sacking entry points'}; ${((clock() - t) / 1000).toFixed(0)} s`);
}

/* ---------- the verdict ---------- */
const red = Object.keys(failures).map(Number).sort((x, y) => x - y);
if (CONTROL) {
  const want = CONTROL_SECTIONS[CONTROL];
  const missed = want.filter(n => !failures[n]).map(String);
  if (CONTROL === 'leak' && hotRed !== HOT.length) missed.push(`6 (only ${hotRed} of ${HOT.length} Hot Seat dates)`);
  if (missed.length) {
    console.log(`simCmNoSack: CONTROL ${CONTROL} DID NOT FIRE in section(s) ${missed.join(', ')}`);
    process.exit(3);
  }
  console.log(`simCmNoSack: CONTROL ${CONTROL} FIRED: ${want.map(n => `section ${n} red (${failures[n]} failures)`).join(', ')}`);
  process.exit(1);
}
console.log(red.length ? `simCmNoSack: FAIL in section(s) ${red.join(', ')}` : `simCmNoSack: PASS (sections ${SECTIONS.join(', ')})`);
process.exit(red.length ? 1 : 0);
