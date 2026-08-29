import { Link } from 'react-router-dom';
import { ReportSiteIssue } from '@/components/game/ReportSiteIssue';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { SPORT_HUBS } from '@/lib/sportHub';

/* Round 285: every visitor gets a way back to the cookie banner. Consent that
   can be given in one click and withdrawn only by finding the browser's site
   data screen is not much of a choice, and the privacy policy now promises
   this link by name. Clearing the stored answer and reloading is the whole
   mechanism: CookieConsent shows the banner whenever no answer is stored, and
   index.html only loads the ad script when the stored answer is 'accepted', so
   a reload with no answer is a page with no advertising code on it. */
function resetCookieChoice() {
  try { localStorage.removeItem('cookie-consent'); } catch { /* storage blocked: nothing was stored */ }
  window.location.reload();
}

export function Footer() {
  /* data-site-chrome: this is on every page, so the prerenderer keeps it out
     of the text the sitemap dates a page by (Round 286). A footer change is
     not a reason for Google to recrawl 126 pages. */
  return (
    <footer data-site-chrome="" className="mt-12 pb-8 text-center text-xs text-muted-foreground space-y-3">
      <p className="max-w-lg mx-auto leading-relaxed">
        All team names, competition names, logos and trademarks are property of their respective owners. DoUKnowBall is an independent fan project and is not affiliated with, endorsed by or sponsored by the NFL, NBA, UFC, NHL, MLB, FIFA, UEFA, the Premier League, the English Football League, LaLiga, Serie A, the Bundesliga, Ligue 1, the Eredivisie, MLS, the Saudi Pro League, the IOC, the NCAA, F1, the PGA Tour, NASCAR, the ATP or the WTA. Player names and statistics are used for identification and commentary only. © 2026 DoUKnowBall
      </p>
      {/* Round 285: ALL SIX SPORT HUBS, NOT ONE. Round 266 put /college in this
          footer because it was an orphan, and left the other five hubs where
          they were, which was seven inbound links each: the home page and the
          six hubs pointing at one another. Measured across the 126 shipped
          documents on 2026-08-25: /college 132 inbound, /soccer, /pro-football,
          /pro-basketball, /baseball and /hockey 6 each. Eighteen to one in
          favour of the smallest section over the largest, on five pages Google
          has never indexed. The list is read from sportHub.ts so a seventh hub
          lands here on its own; simInternalLinks holds every hub to the same
          floor. */}
      <nav aria-label="Sports" className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 px-4">
        {SPORT_HUBS.map((hub, i) => (
          <span key={hub.route} className="inline-flex items-center gap-x-3">
            {i > 0 && <span aria-hidden="true">·</span>}
            <Link to={hub.route} className="underline hover:text-foreground transition-colors">
              {hub.h1.replace(/ Games( Hub)?$/, '')}
            </Link>
          </span>
        ))}
      </nav>
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 px-4">
        <Link to="/about" className="underline hover:text-foreground transition-colors">
          About
        </Link>
        <span>·</span>
        <Link to="/contact" className="underline hover:text-foreground transition-colors">
          Contact
        </Link>
        <span>·</span>
        <Link to="/whats-new" className="underline hover:text-foreground transition-colors">
          What's New
        </Link>
        <span>·</span>
        <Link to="/records" className="underline hover:text-foreground transition-colors">
          Record Books
        </Link>
        <span>·</span>
        {/* Round 266: this one was an ORPHAN. It is in the sitemap and had not
            a single inbound link from any page a crawler can read, measured
            across all 122 prerendered documents, which is precisely the shape
            that produces "discovered but not indexed": Google knows the
            address from the sitemap and nothing on the site argues it is
            worth having. simInternalLinks fails if any sitemap route ever
            goes back to zero inbound links. */}
        <Link to="/leaderboard" className="underline hover:text-foreground transition-colors">
          Leaderboard
        </Link>
        <span>·</span>
        <Link to="/privacy" className="underline hover:text-foreground transition-colors">
          Privacy Policy
        </Link>
        <span>·</span>
        <Link to="/terms" className="underline hover:text-foreground transition-colors">
          Terms of Service
        </Link>
          <span>·</span>
          <Link to="/accessibility" className="underline hover:text-foreground transition-colors">
            Accessibility
          </Link>
        <span>·</span>
        <button
          type="button"
          onClick={resetCookieChoice}
          className="underline hover:text-foreground transition-colors"
        >
          Cookie choices
        </button>
        <span>·</span>
        <ThemeToggle variant="footer" />
        <span>·</span>
        <ReportSiteIssue />
      </div>
    </footer>
  );
}
