/* An atomic file write, because a failed one must not delete the old file.

   Round 420. Hit for real while building Round 419: the prerenderer failed to
   write public/nfl-higher-lower/index.html with a Windows UNKNOWN error and
   left the snapshot DELETED, because a plain writeFileSync truncates its
   target before it writes a byte. The build did exit 1, so nothing shipped,
   but that is luck about WHEN the write failed rather than a property of the
   write. Every snapshot is the only document a crawler ever sees for its
   route, and the failure mode of losing one has to be "the page is stale",
   never "the page is gone".

   The fix is the standard one. Write the bytes to a temp file beside the
   target, then rename over it. A rename within one directory is atomic on
   every filesystem this project runs on, including NTFS, so a reader sees
   either the whole old file or the whole new one and never a truncated
   half. If the write throws, the target was never touched; if it throws the
   temp is removed so a failed run cannot leave litter in public/ for
   somebody to commit by accident.

   It is a separate module ON PURPOSE. The guarantee is worth a test, and a
   test that has to drive a headless browser over 145 routes to reach the
   write is a test nobody runs. simPrerender exercises this directly against
   a scratch directory in a few milliseconds, including the failure paths.

   THE RENAME NEEDS A RETRY, and this was measured rather than assumed.
   Renaming over an existing file on Windows fails with EPERM if anything
   holds a handle on the target for the instant the rename happens, which on
   a normal desktop means a virus scanner, the search indexer or a sync
   client opening the file that was just written. Measured here over 1000
   writes: 8 failed with no retry, and one immediate retry barely helped
   (still 14 of 1000, because the holder has not let go yet). Five attempts
   with a short backoff failed 0 of 1000, and 993 of them still succeeded on
   the first try, so the retry costs nothing when nothing is holding the
   file. Without it this module would fail roughly one route per prerender
   run and would have traded a rare destructive bug for a frequent build
   breaking one.

   WHAT THE RETRY DOES NOT FIX, stated plainly because it is a real
   behavioural difference from the write this replaced. If a reader holds
   the target open for longer than the backoff, the rename fails and this
   throws, where a plain writeFileSync would have succeeded: measured at 20
   failures out of 20 with a handle held open across the whole window. That
   is the intended trade. A build that stops with the old page intact is
   recoverable; a snapshot silently deleted on a live route is not. There is
   deliberately NO fallback to a truncating write, because that is precisely
   the bug this module exists to remove.
*/
import fs from 'node:fs';
import path from 'node:path';

/* Attempts and backoff come from the measurement above, not from taste.
   Five attempts wait 1, 2, 4 and 8 ms between them, so a route that is being
   held costs 15ms once and a permanent holder fails fast rather than
   spinning. */
export const RENAME_ATTEMPTS = 5;

/* Only codes a transient holder actually produces. Anything else (a missing
   directory, a bad path) will never come good, so retrying it just delays an
   honest error. */
const TRANSIENT = new Set(['EPERM', 'EACCES', 'EBUSY']);

/* A real sleep, not a spin. Every caller of this module is synchronous, so
   there is no await to reach for, and burning 15ms of CPU per contended
   route would be a silly way to pay for this. */
function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/* Distinguishes temp files within one process without a clock or a random,
   both of which can repeat inside a millisecond. The pid separates
   processes. */
let counter = 0;

/**
 * Write `contents` to `file`, atomically.
 * Returns the path written. Throws whatever the underlying write throws,
 * having left the previous file (if any) exactly as it was.
 */
/* `io` is a seam, not a setting. Every caller uses the real fs; simPrerender
   passes stubs whose write throws, and whose rename throws transiently, or
   permanently, or with a genuine error, because the whole point of this
   module is what happens when those fail and there is no portable way to make
   a real one fail on demand. */
export function writeFileAtomic(file, contents, io = fs) {
  const dir = path.dirname(file);
  io.mkdirSync(dir, { recursive: true });
  /* the temp lives beside the target so the rename stays inside one
     filesystem, which is what makes it atomic; a temp in the OS temp dir
     would turn this into a copy and reintroduce the partial write */
  counter += 1;
  const tmp = path.join(dir, `.${path.basename(file)}.${process.pid}.${counter}.tmp`);
  try {
    io.writeFileSync(tmp, contents);
    for (let attempt = 0; ; attempt += 1) {
      try {
        io.renameSync(tmp, file);
        return file;
      } catch (err) {
        const last = attempt >= RENAME_ATTEMPTS - 1;
        if (last || !TRANSIENT.has(err.code)) throw err;
        /* 1, 2, 4, 8 ms. The holder needs a moment to let go: the
           measurement showed a back to back retry still failing. */
        sleepSync(2 ** attempt);
      }
    }
  } catch (err) {
    /* Cleanup goes through the REAL fs, not the seam, and that is deliberate:
       the temp being removed is a real file on a real disk, so a stub that
       pretended to remove it would leave litter in public/ for somebody to
       commit. The consequence for anyone writing a stub is that its
       writeFileSync must really write, which every stub in simPrerender does;
       one that only pretended would leave no temp, and the litter check would
       then pass without having been tested. */
    try { if (fs.existsSync(tmp)) fs.rmSync(tmp, { force: true }); } catch { /* the throw below matters more */ }
    throw err;
  }
}
