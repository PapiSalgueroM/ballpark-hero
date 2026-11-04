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
await fs.mkdir(out, { recursive: true });
assert.equal((await fs.readdir(out)).length, 0);
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const pinFiles = ['src/components/front-office/FrontOfficeBoard.tsx', 'src/lib/frontOffice.ts',
  'src/lib/frontOfficeCuts.ts', 'src/lib/frontOfficeSave.ts', 'src/pages/FrontOffice.tsx'];
const pins = {};
for (const file of pinFiles) {
  pins[file] = git('rev-parse', core + ':' + file);
  assert.equal(git('hash-object', file), pins[file], file);
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
  await walk();
  return rows.sort((a, b) => a.file < b.file ? -1 : a.file > b.file ? 1 : 0);
}
const sourceBefore = await source(), distBefore = await inventory();
assert(distBefore.length > 100);
const entry = out + '/entry.mjs', bundle = out + '/engines.mjs';
await fs.writeFile(entry, [
  'export * as fo from ' + JSON.stringify(path.join(root, 'src/lib/frontOffice.ts')) + ';',
  'export * as codec from ' + JSON.stringify(path.join(root, 'src/lib/frontOfficeSave.ts')) + ';',
].join('\n'), { flag: 'wx' });
await build({ entryPoints: [entry], outfile: bundle, bundle: true, format: 'esm', platform: 'node',
  alias: { '@': path.join(root, 'src') }, logLevel: 'error' });
const { fo, codec } = await import(pathToFileURL(bundle).href);
const positions = ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'DB'];
const ids = Array.from({ length: 33 }, (_, i) => 'market-access-fa-' + (i + 1));
const head = ids[0], tail = ids[28], last = ids[32];
const seeded = initial => { let value = initial; return () => { value = value * 16807 % 2147483647; return (value - 1) / 2147483646; }; };
const player = (index, freeAgent) => ({
  id: 'market-access-' + (freeAgent ? 'fa-' : 'roster-') + index,
  name: 'Market access fixture ' + (freeAgent ? 'free agent ' : 'roster ') + index,
  pos: positions[(index - 1) % positions.length], age: 24, ovr: freeAgent ? 99 - index : 70,
  salary: freeAgent ? 1 : 2, years: 2, out: 0, pot: 99,
});
const fixtures = {};
for (const kind of ['opening', 'legacy', 'plain', 'cap', 'full', 'released']) {
  const league = fo.initLeague(seeded(73));
  league.teams.KC.players = Array.from({ length: kind === 'full' ? 53 : 7 }, (_, i) => player(i + 1, false));
  league.freeAgents = Array.from({ length: 33 }, (_, i) => player(i + 1, true)).reverse();
  const target = league.freeAgents.find(row => row.id === tail), final = league.freeAgents.find(row => row.id === last);
  assert(target && final);
  if (kind === 'opening') final.openingRatingEvidence = {
    modelVersion: 'fictional-market-access', originKey: last, openingOvr: final.ovr,
    basis: 'unmeasured-prior', partial: true,
  };
  if (kind === 'legacy') final.noSeason = true;
  if (kind === 'cap') target.salary = league.cap;
  if (kind === 'full') { league.teams.KC.rosterDepth = 2; league.teams.KC.practice = []; }
  if (kind === 'released') league.teams.KC.releasedThisSeason = [tail];
  const frame = { league, myTeam: 'KC', phase: 'hub', titles: 0, seasonsPlayed: 0,
    draftClass: null, picksLeft: 0,
    mandate: { tier: 'rebuild', text: 'Fictional market access mandate.', winFloor: 0, reqLevel: 0, season: league.season },
    trust: 70, fired: false, pressTilt: 0, seasonTradeLine: null, postseason: null };
  assert(codec.isFrontOfficeSave(frame, 'NFL', fo.REGULAR_WEEKS));
  const raw = JSON.stringify(frame), reference = structuredClone(frame);
  const accepted = fo.signPlayer(reference.league.teams.KC, reference.league.freeAgents, tail, reference.league.cap);
  assert.equal(accepted, !['cap', 'full', 'released'].includes(kind));
  if (!accepted) assert.deepEqual(reference, frame);
  const file = kind + '.json';
  await fs.writeFile(out + '/' + file, raw, { flag: 'wx' });
  fixtures[kind] = { key: 'front-office-save-v1', file, sha256: sha(raw),
    expected: { kind, path: '/front-office', head, tail, last, ids, before: frame, accepted,
      signed: reference, signedBytes: JSON.stringify(reference),
      scope: 'Real constructor, signing and save reader. Explicit fictional KC roster and33complete fictional free agents. Tail29is signed; tail33alone owns rating evidence. Guards target tail29. Native clocks/RNG remain untouched.' } };
}
const sourceAfter = await source();
assert.deepEqual(sourceAfter, sourceBefore); assert.deepEqual(await inventory(), distBefore);
await fs.writeFile(out + '/manifest.json', JSON.stringify({
  schema: 1, core, pins, sourceBefore, sourceAfter, distBefore, distDigest: sha(JSON.stringify(distBefore)),
  bundle: 'engines.mjs', bundleSHA: sha(await fs.readFile(bundle)), fixtures,
  scope: 'Source-owned33-player fictional saved pools from the actual engine. Pure existing signPlayer supplies complete expected frames. No source transformations, browser clock/RNG/storage hooks or provider fixtures.',
}, null, 2) + '\n', { flag: 'wx' });
console.log('foMarketAccessFixtures: six valid complete saved pools, full reference sign/refusal frames and source/completed-dist inventories retained.');

