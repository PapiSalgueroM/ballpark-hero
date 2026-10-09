/**
 * Round 1115: the squad a club has when nobody baked one.
 *
 * The real squads in clubSquads.ts cover the seasons 2015/16 to 2025/26 for
 * the clubs in its map. Everywhere else the Squad tile used to show nothing,
 * which in the default era is every single season. This file builds the 22
 * men who stand in for that squad. It is pure and it is DISPLAY ONLY: nothing in the
 * simulation reads it, and it never draws from the season's random stream.
 *
 * THE SAME ON EVERY RELOAD. Nothing is stored. A squad is rebuilt from a key
 * the save has always held (soccerClubSquad.ts builds it) plus the club, so
 * the same career sees the same men at the same club for as long as it lives.
 *
 * A LIVING SQUAD. Every one of the 22 slots holds a run of men, each staying
 * two to six seasons. A man is one year older every summer until his run
 * ends, and the man who replaces him arrived that summer. About five of the
 * 22 are new each year.
 *
 * WHO THEY ARE. Names come only from the closed name families in
 * intlNames.ts, every one of which is fenced against real players, and the
 * caller decides whether names are shown at all: a real past season with no
 * checked squad is drawn BY ROLE ONLY ("First choice forward"), because an
 * invented name must never be attached to a real club in a real past season.
 *
 * AGREEING WITH THE ENGINE. The engine gives 20 to 30 league games to a
 * player within five of the club's level and 8 to 18 below that. So the last
 * starter of every line here is rated exactly six under the level, every
 * other starter at least five under and every reserve at most seven under:
 * a player the engine treats as a starter ranks inside the eleven, and one it
 * treats as cover ranks behind it. scripts/simCareerSquad.mjs measures how
 * often the two pictures still disagree.
 */
import { keyedRng } from './keyedRng';
import { NAME_FAMILIES, NATION_FAMILY, allIntlNames } from './intlNames';
import type { SquadMan, SquadGroup } from './soccerClubSquad';

export type GenKind = 'first' | 'cover' | 'prospect';

/** One keeper, four defenders, three midfielders, three forwards: the same
 *  line sizes the national team sheet fills. The harness fences the copy. */
export const ELEVEN_SHAPE = { GK: 1, DEF: 4, MID: 3, ATT: 3 } as const;

/** The level a squad expects, by tier. A copy of the engine's private table;
 *  the harness reads the engine's own projection to prove they agree. */
export const TIER_CENTRE: Record<number, number> = { 1: 80, 2: 72, 3: 62, 4: 55 };
export const CENTRE_DEFAULT = 60;
export const GEN_EPOCH = 1960;
const YEAR_CAP = 2400;

/** A club country with no name family of its own borrows a neighbour's. */
export const FAMILY_ALIAS: Record<string, string> = {
  Monaco: 'France', UAE: 'United Arab Emirates', Malaysia: 'Indonesia',
  /* Release AQ: the league world (Round 1175) seats FC Andorra in Spain's second
     division with its own country, which had no family, so a teammate the
     game made up there got the fallback's English names. */
  Andorra: 'Spain',
};

/** 22 slots: position, group, level against the club's centre, kind. Inside
 *  a group the slots run best first, which the carry on from a real squad
 *  relies on. */
export const SQUAD_SLOTS = [
  ['GK', 'GK', -4, 'first'], ['GK', 'GK', -9, 'cover'], ['GK', 'GK', -14, 'prospect'],
  ['CB', 'DEF', 6, 'first'], ['CB', 'DEF', 3, 'first'], ['RB', 'DEF', 0, 'first'], ['LB', 'DEF', -4, 'first'],
  ['CB', 'DEF', -6, 'cover'], ['RB', 'DEF', -9, 'cover'], ['LB', 'DEF', -13, 'prospect'],
  ['CM', 'MID', 6, 'first'], ['CDM', 'MID', 1, 'first'], ['CM', 'MID', -4, 'first'], ['CAM', 'MID', -6, 'cover'],
  ['CM', 'MID', -8, 'cover'], ['CDM', 'MID', -11, 'prospect'], ['CM', 'MID', -14, 'prospect'],
  ['ST', 'ATT', 6, 'first'], ['RW', 'ATT', 1, 'first'], ['LW', 'ATT', -4, 'first'], ['ST', 'ATT', -7, 'cover'],
  ['LW', 'ATT', -11, 'prospect'],
] as const;

/** The last starter of each line: the keeper, the fourth defender, the third
 *  midfielder, the third forward. */
export const LAST_STARTER_SLOTS: readonly number[] = [0, 6, 12, 19];
export const LAST_STARTER_UNDER = 6;
export const STARTER_FLOOR_UNDER = 5;
export const RESERVE_CAP_UNDER = 7;

