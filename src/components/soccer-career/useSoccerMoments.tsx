/* Round 1047: Soccer Career's side of the Season Centre's moments.

   It turns the planner's moments (src/lib/season/core.ts) into what the
   shared viewer needs (CentreMoments): the words, the training ground board
   for each one, the ledger writes and the bank. Every write goes through
   `onCareer` as a pure update of the save, and only after the player pressed
   "Take it yourself"; reading the offer writes nothing. */
import { useMemo } from 'react';
import type { CareerState, SeasonRecord } from '@/lib/soccerCareerEngine';
import { momentResult, otherOutcome, type DerivedSeason, type Moment } from '@/lib/season/core';
import { SOCCER, type SoccerSeasonCtx } from '@/lib/season/soccer';
import { ledgerPut, readSeasonMoments } from '@/lib/season/momentsSave';
import {
  CALL_LINE, MOMENT_BOARD, MOMENT_HOW, MOMENT_LINE, MOMENT_STARS_MAX, RECREATE_LINE, applySeasonMomentsBank, momentAfter, momentRound, momentSeed,
  momentSetup, momentShotRng, momentsKickoffLine, packMomentInput, settleMoment,
} from '@/lib/season/soccerMoments';
import type { SoccerMomentKind } from '@/lib/season/soccerEvents';
import { WALL_SHOT_HOW, type WallShotSetup } from '@/lib/careerDrills';
import type { CentreMoment, CentreMoments } from '@/components/season-centre/MomentHost';
import SoccerMomentBoard, { preloadMomentBoard } from './SoccerMomentBoard';

interface Args {
  career: CareerState;
  row: SeasonRecord;
  ctx: SoccerSeasonCtx;
  plan: DerivedSeason | null;
  key: string | null;
  offered: Moment[];
  /** The ledger's entries for this season, as JSON (a stable memo key). */
  entriesKey: string;
  banked: boolean;
  onCareer?: (fn: (prev: CareerState) => CareerState) => void;
}

/** The round a moment is played on: its board, its seed and its setup. */
function roundOf(key: string, m: Moment, wallShotRules: number) {
  const board = MOMENT_BOARD[m.kind as SoccerMomentKind];
  const seed = momentSeed(key, m.md, m.id);
  const round = momentRound(m.stakes);
  const legacySetup = momentSetup(board, seed, round);
  const setup = board === 'wallshot' && wallShotRules === 2
    ? { ...legacySetup, wallShotRules: 2 as const } : legacySetup;
  const rng = () => momentShotRng(key, m.md, m.id, board === 'wallshot' ? (legacySetup as WallShotSetup) : undefined);
  return { board, seed, round, setup, rng };
}

