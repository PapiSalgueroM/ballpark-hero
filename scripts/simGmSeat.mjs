/**
 * Round 941 harness: the GM seat (src/lib/gmSeat.ts), the ask from upstairs
 * and the job market after the sack, for every manager seat.
 *
 * THE MODEL. Per pack, one league of that game's size plays season after
 * season with drifting strength. The Aussie rules seat has no finals (its
 * game is ten rounds and the ladder leader wins), so its season is the ladder
 * alone, graded through the real ladderSeasonOutcome. A GM takes a random
 * seat, gets the real seat mandate (seatMandate over buildOwnerMandate), the
 * real grade and the real trust (gradeSeason, applyMandateResult). A stint
 * ends when trust hits zero (fired), after a title three times in ten
 * (walked), when a college buyout is taken, or when the contract runs out.
 * Then the real feed (seatOffers over generateJobOffers): he takes the best
 * offer through takeSeat and carries on in the same league, or sits a year
 * out, up to three feeds, and a career stops at 25 seasons. 20,000 tenures
 * (stints) per pack per seed. Fight Gym has no pack (held, see packs.ts).
 *
 * THE CHECKS.
 *  1. Seat words: every rank, champion flag and press tilt keeps
 *     buildOwnerMandate's tier, win floor and postseason level; no raw
 *     placeholder or dash; no program or club ask mentions ownership or a
 *     franchise, and no league only ask mentions a final or a playoff.
 *     Control `words`.
 *  2. Left straight after a 'badly' season (fired, or the contract ran out):
 *     no top tier offer in any feed, 3,800 to 17,600 such feeds per pack per
 *     seed. Control `badlyceiling` (the engine's own ceiling hides most of
 *     it, so section 3 carries it).
 *  3. The same rule walked up a ladder of 0 to 6 titles, every step, ended
 *     'fired' and again ended 'walked': the standing rises each step (until
 *     the engine's clamp at 100) and no top tier offer appears, in a six club
 *     league where the top tier is one club away. Controls `badlyceiling`
 *     and `badlywalk` (the old rule that only capped a firing, under which
 *     walking out washed the 'badly' season off).
 *  4. A title winner who walks: always an offer at his level or above, from
 *     every tier he can leave (control `walkguarantee`), and never an offer
 *     above both the engine's own ceiling and the nearest tier at his level,
 *     over about 2,500 walker feeds per seed where a leap would show (control
 *     `walknearest`, Math.min for Math.max, reaches for the top tier).
 *  5. The club you just left never appears in the feed. Control `firedclub`.
 *  6. The share of sacked GMs whose first feed is empty, per pack, inside a
 *     band set from measurement. Control `departure` (read every firing as a
 *     resignation) drops it under every floor.
 *  7. Sacked after a title against sacked after two bad years with no title:
 *     the mean best offer (tier 1 = 4 points, tier 4 = 1, empty = 0) is
 *     higher by a floor per pack, and the two-bad-years group draws a top
 *     half offer at most 3 percent of the time. Control `tierceiling`
 *     (managerOffers' own tier filter removed, in the bundle only, never on
 *     disk) lifts that share to 15 to 21 percent.
 *  8. takeSeat moves the seat (team, trust, mandate), drops the old club's
 *     press state (tilt and trade line) and keeps the league object, its
 *     season, its champions and its teams. Control `takeseat`.
 *  9. Only the two college packs ever draw a buyout bid, always from a
 *     program the LEAGUE puts one tier up (read from leagueTiers, never from
 *     the bid's own tier field), always straight after a title or a season
 *     over the ask, at this file's own design rates (60 and 35 percent per
 *     big year below the top tier, band 4.5 binomial errors of the pooled
 *     count). Controls `poachflag`, `poachany` (a bid from any tier above)
 *     and `poachrate` (a tenth of each rate).
 * 10. A league only seat: every contend or playoffs ask can be exactly met by
 *     some ladder place. Control `ladderfinals` (nobody ever makes the cut).
 *
 * MEASURED, 20,000 tenures, seeds 1 to 5 (2026-10-03, after the review fixes;
 * the four pro packs and both college packs sit where they sat on
 * 2026-10-02, the Aussie rules seat moved when its finals were removed):
 *   empty feed %  nfl 54.6-56.0  nba 50.9-51.6  nhl 53.0-53.4  mlb 52.9-54.0
 *                 cfb 56.2-57.4  cbb 43.6-45.9  afl 51.5-54.3
 *   best offer margin  nfl .31-.36  nba .36-.39  nhl .32-.37  mlb .34-.36
 *                      cfb .25-.27  cbb .57-.60  afl .99-1.06
 *   two-bad-years top half share: 0.0 everywhere but afl (0.0-0.1).
 *   bid rate per big year below the top tier, one seed alone:
 *     cfb title 56.1-66.4 (250 to 308 years), over the ask 34.3-35.2;
 *     cbb title 58.2-64.8 (573 to 625 years), over the ask 34.8-35.2.
 *   Bands sit at least four standard errors outside the measured spread;
 *   margin floors at about two thirds of the lowest seed. Under `departure`
 *   (seed 1, 2026-10-02) the empty shares were nfl 31.5 nba 28.0 nhl 29.9
 *   mlb 31.6 cfb 35.4 cbb 20.1.
 *
 * Run: node scripts/simGmSeat.mjs
 * Seeds: SIM_GMSEAT_SEEDS=1,2,3 (the default). Measure only: SIM_GMSEAT_MEASURE=1.
 * Controls: SIM_GMSEAT_CONTROL=<name>, each must turn the run red.
 */
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTROL = process.env.SIM_GMSEAT_CONTROL || '';
const MEASURE = process.env.SIM_GMSEAT_MEASURE === '1';
const SEEDS = (process.env.SIM_GMSEAT_SEEDS || '1,2,3').split(',').map(Number);
const TENURES = Number(process.env.SIM_GMSEAT_TENURES || 20000);

