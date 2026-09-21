import { ALL_GAMES, CATEGORIES, type CategoryTitle, type GameDef } from './gameRegistry';
import { dailyIndex } from '@/lib/dateUtils';

/**
 * Round 658: the home front.
 *
 * The owner, 2026-09-19: "in the last month I see like no difference on the
 * site from the beginning to now." A month of work went inside the games
 * while the page everybody lands on looked the same. This file holds the
 * words and paths the new front needs and nothing else: every label and
 * description on it still comes from the registry, so a game renamed there
 * is renamed here without anybody remembering to.
 *
 * scripts/simHomeFront.mjs reads this file. It checks the stage lists exactly
 * the four flagships and that each is a real game, that the two save keys are
 * the ones the games really write, and that every category has an ink in both
 * themes and a drawn glyph.
 */

/** One ink per sport, set as --sport-<key> in src/index.css for both themes. */
export type SportKey =
  | 'soccer'
  | 'football'
  | 'college'
  | 'basketball'
  | 'baseball'
  | 'hockey'
  | 'f1'
  | 'tennis'
  | 'golf'
  | 'aussie'
  | 'nascar'
  | 'combat'
  | 'world';

/**
 * A Record over the category union, so a category added to the registry
 * without a sport here does not compile (the Round 268 pattern).
 */
export const CATEGORY_SPORT: Record<CategoryTitle, SportKey> = {
  'Soccer': 'soccer',
  'Pro Football': 'football',
  'College Sports': 'college',
  'Pro Basketball': 'basketball',
  'Baseball': 'baseball',
  'Hockey': 'hockey',
  'Formula 1': 'f1',
  'Tennis': 'tennis',
  'Golf': 'golf',
  'Aussie Rules': 'aussie',
  'NASCAR': 'nascar',
  'Combat Sports': 'combat',
  'World & Olympic Games': 'world',
};

/* Built on first use, never at module scope: an imported value read while
   modules are still loading is how this repo's page crashing import cycle
   got in (CLAUDE.md, writing a harness worth having). */
let sportByPath: Map<string, SportKey> | null = null;

/** The sport a game belongs to, by the category the registry files it under. */
export function sportOf(path: string): SportKey {
  if (!sportByPath) {
    sportByPath = new Map();
    for (const cat of CATEGORIES) {
      for (const g of cat.games) sportByPath.set(g.path, CATEGORY_SPORT[cat.title]);
    }
  }
  return sportByPath.get(path) ?? 'world';
}

export type StageArt = 'pitch' | 'tactics' | 'stand' | 'court';

export interface StageEntry {
  path: string;
  /** The small line over the title. The title and description are the registry's. */
  kicker: string;
  cta: string;
  /** Shown instead of cta when this browser already holds a save. */
  continueCta?: string;
  /** The localStorage key the game itself saves under. Only its existence is
      checked, the save is never read or parsed here. */
  saveKey?: string;
  art: StageArt;
}

/**
 * The Main Event band, in order: the big stage first, then the three beside
 * it. Four of the six most viewed pages on the site (Lovable analytics,
 * 2026-09-05 to 09-19), Soccer Career about one in five of every pageview.
 */
export const HOME_STAGE: StageEntry[] = [
  { path: '/soccer-career', kicker: 'Career sim', cta: 'Start your career', continueCta: 'Continue your career', saveKey: 'soccerCareerSave', art: 'pitch' },
  { path: '/club-manager', kicker: 'Management sim', cta: 'Take the job', continueCta: 'Back to the dugout', saveKey: 'dukb-club-manager-save', art: 'tactics' },
  { path: '/stadium-tycoon', kicker: 'Idle empire', cta: 'Build it', art: 'stand' },
  { path: '/nba-my-career', kicker: 'Hoops career', cta: 'Get drafted', art: 'court' },
];

/* ── Round 659 ─────────────────────────────────────────────────────────── */

/**
 * Every daily game, straight off the registry's daily flag, in registry
 * order. The dailies rail shows exactly these and nothing typed by hand.
 *
 * A PLAIN RAIL, NOT A CHECKLIST. Round 293 put a personal dailies checklist
 * on the home page and Round 297 removed it on the owner's direct word ("The
 * your dailies I would say get rid of it"). So the rail carries no ticks, no
 * day counts and no "N of M done": it renders the same for everybody, and
 * scripts/simHomeFront.mjs renders it with and without a planted streak
 * record and fails if the two differ.
 */
export function dailyGames(): GameDef[] {
  return ALL_GAMES.filter(g => g.daily);
}

/**
 * The same games dealt round the sports one at a time (a soccer daily, then
 * an NFL one, a college one and so on, then round again), so the first
 * screen of the rail shows the spread of the site instead of eleven soccer
 * games in a row. Nothing is added or dropped, only the order changes.
 */
export function dealtBySport(games: GameDef[]): GameDef[] {
  const piles = new Map<SportKey, GameDef[]>();
  for (const g of games) {
    const s = sportOf(g.path);
    if (!piles.has(s)) piles.set(s, []);
    (piles.get(s) as GameDef[]).push(g);
  }
  const out: GameDef[] = [];
  const decks = [...piles.values()];
  for (let round = 0; out.length < games.length; round += 1) {
    for (const deck of decks) if (round < deck.length) out.push(deck[round]);
  }
  return out;
}

/**
 * Today's puzzle: one daily game picked by the date, the same for everyone,
 * a different one every day. dailyIndex walks the whole pool once per cycle
 * in an order nobody can work out from yesterday, and never repeats the same
 * board two days running, so every daily gets its day on the front.
 */
export function todaysPuzzle(dateStr: string): GameDef | null {
  const all = dailyGames();
  if (all.length === 0) return null;
  return all[dailyIndex(dateStr, all.length)] ?? null;
}

/**
 * The newest games by the day they shipped (the registry's addedOn, which
 * simNewBadge holds against git), newest first, registry order on a tie. No
 * date is typed here: the box moves on its own when the next game ships.
 */
export function justShipped(n: number): GameDef[] {
  return ALL_GAMES
    .map((g, i) => ({ g, i }))
    .filter(x => !!x.g.addedOn)
    .sort((a, b) => (b.g.addedOn as string).localeCompare(a.g.addedOn as string) || a.i - b.i)
    .slice(0, n)
    .map(x => x.g);
}

/** The short name a chip prints beside its glyph, so a sport is named in
    words wherever sports mix. */
export const SPORT_NAME: Record<SportKey, string> = {
  soccer: 'Soccer',
  football: 'NFL',
  college: 'College',
  basketball: 'NBA',
  baseball: 'MLB',
  hockey: 'NHL',
  f1: 'F1',
  tennis: 'Tennis',
  golf: 'Golf',
  aussie: 'AFL',
  nascar: 'NASCAR',
  combat: 'Combat',
  world: 'All sports',
};
