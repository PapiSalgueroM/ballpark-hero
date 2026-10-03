/* Round 941: the GM seat, one adapter for every manager seat on the site.

   Two engines already existed and neither knew about the other. The owner
   upstairs (foOwnerMandate.ts, Round 180) names a prize every season and
   grades it, but its words were a pro franchise's words and a sacking wiped
   the save, even though its own fired line promises another franchise will
   call. The job market (managerOffers.ts, Round 107) is a fair, pure feed of
   offers a sacked manager has EARNED, empty when he has not, but its profile
   speaks soccer: promotions, relegations, countries.

   This file is an adapter and nothing more. It imports both engines and
   edits neither. Three parts:

   1. SEAT WORDS. A pack (src/data/gmSeat/packs.ts) carries who sits upstairs
      and what the prize is called, per mandate level, so the same ladder
      serves a franchise, a college program, a club and a gym. The ladder
      itself (which tier a rank earns, what passes, what a grade is worth in
      trust) stays in foOwnerMandate.ts. Only the words change here.

   2. THE MARKET. Any league (team ids plus a strength or prestige number)
      becomes four tiers by rank, a tenure (seasons, titles, mandate grades,
      how it ended) becomes a ManagerProfile, and generateJobOffers draws the
      feed. Three rules sit on top, all here and none in the engine: the club
      that just let you go is never in the feed, a man who leaves straight
      after a season graded 'badly' (fired, or walking before the call came)
      is never offered a top tier job, and a title winner who walks always has
      an offer at his level or above in his first feed.

   3. THE SEAT'S OWN DIFFERENCE. In these games a college coach can be
      bought out and poached upward after a big year, and a pro GM never draws
      a bid. That is this game's rule, not a claim about real front offices
      (real executives have left a contract early with compensation paid). It
      is a flag on the pack, read in one place (poachBid).

   Legal line, same as the engines: everything is narrated. Speakers are roles
   (ownership, the athletic director, the board, the backers), never a real
   person, and no line here is a quote. */

import {
  buildOwnerMandate, gradeSeason, strengthRank, FO_TRUST_START,
  type FoSportWords, type FoTier, type FoGradeResult, type FoGrade,
  type OwnerMandate, type FoSeasonOutcome,
} from './foOwnerMandate';
import {
  generateJobOffers, managerStanding,
  type ClubTier, type Departure, type ManagerProfile, type OfferClub,
} from './managerOffers';

export type GmSeatId = 'nfl' | 'nba' | 'nhl' | 'mlb' | 'cfb' | 'cbb' | 'afl';

/** One ask per mandate level, plus the defending champion's version of 'contend'. */
export type SeatAskKey = FoTier | 'champDefend';