export function useSoccerMoments({ career, row, ctx, plan, key, offered, entriesKey, banked, onCareer }: Args): CentreMoments | null {
  const ledger = readSeasonMoments(career.seasonMoments);
  const wallShotRules = ledger?.key === key ? (ledger.wallShotRules ?? 1) : 2;
  return useMemo(() => {
    if (!onCareer || !plan || !key || offered.length === 0) return null;
    const supported = wallShotRules === 1 || wallShotRules === 2;
    const entries = JSON.parse(entriesKey) as number[][];
    const word = plan.mode === 'table' ? 'matchday' : 'league game';
    const find = (m: CentreMoment) => offered.find(x => x.md === m.md && x.id === m.id) ?? null;
    const all: CentreMoment[] = offered.map(m => {
      const r = momentResult(m, entries);
      const kind = m.kind as SoccerMomentKind;
      return {
        md: m.md, id: m.id, minute: m.minute, mode: m.mode, line: MOMENT_LINE[kind],
        objective: m.mode === 'recreate' ? RECREATE_LINE[kind] : CALL_LINE,
        how: MOMENT_BOARD[kind] === 'wallshot' && wallShotRules === 2 ? WALL_SHOT_HOW : MOMENT_HOW[MOMENT_BOARD[kind]],
        taken: r.taken ? { stars: r.stars, made: r.stars >= 1 } : null,
      };
    });
    /* once the season's stars are banked its moments are closed: the ones he took stay on the fixtures */
    const list = banked || !supported ? all.filter(m => m.taken) : all;
    const taken = list.filter(m => m.taken);
    const stars = taken.reduce((n, m) => n + (m.taken?.stars ?? 0), 0);
    const review: string[] = [];
    if (!supported) review.push('These saved moments use an unsupported version. Your recorded results are kept.');
    if (taken.length > 0) {
      review.push(`Your moments: ${stars} of ${offered.length * MOMENT_STARS_MAX} stars from ${taken.length} of ${offered.length} played.`);
      const paid = banked ? [...career.events].reverse().find(e => e.startsWith('🎯 Season Centre moments:')) : null;
      if (paid) review.push(paid.replace(/^🎯 Season Centre moments: \d+ of \d+ stars\.\s*/, ''));
    }
    return {
      list,
      feedback: 'goal',
      kickoff: momentsKickoffLine(list.filter(m => !m.taken).map(m => m.md), word),
      review,
      preload: m => { const mm = find(m); return supported && mm ? preloadMomentBoard(MOMENT_BOARD[mm.kind as SoccerMomentKind]) : Promise.reject(new Error('moment unavailable')); },
      use: m => onCareer(prev => {
        if (!supported) return prev;
        const held = readSeasonMoments(prev.seasonMoments);
        const rules = held?.key === key ? (held.wallShotRules ?? 1) : 2;
        if (rules !== wallShotRules) return prev;
        return { ...prev, seasonMoments: ledgerPut(prev.seasonMoments, key, m.md, m.id, -1, [], 2) };
      }),
      board: (m, done) => {
        const mm = find(m);
        if (!mm || !supported) return null;
        const r = roundOf(key, mm, wallShotRules);
        return <SoccerMomentBoard key={`${m.md}|${m.id}|${wallShotRules}`} career={career} board={r.board} seed={r.seed} round={r.round} rng={r.rng} wallShotRules={wallShotRules} onInput={done} />;
      },
      settle: (m, input) => {
        const mm = find(m);
        if (!mm || !supported) return { made: false, stars: 0, verdict: '', after: '', wonMatch: false };
        const r = roundOf(key, mm, wallShotRules);
        const packed = packMomentInput(input);
        const play = settleMoment(r.board, r.setup, packed, r.rng());
        onCareer(prev => {
          const held = readSeasonMoments(prev.seasonMoments);
          if (held?.key !== key || (held.wallShotRules ?? 1) !== wallShotRules) return prev;
          return { ...prev, seasonMoments: ledgerPut(prev.seasonMoments, key, mm.md, mm.id, play.stars, packed) };
        });
        const flipped = mm.mode === 'call' && play.won !== mm.planSuccess;
        /* a YOUR CALL won the match when the game is a win with it made and was not one without */
        let wonMatch = false;
        if (mm.mode === 'call' && play.won) {
          const other = otherOutcome(SOCCER, row, ctx, plan, mm)?.season.games[mm.md - 1];
          const here = plan.games[mm.md - 1];
          const made = mm.planSuccess ? here : other;
          const missed = mm.planSuccess ? other : here;
          wonMatch = !!made && !!missed && made.us > made.them && !(missed.us > missed.them);
        }
        return { made: play.won, stars: play.stars, verdict: play.verdict, after: momentAfter(mm.mode, play.won, flipped, mm.mirrorMd, word), wonMatch };
      },
      bank: final => { if (final || all.every(m => m.taken)) onCareer(prev => applySeasonMomentsBank(prev, offered.length)); },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onCareer, plan, key, offered, entriesKey, banked, wallShotRules, row, ctx, career.events, career.position]);
}
