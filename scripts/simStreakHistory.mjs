/* Streak history and unlock dates, proven. Round 712, spec items 15 and 16.
 *
 * src/lib/streaks.ts now keeps a play diary (the days themselves) beside the
 * streak counters, and src/lib/achievementDates.ts keeps the day each
 * achievement landed. Neither can crash anything worth a harness. What can go
 * wrong is quieter: a calendar that calls a day "nothing played" when nobody
 * knows, a date that is a day off, a streak dated from a run the diary never
 * saw, a date that moves after it was shown, or the derived case quietly
 * growing a second writer. This is those questions.
 *
 * WHAT IT HOLDS:
 *   0. AS CODE. The dates module writes one key and nothing else, the streak
 *      module writes its two keys from its two recorders only, achievements.ts
 *      never reaches for the dates, the case settles dates only after its
 *      facts arrive, and the calendar is mounted on the player's OWN profile.
 *   1. THE DIARY MATCHES THE COUNTERS. A scripted month of finishes through
 *      the real recorder: the diary's days are exactly the days finishes were
 *      credited, per game and overall, with no repeats, and the runs in the
 *      diary are exactly the runs the counters report. The same finish sent
 *      five times is one day.
 *   2. THREE MARKS, NEVER TWO. A browser with streaks from before the diary:
 *      the held run is copied in as played, the days before it are unknown and
 *      never rest, a game first played after the diary began is complete, a
 *      brand new browser has no unknown days, and the calendar with no diary
 *      at all says the same thing as the one with a diary.
 *   3. THE CLOCK. The Eastern midnight either side, both daylight saving
 *      changes, a late evening finish in UTC terms, and an old tab rewriting
 *      the counters without knowing the diary exists.
 *      Every calendar week is seven real days starting on a Monday.
 *   4. DATES FROM THE GAME DAYS ARE THE CASE'S OWN ANSWER. For a synthetic
 *      player on real registry slugs, the day datesFromRows gives each
 *      achievement is compared with a plain day by day scan of the same
 *      predicates: earned that day, not earned the day before.
 *   5. DATES FROM THE DIARY RESPECT WHAT WAS HELD. A streak the counters
 *      already held when the diary began is never dated, one completed in
 *      sight of the diary is dated to the day, including a run that started
 *      before the diary and finished after.
 *   6. THE LEDGER. First sight without evidence is "before dates were kept",
 *      later sight is "earned by today", an exact day never moves, evidence
 *      only replaces a guess it does not contradict, nothing is removed, and
 *      the facts the case derives are untouched by any of it.
 *
 * NO STATISTICAL THRESHOLD ANYWHERE. Every check is an exact equality.
 *
 * NEGATIVE CONTROLS. Each rewrites a copy of the shipped source, refuses to run
 * if the string it rewrites is not there, and must turn red ONLY its section:
 *   SIM_SH_CONTROL=ledgerwrite  the dates module also writes the streak key  -> 0
 *   SIM_SH_CONTROL=publicmount  the calendar shown on anybody's profile      -> 0
 *   SIM_SH_CONTROL=dupday       a day noted twice                            -> 1
 *   SIM_SH_CONTROL=restbefore   days before the diary drawn as rest          -> 2
 *   SIM_SH_CONTROL=utcday       the streak day taken in UTC, not Eastern     -> 3
 *   SIM_SH_CONTROL=offbyone     each game day replayed with the next one's rows -> 4
 *   SIM_SH_CONTROL=noheld       runs held before the diary dated anyway      -> 5
 *   SIM_SH_CONTROL=movable      an exact date allowed to move                -> 6
 *   SIM_SH_CONTROL=seenbefore   first sight dated today instead of "before"  -> 6
 *
 * Run: node scripts/simStreakHistory.mjs
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STREAKS = 'src/lib/streaks.ts';
const DATES = 'src/lib/achievementDates.ts';
const ACH = 'src/lib/achievements.ts';
const CASE = 'src/components/profile/AchievementCase.tsx';
const HISTORY = 'src/components/profile/StreakHistory.tsx';
const PROFILE = 'src/pages/Profile.tsx';
const CONTROL = process.env.SIM_SH_CONTROL || '';

const SECTIONS = 7;
const failures = Array.from({ length: SECTIONS }, () => 0);
let section = 0;
const fail = m => { failures[section] += 1; console.error('  FAIL: ' + m); };
const abort = m => { console.error(m); process.exit(1); };
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8').split('\r\n').join('\n');
const stripComments = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '');

const CONTROLS = {
  ledgerwrite: {
    sec: 0, file: DATES,
    old: '      localStorage.setItem(LEDGER_KEY, JSON.stringify(next));',
    now: "      localStorage.setItem(LEDGER_KEY, JSON.stringify(next));\n      localStorage.setItem('dukb-streaks-v1', '{}');",
    say: 'the dates module also writes the streak counters',
  },
  publicmount: {
    sec: 0, file: PROFILE,
    old: '{isOwnProfile && <StreakHistory legacyLabels={GAME_LABELS} />}',
    now: '<StreakHistory legacyLabels={GAME_LABELS} />',
    say: 'the calendar mounted on every profile, including other people\'s',
  },
  dupday: {
    sec: 1, file: STREAKS,
    old: '  if (line.days.includes(day)) return line;',
    now: '  if (line.days.includes(day) && false) return line;',
    say: 'a replay on the same day notes the day again',
  },
  restbefore: {
    sec: 2, file: STREAKS,
    old: "      else if (from !== null && day < from) mark = 'unknown';",
    now: "      else if (from !== null && day < from) mark = 'rest';",
    say: 'days from before the diary drawn as nothing played',
  },
  utcday: {
    sec: 3, file: STREAKS,
    old: "      timeZone: 'America/New_York',",
    now: "      timeZone: 'UTC',",
    say: 'the streak day taken as the UTC date',
  },
  offbyone: {
    sec: 4, file: DATES,
    old: '  return firstDays(days, i => buildAchievementFacts(sorted.slice(0, ends[i]), empty, {}, 0), () => false);',
    now: '  return firstDays(days, i => buildAchievementFacts(sorted.slice(0, ends[Math.min(i + 1, ends.length - 1)]), empty, {}, 0), () => false);',
    say: 'every date from the game days put one game day early',
  },
  noheld: {
    sec: 5, file: DATES,
    old: '  }), def => def.earned(held));',
    now: '  }), () => false);',
    say: 'runs the counters held before the diary began get dated anyway',
  },
  movable: {
    sec: 6, file: DATES,
    old: '    if (had?.exact) continue;',
    now: '    if (had?.exact && !day) continue;',
    say: 'an exact date allowed to be rewritten by later evidence',
  },
  seenbefore: {
    sec: 6, file: DATES,
    old: '    marks[id] = prev ? { day: today, exact: false } : { day: null, exact: false };',
    now: '    marks[id] = { day: today, exact: false };',
    say: 'the first sight of an old unlock dated today instead of before dates were kept',
  },
};

if (CONTROL && !CONTROLS[CONTROL]) abort(`unknown control "${CONTROL}" (${Object.keys(CONTROLS).join(', ')})`);

/** The source as this run sees it: shipped bytes, or the control's rewrite.
 *  A control that finds nothing to rewrite aborts rather than going green. */
