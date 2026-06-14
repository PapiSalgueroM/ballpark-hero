import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CookieConsent } from "@/components/CookieConsent";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { Header } from "@/components/layout/Header";
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
import WorldCup from "./pages/WorldCup";
import FootballConnect4 from "./pages/FootballConnect4";
import FootballGrid from "./pages/FootballGrid";
import CollegeGrid from "./pages/CollegeGrid";
import FootballTimeline from "./pages/FootballTimeline";
import FootballDraft from "./pages/FootballDraft";
import BaseballCareer from "./pages/BaseballCareer";
import BaseballConnections from "./pages/BaseballConnections";
import HockeyCareer from "./pages/HockeyCareer";
import HockeyHigherLower from "./pages/HockeyHigherLower";
import NFLCareer from "./pages/NFLCareer";
import Teammates from "./pages/Teammates";
import PerfectLineup from "./pages/PerfectLineup";
import CollegeHub from "./pages/CollegeHub";
import Olympics from "./pages/Olympics";
import GuessTheCollege from "./pages/GuessTheCollege";
import NotFound from "./pages/NotFound";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import AdminLogin from "./pages/AdminLogin";
import AdminReports from "./pages/AdminReports";
import UfcChain from "./pages/UfcChain";
import Profile from "./pages/Profile";
import Leaderboard from "./pages/Leaderboard";
import GuessTheYear from "./pages/GuessTheYear";
import GuessNflTeam from "./pages/GuessNflTeam";
import GuessSoccerClub from "./pages/GuessSoccerClub";
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

const queryClient = new QueryClient();

const HEADER_PATHS = ['/', '/leaderboard', '/profile'];

const shouldShowHeader = (pathname: string) =>
  HEADER_PATHS.includes(pathname) || pathname.startsWith('/profile/');

const AppContent = () => {
  const { pathname } = useLocation();
  return (
    <>
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
        <Route path="/world-cup" element={<WorldCup />} />
        <Route path="/football-grid" element={<FootballGrid />} />
        <Route path="/college-grid" element={<CollegeGrid />} />
        <Route path="/football-timeline" element={<FootballTimeline />} />
        <Route path="/football-draft" element={<FootballDraft />} />
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
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/reports" element={<AdminReports />} />
        <Route path="/ufc-chain" element={<UfcChain />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/profile/:username" element={<Profile />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/guess-the-year" element={<GuessTheYear />} />
        <Route path="/guess-nfl-team" element={<GuessNflTeam />} />
        <Route path="/guess-soccer-club" element={<GuessSoccerClub />} />
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
        <Route path="/perfect-lineup" element={<PerfectLineup />} />
        <Route path="/college" element={<CollegeHub />} />
        <Route path="/world-cup-predictor" element={<Navigate to="/world-cup-bracket" replace />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
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
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
