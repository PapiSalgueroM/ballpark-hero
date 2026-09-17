/**
 * Round 628: the Club Manager season score, rebuilt so it reads the manager
 * rather than the club.
 *
 * WHAT WAS WRONG. The rule was `Math.min(130, myRow.pts + trophies * 10)`, and
 * three things were measured wrong with it before a line of this was written.
 *
 *  1. It read the club, not the season. One full season was played at twelve
 *     clubs with management held identical (nobody touched anything, every
 *     entry auto played), so any spread was pure club stature. The scores ran
 *     24 to 90 and the correlation between a club's preview XI rating and its
 *     season score was 0.851. Bayern finished 8th of 18 on grade F having hit
 *     0 of 7 board objectives and scored 55; Sevilla finished 13th on grade C
 *     having hit 3 of 8 and scored 46. The F beat the C.
 *  2. The 130 scale did not fit the leagues. Maximum league points runs 54 in
 *     the 10 club Croatian league, 102 in the 18 club leagues, 114 in the big
 *     three and 138 in the 24 club Championship, against one flat cap. A
 *     perfect Croatian season could not reach the ceiling at all; the
 *     Championship passed it on league points alone, so its trophies were
 *     worth nothing.
 *  3. Relegation paid. Left alone for eight seasons, Sunderland scored 43
 *     finishing 18th in the Premier League, went down, won the Championship
 *     and scored 124. Everton reproduced it. The Newcastle side that won the
 *     actual Premier League scored 78. Winning the second division beat
 *     winning the first by 46 points, straight out of 46 games against 38.
 *
 * WHAT THIS IS. A ledger of what you actually did, with every term written as
 * a SHARE of what was available to you rather than as a raw count, so the size
 * of your league cancels. League form is your points as a fraction of the
 * points your own fixture list offered. The title, the cup run and the
 * European run are worth the same wherever they were won. Board objectives are
 * worth a fixed amount each, and the board already sizes its own demands to
 * the club, which is what keeps that term honest at a minnow and at a giant.
 *
 * THE MONOTONE LAW, and it is a law rather than a preference. `public.
 * global_leaderboard()` ranks on `max(least(score, max_score))` per player per
 * game per DAY, and `recordActivity` pings this function after every single
 * match (three sites in useClubManager.ts). So the day's best reading is what
 * counts, and any score that can FALL hands a player their luckiest moment
 * instead of their season. A rate (points per game played), a league position
 * snapshot, an expectation overshoot and a verdict grade are therefore all
 * structurally wrong for this game however well they read on a season end
 * screen: a points per game reading is at its maximum of 3.00 after one
 * opening win and can only decline. Every term below is a non decreasing
 * function of a quantity that only ever rises, and every denominator is a
 * season constant.
 *
 * ONE TERM COULD NOT BE MADE MONOTONE, so it is graded once instead. The
 * board objectives are recomputed live from the CURRENT squad, so a tick can
 * come back OFF: `youth` counts under 21s with appearances who are still in
 * your squad, and four of the five board asks read the squad the same way.
 * Selling, loaning out or paying off one of those players took 6 points off a
 * live score through three buttons the game really has (measured: Ajax 43 to
 * 37, Le Havre 17 to 11, and a season forked at week 20 finishing 58 if you
 * kept the player and 48 if you paid him off). So the board term lands ONLY at
 * the final whistle, where the board itself settles the card, and there is no
 * sequence of readings for it to fall through.
 *
 * `simClubManagerScore` section 2 samples the score after every match of many
 * seeded seasons and fails if it ever drops. Its first version played every
 * career hands off and never bought, sold, loaned or paid off anybody, so it
 * reported zero drops while all three of those buttons dropped the score. It
 * exercises them now.
 *
 * THE SCALE STAYS 0..130 ON PURPOSE. `game_score_caps.max_score` for
 * `club-manager` is 130 with 185,460 rows already recorded against it, and the
 * leaderboard pays `100.0 * day_best / max_score`. Emitting 0..100 instead
 * would quietly cut every Club Manager player's contribution by 23 percent
 * forever, because the denominator lives in the database and not here.
 *
 * This module is pure and imports nothing from clubManager.ts, so it can be
 * driven from a harness with synthetic inputs and no engine bundle at all.
 * clubManager.ts owns the adapter that reads a CareerState into these inputs.
 */

export const LEDGER_CAP = 130;

