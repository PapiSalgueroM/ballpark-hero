/* Round 1048: the US binding of the season core. One file turns any US career
   season line into a SeasonSport for src/lib/season/core.ts; a sport hands it
   a UsSeasonBind (its number file: src/lib/season/nba.ts, nfl.ts; MLB and the
   NHL later, as number files, with no change here).

   The season shown is derived AFTER the fact from generators keyed on the
   saved line, so it lands on every number the save holds and stores nothing.
   What is on the line decides everything: games played, the stat fields, and
   the team result, which is read by EXACT equality against the engine's own
   exported words (never out of a sentence). The line holds no record and no
   opponent, so his team's record is a band this career's rules give that
   result, and opponents are named only from a two sourced league shape whose
   team list is exactly the game's own for that era (otherwise "another team").

   Key streams added to the core's (each a suffix of the season key):
     |form|<stat>|<md>   one number per stat and game, for the mean's base
     |po                 the playoff path
   No React, no Math.random, no engine import, nothing evaluated at module
   scope from an import. */
import {
  shuffled,
  type Availability, type DerivedGame, type DerivedSeason, type Frame, type Rng, type SeasonEvent, type SeasonSport,
  type SeasonWords, type SlotLabel, type StatTotal, type TeamTarget,
} from './core';
import { keyedRng } from '../keyedRng';
import { usLeagueShape, type UsShape } from '@/data/usLeagueShape';
import type { UsCareerCore, UsCareerSeason } from '../usCareerSport';

/** The saved line, the sport's own numbers included. */
export type UsRow = UsCareerSeason & Record<string, unknown>;

/** The viewer's words, as plain data (the component maps them onto the shared Season Centre). */
export interface UsHelp { title: string; intro: string[]; controls: string; examples: { head: string; body: string }[]; footnote: string }
export interface UsCopy {
  start: string; lastBadge: string; lastHead: string; lastBody: (round: string) => string;
  best: string; bestSoFar: string; scope: string; soFarHead: string; tie: string; list: string; side: string;
}
export interface UsClock {
  length: number;
  label: (minute: number) => string;
  start: string; end: string; endShort: string;
  /** The width class of the feed's time column, a whole literal (the stylesheet must hold it). */
  labelClass?: string;
}
export interface UsSeasonView {
  words: SeasonWords;
  copy: UsCopy;
  clock: UsClock;
  eventWords(e: SeasonEvent, us: string, them: string, pos: string): string;
  missed(why: DerivedGame['why']): string;
  /** The rest of his line in a game as short bits, no two alike in one game.
   *  The headline number is the chip (markChip), so it is not repeated here. */
  lineOf(g: DerivedGame, pos: string): string[];
  /** One number for "best game". */
  markOf(g: DerivedGame, pos: string): number;
  /** The headline of his line in a game ("31 PTS"), printed first, before the bits. */
  markChip(g: DerivedGame, pos: string): string;
  markText(g: DerivedGame, pos: string): string;
  soFar(so: Record<string, number>, pos: string): [string, string][];
  half(so: Record<string, number>, pos: string): string;
  /** The board's review labels by their short tile label ('Points per game' to 'PPG'); a label not here prints as it is. */
  tileLabels: Record<string, string>;
  /** The "?" sheet. `named`: opponents are named this season. `opp`: a team of
   *  this season that is not his, for the worked example; absent when nobody is named. */
  help(named: boolean, opp?: string): UsHelp;
}

export interface UsSeasonCtx {
  name: string; pos: string; eraId: string | undefined; team: string; teamLabel: string; year: number;
  /** The ledger's length for that year. */
  length: number;
  /** null: opponents are "another team". */
  shape: UsShape | null;
  /** Team id by slot ([] when shape is null); order[0] is his. */
  order: string[];
  /** The printed name by slot. */
  names: string[];
  /** With a shape: how many slots after his are division rivals, and how many are his conference (division included). */
  divSlots: number;
  confSlots: number;
}

