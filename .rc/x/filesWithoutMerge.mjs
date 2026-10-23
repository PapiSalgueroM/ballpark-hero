/* Release BQ triage: a commit of [ref] (default HEAD) with ONE merged piece taken back out of the NAMED FILES only,
 * for a harness that reads only those files from its base (simSoccerOwnerTail's base arm reads the engine and the
 * league module, nothing else). scripts/lib/treeWithoutMerge.mjs does the same over the whole tree and refuses on any
 * conflict under src/, which for Round 1524 are two files the harness never reads (searchKeywords.json and
 * CookiePolicy.tsx, main's commits merged into the round's branch); this does it per named file and refuses on any
 * conflict in them (exit 2), so a gate line that uses it fails closed.
 *
 *   node filesWithoutMerge.mjs <piece tip> <before the piece> <ref> <file> [<file> ...]
 *
 * For each file: a three way merge (git merge-file) with <piece tip>'s text as the base, [ref]'s as ours and <before
 * the piece>'s as theirs, i.e. [ref]'s text with exactly the piece's own changes to that file taken back. Writes git
 * objects only (a temporary index file, git write-tree, git commit-tree), never the working tree or the real index,
 * and prints the new commit's id on stdout. */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const [tip, before, ref, ...files] = process.argv.slice(2);
const stop = why => { console.error(`filesWithoutMerge: ${why}`); process.exit(2); };
if (!tip || !before || !ref || files.length === 0) stop('usage: node filesWithoutMerge.mjs <piece tip> <before the piece> <ref> <file>...');
const git = (args, env, input) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 1 << 28, env: { ...process.env, ...env }, input });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fwm-'));
const index = path.join(tmp, 'index');
const env = { GIT_INDEX_FILE: index };
try {
  const refSha = git(['rev-parse', '--verify', `${ref}^{commit}`]).trim();
  git(['read-tree', refSha], env);
  const changed = [];
  for (const file of files) {
    const at = (rev, name) => { const p = path.join(tmp, name); fs.writeFileSync(p, git(['show', `${rev}:${file}`])); return p; };
    const ours = at(refSha, 'ours'), base = at(tip, 'base'), theirs = at(before, 'theirs');
    let merged;
    try { merged = execFileSync('git', ['merge-file', '-p', ours, base, theirs], { encoding: 'utf8', maxBuffer: 1 << 28 }); }
    catch (e) { stop(`taking the piece out of ${file} conflicts (${e.status} conflict(s)): no honest base`); }
    if (merged === fs.readFileSync(ours, 'utf8')) stop(`${file}: the piece changes nothing in it, so naming it proves nothing`);
    const out = path.join(tmp, 'merged');
    fs.writeFileSync(out, merged);
    const blob = git(['hash-object', '-w', '--no-filters', out]).trim();
    git(['update-index', '--add', '--cacheinfo', `100644,${blob},${file}`], env);
    changed.push(file);
  }
  const tree = git(['write-tree'], env).trim();
  const commit = git(['commit-tree', tree, '-p', refSha, '-m', `${refSha.slice(0, 8)} without ${tip.slice(0, 8)} in ${changed.join(', ')}`]).trim();
  console.error(`filesWithoutMerge: ${commit}, ${refSha.slice(0, 8)} without ${tip.slice(0, 8)} in ${changed.join(', ')}`);
  console.log(commit);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
