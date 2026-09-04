/**
 * The driver contract for src/test/dailyReload.test.tsx (run through
 * scripts/simDailyReload.mjs).
 *
 * Round 428. One driver per daily route, one file each at
 * src/test/dailyReload/<route-slug>.driver.tsx, default exporting
 * defineDriver({...}). The test discovers every file matching that glob
 * and runs the same five assertions against each, so a builder adds a row
 * by adding a file and never edits the test.
 *
 * What a driver has to be able to do, in the order the test calls it:
 *   mount            render the REAL page (or hook) with the shared mocks
 *                    from ./mocks and the providers from ./harness, wait
 *                    until it is interactive, hand back a handle
 *   enterDaily       from a fresh mount, get onto today's daily board (click
 *                    the Daily button on a mode menu; a no-op for a page
 *                    that opens on the daily)
 *   finish           play today's daily to its end by the shortest honest
 *                    path (the answer the deterministic pick exposes, give
 *                    up, walk away, a wrong pick, whichever ends it fastest)
 *   status           'finished' when the finished card is on screen,
 *                    'playing' when a live board is; throw for anything
 *                    else (a mode menu, boot, an error state) so a broken
 *                    enterDaily shows up as a clear failure
 *   fingerprint      the outcome as text: the score, the emoji grid, the
 *                    result table, the share text. It must be byte identical
 *                    between the fresh finish and the restored one, so leave
 *                    out only copy the page legitimately changes on a
 *                    restore (a "Today's run is in the books" headline);
 *                    never leave out the numbers
 *   replay           everything a player could do to play the same daily
 *                    again: call the action handlers, click the daily entry
 *                    again, and if a live board appears, play it to the end
 *                    (that is what re-pays the score and what assertion 4
 *                    counts)
 *   hasDailyReplayControl
 *                    true if a Play Again / New puzzle / Reset control is
 *                    offered on the finished daily
 *   unmount          tear the page down (a refresh is unmount then mount)
 *
 * The test owns localStorage and the mocks: it clears both at the start of
 * a row and calls resetMocks() from ./mocks, so a driver registers its
 * fixtures inside mount() every time (setPoolFixture, setTableFixture,
 * setRpcFixture), never at module scope.
 */

export type DailyStatus = 'playing' | 'finished';

export interface DailyReloadDriver<Api = unknown> {
  /** Route slug without the slash, the same string the page hands
   *  useGameCompletion and markRestoredFinish, e.g. 'nba-stat-line'. */
  slug: string;
  /** Everything before the date in the storage key, e.g.
   *  'nba-stat-line-daily-'. Assertion 1 expects exactly one key with this
   *  prefix after a finish, and it must be `${keyPrefix}${getTodayET()}`. */
  keyPrefix: string;
  /** Where the finished daily is restored from storage.
   *  'initializer': inside a useState initializer (or a mount useMemo
   *  feeding initializers). useGameCompletion sees no transition, nothing
   *  else is needed.
   *  'handler': after mount, inside an effect or an action handler. The
   *  route must call markRestoredFinish(slug) immediately before the state
   *  set that makes it finished, or every reload records again. */
  restoreStyle: 'initializer' | 'handler';
  /** Handler rows only, default true: the restore relies on
   *  markRestoredFinish to keep the recorder quiet. Set false for a
   *  handler restore that sets its own already-played flag in the same
   *  batch so the recorder's input never goes true (nba-stat-line). The
   *  silent control expects assertion 4 to go red exactly on rows where
   *  this is true. */
  usesRestoreMark?: boolean;
  /** Required when usesRestoreMark is true: the repo relative file that
   *  restores, e.g. 'src/hooks/useF1Driver.ts'. The wrapper reads it as
   *  code (comments and string contents stripped) and requires a
   *  markRestoredFinish call whose argument is the slug literal, or an
   *  identifier assigned that literal in the same file, ahead of the
   *  finished state set below in the same function. */
  restoreFile?: string;
  /** Required with restoreFile: the code that sets the restored finished
   *  state, as it appears in the file, e.g. "setGameState(saved)" or
   *  "setPhase('done')". */
  finishedSetter?: string;
  /** Default 'v1': the stored JSON must carry v === 1 and date === today,
   *  the src/lib/dailyRecord.ts shape. 'legacy' for a route that predates
   *  the helper and dates only its key (nba-stat-line stores {picks}). */
  payloadShape?: 'v1' | 'legacy';

  mount(): Promise<Api>;
  enterDaily(api: Api): Promise<void>;
  finish(api: Api): Promise<void>;
  status(api: Api): DailyStatus;
  fingerprint(api: Api): string;
  replay(api: Api): Promise<void>;
  hasDailyReplayControl(api: Api): boolean;
  unmount(api: Api): void;
}

/** Identity with inference, so a driver file reads as one typed object. */
export function defineDriver<Api>(driver: DailyReloadDriver<Api>): DailyReloadDriver<Api> {
  return driver;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyDriver = DailyReloadDriver<any>;

/** The fields the test refuses to run without. */
export const DRIVER_FIELDS = [
  'slug', 'keyPrefix', 'restoreStyle', 'mount', 'enterDaily', 'finish',
  'status', 'fingerprint', 'replay', 'hasDailyReplayControl', 'unmount',
] as const;
