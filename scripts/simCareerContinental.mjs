/**
 * Round 972: Soccer Career's continental club cup is the right one for the
 * club, and it is kept under its own name.
 *
 * WHAT WAS WRONG. simulateUCL gated on the club's tier alone (85 percent at
 * tier 1, 35 at tier 2) and read nothing about where the club was. So a
 * player at Boca Juniors, River Plate, Flamengo or Sao Paulo (tier 1) or Al
 * Hilal, Palmeiras, Monterrey, LA Galaxy or Inter Miami (tier 2) played the
 * UEFA Champions League against European clubs, could win it, and had it
 * counted as a Champions League in the cabinet, the Ballon d'Or and the
 * legacy score.
 *
 * WHAT THIS HOLDS:
 *   1. Not one club outside UEFA plays the Champions League, over every
 *      club in the list at tiers 1 and 2 and four eras, and they do play their
 *      own cup (the check is not vacuous).
 *   2. Every opponent shares the club's confederation, and each cup carries
 *      its name for the season, checked against a table typed here from the
 *      sources in src/lib/soccerCareerContinental.ts rather than read from it.
 *   3. Europe is untouched for UEFA clubs: a club with its country set wins
 *      the Champions League per tier within main's measured band (the band
 *      and how it was measured are at the section).
 *   4. The honour is kept under its own name: a career at Boca never records
 *      a Champions League, does record the Copa Libertadores, and the totals,
 *      the legacy breakdown and the top scorer award all say so.
 *   5. The pass curves the first stage is solved against are fresh: measured
 *      again here over the module's own playFirstStage and held to the table.
 *   6. The Ballon d'Or scores a cup won outside UEFA under its own name: the
 *      nights a Boca career actually had list it as a club cup and never as a
 *      Champions League, and the engine's own scorer values it above nothing
 *      and below a Champions League (added after the review of 2026-10-03,
 *      which swapped the two and found every check green).
 *   7. The final is played over the legs RSSSF records for the season, in a
 *      table typed here, and the abandoned 2001 CONCACAF cup is never played.
 *   8. A club through the league phase play-off meets each knockout round at
 *      the same target as a club that went straight to the round of 16.
 *
 * NEGATIVE CONTROLS (SC_CONT_CONTROL), each refusing to run unless its anchor
 * is in the bundle exactly once:
 *   tieronly  the tier only gate is back (the country is not read): 1 red.
 *   asucl     a cup won outside UEFA is recorded as a Champions League: 4 red.
 *   stalecal  one row of the pass curves is shifted by ten points: 5 red.
 *   bdorucl   the Ballon d'Or scores a club cup as a Champions League: 6 red.
 *   onefinal  every final outside UEFA is one match: 7 red.
 *   pofrom    the play-off pushes every later round one target harder (the
 *             old rounds.indexOf): 8 red.
 *
 * SC_CONT_PRINT_CALIBRATION=1 prints a fresh calibration table to paste into
 * the module (20,000 stages a point; several minutes, run it detached).
 *
 * Run: node scripts/simCareerContinental.mjs      (no database)
 */
import './lib/seedRandom.mjs';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

const CONTROL = process.env.SC_CONT_CONTROL || '';
const KNOWN_CONTROLS = ['tieronly', 'asucl', 'stalecal', 'bdorucl', 'onefinal', 'pofrom'];
if (CONTROL && !KNOWN_CONTROLS.includes(CONTROL)) {
  console.error(`SC_CONT_CONTROL=${CONTROL} is not a control this harness knows`);
  process.exit(1);
}