const sourceCache = new Map();
function sourceOf(file) {
  if (sourceCache.has(file)) return sourceCache.get(file);
  let src = read(file);
  const c = CONTROL ? CONTROLS[CONTROL] : null;
  if (c && c.file === file) {
    if (!src.includes(c.old)) abort(`control "${CONTROL}" cannot run: ${file} does not contain ${JSON.stringify(c.old)}`);
    src = src.split(c.old).join(c.now);
  }
  sourceCache.set(file, src);
  return src;
}
if (CONTROL) {
  sourceOf(CONTROLS[CONTROL].file);
  console.log(`NEGATIVE CONTROL "${CONTROL}" ON: ${CONTROLS[CONTROL].say}`);
}

/* ─── load the libraries, through the control's copy when one is on ──────── */

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'dukb-sh-'));
const fwd = f => f.replaceAll('\\', '/');
const ENTRY = path.join(TMP, 'entry.mjs');
const OUT = path.join(TMP, 'bundle.mjs');
fs.writeFileSync(ENTRY, `
const store = new Map();
globalThis.localStorage = {
  getItem: k => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(k, String(v)); },
  removeItem: k => { store.delete(k); },
  clear: () => store.clear(),
};
export const storage = store;
export const streaks = await import('${fwd(path.join(ROOT, STREAKS))}');
export const dates = await import('${fwd(path.join(ROOT, DATES))}');
export const ach = await import('${fwd(path.join(ROOT, ACH))}');
export const registry = await import('${fwd(path.join(ROOT, 'src/data/gameRegistry.ts'))}');
`);
const controlled = CONTROL ? path.resolve(ROOT, CONTROLS[CONTROL].file) : null;
await build({
  entryPoints: [ENTRY], bundle: true, format: 'esm', platform: 'node',
  outfile: OUT, logLevel: 'error', alias: { '@': path.join(ROOT, 'src') },
  plugins: [{
    name: 'control-copy',
    setup(b) {
      b.onLoad({ filter: /\.(ts|tsx)$/ }, args => {
        if (!controlled || path.resolve(args.path) !== controlled) return undefined;
        return { contents: sourceOf(CONTROLS[CONTROL].file), loader: args.path.endsWith('x') ? 'tsx' : 'ts' };
      });
    },
  }],
});
const { storage, streaks, dates, ach, registry } = await import(pathToFileURL(OUT).href);
const {
  recordGameCompletion, recordVisit, readDiary, readStreakCounters, playCalendar, runDays, getEtDateString,
} = streaks;
const { datesFromRows, datesFromDiary, settleLedger, settleUnlockDates, readUnlockLedger, unlockLabel } = dates;
const { ACHIEVEMENTS, buildAchievementFacts, earnedAchievements, emptyAchievementFacts } = ach;

