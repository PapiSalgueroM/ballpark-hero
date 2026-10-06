import { ALL_GAMES, type GameDef } from './gameRegistry';

/**
 * Round 717: the Continue playing row on the home page (master spec sections
 * 11 and 153).
 *
 * Every long form game on the site that keeps a save in this browser: the
 * careers, the managers, the dynasties, the front offices and the idle games.
 * The row shows a card for each one this browser holds a save for, and the
 * card says what the save is from the save's own shallow fields (a club and a
 * season, a fighter and his fight count) when those fields are there and look
 * right. Anything else and the card just says it is saved.
 *
 * A save is never trusted here. It is parsed inside a try, every field is
 * walked one own property at a time, a name is cut to a short plain string and
 * a number has to be a whole number in a sane range before it is printed. A
 * damaged or hand edited save gets the plain card, never a crash and never a
 * wall of text.
 *
 * The keys are typed here rather than imported, on purpose. This file ships in
 * the entry chunk every page downloads, and importing the games' own modules
 * for their constants would pull whole engines (Club Manager alone is the
 * biggest file in the repo) onto every page. scripts/simHomeFront.mjs section 7
 * holds each key equal to the SAVE_KEY the game really writes, holds every
 * field named below to a property the game's own save type declares, and fails
 * on any save key in src that is neither on this list nor excused by name.
 */

/** A field inside the save, one property name (or array index) at a time. */
export type SavePath = readonly string[];

export interface ContinueSave {
  path: string;
  /** The localStorage key the game itself saves under. */
  saveKey: string;
  /** The save's own name for what you are running: a club, a team, a fighter. */
  name?: SavePath;
  /** A whole number and how to say it. An array here counts its entries. */
  count?: { at: SavePath; say: string; one?: string };
  /** A field that is exactly true once the save has ended, and the word for it. */
  ended?: { at: SavePath; say: string };
}

export const CONTINUE_SAVES: readonly ContinueSave[] = [
  { path: '/soccer-career', saveKey: 'soccerCareerSave', name: ['currentClub'], count: { at: ['age'], say: 'age {n}' }, ended: { at: ['retired'], say: 'retired' } },
  { path: '/club-manager', saveKey: 'dukb-club-manager-save', name: ['clubName'], count: { at: ['season'], say: 'season {n}' }, ended: { at: ['sacked'], say: 'sacked' } },
  { path: '/stadium-tycoon', saveKey: 'stadiumTycoonSaveV1', name: ['clubName'], count: { at: ['matchNo'], say: '{n} matches played', one: '1 match played' } },
  { path: '/wonderkid-factory', saveKey: 'wonderkidFactoryV1', count: { at: ['prospects'], say: '{n} kids in the academy', one: '1 kid in the academy' } },
  { path: '/rebuild', saveKey: 'rebuild-table', name: ['seats', '0', 'club'] },
  { path: '/front-office', saveKey: 'front-office-save-v1', name: ['myTeam'], count: { at: ['league', 'season'], say: '{n} season' }, ended: { at: ['fired'], say: 'fired' } },
  { path: '/nfl-my-career', saveKey: 'nfl-my-career-save-v1', name: ['c', 'team'], count: { at: ['c', 'year'], say: '{n} season' }, ended: { at: ['c', 'retired'], say: 'retired' } },
  { path: '/cfb-dynasty', saveKey: 'cfb-dynasty-save-v1', name: ['st', 'myTeam'], count: { at: ['st', 'season'], say: '{n} season' } },
  { path: '/cbb-dynasty', saveKey: 'cbb-dynasty-save-v1', name: ['st', 'myTeam'], count: { at: ['st', 'season'], say: '{n} season' } },
  { path: '/nba-front-office', saveKey: 'nba-front-office-save-v1', name: ['myTeam'], count: { at: ['league', 'season'], say: '{n} season' }, ended: { at: ['fired'], say: 'fired' } },
  { path: '/nba-my-career', saveKey: 'nba-my-career-save-v1', name: ['c', 'team'], count: { at: ['c', 'year'], say: '{n} season' }, ended: { at: ['c', 'retired'], say: 'retired' } },
  { path: '/mlb-my-career', saveKey: 'mlb-my-career-save-v1', name: ['c', 'team'], count: { at: ['c', 'year'], say: '{n} season' }, ended: { at: ['c', 'retired'], say: 'retired' } },
  { path: '/mlb-front-office', saveKey: 'mlb-front-office-save-v1', name: ['myTeam'], count: { at: ['league', 'season'], say: '{n} season' }, ended: { at: ['fired'], say: 'fired' } },
  { path: '/nhl-my-career', saveKey: 'nhl-my-career-save-v1', name: ['c', 'team'], count: { at: ['c', 'year'], say: '{n} season' }, ended: { at: ['c', 'retired'], say: 'retired' } },
  { path: '/nhl-front-office', saveKey: 'nhl-front-office-save-v1', name: ['myTeam'], count: { at: ['league', 'season'], say: '{n} season' }, ended: { at: ['fired'], say: 'fired' } },
  { path: '/aussie-rules-manager', saveKey: 'aussie-rules-manager-save-v2', name: ['clubName'], count: { at: ['season'], say: 'season {n}' } },
  { path: '/fight-career', saveKey: 'fight-career-save-v1', name: ['st', 'fighter', 'name'], count: { at: ['st', 'fightNo'], say: '{n} fights', one: '1 fight' }, ended: { at: ['st', 'retired'], say: 'retired' } },
  { path: '/fight-promoter', saveKey: 'fight-promoter-save-v1', name: ['st', 'name'], count: { at: ['st', 'show'], say: 'show {n}' }, ended: { at: ['st', 'closed'], say: 'closed' } },
  { path: '/fight-gym', saveKey: 'fight-gym-save-v1', name: ['g', 'name'], count: { at: ['g', 'week'], say: 'week {n}' }, ended: { at: ['g', 'closed'], say: 'closed' } },
  { path: '/hall-of-champions', saveKey: 'hallOfChampionsV1', count: { at: ['openWings'], say: '{n} wings open', one: '1 wing open' } },
  { path: '/idle-arena', saveKey: 'dukb-idle-arena-v1', count: { at: ['trophies'], say: '{n} trophies', one: '1 trophy' } },
];