const ENTRY = path.join(os.tmpdir(), 'scContEntry.mjs');
const BUNDLE = path.join(os.tmpdir(), 'scCont.bundle.mjs');
const src = p => `${ROOT.replaceAll('\\', '/')}/src/lib/${p}`;
fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const mod = await import('${src('soccerCareerEngine.ts')}');
export const engine = mod;
export * as cont from '${src('soccerCareerContinental.ts')}';
export * as eras from '${src('careerEras.ts')}';
`);
execSync(`${ROOT}/node_modules/.bin/esbuild ${ENTRY} --bundle --format=esm --platform=node --outfile=${BUNDLE} --log-level=error`, { stdio: 'inherit' });

const CONTROL_SWAPS = {
  tieronly: ['clubCupFor(state.currentClubCountry ?? "", uclYear)', 'clubCupFor("", uclYear)'],
  asucl: ['season.championsLeague = isUcl && wonCup;', 'season.championsLeague = wonCup;'],
  stalecal: ['0.6028, 0.6547, 0.7064', '0.5028, 0.5547, 0.6064'],
  bdorucl: ['if (season.clubCupTitle) playerTrophies.push("ClubCup");', 'if (season.clubCupTitle) playerTrophies.push("UCL");'],
  onefinal: ['const finalLegs = isUcl ? 1 : cupFor.period.finalLegs;', 'const finalLegs = 1;'],
  pofrom: ['targetAt(round === "PO" ? 0 : ladder.indexOf(round))', 'targetAt(rounds.indexOf(round))'],
};
if (CONTROL) {
  const [anchor, swap] = CONTROL_SWAPS[CONTROL];
  const text = fs.readFileSync(BUNDLE, 'utf8').replaceAll('\r\n', '\n');
  const n = text.split(anchor).length - 1;
  if (n !== 1) {
    console.error(`CONTROL ${CONTROL} cannot run: its anchor is in the bundle ${n} times, not once (${anchor})`);
    process.exit(1);
  }
  fs.writeFileSync(BUNDLE, text.replace(anchor, swap));
  console.log(`   NEGATIVE CONTROL ON: ${CONTROL}`);
}

/* Section 6 reads the engine's own Ballon d'Or scorer, which the engine does
   not export: the bundle is given one export line for it, and refuses to run
   when the function is not there under that name exactly once. */
{
  const text = fs.readFileSync(BUNDLE, 'utf8');
  const n = text.split('function calcBdorPoints(').length - 1;
  if (n !== 1) {
    console.error(`calcBdorPoints is in the bundle ${n} times, not once, so section 6 cannot read it`);
    process.exit(1);
  }
  fs.writeFileSync(BUNDLE, `${text}\nexport { calcBdorPoints as __calcBdorPoints };\n`);
}

const bundle = await import(pathToFileURL(BUNDLE).href);
const E = bundle.engine;
const C = bundle.cont;
const ERAS = bundle.eras;
for (const fn of ['simulateUCL', 'advanceProSeason', 'initCareer', 'getCareerTotals', 'calculateLegacy']) {
  if (typeof E[fn] !== 'function') { console.error(`${fn} is not exported from the engine`); process.exit(1); }
}
const CLUBS = E.FALLBACK_CLUBS;
const countryOf = new Map(CLUBS.map(c => [c.name, c.country]));
const stateFor = (overall, tier, club, country, year) => ({
  currentClubTier: tier, currentClub: club, currentClubCountry: country,
  overall, position: 'ST', seasons: [{ year: year - 1 }],
});
const firstFailureOf = {};
const section = (n, title) => { firstFailureOf[n] = failures; console.log(`${n}) ${title}`); };

if (process.env.SC_CONT_PRINT_CALIBRATION === '1') {
  /* A fresh table for src/lib/soccerCareerContinental.ts, each row made
     non-decreasing so the inversion there is well posed. */
  const mono = row => { let x = 0; return row.map(v => (x = Math.max(x, v))).map(v => Number(v.toFixed(4))); };
  for (const curve of ['winner2', 'top2_2', 'top2_3', 'best6_3', 'twice_3', 'league']) {
    const pass = [];
    const top8 = [];
    for (const s of C.PASS_GRID) {
      const r = C.measureStage(curve, s, 20000, Math.random);
      pass.push(r.pass);
      top8.push(r.top8);
    }
    console.log(`  ${curve}: [${mono(pass).join(', ')}],`);
    if (curve === 'league') console.log(`LEAGUE_TOP8 = [${mono(top8).join(', ')}];`);
  }
  process.exit(0);
}

/* ------------------------------------------------------------------ */
const YEARS = [1995, 2005, 2015, 2026];
const red = {};
section(1, 'No club outside UEFA plays the Champions League, and they play their own cup');
{
  const before = failures;
  /* Every club in the list, at the tier it has that season and also forced to
     tier 1, because the gate under test is the country, not the tier. */
  let wrong = 0, ownCup = 0, uefaWrong = 0, uefaCampaigns = 0;
  const seenCups = new Set();
  for (const year of YEARS) {
    for (const club of ERAS.adjustClubsForYear(CLUBS, year)) {
      const conf = C.clubConfederation(club.country);
      for (const tier of [Math.min(club.tier, 2), 1]) {
        for (let i = 0; i < 25; i++) {
          const r = E.simulateUCL(stateFor(82, tier, club.name, club.country, year), {});
          if (!r.qualified) continue;
          const isUclName = r.competition === 'Champions League' || r.competition === 'European Cup';
          if (conf === 'UEFA') {
            uefaCampaigns += 1;
            if (r.cup !== 'ucl' || !isUclName) uefaWrong += 1;
          } else if (r.cup === 'ucl' || isUclName) {
            wrong += 1;
            if (wrong <= 3) fail(`${club.name} (${club.country}, ${conf}) played the ${r.competition} in ${year}`);
          } else {
            ownCup += 1;
            seenCups.add(r.cup);
          }
        }
      }
    }
  }
  if (wrong > 3) fail(`${wrong} campaigns in all put a club from outside UEFA in the Champions League`);
  if (uefaWrong > 0) fail(`${uefaWrong} of ${uefaCampaigns} UEFA campaigns were not the Champions League`);
  if (ownCup < 200) fail(`only ${ownCup} campaigns outside UEFA reached any cup, so the check above is close to vacuous`);
  for (const cup of ['libertadores', 'concacaf', 'afc', 'caf']) {
    if (!seenCups.has(cup)) fail(`no club ever played the ${cup} cup, so it went unmeasured`);
  }
  red[1] = failures > before;
  if (!red[1]) console.log(`   0 Champions League campaigns outside UEFA; ${ownCup} campaigns in their own cups (${[...seenCups].join(', ')}); ${uefaCampaigns} UEFA campaigns all the Champions League`);
}

/* ------------------------------------------------------------------ */
section(2, 'Every opponent shares the club\'s confederation, and each cup carries its name for the season');
{
  const before = failures;
  let games = 0, foreign = 0, unknown = 0;
  for (const year of YEARS) {
    for (const club of ERAS.adjustClubsForYear(CLUBS, year)) {
      const conf = C.clubConfederation(club.country);
      if (conf === 'UEFA') continue;
      for (let i = 0; i < 25; i++) {
        const r = E.simulateUCL(stateFor(82, 1, club.name, club.country, year), {});
        if (!r.qualified) continue;
        for (const m of r.matches) {
          games += 1;
          const c = countryOf.get(m.opponent);
          if (!c) { unknown += 1; continue; }
          if (C.clubConfederation(c) !== conf) {
            foreign += 1;
            if (foreign <= 3) fail(`${club.name} (${conf}) met ${m.opponent} (${c}) in the ${r.competition}, ${year}`);
          }
        }
      }
    }
  }
  if (foreign > 3) fail(`${foreign} games in all against a club from another confederation`);
  if (unknown > 0) fail(`${unknown} games against a club that is not in the club list at all`);
  if (games < 1000) fail(`only ${games} games outside UEFA were played, too few to say anything`);
  /* The season's name, typed here from the sources the module cites (RSSSF,
     CONMEBOL, CONCACAF, the AFC, CAF, and the press pieces it lists, read
     2026-10-05), not read from it. */
  const NAMES = [
    ['Argentina', 1995, 'Copa Libertadores'], ['Brazil', 2026, 'Copa Libertadores'],
    ['Mexico', 2007, 'CONCACAF Champions Cup'], ['USA', 2008, 'CONCACAF Champions League'],
    ['USA', 2022, 'CONCACAF Champions League'], ['Mexico', 2023, 'CONCACAF Champions Cup'],
    ['Saudi Arabia', 2001, 'Asian Club Championship'], ['Saudi Arabia', 2002, 'AFC Champions League'],
    ['Saudi Arabia', 2023, 'AFC Champions League'], ['Saudi Arabia', 2024, 'AFC Champions League Elite'],
    ['Egypt', 1996, 'African Cup of Champions Clubs'], ['Egypt', 1997, 'CAF Champions League'],
  ];
  for (const [country, year, want] of NAMES) {
    const got = C.clubCupFor(country, year)?.period?.name;
    if (got !== want) fail(`a ${country} club in ${year} plays the "${got}", the sources say "${want}"`);
  }
  red[2] = failures > before;
  if (!red[2]) console.log(`   ${games} games outside UEFA, every opponent from the club's own confederation; ${NAMES.length} season names as the sources give them`);
}

