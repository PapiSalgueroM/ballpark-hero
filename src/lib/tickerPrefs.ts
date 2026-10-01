/**
 * Round 711: what a visitor tells the ticker, kept in this browser only.
 *
 * Two things: the teams they follow (starred from a score card) and the sport
 * they want the strip to show. Both live in localStorage, so they work signed
 * out like everything else on the site, and nothing here ever leaves the
 * browser. Every read is hostile-safe: a hand edited or half written value
 * comes back as "nothing saved" rather than as a crash on every page, because
 * the strip renders on every route.
 *
 * A team is keyed by sport plus the name exactly as the feed writes it
 * ("mlb|New York Yankees"), so two sports that share a club name (a soccer
 * and a football side called the same thing) stay two follows.
 */

export const FOLLOW_KEY = 'ticker-follows';
export const SPORT_KEY = 'ticker-sport';
/** Enough for anyone's teams; a cap so a runaway save cannot grow forever. */
export const MAX_FOLLOWS = 40;

/** The two filters that are not a sport. */
export const FILTER_ALL = 'all';
export const FILTER_MINE = 'mine';

/* Coerced, not trusted: the follow check runs on every row of the board
   before the grouping's own guards, so a row with a number where a name
   should be must key as text rather than throw on every page. */
export function teamKey(sport: unknown, name: unknown): string {
  return `${String(sport ?? '').trim()}|${String(name ?? '').trim()}`;
}

const KEY_SHAPE = /^[a-z]{2,12}\|.{1,120}$/;

/** The feed's stand-in for a side it does not know yet: "TBD", or the
 *  doubles form "TBD / TBD". Not a team, so never a follow. */
export function isPlaceholderTeam(name: unknown): boolean {
  const n = String(name ?? '').trim();
  return n === '' || /^(tbd|tba)(\s*\/\s*(tbd|tba))*$/i.test(n);
}

/** Only a real, distinct team may be followed: a placeholder is skipped and
 *  a game listed as "TBD @ TBD" offers nothing, since both sides key alike. */
export function followableTeams(sport: unknown, away: unknown, home: unknown): { key: string; name: string }[] {
  const out: { key: string; name: string }[] = [];
  for (const name of [away, home]) {
    if (isPlaceholderTeam(name)) continue;
    const key = teamKey(sport, name);
    if (!KEY_SHAPE.test(key) || out.some(t => t.key === key)) continue;
    out.push({ key, name: String(name).trim() });
  }
  return out;
}

const isFollowKey = (k: unknown): k is string =>
  typeof k === 'string' && KEY_SHAPE.test(k) && !isPlaceholderTeam(k.slice(k.indexOf('|') + 1));

/** A saved follow list, or [] for anything that is not one. */
export function parseFollows(raw: string | null | undefined): string[] {
  if (!raw) return [];
  let data: unknown;
  try { data = JSON.parse(raw); } catch { return []; }
  if (!Array.isArray(data)) return [];
  const out: string[] = [];
  for (const k of data) {
    if (!isFollowKey(k) || out.includes(k)) continue;
    out.push(k);
    if (out.length >= MAX_FOLLOWS) break;
  }
  return out;
}

/** Follow if not followed, unfollow if followed. Newest follow goes last;
 *  past the cap the oldest one drops. */
export function toggleFollow(keys: string[], key: string): string[] {
  if (keys.includes(key)) return keys.filter(k => k !== key);
  if (!isFollowKey(key)) return keys;
  const next = [...keys, key];
  return next.length > MAX_FOLLOWS ? next.slice(next.length - MAX_FOLLOWS) : next;
}

/** A saved filter: 'all', 'mine', or a sport key. Anything else is 'all'.
 *  A sport key is looked up in plain objects (the tag and hub maps), so a
 *  name every object already has, "constructor", is not a sport either. */
export function parseSportFilter(raw: string | null | undefined): string {
  if (!raw) return FILTER_ALL;
  const v = raw.trim();
  if (v === FILTER_ALL || v === FILTER_MINE) return v;
  if (!/^[a-z]{2,12}$/.test(v)) return FILTER_ALL;
  return Object.prototype.hasOwnProperty.call(Object.prototype, v) ? FILTER_ALL : v;
}

function read(key: string): string | null {
  try { return window.localStorage.getItem(key); } catch { return null; }
}
function write(key: string, value: string): void {
  try { window.localStorage.setItem(key, value); } catch { /* private window or full storage: the choice holds for this visit */ }
}

export const readFollows = (): string[] => parseFollows(read(FOLLOW_KEY));
export const writeFollows = (keys: string[]): void => write(FOLLOW_KEY, JSON.stringify(keys));
export const readSportFilter = (): string => parseSportFilter(read(SPORT_KEY));
export const writeSportFilter = (filter: string): void => write(SPORT_KEY, parseSportFilter(filter));
