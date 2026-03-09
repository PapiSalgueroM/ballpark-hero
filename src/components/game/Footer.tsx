import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="mt-12 pb-8 text-center text-xs text-muted-foreground space-y-3">
      <p className="max-w-lg mx-auto leading-relaxed">
        All team names, logos and trademarks are property of their respective owners. DoUKnowBall is not affiliated with the NFL, NBA, UFC, NHL, MLB, FIFA, IOC, NCAA, F1, PGA Tour, NASCAR, ATP or WTA. © 2026 DoUKnowBall
      </p>
      <div className="flex items-center justify-center gap-3">
        <Link to="/privacy" className="underline hover:text-foreground transition-colors">
          Privacy Policy
        </Link>
        <span>·</span>
        <Link to="/terms" className="underline hover:text-foreground transition-colors">
          Terms of Service
        </Link>
      </div>
    </footer>
  );
}
