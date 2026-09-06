/* ─── Round 473: the critic, one voice for every career ─────────────────────

   From his life sim list (docs/TWEAKS-2026-08-28.md): "a named generated
   rival and headlines at every step ... critics, fan and board pressure ... a
   life lived in public". The rival has existed since Round 62 and the
   headlines since Round 53, but nobody was ever on the other side of them.
   The word "pundits" turned up inside eleven newspaper bodies as scenery, and
   there was no one person whose opinion of you moved, which is the part that
   makes a career feel watched.

   So: one columnist, drawn the day you turn pro, who is there for all of it.

   THREE RULES THIS FILE LIVES BY

   1. HE STORES NOTHING. His name is a hash of the career, his stance is a
      function of the seasons on the save, and his back catalogue is
      recomputed from those seasons every time you open the column. There is
      no critic field to migrate, no critic meter beside the popularity meter
      that already says how the public sees you, and an old save opens with
      his whole history intact because the history is the career.

   2. HE IS DETERMINISTIC. No rng anywhere in here, so the same save shows
      the same column every render and the same paper on every reread.

   3. HE IS INVENTED AND SO IS EVERYONE HE WRITES ABOUT. The banks below are
      registered in scripts/simInventedNames.mjs, which enumerates all 144
      pairings against every real player the site ships. He never names, and
      is never given the words of, a real person.

   Sport neutral on purpose. The stance maths and the voice are here; the
   sport hands in the ratings, the games and one factual clause about the
   season ("18 goals in 34 games"), which is where a sport's own language
   belongs. Only Soccer Career binds it today, through
   src/lib/soccerCareerCritic.ts. */

/* ─── who he is ──────────────────────────────────────────────────────────── */

/* Deliberately not footballer names: these are broadsheet bylines. All 144
   pairings are checked in scripts/simInventedNames.mjs. */
const CRITIC_FIRST = [
  'Marguerite', 'Desmond', 'Ottoline', 'Barnaby', 'Winifred', 'Cedric',
  'Rosalind', 'Alastair', 'Prudence', 'Hollis', 'Gwendolyn', 'Fitzwilliam',
];
const CRITIC_LAST = [
  'Pemberton', 'Crossley', 'Hargreave', 'Villiers', 'Ashcombe', 'Dunmore',
  'Trelawney', 'Ravensworth', 'Marchbank', 'Stallybrass', 'Quillfeather', 'Netherfield',
];

