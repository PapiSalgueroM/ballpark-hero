import { Link } from 'react-router-dom';
import { useRoutePath } from '@/hooks/useRoutePath';
import { isGameRoute } from '@/components/StorageNotice';
import { ReportSiteIssue } from '@/components/game/ReportSiteIssue';
import { SoundToggle } from '@/components/game/SoundToggle';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { HUB_NAV } from '@/lib/sportHubNav';
import { openConsentChoices } from '@/lib/consentPreferences';

const linkClass = 'inline-flex min-h-8 items-center rounded-sm underline transition-colors hover:text-foreground focus-visible:outline-ring';

/* Opening preferences preserves the current choice until the visitor saves. */
export function Footer({ soccerControls = false }: { soccerControls?: boolean } = {}) {
  /* data-site-chrome: this is on every page, so the prerenderer keeps it out
     of the text the sitemap dates a page by (Round 286). A footer change is
     not a reason for Google to recrawl 126 pages. */
  // Snapshot capture reads innerText, which is empty inside a closed disclosure.
  const vignette = isGameRoute(useRoutePath()) ? "false" : undefined;
  const prerender = typeof window !== 'undefined' && !!(window as Window & { __DUKB_PRERENDER__?: boolean }).__DUKB_PRERENDER__;
  return (
    <footer data-site-chrome="" className="mt-10 border-t border-border px-4 pb-6 pt-3 text-center text-xs text-muted-foreground">
      {soccerControls && (
        <a href="#dukb-main" data-google-vignette="false" data-soccer-control-return="" data-no-prerender=""
          className="mx-auto mb-3 inline-flex min-h-11 items-center rounded-md border border-border px-3 font-semibold text-foreground hover:bg-muted focus-visible:outline-ring"
          onClick={event => {
            const main = document.getElementById('dukb-main');
            if (!main) return;
            event.preventDefault();
            window.scrollTo(0, 0);
            main.focus({ preventScroll: true });
          }}>Back to career controls</a>
      )}
      <nav aria-label="Site links" className="flex flex-wrap items-center justify-center gap-x-3">
        <Link data-google-vignette={vignette} to="/about" className={linkClass}>About</Link>
        <Link data-google-vignette={vignette} to="/contact" className={linkClass}>Contact</Link>
        <Link data-google-vignette={vignette} to="/privacy" className={linkClass}>Privacy Policy</Link>
        <Link data-google-vignette={vignette} to="/terms" className={linkClass}>Terms of Service</Link>
        <button type="button" onClick={event => openConsentChoices(event.currentTarget)} className={linkClass}>
          Cookie choices
        </button>
        <ReportSiteIssue />
      </nav>
      <details className="mt-1" open={prerender || undefined}>
        <summary className="mx-auto min-h-8 w-fit cursor-pointer rounded-sm px-2 py-2 font-medium text-foreground focus-visible:outline-ring">
          More links
        </summary>
        <nav aria-label="Sports" className="mt-2 flex flex-wrap items-center justify-center gap-x-3">
          {HUB_NAV.map(hub => (
            <Link data-google-vignette={vignette} key={hub.route} to={hub.route} className={linkClass}>{hub.navLabel}</Link>
          ))}
        </nav>
        <div className="flex flex-wrap items-center justify-center gap-x-3">
          <Link data-google-vignette={vignette} to="/search" className={linkClass}>Search Games</Link>
          <Link data-google-vignette={vignette} to="/records" className={linkClass}>Record Books</Link>
          <Link data-google-vignette={vignette} to="/whats-new" className={linkClass}>What's New</Link>
          <Link data-google-vignette={vignette} to="/leaderboard" className={linkClass}>Leaderboard</Link>
          <Link data-google-vignette={vignette} to="/cookie-policy" className={linkClass}>Cookie Policy</Link>
          <Link data-google-vignette={vignette} to="/accessibility" className={linkClass}>Accessibility</Link>
          <ThemeToggle variant="footer" />
          <SoundToggle variant="text" />
        </div>
        <p className="mx-auto mt-4 max-w-lg leading-relaxed">
          All team names, competition names, logos and trademarks are property of their respective owners. DoUKnowBall is an independent fan project and is not affiliated with, endorsed by or sponsored by the NFL, NBA, UFC, NHL, MLB, FIFA, UEFA, the Premier League, the English Football League, LaLiga, Serie A, the Bundesliga, Ligue 1, the Eredivisie, MLS, the Saudi Pro League, the IOC, the NCAA, F1, the PGA Tour, NASCAR, the ATP or the WTA. Player names and statistics are used for identification and commentary only. © 2026 DoUKnowBall
        </p>
      </details>
    </footer>
  );
}
