/* Round 1016: Soccer Career rates defenders and holding midfielders on their
   defending.

   A player wrote in on 2026-10-05: as a CB or CDM goals should not matter as
   much as overall performance. calcSeasonRating agreed with him the wrong way
   round. Only a keeper's clean sheets reached the rating; every other outfield
   player was rated on goals and assists, so centre backs had the most poor
   seasons on the pitch and the fewest elite ones. The round gives the back
   line (CB, LB, RB) 0.035 a clean sheet he kept (the number already drawn for
   the season and shown in his history) and a holding midfielder three
   quarters of that on the team's EXPECTED clean sheets in his games (his
   appearances times 0.325, the middle of the back line's 20 to 45 percent
   draw), because nothing defensive is drawn for him. No new Math.random call.

   This bundles the real engine twice from source: the tree, and the tree
   with the rule's one line taken out (the rule before this round). The fleet
   is every position the creation screen offers, a 2020 and a 1990 start,
   PER careers each (default 60), built the way the creation screen builds a
   player: rollStartingOverall, rollPotential and generateStatsFromOverall's
   position offsets, every position on the same seeds. It measures:

   1. every outfield position's poor share (a season rated 6.3 or under, the
      club's strike line) and elite share (7.5 or over), ratingBand's own
      bands, sit inside the band the attacking positions (ST, LW, RW, CAM)
      span in the same run, widened by MARGIN; the keeper is printed, never
      asserted (an outlier the other way, 67 percent elite, not this round's);
   2. downstream, the same seeds on both engines: every career at a position
      the rule does not touch is byte identical, and the defenders' (CB, LB,
      RB, CDM) peak overall, trophies and release share move inside measured
      bands, with a ceiling on their Ballon d'Or rate;
   3. the rule is pure: calcSeasonRating over a 19,440 cell grid with
      Math.random held to one value makes exactly one draw, repeats itself,
      leaves untouched positions alone and moves a defender by his credit;
   4. old saves: careers played on the rule before, loaded with repairCareer
      and played on, keep every stored season rating.

   Before the round, measured on origin/main 37ce6d5e (2026-10-05) with a
   probe of this fleet, 200 careers a position at each of 5 seed offsets
   (10,000 careers): poor and elite share, pooled over the offsets
     ST 15.3 / 47.4   LW 13.7 / 48.7   RW 13.3 / 49.0   CAM 12.1 / 49.4
     CM 12.1 / 46.9   CDM 19.0 / 33.9  CB 24.1 / 27.9   LB 22.8 / 29.8
     RB 21.8 / 29.4   GK 3.3 / 67.9
   Ballon d'Or: 0 in 4,000 defender careers, 0.6 to 2.0 per 100 attackers.
   (A first probe with flat stats read CB 31 / 23: a flat build rates a centre
   back as a bad fit for his own position, which is why the fleet now builds
   players the way the creation screen does.)

   After, this harness at seed offsets 0 to 4 (PER 60, about 190 s a run on a
   loaded machine), poor / elite:
     attacking band   poor 12.5-15.4, 12.0-15.0, 11.4-15.1, 12.4-16.5, 12.7-16.5
                      elite 46.8-49.4, 44.6-48.1, 46.4-48.8, 49.1-51.1, 46.4-49.1
     CB   13.5/48.1  15.0/46.1  15.7/44.7  14.1/46.7  13.3/46.4
     LB   12.1/50.2  13.9/45.9  13.4/45.5  11.4/48.3  11.5/47.4  (RB the same:
          the two full backs share every rule, and the seeds are shared)
     CDM  11.6/48.9  11.8/47.1  12.0/45.8  11.2/48.5  13.0/47.7
     CM   13.1/46.8  12.1/46.0  12.6/45.9  12.4/48.5  12.7/45.5  (untouched)
     GK   4.1/66.6   3.9/65.1   4.6/63.6   4.0/66.1   3.5/67.2   (untouched)
   The furthest any share sat outside its band: poor 1.2 points, elite 2.4
   (CB at offset 3). MARGIN is about twice that, 3 and 5. The rule before
   this round sits 12 to 21 points under the elite band at every defending
   position on every offset, so the margin cannot hide it.
   Section 2, defenders before and after, same seeds:
     peak overall moved +0.47 +0.51 +0.32 +0.66 +0.65
     trophies a career  +0.28 +0.25 +0.18 +0.35 +0.20
     released share     +0.63 -0.63 -0.21 -0.83 -1.04 points
     Ballon d'Or per 100 defenders 0 on all five (attackers 0 to 4.2)
   and 120 of 120 untouched careers byte identical every time. Defenders end
   up level with the attackers on peak overall (0.44 under to 0.12 over, the
   rule before had them 0.36 to 0.84 under).
   DELTA bands, about three standard deviations of those five around their
   mean: peak 0.15 to 0.95, trophies 0.05 to 0.45, released -3 to +3 points.
   Ballon d'Or ceiling for defenders 1 per 100 careers, under half the
   attackers' measured rate; real defenders almost never win it.
   The keeper stays the outlier the other way (65 to 67 percent elite). The
   brief said measure it and leave it unless this same rule fixed it, and it
   does not: his rule is untouched.

   Negative controls, SIM_POSITION_RATINGS_CONTROL (each asserts its anchor is
   in the engine exactly once, or refuses to run with exit 2):
   oldrule     the rule's line is taken out (the keeper's clean sheets are the
               only defensive credit again)              expected red {1, 2, 3}
               (2: nothing moved; 3: every defender cell is off its credit)
   overcredit  the credit is multiplied by four           expected red {1, 2}
               measured at offset 0: CB 4.3 / 83.9, CDM 3.2 / 78.5, peak
               +0.84 and trophies +0.59 (over the 0.45 ceiling)
   stream      the credit line draws one Math.random      expected red {2, 3}
               (2: the untouched careers move too, which is the point of
               checking them)
   Exit 1 only when the red set equals the expected set; exit 2 when the
   anchor is missing or doubled, the name is unknown, or the red set is any
   other set.

   Run: node scripts/simCareerPositionRatings.mjs [seedOffset] [careersPerPositionAndEra] */
