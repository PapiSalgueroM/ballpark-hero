/**
 * Round 208: the My Career hub, as live boxes.
 *
 * The four American career games have had boxes since Round 85, but they
 * were labels with a number stapled on: "Bank, $12.4M to spend", "Career
 * Log, 6 seasons on the books". Nothing on the hub told you the thing you
 * actually wanted to know when you opened the game, which is where you
 * stand: is your deal running out, is anybody unhappy, what did you win.
 *
 * So this is the careers' half of what Round 204 did for the GM games. The
 * boxes are the same boxes, drawn by the same component, and what each one
 * says is decided here where simCareerHub can check it without a browser.
 *
 * There is one new box, and it is new content rather than a reshuffle: the
 * trophy case. Every award these games have ever handed out was recorded
 * on the season line and then shown as a single trophy emoji at the end of
 * a row in the career log. Now they are counted, named and dated.
 */

/** Reused shape: the same box the front offices and Club Manager draw. */
export interface CareerTile {
  key: CareerPanelKey;
  icon: string;
  title: string;
  value: string;
  sub: string;
  accent: boolean;
}

export type CareerPanelKey = 'stats' | 'bank' | 'log' | 'trophies' | 'news';

export interface CareerHubFacts {
  ovr: number;
  age: number;
  /** The position word this sport uses. */
  pos: string;
  /** 0-100, all three. Any of them on the floor is a problem to look at. */
  morale: number;
  health: number;
  fanbase: number;
  /** Money, in the millions every one of these games counts in. */
  netWorth: number;
  salary: number;
  /** Upkeep the lifestyle costs per year, 0 if nothing has been bought. */
  yearlyCosts: number;
  /** Years left INCLUDING the one about to be played. 1 = final year. */
  contractYears: number;
  /** Era-aware club name. */
  teamLabel: string;
  seasonsPlayed: number;
  /** The last season, already formatted by the sport ("1,204 yds, 12 TD"). */
  lastLine: string | null;
  /** Championships, and the sport's word for one. */
  rings: number;
  ringWord: string;
  /** Everything else won, already counted by the sport. */
  honours: { label: string; n: number }[];
  headlines: string[];
}

const money = (m: number): string => {
  const abs = Math.abs(m);
  const n = abs >= 10 ? Math.round(abs) : Math.round(abs * 10) / 10;
  return `${m < 0 ? '-' : ''}$${n}M`;
};

const plural = (n: number, one: string, many = `${one}s`): string => (n === 1 ? one : many);

/** The lowest of the three meters, and what it is called. */
export function weakestMeter(f: Pick<CareerHubFacts, 'morale' | 'health' | 'fanbase'>): { label: string; value: number } {
  const all = [
    { label: 'Morale', value: f.morale },
    { label: 'Health', value: f.health },
    { label: 'The fans', value: f.fanbase },
  ];
  return all.reduce((lo, x) => (x.value < lo.value ? x : lo), all[0]);
}

/** Total silverware, for the trophy box's headline. */
export function honoursTotal(f: Pick<CareerHubFacts, 'rings' | 'honours'>): number {
  return f.rings + f.honours.reduce((n, h) => n + h.n, 0);
}

/**
 * The five boxes, in the order they are laid out.
 *
 * Same rule as the front office hub: every value line answers a question
 * you would otherwise have had to tap to answer, and an accent always
 * means a decision or a warning, never decoration.
 */