export interface GmSeatPack {
  id: GmSeatId;
  /** The game this seat lives in, for the card header. */
  game: string;
  /** What you are: 'general manager', 'head coach', 'senior coach'. */
  role: string;
  /** What you run, singular and plural: 'franchise', 'program', 'club'. */
  seat: string;
  seats: string;
  /** Who sits upstairs, lower case, narrated: 'ownership', 'the board'. */
  upstairs: string;
  /** The prize, the postseason, a round of it, and the season length the
      game itself plays (a game rule, read from that game's own engine). */
  words: FoSportWords;
  /** 'roster', 'squad', 'stable'. */
  roster: string;
  /** 'games' or 'fights', for the win floor asks. */
  winUnit: string;
  /** The ask at every mandate level. Placeholders: {title} {playoffs}
      {round} {wins} ('6 wins') {winGames} ('6 games', '6 fights')
      {upstairs} {Upstairs} {roster} {seat}. */
  asks: Record<SeatAskKey, string>;
  /** The verdict at every grade, same placeholders. */
  verdicts: Record<FoGradeResult, string>;
  /** College only: a big year can get you bought out and poached upward. */
  poachable: boolean;
  /** A league only season with no postseason (the Aussie rules manager: ten
      rounds, the ladder leader wins). A ladder place stands in for the
      postseason levels the mandate grades (ladderSeasonOutcome): the top
      `cut` places make the 'playoffs' level, the top `deep` places the 'win a
      round' level, first is the title. Absent on every seat that plays a
      postseason. */
  ladder?: { cut: number; deep: number };
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Fill a pack template. An unknown placeholder is left as written so a typo
    shows on screen instead of vanishing. */
export function fillSeatWords(template: string, pack: GmSeatPack, winFloor = 0): string {
  const dict: Record<string, string> = {
    title: pack.words.title,
    playoffs: pack.words.playoffs,
    round: pack.words.round,
    wins: `${winFloor} wins`,
    winGames: `${winFloor} ${pack.winUnit}`,
    upstairs: pack.upstairs,
    Upstairs: cap(pack.upstairs),
    roster: pack.roster,
    seat: pack.seat,
  };
  return template.replace(/\{(\w+)\}/g, (whole, key: string) => dict[key] ?? whole);
}

/* ---------------- part 1: the ask from upstairs ---------------- */

/** The mandate for this seat. The tier, the win floor and the postseason
    level all come from buildOwnerMandate unchanged; only the words are the
    seat's own. */
export function seatMandate(
  pack: GmSeatPack, rank: number, teamCount: number, defendingChamp: boolean, season: number,
  tilt: -1 | 0 | 1 = 0,
): OwnerMandate {
  const base = buildOwnerMandate(rank, teamCount, defendingChamp, pack.words, season, tilt);
  const key: SeatAskKey = base.tier === 'contend' && defendingChamp ? 'champDefend' : base.tier;
  return { ...base, text: fillSeatWords(pack.asks[key], pack, base.winFloor) };
}

/** A league only seat's season, as gradeSeason reads one: a final ladder
    place (1 = top) and the wins. Nothing here claims the game has a final:
    the places just stand on gradeSeason's levels, first as the title, second
    where a beaten finalist would stand, the top `deep` as a round won and the
    top `cut` as making it. So a title ask finished second is 'missed', not
    'badly', and a top three ask finished third is 'met'. */
export function ladderSeasonOutcome(pack: GmSeatPack, place: number, wins: number): FoSeasonOutcome {
  if (!pack.ladder) throw new Error(`${pack.id} plays a postseason, grade it from the bracket`);
  return {
    wins,
    madePlayoffs: place <= pack.ladder.cut,
    roundsWon: place <= pack.ladder.deep ? 1 : 0,
    reachedFinal: place <= 2,
    wonTitle: place === 1,
  };
}

/** The season grade, with the seat's own verdict line. Trust and result are
    gradeSeason's, untouched. */
export function seatGrade(pack: GmSeatPack, m: OwnerMandate, out: FoSeasonOutcome): FoGrade {
  const g = gradeSeason(m, out);
  return { ...g, verdict: fillSeatWords(pack.verdicts[g.result], pack, m.winFloor) };
}

/* ---------------- the career record (an optional save block) ---------------- */

/** How a stint ended. 'expired' is a contract that ran out with nobody
    pushing either way. */
export type SeatEnd = 'fired' | 'walked' | 'poached' | 'expired';

export interface SeatStint {
  team: string;
  /** Tier of the team when you took it. */
  tier: ClubTier;
  /** The season you started. */
  from: number;
  /** One grade per finished season, oldest first. Titles are the 'title' grades. */
  grades: FoGradeResult[];
  /** Absent while you still hold the seat. */
  ended?: SeatEnd;
}

export interface GmCareer {
  version: 1;
  /** Every seat you have held, oldest first. Never empty. */
  stints: SeatStint[];
  /** Seasons sat out since the last stint ended. */
  seasonsOut: number;
}

export function newGmCareer(team: string, tier: ClubTier, season: number): GmCareer {
  return { version: 1, stints: [{ team, tier, from: season, grades: [] }], seasonsOut: 0 };
}

export function currentStint(c: GmCareer): SeatStint {
  return c.stints[c.stints.length - 1];
}

const lastGradeOf = (s: SeatStint): FoGradeResult | null => s.grades.length ? s.grades[s.grades.length - 1] : null;

export function careerTotals(c: GmCareer): { seasons: number; titles: number; overachieved: number; badly: number } {
  const all = c.stints.flatMap(s => s.grades);
  return {
    seasons: all.length,
    titles: all.filter(g => g === 'title').length,
    overachieved: all.filter(g => g === 'overachieved').length,
    badly: all.filter(g => g === 'badly').length,
  };
}

/** Log a finished season's grade on the seat you hold now. */
export function recordSeatSeason(c: GmCareer, grade: FoGradeResult): GmCareer {
  const stints = c.stints.slice();
  const cur = stints[stints.length - 1];
  if (cur.ended) return c;
  stints[stints.length - 1] = { ...cur, grades: [...cur.grades, grade] };
  return { ...c, stints };
}

export function endSeatStint(c: GmCareer, ended: SeatEnd): GmCareer {
  const stints = c.stints.slice();
  const cur = stints[stints.length - 1];
  if (cur.ended) return c;
  stints[stints.length - 1] = { ...cur, ended };
  return { ...c, stints, seasonsOut: 0 };
}

/** A season with no seat. The market only gets colder (managerOffers' idle cut). */
export function sitOutYear(c: GmCareer): GmCareer {
  return { ...c, seasonsOut: c.seasonsOut + 1 };
}

/** Validate a stored career block. Anything malformed returns null so the
    caller resets this block alone and the rest of the save loads as it was. */
export function sanitizeGmCareer(raw: unknown): GmCareer | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (r.version !== 1 || !Array.isArray(r.stints) || r.stints.length === 0) return null;
  if (!Number.isInteger(r.seasonsOut) || (r.seasonsOut as number) < 0) return null;
  const grades = new Set<string>(['title', 'overachieved', 'met', 'missed', 'badly']);
  const ends = new Set<string>(['fired', 'walked', 'poached', 'expired']);
  const stints: SeatStint[] = [];
  for (let i = 0; i < r.stints.length; i++) {
    const s = r.stints[i] as Record<string, unknown> | null;
    if (!s || typeof s !== 'object') return null;
    if (typeof s.team !== 'string' || !s.team) return null;
    if (![1, 2, 3, 4].includes(s.tier as number)) return null;
    if (!Number.isInteger(s.from)) return null;
    if (!Array.isArray(s.grades) || !s.grades.every(g => typeof g === 'string' && grades.has(g))) return null;
    if (s.ended !== undefined && !(typeof s.ended === 'string' && ends.has(s.ended))) return null;
    /* Only the newest stint may still be open. */
    if (s.ended === undefined && i !== r.stints.length - 1) return null;
    stints.push({
      team: s.team, tier: s.tier as ClubTier, from: s.from as number,
      grades: (s.grades as FoGradeResult[]).slice(),
      ...(s.ended !== undefined ? { ended: s.ended as SeatEnd } : {}),
    });
  }
  return { version: 1, stints, seasonsOut: r.seasonsOut as number };
}

