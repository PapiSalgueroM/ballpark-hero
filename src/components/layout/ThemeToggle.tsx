import { useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { setTheme, storedTheme, SiteTheme } from '@/lib/theme';

/* Round 347: the light mode toggle, in two shapes.
 *
 * 'footer' is the one everybody gets: a text button in the footer's link row,
 * styled like its neighbours (Cookie choices is the precedent). 'header' is an
 * icon button that only appears from sm up, because the header row's worst
 * case (a three digit streak flame plus Log In plus Sign Up) measures 347px at
 * 360 and there is no room for one more thing below that breakpoint; Rounds
 * 117 and 320 each paid for that lesson once already.
 *
 * Buttons never reach the prerendered snapshots (the prerenderer keeps
 * readable content only), so nothing here changes what a crawler sees.
 */
export function ThemeToggle({ variant }: { variant: 'footer' | 'header' }) {
  const [theme, setLocal] = useState<SiteTheme>(() => storedTheme());
  const next: SiteTheme = theme === 'light' ? 'dark' : 'light';
  const flip = () => {
    setTheme(next);
    setLocal(next);
  };

  if (variant === 'footer') {
    return (
      <button
        type="button"
        onClick={flip}
        data-theme-toggle=""
        className="underline hover:text-foreground transition-colors"
      >
        {next === 'light' ? 'Light mode' : 'Dark mode'}
      </button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={flip}
      data-theme-toggle=""
      aria-label={next === 'light' ? 'Switch to light mode' : 'Switch to dark mode'}
      className="hidden sm:inline-flex h-9 w-9 p-0"
    >
      {next === 'light' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