/**
 * THE WEIGHTS ARE MEASURED, NOT CHOSEN. They were grid searched against 77
 * seeded seasons at 34 clubs across the league sizes, scoring every season
 * under both rules, against three targets at once: keep the median where the
 * old rule left it (so nobody's leaderboard earning rate quietly falls by a
 * third), raise the correlation with the board's own verdict grade, and lower
 * the correlation with the club's preview XI rating. This set won on all
 * three. Measured against the old rule on the same 77 seasons:
 *
 *                              OLD     NEW
 *   median score                63      63
 *   correlation with grade    0.312   0.482
 *   correlation with club XI   0.776   0.314
 *   correlation with the board 0.132   0.577
 *   mean score, grade A         65.8    82.1
 *   mean score, grade B         67.2    69.4
 *   mean score, grade C         58.4    48.8
 *   mean score, grade D         28.8    34.5
 *
 * One club in the first calibration run, "Midtjylland", is not in any playable
 * league. An unknown name does not throw: clubDefFor returns a flat fallback
 * and leagueOf falls back to the PREMIER LEAGUE, so it silently became an
 * invented Premier League club. The table above is the rerun with the real
 * name, and simClubManagerScore now refuses to start if any club it names is
 * not in a playable league.
 *
 * The old rule could not even order A above B (65.8 against 67.2). This one
 * separates all four bands in the right order.
 *
 * AND THE SUM IS NOT AN ACCIDENT. 48 + 28 + 24 + 30 is exactly 130, which is
 * the ceiling with NO European run in it. Five playable leagues have no
 * Champions League route at all (the Championship, the Saudi Pro League, both
 * MLS conferences and 2. Bundesliga, because uclPlacesIn returns 0 outside
 * Europe), so pricing Europe into the ceiling would have put the top of the
 * scale out of their reach forever, which is exactly the shape of the bug this
 * round exists to fix. A manager there reaches 130 through the league, the cup
 * and the board. A European one has Europe's 24 as slack instead. Two routes
 * to the top, neither of them blocked by the league you picked.
 */

/** League form: your share of the points your own fixture list offered. */
export const W_FORM = 48;
/** Winning your league, worth the same in Croatia as in Spain. */
export const W_TITLE = 28;
/** Each board objective ticked, and the ceiling on that term. */
export const W_OBJ_EACH = 6;
export const W_OBJ_CAP = 30;

/**
 * Indexed by cupProgressRank / uclProgressRank, both 0..4.
 * Cup: 0 is out at or before the last 16, 4 is won it.
 * Europe: 0 is the group stage, 1 the first knockout round, 4 is won it.
 * Europe pays a little more early because reaching it at all took a finish.
 */
export const CUP_POINTS: readonly number[] = [0, 5, 11, 17, 24];
export const EURO_POINTS: readonly number[] = [0, 7, 13, 18, 24];

/**
 * A pre Round 628 takeover save carries no stamped handover, so the previous
 * manager's points have to be estimated. It is estimated at a FIXED neutral
 * rate rather than at the player's own scoring rate, and that choice is the
 * whole point: a rate estimate rises as you lose (subtract `pts * played /
 * leaguePlayed` and thirteen straight defeats read a rising share of the form
 * term), which pays a player for losing. A constant cannot do that.
 * 1.35 is roughly the points per game a league hands out on average, since
 * three points are shared between a winner and a loser and about a quarter of
 * matches are drawn.
 */
export const LEGACY_PPG = 1.35;

/** Where in the season a takeover career began, from startMidSeason. */
export const LEGACY_HANDOVER_FRACTION: Record<string, number> = {
  autumn: 0.28,
  newYear: 0.5,
  runIn: 0.72,
};

/**
 * What the manager before you had already banked when you walked in. Stamped
 * into the save at the handover so it is frozen, never recomputed, and
 * therefore cannot move with your own results.
 */
export interface SeasonHandover {
  pts: number;
  played: number;
  cupRank: number;
  euroRank: number;
  objectivesDone: number;
  /** The league was already won when you arrived. */
  wonLeague: boolean;
  /**
   * True when this is the legacy ESTIMATE rather than a record stamped at the
   * handover, so the honours terms know they cannot be trusted to subtract.
   */
  estimated?: boolean;
}

