/* Club Manager: applying for a job yourself (Round 783).

   The feature is the other direction of the phone: the manager writes to a
   club, the club answers after two to five of his match days, and a yes gives
   him the choice of walking in now (the engine's mid season takeover) or at
   the start of next season (a move booked on the save, fired once at the
   rollover). The pure half is src/lib/clubManagerJobHunt.ts, the engine half
   is in src/lib/clubManager.ts (applyForJob, the weekly tick, the summer
   choice, the rollover) and src/lib/clubManagerCalendar.ts (joinClubNow).
   What this harness holds, measured by outcome through the real engine:

     1) the answer is the manager's to earn. Bases are real careers played to
        about week ten at clubs spread across the pyramid. Each base sends
        twenty applications, each from a copy carrying a different career
        record (seasons managed, trophies, title finishes, the fields the
        engine itself writes and the market reads), to targets spread across
        tier gaps, and plays on until the club answers. Acceptance must RISE
        with the manager's standing (Pearson r over the applications, floor).
        It must FALL with the gap in stature, measured PAIRED: the same
        manager with the same record, the same roll and the same wait writes
        once to a club at his own tier and once to a club above it, ten
        records per base, and the gap in yeses between the two arms has a
        floor. (Over the mixed applications the tier r is real but thin,
        -0.19 to -0.38 over nineteen runs, because the standing spread swamps
        it; a ceiling on it was a coin toss, so it is only reported.)
        It must RISE with how badly the target club's own season is going,
        also paired (Round 783 review): the same manager writes once to a
        club whose season is fine and once to a club of the SAME tier whose
        season is going badly, both arms on one seeded stream with the roll
        at 0, and the gap in the odds each club decided on has a floor. The
        trouble is read off the engine's own applicationInputFor, so an
        engine that stopped reading the table finds no struggling club and
        the pairs floor goes red.
        Every answer must land on exactly the match day the application fixed
        when it went out, inside two to five (hard), the inbox must carry the
        answer from the club's board with no quoted speech (hard), and neither
        answer may be the only one that ever happens (band).
     2) the limits hold (hard). One open application at a time; a no shuts
        that club's door for the rest of this season and the whole of next
        and opens it the season after; three applications a season and the
        fourth is refused; the count resets with the season. The cooldown is
        also held through the REAL rollover (finishSeason and startNextSeason,
        twice): shut the season after the no, open the season after that.
     3) a summer move fires exactly once (hard). A yes answered with the
        summer books the move, the board goes six points colder and the old
        board writes; the season is played out and the rollover moves the
        manager to that club EVEN WHEN the summary was tapped with a different
        offer, the booked move comes off the save, the clubs managed list
        grows, the old club's chair is filled, and the following rollover
        moves nobody. Both routes are exercised: the inbox option and the
        Manager panel call.
     4) joining now moves the manager that week (hard). The new club's season
        is opened in the save's world and played to the same share of the
        calendar, the manager's record, trophies, history, season and world
        year come across byte for byte, the old club gets a generated interim
        (and holds it in the dugout record when it shares the league), the
        board opens at the appointment's 62, the handover is stamped, and the
        joined career plays on. A same league target and a cross league
        target are both probed.
     5) an old save loads unchanged (hard). A save without the field opens,
        reads as nothing in flight, can apply, and a match played on it
        leaves the field absent. A save WITH an application in flight keeps
        it across a save and load.
     6) never promised to two clubs (hard, Round 783 review). Three arms per
        base played fifty of my matches with the form forced hot so the
        approach roll is live every week: nothing in flight (must draw
        approaches, floor), an application out and a summer move booked (must
        draw none). With an application out or a move booked a handshake is
        refused and the approach stays live, and with an approach live no
        application goes out.
     7) the season's end and the sack (hard, Round 783 review). An
        application goes out with exactly five league games left and is
        answered before the season ends, and is refused as late one game
        later. A yes left unanswered, and an application still pending when
        the season ends, lead the summary's offers and taking one moves the
        manager. Sacked with a summer move booked, the out of work screen
        offers the agreed club first and the job taken there, the agreed one
        or another, is the job the rollover gives, also on a save that never
        went through enterWilderness.

   Negative controls (house rule: prove the checks can fail), each a rewrite
   of a copy of src/lib/clubManagerJobHunt.ts that refuses to run if its
   anchor is not in the file. The copy is aliased over the module path, so
   the bundled engine itself reads the rewrite:
     CM_APPLICATIONS_CONTROL=deaf        STANDING_WEIGHT goes to zero, the club
       stops reading the manager's standing. Section 1's standing r must go red.
     CM_APPLICATIONS_CONTROL=tierblind   TIER_UP_WEIGHT and TIER_DOWN_WEIGHT go
       to zero, the club stops reading the gap in stature. Section 1's paired
       tier gap must go red.
     CM_APPLICATIONS_CONTROL=twice       consumeSummerMove stops clearing the
       booked move at the rollover. Section 3 must go red.
     CM_APPLICATIONS_CONTROL=nocooldown  applyRefusal stops reading cooldowns.
       Section 2 must go red.
     CM_APPLICATIONS_CONTROL=rollwipe    rollOverHunt drops every cooldown at
       the rollover. Section 2's real rollover check must go red.
     CM_APPLICATIONS_CONTROL=troubleblind TROUBLE_WEIGHT goes to zero. Section
       1's paired trouble gap must go red.
     CM_APPLICATIONS_CONTROL=courted     huntBusy always reads false and
       applyRefusal stops reading a live approach. Section 6 must go red.
     CM_APPLICATIONS_CONTROL=late        applyRefusal stops refusing the last
       league games. Section 7 must go red.
     CM_APPLICATIONS_CONTROL=lostyes     waitingYes forgets a yes at the
       season's end. Section 7 must go red.
     CM_APPLICATIONS_CONTROL=sackkeeps   dropOnSack keeps the hunt. Section 7
       must go red.

   Thresholds, measured 2026-10-01 (24 bases, 480 applications, about 220
   tier pairs and 240 trouble pairs a run) on this harness's own seed and
   SIM_SEED=1 to 7 for the fixed engine (eight runs, all green), and on its
   own seed and SIM_SEED=1, 2, 3 for the band controls:
     acceptance vs standing, r     fixed 0.398 to 0.509   deaf -0.056 to 0.050       floor 0.25
     paired tier gap, points       fixed 18.2 to 28.1     tierblind -1.8 to 3.7      floor 10
     accepted share, percent       fixed 63.3 to 67.9     deaf 36.7 to 41.3          band 12 to 75
     tier pairs answered           fixed 217 to 220                                  floor 100
     paired trouble gap, points    fixed 4.1 to 5.5       troubleblind 0.0 exactly   floor 3
       (sd about 0.4 over the eight runs, so the floor sits about four sd
       under the mean; the blind control is 0.0 by construction, both arms
       then decide on identical odds)
     trouble pairs answered        fixed 236 to 240                                  floor 100
     approaches in section 6's free arm  fixed 9 to 19, the other two arms 0 always  floor 3
     answers inside 2 to 5 matches fixed every one of 479 or 480 answered            hard
   The hard controls, own seed: twice 8 failures (section 3, all four
   probes), nocooldown 5 (section 2), rollwipe 2 (section 2), courted 26
   (section 6, every probe base, approaches drawn 18 with an application
   out and 13 with a move booked), late 2, lostyes 2, sackkeeps 3 (all
   section 7). Each control's own section goes red and nothing else does.
   The review's two engine mutations are caught too: a rollover in
   startNextSeason that wipes cooldowns (rollwipe's shape, and the vitest),
   and applicationInputFor never reading the table ('if (standing && false)'),
   which leaves 0 trouble pairs against the floor of 100.
   (The r vs tiers up that is now only reported read -0.192 to -0.307 over
   the same eight seeds, and -0.219 to -0.383 over eleven seeds at ten
   applications a base: nineteen runs, -0.192 the one that broke the old
   ceiling of -0.20.)

   Run: node scripts/simCmApplications.mjs
*/
/* Round 299: seeded stream, see scripts/lib/seedRandom.mjs. First import on purpose. */
import './lib/seedRandom.mjs';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_URL = ROOT.replaceAll('\\', '/');
const TMP = os.tmpdir().replaceAll('\\', '/');
const CONTROL = process.env.CM_APPLICATIONS_CONTROL || '';
const CONTROLS = ['deaf', 'tierblind', 'twice', 'nocooldown', 'rollwipe', 'troubleblind', 'courted', 'late', 'lostyes', 'sackkeeps'];
if (CONTROL && !CONTROLS.includes(CONTROL)) {
  console.error(`CM_APPLICATIONS_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(1);
}
const BASES = Math.max(4, Number(process.env.CM_APPLICATIONS_BASES) || 24);
const PER_BASE = 20;
/* Section 1's paired trouble check and section 6's approach counts: floors
   set from the measurements in the header. */
const TROUBLE_PAIRS_FLOOR = 100;
const TROUBLE_GAP_FLOOR = 3;
const FREE_APPROACHES_FLOOR = 3;

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
/* A section's ok line prints only when the section added no failure. */
let sectionStart = 0;
const section = title => { sectionStart = failures; console.log(title); };
const ok = m => { if (failures === sectionStart) console.log('   ok  ' + m); };
const lf = s => s.replaceAll('\r\n', '\n');
const isNum = v => typeof v === 'number' && Number.isFinite(v);
const mean = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN);
const pct = (n, d) => (d ? (100 * n) / d : NaN);
function pearson(xs, ys) {
  const mx = mean(xs), my = mean(ys);
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < xs.length; i++) {
    const dx = xs[i] - mx, dy = ys[i] - my;
    sxy += dx * dy; sxx += dx * dx; syy += dy * dy;
  }
  return sxx > 0 && syy > 0 ? sxy / Math.sqrt(sxx * syy) : NaN;
}
const clone = s => JSON.parse(JSON.stringify(s));
/* Runs fn on its own seeded stream (the same generator as
   scripts/lib/seedRandom.mjs), then puts the harness's stream back, so two
   arms given one seed draw the same numbers in the same order. */
function onStream(seed, fn) {
  const saved = Math.random;
  let a = seed >>> 0;
  Math.random = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  try { return fn(); } finally { Math.random = saved; }
}

/* A worktree inside the repo has no node_modules of its own, so walk up for
   esbuild rather than trusting ROOT/node_modules. */
function findUp(rel) {
  let dir = ROOT;
  for (let i = 0; i < 6; i += 1) {
    const p = path.join(dir, 'node_modules', rel);
    if (fs.existsSync(p)) return p;
    dir = path.dirname(dir);
  }
  return null;
}
const ESBUILD = findUp('.bin/esbuild');
if (!ESBUILD) { console.error('esbuild not found in any node_modules above the repo'); process.exit(1); }

/* ---- the pure module, rewritten when a control asks ---- */
const LIB = path.join(ROOT, 'src', 'lib', 'clubManagerJobHunt.ts');
let libPath = `${ROOT_URL}/src/lib/clubManagerJobHunt.ts`;
function rewrite(file, edits, outName, what) {
  let src = lf(fs.readFileSync(file, 'utf8'));
  for (const [from, to] of edits) {
    /* Exactly once: an anchor that also matched somewhere else would rewrite
       whichever came first, which may not be the rule the control is for. */
    if (src.split(from).length !== 2) {
      console.error(`control cannot run: ${what} is not in the shape CM_APPLICATIONS_CONTROL=${CONTROL} rewrites, exactly once (${from.slice(0, 60)}...)`);
      process.exit(1);
    }
    src = src.replace(from, to);
  }
  const out = `${TMP}/${process.pid}.${outName}`;
  fs.writeFileSync(out, src);
  return out;
}
if (CONTROL === 'deaf') {
  libPath = rewrite(LIB, [['export const STANDING_WEIGHT = 0.05;\n', 'export const STANDING_WEIGHT = 0;\n']], 'clubManagerJobHunt.deaf.ts', 'the standing weight');
  console.log('NEGATIVE CONTROL ON: the club ignores the manager\'s standing; section 1 must go red');
}
if (CONTROL === 'tierblind') {
  libPath = rewrite(LIB, [
    ['export const TIER_UP_WEIGHT = 0.9;\n', 'export const TIER_UP_WEIGHT = 0;\n'],
    ['export const TIER_DOWN_WEIGHT = 0.35;\n', 'export const TIER_DOWN_WEIGHT = 0;\n'],
  ], 'clubManagerJobHunt.tierblind.ts', 'the tier weights');
  console.log('NEGATIVE CONTROL ON: the club ignores the gap in stature; section 1 must go red');
}
if (CONTROL === 'twice') {
  libPath = rewrite(LIB, [['    summerMove: null,\n    sentSeason: season,\n', '    summerMove: hunt.summerMove,\n    sentSeason: season,\n']], 'clubManagerJobHunt.twice.ts', 'the rollover\'s clearing of the booked move');
  console.log('NEGATIVE CONTROL ON: the booked move survives the rollover; section 3 must go red');
}
if (CONTROL === 'nocooldown') {
  libPath = rewrite(LIB, [["  if (hunt.cooldowns.some(c => c.club === club && career.season <= c.until)) return 'cooldown';\n", "  if (false) return 'cooldown';\n"]], 'clubManagerJobHunt.nocooldown.ts', 'the cooldown check');
  console.log('NEGATIVE CONTROL ON: a decline shuts no door; section 2 must go red');
}
if (CONTROL === 'rollwipe') {
  libPath = rewrite(LIB, [['  return { ...hunt, open: null, summerMove: null, sentSeason: season, sent: 0 };\n', '  return { ...hunt, open: null, summerMove: null, sentSeason: season, sent: 0, cooldowns: [] };\n']], 'clubManagerJobHunt.rollwipe.ts', 'the rollover\'s reset');
  console.log('NEGATIVE CONTROL ON: the rollover wipes every cooldown; section 2 must go red');
}
if (CONTROL === 'troubleblind') {
  libPath = rewrite(LIB, [['export const TROUBLE_WEIGHT = 0.05;\n', 'export const TROUBLE_WEIGHT = 0;\n']], 'clubManagerJobHunt.troubleblind.ts', 'the trouble weight');
  console.log('NEGATIVE CONTROL ON: the club ignores how its own season is going; section 1 must go red');
}
if (CONTROL === 'courted') {
  libPath = rewrite(LIB, [
    ['  return !!(hunt.open || hunt.summerMove);\n', '  return false;\n'],
    ["  if (career.approach) return 'approach';\n", "  if (false) return 'approach';\n"],
  ], 'clubManagerJobHunt.courted.ts', 'the rule that keeps an approach and an application apart');
  console.log('NEGATIVE CONTROL ON: an approach and an application stop seeing each other; section 6 must go red');
}
if (CONTROL === 'late') {
  libPath = rewrite(LIB, [["  if (leagueMatchesLeft < ANSWER_MAX_MATCHES) return 'late';\n", "  if (false) return 'late';\n"]], 'clubManagerJobHunt.late.ts', 'the late season refusal');
  console.log('NEGATIVE CONTROL ON: an application can go out in the last league games; section 7 must go red');
}
if (CONTROL === 'lostyes') {
  libPath = rewrite(LIB, [["  return hunt.open && hunt.open.status === 'accepted' ? hunt.open.club : null;\n", '  return null;\n']], 'clubManagerJobHunt.lostyes.ts', 'the waiting yes');
  console.log('NEGATIVE CONTROL ON: a yes still waiting at the season\'s end is forgotten; section 7 must go red');
}
if (CONTROL === 'sackkeeps') {
  libPath = rewrite(LIB, [['  return { ...hunt, open: null, summerMove: null };\n', '  return hunt;\n']], 'clubManagerJobHunt.sackkeeps.ts', 'the sack\'s end of the hunt');
  console.log('NEGATIVE CONTROL ON: a booked move survives the sack; section 7 must go red');
}

/* One CommonJS bundle: the engine, the calendar and the pure module (or its
   rewritten copy). The exact alias on the module path outranks the @ prefix
   alias, so every importer in the bundle, the engine included, reads the
   copy. The process id is in every temp name so seeds and controls can run
   side by side. */
const ENTRY = `${TMP}/cmApplications.${process.pid}.entry.mjs`;
const BUNDLE = `${TMP}/cmApplications.${process.pid}.bundle.cjs`;
fs.writeFileSync(ENTRY, `
export * as cm from '${ROOT_URL}/src/lib/clubManager.ts';
export * as cal from '${ROOT_URL}/src/lib/clubManagerCalendar.ts';
export * as jh from '@/lib/clubManagerJobHunt';
`);
execSync(`"${ESBUILD}" "${ENTRY}" --bundle --format=cjs --platform=node --alias:@=${ROOT_URL}/src --alias:@/lib/clubManagerJobHunt=${libPath} --outfile="${BUNDLE}" --log-level=error`, {
  stdio: 'inherit',
  env: { ...process.env, NODE_PATH: path.dirname(path.dirname(ESBUILD)) },
});
const store = new Map();
globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k), clear: () => store.clear() };
const { cm, cal, jh } = createRequire(import.meta.url)(BUNDLE);
const {
  REAL_LEAGUES, playableClubs, isPartialClub, startCareer, playNextEntry, finishSeason, startNextSeason,
  applyForJob, applyTargets, joinClubInSummer, answerMessage, saveCareer, loadCareer, clubDefFor,
  respondApproach, enterWilderness, wildernessWeek, acceptWildernessJob, myLeagueMatchesLeft, jobApplyRefusal,
  applicationInputFor,
} = cm;
const { simToWeek, joinClubNow } = cal;
const { applyRefusal, jobHuntOf, STANDING_WEIGHT, ANSWER_MIN_MATCHES, ANSWER_MAX_MATCHES, APPLICATIONS_PER_SEASON, LEAVING_BOARD_HIT } = jh;

if (CONTROL === 'deaf' && STANDING_WEIGHT !== 0) { console.error('the deaf control did not reach the bundled engine'); process.exit(1); }
if (CONTROL === 'tierblind' && (jh.TIER_UP_WEIGHT !== 0 || jh.TIER_DOWN_WEIGHT !== 0)) { console.error('the tierblind control did not reach the bundled engine'); process.exit(1); }
if (CONTROL === 'troubleblind' && jh.TROUBLE_WEIGHT !== 0) { console.error('the troubleblind control did not reach the bundled engine'); process.exit(1); }

/* ---------- helpers that drive the engine ---------- */

/** Plays the career forward to `week`, riding through every halt the way the takeover does. */
function advanceTo(state, week) {
  let s = state;
  let guard = 0;
  while (s.week < week && guard++ < 200) {
    const before = s.week;
    const run = simToWeek(s, week);
    s = run.state;
    if (run.halt === 'seasonOver' || s.week <= before) break;
  }
  return s;
}

/** Plays my matches until the application is answered. Returns the state, my match count and how it ended. */
function playUntilAnswered(state, maxMatches = 12) {
  let s = state;
  let matches = 0;
  let guard = 0;
  while (guard++ < 80) {
    const open = s.jobHunt?.open;
    if (!open) return { state: s, matches, outcome: 'declined' };
    if (open.status === 'accepted') return { state: s, matches, outcome: 'accepted' };
    if (matches >= maxMatches) return { state: s, matches, outcome: 'unanswered' };
    const r = playNextEntry(s, { skipHalftime: true });
    s = r.state;
    if (r.kind === 'match') matches += 1;
    if (r.kind === 'seasonOver') return { state: s, matches, outcome: 'seasonOver' };
    if (s.sacked) return { state: s, matches, outcome: 'sacked' };
  }
  return { state: s, matches, outcome: 'stuck' };
}

/** Plays the season out with the board warmed before every entry (the sack race is not what these probes measure). */
function playOut(state) {
  let s = state;
  let guard = 0;
  while (s.week < s.calendar.length && guard++ < 150) {
    const r = playNextEntry({ ...s, boardConfidence: 90 }, { skipHalftime: true });
    s = r.state;
    if (r.kind === 'seasonOver' || s.sacked) break;
  }
  return s;
}

/** A career record of level r in [0, 1], written into the fields the market reads. */
function withRecord(state, r) {
  const s = clone(state);
  const seasons = 1 + Math.round(r * 7);
  s.season = seasons;
  s.trophies = [];
  s.history = [];
  const titles = Math.round(r * 6);
  for (let k = 1; k < seasons; k++) {
    const won = k <= titles;
    s.history.push({ season: k, club: s.clubName, position: won ? 1 : 8, points: won ? 86 : 58, trophies: won ? ['League Title'] : [] });
  }
  for (let k = 0; k < titles; k++) s.trophies.push({ name: 'League Title', emoji: '\u{1F3C6}', season: Math.min(seasons - 1, k + 1) });
  return s;
}

const myTier = s => clubDefFor(s.clubName).tier;
const quoted = text => /["“”]/.test(text);

/* ---------- the bases: real careers at about week ten, spread across the pyramid ---------- */
const pool = [];
for (const league of REAL_LEAGUES) {
  for (const c of playableClubs(league.id)) {
    if (!isPartialClub(c.name)) pool.push({ club: c.name, tier: c.tier, league: league.name });
  }
}
if (pool.length < 60) fail(`the club pool has ${pool.length} clubs, the real leagues should give far more`);
console.log(`0) ${BASES} base careers played to about week ten`);
const bases = [];
let approachesDeclined = 0;
for (let i = 0; i < BASES && pool.length; i++) {
  const pick = pool[Math.floor((i / BASES) * pool.length) % pool.length];
  let s = startCareer(pick.club);
  s = advanceTo(s, 10);
  if (s.sacked || s.week < 6) { console.log(`   skipped ${pick.club}: sacked or stuck at week ${s.week}`); continue; }
  /* An approach waiting on the manager refuses every application (section 6
     holds that rule), so a base that has one turns it down first. */
  if (s.approach) { s = respondApproach(s, false); approachesDeclined += 1; }
  bases.push(s);
}
if (bases.length < Math.min(BASES, 8)) fail(`only ${bases.length} usable bases of ${BASES}`);
console.log(`   ${bases.length} bases, tiers ${[...new Set(bases.map(myTier))].sort().join(', ')}, weeks ${Math.min(...bases.map(b => b.week))} to ${Math.max(...bases.map(b => b.week))}, ${approachesDeclined} live approach(es) turned down first`);

/* ---------- 1. the answer is the manager's to earn ---------- */
section(`1) Acceptance against standing and tier gap over ${bases.length * PER_BASE} applications`);
const rows = [];
let offSchedule = 0, badCopy = 0, noMessage = 0, missingOptions = 0, sackedWaiting = 0;
for (const base of bases) {
  const mine = myTier(base);
  const targets = applyTargets(base);
  const groups = {
    up: targets.filter(t => t.tier < mine),
    same: targets.filter(t => t.tier === mine),
    down: targets.filter(t => t.tier > mine),
  };
  for (let i = 0; i < PER_BASE; i++) {
    const level = PER_BASE === 1 ? 0.5 : i / (PER_BASE - 1);
    const s0 = withRecord(base, level);
    const want = ['up', 'same', 'down'][i % 3];
    const group = groups[want].length ? groups[want] : groups.same.length ? groups.same : targets;
    const target = group[Math.floor(Math.random() * group.length)];
    const applied = applyForJob(s0, target.club);
    if (!applied) { fail(`${base.clubName} level ${level.toFixed(2)}: could not apply to ${target.club} (${applyRefusal(s0, target.club)})`); continue; }
    const open = applied.jobHunt.open;
    if (!open || open.status !== 'pending' || open.club !== target.club) { fail(`${base.clubName}: applyForJob left no pending application`); continue; }
    if (open.matchesLeft < ANSWER_MIN_MATCHES || open.matchesLeft > ANSWER_MAX_MATCHES) fail(`${base.clubName}: the answer was fixed ${open.matchesLeft} match days out`);
    if (!(applied.inbox ?? []).some(m => m.kind === 'jobApplication' && m.resolved)) noMessage += 1;
    const due = open.matchesLeft;
    const standing = jh.employedStanding(cm.wildernessProfile(s0));
    const run = playUntilAnswered(applied);
    /* A sacking inside the wait is the sack race, not the feature: the row
       is skipped and counted, and the floor on answered rows below holds the
       count honest. */
    if (run.outcome === 'sacked') { sackedWaiting += 1; continue; }
    if (run.outcome !== 'accepted' && run.outcome !== 'declined') { fail(`${base.clubName} to ${target.club}: ${run.outcome} after ${run.matches} matches`); continue; }
    if (run.matches !== due) offSchedule += 1;
    const msg = (run.state.inbox ?? []).find(m => m.kind === 'jobApplication' && m.from === `The ${target.club} board`);
    if (!msg) noMessage += 1;
    else {
      if (quoted(msg.text) || (msg.resolved && quoted(msg.resolved))) badCopy += 1;
      if (run.outcome === 'accepted') {
        const effects = msg.options.map(o => o.effect).sort().join(',');
        if (effects !== 'joinNow,joinSummer' || msg.resolved) missingOptions += 1;
      } else if (msg.options.length !== 0 || !msg.resolved) missingOptions += 1;
    }
    const hunt = run.state.jobHunt;
    if (run.outcome === 'declined') {
      if (!hunt.cooldowns.some(c => c.club === target.club && c.until === s0.season + 1)) fail(`${base.clubName}: a decline from ${target.club} left no cooldown`);
    } else if (!isNum(hunt.open.odds)) fail(`${base.clubName}: an acceptance carries no odds`);
    rows.push({ standing, tierUp: Math.max(0, mine - target.tier), accepted: run.outcome === 'accepted' ? 1 : 0, due });
  }
}
const rStanding = pearson(rows.map(r => r.standing), rows.map(r => r.accepted));
const rTier = pearson(rows.map(r => r.tierUp), rows.map(r => r.accepted));
const acceptedShare = pct(rows.filter(r => r.accepted).length, rows.length);
console.log(`   ${rows.length} answered (${sackedWaiting} sacked while waiting): ${acceptedShare.toFixed(1)} percent yes; r vs standing ${isNum(rStanding) ? rStanding.toFixed(3) : 'NaN'}, r vs tiers up ${isNum(rTier) ? rTier.toFixed(3) : 'NaN'} (reported, the paired gap below is the gate); standing ${Math.min(...rows.map(r => r.standing)).toFixed(0)} to ${Math.max(...rows.map(r => r.standing)).toFixed(0)}; off schedule ${offSchedule}, quoted ${badCopy}, no message ${noMessage}, wrong options ${missingOptions}`);
{
  const by = k => rows.filter(r => r.tierUp === k);
  console.log(`   yes by tiers applied up: ${[0, 1, 2, 3].map(k => `${k}: ${by(k).filter(r => r.accepted).length} of ${by(k).length}`).join(', ')}`);
}

/* The tier gap, paired. Over the mixed rows above the tier signal is real but
   thin (r between -0.19 and -0.38 over nineteen runs, the standing spread
   swamps it), so the gate is a paired measurement instead: the same manager,
   the same record, the same roll and the same wait, writing once to a club at
   his own tier and once to a club above it. The only thing that differs
   between the two arms is the club, so the gap in yeses is the club's stature
   and not the noise of who happened to apply. */
const PAIR_LEVELS = 10;
const pairs = [];
let pairsLost = 0;
for (const base of bases) {
  const mine = myTier(base);
  const targets = applyTargets(base);
  const same = targets.filter(t => t.tier === mine);
  const up = targets.filter(t => t.tier < mine);
  if (!same.length || !up.length) continue;
  for (let i = 0; i < PAIR_LEVELS; i++) {
    const s0 = withRecord(base, i / (PAIR_LEVELS - 1));
    const arms = [same[Math.floor(Math.random() * same.length)], up[Math.floor(Math.random() * up.length)]];
    const roll = Math.random();
    let wait = null;
    const answers = [];
    for (const t of arms) {
      const applied = applyForJob(clone(s0), t.club);
      if (!applied) { fail(`${base.clubName}: could not apply to ${t.club} for the paired tier check (${applyRefusal(s0, t.club)})`); break; }
      applied.jobHunt.open.roll = roll;
      if (wait === null) wait = applied.jobHunt.open.matchesLeft;
      else applied.jobHunt.open.matchesLeft = wait;
      const run = playUntilAnswered(applied);
      if (run.outcome !== 'accepted' && run.outcome !== 'declined') break;
      answers.push(run.outcome === 'accepted' ? 1 : 0);
    }
    if (answers.length === 2) pairs.push({ same: answers[0], up: answers[1], tierUp: mine - arms[1].tier });
    else pairsLost += 1;
  }
}
const sameYes = pct(pairs.filter(p => p.same).length, pairs.length);
const upYes = pct(pairs.filter(p => p.up).length, pairs.length);
const tierGap = sameYes - upYes;
const upOnly = pairs.filter(p => p.up && !p.same).length;
console.log(`   paired tier check: ${pairs.length} pairs (${pairsLost} lost to a sacking), yes at my tier ${sameYes.toFixed(1)} percent, yes above it ${upYes.toFixed(1)} percent, gap ${tierGap.toFixed(1)} points; pairs where only the bigger club said yes ${upOnly}`);

/* Round 783 review: how the club's own season is going, paired the same way.
   The same manager, record and wait write once to a club of one tier whose
   season is fine (no trouble at all, a known place in its table) and once to
   a club of the SAME tier whose season is going badly (trouble of STRUGGLING
   or more, read off the engine's own applicationInputFor), so the tier and
   the manager cancel and the gap is the club's season. The tier chosen is the
   one nearest the manager's that has both kinds. What is compared is the odds
   each club decided on, as the weekly tick recorded them on the answer: the
   roll is fixed at 0 so every answer is a yes and carries its odds. A yes or
   no per pair was tried first and read a gap of 5.4 points against a blind
   control's -0.8 with a sampling spread near 1.5 either way, which is a coin
   toss as a gate; the odds are the same decision without the roll's noise. */
const TROUBLE_LEVELS = 10;
const STRUGGLING = 8;
const tPairs = [];
let tLost = 0, tBases = 0;
const troubleAt = { settled: [], struggling: [] };
for (const base of bases) {
  const mine = myTier(base);
  const byTier = new Map();
  for (const t of applyTargets(base)) {
    const inp = applicationInputFor(base, t.club);
    const kind = inp.targetTrouble >= STRUGGLING ? 'struggling'
      : inp.targetTrouble === 0 && inp.targetPos !== null ? 'settled' : null;
    if (!kind) continue;
    if (!byTier.has(t.tier)) byTier.set(t.tier, { settled: [], struggling: [] });
    byTier.get(t.tier)[kind].push({ ...t, trouble: inp.targetTrouble });
  }
  const tiers = [...byTier.entries()]
    .filter(([, g]) => g.settled.length && g.struggling.length)
    .sort((a, b) => Math.abs(a[0] - mine) - Math.abs(b[0] - mine) || a[0] - b[0]);
  if (!tiers.length) continue;
  tBases += 1;
  const g = tiers[0][1];
  for (let i = 0; i < TROUBLE_LEVELS; i++) {
    const s0 = withRecord(base, i / (TROUBLE_LEVELS - 1));
    const arms = [g.settled[Math.floor(Math.random() * g.settled.length)], g.struggling[Math.floor(Math.random() * g.struggling.length)]];
    /* Both arms walk the same random stream (the house rule: seed the arms),
       so they play the same matches to the same results and reach the answer
       with the same form and the same table; nothing random reads the club
       applied to, so the only thing the two answers differ by is that club. */
    const pairSeed = Math.floor(Math.random() * 4294967296);
    const odds = [];
    for (const t of arms) {
      const o = onStream(pairSeed, () => {
        const applied = applyForJob(clone(s0), t.club);
        if (!applied) { fail(`${base.clubName}: could not apply to ${t.club} for the paired trouble check (${jobApplyRefusal(s0, t.club)})`); return null; }
        applied.jobHunt.open.roll = 0;
        const run = playUntilAnswered(applied);
        if (run.outcome !== 'accepted') return null;
        const v = run.state.jobHunt.open.odds;
        if (!isNum(v)) { fail(`${base.clubName}: the yes from ${t.club} carries no odds`); return null; }
        return v;
      });
      if (o === null) break;
      odds.push(o);
    }
    if (odds.length === 2) {
      tPairs.push({ settled: odds[0], struggling: odds[1] });
      troubleAt.settled.push(arms[0].trouble);
      troubleAt.struggling.push(arms[1].trouble);
    } else tLost += 1;
  }
}
const settledOdds = 100 * mean(tPairs.map(p => p.settled));
const strugglingOdds = 100 * mean(tPairs.map(p => p.struggling));
const troubleGap = strugglingOdds - settledOdds;
console.log(`   paired trouble check: ${tPairs.length} pairs from ${tBases} bases (${tLost} lost to a sacking), odds where their season is fine ${settledOdds.toFixed(1)} percent, where it is going badly ${strugglingOdds.toFixed(1)} percent, gap ${troubleGap.toFixed(1)} points (trouble ${mean(troubleAt.settled).toFixed(1)} vs ${mean(troubleAt.struggling).toFixed(1)} when sent); pairs where the settled club's odds were higher ${tPairs.filter(p => p.settled > p.struggling).length}`);

