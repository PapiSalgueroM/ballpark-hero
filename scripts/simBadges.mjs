/**
 * simBadges: Round 981. Every profile badge is earned exactly when its rule
 * says, no two badges are the same badge, All Rounder can be reached, and a
 * signed in player on a second device sees the account's badges.
 *
 * It drives the real getBadgeState (src/lib/badges.ts) over scripted players.
 * A player is this browser's storage (the streak record and the play diary,
 * written in their stored shape), the account's game_completions rows and the
 * account's server totals. The database client is replaced by a stub that
 * answers from the script and has no network at all, so nothing here can
 * reach the live project.
 *
 * Deterministic: no random draws, so there are no seeds and no bands, and
 * every check is exact. Every scripted day is a fixed date. The one clock is
 * section 4's: the account's last play is stamped with the run's own time,
 * so the server streak is always one day old at most and always live (the
 * verdict cannot move with the date). Measured on the branch, 2026-10-03:
 * 17 badges, 17 rules, 7 metrics, 136 badge pairs all separated, every
 * registry category reached by at least one recorded slug (the counts print
 * in section 3). 2026-10-05: 113 literal slugs (the US career boards moved to
 * a variable slug on main) plus the mapped slugs of Round 376.
 *
 * SECTIONS
 *   0  the rule table: one rule per badge, one clean number per rule, and
 *      every counted badge's description says its rule's number
 *   1  the threshold walk: every badge at its number earns, one short does
 *      not, and every step of each ladder earns exactly the rungs at or
 *      below it (through getBadgeState, from this browser's storage). Also
 *      Perfect Week beside a best run: 13 days in a row always hold a full
 *      week, 12 from a Tuesday do not; and completion rows, matched by a
 *      name other accounts can share, never earn a games badge or a week
 *   2  no two badges share a predicate: for every pair, a scripted player
 *      earns one and not the other
 *   3  All Rounder is reachable: every registry category has a game whose
 *      recorded completion slug maps back to it, every slug Round 376 maps
 *      to a path counts for that path's category, and a player with one
 *      play per category earns it while one category short does not
 *   4  the second device: a player with nothing in this browser and
 *      everything on the account earns the account's badges, and the
 *      profile's own totals show no zero beside a real points total. The
 *      page itself is fenced by shape here (every tile reads the one merge);
 *      the rendered page is src/test/profileSecondDevice.test.tsx's job
 *
 * NEGATIVE CONTROLS. Each rewrites a copy of the shipped source, refuses to
 * run if the text it rewrites is gone, and must turn its own section red:
 *   SIM_BADGES_CONTROL=twonumbers   a rule carries two numbers          -> 0
 *   SIM_BADGES_CONTROL=descdrift    a rule's number leaves its words    -> 0
 *   SIM_BADGES_CONTROL=offbyone     the at-least test becomes above     -> 1
 *   SIM_BADGES_CONTROL=runweek      a best run no longer vouches a week -> 1
 *   SIM_BADGES_CONTROL=rowfacts     shared-name rows count games again  -> 1
 *   SIM_BADGES_CONTROL=perfectweek  Perfect Week back to a 7 day streak -> 2
 *   SIM_BADGES_CONTROL=strayslug    category lookup keeps the slash     -> 3
 *   SIM_BADGES_CONTROL=nomap        Round 376's slug map is skipped     -> 3
 *   SIM_BADGES_CONTROL=localpoints  the points badges read local only   -> 4
 *   SIM_BADGES_CONTROL=profilelocal the profile drops the server half   -> 4
 *   SIM_BADGES_CONTROL=profiletiles Games Played reads this browser     -> 4
 *     (profiletiles is the round's original bug, line for line)
 *
 * Run: node scripts/simBadges.mjs   (closing line: "simBadges: all 5 sections green")
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BADGES = 'src/lib/badges.ts';
const PROFILE = 'src/pages/Profile.tsx';
const CONTROL = process.env.SIM_BADGES_CONTROL || '';

const SECTIONS = 5;
const failures = Array.from({ length: SECTIONS }, () => 0);
let section = 0;
const fail = m => { failures[section] += 1; console.error('  FAIL: ' + m); };
const abort = m => { console.error(m); process.exit(1); };
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8').split('\r\n').join('\n');
const stripComments = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '');

const CONTROLS = {
  twonumbers: {
    sec: 0, file: BADGES,
    old: "  'variety-5': { metric: 'bestDayVariety', atLeast: 5 },",
    now: "  'variety-5': { metric: 'bestDayVariety', atLeast: 5, atMost: 9 },",
    say: 'a rule with two numbers, so which one it means is a guess',
  },
  offbyone: {
    sec: 1, file: BADGES,
    old: '  if (typeof rule.atLeast === \'number\') return raw >= rule.atLeast;',
    now: '  if (typeof rule.atLeast === \'number\') return raw > rule.atLeast;',
    say: 'every at-least rule needs one more than its number',
  },
  perfectweek: {
    sec: 2, file: BADGES,
    old: "  'perfect-week': { metric: 'fullWeeks', atLeast: 1 },",
    now: "  'perfect-week': { metric: 'longestStreak', atLeast: 7 },",
    say: 'Perfect Week is On Fire again (the bug this round removed)',
  },
  descdrift: {
    sec: 0, file: BADGES,
    old: "  'points-1000': { metric: 'totalPoints', atLeast: 1000 },",
    now: "  'points-1000': { metric: 'totalPoints', atLeast: 100 },",
    say: 'Point Hunter unlocks at 100 while its words still say 1,000',
  },
  runweek: {
    sec: 1, file: BADGES,
    old: '    fullWeeks: Math.max(diaryWeeks, runWeeks),',
    now: '    fullWeeks: diaryWeeks,',
    say: 'a best run of 13 days no longer vouches for a full week',
  },
  rowfacts: {
    sec: 1, file: BADGES,
    old: '    gamesPlayed: totals.gamesPlayed,',
    now: '    gamesPlayed: Math.max(totals.gamesPlayed, goodRows.length),',
    say: 'completion rows matched by a shared name count as games again',
  },
  strayslug: {
    sec: 3, file: BADGES,
    old: '  const path = COMPLETION_SLUG_TO_PATH[slug] ?? `/${slug}`;',
    now: '  const path = COMPLETION_SLUG_TO_PATH[slug] ?? slug;',
    say: 'a recorded slug compared with a path that still has its slash',
  },
  nomap: {
    sec: 3, file: BADGES,
    old: '  const path = COMPLETION_SLUG_TO_PATH[slug] ?? `/${slug}`;',
    now: '  const path = `/${slug}`;',
    say: 'the six games that record under another name lose their category',
  },
  localpoints: {
    sec: 4, file: BADGES,
    old: '  const totalPoints = Math.max(lp, sp);',
    now: '  const totalPoints = lp;',
    say: 'the points total (and so both points badges) read this browser only',
  },
  profilelocal: {
    sec: 4, file: PROFILE,
    old: '    getBadgeState(profile, serverTotals).then(result => {',
    now: '    getBadgeState(profile).then(result => {',
    say: 'the profile asks for badges without the account half',
  },
  profiletiles: {
    sec: 4, file: PROFILE,
    old: '  const totalGames = totals.gamesPlayed;',
    now: '  const totalGames = isOwnProfile ? localTotalPlays : totals.gamesPlayed;',
    say: 'Games Played on your own profile reads this browser only (the bug this round fixed)',
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

/* ─── load the library, through the control's copy when one is on ──────── */

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'dukb-badges-'));
const fwd = f => f.replaceAll('\\', '/');
const ENTRY = path.join(TMP, 'entry.mjs');
const OUT = path.join(TMP, 'bundle.mjs');
/* The database client, replaced: it answers game_completions reads from the
   script and has no network at all. Any other table is a harness bug. */
