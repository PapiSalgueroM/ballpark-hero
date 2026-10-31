/* Round 1603: a deciding second leg is judged by the tie (player report b7b51855), and four and five goal hauls
   are named (player report 3ce0d4ff).

   THE RULE. On a deciding second leg (the match whose report carries tie.leg 2 with through set) the board's base
   swing, the dressing room's morale swing and the fans' result read the TIE: lost 1-2 and through on penalties is
   a tie won, won 2-1 and out on aggregate is an exit. The record keeps the NIGHT (Round 507): the fixture log's
   score and W/D/L, the form guide, the career totals, the head to head book, the bracket and every rating. The
   result log gains `tie` only where the tie and the night differ, and the fan meter reads `tie ?? res`. Manager
   Hot Seat keeps the night's reading for days dated before HOT_SEAT_TIE_FROM and free runs without the 1603
   stamp (tieRules 'night'), and matchRules 'base' (the engine before Round 1331) keeps it too.

   HOW. Two engines are bundled from this tree: HEAD as it is, and OLD, the same source with judgedByTie forced
   false, which is the engine before this round (the one function every reaction reads). Every Math.random draw
   is a stream keyed on the career, the week and the replay, set identically before each engine call, and
   Date.now is fixed, so the two engines see the same dice.

   1) Careers in lockstep (the byte identity). A fleet of seeded careers in clubs that reach the knockouts, in
      today's world and the three eras, plays its first season on HEAD and OLD side by side until the club is out
      of the Champions League or has won it. Every week the two saves and reports must be JSON equal, up to the
      first deciding second leg where the night and the tie differ; a career with no such leg is equal to the end
      of the window. Prints how many careers parted and at which week.
   2) The leg fleet. Every deciding second leg the walk meets is replayed from its own pre match save on
      DECIDING_LEG_REPLAYS further streams, through both engines. On every leg: the record is the night on both
      (log score and res, form, career totals, head to head, bracket, ratings), and `tie` is in the log exactly
      when the tie and the night differ. Where they agree the two saves carry the same board, morale and fans.
      Where they differ: the board moves the tie's way (the report's swing before the clamp, more through, less
      out, against OLD), the squad's morale moves the tie's way, and the fans' results term equals the term of
      OLD's save with that night counted as the tie, to the last digit. Floor: at least 30 differing legs.
      THE SIZES (review fix, 2026-10-30: the first version held only the signs, and a board check that let a leg at
      the 100 clamp through). Two observation lines go into HEAD and OLD alike and change nothing: the board's swing
      just before patience, the press and the level, and each man's result shift with the facts the captain's
      rules read. On every deciding leg the board's swing in HEAD's report is OLD's with the night's base swing
      (4, 0.5, -4.5) swapped for the tie's, through the same steps after it, to the tenth; and each man's shift is
      exactly the tie's (5 or -6, the captain's defeat relief of 1 for the men who played, never above zero, and
      his own lift of 1), where OLD's is exactly the night's. So a tie won after a lost night moves the board and
      the dressing room by exactly what the same tie won on the night does. The restated steps are checked against
      OLD's own numbers first, so a later change to them turns this red rather than passing quietly.
   3) The gate. Every leg pre-save of section 2 played with tieRules 'night', and again with matchRules 'base',
      must give HEAD exactly OLD's save and report. tieRulesOf answers 'night' for a daily the day before
      HOT_SEAT_TIE_FROM, nothing on it, nothing for a free run stamped 1603, 'night' for one without; startHotSeat
      writes it and handoverState takes it off; loadCareer drops it. HOT_SEAT_TIE_FROM is a real date after the
      round's base commit.
   4) Manager Hot Seat replays. Every daily from 2026-09-30 to the day before HOT_SEAT_TIE_FROM, and a set of
      unstamped free runs, played balanced with the first press answer to the verdict on HEAD and OLD: the same
      verdict, points, target, takeover and the whole match log. With DECIDING_LEG_BASE=<root of a checkout of
      the base commit> the same days are also played on that tree's own Hot Seat and must match HEAD. The days
      from the cutover to a week past it are played too and the runs that meet a deciding leg are counted.
   5) The haul words. haulLine names three a hat-trick, four "scored four" and five "scored five" on planted
      lines, and every haul of three or more the fleet's matches produce is announced by its own count.

   NEGATIVE CONTROLS (DECIDING_LEG_CONTROL=<name>; each rewrites one line of HEAD only, refuses to run when its
   line is not in the file exactly once, and must turn its own check red, exit 1, last line FIRED):
     board     the board's base swing reads the night again: section 2's board check goes red.
     morale    the dressing room's swing reads the night again: section 2's morale check goes red.
     fans      the fan meter reads `res` and ignores `tie`: section 2's fans check goes red.
     tieall    `tie` is written on every deciding second leg, the ones where night and tie agree too: section 1's
               identity goes red (and section 2's tie field).
     hattrick  every haul of three or more is a hat-trick again: section 5's planted lines go red.
     nogate    judgedByTie ignores tieRules and matchRules: section 3's gate goes red.
     cutover   HOT_SEAT_TIE_FROM moved to 2026-10-01, before the base commit: section 3's cutover goes red.
     boardsize  a tie won after a night not won gives the board +1 instead of +4: still more than the night gave,
               so every sign holds, and section 2's board size goes red.
     moralesize the same for the dressing room, +1 instead of +5: section 2's morale size goes red.
     relief    the captain's defeat relief reads the night again (a through leg lost on the night has its +5 cut
               to 0 for the men who played): section 2's morale size goes red.

   MEASURED on GitHub runners, 2026-10-30 (remote checks r1603-s2 and r1603-s3, head c21aed83c), 16 careers, 15 of
   them in the Champions League, 8 replays a leg. The fleet's own dice: 234 deciding legs, 80 where the night and the
   tie differ (65 through, 15 out, 8 on penalties, 2 in extra time). Three other streams (DECIDING_LEG_SALT a, b, c):
   64 of 180, 73 of 207, 75 of 243. So the floor of 30 sits under half the lowest count seen. Careers that parted
   from the old engine at a deciding leg: 4 to 8 of 15, between weeks 31 and 46. OLD equals the base tree
   (4bd20c993) at every week of every career; the only words that differ are a named haul (2 saves or reports).
   Manager Hot Seat: none of the 44 dailies (2026-09-30 to 2026-11-12) or the free runs met a second leg at all
   (a run is five league games from week 6 to 14, and the deciding legs sit later in the season), so the gate is
   held at the engine (section 3) as well as by the replays; the 2026-10-28 daily (PSG) has a four goal haul in its feed, which now
   reads "scored four" and nothing else about the day moves. Each control fired (exit 1, FIRED) on r1603-s2/s3.
   THE SIZES, measured on r1603-fx-a (head 7b9a693b9, 2026-10-30): on the fleet's own dice the board's swing held to
   the tenth on all 234 legs and 5715 men's shifts held exactly, 1933 of them on the 80 differing legs and 391 of
   those men who played under the captain on the losing side of night or tie (where his relief decides the number);
   salts a, b, c: 4311, 5022 and 5895 men, 559, 610 and 585 under the relief. The report's swing, before the clamp:
   through 5.02 above OLD on average (4.80 to 5.18 on the salts), out -8.39 (-7.10 to -8.20); the old clamped reading
   had shown +1.24 through, because a leg at 100 passed on the clamp. Controls boardsize, moralesize and relief each
   FIRED with only their own size check red (every sign check stayed green), board and morale FIRED on both.

   THE EUROPA LEAGUE (Release BV join, Round 1593's bind 3, 2026-10-31). Round 1593 plays a club's own Europa
   League from season two through the same second leg block, so a Europa League deciding leg is judged by the tie
   with no second copy of the logic. decidingLegAt now reads the 'uel' second leg too (the engine's own
   uelLegTonight, exported in HEAD and OLD alike by a probe line that changes nothing), and section 1 plays
   Europa League candidates (UEL_CAREERS) after the Champions League fleet: season one, the rollover on every
   engine, then season two to its last Europa League night, HEAD and OLD in lockstep as above, until one candidate
   meets a deciding second leg (check "careers: a Europa League career meets a deciding second leg"). Its legs join
   the leg fleet, the gate and the hauls like any other.

   Run: node scripts/simCmDecidingLeg.mjs   (DECIDING_LEG_CAREERS, DECIDING_LEG_UEL_CAREERS, DECIDING_LEG_REPLAYS,
   DECIDING_LEG_SECTION) */
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE_ROOT = process.env.DECIDING_LEG_BASE ? path.resolve(process.env.DECIDING_LEG_BASE) : '';
const CONTROL = process.env.DECIDING_LEG_CONTROL || '';
const SECTION = process.env.DECIDING_LEG_SECTION || '';
const REPLAYS = Number(process.env.DECIDING_LEG_REPLAYS || 8);
const LEG_FLOOR = 30;
/* The day the round's base commit (4bd20c993, origin/main) was made. */
const BASE_COMMIT_DATE = '2026-10-30';
const FIXED_NOW = 1793000000000;