/* ─── small tools ─────────────────────────────────────────────────────────── */

const DAY_MS = 86400000;
const shift = (day, n) => new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
/** Noon Eastern on an ET day, whichever side of daylight saving it falls. */
const etNoon = day => new Date(`${day}T16:30:00Z`);
const reset = () => storage.clear();
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const sortedUnique = a => [...new Set(a)].sort();
/** Longest and final run of consecutive days in an ascending day list. */
function runsOf(days) {
  let run = 0, best = 0, prev = null;
  for (const d of days) {
    run = prev !== null && Date.parse(`${d}T00:00:00Z`) - Date.parse(`${prev}T00:00:00Z`) === DAY_MS ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return { current: run, longest: best, last: prev };
}
const noStreaks = () => ({
  version: 1, global: { current: 0, longest: 0, lastDate: null }, perGame: {}, loginDates: [], totalPlays: 0, totalPoints: 0,
});
const plant = counters => storage.set('dukb-streaks-v1', JSON.stringify(counters));

/* ═══ 0: as code ══════════════════════════════════════════════════════════ */
section = 0;
console.log('0) as code: one writer per key, the case still derived, the calendar on your own profile only');
{
  const datesCode = stripComments(sourceOf(DATES));
  const sets = datesCode.match(/localStorage\s*\.\s*setItem\s*\(([^,]+),/g) || [];
  if (sets.length !== 1) fail(`${DATES} writes localStorage ${sets.length} times, expected exactly one ledger write`);
  else if (!/setItem\s*\(\s*LEDGER_KEY\s*,/.test(sets[0])) fail(`${DATES} writes something other than its own ledger key: ${sets[0]}`);
  if (!/const LEDGER_KEY = 'dukb-achievement-dates-v1';/.test(datesCode)) fail(`${DATES} does not pin its ledger key`);
  for (const [re, name] of [
    [/localStorage\s*\.\s*(removeItem|clear)\s*\(/, 'a localStorage removal'],
    [/\bsupabase\b/, 'supabase'],
    [/\.(insert|upsert|update|delete)\s*\(/, 'a table write'],
    [/\b(recordCompletion|recordActivity|recordStreakDay|recordGameCompletion|recordVisit|saveAuthCompletion|writeState|writeDiary)\s*\(/, 'a recorder call'],
  ]) if (re.test(datesCode)) fail(`${DATES} contains ${name}; it may only write its ledger`);

  const streakCode = stripComments(sourceOf(STREAKS));
  const streakSets = streakCode.match(/localStorage\s*\.\s*setItem\s*\(\s*([A-Z_]+)/g) || [];
  const keys = streakSets.map(s => s.replace(/.*\(\s*/, '')).sort();
  if (!same(keys, ['DIARY_KEY', 'STORAGE_KEY'])) fail(`${STREAKS} writes ${JSON.stringify(keys)}, expected exactly its counters and its diary`);
  const diaryWrites = (streakCode.match(/\bwriteDiary\s*\(/g) || []).length;
  if (diaryWrites !== 3) fail(`${STREAKS} has ${diaryWrites} writeDiary( sites, expected the definition plus the two recorders`);
  for (const fn of ['recordGameCompletion', 'recordVisit']) {
    const body = (streakCode.match(new RegExp(`export function ${fn}\\([\\s\\S]*?\\n}\\n`)) || [''])[0];
    if (!/writeDiary\s*\(/.test(body)) fail(`${fn} no longer writes the diary`);
  }

  const achCode = stripComments(sourceOf(ACH));
  if (/achievementDates|settleUnlockDates/.test(achCode)) fail(`${ACH} reaches into the unlock dates; the case has to stay derived`);
  if (/localStorage\s*\.\s*(setItem|removeItem|clear)/.test(achCode)) fail(`${ACH} writes localStorage`);

  const caseCode = stripComments(sourceOf(CASE));
  const settles = (caseCode.match(/\bsettleUnlockDates\s*\(/g) || []).length;
  const thenBlock = (caseCode.match(/loadAchievementEvidence\([\s\S]*?\.then\(([\s\S]*?)\n\s*\}\);/) || [])[1] || '';
  if (settles !== 1) fail(`${CASE} settles dates ${settles} times, expected once`);
  else if (!/settleUnlockDates\s*\(/.test(thenBlock)) fail(`${CASE} settles dates outside the arrival of its facts`);
  if (/localStorage/.test(caseCode)) fail(`${CASE} touches localStorage itself`);

  const histCode = stripComments(sourceOf(HISTORY));
  if (/localStorage|\b(recordGameCompletion|recordVisit|writeDiary|settleUnlockDates)\s*\(/.test(histCode)) fail(`${HISTORY} writes something; the calendar only reads`);
  if (!/<Card[^>]*\bdata-no-prerender\b/.test(histCode)) fail(`${HISTORY} is not marked data-no-prerender, and it is a picture of today`);

  const profile = stripComments(sourceOf(PROFILE));
  const mounts = profile.match(/[^\n]*<StreakHistory\b[^\n]*/g) || [];
  if (mounts.length !== 1) fail(`${PROFILE} mounts the calendar ${mounts.length} times, expected once`);
  else if (!/isOwnProfile\s*&&\s*<StreakHistory\b/.test(mounts[0])) fail(`${PROFILE} mounts the calendar without the own profile guard: ${mounts[0].trim()}`);
  if (!/isOwnProfile\s*&&\s*\(\s*<AchievementCase\b/.test(profile)) fail(`${PROFILE} no longer mounts the achievement case behind the own profile guard`);
  console.log(`   ledger writes ${sets.length}, streak keys ${keys.join(' and ')}, diary write sites ${diaryWrites}, case settles ${settles} time(s) inside its load, calendar mounts ${mounts.length}`);
}

/* ═══ 1: the diary matches the counters ═════════════════════════════════════ */
section = 1;
console.log('1) the diary: a scripted month through the real recorder, day for day');
{
  reset();
  const GAMES = ['soccer-grid', 'footle', 'club-manager', 'nba-chain'];
  let seed = 712;
  const rand = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  const start = '2026-08-03';
  const want = { global: [], perGame: {} };
  let calls = 0;
  for (let i = 0; i < 40; i++) {
    const day = shift(start, i);
    if (rand() < 0.2) continue;
    const n = 1 + Math.floor(rand() * 4);
    for (let k = 0; k < n; k++) {
      const slug = GAMES[Math.floor(rand() * GAMES.length)];
      const t = new Date(etNoon(day).getTime() + k * 3600000);
      recordGameCompletion(slug, t, 10);
      if (rand() < 0.3) recordGameCompletion(slug, t, 10);
      calls += 1;
      want.global.push(day);
      (want.perGame[slug] ??= []).push(day);
      const d = readDiary();
      if (!d) { fail(`no diary after finish ${calls}`); break; }
      if (!same(d.global.days, sortedUnique(d.global.days))) fail(`the overall line repeats or disorders a day after finish ${calls}`);
    }
  }
  const diary = readDiary();
  const counters = readStreakCounters();
  if (!diary) fail('no diary at the end of the month');
  else {
    if (!same(diary.global.days, sortedUnique(want.global))) fail(`overall days differ: diary ${diary.global.days.length}, credited ${sortedUnique(want.global).length}`);
    if (diary.global.from !== null) fail(`a brand new browser's line should vouch for every day, got from ${diary.global.from}`);
    for (const slug of GAMES) {
      const got = diary.perGame[slug]?.days ?? [];
      const exp = sortedUnique(want.perGame[slug] ?? []);
      if (!same(got, exp)) fail(`${slug}: diary has ${got.length} days, credited ${exp.length}`);
      const r = runsOf(exp);
      const c = counters.perGame[slug];
      if (exp.length && (!c || c.longest !== r.longest || c.current !== r.current || c.lastDate !== r.last)) {
        fail(`${slug}: the diary's runs (${r.current} now, ${r.longest} best) disagree with the counters (${c?.current} now, ${c?.longest} best)`);
      }
    }
    const r = runsOf(diary.global.days);
    if (r.longest !== counters.global.longest || r.current !== counters.global.current) {
      fail(`overall: the diary's runs (${r.current} now, ${r.longest} best) disagree with the counters (${counters.global.current}, ${counters.global.longest})`);
    }
    const counted = runDays(counters.global);
    if (!counted.every(d => diary.global.days.includes(d))) fail('the counters\' own run is not all in the diary');
    /* duplicate submissions: the same finish five times in a row is one day */
    const before = readDiary();
    for (let k = 0; k < 5; k++) recordGameCompletion('footle', etNoon(shift(start, 45)), 10);
    const after = readDiary();
    const added = after.global.days.length - before.global.days.length;
    if (added !== 1) fail(`the same finish sent five times added ${added} overall days, expected 1`);
    if (after.perGame.footle.days.filter(d => d === shift(start, 45)).length !== 1) fail('the same finish sent five times repeats the day on its game line');
    console.log(`   ${calls} finishes over 40 days (some sent twice): ${diary.global.days.length} played days, best run ${r.longest}, runs agree with the counters on ${GAMES.length} games and overall`);
  }
}

/* ═══ 2: three marks, never two ═════════════════════════════════════════════ */
section = 2;
console.log('2) three marks: played, rest, and unknown for what nobody saw');
{
  reset();
  plant({
    version: 1,
    global: { current: 5, longest: 9, lastDate: '2026-09-20' },
    perGame: {
      footle: { current: 2, longest: 3, lastDate: '2026-09-19' },
      'soccer-grid': { current: 1, longest: 12, lastDate: '2026-08-01' },
    },
    loginDates: [], totalPlays: 40, totalPoints: 1000,
  });
  const beforeDiary = playCalendar(null, readStreakCounters().global, '2026-09-21', 8);
  recordVisit(etNoon('2026-09-21'));
  const d = readDiary();
  if (!d) fail('the first visit did not start a diary');
  else {
    if (d.keptSince !== '2026-09-21') fail(`keptSince ${d.keptSince}, expected the visit day`);
    if (!same(d.global, { from: '2026-09-16', days: ['2026-09-16', '2026-09-17', '2026-09-18', '2026-09-19', '2026-09-20'] })) fail(`the held run was not copied in: ${JSON.stringify(d.global)}`);
    if (!same(d.perGame.footle, { from: '2026-09-18', days: ['2026-09-18', '2026-09-19'] })) fail(`footle's held run: ${JSON.stringify(d.perGame.footle)}`);
    if (!same(d.heldAtStart, { longest: 9, bestGameStreak: 12 })) fail(`heldAtStart ${JSON.stringify(d.heldAtStart)}, expected the counters' bests`);
    const cal = playCalendar(d.global, readStreakCounters().global, '2026-09-21', 8).flat();
    const markOf = day => cal.find(c => c.day === day)?.mark;
    for (const day of ['2026-09-16', '2026-09-20']) if (markOf(day) !== 'played') fail(`${day} should be played, got ${markOf(day)}`);
    if (markOf('2026-09-21') !== 'rest') fail(`today with no finish should be rest, got ${markOf('2026-09-21')}`);
    const early = cal.filter(c => c.day < '2026-09-16');
    const wrong = early.filter(c => c.mark !== 'unknown');
    if (!early.length) fail('the calendar holds no day before the diary, so the unknown mark is not being tested');
    if (wrong.length) fail(`${wrong.length} day(s) before the diary are marked ${wrong[0].mark} instead of unknown, first ${wrong[0].day}`);
    if (cal.some(c => c.day > '2026-09-21' && c.mark !== 'ahead')) fail('a day after today is not marked ahead');
    if (!same(beforeDiary.flat(), cal)) fail('the calendar before the diary existed disagrees with the one after');
    console.log(`   held run of 5 copied in, ${early.length} earlier days unknown, today rest, ${cal.filter(c => c.mark === 'ahead').length} days ahead, same picture with and without the diary`);

    recordGameCompletion('nba-chain', etNoon('2026-09-22'), 5);
    const fresh = readDiary().perGame['nba-chain'];
    if (!fresh || fresh.from !== null) fail(`a game first played after the diary began should vouch for every day, got ${JSON.stringify(fresh)}`);
    const nbaCal = playCalendar(fresh, readStreakCounters().perGame['nba-chain'], '2026-09-22', 8).flat();
    if (nbaCal.some(c => c.mark === 'unknown')) fail('a game first played after the diary began shows unknown days');
  }
  reset();
  recordVisit(etNoon('2026-09-21'));
  const blank = playCalendar(readDiary()?.global, readStreakCounters().global, '2026-09-21', 8).flat();
  if (blank.some(c => c.mark === 'unknown' || c.mark === 'played')) fail('a brand new browser shows played or unknown days');
  console.log(`   a new game and a brand new browser: every day before today is rest, ${blank.filter(c => c.mark === 'rest').length} of them`);
}

/* ═══ 3: the clock ══════════════════════════════════════════════════════════ */
section = 3;
console.log('3) the clock: Eastern midnight, both daylight saving changes, an old tab');
{
  const scenario = (label, instants, wantDays) => {
    reset();
    for (const t of instants) recordGameCompletion('footle', new Date(t), 1);
    const got = readDiary()?.global.days ?? [];
    if (!same(got, wantDays)) fail(`${label}: diary days ${JSON.stringify(got)}, expected ${JSON.stringify(wantDays)}`);
    const c = readStreakCounters().global;
    if (c.current !== wantDays.length) fail(`${label}: the counters say ${c.current} in a row, expected ${wantDays.length}`);
    return got;
  };
  scenario('either side of Eastern midnight', ['2026-09-29T03:59:30Z', '2026-09-29T04:00:30Z'], ['2026-09-28', '2026-09-29']);
  scenario('spring forward, 8 March 2026', ['2026-03-08T04:30:00Z', '2026-03-09T03:30:00Z', '2026-03-09T04:30:00Z'], ['2026-03-07', '2026-03-08', '2026-03-09']);
  scenario('fall back, 1 November 2026', ['2026-11-01T03:30:00Z', '2026-11-02T04:30:00Z', '2026-11-02T05:30:00Z'], ['2026-10-31', '2026-11-01', '2026-11-02']);
  scenario('late evening Eastern is the next day in UTC', ['2026-09-30T02:00:00Z'], ['2026-09-29']);
  if (getEtDateString(new Date('2026-07-04T03:30:00Z')) !== '2026-07-03') fail('getEtDateString puts 23:30 Eastern on 3 July on the wrong day');

  /* an old tab: rewrites the counters in the previous build's shape, which
     knows nothing of the diary. The diary must come through untouched. */
  reset();
  recordGameCompletion('footle', etNoon('2026-09-10'), 1);
  recordGameCompletion('footle', etNoon('2026-09-11'), 1);
  const kept = readDiary();
  const old = readStreakCounters();
  plant({ version: 1, global: old.global, perGame: old.perGame, loginDates: old.loginDates, totalPlays: old.totalPlays, totalPoints: old.totalPoints });
  if (!same(readDiary(), kept)) fail('an old tab rewriting the counters changed the diary');

  for (const today of ['2026-03-15', '2026-11-08', '2026-09-30']) {
    const cal = playCalendar(null, null, today, 8);
    const flat = cal.flat();
    if (cal.length !== 8 || cal.some(w => w.length !== 7)) fail(`${today}: the calendar is not eight weeks of seven`);
    for (let i = 1; i < flat.length; i++) {
      if (Date.parse(`${flat[i].day}T00:00:00Z`) - Date.parse(`${flat[i - 1].day}T00:00:00Z`) !== DAY_MS) { fail(`${today}: ${flat[i - 1].day} is not followed by the next day`); break; }
    }
    if (new Date(`${flat[0].day}T00:00:00Z`).getUTCDay() !== 1) fail(`${today}: the first column does not start on a Monday`);
    if (!cal[7].some(c => c.day === today)) fail(`${today}: today is not in the last week`);
  }
  console.log('   midnight, spring forward, fall back and a UTC evening all land on the right Eastern days; an old tab leaves the diary alone; 3 calendars across the clock changes are 56 straight days from a Monday');
}

/* ═══ 4: dates from the game days are the case's own answer ════════════════ */
section = 4;
console.log('4) dates from the game days: the first day the case\'s own predicates say yes');
{
  const slugs = registry.CATEGORIES.filter(c => c.games.length).map(c => c.games.map(g => g.path.replace(/^\//, '')));
  const rows = [];
  let seed = 527;
  const rand = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  for (let i = 0; i < 60; i++) {
    const day = shift('2026-06-01', i);
    if (rand() < 0.3) continue;
    const wide = i === 33 ? 12 : 1 + Math.floor(rand() * 4);
    const picked = new Set();
    for (let k = 0; k < wide; k++) {
      const cat = slugs[Math.floor(rand() * Math.min(slugs.length, i < 20 ? 2 : slugs.length))];
      picked.add(cat[Math.floor(rand() * Math.min(cat.length, 6))]);
    }
    for (const game of picked) rows.push({ game, completed_on: day });
  }
  const shuffled = [...rows].sort(() => 0).reverse();
  const got = datesFromRows(shuffled);
  const days = sortedUnique(rows.map(r => r.completed_on));
  const factsTo = day => buildAchievementFacts(rows.filter(r => r.completed_on <= day), noStreaks(), {}, 0);
  const want = {};
  for (const day of days) {
    const f = factsTo(day);
    for (const def of ACHIEVEMENTS) if (!(def.id in want) && def.earned(f)) want[def.id] = day;
  }
  for (const id of new Set([...Object.keys(want), ...Object.keys(got)])) {
    if (want[id] !== got[id]) fail(`"${id}": dated ${got[id] ?? 'never'}, the day by day scan says ${want[id] ?? 'never'}`);
  }
  const rowOnly = new Set(Object.keys(want));
  for (const id of ['streak-5', 'streak-21', 'game-streak-10', 'points-5000', 'scored-10']) {
    if (id in got) fail(`"${id}" was dated from game days, but nothing in them measures it`);
  }
  if (rowOnly.size < 8) fail(`only ${rowOnly.size} achievements dated, the fixture is too thin to test anything`);
  const final = earnedAchievements(buildAchievementFacts(rows, noStreaks(), {}, 0)).map(d => d.id);
  const undated = final.filter(id => !(id in got));
  if (undated.length) fail(`earned from the game days but left undated: ${undated.join(', ')}`);
  console.log(`   ${rows.length} game days over ${days.length} days: ${Object.keys(got).length} achievements dated, every one matching the day by day scan (${Object.entries(got).slice(0, 4).map(([k, v]) => `${k} ${v}`).join(', ')}, ...)`);
}

/* ═══ 5: dates from the diary respect what was held ═════════════════════════ */
section = 5;
console.log('5) dates from the diary: never for a run the diary did not see');
{
  // A: four in a row before the diary, the fifth after it
  reset();
  plant({ version: 1, global: { current: 4, longest: 4, lastDate: '2026-09-09' }, perGame: { footle: { current: 4, longest: 4, lastDate: '2026-09-09' } }, loginDates: [], totalPlays: 4, totalPoints: 0 });
  recordGameCompletion('footle', etNoon('2026-09-10'), 1);
  const a = datesFromDiary(readDiary());
  if (a['streak-5'] !== '2026-09-10') fail(`a run of four before the diary and one after: streak-5 dated ${a['streak-5'] ?? 'never'}, expected 2026-09-10`);
  if ('game-streak-10' in a) fail('game-streak-10 dated for a five day run');

  // B: the counters already held 30 days; the diary then sees 21
  reset();
  plant({ version: 1, global: { current: 1, longest: 30, lastDate: '2026-07-01' }, perGame: { footle: { current: 1, longest: 30, lastDate: '2026-07-01' } }, loginDates: [], totalPlays: 30, totalPoints: 0 });
  for (let i = 0; i < 21; i++) recordGameCompletion('footle', etNoon(shift('2026-08-01', i)), 1);
  const b = datesFromDiary(readDiary());
  for (const id of ['streak-5', 'streak-21', 'game-streak-10']) {
    if (id in b) fail(`"${id}" dated ${b[id]} although the counters held a 30 day run before the diary began`);
  }

  // C: a brand new browser, ten days on one game
  reset();
  for (let i = 0; i < 10; i++) recordGameCompletion('footle', etNoon(shift('2026-09-01', i)), 1);
  const c = datesFromDiary(readDiary());
  if (c['streak-5'] !== '2026-09-05') fail(`new browser: streak-5 dated ${c['streak-5'] ?? 'never'}, expected 2026-09-05`);
  if (c['game-streak-10'] !== '2026-09-10') fail(`new browser: game-streak-10 dated ${c['game-streak-10'] ?? 'never'}, expected 2026-09-10`);
  if ('streak-21' in c) fail('new browser: streak-21 dated after ten days');
  console.log(`   straddling run dated ${a['streak-5'] ?? 'never'}; held 30 day run dates ${Object.keys(b).length} streak achievements; new browser dates ${Object.entries(c).map(([k, v]) => `${k} ${v}`).join(', ')}`);
}

/* ═══ 6: the ledger ═════════════════════════════════════════════════════════ */
section = 6;
console.log('6) the ledger: true on every line, and a shown date never moves');
{
  const first = settleLedger(null, ['first-finish', 'points-5000'], { 'first-finish': '2026-06-02' }, '2026-09-30');
  if (!same(first.marks['first-finish'], { day: '2026-06-02', exact: true })) fail(`first sight with evidence: ${JSON.stringify(first.marks['first-finish'])}`);
  if (!same(first.marks['points-5000'], { day: null, exact: false })) fail(`first sight without evidence should be before dates were kept: ${JSON.stringify(first.marks['points-5000'])}`);
  if (first.keptSince !== '2026-09-30') fail(`keptSince ${first.keptSince}`);

  const later = settleLedger(first, ['first-finish', 'points-5000', 'scored-10', 'plays-10'], { 'first-finish': '2026-01-01', 'plays-10': '2026-10-02' }, '2026-10-03');
  if (!same(later.marks['first-finish'], { day: '2026-06-02', exact: true })) fail(`an exact day moved: ${JSON.stringify(later.marks['first-finish'])}`);
  if (!same(later.marks['scored-10'], { day: '2026-10-03', exact: false })) fail(`later sight without evidence should be earned by today: ${JSON.stringify(later.marks['scored-10'])}`);
  if (!same(later.marks['plays-10'], { day: '2026-10-02', exact: true })) fail(`later sight with evidence: ${JSON.stringify(later.marks['plays-10'])}`);
  if (!same(later.marks['points-5000'], { day: null, exact: false })) fail('a before mark changed with no evidence');

  const guessed = settleLedger(later, ['scored-10'], { 'scored-10': '2026-10-05' }, '2026-10-06');
  if (!same(guessed.marks['scored-10'], { day: '2026-10-03', exact: false })) fail(`evidence later than "earned by" replaced it: ${JSON.stringify(guessed.marks['scored-10'])}`);
  const firmed = settleLedger(later, ['scored-10', 'points-5000'], { 'scored-10': '2026-10-01', 'points-5000': '2026-09-29' }, '2026-10-06');
  if (!same(firmed.marks['scored-10'], { day: '2026-10-01', exact: true })) fail(`evidence inside "earned by" did not firm it up: ${JSON.stringify(firmed.marks['scored-10'])}`);
  if (!same(firmed.marks['points-5000'], { day: '2026-09-29', exact: true })) fail(`evidence before the ledger began did not date a before mark: ${JSON.stringify(firmed.marks['points-5000'])}`);
  const late = settleLedger(later, ['points-5000'], { 'points-5000': '2026-10-01' }, '2026-10-06');
  if (!same(late.marks['points-5000'], { day: null, exact: false })) fail('a before mark was dated after the ledger began, which contradicts it');

  const dropped = settleLedger(later, [], {}, '2026-10-07');
  if (!same(dropped.marks, later.marks)) fail('a mark was removed when the case stopped reporting it');

  if (unlockLabel({ day: null, exact: false }) !== 'Earned before dates were kept') fail(`label for before: ${unlockLabel({ day: null, exact: false })}`);
  if (unlockLabel({ day: '2026-09-12', exact: true }) !== 'Earned 12 Sep 2026') fail(`label for exact: ${unlockLabel({ day: '2026-09-12', exact: true })}`);
  if (unlockLabel({ day: '2026-09-30', exact: false }) !== 'Earned by 30 Sep 2026') fail(`label for seen: ${unlockLabel({ day: '2026-09-30', exact: false })}`);

  /* the whole path over storage, and the facts it was handed stay as they were */
  reset();
  for (let i = 0; i < 6; i++) recordGameCompletion('footle', etNoon(shift('2026-09-01', i)), 1);
  const rows = [{ game: 'footle', completed_on: '2026-09-01' }, { game: 'soccer-grid', completed_on: '2026-09-02' }];
  const facts = buildAchievementFacts(rows, readStreakCounters(), {}, 0);
  const frozen = JSON.stringify(facts);
  const ids = earnedAchievements(facts).map(d => d.id);
  const m1 = settleUnlockDates(ids, rows);
  const m2 = settleUnlockDates(ids, rows);
  if (JSON.stringify(facts) !== frozen) fail('settling the dates changed the facts it was given');
  if (!same(m1, m2)) fail('settling twice gave two answers');
  if (!same(Object.keys(m1).sort(), [...ids].sort())) fail(`marks ${JSON.stringify(Object.keys(m1))} are not the earned ids ${JSON.stringify(ids)}`);
  if (m1['first-finish']?.day !== '2026-09-01' || !m1['first-finish']?.exact) fail(`first-finish through the whole path: ${JSON.stringify(m1['first-finish'])}`);
  if (m1['streak-5']?.day !== '2026-09-05' || !m1['streak-5']?.exact) fail(`streak-5 through the whole path: ${JSON.stringify(m1['streak-5'])}`);
  if (!readUnlockLedger()) fail('the ledger was not saved');
  if (!same(earnedAchievements(facts).map(d => d.id), ids)) fail('the earned set moved after the dates were settled');
  console.log(`   first sight, later sight, contradiction and removal rules hold; the whole path dates ${Object.keys(m1).length} earned ones (${Object.entries(m1).map(([k, v]) => `${k} ${v.day}`).join(', ')}) and leaves the facts alone`);
}

/* ─── verdict ─────────────────────────────────────────────────────────────── */

fs.rmSync(TMP, { recursive: true, force: true });
const red = failures.map((n, i) => (n ? i : -1)).filter(i => i >= 0);
if (CONTROL) {
  const want = CONTROLS[CONTROL].sec;
  const ok = red.length === 1 && red[0] === want;
  console.log(`\nCONTROL "${CONTROL}": red sections ${red.length ? red.join(', ') : 'none'}, expected only ${want}. ${ok ? 'The check can fail, and only its own.' : 'THE CONTROL DID NOT DO WHAT IT SHOULD.'}`);
  process.exit(ok ? 0 : 1);
}
const total = failures.reduce((a, b) => a + b, 0);
console.log(`\nsimStreakHistory: ${total ? `${total} failure(s) in section(s) ${red.join(', ')}` : `all ${SECTIONS} sections green`}`);
process.exit(total ? 1 : 0);
