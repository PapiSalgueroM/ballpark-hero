/**
 * Round 204: the front office hub, as tiles.
 *
 * The four GM games (NFL, MLB, NBA, NHL front offices) all opened on the
 * same row of five word pills: Roster, Free agency, Trades, Play,
 * Standings. Five words tell you nothing. You had to tap Free agency to
 * find out whether anyone worth signing was sitting there, tap Roster to
 * find out that your best player was hurt, and tap Standings to find out
 * you had fallen out of the playoff places with four rounds left.
 *
 * Club Manager solved this in Round 74 with the owner's own rule: "make it
 * smaller and with boxes and when they open it takes u to see something
 * different". A box carries a live fact. This file is the part of that
 * pattern worth harnessing: given the state of any of the four leagues,
 * what should each box SAY, and which of them deserves the dot that means
 * look at me. No JSX here on purpose, so every line below is checkable by
 * simFoHub without a browser.
 *
 * Sport neutral by construction. The four engines have different state
 * shapes but the same bones: a roster of rated men on salaries, a pile of
 * free agents, a cap, a record, a fixture and a table. The boards flatten
 * their own state into FoHubFacts and this file does the rest, which is
 * why one change here lands on all four games at once.
 */
/* Round 631: the market box asks the same questions the sign path does. */
import { type CutLedger, rosterFullRefusal, signRefusal } from './frontOfficeCuts';

/** One man, reduced to the five things a hub box can care about. */
export interface FoHubPlayer {
  /** Round 631: optional, and needed only for the market's cut ledger check. */
  id?: string;
  name: string;
  pos: string;
  age: number;
  ovr: number;
  salary: number;
  /** Periods remaining unavailable (injured, suspended). 0 = ready. */
  out: number;
}

export type FoPanelKey = 'team' | 'market' | 'trade' | 'play' | 'standings';

export interface FoTile {
  key: FoPanelKey;
  icon: string;
  /** The word on the box. Kept stable because harnesses tap by it. */
  title: string;
  /** The headline fact. Never empty. */
  value: string;
  /** The second line. Never empty: an empty box looks broken. */
  sub: string;
  /** The pulse. True means something wants a decision from you. */
  accent: boolean;
}

export interface FoHubFacts {
  /** Roster and market, already flattened by the board. */
  roster: FoHubPlayer[];
  freeAgents: FoHubPlayer[];
  /** Money, in the units that sport's board prints ($M everywhere today). */
  capRoom: number;
  /** Record so far this season. */
  wins: number;
  losses: number;
  /** Where we are: period 1..periods, then the postseason above that. */
  period: number;
  periods: number;
  /** What the fourth box is called here. NFL says "This week". */
  playWord: string;
  /** The word for one unit of season: "week" in the NFL, "round" elsewhere. */
  periodWord: string;
  /**
   * Whether this sport gives you a named opponent each period. The NFL
   * board holds a real 17 game schedule, so it can; the other three
   * simulate a stretch of the league at a time and honestly have no single
   * fixture to name. Without this the basketball hub would claim a bye
   * week every round, which would be a lie the boxes told all season.
   */
  hasFixtures: boolean;
  /** The next fixture, if the schedule has one for us. */
  nextOpponent: { label: string; home: boolean } | null;
  /** What happened last time out. */
  lastResult: { won: boolean; us: number; them: number; opponent: string } | null;
  /** Our place in the table that decides the playoffs, 1 based. */
  place: number;
  /** How many of that table qualify. */
  cut: number;
  /** What that table is called, for the second line. */
  tableName: string;
  /** The most recent trade headline this season, if there was one. */
  tradeLine: string | null;
  /** Silverware so far, for the trade box when nothing else is happening. */
  titles: number;
  /**
   * Round 631: the team's cut ledger. A man it released this season sits in
   * the pool but its sign path refuses him, so the market box must never
   * offer him. Without this the box said the man you had just cut "fits your
   * room" on 32 of 32 NFL clubs.
   */
  ledger?: CutLedger;
  /** Round 631: the sport's roster ceiling, when its sign path has one. */
  rosterMax?: number;
  /**
   * Round 722: a sport with a luxury tax above its cap (the NBA today): the
   * bill the payroll would draw at season close and how far over the line it
   * sits. Absent on the three sports without one, whose boxes are unchanged.
   */
  tax?: { bill: number; over: number };
  /** Round 722: the roster floor the season cannot tip off below, when the sport has one. */
  rosterFloor?: number;
  /** Round 830 review: what the start of a season is called in this sport's
      roster line. "tip off" when absent, so the NBA's box reads as it did;
      the NHL passes "puck drop". */
  startWord?: string;
}

/**
 * Round 722: what the cap panel says under the payroll line, for a sport that
 * carries a tax or a tip off roster floor. Both halves optional, so a board
 * without either gets no lines and looks exactly as it did. The wording lives
 * here, not in the panel component, for the same reason the boxes' does.
 */