const STUB = path.join(TMP, 'supabaseStub.mjs');
fs.writeFileSync(STUB, `
const answer = table => {
  if (table !== 'game_completions') throw new Error('simBadges stub: unexpected table ' + table);
  return { data: globalThis.__SIM_ROWS__ ?? [], error: null };
};
function query(table) {
  const q = {};
  for (const m of ['select', 'eq', 'order', 'limit', 'gt', 'in']) q[m] = () => q;
  q.then = (ok, bad) => Promise.resolve().then(() => answer(table)).then(ok, bad);
  return q;
}
export const SUPABASE_URL = 'http://stub.invalid';
export const SUPABASE_PUBLISHABLE_KEY = 'stub';
export const supabase = {
  from: query,
  rpc: () => { throw new Error('simBadges stub: no rpc'); },
  auth: { getSession: async () => ({ data: { session: null } }) },
};
`);
fs.writeFileSync(ENTRY, `
const store = new Map();
globalThis.localStorage = {
  getItem: k => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(k, String(v)); },
  removeItem: k => { store.delete(k); },
  clear: () => store.clear(),
};
export const storage = store;
export const badges = await import('${fwd(path.join(ROOT, BADGES))}');
export const registry = await import('${fwd(path.join(ROOT, 'src/data/gameRegistry.ts'))}');
export const slugMap = await import('${fwd(path.join(ROOT, 'src/data/completionSlugs.ts'))}');
`);
const controlled = CONTROL ? path.resolve(ROOT, CONTROLS[CONTROL].file) : null;
await build({
  entryPoints: [ENTRY], bundle: true, format: 'esm', platform: 'node',
  outfile: OUT, logLevel: 'error', alias: { '@': path.join(ROOT, 'src') },
  plugins: [{
    name: 'stub-and-control',
    setup(b) {
      b.onResolve({ filter: /integrations\/supabase\/client$/ }, () => ({ path: STUB }));
      b.onLoad({ filter: /\.(ts|tsx)$/ }, args => {
        if (!controlled || path.resolve(args.path) !== controlled) return undefined;
        return { contents: sourceOf(CONTROLS[CONTROL].file), loader: args.path.endsWith('x') ? 'tsx' : 'ts' };
      });
    },
  }],
});
const { storage, badges, registry, slugMap } = await import(pathToFileURL(OUT).href);
const { BADGE_DEFS, BADGE_RULES, getBadgeState, ownTotals, categoryForSlug, fullCalendarWeeks } = badges;
const { CATEGORIES } = registry;
const { COMPLETION_SLUG_TO_PATH } = slugMap;