if (rows.length < bases.length * PER_BASE * 0.9) fail(`only ${rows.length} of ${bases.length * PER_BASE} applications were answered`);
if (!(rStanding >= 0.25)) fail(`acceptance does not rise with standing: r=${isNum(rStanding) ? rStanding.toFixed(3) : 'NaN'} (floor 0.25)`);
if (pairs.length < 100) fail(`only ${pairs.length} paired tier checks were answered (floor 100)`);
if (!(tierGap >= 10)) fail(`acceptance does not fall with the tiers applied up: the paired gap is ${isNum(tierGap) ? tierGap.toFixed(1) : 'NaN'} points (floor 10)`);
if (tPairs.length < TROUBLE_PAIRS_FLOOR) fail(`only ${tPairs.length} paired trouble checks were answered (floor ${TROUBLE_PAIRS_FLOOR})`);
if (!(troubleGap >= TROUBLE_GAP_FLOOR)) fail(`acceptance does not rise with the trouble the club is in: the paired gap is ${isNum(troubleGap) ? troubleGap.toFixed(1) : 'NaN'} points (floor ${TROUBLE_GAP_FLOOR})`);
if (!(acceptedShare >= 12 && acceptedShare <= 75)) fail(`${acceptedShare.toFixed(1)} percent of applications were accepted (band 12 to 75)`);
if (offSchedule) fail(`${offSchedule} answers did not land on the match day the application fixed`);
if (badCopy) fail(`${badCopy} answers carried quoted speech`);
if (noMessage) fail(`${noMessage} applications or answers left no inbox message`);
if (missingOptions) fail(`${missingOptions} answers carried the wrong options (a yes offers joinNow and joinSummer, a no offers nothing and is resolved)`);
ok(`acceptance rises with standing and with the trouble the club is in, falls with the tiers applied up, every answer on its fixed match day, every answer in the inbox from the club's board`);