/* ---------------- controls: in memory source mutations ---------------- */

/* Each control names a file, a single line anchor that must exist in it, and
   what replaces it. The anchor is asserted present before the run, so a
   control that changes nothing can never pass for a working one. Reads are
   normalised to LF, and every anchor is one line. */
const CONTROLS = {
  badlyceiling: ['src/lib/gmSeat.ts', "lastGradeOf(last) === 'badly' ? BADLY_FIRED_CEILING : 1", "false ? BADLY_FIRED_CEILING : 1"],
  walkguarantee: ['src/lib/gmSeat.ts', 'if (walkedAWinner && c.seasonsOut === 0 &&', 'if (false &&'],
  walknearest: ['src/lib/gmSeat.ts', 'const nearest = Math.max(...fits.map(club => club.tier));', 'const nearest = Math.min(...fits.map(club => club.tier));'],
  badlywalk: ['src/lib/gmSeat.ts', "const topAllowed: ClubTier = lastGradeOf(last) === 'badly'", "const topAllowed: ClubTier = last.ended === 'fired' && lastGradeOf(last) === 'badly'"],
  poachany: ['src/lib/gmSeat.ts', 'tiers.get(t.id) === level - 1', '(tiers.get(t.id) ?? 4) < level'],
  poachrate: ['src/lib/gmSeat.ts', '{ title: 0.6, overachieved: 0.35 }', '{ title: 0.06, overachieved: 0.035 }'],
  ladderfinals: ['src/lib/gmSeat.ts', 'madePlayoffs: place <= pack.ladder.cut,', 'madePlayoffs: false,'],
  firedclub: ['src/lib/gmSeat.ts', '.filter(t => t.id !== last.team)', '.filter(t => true)'],
  tierceiling: ['src/lib/managerOffers.ts', '.filter(c => c.tier >= ceiling)', '.filter(c => true)'],
  poachflag: ['src/data/gmSeat/packs.ts', 'asks: PRO_ASKS, verdicts: PRO_VERDICTS, poachable: false,', 'asks: PRO_ASKS, verdicts: PRO_VERDICTS, poachable: true,'],
  departure: ['src/lib/gmSeat.ts', "last.ended === 'fired' ? (lastGrade === 'badly' ? 'relegated' : 'sacked')", "last.ended === 'fired' ? 'resigned'"],
  takeseat: ['src/lib/gmSeat.ts', 'return { ...save, myTeam: offer.teamId,', 'return { myTeam: offer.teamId,'],
  words: ['src/lib/gmSeat.ts', 'return { ...base, text: fillSeatWords(pack.asks[key], pack, base.winFloor) };', 'return { ...base };'],
};
if (CONTROL && !CONTROLS[CONTROL]) { console.error(`unknown control ${CONTROL}`); process.exit(2); }

const readSrc = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');

const mutate = {
  name: 'gmseat-control',
  setup(build) {
    build.onLoad({ filter: /(gmSeat|managerOffers|packs)\.ts$/ }, args => {
      const rel = path.relative(ROOT, args.path).split(path.sep).join('/');
      let src = readSrc(rel);
      const c = CONTROL && CONTROLS[CONTROL];
      if (c && c[0] === rel) {
        if (!src.includes(c[1])) { console.error(`control ${CONTROL} cannot run: anchor missing in ${rel}`); process.exit(2); }
        src = src.split(c[1]).join(c[2]);
      }
      return { contents: src, loader: 'ts' };
    });
  },
};

