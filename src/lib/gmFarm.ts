/* Round 944: THE DEVELOPMENT TIER, one module for the four GM sims.

   A real front office lives below its active roster: the NFL practice squad,
   the NBA's two way men, MLB's 40 man roster and its option years, the NHL's
   farm club and its waiver exemptions. Before this round only the NFL sim had
   a tier (Round 828's practice squad, frontOffice.ts), and its own comment
   left the squad's size rules, sending men down and faster growth to this
   round. This is that, written once, with each league's rules as data.

   WHAT IT HOLDS. A FarmState sits beside a league save (the engines are not
   edited here; binding a board to it is a later round). Per club: the
   reserve list (the NFL keeps its own on team.practice, so the NFL entry has
   none), a small ledger per man (elevations, two way games, option years,
   NHL pro seasons and games), the ids the club lost on waivers, and the men
   up from the tier for this round only.

   THE MOVES. callUp and sendDown obey the sport's rules: a sent down MLB man
   spends an option year or, out of options, is designated and exposed to
   waivers; a sent down NHL man goes straight to the farm club only while he
   is exempt by age and games. coverInjuries fills an injured man's place
   from the tier, never by inventing anybody: the NFL elevates a practice
   squad man for the game (three times a season), the NBA activates a two
   way man (fifty games a season), MLB and the NHL call a man up while the
   injured one sits on the injured list. afterRound counts the games, sends
   the elevations back and returns a cover man once the injured man is fit.
   farmOffseason ages and grows the tier, faster for a young man who plays
   in it, and runs its contracts out. Waivers are gmWaivers.ts: a claimed man
   is gone for good, waivers are not loans.

   Every number with a source is two source verified and dated below. The
   game's own choices (how many men a club stocks, how much faster the tier
   grows a young man, which MLB round is September) are marked as the
   game's own, never as a rule.

   scripts/simGmFarm.mjs runs all of it on leagues built by the four real
   engines, read only, over ten seasons. */

/* Names for a stocked man come from the engine's own bank through foNames'
   uniqueName (each engine's genName), checked against everybody in the
   league and every tier, so no new name pool exists here. */
import { leagueNames } from './foNames';
import { makeIdMinter } from './entityIds';
import { runWaivers, recordLoss, waiverReturnRefusal, standing, type ClaimBasis } from './gmWaivers';

export type FarmSport = 'nfl' | 'nba' | 'mlb' | 'nhl';

/** The least a man needs to live in the tier: every engine's player has these. */
export interface FarmMan {
  id: string;
  name: string;
  pos: string;
  age: number;
  ovr: number;
  pot: number;
  salary: number;
  years: number;
  out: number;
}

/** How the tier covers an injury in each sport. */
export type CoverMode = 'elevate' | 'twoWay' | 'callUp';

/** One source behind a number: where it was read and when. */
export interface FarmSource { url: string; read: string; says: string }

export interface FarmRules {
  sport: FarmSport;
  /** What the sport calls the tier, for the screen. */
  tierName: string;
  cover: CoverMode;
  /** Most men on the tier list at once (NFL squad, NBA two way slots). Absent where a book limit governs instead. */
  tierCap?: number;
  /** NFL: places beyond tierCap that only a qualifying international man may fill. The game cannot tell who
      qualifies, so a dealt real squad keeps its extra man and the farm never fills the place itself. */
  tierExempt?: number;
  /** NFL: game day elevations per man per season before he must be signed. */
  elevationsPerSeason?: number;
  /** NFL: elevations per club per game. */
  elevationsPerGame?: number;
  /** NBA: the most standard contracts, beside the two way men. */
  standardMax?: number;
  /** NBA: games a two way man may be active for in a regular season. */
  twoWayGames?: number;
  /** MLB: the 40 man roster, the active roster and September's active roster. */
  fortyMan?: number;
  activeMax?: number;
  septemberActiveMax?: number;
  /** MLB: seasons in which a man may be optioned before he must clear waivers. */
  optionYears?: number;
  /** NHL: the most men under contract, active and farm club together. */
  contractLimit?: number;
  /** Injured men count against the active roster (NBA, NFL) or sit on an injured list beside it (MLB, NHL). */
  injuredCount: boolean;
  /** A man claimed on waivers goes to the claimer's active roster (else its tier, MLB's 40 man). */
  claimToActive: boolean;
  /** Where a man who clears waivers goes: back to his club's tier, or the free agent pool. */
  clearedTo: 'tier' | 'pool';
  /** Where a draftee lands. */
  drafteeTo: 'active' | 'tier';
  /** How the league measures "worst record" for the wire: winning share, or the NHL's share of possible points. */
  claimBasis: ClaimBasis;
  /** The engine already ages and grows the tier (the NFL practice squad lives on its team). */
  engineAgesTier: boolean;
  /** The oldest age at which the engine's own summer still grows a man with room (the game's own, read off each
      engine's offseason so the tier grows a man exactly as the active roster would). Unused where the engine ages the tier. */
  growUpTo: number;
  sources: Record<string, FarmSource[]>;
}

const READ = '2026-10-03';
const src = (url: string, says: string): FarmSource => ({ url, read: READ, says });

/* THE RULES, as data. The seasons modelled: NFL 2025 under the 2020 CBA's
   2022 practice squad terms, NBA 2026-27 under the 2023 CBA, MLB 2026, NHL
   under the 2013 CBA's waiver table (unchanged by the 2020 MOU, per the 2023
   CapFriendly copy below). Wikipedia was read as a spot check only and is
   never one of the two. Left out because they are not modelled: the NFL's
   six veteran places and the squad eligibility rules; the NBA's 90 "under 15" games; MLB's fourth
   option year, the 20 day rule and the five options a season; the NHL's
   eleven game rule for 18 and 19 year olds, the ten game and 30 day re-entry
   window, and the 23 man active roster (the game's own NHL roster is
   NHL_ROSTER_MAX, which the engine holds). Also left out, and so
   simplified: practice squad deals never run out here (the NFL engine
   keeps its squad men until it cuts them); NHL games for the exemption
   count the regular season only, though Article 13.4 counts the playoffs
   too; an MLB man who clears is always outrighted, though a man with three
   years of service or a previous outright may elect free agency instead;
   the leagues keep last season's order into the first weeks of a season,
   where the wire here reads last season only until a club has played;
   the NHL's tie breaks after winning share (shootout wins left out,
   head to head points, goal difference) are not kept by the engine, so
   wins and the abbreviation break the rest; and a free agent the farm
   signs in the summer joins an NHL farm club without passing waivers,
   where a real club would expose a veteran in camp. */
