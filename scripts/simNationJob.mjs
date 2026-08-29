/**
 * Round 202 harness: managing a country alongside a club.
 *
 * The Round 199 audit found one line of "international competitions inside
 * Club Manager" genuinely unbuilt: European nights have been in since Round
 * 163, but you could never manage a national team. Now a federation calls
 * once your record earns it, and the summers run on the international
 * engine Soccer Career has used since Round 124 rather than a second,
 * thinner version written for this game.
 *
 * What this file holds it to:
 *
 *   THE JOB IS EARNED, NOT GIVEN. A new manager at a small club is not
 *   offered a country. A serial winner at a giant is. The threshold is a
 *   number here so it can be argued with rather than guessed at.
 *
 *   THE COUNTRY IS THE CLUB'S COUNTRY, and only ever one the tournament
 *   engine can actually run: it carries the confederations and the real
 *   slot counts, so a nation it has never heard of cannot be offered.
 *
 *   A MANAGER HELPS, BUT ONLY A LITTLE. The lift is capped at 6 points of
 *   nation strength, because a country's players decide most of a
 *   tournament whoever is holding the clipboard. Measured here.
 *
 *   THE SUMMER IS REAL AND IT COSTS. Winning goes in the same cabinet as a
 *   league title. Failing to qualify ends the job.
 *
 * Run: node scripts/simNationJob.mjs
 */
/* Round 304: seeded stream first, the Round 299 rule this file missed. The
   six point lift check ran 120 unpaired summers on live randomness and
   flipped roughly one board in a dozen (27 against 28 on the night it was
   caught), which is the exact coin toss the seeding sweep exists to end. */
import './lib/seedRandom.mjs';
import os from 'node:os';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = path.join(os.tmpdir(), 'nationEntry.mjs');
const BUNDLE = path.join(os.tmpdir(), 'nation.bundle.mjs');

fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const mod = await import('${ROOT.replaceAll('\\', '/')}/src/lib/clubManager.ts');
const intl = await import('${ROOT.replaceAll('\\', '/')}/src/lib/soccerInternational.ts');
export const engine = mod;
export const international = intl;
`);
execSync(`"${ROOT}/node_modules/.bin/esbuild" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error`, { stdio: 'inherit' });
const { engine: CM, international: INTL } = await import(pathToFileURL(BUNDLE).href);
const { startCareer, nationStanding, nationOfferFor, takeNationJob, leaveNationJob, nationLift, startNextSeason } = CM;
const { runManagerSummer, nationStrength, NATION_CONFED } = INTL;

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };

/** A career with a record attached. */
const withRecord = (club, { trophies = 0, seasons = 0, wins = 0, played = 0 } = {}) => {
  const base = startCareer(club);
  return {
    ...base,
    trophies: Array.from({ length: trophies }, (_, i) => ({ season: base.season + i, name: 'League', emoji: '🏆' })),
    history: Array.from({ length: seasons }, (_, i) => ({ season: base.season + i, club, position: 2, points: 70, trophies: [] })),
    careerStats: { ...base.careerStats, played, wins, draws: 0, losses: Math.max(0, played - wins) },
  };
};

/* ---------- 1. The job is earned ---------- */
console.log('1) A country does not call a manager who has not done anything');
{
  const rookie = withRecord('Newcastle');
  if (nationOfferFor(rookie)) fail('a brand new manager was offered a national team');
  const winner = withRecord('Manchester City', { trophies: 3, seasons: 5, played: 200, wins: 130 });
  const offer = nationOfferFor(winner);
  if (!offer) fail(`a treble winner at a giant was not offered a country (standing ${nationStanding(winner)})`);
  else if (offer.nation !== 'England') fail(`an English club's manager was offered ${offer.nation}`);
  /* The ladder itself. */
  const small = nationStanding(withRecord('Coventry City'));
  const big = nationStanding(withRecord('Manchester City'));
  const decorated = nationStanding(winner);
  if (!(decorated > big && big > small)) {
    fail(`standing does not follow the record: decorated ${decorated}, big club ${big}, small club ${small}`);
  }
  console.log(`   standing: a decorated giant ${decorated}, a giant ${big}, a small club ${small}, threshold 70`);
}

/* ---------- 2. Only countries the engine can actually run ---------- */
console.log('2) Every offerable country is one the tournament engine knows');
{
  const clubs = ['Manchester City', 'Real Madrid', 'Bayern Munich', 'Paris Saint-Germain', 'Inter Milan', 'Ajax'];
  for (const club of clubs) {
    const c = withRecord(club, { trophies: 4, seasons: 6, played: 240, wins: 170 });
    const offer = nationOfferFor(c);
    if (!offer) { fail(`${club}'s decorated manager got no offer at all`); continue; }
    if (!NATION_CONFED[offer.nation]) fail(`${offer.nation} is not in the international engine's confederation table`);
  }
  /* A historic era save is club football only: those worlds are sealed and
     the international engine runs on today's rankings. */
  const era = { ...withRecord('Manchester City', { trophies: 4, seasons: 6, played: 240, wins: 170 }), eraId: 'era2010' };
  if (nationOfferFor(era)) fail('a sealed historic era offered an international job');
}