const esbuild = await import('esbuild');
const BUNDLE = path.join(os.tmpdir(), `simGmSeat-${process.pid}-${Date.now()}.mjs`);
await esbuild.build({
  stdin: {
    contents: [
      "export * from './src/lib/gmSeat.ts';",
      "export { GM_SEAT_PACKS } from './src/data/gmSeat/packs.ts';",
      "export { buildOwnerMandate, applyMandateResult, FO_TRUST_START } from './src/lib/foOwnerMandate.ts';",
      "export { managerStanding, bestTierAvailable } from './src/lib/managerOffers.ts';",
      "export { gradeSeason } from './src/lib/foOwnerMandate.ts';",
    ].join('\n'),
    resolveDir: ROOT, loader: 'ts',
  },
  bundle: true, format: 'esm', platform: 'node', outfile: BUNDLE, logLevel: 'error', plugins: [mutate],
});
const S = await import(pathToFileURL(BUNDLE).href);
fs.rmSync(BUNDLE, { force: true });

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const ok = m => console.log('  ok: ' + m);
const seeded = s => { let x = (s >>> 0) || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; };
const gauss = rng => { let u = 0; while (u === 0) u = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng()); };

/* The model league per pack. Sizes are each game's own league (32, 30, 32,
   30 franchises, 44 CFB and 40 CBB programs, six Aussie rules clubs); the
   postseason size is this harness's model only. The Aussie rules game has no
   finals, so its season is the ladder alone (post 0, graded through
   ladderSeasonOutcome). */
const LEAGUES = {
  nfl: { n: 32, post: 14 }, nba: { n: 30, post: 16 }, nhl: { n: 32, post: 16 }, mlb: { n: 30, post: 12 },
  cfb: { n: 44, post: 12 }, cbb: { n: 40, post: 32 }, afl: { n: 6, post: 0 },
};
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function makeLeague(n, rng) {
  return {
    season: 2026,
    teams: Array.from({ length: n }, (_, i) => ({ id: `T${String(i).padStart(2, '0')}`, name: `Model ${i}`, strength: gauss(rng) })),
    champions: [],
  };
}

/** One season: every team's form, the postseason bracket by a second draw,
    and the champion. A league only seat (pack.ladder) has no bracket: the
    form order is the final ladder and the leader is the champion, graded
    through the real ladderSeasonOutcome. Strength drifts after, so ranks
    move between seasons. */
function playSeason(lg, cfg, pack, rng) {
  const games = pack.words.games;
  const form = lg.teams.map(t => ({ t, p: t.strength + 0.8 * gauss(rng) })).sort((a, b) => b.p - a.p);
  const winsOf = x => Math.round(games * clamp(0.5 + 0.16 * x.p, 0.05, 0.95));
  const out = new Map();
  if (pack.ladder) {
    form.forEach((x, i) => out.set(x.t.id, S.ladderSeasonOutcome(pack, i + 1, winsOf(x))));
    const champion = form[0].t.id;
    lg.champions.push({ season: lg.season, team: champion });
    for (const t of lg.teams) t.strength = 0.8 * t.strength + 0.6 * gauss(rng);
    lg.season += 1;
    return { out, champion };
  }
  const rounds = Math.ceil(Math.log2(cfg.post));
  const bracket = form.slice(0, cfg.post).map(x => ({ id: x.t.id, q: x.t.strength + gauss(rng) })).sort((a, b) => b.q - a.q);
  form.forEach(x => out.set(x.t.id, {
    wins: winsOf(x),
    madePlayoffs: false, roundsWon: 0, reachedFinal: false, wonTitle: false,
  }));
  bracket.forEach((b, i) => {
    const pos = i + 1;
    const o = out.get(b.id);
    o.madePlayoffs = true;
    o.roundsWon = pos === 1 ? rounds : Math.max(0, rounds - Math.ceil(Math.log2(pos)));
    o.reachedFinal = pos <= 2;
    o.wonTitle = pos === 1;
  });
  const champion = bracket[0].id;
  lg.champions.push({ season: lg.season, team: champion });
  for (const t of lg.teams) t.strength = 0.8 * t.strength + 0.6 * gauss(rng);
  lg.season += 1;
  return { out, champion };
}

const rankOf = (teams, id) => {
  const mine = teams.find(t => t.id === id).strength;
  return 1 + teams.filter(t => t.id !== id && t.strength > mine).length;
};
const CAREER_CAP = 25;
const top2 = feed => (feed.some(o => o.tier <= 2) ? 1 : 0);
const bestScore = feed => (feed.length ? 5 - Math.min(...feed.map(o => o.tier)) : 0);

/* ---------------- careers in one league, stint after stint ---------------- */

