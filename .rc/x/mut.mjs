// Round 1303 review (run lens): one small plausible mutation of the round's rule, applied on the RUNNER's checkout
// only. node .rc/x/mut.mjs <name>. Exits 2 if the anchor is not there exactly once (so a mutation that changed
// nothing can never read as "everything stayed green").
import fs from 'node:fs';
const M = {
  // 1. A dropped filter on one side: the other club's goals are reviewed whenever the match has reviews at all,
  //    whatever kinds it was kicked off with (the line Round 1302 had).
  oppgate: ['src/lib/clubManager.ts',
    "const theirReview = reviewKinds.includes('goal') ? settleGoalReviews(oppGoals, 'opp', reviewKey) : null;",
    "const theirReview = live.varReviews ? settleGoalReviews(oppGoals, 'opp', reviewKey) : null;"],
  // 2. The fast forward hands the engine a boolean again: every kind staged in a quick simmed run.
  ffbool: ['src/lib/clubManagerCalendar.ts',
    '...(opts?.varReviews ? { varReviews: opts.varReviews } : {})',
    '...(opts?.varReviews ? { varReviews: !!opts.varReviews } : {})'],
  // 3. The fast forward drops the ask: a quick simmed run never has a review.
  ffdrop: ['src/lib/clubManagerCalendar.ts',
    '...(opts?.varReviews ? { varReviews: opts.varReviews } : {})',
    '...(opts?.varReviews ? {} : {})'],
  // 4. A match in play forgets its saved list: every kind after a save and load.
  savedlist: ['src/lib/clubManagerVar.ts',
    'return saved ? CM_VAR_ALL_KINDS.filter(kind => saved.includes(kind)) : [...CM_VAR_ALL_KINDS];',
    'return [...CM_VAR_ALL_KINDS];'],
  // 5. The game's own ask ignores the list it is handed (a stale default): whatever the caller passes, the
  //    generated list goes to the engine.
  askdefault: ['src/lib/clubManagerVar.ts',
    'return switchOn && kinds.length > 0 ? { varReviews: kinds } : {};',
    'return switchOn && CM_VAR_KINDS.length > 0 ? { varReviews: CM_VAR_KINDS } : {};'],
  // 6. The match's own help tells of a penalty a review gives in a match that reviews goals only.
  helppen: ['src/components/club-manager/LiveSimScreen.tsx',
    "const goals = kinds.includes('goal'), penalties = kinds.includes('penalty'), reviews = goals || penalties;",
    "const goals = kinds.includes('goal'), penalties = kinds.length > 0, reviews = goals || penalties;"],
  // 7. The generator plays a kind the ledger has on even while an open owed entry holds it.
  genheld: ['scripts/genCmVarRates.mjs',
    'played: line.on === true && standard && heldBy.length === 0 };',
    'played: line.on === true && standard };'],
  // 8. The second ask of the hook (the fast forward button) is left on the old boolean switch.
  hookff: ['src/hooks/useClubManager.ts',
    'const run = runSimToWeek(career, targetWeek, cmVarGameAsk(CM_VAR_LIVE));',
    'const run = runSimToWeek(career, targetWeek, CM_VAR_LIVE ? { varReviews: CM_VAR_LIVE } : undefined);'],
};
const name = process.argv[2];
if (!M[name]) { console.log('MUT ABORT: unknown mutation ' + name); process.exit(2); }
const [file, from, to] = M[name];
const src = fs.readFileSync(file, 'utf8');
const n = src.split(from).length - 1;
if (n !== 1) { console.log(`MUT ABORT: ${name}: the anchor is in ${file} ${n} time(s), not once`); process.exit(2); }
if (process.env.MUT_DRY === '1') { console.log(`MUT ${name} anchor found once in ${file} (dry run)`); process.exit(0); }
fs.writeFileSync(file, src.replace(from, to));
console.log(`MUT ${name} APPLIED to ${file}`);
