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
- `src/integrations/supabase/client.ts` — Supabase client. Reads VITE_ env vars with a hardcoded public URL/anon-key fallback so a deploy that lacks env vars still connects.
- Flagship "Squad Deal" pattern = page (`src/pages/SquadDeal.tsx`) + hook (`src/hooks/useSquadDeal.ts`) + lib (`src/lib/squadDeal.ts`: `FORMATIONS`, `EXTRAS`, `playerRating`)

## Adding a game
1. Create `src/pages/<Game>.tsx` (+ hook/lib as needed).
2. Register a route in `src/App.tsx`.
3. Add a `GameDef` entry under the right category in `src/data/gameRegistry.ts`.

## Publishing (free-plan — do NOT use the Lovable AI agent)
The Lovable workspace is free-plan with 0 credits, so never drive builds through Lovable's agent. To ship:
1. Edit the source files directly in the repo.
2. List the changed files in the `git add` line of `PUBLISH_GAMES.bat`, and put a one-line commit message in `_commit_msg.txt`.
3. Run `PUBLISH_GAMES.bat` — it commits exactly those files and pushes to GitHub. Lovable auto-deploys in ~1-2 min.

Note: the publish script uses an explicit file list (not `git add -A`) so untracked files like `.env` are never committed. It does not `git reset --hard`, so local edits are preserved.

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
