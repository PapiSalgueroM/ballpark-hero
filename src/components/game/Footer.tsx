import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="mt-12 pb-8 text-center text-xs text-muted-foreground space-y-2">
      <p>© 2026 FootyFein. All rights reserved.</p>
      <p>All logos, club crests, player names, and brands are the property of their respective owners and are used for identification purposes only.</p>
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