import { build } from 'esbuild';
import crypto from 'node:crypto';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENGINE_FILE = path.join(ROOT, 'src/lib/soccerCareerEngine.ts');
const CONTROL = process.env.SIM_POSITION_RATINGS_CONTROL || '';
/* An argument shifts every seed, so the bands can be measured over several draws. */
const OFFSET = Number(process.argv[2] || 0);
const PER = Number(process.argv[3] || 60);

const ENGINE_SRC = fs.readFileSync(ENGINE_FILE, 'utf8').replace(/\r\n/g, '\n');
/* The one line that applies the rule. Taking it out is the rule as it stood
   before this round: the keeper's clean sheets were the only defensive input. */
const CREDIT_LINE = '  base += defensiveRatingCredit(position, apps, cleanSheets);\n';
const CREDIT_CONST = 'const DEFENSIVE_SHEET_CREDIT = 0.035;';
const CONTROLS = {
  oldrule: { from: CREDIT_LINE, to: '', red: [1, 2, 3] },
  overcredit: { from: CREDIT_CONST, to: 'const DEFENSIVE_SHEET_CREDIT = 0.035 * 4;', red: [1, 2] },
  stream: { from: CREDIT_LINE, to: '  base += defensiveRatingCredit(position, apps, cleanSheets) + 0 * Math.random();\n', red: [2, 3] },
};
/* Margins and floors, measured (see the header). */
const MARGIN = { poor: 3, elite: 5 };
const FLOOR = { seasons: 800, careers: 240, identity: 60, cells: 9000, saves: 16, newRows: 24 };
const DELTA = { peak: [0.15, 0.95], trophies: [0.05, 0.45], released: [-3, 3] };
const BDOR_CEILING = 1;
const count = (hay, needle) => hay.split(needle).length - 1;
function swap(src, from, to, label) {
  const n = count(src, from);
  if (n !== 1) { console.error(`  ${label}: the anchor is in the file ${n} times, it must be exactly once; refusing to run a dead control`); process.exit(2); }
  return src.replace(from, () => to);
}
if (CONTROL && !CONTROLS[CONTROL]) { console.error(`unknown control ${CONTROL} (known: ${Object.keys(CONTROLS).join(', ')})`); process.exit(2); }
/* The OLD engine is the tree with the rule's line taken out, so the two arms
   differ in that line and nothing else, whatever else lands on main later. */
