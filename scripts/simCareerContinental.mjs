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
 *
 * NEGATIVE CONTROLS (SC_CONT_CONTROL), each refusing to run unless its anchor
 * is in the bundle exactly once:
 *   tieronly  the tier only gate is back (the country is not read): 1 red.
 *   asucl     a cup won outside UEFA is recorded as a Champions League: 4 red.
 *   stalecal  one row of the pass curves is shifted by ten points: 5 red.
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
const KNOWN_CONTROLS = ['tieronly', 'asucl', 'stalecal'];
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
     the CONCACAF and AFC sites, Wikipedia as a spot check), not read from it. */
  const NAMES = [
    ['Argentina', 1995, 'Copa Libertadores'], ['Brazil', 2026, 'Copa Libertadores'],
    ['Mexico', 2007, "CONCACAF Champions' Cup"], ['USA', 2008, 'CONCACAF Champions League'],
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
     real save takes. 2,000 campaigns a cell, 36,000 a tier, gate main plus or
     minus three binomial standard errors at that size. */
  const MAIN = [['Real Madrid', 'Spain', 1, 5.920], ['Ajax', 'Netherlands', 1, 3.385], ['Sevilla', 'Spain', 2, 0.656]];
  const lines = [];
  for (const [club, country, tier, want] of MAIN) {
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
    const gate = 3 * 100 * Math.sqrt((want / 100) * (1 - want / 100) / n);
    if (Math.abs(got - want) > gate) fail(`${club}: won the Champions League in ${got.toFixed(3)}% of seasons, main's band is ${want} plus or minus ${gate.toFixed(3)}`);
    lines.push(`${club} ${got.toFixed(3)}% (main ${want} +/- ${gate.toFixed(3)})`);
  }
  red[3] = failures > before;
  if (!red[3]) console.log(`   ${lines.join(', ')}`);
}

/* ------------------------------------------------------------------ */
section(4, 'A cup won outside UEFA is kept under its own name, never as a Champions League');
{
  const before = failures;
  const stats = o => ({ pace: o, shooting: o, passing: o, dribbling: o, defending: o, physical: o, reflexes: o });
  const career = (club, country) => {
    let s = E.initCareer('Cup Test', country === 'Spain' ? 'Spain' : 'Argentina', 'ST', '2020s', stats(88), 88, 2018, CLUBS, null);
    let at = 0, ucl = 0, other = 0, otherNames = new Set();
    for (let i = 0; i < 60; i++) {
      const prev = {
        ...s, phase: 'playing', retired: false, age: 26, currentClub: club, currentClubCountry: country,
        currentClubTier: 1, matchFixBanned: 0, prisonSeasons: 0,
      };
      s = E.advanceProSeason(prev, CLUBS);
      const last = s.seasons[s.seasons.length - 1];
      if (last.club !== club) continue;
      at += 1;
      if (last.championsLeague) ucl += 1;
      if (last.clubCupTitle) { other += 1; otherNames.add(last.clubCupTitle); }
    }
    return { s, at, ucl, other, otherNames };
  };
  const boca = career('Boca Juniors', 'Argentina');
  if (boca.at < 40) fail(`only ${boca.at} of 60 seasons were played at Boca Juniors, too few to judge`);
  if (boca.ucl > 0) fail(`a career at Boca Juniors recorded ${boca.ucl} Champions League(s)`);
  if (boca.other === 0) fail('a career at Boca Juniors never won its own cup in sixty seasons, so the honour went unmeasured');
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
  if (madrid.other > 0) fail(`a career at Real Madrid recorded ${madrid.other} continental club cup(s) outside UEFA`);
  if (madrid.ucl === 0) fail('a career at Real Madrid never won the Champions League in sixty seasons');
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
const CONTROL_SECTION = { tieronly: 1, asucl: 4, stalecal: 5 };
if (CONTROL) {
  const want = CONTROL_SECTION[CONTROL];
  if (red[want]) { console.log(`\n   CONTROL FIRED: section ${want} went red`); process.exit(0); }
  console.error(`\n   CONTROL DID NOT FIRE: section ${want} stayed green with ${CONTROL} on`);
  process.exit(1);
}
if (failures) { console.error(`\n${failures} failure(s)`); process.exit(1); }
console.log('\nsimCareerContinental: all green');
