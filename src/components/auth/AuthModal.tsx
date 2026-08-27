import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { OAUTH_PROVIDERS, ANY_OAUTH_ENABLED } from '@/lib/authProviders';
import { toast } from 'sonner';
import { Loader2, AlertCircle } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'login' | 'signup';
}

/** Minimum password length. Matches the Input's existing minLength={6} and Supabase project's default minimum. */
const MIN_PASSWORD_LENGTH = 6;

/** Deliberately simple, permissive shape check (not a full RFC 5322 parser): local@domain.tld, no spaces. Good enough to catch typos before they become a confusing round trip to Supabase. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FieldErrors {
  email?: string;
  password?: string;
}

/**
 * Field-level validation shown before submit (#98). Returns an errors object
 * with only the fields that are actually invalid; an empty object means the
 * form is valid to submit. Never silently rejects: every failure path here
 * has a corresponding message rendered under the field.
 */
function validate(email: string, password: string): FieldErrors {
  const errors: FieldErrors = {};

  if (!email.trim()) {
    errors.email = 'Email is required';
  } else if (!EMAIL_PATTERN.test(email.trim())) {
    errors.email = 'Enter a valid email address';
  }

  if (!password) {
    errors.password = 'Password is required';
  } else if (password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }

  return errors;
}

/**
 * Supabase auth errors come back as terse API strings ("Invalid login
 * credentials", "User already registered", etc.). Most are already readable
 * enough to show directly, but a couple of the common ones read better
 * rephrased for a non-technical player. Unknown messages pass through
 * unchanged rather than being swallowed, per "never silently reject."
 */
function readableAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('invalid login credentials')) {
    return 'Incorrect email or password. Double-check and try again.';
  }
  if (lower.includes('user already registered')) {
    return 'An account with this email already exists. Try logging in instead.';
  }
  if (lower.includes('email not confirmed')) {
    return 'Please confirm your email before logging in. Check your inbox for the confirmation link.';
  }
  if (lower.includes('password should be at least')) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  return message;
}

