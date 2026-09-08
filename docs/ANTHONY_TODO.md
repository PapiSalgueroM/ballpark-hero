# Anthony TODO, updated 2026-09-07

## Nothing is blocking. Everything below is optional/awareness.

1. EIGHT pushes shipped overnight — see docs/SESSION_2026-07-10.md for the
   full list. Two brand-new games (Dart Draft, Blind Rank), Sign the Player
   rebuilt as the box2box auction, Squad Deal reworked, Transfer Path data
   purged against the real teammate graph, WC bracket corrected, NBA Conquest
   map fixed. Pushes 6-8 may still need one Publish click if the overnight
   deploy didn\'t catch them — check douknowball.com/sign-the-player: if it
   still shows the value-guessing game, tell Claude "publish" (or hit Publish
   in Lovable).
2. UPDATE 2026-07-22: the "grids accept answers unverified" hole is CLOSED.
   All grid/connect4/chain validators now FAIL CLOSED — when the Gemini quota
   is out they refuse the answer with "couldn't verify, try again" instead of
   accepting nonsense, and the player doesn't lose a guess. The verified-verdict
   cache table is live too, so repeat answers don't burn quota. Remaining ask:
   with the quota exhausted, AI-backed games can't accept NEW answers until
   the quota resets — so validation 24/7 still needs a second free Gemini key
   from another Google account (tell Claude; the shim can rotate keys).
   Also 2 minutes while in Supabase: Authentication > Settings > enable
   "Leaked password protection" (security advisor flags it; free toggle).
3. The 9:07am daily poll-fixer task runs only while the Claude Cowork app is
   open on this PC. Leave it open in the morning through the World Cup final
   (Jul 19) and the polls maintain themselves.
4. PUSH_LIVE.bat in the repo root is the one-click "send Claude\'s committed
   work to GitHub" button. Claude runs it itself when you\'re around to
   approve screen control; double-click it yourself anytime.

## Google login branding, one outside dashboard step left

Google's provider remains configured, but Round 509 keeps the public button hidden until the
branding below is clean. Its tested replacement removes the hosted Supabase redirect and uses
Google's official popup directly on `douknowball.com`, so no paid custom auth domain is needed.
The live OAuth client already authorizes the site origin and the real button rendered cleanly.

The remaining personal email in Google's Developer Information box is controlled only by the
Google Auth Platform Branding page for the existing `DoUKnowBall Web` client:

1. Set App name to `DoUKnowBall`.
2. Set User support email and Developer contact to `douknowball1@gmail.com`.
3. Set Homepage to `https://douknowball.com`, Privacy to `https://douknowball.com/privacy`,
   Terms to `https://douknowball.com/terms`, and Authorized domain to `douknowball.com`.
4. Use the existing square site icon, publish the branding, and submit brand verification.

Leave the current Supabase Google provider enabled. No client secret belongs in this repo or in
a chat.
