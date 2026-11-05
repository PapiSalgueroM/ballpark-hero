import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
const arg = name => process.argv[process.argv.indexOf(name) + 1];
for (const key of ['--out', '--dist', '--core']) assert(process.argv.includes(key), key);
const out = path.resolve(arg('--out')), dist = path.resolve(arg('--dist')), root = process.cwd(), core = arg('--core');
assert.match(core, /^[a-f0-9]{40}$/);
assert(out !== root && !out.startsWith(root + path.sep), 'Fixture evidence stays outside application source');
await fs.mkdir(out, { recursive: true }); assert.equal((await fs.readdir(out)).length, 0);
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const fixedPins = {
  'src/lib/nbaFrontOffice.ts': 'c1a4fd8c65f45ca251d6b6a5fe12f35c1bb3c217',
  'src/lib/nbaRotation.ts': 'acd7dbb36dda24f640647613e0daf63caff7d7cf',
  'src/lib/nbaGmDesk.ts': 'e43dcf727afae26b4040bec9f7999b5faaa19c55',
  'src/lib/nbaSeasonStats.ts': '03849990c61a4a969137d972ca8558493cee8a01',
  'src/lib/gmContracts.ts': 'd51c6fe3b58b079c95b88d9b296c622d7181727e',
  'src/lib/gmDesk.ts': '732b2dd3546f383326ba24b9b65cb634e997d02c',
  'src/lib/entityIds.ts': '5d7791d0f0d573d1c25ef567b2102f29996f7d6e',
  'src/lib/frontOfficeCuts.ts': 'd835672cb11b2283270ffdfadf35d17abe78b228',
  'src/pages/NbaFrontOffice.tsx': 'b75d7bcee279cc6db67502e99162b27d0e8f05a0',
};
const pinFiles = ['src/components/nba-front-office/NbaFrontOfficeBoard.tsx', ...Object.keys(fixedPins)], pins = {};
for (const file of pinFiles) {
  pins[file] = git('rev-parse', core + ':' + file);
  assert.equal(git('hash-object', file), pins[file], file);
  if (fixedPins[file]) assert.equal(pins[file], fixedPins[file], file + ' reviewed unchanged helper');
}
const tracked = git('ls-files', '-z').split('\0').filter(Boolean).sort();
const source = async () => Object.fromEntries(await Promise.all(tracked.map(async file => [file, sha(await fs.readFile(file))])));
async function inventory() {
  const rows = [];
  async function walk(rel = '') {
    for (const entry of await fs.readdir(path.join(dist, rel), { withFileTypes: true })) {
      const file = path.posix.join(rel, entry.name);
      if (entry.isDirectory()) await walk(file);
      else { assert(entry.isFile()); const bytes = await fs.readFile(path.join(dist, file)); rows.push({ file, bytes: bytes.length, sha256: sha(bytes) }); }
    }
  }
  await walk(); return rows.sort((a, b) => a.file < b.file ? -1 : a.file > b.file ? 1 : 0);
}
const sourceBefore = await source(), distBefore = await inventory(); assert(distBefore.length > 100);
const entry = path.join(out, 'entry.mjs'), bundle = path.join(out, 'engines.mjs');
await fs.writeFile(entry, [
  'export * as nba from ' + JSON.stringify(path.join(root, 'src/lib/nbaFrontOffice.ts')) + ';',
  'export * as arrivals from ' + JSON.stringify(path.join(root, 'src/lib/nbaGmDesk.ts')) + ';',
  'export * as desk from ' + JSON.stringify(path.join(root, 'src/lib/gmDesk.ts')) + ';',
  'export * as stats from ' + JSON.stringify(path.join(root, 'src/lib/nbaSeasonStats.ts')) + ';',
].join('\n'), { flag: 'wx' });
await build({ entryPoints: [entry], outfile: bundle, bundle: true, format: 'esm', platform: 'node',
  alias: { '@': path.join(root, 'src') }, logLevel: 'error' });
