import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { Crown, Dumbbell, RotateCcw, Sparkles } from 'lucide-react';
import ShareButtons from '@/components/game/ShareButtons';
/* Round 900: the one board. The NFL, NBA, MLB and NHL careers were four copies
   of this file; what they really differed in is the `sport` this board is
   handed (src/lib/usCareerSport.ts), bound per sport in nflCareerSport.ts and
   its three siblings. This file imports no sport directly, and
   scripts/simUsCareerWeight.mjs holds it to that. It is not yet true that a
   route loads no other sport: the coach career (usCoachCareer.ts through
   usCareerToCoach.ts) still pulls in the NFL engine and the NBA, MLB and NHL
   conquest data on all four routes, as it did before this round.
   Wire a new screen here, once. */
import type { UsCareerCore, UsCareerEvent, UsCareerSeason, UsCareerSport, UsShopItem } from '@/lib/usCareerSport';
import UsCareerProgramme from '@/components/us-career/UsCareerProgramme';
import { expireUsCareerProgramme, prepareUsCareerProgramme, restoreUsCareerProgramme, settleUsCareerProgramme, type ProgrammeCareer } from '@/lib/usCareerProgramme';
// Round 179: real free agency, shared engine and shared screen.
import { pushFaOffer, applyFaSigning, oneYearWindow } from '@/lib/usCareerFreeAgency';
import type { FaWindow } from '@/lib/usCareerFreeAgency';
import FreeAgencyPanel from '@/components/us-career/FreeAgencyPanel';
/* Round 207: the extension talk, shared engine and shared card. */
import { extensionDue, pushExtension, type ExtensionTalk } from '@/lib/usCareerExtension';
import ExtensionCard from '@/components/us-career/ExtensionCard';
// Round 186: the season curtain, shared engine and shared card.
import { buildSeasonReveal, draftPressureLine, type SeasonReveal } from '@/lib/usCareerReveal';
import { SeasonRevealCard } from '@/components/us-career/SeasonRevealCard';
import { UsSeasonCentreEntry } from '@/components/us-career/season/UsSeasonCentreEntry';
import { holdPendingSave } from '@/lib/safeStorage';
/* Round 530: draft day as a moment, and the retirement card on the same
   celebration kit the season curtain uses. */
import DraftDayCard, { type DraftDayFacts } from '@/components/us-career/DraftDayCard';
import USCareerActionConfirm from '@/components/us-career/USCareerActionConfirm';
import UsCareerSaveNotice from '@/components/us-career/UsCareerSaveNotice';
import { CelebrationStyles, revealDelay } from '@/components/club-manager/Celebration';
import { type PlayerAppearance, defaultAppearance } from '@/lib/soccerCareerAppearance';
import PlayerAvatar from '@/components/soccer-career/PlayerAvatar';
import AppearanceBuilder from '@/components/soccer-career/AppearanceBuilder';
import { Confetti } from '@/components/soccer-career/CareerFx';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { markRestoredFinish } from '@/lib/restoredFinish';
import { recordActivity } from '@/lib/completions';
import { useRevealScroll } from '@/hooks/useRevealScroll';
import CoachCareerPanel, { CoachStartCard } from '@/components/us-career/CoachCareerPanel';
import { startCoachCareer, ensureCoachCareer } from '@/lib/usCoachCareer';
import type { CoachCareerState } from '@/lib/usCoachCareer';
/* Round 208: the hub boxes, shared with the front offices and Club
   Manager, and the trophy case they now open onto. */
import { careerHubTiles } from '@/lib/careerHub';
import { HubTiles, HubPanelHeader } from '@/components/hub/HubTiles';
import type { HubTile } from '@/components/hub/HubTiles';
import TrophyCase from '@/components/us-career/TrophyCase';
/* Round 469: the money app, the gram, the rival card and the badges, on the
   same engines Soccer Career runs (careerMoney, careerSocial, careerBadges),
   bound per sport (nflCareerMoney.ts, nflCareerLoop.ts and their siblings). */
import MoneyApp from '@/components/us-career/MoneyApp';
import { SocialGram, RivalCard, BadgeGrid } from '@/components/us-career/SocialPanel';
import type { MoneyAction } from '@/lib/careerMoney';
import { fmtFollowers, pushHeadlines } from '@/lib/careerSocial';
/* Round 521: the inbox and the rivalry events, the same engines the
   flagship runs (careerInbox.ts, careerRivalryEvents.ts), bound per
   sport (nflCareerInbox.ts, nflCareerRivalryEvents.ts and their siblings). */
import { InboxPanel } from '@/components/us-career/InboxPanel';
import { RivalryEventCard } from '@/components/us-career/RivalryEventCard';
/* Round 796: the rival choice card, and the inbox on the sport's own calendar. */
import { RivalryChoiceCard } from '@/components/us-career/RivalryChoiceCard';
import type { RivalryChoiceCard as RivalryChoice } from '@/lib/careerRivalryChoices';
import { cn } from '@/lib/utils';
import ProspectJourney, { ProspectRecord } from '@/components/us-career/ProspectJourney';
import { createUsCareerProspect, loadUsCareerProspect, type UsCareerProspect } from '@/lib/usCareerProspect';
import { loadPreDraft, type PreDraftState } from '@/lib/careerPreDraft';
import { keyedRng } from '@/lib/keyedRng';
import { bankTrainingRating, trainingBankNote, trainingScore, trainingSessionOpen } from '@/lib/careerTraining';
import { buildCareerDecisionOutcome, type CareerDecisionOutcomeData } from '@/lib/usCareerDecisionOutcome';
import CareerDecisionOutcome from '@/components/us-career/CareerDecisionOutcome';
import { answerSummerCard, newSummerSalt, repairSummerOnLoad, seekSummerCard, startSummer, summerOn, summerPlace } from '@/lib/usCareerSummer';
import { answerTalk, endsAfterSeason, manualRetire, pendingTalk, repairHallOnLoad, talkDeckFilter } from '@/lib/usCareerRetirementFlow';
import { stampOnRetirement } from '@/lib/usCareerRetirementFlow';
import { isFarewellSeason, type RetirementChoiceId } from '@/lib/careerRetirement';
import { hallRecordFor, type HallSpeechId } from '@/lib/careerHallOfFame';

const UsCareerPractice = lazy(() => import('@/components/us-career/UsCareerPractice'));
const CareerSeasonReview = lazy(() => import('@/components/us-career/CareerSeasonReview'));
/* Round 1039: the retirement talk, the farewell banner and the Hall card load
   with the moment they belong to; the speech (careerAwardsNight) rides only
   with the Hall card. */
const FarewellCard = lazy(() => import('@/components/career/FarewellCard').then(m => ({ default: m.FarewellCard })));
const FarewellSeasonBanner = lazy(() => import('@/components/career/FarewellCard').then(m => ({ default: m.FarewellSeasonBanner })));
const HallOfFameCard = lazy(() => import('@/components/career/HallOfFameCard').then(m => ({ default: m.HallOfFameCard })));

/* Round 126: 'coach' is new. Retirement used to be the last screen in the
   game. Now it hands you to a job board and the save keeps going.
   Round 179: 'freeagency' is new. An expired deal now opens a real market
   window before the next season instead of a two-button card that the event
   deck might never draw. */
/* Round 207: 'extension' is new. The final year of a deal now opens a
   real fork: sign on, or play it out and reach free agency. */
type Phase = 'create' | 'prospect' | 'season' | 'event' | 'extension' | 'freeagency' | 'retired' | 'coach';

/* The board holds a career as the part every sport keeps. Each sport's own
   fields (its stats, its awards) ride along untouched and are read only by
   the sport's own functions. */
type CareerState = ProgrammeCareer;
type SeasonLine = UsCareerSeason;
type CareerEvent = UsCareerEvent<UsCareerCore>;

interface SaveShape { c: CareerState | null; phase: Phase; teamQuality: number | null; coach?: CoachCareerState | null; prospect?: UsCareerProspect }

/** Round 1144: how long the toast that says a save was refused stays, with its Retry on it. */
const SAVE_TOAST_MS = 10_000;
/** A toast's button is 24 px tall as it comes (measured: 48 by 24). This one is the way to save a
 *  career from a phone, so it gets a thumb's room, the same 44 px the notice's Retry save has. */
const SAVE_TOAST_BUTTON = { height: 44, minWidth: 64, paddingLeft: 14, paddingRight: 14, fontSize: 13 } as const;

