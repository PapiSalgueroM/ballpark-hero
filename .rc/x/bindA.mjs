// Round 1603 closing check: bind 4 for Round 1593, recipe A. Run from the root of a tree that joins r1603 and r1593.
// simCmEuroPlay section 6 compares the head with the participant and the ticking weeks reverted against its pinned
// base 14a9af704. On a joined tree the head also judges a deciding second leg by the tie (Round 1603), which the base
// never did, so this adds one more edit to the reverted engine only: judgedByTie returns false, exactly the OLD patch
// simCmDecidingLeg uses. PLAY_EDITS in scripts/lib/worldUelPlay.mjs is left alone because five other harnesses read it.
import { readFileSync, writeFileSync } from 'node:fs';

const fail = (m) => { console.log('bindA: ABORT, ' + m); process.exit(2); };
const once = (text, s, where) => {
  const n = text.split(s).length - 1;
  if (n !== 1) fail(`${where}: expected exactly one ${JSON.stringify(s.slice(0, 80))}, found ${n}`);
};

const JUDGE = "  return state.matchRules !== 'base' && state.tieRules !== 'night' && tie?.leg === 2 && typeof tie.through === 'boolean';\n";
once(readFileSync('src/lib/clubManager.ts', 'utf8'), JUDGE, 'src/lib/clubManager.ts');

const F = 'scripts/simCmEuroPlay.mjs';
let src = readFileSync(F, 'utf8');
const BASE_LINE = "const BASE = process.env.CM_EURO_PLAY_BASE || '14a9af704';\n";
const EDITS_OLD = "{ edits: CONTROL === 'noplayrevert' ? TICKING_EDITS : [...PLAY_EDITS, ...TICKING_EDITS] }";
const EDITS_NEW = "{ edits: CONTROL === 'noplayrevert' ? [...TICKING_EDITS, ...JUDGE_1603] : [...PLAY_EDITS, ...TICKING_EDITS, ...JUDGE_1603] }";
once(src, BASE_LINE, F);
once(src, EDITS_OLD, F);
const DEF = "/* Round 1603 (joined at the release): the base never judged a deciding second leg by the tie, so the reverted head\n" +
  " * must not either. Same patch as simCmDecidingLeg's OLD engine. */\n" +
  "const JUDGE_1603 = [{ file: 'src/lib/clubManager.ts',\n" +
  "  from: " + JSON.stringify(JUDGE) + ",\n" +
  "  to: '  return false;\\n' }];\n";
src = src.replace(BASE_LINE, BASE_LINE + DEF).replace(EDITS_OLD, EDITS_NEW);
once(src, EDITS_NEW, F + ' after the edit');
once(src, 'const JUDGE_1603 = ', F + ' after the edit');
writeFileSync(F, src);
console.log('bindA applied: simCmEuroPlay section 6 reverts the Round 1603 tie reading too');
