/* Reviewer's mutation tool for Round 1107 (never committed). Runs on the
   GitHub runner's throwaway checkout: node .rc/x/rvmutate.mjs <id> applies one
   small mutation to the tree and refuses (exit 3) unless its anchor is in the
   file exactly once and the rewrite changed something. */
import fs from 'node:fs';

const M = {
  /* stale rule: the settle rule goes back to "any save that holds a pending tournament" */
  m1: ['src/components/soccer-career/careerMoments.ts',
    'c.phase === "world_cup" && c.pendingTournament ?',
    'c.pendingTournament ?'],
  /* dropped filter: confetti no longer waits for the card to be seen */
  m2: ['src/components/career-moments/CareerMomentCard.tsx',
    '!embedded && fresh && live && <Confetti',
    '!embedded && fresh && <Confetti'],
  /* off by one: the won card's own beats start one early, under the title */
  m3: ['src/components/soccer-career/InternationalPanel.tsx',
    'let beat = isWinner ? 2 : 0;',
    'let beat = isWinner ? 1 : 0;'],
  /* swapped argument: the number's before and now trade places */
  m4: ['src/components/soccer-career/SignedSlip.tsx',
    '{ text: wage, label: "your wage", ...(before && before !== wage ? { from: before } : {}) }',
    '{ text: before && before !== wage ? before : wage, label: "your wage", ...(before && before !== wage ? { from: wage } : {}) }'],
  /* dropped filter: the head is handed the card's raw moment, so a tile and Back replays it */
  m5: ['src/components/soccer-career/InternationalPanel.tsx',
    'moment={{ ...moment, fresh }}',
    'moment={moment}'],
  /* off by one: a rise of exactly OVERALL_JUMP is no longer a scene */
  m6: ['src/components/soccer-career/careerMilestones.ts',
    'if (!(to - from >= OVERALL_JUMP)) return null;',
    'if (!(to - from > OVERALL_JUMP)) return null;'],
  /* dropped line: a moment is never settled once it has played */
  m7: ['src/components/career-moments/useCareerMoment.ts',
    'if (key && live) settled.add(key);',
    'if (key && live && false) settled.add(key);'],
  /* stale key: the signing key forgets the deal's own terms */
  m8: ['src/components/soccer-career/careerMoments.ts',
    'return `signing|${runTag(note.forCareer)}|${note.kind}|${note.club}|${note.years}|${note.wage}`;',
    'return `signing|${runTag(note.forCareer)}`;'],
};

const id = process.argv[2];
const m = M[id];
if (!m) { console.error(`rvmutate: unknown mutation ${id}`); process.exit(3); }
const [rel, from, to] = m;
const src = fs.readFileSync(rel, 'utf8');
const found = src.split(from).length - 1;
if (found !== 1) { console.error(`rvmutate ${id}: anchor found ${found} time(s) in ${rel}`); process.exit(3); }
const out = src.replace(from, () => to);
if (out === src) { console.error(`rvmutate ${id}: nothing changed`); process.exit(3); }
fs.writeFileSync(rel, out);
console.log(`rvmutate ${id}: ${rel} mutated`);