/* ---------- 2. the limits ---------- */
section('2) One at a time, a season long cooldown, three a season');
{
  const base = bases[0];
  const targets = applyTargets(base).filter(t => t.tier >= myTier(base));
  const [A, B, C, D, E] = targets;
  const s1 = applyForJob(base, A.club);
  if (!s1) fail(`could not open the first application at ${A.club}`);
  if (s1 && applyForJob(s1, B.club) !== null) fail('a second application went out while the first was open');
  if (s1 && applyRefusal(s1, B.club) !== 'open') fail(`the refusal while one is open reads ${applyRefusal(s1, B.club)}`);
  if (s1 && applyForJob(s1, base.clubName) !== null) fail('applied to my own club');
  /* Force the no: a roll of 1 never clears odds that stop at 0.92. */
  let s2 = s1 ? clone(s1) : null;
  if (s2) {
    s2.jobHunt.open.roll = 1;
    const run = playUntilAnswered(s2);
    if (run.outcome !== 'declined') fail(`the forced no came back ${run.outcome}`);
    s2 = run.state;
    if (applyForJob(s2, A.club) !== null) fail(`${A.club} took a second application in the season they said no`);
    if (applyRefusal(s2, A.club) !== 'cooldown') fail(`the same season refusal reads ${applyRefusal(s2, A.club)}`);
    if (applyForJob({ ...s2, season: s2.season + 1 }, A.club) !== null) fail(`${A.club} took an application the season after they said no`);
    if (applyForJob({ ...s2, season: s2.season + 2 }, A.club) === null) fail(`${A.club} still refused two seasons after the no`);
    if (applyForJob(s2, B.club) === null) fail('another club was refused while nothing was open');
    /* Three a season: two more declines, then the fourth is refused. */
    let s3 = s2;
    for (const t of [B, C]) {
      const next = applyForJob(s3, t.club);
      if (!next) { fail(`could not send application to ${t.club}`); break; }
      next.jobHunt.open.roll = 1;
      const run2 = playUntilAnswered(next);
      if (run2.outcome !== 'declined') { fail(`the forced no at ${t.club} came back ${run2.outcome}`); break; }
      s3 = run2.state;
    }
    if (jobHuntOf(s3).sent !== APPLICATIONS_PER_SEASON) fail(`the season count reads ${jobHuntOf(s3).sent} after three applications`);
    if (applyForJob(s3, D.club) !== null) fail('a fourth application went out in one season');
    if (applyRefusal(s3, D.club) !== 'limit') fail(`the fourth's refusal reads ${applyRefusal(s3, D.club)}`);
    if (applyForJob({ ...s3, season: s3.season + 1 }, E.club) === null) fail('the count did not reset with the season');
    /* Round 783 review: and through the REAL rollover, twice. The declined
       save plays its season out, goes through finishSeason and
       startNextSeason staying put, and the door must still be shut; one more
       season through the same two calls and it must be open. A rollover that
       dropped the cooldowns passed every check above, which only ever moved
       the season number by hand. */
    const roll = st => startNextSeason(finishSeason(playOut(st)).state);
    let n1 = null;
    try { n1 = roll(s2); } catch (e) { fail(`the declined save's rollover threw: ${e.message}`); }
    if (n1) {
      if (n1.season !== s2.season + 1 || n1.clubName !== s2.clubName) fail(`the rollover put the manager at ${n1.clubName} in season ${n1.season}`);
      if (jobApplyRefusal(n1, A.club) !== 'cooldown') fail(`the season after the no, through the real rollover, ${A.club} reads ${jobApplyRefusal(n1, A.club)}, not cooldown`);
      if (applyForJob(n1, A.club) !== null) fail(`${A.club} took an application the season after they said no, through the real rollover`);
      let n2 = null;
      try { n2 = roll(n1); } catch (e) { fail(`the second rollover threw: ${e.message}`); }
      if (n2) {
        if (n2.season !== s2.season + 2) fail(`the second rollover reads season ${n2.season}`);
        if (jobApplyRefusal(n2, A.club) !== null) fail(`two seasons after the no, through the real rollover, ${A.club} still reads ${jobApplyRefusal(n2, A.club)}`);
      }
    }
  }
  ok('one open application at a time, a decline shuts the door through next season and no further (by hand and through two real rollovers), three a season and the count resets');
}