const EXPOSE = '\nexport { calcSeasonRating as __calcSeasonRating };\n';
const OLD_SRC = swap(ENGINE_SRC, CREDIT_LINE, '', 'the rule line') + EXPOSE;
swap(ENGINE_SRC, CREDIT_CONST, CREDIT_CONST, 'the credit constant');
let CUR_SRC = ENGINE_SRC;
if (CONTROL) {
  const c = CONTROLS[CONTROL];
  CUR_SRC = swap(ENGINE_SRC, c.from, c.to, `control ${CONTROL}`);
  console.log(`CONTROL ${CONTROL}: expected red set {${c.red.join(', ')}}`);
}
CUR_SRC += EXPOSE;

/* Two bundles from source, the way simCareerSeasonRatings builds its pair.
   The entry stubs localStorage because the engine's import chain reaches the
   Supabase client module, which reads it as it loads. Nothing here fetches
   anything. */
const TMP = fs.mkdtempSync(path.join(process.env.TEMP || process.env.TMP || os.tmpdir(), 'sc-positionratings-'));
const fwd = p => p.replaceAll('\\', '/');
async function bundle(name, engineSrc) {
  const entry = path.join(TMP, `${name}-entry.mjs`);
  const out = path.join(TMP, `${name}.mjs`);
  fs.writeFileSync(entry, [
    "globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };",
    `export * from '${fwd(ENGINE_FILE)}';`,
    `export * as R from '${fwd(path.join(ROOT, 'src/lib/careerSeasonRatings.ts'))}';`,
    `export { rollStartingOverall, rollPotential } from '${fwd(path.join(ROOT, 'src/lib/careerEras.ts'))}';`,
    `export { POSITION_OFFSETS } from '${fwd(path.join(ROOT, 'src/lib/soccerCareerAttributes.ts'))}';`,
  ].join('\n'));
  await build({
    entryPoints: [entry], bundle: true, format: 'esm', platform: 'node',
    outfile: out, logLevel: 'error', alias: { '@': path.join(ROOT, 'src') },
    plugins: [{
      name: 'swap-engine',
      setup(b) {
        b.onLoad({ filter: /[\\/]src[\\/]lib[\\/]soccerCareerEngine\.ts$/ }, () => ({ contents: engineSrc, loader: 'ts', resolveDir: path.join(ROOT, 'src/lib') }));
      },
    }],
  });
  return import(pathToFileURL(out).href);
}
const CUR = await bundle('current', CUR_SRC);
const OLD = await bundle('old', OLD_SRC);
fs.rmSync(TMP, { recursive: true, force: true });
const NEED = ['initCareer', 'advanceYouthYear', 'acceptOffer', 'advanceProSeason', 'dismissSummary', 'dismissNewspaper', 'stayAtClub', 'repairCareer', 'defensiveRatingCredit', '__calcSeasonRating', 'rollStartingOverall', 'rollPotential'];
for (const E of [CUR, OLD]) for (const k of NEED) if (typeof E[k] !== 'function') { console.error(`engine export missing: ${k}, so nothing below measures anything`); process.exit(1); }
if (typeof CUR.R?.ratingBand !== 'function' || typeof CUR.R?.soccerRatingRows !== 'function') { console.error('careerSeasonRatings exports missing'); process.exit(1); }
const clubs = CUR.FALLBACK_CLUBS;

/* A seeded generator stands in for Math.random for the length of each
   career, and the clock is frozen, so every red here reproduces. */
