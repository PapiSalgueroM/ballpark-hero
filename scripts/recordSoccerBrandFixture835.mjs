/**
 * Round 835: records scripts/data/soccerBrandFixture835.json.
 *
 * Run ONCE, against a tree from before any Round 835 code moved, so the
 * fixture is the real pre-lift output rather than a reimplementation of it.
 * The procedure lives in scripts/lib/soccerBrandProbe835.mjs and
 * scripts/simCareerSocialBrands.mjs section 1 replays it against the current
 * tree.
 *
 * The optional argument is the root of the tree to record FROM (default: this
 * checkout). That is what lets the fixture be re-recorded honestly after a
 * merge brings in another round's deliberate Soccer Career change (Round 819
 * makes the dilemmas reachable, which moves every later draw): check out the
 * merge base's main into a scratch worktree, record from there, and replay on
 * the lifted tree. Recording from the lifted tree itself is the one thing
 * this must never be used for: re-recording to turn the harness green is
 * exactly the failure it exists to catch. Say which tree a re-record came
 * from in the commit.
 *
 * The second argument is the commit that tree is (the full sha of the main it
 * was archived from). It is written into the fixture's `recordedFrom` header,
 * which the harness sets aside before it compares and requires to be a real
 * sha, so the file itself says what it is a photograph of. The fixture now in
 * the repo was recorded from origin/main 89d31144 (`git archive origin/main
 * src` into a scratch folder), after Rounds 819, 834 and 850 had landed there,
 * and replayed identical on the lifted tree merged with that same main.
 *
 * Run: node scripts/recordSoccerBrandFixture835.mjs <treeRoot> <sha of that tree>
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSoccerBrand, probeSoccerBrand } from './lib/soccerBrandProbe835.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TREE = path.resolve(process.argv[2] || ROOT);
const SHA = process.argv[3] || '';
if (!/^[0-9a-f]{40}$/.test(SHA)) {
  console.error('give the full sha of the tree being recorded as the second argument: the fixture carries it in its header');
  process.exit(1);
}
const B = await loadSoccerBrand(TREE);
const data = probeSoccerBrand(B);
const out = path.join(ROOT, 'scripts/data/soccerBrandFixture835.json');
fs.writeFileSync(out, JSON.stringify({ recordedFrom: { main: SHA }, ...data }) + '\n');
const steps = data.careers.reduce((n, c) => n + c.steps.split(' ').length, 0);
console.log(`recorded from ${TREE}`);
console.log(`wrote ${path.relative(ROOT, out)}: ${data.careers.length} careers (${steps} hashed steps), ${data.oldSaves.length} old saves, ${data.units.posts.length} post units, ${data.units.agents.length} agent units`);
