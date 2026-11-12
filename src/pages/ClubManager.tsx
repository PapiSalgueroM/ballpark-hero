import { Link } from 'react-router-dom';
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MutableRefObject, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { MidSeasonEntry } from '@/lib/clubManagerCalendar';
import { ChevronRight, ChevronLeft, Trophy, Briefcase } from 'lucide-react';
import { useClubManager } from '@/hooks/useClubManager';
import type { HubTab } from '@/hooks/useClubManager';
import {
  TIER_INFO, clubDefFor, clubPreviewRating, careerLeagueOf, money,
  isAvailable, xiAverageRating, sortedTable,
  CLUB_MANAGER_START_NATIONS as NATIONS, CLUB_MANAGER_START_LEAGUES as REAL_LEAGUES,
  playableClubs, objectiveStatuses, CM_ROSTER_META, isPartialClub, ordinaryClubAllowed, usesGeneratedOpeningSquad, isScopedStartLeague,
  isHistoricEra, eraLeaguesFor, eraPlayableClubs, boardWantLabel,
  developingPlayers, INTENSITY_INFO, FOCUS_INFO,
  brokenPromises, CM_ERAS, DEFAULT_ERA_ID, eraById, projectedXIAvg, CM_BASE_YEAR,
  worldSeasonLabel, pressOf, pressHeadline, preMatchRead,
  nationOfferFor, SHOOTOUT_MAX_ORDER, shootoutOrderOf, cupSatOutBy, leagueStarted,
} from '@/lib/clubManager';
// Round 1035: the A-League Men's squads come from their own generated file.
import { generatedLeagueCountClauses, generatedLeagueMonthClause } from '@/data/clubManagerWorldRosters';
import { K_LEAGUE_2026, kLeagueMember } from '@/data/kLeague2026';
import { J1_LEAGUE_2026 } from '@/data/j1League2026';
import { CSL_LEAGUE_2026 } from '@/data/cslLeague2026';
import { FACILITY_IDS, facilitiesOf } from '@/lib/clubManagerFacilities';
import { projectFinances } from '@/lib/clubManagerFinances';
import { expiringDealsLine, inboxTile, kittyChange, leagueTileValue, recordLine } from '@/lib/clubManagerHubLines';
import { myClubFirst, pitchName } from '@/lib/cmMatchDisplay';
import { BOARD_EDGE, boardMeter } from '@/lib/clubManagerMeters';
import { STAFF_POST_IDS, STAFF_POST_INFO, staffOf } from '@/lib/clubManagerStaff';
import { deskOf } from '@/lib/clubManagerDecisions';
import type { NationDef, CupRound, CustomClubSpec, ManagerSpec } from '@/lib/clubManager';
import { eraRealShareLabel, eraHonestyLine, eraRostersLoaded, ensureEraRosters } from '@/lib/clubManagerEras';
import { reloadToRetryChunk } from '@/lib/freshBuild';
import { FlagImg } from '@/components/FlagImg';
import { GameNav } from '@/components/game/GameNav';
import { GameShell } from '@/components/game/GameShell';
import { HowToPlayPopover } from '@/components/game/HowToPlayPopover';
import AdBanner from '@/components/ads/AdBanner';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { ClubManagerClubList } from '@/components/club-manager/ClubManagerClubList';
import { CURRENCIES, STRICTNESS_DEFAULT, STRICTNESS_INFO, levelFrom, noSackFrom, startOptionsOf } from '@/lib/clubManagerStart';
import { DIFFICULTY_INFO } from '@/lib/managerDifficulty';
import { POINTS_CAP, readPointsIndex } from '@/lib/cmSavePointsStore';
import type { CareerSetup } from '@/lib/clubManagerStart';
import { withWorldEdit, worldEditMoves, realLeagueIdOf } from '@/lib/clubManagerWorldEdit';
import type { WorldEdit } from '@/lib/clubManagerWorldEdit';
import { levelFor, pointsFree, xpOf, MAX_LEVEL } from '@/lib/clubManagerXp';
import { GAP, topInset, useRevealScroll } from '@/hooks/useRevealScroll';
import { useArrivalTop } from '@/hooks/useArrivalTop';
/* Round 1593: the hub's Week X of Y counts the weeks a season charges, never a night. */
import { tickingWeeksDone, tickingWeeksIn } from '@/lib/worldNights';

const Tabs = lazy(() => import('@/components/ui/tabs').then(m => ({ default: m.Tabs })));
const TabsContent = lazy(() => import('@/components/ui/tabs').then(m => ({ default: m.TabsContent })));
const TabsList = lazy(() => import('@/components/ui/tabs').then(m => ({ default: m.TabsList })));
const TabsTrigger = lazy(() => import('@/components/ui/tabs').then(m => ({ default: m.TabsTrigger })));
const EraLoadFailedView = lazy(() => import('@/components/club-manager/ClubManagerDeferredViews').then(m => ({ default: m.EraLoadFailed })));
const WorldEditorTile = lazy(() => import('@/components/club-manager/ClubManagerDeferredViews').then(m => ({ default: m.WorldEditorTile })));
const ClubHeading = lazy(() => import('@/components/club-manager/ClubManagerDeferredViews').then(m => ({ default: m.ClubHeading })));
const LeagueSeasonNotice = lazy(() => import('@/components/club-manager/ClubManagerDeferredViews').then(m => ({ default: m.LeagueSeasonNotice })));
const KLeagueCupNotice = lazy(() => import('@/components/club-manager/ClubManagerDeferredViews').then(m => ({ default: m.KLeagueCupNotice })));
const ClubStatus = lazy(() => import('@/components/club-manager/ClubManagerDeferredViews').then(m => ({ default: m.ClubStatus })));
const OverviewIntro = lazy(() => import('@/components/club-manager/ClubManagerDeferredViews').then(m => ({ default: m.OverviewIntro })));
const HubTiles = lazy(() => import('@/components/club-manager/ClubManagerDeferredViews').then(m => ({ default: m.HubTiles })));

const ClubManagerTreatmentPanel = lazy(() => import('@/components/club-manager/ClubManagerTreatmentPanel'));
const ClubManagerBoardPanel = lazy(() => import('@/components/club-manager/ClubManagerBoardPanel'));
const ClubManagerCareerPanel = lazy(() => import('@/components/club-manager/ClubManagerCareerPanel'));
const ConfettiBurst = lazy(() => import('@/components/club-manager/Celebration').then(m => ({ default: m.ConfettiBurst })));
const ClubManagerHelp = lazy(() => import('@/components/club-manager/ClubManagerHelp'));
const ManagerSlotsScreen = lazy(() => import('@/components/club-manager/ManagerSlotsScreen'));
/* Round 1323 review: lazy, for this page's weight (593.6K against its 593K row
   once Release BB joined). Fetched only once another tab has moved the career
   on. If the fetch fails (a deploy since this tab opened took the old file
   away), the page reloads itself the site's way, which is all the notice
   asks: the reload makes this tab the newest. Offline it stays put, never on
   a crash screen. Its writes are refused either way (saveCareer's fence). */
const SaveMovedNotice = lazy(() => import('@/components/SaveMovedNotice').catch(() => { reloadToRetryChunk(); return new Promise<never>(() => undefined); }));
const ClubManagerSeasonSummary = lazy(() => import('@/components/club-manager/ClubManagerSeasonSummary'));
const SackedCareerSummary = lazy(() => import('@/components/club-manager/ClubManagerSeasonSummary').then(m => ({ default: m.SackedCareerSummary })));
/* Round 1343: the farewell loads only for a career that retires; the door starts loading it when its confirm opens. */
const ClubManagerFarewell = lazy(() => import('@/components/club-manager/ClubManagerFarewell'));
const CmRetireDoor = lazy(() => import('@/components/club-manager/CmRetireDoor'));
const preloadFarewell = () => { void import('@/components/club-manager/ClubManagerFarewell'); };
const WorldEditorScreen = lazy(() => import('@/components/club-manager/WorldEditorScreen'));
const CustomClubForm = lazy(() => import('@/components/club-manager/CustomClubForm').then(m => ({ default: m.CustomClubForm })));
const CrestBadge = lazy(() => import('@/components/club-manager/CustomClubForm').then(m => ({ default: m.CrestBadge })));
const FacilitiesScreen = lazy(() => import('@/components/club-manager/FacilitiesScreen').then(m => ({ default: m.FacilitiesScreen })));
const StaffScreen = lazy(() => import('@/components/club-manager/StaffScreen').then(m => ({ default: m.StaffScreen })));
const FinancesScreen = lazy(() => import('@/components/club-manager/FinancesScreen').then(m => ({ default: m.FinancesScreen })));
const ManagerForm = lazy(() => import('@/components/club-manager/ManagerForm').then(m => ({ default: m.ManagerForm })));
const ClubManagerTeamPicker = lazy(() => import('@/components/club-manager/ClubManagerTeamPicker'));
const WorldTablesCard = lazy(() => import('@/components/club-manager/WorldTablesCard').then(m => ({ default: m.WorldTablesCard })));
const MetersStrip = lazy(() => import('@/components/club-manager/MetersStrip').then(m => ({ default: m.MetersStrip })));
const UclBracketCard = lazy(() => import('@/components/club-manager/UclBracketCard').then(m => ({ default: m.UclBracketCard })));
const UclGroupsCard = lazy(() => import('@/components/club-manager/UclGroupsCard').then(m => ({ default: m.UclGroupsCard })));
const CupBracketCard = lazy(() => import('@/components/club-manager/CupBracketCard').then(m => ({ default: m.CupBracketCard })));
const CupsPanel = lazy(() => import('@/components/club-manager/WorldCompScreen').then(m => ({ default: m.CupsPanel })));
const StatsScreen = lazy(() => import('@/components/club-manager/StatsScreen').then(m => ({ default: m.StatsScreen })));
const CalendarScreen = lazy(() => import('@/components/club-manager/CalendarScreen').then(m => ({ default: m.CalendarScreen })));
const InboxCard = lazy(() => import('@/components/club-manager/InboxCard').then(m => ({ default: m.InboxCard })));
const ClubDetailScreen = lazy(() => import('@/components/club-manager/ClubDetailScreen').then(m => ({ default: m.ClubDetailScreen })));
/* Round 1601: the player card (lazy) and the page's stack of cards (small, static). */
const PlayerCardScreen = lazy(() => import('@/components/club-manager/PlayerCardScreen').then(m => ({ default: m.PlayerCardScreen })));
import { CmCardsProvider, useCmCards } from '@/components/club-manager/CmCards';
const SquadScreen = lazy(() => import('@/components/club-manager/SquadScreen').then(m => ({ default: m.SquadScreen })));
const ContractsCard = lazy(() => import('@/components/club-manager/ContractsCard').then(m => ({ default: m.ContractsCard })));
const TacticsScreen = lazy(() => import('@/components/club-manager/TacticsScreen').then(m => ({ default: m.TacticsScreen })));
const TransferScreen = lazy(() => import('@/components/club-manager/TransferScreen').then(m => ({ default: m.TransferScreen })));
const HalftimeScreen = lazy(() => import('@/components/club-manager/HalftimeScreen').then(m => ({ default: m.HalftimeScreen })));
const MatchReportCard = lazy(() => import('@/components/club-manager/MatchReportCard').then(m => ({ default: m.MatchReportCard })));
const AcademyScreen = lazy(() => import('@/components/club-manager/AcademyScreen').then(m => ({ default: m.AcademyScreen })));
const TrainingScreen = lazy(() => import('@/components/club-manager/TrainingScreen').then(m => ({ default: m.TrainingScreen })));
const RolesScreen = lazy(() => import('@/components/club-manager/RolesScreen').then(m => ({ default: m.RolesScreen })));
const XpScreen = lazy(() => import('@/components/club-manager/XpScreen').then(m => ({ default: m.XpScreen })));
const StartOptionsScreen = lazy(() => import('@/components/club-manager/StartOptionsScreen').then(m => ({ default: m.StartOptionsScreen })));
/* Round 1512 review: the Difficulty row on the sacked screen, which has no Options tile. */
const DifficultyOption = lazy(() => import('@/components/club-manager/StartOptionsScreen').then(m => ({ default: m.DifficultyOption })));
/* Round 1513: the save points, with lz-string, load when the tile opens. */
const SavePointsScreen = lazy(() => import('@/components/club-manager/SavePointsScreen').then(m => ({ default: m.SavePointsScreen })));
const PressScreen = lazy(() => import('@/components/club-manager/PressScreen').then(m => ({ default: m.PressScreen })));
const MatchCentre = lazy(() => import('@/components/club-manager/MatchCentre').then(m => ({ default: m.MatchCentre })));
const LiveSimScreen = lazy(() => import('@/components/club-manager/LiveSimScreen').then(m => ({ default: m.LiveSimScreen })));