export const FARM_RULES: Record<FarmSport, FarmRules> = {
  nfl: {
    sport: 'nfl', tierName: 'Practice squad', cover: 'elevate',
    tierCap: 16, tierExempt: 1, elevationsPerSeason: 3, elevationsPerGame: 2,
    injuredCount: true, claimToActive: true, clearedTo: 'tier', drafteeTo: 'active', engineAgesTier: true, growUpTo: 0, claimBasis: 'winPct',
    sources: {
      tierCap: [
        src('https://www.si.com/nfl/bengals/news/nfl-makes-changes-to-practice-squad-rules-ahead-of-2022-season', 'NFL teams will be able to have 16 players on their practice squad (2022 changes).'),
        src('https://www.espn.com/nfl/story/_/id/38392717/all-32-practice-squads-include-international-player-24', 'Squads expand to 17 in 2024, the added place being one international player, so 16 otherwise.'),
      ],
      tierExempt: [
        src('https://web.archive.org/web/2024id_/https://operations.nfl.com/updates/football-ops/nfl-to-expand-practice-squad-to-include-one-international-player-for-all-32-clubs-in-2024/', 'Beginning in 2024 the practice squad expands to 17 if one player is a qualifying international player.'),
        src('https://www.espn.com/nfl/story/_/id/38392717/all-32-practice-squads-include-international-player-24', 'All practice squads include an international player from 2024, 17 players in all.'),
      ],
      elevationsPerSeason: [
        src('https://www.si.com/nfl/bengals/news/nfl-makes-changes-to-practice-squad-rules-ahead-of-2022-season', 'Players can be elevated up to three times during the year.'),
        src('https://profootballtalk.nbcsports.com/2022/09/17/browns-elevate-jordan-kunasyzk-roderick-perry-from-practice-squad/', 'After three regular season elevations he has to pass through waivers on his way back.'),
      ],
      elevationsPerGame: [
        src('https://profootballtalk.nbcsports.com/2022/09/17/browns-elevate-jordan-kunasyzk-roderick-perry-from-practice-squad/', 'Teams may bump two players per week from the practice squad for a game.'),
        src('https://www.sportingnews.com/us/nfl/news/nfl-practice-squad-salaries-rules-2021/1wt851t0mlm9c1amafmqrx6dll', 'Teams are allowed to promote two players to the active roster for game days.'),
      ],
      rivalSigning: [
        src('https://www.sportingnews.com/us/nfl/news/nfl-practice-squad-salaries-rules-2021/1wt851t0mlm9c1amafmqrx6dll', 'Practice squad players may sign with other teams, but only to their 53 man roster.'),
        src('https://www.sbnation.com/2016/9/3/12773904/nfl-practice-squad-players-roster-rules-eligibility-primer', 'A practice squad player can be signed by another team that adds him to its 53 man roster.'),
      ],
      claimOrder: [
        src('https://www.profootballrumors.com/waivers/', "Waiver priority is determined by the previous season's standings: the worst club first, the champion last."),
        src('https://www.profootballnetwork.com/nfl-waiver-order/', 'The NFL orders waiver claims in inverse order of the win-loss record.'),
      ],
    },
  },
  nba: {
    sport: 'nba', tierName: 'Two way', cover: 'twoWay',
    tierCap: 3, standardMax: 15, twoWayGames: 50,
    injuredCount: true, claimToActive: true, clearedTo: 'pool', drafteeTo: 'active', engineAgesTier: false, growUpTo: 24, claimBasis: 'winPct',
    sources: {
      tierCap: [
        src('https://gleague.nba.com/faq/', 'Since the 2023-24 season each team may have up to three players under two way contracts.'),
        src('https://www.hoopsrumors.com/2026/07/2026-27-nba-two-way-contract-tracker.html', 'Teams can carry up to three players on two way contracts (2026-27).'),
      ],
      standardMax: [
        src('https://gleague.nba.com/faq/', 'Up to three two way players, in addition to the maximum 15 players under Standard NBA Contracts.'),
        src('https://www.hoopsrumors.com/2026/07/2026-27-nba-two-way-contract-tracker.html', 'A team not carrying a full 15 man standard roster limits its two way men to 90 under 15 games.'),
      ],
      twoWayGames: [
        src('https://gleague.nba.com/faq/', 'Two way players spend not more than 50 games with their NBA team.'),
        src('https://www.hoopsrumors.com/2026/07/2026-27-nba-two-way-contract-tracker.html', 'Two way players can be active for up to 50 of the 82 regular season games.'),
      ],
      claimOrder: [
        src('https://www.hoopsrumors.com/hoops-rumors-glossary-waivers', "The worst record takes priority (before December 1, last season's records); a man nobody claims becomes a free agent."),
        src('http://www.cbafaq.com/salarycap17.htm', 'If more than one team claims a man on waivers, the team with the worst record gets him.'),
      ],
    },
  },
  mlb: {
    sport: 'mlb', tierName: '40 man and minors', cover: 'callUp',
    fortyMan: 40, activeMax: 26, septemberActiveMax: 28, optionYears: 3,
    injuredCount: false, claimToActive: false, clearedTo: 'tier', drafteeTo: 'tier', engineAgesTier: false, growUpTo: 25, claimBasis: 'winPct',
    sources: {
      fortyMan: [
        src('https://www.mlb.com/glossary/transactions/40-man-roster', 'To add a man to the 26 man roster he must be on the 40 man roster.'),
        src('https://www.blessyouboys.com/2020/6/29/21306077/roster-rules-for-the-2020-major-league-baseball-season', '40 man rosters, with up to 14 men not on the 26 on optional assignment.'),
      ],
      activeMax: [
        src('https://www.mlb.com/glossary/transactions/26-man-roster', 'The 26 man roster runs from Opening Day through August 31.'),
        src('https://www.espn.com/mlb/story/_/id/26259301/mlb-tweaks-some-rules-now-more-coming-20', 'Regular season rosters expand from 25 to 26 (2019 agreement, from 2020).'),
      ],
      septemberActiveMax: [
        src('https://www.mlb.com/glossary/transactions/26-man-roster', 'From September 1 through the end of the regular season clubs carry 28.'),
        src('https://www.espn.com/mlb/story/_/id/26259301/mlb-tweaks-some-rules-now-more-coming-20', 'September rosters contract to a maximum of 28.'),
      ],
      optionYears: [
        src('https://www.mlb.com/glossary/transactions/minor-league-options', 'Three options, one used per season; out of options a man is designated and must pass outright waivers.'),
        src('https://www.blessyouboys.com/2020/6/29/21306077/roster-rules-for-the-2020-major-league-baseball-season', 'Three years in which a man can be optioned; out of options he must clear waivers to go down.'),
      ],
      claimOrder: [
        /* One source: a second host was not found in the session that added it. Owed. */
        src('https://www.mlb.com/glossary/transactions/outright-waivers', 'Claiming priority is reverse winning percentage, ties to the lower percentage last season; a man who clears may be assigned outright.'),
      ],
    },
  },
  nhl: {
    sport: 'nhl', tierName: 'Farm club', cover: 'callUp',
    contractLimit: 50,
    injuredCount: false, claimToActive: true, clearedTo: 'tier', drafteeTo: 'tier', engineAgesTier: false, growUpTo: 23, claimBasis: 'pointsPct',
    sources: {
      contractLimit: [
        src('https://web.archive.org/web/2016id_/http://www.nhl.com/nhl/en/v3/ext/CBA2012/NHL_NHLPA_2013_CBA.pdf', 'Reserve List (a): not more than 50 players signed to an SPC.'),
        src('https://web.archive.org/web/2023id_/https://www.capfriendly.com/faq', 'Total NHL contracts per team = 50, two way deals and men in the minors included.'),
      ],
      exemption: [
        src('https://web.archive.org/web/2016id_/http://www.nhl.com/nhl/en/v3/ext/CBA2012/NHL_NHLPA_2013_CBA.pdf', 'Article 13.4, exempt players: years from signing and NHL games by age at signing.'),
        src('https://web.archive.org/web/2023id_/https://www.capfriendly.com/waivers-faq', 'The same table: a skater signed at 18 needs waivers after 160 NHL games or 5 seasons.'),
      ],
      claimOrder: [
        /* One source, the league's own agreement: a second host was not found in the session that added it. Owed. */
        src('https://web.archive.org/web/2016id_/http://www.nhl.com/nhl/en/v3/ext/CBA2012/NHL_NHLPA_2013_CBA.pdf', "Section 13.19: the lowest percentage of possible points; outside the regular season or before November 1, last season's final standing; ties to the lower winning percentage."),
      ],
    },
  },
};

/* NHL waiver exemption, Article 13.4 (sources above): by age at signing his
   first NHL contract, the seasons and the NHL games after which a man must
   pass waivers to be sent down, whichever comes first. 25 and over: one
   season, no games threshold. */
const NHL_EXEMPT_SKATER: Record<number, [number, number]> = { 18: [5, 160], 19: [4, 160], 20: [3, 160], 21: [3, 80], 22: [3, 70], 23: [3, 60], 24: [2, 60] };
const NHL_EXEMPT_GOALIE: Record<number, [number, number]> = { 18: [6, 80], 19: [5, 80], 20: [4, 80], 21: [4, 60], 22: [4, 60], 23: [3, 60], 24: [2, 60] };