export interface UsSeasonBind {
  slug: 'nba' | 'nfl' | 'mlb' | 'nhl';
  /** 'NBA' */
  league: string;
  /** The season the game by game view is built for: 82, 17. */
  fullSeason: number;
  /** The real season's games a team that year, from the sport's own two sourced ledger
   *  (src/data/usSeasonLengths.ts); null: no single length, or a year the ledger does not hold. */
  realLength(year: number): number | null;
  /** Why that year has no game by game view, in the words the hub already shows; null: it has one. */
  heldLine(year: number): string | null;
  /** The ENGINE'S exported word for a missed postseason, never a copy. */
  missed: string;
  /** The engine's exported results, in playoff depth order. */
  results: readonly string[];
  /** Wins held by this career's own rule: [missed, depth 0, 1, 2, ...]. */
  bands: readonly (readonly [number, number])[];
  /** One [wins needed, most games] a playoff round; null: one game a round. */
  series: readonly (readonly [number, number])[] | null;
  /** The round names, in order. */
  rounds: readonly string[];
  /** Frame.cap: the most a side may hold after a repair. */
  cap: number;
  seasonLabel(year: number): string;
  /** The line's stat fields that enter the key, in a fixed order. */
  statKeys(pos: string): readonly string[];
  /** The game's own team ids for an era (the engine's function, so a shape is only used when it matches). */
  teamIds(eraId: string | undefined): readonly string[];
  score(edge: number, home: boolean, rng: Rng, eraId: string | undefined): [number, number];
  /** His team's strength for that share of wins, on score's scale. */
  strengthFor(winShare: number): number;
  /** Every other team's keyed strength is uniform in minus this to plus this. */
  oppSpread: number;
  totals(row: UsRow, pos: string): StatTotal[];
  availability(row: UsRow): Availability;
  /** A mean's starting value for one game; `u` is a keyed number in [0, 1) for that stat and game. */
  meanBase(key: string, g: DerivedGame, row: UsRow, u: number): number;
  /** The league's schedule formula dealt for his team: rounds of one [home, away] slot pair, slots as ctx.order. */
  deal(ctx: UsSeasonCtx, rng: Rng): [number, number][][];
  /** A season with no league shape, in this sport's own order of games; absent: the shared `dealUnnamed`. */
  dealUnnamed?(games: number, rng: Rng): [number, number][][];
  finish(games: DerivedGame[], row: UsRow, pos: string, rng: Rng, ctx: UsSeasonCtx): boolean;
  check(row: UsRow, pos: string, s: DerivedSeason, ctx: UsSeasonCtx): string[];
  view: UsSeasonView;
}

export type UsSeasonBuild =
  | { ok: true; sport: SeasonSport<UsRow, UsSeasonCtx>; ctx: UsSeasonCtx; key: string }
  | { ok: false; why: 'held' | 'empty'; line: string };

export interface UsPlayoffStep { round: string; opp: string; won: boolean; score: string | null }
export interface UsPlayoffPath { steps: UsPlayoffStep[] }
/** Round 1300: one playoff round as NUMBERS. `slot`: the opponent's slot of ctx.order, or null (unnamed).
 *  `need` and `most`: wins needed and the most games the round can hold (1 and 1: one game).
 *  `games`: the games that round ran to, or null when the save's playoff games count is absent or
 *  does not fit the rounds played (then nothing can be laid out game by game). */
export interface UsPlayoffSeries { round: string; opp: string; slot: number | null; won: boolean; need: number; most: number; games: number | null }
export interface UsPlayoffLay { champion: boolean; series: UsPlayoffSeries[] }

/** Whole numbers summing to `total`, shared out by weight (largest remainder),
 *  each at least its minimum and at most its cap. null when the caps or the
 *  minimums cannot hold the total. A weight of zero only gets what is forced. */
export function splitTotal(total: number, weights: readonly number[], caps: readonly number[], mins?: readonly number[]): number[] | null {
  const n = weights.length;
  if (!Number.isInteger(total) || total < 0 || caps.length !== n) return null;
  const x = Array.from({ length: n }, (_, i) => mins?.[i] ?? 0);
  for (let i = 0; i < n; i += 1) if (!Number.isInteger(x[i]) || x[i] < 0 || x[i] > caps[i]) return null;
  let rem = total - x.reduce((a, b) => a + b, 0);
  if (rem < 0) return null;
  while (rem > 0) {
    const act: number[] = [];
    for (let i = 0; i < n; i += 1) if (x[i] < caps[i]) act.push(i);
    if (act.length === 0) return null;
    const w = act.map(i => (weights[i] > 0 ? weights[i] : 1e-9));
    const W = w.reduce((a, b) => a + b, 0);
    const share = w.map(v => (rem * v) / W);
    const whole = act.map((i, k) => Math.min(caps[i] - x[i], Math.floor(share[k])));
    const given = whole.reduce((a, b) => a + b, 0);
    if (given > 0) {
      act.forEach((i, k) => { x[i] += whole[k]; });
      rem -= given;
      continue;
    }
    /* every share is under one: the largest remainders take one each */
    const by = act.map((i, k) => ({ i, f: share[k] })).sort((a, b) => b.f - a.f || a.i - b.i);
    for (let k = 0; k < by.length && rem > 0; k += 1) { x[by[k].i] += 1; rem -= 1; }
  }
  return x;
}