/* ─── scripted players ────────────────────────────────────────────────── */

const DAY_MS = 86400000;
/** Monday 2026-01-05 plus n days. Fixed dates, so no clock in any verdict. */
const day = n => new Date(Date.parse('2026-01-05T00:00:00Z') + n * DAY_MS).toISOString().slice(0, 10);
const PAST = '2025-06-01';

/** Every recorded completion slug in src: what game_completions.game holds. */
function recordedSlugs() {
  const out = new Set();
  const walkDir = dir => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) { if (ent.name !== 'test') walkDir(p); continue; }
      if (!/\.(ts|tsx)$/.test(ent.name) || /\.test\.tsx?$/.test(ent.name)) continue;
      const code = stripComments(fs.readFileSync(p, 'utf8'));
      for (const m of code.matchAll(/useGameCompletion\(\s*['"]([a-z0-9-]+)['"]/g)) out.add(m[1]);
      for (const m of code.matchAll(/recordCompletion\(\s*['"]\/([a-z0-9-]+)['"]/g)) out.add(m[1]);
    }
  };
  walkDir(path.join(ROOT, 'src'));
  return [...out].sort();
}
const SLUGS = recordedSlugs();
const nonEmptyCats = CATEGORIES.filter(c => c.games.length > 0).map(c => c.title);
/** One recorded slug per category (the first that maps), or none. */
const slugFor = Object.fromEntries(nonEmptyCats.map(t => [t, SLUGS.find(s => categoryForSlug(s) === t) ?? null]));

/**
 * A scripted player through the real getBadgeState. `p` holds this browser
 * (longest, plays, points, visits, slugs, diary), the account's completion
 * rows, and the account's server totals.
 */
async function earnedBy(p) {
  storage.clear();
  if (!p.emptyBrowser) {
    storage.set('dukb-streaks-v1', JSON.stringify({
      version: 1,
      global: { current: 0, longest: p.longest ?? 0, lastDate: p.longest ? PAST : null },
      perGame: Object.fromEntries((p.slugs ?? []).map(s => [s, { current: 0, longest: 1, lastDate: PAST }])),
      loginDates: Array.from({ length: p.visits ?? 0 }, (_, i) => day(i)),
      totalPlays: p.plays ?? 0,
      totalPoints: p.points ?? 0,
    }));
  }
  if (p.diary) {
    storage.set('dukb-play-diary-v1', JSON.stringify({
      version: 1, keptSince: day(0), global: { from: null, days: p.diary }, perGame: {}, heldAtStart: { longest: 0, bestGameStreak: 0 },
    }));
  }
  globalThis.__SIM_ROWS__ = p.rows ?? [];
  const states = await getBadgeState(null, p.server ?? null);
  return new Set(states.filter(b => b.earned).map(b => b.id));
}

/** The player whose one fact on `metric` is `v` and nothing else is earned. */
function playerAt(metric, v) {
  switch (metric) {
    case 'longestStreak': return { longest: v };
    case 'gamesPlayed': return { plays: v };
    case 'totalPoints': return { points: v };
    case 'visitDays': return { visits: v };
    case 'bestDayVariety': return { rows: SLUGS.slice(0, v).map(game => ({ game, completed_on: day(3) })) };
    case 'fullWeeks': return { diary: Array.from({ length: 7 * v }, (_, i) => day(i)) };
    default: return null;
  }
}
const LADDER_METRICS = ['longestStreak', 'gamesPlayed', 'totalPoints', 'visitDays', 'bestDayVariety', 'fullWeeks'];
/** Days in a row that always hold a Monday to Sunday week, wherever they
 *  start (the worst start, a Tuesday, meets its first Monday six days in).
 *  Written here, not read from badges.ts; section 1 proves it on the real
 *  week counter for every start day. */
const RUN_HOLDS_A_WEEK = 13;
const ids = s => [...s].sort().join(',') || '(none)';
/** Every scripted player any section built, for section 2's pair check. */
const PLAYERS = [];

/* ─── 0. the rule table ───────────────────────────────────────────────── */
section = 0;
console.log('0. the rule table');
{
  const defIds = BADGE_DEFS.map(d => d.id);
  if (new Set(defIds).size !== defIds.length) fail('two badges share an id');
  for (const id of defIds) {
    const r = BADGE_RULES[id];
    if (!r) { fail(`${id} has no rule`); continue; }
    const nums = ['atLeast', 'atMost'].filter(k => typeof r[k] === 'number');
    if (nums.length !== 1) { fail(`${id} needs exactly one number, has ${nums.length}`); continue; }
    const n = r[nums[0]];
    if (!Number.isInteger(n) || n < 0) fail(`${id} compares against ${n}, not a whole number`);
    if (!LADDER_METRICS.includes(r.metric) && r.metric !== 'categoriesLeft') fail(`${id} reads an unknown fact ${r.metric}`);
  }
  for (const id of Object.keys(BADGE_RULES)) if (!defIds.includes(id)) fail(`rule ${id} has no badge`);
  const metrics = new Set(Object.values(BADGE_RULES).map(r => r.metric));
  console.log(`   ${defIds.length} badges, ${Object.keys(BADGE_RULES).length} rules, ${metrics.size} facts`);
  // the words a player reads promise the rule's number (Perfect Week and All
  // Rounder say what they count in words, not a number)
  let worded = 0;
  for (const d of BADGE_DEFS) {
    const r = BADGE_RULES[d.id];
    if (!r || typeof r.atLeast !== 'number' || r.metric === 'fullWeeks') continue;
    const said = (d.desc.match(/\d[\d,]*/g) ?? []).map(s => Number(s.split(',').join('')));
    worded += 1;
    if (!said.includes(r.atLeast)) fail(`${d.id} unlocks at ${r.atLeast} but says "${d.desc}"`);
  }
  console.log(`   ${worded} counted badges say their own number`);
}

/* ─── 1. the threshold walk ───────────────────────────────────────────── */
section = 1;
console.log('1. every badge at its number earns, one short does not, every rung of every ladder');
{
  let checked = 0;
  for (const metric of LADDER_METRICS) {
    const rungs = Object.entries(BADGE_RULES)
      .filter(([, r]) => r.metric === metric && typeof r.atLeast === 'number')
      .sort((a, b) => a[1].atLeast - b[1].atLeast);
    const values = new Set([0]);
    for (const [, r] of rungs) { values.add(r.atLeast - 1); values.add(r.atLeast); values.add(r.atLeast + 1); }
    if (metric === 'longestStreak') { values.add(RUN_HOLDS_A_WEEK - 1); values.add(RUN_HOLDS_A_WEEK); }
    for (const v of [...values].filter(x => x >= 0).sort((a, b) => a - b)) {
      const p = playerAt(metric, v);
      const got = await earnedBy(p);
      PLAYERS.push({ label: `${metric}=${v}`, got });
      const want = new Set(rungs.filter(([, r]) => v >= r.atLeast).map(([id]) => id));
      // a best run that long holds a full week, so Perfect Week is due too
      if (metric === 'longestStreak' && v >= RUN_HOLDS_A_WEEK) want.add('perfect-week');
      checked += 1;
      if (ids(got) !== ids(want)) fail(`${metric} ${v}: earned ${ids(got)}, the rules say ${ids(want)}`);
    }
    console.log(`   ${metric}: ${rungs.map(([id, r]) => `${id}@${r.atLeast}`).join(' ')}`);
  }
  // Perfect Week's near misses: six days of the week, and seven in a row
  // that straddle two weeks (a Wednesday to a Tuesday).
  const sixOfWeek = await earnedBy({ diary: Array.from({ length: 6 }, (_, i) => day(i)) });
  const straddle = await earnedBy({ diary: Array.from({ length: 7 }, (_, i) => day(i + 2)) });
  PLAYERS.push({ label: 'six of a week', got: sixOfWeek }, { label: 'Wed to Tue', got: straddle });
  if (sixOfWeek.size) fail(`Monday to Saturday earned ${ids(sixOfWeek)}`);
  if (straddle.size) fail(`Wednesday to Tuesday earned ${ids(straddle)}`);
  console.log(`   ${checked} scripted players on the ladders, plus 2 Perfect Week near misses`);
  // RUN_HOLDS_A_WEEK on the real week counter: from every start day the run
  // holds a week, and one day shorter from a Tuesday it does not
  const run = (start, n) => Array.from({ length: n }, (_, i) => day(start + i));
  const starts = [0, 1, 2, 3, 4, 5, 6].filter(s => fullCalendarWeeks(run(s, RUN_HOLDS_A_WEEK)) >= 1).length;
  if (starts !== 7) fail(`${RUN_HOLDS_A_WEEK} days in a row held a full week from only ${starts} of 7 start days`);
  if (fullCalendarWeeks(run(1, RUN_HOLDS_A_WEEK - 1)) !== 0) fail(`${RUN_HOLDS_A_WEEK - 1} days from a Tuesday counted a full week`);
  // completion rows are matched by a display name other accounts can share:
  // twelve of them over a whole Monday to Sunday week earn nothing
  const rowsOnly = await earnedBy({ rows: Array.from({ length: 12 }, (_, i) => ({ game: SLUGS[0], completed_on: day(i % 7) })) });
  if (rowsOnly.size) fail(`12 completion rows over a full week, nothing else, earned ${ids(rowsOnly)}`);
  console.log(`   a ${RUN_HOLDS_A_WEEK} day run holds a week from ${starts} of 7 start days; shared-name rows alone earned ${ids(rowsOnly)}`);
}

/* ─── 2. no two badges share a predicate ──────────────────────────────── */
section = 2;
console.log('2. every pair of badges is told apart by some scripted player');
{
  const everyCat = nonEmptyCats.map(t => slugFor[t]).filter(Boolean);
  PLAYERS.push({ label: 'every category', got: await earnedBy({ slugs: everyCat }) });
  const defIds = BADGE_DEFS.map(d => d.id);
  let pairs = 0;
  let apart = 0;
  for (let i = 0; i < defIds.length; i++) {
    for (let j = i + 1; j < defIds.length; j++) {
      pairs += 1;
      const a = defIds[i];
      const b = defIds[j];
      if (PLAYERS.some(p => p.got.has(a) !== p.got.has(b))) apart += 1;
      else fail(`${a} and ${b} are earned by exactly the same players: one badge twice`);
    }
  }
  // (that each badge can be earned at all is sections 1 and 3, not this one)
  console.log(`   ${apart} of ${pairs} pairs told apart over ${PLAYERS.length} players`);
}

/* ─── 3. All Rounder is reachable ─────────────────────────────────────── */
section = 3;
console.log('3. every category can be recorded, and All Rounder unlocks at the last one');
{
  console.log(`   ${SLUGS.length} recorded completion slugs found in src`);
  if (SLUGS.length < 50) fail(`only ${SLUGS.length} recorded slugs found: the scan is broken`);
  const perCat = nonEmptyCats.map(t => [t, SLUGS.filter(s => categoryForSlug(s) === t).length]);
  for (const [t, n] of perCat) if (n === 0) fail(`no game in "${t}" records a slug that maps back to it`);
  console.log(`   ${perCat.map(([t, n]) => `${t} ${n}`).join(', ')}`);
  // Round 376: some games record under a name that is not their path; a play
  // of one counts for the category its path is in
  const mapped = Object.entries(COMPLETION_SLUG_TO_PATH);
  let mappedRouted = 0;
  for (const [slug, p] of mapped) {
    const cat = CATEGORIES.find(c => c.games.some(g => g.path === p));
    if (!cat) continue; // not routed today: no category to count for
    mappedRouted += 1;
    const got = categoryForSlug(slug);
    if (got !== cat.title) fail(`"${slug}" records for ${p} (${cat.title}) but counts for ${got ?? 'no category'}`);
  }
  if (mappedRouted === 0) fail('no mapped slug is routed: the map or the registry moved, nothing was checked');
  console.log(`   ${mappedRouted} of ${mapped.length} mapped slugs are routed games and each counts for its own category`);
  const all = nonEmptyCats.map(t => slugFor[t]);
  if (all.every(Boolean)) {
    const fromRows = await earnedBy({ rows: all.map((game, i) => ({ game, completed_on: day(i) })) });
    const fromBrowser = await earnedBy({ slugs: all });
    if (!fromRows.has('all-rounder')) fail('one completion row per category did not earn All Rounder');
    if (!fromBrowser.has('all-rounder')) fail('one play per category in this browser did not earn All Rounder');
    let shortEarned = 0;
    for (let k = 0; k < all.length; k++) {
      const short = all.filter((_, i) => i !== k);
      const got = await earnedBy({ rows: short.map((game, i) => ({ game, completed_on: day(i) })), slugs: short });
      if (got.has('all-rounder')) { shortEarned += 1; fail(`All Rounder earned with "${nonEmptyCats[k]}" never played`); }
    }
    console.log(`   all ${all.length} categories earn it (rows and browser); each of the ${all.length} one-short players does not (${shortEarned} did)`);
  }
}

/* ─── 4. the second device ────────────────────────────────────────────── */
section = 4;
console.log('4. a second device earns what the account earned, and prints no zero beside a real total');
{
  const live = new Date().toISOString();
  const cases = [
    { games: 60, points: 4200, current: 9, longest: 12 },
    { games: 250, points: 10000, current: 30, longest: 30 },
    { games: 9, points: 999, current: 2, longest: 2 },
  ];
  for (const c of cases) {
    const server = { gamesPlayed: c.games, totalPoints: c.points, currentStreak: c.current, longestStreak: c.longest, lastPlayedAt: live };
    const secondDevice = await earnedBy({ emptyBrowser: true, server });
    const firstDevice = await earnedBy({ plays: c.games, points: c.points, longest: c.longest });
    if (ids(secondDevice) !== ids(firstDevice)) {
      fail(`account ${JSON.stringify(c)}: the second device earned ${ids(secondDevice)}, the same numbers in this browser earn ${ids(firstDevice)}`);
    }
    const t = ownTotals({ plays: 0, points: 0, currentStreak: 0, longestStreak: 0 }, server);
    if (t.totalPoints !== c.points) fail(`account ${JSON.stringify(c)}: the profile total reads ${t.totalPoints}`);
    for (const k of ['gamesPlayed', 'currentStreak', 'longestStreak', 'averageScore']) {
      if (t.totalPoints > 0 && !(t[k] > 0)) fail(`account ${JSON.stringify(c)}: ${k} reads ${t[k]} beside a total of ${t.totalPoints}`);
    }
    console.log(`   account ${c.points} pts, ${c.games} games, best run ${c.longest}: second device ${ids(secondDevice)}`);
  }
  // a browser one point short beside an account at the number: the badges
  // are those of the larger half, exactly as if it were all in this browser
  for (const [mine, account] of [[999, 1000], [999, 999], [1000, 999], [9999, 10000]]) {
    const mixed = await earnedBy({ points: mine, server: { totalPoints: account } });
    const twin = await earnedBy({ points: Math.max(mine, account) });
    if (ids(mixed) !== ids(twin)) fail(`browser ${mine}, account ${account}: earned ${ids(mixed)}, the larger half alone earns ${ids(twin)}`);
  }
  // the page itself: the badges get the account half, the tiles come from the
  // same merge (code only, comments stripped)
  const page = stripComments(sourceOf(PROFILE));
  for (const need of ['getBadgeState(profile, serverTotals)', 'ownTotals(', 'viewedTotals(serverTotals)', 'totalPoints: userScoreData?.total_points', 'gamesPlayed: serverTotalGames']) {
    if (!page.includes(need)) fail(`${PROFILE} no longer has ${need}`);
  }
  // every tile number is the merge's own field, nothing beside it: the shape
  // of the bug (a tile reading this browser on your own profile) cannot pass
  const tiles = [['totalGames', 'gamesPlayed'], ['currentStreak', 'currentStreak'], ['longestStreak', 'longestStreak'], ['averageScore', 'averageScore']];
  for (const [name, field] of tiles) {
    const found = [...page.matchAll(new RegExp(`\\bconst ${name}\\s*=\\s*([^;]+);`, 'g'))].map(m => m[1].trim());
    if (found.length !== 1) fail(`${PROFILE} declares ${name} ${found.length} times, expected once`);
    else if (found[0] !== `totals.${field}`) fail(`${PROFILE} ${name} is "${found[0]}", not the merge's totals.${field}`);
  }
}

/* ─── verdict ─────────────────────────────────────────────────────────── */

fs.rmSync(TMP, { recursive: true, force: true });
const red = failures.map((n, i) => (n ? i : -1)).filter(i => i >= 0);
if (CONTROL) {
  const want = CONTROLS[CONTROL].sec;
  const ok = red.length === 1 && red[0] === want;
  console.log(`\nCONTROL "${CONTROL}": red sections ${red.length ? red.join(', ') : 'none'}, expected only ${want}. ${ok ? 'The check can fail, and only its own.' : 'THE CONTROL DID NOT DO WHAT IT SHOULD.'}`);
  process.exit(ok ? 0 : 1);
}
const total = failures.reduce((a, b) => a + b, 0);
console.log(`\nsimBadges: ${total ? `${total} failure(s) in section(s) ${red.join(', ')}` : `all ${SECTIONS} sections green`}`);
process.exit(total ? 1 : 0);
