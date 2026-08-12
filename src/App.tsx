import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CookieConsent } from "@/components/CookieConsent";
import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigationType } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { Header } from "@/components/layout/Header";
import { UpdateNudge } from "@/components/layout/UpdateNudge";
import Index from "./pages/Index";
import Footle from "./pages/Footle";
import CareerGame from "./pages/CareerGame";
import HigherLower from "./pages/HigherLower";
import Connections from "./pages/Connections";
import LineupBuilder from "./pages/LineupBuilder";

import UfcGame from "./pages/UfcGame";
import NbaLineup from "./pages/NbaLineup";
import NbaConnect4 from "./pages/NbaConnect4";
import NbaChain from "./pages/NbaChain";
import FootballConnect4 from "./pages/FootballConnect4";
import FootballGrid from "./pages/FootballGrid";
import CollegeGrid from "./pages/CollegeGrid";
import FootballTimeline from "./pages/FootballTimeline";
import BaseballCareer from "./pages/BaseballCareer";
import BaseballConnections from "./pages/BaseballConnections";
import HockeyCareer from "./pages/HockeyCareer";
import HockeyHigherLower from "./pages/HockeyHigherLower";
import NFLCareer from "./pages/NFLCareer";
import Teammates from "./pages/Teammates";
import CollegeHub from "./pages/CollegeHub";
import PerfectLineupNba from "./pages/PerfectLineupNba";
import PerfectLineupF1 from "./pages/PerfectLineupF1";
import PerfectLineupNhl from "./pages/PerfectLineupNhl";
import Olympics from "./pages/Olympics";
import GuessTheCollege from "./pages/GuessTheCollege";
import NotFound from "./pages/NotFound";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import AdminLogin from "./pages/AdminLogin";
import AdminReports from "./pages/AdminReports";
import ResetPassword from "./pages/ResetPassword";
import UfcChain from "./pages/UfcChain";
import Profile from "./pages/Profile";
import Leaderboard from "./pages/Leaderboard";
import GuessTheYear from "./pages/GuessTheYear";
import GuessNflTeam from "./pages/GuessNflTeam";
import GuessTheNation from "./pages/GuessTheNation";
import F1Driver from "./pages/F1Driver";
import F1Constructor from "./pages/F1Constructor";
import GuessCbbTeam from "./pages/GuessCbbTeam";
import GuessTennisPlayer from "./pages/GuessTennisPlayer";
import TennisChain from "./pages/TennisChain";
import GuessNascarDriver from "./pages/GuessNascarDriver";
import NascarChain from "./pages/NascarChain";
import SoccerGrid from "./pages/SoccerGrid";
import FantasyDraft from "./pages/FantasyDraft";
import Conquest from "./pages/Conquest";
import WorldCupPredictor from "./pages/WorldCupPredictor";
import SoccerCareer from "./pages/SoccerCareer";
import ShirtNumber from "./pages/ShirtNumber";
import HofOrBust from "./pages/HofOrBust";
import ScorePredictor from "./pages/ScorePredictor";
import TransferPath from "./pages/TransferPath";
import SquadDeal from "./pages/SquadDeal";
import ClubManager from "./pages/ClubManager";
import ListQuiz from "./pages/ListQuiz";
import PerfectSeasonMlb from "./pages/PerfectSeasonMlb";
import HigherLowerTransfers from "./pages/HigherLowerTransfers";
import PerfectSeasonNhl from "./pages/PerfectSeasonNhl";
import CareerLadder from "./pages/CareerLadder";
import PerfectSeasonNba from "./pages/PerfectSeasonNba";
import PerfectSeasonNfl from "./pages/PerfectSeasonNfl";
import WhoAmI from "./pages/WhoAmI";
import WorldXi from "./pages/WorldXi";
import PlayerBingo from "./pages/PlayerBingo";
import StatDetective from "./pages/StatDetective";
import AlphabetSprint from "./pages/AlphabetSprint";
import ClueAuction from "./pages/ClueAuction";
import RarityRound from "./pages/RarityRound";
import MissingXi from "./pages/MissingXi";
import PuckDetective from "./pages/PuckDetective";
import HockeyGrid from "./pages/HockeyGrid";
import SignThePlayer from "./pages/SignThePlayer";
import ConquestNba from "./pages/ConquestNba";
import ConquestNhl from "./pages/ConquestNhl";
import ConquestMlb from "./pages/ConquestMlb";
import FrontOffice from "./pages/FrontOffice";
import NflMyCareer from "./pages/NflMyCareer";
import NbaFrontOffice from "./pages/NbaFrontOffice";
import MlbFrontOffice from "./pages/MlbFrontOffice";
import NhlFrontOffice from "./pages/NhlFrontOffice";
import CfbDynasty from "./pages/CfbDynasty";
import CbbDynasty from "./pages/CbbDynasty";
import NbaMyCareer from "./pages/NbaMyCareer";
import MlbMyCareer from "./pages/MlbMyCareer";
import NhlMyCareer from "./pages/NhlMyCareer";
import PackBattle from "./pages/PackBattle";
import SportsMillionaire from "./pages/SportsMillionaire";
import DartDraft from "./pages/DartDraft";
import Minefield from "./pages/Minefield";
import OverratedUnderrated from "./pages/OverratedUnderrated";
import TierList from "./pages/TierList";
import BudgetBuilder from "./pages/BudgetBuilder";
import Jeopardy from "./pages/Jeopardy";
import BallIq from "./pages/BallIq";
import Rebuild from "./pages/Rebuild";
import EmojiGuess from "./pages/EmojiGuess";
import MysteryBox from "./pages/MysteryBox";
import NbaHigherLower from "./pages/NbaHigherLower";
import NflHigherLower from "./pages/NflHigherLower";
import F1HigherLower from "./pages/F1HigherLower";
import MlbHigherLower from "./pages/MlbHigherLower";
import TennisHigherLower from "./pages/TennisHigherLower";
import CfbHigherLower from "./pages/CfbHigherLower";
import NbaGrid from "./pages/NbaGrid";
import MlbGrid from "./pages/MlbGrid";
import NbaConnections from "./pages/NbaConnections";
import NflConnections from "./pages/NflConnections";
import NhlConnections from "./pages/NhlConnections";
import NbaCareer from "./pages/NbaCareer";
import MlbConnect4 from "./pages/MlbConnect4";
import NflConnect4 from "./pages/NflConnect4";
import MissingFive from "./pages/MissingFive";
import MissingNine from "./pages/MissingNine";
import MissingEleven from "./pages/MissingEleven";
import RankEm from "./pages/RankEm";
import PlayerStockMarket from "./pages/PlayerStockMarket";
import NhlConnect4 from "./pages/NhlConnect4";
import GolfHigherLower from "./pages/GolfHigherLower";
import GuessTheGolfer from "./pages/GuessTheGolfer";
import About from "./pages/About";
import Contact from "./pages/Contact";
import WhatsNew from "./pages/WhatsNew";

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

