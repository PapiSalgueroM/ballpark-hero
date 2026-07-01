# Post-publish smoke test (5 minutes)

Run after every publish. Remember the two-step ship: PUBLISH_GAMES.bat pushes and rebuilds the PREVIEW; douknowball.com only updates after the Lovable publish step (MCP deploy_project or the editor Publish button).

1. Hard refresh douknowball.com (Ctrl+Shift+R). Header should show the current game count.
2. Login probe: open Log In, enter a fake email and password, submit. PASS = "Invalid login credentials" toast. FAIL = "failed to fetch" (connection broken; check which supabase URL the network tab shows; it must be flawuiqbvjobmkfkauhw).
3. Open one DB game per sport, confirm real data renders, no black screen:
   - /transfer-path (soccer, also proves puzzle pool)
   - /perfect-season-mlb (baseball, spin once; players and ratings must appear)
   - /guess-cbb-team (college, pick Daily; programs must load)
4. Open a validation game (/build-your-5 or NBA lineup) and type 3 letters in the player box. PASS = suggestions appear (edge functions healthy).
5. A black page on one route = React error #310 pattern: some component early-returns above its hooks. Check the console, find the component, move the loading return below every hook.
6. Check the console for red errors on the homepage. The only acceptable noise is ad-network chatter.

Known-good state (2026-07-01): commit 94ea07e published, 54 games, login verified, 22 edge functions ACTIVE on flawuiqbvjobmkfkauhw, transfer_path_puzzles at 970 rows, ballon_dor at 76 rows.