function runPack(pack, seed) {
  const cfg = LEAGUES[pack.id];
  const rng = seeded(seed * 7919 + pack.id.length * 104729 + pack.id.charCodeAt(0));
  const lg = makeLeague(cfg.n, rng);
  const st = {
    tenures: 0, feeds: 0, badlyFeeds: 0, badlyTop: 0, walkFeeds: 0, walkMiss: 0, walkByLevel: [0, 0, 0, 0, 0],
    firedClubHits: 0, firedFirst: 0, firedEmpty: 0, titled: [0, 0, 0], bad: [0, 0, 0],
    takes: 0, takeBad: 0, bids: 0, bidsBad: 0, bigYears: 0, seasons: 0,
    bigBelowTop: { title: 0, overachieved: 0 }, bidsAfter: { title: 0, overachieved: 0 },
    walkLeaps: 0, walkTeeth: 0,
  };
  let champion = null;
  while (st.tenures < TENURES) {
    /* A new GM: a random seat, a fresh record. */
    let team = lg.teams[Math.floor(rng() * cfg.n)].id;
    let career = S.newGmCareer(team, S.leagueTiers(lg.teams).get(team), lg.season);
    let save = { league: lg, myTeam: team, trust: S.FO_TRUST_START, fired: false, mandate: null, titles: 0 };
    let active = true;
    while (active && st.tenures < TENURES) {
      const rank = rankOf(lg.teams, save.myTeam);
      const mandate = S.seatMandate(pack, rank, cfg.n, champion === save.myTeam, lg.season);
      const season = playSeason(lg, cfg, pack, rng); st.seasons = (st.seasons || 0) + 1;
      champion = season.champion;
      const grade = S.seatGrade(pack, mandate, season.out.get(save.myTeam));
      career = S.recordSeatSeason(career, grade.result);
      const applied = S.applyMandateResult(save.trust, grade);
      save = { ...save, trust: applied.trust, titles: save.titles + (grade.result === 'title' ? 1 : 0) };
      const seasonsHere = S.currentStint(career).grades.length;

      let ended = null;
      if (applied.fired) ended = 'fired';
      else if (grade.result === 'title' && rng() < 0.3) ended = 'walked';
      else {
        const tiersNow = S.leagueTiers(lg.teams);
        const level = tiersNow.get(save.myTeam);
        const big = grade.result === 'title' || grade.result === 'overachieved';
        if (big) st.bigYears += 1;
        /* A big year below the top tier is a chance at a bid, by its grade. */
        if (big && level > 1) st.bigBelowTop[grade.result] += 1;
        const bid = S.poachBid(pack, lg.teams, career, lg.season, rng, champion);
        if (bid) {
          st.bids += 1;
          if (big && level > 1) st.bidsAfter[grade.result] += 1;
          /* The tier the league gives the bidder, read here, never the tier
             the bid says about itself. */
          const bidderTier = tiersNow.get(bid.teamId);
          if (!pack.poachable || bidderTier !== level - 1 || bid.tier !== bidderTier || !big || bid.teamId === save.myTeam) st.bidsBad += 1;
          if (rng() < 0.7) {
            st.tenures += 1;
            career = S.startSeatStint(career, bid, lg.season);
            save = takeAndCheck(save, bid, lg, st);
            continue;
          }
        }
        if (seasonsHere >= 15 || (seasonsHere >= 4 && rng() < 0.08)) ended = 'expired';
      }
      if (!ended) continue;

      st.tenures += 1;
      career = S.endSeatStint(career, ended);
      const leftFrom = save.myTeam;
      /* A career is at most CAREER_CAP seasons long, then the man retires
         after reading his last feed. Without it a winner never stops. */
      const retiring = S.careerTotals(career).seasons >= CAREER_CAP;
      let taken = false;
      for (let year = 0; year < 3 && !taken; year++) {
        const feed = S.seatOffers(pack, lg.teams, career, lg.season, rng, champion);
        tally(st, pack, lg, career, feed, leftFrom, ended, year === 0);
        if (retiring) break;
        if (feed.length) {
          const pick = feed.reduce((a, b) => (b.tier < a.tier ? b : a));
          career = S.startSeatStint(career, pick, lg.season);
          save = takeAndCheck(save, pick, lg, st);
          taken = true;
        } else {
          career = S.sitOutYear(career);
          champion = playSeason(lg, cfg, pack, rng).champion;
        }
      }
      if (!taken) active = false;
    }
  }
  return st;
}