/* ---------------- part 2: the market ---------------- */

/** Any league, as the market needs it: an id, a display name and one number
    that ranks it (roster strength, prestige, reputation). */
export interface SeatTeam { id: string; name: string; strength: number }

/** Four tiers by strength rank, quarters of the league, ties broken by id so
    the same league always tiers the same way. */
export function leagueTiers(teams: SeatTeam[]): Map<string, ClubTier> {
  const sorted = [...teams].sort((a, b) => b.strength - a.strength || a.id.localeCompare(b.id));
  const out = new Map<string, ClubTier>();
  sorted.forEach((t, i) => out.set(t.id, (1 + Math.floor((i * 4) / sorted.length)) as ClubTier));
  return out;
}

/** 1 = strongest, counted by foOwnerMandate.strengthRank itself. */
function rankIn(teams: SeatTeam[], id: string): number {
  return strengthRank(Object.fromEntries(teams.map(t => [t.id, t.strength])), id);
}

/* Every club in a seat's market shares one country, so managerOffers'
   familiarity term (a soccer idea: your own country trusts you more) is the
   same for every club and drops out of the ranking. */
const SEAT_COUNTRY = 'seat';

/** Grades count toward the two soccer record fields at most this many times
    each, so a long career is not decided by them alone. */
export const GRADE_RECORD_CAP = 3;

/** The tier the market treats as your level: the team's tier today if it is
    still in the league, the tier when you took it otherwise. */
function levelOf(stint: SeatStint, tiers: Map<string, ClubTier>): ClubTier {
  return tiers.get(stint.team) ?? stint.tier;
}

/** A tenure, as managerOffers reads a manager. The soccer only fields are
    neutralised here rather than in the engine: no playing career, a season
    that beat the ask stands in for a promotion, a season graded 'badly'
    stands in for a relegation, and a firing straight after a 'badly' season
    reads as the worst exit the engine knows. */
export function careerProfile(c: GmCareer, tiers: Map<string, ClubTier>): ManagerProfile {
  const t = careerTotals(c);
  const last = currentStint(c);
  const lastGrade = lastGradeOf(last);
  const departure: Departure =
    last.ended === 'fired' ? (lastGrade === 'badly' ? 'relegated' : 'sacked')
    : last.ended === 'poached' ? 'poached'
    : last.ended === 'expired' ? 'mutual'
    : 'resigned';
  return {
    playingRep: 0,
    seasonsSinceRetired: 0,
    managerTrophies: t.titles,
    promotions: Math.min(GRADE_RECORD_CAP, t.overachieved),
    relegations: Math.min(GRADE_RECORD_CAP, t.badly),
    seasonsManaged: t.seasons,
    lastTier: levelOf(last, tiers),
    departure,
    seasonsOut: c.seasonsOut,
    nationality: SEAT_COUNTRY,
    workedIn: [],
  };
}