const CM = 'clubManager.ts';
const METERS = 'clubManagerMeters.ts';
const HS = 'managerHotSeat.ts';
const JUDGE = "  return state.matchRules !== 'base' && state.tieRules !== 'night' && tie?.leg === 2 && typeof tie.through === 'boolean';";
const OLD_PATCH = [[CM, JUDGE, '  return false;']];
/* The engine's own constants, restated: the board's base swing and the dressing room's, by result. */
const BASE_SWING = { W: 4, D: 0.5, L: -4.5 };
const MORALE_SWING = { W: 5, D: -1, L: -6 };
const CONTROLS = {
  board: [[CM, '  let confDelta = reactWon ? 4 : reactDrawn ? 0.5 : -4.5;', '  let confDelta = won ? 4 : drawn ? 0.5 : -4.5;']],
  morale: [[CM, '  const moraleShift = reactWon ? 5 : reactDrawn ? -1 : -6;', '  const moraleShift = won ? 5 : drawn ? -1 : -6;']],
  fans: [[METERS, 'log.map(e => e && (e.tie ?? e.res))', 'log.map(e => e && e.res)']],
  tieall: [[CM, "    ...(reactWon !== won || reactDrawn !== drawn ? { tie: reactWon ? 'W' as const : 'L' as const } : {}),", "    ...(tieJudged ? { tie: reactWon ? 'W' as const : 'L' as const } : {}),"]],
  hattrick: [[CM, '  return count === 3 ? `⚽ ${name} bagged a hat-trick!` : `⚽ ${name} scored ${HAUL_WORDS[count] ?? count}!`;', '  return `⚽ ${name} bagged a hat-trick!`;']],
  nogate: [[CM, JUDGE, "  return tie?.leg === 2 && typeof tie.through === 'boolean';"]],
  cutover: [[HS, "export const HOT_SEAT_TIE_FROM = '2026-11-09';", "export const HOT_SEAT_TIE_FROM = '2026-10-01';"]],
  /* Review fix: three slips that keep every sign and break a size, so only section 2's size checks can see them. */
  boardsize: [[CM, '  let confDelta = reactWon ? 4 : reactDrawn ? 0.5 : -4.5;', '  let confDelta = reactWon ? (reactWon !== won ? 1 : 4) : reactDrawn ? 0.5 : -4.5;']],
  moralesize: [[CM, '  const moraleShift = reactWon ? 5 : reactDrawn ? -1 : -6;', '  const moraleShift = reactWon ? (reactWon !== won ? 1 : 5) : reactDrawn ? -1 : -6;']],
  relief: [[CM, '    if (captainPlayed && !reactWon && !reactDrawn && xiIdSet.has(p.id)) shift = Math.min(0, shift + CAPTAIN_DEFEAT_RELIEF);', '    if (captainPlayed && !won && !drawn && xiIdSet.has(p.id)) shift = Math.min(0, shift + CAPTAIN_DEFEAT_RELIEF);']],
};
/* Which section's check each control must turn red, and the sections it needs. */
const CONTROL_CHECK = { board: 'legs: board', morale: 'legs: morale', fans: 'legs: fans', tieall: 'careers: identity', hattrick: 'hauls: planted', nogate: 'gate: night', cutover: 'gate: cutover', boardsize: 'legs: board size', moralesize: 'legs: morale size', relief: 'legs: morale size' };
/* Review fix: two observation lines, put into HEAD and OLD alike, that change nothing the engine does. One reads
   the board's swing just before patience, the press and the level; the other reads each man's result shift with the
   facts the captain's rules read. Section 2 then holds the SIZE of both reactions, not only their sign. Each anchor
   must be in the file exactly once, or the bundle aborts (exit 2). */