function tally(st, pack, lg, career, feed, leftFrom, ended, first) {
  st.feeds += 1;
  const grades = S.currentStint(career).grades;
  const lastGrade = grades[grades.length - 1];
  if (feed.some(o => o.teamId === leftFrom)) st.firedClubHits += 1;
  /* Any exit straight after a 'badly' season: fired, or a contract that ran
     out on one. */
  if (lastGrade === 'badly') {
    st.badlyFeeds += 1;
    if (feed.some(o => o.tier === 1)) st.badlyTop += 1;
  }
  if (!first) return;
  const totals = S.careerTotals(career);
  if (ended === 'walked' && totals.titles >= 1) {
    const tiers = S.leagueTiers(lg.teams);
    const level = tiers.get(leftFrom);
    st.walkFeeds += 1;
    st.walkByLevel[level] += 1;
    if (!feed.some(o => o.tier <= level)) st.walkMiss += 1;
    /* The guaranteed offer is a step sideways: no offer may sit above both
       the engine's own ceiling and the nearest tier at or under his level
       that another club holds. Computed here from the league, not read
       from the module. */
    const ceiling = S.bestTierAvailable(S.careerProfile(career, tiers)) ?? 4;
    const held = lg.teams.filter(t => t.id !== leftFrom).map(t => tiers.get(t.id)).filter(t => t <= level);
    const nearest = held.length ? Math.max(...held) : 4;
    const floor = Math.min(ceiling, nearest);
    if (floor > 1) st.walkTeeth += 1;
    if (feed.some(o => o.tier < floor)) st.walkLeaps += 1;
  }
  if (ended === 'fired') {
    st.firedFirst += 1;
    if (!feed.length) st.firedEmpty += 1;
    const poor = g => g === 'missed' || g === 'badly';
    if (totals.titles >= 1) { st.titled[0] += bestScore(feed); st.titled[1] += 1; st.titled[2] += top2(feed); }
    else if (grades.length >= 2 && poor(grades[grades.length - 1]) && poor(grades[grades.length - 2])) {
      st.bad[0] += bestScore(feed); st.bad[1] += 1; st.bad[2] += top2(feed);
    }
  }
}

/** Take an offer through takeSeat and check the league came along untouched
    and the old club's press state (an answered tilt, the season's trade line,
    as the front office saves keep them) did not. */
function takeAndCheck(save, offer, lg, st) {
  const seasonBefore = lg.season;
  const champsBefore = lg.champions.length;
  const teamsRef = lg.teams;
  const next = S.takeSeat({ ...save, pressTilt: 1, seasonTradeLine: 'A deal at the old club.' }, offer);
  st.takes += 1;
  const kept = next.league === lg && lg.season === seasonBefore && lg.champions.length === champsBefore
    && lg.teams === teamsRef && next.titles === save.titles;
  const moved = next.myTeam === offer.teamId && next.trust === S.FO_TRUST_START && next.fired === false && next.mandate === offer.ask
    && next.pressTilt === 0 && next.seasonTradeLine === null;
  if (!kept || !moved) st.takeBad += 1;
  return { ...next, league: lg };
}

/* ---------------- run ---------------- */

const ONLY_PACKS = (process.env.SIM_GMSEAT_PACKS || '').split(',').filter(Boolean);
const PACKS = Object.values(S.GM_SEAT_PACKS).filter(p => !ONLY_PACKS.length || ONLY_PACKS.includes(p.id));
console.log(`simGmSeat: ${PACKS.length} packs x ${TENURES} tenures x seeds ${SEEDS.join(',')}${CONTROL ? `, CONTROL ${CONTROL}` : ''}`);
const results = {};
for (const pack of PACKS) {
  const t0 = Date.now();
  results[pack.id] = SEEDS.map(seed => runPack(pack, seed));
  if (MEASURE) console.log(`  ${pack.id} ran in ${Date.now() - t0} ms, ${results[pack.id][0].seasons} seasons, ${results[pack.id][0].tenures} tenures`);
}

const pct = (a, b) => (b ? (100 * a) / b : NaN);
const mean = ([s, n]) => (n ? s / n : NaN);
console.log('pack  seed  feeds badlyF badlyTop walkF walkMiss walkLv1-4      firedF empty%  titled  bad   margin bids bidsBad takes takeBad clubHits');
for (const pack of PACKS) {
  results[pack.id].forEach((st, i) => {
    console.log([
      pack.id.padEnd(5), String(SEEDS[i]).padEnd(5), String(st.feeds).padEnd(5), String(st.badlyFeeds).padEnd(6),
      String(st.badlyTop).padEnd(8), String(st.walkFeeds).padEnd(5), String(st.walkMiss).padEnd(8),
      st.walkByLevel.slice(1).join('/').padEnd(14), String(st.firedFirst).padEnd(6),
      pct(st.firedEmpty, st.firedFirst).toFixed(1).padEnd(7), mean(st.titled).toFixed(2).padEnd(7),
      mean(st.bad).toFixed(2).padEnd(5), (mean(st.titled) - mean(st.bad)).toFixed(2).padEnd(6), `${pct(st.titled[2], st.titled[1]).toFixed(1)}/${pct(st.bad[2], st.bad[1]).toFixed(1)}`.padEnd(12),
      String(st.bids).padEnd(4), String(st.bidsBad).padEnd(7), String(st.takes).padEnd(5), String(st.takeBad).padEnd(7), st.firedClubHits,
    ].join(' '));
  });
}
if (MEASURE) process.exit(0);