function ScreenLoading({ children, compact = false }: { children: ReactNode; compact?: boolean }) {
  return (
    <Suspense fallback={compact ? <span role="status" className="text-xs text-muted-foreground">Loading...</span> : <div role="status" className="min-h-48 py-12 text-center text-sm text-muted-foreground">Loading screen...</div>}>
      {children}
    </Suspense>
  );
}

/** Round 1597 review fix: the hub's deals line says "Open the contracts desk", and the Squad tab opened at the top
 *  of the squad list with the desk about 1,400 px further down. Mounted inside the desk's own Suspense boundary, so
 *  it runs once the desk is there, and it brings the desk's top into view once per press (served remembers the last
 *  press it answered, so opening the tab any other way never moves the page). One press, one scroll: no cleanup
 *  cancels it, unlike useRevealScroll, whose re-run on a re-render would. */
function DeskInView({ jump, served, children }: { jump: number; served: MutableRefObject<number>; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (jump <= served.current) return;
    served.current = jump;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const node = ref.current;
      if (!node) return;
      node.style.scrollMarginTop = `${topInset() + GAP}px`;
      const still = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      node.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'start', inline: 'nearest' });
    }));
  }, [jump, served]);
  return <div ref={ref}>{children}</div>;
}

/** Round 832: a past era's squads did not arrive (offline, a dropped
 *  connection, a new deploy). Says so and offers the fetch again. */
function EraLoadFailed({ label, noun = 'squads', onRetry, onBack, backLabel = 'Pick another season' }: { label: string; noun?: string; onRetry: () => void; onBack?: () => void; backLabel?: string }) {
  return <ScreenLoading><EraLoadFailedView label={label} noun={noun} onRetry={onRetry} onBack={onBack} backLabel={backLabel} /></ScreenLoading>;
}


type HubPanel = 'board' | 'inbox' | 'calendar' | 'manager' | 'treatment' | 'cups' | 'trophies' | 'academy' | 'training' | 'roles' | 'press' | 'matchCentre' | 'stats' | 'finance' | 'facilities' | 'staff' | 'xp' | 'options' | 'points';