const { nba, arrivals, desk, stats } = await import(pathToFileURL(bundle).href);
const team = 'DEN', key = 'nba-front-office-save-v1', positions = ['G', 'F', 'C'];
const ids = Array.from({ length: 33 }, (_, i) => 'nba-market-access-fa-' + (i + 1));
const head = ids[0], tail = ids[30], last = ids[32], first20 = ids.slice(0, 20);
const rotation = [8, 7, 6, 5, 4, 3, 2, 1].map(i => 'nba-market-access-roster-' + i);
const seeded = initial => { let value = initial; return () => { value = value * 16807 % 2147483647; return (value - 1) / 2147483646; }; };
const player = (index, freeAgent) => ({
  id: 'nba-market-access-' + (freeAgent ? 'fa-' : 'roster-') + index,
  name: 'NBA market access fixture ' + (freeAgent ? 'free agent ' : 'roster ') + index,
  pos: positions[(index - 1) % positions.length], age: 24, ovr: freeAgent ? 99 - index : 70,
  salary: freeAgent ? 3 : 2, years: 2, out: 0, pot: 99,
});
function assertLoadHelpersHold(raw) {
  const loaded = JSON.parse(raw), before = structuredClone(loaded);
  assert.equal(nba.ensureNbaLeagueIds(loaded.league, loaded.draftClass), 0, 'Complete unique saved NBA IDs');
  stats.nbaCleanStats(loaded.league);
  if (Object.prototype.hasOwnProperty.call(loaded, 'gm')) loaded.gm = desk.readGmDesk(loaded.gm);
  assert.deepEqual(loaded, before); assert.equal(JSON.stringify(loaded), raw, 'Actual NBA JSON load helpers preserve complete fixture bytes');
}
const fixtures = {};
for (const kind of ['opening', 'plain', 'gm', 'cap', 'full', 'released']) {
  const league = nba.initNbaLeague(seeded(73)), club = league.teams[team], gmOn = kind === 'gm';
  assert.equal(league.season, 2026);
  club.players = Array.from({ length: kind === 'full' ? 15 : 14 }, (_, i) => player(i + 1, false));
  club.rotation = [...rotation];
  league.freeAgents = Array.from({ length: 33 }, (_, i) => player(i + 1, true)).reverse();
  const target = league.freeAgents.find(row => row.id === tail), final = league.freeAgents.find(row => row.id === last);
  assert(target && final); assert.equal(target.ovr, 68); assert.equal(final.ovr, 66);
  if (kind === 'opening') final.openingRatingEvidence = {
    modelVersion: 'nba894-review-v0.4', originKey: 'fictional:' + last, openingOvr: 79,
    basis: 'unmeasured-prior', partial: true,
  };
  if (kind === 'cap') target.salary = league.cap;
  if (kind === 'released') club.releasedThisSeason = [tail];
  assert.deepEqual([...league.freeAgents].sort((a, b) => b.ovr - a.ovr).map(p => p.id), ids);
  const frame = { league, myTeam: team, phase: 'hub', titles: 0, seasonsPlayed: 0,
    draftClass: null, picksLeft: 0,
    mandate: { tier: 'rebuild', text: 'Fictional NBA market access mandate.', winFloor: 0, reqLevel: 0, season: league.season },
    trust: 70, fired: false, pressTilt: 0, seasonTradeLine: null, postseason: null,
    ...(gmOn ? { gm: arrivals.openNbaDesk(league, team) } : {}) };
  const raw = JSON.stringify(frame); assertLoadHelpersHold(raw);
  const reference = structuredClone(frame), accepted = nba.nbaSign(reference.league.teams[team], reference.league.freeAgents, tail, reference.league.cap);
  assert.equal(accepted, !['cap', 'full', 'released'].includes(kind));
  const arrival = gmOn ? { since: 2026, how: 'signing', mid: true } : null;
  if (accepted && gmOn) {
    assert.equal(arrivals.nbaContractsOf(frame.gm, frame.league, team).men[tail], undefined);
    reference.gm = arrivals.nbaNoteArrivals(reference.gm, reference.league, team, [tail], 'signing');
    assert.deepEqual(arrivals.nbaContractsOf(reference.gm, reference.league, team).men[tail], arrival);
    assert.deepEqual(reference.gm.blocks.picks, frame.gm.blocks.picks); assert.deepEqual(reference.gm.blocks.staff, frame.gm.blocks.staff);
  }
  assert.deepEqual(reference.league.teams[team].rotation, rotation);
  if (accepted) {
    assert.equal(reference.league.teams[team].players.length, 15); assert.equal(reference.league.freeAgents.length, 32);
    assert.deepEqual(reference.league.teams[team].players.filter(p => p.id === tail), [target]);
    assert.equal(reference.league.freeAgents.some(p => p.id === tail), false);
  } else assert.deepEqual(reference, frame);
  assert.deepEqual(Object.fromEntries(Object.entries(reference.league.teams).filter(([id]) => id !== team)),
    Object.fromEntries(Object.entries(frame.league.teams).filter(([id]) => id !== team)));
  if (!gmOn) assert.equal(Object.prototype.hasOwnProperty.call(reference, 'gm'), false);
  const signedBytes = JSON.stringify(reference); assertLoadHelpersHold(signedBytes);
  const file = kind + '.json'; await fs.writeFile(path.join(out, file), raw, { flag: 'wx' });
  fixtures[kind] = { key, file, sha256: sha(raw), expected: {
    kind, path: '/nba-front-office', team, head, tail, last, ids, first20, rotation, gmOn, arrival,
    before: frame, accepted, signed: reference, signedBytes,
    evidence: kind === 'opening' ? { id: last, openingOvr: 79, currentOvr: 66, basis: 'unmeasured-prior',
      note: 'Opening estimate 79: unmeasured game prior. Limited defense and role evidence.' } : null,
    scope: 'Fictional complete DEN roster14/15 and33 reversed complete NBA free agents in the real constructor league. Target31, evidence33 only. NBA JSON load helpers, real nbaSign and optional nbaNoteArrivals supply full references. Preferred8rotation is explicit; absent automatic rotation remains covered by the held unit head vector, not claimed by these native fixtures.',
  } };
}
const sourceAfter = await source(); assert.deepEqual(sourceAfter, sourceBefore); assert.deepEqual(await inventory(), distBefore);
await fs.writeFile(path.join(out, 'manifest.json'), JSON.stringify({
  schema: 1, core, pins, sourceBefore, sourceAfter, distBefore, distDigest: sha(JSON.stringify(distBefore)),
  bundle: 'engines.mjs', bundleSHA: sha(await fs.readFile(bundle)), fixtures,
  scope: 'Six explicit fictional NBA saved fixtures. Actual NBA constructor/load helpers/signing/arrival ledger, complete frames and exact serialized references. No NFL save validator or market legend, source transformations, browser clock/RNG/storage hooks or provider fixtures. Source-only draft until isolated remote execution is admitted.',
}, null, 2) + '\n', { flag: 'wx' });
console.log('nbaFoMarketFixtures: six complete fictional saved pools, NBA load-helper holds, full sign/refusal references and source/completed-dist inventories retained.');
