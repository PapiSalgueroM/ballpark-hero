/* Round 180: the owner upstairs, one engine, four Front Office games.

   Club Manager's spine has always been a board that names the prize and
   grades you on it, and the sack race under that. The four GM sims had
   NONE of it: you picked a franchise and simmed forever with nothing asked
   of you and no way to fail. This closes that gap, the boards half of the
   S-5 parity push (the market and talks landed in the careers in 179).

   How it works:
   - When you take a job, and again every offseason, ownership sets a
     mandate from where your roster honestly ranks in the league: a top
     roster is told to win the whole thing, a mid one to make the
     postseason, a bottom one to win an honest number of games. A defending
     champion is never asked for less than a deep run.
   - The hub shows the mandate, your trust upstairs (0 to 100), and a live
     on-track read while the season runs.
   - At season end the mandate is graded: beat it and trust climbs, miss it
     and trust falls, miss it by a mile and it falls hard. A title fixes
     almost anything. At zero trust you are fired, the save ends the way a
     Club Manager sacking ends, and the next franchise gets a wiser you.

   Legal note, same as everywhere: mandates and verdicts are NARRATED
   ("Upstairs wanted the title"), never quoted speech, because several of
   these franchises have famous real owners and an invented quote in a real
   person's mouth is the one line this repo never crosses. Keep it that way.

   Shared-engine pattern per usCoachCareer.ts (126) and usCareerFreeAgency.ts
   (179): sport words and season shapes come in as data, so the four games
   cannot drift apart. */

export type FoTier = 'title' | 'contend' | 'playoffs' | 'respect' | 'rebuild';

export interface FoSportWords {
  /** 'the Super Bowl', 'the Finals', 'the Stanley Cup', 'the World Series' */
  title: string;
  /** 'the playoffs' or 'October' */
  playoffs: string;
  /** 'a playoff round' or 'a series' */
  round: string;
  /** Regular season games for win targets: 17, 80, 80, 162. */
  games: number;
}

export interface OwnerMandate {
  tier: FoTier;
  /** The narrated ask, shown on the hub card and in the feed. */
  text: string;
  /** Minimum wins for the respect and rebuild tiers, 0 otherwise. */
  winFloor: number;
  /** Postseason level required: 4 champion, 2 win a round, 1 make it, 0 none. */
  reqLevel: number;
  /** The season this mandate was set for, so stale ones are visible. */
  season: number;
}

export const FO_TRUST_START = 60;

const round0 = (n: number) => Math.round(n);

/** Rank the user's team strength against the whole league, 1 = best. */
export function strengthRank(strengths: Record<string, number>, myTeam: string): number {
  const mine = strengths[myTeam];
  return 1 + Object.entries(strengths).filter(([id, s]) => id !== myTeam && s > mine).length;
}

/** One step up or down the mandate ladder, clamped at both ends. Round
    192: what a GM says at the podium can move next season's ask. */
export function tiltTier(tier: FoTier, tilt: -1 | 0 | 1): FoTier {
  const ladder: FoTier[] = ['rebuild', 'respect', 'playoffs', 'contend', 'title'];
  const i = ladder.indexOf(tier);
  return ladder[Math.max(0, Math.min(ladder.length - 1, i + tilt))];
}

export function buildOwnerMandate(
  rank: number, teamCount: number, defendingChamp: boolean, words: FoSportWords, season: number,
  /* Round 192: the press tilt. Talk big at season end and the ask ratchets
     one tier up; ask for patience and it softens one. 0 everywhere else,
     so every pre-192 call site is byte-identical in behavior. */
  tilt: -1 | 0 | 1 = 0,
): OwnerMandate {
  const frac = (rank - 1) / Math.max(1, teamCount - 1);
  let tier: FoTier =
    frac <= 0.10 ? 'title'
    : frac <= 0.30 ? 'contend'
    : frac <= 0.60 ? 'playoffs'
    : frac <= 0.82 ? 'respect'
    : 'rebuild';
  /* A defending champion's owner never asks for less than a deep run. */
  if (defendingChamp && (tier === 'playoffs' || tier === 'respect' || tier === 'rebuild')) tier = 'contend';
  /* Round 192: apply the press tilt, then re-apply the champion floor,
     because tempering the dynasty talk still never buys a champion an ask
     below a deep run. Ownership hears what it wants to hear. */
  tier = tiltTier(tier, tilt);
  if (defendingChamp && (tier === 'playoffs' || tier === 'respect' || tier === 'rebuild')) tier = 'contend';

  const winFloor = tier === 'respect' ? round0(words.games * 0.44)
    : tier === 'rebuild' ? round0(words.games * 0.33) : 0;
  const text =
    tier === 'title' ? `Win ${words.title}. Anything less is a failed season upstairs.`
    : tier === 'contend' ? (defendingChamp
      ? `Defend the crown: a deep ${words.playoffs} run is the minimum upstairs will accept.`
      : `Make ${words.playoffs} and win ${words.round}. This roster is built for it.`)
    : tier === 'playoffs' ? `Make ${words.playoffs}. Ownership thinks this roster belongs there.`
    : tier === 'respect' ? `Win ${winFloor} games and show the fans a direction.`
    : `Rebuild honestly: ${winFloor} wins keeps the project on schedule upstairs.`;
  const reqLevel = tier === 'title' ? 4 : tier === 'contend' ? 2 : tier === 'playoffs' ? 1 : 0;
  return { tier, text, winFloor, reqLevel, season };
}

