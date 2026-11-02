import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import { TooltipProvider } from '@/components/ui/tooltip';
import { CookieConsent } from '@/components/CookieConsent';
import { SiteMenu } from '@/components/layout/SiteMenu';
import { SiteMenuProvider } from '@/components/layout/SiteMenuHost';
import GrandPrixBoss from '@/pages/GrandPrixBoss';

const client = new QueryClient();
createRoot(document.getElementById('root')!).render(
  <HelmetProvider><QueryClientProvider client={client}><AuthProvider><TooltipProvider>
    <BrowserRouter><SiteMenuProvider><CookieConsent /><SiteMenu /><GrandPrixBoss /></SiteMenuProvider></BrowserRouter>
  </TooltipProvider></AuthProvider></QueryClientProvider></HelmetProvider>,
);