const PATIENCE_LINE = '  const patience = club.tier === 1 ? 1.3 : club.tier === 2 ? 1.15 : club.tier === 3 ? 1 : 0.85;';
const LIFT_LINE = '    if (captainPlayed && p.id === captainId) shift += CAPTAIN_MATCH_LIFT;';
/* Release BV join (Round 1593's bind 3): the engine's own reading of a Europa League night of mine (leg 1, leg 2
   or neither), exported in HEAD and OLD alike so decidingLegAt reads the 'uel' second leg the way the whistle does. */
const UEL_LEG_LINE = 'function uelLegTonight(state: CareerState, entry: CalendarEntry): 0 | 1 | 2 {';
const PROBES = [
  [CM, PATIENCE_LINE, `${PATIENCE_LINE} globalThis.__dlBoard?.push([confDelta, patience, state.press ? pressPatience(state.press.mood) : 1]);`],
  [CM, LIFT_LINE, `${LIFT_LINE} globalThis.__dlMorale?.push([p.id, shift, xiIdSet.has(p.id), captainPlayed, p.id === captainId]);`],
  [CM, UEL_LEG_LINE, `export ${UEL_LEG_LINE}`],
];
/* The control's own check must go red; these go red beside it and are printed. */
if (CONTROL && !CONTROLS[CONTROL]) {
  console.log(`simCmDecidingLeg: ABORT, DECIDING_LEG_CONTROL=${CONTROL} is not one of ${Object.keys(CONTROLS).join(', ')}`);
  process.exit(2);
}
const abort = why => { console.log(`simCmDecidingLeg: ABORT, ${why}`); process.exit(2); };

/* ---------- the engines ---------- */
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'deciding-leg-'));
async function bundle(name, root, patches) {
  const entry = path.join(work, `${name}.entry.ts`);
  const P = f => JSON.stringify(path.join(root, f).split(path.sep).join('/'));
  fs.writeFileSync(entry, `export * as cm from ${P('src/lib/clubManager.ts')};\nexport * as meters from ${P('src/lib/clubManagerMeters.ts')};\nexport * as hs from ${P('src/lib/managerHotSeat.ts')};\nexport * as diff from ${P('src/lib/clubManagerDifficulty.ts')};\n`);
  const out = path.join(work, `${name}.cjs`);
  const used = patches.map(() => false);
  const plugin = {
    name: 'deciding-leg',
    setup(b) {
      if (!patches.length) return;
      b.onLoad({ filter: /(clubManager|clubManagerMeters|managerHotSeat)\.ts$/ }, async args => {
        const file = args.path.split(path.sep).join('/');
        const mine = patches.map((p, i) => [p, i]).filter(([p]) => file.endsWith(`/src/lib/${p[0]}`));
        if (!mine.length) return undefined;
        let src = (await fs.promises.readFile(args.path, 'utf8')).split('\r\n').join('\n');
        for (const [[f, from, to], i] of mine) {
          const n = src.split(from).length - 1;
          if (n !== 1) abort(`${name}: the line to rewrite is in ${f} ${n} times, it must be exactly once: ${from.trim()}`);
          src = src.replace(from, () => to);
          used[i] = true;
        }
        return { contents: src, loader: 'ts' };
      });
    },
  };
  await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'cjs', outfile: out, logLevel: 'silent', alias: { '@': path.join(root, 'src') }, plugins: [plugin] });
  if (used.some(u => !u)) abort(`${name}: a rewrite never found its file`);
  return out;
}
const store = new Map();
globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear(), key: i => [...store.keys()][i] ?? null, get length() { return store.size; } };
Date.now = () => FIXED_NOW;
const req = createRequire(import.meta.url);
/** A fresh module instance of a bundle (a copy under its own name, so two instances never share counters). */
let copies = 0;
function load(file) {
  const copy = file.replace(/\.cjs$/, `.${copies++}.cjs`);
  fs.copyFileSync(file, copy);
  const m = req(copy);
  /* Out of the cache at once, so an instance nobody holds any more is collected. */
  delete req.cache[req.resolve(copy)];
  fs.unlinkSync(copy);
  return m;
}
const headFile = await bundle('head', ROOT, [...PROBES, ...(CONTROL ? CONTROLS[CONTROL] : [])]);
const oldFile = await bundle('old', ROOT, [...OLD_PATCH, ...PROBES]);
const baseFile = BASE_ROOT ? await bundle('base', BASE_ROOT, []) : null;

/* ---------- dice ---------- */
/* DECIDING_LEG_SALT walks the whole fleet on other dice, for measuring the floor's headroom on purpose. */
const SALT = process.env.DECIDING_LEG_SALT || '';
function keyOf(...parts) {
  let h = 2166136261 >>> 0;
  for (const ch of [SALT, ...parts].join('|')) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}
function withStream(seed, fn) {
  let a = seed | 0;
  const prev = Math.random;
  Math.random = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  try { return fn(); } finally { Math.random = prev; }
}
const clone = v => structuredClone(v);
const J = v => JSON.stringify(v);
/* The base tree called every haul of three or more a hat-trick. That line is the one other thing this round
   changes on purpose, so a comparison with the base tree reads a named haul as the old words, and nothing else. */
