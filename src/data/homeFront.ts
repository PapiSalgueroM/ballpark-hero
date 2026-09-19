import { CATEGORIES, type CategoryTitle } from './gameRegistry';

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
  { path: '/nba-my-career', kicker: 'Basketball career', cta: 'Get drafted', art: 'court' },
];
