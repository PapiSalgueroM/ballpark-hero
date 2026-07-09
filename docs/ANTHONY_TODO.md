# Anthony TODO — the short list (updated 2026-07-08 night session)

## ⭐ THE ONE BIG UNLOCK — add a free GEMINI_API_KEY (5 minutes)

Every AI-validated game (Soccer Grid, Pro Football Grid, both Connect 4s, Build-Your-XI
evaluation, NBA Starting 5 evaluation, chain validators, season simulators) has been
failing with "validation error" because they all call the **Lovable AI gateway, and the
Lovable workspace has 0 credits**. That is the root cause of most "the game doesn't work"
bugs — not the game code.

Fix (free, no card needed):
1. Go to https://aistudio.google.com/apikey (sign in with any Google account) → **Create API key**. Copy it.
2. Supabase dashboard → project `flawuiqbvjobmkfkauhw` → **Edge Functions → Manage secrets**
   → Add secret: name `GEMINI_API_KEY`, value = the key you copied. Save.
3. That's it. `soccer-grid-validate` and `football-grid-validate` are already deployed to
   prefer that key (Google's free tier: ~1,500 requests/day). Tell Claude "the Gemini key
   is in" and the remaining 15 functions get the same 3-line shim + redeploy in minutes.

Also fixed tonight regardless of the key: the deployed `soccer-grid-validate` was
literally running **NBA Connect-4's code** (wrong slug from the 7/6 redeploy), which is
why every Soccer Grid guess — including Maradona/Napoli/Argentina — insta-failed. The
correct soccer validator is redeployed (v4).

## 2. Publish tonight's work

Double-click **PUBLISH_GAMES.bat** (it's preloaded with tonight's file list and commit
message). Wait ~2 min for Lovable to rebuild the preview, then either tell Claude
"deploy" or hit Publish in the Lovable editor. douknowball.com does NOT update without
this last step.

## 3. Local repo note (cosmetic)

A sandbox crash mid-session truncated some LOCAL working copies. All of `src/` and
`supabase/` were restored byte-for-byte from git; `docs/`, `README.md`, `bun.lock` and
`pzzad-resync/` may still be truncated ON YOUR DISK ONLY (GitHub copies are intact and
none of them are in the publish list, so nothing bad can ship). To clean up, run in any
terminal inside the repo: `git restore docs pzzad-resync README.md bun.lock`

## 4. Older items still open

- NASCAR Driver / Tennis Player tables: if those games say "no players available",
  `nascar_drivers` (0 rows?) / `tennis_players` (106 rows — OK) need seeding. Say the
  word and Claude drafts fact-checked inserts.
- Lovable credits: entirely optional now — the Gemini key replaces the need.