/* The bands below were measured; see the header for the runs behind them. */
const EMPTY_BAND = {
  nfl: [50, 59], nba: [46, 57], nhl: [48, 58], mlb: [48, 59], cfb: [51, 62], cbb: [38, 49], afl: [46, 59],
};
const MARGIN_MIN = { nfl: 0.2, nba: 0.24, nhl: 0.22, mlb: 0.22, cfb: 0.15, cbb: 0.35, afl: 0.65 };
const BAD_TOP2_MAX = 3;
const COLLEGE = ['cfb', 'cbb'];
const NON_FRANCHISE = ['cfb', 'cbb', 'afl'];
/* The round's buyout design, this file's own copy (see section 9). The band
   is 4.5 binomial standard errors of the pooled count, never under 2 points:
   over seeds 1 to 5 one seed alone sat at most 2.1 errors off the design. */
const BID_RATE = { title: 0.6, overachieved: 0.35 };
const bidTol = (p, n) => Math.max(0.02, 4.5 * Math.sqrt((p * (1 - p)) / n));
/* The en and em dash, built from char codes so this file never carries one. */
const DASHES = new RegExp(`[${String.fromCharCode(0x2013, 0x2014)}]`);
const all = id => results[id];
const sum = (id, k) => all(id).reduce((a, st) => a + st[k], 0);

console.log("1. seat words: buildOwnerMandate's ladder at every rank, champion flag and press tilt, in the seat's own words");
{
  let checked = 0; let ladderBad = 0; let textBad = 0; let leak = 0;
  for (const pack of PACKS) {
    const n = LEAGUES[pack.id].n;
    for (const champ of [false, true]) for (const tilt of [-1, 0, 1]) for (let rank = 1; rank <= n; rank++) {
      const base = S.buildOwnerMandate(rank, n, champ, pack.words, 2026, tilt);
      const mine = S.seatMandate(pack, rank, n, champ, 2026, tilt);
      checked += 1;
      if (mine.tier !== base.tier || mine.winFloor !== base.winFloor || mine.reqLevel !== base.reqLevel || mine.season !== base.season) ladderBad += 1;
      if (/[{}]/.test(mine.text) || DASHES.test(mine.text)) textBad += 1;
      if (NON_FRANCHISE.includes(pack.id) && /ownership|franchise/i.test(mine.text)) leak += 1;
      /* A league only seat has no finals, so no ask may promise one. */
      if (pack.ladder && /final|playoff/i.test(mine.text)) leak += 1;
    }
  }
  if (checked < 1000) fail(`only ${checked} mandates checked`);
  if (ladderBad) fail(`${ladderBad} mandates left buildOwnerMandate's ladder`); else ok(`${checked} mandates keep the ladder`);
  if (textBad) fail(`${textBad} asks carry a raw placeholder or a dash`); else ok('no raw placeholder and no dash in any ask');
  if (leak) fail(`${leak} program, club or gym asks talk about ownership or a franchise`); else ok('no program, club or gym ask talks like a franchise');
}
console.log("2. a man who leaves straight after a 'badly' season (fired, or his contract ran out) is never offered a top tier job (every simulated feed)");
console.log("2. a man fired straight after a 'badly' season is never offered a top tier job (every simulated feed)");
for (const pack of PACKS) {
  const feeds = sum(pack.id, 'badlyFeeds'); const top = sum(pack.id, 'badlyTop');
  if (feeds < 100) fail(`${pack.id}: only ${feeds} feeds after a badly exit, the check is near vacuous`);
  if (top) fail(`${pack.id}: ${top} of ${feeds} feeds after a badly exit offered a top tier job`);
  else ok(`${pack.id}: 0 top tier offers in ${feeds} feeds after a badly exit`);
}

console.log("3. the title ladder: three seasons over the ask, 0 to 6 titles, then four 'badly' seasons, sacked or walking out, every step");
{
  /* Section 2 rarely meets the man this rule exists for, because the engine's
     own ceiling already shuts most of the badly-fired out of the top tier.
     This walks the decorated ones step by step, in a six club league where
     the one other top tier club is always in reach: from 5 titles the engine
     alone hands him that club (the badlyceiling control shows it; in a 32
     team league it does so about once in 2,800 offers, too rare to test). */
  const teams = Array.from({ length: 6 }, (_, i) => ({ id: `L${String(i).padStart(2, '0')}`, name: `Ladder ${i}`, strength: 100 - i }));
  const tiers = S.leagueTiers(teams);
  /* Walking out before the call comes must not wash the 'badly' season off:
     the same ladder, ended 'walked', gets the same ceiling (control
     badlywalk puts the old fired-only rule back). */
  for (const ending of ['fired', 'walked']) {
  console.log(`   ended ${ending}`);
  let prev = -Infinity; let stepBad = 0; let topAll = 0; let offeredAll = 0;
  for (let k = 0; k <= 6; k++) {
    let c = S.newGmCareer('L00', 1, 2026);
    for (const g of [...Array(3).fill('overachieved'), ...Array(k).fill('title'), ...Array(4).fill('badly')]) c = S.recordSeatSeason(c, g);
    c = S.endSeatStint(c, ending);
    const standing = S.managerStanding(S.careerProfile(c, tiers));
    /* Rises every step until the engine's own clamp at 100 holds it. */
    if (!(standing > prev || (standing === 100 && prev === 100))) stepBad += 1;
    prev = standing;
    let top = 0; let offered = 0;
    for (let s = 1; s <= 400; s++) {
      const feed = S.seatOffers(S.GM_SEAT_PACKS.afl, teams, c, 2040, seeded(s * 31 + k + (ending === 'walked' ? 7 : 0)));
      offered += feed.length;
      top += feed.filter(o => o.tier === 1).length;
    }
    topAll += top; offeredAll += offered;
    console.log(`     ${k} titles: standing ${standing.toFixed(1)}, ${offered} offers in 400 feeds, ${top} top tier`);
  }
  if (stepBad) fail(`${ending}: standing failed to rise on ${stepBad} title steps`); else ok(`${ending}: every title step raises the standing`);
  if (offeredAll < 500) fail(`${ending}: only ${offeredAll} ladder offers, the check is near vacuous`);
  if (topAll) fail(`${ending}: ${topAll} top tier offers on the badly ladder`); else ok(`${ending}: 0 top tier offers in ${offeredAll} ladder offers`);
  }
}

