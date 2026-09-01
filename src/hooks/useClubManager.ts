import { useState, useEffect, useMemo, useCallback } from 'react';
import { recordCompletion, recordActivity } from '@/lib/completions';
import {
  CareerState, MatchWeekReport, SeasonSummary, MarketPlayer, Mentality,
  FORMATIONS, startCareer, playNextEntry, finishSeason, startNextSeason,
  buildMarket, buyPlayer, autoPickXI, nextFixture, sortedTable,
  leaguePosition, currentSeasonScore, saveCareer, loadCareer, clearCareer,
  startNegotiation, makeOffer, walkAway, respondApproach, setTicketTier, expandGround, signSponsor,
  enterWilderness, wildernessWeek, acceptWildernessJob, takeNationJob, leaveNationJob, payClause, loanIn, acceptBid, rejectBid,
  answerMessage, setTransferStatus, loanOutPlayer, renewContract, renewContractWithClause,
  upgradeAcademy, hireScout, recallScout, promoteProspect, releaseProspect, setTrainingPlan,
  resumeMatch, makeHalftimeSub, setHalftimeMentality, setSquadRole,
  setTeamTalk, giveHalftimeTalk, answerPress, duckPress,
  matchFacts,
  DEFAULT_ERA_ID,
} from '@/lib/clubManager';
import type { MatchFacts } from '@/lib/clubManager';
import type { TransferStatus, FacilityKind, TrainingPlan, SquadRole, TalkTone, DealExtras } from '@/lib/clubManager';
import type { NextFixtureInfo, TableRow, CustomClubSpec, ManagerSpec } from '@/lib/clubManager';

export type CMPhase = 'boot' | 'resume' | 'clubSelect' | 'hub' | 'halftime' | 'matchResult' | 'seasonEnd' | 'sacked';
export type HubTab = 'overview' | 'squad' | 'tactics' | 'table' | 'transfers';