export default function UsCareerBoard({ sport }: { sport: UsCareerSport }) {
  const pendingSave = useRef<{ key: string; value: string | null } | null>(null);
  const [saveFailure, setSaveFailure] = useState<'write' | 'remove' | null>(null);
  const saveFailed = saveFailure !== null;
  useEffect(() => {
    if (!saveFailed) return;
    /* Round 1144: the toast carries a Retry of its own. With the Week by week
       viewer open the notice that holds Retry save is under the viewer's
       cover, and the toast was telling the player to use a button he could
       not reach until he closed the viewer. It says Retry, not Retry save, so
       the page never has two buttons of one name. The press keeps the toast
       (the cleanup below takes it back the moment the save goes through), and
       ten seconds instead of four gives him time to read it and press.
       The first sentence is kept word for word (the other lane's driver for
       Round 1084 reads it), so the second line is what makes the words match
       the button they sit next to. */
    const said = toast.error('Your latest changes could not be saved. Stay on this page and use Retry save.', {
      description: 'Retry here does the same thing.',
      duration: SAVE_TOAST_MS,
      action: { label: 'Retry', onClick: event => { event.preventDefault(); retrySave(); } },
      actionButtonStyle: SAVE_TOAST_BUTTON,
    });
    /* Release AN: the words are taken back the moment they stop being true.
       A Retry save that worked left them on screen for the rest of their few
       seconds, saying the changes could not be saved, and they followed the
       player to Home and back, where nothing is pending and there is no Retry
       button to use. */
    return () => { toast.dismiss(said); };
  }, [saveFailed]);
  const [phase, setPhase] = useState<Phase>('create');
  const [prospect, setProspect] = useState<UsCareerProspect | null>(null);
  const prospectRef = useRef<UsCareerProspect | null>(null);
  const [prospectNotice, setProspectNotice] = useState('');
  const focusCareerEntry = useRef(false);
  const careerEntryButton = useRef<HTMLButtonElement>(null);
  // Round 56: build your player's face before the draft
  const [appearance, setAppearance] = useState<PlayerAppearance>(() => defaultAppearance());
  // Round 85: the tile rule. The season hub is boxes; each opens its own screen.
  const [panel, setPanel] = useState<'none' | 'bank' | 'stats' | 'log' | 'trophies' | 'news' | 'inbox'>('none');
  const [retiredReview, setRetiredReview] = useState(false);
  const reviewReturn = useRef<'log' | 'retired' | null>(null);
  const reviewHubIndex = useRef(0);
  const hubButtons = useRef<HTMLDivElement>(null);
  const retiredReviewButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!reviewReturn.current) return;
    const target = reviewReturn.current === 'retired' ? retiredReviewButton.current
      : hubButtons.current?.querySelectorAll<HTMLButtonElement>('button')[reviewHubIndex.current];
    target?.focus({ preventScroll: true });
    reviewReturn.current = null;
    if (!target) return;
    const frame = requestAnimationFrame(() => {
      const box = target.getBoundingClientRect();
      if (box.top < 0 || box.bottom > window.innerHeight) target.scrollIntoView({
        block: 'nearest', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [panel, retiredReview]);
  /* Round 469: the News box opens on three screens, the paper, the gram and
     the rival, so the hub keeps its five boxes (simCareerHub holds that). */
  const [newsTab, setNewsTab] = useState<'headlines' | 'fans' | 'rival'>('headlines');
  const [career, setCareer] = useState<CareerState | null>(null);
  const careerEntryScreen = useRevealScroll<HTMLDivElement>(career?.prospect?.seed, { enabled: phase === 'season' && !!career?.prospect && career.seasons.length === 0 });
  useEffect(() => {
    if (phase === 'season' && focusCareerEntry.current) {
      focusCareerEntry.current = false;
      careerEntryButton.current?.focus({ preventScroll: true });
    }
  }, [phase]);
  const [practiceOpen, setPracticeOpen] = useState(false);
  const practiceBankedRef = useRef(false);
  const practiceButtonRef = useRef<HTMLButtonElement>(null);
  const [teamQuality, setTeamQuality] = useState<number | null>(null);
  const [nameInput, setNameInput] = useState('');
  /* Round 172: which league you are drafted into. */
  const [eraId, setEraId] = useState<string>('now');
  const [pos, setPos] = useState<string>(sport.create.defaultPos);
  const [archetypeId, setArchetypeId] = useState(sport.create.archetypes[sport.create.defaultPos][0].id);
  const [feed, setFeed] = useState<string[]>([]);
  const [pendingEvent, setPendingEvent] = useState<CareerEvent | null>(null);
  const [decisionOutcome, setDecisionOutcome] = useState<CareerDecisionOutcomeData | null>(null);
  const consumedEvent = useRef<CareerEvent | null>(null);
  /* Round 1038: the summer slot ('year:at') the last answer spent, so a
     double tap can never apply two cards of one summer. */
  const consumedSlot = useRef<string | null>(null);
  const decisionReturn = useRef(false);
  useEffect(() => {
    if (phase !== 'season') {
      setDecisionOutcome(null);
      decisionReturn.current = false;
    }
  }, [phase]);
  useEffect(() => {
    if (decisionOutcome || !decisionReturn.current) return;
    decisionReturn.current = false;
    const target = careerEntryButton.current;
    target?.focus({ preventScroll: true });
    if (!target) return;
    const frame = requestAnimationFrame(() => {
      const box = target.getBoundingClientRect();
      if (box.top < 0 || box.bottom > window.innerHeight) target.scrollIntoView({
        block: 'nearest', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [decisionOutcome]);
  const [lastLine, setLastLine] = useState<SeasonLine | null>(null);
  /* Round 179: the open market. Not persisted on purpose: a reload lands on
     the season hub and the next Play click rebuilds a fresh window, the same
     way a pending event has always redrawn. */
  const [faWindow, setFaWindow] = useState<FaWindow | null>(null);
  /* Round 207: the extension on the table. Transient like the trade
     talks it borrows its single-push rule from: a reload ends the
     conversation and pressing Play opens a fresh one. */
  const [extTalk, setExtTalk] = useState<ExtensionTalk | null>(null);
  /* Set when you have turned an extension down, so the same season
     does not ask twice. Cleared the moment a season is actually played. */
  const extDeclinedRef = useRef(false);
  const [talkLine, setTalkLine] = useState<string | null>(null);
  /* Round 186: the season curtain. Transient like the market window: never
     persisted, so a reload mid-reveal opens on the save's real screen. */
  const [reveal, setReveal] = useState<SeasonReveal | null>(null);
  /* Round 530: draft day. The same three strings create() pushes into the
     feed, held for the card until the first season is played. Transient
     like the curtain: a reload lands on the plain hub. */
  const [draftDay, setDraftDay] = useState<DraftDayFacts | null>(null);
  /* Round 530 review: which inbox rows this save has already shown. It lives
     here rather than in InboxPanel because the panel is mounted only while the
     inbox tab is open, so a set inside it started empty on every open and
     replayed the whole list with nothing new in it. */
  const inboxSeenRef = useRef<Set<string>>(new Set());
  /* Round 796: what a rival choice did, shown on the card until Continue.
     Transient like the curtain: the answer is already on the save, so a
     reload lands on the hub with the choice made. */
  const [rivalryOutcome, setRivalryOutcome] = useState<{ card: RivalryChoice; choiceIdx: number; line: string } | null>(null);
  /* Round 126: the coaching career. It lives in a ref as well as in state so
     persist can always write the current one without every existing call site
     having to learn about it. */
  const [coach, setCoach] = useState<CoachCareerState | null>(null);
  const [coachFeed, setCoachFeed] = useState<string[]>([]);
  const coachRef = useRef<CoachCareerState | null>(null);
  // Round 61: the owner's no scroll rule. When a new crossroads or a new
  // season result lands, it pulls itself into view instead of rendering
  // below the fold where a phone player never sees it.
  const revealRef = useRevealScroll<HTMLDivElement>(
    `${phase}:${pendingEvent?.id ?? ''}:${career?.seasons.length ?? 0}`,
  );

  /* Round 470: opening a hub box is a new screen, so it obeys the owner's no
     scroll rule like every other one. Measured on a 390 by 844 phone before
     this line existed: tapping News from the bottom of the hub left the page
     at scrollY 443 with the panel's own back button 246px above the fold, so
     the player landed underneath the screen he had just opened. The hook does
     nothing when the top of the panel is already readable. */
  const panelRef = useRevealScroll<HTMLDivElement>(`${panel}:${newsTab}`);

  /* Round 643: the coaching career comes after retirement, so it is still a
     finished playing career. With done on the retired screen alone, every
     Resume coaching then Back went false then true and paid the whole legacy
     again. The same shape in all four My Career boards. */
  const done = phase === 'retired' || phase === 'coach';
  useGameCompletion(sport.gameSlug, done, career ? sport.legacyOf(career).score : 0);
  /* Round 1039: the Hall record is derived (src/lib/careerHallOfFame.ts says
     why), so a retired save from before the bind gets its ballot on its next
     visit. hallLanded holds the Hall pill and the confetti until the card's
     last ballot has landed; hallFolded is Continue on that card. */
  const hallRecord = useMemo(
    () => (phase === 'retired' && career?.retired && sport.hall ? hallRecordFor(sport.hall, career) : null),
    [phase, career, sport],
  );
  const [hallLanded, setHallLanded] = useState(false);
  const [hallFolded, setHallFolded] = useState(false);
  useEffect(() => { setHallLanded(false); setHallFolded(false); }, [sport, career?.name, career?.retired]);

  useEffect(() => {
    pendingSave.current = null;
    setSaveFailure(null);
    setDecisionOutcome(null);
    consumedEvent.current = null;
    decisionReturn.current = false;
    try {
      const raw = localStorage.getItem(sport.saveKey);
      if (!raw) return;
      const s = JSON.parse(raw) as SaveShape;
      if (!s.c) {
        if (s.phase === 'prospect') {
          const pending = loadUsCareerProspect(sport, s.prospect);
          if (pending) {
            prospectRef.current = pending;
            setProspect(pending);
            setPhase('prospect');
          } else setProspectNotice('This prospect save is incomplete. Create a new prospect to play again.');
        }
        return;
      }
      /* Round 182, repair-on-load: a pre-182 career was a de facto starter. */
      if (!s.c.role) s.c.role = 'starter';
      if (s.c.prospect && (!loadPreDraft(s.c.prospect) || s.c.prospect.sport !== sport.slug)) delete s.c.prospect;
      /* Round 422: rebuild a balance the pre 422 bug drove below zero. Costs
         were charged every year against income that was never banked, so a
         negative number here is the defect and never a debt the player chose.
         A healthy save is returned untouched. */
      const loaded = sport.repairNetWorth(s.c);
      /* Round 1038: the summer, the ledger and the salt are each checked
         alone, and a broken one is dropped alone. Old saves have none. */
      repairSummerOnLoad(loaded);
      /* Round 1039: the retirement answers, the speech and the recorded jersey,
         each checked alone. Old saves have none. */
      repairHallOnLoad(loaded);
      setCareer(loaded);
      setTeamQuality(s.teamQuality);
      /* Round 126, house pattern from ensureContracts and ensureAcademy in
         clubManager.ts: repair whatever is on disk instead of trusting it. A
         save written before this round has no coaching career at all, comes
         back null, and opens on the retirement screen with one new button. */
      const co = ensureCoachCareer(s.coach, sport.slug);
      coachRef.current = co;
      setCoach(co);
      const restoredPhase: Phase = !s.c.retired ? 'season' : s.phase === 'coach' && co ? 'coach' : 'retired';
      if (restoredPhase !== 'season') markRestoredFinish(sport.gameSlug);
      /* Round 1038: a save in the middle of a summer opens on the card it
         left, rebuilt from the save by the same computation that first showed
         it. A summer whose cards have all moved past ends here, and the team
         quality roll its last answer would have made is made now. */
      if (restoredPhase === 'season' && loaded.summer) {
        const card = seekSummerCard(loaded, sport, talkDeckFilter(loaded, sport.hall));
        if (card) {
          consumedSlot.current = null;
          setPendingEvent(card);
          setPhase('event');
          return;
        }
        const tq = sport.rollTeamQuality(s.teamQuality, Math.random);
        setTeamQuality(tq);
        persist(loaded, 'season', tq);
      }
      setPhase(restoredPhase);
    } catch { /* fresh */ }
  }, [sport]);

  const retrySave = useCallback(() => {
    const pending = pendingSave.current;
    if (!pending || pending.key !== sport.saveKey) return;
    try {
      if (pending.value === null) localStorage.removeItem(pending.key);
      else localStorage.setItem(pending.key, pending.value);
      pendingSave.current = null;
      setSaveFailure(null);
    } catch {
      setSaveFailure(pending.value === null ? 'remove' : 'write');
    }
  }, [sport.saveKey]);
  /* Round 1144: while a save is refused the storage seam knows one is
     waiting here, so a reload the app makes on its own account (a new build,
     a stale chunk, the Season Center tile's Reload) retries it once first and
     stays on the page while it is still refused. The retry is the one above,
     untouched; the answer is whether anything is still waiting after it. */
  useEffect(() => {
    if (!saveFailed) return;
    return holdPendingSave(() => { retrySave(); return pendingSave.current === null; });
  }, [saveFailed, retrySave]);
  const saveValue = useCallback((value: string | null) => {
    pendingSave.current = { key: sport.saveKey, value };
    retrySave();
  }, [sport.saveKey, retrySave]);
  const persist = useCallback((c: CareerState, ph: Phase, tq: number | null) => {
    expireUsCareerProgramme(c);
    if (sport.hall) stampOnRetirement(c, sport.saveKey); // Round 1051: the calibration stamp, on the write that retires a career
    /* Release AO: the stamp stays above the write. Round 1084's saveValue holds the write's try (and the retry
       of a refused one), so the stamped career is what gets serialised, first time and on every retry. */
    saveValue(JSON.stringify({ c, phase: ph, teamQuality: tq, coach: coachRef.current } satisfies SaveShape));
  }, [sport, saveValue]);

  const openPractice = () => {
    if (!career || phase !== 'season') return;
    practiceBankedRef.current = false;
    setPracticeOpen(true);
  };
  const closePractice = () => {
    practiceBankedRef.current = true;
    setPracticeOpen(false);
    practiceButtonRef.current?.focus({ preventScroll: true });
  };
  const bankPractice = (drill: string, rawScore: number) => {
    if (!career || !practiceOpen || phase !== 'season' || career.retired || practiceBankedRef.current
      || !trainingSessionOpen(career.practice?.year, career.year)) return;
    // Consume the tap immediately, before a second event can use this render.
    practiceBankedRef.current = true;
    const score = trainingScore(rawScore);
    const bank = bankTrainingRating(career.ovr, career.pot, score);
    const c: CareerState = {
      ...career, ovr: bank.ovr,
      practice: { ...bank, year: career.year, drill, score, before: career.ovr },
    };
    setCareer(c);
    setFeed(f => [`Practice: ${trainingBankNote(bank)}`, ...f].slice(0, 8));
    persist(c, 'season', teamQuality);
  };

  const saveProspect = (next: UsCareerProspect) => {
    prospectRef.current = next;
    setProspect(next);
    setPhase('prospect');
    saveValue(JSON.stringify({ c: null, phase: 'prospect', teamQuality: null, coach: null, prospect: next } satisfies SaveShape));
  };
  const beginProspect = () => {
    if (prospectRef.current) return;
    saveProspect(createUsCareerProspect(sport, {
      name: nameInput.trim() || sport.create.defaultName, pos, archetypeId, eraId, appearance,
      seed: `${sport.slug}:${Math.floor(Math.random() * 0x100000000).toString(36)}`,
    }));
  };
  const advanceProspect = (next: PreDraftState) => {
    // The render that offered the choice can consume it only once.
    if (!prospect || prospectRef.current !== prospect || next === prospect.state) return;
    saveProspect({ ...prospect, state: next });
  };
  const joinCareer = () => {
    const pending = prospectRef.current;
    if (!pending || pending !== prospect || pending.state?.phase !== 'done' || !pending.state.draft) return;
    const state = pending.state;
    const outcome = pending.state.draft;
    const arch = sport.create.archetypes[pending.pos].find(a => a.id === pending.archetypeId)!;
    const rng = keyedRng(`${pending.seed}|career`);
    const c: CareerState = sport.startCareer(pending.name, pending.pos, arch, rng, pending.appearance, pending.eraId,
      { ...outcome, pot: state.pot, health: outcome.devSeasons.length ? 100 : state.health, prospect: state });
    const tq = sport.rollTeamQuality(null, rng);
    const roleNote = sport.assignRole(c, tq, rng);
    /* Round 1038: the summer's salt, last off this career's own stream. */
    if (summerOn(sport.summer)) c.summerSalt = newSummerSalt(rng);
    if (c.draftPick > 0 && outcome.devSeasons.length === 0) sport.draftNightInbox(c);
    const team = sport.teamLabelOf(c.team, c.eraId);
    setFeed([
      c.draftPick > 0 ? `With pick ${c.draftPick}, the ${team} select ${c.name}.` : `${c.name} joins ${team} as an undrafted signing.`,
      draftPressureLine(c.draftPick, sport.preDraft(pending.eraId).teamIds().length), roleNote,
    ]);
    prospectRef.current = null;
    setProspect(null);
    setCareer(c);
    setTeamQuality(tq);
    setDraftDay(null);
    focusCareerEntry.current = true;
    setPhase('season');
    persist(c, 'season', tq);
  };

  const create = () => {
    const arch = sport.create.archetypes[pos].find(a => a.id === archetypeId) ?? sport.create.archetypes[pos][0];
    const c: CareerState = sport.startCareer(nameInput.trim() || sport.create.defaultName, pos, arch, Math.random, appearance, eraId);
    const tq = sport.rollTeamQuality(null, Math.random);
    /* Round 182: the depth chart is set the day you arrive. */
    const roleNote = sport.assignRole(c, tq, Math.random);
    /* Round 796: draft night's text lands before a down is played, drawn
       from the inbox's own keyed stream. */
    sport.draftNightInbox(c);
    /* Round 1038: the summer's salt, drawn after everything else the day
       you arrive draws. The one card knob draws nothing here. */
    if (summerOn(sport.summer)) c.summerSalt = newSummerSalt(Math.random);
    setCareer(c);
    setTeamQuality(tq);
    const pressureLine = draftPressureLine(c.draftPick, sport.firstRoundEnd);
    setFeed([
      `🎓 With pick ${c.draftPick}, the ${sport.teamLabelOf(c.team)} select ${c.name}.`,
      pressureLine,
      roleNote,
    ]);
    /* Round 530: the same facts, given a moment. */
    setDraftDay({ pick: c.draftPick, teamLabel: sport.teamLabelOf(c.team), playerName: c.name, lines: [pressureLine, roleNote], firstRoundEnd: sport.firstRoundEnd });
    setPhase('season');
    persist(c, 'season', tq);
  };

  /* Release AN: the career the last press of Play left a played season on,
     for the Week by week entry beside Play. The entry reads the season back
     from the save, and a browser whose storage is full refused that write and
     gave it nothing to open. This is the very object the save was asked to
     keep. Null after a press that played no season (a talk, the market, a
     banned year). */
  const playedRef = useRef<CareerState | null>(null);

  const playSeason = () => {
    playedRef.current = null;
    if (!career || teamQuality == null || practiceOpen) return;
    /* Round 195: a played season counts as playing TODAY, the Round 159
       soccer rule reaching the American careers. Unscored on purpose: the
       scored completion stays the retirement legacy. */
    recordActivity(`/${sport.gameSlug}`);
    const c: CareerState = JSON.parse(JSON.stringify(career));

    // Round 56: an indefinite suspension costs the whole season. It still
    // counts as a year of your life, so you age, decline and lose the money.
    if ((c.suspendedSeasons ?? 0) > 0) {
      c.suspendedSeasons = (c.suspendedSeasons ?? 0) - 1;
      const banned: SeasonLine = sport.suspendedLine(c);
      c.seasons.push(banned);
      c.headlines = pushHeadlines(c.headlines, sport.headlinesFor(c, banned));
      const banNotes = sport.progress(c, Math.random);
      settleUsCareerProgramme(c, banned, sport.slug);
      setLastLine(banned);
      setCareer(c);
      setFeed([sport.suspendedNote, ...banNotes]);
      /* Round 186: even a banned year gets its card, muted on purpose. */
      setReveal(buildSeasonReveal({
        year: banned.year,
        subHeader: `${sport.teamLabelOf(banned.team, c.eraId)} · age ${banned.age} · ${c.pos}`,
        teamResult: 'SUSPENDED', statLine: '', campNote: null, notes: [], progressNotes: banNotes,
      }));
      /* Round 1039: a farewell or a retirement he chose ends the career even on
         a banned year: the card said whatever the numbers say. */
      if (endsAfterSeason(c, banned.year)) {
        c.retired = true;
        setPhase('retired');
        persist(c, 'retired', teamQuality);
        return;
      }
      setPhase('season');
      persist(c, 'season', teamQuality);
      return;
    }

    /* Round 179: no deal, no kickoff. The window is guaranteed here, which
       also closes the old hole where the event deck could skip the contract
       card and let you play years on an expired contract. */
    /* Round 207: the last year of a deal is a decision, not just another
       season. Offered before the season is played, because that is when a
       club and a player actually have this conversation. */
    /* Round 1039: never in an announced farewell season. That season ends
       the career, so the card's "play the year out and reach free agency" is
       false, and signing would pay the last year at a rate for years that
       never come (MLB's deck farewell leaves exactly one year on the deal). */
    if (extensionDue(c) && !isFarewellSeason(c.retirement, c.year) && !extDeclinedRef.current) {
      setExtTalk(sport.buildExtension(c, Math.random));
      /* Persisted as 'season' on purpose: a reload puts you back on the hub
         with the season still unplayed, and Play opens a fresh talk. */
      setPhase('extension');
      persist(c, 'season', teamQuality);
      return;
    }
    extDeclinedRef.current = false;

    if (c.contractYears <= 0) {
      /* Round 1039: a farewell season's market offers one year. Cut after the
         build, so the draws are the same ones. */
      const fa = sport.buildFaWindow(c, teamQuality, Math.random);
      setFaWindow(isFarewellSeason(c.retirement, c.year) ? oneYearWindow(fa) : fa);
      setTalkLine(null);
      setPhase('freeagency');
      persist(c, 'season', teamQuality);
      return;
    }

    /* Round 182: every season starts with a camp, and camps have losers. */
    const campNote = sport.campBattle(c, teamQuality, Math.random);
    const programmePreparation = prepareUsCareerProgramme(c, sport.slug);
    const { line, notes } = sport.simSeason(c, teamQuality, Math.random);
    playedRef.current = c;
    restoreUsCareerProgramme(c, programmePreparation);
    const progressNotes = sport.progress(c, Math.random);
    settleUsCareerProgramme(c, line, sport.slug, programmePreparation);
    /* Round 469: the paper writes the season up, position aware, and the
       lines stay on the save so the News screen survives a reload. */
    c.headlines = pushHeadlines(c.headlines, sport.headlinesFor(c, line));
    setLastLine(line);
    /* Round 186: the curtain. Every string in it is one the engine already
       wrote; the true stat line is on screen from frame one. */
    setReveal(buildSeasonReveal({
      year: line.year,
      subHeader: `${sport.teamLabelOf(line.team, c.eraId)} · age ${line.age} · ${c.pos}`,
      teamResult: line.teamResult, statLine: statLine(line, c.pos),
      /* Round 1039: the last season of an announced farewell says so. */
      campNote, notes: isFarewellSeason(c.retirement, line.year) ? ['Farewell season', ...notes] : notes, progressNotes,
    }));
    const newFeed = [...(campNote ? [campNote] : []), ...notes, ...progressNotes];
    /* Round 1039: a farewell he announced (on the talk or on a deck card) ends
       the career after its season, exactly as the hard stop does. */
    if (sport.shouldRetire(c) || endsAfterSeason(c, line.year)) {
      c.retired = true;
      setCareer(c);
      setFeed(newFeed);
      setPhase('retired');
      persist(c, 'retired', teamQuality);
      return;
    }
    /* Round 1038: the summer. On the one card knob this is exactly the old
       sport.drawEvent(c, Math.random) and writes nothing onto c. */
    /* Round 1039: while the retirement talk is pending, the deck's own
       retirement cards are held out of this offseason, so it never asks twice
       (src/lib/usCareerRetirementFlow.ts). With no Hall bound nothing is held. */
    const ev = startSummer(c, sport, Math.random, talkDeckFilter(c, sport.hall));
    if (!ev) {
      /* Only a summer can deal nothing (every card it dealt has already moved
         past); the offseason then ends as an answered one does. */
      const tq = sport.rollTeamQuality(teamQuality, Math.random);
      setTeamQuality(tq);
      setCareer(c);
      setFeed(newFeed);
      setPhase('season');
      persist(c, 'season', tq);
      return;
    }
    consumedEvent.current = null;
    consumedSlot.current = null;
    setPendingEvent(ev);
    setCareer(c);
    setFeed(newFeed);
    setPhase('event');
    persist(c, 'event', teamQuality);
  };

  /* Round 1038: an answer inside a summer. The card applies (card 1 on the
     season's stream, later cards on their own), the save moves to the next
     card, and the outcome screen shows; its Continue opens that card. Team
     quality is rolled once, after the last card. */
  const chooseSummerOption = (idx: number) => {
    if (!career?.summer || !pendingEvent) return;
    const slot = `${career.summer.year}:${career.summer.at}`;
    if (consumedSlot.current === slot) return;
    consumedSlot.current = slot;
    consumedEvent.current = pendingEvent;
    const c: CareerState = JSON.parse(JSON.stringify(career));
    const { line, next } = answerSummerCard(c, sport, pendingEvent, idx, Math.random, talkDeckFilter(c, sport.hall));
    const tq = next ? teamQuality : sport.rollTeamQuality(teamQuality, Math.random);
    setTeamQuality(tq);
    setCareer(c);
    setDecisionOutcome(buildCareerDecisionOutcome({
      title: pendingEvent.title, choice: pendingEvent.options[idx].label,
      before: career, after: c, teamLabel: sport.teamLabelOf,
    }));
    setFeed(f => [line, ...f].slice(0, 6));
    setPendingEvent(null);
    if (next) {
      persist(c, 'event', tq);
      return;
    }
    setPhase('season');
    persist(c, 'season', tq);
  };

  /* Round 1038: Continue on an outcome inside a summer opens the card the
     save already stands on, rebuilt from the save. */
  const openNextSummerCard = () => {
    if (!career?.summer) return;
    const c: CareerState = JSON.parse(JSON.stringify(career));
    const card = seekSummerCard(c, sport, talkDeckFilter(c, sport.hall));
    if (!card) return;
    consumedEvent.current = null;
    setPendingEvent(card);
  };

  const chooseOption = (idx: number) => {
    if (!career || !pendingEvent || phase !== 'event' || consumedEvent.current === pendingEvent || !pendingEvent.options[idx]) return;
    if (career.summer) { chooseSummerOption(idx); return; }
    consumedEvent.current = pendingEvent;
    const c: CareerState = JSON.parse(JSON.stringify(career));
    const outcome = pendingEvent.options[idx].apply(c, Math.random);
    const tq = sport.rollTeamQuality(teamQuality, Math.random);
    setTeamQuality(tq);
    setCareer(c);
    setDecisionOutcome(buildCareerDecisionOutcome({
      title: pendingEvent.title, choice: pendingEvent.options[idx].label,
      before: career, after: c, teamLabel: sport.teamLabelOf,
    }));
    setFeed(f => [outcome, ...f].slice(0, 6));
    setPendingEvent(null);
    setPhase('season');
    persist(c, 'season', tq);
  };

  /* Round 179: the market handlers. Signing writes the offer onto the career
     and the offer's roster quality becomes the real teamQuality the sim runs
     on, so the choice is the consequence. */
  /* Round 207: the three answers to an extension. Signing writes the deal
     onto the career (the year being played plus the new years); pushing
     spends the one negotiation; turning it down plays the season out, which
     is what sends you to free agency next summer. */
  const signExt = () => {
    if (!career || !extTalk?.offer) return;
    const c: CareerState = JSON.parse(JSON.stringify(career));
    const o = extTalk.offer;
    c.contractYears = 1 + o.years;
    c.salary = o.salary;
    setCareer(c);
    setFeed(f => [`\u{1F58A}\uFE0F Extension signed: ${o.years} more year${o.years === 1 ? '' : 's'} at $${o.salary}M a year.`, ...f].slice(0, 6));
    setExtTalk(null);
    setPhase('season');
    persist(c, 'season', teamQuality);
  };

  const pushExt = () => {
    if (!career || !extTalk) return;
    setExtTalk(pushExtension(extTalk, sport.extPushArgs(career, Math.random)));
  };

  const declineExt = () => {
    extDeclinedRef.current = true;
    setExtTalk(null);
    setPhase('season');
    playSeason();
  };

  const signFa = (idx: number) => {
    if (!career || !faWindow) return;
    const offer = faWindow.offers[idx];
    if (!offer || offer.gone) return;
    const c: CareerState = JSON.parse(JSON.stringify(career));
    const line = applyFaSigning(c, offer);
    /* Round 182: the new locker room has its own depth chart. A star walks
       in as the starter; a 78 joining a 91 contender can find out the ring
       chase costs him the huddle. */
    const roleNote = sport.campBattle(c, offer.quality, Math.random);
    setCareer(c);
    setTeamQuality(offer.quality);
    setFeed(f => [line, ...(roleNote ? [roleNote] : []), ...f].slice(0, 6));
    setFaWindow(null);
    setTalkLine(null);
    setPhase('season');
    persist(c, 'season', offer.quality);
  };
  const pushFa = (idx: number) => {
    if (!career || !faWindow) return;
    const args = sport.faPushArgs(career, Math.random);
    const res = pushFaOffer(faWindow, idx, isFarewellSeason(career.retirement, career.year) ? { ...args, maxYears: 1 } : args);
    setFaWindow(res.window);
    setTalkLine(res.line);
  };

  /* Round 469: every money tap rides on one handler, the way the soccer
     phone's does. The engine refuses rather than throws when the numbers do
     not work, so a refused tap changes nothing and writes nothing. Persisted
     as 'season' because the money app only opens from the hub. */
  const handleMoney = (action: MoneyAction) => {
    if (!career) return;
    const c: CareerState = JSON.parse(JSON.stringify(career));
    const res = sport.moneyAct(c, action);
    if (!res.ok) return;
    setCareer(c);
    const line = res.event ?? (res.toast ? `💰 ${res.toast}.` : null);
    if (line) setFeed(f => [line, ...f].slice(0, 8));
    persist(c, 'season', teamQuality);
  };

  /* Round 521: the inbox's one write path, the same shape the flagship's
     phone uses. Refuses rather than throws when the message is already
     answered or does not exist, so a double tap changes nothing. */
  const handleInboxAnswer = (msgId: string, choiceIdx: number) => {
    if (!career) return;
    const c: CareerState = JSON.parse(JSON.stringify(career));
    const line = sport.answerInbox(c, msgId, choiceIdx);
    if (line === null) return;
    setCareer(c);
    setFeed(f => [line, ...f].slice(0, 8));
    persist(c, phase, teamQuality);
  };

  /* Round 521: dismissing a pending rivalry beat applies its effect and
     clears the card, the same {state, log} shape the shop's buy already
     returns. */
  const dismissRivalry = () => {
    if (!career) return;
    const { state, lines } = sport.dismissRivalryEvent(career);
    setCareer(state);
    if (lines.length) setFeed(f => [...lines, ...f].slice(0, 8));
    persist(state, phase, teamQuality);
  };

  /* Round 796: answering a rival choice writes it to the save at once and
     keeps the card up to show what happened. A second tap finds nothing
     pending and changes nothing. */
  const chooseRivalry = (choiceIdx: number) => {
    if (!career?.pendingRivalryChoice) return;
    const card = career.pendingRivalryChoice;
    const res = sport.resolveRivalryChoice(career, choiceIdx, Math.random);
    if (!res) return;
    setCareer(res.state);
    setFeed(f => [res.line, ...f].slice(0, 8));
    setRivalryOutcome({ card, choiceIdx, line: res.line });
    persist(res.state, phase, teamQuality);
  };

  /* Round 1039: the answer to the retirement talk. Retire now ends the career
     on the season just played, and the offseason's card is dropped unapplied
     (its draw already happened, so no stream moves). One more year and the
     farewell go on to the card, or to the hub. */
  const answerRetirementTalk = (choice: RetirementChoiceId) => {
    if (!career || !pendingTalk(career, sport.hall)) return;
    const c: CareerState = JSON.parse(JSON.stringify(career));
    answerTalk(c, choice);
    if (choice === 'retireNow') {
      c.retired = true;
      delete c.summer;
      setPendingEvent(null);
      setCareer(c);
      setPhase('retired');
      persist(c, 'retired', teamQuality);
      return;
    }
    setCareer(c);
    persist(c, phase === 'event' ? 'event' : 'season', teamQuality);
  };

  /* Round 1039: the induction speech, given once. The speech module rides
     with the Hall card, so it is fetched on the press (already loaded). */
  const giveSpeech = (id: HallSpeechId) => {
    const hall = sport.hall;
    if (!career || !hallRecord || !hall || career.hallSpeech?.speechId) return;
    const base = career;
    const rec = hallRecord;
    void import('@/lib/careerHallSpeech').then(({ giveHallSpeech }) => {
      const c: CareerState = JSON.parse(JSON.stringify(base));
      c.hallSpeech = giveHallSpeech(base.hallSpeech, rec, hall.key(base), id);
      setCareer(c);
      persist(c, 'retired', teamQuality);
    });
  };

  const retireNow = () => {
    if (!career) return;
    const c: CareerState = JSON.parse(JSON.stringify(career));
    /* Round 1039: 'Hang them up now' writes the last season played as the last.
       With no Hall bound (the parity replay) the save stays the old one. */
    if (sport.hall) manualRetire(c);
    c.retired = true;
    setCareer(c);
    setPhase('retired');
    persist(c, 'retired', teamQuality);
  };

  const reset = () => {
    saveValue(null);
    setCareer(null);
    prospectRef.current = null;
    setProspect(null);
    setProspectNotice('');
    setPhase('create');
    setFeed([]);
    setLastLine(null);
    setPendingEvent(null);
    setDecisionOutcome(null);
    consumedEvent.current = null;
    decisionReturn.current = false;
    setFaWindow(null);
    setTalkLine(null);
    setDraftDay(null);
    setRivalryOutcome(null);
    setPanel('none');
    setRetiredReview(false);
    reviewReturn.current = null;
    coachRef.current = null;
    setCoach(null);
    setCoachFeed([]);
    setPracticeOpen(false);
    practiceBankedRef.current = false;
  };

  /* Round 126: the second life. */
  const startCoaching = () => {
    if (!career) return;
    const co = startCoachCareer(sport.slug, career, career.year, Math.random);
    coachRef.current = co;
    setCoach(co);
    setCoachFeed([co.offerNote]);
    setPhase('coach');
    persist(career, 'coach', teamQuality);
  };
  const openCoaching = () => {
    if (!career) return;
    setPhase('coach');
    persist(career, 'coach', teamQuality);
  };
  const onCoachChange = (next: CoachCareerState, notes: string[]) => {
    if (!career) return;
    coachRef.current = next;
    setCoach(next);
    setCoachFeed(f => [...notes, ...f].slice(0, 6));
    persist(career, 'coach', teamQuality);
  };
  const leaveCoaching = () => {
    if (!career) return;
    setPhase('retired');
    persist(career, 'retired', teamQuality);
  };

  /* Round 126: a suspended season carries no stat fields at all, so this used
     to print "undefined yds, undefined TD, undefined INT" straight onto the
     retirement screen. Caught by the browser sweep for this round. It was
     already there before the coaching career was, in three of the four games.
     Round 833: and a linebacker, corner, edge rusher or kicker fell through to
     the receiver's line here and read "undefined rec, undefined yds, undefined
     TD" in all four places this prints. The line lives in usCareerStatLine.ts
     now, one branch per position the career deals. */
  const statLine: (s: SeasonLine, p: string) => string = sport.statLine;
  const withSaveStatus = (content: ReactNode) => <>
    {saveFailure && <UsCareerSaveNotice operation={saveFailure} onRetry={retrySave} />}
    {content}
  </>;

  if (phase === 'prospect' && prospect) {
    return withSaveStatus(<ProspectJourney sport={sport} prospect={prospect} onChange={advanceProspect} onJoin={joinCareer} onBack={() => {
      if (prospect.state) return;
      setNameInput(prospect.name); setPos(prospect.pos); setArchetypeId(prospect.archetypeId);
      setEraId(prospect.eraId); setAppearance(prospect.appearance);
      prospectRef.current = null; setProspect(null); setPhase('create');
      saveValue(null);
    }} />);
  }

  /* ------------------------------ create ------------------------------ */
  if (phase === 'create' || !career) {
    return withSaveStatus(
      <div className="space-y-4">
        <div className="rounded-2xl border border-border bg-card p-4 text-center">
          <p className="font-display text-lg font-bold text-foreground">Create your player</p>
          <p className="mt-1 text-xs text-muted-foreground">
            You are a fictional prospect entering the real league. Position and archetype shape your
            whole career: growth, injuries, money, legacy. Saves automatically.
          </p>
        </div>
        <div className="mx-auto max-w-md space-y-3">
          <input
            value={nameInput}
            onChange={e => setNameInput(e.target.value)}
            placeholder="Your player's name"
            aria-label="Your player name"
            maxLength={24}
            className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          {/* Round 172: pick WHEN, before you pick what. Same pattern as Club
              Manager's era picker: the default is today, the throwback is a
              sealed 2005 league with 2005 franchises and 2005 money. */}
          <div className="grid grid-cols-2 gap-1.5">
            {sport.create.eras.map(e => (
              <button
                key={e.id}
                onClick={() => setEraId(e.id)}
                className={cn(
                  'rounded-xl border-2 px-3 py-2 text-left',
                  eraId === e.id ? 'border-gold bg-gold/10' : 'border-border bg-card hover:border-primary/50',
                )}
              >
                <span className="block text-sm font-bold text-foreground">{e.id === 'now' ? `${sport.create.eraEmoji} ` : '⏪ '}{e.label}</span>
                <span className="block text-[10px] text-muted-foreground">{e.blurb}</span>
              </button>
            ))}
          </div>
          {/* Round 56: eight positions, each with its own stat line and money curve */}
          <div className={sport.create.positionGridClass}>
            {sport.create.positions.map(p => (
              <button
                key={p}
                onClick={() => { setPos(p); setArchetypeId(sport.create.archetypes[p][0].id); }}
                className={cn(sport.create.positionButtonClass, pos === p ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
              >
                {p}
              </button>
            ))}
          </div>
          <AppearanceBuilder appearance={appearance} onChange={setAppearance} clubColor={sport.create.clubColor} sport={sport.slug} />

          <div className="grid gap-1.5">
            {sport.create.archetypes[pos].map(a => (
              <button
                key={a.id}
                onClick={() => setArchetypeId(a.id)}
                className={cn(
                  'rounded-xl border-2 px-3 py-2 text-left',
                  archetypeId === a.id ? 'border-gold bg-gold/10' : 'border-border bg-card hover:border-primary/50',
                )}
              >
                <span className="block text-sm font-bold text-foreground">{a.label}</span>
                <span className="block text-[11px] text-muted-foreground">{a.desc}</span>
              </button>
            ))}
          </div>
          <section data-career-prospect-entry className="rounded-2xl border border-blue-300/50 bg-blue-950 p-4 text-white">
            <p className="font-display text-xl font-black">Road to the Draft</p>
            <p className="mt-1 text-xs leading-relaxed text-blue-100">Start before the spotlight. Choose your route, earn your stock, and make draft day yours.</p>
            {prospectNotice && <p className="mt-2 text-xs" role="status">{prospectNotice}</p>}
            <button onClick={beginProspect} className="mt-3 min-h-11 w-full rounded-xl bg-white px-4 py-3 text-sm font-bold text-blue-950">Play your road to the draft</button>
            <p className="mt-3 text-center text-xs text-blue-100">Or quick start below with an instant draft result.</p>
          </section>
          <button
            onClick={create}
            className="w-full rounded-full bg-primary px-8 py-3 text-sm font-bold text-primary-foreground hover:opacity-90"
          >
            Enter the draft
          </button>
        </div>
      </div>
    );
  }

  const legacy = sport.legacyOf(career);

  /* ------------------- Round 186: the season curtain -------------------
     Rendered ahead of every other screen so the season's story lands
     before the crossroads, the market or the retirement card. Transient:
     a reload skips straight to whichever of those the save is really on. */
  if (reveal) {
    return withSaveStatus(
      <div ref={revealRef}>
        <SeasonRevealCard reveal={reveal} onContinue={() => setReveal(null)} />
      </div>
    );
  }

  if (decisionOutcome && phase === 'season') {
    return withSaveStatus(<CareerDecisionOutcome outcome={decisionOutcome} onContinue={() => {
      decisionReturn.current = true;
      setDecisionOutcome(null);
    }} />);
  }
  /* Round 1038: the same outcome between two cards of one summer; its
     Continue opens the next card. */
  if (decisionOutcome && phase === 'event' && career.summer) {
    return withSaveStatus(<CareerDecisionOutcome outcome={decisionOutcome} onContinue={() => {
      setDecisionOutcome(null);
      openNextSummerCard();
    }} />);
  }

  /* ------------------- Round 521: a pending rivalry beat -------------------
     Shown right after the season curtain and before the crossroads deck,
     the same place in the flow the flagship's own rivalry card interrupts.
     Persisted on the save (unlike reveal), so a reload mid-beat still shows
     it rather than losing it. */
  if (career.pendingRivalryEvent) {
    return withSaveStatus(
      <div ref={revealRef}>
        <RivalryEventCard
          event={career.pendingRivalryEvent}
          onContinue={dismissRivalry}
          headToHead={career.rival ? {
            myName: career.name, myRating: career.ovr,
            rivalName: career.rival.name, rivalRating: career.rival.ovr,
          } : undefined}
        />
      </div>
    );
  }

  /* ------------------- Round 796: a rival choice -------------------
     Same place in the flow as the beat card above, which a season never
     stacks with this one. Persisted on the save while unanswered, so a
     reload mid-choice still asks. */
  const rivalryChoice = career.pendingRivalryChoice ?? rivalryOutcome?.card ?? null;
  if (rivalryChoice) {
    return withSaveStatus(
      <div ref={revealRef}>
        <RivalryChoiceCard
          card={rivalryChoice}
          onChoose={chooseRivalry}
          outcome={career.pendingRivalryChoice ? null : rivalryOutcome}
          onContinue={() => setRivalryOutcome(null)}
          headToHead={career.rival ? {
            myName: career.name, myRating: career.ovr,
            rivalName: career.rival.name, rivalRating: career.rival.ovr,
          } : undefined}
        />
      </div>
    );
  }

  /* ------------------- Round 1039: the retirement talk -------------------
     After the curtain and the rivalry beats, before the offseason's card or
     the hub. Derived from the career, so a reload asks it again until it is
     answered, and an old save already inside the rule is asked on its first
     load. With no Hall bound there is never a talk. */
  const talk = phase === 'season' || phase === 'event' ? pendingTalk(career, sport.hall) : null;
  if (talk) {
    return withSaveStatus(
      <div ref={revealRef}>
        <Suspense fallback={<p role="status" className="text-center text-xs text-muted-foreground">Loading...</p>}>
          <FarewellCard talk={talk} age={career.age} onChoose={answerRetirementTalk} />
        </Suspense>
      </div>
    );
  }

  if ((phase === 'retired' && retiredReview) || (phase !== 'retired' && phase !== 'coach' && phase !== 'freeagency' && panel === 'log')) {
    return withSaveStatus(<Suspense fallback={<p role="status">Loading season review...</p>}>
      <CareerSeasonReview career={career} sport={sport} backLabel={phase === 'retired' ? 'Back to retirement' : 'Back to career'} onBack={() => {
        reviewReturn.current = phase === 'retired' ? 'retired' : 'log';
        if (phase === 'retired') setRetiredReview(false);
        else setPanel('none');
      }} />
    </Suspense>);
  }

  /* ------------------- Round 126: the coaching career ------------------- */
  if (phase === 'coach' && coach) {
    return withSaveStatus(
      <CoachCareerPanel
        state={coach}
        playerName={career.name}
        feed={coachFeed}
        onChange={onCoachChange}
        onBack={leaveCoaching}
      />
    );
  }

  /* ------------------------------ retired ------------------------------ */
  if (phase === 'retired') {
    return withSaveStatus(
      <div className="space-y-4">
        {/* Round 530: the retirement is a reveal. The verdict slams, the
            bullets tick in one at a time, the badges rise after them, and
            the legacy score is its final value from frame one (Round 147:
            never a number through values that were never true). Reduced
            motion lands every piece on its final frame (CelebrationStyles). */}
        <div className="relative rounded-2xl border border-gold/50 bg-card p-5 text-center">
          <CelebrationStyles />
          {/* Round 1039: with a Hall bound, the confetti waits for the ballot. */}
          {legacy.hof && (!hallRecord || hallLanded) && <Confetti pieces={60} gold />}
          {sport.retirementAvatar && career.appearance && (
            <div className="mb-2 flex justify-center">
              <span className="overflow-hidden rounded-xl border-2 border-gold/50 bg-secondary">
                <PlayerAvatar appearance={career.appearance} clubColor="#D4AF37" size={88} />
              </span>
            </div>
          )}
          <Crown className="mx-auto h-10 w-10 text-gold" />
          <p className="cm-slam mt-2 font-display text-2xl font-black text-foreground" style={{ animationDelay: '0.1s' }}>{career.name} retires</p>
          <p className="cm-slam mt-1 text-sm font-semibold text-gold" style={{ animationDelay: '0.3s' }}>{legacy.verdict}</p>
          <div className="mt-3 space-y-1 text-xs text-muted-foreground">
            {legacy.bullets.map((b, i) => <p key={i} className="cm-tick-in" style={{ animationDelay: revealDelay(i) }}>{b}</p>)}
            {/* Round 469: the badges the career earned, on the retirement card. */}
            {(() => {
              const earned = sport.earnedBadges(career);
              return earned.length > 0
                ? <p className="cm-rise pt-1 text-gold" style={{ animationDelay: revealDelay(legacy.bullets.length, 0.75) }}>{earned.map(b => `${b.emoji} ${b.label}`).join(' · ')}</p>
                : null;
            })()}
          </div>
          <div className="cm-rise mt-3 flex items-center justify-center gap-3 text-sm" style={{ animationDelay: revealDelay(legacy.bullets.length, 0.95) }}>
            <span className="rounded-full border border-border bg-background px-3 py-1.5">Legacy <b className="text-gold">{legacy.score}</b></span>
            {/* Round 1039: and so does the Hall pill, so the ballot is not spoiled. */}
            {(!hallRecord || hallLanded) && (
              <span className={cn('rounded-full border border-border bg-background px-3 py-1.5', hallRecord && 'cm-rise')}>{sport.hallLine(legacy.hof)}</span>
            )}
          </div>
          <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <USCareerActionConfirm action="restart" sport={sport.label} onConfirm={reset}>
              <button className="inline-flex min-h-11 min-w-11 items-center gap-2 rounded-full border border-border px-6 py-2.5 text-sm font-semibold text-foreground">
                <RotateCcw className="h-4 w-4" /> New career
              </button>
            </USCareerActionConfirm>
            <ShareButtons
              gameName={sport.gameName}
              gamePath={`/${sport.gameSlug}`}
              score={`legacy ${legacy.score}`}
              customText={sport.shareText(career, legacy)}
            />
          </div>
        </div>
        {/* Round 1039: the wait, the ballot years, the jersey and the speech. */}
        {hallRecord && sport.hall && (
          <Suspense fallback={<p role="status" className="text-center text-xs text-muted-foreground">Counting the Hall votes...</p>}>
            <HallOfFameCard
              record={hallRecord}
              rules={sport.hall.rules}
              speech={career.hallSpeech}
              onSpeech={giveSpeech}
              folded={hallFolded}
              onDismiss={() => setHallFolded(true)}
              onLanded={() => setHallLanded(true)}
            />
          </Suspense>
        )}
        {/* Round 126: the save does not end here any more. */}
        <CoachStartCard sport={sport.slug} existing={coach} onStart={startCoaching} onResume={openCoaching} />
        <button ref={retiredReviewButton} data-career-review-opener="" onClick={() => setRetiredReview(true)} className="min-h-[44px] w-full rounded-xl border border-primary/40 bg-primary/10 px-3 py-3 text-sm font-semibold text-foreground">Review seasons</button>
        <div className="rounded-2xl border border-border bg-card p-3">
          <p className="mb-1 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Season by season</p>
          <div className="max-h-72 space-y-0.5 overflow-y-auto">
            {career.seasons.map((s, i) => (
              <div key={i} className="flex items-center justify-between rounded px-2 py-1 text-[11px] odd:bg-background">
                <span className="text-muted-foreground">{s.year} · {s.team} · age {s.age}</span>
                <span className="text-foreground">{statLine(s, career.pos)}{s.awards.length ? ` · ${s.awards.join(', ')}` : ''}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ---------------- Round 85: tile drill-in screens (the tile rule) ----------------
     Round 179: freeagency joins event in the guard, so an open panel can
     never hide the market screen. */
  if (panel !== 'none' && phase !== 'event' && phase !== 'freeagency') {
    /* Round 796: karma joins the meters. The inbox has moved it since Round 521
       and the rival choice buttons now print it, so it has to be somewhere the
       player can see it move. A save that never answered a text reads 50. */
    const meters: [string, number][] = [['Morale', career.morale], ['Fanbase', career.fanbase], ['Health', career.health], ['Karma', career.karma ?? 50]];
    return withSaveStatus(
      <div ref={panelRef} className="space-y-3">
        <HubPanelHeader
          title={panel === 'bank' ? '\u{1F4B0} The Bank' : panel === 'stats' ? '\u{1F4CA} My Player' : panel === 'log' ? '\u{1F4DC} Career Log' : panel === 'trophies' ? '\u{1F3C6} Trophy Case' : panel === 'inbox' ? '\u{1F4F1} Inbox' : '\u{1F4F0} News Feed'}
          onBack={() => setPanel('none')}
        />
        {panel === 'bank' && (
          /* Round 469: the money app. Savings, the market, the statement and
             the card school on the engine the flagship's phone runs, with the
             Round 56 shop as its fourth tab. */
          <MoneyApp
            host={career}
            sport={sport.money}
            incomeLine={`$${career.salary}M a year, ${Math.max(0, career.contractYears)} year${Math.max(0, career.contractYears) === 1 ? '' : 's'} left on the deal`}
            onMoney={handleMoney}
            shop={<UsShopPanel stock={sport.shopItems} career={career} onBuy={id => { const res = sport.buyItem(career, id); if (!res) return; setCareer(res.state); setFeed(f => [res.log, ...f].slice(0, 8)); persist(res.state, 'season', teamQuality); }} />}
          />
        )}
        {panel === 'stats' && (
          <div className="space-y-3">
            {career.prospect && <ProspectRecord sport={sport} state={career.prospect} />}
            <div className="rounded-2xl border border-border bg-card p-4 text-center">
              <p className="text-4xl font-black text-primary">{career.ovr}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">overall</p>
              <p className="mt-1 text-xs text-muted-foreground">{career.name} · {career.pos} · age {career.age}</p>
            </div>
            <div className="space-y-2">
              {meters.map(([lbl, v]) => (
                <div key={lbl} className="rounded-xl border border-border bg-card px-3 py-2">
                  <div className="flex justify-between text-[11px]"><span className="text-muted-foreground">{lbl}</span><b className="text-foreground">{v}</b></div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
                    <div className={cn('h-full rounded-full', v > 60 ? 'bg-primary' : v > 35 ? 'bg-gold' : 'bg-destructive')} style={{ width: `${v}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2 text-center text-[11px]">
              <div className="rounded-xl border border-border bg-card px-2 py-2"><p className="text-lg font-black text-foreground">{career.seasons.length}</p><p className="text-muted-foreground">seasons</p></div>
              <div className="rounded-xl border border-border bg-card px-2 py-2"><p className="text-lg font-black text-foreground">{sport.ringsOf(career)}</p><p className="text-muted-foreground">{sport.ringsLabel}</p></div>
            </div>
          </div>
        )}
        {panel === 'trophies' && (
          <div className="space-y-3">
            <TrophyCase seasons={career.seasons} rings={sport.ringsOf(career)} ringWord={sport.ringWord} />
            {/* Round 469: the peaks between the trophies. Evaluated on every
                render off the save, so a badge can never be stale. */}
            <BadgeGrid defs={sport.badges} earned={sport.earnedBadges(career)} />
          </div>
        )}
        {panel === 'news' && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-1">
              {([['headlines', '📰 Paper'], ['fans', '📸 SocialGram'], ['rival', '🪞 Rival']] as const).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setNewsTab(k)}
                  /* Round 470: py-2, not py-1.5. Measured at 390 by 844
                     these three came out 117 by 29px, a shade under the 30px
                     floor every tap target on this site is held to, and they
                     are the only way between the News box's three screens. */
                  className={cn('rounded-lg px-1 py-2 text-[11px] font-bold transition-all', newsTab === k ? 'bg-primary/15 text-primary' : 'bg-secondary text-muted-foreground hover:text-foreground')}
                >
                  {label}
                </button>
              ))}
            </div>
            {newsTab === 'headlines' && (
              <div className="space-y-3">
                <div className="rounded-2xl border border-border bg-card p-3">
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">This week</p>
                  {feed.length === 0 ? (
                    <p className="py-4 text-center text-xs text-muted-foreground">Quiet week. Play a season and the headlines write themselves.</p>
                  ) : (
                    <div className="space-y-1.5 text-xs text-muted-foreground">
                      {feed.map((n, i) => <p key={i} className="rounded-lg bg-background px-2 py-1.5">{n}</p>)}
                    </div>
                  )}
                </div>
                {(career.headlines ?? []).length > 0 && (
                  <div className="rounded-2xl border border-border bg-card p-3">
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Back pages</p>
                    <div className="space-y-1.5 text-xs text-foreground">
                      {(career.headlines ?? []).map((n, i) => <p key={i} className="rounded-lg bg-background px-2 py-1.5">📰 {n}</p>)}
                    </div>
                  </div>
                )}
              </div>
            )}
            {newsTab === 'fans' && (
              <SocialGram
                followers={fmtFollowers(sport.followers(career))}
                standing={career.fanbase}
                standingLabel="Fanbase"
                comments={sport.fanComments(career)}
                headlines={(career.headlines ?? []).slice(0, 3)}
              />
            )}
            {newsTab === 'rival' && (
              <RivalCard rival={career.rival} myName={career.name} teamLabel={sport.teamLabelOf(career.rival?.team ?? '', career.eraId)} ringWord={sport.ringWord} />
            )}
          </div>
        )}
        {panel === 'inbox' && (
          /* Round 521: the Round 80 half of the flagship's phone, on the
             engine careerInbox.ts, bound per sport (sport.calendar, sport.answerInbox). */
          <InboxPanel messages={[...(career.phoneInbox ?? [])].reverse()} onAnswer={handleInboxAnswer} seen={inboxSeenRef.current} calendar={sport.calendar} />
        )}
      </div>
    );
  }

  /* Round 208: what the boxes say. Decided in src/lib/careerHub.ts so the
     wording is harnessed rather than eyeballed, and shared by four games. */
  const hubTiles = careerHubTiles({
    ovr: career.ovr,
    age: career.age,
    pos: career.pos,
    morale: career.morale,
    health: career.health,
    fanbase: career.fanbase,
    /* Round 469: everything you have, cash plus savings plus holdings, the
       number the money app's headline prints. */
    netWorth: Math.round(((career.netWorth ?? 0) + sport.moneyWealth(career)) * 10) / 10,
    salary: career.salary,
    yearlyCosts: career.yearlyCosts ?? 0,
    contractYears: Math.max(0, career.contractYears),
    teamLabel: sport.teamLabelOf(career.team),
    seasonsPlayed: career.seasons.length,
    /* Read off the SEASONS, not the transient lastLine state: that state
       is empty after a reload, and a box that forgets your career the
       moment you refresh is worse than no box. */
    lastLine: career.seasons.length
      ? statLine(career.seasons[career.seasons.length - 1], career.pos)
      : null,
    rings: sport.ringsOf(career),
    ringWord: sport.ringWord,
    honours: sport.honours(career),
    /* The week's feed while there is one; after a reload, the paper kept on
       the save, so the box does not forget the career. */
    headlines: feed.length ? feed : (career.headlines ?? []),
  });
  /* Round 521: a sixth box for the inbox, appended here rather than folded
     into careerHub.ts's shared five. When this was written only the NFL had
     an inbox; since Round 796 every sport does, and this board draws the box
     for all four through the binding's unreadInboxCount. */
  const unread = sport.unreadInboxCount(career);
  const hubTilesWithInbox: HubTile[] = [
    ...hubTiles,
    {
      key: 'inbox',
      icon: '📱',
      title: 'Inbox',
      value: unread === 0 ? 'All caught up' : `${unread} unread`,
      sub: unread === 0 ? 'Texts show up between seasons' : 'Somebody is waiting on a reply',
      accent: unread > 0,
    },
  ];
  /* Round 1038: where the event card stands in its summer, counted over the
     cards you actually get (a skipped card is never shown). */
  const place = career.summer ? summerPlace(career.summer) : null;

  /* ------------------------------ season hub ------------------------------ */
  return withSaveStatus(
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
        {career.appearance && (
          <span className="overflow-hidden rounded-xl border border-border bg-card">
            <PlayerAvatar appearance={career.appearance} clubColor={sport.create.clubColor} size={44} animate />
          </span>
        )}
        <span className="rounded-full border border-border bg-card px-3 py-1 font-bold text-foreground">{career.name} · {career.pos}</span>
        <span className="rounded-full border border-border bg-card px-3 py-1 text-muted-foreground">{sport.teamLabelOf(career.team)}</span>
        <span className="rounded-full border border-border bg-card px-3 py-1 text-muted-foreground">{career.year} · age {career.age}</span>
        <span className="rounded-full border border-border bg-card px-3 py-1 text-muted-foreground">OVR <b className="text-primary">{career.ovr}</b></span>
        <span className="rounded-full border border-border bg-card px-3 py-1 text-muted-foreground">${career.salary}M x{Math.max(0, career.contractYears)}</span>
        {/* Round 182: the depth chart, on the shirt. */}
        <span className={cn('rounded-full border px-3 py-1 font-bold', career.role === 'backup' ? 'border-border bg-card text-muted-foreground' : 'border-gold/40 bg-card text-gold')}>
          {sport.roleBadge(career)}
        </span>
      </div>

      {/* Round 56: the heat meter, only once you have something to hide */}
      {((career.heat ?? 0) > 0 || (career.dirtyMoney ?? 0) > 0) && (() => {
        const h = career.heat ?? 0;
        const band = sport.heatLabel(h);
        return (
          <div className="rounded-2xl border border-destructive/25 bg-destructive/5 p-3">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold uppercase tracking-wider text-muted-foreground">{`🕶️ ${sport.heatTitle}`}</span>
              <span className={cn('font-black', band.tone)}>{band.label}</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary">
              <div className={cn('h-full rounded-full transition-all duration-700', h >= 65 ? 'bg-destructive' : h >= 40 ? 'bg-orange-500' : 'bg-gold')} style={{ width: `${h}%` }} />
            </div>
            <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">{band.blurb}</p>
            {(career.dirtyMoney ?? 0) > 0 && (
              <p className="mt-1 text-[11px] font-bold text-destructive">
                💼 ${(career.dirtyMoney ?? 0).toFixed(1)}M unexplained. Wash it in the Shady aisle or it keeps burning.
              </p>
            )}
          </div>
        );
      })()}




      {/* Round 1039: the announced last season carries its banner. */}
      {isFarewellSeason(career.retirement, career.year) && (
        <Suspense fallback={null}><FarewellSeasonBanner year={career.year} /></Suspense>
      )}

      {phase === 'extension' && extTalk ? (
        <div ref={revealRef}>
          <ExtensionCard talk={extTalk} seasonWord={sport.seasonWord} onPush={pushExt} onSign={signExt} onDecline={declineExt} />
        </div>
      ) : phase === 'freeagency' && faWindow ? (
        <div ref={revealRef}>
          <FreeAgencyPanel window={faWindow} sportNoun={sport.faSportNoun} talkLine={talkLine} onPush={pushFa} onSign={signFa} />
        </div>
      ) : phase === 'event' && pendingEvent ? (
        <div ref={revealRef} data-career-event={pendingEvent.id} data-career-decision-event={pendingEvent.id} className={career.summer ? 'cm-rise rounded-2xl border border-gold/40 bg-card p-4' : 'rounded-2xl border border-gold/40 bg-card p-4'}>
          {/* Round 1038: where you are in the summer. Drawn only on a summer,
              so the one card knob's markup is exactly what it was. */}
          {place && (
            <div data-career-summer-step={place.n} className="mb-2 flex items-center justify-center gap-2">
              <CelebrationStyles />
              <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Offseason, card {place.n} of {place.of}</span>
              <span className="flex gap-1" aria-hidden="true">
                {Array.from({ length: place.of }, (_, i) => (
                  <span key={i} className={cn('h-1.5 w-1.5 rounded-full', i < place.done ? 'bg-gold' : i === place.done ? 'bg-gold/50' : 'bg-border')} />
                ))}
              </span>
            </div>
          )}
          <p className="text-center text-sm font-bold text-foreground"><Sparkles className="mr-1 inline h-4 w-4 text-gold" />{pendingEvent.title}</p>
          <p className="mt-1 text-center text-xs text-muted-foreground">{pendingEvent.body}</p>
          <div className="mt-3 grid gap-1.5">
            {pendingEvent.options.map((o, i) => (
              <button
                key={i}
                data-career-decision-option={i}
                onClick={() => chooseOption(i)}
                className="rounded-xl border border-border bg-background px-3 py-2 text-left hover:border-primary/60"
              >
                <span className="block text-sm font-bold text-foreground">{o.label}</span>
                <span className="block text-[10px] text-muted-foreground">{o.effect}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div ref={careerEntryScreen} className="rounded-2xl border border-gold/40 bg-card p-4 text-center">
          {/* Round 530: draft day sits inside the Play card until the first
              season is played, so the hub does not grow a new box and the
              page does not jump. The feed keeps its copy of the lines. */}
          {draftDay && career.seasons.length === 0 && (
            <div className="mb-3">
              <DraftDayCard {...draftDay} />
            </div>
          )}
          {lastLine && (
            <p className="mb-2 text-xs text-muted-foreground">
              Last season: {statLine(lastLine, career.pos)} · {lastLine.teamResult}
            </p>
          )}
          <button
            ref={careerEntryButton}
            onClick={playSeason}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-8 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90"
          >
            <Dumbbell className="h-4 w-4" /> Play the {career.year} season
          </button>
          <UsSeasonCentreEntry sport={sport} career={career} busy={practiceOpen} onPlay={playSeason} played={() => playedRef.current} />
          <p className="mt-2 text-xs text-muted-foreground">
            Career so far: {sport.careerSoFar(career)}
          </p>
          <UsCareerProgramme career={career} sport={sport.slug} onChange={next => {
            if (next === career || phase !== 'season') return;
            setCareer(next);
            persist(next, 'season', teamQuality);
          }} />
          <section data-career-practice aria-label="Season practice" className="mt-4 rounded-xl border border-primary/30 bg-gradient-to-br from-primary/15 via-card to-card p-3 text-left">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="mt-1 text-sm font-black">{sport.practiceLabel}</h3>
                <p className="mt-1 text-xs text-muted-foreground">Play a drill. Earn up to +2 OVR for camp.</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-2xl font-black text-primary">{career.ovr}<span className="ml-1 text-[10px] text-muted-foreground">OVR</span></p>
                <p className="text-[10px] text-muted-foreground">Ceiling {Math.min(99, career.pot)}</p>
              </div>
            </div>
            {career.practice?.year === career.year && <p className="mt-2 text-xs font-bold" data-practice-receipt>{trainingBankNote(career.practice)} OVR {career.practice.before} to {career.practice.ovr}. Session banked for {career.year}.</p>}
            <button ref={practiceButtonRef} onClick={openPractice} className="mt-3 min-h-11 w-full rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:opacity-90">
              {trainingSessionOpen(career.practice?.year, career.year) ? 'Start practice' : 'View practice'}
            </button>
            <p className="mt-2 text-[10px] text-muted-foreground">One banked session each season. Your ceiling still applies.</p>
            {practiceOpen && <Suspense fallback={<p role="status">Opening practice...</p>}>
              <UsCareerPractice sport={sport} pos={career.pos}
                available={trainingSessionOpen(career.practice?.year, career.year)}
                result={career.practice?.year === career.year ? career.practice : undefined}
                onComplete={bankPractice} onClose={closePractice} />
            </Suspense>}
          </section>
          {career.seasons.length >= 6 && (
            <USCareerActionConfirm action="retire" sport={sport.label} onConfirm={retireNow}>
              <button className="mt-2 min-h-11 min-w-11 text-[11px] text-muted-foreground hover:text-destructive">Hang them up now</button>
            </USCareerActionConfirm>
          )}
        </div>
      )}

      {/* Round 208: the same boxes the rest of the site opens on, and every
          one of them now carries the fact you used to have to tap for. */}
      <div ref={hubButtons} data-career-hub-buttons=""><HubTiles tiles={hubTilesWithInbox} onOpen={k => {
        if (k === 'log') reviewHubIndex.current = hubTilesWithInbox.findIndex(tile => tile.key === 'log');
        setPanel(k as typeof panel);
      }} /></div>

    </div>
  );
}

/* ─── Round 56: the money panel ───
   Seven aisles of things to spend it on, plus a Shady aisle that only shows up
   once you actually have something to hide. Gates mirror each sport's buy function exactly so
   a button never lies about what it will do. The aisles are the same in every
   sport; what is on the shelves is the sport's own (sport.shopItems). */
type ShopAisle = 'home' | 'ride' | 'invest' | 'body' | 'flex' | 'family' | 'shady';
function UsShopPanel({ stock, career, onBuy }: { stock: UsShopItem[]; career: CareerState; onBuy: (id: string) => void }) {
  const [tab, setTab] = useState<ShopAisle>('home');
  const cats: { key: ShopAisle; label: string; emoji: string }[] = [
    { key: 'home', label: 'Home', emoji: '🏡' },
    { key: 'ride', label: 'Rides', emoji: '🏎️' },
    { key: 'invest', label: 'Invest', emoji: '📈' },
    { key: 'body', label: 'Body', emoji: '💪' },
    { key: 'flex', label: 'Flex', emoji: '💎' },
    { key: 'family', label: 'Family', emoji: '❤️' },
    { key: 'shady', label: 'Shady', emoji: '🕶️' },
  ];
  const hasDirt = (career.heat ?? 0) > 0 || (career.dirtyMoney ?? 0) > 0;
  const visible = cats.filter(c => c.key !== 'shady' || hasDirt);
  const owned = career.purchased ?? [];
  const net = career.netWorth ?? 0;
  const items = stock.filter(i => i.category === tab);

  return (
    <div className="space-y-2 rounded-2xl border border-border bg-card p-3">
      <div className="flex items-center justify-between text-[11px]">
        <span className="font-bold uppercase tracking-wider text-muted-foreground">💰 Your money</span>
        <span className="text-muted-foreground">
          Banked <b className="text-primary">${net.toFixed(1)}M</b>
          {(career.yearlyCosts ?? 0) > 0 && <> · Upkeep <b className="text-destructive">${(career.yearlyCosts ?? 0).toFixed(2)}M/yr</b></>}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-1">
        {visible.map(c => (
          <button
            key={c.key}
            onClick={() => setTab(c.key)}
            className={cn(
              'rounded-lg px-1 py-1.5 text-[11px] font-bold transition-all',
              tab === c.key
                ? c.key === 'shady' ? 'bg-destructive/20 text-destructive' : 'bg-primary/15 text-primary'
                : 'bg-secondary text-muted-foreground hover:text-foreground',
            )}
          >
            {c.emoji} {c.label}
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        {items.map(item => {
          const isOwned = item.oneTime && owned.includes(item.id);
          const needsNet = item.minNetWorth && net < item.minNetWorth;
          const needsFame = item.minFanbase && career.fanbase < item.minFanbase;
          const needsDirty = item.requiresDirty && (career.dirtyMoney ?? 0) <= 0;
          const tooPoor = item.cost > net;
          const disabled = !!(isOwned || needsNet || needsFame || needsDirty || tooPoor);
          const lock = needsFame ? `Needs ${item.minFanbase} fanbase`
            : needsDirty ? 'Needs untraceable money to move'
            : needsNet ? `Needs $${item.minNetWorth}M banked`
            : tooPoor ? 'Cannot afford it yet' : null;
          return (
            <div key={item.id} className={cn('rounded-lg border p-2', isOwned ? 'border-primary/30 bg-primary/5' : disabled ? 'border-border/50 bg-secondary/40 opacity-60' : 'border-border bg-secondary/60')}>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                    <span>{item.emoji}</span>
                    <span className="truncate">{item.name}</span>
                    {isOwned && <span className="rounded bg-primary/20 px-1 py-0.5 text-[9px] font-bold text-primary">OWNED</span>}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{item.desc}</p>
                  {item.effect && <p className="mt-0.5 text-[11px] text-gold">⚡ {item.effect}</p>}
                  {!isOwned && lock && <p className="mt-0.5 text-[11px] text-destructive/80">🔒 {lock}</p>}
                  {item.yearly ? <p className="mt-0.5 text-[10px] text-muted-foreground">+ ${item.yearly.toFixed(2)}M a year upkeep</p> : null}
                </div>
                {!isOwned && (
                  <button
                    onClick={() => onBuy(item.id)}
                    disabled={disabled}
                    className={cn(
                      'shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all',
                      disabled ? 'cursor-not-allowed bg-secondary text-muted-foreground' : 'bg-primary text-primary-foreground hover:opacity-90 active:scale-95',
                    )}
                  >
                    {item.cost > 0 ? `$${item.cost}M` : 'Hire'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
