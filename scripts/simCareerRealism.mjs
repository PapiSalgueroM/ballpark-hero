/**
 * Round 97 harness: do the four US career sims produce REAL stat lines?
 *
 * The existing per-sport playtests prove nothing crashes and every position
 * puts up numbers. They never ask whether those numbers look like the sport.
 * A career mode lives or dies on that: if every first baseman hits 47 home
 * runs, or a relief pitcher strikes out 151 batters in a season that nobody
 * in history has come close to, the stat line stops meaning anything and so
 * does the whole career.
 *
 * This simulates thousands of seasons per position and checks two things:
 *  - a HARD CEILING nothing may ever cross, set at or just above the real
 *    single-season record, so an impossible number is a hard failure
 *  - the MEDIAN, checked against what a real starter in that position
 *    actually does, so the sim cannot quietly make everybody a superstar
 *
 * Every bound below is a real record or a real league norm, noted inline.
 * Run: node scripts/simCareerRealism.mjs [seasonsPerPos]
 */
import { build } from 'esbuild';
import { pathToFileURL } from 'node:url';

const N = Number(process.argv[2] || 400);
// Peak seasons happen in a player's prime, not his rookie year, so every
// sampled career is run deep enough to actually get there.
const SEASONS = 14;
let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

async function load(file, out) {
  await build({
    entryPoints: [`src/lib/${file}.ts`],
    bundle: true, format: 'esm', platform: 'node', outfile: out,
    logLevel: 'error', alias: { '@': './src' },
  });
  return import(pathToFileURL(out).href);
}

const [mlb, nba, nfl, nhl] = await Promise.all([
  load('mlbMyCareer', '/tmp/rl-mlb.mjs'),
  load('nbaMyCareer', '/tmp/rl-nba.mjs'),
  load('nflMyCareer', '/tmp/rl-nfl.mjs'),
  load('nhlMyCareer', '/tmp/rl-nhl.mjs'),
]);

const median = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };
const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * p))] : 0; };

/**
 * Check one stat.
 *  ceiling: the real single-season record (or a hair above). NOTHING may cross it.
 *  medLo/medHi: what a real everyday starter at that position actually does.
 */
function check(sport, pos, stat, vals, { ceiling, medLo, medHi, note, spread }) {
  const clean = vals.filter(v => typeof v === 'number' && Number.isFinite(v));
  if (clean.length < 20) { fail(`${sport} ${pos} ${stat}: only ${clean.length} samples`); return; }
  const mx = Math.max(...clean);
  const md = median(clean);
  const p05 = pct(clean, 0.05);
  const p95 = pct(clean, 0.95);
  // Round 98: a sim where every season looks the same is not realistic even
  // when every number is individually legal, so the SPREAD is checked too.
  // `spread` is the minimum acceptable p95 over p05 ratio for that stat.
  const ratio = p05 > 0 ? p95 / p05 : Infinity;
  const flat = spread !== undefined && ratio < spread;
  const flag = (mx > ceiling ? ' OVER-CEILING' : '') + (md < medLo || md > medHi ? ' MEDIAN-OFF' : '') + (flat ? ' TOO-FLAT' : '');
  console.log(`   ${sport} ${pos.padEnd(5)} ${stat.padEnd(9)} p05 ${String(p05).padStart(6)}  med ${String(md).padStart(6)}  p95 ${String(p95).padStart(6)}  max ${String(mx).padStart(6)}  spread ${ratio === Infinity ? ' inf' : ratio.toFixed(2)}${flag}`);
  if (mx > ceiling) fail(`${sport} ${pos} ${stat}: ${mx} beats the real single season record of ${ceiling}${note ? ' (' + note + ')' : ''}`);
  if (md < medLo) fail(`${sport} ${pos} ${stat}: median ${md} is below a real starter's ${medLo}`);
  if (md > medHi) fail(`${sport} ${pos} ${stat}: median ${md} is above a real starter's ${medHi}, everyone is a superstar`);
  if (flat) fail(`${sport} ${pos} ${stat}: p95 is only ${ratio.toFixed(2)}x p05, every season looks the same`);
}

