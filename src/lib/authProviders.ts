/**
 * Social login switchboard.
 *
 * A provider button only renders when its flag here is true, and a flag must
 * only be flipped to true AFTER the provider is fully configured in its
 * dashboard and its public branding is safe to show. Flipping a flag with the
 * provider still off in Supabase recreates the exact bug this file
 * exists to prevent: the button redirects the whole browser to
 * {SUPABASE_URL}/auth/v1/authorize, Supabase answers with a raw JSON 400
 * ("Unsupported provider: provider is not enabled"), and the player is
 * stranded on an error page with no way back.
 *
 * google: uses Google's official popup button and exchanges its ID token with
 *   Supabase. The browser carries only the public web client ID. Provider
 *   credentials stay in their dashboards and never belong in this repo.
 * apple: needs a paid Apple Developer account ($99/yr), a Services ID and
 *   key configured in Supabase. Parked until the owner decides to pay.
 */
export const OAUTH_PROVIDERS = {
  // The provider works, but Google Cloud Branding still exposes the owner's
  // personal support email. Keep the public button hidden until that is fixed.
  google: false,
  apple: false,
} as const;

export const ANY_OAUTH_ENABLED = Object.values(OAUTH_PROVIDERS).some(Boolean);
