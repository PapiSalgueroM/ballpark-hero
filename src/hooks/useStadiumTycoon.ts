/**
 * Round 146: the live half of Stadium Tycoon. The lib owns the math; this
 * owns time, storage and the event stream the animations feed on. The loop
 * runs on requestAnimationFrame but ticks the sim at ~5 Hz, which is plenty
 * for an idle game and keeps phones cool. Saves every 5 seconds and on tab
 * hide, so the away-earnings clock is honest.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { recordCompletion } from '@/lib/completions';
import { backupKeysOf, copyAside, routeSaveEntry } from '@/lib/brokenSaveRecovery';
import { useOwnedTimeouts } from '@/hooks/useOwnedTimeouts';
import { recordFullTimes } from '@/lib/tycoonRewards';
import type { FullTime } from '@/lib/tycoonRewards';
import {
  TycoonState, TickEvent, newTycoon, tick, buy, upgradePurchase, tap, prestige,
  offlineEarnings, serializeTycoon, deserializeTycoon, TYCOON_SAVE_KEY,
  activateBoost, hire, payrollPurchase, catchGolden, rollGoldenKind, goldenActive, ACH_BONUS,
  GOLDEN_INFO, fmtMoney, buyPerk, perkById, setClubName, GOLDEN_CATCH_SEC, GOLDEN_MEAN_GAP_SEC, HYPE_MULT,
  awaySecondsOf, playAwayMatchdays, AWAY_MATCHDAY_SEC, leaguePosition, leagueShape,
  setPieceOffer, beginSetPiece, awardSetPieceGoal,
  setTicketPolicy, setMatchPlan, matchPlanForecast, signStadiumSponsor, bookMatchScouting, bookStandsConstruction,
  bookGraduateAttack, reserveSeasonTickets, updateExpansionTarget,
} from '@/lib/stadiumTycoon';
import type { GoldenKind, AwayMatch, SetPieceOffer, TicketPolicy, MatchPlanKind, StadiumSponsor, SeasonTicketAllocation, ExpansionTargetAction } from '@/lib/stadiumTycoon';
import type { GraduateAttackOption } from '@/lib/wonderkidFactory';

/** Round 162: a golden whistle drifting across the pitch, waiting to be
 *  caught. Purely presentational until the tap: the engine only hears about
 *  it if the player actually catches it. */
export interface PendingGolden {
  id: number;
  kind: GoldenKind;
  x: number;
  y: number;
  /** performance.now() when it drifts away uncaught. */
  expiresAt: number;
}

export interface Floater {
  id: number;
  text: string;
  kind: 'money' | 'goal' | 'win' | 'bad' | 'tap';
  /** Percent coordinates inside the pitch panel. */
  x: number;
  y: number;
}

let floaterSeq = 1;
/** How long a floater is on the pitch: the page's 1.8 s rise plus a frame. */
const FLOATER_LIFE_MS = 1900;
/** Round 1543: the one spot a milestone or badge floater takes (the
 *  milestone's old height). It clears the FULL TIME line at 12 and ends above
 *  the badge line even when that wraps to two lines on a phone, which a second
 *  row lower down did not (the fix walk measured it 73 percent covered). */
const ANNOUNCE_Y = 30;

/** Round 530: the two loudest events, held for the page's cards. The label
 *  and the bonus are the engine's own event fields, printed as they came. */
export interface Promotion { label: string; amount: number; seq: number }
export interface BadgeEarned { label: string; seq: number }
/** Round 583: one goal the pitch replays, straight off the engine's event: which
 *  end it went in and the minute the engine committed it. Never a second roll. */
export interface Replay { id: number; side: 'for' | 'against'; minute: number }
/** Round 584: what the away card says about a trip. The results as they were
 *  played, the milestone money they earned, and the table as it stood when you
 *  came back (a snapshot, so a card left open never describes a later table). */
export interface AwayTrip {
  results: AwayMatch[];
  milestonePay: number;
  /** Round 585: the gems the away wins earned. */
  gems: number;
  standing: { position: number; clubs: number; left: number } | null;
}

interface HeldGraduateWrite {
  next: TycoonState;
  at: number;
  publish: () => void;
}

