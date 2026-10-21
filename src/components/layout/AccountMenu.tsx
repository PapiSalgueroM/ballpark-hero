import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User, BarChart3, LogOut, KeyRound } from 'lucide-react';

export interface AccountMenuProps {
  displayName?: string | null;
  email?: string;
  username?: string | null;
  initial: string;
  offerPassword: boolean;
  onSignOut: () => Promise<void>;
}

export function AccountMenu({ displayName, email, username, initial, offerPassword, onSignOut }: AccountMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          /* Round 306: below the sm breakpoint the name span hides
             and this button's only content is a single initial. */
          aria-label="Account menu"
          className="flex items-center gap-2 h-9 pl-3 pr-1 rounded-full hover:bg-accent"
        >
          <span className="hidden sm:inline max-w-[120px] truncate text-sm font-medium">
            {displayName || email?.split('@')[0]}
          </span>
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-sm">
            {initial}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium">
            {displayName || email}
          </p>
          {username && (
            <p className="text-xs text-muted-foreground">@{username}</p>
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
        {/* Round 610: a Google-only account has no password while
            Google sign in is paused, so it offers one before the
            session that is keeping this player in runs out. It
            goes straight to the change password page, which needs
            no email: the 3 Google accounts that had set a password
            by 2026-09-15 had never been sent one. */}
        {offerPassword && (
          <DropdownMenuItem asChild>
            <Link to="/reset-password" data-set-password className="cursor-pointer flex-col items-start gap-0.5">
              <span className="flex items-center">
                <KeyRound className="mr-2 h-4 w-4" />
                Set a password
              </span>
              <span className="pl-6 text-xs text-muted-foreground">
                Google sign in is paused. A password means you can always log back in.
              </span>
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onSignOut} className="cursor-pointer">
          <LogOut className="mr-2 h-4 w-4" />
          Log Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