/** The best tier a man can be offered when he leaves straight after a
    'badly' season, fired or walking before the call came. A hard rule on top
    of the engine's own ceiling: whatever he won before, a top tier club does
    not hire the man who just ran one into the ground, and walking out first
    does not wash that off. */
export const BADLY_FIRED_CEILING: ClubTier = 2;

export interface SeatOffer {
  teamId: string;
  teamName: string;
  tier: ClubTier;
  /** What that club's upstairs will ask in your first season there. */
  ask: OwnerMandate;
  /** Why they called, drawn from what you actually did. */
  reason: string;
  /** 5 to 100: how much they want you. */
  keenness: number;
  /** College only: they will pay the buyout to take you from a seat you hold. */
  buyout?: boolean;
}

/** Why they called. Drawn from the record, never invented, so the feed tells
    you what the market is paying for. */
function seatReason(pack: GmSeatPack, c: GmCareer, tier: ClubTier, rng: () => number): string {
  const t = careerTotals(c);
  const last = currentStint(c);
  const out: string[] = [];
  if (t.titles >= 2) out.push(`They want someone who has won ${pack.words.title} more than once.`);
  else if (t.titles === 1) out.push(`You have won ${pack.words.title}, and they want to know how.`);
  if (t.overachieved >= 2) out.push('You beat the ask upstairs more than once, and people noticed.');
  if (t.seasons >= 8) out.push('They are buying experience, plain and simple.');
  if (last.ended === 'walked') out.push('You left on your own terms, and that still counts for something.');
  if (last.ended === 'fired' && tier === 4) out.push('They are gambling that you learned something on the way out.');
  if (out.length === 0) out.push('Nobody else was biting at what they can pay.');
  return out[Math.floor(rng() * out.length)];
}

function toSeatOffer(
  pack: GmSeatPack, teams: SeatTeam[], teamId: string, tier: ClubTier, keenness: number,
  c: GmCareer, season: number, champion: string | null, rng: () => number,
): SeatOffer {
  const team = teams.find(t => t.id === teamId)!;
  return {
    teamId,
    teamName: team.name,
    tier,
    ask: seatMandate(pack, rankIn(teams, teamId), teams.length, champion === teamId, season),
    reason: seatReason(pack, c, tier, rng),
    keenness,
  };
}

/**
 * The feed for a GM between seats. Empty is a real answer: the engine decides
 * how many call and from how high, and this adds three rules on top.
 *  - The club you just left is never in it.
 *  - Left straight after a 'badly' season, however it ended: nothing above
 *    BADLY_FIRED_CEILING.
 *  - Won a title in the seat you walked away from, and your last season
 *    there was not 'badly': at least one offer at your level or above, in the
 *    first feed only. A year out after that is the engine's own idle cut.
 */
export function seatOffers(
  pack: GmSeatPack, teams: SeatTeam[], c: GmCareer, season: number,
  rng: () => number, champion: string | null = null,
): SeatOffer[] {
  const last = currentStint(c);
  const tiers = leagueTiers(teams);
  const profile = careerProfile(c, tiers);
  const level = profile.lastTier;
  const topAllowed: ClubTier = lastGradeOf(last) === 'badly' ? BADLY_FIRED_CEILING : 1;
  const clubs: OfferClub[] = teams
    .filter(t => t.id !== last.team)
    .map(t => ({ name: t.id, country: SEAT_COUNTRY, tier: tiers.get(t.id)!, league: pack.id, budget: 0 }))
    .filter(club => club.tier >= topAllowed);
  const offers = generateJobOffers(profile, clubs, rng)
    .map(o => toSeatOffer(pack, teams, o.club, o.tier, o.keenness, c, season, champion, rng));

  const walkedAWinner = last.ended === 'walked' && last.grades.includes('title') && lastGradeOf(last) !== 'badly';
  if (walkedAWinner && c.seasonsOut === 0 && !offers.some(o => o.tier <= level)) {
    /* The champion who walked. The nearest tier at or above his level, so it
       is a real step sideways or up, never a token offer from the bottom. */
    const fits = clubs.filter(club => club.tier <= level);
    if (fits.length) {
      const nearest = Math.max(...fits.map(club => club.tier));
      const pool = fits.filter(club => club.tier === nearest);
      const pick = pool[Math.floor(rng() * pool.length)];
      const keen = Math.round(Math.max(5, Math.min(100, managerStanding(profile))));
      offers.unshift(toSeatOffer(pack, teams, pick.name, pick.tier, keen, c, season, champion, rng));
    }
  }
  return offers;
}

