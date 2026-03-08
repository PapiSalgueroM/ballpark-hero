import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Footle from "./pages/Footle";
import CareerGame from "./pages/CareerGame";
import HigherLower from "./pages/HigherLower";
import Connections from "./pages/Connections";
import LineupBuilder from "./pages/LineupBuilder";
import BlurredFace from "./pages/BlurredFace";
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
import Olympics from "./pages/Olympics";
import NotFound from "./pages/NotFound";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import AdminLogin from "./pages/AdminLogin";
import AdminReports from "./pages/AdminReports";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/career" element={<CareerGame />} />
          <Route path="/higher-lower" element={<HigherLower />} />
          <Route path="/connections" element={<Connections />} />
          <Route path="/build-your-xi" element={<LineupBuilder />} />
          <Route path="/guess-the-face" element={<BlurredFace />} />
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
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/reports" element={<AdminReports />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