export function useStadiumTycoon(getEdge?: () => number, getAttackOptions?: () => GraduateAttackOption[]) {
  const getEdgeRef = useRef(getEdge);
  getEdgeRef.current = getEdge;
  const getAttackOptionsRef = useRef(getAttackOptions);
  getAttackOptionsRef.current = getAttackOptions;
  const resolveGraduate = useCallback((id: string) => getAttackOptionsRef.current?.().find(option => option.playerId === id), []);
  const savedBytes = useRef<string | null>(null);
  const preLeagueBytes = useRef<string | null>(null);
  const [state, setState] = useState<TycoonState>(() => {
    const now = Date.now();
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(TYCOON_SAVE_KEY) : null;
    savedBytes.current = raw;
    const loaded = deserializeTycoon(raw, now);
    // This structural transition kept v1. Read the original shape before the
    // loader's seeded league is written back the first time.
    if (loaded && raw !== null && JSON.parse(raw).league === undefined) preLeagueBytes.current = raw;
    return loaded ?? newTycoon(now);
  });
  const [saveMoved, setSaveMoved] = useState(false);
  const saveMovedRef = useRef(false);
  const markSaveMoved = useCallback(() => {
    saveMovedRef.current = true;
    setSaveMoved(true);
  }, []);
  // Pause on a newer write from another tab before advancing the economy.
  const checkSaveMoved = useCallback(() => {
    if (saveMovedRef.current) return true;
    try {
      if (localStorage.getItem(TYCOON_SAVE_KEY) === savedBytes.current) return false;
    } catch {
      return false; // Let the existing storage failure path handle unavailable storage.
    }
    markSaveMoved();
    return true;
  }, [markSaveMoved]);
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const [awayPay, setAwayPay] = useState<number | null>(null);
  /* Round 584: the matchdays played while you were away, for the away card. */
  const [awayTrip, setAwayTrip] = useState<AwayTrip | null>(null);
  const [confetti, setConfetti] = useState(0);
  const [golden, setGolden] = useState<PendingGolden | null>(null);
  const [activeSetPiece, setActiveSetPiece] = useState<SetPieceOffer | null>(null);
  const [setPieceError, setSetPieceError] = useState<string | null>(null);
  const [gearSaveBlocked, setGearSaveBlocked] = useState(false);
  const [ticketSaveFailed, setTicketSaveFailed] = useState(false);
  const heldGraduateWrite = useRef<HeldGraduateWrite | null>(null);
  const stadiumActionsBlocked = useCallback(() => Boolean(heldGraduateWrite.current) || checkSaveMoved(), [checkSaveMoved]);
  const [graduateAttackError, setGraduateAttackError] = useState<{ ground: number; match: number; message: string } | null>(null);
  const [sponsorSaveError, setSponsorSaveError] = useState<{ ground: number; season: number } | null>(null);
  const [seasonTicketSaveError, setSeasonTicketSaveError] = useState<{ ground: number; season: number } | null>(null);
  const [matchPlanError, setMatchPlanError] = useState<number | null>(null);
  const [scoutingSaveError, setScoutingSaveError] = useState<{ ground: number; match: number } | null>(null);
  const [standsConstructionSaveError, setStandsConstructionSaveError] = useState<number | null>(null);
  const [expansionTargetSaveFailed, setExpansionTargetSaveFailed] = useState(false);
  const [promotion, setPromotion] = useState<Promotion | null>(null);
  /* Round 1543: badges earned together each get their own turn on the badge
     line. It used to hold one, so the last of a tick's badges wiped the rest. */
  const [badgeQueue, setBadgeQueue] = useState<BadgeEarned[]>([]);
  const badge = badgeQueue[0] ?? null;
  /* Round 583: goals waiting for the pitch. Queued only while the pitch is on
     screen: a goal scored while you are in another room is on the scoreboard
     when you come back, and is never replayed late. */
  const [replays, setReplays] = useState<Replay[]>([]);
  const replaysOnRef = useRef(true);
  /* Round 581: every accepted change updates the ref before telling React.
     It used to be assigned during render, so between an action and
     the render that followed it the ref still held the state from before the
     action: a pagehide in that gap (the Round 567 shape) saved the old state
     over the new one, and a tick and a tap landing in the same frame each read
     the old ref and the second erased the first. */
  const stateRef = useRef(state);
  const commit = useCallback((next: TycoonState) => {
    stateRef.current = next;
    setState(next);
  }, []);
  const writeStadium = useCallback((next: TycoonState, now = Date.now()): 'written' | 'moved' | 'failed' => {
    if (checkSaveMoved()) return 'moved';
    const legacy = preLeagueBytes.current;
    const refuse = () => {
      if (legacy !== null) setTicketSaveFailed(true);
      return 'failed' as const;
    };
    try {
      const bytes = serializeTycoon(next, now);
      if (legacy !== null) {
        const entry = routeSaveEntry('/stadium-tycoon');
        if (!entry) return refuse();
        let backupKey = backupKeysOf(entry, localStorage).find(key => localStorage.getItem(key) === legacy);
        if (!backupKey) {
          const copy = copyAside(entry, localStorage, new Date(now), false, { raw: legacy, slot: 1 });
          if (copy.ok && copy.backupKey) backupKey = copy.backupKey;
        }
        const kept = backupKey !== undefined && localStorage.getItem(backupKey) === legacy;
        if (localStorage.getItem(TYCOON_SAVE_KEY) !== legacy) {
          markSaveMoved();
          return 'moved';
        }
        if (!kept) return refuse();
      }
      localStorage.setItem(TYCOON_SAVE_KEY, bytes);
      if (legacy !== null) {
        if (localStorage.getItem(TYCOON_SAVE_KEY) !== bytes) return refuse();
        preLeagueBytes.current = null;
        setTicketSaveFailed(false);
      }
      savedBytes.current = bytes;
      return 'written';
    } catch {
      return refuse();
    }
  }, [checkSaveMoved, markSaveMoved]);
  const saveTicketState = useCallback((next: TycoonState, now?: number) => {
    const result = writeStadium(next, now);
    if (result !== 'moved') setTicketSaveFailed(result === 'failed');
    return result;
  }, [writeStadium]);
  const saveGraduateWrite = useCallback((pending: HeldGraduateWrite) => {
    const result = saveTicketState(pending.next, pending.at);
    if (result === 'failed') heldGraduateWrite.current = pending;
    if (result === 'written') {
      heldGraduateWrite.current = null;
      pending.publish();
    }
    return result;
  }, [saveTicketState]);
  const goldenRef = useRef(golden);
  goldenRef.current = golden;

  /* Round 657: the floater's clean up timer is owned by the page and dies
     with it (see useOwnedTimeouts). */
  const later = useOwnedTimeouts();

  /* Round 1543: `replaces` takes a floater off in the same update that puts
     this one up, so the two are never on screen together. */
  const pushFloater = useCallback((text: string, kind: Floater['kind'], x?: number, y?: number, replaces?: number) => {
    const f: Floater = {
      id: floaterSeq++,
      text,
      kind,
      x: x ?? 20 + Math.random() * 60,
      y: y ?? 30 + Math.random() * 40,
    };
    setFloaters(cur => [...(replaces === undefined ? cur : cur.filter(g => g.id !== replaces)).slice(-14), f]);
    // Floaters clean themselves up after the animation finishes.
    later(() => setFloaters(cur => cur.filter(g => g.id !== f.id)), FLOATER_LIFE_MS);
    return f.id;
  }, [later]);

  /* Round 439: away earnings settle from the wall clock the ground has not
     already been paid for, so a fresh load and a tab that was only
     backgrounded go through the exact same rule and the exact same cap.
     paidUntilRef is wall-clock ms, seeded from the save and pushed forward
     by the loop by exactly the seconds it ticks, so live play can never be
     billed as time away and a throttled frame cannot quietly lose an hour.

     What this fixes: the settle used to run once, on mount. rAF stops dead
     in a hidden tab, so a player who left the tab open in another window
     came back to a single frame with dt clamped to two seconds, and the old
     visibilitychange handler then saved with savedAt = now, so a later
     reload could not pay for those hours either. Hours away, two seconds
     paid, and the difference gone for good. */
  const paidUntilRef = useRef(state.savedAt);
  const settleAway = useCallback(() => {
    if (stadiumActionsBlocked()) return;
    const now = Date.now();
    const cur = stateRef.current;
    const trip = { ...cur, savedAt: paidUntilRef.current };
    const pay = offlineEarnings(trip, now);
    /* Round 584: a matchday for every half hour of the same trip the pay counts.
       Played after the pay is worked out, so the results cannot move it. */
    const matchdays = Math.floor(awaySecondsOf(trip, now) / AWAY_MATCHDAY_SEC);
    /* Review: a club with no income (a doctored fanbase of 0) still plays its
       matchdays, so the pay alone cannot gate the settle. */
    if (!(pay > 0) && matchdays === 0) { paidUntilRef.current = now; return; }
    const paid = { ...cur, money: cur.money + Math.max(0, pay), lifetime: cur.lifetime + Math.max(0, pay), savedAt: now };
    const away = matchdays > 0 ? playAwayMatchdays(paid, matchdays, Math.random, getEdgeRef.current?.() ?? 0, resolveGraduate) : null;
    const next = away ? away.state : paid;
    const publish = () => {
      paidUntilRef.current = now;
      setAwayPay(Math.max(0, pay));
      const lg = away?.state.league;
      /* Round 585: an away win earns its gem, credited once per match. */
      const awayGems = away
        ? recordFullTimes(away.results.map((m, i) => ({
          totalMatches: (paid.totalMatches ?? 0) + i + 1,
          result: m.result === 'W' ? 'win' : m.result === 'D' ? 'draw' : 'loss',
          away: true,
        })))
        : 0;
      setAwayTrip(away && away.results.length > 0 ? {
        results: away.results,
        gems: awayGems,
        milestonePay: away.events.reduce((sum, e) => sum + (e.kind === 'milestone' ? e.amount ?? 0 : 0), 0),
        standing: lg && away.results.some(r => !r.friendly)
          ? { position: leaguePosition(lg), clubs: lg.clubs.length, left: leagueShape(lg.division).matchdays - lg.matchday }
          : null,
      } : null);
      commit(next);
    };
    // Bank the captured trip before its result and rewards become visible.
    if (cur.graduateAttack && next.matchNo > cur.graduateAttack.match) {
      saveGraduateWrite({ next, at: now, publish });
    } else if (writeStadium(next, now) !== 'moved') {
      publish();
    }
  }, [stadiumActionsBlocked, writeStadium, saveGraduateWrite, resolveGraduate, commit]);

  const retryTicketSave = useCallback(() => {
    const pending = heldGraduateWrite.current;
    return pending ? saveGraduateWrite(pending) : saveTicketState(stateRef.current);
  }, [saveGraduateWrite, saveTicketState]);

  // The settlement for the time before this mount, before the loop starts.
  useEffect(() => {
    settleAway();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The loop.
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let sinceSave = 0;
    /* Round 1543: milestones and badges take turns on one spot. Each waits in
       this queue until the one before it has had its full floater life, and
       the frame that shows it takes the old one off in the same update, so no
       frame ever draws two (reduced motion included, where the floater does
       not fade and the sitewide rule zeroes any CSS delay). The frame loop
       releases them, not a timer, so the queue runs on the loop's own clock.
       Before this an old save that crossed three lowered rungs in its first
       tick drew them all on one spot for 1.9 s, unreadable. */
    const waiting: { text: string; x: number }[] = [];
    let onSpot = { id: -1, until: 0 };
    const release = () => {
      const now = performance.now();
      if (!waiting.length || now < onSpot.until) return;
      const next = waiting.shift();
      if (!next) return;
      onSpot = { id: pushFloater(next.text, 'win', next.x, ANNOUNCE_Y, onSpot.id), until: now + FLOATER_LIFE_MS };
    };
    const announce = (text: string, x: number) => {
      waiting.push({ text, x });
      release();
    };
    const step = (t: number) => {
      if (saveMovedRef.current) return;
      release();
      const dt = Math.min(2, (t - last) / 1000);
      last = t;
      if (heldGraduateWrite.current) {
        raf = requestAnimationFrame(step);
        return;
      }
      acc += dt;
      sinceSave += dt;
      if (acc >= 0.2) {
        if (checkSaveMoved()) return;
        const use = acc;
        acc = 0;
        // Round 439: the loop has now paid for these seconds, so the away
        // settle must not bill for them again.
        const before = stateRef.current;
        const playedDivision = before.league?.division;
        const { state: next, events } = tick(before, use, Math.random, getEdgeRef.current?.() ?? 0, resolveGraduate);
        const graduate = before.graduateAttack;
        const graduateBoundary = graduate && (next.matchNo > graduate.match || (graduate.played === undefined && next.graduateAttack?.played !== undefined));
        const publish = () => {
          if (graduateBoundary) sinceSave = 0;
          paidUntilRef.current += use * 1000;
          stateRef.current = next;
          for (const e of events) reactToEvent(e);
          /* Round 585: a watched full time earns its gems, once, keyed on the
             career match count. A tick settles at most one full time. */
          const ft = events.find(e => e.kind === 'win' || e.kind === 'draw' || e.kind === 'loss');
          if (ft) {
            const season = events.find(e => (e.kind === 'title' || e.kind === 'seasonEnd') && e.position !== undefined);
            let allowGear = true;
            const openedStands = before.standsOpenAfterMatch !== undefined && next.standsOpenAfterMatch === undefined;
            if (season || openedStands) {
              // Save completed construction at full time, and the final table before a title can award gear.
              const saved = graduateBoundary ? 'written' : saveTicketState(next);
              if (saved === 'moved') return false;
              if (season?.kind === 'title') {
                allowGear = saved === 'written';
                setGearSaveBlocked(!allowGear);
              }
            }
            if (checkSaveMoved()) return false;
            const gems = recordFullTimes([{
              totalMatches: next.totalMatches ?? 0, result: ft.kind as FullTime['result'], away: false,
              position: season?.position, division: season?.kind === 'title' ? playedDivision : undefined,
            }], allowGear, () => setGearSaveBlocked(true));
            /* Round 1531: below the full time line, not beside it. At (62, 10) a
               phone's FULL TIME WIN or DRAW covered the "+N gems" under it. */
            if (gems > 0) pushFloater(`+${gems} gems`, 'money', 62, 56);
          }
          setState(next);
          /* Round 162: the golden whistle. One drifts in every couple of
             minutes of real play (mean ~150s), only while nothing golden is
             already lit, and it drifts away after 12 seconds uncaught. */
          const g = goldenRef.current;
          if (g && t > g.expiresAt) setGolden(null);
          else if (!g && !goldenActive(next) && Math.random() < use / GOLDEN_MEAN_GAP_SEC) {
            setGolden({
              id: Date.now(),
              kind: rollGoldenKind(Math.random),
              x: 12 + Math.random() * 70,
              y: 24 + Math.random() * 45,
              expiresAt: t + GOLDEN_CATCH_SEC * 1000,
            });
          }
          if (sinceSave >= 5) {
            sinceSave = 0;
            if (saveTicketState(next) === 'moved') return false;
          }
          return true;
        };
        if (graduateBoundary) {
          if (saveGraduateWrite({ next, at: Date.now(), publish }) === 'moved') return;
        } else if (!publish()) {
          return;
        }
      }
      raf = requestAnimationFrame(step);
    };
    const reactToEvent = (e: TickEvent) => {
      if ((e.kind === 'goal' || e.kind === 'conceded') && e.minute !== undefined && replaysOnRef.current) {
        const replay: Replay = { id: floaterSeq++, side: e.kind === 'goal' ? 'for' : 'against', minute: e.minute };
        setReplays(q => [...q, replay]);
      }
      if (e.kind === 'goal') {
        pushFloater(`GOAL ${e.minute}' +${fmtMoney(e.amount ?? 0)}`, 'goal', 30 + Math.random() * 40, 20 + Math.random() * 25);
        setConfetti(c => c + 1);
      } else if (e.kind === 'win') {
        pushFloater(`FULL TIME WIN +${fmtMoney(e.amount ?? 0)}`, 'win', 32, 12);
        setConfetti(c => c + 1);
      } else if (e.kind === 'milestone') {
        announce(`🏁 ${e.label} +${fmtMoney(e.amount ?? 0)}`, 18);
        setConfetti(c => c + 1);
      } else if (e.kind === 'promoted') {
        // Round 162: the loudest moment the game has. Round 530: it also
        // gets a card on the pitch, held until Continue or four seconds.
        pushFloater(`${e.label} +${fmtMoney(e.amount ?? 0)}`, 'win', 16, 20);
        setConfetti(c => c + 2);
        setPromotion({ label: e.label, amount: e.amount, seq: floaterSeq++ });
      } else if (e.kind === 'title') {
        /* Round 582: a league title. At The Summit it pays and nobody goes up,
           so it takes the promotion card itself; below that the 'promoted'
           event right behind it takes the card and this is the headline. */
        pushFloater(e.label ?? 'CHAMPIONS', 'win', 20, 16);
        setConfetti(c => c + 2);
        if (e.amount !== undefined) setPromotion({ label: e.label ?? 'CHAMPIONS', amount: e.amount, seq: floaterSeq++ });
      } else if (e.kind === 'seasonEnd') {
        pushFloater(e.label ?? 'Season over', 'bad', 24, 22);
      } else if (e.kind === 'ach') {
        /* Round 530 review: the lib's own bonus, so a retune cannot leave
           the floater announcing a number the game no longer pays. */
        announce(`${e.label}: +${Math.round(ACH_BONUS * 100)}% forever`, 22);
        setConfetti(c => c + 1);
        const earned: BadgeEarned = { label: e.label, seq: floaterSeq++ };
        setBadgeQueue(q => [...q, earned]);
      } else if (e.kind === 'conceded') {
        pushFloater(`${e.minute}' they score`, 'bad', 25 + Math.random() * 50, 55 + Math.random() * 25);
      } else if (e.kind === 'loss') {
        pushFloater('full time. beaten', 'bad', 34, 14);
      } else if (e.kind === 'draw') {
        pushFloater('FULL TIME DRAW', 'tap', 34, 14);
      }
    };
    raf = requestAnimationFrame(step);
    const saveNow = () => {
      if (!heldGraduateWrite.current) saveTicketState(stateRef.current);
    };
    /* Round 439: hiding banks the save, coming back settles the hours. The
       frame clock restarts on the way back in so the return frame pays for
       the frame and the settle pays for the time away, never both. */
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') { saveNow(); return; }
      settleAway();
      last = performance.now();
      acc = 0;
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === TYCOON_SAVE_KEY || event.key === null) checkSaveMoved();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', saveNow);
    window.addEventListener('pageshow', checkSaveMoved);
    window.addEventListener('storage', onStorage);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', saveNow);
      window.removeEventListener('pageshow', checkSaveMoved);
      window.removeEventListener('storage', onStorage);
      saveNow();
    };
  }, [pushFloater, settleAway, saveTicketState, checkSaveMoved, resolveGraduate, saveGraduateWrite]);

  /* Round 195: the idle game counts as playing TODAY. One unscored mark
     per session, on the first meaningful action (a tap, a purchase, a
     hire or, since Round 196, a legacy buy), the S-1 rule the header
     games have followed since Round 157.
     A ref, not state: marking must never re-render the game loop. */
  const sessionMarkedRef = useRef(false);
  const markSessionPlay = useCallback(() => {
    if (sessionMarkedRef.current) return;
    sessionMarkedRef.current = true;
    recordCompletion('/stadium-tycoon');
  }, []);

  const doSetTicketPolicy = useCallback((policy: TicketPolicy) => {
    if (stadiumActionsBlocked()) return;
    const before = stateRef.current;
    const next = setTicketPolicy(before, policy);
    if (saveTicketState(next) === 'moved') return;
    if (next !== before) markSessionPlay();
    commit(next);
  }, [commit, saveTicketState, markSessionPlay, stadiumActionsBlocked]);

  const doSignSponsor = useCallback((ground: number, season: number, kind: StadiumSponsor) => {
    if (document.hidden || stadiumActionsBlocked()) return;
    const before = stateRef.current;
    const next = signStadiumSponsor(before, ground, season, kind);
    if (next === before) return;
    const saved = writeStadium(next);
    if (saved !== 'written') {
      if (saved === 'failed') setSponsorSaveError({ ground, season });
      return;
    }
    setSponsorSaveError(null);
    commit(next);
    markSessionPlay();
  }, [commit, markSessionPlay, writeStadium, stadiumActionsBlocked]);

  const doReserveSeasonTickets = useCallback((ground: number, season: number, quote: SeasonTicketAllocation) => {
    if (document.hidden || stadiumActionsBlocked()) return;
    const before = stateRef.current;
    const next = reserveSeasonTickets(before, ground, season, quote);
    if (next === before) return;
    const saved = writeStadium(next);
    if (saved !== 'written') {
      if (saved === 'failed') setSeasonTicketSaveError({ ground, season });
      return;
    }
    setSeasonTicketSaveError(null);
    commit(next);
    markSessionPlay();
  }, [commit, markSessionPlay, writeStadium, stadiumActionsBlocked]);

  const doSetMatchPlan = useCallback((match: number, kind: MatchPlanKind) => {
    if (document.hidden || stadiumActionsBlocked()) return;
    const before = stateRef.current;
    const next = setMatchPlan(before, match, kind);
    if (next === before) return;
    const saved = writeStadium(next);
    if (saved !== 'written') {
      if (saved === 'failed') setMatchPlanError(match);
      return;
    }
    setMatchPlanError(null);
    commit(next);
    markSessionPlay();
  }, [commit, markSessionPlay, writeStadium, stadiumActionsBlocked]);

  const doBookScouting = useCallback((ground: number, match: number, fee: number) => {
    if (document.hidden || stadiumActionsBlocked()) return;
    const before = stateRef.current;
    const next = bookMatchScouting(before, ground, match, fee);
    if (next === before) return;
    const saved = writeStadium(next);
    if (saved !== 'written') {
      if (saved === 'failed') setScoutingSaveError({ ground, match });
      return;
    }
    setScoutingSaveError(null);
    commit(next);
    markSessionPlay();
  }, [commit, markSessionPlay, writeStadium, stadiumActionsBlocked]);

  const doBookGraduateAttack = useCallback((ground: number, match: number, playerId: string) => {
    if (document.hidden || stadiumActionsBlocked()) return;
    const option = resolveGraduate(playerId);
    if (!option) {
      setGraduateAttackError({ ground, match, message: 'That forward is no longer available. Reload to see the latest first team.' });
      return;
    }
    const before = stateRef.current;
    const next = bookGraduateAttack(before, ground, match, option);
    if (next === before) return;
    const saved = writeStadium(next);
    if (saved === 'written') {
      setGraduateAttackError(null);
      commit(next);
      markSessionPlay();
    } else if (saved === 'failed') {
      setGraduateAttackError({ ground, match, message: 'Could not save the attacking assignment. Try again.' });
    }
  }, [commit, markSessionPlay, resolveGraduate, writeStadium, stadiumActionsBlocked]);

  const doBookStandsConstruction = useCallback((ground: number, opensAfterMatch: number, cost: number) => {
    if (document.hidden || stadiumActionsBlocked()) return;
    const before = stateRef.current;
    const next = bookStandsConstruction(before, ground, opensAfterMatch, cost);
    if (next === before) return;
    const saved = writeStadium(next);
    if (saved !== 'written') {
      if (saved === 'failed') setStandsConstructionSaveError(ground);
      return;
    }
    setStandsConstructionSaveError(null);
    commit(next);
    markSessionPlay();
  }, [commit, markSessionPlay, writeStadium, stadiumActionsBlocked]);

  const doExpansionTarget = useCallback((action: ExpansionTargetAction) => {
    if (document.hidden || stadiumActionsBlocked()) return;
    const before = stateRef.current;
    const next = updateExpansionTarget(before, action);
    if (next === before) return;
    const saved = writeStadium(next);
    if (saved === 'failed') setExpansionTargetSaveFailed(true);
    if (saved !== 'written') return;
    setExpansionTargetSaveFailed(false);
    commit(next);
  }, [commit, writeStadium, stadiumActionsBlocked]);

  const doBuy = useCallback((id: string, amount: 1 | 5 = 1) => {
    if (stadiumActionsBlocked()) return;
    markSessionPlay();
    commit(amount === 1 ? buy(stateRef.current, id) : upgradePurchase(stateRef.current, id, amount).state);
  }, [commit, stadiumActionsBlocked]);

  /* Round 162: the payroll. */
  const doHire = useCallback((id: string, amount: 1 | 5 = 1) => {
    if (stadiumActionsBlocked()) return;
    markSessionPlay();
    commit(amount === 1 ? hire(stateRef.current, id) : payrollPurchase(stateRef.current, id, amount).state);
  }, [commit, stadiumActionsBlocked]);

  /* Round 162: catching the whistle. The floater says what it was worth. */
  const doCatchGolden = useCallback(() => {
    const g = goldenRef.current;
    if (!g || stadiumActionsBlocked()) return;
    setGolden(null);
    const { state: next, amount } = catchGolden(stateRef.current, g.kind);
    if (next === stateRef.current) return;
    const info = GOLDEN_INFO[g.kind];
    if (g.kind === 'windfall') pushFloater(`🪙 ${info.label} +${fmtMoney(amount ?? 0)}`, 'win', g.x, g.y);
    else if (g.kind === 'fanWave') pushFloater(`🪙 ${info.label}: +${(amount ?? 0).toLocaleString()} fans`, 'win', g.x, g.y);
    else if (g.kind === 'freeLevel') pushFloater(`🪙 ${info.label}: ${info.blurb}`, 'win', g.x, g.y);
    else pushFloater(`🪙 ${info.label}: ${info.blurb}!`, 'win', g.x, g.y);
    setConfetti(c => c + 1);
    commit(next);
  }, [pushFloater, commit, stadiumActionsBlocked]);

  const doTap = useCallback((xPct: number, yPct: number) => {
    if (stadiumActionsBlocked()) return false;
    markSessionPlay();
    const before = stateRef.current;
    const after = tap(before);
    /* Round 583: every floater prints the engine's real change through fmtMoney,
       the way the balance does. Taps printed raw numbers, so deep into a run a
       tap read +$4830000000 beside a balance reading $4.83B. */
    pushFloater(`+${fmtMoney(after.money - before.money)}`, 'tap', xPct, yPct);
    commit(after);
    return true;
  }, [pushFloater, commit, stadiumActionsBlocked]);

  const doBoost = useCallback(() => {
    if (stadiumActionsBlocked()) return;
    const before = stateRef.current;
    const after = activateBoost(before);
    if (after !== before) {
      pushFloater(`MATCHDAY HYPE x${HYPE_MULT}!`, 'win', 30, 18);
      setConfetti(c => c + 1);
      commit(after);
    }
  }, [pushFloater, commit, stadiumActionsBlocked]);

  /* Round 581: selling up is the most destructive thing this game does, so it
     is written from the ref and saved before React hears about it. Inside a
     setState updater the save ran whenever React got round to the updater, and
     a pagehide landing first wrote the pre-sale ground back over the sale. */
  const doPrestige = useCallback(() => {
    if (stadiumActionsBlocked()) return false;
    const now = Date.now();
    const next = prestige(stateRef.current, now);
    if (next === stateRef.current) return false;
    if (writeStadium(next, now) !== 'written') return false;
    stateRef.current = next;
    setState(next);
    return true;
  }, [writeStadium, stadiumActionsBlocked]);

  /* Round 196: the boardroom. Spending legacy is a meaningful action too,
     so it marks the session like a tap or a hire does. */
  const doLegacyPerk = useCallback((id: string) => {
    if (stadiumActionsBlocked()) return false;
    const before = stateRef.current;
    const after = buyPerk(before, id);
    if (after === before) return false;
    if (writeStadium(after) !== 'written') return false;
    markSessionPlay();
    const p = perkById(id);
    if (p) pushFloater(`${p.emoji} ${p.name}: locked in forever`, 'win', 24, 30);
    setConfetti(c => c + 1);
    commit(after);
    return true;
  }, [commit, markSessionPlay, pushFloater, writeStadium, stadiumActionsBlocked]);

  /* Round 582: the club name, picked from generated options. Not a session mark:
     naming the club is not playing it. */
  const doSetClubName = useCallback((name: string) => {
    if (stadiumActionsBlocked()) return;
    const before = stateRef.current;
    const after = setClubName(before, name);
    if (after === before) return;
    commit(after);
  }, [commit, stadiumActionsBlocked]);

  const doBeginSetPiece = useCallback((offer: SetPieceOffer) => {
    if (!replaysOnRef.current || document.hidden || stadiumActionsBlocked()) return;
    const next = beginSetPiece(stateRef.current, offer);
    if (next === stateRef.current) return;
    const saved = writeStadium(next);
    if (saved !== 'written') {
      if (saved === 'failed') setSetPieceError('This kick could not be saved. Try opening it again.');
      return;
    }
    commit(next);
    setSetPieceError(null);
    setActiveSetPiece(offer);
  }, [commit, writeStadium, stadiumActionsBlocked]);

  const doSetPieceResult = useCallback((offer: SetPieceOffer, scored: boolean): 'accepted' | 'expired' | 'save-failed' => {
    if (checkSaveMoved()) return 'expired';
    if (heldGraduateWrite.current) return 'save-failed';
    const before = stateRef.current;
    if ((before.totalMatches ?? 0) !== offer.match || before.rep !== offer.rep
      || before.minute >= 90 || before.setPieceAttemptedMatch !== offer.match) return 'expired';
    if (!scored || before.setPieceUsedMatch === offer.match) return 'accepted';
    const awarded = awardSetPieceGoal(before, offer);
    if (!awarded) return 'expired';
    const saved = writeStadium(awarded.state);
    if (saved !== 'written') return saved === 'moved' ? 'expired' : 'save-failed';
    commit(awarded.state);
    pushFloater(`GOAL ${awarded.event.minute}' +${fmtMoney(awarded.event.amount ?? 0)}`, 'goal', 50, 24);
    setConfetti(count => count + 1);
    return 'accepted';
  }, [commit, pushFloater, checkSaveMoved, writeStadium]);
  const closeSetPiece = useCallback(() => { setActiveSetPiece(null); setSetPieceError(null); }, []);

  const dismissAway = useCallback(() => { setAwayPay(null); setAwayTrip(null); }, []);
  const dismissPromotion = useCallback(() => setPromotion(null), []);
  const dismissBadge = useCallback(() => setBadgeQueue(q => q.slice(1)), []);
  /* Round 583: the pitch says when a replay has finished, and whether it is on
     screen at all. Turning it on or off drops anything queued. */
  const endReplay = useCallback((id: number) => setReplays(q => q.filter(r => r.id !== id)), []);
  const watchReplays = useCallback((on: boolean) => {
    replaysOnRef.current = on;
    setReplays(q => (q.length ? [] : q));
  }, []);
  const pendingSetPiece = setPieceOffer(state, replaysOnRef.current && typeof document !== 'undefined' && !document.hidden);
  useEffect(() => {
    setSetPieceError(null);
  }, [pendingSetPiece?.match, pendingSetPiece?.rep]);

  return {
    state, floaters, awayPay, awayTrip, dismissAway, confetti, gearSaveBlocked, saveMoved,
    doSetTicketPolicy, ticketSaveFailed, retryTicketSave, doSetMatchPlan, doSignSponsor, doBookScouting,
    sponsorSaveFailed: sponsorSaveError?.ground === state.rep && sponsorSaveError.season === state.league?.season,
    doReserveSeasonTickets,
    seasonTicketSaveFailed: seasonTicketSaveError?.ground === state.rep && seasonTicketSaveError.season === state.league?.season,
    matchPlanSaveFailed: matchPlanError === state.matchNo,
    scoutingSaveFailed: scoutingSaveError?.ground === state.rep && scoutingSaveError.match === state.matchNo + 1,
    doBookGraduateAttack,
    graduateAttackError: graduateAttackError?.ground === state.rep && graduateAttackError.match === state.matchNo + 1 ? graduateAttackError.message : null,
    matchPlanForecast: (kind: MatchPlanKind) => matchPlanForecast(state, getEdgeRef.current?.() ?? 0, kind),
    doBookStandsConstruction, standsConstructionSaveFailed: standsConstructionSaveError === state.rep,
    doExpansionTarget, expansionTargetSaveFailed,
    doBuy, doTap, doPrestige, doBoost,
    golden, doCatchGolden, doHire, doLegacyPerk,
    promotion, dismissPromotion, badge, dismissBadge, doSetClubName,
    replays, endReplay, watchReplays,
    setPiece: pendingSetPiece,
    activeSetPiece, setPieceError, doBeginSetPiece, doSetPieceResult, closeSetPiece,
  };
}
