/**
 * Round 1532, step 1: the base record the scoreline round is tuned and judged
 * against (brief-1532 design 3.7.1), taken on the engine BEFORE any edit.
 *
 * Plays the four bots of scripts/lib/tycoonBots.mjs (pace 300 minutes, overinvest
 * and nosquad 120, paceSell 240, and the measured overinvest variants over1, over2,
 * over4 and over8 for 120, added when the first record showed G = 0) on seeds 1 to
 * 40 (calibration 1 to 20, holdout 21
 * to 40) at the hook's cadence, and writes scripts/data/tycoonScorelineBaseline.json:
 * - per policy and seed: summaries per full time window (W, D, L, goals for and
 *   against, titles, seasons, gems, the summed capped streak), the checkpoints
 *   (Squad, division, income, unboosted income, streak, lifetime...), every
 *   promotion (minute, Squad, division reached), every season (end minute,
 *   division, place, matches, mean Squad), the first Sell up, a paceSell bot's
 *   stars, the win bonus at two hours in seconds of income, and the minute each
 *   tracked milestone and badge first landed;
 * - per policy, seed set and window, a histogram of watched matches by
 *   (division, Squad level rounded, opponent offset in hundred-thousandths), so a
 *   later step can price any candidate table against the base trajectories;
 * - the knobs of design 3.5 read off this record: G (overinvest minus pace Squad at
 *   30, 60 and 120 minutes), A_1 to A_9 (pace's Squad on the tick it was promoted
 *   into each division) and S5 (pace's Squad at minute 5), each the median of the
 *   calibration seeds as sorted[floor(n / 2)], simTycoonLeague's own median;
 * - the sha256 of the LF text of every function body brief 1.2 and critic item 14
 *   say must not move (from its `function NAME(` line to the first line that is
 *   exactly `}`), so the scoreline harness compares bodies without git;
 * - 52 offlineEarnings inputs and their base outputs.
 *
 * Its name does not start with sim, so runAllSims skips it. It refuses to
 * overwrite its output without --force: rerunning it after the engine edit would
 * record the head as its own base.
 *   node scripts/genTycoonScorelineBaseline.mjs --base <sha>   (asserts the lib, the
 *        hook and leagueCore are that commit's text, through git show)
 *   node scripts/genTycoonScorelineBaseline.mjs --smoke        (2 seeds, short runs,
 *        written to the OS temp folder, never to scripts/data)
 * When RC_OUT is set (a remote check) the record is copied there too.
 */
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { POLICIES as SPEC_POLICIES, VARIANTS, WINDOWS, MILESTONE_IDS, BADGE_IDS, readDt, bundleTs, freshTmp, runBot, mulberry } from './lib/tycoonBots.mjs';
/* The four policies of design 3.6, then the measured overinvest variants (see tycoonBots.mjs). */
const POLICIES = [...SPEC_POLICIES, ...VARIANTS];

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = name => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : undefined; };
const SMOKE = process.argv.includes('--smoke');
const OUT = SMOKE ? path.join(freshTmp('tycoon-scoreline-smoke'), 'tycoonScorelineBaseline.json') : path.join(ROOT, 'scripts/data/tycoonScorelineBaseline.json');
if (!SMOKE && fs.existsSync(OUT) && !process.argv.includes('--force')) {
  console.error(`${path.relative(ROOT, OUT)} already exists. It is the record of the engine before Round 1532; rerunning it now would not be one.`);
  process.exit(1);
}
const LIB = path.join(ROOT, 'src/lib/stadiumTycoon.ts');
const lf = file => fs.readFileSync(file, 'utf8').split('\r\n').join('\n');
const sha = text => createHash('sha256').update(text).digest('hex');
const BASE = arg('--base');
if (BASE) {
  for (const rel of ['src/lib/stadiumTycoon.ts', 'src/hooks/useStadiumTycoon.ts', 'src/lib/leagueCore.ts']) {
    const there = execSync(`git show ${BASE}:${rel}`, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).split('\r\n').join('\n');
    if (there !== lf(path.join(ROOT, rel))) { console.error(`${rel} is not ${BASE}'s text, so this would not be the base record`); process.exit(2); }
  }
}
const DT = readDt(ROOT);
const SEEDS = SMOKE ? [1, 21] : Array.from({ length: 40 }, (_, i) => i + 1);
const CAL = seed => seed <= 20;
const MINUTES = {
  ...(SMOKE ? { pace: 24, overinvest: 16, nosquad: 16, paceSell: 16 } : { pace: 300, overinvest: 120, nosquad: 120, paceSell: 240 }),
  ...Object.fromEntries(VARIANTS.map(v => [v, SMOKE ? 16 : 120])),
};
const r4 = x => (x === null || x === undefined ? null : Math.round(x * 1e4) / 1e4);
const median = xs => { const v = xs.filter(x => x !== null && x !== undefined && Number.isFinite(x)).sort((a, b) => a - b); return v.length ? v[Math.floor(v.length / 2)] : null; };

