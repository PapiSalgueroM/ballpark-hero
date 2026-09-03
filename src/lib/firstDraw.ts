/**
 * Round 421: a random pick used to seed React state must be drawn ONCE PER
 * MOUNT, not once per render attempt.
 *
 * THE BUG THIS EXISTS FOR, measured rather than reasoned about. React does not
 * promise a useState initialiser runs only once: it may begin a render, throw
 * the work away and start again. So
 *
 *     const [board] = useState(getRandomConnect4Board)   // WRONG
 *
 * draws again on the retry. To a player that is invisible, they get a random
 * board either way. It broke the SNAPSHOTS. scripts/prerender.mjs replaces
 * Math.random with a fixed seed generator before any page code runs (Round 284)
 * so that a random pick freezes identically in every build, and that only holds
 * if the draws happen in the same ORDER every time. Measured on /nhl-connect-4
 * by wrapping the seeded generator with a counter and a stack: 8 draws when the
 * initialiser fired once and 9 when it fired twice, draws 0 to 7 byte identical
 * every run, the extra one coming from the initialiser itself, and the board
 * moving with it (0.5178 selects Passports, 0.2038 selects Silverware).
 *
 * Whether it fires twice is a RACE, not the date: the same route at the same
 * clock sample gave 8 draws on one run and 9 on the next. The prerenderer then
 * finds its three clock samples disagreeing, drops the block, and reports it as
 * "changes with the date", which is how this cost a round three wrong theories.
 * The page is rewritten and re-dated in scripts/data/lastmod.json and the
 * sitemap for no real change, and lastmod is the only re-crawl lever this site
 * has.
 *
 * HOW TO USE IT.
 *
 *     const firstBoard = makeFirstDraw(getRandomConnect4Board);
 *     ...
 *     const [board, setBoard] = useState(firstBoard.get);
 *     useEffect(firstBoard.release, []);
 *
 * `release` is the EFFECT ITSELF, not a cleanup returned from it, so it runs
 * immediately after the commit that used the pick. That is deliberate and it is
 * the tightest possible window: the memo exists only from the first render
 * attempt to the commit that survives, which is exactly the window the race
 * lives in, and it is empty every other moment. A discarded render never
 * commits, so nothing releases between the attempt and the retry, which is why
 * the retry sees the same pick.
 *
 * Holding it for the life of the MOUNT instead, by returning release as a
 * cleanup, would work for the race and would be worse: two components using one
 * hook at the same time would then share a pick that is meant to be
 * independent. Releasing at commit means the second one draws its own.
 *
 * WHY A `filled` FLAG AND NOT A NULL CHECK. These draws are not all objects.
 * GuessTheGolfer seeds an INDEX and useWorldCup seeds a SEED, and a legitimate
 * draw of 0 is falsy, so `if (!held) held = draw()` would redraw every render
 * for exactly the value it most needs to hold still.
 *
 * WHAT IT IS NOT. It is not a cache across mounts and must not become one.
 * scripts/playRenderStability.mjs is the guard that notices if any of this
 * stops being true, and it knows nothing about which games are random.
 */
export interface FirstDraw<T> {
  /** drawn on the first call, then held until release; pass to useState */
  get: () => T;
  /** drop the held pick; pass as the EFFECT so it fires just after commit */
  release: () => void;
}

export function makeFirstDraw<T>(draw: () => T): FirstDraw<T> {
  let held: T;
  let filled = false;
  return {
    get: () => {
      if (!filled) {
        held = draw();
        filled = true;
      }
      return held;
    },
    release: () => {
      filled = false;
    },
  };
}