export interface SeasonLedgerInput {
  /** career.table has a row for career.clubName. */
  inTable: boolean;
  /** That row's points. */
  leaguePts: number;
  /** That row's games played, w + d + l. */
  leaguePlayed: number;
  /** 2 * (leagueClubs.length - 1), the season's own fixture count. */
  leagueRounds: number;
  /** A 'League Title' trophy stamped with this season. */
  wonLeague: boolean;
  /** cupProgressRank(career).rank, 0..4. */
  cupRank: number;
  /** uclProgressRank(career).rank, 0..4. */
  euroRank: number;
  /** objectiveStatuses(career) entries reading 'done'. */
  objectivesDone: number;
  /** career.week >= career.calendar.length. The board card settles here. */
  seasonDone: boolean;
  /** The stamped handover, or null on a career started from week 0. */
  handover: SeasonHandover | null;
  /**
   * Legacy repair path only: a takeover save written before this round, which
   * carries `midSeasonStart` and no stamped handover. Null on every other
   * save, INCLUDING season two onward of a takeover career, because
   * `midSeasonStart` is never cleared by the engine and applying it past its
   * own season would subtract a manager who does not exist.
   */
  legacyStart: 'autumn' | 'newYear' | 'runIn' | null;
}

export interface SeasonLedger {
  form: number;
  title: number;
  cup: number;
  euro: number;
  objectives: number;
  total: number;
}

const int = (n: number, lo: number, hi: number): number => {
  if (!Number.isFinite(n)) return lo;
  return Math.max(lo, Math.min(hi, Math.round(n)));
};

const rank04 = (r: number): number => int(r, 0, 4);

/** The empty ledger, so every early return agrees on its shape. */
const NOTHING: SeasonLedger = { form: 0, title: 0, cup: 0, euro: 0, objectives: 0, total: 0 };

/**
 * The handover to subtract. A stamped record wins. Otherwise a legacy takeover
 * is estimated at the neutral rate above, and everything else is null.
 */
export function handoverOf(i: SeasonLedgerInput): SeasonHandover | null {
  if (i.handover) {
    /* The two clamps are a consistency check, not decoration. `played` and
       `pts` come out of localStorage, which the player can edit, and a
       handover claiming to have played MORE games than the table has records
       of would shrink `mine` towards 1 and hand out the whole form term for a
       single win. Neither can exceed what the table itself says happened. */
    const playedCeiling = Math.max(0, int(i.leaguePlayed, 0, 500));
    const ptsCeiling = Math.max(0, int(i.leaguePts, 0, 500));
    return {
      pts: Math.min(ptsCeiling, Math.max(0, int(i.handover.pts, 0, Number.MAX_SAFE_INTEGER))),
      played: Math.min(playedCeiling, Math.max(0, int(i.handover.played, 0, Number.MAX_SAFE_INTEGER))),
      cupRank: rank04(i.handover.cupRank),
      euroRank: rank04(i.handover.euroRank),
      objectivesDone: Math.max(0, int(i.handover.objectivesDone, 0, 99)),
      wonLeague: !!i.handover.wonLeague,
    };
  }
  if (!i.legacyStart) return null;
  const rounds = Math.max(1, int(i.leagueRounds, 1, 200));
  const f = LEGACY_HANDOVER_FRACTION[i.legacyStart];
  if (!Number.isFinite(f)) return null;
  const played = Math.min(rounds - 1, Math.max(0, Math.round(rounds * f)));
  return {
    pts: Math.round(LEGACY_PPG * played),
    played,
    /* These three are NOT knowable from a pre Round 628 save, and zeroing them
       is not neutral: it credits the new manager with the cup run, the
       European run and the board ticks the previous manager banked, which
       measured at about 15 points of 130 on average and 40 at worst. They are
       left at zero here and the honours terms below scale by the share of the
       season actually managed instead, which is the honest reading of "we do
       not know what he did, so you are paid for your part of it". */
    cupRank: 0,
    euroRank: 0,
    objectivesDone: 0,
    wonLeague: false,
    estimated: true,
  };
}

/**
 * The season score, broken into the five terms the summary screen prints.
 * Pure: no clock, no Math.random, no network, no state mutation.
 */
