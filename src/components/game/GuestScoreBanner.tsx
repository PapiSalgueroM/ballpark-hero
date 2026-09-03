import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AuthModal } from '@/components/auth/AuthModal';
import { useAuth } from '@/contexts/AuthContext';
import { Flame } from 'lucide-react';

interface GuestScoreBannerProps {
  score: number;
}

export function GuestScoreBanner({ score }: GuestScoreBannerProps) {
  const { user } = useAuth();
  const [authModal, setAuthModal] = useState<{ open: boolean; tab: 'login' | 'signup' }>({
    open: false,
    tab: 'signup',
  });

  if (user) return null;

  return (
    <>
      <div className="mt-4 p-4 rounded-xl border border-primary/20 bg-primary/5 text-center">
        <p className="text-lg font-medium mb-2">
          You scored <span className="text-primary font-bold">{score}</span>! 🎉
        </p>
        <p className="text-sm text-muted-foreground mb-3">
          Create an account to keep your leaderboard name and save your streaks across devices. <Flame className="inline w-4 h-4 text-orange-500" />
        </p>
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
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
        </div>
      </div>

      <AuthModal
        isOpen={authModal.open}
        onClose={() => setAuthModal({ ...authModal, open: false })}
        defaultTab={authModal.tab}
      />
    </>
  );
}
