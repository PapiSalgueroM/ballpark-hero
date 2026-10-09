/* Release AQ: the Soccer Career train (Rounds 1169 to 1178) taken out of a
   bundle, in memory, for the checks that hold a career to what it was before.

   The train changes a career in every era on purpose: red card bans are
   served (1176), a deal after 30 follows form (1177), a listed player's move
   completes itself (1178), the award field turns over (1172, 1174) and from
   2026-27 clubs change division (1175). So a check that says "nothing moved
   against main" or "the recorded careers replay byte for byte" goes red on
   the train, and red for a reason that is not a defect.

   The other lane wrote, with each round, the exact lines that put the old
   behaviour back, for scripts/simCareerAwardsNight.mjs section 1, which
   replays its pre train fixture through them. This file is those four lists
   as one, so every other baseline check can ask the same question the same
   way: WITH THE TRAIN TAKEN OUT, IS THE OLD BASELINE STILL REPRODUCED? Yes
   means the move is the train's and nothing else's; no means something else
   moved and the check fails as it always did.

   Fails closed: a patch whose file is loaded and whose anchor is not in it
   exactly as written throws. A patch for a file the bundle never loads (the
   page, in an engine only bundle) is simply not needed there, and `seen`
   says which files were. Nothing on disk is ever written. */
import { awardsNight1172Attribution } from './careerAwardsNight1172.mjs';
import { careerLeagueWorld1175Attribution } from './careerLeagueWorld1175.mjs';
import { careerDiscipline1176Attribution } from './careerDiscipline1176.mjs';
import { SOCCER_CONTRACT_1177_BASELINE_PATCHES } from './soccerContractBaseline1177.mjs';

export const SOCCER_TRAIN_PATCHES = [
  ...awardsNight1172Attribution,
  ...careerLeagueWorld1175Attribution,
  ...careerDiscipline1176Attribution,
  ...SOCCER_CONTRACT_1177_BASELINE_PATCHES,
];
export const SOCCER_TRAIN_FILES = [...new Set(SOCCER_TRAIN_PATCHES.map(p => p.file))];

/** A rewriter for one bundle: rewrite(rel, src) gives the source with the
 *  train out (rel is the repo relative path, forward slashes), and
 *  seen() the files it rewrote. Line endings are read as LF. */
export function soccerTrainOut() {
  const done = new Set();
  const rewrite = (rel, src) => {
    const mine = SOCCER_TRAIN_PATCHES.filter(p => p.file === rel);
    if (mine.length === 0) return src;
    let text = src.split('\r\n').join('\n');
    for (const p of mine) {
      if (!text.includes(p.from)) throw new Error(`train out refused: ${rel} does not contain ${JSON.stringify(p.from.slice(0, 80))}`);
      text = text.replace(p.from, () => p.to);
      if (text.includes(p.from) && p.from !== p.to && !p.to.includes(p.from)) throw new Error(`train out refused: ${rel} contains ${JSON.stringify(p.from.slice(0, 80))} more than once`);
    }
    done.add(rel);
    return text;
  };
  return { rewrite, seen: () => [...done].sort() };
}

/** The same as an esbuild plugin, for a bundle of the tree at `root`. */
export function soccerTrainOutPlugin(root, pathMod, fsMod) {
  const out = soccerTrainOut();
  const base = pathMod.resolve(root).split(pathMod.sep).join('/').toLowerCase();
  return {
    seen: out.seen,
    plugin: { name: 'soccer-train-out', setup(b) {
      b.onLoad({ filter: /\.(ts|tsx)$/ }, args => {
        const full = pathMod.resolve(args.path).split(pathMod.sep).join('/');
        if (!full.toLowerCase().startsWith(`${base}/`)) return undefined;
        const rel = full.slice(base.length + 1);
        if (!SOCCER_TRAIN_FILES.includes(rel)) return undefined;
        return { contents: out.rewrite(rel, fsMod.readFileSync(args.path, 'utf8')), loader: rel.endsWith('.tsx') ? 'tsx' : 'ts' };
      });
    } },
  };
}

/** What the train writes on a save that no patch takes back, because it
 *  draws nothing and changes nothing else: Round 1173's kept continental
 *  run on a season row, and the season and club it stamps on the last run
 *  (scripts/lib/careerAwardsNightProbe.mjs drops the same three). A JSON
 *  replacer for both sides of a compare. */
export function withoutTrainFields(key, value) {
  if (key === 'clubCupRun') return undefined;
  if (key === 'lastUCLResult' && value && typeof value === 'object') {
    const { seasonYear: _year, club: _club, ...rest } = value;
    return rest;
  }
  return value;
}
