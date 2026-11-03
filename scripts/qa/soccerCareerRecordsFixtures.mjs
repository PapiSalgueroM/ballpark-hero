import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const option = name => process.argv[process.argv.indexOf(name) + 1];
assert.ok(process.argv.includes('--out'), '--out is required');
const OUT = path.resolve(option('--out')), ROOT = process.cwd();
await fs.mkdir(OUT, { recursive: true });
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const paths = [
  'src/pages/SoccerCareer.tsx', 'src/lib/soccerCareerEngine.ts', 'src/lib/soccerCareerSave.ts',
  'src/lib/saveFence.ts', 'src/lib/soccerCareerCompletedRecords.ts',
  'src/components/soccer-career/PastCareersSheet.tsx', 'src/components/ui/dialog.tsx',
  'src/test/soccerCareerCompletedRecords.test.tsx', 'src/test/soccerCareerRecords.test.tsx',
];
const sourceBefore = Object.fromEntries(await Promise.all(paths.map(async file => [file, hash(await fs.readFile(file))])));
const entry = path.join(OUT, 'engine-entry.mjs'), bundle = path.join(OUT, 'engine-bundle.mjs');
await fs.writeFile(entry, [
  'const values = new Map();',
  'globalThis.localStorage = { getItem:k=>values.get(k)??null, setItem:(k,v)=>values.set(k,String(v)), removeItem:k=>values.delete(k), clear:()=>values.clear() };',
  'export const engine = await import(' + JSON.stringify(path.join(ROOT, 'src/lib/soccerCareerEngine.ts')) + ');',
  'export const codec = await import(' + JSON.stringify(path.join(ROOT, 'src/lib/soccerCareerSave.ts')) + ');',
  'export const records = await import(' + JSON.stringify(path.join(ROOT, 'src/lib/soccerCareerCompletedRecords.ts')) + ');',
].join('\n') + '\n', { flag: 'wx' });
await build({ entryPoints: [entry], outfile: bundle, bundle: true, format: 'esm', platform: 'node',
  alias: { '@': path.join(ROOT, 'src') }, logLevel: 'error' });
const { engine: E, codec, records } = await import(pathToFileURL(bundle).href);
const random = Math.random, now = Date.now;
const name = 'Record Keeper Fictional Mobile Test Name';
assert.equal(name.length, 40);
let completed, draws = 0;
try {
  let seed = 733;
  Math.random = () => {
    draws++;
    seed = (seed + 0x6d2b79f5) | 0;
    let n = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    n = (n + Math.imul(n ^ (n >>> 7), 61 | n)) ^ n;
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
  Date.now = () => Date.UTC(2026, 10, 3, 12);
  const club = { id: 'records-browser-fixture', name: 'Records Fixture FC', country: 'England',
    tier: 1, color: '#123456', league: 'Records Fixture League' };
  const initial = E.initCareer(name, 'England', 'CM', '2020-24',
    { pace: 75, shooting: 75, passing: 75, dribbling: 75, defending: 75, physical: 75, reflexes: 75 },
    75, 2020, [club], null, 90);
  const playing = { year: 2028, age: 24, club: club.name, clubCountry: club.country, clubTier: 1,
    apps: 32, goals: 17, assists: 8, cleanSheets: 4, yellowCards: 2, redCards: 0, rating: 7.9, ovr: 75,
    leagueTitle: true, domesticCup: false, championsLeague: false, worldCup: false,
    ballonDor: false, ballonDorRank: null, type: 'playing',
    intApps: 4, intGoals: 2, intAssists: 1, intRating: 7.5, tournament: null, tournamentResult: null };
  const active = { ...initial, age: 24, currentClub: club.name, currentClubCountry: club.country,
    currentClubTier: 1, currentClubColor: club.color, currentLeague: club.league,
    phase: 'playing', retired: false, seasons: [...initial.seasons, playing],
    intStats: { ...initial.intStats, caps: 4, goals: 2, assists: 1 } };
  completed = E.repairCareer(E.choosePostRetirement(E.manualRetire(active), 'retire', [club]));
} finally {
  Math.random = random; Date.now = now;
}
const raw = codec.serializeSoccerCareerSave(completed), decoded = codec.parseSoccerCareerSave(raw);
assert.equal(codec.isSoccerCareerSave(decoded), true);
assert.deepEqual(decoded, JSON.parse(JSON.stringify(completed)));
assert.equal(decoded.retired, true); assert.equal(decoded.phase, 'retired');
const totals = E.getCareerTotals(decoded.seasons);
const summary = { goals: totals.goals,
  trophies: totals.leagueTitles + totals.domesticCups + totals.championsLeagues + totals.worldCups + totals.continentalCups + totals.clubCups,
  ballonDors: totals.ballonDors, caps: decoded.intStats.caps };
assert.deepEqual(summary, { goals: 17, trophies: 1, ballonDors: 0, caps: 4 });
const expected = records.completedRecordCandidate(decoded, summary);
assert.ok(expected); assert.equal(expected.profile[0], name);
assert.deepEqual([expected.firstYear, expected.lastYear], [2028, 2028]);
const future = '{"version":99,"records":[{"opaque":"KEEP_FUTURE_RECORD"}],"extra":"KEEP_FUTURE_FIELD"}';
const files = [];
for (const [key, file, bytes] of [['completed', 'completed.json', raw], ['future', 'future-book.json', future]]) {
  await fs.writeFile(path.join(OUT, file), bytes, { flag: 'wx' });
  files.push({ key, file, bytes: Buffer.byteLength(bytes), sha256: hash(bytes) });
}
async function inventory(dir, relative = '') {
  const rows = [];
  for (const item of (await fs.readdir(path.join(dir, relative), { withFileTypes: true })).sort((a,b) => a.name.localeCompare(b.name))) {
    const file = path.posix.join(relative, item.name);
    if (item.isDirectory()) rows.push(...await inventory(dir, file));
    else { assert.ok(item.isFile()); const bytes = await fs.readFile(path.join(dir, file)); rows.push({ file, bytes: bytes.length, sha256: hash(bytes) }); }
  }
  return rows;
}
const dist = await inventory(path.resolve('dist')); assert.ok(dist.length > 100);
await fs.writeFile(path.join(OUT, 'dist-inventory.json'), JSON.stringify(dist, null, 2) + '\n', { flag: 'wx' });
const sourceAfter = Object.fromEntries(await Promise.all(paths.map(async file => [file, hash(await fs.readFile(file))])));
assert.deepEqual(sourceAfter, sourceBefore);
const manifest = {
  scope: 'One explicitly fictional completed career, real initCareer/manualRetire/choosePostRetirement and codec. Explicit invented playing receipts are test inputs, not natural progression or real sports data.',
  saveKey: 'soccerCareerSave', recordsKey: records.SC_CAREER_RECORDS_KEY,
  fixtureOnlySeed: 733, fixtureOnlyDate: '2026-11-03T12:00:00.000Z', fixtureOnlyDraws: draws,
  browserClockOrRngOverrides: false, sourceBefore, sourceAfter, expected, files,
  bundle: 'engine-bundle.mjs', bundleSha256: hash(await fs.readFile(bundle)),
  distInventorySha256: hash(JSON.stringify(dist)),
};
await fs.writeFile(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
console.log('soccerCareerRecordsFixtures: green. Fictional completed career passed real engine, codec and immutable-record checks; completed dist only read.');