/** Where a signing from abroad can come from. Every entry is a NATION_FAMILY key. */
export const FOREIGN_NATIONS: readonly string[] = [
  'Brazil', 'Argentina', 'France', 'Spain', 'Portugal', 'Netherlands', 'Germany', 'Italy', 'England', 'Belgium',
  'Croatia', 'Serbia', 'Nigeria', 'Senegal', 'Ghana', 'Ivory Coast', 'Cameroon', 'Morocco', 'Japan', 'South Korea',
  'USA', 'Mexico', 'Colombia', 'Uruguay', 'Denmark', 'Sweden', 'Norway', 'Poland', 'Turkey', 'Egypt',
];

/** What a role is called on a sheet with no names: his place in his LINE on
 *  rating. The squad built here does not hold the player, so these places
 *  count the club's own men only. The reader that puts the player into his
 *  line (squadView) numbers that line again with him counted, so the "third
 *  choice forward" on his screen is in the eleven and the fourth is not,
 *  wherever he ranks himself. His exact position is printed beside it. */
export const ROLE_WORD: Record<SquadGroup, string> = {
  GK: 'keeper', DEF: 'defender', MID: 'midfielder', ATT: 'forward',
};
const CHOICE_WORD = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth'];

/** The role of the man in place `place` (0 is the best) of a line. */
export function roleName(place: number, group: SquadGroup): string {
  return `${CHOICE_WORD[place] ?? `Number ${place + 1}`} choice ${ROLE_WORD[group]}`;
}

export function squadCentre(tier: number): number {
  return TIER_CENTRE[tier] ?? CENTRE_DEFAULT;
}

/* The ONE place a stream is made. Every draw below goes through it, and the
   harness control that unkeys the generator patches exactly this line. */
const stream = (key: string) => keyedRng(`squad|${key}`);

/* Built on first use, never at module scope (the import cycle rule). */
let nameTable: { names: string[]; offset: Record<string, number>; size: Record<string, number> } | null = null;
function names() {
  if (nameTable) return nameTable;
  const offset: Record<string, number> = {};
  const size: Record<string, number> = {};
  let at = 0;
  for (const fam of NAME_FAMILIES) {
    offset[fam.id] = at;
    size[fam.id] = fam.firsts.length * fam.lasts.length;
    at += size[fam.id];
  }
  nameTable = { names: allIntlNames(), offset, size };
  return nameTable;
}

/** The name family a club country (or a signing's nation) draws from. */
export function familyIdFor(nation: string): string | null {
  return NATION_FAMILY[FAMILY_ALIAS[nation] ?? nation] ?? null;
}

/* A keyed shuffle of one family's pairs, one per save, club and family, so
   slot i is not the same handful of names at every club in every save. A
   shuffle is one to one, so two slots still can never share a name. */
const shuffles = new Map<string, number[]>();
function shuffled(seed: string, familyId: string, pairs: number): number[] {
  const key = `${seed}|${familyId}`;
  const hit = shuffles.get(key);
  if (hit) return hit;
  const order = Array.from({ length: pairs }, (_, k) => k);
  const r = stream(`${seed}|f|${familyId}`);
  for (let k = pairs - 1; k > 0; k -= 1) {
    const j = Math.floor(r() * (k + 1));
    const t = order[k]; order[k] = order[j]; order[j] = t;
  }
  if (shuffles.size > 600) shuffles.clear();
  shuffles.set(key, order);
  return order;
}

