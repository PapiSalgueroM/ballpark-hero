/**
 * Round 201 harness: the wilderness, what happens after the sack.
 *
 * Until this round a sacking ended the save: one screen, a share button and
 * "Start New Career". That is the wrong shape for the one moment every
 * manager game is really about. Now the sack opens the wilderness, and this
 * file holds it to the four things that make it a game rather than a menu:
 *
 *   THE RECORD DECIDES WHO CALLS. Offers come from the same job market the
 *   retired-player path uses, driven by a profile built from what actually
 *   happened: trophies, title finishes, bottom three finishes, seasons in
 *   the job, and the size of the club that just let you go.
 *
 *   WAITING COSTS SOMETHING. Every week out ages the profile, so holding
 *   out for a better job genuinely risks the jobs you already had.
 *
 *   IT NEVER DEAD ENDS. Eight weeks with nothing on the table opens a floor
 *   job. A save that can never continue is the thing this round exists to
 *   end, so the floor is asserted here rather than hoped for.
 *
 *   THE CLUB THAT SACKED YOU DOES NOT CALL BACK, and nobody calls twice.
 *
 * Run: node scripts/simWilderness.mjs
 */
import { execSync } from 'node:child_process';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = path.join(os.tmpdir(), 'wildEntry.mjs');
const BUNDLE = path.join(os.tmpdir(), 'wild.bundle.mjs');

fs.writeFileSync(ENTRY, `
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const mod = await import('${ROOT.replaceAll('\\', '/')}/src/lib/clubManager.ts');
const off = await import('${ROOT.replaceAll('\\', '/')}/src/lib/managerOffers.ts');
export const engine = mod;
export const offers = off;
`);
execSync(`"${ROOT}/node_modules/.bin/esbuild" "${ENTRY}" --bundle --format=esm --platform=node --outfile="${BUNDLE}" --log-level=error`, { stdio: 'inherit' });
const { engine: CM, offers: OFF } = await import(pathToFileURL(BUNDLE).href);
const { startCareer, enterWilderness, wildernessWeek, acceptWildernessJob, wildernessProfile } = CM;
const { managerStanding } = OFF;

let failures = 0;
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const seeded = s => { let x = (s >>> 0) || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; };

/** A sacked manager with a record: seasons behind him, trophies, finishes. */
function sacked(club, { seasons = 3, trophies = 0, history = [] } = {}) {
  const base = startCareer(club);
  return enterWilderness({
    ...base,
    sacked: true,
    season: base.season + seasons,
    trophies: Array.from({ length: trophies }, (_, i) => ({ season: base.season + i, name: 'League', emoji: '🏆' })),
    history,
  });
}

/* ---------- 1. The sack opens a door instead of closing one ---------- */
console.log('1) A sacking leaves the manager out of work, not out of the game');
{
  const c = sacked('Newcastle');
  if (!c.wilderness) { fail('being sacked did not open the wilderness'); }
  else {
    if (c.wilderness.formerClub !== 'Newcastle') fail('the wilderness forgot who sacked him');
    if (c.wilderness.weeksOut !== 0) fail('a fresh sacking already has weeks on the clock');
    if (c.wilderness.offers.length !== 0) fail('the phone rang before he had left the building');
  }
  /* Entering twice does not reset the clock. */
  const later = wildernessWeek(c, seeded(1));
  if (enterWilderness(later).wilderness.weeksOut !== later.wilderness.weeksOut) {
    fail('re-entering the wilderness reset the weeks out');
  }
}

/* ---------- 2. The record is what the market sees ---------- */
console.log('2) The profile is built from what actually happened');
{
  const plain = wildernessProfile(sacked('Newcastle'));
  const winner = wildernessProfile(sacked('Newcastle', {
    trophies: 4,
    history: [{ season: 1, club: 'Newcastle', position: 1, points: 90, trophies: ['League'] }],
  }));
  const failure = wildernessProfile(sacked('Newcastle', {
    history: [{ season: 1, club: 'Newcastle', position: 20, points: 18, trophies: [] }],
  }));
  if (winner.managerTrophies !== 4) fail('the trophies did not reach the profile');
  if (winner.promotions < 1) fail('a title finish did not count as a promotion at the market');
  if (failure.relegations < 1) fail('a bottom three finish did not count as a relegation');
  if (failure.departure !== 'relegated') fail('a manager sacked after going down is not marked as relegated');
  if (plain.departure !== 'sacked') fail('an ordinary sacking is not marked as one');
  const sWin = managerStanding(winner), sPlain = managerStanding(plain), sFail = managerStanding(failure);
  if (!(sWin > sPlain && sPlain > sFail)) {
    fail(`standing does not follow the record: winner ${sWin.toFixed(1)}, plain ${sPlain.toFixed(1)}, failure ${sFail.toFixed(1)}`);
  }
  console.log(`   standing: a winner ${sWin.toFixed(1)}, an ordinary sacking ${sPlain.toFixed(1)}, a relegation ${sFail.toFixed(1)}`);
}

