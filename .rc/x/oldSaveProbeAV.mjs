// Release AV: a save made by the live build loads and plays on. Saves are MADE by one tree's code (main, Release
// AU) and PLAYED by another's (the integrated head). After Release AU's .tmp-fx/oldSaveProbeAU.mjs, cut to what
// this train changes: the four US My Careers (the true MLB and NHL seasons, the NFL rival, the Hall marks) and
// Club Manager (the league book). Never committed; sent to a runner as .rc/x/oldSaveProbeAV.mjs.
// usage: node oldSaveProbeAV.mjs make <file>     (cwd = the tree that makes the saves)
//        node oldSaveProbeAV.mjs play <file>     (cwd = the tree that plays them)
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const [mode, file] = process.argv.slice(2);
if ((mode !== 'make' && mode !== 'play') || !file) { console.error('usage: oldSaveProbeAV.mjs make|play <file>'); process.exit(2); }
const root = process.cwd();
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'old-save-'));
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} };
const require = createRequire(import.meta.url);
async function load(name, rels) {
  const entry = path.join(work, `${name}.ts`), outfile = path.join(work, `${name}.cjs`);
  fs.writeFileSync(entry, rels.filter(([, rel]) => fs.existsSync(path.join(root, rel)))
    .map(([as, rel]) => `export * as ${as} from '${path.join(root, rel).split(path.sep).join('/')}';`).join('\n'));
  await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'cjs', outfile, logLevel: 'silent', alias: { '@': path.join(root, 'src') },
    define: { 'import.meta.env': '{"PROD":true,"DEV":false}' }, loader: { '.css': 'empty', '.svg': 'empty', '.png': 'empty', '.jpg': 'empty', '.webp': 'empty' } });
  return require(outfile);
}
const realRandom = Math.random;
function seeded(seed) { let x = (seed * 2654435761) >>> 0 || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }
const withSeed = (seed, fn) => { Math.random = seeded(seed); try { return fn(); } finally { Math.random = realRandom; } };
const sha = v => createHash('sha256').update(JSON.stringify(v)).digest('hex').slice(0, 16);
const copy = v => JSON.parse(JSON.stringify(v));

const B = await load('bundle', [
  ['cm', 'src/lib/clubManager.ts'], ['usProgramme', 'src/lib/usCareerProgramme.ts'], ['appearance', 'src/lib/soccerCareerAppearance.ts'],
  ['nfl', 'src/lib/nflCareerSport.ts'], ['nba', 'src/lib/nbaCareerSport.ts'], ['mlb', 'src/lib/mlbCareerSport.ts'], ['nhl', 'src/lib/nhlCareerSport.ts'],
]);
const CM = B.cm, U = B.usProgramme;
const US = [['nfl', B.nfl.NFL_CAREER_SPORT], ['nba', B.nba.NBA_CAREER_SPORT], ['mlb', B.mlb.MLB_CAREER_SPORT], ['nhl', B.nhl.NHL_CAREER_SPORT]];
// One season of a US career, the calls the board makes around sport.simSeason (UsCareerBoard.tsx), with the usual routine.
function usSeason(sport, slug, c, rng) {
  if (c.contractYears <= 0) c.contractYears = 2;
  U.expireUsCareerProgramme(c);
  sport.campBattle(c, 75, rng);
  const prep = U.prepareUsCareerProgramme(c, slug);
  const { line } = sport.simSeason(c, 75, rng);
  U.restoreUsCareerProgramme(c, prep);
  sport.progress(c, rng);
  U.settleUsCareerProgramme(c, line, slug, prep);
  if (sport.shouldRetire(c)) c.retired = true;
  return line;
}

