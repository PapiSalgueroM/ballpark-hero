/* A per run folder for a harness's negative control copies, and the line a
   copy prints when it loads.

   Round 674, the fence lens review (R2.D10). simGmReload and simCfbDynasty
   wrote their control copies to a fixed ROOT/dist/.gm-control (the same
   <Board>.control.tsx name for every control) and deleted ROOT/dist
   wholesale when it had not existed at the start. Run four at a time, one
   control rendered another's copies and reported "fired on 0 of 4 boards",
   and two died on "Failed to resolve import" because a sibling run had just
   deleted the folder under them. A per run TEMP does not help: the folder
   was in the tree, not in TEMP.

   Why in the tree and not in the temp folder: a copy of a page or a hook
   imports react and the rest by bare name, and vite resolves a bare import
   by walking up from the importing file to a node_modules. A copy under the
   system temp folder has none above it and fails to load. So the folder is
   ROOT/.sim-control (gitignored since Round 435, and no build writes or
   empties it), one mkdtemp per run inside it. Cleanup removes that run's
   folder and nothing else, so it can never take another run's copies with
   it, and nothing here ever touches dist.

   Round 674 fix (the review's controlScratch finding): cleanup used to
   remove .sim-control too when it was empty. A sibling run doing that
   between another run's mkdirSync(base) and its mkdtempSync made the second
   run throw ENOENT, which is exactly the concurrent case this file exists
   for. The shared folder now stays (it is gitignored and empty between
   runs), and the mkdtemp is retried once after making the folder again in
   case anything else removed it. checkPerRun holds that too: in a sandbox
   root of its own, .sim-control must still be there once both of its runs
   are cleaned up (measured: the old cleanup fails it, this one passes).

   Round 674 fix (the review's M9): a harness that says its controls run in
   parallel on per run folders has to be able to tell a per run folder from
   a fixed one. checkPerRun asks the factory for two folders under one name
   at once and requires two different folders, both inside .sim-control,
   neither of them the bare name, and the first one's cleanup leaving the
   second in place. A controlScratch put back to a fixed .sim-control/<name>
   fails it, and simGmReload's and simCfbDynasty's parallel controls prove
   that on a copy of this file before they trust it.

   The load line: a harness appends it to every copy and requires it in the
   runner's output, with this run's folder name in it, so a red can be pinned
   on this run's copy and not on the real module or a sibling run's copy. */
import fs from 'node:fs';
import path from 'node:path';

export function controlScratch(root, name) {
  const base = path.join(root, '.sim-control');
  fs.mkdirSync(base, { recursive: true });
  let dir;
  try {
    dir = fs.mkdtempSync(path.join(base, `${name}-`));
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
    fs.mkdirSync(base, { recursive: true });
    dir = fs.mkdtempSync(path.join(base, `${name}-`));
  }
  const tag = path.basename(dir);
  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    fs.rmSync(dir, { recursive: true, force: true });
  };
  return { dir, tag, cleanup };
}

/* What a factory shaped like controlScratch gets wrong about per run
   folders, as a list of problems (empty when it is right). */
export function checkPerRun(factory, root, name = 'per-run-check') {
  const problems = [];
  /* A root of its own, so its .sim-control holds nothing but these two runs
     and "cleanup left the shared folder in place" is decided by this check
     alone, not by whatever sibling runs happen to have in the real one. */
  fs.mkdirSync(path.join(root, '.sim-control'), { recursive: true });
  const sandbox = fs.mkdtempSync(path.join(root, '.sim-control', 'per-run-check-'));
  const base = path.resolve(sandbox, '.sim-control');
  try {
    const a = factory(sandbox, name);
    const b = factory(sandbox, name);
    try {
      if (path.resolve(a.dir) === path.resolve(b.dir)) problems.push(`two runs under "${name}" were handed the same folder, ${a.dir}`);
      if (a.tag === b.tag) problems.push(`two runs under "${name}" carry the same tag, ${a.tag}, so a load line cannot tell their copies apart`);
      for (const s of [a, b]) {
        if (path.dirname(path.resolve(s.dir)) !== base) problems.push(`${s.dir} is not a folder of its own directly inside ${base}`);
        if (s.tag === name) problems.push(`the folder is the bare name "${name}", a fixed folder every run shares`);
        if (!fs.existsSync(s.dir)) problems.push(`${s.dir} was not created`);
      }
      a.cleanup();
      if (!fs.existsSync(b.dir)) problems.push('cleaning up one run removed the other run\'s folder');
    } finally {
      a.cleanup();
      b.cleanup();
    }
    /* The rmdir race: a cleanup that removes .sim-control once it is empty
       can take it from under a sibling between its mkdirSync and its
       mkdtempSync. With both runs gone the folder must still be there. */
    if (!fs.existsSync(base)) problems.push('cleaning up the last run removed .sim-control itself, which a sibling run creating its folder at that moment needs');
  } finally {
    fs.rmSync(sandbox, { recursive: true, force: true });
  }
  return problems;
}

/* The review's M9 as a copy of this file: controlScratch back to one fixed
   folder per name, no mkdtemp. Written into `dir` and returned, so a
   parallel control can prove checkPerRun sees it before trusting a green.
   Refuses unless the anchor is in this file's code exactly once. */
export const FIXED_SCRATCH_ANCHOR = 'dir = fs.mkdtempSync(path.join(base, `${name}-`));\n  } catch (e) {';
export function writeFixedScratchCopy(dir, stripComments) {
  const file = new URL(import.meta.url);
  const src = fs.readFileSync(file, 'utf8').split('\r\n').join('\n');
  const count = (hay, needle) => hay.split(needle).length - 1;
  if (count(src, FIXED_SCRATCH_ANCHOR) !== 1 || count(stripComments(src), FIXED_SCRATCH_ANCHOR) !== 1) {
    throw new Error('the fixed folder copy cannot be written: controlScratch.mjs does not hold its mkdtemp anchor exactly once in its code');
  }
  const copy = src.replace(FIXED_SCRATCH_ANCHOR, 'dir = path.join(base, name); fs.mkdirSync(dir, { recursive: true });\n  } catch (e) {');
  if (copy === src) throw new Error('the fixed folder copy cannot be written: the rewrite changed nothing');
  fs.mkdirSync(dir, { recursive: true });
  const out = path.join(dir, 'controlScratch.fixed.control.mjs');
  fs.writeFileSync(out, copy);
  return out;
}

export const loadedLine = (tag, what) => `DUKB_CONTROL_COPY_LOADED ${tag} ${what}`;

/* The copy's text with its load line appended as a top level statement. */
export const withLoadedLine = (src, tag, what) => `${src}\nconsole.log(${JSON.stringify(loadedLine(tag, what))});\n`;