/* ---------- 3. Waiting costs standing ---------- */
console.log('3) Every week out cools the market');
{
  let c = sacked('Newcastle', { trophies: 2 });
  const start = managerStanding(wildernessProfile(c));
  const rng = seeded(7);
  for (let i = 0; i < 12; i++) c = wildernessWeek(c, rng);
  const later = managerStanding(wildernessProfile(c));
  if (!(later < start)) fail(`twelve weeks out did not cool the market (${start.toFixed(1)} to ${later.toFixed(1)})`);
  if (c.wilderness.weeksOut !== 12) fail(`the clock reads ${c.wilderness.weeksOut} after twelve weeks`);
  console.log(`   standing slid from ${start.toFixed(1)} to ${later.toFixed(1)} over twelve weeks`);
}

/* ---------- 4. Offers arrive, and the market never dries up ---------- */
console.log('4) The phone rings, and it always rings eventually');
{
  let everEmpty = 0;
  for (let seed = 1; seed <= 30; seed++) {
    let c = sacked('Newcastle', { trophies: seed % 3 });
    const rng = seeded(seed * 977);
    for (let i = 0; i < 10; i++) c = wildernessWeek(c, rng);
    if (!c.wilderness.offers.length) everEmpty += 1;
    for (const o of c.wilderness.offers) {
      if (o.club === 'Newcastle') fail('the club that sacked him called him back');
      if (!o.brief || !o.reason) fail(`${o.club} offered a job with no brief or reason`);
      if (!(o.budget >= 0)) fail(`${o.club} offered a job with no budget`);
    }
    const names = c.wilderness.offers.map(o => o.club);
    if (new Set(names).size !== names.length) fail('the same club called twice');
    if (c.wilderness.offers.length > 4) fail(`${c.wilderness.offers.length} offers at once, the table should cap at four`);
  }
  if (everEmpty > 0) fail(`${everEmpty} of 30 careers still had nothing after ten weeks, the floor did not open`);
  console.log('   30 sacked careers, all of them had a job to consider inside ten weeks');
}

/* ---------- 5. Taking a job restarts the career properly ---------- */
console.log('5) Accepting puts him back in work at that club');
{
  let c = sacked('Newcastle', { trophies: 1 });
  const rng = seeded(42);
  for (let i = 0; i < 10 && !c.wilderness.offers.length; i++) c = wildernessWeek(c, rng);
  const offer = c.wilderness.offers[0];
  if (!offer) fail('no offer to accept after ten weeks');
  else {
    const back = acceptWildernessJob(c, offer.club);
    if (!back) fail('accepting a real offer returned nothing');
    else {
      if (back.clubName !== offer.club) fail(`accepted ${offer.club} but ended up at ${back.clubName}`);
      if (back.sacked) fail('the new job started with the sacked flag still set');
      if (back.wilderness) fail('the wilderness followed him into the new job');
      if (back.season <= c.season - 1) fail('the new job did not start a new season');
      if (!back.squad?.length) fail('the new club came with no squad');
      if (back.trophies.length !== c.trophies.length) fail('the cabinet did not follow him');
      /* Round 200: the sponsor belonged to the old club. */
      if (back.sponsor) fail('the sponsor of the old club followed him to the new one');
    }
    /* A club that never called cannot be accepted. */
    if (acceptWildernessJob(c, 'Real Madrid') !== null && !c.wilderness.offers.some(o => o.club === 'Real Madrid')) {
      fail('a job nobody offered could be accepted');
    }
  }
}

/* ---------- 6. Copy discipline ---------- */
console.log('6) No em or en dash in the new copy');
{
  const DASHES = /[\u2013\u2014]/; /* by codepoint, the simEras convention */
  const src = fs.readFileSync(path.join(ROOT, 'src/lib/clubManager.ts'), 'utf-8');
  const start = src.indexOf('Round 201: the wilderness');
  const chunk = src.slice(start, start + 6000);
  if (DASHES.test(chunk)) fail('dash in the wilderness engine');
  const page = fs.readFileSync(path.join(ROOT, 'src/pages/ClubManager.tsx'), 'utf-8');
  if (DASHES.test(page)) fail('dash in the Club Manager page');
}

console.log('');
if (failures > 0) {
  console.error(`simWilderness: ${failures} failure${failures === 1 ? '' : 's'}`);
  process.exit(1);
}
console.log('simWilderness: green. The sack is the start of something now, and the phone always rings in the end.');
