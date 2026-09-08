import { useState, useEffect, useMemo, useCallback } from 'react';
import { recordCompletion, recordActivity, recordStreakDay } from '@/lib/completions';
import {
  CareerState, MatchWeekReport, SeasonSummary, MarketPlayer, Mentality,
  FORMATIONS, startCareer, playNextEntry, finishSeason, startNextSeason,
  buildMarket, buyPlayer, autoPickXI, nextFixture, sortedLeagueTable,
  leaguePosition, currentSeasonScore, saveCareer, loadCareer, clearCareer,
  startNegotiation, makeOffer, walkAway, respondApproach, expandGround,
  enterWilderness, wildernessWeek, acceptWildernessJob, takeNationJob, leaveNationJob, payClause, loanIn, acceptBid, rejectBid,
  answerMessage, setTransferStatus, loanOutPlayer, renewContract, renewContractWithClause,
  upgradeAcademy, hireScout, recallScout, promoteProspect, releaseProspect, setTrainingPlan,
  resumeMatch, makeHalftimeSub, setHalftimeMentality, setSquadRole,
  setTeamTalk, giveHalftimeTalk, answerPress, duckPress,
  matchFacts,
  changeLive, startSecondHalf, markLiveMinute,
  setDuty, dutyOptions, dutyLineOf, pitchLineOf, setSetPiece, autoSetPieces, startRetraining, stopRetraining,
  DEFAULT_ERA_ID,
} from '@/lib/clubManager';
import type { MatchFacts, LiveChange, Duty, SetPieceKey, Formation, FormationSlot } from '@/lib/clubManager';
import type { Position } from '@/types/game';
import type { TransferStatus, FacilityKind, TrainingPlan, SquadRole, TalkTone, DealExtras } from '@/lib/clubManager';
import type { NextFixtureInfo, TableRow, CustomClubSpec, ManagerSpec } from '@/lib/clubManager';
import { simToWeek as runSimToWeek } from '@/lib/clubManagerCalendar';
import { upgradeFacility as upgradeClubFacility } from '@/lib/clubManagerFacilities';
import type { FacilityId } from '@/lib/clubManagerFacilities';
import { acceptSponsor, pushSponsor, setConcessionTier, setTicketPolicy } from '@/lib/clubManagerFinances';
import type { ConcessionTier } from '@/lib/clubManagerFinances';
import { hireStaff, matchStaffOffer, releaseToPoacher, sackStaff } from '@/lib/clubManagerStaff';
import type { StaffPostId } from '@/lib/clubManagerStaff';

export type CMPhase = 'boot' | 'resume' | 'clubSelect' | 'hub' | 'halftime' | 'matchResult' | 'seasonEnd' | 'sacked';
export type HubTab = 'overview' | 'squad' | 'tactics' | 'table' | 'transfers';

/**
 * Round 505: a new shape keeps the eleven you picked. Until this round a
 * formation change threw the whole XI away and auto picked a fresh one, so a
 * manager who had put ten defenders out on purpose (the owner's own example)
 * lost the lot the moment he tried a different shape. Now every man carries
 * across to the first free slot wearing his old slot's label (RB to RB, CM to
 * CM, ST to ST), and his slot's duty travels with him because the label is
 * the line. Whatever is still empty is filled by the engine's own auto pick
 * over the men not already placed, so a fresh save still gets the best
 * winger for a shape that grew a wing. Pure, no draw.
 *
 * The label pass alone was not enough (the Round 505 review): a man whose
 * label the new shape does not have at all (the CDM going to a 4-4-2, the
 * tenth defender going anywhere) fell through to the auto pick and was
 * quietly benched, duty and all. So every man the labels did not place gets
 * a still free slot before the auto pick runs: one on his old slot's duty
 * line first, then one on the same band of the pitch, then any that is left,
 * and his duty rides along wherever the new slot's line offers it.
 */
