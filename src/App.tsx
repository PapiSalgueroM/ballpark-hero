import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import CareerGame from "./pages/CareerGame";
import HigherLower from "./pages/HigherLower";
import Connections from "./pages/Connections";
import LineupBuilder from "./pages/LineupBuilder";
import BlurredFace from "./pages/BlurredFace";
import UfcGame from "./pages/UfcGame";
import NotFound from "./pages/NotFound";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";

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
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