/** Which run of slot i covers season y: when it began and its number. */
function tenureOf(seed: string, i: number, y: number): { start: number; idx: number } {
  const r = stream(`${seed}|s${i}|t`);
  let start = GEN_EPOCH - Math.floor(r() * 6);
  let idx = 0;
  for (;;) {
    const len = 2 + Math.floor(r() * 5);
    if (y < start + len) return { start, idx };
    start += len;
    idx += 1;
  }
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const ageCurve = (age: number) => (age < 23 ? -Math.min(5, 23 - age) : age > 30 ? -(age - 30) * 1.2 : 0);

/** The man in slot i in season y. His name never depends on who else is in
 *  the squad that year: a namesake arriving must not rename him. */
function manOf(seed: string, country: string, centre: number, i: number, y: number): SquadMan {
  const [pos, group, level, kind] = SQUAD_SLOTS[i];
  const { start, idx } = tenureOf(seed, i, y);
  const j0 = Math.floor(stream(`${seed}|s${i}|n`)() * 1000);
  const r = stream(`${seed}|s${i}|m${idx}`);
  const u1 = r(); const u2 = r(); const u3 = r(); const u4 = r();
  const nation = u1 < 0.6 && country ? country : FOREIGN_NATIONS[Math.floor(u2 * FOREIGN_NATIONS.length)];
  const t = names();
  const familyId = familyIdFor(nation) ?? NAME_FAMILIES[0].id;
  const pairs = t.size[familyId];
  const turns = Math.floor((pairs - 1 - i) / SQUAD_SLOTS.length) + 1;
  const pair = i + SQUAD_SLOTS.length * ((j0 + idx) % turns);
  const name = t.names[t.offset[familyId] + shuffled(seed, familyId, pairs)[pair]];
  const arrival = kind === 'first' ? 21 + Math.floor(u3 * 8)
    : kind === 'cover' ? (u3 < 0.5 ? 29 + Math.floor(u3 * 10) : 20 + Math.floor((u3 - 0.5) * 10))
      : 17 + Math.floor(u3 * 4);
  const age = arrival + (y - start);
  const raw = Math.round(centre + level + (u4 * 3 - 1.5) + ageCurve(age));
  const fitted = LAST_STARTER_SLOTS.includes(i) ? centre - LAST_STARTER_UNDER
    : kind === 'first' ? Math.max(centre - STARTER_FLOOR_UNDER, raw)
      : Math.min(centre - RESERVE_CAP_UNDER, raw);
  return {
    id: `${i}:${idx}`, name, nation, pos, group: group as SquadGroup, age,
    ovr: clamp(fitted, 40, 94), since: start,
  };
}

export interface GenQuery {
  saveKey: string;
  club: string;
  country: string;
  tier: number;
  year: number;
  /** false draws the sheet by role only, with no names on it. */
  named?: boolean;
  /** The club's last real squad, best first, and its season: from the summer
   *  after it the world is the game's own, and these men carry on until each
   *  one leaves. Ignored on a sheet with no names. */
  base?: { men: SquadMan[]; year: number } | null;
}

/** A real man stays between zero and five more seasons after the last real squad. */
export const CARRY_SEASONS = 6;

/* The real men still at the club in season y, each in the slot his rank in
   his line gives him. A real man carries only what the bake holds: name,
   position, rating. When he leaves, the slot's own invented man steps in. */
function carriedOn(seed: string, base: { men: SquadMan[]; year: number }, y: number) {
  const bySlot: Record<number, { man: SquadMan | null; left: number }> = {};
  const extras: SquadMan[] = [];
  const taken: Record<string, number> = { GK: 0, DEF: 0, MID: 0, ATT: 0 };
  for (const real of base.men) {
    const left = base.year + 1 + Math.floor(stream(`${seed}|r|${real.name}`)() * CARRY_SEASONS);
    const man: SquadMan | null = y < left ? { name: real.name, pos: real.pos, ovr: real.ovr, group: real.group } : null;
    let seen = 0;
    let slot = -1;
    for (let i = 0; i < SQUAD_SLOTS.length; i += 1) {
      if (SQUAD_SLOTS[i][1] !== real.group) continue;
      if (seen === taken[real.group]) { slot = i; break; }
      seen += 1;
    }
    taken[real.group] += 1;
    if (slot < 0) { if (man) extras.push(man); } else bySlot[slot] = { man, left };
  }
  return { bySlot, extras };
}

const memo = new Map<string, SquadMan[]>();

/**
 * The squad of a club in a season, best first, without the player in it.
 * Twenty two men (more while a real squad's extra men are still around).
 */
export function genClubSquad(q: GenQuery): SquadMan[] {
  const named = q.named !== false;
  const seed = `${q.saveKey}|${q.club}`;
  const y = clamp(Math.floor(q.year), GEN_EPOCH, YEAR_CAP);
  const base = named && q.base && y > q.base.year ? q.base : null;
  const key = `${seed}|${q.country}|${q.tier}|${y}|${named ? 'n' : 'r'}|${base ? base.year : '-'}`;
  const hit = memo.get(key);
  if (hit) return hit;
  const centre = squadCentre(q.tier);
  const stays = base ? carriedOn(seed, base, y) : null;
  const rows: { man: SquadMan; slot: number }[] = [];
  for (let i = 0; i < SQUAD_SLOTS.length; i += 1) {
    const kept = stays ? stays.bySlot[i] : undefined;
    if (kept && kept.man) { rows.push({ man: kept.man, slot: i }); continue; }
    const man = manOf(seed, q.country, centre, i, y);
    /* In a squad that carries on, nobody invented was there before the real
       man in his slot left, or before the game's own world began. */
    if (base) man.since = Math.max(man.since ?? y, kept ? kept.left : base.year + 1);
    rows.push({ man, slot: i });
  }
  if (stays) for (const man of stays.extras) rows.push({ man, slot: SQUAD_SLOTS.length });
  rows.sort((a, b) => b.man.ovr - a.man.ovr
    || (named ? (a.man.name < b.man.name ? -1 : a.man.name > b.man.name ? 1 : 0) : 0)
    || a.slot - b.slot);
  const men = rows.map(r => r.man);
  if (!named) {
    const seen: Record<string, number> = {};
    for (const man of men) {
      const k = seen[man.group] ?? 0;
      seen[man.group] = k + 1;
      const role = roleName(k, man.group);
      man.name = role;
      man.role = role;
      delete man.nation;
    }
  }
  if (memo.size > 300) memo.clear();
  memo.set(key, men);
  return men;
}
