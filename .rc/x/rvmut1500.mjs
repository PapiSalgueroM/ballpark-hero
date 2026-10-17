// Round 1500 reviewer (run lens): one plausible mutation applied to the checked out tree on a runner.
// Usage: node .rc/x/rvmut1500.mjs <name>. Asserts the anchor is present exactly once, then edits in place.
// The request line restores with git checkout -- src scripts.
import fs from 'node:fs';

const MUTS = {
  // swapped argument: the catch chance read from the heat before the wash's own +10
  pctbefore: ['src/lib/careerDirtyMoney.ts', 'n.caughtPct = washCaughtPct(after);', 'n.caughtPct = washCaughtPct(heat);'],
  // stale constant: the season end cools 8 in the preview while the engines cool 9
  cool8: ['src/lib/careerDirtyMoney.ts', 'const SEASON_COOL = 9;', 'const SEASON_COOL = 8;'],
  // dropped filter: Come clean cools even at the top of the meter (correction 2's heat 100 case)
  top100: ['src/lib/careerDirtyMoney.ts', '  if (heat >= 100) return 0;\n', ''],
  // off by one: a sliver of dirty money earns karma when given away (correction 2: none for a sliver)
  sliver: ['src/lib/careerDirtyMoney.ts', 'return Math.max(0, Math.min(GIVE_KARMA_CAP, Math.floor(dirty), 100 - karma));', 'return Math.max(0, Math.min(GIVE_KARMA_CAP, Math.ceil(dirty), 100 - karma));'],
  // dropped filter: the desk button outside a playing season (advice 17)
  anyphase: ['src/components/us-career/UsCareerBoard.tsx', "{phase === 'season' && canDealWithDirtyMoney(career) && (", '{canDealWithDirtyMoney(career) && ('],
  // dropped flag: the NBA wash card no longer closes, so it can be dealt again for another wash
  noflag: ['src/lib/nbaCareerCorruption.ts', "apply: (cc) => { setFlag(cc, 'wash', 1); return launderDirtyMoney(", 'apply: (cc) => { return launderDirtyMoney('],
};

const name = process.argv[2];
const m = MUTS[name];
if (!m) { console.error(`unknown mutation ${name}`); process.exit(3); }
const [file, from, to] = m;
const src = fs.readFileSync(file, 'utf8');
const count = src.split(from).length - 1;
if (count !== 1) { console.error(`MUTATION ${name} ABORTED: anchor found ${count} times in ${file}`); process.exit(3); }
const out = src.replace(from, to);
if (out === src) { console.error(`MUTATION ${name} ABORTED: no change`); process.exit(3); }
fs.writeFileSync(file, out);
console.log(`MUTATION ${name} applied to ${file}`);
