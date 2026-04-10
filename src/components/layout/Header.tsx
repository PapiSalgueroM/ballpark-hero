import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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

export function Header() {
  const { user, profile, loading, signOut } = useAuth();
  const [authModal, setAuthModal] = useState<{ open: boolean; tab: 'login' | 'signup' }>({
    open: false,
    tab: 'login',
  });
  const navigate = useNavigate();

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
        <div className="container flex h-14 max-w-4xl items-center justify-between px-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <span className="font-display font-bold text-xl text-primary">DoUKnowBall</span>
          </Link>

          {/* Auth Section */}
          <div className="flex items-center gap-3">
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            ) : user ? (
              <>
                {/* Streak Display */}
                {profile && profile.current_streak > 0 && (
                  <div className="flex items-center gap-1 text-sm font-medium">
                    <Flame className="w-4 h-4 text-orange-500" />
                    <span>{profile.current_streak}</span>
                    {profile.streak_freezes > 0 && (
                      <span className="text-sm" title="Streak Freeze available">🛡️{profile.streak_freezes}</span>
                    )}
                  </div>
                )}

                {/* User Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="relative h-9 w-9 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      <span className="font-semibold text-sm">{getUserInitial()}</span>
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

        {/* Sign up CTA for guests */}
        {!loading && !user && (
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
