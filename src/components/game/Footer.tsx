import { Link } from 'react-router-dom';
import { ReportSiteIssue } from '@/components/game/ReportSiteIssue';

export function Footer() {
  return (
    <footer className="mt-12 pb-8 text-center text-xs text-muted-foreground space-y-3">
      <p className="max-w-lg mx-auto leading-relaxed">
        All team names, logos and trademarks are property of their respective owners. DoUKnowBall is not affiliated with the NFL, NBA, UFC, NHL, MLB, FIFA, IOC, NCAA, F1, PGA Tour, NASCAR, ATP or WTA. © 2026 DoUKnowBall
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
