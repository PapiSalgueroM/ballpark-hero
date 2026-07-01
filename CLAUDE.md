# DoUKnowBall (ballpark-hero)

Sports-trivia web app. Live at https://douknowball.com (Lovable preview: https://ballpark-hero.lovable.app).

## Stack
- React + TypeScript + Vite, Tailwind + shadcn/ui
- Supabase (Postgres) — project ref `flawuiqbvjobmkfkauhw`
- Built on Lovable; GitHub repo `PapiSalgueroM/ballpark-hero` (public). Lovable GitHub-sync is ON, so pushing to `main` auto-deploys.

## Repo layout
- `src/pages/` — one component per game/screen, routed in `src/App.tsx`
- `src/data/gameRegistry.ts` — game catalog (`CATEGORIES` -> `GameDef { path, label, emoji, description, daily?, isNew? }`). Soccer is ordered first.
- `src/components/game/` — shared UI (GameNav, GameNavbar with Home + Back, Footer, ShareButtons, etc.)
- `src/components/seo/GameSeoContent.tsx` — bottom-of-page SEO block (title + description only; the duplicated "How to Play" list was removed)
- `src/hooks/`, `src/lib/`, `src/types/` — game logic, helpers, shared types
- `src/integrations/supabase/client.ts` — Supabase client. Hardcodes (and exports) the live project URL + public anon key. It deliberately ignores VITE_ env vars because Lovable's build injects values pointing at a deleted project.
- Flagship "Squad Deal" pattern = page (`src/pages/SquadDeal.tsx`) + hook (`src/hooks/useSquadDeal.ts`) + lib (`src/lib/squadDeal.ts`: `FORMATIONS`, `EXTRAS`, `playerRating`)

## Adding a game
1. Create `src/pages/<Game>.tsx` (+ hook/lib as needed).
2. Register a route in `src/App.tsx`.
3. Add a `GameDef` entry under the right category in `src/data/gameRegistry.ts`.

## Publishing (free-plan — do NOT use the Lovable AI agent)
The Lovable workspace is free-plan with 0 credits, so never drive builds through Lovable's agent. To ship:
1. Edit the source files directly in the repo.
2. List the changed files in the `git add` line of `PUBLISH_GAMES.bat`, and put a one-line commit message in `_commit_msg.txt`.
3. Run `PUBLISH_GAMES.bat` — it commits exactly those files and pushes to GitHub. Lovable syncs the commit and rebuilds the PREVIEW in ~1-2 min.
4. CRITICAL FINAL STEP: pushing only updates the Lovable preview. douknowball.com serves the PUBLISHED snapshot, which does NOT update until you publish. Trigger it with the Lovable MCP `deploy_project` tool (project id c29d224f-a662-4a15-b809-d86fa3b3f0ad) or the Publish button in the Lovable editor. Skipping this step is why the live site once served a June build for weeks while GitHub was up to date.

Note: the publish script uses an explicit file list (not `git add -A`) so untracked files like `.env` are never committed. It does not `git reset --hard`, so local edits are preserved.

## Hard-won gotchas (July 2026 incident)
- The Lovable build injects VITE_SUPABASE_* env vars that point at a DELETED project (pzzadswiradjnvvfybol). Never read those env vars. `client.ts` hardcodes the live project URL + anon key on purpose, and all edge-function fetches use the same hardcoded values. If you add code that calls Supabase, import SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY from `@/integrations/supabase/client`.
- All 22 edge functions are deployed on flawuiqbvjobmkfkauhw (deployed 2026-07-01 via Supabase MCP from `supabase/functions/`). Redeploy through the MCP `deploy_edge_function` tool if they change.
- React error #310 on a game page means hooks after a conditional return. TransferPathBoard had this exact bug (early loading return above useState); the loading check must sit BELOW every hook.

## Database (Supabase)
- Most game data lives in Postgres tables read via `src/lib/fetch*.ts` and game hooks.
- Row counts shown in the Supabase table list can be stale; trust `select count(*)`.
- All public tables have row-level security enabled with a public read-only policy.

## Constraints
- The app can't be reliably compiled/run in a sandbox — verify via successful deploy + manual play-testing.
- NFL play-by-play data isn't loaded -> NFL-specific games are blocked.

## gstack
Use `/browse` from gstack for all web browsing. Never use `mcp__claude-in-chrome__*` tools.

Available skills: /office-hours, /plan-ceo-review, /plan-eng-review, /plan-design-review, /design-consultation, /design-shotgun, /design-html, /review, /ship, /land-and-deploy, /canary, /benchmark, /browse, /open-gstack-browser, /qa, /qa-only, /design-review, /setup-browser-cookies, /setup-deploy, /setup-gbrain, /sync-gbrain, /retro, /investigate, /document-release, /document-generate, /codex, /cso, /autoplan, /pair-agent, /careful, /freeze, /guard, /unfreeze, /gstack-upgrade, /learn.

To install/refresh gstack: `cd ~/.claude/skills/gstack && ./setup` (that script is the source of truth for the current skill set).