if (mode === 'make') {
  const manager = [], us = [];
  const CLUBS = ['Everton', 'Arsenal', 'Real Madrid', 'Napoli', 'Ajax', 'Wolves', 'Bayern Munich', 'Wrexham'];
  for (let i = 0; i < CLUBS.length; i++) for (const entries of [0, 6, 21]) {
    let c = null;
    try {
      c = withSeed(5000 + i * 31 + entries, () => {
        let state = CM.startCareer(CLUBS[i]);
        for (let k = 0; k < entries; k++) { const r = CM.playNextEntry(state, { skipHalftime: true }); state = r.state; if (r.kind === 'seasonOver' || state.sacked) break; }
        return state;
      });
    } catch (err) { console.log(`make: no Club Manager career at ${CLUBS[i]}: ${String(err).slice(0, 120)}`); continue; }
    manager.push({ club: CLUBS[i], entries, week: c.week, key: c.realLeagueFixtures ?? null, pairs: [0, 1, 7].map(round => JSON.stringify(CM.careerRoundPairs(c, round))), state: copy(c) });
  }
  const paused = withSeed(6100, () => { let st = CM.startCareer('Everton'); for (let k = 0; k < 40; k++) { const r = CM.playNextEntry(st); st = r.state; if (r.kind === 'halftime') return st; } return null; });
  if (paused) manager.push({ club: 'Everton', entries: -1, week: paused.week, halftime: true, key: paused.realLeagueFixtures ?? null, pairs: [0, 1, 7].map(round => JSON.stringify(CM.careerRoundPairs(paused, round))), state: copy(paused) });
  for (const [slug, sport] of US) {
    const positions = Object.keys(sport.create.archetypes);
    for (let seed = 1; seed <= 16; seed++) {
      const rng = seeded(900 + seed * 17 + slug.length);
      const pos = positions[seed % positions.length], era = sport.create.eras[seed % sport.create.eras.length].id;
      const c = sport.startCareer(`Old ${slug} ${seed}`, pos, sport.create.archetypes[pos][0], rng, B.appearance.defaultAppearance(), era);
      for (let k = 0; k < seed % 9 && !c.retired; k++) usSeason(sport, slug, c, rng);
      us.push({ slug, seed, pos, era, seasons: c.seasons.length, retired: !!c.retired, state: copy(c) });
    }
  }
  fs.writeFileSync(file, JSON.stringify({ madeBy: root, manager, us }));
  console.log(`oldSaveProbeAV make: ${manager.length} Club Manager saves (${manager.filter(m => m.key).length} on a real fixture list, ${manager.filter(m => m.halftime).length} at half time, ${manager.filter(m => 'leagueBook' in m.state).length} that already hold a league book), ${us.length} US career saves (${US.map(([slug]) => `${slug} ${us.filter(u => u.slug === slug).length}`).join(', ')}; ${us.filter(u => u.seasons > 0).length} with seasons played, ${us.filter(u => u.retired).length} retired, ${us.filter(u => u.state.rival).length} with a rival); sha ${sha({ manager, us })}`);
  process.exit(0);
}