/* ---------- 3. a summer move fires exactly once ---------- */
section('3) A yes answered with the summer moves the manager at the rollover, once');
{
  let probes = 0;
  for (let i = 0; i < Math.min(4, bases.length); i++) {
    const base = bases[1 + i] ?? bases[i];
    const targets = applyTargets(base);
    const target = targets[Math.floor(Math.random() * targets.length)];
    const other = targets.find(t => t.club !== target.club);
    const applied = applyForJob(base, target.club);
    if (!applied) { fail(`probe ${i}: could not apply to ${target.club}`); continue; }
    applied.jobHunt.open.roll = 0;   /* a roll of 0 always clears the floor */
    /* The board is warmed for the wait: the probe measures the application,
       not the sack race, and a base at week ten can be one defeat from it. */
    applied.boardConfidence = 85;
    const run = playUntilAnswered(applied);
    if (run.outcome !== 'accepted') { fail(`probe ${i}: the forced yes came back ${run.outcome}`); continue; }
    const before = run.state;
    const boardBefore = before.boardConfidence;
    /* Odd probes answer through the inbox option, even ones through the panel call. */
    let booked;
    if (i % 2 === 1) {
      const msg = (before.inbox ?? []).find(m => m.kind === 'jobApplication' && !m.resolved);
      const idx = msg ? msg.options.findIndex(o => o.effect === 'joinSummer') : -1;
      booked = msg && idx >= 0 ? answerMessage(before, msg.id, idx) : null;
    } else {
      booked = joinClubInSummer(before);
    }
    if (!booked || booked === before) { fail(`probe ${i}: the summer answer changed nothing`); continue; }
    const hunt = jobHuntOf(booked);
    if (!hunt.summerMove || hunt.summerMove.club !== target.club) fail(`probe ${i}: no summer move booked for ${target.club}`);
    if (hunt.open !== null) fail(`probe ${i}: the application is still open after the summer answer`);
    if (booked.boardConfidence !== Math.max(1, boardBefore - LEAVING_BOARD_HIT)) fail(`probe ${i}: the board went from ${boardBefore} to ${booked.boardConfidence}, not ${LEAVING_BOARD_HIT} colder`);
    if (!(booked.inbox ?? []).some(m => m.kind === 'jobApplication' && m.from === `The ${base.clubName} board` && m.resolved)) fail(`probe ${i}: the old board did not write`);
    if ((booked.inbox ?? []).some(m => m.kind === 'jobApplication' && !m.resolved)) fail(`probe ${i}: the acceptance message was left unresolved`);
    if (applyRefusal(booked, other.club) !== 'committed') fail(`probe ${i}: another application was not refused as committed`);
    if (joinClubNow(booked) !== null) fail(`probe ${i}: joinClubNow still ran after the summer was chosen`);
    /* Play the season out. The board is warmed before every entry so the
       probe measures the rollover and not a sacking (the engine sacks only
       when confidence reaches zero, and no week costs ninety); the hit above
       was measured already. */
    let s = booked;
    let guard = 0;
    while (s.week < s.calendar.length && guard++ < 120) {
      const r = playNextEntry({ ...s, boardConfidence: 90 }, { skipHalftime: true });
      s = r.state;
      if (r.kind === 'seasonOver') break;
      if (s.sacked) break;
    }
    if (s.sacked) { console.log(`   probe ${i}: sacked before the summer, skipped`); continue; }
    if (jobHuntOf(s).summerMove?.club !== target.club) { fail(`probe ${i}: the booked move did not survive the season`); continue; }
    const done = finishSeason(s).state;
    /* Tapped with a DIFFERENT offer: the booked move must win. */
    const next = startNextSeason(done, other.club);
    probes += 1;
    if (next.clubName !== target.club) fail(`probe ${i}: the rollover put the manager at ${next.clubName}, not ${target.club}`);
    if (next.season !== s.season + 1) fail(`probe ${i}: the season reads ${next.season}`);
    const after = jobHuntOf(next);
    if (next.jobHunt?.summerMove !== null && next.jobHunt?.summerMove !== undefined) fail(`probe ${i}: the booked move is still on the save after the rollover`);
    if (after.lastMove?.when !== 'summer' || after.lastMove.to !== target.club || after.lastMove.from !== base.clubName) fail(`probe ${i}: lastMove reads ${JSON.stringify(after.lastMove)}`);
    if (!after.lastMove || !after.lastMove.interim) fail(`probe ${i}: the old club has no interim recorded`);
    if (!(next.careerStats.clubsManaged ?? []).includes(target.club) || !(next.careerStats.clubsManaged ?? []).includes(base.clubName)) fail(`probe ${i}: clubs managed reads ${JSON.stringify(next.careerStats.clubsManaged)}`);
    if (applyRefusal(next, other.club) === 'committed') fail(`probe ${i}: the new season still reads as committed`);
    /* And the following rollover moves nobody. */
    let again;
    try { again = startNextSeason(next); } catch (e) { fail(`probe ${i}: a second rollover threw: ${e.message}`); continue; }
    if (again.clubName !== target.club) fail(`probe ${i}: the second rollover moved the manager to ${again.clubName}`);
    if (jobHuntOf(again).summerMove !== null) fail(`probe ${i}: a booked move reappeared on the second rollover`);
  }
  if (probes < 2) fail(`only ${probes} summer probes reached the rollover (floor 2)`);
  ok(`${probes} booked summer moves fired at the rollover, over a different tapped offer, once each, with the board hit, the old board's letter and the interim recorded`);
}

