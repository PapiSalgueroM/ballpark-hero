import { Link } from 'react-router-dom';
import { ReportSiteIssue } from '@/components/game/ReportSiteIssue';

export function Footer() {
  return (
    <footer className="mt-12 pb-8 text-center text-xs text-muted-foreground space-y-3">
      <p className="max-w-lg mx-auto leading-relaxed">
        All team names, competition names, logos and trademarks are property of their respective owners. DoUKnowBall is an independent fan project and is not affiliated with, endorsed by or sponsored by the NFL, NBA, UFC, NHL, MLB, FIFA, UEFA, the Premier League, the English Football League, LaLiga, Serie A, the Bundesliga, Ligue 1, the Eredivisie, MLS, the Saudi Pro League, the IOC, the NCAA, F1, the PGA Tour, NASCAR, the ATP or the WTA. Player names and statistics are used for identification and commentary only. © 2026 DoUKnowBall
      </p>
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
        {/* Round 266: these two were ORPHANS. Both are in the sitemap and
            neither had a single inbound link from any page a crawler can read,
            measured across all 122 prerendered documents, which is precisely
            the shape that produces "discovered but not indexed": Google knows
            the address from the sitemap and nothing on the site argues it is
            worth having. They are real sections rather than filler, so the
            footer is where they belong, and it puts them on every page at
            once. simInternalLinks fails if any sitemap route ever goes back to
            zero inbound links. */}
        <Link to="/leaderboard" className="underline hover:text-foreground transition-colors">
          Leaderboard
        </Link>
        <span>·</span>
        <Link to="/college" className="underline hover:text-foreground transition-colors">
          College Hub
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
        <ReportSiteIssue />
      </div>
    </footer>
  );
}
