/* Release AW: the fifth inverse of the Soccer Career history harnesses.
 *
 * Eight gate harnesses hold whole Soccer careers to an older engine: simCareerAwardsNight, simCareerSocialBrands
 * and simCareerLeagueFinish replay a recording, and simSoccerCareerDevelopment, simCareerStoryRole,
 * simCareerTrophyRuns, simSoccerSeasonHistory and simSoccerDerbyHistory compare the engine with the tree their
 * round was cut from. They already take four earlier changes out of a COPY of the source: Release AQ's train
 * (soccerTrain1178.mjs), Rounds 1185 and 1187 (careerDevelopmentAttribution1185.mjs), Rounds 1190 and 1191
 * (careerStoryRoleAttribution1190.mjs) and Rounds 1197 to 1208 (careerNextTenAttribution1197.mjs).
 *
 * Release AW merges two rounds of the other lane that change what a career of 30 or more is paid, on purpose:
 *   offers   Rounds 1262 to 1264 (PR230): a new club's wage, and a homecoming wage, follow the age and form
 *            quote from 30. One function, soccerTransferTerms, behind one condition.
 * Neither function draws: makeOffer still evaluates rand(1, 5) as an argument at the place it always did, so
 * with the condition out the old terms and the old draws come back and nothing else moves. With exactly that
 * taken out of a COPY of src/lib/soccerCareerContracts.ts, and nothing else touched, the eight replay as they
 * did on the release line before the merge. So this is an attribution, not a new recording: the recordings and
 * the base pins stay as they were taken.
 *
 * Like the inverses beside it, this only ever rewrites a COPY of a file that a historical bundle loads. It
 * refuses to run unless the line it takes out is there exactly once, so it cannot go quietly idle when the
 * source moves under it. Line endings are read as LF by every caller.
 */
import assert from 'node:assert/strict';

export const VETERAN_PAY_FILE = 'src/lib/soccerCareerContracts.ts';

const EDITS = {
  offers: {
    file: VETERAN_PAY_FILE,
    from: '  if (career.age < 30) return { wage: offeredWage, contractYears: offeredYears };',
    to: '  return { wage: offeredWage, contractYears: offeredYears };',
  },
};
export const VETERAN_PAY_ADDITIONS = Object.keys(EDITS);

/** The same edits as patch rows ({ id, addition, file, from, to }), for a harness that patches a copy itself. */
export function veteranPayPatches(which = VETERAN_PAY_ADDITIONS) {
  return which.map(name => {
    const row = EDITS[name];
    assert.ok(row, `Unknown veteran pay addition: ${name}`);
    return { id: `veteran-pay-${name}`, addition: name, file: row.file, from: row.from, to: row.to };
  });
}

/**
 * One bundled file with Release AW's veteran pay taken out. `relative` is the file's path from the repo root;
 * any other file comes back as it was. `receipt` gains one row per edit made, for the harness's proof.
 */
export function inverseVeteranPay(relative, source, receipt = [], which = VETERAN_PAY_ADDITIONS) {
  if (relative !== VETERAN_PAY_FILE) return source;
  /* The copy is read as LF whatever the checkout stores, so an anchor of two lines matches on every machine. */
  let out = source.split('\r\n').join('\n');
  for (const name of which) {
    const edit = EDITS[name];
    assert.ok(edit, `Unknown veteran pay addition: ${name}`);
    if (relative !== edit.file) continue;
    assert.equal(out.split(edit.from).length, 2, `The ${name} condition of Release AW's veteran pay must be in ${edit.file} exactly once`);
    out = out.replace(edit.from, () => edit.to);
    receipt.push({ addition: name, file: edit.file });
  }
  return out;
}

/** The same as an esbuild plugin, for a bundle of the tree at `root` that loads the real contracts file. */
export function veteranPayOutPlugin(root, pathMod, fsMod, receipt = [], which = VETERAN_PAY_ADDITIONS) {
  const target = pathMod.resolve(root, VETERAN_PAY_FILE).split(pathMod.sep).join('/').toLowerCase();
  return { name: 'veteran-pay-out', setup(b) {
    b.onLoad({ filter: /soccerCareerContracts\.ts$/ }, args => {
      if (pathMod.resolve(args.path).split(pathMod.sep).join('/').toLowerCase() !== target) return undefined;
      return { contents: inverseVeteranPay(VETERAN_PAY_FILE, fsMod.readFileSync(args.path, 'utf8').split('\r\n').join('\n'), receipt, which), loader: 'ts' };
    });
  } };
}
