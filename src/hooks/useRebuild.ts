import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Player } from '@/types/game';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import {
  fetchRebuildClubs, fetchClubSquad, fetchMarket,
  type RebuildClub,
} from '@/lib/fetchRebuild';
import {
  simulateRival, simulateSeason, KEEP_MANAGER,
  type ManagerOption, type RivalResult, type SeasonResult, type RebuildPreset,
} from '@/lib/rebuildDeck';
import * as loop from '@/lib/rebuildLoop';
import type { RunState, ObjectiveView } from '@/lib/rebuildLoop';

/**
 * Round 456: the hook is a thin wrapper now. Every rule lives in
 * src/lib/rebuildLoop.ts as a pure function over a RunState; this file owns
 * the network (clubs, squads, the market), the two timers (the wheel's spin
 * and the rival's pause in a bidding war) and the season sim that runs after
 * the whistle. The board reads the run and calls the actions.
 */
export type Phase = 'pick-club' | loop.RunPhase;

export interface RebuildState {
  phase: Phase;
  loading: boolean;
  clubs: RebuildClub[];
  club: RebuildClub | null;
  preset: RebuildPreset;
  setPreset: (p: RebuildPreset) => void;
  chooseClub: (c: RebuildClub) => void;
  reset: () => void;
  /** The whole run as plain data, null until a club is picked. */
  run: RunState | null;
  // readings
  startingXi: (Player | null)[];
  startRating: number;
  currentRating: number;
  target: number;
  budget: number;
  spendCeiling: number;
  finalFunds: number;
  objectives: ObjectiveView[];
  grade: string;
  shareText: string;
  /** What the XI would read right now with this manager in charge. */
  managerReading: (m: ManagerOption) => number;
  offerPrice: (p: Player) => number;
  canRedeal: boolean;
  // the envelopes and the manager
  pickFinance: (i: number) => void;
  toManager: () => void;
  hireManager: (m: ManagerOption) => void;
  keepManager: ManagerOption;
  setFormation: (name: string) => void;
  // the spin
  spinning: boolean;
  spin: () => void;
  keepSpun: () => void;
  sellSpun: () => void;
  takeReplacement: (p: Player) => void;
  promoteBench: (p: Player) => void;
  takeForty: () => void;
  redealSpun: () => void;
  // bidding wars
  thinking: boolean;
  raiseWar: () => void;
  walkAway: () => void;
  // the whistle
  finish: () => void;
  rivals: RivalResult[] | null;
  rivalsLoading: boolean;
  season: SeasonResult | null;
}