/* ---------- 4. joining now ---------- */
section('4) A yes answered with now moves the manager that week');
{
  let sameLeague = 0, crossLeague = 0;
  for (let i = 0; i < Math.min(6, bases.length) && (sameLeague < 2 || crossLeague < 2); i++) {
    const base = bases[(5 + i) % bases.length];
    const inLeague = new Set(base.leagueClubs);
    const targets = applyTargets(base);
    const wantSame = sameLeague < 2;
    const group = targets.filter(t => wantSame ? inLeague.has(t.club) : !inLeague.has(t.club));
    if (!group.length) continue;
    const target = group[Math.floor(Math.random() * group.length)];
    const applied = applyForJob(base, target.club);
    if (!applied) { fail(`probe ${i}: could not apply to ${target.club}`); continue; }
    applied.jobHunt.open.roll = 0;
    applied.boardConfidence = 85;   /* the same warming as section 3, same reason */
    const run = playUntilAnswered(applied);
    if (run.outcome !== 'accepted') { fail(`probe ${i}: the forced yes came back ${run.outcome}`); continue; }
    const before = run.state;
    const joined = joinClubNow(before);
    if (!joined) { fail(`probe ${i}: joinClubNow returned null`); continue; }
    if (wantSame) sameLeague += 1; else crossLeague += 1;
    const tag = `probe ${i} (${before.clubName} to ${target.club}, ${wantSame ? 'same league' : 'another league'})`;
    if (joined.clubName !== target.club) fail(`${tag}: the manager is at ${joined.clubName}`);
    if (joined.season !== before.season || joined.startYear !== before.startYear) fail(`${tag}: season or world year moved (${joined.season}/${joined.startYear} vs ${before.season}/${before.startYear})`);
    if (JSON.stringify(joined.trophies) !== JSON.stringify(before.trophies) || JSON.stringify(joined.history) !== JSON.stringify(before.history)) fail(`${tag}: trophies or history changed on the move`);
    const { clubsManaged: a, ...recA } = joined.careerStats;
    const { clubsManaged: b, ...recB } = before.careerStats;
    if (JSON.stringify(recA) !== JSON.stringify(recB)) fail(`${tag}: the career record changed on the move`);
    if (!(a ?? []).includes(target.club) || !(a ?? []).includes(before.clubName) || (b ?? []).includes(target.club)) fail(`${tag}: clubs managed reads ${JSON.stringify(a)}`);
    const fracBefore = before.week / before.calendar.length, fracAfter = joined.week / joined.calendar.length;
    if (Math.abs(fracBefore - fracAfter) > 0.1) fail(`${tag}: the season share moved from ${fracBefore.toFixed(2)} to ${fracAfter.toFixed(2)}`);
    if (joined.week < 1) fail(`${tag}: the joined season has not kicked off`);
    const hunt = jobHuntOf(joined);
    if (hunt.open !== null || hunt.summerMove !== null) fail(`${tag}: the application is still on the save`);
    if (hunt.lastMove?.when !== 'now' || hunt.lastMove.to !== target.club || hunt.lastMove.from !== before.clubName) fail(`${tag}: lastMove reads ${JSON.stringify(hunt.lastMove)}`);
    const interim = hunt.lastMove?.interim ?? '';
    if (!interim || interim.split(' ').length < 2) fail(`${tag}: the interim reads '${interim}'`);
    if (joined.leagueClubs.includes(before.clubName) && joined.managers?.[before.clubName]?.name !== interim) fail(`${tag}: the old club's dugout reads ${joined.managers?.[before.clubName]?.name ?? 'nobody'}, not the interim`);
    if (joined.managers?.[target.club]) fail(`${tag}: the new club still has another manager on record`);
    if (joined.boardConfidence !== 62) fail(`${tag}: the board opens at ${joined.boardConfidence}`);
    if (!joined.handover || !isNum(joined.handover.pts) || !isNum(joined.handover.played)) fail(`${tag}: no handover stamped`);
    const letter = (joined.inbox ?? []).find(m => m.kind === 'jobApplication' && m.from === `The ${before.clubName} board`);
    if (!letter || !letter.text.includes(interim) || quoted(letter.text)) fail(`${tag}: the old board's letter is missing, nameless or quoted`);
    if (joined.customClub) fail(`${tag}: the created club followed the manager`);
    if (joined.sacked || joined.approach || joined.pendingMove || joined.wilderness) fail(`${tag}: stale state crossed the move`);
    if (!joined.table.some(r => r.club === target.club)) fail(`${tag}: the new club is not in its own table`);
    if (!joined.squad.length) fail(`${tag}: no squad at the new club`);
    /* And it plays on. */
    let after;
    try { after = playNextEntry(joined, { skipHalftime: true }); } catch (e) { fail(`${tag}: the joined career threw on its first entry: ${e.message}`); continue; }
    if (!['match', 'window', 'seasonOver'].includes(after.kind)) fail(`${tag}: the first entry after joining came back ${after.kind}`);
    if (after.state.clubName !== target.club) fail(`${tag}: the club changed on the first entry after joining`);
  }
  if (sameLeague < 1 || crossLeague < 1) fail(`join now probes: ${sameLeague} same league, ${crossLeague} another league (floor 1 each)`);
  ok(`${sameLeague + crossLeague} managers joined the club that said yes that week, record and honours intact, interim named, and played on`);
}

