/**
 * Release BF (Round BFH): the Soccer Career life chain (Rounds 1350 to 1363) as an attribution, for the harnesses that
 * hold this tree's seeded careers to an older original or to a recorded fixture.
 *
 * The chain adds Life cards to the catalog and to the priority beats and keeps some choices open over a reload, so a
 * seeded career is dealt a different card at some step and parts from every recording made before it. Its three
 * changed engine inputs, soccerCareerLife.ts, soccerCareerContracts.ts and soccerCareerRealismA.ts, are read as at
 * Release BE's head 4ae7a534 in the bundles that are compared with an older original, the pattern simCareerStoryRole
 * has used since 43499cd5 (CAREER_STORY_ROLE_CHAIN_REF). The current bundle keeps the chain, and the chain's own
 * harnesses prove what it changes. The join measured the cause first (remote check rBFg-a1): with exactly these three
 * files at 4ae7a534 the whole tree replays every recording simCareerLeagueFinish, simCareerSocialBrands and
 * simCareerAwardsNight hold.
 *
 * Each harness names its own environment variable for the ref. Unset is 4ae7a534; an empty value reads this tree, the
 * unattributed arm, which is red on this head by design and is how the attribution is shown to be the only change.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export const LIFE_CHAIN_BASE = '4ae7a534';
export const LIFE_CHAIN_FILES = ['src/lib/soccerCareerLife.ts', 'src/lib/soccerCareerContracts.ts', 'src/lib/soccerCareerRealismA.ts'];

/** The ref a harness's variable asks for: unset is Release BE's head, an empty value is no attribution. */
export function lifeChainRef(envName) {
  const value = process.env[envName];
  return value === undefined ? LIFE_CHAIN_BASE : value.trim();
}

/**
 * The attribution for one bundle of the tree at `root`, read at `ref` (no attribution when ref is empty).
 *   text(rel)          a chain file at the ref, LF line endings
 *   swap(rel, source)  the ref text for a chain file, the source unchanged for any other file
 *   fs                 node:fs whose readFileSync answers a chain file with the ref text (for the inverse plugins
 *                      that take an fs module, so the inverse runs on the ref text)
 *   plugin             an esbuild loader for the chain files nothing earlier in the plugin list loaded
 *   served             every chain file handed out at the ref, in order (the receipt)
 *   problem()          '' when every chain file was handed out at the ref at least once, or when there is no ref
 */
export function lifeChain(root, ref) {
  const served = [];
  const cache = new Map();
  const norm = p => path.resolve(String(p)).split(path.sep).join('/').toLowerCase();
  const targets = new Map(LIFE_CHAIN_FILES.map(rel => [norm(path.join(root, rel)), rel]));
  const relOf = p => (ref && typeof p === 'string' ? targets.get(norm(p)) : undefined);
  const text = rel => {
    if (!cache.has(rel)) {
      cache.set(rel, execFileSync('git', ['show', `${ref}:${rel}`], { cwd: root, encoding: 'utf8', maxBuffer: 16e6 }).split('\r\n').join('\n'));
    }
    return cache.get(rel);
  };
  const swap = (rel, source) => {
    if (!ref || !LIFE_CHAIN_FILES.includes(rel)) return source;
    served.push(rel);
    return text(rel);
  };
  const readFileSync = (p, ...rest) => {
    const rel = relOf(p);
    if (!rel) return fs.readFileSync(p, ...rest);
    served.push(rel);
    const encoding = typeof rest[0] === 'string' ? rest[0] : rest[0]?.encoding;
    return encoding ? text(rel) : Buffer.from(text(rel), 'utf8');
  };
  const chainFs = Object.assign(Object.create(fs), { readFileSync });
  const plugin = { name: 'life-chain-at-release-be', setup(b) {
    b.onLoad({ filter: /soccerCareer(Life|Contracts|RealismA)\.ts$/ }, args => {
      const rel = relOf(args.path);
      if (!rel) return undefined;
      served.push(rel);
      return { contents: text(rel), loader: 'ts' };
    });
  } };
  const problem = () => {
    if (!ref) return '';
    const missing = LIFE_CHAIN_FILES.filter(rel => !served.includes(rel));
    return missing.length ? `the life chain attribution never served ${missing.join(', ')} at ${ref}` : '';
  };
  return { ref, text, swap, fs: chainFs, plugin, served, problem };
}
