// Release BF join: write the chain's gate hand lines, rc-BFa (no build) and rc-BFb (served walks), into .tmp-fx/bfg.
import fs from 'node:fs';
const P = 'NODE_OPTIONS="--require=$PWD/scripts/lib/offlineTransport.cjs"';
/* Round BFH: each core ref is the join's sha plus Release BE's merge of main, built on the runner by .rc/x/coreBE.sh
   (send x/coreBE.sh with both requests), because this branch merged Release BE 08923969 after every chain packet. */
const REFS = 'SC_PENDING_LIFE_CORE_REF=50f49993 SC_LIFE_REWARDS_CORE_REF=80084c4b SC_PENDING_MORALE_CORE_REF=26cad60f SC_PENDING_POPULARITY_CORE_REF=25c6b0d2 SC_COLD_CONTEXT_CORE_REF=f727cfbf SC_COLD_REPLAY_CORE_REF=f727cfbf SC_DOCUMENTARY_CORE_REF=33b722fb SC_SAVED_LOAN_CORE_REF=ffc16131'
  .split(' ').map(pair => { const [name, sha] = pair.split('='); return `${name}=$(bash .rc/x/coreBE.sh ${sha})`; }).join(' ');
const ENV = `CI=1 SIM_NETWORK=offline ${REFS}`;
const SIMS = [
  ['simSoccerCareerRoutineEvents', 'SC_ROUTINE_CONTROL', ['missing', 'priority', 'effect'], 'SOCCER_ROUTINE_OUT', 'SOCCER_ROUTINE_PHASE', 'playSoccerCareerRoutineEvents'],
  ['simSoccerCareerLifeReviews', 'SC_LIFE_REVIEWS_CONTROL', ['missing', 'priority', 'effect'], 'CAREER_REVIEWS_OUT', 'CAREER_REVIEWS_PHASE', 'playSoccerCareerLifeReviews'],
  ['simSoccerCareerPendingLife', 'SC_PENDING_LIFE_CONTROL', ['missing', 'profile', 'draw', 'rate'], 'CAREER_PENDING_OUT', 'CAREER_PENDING_PHASE', 'playSoccerCareerPendingLife'],
  ['simSoccerCareerStatRewards', 'SC_LIFE_REWARDS_CONTROL', ['overwrite', 'preview', 'legacy'], 'CAREER_REWARDS_OUT', 'CAREER_REWARDS_PHASE', 'playSoccerCareerStatRewards'],
  ['simSoccerCareerPendingMorale', 'SC_PENDING_MORALE_CONTROL', ['pending', 'preview', 'legacy'], 'CAREER_MORALE_OUT', 'CAREER_MORALE_PHASE', 'playSoccerCareerPendingMorale'],
  ['simSoccerCareerPendingPopularity', 'SC_PENDING_POPULARITY_CONTROL', ['pending', 'preview', 'legacy'], 'CAREER_POPULARITY_OUT', 'CAREER_POPULARITY_PHASE', 'playSoccerCareerPendingPopularity'],
  ['simSoccerCareerColdContext', 'SC_COLD_CONTEXT_CONTROL', ['original'], 'CAREER_COLD_OUT', 'CAREER_COLD_PHASE', null],
  ['simSoccerCareerDocumentaryReview', 'SC_DOCUMENTARY_CONTROL', ['registration', 'priority', 'effect'], 'CAREER_DOCUMENTARY_OUT', 'CAREER_DOCUMENTARY_PHASE', 'playSoccerCareerDocumentaryReview'],
  ['simSoccerCareerSavedLoan', 'SC_SAVED_LOAN_CONTROL', ['gate'], 'CAREER_LOAN_OUT', 'CAREER_LOAN_PHASE', 'playSoccerCareerSavedLoan'],
];
const TESTS = ['soccerCareerRoutineEvents.test.ts', 'soccerCareerLifeFollowups.test.ts', 'soccerCareerLifeReviews.test.ts', 'soccerCareerPendingLife.test.ts',
  'soccerCareerStatRewards.test.ts', 'soccerCareerPendingMorale.test.ts', 'soccerCareerPendingPopularity.test.ts', 'soccerCareerColdContext.test.ts',
  'soccerCareerDocumentaryReview.test.ts', 'soccerCareerSavedLoan.test.ts', 'seasonCentreOwnGoals.test.tsx', 'soccerLifeChainPackedSave.test.ts',
  'soccerSavePackedReaders.test.tsx', 'soccerCareerContracts.test.ts'].map(t => 'src/test/' + t).join(' ');
const a = ['# Release BF gate, the join\'s lines (Round BFG): the Soccer Career life chain\'s sims, each control (passing only when it FIRED: exit 0 with its Effective line and its own green line, the chain\'s convention), the programme reward control, the two qa qualifiers, the chain units and the type gate. Every sim reads its core ref (the merge\'s first parent) for the app files Releases BB to BE moved; since Round BFH that ref plus Release BE\'s merge of main, built on the runner by .rc/x/coreBE.sh (send it with this file).',
  'tsc: node_modules/.bin/tsc --noEmit -p tsconfig.app.json',
  `vitest-chain: node_modules/.bin/vitest run ${TESTS} --testTimeout=300000 --hookTimeout=120000`];