/* ------------------------------------------------------------------ */
section(3, 'Europe is untouched for UEFA clubs: the Champions League is won as often as on main');
{
  const before = failures;
  /* Main's band, measured 2026-10-03 on origin/main c4ba7492 (the same grid
     as simSoccerCareerUcl section 8: seasons from 1995, 2010 and 2026, overall
     70 to 90 in fours, a striker, 576,000 seasons a tier over eight seeds):
     title 5.920% at Real Madrid, 3.385% at Ajax, 0.656% at Sevilla. Here the
     club's country is set, which section 8 leaves blank, so this is the path a
     real save takes. 2,000 campaigns a cell, 36,000 a tier.
     THE GATE is a FIXED margin in points (the last number in each row), not
     one computed from the sample, so a smaller sample can only make the check
     harder to pass (review of 2026-10-03). The margins are three binomial
     standard errors at 36,000 a tier. Measured on this round's engine in
     nine runs on 2026-10-03 (the default seed on several trees, SIM_SEED=11
     and the builder's earlier runs): Real Madrid 5.728 to 6.019, Ajax 3.517 to 3.567, Sevilla
     0.600 to 0.683, so the furthest run used 51%, 64% and 44% of its margin.
     Ajax sits above main in every run (about +0.15), the first stage's
     solve landing a touch generous at tier 1; inside the margin, and the
     reason this check is a band and not a point. */
  const MAIN = [['Real Madrid', 'Spain', 1, 5.920, 0.37], ['Ajax', 'Netherlands', 1, 3.385, 0.29], ['Sevilla', 'Spain', 2, 0.656, 0.13]];
  const lines = [];
  for (const [club, country, tier, want, gate] of MAIN) {
    let n = 0, won = 0;
    for (const year of [1995, 2010, 2026]) {
      for (let overall = 70; overall <= 90; overall += 4) {
        for (let i = 0; i < 2000; i++) {
          const r = E.simulateUCL(stateFor(overall, tier, club, country, year), {});
          n += 1;
          if (r.qualified && r.result === 'Winner') {
            won += 1;
            if (r.competition !== 'Champions League') fail(`${club} won the "${r.competition}" in ${year}`);
          }
        }
      }
    }
    const got = (100 * won) / n;
    if (Math.abs(got - want) > gate) fail(`${club}: won the Champions League in ${got.toFixed(3)}% of seasons, main's band is ${want} plus or minus ${gate.toFixed(3)}`);
    lines.push(`${club} ${got.toFixed(3)}% (main ${want} +/- ${gate.toFixed(3)})`);
  }
  red[3] = failures > before;
  if (!red[3]) console.log(`   ${lines.join(', ')}`);
}

