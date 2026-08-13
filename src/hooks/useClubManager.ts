import { useState, useEffect, useMemo, useCallback } from 'react';
import { recordCompletion } from '@/lib/completions';
import {
  CareerState, MatchWeekReport, SeasonSummary, MarketPlayer, Mentality,
  FORMATIONS, startCareer, playNextEntry, finishSeason, startNextSeason,
  buildMarket, buyPlayer, sellPlayer, autoPickXI, nextFixture, sortedTable,
  leaguePosition, currentSeasonScore, saveCareer, loadCareer, clearCareer,
  startNegotiation, makeOffer, walkAway, payClause, loanIn, acceptBid, rejectBid,
  answerMessage, setTransferStatus, loanOutPlayer, renewContract,
} from '@/lib/clubManager';
import type { TransferStatus } from '@/lib/clubManager';
import type { NextFixtureInfo, TableRow } from '@/lib/clubManager';

export type CMPhase = 'boot' | 'resume' | 'clubSelect' | 'hub' | 'matchResult' | 'seasonEnd' | 'sacked';
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

  const confirmClub = useCallback(() => {
    if (!pendingClub) return;
    const s = startCareer(pendingClub);
    setCareer(s);
    setActiveTab('overview');
    setPhase('hub');
  }, [pendingClub]);

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
      const xi = prev.xiIds.map(id => (playerId !== null && id === playerId ? null : id));
      xi[slotIdx] = playerId;
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
  const play = useCallback(() => {
    if (!career) return;
    const res = playNextEntry(career);
    setCareer(res.state);
    if (res.kind === 'window') {
      setActiveTab('transfers');
      setPhase('hub');
    } else if (res.kind === 'match' && res.report) {
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
      const res = playNextEntry(state);
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
      setReport(lastReport);
      setPhase('matchResult');
    }
  }, [career]);

  const continueFromReport = useCallback(() => {
    if (!career) return;
    if (career.sacked) {
      recordCompletion('/club-manager', currentSeasonScore(career));
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

  const sell = useCallback((playerId: string) => {
    setCareer(prev => {
      if (!prev) return prev;
      const next = sellPlayer(prev, playerId);
      return next ?? prev;
    });
  }, []);

  /* ---------- Round 71: negotiations, clauses, loans, incoming bids ---------- */
  const negotiate = useCallback((mp: MarketPlayer) => {
    setCareer(prev => (prev ? startNegotiation(prev, mp) ?? prev : prev));
  }, []);

  const offer = useCallback((amount: number) => {
    setCareer(prev => (prev ? makeOffer(prev, amount) ?? prev : prev));
  }, []);

  const walk = useCallback(() => {
    setCareer(prev => (prev ? walkAway(prev) : prev));
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

  /* ---------- Round 73: the inbox ---------- */
  const answer = useCallback((messageId: string, optionIdx: number) => {
    setCareer(prev => (prev ? answerMessage(prev, messageId, optionIdx) : prev));
  }, []);

  return {
    quickSim,
    phase, career, report, summary, activeTab, setActiveTab, pendingClub,
    market, nextFx, tableRows, myPosition,
    resume, startNew, chooseClub, confirmClub,
    setFormationIndex, setMentality, setXiSlot, autoPick,
    play, continueFromReport, nextSeason,
    buy, sell,
    negotiate, offer, walk, dismissNegotiation, clause, loan,
    acceptIncomingBid, rejectIncomingBid,
    setStatus, loanOut, renew,
    answer,
  };
}

export type ClubManagerGame = ReturnType<typeof useClubManager>;
