/* Round 1321: the NBA's half of the earned draft (part A: the engine and this
   library, nothing a player sees; no board or screen calls it yet).

   The shared half is gmEarnedDraft.ts. What is the NBA's is here: the season
   the order is drawn from (the playoff sixteen read off the series' numbers),
   the block on the desk, the host that spends a marker of the slot's round and
   signs a man the engine's way, the three presses that write the block back
   and tell the re-sign desk about his draftees, and the NBA's own lines for
   the "?". One file both the harness and, in part B, the board call, so the
   draft a player sees cannot drift from the one scripts/simNbaEarnedDraft.mjs
   measured.

   WHAT IS SAVED. One desk block under NBA_DRAFT_BLOCK, the lift's night,
   validated alone. src/lib/nbaGmDesk.ts is not edited: its key list stays
   as it is and the desk carries an unknown key untouched (gmDesk.ts). After
   the summer the season has rolled, so a spent block is never current; it
   stays on the desk (about 8 KB) and is not cleaned, on purpose.

   THE OLD DRAFT IS UNTOUCHED. A save that never opens a night here plays
   nbaDraftClass, nbaAiDraftPicks and nbaConsumeDraftPick exactly as before. */
import { NBA_TEAM_MAP } from '@/data/conquestDataNba';
import {
  NBA_DRAFT_NEED_WEIGHT, NBA_ROUNDS, nbaConsumeDraftRound, nbaDraftCapital, nbaDraftNeed, nbaDraftSigning,
  nbaEarnedClassSize, nbaMinContract, nbaProspectToPlayer,
} from './nbaFrontOffice';
import type { NbaLeague, NbaProspect, SeriesResult } from './nbaFrontOffice';
import { nbaGamePickRules, nbaNoteArrivals, nbaPicksOf, nbaScoutRead, nbaSignDraftee, nbaStaffOf } from './nbaGmDesk';
import { withGmBlock } from './gmDesk';
import type { GmDesk } from './gmDesk';
import { gmStaffLevel } from './gmStaff';
import {
  buildDraftOrder, draftRulesFor, draftRunReveal, draftSeasonKey, draftSlots, earnedByStaff, earnedContinue,
  earnedDraftHeading, earnedDraftHelp, earnedPick, isGmDraftNight, lotteryRangeLine, openDraftNight,
} from './gmEarnedDraft';
import type {
  DraftClubRow, DraftSeason, EarnedDraftStep, EarnedSlot, GmDraftHost, GmDraftNight, LotteryHelpBlock, RunStep, SavedDraftOrder,
} from './gmEarnedDraft';

/* Everything part B's board needs, through this file, so the board never names a lift module. */
export { nbaEarnedDraftClass } from './nbaFrontOffice';
export { draftRulesFor, lotteryNight, lotteryNightRule, ordinal, slotsLeftFor } from './gmEarnedDraft';
export type {
  EarnedDraftStep, EarnedSlot, GmDraftNight, GmDraftOrderRules, GmLotteryRules, LotteryHelpBlock, LotteryNightView, RunStep,
  SavedDraftOrder,
} from './gmEarnedDraft';

/** The desk block the night is saved under. */
export const NBA_DRAFT_BLOCK = 'draft';

/** The season the order is drawn from: every club's record and whether it made the playoff sixteen, which is being
    home or away in a series somebody won with four wins (the play-in is played to one). Read off the numbers, never
    a series' name. Null unless thirty clubs and exactly sixteen made it: nothing is guessed. */
export function nbaDraftSeason(league: NbaLeague, series: SeriesResult[]): DraftSeason | null {
  const made = new Set<string>();
  for (const s of Array.isArray(series) ? series : []) {
    if (s && (s.homeWins === 4 || s.awayWins === 4)) { made.add(s.home); made.add(s.away); }
  }
  const rows: DraftClubRow[] = Object.values(league.teams).map(t => ({ id: t.abbr, wins: t.wins, losses: t.losses, made: made.has(t.abbr) }));
  if (rows.length !== 30 || made.size !== 16 || rows.filter(r => r.made).length !== 16) return null;
  return { sport: 'nba', draftYear: league.season + 1, rows };
}

/** The order of that season's draft under the rule set this game plays for its year and the desk's own pick rules
    (the lottery table on them), drawn on the lift's keyed streams with the season's own key unless another is handed
    in: the same season always gives the identical order, and nothing draws from Math.random. Null before the game's
    first earned draft (2027: a league opens in 2026, so every save's first draft is 2027 or later). */
export function nbaDraftOrder(season: DraftSeason, key?: string): SavedDraftOrder | null {
  const rules = draftRulesFor('nba', season.draftYear);
  if (!rules) return null;
  return buildDraftOrder(season, rules, nbaGamePickRules(), key ?? draftSeasonKey(season, rules.id));
}