/* ------------------------------------------------------------------ */
let CAREERS = null;
section(4, 'A cup won outside UEFA is kept under its own name, never as a Champions League');
{
  const before = failures;
  const stats = o => ({ pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o });
  /* 150 seasons a career: a held 90 at Real Madrid wins about one season in
     twenty (3 to 5 in 60, measured), so 150 keeps "never won" off a coin. */
  const SEASONS = 150;
  const career = (club, country, ovr = 90) => {
    let s = E.initCareer('Cup Test', country === 'Spain' ? 'Spain' : 'Argentina', 'ST', '2020s', stats(88), 88, 2018, CLUBS, null);
    let at = 0, ucl = 0, other = 0, otherNames = new Set();
    const nights = [];
    for (let i = 0; i < SEASONS; i++) {
      const prev = {
        ...s, phase: 'playing', retired: false, age: 26, currentClub: club, currentClubCountry: country,
        currentClubTier: 1, matchFixBanned: 0, prisonSeasons: 0,
        /* Held at 90 every season: some careers decline from 26 on whatever
           the age says, and a declining career winning nothing in sixty
           seasons would read as the honour going missing (measured: one
           Real Madrid career in three fell from 87 to 40 and won nothing). */
        ...stats(ovr), overall: ovr,
      };
      s = E.advanceProSeason(prev, CLUBS);
      const last = s.seasons[s.seasons.length - 1];
      if (last.club !== club) continue;
      at += 1;
      if (last.championsLeague) ucl += 1;
      if (last.clubCupTitle) { other += 1; otherNames.add(last.clubCupTitle); }
      if (last.clubCupTitle || last.championsLeague) nights.push({ clubCup: !!last.clubCupTitle, ucl: !!last.championsLeague, night: s.pendingBallonDor });
    }
    return { s, at, ucl, other, otherNames, nights };
  };
  const boca = career('Boca Juniors', 'Argentina');
  if (boca.at < SEASONS * 0.8) fail(`only ${boca.at} of ${SEASONS} seasons were played at Boca Juniors, too few to judge`);
  if (boca.ucl > 0) fail(`a career at Boca Juniors recorded ${boca.ucl} Champions League(s)`);
  if (boca.other === 0) fail(`a career at Boca Juniors never won its own cup in ${SEASONS} seasons, so the honour went unmeasured`);
  if ([...boca.otherNames].some(n => n !== 'Copa Libertadores')) fail(`Boca's cup was recorded as ${[...boca.otherNames].join(', ')}`);
  const totals = E.getCareerTotals(boca.s.seasons);
  if (totals.championsLeagues !== 0) fail(`the totals count ${totals.championsLeagues} Champions League(s) for a career spent at Boca`);
  if (totals.clubCups !== boca.other) fail(`the totals count ${totals.clubCups} continental club cups, the seasons record ${boca.other}`);
  const legacy = E.calculateLegacy(boca.s);
  const line = label => legacy.breakdown.find(b => b.label === label);
  if ((line('Champions League')?.points ?? 0) !== 0) fail(`the legacy gives ${line('Champions League').points} Champions League points to a Libertadores winner`);
  if (!line('Continental Club Cups') || line('Continental Club Cups').points <= 0) fail('the legacy has no Continental Club Cups line for a Libertadores winner');
  if (boca.s.awards.some(a => a.name === 'UCL Top Scorer')) fail('a Boca Juniors career won a UCL Top Scorer award');
  const madrid = career('Real Madrid', 'Spain');
  CAREERS = { boca, madrid, run: career };
  if (madrid.other > 0) fail(`a career at Real Madrid recorded ${madrid.other} continental club cup(s) outside UEFA`);
  if (madrid.ucl === 0) fail(`a career at Real Madrid never won the Champions League in ${SEASONS} seasons`);
  red[4] = failures > before;
  if (!red[4]) console.log(`   Boca Juniors: ${boca.other} Copa Libertadores in ${boca.at} seasons and 0 Champions Leagues; legacy line ${line('Continental Club Cups').points} points; Real Madrid: ${madrid.ucl} Champions Leagues and 0 other cups in ${madrid.at}`);
}