export function useRebuild(): RebuildState {
  const [loading, setLoading] = useState(true);
  const [clubs, setClubs] = useState<RebuildClub[]>([]);
  const [preset, setPresetState] = useState<RebuildPreset>('none');
  const [run, setRun] = useState<RunState | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [rivals, setRivals] = useState<RivalResult[] | null>(null);
  const [rivalsLoading, setRivalsLoading] = useState(false);
  const [season, setSeason] = useState<SeasonResult | null>(null);
  const spinTimer = useRef<number | null>(null);
  const warTimer = useRef<number | null>(null);
  const seasonFor = useRef<RunState | null>(null);

  useEffect(() => () => {
    if (warTimer.current) window.clearTimeout(warTimer.current);
    if (spinTimer.current) window.clearTimeout(spinTimer.current);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchRebuildClubs().then(c => {
      if (cancelled) return;
      setClubs(c);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  /** Every action goes through here: no run, no change. */
  const act = useCallback((fn: (r: RunState) => RunState) => {
    setRun(r => (r ? fn(r) : r));
  }, []);

  const phase: Phase = run ? run.phase : 'pick-club';

  const setPreset = useCallback((p: RebuildPreset) => {
    // The restriction is a promise made before the window opens, never changed mid run.
    setPresetState(prev => (run ? prev : p));
  }, [run]);

  const chooseClub = useCallback(async (c: RebuildClub) => {
    setLoading(true);
    const [squad, market] = await Promise.all([fetchClubSquad(c.club), fetchMarket(c.club)]);
    setRun(loop.createRun({ club: c, clubs, squad, market, preset }));
    setRivals(null);
    setSeason(null);
    seasonFor.current = null;
    setLoading(false);
  }, [clubs, preset]);

  const pickFinance = useCallback((i: number) => act(r => loop.pickFinance(r, i)), [act]);
  const toManager = useCallback(() => act(loop.toManager), [act]);
  const hireManager = useCallback((m: ManagerOption) => act(r => loop.hireManager(r, m.id)), [act]);
  const setFormation = useCallback((name: string) => {
    if (spinning) return;
    act(r => loop.setFormation(r, name));
  }, [act, spinning]);

  const spin = useCallback(() => {
    if (!run || run.phase !== 'spin' || spinning || run.spun !== null || run.deal || run.war) return;
    if (run.settledCount >= run.order.length) return;
    setSpinning(true);
    spinTimer.current = window.setTimeout(() => {
      setSpinning(false);
      setRun(r => (r ? loop.spinNext(r) : r));
    }, 1200);
  }, [run, spinning]);

  const keepSpun = useCallback(() => { if (!spinning) act(loop.keep); }, [act, spinning]);
  const sellSpun = useCallback(() => { if (!spinning) act(loop.sell); }, [act, spinning]);
  const takeReplacement = useCallback((p: Player) => act(r => loop.takeOffer(r, p.name)), [act]);
  const promoteBench = useCallback((p: Player) => act(r => loop.promote(r, p.name)), [act]);
  const takeForty = useCallback(() => act(loop.takeForty), [act]);
  const redealSpun = useCallback(() => act(loop.redeal), [act]);

  const raiseWar = useCallback(() => {
    if (!run?.war || run.war.outcome !== 'live' || run.war.leader !== 'rival' || thinking) return;
    act(loop.raise);
    setThinking(true);
    warTimer.current = window.setTimeout(() => {
      setThinking(false);
      setRun(r => (r ? loop.rivalReply(r) : r));
    }, 700 + Math.floor(Math.random() * 500));
  }, [run, thinking, act]);

  const walkAway = useCallback(() => {
    if (thinking) return;
    act(loop.walk);
  }, [act, thinking]);

  /* A settled war (won or lost) stays on screen for a moment, then clears
     itself so the loop can move on. */
  const warOutcome = run?.war?.outcome ?? null;
  useEffect(() => {
    if (!warOutcome || warOutcome === 'live') return;
    const t = window.setTimeout(() => setRun(r => (r ? loop.clearWar(r) : r)), 1500);
    return () => window.clearTimeout(t);
  }, [warOutcome]);

  const finish = useCallback(() => act(loop.blowWhistle), [act]);

  /* Rivals post their windows after yours closes, then the season kicks off.
     Runs once per reckoning, off the post reckoning XI, manager lift included. */
  useEffect(() => {
    if (!run || run.phase !== 'done' || !run.reckoning || seasonFor.current === run) return;
    seasonFor.current = run;
    let cancelled = false;
    (async () => {
      setRivalsLoading(true);
      try {
        const plans = run.rivalPlans.length === 2 ? run.rivalPlans : [];
        const humanSigned = new Set(run.signed.map(p => p.name));
        const results: RivalResult[] = [];
        for (let i = 0; i < plans.length; i++) {
          const plan = plans[i];
          const rivalSquad = await fetchClubSquad(plan.club.club);
          const wonInWars = Object.entries(run.lost).filter(([, idx]) => idx === i).map(([n]) => n);
          results.push(simulateRival(plan, rivalSquad, run.market, humanSigned, run.seed, wonInWars));
        }
        if (cancelled) return;
        setRivals(results);
        const postXiPlayers = run.reckoning!.xi.filter(Boolean) as Player[];
        const postRating = postXiPlayers.length ? loop.ratingOf(run) : 0;
        const usedClubs = new Set([run.club.club, ...plans.map(p => p.club.club)]);
        const fillerPool = clubs.filter(c => !usedClubs.has(c.club) && c.tier === run.club.tier);
        const anyPool = fillerPool.length >= 3 ? fillerPool : clubs.filter(c => !usedClubs.has(c.club));
        const off = anyPool.length ? run.seed % anyPool.length : 0;
        const fillers = anyPool.length ? [...anyPool.slice(off), ...anyPool.slice(0, off)].slice(0, 3) : [];
        setSeason(simulateSeason({ clubName: run.club.club, rating: postRating, xi: postXiPlayers }, results, fillers, run.seed));
      } catch {
        if (!cancelled) { setRivals(null); setSeason(null); }
      } finally {
        if (!cancelled) setRivalsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [run, clubs]);

  const reset = useCallback(() => {
    setRun(null);
    setSpinning(false);
    setThinking(false);
    setRivals(null);
    setSeason(null);
    seasonFor.current = null;
    if (warTimer.current) window.clearTimeout(warTimer.current);
    if (spinTimer.current) window.clearTimeout(spinTimer.current);
  }, []);

  // readings
  const startingXi = useMemo(() => (run ? loop.xiOf(run) : []), [run]);
  const currentRating = useMemo(() => (run ? loop.ratingOf(run) : 0), [run]);
  const budget = run ? loop.budgetOf(run) : 0;
  const spendCeiling = run ? loop.spendCeilingOf(run) : 0;
  const finalFunds = run ? loop.finalFundsOf(run) : 0;
  const objectives = useMemo(() => (run ? loop.objectivesOf(run) : []), [run]);
  const startRating = run?.startRating ?? 0;
  const target = run?.target ?? 0;
  const grade = run ? loop.gradeOf(run) : '';
  const managerReading = useCallback((m: ManagerOption) => (run ? loop.ratingOf(run, m) : 0), [run]);
  const offerPrice = useCallback((p: Player) => (run ? loop.offerPrice(run, p) : p.marketValue), [run]);
  const canRedeal = run ? loop.canRedeal(run) : false;

  useGameCompletion('rebuild', phase === 'done', Math.max(0, currentRating * 10), currentRating >= target ? 1 : 0);

  const shareText = useMemo(() => {
    if (!run || run.phase !== 'done') return '';
    const rivalLine = rivals && rivals.length === 2
      ? `\nvs ${rivals[0].name} ${rivals[0].finalRating} · ${rivals[1].name} ${rivals[1].finalRating}`
      : '';
    const seasonLine = season ? `\nSeason: #${season.position} of ${season.table.length}` : '';
    return `Rebuild: ${run.club.club}\n${startRating} → ${currentRating} (target ${target})\nManager: ${run.manager?.name ?? KEEP_MANAGER.name}\n${grade}${rivalLine}${seasonLine}\nSold ${run.sold.length} · Signed ${run.signed.length} · €${finalFunds}M left\ndouknowball.com/rebuild`;
  }, [run, startRating, currentRating, target, grade, finalFunds, rivals, season]);

  return {
    phase, loading, clubs, club: run?.club ?? null, preset, setPreset, chooseClub, reset,
    run,
    startingXi, startRating, currentRating, target, budget, spendCeiling, finalFunds, objectives, grade, shareText,
    managerReading, offerPrice, canRedeal,
    pickFinance, toManager, hireManager, keepManager: KEEP_MANAGER, setFormation,
    spinning, spin, keepSpun, sellSpun, takeReplacement, promoteBench, takeForty, redealSpun,
    thinking, raiseWar, walkAway,
    finish, rivals, rivalsLoading, season,
  };
}