/* ---------- 5. an old save loads unchanged ---------- */
section('5) A save from before the round opens and plays with nothing in flight');
{
  const base = clone(bases[2] ?? bases[0]);
  delete base.jobHunt;
  if (!saveCareer(base)) fail('the old shaped save could not be written');
  const loaded = loadCareer();
  if (!loaded) fail('the old shaped save did not load');
  else {
    if (loaded.jobHunt !== undefined) fail('loading invented a job hunt block');
    const hunt = jobHuntOf(loaded);
    if (hunt.open !== null || hunt.summerMove !== null || hunt.cooldowns.length || hunt.sent !== 0) fail('an old save reads as having something in flight');
    const target = applyTargets(loaded)[0];
    if (applyRefusal(loaded, target.club) !== null) fail(`an old save cannot apply: ${applyRefusal(loaded, target.club)}`);
    const played = playNextEntry(loaded, { skipHalftime: true }).state;
    if (played.jobHunt !== undefined) fail('a match on an old save wrote a job hunt block');
    /* And a save WITH an application in flight keeps it. */
    const applied = applyForJob(loaded, target.club);
    if (!applied) fail('the loaded save could not apply');
    else {
      saveCareer(applied);
      const back = loadCareer();
      if (!back || back.jobHunt?.open?.club !== target.club || back.jobHunt.open.roll !== applied.jobHunt.open.roll) fail('an application in flight did not survive a save and load');
    }
  }
  ok('an old save opens with nothing in flight, can apply, plays on without the field, and an application in flight survives a save and load');
}