/* ------------------------------------------------------------------ */
section(5, 'The pass curves the first stage is solved against are fresh');
{
  const before = failures;
  /* Every third grid point where the curve sits between 15 and 95 percent,
     where an error would actually move a pass rate, measured again over the
     module's own playFirstStage. The gate is four binomial standard errors at
     this sample plus 1.5 points for the table's own sampling (20,000 stages
     a point): a stale curve, which is what a change to the stage simulation
     without a recalibration produces, sits far outside it. */
  const CURVES = ['winner2', 'top2_2', 'top2_3', 'best6_3', 'twice_3', 'league'];
  let points = 0;
  let worst = 0;
  for (const curve of CURVES) {
    const row = C.PASS_CURVES[curve];
    const idx = row.map((v, i) => [v, i]).filter(([v]) => v >= 0.15 && v <= 0.95).map(([, i]) => i);
    const reps = curve === 'league' ? 1200 : 2500;
    for (let k = 0; k < idx.length; k += 3) {
      const i = idx[k];
      const got = C.measureStage(curve, C.PASS_GRID[i], reps, Math.random);
      const checks = [['pass', got.pass, row[i]]];
      if (curve === 'league') checks.push(['top 8', got.top8, C.LEAGUE_TOP8[i]]);
      for (const [what, measured, table] of checks) {
        points += 1;
        const gate = 4 * Math.sqrt(Math.max(table * (1 - table), 0.01) / reps) + 0.015;
        worst = Math.max(worst, Math.abs(measured - table) / gate);
        if (Math.abs(measured - table) > gate) {
          fail(`${curve} ${what} at strength ${C.PASS_GRID[i]}: measured ${(100 * measured).toFixed(1)}%, the table says ${(100 * table).toFixed(1)}% (gate ${(100 * gate).toFixed(1)} points). Rerun with SC_CONT_PRINT_CALIBRATION=1 and paste the table.`);
        }
      }
    }
  }
  if (points < 30) fail(`only ${points} calibration points were checked`);
  red[5] = failures > before;
  if (!red[5]) console.log(`   ${points} points across six curves, all inside their gate (largest at ${(100 * worst).toFixed(0)}% of it)`);
}