const AppContent = () => {
  const { pathname } = useLocation();
  return (
    <>
      <ScrollToTop />
      <CookieConsent />
      {shouldShowHeader(pathname) && <Header />}
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
        <Route path="/college" element={<CollegeHub />} />
        <Route path="/perfect-lineup-nba" element={<PerfectLineupNba />} />
        <Route path="/perfect-lineup-f1" element={<PerfectLineupF1 />} />
        <Route path="/perfect-lineup-nhl" element={<PerfectLineupNhl />} />
        <Route path="/world-cup-predictor" element={<Navigate to="/world-cup-bracket" replace />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="/deal-or-no-deal" element={<Navigate to="/squad-deal" replace />} />
        <Route path="/squad-deal" element={<SquadDeal />} />
        <Route path="/club-manager" element={<ClubManager />} />
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
        <Route path="/overrated-underrated" element={<OverratedUnderrated />} />
        <Route path="/tier-list" element={<TierList />} />
        <Route path="/budget-builder" element={<BudgetBuilder />} />
        <Route path="/grade-transfer" element={<Navigate to="/" replace />} />
        <Route path="/jeopardy" element={<Jeopardy />} />
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
        <Route path="/guess-the-golfer" element={<GuessTheGolfer />} />
        <Route path="/nhl-connect-4" element={<NhlConnect4 />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
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