/* ---------- 6. never promised to two clubs ---------- */
section('6) An approach and an application never overlap');
{
  /* Three arms from each base, each played the same number of my matches
     with the board warmed and the form forced hot before every entry (so the
     engine's approach roll is live every week), any approach that lands
     counted and cleared: free (nothing in flight), out (an application whose
     answer never comes due) and booked (a summer move on the save). The free
     arm proves the setup draws approaches; the other two must draw none. */
  const MATCHES = 50;
  const hot = ['W', 'W', 'W', 'W', 'W'];
  const counts = { free: 0, out: 0, booked: 0 };
  const played = { free: 0, out: 0, booked: 0 };
  const probeBases = bases.filter(b => myTier(b) >= 2).slice(0, 6);
  if (probeBases.length < 2) fail(`only ${probeBases.length} bases below the top tier for the approach probes`);
  for (const base of probeBases) {
    const target = applyTargets(base).find(t => t.tier >= myTier(base));
    const out = applyForJob(base, target.club);
    if (!out) { fail(`${base.clubName}: could not apply to ${target.club} for the approach probe (${jobApplyRefusal(base, target.club)})`); continue; }
    out.jobHunt.open.matchesLeft = 999;
    const booked = { ...clone(base), jobHunt: { ...jobHuntOf(base), summerMove: { club: target.club, blurb: '' } } };
    for (const [arm, start] of [['free', clone(base)], ['out', out], ['booked', booked]]) {
      let s = start;
      let matches = 0;
      let guard = 0;
      while (matches < MATCHES && s.week < s.calendar.length && guard++ < 120) {
        const r = playNextEntry({ ...s, boardConfidence: 90, form: [...s.form, ...hot], approach: null }, { skipHalftime: true });
        s = r.state;
        if (r.kind === 'match') matches += 1;
        if (s.approach) counts[arm] += 1;
        if (r.kind === 'seasonOver' || s.sacked) break;
      }
      played[arm] += matches;
    }
    /* An approach injected beside an application: the handshake is refused
       and the approach stays live; turning it down still works. And with an
       approach live, no application goes out. */
    const live = { club: applyTargets(base).find(t => t.club !== target.club)?.club ?? 'Elsewhere', leagueName: '', tierLabel: '', blurb: '', week: base.week, expiresWeek: base.week + 5 };
    const both = { ...out, approach: live };
    const shook = respondApproach(both, true);
    if (shook.pendingMove || shook.boardConfidence !== both.boardConfidence || !shook.approach) fail(`${base.clubName}: an approach was committed to with an application out (pre-agreement ${shook.pendingMove?.club ?? 'none'}, board ${both.boardConfidence} to ${shook.boardConfidence})`);
    const bothBooked = { ...booked, approach: live };
    if (respondApproach(bothBooked, true).pendingMove) fail(`${base.clubName}: an approach was committed to with a summer move booked`);
    if (respondApproach(both, false).approach) fail(`${base.clubName}: an approach could not be turned down with an application out`);
    const courted = { ...clone(base), approach: live };
    if (jobApplyRefusal(courted, target.club) !== 'approach') fail(`${base.clubName}: with an approach live an application reads ${jobApplyRefusal(courted, target.club)}, not approach`);
    if (applyForJob(courted, target.club) !== null) fail(`${base.clubName}: an application went out with an approach live`);
  }
  console.log(`   approaches drawn over ${played.free}, ${played.out} and ${played.booked} matches: free ${counts.free}, application out ${counts.out}, move booked ${counts.booked}`);
  if (counts.free < FREE_APPROACHES_FLOOR) fail(`the free arm drew ${counts.free} approaches (floor ${FREE_APPROACHES_FLOOR}), so the probe cannot see the guard`);
  if (counts.out) fail(`${counts.out} approaches landed while an application was out`);
  if (counts.booked) fail(`${counts.booked} approaches landed while a summer move was booked`);
  ok(`no approach while an application is out or a move is booked (${counts.free} drawn in the free arm), no handshake beside one, and no application beside a live approach`);
}

