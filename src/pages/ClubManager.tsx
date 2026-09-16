import { Link } from 'react-router-dom';
import { lazy, Suspense, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { MidSeasonEntry } from '@/lib/clubManagerCalendar';
import { Play, ChevronRight, ChevronLeft, Trophy, Briefcase } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useClubManager } from '@/hooks/useClubManager';
import type { HubTab } from '@/hooks/useClubManager';
import {
  TIER_INFO, clubDefFor, clubPreviewRating, careerLeagueOf, money,
  isAvailable, xiAverageRating, sortedTable,
  NATIONS, REAL_LEAGUES, playableClubs, objectiveStatuses, CM_ROSTER_META, isPartialClub,
  isHistoricEra, eraLeaguesFor, eraPlayableClubs, boardWantLabel,
  developingPlayers, INTENSITY_INFO, FOCUS_INFO,
  brokenPromises, CM_ERAS, DEFAULT_ERA_ID, eraById, projectedXIAvg, CM_BASE_YEAR,
  worldSeasonLabel, pressOf, pressHeadline, preMatchRead,
  nationOfferFor,
} from '@/lib/clubManager';
import { FACILITY_IDS, facilitiesOf } from '@/lib/clubManagerFacilities';
import { projectFinances } from '@/lib/clubManagerFinances';
import { fanMeter } from '@/lib/clubManagerMeters';
import { STAFF_POST_IDS, STAFF_POST_INFO, staffOf } from '@/lib/clubManagerStaff';
import type { NationDef, CupRound, CustomClubSpec, ManagerSpec } from '@/lib/clubManager';
import { eraRealShareLabel, eraHonestyLine } from '@/lib/clubManagerEras';
import { FlagImg } from '@/components/FlagImg';
import { GameNav } from '@/components/game/GameNav';
import { GameShell } from '@/components/game/GameShell';
import { HowToPlayPopover } from '@/components/game/HowToPlayPopover';
import AdBanner from '@/components/ads/AdBanner';
import PageSeo from '@/components/seo/PageSeo';
import GameSeoContent from '@/components/seo/GameSeoContent';
import { CURRENCIES, STRICTNESS_INFO, startOptionsOf } from '@/lib/clubManagerStart';
import { levelFor, pointsFree, xpOf, MAX_LEVEL } from '@/lib/clubManagerXp';
import { useRevealScroll } from '@/hooks/useRevealScroll';

const ClubManagerTreatmentPanel = lazy(() => import('@/components/club-manager/ClubManagerTreatmentPanel'));
const ClubManagerBoardPanel = lazy(() => import('@/components/club-manager/ClubManagerBoardPanel'));
const ClubManagerCareerPanel = lazy(() => import('@/components/club-manager/ClubManagerCareerPanel'));
const ConfettiBurst = lazy(() => import('@/components/club-manager/Celebration').then(m => ({ default: m.ConfettiBurst })));
const ClubManagerHelp = lazy(() => import('@/components/club-manager/ClubManagerHelp'));
const ClubManagerSeasonSummary = lazy(() => import('@/components/club-manager/ClubManagerSeasonSummary'));
const SackedCareerSummary = lazy(() => import('@/components/club-manager/ClubManagerSeasonSummary').then(m => ({ default: m.SackedCareerSummary })));
const CustomClubForm = lazy(() => import('@/components/club-manager/CustomClubForm').then(m => ({ default: m.CustomClubForm })));
const CrestBadge = lazy(() => import('@/components/club-manager/CustomClubForm').then(m => ({ default: m.CrestBadge })));
const FacilitiesScreen = lazy(() => import('@/components/club-manager/FacilitiesScreen').then(m => ({ default: m.FacilitiesScreen })));
const StaffScreen = lazy(() => import('@/components/club-manager/StaffScreen').then(m => ({ default: m.StaffScreen })));
const FinancesScreen = lazy(() => import('@/components/club-manager/FinancesScreen').then(m => ({ default: m.FinancesScreen })));
const ManagerForm = lazy(() => import('@/components/club-manager/ManagerForm').then(m => ({ default: m.ManagerForm })));
const WorldTablesCard = lazy(() => import('@/components/club-manager/WorldTablesCard').then(m => ({ default: m.WorldTablesCard })));
const MetersStrip = lazy(() => import('@/components/club-manager/MetersStrip').then(m => ({ default: m.MetersStrip })));
const UclBracketCard = lazy(() => import('@/components/club-manager/UclBracketCard').then(m => ({ default: m.UclBracketCard })));
const UclGroupsCard = lazy(() => import('@/components/club-manager/UclGroupsCard').then(m => ({ default: m.UclGroupsCard })));
const CupBracketCard = lazy(() => import('@/components/club-manager/CupBracketCard').then(m => ({ default: m.CupBracketCard })));
const StatsScreen = lazy(() => import('@/components/club-manager/StatsScreen').then(m => ({ default: m.StatsScreen })));
const CalendarScreen = lazy(() => import('@/components/club-manager/CalendarScreen').then(m => ({ default: m.CalendarScreen })));
const InboxCard = lazy(() => import('@/components/club-manager/InboxCard').then(m => ({ default: m.InboxCard })));
const ClubDetailScreen = lazy(() => import('@/components/club-manager/ClubDetailScreen').then(m => ({ default: m.ClubDetailScreen })));
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

const FORM_TONE: Record<'W' | 'D' | 'L', string> = {
  W: 'bg-emerald-500', D: 'bg-yellow-500', L: 'bg-red-500',
};

/** Round 74: one hub box (the tile rule). Tap it, it becomes its own screen. */
function HubTile({ icon, title, value, sub, accent, onClick }: {
  icon: string; title: string; value: string; sub?: string; accent?: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-xl border p-3 text-left transition-all bg-card hover:border-primary hover:-translate-y-0.5',
        accent ? 'border-gold/50' : 'border-border',
      )}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-base leading-none">{icon}</span>
        {accent && <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />}
      </div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{title}</div>
      <div className="text-sm font-bold font-display text-foreground truncate">{value}</div>
      {sub && <div className="text-[9px] text-muted-foreground truncate mt-0.5">{sub}</div>}
    </button>
  );
}