export interface FoTaxFacts {
  line: number;
  bill: number;
  /** Payroll less the line, negative when under it. */
  over: number;
  repeater: boolean;
  /** Last season's bill, held back from this season's room. */
  due: number;
  firstApron: number;
  secondApron: number;
  aboveFirst: boolean;
  aboveSecond: boolean;
  /** A save from before the sport had a tax, still in that season: nothing to project yet. */
  pending?: boolean;
}
export interface FoRosterFacts {
  count: number;
  floor: number;
  max: number;
  /** What a fill in man signs for, $M. */
  minContract: number;
}
export interface FoCapLine { text: string; tone: 'muted' | 'bad' | 'good' }

export function foCapLines(f: { tax?: FoTaxFacts; roster?: FoRosterFacts }): FoCapLine[] {
  const out: FoCapLine[] = [];
  if (f.tax?.pending) {
    out.push({ text: 'No luxury tax this season. The league sets its tax line from the payrolls it carries out of the summer, and the tax starts next season.', tone: 'muted' });
  } else if (f.tax) {
    const t = f.tax;
    out.push({ text: `Luxury tax line $${t.line}M, first apron $${t.firstApron}M, second apron $${t.secondApron}M.`, tone: 'muted' });
    out.push(t.bill > 0
      ? { text: `Projected tax $${t.bill}M: $${t.over}M over the line${t.repeater ? ', repeater rates' : ''}. Assessed at season close.`, tone: 'bad' }
      : { text: `Under the tax line by $${Math.abs(t.over)}M.`, tone: 'good' });
    if (t.due > 0) out.push({ text: `Last season's $${t.due}M tax bill is held back from this season's room.`, tone: 'bad' });
    if (t.aboveSecond) out.push({ text: 'Over the second apron: a trade must send out at least the salary it brings back.', tone: 'bad' });
    else if (t.aboveFirst) out.push({ text: 'Over the first apron: a trade must send out at least the salary it brings back.', tone: 'bad' });
  }
  if (f.roster) {
    const r = f.roster;
    out.push({ text: `${r.count} of ${r.max} roster spots filled, ${r.floor} needed at tip off.`, tone: 'muted' });
    if (r.count > r.max) out.push({ text: `${r.count - r.max} too many. Waive down to ${r.max} before tip off.`, tone: 'bad' });
    else if (r.count < r.floor) out.push({ text: `${r.floor - r.count} short: the league fills the gap on minimum deals ($${r.minContract}M each) when the season tips off.`, tone: 'bad' });
  }
  return out;
}

/** Sorted ovr at a percentile, 0 = worst man, 1 = best man. */
export function percentileOvr(list: FoHubPlayer[], p: number): number {
  if (list.length === 0) return 0;
  const sorted = [...list].map(x => x.ovr).sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.round(p * (sorted.length - 1))));
  return sorted[idx];
}

const money = (m: number): string => {
  const abs = Math.abs(m);
  const n = abs >= 10 ? Math.round(abs) : Math.round(abs * 10) / 10;
  return `${m < 0 ? '-' : ''}$${n}M`;
};

const best = (list: FoHubPlayer[]): FoHubPlayer | null =>
  list.length === 0 ? null : [...list].sort((a, b) => b.ovr - a.ovr)[0];

/**
 * The five boxes, in the order they are laid out.
 *
 * Every value line answers a question you would otherwise have had to tap
 * to answer, and every accent means a decision is waiting: men unavailable,
 * a signing you can afford who would actually improve the team, a payroll
 * over the line, or a table position that will cost you the season.
 */