/** The night on the desk, only while it is this season's: a closed season (the last round played and its champion
    named) whose block validates for these clubs and this year. Null otherwise, so the old draft runs. */
export function nbaDraftNightOf(desk: GmDesk, league: NbaLeague): GmDraftNight | null {
  if (!Object.prototype.hasOwnProperty.call(desk.blocks, NBA_DRAFT_BLOCK)) return null;
  if (league.round !== NBA_ROUNDS || !league.champions.some(c => c.season === league.season)) return null;
  const raw = desk.blocks[NBA_DRAFT_BLOCK];
  return isGmDraftNight(raw, Object.keys(league.teams), league.season) ? raw : null;
}

/** Open draft night: draw the order once (keyed, so it draws no number), lay it over the pick ledger, and write the
    block. Null, having written nothing, before the game's first earned draft, when his club holds no draft list the
    engine can read, when the season is not closed or the playoff sixteen is not on hand, and when the night it would
    write is one its own validator refuses (a migrated ledger can hold such a list). A night already open for this
    season is answered as it stands, the desk untouched: opening it again would hand back a fresh night with no
    pick made over markers already spent, and put him back on the clock at a slot whose pick is gone. */
export function openNbaDraftNight(desk: GmDesk, league: NbaLeague, series: SeriesResult[], me: string): { desk: GmDesk; night: GmDraftNight } | null {
  const mine = league.teams[me];
  if (!mine || nbaDraftCapital(mine) === null) return null;
  const current = nbaDraftNightOf(desk, league);
  if (current) return { desk, night: current };
  const season = nbaDraftSeason(league, series);
  const order = season ? nbaDraftOrder(season) : null;
  if (!order) return null;
  const night = openDraftNight(order, draftSlots(order, nbaPicksOf(desk, league), league.season, 2), league.season);
  if (!isGmDraftNight(night, Object.keys(league.teams), league.season)) return null;
  const next = withGmBlock(desk, NBA_DRAFT_BLOCK, night);
  return nbaDraftNightOf(next, league) ? { desk: next, night } : null;
}

/** The class's two knobs (the brief's A4), on a RIVAL's man only, after he signs, and neither draws a number:
    `rivalSecondOnMin`, a rival's second round man signs one season at the league minimum instead of the rookie
    scale; `latePot`, a rival's man taken at overall pick `from` or later has his ceiling capped at `cap`, never
    under his own rating (null leaves every ceiling as drawn). Tuned against the two arm table of
    scripts/simNbaEarnedDraft.mjs; the values and why are in docs/audits/ROUND-1321-NOTES.md. */
export const NBA_DRAFT_KNOBS: { readonly rivalSecondOnMin: boolean; readonly latePot: { readonly from: number; readonly cap: number } | null } = {
  rivalSecondOnMin: false,
  latePot: null,
};

export interface NbaDraftHostCtx { me: string; season: number; scoutLevel: number; rng: () => number }

/** The NBA's half of a night. Every club spends the marker of the slot's round; a man signs the engine's way
    (nbaProspectToPlayer, one draw a man, in slot order) and, for his club, the rookie scale and a line on
    `signedMine`. Rivals choose on the engine's own grade; he and his staff choose on his scout's read, and every
    grade a card shows is his scout's read. */
export function nbaDraftHost(ctx: NbaDraftHostCtx): { host: GmDraftHost<NbaLeague, NbaProspect>; signedMine: { id: string; round: number }[] } {
  const signedMine: { id: string; round: number }[] = [];
  const scout = (p: NbaProspect) => nbaScoutRead(p, ctx.me, ctx.season, ctx.scoutLevel);
  const host: GmDraftHost<NbaLeague, NbaProspect> = {
    consume: (league, club, slot) => {
      const team = league.teams[club];
      return !!team && (slot.round === 1 || slot.round === 2) && nbaConsumeDraftRound(team, slot.round);
    },
    sign: (league, club, p, slot) => {
      const signing = nbaDraftSigning(league);
      const man = nbaProspectToPlayer(p, ctx.rng, signing);
      if (club === ctx.me) {
        nbaSignDraftee(man, slot.round);
        signedMine.push({ id: man.id, round: slot.round });
      } else {
        if (NBA_DRAFT_KNOBS.rivalSecondOnMin && slot.round === 2) {
          man.salary = nbaMinContract(signing.cap);
          man.years = 1;
        }
        const late = NBA_DRAFT_KNOBS.latePot;
        if (late && slot.overall >= late.from) man.pot = Math.max(man.ovr, Math.min(man.pot, late.cap));
      }
      league.teams[club].players.push(man);
    },
    need: (league, club) => nbaDraftNeed(league.teams[club]),
    needWeight: NBA_DRAFT_NEED_WEIGHT,
    read: (p, club) => (club === ctx.me ? scout(p) : p.grade),
    shown: scout,
    pos: p => p.pos,
    id: p => p.id,
    name: p => p.name,
  };
  return { host, signedMine };
}

