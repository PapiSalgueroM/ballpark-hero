import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Player } from '@/types/game';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import {
  fetchRebuildClubs, fetchClubSquad, fetchMarketRows, marketFromRows,
  type RebuildClub,
} from '@/lib/fetchRebuild';
import {
  simulateRival, simulateSeason, KEEP_MANAGER,
  type ManagerOption, type RivalResult, type SeasonResult, type RebuildPreset, type SharedSeasonResult,
} from '@/lib/rebuildDeck';
import * as loop from '@/lib/rebuildLoop';
import type { RunState, ObjectiveView } from '@/lib/rebuildLoop';
import * as table from '@/lib/rebuildTable';
import type { TableState, TableData, SeatView, SeatKind } from '@/lib/rebuildTable';
import {
  clearRebuildSave, isFinishedTable, readRebuildSave, restoreTable, savedClubNames,
  toSave, writeRebuildSave, type RebuildMove, type RebuildSession,
} from '@/lib/rebuildSave';
import { markRestoredFinish } from '@/lib/restoredFinish';

/**
 * Round 456: the hook is a thin wrapper now. Every rule lives in
 * src/lib/rebuildLoop.ts as a pure function over a RunState; this file owns
 * the network (clubs, squads, the market), the two timers (the wheel's spin
 * and the rival's pause in a bidding war) and the season sim that runs after
 * the whistle. The board reads the run and calls the actions.
 *
 * Round 461: the run sits in a seat at a table (src/lib/rebuildTable.ts),
 * one RunState per seat. A one seat table is the game as it was: same seed,
 * same market, same rivals and season after the whistle. With more seats the
 * windows run one after another, a hand over screen sits between two humans,
 * a CPU seat plays the thinking policy in one call, and the finished XIs
 * play one season together.
 *
 * Round 477: the table survives a refresh. The hook holds a RebuildSession
 * (the table plus one list of moves per seat) rather than a bare TableState,
 * every action that changes a run records the move that changed it, and the
 * session is written to storage after every one of them. On mount, once the
 * club list is in, a stored session is fetched for and replayed by
 * src/lib/rebuildSave.ts, which fails closed: a save that does not replay
 * exactly opens a fresh run. A restored finish says so through
 * markRestoredFinish first, or every reload of a shut table would record a
 * second completion and pay the score again.
 */
export type Phase = 'pick-club' | 'handover' | 'season' | loop.RunPhase;

/** A seat whose window is shut, as the hand over screen may show it: numbers only, never a board. */
export interface SeatScore {
  index: number;
  name: string;
  emoji: string;
  club: string;
  before: number;
  after: number;
  target: number;
}

