/**
 * Social login switchboard.
 *
 * A provider button only renders when its flag here is true, and a flag must
 * only be flipped to true AFTER the provider is fully configured in the
 * Supabase dashboard (Authentication -> Sign In / Providers). Flipping a flag
 * with the provider still off in Supabase recreates the exact bug this file
 * exists to prevent: the button redirects the whole browser to
 * {SUPABASE_URL}/auth/v1/authorize, Supabase answers with a raw JSON 400
 * ("Unsupported provider: provider is not enabled"), and the player is
 * stranded on an error page with no way back.
 *
 * google: needs a Google Cloud OAuth client (which itself requires 2-Step
 *   Verification on the owner's Google account) with redirect URI
 *   https://flawuiqbvjobmkfkauhw.supabase.co/auth/v1/callback, then client ID
 *   + secret pasted into the Supabase Google provider and enabled.
 * apple: needs a paid Apple Developer account ($99/yr), a Services ID and
 *   key configured in Supabase. Parked until the owner decides to pay.
 */
export const OAUTH_PROVIDERS = {
  // Enabled 2026-08-12: Google Cloud OAuth client "DoUKnowBall Web" +
  // Supabase Google provider are both configured and live.
  google: true,
  apple: false,
} as const;

export const ANY_OAUTH_ENABLED = Object.values(OAUTH_PROVIDERS).some(Boolean);