export function careerHubTiles(f: CareerHubFacts): CareerTile[] {
  const out: CareerTile[] = [];

  /* ------------------------------------------------------------- my player */
  {
    const weak = weakestMeter(f);
    /* 35 is the floor these games have used for a red meter since Round 85.
       Below it, that is the fact worth putting on the box. */
    const struggling = weak.value <= 35;
    out.push({
      key: 'stats',
      icon: '📊',
      title: 'My Player',
      value: `OVR ${f.ovr}`,
      sub: struggling
        ? `${weak.label} down at ${weak.value}`
        : `${f.pos}, age ${f.age}, ${f.rings} ${plural(f.rings, f.ringWord)}`,
      accent: struggling,
    });
  }

  /* ----------------------------------------------------------------- money */
  {
    const finalYear = f.contractYears <= 1;
    /* Upkeep outrunning the bank is the money problem these games can
       actually put you in: buy the mansion and the fleet, then get hurt. */
    const squeezed = f.yearlyCosts > 0 && f.netWorth < f.yearlyCosts * 2;
    out.push({
      key: 'bank',
      icon: '💰',
      title: 'The Bank',
      value: money(f.netWorth),
      sub: squeezed
        ? `${money(f.yearlyCosts)} a year in upkeep against ${money(f.netWorth)} banked`
        : finalYear
          /* No club name here on purpose: "final year at Green Bay Packers"
             does not fit a box two columns wide, and Round 204 already
             learned that lesson the hard way with "at Tennessee Titans". */
          ? `${money(f.salary)} a year, final year of the deal`
          : `${money(f.salary)} a year, ${f.contractYears} ${plural(f.contractYears, 'year')} left`,
      accent: finalYear || squeezed,
    });
  }

  /* ------------------------------------------------------------ career log */
  {
    out.push({
      key: 'log',
      icon: '📜',
      title: 'Career Log',
      value: f.seasonsPlayed === 0 ? 'No seasons yet' : `${f.seasonsPlayed} ${plural(f.seasonsPlayed, 'season')}`,
      sub: f.lastLine ?? 'Play one and it goes on the books',
      accent: false,
    });
  }

  /* ---------------------------------------------------------- trophy case */
  {
    const total = honoursTotal(f);
    const best = [...f.honours].sort((a, b) => b.n - a.n).find(h => h.n > 0);
    out.push({
      key: 'trophies',
      icon: '🏆',
      title: 'Trophy Case',
      value: total === 0 ? 'Empty' : `${total} ${plural(total, 'honour')}`,
      sub: f.rings > 0
        ? `${f.rings} ${plural(f.rings, f.ringWord)}${best ? `, ${best.n} ${best.label}` : ''}`
        : best
          ? `${best.n} ${best.label}, no ${f.ringWord} yet`
          : 'Nothing in it. Go and win something',
      accent: false,
    });
  }

  /* ------------------------------------------------------------------ news */
  {
    const n = f.headlines.length;
    out.push({
      key: 'news',
      icon: '📰',
      title: 'News',
      value: n === 0 ? 'Quiet week' : `${n} ${plural(n, 'headline')}`,
      sub: f.headlines[0] ?? 'Nobody is writing about you yet',
      accent: n > 0,
    });
  }

  return out;
}

/** The words on the boxes, in order. Walks tap by these. */
export const CAREER_TILE_TITLES = ['My Player', 'The Bank', 'Career Log', 'Trophy Case', 'News'] as const;

/* ------------------------------------------------------------------------ */
/* The trophy case itself                                                    */
/* ------------------------------------------------------------------------ */

export interface TrophyLine {
  /** What was won. */
  label: string;
  /** How many times. */
  n: number;
  /** The years it happened, oldest first. */
  years: number[];
}

/**
 * Every award on the books, grouped and dated.
 *
 * The season lines already carried an awards array; nothing ever read it
 * except a trophy emoji at the end of a row. This turns it into the screen
 * it should always have been, and it reads the SEASONS rather than the
 * career counters on purpose, so what the case shows is what actually
 * happened rather than a number that could drift away from it.
 */
export function trophyLines(seasons: { year: number; awards: string[] }[]): TrophyLine[] {
  const byLabel = new Map<string, number[]>();
  for (const s of seasons) {
    for (const a of s.awards ?? []) {
      const years = byLabel.get(a) ?? [];
      years.push(s.year);
      byLabel.set(a, years);
    }
  }
  return [...byLabel.entries()]
    .map(([label, years]) => ({ label, n: years.length, years: [...years].sort((x, y) => x - y) }))
    .sort((a, b) => b.n - a.n || a.label.localeCompare(b.label));
}