export function seasonLedger(i: SeasonLedgerInput): SeasonLedger {
  /* A club with no row in its own table has played no league season to score.
     leagueOf falls back to the Premier League for a name it does not know, and
     finishSeason then reads position 1 and can mint a phantom League Title, so
     this refuses rather than rewarding the broken state. */
  if (!i.inTable) return { ...NOTHING };

  const rounds = Math.max(1, int(i.leagueRounds, 1, 200));
  const h = handoverOf(i);

  /* The share of the season that is actually yours. A career started from
     week 0 owns all of it. */
  const inherited = h ? Math.min(rounds - 1, Math.max(0, h.played)) : 0;
  const mine = Math.max(1, rounds - inherited);
  const share = mine / rounds;

  /* LEAGUE FORM, 0..W_FORM. Points you banked over the points your own
     remaining fixtures offered. The denominator is a season constant and the
     numerator only rises, so this term can never fall. */
  const rawPts = Math.max(0, int(i.leaguePts, 0, 500));
  const myPts = Math.max(0, rawPts - (h ? Math.max(0, h.pts) : 0));
  const form = int(W_FORM * Math.min(1, myPts / (3 * mine)), 0, W_FORM);

  /* THE TITLE, 0..W_TITLE, scaled by the share of the season you managed. Taking
     over a side already top with six games left and lifting the trophy is
     real, and it is not the same as winning it over thirty eight. A club that
     had already mathematically won it when you walked in pays nothing. */
  const title = i.wonLeague && !(h && h.wonLeague)
    ? int(W_TITLE * share, 0, W_TITLE)
    : 0;

  /* THE KNOCKOUTS, up to CUP_POINTS[4] and EURO_POINTS[4]. Only the rounds
     you took the club through count, so inheriting a semi finalist pays for
     the final and not the three rounds before it.
     On a LEGACY takeover the previous manager's rank is unknown rather than
     zero, so the run is paid at the share of the season actually managed
     instead of being subtracted. */
  const est = !!(h && h.estimated);
  const rawCup = Math.max(0, CUP_POINTS[rank04(i.cupRank)] - (h && !est ? CUP_POINTS[rank04(h.cupRank)] : 0));
  const rawEuro = Math.max(0, EURO_POINTS[rank04(i.euroRank)] - (h && !est ? EURO_POINTS[rank04(h.euroRank)] : 0));
  const cup = est ? int(rawCup * share, 0, CUP_POINTS[4]) : rawCup;
  const euro = est ? int(rawEuro * share, 0, EURO_POINTS[4]) : rawEuro;

  /* THE BOARD, W_OBJ_EACH each and W_OBJ_CAP at most, and ONLY AT THE FINAL
     WHISTLE. This is the term that knows which club you are at, and it is the
     right one to: the board asks a giant for the title and a minnow to stay
     up, so ticking the box means the same amount of management either way.

     THE WHISTLE GATE IS WHAT KEEPS THE SCORE MONOTONE, and the first version
     of this round shipped without it and was wrong. `objectiveStatuses`
     recomputes `youth` from the CURRENT squad on every call
     (clubManager.ts, `career.squad.filter(p => p.age <= 21 && p.apps > 0)`),
     and four of the five board asks read the squad the same way. So a tick
     could flip back OFF: paying a man off, selling him, or loaning him out
     took 6 points off a live score, through three buttons the game actually
     has. Measured on the real engine: Ajax 43 to 37, Le Havre 17 to 11, and a
     season forked at week 20 finished 58 if you kept him and 48 if you paid
     him off. Grading the card once, where the board itself settles it, means
     there is no sequence of readings to fall through, and it makes the score
     agree with the tick list printed beside it on the same screen. */
  const doneNow = Math.max(0, int(i.objectivesDone, 0, 99) - (h && !est ? h.objectivesDone : 0));
  const rawObjectives = Math.min(W_OBJ_CAP, doneNow * W_OBJ_EACH);
  const objectives = !i.seasonDone ? 0
    : est ? int(rawObjectives * share, 0, W_OBJ_CAP)
      : rawObjectives;

  const total = int(form + title + cup + euro + objectives, 0, LEDGER_CAP);
  return { form, title, cup, euro, objectives, total };
}

/** The number the leaderboard and the season end screen both read. */
export function seasonLedgerScore(i: SeasonLedgerInput): number {
  return seasonLedger(i).total;
}

/**
 * What the five terms add up to BEFORE the cap. It is 154, deliberately more
 * than 130: a season has to be outstanding rather than literally perfect to
 * reach the top of the scale. Exported so the help copy and the harness read
 * one number instead of writing it down twice.
 */
export function ledgerRawCeiling(): number {
  return W_FORM + W_TITLE + CUP_POINTS[4] + EURO_POINTS[4] + W_OBJ_CAP;
}

/** The most anyone can actually score. */
export function ledgerCeiling(): number {
  return Math.min(LEDGER_CAP, ledgerRawCeiling());
}

/**
 * The ceiling a league with no European route can reach, which must still be
 * the full 130 or the five non-European leagues are structurally underpaid.
 * Derived rather than written down, so a weight change cannot break it
 * silently: simClubManagerScore asserts it equals LEDGER_CAP.
 */
export function ceilingWithoutEurope(): number {
  return Math.min(LEDGER_CAP, W_FORM + W_TITLE + CUP_POINTS[4] + W_OBJ_CAP);
}