const HAUL_NAMED = /⚽ ([^"!]+?) scored (four|five|six|seven|eight|[0-9]+)!/g;
const asBaseWords = s => s.replace(HAUL_NAMED, (_, name) => `⚽ ${name} bagged a hat-trick!`);
let namedHauls = 0;
const baseJ = v => { const s = J(v); const t = asBaseWords(s); if (t !== s) namedHauls += 1; return t; };

/* ---------- checks ---------- */
const checks = [];
function check(name, ok, detail = '') {
  checks.push({ name, ok: !!ok });
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ` (${detail})` : ''}`);
}
const run = s => !SECTION || SECTION.split(',').includes(s);
async function fresh(file) {
  const m = load(file);
  await m.cm.ensureAllEraRosters();
  return m;
}

/* ---------- the career fleet ---------- */
const CAREERS = [
  ['Real Madrid', 'now'], ['Bayern Munich', 'now'], ['Manchester City', 'now'], ['Liverpool', 'now'], ['Arsenal', 'now'],
  ['Inter Milan', 'now'], ['Barcelona', 'now'], ['Barcelona', 'era2005'], ['Chelsea', 'era2005'], ['Real Madrid', 'era2010'],
  ['Bayern Munich', 'era2010'], ['Barcelona', 'era2015'], ['Juventus', 'era2015'], ['Liverpool', 'era2020'],
  ['Bayern Munich', 'era2020'], ['Chelsea', 'era2020'],
];
const FLEET = CAREERS.slice(0, Number(process.env.DECIDING_LEG_CAREERS || CAREERS.length));
/* Release BV join (Round 1593's bind 3): Europa League careers. A club earns its place in season one and plays the
   competition from season two, so a candidate plays season one, the rollover and season two to its last Europa
   League night. Candidates are tried in this order until one meets a deciding second leg; the rest are not played.
   Every name is a club of PLAY_FLEET_ALL in scripts/simCmEuroPlay.mjs (today's world, not a Champions League club). */
const UEL_CAREERS = [['Aston Villa', 'now'], ['Real Betis', 'now'], ['Lazio', 'now'], ['Eintracht Frankfurt', 'now'],
  ['Lyon', 'now'], ['Real Sociedad', 'now'], ['Braga', 'now'], ['AZ Alkmaar', 'now']];
const UEL_FLEET = UEL_CAREERS.slice(0, Number(process.env.DECIDING_LEG_UEL_CAREERS ?? UEL_CAREERS.length));
const OPTS = { skipHalftime: true };
const step = (m, s, seed) => withStream(seed, () => m.cm.playNextEntry(clone(s), OPTS));
function decidingLegAt(m, s) {
  const e = s.calendar?.[s.week];
  if (e?.type === 'uel') return m.cm.uelLegTonight(s, e) === 2;
  return !!e && e.type === 'uclKo' && e.uclLeg === 2 && m.cm.uclLegsFor(s.eraId, e.uclRound) === 2 && s.uclKoRound === e.uclRound;
}
const legRound = s => (s.calendar[s.week]?.type === 'uel' ? 'uel' : s.calendar[s.week]?.uclRound);
/* A Europa League career's window: season two's last Europa League night played (or the sack). */
function uelWindowOver(s, seasonNo) {
  if (s.sacked) return true;
  if (seasonNo < 2) return false;
  const lastUel = (s.calendar ?? []).reduce((m, e, i) => (e.type === 'uel' ? i : m), -1);
  return s.week > lastUel;
}
/* finishSeason and startNextSeason on their own keyed streams, the same for every engine. */
function rollover(m, s, tag) {
  const f = withStream(keyOf(tag, 'finish'), () => m.cm.finishSeason(clone(s)));
  return withStream(keyOf(tag, 'rollover'), () => m.cm.startNextSeason(f.state));
}
function legOf(report) {
  const t = report?.tie;
  if (!t || t.leg !== 2 || typeof t.through !== 'boolean') return null;
  const night = report.won ? 'W' : report.drawn ? 'D' : 'L';
  const tie = t.through ? 'W' : 'L';
  return { night, tie, differ: night !== tie, how: report.decidedBy };
}
function windowOver(s) {
  if (s.sacked || s.uclKoRound === 'out' || s.uclKoRound === 'won') return true;
  const cal = s.calendar ?? [];
  const lastKo = cal.reduce((m, e, i) => (e.type === 'uclKo' ? i : m), -1);
  const lastGroup = cal.reduce((m, e, i) => (e.type === 'uclGroup' ? i : m), -1);
  return s.week > lastKo || (s.week > lastGroup && s.uclKoRound === null);
}
const legPre = [];
const hauls = { lines: 0, three: 0, more: 0, bad: [] };
function scanHauls(m, report) {
  if (!report) return;
  const tally = new Map();
  for (const sc of report.myScorers ?? []) if (!sc.og) tally.set(sc.name, (tally.get(sc.name) ?? 0) + 1);
  for (const [name, n] of tally) {
    if (n < 3) continue;
    hauls.lines += 1;
    if (n === 3) hauls.three += 1; else hauls.more += 1;
    const want = m.cm.haulLine(name, n);
    if (!report.events.includes(want)) hauls.bad.push(`${name} scored ${n}, no "${want}"`);
    if (n !== 3 && report.events.includes(`⚽ ${name} bagged a hat-trick!`)) hauls.bad.push(`${name} scored ${n} and was given a hat-trick`);
  }
}
if (run('careers') || run('legs') || run('gate') || run('hauls')) {
  console.log(`1) careers in lockstep, HEAD against OLD${baseFile ? ' and OLD against the base tree' : ''} (${FLEET.length} careers)`);
  const identityBad = [];
  const baseBad = [];
  const parted = [];
  let inUcl = 0;
  let uelSeasons = 0;
  let uelTotal = 0;
  const uelTried = [];
  const uelDisagree = [];
  for (const [club, era, kind] of [...FLEET.map(c => [...c, 'ucl']), ...UEL_FLEET.map(c => [...c, 'uel'])]) {
    const tag = `${club} ${era}`;
    const H = await fresh(headFile);
    const O = await fresh(oldFile);
    const B = baseFile ? await fresh(baseFile) : null;
    const seed0 = keyOf(tag, 'start');
    let sH = withStream(seed0, () => H.cm.startCareer(club, era));
    let sO = withStream(seed0, () => O.cm.startCareer(club, era));
    let sB = B ? withStream(seed0, () => B.cm.startCareer(club, era)) : null;
    if (J(sH) !== J(sO)) identityBad.push(`${tag} at the start`);
    if (B && J(sB) !== J(sO)) baseBad.push(`${tag} at the start`);
    if (kind === 'ucl' && sH.uclGroup === null) { console.log(`   ${tag}: not in the Champions League, skipped`); continue; }
    if (kind === 'ucl') inUcl += 1;
    let split = null;
    let guard = 0;
    let seasonNo = 1;
    let uelLegs = 0;
    let uelNights = 0;
    const over = s => (kind === 'uel' ? uelWindowOver(s, seasonNo) : windowOver(s));
    while (!over(sH) && guard++ < (kind === 'uel' ? 400 : 160)) {
      const seed = keyOf(tag, sH.season, sH.week);
      const atLeg = decidingLegAt(H, sH);
      const pre = atLeg ? clone(sH) : null;
      const rH = step(H, sH, seed);
      if (atLeg && kind === 'uel') uelLegs += 1;
      if (kind === 'uel' && sH.calendar[sH.week]?.type === 'uel') {
        /* decidingLegAt must agree with what the whistle judged: a report with tie.leg 2 and through set. */
        const judged = rH.report?.tie?.leg === 2 && typeof rH.report.tie.through === 'boolean';
        if (judged !== atLeg) uelDisagree.push(`${tag} week ${sH.week}: decidingLegAt ${atLeg}, the report ${judged ? 'judged a deciding leg' : 'judged none'}`);
        if (rH.report) uelNights += 1;
      }
      if (atLeg) legPre.push({ tag, week: sH.week, round: legRound(sH), pre, seed, walk: legOf(rH.report) });
      scanHauls(H, rH.report);
      if (!split || B) {
        const rO = step(O, sO, seed);
        if (B) {
          const rB = step(B, sB, seed);
          if (J(rB.state) !== baseJ(rO.state) || J(rB.report ?? null) !== baseJ(rO.report ?? null)) baseBad.push(`${tag} week ${sO.week}`);
          sB = rB.state;
        }
        if (!split) {
          const leg = legOf(rH.report);
          const same = J(rH.state) === J(rO.state) && J(rH.report ?? null) === J(rO.report ?? null);
          if (leg?.differ) split = { week: sH.week, round: legRound(sH), leg };
          else if (!same) { identityBad.push(`${tag} week ${sH.week} (${sH.calendar[sH.week]?.type})`); split = { week: sH.week, broken: true }; }
        }
        sO = rO.state;
      }
      sH = rH.state;
      if (rH.kind === 'seasonOver') {
        if (kind !== 'uel' || seasonNo >= 2 || sH.sacked) break;
        /* A Europa League candidate: season one is over, so the rollover on every engine, then season two. */
        seasonNo = 2;
        sH = rollover(H, sH, tag);
        if (!split || B) {
          const nO = rollover(O, sO, tag);
          if (B) {
            sB = rollover(B, sB, tag);
            if (J(sB) !== baseJ(nO)) baseBad.push(`${tag} at the rollover`);
          }
          if (!split && J(sH) !== J(nO)) { identityBad.push(`${tag} at the rollover`); split = { week: sH.week, broken: true }; }
          sO = nO;
        }
        if (!H.cm.uelParticipant(sH)) break;
      }
    }
    if (split && !split.broken) parted.push(`${tag} week ${split.week} (${split.round}, night ${split.leg.night}, tie ${split.leg.tie}, ${split.leg.how})`);
    if (kind === 'uel') {
      const played = seasonNo >= 2 && H.cm.uelParticipant(sH);
      uelTried.push(`${tag}: ${played ? `in the Europa League in season two, ${uelNights} nights played, ${uelLegs} deciding second legs` : (sH.sacked ? 'sacked' : 'no Europa League place in season two')}`);
      if (played) uelSeasons += 1;
      uelTotal += uelLegs;
      console.log(`   ${tag} (Europa League candidate): ${split ? (split.broken ? 'BROKE' : `parted at week ${split.week}`) : `equal to week ${sH.week}`}; ${uelTried.at(-1)}`);
      continue;
    }
    console.log(`   ${tag}: ${split ? (split.broken ? 'BROKE' : `parted at week ${split.week}`) : `equal to week ${sH.week}`}; Champions League ${sH.uclKoRound ?? 'group'}`);
  }
  console.log(`   ${inUcl} careers in the Champions League, ${parted.length} parted at a deciding leg: ${parted.join('; ') || 'none'}`);
  check('careers: identity (HEAD equals OLD to the first deciding leg where night and tie differ)', identityBad.length === 0 && inUcl >= 8, identityBad.slice(0, 3).join('; ') || `${inUcl} careers`);
  if (UEL_FLEET.length) check('careers: the Europa League careers meet a deciding second leg (Round 1593, the Release BV join)', uelTotal >= 1, `${uelTotal} deciding second legs in ${uelSeasons} Europa League seasons of ${UEL_FLEET.length} candidates`);
  if (UEL_FLEET.length) check('careers: decidingLegAt agrees with the whistle on every Europa League night', uelDisagree.length === 0, uelDisagree.slice(0, 3).join('; ') || `${uelSeasons} seasons`);
  if (baseFile) check('careers: OLD is the base tree, week for week over the whole window (a named haul read as the old words)', baseBad.length === 0, baseBad.slice(0, 3).join('; ') || `${namedHauls} saves or reports carried a named haul`);
  console.log(`   ${legPre.length} deciding second legs met (${legPre.filter(l => l.walk?.differ).length} differing on the walk's own dice)`);
}

/* ---------- 2. the leg fleet ---------- */
const recordOf = r => {
  const log = (r.state.resultLog ?? []).map(e => { const { tie, ...rest } = e; return rest; });
  const p = r.report;
  return J([log, r.state.form, r.state.careerStats, r.state.h2h, r.state.uclBracket, r.state.uclKoRound,
    p.won, p.drawn, p.homeGoals, p.awayGoals, p.tie, p.decidedBy, p.shootoutWon ?? null, p.detail?.myRatings ?? null]);
};
const moraleGap = (a, b) => {
  const was = new Map(b.squad.map(p => [p.id, p.morale]));
  const d = a.squad.filter(p => was.has(p.id)).map(p => p.morale - was.get(p.id));
  return d.length ? d.reduce((x, y) => x + y, 0) / d.length : 0;
};
/* The board's steps after the base swing, restated from playMyMatch: patience and then the press, both only on the
   way down, then the level (boardSwing). Unrounded; the engine rounds to a tenth. Checked against OLD's own report
   on every leg before it is trusted, so a later change to those steps turns this red instead of passing quietly. */
const boardAfter = (m, st, x, pat, press) => { let y = x; if (y < 0) y *= pat; if (y < 0) y *= press; return m.diff.boardSwing(st, y); };
/* One man's result shift, restated: the swing, the captain's defeat relief (the men who played, never above zero)
   and his own lift. */
const shiftOf = (res, xi, capPlayed, isCap) => {
  let s = MORALE_SWING[res];
  if (capPlayed && res === 'L' && xi) s = Math.min(0, s + 1);
  if (capPlayed && isCap) s += 1;
  return s;
};
/* A step with the two observation lines switched on. */
function observed(m, pre, sd) {
  globalThis.__dlBoard = [];
  globalThis.__dlMorale = [];
  try {
    const r = step(m, pre, sd);
    return { r, board: globalThis.__dlBoard, morale: globalThis.__dlMorale };
  } finally {
    delete globalThis.__dlBoard;
    delete globalThis.__dlMorale;
  }
}
const TENTH = 0.05 + 1e-9;
/* The board's size on one leg: HEAD's unclamped swing is OLD's with the night's base swing taken out and the tie's
   put in, through the same steps after it. Returns '' when it holds. */
function boardSizeWrong(H, O, oH, oO, leg) {
  if (oH.board.length !== 1 || oO.board.length !== 1) return `the board line ran ${oH.board.length} and ${oO.board.length} times`;
  const [xO, patO, prO] = oO.board[0];
  const [xH, patH, prH] = oH.board[0];
  const cO = oO.r.report.confidenceDelta;
  const cH = oH.r.report.confidenceDelta;
  if (!(Math.abs(cO - boardAfter(O, oO.r.state, xO, patO, prO)) <= TENTH)) return `the restated steps do not give OLD's own swing ${cO}, so the harness is stale`;
  const x = xO - BASE_SWING[leg.night] + BASE_SWING[leg.tie];
  const want = boardAfter(H, oH.r.state, x, patO, prO);
  if (patH !== patO || prH !== prO) return `patience ${patH} and ${patO}, press ${prH} and ${prO}`;
  if (!(Math.abs(xH - x) <= 1e-9) || !(Math.abs(cH - want) <= TENTH)) return `night ${leg.night}, tie ${leg.tie}: swing ${cH} before the clamp, the tie on the night gives ${want.toFixed(2)} (old ${cO})`;
  return '';
}
if (run('legs') || run('careers')) {
  console.log(`2) the leg fleet: every deciding leg replayed on ${REPLAYS} more streams through both engines`);
  const H = await fresh(headFile);
  const O = await fresh(oldFile);
  const fansOf = st => H.meters.fanTerms(st).results;
  const n = { legs: 0, differ: 0, agree: 0, pens: 0, aet: 0, through: 0, out: 0 };
  const bad = { record: [], tie: [], agree: [], board: [], morale: [], fans: [], boardSize: [], moraleSize: [] };
  const sum = { boardThrough: 0, boardOut: 0, moraleThrough: 0, moraleOut: 0 };
  const size = { men: 0, menDiffer: 0, relief: 0 };
  for (const L of legPre) {
    const seeds = [L.seed, ...Array.from({ length: REPLAYS }, (_, k) => keyOf(L.seed, 'replay', k))];
    for (const sd of seeds) {
      const oH = observed(H, L.pre, sd);
      const oO = observed(O, L.pre, sd);
      const rH = oH.r;
      const rO = oO.r;
      const leg = legOf(rH.report);
      if (!leg) continue;
      n.legs += 1;
      const tag = `${L.tag} ${L.round} week ${L.week} stream ${sd}`;
      if (recordOf(rH) !== recordOf(rO)) bad.record.push(tag);
      const last = rH.state.resultLog.at(-1);
      if (leg.differ ? last.tie !== leg.tie : 'tie' in last) bad.tie.push(`${tag}: night ${leg.night}, tie ${leg.tie}, logged ${last.tie ?? 'nothing'}`);
      /* The sizes, on every deciding leg (where night and tie agree the tie's reading IS the night's). */
      const boardWrong = boardSizeWrong(H, O, oH, oO, leg);
      if (boardWrong) bad.boardSize.push(`${tag}: ${boardWrong}`);
      if (oH.morale.length !== oO.morale.length || !oH.morale.length) bad.moraleSize.push(`${tag}: the shift line ran ${oH.morale.length} and ${oO.morale.length} times`);
      else {
        for (let i = 0; i < oH.morale.length; i++) {
          const [id, sH, xi, cap, isCap] = oH.morale[i];
          const [idO, sO, xiO, capO, isCapO] = oO.morale[i];
          if (id !== idO || xi !== xiO || cap !== capO || isCap !== isCapO) { bad.moraleSize.push(`${tag}: the two squads differ at man ${i}`); break; }
          size.men += 1;
          if (leg.differ) size.menDiffer += 1;
          if (leg.differ && cap && xi && (leg.night === 'L' || leg.tie === 'L')) size.relief += 1;
          const wantO = shiftOf(leg.night, xi, cap, isCap);
          const wantH = shiftOf(leg.tie, xi, cap, isCap);
          if (sO !== wantO) { bad.moraleSize.push(`${tag}: OLD's shift ${sO} is not the night's ${wantO}, so the harness is stale`); break; }
          if (sH !== wantH) { bad.moraleSize.push(`${tag}: night ${leg.night}, tie ${leg.tie}, ${id}${xi ? ' played' : ''}${cap ? ', captain on' : ''}${isCap ? ', the captain' : ''}: shift ${sH}, the tie on the night gives ${wantH}`); break; }
        }
      }
      if (!leg.differ) {
        n.agree += 1;
        if (rH.state.boardConfidence !== rO.state.boardConfidence || moraleGap(rH.state, rO.state) !== 0 || fansOf(rH.state) !== fansOf(rO.state)) bad.agree.push(tag);
        continue;
      }
      n.differ += 1;
      if (leg.how === 'pens') n.pens += 1;
      if (leg.how === 'aet') n.aet += 1;
      const through = leg.tie === 'W';
      if (through) n.through += 1; else n.out += 1;
      /* The board's swing as the report gives it, before the clamp at 0 and 100, so a leg at the clamp cannot pass
         on the clamp alone (review fix: the old check read the clamped confidence and let 100 and 0 through). */
      const dB = rH.report.confidenceDelta - rO.report.confidenceDelta;
      const dM = moraleGap(rH.state, rO.state);
      if (through) { sum.boardThrough += dB; sum.moraleThrough += dM; } else { sum.boardOut += dB; sum.moraleOut += dM; }
      const boardOk = through ? dB > 0 : dB < 0;
      if (!boardOk) bad.board.push(`${tag}: night ${leg.night}, tie ${leg.tie}, swing ${rO.report.confidenceDelta} to ${rH.report.confidenceDelta}`);
      if (through ? !(dM > 0) : !(dM < 0)) bad.morale.push(`${tag}: night ${leg.night}, tie ${leg.tie}, morale moved ${dM.toFixed(2)}`);
      const asTie = clone(rO.state);
      const e = asTie.resultLog.at(-1);
      e.res = leg.tie;
      delete e.tie;
      const got = fansOf(rH.state);
      const want = fansOf(asTie);
      if (!(Math.abs(got - want) < 1e-9) || got === fansOf(rO.state)) bad.fans.push(`${tag}: results term ${got} against ${want} (night ${fansOf(rO.state)})`);
    }
  }
  console.log(`   ${n.legs} deciding legs played: ${n.agree} where night and tie agree, ${n.differ} where they differ (${n.through} through, ${n.out} out; ${n.pens} on penalties, ${n.aet} in extra time)`);
  if (n.through) console.log(`   through: board swing ${(sum.boardThrough / n.through).toFixed(2)} and squad morale ${(sum.moraleThrough / n.through).toFixed(2)} above the old reading on average`);
  if (n.out) console.log(`   out: board swing ${(sum.boardOut / n.out).toFixed(2)} and squad morale ${(sum.moraleOut / n.out).toFixed(2)} against the old reading on average`);
  console.log(`   sizes: the board's swing held to the tenth on ${n.legs} legs; ${size.men} men's shifts held exactly (${size.menDiffer} on differing legs, ${size.relief} of them men who played under the captain on the losing side of night or tie, where his relief decides the number)`);
  check(`legs: at least ${LEG_FLOOR} deciding legs where the night and the tie differ`, n.differ >= LEG_FLOOR, `${n.differ}`);
  check('legs: the record is the night on both engines (log, form, totals, head to head, bracket, ratings)', bad.record.length === 0, bad.record.slice(0, 2).join('; '));
  check('legs: tie is logged exactly where the tie and the night differ', bad.tie.length === 0, bad.tie.slice(0, 2).join('; '));
  check('legs: where night and tie agree, board, morale and fans are the old engine\'s', bad.agree.length === 0, bad.agree.slice(0, 2).join('; '));
  check('legs: board moves the tie\'s way on every differing leg (the report\'s swing, before the clamp)', bad.board.length === 0 && n.differ > 0, bad.board.slice(0, 2).join('; '));
  check('legs: board size, on every deciding leg the swing is exactly what the same tie gives won or lost on the night (patience, press and level applied, to the tenth)', bad.boardSize.length === 0 && n.differ > 0, bad.boardSize.slice(0, 2).join('; '));
  check('legs: morale moves the tie\'s way on every differing leg', bad.morale.length === 0 && n.differ > 0, bad.morale.slice(0, 2).join('; '));
  check('legs: morale size, on every deciding leg each man\'s shift is exactly the tie\'s (the captain\'s relief and lift included)', bad.moraleSize.length === 0 && size.menDiffer > 0 && size.relief > 0, bad.moraleSize.slice(0, 2).join('; ') || `${size.men} men, ${size.relief} under the captain's relief`);
  check('legs: fans count the tie, to the last digit, on every differing leg', bad.fans.length === 0 && n.differ > 0, bad.fans.slice(0, 2).join('; '));
}

/* ---------- 3. the gate ---------- */
if (run('gate') || run('careers')) {
  console.log('3) the gate: the night\'s reading for a Hot Seat run that plays it, the date, the stamp, the save');
  /* A fresh pair of engines for every pre-save, so the counters behind message ids start level on both. */
  const pick = [...legPre.filter(l => l.walk?.differ).slice(0, 8), ...legPre.filter(l => l.walk && !l.walk.differ).slice(0, 4)];
  const bad = { night: [], base: [] };
  let differing = 0;
  for (const L of pick) {
    if (L.walk.differ) differing += 1;
    const H = await fresh(headFile);
    const O = await fresh(oldFile);
    for (const mode of ['night', 'base']) {
      const p = clone(L.pre);
      if (mode === 'night') p.tieRules = 'night'; else p.matchRules = 'base';
      const rH = step(H, p, L.seed);
      const rO = step(O, p, L.seed);
      if (J(rH.state) !== J(rO.state) || J(rH.report) !== J(rO.report)) bad[mode].push(`${L.tag} ${L.round} week ${L.week}`);
    }
  }
  console.log(`   ${pick.length} leg pre-saves played on the old reading, ${differing} of them legs where the night and the tie differ`);
  check('gate: night, tieRules \'night\' plays the old engine byte for byte', bad.night.length === 0 && differing > 0, bad.night.slice(0, 2).join('; ') || `${pick.length} legs`);
  check('gate: base, matchRules \'base\' plays the old engine byte for byte', bad.base.length === 0 && differing > 0, bad.base.slice(0, 2).join('; ') || `${pick.length} legs`);
  const H = await fresh(headFile);
  const from = H.hs.HOT_SEAT_TIE_FROM;
  const real = typeof from === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(from) && !Number.isNaN(Date.parse(from));
  check('gate: cutover, HOT_SEAT_TIE_FROM is a real date after the round\'s base commit', real && from > BASE_COMMIT_DATE, `${from}, base ${BASE_COMMIT_DATE}`);
  const dayBefore = real ? new Date(Date.parse(from) - 86400000).toISOString().slice(0, 10) : '2026-01-01';
  const table = [
    [{ club: 'x', seed: 1, daily: dayBefore }, 'night'], [{ club: 'x', seed: 1, daily: from }, undefined],
    [{ club: 'x', seed: 1, rules: 1331, tie: 1603 }, undefined], [{ club: 'x', seed: 1, rules: 1331 }, 'night'], [{ club: 'x', seed: 1 }, 'night'],
  ];
  const wrong = table.filter(([s, want]) => H.hs.tieRulesOf(s) !== want).map(([s]) => J(s));
  check('gate: tieRulesOf answers by the date for a daily and by the 1603 stamp for a free run', wrong.length === 0, wrong.join('; '));
  const before = H.hs.dailyHotSeat(dayBefore);
  store.clear();
  const runBefore = H.hs.startHotSeat({ club: before.club, seed: before.seed, daily: dayBefore });
  const after = H.hs.dailyHotSeat(from);
  store.clear();
  const runAfter = H.hs.startHotSeat({ club: after.club, seed: after.seed, daily: from });
  check('gate: startHotSeat writes the night\'s reading before the cutover and nothing from it on', runBefore.state.tieRules === 'night' && !('tieRules' in runAfter.state));
  check('gate: handoverState takes it off', !('tieRules' in H.hs.handoverState(runBefore)));
  store.clear();
  const career = legPre[0]?.pre ?? runAfter.state;
  const saved = H.cm.saveCareer({ ...clone(career), tieRules: 'night' });
  const loaded = H.cm.loadCareer();
  check('gate: loadCareer drops it, so no Club Manager save plays it', saved && loaded && !('tieRules' in loaded), !saved ? 'did not save' : !loaded ? 'did not load' : 'tieRules' in loaded ? 'still there' : '');
}

/* ---------- 4. Manager Hot Seat replays ---------- */
function hotSeatDay(m, setup) {
  store.clear();
  let r = m.hs.startHotSeat(setup);
  let guard = 0;
  while (!r.verdict && guard++ < 40) r = m.hs.pendingPress(r) ? m.hs.answerHotSeatPress(r, 0) : m.hs.playHotSeatMatch(r, 'balanced', null);
  const legs = r.log.filter(x => /second leg/i.test(x.compLabel ?? '')).length;
  return { digest: J([r.takeover, r.target, r.log, r.verdict ? [r.verdict.kind, r.points] : null]), legs, verdict: r.verdict?.kind ?? 'none', points: r.points };
}
if (run('hotseat')) {
  console.log(`4) Manager Hot Seat: the days before the cutover replay as they did${baseFile ? ', on this tree and on the base tree' : ''}`);
  const probe = await fresh(headFile);
  const from = probe.hs.HOT_SEAT_TIE_FROM;
  const days = [];
  for (let t = Date.parse('2026-09-30'); ; t += 86400000) {
    const d = new Date(t).toISOString().slice(0, 10);
    if (d >= from && days.filter(x => x >= from).length >= 7) break;
    days.push(d);
  }
  const bad = [];
  const baseBad = [];
  const baseNamed = [];
  let legRuns = 0;
  let afterMoved = 0;
  const lines = [];
  for (const day of days) {
    const H = await fresh(headFile);
    const O = await fresh(oldFile);
    const setup = H.hs.dailyHotSeat(day);
    const s = { club: setup.club, seed: setup.seed, daily: day };
    const h = hotSeatDay(H, s);
    const o = hotSeatDay(O, s);
    if (h.legs) legRuns += 1;
    if (day < from) { if (h.digest !== o.digest) bad.push(`${day} ${setup.club}`); } else if (h.digest !== o.digest) afterMoved += 1;
    if (baseFile && day < from) {
      const B = await fresh(baseFile);
      if (hotSeatDay(B, s).digest !== asBaseWords(h.digest)) baseBad.push(`${day} ${setup.club}`);
      if (asBaseWords(h.digest) !== h.digest) baseNamed.push(`${day} ${setup.club}`);
    }
    lines.push(`${day} ${setup.club} ${h.verdict} ${h.points}`);
  }
  const frees = [['Everton', 11], ['Celtic', 22], ['Ajax', 33], ['Benfica', 44], ['Club Brugge', 55], ['Napoli', 66]];
  let freeBad = 0;
  let freePlayed = 0;
  for (const [club, seed] of frees) {
    const H = await fresh(headFile);
    const O = await fresh(oldFile);
    const s = { club, seed, rules: 1331 };
    let h;
    try { h = hotSeatDay(H, s); } catch { continue; }
    const o = hotSeatDay(O, s);
    freePlayed += 1;
    if (h.legs) legRuns += 1;
    if (h.digest !== o.digest) freeBad += 1;
  }
  console.log(`   ${days.length} dailies (${days.filter(d => d < from).length} before ${from}) and ${freePlayed} of ${frees.length} unstamped free runs (a club outside the pool is skipped); ${legRuns} of the runs met a second leg at all; ${afterMoved} days from the cutover on moved`);
  console.log(`   ${lines.slice(0, 4).join('; ')} ...`);
  check('hotseat: every daily before the cutover replays the same verdict, points, target, takeover and log', bad.length === 0, bad.slice(0, 3).join('; ') || `${days.filter(d => d < from).length} days`);
  check('hotseat: every unstamped free run replays as it did', freeBad === 0, `${freeBad} moved`);
  if (baseFile) check('hotseat: the base tree deals and plays every day before the cutover the same way (a named haul read as the old words)', baseBad.length === 0, baseBad.slice(0, 3).join('; ') || `days whose feed names a haul: ${baseNamed.join(', ') || 'none'}`);
}

/* ---------- 5. the haul words ---------- */
if (run('hauls') || run('careers')) {
  console.log('5) the haul words');
  const H = await fresh(headFile);
  const planted = [[3, '⚽ Planted Striker bagged a hat-trick!'], [4, '⚽ Planted Striker scored four!'], [5, '⚽ Planted Striker scored five!'], [2, null]];
  const wrong = planted.filter(([n, want]) => H.cm.haulLine('Planted Striker', n) !== want).map(([n]) => `${n}: ${H.cm.haulLine('Planted Striker', n)}`);
  check('hauls: planted lines, three a hat-trick, four and five by their count, two nothing', wrong.length === 0, wrong.join('; '));
  console.log(`   the fleet's matches scored ${hauls.lines} hauls of three or more (${hauls.three} of three, ${hauls.more} of four or more)`);
  check('hauls: every haul the fleet scored is announced by its own count', hauls.bad.length === 0, hauls.bad.slice(0, 2).join('; '));
}

/* ---------- verdict ---------- */
const red = checks.filter(c => !c.ok);
if (CONTROL) {
  const want = CONTROL_CHECK[CONTROL];
  const fired = red.some(c => c.name.startsWith(want));
  console.log(fired
    ? `simCmDecidingLeg: control ${CONTROL} FIRED (${want} went red; red in all: ${red.map(c => c.name.split(',')[0]).join(' | ')})`
    : `simCmDecidingLeg: control ${CONTROL} DID NOT FIRE (${want} stayed green)`);
  process.exit(fired ? 1 : 0);
}
if (checks.length === 0) abort('no check ran');
console.log(red.length
  ? `simCmDecidingLeg: FAIL, ${red.length} of ${checks.length} checks red (${red.map(c => c.name.split(':')[0]).join(', ')})`
  : `simCmDecidingLeg: PASS, ${checks.length} of ${checks.length} checks green. A deciding second leg is judged by the tie, the record keeps the night, Hot Seat replays and hauls are counted.`);
process.exit(red.length ? 1 : 0);