/** A season with no league shape: `games` opponents once each, home and away
 *  split evenly by a keyed shuffle (the odd game's side keyed too). */
export function dealUnnamed(games: number, rng: Rng): [number, number][][] {
  const homes = Math.floor(games / 2) + (games % 2 === 1 && rng() < 0.5 ? 1 : 0);
  const flags = shuffled(Array.from({ length: games }, (_, i) => i < homes), rng);
  return flags.map((home, i): [number, number][] => [home ? [0, i + 1] : [i + 1, 0]]);
}

/** The band a team result holds, by exact equality with the engine's own words; null: an unknown result. */
export function usBandOf(bind: UsSeasonBind, teamResult: string): readonly [number, number] | null {
  if (teamResult === bind.missed) return bind.bands[0] ?? null;
  const i = bind.results.indexOf(teamResult);
  return i < 0 ? null : bind.bands[i + 1] ?? null;
}

/** The game's own teams of that season by slot, or null when the ledger's
 *  shape is not exactly the game's list for the era (then nobody is named). */
function slotOrder(bind: UsSeasonBind, shape: UsShape | null, eraId: string | undefined, team: string): { order: string[]; divSlots: number; confSlots: number } | null {
  if (!shape) return null;
  const ledger = shape.divisions.flatMap(d => d.teams);
  const own = bind.teamIds(eraId);
  if (ledger.length !== own.length || new Set(ledger).size !== ledger.length) return null;
  const ownSet = new Set(own);
  if (ownSet.size !== own.length || !ledger.every(id => ownSet.has(id))) return null;
  const mine = shape.divisions.find(d => d.teams.includes(team));
  if (!mine) return null;
  const rivals = mine.teams.filter(id => id !== team);
  const conf = shape.divisions.filter(d => d !== mine && d.conf === mine.conf).flatMap(d => d.teams);
  const other = shape.divisions.filter(d => d.conf !== mine.conf).flatMap(d => d.teams);
  return { order: [team, ...rivals, ...conf, ...other], divSlots: rivals.length, confSlots: rivals.length + conf.length };
}

/** The season key: saved fields only, so any device rebuilds the same season. */
export function usSeasonKey(bind: UsSeasonBind, career: Pick<UsCareerCore, 'name' | 'pos' | 'eraId'>, row: UsRow): string {
  const stats = bind.statKeys(career.pos).map(k => row[k] ?? '');
  return [career.name, bind.slug, career.eraId ?? 'now', career.pos, row.team, row.year, row.games, ...stats, row.teamResult, 'centre'].join('|');
}