/* ---------- play ---------- */
const tmp = freshTmp('tycoon-scoreline-base');
const T = await bundleTs(ROOT, LIB, tmp, 'base');
const started = Date.now();
const runs = {};
for (const policy of POLICIES) {
  runs[policy] = SEEDS.map(seed => runBot(T, { policy, seed, minutes: MINUTES[policy], dt: DT }));
  console.log(`played ${policy}: ${SEEDS.length} seeds x ${MINUTES[policy]} minutes (${((Date.now() - started) / 1000).toFixed(1)} s so far)`);
}

/* ---------- summarise ---------- */
function windowsOf(run) {
  return WINDOWS.filter(([a]) => a < run.minutes).map(([a, b]) => {
    const ms = run.matches.filter(m => m.t >= a && m.t < b);
    const ends = run.seasons.filter(x => x.t >= a && x.t < b);
    /* WINDOW_FIELDS order. */
    return [
      a, b, ms.length, ms.filter(m => m.res === 'w').length, ms.filter(m => m.res === 'd').length, ms.filter(m => m.res === 'l').length,
      ms.reduce((x, m) => x + m.gf, 0), ms.reduce((x, m) => x + m.ga, 0), ends.length, ends.filter(x => x.title).length,
      ms.reduce((x, m) => x + m.gems, 0), ms.reduce((x, m) => x + Math.min(m.streak, 10), 0),
    ];
  });
}
const WINDOW_FIELDS = ['from', 'to', 'matches', 'w', 'd', 'l', 'gf', 'ga', 'seasons', 'titles', 'gems', 'streak10sum'];
const SEASON_FIELDS = ['endMinute', 'division', 'place', 'matches', 'meanSquad'];
const PROMOTION_FIELDS = ['minute', 'squad', 'divisionReached'];
function seasonsOf(run) {
  const out = []; let acc = []; let k = 0;
  for (const m of run.matches) {
    acc.push(m);
    const end = run.seasons[k];
    if (end && end.t === m.t) {
      out.push([r4(end.t), end.div, end.pos, acc.length, r4(acc.reduce((x, y) => x + y.sq, 0) / acc.length)]);
      acc = []; k += 1;
    }
  }
  return out;
}
const tracked = [...MILESTONE_IDS, ...BADGE_IDS];
function seedRecord(run) {
  const cp = Object.fromEntries(Object.entries(run.checkpoints).map(([c, v]) => [c, Object.fromEntries(Object.entries(v).map(([k, x]) => [k, r4(x)]))]));
  const before120 = run.winBonusSec.filter(([t]) => t <= 120);
  return {
    seed: run.seed,
    sellUp: r4(run.sellUp),
    firstPromotion: run.promotions.length ? r4(run.promotions[0].t) : null,
    promotions: run.promotions.map(p => [r4(p.t), p.sq, p.div]),
    stars: run.stars.map(x => [r4(x.t), x.rep]),
    checkpoints: cp,
    windows: windowsOf(run),
    seasons: seasonsOf(run),
    /* The first twelve watched matches: full time minute, division, mean Squad,
       opponent offset times 1e5. Season one, match by match, for knob 4. */
    early: run.matches.slice(0, 12).map(m => [r4(m.t), m.div, r4(m.sq), Math.round(m.off * 1e5)]),
    winBonusSecAt120: before120.length ? r4(before120[before120.length - 1][1]) : null,
    firsts: Object.fromEntries(tracked.filter(id => run.firsts[id] !== undefined).map(id => [id, r4(run.firsts[id])])),
  };
}
const offKey = off => Math.round(off * 1e5);
function histograms(list) {
  const out = {};
  for (const set of ['cal', 'hold']) {
    out[set] = {};
    for (const [a, b] of WINDOWS) {
      const h = {};
      for (const run of list.filter(r => (set === 'cal') === CAL(r.seed))) {
        for (const m of run.matches) if (m.t >= a && m.t < b) { const k = `${m.div}|${Math.round(m.sq)}|${offKey(m.off)}`; h[k] = (h[k] ?? 0) + 1; }
      }
      if (Object.keys(h).length) out[set][`${a}-${b}`] = h;
    }
  }
  return out;
}
const record = { policies: {}, hist: {} };
for (const policy of POLICIES) {
  record.policies[policy] = runs[policy].map(seedRecord);
  record.hist[policy] = histograms(runs[policy]);
}

