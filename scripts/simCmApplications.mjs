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
        about week ten at clubs spread across the pyramid. Each base sends ten
        applications, each from a copy carrying a different career record
        (seasons managed, trophies, title finishes, the fields the engine
        itself writes and the market reads), to targets spread across tier
        gaps, and plays on until the club answers. Acceptance must RISE with
        the manager's standing (Pearson r over the applications, floor) and
        FALL with the number of tiers he is applying up (Pearson r, ceiling,
        negative). Every answer must land on exactly the match day the
        application fixed when it went out, inside two to five (hard), the
        inbox must carry the answer from the club's board with no quoted
        speech (hard), and neither answer may be the only one that ever
        happens (band).
     2) the limits hold (hard). One open application at a time; a no shuts
        that club's door for the rest of this season and the whole of next
        and opens it the season after; three applications a season and the
        fourth is refused; the count resets with the season.
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

   Negative controls (house rule: prove the checks can fail), each a rewrite
   of a copy of src/lib/clubManagerJobHunt.ts that refuses to run if its
   anchor is not in the file. The copy is aliased over the module path, so
   the bundled engine itself reads the rewrite:
     CM_APPLICATIONS_CONTROL=deaf        STANDING_WEIGHT goes to zero, the club
       stops reading the manager's standing. Section 1's standing r must go red.
     CM_APPLICATIONS_CONTROL=twice       consumeSummerMove stops clearing the
       booked move at the rollover. Section 3 must go red.
     CM_APPLICATIONS_CONTROL=nocooldown  applyRefusal stops reading cooldowns.
       Section 2 must go red.

   Thresholds, from this harness on its own seed and on SIM_SEED=1, 2, 3
   (2026-10-01, 24 bases, 240 applications a run):
     acceptance vs standing, r        fixed 0.408 to 0.478   deaf -0.009 to 0.084   floor 0.25
     acceptance vs tiers up, r        fixed -0.483 to -0.389                        ceiling -0.20
     accepted share, percent          fixed 37.9 to 42.1                            band 12 to 75
     answers inside 2 to 5 matches    fixed 240 of 240                              hard

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
if (CONTROL && !['deaf', 'tierblind', 'twice', 'nocooldown'].includes(CONTROL)) {
  console.error(`CM_APPLICATIONS_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(1);
}
const BASES = Math.max(4, Number(process.env.CM_APPLICATIONS_BASES) || 24);
const PER_BASE = 20;

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
    if (!src.includes(from)) {
      console.error(`control cannot run: ${what} is not in the shape CM_APPLICATIONS_CONTROL=${CONTROL} rewrites (${from.slice(0, 60)}...)`);
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
} = cm;
const { simToWeek, joinClubNow } = cal;
const { applyRefusal, jobHuntOf, STANDING_WEIGHT, ANSWER_MIN_MATCHES, ANSWER_MAX_MATCHES, APPLICATIONS_PER_SEASON, LEAVING_BOARD_HIT } = jh;

if (CONTROL === 'deaf' && STANDING_WEIGHT !== 0) { console.error('the deaf control did not reach the bundled engine'); process.exit(1); }
if (CONTROL === 'tierblind' && (jh.TIER_UP_WEIGHT !== 0 || jh.TIER_DOWN_WEIGHT !== 0)) { console.error('the tierblind control did not reach the bundled engine'); process.exit(1); }

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
for (let i = 0; i < BASES && pool.length; i++) {
  const pick = pool[Math.floor((i / BASES) * pool.length) % pool.length];
  let s = startCareer(pick.club);
  s = advanceTo(s, 10);
  if (s.sacked || s.week < 6) { console.log(`   skipped ${pick.club}: sacked or stuck at week ${s.week}`); continue; }
  bases.push(s);
}
if (bases.length < Math.min(BASES, 8)) fail(`only ${bases.length} usable bases of ${BASES}`);
console.log(`   ${bases.length} bases, tiers ${[...new Set(bases.map(myTier))].sort().join(', ')}, weeks ${Math.min(...bases.map(b => b.week))} to ${Math.max(...bases.map(b => b.week))}`);

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
console.log(`   ${rows.length} answered (${sackedWaiting} sacked while waiting): ${acceptedShare.toFixed(1)} percent yes; r vs standing ${isNum(rStanding) ? rStanding.toFixed(3) : 'NaN'}, r vs tiers up ${isNum(rTier) ? rTier.toFixed(3) : 'NaN'}; standing ${Math.min(...rows.map(r => r.standing)).toFixed(0)} to ${Math.max(...rows.map(r => r.standing)).toFixed(0)}; off schedule ${offSchedule}, quoted ${badCopy}, no message ${noMessage}, wrong options ${missingOptions}`);
if (rows.length < bases.length * PER_BASE * 0.9) fail(`only ${rows.length} of ${bases.length * PER_BASE} applications were answered`);
if (!(rStanding >= 0.25)) fail(`acceptance does not rise with standing: r=${isNum(rStanding) ? rStanding.toFixed(3) : 'NaN'} (floor 0.25)`);
if (!(rTier <= -0.2)) fail(`acceptance does not fall with the tiers applied up: r=${isNum(rTier) ? rTier.toFixed(3) : 'NaN'} (ceiling -0.20)`);
if (!(acceptedShare >= 12 && acceptedShare <= 75)) fail(`${acceptedShare.toFixed(1)} percent of applications were accepted (band 12 to 75)`);
if (offSchedule) fail(`${offSchedule} answers did not land on the match day the application fixed`);
if (badCopy) fail(`${badCopy} answers carried quoted speech`);
if (noMessage) fail(`${noMessage} applications or answers left no inbox message`);
if (missingOptions) fail(`${missingOptions} answers carried the wrong options (a yes offers joinNow and joinSummer, a no offers nothing and is resolved)`);
ok(`acceptance rises with standing and falls with the tiers applied up, every answer on its fixed match day, every answer in the inbox from the club's board`);

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
  }
  ok('one open application at a time, a decline shuts the door through next season and no further, three a season and the count resets');
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

/* ---------- verdict ---------- */
for (const f of [ENTRY, BUNDLE, libPath.startsWith(TMP) ? libPath : null]) { if (f) { try { fs.unlinkSync(f); } catch { /* fine */ } } }
if (failures) {
  console.error(`\nsimCmApplications: ${failures} failure(s)`);
  process.exit(1);
}
console.log('\nsimCmApplications: green. The answer is earned, the limits hold, a summer move fires once, joining now moves the manager that week, and old saves load.');