/** [seasons, games] of exemption for a man who signed at this age. Games is Infinity at 25 and over. */
export function nhlExemption(signedAge: number, goalie: boolean): [number, number] {
  const a = Math.max(18, Math.floor(signedAge));
  if (a >= 25) return [1, Infinity];
  return (goalie ? NHL_EXEMPT_GOALIE : NHL_EXEMPT_SKATER)[a];
}

/* THE GAME'S OWN CHOICES, not rules. */
/** Men a club's tier is filled to each summer (a new NFL league opens with its real squads). MLB: on the 40, then off it. */
export const FARM_STOCK: Record<FarmSport, { on: number; off: number }> = {
  nfl: { on: 16, off: 0 }, nba: { on: 3, off: 0 }, mlb: { on: 10, off: 6 }, nhl: { on: 8, off: 0 },
};
/** MLB minor leaguers off the 40 man a club keeps; real systems carry far more, the game keeps the best dozen. */
export const MLB_OFF40_CAP = 12;
/** A man this age or younger who plays in the tier grows faster there. */
export const TIER_YOUNG_AGE = 23;
/** The extra point a season the tier gives him, on top of normal growth. */
export const TIER_GROWTH_BONUS = 1;
/** MLB plays 27 rounds of six games; September 1 falls about game 135 of 162, so round 23. */
export const MLB_SEPTEMBER_FROM_ROUND = 23;
/** NFL: the chance a week that a rival with room signs a practice squad man who would start for it. */
export const NFL_POACH_CHANCE = 0.03;

/** Per man, only what his sport needs. Every field optional so an empty ledger is a valid one. */
export interface FarmLedger {
  /** NFL: game day elevations this season. */
  elev?: number;
  /** NBA: games active as a two way man this season. */
  twGames?: number;
  /** MLB: option years spent. */
  optUsed?: number;
  /** MLB: the season the last option year was spent (another send down that season is free). */
  optSeason?: number;
  /** MLB: in the system but not on the 40 man (a draftee, or outrighted). */
  off40?: boolean;
  /** NHL: age when he signed his first contract. */
  signedAge?: number;
  /** NHL: seasons since that signing, this one counted. */
  proSeasons?: number;
  /** NHL: NHL games played. */
  nhlGames?: number;
  /** Up from the tier in place of this injured man; he goes back when the man is fit. */
  coverFor?: string;
}

export interface FarmClub<P extends FarmMan = FarmMan> {
  /** The tier list. Absent on the NFL, whose squad is the engine's team.practice. */
  reserve?: P[];
  ledger: Record<string, FarmLedger>;
  /** Ids this club lost on waivers. He never comes back: waivers are not loans. */
  lost: string[];
  /** Ids up from the tier for this round only (NFL elevations, NBA two way games). */
  up: string[];
  /** Last season's final standing on the league's claim measure, kept at closeSeason: the engines zero the record in
      their offseason, and the wire reads this until the club plays again. Absent in a new league and an old save. */
  prev?: number;
}

export interface FarmState<P extends FarmMan = FarmMan> {
  v: 1;
  sport: FarmSport;
  season: number;
  clubs: Record<string, FarmClub<P>>;
}

/** One club as the farm sees it for one step: the engine's own arrays, mutated in place, never reassigned. */
export interface FarmSeat<P extends FarmMan = FarmMan> {
  abbr: string;
  players: P[];
  reserve: P[];
  club: FarmClub<P>;
  /** Wins and losses, for the claim order. Losses are regulation losses; the NHL's overtime losses go in otLosses. */
  wins: number;
  losses: number;
  otLosses?: number;
}

/** What a step did, for the screen and the harness. */
export interface FarmEvent {
  kind: 'elevate' | 'twoWay' | 'callUp' | 'sendDown' | 'option' | 'waived' | 'claimed' | 'cleared' | 'poached' | 'released' | 'draftee' | 'grew';
  team: string;
  playerId: string;
  player: string;
  /** The club that claimed or signed him, for claimed and poached. */
  to?: string;
  /** The injured man he covers. */
  coverFor?: string;
}

/** Round 568's rule: an id unique by construction, never a bare counter. */
export const farmId = makeIdMinter('gf');

export function newFarmState<P extends FarmMan = FarmMan>(sport: FarmSport, season: number, abbrs: string[]): FarmState<P> {
  const clubs: Record<string, FarmClub<P>> = {};
  for (const a of abbrs) clubs[a] = sport === 'nfl' ? { ledger: {}, lost: [], up: [] } : { reserve: [], ledger: {}, lost: [], up: [] };
  return { v: 1, sport, season, clubs };
}

/** Every name in the league and in every tier, for a new man's uniqueName book. */
export function farmNames(state: FarmState, league: Parameters<typeof leagueNames>[0]): Set<string> {
  const out = leagueNames(league);
  for (const c of Object.values(state.clubs)) for (const p of c.reserve ?? []) out.add(p.name);
  return out;
}

export function ledgerOf(club: FarmClub, id: string): FarmLedger {
  return (club.ledger[id] ??= {});
}

/* ---------- loading: a corrupt block resets alone ---------- */

const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const isStr = (x: unknown): x is string => typeof x === 'string' && x.length > 0;

export function isFarmMan(x: unknown): x is FarmMan {
  const p = x as FarmMan;
  return !!p && typeof p === 'object' && isStr(p.id) && isStr(p.name) && isStr(p.pos)
    && isNum(p.age) && isNum(p.ovr) && isNum(p.pot) && isNum(p.salary) && isNum(p.years) && isNum(p.out);
}

function isLedger(x: unknown): x is FarmLedger {
  if (!x || typeof x !== 'object' || Array.isArray(x)) return false;
  for (const [k, v] of Object.entries(x as Record<string, unknown>)) {
    if (k === 'off40') { if (typeof v !== 'boolean') return false; } else if (k === 'coverFor') { if (!isStr(v)) return false; } else if (!isNum(v)) return false;
  }
  return true;
}

/**
 * One club's block, part by part. Each part that is broken resets alone and
 * is named in `reset` (`ABC.lost`, `ABC.ledger.<id>`, `ABC.reserve.<n>`), so a
 * bad ledger row never takes the lost list (the only memory of a claim) or
 * the tier men (who live nowhere else) with it. Null when it is not a club.
 */
function loadClub<P extends FarmMan>(x: unknown, sport: FarmSport, abbr: string, reset: string[]): FarmClub<P> | null {
  const c = x as FarmClub<P>;
  if (!c || typeof c !== 'object' || Array.isArray(c)) return null;
  const strs = (v: unknown, part: string): string[] => {
    if (!Array.isArray(v)) { reset.push(`${abbr}.${part}`); return []; }
    const ok = v.filter(isStr);
    if (ok.length !== v.length) reset.push(`${abbr}.${part}`);
    return ok;
  };
  const out: FarmClub<P> = { ledger: {}, lost: strs(c.lost, 'lost'), up: strs(c.up, 'up') };
  if (!c.ledger || typeof c.ledger !== 'object' || Array.isArray(c.ledger)) reset.push(`${abbr}.ledger`);
  else for (const [id, row] of Object.entries(c.ledger)) {
    if (isLedger(row)) out.ledger[id] = row;
    else reset.push(`${abbr}.ledger.${id}`);
  }
  if (sport !== 'nfl') {
    if (!Array.isArray(c.reserve)) { reset.push(`${abbr}.reserve`); out.reserve = []; }
    else {
      out.reserve = [];
      c.reserve.forEach((p, i) => { if (isFarmMan(p)) out.reserve!.push(p); else reset.push(`${abbr}.reserve.${i}`); });
    }
  }
  if (c.prev !== undefined) {
    if (isNum(c.prev)) out.prev = c.prev;
    else reset.push(`${abbr}.prev`);
  }
  return out;
}

/**
 * Read a saved farm block. A save from before this round has none and gets a
 * fresh state. A broken part of a club resets alone and is named in `reset`;
 * a club that is not an object at all resets whole under its abbreviation;
 * a whole block of the wrong shape (or another sport's) resets whole.
 */