/* ------------------------------------------------------------------ */
section(6, "The Ballon d'Or scores a cup won outside UEFA under its own name, worth less than a Champions League");
{
  const before = failures;
  /* (a) The nights section 4's careers actually had. Every season Boca won
     its cup, the player's own line on the night (when he made the ten) must
     list the club cup and no Champions League; every Real Madrid Champions
     League season must list it, so the check is reading the right field. */
  let cupNights = 0, uclNights = 0;
  const boca95 = CAREERS.run('Boca Juniors', 'Argentina', 95);
  for (const { clubCup, night } of [...CAREERS.boca.nights, ...boca95.nights]) {
    if (!clubCup) continue;
    const me = night?.nominees?.find(n => n.isPlayer);
    if (!me) continue;
    cupNights += 1;
    if (me.trophies.includes('UCL')) fail(`a Boca season with the ${CAREERS.boca.otherNames.values().next().value} was scored on the night as a Champions League (${me.trophies.join(', ')})`);
    if (!me.trophies.includes('ClubCup')) fail(`a Boca season with its cup was scored on the night without it (${me.trophies.join(', ')})`);
  }
  for (const { ucl, night } of CAREERS.madrid.nights) {
    const me = night?.nominees?.find(n => n.isPlayer);
    if (!ucl || !me) continue;
    uclNights += 1;
    if (!me.trophies.includes('UCL')) fail(`a Real Madrid Champions League season was scored on the night without it (${me.trophies.join(', ')})`);
  }
  /* Floors from measured headroom (2026-10-03, default seed and SIM_SEED=11):
     32 and 33 Boca cup nights, 10 Real Madrid nights each time. */
  if (cupNights < 10) fail(`only ${cupNights} of Boca's cup seasons reached the night's ten, too few to judge`);
  if (uclNights < 3) fail(`only ${uclNights} of Real Madrid's Champions League seasons reached the night's ten, too few to judge`);
  /* (b) The engine's own scorer, on one line of numbers with nothing else
     changed: the club cup is worth something, and less than a Champions
     League (8 and 25 points today; the order is what is held, not the
     numbers). */
  const P = bundle.__calcBdorPoints;
  const base = P(20, 5, 85, 1, [], 'Boca Juniors', []);
  const cup = P(20, 5, 85, 1, ['ClubCup'], 'Boca Juniors', []) - base;
  const ucl = P(20, 5, 85, 1, ['UCL'], 'Boca Juniors', []) - base;
  if (!(cup > 0)) fail(`a continental club cup adds ${cup} Ballon d'Or points`);
  if (!(cup < ucl)) fail(`a continental club cup adds ${cup} Ballon d'Or points and a Champions League ${ucl}`);
  red[6] = failures > before;
  if (!red[6]) console.log(`   ${cupNights} Boca cup nights scored as a club cup, ${uclNights} Real Madrid nights as a Champions League; the scorer gives the club cup ${cup} and the Champions League ${ucl}`);
}