const made = JSON.parse(fs.readFileSync(file, 'utf8'));
let failures = 0;
const NL = String.fromCharCode(10);
const fail = m => { failures += 1; console.error('  FAIL: ' + m); };
const why = err => String(err?.stack || err).split(NL).slice(0, 2).join(' | ');
const t = { manager: 0, keyed: 0, entriesPlayed: 0, matches: 0, booksAfter: 0, us: 0, usPlayed: 0, usSeasons: 0, oldRows: 0, rivalsKept: 0, rivalsOldShape: 0, rivalsNewShape: 0 };
for (const row of made.manager) {
  t.manager += 1;
  const loaded = copy(row.state);
  const id = `Club Manager save ${row.club}/${row.entries}`;
  try {
    if ('leagueBook' in loaded) fail(`${id}: a save made by the live build already holds a league book`);
    if (loaded.live?.varReviews) fail(`${id}: an old save has reviews on its live match`);
    if ((loaded.realLeagueFixtures ?? null) !== row.key) fail(`${id}: the fixture key changed on load`);
    const cover = CM.careerFixtureCoverage(loaded);
    if (row.key) { t.keyed += 1; if (!cover) fail(`${id}: a save on the real list (${row.key}) lost its coverage`); }
    else if (cover) fail(`${id}: an old save with no key now claims a real fixture list`);
    [0, 1, 7].forEach((round, i) => { if (JSON.stringify(CM.careerRoundPairs(loaded, round)) !== row.pairs[i]) fail(`${id}: round ${round} is not the list the old code read for this save`); });
    const done = withSeed(7000 + t.manager, () => {
      let state = loaded, entries = 0, matches = 0, reviews = 0;
      const seen = r => { if ((r.report?.detail?.timeline ?? []).some(e => e.kind === 'var')) reviews += 1; if (r.state?.live?.varReviews) reviews += 1; };
      if (row.halftime) { const second = CM.startSecondHalf(state); const r = CM.resumeMatch(second); state = r.state; if (r.kind === 'match') matches += 1; seen(r); }
      for (let k = 0; k < 70; k++) {
        const r = CM.playNextEntry(state, { skipHalftime: true });
        state = r.state; entries += 1; if (r.kind === 'match') matches += 1; seen(r);
        if (r.kind === 'seasonOver' || state.sacked) break;
      }
      return { state, entries, matches, reviews };
    });
    const round = copy(done.state);
    if (JSON.stringify(round) !== JSON.stringify(done.state)) fail(`${id}: the played save does not survive JSON`);
    if (done.reviews) fail(`${id}: ${done.reviews} match(es) played with a review while the switch is off`);
    if ((done.state.realLeagueFixtures ?? null) !== row.key && done.state.season === loaded.season) fail(`${id}: the fixture key changed during the same season`);
    if (done.state.leagueBook) t.booksAfter += 1;
    t.entriesPlayed += done.entries; t.matches += done.matches;
  } catch (err) { fail(`${id}: playing on threw: ${why(err)}`); }
}
const usOf = Object.fromEntries(US);
const per = {};
for (const row of made.us) {
  t.us += 1;
  const sport = usOf[row.slug], id = `${row.slug} career ${row.seed} (${row.pos}, ${row.era}, ${row.seasons} seasons)`;
  if (row.retired) continue;
  try {
    const c = sport.repairNetWorth(copy(row.state));
    const before = c.seasons.length, oldRows = JSON.stringify(row.state.seasons), oldRival = row.state.rival ? copy(row.state.rival) : null;
    if (JSON.stringify(c.seasons) !== oldRows) fail(`${id}: loading the save changed a season it already played`);
    if (oldRival && JSON.stringify(c.rival) !== JSON.stringify(oldRival)) fail(`${id}: loading the save changed the rival's record`);
    const rng = seeded(4000 + row.seed * 13 + row.slug.length);
    let added = 0;
    for (let k = 0; k < 3 && !c.retired; k++) { usSeason(sport, row.slug, c, rng); added += 1; }
    copy(c);
    t.usPlayed += 1; t.usSeasons += added; t.oldRows += before;
    if (c.seasons.length !== before + added) fail(`${id}: ${c.seasons.length - before} season rows were added by ${added} seasons`);
    if (JSON.stringify(c.seasons.slice(0, before)) !== oldRows) fail(`${id}: playing on changed a season the save already held`);
    if (oldRival) {
      t.rivalsKept += 1;
      if (!c.rival) fail(`${id}: the rival is gone after playing on`);
      else {
        if (c.rival.name !== oldRival.name) fail(`${id}: the rival is another man after playing on (${oldRival.name} to ${c.rival.name})`);
        const was = oldRival.hisYears + oldRival.myYears, now = c.rival.hisYears + c.rival.myYears;
        if (c.rival.hisYears < oldRival.hisYears || c.rival.myYears < oldRival.myYears) fail(`${id}: the head to head went DOWN (${oldRival.myYears} to ${oldRival.hisYears} before, ${c.rival.myYears} to ${c.rival.hisYears} after)`);
        if (now - was > added) fail(`${id}: the head to head grew by ${now - was} in ${added} seasons`);
        if (oldRival.lastYear === undefined) t.rivalsOldShape += 1;
        if (c.rival.lastYear !== undefined) t.rivalsNewShape += 1;
      }
    }
    const p = per[row.slug] ??= { played: 0, seasons: 0, games: [] };
    p.played += 1; p.seasons += added;
    for (const r of c.seasons.slice(before)) { const g = r.games ?? r.gp ?? r.g; if (typeof g === 'number') p.games.push(g); }
  } catch (err) { fail(`${id}: playing on threw: ${why(err)}`); }
}
console.log(JSON.stringify(t));
for (const [slug, p] of Object.entries(per)) console.log(`  ${slug}: ${p.played} saves played on, ${p.seasons} new seasons; games on the new rows from ${p.games.length ? Math.min(...p.games) : 'n/a'} to ${p.games.length ? Math.max(...p.games) : 'n/a'} (${p.games.length} rows with a games count)`);
console.log(`oldSaveProbeAV play: ${t.manager} Club Manager saves made by ${made.madeBy} loaded (${t.keyed} on a real fixture list), ${t.entriesPlayed} entries and ${t.matches} matches played on, ${t.booksAfter} hold a league book afterwards; ${t.us} US career saves, ${t.usPlayed} played on for ${t.usSeasons} seasons over ${t.oldRows} old rows held byte for byte; ${t.rivalsKept} rivals kept (${t.rivalsOldShape} saved in the old shape, ${t.rivalsNewShape} in the new one after a season)`);
if (failures) { console.error(`oldSaveProbeAV: ${failures} FAILURE(S)`); process.exit(1); }
console.log('oldSaveProbeAV: green. Every save made by the live build loads and plays on, and no season it already held moved.');