export function useClubManager() {
  const [phase, setPhase] = useState<CMPhase>('boot');
  const [career, setCareer] = useState<CareerState | null>(null);
  const [report, setReport] = useState<MatchWeekReport | null>(null);
  const [summary, setSummary] = useState<SeasonSummary | null>(null);
  const [activeTab, setActiveTab] = useState<HubTab>('overview');
  const [pendingClub, setPendingClub] = useState<string | null>(null);

  // Boot: look for a saved career and offer to resume it.
  useEffect(() => {
    const saved = loadCareer();
    if (saved) {
      setCareer(saved);
      if (saved.pendingSummary) setSummary(saved.pendingSummary);
      setPhase('resume');
    } else {
      setPhase('clubSelect');
    }
  }, []);

  // Persist the career on every change.
  useEffect(() => {
    if (career) saveCareer(career);
  }, [career]);

  /* ---------- derived ---------- */
  const market: MarketPlayer[] = useMemo(
    () => (career ? buildMarket(career) : []),
    [career],
  );
  const nextFx: NextFixtureInfo | null = useMemo(
    () => (career ? nextFixture(career) : null),
    [career],
  );
  const tableRows: TableRow[] = useMemo(
    () => (career ? sortedTable(career.table) : []),
    [career],
  );
  const myPosition = useMemo(
    () => (career ? leaguePosition(career) : 0),
    [career],
  );
  /* Round 157: everything the pre-match facts screen shows, derived from the
     save itself: real form, real head-to-head, the engine's own odds. */
  const facts: MatchFacts | null = useMemo(
    () => (career && !career.live ? matchFacts(career) : null),
    [career],
  );

  /* ---------- lifecycle actions ---------- */
  const resume = useCallback(() => {
    if (!career) { setPhase('clubSelect'); return; }
    if (career.sacked) setPhase('sacked');
    else if (career.pendingSummary) { setSummary(career.pendingSummary); setPhase('seasonEnd'); }
    else setPhase('hub');
    setActiveTab('overview');
  }, [career]);

  const startNew = useCallback(() => {
    clearCareer();
    setCareer(null);
    setReport(null);
    setSummary(null);
    setPendingClub(null);
    setPhase('clubSelect');
  }, []);

  const chooseClub = useCallback((clubName: string) => {
    setPendingClub(clubName);
  }, []);

  /* Round 132: the era rides in from the picker. Nothing passed means the
     current era, which is the world this game has always started in.
     Round 303: the optional manager spec rides the same way; absent means
     the second person career this has always been. */
  const confirmClub = useCallback((eraId?: string, manager?: ManagerSpec) => {
    if (!pendingClub) return;
    const s = startCareer(pendingClub, eraId ?? DEFAULT_ERA_ID, undefined, manager);
    setCareer(s);
    setActiveTab('overview');
    setPhase('hub');
  }, [pendingClub]);

  /* Round 154: founding your own club skips the pending-club dance, because
     the create form is its own confirmation. */
  const confirmCustomClub = useCallback((eraId: string | undefined, spec: CustomClubSpec, manager?: ManagerSpec) => {
    const s = startCareer(spec.name, eraId ?? DEFAULT_ERA_ID, spec, manager);
    setCareer(s);
    setPendingClub(null);
    setActiveTab('overview');
    setPhase('hub');
  }, []);

  /* ---------- tactics ---------- */
  const setFormationIndex = useCallback((idx: number) => {
    setCareer(prev => {
      if (!prev) return prev;
      const next = { ...prev, formationIndex: idx };
      next.xiIds = autoPickXI(next.squad, FORMATIONS[idx]);
      return next;
    });
  }, []);

  const setMentality = useCallback((m: Mentality) => {
    setCareer(prev => (prev ? { ...prev, mentality: m } : prev));
  }, []);

  const setXiSlot = useCallback((slotIdx: number, playerId: string | null) => {
    setCareer(prev => {
      if (!prev) return prev;
      const xi = [...prev.xiIds];
      // Round 114: picking someone who is already in the XI now SWAPS the two
      // rather than leaving an empty hole where he used to stand, which is
      // what the drag on the pitch does and what everyone expects anyway.
      const at = playerId === null ? -1 : xi.findIndex(id => id === playerId);
      if (at >= 0 && at !== slotIdx) xi[at] = xi[slotIdx];
      xi[slotIdx] = playerId;
      return { ...prev, xiIds: xi };
    });
  }, []);

  /** Round 114: drag a player onto another spot and the two trade places. */
  const swapXiSlots = useCallback((a: number, b: number) => {
    setCareer(prev => {
      if (!prev) return prev;
      if (a === b) return prev;
      const xi = [...prev.xiIds];
      if (a < 0 || b < 0 || a >= xi.length || b >= xi.length) return prev;
      const held = xi[a];
      xi[a] = xi[b];
      xi[b] = held;
      return { ...prev, xiIds: xi };
    });
  }, []);

  const autoPick = useCallback(() => {
    setCareer(prev => {
      if (!prev) return prev;
      return { ...prev, xiIds: autoPickXI(prev.squad, FORMATIONS[prev.formationIndex]) };
    });
  }, []);

  /* ---------- season progression ---------- */
  const runEntry = useCallback((skipHalftime: boolean) => {
    if (!career) return;
    const res = playNextEntry(career, skipHalftime ? { skipHalftime: true } : undefined);
    setCareer(res.state);
    /* Round 119: the match stops at the interval now. Everything this game has
       built for eleven rounds happens between fixtures; this is the one moment
       inside one where the manager gets to manage. Round 157: unless you asked
       for the quick sim, which plays it in one shot and shows the report. */
    if (res.kind === 'halftime') {
      setPhase('halftime');
    } else if (res.kind === 'window') {
      setActiveTab('transfers');
      setPhase('hub');
    } else if (res.kind === 'match' && res.report) {
      /* Round 157: a played match counts as playing the game TODAY, not only
         at the end of a 50-fixture season. This is what feeds the header's
         games-played, points and rank, which sat at zero all session for
         anyone mid-season (his screenshot, 2026-08-18). */
      /* Round 392: as ACTIVITY, the shape Round 301 gave the other sims. A
         completion here fed the signed in save on every match, so a season
         was fifty ranked rows and the running season score was added to the
         player's points fifty times over. Measured 2026-09-01: the top of
         the points table held 80,246 of its 87,800 from 1,586 Club Manager
         rows. The finished season below is the completion. */
      recordActivity('/club-manager', currentSeasonScore(res.state));
      setReport(res.report);
      setPhase('matchResult');
    } else if (res.kind === 'seasonOver') {
      const { state, summary: sm } = finishSeason(res.state);
      recordCompletion('/club-manager', sm.seasonScore);
      setCareer(state);
      setSummary(sm);
      setPhase('seasonEnd');
    }
  }, [career]);

  const play = useCallback(() => runEntry(false), [runEntry]);
  /** Round 157: the quick sim. One tap, full result, no dressing room stop. */
  const quickPlay = useCallback(() => runEntry(true), [runEntry]);

  /* Round 93: his calendar complaint. "u can click through and sim much
     faster... simulate through date or play match or whatever." Quick sim
     plays a run of fixtures back to back and only stops early for the things
     that genuinely need you: the transfer window, or the end of the season.
     The final match still surfaces its report so the run has a payoff. */
  const quickSim = useCallback((entries: number) => {
    if (!career) return;
    let state = career;
    let lastReport: MatchWeekReport | null = null;
    for (let i = 0; i < entries; i++) {
      if (state.week >= state.calendar.length) break;
      /* Round 93's fast forward plays a run of fixtures back to back, so it
         asks for the whole match at once. A dressing room ten times over is
         not a fast forward. */
      const res = playNextEntry(state, { skipHalftime: true });
      state = res.state;
      if (res.kind === 'window') {
        setCareer(state);
        setActiveTab('transfers');
        setPhase('hub');
        return;
      }
      if (res.kind === 'seasonOver') {
        const { state: done, summary: sm } = finishSeason(state);
        recordCompletion('/club-manager', sm.seasonScore);
        setCareer(done);
        setSummary(sm);
        setPhase('seasonEnd');
        return;
      }
      if (res.kind === 'match' && res.report) lastReport = res.report;
    }
    setCareer(state);
    if (lastReport) {
      // Round 157: a fast-forwarded run still counts as playing today.
      recordActivity('/club-manager', currentSeasonScore(state));
      setReport(lastReport);
      setPhase('matchResult');
    }
  }, [career]);

  const continueFromReport = useCallback(() => {
    if (!career) return;
    if (career.sacked) {
      recordCompletion('/club-manager', currentSeasonScore(career));
      /* Round 201: the sack opens the wilderness rather than closing the
         save. The screen is the same route ('sacked'), what changed is that
         it now has a way onward. */
      setCareer(prev => (prev ? enterWilderness(prev) : prev));
      setPhase('sacked');
      return;
    }
    if (career.week >= career.calendar.length) {
      const { state, summary: sm } = finishSeason(career);
      recordCompletion('/club-manager', sm.seasonScore);
      setCareer(state);
      setSummary(sm);
      setPhase('seasonEnd');
      return;
    }
    setReport(null);
    setActiveTab('overview');
    setPhase('hub');
  }, [career]);

  const nextSeason = useCallback((acceptOfferClub?: string) => {
    if (!career) return;
    const s = startNextSeason(career, acceptOfferClub);
    setCareer(s);
    setSummary(null);
    setReport(null);
    setActiveTab('overview');
    setPhase('hub');
  }, [career]);

  /* ---------- transfers ---------- */
  const buy = useCallback((mp: MarketPlayer) => {
    setCareer(prev => {
      if (!prev) return prev;
      const next = buyPlayer(prev, mp);
      return next ?? prev;
    });
  }, []);

  /* Round 141: the instant sell action is gone. Selling is: transfer list
     him (setTransferStatus), let bids arrive, accept one (acceptBid below).
     The owner asked for exactly this: offers or nothing. */

  /* ---------- Round 71: negotiations, clauses, loans, incoming bids ---------- */
  const negotiate = useCallback((mp: MarketPlayer) => {
    setCareer(prev => (prev ? startNegotiation(prev, mp) ?? prev : prev));
  }, []);

  /* Round 161: an offer can be a package: cash plus add-ons plus a sell-on
     plus a part-exchange player. Extras default to nothing, which is the
     exact deal this hook has always sent. */
  const offer = useCallback((amount: number, extras?: DealExtras) => {
    setCareer(prev => (prev ? makeOffer(prev, amount, extras) ?? prev : prev));
  }, []);

  const walk = useCallback(() => {
    setCareer(prev => (prev ? walkAway(prev) : prev));
  }, []);

  /* Round 168: answer the mid-season approach from the Manager panel. */
  const answerApproach = useCallback((commit: boolean) => {
    setCareer(prev => (prev ? respondApproach(prev, commit) : prev));
  }, []);

  /* Round 171: the finance desk. */
  const setTickets = useCallback((tier: 0 | 1 | 2) => {
    setCareer(prev => (prev ? setTicketTier(prev, tier) : prev));
  }, []);
  const expandStadium = useCallback(() => {
    setCareer(prev => (prev ? expandGround(prev) ?? prev : prev));
  }, []);
  /* Round 200: the commercial desk. */
  const takeSponsor = useCallback((offerId: string) => {
    setCareer(prev => (prev ? signSponsor(prev, offerId) ?? prev : prev));
  }, []);
  /* Round 202: the country. */
  const acceptNation = useCallback(() => {
    setCareer(prev => (prev ? takeNationJob(prev) : prev));
  }, []);
  const resignNation = useCallback(() => {
    setCareer(prev => (prev ? leaveNationJob(prev) : prev));
  }, []);

  /* Round 201: out of work. Waiting is a move, and taking a job is the
     ordinary season rollover with a different club at the end of it. */
  const waitAWeek = useCallback(() => {
    setCareer(prev => (prev ? wildernessWeek(prev.wilderness ? prev : enterWilderness(prev)) : prev));
  }, []);
  const takeJob = useCallback((club: string) => {
    setCareer(prev => {
      if (!prev) return prev;
      const next = acceptWildernessJob(prev, club);
      if (!next) return prev;
      setPhase('hub');
      return next;
    });
  }, []);

  const dismissNegotiation = useCallback(() => {
    setCareer(prev => (prev ? { ...prev, negotiation: null } : prev));
  }, []);

  const clause = useCallback((mp: MarketPlayer) => {
    setCareer(prev => (prev ? payClause(prev, mp) ?? prev : prev));
  }, []);

  const loan = useCallback((mp: MarketPlayer) => {
    setCareer(prev => (prev ? loanIn(prev, mp) ?? prev : prev));
  }, []);

  const acceptIncomingBid = useCallback((playerId: string) => {
    setCareer(prev => (prev ? acceptBid(prev, playerId) ?? prev : prev));
  }, []);

  const rejectIncomingBid = useCallback((playerId: string) => {
    setCareer(prev => (prev ? rejectBid(prev, playerId) : prev));
  }, []);

  /* ---------- Round 94: transfer list, loan list, block ---------- */
  const setStatus = useCallback((playerId: string, status: TransferStatus | null) => {
    setCareer(prev => (prev ? setTransferStatus(prev, playerId, status) : prev));
  }, []);

  const loanOut = useCallback((playerId: string) => {
    setCareer(prev => (prev ? loanOutPlayer(prev, playerId) ?? prev : prev));
  }, []);

  /* ---------- Round 105: contracts ---------- */
  const renew = useCallback((playerId: string) => {
    setCareer(prev => (prev ? renewContract(prev, playerId) ?? prev : prev));
  }, []);

  /* Round 193: the clause renewal, cheaper wage for an exit door. */
  const renewWithClause = useCallback((playerId: string) => {
    setCareer(prev => (prev ? renewContractWithClause(prev, playerId) ?? prev : prev));
  }, []);

  /* ---------- Round 127: squad roles and playing time promises ---------- */
  const setRole = useCallback((playerId: string, role: SquadRole) => {
    setCareer(prev => (prev ? setSquadRole(prev, playerId, role) ?? prev : prev));
  }, []);

  /* ---------- Round 116: the academy and the training ground ---------- */
  const upgradeFacility = useCallback((kind: FacilityKind) => {
    setCareer(prev => (prev ? upgradeAcademy(prev, kind) ?? prev : prev));
  }, []);

  const sendScout = useCallback((candidateId: string, regionId: string, weeks: number) => {
    setCareer(prev => (prev ? hireScout(prev, candidateId, regionId, weeks) ?? prev : prev));
  }, []);

  const callScoutHome = useCallback((scoutId: string) => {
    setCareer(prev => (prev ? recallScout(prev, scoutId) : prev));
  }, []);

  const promote = useCallback((prospectId: string) => {
    setCareer(prev => (prev ? promoteProspect(prev, prospectId) ?? prev : prev));
  }, []);

  const release = useCallback((prospectId: string) => {
    setCareer(prev => (prev ? releaseProspect(prev, prospectId) : prev));
  }, []);

  const setTraining = useCallback((plan: TrainingPlan) => {
    setCareer(prev => (prev ? setTrainingPlan(prev, plan) : prev));
  }, []);

  /* ---------- Round 119: the dressing room ---------- */
  const subAtHalftime = useCallback((outId: string, inId: string) => {
    setCareer(prev => (prev ? makeHalftimeSub(prev, outId, inId) ?? prev : prev));
  }, []);

  const shapeAtHalftime = useCallback((m: Mentality) => {
    setCareer(prev => (prev ? setHalftimeMentality(prev, m) : prev));
  }, []);

  const secondHalf = useCallback(() => {
    if (!career) return;
    const res = resumeMatch(career);
    setCareer(res.state);
    if (res.report) {
      // Round 157: a finished match counts toward today, mid-season included.
      recordActivity('/club-manager', currentSeasonScore(res.state));
      setReport(res.report);
      setPhase('matchResult');
    } else {
      setPhase('hub');
    }
  }, [career]);

  /* ---------- Round 135: the microphone and the dressing room ---------- */
  /* Tapping the tone you already picked takes it back, so a mis-tap is not a
     decision you are stuck with for ninety minutes. */
  const talk = useCallback((tone: TalkTone) => {
    setCareer(prev => (prev ? setTeamTalk(prev, tone) : prev));
  }, []);

  const halftimeTalk = useCallback((tone: TalkTone) => {
    setCareer(prev => (prev ? giveHalftimeTalk(prev, tone) : prev));
  }, []);

  const sayIt = useCallback((optionIdx: number) => {
    setCareer(prev => (prev ? answerPress(prev, optionIdx) : prev));
  }, []);

  const sendAssistant = useCallback(() => {
    setCareer(prev => (prev ? duckPress(prev) : prev));
  }, []);

  /* ---------- Round 73: the inbox ---------- */
  const answer = useCallback((messageId: string, optionIdx: number) => {
    setCareer(prev => (prev ? answerMessage(prev, messageId, optionIdx) : prev));
  }, []);

  return {
    quickSim,
    phase, career, report, summary, activeTab, setActiveTab, pendingClub,
    market, nextFx, tableRows, myPosition, facts,
    resume, startNew, chooseClub, confirmClub, confirmCustomClub,
    setFormationIndex, setMentality, setXiSlot, swapXiSlots, autoPick,
    play, quickPlay, continueFromReport, nextSeason,
    buy,
    negotiate, offer, walk, answerApproach, setTickets, expandStadium, takeSponsor, waitAWeek, takeJob, acceptNation, resignNation, dismissNegotiation, clause, loan,
    acceptIncomingBid, rejectIncomingBid,
    setStatus, loanOut, renew, renewWithClause, setRole,
    upgradeFacility, sendScout, callScoutHome, promote, release, setTraining,
    subAtHalftime, shapeAtHalftime, secondHalf,
    talk, halftimeTalk, sayIt, sendAssistant,
    answer,
  };
}

export type ClubManagerGame = ReturnType<typeof useClubManager>;