console.log('4. a title winner who walks always has an offer at his level or above');
{
  const byLevel = [0, 0, 0, 0, 0];
  for (const pack of PACKS) {
    const feeds = sum(pack.id, 'walkFeeds'); const miss = sum(pack.id, 'walkMiss');
    all(pack.id).forEach(st => st.walkByLevel.forEach((v, i) => { byLevel[i] += v; }));
    if (feeds < 20) fail(`${pack.id}: only ${feeds} title walkers`);
    if (miss) fail(`${pack.id}: ${miss} of ${feeds} title walkers had nothing at their level or above`);
    else ok(`${pack.id}: all ${feeds} title walkers had an offer at their level or above`);
  }
  /* Every rung of the tier ladder must have been walked at least a few times. */
  for (let lv = 1; lv <= 4; lv++) if (byLevel[lv] < 5) fail(`only ${byLevel[lv]} title walkers left a tier ${lv} seat`);
  ok(`walkers by the tier they left: ${byLevel.slice(1).join(' / ')}`);
  /* The guarantee is a step sideways, never a leap: no offer above both the
     engine's own ceiling and the nearest tier at his level (control
     walknearest reaches for the top tier instead). */
  let leaps = 0; let teeth = 0;
  for (const pack of PACKS) { leaps += sum(pack.id, 'walkLeaps'); teeth += sum(pack.id, 'walkTeeth'); }
  if (teeth < 100) fail(`only ${teeth} walker feeds where a leap would show, the check is near vacuous`);
  if (leaps) fail(`${leaps} title walker feeds held an offer above both the engine's ceiling and the nearest tier at his level`);
  else ok(`no leap past the nearest tier in ${teeth} walker feeds where one would show`);
}

console.log('5. the club you just left is never in the feed');
for (const pack of PACKS) {
  const hits = sum(pack.id, 'firedClubHits');
  if (hits) fail(`${pack.id}: the club you just left was in ${hits} feeds`);
  else ok(`${pack.id}: never, in ${sum(pack.id, 'feeds')} feeds`);
}

console.log('6. an empty feed after a sacking is possible, at a share inside the measured band (every seed)');
for (const pack of PACKS) {
  const [lo, hi] = EMPTY_BAND[pack.id];
  all(pack.id).forEach((st, i) => {
    const share = pct(st.firedEmpty, st.firedFirst);
    if (!(share >= lo && share <= hi)) fail(`${pack.id} seed ${SEEDS[i]}: ${share.toFixed(1)}% of sacked GMs found an empty feed, band ${lo} to ${hi}`);
    else ok(`${pack.id} seed ${SEEDS[i]}: ${share.toFixed(1)}% empty (${st.firedEmpty} of ${st.firedFirst}), band ${lo} to ${hi}`);
  });
}

console.log('7. fired after a title beats fired after two bad years, and the two bad years earn no top half job (every seed)');
for (const pack of PACKS) {
  all(pack.id).forEach((st, i) => {
    const margin = mean(st.titled) - mean(st.bad);
    const badTop = pct(st.bad[2], st.bad[1]);
    if (st.titled[1] < 50 || st.bad[1] < 50) fail(`${pack.id} seed ${SEEDS[i]}: groups too small (${st.titled[1]} titled, ${st.bad[1]} bad)`);
    if (!(margin >= MARGIN_MIN[pack.id])) fail(`${pack.id} seed ${SEEDS[i]}: best offer margin ${margin.toFixed(2)} under ${MARGIN_MIN[pack.id]}`);
    else ok(`${pack.id} seed ${SEEDS[i]}: best offer margin ${margin.toFixed(2)} (floor ${MARGIN_MIN[pack.id]}), titled n=${st.titled[1]}, bad n=${st.bad[1]}`);
    if (!(badTop <= BAD_TOP2_MAX)) fail(`${pack.id} seed ${SEEDS[i]}: ${badTop.toFixed(1)}% of the two-bad-years sacked drew a top half offer, cap ${BAD_TOP2_MAX}`);
    else ok(`${pack.id} seed ${SEEDS[i]}: ${badTop.toFixed(1)}% of the two-bad-years sacked drew a top half offer (cap ${BAD_TOP2_MAX})`);
  });
}

