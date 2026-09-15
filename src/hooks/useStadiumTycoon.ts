/**
 * Round 146: the live half of Stadium Tycoon. The lib owns the math; this
 * owns time, storage and the event stream the animations feed on. The loop
 * runs on requestAnimationFrame but ticks the sim at ~5 Hz, which is plenty
 * for an idle game and keeps phones cool. Saves every 5 seconds and on tab
 * hide, so the away-earnings clock is honest.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { recordCompletion } from '@/lib/completions';
import { recordFullTimes } from '@/lib/tycoonRewards';
import type { FullTime } from '@/lib/tycoonRewards';
import {
  TycoonState, TickEvent, newTycoon, tick, buy, tap, prestige,
  offlineEarnings, serializeTycoon, deserializeTycoon, TYCOON_SAVE_KEY,
  activateBoost, hire, catchGolden, rollGoldenKind, goldenActive, ACH_BONUS,
  GOLDEN_INFO, fmtMoney, buyPerk, perkById, setClubName, GOLDEN_CATCH_SEC, GOLDEN_MEAN_GAP_SEC, HYPE_MULT,
  awaySecondsOf, playAwayMatchdays, AWAY_MATCHDAY_SEC, leaguePosition, leagueShape,
} from '@/lib/stadiumTycoon';
import type { GoldenKind, LeagueClub, AwayMatch } from '@/lib/stadiumTycoon';

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

/** Round 530: the two loudest events, held for the page's cards. The label
 *  and the bonus are the engine's own event fields, printed as they came. */
export interface Promotion { label: string; amount: number; seq: number }
export interface BadgeEarned { label: string; seq: number }
/** Round 582 review: the season that just ended, so the League tab can show how
 *  it finished instead of silently wiping the table. This sitting only. */
export interface LastSeason { label: string; position: number; table: LeagueClub[] }
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

