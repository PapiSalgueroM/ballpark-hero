/**
 * Round 834: records scripts/data/careerAwardsNightFixture.json.
 *
 * Run ONCE, against the tree before any Round 834 code moved, so the fixture is
 * the real pre-lift output rather than a reimplementation of it. The procedure
 * lives in scripts/lib/careerAwardsNightProbe.mjs (bundled by
 * scripts/lib/careerAwardsNightBundle.mjs) and scripts/simCareerAwardsNight.mjs
 * section 1 replays it against the current tree.
 *
 * Only rerun this when a deliberate Soccer Career change lands that moves a
 * draw or a save field (main moving under the branch counts: record from a
 * clean export of main with --root, never from the branch). Say so in that
 * round's commit: re-recording to turn the harness green is exactly the failure
 * it exists to catch.
 *
 * Run: node scripts/recordCareerAwardsNightFixture.mjs [--root <tree>] [--out <file>] [--from <sha>]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { probeAwardsNight } from './lib/careerAwardsNightProbe.mjs';
import { bundleAwardsNight } from './lib/careerAwardsNightBundle.mjs';

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = name => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : null;
};
const root = path.resolve(arg('--root') ?? HERE);
const out = path.resolve(arg('--out') ?? path.join(HERE, 'scripts/data/careerAwardsNightFixture.json'));

/* --from <sha> names the commit the --root tree was exported from. It is the
   file's header, so a reader knows which main the replay is held to. */
const from = arg('--from');
const B = await bundleAwardsNight(root);
const data = probeAwardsNight(B);
fs.writeFileSync(out, JSON.stringify(from ? { recordedFrom: from, ...data } : data) + '\n');
const wins = data.nights.filter(n => n.rank === 1).length;
const steps = data.careers.reduce((a, c) => a + c.steps.split(' ').length, 0);
console.log(`wrote ${path.relative(HERE, out)} from ${root}: ${data.careers.length} careers, ${steps} saves hashed, ${data.nights.length} awards nights (${wins} won), ${data.tournaments.length} tournaments, ${data.speeches.length} direct speeches, ${data.markup.length} cards kept whole`);
