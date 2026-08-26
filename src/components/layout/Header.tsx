import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { AuthModal } from '@/components/auth/AuthModal';
import { Flame, User, BarChart3, LogOut, Loader2 } from 'lucide-react';
import { useStreaks } from '@/hooks/useStreaks';

export function Header() {
  const { user, profile, loading, signOut } = useAuth();
  // #101: global "played anything today" streak, local-first so it renders
  // for guests too (no login required to play anything, per this app's
  // guest-first posture). This replaces the old profile.current_streak
  // check below, which read from the `profiles` table -- confirmed via
  // direct SQL against the live database to not exist, so that check was
  // always false in production regardless of how much anyone had played.
  const { globalCurrentStreak } = useStreaks();
  const [authModal, setAuthModal] = useState<{ open: boolean; tab: 'login' | 'signup' }>({
    open: false,
    tab: 'login',
  });
  const navigate = useNavigate();
  /* Round 283: the guest sign up strip below is suppressed on the home page.
     See the comment at that block for the measurement behind it. */
  const isHome = useLocation().pathname === '/';

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const getUserInitial = () => {
    if (profile?.display_name) {
      return profile.display_name.charAt(0).toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        {/* Round 117: px-3 and gap-2 below sm. The wordmark is 2xl and Log In
            plus Sign Up are both whitespace-nowrap, so on a 320px phone the row
            could not fit and Sign Up hung 9px off the right edge, taking seven
            game pages and the homepage with it. Tightening the padding and the
            gap only below sm buys back 12px and nothing above 640 moves. */}
        <div className="container flex h-14 max-w-4xl items-center justify-between px-3 sm:px-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <span className="font-display font-black text-2xl sm:text-3xl tracking-wide text-primary">DoUKnowBall</span>
          </Link>

          {/* Auth Section */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* #101: global streak flame, local-first, visible whether
                signed in or not (guest experience must not regress -- see
                CLAUDE.md guest-first posture). Sits next to the account
                menu / sign-in buttons since this Header (unlike GameNavbar,
                which has its own daily-score chip and is out of scope for
                this change) has no other daily-score element for it to
                anchor next to. */}
            {globalCurrentStreak > 0 && (
              <div className="flex items-center gap-1 text-sm font-medium" title={`${globalCurrentStreak} day streak`}>
                <Flame className="w-4 h-4 text-orange-500" />
                <span>{globalCurrentStreak}</span>
              </div>
            )}

            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            ) : user ? (
              <>
                {/* User Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="flex items-center gap-2 h-9 pl-3 pr-1 rounded-full hover:bg-accent"
                    >
                      <span className="hidden sm:inline max-w-[120px] truncate text-sm font-medium">
                        {profile?.display_name || user.email?.split('@')[0]}
                      </span>
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-sm">
                        {getUserInitial()}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-2 py-1.5">
                      <p className="text-sm font-medium">
                        {profile?.display_name || user.email}
                      </p>
                      {profile?.username && (
                        <p className="text-xs text-muted-foreground">@{profile.username}</p>
                      )}
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/profile" className="cursor-pointer">
                        <User className="mr-2 h-4 w-4" />
                        My Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/leaderboard" className="cursor-pointer">
                        <BarChart3 className="mr-2 h-4 w-4" />
                        Leaderboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
                      <LogOut className="mr-2 h-4 w-4" />
                      Log Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAuthModal({ open: true, tab: 'login' })}
                >
                  Log In
                </Button>
                <Button
                  size="sm"
                  onClick={() => setAuthModal({ open: true, tab: 'signup' })}
                >
                  Sign Up
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Sign up CTA for guests.

            ROUND 283: NOT ON THE HOME PAGE. This strip runs sitewide, and on
            the home page it was the third account ask inside three hundred
            vertical pixels: the nav's Sign Up, then this, then the hero's own.
            Measured on a 390 by 844 phone, the first game tile sat at y=478,
            past halfway down the only screen most visitors ever see, on a site
            whose whole pitch is that it needs no account. Somewhere on a game
            page this line earns its space, because by then a person has a score
            worth saving. Above the game list, before they have played anything,
            it is a toll booth in front of a free car park. The hero says the
            same thing in one line now, so nothing is lost by suppressing it
            here. Guarded by scripts/playHomeFold.mjs. */}
        {!loading && !user && !isHome && (
          <div className="bg-primary/5 border-t border-primary/10 py-2 px-4 text-center">
            <p className="text-xs text-muted-foreground">
              <span className="text-primary font-medium">Create a free account</span> to save your scores and track your streak! 🔥
            </p>
          </div>
        )}
      </header>

      <AuthModal
        isOpen={authModal.open}
        onClose={() => setAuthModal({ ...authModal, open: false })}
        defaultTab={authModal.tab}
      />
    </>
  );
}