/* ---------------- the live read on the hub ---------------- */

export function mandatePace(
  m: OwnerMandate, winsSoFar: number, seasonFrac: number, inCutNow: boolean,
): { onTrack: boolean; line: string } {
  if (m.reqLevel >= 1) {
    return inCutNow
      ? { onTrack: true, line: 'In the postseason picture. Hold it.' }
      : { onTrack: false, line: 'Outside the line right now. Upstairs is watching.' };
  }
  const target = Math.floor(m.winFloor * Math.min(1, Math.max(0, seasonFrac)));
  return winsSoFar >= target
    ? { onTrack: true, line: `${winsSoFar} wins keeps the mandate on pace.` }
    : { onTrack: false, line: `${winsSoFar} wins is behind the ${m.winFloor}-win ask.` };
}

/* ---------------- season end ---------------- */

export interface FoSeasonOutcome {
  wins: number;
  madePlayoffs: boolean;
  /** Postseason rounds or series actually won. Play-in games never count. */
  roundsWon: number;
  /** Appeared in the final round or final series. */
  reachedFinal: boolean;
  wonTitle: boolean;
}

export type FoGradeResult = 'title' | 'overachieved' | 'met' | 'missed' | 'badly';

export interface FoGrade {
  result: FoGradeResult;
  verdict: string;
  trustDelta: number;
}

export function gradeSeason(m: OwnerMandate, out: FoSeasonOutcome): FoGrade {
  /* A championship ends every argument, whatever was asked. */
  if (out.wonTitle) {
    return { result: 'title', verdict: '🏆 A parade. Upstairs belongs to you for a while.', trustDelta: 40 };
  }
  const level = out.reachedFinal ? 3 : out.roundsWon >= 1 ? 2 : out.madePlayoffs ? 1 : 0;
  let diff: number;
  if (m.reqLevel >= 1) {
    diff = level - m.reqLevel;
  } else {
    /* Win-floor tiers: the ask is a number, the postseason beats it. */
    diff = out.madePlayoffs ? 1
      : out.wins >= m.winFloor ? 0
      : out.wins >= m.winFloor - Math.max(1, Math.round(m.winFloor * 0.2)) ? -1
      : -2;
  }
  if (diff >= 1) return { result: 'overachieved', verdict: '📈 Ahead of the ask. Ownership noticed.', trustDelta: 22 };
  if (diff === 0) return { result: 'met', verdict: '✅ Mandate met. The seat stays comfortable.', trustDelta: 14 };
  if (diff === -1) return { result: 'missed', verdict: '⚠️ Short of the ask. Patience upstairs got thinner.', trustDelta: -16 };
  return { result: 'badly', verdict: '🔻 Nowhere near the ask. The room upstairs went quiet.', trustDelta: -28 };
}

export function applyMandateResult(trust: number, g: FoGrade): { trust: number; fired: boolean; warning: boolean } {
  const next = Math.max(0, Math.min(100, trust + g.trustDelta));
  const fired = next <= 0;
  return { trust: next, fired, warning: !fired && next <= 25 };
}

export function firedLine(seasons: number, titles: number): string {
  const s = `${seasons} season${seasons === 1 ? '' : 's'}`;
  const t = titles === 0 ? 'no titles' : `${titles} title${titles === 1 ? '' : 's'}`;
  return `Ownership made the call: you are out after ${s} and ${t}. Another franchise will give a proven builder a phone call.`;
}

/* ---------------- postseason shape helpers for the boards ---------------- */

interface SeriesLike { name: string; home: string; away: string; winner: string }

/** For the NBA, NHL and MLB boards: read the bracket the sim produced.
    playInMarker (e.g. 'Play-In') excludes those games from everything,
    because losing a play-in is NOT making the playoffs and winning one is
    not winning a round. */
export function seriesPostseason(series: SeriesLike[], myTeam: string, playInMarker?: string): {
  madePlayoffs: boolean; roundsWon: number; reachedFinal: boolean;
} {
  const real = playInMarker ? series.filter(s => !s.name.includes(playInMarker)) : series;
  const madePlayoffs = real.some(s => s.home === myTeam || s.away === myTeam);
  const roundsWon = real.filter(s => s.winner === myTeam).length;
  const fin = real[real.length - 1];
  const reachedFinal = !!fin && (fin.home === myTeam || fin.away === myTeam);
  return { madePlayoffs, roundsWon, reachedFinal };
}

interface NflRoundLike { name: string; games: { home: string; away: string; winner: string }[] }

/** For the NFL board: rounds of games instead of series. A one-seed's bye
    means fewer wins on the way to the title, so reachedFinal reads the
    Super Bowl round itself rather than counting. */
export function nflPostseason(rounds: NflRoundLike[], myTeam: string): {
  madePlayoffs: boolean; roundsWon: number; reachedFinal: boolean;
} {
  const madePlayoffs = rounds.some(r => r.games.some(g => g.home === myTeam || g.away === myTeam));
  const roundsWon = rounds.reduce((n, r) => n + r.games.filter(g => g.winner === myTeam).length, 0);
  const fin = rounds[rounds.length - 1];
  const reachedFinal = !!fin && fin.games.some(g => g.home === myTeam || g.away === myTeam);
  return { madePlayoffs, roundsWon, reachedFinal };
}
