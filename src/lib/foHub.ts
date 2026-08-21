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

/** One man, reduced to the five things a hub box can care about. */
export interface FoHubPlayer {
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
    out.push({
      key: 'team',
      icon: '👔',
      title: 'Roster',
      value: hurt.length > 0
        ? `${hurt.length} unavailable`
        : `${f.roster.length} under contract`,
      sub: starHurt
        ? `${starHurt.name} is out ${starHurt.out} ${f.periodWord}${starHurt.out === 1 ? '' : 's'}`
        : star
          ? `${star.name} leads them at ${star.ovr}`
          : 'Nobody on the books',
      /* A missing star is the only roster fact that needs you today. */
      accent: hurt.length > 0,
    });
  }

  /* ------------------------------------------------------------ free agency */
  {
    const room = f.capRoom;
    const affordable = f.freeAgents.filter(p => p.salary <= Math.max(0, room));
    const pick = best(affordable);
    const topAvailable = best(f.freeAgents);
    /* Worth a dot only if he would walk into the better two thirds of the
       squad. A 71 rated body you can afford is not news. */
    const bar = percentileOvr(f.roster, 0.67);
    const upgrade = pick !== null && f.roster.length > 0 && pick.ovr > bar;
    out.push({
      key: 'market',
      icon: '💼',
      title: 'Free agency',
      value: room > 0 ? `${money(room)} of room` : room === 0 ? 'No room left' : `${money(room)} over`,
      sub: upgrade && pick
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
    out.push({
      key: 'trade',
      icon: '🤝',
      title: 'Trades',
      value: over
        ? `${money(f.capRoom)} to shed`
        : f.tradeLine
          ? 'Deal done'
          : `${f.roster.length} to offer`,
      sub: over
        ? 'Move salary or the owner will'
        : f.tradeLine
          ? f.tradeLine
          : chip
            ? `Your biggest chip is ${chip.name}`
            : 'Call a rival and see',
      /* Over the line is the one trade state that is genuinely urgent. */
      accent: over,
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