export function loadFarmState<P extends FarmMan = FarmMan>(raw: unknown, sport: FarmSport, season: number, abbrs: string[]): { state: FarmState<P>; reset: string[] } {
  const fresh = newFarmState<P>(sport, season, abbrs);
  const r = raw as FarmState<P>;
  if (raw === undefined || raw === null) return { state: fresh, reset: [] };
  if (typeof raw !== 'object' || r.v !== 1 || r.sport !== sport || !r.clubs || typeof r.clubs !== 'object') return { state: fresh, reset: ['all'] };
  const reset: string[] = [];
  const clubs: Record<string, FarmClub<P>> = {};
  for (const a of abbrs) {
    const c = r.clubs[a] === undefined ? null : loadClub<P>(r.clubs[a], sport, a, reset);
    if (c) clubs[a] = c;
    else { clubs[a] = fresh.clubs[a]; reset.push(a); }
  }
  return { state: { v: 1, sport, season: isNum(r.season) ? r.season : season, clubs }, reset };
}

/* ---------- counting ---------- */

/** The active roster cap this period: MLB's 26, 28 from September; every other sport the engine's own. */
export function activeMaxFor(rules: FarmRules, engineMax: number, september = false): number {
  if (rules.sport === 'mlb') return september ? rules.septemberActiveMax! : rules.activeMax!;
  return engineMax;
}

/** Men who count against the active roster: not up for this round only, and healthy unless injured men count. */
export function activeCount(rules: FarmRules, seat: FarmSeat): number {
  const up = new Set(seat.club.up);
  return seat.players.filter(p => !up.has(p.id) && (rules.injuredCount || p.out <= 0)).length;
}

/** MLB: the active roster, the injured and every optioned man; never the men off the 40. */
export function fortyManCount(seat: FarmSeat): number {
  return seat.players.length + seat.reserve.filter(p => !seat.club.ledger[p.id]?.off40).length;
}

/** NHL: every man under contract, active and farm club together. */
export function contractCount(seat: FarmSeat): number {
  return seat.players.length + seat.reserve.length;
}

/** Every cap the tier owns that this club breaks right now. Empty when it holds. */
export function farmCapBreaches(rules: FarmRules, seat: FarmSeat, activeMax: number): string[] {
  const out: string[] = [];
  const l = seat.club.ledger;
  const tierMost = (rules.tierCap ?? Infinity) + (rules.tierExempt ?? 0);
  if (seat.reserve.length > tierMost) out.push(`${seat.abbr} ${rules.tierName} ${seat.reserve.length} over ${tierMost}`);
  if (rules.fortyMan !== undefined && fortyManCount(seat) > rules.fortyMan) out.push(`${seat.abbr} 40 man at ${fortyManCount(seat)}`);
  if (rules.sport === 'mlb' && activeCount(rules, seat) > activeMax) out.push(`${seat.abbr} active ${activeCount(rules, seat)} over ${activeMax}`);
  if (rules.sport === 'mlb' && seat.reserve.filter(p => l[p.id]?.off40).length > MLB_OFF40_CAP) out.push(`${seat.abbr} off the 40 over ${MLB_OFF40_CAP}`);
  if (rules.contractLimit !== undefined && contractCount(seat) > rules.contractLimit) out.push(`${seat.abbr} contracts ${contractCount(seat)} over ${rules.contractLimit}`);
  if (rules.elevationsPerGame !== undefined && seat.club.up.length > rules.elevationsPerGame) out.push(`${seat.abbr} ${seat.club.up.length} elevated in one game`);
  for (const [id, e] of Object.entries(l)) {
    if (rules.elevationsPerSeason !== undefined && (e.elev ?? 0) > rules.elevationsPerSeason) out.push(`${seat.abbr} ${id} elevated ${e.elev} times`);
    if (rules.twoWayGames !== undefined && (e.twGames ?? 0) > rules.twoWayGames) out.push(`${seat.abbr} ${id} two way games ${e.twGames}`);
    if (rules.optionYears !== undefined && (e.optUsed ?? 0) > rules.optionYears) out.push(`${seat.abbr} ${id} options ${e.optUsed}`);
  }
  return out;
}

/* ---------- who is who ---------- */

/** The group a cover man must share with the man he covers. NBA: anybody. */
export function posGroup(sport: FarmSport, pos: string): string {
  if (sport === 'mlb') return pos === 'SP' ? 'SP' : pos === 'RP' || pos === 'CL' ? 'RP' : pos === 'C' ? 'C' : 'H';
  if (sport === 'nhl') return pos === 'G' ? 'G' : 'S';
  if (sport === 'nba') return 'B';
  return pos;
}

/** MLB: can he be optioned this season without waivers? A man the farm has no
    record of is taken as out of options at 27 or older and holding all three
    younger (the game's own default: five seasons of service usually spend
    them by then). A second send down in a season he already spent one on is free. */
export function mlbHasOptions(rules: FarmRules, l: FarmLedger | undefined, man: FarmMan, season: number): boolean {
  if (l?.optSeason === season) return true;
  const used = l?.optUsed ?? (man.age >= 27 ? rules.optionYears! : 0);
  return used < rules.optionYears!;
}

/** NHL: can he go to the farm club without waivers? A man with no signing
    on record is a veteran here, never exempt (the game's own default). */
export function nhlExempt(l: FarmLedger | undefined, man: FarmMan): boolean {
  if (l?.signedAge === undefined) return false;
  const [seasons, games] = nhlExemption(l.signedAge, man.pos === 'G');
  return (l.proSeasons ?? 1) <= seasons && (l.nhlGames ?? 0) < games;
}

/** Would this club's sim be better with him? He must beat its worst healthy man in his group. */
export function isUpgrade(sport: FarmSport, players: FarmMan[], man: FarmMan): boolean {
  const g = posGroup(sport, man.pos);
  const same = players.filter(p => p.out <= 0 && posGroup(sport, p.pos) === g);
  if (!same.length) return true;
  return man.ovr > Math.min(...same.map(p => p.ovr)) + 1;
}

/* ---------- the moves ---------- */

export interface FarmCtx<P extends FarmMan = FarmMan> {
  rules: FarmRules;
  seats: FarmSeat<P>[];
  /** The engine's own active cap for this club (MLB's comes from activeMaxFor). */
  activeMax: (seat: FarmSeat<P>) => number;
  /** The league's free agent pool, where a released or cleared man goes. */
  pool: P[];
  season: number;
  events: FarmEvent[];
  /** The room, $M, this club has under its engine's cap for this man (the board binds capRoom, nhlCapRoom, or the
      NBA's room with its minimum exception). A call up and a claim add his salary to the club's payroll, so neither
      may take a club past it. Absent, no cap is applied (MLB's line is a luxury tax, not a cap on a call up). */
  capRoom?: (seat: FarmSeat<P>, man: FarmMan) => number;
}

/** Why this club cannot fit his salary under its cap, or null. */
export function capShort<P extends FarmMan>(ctx: FarmCtx<P>, seat: FarmSeat<P>, man: FarmMan): string | null {
  if (!ctx.capRoom) return null;
  const room = ctx.capRoom(seat, man);
  if (man.salary <= room) return null;
  return `Need $${Math.round((man.salary - room) * 10) / 10}M more cap room to call him up.`;
}

const ev = (kind: FarmEvent['kind'], team: string, p: FarmMan, extra: Partial<FarmEvent> = {}): FarmEvent => ({ kind, team, playerId: p.id, player: p.name, ...extra });

/** A seat as the wire reads it: this season's record, and last season's standing from the farm's own memory. */
const wireClub = <P extends FarmMan>(seat: FarmSeat<P>) => ({ seat, abbr: seat.abbr, wins: seat.wins, losses: seat.losses, otLosses: seat.otLosses, prev: seat.club.prev });

/** Offer a man to these seats in the league's claim order; the first that wants him, or null. */
function offer<P extends FarmMan>(ctx: FarmCtx<P>, seats: FarmSeat<P>[], fromAbbr: string, wants: (s: FarmSeat<P>) => boolean): FarmSeat<P> | null {
  return runWaivers(seats.map(wireClub), fromAbbr, c => wants(c.seat), ctx.rules.claimBasis).claimer?.seat ?? null;
}

