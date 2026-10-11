import { jsxDEV as _jsxDEV, Fragment as _Fragment } from "react/jsx-dev-runtime";
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Crown, Dumbbell, RotateCcw, Sparkles } from 'lucide-react';
import ShareButtons from '@/components/game/ShareButtons';
import UsCareerProgramme from '@/components/us-career/UsCareerProgramme';
import { expireUsCareerProgramme, prepareUsCareerProgramme, restoreUsCareerProgramme, settleUsCareerProgramme } from '@/lib/usCareerProgramme';
// Round 179: real free agency, shared engine and shared screen.
import { applyFaSigning, oneYearWindow } from '@/lib/usCareerFreeAgency';
import FreeAgencyPanel from '@/components/us-career/FreeAgencyPanel';
/* Round 207: the extension talk, shared engine and shared card. */ import { extensionDue } from '@/lib/usCareerExtension';
import { acknowledgeMarketWheel, declineMarketExtension, extensionMarketProbabilities, freeAgencyMarketProbabilities, openMarketExtension, openMarketFreeAgency, pushMarketExtension, pushMarketFreeAgency, restoreMarketTalk } from '@/lib/usCareerMarket';
import ExtensionCard from '@/components/us-career/ExtensionCard';
// Round 186: the season curtain, shared engine and shared card.
import { buildSeasonReveal, draftPressureLine } from '@/lib/usCareerReveal';
import { SeasonRevealCard } from '@/components/us-career/SeasonRevealCard';
import { UsSeasonCentreEntry } from '@/components/us-career/season/UsSeasonCentreEntry';
import { holdPendingSave } from '@/lib/safeStorage';
/* Round 530: draft day as a moment, and the retirement card on the same
   celebration kit the season curtain uses. */ import DraftDayCard from '@/components/us-career/DraftDayCard';
import USCareerActionConfirm from '@/components/us-career/USCareerActionConfirm';
import UsCareerSaveNotice from '@/components/us-career/UsCareerSaveNotice';
import { CelebrationStyles, revealDelay } from '@/components/club-manager/Celebration';
import { defaultAppearance } from '@/lib/soccerCareerAppearance';
import PlayerAvatar from '@/components/soccer-career/PlayerAvatar';
import AppearanceBuilder from '@/components/soccer-career/AppearanceBuilder';
import { Confetti } from '@/components/soccer-career/CareerFx';
import { useGameCompletion } from '@/hooks/useGameCompletion';
import { markRestoredFinish } from '@/lib/restoredFinish';
import { recordActivity } from '@/lib/completions';
import { useRevealScroll } from '@/hooks/useRevealScroll';
import CoachCareerPanel, { CoachStartCard } from '@/components/us-career/CoachCareerPanel';
import { startCoachCareer, ensureCoachCareer } from '@/lib/usCoachCareer';
/* Round 208: the hub boxes, shared with the front offices and Club
   Manager, and the trophy case they now open onto. */ import { careerHubTiles } from '@/lib/careerHub';
import { HubTiles, HubPanelHeader } from '@/components/hub/HubTiles';
import TrophyCase from '@/components/us-career/TrophyCase';
/* Round 469: the money app, the gram, the rival card and the badges, on the
   same engines Soccer Career runs (careerMoney, careerSocial, careerBadges),
   bound per sport (nflCareerMoney.ts, nflCareerLoop.ts and their siblings). */ import MoneyApp from '@/components/us-career/MoneyApp';
import { SocialGram, RivalCard, BadgeGrid } from '@/components/us-career/SocialPanel';
import { fmtFollowers, pushHeadlines } from '@/lib/careerSocial';
/* Round 521: the inbox and the rivalry events, the same engines the
   flagship runs (careerInbox.ts, careerRivalryEvents.ts), bound per
   sport (nflCareerInbox.ts, nflCareerRivalryEvents.ts and their siblings). */ import { InboxPanel } from '@/components/us-career/InboxPanel';
import { RivalryEventCard } from '@/components/us-career/RivalryEventCard';
/* Round 796: the rival choice card, and the inbox on the sport's own calendar. */ import { RivalryChoiceCard } from '@/components/us-career/RivalryChoiceCard';
import { cn } from '@/lib/utils';
import ProspectJourney, { ProspectRecord } from '@/components/us-career/ProspectJourney';
import { createUsCareerProspect, loadUsCareerProspect } from '@/lib/usCareerProspect';
import { loadPreDraft } from '@/lib/careerPreDraft';
import { keyedRng } from '@/lib/keyedRng';
import { bankTrainingRating, trainingBankNote, trainingScore, trainingSessionOpen } from '@/lib/careerTraining';
import { buildCareerDecisionOutcome } from '@/lib/usCareerDecisionOutcome';
import CareerDecisionOutcome from '@/components/us-career/CareerDecisionOutcome';
import { answerSummerCard, newSummerSalt, repairSummerOnLoad, seekSummerCard, startSummer, summerOn, summerPlace } from '@/lib/usCareerSummer';
import { answerTalk, endsAfterSeason, manualRetire, pendingTalk, repairHallOnLoad, talkDeckFilter } from '@/lib/usCareerRetirementFlow';
import { stampOnRetirement } from '@/lib/usCareerRetirementFlow';
import { isFarewellSeason } from '@/lib/careerRetirement';
import { hallRecordFor } from '@/lib/careerHallOfFame';
const UsCareerPractice = /*#__PURE__*/ lazy(()=>import('@/components/us-career/UsCareerPractice'));
const CareerSeasonReview = /*#__PURE__*/ lazy(()=>import('@/components/us-career/CareerSeasonReview'));
/* Round 1039: the retirement talk, the farewell banner and the Hall card load
   with the moment they belong to; the speech (careerAwardsNight) rides only
   with the Hall card. */ const FarewellCard = /*#__PURE__*/ lazy(()=>import('@/components/career/FarewellCard').then((m)=>({
            default: m.FarewellCard
        })));
const FarewellSeasonBanner = /*#__PURE__*/ lazy(()=>import('@/components/career/FarewellCard').then((m)=>({
            default: m.FarewellSeasonBanner
        })));
const HallOfFameCard = /*#__PURE__*/ lazy(()=>import('@/components/career/HallOfFameCard').then((m)=>({
            default: m.HallOfFameCard
        })));
