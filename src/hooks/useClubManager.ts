import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { recordCompletion, recordActivity, recordStreakDay } from '@/lib/completions';
import { saveMatchPlan as savePlan, applyMatchPlan as applyPlan, deleteMatchPlan as deletePlan } from '@/lib/clubManagerMatchPlans';
import {
  CareerState, MatchWeekReport, SeasonSummary, MarketPlayer, Mentality,
  FORMATIONS, startCareer, playNextEntry, finishSeason, startNextSeason,
  buildMarket, buyPlayer, autoPickXI, nextFixture, sortedLeagueTable,
  leaguePosition, currentSeasonScore, saveCareer, loadCareer, clearCareer, savedCareerEraId, savedCareerFixtureKey, leagueOf,
  startNegotiation, makeOffer, offerTerms, exerciseLoanOption, breakLoan, recallLoanedPlayer, walkAway, respondApproach, expandGround,
  enterWilderness, wildernessWeek, acceptWildernessJob, takeNationJob, leaveNationJob, payClause, loanIn, acceptBid, rejectBid,
  answerMessage, setTransferStatus, loanOutPlayer, renewContract, renewContractWithClause,
  upgradeAcademy, hireScout, recallScout, promoteProspect, releaseProspect, setTrainingPlan,
  resumeMatch, makeHalftimeSub, setHalftimeMentality, setSquadRole,
  setTeamTalk, giveHalftimeTalk, answerPress, duckPress,
  matchFacts,
  changeLive, startSecondHalf, startExtraTime, markLiveMinute,
  setDuty, dutyOptions, dutyLineOf, pitchLineOf, setSetPiece, autoSetPieces, startRetraining, stopRetraining,
  setShootoutOrder,
  DEFAULT_ERA_ID,
  releasePlayer, signFreeAgent,
  doorRefusal, loanOutRefusal,
  applyForJob, joinClubInSummer,
  editManager,
} from '@/lib/clubManager';
import type { MarketDoor } from '@/lib/clubManager';
import type { MatchFacts, LiveChange, Duty, SetPieceKey, Formation, FormationSlot } from '@/lib/clubManager';
import type { Position } from '@/types/game';
import type { TransferStatus, FacilityKind, TrainingPlan, SquadRole, TalkTone, DealExtras } from '@/lib/clubManager';
import type { NextFixtureInfo, TableRow, CustomClubSpec, ManagerSpec, ManagerEdit } from '@/lib/clubManager';
import { simToWeek as runSimToWeek, startMidSeason, joinClubNow } from '@/lib/clubManagerCalendar';
import { CM_VAR_LIVE } from '@/lib/clubManagerVarLive';
import { eraById, eraRostersLoaded, ensureEraRosters, isHistoricEra } from '@/lib/clubManagerEras';
import { ensureRealLeagueFixtures, realLeagueFixturesLoaded, realLeagueFixtureKeyFor } from '@/lib/clubManagerFixtures';
import { reloadToRetryChunk } from '@/lib/freshBuild';
import { readSlots, switchSlot, deleteSlot, activeSlot, type SlotView } from '@/lib/clubManagerSlots';
import type { MidSeasonEntry } from '@/lib/clubManagerCalendar';
import { upgradeFacility as upgradeClubFacility } from '@/lib/clubManagerFacilities';
import type { FacilityId } from '@/lib/clubManagerFacilities';
import type { PersonalTerms } from '@/lib/clubManagerDeals';
import { acceptSponsor, pushSponsor, setConcessionTier, setTicketPolicy } from '@/lib/clubManagerFinances';
import type { ConcessionTier } from '@/lib/clubManagerFinances';
import { hireStaff, matchStaffOffer, releaseToPoacher, sackStaff } from '@/lib/clubManagerStaff';
import type { StaffPostId } from '@/lib/clubManagerStaff';
import { spendSkillPoint } from '@/lib/clubManagerXp';
import { setStartOption } from '@/lib/clubManagerStart';
import { validWorldEdit } from '@/lib/clubManagerWorldEdit';
import type { CurrencyCode } from '@/lib/clubManagerStart';
import type { SkillTree } from '@/lib/clubManagerXp';

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