/** Why this man cannot come up to the active roster right now, or null. */
export function callUpRefusal<P extends FarmMan>(ctx: FarmCtx<P>, seat: FarmSeat<P>, id: string): string | null {
  const p = seat.reserve.find(x => x.id === id);
  if (!p) return `He is not on your ${ctx.rules.tierName.toLowerCase()} list.`;
  if (p.out > 0) return 'He is hurt.';
  if (activeCount(ctx.rules, seat) >= ctx.activeMax(seat)) return `Your active roster is full at ${ctx.activeMax(seat)}.`;
  if (ctx.rules.fortyMan !== undefined && seat.club.ledger[id]?.off40 && fortyManCount(seat) >= ctx.rules.fortyMan) return 'Your 40 man roster is full. Somebody has to come off it first.';
  return capShort(ctx, seat, p);
}

/** Up for good (until sent down). Moves him from the tier to the active roster. */
export function callUp<P extends FarmMan>(ctx: FarmCtx<P>, seat: FarmSeat<P>, id: string, coverFor?: string): boolean {
  if (callUpRefusal(ctx, seat, id)) return false;
  const [p] = seat.reserve.splice(seat.reserve.findIndex(x => x.id === id), 1);
  seat.players.push(p);
  const l = ledgerOf(seat.club, id);
  delete l.off40;
  if (coverFor) l.coverFor = coverFor;
  ctx.events.push(ev('callUp', seat.abbr, p, coverFor ? { coverFor } : {}));
  return true;
}

/** Could this club claim him: room under its caps, need at his position, and never a man it lost before. */
export function canClaim<P extends FarmMan>(ctx: FarmCtx<P>, seat: FarmSeat<P>, man: P, hasOptions: boolean): boolean {
  const r = ctx.rules;
  if (waiverReturnRefusal(seat.club.lost, man.id)) return false;
  if (!isUpgrade(r.sport, seat.players, man)) return false;
  if (capShort(ctx, seat, man)) return false;
  if (r.contractLimit !== undefined && contractCount(seat) >= r.contractLimit) return false;
  if (r.fortyMan !== undefined) {
    if (fortyManCount(seat) >= r.fortyMan) return false;
    /* Out of options he has to stay on the claimer's active roster. */
    return hasOptions || activeCount(r, seat) < ctx.activeMax(seat);
  }
  return activeCount(r, seat) < ctx.activeMax(seat);
}

/** Men on the tier list, counting the ones up for this round only (they come back to it after the game). */
export const tierLoad = (seat: FarmSeat): number => seat.reserve.length + seat.club.up.length;

/** Would a man who clears waivers have a place in this club's tier? Else he goes to the free agent pool. */
export function clearedRoom(r: FarmRules, seat: FarmSeat): boolean {
  return r.clearedTo === 'tier'
    && (r.tierCap === undefined || tierLoad(seat) < r.tierCap)
    && (r.fortyMan === undefined || seat.reserve.filter(p => seat.club.ledger[p.id]?.off40).length < MLB_OFF40_CAP)
    && (r.contractLimit === undefined || contractCount(seat) < r.contractLimit);
}

/** A full capped tier (the NFL squad): the lowest rated men not up for the game, released so a man who clears has a place. */
export function tierRoomCuts<P extends FarmMan>(r: FarmRules, seat: FarmSeat<P>): P[] {
  if (r.tierCap === undefined || r.clearedTo !== 'tier') return [];
  const n = tierLoad(seat) - r.tierCap + 1;
  if (n <= 0) return [];
  return seat.reserve.filter(p => !seat.club.up.includes(p.id)).sort((a, b) => a.ovr - b.ovr || a.id.localeCompare(b.id)).slice(0, n);
}

/**
 * Expose a man already taken off his club's roster to the wire. Claimed, he
 * joins the claimer with his ledger and his old club records the loss for
 * good. Cleared, he goes where his sport sends a cleared man.
 */
export function waive<P extends FarmMan>(ctx: FarmCtx<P>, from: FarmSeat<P>, man: P): 'claimed' | 'cleared' {
  const r = ctx.rules;
  const ledger = { ...(from.club.ledger[man.id] ?? {}) };
  delete ledger.coverFor;
  delete from.club.ledger[man.id];
  ctx.events.push(ev('waived', from.abbr, man));
  const opts = r.sport === 'mlb' && mlbHasOptions(r, ledger, man, ctx.season);
  const claimer = offer(ctx, ctx.seats, from.abbr, s => canClaim(ctx, s, man, opts));
  if (claimer) {
    recordLoss(from.club.lost, man.id);
    delete ledger.off40;
    claimer.club.ledger[man.id] = ledger;
    if (r.claimToActive || !opts) claimer.players.push(man);
    else claimer.reserve.push(man);
    ctx.events.push(ev('claimed', from.abbr, man, { to: claimer.abbr }));
    return 'claimed';
  }
  ctx.events.push(ev('cleared', from.abbr, man));
  /* A capped tier (the NFL squad) makes room for him, the way a club cuts a squad man to keep the one who cleared. */
  for (const p of tierRoomCuts(r, from)) {
    from.reserve.splice(from.reserve.indexOf(p), 1);
    delete from.club.ledger[p.id];
    ctx.pool.push({ ...p, years: 1 });
    ctx.events.push(ev('released', from.abbr, p));
  }
  if (clearedRoom(r, from)) {
    from.reserve.push(man);
    /* MLB: an outright assignment takes him off the 40 man. */
    from.club.ledger[man.id] = r.sport === 'mlb' ? { ...ledger, off40: true } : ledger;
  } else {
    ctx.pool.push({ ...man, years: 1 });
    ctx.events.push(ev('released', from.abbr, man));
  }
  return 'cleared';
}

/** Why this man cannot go down to the tier right now, or null. */
export function sendDownRefusal<P extends FarmMan>(ctx: FarmCtx<P>, seat: FarmSeat<P>, id: string): string | null {
  const p = seat.players.find(x => x.id === id);
  if (!p) return 'He is not on your active roster.';
  if (ctx.rules.sport === 'nba') return 'A standard contract stays with the big club here. Only two way men move between.';
  if (seat.club.up.includes(id)) return 'He is only up for this game. He goes back on his own.';
  return null;
}

/** What sending him down would do, for the button: optioned, exempt, or exposed to waivers. */
export function sendDownRoute<P extends FarmMan>(ctx: FarmCtx<P>, seat: FarmSeat<P>, p: P): 'option' | 'exempt' | 'waivers' {
  const l = seat.club.ledger[p.id];
  if (ctx.rules.sport === 'mlb') return mlbHasOptions(ctx.rules, l, p, ctx.season) ? 'option' : 'waivers';
  if (ctx.rules.sport === 'nhl') return nhlExempt(l, p) ? 'exempt' : 'waivers';
  return 'waivers';
}

/**
 * Down to the tier. MLB spends an option year (one per season) or, out of
 * options, designates him and exposes him to waivers. The NHL sends an
 * exempt man straight down and exposes everybody else. The NFL waives him
 * and a man who clears joins the practice squad.
 */
export function sendDown<P extends FarmMan>(ctx: FarmCtx<P>, seat: FarmSeat<P>, id: string): 'option' | 'exempt' | 'claimed' | 'cleared' | null {
  if (sendDownRefusal(ctx, seat, id)) return null;
  const idx = seat.players.findIndex(x => x.id === id);
  const p = seat.players[idx];
  const route = sendDownRoute(ctx, seat, p);
  seat.players.splice(idx, 1);
  const l = ledgerOf(seat.club, id);
  delete l.coverFor;
  if (route === 'waivers') return waive(ctx, seat, p);
  if (route === 'option' && l.optSeason !== ctx.season) {
    l.optUsed = (l.optUsed ?? (p.age >= 27 ? ctx.rules.optionYears! : 0)) + 1;
    l.optSeason = ctx.season;
  }
  seat.reserve.push(p);
  ctx.events.push(ev(route === 'option' ? 'option' : 'sendDown', seat.abbr, p));
  return route;
}