/* ================================ MLB ================================ */
console.log('\nMLB');
{
  const { MLB_ARCHETYPES, startMlbCareer, simMlbSeason, mlbRollTeamQuality } = mlb;
  const POS = ['SP', 'RP', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'];
  const acc = {};
  for (const pos of POS) {
    acc[pos] = {};
    for (let i = 0; i < N; i++) {
      const arch = MLB_ARCHETYPES[pos][i % MLB_ARCHETYPES[pos].length];
      const c = startMlbCareer(`R ${i}`, pos, arch, Math.random, null);
      let tq = null;
      for (let s = 0; s < SEASONS && !c.retired; s++) {
        tq = mlbRollTeamQuality(tq, Math.random);
        const { line } = simMlbSeason(c, tq, Math.random);
        for (const [k, v] of Object.entries(line)) {
          if (typeof v !== 'number') continue;
          (acc[pos][k] ||= []).push(v);
        }
        if (typeof mlb.mlbProgress === 'function') mlb.mlbProgress(c, Math.random);
      }
    }
  }
  // Bonds 73 HR (2001), Hack Wilson 191 RBI (1930), Hugh Duffy .440 (1894),
  // Rickey Henderson 130 SB (1982), Nolan Ryan 383 K (1973), Francisco
  // Rodriguez 62 saves (2008), Nolan Ryan again for wins is 27 (Denny
  // McLain 31, 1968). Relief pitcher single season strikeout high is about
  // 137 (Dick Radatz, 1964); anything near 150 has never happened.
  for (const pos of ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH']) {
    // The designated hitter is a pure slugger, so he gets his own band.
    const power = ['1B', '3B', 'LF', 'RF'].includes(pos);
    const hrHi = pos === 'DH' ? 34 : power ? 31 : 24;
    check('MLB', pos, 'hr', acc[pos].hr ?? [], { ceiling: 73, medLo: pos === 'DH' || power ? 12 : 6, medHi: hrHi, spread: 1.9 });
    check('MLB', pos, 'rbi', acc[pos].rbi ?? [], { ceiling: 191, medLo: 30, medHi: 110, spread: 1.6 });
    check('MLB', pos, 'avg', acc[pos].avg ?? [], { ceiling: 0.44, medLo: 0.24, medHi: 0.295 });
  }
  check('MLB', 'SP', 'so', acc.SP.so ?? [], { ceiling: 383, medLo: 90, medHi: 230, spread: 1.6 });
  check('MLB', 'SP', 'wins', acc.SP.wins ?? [], { ceiling: 31, medLo: 5, medHi: 18 });
  check('MLB', 'SP', 'era', acc.SP.era ?? [], { ceiling: 12, medLo: 2.4, medHi: 5.2 });
  check('MLB', 'RP', 'so', acc.RP.so ?? [], { ceiling: 143, medLo: 35, medHi: 85, note: "Dick Radatz threw 157 relief innings in 1964; in the one inning era Josh Hader's 138 in 2019 is the high" });
  check('MLB', 'RP', 'saves', acc.RP.saves ?? [], { ceiling: 62, medLo: 0, medHi: 40 });
  check('MLB', 'RP', 'holds', acc.RP.holds ?? [], { ceiling: 41, medLo: 0, medHi: 28 });
}

/* ================================ NBA ================================ */
console.log('\nNBA');
{
  const { NBA_ARCHETYPES, startNbaCareer, simNbaSeason, nbaRollTeamQuality } = nba;
  const POS = ['PG', 'SG', 'SF', 'PF', 'C'];
  const acc = {};
  for (const pos of POS) {
    acc[pos] = {};
    for (let i = 0; i < N; i++) {
      const arch = NBA_ARCHETYPES[pos][i % NBA_ARCHETYPES[pos].length];
      const c = startNbaCareer(`R ${i}`, pos, arch, Math.random, null);
      let tq = null;
      for (let s = 0; s < SEASONS && !c.retired; s++) {
        tq = nbaRollTeamQuality(tq, Math.random);
        const { line } = simNbaSeason(c, tq, Math.random);
        for (const [k, v] of Object.entries(line)) {
          if (typeof v !== 'number') continue;
          (acc[pos][k] ||= []).push(v);
        }
        if (typeof nba.nbaProgress === 'function') nba.nbaProgress(c, Math.random);
      }
    }
  }
  // Chamberlain 50.4 ppg and 27.2 rpg (1961-62), Stockton 14.5 apg (1989-90).
  // A real rotation starter is nowhere near any of those.
  for (const pos of POS) {
    const big = pos === 'PF' || pos === 'C';
    check('NBA', pos, 'ppg', acc[pos].ppg ?? [], { ceiling: 50.4, medLo: 6, medHi: 22, spread: 1.9 });
    check('NBA', pos, 'rpg', acc[pos].rpg ?? [], { ceiling: 27.2, medLo: big ? 4 : 1.5, medHi: big ? 12 : 7 });
    const apgHi = pos === 'PG' ? 10 : pos === 'SF' ? 7 : pos === 'C' ? 5 : 6;
    check('NBA', pos, 'apg', acc[pos].apg ?? [], { ceiling: 14.5, medLo: 0.5, medHi: apgHi });
  }
}

/* ================================ NFL ================================ */
console.log('\nNFL');
{
  const { ARCHETYPES, startCareer, simSeason } = nfl;
  const POS = ['QB', 'RB', 'WR', 'TE', 'LB', 'CB', 'EDGE', 'K'];
  const acc = {};
  for (const pos of POS) {
    acc[pos] = {};
    for (let i = 0; i < N; i++) {
      const arch = ARCHETYPES[pos][i % ARCHETYPES[pos].length];
      const c = startCareer(`R ${i}`, pos, arch, Math.random, null);
      let tq = null;
      for (let s = 0; s < SEASONS && !c.retired; s++) {
        tq = nfl.rollTeamQuality(tq, Math.random);
        const res = simSeason(c, tq, Math.random);
        const line = res.line ?? res;
        for (const [k, v] of Object.entries(line)) {
          if (typeof v !== 'number') continue;
          (acc[pos][k] ||= []).push(v);
        }
        if (typeof nfl.progress === 'function') nfl.progress(c, Math.random);
      }
    }
  }
  // Peyton Manning 5477 pass yds and 55 pass TD (2013), George Blanda 42 INT
  // (1962), Eric Dickerson 2105 rush yds (1984), LaDainian Tomlinson 28 rush
  // TD (2006), Michael Thomas 149 rec (2019), Calvin Johnson 1964 rec yds
  // (2012), Randy Moss 23 rec TD (2007), Michael Strahan 22.5 sacks (2001),
  // Night Train Lane 14 INT (1952), Tackle records are unofficial but 200 is
  // the ceiling nobody touches, Kevin Butler style FG high is 44 made.
  check('NFL', 'QB', 'passYds', acc.QB.passYds ?? [], { ceiling: 5477, medLo: 1500, medHi: 4200, spread: 1.5 });
  check('NFL', 'QB', 'passTd', acc.QB.passTd ?? [], { ceiling: 55, medLo: 8, medHi: 32 });
  check('NFL', 'QB', 'ints', acc.QB.ints ?? [], { ceiling: 42, medLo: 3, medHi: 20 });
  check('NFL', 'RB', 'rushYds', acc.RB.rushYds ?? [], { ceiling: 2105, medLo: 300, medHi: 1200, spread: 1.8 });
  check('NFL', 'RB', 'rushTd', acc.RB.rushTd ?? [], { ceiling: 28, medLo: 1, medHi: 12 });
  check('NFL', 'WR', 'rec', acc.WR.rec ?? [], { ceiling: 149, medLo: 20, medHi: 90 });
  check('NFL', 'WR', 'recYds', acc.WR.recYds ?? [], { ceiling: 1964, medLo: 250, medHi: 1200, spread: 1.8 });
  check('NFL', 'TE', 'rec', acc.TE.rec ?? [], { ceiling: 149, medLo: 15, medHi: 80 });
  check('NFL', 'LB', 'tackles', acc.LB.tackles ?? [], { ceiling: 200, medLo: 40, medHi: 140 });
  check('NFL', 'EDGE', 'sacks', acc.EDGE.sacks ?? [], { ceiling: 22.5, medLo: 1, medHi: 12 });
  check('NFL', 'CB', 'picks', acc.CB.picks ?? [], { ceiling: 14, medLo: 0, medHi: 5 });
  check('NFL', 'K', 'fgMade', acc.K.fgMade ?? [], { ceiling: 44, medLo: 10, medHi: 32 });
}

/* ================================ NHL ================================ */
console.log('\nNHL');
{
  const { NHL_ARCHETYPES, startNhlCareer, simNhlSeason, nhlRollTeamQuality } = nhl;
  const POS = ['C', 'LW', 'RW', 'D', 'G'];
  const acc = {};
  for (const pos of POS) {
    acc[pos] = {};
    for (let i = 0; i < N; i++) {
      const arch = NHL_ARCHETYPES[pos][i % NHL_ARCHETYPES[pos].length];
      const c = startNhlCareer(`R ${i}`, pos, arch, Math.random, null);
      let tq = null;
      for (let s = 0; s < SEASONS && !c.retired; s++) {
        tq = nhlRollTeamQuality(tq, Math.random);
        const { line } = simNhlSeason(c, tq, Math.random);
        for (const [k, v] of Object.entries(line)) {
          if (typeof v !== 'number') continue;
          (acc[pos][k] ||= []).push(v);
        }
        if (typeof nhl.nhlProgress === 'function') nhl.nhlProgress(c, Math.random);
      }
    }
  }
  // Gretzky 92 goals, 163 assists and 215 points (1980s), Bobby Orr 102
  // assists as a defenceman (1970-71), Martin Brodeur 48 wins (2006-07),
  // and no goalie has ever finished a full season above .940.
  for (const pos of ['C', 'LW', 'RW']) {
    check('NHL', pos, 'goals', acc[pos].goals ?? [], { ceiling: 92, medLo: 5, medHi: 35, spread: 2 });
    check('NHL', pos, 'assists', acc[pos].assists ?? [], { ceiling: 163, medLo: 5, medHi: 50 });
    check('NHL', pos, 'points', acc[pos].points ?? [], { ceiling: 215, medLo: 12, medHi: 80, spread: 1.9 });
  }
  check('NHL', 'D', 'goals', acc.D.goals ?? [], { ceiling: 48, medLo: 1, medHi: 14 });
  check('NHL', 'D', 'assists', acc.D.assists ?? [], { ceiling: 102, medLo: 5, medHi: 45 });
  check('NHL', 'G', 'wins', acc.G.wins ?? [], { ceiling: 48, medLo: 8, medHi: 36 });
  check('NHL', 'G', 'svpct', acc.G.svpct ?? [], { ceiling: 0.94, medLo: 0.885, medHi: 0.925 });
}

console.log(failures === 0 ? '\nALL CAREER REALISM CHECKS PASSED' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
