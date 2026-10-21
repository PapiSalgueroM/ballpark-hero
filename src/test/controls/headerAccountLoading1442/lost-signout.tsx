import { useEffect, useState, type ComponentType } from 'react';
import { LogoMark } from '@/components/layout/Logo';
import { Link, useNavigate } from 'react-router-dom';
import { useRoutePath } from '@/hooks/useRoutePath';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { AuthModal } from '@/components/auth/AuthModal';
import type { AccountMenuProps } from '@/components/layout/AccountMenu';
import { Flame, Loader2 } from 'lucide-react';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { SoundToggle } from '@/components/game/SoundToggle';
import { useStreaks } from '@/hooks/useStreaks';
import { OAUTH_PROVIDERS } from '@/lib/authProviders';
import { isGoogleOnlyAccount } from '@/lib/googlePaused';

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
  const [AccountMenu, setAccountMenu] = useState<ComponentType<AccountMenuProps> | null>(null);
  const [accountMenuFailed, setAccountMenuFailed] = useState(false);
  useEffect(() => {
    if (!user || AccountMenu || accountMenuFailed) return;
    let active = true;
    import('@/components/layout/AccountMenu').then(
      module => { if (active) setAccountMenu(() => module.AccountMenu); },
      () => { if (active) setAccountMenuFailed(true); },
    );
    return () => { active = false; };
  }, [user?.id, AccountMenu, accountMenuFailed]);
  const navigate = useNavigate();
  /* Round 283: the guest sign up strip below is suppressed on the home page.
     See the comment at that block for the measurement behind it. */
  const isHome = useRoutePath() === '/';

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
      <header data-site-chrome="" className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        {/* Round 117: px-3 and gap-2 below sm. The wordmark is 2xl and Log In
            plus Sign Up are both whitespace-nowrap, so on a 320px phone the row
            could not fit and Sign Up hung 9px off the right edge, taking seven
            game pages and the homepage with it. Tightening the padding and the
            gap only below sm buys back 12px and nothing above 640 moves. */}
        {/* Round 658: the home page runs wider (max-w-6xl) for the Main
            Event band and the four column game grid, so the bar follows it
            there and only there, keeping the logo over the page's own left
            edge. Every other Header route keeps the narrower column. */}
        <div className={`container flex h-14 ${isHome ? 'max-w-6xl' : 'max-w-4xl'} items-center justify-between px-3 sm:px-4`}>
          {/* Logo */}
          {/* Round 286: the mark, drawn inline from the same geometry as the
              favicon and the social image, then the wordmark in the display
              face. The mark is aria-hidden; the link's name is the word. */}
          {/* Round 320: Round 117 got this row to fit a 320px phone exactly,
              then Round 286's mark added 36px back and Sign Up hung 37px off
              the right edge on every Header route, measured by the mobile
              sweep. Two layers of fix. Structural: the link can shrink and
              the wordmark truncates, so NOTHING in this row can push past the
              screen edge again whatever gets added next. Cosmetic, so the
              structural layer never actually fires: below 480px the wordmark
              runs at lg with normal tracking and the two auth buttons drop to
              px-2, and below 360px the mark sits out as well. The widest row
              this header can be handed is a streaked guest (flame, count, Log
              In, Sign Up all at once), and that row measures 347px at its
              worst, so the full word stays on screen from 360 up with the
              mark and from 320 up without it. The old 2xl-on-every-phone
              wordmark never actually fit that row at 390, it just hung off
              the edge where the streakless sweeps could not see it. */}
          {/* py-1.5 keeps the link a real thumb target now that the wordmark
              runs smaller on phones; playIphone section 3 holds the floor. */}
          <Link to="/" className="flex min-w-0 items-center gap-2 py-1.5">
            <LogoMark size={28} className="shrink-0 hidden min-[360px]:block sm:hidden" />
            <LogoMark size={32} className="shrink-0 hidden sm:block" />
            <span className="font-display font-black text-lg min-[480px]:text-2xl sm:text-3xl tracking-normal min-[480px]:tracking-wide text-primary truncate">DoUKnowBall</span>
          </Link>

          {/* Auth Section. Below 360 the gaps close up one more step: with a
              three digit streak on the flame the cluster measured 187.5px and
              left the wordmark 5.5px short of whole, so the two gaps and the
              button padding each give a little back. */}
          <div className="flex shrink-0 items-center gap-1 min-[360px]:gap-2 sm:gap-3">
            {/* Round 347: sm and up only. The worst guest row already measures
                347px at 360 (Round 320), so phones get the footer toggle. */}
            <ThemeToggle variant="header" />
            {/* Round 1132: the sound switch, sm and up only for the same reason as the toggle above;
                phones get the footer one. Its own box is 44 px inside this 56 px bar. */}
            <SoundToggle variant="icon" className="hidden sm:inline-flex" />
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
                {AccountMenu ? (
                  <AccountMenu
                    displayName={profile?.display_name}
                    email={user.email}
                    username={profile?.username}
                    initial={getUserInitial()}
                    offerPassword={!OAUTH_PROVIDERS.google && isGoogleOnlyAccount(user)}
                    onSignOut={handleSignOut}
                  />
                ) : accountMenuFailed ? (
                  <Button variant="ghost" size="sm" onClick={() => {}}>Log Out</Button>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      aria-label="Account menu"
                      disabled
                      className="flex items-center gap-2 h-9 pl-3 pr-1 rounded-full hover:bg-accent"
                    >
                      <span className="hidden sm:inline max-w-[120px] truncate text-sm font-medium">
                        {profile?.display_name || user.email?.split('@')[0]}
                      </span>
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-sm">
                        {getUserInitial()}
                      </span>
                    </Button>
                    <span role="status" className="sr-only">Loading account menu...</span>
                  </>
                )}
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="max-[479px]:px-2 max-[359px]:px-1.5"
                  onClick={() => setAuthModal({ open: true, tab: 'login' })}
                >
                  Log In
                </Button>
                <Button
                  size="sm"
                  className="max-[479px]:px-2 max-[359px]:px-1.5"
                  onClick={() => setAuthModal({ open: true, tab: 'signup' })}
                >
                  Sign Up
                </Button>
              </>
            )}
          </div>
        </div>

        {user && accountMenuFailed && (
          <p role="alert" className="px-4 py-2 text-center text-xs text-muted-foreground">Account menu could not load. You can still log out.</p>
        )}

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
              <span className="text-primary font-medium">Create a free account</span> to save your scores and track your streak! <span aria-hidden="true">🔥</span>
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