/** Round 1144: how long the toast that says a save was refused stays, with its Retry on it. */ const SAVE_TOAST_MS = 10000;
/** A toast's button is 24 px tall as it comes (measured: 48 by 24). This one is the way to save a
 *  career from a phone, so it gets a thumb's room, the same 44 px the notice's Retry save has. */ const SAVE_TOAST_BUTTON = {
    height: 44,
    minWidth: 64,
    paddingLeft: 14,
    paddingRight: 14,
    fontSize: 13
};
export default function UsCareerBoard({ sport }) {
    const pendingSave = useRef(null);
    const [saveFailure, setSaveFailure] = useState(null);
    const saveFailed = saveFailure !== null;
    useEffect(()=>{
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
       the button they sit next to. */ const said = toast.error('Your latest changes could not be saved. Stay on this page and use Retry save.', {
            description: 'Retry here does the same thing.',
            duration: SAVE_TOAST_MS,
            action: {
                label: 'Retry',
                onClick: (event)=>{
                    event.preventDefault();
                    retrySave();
                }
            },
            actionButtonStyle: SAVE_TOAST_BUTTON
        });
        /* Release AN: the words are taken back the moment they stop being true.
       A Retry save that worked left them on screen for the rest of their few
       seconds, saying the changes could not be saved, and they followed the
       player to Home and back, where nothing is pending and there is no Retry
       button to use. */ return ()=>{
            toast.dismiss(said);
        };
    }, [
        saveFailed
    ]);
    const [phase, setPhase] = useState('create');
    const [prospect, setProspect] = useState(null);
    const prospectRef = useRef(null);
    const [prospectNotice, setProspectNotice] = useState('');
    const focusCareerEntry = useRef(false);
    const careerEntryButton = useRef(null);
    // Round 56: build your player's face before the draft
    const [appearance, setAppearance] = useState(()=>defaultAppearance());
    // Round 85: the tile rule. The season hub is boxes; each opens its own screen.
    const [panel, setPanel] = useState('none');
    const [retiredReview, setRetiredReview] = useState(false);
    const reviewReturn = useRef(null);
    const reviewHubIndex = useRef(0);
    const hubButtons = useRef(null);
    const retiredReviewButton = useRef(null);
    useEffect(()=>{
        if (!reviewReturn.current) return;
        const target = reviewReturn.current === 'retired' ? retiredReviewButton.current : hubButtons.current?.querySelectorAll('button')[reviewHubIndex.current];
        target?.focus({
            preventScroll: true
        });
        reviewReturn.current = null;
        if (!target) return;
        const frame = requestAnimationFrame(()=>{
            const box = target.getBoundingClientRect();
            if (box.top < 0 || box.bottom > window.innerHeight) target.scrollIntoView({
                block: 'nearest',
                behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
            });
        });
        return ()=>cancelAnimationFrame(frame);
    }, [
        panel,
        retiredReview
    ]);
    /* Round 469: the News box opens on three screens, the paper, the gram and
     the rival, so the hub keeps its five boxes (simCareerHub holds that). */ const [newsTab, setNewsTab] = useState('headlines');
    const [career, setCareer] = useState(null);
    const careerEntryScreen = useRevealScroll(career?.prospect?.seed, {
        enabled: phase === 'season' && !!career?.prospect && career.seasons.length === 0
    });
    useEffect(()=>{
        if (phase === 'season' && focusCareerEntry.current) {
            focusCareerEntry.current = false;
            careerEntryButton.current?.focus({
                preventScroll: true
            });
        }
    }, [
        phase
    ]);
    const [practiceOpen, setPracticeOpen] = useState(false);
    const practiceBankedRef = useRef(false);
    const practiceButtonRef = useRef(null);
    const [teamQuality, setTeamQuality] = useState(null);
    const [nameInput, setNameInput] = useState('');
    /* Round 172: which league you are drafted into. */ const [eraId, setEraId] = useState('now');
    const [pos, setPos] = useState(sport.create.defaultPos);
    const [archetypeId, setArchetypeId] = useState(sport.create.archetypes[sport.create.defaultPos][0].id);
    const [feed, setFeed] = useState([]);
    const [pendingEvent, setPendingEvent] = useState(null);
    const [decisionOutcome, setDecisionOutcome] = useState(null);
    const consumedEvent = useRef(null);
    /* Round 1038: the summer slot ('year:at') the last answer spent, so a
     double tap can never apply two cards of one summer. */ const consumedSlot = useRef(null);
    const decisionReturn = useRef(false);
    useEffect(()=>{
        if (phase !== 'season') {
            setDecisionOutcome(null);
            decisionReturn.current = false;
        }
    }, [
        phase
    ]);
    useEffect(()=>{
        if (decisionOutcome || !decisionReturn.current) return;
        decisionReturn.current = false;
        const target = careerEntryButton.current;
        target?.focus({
            preventScroll: true
        });
        if (!target) return;
        const frame = requestAnimationFrame(()=>{
            const box = target.getBoundingClientRect();
            if (box.top < 0 || box.bottom > window.innerHeight) target.scrollIntoView({
                block: 'nearest',
                behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
            });
        });
        return ()=>cancelAnimationFrame(frame);
    }, [
        decisionOutcome
    ]);
    const [lastLine, setLastLine] = useState(null);
    /* Offers and negotiations are saved for this exact unplayed contract year. */ const [faWindow, setFaWindow] = useState(null);
    const [extTalk, setExtTalk] = useState(null);
    /* Set when you have turned an extension down, so the same season
     does not ask twice. Cleared the moment a season is actually played. */ const extDeclinedRef = useRef(false);
    const [talkLine, setTalkLine] = useState(null);
    const [marketTalk, setMarketState] = useState(null);
    const marketRef = useRef(null);
    const setMarketTalk = useCallback((next)=>{
        marketRef.current = next;
        setMarketState(next);
        setExtTalk(next?.kind === 'extension' && !next.declined ? next.talk : null);
        setFaWindow(next?.kind === 'freeagency' ? next.window : null);
        setTalkLine(next?.reply ?? null);
    }, []);
    /* Round 186: the season curtain. Transient like the market window: never
     persisted, so a reload mid-reveal opens on the save's real screen. */ const [reveal, setReveal] = useState(null);
    /* Round 530: draft day. The same three strings create() pushes into the
     feed, held for the card until the first season is played. Transient
     like the curtain: a reload lands on the plain hub. */ const [draftDay, setDraftDay] = useState(null);
    /* Round 530 review: which inbox rows this save has already shown. It lives
     here rather than in InboxPanel because the panel is mounted only while the
     inbox tab is open, so a set inside it started empty on every open and
     replayed the whole list with nothing new in it. */ const inboxSeenRef = useRef(new Set());
    /* Round 796: what a rival choice did, shown on the card until Continue.
     Transient like the curtain: the answer is already on the save, so a
     reload lands on the hub with the choice made. */ const [rivalryOutcome, setRivalryOutcome] = useState(null);
    /* Round 126: the coaching career. It lives in a ref as well as in state so
     persist can always write the current one without every existing call site
     having to learn about it. */ const [coach, setCoach] = useState(null);
    const [coachFeed, setCoachFeed] = useState([]);
    const coachRef = useRef(null);
    // Round 61: the owner's no scroll rule. When a new crossroads or a new
    // season result lands, it pulls itself into view instead of rendering
    // below the fold where a phone player never sees it.
    const revealRef = useRevealScroll(`${phase}:${pendingEvent?.id ?? ''}:${career?.seasons.length ?? 0}`);
    /* Round 470: opening a hub box is a new screen, so it obeys the owner's no
     scroll rule like every other one. Measured on a 390 by 844 phone before
     this line existed: tapping News from the bottom of the hub left the page
     at scrollY 443 with the panel's own back button 246px above the fold, so
     the player landed underneath the screen he had just opened. The hook does
     nothing when the top of the panel is already readable. */ const panelRef = useRevealScroll(`${panel}:${newsTab}`);
    /* Round 643: the coaching career comes after retirement, so it is still a
     finished playing career. With done on the retired screen alone, every
     Resume coaching then Back went false then true and paid the whole legacy
     again. The same shape in all four My Career boards. */ const done = phase === 'retired' || phase === 'coach';
    useGameCompletion(sport.gameSlug, done, career ? sport.legacyOf(career).score : 0);
    /* Round 1039: the Hall record is derived (src/lib/careerHallOfFame.ts says
     why), so a retired save from before the bind gets its ballot on its next
     visit. hallLanded holds the Hall pill and the confetti until the card's
     last ballot has landed; hallFolded is Continue on that card. */ const hallRecord = useMemo(()=>phase === 'retired' && career?.retired && sport.hall ? hallRecordFor(sport.hall, career) : null, [
        phase,
        career,
        sport
    ]);
    const [hallLanded, setHallLanded] = useState(false);
    const [hallFolded, setHallFolded] = useState(false);
    useEffect(()=>{
        setHallLanded(false);
        setHallFolded(false);
    }, [
        sport,
        career?.name,
        career?.retired
    ]);
    useEffect(()=>{
        pendingSave.current = null;
        setSaveFailure(null);
        setDecisionOutcome(null);
        consumedEvent.current = null;
        decisionReturn.current = false;
        try {
            const raw = localStorage.getItem(sport.saveKey);
            if (!raw) return;
            const s = JSON.parse(raw);
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
            /* Round 182, repair-on-load: a pre-182 career was a de facto starter. */ if (!s.c.role) s.c.role = 'starter';
            if (s.c.prospect && (!loadPreDraft(s.c.prospect) || s.c.prospect.sport !== sport.slug)) delete s.c.prospect;
            /* Round 422: rebuild a balance the pre 422 bug drove below zero. Costs
         were charged every year against income that was never banked, so a
         negative number here is the defect and never a debt the player chose.
         A healthy save is returned untouched. */ const loaded = sport.repairNetWorth(s.c);
            /* Round 1038: the summer, the ledger and the salt are each checked
         alone, and a broken one is dropped alone. Old saves have none. */ repairSummerOnLoad(loaded);
            /* Round 1039: the retirement answers, the speech and the recorded jersey,
         each checked alone. Old saves have none. */ repairHallOnLoad(loaded);
            setCareer(loaded);
            setTeamQuality(s.teamQuality);
            /* Round 126, house pattern from ensureContracts and ensureAcademy in
         clubManager.ts: repair whatever is on disk instead of trusting it. A
         save written before this round has no coaching career at all, comes
         back null, and opens on the retirement screen with one new button. */ const co = ensureCoachCareer(s.coach, sport.slug);
            coachRef.current = co;
            setCoach(co);
            const restoredPhase = !s.c.retired ? 'season' : s.phase === 'coach' && co ? 'coach' : 'retired';
            if (restoredPhase !== 'season') markRestoredFinish(sport.gameSlug);
            const heldTalk = restoreMarketTalk(s.contractTalk, loaded, sport.slug);
            setMarketTalk(heldTalk);
            extDeclinedRef.current = heldTalk?.kind === 'extension' && heldTalk.declined;
            if (heldTalk && !(heldTalk.kind === 'extension' && heldTalk.declined)) {
                setPhase(heldTalk.kind === 'extension' ? 'extension' : 'freeagency');
                return;
            }
            /* Round 1038: a save in the middle of a summer opens on the card it
         left, rebuilt from the save by the same computation that first showed
         it. A summer whose cards have all moved past ends here, and the team
         quality roll its last answer would have made is made now. */ if (restoredPhase === 'season' && loaded.summer) {
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
        } catch  {}
    }, [
        sport
    ]);
    const retrySave = useCallback(()=>{
        const pending = null;
        if (!pending || pending.key !== sport.saveKey) return;
        try {
            if (pending.value === null) localStorage.removeItem(pending.key);
            else localStorage.setItem(pending.key, pending.value);
            pendingSave.current = null;
            setSaveFailure(null);
        } catch  {
            setSaveFailure(pending.value === null ? 'remove' : 'write');
        }
    }, [
        sport.saveKey
    ]);
    /* Round 1144: while a save is refused the storage seam knows one is
     waiting here, so a reload the app makes on its own account (a new build,
     a stale chunk, the Season Center tile's Reload) retries it once first and
     stays on the page while it is still refused. The retry is the one above,
     untouched; the answer is whether anything is still waiting after it. */ useEffect(()=>{
        if (!saveFailed) return;
        return holdPendingSave(()=>{
            retrySave();
            return pendingSave.current === null;
        });
    }, [
        saveFailed,
        retrySave
    ]);
    const saveValue = useCallback((value)=>{
        pendingSave.current = {
            key: sport.saveKey,
            value
        };
        retrySave();
    }, [
        sport.saveKey,
        retrySave
    ]);
    const persist = useCallback((c, ph, tq)=>{
        expireUsCareerProgramme(c);
        if (sport.hall) stampOnRetirement(c, sport.saveKey); // Round 1051: the calibration stamp, on the write that retires a career
        /* Release AO: the stamp stays above the write. Round 1084's saveValue holds the write's try (and the retry
       of a refused one), so the stamped career is what gets serialised, first time and on every retry. */ const heldTalk = restoreMarketTalk(marketRef.current, c, sport.slug);
        if (!heldTalk && marketRef.current) setMarketTalk(null);
        saveValue(JSON.stringify({
            c,
            phase: ph,
            teamQuality: tq,
            coach: coachRef.current,
            ...heldTalk ? {
                contractTalk: heldTalk
            } : {}
        }));
    }, [
        sport,
        saveValue,
        setMarketTalk
    ]);
    const openPractice = ()=>{
        if (!career || phase !== 'season') return;
        practiceBankedRef.current = false;
        setPracticeOpen(true);
    };
    const closePractice = ()=>{
        practiceBankedRef.current = true;
        setPracticeOpen(false);
        practiceButtonRef.current?.focus({
            preventScroll: true
        });
    };
    const bankPractice = (drill, rawScore)=>{
        if (!career || !practiceOpen || phase !== 'season' || career.retired || practiceBankedRef.current || !trainingSessionOpen(career.practice?.year, career.year)) return;
        // Consume the tap immediately, before a second event can use this render.
        practiceBankedRef.current = true;
        const score = trainingScore(rawScore);
        const bank = bankTrainingRating(career.ovr, career.pot, score);
        const c = {
            ...career,
            ovr: bank.ovr,
            practice: {
                ...bank,
                year: career.year,
                drill,
                score,
                before: career.ovr
            }
        };
        setCareer(c);
        setFeed((f)=>[
                `Practice: ${trainingBankNote(bank)}`,
                ...f
            ].slice(0, 8));
        persist(c, 'season', teamQuality);
    };
    const saveProspect = (next)=>{
        prospectRef.current = next;
        setProspect(next);
        setPhase('prospect');
        saveValue(JSON.stringify({
            c: null,
            phase: 'prospect',
            teamQuality: null,
            coach: null,
            prospect: next
        }));
    };
    const beginProspect = ()=>{
        if (prospectRef.current) return;
        saveProspect(createUsCareerProspect(sport, {
            name: nameInput.trim() || sport.create.defaultName,
            pos,
            archetypeId,
            eraId,
            appearance,
            seed: `${sport.slug}:${Math.floor(Math.random() * 0x100000000).toString(36)}`
        }));
    };
    const advanceProspect = (next)=>{
        // The render that offered the choice can consume it only once.
        if (!prospect || prospectRef.current !== prospect || next === prospect.state) return;
        saveProspect({
            ...prospect,
            state: next
        });
    };
    const joinCareer = ()=>{
        const pending = prospectRef.current;
        if (!pending || pending !== prospect || pending.state?.phase !== 'done' || !pending.state.draft) return;
        const state = pending.state;
        const outcome = pending.state.draft;
        const arch = sport.create.archetypes[pending.pos].find((a)=>a.id === pending.archetypeId);
        const rng = keyedRng(`${pending.seed}|career`);
        const c = sport.startCareer(pending.name, pending.pos, arch, rng, pending.appearance, pending.eraId, {
            ...outcome,
            pot: state.pot,
            health: outcome.devSeasons.length ? 100 : state.health,
            prospect: state
        });
        const tq = sport.rollTeamQuality(null, rng);
        const roleNote = sport.assignRole(c, tq, rng);
        /* Round 1038: the summer's salt, last off this career's own stream. */ if (summerOn(sport.summer)) c.summerSalt = newSummerSalt(rng);
        if (c.draftPick > 0 && outcome.devSeasons.length === 0) sport.draftNightInbox(c);
        const team = sport.teamLabelOf(c.team, c.eraId);
        setFeed([
            c.draftPick > 0 ? `With pick ${c.draftPick}, the ${team} select ${c.name}.` : `${c.name} joins ${team} as an undrafted signing.`,
            draftPressureLine(c.draftPick, sport.preDraft(pending.eraId).teamIds().length),
            roleNote
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
    const create = ()=>{
        const arch = sport.create.archetypes[pos].find((a)=>a.id === archetypeId) ?? sport.create.archetypes[pos][0];
        const c = sport.startCareer(nameInput.trim() || sport.create.defaultName, pos, arch, Math.random, appearance, eraId);
        const tq = sport.rollTeamQuality(null, Math.random);
        /* Round 182: the depth chart is set the day you arrive. */ const roleNote = sport.assignRole(c, tq, Math.random);
        /* Round 796: draft night's text lands before a down is played, drawn
       from the inbox's own keyed stream. */ sport.draftNightInbox(c);
        /* Round 1038: the summer's salt, drawn after everything else the day
       you arrive draws. The one card knob draws nothing here. */ if (summerOn(sport.summer)) c.summerSalt = newSummerSalt(Math.random);
        setCareer(c);
        setTeamQuality(tq);
        const pressureLine = draftPressureLine(c.draftPick, sport.firstRoundEnd);
        setFeed([
            `🎓 With pick ${c.draftPick}, the ${sport.teamLabelOf(c.team)} select ${c.name}.`,
            pressureLine,
            roleNote
        ]);
        /* Round 530: the same facts, given a moment. */ setDraftDay({
            pick: c.draftPick,
            teamLabel: sport.teamLabelOf(c.team),
            playerName: c.name,
            lines: [
                pressureLine,
                roleNote
            ],
            firstRoundEnd: sport.firstRoundEnd
        });
        setPhase('season');
        persist(c, 'season', tq);
    };
    /* Release AN: the career the last press of Play left a played season on,
     for the Week by week entry beside Play. The entry reads the season back
     from the save, and a browser whose storage is full refused that write and
     gave it nothing to open. This is the very object the save was asked to
     keep. Null after a press that played no season (a talk, the market, a
     banned year). */ const playedRef = useRef(null);
    const playSeason = ()=>{
        playedRef.current = null;
        if (!career || teamQuality == null || practiceOpen) return;
        /* Round 195: a played season counts as playing TODAY, the Round 159
       soccer rule reaching the American careers. Unscored on purpose: the
       scored completion stays the retirement legacy. */ recordActivity(`/${sport.gameSlug}`);
        const c = JSON.parse(JSON.stringify(career));
        // Round 56: an indefinite suspension costs the whole season. It still
        // counts as a year of your life, so you age, decline and lose the money.
        if ((c.suspendedSeasons ?? 0) > 0) {
            c.suspendedSeasons = (c.suspendedSeasons ?? 0) - 1;
            const banned = sport.suspendedLine(c);
            c.seasons.push(banned);
            c.headlines = pushHeadlines(c.headlines, sport.headlinesFor(c, banned));
            const banNotes = sport.progress(c, Math.random);
            settleUsCareerProgramme(c, banned, sport.slug);
            setLastLine(banned);
            setCareer(c);
            setFeed([
                sport.suspendedNote,
                ...banNotes
            ]);
            /* Round 186: even a banned year gets its card, muted on purpose. */ setReveal(buildSeasonReveal({
                year: banned.year,
                subHeader: `${sport.teamLabelOf(banned.team, c.eraId)} · age ${banned.age} · ${c.pos}`,
                teamResult: 'SUSPENDED',
                statLine: '',
                campNote: null,
                notes: [],
                progressNotes: banNotes
            }));
            /* Round 1039: a farewell or a retirement he chose ends the career even on
         a banned year: the card said whatever the numbers say. */ if (endsAfterSeason(c, banned.year)) {
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
       card and let you play years on an expired contract. */ /* Round 207: the last year of a deal is a decision, not just another
       season. Offered before the season is played, because that is when a
       club and a player actually have this conversation. */ /* Round 1039: never in an announced farewell season. That season ends
       the career, so the card's "play the year out and reach free agency" is
       false, and signing would pay the last year at a rate for years that
       never come (MLB's deck farewell leaves exactly one year on the deal). */ const existingTalk = restoreMarketTalk(marketRef.current, c, sport.slug);
        if (existingTalk && !(existingTalk.kind === 'extension' && existingTalk.declined)) {
            setPhase(existingTalk.kind === 'extension' ? 'extension' : 'freeagency');
            return;
        }
        if (extensionDue(c) && !isFarewellSeason(c.retirement, c.year) && !extDeclinedRef.current) {
            setMarketTalk(openMarketExtension(c, sport.slug, sport.buildExtension(c, Math.random)));
            setPhase('extension');
            persist(c, 'extension', teamQuality);
            return;
        }
        extDeclinedRef.current = false;
        if (c.contractYears <= 0) {
            /* Round 1039: a farewell season's market offers one year. Cut after the
         build, so the draws are the same ones. */ const fa = sport.buildFaWindow(c, teamQuality, Math.random);
            setMarketTalk(openMarketFreeAgency(c, sport.slug, isFarewellSeason(c.retirement, c.year) ? oneYearWindow(fa) : fa));
            setPhase('freeagency');
            persist(c, 'freeagency', teamQuality);
            return;
        }
        /* Round 182: every season starts with a camp, and camps have losers. */ const campNote = sport.campBattle(c, teamQuality, Math.random);
        const programmePreparation = prepareUsCareerProgramme(c, sport.slug);
        const { line, notes } = sport.simSeason(c, teamQuality, Math.random);
        playedRef.current = c;
        restoreUsCareerProgramme(c, programmePreparation);
        const progressNotes = sport.progress(c, Math.random);
        settleUsCareerProgramme(c, line, sport.slug, programmePreparation);
        /* Round 469: the paper writes the season up, position aware, and the
       lines stay on the save so the News screen survives a reload. */ c.headlines = pushHeadlines(c.headlines, sport.headlinesFor(c, line));
        setLastLine(line);
        /* Round 186: the curtain. Every string in it is one the engine already
       wrote; the true stat line is on screen from frame one. */ setReveal(buildSeasonReveal({
            year: line.year,
            subHeader: `${sport.teamLabelOf(line.team, c.eraId)} · age ${line.age} · ${c.pos}`,
            teamResult: line.teamResult,
            statLine: statLine(line, c.pos),
            /* Round 1039: the last season of an announced farewell says so. */ campNote,
            notes: isFarewellSeason(c.retirement, line.year) ? [
                'Farewell season',
                ...notes
            ] : notes,
            progressNotes
        }));
        const newFeed = [
            ...campNote ? [
                campNote
            ] : [],
            ...notes,
            ...progressNotes
        ];
        /* Round 1039: a farewell he announced (on the talk or on a deck card) ends
       the career after its season, exactly as the hard stop does. */ if (sport.shouldRetire(c) || endsAfterSeason(c, line.year)) {
            c.retired = true;
            setCareer(c);
            setFeed(newFeed);
            setPhase('retired');
            persist(c, 'retired', teamQuality);
            return;
        }
        /* Round 1038: the summer. On the one card knob this is exactly the old
       sport.drawEvent(c, Math.random) and writes nothing onto c. */ /* Round 1039: while the retirement talk is pending, the deck's own
       retirement cards are held out of this offseason, so it never asks twice
       (src/lib/usCareerRetirementFlow.ts). With no Hall bound nothing is held. */ const ev = startSummer(c, sport, Math.random, talkDeckFilter(c, sport.hall));
        if (!ev) {
            /* Only a summer can deal nothing (every card it dealt has already moved
         past); the offseason then ends as an answered one does. */ const tq = sport.rollTeamQuality(teamQuality, Math.random);
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
     quality is rolled once, after the last card. */ const chooseSummerOption = (idx)=>{
        if (!career?.summer || !pendingEvent) return;
        const slot = `${career.summer.year}:${career.summer.at}`;
        if (consumedSlot.current === slot) return;
        consumedSlot.current = slot;
        consumedEvent.current = pendingEvent;
        const c = JSON.parse(JSON.stringify(career));
        const { line, next } = answerSummerCard(c, sport, pendingEvent, idx, Math.random, talkDeckFilter(c, sport.hall));
        const tq = next ? teamQuality : sport.rollTeamQuality(teamQuality, Math.random);
        setTeamQuality(tq);
        setCareer(c);
        setDecisionOutcome(buildCareerDecisionOutcome({
            title: pendingEvent.title,
            choice: pendingEvent.options[idx].label,
            before: career,
            after: c,
            teamLabel: sport.teamLabelOf
        }));
        setFeed((f)=>[
                line,
                ...f
            ].slice(0, 6));
        setPendingEvent(null);
        if (next) {
            persist(c, 'event', tq);
            return;
        }
        setPhase('season');
        persist(c, 'season', tq);
    };
    /* Round 1038: Continue on an outcome inside a summer opens the card the
     save already stands on, rebuilt from the save. */ const openNextSummerCard = ()=>{
        if (!career?.summer) return;
        const c = JSON.parse(JSON.stringify(career));
        const card = seekSummerCard(c, sport, talkDeckFilter(c, sport.hall));
        if (!card) return;
        consumedEvent.current = null;
        setPendingEvent(card);
    };
    const chooseOption = (idx)=>{
        if (!career || !pendingEvent || phase !== 'event' || consumedEvent.current === pendingEvent || !pendingEvent.options[idx]) return;
        if (career.summer) {
            chooseSummerOption(idx);
            return;
        }
        consumedEvent.current = pendingEvent;
        const c = JSON.parse(JSON.stringify(career));
        const outcome = pendingEvent.options[idx].apply(c, Math.random);
        const tq = sport.rollTeamQuality(teamQuality, Math.random);
        setTeamQuality(tq);
        setCareer(c);
        setDecisionOutcome(buildCareerDecisionOutcome({
            title: pendingEvent.title,
            choice: pendingEvent.options[idx].label,
            before: career,
            after: c,
            teamLabel: sport.teamLabelOf
        }));
        setFeed((f)=>[
                outcome,
                ...f
            ].slice(0, 6));
        setPendingEvent(null);
        setPhase('season');
        persist(c, 'season', tq);
    };
    /* Round 179: the market handlers. Signing writes the offer onto the career
     and the offer's roster quality becomes the real teamQuality the sim runs
     on, so the choice is the consequence. */ /* Round 207: the three answers to an extension. Signing writes the deal
     onto the career (the year being played plus the new years); pushing
     spends the one negotiation; turning it down plays the season out, which
     is what sends you to free agency next summer. */ const signExt = ()=>{
        const held = marketRef.current;
        if (!career || held?.kind !== 'extension' || held.declined || !held.talk.offer || held.wheel && !held.wheel.seen) return;
        const c = JSON.parse(JSON.stringify(career));
        const o = held.talk.offer;
        setMarketTalk(null);
        c.contractYears = 1 + o.years;
        c.salary = o.salary;
        setCareer(c);
        setFeed((f)=>[
                `\u{1F58A}\uFE0F Extension signed: ${o.years} more year${o.years === 1 ? '' : 's'} at $${o.salary}M a year.`,
                ...f
            ].slice(0, 6));
        setExtTalk(null);
        setPhase('season');
        persist(c, 'season', teamQuality);
    };
    const pushExt = ()=>{
        const held = marketRef.current;
        if (!career || held?.kind !== 'extension' || held.declined || held.talk.pushed || !held.talk.offer) return;
        const next = pushMarketExtension(held, sport.extPushArgs(career, Math.random));
        if (next === held) return;
        setMarketTalk(next);
        persist(career, 'extension', teamQuality);
    };
    const declineExt = ()=>{
        const held = marketRef.current;
        if (!career || held?.kind !== 'extension' || held.declined || held.wheel && !held.wheel.seen) return;
        extDeclinedRef.current = true;
        setMarketTalk(declineMarketExtension(held));
        setPhase('season');
        persist(career, 'season', teamQuality);
        playSeason();
    };
    const signFa = (idx)=>{
        const held = marketRef.current;
        if (!career || held?.kind !== 'freeagency' || held.wheel && !held.wheel.seen) return;
        const offer = held.window.offers[idx];
        if (!offer || offer.gone) return;
        setMarketTalk(null);
        const c = JSON.parse(JSON.stringify(career));
        const line = applyFaSigning(c, offer);
        /* Round 182: the new locker room has its own depth chart. A star walks
       in as the starter; a 78 joining a 91 contender can find out the ring
       chase costs him the huddle. */ const roleNote = sport.campBattle(c, offer.quality, Math.random);
        setCareer(c);
        setTeamQuality(offer.quality);
        setFeed((f)=>[
                line,
                ...roleNote ? [
                    roleNote
                ] : [],
                ...f
            ].slice(0, 6));
        setFaWindow(null);
        setTalkLine(null);
        setPhase('season');
        persist(c, 'season', offer.quality);
    };
    const pushFa = (idx)=>{
        const held = marketRef.current;
        if (!career || held?.kind !== 'freeagency' || !held.window.offers[idx] || held.window.offers[idx].pushed || held.window.offers[idx].gone || held.wheel && !held.wheel.seen) return;
        const args = sport.faPushArgs(career, Math.random);
        const next = pushMarketFreeAgency(held, idx, isFarewellSeason(career.retirement, career.year) ? {
            ...args,
            maxYears: 1
        } : args);
        if (next === held) return;
        setMarketTalk(next);
        persist(career, 'freeagency', teamQuality);
    };
    const acknowledgeMarket = ()=>{
        const held = marketRef.current;
        if (!career || !held) return;
        const next = acknowledgeMarketWheel(held);
        if (next === held) return;
        setMarketTalk(next);
        persist(career, held.kind === 'extension' ? 'extension' : 'freeagency', teamQuality);
    };
    /* Round 469: every money tap rides on one handler, the way the soccer
     phone's does. The engine refuses rather than throws when the numbers do
     not work, so a refused tap changes nothing and writes nothing. Persisted
     as 'season' because the money app only opens from the hub. */ const handleMoney = (action)=>{
        if (!career) return;
        const c = JSON.parse(JSON.stringify(career));
        const res = sport.moneyAct(c, action);
        if (!res.ok) return;
        setCareer(c);
        const line = res.event ?? (res.toast ? `💰 ${res.toast}.` : null);
        if (line) setFeed((f)=>[
                line,
                ...f
            ].slice(0, 8));
        persist(c, 'season', teamQuality);
    };
    /* Round 521: the inbox's one write path, the same shape the flagship's
     phone uses. Refuses rather than throws when the message is already
     answered or does not exist, so a double tap changes nothing. */ const handleInboxAnswer = (msgId, choiceIdx)=>{
        if (!career) return;
        const c = JSON.parse(JSON.stringify(career));
        const line = sport.answerInbox(c, msgId, choiceIdx);
        if (line === null) return;
        setCareer(c);
        setFeed((f)=>[
                line,
                ...f
            ].slice(0, 8));
        persist(c, phase, teamQuality);
    };
    /* Round 521: dismissing a pending rivalry beat applies its effect and
     clears the card, the same {state, log} shape the shop's buy already
     returns. */ const dismissRivalry = ()=>{
        if (!career) return;
        const { state, lines } = sport.dismissRivalryEvent(career);
        setCareer(state);
        if (lines.length) setFeed((f)=>[
                ...lines,
                ...f
            ].slice(0, 8));
        persist(state, phase, teamQuality);
    };
    /* Round 796: answering a rival choice writes it to the save at once and
     keeps the card up to show what happened. A second tap finds nothing
     pending and changes nothing. */ const chooseRivalry = (choiceIdx)=>{
        if (!career?.pendingRivalryChoice) return;
        const card = career.pendingRivalryChoice;
        const res = sport.resolveRivalryChoice(career, choiceIdx, Math.random);
        if (!res) return;
        setCareer(res.state);
        setFeed((f)=>[
                res.line,
                ...f
            ].slice(0, 8));
        setRivalryOutcome({
            card,
            choiceIdx,
            line: res.line
        });
        persist(res.state, phase, teamQuality);
    };
    /* Round 1039: the answer to the retirement talk. Retire now ends the career
     on the season just played, and the offseason's card is dropped unapplied
     (its draw already happened, so no stream moves). One more year and the
     farewell go on to the card, or to the hub. */ const answerRetirementTalk = (choice)=>{
        if (!career || !pendingTalk(career, sport.hall)) return;
        const c = JSON.parse(JSON.stringify(career));
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
     with the Hall card, so it is fetched on the press (already loaded). */ const giveSpeech = (id)=>{
        const hall = sport.hall;
        if (!career || !hallRecord || !hall || career.hallSpeech?.speechId) return;
        const base = career;
        const rec = hallRecord;
        void import('@/lib/careerHallSpeech').then(({ giveHallSpeech })=>{
            const c = JSON.parse(JSON.stringify(base));
            c.hallSpeech = giveHallSpeech(base.hallSpeech, rec, hall.key(base), id);
            setCareer(c);
            persist(c, 'retired', teamQuality);
        });
    };
    const retireNow = ()=>{
        if (!career) return;
        const c = JSON.parse(JSON.stringify(career));
        /* Round 1039: 'Hang them up now' writes the last season played as the last.
       With no Hall bound (the parity replay) the save stays the old one. */ if (sport.hall) manualRetire(c);
        c.retired = true;
        setCareer(c);
        setPhase('retired');
        persist(c, 'retired', teamQuality);
    };
    const reset = ()=>{
        setMarketTalk(null);
        extDeclinedRef.current = false;
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
    /* Round 126: the second life. */ const startCoaching = ()=>{
        if (!career) return;
        const co = startCoachCareer(sport.slug, career, career.year, Math.random);
        coachRef.current = co;
        setCoach(co);
        setCoachFeed([
            co.offerNote
        ]);
        setPhase('coach');
        persist(career, 'coach', teamQuality);
    };
    const openCoaching = ()=>{
        if (!career) return;
        setPhase('coach');
        persist(career, 'coach', teamQuality);
    };
    const onCoachChange = (next, notes)=>{
        if (!career) return;
        coachRef.current = next;
        setCoach(next);
        setCoachFeed((f)=>[
                ...notes,
                ...f
            ].slice(0, 6));
        persist(career, 'coach', teamQuality);
    };
    const leaveCoaching = ()=>{
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
     now, one branch per position the career deals. */ const statLine = sport.statLine;
    const withSaveStatus = (content)=>/*#__PURE__*/ _jsxDEV(_Fragment, {
            children: [
                saveFailure && /*#__PURE__*/ _jsxDEV(UsCareerSaveNotice, {
                    operation: saveFailure,
                    onRetry: retrySave
                }, void 0, false, {
                    fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                    lineNumber: 948,
                    columnNumber: 21
                }, this),
                content
            ]
        }, void 0, true);
    if (phase === 'prospect' && prospect) {
        return withSaveStatus(/*#__PURE__*/ _jsxDEV(ProspectJourney, {
            sport: sport,
            prospect: prospect,
            onChange: advanceProspect,
            onJoin: joinCareer,
            onBack: ()=>{
                if (prospect.state) return;
                setNameInput(prospect.name);
                setPos(prospect.pos);
                setArchetypeId(prospect.archetypeId);
                setEraId(prospect.eraId);
                setAppearance(prospect.appearance);
                prospectRef.current = null;
                setProspect(null);
                setPhase('create');
                saveValue(null);
            }
        }, void 0, false, {
            fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
            lineNumber: 953,
            columnNumber: 27
        }, this));
    }
    /* ------------------------------ create ------------------------------ */ if (phase === 'create' || !career) {
        return withSaveStatus(/*#__PURE__*/ _jsxDEV("div", {
            className: "space-y-4",
            children: [
                /*#__PURE__*/ _jsxDEV("div", {
                    className: "rounded-2xl border border-border bg-card p-4 text-center",
                    children: [
                        /*#__PURE__*/ _jsxDEV("p", {
                            className: "font-display text-lg font-bold text-foreground",
                            children: "Create your player"
                        }, void 0, false, {
                            fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                            lineNumber: 967,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ _jsxDEV("p", {
                            className: "mt-1 text-xs text-muted-foreground",
                            children: "You are a fictional prospect entering the real league. Position and archetype shape your whole career: growth, injuries, money, legacy. Saves automatically."
                        }, void 0, false, {
                            fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                            lineNumber: 968,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                    lineNumber: 966,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ _jsxDEV("div", {
                    className: "mx-auto max-w-md space-y-3",
                    children: [
                        /*#__PURE__*/ _jsxDEV("input", {
                            value: nameInput,
                            onChange: (e)=>setNameInput(e.target.value),
                            placeholder: "Your player's name",
                            "aria-label": "Your player name",
                            maxLength: 24,
                            className: "w-full rounded-xl border border-border bg-secondary px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                        }, void 0, false, {
                            fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                            lineNumber: 974,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ _jsxDEV("div", {
                            className: "grid grid-cols-2 gap-1.5",
                            children: sport.create.eras.map((e)=>/*#__PURE__*/ _jsxDEV("button", {
                                    onClick: ()=>setEraId(e.id),
                                    className: cn('rounded-xl border-2 px-3 py-2 text-left', eraId === e.id ? 'border-gold bg-gold/10' : 'border-border bg-card hover:border-primary/50'),
                                    children: [
                                        /*#__PURE__*/ _jsxDEV("span", {
                                            className: "block text-sm font-bold text-foreground",
                                            children: [
                                                e.id === 'now' ? `${sport.create.eraEmoji} ` : '⏪ ',
                                                e.label
                                            ]
                                        }, void 0, true, {
                                            fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                                            lineNumber: 995,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ _jsxDEV("span", {
                                            className: "block text-[10px] text-muted-foreground",
                                            children: e.blurb
                                        }, void 0, false, {
                                            fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                                            lineNumber: 996,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, e.id, true, {
                                    fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                                    lineNumber: 987,
                                    columnNumber: 15
                                }, this))
                        }, void 0, false, {
                            fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                            lineNumber: 985,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ _jsxDEV("div", {
                            className: sport.create.positionGridClass,
                            children: sport.create.positions.map((p)=>/*#__PURE__*/ _jsxDEV("button", {
                                    onClick: ()=>{
                                        setPos(p);
                                        setArchetypeId(sport.create.archetypes[p][0].id);
                                    },
                                    className: cn(sport.create.positionButtonClass, pos === p ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'),
                                    children: p
                                }, p, false, {
                                    fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                                    lineNumber: 1003,
                                    columnNumber: 15
                                }, this))
                        }, void 0, false, {
                            fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                            lineNumber: 1001,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ _jsxDEV(AppearanceBuilder, {
                            appearance: appearance,
                            onChange: setAppearance,
                            clubColor: sport.create.clubColor,
                            sport: sport.slug
                        }, void 0, false, {
                            fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                            lineNumber: 1012,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ _jsxDEV("div", {
                            className: "grid gap-1.5",
                            children: sport.create.archetypes[pos].map((a)=>/*#__PURE__*/ _jsxDEV("button", {
                                    onClick: ()=>setArchetypeId(a.id),
                                    className: cn('rounded-xl border-2 px-3 py-2 text-left', archetypeId === a.id ? 'border-gold bg-gold/10' : 'border-border bg-card hover:border-primary/50'),
                                    children: [
                                        /*#__PURE__*/ _jsxDEV("span", {
                                            className: "block text-sm font-bold text-foreground",
                                            children: a.label
                                        }, void 0, false, {
                                            fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                                            lineNumber: 1024,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ _jsxDEV("span", {
                                            className: "block text-[11px] text-muted-foreground",
                                            children: a.desc
                                        }, void 0, false, {
                                            fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                                            lineNumber: 1025,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, a.id, true, {
                                    fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                                    lineNumber: 1016,
                                    columnNumber: 15
                                }, this))
                        }, void 0, false, {
                            fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                            lineNumber: 1014,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ _jsxDEV("section", {
                            "data-career-prospect-entry": true,
                            className: "rounded-2xl border border-blue-300/50 bg-blue-950 p-4 text-white",
                            children: [
                                /*#__PURE__*/ _jsxDEV("p", {
                                    className: "font-display text-xl font-black",
                                    children: "Road to the Draft"
                                }, void 0, false, {
                                    fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                                    lineNumber: 1030,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ _jsxDEV("p", {
                                    className: "mt-1 text-xs leading-relaxed text-blue-100",
                                    children: "Start before the spotlight. Choose your route, earn your stock, and make draft day yours."
                                }, void 0, false, {
                                    fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                                    lineNumber: 1031,
                                    columnNumber: 13
                                }, this),
                                prospectNotice && /*#__PURE__*/ _jsxDEV("p", {
                                    className: "mt-2 text-xs",
                                    role: "status",
                                    children: prospectNotice
                                }, void 0, false, {
                                    fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                                    lineNumber: 1032,
                                    columnNumber: 32
                                }, this),
                                /*#__PURE__*/ _jsxDEV("button", {
                                    onClick: beginProspect,
                                    className: "mt-3 min-h-11 w-full rounded-xl bg-white px-4 py-3 text-sm font-bold text-blue-950",
                                    children: "Play your road to the draft"
                                }, void 0, false, {
                                    fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                                    lineNumber: 1033,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ _jsxDEV("p", {
                                    className: "mt-3 text-center text-xs text-blue-100",
                                    children: "Or quick start below with an instant draft result."
                                }, void 0, false, {
                                    fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                                    lineNumber: 1034,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                            lineNumber: 1029,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ _jsxDEV("button", {
                            onClick: create,
                            className: "w-full rounded-full bg-primary px-8 py-3 text-sm font-bold text-primary-foreground hover:opacity-90",
                            children: "Enter the draft"
                        }, void 0, false, {
                            fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                            lineNumber: 1036,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                    lineNumber: 973,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
            lineNumber: 965,
            columnNumber: 7
        }, this));
    }
    const legacy = sport.legacyOf(career);
    /* ------------------- Round 186: the season curtain -------------------
     Rendered ahead of every other screen so the season's story lands
     before the crossroads, the market or the retirement card. Transient:
     a reload skips straight to whichever of those the save is really on. */ if (reveal) {
        return withSaveStatus(/*#__PURE__*/ _jsxDEV("div", {
            ref: revealRef,
            children: /*#__PURE__*/ _jsxDEV(SeasonRevealCard, {
                reveal: reveal,
                onContinue: ()=>setReveal(null)
            }, void 0, false, {
                fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                lineNumber: 1056,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
            lineNumber: 1055,
            columnNumber: 7
        }, this));
    }
    if (decisionOutcome && phase === 'season') {
        return withSaveStatus(/*#__PURE__*/ _jsxDEV(CareerDecisionOutcome, {
            outcome: decisionOutcome,
            onContinue: ()=>{
                decisionReturn.current = true;
                setDecisionOutcome(null);
            }
        }, void 0, false, {
            fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
            lineNumber: 1062,
            columnNumber: 27
        }, this));
    }
    /* Round 1038: the same outcome between two cards of one summer; its
     Continue opens the next card. */ if (decisionOutcome && phase === 'event' && career.summer) {
        return withSaveStatus(/*#__PURE__*/ _jsxDEV(CareerDecisionOutcome, {
            outcome: decisionOutcome,
            onContinue: ()=>{
                setDecisionOutcome(null);
                openNextSummerCard();
            }
        }, void 0, false, {
            fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
            lineNumber: 1070,
            columnNumber: 27
        }, this));
    }
    /* ------------------- Round 521: a pending rivalry beat -------------------
     Shown right after the season curtain and before the crossroads deck,
     the same place in the flow the flagship's own rivalry card interrupts.
     Persisted on the save (unlike reveal), so a reload mid-beat still shows
     it rather than losing it. */ if (career.pendingRivalryEvent) {
        return withSaveStatus(/*#__PURE__*/ _jsxDEV("div", {
            ref: revealRef,
            children: /*#__PURE__*/ _jsxDEV(RivalryEventCard, {
                event: career.pendingRivalryEvent,
                onContinue: dismissRivalry,
                headToHead: career.rival ? {
                    myName: career.name,
                    myRating: career.ovr,
                    rivalName: career.rival.name,
                    rivalRating: career.rival.ovr
                } : undefined
            }, void 0, false, {
                fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                lineNumber: 1084,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
            lineNumber: 1083,
            columnNumber: 7
        }, this));
    }
    /* ------------------- Round 796: a rival choice -------------------
     Same place in the flow as the beat card above, which a season never
     stacks with this one. Persisted on the save while unanswered, so a
     reload mid-choice still asks. */ const rivalryChoice = career.pendingRivalryChoice ?? rivalryOutcome?.card ?? null;
    if (rivalryChoice) {
        return withSaveStatus(/*#__PURE__*/ _jsxDEV("div", {
            ref: revealRef,
            children: /*#__PURE__*/ _jsxDEV(RivalryChoiceCard, {
                card: rivalryChoice,
                onChoose: chooseRivalry,
                outcome: career.pendingRivalryChoice ? null : rivalryOutcome,
                onContinue: ()=>setRivalryOutcome(null),
                headToHead: career.rival ? {
                    myName: career.name,
                    myRating: career.ovr,
                    rivalName: career.rival.name,
                    rivalRating: career.rival.ovr
                } : undefined
            }, void 0, false, {
                fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                lineNumber: 1104,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
            lineNumber: 1103,
            columnNumber: 7
        }, this));
    }
    /* ------------------- Round 1039: the retirement talk -------------------
     After the curtain and the rivalry beats, before the offseason's card or
     the hub. Derived from the career, so a reload asks it again until it is
     answered, and an old save already inside the rule is asked on its first
     load. With no Hall bound there is never a talk. */ const talk = phase === 'season' || phase === 'event' ? pendingTalk(career, sport.hall) : null;
    if (talk) {
        return withSaveStatus(/*#__PURE__*/ _jsxDEV("div", {
            ref: revealRef,
            children: /*#__PURE__*/ _jsxDEV(Suspense, {
                fallback: /*#__PURE__*/ _jsxDEV("p", {
                    role: "status",
                    className: "text-center text-xs text-muted-foreground",
                    children: "Loading..."
                }, void 0, false, {
                    fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                    lineNumber: 1127,
                    columnNumber: 29
                }, void 0),
                children: /*#__PURE__*/ _jsxDEV(FarewellCard, {
                    talk: talk,
                    age: career.age,
                    onChoose: answerRetirementTalk
                }, void 0, false, {
                    fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                    lineNumber: 1128,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                lineNumber: 1127,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
            lineNumber: 1126,
            columnNumber: 7
        }, this));
    }
    if (phase === 'retired' && retiredReview || phase !== 'retired' && phase !== 'coach' && phase !== 'freeagency' && panel === 'log') {
        return withSaveStatus(/*#__PURE__*/ _jsxDEV(Suspense, {
            fallback: /*#__PURE__*/ _jsxDEV("p", {
                role: "status",
                children: "Loading season review..."
            }, void 0, false, {
                fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                lineNumber: 1135,
                columnNumber: 47
            }, void 0),
            children: /*#__PURE__*/ _jsxDEV(CareerSeasonReview, {
                career: career,
                sport: sport,
                backLabel: phase === 'retired' ? 'Back to retirement' : 'Back to career',
                onBack: ()=>{
                    reviewReturn.current = phase === 'retired' ? 'retired' : 'log';
                    if (phase === 'retired') setRetiredReview(false);
                    else setPanel('none');
                }
            }, void 0, false, {
                fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                lineNumber: 1136,
                columnNumber: 7
            }, this)
        }, void 0, false, {
            fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
            lineNumber: 1135,
            columnNumber: 27
        }, this));
    }
    /* ------------------- Round 126: the coaching career ------------------- */ if (phase === 'coach' && coach) {
        return withSaveStatus(/*#__PURE__*/ _jsxDEV(CoachCareerPanel, {
            state: coach,
            playerName: career.name,
            feed: coachFeed,
            onChange: onCoachChange,
            onBack: leaveCoaching
        }, void 0, false, {
            fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
            lineNumber: 1147,
            columnNumber: 7
        }, this));
    }
    /* ------------------------------ retired ------------------------------ */ if (phase === 'retired') {
        return withSaveStatus(/*#__PURE__*/ _jsxDEV("div", {
            className: "space-y-4",
            children: [
                /*#__PURE__*/ _jsxDEV("div", {
                    className: "relative rounded-2xl border border-gold/50 bg-card p-5 text-center",
                    children: [
                        /*#__PURE__*/ _jsxDEV(CelebrationStyles, {}, void 0, false, {
                            fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                            lineNumber: 1167,
                            columnNumber: 11
                        }, this),
                        legacy.hof && (!hallRecord || hallLanded) && /*#__PURE__*/ _jsxDEV(Confetti, {
                            pieces: 60,
                            gold: true
                        }, void 0, false, {
                            fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                            lineNumber: 1169,
                            columnNumber: 57
                        }, this),
                        sport.retirementAvatar && career.appearance && /*#__PURE__*/ _jsxDEV("div", {
                            className: "mb-2 flex justify-center",
                            children: /*#__PURE__*/ _jsxDEV("span", {
                                className: "overflow-hidden rounded-xl border-2 border-gold/50 bg-secondary",
                                children: /*#__PURE__*/ _jsxDEV(PlayerAvatar, {
                                    appearance: career.appearance,
                                    clubColor: "#D4AF37",
                                    size: 88
                                }, void 0, false, {
                                    fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                                    lineNumber: 1173,
                                    columnNumber: 17
                                }, this)
                            }, void 0, false, {
                                fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                                lineNumber: 1172,
                                columnNumber: 15
                            }, this)
                        }, void 0, false, {
                            fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                            lineNumber: 1171,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ _jsxDEV(Crown, {
                            className: "mx-auto h-10 w-10 text-gold"
                        }, void 0, false, {
                            fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                            lineNumber: 1177,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ _jsxDEV("p", {
                            className: "cm-slam mt-2 font-display text-2xl font-black text-foreground",
                            style: {
                                animationDelay: '0.1s'
                            },
                            children: [
                                career.name,
                                " retires"
                            ]
                        }, void 0, true, {
                            fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                            lineNumber: 1178,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ _jsxDEV("p", {
                            className: "cm-slam mt-1 text-sm font-semibold text-gold",
                            style: {
                                animationDelay: '0.3s'
                            },
                            children: legacy.verdict
                        }, void 0, false, {
                            fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                            lineNumber: 1179,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ _jsxDEV("div", {
                            className: "mt-3 space-y-1 text-xs text-muted-foreground",
                            children: [
                                legacy.bullets.map((b, i)=>/*#__PURE__*/ _jsxDEV("p", {
                                        className: "cm-tick-in",
                                        style: {
                                            animationDelay: revealDelay(i)
                                        },
                                        children: b
                                    }, i, false, {
                                        fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                                        lineNumber: 1181,
                                        columnNumber: 43
                                    }, this)),
                                (()=>{
                                    const earned = sport.earnedBadges(career);
                                    return earned.length > 0 ? /*#__PURE__*/ _jsxDEV("p", {
                                        className: "cm-rise pt-1 text-gold",
                                        style: {
                                            animationDelay: revealDelay(legacy.bullets.length, 0.75)
                                        },
                                        children: earned.map((b)=>`${b.emoji} ${b.label}`).join(' · ')
                                    }, void 0, false, {
                                        fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                                        lineNumber: 1186,
                                        columnNumber: 19
                                    }, this) : null;
                                })()
                            ]
                        }, void 0, true, {
                            fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                            lineNumber: 1180,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ _jsxDEV("div", {
                            className: "cm-rise mt-3 flex items-center justify-center gap-3 text-sm",
                            style: {
                                animationDelay: revealDelay(legacy.bullets.length, 0.95)
                            },
                            children: [
                                /*#__PURE__*/ _jsxDEV("span", {
                                    className: "rounded-full border border-border bg-background px-3 py-1.5",
                                    children: [
                                        "Legacy ",
                                        /*#__PURE__*/ _jsxDEV("b", {
                                            className: "text-gold",
                                            children: legacy.score
                                        }, void 0, false, {
                                            fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                                            lineNumber: 1191,
                                            columnNumber: 98
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                                    lineNumber: 1191,
                                    columnNumber: 13
                                }, this),
                                (!hallRecord || hallLanded) && /*#__PURE__*/ _jsxDEV("span", {
                                    className: cn('rounded-full border border-border bg-background px-3 py-1.5', hallRecord && 'cm-rise'),
                                    children: sport.hallLine(legacy.hof)
                                }, void 0, false, {
                                    fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                                    lineNumber: 1194,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                            lineNumber: 1190,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ _jsxDEV("div", {
                            className: "mt-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-center",
                            children: [
                                /*#__PURE__*/ _jsxDEV(USCareerActionConfirm, {
                                    action: "restart",
                                    sport: sport.label,
                                    onConfirm: reset,
                                    children: /*#__PURE__*/ _jsxDEV("button", {
                                        className: "inline-flex min-h-11 min-w-11 items-center gap-2 rounded-full border border-border px-6 py-2.5 text-sm font-semibold text-foreground",
                                        children: [
                                            /*#__PURE__*/ _jsxDEV(RotateCcw, {
                                                className: "h-4 w-4"
                                            }, void 0, false, {
                                                fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                                                lineNumber: 1200,
                                                columnNumber: 17
                                            }, this),
                                            " New career"
                                        ]
                                    }, void 0, true, {
                                        fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                                        lineNumber: 1199,
                                        columnNumber: 15
                                    }, this)
                                }, void 0, false, {
                                    fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                                    lineNumber: 1198,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ _jsxDEV(ShareButtons, {
                                    gameName: sport.gameName,
                                    gamePath: `/${sport.gameSlug}`,
                                    score: `legacy ${legacy.score}`,
                                    customText: sport.shareText(career, legacy)
                                }, void 0, false, {
                                    fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                                    lineNumber: 1203,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                            lineNumber: 1197,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                    lineNumber: 1166,
                    columnNumber: 9
                }, this),
                hallRecord && sport.hall && /*#__PURE__*/ _jsxDEV(Suspense, {
                    fallback: /*#__PURE__*/ _jsxDEV("p", {
                        role: "status",
                        className: "text-center text-xs text-muted-foreground",
                        children: "Counting the Hall votes..."
                    }, void 0, false, {
                        fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                        lineNumber: 1213,
                        columnNumber: 31
                    }, void 0),
                    children: /*#__PURE__*/ _jsxDEV(HallOfFameCard, {
                        record: hallRecord,
                        rules: sport.hall.rules,
                        speech: career.hallSpeech,
                        onSpeech: giveSpeech,
                        folded: hallFolded,
                        onDismiss: ()=>setHallFolded(true),
                        onLanded: ()=>setHallLanded(true)
                    }, void 0, false, {
                        fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                        lineNumber: 1214,
                        columnNumber: 13
                    }, this)
                }, void 0, false, {
                    fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                    lineNumber: 1213,
                    columnNumber: 11
                }, this),
                /*#__PURE__*/ _jsxDEV(CoachStartCard, {
                    sport: sport.slug,
                    existing: coach,
                    onStart: startCoaching,
                    onResume: openCoaching
                }, void 0, false, {
                    fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                    lineNumber: 1226,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ _jsxDEV("button", {
                    ref: retiredReviewButton,
                    "data-career-review-opener": "",
                    onClick: ()=>setRetiredReview(true),
                    className: "min-h-[44px] w-full rounded-xl border border-primary/40 bg-primary/10 px-3 py-3 text-sm font-semibold text-foreground",
                    children: "Review seasons"
                }, void 0, false, {
                    fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                    lineNumber: 1227,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ _jsxDEV("div", {
                    className: "rounded-2xl border border-border bg-card p-3",
                    children: [
                        /*#__PURE__*/ _jsxDEV("p", {
                            className: "mb-1 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground",
                            children: "Season by season"
                        }, void 0, false, {
                            fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                            lineNumber: 1229,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ _jsxDEV("div", {
                            className: "max-h-72 space-y-0.5 overflow-y-auto",
                            children: career.seasons.map((s, i)=>/*#__PURE__*/ _jsxDEV("div", {
                                    className: "flex items-center justify-between rounded px-2 py-1 text-[11px] odd:bg-background",
                                    children: [
                                        /*#__PURE__*/ _jsxDEV("span", {
                                            className: "text-muted-foreground",
                                            children: [
                                                s.year,
                                                " · ",
                                                s.team,
                                                " · age ",
                                                s.age
                                            ]
                                        }, void 0, true, {
                                            fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                                            lineNumber: 1233,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ _jsxDEV("span", {
                                            className: "text-foreground",
                                            children: [
                                                statLine(s, career.pos),
                                                s.awards.length ? ` · ${s.awards.join(', ')}` : ''
                                            ]
                                        }, void 0, true, {
                                            fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                                            lineNumber: 1234,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, i, true, {
                                    fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                                    lineNumber: 1232,
                                    columnNumber: 15
                                }, this))
                        }, void 0, false, {
                            fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                            lineNumber: 1230,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                    lineNumber: 1228,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
            lineNumber: 1160,
            columnNumber: 7
        }, this));
    }
    /* ---------------- Round 85: tile drill-in screens (the tile rule) ----------------
     Round 179: freeagency joins event in the guard, so an open panel can
     never hide the market screen. */ if (panel !== 'none' && phase !== 'event' && phase !== 'freeagency') {
        /* Round 796: karma joins the meters. The inbox has moved it since Round 521
       and the rival choice buttons now print it, so it has to be somewhere the
       player can see it move. A save that never answered a text reads 50. */ const meters = [
            [
                'Morale',
                career.morale
            ],
            [
                'Fanbase',
                career.fanbase
            ],
            [
                'Health',
                career.health
            ],
            [
                'Karma',
                career.karma ?? 50
            ]
        ];
        return withSaveStatus(/*#__PURE__*/ _jsxDEV("div", {
            ref: panelRef,
            className: "space-y-3",
            children: [
                /*#__PURE__*/ _jsxDEV(HubPanelHeader, {
                    title: panel === 'bank' ? '\u{1F4B0} The Bank' : panel === 'stats' ? '\u{1F4CA} My Player' : panel === 'log' ? '\u{1F4DC} Career Log' : panel === 'trophies' ? '\u{1F3C6} Trophy Case' : panel === 'inbox' ? '\u{1F4F1} Inbox' : '\u{1F4F0} News Feed',
                    onBack: ()=>setPanel('none')
                }, void 0, false, {
                    fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                    lineNumber: 1253,
                    columnNumber: 9
                }, this),
                panel === 'bank' && /* Round 469: the money app. Savings, the market, the statement and
             the card school on the engine the flagship's phone runs, with the
             Round 56 shop as its fourth tab. */ /*#__PURE__*/ _jsxDEV(MoneyApp, {
                    host: career,
                    sport: sport.money,
                    incomeLine: `$${career.salary}M a year, ${Math.max(0, career.contractYears)} year${Math.max(0, career.contractYears) === 1 ? '' : 's'} left on the deal`,
                    onMoney: handleMoney,
                    shop: /*#__PURE__*/ _jsxDEV(UsShopPanel, {
                        stock: sport.shopItems,
                        career: career,
                        onBuy: (id)=>{
                            const res = sport.buyItem(career, id);
                            if (!res) return;
                            setCareer(res.state);
                            setFeed((f)=>[
                                    res.log,
                                    ...f
                                ].slice(0, 8));
                            persist(res.state, 'season', teamQuality);
                        }
                    }, void 0, false, {
                        fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                        lineNumber: 1266,
                        columnNumber: 19
                    }, void 0)
                }, void 0, false, {
                    fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                    lineNumber: 1261,
                    columnNumber: 11
                }, this),
                panel === 'stats' && /*#__PURE__*/ _jsxDEV("div", {
                    className: "space-y-3",
                    children: [
                        career.prospect && /*#__PURE__*/ _jsxDEV(ProspectRecord, {
                            sport: sport,
                            state: career.prospect
                        }, void 0, false, {
                            fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                            lineNumber: 1271,
                            columnNumber: 33
                        }, this),
                        /*#__PURE__*/ _jsxDEV("div", {
                            className: "rounded-2xl border border-border bg-card p-4 text-center",
                            children: [
                                /*#__PURE__*/ _jsxDEV("p", {
                                    className: "text-4xl font-black text-primary",
                                    children: career.ovr
                                }, void 0, false, {
                                    fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                                    lineNumber: 1273,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ _jsxDEV("p", {
                                    className: "text-[10px] font-bold uppercase tracking-widest text-muted-foreground",
                                    children: "overall"
                                }, void 0, false, {
                                    fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                                    lineNumber: 1274,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ _jsxDEV("p", {
                                    className: "mt-1 text-xs text-muted-foreground",
                                    children: [
                                        career.name,
                                        " · ",
                                        career.pos,
                                        " · age ",
                                        career.age
                                    ]
                                }, void 0, true, {
                                    fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                                    lineNumber: 1275,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                            lineNumber: 1272,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ _jsxDEV("div", {
                            className: "space-y-2",
                            children: meters.map(([lbl, v])=>/*#__PURE__*/ _jsxDEV("div", {
                                    className: "rounded-xl border border-border bg-card px-3 py-2",
                                    children: [
                                        /*#__PURE__*/ _jsxDEV("div", {
                                            className: "flex justify-between text-[11px]",
                                            children: [
                                                /*#__PURE__*/ _jsxDEV("span", {
                                                    className: "text-muted-foreground",
                                                    children: lbl
                                                }, void 0, false, {
                                                    fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                                                    lineNumber: 1280,
                                                    columnNumber: 69
                                                }, this),
                                                /*#__PURE__*/ _jsxDEV("b", {
                                                    className: "text-foreground",
                                                    children: v
                                                }, void 0, false, {
                                                    fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                                                    lineNumber: 1280,
                                                    columnNumber: 121
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                                            lineNumber: 1280,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ _jsxDEV("div", {
                                            className: "mt-1 h-1.5 overflow-hidden rounded-full bg-secondary",
                                            children: /*#__PURE__*/ _jsxDEV("div", {
                                                className: cn('h-full rounded-full', v > 60 ? 'bg-primary' : v > 35 ? 'bg-gold' : 'bg-destructive'),
                                                style: {
                                                    width: `${v}%`
                                                }
                                            }, void 0, false, {
                                                fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                                                lineNumber: 1282,
                                                columnNumber: 21
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                                            lineNumber: 1281,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, lbl, true, {
                                    fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                                    lineNumber: 1279,
                                    columnNumber: 17
                                }, this))
                        }, void 0, false, {
                            fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                            lineNumber: 1277,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ _jsxDEV("div", {
                            className: "grid grid-cols-2 gap-2 text-center text-[11px]",
                            children: [
                                /*#__PURE__*/ _jsxDEV("div", {
                                    className: "rounded-xl border border-border bg-card px-2 py-2",
                                    children: [
                                        /*#__PURE__*/ _jsxDEV("p", {
                                            className: "text-lg font-black text-foreground",
                                            children: career.seasons.length
                                        }, void 0, false, {
                                            fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                                            lineNumber: 1288,
                                            columnNumber: 82
                                        }, this),
                                        /*#__PURE__*/ _jsxDEV("p", {
                                            className: "text-muted-foreground",
                                            children: "seasons"
                                        }, void 0, false, {
                                            fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                                            lineNumber: 1288,
                                            columnNumber: 159
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                                    lineNumber: 1288,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ _jsxDEV("div", {
                                    className: "rounded-xl border border-border bg-card px-2 py-2",
                                    children: [
                                        /*#__PURE__*/ _jsxDEV("p", {
                                            className: "text-lg font-black text-foreground",
                                            children: sport.ringsOf(career)
                                        }, void 0, false, {
                                            fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                                            lineNumber: 1289,
                                            columnNumber: 82
                                        }, this),
                                        /*#__PURE__*/ _jsxDEV("p", {
                                            className: "text-muted-foreground",
                                            children: sport.ringsLabel
                                        }, void 0, false, {
                                            fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                                            lineNumber: 1289,
                                            columnNumber: 159
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                                    lineNumber: 1289,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                            lineNumber: 1287,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                    lineNumber: 1270,
                    columnNumber: 11
                }, this),
                panel === 'trophies' && /*#__PURE__*/ _jsxDEV("div", {
                    className: "space-y-3",
                    children: [
                        /*#__PURE__*/ _jsxDEV(TrophyCase, {
                            seasons: career.seasons,
                            rings: sport.ringsOf(career),
                            ringWord: sport.ringWord
                        }, void 0, false, {
                            fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                            lineNumber: 1295,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ _jsxDEV(BadgeGrid, {
                            defs: sport.badges,
                            earned: sport.earnedBadges(career)
                        }, void 0, false, {
                            fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                            lineNumber: 1298,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                    lineNumber: 1294,
                    columnNumber: 11
                }, this),
                panel === 'news' && /*#__PURE__*/ _jsxDEV("div", {
                    className: "space-y-3",
                    children: [
                        /*#__PURE__*/ _jsxDEV("div", {
                            className: "grid grid-cols-3 gap-1",
                            children: [
                                [
                                    'headlines',
                                    '📰 Paper'
                                ],
                                [
                                    'fans',
                                    '📸 SocialGram'
                                ],
                                [
                                    'rival',
                                    '🪞 Rival'
                                ]
                            ].map(([k, label])=>/*#__PURE__*/ _jsxDEV("button", {
                                    onClick: ()=>setNewsTab(k),
                                    /* Round 470: py-2, not py-1.5. Measured at 390 by 844
                     these three came out 117 by 29px, a shade under the 30px
                     floor every tap target on this site is held to, and they
                     are the only way between the News box's three screens. */ className: cn('rounded-lg px-1 py-2 text-[11px] font-bold transition-all', newsTab === k ? 'bg-primary/15 text-primary' : 'bg-secondary text-muted-foreground hover:text-foreground'),
                                    children: label
                                }, k, false, {
                                    fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                                    lineNumber: 1305,
                                    columnNumber: 17
                                }, this))
                        }, void 0, false, {
                            fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                            lineNumber: 1303,
                            columnNumber: 13
                        }, this),
                        newsTab === 'headlines' && /*#__PURE__*/ _jsxDEV("div", {
                            className: "space-y-3",
                            children: [
                                /*#__PURE__*/ _jsxDEV("div", {
                                    className: "rounded-2xl border border-border bg-card p-3",
                                    children: [
                                        /*#__PURE__*/ _jsxDEV("p", {
                                            className: "mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground",
                                            children: "This week"
                                        }, void 0, false, {
                                            fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                                            lineNumber: 1321,
                                            columnNumber: 19
                                        }, this),
                                        feed.length === 0 ? /*#__PURE__*/ _jsxDEV("p", {
                                            className: "py-4 text-center text-xs text-muted-foreground",
                                            children: "Quiet week. Play a season and the headlines write themselves."
                                        }, void 0, false, {
                                            fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                                            lineNumber: 1323,
                                            columnNumber: 21
                                        }, this) : /*#__PURE__*/ _jsxDEV("div", {
                                            className: "space-y-1.5 text-xs text-muted-foreground",
                                            children: feed.map((n, i)=>/*#__PURE__*/ _jsxDEV("p", {
                                                    className: "rounded-lg bg-background px-2 py-1.5",
                                                    children: n
                                                }, i, false, {
                                                    fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                                                    lineNumber: 1326,
                                                    columnNumber: 43
                                                }, this))
                                        }, void 0, false, {
                                            fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                                            lineNumber: 1325,
                                            columnNumber: 21
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                                    lineNumber: 1320,
                                    columnNumber: 17
                                }, this),
                                (career.headlines ?? []).length > 0 && /*#__PURE__*/ _jsxDEV("div", {
                                    className: "rounded-2xl border border-border bg-card p-3",
                                    children: [
                                        /*#__PURE__*/ _jsxDEV("p", {
                                            className: "mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground",
                                            children: "Back pages"
                                        }, void 0, false, {
                                            fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                                            lineNumber: 1332,
                                            columnNumber: 21
                                        }, this),
                                        /*#__PURE__*/ _jsxDEV("div", {
                                            className: "space-y-1.5 text-xs text-foreground",
                                            children: (career.headlines ?? []).map((n, i)=>/*#__PURE__*/ _jsxDEV("p", {
                                                    className: "rounded-lg bg-background px-2 py-1.5",
                                                    children: [
                                                        "📰 ",
                                                        n
                                                    ]
                                                }, i, true, {
                                                    fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                                                    lineNumber: 1334,
                                                    columnNumber: 63
                                                }, this))
                                        }, void 0, false, {
                                            fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                                            lineNumber: 1333,
                                            columnNumber: 21
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                                    lineNumber: 1331,
                                    columnNumber: 19
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                            lineNumber: 1319,
                            columnNumber: 15
                        }, this),
                        newsTab === 'fans' && /*#__PURE__*/ _jsxDEV(SocialGram, {
                            followers: fmtFollowers(sport.followers(career)),
                            standing: career.fanbase,
                            standingLabel: "Fanbase",
                            comments: sport.fanComments(career),
                            headlines: (career.headlines ?? []).slice(0, 3)
                        }, void 0, false, {
                            fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                            lineNumber: 1341,
                            columnNumber: 15
                        }, this),
                        newsTab === 'rival' && /*#__PURE__*/ _jsxDEV(RivalCard, {
                            rival: career.rival,
                            myName: career.name,
                            teamLabel: sport.teamLabelOf(career.rival?.team ?? '', career.eraId),
                            ringWord: sport.ringWord
                        }, void 0, false, {
                            fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                            lineNumber: 1350,
                            columnNumber: 15
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                    lineNumber: 1302,
                    columnNumber: 11
                }, this),
                panel === 'inbox' && /* Round 521: the Round 80 half of the flagship's phone, on the
             engine careerInbox.ts, bound per sport (sport.calendar, sport.answerInbox). */ /*#__PURE__*/ _jsxDEV(InboxPanel, {
                    messages: [
                        ...career.phoneInbox ?? []
                    ].reverse(),
                    onAnswer: handleInboxAnswer,
                    seen: inboxSeenRef.current,
                    calendar: sport.calendar
                }, void 0, false, {
                    fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                    lineNumber: 1357,
                    columnNumber: 11
                }, this)
            ]
        }, void 0, true, {
            fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
            lineNumber: 1252,
            columnNumber: 7
        }, this));
    }
    /* Round 208: what the boxes say. Decided in src/lib/careerHub.ts so the
     wording is harnessed rather than eyeballed, and shared by four games. */ const hubTiles = careerHubTiles({
        ovr: career.ovr,
        age: career.age,
        pos: career.pos,
        morale: career.morale,
        health: career.health,
        fanbase: career.fanbase,
        /* Round 469: everything you have, cash plus savings plus holdings, the
       number the money app's headline prints. */ netWorth: Math.round(((career.netWorth ?? 0) + sport.moneyWealth(career)) * 10) / 10,
        salary: career.salary,
        yearlyCosts: career.yearlyCosts ?? 0,
        contractYears: Math.max(0, career.contractYears),
        teamLabel: sport.teamLabelOf(career.team),
        seasonsPlayed: career.seasons.length,
        /* Read off the SEASONS, not the transient lastLine state: that state
       is empty after a reload, and a box that forgets your career the
       moment you refresh is worse than no box. */ lastLine: career.seasons.length ? statLine(career.seasons[career.seasons.length - 1], career.pos) : null,
        rings: sport.ringsOf(career),
        ringWord: sport.ringWord,
        honours: sport.honours(career),
        /* The week's feed while there is one; after a reload, the paper kept on
       the save, so the box does not forget the career. */ headlines: feed.length ? feed : career.headlines ?? []
    });
    /* Round 521: a sixth box for the inbox, appended here rather than folded
     into careerHub.ts's shared five. When this was written only the NFL had
     an inbox; since Round 796 every sport does, and this board draws the box
     for all four through the binding's unreadInboxCount. */ const unread = sport.unreadInboxCount(career);
    const hubTilesWithInbox = [
        ...hubTiles,
        {
            key: 'inbox',
            icon: '📱',
            title: 'Inbox',
            value: unread === 0 ? 'All caught up' : `${unread} unread`,
            sub: unread === 0 ? 'Texts show up between seasons' : 'Somebody is waiting on a reply',
            accent: unread > 0
        }
    ];
    /* Round 1038: where the event card stands in its summer, counted over the
     cards you actually get (a skipped card is never shown). */ const place = career.summer ? summerPlace(career.summer) : null;
    /* ------------------------------ season hub ------------------------------ */ return withSaveStatus(/*#__PURE__*/ _jsxDEV("div", {
        className: "space-y-4",
        children: [
            /*#__PURE__*/ _jsxDEV("div", {
                className: "flex flex-wrap items-center justify-center gap-2 text-xs",
                children: [
                    career.appearance && /*#__PURE__*/ _jsxDEV("span", {
                        className: "overflow-hidden rounded-xl border border-border bg-card",
                        children: /*#__PURE__*/ _jsxDEV(PlayerAvatar, {
                            appearance: career.appearance,
                            clubColor: sport.create.clubColor,
                            size: 44,
                            animate: true
                        }, void 0, false, {
                            fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                            lineNumber: 1419,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                        lineNumber: 1418,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ _jsxDEV("span", {
                        className: "rounded-full border border-border bg-card px-3 py-1 font-bold text-foreground",
                        children: [
                            career.name,
                            " · ",
                            career.pos
                        ]
                    }, void 0, true, {
                        fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                        lineNumber: 1422,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ _jsxDEV("span", {
                        className: "rounded-full border border-border bg-card px-3 py-1 text-muted-foreground",
                        children: sport.teamLabelOf(career.team)
                    }, void 0, false, {
                        fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                        lineNumber: 1423,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ _jsxDEV("span", {
                        className: "rounded-full border border-border bg-card px-3 py-1 text-muted-foreground",
                        children: [
                            career.year,
                            " · age ",
                            career.age
                        ]
                    }, void 0, true, {
                        fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                        lineNumber: 1424,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ _jsxDEV("span", {
                        className: "rounded-full border border-border bg-card px-3 py-1 text-muted-foreground",
                        children: [
                            "OVR ",
                            /*#__PURE__*/ _jsxDEV("b", {
                                className: "text-primary",
                                children: career.ovr
                            }, void 0, false, {
                                fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                                lineNumber: 1425,
                                columnNumber: 105
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                        lineNumber: 1425,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ _jsxDEV("span", {
                        className: "rounded-full border border-border bg-card px-3 py-1 text-muted-foreground",
                        children: [
                            "$",
                            career.salary,
                            "M x",
                            Math.max(0, career.contractYears)
                        ]
                    }, void 0, true, {
                        fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                        lineNumber: 1426,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ _jsxDEV("span", {
                        className: cn('rounded-full border px-3 py-1 font-bold', career.role === 'backup' ? 'border-border bg-card text-muted-foreground' : 'border-gold/40 bg-card text-gold'),
                        children: sport.roleBadge(career)
                    }, void 0, false, {
                        fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                        lineNumber: 1428,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                lineNumber: 1416,
                columnNumber: 7
            }, this),
            ((career.heat ?? 0) > 0 || (career.dirtyMoney ?? 0) > 0) && (()=>{
                const h = career.heat ?? 0;
                const band = sport.heatLabel(h);
                return /*#__PURE__*/ _jsxDEV("div", {
                    className: "rounded-2xl border border-destructive/25 bg-destructive/5 p-3",
                    children: [
                        /*#__PURE__*/ _jsxDEV("div", {
                            className: "flex items-center justify-between text-[11px]",
                            children: [
                                /*#__PURE__*/ _jsxDEV("span", {
                                    className: "font-bold uppercase tracking-wider text-muted-foreground",
                                    children: `🕶️ ${sport.heatTitle}`
                                }, void 0, false, {
                                    fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                                    lineNumber: 1440,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ _jsxDEV("span", {
                                    className: cn('font-black', band.tone),
                                    children: band.label
                                }, void 0, false, {
                                    fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                                    lineNumber: 1441,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                            lineNumber: 1439,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ _jsxDEV("div", {
                            className: "mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary",
                            children: /*#__PURE__*/ _jsxDEV("div", {
                                className: cn('h-full rounded-full transition-all duration-700', h >= 65 ? 'bg-destructive' : h >= 40 ? 'bg-orange-500' : 'bg-gold'),
                                style: {
                                    width: `${h}%`
                                }
                            }, void 0, false, {
                                fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                                lineNumber: 1444,
                                columnNumber: 15
                            }, this)
                        }, void 0, false, {
                            fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                            lineNumber: 1443,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ _jsxDEV("p", {
                            className: "mt-1.5 text-[11px] leading-snug text-muted-foreground",
                            children: band.blurb
                        }, void 0, false, {
                            fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                            lineNumber: 1446,
                            columnNumber: 13
                        }, this),
                        (career.dirtyMoney ?? 0) > 0 && /*#__PURE__*/ _jsxDEV("p", {
                            className: "mt-1 text-[11px] font-bold text-destructive",
                            children: [
                                "💼 $",
                                (career.dirtyMoney ?? 0).toFixed(1),
                                "M unexplained. Wash it in the Shady aisle or it keeps burning."
                            ]
                        }, void 0, true, {
                            fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                            lineNumber: 1448,
                            columnNumber: 15
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                    lineNumber: 1438,
                    columnNumber: 11
                }, this);
            })(),
            isFarewellSeason(career.retirement, career.year) && /*#__PURE__*/ _jsxDEV(Suspense, {
                fallback: null,
                children: /*#__PURE__*/ _jsxDEV(FarewellSeasonBanner, {
                    year: career.year
                }, void 0, false, {
                    fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                    lineNumber: 1461,
                    columnNumber: 35
                }, this)
            }, void 0, false, {
                fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                lineNumber: 1461,
                columnNumber: 9
            }, this),
            phase === 'extension' && extTalk ? /*#__PURE__*/ _jsxDEV("div", {
                ref: revealRef,
                children: /*#__PURE__*/ _jsxDEV(ExtensionCard, {
                    talk: extTalk,
                    seasonWord: sport.seasonWord,
                    onPush: pushExt,
                    onSign: signExt,
                    onDecline: declineExt,
                    wheel: marketTalk?.wheel,
                    onWheelContinue: acknowledgeMarket,
                    odds: extensionMarketProbabilities(sport.extPushArgs(career, Math.random))
                }, void 0, false, {
                    fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                    lineNumber: 1466,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                lineNumber: 1465,
                columnNumber: 9
            }, this) : phase === 'freeagency' && faWindow ? /*#__PURE__*/ _jsxDEV("div", {
                ref: revealRef,
                children: /*#__PURE__*/ _jsxDEV(FreeAgencyPanel, {
                    window: faWindow,
                    sportNoun: sport.faSportNoun,
                    talkLine: talkLine,
                    onPush: pushFa,
                    onSign: signFa,
                    wheel: marketTalk?.wheel,
                    onWheelContinue: acknowledgeMarket,
                    compare: true,
                    odds: faWindow.offers.map((_, index)=>freeAgencyMarketProbabilities(faWindow, index, sport.faPushArgs(career, Math.random)))
                }, void 0, false, {
                    fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                    lineNumber: 1470,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                lineNumber: 1469,
                columnNumber: 9
            }, this) : phase === 'event' && pendingEvent ? /*#__PURE__*/ _jsxDEV("div", {
                ref: revealRef,
                "data-career-event": pendingEvent.id,
                "data-career-decision-event": pendingEvent.id,
                className: career.summer ? 'cm-rise rounded-2xl border border-gold/40 bg-card p-4' : 'rounded-2xl border border-gold/40 bg-card p-4',
                children: [
                    place && /*#__PURE__*/ _jsxDEV("div", {
                        "data-career-summer-step": place.n,
                        className: "mb-2 flex items-center justify-center gap-2",
                        children: [
                            /*#__PURE__*/ _jsxDEV(CelebrationStyles, {}, void 0, false, {
                                fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                                lineNumber: 1478,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ _jsxDEV("span", {
                                className: "text-[10px] font-bold uppercase tracking-wide text-muted-foreground",
                                children: [
                                    "Offseason, card ",
                                    place.n,
                                    " of ",
                                    place.of
                                ]
                            }, void 0, true, {
                                fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                                lineNumber: 1479,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ _jsxDEV("span", {
                                className: "flex gap-1",
                                "aria-hidden": "true",
                                children: Array.from({
                                    length: place.of
                                }, (_, i)=>/*#__PURE__*/ _jsxDEV("span", {
                                        className: cn('h-1.5 w-1.5 rounded-full', i < place.done ? 'bg-gold' : i === place.done ? 'bg-gold/50' : 'bg-border')
                                    }, i, false, {
                                        fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                                        lineNumber: 1482,
                                        columnNumber: 19
                                    }, this))
                            }, void 0, false, {
                                fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                                lineNumber: 1480,
                                columnNumber: 15
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                        lineNumber: 1477,
                        columnNumber: 13
                    }, this),
                    /*#__PURE__*/ _jsxDEV("p", {
                        className: "text-center text-sm font-bold text-foreground",
                        children: [
                            /*#__PURE__*/ _jsxDEV(Sparkles, {
                                className: "mr-1 inline h-4 w-4 text-gold"
                            }, void 0, false, {
                                fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                                lineNumber: 1487,
                                columnNumber: 72
                            }, this),
                            pendingEvent.title
                        ]
                    }, void 0, true, {
                        fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                        lineNumber: 1487,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ _jsxDEV("p", {
                        className: "mt-1 text-center text-xs text-muted-foreground",
                        children: pendingEvent.body
                    }, void 0, false, {
                        fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                        lineNumber: 1488,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ _jsxDEV("div", {
                        className: "mt-3 grid gap-1.5",
                        children: pendingEvent.options.map((o, i)=>/*#__PURE__*/ _jsxDEV("button", {
                                "data-career-decision-option": i,
                                onClick: ()=>chooseOption(i),
                                className: "rounded-xl border border-border bg-background px-3 py-2 text-left hover:border-primary/60",
                                children: [
                                    /*#__PURE__*/ _jsxDEV("span", {
                                        className: "block text-sm font-bold text-foreground",
                                        children: o.label
                                    }, void 0, false, {
                                        fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                                        lineNumber: 1497,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ _jsxDEV("span", {
                                        className: "block text-[10px] text-muted-foreground",
                                        children: o.effect
                                    }, void 0, false, {
                                        fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                                        lineNumber: 1498,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, i, true, {
                                fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                                lineNumber: 1491,
                                columnNumber: 15
                            }, this))
                    }, void 0, false, {
                        fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                        lineNumber: 1489,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                lineNumber: 1473,
                columnNumber: 9
            }, this) : /*#__PURE__*/ _jsxDEV("div", {
                ref: careerEntryScreen,
                className: "rounded-2xl border border-gold/40 bg-card p-4 text-center",
                children: [
                    draftDay && career.seasons.length === 0 && /*#__PURE__*/ _jsxDEV("div", {
                        className: "mb-3",
                        children: /*#__PURE__*/ _jsxDEV(DraftDayCard, {
                            ...draftDay
                        }, void 0, false, {
                            fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                            lineNumber: 1510,
                            columnNumber: 15
                        }, this)
                    }, void 0, false, {
                        fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                        lineNumber: 1509,
                        columnNumber: 13
                    }, this),
                    lastLine && /*#__PURE__*/ _jsxDEV("p", {
                        className: "mb-2 text-xs text-muted-foreground",
                        children: [
                            "Last season: ",
                            statLine(lastLine, career.pos),
                            " · ",
                            lastLine.teamResult
                        ]
                    }, void 0, true, {
                        fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                        lineNumber: 1514,
                        columnNumber: 13
                    }, this),
                    /*#__PURE__*/ _jsxDEV("button", {
                        ref: careerEntryButton,
                        onClick: playSeason,
                        className: "inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-8 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90",
                        children: [
                            /*#__PURE__*/ _jsxDEV(Dumbbell, {
                                className: "h-4 w-4"
                            }, void 0, false, {
                                fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                                lineNumber: 1523,
                                columnNumber: 13
                            }, this),
                            " Play the ",
                            career.year,
                            " season"
                        ]
                    }, void 0, true, {
                        fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                        lineNumber: 1518,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ _jsxDEV(UsSeasonCentreEntry, {
                        sport: sport,
                        career: career,
                        busy: practiceOpen,
                        onPlay: playSeason,
                        played: ()=>playedRef.current
                    }, void 0, false, {
                        fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                        lineNumber: 1525,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ _jsxDEV("p", {
                        className: "mt-2 text-xs text-muted-foreground",
                        children: [
                            "Career so far: ",
                            sport.careerSoFar(career)
                        ]
                    }, void 0, true, {
                        fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                        lineNumber: 1526,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ _jsxDEV(UsCareerProgramme, {
                        career: career,
                        sport: sport.slug,
                        onChange: (next)=>{
                            if (next === career || phase !== 'season') return;
                            setCareer(next);
                            persist(next, 'season', teamQuality);
                        }
                    }, void 0, false, {
                        fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                        lineNumber: 1529,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ _jsxDEV("section", {
                        "data-career-practice": true,
                        "aria-label": "Season practice",
                        className: "mt-4 rounded-xl border border-primary/30 bg-gradient-to-br from-primary/15 via-card to-card p-3 text-left",
                        children: [
                            /*#__PURE__*/ _jsxDEV("div", {
                                className: "flex items-start justify-between gap-3",
                                children: [
                                    /*#__PURE__*/ _jsxDEV("div", {
                                        children: [
                                            /*#__PURE__*/ _jsxDEV("h3", {
                                                className: "mt-1 text-sm font-black",
                                                children: sport.practiceLabel
                                            }, void 0, false, {
                                                fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                                                lineNumber: 1537,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ _jsxDEV("p", {
                                                className: "mt-1 text-xs text-muted-foreground",
                                                children: "Play a drill. Earn up to +2 OVR for camp."
                                            }, void 0, false, {
                                                fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                                                lineNumber: 1538,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                                        lineNumber: 1536,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ _jsxDEV("div", {
                                        className: "shrink-0 text-right",
                                        children: [
                                            /*#__PURE__*/ _jsxDEV("p", {
                                                className: "text-2xl font-black text-primary",
                                                children: [
                                                    career.ovr,
                                                    /*#__PURE__*/ _jsxDEV("span", {
                                                        className: "ml-1 text-[10px] text-muted-foreground",
                                                        children: "OVR"
                                                    }, void 0, false, {
                                                        fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                                                        lineNumber: 1541,
                                                        columnNumber: 77
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                                                lineNumber: 1541,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ _jsxDEV("p", {
                                                className: "text-[10px] text-muted-foreground",
                                                children: [
                                                    "Ceiling ",
                                                    Math.min(99, career.pot)
                                                ]
                                            }, void 0, true, {
                                                fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                                                lineNumber: 1542,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                                        lineNumber: 1540,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                                lineNumber: 1535,
                                columnNumber: 13
                            }, this),
                            career.practice?.year === career.year && /*#__PURE__*/ _jsxDEV("p", {
                                className: "mt-2 text-xs font-bold",
                                "data-practice-receipt": true,
                                children: [
                                    trainingBankNote(career.practice),
                                    " OVR ",
                                    career.practice.before,
                                    " to ",
                                    career.practice.ovr,
                                    ". Session banked for ",
                                    career.year,
                                    "."
                                ]
                            }, void 0, true, {
                                fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                                lineNumber: 1545,
                                columnNumber: 55
                            }, this),
                            /*#__PURE__*/ _jsxDEV("button", {
                                ref: practiceButtonRef,
                                onClick: openPractice,
                                className: "mt-3 min-h-11 w-full rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:opacity-90",
                                children: trainingSessionOpen(career.practice?.year, career.year) ? 'Start practice' : 'View practice'
                            }, void 0, false, {
                                fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                                lineNumber: 1546,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ _jsxDEV("p", {
                                className: "mt-2 text-[10px] text-muted-foreground",
                                children: "One banked session each season. Your ceiling still applies."
                            }, void 0, false, {
                                fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                                lineNumber: 1549,
                                columnNumber: 13
                            }, this),
                            practiceOpen && /*#__PURE__*/ _jsxDEV(Suspense, {
                                fallback: /*#__PURE__*/ _jsxDEV("p", {
                                    role: "status",
                                    children: "Opening practice..."
                                }, void 0, false, {
                                    fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                                    lineNumber: 1550,
                                    columnNumber: 50
                                }, void 0),
                                children: /*#__PURE__*/ _jsxDEV(UsCareerPractice, {
                                    sport: sport,
                                    pos: career.pos,
                                    available: trainingSessionOpen(career.practice?.year, career.year),
                                    result: career.practice?.year === career.year ? career.practice : undefined,
                                    onComplete: bankPractice,
                                    onClose: closePractice
                                }, void 0, false, {
                                    fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                                    lineNumber: 1551,
                                    columnNumber: 15
                                }, this)
                            }, void 0, false, {
                                fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                                lineNumber: 1550,
                                columnNumber: 30
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                        lineNumber: 1534,
                        columnNumber: 11
                    }, this),
                    career.seasons.length >= 6 && /*#__PURE__*/ _jsxDEV(USCareerActionConfirm, {
                        action: "retire",
                        sport: sport.label,
                        onConfirm: retireNow,
                        children: /*#__PURE__*/ _jsxDEV("button", {
                            className: "mt-2 min-h-11 min-w-11 text-[11px] text-muted-foreground hover:text-destructive",
                            children: "Hang them up now"
                        }, void 0, false, {
                            fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                            lineNumber: 1559,
                            columnNumber: 15
                        }, this)
                    }, void 0, false, {
                        fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                        lineNumber: 1558,
                        columnNumber: 13
                    }, this)
                ]
            }, void 0, true, {
                fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                lineNumber: 1504,
                columnNumber: 9
            }, this),
            /*#__PURE__*/ _jsxDEV("div", {
                ref: hubButtons,
                "data-career-hub-buttons": "",
                children: /*#__PURE__*/ _jsxDEV(HubTiles, {
                    tiles: hubTilesWithInbox,
                    onOpen: (k)=>{
                        if (k === 'log') reviewHubIndex.current = hubTilesWithInbox.findIndex((tile)=>tile.key === 'log');
                        setPanel(k);
                    }
                }, void 0, false, {
                    fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                    lineNumber: 1567,
                    columnNumber: 56
                }, this)
            }, void 0, false, {
                fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                lineNumber: 1567,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
        lineNumber: 1415,
        columnNumber: 5
    }, this));
}
function UsShopPanel({ stock, career, onBuy }) {
    const [tab, setTab] = useState('home');
    const cats = [
        {
            key: 'home',
            label: 'Home',
            emoji: '🏡'
        },
        {
            key: 'ride',
            label: 'Rides',
            emoji: '🏎️'
        },
        {
            key: 'invest',
            label: 'Invest',
            emoji: '📈'
        },
        {
            key: 'body',
            label: 'Body',
            emoji: '💪'
        },
        {
            key: 'flex',
            label: 'Flex',
            emoji: '💎'
        },
        {
            key: 'family',
            label: 'Family',
            emoji: '❤️'
        },
        {
            key: 'shady',
            label: 'Shady',
            emoji: '🕶️'
        }
    ];
    const hasDirt = (career.heat ?? 0) > 0 || (career.dirtyMoney ?? 0) > 0;
    const visible = cats.filter((c)=>c.key !== 'shady' || hasDirt);
    const owned = career.purchased ?? [];
    const net = career.netWorth ?? 0;
    const items = stock.filter((i)=>i.category === tab);
    return /*#__PURE__*/ _jsxDEV("div", {
        className: "space-y-2 rounded-2xl border border-border bg-card p-3",
        children: [
            /*#__PURE__*/ _jsxDEV("div", {
                className: "flex items-center justify-between text-[11px]",
                children: [
                    /*#__PURE__*/ _jsxDEV("span", {
                        className: "font-bold uppercase tracking-wider text-muted-foreground",
                        children: "💰 Your money"
                    }, void 0, false, {
                        fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                        lineNumber: 1602,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ _jsxDEV("span", {
                        className: "text-muted-foreground",
                        children: [
                            "Banked ",
                            /*#__PURE__*/ _jsxDEV("b", {
                                className: "text-primary",
                                children: [
                                    "$",
                                    net.toFixed(1),
                                    "M"
                                ]
                            }, void 0, true, {
                                fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                                lineNumber: 1604,
                                columnNumber: 18
                            }, this),
                            (career.yearlyCosts ?? 0) > 0 && /*#__PURE__*/ _jsxDEV(_Fragment, {
                                children: [
                                    " · Upkeep ",
                                    /*#__PURE__*/ _jsxDEV("b", {
                                        className: "text-destructive",
                                        children: [
                                            "$",
                                            (career.yearlyCosts ?? 0).toFixed(2),
                                            "M/yr"
                                        ]
                                    }, void 0, true, {
                                        fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                                        lineNumber: 1605,
                                        columnNumber: 57
                                    }, this)
                                ]
                            }, void 0, true)
                        ]
                    }, void 0, true, {
                        fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                        lineNumber: 1603,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                lineNumber: 1601,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ _jsxDEV("div", {
                className: "grid grid-cols-4 gap-1",
                children: visible.map((c)=>/*#__PURE__*/ _jsxDEV("button", {
                        onClick: ()=>setTab(c.key),
                        className: cn('rounded-lg px-1 py-1.5 text-[11px] font-bold transition-all', tab === c.key ? c.key === 'shady' ? 'bg-destructive/20 text-destructive' : 'bg-primary/15 text-primary' : 'bg-secondary text-muted-foreground hover:text-foreground'),
                        children: [
                            c.emoji,
                            " ",
                            c.label
                        ]
                    }, c.key, true, {
                        fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                        lineNumber: 1611,
                        columnNumber: 11
                    }, this))
            }, void 0, false, {
                fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                lineNumber: 1609,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ _jsxDEV("div", {
                className: "space-y-1.5",
                children: items.map((item)=>{
                    const isOwned = item.oneTime && owned.includes(item.id);
                    const needsNet = item.minNetWorth && net < item.minNetWorth;
                    const needsFame = item.minFanbase && career.fanbase < item.minFanbase;
                    const needsDirty = item.requiresDirty && (career.dirtyMoney ?? 0) <= 0;
                    const tooPoor = item.cost > net;
                    const disabled = !!(isOwned || needsNet || needsFame || needsDirty || tooPoor);
                    const lock = needsFame ? `Needs ${item.minFanbase} fanbase` : needsDirty ? 'Needs untraceable money to move' : needsNet ? `Needs $${item.minNetWorth}M banked` : tooPoor ? 'Cannot afford it yet' : null;
                    return /*#__PURE__*/ _jsxDEV("div", {
                        className: cn('rounded-lg border p-2', isOwned ? 'border-primary/30 bg-primary/5' : disabled ? 'border-border/50 bg-secondary/40 opacity-60' : 'border-border bg-secondary/60'),
                        children: /*#__PURE__*/ _jsxDEV("div", {
                            className: "flex items-center justify-between gap-2",
                            children: [
                                /*#__PURE__*/ _jsxDEV("div", {
                                    className: "min-w-0 flex-1",
                                    children: [
                                        /*#__PURE__*/ _jsxDEV("p", {
                                            className: "flex items-center gap-1.5 text-xs font-bold text-foreground",
                                            children: [
                                                /*#__PURE__*/ _jsxDEV("span", {
                                                    children: item.emoji
                                                }, void 0, false, {
                                                    fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                                                    lineNumber: 1643,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ _jsxDEV("span", {
                                                    className: "truncate",
                                                    children: item.name
                                                }, void 0, false, {
                                                    fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                                                    lineNumber: 1644,
                                                    columnNumber: 21
                                                }, this),
                                                isOwned && /*#__PURE__*/ _jsxDEV("span", {
                                                    className: "rounded bg-primary/20 px-1 py-0.5 text-[9px] font-bold text-primary",
                                                    children: "OWNED"
                                                }, void 0, false, {
                                                    fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                                                    lineNumber: 1645,
                                                    columnNumber: 33
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                                            lineNumber: 1642,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ _jsxDEV("p", {
                                            className: "mt-0.5 text-[11px] text-muted-foreground",
                                            children: item.desc
                                        }, void 0, false, {
                                            fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                                            lineNumber: 1647,
                                            columnNumber: 19
                                        }, this),
                                        item.effect && /*#__PURE__*/ _jsxDEV("p", {
                                            className: "mt-0.5 text-[11px] text-gold",
                                            children: [
                                                "⚡ ",
                                                item.effect
                                            ]
                                        }, void 0, true, {
                                            fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                                            lineNumber: 1648,
                                            columnNumber: 35
                                        }, this),
                                        !isOwned && lock && /*#__PURE__*/ _jsxDEV("p", {
                                            className: "mt-0.5 text-[11px] text-destructive/80",
                                            children: [
                                                "🔒 ",
                                                lock
                                            ]
                                        }, void 0, true, {
                                            fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                                            lineNumber: 1649,
                                            columnNumber: 40
                                        }, this),
                                        item.yearly ? /*#__PURE__*/ _jsxDEV("p", {
                                            className: "mt-0.5 text-[10px] text-muted-foreground",
                                            children: [
                                                "+ $",
                                                item.yearly.toFixed(2),
                                                "M a year upkeep"
                                            ]
                                        }, void 0, true, {
                                            fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                                            lineNumber: 1650,
                                            columnNumber: 34
                                        }, this) : null
                                    ]
                                }, void 0, true, {
                                    fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                                    lineNumber: 1641,
                                    columnNumber: 17
                                }, this),
                                !isOwned && /*#__PURE__*/ _jsxDEV("button", {
                                    onClick: ()=>onBuy(item.id),
                                    disabled: disabled,
                                    className: cn('shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all', disabled ? 'cursor-not-allowed bg-secondary text-muted-foreground' : 'bg-primary text-primary-foreground hover:opacity-90 active:scale-95'),
                                    children: item.cost > 0 ? `$${item.cost}M` : 'Hire'
                                }, void 0, false, {
                                    fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                                    lineNumber: 1653,
                                    columnNumber: 19
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                            lineNumber: 1640,
                            columnNumber: 15
                        }, this)
                    }, item.id, false, {
                        fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                        lineNumber: 1639,
                        columnNumber: 13
                    }, this);
                })
            }, void 0, false, {
                fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
                lineNumber: 1626,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "/home/runner/work/_temp/rc-out/files/save-retry/copies/retry.tsx",
        lineNumber: 1600,
        columnNumber: 5
    }, this);
}