/* ------------------------------------------------------------------ */
section(7, 'The final is one match or two legs as the season had it, and 2001 has no CONCACAF cup');
{
  const before = failures;
  /* Typed here from RSSSF (copalib, as1, ca1, af1, read 2026-10-03), not
     read from the module: season, then the legs of that season's final. */
  const FINALS = [
    ['Brazil', 2010, 2], ['Brazil', 2019, 1],
    ['Mexico', 1998, 1], ['Mexico', 2005, 2], ['Mexico', 2012, 2], ['Mexico', 2020, 1], ['Mexico', 2022, 2], ['Mexico', 2024, 1],
    ['Saudi Arabia', 1998, 1], ['Saudi Arabia', 2005, 2], ['Saudi Arabia', 2010, 1], ['Saudi Arabia', 2015, 2],
    ['Saudi Arabia', 2021, 1], ['Saudi Arabia', 2022, 2], ['Saudi Arabia', 2024, 1],
    ['Egypt', 2010, 2], ['Egypt', 2020, 1], ['Egypt', 2023, 2],
  ];
  let checked = 0;
  for (const [country, year, want] of FINALS) {
    let finals = 0, wrong = 0;
    for (let i = 0; i < 600 && finals < 20; i++) {
      const legs = E.simulateUCL(stateFor(90, 1, 'Test FC', country, year), {}).matches.filter(m => m.round === 'Final').length;
      if (!legs) continue;
      finals += 1;
      if (legs !== want) wrong += 1;
    }
    checked += finals;
    if (finals < 10) fail(`${country} ${year}: only ${finals} finals reached, too few to judge`);
    if (wrong) fail(`${country} ${year}: ${wrong} of ${finals} finals were not ${want === 1 ? 'one match' : 'two legs'}, as RSSSF records it`);
  }
  let played2001 = 0;
  for (let i = 0; i < 200; i++) if (E.simulateUCL(stateFor(90, 1, 'Test FC', 'Mexico', 2001), {}).qualified) played2001 += 1;
  if (played2001) fail(`a Mexican club played the abandoned 2001 CONCACAF cup ${played2001} times in 200`);
  red[7] = failures > before;
  if (!red[7]) console.log(`   ${checked} finals over ${FINALS.length} seasons, each over the legs the record gives; no CONCACAF cup in 2001`);
}

/* ------------------------------------------------------------------ */
section(8, 'Through the play-off or straight through, each knockout round is played at the same target');
{
  const before = failures;
  /* 2026, Ajax (tier 1, not elite) at 82: the round of 16 target is 0.464
     and each round after it 0.04 lower. A club that came through the
     league phase play-off must meet the round of 16, and every round after
     it, at the same target as one that finished in the top eight. The old
     code indexed the target off the ladder WITH the play-off in it, which
     moves every later round one step (0.04) harder. Ties won per tie
     played, pooled over the four rounds, compared path against path. The
     margin is a fixed 0.02, half the step the bug makes, at a sample whose
     standard error on the difference is about 0.005 (the measured
     difference is in the green line). Measured 2026-10-03 on the merged
     tree: a gap of 0.0039 (default seed) and 0.0058 (SIM_SEED=11) with
     16,551 to 16,727 ties through the play-off; with the old indexing (the
     pofrom control) the gap is 0.037. */
  const N = 90000;
  const tally = { direct: [0, 0], po: [0, 0] };
  for (let i = 0; i < N; i++) {
    const r = E.simulateUCL(stateFor(82, 1, 'Ajax', 'Netherlands', 2026), {});
    if (!r.qualified) continue;
    const path = r.matches.some(m => m.round === 'PO') ? tally.po : tally.direct;
    for (const round of ['R16', 'QF', 'SF', 'Final']) {
      const legs = r.matches.filter(m => m.round === round);
      if (!legs.length) break;
      path[0] += 1;
      if (legs[legs.length - 1].won) path[1] += 1;
    }
  }
  const rate = ([n, w]) => (n ? w / n : NaN);
  const diff = rate(tally.direct) - rate(tally.po);
  if (tally.direct[0] < 12000 || tally.po[0] < 12000) fail(`too few ties to judge: ${tally.direct[0]} straight through, ${tally.po[0]} through the play-off`);
  if (!(Math.abs(diff) <= 0.02)) fail(`ties won: ${rate(tally.direct).toFixed(4)} straight through, ${rate(tally.po).toFixed(4)} through the play-off, a gap of ${diff.toFixed(4)} (margin 0.02)`);
  red[8] = failures > before;
  if (!red[8]) console.log(`   ties won ${rate(tally.direct).toFixed(4)} of ${tally.direct[0]} straight through and ${rate(tally.po).toFixed(4)} of ${tally.po[0]} through the play-off (gap ${diff.toFixed(4)}, margin 0.02)`);
}

/* ------------------------------------------------------------------ */
const CONTROL_SECTION = { tieronly: 1, asucl: 4, stalecal: 5, bdorucl: 6, onefinal: 7, pofrom: 8 };
if (CONTROL) {
  const want = CONTROL_SECTION[CONTROL];
  if (red[want]) { console.log(`\n   CONTROL FIRED: section ${want} went red`); process.exit(0); }
  console.error(`\n   CONTROL DID NOT FIRE: section ${want} stayed green with ${CONTROL} on`);
  process.exit(1);
}
if (failures) { console.error(`\n${failures} failure(s)`); process.exit(1); }
console.log('\nsimCareerContinental: all green');
