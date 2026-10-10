// Reviewer probe (never committed, runs only in the runner's throwaway checkout): point one base pinned harness
// of the other lane at the commit just before its own pull request was merged on release-at-int.
// usage: node .rc/x/review-fences-repin2.mjs <cm|dev|role>
import fs from 'node:fs';
import { execSync } from 'node:child_process';
const rev = c => execSync('git rev-parse ' + c, { encoding: 'utf8' }).trim();
const which = process.argv[2];
const plans = {
  // Round 1184 (PR209): the tree before its merge is the PR211 merge, 79c729cd.
  cm: { file: 'scripts/simCmRealFixtures.mjs', edits: [["base = 'bfc6197f';", () => "base = '" + rev('79c729cd') + "';"]] },
  // Rounds 1185 to 1187 (PR210): the tree before its merge is the PR208 merge, 5d31eaa6.
  dev: { file: 'scripts/simSoccerCareerDevelopment.mjs', edits: [["export const BASE = '4ab80fa978cf362427bcd024c64c6691e7f83c2a';", () => "export const BASE = '" + rev('5d31eaa6') + "';"]] },
  // Rounds 1188 to 1191 (PR212): the tree before its merge is the PR210 merge, de39ef18.
  role: { file: 'scripts/simCareerStoryRole.mjs', edits: [
    ["export const STORY_ROLE_BASE = 'fa24b3848d99e29367486489b081a483dc544206';", () => "export const STORY_ROLE_BASE = '" + rev('de39ef18') + "';"],
    ["const BASE_TREE = 'd9175fa74fc5784ba6acfd1a62f4592cb106f22f';", () => "const BASE_TREE = '" + rev('de39ef18^{tree}') + "';"],
  ] },
};
const plan = plans[which];
if (!plan) { console.error('repin2: unknown plan ' + which); process.exit(2); }
let text = fs.readFileSync(plan.file, 'utf8');
for (const [from, to] of plan.edits) {
  if (text.split(from).length !== 2) { console.error('repin2: anchor not exactly once in ' + plan.file + ': ' + from); process.exit(2); }
  const next = text.replace(from, to());
  if (next === text) { console.error('repin2: nothing changed for ' + from); process.exit(2); }
  text = next;
}
fs.writeFileSync(plan.file, text);
console.log('repinned ' + plan.file + ' (' + which + ', ' + plan.edits.length + ' edit(s))');