console.log('8. taking a job moves the seat and keeps the league: its season, champions and teams');
for (const pack of PACKS) {
  const takes = sum(pack.id, 'takes'); const bad = sum(pack.id, 'takeBad');
  if (takes < 100) fail(`${pack.id}: only ${takes} jobs taken`);
  if (bad) fail(`${pack.id}: ${bad} of ${takes} takes lost or changed league state`);
  else ok(`${pack.id}: ${takes} takes, league state kept every time`);
}

console.log('9. only a college coach is bought out, only one tier up, only after a big year');
for (const pack of PACKS) {
  const bids = sum(pack.id, 'bids'); const bad = sum(pack.id, 'bidsBad');
  if (!COLLEGE.includes(pack.id)) {
    if (bids) fail(`${pack.id}: a ${pack.role} drew ${bids} buyout bids, a seat that never draws one in this game`);
    else ok(`${pack.id}: no buyout bids, ever`);
    continue;
  }
  if (bids < 50) fail(`${pack.id}: only ${bids} buyout bids, the flag barely reads`);
  if (bad) fail(`${pack.id}: ${bad} of ${bids} bids were not one tier up (by the league's own tiers) after a big year`);
  else ok(`${pack.id}: ${bids} bids, every one a tier up by the league's own tiers after a title or a season over the ask`);
  /* The bid rate per big year below the top tier, against this file's own
     numbers (the round's design: 60 percent after a title, 35 after a season
     over the ask), never the module's constant. Control poachrate. */
  for (const g of ['title', 'overachieved']) {
    const chances = all(pack.id).reduce((a, st) => a + st.bigBelowTop[g], 0);
    const got = all(pack.id).reduce((a, st) => a + st.bidsAfter[g], 0);
    const rate = chances ? got / chances : NaN;
    if (chances < 200) fail(`${pack.id}: only ${chances} ${g} years below the top tier, too few to read a rate`);
    else {
      const tol = bidTol(BID_RATE[g], chances);
      const line = `bids after a ${g} year ${(100 * rate).toFixed(1)}% (${got} of ${chances}), design ${100 * BID_RATE[g]} +/- ${(100 * tol).toFixed(1)}`;
      if (!(Math.abs(rate - BID_RATE[g]) <= tol)) fail(`${pack.id}: ${line}`); else ok(`${pack.id}: ${line}`);
    }
  }
}

console.log('10. a league only seat (no finals): every ask can be met by a place the ladder has');
for (const pack of PACKS.filter(p => p.ladder)) {
  /* For every rank, champion flag and press tilt, a contend or playoffs ask
     must be exactly met by some final ladder place, graded through the real
     ladderSeasonOutcome and gradeSeason. Control ladderfinals (nobody ever
     'makes it') leaves the top four ask unmeetable. */
  const n = LEAGUES[pack.id].n;
  let asks = 0; let unmeetable = 0;
  for (const champ of [false, true]) for (const tilt of [-1, 0, 1]) for (let rank = 1; rank <= n; rank++) {
    const m = S.seatMandate(pack, rank, n, champ, 2026, tilt);
    if (m.tier !== 'contend' && m.tier !== 'playoffs') continue;
    asks += 1;
    let met = false;
    for (let place = 1; place <= n; place++) if (S.gradeSeason(m, S.ladderSeasonOutcome(pack, place, 0)).result === 'met') met = true;
    if (!met) unmeetable += 1;
  }
  if (asks < 10) fail(`${pack.id}: only ${asks} ladder asks checked`);
  if (unmeetable) fail(`${pack.id}: ${unmeetable} of ${asks} contend or playoffs asks cannot be met by any ladder place`);
  else ok(`${pack.id}: all ${asks} contend and playoffs asks can be met by a ladder place`);
}
if (!ONLY_PACKS.length && !PACKS.some(p => p.ladder)) fail('no league only pack, section 10 checked nothing');

console.log(failures ? `simGmSeat: ${failures} FAILURE(S)${CONTROL ? ` under control ${CONTROL}` : ''}` : `simGmSeat: all checks passed${CONTROL ? ` (control ${CONTROL} did NOT fire)` : ''}`);
process.exit(failures ? 1 : 0);