let calls = 0;
function seedRandom(n) {
  let a = n | 0;
  calls = 0;
  Math.random = () => {
    calls += 1;
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const REAL_RANDOM = Math.random;
Date.now = () => 1790000000000;

const ATTACK = ['ST', 'LW', 'RW', 'CAM'];
const DEFENCE = ['CB', 'LB', 'RB', 'CDM'];
const POSITIONS = [...ATTACK, 'CM', ...DEFENCE, 'GK'];
const ERAS = [[2020, '2020-24'], [1990, '1990-94']];

/* The creation screen's generateStatsFromOverall (src/pages/SoccerCareer.tsx),
   over the same POSITION_OFFSETS table. Flat stats would rate a centre back as
   a bad build for his own position (his reference line is defending heavy)
   and skew every share here, which the first draft of this harness did. */
function creationStats(E, overall, position) {
  const off = E.POSITION_OFFSETS[position] || [0, 0, 0, 0, 0, 0, 0];
  const c = v => Math.max(25, Math.min(99, v));
  const vals = off.map(o => c(overall + o));
  const mean = () => Math.round(vals.reduce((a, b) => a + b, 0) / 7);
  while (mean() !== overall) {
    if (mean() < overall) { let i = vals.indexOf(Math.max(...vals.filter(v => v < 99))); if (i === -1) i = 0; vals[i] = Math.min(99, vals[i] + 1); }
    else { let i = vals.indexOf(Math.max(...vals.filter(v => v > 25))); if (i === -1) i = 0; vals[i] = Math.max(25, vals[i] - 1); }
  }
  const [pace, shooting, passing, dribbling, defending, physical, reflexes] = vals;
  return { pace, shooting, passing, dribbling, defending, physical, reflexes };
}

/* simCareerLeagueFinish's full phase switch: every pause the engine can raise
   between seasons is answered, an unknown one is nudged once. */
function step(E, s) {
  switch (s.phase) {
    case 'youth': return E.advanceYouthYear(s, clubs);
    case 'contract_offer': { const o = s.pendingOffers || []; return o.length ? E.acceptOffer(s, o[0]) : { ...s, phase: 'playing' }; }
    case 'playing': return E.advanceProSeason(s, clubs);
    case 'newspaper': return E.dismissNewspaper(s);
    case 'season_summary': return E.dismissSummary(s, clubs);
    case 'international_debut': return E.dismissDebut(s, clubs);
    case 'world_cup': return E.dismissWorldCup(s, clubs);
    case 'rehab_choice': return E.applyRehabChoice(s, 1);
    case 'rivalry_event': return E.dismissRivalryEvent(s, clubs);
    case 'ballon_dor': return E.dismissBallonDor(s, clubs);
    case 'bdor_speech': return E.applyBdorSpeech(s, 0);
    case 'wc_speech': return E.applyWorldCupSpeech(s, 0);
    case 'moral_dilemma': return E.dismissMoralDilemma(s, clubs);
    case 'social_media_action': return E.dismissSocialMediaPhase(s, clubs);
    case 'red_card_appeal_result': return E.dismissAppealResult(s, clubs);
    case 'retirement_suggestion': return E.acceptRetirementSuggestion(s);
    case 'retirement_ceremony': case 'retired': return { ...s, retired: true };
    case 'random_events': {
      const ev = (s.pendingEvents || [])[0];
      if (!ev || !ev.choices || !ev.choices.length) return { ...s, phase: 'playing', pendingEvents: [] };
      return E.applyEventChoice(s, ev.choices.length - 1, clubs);
    }
    case 'contract_expiring': case 'transfer_window': return E.stayAtClub(s);
    default: { const n = E.advanceProSeason(s, clubs); return n.phase === s.phase ? { ...n, retired: true } : n; }
  }
}

/* One career from the creation screen's own rolls: starting overall and
   potential are drawn the way the screen draws them, inside the seed. */
function runCareer(E, seed, position, era, startYear, maxPro = Infinity) {
  seedRandom(seed);
  try {
    const ovr = E.rollStartingOverall(position);
    const pot = E.rollPotential(ovr);
    let s = E.initCareer(`Pos ${seed}`, 'England', position, era, creationStats(E, ovr, position), ovr, startYear, clubs, null, pot);
    let peak = s.overall, released = 0, guard = 0;
    const pro = () => (s.seasons || []).filter(r => r.type === 'playing').length;
    while (!s.retired && guard++ < 900 && pro() < maxPro) {
      const n = step(E, s);
      const sit = n.transferSituation;
      if (n.phase === 'transfer_window' && s.phase !== 'transfer_window' && sit?.type === 'frozen_out' && sit.mode === 'released') released += 1;
      s = n;
      if (s.overall > peak) peak = s.overall;
    }
    return { s, peak, released };
  } finally {
    Math.random = REAL_RANDOM;
  }
}
const digest = s => crypto.createHash('sha256').update(JSON.stringify(s)).digest('hex').slice(0, 16);
const TROPHY_KEYS = ['leagueTitle', 'domesticCup', 'championsLeague', 'worldCup', 'continentalCup', 'clubCupTitle'];

/* The fleet: every position the creation screen offers, a 2020 start and a
   1990 start, PER careers each, the same seeds on both engines. The engine
   before the rule plays the defenders in full (section 2 compares them) and
   only the first IDENTITY careers of every other position, enough to prove
   those careers did not move, which keeps the run a quarter shorter.
   Every position plays the SAME seeds: the first draws are the creation
   screen's overall and potential rolls, so career i is the same talent at
   all ten positions. Talent is most of the spread between careers, and with
   a seed per position it made a position's share swing 2 to 3 points from
   run to run on its own (the first draft measured a holding midfielder 5.1
   points under the attackers' band on one offset and inside it on the next).
   Shared seeds make the comparison paired, position against position. */
const IDENTITY = 10;
function fleet(E, before = false) {
  const out = {};
  POSITIONS.forEach(position => {
    const o = out[position] = { seasons: 0, poor: 0, elite: 0, careers: 0, peak: 0, trophies: 0, bdor: 0, released: 0, digests: [] };
    const per = before && !DEFENCE.includes(position) ? Math.min(IDENTITY, PER) : PER;
    ERAS.forEach(([startYear, era], ei) => { for (let i = 0; i < per; i++) {
      const seed = OFFSET * 1000003 + 7 + (ei * PER + i) * 7919;
      const { s, peak, released } = runCareer(E, seed, position, era, startYear);
      for (const r of CUR.R.soccerRatingRows(s.seasons, position)) {
        if (r.rating === null) continue;
        o.seasons += 1;
        const b = CUR.R.ratingBand(r.rating);
        if (b === 'poor') o.poor += 1; else if (b === 'elite') o.elite += 1;
      }
      o.careers += 1; o.peak += peak; o.released += released > 0 ? 1 : 0;
      for (const r of s.seasons) {
        for (const t of TROPHY_KEYS) if (r[t]) o.trophies += 1;
        if (r.ballonDor) o.bdor += 1;
      }
      o.digests.push(`${era}|${i}|${digest(s)}`);
    } });
  });
  return out;
}
const t0 = process.hrtime.bigint();
const NEWF = fleet(CUR);
const OLDF = fleet(OLD, true);
const secs = Number(process.hrtime.bigint() - t0) / 1e9;
const share = (o, k) => 100 * o[k] / o.seasons;

let failures = 0;
const red = new Set();
let section = 0;
const fail = m => { failures += 1; red.add(section); if (failures <= 30) console.error('  FAIL: ' + m); };
const floorCheck = (n, floor, what) => { if (n < floor) fail(`${what}: ${n}, under the floor of ${floor}, so this part measured too little to mean anything`); };
console.log(`fleet: ${POSITIONS.length} positions x ${ERAS.length} eras x ${PER} careers on each engine, seed offset ${OFFSET}, ${secs.toFixed(0)} s`);

/* ── 1. every position's poor and elite shares sit in the attackers' band ── */
section = 1;
console.log('\n1) poor (rating 6.3 or under) and elite (7.5 or over) share of rated seasons, by position');
const span = (F, k) => { const v = ATTACK.map(p => share(F[p], k)); return [Math.min(...v), Math.max(...v)]; };
const band = { poor: span(NEWF, 'poor'), elite: span(NEWF, 'elite') };
console.log(`   attacking band (ST, LW, RW, CAM): poor ${band.poor.map(v => v.toFixed(1)).join(' to ')}%, elite ${band.elite.map(v => v.toFixed(1)).join(' to ')}%, widened by ${MARGIN.poor} and ${MARGIN.elite} points`);
for (const p of POSITIONS) {
  const n = NEWF[p], o = OLDF[p];
  console.log(`   ${p.padEnd(4)} ${String(n.seasons).padStart(5)} seasons  poor ${share(n, 'poor').toFixed(1).padStart(4)}%  elite ${share(n, 'elite').toFixed(1).padStart(4)}%   ${DEFENCE.includes(p) ? `(rule before this round: poor ${share(o, 'poor').toFixed(1)}%, elite ${share(o, 'elite').toFixed(1)}%)` : '(the rule does not touch this position)'}`);
  floorCheck(n.seasons, FLOOR.seasons, `${p} rated seasons`);
}
for (const p of [...DEFENCE, 'CM']) for (const k of ['poor', 'elite']) {
  const v = share(NEWF[p], k);
  const lo = band[k][0] - MARGIN[k], hi = band[k][1] + MARGIN[k];
  if (v < lo || v > hi) fail(`${p} ${k} share ${v.toFixed(1)}% is outside the attacking band ${lo.toFixed(1)} to ${hi.toFixed(1)}%`);
}
/* The keeper is an outlier the other way and this round does not touch his
   rule: printed above, measured in the header, never asserted here. */

/* ── 2. what the rating feeds: development, trophies, the Ballon d'Or, release ── */
section = 2;
console.log('\n2) downstream, the same seeds on the engine before and after the rule');
let same = 0, compared = 0;
for (const p of [...ATTACK, 'CM', 'GK']) {
  const mine = new Set(NEWF[p].digests);
  for (const d of OLDF[p].digests) { compared += 1; if (mine.has(d)) same += 1; }
}
console.log(`   attackers, CM and GK: ${same} of ${compared} careers byte identical on both engines`);
floorCheck(compared, FLOOR.identity, 'careers compared');
if (same !== compared) fail(`${compared - same} careers at a position the rule does not touch came out different`);
const pooled = (F, ps) => {
  const t = { careers: 0, peak: 0, trophies: 0, bdor: 0, released: 0 };
  for (const p of ps) for (const k of Object.keys(t)) t[k] += F[p][k];
  return { careers: t.careers, peak: t.peak / t.careers, trophies: t.trophies / t.careers, bdor: 100 * t.bdor / t.careers, released: 100 * t.released / t.careers };
};
const dNew = pooled(NEWF, DEFENCE), dOld = pooled(OLDF, DEFENCE), att = pooled(NEWF, ATTACK);
const line = (label, x) => console.log(`   ${label.padEnd(26)} ${x.careers} careers  peak overall ${x.peak.toFixed(2)}  trophies ${x.trophies.toFixed(2)}  Ballon d'Or per 100 ${x.bdor.toFixed(2)}  released ${x.released.toFixed(1)}%`);
line('defenders, rule before', dOld);
line('defenders, this rule', dNew);
line('attackers (unchanged)', att);
floorCheck(dNew.careers, FLOOR.careers, 'defender careers');
for (const k of ['peak', 'trophies', 'released']) {
  const d = dNew[k] - dOld[k];
  const [lo, hi] = DELTA[k];
  console.log(`   ${k} moved ${d >= 0 ? '+' : ''}${d.toFixed(2)} (band ${lo} to ${hi})`);
  if (d < lo || d > hi) fail(`defenders' ${k} moved ${d.toFixed(2)}, outside the measured band ${lo} to ${hi}`);
}
if (dNew.bdor > BDOR_CEILING) fail(`defenders win ${dNew.bdor.toFixed(2)} Ballon d'Or per 100 careers, over the ceiling of ${BDOR_CEILING}`);

/* ── 3. the rule is pure: the same drawn numbers give the same rating ── */
section = 3;
console.log('\n3) calcSeasonRating over a grid of drawn numbers, with Math.random held to one value');
let cells = 0, drawBreaks = 0, repeatBreaks = 0, untouchedBreaks = 0, creditBreaks = 0;
const breaks = [];
const rate = (E, args, u) => { let n = 0; Math.random = () => { n += 1; return u; }; try { return { r: E.__calcSeasonRating(...args), n }; } finally { Math.random = REAL_RANDOM; } };
for (const p of POSITIONS) for (const apps of [0, 8, 20, 38]) for (const goals of [0, 3, 12]) for (const assists of [0, 5])
  for (const cs of [0, 6, 14]) for (const ovr of [58, 82]) for (const tier of [1, 3]) for (const fx of [-0.2, 0, 0.2]) for (const u of [0.1, 0.5, 0.9]) {
    if (cs > apps) continue;
    cells += 1;
    const args = [p, apps, goals, assists, cs, ovr, tier, fx];
    const a = rate(CUR, args, u), b = rate(CUR, args, u), o = rate(OLD, args, u);
    if (a.n !== 1 || o.n !== 1) { drawBreaks += 1; if (breaks.length < 4) breaks.push(`${p} ${args.join(',')}: ${a.n} draws on this engine, ${o.n} before`); }
    if (a.r !== b.r) repeatBreaks += 1;
    const credit = CUR.defensiveRatingCredit(p, apps, cs);
    if (!DEFENCE.includes(p)) { if (a.r !== o.r || credit !== 0) untouchedBreaks += 1; continue; }
    /* the rating is rounded to one decimal and clamped to 3 to 10 */
    const clamped = a.r === 10 || o.r === 3;
    if (credit < 0 || (!clamped && Math.abs(a.r - o.r - credit) > 0.1 + 1e-9)) { creditBreaks += 1; if (breaks.length < 4) breaks.push(`${p} ${args.join(',')}: ${o.r} became ${a.r}, credit ${credit.toFixed(3)}`); }
  }
const cdmFree = [0, 6, 14].every(cs => CUR.defensiveRatingCredit('CDM', 30, cs) === CUR.defensiveRatingCredit('CDM', 30, 0));
const backFree = [8, 20, 38].every(a => CUR.defensiveRatingCredit('CB', a, 6) === CUR.defensiveRatingCredit('CB', 38, 6));
console.log(`   ${cells} cells: ${drawBreaks} with other than one draw, ${repeatBreaks} that did not repeat, ${untouchedBreaks} untouched positions that moved, ${creditBreaks} defenders off their credit`);
console.log(`   the back line's credit reads clean sheets only: ${backFree}; the holding midfielder's reads appearances only: ${cdmFree}`);
for (const b of breaks) console.log('   e.g. ' + b);
floorCheck(cells, FLOOR.cells, 'grid cells');
if (drawBreaks) fail(`${drawBreaks} cells made other than one Math.random call, so the stream moved`);
if (repeatBreaks) fail(`${repeatBreaks} cells gave a different rating for the same drawn numbers`);
if (untouchedBreaks) fail(`${untouchedBreaks} cells at a position the rule does not touch changed`);
if (creditBreaks) fail(`${creditBreaks} defender cells moved by something other than their credit`);
if (!cdmFree || !backFree) fail('a credit reads an input it should not');

/* ── 4. old saves: a rating already in a save is history ── */
section = 4;
console.log('\n4) careers saved on the rule before this round, loaded and played on with this one');
let saves = 0, keptRows = 0, rowBreaks = 0, newRows = 0;
let n4 = 0;
for (const p of DEFENCE) for (let i = 0; i < 4; i++) {
  const seed = OFFSET * 1000003 + 500009 + (n4++) * 7919;
  const { s: before } = runCareer(OLD, seed, p, '2020-24', 2020, 5);
  const frozen = JSON.stringify(before.seasons);
  let s = CUR.repairCareer(JSON.parse(JSON.stringify(before)));
  saves += 1;
  seedRandom(seed + 1);
  try {
    const startPro = s.seasons.filter(r => r.type === 'playing').length;
    for (let g = 0; g < 300 && !s.retired && s.seasons.filter(r => r.type === 'playing').length < startPro + 3; g++) s = step(CUR, s);
  } finally { Math.random = REAL_RANDOM; }
  const was = JSON.parse(frozen);
  keptRows += was.length;
  /* the rating of every saved row; a later screen may still stamp an honour
     on the last one (the awards night does), which is not a rewrite */
  if (was.some((r, j) => s.seasons[j]?.rating !== r.rating)) rowBreaks += 1;
  newRows += s.seasons.length - was.length;
}
console.log(`   ${saves} saves, ${keptRows} saved rows, ${rowBreaks} saves whose old rows changed, ${newRows} rows played after loading`);
floorCheck(saves, FLOOR.saves, 'old saves');
floorCheck(newRows, FLOOR.newRows, 'rows played after loading');
if (rowBreaks) fail(`${rowBreaks} old saves had a stored season rewritten`);

/* ── verdict ── */
const redList = [...red].sort((a, b) => a - b);
if (CONTROL) {
  const want = CONTROLS[CONTROL].red;
  const ok = want.length === redList.length && want.every((v, i) => v === redList[i]);
  console.log(`\nCONTROL ${CONTROL}: red set {${redList.join(', ')}}, expected {${want.join(', ')}}: ${ok ? 'the control fired as it should' : 'WRONG'}`);
  process.exit(ok ? 1 : 2);
}
console.log(failures ? `\n${failures} failure(s) in section(s) ${redList.join(', ')}` : '\nall sections green: defenders and holding midfielders are rated on their defending');
process.exit(failures ? 1 : 0);