/** Round 1225: the key of the real fixture list a new career at this club would open on, or null. */
function startFixtureKey(clubName: string, eraId: string): string | null {
  return isHistoricEra(eraId) ? null : realLeagueFixtureKeyFor(leagueOf(clubName).id, eraById(eraId).startYear);
}

export function useClubManager() {
  const [phase, setPhase] = useState<CMPhase>('boot');
  const [career, setCareer] = useState<CareerState | null>(null);
  const [report, setReport] = useState<MatchWeekReport | null>(null);
  const [summary, setSummary] = useState<SeasonSummary | null>(null);
  const [activeTab, setActiveTab] = useState<HubTab>('overview');
  const [pendingClub, setPendingClub] = useState<string | null>(null);

  /* Round 832: the label of an era whose squads would not load at boot, or
     null. An era save cannot be played without its squads. loadCareer can
     still hand one back without them (the review opened a 2005, a 2010 and a
     2015 save that way: its repairs did not happen to read the squads), and
     the first screen or match that does read them then throws; a repair that
     does read them makes loadCareer answer "no save". Either way the career
     must not open early, so the page holds on a plain notice with a retry
     instead of a crash or a fresh start over the career. */
  const [bootError, setBootError] = useState<string | null>(null);
  const [bootTry, setBootTry] = useState(0);
  /* Round 1225: what would not load, the season's squads or its real fixture list. */
  const [bootNoun, setBootNoun] = useState<'squads' | 'fixture list'>('squads');
  const retryBoot = useCallback(() => setBootTry(n => n + 1), []);

  /* Round 928: the three manager slots, as read off the store without opening
     a save, and a note when a swap was refused. slotEpoch reruns the boot
     below after a swap, so the incoming career opens through the very same
     path a page load takes (its era's squads first). goStraightIn is set by
     Continue on a parked slot, so that career opens on its hub rather than
     back on the slots screen. */
  const [slots, setSlots] = useState<SlotView[]>([]);
  const [slotNote, setSlotNote] = useState<string | null>(null);
  const [slotEpoch, setSlotEpoch] = useState(0);
  const goStraightIn = useRef(false);
  /* Round 928 review: the slot whose career this page holds. Another tab can
     switch managers under it, and then the index names another slot and
     SAVE_KEY holds that slot's career, whose parked copy the swap has already
     dropped. Every write this page makes (the effect, pagehide, unmount, a
     tab switch, a swap of its own) checks the index against this first, and
     a page whose slot has moved writes nothing over the other career. */
  const ownSlot = useRef(1);
  const holdsActiveSlot = useCallback(() => activeSlot() === ownSlot.current, []);

  // Boot: look for a saved career and offer to resume it.
  useEffect(() => {
    let alive = true;
    const open = () => {
      ownSlot.current = activeSlot();
      const saved = loadCareer();
      const views = readSlots();
      setSlots(views);
      if (saved) {
        setCareer(saved);
        if (saved.pendingSummary) setSummary(saved.pendingSummary);
        if (goStraightIn.current) {
          goStraightIn.current = false;
          setPhase(saved.sacked ? 'sacked' : saved.pendingSummary ? 'seasonEnd' : 'hub');
          setActiveTab('overview');
        } else {
          setPhase('resume');
        }
      } else if (views.some(v => v.summary)) {
        /* Round 928: nothing playable in the active slot, but another slot
           holds a career, so the slots screen, never a picker over them. A
           career the player just asked for that would not open says so,
           rather than dropping him back on the tiles without a word. */
        if (goStraightIn.current) setSlotNote('That career would not open on this version of the game. It is still saved in its slot, and your other managers are fine.');
        goStraightIn.current = false;
        setPhase('resume');
      } else {
        goStraightIn.current = false;
        setPhase('clubSelect');
      }
    };
    /* Round 832: an era save fetches its era's squads first. Today's world
       and an era already here open exactly as before, in this same pass. */
    const eraId = savedCareerEraId() ?? undefined;
    /* Round 1225: and a save whose first season plays a real fixture list
       fetches that list first, in the same wait. The Premier League's list
       rides with the engine, so nothing changes for it. */
    const fixtureKey = savedCareerFixtureKey();
    if (eraRostersLoaded(eraId) && realLeagueFixturesLoaded(fixtureKey)) {
      open();
      return;
    }
    setBootError(null);
    Promise.all([ensureEraRosters(eraId), ensureRealLeagueFixtures(fixtureKey)]).then(
      () => { if (alive) open(); },
      () => {
        if (!alive) return;
        /* Round 832 review: a retry the player asked for reloads the page,
           because Chromium never fetches a failed chunk again in the same
           page (see reloadToRetryChunk). The first failure only shows the
           notice; offline, the notice stays. */
        if (bootTry > 0 && reloadToRetryChunk()) return;
        setBootNoun(eraRostersLoaded(eraId) ? 'fixture list' : 'squads');
        setBootError(eraById(eraId).label);
      },
    );
    return () => { alive = false; };
  }, [bootTry, slotEpoch]);

  /* Round 634: whether the last write was refused. saveCareer swallowed every
     throw until this round, so a browser out of storage for this site, or one
     blocking it, dropped the career on the floor and the player was told
     nothing ("Manager career doesnt save if you leave the website", filed
     2026-09-13). True from the first refused write until one succeeds, and
     the page shows a plain banner while it is true. */
  const [saveFailed, setSaveFailed] = useState(false);
  const note = useCallback((ok: boolean) => setSaveFailed(!ok), []);
  /* Round 634 review: why the last press on the transfer desk did nothing, in
     the engine's own words (doorRefusal, loanOutRefusal), or null when it went
     through. A refused press used to be a dead button. */
  const [deskNote, setDeskNote] = useState<string | null>(null);

  // Persist the career on every change.
  useEffect(() => {
    if (!career) return;
    if (!holdsActiveSlot()) {
      /* Round 928 review: another tab switched managers. This career was
         parked by that switch, as it stood at its last write, so nothing is
         lost by not writing it; writing it would put it over the other one.
         The page goes back to the slots, as read now, and says why. */
      setCareer(null);
      setReport(null);
      setSummary(null);
      setPendingClub(null);
      setDeskNote(null);
      setSlots(readSlots());
      setSlotNote('You switched managers in another tab, so this one has stepped back to your managers. Pick one to carry on.');
      setPhase('resume');
      return;
    }
    note(saveCareer(career));
  }, [career, note, holdsActiveSlot]);

  /* ---------- Round 567: and persist it when the page goes away ---------- */

  /*
   * The effect above is the ordinary write and it is reliable for everything
   * done while the page is up: measured across 23 transitions (a club chosen,
   * a shape, an XI, a training plan, a role, a transfer status, a ticket
   * price, a negotiation, a signing, a match, a half time, a quick sim, a run
   * of weeks) the save on disk was byte identical to the career in memory
   * after every single one.
   *
   * What it cannot do is write a change that is decided at the moment the page
   * is going. A setCareer from a pagehide listener, a visibilitychange
   * listener or an unmount cleanup is a state update on a tree React is
   * tearing down: it never commits, so the effect keyed on `career` never
   * runs, so nothing reaches localStorage.
   *
   * That is not hypothetical. Round 543 added exactly such a handler to the
   * live match viewer for the clock, for the case it names in its own comment,
   * "tapping Back, or the DoUKnowBall logo, or any nav link". Measured on the
   * shipped code: the viewer on screen in the 19th minute, the save still at
   * minute 0, and still at 0 after the route unmounted, so the half was
   * replayed from the start. It worked only when the viewer alone unmounted
   * and the page stayed, which is the one case it was not written for.
   *
   * So the career is readable synchronously here, and the write at that moment
   * goes straight to localStorage rather than through a render.
   */
  const careerRef = useRef<CareerState | null>(null);
  useEffect(() => { careerRef.current = career; }, [career]);

  useEffect(() => {
    /* Round 634: the same write, and it reports. A refused write at pagehide
       cannot reach the screen (the page is going), but one at a tab switch
       can, and the banner is there when the tab comes back. Same career,
       same bytes, so a write that repeats the effect's own is harmless. */
    /* Round 928 review: and never once another tab has switched managers
       (holdsActiveSlot): closing this page must not write its career over
       the one that tab switched in. */
    const write = () => { const c = careerRef.current; if (c && holdsActiveSlot()) note(saveCareer(c)); };
    const onHidden = () => { if (document.visibilityState === 'hidden') write(); };
    window.addEventListener('pagehide', write);
    document.addEventListener('visibilitychange', onHidden);
    return () => {
      window.removeEventListener('pagehide', write);
      document.removeEventListener('visibilitychange', onHidden);
      /* Leaving the route is the same event as leaving the site as far as this
         hook is concerned: both end with no render left to run. Writing the
         career it is holding costs one localStorage write and closes the gap
         between a commit and the passive effect that would have saved it. */
      write();
    };
  }, []);

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

  /* ---------- Round 928: the manager slots ---------- */

  /* The career in memory is written before anything moves, and handed to the
     swap as the copy to park, so the parked career is the freshest one. Then
     careerRef is emptied synchronously, for Round 567's reason: the pagehide
     write must never put the outgoing career back over the incoming one.
     Review: a page whose slot another tab has moved hands nothing in, so the
     swap parks what SAVE_KEY really holds (that tab's career) under the slot
     it really belongs to. */
  const leaveActive = useCallback((slot: number): boolean => {
    const out = holdsActiveSlot() ? careerRef.current : null;
    if (out) saveCareer(out);
    if (!switchSlot(slot, out)) {
      setSlotNote('This browser would not save the switch, so nothing moved. Your managers are all where they were. Free up some site storage and try again.');
      setSlots(readSlots());
      return false;
    }
    ownSlot.current = slot;
    setSlotNote(null);
    careerRef.current = null;
    setCareer(null);
    setReport(null);
    setSummary(null);
    setPendingClub(null);
    /* Review: the transfer desk's last refusal was about the outgoing club. */
    setDeskNote(null);
    return true;
  }, [holdsActiveSlot]);

  /* Review: once another tab has switched managers, the career this page
     holds sits parked in its slot as of its last write, so the copy in memory
     is let go. Kept, its week and board were shown on the other career's tile. */
  const letGoIfStale = useCallback(() => {
    if (!careerRef.current || holdsActiveSlot()) return;
    careerRef.current = null;
    setCareer(null);
    setReport(null);
    setSummary(null);
  }, [holdsActiveSlot]);

  /* Review: the managers screen follows a change another tab makes to the
     slots, so its tiles never offer what is no longer there. Only while it is
     on screen, since every career write in another tab fires this. */
  useEffect(() => {
    if (phase !== 'resume') return;
    const onStorage = () => { letGoIfStale(); setSlots(readSlots()); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [phase, letGoIfStale]);

  /** Continue a slot's career. The active one opens straight away; a parked
   *  one is swapped in and opened through the boot, era squads first. */
  const openSlot = useCallback((slot: number) => {
    if (slot === activeSlot() && holdsActiveSlot() && career) { resume(); return; }
    if (!leaveActive(slot)) return;
    goStraightIn.current = true;
    setPhase('boot');
    setSlotEpoch(n => n + 1);
  }, [career, resume, leaveActive, holdsActiveSlot]);

  /** A new manager in an empty slot: the current career is parked, and the
   *  picker starts a fresh one that lands in this slot. */
  const newInSlot = useCallback((slot: number) => {
    /* Only ever an empty or unreadable slot: a career is deleted on purpose,
       behind the screen's confirm, never by starting over it. */
    if (readSlots()[slot - 1]?.summary) {
      /* Review: only a tile drawn before another tab filled this slot gets
         here. Show the slots as they are now and say why nothing happened. */
      setSlots(readSlots());
      setSlotNote('That slot holds a career now, so nothing was started over it. Here are your managers as they stand.');
      return;
    }
    if (slot !== activeSlot() && !leaveActive(slot)) return;
    /* Clears the engine's registrations; SAVE_KEY is already empty for a
       slot just switched to, and a damaged active one is cleared for good
       (the screen asks first). The career the picker starts is this slot's. */
    clearCareer();
    ownSlot.current = slot;
    careerRef.current = null;
    setCareer(null);
    setDeskNote(null);
    setSlots(readSlots());
    setPhase('clubSelect');
  }, [leaveActive]);

  /** Delete one slot's career for good (the screen asks first). */
  const removeSlot = useCallback((slot: number) => {
    if (slot === activeSlot()) {
      clearCareer();
      ownSlot.current = slot;
      careerRef.current = null;
      setCareer(null);
      setReport(null);
      setSummary(null);
    } else {
      deleteSlot(slot);
    }
    const views = readSlots();
    setSlots(views);
    setSlotNote(null);
    if (!views.some(v => v.summary || v.damaged)) setPhase('clubSelect');
  }, []);

  /** Back to the slots screen from inside a career, or from an era whose
   *  squads would not load (review: that screen had no way back). */
  const showSlots = useCallback(() => {
    if (careerRef.current && holdsActiveSlot()) saveCareer(careerRef.current);
    letGoIfStale();
    setBootError(null);
    setSlots(readSlots());
    setSlotNote(null);
    setPhase('resume');
  }, [holdsActiveSlot, letGoIfStale]);

  /* Retire at the season's end, or Start New Career once sacked. Before
     Round 928 both wiped the career in one tap; the review found they still
     did after the slots came in, which is exactly what the round promised
     would stop. Now the career stays in its slot (Delete on the managers
     screen is the only way to end one for good) and the new one starts in an
     empty slot. With all three taken, the managers screen says so. */
  const startNew = useCallback(() => {
    const empty = readSlots().find(v => !v.summary && !v.damaged);
    if (empty) { newInSlot(empty.slot); return; }
    showSlots();
    setSlotNote('All three slots hold a career. Delete one you are done with to make room for a new manager.');
  }, [newInSlot, showSlots]);

  /* Round 1225: a league with a real first season fixture list keeps it in a
     small file of its own. The page asks for it when a club is tapped (it
     passes the picked era), while the dugout step is on screen, so the career
     starts on it without a wait. fixtureFetch is that fetch while it is out. */
  const fixtureFetch = useRef<{ key: string; done: Promise<void> } | null>(null);
  const chooseClub = useCallback((clubName: string, eraId?: string) => {
    setPendingClub(clubName);
    const key = clubName && eraId ? startFixtureKey(clubName, eraId) : null;
    fixtureFetch.current = key && !realLeagueFixturesLoaded(key) ? { key, done: ensureRealLeagueFixtures(key).catch(() => undefined) } : null;
  }, []);

  /* Round 132: the era rides in from the picker. Nothing passed means the
     current era, which is the world this game has always started in.
     Round 303: the optional manager spec rides the same way; absent means
     the second person career this has always been. */
  /* Round 964: and so does a world editor edit, null or absent for the real world.
     It passes validWorldEdit on the way in, so an edit the editor could not
     have made (a club in two leagues, a league the wrong size) starts the
     real world rather than a broken one. */
  const confirmClub = useCallback((eraId?: string, manager?: ManagerSpec, entry?: MidSeasonEntry, worldEdit?: Record<string, string[]> | null) => {
    if (!pendingClub) return;
    const club = pendingClub, era = eraId ?? DEFAULT_ERA_ID, edit = validWorldEdit(worldEdit ?? null);
    const begin = () => {
      const fresh = startCareer(club, era, undefined, manager, undefined, edit);
      /* Round 549: a mid season takeover plays the run-in first, under the
         manager before you, and hands the club over where it stands. */
      const s = entry ? startMidSeason(fresh, entry) : fresh;
      setCareer(s);
      setActiveTab('overview');
      setPhase('hub');
    };
    /* Round 1225: startCareer opens a career on its league's real list only
       when that list is here. It nearly always is (the club tap asked for
       it). When that fetch is still out, wait for it on the loading screen: a
       fetch that fails, or one still out after eight seconds, starts the
       career on generated fixtures, which is what the calendar then says. A
       caller that never asked for the list (a test that drives this hook taps
       a club with no era) starts at once, on generated fixtures, exactly as
       before this round. */
    const fixtureKey = edit ? null : startFixtureKey(club, era);
    const fetching = fixtureFetch.current;
    if (!fixtureKey || realLeagueFixturesLoaded(fixtureKey) || !fetching || fetching.key !== fixtureKey) { begin(); return; }
    setPhase('boot');
    let begun = false;
    const beginOnce = () => { if (!begun) { begun = true; begin(); } };
    fetching.done.then(beginOnce);
    setTimeout(beginOnce, 8000);
  }, [pendingClub]);

  /* Round 154: founding your own club skips the pending-club dance, because
     the create form is its own confirmation. */
  const confirmCustomClub = useCallback((eraId: string | undefined, spec: CustomClubSpec, manager?: ManagerSpec, entry?: MidSeasonEntry) => {
    const fresh = startCareer(spec.name, eraId ?? DEFAULT_ERA_ID, spec, manager);
    const s = entry ? startMidSeason(fresh, entry) : fresh;
    setCareer(s);
    setPendingClub(null);
    setActiveTab('overview');
    setPhase('hub');
  }, []);

  /* ---------- tactics ---------- */
  const saveMatchPlan = useCallback((slot: number, name: string) => {
    if (phase !== 'hub' || !holdsActiveSlot()) return false;
    if (!career || savePlan(career, slot, name) === career) return false;
    setCareer(prev => prev ? savePlan(prev, slot, name) : prev);
    return true;
  }, [career, phase, holdsActiveSlot]);

  const applyMatchPlan = useCallback((slot: number) => {
    if (phase !== 'hub' || !holdsActiveSlot()) return false;
    if (!career || applyPlan(career, slot) === career) return false;
    setCareer(prev => prev ? applyPlan(prev, slot) : prev);
    return true;
  }, [career, phase, holdsActiveSlot]);

  const deleteMatchPlan = useCallback((slot: number) => {
    if (phase !== 'hub' || !holdsActiveSlot()) return false;
    if (!career || deletePlan(career, slot) === career) return false;
    setCareer(prev => prev ? deletePlan(prev, slot) : prev);
    return true;
  }, [career, phase, holdsActiveSlot]);

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

  /** Round 782: the shootout order, player ids in kicking order; an empty list clears it. A bad id leaves the save alone. */
  const setShootoutOrderIds = useCallback((ids: string[]) => {
    setCareer(prev => (prev ? setShootoutOrder(prev, ids) ?? prev : prev));
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
    const res = playNextEntry(career, { skipHalftime, ...(CM_VAR_LIVE ? { varReviews: true } : {}) });
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
    const run = runSimToWeek(career, targetWeek, CM_VAR_LIVE ? { varReviews: true } : undefined);
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
  /* Round 634 review: read off the career the player is looking at (the last
     commit), which is the one his press was made against. */
  const explain = useCallback((mp: MarketPlayer, door: MarketDoor) => {
    const now = careerRef.current;
    setDeskNote(now ? doorRefusal(now, mp, door) : null);
  }, []);

  const buy = useCallback((mp: MarketPlayer) => {
    explain(mp, 'buy');
    setCareer(prev => {
      if (!prev) return prev;
      const next = buyPlayer(prev, mp);
      return next ?? prev;
    });
  }, [explain]);

  /* Round 141: the instant sell action is gone. Selling is: transfer list
     him (setTransferStatus), let bids arrive, accept one (acceptBid below).
     The owner asked for exactly this: offers or nothing. */

  /* ---------- Round 71: negotiations, clauses, loans, incoming bids ---------- */
  const negotiate = useCallback((mp: MarketPlayer) => {
    explain(mp, 'talk');
    setCareer(prev => (prev ? startNegotiation(prev, mp) ?? prev : prev));
  }, [explain]);

  /* Round 161: an offer can be a package: cash plus add-ons plus a sell-on
     plus a part-exchange player. Extras default to nothing, which is the
     exact deal this hook has always sent. */
  const offer = useCallback((amount: number, extras?: DealExtras) => {
    setCareer(prev => (prev ? makeOffer(prev, amount, extras) ?? prev : prev));
  }, []);

  const walk = useCallback(() => {
    setCareer(prev => (prev ? walkAway(prev) : prev));
  }, []);

  /* Round 506: the second table. A fee being agreed no longer signs anybody,
     so this is the call that actually finishes a transfer. */
  const proposeTerms = useCallback((terms: PersonalTerms) => {
    setCareer(prev => (prev ? offerTerms(prev, terms) ?? prev : prev));
  }, []);

  /* Round 506: the two loan figures agreed when he arrived. */
  const buyLoanee = useCallback((playerId: string) => {
    setCareer(prev => (prev ? exerciseLoanOption(prev, playerId) ?? prev : prev));
  }, []);

  const endLoanEarly = useCallback((playerId: string) => {
    setCareer(prev => (prev ? breakLoan(prev, playerId) ?? prev : prev));
  }, []);

  /* Round 508: bring one of MY loans back early, at the recall figure. */
  const recallLoanee = useCallback((playerId: string) => {
    setCareer(prev => (prev ? recallLoanedPlayer(prev, playerId) ?? prev : prev));
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
  /* Round 514: the three start options. Each one returns null when it would
     change nothing, so `?? prev` leaves the save alone. */
  const setCurrency = useCallback((code: CurrencyCode) => {
    setCareer(prev => (prev ? setStartOption(prev, 'currency', code) ?? prev : prev));
  }, []);
  const setNationJobs = useCallback((on: boolean) => {
    setCareer(prev => (prev ? setStartOption(prev, 'nationJobs', on) ?? prev : prev));
  }, []);
  const setStrictness = useCallback((level: number) => {
    setCareer(prev => (prev ? setStartOption(prev, 'strictness', level) ?? prev : prev));
  }, []);
  /* Round 513: a point into a tree. One way only, so it never needs a refund
     path, and null when there is nothing free to spend. */
  /* Round 965: the Edit manager sheet. editManager returns null on a refused
     edit (a real name, a country the engine does not run, a new background),
     and ?? prev leaves the save alone, the shape every action here uses. */
  const updateManager = useCallback((edit: ManagerEdit) => {
    setCareer(prev => (prev ? editManager(prev, edit) ?? prev : prev));
  }, []);
  const spendPoint = useCallback((tree: SkillTree) => {
    setCareer(prev => (prev ? spendSkillPoint(prev, tree) ?? prev : prev));
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
    explain(mp, 'clause');
    setCareer(prev => (prev ? payClause(prev, mp) ?? prev : prev));
  }, [explain]);

  const loan = useCallback((mp: MarketPlayer) => {
    explain(mp, 'loan');
    setCareer(prev => (prev ? loanIn(prev, mp) ?? prev : prev));
  }, [explain]);

  const acceptIncomingBid = useCallback((playerId: string) => {
    /* Round 634 review: a loan approach goes through loanOutPlayer, so it is
       refused on the same one-a-season rule and says so. */
    const now = careerRef.current;
    const bid = now?.incomingBids?.find(b => b.playerId === playerId);
    setDeskNote(now && bid?.loan ? loanOutRefusal(now, playerId) : null);
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
    const now = careerRef.current;
    setDeskNote(now ? loanOutRefusal(now, playerId) : null);
    setCareer(prev => (prev ? loanOutPlayer(prev, playerId) ?? prev : prev));
  }, []);

  /* ---------- Round 105: contracts ---------- */
  const renew = useCallback((playerId: string) => {
    setCareer(prev => (prev ? renewContract(prev, playerId) ?? prev : prev));
  }, []);

  /* Round 619: end a deal early. The settlement is written on the save and
     keeps counting against the wage cap, so this is not a delete button. */
  const terminate = useCallback((playerId: string) => {
    setCareer(prev => (prev ? releasePlayer(prev, playerId) ?? prev : prev));
  }, []);

  /* Round 619: sign a man with no club. The only signing that works with the
     transfer window shut. */
  const signFree = useCallback((name: string) => {
    setCareer(prev => (prev ? signFreeAgent(prev, name) ?? prev : prev));
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

  /* Round 670: extra time, drawn by the engine when the viewer's clock
     reaches 90 on a level decider, so the viewer walks thirty minutes that are
     already football. The engine refuses (null) when it is not due.
     Round 670 review: the viewer asks at every 90 and this answers on the
     latest save (prev), so a change still on its way when the clock got
     there is part of the answer; the viewer reads it off live.et. */
  const startExtraTimeLive = useCallback(() => {
    setCareer(prev => (prev ? startExtraTime(prev) ?? prev : prev));
  }, []);

  /* Round 504: a sub or a shape change at any minute of a live match. The
     engine keeps everything at or before that minute and redraws the rest of
     the half off the eleven and the shape you just chose. */
  const changeAt = useCallback((minute: number, change: LiveChange, plus?: number) => {
    /* Round 781: and how far into the board it was made, for the line's label. */
    setCareer(prev => (prev ? changeLive(prev, minute, change, plus) ?? prev : prev));
  }, []);

  /* Round 504: where the clock stands, so a save closed in the 30th minute
     opens again in the 30th rather than at the last change. The viewer calls
     it at the interval and when the page is hidden, never on a tick, because
     every career write goes to localStorage. The engine hands back the same
     object when nothing moves, so React skips the write.

     Round 567: and the write happens HERE rather than in the persist effect,
     because three of the four moments this is called are moments the page is
     going away (a pagehide, a tab hidden, the viewer's own unmount cleanup)
     and a state update made then never commits. The state update is still
     made, from the latest state and through the engine's own pure function,
     so nothing about the in-page behaviour changes; the disk write just no
     longer depends on a render that may not happen. */
  const markMinute = useCallback((minute: number) => {
    const now = careerRef.current;
    if (!now) return;
    const next = markLiveMinute(now, minute);
    if (next === now) return;
    careerRef.current = next;
    /* Round 928 review: the live clock of a page whose slot another tab has
       switched must not write over the career that tab switched in. */
    if (holdsActiveSlot()) saveCareer(next);
    setCareer(prev => (prev ? markLiveMinute(prev, minute) : prev));
  }, [holdsActiveSlot]);

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
    setCareer(prev => {
      if (!prev) return prev;
      /* Round 783: joining the club that said yes, today, is the mid season
         takeover in clubManagerCalendar.ts rather than an inbox effect, so
         that one answer is routed there. Everything else is the inbox's. */
      const msg = (prev.inbox ?? []).find(m => m.id === messageId);
      if (msg && !msg.resolved && msg.options[optionIdx]?.effect === 'joinNow') return joinClubNow(prev) ?? prev;
      return answerMessage(prev, messageId, optionIdx);
    });
  }, []);

  /* ---------- Round 783: the job hunt ---------- */
  const applyJob = useCallback((club: string) => {
    setCareer(prev => (prev ? applyForJob(prev, club) ?? prev : prev));
  }, []);
  const joinSummer = useCallback(() => {
    setCareer(prev => (prev ? joinClubInSummer(prev) ?? prev : prev));
  }, []);
  const joinNow = useCallback(() => {
    setCareer(prev => (prev ? joinClubNow(prev) ?? prev : prev));
  }, []);

  return {
    simToWeek,
    saveFailed, deskNote, clearDeskNote: () => setDeskNote(null),
    bootError, bootNoun, retryBoot,
    slots, slotNote, openSlot, newInSlot, removeSlot, showSlots,
    phase, career, report, summary, activeTab, setActiveTab, pendingClub,
    market, nextFx, tableRows, myPosition, facts,
    resume, startNew, chooseClub, confirmClub, confirmCustomClub,
    setFormationIndex, setMentality, setXiSlot, swapXiSlots, autoPick,
    saveMatchPlan, applyMatchPlan, deleteMatchPlan,
    setSlotDuty, assignSetPiece, autoPickSetPieces, setShootoutOrder: setShootoutOrderIds, retrain, stopRetrain,
    play, quickPlay, continueFromReport, nextSeason,
    buy,
    negotiate, offer, walk, proposeTerms, buyLoanee, endLoanEarly, recallLoanee, answerApproach, setTickets, setConcessions, expandStadium, takeSponsor, pushSponsorOffer, buyFacility, waitAWeek, takeJob, acceptNation, resignNation, dismissNegotiation, clause, loan,
    appointStaff, payOffStaff, matchStaff, letStaffGo, spendPoint, updateManager,
    setCurrency, setNationJobs, setStrictness,
    acceptIncomingBid, rejectIncomingBid,
    setStatus, loanOut, renew, renewWithClause, terminate, signFree, setRole,
    upgradeFacility, sendScout, callScoutHome, promote, release, setTraining,
    subAtHalftime, shapeAtHalftime, secondHalf, startSecondHalfLive, startExtraTimeLive, changeAt, markMinute,
    talk, halftimeTalk, sayIt, sendAssistant,
    answer,
    applyJob, joinSummer, joinNow,
  };
}

export type ClubManagerGame = ReturnType<typeof useClubManager>;