/** One saved season line as a sport for the core, or why it has no game by game view. */
export function buildUsSeason(
  bind: UsSeasonBind,
  career: Pick<UsCareerCore, 'name' | 'pos' | 'eraId'>,
  row: UsRow,
  labelOf: (id: string, eraId?: string) => string,
): UsSeasonBuild {
  const eraId = career.eraId;
  const pos = career.pos;
  const length = bind.realLength(row.year);
  if (length === null || length !== bind.fullSeason) {
    const line = bind.heldLine(row.year) ?? '📺 No week by week this season: the game has no verified length for the real season.';
    return { ok: false, why: 'held', line };
  }
  if (!(row.games > 0) || row.teamResult === 'SUSPENDED') return { ok: false, why: 'empty', line: 'There are no games to show for this season.' };
  const key = usSeasonKey(bind, career, row);
  const slots = slotOrder(bind, usLeagueShape(bind.slug, eraId, row.year), eraId, row.team);
  const shape = slots ? usLeagueShape(bind.slug, eraId, row.year) : null;
  const teamLabel = labelOf(row.team, eraId);
  const unnamed = bind.view.words.unnamed;
  const order = slots ? slots.order : [];
  const teams = slots ? order.length : length + 1;
  const names = slots ? order.map(id => labelOf(id, eraId)) : Array.from({ length: teams }, (_, i) => (i === 0 ? teamLabel : unnamed));
  const ctx: UsSeasonCtx = {
    name: career.name, pos, eraId, team: row.team, teamLabel, year: row.year, length, shape, order, names,
    divSlots: slots ? slots.divSlots : 0, confSlots: slots ? slots.confSlots : 0,
  };
  const band = usBandOf(bind, row.teamResult);
  const target: TeamTarget = band ? { kind: 'record', winsMin: band[0], winsMax: band[1] } : { kind: 'none' };
  const frame: Frame = { mode: 'record', teams, games: length, rule: null, cap: bind.cap };
  const sport: SeasonSport<UsRow, UsSeasonCtx> = {
    id: bind.slug,
    seasonKey: () => key,
    frame: () => frame,
    fixtures: (_f, rng) => (shape ? bind.deal(ctx, rng) : (bind.dealUnnamed ?? dealUnnamed)(length, rng)),
    target: () => target,
    fixed: () => [],
    availability: () => bind.availability(row),
    totals: () => bind.totals(row, pos),
    apps: () => row.games,
    score: (edge, home, rng) => bind.score(edge, home, rng, eraId),
    strengths: (f, t, _slotOf, _c, rng) => {
      /* his team aims inside its band, so two seasons with one result do not
         land on one record and most seasons need no repair */
      const u = rng();
      const mine = t.kind === 'record' ? bind.strengthFor((t.winsMin + (0.2 + 0.6 * u) * (t.winsMax - t.winsMin)) / f.games) : 0;
      return Array.from({ length: f.teams }, (_, i) => (i === 0 ? mine : (rng() * 2 - 1) * bind.oppSpread));
    },
    meanBase: (k, g) => bind.meanBase(k, g, row, keyedRng(`${key}|form|${k}|${g.md}`)()),
    subChance: () => 0,
    labels: facts => facts.map((s): SlotLabel => (slots
      ? { name: names[s.slot], named: true, key: order[s.slot] }
      : s.slot === 0 ? { name: teamLabel, named: true, key: row.team } : { name: unnamed, named: false, key: `u${s.slot}` })),
    finish: (games, _row, _ctx, rng) => bind.finish(games, row, pos, rng, ctx),
    check: (_row, _ctx, s) => {
      const out: string[] = [];
      if (s.labels[0]?.name !== teamLabel) out.push('slot 0 is not his team');
      if (slots) {
        if (new Set(s.labels.map(l => l.name)).size !== s.labels.length) out.push('a team is named twice');
        if (s.labels.some(l => !l.named)) out.push('a named season has an unnamed team');
      } else if (s.labels.slice(1).some(l => l.named || l.name !== unnamed)) out.push('an unnamed season names a team');
      out.push(...bind.check(row, pos, s, ctx));
      return out;
    },
    words: bind.view.words,
  };
  return { ok: true, sport, ctx, key };
}

/** How many playoff rounds a result means he played, and whether he won the last one; null: no postseason. */
export function usPlayoffDepth(bind: UsSeasonBind, teamResult: string): { rounds: number; champion: boolean } | null {
  const i = bind.results.indexOf(teamResult);
  if (i < 0) return null;
  return { rounds: Math.min(bind.rounds.length, i + 1), champion: i === bind.results.length - 1 };
}

/** Round 1300: the playoff run as numbers, keyed on `|po` (nothing of the
 *  regular season moves): who he met in each round, whether he won it, and how
 *  many games it ran to. Every draw `usPlayoffPath` made before this was lifted
 *  out of it is made here, in the same order, so the path is what it was. null:
 *  no postseason, an unknown result, or playoff numbers on the save that
 *  disagree with the result (then nothing is drawn). */