function carryAcross(state: CareerState, from: Formation, to: Formation): { xiIds: (string | null)[]; xiDuties: (Duty | null)[] } {
  const oldIds = state.xiIds;
  const oldDuties = state.xiDuties ?? [];
  const xiIds: (string | null)[] = to.slots.map(() => null);
  const xiDuties: (Duty | null)[] = to.slots.map(() => null);
  const taken = new Set<number>();
  const placed = new Set<string>();
  const place = (i: number, j: number, id: string) => {
    taken.add(j);
    placed.add(id);
    xiIds[j] = id;
    const d = oldDuties[i] ?? null;
    xiDuties[j] = d && dutyOptions(to.slots[j]).includes(d) ? d : null;
  };
  const freeSlot = (ok: (t: FormationSlot) => boolean): number => to.slots.findIndex((t, k) => !taken.has(k) && ok(t));
  const picked = from.slots
    .map((sl, i) => ({ sl, i, id: oldIds[i] }))
    .filter((x): x is { sl: FormationSlot; i: number; id: string } => !!x.id && state.squad.some(p => p.id === x.id));
  const unmatched: typeof picked = [];
  for (const x of picked) {
    if (placed.has(x.id)) continue;
    const j = freeSlot(t => t.label === x.sl.label);
    if (j < 0) { unmatched.push(x); continue; }
    place(x.i, j, x.id);
  }
  for (const x of unmatched) {
    if (placed.has(x.id)) continue;
    const dutyLine = dutyLineOf(x.sl);
    const pitchLine = pitchLineOf(x.sl);
    let j = freeSlot(t => dutyLineOf(t) === dutyLine);
    if (j < 0) j = freeSlot(t => pitchLineOf(t) === pitchLine);
    if (j < 0) j = freeSlot(() => true);
    if (j < 0) break;
    place(x.i, j, x.id);
  }
  const empty = to.slots.map((_, j) => j).filter(j => xiIds[j] === null);
  if (empty.length) {
    const used = new Set(xiIds.filter((id): id is string => !!id));
    const picks = autoPickXI(state.squad.filter(p => !used.has(p.id)), { name: to.name, slots: empty.map(j => to.slots[j]) });
    empty.forEach((j, k) => { xiIds[j] = picks[k] ?? null; });
  }
  return { xiIds, xiDuties };
}

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
    () => (career ? sortedLeagueTable(career) : []),
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
      const to = FORMATIONS[idx];
      if (!to || idx === prev.formationIndex) return prev;
      const from = FORMATIONS[prev.formationIndex] ?? FORMATIONS[0];
      const { xiIds, xiDuties } = carryAcross(prev, from, to);
      return { ...prev, formationIndex: idx, xiIds, xiDuties };
    });
  }, []);

  /* ---------- Round 505: duties, set pieces and the second position ---------- */
  /** The duty on a slot of the current shape, or null to clear it. The engine refuses one the slot's line does not offer. */
  const setSlotDuty = useCallback((slotIdx: number, duty: Duty | null) => {
    setCareer(prev => (prev ? setDuty(prev, slotIdx, duty) ?? prev : prev));
  }, []);

  /** Hand a set piece job (or the armband) to a man; null hands it back to the auto pick. */
  const assignSetPiece = useCallback((key: SetPieceKey, playerId: string | null) => {
    setCareer(prev => (prev ? setSetPiece(prev, key, playerId) ?? prev : prev));
  }, []);

  const autoPickSetPieces = useCallback(() => {
    setCareer(prev => (prev ? autoSetPieces(prev) : prev));
  }, []);

  /** Put an outfielder to work on a second position. A refusal leaves the save alone; the screen prints why. */
  const retrain = useCallback((playerId: string, to: Position) => {
    setCareer(prev => (prev ? startRetraining(prev, playerId, to) ?? prev : prev));
  }, []);

  const stopRetrain = useCallback((playerId: string) => {
    setCareer(prev => (prev ? stopRetraining(prev, playerId) : prev));
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
      recordStreakDay('/club-manager');
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
     The final match still surfaces its report so the run has a payoff.
     Round 399: a sacking ends the run too.
     Round 466: the loop itself now lives in src/lib/clubManagerCalendar.ts
     (simToWeek), because a tap on any day of the calendar runs the very same
     loop to that day, and it also stops when a club's approach lands. This
     runs it to a week and does what the screens need with how it stopped. */
  const simToWeek = useCallback((targetWeek: number) => {
    if (!career) return;
    const run = runSimToWeek(career, targetWeek);
    if (run.halt === 'window') {
      setCareer(run.state);
      setActiveTab('transfers');
      setPhase('hub');
      return;
    }
    if (run.halt === 'seasonOver') {
      const { state: done, summary: sm } = finishSeason(run.state);
      recordCompletion('/club-manager', sm.seasonScore);
      setCareer(done);
      setSummary(sm);
      setPhase('seasonEnd');
      return;
    }
    setCareer(run.state);
    if (run.lastReport) {
      // Round 157: a fast-forwarded run still counts as playing today.
      recordActivity('/club-manager', currentSeasonScore(run.state));
      recordStreakDay('/club-manager');
      setReport(run.lastReport);
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

  /* Round 171: the finance desk. Round 467: a price change carries the fans'
     and the board's reaction with it, and food has a price of its own. */
  const setTickets = useCallback((tier: 0 | 1 | 2) => {
    setCareer(prev => (prev ? setTicketPolicy(prev, tier) : prev));
  }, []);
  const setConcessions = useCallback((tier: ConcessionTier) => {
    setCareer(prev => (prev ? setConcessionTier(prev, tier) : prev));
  }, []);
  const expandStadium = useCallback(() => {
    setCareer(prev => (prev ? expandGround(prev) ?? prev : prev));
  }, []);
  /* Round 200: the commercial desk. Round 467: it negotiates, and it signs
     the offer as it stands on the desk, pushes and bad brands included. */
  const takeSponsor = useCallback((offerId: string) => {
    setCareer(prev => (prev ? acceptSponsor(prev, offerId) ?? prev : prev));
  }, []);
  const pushSponsorOffer = useCallback((offerId: string) => {
    setCareer(prev => (prev ? pushSponsor(prev, offerId) ?? prev : prev));
  }, []);
  /* Round 467: the facilities desk. */
  const buyFacility = useCallback((id: FacilityId) => {
    setCareer(prev => (prev ? upgradeClubFacility(prev, id) ?? prev : prev));
  }, []);
  /* Round 471: the staff desk. Four posts, and the rival on the phone. */
  const appointStaff = useCallback((post: StaffPostId, candidateId: string) => {
    setCareer(prev => (prev ? hireStaff(prev, post, candidateId) ?? prev : prev));
  }, []);
  const payOffStaff = useCallback((post: StaffPostId) => {
    setCareer(prev => (prev ? sackStaff(prev, post) ?? prev : prev));
  }, []);
  const matchStaff = useCallback(() => {
    setCareer(prev => (prev ? matchStaffOffer(prev) ?? prev : prev));
  }, []);
  const letStaffGo = useCallback(() => {
    setCareer(prev => (prev ? releaseToPoacher(prev) ?? prev : prev));
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

  /* Round 504: secondHalf is the FINISH of a live match now. The classic half
     time screen still calls it straight from the break (the whistle draws the
     second half itself), and the live viewer calls it when its clock reaches
     90 on a second half that startSecondHalfLive already drew. */
  const secondHalf = useCallback(() => {
    if (!career) return;
    const res = resumeMatch(career);
    setCareer(res.state);
    if (res.report) {
      // Round 157: a finished match counts toward today, mid-season included.
      recordActivity('/club-manager', currentSeasonScore(res.state));
      recordStreakDay('/club-manager');
      setReport(res.report);
      setPhase('matchResult');
    } else {
      setPhase('hub');
    }
  }, [career]);

  /* Round 504: the second half is drawn when you send them back out, so the
     viewer walks football that is already decided and a change in the 70th
     minute has something to redraw. */
  const startSecondHalfLive = useCallback(() => {
    setCareer(prev => (prev ? startSecondHalf(prev) ?? prev : prev));
  }, []);

  /* Round 504: a sub or a shape change at any minute of a live match. The
     engine keeps everything at or before that minute and redraws the rest of
     the half off the eleven and the shape you just chose. */
  const changeAt = useCallback((minute: number, change: LiveChange) => {
    setCareer(prev => (prev ? changeLive(prev, minute, change) ?? prev : prev));
  }, []);

  /* Round 504: where the clock stands, so a save closed in the 30th minute
     opens again in the 30th rather than at the last change. The viewer calls
     it at the interval and when the page is hidden, never on a tick, because
     every career write goes to localStorage. The engine hands back the same
     object when nothing moves, so React skips the write. */
  const markMinute = useCallback((minute: number) => {
    setCareer(prev => (prev ? markLiveMinute(prev, minute) : prev));
  }, []);

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
    simToWeek,
    phase, career, report, summary, activeTab, setActiveTab, pendingClub,
    market, nextFx, tableRows, myPosition, facts,
    resume, startNew, chooseClub, confirmClub, confirmCustomClub,
    setFormationIndex, setMentality, setXiSlot, swapXiSlots, autoPick,
    setSlotDuty, assignSetPiece, autoPickSetPieces, retrain, stopRetrain,
    play, quickPlay, continueFromReport, nextSeason,
    buy,
    negotiate, offer, walk, answerApproach, setTickets, setConcessions, expandStadium, takeSponsor, pushSponsorOffer, buyFacility, waitAWeek, takeJob, acceptNation, resignNation, dismissNegotiation, clause, loan,
    appointStaff, payOffStaff, matchStaff, letStaffGo,
    acceptIncomingBid, rejectIncomingBid,
    setStatus, loanOut, renew, renewWithClause, setRole,
    upgradeFacility, sendScout, callScoutHome, promote, release, setTraining,
    subAtHalftime, shapeAtHalftime, secondHalf, startSecondHalfLive, changeAt, markMinute,
    talk, halftimeTalk, sayIt, sendAssistant,
    answer,
  };
}

export type ClubManagerGame = ReturnType<typeof useClubManager>;