export interface RebuildState {
  phase: Phase;
  loading: boolean;
  clubs: RebuildClub[];
  club: RebuildClub | null;
  preset: RebuildPreset;
  setPreset: (p: RebuildPreset) => void;
  chooseClub: (c: RebuildClub) => void;
  reset: () => void;
  /** The whole run as plain data, null until a window is open. */
  run: RunState | null;
  // the table (Round 461). Seats come without their runs: the board holds no
  // way to reach another seat's window, so a hand over cannot show one.
  seats: SeatView[];
  /** The seat in the chair: picking, about to open, open, or just shut. */
  seat: SeatView | null;
  solo: boolean;
  setSeatKinds: (kinds: SeatKind[]) => void;
  /** The human in the chair opens their window from the hand over screen. */
  takeSeat: () => void;
  /** Shut a finished window: hand the phone on, or start the season after the last one. */
  passOn: () => void;
  scoreboard: SeatScore[];
  sharedSeason: SharedSeasonResult | null;
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

interface LoadedData { key: string; value: TableData }

export function useRebuild(): RebuildState {
  const [loading, setLoading] = useState(true);
  const [clubs, setClubs] = useState<RebuildClub[]>([]);
  const [preset, setPresetState] = useState<RebuildPreset>('none');
  const [session, setSession] = useState<RebuildSession>(() => ({ table: table.createTable(['human']), moves: [[]] }));
  const [data, setData] = useState<LoadedData | null>(null);
  /* Nothing is written until a stored run has had its chance, or the first
     render would overwrite the save with an empty table. */
  const [restored, setRestored] = useState(false);
  const restoreTried = useRef(false);
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

  const tbl = session.table;
  const run = table.activeRun(tbl);
  const seats = useMemo(() => table.seatViewsOf(tbl), [tbl]);
  const seat = seats[tbl.turn] ?? null;
  const solo = tbl.seats.length === 1;
  const phase: Phase = tbl.phase === 'clubs' ? 'pick-club'
    : tbl.phase === 'handover' ? 'handover'
    : tbl.phase === 'season' ? 'season'
    : run ? run.phase : 'pick-club';

  /** A table move (a club pick, a window opening or shutting): the move lists
   *  ride along untouched, because the save reads those from the seats. */
  const setTable = useCallback((fn: (t: TableState) => TableState) => {
    setSession(s => {
      const t = fn(s.table);
      return t === s.table ? s : { table: t, moves: s.moves };
    });
  }, []);

  /** Every action on the open window goes through here: no open window, no
   *  change. A move that changed the run is recorded against the seat that
   *  made it, which is what the save replays. */
  const act = useCallback((move: RebuildMove, fn: (r: RunState) => RunState) => {
    setSession(s => {
      const t = table.updateRun(s.table, fn);
      if (t === s.table) return s;
      const turn = s.table.turn;
      return { table: t, moves: s.moves.map((list, i) => (i === turn ? [...list, move] : list)) };
    });
  }, []);

  const clubsPicked = tbl.seats.some(s => s.club);
  const setPreset = useCallback((p: RebuildPreset) => {
    // The restriction is a promise made before the window opens, never changed mid run.
    setPresetState(prev => (clubsPicked ? prev : p));
  }, [clubsPicked]);

  const setSeatKinds = useCallback((kinds: SeatKind[]) => {
    setSession(s => {
      const t = table.configureSeats(s.table, kinds);
      return t === s.table ? s : { table: t, moves: t.seats.map(() => []) };
    });
  }, []);

  const chooseClub = useCallback((c: RebuildClub) => {
    setTable(t => table.pickClub(t, c, clubs));
  }, [clubs, setTable]);

  /** Every seat's squad and market in one trip: one market pull cut per club
   *  the way the single player fetch cuts it. A fresh pick and a restored
   *  save both come through here, so a replayed run is dealt from the same
   *  lists the first run was. */
  const loadTableData = useCallback(async (names: string[], p: RebuildPreset): Promise<TableData> => {
    const [rows, ...squads] = await Promise.all([fetchMarketRows(), ...names.map(n => fetchClubSquad(n))]);
    return {
      squads: new Map(names.map((n, i) => [n, squads[i]])),
      markets: new Map(names.map(n => [n, marketFromRows(rows, n)])),
      preset: p,
    };
  }, []);

  /* Once every seat has a club, the squads and the pool come down together,
     one fetch each, and each seat's market is cut from the pool the way the
     single player fetch always cut it. Keyed on the clubs, so a re-render
     never refetches and a reset starts clean. */
  const clubKey = tbl.phase === 'clubs' ? '' : tbl.seats.map(s => s.club?.club ?? '').join('|');
  const dataKey = data?.key ?? '';
  useEffect(() => {
    if (!restored || !clubKey || dataKey === clubKey) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const value = await loadTableData(clubKey.split('|'), preset);
      if (cancelled) return;
      setData({ key: clubKey, value });
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [restored, clubKey, dataKey, preset, loadTableData]);

  /* A stored run, replayed. It waits for the club list (a seat's club, its
     rivals and the season's neutral clubs all come from there), fetches the
     same squads and markets a fresh pick would, and hands the whole thing to
     src/lib/rebuildSave.ts, which returns null on anything it cannot replay
     exactly. Null means a fresh run and a cleared key, never a half restored
     board. */
  useEffect(() => {
    if (restoreTried.current || clubs.length === 0) return;
    restoreTried.current = true;
    const saved = readRebuildSave();
    if (!saved) { setRestored(true); return; }
    let cancelled = false;
    setLoading(true);
    (async () => {
      const names = savedClubNames(saved);
      const wanted = names.filter(Boolean);
      try {
        const value = wanted.length > 0
          ? await loadTableData(wanted, saved.preset)
          : { squads: new Map(), markets: new Map(), preset: saved.preset };
        if (cancelled) return;
        const back = restoreTable(saved, clubs, value);
        if (!back) {
          clearRebuildSave();
        } else {
          /* A finish read back from storage is not a new finish (Round 399). */
          if (isFinishedTable(back.table)) markRestoredFinish('rebuild');
          setPresetState(saved.preset);
          if (saved.phase !== 'clubs') setData({ key: names.join('|'), value });
          setSession(back);
        }
      } catch {
        if (!cancelled) clearRebuildSave();
      } finally {
        if (!cancelled) { setRestored(true); setLoading(false); }
      }
    })();
    return () => { cancelled = true; };
  }, [clubs, loadTableData]);

  /* Written after every move that changed something, not at the end: an
     interruption costs a spin and not a session. */
  useEffect(() => {
    if (!restored) return;
    const save = toSave(session, preset);
    if (save) writeRebuildSave(save); else clearRebuildSave();
  }, [restored, session, preset]);

  /* A one seat table opens the moment its squad is in; so does a CPU seat,
     which plays its whole window in that same call. A human seat waits for
     the tap on the hand over screen (takeSeat). */
  const dataReady = data && data.key === clubKey ? data.value : null;
  useEffect(() => {
    if (!dataReady || tbl.phase !== 'handover') return;
    const next = tbl.seats[tbl.turn];
    if (!next || next.run) return;
    if (tbl.seats.length === 1 || next.kind === 'cpu') setTable(t => table.openWindow(t, dataReady, clubs));
  }, [dataReady, tbl, clubs]);

  const takeSeat = useCallback(() => {
    if (!dataReady) return;
    setTable(t => table.openWindow(t, dataReady, clubs));
  }, [dataReady, clubs, setTable]);

  const passOn = useCallback(() => {
    setSpinning(false);
    setThinking(false);
    if (warTimer.current) window.clearTimeout(warTimer.current);
    if (spinTimer.current) window.clearTimeout(spinTimer.current);
    setTable(t => table.closeWindow(t, clubs));
  }, [clubs, setTable]);

  const pickFinance = useCallback((i: number) => act({ k: 'finance', i }, r => loop.pickFinance(r, i)), [act]);
  const toManager = useCallback(() => act({ k: 'toManager' }, loop.toManager), [act]);
  const hireManager = useCallback((m: ManagerOption) => act({ k: 'manager', id: m.id }, r => loop.hireManager(r, m.id)), [act]);
  const setFormation = useCallback((name: string) => {
    if (spinning) return;
    act({ k: 'formation', name }, r => loop.setFormation(r, name));
  }, [act, spinning]);

  const spin = useCallback(() => {
    if (!run || run.phase !== 'spin' || spinning || run.spun !== null || run.deal || run.war) return;
    if (run.settledCount >= run.order.length) return;
    setSpinning(true);
    spinTimer.current = window.setTimeout(() => {
      setSpinning(false);
      act({ k: 'spin' }, loop.spinNext);
    }, 1200);
  }, [run, spinning, act]);

  const keepSpun = useCallback(() => { if (!spinning) act({ k: 'keep' }, loop.keep); }, [act, spinning]);
  const sellSpun = useCallback(() => { if (!spinning) act({ k: 'sell' }, loop.sell); }, [act, spinning]);
  const takeReplacement = useCallback((p: Player) => act({ k: 'offer', name: p.name }, r => loop.takeOffer(r, p.name)), [act]);
  const promoteBench = useCallback((p: Player) => act({ k: 'promote', name: p.name }, r => loop.promote(r, p.name)), [act]);
  const takeForty = useCallback(() => act({ k: 'forty' }, loop.takeForty), [act]);
  const redealSpun = useCallback(() => act({ k: 'redeal' }, loop.redeal), [act]);

  const raiseWar = useCallback(() => {
    if (!run?.war || run.war.outcome !== 'live' || run.war.leader !== 'rival' || thinking) return;
    act({ k: 'raise' }, loop.raise);
    setThinking(true);
    warTimer.current = window.setTimeout(() => {
      setThinking(false);
      act({ k: 'reply' }, loop.rivalReply);
    }, 700 + Math.floor(Math.random() * 500));
  }, [run, thinking, act]);

  const walkAway = useCallback(() => {
    if (thinking) return;
    act({ k: 'walk' }, loop.walk);
  }, [act, thinking]);

  /* A war restored mid thought still gets its answer. The rival's reply used
     to live only in raiseWar's own timer, so a run saved between your bid and
     his answer came back with the ball in his court and no way to give it
     back: raising again is refused while you lead and so is walking. This
     fires only when nothing is thinking, which raiseWar sets in the same
     commit as the bid, so a live run never reaches it twice. */
  const warPending = run?.war?.outcome === 'live' && run.war.leader === 'you';
  useEffect(() => {
    if (!warPending || thinking) return undefined;
    const t = window.setTimeout(() => act({ k: 'reply' }, loop.rivalReply), 700);
    return () => window.clearTimeout(t);
  }, [warPending, thinking, act]);

  /* A settled war (won or lost) stays on screen for a moment, then clears
     itself so the loop can move on. */
  const warOutcome = run?.war?.outcome ?? null;
  useEffect(() => {
    if (!warOutcome || warOutcome === 'live') return;
    const t = window.setTimeout(() => act({ k: 'clearWar' }, loop.clearWar), 1500);
    return () => window.clearTimeout(t);
  }, [warOutcome, act]);

  const finish = useCallback(() => act({ k: 'whistle' }, loop.blowWhistle), [act]);

  /* Rivals post their windows after yours closes, then the season kicks off.
     Runs once per reckoning, off the post reckoning XI, manager lift included.
     One seat tables only: at a fuller table the other seats are the rivals
     and the shared season runs when the last window shuts. */
  useEffect(() => {
    if (!solo || !run || run.phase !== 'done' || !run.reckoning || seasonFor.current === run) return;
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
  }, [solo, run, clubs]);

  const reset = useCallback(() => {
    setSession(s => {
      const t = table.createTable(table.seatKindsOf(s.table), s.table.salt);
      return { table: t, moves: t.seats.map(() => []) };
    });
    clearRebuildSave();
    setData(null);
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

  /* Shut windows as numbers: the hand over screen shows these and nothing
     else, so the next player never sees the last player's board. */
  const scoreboard = useMemo<SeatScore[]>(() => tbl.seats
    .filter(s => s.run?.phase === 'done' && s.club)
    .map(s => ({
      index: s.index, name: s.name, emoji: s.emoji, club: s.club!.club,
      before: s.run!.startRating, after: loop.ratingOf(s.run!), target: s.run!.target,
    })), [tbl.seats]);

  /* The finish the site records: the run at a one seat table, the first
     human's run at a fuller one, and only once the season has been played. */
  const firstHumanRun = tbl.seats.find(s => s.kind === 'human')?.run ?? null;
  const scored = solo ? run : firstHumanRun;
  const scoredRating = scored ? loop.ratingOf(scored) : 0;
  /* Round 477: one definition of finished, in src/lib/rebuildSave.ts, because
     the restore has to ask the same question this line does. Two copies of it
     drift, and a restore that marked a finish this line did not call complete
     would leave a mark sitting for the next real finish to swallow. */
  const complete = isFinishedTable(tbl);
  useGameCompletion('rebuild', complete, Math.max(0, scoredRating * 10), scored && scoredRating >= scored.target ? 1 : 0);

  const shareText = useMemo(() => {
    if (!solo) {
      const shared = tbl.season;
      if (!shared) return '';
      const lines = tbl.seats
        .filter(s => s.run && s.club)
        .map(s => {
          const pos = shared.positions[tbl.seats.filter(x => x.run && x.club).findIndex(x => x.index === s.index)] ?? 0;
          const after = loop.ratingOf(s.run!);
          const delta = after - s.run!.startRating;
          return `${pos}. ${s.emoji} ${s.name} · ${s.club!.club} ${after} (${delta >= 0 ? '+' : ''}${delta})`;
        });
      const cups = shared.trophies.map(t => `${t.emoji} ${t.title}: ${t.winner}`);
      return `Rebuild, ${tbl.seats.length} at the table\n${lines.join('\n')}\n${cups.join('\n')}\ndouknowball.com/rebuild`;
    }
    if (!run || run.phase !== 'done') return '';
    const rivalLine = rivals && rivals.length === 2
      ? `\nvs ${rivals[0].name} ${rivals[0].finalRating} · ${rivals[1].name} ${rivals[1].finalRating}`
      : '';
    const seasonLine = season ? `\nSeason: #${season.position} of ${season.table.length}` : '';
    return `Rebuild: ${run.club.club}\n${startRating} → ${currentRating} (target ${target})\nManager: ${run.manager?.name ?? KEEP_MANAGER.name}\n${grade}${rivalLine}${seasonLine}\nSold ${run.sold.length} · Signed ${run.signed.length} · €${finalFunds}M left\ndouknowball.com/rebuild`;
  }, [solo, tbl, run, startRating, currentRating, target, grade, finalFunds, rivals, season]);

  return {
    phase, loading, clubs, club: seat?.club ?? null, preset, setPreset, chooseClub, reset,
    run,
    seats, seat, solo, setSeatKinds, takeSeat, passOn, scoreboard, sharedSeason: tbl.season,
    startingXi, startRating, currentRating, target, budget, spendCeiling, finalFunds, objectives, grade, shareText,
    managerReading, offerPrice, canRedeal,
    pickFinance, toManager, hireManager, keepManager: KEEP_MANAGER, setFormation,
    spinning, spin, keepSpun, sellSpun, takeReplacement, promoteBench, takeForty, redealSpun,
    thinking, raiseWar, walkAway,
    finish, rivals, rivalsLoading, season,
  };
}
