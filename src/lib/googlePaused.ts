/**
 * Round 610: the way back in for players who joined with Google.
 *
 * Round 509 hid the Google button until its Cloud Branding stops showing a
 * personal support email (src/lib/authProviders.ts). An account made with
 * Google has no password, so once its session ends (a sign out, a new device,
 * cleared storage) the only door left is Forgot password, and nothing on the
 * site said so. Measured 2026-09-15 on the live auth tables: 244 accounts with
 * a Google identity and no password, 0 of them had ever asked for a reset
 * link, and 0 had signed in fresh since the button went on 2026-09-08. The 3
 * Google accounts that did have a password had all signed in since, so the
 * password route works for them; the recovery endpoint does not check how an
 * account was made. No auth email of any kind has gone out since 2026-08-12
 * (confirmation emails before then were clicked by real players within two
 * hours), so a signed in player is sent to the change password page, which
 * needs no email, and the email link is the route for everyone else.
 *
 * Everything here is gated on the Google flag by its callers, so it goes
 * quiet on its own the day Google comes back.
 */
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

/** Written to user_metadata when a password is saved on /reset-password, so
 *  the account menu stops offering to set one. */
export const PASSWORD_SET_FLAG = 'password_set';

interface AccountShape {
  identities?: { provider: string }[] | null;
  app_metadata?: { providers?: unknown } | null;
  user_metadata?: Record<string, unknown> | null;
}

/** An account that can only get in through Google: it has a Google identity,
 *  no email identity, and has not saved a password here. The identities list
 *  on the stored user is read when it is there; otherwise
 *  app_metadata.providers on the same object, which matched the identities on
 *  all 255 Google accounts measured on 2026-09-15. */
export function isGoogleOnlyAccount(user: AccountShape | null | undefined): boolean {
  if (!user) return false;
  const fromToken = Array.isArray(user.app_metadata?.providers) ? (user.app_metadata?.providers as unknown[]).map(String) : [];
  const providers = user.identities && user.identities.length > 0 ? user.identities.map(i => i.provider) : fromToken;
  if (!providers.includes('google') || providers.includes('email')) return false;
  return user.user_metadata?.[PASSWORD_SET_FLAG] !== true;
}

/** Send the set-a-password link to an address, with the same three outcomes
 *  the sign in modal has always shown. */
export async function sendPasswordLink(email: string): Promise<boolean> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      const rateLimited = /rate limit|too many/i.test(error.message);
      toast.error(rateLimited ? 'Too many emails going out right now. Give it an hour and try again.' : error.message);
      return false;
    }
    toast.success('Reset link sent! Check your inbox (and spam) for an email from Supabase.');
    return true;
  } catch {
    toast.error('Could not send the reset email. Check your connection and try again.');
    return false;
  }
}