/** What each press answers: the desk with the block written back and his draftees on the re-sign ledger. */
export interface NbaDraftPress {
  desk: GmDesk;
  left: NbaProspect[];
  steps: RunStep[];
  onClock: EarnedSlot | null;
  done: boolean;
}

function press(
  league: NbaLeague, desk: GmDesk, me: string, rng: () => number,
  go: (host: GmDraftHost<NbaLeague, NbaProspect>, night: GmDraftNight) => EarnedDraftStep<NbaProspect> | null,
): NbaDraftPress | null {
  const night = nbaDraftNightOf(desk, league);
  if (!night || !league.teams[me]) return null;
  const scoutLevel = gmStaffLevel(nbaStaffOf(desk, league, me).block, 'scouting');
  const { host, signedMine } = nbaDraftHost({ me, season: league.season, scoutLevel, rng });
  const run = go(host, night);
  if (!run) return null;
  let next = withGmBlock(desk, NBA_DRAFT_BLOCK, run.night);
  for (const round of [...new Set(signedMine.map(s => s.round))]) {
    next = nbaNoteArrivals(next, league, me, signedMine.filter(s => s.round === round).map(s => s.id), 'draft', round);
  }
  return { desk: next, left: run.left, steps: run.steps, onClock: run.onClock, done: run.done };
}

/** "Continue to the draft". Mutates the league handed in, as the engine's own draft does: the board hands a copy. */
export function nbaDraftContinue(league: NbaLeague, desk: GmDesk, me: string, cls: NbaProspect[], rng: () => number): NbaDraftPress | null {
  return press(league, desk, me, rng, (host, night) => earnedContinue(host, league, night, me, cls));
}

/** His pick of `prospectId`, then the clubs to his next slot or the end. Null, with nothing changed, when it is
    refused. */
export function nbaDraftPick(league: NbaLeague, desk: GmDesk, me: string, cls: NbaProspect[], prospectId: string, rng: () => number): NbaDraftPress | null {
  return press(league, desk, me, rng, (host, night) => earnedPick(host, league, night, me, cls, prospectId));
}

/** "Let your staff make your picks", and the draft to its end. */
export function nbaDraftByStaff(league: NbaLeague, desk: GmDesk, me: string, cls: NbaProspect[], rng: () => number): NbaDraftPress | null {
  return press(league, desk, me, rng, (host, night) => earnedByStaff(host, league, night, me, cls));
}

/** A run of picks as the existing draft night card draws it, with true pick numbers. */
export function nbaDraftRun(steps: RunStep[], onClock: EarnedSlot | null): ReturnType<typeof draftRunReveal> {
  return draftRunReveal(steps, onClock);
}

/** A club as it sits in a sentence: "the Nuggets". */
export function nbaDraftLabel(club: string): string {
  const name = NBA_TEAM_MAP.get(club)?.name;
  return name ? `the ${name}` : club;
}

/** The heading tile's lines after the lottery. */
export function nbaDraftHeading(night: GmDraftNight, me: string, labelOf: (club: string) => string = nbaDraftLabel): string[] {
  return earnedDraftHeading(night, me, labelOf);
}

/** The heading's "?": the lottery's rule as the league used it from its 2019 draft to its 2026 draft, the chances,
    then this game's own draft, with a worked example computed from this night. Nothing here prints a line of the
    desk's pick rules' `partial`, which still describes the old draft. */
export function nbaDraftHelp(night: GmDraftNight, me: string): LotteryHelpBlock[] {
  const lottery = nbaGamePickRules().lottery;
  const size = nbaEarnedClassSize(night.slots.length);
  const own: string[] = [
    `This game's draft is two rounds of prospects it generates: ${night.slots.length} picks tonight and a class of ${size}, so the last club still has a choice.`,
    'Each rival club takes the best man on its own read, leaning a little to a position its best eight are short of.',
    'Every grade you see is your scout\'s read, never the true rating.',
    'A pick traded away is used by the club that holds it, at the place its first club earned. A pick you hold from another club is yours, at that club\'s place.',
    'Your staff can make every pick you have left, on your scout\'s read and your needs, and the rest of the draft runs to its end.',
  ];
  const example = lotteryRangeLine(night.order, me, lottery);
  return earnedDraftHelp(night, draftRulesFor('nba', night.order.draftYear), lottery, [
    { heading: "This game's draft", lines: own },
    ...(example ? [{ heading: 'Tonight, worked out', lines: [example] }] : []),
  ]);
}