/** The longest name a card prints. A save can hold any string at all. */
export const SAVE_NAME_MAX = 28;
/** The biggest number a card prints; anything past it is not a real save. */
const COUNT_MAX = 99999;

export interface SavedGame {
  entry: ContinueSave;
  game: GameDef;
}

/**
 * The games this browser holds a save for, in list order. Existence only:
 * nothing is read or parsed here, so this is cheap enough for a first render
 * and the row's size is known before any save is opened.
 */
export function savedGames(storage: Pick<Storage, 'getItem'> | null | undefined): SavedGame[] {
  if (!storage) return [];
  const out: SavedGame[] = [];
  for (const entry of CONTINUE_SAVES) {
    let held = false;
    try { held = storage.getItem(entry.saveKey) !== null; } catch { held = false; }
    if (!held) continue;
    const game = ALL_GAMES.find(g => g.path === entry.path);
    if (game) out.push({ entry, game });
  }
  return out;
}

/** One own property at a time, through plain objects and arrays only. */
function walk(root: unknown, at: SavePath): unknown {
  let cur: unknown = root;
  for (const step of at) {
    if (cur === null || typeof cur !== 'object') return undefined;
    if (!Object.prototype.hasOwnProperty.call(cur, step)) return undefined;
    cur = (cur as Record<string, unknown>)[step];
  }
  return cur;
}

/** A short plain name, or null. Control characters go, space runs close up. */
function cleanName(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  // eslint-disable-next-line no-control-regex
  const t = v.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!t) return null;
  return t.length > SAVE_NAME_MAX ? `${t.slice(0, SAVE_NAME_MAX - 3).trimEnd()}...` : t;
}

/** A whole number in range, or an array's length, or null. */
function cleanCount(v: unknown): number | null {
  const n = Array.isArray(v) ? v.length : v;
  if (typeof n !== 'number' || !Number.isInteger(n) || n < 0 || n > COUNT_MAX) return null;
  return n;
}

/**
 * The short line a card prints under the game's name, read from the save's
 * own fields, or null when the save has nothing usable. Never throws.
 */
export function describeSave(entry: ContinueSave, raw: string | null): string | null {
  if (raw === null) return null;
  let save: unknown;
  try { save = JSON.parse(raw); } catch { return null; }
  if (save === null || typeof save !== 'object' || Array.isArray(save)) return null;
  const parts: string[] = [];
  const name = entry.name ? cleanName(walk(save, entry.name)) : null;
  if (name) parts.push(name);
  if (entry.ended && walk(save, entry.ended.at) === true) {
    parts.push(entry.ended.say);
  } else if (entry.count) {
    const n = cleanCount(walk(save, entry.count.at));
    if (n !== null) parts.push(n === 1 && entry.count.one ? entry.count.one : entry.count.say.replace('{n}', String(n)));
  }
  return parts.length ? parts.join(', ') : null;
}