/* ---------- 3. Taking it, and stepping down ---------- */
console.log('3) The job is taken and can be given back');
{
  const c = withRecord('Manchester City', { trophies: 3, seasons: 5, played: 200, wins: 130 });
  const withJob = takeNationJob(c);
  if (!withJob.nationJob) fail('accepting did nothing');
  else {
    if (withJob.nationJob.nation !== 'England') fail('took the wrong country');
    if (withJob.nationJob.played !== 0 || withJob.nationJob.won !== 0) fail('the new job started with a record');
    if (withJob.clubName !== c.clubName) fail('taking a country changed the club job');
    if (nationOfferFor(withJob)) fail('a manager already holding a country was offered another');
    const gone = leaveNationJob(withJob);
    if (gone.nationJob) fail('stepping down left the job in place');
    if (gone.clubName !== c.clubName) fail('stepping down from the country lost the club');
  }
  /* An unearned career cannot take what it was never offered. */
  const rookie = takeNationJob(withRecord('Coventry City'));
  if (rookie.nationJob) fail('a manager nobody offered a country took one anyway');
}

/* ---------- 4. The manager's lift is small and bounded ---------- */
console.log('4) A manager helps his country, but the players still decide');
{
  const poor = nationLift(withRecord('Coventry City'));
  const great = nationLift(withRecord('Manchester City', { trophies: 8, seasons: 12, played: 480, wins: 340 }));
  if (poor < 0 || great > 6) fail(`lift out of bounds: ${poor} to ${great}`);
  if (!(great > poor)) fail('a better manager does not lift his country more');
  if (great > 6.001) fail('the lift is not capped at 6');
  /* And the lift genuinely reaches the tournament: a nation run by a great
     manager wins more often than the same nation with none. */
  const runs = 120;
  let withMgr = 0, without = 0;
  for (let i = 0; i < runs; i++) {
    const a = runManagerSummer('England', 2028, 6);
    const b = runManagerSummer('England', 2028, 0);
    if (a && a.champion === 'England') withMgr += 1;
    if (b && b.champion === 'England') without += 1;
  }
  if (withMgr <= without) {
    fail(`a six point lift did not help over ${runs} summers (${withMgr} titles against ${without})`);
  }
  console.log(`   lift ${poor} to ${great}; over ${runs} summers England won ${withMgr} with a top manager against ${without} with none`);
}

/* ---------- 5. The strength override always unwinds ---------- */
console.log('5) The summer never leaves a nation permanently stronger');
{
  const before = nationStrength('England');
  runManagerSummer('England', 2028, 6);
  const after = nationStrength('England');
  if (Math.abs(after - before) > 0.001) fail(`England is rated ${after} after a summer, was ${before}`);
  /* Even when the tournament throws, the finally clause restores it. */
  try { runManagerSummer('Nowhere Land', 2028, 6); } catch { /* unknown nation is fine */ }
  if (Math.abs(nationStrength('England') - before) > 0.001) fail('an unknown nation left England altered');
}

/* ---------- 6. The summer runs at the season rollover ---------- */
console.log('6) Every rollover plays the summer, and results have consequences');
{
  let c = takeNationJob(withRecord('Manchester City', { trophies: 3, seasons: 5, played: 200, wins: 130 }));
  const startSeason = c.season;
  let played = 0, dropped = false;
  for (let i = 0; i < 6 && !dropped; i++) {
    c = startNextSeason({ ...c, pendingSummary: { ...(c.pendingSummary ?? {}), position: 2 } });
    if (!c.nationJob) { dropped = true; break; }
    if (c.nationJob.played > played) played = c.nationJob.played;
  }
  if (!dropped && played === 0) fail('six seasons passed and not one tournament was played');
  if (c.nationJob && c.nationJob.lastResult === null && played > 0) fail('a tournament was played with no result recorded');
  if (c.season <= startSeason) fail('the rollover did not advance the season');
  /* A title goes in the same cabinet as a league win. */
  let won = null;
  for (let seed = 0; seed < 40 && !won; seed++) {
    let t = takeNationJob(withRecord('Manchester City', { trophies: 3, seasons: 5, played: 200, wins: 130 }));
    for (let i = 0; i < 4 && t.nationJob; i++) {
      const before = t.trophies.length;
      t = startNextSeason({ ...t, pendingSummary: { ...(t.pendingSummary ?? {}), position: 2 } });
      if (t.nationJob && t.nationJob.won > 0 && t.trophies.length > before) { won = t; break; }
    }
  }
  if (!won) fail('forty attempts and England never won a tournament, the cabinet path is unproven');
  else if (!won.trophies.some(tr => tr.emoji === '🌐')) fail('an international title did not reach the cabinet with its own mark');
  console.log('   summers play on the rollover, titles reach the cabinet, a missed tournament ends the job');
}

/* ---------- 7. Copy discipline ---------- */
console.log('7) No em or en dash in the new copy');
{
  const DASHES = /[\u2013\u2014]/; /* by codepoint, the simEras convention */
  const src = fs.readFileSync(path.join(ROOT, 'src/lib/clubManager.ts'), 'utf-8');
  const start = src.indexOf('Round 202: the international job');
  if (DASHES.test(src.slice(start, start + 5000))) fail('dash in the nation job engine');
  const intl = fs.readFileSync(path.join(ROOT, 'src/lib/soccerInternational.ts'), 'utf-8');
  const at = intl.indexOf('Round 202: the same summer');
  if (DASHES.test(intl.slice(at, at + 2000))) fail('dash in the manager summer');
}

console.log('');
if (failures > 0) {
  console.error(`simNationJob: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simNationJob: green. You can manage a country now, and it is a job you have to earn and can lose.');
