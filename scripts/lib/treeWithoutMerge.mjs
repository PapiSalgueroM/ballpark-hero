/* Release BC's join: a commit of this tree WITHOUT one piece that a merge brought in, for a harness whose proof is
 * "this piece changes nothing of X" and whose base must therefore be the same tree with only that piece taken out.
 * A fixed base commit goes stale the moment main moves (simCmUnseededWorld's b6eb78e7 predates Round 1311, so on
 * Release BC it read 98 failures that were 1311's and Round 1326's, not Release AZ's).
 *
 *   node scripts/lib/treeWithoutMerge.mjs <piece tip> <before the piece> [ref]
 *
 * <piece tip> is the last commit of the piece on this branch (its merge, or its seam commit after the merge) and
 * <before the piece> is the merge's first parent. The result is a three way merge with <piece tip> as the base,
 * [ref] (default HEAD) as ours and <before the piece> as theirs: [ref] with exactly the piece's own changes taken
 * back. It writes objects only (a temporary index file, git write-tree and git commit-tree), never the working tree
 * or the real index, and prints the new commit's id on stdout.
 * A path that conflicts keeps [ref]'s text, but only when it is not under src/ or is src/pages/WhatsNew.tsx (a
 * harness reads src/ from the base). Any other conflict under src/ means no honest base can be built here: it
 * prints why on stderr and exits 2, so a gate line that uses it fails closed.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const [tip, before, ref = 'HEAD'] = process.argv.slice(2);
const stop = why => { console.error(`treeWithoutMerge: ${why}`); process.exit(2); };
if (!tip || !before) stop('usage: node scripts/lib/treeWithoutMerge.mjs <piece tip> <before the piece> [ref]');
const git = (args, env) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 1 << 26, env: { ...process.env, ...env } });
const sha = r => { try { return git(['rev-parse', '--verify', `${r}^{commit}`]).trim(); } catch { return stop(`${r} is not a commit here`); } };
const [T, B, R] = [sha(tip), sha(before), sha(ref)];

let out;
try { out = git(['merge-tree', '--write-tree', '--name-only', `--merge-base=${T}`, R, B]); }
catch (e) { if (e.status === 1 && e.stdout) out = e.stdout; else stop(`git merge-tree failed: ${String(e.stderr || e.message).split('\n')[0]}`); }
const lines = out.split('\n');
const tree = lines[0].trim();
if (!/^[0-9a-f]{40}$/.test(tree)) stop(`git merge-tree printed no tree: ${lines[0]}`);
const conflicted = [];
for (const line of lines.slice(1)) { if (!line.trim()) break; conflicted.push(line.trim()); }
const unsafe = conflicted.filter(p => p.startsWith('src/') && p !== 'src/pages/WhatsNew.tsx');
if (unsafe.length) stop(`taking the piece out conflicts in ${unsafe.join(', ')}: no honest base`);

let result = tree;
if (conflicted.length) {
  const index = path.join(os.tmpdir(), `treeWithoutMerge-${process.pid}-${Date.now()}.index`);
  const env = { GIT_INDEX_FILE: index };
  try {
    git(['read-tree', tree], env);
    for (const p of conflicted) {
      const entry = git(['ls-tree', R, '--', p]).trim();
      if (!entry) { git(['update-index', '--force-remove', '--', p], env); continue; }
      const [mode, , blob] = entry.split(/\s+/);
      git(['update-index', '--add', '--cacheinfo', `${mode},${blob},${p}`], env);
    }
    result = git(['write-tree'], env).trim();
  } finally { fs.rmSync(index, { force: true }); }
}
const commit = git(['commit-tree', result, '-p', R, '-m', `${R.slice(0, 8)} without ${T.slice(0, 8)} (back to ${B.slice(0, 8)})`],
  { GIT_AUTHOR_NAME: 'treeWithoutMerge', GIT_AUTHOR_EMAIL: 'gate@invalid', GIT_COMMITTER_NAME: 'treeWithoutMerge', GIT_COMMITTER_EMAIL: 'gate@invalid' }).trim();
console.error(`treeWithoutMerge: ${commit}, ${R.slice(0, 8)} without ${T.slice(0, 8)}; conflicts kept from ${R.slice(0, 8)}: ${conflicted.join(', ') || 'none'}`);
console.log(commit);
