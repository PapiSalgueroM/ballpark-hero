import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CookieConsent } from "@/components/CookieConsent";
import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigationType } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { Header } from "@/components/layout/Header";
import { LiveTicker } from "@/components/layout/LiveTicker";
import { UpdateNudge } from "@/components/layout/UpdateNudge";
import { Footer } from "@/components/game/Footer";
import Index from "./pages/Index";
const Footle = lazy(() => import("./pages/Footle"));
const CareerGame = lazy(() => import("./pages/CareerGame"));
const HigherLower = lazy(() => import("./pages/HigherLower"));
const Connections = lazy(() => import("./pages/Connections"));
const LineupBuilder = lazy(() => import("./pages/LineupBuilder"));

const UfcGame = lazy(() => import("./pages/UfcGame"));
const NbaLineup = lazy(() => import("./pages/NbaLineup"));
const NbaConnect4 = lazy(() => import("./pages/NbaConnect4"));
const NbaChain = lazy(() => import("./pages/NbaChain"));
const FootballConnect4 = lazy(() => import("./pages/FootballConnect4"));
const FootballGrid = lazy(() => import("./pages/FootballGrid"));
const CollegeGrid = lazy(() => import("./pages/CollegeGrid"));
const FootballTimeline = lazy(() => import("./pages/FootballTimeline"));
const BaseballCareer = lazy(() => import("./pages/BaseballCareer"));
const BaseballConnections = lazy(() => import("./pages/BaseballConnections"));
const HockeyCareer = lazy(() => import("./pages/HockeyCareer"));
const HockeyHigherLower = lazy(() => import("./pages/HockeyHigherLower"));
const NFLCareer = lazy(() => import("./pages/NFLCareer"));
const Teammates = lazy(() => import("./pages/Teammates"));
const SportHub = lazy(() => import("./pages/SportHub"));
const PerfectLineupNba = lazy(() => import("./pages/PerfectLineupNba"));
const PerfectLineupF1 = lazy(() => import("./pages/PerfectLineupF1"));
const PerfectLineupNhl = lazy(() => import("./pages/PerfectLineupNhl"));
const Olympics = lazy(() => import("./pages/Olympics"));
const GuessTheCollege = lazy(() => import("./pages/GuessTheCollege"));
import NotFound from "./pages/NotFound";
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const Accessibility = lazy(() => import("./pages/Accessibility"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const AdminReports = lazy(() => import("./pages/AdminReports"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const UfcChain = lazy(() => import("./pages/UfcChain"));
const Profile = lazy(() => import("./pages/Profile"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const GuessTheYear = lazy(() => import("./pages/GuessTheYear"));
const GuessNflTeam = lazy(() => import("./pages/GuessNflTeam"));
const GuessTheNation = lazy(() => import("./pages/GuessTheNation"));
const F1Driver = lazy(() => import("./pages/F1Driver"));
const F1Constructor = lazy(() => import("./pages/F1Constructor"));
const GuessCbbTeam = lazy(() => import("./pages/GuessCbbTeam"));
const GuessTennisPlayer = lazy(() => import("./pages/GuessTennisPlayer"));
const TennisChain = lazy(() => import("./pages/TennisChain"));
const GuessNascarDriver = lazy(() => import("./pages/GuessNascarDriver"));
const NascarChain = lazy(() => import("./pages/NascarChain"));
const SoccerGrid = lazy(() => import("./pages/SoccerGrid"));
const FantasyDraft = lazy(() => import("./pages/FantasyDraft"));
const Conquest = lazy(() => import("./pages/Conquest"));
const WorldCupPredictor = lazy(() => import("./pages/WorldCupPredictor"));
const SoccerCareer = lazy(() => import("./pages/SoccerCareer"));
const ShirtNumber = lazy(() => import("./pages/ShirtNumber"));
const HofOrBust = lazy(() => import("./pages/HofOrBust"));
const ScorePredictor = lazy(() => import("./pages/ScorePredictor"));
const TransferPath = lazy(() => import("./pages/TransferPath"));
const SquadDeal = lazy(() => import("./pages/SquadDeal"));
const ClubManager = lazy(() => import("./pages/ClubManager"));
const StadiumTycoon = lazy(() => import("./pages/StadiumTycoon"));
const WonderkidFactory = lazy(() => import("./pages/WonderkidFactory"));
const ListQuiz = lazy(() => import("./pages/ListQuiz"));
const PerfectSeasonMlb = lazy(() => import("./pages/PerfectSeasonMlb"));
const HigherLowerTransfers = lazy(() => import("./pages/HigherLowerTransfers"));
const PerfectSeasonNhl = lazy(() => import("./pages/PerfectSeasonNhl"));
const CareerLadder = lazy(() => import("./pages/CareerLadder"));
const PerfectSeasonNba = lazy(() => import("./pages/PerfectSeasonNba"));
const PerfectSeasonNfl = lazy(() => import("./pages/PerfectSeasonNfl"));
const WhoAmI = lazy(() => import("./pages/WhoAmI"));
const WorldXi = lazy(() => import("./pages/WorldXi"));
const PlayerBingo = lazy(() => import("./pages/PlayerBingo"));
const StatDetective = lazy(() => import("./pages/StatDetective"));
const AlphabetSprint = lazy(() => import("./pages/AlphabetSprint"));
const ClueAuction = lazy(() => import("./pages/ClueAuction"));
const RarityRound = lazy(() => import("./pages/RarityRound"));
const MissingXi = lazy(() => import("./pages/MissingXi"));
const PuckDetective = lazy(() => import("./pages/PuckDetective"));
const HockeyGrid = lazy(() => import("./pages/HockeyGrid"));
const SignThePlayer = lazy(() => import("./pages/SignThePlayer"));
const ConquestNba = lazy(() => import("./pages/ConquestNba"));
const ConquestNhl = lazy(() => import("./pages/ConquestNhl"));
const ConquestMlb = lazy(() => import("./pages/ConquestMlb"));
const FrontOffice = lazy(() => import("./pages/FrontOffice"));
const NflMyCareer = lazy(() => import("./pages/NflMyCareer"));
const NbaFrontOffice = lazy(() => import("./pages/NbaFrontOffice"));
const MlbFrontOffice = lazy(() => import("./pages/MlbFrontOffice"));
const NhlFrontOffice = lazy(() => import("./pages/NhlFrontOffice"));
const CfbDynasty = lazy(() => import("./pages/CfbDynasty"));
const CbbDynasty = lazy(() => import("./pages/CbbDynasty"));
const NbaMyCareer = lazy(() => import("./pages/NbaMyCareer"));
const MlbMyCareer = lazy(() => import("./pages/MlbMyCareer"));
const NhlMyCareer = lazy(() => import("./pages/NhlMyCareer"));
const PackBattle = lazy(() => import("./pages/PackBattle"));
const SportsMillionaire = lazy(() => import("./pages/SportsMillionaire"));
const DartDraft = lazy(() => import("./pages/DartDraft"));
const Minefield = lazy(() => import("./pages/Minefield"));
const BudgetBuilder = lazy(() => import("./pages/BudgetBuilder"));
const QuizBoard = lazy(() => import("./pages/QuizBoard"));
const BallIq = lazy(() => import("./pages/BallIq"));
const Rebuild = lazy(() => import("./pages/Rebuild"));
const EmojiGuess = lazy(() => import("./pages/EmojiGuess"));
const MysteryBox = lazy(() => import("./pages/MysteryBox"));
const NbaHigherLower = lazy(() => import("./pages/NbaHigherLower"));
const NflHigherLower = lazy(() => import("./pages/NflHigherLower"));
const F1HigherLower = lazy(() => import("./pages/F1HigherLower"));
const MlbHigherLower = lazy(() => import("./pages/MlbHigherLower"));
const TennisHigherLower = lazy(() => import("./pages/TennisHigherLower"));
const CfbHigherLower = lazy(() => import("./pages/CfbHigherLower"));
const NbaGrid = lazy(() => import("./pages/NbaGrid"));
const MlbGrid = lazy(() => import("./pages/MlbGrid"));
const NbaConnections = lazy(() => import("./pages/NbaConnections"));
const NflConnections = lazy(() => import("./pages/NflConnections"));
const NhlConnections = lazy(() => import("./pages/NhlConnections"));
const NbaCareer = lazy(() => import("./pages/NbaCareer"));
const MlbConnect4 = lazy(() => import("./pages/MlbConnect4"));
const NflConnect4 = lazy(() => import("./pages/NflConnect4"));
const MissingFive = lazy(() => import("./pages/MissingFive"));
const MissingNine = lazy(() => import("./pages/MissingNine"));
const MissingEleven = lazy(() => import("./pages/MissingEleven"));
const RankEm = lazy(() => import("./pages/RankEm"));
const PlayerStockMarket = lazy(() => import("./pages/PlayerStockMarket"));
const NhlConnect4 = lazy(() => import("./pages/NhlConnect4"));
const GolfHigherLower = lazy(() => import("./pages/GolfHigherLower"));
const AflHigherLower = lazy(() => import("./pages/AflHigherLower"));
const ChampOrNot = lazy(() => import("./pages/ChampOrNot"));
const Records = lazy(() => import("./pages/Records"));
const WhodTheyBeat = lazy(() => import("./pages/WhodTheyBeat"));
const SilverwareSort = lazy(() => import("./pages/SilverwareSort"));
const HallOfChampions = lazy(() => import("./pages/HallOfChampions"));
const IdleArena = lazy(() => import("./pages/IdleArena"));
const FaceOff = lazy(() => import("./pages/FaceOff"));
const SportsBingo = lazy(() => import("./pages/SportsBingo"));
const GuessTheGolfer = lazy(() => import("./pages/GuessTheGolfer"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const WhatsNew = lazy(() => import("./pages/WhatsNew"));

const queryClient = new QueryClient();

const HEADER_PATHS = ['/', '/leaderboard', '/profile'];

const shouldShowHeader = (pathname: string) =>
  HEADER_PATHS.includes(pathname) || pathname.startsWith('/profile/');

const ScrollToTop = () => {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();

  // The browser's own scroll restoration ("auto") can silently re-scroll the
  // page to wherever it was on a previous visit to this history entry, and it
  // can do this AFTER this component's effect below has already run (it is
  // not synced to React's render/effect cycle at all). On heavily-visited
  // pages like /footle that a player returns to often, that native restore
  // was winning the race and landing the page scrolled down despite this
  // effect firing window.scrollTo(0, 0) first. Setting scrollRestoration to
  // "manual" once, sitewide, hands scroll position entirely to this
  // component so the browser never fights it. Root cause of the /footle
  // scrolled-to-bottom-on-entry bug.
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  // Home scroll memory (#8). With scrollRestoration set to "manual" above,
  // NOBODY was restoring the games-list position: the navbar Back button is
  // navigate(-1) (POP, browser restore disabled) and the logo is a PUSH to "/"
  // (forced to top below). So returning from any game always dumped the player
  // at the top of home and they had to scroll back down. Fix: while on "/",
  // continuously remember the scroll offset (rAF-throttled, passive listener,
  // sessionStorage so it survives the SPA page swap but not a new tab); on any
  // navigation back to "/" - Back button, logo, browser back alike - jump
  // straight to the remembered spot instead of the top.
  useEffect(() => {
    if (pathname !== '/') return;
    let raf = 0;
    const save = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        try {
          sessionStorage.setItem('home-scroll-y', String(window.scrollY));
        } catch {
          /* storage unavailable (private mode etc) - scroll memory just off */
        }
      });
    };
    window.addEventListener('scroll', save, { passive: true });
    return () => {
      window.removeEventListener('scroll', save);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [pathname]);

  useEffect(() => {
    if (pathname === '/') {
      // Returning home: restore the remembered games-list position (0 on a
      // fresh visit). Instant jump, no smooth scroll - it should feel like
      // the page never moved.
      //
      // Owner Aug 2026 ("it brings me a bit farther down the site... I don't
      // wanna be scrolling up every time"): a single scrollTo fired before
      // the home page finished loading its async sections (most-played,
      // polls, images), so the page height kept shifting under the restored
      // position and the final spot drifted. Now the restore re-asserts the
      // saved position for ~1.2s while the layout settles, and backs off the
      // moment the player scrolls on their own.
      let y = 0;
      try {
        y = Number(sessionStorage.getItem('home-scroll-y')) || 0;
      } catch {
        y = 0;
      }
      window.scrollTo(0, y);
      if (y <= 0) return;

      let raf = 0;
      let cancelled = false;
      const deadline = performance.now() + 1200;
      const cancel = () => { cancelled = true; };
      // Any input the player makes takes over immediately.
      window.addEventListener('wheel', cancel, { passive: true, once: true });
      window.addEventListener('touchstart', cancel, { passive: true, once: true });
      window.addEventListener('keydown', cancel, { once: true });

      const hold = () => {
        if (cancelled || performance.now() > deadline) return;
        if (Math.abs(window.scrollY - y) > 1) {
          window.scrollTo(0, y);
        }
        raf = window.requestAnimationFrame(hold);
      };
      raf = window.requestAnimationFrame(hold);

      return () => {
        cancelled = true;
        if (raf) window.cancelAnimationFrame(raf);
        window.removeEventListener('wheel', cancel);
        window.removeEventListener('touchstart', cancel);
        window.removeEventListener('keydown', cancel);
      };
    }
    // New navigations (clicking into a game) start at the top of the page.
    // On POP (browser Back/Forward) we leave scroll alone so the player returns
    // to the exact spot they left.
    if (navigationType !== "POP") {
      window.scrollTo(0, 0);
    }
  }, [pathname, navigationType]);
  return null;
};

/* Round 53: route-level code splitting. The whole site used to ship as one
   4.9MB JS bundle; every game now loads its own chunk on demand, so the home
   page (and every first paint) is a fraction of the download. */
const RouteLoader = () => (
  <div className="flex min-h-[60vh] items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-label="Loading" />
  </div>
);

const AppContent = () => {
  const { pathname } = useLocation();
  return (
    <>
      {/* Round 215: the first tab stop on every page jumps a keyboard player
          past the ticker and nav straight to the content. Invisible until
          focused, styled in index.css. */}
      <a href="#dukb-main" className="dukb-skip-link">Skip to main content</a>
      <ScrollToTop />
      <CookieConsent />
      {/* Round 167: the site's own wire across the top of every screen. */}
      <LiveTicker />
      {shouldShowHeader(pathname) && <Header />}
      <Suspense fallback={<RouteLoader />}>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/footle" element={<Footle />} />
        <Route path="/career" element={<CareerGame />} />
        <Route path="/higher-lower" element={<HigherLower />} />
        <Route path="/connections" element={<Connections />} />
        <Route path="/build-your-xi" element={<LineupBuilder />} />
        <Route path="/ufc" element={<UfcGame />} />
        <Route path="/nba-starting-5" element={<NbaLineup />} />
        <Route path="/nba-connect-4" element={<NbaConnect4 />} />
        <Route path="/nba-chain" element={<NbaChain />} />
        <Route path="/football-connect-4" element={<FootballConnect4 />} />
        <Route path="/world-cup" element={<Navigate to="/" replace />} />
        <Route path="/football-grid" element={<FootballGrid />} />
        <Route path="/college-grid" element={<CollegeGrid />} />
        <Route path="/football-timeline" element={<FootballTimeline />} />
        <Route path="/football-draft" element={<Navigate to="/" replace />} />
        <Route path="/baseball-career" element={<BaseballCareer />} />
        <Route path="/baseball-connections" element={<BaseballConnections />} />
        <Route path="/hockey-career" element={<HockeyCareer />} />
        <Route path="/hockey-higher-lower" element={<HockeyHigherLower />} />
        <Route path="/nfl-career" element={<NFLCareer />} />
        <Route path="/teammates" element={<Teammates />} />
        <Route path="/olympics" element={<Olympics />} />
        <Route path="/guess-the-college" element={<GuessTheCollege />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/accessibility" element={<Accessibility />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/whats-new" element={<WhatsNew />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/reports" element={<AdminReports />} />
        <Route path="/ufc-chain" element={<UfcChain />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/profile/:username" element={<Profile />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/guess-the-year" element={<GuessTheYear />} />
        <Route path="/guess-nfl-team" element={<GuessNflTeam />} />
        <Route path="/guess-soccer-club" element={<Navigate to="/" replace />} />
        <Route path="/guess-the-nation" element={<GuessTheNation />} />
        <Route path="/f1-driver" element={<F1Driver />} />
        <Route path="/f1-constructor" element={<F1Constructor />} />
        <Route path="/guess-cbb-team" element={<GuessCbbTeam />} />
        <Route path="/guess-tennis-player" element={<GuessTennisPlayer />} />
        <Route path="/tennis-chain" element={<TennisChain />} />
        <Route path="/guess-nascar-driver" element={<GuessNascarDriver />} />
        <Route path="/nascar-chain" element={<NascarChain />} />
        <Route path="/soccer-grid" element={<SoccerGrid />} />
        <Route path="/fantasy-draft" element={<FantasyDraft />} />
        <Route path="/conquest" element={<Conquest />} />
        <Route path="/soccer-career" element={<SoccerCareer />} />
        <Route path="/world-cup-bracket" element={<WorldCupPredictor />} />
        <Route path="/shirt-number" element={<ShirtNumber />} />
        <Route path="/hof-or-bust" element={<HofOrBust />} />
        <Route path="/score-predictor" element={<ScorePredictor />} />
        <Route path="/transfer-path" element={<TransferPath />} />
        <Route path="/guess-transfer-value" element={<Navigate to="/" replace />} />
        <Route path="/perfect-lineup" element={<Navigate to="/" replace />} />
        {/* Round 270: one component, six sport hubs. The route string is the
            key into SPORT_HUBS in src/lib/sportHub.ts, and scripts/simHubs.mjs
            checks that these two lists say the same thing. */}
        <Route path="/college" element={<SportHub route="/college" />} />
        <Route path="/soccer" element={<SportHub route="/soccer" />} />
        <Route path="/pro-basketball" element={<SportHub route="/pro-basketball" />} />
        <Route path="/pro-football" element={<SportHub route="/pro-football" />} />
        <Route path="/baseball" element={<SportHub route="/baseball" />} />
        <Route path="/hockey" element={<SportHub route="/hockey" />} />
        <Route path="/perfect-lineup-nba" element={<PerfectLineupNba />} />
        <Route path="/perfect-lineup-f1" element={<PerfectLineupF1 />} />
        <Route path="/perfect-lineup-nhl" element={<PerfectLineupNhl />} />
        <Route path="/world-cup-predictor" element={<Navigate to="/world-cup-bracket" replace />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="/deal-or-no-deal" element={<Navigate to="/squad-deal" replace />} />
        <Route path="/squad-deal" element={<SquadDeal />} />
        <Route path="/club-manager" element={<ClubManager />} />
        <Route path="/stadium-tycoon" element={<StadiumTycoon />} />
        <Route path="/wonderkid-factory" element={<WonderkidFactory />} />
        <Route path="/list-quiz" element={<ListQuiz />} />
        <Route path="/perfect-season-mlb" element={<PerfectSeasonMlb />} />
        <Route path="/higher-lower-transfers" element={<HigherLowerTransfers />} />
        <Route path="/perfect-season-nhl" element={<PerfectSeasonNhl />} />
        <Route path="/career-ladder" element={<CareerLadder />} />
        <Route path="/perfect-season-nba" element={<PerfectSeasonNba />} />
        <Route path="/perfect-season-nfl" element={<PerfectSeasonNfl />} />
        <Route path="/who-am-i" element={<WhoAmI />} />
        <Route path="/world-xi" element={<WorldXi />} />
        <Route path="/player-bingo" element={<PlayerBingo />} />
        <Route path="/stat-detective" element={<StatDetective />} />
        <Route path="/alphabet-sprint" element={<AlphabetSprint />} />
        <Route path="/clue-auction" element={<ClueAuction />} />
        <Route path="/rarity-round" element={<RarityRound />} />
        <Route path="/missing-xi" element={<MissingXi />} />
        <Route path="/puck-detective" element={<PuckDetective />} />
        <Route path="/hockey-grid" element={<HockeyGrid />} />
        <Route path="/sign-the-player" element={<SignThePlayer />} />
        <Route path="/conquest-nba" element={<ConquestNba />} />
        <Route path="/conquest-nhl" element={<ConquestNhl />} />
        <Route path="/conquest-mlb" element={<ConquestMlb />} />
        <Route path="/front-office" element={<FrontOffice />} />
        <Route path="/nfl-my-career" element={<NflMyCareer />} />
        <Route path="/nba-front-office" element={<NbaFrontOffice />} />
        <Route path="/mlb-front-office" element={<MlbFrontOffice />} />
        <Route path="/nhl-front-office" element={<NhlFrontOffice />} />
        <Route path="/cfb-dynasty" element={<CfbDynasty />} />
        <Route path="/cbb-dynasty" element={<CbbDynasty />} />
        <Route path="/nba-my-career" element={<NbaMyCareer />} />
        <Route path="/mlb-my-career" element={<MlbMyCareer />} />
        <Route path="/nhl-my-career" element={<NhlMyCareer />} />
        <Route path="/pack-battle" element={<PackBattle />} />
        <Route path="/sports-millionaire" element={<SportsMillionaire />} />
        <Route path="/dart-draft" element={<DartDraft />} />
        <Route path="/minefield" element={<Minefield />} />
        {/* Round 311, Anthony's 2026-08-28 review: both retired at his call
            ("two buttons, no game feel"). The versus game hands its address to
            Face Off, the ranking game goes home. Standing retired route
            pattern: Navigate here, meta refresh stub in public/, out of the
            sitemap and the registry. */}
        <Route path="/overrated-underrated" element={<Navigate to="/face-off" replace />} />
        <Route path="/tier-list" element={<Navigate to="/" replace />} />
        <Route path="/budget-builder" element={<BudgetBuilder />} />
        <Route path="/grade-transfer" element={<Navigate to="/" replace />} />
        <Route path="/quiz-board" element={<QuizBoard />} />
        {/* Round 305: the address sheds the trademark the game itself never
            used on screen; same treatment as /deal-or-no-deal. Storage keys
            and the Supabase table keep the old spelling, a data migration is
            not a copy edit. */}
        <Route path="/jeopardy" element={<Navigate to="/quiz-board" replace />} />
        <Route path="/ball-iq" element={<BallIq />} />
        <Route path="/rebuild" element={<Rebuild />} />
        <Route path="/emoji-guess" element={<EmojiGuess />} />
        <Route path="/mystery-box" element={<MysteryBox />} />
        <Route path="/nba-higher-lower" element={<NbaHigherLower />} />
        <Route path="/nfl-higher-lower" element={<NflHigherLower />} />
        <Route path="/f1-higher-lower" element={<F1HigherLower />} />
        <Route path="/mlb-higher-lower" element={<MlbHigherLower />} />
        <Route path="/tennis-higher-lower" element={<TennisHigherLower />} />
        <Route path="/cfb-higher-lower" element={<CfbHigherLower />} />
        <Route path="/nba-grid" element={<NbaGrid />} />
        <Route path="/mlb-grid" element={<MlbGrid />} />
        <Route path="/nba-connections" element={<NbaConnections />} />
        <Route path="/nfl-connections" element={<NflConnections />} />
        <Route path="/nhl-connections" element={<NhlConnections />} />
        <Route path="/nba-career" element={<NbaCareer />} />
        <Route path="/mlb-connect-4" element={<MlbConnect4 />} />
        <Route path="/nfl-connect-4" element={<NflConnect4 />} />
        <Route path="/missing-five" element={<MissingFive />} />
        <Route path="/missing-nine" element={<MissingNine />} />
        <Route path="/missing-eleven" element={<MissingEleven />} />
        <Route path="/rank-em" element={<RankEm />} />
        <Route path="/player-stock-market" element={<PlayerStockMarket />} />
        <Route path="/golf-higher-lower" element={<GolfHigherLower />} />
        <Route path="/afl-higher-lower" element={<AflHigherLower />} />
        <Route path="/champ-or-not" element={<ChampOrNot />} />
        <Route path="/records" element={<Records />} />
        <Route path="/whod-they-beat" element={<WhodTheyBeat />} />
        <Route path="/silverware-sort" element={<SilverwareSort />} />
        <Route path="/hall-of-champions" element={<HallOfChampions />} />
        <Route path="/idle-arena" element={<IdleArena />} />
        <Route path="/face-off" element={<FaceOff />} />
        <Route path="/sports-bingo" element={<SportsBingo />} />
        <Route path="/guess-the-golfer" element={<GuessTheGolfer />} />
        <Route path="/nhl-connect-4" element={<NhlConnect4 />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      </Suspense>
      {/* Round 49: one global footer on every page (legal disclaimer, About/Contact/
          What's New links, and the Report a bug button), instead of 33 pages
          importing their own copy and 95 pages having none. */}
      <Footer />
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <UpdateNudge />
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