export function foHubTiles(f: FoHubFacts): FoTile[] {
  const out: FoTile[] = [];

  /* ---------------------------------------------------------------- roster */
  {
    const hurt = f.roster.filter(p => p.out > 0);
    const star = best(f.roster);
    const starHurt = hurt.length > 0 ? [...hurt].sort((a, b) => b.ovr - a.ovr)[0] : null;
    /* Round 722: a roster the season cannot start with outranks a hurt star
       on the second line, because it is the one roster fact with a deadline.
       Only a sport that declares a tip off floor has that deadline: the MLB
       board passes rosterMax for its sign path, can draft above it and has no
       tip off refusal, so it keeps its old line. Since the Round 830 review the
       NHL board declares one on a full roster league (puck drop, 20 to 23);
       an older NHL save keeps the old line. */
    const tooMany = f.rosterFloor != null && f.rosterMax != null ? f.roster.length - f.rosterMax : 0;
    const tooFew = f.rosterFloor != null ? f.rosterFloor - f.roster.length : 0;
    const start = f.startWord ?? 'tip off';
    out.push({
      key: 'team',
      icon: '👔',
      title: 'Roster',
      value: hurt.length > 0
        ? `${hurt.length} unavailable`
        : `${f.roster.length} under contract`,
      sub: tooMany > 0
        ? `${tooMany} over the ${f.rosterMax} man limit. Waive before ${start}.`
        : tooFew > 0
          ? `${tooFew} short of the ${f.rosterFloor} man floor. Filled on minimum deals at ${start}.`
          : starHurt
            ? `${starHurt.name} is out ${starHurt.out} ${f.periodWord}${starHurt.out === 1 ? '' : 's'}`
            : star
              ? `${star.name} leads them at ${star.ovr}`
              : 'Nobody on the books',
      /* A missing star, or a roster the season cannot start with, is what needs you today. */
      accent: hurt.length > 0 || tooMany > 0 || tooFew > 0,
    });
  }

  /* ------------------------------------------------------------ free agency */
  {
    const room = f.capRoom;
    /* Round 631: only men the sign path would take. A man this team cut this
       season is refused whatever the room says, and at the roster ceiling
       everybody is, so neither may be offered here. */
    const market = f.freeAgents.filter(p => !(f.ledger && p.id && signRefusal(f.ledger, p.id)));
    const full = f.rosterMax != null ? rosterFullRefusal({ players: f.roster }, f.rosterMax) : null;
    const affordable = full ? [] : market.filter(p => p.salary <= Math.max(0, room));
    const pick = best(affordable);
    const topAvailable = best(market);
    /* Worth a dot only if he would walk into the better two thirds of the
       squad. A 71 rated body you can afford is not news. */
    const bar = percentileOvr(f.roster, 0.67);
    const upgrade = pick !== null && f.roster.length > 0 && pick.ovr > bar;
    out.push({
      key: 'market',
      icon: '💼',
      title: 'Free agency',
      value: room > 0 ? `${money(room)} of room` : room === 0 ? 'No room left' : `${money(room)} over`,
      sub: full
        ? full
        : upgrade && pick
          ? `${pick.name}, ${pick.ovr} rated, fits your room`
          : pick
            ? `In reach: ${pick.name} at ${pick.ovr}`
            : topAvailable
              ? `${topAvailable.name} wants ${money(topAvailable.salary)}, out of reach`
              : 'The market is empty',
      accent: upgrade,
    });
  }

  /* ----------------------------------------------------------------- trades */
  {
    const over = f.capRoom < 0;
    const chip = best(f.roster.filter(p => p.out === 0));
    /* Round 722: a tax cheque in the post is the trade fact that matters most
       in a sport that has one. Over the cap alone is ordinary there. */
    const taxed = !!f.tax && f.tax.bill > 0;
    out.push({
      key: 'trade',
      icon: '🤝',
      title: 'Trades',
      value: taxed
        ? `Tax bill ${money(f.tax!.bill)}`
        : over
          ? `${money(f.capRoom)} to shed`
          : f.tradeLine
            ? 'Deal done'
            : `${f.roster.length} to offer`,
      sub: taxed
        ? `${money(f.tax!.over)} over the tax line. Shed salary or pay it.`
        : over
          ? 'Move salary or the owner will'
          : f.tradeLine
            ? f.tradeLine
            : chip
              ? `Your biggest chip is ${chip.name}`
              : 'Call a rival and see',
      /* Over the line is the one trade state that is genuinely urgent. */
      accent: taxed || over,
    });
  }

  /* ------------------------------------------------------------------- play */
  {
    const postseason = f.period > f.periods;
    const next = f.nextOpponent;
    const last = f.lastResult;
    out.push({
      key: 'play',
      icon: '🏟️',
      title: f.playWord,
      value: postseason
        ? 'Postseason'
        : next
          ? `${next.home ? 'vs' : 'at'} ${next.label}`
          : f.hasFixtures
            ? `Bye ${f.periodWord}`
            : `${f.periodWord[0].toUpperCase()}${f.periodWord.slice(1)} ${f.period} of ${f.periods}`,
      sub: last
        ? `Last out: ${last.won ? 'won' : 'lost'} ${last.us}-${last.them} ${last.won ? 'against' : 'to'} ${last.opponent}`
        : `${f.wins}-${f.losses} with ${Math.max(0, f.periods - f.period + 1)} ${f.periodWord}s to play`,
      /* The reason you opened the game. It always pulses. */
      accent: true,
    });
  }

  /* -------------------------------------------------------------- standings */
  {
    const inside = f.place > 0 && f.place <= f.cut;
    const shortOf = f.place - f.cut;
    const left = Math.max(0, f.periods - f.period + 1);
    /* Late and outside is the season slipping away, which is exactly when
       a GM should be looking at the table. Early it is just noise. */
    const late = left <= Math.ceil(f.periods / 3);
    out.push({
      key: 'standings',
      icon: '📊',
      title: 'Standings',
      value: f.place > 0 ? `#${f.place} in the ${f.tableName}` : f.tableName,
      sub: inside
        ? f.place === 1
          ? 'Top seed as it stands'
          : `Inside the top ${f.cut} with ${left} to play`
        : shortOf === 1
          ? `One place short of the cut, ${left} to play`
          : `${shortOf} places short of the cut, ${left} to play`,
      accent: !inside && late && f.place > 0,
    });
  }

  return out;
}

/** The words on the boxes, in order. Harnesses and walks tap by these. */
export const FO_TILE_TITLES = ['Roster', 'Free agency', 'Trades', 'Standings'] as const;
