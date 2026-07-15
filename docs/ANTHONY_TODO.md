# Anthony TODO — updated 2026-07-10 ~2:30am by overnight autopilot

## Nothing is blocking. Everything below is optional/awareness.

1. EIGHT pushes shipped overnight — see docs/SESSION_2026-07-10.md for the
   full list. Two brand-new games (Dart Draft, Blind Rank), Sign the Player
   rebuilt as the box2box auction, Squad Deal reworked, Transfer Path data
   purged against the real teammate graph, WC bracket corrected, NBA Conquest
   map fixed. Pushes 6-8 may still need one Publish click if the overnight
   deploy didn\'t catch them — check douknowball.com/sign-the-player: if it
   still shows the value-guessing game, tell Claude "publish" (or hit Publish
   in Lovable).
2. The Gemini free key works but its daily quota runs out by evening — grids
   then accept answers unverified until midnight PT. If you want validation
   24/7: either add a second free key from another Google account (tell
   Claude, the shim can rotate keys) or we build the validation-cache table
   (queued item 7).
3. The 9:07am daily poll-fixer task runs only while the Claude Cowork app is
   open on this PC. Leave it open in the morning through the World Cup final
   (Jul 19) and the polls maintain themselves.
4. PUSH_LIVE.bat in the repo root is the one-click "send Claude\'s committed
   work to GitHub" button. Claude runs it itself when you\'re around to
   approve screen control; double-click it yourself anytime.

## URGENT: Turn Google login on (5 minutes, only you can do this)
Google sign-in was broken at the root: the old code went through Lovable's auth gateway, which issues tokens for the deleted backend project. I rewrote it to use Supabase directly, but the Google provider is switched OFF in the live project, and turning it on needs YOUR Google account:

1. Go to https://console.cloud.google.com/apis/credentials (any Google account works, use your main one).
2. Create a project if asked, then: Create Credentials > OAuth client ID > Web application.
   - If it asks you to configure the consent screen first: External, app name DoUKnowBall, add your email, save through the steps.
3. Authorized JavaScript origins: add `https://douknowball.com` and `https://flawuiqbvjobmkfkauhw.supabase.co`
4. Authorized redirect URIs: add exactly `https://flawuiqbvjobmkfkauhw.supabase.co/auth/v1/callback`
5. Copy the Client ID and Client Secret it gives you.
6. Go to https://supabase.com/dashboard/project/flawuiqbvjobmkfkauhw/auth/providers > Google > toggle ON > paste Client ID + Secret > Save.

The moment you hit Save, the Google button on the site starts working. Zero code changes needed. Until then, email + password sign-up works today (I fixed the missing database trigger that was silently breaking account profiles).

Also worth 2 minutes while you are in there: Authentication > URL Configuration > set Site URL to `https://douknowball.com` and add it to Redirect URLs. That makes sure email confirmation links land on your domain.