export function useStadiumTycoon(getEdge?: () => number) {
  const getEdgeRef = useRef(getEdge);
  getEdgeRef.current = getEdge;
  const [state, setState] = useState<TycoonState>(() => {
    const now = Date.now();
    const loaded = deserializeTycoon(
      typeof localStorage !== 'undefined' ? localStorage.getItem(TYCOON_SAVE_KEY) : null,
      now,
    );
    return loaded ?? newTycoon(now);
  });
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const [awayPay, setAwayPay] = useState<number | null>(null);
  /* Round 584: the matchdays played while you were away, for the away card. */
  const [awayTrip, setAwayTrip] = useState<AwayTrip | null>(null);
  const [confetti, setConfetti] = useState(0);
  const [golden, setGolden] = useState<PendingGolden | null>(null);
  const [promotion, setPromotion] = useState<Promotion | null>(null);
  const [badge, setBadge] = useState<BadgeEarned | null>(null);
  const [lastSeason, setLastSeason] = useState<LastSeason | null>(null);
  /* Round 583: goals waiting for the pitch. Queued only while the pitch is on
     screen: a goal scored while you are in another room is on the scoreboard
     when you come back, and is never replayed late. */
  const [replays, setReplays] = useState<Replay[]>([]);
  const replaysOnRef = useRef(true);
  /* Round 581: the ref is the truth and it is written FIRST. Every change
     computes from the ref, assigns the ref, saves if it has to, and only then
     tells React. It used to be assigned during render, so between an action and
     the render that followed it the ref still held the state from before the
     action: a pagehide in that gap (the Round 567 shape) saved the old state
     over the new one, and a tick and a tap landing in the same frame each read
     the old ref and the second erased the first. */
  const stateRef = useRef(state);
  const commit = useCallback((next: TycoonState) => {
    stateRef.current = next;
    setState(next);
  }, []);
  const goldenRef = useRef(golden);
  goldenRef.current = golden;

  const pushFloater = useCallback((text: string, kind: Floater['kind'], x?: number, y?: number) => {
    const f: Floater = {
      id: floaterSeq++,
      text,
      kind,
      x: x ?? 20 + Math.random() * 60,
      y: y ?? 30 + Math.random() * 40,
    };
    setFloaters(cur => [...cur.slice(-14), f]);
    // Floaters clean themselves up after the animation finishes.
    setTimeout(() => setFloaters(cur => cur.filter(g => g.id !== f.id)), 1900);
  }, []);

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
    const now = Date.now();
    const cur = stateRef.current;
    const trip = { ...cur, savedAt: paidUntilRef.current };
    const pay = offlineEarnings(trip, now);
    /* Round 584: a matchday for every half hour of the same trip the pay counts.
       Played after the pay is worked out, so the results cannot move it. */
    const matchdays = Math.floor(awaySecondsOf(trip, now) / AWAY_MATCHDAY_SEC);
    paidUntilRef.current = now;
    /* Review: a club with no income (a doctored fanbase of 0) still plays its
       matchdays, so the pay alone cannot gate the settle. */
    if (!(pay > 0) && matchdays === 0) return;
    setAwayPay(Math.max(0, pay));
    const paid = { ...cur, money: cur.money + Math.max(0, pay), lifetime: cur.lifetime + Math.max(0, pay), savedAt: now };
    const away = matchdays > 0 ? playAwayMatchdays(paid, matchdays, Math.random, getEdgeRef.current?.() ?? 0) : null;
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
    const next = away ? away.state : paid;
    stateRef.current = next;
    // Bank it straight away: an unsaved settle would be paid a second time.
    try { localStorage.setItem(TYCOON_SAVE_KEY, serializeTycoon(next, now)); } catch { /* ignore */ }
    setState(next);
  }, []);

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
    const step = (t: number) => {
      const dt = Math.min(2, (t - last) / 1000);
      last = t;
      acc += dt;
      sinceSave += dt;
      if (acc >= 0.2) {
        const use = acc;
        acc = 0;
        // Round 439: the loop has now paid for these seconds, so the away
        // settle must not bill for them again.
        paidUntilRef.current += use * 1000;
        const { state: next, events } = tick(stateRef.current, use, Math.random, getEdgeRef.current?.() ?? 0);
        stateRef.current = next;
        for (const e of events) reactToEvent(e);
        /* Round 585: a watched full time earns its gems, once, keyed on the
           career match count. A tick settles at most one full time. */
        const ft = events.find(e => e.kind === 'win' || e.kind === 'draw' || e.kind === 'loss');
        if (ft) {
          const season = events.find(e => (e.kind === 'title' || e.kind === 'seasonEnd') && e.position !== undefined);
          const gems = recordFullTimes([{ totalMatches: next.totalMatches ?? 0, result: ft.kind as FullTime['result'], away: false, position: season?.position }]);
          if (gems > 0) pushFloater(`+${gems} gems`, 'money', 62, 10);
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
          try { localStorage.setItem(TYCOON_SAVE_KEY, serializeTycoon(next, Date.now())); } catch { /* full/blocked storage never kills the game */ }
        }
      }
      raf = requestAnimationFrame(step);
    };
    const reactToEvent = (e: TickEvent) => {
      if ((e.kind === 'title' || e.kind === 'seasonEnd') && e.table && e.position !== undefined) {
        setLastSeason({ label: e.label ?? 'Season over', position: e.position, table: e.table });
      }
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
        pushFloater(`🏁 ${e.label} +${fmtMoney(e.amount ?? 0)}`, 'win', 18, 30);
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
        pushFloater(`${e.label}: +${Math.round(ACH_BONUS * 100)}% forever`, 'win', 22, 36);
        setConfetti(c => c + 1);
        setBadge({ label: e.label, seq: floaterSeq++ });
      } else if (e.kind === 'conceded') {
        pushFloater(`${e.minute}' they score`, 'bad', 25 + Math.random() * 50, 55 + Math.random() * 25);
      } else if (e.kind === 'loss') {
        pushFloater('full time. beaten', 'bad', 34, 14);
      }
    };
    raf = requestAnimationFrame(step);
    const saveNow = () => {
      try { localStorage.setItem(TYCOON_SAVE_KEY, serializeTycoon(stateRef.current, Date.now())); } catch { /* ignore */ }
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
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', saveNow);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', saveNow);
      saveNow();
    };
  }, [pushFloater, settleAway]);

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

  const doBuy = useCallback((id: string) => {
    markSessionPlay();
    commit(buy(stateRef.current, id));
  }, [commit]);

  /* Round 162: the payroll. */
  const doHire = useCallback((id: string) => {
    markSessionPlay();
    commit(hire(stateRef.current, id));
  }, [commit]);

  /* Round 162: catching the whistle. The floater says what it was worth. */
  const doCatchGolden = useCallback(() => {
    const g = goldenRef.current;
    if (!g) return;
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
  }, [pushFloater, commit]);

  const doTap = useCallback((xPct: number, yPct: number) => {
    markSessionPlay();
    const before = stateRef.current;
    const after = tap(before);
    /* Round 583: every floater prints the engine's real change through fmtMoney,
       the way the balance does. Taps printed raw numbers, so deep into a run a
       tap read +$4830000000 beside a balance reading $4.83B. */
    pushFloater(`+${fmtMoney(after.money - before.money)}`, 'tap', xPct, yPct);
    commit(after);
  }, [pushFloater, commit]);

  const doBoost = useCallback(() => {
    const before = stateRef.current;
    const after = activateBoost(before);
    if (after !== before) {
      pushFloater(`MATCHDAY HYPE x${HYPE_MULT}!`, 'win', 30, 18);
      setConfetti(c => c + 1);
      commit(after);
    }
  }, [pushFloater, commit]);

  /* Round 581: selling up is the most destructive thing this game does, so it
     is written from the ref and saved before React hears about it. Inside a
     setState updater the save ran whenever React got round to the updater, and
     a pagehide landing first wrote the pre-sale ground back over the sale. */
  const doPrestige = useCallback(() => {
    const now = Date.now();
    const next = prestige(stateRef.current, now);
    if (next === stateRef.current) return;
    stateRef.current = next;
    try { localStorage.setItem(TYCOON_SAVE_KEY, serializeTycoon(next, now)); } catch { /* ignore */ }
    setState(next);
  }, []);

  /* Round 196: the boardroom. Spending legacy is a meaningful action too,
     so it marks the session like a tap or a hire does. */
  const doLegacyPerk = useCallback((id: string) => {
    markSessionPlay();
    const before = stateRef.current;
    const after = buyPerk(before, id);
    if (after === before) return;
    const p = perkById(id);
    if (p) pushFloater(`${p.emoji} ${p.name}: locked in forever`, 'win', 24, 30);
    setConfetti(c => c + 1);
    stateRef.current = after;
    try { localStorage.setItem(TYCOON_SAVE_KEY, serializeTycoon(after, Date.now())); } catch { /* ignore */ }
    setState(after);
  }, [pushFloater]);

  /* Round 582: the club name, picked from generated options. Not a session mark:
     naming the club is not playing it. */
  const doSetClubName = useCallback((name: string) => {
    const before = stateRef.current;
    const after = setClubName(before, name);
    if (after === before) return;
    commit(after);
  }, [commit]);

  const dismissAway = useCallback(() => { setAwayPay(null); setAwayTrip(null); }, []);
  const dismissPromotion = useCallback(() => setPromotion(null), []);
  const dismissBadge = useCallback(() => setBadge(null), []);
  /* Round 583: the pitch says when a replay has finished, and whether it is on
     screen at all. Turning it on or off drops anything queued. */
  const endReplay = useCallback((id: number) => setReplays(q => q.filter(r => r.id !== id)), []);
  const watchReplays = useCallback((on: boolean) => {
    replaysOnRef.current = on;
    setReplays(q => (q.length ? [] : q));
  }, []);

  return {
    state, floaters, awayPay, awayTrip, dismissAway, confetti,
    doBuy, doTap, doPrestige, doBoost,
    golden, doCatchGolden, doHire, doLegacyPerk,
    promotion, dismissPromotion, badge, dismissBadge, doSetClubName, lastSeason,
    replays, endReplay, watchReplays,
  };
}