/* ---------- the knobs of design 3.5, read off this record ---------- */
const squadAt = (policy, minute, pick) => record.policies[policy].filter(r => pick(r.seed)).map(r => r.checkpoints[minute]?.sq ?? null);
const gOf = (minute, pick, overName = 'overinvest') => {
  const pace = record.policies.pace.filter(r => pick(r.seed)); const over = record.policies[overName].filter(r => pick(r.seed));
  return median(pace.map((r, i) => (over[i]?.checkpoints[minute] && r.checkpoints[minute] ? over[i].checkpoints[minute].sq - r.checkpoints[minute].sq : null)));
};
const sets = { cal: CAL, hold: seed => !CAL(seed), all: () => true };
const knobs = {};
for (const [name, pick] of Object.entries(sets)) {
  const arrival = {};
  for (let d = 1; d <= 9; d += 1) {
    const sq = record.policies.pace.filter(r => pick(r.seed)).map(r => (r.promotions.find(p => p[2] === d) ?? [null, null])[1]);
    arrival[d] = { median: median(sq), reached: sq.filter(x => x !== null).length, of: sq.length };
  }
  knobs[name] = {
    G: { 30: gOf(30, pick), 60: gOf(60, pick), 120: gOf(120, pick) },
    Gvariants: Object.fromEntries(VARIANTS.map(v => [v, { 30: gOf(30, pick, v), 60: gOf(60, pick, v), 120: gOf(120, pick, v) }])),
    A: arrival,
    S5: median(squadAt('pace', 5, pick)),
    S15: median(squadAt('pace', 15, pick)),
    firstPromotion: Object.fromEntries(POLICIES.map(p => [p, median(record.policies[p].filter(r => pick(r.seed)).map(r => r.firstPromotion ?? Infinity))])),
    firstSellUp: Object.fromEntries(POLICIES.map(p => [p, median(record.policies[p].filter(r => pick(r.seed)).map(r => r.sellUp ?? Infinity))])),
    winBonusSecAt120: median(record.policies.pace.filter(r => pick(r.seed)).map(r => r.winBonusSecAt120)),
  };
}