/* ---------- the season ---------- */

/** The best fit healthy man in the tier to stand in for this injured man: his position first, then his group. */
function coverCandidate<P extends FarmMan>(sport: FarmSport, reserve: P[], hurt: FarmMan, ok: (p: P) => boolean): P | undefined {
  const fit = reserve.filter(p => p.out <= 0 && ok(p) && posGroup(sport, p.pos) === posGroup(sport, hurt.pos));
  const exact = fit.filter(p => p.pos === hurt.pos);
  return (exact.length ? exact : fit).sort((a, b) => b.ovr - a.ovr || a.id.localeCompare(b.id))[0];
}

/**
 * Before a round: every injured man on a club with a tier is covered from
 * the tier if the rules allow it, and never by anybody new. The NFL elevates
 * for the game (three times a season a man, two a game), the NBA activates a
 * two way man (fifty games a season), MLB and the NHL call a man up while the
 * injured one sits on the injured list. Returns the injured men left
 * uncovered, by club, for the screen.
 */
export function coverInjuries<P extends FarmMan>(ctx: FarmCtx<P>, gamesThisRound: number): { team: string; playerId: string }[] {
  const r = ctx.rules;
  const short: { team: string; playerId: string }[] = [];
  for (const seat of ctx.seats) {
    const covered = new Set(Object.values(seat.club.ledger).map(l => l.coverFor).filter(Boolean) as string[]);
    const hurt = seat.players.filter(p => p.out > 0 && !covered.has(p.id) && !seat.club.up.includes(p.id)).sort((a, b) => b.ovr - a.ovr);
    for (const h of hurt) {
      let done = false;
      if (r.cover === 'elevate') {
        const p = seat.club.up.length < r.elevationsPerGame!
          ? coverCandidate(r.sport, seat.reserve, h, x => (seat.club.ledger[x.id]?.elev ?? 0) < r.elevationsPerSeason! && !capShort(ctx, seat, x)) : undefined;
        if (p) {
          seat.reserve.splice(seat.reserve.indexOf(p), 1);
          seat.players.push(p);
          seat.club.up.push(p.id);
          const l = ledgerOf(seat.club, p.id);
          l.elev = (l.elev ?? 0) + 1;
          ctx.events.push(ev('elevate', seat.abbr, p, { coverFor: h.id }));
          done = true;
        }
      } else if (r.cover === 'twoWay') {
        const p = coverCandidate(r.sport, seat.reserve, h, x => (seat.club.ledger[x.id]?.twGames ?? 0) + gamesThisRound <= r.twoWayGames!);
        if (p) {
          seat.reserve.splice(seat.reserve.indexOf(p), 1);
          seat.players.push(p);
          seat.club.up.push(p.id);
          const l = ledgerOf(seat.club, p.id);
          l.twGames = (l.twGames ?? 0) + gamesThisRound;
          ctx.events.push(ev('twoWay', seat.abbr, p, { coverFor: h.id }));
          done = true;
        }
      } else {
        const p = coverCandidate(r.sport, seat.reserve, h, x => !callUpRefusal(ctx, seat, x.id));
        if (p) done = callUp(ctx, seat, p.id, h.id);
      }
      if (!done) short.push({ team: seat.abbr, playerId: h.id });
    }
  }
  return short;
}

/**
 * After a round: the men up for this game only go back, NHL games are
 * counted for the men the farm tracks, and a cover man whose injured man is
 * fit again (or gone) goes back down by his sport's route, waivers and all.
 */
export function afterRound<P extends FarmMan>(ctx: FarmCtx<P>, gamesThisRound: number): void {
  for (const seat of ctx.seats) {
    for (const id of seat.club.up) {
      const i = seat.players.findIndex(p => p.id === id);
      if (i >= 0) seat.reserve.push(seat.players.splice(i, 1)[0]);
    }
    seat.club.up = [];
    /* The tier heals on the same clock as the roster. */
    for (const p of seat.reserve) if (p.out > 0) p.out -= 1;
    if (ctx.rules.sport === 'nhl') {
      for (const p of seat.players) {
        const l = seat.club.ledger[p.id];
        if (l?.signedAge !== undefined && p.out <= 0) l.nhlGames = (l.nhlGames ?? 0) + gamesThisRound;
      }
    }
    const backs = seat.players.filter(p => {
      const c = seat.club.ledger[p.id]?.coverFor;
      if (!c) return false;
      const hurt = seat.players.find(x => x.id === c);
      return !hurt || hurt.out <= 0;
    });
    for (const p of backs) {
      if (sendDownRefusal(ctx, seat, p.id)) delete seat.club.ledger[p.id].coverFor;
      else sendDown(ctx, seat, p.id);
    }
    /* A man back off the injured list needs his place: a cover man goes down
       first, and MLB, whose 26 the tier owns, then options its lowest rated. */
    let guard = seat.players.length;
    while (!ctx.rules.injuredCount && activeCount(ctx.rules, seat) > ctx.activeMax(seat) && guard-- > 0) {
      const healthy = seat.players.filter(p => p.out <= 0 && !seat.club.up.includes(p.id));
      const cover = healthy.filter(p => seat.club.ledger[p.id]?.coverFor);
      const pool = cover.length ? cover : ctx.rules.sport === 'mlb' ? healthy : [];
      const down = pool.sort((a, b) => a.ovr - b.ovr || a.id.localeCompare(b.id))[0];
      if (!down || !sendDown(ctx, seat, down.id)) break;
    }
  }
}

/**
 * The last round played: the men up for a game go back, and every cover man
 * goes down by his sport's route before the engine's offseason runs, so no
 * club carries a stand in into the summer over its roster limit.
 */
export function closeSeason<P extends FarmMan>(ctx: FarmCtx<P>): void {
  for (const seat of ctx.seats) {
    /* The final standing, kept for the wire: the engines zero the record in their offseason. A club that
       played nothing keeps what it had. */
    if (seat.wins + seat.losses + (seat.otLosses ?? 0) > 0)
    seat.club.prev = Math.round(standing(wireClub(seat), ctx.rules.claimBasis) * 10000) / 10000;
    for (const id of seat.club.up) {
      const i = seat.players.findIndex(p => p.id === id);
      if (i >= 0) seat.reserve.push(seat.players.splice(i, 1)[0]);
    }
    seat.club.up = [];
    for (const p of seat.players.filter(x => seat.club.ledger[x.id]?.coverFor)) {
      if (sendDownRefusal(ctx, seat, p.id)) delete seat.club.ledger[p.id].coverFor;
      else sendDown(ctx, seat, p.id);
    }
  }
}

/**
 * Opening day, MLB only: a man on the 40 man who is not on the 26 must be
 * optioned (or, out of options, designated). The engine carries up to 28 all
 * year, so the farm takes the club down to the active cap, lowest rated
 * first among the men `keep` does not name (the caller passes the men its
 * sim reads, so nobody it plays is sent down while anybody else could go).
 */
export function trimToActive<P extends FarmMan>(ctx: FarmCtx<P>, keep: (seat: FarmSeat<P>) => Set<string>): void {
  for (const seat of ctx.seats) {
    const kept = keep(seat);
    let guard = seat.players.length;
    while (activeCount(ctx.rules, seat) > ctx.activeMax(seat) && guard-- > 0) {
      const down = seat.players
        .filter(p => p.out <= 0 && !seat.club.up.includes(p.id))
        .sort((a, b) => Number(kept.has(a.id)) - Number(kept.has(b.id)) || a.ovr - b.ovr || a.id.localeCompare(b.id))[0];
      if (!down || !sendDown(ctx, seat, down.id)) break;
    }
    trimFortyMan(ctx, seat);
  }
}

/**
 * Opening day, any sport with a tier limit: a list dealt over it (the real
 * NFL week 4 squads carry an 18th man at two clubs) releases its lowest rated
 * men to the pool until it holds the limit and its exempt places. Not a cut:
 * a tier deal carries no dead money.
 */
