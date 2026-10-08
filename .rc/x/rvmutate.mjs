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
  /* dropped rule: a still card's cup is no longer landed at once */
  n1: ['src/components/career-moments/CareerMomentStyles.tsx',
    '.cmo-still .victory-moment::before { animation-duration: 0.001ms; animation-delay: 0s; }',
    '.cmo-still .victory-moment::before { animation-delay: 0s; }'],
  /* dropped rule: a waiting card's cup no longer waits */
  n2: ['src/components/career-moments/CareerMomentStyles.tsx',
    '.cmo-wait .victory-moment::before { animation-play-state: paused; }',
    '.cmo-wait .victory-moment::before { animation-play-state: running; }'],
  /* the settle rule the other way: nothing is settled on load, so a reload on the card replays */
  n3: ['src/components/soccer-career/careerMoments.ts',
    'c.phase === "world_cup" && c.pendingTournament ?',
    'c.phase === "never" && c.pendingTournament ?'],
  /* dropped argument: the avatar forgets the club colour */
  n4: ['src/components/soccer-career/SignedSlip.tsx',
    'clubColor={c.currentClubColor} size={56}',
    'size={56}'],
  /* swapped arguments: the armband is read backwards */
  n5: ['src/components/soccer-career/careerMilestones.ts',
    'clubCaptain: !(prev.isClubCaptain ?? false) && (next.isClubCaptain ?? false),',
    'clubCaptain: !(next.isClubCaptain ?? false) && (prev.isClubCaptain ?? false),'],
  /* dropped filter: the old number is drawn on still and quiet cards too */
  n6: ['src/components/career-moments/CareerMomentCard.tsx',
    'const from = count && loud && count.from && count.from !== count.text ? count.from : null;',
    'const from = count && count.from && count.from !== count.text ? count.from : null;'],
  /* dropped guard: Continue can fire more than once */
  n7: ['src/components/career-moments/CareerMomentCard.tsx',
    'if (fired.current) return;',
    'if (false) return;'],
  /* dropped guard: confetti falls for a visitor who asked for less motion */
  n8: ['src/components/career-moments/Confetti.tsx',
    'if (prefersReducedMotion()) return;',
    'if (false) return;'],
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