const ClubManager = () => {
  const g = useClubManager();
  // Round 65: the owner's no scroll rule. Full time and season end screens are
  // what you were waiting for after pressing Play, so they pull themselves into
  // view rather than rendering below where your thumb just was.
  const revealRef = useRevealScroll<HTMLDivElement>(`${g.phase}:${g.career?.week ?? 0}`);
  /* Round 1328: every entry into the hub (a new job, a Resume, a new season)
     opens the club's home screen at its top before the first paint, instead of
     at the scroll offset the screen before it left behind. */
  const hubTopRef = useArrivalTop<HTMLDivElement>(g.phase === 'hub' && g.career ? 'hub' : null);
  /* Round 1343: the farewell opens at its top too. On the RETIRED heading, which has height before the lazy
     farewell lands. */
  const retiredTopRef = useArrivalTop<HTMLDivElement>(g.phase === 'retired' && g.career ? 'retired' : null);
  // Round 70: the nation -> league -> team picker. Each step change pulls the
  // new step into view (skipFirst so landing on the page stays put).
  // Round 72: nations can hold more than one league (England, the USA).
  /* Round 132: the era comes first, because it decides what every later screen
     is looking at: which squads, which players, how good each club is. Same
     idea as the era choice on the My Career create screen, laid out as tiles
     because this game is tiles. */
  const [pickStep, setPickStep] = useState<'era' | 'nation' | 'world' | 'league' | 'team' | 'custom' | 'manager'>('era');
  const [pickEra, setPickEra] = useState<string>(DEFAULT_ERA_ID);
  const [pickNation, setPickNation] = useState<NationDef | null>(null);
  const [pickLeagueId, setPickLeagueId] = useState<string | null>(null);
  /* Round 303: a founded club waits here while the dugout step runs, so the
     manager spec and the club spec land in startCareer together. */
  const [pendingCustomSpec, setPendingCustomSpec] = useState<CustomClubSpec | null>(null);
  /* Round 964: the world editor's edit, held here until the career starts on
     it. Null is the real world. It applies to today's era and real clubs only. */
  const [worldEdit, setWorldEdit] = useState<WorldEdit | null>(null);
  /* Round 964 review: the edited world's club lists and board asks, worked
     out once per edit inside ONE registration. Each registration rebuilds the
     club def map, and wrapping every list and every league tile on every
     render rebuilt it a couple of dozen times a render. Skipped on the editor
     screen itself, where the edit changes with every tap and none of this is
     drawn. */
  const onWorldStep = pickStep === 'world';
  const editedPicker = useMemo(() => {
    if (!worldEdit || onWorldStep) return null;
    return withWorldEdit(worldEdit, () => {
      const teamsBy = new Map(REAL_LEAGUES.map(l => [l.id, playableClubs(l.id)] as const));
      const wants = new Map([...teamsBy.values()].flat().map(c => [c.name, boardWantLabel(c.name)] as const));
      return { teamsBy, wants };
    });
  }, [worldEdit, onWorldStep]);
  /* Round 832: a past era's squads are fetched when its tile is picked, while
     the nation step (which needs none of them) is on screen. This records a
     fetch still running or one that failed, so the league and team steps can
     wait for it or offer a retry. Null when nothing is pending. */
  const [eraLoad, setEraLoad] = useState<{ id: string; failed: boolean } | null>(null);
  const loadPickedEra = useCallback((id: string, retry = false) => {
    if (eraRostersLoaded(id)) { setEraLoad(null); return; }
    setEraLoad({ id, failed: false });
    ensureEraRosters(id).then(
      () => setEraLoad(cur => (cur && cur.id === id ? null : cur)),
      () => {
        /* Round 832 review: Try again reloads the page when the import fails
           again, because Chromium never refetches a failed chunk in the same
           page (see reloadToRetryChunk). */
        if (retry && reloadToRetryChunk()) return;
        setEraLoad(cur => (cur && cur.id === id ? { id, failed: true } : cur));
      },
    );
  }, []);
  const pickRef = useRevealScroll<HTMLDivElement>(`pick:${pickStep}:${pickEra}:${pickNation?.id ?? ''}:${pickLeagueId ?? ''}`, { skipFirst: true });
  const era = eraById(pickEra);
  const eraYearsOn = Math.max(0, era.startYear - CM_BASE_YEAR);
  // Round 74: the tile rule. Boxes on the home screen open their own
  // screens, and any club anywhere opens the rival viewer.
  const [hubPanel, setHubPanel] = useState<HubPanel | null>(null);
  /* Round 1601: the club page rides the page's stack of cards with the player cards; this shim keeps every
     caller's setClubView(club) and the swap reset's setClubView(null) as they were. */
  const cards = useCmCards();
  const card = cards?.top ?? null;
  const setClubView = useCallback((club: string | null) => { if (club) cards?.open({ k: 'club', club }); else cards?.reset(); }, [cards]);
  /* Round 158: watching the match live instead of jumping between screens.
     While this is on, the halftime and full time phases render inside the
     animated viewer; turning it off drops back to the classic screens.
     Round 472: Play Live turns it on and Quick Sim turns it off, both of
     them, every time. Before that the quick sim only ever set the phase, so
     a live match that ended somewhere other than the full report (a January
     window landing on the same tap) left this on, and the next quick sim
     animated ninety minutes at a player who had asked not to watch. */
  const [watchMode, setWatchMode] = useState(false);
  /* Round 782: the pre match card's shortcut to the shootout order asks the
     tactics tab to open that tile on arrival; the tab hands the request back. */
  const [tacticsTile, setTacticsTile] = useState<'shootout' | null>(null);
  /* Round 1597 review fix: each press of the hub's deals line, and the last one the desk has answered (DeskInView). */
  const [deskJump, setDeskJump] = useState(0);
  const deskServed = useRef(0);
  const panelRef = useRevealScroll<HTMLDivElement>(`hub:${hubPanel ?? ''}:${cards?.pushes ?? 0}`, { skipFirst: true });
  /* Round 928 review: the managers screen is where one career is swapped for
     another, so the hub's open panel, rival view, live viewer switch and
     tactics request belong to the career being left, not the one coming in. */
  useEffect(() => {
    if (g.phase !== 'resume') return;
    setHubPanel(null);
    setClubView(null);
    setWatchMode(false);
    setTacticsTile(null);
  }, [g.phase]);

  /* Round 154: clubDefFor, not clubByName, because a custom club has no
     entry in any static table and resolves through the save's registered
     spec instead (color, tier, expectation all correct, never null). */
  const club = g.career ? clubDefFor(g.career.clubName) : null;
  const unavailable = useMemo(
    () => (g.career ? g.career.squad.filter(p => !isAvailable(p)) : []),
    [g.career],
  );
  // Round 116: the academy and the training ground feed their own hub tiles.
  const academy = g.career?.academy ?? null;
  const prospectCount = academy ? academy.prospects.length : 0;
  const growingCount = useMemo(
    () => (g.career ? developingPlayers(g.career).length : 0),
    [g.career],
  );
  const trainingLabel = g.career?.training
    ? `${INTENSITY_INFO[g.career.training.intensity].label} · ${FOCUS_INFO[g.career.training.focus].label}`
    : 'Not set';
  // Round 127: who you are letting down, and who has already asked to go.
  const letDown = useMemo(
    () => (g.career ? brokenPromises(g.career) : []),
    [g.career],
  );
  const wantAway = useMemo(
    () => (g.career ? g.career.squad.filter(p => p.wantsOut) : []),
    [g.career],
  );
  // Round 135: the press room and the team talk.
  const press = g.career ? pressOf(g.career) : null;
  const matchRead = useMemo(
    () => (g.career && !g.career.live ? preMatchRead(g.career) : null),
    [g.career],
  );

  const shell = (inner: ReactNode) => (
    <>
      <PageSeo
        title="Club Manager: Football Tactics and Transfers | DoUKnowBall"
        description="Take over a real club in a current or historical season. Set tactics, negotiate transfers and meet the board’s targets in a free football management sim."
        path="/club-manager"
      />
      <GameShell
        help="none"
        width="wide"
        showReportQuestion
        reportGameType="club-manager"
      >
        <div className="relative">
          {/* Round 1328: the "?" is 44 by 44 now, pulled 8px further into the
              corner so it covers no more of the screen than the old 36px one. */}
          <HowToPlayPopover title="How to Play Club Manager" triggerSide="right" className="-mr-2 -mt-2 inline-flex min-h-[44px] min-w-[44px] items-center justify-center">
            <ScreenLoading><ClubManagerHelp /></ScreenLoading>
          </HowToPlayPopover>
          {/* Round 634: the save was refused and the player is told, in plain
              words, once per phase screen and only while it stays refused.
              Before this a full or blocked browser store dropped the career
              silently, which is the first live report of 2026-09-13. */}
          {g.saveFailed && (
            <div role="alert" data-testid="cm-save-failed" className="mb-4 rounded-xl border border-destructive/60 bg-destructive/10 px-4 py-3 text-sm text-foreground">
              <div className="font-bold">Your career is not being saved right now.</div>
              <div className="mt-1 text-muted-foreground">
                This browser has no storage left for douknowball.com, or is blocking it (private browsing does that).
                Whatever you do here will be gone when you leave the page. To fix it, free up space in your browser's
                site settings or open the game in a normal window, then play a week and this notice will go away.
              </div>
            </div>
          )}
          {/* Round 1522 review: this career's tactics did not load (a dropped connection, or a deploy since the
              page opened), so no match of it can be played until the page loads them again. */}
          {g.tacticsFailed && (
            <div role="alert" data-testid="cm-tactics-failed" className="mb-4 rounded-xl border border-destructive/60 bg-destructive/10 px-4 py-3 text-sm text-foreground">
              Your tactics did not load, so the next match cannot start yet.{' '}
              <button type="button" onClick={g.retryTactics} className="font-bold underline">Reload the page</button> to carry on.
            </div>
          )}
          {/* Round 1323: another tab has played this career on, so this one
              writes nothing more and covers itself until it is reloaded. */}
          {g.saveMoved && <Suspense fallback={null}><SaveMovedNotice message="This career moved on in another tab. Reload to carry on." /></Suspense>}
          {g.positionNotice && <div role="alert" data-testid="cm-position-blocked" className="mb-4 rounded-xl border border-destructive/60 bg-destructive/10 px-4 py-3 text-sm text-foreground">{g.positionNotice}</div>}
          {inner}
        </div>
        <AdBanner slot="7540487748" format="horizontal" className="mt-8" />
        <GameSeoContent
          pageHasOwnH1
          title="Club Manager: Football Management Sim"
          description="Manage a current football club or start in one of four past seasons. J1 League, K League 1 and the Chinese Super League open with generated squads. J1 can use verified opponents and home sides in 2026/27, with simulated dates, stadiums and results. Pick your tactics, sign players and keep the board happy."
          howToPlay={[
            'Choose your season, nation, league and club. Pick Japan for the 2026/27 J1 start or China for the 2026 Chinese Super League start.',
            'Set your formation and starting eleven. Choose Play Live or Quick Sim. Open the Calendar to play ahead.',
            'Sign players, renew contracts and check the board screen for your targets.',
            'Review your results at the end of the season. Tap Managers to switch between your saved careers.',
          ]}
        >
          {/* Round 655: every league and club as readable text, below the guide. */}
          <ClubManagerClubList />
        </GameSeoContent>
        <GameNav />
      </GameShell>
    </>
  );

  /* ================= BOOT ================= */
  if (g.phase === 'boot') {
    /* Round 832: an era save waits for its era's squads, and a failed fetch
       says so with a way to try again, never a blank page and never a fresh
       start offered over the career. */
    if (g.bootError) {
      /* Round 928 review: opening an era slot moves the index first, so a
         failed fetch used to leave the player stuck here, away from managers
         that would open fine. The way back to them is right beside the retry. */
      return shell(<EraLoadFailed label={g.bootError} noun={g.bootNoun} onRetry={g.retryBoot} onBack={g.showSlots} backLabel="Back to your managers" />);
    }
    /* Round 1225 review: a new career waiting for its league's real fixture
       list. The wait says what it is waiting for, and it pulls itself into
       view: the picker leaves the page scrolled to its last button, and the
       review measured a bare "Loading…" sitting a whole screen above where the
       player was looking for all eight seconds. A list that failed or ran out
       of time says so and asks, rather than starting a generated season
       under a promise of the real one. */
    if (g.startWait) {
      return shell(
        <div ref={revealRef}>
          {g.startWait.failed
            ? <EraLoadFailed label={g.startWait.label} noun="fixture list" onRetry={g.retryStart} onBack={g.startWithoutList} backLabel="Start on generated fixtures" />
            : <div role="status" data-testid="cm-start-wait" className="text-center py-24 text-muted-foreground animate-pulse">Loading the {g.startWait.label} fixture list…</div>}
        </div>,
      );
    }
    return shell(<div className="text-center py-24 text-muted-foreground animate-pulse">Loading…</div>);
  }

  /* ================= MANAGER SLOTS (Round 928, where the resume prompt was) ================= */
  if (g.phase === 'resume') {
    const c = g.career;
    return shell(
      <ScreenLoading>
        <ManagerSlotsScreen
          slots={g.slots}
          activeDetail={c && !c.retired ? `Week ${Math.min(tickingWeeksDone(c.calendar, c.week) + 1, tickingWeeksIn(c.calendar))} of ${tickingWeeksIn(c.calendar)} · Board ${Math.round(c.boardConfidence)}/100` : null}
          note={g.slotNote}
          onContinue={g.openSlot}
          onNew={g.newInSlot}
          onDelete={g.removeSlot}
        />
      </ScreenLoading>
    );
  }

  /* ================= CLUB SELECT (Round 70: nation -> league -> team) ================= */
  if (g.phase === 'clubSelect') {
    /* Round 303: the dugout step hands in null (skip) or a manager spec, and
       either way the picker resets for the next career. */
    const confirmAndReset = (manager: ManagerSpec | null, entry?: MidSeasonEntry, setup?: CareerSetup) => {
      if (pendingCustomSpec) g.confirmCustomClub(pickEra, pendingCustomSpec, manager ?? undefined, entry, setup);
      else g.confirmClub(pickEra, manager ?? undefined, entry, isHistoricEra(pickEra) ? null : worldEdit, setup);
      setWorldEdit(null);
      setPickStep('era');
      setPickEra(DEFAULT_ERA_ID);
      setPickNation(null);
      setPickLeagueId(null);
      setPendingCustomSpec(null);
    };
    /* Round 146: a historic era swaps the whole picker world: its nations,
       its leagues, its clubs, its stature. The modern path is untouched. */
    const historicPick = isHistoricEra(pickEra);
    /* Round 832: every step past the nations reads the era's squads, so a
       past era holds those steps on a loading line (or a retry) until they
       are here. Today's world is always ready. */
    const eraReady = eraRostersLoaded(pickEra);
    const waitingForEra = historicPick && !eraReady && pickStep !== 'era' && pickStep !== 'nation';
    const league = pickLeagueId
      ? (historicPick ? eraLeaguesFor(pickEra) : REAL_LEAGUES).find(l => l.id === pickLeagueId)
      : null;
    /* Round 964: today's picker lists and board asks read the edited world
       for the length of one synchronous call, and nothing stays registered. */
    const editing = !historicPick && worldEdit !== null;
    const edited = editing ? editedPicker : null;
    const inWorld = <T,>(fn: () => T): T => (editing ? withWorldEdit(worldEdit, fn) : fn());
    const todaysTeams = (id: string) => edited?.teamsBy.get(id) ?? inWorld(() => playableClubs(id));
    const teams = league && !waitingForEra
      ? (historicPick ? eraPlayableClubs(pickEra, league.id) : todaysTeams(league.id))
      : [];
    const teamWants = edited
      ? new Map(teams.map(c => [c.name, edited.wants.get(c.name) ?? ''] as const))
      : new Map(inWorld(() => teams.map(c => [c.name, boardWantLabel(c.name, historicPick ? pickEra : undefined)] as const)));
    const movedCount = editing ? worldEditMoves(worldEdit).length : 0;
    const homeNationOf = (club: string) => {
      const home = editing ? realLeagueIdOf(club) : null;
      return home ? NATIONS.find(n => n.leagueIds.includes(home))?.name ?? null : null;
    };

    return shell(
      <div ref={pickRef}>
        <header className="text-center mb-6">
          <h1 className="text-4xl md:text-6xl font-bold tracking-[0.1em] text-primary font-display mb-1">CLUB MANAGER</h1>
          <p className="text-muted-foreground text-sm md:text-base max-w-xl mx-auto">
            {REAL_LEAGUES.length} selectable leagues and {REAL_LEAGUES.reduce((s, l) => s + l.clubs.length, 0)} member clubs today. The existing 27 leagues use roster snapshots from {CM_ROSTER_META.asOf}{generatedLeagueMonthClause() ? ` (${generatedLeagueMonthClause()})` : ''}. K League 1, J1 League and the Chinese Super League use generated opening squads. Four real past seasons stay separate: 2020-21, 2015-16, 2010-11 and 2005-06.
          </p>
        </header>

        {/* Step breadcrumb */}
        <div className="flex items-center justify-center gap-1.5 mb-5 text-[10px] font-bold flex-wrap">
          {(['era', 'nation', 'league', 'team', 'manager'] as const).map((s, i) => (
            <span key={s} className="inline-flex items-center gap-1.5">
              {i > 0 && <ChevronRight className="w-3 h-3 text-muted-foreground/50" />}
              <span className={cn(
                'px-2.5 py-1 rounded-full border',
                pickStep === s ? 'bg-primary/10 border-primary text-primary' : 'bg-card border-border text-muted-foreground',
              )}>
                {i + 1}. {s === 'era' ? 'When' : s === 'nation' ? 'Nation' : s === 'league' ? 'League' : s === 'team' ? 'Team' : 'Dugout'}
              </span>
            </span>
          ))}
        </div>

        {/* -------- Step 0 (Round 132): when do you start -------- */}
        {pickStep === 'era' && (
          <div className="max-w-2xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {CM_ERAS.map(e => (
                <button
                  key={e.id}
                  onClick={() => { setPickEra(e.id); setPickStep('nation'); loadPickedEra(e.id); }}
                  className="rounded-xl border bg-card border-border hover:border-primary px-4 py-3 text-left transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl leading-none">{e.emoji}</span>
                    <div className="min-w-0">
                      <div className="text-base font-bold font-display text-foreground">{e.label}</div>
                      <div className="text-[10px] text-muted-foreground">{e.id === DEFAULT_ERA_ID ? 'Current clubs; K League squads are generated.' : e.blurb}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto shrink-0" />
                  </div>
                  {/* Kept to one line on purpose: at 390x844 all four tiles
                      have to sit above the fold, and the full measured wording
                      is one tap away on the team step. */}
                  {/* Round 146: the past is REAL DATA too, because it comes off
                      its own bake. Only a future would be a projection, and we
                      do not offer futures. */}
                  <div className={cn(
                    'mt-1.5 inline-block text-[9px] font-bold px-1.5 py-0.5 rounded border',
                    /* Round 347: token inks so light mode can answer them; the
                       tinted borders and fills read fine on both themes. */
                    e.startYear <= CM_BASE_YEAR
                      ? 'text-[hsl(var(--wc-green-ink))] border-emerald-500/50 bg-emerald-500/10'
                      : 'text-gold border-yellow-500/50 bg-yellow-500/10',
                  )}>
                    {e.id === DEFAULT_ERA_ID ? 'REAL CLUBS · SQUAD COVERAGE VARIES' : <>{e.startYear <= CM_BASE_YEAR ? 'REAL DATA' : 'PROJECTION'} · {eraRealShareLabel(e)}</>}
                  </div>
                </button>
              ))}
            </div>
            {/* The honest note about what is NOT here, which matters more than
                what is. Round 139 removed the future starts on the owner's call
                (nobody knows the future). Round 146 delivered the first real
                past season from real historical records. */}
            <p className="text-[9px] text-muted-foreground text-center mt-2.5 leading-snug max-w-lg mx-auto">
              No future eras, ever: nobody knows the future and we will not pretend to. The 2020-21, 2015-16, 2010-11 and
              2005-06 seasons are built from real market data records, real squads with their real ages and values from those
              years, not recreations. 2005-06 is as far back as the records honestly reach, so there is no 2000 era and
              there will not be an invented one. No made up name ever appears on a teamsheet unmarked.
            </p>
            {/* Round 520: the competition's real format, season by season, one tap
                from the era you are about to pick. */}
            <p className="text-[10px] text-center mt-1">
              <Link to="/champions-league-format-history" className="inline-flex items-center min-h-[32px] px-2 text-primary hover:underline">How the real Champions League format changed, and what each era here plays</Link>
            </p>
            {/* Round 928: a way back to the other managers from a new one's picker. */}
            {g.slots.some(v => v.summary && !v.active) && (
              <p className="text-[11px] text-center mt-1">
                <button onClick={g.showSlots} className="inline-flex items-center min-h-[32px] px-2 text-muted-foreground hover:text-primary hover:underline">
                  <ChevronLeft className="w-3.5 h-3.5" /> Back to your managers
                </button>
              </p>
            )}
          </div>
        )}

        {/* -------- Step 1: nation -------- */}
        {pickStep === 'nation' && (
          <div className="max-w-2xl mx-auto mb-2.5">
            <button
              onClick={() => setPickStep('era')}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> {era.emoji} Starting {era.label}
            </button>
          </div>
        )}
        {/* Round 964: the world editor, today's world only. One tile, and the
            edit it holds rides into every later step and into the career. */}
        {pickStep === 'nation' && !historicPick && (
          <div className="max-w-2xl mx-auto mb-2.5">
            <ScreenLoading compact><WorldEditorTile movedCount={movedCount} onOpen={() => setPickStep('world')} /></ScreenLoading>
          </div>
        )}
        {pickStep === 'world' && !historicPick && (
          <ScreenLoading><WorldEditorScreen
            edit={worldEdit}
            onChange={setWorldEdit}
            onBack={() => setPickStep('nation')}
            onDone={() => setPickStep('nation')}
          /></ScreenLoading>
        )}
        {pickStep === 'nation' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-2xl mx-auto">
            {NATIONS.filter(n => n.leagueIds.some(isScopedStartLeague)
              ? pickEra === DEFAULT_ERA_ID && !editing
              : !historicPick || eraLeaguesFor(pickEra, n).length > 0).map(n => {
              /* Round 146: in a historic era a nation offers its era leagues,
                 so 2010 England is the 20 club Premier League and the other
                 ten nations are simply not on the board. */
              const leagues = historicPick
                ? eraLeaguesFor(pickEra, n)
                : n.leagueIds
                  .map(id => REAL_LEAGUES.find(l => l.id === id))
                  .filter((l): l is typeof REAL_LEAGUES[number] => !!l);
              const clubCount = leagues.reduce((s, l) => s + l.clubs.length, 0);
              // Round 106: his note, in his words: "dont be saying teams. just
              // the leagues". A nation card is a nation and what you can manage
              // in it, so it names the leagues rather than three arbitrary clubs.
              const top = leagues.map(l => l.name).join(' · ');
              return (
                <button
                  key={n.id}
                  onClick={() => { setPickNation(n); setPickLeagueId(null); setPickStep('league'); }}
                  className="rounded-xl border bg-card border-border hover:border-primary p-4 text-left transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <FlagImg name={n.name} size={34} />
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-foreground">{n.name}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {leagues.length > 1 ? `${leagues.length} leagues` : '1 league'} · {clubCount} clubs{!historicPick && n.leagueIds.includes(K_LEAGUE_2026.id) ? ` · ${leagues.reduce((s, l) => s + todaysTeams(l.id).length, 0)} available jobs` : ''}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto shrink-0" />
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-2 truncate">{top}</div>
                </button>
              );
            })}
          </div>
        )}

        {/* Round 832: the past era's squads are still on their way, or did not come. */}
        {waitingForEra && (
          eraLoad?.id === pickEra && eraLoad.failed
            ? <EraLoadFailed label={era.label} onRetry={() => loadPickedEra(pickEra, true)} onBack={() => { setPickStep('era'); setPickNation(null); setPickLeagueId(null); }} />
            : <div className="text-center py-16 text-muted-foreground animate-pulse">Loading the {era.label} squads…</div>
        )}

        {/* -------- Step 2: league -------- */}
        {pickStep === 'league' && pickNation && !waitingForEra && (
          <div className="max-w-2xl mx-auto space-y-2.5">
            <button
              onClick={() => { setPickStep('nation'); setPickNation(null); }}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> All nations
            </button>
            {(historicPick
              ? eraLeaguesFor(pickEra, pickNation).map(l => l.id)
              : pickNation.leagueIds
            ).map(id => {
              const lg = (historicPick ? eraLeaguesFor(pickEra) : REAL_LEAGUES).find(l => l.id === id);
              if (!lg) return null;
              const lgTeams = historicPick ? eraPlayableClubs(pickEra, lg.id) : todaysTeams(lg.id);
              return (
                <button
                  key={lg.id}
                  onClick={() => { setPickLeagueId(lg.id); setPickStep('team'); }}
                  className="w-full rounded-xl border bg-card border-border hover:border-primary p-4 text-left transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <FlagImg name={pickNation.name} size={34} />
                    <div className="min-w-0">
                      <div className="text-base font-bold text-foreground">{lg.name}{lg.id === CSL_LEAGUE_2026.id ? ' · 2026 start' : ''}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {lg.clubs.length} clubs · {lg.id === K_LEAGUE_2026.id ? `${lgTeams.length} available jobs · Korea Cup not played` : lg.cupName !== null ? `domestic cup: ${lg.cupName}` : 'no domestic cup'}{lg.euro ? ' · Champions League spots' : ''}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto shrink-0" />
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-2 truncate">
                    {lg.id === K_LEAGUE_2026.id || isScopedStartLeague(lg.id) ? 'Club options' : 'Strongest sides'}: {lgTeams.slice(0, 4).map(c => c.name).join(' · ')}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* -------- Step 3: team -------- */}
        {pickStep === 'team' && pickNation && league && !waitingForEra && (
          <div className={cn(g.pendingClub && 'pb-24')}>
            <button
              onClick={() => { g.chooseClub(''); setPickStep('league'); }}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> <FlagImg name={pickNation.name} size={14} /> {league.name}
            </button>
            {league.id === K_LEAGUE_2026.id && <p data-cm-kleague-access className="text-xs text-muted-foreground mb-3">The current K League 1 catalogue has {K_LEAGUE_2026.clubs.length} members; your world offers {teams.length} ordinary jobs here. {K_LEAGUE_2026.clubs.filter(c => !ordinaryClubAllowed(c.name)).map(c => c.name).join(', ')} remains in the league world as an opponent. Managing or joining the real club is not supported here yet.</p>}
            {league.id === J1_LEAGUE_2026.id && <p data-cm-j1-access className="text-xs text-muted-foreground mb-3">Choose from all {teams.length} J1 clubs. Opening squads are generated and ratings and budgets are game estimates. The first season can use the verified 2026/27 fixture order on Club Manager's simulated calendar.</p>}
            {league.id === CSL_LEAGUE_2026.id && <p data-cm-csl-access className="text-xs text-muted-foreground mb-3">2026 start with all {teams.length} clubs and the real opening point deductions. Squads, ratings, budgets, fixtures, dates and results are simulated.</p>}
            {(() => {
              const rows = teams.map(c => {
                const sel = g.pendingClub === c.name;
                const partial = isPartialClub(c.name, historicPick ? pickEra : undefined);
                return {
                  name: c.name,
                  color: c.color,
                  selected: sel,
                  flagName: homeNationOf(c.name) ?? pickNation.name,
                  tierEmoji: TIER_INFO[c.tier].emoji,
                  tierLabel: TIER_INFO[c.tier].label,
                  partial,
                  ...(!historicPick && usesGeneratedOpeningSquad(c.name) ? { modelOnlyRoster: true } : {}),
                  rating: Math.round(projectedXIAvg(c.name, eraYearsOn, pickEra) ?? clubPreviewRating(c.name)),
                  budgetLabel: money(c.budget),
                  boardTitle: teamWants.get(c.name) ?? '',
                  boardText: teamWants.get(c.name) ?? '',
                };
              });
              return (
                <ScreenLoading><ClubManagerTeamPicker
                  rows={rows}
                  editing={editing}
                  wrapNames={league.id === CSL_LEAGUE_2026.id}
                  historicalEra={historicPick ? era : undefined}
                  onPick={name => g.chooseClub(name, pickEra)}
                  onCreate={isScopedStartLeague(league.id) ? undefined : () => { g.chooseClub(''); setPickStep('custom'); }}
                /></ScreenLoading>
              );
            })()}
            {!isScopedStartLeague(league.id) && <p className="text-[9px] text-muted-foreground text-center mt-3">
              {historicPick ? (
                <>{eraHonestyLine(era)}</>
              ) : (
                <>{teams.some(c => kLeagueMember(c.name)) ? <>K League member clubs have no verified opening roster here: their starting players are generated, and ratings and budgets are game estimates. Any other clubs on this screen keep their stated roster coverage.</> : <>Squads, ratings and values from market data plus the verified summer window: {CM_ROSTER_META.players} players as of {CM_ROSTER_META.asOf}, refreshed {CM_ROSTER_META.generated}, and {generatedLeagueCountClauses().join(', and ')}.</>}</>
              )}
              {eraYearsOn > 0 && (
                <> Starting {era.label}, so those squads have been aged {eraYearsOn} years: {eraHonestyLine(era)}</>
              )}
            </p>}

            {/* Round 70: no scrolling to confirm. The confirm bar pins to the
                bottom of the screen the moment a club is picked. */}
            {g.pendingClub && (
              <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur-sm [body[data-consent-pending]_&]:bottom-[var(--dukb-consent-height,230px)]">
                <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Your club</div>
                    <div className="text-sm font-bold text-foreground truncate">{g.pendingClub}</div>
                  </div>
                  <button
                    onClick={() => { setPendingCustomSpec(null); setPickStep('manager'); }}
                    className="shrink-0 inline-flex items-center gap-2 px-6 py-2.5 rounded-full font-bold bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                  >
                    <Briefcase className="w-4 h-4" /> Take the job
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* -------- Step 4 (optional): found your own club (Round 154) -------- */}
        {pickStep === 'custom' && pickNation && league && !waitingForEra && (
          <ScreenLoading><CustomClubForm
            leagueName={league.name}
            leagueId={league.id}
            eraId={historicPick ? pickEra : undefined}
            onBack={() => setPickStep('team')}
            onCreate={spec => { setPendingCustomSpec(spec); setPickStep('manager'); }}
          /></ScreenLoading>
        )}

        {/* -------- Step 5 (Round 303): who is in the dugout -------- */}
        {pickStep === 'manager' && !waitingForEra && (
          <ScreenLoading><ManagerForm
            clubName={pendingCustomSpec?.name || g.pendingClub || 'Back'}
            defaultNation={pickNation?.name ?? 'England'}
            onBack={() => {
              /* Backing out of the dugout drops the stashed club spec too, so
                 a later real club confirm can never pick up a stale founding. */
              const target = pendingCustomSpec ? 'custom' : 'team';
              setPendingCustomSpec(null);
              setPickStep(target);
            }}
            onConfirm={confirmAndReset}
          /></ScreenLoading>
        )}
      </div>
    );
  }

  /* ================= MATCH RESULT ================= */
  /* ================= LIVE SIM (Round 158) ================= */
  /* The animated viewer owns both match phases while watch mode is on: the
     first half plays out, the interval is the real dressing room embedded,
     the second half replays the report's own timeline, and Full report
     hands over to the classic full time card. A second half that has been
     drawn is always watched here, watch mode or not: the classic dressing
     room below settles its talk at the whistle, after the football it was
     meant to change, so leaving the viewer mid second half must land back
     in the viewer. */
  if (g.career && (watchMode || g.career.live?.h2Drawn) && (g.phase === 'halftime' || g.phase === 'matchResult')) {
    const liveClub = clubDefFor(g.career.clubName);
    return shell(
      <div ref={revealRef}>
        <header className="text-center mb-3">
          <h1 className="text-2xl md:text-3xl font-bold text-primary font-display">MATCH LIVE</h1>
        </header>
        <ScreenLoading><LiveSimScreen
          career={g.career}
          live={g.career.live ?? null}
          report={g.phase === 'matchResult' ? g.report : null}
          positionNotice={g.positionNotice}
          clubColor={liveClub.color}
          onSub={g.subAtHalftime}
          onShape={g.shapeAtHalftime}
          onTalk={g.halftimeTalk}
          onSecondHalf={g.secondHalf}
          onStartSecondHalf={g.startSecondHalfLive}
          onStartExtraTime={g.startExtraTimeLive}
          onChange={g.changeAt}
          onMark={g.markMinute}
          onExit={() => setWatchMode(false)}
        /></ScreenLoading>
      </div>
    );
  }

  /* ================= HALF TIME (Round 119) ================= */
  if (g.phase === 'halftime' && g.career?.live) {
    return shell(
      <div ref={revealRef}>
        <header className="text-center mb-4">
          <h1 className="text-2xl md:text-3xl font-bold text-primary font-display">HALF TIME</h1>
        </header>
        <ScreenLoading><HalftimeScreen
          career={g.career}
          onSub={g.subAtHalftime}
          onShape={g.shapeAtHalftime}
          onChange={g.changeAtHalftime}
          onTalk={g.halftimeTalk}
          onSecondHalf={g.secondHalf}
        /></ScreenLoading>
      </div>
    );
  }

  if (g.phase === 'matchResult' && g.report && g.career) {
    return shell(
      <div ref={revealRef}>
        <header className="text-center mb-4">
          <h1 className="text-2xl md:text-3xl font-bold text-primary font-display">FULL TIME</h1>
        </header>
        <ScreenLoading><MatchReportCard report={g.report} clubName={g.career.clubName} onContinue={g.continueFromReport} noSack={noSackFrom(g.career) !== null} /></ScreenLoading>
      </div>
    );
  }

  /* ================= SEASON END ================= */
  if (g.phase === 'seasonEnd' && g.summary && g.career) {
    const sm = g.summary;
    /* Round 541: this block's own career binding, exactly like the resume
       block and the sacked block below. The transfer business list reads it
       for the currency symbol, and the only other binding sits at function
       body level BELOW this early return, so reaching for that one put the
       screen in the temporal dead zone and threw ReferenceError the moment a
       player finished a season having signed or sold anybody. Round 514 fixed
       the identical trap for the `money` identifier and moved it onto `c` at
       this one call site, which is the argument for the scope check in
       scripts/simEarlyReturnScope.mjs rather than another careful read. */
    const c = g.career;
    // Round 66: same treatment as full time. Only one phase screen renders at a
    // time, so the shared ref is safe here too.
    return shell(
      <div ref={revealRef} className="text-center relative">
        {/* Round 147: a season that ends with silverware rains on the summary. */}
        {sm.trophies.length > 0 && <Suspense fallback={null}><ConfettiBurst seed={sm.season * 13 + sm.trophies.length} count={40} /></Suspense>}
        <h1 className="text-3xl md:text-5xl font-bold text-primary font-display mb-1">SEASON {sm.season} COMPLETE</h1>
        <p className="text-muted-foreground text-sm mb-5">{sm.club} · finished <span className="text-foreground font-bold">#{sm.position}</span> with {sm.points} pts</p>
        <ScreenLoading><ClubManagerSeasonSummary sm={sm} c={c} g={g} /></ScreenLoading>
        {/* Round 1343: retire here, before the summer. */}
        <div className="mt-4 mx-auto max-w-sm"><Suspense fallback={<div className="min-h-11" />}><CmRetireDoor c={c} retire={g.retire} onOpen={preloadFarewell} /></Suspense></div>
        {/* Round 928 review: the managers are a tap away here too, not only on the hub. */}
        <button onClick={g.showSlots} data-testid="cm-show-slots-end" className="mt-4 text-xs text-muted-foreground underline underline-offset-2 hover:text-primary transition-colors">
          Your managers
        </button>
      </div>
    );
  }

  /* ================= SACKED ================= */
  if (g.phase === 'sacked' && g.career) {
    const c = g.career;
    return shell(
      <div className="text-center">
        {/* Round 530: the headline shakes once, the way a front office firing
            does. ResultScreen below mounts CelebrationStyles, and the rules
            are document wide once mounted, so the class is live up here. */}
        <h1 className="cm-loss-shake text-3xl md:text-5xl font-bold text-destructive font-display mb-5">SACKED!</h1>
        <ScreenLoading><SackedCareerSummary c={c} g={g} /></ScreenLoading>
        {/* Round 1343: or stop waiting for the phone. */}
        <div className="mt-4 mx-auto max-w-sm"><Suspense fallback={<div className="min-h-11" />}><CmRetireDoor c={c} retire={g.retire} onOpen={preloadFarewell} /></Suspense></div>
        {/* Round 1512 review: the level, changeable while out of work too (the brief and the help say so). */}
        <div className="mt-4 mx-auto max-w-sm text-left" data-cm-sacked-level><Suspense fallback={<div className="min-h-[11rem]" />}><DifficultyOption career={c} onDifficulty={g.setDifficulty} /></Suspense></div>
        <button onClick={g.showSlots} data-testid="cm-show-slots-sacked" className="mt-4 text-xs text-muted-foreground underline underline-offset-2 hover:text-primary transition-colors">
          Your managers
        </button>
      </div>
    );
  }

  /* ================= RETIRED ================= */
  /* Round 1343: a retired career's only screen. Its own career binding (Round 541, simEarlyReturnScope). */
  if (g.phase === 'retired' && g.career) {
    const c = g.career;
    return shell(
      <div className="text-center">
        <div ref={retiredTopRef}>
          <h1 data-cm-retired className="text-3xl md:text-5xl font-bold text-primary font-display mb-5">RETIRED</h1>
        </div>
        <ScreenLoading><ClubManagerFarewell c={c} g={g} /></ScreenLoading>
      </div>
    );
  }

  /* ================= HUB ================= */
  if (!g.career || !club) {
    return shell(<div className="text-center py-24 text-muted-foreground animate-pulse">Loading…</div>);
  }
  const c = g.career;
  /* Round 202: does a federation want him this season? Recomputed on every
     render because it depends on the record, which moves every week. */
  const nationOffer = nationOfferFor(c);
  const fx = g.nextFx;
  const objStatuses = objectiveStatuses(c);
  // Round 74: tile summaries.
  const objBehind = objStatuses.filter(s => s.status === 'behind' || s.status === 'failed').length;
  const objDone = objStatuses.filter(s => s.status === 'done').length;
  /* Round 979: an open appeal or decision counts as unread on the tile.
     Round 1328: the count and the line come from one rule, the panel's own. */
  const inboxLine = inboxTile(c);
  /* Round 1597: the deals that run out this summer, named in the season's last weeks. */
  const dealsLine = expiringDealsLine(c);
  const lastRes = (c.resultLog ?? []).slice(-1)[0];
  const rivalName = c.boardObjectives?.find(o => o.id === 'rival')?.rivalName ?? null;
  const rivalIdx = rivalName ? g.tableRows.findIndex(r => r.club === rivalName) : -1;
  const bidsCount = (c.incomingBids ?? []).length;
  /* Round 832: null in a league with no domestic cup; every cup line below
     then says there is none rather than "Knocked out". */
  const cupName = careerLeagueOf(c).cupName;
  /* Round 1035: the cup a club of a cup league sits out (Auckland FC and the
     Australia Cup), so the cupless lines name it instead of denying it exists. */
  const cupSatOut = cupSatOutBy(c);
  const cupAlive = cupName !== null && c.cupRound !== 'out' && c.cupRound !== 'won';
  const uclAlive = (c.uclGroup !== null && c.uclKoRound === null) || (!!c.uclKoRound && c.uclKoRound !== 'out' && c.uclKoRound !== 'won');
  const kLeagueModel = careerLeagueOf(c).id === K_LEAGUE_2026.id;
  const j1Model = careerLeagueOf(c).id === J1_LEAGUE_2026.id;
  const cslModel = careerLeagueOf(c).id === CSL_LEAGUE_2026.id;

  /* ---- Round 74: the rival viewer takes over the whole screen ---- */
  if (card) {
    return shell(
      <div ref={panelRef}>
        <ScreenLoading>{card.k === 'club'
          ? <ClubDetailScreen clubName={card.club} career={c} onBack={() => cards?.back()} />
          : <PlayerCardScreen card={card} career={c} onBack={() => cards?.back()} />}</ScreenLoading>
      </div>
    );
  }

  return shell(
    <div ref={hubTopRef} data-cm-hub>
      {/* Header */}
      <header className="mb-4">
        {/* Round 1328: px-12 on both sides keeps the help button's corner clear
            of the club name and the pills, and the row centred. */}
        <ScreenLoading compact><ClubHeading
          crest={c.customClub && c.customClub.name === c.clubName
            ? <ScreenLoading compact><CrestBadge crest={c.customClub.crest} size={22} /></ScreenLoading>
            : <span className="w-3 h-3 rounded-full" style={{ backgroundColor: club.color }} />}
          clubName={c.clubName}
          seasonLabel={cslModel && c.season === 1 ? '2026 start' : worldSeasonLabel(c)}
          season={c.season}
          difficulty={levelFrom(c) !== 'normal' ? { id: levelFrom(c), label: DIFFICULTY_INFO[levelFrom(c)].label } : null}
          noSack={noSackFrom(c) !== null}
          midSeason={!!(c.midSeasonStart && c.season === 1)}
        /></ScreenLoading>
        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground flex-wrap">
          <ScreenLoading compact><ClubStatus
            positionLabel={!leagueStarted(c) ? 'Season not started' : `#${g.myPosition || '-'} in league`}
            stadium={c.customClub && c.customClub.name === c.clubName ? { name: c.customClub.stadium, capacity: c.customClub.capacity ? Math.round(c.customClub.capacity / 1000) : null } : null}
            budgetLabel={money(c.budget, c)}
            form={c.form}
            trophyCount={c.trophies.length > 0 ? c.trophies.length : 0}
          /></ScreenLoading>
          {/* Round 928: back to the three manager slots, this career saved first. */}
          <button onClick={g.showSlots} data-testid="cm-show-slots" className="inline-flex min-h-[44px] items-center underline underline-offset-2 hover:text-primary transition-colors">
            Managers
          </button>
        </div>
        {/* Round 465: the board and the fans, on every tab, words by default
            and the number on tap. */}
        {/* Round 1328: the strip is a lazy chunk, so its slot holds the drawn
            height while it loads, and the hub does not shift when it lands:
            8px of margin over a 44px meter. flow-root keeps that margin inside
            the slot; without it the margin escaped when the strip landed and
            pushed the hub down 8px. The board's last band ("One bad week from
            the sack") wraps to two lines at 320, 390 and 1280, which makes the
            strip 60px, so the slot holds 60 then. */}
        <div className={cn('flow-root', boardMeter(c).value > 0 && boardMeter(c).value < BOARD_EDGE ? 'min-h-[60px]' : 'min-h-[52px]')}><ScreenLoading compact><MetersStrip career={c} /></ScreenLoading></div>
      </header>
      {(kLeagueModel || cslModel || j1Model) && <Suspense fallback={null}><LeagueSeasonNotice
        league={kLeagueModel ? 'k' : cslModel ? 'csl' : 'j1'}
        leagueGames={c.calendar.filter(entry => entry.type === 'league').length}
      /></Suspense>}

      <ScreenLoading><Tabs value={g.activeTab} onValueChange={(v) => g.setActiveTab(v as HubTab)}>
        <TabsList className="grid grid-cols-5 w-full mb-4">
          <TabsTrigger value="overview" className="text-[10px] md:text-xs">Home</TabsTrigger>
          <TabsTrigger value="squad" className="text-[10px] md:text-xs">Squad</TabsTrigger>
          <TabsTrigger value="tactics" className="text-[10px] md:text-xs">Tactics</TabsTrigger>
          <TabsTrigger value="table" className="text-[10px] md:text-xs">Table</TabsTrigger>
          <TabsTrigger value="transfers" className="text-[10px] md:text-xs">Market</TabsTrigger>
        </TabsList>

        {/* -------- Overview -------- */}
        <TabsContent value="overview" className="space-y-4">
          {/* Round 157: the Match Centre takes the whole overview when open:
              facts, form, head to head, engine odds, the optional team talk,
              and both ways to play. */}
          {hubPanel === 'matchCentre' && g.facts ? (
            <div ref={panelRef}>
              <ScreenLoading><MatchCentre
                career={c}
                facts={g.facts}
                clubColor={club.color}
                tone={c.teamTalk ?? null}
                onTone={g.talk}
                talkRead={matchRead}
                talkStale={!!press && press.lastTone === c.teamTalk && press.toneRun >= 3}
                onQuickSim={() => { setHubPanel(null); setWatchMode(false); g.quickPlay(); }}
                onLive={() => { setHubPanel(null); setWatchMode(true); g.play(); }}
                onBack={() => setHubPanel(null)}
              /></ScreenLoading>
            </div>
          ) : (
          <>
          <ScreenLoading><OverviewIntro
            retired={!leagueStarted(c) && (c.retiredLastSummer ?? []).length > 0 ? (c.retiredLastSummer ?? []).map(r => `${r.name} (${r.age}, rated ${r.rating})`).join(' · ') : null}
            freeRetired={!leagueStarted(c) && (c.freeAgentsRetired ?? []).length > 0 ? (c.freeAgentsRetired ?? []).map(r => `${r.name} (${r.age}, rated ${r.rating})`).join(' · ') : null}
            freeLeft={!leagueStarted(c) && (c.freeAgentsLeft ?? []).length > 0 ? (c.freeAgentsLeft ?? []).map(r => `${r.name} (${r.age}, rated ${r.rating})`).join(' · ') : null}
            deals={dealsLine ? { onClick: () => { g.setActiveTab('squad'); setDeskJump(n => n + 1); }, text: dealsLine.text, real: dealsLine.real } : null}
            transfer={c.transferWindow !== null ? { onClick: () => g.setActiveTab('transfers'), summer: c.transferWindow === 'summer' } : null}
            match={fx && fx.kind === 'match' ? {
              compLabel: fx.compLabel,
              neutral: fx.home === null,
              homeFirst: myClubFirst(fx.home),
              clubName: c.clubName,
              opponent: fx.opponent,
              venue: fx.home === null ? 'Neutral venue' : fx.home ? 'Home' : 'Away',
              opponentStrength: fx.oppStrength,
              xiAverage: xiAverageRating(c),
              onLive: () => { setWatchMode(true); g.play(); },
              resume: !!(c.live && c.live.week === c.week),
              onQuick: () => { setWatchMode(false); g.quickPlay(); },
              onCentre: g.facts ? () => setHubPanel('matchCentre') : null,
              shootout: (fx.competition === 'cup' || fx.competition === 'uclKo' || fx.competition === 'oneOff' || (fx.competition === 'uel' && !fx.compLabel.includes('League phase'))) ? {
                onClick: () => { setTacticsTile('shootout'); g.setActiveTab('tactics'); },
                label: (() => { const n = shootoutOrderOf(c)?.length ?? 0; return n ? `${n} of ${SHOOTOUT_MAX_ORDER} listed` : 'not set, tap to pick your takers'; })(),
              } : null,
            } : null}
            windowAction={fx && fx.kind === 'window' ? g.play : null}
            seasonAction={fx && fx.kind === 'seasonOver' ? g.play : null}
          /></ScreenLoading>
          {/* Round 74: the tile rule. Everything below the next match is a
              box; tapping one opens its own screen instead of one long page
              (his words: "make it smaller and with boxes and when they open
              it takes u to see something different"). */}
          {hubPanel === null && (
            <ScreenLoading><HubTiles rows={[
              {
                accent: objBehind > 0,
                value: objBehind > 0 ? `${objBehind} behind` : `${objDone}/${objStatuses.length} done`,
                sub: TIER_INFO[club.tier].label + ' patience',
                onClick: () => setHubPanel('board'),
              },
              {
                accent: inboxLine.count > 0,
                value: inboxLine.value,
                sub: inboxLine.sub,
                onClick: () => setHubPanel('inbox'),
              },
              {
                value: lastRes ? `${lastRes.res} ${lastRes.score}` : 'Season start',
                sub: fx && fx.kind === 'match' ? `Next: ${fx.opponent}` : 'See the schedule',
                onClick: () => setHubPanel('calendar'),
              },
              {
                value: leagueTileValue(leagueStarted(c) ? c.week : 0, g.myPosition),
                sub: c.form.length ? `Form: ${c.form.join(' ')}` : careerLeagueOf(c).name,
                onClick: () => g.setActiveTab('table'),
              },
              {
                accent: cupAlive && !!c.cupDraw[c.cupRound as CupRound],
                value: kLeagueModel ? 'Korea Cup not played' : cupName === null ? (cupSatOut ? 'Not entered' : 'No domestic cup') : cupAlive ? 'Still alive' : c.cupRound === 'won' ? 'CUP WINNERS' : 'Knocked out',
                sub: uclAlive ? (cupName === null ? 'UCL alive' : 'UCL alive too') : (cupName ?? careerLeagueOf(c).name),
                onClick: () => setHubPanel('cups'),
              },
              {
                value: (() => {
                  const goals = c.squad.reduce((n, p) => n + p.seasonGoals, 0);
                  return `${goals} ${goals === 1 ? 'goal' : 'goals'}`;
                })(),
                sub: (() => {
                  const ts = [...c.squad].sort((a, b) => b.seasonGoals - a.seasonGoals)[0];
                  return ts && ts.seasonGoals > 0 ? `${pitchName(ts.name)}: ${ts.seasonGoals}` : 'Goals, assists, ratings';
                })(),
                onClick: () => setHubPanel('stats'),
              },
              {
                value: (() => {
                  /* Round 1328: what the kitty is on course to do this season
                     (the result plus the running costs the board covers), by
                     Round 1326's rule for the Finances desk, not the red loss
                     the board never asks the kitty to pay. It is the desk's
                     projection (no more deals, only the cup ties drawn), so
                     the line says so. */
                  const k = kittyChange(projectFinances(c)).projected;
                  return `${k < 0 ? '-' : '+'}${money(Math.abs(k), c)}`;
                })(),
                onClick: () => setHubPanel('finance'),
              },
              {
                value: (() => {
                  const f = facilitiesOf(c);
                  return `Level ${FACILITY_IDS.map(id => f[id]).join(' · ')}`;
                })(),
                onClick: () => setHubPanel('facilities'),
              },
              {
                accent: !!staffOf(c).poach,
                value: (() => {
                  const st = staffOf(c);
                  if (st.poach) return `📞 ${st.poach.club} calling`;
                  const empty = STAFF_POST_IDS.filter(p => !st[p]);
                  return empty.length ? `${empty.length} post${empty.length === 1 ? '' : 's'} open` : `Level ${STAFF_POST_IDS.map(p => st[p]?.level ?? 0).join(' · ')}`;
                })(),
                sub: (() => {
                  const st = staffOf(c);
                  if (st.poach) return `They want your ${STAFF_POST_INFO[st.poach.postId].short.toLowerCase()} man`;
                  const empty = STAFF_POST_IDS.filter(p => !st[p]);
                  if (empty.length > 2) return 'Hire them on the staff desk';
                  return empty.length ? `Nobody on ${empty.map(p => STAFF_POST_INFO[p].short.toLowerCase()).join(', ')}` : 'Attack, defence, keepers, scouts';
                })(),
                onClick: () => setHubPanel('staff'),
              },
              {
                accent: pointsFree(xpOf(c)) > 0,
                value: (() => {
                  const free = pointsFree(xpOf(c));
                  return free > 0 ? `${free} point${free === 1 ? '' : 's'} to spend` : `Level ${levelFor(xpOf(c).xp)}`;
                })(),
                sub: (() => {
                  const level = levelFor(xpOf(c).xp);
                  if (pointsFree(xpOf(c)) > 0) return `Level ${level} · seven trees open`;
                  return level >= MAX_LEVEL ? 'Every tree filled' : 'Seven skill trees to grow';
                })(),
                onClick: () => setHubPanel('xp'),
              },
              {
                value: (() => {
                  const o = startOptionsOf(c);
                  /* Round 1501: a career off Medium shows its level here, never the haggle's Normal, and
                     after it the haggle's word whenever that is not the default, so no setting hides. */
                  const lv = levelFrom(c);
                  const haggle = STRICTNESS_INFO[o.strictness]?.label ?? 'Normal';
                  if (lv === 'normal') return `${CURRENCIES[o.currency].symbol} · ${haggle}`;
                  return `${CURRENCIES[o.currency].symbol} · ${DIFFICULTY_INFO[lv].label}${o.strictness !== STRICTNESS_DEFAULT ? ` · ${haggle}` : ''}`;
                })(),
                sub: (() => {
                  const o = startOptionsOf(c);
                  return o.nationJobs ? 'Currency, nation job, haggling' : 'International job off';
                })(),
                onClick: () => setHubPanel('options'),
              },
              (() => {
                const slot = g.pointsSlot();
                const held = slot === null ? [] : readPointsIndex(slot)?.points ?? [];
                return (
                  {
                value: held.length ? `${held.length} of ${POINTS_CAP} made` : 'None yet',
                sub: held.length ? held[held.length - 1].name : 'Go back after a mistake',
                onClick: () => setHubPanel('points'),
              }
                );
              })(),
              {
                accent: !!c.approach || !!nationOffer || c.jobHunt?.open?.status === 'accepted',
                value: c.jobHunt?.open?.status === 'accepted' ? '✅ A club said yes' : c.approach ? '📞 A club is calling' : nationOffer ? '🌐 Your country is calling' : recordLine(c.careerStats),
                sub: c.jobHunt?.open?.status === 'accepted'
                  ? `${c.jobHunt.open.club}: now or in the summer`
                  : c.approach
                  ? `${c.approach.club} want you`
                  : nationOffer
                    ? `${nationOffer.nation} want you for the summer`
                    : c.nationJob
                      ? `${c.nationJob.nation} manager · ${recordLine(c.careerStats)}`
                      : c.careerStats.played > 0 ? `${Math.round((c.careerStats.wins / c.careerStats.played) * 100)}% win rate` : 'New in the job',
                onClick: () => setHubPanel('manager'),
              },
              {
                accent: unavailable.length > 0,
                value: unavailable.length ? `${unavailable.length} out` : 'All fit',
                sub: unavailable[0] ? unavailable[0].name : 'No injuries or bans',
                onClick: () => setHubPanel('treatment'),
              },
              {
                value: rivalName ?? 'Scout clubs',
                sub: rivalName && rivalIdx >= 0 ? `They sit #${rivalIdx + 1}` : 'Tap any club in the table',
                onClick: rivalName ? () => setClubView(rivalName) : () => g.setActiveTab('table'),
              },
              {
                accent: !!press?.pending,
                value: pressHeadline(c),
                sub: press?.pending ? 'One question, one tap' : `${press?.answered ?? 0} fronted up this career`,
                onClick: () => setHubPanel('press'),
              },
              {
                accent: wantAway.length > 0 || letDown.length > 2,
                value: wantAway.length > 0
                  ? `${wantAway.length} want${wantAway.length === 1 ? 's' : ''} out`
                  : letDown.length > 0 ? `${letDown.length} unhappy` : 'Word kept',
                sub: wantAway[0] ? wantAway[0].name : letDown[0] ? letDown[0].name : 'Set everyone a role',
                onClick: () => setHubPanel('roles'),
              },
              {
                accent: prospectCount > 0,
                value: prospectCount > 0 ? `${prospectCount} on the books` : 'Nobody yet',
                sub: academy ? `Recruitment ${academy.recruitment}/20 · ${academy.scouts.length} scouting` : 'Build a youth setup',
                onClick: () => setHubPanel('academy'),
              },
              {
                value: trainingLabel,
                sub: growingCount > 0 ? `${growingCount} player${growingCount === 1 ? '' : 's'} still improving` : 'Nobody left to develop',
                onClick: () => setHubPanel('training'),
              },
              {
                accent: c.transferWindow !== null,
                value: c.transferWindow !== null ? 'Window OPEN' : 'Window shut',
                sub: bidsCount > 0 ? `${bidsCount} bid${bidsCount > 1 ? 's' : ''} for your players` : 'Latest transfers inside',
                onClick: () => g.setActiveTab('transfers'),
              },
              c.trophies.length > 0 ? {
                value: `${c.trophies.length} troph${c.trophies.length > 1 ? 'ies' : 'y'}`,
                sub: c.trophies[c.trophies.length - 1].name,
                onClick: () => setHubPanel('trophies'),
              } : null,
            ]} /></ScreenLoading>
          )}

          {/* Round 74: drill-in screens, one per box. */}
          {hubPanel !== null && (
            <div ref={panelRef} className="space-y-3">
              <button
                onClick={() => setHubPanel(null)}
                className="inline-flex min-h-[44px] min-w-[44px] items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Club home
              </button>

              {hubPanel === 'board' && objStatuses.length > 0 && (
                <ScreenLoading><ClubManagerBoardPanel club={club} objStatuses={objStatuses} /></ScreenLoading>
              )}

              {/* Round 783: the job hunt's status, readable here as well as on
                  the Manager panel, because the inbox is where the answer lands. */}
              {hubPanel === 'inbox' && (c.jobHunt?.open || c.jobHunt?.summerMove) && (
                <div data-job-hunt-status className="bg-card border border-gold/40 rounded-xl p-3 text-xs text-foreground">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">📨 Job hunt</div>
                  {c.jobHunt?.summerMove
                    ? <p>Agreed: you take over at <span className="font-bold">{c.jobHunt.summerMove.club}</span> when the season ends.</p>
                    : c.jobHunt?.open?.status === 'accepted'
                      ? <p><span className="font-bold">{c.jobHunt.open.club}</span> said yes. Answer them from the message below or the Manager panel: join now, or in the summer.</p>
                      : <p>Application in at <span className="font-bold">{c.jobHunt?.open?.club}</span>. They answer within about {c.jobHunt?.open?.matchesLeft ?? 0} more match day{(c.jobHunt?.open?.matchesLeft ?? 0) === 1 ? '' : 's'}.</p>}
                  <button
                    onClick={() => setHubPanel('manager')}
                    className="mt-2 text-[11px] font-bold text-primary hover:underline"
                  >
                    Open the Manager panel
                  </button>
                </div>
              )}
              {hubPanel === 'inbox' && <ScreenLoading><InboxCard career={c} onAnswer={g.answer} /></ScreenLoading>}
              {hubPanel === 'inbox' && (c.inbox ?? []).length === 0 && deskOf(c).length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">Nobody has texted you yet. Play some matches, the drama finds you.</p>
              )}

              {/* Round 158: the season as a real month calendar, with training
                  cones, window markers and the long fast forward. Round 466:
                  any day can be tapped and simmed to, through the same loop
                  the fast forwards use. */}
              {hubPanel === 'calendar' && (
                <ScreenLoading><CalendarScreen career={c} onSimTo={g.simToWeek} onSetTraining={g.setTraining} /></ScreenLoading>
              )}

              {hubPanel === 'academy' && (
                <ScreenLoading><AcademyScreen
                  career={c}
                  onUpgrade={g.upgradeFacility}
                  onHire={g.sendScout}
                  onRecall={g.callScoutHome}
                  onPromote={g.promote}
                  onRelease={g.release}
                /></ScreenLoading>
              )}

              {hubPanel === 'training' && (
                <ScreenLoading><TrainingScreen career={c} onSetPlan={g.setTraining} onRetrain={g.retrain} onStopRetrain={g.stopRetrain} /></ScreenLoading>
              )}

              {hubPanel === 'roles' && <ScreenLoading><RolesScreen career={c} onSetRole={g.setRole} /></ScreenLoading>}

              {hubPanel === 'press' && (
                <ScreenLoading><PressScreen career={c} onAnswer={g.sayIt} onDuck={g.sendAssistant} /></ScreenLoading>
              )}

              {hubPanel === 'treatment' && (
                <ScreenLoading><ClubManagerTreatmentPanel unavailable={unavailable} /></ScreenLoading>
              )}

              {/* Round 1503: two tiles, the domestic cup and the Champions League, each opening a view of its own
                  (WorldCompScreen.tsx, lazy). The cards this panel has always mounted are handed in, in its old
                  order: the cup summary, the cup bracket, the Champions League heading, the groups and the bracket
                  (scripts/simClubManagerEraMidSeason.mjs section 6 reads that order). Round 312: two clearly
                  separated competitions. Round 832: a league with no domestic cup says so, once, and shows no
                  bracket. */}
              {hubPanel === 'cups' && (
                <ScreenLoading><CupsPanel
                  career={c}
                  onClubClick={setClubView}
                  cupTitle={kLeagueModel ? 'Korea Cup' : 'Domestic cup'}
                  cupValue={kLeagueModel || j1Model || cslModel ? 'Not played' : cupName ?? cupSatOut ?? 'No domestic cup'}
                  cupSub={kLeagueModel || j1Model || cslModel ? 'League-only model' : cupName === null ? (cupSatOut ? 'Not entered' : undefined) : cupAlive ? `Still alive. Next up: ${c.cupDraw[c.cupRound as CupRound] ?? 'to be drawn'}` : c.cupRound === 'won' ? 'Cup winners' : 'Knocked out'}
                  cupLine={kLeagueModel ? <KLeagueCupNotice /> : undefined}
                  /* Round 102 built this bracket; Round 312 mounted it. */
                  cupBracket={cupName === null ? undefined : <CupBracketCard career={c} onClubClick={setClubView} />}
                  uclHeading={<div className="text-xs text-muted-foreground uppercase tracking-wider">⭐ Champions League</div>}
                  /* Round 163: every group in the draw; Round 95: the knockouts as a real bracket. In the
                     Champions League view for the club in it (the club watching reads clubManagerWorldView.ts). */
                  groupsCard={<UclGroupsCard career={c} onClubClick={setClubView} />}
                  bracketCard={<UclBracketCard career={c} onClubClick={setClubView} />}
                /></ScreenLoading>
              )}

              {/* Round 171: the finance desk, his CM-8. Round 200: the sponsor.
                  Round 467: the projection, food prices, the push and the bad
                  brand, all in FinancesScreen. */}
              {hubPanel === 'finance' && (
                <ScreenLoading><FinancesScreen
                  career={c}
                  onTickets={g.setTickets}
                  onConcessions={g.setConcessions}
                  onBuyWageRoom={g.addWageRoom}
                  onSponsor={g.takeSponsor}
                  onPush={g.pushSponsorOffer}
                /></ScreenLoading>
              )}

              {/* Round 467: the facilities desk. The ground card that lived on
                  the finance desk is the stadium level here now. */}
              {hubPanel === 'facilities' && <ScreenLoading><FacilitiesScreen career={c} onUpgrade={g.buyFacility} /></ScreenLoading>}

              {/* Round 471: the staff desk. Four generated men, the rival on
                  the phone, and the promotion out of the academy. */}
              {hubPanel === 'staff' && (
                <ScreenLoading><StaffScreen
                  career={c}
                  onHire={g.appointStaff}
                  onSack={g.payOffStaff}
                  onMatch={g.matchStaff}
                  onLetGo={g.letStaffGo}
                /></ScreenLoading>
              )}
              {hubPanel === 'stats' && <ScreenLoading><StatsScreen career={c} /></ScreenLoading>}

              {/* Round 513: the manager's own trees, spec section 28. */}
              {hubPanel === 'xp' && <ScreenLoading><XpScreen career={c} onSpendPoint={g.spendPoint} /></ScreenLoading>}

              {/* Round 514: his three start options. */}
              {hubPanel === 'options' && (
                <ScreenLoading><StartOptionsScreen
                  career={c}
                  onCurrency={g.setCurrency}
                  onNationJobs={g.setNationJobs}
                  onStrictness={g.setStrictness}
                  onNoSack={g.turnOnNoSack}
                  onDifficulty={g.setDifficulty}
                /></ScreenLoading>
              )}

              {hubPanel === 'points' && (() => {
                const slot = g.pointsSlot();
                return slot === null
                  ? <p className="text-sm text-muted-foreground">Reload the page to use your save points.</p>
                  : <ScreenLoading><SavePointsScreen career={c} slot={slot} /></ScreenLoading>;
              })()}

              {hubPanel === 'trophies' && (
                <div className="bg-card border border-border rounded-xl p-3">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Trophy cabinet</div>
                  {c.trophies.length === 0 && <p className="text-xs text-muted-foreground">Empty. For now.</p>}
                  <div className="flex flex-wrap gap-1.5">
                    {c.trophies.map((t, i) => (
                      <span key={i} className="text-[10px] bg-gold/10 border border-gold/30 text-gold rounded-full px-2 py-1 font-semibold">
                        {t.emoji} {t.name} · S{t.season}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {hubPanel === 'manager' && (
                <ScreenLoading><ClubManagerCareerPanel c={c} g={g} nationOffer={nationOffer} onRetireOpen={preloadFarewell} /></ScreenLoading>
              )}
            </div>
          )}
          </>
          )}
        </TabsContent>

        {/* -------- Squad -------- */}
        <TabsContent value="squad">
          <div className="space-y-3">
            <ScreenLoading><SquadScreen squad={c.squad} xiIds={c.xiIds} eraId={c.eraId} captainId={c.setPieces?.captain ?? null} career={c} /></ScreenLoading>
            {/* Round 193: the contracts desk, built in Round 105 and never
               mounted until now, so renewals were unreachable for 88 rounds.
               Plain renewal or the cheaper clause deal, and every clause you
               have granted stays in view with its bargain warning. */}
            <ScreenLoading><DeskInView jump={deskJump} served={deskServed}><ContractsCard career={c} onRelease={g.terminate} onSignFreeAgent={g.signFree} onRenew={g.renew} onRenewWithClause={g.renewWithClause} /></DeskInView></ScreenLoading>
          </div>
        </TabsContent>

        {/* -------- Tactics -------- */}
        <TabsContent value="tactics">
          <ScreenLoading><TacticsScreen
            career={c}
            onFormation={g.setFormationIndex}
            onCustomShape={g.setCustomShape}
            onMentality={g.setMentality}
            onInstructions={g.setTeamInstructions}
            theirOpponent={g.facts?.opponent ?? null}
            onSlot={g.setXiSlot}
            onSwap={g.swapXiSlots}
            onAutoPick={g.autoPick}
            onDuty={g.setSlotDuty}
            onSetPiece={g.assignSetPiece}
            onAutoSetPieces={g.autoPickSetPieces}
            onShootoutOrder={g.setShootoutOrder}
            onSaveMatchPlan={g.saveMatchPlan}
            onApplyMatchPlan={g.applyMatchPlan}
            onDeleteMatchPlan={g.deleteMatchPlan}
            openTileRequest={tacticsTile}
            onOpenTileRequestDone={() => setTacticsTile(null)}
          /></ScreenLoading>
        </TabsContent>

        {/* -------- Table -------- */}
        <TabsContent value="table">
          {/* Round 95: every league in the world, not just mine. */}
          <ScreenLoading><WorldTablesCard career={c} myRows={g.tableRows} onClubClick={setClubView} /></ScreenLoading>
        </TabsContent>

        {/* -------- Transfers -------- */}
        <TabsContent value="transfers">
          <ScreenLoading><TransferScreen
            career={c}
            market={g.market}
            onSignFreeAgent={g.signFree}
            onNegotiate={g.negotiate}
            onOffer={g.offer}
            onWalk={g.walk}
            onDismissNegotiation={g.dismissNegotiation}
            onClause={g.clause}
            onLoan={g.loan}
            onAcceptBid={g.acceptIncomingBid}
            onRejectBid={g.rejectIncomingBid}
            onSetStatus={g.setStatus}
            onLoanOut={g.loanOut}
            onCommitLoanPlan={g.commitLoanPlan}
            onCommitRecruitment={g.commitRecruitment}
            onProposeTerms={g.proposeTerms}
            onBuyLoanee={g.buyLoanee}
            onEndLoanEarly={g.endLoanEarly}
            onRecallLoanee={g.recallLoanee}
            deskNote={g.deskNote}
            onClearNote={g.clearDeskNote}
          /></ScreenLoading>
        </TabsContent>
      </Tabs></ScreenLoading>
    </div>
  );
};

/* Round 1601: the page always mounts the stack of cards, so the two page tests that import this get it too. */
const ClubManagerWithCards = () => <CmCardsProvider><ClubManager /></CmCardsProvider>;

export default ClubManagerWithCards;