export function trimTier<P extends FarmMan>(ctx: FarmCtx<P>): void {
  const most = (ctx.rules.tierCap ?? Infinity) + (ctx.rules.tierExempt ?? 0);
  for (const seat of ctx.seats) {
    while (seat.reserve.length > most) {
      const p = seat.reserve.filter(x => !seat.club.up.includes(x.id)).sort((a, b) => a.ovr - b.ovr || a.id.localeCompare(b.id))[0];
      if (!p) break;
      seat.reserve.splice(seat.reserve.indexOf(p), 1);
      delete seat.club.ledger[p.id];
      ctx.pool.push({ ...p, years: 1 });
      ctx.events.push(ev('released', seat.abbr, p));
    }
  }
}

/**
 * MLB: the 40 man holds all year. A club over it (the engine's own summer
 * refill, a free agent signed in season) takes its optioned man with the
 * lowest ceiling off it, and a man coming off the 40 is exposed to waivers:
 * claimed he is gone, cleared he is outrighted to the minors.
 */
export function trimFortyMan<P extends FarmMan>(ctx: FarmCtx<P>, seat: FarmSeat<P>): void {
  const cap = ctx.rules.fortyMan;
  if (cap === undefined) return;
  let guard = seat.reserve.length;
  while (fortyManCount(seat) > cap && guard-- > 0) {
    const off = seat.reserve
      .filter(p => !seat.club.ledger[p.id]?.off40)
      .sort((a, b) => a.pot - b.pot || a.ovr - b.ovr || a.id.localeCompare(b.id))[0];
    if (!off) break;
    seat.reserve.splice(seat.reserve.indexOf(off), 1);
    waive(ctx, seat, off);
  }
}

/**
 * NFL: a practice squad man may be signed by any rival to its 53 man roster.
 * Each week a squad man who would beat a rival's worst healthy man in his
 * group is signed, with NFL_POACH_CHANCE, by the first such rival with room
 * in the claim order. It is a signing, not a claim: nobody records a loss.
 */
export function rivalSignings<P extends FarmMan>(ctx: FarmCtx<P>, rng: () => number, userTeam?: string): void {
  if (ctx.rules.sport !== 'nfl') return;
  for (const seat of ctx.seats) {
    for (const p of [...seat.reserve]) {
      if (p.out > 0 || seat.club.up.includes(p.id) || rng() >= NFL_POACH_CHANCE) continue;
      /* A club that lost him on waivers never signs him back either. */
      const claimer = offer(ctx, ctx.seats.filter(s => s.abbr !== userTeam), seat.abbr,
        s => !waiverReturnRefusal(s.club.lost, p.id) && isUpgrade('nfl', s.players, p) && activeCount(ctx.rules, s) < ctx.activeMax(s) && !capShort(ctx, s, p));
      if (!claimer) continue;
      seat.reserve.splice(seat.reserve.indexOf(p), 1);
      delete seat.club.ledger[p.id];
      claimer.players.push(p);
      ctx.events.push(ev('poached', seat.abbr, p, { to: claimer.abbr }));
    }
  }
}

/**
 * A draftee lands where his sport sends him: the NFL and NBA to the active
 * roster, MLB to the minors off the 40 man, the NHL to the farm club on his
 * first contract (his exemption clock starts at his age today). Returns
 * where he went: 'pool' when the tier has no room under its caps.
 */
export function placeDraftee<P extends FarmMan>(ctx: FarmCtx<P>, seat: FarmSeat<P>, man: P): 'active' | 'tier' | 'pool' {
  const r = ctx.rules;
  if (r.drafteeTo === 'active') { seat.players.push(man); ctx.events.push(ev('draftee', seat.abbr, man)); return 'active'; }
  const off = seat.reserve.filter(p => seat.club.ledger[p.id]?.off40).length;
  const room = (r.sport !== 'mlb' || off < MLB_OFF40_CAP) && (r.contractLimit === undefined || contractCount(seat) < r.contractLimit)
    && (r.tierCap === undefined || seat.reserve.length < r.tierCap);
  if (!room) { ctx.pool.push({ ...man, years: 1 }); ctx.events.push(ev('released', seat.abbr, man)); return 'pool'; }
  seat.reserve.push(man);
  seat.club.ledger[man.id] = r.sport === 'mlb' ? { off40: true } : r.sport === 'nhl' ? { signedAge: man.age, proSeasons: 1 } : {};
  ctx.events.push(ev('draftee', seat.abbr, man));
  return 'tier';
}

/* ---------- stocking and the offseason ---------- */

export interface FarmStockOpts {
  rng: () => number;
  /** Every name in the league (farmNames), so a new man never shares one. */
  taken: Set<string>;
  /** The engine's own name maker (nbaGenName, mlbGenName, nhlGenName): foNames' uniqueName over a bank simInventedNames already checks. */
  genName: (rng: () => number, taken: Set<string>) => string;
  /** The engine's minimum deal, $M. */
  minSalary: number;
}

/** A young man for the tier, rated off the bottom of his club's own roster. */
function tierProspect<P extends FarmMan>(seat: FarmSeat<P>, o: FarmStockOpts): P {
  const ovrs = seat.players.map(p => p.ovr).sort((a, b) => a - b);
  const floor = ovrs.length ? ovrs[Math.floor(ovrs.length / 4)] : 65;
  const pos = seat.players.length ? seat.players[Math.floor(o.rng() * seat.players.length)].pos : 'F';
  const ovr = Math.max(50, floor - 4 - Math.floor(o.rng() * 6));
  return {
    id: farmId(), name: o.genName(o.rng, o.taken), pos,
    age: 19 + Math.floor(o.rng() * 4), ovr, pot: Math.min(95, ovr + 4 + Math.floor(o.rng() * 10)),
    salary: o.minSalary, years: 2, out: 0,
  } as P;
}

/** The pool men a tier signs first: young enough to still be developing, best ceiling first. */
export const TIER_POOL_AGE = 25;

/**
 * Fill a club's tier to the game's stock: an offseason signing or a new
 * league, never an injury. Young men in the free agent pool sign first (a
 * real squad fills from the men just cut), then the engine's own generated
 * prospects make up the rest.
 */
export function stockTier<P extends FarmMan>(ctx: FarmCtx<P>, seat: FarmSeat<P>, o: FarmStockOpts): number {
  const r = ctx.rules;
  const want = FARM_STOCK[r.sport];
  let added = 0;
  const fromPool = (): P | undefined => {
    const best = ctx.pool.filter(p => p.age <= TIER_POOL_AGE && p.out <= 0 && p.ovr < p.pot && !waiverReturnRefusal(seat.club.lost, p.id))
      .sort((a, b) => b.pot - a.pot || a.id.localeCompare(b.id))[0];
    if (best) ctx.pool.splice(ctx.pool.indexOf(best), 1);
    return best;
  };
  const offOf = () => seat.reserve.filter(p => seat.club.ledger[p.id]?.off40).length;
  const roomOn = () => (r.tierCap === undefined || seat.reserve.length < r.tierCap)
    && (r.fortyMan === undefined || fortyManCount(seat) < r.fortyMan)
    && (r.contractLimit === undefined || contractCount(seat) < r.contractLimit);
  while (seat.reserve.length - offOf() < want.on && roomOn()) {
    const signed = fromPool();
    const p = signed ?? tierProspect(seat, o);
    seat.reserve.push(p);
    /* A ledger row only where there is something to keep. Only a new prospect is on his first contract, so only
       his NHL exemption clock starts today; a man from the pool has signed before, and with no record of when he
       is a veteran here, never exempt (Article 13.4 runs the clock from the first contract). */
    if (r.sport === 'nhl' && !signed) seat.club.ledger[p.id] = { signedAge: p.age, proSeasons: 1 };
    added += 1;
  }
  while (offOf() < want.off && offOf() < MLB_OFF40_CAP) {
    const p = tierProspect(seat, o);
    seat.reserve.push(p);
    seat.club.ledger[p.id] = { off40: true };
    added += 1;
  }
  return added;
}