for (const [sim, ctl, controls] of SIMS) {
  a.push(`${sim}: ${ENV} ${P} node scripts/${sim}.mjs`);
  for (const c of controls) a.push(`${sim}-ctl-${c}: ${ENV} ${ctl}=${c} ${P} node scripts/${sim}.mjs > /tmp/c-${sim}-${c}.log 2>&1; s=$?; tail -2 /tmp/c-${sim}-${c}.log | cut -c1-200; [ $s = 0 ] && grep -q "^Effective" /tmp/c-${sim}-${c}.log && grep -qE "^${sim} (control )?${c}: green" /tmp/c-${sim}-${c}.log && echo FIRED-OK`);
}
a.push('programme-ctl-overwrite: PROGRAMME_REWARD_CONTROL=overwrite CAREER_PROGRAMME_OUT="$PWD/pgo" node scripts/simCareerProgramme.mjs > /tmp/pg.log 2>&1; s=$?; grep -E "^AssertionError|Effective Programme" /tmp/pg.log | cut -c1-200; [ $s = 1 ] && [ "$(grep -c "^AssertionError \\[ERR_ASSERTION\\]: " /tmp/pg.log)" = 1 ] && grep -q "^AssertionError \\[ERR_ASSERTION\\]: Secondary wheel preserves complete approved choice outcome: soccerCareerLife.ts/218 choice 0 seed 15" /tmp/pg.log && grep -q "Effective Programme reward source control: overwrite" /tmp/pg.log && echo FIRED-OK');
a.push("# NOT a gate line: scripts/qa/compareSoccerCareerColdReplay.mjs is a pinned qualification of Round 1360s parent (roles them and guarded at live matchdays 18 and 28, six and eleven journeys); on this tree its original arm fails us and return instead (rBFg-p1, p2), see finish-BFG.md"); if (0) a.push(`coldReplay: ${ENV} CAREER_COLD_REPLAY_OUT="$PWD/coldrep" ${P} node scripts/qa/compareSoccerCareerColdReplay.mjs`);
a.push(`documentaryBinding: export ${ENV} CAREER_DOCUMENTARY_OUT="$PWD/docbind" CAREER_DOCUMENTARY_PHASE=fixed; ${P} node scripts/qa/qualifySoccerCareerDocumentaryBinding.mjs`);
fs.writeFileSync((process.argv[2] || '.tmp-fx/bfg') + '/rc-BFa.txt', a.join('\n') + '\n');
const b = ['# Release BF gate, the join\'s served lines (Round BFG): each chain walk on its own normal sim\'s fixtures (the morale, popularity, documentary and saved loan fixtures dealt on Round 1327\'s keyed deck), and the creator\'s lazy editor walk with its workflow\'s fixed-phase comparison against the qualified baseline of run 38336065963. Since Round BFH the core refs are built by .rc/x/coreBE.sh: send x/prepInstalled.mjs, x/lazyCheck.mjs and x/coreBE.sh with this file.',
  '#!serve', '#!playwright', '#!serial', 'headsha: git log --oneline -2'];
for (const [sim, , , out, phase, walk] of SIMS) {
  if (!walk) continue;
  const dir = `$PWD/w-${walk}`;
  b.push(`${walk}: set -o pipefail; export ${ENV} ${out}="${dir}" ${phase}=fixed FREE_KICK_FONT_CACHE="${dir}/font-cache"; node scripts/qa/freeKickLab1070.mjs --prefetch-fonts-only | tail -1 && node .rc/x/prepInstalled.mjs "${dir}"${["playSoccerCareerDocumentaryReview", "playSoccerCareerSavedLoan"].includes(walk) ? ` && node .rc/x/prepInstalled.mjs "${dir}/prior-popularity"` : ""} && ${P} node scripts/${sim}.mjs | tail -1 && ${P} node scripts/${walk}.mjs`);
}
b.push(`playSoccerCareerBuildLazy: export CI=1 SIM_NETWORK=offline SOCCER_ROUTINE_OUT="$PWD/sclz" SOCCER_BUILD_PHASE=fixed FREE_KICK_FONT_CACHE="$PWD/sclz/font-cache"; node scripts/qa/freeKickLab1070.mjs --prefetch-fonts-only | tail -1 && node .rc/x/prepInstalled.mjs "$PWD/sclz" && { ${P} node scripts/playSoccerCareerBuildLazy.mjs > /tmp/lz.log 2>&1; s=$?; tail -3 /tmp/lz.log | cut -c1-240; mkdir -p /tmp/lzb && gh run download 38336065963 -n soccer-routine-38336065963 -D /tmp/lzb && B=$(find /tmp/lzb -path '*build-lazy/baseline/report.json' | head -1) && BUILD_METHOD_EXIT=$s SOCCER_BUILD_BASELINE_REPORT="$B" node .rc/x/lazyCheck.mjs; }`);
fs.writeFileSync((process.argv[2] || '.tmp-fx/bfg') + '/rc-BFb.txt', b.join('\n') + '\n');
console.log('mkBF: rc-BFa ' + a.length + ' lines, rc-BFb ' + b.length + ' lines');