/** The chance a big year draws a bid from above, by the grade that earned it. */
export const POACH_CHANCE: Partial<Record<FoGradeResult, number>> = { title: 0.6, overachieved: 0.35 };

/**
 * Part 3, the seat's own difference. In this game a college coach coming off
 * a title or a season that beat the ask can be bought out by a program one
 * tier up, and a pro GM never draws a bid. That is a game rule, not a claim
 * that real pro executives are never bought out: the flag is false on every
 * pro pack, and this is the only place that reads it.
 */
export function poachBid(
  pack: GmSeatPack, teams: SeatTeam[], c: GmCareer, season: number,
  rng: () => number, champion: string | null = null,
): SeatOffer | null {
  if (!pack.poachable) return null;
  const cur = currentStint(c);
  if (cur.ended) return null;
  const bigYear = lastGradeOf(cur) ?? 'met';
  const chance = POACH_CHANCE[bigYear];
  if (chance === undefined) return null;
  const tiers = leagueTiers(teams);
  const level = levelOf(cur, tiers);
  if (level === 1) return null;
  const above = teams.filter(t => t.id !== cur.team && tiers.get(t.id) === level - 1);
  if (!above.length || rng() >= chance) return null;
  const pick = above[Math.floor(rng() * above.length)];
  const keen = Math.round(Math.max(5, Math.min(100, managerStanding(careerProfile(c, tiers)))));
  const offer = toSeatOffer(pack, teams, pick.id, tiers.get(pick.id)!, keen, c, season, champion, rng);
  /* Why a program pays a buyout: the year that earned it, never the feed's
     fallback about nobody else biting. */
  const reason = bigYear === 'title'
    ? `They will pay the buyout to get the coach who just won ${pack.words.title}.`
    : 'They will pay the buyout: your last season beat the ask, and they saw it.';
  return { ...offer, reason, buyout: true };
}

/* ---------------- taking the job ---------------- */

/** The part of a GM save the seat touches. Everything else in the save (the
    league, its season, its champions, its history) is carried over as is. */
export interface SeatSave {
  myTeam: string;
  /* Optional, as the four front office saves declare them (Round 180). */
  trust?: number;
  fired?: boolean;
  mandate?: OwnerMandate | null;
  /* The press state those saves keep (Round 192). It was said at the old
     club, so it does not follow you to the new one. */
  pressTilt?: -1 | 0 | 1;
  seasonTradeLine?: string | null;
}

/** Take an offer inside the same league: a new team, fresh trust, that
    club's ask, no press state carried over from the old club, and the rest
    of the save untouched. */
export function takeSeat<S extends SeatSave>(save: S, offer: SeatOffer): S {
  return { ...save, myTeam: offer.teamId, trust: FO_TRUST_START, fired: false, mandate: offer.ask, pressTilt: 0 as const, seasonTradeLine: null };
}

/** The career side of taking an offer: a seat still held closes first (as
    'poached' on a buyout, 'walked' otherwise), then the new stint opens. */
export function startSeatStint(c: GmCareer, offer: SeatOffer, season: number): GmCareer {
  const closed = currentStint(c).ended ? c : endSeatStint(c, offer.buyout ? 'poached' : 'walked');
  return {
    ...closed,
    stints: [...closed.stints, { team: offer.teamId, tier: offer.tier, from: season, grades: [] }],
    seasonsOut: 0,
  };
}

/** The market line, for whatever ended the last stint: a sacking says who
    made the call, a walk says you chose it, a contract that ran out says so.
    Honest about the phone too: it says who called, or that nobody did, and
    never promises a call the market did not make. */
export function seatExitLine(pack: GmSeatPack, c: GmCareer, offerCount: number): string {
  const s = currentStint(c);
  const seasons = s.grades.length;
  const titles = s.grades.filter(g => g === 'title').length;
  const record = `${seasons} season${seasons === 1 ? '' : 's'}`
    + ` and ${titles === 0 ? 'no titles' : `${titles} title${titles === 1 ? '' : 's'}`}`;
  const head = s.ended === 'walked' ? `You walked away on your own terms after ${record}.`
    : s.ended === 'expired' ? `Your contract ran out after ${record}, and nobody pushed either way.`
    : s.ended === 'poached' ? `You took the buyout after ${record}.`
    : `${cap(pack.upstairs)} made the call: you are out after ${record}.`;
  const tail = offerCount === 0
    ? ' Nobody has called yet. Sit the year out and see who remembers you.'
    : ` ${offerCount} ${offerCount === 1 ? pack.seat : pack.seats} called.`;
  return head + tail;
}