export function AuthModal({ isOpen, onClose, defaultTab = 'login' }: AuthModalProps) {
  const [tab, setTab] = useState<'login' | 'signup'>(defaultTab);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  /* Round 304: the COPPA soft policy becomes an affirmation at the door.
     The games all play without an account; the account is the one feature
     that collects an email, so it is the one place to ask. */
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const { signIn, signUp } = useAuth();

  // Re-validates a single field on the fly once the form has been submitted
  // once (touched), so the player gets immediate feedback while fixing a
  // mistake instead of only finding out again on the next submit attempt.
  const [touched, setTouched] = useState(false);

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (touched) setFieldErrors(prev => ({ ...prev, email: validate(value, password).email }));
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (touched) setFieldErrors(prev => ({ ...prev, password: validate(email, value).password }));
  };

  /* Round 88, straight off his guest-browser test: this modal never unmounts
     (the Dialog just hides it), so useState(defaultTab) only ever read the
     FIRST value it was given. Click Sign up and you got "Welcome Back!";
     switch to signup, close, click Log in and you got "Join DoUKnowBall".
     The tab now re-syncs to whatever the button asked for every time the
     modal opens, and a stale half-typed form never carries over either. */
  useEffect(() => {
    if (!isOpen) return;
    setTab(defaultTab);
    setFieldErrors({});
    setFormError(null);
    setTouched(false);
  }, [isOpen, defaultTab]);

  const switchTab = (next: 'login' | 'signup') => {
    setTab(next);
    // Clear stale errors from the previous tab's attempt so switching
    // login <-> signup never shows a leftover error for a form the player
    // hasn't touched yet in this mode.
    setFieldErrors({});
    setFormError(null);
    setTouched(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setTouched(true);

    const errors = validate(email, password);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return; // Field-level messages are already visible; no toast needed for this case.
    }
    if (tab === 'signup' && !ageConfirmed) {
      setFormError('Tick the box confirming you are 13 or older to create an account. Every game plays without one.');
      return;
    }

    setLoading(true);
    try {
      if (tab === 'login') {
        const { error } = await signIn(email.trim(), password);
        if (error) {
          const readable = readableAuthError(error.message);
          setFormError(readable);
          toast.error(readable);
        } else {
          toast.success('Welcome back!');
          onClose();
        }
      } else {
        const { error, session } = await signUp(email.trim(), password);
        if (error) {
          const readable = readableAuthError(error.message);
          setFormError(readable);
          toast.error(readable);
        } else if (session) {
          // Email confirmation is off, so the account is live and the player
          // is already signed in. No inbox round trip.
          toast.success("Account created! You're in.");
          onClose();
        } else {
          // Fallback for the (config-dependent) case where Supabase still
          // wants the email confirmed before the first sign-in.
          toast.success('Almost done! Check your email to confirm your account.');
          onClose();
        }
      }
    } catch (err) {
      // Belt-and-suspenders: signIn/signUp already return { error } rather
      // than throwing, but if something upstream ever does throw (network
      // failure before Supabase responds, etc.), surface it instead of
      // failing silently.
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setFormError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    // Native Supabase OAuth. The old path went through the Lovable auth
    // gateway, which mints tokens for a retired backend project, so the
    // session it produced was always rejected and nobody could ever
    // actually sign in with Google. This goes straight to Supabase; when
    // the Google provider is switched on in the dashboard it works with
    // no further code changes.
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      const providerOff = /not enabled|unsupported provider/i.test(error.message);
      toast.error(
        providerOff
          ? 'Google sign-in is getting an upgrade. Use email + password for now, it takes 10 seconds.'
          : 'Could not start Google sign-in. Try email + password instead.'
      );
      setGoogleLoading(false);
    }
    // On success the browser redirects to Google, so leave the spinner on.
  };

  const handleAppleSignIn = async () => {
    setAppleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      const providerOff = /not enabled|unsupported provider/i.test(error.message);
      toast.error(
        providerOff
          ? 'Apple sign-in is getting an upgrade. Use email + password for now, it takes 10 seconds.'
          : 'Could not start Apple sign-in. Try email + password instead.'
      );
      setAppleLoading(false);
    }
    // On success the browser redirects to Apple, so leave the spinner on.
  };

  /**
   * "Forgot password?" (#login-recovery). Sends the Supabase reset email
   * pointed at /reset-password. Needs a valid email in the field first so we
   * never fire a reset for a blank/typo'd address.
   */
  const handleForgotPassword = async () => {
    const emailIssue = validate(email, 'x'.repeat(MIN_PASSWORD_LENGTH)).email;
    if (emailIssue) {
      setTouched(true);
      setFieldErrors(prev => ({ ...prev, email: email.trim() ? emailIssue : 'Type your email above first, then tap Forgot password' }));
      return;
    }
    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        const rateLimited = /rate limit|too many/i.test(error.message);
        toast.error(
          rateLimited
            ? 'Too many emails going out right now. Give it an hour and try again.'
            : readableAuthError(error.message)
        );
      } else {
        toast.success('Reset link sent! Check your inbox (and spam) for an email from Supabase.');
      }
    } catch {
      toast.error('Could not send the reset email. Check your connection and try again.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center font-display text-2xl">
            {tab === 'login' ? 'Welcome Back!' : 'Join DoUKnowBall'}
          </DialogTitle>
        </DialogHeader>

        <p className="text-center text-sm text-muted-foreground -mt-2">
          {tab === 'login'
            ? 'Good to see you again. Log in and pick your streak back up.'
            : "First time here? It's free and takes 10 seconds. Streaks, points and world rank only count once you have an account."}
        </p>

        <div className="space-y-4 py-4">
          {/* Social sign-in buttons only render for providers that are
              actually switched on in Supabase (see src/lib/authProviders.ts).
              A button for an unconfigured provider hard-redirects the whole
              page to a raw JSON error, so hidden > broken. */}
          {OAUTH_PROVIDERS.google && (
          <Button
            variant="outline"
            className="w-full h-12 text-base gap-3"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || appleLoading}
          >
            {googleLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            )}
            Continue with Google
          </Button>
          )}

          {OAUTH_PROVIDERS.apple && (
          <Button
            variant="outline"
            className="w-full h-12 text-base gap-3"
            onClick={handleAppleSignIn}
            disabled={appleLoading || googleLoading}
          >
            {appleLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.08zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"
                />
              </svg>
            )}
            Continue with Apple
          </Button>
          )}

          {ANY_OAUTH_ENABLED && (
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with email
              </span>
            </div>
          </div>
          )}

          {/* Email/Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                aria-invalid={!!fieldErrors.email}
                aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                className={fieldErrors.email ? 'border-destructive focus-visible:ring-destructive' : undefined}
              />
              {fieldErrors.email && (
                <p id="email-error" className="flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {fieldErrors.email}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                aria-invalid={!!fieldErrors.password}
                aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                className={fieldErrors.password ? 'border-destructive focus-visible:ring-destructive' : undefined}
              />
              {fieldErrors.password && (
                <p id="password-error" className="flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {fieldErrors.password}
                </p>
              )}
              {tab === 'signup' && !fieldErrors.password && (
                <p className="text-xs text-muted-foreground">At least {MIN_PASSWORD_LENGTH} characters</p>
              )}
              {tab === 'login' && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={resetLoading}
                    className="text-xs text-primary hover:underline disabled:opacity-60"
                  >
                    {resetLoading ? 'Sending reset link...' : 'Forgot password?'}
                  </button>
                </div>
              )}
            </div>
            {tab === 'signup' && (
              <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={ageConfirmed}
                  onChange={e => setAgeConfirmed(e.target.checked)}
                  className="mt-0.5 accent-primary"
                />
                <span>
                  I am 13 or older, and I agree to the{' '}
                  <Link to="/terms" onClick={onClose} className="underline hover:text-foreground">Terms</Link> and{' '}
                  <Link to="/privacy" onClick={onClose} className="underline hover:text-foreground">Privacy Policy</Link>.
                </span>
              </label>
            )}
            {formError && (
              <p className="flex items-start gap-1.5 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {formError}
              </p>
            )}
            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : tab === 'login' ? (
                'Sign In'
              ) : (
                'Create Account'
              )}
            </Button>
          </form>

          {/* Toggle between login/signup */}
          <p className="text-center text-sm text-muted-foreground">
            {tab === 'login' ? (
              <>
                Don't have an account?{' '}
                <button
                  type="button"
                  className="text-primary hover:underline font-medium"
                  onClick={() => switchTab('signup')}
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  className="text-primary hover:underline font-medium"
                  onClick={() => switchTab('login')}
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