/** Small stable string hash. Same input, same number, every session. */
function hashOf(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** The columnist this career gets. Nothing random, nothing saved. */
export function criticName(seed: string): string {
  const h = hashOf(seed);
  return `${CRITIC_FIRST[h % CRITIC_FIRST.length]} ${CRITIC_LAST[Math.floor(h / CRITIC_FIRST.length) % CRITIC_LAST.length]}`;
}

/** The paper he writes for, out of the sport's own mastheads. The same one
 *  every season, because a columnist has one. */
export function criticPaper(seed: string, papers: string[]): string {
  return papers.length ? papers[hashOf(`${seed}|paper`) % papers.length] : '';
}

/* ─── where he stands ────────────────────────────────────────────────────── */

export type CriticStance = 'backing' | 'watching' | 'doubting' | 'written_off';

export interface CriticFacts {
  /** The most recent seasons, oldest first, at most three. */
  recentRatings: number[];
  /** Games played in those same seasons, same order. */
  recentApps: number[];
  /** Trophies won in those same seasons. */
  recentTrophies: number;
  /** The whole cabinet, so a career winner gets more rope than a kid. */
  careerTrophies: number;
  /** 0 to 100, the popularity the career already tracks. Read, never stored
   *  a second time. */
  popularity: number;
  /** What the player did about him, once, ever: 0 nothing, 1 answered him
   *  back in public, 2 said nothing and told him to judge the next season on
   *  its own, 3 invited him in to watch a week of training. */
  answered: number;
}

/**
 * 0 to 100. Form does most of it, because a column is written about the last
 * thing you did; the cabinet and the public are the ballast that stops one
 * quiet season reading as the end.
 *
 * The weights are set from measured spread, not from feel:
 * scripts/simCareerLife.mjs prints the stance split over hundreds of seeded
 * seasons and fails if the critic is stuck on one opinion.
 */
export function criticScore(f: CriticFacts): number {
  const n = f.recentRatings.length;
  if (n === 0) return 50;
  /* "Let the football answer" is the one choice that changes how he reads
     you: his verdict becomes the season you told him to wait for and nothing
     else, so a good one converts him in one go and a bad one buries you in
     one go. Weighting it double instead of exclusively was the first draft,
     and simCareerLife measured it moving the final verdict by 0.4 points on
     average, because the newest season is usually close to the mean of the
     last three anyway. A button that does nothing is worse than no button. */
  const w = (i: number): number => (f.answered === 2 ? (i === n - 1 ? 1 : 0) : 1);
  const wsum = f.recentRatings.reduce((a, _, i) => a + w(i), 0) || 1;
  const meanRating = f.recentRatings.reduce((a, r, i) => a + r * w(i), 0) / wsum;
  const meanApps = f.recentApps.length
    ? f.recentApps.reduce((a, v, i) => a + v * w(i), 0) / wsum
    : 0;

  let score = 50;
  score += (meanRating - 7.1) * 22;
  score += (meanApps - 28) * 0.35;
  score += f.recentTrophies * 6;
  score += Math.min(12, f.careerTrophies * 1.5);
  score += (f.popularity - 55) * 0.15;
  /* Answering back sharpens him in both directions: he is now invested. */
  if (f.answered === 1) score += (meanRating - 7.1) * 8 - 4;
  if (f.answered === 3) score += 8;
  return Math.max(0, Math.min(100, Math.round(score)));
}

/* Cut points measured over 1,200 seeded seasons, ordinary and elite together:
   the score sits between roughly 12 and 95 with a median near 52, so these
   four bands each hold a real share of careers instead of one band holding
   all of them. simCareerLife section 3 fails if any band empties. */
export function criticStance(score: number): CriticStance {
  if (score >= 68) return 'backing';
  if (score >= 50) return 'watching';
  if (score >= 33) return 'doubting';
  return 'written_off';
}

export const STANCE_LABEL: Record<CriticStance, { label: string; emoji: string; color: string }> = {
  backing: { label: 'In your corner', emoji: '🖊️', color: 'text-emerald-400' },
  watching: { label: 'Reserving judgement', emoji: '🧐', color: 'text-sky-400' },
  doubting: { label: 'Not convinced', emoji: '📉', color: 'text-amber-400' },
  written_off: { label: 'Has written you off', emoji: '🗞️', color: 'text-red-400' },
};

/* ─── what he wrote ──────────────────────────────────────────────────────── */

export interface CriticColumn {
  year: number;
  stance: CriticStance;
  line: string;
}

/* Three ways of saying each stance, so a long career does not read like one
   sentence on repeat. Every one of them is about the player and signed by the
   columnist, and both are invented. */
const VOICE: Record<CriticStance, ((critic: string, clause: string) => string)[]> = {
  backing: [
    (c, s) => `${s}. ${c} wrote that anybody still arguing about this is arguing for the sake of it.`,
    (c, s) => `${s}. ${c} called it the best season anybody at the club has had in years, and he does not hand those out.`,
    (c, s) => `${s}. ${c} led his column with it for the third week running and apologised to nobody.`,
  ],
  watching: [
    (c, s) => `${s}. ${c} filed a careful one: good, not yet the thing everybody keeps promising.`,
    (c, s) => `${s}. ${c} says the talent was never the question and it still is not the answer either.`,
    (c, s) => `${s}. ${c} is waiting for the season that settles it. He has been waiting a while.`,
  ],
  doubting: [
    (c, s) => `${s}. ${c} spent nine hundred words asking where the rest of it went.`,
    (c, s) => `${s}. ${c} thinks the reputation is doing more work than the football is.`,
    (c, s) => `${s}. ${c} put a question mark in the headline, which from him is a verdict.`,
  ],
  written_off: [
    (c, s) => `${s}. ${c} wrote the obituary column, in full, with a photograph from four years ago.`,
    (c, s) => `${s}. ${c} says the club would get more from the money somewhere else, and he named the somewhere.`,
    (c, s) => `${s}. ${c} has stopped asking questions about it. That is worse.`,
  ],
};

/**
 * One column. `clause` is the sport's own factual sentence about the season,
 * so the football stays in the football file. Deterministic: the variant
 * comes off the year, never off a roll.
 */
export function criticColumn(critic: string, year: number, stance: CriticStance, clause: string): CriticColumn {
  const bank = VOICE[stance];
  return { year, stance, line: bank[Math.abs(year) % bank.length](critic, clause) };
}