/* ---------- 7. the end of the season, and the sack ---------- */
section('7) Late in the season, at its end, and after the sack');
{
  const base = bases.find(b => myTier(b) >= 2) ?? bases[0];
  const target = applyTargets(base).find(t => t.tier >= myTier(base));
  /* (a) The last league game an application may go out on: with exactly
     ANSWER_MAX_MATCHES league games left it goes, and with the longest wait
     it is still answered before the season ends; one league game later it is
     refused as late. */
  let s = clone(base);
  let guard = 0;
  while (myLeagueMatchesLeft(s) > ANSWER_MAX_MATCHES && guard++ < 120) {
    const r = playNextEntry({ ...s, boardConfidence: 90 }, { skipHalftime: true });
    s = r.state;
    if (r.kind === 'seasonOver' || s.sacked) break;
  }
  /* An approach that landed on the way refuses every application (section
     6's rule), so it is turned down first, here and one game later. */
  const lastCall = s.approach ? respondApproach(s, false) : s;
  if (myLeagueMatchesLeft(lastCall) !== ANSWER_MAX_MATCHES) fail(`could not stop at ${ANSWER_MAX_MATCHES} league games left (read ${myLeagueMatchesLeft(lastCall)})`);
  const applied = applyForJob(lastCall, target.club);
  let yesState = null;
  if (!applied) fail(`with ${ANSWER_MAX_MATCHES} league games left the application was refused (${jobApplyRefusal(lastCall, target.club)})`);
  else {
    applied.jobHunt.open.matchesLeft = ANSWER_MAX_MATCHES;
    applied.jobHunt.open.roll = 0;
    applied.boardConfidence = 85;
    const run = playUntilAnswered(applied, 40);
    if (run.outcome !== 'accepted') fail(`an application sent with ${ANSWER_MAX_MATCHES} league games left and the longest wait came back ${run.outcome}`);
    else yesState = run.state;
  }
  let oneLater = lastCall;
  guard = 0;
  while (myLeagueMatchesLeft(oneLater) >= ANSWER_MAX_MATCHES && guard++ < 20) {
    const r = playNextEntry({ ...oneLater, boardConfidence: 90 }, { skipHalftime: true });
    oneLater = r.state;
    if (r.kind === 'seasonOver' || oneLater.sacked) break;
  }
  if (oneLater.approach) oneLater = respondApproach(oneLater, false);
  if (jobApplyRefusal(oneLater, target.club) !== 'late') fail(`with ${myLeagueMatchesLeft(oneLater)} league games left the refusal reads ${jobApplyRefusal(oneLater, target.club)}, not late`);
  if (applyForJob(oneLater, target.club) !== null) fail(`an application went out with ${myLeagueMatchesLeft(oneLater)} league games left`);

  /* (b) A yes nobody answered is the summary's first offer, and taking it
     moves the manager; Continue turns it down. An application still pending
     at the season's end (its wait forced past the last game) is answered
     then, and its yes leads the offers the same way. */
  const atEnd = [];
  if (yesState) atEnd.push(['a yes left unanswered', yesState]);
  if (applied) {
    const pending = clone(applied);
    pending.jobHunt.open.matchesLeft = 999;
    atEnd.push(['an application still pending', pending]);
  }
  for (const [what, st] of atEnd) {
    const done = finishSeason(playOut(st));
    const lead = done.summary.offers[0]?.club ?? null;
    if (lead !== target.club) { fail(`${what} at the season's end: the summary's first offer is ${lead ?? 'nothing'}, not ${target.club}`); continue; }
    const took = startNextSeason(done.state, target.club);
    if (took.clubName !== target.club) fail(`${what}: taking the offer put the manager at ${took.clubName}`);
    const stayed = startNextSeason(done.state);
    if (stayed.clubName !== base.clubName || jobHuntOf(stayed).open !== null) fail(`${what}: Continue left the manager at ${stayed.clubName} with ${JSON.stringify(jobHuntOf(stayed).open)}`);
  }

  /* (c) The sack with a summer move booked. The out of work screen offers
     the agreed club first; whichever job is taken there is the job the
     rollover gives. Also on a path that never called enterWilderness. */
  let sack = null;
  const fresh = applyForJob(base, target.club);
  if (!fresh) fail(`could not apply to ${target.club} for the sack probe`);
  else {
    fresh.jobHunt.open.roll = 0;
    fresh.boardConfidence = 85;
    const run = playUntilAnswered(fresh);
    const bookedMove = run.outcome === 'accepted' ? joinClubInSummer(run.state) : null;
    if (!bookedMove || jobHuntOf(bookedMove).summerMove?.club !== target.club) fail(`the sack probe could not book a summer move (${run.outcome})`);
    else {
      sack = bookedMove;
      guard = 0;
      while (!sack.sacked && sack.week < sack.calendar.length && guard++ < 40) {
        sack = playNextEntry({ ...sack, boardConfidence: 0.5 }, { skipHalftime: true }).state;
      }
      if (!sack.sacked) { fail('the sack probe was never sacked'); sack = null; }
    }
  }
  if (sack) {
    const w = enterWilderness(sack);
    if (w.wilderness?.offers[0]?.club !== target.club) fail(`out of work, the first offer is ${w.wilderness?.offers[0]?.club ?? 'nothing'}, not the agreed ${target.club}`);
    const hunt = jobHuntOf(w);
    if (hunt.open !== null || hunt.summerMove !== null) fail('the sack left the job hunt with something in flight');
    /* Wait for a second offer, then take it: the rollover must honour it.
       The agreed offer keeps the wilderness's eight week floor from firing,
       so a quiet phone is possible; after twelve weeks an offer for another
       club is written in, in the agreed offer's shape, because what is
       measured is the rollover honouring the pick, not the phone ringing. */
    let ww = w;
    for (let k = 0; k < 12 && !(ww.wilderness?.offers ?? []).some(o => o.club !== target.club); k++) ww = wildernessWeek(ww);
    let other = (ww.wilderness?.offers ?? []).find(o => o.club !== target.club);
    let written = false;
    if (!other) {
      const alt = applyTargets(sack).find(t => t.club !== target.club);
      other = { ...ww.wilderness.offers[0], club: alt.club, league: alt.league, tier: alt.tier };
      ww = { ...ww, wilderness: { ...ww.wilderness, offers: [...ww.wilderness.offers, other] } };
      written = true;
    }
    console.log(`   sacked at ${sack.clubName} in week ${sack.week} with a move to ${target.club} booked; the other job taken is ${other.club} (${written ? 'written in after twelve quiet weeks' : 'a real call'})`);
    /* The second path is a save that never went through enterWilderness: the
       booked move is still on it when the job is taken. */
    for (const [path, st] of [['through enterWilderness', ww], ['skipping enterWilderness', { ...sack, wilderness: ww.wilderness }]]) {
      const took = acceptWildernessJob(st, other.club);
      if (!took || took.clubName !== other.club) fail(`${path}: taking the ${other.club} job put the manager at ${took?.clubName ?? 'nowhere'}`);
      if (took && (jobHuntOf(took).summerMove || took.sacked || took.wilderness)) fail(`${path}: stale state crossed the new job`);
    }
    const tookAgreed = acceptWildernessJob(w, target.club);
    if (!tookAgreed || tookAgreed.clubName !== target.club) fail(`taking the agreed ${target.club} job from the out of work screen put the manager at ${tookAgreed?.clubName ?? 'nowhere'}`);
  }
  ok(`an application goes out with ${ANSWER_MAX_MATCHES} league games left and is answered in time, not with fewer; a waiting yes leads the summary; after the sack the job taken is the job you get`);
}

/* ---------- verdict ---------- */
for (const f of [ENTRY, BUNDLE, libPath.startsWith(TMP) ? libPath : null]) { if (f) { try { fs.unlinkSync(f); } catch { /* fine */ } } }
if (failures) {
  console.error(`\nsimCmApplications: ${failures} failure(s)`);
  process.exit(1);
}
console.log('\nsimCmApplications: green. The answer is earned, the limits hold, a summer move fires once, joining now moves the manager that week, and old saves load.');