/* ---------- the bodies that must not move (brief 1.2, critic item 14) ---------- */
const FROZEN_BODIES = [
  'playMinute', 'tick', 'settleFirsts', 'playAwayMatchdays', 'awayMatchdaysPlayable', 'prestige', 'prestigeThreshold', 'newLeague', 'nextSeason',
  'spreadOffsets', 'cleanLeague', 'deserializeTycoon', 'serializeTycoon', 'setPieceDetails', 'setPieceOffer', 'sameSetPiece', 'beginSetPiece',
  'awardSetPieceGoal', 'incomePerSec', 'perFanRate', 'attendance', 'capacity', 'repMult', 'streakMult', 'achMult', 'swayMult', 'tapValue',
  'fanGrowthPerSec',
];
function bodyOf(text, name) {
  const lines = text.split('\n');
  const start = lines.findIndex(l => l.startsWith(`function ${name}(`) || l.startsWith(`export function ${name}(`));
  if (start < 0) return null;
  const end = lines.findIndex((l, i) => i > start && l === '}');
  return end < 0 ? null : lines.slice(start, end + 1).join('\n');
}
const libText = lf(LIB);
const bodies = {};
for (const name of FROZEN_BODIES) {
  const body = bodyOf(libText, name);
  if (!body) { console.error(`cannot find the body of ${name} in the lib`); process.exit(2); }
  bodies[name] = { sha256: sha(body), lines: body.split('\n').length };
}

/* ---------- 52 offlineEarnings inputs and their base outputs ---------- */
const OFFLINE_RECIPE = 'state = { ...newTycoon(0), levels: { ...newTycoon(0).levels, ...levels }, fanbase, rep, streak, staffLevels, legacyPerks, ach: ACHIEVEMENTS.slice(0, achCount).map(a => a.id), boostLeftSec, goldenKind, goldenLeftSec, savedAt: 0, league: newLeague(rep, division, 0) } plus ticketPolicy when not standard; output = offlineEarnings(state, now)';
const offlineState = x => {
  const fresh = T.newTycoon(0);
  return {
    ...fresh, levels: { ...fresh.levels, ...x.levels }, fanbase: x.fanbase, rep: x.rep, streak: x.streak, staffLevels: x.staffLevels, legacyPerks: x.legacyPerks,
    ach: T.ACHIEVEMENTS.slice(0, x.achCount).map(a => a.id), boostLeftSec: x.boostLeftSec, goldenKind: x.goldenKind, goldenLeftSec: x.goldenLeftSec, savedAt: 0,
    league: T.newLeague(x.rep, x.division, 0), ...(x.ticketPolicy !== 'standard' ? { ticketPolicy: x.ticketPolicy } : {}),
  };
};
const offline = [];
const NOWS = [0, 20e3, 31e3, 3600e3, 8 * 3600e3, 13 * 3600e3];
for (let i = 0; i < 52; i += 1) {
  const rnd = mulberry(15320 + i);
  const pick = xs => xs[Math.floor(rnd() * xs.length)];
  const levels = Object.fromEntries(T.TRACKS.map(tr => [tr.id, Math.floor(rnd() * 80)]));
  const x = {
    levels, fanbase: Math.round(90 + rnd() * 50000), rep: Math.floor(rnd() * 7), streak: Math.floor(rnd() * 13), division: i % 10,
    staffLevels: Object.fromEntries(T.STAFF.map(st => [st.id, Math.floor(rnd() * 12)])),
    legacyPerks: { sway: Math.floor(rnd() * 4), away: Math.floor(rnd() * 3), payroll: Math.floor(rnd() * 3) },
    achCount: Math.floor(rnd() * T.ACHIEVEMENTS.length), boostLeftSec: pick([0, 0, 30]), goldenKind: pick([null, null, 'frenzy', 'tapRush']),
    goldenLeftSec: 0, ticketPolicy: pick(['standard', 'community', 'premium']), now: NOWS[i % NOWS.length],
  };
  x.goldenLeftSec = x.goldenKind ? 20 : 0;
  offline.push({ input: x, output: T.offlineEarnings(offlineState(x), x.now) });
}