export function usPlayoffLay(bind: UsSeasonBind, row: UsRow, ctx: UsSeasonCtx, key: string): UsPlayoffLay | null {
  const depth = usPlayoffDepth(bind, row.teamResult);
  if (!depth) return null;
  const n = depth.rounds;
  const rng = keyedRng(`${key}|po`);
  const po = typeof row.poGames === 'number' ? row.poGames : null;
  const wonAt = (r: number) => r < n - 1 || depth.champion;
  /* opponents: the last round of the bracket is the other conference's team, every earlier round his own */
  const unnamed = bind.view.words.unnamed;
  let slots: (number | null)[] = Array.from({ length: n }, () => null);
  if (ctx.shape && ctx.order.length > 1) {
    const conf = shuffled(Array.from({ length: ctx.confSlots }, (_, i) => i + 1), rng);
    const other = shuffled(Array.from({ length: ctx.order.length - 1 - ctx.confSlots }, (_, i) => ctx.confSlots + 1 + i), rng);
    slots = Array.from({ length: n }, (_, r) => {
      const slot = r === bind.rounds.length - 1 ? other[0] : conf[r];
      return slot === undefined ? null : slot;
    });
  }
  const games: (number | null)[] = Array.from({ length: n }, () => null);
  if (bind.series) {
    const need = bind.series.slice(0, n);
    const lo = need.reduce((a, s) => a + s[0], 0);
    const hi = need.reduce((a, s) => a + s[1], 0);
    if (need.length === n && po !== null && Number.isInteger(po) && po >= lo && po <= hi) {
      const len = need.map(s => s[0]);
      for (let extra = po - lo; extra > 0; extra -= 1) {
        const room = len.map((v, r) => (v < need[r][1] ? r : -1)).filter(r => r >= 0);
        len[room[Math.floor(rng() * room.length)]] += 1;
      }
      len.forEach((L, r) => { games[r] = L; });
    }
  } else if (po !== null && po !== n) return null;
  /* one game a round: the count is the rounds played, or the save holds none and nothing is laid out */
  else if (po === n) games.fill(1);
  return {
    champion: depth.champion,
    series: Array.from({ length: n }, (_, r) => {
      const pair = bind.series ? bind.series[r] : ([1, 1] as const);
      const slot = slots[r];
      return { round: bind.rounds[r], opp: slot === null ? unnamed : ctx.names[slot], slot, won: wonAt(r), need: pair ? pair[0] : 0, most: pair ? pair[1] : 0, games: games[r] };
    }),
  };
}

/** The playoff path round by round: the lay above, as the review's list
 *  prints it. null where the lay is. A series shows its score only when the
 *  saved playoff games fit the rounds played. */
export function usPlayoffPath(bind: UsSeasonBind, row: UsRow, ctx: UsSeasonCtx, key: string): UsPlayoffPath | null {
  const lay = usPlayoffLay(bind, row, ctx, key);
  if (!lay) return null;
  const n = lay.series.length;
  const wonAt = (r: number) => lay.series[r].won;
  const opps = lay.series.map(s => s.opp);
  const scores: (string | null)[] = lay.series.map(s => (bind.series && s.games !== null ? (s.won ? `${s.need}-${s.games - s.need}` : `${s.games - s.need}-${s.need}`) : null));
  /* One game a round: no score is drawn. The save holds his playoff numbers
     as a sentence (so many touchdowns, so many field goals) and no score, and
     a keyed score that is not held to those numbers can contradict them (two
     field goals of his under a 9, two touchdown passes under a 7). Reading
     numbers back out of a sentence is not something this binding does, so
     the round shows who he met and whether he won. */
  return { steps: Array.from({ length: n }, (_, r) => ({ round: bind.rounds[r], opp: opps[r], won: wonAt(r), score: scores[r] })) };
}

/** The "?" sheet every US sport shares; a sport adds its own worked examples.
 *  The record numbers are read from the bind's bands, never typed twice.
 *  `whoWhen`: the sport's words for its order of games ('Who you meet on
 *  which night' when absent). `playoffNote`: a sentence of the sport's own
 *  about its playoff path, printed after the shared footnote. */
export function usHelp(o: { named: boolean; games: number; bands: readonly (readonly [number, number])[]; examples: UsHelp['examples']; whoWhen?: string; playoffNote?: string }): UsHelp {
  const missed = o.bands[0];
  const champion = o.bands[o.bands.length - 1];
  return {
    title: 'How the Season Center works',
    intro: [
      'Your season was played the moment you pressed the button. This is that same season, game by game, so nothing here can change it. Your career is the same whether you watch or not.',
      o.named
        ? `The teams, the divisions and how often you meet each one follow the league's standard schedule formula. ${o.whoWhen ?? 'Who you meet on which night'}, every score and every stat line are this career's own, not a real schedule.`
        : "Opponents are not named this season, because the game does not hold that season's divisions and schedule. Every score and every stat line are this career's own.",
      `Your team's record is this career's own too. It always fits how your season ended: here a champion wins ${champion[0]} to ${champion[1]} of ${o.games} and a team that missed the playoffs ${missed[0]} to ${missed[1]}.`,
      'If a contract talk comes up when you press Week by week, answer it first. If you play the year out, the season runs straight away and you can open it afterwards with Watch again.',
    ],
    controls: '▶ plays the next game. ⏩ jumps to the next big one (halfway, the last game). ⏭ goes straight to the end. 1x and 3x set the clock, Results shows each game at the final.',
    examples: o.examples,
    footnote: `The playoffs show as a path, round by round, with the numbers your season card already has. From 2026 on, the league is this career's own world on today's format.${o.playoffNote ? ` ${o.playoffNote}` : ''}`,
  };
}
