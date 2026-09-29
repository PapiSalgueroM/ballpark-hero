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
   folder and then .sim-control only if it is empty, so it can never take
   another run's copies with it, and nothing here ever touches dist.

   The load line: a harness appends it to every copy and requires it in the
   runner's output, with this run's folder name in it, so a red can be pinned
   on this run's copy and not on the real module or a sibling run's copy. */
import fs from 'node:fs';
import path from 'node:path';

export function controlScratch(root, name) {
  const base = path.join(root, '.sim-control');
  fs.mkdirSync(base, { recursive: true });
  const dir = fs.mkdtempSync(path.join(base, `${name}-`));
  const tag = path.basename(dir);
  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    fs.rmSync(dir, { recursive: true, force: true });
    try { fs.rmdirSync(base); } catch { /* another run's folder is still in it */ }
  };
  return { dir, tag, cleanup };
}

export const loadedLine = (tag, what) => `DUKB_CONTROL_COPY_LOADED ${tag} ${what}`;

/* The copy's text with its load line appended as a top level statement. */
export const withLoadedLine = (src, tag, what) => `${src}\nconsole.log(${JSON.stringify(loadedLine(tag, what))});\n`;