type HubPanel = 'board' | 'inbox' | 'calendar' | 'manager' | 'treatment' | 'cups' | 'trophies' | 'academy' | 'training' | 'roles' | 'press' | 'matchCentre' | 'stats' | 'finance' | 'facilities' | 'staff' | 'xp' | 'options';

const ClubManager = () => {
  const g = useClubManager();
  // Round 65: the owner's no scroll rule. Full time and season end screens are
  // what you were waiting for after pressing Play, so they pull themselves into
  // view rather than rendering below where your thumb just was.
  const revealRef = useRevealScroll<HTMLDivElement>(`${g.phase}:${g.career?.week ?? 0}`);
  // Round 70: the nation -> league -> team picker. Each step change pulls the
  // new step into view (skipFirst so landing on the page stays put).
  // Round 72: nations can hold more than one league (England, the USA).
  /* Round 132: the era comes first, because it decides what every later screen
     is looking at: which squads, which players, how good each club is. Same
     idea as the era choice on the My Career create screen, laid out as tiles
     because this game is tiles. */
  const [pickStep, setPickStep] = useState<'era' | 'nation' | 'league' | 'team' | 'custom' | 'manager'>('era');
  const [pickEra, setPickEra] = useState<string>(DEFAULT_ERA_ID);
  const [pickNation, setPickNation] = useState<NationDef | null>(null);
  const [pickLeagueId, setPickLeagueId] = useState<string | null>(null);
  /* Round 303: a founded club waits here while the dugout step runs, so the
     manager spec and the club spec land in startCareer together. */
  const [pendingCustomSpec, setPendingCustomSpec] = useState<CustomClubSpec | null>(null);
  const pickRef = useRevealScroll<HTMLDivElement>(`pick:${pickStep}:${pickEra}:${pickNation?.id ?? ''}:${pickLeagueId ?? ''}`, { skipFirst: true });
  const era = eraById(pickEra);
  const eraYearsOn = Math.max(0, era.startYear - CM_BASE_YEAR);
  // Round 74: the tile rule. Boxes on the home screen open their own
  // screens, and any club anywhere opens the rival viewer.
  const [hubPanel, setHubPanel] = useState<HubPanel | null>(null);
  const [clubView, setClubView] = useState<string | null>(null);
  /* Round 158: watching the match live instead of jumping between screens.
     While this is on, the halftime and full time phases render inside the
     animated viewer; turning it off drops back to the classic screens.
     Round 472: Play Live turns it on and Quick Sim turns it off, both of
     them, every time. Before that the quick sim only ever set the phase, so
     a live match that ended somewhere other than the full report (a January
     window landing on the same tap) left this on, and the next quick sim
     animated ninety minutes at a player who had asked not to watch. */
  const [watchMode, setWatchMode] = useState(false);
  const panelRef = useRevealScroll<HTMLDivElement>(`hub:${hubPanel ?? ''}:${clubView ?? ''}`, { skipFirst: true });

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
        title="Club Manager: Football Management Sim | DoUKnowBall"
        description="Pick a real club, set your tactics, work the transfer market and survive the sack race across full 38-game seasons, cup runs and the Champions League."
        path="/club-manager"
      />
      <GameShell
        help="none"
        width="wide"
        showReportQuestion
        reportGameType="club-manager"
      >
        <div className="relative">
          <HowToPlayPopover title="How to Play Club Manager" triggerSide="right">
            <ScreenLoading><ClubManagerHelp /></ScreenLoading>
          </HowToPlayPopover>
          {inner}
        </div>
        <AdBanner slot="7540487748" format="horizontal" className="mt-8" />
        <GameSeoContent
          pageHasOwnH1
          title="Club Manager: Football Management Sim"
          description="A full club-management sim in your browser: 330 clubs across 20 real leagues, from the Premier League, the 2. Bundesliga and the Scottish Premiership to the Saudi Pro League, MLS, Croatia, Denmark, Switzerland, Austria and Greece, each with its real squad and market values as of August 2026. Manage today or in a real past season: 2015-16 with Leicester at 5000 to 1, 2010-11 with prime Messi, or 2005-06 with Ronaldinho's Barcelona. Or create your own club with its own crest and stadium. Negotiate transfers, survive bidding wars, hit the board's named objectives, and chase titles season after season."
          howToPlay={[
            'Pick your era: 2026-27 with real squads, or the real 2015-16, 2010-11 or 2005-06 Premier League and La Liga.',
            'Pick your nation, league and club (330 clubs across 20 real leagues), or create your own club with its own crest, stadium and budget.',
            'Read the board\'s objectives: league finish, cup run, Europe where it applies, beating your rival, and a goals quota.',
            'Go and meet the two asks the board makes in the market: a country quota, an experience count, the thinnest line in your squad, a signing 21 or under at a rating floor, or one fee over a threshold, every number worked out from your club and your era.',
            'Set your formation, mentality and XI, then play through the full season week by week.',
            'Work the market: negotiate fees, pay release clauses, take loans, and field bids for your own stars, with deep filters down to exact position, age, price, league and nationality, every player under his real flag.',
            'Run the contracts desk: re-sign expiring players at full wage, or cheaper with a release clause any club can trigger, and delete a bargain clause with a full price renewal before the phone rings.',
            'Run the money: gate receipts from every home crowd, ticket and food prices the fans and the board react to, a shirt sponsor from three honest shapes or one bad brand that pays more and costs the fans, each one negotiable, and a projection of the season\'s books to the last day.',
            'Build the club: stadium, training ground, medical and dressing room, each level 1 to 10, paid from the kitty, each one a small real lift on the squad.',
            'Run the staff room: an attack coach, a defence coach, a goalkeeping coach and a lead scout, hired, promoted from your academy or paid off, each one growing his own part of the squad, with rivals coming in for the good ones and a limited number of offers you can match.',
            'Win enough and manage your country as well: real tournaments between seasons, real qualifying groups, and a place in the cabinet if you lift one.',
            'Handle the press when they come for you, and pick your team talk before kick off and again at half time.',
            'Win trophies, keep the board happy, and build a managerial career that can cross leagues and continents.',
          ]}
        />
        <GameNav />
      </GameShell>
    </>
  );

  /* ================= BOOT ================= */
  if (g.phase === 'boot') {
    return shell(<div className="text-center py-24 text-muted-foreground animate-pulse">Loading…</div>);
  }

  /* ================= RESUME PROMPT ================= */
  if (g.phase === 'resume' && g.career) {
    const c = g.career;
    return shell(
      <div className="max-w-md mx-auto">
        <header className="text-center mb-6">
          <h1 className="text-4xl md:text-6xl font-bold tracking-[0.1em] text-primary font-display mb-1">CLUB MANAGER</h1>
          <p className="text-muted-foreground text-sm">A saved career was found on this device.</p>
        </header>
        <div className="bg-card border border-border rounded-2xl p-5 text-center">
          <div className="text-3xl mb-2">💼</div>
          <div className="text-xl font-bold font-display text-foreground">{c.clubName}</div>
          <div className="text-sm text-muted-foreground mt-1">
            {worldSeasonLabel(c)} · Season {c.season} · Week {Math.min(c.week + 1, c.calendar.length)} of {c.calendar.length} · Board {Math.round(c.boardConfidence)}/100
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">🏆 {c.trophies.length} trophies won so far</div>
          <div className="flex gap-3 mt-5">
            <button onClick={g.resume} className="flex-1 px-5 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90 transition-opacity">
              Resume Career
            </button>
            <button onClick={g.startNew} className="flex-1 px-5 py-3 bg-secondary text-foreground rounded-xl font-bold hover:bg-secondary/70 transition-colors">
              Start Fresh
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ================= CLUB SELECT (Round 70: nation -> league -> team) ================= */
  if (g.phase === 'clubSelect' || (g.phase === 'resume' && !g.career)) {
    /* Round 303: the dugout step hands in null (skip) or a manager spec, and
       either way the picker resets for the next career. */
    const confirmAndReset = (manager: ManagerSpec | null, entry?: MidSeasonEntry) => {
      if (pendingCustomSpec) g.confirmCustomClub(pickEra, pendingCustomSpec, manager ?? undefined, entry);
      else g.confirmClub(pickEra, manager ?? undefined, entry);
      setPickStep('era');
      setPickEra(DEFAULT_ERA_ID);
      setPickNation(null);
      setPickLeagueId(null);
      setPendingCustomSpec(null);
    };
    /* Round 146: a historic era swaps the whole picker world: its nations,
       its leagues, its clubs, its stature. The modern path is untouched. */
    const historicPick = isHistoricEra(pickEra);
    const league = pickLeagueId
      ? (historicPick ? eraLeaguesFor(pickEra) : REAL_LEAGUES).find(l => l.id === pickLeagueId)
      : null;
    const teams = league
      ? (historicPick ? eraPlayableClubs(pickEra, league.id) : playableClubs(league.id))
      : [];

    return shell(
      <div ref={pickRef}>
        <header className="text-center mb-6">
          <h1 className="text-4xl md:text-6xl font-bold tracking-[0.1em] text-primary font-display mb-1">CLUB MANAGER</h1>
          <p className="text-muted-foreground text-sm md:text-base max-w-xl mx-auto">
            {REAL_LEAGUES.length} real league tables and {REAL_LEAGUES.reduce((s, l) => s + l.clubs.length, 0)} clubs today, squads as of {CM_ROSTER_META.asOf}, plus three real past seasons: 2015-16, 2010-11 and 2005-06. Pick when you start, then your nation, your league, your club.
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
                  onClick={() => { setPickEra(e.id); setPickStep('nation'); }}
                  className="rounded-xl border bg-card border-border hover:border-primary px-4 py-3 text-left transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl leading-none">{e.emoji}</span>
                    <div className="min-w-0">
                      <div className="text-base font-bold font-display text-foreground">{e.label}</div>
                      <div className="text-[10px] text-muted-foreground">{e.blurb}</div>
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
                    {e.startYear <= CM_BASE_YEAR ? 'REAL DATA' : 'PROJECTION'} · {eraRealShareLabel(e)}
                  </div>
                </button>
              ))}
            </div>
            {/* The honest note about what is NOT here, which matters more than
                what is. Round 139 removed the future starts on the owner's call
                (nobody knows the future). Round 146 delivered the first real
                past season from real historical records. */}
            <p className="text-[9px] text-muted-foreground text-center mt-2.5 leading-snug max-w-lg mx-auto">
              No future eras, ever: nobody knows the future and we will not pretend to. The 2015-16, 2010-11 and 2005-06
              seasons are built from real market data records, real squads with their real ages and values from those
              years, not recreations. 2005-06 is as far back as the records honestly reach, so there is no 2000 era and
              there will not be an invented one. No made up name ever appears on a teamsheet unmarked.
            </p>
            {/* Round 520: the competition's real format, season by season, one tap
                from the era you are about to pick. */}
            <p className="text-[10px] text-center mt-1">
              <Link to="/champions-league-format-history" className="inline-flex items-center min-h-[32px] px-2 text-primary hover:underline">How the real Champions League format changed, and what each era here plays</Link>
            </p>
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
        {pickStep === 'nation' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-2xl mx-auto">
            {NATIONS.filter(n => !historicPick || eraLeaguesFor(pickEra, n).length > 0).map(n => {
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
                        {leagues.length > 1 ? `${leagues.length} leagues` : '1 league'} · {clubCount} clubs
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

        {/* -------- Step 2: league -------- */}
        {pickStep === 'league' && pickNation && (
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
              const lgTeams = historicPick ? eraPlayableClubs(pickEra, lg.id) : playableClubs(lg.id);
              return (
                <button
                  key={lg.id}
                  onClick={() => { setPickLeagueId(lg.id); setPickStep('team'); }}
                  className="w-full rounded-xl border bg-card border-border hover:border-primary p-4 text-left transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <FlagImg name={pickNation.name} size={34} />
                    <div className="min-w-0">
                      <div className="text-base font-bold text-foreground">{lg.name}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {lg.clubs.length} clubs · domestic cup: {lg.cupName}{lg.euro ? ' · Champions League spots' : ''}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto shrink-0" />
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-2 truncate">
                    Strongest sides: {lgTeams.slice(0, 4).map(c => c.name).join(' · ')}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* -------- Step 3: team -------- */}
        {pickStep === 'team' && pickNation && league && (
          <div className={cn(g.pendingClub && 'pb-24')}>
            <button
              onClick={() => { g.chooseClub(''); setPickStep('league'); }}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> <FlagImg name={pickNation.name} size={14} /> {league.name}
            </button>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {teams.map(c => {
                const sel = g.pendingClub === c.name;
                const partial = isPartialClub(c.name, historicPick ? pickEra : undefined);
                return (
                  <button
                    key={c.name}
                    onClick={() => g.chooseClub(c.name)}
                    className={cn(
                      'rounded-xl border p-3 text-left transition-all',
                      sel ? 'bg-primary/10 border-primary' : 'bg-card border-border hover:border-primary',
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                      {/* Round 106: flags run all the way through the picker now. */}
                      <FlagImg name={pickNation.name} size={12} />
                      <span className={cn('text-xs font-bold truncate', sel ? 'text-primary' : 'text-foreground')}>{c.name}</span>
                    </div>
                    <div className="text-[9px] text-muted-foreground mt-0.5">
                      {TIER_INFO[c.tier].emoji} {TIER_INFO[c.tier].label}
                      {partial && <span className="ml-1 text-yellow-500/80" title="The market data covers only part of this squad; the rest is filled with youth players.">· partial data</span>}
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-[10px] text-muted-foreground">Squad</span>
                      {/* Round 132: the squad number is the squad in the era you
                          picked, not the 2026 one, or the tile would be lying
                          about the team you are about to take over. */}
                      <span className="text-sm font-bold font-display text-foreground">
                        {Math.round(projectedXIAvg(c.name, eraYearsOn, pickEra) ?? clubPreviewRating(c.name))}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">Budget</span>
                      {/* Round 514: the club picker runs before a career exists, so there are no
                          start options to follow and this one stays in the default symbol. */}
                      <span className="text-xs font-bold text-gold">{money(c.budget)}</span>
                    </div>
                    {/* Round 145: this line said "Top 20" at a rank 20 club,
                        which is exactly the phrasing he told us to stop using.
                        It now quotes the board's actual named demand. */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] text-muted-foreground shrink-0">Board wants</span>
                      <span className="text-[10px] font-bold text-foreground truncate" title={boardWantLabel(c.name, historicPick ? pickEra : undefined)}>
                        {boardWantLabel(c.name, historicPick ? pickEra : undefined)}
                      </span>
                    </div>
                  </button>
                );
              })}
              <button
                onClick={() => { g.chooseClub(''); setPickStep('custom'); }}
                className="rounded-xl border border-dashed border-primary/50 p-3 text-left transition-all bg-card hover:border-primary hover:bg-primary/5"
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-base leading-none">✨</span>
                  <span className="text-xs font-bold text-primary truncate">Create your own club</span>
                </div>
                <div className="text-[9px] text-muted-foreground mt-1">
                  Your name, your crest, your stadium, your money. It takes the place of the league's weakest side.
                </div>
                <div className="text-[10px] font-bold text-foreground mt-1.5">Full customization →</div>
              </button>
            </div>
            <p className="text-[9px] text-muted-foreground text-center mt-3">
              {historicPick ? (
                <>{eraHonestyLine(era)}</>
              ) : (
                <>Squads, ratings and values from market data plus the verified summer window: {CM_ROSTER_META.players} players as of {CM_ROSTER_META.asOf}, refreshed {CM_ROSTER_META.generated}.</>
              )}
              {eraYearsOn > 0 && (
                <> Starting {era.label}, so those squads have been aged {eraYearsOn} years: {eraHonestyLine(era)}</>
              )}
            </p>

            {/* Round 70: no scrolling to confirm. The confirm bar pins to the
                bottom of the screen the moment a club is picked. */}
            {g.pendingClub && (
              <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur-sm">
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
        {pickStep === 'custom' && pickNation && league && (
          <ScreenLoading><CustomClubForm
            leagueName={league.name}
            leagueId={league.id}
            eraId={historicPick ? pickEra : undefined}
            onBack={() => setPickStep('team')}
            onCreate={spec => { setPendingCustomSpec(spec); setPickStep('manager'); }}
          /></ScreenLoading>
        )}

        {/* -------- Step 5 (Round 303): who is in the dugout -------- */}
        {pickStep === 'manager' && (
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
          clubColor={liveClub.color}
          onSub={g.subAtHalftime}
          onShape={g.shapeAtHalftime}
          onTalk={g.halftimeTalk}
          onSecondHalf={g.secondHalf}
          onStartSecondHalf={g.startSecondHalfLive}
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
        <ScreenLoading><MatchReportCard report={g.report} clubName={g.career.clubName} onContinue={g.continueFromReport} /></ScreenLoading>
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
  const unreadCount = (c.inbox ?? []).filter(m => !m.resolved).length;
  const latestMsg = (c.inbox ?? [])[0];
  const lastRes = (c.resultLog ?? []).slice(-1)[0];
  const rivalName = c.boardObjectives?.find(o => o.id === 'rival')?.rivalName ?? null;
  const rivalIdx = rivalName ? g.tableRows.findIndex(r => r.club === rivalName) : -1;
  const bidsCount = (c.incomingBids ?? []).length;
  const cupAlive = c.cupRound !== 'out' && c.cupRound !== 'won';
  const uclAlive = (c.uclGroup !== null && c.uclKoRound === null) || (!!c.uclKoRound && c.uclKoRound !== 'out' && c.uclKoRound !== 'won');

  /* ---- Round 74: the rival viewer takes over the whole screen ---- */
  if (clubView) {
    return shell(
      <div ref={panelRef}>
        <ScreenLoading><ClubDetailScreen clubName={clubView} career={c} onBack={() => setClubView(null)} /></ScreenLoading>
      </div>
    );
  }

  return shell(
    <div>
      {/* Header */}
      <header className="mb-4">
        <div className="flex items-center justify-center gap-2 mb-1 flex-wrap">
          {/* Round 154: a club you founded wears its crest where every other
              club wears its color dot. */}
          {c.customClub && c.customClub.name === c.clubName
            ? <ScreenLoading compact><CrestBadge crest={c.customClub.crest} size={22} /></ScreenLoading>
            : <span className="w-3 h-3 rounded-full" style={{ backgroundColor: club.color }} />}
          <h1 className="text-2xl md:text-3xl font-bold text-primary font-display">{c.clubName}</h1>
          {/* Round 132: the save now knows what year it is, so it says so, next
              to the season count it has always shown. */}
          <span className="text-[10px] font-bold text-muted-foreground border border-border rounded-full px-2 py-0.5 whitespace-nowrap">
            {worldSeasonLabel(c)} · Season {c.season}
          </span>
          {/* Round 549: a career that began part way through says so for as long
              as that season runs. The run-in was simulated, and a badge that
              only lives on the picker would let somebody forget that by the
              time they are reading the table. */}
          {c.midSeasonStart && c.season === 1 && (
            <span className="text-[10px] font-bold text-muted-foreground border border-border rounded-full px-2 py-0.5 whitespace-nowrap">
              🗓️ Took over mid season · run-in simulated
            </span>
          )}
        </div>
        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground flex-wrap">
          {/* Round 99: found by playing it. Before a ball is kicked every
              club is on zero points, so the "position" was just wherever the
              shuffled table happened to put you: a brand new Manchester City
              save opened on "#15 in league", which reads as broken. */}
          <span>{c.week === 0 ? 'Season not started' : `#${g.myPosition || '-'} in league`}</span>
          {c.customClub && c.customClub.name === c.clubName && (
            <span className="inline-flex items-center gap-1">
              🏟 {c.customClub.stadium}{c.customClub.capacity ? ` (${Math.round(c.customClub.capacity / 1000)}k)` : ''}
            </span>
          )}
          <span className="text-gold font-semibold">{money(c.budget, c)}</span>
          <span className="inline-flex items-center gap-1">
            {c.form.length === 0 && <span>No matches yet</span>}
            {c.form.map((f, i) => (
              <span key={i} className={cn('w-2 h-2 rounded-full', FORM_TONE[f])} />
            ))}
          </span>
          {c.trophies.length > 0 && <span>🏆×{c.trophies.length}</span>}
        </div>
        {/* Round 465: the board and the fans, on every tab, words by default
            and the number on tap. */}
        <ScreenLoading compact><MetersStrip career={c} /></ScreenLoading>
      </header>

      <Tabs value={g.activeTab} onValueChange={(v) => g.setActiveTab(v as HubTab)}>
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
          {/* Round 132: who stopped playing over the summer. It sits at the top
              of the first screen of the new season because losing a thirty
              seven year old you have had since day one is the biggest thing
              that happened between May and August, and until this round it was
              a thing that could never happen at all. */}
          {c.week === 0 && (c.retiredLastSummer ?? []).length > 0 && (
            <div className="rounded-xl border border-border bg-card p-2.5">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">👟 Hung up their boots</div>
              <div className="text-xs text-foreground">
                {(c.retiredLastSummer ?? []).map(r => `${r.name} (${r.age}, rated ${r.rating})`).join(' · ')}
              </div>
              <div className="text-[9px] text-muted-foreground mt-1">That is the end of their careers. You will need to replace them.</div>
            </div>
          )}
          {c.transferWindow !== null && (
            <button
              onClick={() => g.setActiveTab('transfers')}
              className="w-full rounded-xl border border-gold/40 bg-gold/10 p-2.5 text-xs font-bold text-gold hover:bg-gold/20 transition-colors"
            >
              {c.transferWindow === 'summer' ? '☀️' : '❄️'} Transfer window open. Tap to do business before your next match
            </button>
          )}

          <div className="bg-card border border-border rounded-2xl p-4 text-center">
            {fx && fx.kind === 'match' && (
              <>
                <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">{fx.compLabel}</div>
                <div className="text-lg font-bold font-display text-foreground">
                  {fx.home === null ? '🏟️ ' : ''}{c.clubName} <span className="text-muted-foreground text-sm">vs</span> {fx.opponent}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {fx.home === null ? 'Neutral venue' : fx.home ? 'Home' : 'Away'} · their strength ~{fx.oppStrength} · your XI avg {xiAverageRating(c)}
                </div>
                {/* Round 157: the team talk moved into the Match Centre, because
                    the owner said it was being pushed on him before every match.
                    Facts, form, head-to-head and the talk all live one tap away.
                    Round 472: and the hub keeps the two ways through a match
                    rather than three. Play Match and Watch Live were the same
                    fixture with the pitch drawn or not drawn, so they are one
                    button, and the engine plays the same match whichever of
                    the two you take. */}
                <div className="mt-3 grid grid-cols-2 gap-2 max-w-sm mx-auto">
                  <button
                    onClick={() => { setWatchMode(true); g.play(); }}
                    data-cm-way="live"
                    className="inline-flex items-center justify-center gap-1 px-2 py-3 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:opacity-90 transition-opacity"
                  >
                    {/* Round 504: a match paused mid way (the save closed with
                        the clock running) is picked back up where it stood,
                        never kicked off again, so the button says so. */}
                    <Play className="w-4 h-4" /> {c.live && c.live.week === c.week ? 'Resume match' : 'Play Live'}
                  </button>
                  <button
                    onClick={() => { setWatchMode(false); g.quickPlay(); }}
                    data-cm-way="quick"
                    className="inline-flex items-center justify-center gap-1 px-2 py-3 bg-secondary text-foreground rounded-xl font-bold text-sm hover:bg-secondary/70 transition-colors"
                  >
                    ⚡ Quick Sim
                  </button>
                </div>
                <p className="mt-1.5 text-[9px] text-muted-foreground">On the pitch with the break in your hands, or straight to the report. Same match either way.</p>
                {/* Round 543: only offered when it can actually open. The facts
                    are built only for a match that has not kicked off (the panel
                    carries the pre-match team talk, which is not a thing you get
                    to give at minute 37), so with a match paused mid-flight this
                    button used to set the panel and render nothing at all. A
                    player who walks away from a live match and comes back is
                    exactly the case that hit it. */}
                {g.facts && (
                  <button
                    onClick={() => setHubPanel('matchCentre')}
                    className="mt-2 text-[11px] font-bold text-primary hover:underline"
                  >
                    📊 Match Centre: form, head to head, odds, team talk
                  </button>
                )}
              </>
            )}
            {fx && fx.kind === 'window' && (
              <>
                <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Mid-season break</div>
                <div className="text-lg font-bold font-display text-foreground">❄️ January transfer window</div>
                <button
                  onClick={g.play}
                  className="mt-3 inline-flex items-center gap-2 px-8 py-3 bg-primary text-primary-foreground rounded-full font-bold text-lg hover:opacity-90 transition-opacity"
                >
                  Open the Window <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
            {fx && fx.kind === 'seasonOver' && (
              <>
                <div className="text-lg font-bold font-display text-foreground">Season complete!</div>
                <button
                  onClick={g.play}
                  className="mt-3 inline-flex items-center gap-2 px-8 py-3 bg-primary text-primary-foreground rounded-full font-bold text-lg hover:opacity-90 transition-opacity"
                >
                  See Season Review <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
          </div>

          {/* Round 74: the tile rule. Everything below the next match is a
              box; tapping one opens its own screen instead of one long page
              (his words: "make it smaller and with boxes and when they open
              it takes u to see something different"). */}
          {hubPanel === null && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              <HubTile
                icon="📋" title="Board" accent={objBehind > 0}
                value={objBehind > 0 ? `${objBehind} behind` : `${objDone}/${objStatuses.length} done`}
                sub={TIER_INFO[club.tier].label + ' patience'}
                onClick={() => setHubPanel('board')}
              />
              <HubTile
                icon="📩" title="Inbox" accent={unreadCount > 0}
                value={unreadCount > 0 ? `${unreadCount} new` : 'All quiet'}
                sub={latestMsg ? (latestMsg.from ?? latestMsg.playerName) : 'No messages yet'}
                onClick={() => setHubPanel('inbox')}
              />
              <HubTile
                icon="📅" title="Calendar"
                value={lastRes ? `${lastRes.res} ${lastRes.score}` : 'Season start'}
                sub={fx && fx.kind === 'match' ? `Next: ${fx.opponent}` : 'See the schedule'}
                onClick={() => setHubPanel('calendar')}
              />
              <HubTile
                icon="🏆" title="League"
                value={`#${g.myPosition || '-'}`}
                sub={c.form.length ? `Form: ${c.form.join(' ')}` : careerLeagueOf(c).name}
                onClick={() => g.setActiveTab('table')}
              />
              <HubTile
                icon="🏅" title="Cups" accent={cupAlive && !!c.cupDraw[c.cupRound as CupRound]}
                value={cupAlive ? 'Still alive' : c.cupRound === 'won' ? 'CUP WINNERS' : 'Knocked out'}
                sub={uclAlive ? 'UCL alive too' : careerLeagueOf(c).cupName}
                onClick={() => setHubPanel('cups')}
              />
              <HubTile
                icon="📊" title="Stats"
                value={`${c.squad.reduce((n, p) => n + p.seasonGoals, 0)} goals`}
                sub={(() => {
                  const ts = [...c.squad].sort((a, b) => b.seasonGoals - a.seasonGoals)[0];
                  return ts && ts.seasonGoals > 0 ? `${ts.name} leads with ${ts.seasonGoals}` : 'Goals, assists, ratings';
                })()}
                onClick={() => setHubPanel('stats')}
              />
              <HubTile
                icon="💰" title="Finances"
                value={(() => {
                  const r = projectFinances(c).resultProjected;
                  return `${r < 0 ? '-' : '+'}${money(Math.abs(r), c)} projected`;
                })()}
                sub={`Fans ${fanMeter(c).band.toLowerCase()} · prices, sponsor, the books`}
                onClick={() => setHubPanel('finance')}
              />
              <HubTile
                icon="🏗️" title="Facilities"
                value={(() => {
                  const f = facilitiesOf(c);
                  return `Level ${FACILITY_IDS.map(id => f[id]).join(' · ')}`;
                })()}
                sub="Stadium, training, medical, dressing room"
                onClick={() => setHubPanel('facilities')}
              />
              {/* Round 471: the staff desk. Accented while a rival has an
                  approach on the table, because that one is on a clock. */}
              <HubTile
                icon="🧑‍🏫" title="Staff" accent={!!staffOf(c).poach}
                value={(() => {
                  const st = staffOf(c);
                  if (st.poach) return `📞 ${st.poach.club} calling`;
                  const empty = STAFF_POST_IDS.filter(p => !st[p]);
                  return empty.length ? `${empty.length} post${empty.length === 1 ? '' : 's'} open` : `Level ${STAFF_POST_IDS.map(p => st[p]?.level ?? 0).join(' · ')}`;
                })()}
                sub={(() => {
                  const st = staffOf(c);
                  if (st.poach) return `They want your ${STAFF_POST_INFO[st.poach.postId].short.toLowerCase()} man`;
                  const empty = STAFF_POST_IDS.filter(p => !st[p]);
                  return empty.length ? `Nobody on ${empty.map(p => STAFF_POST_INFO[p].short.toLowerCase()).join(', ')}` : 'Attack, defence, keepers, scouting';
                })()}
                onClick={() => setHubPanel('staff')}
              />
              {/* Round 513: the manager's own progression. Accented only while
                  a point is sitting unspent, because that is the one state the
                  player is losing something by ignoring. */}
              <HubTile
                icon="🎖️" title="Skills" accent={pointsFree(xpOf(c)) > 0}
                value={(() => {
                  const free = pointsFree(xpOf(c));
                  return free > 0 ? `${free} point${free === 1 ? '' : 's'} to spend` : `Level ${levelFor(xpOf(c).xp)}`;
                })()}
                sub={(() => {
                  const level = levelFor(xpOf(c).xp);
                  if (pointsFree(xpOf(c)) > 0) return `Level ${level} · seven trees open`;
                  return level >= MAX_LEVEL ? 'Every tree filled' : 'Tactics, recruitment, money, the press';
                })()}
                onClick={() => setHubPanel('xp')}
              />
              {/* Round 514: the start options. Never accented: nothing here is
                  ever urgent and an accent would cry wolf. */}
              <HubTile
                icon="⚙️" title="Options"
                value={(() => {
                  const o = startOptionsOf(c);
                  return `${CURRENCIES[o.currency].symbol} · ${STRICTNESS_INFO[o.strictness]?.label ?? 'Normal'}`;
                })()}
                sub={(() => {
                  const o = startOptionsOf(c);
                  return o.nationJobs ? 'Currency, the international job, haggling' : 'International job off';
                })()}
                onClick={() => setHubPanel('options')}
              />
              <HubTile
                icon="🧢" title="Manager" accent={!!c.approach || !!nationOffer}
                value={c.approach ? '📞 A club is calling' : nationOffer ? '🌐 Your country is calling' : `${c.careerStats.wins}W ${c.careerStats.losses}L`}
                sub={c.approach
                  ? `${c.approach.club} want you`
                  : nationOffer
                    ? `${nationOffer.nation} want you for the summer`
                    : c.nationJob
                      ? `${c.nationJob.nation} manager · ${c.careerStats.wins}W ${c.careerStats.losses}L`
                      : c.careerStats.played > 0 ? `${Math.round((c.careerStats.wins / c.careerStats.played) * 100)}% win rate` : 'New in the job'}
                onClick={() => setHubPanel('manager')}
              />
              <HubTile
                icon="🏥" title="Treatment" accent={unavailable.length > 0}
                value={unavailable.length ? `${unavailable.length} out` : 'All fit'}
                sub={unavailable[0] ? unavailable[0].name : 'No injuries or bans'}
                onClick={() => setHubPanel('treatment')}
              />
              <HubTile
                icon="🕵️" title="Rival watch"
                value={rivalName ?? 'Scout clubs'}
                sub={rivalName && rivalIdx >= 0 ? `They sit #${rivalIdx + 1}` : 'Tap any club in the table'}
                onClick={rivalName ? () => setClubView(rivalName) : () => g.setActiveTab('table')}
              />
              {/* Round 135: the microphone. Accented when somebody actually
                  wants a word, which is nothing like every week. */}
              <HubTile
                icon="🎙️" title="Press room" accent={!!press?.pending}
                value={pressHeadline(c)}
                sub={press?.pending ? 'One question, one tap' : `${press?.answered ?? 0} fronted up this career`}
                onClick={() => setHubPanel('press')}
              />
              {/* Round 127: what you told each of them he was, and whether you
                  have kept your word. */}
              <HubTile
                icon="🤝" title="Dressing room" accent={wantAway.length > 0 || letDown.length > 2}
                value={wantAway.length > 0
                  ? `${wantAway.length} want${wantAway.length === 1 ? 's' : ''} out`
                  : letDown.length > 0 ? `${letDown.length} unhappy` : 'Word kept'}
                sub={wantAway[0] ? wantAway[0].name : letDown[0] ? letDown[0].name : 'Set everyone a role'}
                onClick={() => setHubPanel('roles')}
              />
              {/* Round 116: the academy and the training ground, the two
                  things every real manager sim has and this one did not. */}
              <HubTile
                icon="🎓" title="Academy" accent={prospectCount > 0}
                value={prospectCount > 0 ? `${prospectCount} on the books` : 'Nobody yet'}
                sub={academy ? `Recruitment ${academy.recruitment}/20 · ${academy.scouts.length} scouting` : 'Build a youth setup'}
                onClick={() => setHubPanel('academy')}
              />
              <HubTile
                icon="🏋️" title="Training"
                value={trainingLabel}
                sub={growingCount > 0 ? `${growingCount} player${growingCount === 1 ? '' : 's'} still improving` : 'Nobody left to develop'}
                onClick={() => setHubPanel('training')}
              />
              <HubTile
                icon="🛒" title="Market" accent={c.transferWindow !== null}
                value={c.transferWindow !== null ? 'Window OPEN' : 'Window shut'}
                sub={bidsCount > 0 ? `${bidsCount} bid${bidsCount > 1 ? 's' : ''} for your players` : 'Latest transfers inside'}
                onClick={() => g.setActiveTab('transfers')}
              />
              {c.trophies.length > 0 && (
                <HubTile
                  icon="✨" title="Cabinet"
                  value={`${c.trophies.length} troph${c.trophies.length > 1 ? 'ies' : 'y'}`}
                  sub={c.trophies[c.trophies.length - 1].name}
                  onClick={() => setHubPanel('trophies')}
                />
              )}
            </div>
          )}

          {/* Round 74: drill-in screens, one per box. */}
          {hubPanel !== null && (
            <div ref={panelRef} className="space-y-3">
              <button
                onClick={() => setHubPanel(null)}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Club home
              </button>

              {hubPanel === 'board' && objStatuses.length > 0 && (
                <ScreenLoading><ClubManagerBoardPanel club={club} objStatuses={objStatuses} /></ScreenLoading>
              )}

              {hubPanel === 'inbox' && <ScreenLoading><InboxCard career={c} onAnswer={g.answer} /></ScreenLoading>}
              {hubPanel === 'inbox' && (c.inbox ?? []).length === 0 && (
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
                  onRelease={g.terminate}
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

              {hubPanel === 'cups' && (
                <div className="space-y-2">
                  {/* Round 312: two clearly separated competitions. The old
                      panel put the UCL groups straight under the domestic cup
                      line, which read as the cup showing the wrong table, and
                      the domestic bracket card had never been mounted at all. */}
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider px-1">
                    🏅 {careerLeagueOf(c).cupName}
                  </div>
                  <div className="bg-card border border-border rounded-xl p-3 text-xs text-foreground">
                    {cupAlive ? (
                      <>🏅 <span className="font-bold">{careerLeagueOf(c).cupName}</span>: still alive. Next up, the <span className="font-bold">{c.cupRound === 'F' ? 'final' : c.cupRound === 'SF' ? 'semi-final' : c.cupRound === 'QF' ? 'quarter-final' : 'Round of 16'}</span> against <span className="font-bold">{c.cupDraw[c.cupRound as CupRound] ?? 'a club to be drawn'}</span>.</>
                    ) : c.cupRound === 'won' ? (
                      <>🏅 <span className="font-bold">{careerLeagueOf(c).cupName}</span>: WON. It is in the cabinet.</>
                    ) : (
                      <>🏅 <span className="font-bold">{careerLeagueOf(c).cupName}</span>: out{c.cupExit ? ` at the ${c.cupExit === 'F' ? 'final' : c.cupExit === 'SF' ? 'semi-final' : c.cupExit === 'QF' ? 'quarter-final' : 'Round of 16'}` : ''}. Next year.</>
                    )}
                  </div>
                  {/* Round 102 built this bracket; Round 312 finally mounts it. */}
                  <ScreenLoading><CupBracketCard career={c} onClubClick={setClubView} /></ScreenLoading>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider px-1 pt-1">
                    ⭐ Champions League
                  </div>
                  {/* Round 163: every group in the draw, not just mine, plus
                      the projected bracket that locks in after matchday 6. */}
                  <ScreenLoading><UclGroupsCard career={c} onClubClick={setClubView} /></ScreenLoading>
                  {c.uclKoRound && c.uclKoRound !== 'out' && c.uclKoRound !== 'won' && (
                    <div className="bg-card border border-border rounded-xl p-3 text-xs text-foreground">
                      ⭐ Alive in the Champions League. Next knockout round: <span className="font-bold">{c.uclKoRound === 'F' ? 'Final' : c.uclKoRound === 'SF' ? 'Semi-final' : c.uclKoRound === 'QF' ? 'Quarter-final' : 'Round of 16'}</span>
                    </div>
                  )}
                  {c.uclKoRound === 'won' && (
                    <div className="bg-card border border-gold/40 rounded-xl p-3 text-xs text-gold font-bold">⭐ CHAMPIONS OF EUROPE.</div>
                  )}
                  {/* Round 95: the knockout stage as a real bracket. */}
                  <ScreenLoading><UclBracketCard career={c} onClubClick={setClubView} /></ScreenLoading>
                  {!uclAlive && c.uclKoRound !== 'won' && c.uclGroup === null && (
                    <div className="bg-card border border-border rounded-xl p-3 text-xs text-muted-foreground">No European football this season{careerLeagueOf(c).euro ? '. Reach the Champions League places to change that' : ' in this league'}.</div>
                  )}
                </div>
              )}

              {/* Round 171: the finance desk, his CM-8. Round 200: the sponsor.
                  Round 467: the projection, food prices, the push and the bad
                  brand, all in FinancesScreen. */}
              {hubPanel === 'finance' && (
                <ScreenLoading><FinancesScreen
                  career={c}
                  onTickets={g.setTickets}
                  onConcessions={g.setConcessions}
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
                /></ScreenLoading>
              )}

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
                <ScreenLoading><ClubManagerCareerPanel c={c} g={g} nationOffer={nationOffer} /></ScreenLoading>
              )}
            </div>
          )}
          </>
          )}
        </TabsContent>

        {/* -------- Squad -------- */}
        <TabsContent value="squad">
          <div className="space-y-3">
            <ScreenLoading><SquadScreen squad={c.squad} xiIds={c.xiIds} eraId={c.eraId} captainId={c.setPieces?.captain ?? null} /></ScreenLoading>
            {/* Round 193: the contracts desk, built in Round 105 and never
               mounted until now, so renewals were unreachable for 88 rounds.
               Plain renewal or the cheaper clause deal, and every clause you
               have granted stays in view with its bargain warning. */}
            <ScreenLoading><ContractsCard career={c} onRelease={g.terminate} onSignFreeAgent={g.signFree} onRenew={g.renew} onRenewWithClause={g.renewWithClause} /></ScreenLoading>
          </div>
        </TabsContent>

        {/* -------- Tactics -------- */}
        <TabsContent value="tactics">
          <ScreenLoading><TacticsScreen
            career={c}
            onFormation={g.setFormationIndex}
            onMentality={g.setMentality}
            onSlot={g.setXiSlot}
            onSwap={g.swapXiSlots}
            onAutoPick={g.autoPick}
            onDuty={g.setSlotDuty}
            onSetPiece={g.assignSetPiece}
            onAutoSetPieces={g.autoPickSetPieces}
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
            onProposeTerms={g.proposeTerms}
            onBuyLoanee={g.buyLoanee}
            onEndLoanEarly={g.endLoanEarly}
            onRecallLoanee={g.recallLoanee}
          /></ScreenLoading>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ClubManager;
