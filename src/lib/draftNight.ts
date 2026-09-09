/**
 * Round 515: draft night, as picks that land one at a time.
 *
 * His 2026-08-28 list, twice over: "More animation across every sim: reveals,
 * draft nights, celebrations. Reading text is not a game feel." And, separately,
 * "Draft nights and college signing days as one by one reveal animations, the
 * 2K way."
 *
 * What the four front offices did before this: you tapped a prospect, six or so
 * rival picks resolved inside the same synchronous handler, and the board simply
 * got shorter. Every one of those picks is a real decision the engine made and
 * the player never saw one of them happen.
 *
 * THIS FILE DECIDES NOTHING ABOUT THE DRAFT. The engine has already chosen who
 * went where by the time anything here runs; this turns that finished sequence
 * into an ordered list of reveal steps and says when each should land. That
 * split is the same one Round 186 used for the season curtain (usCareerReveal
 * decides, SeasonRevealCard presents) and it is what lets a harness check the
 * reveal without rendering anything.
 *
 * THREE RULES IT IS WRITTEN TO.
 *
 * 1. NO PICK IS INVENTED AND NONE IS LOST. Every step comes from an array the
 *    engine already built. The harness holds that the steps are a permutation of
 *    the picks that actually happened, because a reveal that shows a player
 *    joining a club he did not join is a fabricated fact on a screen, which is
 *    worse than no animation at all.
 * 2. IT MUST NOT BLOCK. The card sits above a board that stays usable, and the
 *    whole run is bounded, because a modal that holds the game for six seconds
 *    is not drama, it is a loading screen. playGames walks these boards and a
 *    blocking reveal would read as a dead screen.
 * 3. ANIMATE EMPHASIS, NEVER A NUMBER THROUGH FALSE VALUES. Round 147's rule.
 *    A grade is the true scouted grade from the frame it appears; what animates
 *    is the row arriving, never the figure counting up through numbers that were
 *    never true.
 */

/** One pick, as the reveal will show it. */
export interface DraftPickStep {
  /** 1-based position in this run of picks, which is the order they land in. */
  overall: number;
  /** The club's short code, as the engine stores it. */
  team: string;
  playerName: string;
  pos: string;
  /** The SCOUTED grade, which is what the board showed. Never the true rating:
      the whole point of the front office draft is that scouting carries error,
      and printing the truth here would give the game away on pick night. */
  grade: number;
  /** True for the one pick the player made. */
  mine: boolean;
}

export interface DraftNight {
  picks: DraftPickStep[];
  /** How long the whole run takes, so a caller can clear it without guessing. */
  totalMs: number;
}

/**
 * The gap between picks landing.
 *
 * 400 rather than the 520 this was first written at, because 520 put a full
 * nine pick run at 4,860ms against the harness's own 5,000ms ceiling: three
 * percent of headroom, which is a threshold sitting inside its own noise and
 * exactly the shape Round 284 calls a coin toss dressed as a rule. At 400 the
 * capped run is 3,780ms and the realistic seven pick NFL run is 2,840ms, so the
 * ceiling has room it can survive somebody nudging this by a frame.
 */
export const PICK_STEP_MS = 400;
/** The first pick waits this long, so the card is on screen before it moves. */
export const PICK_LEAD_MS = 180;
/**
 * The most picks a single run will reveal. The engine hands out six or so rival
 * picks per selection; the cap is here so a future change that hands over forty
 * cannot turn draft night into a wait. Anything past the cap is still applied by
 * the engine, it just is not narrated.
 */
export const MAX_REVEALED = 9;

/** When pick `i` (0-based) lands. Strictly increasing, by construction. */
export function pickDelayMs(i: number): number {
  return PICK_LEAD_MS + Math.max(0, i) * PICK_STEP_MS;
}

interface RawPick {
  team: string;
  playerName: string;
  pos: string;
  grade: number;
}

/**
 * Turn the engine's finished pick sequence into reveal steps.
 *
 * `mine` is the pick the player made and always lands first, because that is
 * the order it happened in: the handler applies your selection and then lets the
 * rivals take the board behind you.
 *
 * Returns an empty run rather than throwing on anything malformed, so a board
 * that hands this a surprise shows no card instead of crashing the draft.
 */
export function buildDraftNight(mine: RawPick | null, rivals: RawPick[]): DraftNight {
  const clean = (p: RawPick | null | undefined): RawPick | null => {
    if (!p || typeof p !== 'object') return null;
    const name = typeof p.playerName === 'string' ? p.playerName.trim() : '';
    const team = typeof p.team === 'string' ? p.team.trim() : '';
    if (!name || !team) return null;
    const grade = Number.isFinite(p.grade) ? Math.round(p.grade) : 0;
    return { team, playerName: name, pos: typeof p.pos === 'string' ? p.pos : '', grade };
  };

  const steps: DraftPickStep[] = [];
  const first = clean(mine);
  if (first) steps.push({ ...first, overall: 1, mine: true });
  for (const r of Array.isArray(rivals) ? rivals : []) {
    if (steps.length >= MAX_REVEALED) break;
    const c = clean(r);
    if (!c) continue;
    steps.push({ ...c, overall: steps.length + 1, mine: false });
  }
  return {
    picks: steps,
    totalMs: steps.length ? pickDelayMs(steps.length - 1) + PICK_STEP_MS : 0,
  };
}

/** How the card reads the run, so the copy is decided here and not in JSX. */
export function draftNightHeadline(night: DraftNight): string {
  const n = night.picks.length;
  if (n === 0) return '';
  const rivals = n - night.picks.filter(p => p.mine).length;
  if (rivals === 0) return 'Your pick is in.';
  return `Your pick is in, and ${rivals} more went off the board.`;
}