/**
 * The tier's summer, run after the engine's own offseason. It ages and grows
 * the tier (the NFL squad is aged by its engine, so there it only adds the
 * bonus), gives a young man who played in the tier TIER_GROWTH_BONUS more,
 * runs the tier's deals out (a young man with room to grow re-signs, anybody
 * else goes to the pool), clears the season's counters, keeps MLB's system
 * at its dozen and restocks. `season` is the new season.
 */
export function farmOffseason<P extends FarmMan>(state: FarmState<P>, ctx: FarmCtx<P>, o: FarmStockOpts): void {
  const r = ctx.rules;
  state.season = ctx.season;
  for (const seat of ctx.seats) {
    const keep: P[] = [];
    for (const p of seat.reserve) {
      const young = (r.engineAgesTier ? p.age - 1 : p.age) <= TIER_YOUNG_AGE;
      if (!r.engineAgesTier) {
        p.age += 1;
        p.out = 0;
        /* The engines' own summer growth for a man with room (nbaFrontOffice, mlbFrontOffice, nhlFrontOffice all
           use 1 + floor(rng * 3), each up to its own age, growUpTo), so the tier's edge for a young man is exactly
           TIER_GROWTH_BONUS and nobody grows slower in the tier than he would on the roster. */
        if (p.age <= r.growUpTo && p.ovr < p.pot) p.ovr = Math.min(p.pot, p.ovr + 1 + Math.floor(o.rng() * 3));
        else if (p.age >= 31) p.ovr = Math.max(50, p.ovr - 1 - Math.floor(o.rng() * 2));
      }
      if (young && p.ovr < p.pot) {
        p.ovr = Math.min(p.pot, p.ovr + TIER_GROWTH_BONUS);
        ctx.events.push(ev('grew', seat.abbr, p));
      }
      if (!r.engineAgesTier) {
        if (p.age >= 34) { delete seat.club.ledger[p.id]; continue; }
        p.years -= 1;
        if (p.years <= 0) {
          if (p.age <= 25 && p.ovr < p.pot) p.years = 2;
          else { delete seat.club.ledger[p.id]; ctx.pool.push({ ...p, years: 1 }); ctx.events.push(ev('released', seat.abbr, p)); continue; }
        }
      }
      keep.push(p);
    }
    seat.reserve.splice(0, seat.reserve.length, ...keep);
    /* MLB keeps its best dozen off the 40, by ceiling, and the 40 itself. */
    if (r.sport === 'mlb') {
      trimFortyMan(ctx, seat);
      const off = seat.reserve.filter(p => seat.club.ledger[p.id]?.off40).sort((a, b) => b.pot - a.pot || a.id.localeCompare(b.id));
      for (const p of off.slice(MLB_OFF40_CAP)) {
        seat.reserve.splice(seat.reserve.indexOf(p), 1);
        delete seat.club.ledger[p.id];
        ctx.pool.push({ ...p, years: 1 });
        ctx.events.push(ev('released', seat.abbr, p));
      }
    }
    const here = new Set([...seat.players, ...seat.reserve].map(p => p.id));
    for (const [id, l] of Object.entries(seat.club.ledger)) {
      if (!here.has(id)) { delete seat.club.ledger[id]; continue; }
      delete l.elev;
      delete l.twGames;
      delete l.coverFor;
      if (l.signedAge !== undefined) l.proSeasons = (l.proSeasons ?? 1) + 1;
      if (!Object.keys(l).length) delete seat.club.ledger[id];
    }
    seat.club.up = [];
    stockTier(ctx, seat, o);
  }
}

/* ---------- what the screen says ---------- */

/** One button: its words, a warning when the move can lose the man, and why it is greyed (or null). */
export interface FarmButton { id: string; label: string; warn?: string; refusal: string | null }

/** The send down button says exactly the route sendDown will take. simGmFarm section 7 holds the two together. */
export function farmSendDownButton<P extends FarmMan>(ctx: FarmCtx<P>, seat: FarmSeat<P>, p: P): FarmButton {
  const refusal = sendDownRefusal(ctx, seat, p.id);
  if (refusal) return { id: p.id, label: 'Send down', refusal };
  const route = sendDownRoute(ctx, seat, p);
  if (route === 'option') {
    const l = seat.club.ledger[p.id];
    if (l?.optSeason === ctx.season) return { id: p.id, label: 'Option him (already optioned this season, no year used)', refusal: null };
    const used = l?.optUsed ?? (p.age >= 27 ? ctx.rules.optionYears! : 0);
    return { id: p.id, label: `Option him (option year ${used + 1} of ${ctx.rules.optionYears})`, refusal: null };
  }
  if (route === 'exempt') return { id: p.id, label: 'Send to the farm club (waiver exempt)', refusal: null };
  return { id: p.id, label: 'Expose to waivers', warn: `Any club can claim him, worst record first. A claimed man is gone for good. ${clearedWords(ctx, seat, p)}`, refusal: null };
}

/** Where a man who clears waivers goes, in words, from the same test waive applies once he is off the roster. */
export function clearedWords<P extends FarmMan>(ctx: FarmCtx<P>, seat: FarmSeat<P>, p: P): string {
  const off = { ...seat, players: seat.players.filter(x => x.id !== p.id) };
  const cuts = tierRoomCuts(ctx.rules, off);
  if (cuts.length) {
    const who = cuts.length === 1 ? `${cuts[0].name}, your lowest rated squad man, is` : `your ${cuts.length} lowest rated squad men are`;
    return `If nobody claims him he goes to your ${ctx.rules.tierName.toLowerCase()}, and ${who} released to make room.`;
  }
  if (!clearedRoom(ctx.rules, off)) return 'If nobody claims him he becomes a free agent.';
  if (ctx.rules.fortyMan !== undefined) return 'If nobody claims him he is outrighted to the minors, off the 40 man.';
  return `If nobody claims him he goes to your ${ctx.rules.tierName.toLowerCase()}.`;
}

/** The call up button. An MLB man off the 40 has to be added to it first, and the button says so. */
export function farmCallUpButton<P extends FarmMan>(ctx: FarmCtx<P>, seat: FarmSeat<P>, p: P): FarmButton {
  const off = ctx.rules.sport === 'mlb' && !!seat.club.ledger[p.id]?.off40;
  const refusal = callUpRefusal(ctx, seat, p.id);
  /* A two way man called up is signed to a standard contract, and a standard contract never goes back down. */
  if (ctx.rules.cover === 'twoWay') {
    return { id: p.id, label: 'Sign to a standard contract', warn: 'For good: a standard contract stays with the big club, so he cannot go back to two way.', refusal };
  }
  return { id: p.id, label: off ? 'Add to the 40 man and call up' : 'Call up', refusal };
}

/** The tier's rules in plain words, for the panel and the board's how to play. */
export function farmRuleLines(rules: FarmRules): string[] {
  switch (rules.sport) {
    case 'nfl': return [
      `Up to ${rules.tierCap} on the practice squad, plus one place for an international player.`,
      `A squad man can be elevated for game day ${rules.elevationsPerSeason} times a season, ${rules.elevationsPerGame} a game. After that he has to be signed.`,
      'Any rival can sign a squad man to its active roster.',
    ];
    case 'nba': return [
      `Up to ${rules.tierCap} two way men beside the ${rules.standardMax} standard contracts.`,
      `A two way man can be active for ${rules.twoWayGames} games a season.`,
    ];
    case 'mlb': return [
      `${rules.activeMax} active (${rules.septemberActiveMax} from September), all of them on the ${rules.fortyMan} man roster.`,
      `A man can be optioned in ${rules.optionYears} seasons. Out of options he has to clear waivers to go down.`,
    ];
    default: return [
      `Up to ${rules.contractLimit} contracts, the farm club included.`,
      'A young man goes down without waivers until his exemption runs out, by his age when he signed and his games played.',
    ];
  }
}