/* ---------- write ---------- */
const head = (() => { try { return execSync('git rev-parse HEAD', { cwd: ROOT, encoding: 'utf8' }).trim(); } catch { return null; } })();
const out = {
  note: 'Round 1532 step 1: Stadium Tycoon before the scoring law. Bots of scripts/lib/tycoonBots.mjs at the hook cadence; minutes are watched play; medians are sorted[floor(n / 2)] over the named seed set (cal = seeds 1 to 20, hold = 21 to 40). Squad levels in hist are the mean over a match rounded to a whole level; offsets are the stored per minute offset times 1e5.',
  capturedAt: new Date().toISOString().slice(0, 10),
  commit: BASE ?? head,
  runnerHead: head,
  libSha256: sha(libText),
  dt: DT,
  minutes: MINUTES,
  seeds: { cal: SEEDS.filter(CAL), hold: SEEDS.filter(s => !CAL(s)) },
  fields: { windows: WINDOW_FIELDS, seasons: SEASON_FIELDS, promotions: PROMOTION_FIELDS, hist: 'division|squad|offset*1e5 -> watched league matches', firsts: 'minute each tracked milestone and badge first landed; absent = not within the run' },
  knobs,
  bodies,
  offlineRecipe: OFFLINE_RECIPE,
  offline,
  policies: record.policies,
  hist: record.hist,
};
/* One seed or one histogram per line: readable in a diff, a tenth of the pretty size. */
const lines = ['{'];
const keys = Object.keys(out);
keys.forEach((k, i) => {
  const comma = i < keys.length - 1 ? ',' : '';
  if (k === 'policies' || k === 'hist') {
    lines.push(`  ${JSON.stringify(k)}: {`);
    const ps = Object.keys(out[k]);
    ps.forEach((p, j) => {
      const v = out[k][p];
      const inner = Array.isArray(v) ? v.map(x => `      ${JSON.stringify(x)}`) : Object.entries(v).map(([kk, vv]) => `      ${JSON.stringify(kk)}: ${JSON.stringify(vv)}`);
      lines.push(`    ${JSON.stringify(p)}: ${Array.isArray(v) ? '[' : '{'}`, inner.join(',\n'), `    ${Array.isArray(v) ? ']' : '}'}${j < ps.length - 1 ? ',' : ''}`);
    });
    lines.push(`  }${comma}`);
  } else lines.push(`  ${JSON.stringify(k)}: ${JSON.stringify(out[k])}${comma}`);
});
lines.push('}');
const text = lines.join('\n') + '\n';
JSON.parse(text);
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, text);
if (process.env.RC_OUT) fs.copyFileSync(OUT, path.join(process.env.RC_OUT, 'tycoonScorelineBaseline.json'));
console.log(`wrote ${SMOKE ? OUT : path.relative(ROOT, OUT)} (${(text.length / 1024).toFixed(0)} KB) for ${out.commit}, dt ${DT}, in ${((Date.now() - started) / 1000).toFixed(1)} s`);
for (const [name, k] of Object.entries(knobs)) {
  console.log(`  ${name}: G at 30/60/120 = ${k.G[30]} / ${k.G[60]} / ${k.G[120]}; S5 ${k.S5}; S15 ${k.S15}; win bonus at 120 = ${k.winBonusSecAt120} s of income`);
  console.log(`    G of the measured variants: ${Object.entries(k.Gvariants).map(([v, g]) => `${v} ${g[30]} / ${g[60]} / ${g[120]}`).join('; ')}`);
  console.log(`    A_d: ${Object.entries(k.A).map(([d, a]) => `${d}:${a.median}(${a.reached}/${a.of})`).join(' ')}`);
  console.log(`    first promotion ${JSON.stringify(k.firstPromotion)}; first Sell up ${JSON.stringify(k.firstSellUp)}`);
}
fs.rmSync(tmp, { recursive: true, force: true });
console.log('genTycoonScorelineBaseline: done');
